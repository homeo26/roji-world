import * as K from '../../places/home/kit.js';

// Furniture and props for The Little Art Studio, inside and out. Everything faces +Z, base at y = 0.

export * from '../../places/home/kit.js';
const { THREE, box, rbox, cyl, sph, at, rot, mat, mesh } = K;
const P = Math.PI;

export const COL = {
  cream: '#fff4e3',
  paper: '#fffaf1',
  peach: '#ffc9a8',
  coral: '#f6907a',
  rose: '#ef5b6f',
  pink: '#ff9eb5',
  blush: '#ffd1dc',
  red: '#e5484d',
  sun: '#ffd166',
  gold: '#f4c24f',
  orange: '#ff9a3c',
  mint: '#7fd8bf',
  teal: '#3fbf9f',
  sky: '#8fd3ff',
  blue: '#6fb8ff',
  navy: '#3f7bf0',
  lilac: '#c7a6ff',
  purple: '#8b5cf6',
  leaf: '#6cc24a',
  leafDark: '#3f9a4f',
  wood: '#d4a373',
  woodDark: '#9b6a43',
  woodLight: '#e9c79a',
  ink: '#3b2b3f',
  steel: '#d3dbe5',
  white: '#ffffff',
};
export const RAINBOW = ['#ef5b6f', '#ff9a3c', '#ffd166', '#7fd36b', '#6fb8ff', '#8b5cf6', '#ff8fb1'];

// An easel: three legs, a ledge, a canvas (a Mesh you can texture) and a top clamp.
// canvas: { w, h, material } ; cy: canvas centre height. Returns { root, canvas, ledgeY }.
export function makeEasel({ w = 0.9, h = 0.7, cy = 1.25, material = null, wood = COL.wood, tilt = 0.09 } = {}) {
  const g = new THREE.Group();
  const legH = cy + h / 2 + 0.25;
  const legMat = mat(wood, { rough: 0.8 });
  for (const s of [-1, 1]) {
    const leg = at(box(0.05, legH, 0.05, legMat), s * (w / 2 - 0.05), legH / 2 - 0.02, 0.02);
    leg.rotation.z = -s * 0.07;
    leg.rotation.x = -tilt;
    g.add(leg);
  }
  const back = at(box(0.045, legH * 0.95, 0.045, legMat), 0, legH * 0.46, -0.3);
  back.rotation.x = 0.32;
  g.add(back);
  const ledgeY = cy - h / 2 - 0.04;
  g.add(at(box(w + 0.12, 0.05, 0.12, legMat), 0, ledgeY, 0.06 + Math.sin(tilt) * (cy - ledgeY) * 0.2));
  g.add(at(box(0.12, 0.06, 0.08, legMat), 0, cy + h / 2 + 0.03, 0.02));
  const frame = at(box(w, h, 0.035, mat('#f3ead9')), 0, cy, 0.03);
  frame.rotation.x = -tilt;
  g.add(frame);
  let canvas = null;
  if (material) {
    canvas = mesh(new THREE.PlaneGeometry(w - 0.04, h - 0.04), material, { cast: false });
    canvas.position.set(0, cy, 0.03 + 0.019 / Math.cos(tilt));
    canvas.rotation.x = -tilt;
    g.add(canvas);
  }
  return { root: g, canvas, ledgeY };
}

// A round stool, seat at h
export function makeStool(seat = COL.rose, h = 0.46, wood = COL.woodDark) {
  const g = new THREE.Group();
  g.add(at(cyl(0.2, 0.19, 0.07, seat, 14), 0, h - 0.035, 0));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * P * 2;
    const leg = at(cyl(0.022, 0.026, h - 0.05, wood, 6), Math.cos(a) * 0.13, (h - 0.05) / 2, Math.sin(a) * 0.13);
    leg.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
    g.add(leg);
  }
  g.add(at(rot(K.tor(0.12, 0.012, wood, undefined, P * 2, 4, 14), P / 2, 0, 0), 0, h * 0.35, 0));
  return g;
}

