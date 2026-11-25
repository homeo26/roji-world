import * as M from './models.js';
import * as PT from './paint.js';
import { loadLooks } from './outside.js';
import { addMoments } from './moments.js';

// Inside The Little Art Studio, a dollhouse with no front wall:
//   back left: the gallery (the drawings saved in the drawing game, a bench)   | the studio: a mural wall, tall
//   front left: the reading nook (sofa, art books, a sleeping cat)            | north windows, the still-life corner,
//                                                                             | the big table, easels, the sink.
// The wall between the reading nook and the gallery sinks away while the player is in the gallery.

const { THREE, box, rbox, cyl, sph, at, rot, mat, umat, mesh, COL } = M;
const P = Math.PI;

export const L = {
  W: 24,
  ZB: -6, // inner face of the back wall
  ZF: 5, // front edge of the floor
  X0: -12,
  X1: 12,
  XD: -4.6, // the gallery and nook | studio divide
  ZG: -1.4, // the gallery | nook divide
  HG: 3.6, // gallery and nook walls
  HS: 4.4, // studio walls
  GDOOR: [-6.6, -5.2], // doorway (x) from the nook into the gallery
  SDOOR: [-3.7, -2.2], // doorway (z) from the studio into the gallery
  MURAL: { x: -0.8, w: 6.6, y0: 0.5, h: 3.1 },
  WINS: [5.0, 7.7, 10.4],
  WIN: { w: 2.2, y0: 0.9, h: 2.4 },
  TABLE: { x: 1.6, z: 0.9, w: 3.0, d: 1.4, h: 0.78 },
  STILL: { x: 9.6, z: -4.6 },
  SEASELS: [{ x: 8.6, z: -2.55 }, { x: 10.6, z: -2.55 }],
  PORT: { roji: { x: 4.7, z: 1.8 }, homama: { x: 8.4, z: 1.8 }, ex: 0.75 },
  PAD: { x: -2.3, z: -0.4 },
  SHOW: { x: -3.9, z: 2.3 },
  SINK: { x: 11.7, z: -0.6 },
  STACK: { x: 11.45, z: 2.6, yaw: -1.07 },
  CART: { x: 8.7, z: 4.3 },
  SOFA: { x: -9.2, z: -0.8 },
  BENCH: { x: -8.3, z: -3.3 },
  FRAMES: { x: -8.3, rows: [1.3, 2.32], fw: 0.96, fh: 0.72, gap: 0.2 },
  EXIT: { x: -1.8, z: 4.45 },
};

