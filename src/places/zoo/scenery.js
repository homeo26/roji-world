import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mesh, rng } from '../../util.js';

// Everything in the zoo that does not move. Local coordinates: footprint 24 x 20 centred on the origin,
// front (street) toward +Z. Returns { group, instanced, colliders }.

export const DECK = { x0: -5.2, x1: -0.8, z0: -2.45, z1: -0.6, h: 1.75 };
export const STAIRS = { x0: -2.55, x1: -1.25, depth: 0.28, n: 6, rise: 0.25 };
export const FENCE = { x0: -11.5, x1: 5.2, z0: -9.7, z1: -2.6 };
export const POOL = { x0: 6.2, x1: 11.5, z0: -9.4, z1: -2.7 };
export const POND = { x: -7.4, z: 5.0, rx: 2.5, rz: 1.6 };
export const GARDEN = { x0: 5.0, x1: 9.8, z0: 3.3, z1: 6.8 };
export const PHOTO = { x: 2.3, z: -1.7 };
export const TREE = { x: 2.4, z: -7.6 };
export const BENCHES = [{ x: -3.25, z: 3.3, yaw: 0 }, { x: 3.25, z: 3.3, yaw: 0 }];
export const HOUSE = { x: -9.2, z: -8.5, w: 3.2, d: 2.2 };
export const FEEDER = { x: -5.6, z: -9.0 };
export const TROUGH = { x: 0.9, z: -9.05 };
export const LOG = { x: -3.3, z: -9.05 };

const WOOD = '#a8764a';
const WOOD_DK = '#7b4f2f';
const PLANK = '#c98a5a';
const CREAM = '#fff3df';
const PINK = '#ff8fb1';
const CORAL = '#ef5b6f';
const TEAL = '#21a99a';
const SUN = '#ffd166';

const geoCache = new Map();
const G = (key, make) => (geoCache.has(key) ? geoCache.get(key) : (geoCache.set(key, make()), geoCache.get(key)));
const box = (w, h, d, c, o) => mesh(G(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d)), mat(c, o));
const rbox = (w, h, d, c, r = 0.06, o) => mesh(G(`r${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 2, r)), mat(c, o));
const cyl = (a, b, h, c, seg = 14, o) => mesh(G(`c${a}|${b}|${h}|${seg}`, () => new THREE.CylinderGeometry(a, b, h, seg)), mat(c, o));
const sph = (r, c, seg = 14, o) => mesh(G(`s${r}|${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7)))), mat(c, o));
const at = (o, x, y, z) => (o.position.set(x, y, z), o);

// Flat ground shapes: shape space (x, y) maps to ground (x, -z)
function rr(x0, z0, x1, z1, r) {
  const s = new THREE.Shape();
  const a = x0;
  const b = -z1;
  const w = x1 - x0;
  const h = z1 - z0;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(a + r, b);
  s.lineTo(a + w - r, b);
  s.quadraticCurveTo(a + w, b, a + w, b + r);
  s.lineTo(a + w, b + h - r);
  s.quadraticCurveTo(a + w, b + h, a + w - r, b + h);
  s.lineTo(a + r, b + h);
  s.quadraticCurveTo(a, b + h, a, b + h - r);
  s.lineTo(a, b + r);
  s.quadraticCurveTo(a, b, a + r, b);
  return s;
}
function ell(x, z, rx, rz) {
  const s = new THREE.Shape();
  s.absellipse(x, -z, rx, rz, 0, Math.PI * 2, false, 0);
  return s;
}
function flat(shape, color, y, o) {
  const m = mesh(new THREE.ShapeGeometry(shape, 10), mat(color, { rough: 1, ...o }), { cast: false });
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  return m;
}

