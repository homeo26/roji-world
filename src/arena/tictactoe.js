import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { damp, clamp, lerp, easeOutBack, easeOutCubic } from '../util.js';
import { rbox, at, mat, umat, mesh, playerColors, scheduler, frame, boardUi, markSvg, chooseMode, closeChoices, glow, sounds, PURPLE } from './board/kit.js';
import { buildRoom, TABLE } from './board/room.js';
import { Player } from './board/players.js';

// X O: Roji and Homama sit at the round table in the Game Night room and take turns dropping chunky
// X and O pieces onto a wooden board. Tap a square (or arrows and E). Three in a row lights up.

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const CELL = 0.33;
const BOARD = 1.1;
const BT = TABLE.y + 0.07; // board top
const SEAT = { x: 1.25, z: -0.5, y: 0.25 };

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const cellPos = (i) => ({ x: ((i % 3) - 1) * CELL, z: (Math.floor(i / 3) - 1) * CELL });

function findWinner(b) {
  for (const line of LINES) {
    const [a, c, d] = line;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { p: b[a], line };
  }
  return null;
}
const winningCell = (b, p) => {
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = p;
    const w = findWinner(b);
    b[i] = null;
    if (w) return i;
  }
  return -1;
};
// Takes a win, else usually blocks, else prefers the centre and corners. About 30% of moves are random.
function computerMove(b, self, other) {
  const empty = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  const win = winningCell(b, self);
  if (win >= 0) return win;
  if (Math.random() < 0.3) return pick(empty);
  const block = winningCell(b, other);
  if (block >= 0) return block;
  if (!b[4]) return 4;
  const corners = [0, 2, 6, 8].filter((i) => !b[i]);
  return corners.length ? pick(corners) : pick(empty);
}

function pieceGeos() {
  const bar = (ry) => new THREE.CapsuleGeometry(0.046, 0.19, 6, 14).rotateZ(Math.PI / 2).rotateY(ry);
  const X = mergeGeometries([bar(Math.PI / 4), bar(-Math.PI / 4)]);
  const O = new THREE.TorusGeometry(0.092, 0.046, 12, 30).rotateX(Math.PI / 2);
  return { X, O };
}