// A flower pot with a round bush of flowers. size ~ total height.
export function makeFlowerPot(size = 0.7, pot = COL.coral, flowers = [COL.pink, COL.sun, COL.white], r = Math.random) {
  const g = new THREE.Group();
  const ph = size * 0.42;
  g.add(at(cyl(size * 0.24, size * 0.18, ph, pot, 14), 0, ph / 2, 0));
  g.add(at(cyl(size * 0.26, size * 0.26, size * 0.06, pot, 14), 0, ph - size * 0.02, 0));
  g.add(at(cyl(size * 0.22, size * 0.22, 0.02, '#7a5236', 12), 0, ph + 0.005, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * P * 2 + r();
    g.add(at(sph(size * (0.16 + r() * 0.05), i % 2 ? COL.leaf : COL.leafDark, { rough: 0.85 }, 8), Math.cos(a) * size * 0.12, ph + size * (0.14 + r() * 0.12), Math.sin(a) * size * 0.12));
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * P * 2 + r();
    g.add(at(sph(size * 0.065, flowers[i % flowers.length], { rough: 0.7 }, 6), Math.cos(a) * size * 0.2, ph + size * (0.25 + r() * 0.18), Math.sin(a) * size * 0.2));
  }
  return g;
}

// A paint pot with paint showing on top
export function makePaintPot(color, s = 1) {
  const g = new THREE.Group();
  g.add(at(cyl(0.09 * s, 0.085 * s, 0.13 * s, '#ffffff', 12), 0, 0.065 * s, 0));
  g.add(at(cyl(0.08 * s, 0.08 * s, 0.01, color, 12), 0, 0.131 * s, 0));
  g.add(at(box(0.04 * s, 0.05 * s, 0.006, color), 0.04 * s, 0.1 * s, 0.087 * s)).rotation.y = 0.3;
  return g;
}

// A jar of brushes
export function makeBrushJar(s = 1, jar = '#cfeff5') {
  const g = new THREE.Group();
  g.add(at(cyl(0.07 * s, 0.065 * s, 0.16 * s, mat(jar, { rough: 0.3 }), 12), 0, 0.08 * s, 0));
  const tips = [COL.red, COL.navy, COL.sun, COL.teal];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * P * 2;
    const b = at(cyl(0.009 * s, 0.009 * s, 0.3 * s, COL.woodDark, 5), Math.cos(a) * 0.025 * s, 0.24 * s, Math.sin(a) * 0.025 * s);
    b.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2);
    g.add(b);
    const tip = sph(0.018 * s, tips[i], undefined, 6);
    tip.scale.y = 1.8;
    g.add(at(tip, Math.cos(a) * 0.055 * s, 0.395 * s, Math.sin(a) * 0.055 * s));
  }
  return g;
}

// A cup of pencils
export function makePencilCup(s = 1) {
  const g = new THREE.Group();
  g.add(at(cyl(0.05 * s, 0.05 * s, 0.11 * s, COL.mint, 12), 0, 0.055 * s, 0));
  RAINBOW.slice(0, 5).forEach((c, i) => {
    const a = (i / 5) * P * 2;
    const p = at(cyl(0.008 * s, 0.008 * s, 0.2 * s, c, 6), Math.cos(a) * 0.02 * s, 0.15 * s, Math.sin(a) * 0.02 * s);
    p.rotation.set(Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15);
    g.add(p);
  });
  return g;
}

// A palette lying flat, with paint blobs
export function makePalette(s = 1) {
  const g = new THREE.Group();
  const sh = new THREE.Shape();
  sh.absellipse(0, 0, 0.18 * s, 0.13 * s, 0, P * 2);
  const hole = new THREE.Path();
  hole.absellipse(-0.1 * s, -0.03 * s, 0.025 * s, 0.025 * s, 0, P * 2);
  sh.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false, curveSegments: 10 });
  const p = mesh(geo, mat('#e3b98a'), { cast: false });
  p.rotation.x = -P / 2;
  g.add(p);
  [COL.red, COL.sun, COL.navy, COL.teal, COL.pink, '#ffffff'].forEach((c, i) => {
    const a = -0.6 + i * 0.42;
    const b = sph(0.022 * s, c, { rough: 0.3 }, 6);
    b.scale.y = 0.45;
    g.add(at(b, Math.cos(a) * 0.11 * s, 0.016, -Math.sin(a) * 0.075 * s));
  });
  return g;
}

// A blank or painted canvas leaning (a slab with a face material)
export function makeCanvas(w, h, face = null, back = '#e9dcc6') {
  const g = new THREE.Group();
  g.add(at(box(w, h, 0.04, mat(back)), 0, h / 2, 0));
  if (face) {
    const f = mesh(new THREE.PlaneGeometry(w - 0.03, h - 0.03), face, { cast: false });
    f.position.set(0, h / 2, 0.021);
    g.add(f);
  }
  return g;
}