export function buildScenery(atlas) {
  const g = new THREE.Group();
  const colliders = [];
  const instanced = [];
  const add = (...o) => (g.add(...o), o[0]);
  const wall = (x, z, hw, hd, h) => colliders.push(h === undefined ? { type: 'box', x, z, hw, hd } : { type: 'box', x, z, hw, hd, h });
  const r = rng(31);

  // ------------------------------------------------ paths
  const paths = [
    [-1.4, 0.0, 1.4, 10.0, 0.5],
    [-11.2, -2.45, 11.2, 0.25, 0.9],
    [-9.8, 6.9, 9.8, 8.2, 0.6],
  ];
  for (const [x0, z0, x1, z1, rad] of paths) {
    add(flat(rr(x0 - 0.26, z0 - 0.26, x1 + 0.26, z1 + 0.26, rad + 0.26), '#cfb27e', 0.02));
    add(flat(rr(x0, z0, x1, z1, rad), '#f3dfb4', 0.035));
  }
  add(flat(ell(0, 2.6, 3.16, 2.66), '#cfb27e', 0.021));
  add(flat(ell(0, 2.6, 2.9, 2.4), '#f3dfb4', 0.036));
  // Plaza flower bed with a small giraffe-spot mosaic
  add(flat(ell(0, 2.6, 1.15, 0.9), '#cfb27e', 0.038));
  add(flat(ell(0, 2.6, 1.0, 0.78), '#9fd070', 0.04));
  for (const [x, z, s] of [[-0.35, 2.4, 0.22], [0.3, 2.75, 0.18], [0.1, 2.25, 0.14], [-0.2, 2.95, 0.15]]) add(flat(ell(x, z, s, s * 0.85), '#e38e3d', 0.043));

  // ------------------------------------------------ giraffe enclosure
  add(flat(rr(FENCE.x0 + 0.1, FENCE.z0 + 0.1, FENCE.x1 - 0.1, FENCE.z1 - 0.1, 0.4), '#ead39a', 0.025));
  add(flat(ell(-3.2, -6.2, 3.2, 1.6), '#e2c27f', 0.028));
  const post = (x, z, h = 1.4) => {
    add(at(box(0.15, h, 0.15, WOOD), x, h / 2, z));
    add(at(sph(0.1, WOOD_DK, 8), x, h + 0.02, z));
  };
  const railX = (x0, x1, z) => {
    for (const y of [0.62, 1.18]) add(at(box(x1 - x0, 0.1, 0.07, WOOD), (x0 + x1) / 2, y, z));
  };
  const railZ = (z0, z1, x) => {
    for (const y of [0.62, 1.18]) add(at(box(0.07, 0.1, z1 - z0, WOOD), x, y, (z0 + z1) / 2));
  };
  const F = FENCE;
  for (let x = F.x0; x <= F.x1 + 0.01; x += (F.x1 - F.x0) / 14) {
    post(x, F.z1);
    post(x, F.z0);
  }
  for (let z = F.z0; z <= F.z1 + 0.01; z += (F.z1 - F.z0) / 6) {
    post(F.x0, z);
    post(F.x1, z);
  }
  railX(F.x0, F.x1, F.z1);
  railX(F.x0, F.x1, F.z0);
  railZ(F.z0, F.z1, F.x0);
  railZ(F.z0, F.z1, F.x1);
  wall((F.x0 + F.x1) / 2, F.z1, (F.x1 - F.x0) / 2 + 0.1, 0.1);
  wall((F.x0 + F.x1) / 2, F.z0, (F.x1 - F.x0) / 2 + 0.1, 0.1);
  wall(F.x0, (F.z0 + F.z1) / 2, 0.1, (F.z1 - F.z0) / 2);
  wall(F.x1, (F.z0 + F.z1) / 2, 0.1, (F.z1 - F.z0) / 2);

  buildHouse(add, wall);
  buildAcacia(add);
  // Hay feeder on a tall post, at giraffe head height
  add(at(cyl(0.09, 0.11, 3.3, WOOD, 10), FEEDER.x, 1.65, FEEDER.z));
  const basket = at(mesh(new THREE.CylinderGeometry(0.5, 0.34, 0.5, 14, 1, true), mat(WOOD_DK, { side: THREE.DoubleSide })), FEEDER.x, 3.35, FEEDER.z);
  add(basket);
  add(at(cyl(0.34, 0.34, 0.05, WOOD_DK), FEEDER.x, 3.12, FEEDER.z));
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    const hay = at(sph(0.2, '#e9c560', 10), FEEDER.x + Math.cos(a) * 0.24, 3.58 + (k % 2) * 0.05, FEEDER.z + Math.sin(a) * 0.24);
    hay.scale.set(1, 0.6, 1);
    add(hay);
  }
  add(at(sph(0.26, '#f0cf6a', 10), FEEDER.x, 3.66, FEEDER.z));
  // Water trough
  add(at(rbox(1.6, 0.5, 0.66, WOOD, 0.06), TROUGH.x, 0.25, TROUGH.z));
  add(at(box(1.42, 0.04, 0.48, '#86d4e4', { rough: 0.12 }), TROUGH.x, 0.48, TROUGH.z));
  // A fallen log and some rocks
  const log = at(cyl(0.28, 0.3, 2.0, '#8b5e3c', 14), LOG.x, 0.28, LOG.z);
  log.rotation.z = Math.PI / 2;
  log.rotation.y = 0.2;
  add(log);
  for (const s of [1, -1]) {
    const ring = at(cyl(0.24, 0.24, 0.02, '#e9cfa3', 14), LOG.x + Math.cos(0.2) * 1.005 * s, 0.28, LOG.z - Math.sin(0.2) * 1.005 * s);
    ring.rotation.z = Math.PI / 2;
    ring.rotation.y = 0.2;
    add(ring);
  }
  for (const [x, z, s] of [[-10.6, -3.3, 0.5], [-10.25, -3.85, 0.32], [4.5, -9.1, 0.6], [3.9, -9.35, 0.36], [-1.3, -9.3, 0.42], [-6.6, -9.3, 0.3]]) {
    const rock = at(mesh(G('rock', () => new THREE.DodecahedronGeometry(1, 0)), mat('#c9c2b3', { flat: true, rough: 0.9 })), x, s * 0.3, z);
    rock.scale.set(s, s * 0.7, s * 0.9);
    rock.rotation.set(r(), r(), r());
    add(rock);
  }

  // Name plaques on the fence, and a height chart between them
  const plaque = (id, x) => {
    const s = atlas.sign(id, { w: 1.44, h: 0.9, post: 0.42, depth: 0.08 });
    s.position.set(x, 0, F.z1 + 0.14);
    add(s);
  };
  plaque('jodi', -7.4);
  plaque('jouri', 1.3);
  buildHeightChart(add, atlas);

  // ------------------------------------------------ feeding deck
  buildDeck(add, wall, atlas);

  // ------------------------------------------------ photo spot
  const star = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + Math.PI / 2;
    const rad = k % 2 ? 0.32 : 0.7;
    const px = PHOTO.x + Math.cos(a) * rad;
    const py = -PHOTO.z + Math.sin(a) * rad;
    if (k) star.lineTo(px, py);
    else star.moveTo(px, py);
  }
  add(flat(ell(PHOTO.x, PHOTO.z, 0.95, 0.95), CREAM, 0.04));
  add(flat(star, SUN, 0.045, { rough: 0.7 }));
  const ps = atlas.sign('photo', { w: 1.3, h: 0.29, post: 1.5 });
  ps.position.set(4.35, 0, -1.95);
  ps.rotation.y = -0.35;
  add(ps);
  wall(4.35, -1.95, 0.6, 0.12);
  buildCamera(add);
  wall(3.95, 0.55, 0.35, 0.35);

  // ------------------------------------------------ penguin pool
  buildPool(add, wall, atlas);
  // ------------------------------------------------ flamingo pond
  buildPond(add, colliders, atlas, r);
  // ------------------------------------------------ tortoise garden
  buildGarden(add, wall, colliders, atlas);

  // ------------------------------------------------ entrance, hedges, booth, map
  buildArch(add, wall, atlas, colliders);
  const hedge = (x0, z0, x1, z1) => {
    const w = x1 - x0;
    const d = z1 - z0;
    add(at(rbox(w, 0.95, d, '#5aa84f', 0.25), (x0 + x1) / 2, 0.475, (z0 + z1) / 2));
    wall((x0 + x1) / 2, (z0 + z1) / 2, w / 2, d / 2);
  };
  hedge(-11.95, 9.2, -4.3, 9.9);
  hedge(4.3, 9.2, 11.95, 9.9);
  hedge(-11.95, -2.5, -11.25, 9.2);
  hedge(11.25, -2.5, 11.95, 9.2);
  hedge(5.3, -9.6, 6.1, -2.75);
  buildBooth(add, wall, atlas);
  const map = atlas.sign('map', { w: 1.0, h: 0.875, post: 0.75 });
  map.position.set(3.4, 0, 9.35);
  add(map);
  wall(3.4, 9.3, 0.55, 0.12);
  for (const x of [-1.85, 1.85]) {
    add(at(cyl(0.06, 0.08, 2.5, '#2f5d50', 10), x, 1.25, 6.3));
    add(at(sph(0.2, '#fff6d6', 14, { emissive: '#ffe9a8', ei: 0.7 }), x, 2.62, 6.3));
    add(at(mesh(G('lampcap', () => new THREE.ConeGeometry(0.24, 0.2, 12)), mat('#2f5d50')), x, 2.86, 6.3));
    add(at(cyl(0.16, 0.2, 0.1, '#2f5d50', 12), x, 0.05, 6.3));
    colliders.push({ type: 'circle', x, z: 6.3, r: 0.12 });
  }

  // Benches
  for (const b of BENCHES) {
    const bench = buildBench();
    bench.position.set(b.x, 0, b.z);
    bench.rotation.y = b.yaw;
    add(bench);
    wall(b.x, b.z, 0.82, 0.32, 0.47);
  }

  // Round and blossom trees
  for (const [x, z, s, kind] of [[-10.4, 8.2, 1.1, 'round'], [10.4, 8.2, 1.05, 'blossom'], [-10.5, 1.2, 0.95, 'blossom'], [10.5, 1.4, 1.0, 'round'], [-5.4, 8.55, 0.8, 'blossom'], [5.6, 8.55, 0.78, 'round']]) {
    add(at(cyl(0.13 * s, 0.19 * s, 1.4 * s, '#8b5e3c', 8), x, 0.7 * s, z));
    const cols = kind === 'blossom' ? ['#f6a5c0', '#f9bfd2', '#f28db0'] : ['#6dbb58', '#84c95f', '#5aa84f'];
    for (const [dx, dy, dz, k] of [[0, 1.95, 0, 0.95], [0.5, 1.6, 0.25, 0.62], [-0.45, 1.65, -0.2, 0.64]]) {
      const ball = at(mesh(G('ico', () => new THREE.IcosahedronGeometry(1, 1)), mat(cols[Math.floor(r() * 3)], { flat: true, rough: 0.85 })), x + dx * s, dy * s, z + dz * s);
      ball.scale.setScalar(k * s);
      ball.rotation.set(r() * 3, r() * 3, 0);
      add(ball);
    }
    // The low crown hangs at head height, so block the kids at its edge, not only at the trunk
    colliders.push({ type: 'circle', x: x + 0.2 * s, z: z + 0.1 * s, r: 0.85 * s });
  }

  // Keeper's wheelbarrow full of leaves
  const wb = new THREE.Group();
  wb.add(at(rbox(0.9, 0.35, 0.6, '#3f7bf0', 0.05), 0, 0.5, 0));
  wb.add(at(cyl(0.18, 0.18, 0.08, '#3b2b3f', 14), 0, 0.18, 0.52));
  wb.children[1].rotation.z = Math.PI / 2;
  for (const s of [1, -1]) {
    const h = at(box(0.05, 0.05, 0.8, WOOD_DK), 0.3 * s, 0.55, -0.55);
    h.rotation.x = -0.25;
    wb.add(h, at(box(0.05, 0.35, 0.05, WOOD_DK), 0.3 * s, 0.18, -0.15));
  }
  for (let k = 0; k < 7; k++) {
    const leaf = at(sph(0.15, k % 2 ? '#6dbb58' : '#84c95f', 10), (r() - 0.5) * 0.6, 0.72, (r() - 0.5) * 0.35);
    leaf.scale.set(1, 0.55, 1);
    wb.add(leaf);
  }
  wb.position.set(-10.55, 0, 2.75);
  wb.rotation.y = 0.6;
  add(wb);
  colliders.push({ type: 'circle', x: -10.55, z: 2.75, r: 0.5, h: 0.7 });

  // ------------------------------------------------ instanced flowers and tufts
  instanced.push(...buildFlowers(r));
  return { group: g, instanced, colliders };
}

