// Odeh's hill: a big golden sand hill with dunes and rocky outcrops, a stepped stone path that winds
// up its front (rope posts and lanterns on the way, a resting bench half way), the tent terrace with
// its fire and cushions, Odeh's garden terrace with the well, date palms and cactus on the slopes, a
// sleeping camel and a football goal down in the yard, and the sign by the street.
import { THREE, mat, umat, mesh, box, rbox, cyl, sph, cone, tor, caps, at, sc, panel, canvasTexture, roundRect, FONT, rng, P, C, glowTexture, bakePart } from './kit.js';
import { TOP, TENT_Y, GARDEN_Y, HALF_Y, WALK, SPOT, NOOK, walkAt } from './layout.js';
import { heightAt, sandMesh } from './terrain.js';

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
  const W = 3.6;
  const D = 2.6;
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
  for (const [px, pz, tx, tz] of [[-W / 2, D / 2, -W / 2 - 0.15, D / 2 + 0.75], [W / 2, D / 2, W / 2 + 0.15, D / 2 + 0.75]]) {
    const len = Math.hypot(tx - px, tz - pz, 1.55);
    const rope = cyl(0.012, 0.012, len, '#e8d8b8', 4);
    rope.position.set((px + tx) / 2, 0.78, (pz + tz) / 2);
    rope.lookAt(tx, 0, tz);
    rope.rotateX(P / 2);
    T.add(rope);
    T.add(at(cyl(0.03, 0.02, 0.18, C.woodDark, 5), tx, 0.06, tz));
  }
  // Rug and cushions
  const rugM = mesh(new THREE.PlaneGeometry(D - 0.3, W - 0.4), new THREE.MeshStandardMaterial({ map: rug, roughness: 0.95 }), { cast: false });
  T.add(at(rugM, 0, 0.012, 0, -P / 2, 0, P / 2));
  const cushCols = ['#c0392b', '#e7b54a', '#7a2e3a', '#d9774f', '#2b4a6e'];
  for (let i = 0; i < 3; i++) {
    const cx = -W / 2 + 0.7 + i * 1.0;
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
  T.position.set(x, TENT_Y, z);
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
  F.position.set(x, TENT_Y, z);
  g.add(F);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffb870', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }));
  halo.scale.set(2.4, 2.4, 1);
  halo.position.set(x, TENT_Y + 0.55, z);
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
  holder.rotation.y = -0.15;
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

const UPV = new THREE.Vector3(0, 1, 0);
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
  g.add(at(cyl(0.03, 0.03, 0.4, C.woodDark, 6), sx, TOP + 0.2, sz));
  const rope = cyl(0.008, 0.008, 1, '#e8d8b8', 4);
  g.add(rope);
  dynamic.push(rope);
  const st = { a: 0, r: 1.0, t: 0, nibble: 0, bleat: 0, x: sx + 1, z: sz, yaw: 0, speed: 0, react: 0 };
  const ropeDir = new THREE.Vector3();
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
      holder.position.set(st.x, TOP, st.z);
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
      rope.position.set(mx, TOP + 0.42, mz);
      rope.scale.set(1, len, 1);
      ropeDir.set(nx - sx, 0.37, nz - sz).normalize();
      rope.quaternion.setFromUnitVectors(UPV, ropeDir);
    },
  };
}