// A picture frame on a wall (back at z = 0), with an optional picture mesh
export function makeFrame(w, h, color = COL.gold, depth = 0.05, border = 0.06) {
  const g = new THREE.Group();
  const m = mat(color, { rough: 0.5 });
  g.add(at(box(w, border, depth, m), 0, h / 2 - border / 2, depth / 2));
  g.add(at(box(w, border, depth, m), 0, -h / 2 + border / 2, depth / 2));
  g.add(at(box(border, h - border * 2, depth, m), -w / 2 + border / 2, 0, depth / 2));
  g.add(at(box(border, h - border * 2, depth, m), w / 2 - border / 2, 0, depth / 2));
  g.add(at(box(w - border, h - border, 0.012, mat('#f7efe2')), 0, 0, 0.006));
  return g;
}

// A potted plant, a few big leaves
export function makePlant(h = 1.0, pot = COL.coral) {
  const g = new THREE.Group();
  g.add(at(cyl(0.18, 0.14, 0.32, pot, 12), 0, 0.16, 0));
  g.add(at(cyl(0.16, 0.16, 0.02, '#7a5236', 12), 0, 0.31, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * P * 2;
    const l = sph(0.13, i % 2 ? COL.leaf : COL.leafDark, { rough: 0.85 }, 8);
    l.scale.set(0.55, 1.6, 0.3);
    l.position.set(Math.cos(a) * 0.12, 0.32 + h * 0.32 + (i % 3) * 0.08, Math.sin(a) * 0.12);
    l.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    g.add(l);
  }
  return g;
}

// A sleeping cat (for the balcony and the reading nook). Returns { root, tail, body }.
export function makeCat(coat = '#f0a65a', stripe = '#d9823a') {
  const g = new THREE.Group();
  const body = at(sph(0.17, coat, undefined, 12), 0, 0.12, 0);
  body.scale.set(1.25, 0.7, 0.85);
  g.add(body);
  for (const x of [-0.08, 0.04]) {
    const s = at(sph(0.06, stripe, undefined, 8), x, 0.2, 0.02);
    s.scale.set(0.5, 0.4, 1.3);
    g.add(s);
  }
  const head = at(sph(0.1, coat, undefined, 12), 0.2, 0.1, 0.06);
  g.add(head);
  for (const s of [-1, 1]) {
    const ear = at(K.cyl(0, 0.035, 0.06, coat, 4), 0.21 + s * 0.05, 0.19, 0.04);
    ear.rotation.z = -s * 0.3;
    g.add(ear);
    const eye = at(box(0.03, 0.006, 0.006, '#3b2b3f'), 0.2 + s * 0.04, 0.12, 0.155);
    g.add(eye);
  }
  g.add(at(sph(0.012, '#ff8fb1', undefined, 6), 0.2, 0.09, 0.16));
  const tail = new THREE.Group();
  tail.position.set(-0.2, 0.06, 0);
  const tt = at(cyl(0.025, 0.03, 0.26, coat, 6), 0, 0, 0.13);
  tt.rotation.x = P / 2;
  tail.add(tt);
  tail.add(at(sph(0.03, stripe, undefined, 6), 0, 0, 0.26));
  g.add(tail);
  return { root: g, tail, body };
}

// A string of fairy lights: positions along a sagging line, for an InstancedMesh
export function fairyPoints(a, b, n, sag = 0.25) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    out.push(new THREE.Vector3(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k - Math.sin(k * P) * sag, a.z + (b.z - a.z) * k));
  }
  return out;
}

// The wire under a list of points
export function wire(points, color = '#5a4638', r = 0.008) {
  const curve = new THREE.CatmullRomCurve3(points);
  return mesh(new THREE.TubeGeometry(curve, Math.max(8, points.length * 2), r, 4), mat(color), { cast: false });
}

// Instanced bulbs at the given points (alternating materials). Returns the meshes.
export function bulbs(points, materials, r = 0.045) {
  const geo = new THREE.SphereGeometry(r, 8, 6);
  const out = materials.map((m) => {
    const im = new THREE.InstancedMesh(geo, m, Math.ceil(points.length / materials.length));
    im.castShadow = false;
    return im;
  });
  const m4 = new THREE.Matrix4();
  const counts = materials.map(() => 0);
  points.forEach((p, i) => {
    const k = i % materials.length;
    out[k].setMatrixAt(counts[k]++, m4.makeTranslation(p.x, p.y, p.z));
  });
  out.forEach((im, k) => {
    im.count = counts[k];
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
  });
  return out;
}
