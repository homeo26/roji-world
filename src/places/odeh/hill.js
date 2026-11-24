// Odeh's hill: golden sand, soft dunes, stone terraces with steps, date palms, cactus and aloe,
// Odeh's vegetable garden, a stone well, an olive tree, a Bedouin tent with cushions and a coffee
// pot by a little fire, a sleeping camel, a goat, lanterns that glow at night, and the sign.
import { THREE, mat, umat, mesh, box, rbox, cyl, sph, cone, tor, caps, at, sc, panel, canvasTexture, roundRect, FONT, rng, P, C, glowTexture, bakePart } from './kit.js';
import { L1, L2, STEP, STAIR, STEPS_A, STEPS_B, Z, T1, T2, SPOT } from './layout.js';

// ---------------------------------------------------------------- textures
let stoneTexCache = null;
export function stoneTex() {
  if (stoneTexCache) return stoneTexCache;
  const r = rng(5);
  stoneTexCache = canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#d7b27c';
    ctx.fillRect(0, 0, w, h);
    const rows = 4;
    const rh = h / rows;
    for (let row = 0; row < rows; row++) {
      let x = -((row * 53) % 90);
      while (x < w) {
        const bw = 70 + r() * 80;
        const tone = ['#eacb98', '#e4c08a', '#efd3a6', '#dfb983', '#ecc995'][Math.floor(r() * 5)];
        ctx.fillStyle = tone;
        roundRect(ctx, x + 3, row * rh + 3, bw - 6, rh - 6, 10);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        roundRect(ctx, x + 8, row * rh + 6, bw - 20, 8, 4);
        ctx.fill();
        ctx.fillStyle = 'rgba(160,110,60,0.12)';
        for (let i = 0; i < 4; i++) ctx.fillRect(x + 10 + r() * (bw - 26), row * rh + 14 + r() * (rh - 30), 4 + r() * 6, 3);
        x += bw;
      }
    }
  });
  stoneTexCache.wrapS = stoneTexCache.wrapT = THREE.RepeatWrapping;
  return stoneTexCache;
}

function weaveTex() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#4b3a33';
    ctx.fillRect(0, 0, w, h);
    const bands = [
      [20, 10, '#7a2e3a'],
      [34, 6, '#f2e2c4'],
      [120, 14, '#c0392b'],
      [138, 6, '#e7b54a'],
      [200, 8, '#7a2e3a'],
    ];
    for (const [y, t, c] of bands) {
      ctx.fillStyle = c;
      ctx.fillRect(0, y, w, t);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = 0; x < w; x += 6) ctx.fillRect(x, 0, 2, h);
  });
}

export function rugTex(base = '#b83a3a', edge = '#f2d48a', motif = '#2b4a6e') {
  return canvasTexture(256, 384, (ctx, w, h) => {
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = base;
    ctx.fillRect(14, 14, w - 28, h - 28);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 6;
    ctx.strokeRect(30, 30, w - 60, h - 60);
    ctx.fillStyle = motif;
    for (let i = 0; i < 4; i++) {
      const cy = 80 + i * 75;
      ctx.beginPath();
      ctx.moveTo(w / 2, cy - 26);
      ctx.lineTo(w / 2 + 40, cy);
      ctx.lineTo(w / 2, cy + 26);
      ctx.lineTo(w / 2 - 40, cy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = edge;
      ctx.beginPath();
      ctx.arc(w / 2, cy, 8, 0, P * 2);
      ctx.fill();
      ctx.fillStyle = motif;
    }
    ctx.fillStyle = edge;
    for (let x = 18; x < w - 10; x += 14) {
      ctx.fillRect(x, 0, 4, 10);
      ctx.fillRect(x, h - 10, 4, 10);
    }
  });
}

// A stone face: a plane with the sandstone texture, tiled by its size
function stoneFace(stoneMat, w, h, x, y, z, ry = 0) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / 2.2), uv.getY(i) * (h / 1.1));
  const m = mesh(g, stoneMat, { cast: false });
  return at(m, x, y, z, 0, ry, 0);
}

// ---------------------------------------------------------------- plants
export function datePalm(g, x, y, z, h = 4.2, seed = 1, lean = 0.08) {
  const r = rng(seed);
  const trunk = new THREE.Group();
  const segs = Math.round(h / 0.32);
  let px = 0;
  let pz = 0;
  const dir = r() * P * 2;
  for (let i = 0; i < segs; i++) {
    const k = i / segs;
    const rad = 0.2 - k * 0.07;
    const s = cyl(rad * 0.92, rad, 0.33, i % 2 ? C.palmTrunk : C.palmTrunkDark, 9);
    px = Math.sin(dir) * lean * k * k * h;
    pz = Math.cos(dir) * lean * k * k * h;
    trunk.add(at(s, px, i * 0.32 + 0.16, pz));
  }
  const top = new THREE.Vector3(px, segs * 0.32, pz);
  trunk.add(at(sph(0.2, C.palmTrunkDark, 10, 8), top.x, top.y, top.z));
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * P * 2 + r() * 0.3;
    const up = i % 2 ? 0.5 : 0.15;
    const len = 1.5 + r() * 0.5;
    const col = i % 3 ? C.palmLeaf : C.palmLeafDark;
    const f = new THREE.Group();
    const inner = sph(1, col, 7, 3);
    inner.scale.set(0.2, 0.05, len * 0.5);
    inner.position.set(0, 0, len * 0.45);
    inner.rotation.x = -up;
    const outer = sph(1, col, 7, 3);
    outer.scale.set(0.17, 0.04, len * 0.45);
    outer.position.set(0, Math.sin(up) * len * 0.85 - 0.12, len * 1.15);
    outer.rotation.x = 0.55;
    f.add(inner, outer);
    f.position.copy(top);
    f.rotation.y = a;
    trunk.add(f);
  }
  // Date clusters
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * P * 2 + 0.4;
    const cl = new THREE.Group();
    for (let j = 0; j < 5; j++) cl.add(at(sph(0.065, j % 2 ? '#c8642c' : '#a04a24', 5, 3), (r() - 0.5) * 0.16, -j * 0.05, (r() - 0.5) * 0.16));
    cl.position.set(top.x + Math.sin(a) * 0.24, top.y - 0.12, top.z + Math.cos(a) * 0.24);
    trunk.add(cl);
  }
  trunk.position.set(x, y, z);
  g.add(trunk);
  return trunk;
}

export function cactus(g, x, y, z, h = 1.3, seed = 2) {
  const r = rng(seed);
  const c = new THREE.Group();
  c.add(at(caps(0.17, h - 0.34, C.cactus), 0, h / 2, 0));
  for (const s of [1, -1]) {
    if (r() < 0.25 && s < 0) continue;
    const ay = h * (0.35 + r() * 0.2);
    c.add(at(caps(0.09, 0.22, C.cactus), s * 0.24, ay, 0, 0, 0, P / 2));
    c.add(at(caps(0.09, 0.3 + r() * 0.2, C.cactus), s * 0.36, ay + 0.22, 0));
  }
  c.add(at(sph(0.06, '#ff8fb1', 8, 6), 0.02, h + 0.02, 0));
  c.add(at(sph(0.035, '#ffd166', 6, 4), 0.02, h + 0.07, 0.02));
  c.position.set(x, y, z);
  c.rotation.y = r() * P;
  g.add(c);
  return c;
}

