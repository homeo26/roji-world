// The cosy ski lodge: a log chalet outside, and inside a dollhouse with a gear room, a lounge with
// a crackling fireplace and a little cocoa corner.
import * as THREE from 'three';
import { mat, umat, mesh, canvasTexture, roundRect, FONT, rng } from '../../util.js';
import { builder, labelTex, plankTex, buildSled } from './scenery.js';
import { SNOW, fit, bakeColored } from './kit.js';

export const LODGE = { x: 15.2, z: -5.4, w: 9, d: 6 };

const glass = () => mat('#ffe3ad', { emissive: '#ffbf66', ei: 0.75, rough: 0.25 });

function stoneTex() {
  const t = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8b8f99';
    ctx.fillRect(0, 0, w, h);
    const r = rng(9);
    const cols = ['#b5b9c2', '#a3a8b3', '#c4c6cc', '#9aa0ab', '#b0a89e'];
    for (let row = 0; row < 7; row++) {
      let x = -r() * 30;
      while (x < w) {
        const sw = 34 + r() * 30;
        ctx.fillStyle = cols[Math.floor(r() * cols.length)];
        roundRect(ctx, x + 3, row * 37 + 3, sw - 6, 31, 12);
        ctx.fill();
        x += sw;
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function logTex() {
  const t = canvasTexture(256, 256, (ctx, w, h) => {
    for (let i = 0; i < 6; i++) {
      const y = (i * h) / 6;
      const g = ctx.createLinearGradient(0, y, 0, y + h / 6);
      g.addColorStop(0, '#9c6a44');
      g.addColorStop(0.35, '#d19a67');
      g.addColorStop(0.7, '#c08655');
      g.addColorStop(1, '#7d5235');
      ctx.fillStyle = g;
      ctx.fillRect(0, y, w, h / 6);
    }
    ctx.strokeStyle = 'rgba(90,50,25,0.25)';
    ctx.lineWidth = 2;
    const r = rng(4);
    for (let i = 0; i < 30; i++) {
      const y = r() * h;
      const x = r() * w;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 20 + r() * 40, y + (r() - 0.5) * 3);
      ctx.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ------------------------------------------------------------------ outside
export function buildLodgeExterior(group, colliders, dynamic) {
  const g = new THREE.Group();
  const b = builder(g);
  const { w: W, d: D } = LODGE;
  const base = 0.25;
  const wallH = 2.9;
  const top = base + wallH;
  // Stone base and log walls
  const stoneM = umat('#ffffff', { map: stoneTex(), rough: 0.9 });
  b.box(W + 0.4, base, D + 0.4, stoneM, 0, base / 2, 0);
  const wallTex = plankTex().clone();
  wallTex.needsUpdate = true;
  wallTex.repeat.set(3, 1);
  const wallM = umat('#ffffff', { map: wallTex, rough: 0.85 });
  b.box(W, wallH, D, wallM, 0, base + wallH / 2, 0);
  // Log ends at the corners
  const logEnd = new THREE.CylinderGeometry(0.16, 0.16, 0.5, 10);
  const endM = mat('#d9a877', { rough: 0.8 });
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      for (let i = 0; i < 8; i++) {
        const y = base + 0.18 + i * 0.36;
        const a = mesh(logEnd, endM);
        a.rotation.z = Math.PI / 2;
        a.position.set(sx * (W / 2 + 0.05), y, sz * (D / 2 - 0.12));
        const c = mesh(logEnd, endM);
        c.rotation.x = Math.PI / 2;
        c.position.set(sx * (W / 2 - 0.12), y + 0.18, sz * (D / 2 + 0.05));
        g.add(a, c);
      }
  // Gable roof (ridge from front to back) with a thick snow blanket
  const slope = 0.55;
  const tan = Math.tan(slope);
  const span = W / 2 + 0.7;
  const rise = span * tan;
  const slab = span / Math.cos(slope);
  const roofLen = D + 1.9;
  const roofZ = 0.45;
  const eave = top - 0.4;
  const roofAt = (x) => eave + (span - Math.abs(x)) * tan;
  const roofM = mat('#b8473f', { rough: 0.8 });
  for (const s of [1, -1]) {
    const yc = eave + rise / 2;
    const r = b.box(slab, 0.22, roofLen, roofM, s * (span / 2), yc, roofZ);
    r.rotation.z = -s * slope;
    const sn = b.rbox(slab + 0.12, 0.26, roofLen + 0.15, SNOW, 0.1, s * (span / 2 + Math.sin(slope) * 0.22), yc + Math.cos(slope) * 0.22, roofZ);
    sn.rotation.z = -s * slope;
    // Snow lumps along the eave and icicles under it
    for (let i = 0; i < 9; i++) {
      const lump = b.sph(0.22, SNOW, s * (span - 0.02), eave + 0.12, roofZ - roofLen / 2 + 0.3 + (i * (roofLen - 0.6)) / 8, 10);
      lump.scale.set(0.9, 0.6, 1.4);
    }
    for (let i = 0; i < 12; i++) {
      const len = 0.18 + ((i * 7) % 4) * 0.08;
      const ic = mesh(new THREE.ConeGeometry(0.05, len, 6), mat('#d8f1ff', { rough: 0.2, emissive: '#bfe8ff', ei: 0.15 }), { cast: false });
      ic.rotation.x = Math.PI;
      ic.position.set(s * (span - 0.12), eave - 0.05 - len / 2, roofZ - roofLen / 2 + 0.3 + i * ((roofLen - 0.6) / 11));
      g.add(ic);
    }
  }
  b.box(0.32, 0.32, roofLen + 0.15, SNOW, 0, eave + rise + 0.22, roofZ).rotation.z = Math.PI / 4;
  // Front gable triangle with an attic window and carved trim
  const tri = new THREE.Shape();
  tri.moveTo(-W / 2, 0);
  tri.lineTo(W / 2, 0);
  tri.lineTo(0, (W / 2) * Math.tan(slope));
  tri.closePath();
  const triGeo = new THREE.ShapeGeometry(tri);
  const tuv = triGeo.attributes.uv;
  for (let i = 0; i < tuv.count; i++) tuv.setXY(i, (tuv.getX(i) + W / 2) / (W / 3), tuv.getY(i) / wallH);
  const gable = mesh(triGeo, wallM);
  gable.position.set(0, top, D / 2 + 0.001);
  g.add(gable);
  const back = gable.clone();
  back.position.z = -D / 2 - 0.001;
  back.rotation.y = Math.PI;
  g.add(back);
  const frontZ = roofZ + roofLen / 2;
  for (const s of [1, -1]) {
    const trim = b.box(slab, 0.18, 0.12, '#fff3e0', s * (span / 2), eave + rise / 2 - 0.17, frontZ - 0.02);
    trim.rotation.z = -s * slope;
    for (let i = 0; i < 8; i++) {
      const x = ((i + 0.5) / 8) * span;
      const sc = mesh(new THREE.CircleGeometry(0.13, 10, 0, Math.PI), mat('#fff3e0', { side: THREE.DoubleSide }), { cast: false });
      sc.position.set(s * x, roofAt(x) - 0.3, frontZ - 0.01);
      sc.rotation.z = Math.PI - s * slope;
      g.add(sc);
    }
  }
  const atticY = top + 1.15;
  b.cyl(0.52, 0.52, 0.1, '#fff3e0', 0, atticY, D / 2 + 0.03, 24).rotation.x = Math.PI / 2;
  b.cyl(0.42, 0.42, 0.12, glass(), 0, atticY, D / 2 + 0.05, 24).rotation.x = Math.PI / 2;
  b.box(0.07, 0.84, 0.06, '#fff3e0', 0, atticY, D / 2 + 0.12);
  b.box(0.84, 0.07, 0.06, '#fff3e0', 0, atticY, D / 2 + 0.12);

  // Front door with a wreath, two glowing windows with shutters and flower boxes
  const fz = D / 2;
  b.rbox(1.5, 2.25, 0.12, '#fff3e0', 0.05, 0, base + 1.1, fz + 0.02);
  b.rbox(1.3, 2.1, 0.14, '#8f4a2e', 0.06, 0, base + 1.05, fz + 0.05);
  for (const dx of [-0.32, 0.32]) b.rbox(0.48, 0.8, 0.05, '#a65a38', 0.04, dx, base + 0.62, fz + 0.12);
  b.cyl(0.18, 0.18, 0.05, glass(), 0, base + 1.65, fz + 0.12, 18).rotation.x = Math.PI / 2;
  b.sph(0.06, '#f4c24f', 0.48, base + 1.0, fz + 0.15, 10, { metal: 0.6, rough: 0.3 });
  const wreath = mesh(new THREE.TorusGeometry(0.26, 0.08, 8, 18), mat('#3f8a5a', { rough: 0.9 }));
  wreath.position.set(0, base + 2.62, fz + 0.1);
  g.add(wreath);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.sph(0.04, '#e5484d', Math.cos(a) * 0.26, base + 2.62 + Math.sin(a) * 0.26, fz + 0.17, 6);
  }
  b.sph(0.07, '#ef5b6f', 0, base + 2.36, fz + 0.17, 8).scale.set(1.6, 0.8, 0.6);
  for (const sx of [-1, 1]) {
    const x = sx * 2.65;
    const y = base + 1.45;
    b.rbox(1.45, 1.2, 0.1, '#fff3e0', 0.04, x, y, fz + 0.02);
    b.box(1.25, 1.0, 0.05, glass(), x, y, fz + 0.06);
    b.box(0.06, 1.0, 0.07, '#fff3e0', x, y, fz + 0.09);
    b.box(1.25, 0.06, 0.07, '#fff3e0', x, y, fz + 0.09);
    for (const s of [-1, 1]) {
      b.rbox(0.36, 1.15, 0.06, sx < 0 ? '#ef7f93' : '#4fb7c5', 0.03, x + s * 0.93, y, fz + 0.05);
      b.box(0.2, 0.05, 0.03, '#fff3e0', x + s * 0.93, y + 0.25, fz + 0.09);
      b.box(0.2, 0.05, 0.03, '#fff3e0', x + s * 0.93, y - 0.25, fz + 0.09);
    }
    b.rbox(1.4, 0.24, 0.3, '#a65a38', 0.04, x, y - 0.72, fz + 0.18);
    b.rbox(1.42, 0.12, 0.32, SNOW, 0.05, x, y - 0.58, fz + 0.18);
    for (let i = 0; i < 6; i++) b.sph(0.05, i % 2 ? '#e5484d' : '#3f8a5a', x - 0.55 + i * 0.22, y - 0.5, fz + 0.24, 6);
  }
  // Side windows (glow only)
  for (const sx of [-1, 1]) {
    b.box(0.05, 1.0, 1.3, glass(), sx * (W / 2 + 0.02), base + 1.45, -0.3);
    b.box(0.08, 1.15, 0.07, '#fff3e0', sx * (W / 2 + 0.04), base + 1.45, -0.3);
  }
  // Sign over the door
  const sign = labelTex('Cosy Lodge', { sub: 'Hot cocoa inside', w: 640, h: 200, edge: '#8f4a2e', subInk: '#ef5b6f' });
  b.rbox(2.6, 0.78, 0.1, '#8f4a2e', 0.05, 0, top + 0.42, fz + 0.12);
  b.plane(2.48, 0.68, sign, 0, top + 0.42, fz + 0.18, { emissive: '#ffffff', emissiveMap: sign, emissiveIntensity: 0.12 });
  // Chimney with smoke
  const cx = -2.4;
  const cz = -0.8;
  const chimTop = roofAt(cx) + 1.3;
  b.box(0.9, chimTop - top, 0.9, stoneM, cx, (chimTop + top) / 2, cz);
  b.rbox(1.05, 0.28, 1.05, SNOW, 0.1, cx, chimTop + 0.1, cz);
  // Porch: a deck you step onto, posts, lanterns and a bench
  const deckH = 0.24;
  const deckZ = fz + 0.75;
  b.box(6.6, deckH, 1.5, '#b0784c', 0, deckH / 2, deckZ);
  for (let i = 0; i < 11; i++) b.box(0.03, 0.01, 1.5, '#8a5a3c', -3.0 + i * 0.6, deckH + 0.004, deckZ);
  b.box(2.0, 0.12, 0.5, '#b0784c', 0, 0.06, fz + 1.75);
  for (const s of [-1, 1]) {
    const postH = roofAt(3.15) - deckH;
    b.box(0.16, postH, 0.16, '#8a5a3c', s * 3.15, deckH + postH / 2, deckZ + 0.6);
    b.box(0.18, 0.12, 0.18, '#40594d', s * 1.3, deckH + 1.95, fz + 0.12);
    b.add(mesh(new THREE.SphereGeometry(0.12, 12, 8), mat('#fff1c7', { emissive: '#ffd27a', ei: 1.4, rough: 0.3 }), { cast: false }), s * 1.3, deckH + 1.78, fz + 0.2);
    // Railings beside the steps
    b.box(0.08, 0.7, 0.08, '#8a5a3c', s * 1.1, deckH + 0.35, deckZ + 0.7);
    b.box(1.95, 0.08, 0.08, '#8a5a3c', s * 2.12, deckH + 0.68, deckZ + 0.7);
    b.box(1.95, 0.06, 0.12, SNOW, s * 2.12, deckH + 0.74, deckZ + 0.7);
  }
  // Skis leaning by the door, a sled on the porch
  [['#ef5b6f', -1.15], ['#4aa3df', -0.98]].forEach(([c, dx]) => {
    const ski = b.box(0.09, 1.5, 0.03, c, dx - 0.4, deckH + 0.75, fz + 0.18);
    ski.rotation.x = -0.12;
  });
  buildSled(g, 2.2, deckZ - 0.1, -0.3, '#4fb7c5').position.y = deckH;

  g.position.set(LODGE.x, 0, LODGE.z);
  group.add(g);

  // Cocoa sign (A-board) by the steps
  const board = canvasTexture(256, 300, (c, w, h) => {
    c.fillStyle = '#3b3f44';
    roundRect(c, 4, 4, w - 8, h - 8, 22);
    c.fill();
    c.lineWidth = 10;
    c.strokeStyle = '#c98a5a';
    c.stroke();
    c.textAlign = 'center';
    c.fillStyle = '#fff7ea';
    c.font = `700 52px ${FONT}`;
    c.fillText('Hot', w / 2, 78);
    c.fillText('Cocoa', w / 2, 134);
    c.fillStyle = '#ffd166';
    c.font = `600 30px ${FONT}`;
    c.fillText('with', w / 2, 188);
    c.fillText('marshmallows', w / 2, 224);
    c.fillStyle = '#ff9eb5';
    c.beginPath();
    c.moveTo(w / 2, 272);
    c.bezierCurveTo(w / 2 - 22, 256, w / 2 - 14, 238, w / 2, 248);
    c.bezierCurveTo(w / 2 + 14, 238, w / 2 + 22, 256, w / 2, 272);
    c.fill();
  });
  const ab = new THREE.Group();
  const abb = builder(ab);
  for (const s of [1, -1]) {
    const leg = abb.rbox(0.62, 0.9, 0.05, '#9b6a43', 0.03, 0, 0.45, s * 0.14);
    leg.rotation.x = s * 0.18;
  }
  const face = abb.plane(0.52, 0.62, board, 0, 0.48, 0.2);
  face.rotation.x = -0.18;
  ab.position.set(LODGE.x - 2.2, 0, LODGE.z + D / 2 + 2.3);
  ab.rotation.y = 0.35;
  group.add(ab);

  // Chimney smoke puffs
  const smokeTex = canvasTexture(64, 64, (ctx) => {
    const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 64, 64);
  });
  const puffs = [];
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, color: '#f2f4f8' }));
    group.add(s);
    dynamic.push(s);
    puffs.push({ s, ph: i / 6 });
  }
  const smokeAt = new THREE.Vector3(LODGE.x + cx, chimTop + 0.3, LODGE.z + cz);

  colliders.push(
    { type: 'box', x: LODGE.x, z: LODGE.z, hw: W / 2 + 0.25, hd: D / 2 + 0.2 },
    { type: 'box', x: LODGE.x, z: LODGE.z + deckZ, hw: 3.3, hd: 0.75, h: deckH },
    { type: 'circle', x: LODGE.x - 3.15, z: LODGE.z + deckZ + 0.6, r: 0.14 },
    { type: 'circle', x: LODGE.x + 3.15, z: LODGE.z + deckZ + 0.6, r: 0.14 },
    { type: 'box', x: LODGE.x - 2.12, z: LODGE.z + deckZ + 0.7, hw: 1.0, hd: 0.06 },
    { type: 'box', x: LODGE.x + 2.12, z: LODGE.z + deckZ + 0.7, hw: 1.0, hd: 0.06 },
    { type: 'circle', x: LODGE.x - 2.2, z: LODGE.z + D / 2 + 2.3, r: 0.32 },
  );
  return {
    door: { x: LODGE.x, z: LODGE.z + fz + 0.75 },
    update(dt, t) {
      for (const p of puffs) {
        const k = (t * 0.22 + p.ph) % 1;
        p.s.position.set(smokeAt.x + Math.sin(k * 5 + p.ph * 9) * 0.3 + k * 0.8, smokeAt.y + k * 3.2, smokeAt.z);
        p.s.scale.setScalar(0.5 + k * 1.4);
        p.s.material.opacity = 0.6 * Math.sin(k * Math.PI);
      }
    },
  };
}