function buildHouse(add, wall) {
  const { x, z, w, d } = HOUSE;
  const front = z + d / 2;
  add(at(rbox(w, 3.5, d, '#fff0dc', 0.08), x, 1.75, z));
  add(at(rbox(w + 0.12, 0.35, d + 0.12, '#e9c9a0', 0.05), x, 0.175, z));
  // Tall giraffe door with a round top
  add(at(box(1.5, 2.6, 0.05, '#6b4a33'), x, 1.3, front + 0.01));
  const top = at(cyl(0.75, 0.75, 0.05, '#6b4a33', 20), x, 2.6, front + 0.01);
  top.rotation.x = Math.PI / 2;
  add(top);
  const trim = at(mesh(G('doorTrim', () => new THREE.TorusGeometry(0.8, 0.07, 6, 20, Math.PI)), mat(WOOD)), x, 2.6, front + 0.04);
  add(trim);
  for (const s of [1, -1]) add(at(box(0.14, 2.6, 0.08, WOOD), x + 0.8 * s, 1.3, front + 0.04));
  // Gable roof
  const tri = new THREE.Shape();
  tri.moveTo(-w / 2, 0);
  tri.lineTo(w / 2, 0);
  tri.lineTo(0, 0.95);
  tri.closePath();
  const gable = mesh(new THREE.ExtrudeGeometry(tri, { depth: d, bevelEnabled: false }), mat('#fff0dc'));
  gable.position.set(x, 3.5, z - d / 2);
  add(gable);
  for (const s of [1, -1]) {
    const slope = at(rbox(1.95, 0.14, d + 0.5, '#e0785f', 0.04), x + 0.82 * s, 3.98, z);
    slope.rotation.z = -0.52 * s;
    add(slope);
  }
  add(at(rbox(0.22, 0.2, d + 0.6, '#c95a4a', 0.06), x, 4.47, z));
  const win = at(cyl(0.3, 0.3, 0.06, '#bfe7f5', 18, { rough: 0.3 }), x, 3.85, front + 0.03);
  win.rotation.x = Math.PI / 2;
  add(win);
  const winTrim = at(mesh(G('winTrim', () => new THREE.TorusGeometry(0.32, 0.05, 6, 20)), mat(WOOD)), x, 3.85, front + 0.05);
  add(winTrim);
  for (const [dx, dy, s] of [[-1.15, 2.6, 0.2], [-1.25, 0.7, 0.12], [1.15, 2.0, 0.22], [1.05, 0.75, 0.14], [-0.95, 3.1, 0.12], [1.2, 3.05, 0.13]]) {
    const sp = at(sph(s, '#e9b77a', 10), x + dx, dy, front + 0.02);
    sp.scale.set(1, 0.85, 0.12);
    add(sp);
  }
  wall(x, z, w / 2 + 0.1, d / 2 + 0.1);
}