export function aloe(g, x, y, z, s = 1, seed = 3, pot = false) {
  const r = rng(seed);
  const a = new THREE.Group();
  if (pot) {
    a.add(at(cyl(0.26, 0.2, 0.34, C.terra, 14), 0, 0.17, 0));
    a.add(at(tor(0.25, 0.035, C.terraDark, 6, 18), 0, 0.33, 0, P / 2, 0, 0));
  }
  const base = pot ? 0.3 : 0;
  const n = 9;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * P * 2 + r() * 0.3;
    const l = cone(0.07, 0.55 + r() * 0.2, i % 2 ? C.aloe : '#5fa774', 6);
    l.position.set(Math.sin(ang) * 0.08, base + 0.24, Math.cos(ang) * 0.08);
    l.rotation.set(Math.cos(ang) * 0.75, 0, -Math.sin(ang) * 0.75);
    a.add(l);
  }
  a.position.set(x, y, z);
  a.scale.setScalar(s);
  g.add(a);
  return a;
}

export function barrelCactus(g, x, y, z, s = 1) {
  const b = new THREE.Group();
  const body = sph(0.22, '#4f9a55', 12, 8);
  body.scale.set(1, 0.85, 1);
  b.add(at(body, 0, 0.18, 0));
  for (let i = 0; i < 5; i++) b.add(at(sph(0.035, i % 2 ? '#ffd166' : '#ff8fb1', 6, 4), Math.sin(i * 1.3) * 0.06, 0.36, Math.cos(i * 1.3) * 0.06));
  b.position.set(x, y, z);
  b.scale.setScalar(s);
  g.add(b);
  return b;
}

function oliveTree(g, x, y, z) {
  const t = new THREE.Group();
  const bark = '#7d6a52';
  t.add(at(cyl(0.2, 0.3, 1.0, bark, 9), 0, 0.5, 0, 0, 0, 0.12));
  t.add(at(cyl(0.13, 0.18, 0.9, bark, 8), 0.2, 1.25, 0, 0, 0, -0.45));
  t.add(at(cyl(0.12, 0.16, 0.8, bark, 8), -0.18, 1.2, 0.05, 0.2, 0, 0.5));
  const blobs = [
    [0.55, 2.0, 0, 0.75],
    [-0.5, 1.95, 0.1, 0.7],
    [0.05, 2.35, -0.05, 0.8],
    [0.1, 1.95, 0.45, 0.6],
    [-0.15, 2.0, -0.45, 0.6],
  ];
  blobs.forEach(([bx, by, bz, br], i) => {
    const s = sph(br, i % 2 ? C.oliveLeaf : '#869c5f', 12, 9);
    s.scale.y = 0.72;
    t.add(at(s, bx, by, bz));
  });
  const r = rng(9);
  for (let i = 0; i < 16; i++) {
    const a = r() * P * 2;
    const bl = blobs[i % blobs.length];
    t.add(at(sph(0.045, '#3b3a52', 6, 4), bl[0] + Math.sin(a) * bl[3] * 0.92, bl[1] - 0.12 + r() * 0.2, bl[2] + Math.cos(a) * bl[3] * 0.92));
  }
  t.position.set(x, y, z);
  g.add(t);
  return t;
}

// A brass Arabic lantern; glass: the shared glowing material
export function lantern(glass, brass) {
  const l = new THREE.Group();
  l.add(at(cone(0.14, 0.16, brass, 6), 0, 0.42, 0));
  l.add(at(sph(0.03, brass, 6, 4), 0, 0.52, 0));
  const g6 = new THREE.CylinderGeometry(0.11, 0.08, 0.26, 6);
  l.add(at(mesh(g6, glass, { cast: false }), 0, 0.22, 0));
  l.add(at(cyl(0.09, 0.07, 0.05, brass, 6), 0, 0.07, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * P * 2;
    l.add(at(box(0.012, 0.27, 0.012, brass), Math.sin(a) * 0.1, 0.22, Math.cos(a) * 0.1, 0, a, 0));
  }
  return l;
}

function lampPost(g, glass, x, y, z, halos) {
  const iron = mat('#3b2b3f', { rough: 0.5 });
  const brass = mat(C.brass, { rough: 0.4, metal: 0.4 });
  g.add(at(cyl(0.11, 0.14, 0.14, C.stoneDark, 10), x, y + 0.07, z));
  g.add(at(mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.7, 8), iron), x, y + 0.92, z));
  g.add(at(mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 14, P), iron), x + 0.16, y + 1.77, z, 0, 0, 0));
  const lan = lantern(glass, brass);
  lan.position.set(x + 0.32, y + 1.12, z);
  g.add(lan);
  g.add(at(box(0.012, 0.12, 0.012, iron), x + 0.32, y + 1.68, z));
  halos.push(new THREE.Vector3(x + 0.32, y + 1.34, z));
}