// ---------------------------------------------------------------- the garden
export const GARDEN_BEDS = [
  { x: 9.25, z: 6.3, w: 2.3, d: 0.8, kind: 'tomato' },
  { x: 9.25, z: 5.05, w: 2.3, d: 0.8, kind: 'mint' },
  { x: 9.25, z: 3.8, w: 2.3, d: 0.8, kind: 'pepper' },
];
export const SCARECROW = { x: 10.45, z: 2.55 };
function garden(g, dynamic) {
  const out = { plants: [] };
  const Y = GARDEN_Y;
  for (const b of GARDEN_BEDS) {
    g.add(at(box(b.w, 0.26, b.d, C.woodDark), b.x, Y + 0.13, b.z));
    g.add(at(box(b.w - 0.16, 0.05, b.d - 0.16, '#6b4a30'), b.x, Y + 0.265, b.z));
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
    bed.position.set(b.x, Y + 0.27, b.z);
    g.add(bed);
    dynamic.push(bed);
    bakePart(bed);
    out.plants.push(bed);
  }
  // Sunflowers along the hill side of the garden
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
    f.position.set(10.5 - (i % 2) * 0.12, Y, 3.55 + i * 0.95);
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
  crow.position.set(SCARECROW.x, Y, SCARECROW.z);
  crow.rotation.y = -0.5;
  g.add(crow);
  // Watering can
  out.can = wateringCan();
  out.can.position.set(SPOT.can.x, Y, SPOT.can.z);
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
  W.position.set(x, GARDEN_Y, z);
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

// ---------------------------------------------------------------- the path, its walls and rope posts
const SIDES = [
  { id: 'N', axis: 'x', line: (r) => r.z0, a0: (r) => r.x0, a1: (r) => r.x1, n: [0, -1] },
  { id: 'S', axis: 'x', line: (r) => r.z1, a0: (r) => r.x0, a1: (r) => r.x1, n: [0, 1] },
  { id: 'W', axis: 'z', line: (r) => r.x0, a0: (r) => r.z0, a1: (r) => r.z1, n: [-1, 0] },
  { id: 'E', axis: 'z', line: (r) => r.x1, a0: (r) => r.z0, a1: (r) => r.z1, n: [1, 0] },
];
const onLine = (S, line, a, off = 0) => (S.axis === 'x' ? { x: a, z: line + S.n[1] * off } : { x: line + S.n[0] * off, z: a });

// Every edge of every walkable piece, cut in 0.25 m chunks: what lies beyond it decides what it gets
// (a retaining wall where the sand rises, rope posts where it falls away, a parapet round the courtyard)
function edgeRuns() {
  const lines = new Map();
  for (const r of WALK) {
    for (const S of SIDES) {
      const line = S.line(r);
      const key = `${S.id}:${line.toFixed(3)}`;
      if (!lines.has(key)) lines.set(key, { S, line, chunks: [] });
      const L = lines.get(key);
      for (let a = S.a0(r) + 0.125; a < S.a1(r) - 0.01; a += 0.25) {
        const p = onLine(S, line, a, 0.125);
        const nb = walkAt(p.x, p.z);
        if (nb) {
          if (nb.h < r.h - 0.01) L.chunks.push({ a, r, nb, type: 'riser' });
          continue;
        }
        const q = onLine(S, line, a, 0.42);
        const out = heightAt(q.x, q.z);
        const type = r.kind === 'court' ? 'parapet' : r.h < 0.1 && out < 0.08 ? 'open' : out > r.h - 0.06 ? 'wall' : 'posts';
        L.chunks.push({ a, r, out, type });
      }
    }
  }
  const runs = [];
  for (const L of lines.values()) {
    L.chunks.sort((p, q) => p.a - q.a);
    let cur = null;
    for (const c of L.chunks) {
      const same = cur && cur.type === c.type && c.a - cur.chunks[cur.chunks.length - 1].a < 0.4 && (c.type !== 'riser' || cur.chunks[0].r === c.r);
      if (!same) {
        cur = { S: L.S, line: L.line, type: c.type, chunks: [] };
        runs.push(cur);
      }
      cur.chunks.push(c);
    }
  }
  return runs;
}

function buildPath(g, out, glass, brass) {
  const r = rng(77);
  const stones = ['#eadbbf', '#e2d0b0', '#efe2ca'];
  // Treads: stone slabs, each 0.09 m above the last, with a few flagstones on top
  WALK.forEach((w, i) => {
    if (w.kind !== 'pave' && w.kind !== 'apron') return;
    const sx = w.x1 - w.x0;
    const sz = w.z1 - w.z0;
    const top = w.kind === 'apron' ? 0.014 : w.h;
    const depth = w.kind === 'apron' ? 0.2 : 0.45;
    g.add(at(box(sx, depth, sz, stones[i % 3]), (w.x0 + w.x1) / 2, top - depth / 2, (w.z0 + w.z1) / 2));
    const n = Math.max(1, Math.round((sx * sz) / 1.1));
    for (let k = 0; k < n; k++) {
      const fw = 0.38 + r() * 0.3;
      const fd = 0.34 + r() * 0.3;
      const fx = w.x0 + 0.1 + fw / 2 + r() * Math.max(0, sx - fw - 0.2);
      const fz = w.z0 + 0.1 + fd / 2 + r() * Math.max(0, sz - fd - 0.2);
      g.add(at(box(fw, 0.016, fd, r() < 0.5 ? '#f6ecd9' : '#d8c6a6'), fx, top + 0.006, fz, 0, (r() - 0.5) * 0.3, 0));
    }
  });
  for (const run of edgeRuns()) {
    const { S, line, type, chunks } = run;
    const [nx, nz] = S.n;
    const len = chunks[chunks.length - 1].a - chunks[0].a + 0.25;
    const mid = (chunks[0].a + chunks[chunks.length - 1].a) / 2;
    const rect = chunks[0].r;
    const piece = (alen, thick, y0, y1, off, a, color) => {
      const p = onLine(S, line, a, off);
      const bx = S.axis === 'x' ? alen : thick;
      const bz = S.axis === 'x' ? thick : alen;
      g.add(at(box(bx, y1 - y0, bz, color), p.x, (y0 + y1) / 2, p.z));
    };
    // Stone edging round the sand terraces
    if (rect.kind === 'sand' && type !== 'riser') piece(len, 0.18, rect.h - 0.35, rect.h + 0.025, -0.09, mid, C.stoneEdge);
    if (type === 'riser') {
      const low = chunks[0].nb.h;
      if (rect.kind === 'pave') piece(len, 0.12, rect.h - 0.02, rect.h + 0.012, -0.06, mid, C.stoneEdge);
      else piece(len, 0.24, low - 0.1, rect.h + 0.012, -0.12, mid, C.stoneEdge);
    } else if (type === 'wall') {
      // Retaining wall: as tall as the sand behind it, in steps of 0.12 m
      let seg = null;
      const flush = () => {
        if (!seg) return;
        // Reach the ends of the tread, so the wall has no gaps between treads
        const e0 = seg.a0 - 0.125 - S.a0(seg.r) < 0.26 ? S.a0(seg.r) : seg.a0 - 0.125;
        const e1 = S.a1(seg.r) - (seg.a1 + 0.125) < 0.26 ? S.a1(seg.r) : seg.a1 + 0.125;
        const l = e1 - e0;
        const m = (e0 + e1) / 2;
        piece(l, 0.26, seg.h - 0.35, seg.top, 0.13, m, '#d6ab78');
        piece(l + 0.02, 0.32, seg.top, seg.top + 0.06, 0.13, m, '#f1e4cb');
        seg = null;
      };
      for (const c of chunks) {
        const top = +(c.r.h + 0.42).toFixed(3);
        if (seg && seg.r === c.r && c.a - seg.a1 < 0.4) seg.a1 = c.a;
        else {
          flush();
          seg = { a0: c.a, a1: c.a, top, h: c.r.h, r: c.r };
        }
      }
      flush();
    } else if (type === 'parapet') {
      const bottom = Math.max(TOP - 2.6, Math.min(...chunks.map((c) => c.out)) - 0.3);
      piece(len, 0.22, bottom, TOP + 0.55, 0.11, mid, C.lime);
      piece(len + 0.06, 0.3, TOP + 0.55, TOP + 0.63, 0.11, mid, C.stoneEdge);
    } else if (type === 'posts') {
      // Wooden posts planted in the slope with a rope between them; every third holds a lantern
      const a0 = chunks[0].a - 0.125;
      const a1 = chunks[chunks.length - 1].a + 0.125;
      const n = Math.max(2, Math.round((a1 - a0) / 1.15) + 1);
      const posts = [];
      for (let i = 0; i < n; i++) {
        const a = a0 + ((a1 - a0) * i) / (n - 1) + (i === 0 ? 0.08 : i === n - 1 ? -0.08 : 0);
        const c = chunks.reduce((b, q) => (Math.abs(q.a - a) < Math.abs(b.a - a) ? q : b));
        const p = onLine(S, line, a, 0.14);
        const top = c.r.h + 0.62;
        const base = Math.min(top - 0.4, heightAt(p.x, p.z) - 0.12);
        g.add(at(cyl(0.055, 0.065, top - base, C.woodDark, 6), p.x, (top + base) / 2, p.z));
        g.add(at(sph(0.07, C.wood, 6, 4), p.x, top, p.z));
        posts.push({ p, top });
        if (i % 3 === 1 && a1 - a0 > 1.6) {
          const lan = lantern(glass, brass);
          lan.scale.setScalar(0.75);
          lan.position.set(p.x, top + 0.02, p.z);
          g.add(lan);
          out.halos.push(new THREE.Vector3(p.x, top + 0.2, p.z));
        }
      }
      for (let i = 0; i < posts.length - 1; i++) {
        const A = posts[i];
        const B = posts[i + 1];
        const va = new THREE.Vector3(A.p.x, A.top - 0.1, A.p.z);
        const vb = new THREE.Vector3(B.p.x, B.top - 0.1, B.p.z);
        const vm = va.clone().lerp(vb, 0.5);
        vm.y -= 0.09;
        const tube = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(va, vm, vb), 4, 0.022, 3, false);
        g.add(mesh(tube, mat('#e8d3a8'), { cast: false }));
      }
    }
  }
}

