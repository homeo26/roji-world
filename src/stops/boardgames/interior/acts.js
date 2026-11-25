import { THREE, COL, umat, mesh, canvasTexture, roundRect, fitText, heartPath, drawBoxArt, drawCouple, BOXES, SECRET_BOX, fitObj, rng, FONT } from '../kit.js';
import * as L from './layout.js';

// Everything Roji and Homama can do inside The Dice House:
//   the four café games at their tables (and the Hall of Fame that remembers who won),
//   a jigsaw to finish together (a picture of the two of them, framed on the wall when done),
//   a card tower that always falls on the last card (a different way each time),
//   a coin toss where the loser dances, a random box from the library, snacks at the counter,
//   and the score sheet by the door.

const P = Math.PI;
const NAME = { roji: 'Roji', homama: 'Homama' };
const GAMES = [
  ['tictactoe', 'X O'],
  ['connect4', 'Four in a Row'],
  ['snakes', 'Snakes and Ladders'],
  ['rps', 'Rock Paper Scissors'],
];
const DANCES = ['robot', 'moonwalk', 'shimmy', 'hop', 'twirl', 'jazz', 'ballet', 'dance'];
const PICS = ['under a big pink heart', 'at The Dice House', 'under the stars'];

export function buildActs(R) {
  const { K, api, add, dyn, hot, upd, onEnter } = R;
  const { box, rbox, at } = K;
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const tone = (f, d, o, delay = 0) => {
    const s = api.sound;
    if (s?.ctx) s.tone(f, s.ctx.currentTime + delay, d, o);
  };
  const click = (delay = 0) => {
    tone(1400, 0.035, { type: 'square', gain: 0.025 }, delay);
    tone(700, 0.05, { type: 'triangle', gain: 0.05 }, delay + 0.01);
  };
  const headPos = (who) => api[who].kid.head.localToWorld(v1.set(0, 0.8, 0)).clone();
  const hearts = (who, n = 3) => api.fx.heartsAt(headPos(who), n);
  const hands = (who, h, ms = 450) => {
    const k = api[who].kid;
    k.hands = h;
    setTimeout(() => {
      if (k.hands === h) k.hands = null;
    }, ms);
  };

  // ================================================================ Hall of Fame
  const F = L.FAME;
  const fameCanvas = document.createElement('canvas');
  fameCanvas.width = 512;
  fameCanvas.height = 268;
  const fameTex = new THREE.CanvasTexture(fameCanvas);
  fameTex.colorSpace = THREE.SRGBColorSpace;
  fameTex.anisotropy = 4;
  add(at(rbox(F.w + 0.16, F.h + 0.16, 0.06, COL.gold, 0.04), F.x, F.y, L.ZB + 0.03));
  add(at(mesh(new THREE.PlaneGeometry(F.w, F.h), umat('#ffffff', { rough: 0.7, map: fameTex }), { cast: false }), F.x, F.y, L.ZB + 0.065));
  const fame = () => api.load('fame', {});
  const crown = (c, x, y, s) => {
    c.fillStyle = COL.gold;
    c.beginPath();
    c.moveTo(x - s, y + s * 0.5);
    c.lineTo(x - s, y - s * 0.4);
    c.lineTo(x - s * 0.5, y + s * 0.05);
    c.lineTo(x, y - s * 0.6);
    c.lineTo(x + s * 0.5, y + s * 0.05);
    c.lineTo(x + s, y - s * 0.4);
    c.lineTo(x + s, y + s * 0.5);
    c.closePath();
    c.fill();
  };
  const drawFame = () => {
    const f = fame();
    const c = fameCanvas.getContext('2d');
    const w = 512;
    const h = 268;
    c.fillStyle = COL.plum;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = COL.sun;
    c.lineWidth = 4;
    roundRect(c, 8, 8, w - 16, h - 16, 16);
    c.stroke();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = COL.sun;
    fitText(c, 'Hall of Fame', w / 2, 34, 300, 34, 700);
    for (const s of [-1, 1]) crown(c, w / 2 + s * 150, 34, 13);
    c.fillStyle = '#ffffff';
    c.font = `600 17px ${FONT}`;
    c.fillText('Roji', 330, 68);
    c.fillText('Homama', 440, 68);
    GAMES.forEach(([id, title], i) => {
      const y = 98 + i * 32;
      const r = f[id]?.roji || 0;
      const m = f[id]?.homama || 0;
      c.fillStyle = i % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)';
      c.fillRect(22, y - 14, w - 44, 28);
      c.textAlign = 'left';
      c.fillStyle = '#ffffff';
      fitText(c, title, 34, y + 1, 220, 18, 600);
      c.textAlign = 'center';
      c.fillStyle = r > m ? COL.sun : '#ffffff';
      c.font = `700 19px ${FONT}`;
      c.fillText(String(r), 330, y + 1);
      c.fillStyle = m > r ? COL.sun : '#ffffff';
      c.fillText(String(m), 440, y + 1);
      if (r !== m) crown(c, r > m ? 362 : 478, y, 8);
    });
    c.fillStyle = COL.lilac;
    c.font = `600 14px ${FONT}`;
    const d = f.dances || {};
    fitText(c, `Puzzles finished: ${f.puzzles || 0}    Card towers: ${f.towers || 0} built, 0 still standing`, w / 2, 232, w - 50, 14, 600);
    fitText(c, `Coin toss dances: Roji ${d.roji || 0}, Homama ${d.homama || 0}`, w / 2, 251, w - 50, 14, 600);
    fameTex.needsUpdate = true;
  };
  const bump = (fn) => {
    const f = fame();
    fn(f);
    api.save('fame', f);
    drawFame();
  };
  const record = (id, res) => {
    if (!res || res.quit) return null;
    const m = /^(Roji|Homama)\b/.exec(res.title || '');
    const w = m ? m[1].toLowerCase() : res.win === true ? api.playerId : res.win === false ? api.partnerId : null;
    if (!w) return null;
    bump((f) => {
      f[id] = f[id] || { roji: 0, homama: 0 };
      f[id][w] = (f[id][w] || 0) + 1;
    });
    return w;
  };
  drawFame();
  onEnter(drawFame);
  hot({
    x: F.x - 0.6,
    z: L.COUNTER.z + 1.05,
    r: 1.1,
    label: 'Read the Hall of Fame',
    icon: 'star',
    act: (a) => {
      const f = fame();
      const tot = { roji: 0, homama: 0 };
      for (const [id] of GAMES) for (const k of ['roji', 'homama']) tot[k] += f[id]?.[k] || 0;
      a.activity({
        label: 'Done',
        seats: [
          { who: 'player', x: F.x - 0.9, z: L.COUNTER.z + 1.1, yaw: P, pose: 'stand' },
          { who: 'partner', x: F.x + 0.1, z: L.COUNTER.z + 1.15, yaw: P, pose: 'stand' },
        ],
        focus: { x: F.x, z: L.ZB + 1.6, y: F.y - 0.3, zoom: 0.42 },
        exit: { x: F.x - 0.6, z: L.COUNTER.z + 1.3 },
      });
      const lead = tot.roji === tot.homama ? null : tot.roji > tot.homama ? 'roji' : 'homama';
      const games = tot.roji + tot.homama;
      a.toast(
        games
          ? `${games} ${games === 1 ? 'game' : 'games'} on the board. ${lead ? `<b>${NAME[lead]}</b> is ahead, ${Math.max(tot.roji, tot.homama)} to ${Math.min(tot.roji, tot.homama)}.` : 'All square. A rematch, then?'}`
          : 'The Hall of Fame is waiting for its first winner. Pick a table and play!',
        3200,
      );
      if (lead) setTimeout(() => a.emote(lead, 'cheer'), 400);
    },
  });

  // ================================================================ the four games
  const play = (id, label, x, z) =>
    hot({
      x,
      z,
      r: 1.3,
      label,
      icon: id === 'rps' ? 'hand' : 'game',
      act: async (a) => {
        if (!a.hasArena(id)) return a.toast('This game is still being set up. Come back soon.', 2200);
        const res = await a.playArena(id);
        const w = record(id, res);
        if (w) setTimeout(() => a.toast(`<b>${NAME[w]}</b> goes up on the Hall of Fame.`, 2400), 600);
      },
    });
  play('tictactoe', 'Play X O', L.XO.x, L.XO.z + 1.0);
  play('connect4', 'Play Four in a Row', L.C4.x, L.C4.z + 1.0);
  play('snakes', 'Play Snakes and Ladders', L.SNAKES.x, L.SNAKES.z + 1.05);
  play('rps', 'Play Rock Paper Scissors', L.RPS.x, L.RPS.z + 1.0);

  // ================================================================ the jigsaw
  const PZ = L.PUZZLE;
  const S = PZ.piece;
  const PW = PZ.cols * S;
  const PH = PZ.rows * S;
  const topY = PZ.h + 0.022;
  const paint = [paintHeartPic, paintCafePic, paintStarsPic];
  const picTex = paint.map((fn) => {
    const t = canvasTexture(512, 384, (c, w, h) => fn(c, w, h, api.looks));
    t.anisotropy = 4;
    return t;
  });
  const picMats = picTex.map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, emissive: new THREE.Color('#ffffff'), emissiveMap: t, emissiveIntensity: 0 }));
  // The mat the puzzle is built on, with the outline of each piece
  add(at(rbox(PW + 0.1, 0.02, PH + 0.1, COL.cream, 0.008), PZ.x, PZ.h + 0.01, PZ.z));
  // Pieces: tabs from a fixed seed, so neighbours always fit
  const r = rng(404);
  const tabH = [...Array(PZ.rows - 1)].map(() => [...Array(PZ.cols)].map(() => (r() < 0.5 ? 1 : -1)));
  const tabV = [...Array(PZ.rows)].map(() => [...Array(PZ.cols - 1)].map(() => (r() < 0.5 ? 1 : -1)));
  const edge = (ax, ay, bx, by, t) => {
    if (!t) return [[ax, ay], [bx, by]];
    const len = Math.hypot(bx - ax, by - ay);
    const ux = (bx - ax) / len;
    const uy = (by - ay) / len;
    const Pt = (u, w) => [ax + ux * u * len - uy * w * len * t, ay + uy * u * len + ux * w * len * t];
    const pts = [Pt(0, 0), Pt(0.36, 0)];
    const bez = (p0, p1, p2, p3) => {
      for (let i = 1; i <= 6; i++) {
        const k = i / 6;
        const m = 1 - k;
        pts.push([0, 1].map((d) => m * m * m * p0[d] + 3 * m * m * k * p1[d] + 3 * m * k * k * p2[d] + k * k * k * p3[d]));
      }
    };
    bez(Pt(0.36, 0), Pt(0.42, 0.1), Pt(0.24, 0.27), Pt(0.5, 0.27));
    bez(Pt(0.5, 0.27), Pt(0.76, 0.27), Pt(0.58, 0.1), Pt(0.64, 0));
    pts.push(Pt(1, 0));
    return pts;
  };
  const pieces = [];
  for (let j = 0; j < PZ.rows; j++) {
    for (let i = 0; i < PZ.cols; i++) {
      const x0 = i * S;
      const x1 = x0 + S;
      const y0 = j * S;
      const y1 = y0 + S;
      const pts = [
        ...edge(x0, y0, x1, y0, j ? tabH[j - 1][i] : 0),
        ...edge(x1, y0, x1, y1, i < PZ.cols - 1 ? tabV[j][i] : 0).slice(1),
        ...edge(x0, y1, x1, y1, j < PZ.rows - 1 ? tabH[j][i] : 0).reverse().slice(1),
        ...edge(x0, y0, x0, y1, i ? tabV[j][i - 1] : 0).reverse().slice(1, -1),
      ];
      const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false });
      geo.clearGroups();
      const pos = geo.attributes.position;
      const uv = geo.attributes.uv;
      for (let k = 0; k < pos.count; k++) uv.setXY(k, pos.getX(k) / PW, pos.getY(k) / PH);
      const cx = x0 + S / 2;
      const cy = y0 + S / 2;
      geo.translate(-cx, -cy, 0);
      geo.rotateX(-P / 2);
      geo.computeVertexNormals();
      const m = mesh(geo, picMats[0], { cast: false });
      add(dyn(m));
      pieces.push({ m, slot: new THREE.Vector3(PZ.x - PW / 2 + cx, topY, PZ.z + PH / 2 - cy), loose: null, side: 0, anim: null });
    }
  }
  // Loose spots on the table either side of the mat (left for Roji, right for Homama)
  const spots = [];
  for (const s of [-1, 1]) for (let a = 0; a < 2; a++) for (let b = 0; b < 3; b++) spots.push({ p: new THREE.Vector3(PZ.x + s * (PW / 2 + 0.17 + a * 0.24), topY - 0.004 + a * 0.001, PZ.z - 0.36 + b * 0.36), side: s });
  const pz = api.load('puzzle', null) || { pic: 0, placed: [1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0].map(Boolean) };
  const savePz = () => api.save('puzzle', pz);
  const layOut = () => {
    const free = [...spots].sort(() => Math.random() - 0.5);
    pieces.forEach((pc, k) => {
      pc.m.material = picMats[pz.pic];
      const sp = free[k];
      pc.loose = { p: sp.p.clone(), yaw: (Math.random() - 0.5) * 1.4 };
      pc.side = sp.side;
      pc.anim = null;
      const at_ = pz.placed[k] ? { p: pc.slot, yaw: 0 } : pc.loose;
      pc.m.position.copy(at_.p);
      pc.m.rotation.set(0, at_.yaw, 0);
    });
  };
  layOut();
  const complete = () => pz.placed.every(Boolean);
  // The box lid leans on the table and shows what it will be
  const lid = new THREE.Group();
  lid.add(at(rbox(0.62, 0.47, 0.05, COL.purple, 0.015), 0, 0, 0));
  const lidPic = mesh(new THREE.PlaneGeometry(0.54, 0.4), picMats[pz.pic], { cast: false });
  lid.add(at(lidPic, 0, 0, 0.027));
  lid.position.set(PZ.x - 0.6, 0.255, PZ.z + PZ.d / 2 + 0.11);
  lid.rotation.x = -0.28;
  add(lid);
  dyn(lidPic);
  R.col({ type: 'box', x: PZ.x - 0.6, z: PZ.z + PZ.d / 2 + 0.1, hw: 0.32, hd: 0.1, h: 0.48 });
  // Finished puzzles, framed on the wall (the empty frames wait with a question mark)
  const FR = [
    { x: 5.7, y: 2.35 },
    { x: 5.7, y: 1.55 },
    { x: 11.7, y: 1.95 },
  ];
  const framePics = FR.map((f, i) => {
    add(at(rbox(0.86, 0.66, 0.05, COL.woodDark, 0.02), f.x, f.y, L.ZB + 0.025));
    const wait = R.atlas.panel(0.76, 0.56, 120, 88, (c, w, h) => {
      c.fillStyle = '#fffaf2';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#f2a5b8';
      c.lineWidth = 3;
      c.setLineDash([6, 5]);
      heartPath(c, w / 2, 14, 46);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = '#c98aa0';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fitText(c, 'Our next puzzle', w / 2, h - 13, w - 16, 12, 600);
    });
    add(at(wait, f.x, f.y, L.ZB + 0.056));
    const q = mesh(new THREE.PlaneGeometry(0.74, 0.54), picMats[i], { cast: false });
    add(at(dyn(q), f.x, f.y, L.ZB + 0.062));
    return q;
  });
  const refreshFrames = () => {
    const got = new Set(api.load('framed', []));
    framePics.forEach((q, i) => (q.visible = got.has(i)));
  };
  refreshFrames();
  onEnter(refreshFrames);
  let pzRun = null;
  const glowPic = (k) => (picMats[pz.pic].emissiveIntensity = k);
  const finishPuzzle = () => {
    const framed = new Set(api.load('framed', []));
    framed.add(pz.pic);
    api.save('framed', [...framed]);
    refreshFrames();
    bump((f) => (f.puzzles = (f.puzzles || 0) + 1));
    api.sound.ui('win');
    hearts('roji', 4);
    setTimeout(() => hearts('homama', 4), 300);
    api.toast(`The last piece clicks in. It is <b>Roji and Homama</b>, ${PICS[pz.pic]}. It goes in a frame on the wall.`, 4200);
    if (pzRun) pzRun.glow = 1.6;
  };
  upd((dt) => {
    for (const pc of pieces) {
      const an = pc.anim;
      if (!an) continue;
      an.t = Math.min(1, an.t + dt / an.dur);
      const e = an.t < 0.5 ? 2 * an.t * an.t : 1 - Math.pow(-2 * an.t + 2, 2) / 2;
      pc.m.position.lerpVectors(an.from, an.to, e);
      pc.m.position.y += Math.sin(an.t * P) * an.lift;
      pc.m.rotation.y = an.yaw0 + (an.yaw1 - an.yaw0) * e;
      if (an.t >= 1) {
        pc.anim = null;
        an.done?.();
      }
    }
    const run = pzRun;
    if (!run) return;
    if (run.glow > 0) {
      run.glow -= dt;
      glowPic(Math.max(0, Math.sin(Math.min(1, run.glow / 1.6) * P) * 0.55));
    }
    if (pieces.some((p) => p.anim)) return;
    run.wait -= dt;
    if (run.wait > 0 || complete()) return;
    // Take turns: Roji places one from her side, then Homama from his
    const want = run.turn ? 1 : -1;
    let k = pieces.findIndex((p, i) => !pz.placed[i] && p.side === want);
    if (k < 0) k = pieces.findIndex((p, i) => !pz.placed[i]);
    const who = pieces[k].side < 0 ? 'roji' : 'homama';
    run.turn = !run.turn;
    hands(who, 'type', 500);
    const pc = pieces[k];
    pc.anim = {
      t: 0,
      dur: 0.55,
      lift: 0.14,
      from: pc.m.position.clone(),
      to: pc.slot,
      yaw0: pc.m.rotation.y,
      yaw1: 0,
      done: () => {
        pz.placed[k] = true;
        savePz();
        click();
        if (complete()) finishPuzzle();
      },
    };
    run.wait = 0.45;
  });
  hot({
    x: PZ.x,
    z: PZ.z + PZ.d / 2 + 0.75,
    r: 1.3,
    label: () => (complete() ? 'Start a new puzzle' : 'Build the puzzle'),
    icon: 'heart',
    act: (a) => {
      const fresh = complete();
      const seats = [
        { who: 'roji', x: L.BEANS[0].x, z: L.BEANS[0].z, y: L.BEAN_Y, yaw: P / 2, pose: 'sit' },
        { who: 'homama', x: L.BEANS[1].x, z: L.BEANS[1].z, y: L.BEAN_Y, yaw: -P / 2, pose: 'sit' },
      ];
      pzRun = { wait: fresh ? 1.4 : 0.8, turn: false, glow: 0 };
      a.activity({
        label: 'Get up',
        seats,
        focus: { x: PZ.x, z: PZ.z + 0.2, y: 0.5, zoom: 0.4 },
        exit: { x: PZ.x - 0.4, z: PZ.z + PZ.d / 2 + 0.75 },
        onEnd: () => {
          pzRun = null;
          glowPic(0);
        },
      });
      if (fresh) {
        // A new picture: break it up and spread the pieces out again
        pz.pic = (pz.pic + 1) % PICS.length;
        pz.placed = pz.placed.map(() => false);
        savePz();
        const from = pieces.map((p) => p.m.position.clone());
        layOut();
        lidPic.material = picMats[pz.pic];
        pieces.forEach((pc, k) => {
          const to = pc.m.position.clone();
          pc.m.position.copy(from[k]);
          pc.anim = { t: 0, dur: 0.6 + k * 0.03, lift: 0.2, from: from[k], to, yaw0: 0, yaw1: pc.loose.yaw };
        });
        a.sound.ui('swoosh');
        a.toast('A new puzzle! Twelve pieces, one picture. Nobody knows what it is yet.', 2800);
      } else {
        const left = pz.placed.filter((x) => !x).length;
        a.toast(`${left} pieces to go. Roji does the edges, Homama does the sky.`, 2600);
      }
    },
  });

  // ================================================================ the card tower
  const T = L.TOWER;
  const tableTop = L.TABLE_H + 0.006;
  const cardTex = canvasTexture(64, 96, (c, w, h) => {
    c.fillStyle = '#ffffff';
    roundRect(c, 0, 0, w, h, 8);
    c.fill();
    c.fillStyle = COL.rose;
    roundRect(c, 5, 5, w - 10, h - 10, 6);
    c.fill();
    c.fillStyle = '#ffd6e0';
    for (let y = 14; y < h - 8; y += 16) for (let x = 14; x < w - 8; x += 18) {
      heartPath(c, x, y - 5, 10);
      c.fill();
    }
  });
  const cardGeo = new THREE.BoxGeometry(0.005, 0.2, 0.14);
  const cards = new THREE.InstancedMesh(cardGeo, new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.6 }), 15);
  cards.castShadow = true;
  cards.frustumCulled = false;
  add(dyn(cards));
  const TH = 0.3; // how far each card leans
  const SP = 0.17; // tent spacing
  const rowH = 0.2 * Math.cos(TH) + 0.005;
  const slots = [];
  const qOf = (z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, z));
  for (let row = 0; row < 3; row++) {
    const n = 3 - row;
    const base = tableTop + row * rowH;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * SP;
      slots.push({ p: new THREE.Vector3(T.x + x - 0.1 * Math.sin(TH), base + 0.1 * Math.cos(TH), T.z), q: qOf(-TH) });
      slots.push({ p: new THREE.Vector3(T.x + x + 0.1 * Math.sin(TH), base + 0.1 * Math.cos(TH), T.z), q: qOf(TH) });
    }
    for (let i = 0; i < n - 1; i++) slots.push({ p: new THREE.Vector3(T.x + (i - (n - 2) / 2) * SP, base + rowH - 0.002, T.z), q: qOf(P / 2) });
  }
  const deck = { p: new THREE.Vector3(T.x + 0.36, tableTop + 0.04, T.z + 0.36), q: qOf(P / 2) };
  const cs = slots.map(() => ({ p: new THREE.Vector3(), q: new THREE.Quaternion(), vel: new THREE.Vector3(), spin: new THREE.Vector3(), shown: false }));
  const m4 = new THREE.Matrix4();
  const one = new THREE.Vector3(1, 1, 1);
  const zero = new THREE.Vector3(0, 0, 0);
  const writeCards = () => {
    cs.forEach((c, i) => cards.setMatrixAt(i, m4.compose(c.p, c.q, c.shown ? one : zero)));
    cards.instanceMatrix.needsUpdate = true;
  };
  writeCards();
  const VARIANTS = [
    { id: 'sneeze', text: 'Fifteen cards, three floors, and then Homama sneezes. <b>Achoo!</b>' },
    { id: 'giggle', text: 'Roji gets the giggles, the table shakes, and down it all comes.' },
    { id: 'cat', text: 'Domino the cat decides the top floor is the perfect bed.' },
    { id: 'breeze', text: 'Someone opens the front door. A tiny breeze. Goodbye, tower.' },
    { id: 'wobble', text: 'It stands. It wobbles. It stands... and it falls.' },
    { id: 'blow', text: 'Homama leans in and blows on it. On purpose. Roji gives him a look.' },
  ];
  let tw = null; // the tower being built: { n, wait, fly, state, t, variant }
  let lastVariant = -1;
  const qTmp = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const down = new THREE.Vector3(0, -1, 0);
  const catTop = new THREE.Vector3(T.x - 0.05, tableTop, T.z + 0.1);
  const collapse = () => {
    let vi = Math.floor(Math.random() * VARIANTS.length);
    if (vi === lastVariant) vi = (vi + 1) % VARIANTS.length;
    lastVariant = vi;
    const V = VARIANTS[vi];
    tw.state = V.id === 'wobble' ? 'wobble' : V.id === 'cat' ? 'cat' : 'fall';
    tw.variant = V;
    tw.t = 0;
    if (V.id === 'sneeze') {
      tone(520, 0.12, { type: 'sawtooth', gain: 0.03, slideTo: 900 });
      tone(900, 0.25, { type: 'sawtooth', gain: 0.04, slideTo: 180 }, 0.14);
    }
    if (V.id === 'blow') tone(300, 0.6, { type: 'triangle', gain: 0.03, slideTo: 200 });
    if (tw.state === 'fall') push(V.id);
    bump((f) => (f.towers = (f.towers || 0) + 1));
    setTimeout(() => api.toast(`${V.text}<br>Card towers built: ${fame().towers}. Still standing: 0.`, 3600), V.id === 'wobble' ? 1300 : V.id === 'cat' ? 700 : 150);
  };
  const push = (id) => {
    cs.forEach((c) => {
      const h = c.p.y - tableTop;
      const rnd = () => Math.random() - 0.5;
      if (id === 'sneeze') c.vel.set(-(0.7 + Math.random() * 0.6) * (0.5 + h * 2), 0.5 + Math.random() * 0.4, rnd() * 0.5);
      else if (id === 'blow') c.vel.set(-(0.3 + Math.random() * 0.3) * (0.4 + h * 2.5), 0.25 + Math.random() * 0.25, rnd() * 0.25);
      else if (id === 'breeze') c.vel.set(rnd() * 0.4, 0.35 + Math.random() * 0.3, -(0.4 + Math.random() * 0.4) * (0.5 + h * 2));
      else if (id === 'giggle') c.vel.set(rnd() * 0.5, 0.15 + Math.random() * 0.25, rnd() * 0.5);
      else if (id === 'wobble') c.vel.set(tw.lean * (0.5 + h * 2), 0.15, rnd() * 0.25);
      else {
        v2.set(c.p.x - T.x + rnd() * 0.05, 0, c.p.z - T.z - 0.1 + rnd() * 0.05).normalize();
        c.vel.set(v2.x * (0.45 + Math.random() * 0.5), 0.6 + Math.random() * 0.5, v2.z * (0.45 + Math.random() * 0.5));
      }
      c.spin.set(rnd() * 14, rnd() * 10, rnd() * 14);
    });
    // Soft little clatters
    for (let k = 0; k < 10; k++) tone(700 + Math.random() * 900, 0.03, { type: 'triangle', gain: 0.03 }, 0.15 + k * 0.07 + Math.random() * 0.04);
  };
  const simCards = (dt) => {
    for (const c of cs) {
      c.vel.y -= 7.5 * dt;
      c.p.addScaledVector(c.vel, dt);
      const onTable = Math.abs(c.p.x - T.x) < 0.55 && Math.abs(c.p.z - T.z) < 0.55 && c.p.y > tableTop - 0.06;
      const floor = (onTable ? tableTop : 0) + 0.004;
      const spinLen = c.spin.length();
      if (spinLen > 1e-3) c.q.premultiply(qTmp.setFromAxisAngle(v2.copy(c.spin).divideScalar(spinLen), spinLen * dt));
      if (c.p.y < floor + 0.02) {
        if (c.p.y < floor) c.p.y = floor;
        if (c.vel.y < 0) c.vel.y *= -0.2;
        c.vel.x *= 0.88;
        c.vel.z *= 0.88;
        c.spin.multiplyScalar(0.8);
        // Settle flat: turn the card's thin side up
        v2.set(1, 0, 0).applyQuaternion(c.q);
        const target = qTmp.setFromUnitVectors(v2, v2.y >= 0 ? up : down).multiply(c.q);
        c.q.slerp(target, Math.min(1, dt * 10));
      }
    }
  };
  upd((dt, t) => {
    if (!tw) return;
    tw.t += dt;
    if (tw.state === 'build') {
      const f = tw.fly;
      if (f) {
        f.t = Math.min(1, f.t + dt / 0.42);
        const e = f.t < 0.5 ? 2 * f.t * f.t : 1 - Math.pow(-2 * f.t + 2, 2) / 2;
        const c = cs[f.i];
        c.p.lerpVectors(deck.p, slots[f.i].p, e);
        c.p.y += Math.sin(f.t * P) * 0.22;
        c.q.slerpQuaternions(deck.q, slots[f.i].q, e);
        if (f.t >= 1) {
          tw.fly = null;
          click();
          tw.n++;
          if (tw.n >= slots.length) {
            tw.state = 'pause';
            tw.t = 0;
          } else tw.wait = 0.18;
        }
      } else {
        tw.wait -= dt;
        if (tw.wait <= 0) {
          const i = tw.n;
          cs[i].shown = true;
          cs[i].p.copy(deck.p);
          cs[i].q.copy(deck.q);
          tw.fly = { i, t: 0 };
          hands(i % 2 ? 'homama' : 'roji', 'type', 420);
        }
      }
      writeCards();
    } else if (tw.state === 'pause') {
      if (tw.t > 0.7) collapse();
    } else if (tw.state === 'wobble') {
      // The whole tower sways about its base, more and more, then goes
      tw.lean = tw.lean || (Math.random() < 0.5 ? -1 : 1);
      const a = Math.sin(tw.t * 9) * Math.min(1, tw.t / 1.2) * 0.07;
      cs.forEach((c, i) => {
        const s = slots[i];
        c.p.set(T.x + (s.p.x - T.x) * Math.cos(a) - (s.p.y - tableTop) * Math.sin(a), tableTop + (s.p.x - T.x) * Math.sin(a) + (s.p.y - tableTop) * Math.cos(a), s.p.z);
        c.q.copy(qOf(a)).multiply(s.q);
      });
      writeCards();
      if (tw.t > 1.3) {
        tw.state = 'fall';
        tw.t = 0;
        push('wobble');
      }
    } else if (tw.state === 'cat') {
      // Domino leaps from her cushion onto the table, scatters the cards, and leaps back down
      R.catBusy = true;
      const cat = R.cat.root;
      const home = R.catHome;
      const top = catTop;
      if (tw.t < 0.6) {
        const k = tw.t / 0.6;
        cat.position.lerpVectors(home, top, k);
        cat.position.y += Math.sin(k * P) * 0.6;
        cat.rotation.y = Math.atan2(top.x - home.x, top.z - home.z);
      } else if (!tw.catHit) {
        tw.catHit = true;
        cat.position.copy(top);
        push('cat');
        tone(880, 0.12, { type: 'sine', gain: 0.05, slideTo: 1300 });
      }
      if (tw.catHit) simCards(dt);
      if (tw.t > 2.2 && tw.t < 2.8) {
        const k = (tw.t - 2.2) / 0.6;
        cat.position.lerpVectors(top, home, k);
        cat.position.y += Math.sin(k * P) * 0.6;
        cat.rotation.y = Math.atan2(home.x - top.x, home.z - top.z);
      }
      R.cat.update(dt, t, null);
      if (tw.t >= 2.8) {
        cat.position.copy(home);
        cat.rotation.y = 0.2;
        R.catBusy = false;
        tw.state = 'fall';
        tw.t = 1;
      }
      writeCards();
    } else if (tw.state === 'fall') {
      simCards(dt);
      writeCards();
      if (tw.t > 3) tw.state = 'done';
    }
  });
  hot({
    x: T.x,
    z: T.z + 1.05,
    r: 1.3,
    label: 'Build a card tower',
    icon: 'spin',
    act: (a) => {
      if (R.catBusy) return;
      cs.forEach((c) => (c.shown = false));
      writeCards();
      tw = { state: 'build', n: 0, wait: 0.6, fly: null, t: 0 };
      a.activity({
        label: 'Get up',
        seats: [
          { who: 'roji', x: T.x - 0.8, z: T.z, y: L.CHAIR_Y, yaw: P / 2, pose: 'sit' },
          { who: 'homama', x: T.x + 0.8, z: T.z, y: L.CHAIR_Y, yaw: -P / 2, pose: 'sit' },
        ],
        focus: { x: T.x, z: T.z + 0.2, y: 1.0, zoom: 0.4 },
        exit: { x: T.x - 0.4, z: T.z + 1.1 },
      });
      a.toast('Steady hands. One card at a time...', 2000);
    },
  });

  // ================================================================ the coin toss
  const CN = L.COIN;
  const face = (letter, color) =>
    canvasTexture(128, 128, (c, w, h) => {
      c.fillStyle = '#f4c24f';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#d9a12c';
      c.lineWidth = 8;
      c.beginPath();
      c.arc(w / 2, h / 2, w / 2 - 10, 0, P * 2);
      c.stroke();
      c.fillStyle = color;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `700 66px ${FONT}`;
      c.fillText(letter, w / 2, h / 2 + 4);
    });
  const gold = umat('#f4c24f', { rough: 0.35, metal: 0.45 });
  const coin = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.026, 28), [gold, umat('#ffffff', { rough: 0.4, map: face('R', COL.rose) }), umat('#ffffff', { rough: 0.4, map: face('H', COL.blue) })], { cast: false });
  const coinBase = new THREE.Vector3(CN.x, 1.0 + 0.04 + 0.013, CN.z);
  coin.position.copy(coinBase);
  let lastFace = api.load('coin', 'roji');
  coin.rotation.x = lastFace === 'roji' ? 0 : P;
  add(dyn(coin));
  let toss = null;
  upd((dt) => {
    if (!toss) return;
    toss.t += dt;
    if (toss.t < 0) return;
    const T1 = 1.35;
    if (toss.t < T1) {
      const k = toss.t / T1;
      coin.position.y = coinBase.y + Math.sin(k * P) * 1.25;
      coin.rotation.x = toss.a0 + (toss.a1 - toss.a0) * (1 - Math.pow(1 - k, 1.6));
      coin.rotation.z = Math.sin(k * 7) * 0.2;
    } else if (!toss.landed) {
      toss.landed = true;
      coin.position.y = coinBase.y;
      coin.rotation.x = toss.a1;
      tone(2200, 0.06, { type: 'triangle', gain: 0.05 });
      tone(2600, 0.08, { type: 'triangle', gain: 0.04 }, 0.12);
      toss.after?.();
    } else {
      const k = Math.max(0, 1 - (toss.t - T1) / 0.7);
      coin.rotation.z = Math.sin((toss.t - T1) * 22) * 0.12 * k;
      if (k <= 0) toss = null;
    }
  });
  hot({
    x: CN.x,
    z: CN.z + 1.05,
    r: 1.2,
    label: 'Toss a coin',
    icon: 'dice',
    act: (a) => {
      if (toss) return;
      const win = Math.random() < 0.5 ? 'roji' : 'homama';
      const lose = win === 'roji' ? 'homama' : 'roji';
      a.activity({
        label: 'Done',
        seats: [
          { who: 'roji', x: CN.x - 0.85, z: CN.z + 0.25, yaw: P / 2 - 0.25, pose: 'stand' },
          { who: 'homama', x: CN.x + 0.85, z: CN.z + 0.25, yaw: -P / 2 + 0.25, pose: 'stand' },
        ],
        focus: { x: CN.x, z: CN.z + 0.25, y: 1.25, zoom: 0.36 },
        exit: { x: CN.x - 0.4, z: CN.z + 1.1 },
      });
      a.toast('R for Roji, H for Homama. Whoever loses has to dance!', 2000);
      const cur = coin.rotation.x;
      const base = Math.ceil(cur / (P * 2)) * P * 2 + P * 8;
      toss = {
        t: -0.5,
        a0: cur,
        a1: base + (win === 'roji' ? 0 : P),
        after: () => {
          lastFace = win;
          a.save('coin', win);
          const dance = DANCES[Math.floor(Math.random() * DANCES.length)];
          a.toast(`<b>${win === 'roji' ? 'R' : 'H'}!</b> ${NAME[win]} wins the toss, so ${NAME[lose]} has to dance.`, 3200);
          a.emote(win, 'cheer');
          setTimeout(() => a.emote(lose, dance), 700);
          setTimeout(() => hearts(win, 3), 2600);
          bump((f) => {
            f.dances = f.dances || {};
            f.dances[lose] = (f.dances[lose] || 0) + 1;
          });
        },
      };
      a.sound.ui('swoosh');
    },
  });

  // ================================================================ pick a game from the shelf
  const slot = R.pickSlot || { world: new THREE.Vector3(L.SHELVES[1], L.SHELF.planks[2] + 0.02, L.ZB + 0.26), yaw: 0, w: 0.5, d: 0.34 };
  const artCanvas = document.createElement('canvas');
  artCanvas.width = 256;
  artCanvas.height = 188;
  const artTex = new THREE.CanvasTexture(artCanvas);
  artTex.colorSpace = THREE.SRGBColorSpace;
  const spineCanvas = document.createElement('canvas');
  spineCanvas.width = 256;
  spineCanvas.height = 52;
  const spineTex = new THREE.CanvasTexture(spineCanvas);
  spineTex.colorSpace = THREE.SRGBColorSpace;
  const sideMat = umat('#ffffff', { rough: 0.7 });
  const artMat = umat('#ffffff', { rough: 0.6, map: artTex });
  const spineMat = umat('#ffffff', { rough: 0.6, map: spineTex });
  const bw = Math.min(0.5, slot.w);
  // One box, three draw calls: the four plain sides share a group, then the lid art, then the spine
  const pickGeo = new THREE.BoxGeometry(bw, 0.11, slot.d);
  const idx = pickGeo.index.array;
  const faceIdx = (f) => Array.from(idx.slice(f * 6, f * 6 + 6));
  pickGeo.setIndex([0, 1, 3, 5, 2, 4].flatMap(faceIdx));
  pickGeo.clearGroups();
  pickGeo.addGroup(0, 24, 0);
  pickGeo.addGroup(24, 6, 1);
  pickGeo.addGroup(30, 6, 2);
  const pick = mesh(pickGeo, [sideMat, artMat, spineMat], { cast: false });
  const showBox = (b) => {
    drawBoxArt(artCanvas.getContext('2d'), 256, 188, b);
    drawBoxArt(spineCanvas.getContext('2d'), 256, 52, b, { spine: true });
    artTex.needsUpdate = true;
    spineTex.needsUpdate = true;
    sideMat.color.set(b.c);
  };
  let current = BOXES[Math.floor(Math.random() * BOXES.length)];
  showBox(current);
  const home = slot.world.clone().add(new THREE.Vector3(0, 0.055, 0));
  pick.position.copy(home);
  pick.rotation.y = slot.yaw;
  add(dyn(pick));
  let flight = null;
  upd((dt) => {
    if (!flight) return;
    flight.t = Math.min(1, flight.t + dt / flight.dur);
    const e = flight.t < 0.5 ? 2 * flight.t * flight.t : 1 - Math.pow(-2 * flight.t + 2, 2) / 2;
    const to = typeof flight.to === 'function' ? flight.to() : flight.to;
    pick.position.lerpVectors(flight.from, to, e);
    pick.position.y += Math.sin(flight.t * P) * (flight.lift || 0);
    if (flight.t >= 1) {
      const done = flight.done;
      flight = null;
      done?.();
    }
  });
  const chest = () => api.local(api.player.kid.carryAnchor.getWorldPosition(v2));
  let picking = false;
  hot({
    x: L.PICK.x,
    z: L.PICK.z + 0.1,
    r: 1.3,
    label: 'Pick a game',
    icon: 'book',
    act: (a) => {
      if (picking || flight) return;
      picking = true;
      const n = a.load('picks', 0) + 1;
      a.save('picks', n);
      const secret = n >= 4 && (n % 5 === 0 || Math.random() < 0.15);
      let b = secret ? SECRET_BOX : BOXES[Math.floor(Math.random() * BOXES.length)];
      if (b === current) b = BOXES[(BOXES.indexOf(b) + 1) % BOXES.length];
      current = b;
      showBox(b);
      a.activity({
        label: 'Put it back',
        seats: [
          { who: 'player', x: L.PICK.x - 0.35, z: L.PICK.z + 0.35, yaw: 0.25, pose: 'stand' },
          { who: 'partner', x: L.PICK.x + 0.55, z: L.PICK.z + 0.5, yaw: -0.9, pose: 'stand' },
        ],
        focus: { x: L.PICK.x, z: L.PICK.z, y: 1.3, zoom: 0.42 },
        exit: { x: L.PICK.x, z: L.PICK.z + 0.6 },
        onEnd: () => {
          const held = api.player.kid.carried === pick;
          const from = held ? chest().clone() : pick.position.clone();
          if (held) {
            a.carry('player', null);
            add(pick);
          }
          pick.rotation.set(0, slot.yaw, 0);
          flight = { t: 0, dur: 0.5, lift: 0.25, from, to: home, done: () => (picking = false) };
          pick.position.copy(from);
        },
      });
      // Slide it out, then into the player's hands
      flight = {
        t: 0,
        dur: 0.35,
        from: home.clone(),
        to: home.clone().add(new THREE.Vector3(0, 0.05, 0.38)),
        done: () => {
          const out = pick.position.clone();
          flight = {
            t: 0,
            dur: 0.4,
            lift: 0.15,
            from: out,
            to: chest,
            done: () => {
              if (!api.activityRunning) return;
              pick.position.set(0, 0, 0.05);
              pick.rotation.set(0.5, 0, 0);
              a.carry('player', pick);
              a.sound.ui('pop');
              a.toast(`<b>${b.title}${b.sub ? ': ' + b.sub : ''}</b>. ${b.line}`, 3800);
              if (b === SECRET_BOX) {
                hearts('roji', 4);
                setTimeout(() => hearts('homama', 4), 250);
                setTimeout(() => a.emote('partner', 'heart'), 400);
              }
              if (b.arena && a.hasArena(b.arena)) {
                setTimeout(async () => {
                  if (!api.activityRunning || current !== b) return;
                  const id = await a.choose({ title: b.title, text: 'Play it now?', options: [{ id: 'play', label: 'Play it', sub: 'At its own table' }, { id: 'no', label: 'Put it back' }] });
                  if (!api.activityRunning || current !== b) return;
                  a.endActivity();
                  if (id !== 'play') return;
                  const res = await a.playArena(b.arena);
                  const w = record(b.arena, res);
                  if (w) setTimeout(() => a.toast(`<b>${NAME[w]}</b> goes up on the Hall of Fame.`, 2400), 600);
                }, 1600);
              }
            },
          };
        },
      };
      a.sound.ui('tap');
    },
  });

  // ================================================================ snacks at the counter
  const MENU = [
    { id: 'popcorn', label: 'Popcorn and lemonade', sub: 'A big bowl to share', food: 'popcorn', drink: 'juice', line: 'Homama catches the popcorn Roji throws. Most of it.' },
    { id: 'cookies', label: 'Cookies and hot cocoa', sub: 'Warm from the oven', food: 'cookies', drink: 'hot-cocoa', line: 'Homama slides the biggest cookie over to Roji.' },
    { id: 'cupcakes', label: 'Cupcakes and milkshakes', sub: 'With sprinkles', food: 'cupcake', drink: 'milkshake', line: 'Roji gets frosting on her nose. Homama says it suits her.' },
    { id: 'pizza', label: 'Pizza and juice', sub: 'Game night fuel', food: 'pizza', drink: 'juice', line: 'One pizza, two players. Homama lets Roji have the last slice.' },
    { id: 'latte', label: 'Spanish lattes and pecan cake', sub: 'The grown-up choice', food: 'pecan-cake', drink: 'spanish-latte', line: 'Two Spanish lattes and a pecan cake, just how Roji likes it.' },
  ];
  let snackObjs = [];
  let snackBusy = false;
  const CT = L.COUNTER;
  const sx = (L.STOOLS[1] + L.STOOLS[2]) / 2;
  hot({
    x: sx + 0.3,
    z: L.STOOL_Z + 0.75,
    r: 1.2,
    label: 'Order snacks',
    icon: 'yum',
    act: async (a) => {
      if (snackBusy) return;
      snackBusy = true;
      R.gm.say('What can I get you two?', 2.6);
      const id = await a.choose({ title: 'Snacks and drinks', text: 'The game master takes your order.', options: MENU.map((m) => ({ id: m.id, label: m.label, sub: m.sub })) });
      const m = MENU.find((q) => q.id === id);
      if (!m) {
        snackBusy = false;
        return;
      }
      const props = R.ictx.props;
      const [food, d1, d2] = await Promise.all([props.food(m.food), props.food(m.drink), props.food(m.drink)]);
      snackBusy = false;
      for (const o of snackObjs) o.removeFromParent();
      const plate = new THREE.Group();
      plate.add(at(K.cyl(0.2, 0.18, 0.02, COL.white, 20), 0, 0.01, 0));
      const f = fitObj(food, 0.3);
      f.position.y = 0.02;
      plate.add(f);
      plate.position.set(sx, CT.h, CT.z + 0.12);
      add(plate);
      const cups = [fitObj(d1, 0.24), fitObj(d2, 0.24)];
      snackObjs = [plate, ...cups];
      R.gm.serve(sx);
      R.gm.say('Coming right up!', 2);
      let heartT = 2;
      a.activity({
        label: 'Get up',
        seats: [
          { who: 'roji', x: L.STOOLS[1], z: L.STOOL_Z, y: L.STOOL_Y, yaw: P, pose: 'sit' },
          { who: 'homama', x: L.STOOLS[2], z: L.STOOL_Z, y: L.STOOL_Y, yaw: P, pose: 'sit' },
        ],
        focus: { x: sx, z: CT.z + 0.4, y: 1.15, zoom: 0.42 },
        exit: { x: sx, z: L.STOOL_Z + 0.85 },
        music: 0.6,
        update: (dt) => {
          heartT -= dt;
          if (heartT <= 0) {
            heartT = 4.5;
            hearts(Math.random() < 0.5 ? 'roji' : 'homama', 3);
            tone(660, 0.12, { gain: 0.04 });
            tone(880, 0.16, { gain: 0.035, attack: 0.02 }, 0.08);
          }
        },
        onEnd: () => {
          a.carry('roji', null);
          a.carry('homama', null);
          for (const o of snackObjs) o.removeFromParent();
          snackObjs = [];
          R.gm.release();
        },
      });
      a.carry('roji', cups[0]);
      a.carry('homama', cups[1]);
      a.sound.ui('pop');
      a.toast(m.line, 3000);
    },
  });

  // ================================================================ the score sheet
  hot({
    x: L.CORK.x,
    z: L.CORK.z + 0.95,
    r: 1.1,
    label: 'Read the score sheet',
    icon: 'note',
    act: (a) => {
      a.activity({
        label: 'Done',
        seats: [
          { who: 'player', x: L.CORK.x - 0.95, z: L.CORK.z + 0.55, yaw: P * 0.8, pose: 'stand' },
          { who: 'partner', x: L.CORK.x + 1.0, z: L.CORK.z + 0.75, yaw: -P * 0.8, pose: 'stand' },
        ],
        focus: { x: L.CORK.x + 0.15, z: L.CORK.z + 0.3, y: 1.45, zoom: 0.32 },
        exit: { x: L.CORK.x, z: L.CORK.z + 1.1 },
      });
      a.toast('Roji: 45. Homama: 0, and even that one is crossed out. In blue pen, in Homama\'s writing: <i>I let her win. Again.</i> Underneath, in pink: <i>Sure you did.</i>', 5200);
      setTimeout(() => a.emote('homama', 'bow'), 1800);
      setTimeout(() => a.emote('roji', 'heart'), 2600);
    },
  });

  // ================================================================ fairy lights in the cosy corner (they twinkle)
  const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), umat('#ffffff', { emissive: '#ffffff', ei: 0.8, rough: 0.4 }), R.fairy.length);
  const fcol = ['#ffd166', '#ff9eb5', '#c7a6ff', '#7fd8bf'].map((c) => new THREE.Color(c));
  R.fairy.forEach((p, i) => {
    fl.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z));
    fl.setColorAt(i, fcol[i % 4]);
  });
  add(dyn(fl));
  const dim = new THREE.Color();
  let flStep = -1;
  upd((dt, t) => {
    const s = Math.floor(t * 2.5);
    if (s === flStep) return;
    flStep = s;
    R.fairy.forEach((p, i) => fl.setColorAt(i, (i + s) % 5 === 0 ? dim.copy(fcol[i % 4]).multiplyScalar(0.4) : fcol[i % 4]));
    fl.instanceColor.needsUpdate = true;
  });
}