// ---------------------------------------------------------------- the tent, the fire and the coffee
function tent(g, dynamic, weave, rug) {
  const T = new THREE.Group();
  const { x, z } = SPOT.tent;
  const W = 5.2;
  const D = 3.4;
  // Poles
  for (const [px, pz, ph] of [[-W / 2, -D / 2, 1.9], [0, -D / 2, 2.3], [W / 2, -D / 2, 1.9], [-W / 2, D / 2, 1.55], [0, D / 2, 1.85], [W / 2, D / 2, 1.55]]) {
    T.add(at(cyl(0.05, 0.06, ph, C.woodDark, 8), px, ph / 2, pz));
  }
  // Roof: a soft sagging woven cloth
  const rg = new THREE.PlaneGeometry(W + 0.5, D + 0.6, 12, 8);
  rg.rotateX(-P / 2);
  const pos = rg.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const pz = pos.getZ(i);
    const u = px / (W + 0.5) + 0.5;
    const v = pz / (D + 0.6) + 0.5;
    const ridge = 2.3 - Math.abs(px) * 0.16;
    const y = ridge - v * 0.42 - Math.sin(u * P * 2) ** 2 * 0.12 - Math.sin(v * P) * 0.05;
    pos.setY(i, y);
  }
  rg.computeVertexNormals();
  const wmat = new THREE.MeshStandardMaterial({ map: weave, roughness: 0.95, side: THREE.DoubleSide });
  T.add(mesh(rg, wmat));
  // Back wall cloth and one side
  const back = mesh(new THREE.PlaneGeometry(W + 0.4, 2.0), wmat);
  T.add(at(back, 0, 1.0, -D / 2 - 0.05));
  const side = mesh(new THREE.PlaneGeometry(D * 0.7, 1.7), wmat);
  T.add(at(side, -W / 2 - 0.05, 0.85, -D * 0.15, 0, P / 2, 0));
  // Guy ropes and pegs
  for (const [px, pz, tx, tz] of [[-W / 2, D / 2, -W / 2 - 0.6, D / 2 + 0.9], [W / 2, D / 2, W / 2 + 0.6, D / 2 + 0.9]]) {
    const len = Math.hypot(tx - px, tz - pz, 1.55);
    const rope = cyl(0.012, 0.012, len, '#e8d8b8', 4);
    rope.position.set((px + tx) / 2, 0.78, (pz + tz) / 2);
    rope.lookAt(tx, 0, tz);
    rope.rotateX(P / 2);
    T.add(rope);
    T.add(at(cyl(0.03, 0.02, 0.18, C.woodDark, 5), tx, 0.06, tz));
  }
  // Rug and cushions
  const rugM = mesh(new THREE.PlaneGeometry(W - 0.4, D - 0.3), new THREE.MeshStandardMaterial({ map: rug, roughness: 0.95 }), { cast: false });
  T.add(at(rugM, 0, 0.012, 0, -P / 2, 0, P / 2));
  const cushCols = ['#c0392b', '#e7b54a', '#7a2e3a', '#d9774f', '#2b4a6e'];
  for (let i = 0; i < 5; i++) {
    const cx = -W / 2 + 0.7 + i * 0.95;
    T.add(at(rbox(0.85, 0.18, 0.6, cushCols[i], 0.07), cx, 0.09, -D / 2 + 0.45));
    T.add(at(rbox(0.8, 0.42, 0.18, cushCols[(i + 2) % 5], 0.07), cx, 0.3, -D / 2 + 0.16, -0.12, 0, 0));
  }
  T.add(at(rbox(0.6, 0.16, 0.85, '#c0392b', 0.07), -W / 2 + 0.45, 0.08, 0.35));
  T.add(at(rbox(0.18, 0.38, 0.78, '#e7b54a', 0.07), -W / 2 + 0.16, 0.28, 0.35));
  // Brass tray table with the coffee pot (dallah), cups and dates
  const brass = mat(C.brass, { rough: 0.35, metal: 0.5 });
  T.add(at(cyl(0.42, 0.42, 0.035, brass, 22), 0.2, 0.32, 0.1));
  T.add(at(cyl(0.05, 0.08, 0.3, C.woodDark, 8), 0.2, 0.15, 0.1));
  T.add(at(dallah(brass), 0.0, 0.34, 0.15));
  for (let i = 0; i < 3; i++) T.add(at(cyl(0.035, 0.025, 0.05, C.cream, 10), 0.36 + i * 0.09, 0.36, 0.0 + (i % 2) * 0.08));
  T.add(at(cyl(0.11, 0.08, 0.05, '#e7d6b8', 12), 0.38, 0.36, 0.26));
  for (let i = 0; i < 6; i++) T.add(at(caps(0.022, 0.03, '#6b3420'), 0.33 + (i % 3) * 0.045, 0.4, 0.23 + Math.floor(i / 3) * 0.05, 0, 0, P / 2));
  T.position.set(x, 0, z);
  g.add(T);
  return { W, D };
}

export function dallah(brass) {
  const d = new THREE.Group();
  const body = mesh(new THREE.LatheGeometry([[0, 0], [0.09, 0], [0.1, 0.03], [0.085, 0.1], [0.05, 0.16], [0.04, 0.2], [0.06, 0.24], [0.03, 0.29], [0, 0.31]].map(([a, b]) => new THREE.Vector2(a, b)), 14), brass);
  d.add(body);
  const spout = cone(0.022, 0.18, brass, 6);
  spout.position.set(0.1, 0.2, 0);
  spout.rotation.z = -1.0;
  d.add(spout);
  const handle = mesh(new THREE.TorusGeometry(0.06, 0.012, 5, 10, P), brass);
  handle.position.set(-0.08, 0.15, 0);
  handle.rotation.z = P / 2;
  d.add(handle);
  d.add(at(sph(0.02, brass, 6, 4), 0, 0.33, 0));
  return d;
}

function firePit(g, dynamic) {
  const { x, z } = SPOT.fire;
  const F = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * P * 2;
    const s = sph(0.13, i % 2 ? '#bfa98a' : '#a89276', 8, 6);
    s.scale.set(1, 0.7, 0.9);
    F.add(at(s, Math.sin(a) * 0.42, 0.07, Math.cos(a) * 0.42));
  }
  F.add(at(cyl(0.38, 0.38, 0.02, '#4a3a30', 16), 0, 0.012, 0));
  for (const [a, l] of [[0.3, 0.6], [1.9, 0.55], [3.6, 0.62]]) F.add(at(cyl(0.05, 0.05, l, '#6b4a30', 7), Math.sin(a) * 0.04, 0.09, Math.cos(a) * 0.04, P / 2 - 0.25, a, 0));
  // Embers and flames (they flicker)
  const ember = umat('#ff7a2a', { emissive: '#ff5a1a', ei: 1.1 });
  const flameA = umat('#ffb347', { emissive: '#ff8a2a', ei: 1.4, rough: 0.6 });
  const flameB = umat('#ffe08a', { emissive: '#ffd060', ei: 1.5, rough: 0.6 });
  const flames = new THREE.Group();
  flames.add(at(mesh(new THREE.SphereGeometry(0.16, 10, 6), ember, { cast: false }), 0, 0.12, 0));
  const fl = [];
  for (const [fx, fz, s, m] of [[0, 0, 1, flameA], [0.08, 0.05, 0.7, flameB], [-0.08, -0.03, 0.65, flameA], [0.02, -0.08, 0.5, flameB]]) {
    const c = mesh(new THREE.ConeGeometry(0.12 * s, 0.42 * s, 8), m, { cast: false });
    c.position.set(fx, 0.2 + 0.2 * s, fz);
    flames.add(c);
    fl.push({ c, s, ph: Math.random() * 6 });
  }
  F.add(flames);
  dynamic.push(flames);
  // A copper kettle hanging over the fire on a tripod
  const iron = mat('#3b2b3f', { rough: 0.5 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * P * 2;
    const leg = mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 5), iron);
    leg.position.set(Math.sin(a) * 0.28, 0.52, Math.cos(a) * 0.28);
    leg.lookAt(0, 1.05, 0);
    leg.rotateX(P / 2);
    F.add(leg);
  }
  const kettle = mesh(new THREE.LatheGeometry([[0, 0], [0.1, 0.01], [0.12, 0.08], [0.08, 0.16], [0.03, 0.18], [0, 0.19]].map(([a, b]) => new THREE.Vector2(a, b)), 12), mat(C.copper, { rough: 0.35, metal: 0.5 }));
  F.add(at(kettle, 0, 0.62, 0));
  F.add(at(box(0.01, 0.3, 0.01, iron), 0, 0.92, 0));
  F.position.set(x, 0, z);
  g.add(F);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffb870', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }));
  halo.scale.set(2.4, 2.4, 1);
  halo.position.set(x, 0.55, z);
  g.add(halo);
  dynamic.push(halo);
  return {
    flames: fl,
    halo,
    update(t, night) {
      for (const f of fl) {
        const k = 1 + Math.sin(t * 11 + f.ph) * 0.12 + Math.sin(t * 17 + f.ph * 2) * 0.08;
        f.c.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k));
        f.c.rotation.z = Math.sin(t * 7 + f.ph) * 0.12;
      }
      ember.emissiveIntensity = 0.9 + Math.sin(t * 6) * 0.2;
      halo.material.opacity = 0.25 + night * 0.55 + Math.sin(t * 9) * 0.04;
      const s = 2.2 + night * 1.4 + Math.sin(t * 7) * 0.08;
      halo.scale.set(s, s, 1);
    },
  };
}