// ------------------------------------------------------------------ inside
export const lodgeInterior = {
  title: 'Cosy Lodge',
  build(ctx) {
    const { props, api } = ctx;
    const root = new THREE.Group();
    const b = builder(root);
    const dynamic = [];
    const colliders = [];
    const W = 22;
    const D = 10;
    const WH = 3.6;

    // Dollhouse shell: base, floor, back and side walls, two cut-away dividers
    b.box(W + 0.6, 0.6, D + 0.6, umat('#ffffff', { map: stoneTex(), rough: 0.9 }), 0, -0.3, 0);
    const floorTex = canvasTexture(256, 256, (c, w, h) => {
      const cols = ['#d9a36d', '#cf9761', '#e0ad79', '#c98f5b'];
      for (let i = 0; i < 8; i++) {
        c.fillStyle = cols[i % 4];
        c.fillRect((i * w) / 8, 0, w / 8, h);
        c.fillStyle = 'rgba(110,60,30,0.3)';
        c.fillRect((i * w) / 8, 0, 2, h);
        c.fillRect((i * w) / 8, ((i * 37) % 8) * 32, w / 8, 2);
      }
    });
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(7, 3);
    b.box(W, 0.06, D, umat('#ffffff', { map: floorTex, rough: 0.8 }), 0, 0, 0);
    const wallTex = logTex();
    wallTex.repeat.set(5, 1);
    const wallM = umat('#ffffff', { map: wallTex, rough: 0.85 });
    b.box(W + 0.3, WH, 0.3, wallM, 0, WH / 2, -D / 2 - 0.15);
    const sideTex = logTex();
    sideTex.repeat.set(2.5, 1);
    const sideM = umat('#ffffff', { map: sideTex, rough: 0.85 });
    for (const s of [-1, 1]) b.box(0.3, WH, D + 0.3, sideM, s * (W / 2 + 0.15), WH / 2, -0.0);
    const beam = mat('#7d5235', { rough: 0.8 });
    b.box(W + 0.4, 0.26, 0.42, beam, 0, WH + 0.05, -D / 2 - 0.1);
    for (const s of [-1, 1]) b.box(0.42, 0.26, D + 0.4, beam, s * (W / 2 + 0.1), WH + 0.05, 0);
    b.box(W + 0.62, 0.12, 0.2, '#fff3e0', 0, 0.02, D / 2 + 0.22);
    const divTex = logTex();
    divTex.repeat.set(1.2, 1);
    const divM = umat('#ffffff', { map: divTex, rough: 0.85 });
    const dividers = [
      { x: -4, z0: -D / 2, z1: -0.4 },
      { x: 6.2, z0: -D / 2, z1: -1.4 },
    ];
    for (const dv of dividers) {
      const len = dv.z1 - dv.z0;
      b.box(0.24, 3.2, len, divM, dv.x, 1.6, (dv.z0 + dv.z1) / 2);
      b.box(0.34, 0.16, len + 0.05, beam, dv.x, 3.25, (dv.z0 + dv.z1) / 2);
      b.cyl(0.14, 0.14, 3.3, beam, dv.x, 1.65, dv.z1, 10);
      colliders.push({ type: 'box', x: dv.x, z: (dv.z0 + dv.z1) / 2, hw: 0.14, hd: len / 2 });
    }
    colliders.push(
      { type: 'box', x: 0, z: -D / 2 - 0.15, hw: W / 2 + 0.3, hd: 0.2 },
      { type: 'box', x: -W / 2 - 0.15, z: 0, hw: 0.2, hd: D / 2 + 0.3 },
      { type: 'box', x: W / 2 + 0.15, z: 0, hw: 0.2, hd: D / 2 + 0.3 },
      { type: 'box', x: 0, z: D / 2 + 0.3, hw: W / 2 + 0.3, hd: 0.2 },
    );
    // Bunting along the back wall
    const flagCols = ['#ef5b6f', '#ffd166', '#4fb7c5', '#ff9eb5', '#7fd3a7'];
    for (let i = 0; i < 30; i++) {
      const x = -W / 2 + 0.6 + i * ((W - 1.2) / 29);
      const sag = Math.sin(((i % 10) / 9) * Math.PI) * 0.22;
      const f = mesh(new THREE.ConeGeometry(0.13, 0.28, 3), mat(flagCols[i % 5]), { cast: false });
      f.rotation.set(Math.PI, 0, 0);
      f.position.set(x, WH - 0.32 - sag, -D / 2 + 0.06);
      f.scale.z = 0.2;
      root.add(f);
    }

    // Snowy windows (painted)
    const view = canvasTexture(256, 192, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#9fc9ea');
      gr.addColorStop(1, '#e8f4fb');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.moveTo(0, h * 0.75);
      c.lineTo(w * 0.3, h * 0.35);
      c.lineTo(w * 0.55, h * 0.62);
      c.lineTo(w * 0.78, h * 0.3);
      c.lineTo(w, h * 0.6);
      c.lineTo(w, h);
      c.lineTo(0, h);
      c.fill();
      c.fillStyle = '#4a9a63';
      for (const [x, s] of [[30, 1], [70, 0.7], [200, 0.9], [230, 0.6]]) {
        c.beginPath();
        c.moveTo(x, h - 20 - 60 * s);
        c.lineTo(x - 20 * s, h - 20);
        c.lineTo(x + 20 * s, h - 20);
        c.fill();
      }
      c.fillStyle = '#ffffff';
      const r = rng(2);
      for (let i = 0; i < 60; i++) {
        c.beginPath();
        c.arc(r() * w, r() * h, 1.5 + r() * 2, 0, 6.3);
        c.fill();
      }
    });
    const windowAt = (x, y, z, w, h, ry = 0) => {
      const wg = new THREE.Group();
      const wb = builder(wg);
      wb.rbox(w + 0.22, h + 0.22, 0.1, '#fff3e0', 0.04, 0, 0, 0);
      wb.plane(w, h, view, 0, 0, 0.06, { emissive: '#ffffff', emissiveMap: view, emissiveIntensity: 0.35 });
      wb.box(0.06, h, 0.05, '#fff3e0', 0, 0, 0.09);
      wb.box(w, 0.06, 0.05, '#fff3e0', 0, 0, 0.09);
      wb.rbox(w + 0.34, 0.1, 0.24, '#fff3e0', 0.03, 0, -h / 2 - 0.12, 0.1);
      wg.position.set(x, y, z);
      wg.rotation.y = ry;
      root.add(wg);
    };

    // ---------------------------------------------------------- gear room (left)
    const gx = -7.5;
    b.box(5.4, 0.12, 0.2, '#8a5a3c', gx, 1.55, -D / 2 + 0.12);
    const skiCols = ['#ef5b6f', '#4aa3df', '#ffd166', '#7fd3a7', '#c7a6ff', '#ff9eb5'];
    skiCols.forEach((c, i) => {
      for (const dx of [-0.06, 0.06]) {
        const ski = b.box(0.09, 1.7, 0.03, c, gx - 2.3 + i * 0.72 + dx, 0.9, -D / 2 + 0.3);
        ski.rotation.x = -0.12;
        const tip = b.box(0.09, 0.16, 0.03, c, gx - 2.3 + i * 0.72 + dx, 1.8, -D / 2 + 0.17);
        tip.rotation.x = -0.75;
      }
      b.cyl(0.012, 0.012, 1.1, '#c9d2dc', gx - 2.05 + i * 0.72, 0.6, -D / 2 + 0.34, 5).rotation.x = -0.1;
    });
    const board = b.rbox(0.36, 1.5, 0.05, '#ff7fa3', 0.15, gx + 2.4, 0.78, -D / 2 + 0.28);
    board.rotation.x = -0.12;
    b.box(0.3, 0.3, 0.06, '#ffd166', gx + 2.4, 1.0, -D / 2 + 0.33).rotation.z = 0.785;
    // Sleds hanging on the wall
    for (const [dx, c] of [[-1.3, '#ef5b6f'], [1.2, '#4fb7c5']]) {
      const s = buildSled(root, gx + dx, 2.45, 0, c);
      s.rotation.x = -Math.PI / 2;
      s.position.set(gx + dx, 2.5, -D / 2 + 0.3);
    }
    // Boot bench with little boots underneath
    b.rbox(3.2, 0.1, 0.55, '#c98a5a', 0.03, gx, 0.45, -3.6);
    for (const s of [-1.4, 0, 1.4]) b.box(0.1, 0.42, 0.45, '#8a5a3c', gx + s, 0.21, -3.6);
    ['#ef5b6f', '#3b2b3f', '#4aa3df', '#ffd166'].forEach((c, i) => {
      for (const dx of [-0.09, 0.09]) {
        b.rbox(0.15, 0.2, 0.26, c, 0.05, gx - 1.1 + i * 0.7 + dx, 0.1, -3.45);
        b.rbox(0.13, 0.2, 0.13, c, 0.05, gx - 1.1 + i * 0.7 + dx, 0.25, -3.52);
      }
    });
    b.rbox(0.9, 0.1, 0.5, '#ff9eb5', 0.04, gx + 0.6, 0.55, -3.62);
    colliders.push({ type: 'box', x: gx, z: -3.6, hw: 1.62, hd: 0.3, h: 0.5 });
    colliders.push({ type: 'box', x: gx, z: -D / 2 + 0.3, hw: 2.8, hd: 0.3 });
    // Lockers on the side wall
    const lockerCols = ['#4fb7c5', '#ef7f93', '#4fb7c5', '#ef7f93'];
    lockerCols.forEach((c, i) => {
      const z = -3.2 + i * 0.95;
      b.rbox(0.6, 2.1, 0.9, c, 0.04, -W / 2 + 0.32, 1.05, z);
      b.box(0.02, 0.05, 0.5, '#ffffff', -W / 2 + 0.63, 1.7, z);
      b.box(0.02, 0.05, 0.5, '#ffffff', -W / 2 + 0.63, 1.58, z);
      b.sph(0.04, '#f4c24f', -W / 2 + 0.64, 1.1, z + 0.32, 8, { metal: 0.6, rough: 0.3 });
    });
    const heart = canvasTexture(128, 128, (c) => {
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.moveTo(64, 104);
      c.bezierCurveTo(8, 66, 20, 14, 64, 40);
      c.bezierCurveTo(108, 14, 120, 66, 64, 104);
      c.fill();
    });
    lockerCols.forEach((c, i) => {
      const hp = mesh(new THREE.PlaneGeometry(0.26, 0.26), new THREE.MeshStandardMaterial({ map: heart, transparent: true, roughness: 0.6 }), { cast: false });
      hp.rotation.y = Math.PI / 2;
      hp.position.set(-W / 2 + 0.63, 0.75, -3.2 + i * 0.95);
      root.add(hp);
      dynamic.push(hp);
    });
    colliders.push({ type: 'box', x: -W / 2 + 0.32, z: -1.78, hw: 0.32, hd: 1.9 });
    // Hooks with jackets and scarves on the divider
    ['#ffd166', '#ef5b6f', '#7fd3a7'].forEach((c, i) => {
      const z = -4.3 + i * 1.2;
      b.cyl(0.02, 0.02, 0.2, '#5b6977', -4.22, 2.2, z, 5).rotation.z = Math.PI / 2;
      const coat = b.add(mesh(new THREE.CapsuleGeometry(0.22, 0.55, 4, 10), mat(c, { rough: 0.9 })), -4.38, 1.72, z);
      coat.scale.set(0.55, 1, 1);
      b.sph(0.12, c === '#ffd166' ? '#4aa3df' : '#ffffff', -4.4, 2.12, z, 10);
    });
    // Rug and a sign
    const rugTex = canvasTexture(256, 256, (c, w, h) => {
      c.fillStyle = '#4fb7c5';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#ffffff';
      c.lineWidth = 10;
      for (let i = 0; i < 6; i++) c.strokeRect(14 + i * 20, 14 + i * 20, w - 28 - i * 40, h - 28 - i * 40);
    });
    const rug1 = mesh(new THREE.PlaneGeometry(3.4, 2.4), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 }), { cast: false });
    rug1.rotation.x = -Math.PI / 2;
    rug1.position.set(gx, 0.035, -0.6);
    root.add(rug1);
    const gearSign = labelTex('Gear Room', { w: 512, h: 140, edge: '#4fb7c5' });
    b.plane(1.7, 0.46, gearSign, gx, 2.95, -D / 2 + 0.02);

    // ---------------------------------------------------------- lounge (middle): fireplace, sofa, tree
    const fx = -0.6;
    const fzB = -D / 2;
    const stoneM = umat('#ffffff', { map: stoneTex(), rough: 0.9 });
    stoneM.map.repeat.set(2, 2.4);
    b.box(2.9, WH, 0.85, stoneM, fx, WH / 2, fzB + 0.42);
    b.rbox(1.7, 1.25, 0.1, '#2a1a14', 0.08, fx, 0.75, fzB + 0.86);
    const arch = mesh(new THREE.CircleGeometry(0.85, 20, 0, Math.PI), mat('#2a1a14'), { cast: false });
    arch.position.set(fx, 1.37, fzB + 0.92);
    arch.scale.set(1, 0.42, 1);
    root.add(arch);
    b.box(3.4, 0.14, 0.8, '#9aa0ab', fx, 0.07, fzB + 1.2);
    colliders.push({ type: 'box', x: fx, z: fzB + 0.45, hw: 1.5, hd: 0.5 });
    colliders.push({ type: 'box', x: fx, z: fzB + 1.2, hw: 1.7, hd: 0.4, h: 0.14 });
    // Logs and flames
    for (const [dx, ry] of [[-0.25, 0.4], [0.25, -0.4], [0, 0]]) {
      const log = b.cyl(0.09, 0.09, 0.9, '#7a4a2a', fx + dx * 0.4, 0.28 + (ry === 0 ? 0.12 : 0), fzB + 0.98, 8);
      log.rotation.set(0, ry, Math.PI / 2);
    }
    const flameOuter = new THREE.MeshBasicMaterial({ color: '#ff7a33' });
    const flameInner = new THREE.MeshBasicMaterial({ color: '#ffd166' });
    const flames = [];
    for (let i = 0; i < 5; i++) {
      const outer = mesh(new THREE.ConeGeometry(0.16, 0.6, 8), flameOuter, { cast: false, receive: false });
      const inner = mesh(new THREE.ConeGeometry(0.09, 0.38, 8), flameInner, { cast: false, receive: false });
      inner.position.set(0, -0.07, 0.05);
      outer.add(inner);
      outer.position.set(fx - 0.42 + i * 0.21, 0.62, fzB + 0.98 + (i % 2) * 0.06);
      root.add(outer);
      dynamic.push(outer);
      flames.push({ m: outer, ph: i * 1.7, s: 0.8 + (i % 3) * 0.2 });
    }
    const glowTex = canvasTexture(64, 64, (c) => {
      const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,180,90,0.9)');
      gr.addColorStop(1, 'rgba(255,140,60,0)');
      c.fillStyle = gr;
      c.fillRect(0, 0, 64, 64);
    });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.set(fx, 0.75, fzB + 1.3);
    glow.scale.set(2.6, 1.8, 1);
    root.add(glow);
    dynamic.push(glow);
    const embers = [];
    for (let i = 0; i < 8; i++) {
      const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffcf70' }));
      e.scale.setScalar(0.08);
      root.add(e);
      dynamic.push(e);
      embers.push({ e, ph: i / 8, dx: (Math.random() - 0.5) * 0.7 });
    }
    const fire = new THREE.PointLight('#ff9a4a', 9, 11, 1.6);
    fire.position.set(fx, 1.0, fzB + 1.7);
    fire.visible = false;
    root.add(fire);
    dynamic.push(fire);
    // Mantel with candles, a photo of Roji and Homama, stockings and a garland
    b.rbox(3.2, 0.14, 0.45, '#7d5235', 0.03, fx, 1.82, fzB + 0.95);
    for (const dx of [-1.25, 1.25]) {
      b.cyl(0.06, 0.06, 0.26, '#fff3e0', fx + dx, 2.02, fzB + 0.98, 10);
      b.add(mesh(new THREE.SphereGeometry(0.035, 8, 6), mat('#ffd166', { emissive: '#ffb347', ei: 2 })), fx + dx, 2.19, fzB + 0.98);
    }
    const photo = canvasTexture(256, 200, (c, w, h) => {
      c.fillStyle = '#bfe3f0';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.fillRect(0, h * 0.72, w, h);
      const face = (x, skin, hair, top) => {
        c.fillStyle = top;
        c.beginPath();
        c.ellipse(x, h * 0.86, 34, 30, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = skin;
        c.beginPath();
        c.arc(x, h * 0.5, 34, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = hair;
        c.beginPath();
        c.arc(x, h * 0.45, 36, Math.PI, 0);
        c.fill();
        c.fillStyle = '#1d130f';
        c.beginPath();
        c.arc(x - 11, h * 0.52, 4, 0, 6.3);
        c.arc(x + 11, h * 0.52, 4, 0, 6.3);
        c.fill();
        c.strokeStyle = '#b23a48';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(x, h * 0.57, 9, 0.2, Math.PI - 0.2);
        c.stroke();
      };
      face(w * 0.34, '#f8dccb', '#2a1a13', '#ef5b6f');
      face(w * 0.66, '#f6d8c6', '#141010', '#3f7bf0');
      c.fillStyle = '#ff6b8a';
      c.beginPath();
      c.moveTo(w / 2, 62);
      c.bezierCurveTo(w / 2 - 26, 40, w / 2 - 16, 16, w / 2, 30);
      c.bezierCurveTo(w / 2 + 16, 16, w / 2 + 26, 40, w / 2, 62);
      c.fill();
    });
    b.rbox(0.62, 0.52, 0.06, '#f4c24f', 0.03, fx - 0.55, 2.17, fzB + 0.86);
    b.plane(0.52, 0.42, photo, fx - 0.55, 2.17, fzB + 0.9);
    b.rbox(0.36, 0.4, 0.14, '#7d5235', 0.05, fx + 0.6, 2.09, fzB + 0.95);
    b.cyl(0.12, 0.12, 0.02, '#fff7ea', fx + 0.6, 2.13, fzB + 1.03, 16).rotation.x = Math.PI / 2;
    [['#ef5b6f', -0.75], ['#3f7bf0', 0.75]].forEach(([c, dx]) => {
      b.rbox(0.24, 0.42, 0.08, c, 0.05, fx + dx, 1.5, fzB + 1.19);
      b.rbox(0.36, 0.14, 0.09, c, 0.05, fx + dx + 0.07, 1.27, fzB + 1.19);
      b.rbox(0.28, 0.11, 0.1, '#ffffff', 0.04, fx + dx, 1.7, fzB + 1.2);
    });
    const garlandCols = ['#ffd166', '#ef5b6f', '#8fd8ff'];
    for (let i = 0; i < 14; i++) {
      const x = fx - 1.55 + i * (3.1 / 13);
      b.sph(0.09, '#3f8a5a', x, 1.92 - Math.sin((i / 13) * Math.PI) * 0.12, fzB + 1.16, 8);
      if (i % 2) b.add(mesh(new THREE.SphereGeometry(0.035, 6, 5), mat(garlandCols[i % 3], { emissive: garlandCols[i % 3], ei: 1.2 }), { cast: false }), x, 1.86 - Math.sin((i / 13) * Math.PI) * 0.12, fzB + 1.24);
    }
    // Painting above the mantel
    const painting = canvasTexture(320, 220, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#ffb3a7');
      gr.addColorStop(0.6, '#ffe3c2');
      gr.addColorStop(1, '#ffffff');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#c8d8ec';
      c.beginPath();
      c.moveTo(0, h);
      c.lineTo(90, 80);
      c.lineTo(160, 150);
      c.lineTo(230, 60);
      c.lineTo(w, h);
      c.fill();
      c.fillStyle = '#ffffff';
      for (const [x, y] of [[90, 80], [230, 60]]) {
        c.beginPath();
        c.moveTo(x - 30, y + 34);
        c.lineTo(x, y);
        c.lineTo(x + 30, y + 34);
        c.fill();
      }
      c.fillStyle = '#ff6b8a';
      c.beginPath();
      c.moveTo(160, 66);
      c.bezierCurveTo(132, 44, 142, 18, 160, 32);
      c.bezierCurveTo(178, 18, 188, 44, 160, 66);
      c.fill();
    });
    b.rbox(1.45, 1.05, 0.08, '#c98a5a', 0.04, fx, 2.92, fzB + 0.88);
    b.plane(1.3, 0.9, painting, fx, 2.92, fzB + 0.93);
    // Sofa against the back wall
    const sx = 3.2;
    const sz = -4.05;
    const sofaM = mat('#d6625a', { rough: 0.85 });
    b.rbox(2.6, 0.42, 0.95, sofaM, 0.14, sx, 0.29, sz);
    b.rbox(2.6, 0.9, 0.3, sofaM, 0.14, sx, 0.8, sz - 0.42);
    for (const s of [-1, 1]) b.rbox(0.3, 0.62, 1.0, sofaM, 0.12, sx + s * 1.3, 0.48, sz);
    [['#fff3dc', -0.85, 0.15], ['#8fd8ff', 0.85, -0.15]].forEach(([c, dx, rz]) => {
      const p = b.rbox(0.5, 0.45, 0.16, c, 0.12, sx + dx, 0.75, sz - 0.24);
      p.rotation.z = rz;
    });
    const knit = canvasTexture(64, 64, (c) => {
      c.fillStyle = '#f6c86b';
      c.fillRect(0, 0, 64, 64);
      c.strokeStyle = '#e9b04f';
      c.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        c.beginPath();
        c.moveTo(i * 8, 0);
        c.lineTo(i * 8 + 4, 64);
        c.stroke();
      }
    });
    knit.wrapS = knit.wrapT = THREE.RepeatWrapping;
    knit.repeat.set(3, 2);
    b.rbox(0.9, 0.95, 0.36, new THREE.MeshStandardMaterial({ map: knit, roughness: 1 }), 0.12, sx + 0.55, 0.86, sz - 0.36);
    colliders.push({ type: 'box', x: sx, z: sz - 0.05, hw: 1.45, hd: 0.55, h: 0.5 });
    windowAt(sx, 2.35, -D / 2 + 0.04, 1.6, 0.95);
    // Coffee table with cookies and a cocoa pot
    const tx = sx;
    const tz = -2.7;
    b.cyl(0.55, 0.55, 0.06, '#c49464', tx, 0.44, tz, 24);
    b.cyl(0.07, 0.09, 0.42, '#7d5235', tx, 0.21, tz, 10);
    b.cyl(0.26, 0.28, 0.03, '#7d5235', tx, 0.015, tz, 16);
    b.cyl(0.2, 0.18, 0.03, '#ffffff', tx - 0.18, 0.485, tz + 0.05, 18);
    for (let i = 0; i < 5; i++) b.cyl(0.055, 0.055, 0.022, '#d9a05b', tx - 0.18 + Math.cos(i * 1.3) * 0.1, 0.51 + (i % 2) * 0.01, tz + 0.05 + Math.sin(i * 1.3) * 0.1, 12);
    const pot = b.sph(0.13, '#d9824e', tx + 0.2, 0.58, tz - 0.08, 14, { metal: 0.5, rough: 0.35 });
    pot.scale.y = 0.9;
    b.cyl(0.05, 0.07, 0.07, '#d9824e', tx + 0.2, 0.72, tz - 0.08, 10, { metal: 0.5, rough: 0.35 });
    b.cone(0.03, 0.18, '#d9824e', tx + 0.34, 0.62, tz - 0.08, 6).rotation.z = -1.0;
    colliders.push({ type: 'circle', x: tx, z: tz, r: 0.58, h: 0.47 });
    // Armchair by the fire
    const ax = -3.0;
    const az = -3.1;
    const armM = mat('#4fb7c5', { rough: 0.85 });
    const chair = new THREE.Group();
    const cb = builder(chair);
    cb.rbox(1.0, 0.42, 0.9, armM, 0.14, 0, 0.29, 0);
    cb.rbox(1.0, 0.85, 0.26, armM, 0.12, 0, 0.78, -0.38);
    for (const s of [-1, 1]) cb.rbox(0.22, 0.6, 0.92, armM, 0.1, s * 0.5, 0.45, 0);
    cb.rbox(0.62, 0.12, 0.6, '#fff3dc', 0.05, 0, 0.55, 0.05);
    chair.position.set(ax, 0, az);
    chair.rotation.y = 0.55;
    root.add(chair);
    colliders.push({ type: 'circle', x: ax, z: az, r: 0.62, h: 0.52 });
    // Round rug and floor cushions in front of the fire
    const rug2 = canvasTexture(256, 256, (c, w) => {
      for (let i = 0; i < 7; i++) {
        c.fillStyle = ['#fff3e0', '#ef7f93', '#fff3e0', '#f6c86b', '#fff3e0', '#ef7f93', '#fff3e0'][i];
        c.beginPath();
        c.arc(w / 2, w / 2, w / 2 - i * 18, 0, Math.PI * 2);
        c.fill();
      }
    });
    const rug = mesh(new THREE.CircleGeometry(1.45, 32), new THREE.MeshStandardMaterial({ map: rug2, roughness: 1 }), { cast: false });
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(fx, 0.035, -2.4);
    root.add(rug);
    for (const [dx, c] of [[-0.5, '#ff9eb5'], [0.5, '#8fd8ff']]) b.rbox(0.62, 0.14, 0.62, c, 0.06, fx + dx, 0.1, -2.3);
    // A little decorated pine with twinkling lights and gifts
    const tree = new THREE.Group();
    const tb = builder(tree);
    tb.cyl(0.25, 0.3, 0.35, '#c0533a', 0, 0.17, 0, 12);
    [[0.75, 0.9, 0.6], [0.6, 0.8, 1.15], [0.42, 0.7, 1.65]].forEach(([r, h, y]) => tb.cone(r, h, '#3f8a5a', 0, y, 0, 10));
    const star = tb.add(mesh(new THREE.OctahedronGeometry(0.14), mat('#ffd166', { emissive: '#ffb347', ei: 1.2 })), 0, 2.12, 0);
    star.scale.set(1, 1, 0.5);
    const twinkle = ['#ffd166', '#ff8fb1', '#8fd8ff'].map((c) => umat(c, { emissive: c, ei: 1.2 }));
    for (let i = 0; i < 18; i++) {
      const y = 0.55 + (i / 18) * 1.4;
      const r = 0.62 * (1 - (y - 0.4) / 1.8) + 0.04;
      const a = i * 2.4;
      const bulb = mesh(new THREE.SphereGeometry(0.04, 6, 5), twinkle[i % 3], { cast: false });
      bulb.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
      tree.add(bulb);
    }
    [['#ef5b6f', '#ffd166', -0.5, 0.35], ['#4fb7c5', '#ffffff', 0.45, 0.4], ['#c7a6ff', '#ef5b6f', 0.05, 0.62]].forEach(([c, rb, x, z]) => {
      tb.rbox(0.34, 0.28, 0.34, c, 0.04, x, 0.14, z);
      tb.box(0.36, 0.29, 0.06, rb, x, 0.145, z);
    });
    tree.position.set(5.2, 0, -4.15);
    root.add(tree);
    colliders.push({ type: 'circle', x: 5.2, z: -4.15, r: 0.7 });
    // Crossed skis on the divider
    for (const s of [-1, 1]) {
      const sk = b.box(0.08, 1.6, 0.03, s < 0 ? '#ef5b6f' : '#4aa3df', 6.05, 2.1, -3.2);
      sk.rotation.set(0, Math.PI / 2, s * 0.5);
    }

    // ---------------------------------------------------------- cocoa corner (right)
    // The counter runs along the right wall; it is built in its own frame (x along the counter, +z into the room)
    const bar = new THREE.Group();
    bar.position.set(W / 2 - 0.38, 0, -1.6);
    bar.rotation.y = -Math.PI / 2;
    root.add(bar);
    const kx = 0;
    const kb = builder(bar);
    kb.rbox(3.8, 1.0, 0.7, '#ffe1e6', 0.05, kx, 0.5, 0);
    for (let i = 0; i < 5; i++) kb.box(0.04, 0.7, 0.02, '#ffffff', kx - 1.6 + i * 0.8, 0.5, 0.36);
    kb.rbox(3.95, 0.08, 0.8, '#c98a5a', 0.03, kx, 1.03, 0);
    colliders.push({ type: 'box', x: W / 2 - 0.38, z: -1.6, hw: 0.4, hd: 1.95, h: 1.07 });
    kb.cyl(0.24, 0.2, 0.36, '#d9824e', kx - 1.2, 1.25, 0, 16, { metal: 0.5, rough: 0.35 });
    kb.cyl(0.25, 0.25, 0.04, '#b86a3d', kx - 1.2, 1.44, 0, 16, { metal: 0.5, rough: 0.35 });
    kb.cyl(0.03, 0.03, 0.12, '#3b2b3f', kx - 1.2, 1.5, 0, 8);
    ['#ef5b6f', '#ffffff', '#4fb7c5', '#ffd166', '#ff9eb5'].forEach((c, i) => {
      kb.cyl(0.07, 0.06, 0.14, c, kx - 0.5 + i * 0.25, 1.14, -0.08, 12);
      const hd = mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 10), mat(c));
      hd.position.set(kx - 0.42 + i * 0.25, 1.14, -0.08);
      bar.add(hd);
    });
    kb.cyl(0.13, 0.13, 0.3, '#ffe9f0', kx + 1.0, 1.22, 0, 14);
    kb.cyl(0.14, 0.14, 0.06, '#ef7f93', kx + 1.0, 1.4, 0, 14);
    for (let i = 0; i < 5; i++) kb.cyl(0.04, 0.04, 0.05, '#ffffff', kx + 0.95 + (i % 2) * 0.08, 1.15 + i * 0.05, 0 + (i % 3 - 1) * 0.05, 8);
    kb.cyl(0.2, 0.06, 0.04, '#ffffff', kx + 1.55, 1.12, 0, 16);
    kb.cyl(0.02, 0.02, 0.12, '#ffffff', kx + 1.55, 1.07, 0, 6);
    for (const [dx, c] of [[-0.07, '#ff9eb5'], [0.08, '#c7a6ff'], [0, '#ffd166']]) {
      kb.cyl(0.05, 0.04, 0.05, c, kx + 1.55 + dx, 1.17, 0 + (c === '#ffd166' ? 0.07 : -0.03), 10);
      kb.sph(0.045, '#fff3e0', kx + 1.55 + dx, 1.21, 0 + (c === '#ffd166' ? 0.07 : -0.03), 8);
    }
    // Shelf and chalkboard menu
    kb.box(3.6, 0.07, 0.3, '#8a5a3c', kx, 2.05, -0.21);
    ['#ef5b6f', '#4fb7c5', '#ffd166', '#ffffff', '#ff9eb5', '#7fd3a7'].forEach((c, i) => kb.cyl(0.08, 0.08, 0.24, c, kx - 1.5 + i * 0.6, 2.21, -0.21, 10));
    const menu = canvasTexture(400, 260, (c, w, h) => {
      c.fillStyle = '#3b3f44';
      roundRect(c, 4, 4, w - 8, h - 8, 18);
      c.fill();
      c.lineWidth = 10;
      c.strokeStyle = '#c98a5a';
      c.stroke();
      c.fillStyle = '#fff7ea';
      c.textAlign = 'center';
      c.font = `700 46px ${FONT}`;
      c.fillText('Hot Cocoa', w / 2, 70);
      c.font = `500 28px ${FONT}`;
      c.fillStyle = '#ffd166';
      c.fillText('with marshmallows', w / 2, 112);
      c.fillStyle = '#ff9eb5';
      c.fillText('cookies and cupcakes', w / 2, 160);
      c.fillStyle = '#8fd8ff';
      c.fillText('warm hugs, free', w / 2, 208);
    });
    kb.plane(1.9, 1.24, menu, kx, 2.85, -0.35);
    // Steam from the big pot
    const steam = [];
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, color: '#ffffff', opacity: 0.5 }));
      root.add(s);
      dynamic.push(s);
      steam.push({ s, ph: i / 4 });
    }
    // Café table and two chairs
    const ctx2 = 8.0;
    const ctz = -0.9;
    b.cyl(0.5, 0.5, 0.05, '#fff3e0', ctx2, 0.75, ctz, 24);
    b.cyl(0.05, 0.07, 0.72, '#5b6977', ctx2, 0.37, ctz, 10);
    b.cyl(0.25, 0.28, 0.03, '#5b6977', ctx2, 0.015, ctz, 16);
    b.cyl(0.05, 0.06, 0.16, '#4fb7c5', ctx2, 0.86, ctz, 10);
    b.sph(0.07, '#ef5b6f', ctx2, 0.98, ctz, 8);
    for (const s of [-1, 1]) {
      const chx = ctx2 + s * 0.85;
      b.cyl(0.24, 0.24, 0.07, '#ef7f93', chx, 0.46, ctz, 16);
      b.cyl(0.04, 0.05, 0.44, '#5b6977', chx, 0.22, ctz, 8);
      b.rbox(0.08, 0.5, 0.42, '#ef7f93', 0.03, chx + s * 0.22, 0.75, ctz);
      colliders.push({ type: 'circle', x: chx, z: ctz, r: 0.26, h: 0.5 });
    }
    colliders.push({ type: 'circle', x: ctx2, z: ctz, r: 0.5, h: 0.78 });
    // Window seat under a window on the back wall
    const wsx = 8.6;
    windowAt(wsx, 1.75, -D / 2 + 0.04, 2.0, 1.05);
    b.rbox(2.6, 0.42, 0.72, '#c98a5a', 0.05, wsx, 0.21, -D / 2 + 0.38);
    b.rbox(2.5, 0.12, 0.66, '#c7a6ff', 0.05, wsx, 0.47, -D / 2 + 0.38);
    b.rbox(0.5, 0.42, 0.18, '#ffd166', 0.08, wsx - 1.05, 0.72, -D / 2 + 0.16).rotation.z = 0.12;
    b.rbox(0.5, 0.42, 0.18, '#ff9eb5', 0.08, wsx + 1.05, 0.72, -D / 2 + 0.16).rotation.z = -0.12;
    for (let i = 0; i < 3; i++) b.box(0.26, 0.05, 0.2, ['#4fb7c5', '#ef5b6f', '#ffd166'][i], wsx + 0.05, 0.56 + i * 0.05, -D / 2 + 0.3).rotation.y = i * 0.3;
    colliders.push({ type: 'box', x: wsx, z: -D / 2 + 0.38, hw: 1.3, hd: 0.38, h: 0.53 });
    // Doormat at the front
    const mat2 = labelTex('Welcome', { w: 384, h: 160, bg: '#c98a5a', ink: '#fff7ea', edge: '#8a5a3c' });
    const doormat = mesh(new THREE.PlaneGeometry(1.6, 0.66), new THREE.MeshStandardMaterial({ map: mat2, roughness: 1 }), { cast: false });
    doormat.rotation.x = -Math.PI / 2;
    doormat.position.set(0, 0.04, 4.35);
    root.add(doormat);

    // ---------------------------------------------------------- activities
    let busy = false;
    const cupSteam = [];
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, color: '#ffffff', opacity: 0 }));
      s.visible = false;
      root.add(s);
      dynamic.push(s);
      cupSteam.push(s);
    }
    let cups = [];
    const v = new THREE.Vector3();
    const book = (c) => {
      const g2 = new THREE.Group();
      const bk = builder(g2);
      bk.box(0.22, 0.03, 0.16, c, 0, 0.0, 0);
      bk.box(0.21, 0.035, 0.15, '#fff7ea', 0, 0.02, 0);
      g2.rotation.x = -0.9;
      return g2;
    };

    const hotspots = [
      {
        x: sx,
        z: -2.95,
        r: 1.5,
        label: 'Drink hot cocoa',
        icon: 'ski_cocoa',
        act: async (api2) => {
          if (busy) return;
          busy = true;
          const got = await Promise.all([props.food('hot-cocoa'), props.food('hot-cocoa')]);
          busy = false;
          cups = got.map((c) => fit(c, 0.24));
          api2.activity({
            label: 'Get up',
            seats: [
              { who: 'player', x: sx - 0.45, z: sz + 0.1, y: 0.19, yaw: 0, pose: 'sit' },
              { who: 'partner', x: sx + 0.45, z: sz + 0.1, y: 0.19, yaw: 0, pose: 'sit' },
            ],
            focus: { x: sx - 1.0, z: -3.4, y: 1.0, zoom: 0.52 },
            night: 0.35,
            music: 0.55,
            exit: { x: 1.4, z: -2.3 },
            update: (dt, t) => {
              cups.forEach((cup, i) => {
                cup.getWorldPosition(v);
                root.worldToLocal(v);
                for (let k = 0; k < 2; k++) {
                  const s = cupSteam[i * 2 + k];
                  const q = (t * 0.5 + k * 0.5 + i * 0.25) % 1;
                  s.visible = true;
                  s.position.set(v.x + Math.sin(q * 6 + k) * 0.04, v.y + 0.2 + q * 0.45, v.z);
                  s.scale.setScalar(0.1 + q * 0.18);
                  s.material.opacity = 0.5 * Math.sin(q * Math.PI);
                }
              });
              heartT -= dt;
              if (heartT <= 0) {
                heartT = 4.5;
                const p = api2.partner.kid.head.getWorldPosition(v);
                api2.fx.heartsAt(p.add(new THREE.Vector3(0, 0.75, 0)), 3);
              }
            },
            onEnd: () => {
              api2.carry('player', null);
              api2.carry('partner', null);
              for (const s of cupSteam) s.visible = false;
              cups = [];
            },
          });
          api2.carry('player', cups[0]);
          api2.carry('partner', cups[1]);
          heartT = 1.5;
          api2.sound.ui('pop');
          api2.toast(`${api2.player.kid.name} and ${api2.partner.kid.name} share warm cocoa by the fire.`);
        },
      },
      {
        x: fx,
        z: -1.6,
        r: 1.4,
        label: 'Warm up by the fire',
        icon: 'heart',
        act: (api2) => {
          heartT = 2;
          api2.activity({
            label: 'Get up',
            seats: [
              { who: 'player', x: fx - 0.5, z: -2.3, y: -0.14, yaw: Math.PI, pose: 'sit' },
              { who: 'partner', x: fx + 0.5, z: -2.3, y: -0.14, yaw: Math.PI, pose: 'sit' },
            ],
            focus: { x: fx, z: -3.0, y: 1.0, zoom: 0.55 },
            night: 0.45,
            music: 0.5,
            exit: { x: fx - 0.4, z: -1.3 },
            update: (dt) => {
              heartT -= dt;
              if (heartT <= 0) {
                heartT = 5;
                api2.fx.heartsAt(api2.world(fx, -2.3, 1.6), 3);
              }
            },
          });
        },
      },
      {
        x: wsx,
        z: -3.4,
        r: 1.4,
        label: 'Read by the window',
        icon: 'book',
        act: (api2) => {
          api2.activity({
            label: 'Get up',
            seats: [
              { who: 'player', x: wsx - 0.45, z: -D / 2 + 0.5, y: 0.17, yaw: 0, pose: 'sit' },
              { who: 'partner', x: wsx + 0.45, z: -D / 2 + 0.5, y: 0.17, yaw: 0, pose: 'sit' },
            ],
            focus: { x: wsx, z: -3.9, y: 1.0, zoom: 0.5 },
            exit: { x: wsx - 0.6, z: -2.8 },
            onEnd: () => {
              api2.carry('player', null);
              api2.carry('partner', null);
            },
          });
          api2.carry('player', book('#4fb7c5'));
          api2.carry('partner', book('#ef5b6f'));
          api2.player.kid.hands = 'read';
          api2.partner.kid.hands = 'read';
        },
      },
      { x: -W / 2 + 1.4, z: -1.8, r: 1.3, label: 'Change clothes', icon: 'shirt', act: (api2) => api2.openWardrobe() },
    ];
    let heartT = 0;

    // Fire crackles (soft noise clicks)
    let crackT = 0;
    const crackle = () => {
      const s = api.sound;
      if (!s?.ctx || s.muted || !s.noise) return;
      const c = s.ctx;
      const src = c.createBufferSource();
      src.buffer = s.noise;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1800 + Math.random() * 2600;
      f.Q.value = 1.2;
      const gn = c.createGain();
      const t0 = c.currentTime;
      gn.gain.setValueAtTime(0.0001, t0);
      gn.gain.exponentialRampToValueAtTime(0.05 + Math.random() * 0.05, t0 + 0.004);
      gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03 + Math.random() * 0.05);
      src.connect(f).connect(gn).connect(s.sfx);
      src.start(t0, Math.random() * 0.4, 0.1);
    };

    bakeColored(root, dynamic);

    return {
      group: root,
      dynamic,
      colliders,
      hotspots,
      size: { w: W, d: D },
      spawn: { x: 0, z: 3.0, yaw: Math.PI },
      exit: { x: 0, z: 4.4 },
      background: '#b8d4ea',
      onEnter() {
        fire.visible = true;
      },
      onExit() {
        fire.visible = false;
      },
      update(dt, t) {
        for (const f of flames) {
          const k = 0.75 + Math.sin(t * 13 + f.ph) * 0.15 + Math.sin(t * 7.3 + f.ph * 2) * 0.12;
          f.m.scale.set(f.s * (1.05 - k * 0.2), f.s * k * 1.15, f.s);
          f.m.rotation.z = Math.sin(t * 5 + f.ph) * 0.12;
        }
        fire.intensity = 8 + Math.sin(t * 11) * 1.2 + Math.sin(t * 23) * 0.8;
        glow.material.opacity = 0.75 + Math.sin(t * 9) * 0.1;
        for (const e of embers) {
          const k = (t * 0.35 + e.ph) % 1;
          e.e.position.set(fx + e.dx * (0.4 + k * 0.4), 0.55 + k * 1.0, fzB + 1.0);
          e.e.material.opacity = Math.sin(k * Math.PI) * 0.9;
        }
        for (const s of steam) {
          const k = (t * 0.3 + s.ph) % 1;
          s.s.position.set(W / 2 - 0.38 + Math.sin(k * 5 + s.ph * 8) * 0.08, 1.55 + k * 0.8, -1.6 - 1.2);
          s.s.scale.setScalar(0.15 + k * 0.35);
          s.s.material.opacity = 0.45 * Math.sin(k * Math.PI);
        }
        twinkle.forEach((m, i) => (m.emissiveIntensity = 0.6 + Math.max(0, Math.sin(t * 2.2 + i * 2.1)) * 1.2));
        crackT -= dt;
        if (crackT <= 0) {
          crackT = 0.08 + Math.random() * 0.45;
          crackle();
        }
      },
    };
  },
};