// ------------------------------------------------------------------ the three jigsaw pictures
function paintHeartPic(c, w, h, looks) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#ffd6e0');
  g.addColorStop(1, '#fff4e3');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#ff9eb5';
  heartPath(c, w / 2, 30, 220);
  c.fill();
  c.fillStyle = '#ffffff';
  c.globalAlpha = 0.35;
  heartPath(c, w / 2 - 40, 60, 60);
  c.fill();
  c.globalAlpha = 1;
  c.fillStyle = '#8fd08a';
  c.beginPath();
  c.ellipse(w / 2, h + 30, w * 0.7, 110, 0, 0, P * 2);
  c.fill();
  const r = rng(5);
  for (let i = 0; i < 26; i++) {
    c.fillStyle = ['#ffffff', '#ffd166', '#ef5b6f', '#c7a6ff'][i % 4];
    c.beginPath();
    c.arc(r() * w, h - r() * 70, 5, 0, P * 2);
    c.fill();
  }
  drawCouple(c, w / 2, h - 34, 200, { heart: false, rojiLook: lookColors(looks?.roji), homamaLook: lookColors(looks?.homama) });
}

function paintCafePic(c, w, h, looks) {
  c.fillStyle = '#c7a6ff';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#b392f2';
  for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2) c.fillRect(i * 64, j * 64, 64, 64);
  // shelves
  c.fillStyle = '#8a5a38';
  c.fillRect(0, 120, w, 8);
  const r = rng(9);
  for (let x = 6; x < w - 20; x += 26) {
    c.fillStyle = BOXES[Math.floor(r() * BOXES.length)].c;
    c.fillRect(x, 120 - 30 - r() * 30, 22, 60);
  }
  for (let x = 6; x < w - 20; x += 26) {
    c.fillStyle = BOXES[Math.floor(r() * BOXES.length)].c;
    c.fillRect(x, 70 - 20 - r() * 16, 22, 40);
  }
  c.fillStyle = '#8a5a38';
  c.fillRect(0, 70, w, 6);
  drawCouple(c, w / 2, h - 60, 170, { heart: true, rojiLook: lookColors(looks?.roji), homamaLook: lookColors(looks?.homama) });
  // table with dice in front of them
  c.fillStyle = '#d4a373';
  roundRect(c, 80, h - 70, w - 160, 30, 10);
  c.fill();
  c.fillStyle = '#9b6a43';
  c.fillRect(110, h - 40, 16, 40);
  c.fillRect(w - 126, h - 40, 16, 40);
  for (const [x, n] of [[w / 2 - 40, 5], [w / 2 + 20, 6]]) {
    c.fillStyle = '#ffffff';
    roundRect(c, x, h - 100, 34, 34, 7);
    c.fill();
    c.fillStyle = '#4b2a8a';
    const pts = n === 5 ? [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]] : [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]];
    for (const [u, q] of pts) {
      c.beginPath();
      c.arc(x + 17 + u * 9, h - 83 + q * 9, 3.4, 0, P * 2);
      c.fill();
    }
  }
}