function buildAcacia(add) {
  const { x, z } = TREE;
  add(at(cyl(0.17, 0.27, 2.8, '#8b5e3c', 10), x, 1.4, z));
  for (const [s, len, tilt, rot] of [[1, 1.6, 0.55, 0.3], [-1, 1.5, 0.6, -0.4], [0.3, 1.2, 0.3, 1.5]]) {
    const b = at(cyl(0.08, 0.13, len, '#8b5e3c', 8), 0, 0, 0);
    const holder = new THREE.Group();
    b.position.y = len / 2;
    holder.add(b);
    holder.position.set(x, 2.6, z);
    holder.rotation.set(0, rot, -tilt * s);
    add(holder);
  }
  for (const [dx, dy, dz, sx, c] of [[0, 4.55, 0, 1.9, '#7cb342'], [1.0, 4.35, 0.3, 1.2, '#8bc34a'], [-1.1, 4.4, -0.2, 1.25, '#689f38'], [0.2, 4.85, -0.3, 1.1, '#8bc34a']]) {
    const c1 = at(mesh(G('ico1', () => new THREE.IcosahedronGeometry(1, 1)), mat(c, { flat: true, rough: 0.85 })), x + dx, dy, z + dz);
    c1.scale.set(sx, 0.38, sx * 0.8);
    add(c1);
  }
}

function buildHeightChart(add, atlas) {
  const x = -0.3;
  const z = FENCE.z1 + 0.1;
  add(at(rbox(0.2, 4.8, 0.14, CREAM, 0.04), x, 2.4, z));
  for (let k = 0; k < 9; k++) add(at(box(0.22, 0.06, 0.16, k % 2 ? CORAL : TEAL), x, 0.5 + k * 0.5, z));
  add(at(sph(0.16, SUN, 12), x, 4.9, z));
  for (const [id, y] of [['tagJodi', 4.5], ['tagJouri', 4.0], ['tagKids', 1.4]]) {
    const p = atlas.plane(id, 0.72, 0.16);
    p.position.set(x + 0.48, y, z + 0.02);
    add(p);
    add(at(box(0.14, 0.03, 0.03, '#4a3423'), x + 0.07, y, z + 0.08));
  }
}