function floorTex(kind) {
  const t = M.canvasTexture(256, 256, (c, w, h) => {
    if (kind === 'studio') {
      for (let i = 0; i < 8; i++) {
        c.fillStyle = i % 2 ? '#f1d9b8' : '#ebd0ab';
        c.fillRect(0, (i * h) / 8, w, h / 8);
        c.fillStyle = 'rgba(150,100,60,0.18)';
        c.fillRect(0, (i * h) / 8, w, 2);
        c.fillRect((i * 97) % w, (i * h) / 8, 3, h / 8);
      }
      for (const [x, y, r, col] of [[50, 60, 9, '#ef5b6f'], [58, 70, 4, '#ef5b6f'], [190, 170, 8, '#6fb8ff'], [150, 30, 5, '#ffd166'], [30, 200, 7, '#7fd36b'], [210, 90, 4, '#c7a6ff'], [120, 230, 6, '#ff9a3c']]) {
        c.fillStyle = col;
        c.globalAlpha = 0.55;
        c.beginPath();
        c.arc(x, y, r, 0, P * 2);
        c.fill();
        c.globalAlpha = 1;
      }
    } else if (kind === 'gallery') {
      // herringbone parquet
      c.fillStyle = '#b98a5e';
      c.fillRect(0, 0, w, h);
      for (let j = -2; j < 10; j++) for (let i = -2; i < 10; i++) {
        c.save();
        c.translate(i * 32 + (j % 2) * 16, j * 32);
        c.rotate(((i + j) % 2 ? 1 : -1) * P / 4);
        c.fillStyle = (i + j * 3) % 3 === 0 ? '#c99a6c' : (i + j) % 3 === 1 ? '#d2a577' : '#c2915f';
        c.fillRect(-20, -6, 40, 12);
        c.restore();
      }
    } else {
      for (let i = 0; i < 8; i++) {
        c.fillStyle = i % 2 ? '#e2b98c' : '#d8ad7e';
        c.fillRect(0, (i * h) / 8, w, h / 8);
        c.fillStyle = 'rgba(120,80,50,0.2)';
        c.fillRect(0, (i * h) / 8, w, 2);
        c.fillRect((i * 61) % w, (i * h) / 8, 3, h / 8);
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function wallTex(kind) {
  const t = M.canvasTexture(128, 440, (c, w, h) => {
    if (kind === 'studio') {
      c.fillStyle = '#fff6e8';
      c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,214,190,0.35)';
      for (let i = 0; i < 12; i++) c.fillRect((i * 37) % w, (i * 71) % h, 18, 10);
      const wy = h * 0.84;
      c.fillStyle = '#ffd9c2';
      c.fillRect(0, wy, w, h - wy);
      c.fillStyle = '#ffffff';
      c.fillRect(0, wy - 5, w, 7);
    } else if (kind === 'gallery') {
      c.fillStyle = '#dcebe6';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.fillRect(0, h * 0.08, w, 6);
      const wy = h * 0.8;
      c.fillStyle = '#b9d6cc';
      c.fillRect(0, wy, w, h - wy);
      c.fillStyle = 'rgba(0,0,0,0.05)';
      for (let x = 0; x < w; x += 32) c.fillRect(x, wy, 3, h - wy);
      c.fillStyle = '#ffffff';
      c.fillRect(0, wy - 5, w, 7);
    } else {
      c.fillStyle = '#ffe6d6';
      c.fillRect(0, 0, w, h);
      // tiny pencils
      for (let j = 0; j < 12; j++) for (let i = 0; i < 2; i++) {
        const x = (i + 0.5 + (j % 2) * 0.5) * 64;
        const y = j * 30 + 14;
        c.save();
        c.translate(x, y);
        c.rotate(-0.6);
        c.fillStyle = ['#ffc23d', '#ff8fb1', '#7fd8bf'][(i + j) % 3];
        c.fillRect(-10, -2.5, 16, 5);
        c.fillStyle = '#f3d2a2';
        c.beginPath();
        c.moveTo(6, -2.5);
        c.lineTo(11, 0);
        c.lineTo(6, 2.5);
        c.fill();
        c.restore();
      }
      const wy = h * 0.76;
      c.fillStyle = '#f2b79c';
      c.fillRect(0, wy, w, h - wy);
      c.fillStyle = '#ffffff';
      c.fillRect(0, wy - 5, w, 7);
    }
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

export default {
  title: 'The Little Art Studio',
  build(ctx) {
    const { api } = ctx;
    const g = new THREE.Group();
    const dynamic = [];
    const colliders = [];
    const hotspots = [];
    const updates = [];
    const enters = [];
    const exits = [];
    const cutaway = [];
    const add = (...o) => (g.add(...o), o[0]);
    const dyn = (o) => (dynamic.push(o), o);
    const col = (x, z, hw, hd, h) => colliders.push(h === undefined ? { type: 'box', x, z, hw, hd } : { type: 'box', x, z, hw, hd, h });
    const circ = (x, z, r, h) => colliders.push(h === undefined ? { type: 'circle', x, z, r } : { type: 'circle', x, z, r, h });
    const atlas = M.makeAtlas(2048, 2048);
    const sky = M.makeSky();
    const looks = { ...loadLooks(), ...(ctx.looks || {}) };
    const R = { ctx, api, L, g, add, dyn, col, circ, atlas, looks, hot: (...h) => hotspots.push(...h), upd: (fn) => updates.push(fn), onEnter: (fn) => enters.push(fn), onExit: (fn) => exits.push(fn) };
    const { ZB, ZF, X0, X1, XD, ZG, HG, HS } = L;
    const D = ZF - ZB;
    const texMat = (t, o) => M.texMat(t, { rough: 0.85, ...o });

    // ---------------------------------------------------------------- floors
    add(at(box(L.W + 0.6, 0.4, D + 0.5, '#d9b38c'), 0, -0.21, (ZF + ZB) / 2 + 0.05));
    add(at(box(L.W + 0.64, 0.12, 0.06, COL.rose), 0, -0.14, ZF + 0.31));
    const floor = (x0, x1, z0, z1, kind, tile) => {
      const fg = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
      M.uvScale(fg, (x1 - x0) / tile, (z1 - z0) / tile);
      const f = add(at(mesh(fg, texMat(floorTex(kind)), { cast: false }), (x0 + x1) / 2, 0, (z0 + z1) / 2));
      f.rotation.x = -P / 2;
    };
    floor(XD, X1, ZB, ZF, 'studio', 2.2);
    floor(X0, XD, ZB, ZG, 'gallery', 1.6);
    floor(X0, XD, ZG, ZF, 'nook', 2.0);

    // ---------------------------------------------------------------- walls
    const wall = (x0, x1, h, kind, z = ZB - 0.1) => {
      const wg = new THREE.BoxGeometry(x1 - x0, h, 0.2);
      M.uvScale(wg, (x1 - x0) / 1.6, 1);
      return add(at(mesh(wg, texMat(wallTex(kind))), (x0 + x1) / 2, h / 2, z));
    };
    wall(X0, XD, HG, 'gallery');
    wall(XD, X1, HS, 'studio');
    add(at(box(XD - X0, 0.12, 0.08, '#ffffff'), (X0 + XD) / 2, HG - 0.06, ZB + 0.04));
    add(at(box(X1 - XD, 0.12, 0.08, '#ffffff'), (XD + X1) / 2, HS - 0.06, ZB + 0.04));
    col(0, ZB - 0.1, L.W / 2 + 0.2, 0.12);
    // Side walls: full height at the back, low toward the front
    const sideL = mat('#d6e7e1', { rough: 0.9 });
    const sideR = mat('#fbe7d3', { rough: 0.9 });
    add(at(box(0.2, HG, ZG - ZB, sideL), X0 - 0.1, HG / 2, (ZB + ZG) / 2));
    add(at(box(0.2, 1.3, ZF - ZG, mat('#fbdccb', { rough: 0.9 })), X0 - 0.1, 0.65, (ZG + ZF) / 2));
    add(at(box(0.24, 0.08, ZF - ZG, '#ffffff'), X0 - 0.1, 1.32, (ZG + ZF) / 2));
    const RZ = 0.8; // the right wall is full height back to here
    add(at(box(0.2, HS, RZ - ZB, sideR), X1 + 0.1, HS / 2, (ZB + RZ) / 2));
    add(at(box(0.2, 1.3, ZF - RZ, sideR), X1 + 0.1, 0.65, (RZ + ZF) / 2));
    add(at(box(0.24, 0.08, ZF - RZ, '#ffffff'), X1 + 0.1, 1.32, (RZ + ZF) / 2));
    for (const x of [X0 - 0.1, X1 + 0.1]) col(x, (ZB + ZF) / 2, 0.12, D / 2 + 0.2);
    // Front lip
    add(at(rbox(L.W, 0.12, 0.16, COL.rose, 0.04), 0, 0.06, ZF - 0.05));
    col(0, ZF + 0.08, L.W / 2, 0.14);
    // Gallery | studio divider (x = XD), with a doorway
    const [s0, s1] = L.SDOOR;
    const divM = mat('#eef5f2', { rough: 0.9 });
    add(at(box(0.2, HG, s0 - ZB, divM), XD, HG / 2, (ZB + s0) / 2));
    add(at(box(0.2, HG - 2.3, s1 - s0, divM), XD, 2.3 + (HG - 2.3) / 2, (s0 + s1) / 2));
    add(at(box(0.2, HG, ZG - s1, divM), XD, HG / 2, (s1 + ZG) / 2));
    add(at(box(0.26, 0.1, s1 - s0 + 0.2, COL.gold), XD, 2.3, (s0 + s1) / 2));
    col(XD, (ZB + s0) / 2, 0.12, (s0 - ZB) / 2);
    col(XD, (s1 + ZG) / 2, 0.12, (ZG - s1) / 2);
    // Gallery | nook wall (z = ZG), a doorway; it sinks while the player is in the gallery
    const gw = new THREE.Group();
    const [d0, d1] = L.GDOOR;
    const gwm = texMat(wallTex('nook'));
    const seg = (x0, x1, y0, h) => {
      const wg = new THREE.BoxGeometry(x1 - x0, h, 0.2);
      const uv = wg.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * (x1 - x0)) / 1.6, (y0 + uv.getY(i) * h) / HG);
      const m = mesh(wg, gwm);
      m.position.set((x0 + x1) / 2, y0 + h / 2, 0);
      gw.add(m);
    };
    seg(X0, d0, 0, HG);
    seg(d1, XD - 0.1, 0, HG);
    seg(d0, d1, 2.3, HG - 2.3);
    gw.add(at(box(XD - X0, 0.1, 0.24, '#ffffff'), (X0 + XD) / 2, HG - 0.05, 0));
    gw.add(at(box(d1 - d0 + 0.2, 0.1, 0.26, COL.gold), (d0 + d1) / 2, 2.3, 0));
    gw.position.set(0, 0, ZG);
    add(dyn(gw));
    col((X0 + d0) / 2, ZG, (d0 - X0) / 2, 0.12);
    col((d1 + XD) / 2, ZG, (XD - d1) / 2, 0.12);
    R.nookWall = gw;
    cutaway.push({ object: gw, x: (X0 + XD) / 2, z: ZG, hw: (XD - X0) / 2 });

    // ---------------------------------------------------------------- north windows with light shafts
    const shafts = [];
    // soft beams of light, fading at the edges and toward the floor
    const shaftTex = M.canvasTexture(64, 256, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(255,250,225,0.5)');
      gr.addColorStop(1, 'rgba(255,250,225,0)');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'destination-in';
      const gx = c.createLinearGradient(0, 0, w, 0);
      gx.addColorStop(0, 'rgba(0,0,0,0)');
      gx.addColorStop(0.3, 'rgba(0,0,0,1)');
      gx.addColorStop(0.7, 'rgba(0,0,0,1)');
      gx.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gx;
      c.fillRect(0, 0, w, h);
    });
    // the window's light on the floor: panes of sun
    const poolTex = M.canvasTexture(128, 128, (c, w, h) => {
      c.fillStyle = 'rgba(255,246,210,1)';
      for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) M.roundRect(c, 4 + (i * (w - 8)) / 3 + 3, 4 + (j * (h - 8)) / 4 + 3, (w - 8) / 3 - 6, (h - 8) / 4 - 6, 4), c.fill();
      c.globalCompositeOperation = 'destination-in';
      const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,0.8)');
      gr.addColorStop(1, 'rgba(0,0,0,0.1)');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
    });
    for (const x of L.WINS) {
      const { w, y0, h } = L.WIN;
      const yc = y0 + h / 2;
      add(at(rbox(w + 0.2, h + 0.2, 0.1, '#ffffff', 0.04), x, yc, ZB + 0.04));
      add(at(mesh(new THREE.PlaneGeometry(w, h), sky.material, { cast: false }), x, yc, ZB + 0.095));
      for (let i = 1; i < 3; i++) add(at(box(0.05, h, 0.05, '#ffffff'), x - w / 2 + (i * w) / 3, yc, ZB + 0.12));
      for (let i = 1; i < 4; i++) add(at(box(w, 0.05, 0.05, '#ffffff'), x, y0 + (i * h) / 4, ZB + 0.12));
      // an arched top
      const arch = new THREE.Shape();
      arch.absarc(0, 0, w / 2 + 0.1, 0, P, false);
      arch.lineTo(-w / 2 + 0.02, 0);
      arch.absarc(0, 0, w / 2 - 0.02, P, 0, true);
      arch.closePath();
      add(at(mesh(new THREE.ExtrudeGeometry(arch, { depth: 0.1, bevelEnabled: false, curveSegments: 16 }), mat('#ffffff')), x, y0 + h + 0.05, ZB)).scale.y = 0.55;
      const fan = new THREE.Shape();
      fan.absarc(0, 0, w / 2 - 0.02, 0, P, false);
      fan.closePath();
      const fm = mesh(new THREE.ShapeGeometry(fan, 14), sky.material, { cast: false });
      add(at(fm, x, y0 + h + 0.05, ZB + 0.095)).scale.y = 0.55;
      add(at(box(w + 0.2, 0.07, 0.1, '#ffffff'), x, y0 + h + 0.06, ZB + 0.06));
      add(at(rbox(w + 0.4, 0.08, 0.3, '#ffffff', 0.03), x, y0 - 0.08, ZB + 0.15));
      const sm = new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5, side: THREE.DoubleSide });
      const s = mesh(new THREE.PlaneGeometry(w * 1.1, 4.9), sm, { cast: false, receive: false });
      s.position.set(x + 0.3, 1.9, ZB + 1.62);
      s.rotation.set(-0.67, 0, 0);
      add(dyn(s));
      shafts.push(s);
      const pm = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.32 });
      const pool = mesh(new THREE.PlaneGeometry(w * 0.95, 2.6), pm, { cast: false, receive: false });
      pool.rotation.set(-P / 2, 0, -0.12);
      pool.position.set(x + 0.45, 0.015, ZB + 2.4);
      add(dyn(pool));
      shafts.push(pool);
    }

    // ---------------------------------------------------------------- the mural wall
    const MU = L.MURAL;
    const mural = new PT.Reveal(1024, Math.round((1024 * MU.h) / MU.w), { dab: 0.07, cols: 12, rows: 6 });
    R.mural = mural;
    add(at(mesh(new THREE.PlaneGeometry(MU.w, MU.h), new THREE.MeshStandardMaterial({ map: mural.tex, roughness: 0.85 }), { cast: false }), MU.x, MU.y0 + MU.h / 2, ZB + 0.02));
    for (const [x, y, w, h] of [[MU.x, MU.y0 - 0.04, MU.w + 0.16, 0.08], [MU.x, MU.y0 + MU.h + 0.04, MU.w + 0.16, 0.08], [MU.x - MU.w / 2 - 0.04, MU.y0 + MU.h / 2, 0.08, MU.h], [MU.x + MU.w / 2 + 0.04, MU.y0 + MU.h / 2, 0.08, MU.h]]) add(at(box(w, h, 0.05, COL.woodLight), x, y, ZB + 0.03));
    // a step ladder, a paint tray and rollers under the mural
    const lad = new THREE.Group();
    for (const s of [-1, 1]) {
      lad.add(at(rot(box(0.06, 1.7, 0.06, COL.sun), 0.18, 0, 0), s * 0.26, 0.82, 0.12));
      lad.add(at(rot(box(0.05, 1.7, 0.05, COL.sun), -0.18, 0, 0), s * 0.26, 0.82, -0.18));
    }
    for (let i = 0; i < 4; i++) lad.add(at(box(0.56, 0.04, 0.14, '#ffe29a'), 0, 0.35 + i * 0.38, 0.1 - i * 0.055));
    lad.position.set(MU.x + MU.w / 2 - 0.5, 0, ZB + 0.55);
    add(lad);
    col(lad.position.x, lad.position.z, 0.32, 0.25);
    add(at(rbox(0.5, 0.06, 0.34, '#d3dbe5', 0.02), MU.x - 2.2, 0.03, ZB + 0.45));
    add(at(box(0.44, 0.01, 0.28, COL.rose), MU.x - 2.2, 0.065, ZB + 0.45));
    add(at(rot(cyl(0.05, 0.05, 0.24, COL.rose, 10), 0, 0, P / 2), MU.x - 2.2, 0.12, ZB + 0.45));
    [COL.navy, COL.sun, COL.teal, COL.pink].forEach((c, i) => add(at(M.makePaintPot(c, 1.3), MU.x - 3.0 + i * 0.28 + (i > 1 ? 1.5 : 0), 0, ZB + 0.3)));
    // Paint handprints of both, by the mural
    const hp = atlas.panel(0.62, 0.52, 256, 216, (c, w, h) => {
      c.fillStyle = '#fff6e8';
      c.fillRect(0, 0, w, h);
      PT.handprints(c, w, h);
    });
    add(at(hp, MU.x + MU.w / 2 + 0.52, 1.3, ZB + 0.02));

    // ---------------------------------------------------------------- the still-life corner
    const SL = L.STILL;
    add(at(cyl(0.48, 0.52, 0.9, '#f7efe6', 18), SL.x, 0.45, SL.z));
    const drape = new THREE.Group();
    drape.add(at(cyl(0.6, 0.62, 0.06, COL.lilac, 18), 0, 0.92, 0));
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * P * 2;
      const fold = at(cyl(0.05, 0.09, 0.42, i % 2 ? COL.lilac : '#b495ef', 6), Math.cos(a) * 0.57, 0.72, Math.sin(a) * 0.57);
      fold.rotation.set(Math.sin(a) * -0.12, 0, Math.cos(a) * 0.12);
      drape.add(fold);
    }
    drape.position.set(SL.x, 0, SL.z);
    add(drape);
    circ(SL.x, SL.z, 0.62);
    // the fruit bowl and a vase of flowers (static; the teacher straightens them)
    const still = new THREE.Group();
    const bowl = new THREE.LatheGeometry([[0, 0], [0.16, 0], [0.2, 0.05], [0.23, 0.12], [0.22, 0.12], [0.18, 0.05], [0, 0.03]].map(([x, y]) => new THREE.Vector2(x, y)), 18);
    still.add(at(mesh(bowl, mat('#ffffff', { rough: 0.4 })), -0.15, 0, 0.05));
    still.add(at(sph(0.075, COL.red, { rough: 0.4 }, 12), -0.2, 0.12, 0.05));
    still.add(at(sph(0.07, COL.orange, { rough: 0.5 }, 12), -0.05, 0.12, 0.1));
    still.add(at(sph(0.068, '#7fd36b', { rough: 0.4 }, 12), -0.12, 0.14, -0.05));
    for (let i = 0; i < 5; i++) still.add(at(sph(0.03, COL.purple, { rough: 0.4 }, 8), -0.28 + (i % 3) * 0.035, 0.11 + Math.floor(i / 3) * 0.04, 0.0 + (i % 2) * 0.03));
    const ban = at(rot(M.tor(0.12, 0.03, COL.sun, undefined, P * 0.7, 6, 12), P / 2, 0, 0.4), -0.08, 0.16, 0.02);
    still.add(ban);
    const vase = new THREE.LatheGeometry([[0, 0], [0.08, 0], [0.12, 0.1], [0.1, 0.22], [0.05, 0.3], [0.06, 0.34], [0, 0.34]].map(([x, y]) => new THREE.Vector2(x, y)), 16);
    still.add(at(mesh(vase, mat(COL.blue, { rough: 0.35 })), 0.22, 0, -0.05));
    for (const [dx, dz, h, c] of [[-0.05, 0, 0.3, COL.pink], [0.04, 0.03, 0.36, COL.sun], [0.0, -0.05, 0.26, '#ffffff'], [0.07, -0.02, 0.28, COL.rose]]) {
      still.add(at(cyl(0.008, 0.008, h, COL.leafDark, 4), 0.22 + dx * 0.5, 0.34 + h / 2, -0.05 + dz * 0.5));
      still.add(at(sph(0.045, c, undefined, 8), 0.22 + dx, 0.34 + h, -0.05 + dz));
    }
    still.position.set(SL.x, 0.95, SL.z);
    add(still);
    // a lamp on a stand pointing at it
    add(at(cyl(0.14, 0.16, 0.04, COL.ink, 12), SL.x - 1.05, 0.02, SL.z - 0.15));
    add(at(cyl(0.02, 0.02, 1.7, COL.ink, 6), SL.x - 1.05, 0.87, SL.z - 0.15));
    add(at(rot(cyl(0.08, 0.16, 0.2, COL.sun, 14), 0, 0, 1.0), SL.x - 0.93, 1.72, SL.z - 0.15));
    circ(SL.x - 1.05, SL.z - 0.15, 0.18);
    // two easels facing it
    R.stillCanvas = [];
    L.SEASELS.forEach((p, i) => {
      const rv = new PT.Reveal(256, 200, { dab: 0.12, cols: 7, rows: 5 });
      rv.set((c, w, h) => PT.stillLife(c, w, h, i ? 'hearts' : 'neat', 2), { done: false, ghost: 0 });
      const e = M.makeEasel({ w: 0.86, h: 0.68, cy: 1.2, material: new THREE.MeshStandardMaterial({ map: rv.tex, roughness: 0.8 }) });
      e.root.position.set(p.x, 0, p.z);
      add(e.root);
      dyn(e.canvas);
      circ(p.x, p.z + 0.05, 0.42);
      const st = M.makeStool(i ? COL.sky : COL.pink);
      st.position.set(p.x + 0.5, 0, p.z + 0.75);
      add(st);
      circ(p.x + 0.5, p.z + 0.75, 0.22, 0.46);
      // gold star sticker, shown after a lesson
      const star = new THREE.Mesh(M.starGeo(0.07, 0.03, 0.02), umat(COL.gold, { rough: 0.4, metal: 0.3 }));
      star.position.set(p.x + 0.33, 1.5, p.z + 0.12);
      star.visible = false;
      add(dyn(star));
      R.stillCanvas.push({ rv, star, easel: e });
    });

    // ---------------------------------------------------------------- the big table
    const T = L.TABLE;
    add(at(rbox(T.w, 0.08, T.d, '#f7efe6', 0.03), T.x, T.h - 0.04, T.z));
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(at(box(0.09, T.h - 0.08, 0.09, COL.woodDark), T.x + dx * (T.w / 2 - 0.12), (T.h - 0.08) / 2, T.z + dz * (T.d / 2 - 0.12)));
    add(at(box(T.w - 0.3, 0.04, T.d - 0.3, COL.wood), T.x, 0.22, T.z));
    col(T.x, T.z, T.w / 2 + 0.02, T.d / 2 + 0.02, T.h + 0.02);
    const ty = T.h;
    // paper, sketchbooks, palettes, paints, pencils, a water jar, an apple for drawing
    add(at(box(0.6, 0.01, 0.45, '#ffffff'), T.x - 0.9, ty + 0.005, T.z + 0.2)).rotation.y = 0.2;
    add(at(box(0.55, 0.01, 0.4, '#fff1d6'), T.x - 0.85, ty + 0.015, T.z + 0.18)).rotation.y = -0.15;
    const sketch = atlas.panel(0.5, 0.36, 200, 144, (c, w, h) => {
      PT.paper(c, w, h, '#ffffff');
      PT.couple(c, w / 2, h * 0.92, h * 0.7, looks);
    });
    sketch.rotation.set(-P / 2, 0, 0.15);
    sketch.position.set(T.x - 0.85, ty + 0.022, T.z + 0.18);
    add(sketch);
    add(at(M.makePalette(1.2), T.x + 0.1, ty, T.z + 0.3));
    add(at(M.makePalette(1.0), T.x + 1.1, ty, T.z - 0.25)).rotation.y = 2.2;
    add(at(M.makePencilCup(1.2), T.x - 0.3, ty, T.z - 0.35));
    add(at(M.makeBrushJar(1.1), T.x + 0.55, ty, T.z - 0.3));
    [COL.red, COL.sun, COL.navy, COL.teal, COL.pink].forEach((c, i) => add(at(M.makePaintPot(c, 0.75), T.x + 0.6 + (i % 3) * 0.16, ty, T.z + 0.15 + Math.floor(i / 3) * 0.16)));
    add(at(cyl(0.07, 0.065, 0.14, mat('#cfeff5', { rough: 0.2 }), 12), T.x + 1.25, ty + 0.07, T.z + 0.35));
    add(at(sph(0.06, COL.red, { rough: 0.4 }, 10), T.x - 1.2, ty + 0.06, T.z - 0.3));
    for (let i = 0; i < 5; i++) add(at(rot(cyl(0.012, 0.012, 0.18, M.RAINBOW[i], 6), 0, i * 0.5, P / 2), T.x - 0.5 + i * 0.06, ty + 0.012, T.z + 0.45));
    add(at(rbox(0.32, 0.05, 0.24, COL.rose, 0.02), T.x + 0.3, ty + 0.025, T.z - 0.4));
    add(at(rbox(0.32, 0.05, 0.24, COL.sky, 0.02), T.x + 0.32, ty + 0.075, T.z - 0.38)).rotation.y = 0.15;
    // stools along the front of the table
    for (const [dx, c] of [[-1.0, COL.sun], [0, COL.mint], [1.0, COL.lilac]]) {
      add(at(M.makeStool(c), T.x + dx, 0, T.z + T.d / 2 + 0.45));
      circ(T.x + dx, T.z + T.d / 2 + 0.45, 0.22, 0.46);
    }
    // two clamp lamps on the table ends
    const lampGlow = umat('#fff3c4', { emissive: '#ffcf7a', ei: 0.6, rough: 0.3 });
    R.lampGlow = lampGlow;
    for (const s2 of [-1, 1]) {
      const lx = T.x + s2 * (T.w / 2 - 0.25);
      const lz = T.z - 0.35;
      const lamp = new THREE.Group();
      lamp.add(at(cyl(0.11, 0.12, 0.04, s2 < 0 ? COL.teal : COL.rose, 14), 0, 0.02, 0));
      lamp.add(at(rot(cyl(0.015, 0.015, 0.5, COL.ink, 6), 0, 0, s2 * 0.35), -s2 * 0.08, 0.26, 0));
      lamp.add(at(rot(cyl(0.015, 0.015, 0.42, COL.ink, 6), 0, 0, -s2 * 1.1), s2 * 0.02, 0.56, 0));
      lamp.add(at(sph(0.03, COL.ink, undefined, 8), -s2 * 0.16, 0.49, 0));
      lamp.add(at(rot(mesh(new THREE.CylinderGeometry(0.05, 0.13, 0.16, 16, 1, true), mat(s2 < 0 ? COL.teal : COL.rose, { side: THREE.DoubleSide })), 0, 0, s2 * 0.5), s2 * 0.2, 0.62, 0));
      lamp.add(at(mesh(new THREE.SphereGeometry(0.045, 10, 8), lampGlow, { cast: false }), s2 * 0.23, 0.57, 0));
      lamp.position.set(lx, ty, lz);
      lamp.rotation.y = s2 * 0.4;
      add(lamp);
    }

    // ---------------------------------------------------------------- the portrait easels (they face each other while painting)
    R.portrait = {};
    for (const who of ['roji', 'homama']) {
      const s = L.PORT[who];
      const sx = who === 'roji' ? 1 : -1;
      const rv = new PT.Reveal(256, 320, { dab: 0.12, cols: 6, rows: 7 });
      const e = M.makeEasel({ w: 0.72, h: 0.9, cy: 1.25, material: new THREE.MeshStandardMaterial({ map: rv.tex, roughness: 0.8 }), wood: who === 'roji' ? COL.woodDark : COL.wood });
      M.bake(e.root, [e.canvas]);
      e.root.position.set(s.x + sx * L.PORT.ex, 0, s.z);
      add(dyn(e.root));
      circ(s.x + sx * L.PORT.ex, s.z, 0.4);
      const st = M.makeStool(who === 'roji' ? COL.rose : COL.navy);
      st.position.set(s.x, 0, s.z);
      add(st);
      circ(s.x, s.z, 0.22, 0.46);
      R.portrait[who] = { rv, easel: e.root, faceIn: who === 'roji' ? -P / 2 : P / 2 };
    }

    // ---------------------------------------------------------------- the Drawing Pad easel
    const PD = L.PAD;
    const padE = M.makeEasel({ w: 0.95, h: 0.72, cy: 1.25, wood: COL.rose });
    padE.root.position.set(PD.x, 0, PD.z);
    add(padE.root);
    const padPic = atlas.panel(0.9, 0.68, 300, 226, (c, w, h) => {
      PT.paper(c, w, h, '#ffffff');
      c.strokeStyle = '#ffd1dc';
      c.lineWidth = 6;
      c.setLineDash([16, 12]);
      M.roundRect(c, 14, 14, w - 28, h - 28, 18);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = '#ef5b6f';
      c.textAlign = 'center';
      c.font = `700 40px ${M.FONT}`;
      c.fillText('Drawing Pad', w / 2, h * 0.42);
      c.fillStyle = '#8a6a5a';
      c.font = `500 24px ${M.FONT}`;
      c.fillText('Draw anything you like', w / 2, h * 0.62);
      c.fillStyle = '#ff8fb1';
      PT.heart(c, w / 2, h * 0.8, 30);
      c.fill();
    });
    padPic.position.set(0, 1.25, 0.055);
    padPic.rotation.x = -0.09;
    padE.root.add(padPic);
    circ(PD.x, PD.z, 0.45);
    add(at(M.makeStool(COL.sun), PD.x + 0.1, 0, PD.z + 0.75));
    circ(PD.x + 0.1, PD.z + 0.75, 0.22, 0.46);
    add(at(M.makePencilCup(1.3), PD.x + 0.42, padE.ledgeY + 0.03, PD.z + 0.06));

    // ---------------------------------------------------------------- Homama's portrait of Roji, on show by the door
    const SH = L.SHOW;
    const showE = M.makeEasel({ w: 0.76, h: 0.95, cy: 1.3, wood: COL.woodDark });
    const showPic = atlas.panel(0.7, 0.88, 256, 322, (c, w, h) => PT.lopsidedRoji(c, w, h, looks));
    showPic.position.set(0, 1.3, 0.055);
    showPic.rotation.x = -0.09;
    showE.root.add(showPic);
    // a rosette
    const ros = new THREE.Group();
    ros.add(at(cyl(0.09, 0.09, 0.02, COL.rose, 14), 0, 0, 0)).rotation.x = P / 2;
    ros.add(at(cyl(0.055, 0.055, 0.025, COL.gold, 14), 0, 0, 0.005)).rotation.x = P / 2;
    for (const s of [-1, 1]) ros.add(at(rot(box(0.05, 0.16, 0.01, COL.rose), 0, 0, s * 0.25), s * 0.03, -0.12, 0));
    ros.position.set(0.3, 1.66, 0.09);
    showE.root.add(ros);
    showE.root.position.set(SH.x, 0, SH.z);
    showE.root.rotation.y = 0.25;
    add(showE.root);
    circ(SH.x, SH.z, 0.45);
    const plaque = atlas.panel(0.5, 0.14, 220, 62, (c, w, h) => {
      c.fillStyle = '#f4c24f';
      M.roundRect(c, 2, 2, w - 4, h - 4, 10);
      c.fill();
      c.fillStyle = '#5a3a10';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `600 ${h * 0.46}px ${M.FONT}`;
      c.fillText('Roji, by Homama', w / 2, h / 2 + 2);
    });
    plaque.position.set(0, showE.ledgeY - 0.1, 0.12);
    showE.root.add(plaque);

    // ---------------------------------------------------------------- the sink with paint cups
    const SK = L.SINK;
    add(at(rbox(0.62, 0.86, 1.9, COL.mint, 0.04), SK.x, 0.43, SK.z));
    add(at(rbox(0.68, 0.06, 1.96, '#ffffff', 0.02), SK.x, 0.88, SK.z));
    add(at(rbox(0.4, 0.05, 0.7, mat(COL.steel, { metal: 0.5, rough: 0.3 }), 0.02), SK.x - 0.02, 0.9, SK.z));
    add(at(box(0.36, 0.01, 0.64, '#9aa6b4'), SK.x - 0.02, 0.92, SK.z));
    const steel = mat(COL.steel, { metal: 0.6, rough: 0.25 });
    add(at(cyl(0.025, 0.025, 0.32, steel, 8), SK.x + 0.22, 1.07, SK.z));
    add(at(rot(cyl(0.022, 0.022, 0.2, steel, 8), 0, 0, P / 2), SK.x + 0.13, 1.22, SK.z));
    for (const dz of [-0.12, 0.12]) add(at(sph(0.035, dz < 0 ? COL.red : COL.blue, undefined, 8), SK.x + 0.22, 1.0, SK.z + dz));
    for (const dz of [-0.6, 0.55, 0.75]) add(at(M.makeBrushJar(1, ['#cfeff5', '#ffe9a8', '#ffd1dc'][Math.abs(Math.round(dz * 10)) % 3]), SK.x + 0.05, 0.91, SK.z + dz));
    [COL.red, COL.sun, COL.navy, COL.teal].forEach((c, i) => add(at(M.makePaintPot(c, 0.8), SK.x + 0.08, 0.91, SK.z - 0.95 + i * 0.13)));
    add(at(rbox(0.1, 0.12, 0.08, COL.pink, 0.03), SK.x + 0.15, 0.97, SK.z + 0.38));
    // towel on a rail, a shelf of paint cups above
    add(at(box(0.04, 0.04, 0.6, mat(COL.steel, { metal: 0.6, rough: 0.3 })), X1 - 0.06, 1.25, SK.z + 1.25));
    add(at(rbox(0.04, 0.5, 0.42, COL.sky, 0.02), X1 - 0.08, 1.02, SK.z + 1.25));
    add(at(box(0.3, 0.05, 1.8, COL.woodLight), X1 - 0.15, 1.75, SK.z));
    for (let i = 0; i < 7; i++) {
      add(at(cyl(0.06, 0.05, 0.12, '#ffffff', 10), X1 - 0.15, 1.84, SK.z - 0.75 + i * 0.25));
      add(at(cyl(0.05, 0.05, 0.01, M.RAINBOW[i], 10), X1 - 0.15, 1.905, SK.z - 0.75 + i * 0.25));
    }
    col(SK.x, SK.z, 0.32, 0.98, 0.92);
    R.sinkBubbles = [];
    for (let i = 0; i < 10; i++) {
      const b = M.sprite(M.glowTex(), { color: '#e8f8ff', opacity: 0, scale: 0.12 });
      b.position.set(SK.x, 1.0, SK.z);
      add(dyn(b));
      R.sinkBubbles.push(b);
    }
    // shelves of supplies on the right wall, between the sink and the still life
    add(at(box(0.36, 2.0, 1.4, COL.woodLight), X1 - 0.18, 1.0, -2.6));
    for (const y of [0.45, 0.95, 1.45]) {
      add(at(box(0.32, 0.04, 1.34, COL.wood), X1 - 0.2, y, -2.6));
      for (let i = 0; i < 5; i++) {
        const c = M.RAINBOW[(i + Math.round(y * 3)) % M.RAINBOW.length];
        if (y < 1) add(at(rbox(0.2, 0.24, 0.2, c, 0.04), X1 - 0.25, y + 0.14, -3.1 + i * 0.25));
        else add(at(cyl(0.04, 0.04, 0.2, c, 8), X1 - 0.25, y + 0.12, -3.1 + i * 0.25));
      }
    }
    col(X1 - 0.18, -2.6, 0.2, 0.72);

    // ---------------------------------------------------------------- the stack of canvases (a tiny painting hides behind)
    const ST = L.STACK;
    const stack = new THREE.Group();
    const tiny = atlas.panel(0.36, 0.28, 160, 124, (c, w, h) => PT.tinyCouple(c, w, h, looks));
    const tinyG = new THREE.Group();
    tinyG.add(at(box(0.42, 0.34, 0.03, COL.gold), 0, 0.17, 0));
    tinyG.add(at(tiny, 0, 0.17, 0.017));
    tinyG.add(at(rot(box(0.05, 0.3, 0.02, COL.woodDark), 0.45, 0, 0), 0, 0.14, -0.08));
    tinyG.position.set(0.05, 0.0, -0.05);
    tinyG.rotation.x = -0.2;
    stack.add(tinyG);
    const blankA = atlas.panel(0.86, 0.66, 200, 154, (c, w, h) => PT.landscape(c, w, h));
    const fronts = [];
    [[0.95, 1.05, '#f3ead9', null], [0.9, 0.8, '#f3ead9', blankA], [0.8, 0.95, '#fffaf1', null]].forEach(([w, h, cc, face], i) => {
      const cg = new THREE.Group();
      cg.add(at(box(w, h, 0.04, cc), 0, h / 2, 0));
      cg.add(at(box(w + 0.02, 0.03, 0.05, COL.woodLight), 0, 0.015, 0));
      if (face) {
        face.position.set(0, h / 2, 0.021);
        cg.add(face);
      }
      cg.position.set((i - 1) * 0.06, 0, 0.1 + i * 0.09);
      cg.rotation.x = -0.18;
      M.bake(cg, face ? [face] : []);
      stack.add(cg);
      fronts.push({ g: cg, base: cg.position.clone() });
    });
    stack.position.set(ST.x, 0, ST.z);
    stack.rotation.y = ST.yaw;
    add(stack);
    for (const f of fronts) dyn(f.g);
    dyn(tinyG);
    circ(ST.x, ST.z, 0.55);
    R.stack = { group: stack, fronts, tiny: tinyG };

    // ---------------------------------------------------------------- the paint cart (for the paint fight)
    const CA = L.CART;
    add(at(rbox(1.0, 0.5, 0.55, COL.sun, 0.05), CA.x, 0.4, CA.z));
    for (const [dx, dz] of [[-0.38, -0.2], [0.38, -0.2], [-0.38, 0.2], [0.38, 0.2]]) add(at(rot(cyl(0.08, 0.08, 0.05, COL.ink, 10), 0, 0, P / 2), CA.x + dx, 0.08, CA.z + dz));
    [COL.red, COL.navy, COL.teal, COL.pink, COL.purple, COL.orange].forEach((c, i) => {
      add(at(cyl(0.11, 0.1, 0.18, '#ffffff', 12), CA.x - 0.32 + (i % 3) * 0.32, 0.74, CA.z - 0.12 + Math.floor(i / 3) * 0.25));
      add(at(cyl(0.1, 0.1, 0.01, c, 12), CA.x - 0.32 + (i % 3) * 0.32, 0.835, CA.z - 0.12 + Math.floor(i / 3) * 0.25));
    });
    const cartSign = atlas.panel(0.7, 0.24, 240, 82, (c, w, h) => {
      c.fillStyle = '#ffffff';
      M.roundRect(c, 3, 3, w - 6, h - 6, 16);
      c.fill();
      c.lineWidth = 5;
      c.strokeStyle = COL.rose;
      c.stroke();
      c.fillStyle = '#c73b45';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `700 ${h * 0.44}px ${M.FONT}`;
      c.fillText('Paint, not for eating', w / 2, h / 2 + 2, w - 24);
    });
    add(at(cartSign, CA.x, 0.42, CA.z + 0.281));
    col(CA.x, CA.z, 0.52, 0.3, 0.85);

    // ---------------------------------------------------------------- the gallery
    const FR = L.FRAMES;
    const gal = document.createElement('canvas');
    gal.width = 6 * 256;
    gal.height = 2 * 192;
    const galTex = new THREE.CanvasTexture(gal);
    galTex.colorSpace = THREE.SRGBColorSpace;
    galTex.anisotropy = 8;
    const galGeo = [];
    for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) {
      const x = FR.x + (i - 2.5) * (FR.fw + FR.gap);
      const y = FR.rows[1 - row];
      const fr = M.makeFrame(FR.fw + 0.12, FR.fh + 0.12, [COL.gold, '#ffffff', COL.rose][(i + row) % 3], 0.05, 0.06);
      fr.position.set(x, y, ZB);
      add(fr);
      const pg = new THREE.PlaneGeometry(FR.fw, FR.fh);
      const uv = pg.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, (i + uv.getX(k)) / 6, 1 - (row + 1 - uv.getY(k)) / 2);
      pg.translate(x, y, ZB + 0.03);
      galGeo.push(pg);
      // a little spotlight over each frame on the top row
      if (row === 0) {
        add(at(box(0.05, 0.05, 0.18, mat(COL.gold, { metal: 0.5, rough: 0.35 })), x, FR.rows[1] + 0.62, ZB + 0.1));
        add(at(rot(cyl(0.04, 0.06, 0.1, mat(COL.gold, { metal: 0.5, rough: 0.35 }), 8), 0.7, 0, 0), x, FR.rows[1] + 0.58, ZB + 0.2));
      }
    }
    const galMesh = mesh(M.mergeGeometries(galGeo, false), new THREE.MeshStandardMaterial({ map: galTex, roughness: 0.6 }), { cast: false });
    add(dyn(galMesh));
    const galSign = atlas.panel(2.6, 0.42, 520, 84, (c, w, h) => {
      c.fillStyle = '#dcebe6';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      M.roundRect(c, 4, 4, w - 8, h - 8, 30);
      c.fill();
      c.lineWidth = 6;
      c.strokeStyle = COL.teal;
      c.stroke();
      c.fillStyle = '#2f6f62';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `600 ${h * 0.46}px ${M.FONT}`;
      c.fillText('Roji and Homama\u2019s Gallery', w / 2, h / 2 + 2, w - 40);
    });
    add(at(galSign, FR.x, HG - 0.33, ZB + 0.03));
    R.gallery = { canvas: gal, tex: galTex, sig: null };
    // bench
    const BE = L.BENCH;
    add(at(rbox(2.0, 0.1, 0.5, COL.woodDark, 0.03), BE.x, 0.44, BE.z));
    add(at(rbox(1.9, 0.05, 0.44, '#c95f6f', 0.02), BE.x, 0.51, BE.z));
    for (const dx of [-0.85, 0.85]) add(at(box(0.1, 0.4, 0.42, COL.woodDark), BE.x + dx, 0.2, BE.z));
    col(BE.x, BE.z, 1.0, 0.26, 0.52);
    add(at(M.makePlant(1.2, COL.teal), X0 + 0.5, 0, ZB + 0.5));
    circ(X0 + 0.5, ZB + 0.5, 0.22);
    add(at(M.makePlant(0.9, COL.rose), XD - 0.5, 0, ZB + 0.5));
    circ(XD - 0.5, ZB + 0.5, 0.22);

    // ---------------------------------------------------------------- the reading nook
    const SO = L.SOFA;
    // loveseat
    add(at(rbox(2.3, 0.42, 0.85, '#ef8fa3', 0.12), SO.x, 0.21, SO.z));
    add(at(rbox(2.3, 0.6, 0.22, '#ef8fa3', 0.1), SO.x, 0.62, SO.z - 0.34));
    for (const s of [-1, 1]) add(at(rbox(0.22, 0.6, 0.85, '#e57890', 0.1), SO.x + s * 1.05, 0.4, SO.z));
    for (const s of [-1, 1]) add(at(rbox(0.95, 0.14, 0.62, '#ffb3c2', 0.07), SO.x + s * 0.48, 0.48, SO.z + 0.06));
    add(rot(at(rbox(0.36, 0.32, 0.12, COL.sun, 0.06), SO.x - 0.75, 0.72, SO.z - 0.18), -0.2, 0.2, 0));
    add(rot(at(M.mesh(M.heartGeo(0.3, 0.12), mat(COL.white)), SO.x + 0.72, 0.72, SO.z - 0.16), -0.2, -0.2, 0));
    col(SO.x, SO.z, 1.16, 0.44, 0.55);
    // framed little prints on the wall above it
    [[-0.7, 2.0, 0.5, 0.4, 'heart'], [0.1, 2.2, 0.42, 0.55, 'sun'], [0.8, 1.95, 0.46, 0.36, 'cat']].forEach(([dx, y, w, h, kind]) => {
      const fr = M.makeFrame(w, h, COL.woodDark, 0.04, 0.04);
      fr.position.set(SO.x + dx, y, 0.11);
      gw.add(fr);
      const pic = atlas.panel(w - 0.08, h - 0.08, 120, Math.round((120 * (h - 0.08)) / (w - 0.08)), (c, cw, ch) => {
        PT.paper(c, cw, ch, '#fff7ea');
        if (kind === 'heart') {
          c.fillStyle = '#ef5b6f';
          PT.heart(c, cw / 2, ch / 2, ch * 0.7);
          c.fill();
        } else if (kind === 'sun') {
          c.fillStyle = '#ffd166';
          c.beginPath();
          c.arc(cw / 2, ch * 0.45, cw * 0.25, 0, P * 2);
          c.fill();
          c.fillStyle = '#7fd36b';
          c.fillRect(0, ch * 0.78, cw, ch * 0.22);
        } else {
          c.fillStyle = '#f0a65a';
          c.beginPath();
          c.ellipse(cw / 2, ch * 0.62, cw * 0.3, ch * 0.22, 0, 0, P * 2);
          c.arc(cw * 0.7, ch * 0.42, ch * 0.16, 0, P * 2);
          c.fill();
        }
      });
      pic.position.set(SO.x + dx, y, 0.14);
      gw.add(pic);
    });
    M.bake(gw, gw.children.filter((o) => o.material === atlas.material || o.material === gwm));
    // rug
    const rug = atlas.wrap(new THREE.CircleGeometry(2.0, 40), 400, 400, (c, w, h) => {
      c.fillStyle = '#f7efe6';
      c.fillRect(0, 0, w, h);
      const rings = ['#ff9eb5', '#fff1d6', '#7fd8bf', '#fff1d6', '#ffd166', '#fff1d6', '#c7a6ff'];
      rings.forEach((col2, i) => {
        c.fillStyle = col2;
        c.beginPath();
        c.arc(w / 2, h / 2, (w / 2) * (1 - i * 0.13), 0, P * 2);
        c.fill();
      });
      c.fillStyle = '#ef5b6f';
      PT.heart(c, w / 2, h / 2, w * 0.14);
      c.fill();
    });
    rug.rotation.x = -P / 2;
    rug.position.set(-8.2, 0.012, 1.8);
    rug.receiveShadow = true;
    add(rug);
    // bookcase of art books on the left wall
    add(at(box(0.4, 1.2, 3.0, COL.woodLight), X0 + 0.2, 0.6, 1.9));
    const bookCols = ['#ef5b6f', '#3f7bf0', '#ffd166', '#3fbf9f', '#8b5cf6', '#ff9a3c', '#ff8fb1', '#ffffff'];
    for (const y of [0.08, 0.5, 0.92]) {
      add(at(box(0.36, 0.03, 2.9, COL.wood), X0 + 0.22, y, 1.9));
      let z = 0.55;
      let k = Math.round(y * 10);
      while (z < 3.25) {
        const bh = 0.26 + ((k * 7) % 5) * 0.025;
        const bt = 0.05 + ((k * 3) % 3) * 0.015;
        add(at(box(0.26, bh, bt, bookCols[k % bookCols.length]), X0 + 0.24, y + 0.015 + bh / 2, z + bt / 2));
        z += bt + 0.01;
        k++;
      }
    }
    col(X0 + 0.2, 1.9, 0.22, 1.52, 1.22);
    // the low bookcase between the nook and the studio
    add(at(box(0.5, 1.1, 2.7, COL.woodLight), XD, 0.55, -0.05));
    for (const y of [0.06, 0.55]) {
      add(at(box(0.46, 0.03, 2.6, COL.wood), XD, y, -0.05));
      let z = -1.25;
      let k = Math.round(y * 13) + 3;
      while (z < 1.15) {
        const bh = 0.28 + ((k * 7) % 5) * 0.03;
        const bt = 0.05 + ((k * 3) % 3) * 0.015;
        for (const s of [-1, 1]) add(at(box(0.2, bh, bt, bookCols[(k + (s > 0 ? 3 : 0)) % bookCols.length]), XD + s * 0.12, y + 0.015 + bh / 2, z + bt / 2));
        z += bt + 0.012;
        k++;
      }
    }
    add(at(M.makePlant(0.6, COL.sun), XD, 1.1, 0.8));
    add(at(cyl(0.1, 0.12, 0.04, COL.ink, 10), XD, 1.12, -0.9));
    add(at(cyl(0.012, 0.012, 0.35, COL.ink, 5), XD, 1.3, -0.9));
    add(at(mesh(new THREE.CylinderGeometry(0.08, 0.15, 0.16, 14, 1, true), mat(COL.mint, { side: THREE.DoubleSide })), XD, 1.5, -0.9));
    add(at(mesh(new THREE.SphereGeometry(0.05, 8, 6), lampGlow, { cast: false }), XD, 1.45, -0.9));
    col(XD, -0.05, 0.27, 1.37, 1.12);
    // a floor lamp, a side table with cocoa, a stack of books, a beanbag with the studio cat
    add(at(cyl(0.16, 0.18, 0.04, COL.ink, 12), SO.x - 1.5, 0.02, SO.z));
    add(at(cyl(0.02, 0.02, 1.55, COL.ink, 6), SO.x - 1.5, 0.8, SO.z));
    add(at(mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.3, 16, 1, true), mat(COL.sun, { side: THREE.DoubleSide })), SO.x - 1.5, 1.62, SO.z));
    add(at(mesh(new THREE.SphereGeometry(0.07, 10, 8), lampGlow, { cast: false }), SO.x - 1.5, 1.56, SO.z));
    circ(SO.x - 1.5, SO.z, 0.2);
    add(at(cyl(0.26, 0.26, 0.04, COL.woodLight, 16), SO.x + 1.55, 0.55, SO.z));
    add(at(cyl(0.03, 0.03, 0.53, COL.woodDark, 6), SO.x + 1.55, 0.27, SO.z));
    add(at(cyl(0.16, 0.18, 0.03, COL.woodDark, 12), SO.x + 1.55, 0.015, SO.z));
    add(at(cyl(0.05, 0.045, 0.1, COL.rose, 10), SO.x + 1.5, 0.62, SO.z + 0.05));
    add(at(cyl(0.042, 0.042, 0.01, '#8d5532', 10), SO.x + 1.5, 0.67, SO.z + 0.05));
    for (let i = 0; i < 3; i++) add(at(box(0.3 - i * 0.03, 0.05, 0.22, bookCols[i + 2]), SO.x + 1.6, 0.6 + i * 0.05, SO.z - 0.08)).rotation.y = i * 0.3;
    circ(SO.x + 1.55, SO.z, 0.28, 0.58);
    for (let i = 0; i < 4; i++) add(at(box(0.36 - i * 0.02, 0.06, 0.27, bookCols[(i * 3) % 8]), -10.3, 0.03 + i * 0.06, 4.0)).rotation.y = i * 0.25;
    circ(-10.3, 4.0, 0.25, 0.24);
    const bean = at(sph(0.42, COL.teal, undefined, 14), -6.1, 0.24, 2.9);
    bean.scale.set(1.15, 0.6, 1.05);
    add(bean);
    circ(-6.1, 2.9, 0.48, 0.42);
    const cat = M.makeCat('#8a8a9a', '#6c6c7c');
    cat.root.position.set(-6.1, 0.42, 2.85);
    cat.root.rotation.y = 0.6;
    add(cat.root);
    dyn(cat.tail);
    dyn(cat.body);
    R.cat = cat;
    add(at(M.makePlant(1.1, COL.coral), X0 + 0.55, 0, ZF - 0.7));
    circ(X0 + 0.55, ZF - 0.7, 0.22);
    // a small sign over the nook
    const nookSign = atlas.panel(1.4, 0.3, 300, 64, (c, w, h) => {
      c.fillStyle = '#ffe6d6';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      M.roundRect(c, 3, 3, w - 6, h - 6, 22);
      c.fill();
      c.lineWidth = 5;
      c.strokeStyle = COL.coral;
      c.stroke();
      c.fillStyle = '#8c3f22';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `600 ${h * 0.5}px ${M.FONT}`;
      c.fillText('Reading nook', w / 2, h / 2 + 2);
    });
    nookSign.position.set(SO.x, 2.85, 0.12);
    gw.add(nookSign);

    // ---------------------------------------------------------------- welcome mat, plants, bunting
    const EX = L.EXIT;
    add(at(atlas.wrap(new THREE.PlaneGeometry(1.5, 0.8), 300, 160, (c, w, h) => {
      c.fillStyle = '#ff9eb5';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#ef5b6f';
      c.lineWidth = 10;
      M.roundRect(c, 12, 12, w - 24, h - 24, 18);
      c.stroke();
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `700 44px ${M.FONT}`;
      c.fillText('Welcome', w / 2, h / 2 + 3);
    }), EX.x, 0.012, EX.z - 0.1)).rotation.x = -P / 2;
    add(at(M.makePlant(1.2, COL.navy), XD + 0.45, 0, ZF - 0.6));
    circ(XD + 0.45, ZF - 0.6, 0.22);
    add(at(M.makePlant(1.0, COL.sun), X1 - 0.5, 0, ZF - 0.6));
    circ(X1 - 0.5, ZF - 0.6, 0.22);
    // paint-coloured bunting along the top of the studio wall
    const flagGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.13, 0, 0), new THREE.Vector3(0, -0.26, 0), new THREE.Vector3(0.13, 0, 0)]);
    flagGeo.computeVertexNormals();
    flagGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(6), 2));
    const flagMats = M.RAINBOW.map((c) => mat(c, { rough: 0.9, side: THREE.DoubleSide }));
    const bunting = (x0, x1, y, z) => {
      const n = Math.round((x1 - x0) / 0.38);
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        add(at(mesh(flagGeo, flagMats[i % flagMats.length], { cast: false }), x0 + k * (x1 - x0), y, z));
      }
    };
    add(at(rot(cyl(0.006, 0.006, X1 - XD - 0.6, '#ffffff', 4), 0, 0, P / 2), (XD + X1) / 2, HS - 0.12, ZB + 0.08));
    bunting(XD + 0.3, X1 - 0.3, HS - 0.15, ZB + 0.08);

    // ---------------------------------------------------------------- moments: hotspots, the teacher, activities
    addMoments(R);

    // the saved drawings and the mural are shown from the start
    R.refreshGallery();
    R.showMural();
    R.showPortraits();

    // Plain-coloured static furniture becomes a few vertex-coloured meshes
    dynamic.push(...M.colorBake(g, dynamic));

    let night = -1;
    return {
      group: g,
      dynamic,
      colliders,
      hotspots,
      cutaway,
      size: { w: L.W, d: D + 0.6 },
      spawn: { x: EX.x, z: EX.z - 1.4, yaw: P },
      exit: EX,
      background: '#f3dccb',
      onEnter(a) {
        const n = document.body.classList.contains('night-time');
        sky.draw(n);
        night = n ? 1 : 0;
        for (const s of shafts) s.visible = !n;
        lampGlow.emissiveIntensity = n ? 1.6 : 0.6;
        for (const fn of enters) fn(a);
      },
      onExit(a) {
        for (const fn of exits) fn(a);
      },
      update(dt, t, a) {
        if (night === 0) for (const [i, s] of shafts.entries()) s.material.opacity = (i % 2 ? 0.3 : 0.2) + Math.sin(t * 0.4 + i) * 0.05;
        cat.tail.rotation.y = Math.sin(t * 1.1) * 0.45;
        cat.body.scale.y = 0.7 * (1 + Math.sin(t * 1.6) * 0.04);
        for (const fn of updates) fn(dt, t, a);
      },
    };
  },
};
