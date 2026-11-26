import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { damp, clamp, lerp, easeOutCubic, easeInOut } from '../util.js';
import { rbox, cyl, at, mat, umat, mesh, playerColors, roomColors, scheduler, frame, boardUi, markSvg, chooseMode, closeChoices, glow, sounds, PURPLE } from './board/kit.js';
import { buildRoom, TABLE } from './board/room.js';
import { Player } from './board/players.js';
import { together } from './board/online.js';

// Four in a Row: an upright frame on the games table. Roji and Homama take turns dropping
// discs into the columns; they fall, bounce and clack into place. Four in a line glows.
// In an online room "Play together" plays it for real on the two devices: each drop travels to the
// other copy, the other player's disc glides over the column they aim at, and the host says who starts.

const COLS = 7;
const ROWS = 6;
const CELL = 0.15;
const PAD = 0.07;
const FW = COLS * CELL + PAD * 2; // frame width
const FH = ROWS * CELL + PAD * 2; // frame height
const F0 = TABLE.y + 0.1; // frame bottom
const FT = F0 + FH; // frame top
const GHOST_Y = FT + 0.13;
const SEAT = { x: 1.3, z: -0.45, y: 0.25 };

const colX = (c) => (c - (COLS - 1) / 2) * CELL;
const rowY = (r) => F0 + PAD + (ROWS - 1 - r + 0.5) * CELL; // r = 0 is the top row
const emptyGrid = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));
const landingRow = (g, c) => {
  for (let r = ROWS - 1; r >= 0; r--) if (!g[r][c]) return r;
  return -1;
};
function lineThrough(g, r, c) {
  const p = g[r][c];
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cells = [[r, c]];
    for (const s of [1, -1]) {
      let rr = r + dr * s;
      let cc = c + dc * s;
      while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && g[rr][cc] === p) {
        cells.push([rr, cc]);
        rr += dr * s;
        cc += dc * s;
      }
    }
    if (cells.length >= 4) return cells.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  }
  return null;
}
const winsWith = (g, p, c) => {
  const r = landingRow(g, c);
  if (r < 0) return false;
  g[r][c] = p;
  const w = lineThrough(g, r, c);
  g[r][c] = null;
  return !!w;
};
// Wins if it can, usually blocks, else prefers the centre with some randomness and tries not to set up the opponent.
function computerColumn(g, self, other) {
  const valid = [...Array(COLS).keys()].filter((c) => !g[0][c]);
  for (const c of valid) if (winsWith(g, self, c)) return c;
  if (Math.random() < 0.85) for (const c of valid) if (winsWith(g, other, c)) return c;
  let best = valid[0];
  let bestScore = -Infinity;
  for (const c of valid) {
    let s = 3 - Math.abs(c - 3) + Math.random() * 2.6;
    const r = landingRow(g, c);
    if (r > 0 && Math.random() < 0.75) {
      g[r][c] = self;
      if (winsWith(g, other, c)) s -= 8;
      g[r][c] = null;
    }
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best;
}

// A chunky toy disc facing +Z: raised rim, dimpled centre.
function discGeo() {
  const R = 0.064;
  const pts = [[0, -0.011], [0.036, -0.011], [0.043, -0.016], [R - 0.004, -0.016], [R, -0.012], [R, 0.012], [R - 0.004, 0.016], [0.043, 0.016], [0.036, 0.011], [0, 0.011]];
  return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 22).rotateX(Math.PI / 2);
}

function frameGeo() {
  const s = new THREE.Shape();
  const w = FW / 2;
  const r = 0.07;
  s.moveTo(-w + r, 0);
  s.lineTo(w - r, 0);
  s.quadraticCurveTo(w, 0, w, r);
  s.lineTo(w, FH - r);
  s.quadraticCurveTo(w, FH, w - r, FH);
  s.lineTo(-w + r, FH);
  s.quadraticCurveTo(-w, FH, -w, FH - r);
  s.lineTo(-w, r);
  s.quadraticCurveTo(-w, 0, -w + r, 0);
  for (let row = 0; row < ROWS; row++)
    for (let c = 0; c < COLS; c++) {
      const h = new THREE.Path();
      h.absarc(colX(c), rowY(row) - F0, 0.057, 0, Math.PI * 2, true);
      s.holes.push(h);
    }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.022, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1, curveSegments: 9 });
  g.translate(0, 0, -0.011);
  return g;
}