// A sandstone outcrop: a few chunky rocks sunk into the slope (never onto the path)
function outcrop(g, x, z, s, seed) {
  const r = rng(seed);
  const cols = ['#cf9f66', '#c08d55', '#d8ad74', '#b9824c'];
  const n = 2 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const rs = s * (0.55 + r() * 0.5);
    const rx = x + (r() - 0.5) * s * 1.1;
    const rz = z + (r() - 0.5) * s * 0.9;
    let clear = true;
    for (const [dx, dz] of [[rs, 0], [-rs, 0], [0, rs], [0, -rs], [0, 0]]) if (walkAt(rx + dx, rz + dz, 0.08)) clear = false;
    if (!clear) continue;
    const rock = mesh(new THREE.DodecahedronGeometry(1, 0), mat(cols[Math.floor(r() * cols.length)], { rough: 0.9 }));
    rock.scale.set(rs, rs * (0.55 + r() * 0.3), rs * (0.7 + r() * 0.3));
    rock.rotation.set(r() * 0.5, r() * P, r() * 0.4);
    rock.position.set(rx, heightAt(rx, rz) - rs * 0.12, rz);
    g.add(rock);
  }
}

function smallBench(g, x, y, z, ry = 0) {
  const B = new THREE.Group();
  B.add(at(rbox(1.6, 0.1, 0.5, C.wood, 0.03), 0, 0.42, 0));
  for (const s of [1, -1]) B.add(at(box(0.1, 0.42, 0.42, C.woodDark), s * 0.7, 0.21, 0));
  B.add(at(rbox(1.6, 0.42, 0.08, C.wood, 0.03), 0, 0.7, -0.22));
  B.add(at(rbox(0.68, 0.09, 0.42, '#e7b54a', 0.04), -0.37, 0.51, 0.02));
  B.add(at(rbox(0.68, 0.09, 0.42, '#c0392b', 0.04), 0.37, 0.51, 0.02));
  B.position.set(x, y, z);
  B.rotation.y = ry;
  g.add(B);
  return B;
}