function buildDeck(add, wall, atlas) {
  const D = DECK;
  const cx = (D.x0 + D.x1) / 2;
  const cz = (D.z0 + D.z1) / 2;
  const w = D.x1 - D.x0;
  const d = D.z1 - D.z0;
  add(at(rbox(w - 0.1, D.h - 0.2, d - 0.1, CREAM, 0.05), cx, (D.h - 0.2) / 2, cz));
  add(at(rbox(w + 0.02, 0.14, d + 0.02, PINK, 0.04), cx, D.h - 0.24, cz));
  const n = 6;
  for (let k = 0; k < n; k++) {
    const pz = D.z0 + (k + 0.5) * (d / n);
    add(at(rbox(w + 0.1, 0.15, d / n - 0.025, k % 2 ? PLANK : '#d39463', 0.02), cx, D.h - 0.075, pz));
  }
  for (const [px, pz] of [[D.x0, D.z0], [D.x1, D.z0], [D.x0, D.z1], [D.x1, D.z1]]) add(at(box(0.2, D.h + 0.6, 0.2, WOOD), px, (D.h + 0.6) / 2, pz));
  // Railings: sides and a low back rail so a giraffe can lean over
  for (const px of [D.x0, D.x1]) {
    add(at(box(0.12, 0.6, 0.12, WOOD), px, D.h + 0.3, cz));
    for (const y of [D.h + 0.3, D.h + 0.56]) add(at(box(0.07, 0.07, d, WOOD), px, y, cz));
    wall(px, cz, 0.08, d / 2);
  }
  for (let k = 1; k < 4; k++) add(at(box(0.1, 0.42, 0.1, WOOD), D.x0 + (k * w) / 4, D.h + 0.21, D.z0));
  add(at(box(w, 0.08, 0.08, WOOD), cx, D.h + 0.42, D.z0));
  add(at(box(STAIRS.x0 - D.x0, 0.1, 0.1, WOOD), (D.x0 + STAIRS.x0) / 2, D.h + 0.05, D.z1));
  add(at(box(D.x1 - STAIRS.x1, 0.1, 0.1, WOOD), (D.x1 + STAIRS.x1) / 2, D.h + 0.05, D.z1));
  wall(cx, cz, w / 2, d / 2, D.h);
  // Painted spots on the skirt
  for (const [x, y, s] of [[-4.75, 1.1, 0.18], [-4.45, 0.45, 0.12], [-1.15, 0.5, 0.16], [-0.95, 1.15, 0.11], [-3.05, 0.35, 0.1]]) {
    const sp = at(sph(s, '#e9b77a', 10), x, y, D.z1 + 0.0);
    sp.scale.set(1, 0.85, 0.15);
    add(sp);
  }
  const s = atlas.sign('deck', { w: 1.5, h: 0.33, post: 0, depth: 0.06 });
  s.position.set(-3.75, 0.95, D.z1 + 0.02);
  add(s);
  const sub = atlas.plane('deckSub', 1.5, 0.165);
  sub.position.set(-3.75, 0.62, D.z1 + 0.012);
  add(sub);
  // Stairs: chunky blocks, each 0.25 m higher, steppable without a jump
  const S = STAIRS;
  const sx = (S.x0 + S.x1) / 2;
  for (let k = 1; k <= S.n; k++) {
    const h = D.h - S.rise * k;
    const z = D.z1 + (k - 0.5) * S.depth;
    add(at(rbox(S.x1 - S.x0, h, S.depth + 0.01, k % 2 ? PLANK : '#d39463', 0.02), sx, h / 2, z));
    wall(sx, z, (S.x1 - S.x0) / 2, S.depth / 2, h);
  }
  const len = S.n * S.depth;
  for (const px of [S.x0 - 0.05, S.x1 + 0.05]) {
    add(at(box(0.1, 0.95, 0.1, WOOD), px, 0.475, D.z1 + len - 0.1));
    const rail = at(box(0.07, 0.07, Math.hypot(len, D.h - 0.25) + 0.1, WOOD), px, (D.h + 0.6 + 0.95) / 2 - 0.05, D.z1 + len / 2 - 0.05);
    rail.rotation.x = Math.atan2(D.h + 0.6 - 0.95, len);
    add(rail);
  }
  // A basket of acacia leaves on the deck
  add(at(cyl(0.22, 0.17, 0.3, WOOD_DK, 12), D.x0 + 0.35, D.h + 0.15, D.z0 + 0.3));
  for (let k = 0; k < 5; k++) {
    const leaf = at(sph(0.1, k % 2 ? '#6dbb58' : '#84c95f', 8), D.x0 + 0.35 + Math.cos(k * 1.3) * 0.1, D.h + 0.33, D.z0 + 0.3 + Math.sin(k * 1.3) * 0.1);
    leaf.scale.set(1, 0.6, 1.3);
    add(leaf);
  }
}

function buildCamera(add) {
  const g = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const leg = at(cyl(0.02, 0.025, 1.25, WOOD_DK, 6), Math.cos(a) * 0.18, 0.6, Math.sin(a) * 0.18);
    leg.rotation.set(Math.sin(a) * 0.28, 0, -Math.cos(a) * 0.28);
    g.add(leg);
  }
  g.add(at(rbox(0.42, 0.3, 0.26, '#3b2b3f', 0.05), 0, 1.32, 0));
  const lens = at(cyl(0.1, 0.11, 0.16, '#4a3a50', 14), 0, 1.32, 0.2);
  lens.rotation.x = Math.PI / 2;
  g.add(lens);
  const glass = at(cyl(0.07, 0.07, 0.02, '#9fd8ff', 14, { rough: 0.2 }), 0, 1.32, 0.285);
  glass.rotation.x = Math.PI / 2;
  g.add(glass, at(box(0.12, 0.08, 0.08, CREAM), -0.1, 1.51, 0), at(box(0.08, 0.05, 0.05, CORAL), 0.12, 1.5, 0));
  g.position.set(3.95, 0, 0.55);
  g.rotation.y = Math.atan2(PHOTO.x - 3.95, PHOTO.z - 0.55);
  add(g);
}

