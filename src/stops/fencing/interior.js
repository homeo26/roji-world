import { THREE, kit, makeAtlas, colorBake, uvScale, canvasTexture, mesh, mat, umat, roundRect, heartPath, COL } from './kit.js';
import { L } from './layout.js';
import { buildRooms } from './rooms.js';
import { buildHall } from './hall.js';
import { buildActs } from './acts.js';

// Inside the Roji & Homama Fencing Club, a dollhouse with no front wall: the foyer by the door with the changing room
// behind it (its wall sinks while you are back there), and the big hall with three pistes, the stand, the armoury and
// the trophy wall. See layout.js for the plan.

const P = Math.PI;

function wallpaper(top, dots, band, rail) {
  const t = canvasTexture(128, 440, (c, w, h) => {
    c.fillStyle = top;
    c.fillRect(0, 0, w, h);
    c.fillStyle = dots;
    for (let j = 0; j < 9; j++) for (let i = 0; i < 2; i++) {
      const x = (i + 0.5 + (j % 2) * 0.5) * 64;
      const y = j * 32 + 14;
      // little crossed foils
      c.save();
      c.translate(x, y);
      c.fillRect(-7, -1, 14, 2);
      c.rotate(0.8);
      c.fillRect(-8, -1, 16, 2);
      c.rotate(-1.6);
      c.fillRect(-8, -1, 16, 2);
      c.restore();
    }
    const wy = h * 0.72;
    c.fillStyle = band;
    c.fillRect(0, wy, w, h - wy);
    c.fillStyle = 'rgba(255,255,255,0.12)';
    for (let x = 0; x < w; x += 32) c.fillRect(x + 4, wy + 10, 24, h - wy - 20);
    c.fillStyle = rail;
    c.fillRect(0, wy - 6, w, 8);
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function floorTex(kind) {
  const t = canvasTexture(256, 256, (c, w, h) => {
    if (kind === 'parquet') {
      for (let j = 0; j < 8; j++) for (let i = 0; i < 2; i++) {
        const o = j % 2 ? w / 4 : 0;
        c.fillStyle = (i + j) % 3 === 0 ? '#e6c08f' : (i + j) % 3 === 1 ? '#dcb583' : '#e9c799';
        c.fillRect((i * w) / 2 + o - w / 2, (j * h) / 8, w / 2, h / 8);
        c.fillRect((i * w) / 2 + o + w / 2, (j * h) / 8, w / 2, h / 8);
        c.fillStyle = 'rgba(120,80,40,0.25)';
        c.fillRect(0, (j * h) / 8, w, 2);
        c.fillRect((i * w) / 2 + o, (j * h) / 8, 2, h / 8);
      }
    } else if (kind === 'check') {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        c.fillStyle = (i + j) % 2 ? '#dbe7fb' : '#fff8ee';
        c.fillRect((i * w) / 4, (j * h) / 4, w / 4, h / 4);
      }
      c.fillStyle = 'rgba(244,194,79,0.75)';
      for (const [x, y] of [[0, 0], [w / 2, h / 2], [w, 0], [0, h], [w, h], [w / 2, 0], [0, h / 2], [w, h / 2], [w / 2, h]]) {
        c.beginPath();
        c.arc(x, y, 6, 0, P * 2);
        c.fill();
      }
    } else {
      c.fillStyle = '#e8f1f8';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#c9d9e8';
      c.lineWidth = 3;
      for (let i = 0; i <= 4; i++) {
        c.beginPath();
        c.moveTo((i * w) / 4, 0);
        c.lineTo((i * w) / 4, h);
        c.moveTo(0, (i * h) / 4);
        c.lineTo(w, (i * h) / 4);
        c.stroke();
      }
      c.fillStyle = 'rgba(239,91,111,0.35)';
      heartPath(c, 160, 96, 14);
      c.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// The sky seen through the hall's windows: day or night
function makeSky() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (night) => {
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, night ? '#1c2350' : '#8fd3ff');
    g.addColorStop(1, night ? '#53468a' : '#eaf8ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = night ? '#fff6cf' : '#ffffff';
    if (night) {
      for (let i = 0; i < 16; i++) ctx.fillRect((i * 53) % 128, (i * 31) % 80, 3, 3);
      ctx.beginPath();
      ctx.arc(84, 34, 13, 0, P * 2);
      ctx.fill();
      ctx.fillStyle = '#26305e';
      ctx.beginPath();
      ctx.arc(90, 29, 11, 0, P * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(40, 40, 22, 10, 0, 0, P * 2);
      ctx.ellipse(56, 34, 16, 10, 0, 0, P * 2);
      ctx.fill();
    }
    ctx.fillStyle = night ? '#2c3a3a' : '#9ad06a';
    ctx.beginPath();
    ctx.ellipse(30, 134, 60, 26, 0, 0, P * 2);
    ctx.ellipse(110, 138, 50, 24, 0, 0, P * 2);
    ctx.fill();
    tex.needsUpdate = true;
  };
  draw(false);
  return { material: new THREE.MeshBasicMaterial({ map: tex }), draw };
}

export default {
  title: 'Fencing Club',
  build(ictx) {
    const { api } = ictx;
    const k = kit();
    const { box, rbox, at } = k;
    const g = new THREE.Group();
    const dynamic = [];
    const colliders = [];
    const hotspots = [];
    const updates = [];
    const enters = [];
    const exits = [];
    const cutaway = [];
    const add = (...o) => (g.add(...o), o[0]);
    const R = {
      k,
      g,
      api,
      ictx,
      add,
      atlas: makeAtlas(2048, 2048),
      glow: makeAtlas(512, 512, { glow: 0.5 }),
      sky: makeSky(),
      dyn: (o) => (dynamic.push(o), o),
      col: (...c) => colliders.push(...c),
      box: (x, z, hw, hd, h) => colliders.push(h === undefined ? { type: 'box', x, z, hw, hd } : { type: 'box', x, z, hw, hd, h }),
      circle: (x, z, r, h) => colliders.push(h === undefined ? { type: 'circle', x, z, r } : { type: 'circle', x, z, r, h }),
      hot: (...h) => hotspots.push(...h),
      upd: (fn) => updates.push(fn),
      onEnter: (fn) => enters.push(fn),
      onExit: (fn) => exits.push(fn),
      cut: (c) => cutaway.push(c),
    };
    const { X0, X1, ZB, ZF, LX, CZ, HL, HH, ARCH, CH_DOOR, W } = L;
    const D = ZF - ZB;

    // ---------------------------------------------------------------- floors
    add(at(box(W + 0.6, 0.4, D + 0.5, '#c9a77f'), 0, -0.21, (ZF + ZB) / 2 + 0.05));
    add(at(box(W + 0.64, 0.12, 0.06, COL.gold), 0, -0.14, ZF + 0.31));
    const floor = (kind, x0, x1, z0, z1, tile) => {
      const fg = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
      uvScale(fg, (x1 - x0) / tile, (z1 - z0) / tile);
      const f = add(at(mesh(fg, umat('#ffffff', { rough: 0.8, map: floorTex(kind) }), { cast: false }), (x0 + x1) / 2, 0, (z0 + z1) / 2));
      f.rotation.x = -P / 2;
    };
    floor('parquet', LX, X1, ZB, ZF, 2.4);
    floor('check', X0, LX, CZ, ZF, 1.4);
    floor('tile', X0, LX, ZB, CZ, 1.6);

    // ---------------------------------------------------------------- walls
    const hallPaper = wallpaper('#fff6ea', '#dbe6f7', '#3f5a92', COL.gold);
    const roomPaper = wallpaper('#eef5ff', '#d3e2f7', '#8fb3e6', '#ffffff');
    const wall = (x0, x1, h, tex, rep) => {
      const wg = new THREE.BoxGeometry(x1 - x0, h, 0.2);
      uvScale(wg, rep, 1);
      add(at(mesh(wg, umat('#ffffff', { rough: 0.9, map: tex })), (x0 + x1) / 2, h / 2, ZB - 0.1));
      add(at(box(x1 - x0, 0.1, 0.08, COL.white), (x0 + x1) / 2, h - 0.05, ZB + 0.03));
      add(at(box(x1 - x0, 0.14, 0.05, COL.white), (x0 + x1) / 2, 0.07, ZB + 0.025));
    };
    wall(LX, X1, HH, hallPaper, (X1 - LX) / 1.4);
    wall(X0, LX, HL, roomPaper, (LX - X0) / 1.4);
    add(at(box(X1 - LX, 0.12, 0.1, COL.gold), (LX + X1) / 2, HH - 0.06, ZB + 0.05));
    colliders.push({ type: 'box', x: 0, z: ZB - 0.1, hw: W / 2 + 0.2, hd: 0.12 });
    // side walls: tall at the back, low toward the front so the camera sees in
    const side = (x, h, z1, color) => {
      add(at(box(0.2, h, z1 - ZB, color), x, h / 2, (ZB + z1) / 2));
      add(at(box(0.2, 1.3, ZF - z1, color), x, 0.65, (z1 + ZF) / 2));
      add(at(box(0.26, 0.08, ZF - z1, COL.gold), x, 1.32, (z1 + ZF) / 2));
      colliders.push({ type: 'box', x, z: (ZB + ZF) / 2, hw: 0.12, hd: D / 2 + 0.2 });
    };
    side(X0 - 0.1, HL, 2.5, '#dfe9f8');
    side(X1 + 0.1, HH, 0.5, '#f3e6d2');
    // the wall between the left rooms and the hall, with an arched doorway from the foyer
    const div = '#efe3d0';
    add(at(box(0.2, HH, ARCH[0] - ZB, div), LX, HH / 2, (ZB + ARCH[0]) / 2));
    add(at(box(0.2, HH - 2.45, ARCH[1] - ARCH[0], div), LX, 2.45 + (HH - 2.45) / 2, (ARCH[0] + ARCH[1]) / 2));
    add(at(k.rot(k.tor(1.0, 0.07, COL.gold, P, undefined, 16, 6), 0, P / 2, 0), LX, 2.45 - 1.0 + 0.0, (ARCH[0] + ARCH[1]) / 2)).scale.set(1, 1, 1);
    add(at(box(0.2, 1.3, ZF - ARCH[1], div), LX, 0.65, (ARCH[1] + ZF) / 2));
    add(at(box(0.26, 0.08, ZF - ARCH[1], COL.gold), LX, 1.32, (ARCH[1] + ZF) / 2));
    for (const z of ARCH) add(at(box(0.3, 2.45, 0.12, COL.white), LX, 1.225, z));
    colliders.push({ type: 'box', x: LX, z: (ZB + ARCH[0]) / 2, hw: 0.12, hd: (ARCH[0] - ZB) / 2 });
    colliders.push({ type: 'box', x: LX, z: (ARCH[1] + ZF) / 2, hw: 0.12, hd: (ZF - ARCH[1]) / 2 });
    // front lip so nobody walks off the dollhouse
    add(at(rbox(W, 0.12, 0.16, COL.navy, 0.04), 0, 0.06, ZF - 0.05));
    colliders.push({ type: 'box', x: 0, z: ZF + 0.08, hw: W / 2, hd: 0.14 });

    // the changing room's front wall: it sinks to a stub while you are behind it
    const cutWall = new THREE.Group();
    const cw = (x0, x1, y0, y1) => cutWall.add(at(box(x1 - x0, y1 - y0, 0.16, '#f6efe4'), (x0 + x1) / 2, (y0 + y1) / 2, CZ));
    cw(X0, CH_DOOR[0], 0, HL);
    cw(CH_DOOR[1], LX, 0, HL);
    cw(CH_DOOR[0], CH_DOOR[1], 2.2, HL);
    cutWall.add(at(box(LX - X0, 0.1, 0.2, COL.white), (X0 + LX) / 2, HL - 0.05, CZ));
    cutWall.add(at(box(LX - X0, 0.12, 0.2, COL.navy), (X0 + LX) / 2, 0.06, CZ));
    for (const x of CH_DOOR) cutWall.add(at(box(0.1, 2.2, 0.22, COL.white), x, 1.1, CZ));
    colliders.push({ type: 'box', x: (X0 + CH_DOOR[0]) / 2, z: CZ, hw: (CH_DOOR[0] - X0) / 2, hd: 0.1 });
    colliders.push({ type: 'box', x: (CH_DOOR[1] + LX) / 2, z: CZ, hw: (LX - CH_DOOR[1]) / 2, hd: 0.1 });
    g.add(cutWall);
    R.cutWall = cutWall;
    cutaway.push({ object: cutWall, x: (X0 + LX) / 2, z: CZ, hw: (LX - X0) / 2 });
    dynamic.push(cutWall);

    // ---------------------------------------------------------------- the rooms, the hall, the people and what to do
    buildRooms(R);
    buildHall(R);
    buildActs(R);

    // Plain-coloured static parts become a few vertex-coloured meshes (the sinking wall bakes on its own)
    colorBake(cutWall);
    dynamic.push(...colorBake(g, dynamic));

    return {
      group: g,
      dynamic,
      colliders,
      hotspots,
      cutaway,
      size: { w: W, d: D + 0.6 },
      spawn: { x: L.EXIT.x, z: L.EXIT.z - 1.6, yaw: P },
      exit: L.EXIT,
      background: '#e9dccd',
      onEnter(a) {
        const ph = a.game?.phase?.() || '';
        R.sky.draw(/Night|Dusk|Dawn/.test(ph));
        for (const fn of enters) fn(a);
      },
      onExit(a) {
        for (const fn of exits) fn(a);
      },
      update(dt, t, a) {
        for (const fn of updates) fn(dt, t, a);
      },
    };
  },
};