// "Almost there, habibti": Homama's little hand-painted sign, exactly half way up (an easter egg)
function halfwaySign(g, x, z) {
  const y = heightAt(x, z) - 0.1;
  const top = HALF_Y + 1.05;
  const postTop = top - 0.34;
  g.add(at(box(0.07, postTop - y, 0.07, C.woodDark), x, (postTop + y) / 2, z));
  const board = panel(0.94, 0.5, 256, 136, (c, w, h) => {
    c.fillStyle = '#c99a6b';
    roundRect(c, 0, 0, w, h, 18);
    c.fill();
    c.fillStyle = '#f7e9cf';
    roundRect(c, 8, 8, w - 16, h - 16, 14);
    c.fill();
    c.fillStyle = '#7a4a2a';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 34px ${FONT}`;
    c.fillText('Almost there,', w / 2, 46);
    c.fillStyle = '#ef5b6f';
    c.font = `700 40px ${FONT}`;
    c.fillText('habibti', w / 2 - 14, 92);
    // A little heart and an H in the corner
    c.beginPath();
    const hx = w - 50;
    const hy = 88;
    c.moveTo(hx, hy + 12);
    c.bezierCurveTo(hx - 18, hy, hx - 9, hy - 13, hx, hy - 4);
    c.bezierCurveTo(hx + 9, hy - 13, hx + 18, hy, hx, hy + 12);
    c.fill();
    c.fillStyle = '#3f7bf0';
    c.font = `700 18px ${FONT}`;
    c.fillText('H', w - 24, h - 24);
  });
  board.position.set(x, top - 0.12, z + 0.08);
  board.rotation.set(-0.04, 0.32, 0.04);
  g.add(board);
  // An arrow pointing up the hill
  const arrow = panel(0.3, 0.16, 96, 48, (c, w, h) => {
    c.fillStyle = '#c99a6b';
    c.beginPath();
    c.moveTo(4, 14);
    c.lineTo(62, 14);
    c.lineTo(62, 2);
    c.lineTo(92, 24);
    c.lineTo(62, 46);
    c.lineTo(62, 34);
    c.lineTo(4, 34);
    c.fill();
  });
  arrow.position.set(x + 0.08, top + 0.26, z + 0.09);
  arrow.rotation.set(0, 0.32, 0.55);
  g.add(arrow);
}

// ---------------------------------------------------------------- build
export function buildHill(ctx, out) {
  const { g, dynamic } = out;
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: 0.92 });
  out.stoneMat = stoneMat;
  // Lantern glass: one glowing material for all (the game brightens it after dark)
  const glass = umat('#ffd88a', { emissive: '#ffb347', ei: 0.55, rough: 0.4 });
  out.glass = glass;
  out.glassBase = 0.55;
  const brass = mat(C.brass, { rough: 0.4, metal: 0.4 });
  out.halos = [];

  // The sand hill itself, and the stepped stone path with its walls and rope posts
  g.add(sandMesh());
  buildPath(g, out, glass, brass);

  // Stepping stones from the pad to the foot of the path
  for (let i = 0; i < 5; i++) {
    const k = i / 4;
    const s = rbox(0.62, 0.05, 0.48, i % 2 ? '#e3cfa6' : '#ecdbb8', 0.04);
    g.add(at(s, -0.7 + k * 3.6, 0.012, 15.0 - k * 3.1, 0, 0.5 + i * 0.3, 0));
  }

  // Rocky outcrops on the slopes
  [
    [3.3, 8.15, 0.62], [5.1, 8.2, 0.7], [-4.1, 2.2, 0.85], [-7.2, 2.7, 0.8], [4.2, 3.85, 0.55], [-4.4, 12.05, 0.45],
    [9.2, 8.6, 0.7], [-11.5, -4.2, 1.0], [-10.7, -9.4, 0.9], [-3.2, -14.6, 0.95], [3.6, -14.4, 0.9], [9.1, -14.1, 0.85],
    [11.5, -5.6, 1.0], [11.7, 1.3, 0.75], [-11.8, 1.8, 0.7], [0.4, 7.9, 0.45], [7.9, -0.15, 0.32],
  ].forEach(([x, z, s], i) => outcrop(g, x, z, s, 31 + i * 7));

  // Date palms, cactus and aloe on the slopes and in the yard
  const onSand = (x, z) => heightAt(x, z) - 0.1;
  out.palms = [
    datePalm(g, -11.8, onSand(-11.8, 2.4), 2.4, 4.2, 3),
    datePalm(g, -11.5, onSand(-11.5, 8.2), 8.2, 4.4, 7),
    datePalm(g, 11.5, onSand(11.5, -1.2), -1.2, 4.6, 11),
    datePalm(g, 5.45, onSand(5.45, 9.5), 9.5, 3.8, 13),
    datePalm(g, -10.3, onSand(-10.3, -11.4), -11.4, 4.4, 17),
    datePalm(g, 10.3, onSand(10.3, -11.6), -11.6, 4.0, 19),
    datePalm(g, -11.7, 0, 13.9, 3.6, 23),
    datePalm(g, 11.8, 0, 13.6, 4.2, 29),
    datePalm(g, 12.3, onSand(12.3, 8.8), 8.8, 3.6, 37),
  ];
  for (const [x, z, h, seed] of [[-2.9, 8.15, 1.3, 4], [1.2, 8.2, 1.0, 8], [-11.8, 5.2, 1.2, 12], [9.7, 7.9, 1.1, 16], [12.0, 6.6, 0.9, 20], [-7.1, 3.7, 1.0, 24], [-9.6, 1.0, 1.3, 28]]) cactus(g, x, onSand(x, z), z, h, seed);
  for (const [x, z, s, seed] of [[-1.6, 8.5, 0.8, 5], [6.0, 4.0, 0.7, 6], [-11.9, 11.2, 0.8, 9], [11.9, 9.2, 0.8, 10], [-6.3, 1.4, 0.75, 14]]) aloe(g, x, onSand(x, z), z, s, seed);
  aloe(g, 1.55, 0, 11.9, 0.9, 15, true);
  aloe(g, 4.95, 0, 11.9, 0.9, 18, true);
  for (const [x, z, s] of [[-0.4, 8.6, 1], [-5.4, 8.3, 0.85], [8.6, 9.6, 0.9], [-9.8, 12.0, 0.8], [5.2, 2.7, 0.75]]) barrelCactus(g, x, onSand(x, z) + 0.05, z, s);

  // The olive tree in the courtyard, with R + H carved in its trunk
  oliveTree(g, SPOT.olive.x, TOP, SPOT.olive.z);
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
  carve.position.set(SPOT.olive.x + 0.04, TOP + 0.62, SPOT.olive.z + 0.27);
  carve.rotation.set(0, 0.05, -0.12);
  g.add(carve);

  // The tent, the fire, the camel, the goat, the garden and the well
  out.tent = tent(g, dynamic, weaveTex(), rugTex());
  out.fire = firePit(g, dynamic);
  out.camel = makeCamel(g, dynamic);
  out.goat = makeGoat(g, dynamic);
  out.garden = garden(g, dynamic);
  out.well = well(g, dynamic, stoneMat);
  // Two floor cushions by the fire, where Roji and Homama sit
  for (const [cx, cz, col] of [[-9.65, 8.55, '#c0392b'], [-8.5, 8.55, '#2b4a6e']]) g.add(at(rbox(0.56, 0.12, 0.5, col, 0.05), cx, TENT_Y + 0.06, cz));
  g.add(at(rbox(0.5, 0.12, 0.56, '#e7b54a', 0.05), -10.35, TENT_Y + 0.06, 9.55));

  // The resting bench in its nook half way up, with Homama's sign and a lantern
  smallBench(g, SPOT.bench2.x, HALF_Y, SPOT.bench2.z);
  halfwaySign(g, NOOK.x0 - 0.22, 4.5);
  {
    const x = NOOK.x1 + 0.2;
    const z = 4.25;
    const base = heightAt(x, z) - 0.1;
    const top = HALF_Y + 0.95;
    g.add(at(cyl(0.045, 0.055, top - base, '#3b2b3f', 7), x, (top + base) / 2, z));
    const lan = lantern(glass, brass);
    lan.scale.setScalar(0.8);
    lan.position.set(x, top, z);
    g.add(lan);
    out.halos.push(new THREE.Vector3(x, top + 0.22, z));
  }

  // A little goal for kicking a ball about in the yard: two water jugs and a line in the sand
  for (const s of [-1, 1]) {
    const jug = new THREE.Group();
    jug.add(at(cyl(0.2, 0.22, 0.5, '#3f7bf0', 12), 0, 0.25, 0));
    jug.add(at(cyl(0.07, 0.09, 0.12, '#3f7bf0', 8), 0, 0.56, 0));
    jug.add(at(tor(0.08, 0.02, '#3f7bf0', 4, 10, P), 0.1, 0.46, 0, 0, 0, -P / 2));
    jug.position.set(SPOT.goal.x + s * 1.3, 0, SPOT.goal.z);
    g.add(jug);
  }
  out.ball = new THREE.Group();
  out.ball.add(sph(0.15, '#ffffff', 14, 10));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * P * 2;
    out.ball.add(at(sph(0.05, '#3b2b3f', 6, 4), Math.sin(a) * 0.12, Math.cos(a) * 0.08, Math.cos(a) * 0.07));
  }
  out.ball.position.set(SPOT.kick.x, 0.15, SPOT.kick.z - 0.4);
  bakePart(out.ball);
  g.add(out.ball);
  dynamic.push(out.ball);

  // Lamp posts at the foot of the path; hanging lanterns at the tent front
  lampPost(g, glass, 1.85, 0, 11.65, out.halos);
  lampPost(g, glass, 4.4, 0, 11.65, out.halos);
  for (const [lx, lz] of [[-1.4, 1.38], [1.4, 1.38]]) {
    const l = lantern(glass, brass);
    l.position.set(SPOT.tent.x + lx, TENT_Y + 0.72, SPOT.tent.z + lz);
    g.add(l);
    out.halos.push(new THREE.Vector3(SPOT.tent.x + lx, TENT_Y + 0.94, SPOT.tent.z + lz));
  }

  // Two small dunes in the yard corners
  const duneMat = mat(C.dune, { rough: 0.95 });
  for (const [x, z, sx, sy, sz] of [[-10.9, 14.5, 1.3, 0.34, 0.8], [11.2, 11.6, 1.0, 0.3, 0.9]]) {
    const d = mesh(new THREE.SphereGeometry(1, 18, 8, 0, P * 2, 0, P / 2), duneMat);
    d.scale.set(sx, sy, sz);
    d.position.set(x, -0.02, z);
    g.add(d);
  }

  // The sign by the street
  const sign = ctx.sign(['Welcome to', "Odeh's Home"], { width: 2.5, height: 1.05, accent: '#c8743f', postHeight: 0.9, color: '#8a5a3a' });
  sign.position.set(SPOT.sign.x, 0, SPOT.sign.z);
  sign.rotation.y = 0.16;
  g.add(sign);

  // Ground: golden sand round the whole hill, a worn path from the pad, the kicking spot
  out.ground = [
    { x: 0, z: -1.5, hw: 6.5, hd: 9.5, color: '#e9bd80', feather: 6.8 },
    { x: 0, z: 13.3, hw: 11.6, hd: 1.4, color: '#efcb92', feather: 1.6 },
    { x: 1.1, z: 13.4, hw: 1.2, hd: 1.9, color: '#e2b47a', feather: 1.0 },
    { x: SPOT.kick.x, z: 12.6, hw: 2.0, hd: 2.0, color: '#ecc790', feather: 1.0 },
  ];

  // Colliders for the props (the treads, terraces and slopes are in layout.js and terrain.js)
  const T = SPOT.tent;
  const W = out.tent.W;
  const D = out.tent.D;
  out.colliders.push(
    { type: 'box', x: T.x, z: T.z - D / 2 - 0.05, hw: W / 2 + 0.15, hd: 0.15 },
    { type: 'box', x: T.x - W / 2 - 0.05, z: T.z - 0.2, hw: 0.15, hd: D / 2 - 0.15 },
    { type: 'circle', x: T.x + W / 2, z: T.z + D / 2, r: 0.12 },
    { type: 'circle', x: T.x, z: T.z + D / 2, r: 0.12 },
    { type: 'circle', x: T.x - W / 2, z: T.z + D / 2, r: 0.12 },
    { type: 'circle', x: T.x + W / 2, z: T.z - D / 2, r: 0.12 },
    { type: 'circle', x: T.x + 0.2, z: T.z + 0.1, r: 0.45, h: TENT_Y + 0.34 },
    { type: 'circle', x: T.x + W / 2 + 0.15, z: T.z + D / 2 + 0.75, r: 0.06 },
    { type: 'circle', x: T.x - W / 2 - 0.15, z: T.z + D / 2 + 0.75, r: 0.06 },
    { type: 'circle', x: SPOT.fire.x, z: SPOT.fire.z, r: 0.55 },
    { type: 'circle', x: SPOT.camel.x, z: SPOT.camel.z, r: 1.0 },
    { type: 'circle', x: SPOT.camel.x + Math.cos(-0.15) * 1.45, z: SPOT.camel.z + Math.sin(-0.15) * -1.45, r: 0.42 },
    { type: 'circle', x: SPOT.camel.x - 1.0, z: SPOT.camel.z, r: 0.55 },
    { type: 'circle', x: SPOT.well.x, z: SPOT.well.z, r: 0.8, h: GARDEN_Y + 0.74 },
    { type: 'circle', x: SPOT.olive.x, z: SPOT.olive.z, r: 0.35 },
    ...GARDEN_BEDS.map((b) => ({ type: 'box', x: b.x, z: b.z, hw: b.w / 2, hd: b.d / 2, h: GARDEN_Y + 0.32 })),
    { type: 'box', x: 10.48, z: 4.95, hw: 0.27, hd: 1.75 }, // the sunflowers
    { type: 'circle', x: SCARECROW.x, z: SCARECROW.z, r: 0.2 },
    { type: 'box', x: SPOT.bench2.x, z: SPOT.bench2.z - 0.02, hw: 0.82, hd: 0.27, h: HALF_Y + 0.5 },
    { type: 'circle', x: SPOT.sign.x, z: SPOT.sign.z, r: 0.5 },
    { type: 'circle', x: SPOT.sign.x - 0.84, z: SPOT.sign.z + 0.13, r: 0.36 },
    { type: 'circle', x: SPOT.sign.x + 0.84, z: SPOT.sign.z - 0.13, r: 0.36 },
    { type: 'circle', x: SPOT.goal.x - 1.3, z: SPOT.goal.z, r: 0.24 },
    { type: 'circle', x: SPOT.goal.x + 1.3, z: SPOT.goal.z, r: 0.24 },
    { type: 'circle', x: SPOT.goatStake.x, z: SPOT.goatStake.z, r: 0.06 },
    { type: 'circle', x: 1.85, z: 11.65, r: 0.14 },
    { type: 'circle', x: 4.4, z: 11.65, r: 0.14 },
    { type: 'circle', x: 1.55, z: 11.9, r: 0.3, h: 0.35 },
    { type: 'circle', x: 4.95, z: 11.9, r: 0.3, h: 0.35 },
    { type: 'circle', x: -11.7, z: 13.9, r: 0.3 },
    { type: 'circle', x: 11.8, z: 13.6, r: 0.3 },
    { type: 'circle', x: -10.9, z: 14.5, r: 1.0 },
    { type: 'circle', x: 11.2, z: 11.6, r: 0.8 },
  );
  return out;
}