function buildPool(add, wall, atlas) {
  const P = POOL;
  const cx = (P.x0 + P.x1) / 2;
  const cz = (P.z0 + P.z1) / 2;
  const w = P.x1 - P.x0;
  const d = P.z1 - P.z0;
  const side = (x, z, sw, sd) => {
    add(at(rbox(sw, 0.75, sd, '#e3f4fb', 0.06), x, 0.375, z));
    add(at(rbox(sw + 0.08, 0.1, sd + 0.08, '#7fd3c7', 0.04), x, 0.78, z));
  };
  side(cx, P.z1, w, 0.26);
  side(cx, P.z0, w, 0.26);
  side(P.x0, cz, 0.26, d);
  side(P.x1, cz, 0.26, d);
  add(at(box(w - 0.2, 0.06, 3.5, '#7fc9e6', { rough: 0.12 }), cx, 0.3, P.z1 - 1.85));
  add(at(rbox(w - 0.2, 0.52, d - 3.6, '#eef8ff', 0.08, { rough: 0.5 }), cx, 0.26, P.z0 + (d - 3.6) / 2 + 0.05));
  // Igloo
  const igloo = at(mesh(new THREE.SphereGeometry(0.62, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#ffffff', { rough: 0.5 })), 10.4, 0.52, -8.55);
  add(igloo);
  add(at(rbox(0.62, 0.5, 0.5, '#ffffff', 0.2, { rough: 0.5 }), 10.4, 0.76, -7.95));
  const door = at(cyl(0.2, 0.2, 0.02, '#3b4a66', 14), 10.4, 0.6, -7.69);
  door.rotation.x = Math.PI / 2;
  add(door);
  for (const [x, z, s] of [[7.4, -4.0, 0.3], [9.8, -5.1, 0.22], [8.4, -5.6, 0.18], [10.6, -3.6, 0.2]]) {
    const ice = at(mesh(G('iceChunk', () => new THREE.IcosahedronGeometry(1, 0)), mat('#f4fbff', { flat: true, rough: 0.4 })), x, 0.32, z);
    ice.scale.set(s * 1.3, s * 0.5, s);
    add(ice);
  }
  const p = atlas.plane('penguin', 1.5, 0.33);
  p.position.set(cx, 0.4, P.z1 + 0.14);
  add(p);
  wall(cx, cz, w / 2 + 0.05, d / 2 + 0.05);
}

function buildPond(add, colliders, atlas, r) {
  const { x, z, rx, rz } = POND;
  add(flat(ell(x, z, rx + 0.35, rz + 0.35), '#d8cfbd', 0.03));
  add(flat(ell(x, z, rx, rz), '#86d4e4', 0.045, { rough: 0.12 }));
  add(flat(ell(x + 0.2, z - 0.1, rx * 0.55, rz * 0.5), '#9fdeea', 0.047, { rough: 0.12 }));
  const n = 26;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const s = 0.16 + r() * 0.1;
    const st = at(sph(s, k % 3 ? '#e6dccb' : '#d4cab6', 8), x + Math.cos(a) * (rx + 0.2), s * 0.35, z + Math.sin(a) * (rz + 0.2));
    st.scale.set(1.2, 0.55, 1);
    add(st);
  }
  for (const [px, pz] of [[-8.6, 5.6], [-6.4, 4.5], [-7.0, 5.9], [-8.2, 4.3]]) {
    const pad = at(cyl(0.22, 0.22, 0.02, '#6dbb58', 14), px, 0.055, pz);
    add(pad);
  }
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    const petal = at(sph(0.05, PINK, 8), -8.6 + Math.cos(a) * 0.05, 0.1, 5.6 + Math.sin(a) * 0.05);
    petal.scale.set(1, 0.5, 1);
    add(petal);
  }
  // Reeds along the back
  for (let k = 0; k < 9; k++) {
    const px = x - 2.0 + k * 0.5 + (r() - 0.5) * 0.2;
    const pz = z - rz - 0.05 + (r() - 0.5) * 0.25;
    const h = 0.8 + r() * 0.4;
    add(at(cyl(0.015, 0.02, h, '#4f9a45', 5), px, h / 2, pz));
    add(at(mesh(G('cat', () => new THREE.CapsuleGeometry(0.035, 0.12, 2, 6)), mat('#8b5e3c')), px, h + 0.02, pz));
  }
  const s = atlas.sign('flamingo', { w: 1.3, h: 0.29, post: 0.8 });
  s.position.set(-9.9, 0, 7.0);
  add(s);
  colliders.push({ type: 'box', x: -9.9, z: 6.95, hw: 0.55, hd: 0.1 });
  colliders.push({ type: 'circle', x, z, r: rz + 0.1 }, { type: 'circle', x: x - 1.2, z, r: rz - 0.25 }, { type: 'circle', x: x + 1.2, z, r: rz - 0.25 });
}

function buildGarden(add, wall, colliders, atlas) {
  const A = GARDEN;
  const cx = (A.x0 + A.x1) / 2;
  const cz = (A.z0 + A.z1) / 2;
  const w = A.x1 - A.x0;
  const d = A.z1 - A.z0;
  add(flat(rr(A.x0, A.z0, A.x1, A.z1, 0.3), '#a9dd7c', 0.03));
  const H = 0.2;
  for (const [x, z, bw, bd] of [[cx, A.z0, w, 0.14], [cx, A.z1, w, 0.14], [A.x0, cz, 0.14, d], [A.x1, cz, 0.14, d]]) {
    add(at(rbox(bw, H, bd, PLANK, 0.03), x, H / 2, z));
    wall(x, z, bw / 2, bd / 2, H);
  }
  // Tortoise hut
  const hut = at(mesh(new THREE.SphereGeometry(0.62, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#c98a5a')), 9.0, 0, 3.95);
  hut.scale.set(1, 0.85, 1);
  add(hut);
  const hd = at(cyl(0.26, 0.26, 0.02, '#6b4a33', 16), 9.0, 0.18, 4.55);
  hd.rotation.x = Math.PI / 2;
  add(hd);
  add(at(sph(0.12, SUN, 10), 9.0, 0.56, 3.95));
  colliders.push({ type: 'circle', x: 9.0, z: 3.95, r: 0.6, h: 0.53 });
  for (const [x, z] of [[6.0, 3.9], [7.2, 4.0], [8.6, 6.1]]) {
    for (let k = 0; k < 4; k++) {
      const leaf = at(sph(0.13, k % 2 ? '#7fd36a' : '#a5e37f', 10), x + Math.cos(k * 1.6) * 0.08, 0.1 + (k === 3 ? 0.05 : 0), z + Math.sin(k * 1.6) * 0.08);
      leaf.scale.set(1, 0.7, 1);
      add(leaf);
    }
  }
  add(at(cyl(0.3, 0.26, 0.08, '#cfe7ee', 16), 5.8, 0.04, 6.1));
  add(at(cyl(0.25, 0.25, 0.02, '#86d4e4', 16, { rough: 0.12 }), 5.8, 0.075, 6.1));
  const s = atlas.sign('tortoise', { w: 1.3, h: 0.29, post: 0.6 });
  s.position.set(7.4, 0, A.z1 + 0.25);
  add(s);
  colliders.push({ type: 'box', x: 7.4, z: A.z1 + 0.2, hw: 0.55, hd: 0.08 });
}

function buildArch(add, wall, atlas, colliders) {
  const z = 9.45;
  for (const s of [1, -1]) {
    const x = 2.05 * s;
    add(at(rbox(1.0, 0.3, 1.0, TEAL, 0.06), x, 0.15, z));
    add(at(rbox(0.8, 3.0, 0.8, CREAM, 0.08), x, 1.65, z));
    for (const y of [0.75, 2.55]) add(at(rbox(0.86, 0.18, 0.86, CORAL, 0.05), x, y, z));
    add(at(sph(0.3, SUN, 14), x, 4.45, z));
    add(at(cyl(0.12, 0.18, 0.3, CREAM, 10), x, 4.15, z));
    wall(x, z, 0.5, 0.5);
    // Flower pots by the pillars
    add(at(cyl(0.26, 0.2, 0.36, '#e0785f', 12), x + 0.85 * s, 0.18, z - 0.6));
    add(at(sph(0.26, '#6dbb58', 10), x + 0.85 * s, 0.45, z - 0.6));
    for (let k = 0; k < 4; k++) add(at(sph(0.07, [PINK, SUN, '#ffffff', CORAL][k], 8), x + 0.85 * s + Math.cos(k * 1.6) * 0.16, 0.62, z - 0.6 + Math.sin(k * 1.6) * 0.16));
    colliders.push({ type: 'circle', x: x + 0.85 * s, z: z - 0.6, r: 0.3, h: 0.5 });
  }
  add(at(rbox(4.9, 0.44, 0.62, TEAL, 0.08), 0, 3.25, z));
  const sign = atlas.sign('arch', { w: 3.5, h: 0.875, post: 0, depth: 0.1 });
  sign.position.set(0, 3.48, z + 0.1);
  add(sign);
  // A little giraffe peeking over the sign
  const gx = 1.15;
  const neck = at(mesh(G('pkNeck', () => new THREE.CapsuleGeometry(0.13, 0.7, 4, 12)), mat('#ffe5a8')), gx, 4.35, z - 0.05);
  neck.rotation.z = -0.25;
  add(neck);
  const head = new THREE.Group();
  head.position.set(gx + 0.2, 4.85, z + 0.05);
  head.rotation.set(0.15, -0.3, -0.2);
  const skull = sph(0.2, '#ffe5a8', 16);
  skull.scale.set(0.95, 0.9, 1.1);
  const muzzle = at(sph(0.15, '#fff7e6', 14), 0, -0.07, 0.17);
  muzzle.scale.set(0.95, 0.8, 1.0);
  head.add(skull, muzzle);
  for (const s of [1, -1]) {
    const eye = at(sph(0.04, '#1d130f', 10), 0.1 * s, 0.04, 0.16);
    eye.scale.set(0.8, 1.15, 0.5);
    const shine = at(sph(0.013, '#ffffff', 6), 0.1 * s + 0.01, 0.06, 0.18);
    const oss = at(cyl(0.025, 0.032, 0.15, '#ffe5a8', 8), 0.07 * s, 0.24, -0.02);
    const knob = at(sph(0.04, '#6b3e22', 8), 0.075 * s, 0.32, -0.02);
    const ear = at(mesh(G('pkEar', () => new THREE.ConeGeometry(0.05, 0.17, 8)), mat('#ffe5a8')), 0.22 * s, 0.1, -0.05);
    ear.rotation.z = (-Math.PI / 2 - 0.3) * s;
    const cheek = at(sph(0.035, '#ff8fb1', 8), 0.13 * s, -0.06, 0.15);
    cheek.scale.set(0.5, 0.6, 0.6);
    head.add(eye, shine, oss, knob, ear, cheek);
  }
  for (const [x, y, s] of [[-0.1, 0.12, 0.05], [0.12, 0.08, 0.04]]) {
    const sp = at(sph(s, '#e38e3d', 8), x, y, 0.15);
    sp.scale.set(1, 0.8, 0.4);
    head.add(sp);
  }
  add(head);
  // Bunting between the pillars
  const cols = [CORAL, SUN, TEAL, PINK, '#ffffff'];
  const flagGeo = G('flag', () => {
    const s = new THREE.Shape();
    s.moveTo(-0.13, 0);
    s.lineTo(0.13, 0);
    s.lineTo(0, -0.3);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  });
  for (let k = 0; k < 11; k++) {
    const u = k / 10;
    const x = -1.55 + u * 3.1;
    const y = 2.85 - Math.sin(u * Math.PI) * 0.35;
    const f = at(mesh(flagGeo, mat(cols[k % cols.length], { side: THREE.DoubleSide })), x, y, z + 0.02);
    add(f);
  }
  for (let k = 0; k < 10; k++) {
    const u0 = k / 10;
    const u1 = (k + 1) / 10;
    const x0 = -1.55 + u0 * 3.1;
    const x1 = -1.55 + u1 * 3.1;
    const y0 = 2.85 - Math.sin(u0 * Math.PI) * 0.35;
    const y1 = 2.85 - Math.sin(u1 * Math.PI) * 0.35;
    const seg = at(box(Math.hypot(x1 - x0, y1 - y0), 0.02, 0.02, '#ffffff'), (x0 + x1) / 2, (y0 + y1) / 2 + 0.005, z + 0.02);
    seg.rotation.z = Math.atan2(y1 - y0, x1 - x0);
    add(seg);
  }
}

function buildBooth(add, wall, atlas) {
  const x = -3.5;
  const z = 9.4;
  add(at(rbox(1.5, 2.0, 1.1, '#ffc8a2', 0.08), x, 1.0, z));
  add(at(box(0.95, 0.62, 0.04, '#6b4a33'), x, 1.32, z + 0.56));
  add(at(box(1.1, 0.07, 0.3, PLANK), x, 1.0, z + 0.66));
  const t = atlas.plane('tickets', 0.8, 0.35);
  t.position.set(x, 1.85, z + 0.57);
  add(t);
  add(at(rbox(1.7, 0.14, 1.3, TEAL, 0.05), x, 2.07, z));
  for (let k = 0; k < 5; k++) {
    const a = at(box(0.34, 0.05, 0.5, k % 2 ? CREAM : CORAL), x - 0.68 + k * 0.34, 1.98, z + 0.75);
    a.rotation.x = 0.4;
    add(a);
  }
  // Balloons
  for (const [dx, dy, c] of [[-0.95, 2.75, PINK], [-1.15, 2.55, SUN], [-0.75, 2.5, '#6fb8ff']]) {
    const b = at(sph(0.17, c, 14, { rough: 0.35 }), x + dx, dy, z + 0.2);
    b.scale.set(1, 1.15, 1);
    add(b);
    const str = at(cyl(0.006, 0.006, dy - 1.1, '#ffffff', 4), x + (dx - 0.8) / 2 - 0.3, (dy + 1.1) / 2 - 0.15, z + 0.2);
    str.rotation.z = (dx + 0.8) * -0.35;
    add(str);
  }
  wall(x, z, 0.8, 0.6);
}

function buildBench() {
  const g = new THREE.Group();
  for (let k = 0; k < 3; k++) g.add(at(rbox(1.6, 0.06, 0.15, PLANK, 0.02), 0, 0.44, -0.16 + k * 0.16));
  for (let k = 0; k < 2; k++) {
    const b = at(rbox(1.6, 0.13, 0.05, PLANK, 0.02), 0, 0.68 + k * 0.17, -0.27 - k * 0.02);
    b.rotation.x = -0.12;
    g.add(b);
  }
  for (const s of [1, -1]) {
    g.add(at(box(0.07, 0.44, 0.07, WOOD_DK), 0.68 * s, 0.22, 0.14));
    g.add(at(box(0.07, 0.95, 0.07, WOOD_DK), 0.68 * s, 0.47, -0.25));
  }
  return g;
}

function buildFlowers(r) {
  const spots = [];
  const line = (x0, z0, x1, z1, n) => {
    for (let k = 0; k < n; k++) {
      const u = (k + r() * 0.6) / n;
      spots.push([x0 + (x1 - x0) * u + (r() - 0.5) * 0.25, z0 + (z1 - z0) * u + (r() - 0.5) * 0.25]);
    }
  };
  line(-10.9, 8.9, -4.6, 8.9, 26);
  line(4.6, 8.9, 10.9, 8.9, 26);
  line(-10.95, 0.8, -10.95, 6.4, 18);
  line(10.95, 0.8, 10.95, 6.4, 18);
  line(5.3, 3.5, 9.5, 3.5, 12);
  for (let k = 0; k < 18; k++) {
    const a = r() * Math.PI * 2;
    const d = r() * 0.85;
    spots.push([Math.cos(a) * d, 2.6 + Math.sin(a) * d * 0.7]);
  }
  const cols = ['#ff8fb1', '#ffffff', '#ffd75e', '#c7a6ff', '#ff6b6b', '#ffb36b'];
  const headGeo = new THREE.IcosahedronGeometry(0.09, 1);
  const stemGeo = new THREE.CylinderGeometry(0.012, 0.015, 1, 4);
  stemGeo.translate(0, 0.5, 0);
  const heads = new THREE.InstancedMesh(headGeo, mat('#ffffff', { rough: 0.6, flat: true }), spots.length);
  const stems = new THREE.InstancedMesh(stemGeo, mat('#4f9a45'), spots.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const c = new THREE.Color();
  spots.forEach(([x, z], i) => {
    const h = 0.18 + r() * 0.16;
    m4.compose(v.set(x, h, z), q, s.set(1, 0.75, 1));
    heads.setMatrixAt(i, m4);
    heads.setColorAt(i, c.set(cols[Math.floor(r() * cols.length)]));
    m4.compose(v.set(x, 0, z), q, s.set(1, h, 1));
    stems.setMatrixAt(i, m4);
  });
  heads.castShadow = stems.castShadow = false;
  // Dry grass tufts in the savanna and green ones in the garden
  const tufts = [];
  for (let tries = 0; tries < 900 && tufts.length < 130; tries++) {
    const x = FENCE.x0 + 0.4 + r() * (FENCE.x1 - FENCE.x0 - 0.8);
    const z = FENCE.z0 + 0.4 + r() * (FENCE.z1 - FENCE.z0 - 0.8);
    if (Math.hypot(x - HOUSE.x, z - HOUSE.z) < 2.3 || Math.hypot(x - TREE.x, z - TREE.z) < 0.6) continue;
    tufts.push([x, z, r() < 0.5 ? '#c9c45a' : '#a9c25a']);
  }
  for (let k = 0; k < 40; k++) tufts.push([GARDEN.x0 + 0.3 + r() * (GARDEN.x1 - GARDEN.x0 - 0.6), GARDEN.z0 + 0.3 + r() * (GARDEN.z1 - GARDEN.z0 - 0.6), r() < 0.5 ? '#6fb04f' : '#88c560']);
  const tuftGeo = new THREE.ConeGeometry(0.05, 0.4, 4);
  tuftGeo.translate(0, 0.2, 0);
  const tim = new THREE.InstancedMesh(tuftGeo, mat('#ffffff', { rough: 1 }), tufts.length * 3);
  const e = new THREE.Euler();
  let n = 0;
  for (const [x, z, col] of tufts) {
    for (let k = 0; k < 3; k++) {
      m4.compose(v.set(x + (r() - 0.5) * 0.18, 0, z + (r() - 0.5) * 0.18), q.setFromEuler(e.set((r() - 0.5) * 0.6, 0, (r() - 0.5) * 0.6)), s.setScalar(0.7 + r() * 0.6));
      tim.setMatrixAt(n, m4);
      tim.setColorAt(n, c.set(col));
      n++;
    }
  }
  tim.castShadow = false;
  tim.receiveShadow = true;
  q.identity();
  return [heads, stems, tim];
}