export default {
  id: 'tictactoe',
  title: 'X O',
  tagline: 'Three in a row wins',

  async start(ctx) {
    const { scene, camera, hud, input, sound, fx, looks } = ctx;
    const env = ctx.env.indoor({ color: '#f4d8c8', warm: 1.0 });
    env.sun.position.set(-3, 9, 6);
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
    const [colX, colO] = playerColors(looks[meId].top, looks[paId].top);
    const colorOf = { X: colX, O: colO };
    const room = buildRoom(ctx, { seats: [{ x: -SEAT.x, z: SEAT.z, color: colX }, { x: SEAT.x, z: SEAT.z, color: colO }] });

    // ---------------------------------------------------------------- players
    const yawTo = (x, z) => Math.atan2(-x, -z);
    const mk = (id, s) =>
      new Player(ctx, id, {
        seat: { x: s * SEAT.x, y: SEAT.y, z: SEAT.z, yaw: yawTo(s * SEAT.x, SEAT.z) },
        stand: { x: s * (SEAT.x + 0.35), z: SEAT.z + 0.45, yaw: s < 0 ? 0.75 : -0.75 },
      });
    const players = { X: mk(meId, -1), O: mk(paId, 1) };
    const other = (p) => (p === 'X' ? 'O' : 'X');

    // ---------------------------------------------------------------- the board
    const board = new THREE.Group();
    board.position.y = TABLE.y;
    scene.add(board);
    board.add(at(rbox(BOARD + 0.08, 0.05, BOARD + 0.08, PURPLE, 0.025), 0, 0.025, 0));
    board.add(at(rbox(BOARD, 0.07, BOARD, '#fff1dc', 0.03), 0, 0.035, 0));
    for (let i = 0; i < 9; i++) {
      const p = cellPos(i);
      board.add(at(rbox(CELL - 0.05, 0.01, CELL - 0.05, (i % 2 ? '#fde7cf' : '#fbe0c4'), 0.02), p.x, 0.071, p.z));
    }
    for (const s of [-1, 1]) {
      board.add(at(rbox(0.036, 0.03, BOARD - 0.1, '#a07cf6', 0.015), (s * CELL) / 2, 0.08, 0));
      board.add(at(rbox(BOARD - 0.1, 0.03, 0.036, '#a07cf6', 0.015), 0, 0.08, (s * CELL) / 2));
    }
    // tiny corner studs
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) board.add(at(mesh(new THREE.SphereGeometry(0.025, 10, 8), mat('#ffd166', { metal: 0.3, rough: 0.4 })), x * (BOARD / 2 + 0.005), 0.06, z * (BOARD / 2 + 0.005)));
    // Cookies and two mugs at the back of the table
    const plate = new THREE.Group();
    plate.add(at(mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.02, 20), mat('#fffaf4', { rough: 0.4 })), 0, 0.01, 0));
    for (const [x, z, r] of [[-0.05, 0.02, 0], [0.05, -0.03, 0.6], [0.0, 0.06, 1.2]]) {
      const ck = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.018, 14), mat('#d9a066'));
      ck.position.set(x, 0.03 + (r > 1 ? 0.018 : 0), z);
      ck.rotation.set(r > 1 ? 0.2 : 0, r, 0);
      plate.add(ck);
      for (let k = 0; k < 3; k++) plate.add(at(mesh(new THREE.SphereGeometry(0.009, 6, 4), mat('#5a3420')), x + Math.cos(k * 2.1 + r) * 0.025, ck.position.y + 0.01, z + Math.sin(k * 2.1 + r) * 0.025));
    }
    plate.position.set(0, 0, -0.78);
    board.add(plate);
    const mug = (x, c) => {
      const m = new THREE.Group();
      m.add(at(mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.11, 16), mat(c, { rough: 0.5 })), 0, 0.055, 0));
      m.add(at(mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.005, 14), mat('#8a5a3c', { rough: 0.3 })), 0, 0.105, 0));
      const h = mesh(new THREE.TorusGeometry(0.03, 0.01, 6, 12), mat(c, { rough: 0.5 }));
      h.position.set(0.06, 0.06, 0);
      m.add(h);
      m.position.set(x, 0, -0.66);
      board.add(m);
    };
    mug(-0.42, colX);
    mug(0.42, colO);
    // Hit boxes for tapping
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hits = Array.from({ length: 9 }, (_, i) => {
      const p = cellPos(i);
      const h = new THREE.Mesh(new THREE.BoxGeometry(CELL, 0.2, CELL), hitMat);
      h.position.set(p.x, TABLE.y + 0.1, p.z);
      h.userData.cell = i;
      scene.add(h);
      return h;
    });
    // Hover tile
    const hoverMat = umat('#ffffff', { rough: 0.5, transparent: true, opacity: 0.5, emissive: '#ffffff', ei: 0.4 });
    const hover = mesh(new THREE.BoxGeometry(CELL - 0.06, 0.008, CELL - 0.06), hoverMat, { cast: false });
    hover.visible = false;
    scene.add(hover);
    const ghosts = {};
    ctx.util.bakeStatic(board, [], mergeGeometries);

    // ---------------------------------------------------------------- pieces
    const G = pieceGeos();
    const pieceMat = { X: mat(colX, { rough: 0.42 }), O: mat(colO, { rough: 0.42 }) };
    const glowMat = { X: umat(colX, { rough: 0.3, emissive: colX, ei: 0.6 }), O: umat(colO, { rough: 0.3, emissive: colO, ei: 0.6 }) };
    const gt = room.glowTex;
    const pieces = [];
    for (const p of ['X', 'O']) {
      ghosts[p] = mesh(G[p], umat(colorOf[p], { rough: 0.4, transparent: true, opacity: 0.45, emissive: colorOf[p], ei: 0.25 }), { cast: false });
      ghosts[p].visible = false;
      scene.add(ghosts[p]);
    }
    const makePiece = (p) => {
      const m = mesh(G[p], pieceMat[p]);
      scene.add(m);
      return m;
    };
    for (const p of ['X', 'O']) {
      const b = mesh(G[p], pieceMat[p]);
      b.rotation.x = Math.PI / 2;
      b.scale.setScalar(0.62);
      b.position.z = 0.03;
      const disc = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 28).rotateX(Math.PI / 2), mat('#fffaf4', { rough: 0.5 }));
      const rim = mesh(new THREE.TorusGeometry(0.15, 0.018, 8, 28), pieceMat[p]);
      const halo = glow(gt, colorOf[p], 0.6, 0.4);
      halo.position.z = -0.05;
      const grp = new THREE.Group();
      grp.add(halo, disc, rim, b);
      players[p].setBadge(grp);
    }
    // Landing ripple
    const rippleMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
    const ripple = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.13, 32).rotateX(-Math.PI / 2), rippleMat);
    scene.add(ripple);
    let rippleT = 1;
    // Win bar
    const winMat = umat('#ffd166', { rough: 0.3, emissive: '#ffcf4a', ei: 0.9 });
    const winBar = mesh(new THREE.CapsuleGeometry(0.03, 1, 4, 12), winMat, { cast: false });
    winBar.visible = false;
    scene.add(winBar);
    const winGlows = [0, 1, 2].map(() => {
      const s = glow(gt, '#fff3a0', 0.55, 0);
      s.visible = false;
      scene.add(s);
      return s;
    });

    // ---------------------------------------------------------------- HUD
    const ui = boardUi();
    const tally = ctx.load('tally', { me: 0, partner: 0, draw: 0 });
    const showTally = () => {
      hud.score(`<span style="color:${colX}">${looks[meId].name}</span> ${tally.me} - ${tally.partner} <span style="color:${colO}">${looks[paId].name}</span>`);
      room.chalk('X O', [[looks[meId].name, tally.me, '#ffc2cf'], [looks[paId].name, tally.partner, '#b9d4ff'], ['Draws', tally.draw, '#fff3c4']]);
    };
    showTally();
    hud.buttons({ action: null, jump: null, stick: false });
    hud.hint('Click a square, or use the arrows and E. Keys 1 to 9 work too');

    // ---------------------------------------------------------------- state
    const st = { phase: 'choose', mode: 'cpu', board: Array(9).fill(null), turn: 'X', cursor: 4, mouse: false, lock: 0, win: null, drops: [], winT: -1, idle: 0 };
    const isCpu = (p) => st.mode === 'cpu' && p === 'O';
    const humanTurn = () => st.phase === 'play' && !isCpu(st.turn) && st.drops.length === 0;
    dbg.state = () => ({ phase: st.phase, turn: st.turn, board: st.board.join(','), mode: st.mode });
    dbg.place = (i) => humanTurn() && place(i);

    function setTurn() {
      const p = st.turn;
      const pl = players[p];
      for (const q of ['X', 'O']) {
        players[q].showBadge(q === p);
        players[q].think(q === p && isCpu(q));
      }
      if (isCpu(p)) ui.turn(markSvg[p](colorOf[p]), colorOf[p], `${pl.name} is thinking`, true);
      else ui.turn(markSvg[p](colorOf[p]), colorOf[p], `${pl.name}'s turn`);
      st.idle = 0;
      if (isCpu(p)) {
        S.wait(0.9 + Math.random() * 0.7).then(() => {
          if (disposed || st.phase !== 'play' || st.turn !== p) return;
          const i = computerMove(st.board, 'O', 'X');
          st.cursor = i;
          place(i);
        });
      }
    }

    function place(i) {
      if (st.phase !== 'play' || st.board[i]) return;
      const p = st.turn;
      const pl = players[p];
      const rival = players[other(p)];
      const blocked = winningCell(st.board, other(p)) === i;
      st.board[i] = p;
      pl.think(false);
      pl.gesture('reach');
      for (const q of ['X', 'O']) players[q].showBadge(false);
      ui.hideTurn();
      sound.ui('tap');
      const c = cellPos(i);
      const m = makePiece(p);
      m.position.set(c.x, BT + 0.6, c.z);
      m.rotation.y = 1.4;
      m.scale.setScalar(0.6);
      pieces[i] = m;
      st.drops.push({ m, i, p, vy: 0, t: 0, bounces: 0, sq: 0, done: false });
      // Reactions
      const threat = winningCell(st.board, p) >= 0;
      S.wait(0.5).then(() => {
        if (disposed || findWinner(st.board)) return;
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

    function landed(d) {
      const w = findWinner(st.board);
      if (w) return end(w);
      if (st.board.every(Boolean)) return end(null);
      st.turn = other(d.p);
      setTurn();
    }

    function end(w) {
      st.phase = 'over';
      st.win = w;
      hover.visible = false;
      ui.say('');
      hud.hint('');
      for (const q of ['X', 'O']) {
        players[q].showBadge(false);
        players[q].think(false);
      }
      if (w) {
        const winner = players[w.p];
        const loser = players[other(w.p)];
        ui.turn(markSvg[w.p](colorOf[w.p]), colorOf[w.p], `${winner.name} wins!`);
        for (const i of w.line) pieces[i].material = glowMat[w.p];
        const a = cellPos(w.line[0]);
        const b = cellPos(w.line[2]);
        const dir = new THREE.Vector3(b.x - a.x, 0, b.z - a.z);
        st.winLen = dir.length() + 0.26;
        winBar.position.set((a.x + b.x) / 2, BT + 0.1, (a.z + b.z) / 2);
        winBar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        winBar.visible = true;
        st.winT = 0;
        w.line.forEach((i, k) => {
          const c = cellPos(i);
          winGlows[k].position.set(c.x, BT + 0.1, c.z);
          winGlows[k].visible = true;
        });
        snd.sparkle();
        fx.burst(new THREE.Vector3(0, BT + 0.3, 0), [colorOf[w.p], '#ffd166', '#ffffff', '#ff9eb5'], 90);
        if (w.p === 'X') tally.me++;
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
          players.X.standUp('bow');
          players.O.standUp('bow');
          S.wait(1.6).then(() => {
            if (disposed) return;
            players.X.kid.emote('spin');
            players.O.kid.emote('spin');
          });
        });
      }
      ctx.save('tally', tally);
      showTally();
      const me = looks[meId].name;
      const pa = looks[paId].name;
      const overall = `Overall: ${me} ${tally.me}, ${pa} ${tally.partner}, draws ${tally.draw}.`;
      S.wait(w ? 3.2 : 2.6).then(() => {
        if (disposed) return;
        st.phase = 'done';
        if (!w) return ctx.finish({ win: null, title: "It's a draw", text: `Nobody got three in a row. ${overall}` });
        const winner = players[w.p].name;
        const loser = players[other(w.p)].name;
        ctx.finish({ win: st.mode === 'duo' ? true : w.p === 'X', title: `${winner} wins!`, text: `Three in a row against ${loser}. ${overall}` });
      });
    }

    // ---------------------------------------------------------------- start
    (async () => {
      const mode = await chooseMode(ctx, { title: 'X O', text: `${looks[meId].name} plays X, ${looks[paId].name} plays O. Three in a row wins.` });
      if (disposed) return;
      if (!mode) return ctx.end({ quit: true });
      st.mode = mode;
      const games = ctx.load('games', 0);
      ctx.save('games', games + 1);
      st.turn = games % 2 === 0 ? 'X' : 'O';
      st.lock = 0.35;
      st.phase = 'play';
      for (const q of ['X', 'O']) players[q].gesture('wave');
      hud.message(`${players[st.turn].name} goes first`, 1300);
      await S.wait(0.6);
      if (disposed) return;
      setTurn();
    })();

    // ---------------------------------------------------------------- camera
    const look = new THREE.Vector3(0, 0.9, 0);
    const camDir = new THREE.Vector3();
    const camPos = new THREE.Vector3();
    const camTgt = new THREE.Vector3();
    let camKey = '';
    let camGoal = null;
    const standPts = () => Object.values(players).flatMap((pl) => [new THREE.Vector3(pl.stand.x + Math.sign(pl.stand.x) * 0.4, 0.05, pl.stand.z + 0.2), new THREE.Vector3(pl.stand.x + Math.sign(pl.stand.x) * 0.3, 1.6, pl.stand.z)]);
    const fitPts = (wide, over) => [
      ...(over ? standPts() : []),
      ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => new THREE.Vector3(x * 0.62, BT, z * 0.62)),
      new THREE.Vector3(0, wide ? BT : TABLE.y, wide ? 0.66 : TABLE.r),
      ...[-1, 1].map((s) => new THREE.Vector3(s * (SEAT.x + 0.3), SEAT.y + (wide ? 1.55 : 1.85), SEAT.z)),
      ...[-1, 1].map((s) => new THREE.Vector3(s * (SEAT.x + 0.35), wide ? 0.9 : 0.3, SEAT.z + 0.1)),
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
        const el = THREE.MathUtils.degToRad(lerp(38, 57, w));
        camDir.set(0, Math.sin(el), Math.cos(el));
        const touch = document.body.classList.contains('touch');
        const top = touch ? 0.12 : clamp(64 / window.innerHeight, 0.08, 0.17);
        camGoal = frame(camera, look, camDir, fitPts(w > 0.5, over), { top, bottom: touch ? 0.12 : 0.04, side: 0.03 });
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
    const ndc = new THREE.Vector2();
    let lastPointer = '';
    function update(rawDt, t) {
      const dt = rawDt * dbg.fast;
      S.update(dt);
      st.lock = Math.max(0, st.lock - dt);

      // Input
      if (humanTurn() && st.lock <= 0) {
        const k = (n) => input.pressed(n);
        let moved = false;
        const cx = st.cursor % 3;
        const cz = Math.floor(st.cursor / 3);
        if (k('arrowleft') || k('a')) (st.cursor = cz * 3 + Math.max(0, cx - 1)), (moved = true);
        if (k('arrowright') || k('d')) (st.cursor = cz * 3 + Math.min(2, cx + 1)), (moved = true);
        if (k('arrowup') || k('w')) (st.cursor = Math.max(0, cz - 1) * 3 + cx), (moved = true);
        if (k('arrowdown') || k('s')) (st.cursor = Math.min(2, cz + 1) * 3 + cx), (moved = true);
        if (moved) {
          st.mouse = false;
          sound.ui('tick');
        }
        for (let n = 1; n <= 9; n++) if (k(String(n))) {
          st.cursor = n - 1;
          if (!st.board[n - 1]) place(n - 1);
          else sound.ui('bad');
        }
        if (humanTurn() && (k('action') || k('jump'))) {
          if (!st.board[st.cursor]) place(st.cursor);
          else sound.ui('bad');
        }
        const p = input.pointer;
        const pk = `${p.x}|${p.y}`;
        if (humanTurn() && pk !== lastPointer && !document.body.classList.contains('touch')) {
          lastPointer = pk;
          ndc.copy(p.ndc);
          const h = input.pick(hits, ndc)[0];
          if (h) {
            st.cursor = h.object.userData.cell;
            st.mouse = true;
          }
        }
        for (const tap of input.taps()) {
          const h = input.pick(hits, tap.ndc)[0];
          if (!h || !humanTurn()) continue;
          const i = h.object.userData.cell;
          st.cursor = i;
          if (!st.board[i]) place(i);
          else sound.ui('bad');
        }
      }

      // Hover tile
      const showHover = humanTurn() && !st.board[st.cursor] && st.lock <= 0;
      hover.visible = showHover;
      for (const p of ['X', 'O']) ghosts[p].visible = showHover && p === st.turn;
      if (showHover) {
        const c = cellPos(st.cursor);
        hover.position.set(c.x, BT + 0.012, c.z);
        const gh = ghosts[st.turn];
        gh.position.set(c.x, BT + 0.16 + Math.sin(t * 4) * 0.025, c.z);
        gh.rotation.y = Math.sin(t * 2) * 0.3;
        hoverMat.color.set(colorOf[st.turn]);
        hoverMat.emissive.set(colorOf[st.turn]);
        hoverMat.opacity = 0.42 + Math.sin(t * 5) * 0.12;
      }
      // Idle nudge: the active human kid thinks after a while
      if (humanTurn()) {
        st.idle += dt;
        players[st.turn].thinking = st.idle > 2.2;
      }

      // Falling pieces
      for (const d of [...st.drops]) {
        const rest = BT + 0.046;
        d.t += dt;
        if (d.t < 0.22) {
          d.m.position.y = BT + 0.6 + Math.sin(d.t * 20) * 0.01;
          d.m.scale.setScalar(lerp(0.6, 1, easeOutBack(clamp(d.t / 0.22, 0, 1))));
          continue;
        }
        d.vy -= 13 * dt;
        d.m.position.y += d.vy * dt;
        d.m.rotation.y = damp(d.m.rotation.y, 0, 8, dt);
        if (d.m.position.y <= rest) {
          d.m.position.y = rest;
          if (d.bounces < 2 && d.vy < -0.9) {
            d.vy = -d.vy * 0.32;
            d.bounces++;
            d.sq = 1;
            if (d.bounces === 1) {
              snd.tok(d.p === 'X' ? 1 : 1.12);
              rippleT = 0;
              ripple.position.set(d.m.position.x, BT + 0.012, d.m.position.z);
            } else snd.tok(1.3);
          } else {
            d.vy = 0;
            d.done = true;
          }
        }
        d.sq = Math.max(0, d.sq - dt * 5);
        const s = 1 - Math.sin(d.sq * Math.PI) * 0.25;
        d.m.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
        if (d.done && d.sq <= 0) {
          d.m.scale.setScalar(1);
          d.m.rotation.y = 0;
          st.drops.splice(st.drops.indexOf(d), 1);
          landed(d);
        }
      }
      rippleT = Math.min(1, rippleT + dt * 2.2);
      ripple.visible = rippleT < 1;
      ripple.scale.setScalar(1 + easeOutCubic(rippleT) * 1.6);
      rippleMat.opacity = (1 - rippleT) * 0.8;

      // Win line grows and the three pieces hop
      if (st.winT >= 0 && st.win) {
        st.winT += dt;
        const g = easeOutCubic(clamp(st.winT / 0.5, 0, 1));
        winBar.scale.set(1, Math.max(0.001, st.winLen * g), 1);
        winMat.emissiveIntensity = 0.8 + Math.sin(t * 6) * 0.3;
        st.win.line.forEach((i, k) => {
          const hop = Math.max(0, Math.sin(st.winT * 6 - k * 0.7));
          pieces[i].position.y = BT + 0.046 + hop * 0.08;
          pieces[i].rotation.y = Math.sin(st.winT * 3 + k) * 0.2;
          winGlows[k].material.opacity = 0.5 + Math.sin(t * 6 + k) * 0.2;
        });
        glowMat[st.win.p].emissiveIntensity = 0.5 + Math.sin(t * 6) * 0.3;
      }

      for (const q of ['X', 'O']) players[q].update(dt, t);
      room.update(dt, t);
      placeCamera(dt, false);
    }

    return {
      update,
      dispose() {
        disposed = true;
        closeChoices();
        ui.remove();
        if (window.__board === dbg) delete window.__board;
      },
    };
  },
};