export default {
  id: 'connect4',
  title: 'Four in a Row',
  tagline: 'Line up four discs',

  async start(ctx) {
    const { scene, camera, hud, input, sound, fx, looks } = ctx;
    const env = ctx.env.indoor({ color: '#f4d8c8', warm: 1.0 });
    env.sun.position.set(-3, 8, 7);
    const sc = env.sun.shadow.camera;
    sc.left = sc.bottom = -5;
    sc.right = sc.top = 5;
    env.sun.shadow.mapSize.set(2048, 2048);
    env.sun.shadow.bias = -0.0005;
    env.sun.shadow.normalBias = 0.02;
    sc.updateProjectionMatrix();
    fx.confetti?.geometry?.scale(0.55, 0.55, 0.55);
    const snd = sounds(sound);
    const S = scheduler();
    let disposed = false;
    const dbg = { fast: 1 };
    window.__board = dbg;

    const meId = ctx.me;
    const paId = ctx.partner;
    const duo = together(ctx);
    const [colA, colB] = duo.can ? roomColors(ctx) : playerColors(looks[meId].top, looks[paId].top);
    const colorOf = { A: colA, B: colB };
    const room = buildRoom(ctx, { seats: [{ x: -SEAT.x, z: SEAT.z, color: colA }, { x: SEAT.x, z: SEAT.z, color: colB }] });
    const gt = room.glowTex;

    // ---------------------------------------------------------------- players
    const yawTo = (x, z) => Math.atan2(-x, -z);
    const mk = (id, s) =>
      new Player(ctx, id, {
        seat: { x: s * SEAT.x, y: SEAT.y, z: SEAT.z, yaw: yawTo(s * SEAT.x, SEAT.z) },
        stand: { x: s * (SEAT.x + 0.2), z: SEAT.z + 0.15, yaw: s < 0 ? 0.6 : -0.6 },
      });
    const players = { A: mk(meId, -1), B: mk(paId, 1) };
    const other = (p) => (p === 'A' ? 'B' : 'A');

    // ---------------------------------------------------------------- the frame
    const rig = new THREE.Group();
    scene.add(rig);
    const fg = frameGeo();
    const plateMat = mat(PURPLE, { rough: 0.45 });
    for (const z of [-0.04, 0.04]) {
      const plate = mesh(fg, plateMat);
      plate.position.set(0, F0, z);
      rig.add(plate);
    }
    const rail = '#7a4ae6';
    for (const s of [-1, 1]) {
      rig.add(at(rbox(0.05, FH + 0.02, 0.13, rail, 0.02), s * (FW / 2 + 0.005), F0 + FH / 2, 0));
      // feet
      rig.add(at(rbox(0.09, 0.06, 0.42, rail, 0.025), s * (FW / 2 - 0.02), TABLE.y + 0.03, 0));
      const brace = rbox(0.05, 0.16, 0.05, rail, 0.02);
      brace.position.set(s * (FW / 2 - 0.02), TABLE.y + 0.1, 0);
      rig.add(brace);
      rig.add(at(mesh(new THREE.SphereGeometry(0.035, 12, 8), mat('#ffd166', { metal: 0.3, rough: 0.4 })), s * (FW / 2 + 0.005), FT + 0.02, 0));
    }
    rig.add(at(rbox(FW + 0.02, 0.04, 0.13, rail, 0.02), 0, F0 + 0.01, 0));
    // column dots along the top rail
    for (let c = 0; c < COLS; c++) rig.add(at(mesh(new THREE.SphereGeometry(0.012, 8, 6), mat('#fffaf4')), colX(c), FT - 0.03, 0.062));
    // A little tin of spare discs and a mug at the back of the table
    const tin = new THREE.Group();
    tin.add(at(cyl(0.11, 0.11, 0.06, '#ffd166', 20), 0, 0.03, 0));
    tin.add(at(cyl(0.09, 0.09, 0.005, '#fff1dc', 20), 0, 0.061, 0));
    tin.position.set(-0.66, TABLE.y, 0.5);
    rig.add(tin);
    const mugG = new THREE.Group();
    mugG.add(at(cyl(0.055, 0.05, 0.11, '#ff9eb5', 16), 0, 0.055, 0));
    mugG.add(at(cyl(0.047, 0.047, 0.005, '#8a5a3c', 14), 0, 0.105, 0));
    mugG.position.set(0.68, TABLE.y, 0.45);
    rig.add(mugG);
    ctx.util.bakeStatic(rig, [], mergeGeometries);

    // Discs: one instanced mesh per colour
    const DG = discGeo();
    const discMat = { A: mat(colA, { rough: 0.38 }), B: mat(colB, { rough: 0.38 }) };
    const inst = {};
    for (const p of ['A', 'B']) {
      const im = new THREE.InstancedMesh(DG, discMat[p], 21);
      im.count = 0;
      im.castShadow = false;
      im.receiveShadow = true;
      im.frustumCulled = false;
      scene.add(im);
      inst[p] = im;
    }
    // spare discs in the tin
    const spare = new THREE.InstancedMesh(DG, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }), 6);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    const one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < 6; i++) {
      m4.compose(new THREE.Vector3(-0.66 + ((i % 3) - 1) * 0.05, TABLE.y + 0.075 + Math.floor(i / 3) * 0.03, 0.5 + (i % 2) * 0.02), q, one);
      spare.setMatrixAt(i, m4);
      spare.setColorAt(i, new THREE.Color(i % 2 ? colB : colA));
    }
    scene.add(spare);

    // Ghost disc and column glow
    const ghostMat = umat('#ffffff', { rough: 0.35, emissive: '#ffffff', ei: 0.25 });
    const ghost = mesh(DG, ghostMat);
    ghost.visible = false;
    scene.add(ghost);
    const colMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.0, depthWrite: false });
    const colGlow = new THREE.Mesh(new THREE.PlaneGeometry(CELL - 0.02, FH - 0.06), colMat);
    colGlow.position.set(0, F0 + FH / 2, 0.066);
    colGlow.visible = false;
    scene.add(colGlow);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hits = Array.from({ length: COLS }, (_, c) => {
      const h = new THREE.Mesh(new THREE.BoxGeometry(CELL, FH + 0.4, 0.2), hitMat);
      h.position.set(colX(c), F0 + (FH + 0.4) / 2, 0);
      h.userData.col = c;
      scene.add(h);
      return h;
    });
    // Win line
    const winMat = umat('#ffd166', { rough: 0.3, emissive: '#ffcf4a', ei: 0.9 });
    const winBar = mesh(new THREE.CapsuleGeometry(0.018, 1, 4, 12), winMat, { cast: false });
    winBar.visible = false;
    scene.add(winBar);
    const winGlows = [0, 1, 2, 3].map(() => {
      const s = glow(gt, '#fff3a0', 0.3, 0);
      s.visible = false;
      scene.add(s);
      return s;
    });
    // Badges above the players' heads
    for (const p of ['A', 'B']) {
      const b = mesh(DG, discMat[p]);
      b.scale.setScalar(1.7);
      const halo = glow(gt, colorOf[p], 0.6, 0.4);
      halo.position.z = -0.04;
      const grp = new THREE.Group();
      grp.add(halo, b);
      players[p].setBadge(grp);
    }

    // ---------------------------------------------------------------- HUD
    const ui = boardUi();
    const tally = ctx.load('tally', { me: 0, partner: 0, draw: 0 });
    const showTally = () => {
      hud.score(`<span style="color:${colA}">${looks[meId].name}</span> ${tally.me} - ${tally.partner} <span style="color:${colB}">${looks[paId].name}</span>`);
      room.chalk('Four in a Row', [[looks[meId].name, tally.me, '#ffc2cf'], [looks[paId].name, tally.partner, '#b9d4ff'], ['Draws', tally.draw, '#fff3c4']]);
    };
    showTally();
    hud.buttons({ action: null, jump: null, stick: false });
    hud.hint('Click a column, or A and D or the arrows to aim and E to drop');

    // ---------------------------------------------------------------- state
    const st = { phase: 'choose', mode: 'cpu', grid: emptyGrid(), turn: 'A', col: 3, gx: 0, lock: 0, drop: null, win: null, winT: -1, idle: 0, aim: null, shake: 0 };
    const slots = { A: [], B: [] }; // instance index -> { r, c }
    const isCpu = (p) => st.mode === 'cpu' && p === 'B';
    const isRemote = (p) => st.mode === 'online' && p === 'B'; // played on the other device
    const humanTurn = () => st.phase === 'play' && !isCpu(st.turn) && !isRemote(st.turn) && !st.drop && !st.aim;
    const moveNo = () => inst.A.count + inst.B.count;
    // The grid by kid, the same on both devices: 'r' Roji, 'h' Homama
    const byKid = () => st.grid.map((r) => r.map((v) => (v ? players[v].id[0] : '.')).join('')).join('/');
    dbg.state = () => ({ phase: st.phase, turn: st.turn, who: players[st.turn].id, mode: st.mode, grid: st.grid.map((r) => r.map((v) => v || '.').join('')).join('/'), kids: byKid() });
    dbg.drop = (c) => humanTurn() && tryDrop(c);

    function setTurn() {
      const p = st.turn;
      const pl = players[p];
      for (const k of ['A', 'B']) {
        players[k].showBadge(k === p);
        players[k].think(k === p && (isCpu(k) || isRemote(k)));
      }
      ui.turn(markSvg.disc(colorOf[p]), colorOf[p], isCpu(p) ? `${pl.name} is thinking` : `${pl.name}'s turn`, isCpu(p) || isRemote(p));
      st.idle = 0;
      if (isRemote(p)) pump();
      if (isCpu(p)) {
        S.wait(0.8 + Math.random() * 0.6).then(() => {
          if (disposed || st.phase !== 'play' || st.turn !== p) return;
          const c = computerColumn(st.grid, 'B', 'A');
          // slide the disc over to the chosen column, then drop it
          st.aim = { from: st.gx, to: colX(c), t: 0, c };
          st.col = c;
        });
      }
    }

    function tryDrop(c) {
      if (!(c >= 0 && c < COLS)) return false;
      if (st.grid[0][c]) {
        sound.ui('bad');
        st.shake = 0.35;
        return false;
      }
      drop(c);
      return true;
    }

    function drop(c) {
      if (st.phase !== 'play' || st.drop) return;
      const r = landingRow(st.grid, c);
      if (r < 0) return;
      const p = st.turn;
      if (st.mode === 'online' && !isRemote(p)) duo.send('mv', { c, n: moveNo() });
      const pl = players[p];
      const rival = players[other(p)];
      const blocked = winsWith(st.grid, other(p), c);
      st.grid[r][c] = p;
      pl.think(false);
      pl.gesture('reachUp');
      for (const k of ['A', 'B']) players[k].showBadge(false);
      ui.hideTurn();
      snd.whoosh();
      const im = inst[p];
      const idx = im.count++;
      slots[p][idx] = { r, c };
      st.drop = { p, r, c, idx, y: GHOST_Y, vy: 0, bounces: 0 };
      st.col = c;
      st.gx = colX(c);
      const threat = [...Array(COLS).keys()].some((k) => winsWith(st.grid, p, k));
      S.wait(0.9).then(() => {
        if (disposed || st.phase !== 'play') return;
        if (blocked) {
          pl.gesture('cheer');
          rival.gesture('gasp');
          ui.say(`Nice block, ${pl.name}!`);
        } else if (threat) {
          rival.gesture('gasp');
          pl.gesture('nod');
        } else if (pl.id === 'roji' && rival.id === 'homama' && Math.random() < 0.4) rival.gesture('clap');
        else if (Math.random() < 0.3) rival.gesture('nod');
      });
    }

    function setDisc(p, idx, x, y, s = 1) {
      m4.compose(tmpV.set(x, y, 0), qI, tmpS.set(s, s, s));
      inst[p].setMatrixAt(idx, m4);
      inst[p].instanceMatrix.needsUpdate = true;
    }
    const tmpV = new THREE.Vector3();
    const tmpS = new THREE.Vector3();
    const qI = new THREE.Quaternion();

    function landed(d) {
      const line = lineThrough(st.grid, d.r, d.c);
      if (line) return end(d.p, line);
      if (st.grid[0].every(Boolean)) return end(null, null);
      st.turn = other(d.p);
      setTurn();
    }

    function end(p, line) {
      st.phase = 'over';
      duo.end();
      ghost.visible = false;
      colMat.opacity = 0;
      hud.hint('');
      for (const k of ['A', 'B']) {
        players[k].showBadge(false);
        players[k].think(false);
      }
      if (p) {
        const winner = players[p];
        const loser = players[other(p)];
        st.win = { p, line };
        st.winT = 0;
        ui.turn(markSvg.disc(colorOf[p]), colorOf[p], `${duo.winner(winner.name, p === 'B')} wins!`);
        const [r1, c1] = line[0];
        const [r2, c2] = line[line.length - 1];
        const a = new THREE.Vector3(colX(c1), rowY(r1), 0.08);
        const b = new THREE.Vector3(colX(c2), rowY(r2), 0.08);
        const dir = b.clone().sub(a);
        st.winLen = dir.length() + 0.12;
        winBar.position.copy(a).add(b).multiplyScalar(0.5);
        winBar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        winBar.visible = true;
        line.slice(0, 4).forEach(([r, c], k) => {
          winGlows[k].position.set(colX(c), rowY(r), 0.09);
          winGlows[k].visible = true;
        });
        snd.sparkle();
        fx.burst(new THREE.Vector3(0, FT, 0.2), [colorOf[p], '#ffd166', '#ffffff', '#ff9eb5'], 90);
        if (p === 'A') tally.me++;
        else tally.partner++;
        S.wait(0.6).then(() => {
          if (disposed) return;
          winner.standUp('cheer');
          loser.standUp(loser.id === 'homama' ? 'heart' : 'bow');
          S.wait(1.9).then(() => !disposed && winner.kid.emote('dance'));
        });
      } else {
        tally.draw++;
        ui.turn(markSvg.face(PURPLE), PURPLE, "It's a draw");
        snd.hmm();
        S.wait(0.5).then(() => {
          if (disposed) return;
          players.A.standUp('bow');
          players.B.standUp('bow');
        });
      }
      ctx.save('tally', tally);
      showTally();
      const me = looks[meId].name;
      const pa = looks[paId].name;
      const overall = `Overall: ${me} ${tally.me}, ${pa} ${tally.partner}, draws ${tally.draw}.`;
      S.wait(p ? 3.2 : 2.6).then(() => {
        if (disposed) return;
        st.phase = 'done';
        if (!p) return ctx.finish({ win: null, title: "It's a draw", text: `The board is full. ${overall}` });
        const w = duo.winner(players[p].name, p === 'B');
        const l = players[other(p)].name;
        ctx.finish({ win: st.mode === 'duo' ? true : p === 'A', title: `${w} wins!`, text: `Four in a row against ${l}. ${overall}` });
      });
    }

    // ---------------------------------------------------------------- played together
    // The other device's drops, in order: { c: column, n: discs in the frame before it }
    const inbox = [];
    duo.on('mv', (d) => {
      inbox.push(d);
      pump();
    });
    function pump() {
      while (inbox.length && st.mode === 'online' && st.phase === 'play' && isRemote(st.turn) && !st.drop && !st.aim) {
        const d = inbox[0];
        if (d?.n > moveNo()) return;
        inbox.shift();
        if (!d || d.n !== moveNo() || !Number.isInteger(d.c) || d.c < 0 || d.c >= COLS || st.grid[0][d.c]) {
          console.warn('Four in a Row: a drop that does not fit the frame', d);
          continue;
        }
        // Their disc glides over to the column (it is usually there already), then drops
        st.col = d.c;
        if (Math.abs(st.gx - colX(d.c)) < 0.02) drop(d.c);
        else st.aim = { from: st.gx, to: colX(d.c), t: 0, c: d.c, dur: 0.3, end: 1.05 };
        return;
      }
    }
    duo.onGone(() => {
      if (st.phase !== 'play' || st.mode !== 'online') return;
      st.mode = 'cpu';
      inbox.length = 0;
      ui.say(`${duo.name} left, so the computer plays for ${duo.him}`, 3600);
      if (st.turn === 'B' && !st.drop && !st.aim) setTurn();
    });
    let shared = '';

    // ---------------------------------------------------------------- start
    (async () => {
      let mode = await chooseMode(ctx, { title: 'Four in a Row', text: `Drop your discs and line up four: across, up or slanted.` }, duo);
      if (disposed) return;
      if (!mode) return ctx.end({ quit: true });
      const games = ctx.load('games', 0);
      ctx.save('games', games + 1);
      let first = games % 2 === 0 ? 'A' : 'B';
      if (mode === 'online') {
        ui.turn(markSvg.face(PURPLE), PURPLE, `Waiting for ${duo.name}`, true);
        players.B.think(true);
        const r = await duo.link('online', { start: () => ({ f: players[first].id }) });
        if (disposed) return;
        players.B.think(false);
        ui.hideTurn();
        if (r.ok) first = r.go.f === meId ? 'A' : 'B';
        else {
          mode = 'cpu';
          ui.say(duo.why(r), 3600);
        }
      } else duo.link(mode);
      st.mode = mode;
      st.turn = first;
      st.lock = 0.35;
      st.phase = 'play';
      for (const k of ['A', 'B']) players[k].gesture('wave');
      hud.message(`${players[st.turn].name} goes first`, 1300);
      await S.wait(0.6);
      if (disposed) return;
      setTurn();
    })();

    // ---------------------------------------------------------------- camera
    const look = new THREE.Vector3(0, 1.2, 0);
    const camDir = new THREE.Vector3();
    const camPos = new THREE.Vector3();
    const camTgt = new THREE.Vector3();
    let camKey = '';
    let camGoal = null;
    const standPts = () => Object.values(players).flatMap((pl) => [new THREE.Vector3(pl.stand.x + Math.sign(pl.stand.x) * 0.4, 0.05, pl.stand.z + 0.2), new THREE.Vector3(pl.stand.x + Math.sign(pl.stand.x) * 0.3, 1.6, pl.stand.z)]);
    const fitPts = (wide, over) => [
      ...(over ? standPts() : []),
      new THREE.Vector3(-FW / 2, F0 - 0.05, 0.05),
      new THREE.Vector3(FW / 2, F0 - 0.05, 0.05),
      new THREE.Vector3(-FW / 2, GHOST_Y + 0.08, 0),
      new THREE.Vector3(FW / 2, GHOST_Y + 0.08, 0),
      ...[-1, 1].map((s) => new THREE.Vector3(s * (SEAT.x + 0.32), SEAT.y + (wide ? 1.6 : 1.9), SEAT.z)),
      ...[-1, 1].map((s) => new THREE.Vector3(s * (SEAT.x + 0.32), wide ? 0.75 : 0.35, SEAT.z + 0.1)),
      new THREE.Vector3(0, TABLE.y, wide ? 0.3 : TABLE.r),
    ];
    function placeCamera(dt, first) {
      if (camera.fov !== 32) {
        camera.fov = 32;
        camera.updateProjectionMatrix();
      }
      const over = st.phase === 'over' || st.phase === 'done';
      const key = `${camera.aspect.toFixed(3)}|${window.innerHeight}|${over}`;
      if (key !== camKey) {
        camKey = key;
        const w = clamp((camera.aspect - 1.45) / 0.6, 0, 1);
        const el = THREE.MathUtils.degToRad(lerp(17, 12, w));
        camDir.set(0, Math.sin(el), Math.cos(el));
        const touch = document.body.classList.contains('touch');
        const top = touch ? 0.1 : clamp(64 / window.innerHeight, 0.08, 0.17);
        camGoal = frame(camera, look, camDir, fitPts(w > 0.5, over), { top, bottom: touch ? 0.07 : 0.04, side: 0.03 });
      }
      if (first) {
        camPos.copy(camGoal.pos);
        camTgt.copy(camGoal.target);
      }
      camPos.lerp(camGoal.pos, 1 - Math.exp(-2.5 * dt));
      camTgt.lerp(camGoal.target, 1 - Math.exp(-2.5 * dt));
      camera.position.copy(camPos);
      camera.lookAt(camTgt);
    }
    placeCamera(0, true);

    // ---------------------------------------------------------------- frame
    let lastPointer = '';
    function update(rawDt, t) {
      const dt = rawDt * dbg.fast;
      S.update(dt);
      st.lock = Math.max(0, st.lock - dt);

      if (humanTurn() && st.lock <= 0) {
        const k = (n) => input.pressed(n);
        if (k('arrowleft') || k('a')) {
          st.col = Math.max(0, st.col - 1);
          sound.ui('tick');
        }
        if (k('arrowright') || k('d')) {
          st.col = Math.min(COLS - 1, st.col + 1);
          sound.ui('tick');
        }
        for (let n = 1; n <= COLS; n++) if (k(String(n))) {
          st.col = n - 1;
          tryDrop(n - 1);
        }
        if (humanTurn() && (k('action') || k('jump') || k('arrowdown') || k('s'))) tryDrop(st.col);
        const ptr = input.pointer;
        const pk = `${ptr.x}|${ptr.y}`;
        if (humanTurn() && pk !== lastPointer && !document.body.classList.contains('touch')) {
          lastPointer = pk;
          const h = input.pick(hits, ptr.ndc)[0];
          if (h) st.col = h.object.userData.col;
        }
        for (const tap of input.taps()) {
          if (!humanTurn()) break;
          const h = input.pick(hits, tap.ndc)[0];
          if (!h) continue;
          st.col = h.object.userData.col;
          st.gx = colX(st.col);
          tryDrop(st.col);
        }
      }

      // Played together: our aim goes to the other device, and theirs moves the disc here on their turn
      if (st.mode === 'online') {
        duo.tick();
        if (humanTurn() && `${st.col}|${moveNo()}` !== shared) {
          shared = `${st.col}|${moveNo()}`;
          duo.share({ c: st.col, n: moveNo() });
        }
        const ps = isRemote(st.turn) && st.phase === 'play' && !st.drop && !st.aim ? duo.state() : null;
        if (ps && ps.n === moveNo() && Number.isInteger(ps.c) && ps.c >= 0 && ps.c < COLS) st.col = ps.c;
      }

      // Computer aiming: the disc glides over to its column
      if (st.aim) {
        const a = st.aim;
        a.t += dt / (a.dur || 0.55);
        st.gx = lerp(a.from, a.to, easeInOut(clamp(a.t, 0, 1)));
        if (a.t >= (a.end || 1.25)) {
          st.aim = null;
          drop(a.c);
        }
      }

      // Ghost disc above the frame
      const showGhost = st.phase === 'play' && !st.drop;
      ghost.visible = showGhost;
      if (showGhost) {
        if (!st.aim) st.gx = damp(st.gx, colX(st.col), 14, dt);
        st.shake = Math.max(0, st.shake - dt);
        ghost.position.set(st.gx + Math.sin(st.shake * 40) * st.shake * 0.08, GHOST_Y + Math.sin(t * 4) * 0.012, 0);
        ghost.rotation.z = Math.sin(t * 2) * 0.15;
        ghostMat.color.set(colorOf[st.turn]);
        ghostMat.emissive.set(colorOf[st.turn]);
      }
      const colOn = showGhost && !isCpu(st.turn) && st.lock <= 0;
      colMat.opacity = damp(colMat.opacity, colOn ? 0.16 + Math.sin(t * 5) * 0.05 : 0, 10, dt);
      colGlow.position.x = st.gx;
      colGlow.visible = colMat.opacity > 0.01;
      colMat.color.set(colorOf[st.turn]);
      if (humanTurn()) {
        st.idle += dt;
        players[st.turn].thinking = st.idle > 2.5;
      }

      // Falling disc
      if (st.drop) {
        const d = st.drop;
        const rest = rowY(d.r);
        d.vy -= 11 * dt;
        d.y += d.vy * dt;
        if (d.y <= rest) {
          d.y = rest;
          if (d.bounces < 2 && d.vy < -0.7) {
            d.vy = -d.vy * 0.26;
            d.bounces++;
            snd.clack(d.bounces === 1 ? 1 : 1.25);
          } else {
            setDisc(d.p, d.idx, colX(d.c), rest);
            st.drop = null;
            landed(d);
          }
        }
        if (st.drop) setDisc(d.p, d.idx, colX(d.c), d.y);
      }

      // Win line
      if (st.win && st.winT >= 0) {
        st.winT += dt;
        const g = easeOutCubic(clamp(st.winT / 0.5, 0, 1));
        winBar.scale.set(1, Math.max(0.001, st.winLen * g), 1);
        winMat.emissiveIntensity = 0.8 + Math.sin(t * 6) * 0.3;
        const set = new Set(st.win.line.map(([r, c]) => r * 10 + c));
        slots[st.win.p].forEach((s, idx) => {
          if (!set.has(s.r * 10 + s.c)) return;
          const k = s.c + s.r;
          setDisc(st.win.p, idx, colX(s.c), rowY(s.r), 1 + Math.max(0, Math.sin(st.winT * 6 - k * 0.6)) * 0.22);
        });
        winGlows.forEach((s, k) => (s.material.opacity = 0.55 + Math.sin(t * 6 + k) * 0.2));
      }

      for (const k of ['A', 'B']) players[k].update(dt, t);
      room.update(dt, t);
      placeCamera(dt, false);
    }

    return {
      update,
      dispose() {
        disposed = true;
        duo.dispose();
        closeChoices();
        ui.remove();
        if (window.__board === dbg) delete window.__board;
      },
    };
  },
};