function paintStarsPic(c, w, h, looks) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1f2a5c');
  g.addColorStop(1, '#6b4fa8');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  const r = rng(12);
  c.fillStyle = '#fff6cf';
  for (let i = 0; i < 70; i++) {
    c.globalAlpha = 0.4 + r() * 0.6;
    c.beginPath();
    c.arc(r() * w, r() * h * 0.7, 1 + r() * 2, 0, P * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  c.beginPath();
  c.arc(w * 0.8, 70, 34, 0, P * 2);
  c.fill();
  c.fillStyle = '#2c3570';
  c.beginPath();
  c.arc(w * 0.8 + 14, 62, 30, 0, P * 2);
  c.fill();
  c.fillStyle = '#3c5a4a';
  c.beginPath();
  c.ellipse(w / 2, h + 40, w * 0.75, 120, 0, 0, P * 2);
  c.fill();
  // A shooting star drawn as a heart trail
  c.strokeStyle = 'rgba(255,214,224,0.8)';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(60, 50);
  c.lineTo(150, 90);
  c.stroke();
  c.fillStyle = '#ff9eb5';
  heartPath(c, 158, 84, 20);
  c.fill();
  drawCouple(c, w / 2, h - 28, 190, { heart: false, rojiLook: lookColors(looks?.roji), homamaLook: lookColors(looks?.homama) });
}

const lookColors = (l) => (l ? { skin: l.skin, hair: l.hair, top: l.top, bottom: l.bottom } : null);