// ---------------------------------------------------------------- the camel and the goat
function makeCamel(g, dynamic) {
  const holder = new THREE.Group();
  const body = new THREE.Group();
  const fur = C.camel;
  const dark = C.camelDark;
  const torso = sph(0.62, fur, 16, 12);
  torso.scale.set(1.45, 0.62, 0.78);
  body.add(at(torso, 0, 0.42, 0));
  const hump = sph(0.42, fur, 14, 10);
  hump.scale.set(1.1, 0.85, 0.85);
  body.add(at(hump, 0.05, 0.78, 0));
  // Saddle blanket with tassels
  const blanket = new THREE.Mesh(new THREE.SphereGeometry(0.47, 16, 8, 0, P * 2, 0, P * 0.42), mat('#c0392b'));
  blanket.scale.set(1.16, 0.95, 0.95);
  body.add(at(blanket, 0.05, 0.75, 0));
  body.add(at(tor(0.4, 0.03, '#e7b54a', 6, 22), 0.05, 0.92, 0, P / 2, 0, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * P * 2;
    body.add(at(sph(0.04, i % 2 ? '#e7b54a' : '#2b4a6e', 6, 4), 0.05 + Math.cos(a) * 0.5, 0.64, Math.sin(a) * 0.42));
  }
  // Folded legs
  for (const [lx, s] of [[0.55, 1], [0.55, -1], [-0.55, 1], [-0.55, -1]]) {
    body.add(at(caps(0.12, 0.42, dark), lx, 0.12, s * 0.42, 0, 0, P / 2));
    body.add(at(sph(0.1, '#8a6a48', 8, 6), lx + 0.34 * Math.sign(lx), 0.08, s * 0.44));
  }
  body.add(at(caps(0.04, 0.3, dark), -0.92, 0.42, 0, 0, 0, -0.9));
  body.add(at(sph(0.06, '#6b4a30', 6, 4), -1.05, 0.28, 0));
  // Neck and head (lifts when you pat it)
  const neck = new THREE.Group();
  neck.position.set(0.82, 0.48, 0);
  const n1 = caps(0.16, 0.55, fur);
  n1.position.set(0.24, 0.24, 0);
  n1.rotation.z = -0.9;
  neck.add(n1);
  const head = new THREE.Group();
  head.position.set(0.55, 0.42, 0);
  const skull = sph(0.2, fur, 14, 10);
  skull.scale.set(1.5, 0.85, 0.9);
  head.add(at(skull, 0.12, 0, 0));
  head.add(at(sph(0.13, '#e5bd85', 12, 8), 0.38, -0.05, 0));
  for (const s of [1, -1]) {
    head.add(at(sph(0.05, dark, 6, 4), -0.08, 0.16, s * 0.12));
    head.add(at(sph(0.022, '#5a3b2a', 6, 4), 0.47, -0.02, s * 0.06));
  }
  // Eyes: closed lids while asleep, open when patted
  const lid = mat('#5a3b2a');
  const lids = [];
  const eyes = [];
  for (const s of [1, -1]) {
    const l = caps(0.012, 0.05, lid);
    l.position.set(0.16, 0.06, s * 0.155);
    l.rotation.set(0, 0, P / 2 + 0.2);
    head.add(l);
    lids.push(l);
    const e = sph(0.03, '#1d130f', 8, 6);
    e.position.set(0.17, 0.07, s * 0.155);
    e.visible = false;
    head.add(e);
    eyes.push(e);
  }
  neck.add(head);
  body.add(neck);
  holder.add(body);
  holder.position.set(SPOT.camel.x, 0, SPOT.camel.z);
  holder.rotation.y = P * 0.92;
  g.add(holder);
  dynamic.push(holder);
  bakePart(body, [neck]);
  bakePart(head, [...lids, ...eyes]);
  // "Z" for the sleeping camel
  const zTex = canvasTexture(64, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.font = `700 46px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#7a5a8a';
    ctx.lineWidth = 6;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('z', w / 2, h / 2);
    ctx.fillText('z', w / 2, h / 2);
  });
  const zs = [];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: zTex, transparent: true, depthWrite: false }));
    s.scale.setScalar(0.3);
    g.add(s);
    dynamic.push(s);
    zs.push({ s, t: i * 1.1 });
  }
  const st = { awake: 0, lift: 0 };
  const headW = new THREE.Vector3();
  return {
    holder,
    awake(sec = 3) {
      st.awake = sec;
    },
    get isAwake() {
      return st.awake > 0;
    },
    headPos: (out = headW) => head.getWorldPosition(out),
    update(dt, t) {
      st.awake = Math.max(0, st.awake - dt);
      const want = st.awake > 0 ? 1 : 0;
      st.lift += (want - st.lift) * (1 - Math.exp(-5 * dt));
      body.scale.set(1, 1 + Math.sin(t * 1.3) * 0.02 * (1 - st.lift), 1);
      neck.rotation.z = -0.35 + st.lift * 0.45 + Math.sin(t * 1.3) * 0.02;
      head.rotation.z = 0.3 - st.lift * 0.35;
      head.rotation.x = st.lift * Math.sin(t * 3) * 0.08;
      for (const l of lids) l.visible = st.lift < 0.5;
      for (const e of eyes) e.visible = st.lift >= 0.5;
      head.getWorldPosition(headW);
      for (const z of zs) {
        z.t += dt;
        const k = (z.t % 3.3) / 3.3;
        z.s.visible = st.lift < 0.2;
        z.s.position.set(holder.position.x + Math.cos(holder.rotation.y) * 1.55 + Math.sin(k * 6) * 0.15, 1.05 + k * 0.9, holder.position.z - Math.sin(holder.rotation.y) * 1.55 - 0.2);
        z.s.material.opacity = Math.sin(k * P);
        z.s.scale.setScalar(0.2 + k * 0.25);
      }
    },
  };
}

function makeGoat(g, dynamic) {
  const holder = new THREE.Group();
  const body = new THREE.Group();
  const coat = C.goat;
  const patch = '#a8774f';
  const torso = rbox(0.62, 0.34, 0.32, coat, 0.14);
  body.add(at(torso, 0, 0.5, 0));
  body.add(at(sph(0.13, patch, 8, 6), -0.12, 0.6, 0.12));
  const legs = [];
  for (const [lx, lz] of [[0.22, 0.11], [0.22, -0.11], [-0.22, 0.11], [-0.22, -0.11]]) {
    const leg = new THREE.Group();
    leg.position.set(lx, 0.38, lz);
    leg.add(at(box(0.07, 0.32, 0.07, coat), 0, -0.16, 0));
    leg.add(at(box(0.08, 0.06, 0.08, '#5a4a40'), 0, -0.34, 0));
    body.add(leg);
    legs.push(leg);
  }
  body.add(at(cone(0.05, 0.14, coat, 6), -0.34, 0.62, 0, 0, 0, 1.1));
  const head = new THREE.Group();
  head.position.set(0.36, 0.66, 0);
  head.add(at(rbox(0.26, 0.2, 0.18, coat, 0.08), 0.08, 0.02, 0));
  head.add(at(rbox(0.12, 0.12, 0.13, '#efe4d4', 0.05), 0.2, -0.04, 0));
  head.add(at(cone(0.035, 0.12, '#e8e0d0', 6), 0.13, -0.15, 0, 0, 0, P));
  for (const s of [1, -1]) {
    head.add(at(cone(0.03, 0.16, '#cbb79a', 6), 0.0, 0.17, s * 0.05, s * 0.3, 0, -0.5));
    head.add(sc(at(sph(0.06, patch, 8, 6), -0.02, 0.06, s * 0.12), 0.5, 0.35, 1));
    head.add(at(sph(0.022, '#1d130f', 6, 4), 0.14, 0.06, s * 0.08));
  }
  body.add(head);
  holder.add(body);
  g.add(holder);
  dynamic.push(holder);
  bakePart(body, [head, ...legs]);
  bakePart(head);
  for (const l of legs) bakePart(l);
  // Stake and rope
  const sx = SPOT.goatStake.x;
  const sz = SPOT.goatStake.z;
  g.add(at(cyl(0.03, 0.03, 0.4, C.woodDark, 6), sx, L1 + 0.2, sz));
  const rope = cyl(0.008, 0.008, 1, '#e8d8b8', 4);
  g.add(rope);
  dynamic.push(rope);
  const st = { a: 0, r: 1.0, t: 0, nibble: 0, bleat: 0, x: sx + 1, z: sz, yaw: 0, speed: 0, react: 0 };
  return {
    holder,
    get pos() {
      return { x: st.x, z: st.z };
    },
    react() {
      st.react = 2;
      st.bleat = 0.8;
    },
    update(dt, t) {
      st.t += dt;
      st.react = Math.max(0, st.react - dt);
      // Slow wander round the stake, stopping to nibble
      const walk = Math.sin(st.t * 0.23) > -0.2 && st.react <= 0;
      st.speed = walk ? 0.35 : 0;
      st.a += (st.speed / st.r) * dt;
      st.r = 0.95 + Math.sin(st.t * 0.31) * 0.25;
      st.x = sx + Math.cos(st.a) * st.r;
      st.z = sz + Math.sin(st.a) * st.r;
      st.yaw = -st.a + (walk ? P : P / 2);
      holder.position.set(st.x, L1, st.z);
      holder.rotation.y = st.yaw;
      const ph = st.t * 7;
      legs.forEach((l, i) => (l.rotation.z = walk ? Math.sin(ph + (i % 2 ? P : 0) + (i > 1 ? P / 2 : 0)) * 0.4 : 0));
      st.nibble = walk ? 0 : 1;
      head.rotation.z = st.react > 0 ? 0.35 + Math.sin(t * 14) * 0.06 : -0.55 * st.nibble + Math.sin(t * 9) * 0.06 * st.nibble;
      body.position.y = st.react > 1.6 ? Math.abs(Math.sin(t * 12)) * 0.12 : 0;
      // Rope from the stake to the goat's neck
      const nx = st.x + Math.cos(st.yaw) * 0.3;
      const nz = st.z - Math.sin(st.yaw) * 0.3;
      const mx = (sx + nx) / 2;
      const mz = (sz + nz) / 2;
      const len = Math.hypot(nx - sx, nz - sz, 0.3);
      rope.position.set(mx, L1 + 0.42, mz);
      rope.scale.set(1, len, 1);
      rope.lookAt(nx, L1 + 0.57, nz);
      rope.rotateX(P / 2);
    },
  };
}

// ---------------------------------------------------------------- the garden
function garden(g, dynamic) {
  const out = { plants: [] };
  const beds = [
    { x: -7.6, z: 3.2, w: 3.0, d: 1.0, kind: 'tomato' },
    { x: -7.6, z: 1.4, w: 3.0, d: 1.0, kind: 'mint' },
    { x: -3.9, z: 2.3, w: 1.6, d: 2.6, kind: 'pepper' },
  ];
  for (const b of beds) {
    g.add(at(box(b.w, 0.26, b.d, C.woodDark), b.x, L1 + 0.13, b.z));
    g.add(at(box(b.w - 0.16, 0.05, b.d - 0.16, '#6b4a30'), b.x, L1 + 0.265, b.z));
    const r = rng(Math.round(b.x * 10 + b.z));
    const cols = Math.max(1, Math.round(b.w / 0.55));
    const rows = Math.max(1, Math.round(b.d / 0.55));
    // Each bed is one moving piece: it bounces when watered and grows a little every visit
    const bed = new THREE.Group();
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const px = -b.w / 2 + (i + 0.5) * (b.w / cols);
        const pz = -b.d / 2 + (j + 0.5) * (b.d / rows);
        const p = new THREE.Group();
        if (b.kind === 'tomato') {
          p.add(at(cyl(0.012, 0.012, 0.6, C.woodLight, 4), 0, 0.3, 0));
          for (let k = 0; k < 3; k++) p.add(at(sph(0.12, k % 2 ? '#4f9a55' : C.leafGreen, 7, 4), (r() - 0.5) * 0.12, 0.2 + k * 0.14, (r() - 0.5) * 0.12));
          for (let k = 0; k < 3; k++) p.add(at(sph(0.045, '#e5484d', 6, 4), (r() - 0.5) * 0.2, 0.2 + r() * 0.25, 0.08 + (r() - 0.5) * 0.08));
        } else if (b.kind === 'mint') {
          for (let k = 0; k < 4; k++) p.add(at(sph(0.1, k % 2 ? '#5fbf6a' : '#7fd38a', 7, 4), (r() - 0.5) * 0.22, 0.06 + r() * 0.06, (r() - 0.5) * 0.22));
        } else {
          for (let k = 0; k < 3; k++) p.add(at(sph(0.1, '#4f9a55', 7, 4), (r() - 0.5) * 0.14, 0.12 + k * 0.1, (r() - 0.5) * 0.14));
          for (let k = 0; k < 2; k++) p.add(at(caps(0.03, 0.08, k ? '#ffd166' : '#ef5b6f'), (r() - 0.5) * 0.16, 0.16 + r() * 0.12, 0.08, 0.3, 0, 0.3));
        }
        p.position.set(px, 0, pz);
        bed.add(p);
      }
    }
    bed.position.set(b.x, L1 + 0.27, b.z);
    g.add(bed);
    dynamic.push(bed);
    bakePart(bed);
    out.plants.push(bed);
  }
  // Sunflowers along the back
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Group();
    f.add(at(cyl(0.025, 0.03, 1.3, '#5c9c4f', 6), 0, 0.65, 0));
    f.add(sc(at(sph(0.1, '#5c9c4f', 6, 4), 0.07, 0.6, 0), 1.3, 0.3, 0.7));
    const head = new THREE.Group();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * P * 2;
      head.add(sc(at(sph(0.07, '#ffd166', 5, 3), Math.sin(a) * 0.15, Math.cos(a) * 0.15, 0, 0, 0, -a), 0.6, 1, 0.3));
    }
    head.add(at(cyl(0.1, 0.1, 0.05, '#7a4a26', 12), 0, 0, 0.02, P / 2, 0, 0));
    head.position.set(0, 1.34, 0.04);
    head.rotation.x = -0.25;
    f.add(head);
    f.position.set(-9.4 + i * 0.6, L1, -0.4 + (i % 2) * 0.2);
    g.add(f);
  }
  // A little scarecrow in Odeh's old cap
  const crow = new THREE.Group();
  crow.add(at(cyl(0.03, 0.03, 1.3, C.woodDark, 6), 0, 0.65, 0));
  crow.add(at(cyl(0.025, 0.025, 0.9, C.woodDark, 6), 0, 0.95, 0, 0, 0, P / 2));
  crow.add(at(rbox(0.36, 0.42, 0.18, '#3f7bf0', 0.06), 0, 0.85, 0));
  crow.add(at(sph(0.16, '#f2e2c4', 10, 8), 0, 1.24, 0));
  crow.add(at(cyl(0.2, 0.2, 0.03, '#c0392b', 12), 0, 1.36, 0));
  crow.add(at(cyl(0.13, 0.15, 0.12, '#c0392b', 12), 0, 1.42, 0));
  for (const s of [1, -1]) crow.add(at(sph(0.022, '#3b2b3f', 6, 4), s * 0.06, 1.27, 0.14));
  crow.add(at(tor(0.05, 0.012, '#3b2b3f', 4, 10, P), 0, 1.2, 0.145, 0, 0, P));
  crow.position.set(-2.8, L1 + 0.27, 0.9);
  crow.rotation.y = -0.4;
  g.add(crow);
  // Watering can
  out.can = wateringCan();
  out.can.position.set(-5.7, L1, 0.35);
  out.can.rotation.y = 0.6;
  g.add(out.can);
  dynamic.push(out.can);
  return out;
}

export function wateringCan() {
  const can = new THREE.Group();
  const green = mat('#3fbf7f', { rough: 0.45 });
  can.add(at(mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.24, 14), green), 0, 0.12, 0));
  const sp = mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.32, 6), green);
  sp.position.set(0.18, 0.2, 0);
  sp.rotation.z = -0.9;
  can.add(sp);
  can.add(at(mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.04, 8), green), 0.31, 0.3, 0, 0, 0, -0.9));
  can.add(at(mesh(new THREE.TorusGeometry(0.08, 0.015, 5, 12, P), green), -0.02, 0.24, 0));
  bakePart(can);
  return can;
}

// ---------------------------------------------------------------- the well
function well(g, dynamic, stoneMat) {
  const { x, z } = SPOT.well;
  const W = new THREE.Group();
  const ring = mesh(new THREE.CylinderGeometry(0.72, 0.76, 0.7, 20, 1, true), stoneMat);
  const uv = ring.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2.2, uv.getY(i) * 0.7);
  W.add(at(ring, 0, 0.35, 0));
  W.add(at(tor(0.72, 0.08, C.stoneEdge, 6, 24), 0, 0.7, 0, P / 2, 0, 0));
  W.add(at(cyl(0.64, 0.64, 0.02, '#3a6d8a', 18), 0, 0.42, 0));
  W.add(at(cyl(0.66, 0.66, 0.3, '#8a7458', 18), 0, 0.26, 0));
  for (const s of [1, -1]) W.add(at(box(0.1, 1.5, 0.1, C.wood), s * 0.6, 1.2, 0));
  W.add(at(cyl(0.04, 0.04, 1.3, C.woodDark, 8), 0, 1.75, 0, 0, 0, P / 2));
  // A tiny roof
  for (const s of [1, -1]) W.add(at(box(1.5, 0.05, 0.6, C.terra), 0, 2.14 - 0.07, s * 0.24, s * 0.42, 0, 0));
  W.add(at(cyl(0.03, 0.03, 0.3, C.woodDark, 6), 0.75, 1.75, 0.15, P / 2, 0, 0));
  // The bucket on its rope (goes down and up when you draw water)
  const bucket = new THREE.Group();
  bucket.add(at(cyl(0.13, 0.1, 0.2, C.woodLight, 12), 0, -0.1, 0));
  bucket.add(at(tor(0.13, 0.015, '#7a7a7a', 4, 14), 0, 0, 0, P / 2, 0, 0));
  bucket.add(at(tor(0.1, 0.008, '#7a7a7a', 4, 10, P), 0, 0.0, 0));
  const water = mesh(new THREE.CircleGeometry(0.11, 12), mat('#7fc9e0', { rough: 0.2 }), { cast: false });
  water.rotation.x = -P / 2;
  water.position.y = -0.03;
  water.visible = false;
  bucket.add(water);
  const rope = cyl(0.008, 0.008, 1, '#e8d8b8', 4);
  W.add(rope);
  W.add(bucket);
  W.position.set(x, L1, z);
  g.add(W);
  dynamic.push(bucket, rope);
  const st = { depth: 0.55, want: 0.55 };
  return {
    pos: { x, z },
    set depth(v) {
      st.want = v;
    },
    water,
    bucket,
    update(dt) {
      st.depth += (st.want - st.depth) * (1 - Math.exp(-2.5 * dt));
      const by = 1.75 - st.depth;
      bucket.position.set(0, by - 0.05, 0);
      rope.position.set(0, (1.75 + by) / 2, 0);
      rope.scale.set(1, Math.max(0.01, 1.75 - by), 1);
    },
  };
}

// ---------------------------------------------------------------- build
export function buildHill(ctx, out) {
  const { g, dynamic } = out;
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: 0.92 });
  out.stoneMat = stoneMat;
  const S = STAIR.hw;

  // The levels: boxes with sandy tops and stone fronts, capped with a lighter coping
  const level = (x0, x1, z0, z1, h, top) => {
    g.add(at(box(x1 - x0, h, z1 - z0, top), (x0 + x1) / 2, h / 2, (z0 + z1) / 2));
  };
  level(T1.x0, -S, Z.back, Z.t1Front, L1, '#efd29c');
  level(S, T1.x1, Z.back, Z.t1Front, L1, '#efd29c');
  level(-S, S, Z.back, Z.t1Top, L1, '#e8c58c');
  level(T2.x0, -S, Z.back, Z.t2Front, L2, '#e9cfa2');
  level(S, T2.x1, Z.back, Z.t2Front, L2, '#e9cfa2');
  level(-S, S, Z.back, Z.t2Top, L2, '#e9cfa2');
  // Steps (stone treads)
  for (let i = 0; i < STEPS_A; i++) {
    const z0 = Z.t1Front - 0.6 * (i + 1);
    g.add(at(box(S * 2, STEP * (i + 1), 0.6, C.stone), 0, (STEP * (i + 1)) / 2, z0 + 0.3));
    g.add(at(rbox(S * 2, 0.06, 0.64, C.stoneEdge, 0.02), 0, STEP * (i + 1) - 0.02, z0 + 0.3));
  }
  for (let i = 0; i < STEPS_B; i++) {
    const z0 = Z.t2Front - 0.6 * (i + 1);
    const h = L1 + STEP * (i + 1);
    g.add(at(box(S * 2, h, 0.6, C.stone), 0, h / 2, z0 + 0.3));
    g.add(at(rbox(S * 2, 0.06, 0.64, C.stoneEdge, 0.02), 0, h - 0.02, z0 + 0.3));
  }
  // Stone fronts of the terrace walls (textured) and their coping
  for (const [x0, x1] of [[T1.x0, -S], [S, T1.x1]]) {
    g.add(stoneFace(stoneMat, x1 - x0, L1, (x0 + x1) / 2, L1 / 2, Z.t1Front + 0.006));
    g.add(at(rbox(x1 - x0 + 0.06, 0.08, 0.26, C.stoneEdge, 0.03), (x0 + x1) / 2, L1 + 0.02, Z.t1Front - 0.08));
  }
  for (const [x0, x1] of [[T2.x0, -S], [S, T2.x1]]) {
    g.add(stoneFace(stoneMat, x1 - x0, L2 - L1, (x0 + x1) / 2, L1 + (L2 - L1) / 2, Z.t2Front + 0.006));
    g.add(at(rbox(x1 - x0 + 0.06, 0.08, 0.26, C.stoneEdge, 0.03), (x0 + x1) / 2, L2 + 0.02, Z.t2Front - 0.08));
  }
  // The side walls of the steps
  for (const s of [1, -1]) {
    g.add(stoneFace(stoneMat, Z.t1Front - Z.t1Top, L1, s * S, L1 / 2, (Z.t1Front + Z.t1Top) / 2, (s * -P) / 2));
    g.add(stoneFace(stoneMat, Z.t2Front - Z.t2Top, L2, s * S, L2 / 2, (Z.t2Front + Z.t2Top) / 2, (s * -P) / 2));
  }
  // Sides of the terraces where the dunes do not cover them
  g.add(stoneFace(stoneMat, Z.t1Front - Z.back, L1, T1.x0 - 0.006, L1 / 2, (Z.t1Front + Z.back) / 2, -P / 2));
  g.add(stoneFace(stoneMat, Z.t1Front - Z.back, L1, T1.x1 + 0.006, L1 / 2, (Z.t1Front + Z.back) / 2, P / 2));

  // Dunes: soft sand slopes against the sides and the back
  const duneMat = mat(C.dune, { rough: 0.95 });
  const dune = (x, y, z, sx, sy, sz, c = duneMat) => {
    const d = mesh(new THREE.SphereGeometry(1, 18, 10, 0, P * 2, 0, P / 2), c);
    d.scale.set(sx, sy, sz);
    d.position.set(x, y, z);
    g.add(d);
  };
  for (let i = 0; i < 4; i++) {
    const z = Z.t1Front - 1.4 - i * 4.6;
    dune(-11.6, 0, z, 1.6, 1.0 + i * 0.25, 2.8);
    dune(11.6, 0, z + 1.2, 1.6, 0.9 + i * 0.3, 2.8);
  }
  dune(-6, 0, -14.6, 6.5, 1.9, 1.3);
  dune(6, 0, -14.6, 6.5, 2.0, 1.3);
  dune(0, 0, -14.8, 4.5, 2.4, 1.0);
  // Little dunes in the front yard corners
  dune(-11.2, 0, 14.0, 1.4, 0.38, 1.0);
  dune(11.0, 0, 9.4, 1.2, 0.32, 1.1);
  dune(-11.4, 0, 7.6, 1.0, 0.3, 0.9);

  // Plants
  out.palms = [
    datePalm(g, -11.0, 0, 12.2, 4.4, 3),
    datePalm(g, 11.0, 0, 7.2, 4.8, 7),
    datePalm(g, -10.6, L1, 4.4, 3.8, 11),
    datePalm(g, 9.6, L1, 4.9, 3.6, 13),
    datePalm(g, -8.6, L2, -12.4, 4.6, 17),
    datePalm(g, 8.4, L2, -12.6, 4.2, 19),
    datePalm(g, 11.1, 0, 14.6, 3.4, 23),
  ];
  cactus(g, -3.4, 0, 13.8, 1.4, 4);
  cactus(g, 4.2, 0, 7.4, 1.1, 8);
  cactus(g, -10.0, L1, -0.3, 1.2, 12);
  cactus(g, 9.8, 0, 11.0, 0.9, 16);
  aloe(g, 1.9, 0, 6.8, 1, 5, true);
  aloe(g, -1.9, 0, 6.8, 1, 6, true);
  aloe(g, -2.2, 0, 14.6, 0.9, 7);
  aloe(g, -10.4, 0, 9.6, 0.8, 8);
  aloe(g, 2.1, L1, -0.6, 0.85, 9, true);
  aloe(g, -2.1, L1, -0.6, 0.85, 10, true);
  barrelCactus(g, 3.9, 0, 13.6, 1);
  barrelCactus(g, -4.4, 0, 7.0, 0.8);
  barrelCactus(g, 9.4, L1, 2.6, 0.9);
  // Pebbles and stones along the path
  const r = rng(21);
  for (let i = 0; i < 18; i++) {
    const side = i % 2 ? 1 : -1;
    const s = sph(0.08 + r() * 0.08, i % 3 ? '#e3d2b2' : '#cdb795', 8, 6);
    s.scale.y = 0.55;
    g.add(at(s, side * (1.6 + r() * 0.5), 0.02, 7.2 + r() * 7.2));
  }

  // Olive tree, with R + H carved in its trunk
  oliveTree(g, SPOT.olive.x, L1, SPOT.olive.z);
  const carve = panel(0.22, 0.16, 128, 96, (c, w, h) => {
    c.fillStyle = '#7d6a52';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#4a3b2c';
    c.lineWidth = 6;
    c.font = `700 36px ${FONT}`;
    c.fillStyle = '#4a3b2c';
    c.textAlign = 'center';
    c.fillText('R+H', w / 2, 46);
    c.beginPath();
    c.moveTo(w / 2, 86);
    c.bezierCurveTo(w / 2 - 34, 66, w / 2 - 20, 50, w / 2, 64);
    c.bezierCurveTo(w / 2 + 20, 50, w / 2 + 34, 66, w / 2, 86);
    c.stroke();
  });
  carve.position.set(SPOT.olive.x + 0.04, L1 + 0.62, SPOT.olive.z + 0.27);
  carve.rotation.set(0, 0.05, -0.12);
  g.add(carve);

  // The tent, the fire, the camel, the goat, the garden and the well
  out.tent = tent(g, dynamic, weaveTex(), rugTex());
  out.fire = firePit(g, dynamic);
  out.camel = makeCamel(g, dynamic);
  out.goat = makeGoat(g, dynamic);
  out.garden = garden(g, dynamic);
  out.well = well(g, dynamic, stoneMat);

  // A little goal for kicking a ball about: two water jugs and a line in the sand
  for (const s of [-1, 1]) {
    const jug = new THREE.Group();
    jug.add(at(cyl(0.2, 0.22, 0.5, '#3f7bf0', 12), 0, 0.25, 0));
    jug.add(at(cyl(0.07, 0.09, 0.12, '#3f7bf0', 8), 0, 0.56, 0));
    jug.add(at(tor(0.08, 0.02, '#3f7bf0', 4, 10, P), 0.1, 0.46, 0, 0, 0, -P / 2));
    jug.position.set(SPOT.goal.x + s * 1.3, 0, SPOT.goal.z);
    g.add(jug);
  }
  out.ball = new THREE.Group();
  const bw = sph(0.15, '#ffffff', 14, 10);
  out.ball.add(bw);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * P * 2;
    out.ball.add(at(sph(0.05, '#3b2b3f', 6, 4), Math.sin(a) * 0.12, Math.cos(a) * 0.08, Math.cos(a) * 0.07));
  }
  out.ball.position.set(SPOT.kick.x, 0.15, SPOT.kick.z - 0.4);
  bakePart(out.ball);
  g.add(out.ball);
  dynamic.push(out.ball);

  // Lanterns on posts by the steps: one glowing glass material for all (brighter after dark)
  const glass = umat('#ffd88a', { emissive: '#ffb347', ei: 0.55, rough: 0.4 });
  out.glass = glass;
  out.glassBase = 0.55;
  const halos = [];
  lampPost(g, glass, -1.8, 0, 6.9, halos);
  lampPost(g, glass, 1.8, 0, 6.9, halos);
  lampPost(g, glass, -1.75, L1, -0.55, halos);
  lampPost(g, glass, 1.75, L1, -0.55, halos);
  lampPost(g, glass, -5.6, 0, 13.6, halos);
  // Hanging lanterns at the tent front
  const brass = mat(C.brass, { rough: 0.4, metal: 0.4 });
  for (const [lx, lz] of [[-1.9, 1.75], [1.9, 1.75]]) {
    const l = lantern(glass, brass);
    l.position.set(SPOT.tent.x + lx, 1.02, SPOT.tent.z + lz);
    g.add(l);
    halos.push(new THREE.Vector3(SPOT.tent.x + lx, 1.24, SPOT.tent.z + lz));
  }
  out.halos = halos;

  // The sign by the street
  const sign = ctx.sign(['Welcome to', "Odeh's Home"], { width: 2.5, height: 1.05, accent: '#c8743f', postHeight: 0.9, color: '#8a5a3a' });
  sign.position.set(SPOT.sign.x, 0, SPOT.sign.z);
  sign.rotation.y = -0.18;
  g.add(sign);

  // Ground: golden sand over the whole hill, a worn path up the middle
  out.ground = [
    { x: 0, z: 0, hw: 12.2, hd: 15.2, color: C.sand, feather: 2.6 },
    { x: -0.5, z: 11.2, hw: 1.5, hd: 4.6, color: '#e6bf86', feather: 0.9 },
    { x: SPOT.fire.x, z: SPOT.fire.z, hw: 1.0, hd: 0.9, color: '#dcb27a', feather: 0.7 },
    { x: SPOT.kick.x, z: 9.3, hw: 2.0, hd: 2.4, color: '#eac692', feather: 1.0 },
  ];

  // Colliders for the props on the hill (the terraces are in layout.js)
  out.colliders.push(
    { type: 'box', x: SPOT.tent.x, z: SPOT.tent.z - out.tent.D / 2 - 0.05, hw: out.tent.W / 2 + 0.2, hd: 0.15 },
    { type: 'box', x: SPOT.tent.x - out.tent.W / 2 - 0.05, z: SPOT.tent.z - 0.4, hw: 0.15, hd: out.tent.D / 2 - 0.2 },
    { type: 'circle', x: SPOT.tent.x + out.tent.W / 2, z: SPOT.tent.z + out.tent.D / 2, r: 0.12 },
    { type: 'circle', x: SPOT.tent.x, z: SPOT.tent.z + out.tent.D / 2, r: 0.12 },
    { type: 'circle', x: SPOT.tent.x + out.tent.W / 2, z: SPOT.tent.z - out.tent.D / 2, r: 0.12 },
    { type: 'circle', x: SPOT.tent.x + 0.2, z: SPOT.tent.z + 0.1, r: 0.45, h: 0.34 },
    { type: 'circle', x: SPOT.fire.x, z: SPOT.fire.z, r: 0.5, h: 0.18 },
    { type: 'circle', x: SPOT.camel.x, z: SPOT.camel.z, r: 1.0 },
    { type: 'circle', x: SPOT.camel.x + Math.cos(P * 0.92) * 1.45, z: SPOT.camel.z - Math.sin(P * 0.92) * 1.45, r: 0.42 },
    { type: 'circle', x: SPOT.well.x, z: SPOT.well.z, r: 0.8, h: L1 + 0.74 },
    { type: 'circle', x: SPOT.olive.x, z: SPOT.olive.z, r: 0.35 },
    { type: 'box', x: -7.6, z: 3.2, hw: 1.5, hd: 0.5, h: L1 + 0.32 },
    { type: 'box', x: -7.6, z: 1.4, hw: 1.5, hd: 0.5, h: L1 + 0.32 },
    { type: 'box', x: -3.9, z: 2.3, hw: 0.8, hd: 1.3, h: L1 + 0.32 },
    { type: 'circle', x: -2.8, z: 0.9, r: 0.18 },
    { type: 'circle', x: SPOT.sign.x, z: SPOT.sign.z, r: 0.5 },
    { type: 'circle', x: 1.9, z: 6.8, r: 0.3, h: 0.35 },
    { type: 'circle', x: -1.9, z: 6.8, r: 0.3, h: 0.35 },
    { type: 'circle', x: 2.1, z: -0.6, r: 0.3, h: L1 + 0.35 },
    { type: 'circle', x: -2.1, z: -0.6, r: 0.3, h: L1 + 0.35 },
    { type: 'circle', x: -3.4, z: 13.8, r: 0.3 },
    { type: 'circle', x: 4.2, z: 7.4, r: 0.28 },
    { type: 'circle', x: 9.8, z: 11.0, r: 0.25 },
    { type: 'circle', x: -10.0, z: -0.3, r: 0.28 },
    { type: 'circle', x: -11.0, z: 12.2, r: 0.3 },
    { type: 'circle', x: 11.0, z: 7.2, r: 0.3 },
    { type: 'circle', x: -10.6, z: 4.4, r: 0.3 },
    { type: 'circle', x: 9.6, z: 4.9, r: 0.3 },
    { type: 'circle', x: 11.1, z: 14.6, r: 0.3 },
    { type: 'circle', x: -11.2, z: 14.0, r: 1.0 },
    { type: 'circle', x: -11.4, z: 7.6, r: 0.75 },
    { type: 'circle', x: 11.0, z: 9.4, r: 0.85 },
    { type: 'circle', x: SPOT.goal.x - 1.3, z: SPOT.goal.z, r: 0.24 },
    { type: 'circle', x: SPOT.goal.x + 1.3, z: SPOT.goal.z, r: 0.24 },
    { type: 'circle', x: SPOT.goatStake.x, z: SPOT.goatStake.z, r: 0.06 },
  );
  for (const [x, y, z] of [[-1.8, 0, 6.9], [1.8, 0, 6.9], [-1.75, L1, -0.55], [1.75, L1, -0.55], [-5.6, 0, 13.6]]) out.colliders.push({ type: 'circle', x, z, r: 0.14 });
  return out;
}
