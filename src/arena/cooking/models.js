import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// 3D food, plates and kitchen tools for Roji's YumYum Kitchen. Each model is one merged geometry with
// vertex colours (one draw call), cached by key, so a full kitchen of food stays cheap.

export const VC = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
export const VC_SHINY = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.35 });

const PRIM = new Map();
const prim = (key, make) => {
  let g = PRIM.get(key);
  if (!g) PRIM.set(key, (g = make()));
  return g;
};
export const G = {
  sph: (r, w = 14, h = 10) => prim(`s${r},${w},${h}`, () => new THREE.SphereGeometry(r, w, h)),
  half: (r, w = 16) => prim(`h${r},${w}`, () => new THREE.SphereGeometry(r, w, 8, 0, Math.PI * 2, 0, Math.PI / 2)),
  cyl: (a, b, h, seg = 18) => prim(`c${a},${b},${h},${seg}`, () => new THREE.CylinderGeometry(a, b, h, seg)),
  box: (w, h, d) => prim(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)),
  rbox: (w, h, d, r = 0.03, seg = 2) => prim(`r${w},${h},${d},${r},${seg}`, () => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001))),
  tor: (r, t, seg = 24, arc = Math.PI * 2) => prim(`t${r},${t},${seg},${arc}`, () => new THREE.TorusGeometry(r, t, 8, seg, arc)),
  cone: (r, h, seg = 12) => prim(`k${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)),
  cap: (r, len, seg = 10) => prim(`p${r},${len},${seg}`, () => new THREE.CapsuleGeometry(r, len, 4, seg)),
};

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _c = new THREE.Color();

// Collects coloured primitives and merges them into one geometry.
export class Build {
  constructor() {
    this.list = [];
  }
  add(geo, color, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n);
    _q.setFromEuler(_e.set(r[0], r[1], r[2]));
    _m.compose(new THREE.Vector3(...p), _q, new THREE.Vector3(...(typeof s === 'number' ? [s, s, s] : s)));
    g.applyMatrix4(_m);
    _c.set(color);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([_c.r, _c.g, _c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.list.push(g);
    return this;
  }
  // Add another Build's parts, moved and scaled.
  sub(b, p = [0, 0, 0], s = 1, ry = 0) {
    _q.setFromEuler(_e.set(0, ry, 0));
    _m.compose(new THREE.Vector3(...p), _q, new THREE.Vector3(s, s, s));
    for (const g of b.list) this.list.push(g.clone().applyMatrix4(_m));
    return this;
  }
  geometry() {
    const g = mergeGeometries(this.list, false);
    g.computeBoundingSphere();
    return g;
  }
}

const C = {
  ink: '#cf4569',
  inkDeep: '#b8365a',
  band: '#e0ada9',
  cream: '#fcf7e3',
  white: '#fffdf8',
  steel: '#d7dde3',
  steelDark: '#9aa3ad',
  iron: '#4b4248',
  brass: '#d9a441',
  wood: '#c98a5a',
  woodDark: '#8f5a3f',
};

// ---------------------------------------------------------------- ingredients (a Build each, about 0.25 m)
const ING = {
  tomato(b) {
    b.add(G.sph(0.12), '#ec4b4b', [0, 0.1, 0], [0, 0, 0], [1, 0.85, 1]);
    b.add(G.cone(0.06, 0.03, 6), '#4fae5a', [0, 0.2, 0], [Math.PI, 0, 0]);
    b.add(G.cyl(0.012, 0.012, 0.05, 6), '#3f8e45', [0, 0.23, 0]);
  },
  cucumber(b) {
    b.add(G.cap(0.06, 0.2), '#4f9e45', [0, 0.065, 0], [0, 0.4, Math.PI / 2]);
    b.add(G.sph(0.03, 8, 6), '#cdeea0', [0.12, 0.08, -0.05], [0, 0, 0], [1, 0.5, 1]);
  },
  lettuce(b) {
    b.add(G.sph(0.11), '#5fb64e', [-0.04, 0.1, 0]);
    b.add(G.sph(0.1), '#7ccc5a', [0.05, 0.1, 0.03]);
    b.add(G.sph(0.09), '#93db6e', [0, 0.15, -0.02]);
  },
  onion(b) {
    b.add(G.sph(0.11), '#b05a9a', [0, 0.1, 0], [0, 0, 0], [1, 0.9, 1]);
    b.add(G.cone(0.04, 0.08, 8), '#c873b2', [0, 0.22, 0]);
  },
  lemon(b) {
    b.add(G.sph(0.1), '#ffe066', [0, 0.09, 0], [0, 0.3, 0], [1.3, 0.9, 0.95]);
    b.add(G.sph(0.025, 8, 6), '#ffd23f', [0.13, 0.09, 0.04]);
    b.add(G.sph(0.04, 8, 6), '#4fae5a', [-0.06, 0.17, 0], [0, 0, 0.5], [1.6, 0.35, 0.8]);
  },
  lamb(b) {
    b.add(G.sph(0.12), '#d9616b', [-0.04, 0.1, 0], [0, 0.3, 0], [1.25, 0.85, 1]);
    b.add(G.cyl(0.025, 0.025, 0.14, 8), '#fff6e6', [0.11, 0.1, -0.04], [0, 0.3, Math.PI / 2]);
    b.add(G.sph(0.04, 8, 6), '#fff6e6', [0.18, 0.1, -0.06]);
  },
  chicken(b) {
    b.add(G.sph(0.11), '#f6c9a8', [-0.04, 0.1, 0], [0, -0.3, 0], [1.2, 0.9, 1]);
    b.add(G.cyl(0.022, 0.022, 0.12, 8), '#fff6e6', [0.1, 0.1, 0.04], [0, -0.3, Math.PI / 2]);
    b.add(G.sph(0.035, 8, 6), '#fff6e6', [0.16, 0.1, 0.06]);
  },
  patty(b) {
    b.add(G.cyl(0.12, 0.125, 0.045), '#f0a3a3', [0, 0.025, 0]);
  },
  bread(b) {
    b.add(G.cyl(0.15, 0.15, 0.025, 20), '#e7c27f', [0, 0.015, 0]);
    b.add(G.cyl(0.14, 0.14, 0.025, 20), '#f6dfa8', [0.01, 0.04, 0.01], [0.08, 0, 0.05]);
  },
  bun(b) {
    b.add(G.cyl(0.12, 0.12, 0.04, 18), '#f6cd8c', [0, 0.02, 0]);
    b.add(G.half(0.12), '#e9a548', [0, 0.05, 0], [0, 0, 0], [1, 0.75, 1]);
    for (const [x, z] of [[0.03, 0.02], [-0.04, 0.03], [0.0, -0.05], [0.06, -0.03]]) b.add(G.sph(0.012, 6, 4), '#fff4d6', [x, 0.135, z], [0, 0, 0], [1.5, 0.6, 1]);
  },
  rice(b) {
    b.add(G.cyl(0.09, 0.11, 0.2, 14), '#e8d3ad', [0, 0.1, 0]);
    b.add(G.cyl(0.095, 0.095, 0.03, 14), C.ink, [0, 0.13, 0]);
    b.add(G.half(0.085, 12), '#fffaf0', [0, 0.2, 0], [0, 0, 0], [1, 0.4, 1]);
  },
  lentils(b) {
    b.add(G.cyl(0.09, 0.11, 0.18, 14), '#d9b98a', [0, 0.09, 0]);
    b.add(G.cyl(0.095, 0.095, 0.03, 14), '#6f7b4d', [0, 0.11, 0]);
    b.add(G.half(0.085, 12), '#e8973a', [0, 0.18, 0], [0, 0, 0], [1, 0.45, 1]);
  },
  mint(b) {
    for (const [x, z, r] of [[0, 0, 0], [0.06, 0.03, 0.8], [-0.05, 0.04, -0.7], [0.01, -0.05, 2.2]]) b.add(G.sph(0.06, 10, 6), r > 1 ? '#2f9a5a' : '#3fae6a', [x, 0.07 + Math.abs(r) * 0.02, z], [0.3, r, 0], [1.4, 0.35, 0.7]);
    b.add(G.cyl(0.008, 0.008, 0.1, 5), '#2f7a4a', [0, 0.04, 0], [0, 0, 0.5]);
  },
  ice(b) {
    b.add(G.rbox(0.1, 0.1, 0.1, 0.02, 1), '#d6f1ff', [-0.05, 0.05, 0], [0, 0.4, 0]);
    b.add(G.rbox(0.09, 0.09, 0.09, 0.02, 1), '#eaf8ff', [0.06, 0.045, 0.03], [0, -0.3, 0]);
    b.add(G.rbox(0.08, 0.08, 0.08, 0.02, 1), '#c4e8fb', [0.0, 0.13, 0.01], [0.3, 0.7, 0.2]);
  },
  jameed(b) {
    b.add(G.sph(0.08), '#f7f1e1', [-0.04, 0.08, 0]);
    b.add(G.sph(0.07), '#fffaf0', [0.06, 0.07, 0.03]);
  },
  toum(b) {
    b.add(G.cyl(0.08, 0.065, 0.08, 16), '#f6dcd6', [0, 0.04, 0]);
    b.add(G.tor(0.078, 0.008, 16), C.ink, [0, 0.07, 0], [Math.PI / 2, 0, 0]);
    b.add(G.half(0.07, 12), '#fffdf2', [0, 0.08, 0], [0, 0, 0], [1, 0.6, 1]);
  },
};
const CHOP = {
  tomato: ['#ec4b4b', '#f26b5e'],
  lettuce: ['#7ccc5a', '#93db6e'],
  onion: ['#c873b2', '#f1d6ea'],
  lamb: ['#d9616b', '#b8454f'],
};
function pieces(b, cols, n = 6, size = 0.055) {
  for (let i = 0; i < n; i++) {
    const a = i * 2.4;
    const r = 0.03 + (i % 3) * 0.035;
    b.add(G.rbox(size, size * 0.8, size, 0.012, 1), cols[i % cols.length], [Math.cos(a) * r, 0.03 + (i > 3 ? 0.035 : 0), Math.sin(a) * r], [0, a, 0.3 * (i % 2)]);
  }
}
const DONE = {
  'tomato:chopped': (b) => pieces(b, CHOP.tomato),
  'lettuce:chopped': (b) => {
    for (let i = 0; i < 6; i++) b.add(G.sph(0.05, 8, 5), i % 2 ? '#93db6e' : '#7ccc5a', [Math.cos(i) * 0.06, 0.03 + (i % 3) * 0.012, Math.sin(i) * 0.06], [0.4 * (i % 2), i, 0], [1.3, 0.3, 1]);
  },
  'onion:chopped': (b) => pieces(b, CHOP.onion, 6, 0.045),
  'lamb:chopped': (b) => pieces(b, CHOP.lamb, 6, 0.06),
  'cucumber:chopped': (b) => {
    for (const [x, z, y] of [[-0.06, 0, 0.01], [0.04, -0.04, 0.01], [0.05, 0.05, 0.01], [-0.01, 0.01, 0.035]]) {
      b.add(G.cyl(0.045, 0.045, 0.02, 12), '#4f9e45', [x, y + 0.01, z]);
      b.add(G.cyl(0.036, 0.036, 0.022, 12), '#cdeea0', [x, y + 0.012, z]);
    }
  },
  'lemon:chopped': (b) => {
    for (const [x, z, r] of [[-0.05, 0, 0.2], [0.06, 0.02, -0.3]]) {
      b.add(G.cyl(0.07, 0.07, 0.025, 14), '#ffd23f', [x, 0.03, z], [Math.PI / 2 - 0.4, r, 0]);
      b.add(G.cyl(0.058, 0.058, 0.027, 14), '#fff4b0', [x, 0.03, z], [Math.PI / 2 - 0.4, r, 0]);
    }
  },
  'chicken:sliced': (b) => {
    for (const [x, z, r] of [[-0.04, 0, 0.3], [0.03, 0.04, -0.4], [0.05, -0.04, 0.9]]) b.add(G.rbox(0.13, 0.025, 0.045, 0.01, 1), '#b8733f', [x, 0.02, z], [0, r, 0]);
    b.add(G.rbox(0.11, 0.02, 0.035, 0.008, 1), '#d99a5e', [0, 0.045, 0], [0, 1.3, 0]);
  },
  'patty:cooked': (b) => {
    b.add(G.cyl(0.12, 0.125, 0.05), '#7a3f22', [0, 0.025, 0]);
    for (const x of [-0.05, 0, 0.05]) b.add(G.box(0.012, 0.004, 0.2), '#4a2416', [x, 0.051, 0], [0, 0.5, 0]);
  },
  burnt: (b) => {
    b.add(G.sph(0.11, 10, 7), '#3b2a22', [0, 0.05, 0], [0, 0, 0], [1.1, 0.45, 1]);
    b.add(G.sph(0.05, 8, 5), '#241a15', [0.04, 0.08, 0.02]);
  },
  'rice:cooked': (b) => {
    b.add(G.half(0.13, 16), '#fffcf3', [0, 0.01, 0], [0, 0, 0], [1, 0.7, 1]);
    b.add(G.sph(0.02, 6, 4), '#4fae5a', [0.03, 0.1, 0.02]);
  },
  stew: (b) => {
    b.add(G.cyl(0.11, 0.08, 0.07, 16), '#fff7ea', [0, 0.035, 0]);
    b.add(G.cyl(0.1, 0.1, 0.01, 16), '#f7f1e1', [0, 0.068, 0]);
    for (const [x, z] of [[-0.04, 0.01], [0.04, -0.03], [0.02, 0.05]]) b.add(G.sph(0.03, 8, 5), '#9a4a3a', [x, 0.075, z]);
  },
  soup: (b) => {
    b.add(G.cyl(0.12, 0.085, 0.08, 18), '#fff7ea', [0, 0.04, 0]);
    b.add(G.tor(0.115, 0.01, 18), C.ink, [0, 0.07, 0], [Math.PI / 2, 0, 0]);
    b.add(G.cyl(0.108, 0.108, 0.01, 18), '#e8973a', [0, 0.073, 0]);
    b.add(G.sph(0.02, 6, 4), '#4fae5a', [0.03, 0.08, 0.02], [0, 0, 0], [1.4, 0.4, 1]);
  },
  lemonade: (b) => {
    b.add(G.cyl(0.075, 0.06, 0.2, 16), '#eaf7fb', [0, 0.1, 0]);
    b.add(G.cyl(0.07, 0.07, 0.01, 16), '#e4ef9a', [0, 0.17, 0]);
    b.add(G.cyl(0.072, 0.058, 0.15, 16), '#dfe9a2', [0, 0.085, 0]);
    b.add(G.cyl(0.04, 0.04, 0.012, 12), '#ffd23f', [0.065, 0.19, 0], [0, 0, 1.3]);
    b.add(G.sph(0.03, 8, 5), '#3fae6a', [-0.02, 0.185, 0.02], [0, 0.5, 0], [1.5, 0.4, 0.8]);
    b.add(G.cyl(0.008, 0.008, 0.22, 6), C.ink, [-0.03, 0.2, -0.02], [0.3, 0, 0.2]);
  },
};

const ITEM_GEO = new Map();
function geoOf(key, make) {
  let g = ITEM_GEO.get(key);
  if (!g) {
    const b = new Build();
    make(b);
    ITEM_GEO.set(key, (g = b.geometry()));
  }
  return g;
}
export function partBuild(key) {
  const b = new Build();
  const id = key.split(':')[0];
  if (DONE[key]) DONE[key](b);
  else if (ING[id]) ING[id](b);
  else DONE.burnt(b);
  return b;
}
// One ingredient (or part) as a mesh.
export function partMesh(key) {
  const m = new THREE.Mesh(geoOf(`part:${key}`, (b) => b.sub(partBuild(key))), VC);
  m.castShadow = false;
  m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------- plates and dishes
function plateBase(b, dirty, big = false) {
  const r = big ? 0.27 : 0.22;
  b.add(G.cyl(r, r * 0.72, 0.035, 22), dirty ? '#efe6dc' : C.white, [0, 0.018, 0]);
  b.add(G.tor(r * 0.92, 0.012, 24), dirty ? '#c9b6a8' : big ? C.brass : C.band, [0, 0.037, 0], [Math.PI / 2, 0, 0]);
  if (dirty) for (const [x, z, s] of [[0.06, 0.03, 0.05], [-0.07, -0.02, 0.04], [0.01, -0.08, 0.035]]) b.add(G.sph(s, 8, 4), '#9a7a5e', [x, 0.034, z], [0, 0, 0], [1, 0.2, 1]);
}
const DISH3D = {
  fattoush(b) {
    b.add(G.cyl(0.16, 0.1, 0.1, 18), C.white, [0, 0.08, 0]);
    b.add(G.tor(0.155, 0.012, 18), C.ink, [0, 0.12, 0], [Math.PI / 2, 0, 0]);
    b.add(G.half(0.145, 16), '#7ccc5a', [0, 0.1, 0], [0, 0, 0], [1, 0.35, 1]);
    for (const [x, z, col] of [[-0.06, 0.02, '#ec4b4b'], [0.05, -0.05, '#ec4b4b'], [0.0, 0.07, '#4f9e45'], [0.07, 0.04, '#cdeea0'], [-0.03, -0.06, '#f6dfa8'], [0.08, -0.01, '#f6dfa8']]) b.add(G.rbox(0.05, 0.03, 0.05, 0.01, 1), col, [x, 0.16, z], [0, x * 20, 0]);
  },
  wrap(b) {
    b.add(G.cap(0.065, 0.2, 12), '#f2d59a', [0, 0.1, 0], [0, 0.5, Math.PI / 2 - 0.15]);
    b.add(G.cyl(0.072, 0.072, 0.13, 14, true), C.white, [0.06, 0.11, -0.03], [0, 0.5, Math.PI / 2 - 0.15]);
    b.add(G.cyl(0.074, 0.074, 0.03, 14), C.ink, [0.06, 0.11, -0.03], [0, 0.5, Math.PI / 2 - 0.15]);
    b.add(G.sph(0.06, 10, 6), '#b8733f', [-0.12, 0.085, 0.07], [0, 0.5, 0], [0.5, 1, 1]);
  },
  burger(b) {
    b.add(G.cyl(0.12, 0.12, 0.035, 18), '#f6cd8c', [0, 0.055, 0]);
    b.add(G.cyl(0.135, 0.135, 0.012, 14), '#7ccc5a', [0, 0.078, 0]);
    b.add(G.cyl(0.12, 0.125, 0.045, 18), '#7a3f22', [0, 0.105, 0]);
    b.add(G.cyl(0.1, 0.1, 0.015, 14), '#ec4b4b', [0, 0.135, 0]);
    b.add(G.half(0.125, 16), '#e9a548', [0, 0.143, 0], [0, 0, 0], [1, 0.72, 1]);
    for (const [x, z] of [[0.03, 0.02], [-0.04, 0.03], [0.0, -0.05], [0.06, -0.03], [-0.05, -0.03]]) b.add(G.sph(0.012, 6, 4), '#fff4d6', [x, 0.226, z], [0, 0, 0], [1.5, 0.6, 1]);
  },
  soup(b) {
    b.sub(partBuild('soup'), [0, 0.02, 0]);
  },
  lemonade(b) {
    b.sub(partBuild('lemonade'), [0, 0.03, 0], 1.15);
  },
  mansaf(b) {
    b.add(G.cyl(0.24, 0.24, 0.012, 22), '#f2d59a', [0, 0.04, 0]);
    b.add(G.half(0.2, 18), '#fff3c4', [0, 0.04, 0], [0, 0, 0], [1, 0.5, 1]);
    for (const [x, z] of [[-0.07, 0.03], [0.06, -0.06], [0.02, 0.07], [0.09, 0.03], [-0.04, -0.07]]) b.add(G.sph(0.04, 8, 6), '#9a4a3a', [x, 0.11, z]);
    for (const [x, z] of [[-0.02, 0.0], [0.04, 0.02], [-0.05, -0.02], [0.0, 0.05]]) b.add(G.sph(0.012, 6, 4), '#e0b070', [x, 0.142, z], [0, 0, 0], [1.6, 0.6, 1]);
    b.add(G.sph(0.02, 6, 4), '#4fae5a', [0.0, 0.14, -0.02], [0, 0, 0], [1.4, 0.4, 1]);
  },
};
const SLOTS = [[0, 0], [-0.08, 0.05], [0.08, 0.05], [0, -0.08]];
// A plate as one mesh: clean or dirty, empty, partly filled or holding a finished dish.
export function plateGeo(parts, dirty, dish) {
  const key = `plate:${dirty ? 'd' : ''}:${dish || ''}:${[...parts].sort().join(',')}`;
  return geoOf(key, (b) => {
    plateBase(b, dirty, dish === 'mansaf');
    if (dish) DISH3D[dish](b);
    else
      parts.forEach((p, i) => {
        const big = parts.length === 1;
        const [x, z] = big ? [0, 0] : SLOTS[i % 4];
        b.sub(partBuild(p), [x, 0.035 + (i >= 4 ? 0.06 : 0), z], big ? 0.95 : 0.62, i);
      });
  });
}
export function stackGeo(n, dirty) {
  return geoOf(`stack:${n}:${dirty}`, (b) => {
    for (let i = 0; i < n; i++) {
      const sub = new Build();
      plateBase(sub, dirty);
      b.sub(sub, [0, i * 0.04, 0], 1, i * 0.7);
    }
    if (!n) b.add(G.box(0.001, 0.001, 0.001), '#ffffff');
  });
}

// ---------------------------------------------------------------- cookware
export function panGeo() {
  return geoOf('pan', (b) => {
    b.add(G.cyl(0.2, 0.17, 0.06, 22), C.iron, [0, 0.03, 0]);
    b.add(G.cyl(0.175, 0.175, 0.008, 22), '#6a6168', [0, 0.058, 0]);
    b.add(G.rbox(0.26, 0.035, 0.05, 0.015, 1), C.iron, [0.31, 0.06, 0], [0, 0, 0.15]);
    b.add(G.rbox(0.12, 0.04, 0.055, 0.015, 1), C.ink, [0.4, 0.08, 0], [0, 0, 0.15]);
  });
}
export function potGeo() {
  return geoOf('pot', (b) => {
    b.add(G.cyl(0.21, 0.2, 0.24, 22), C.steelDark, [0, 0.12, 0]);
    b.add(G.tor(0.205, 0.016, 24), C.steel, [0, 0.24, 0], [Math.PI / 2, 0, 0]);
    b.add(G.cyl(0.214, 0.214, 0.05, 22), C.ink, [0, 0.09, 0]);
    for (const s of [1, -1]) b.add(G.rbox(0.07, 0.035, 0.08, 0.015, 1), C.iron, [s * 0.24, 0.2, 0]);
  });
}
export function jugGeo() {
  return geoOf('jug', (b) => {
    b.add(G.cyl(0.11, 0.095, 0.3, 16), '#eaf7fb', [0, 0.17, 0]);
    b.add(G.cyl(0.115, 0.115, 0.03, 16), C.ink, [0, 0.33, 0]);
    b.add(G.cyl(0.03, 0.03, 0.03, 10), C.ink, [0, 0.36, 0]);
    b.add(G.rbox(0.04, 0.2, 0.05, 0.015, 1), '#d8ecf2', [0.13, 0.18, 0]);
    b.add(G.cyl(0.1, 0.11, 0.03, 16), '#c8d3d8', [0, 0.015, 0]);
  });
}
export function extGeo() {
  return geoOf('ext', (b) => {
    b.add(G.cyl(0.085, 0.09, 0.36, 16), '#e5484d', [0, 0.18, 0]);
    b.add(G.half(0.085, 14), '#e5484d', [0, 0.36, 0]);
    b.add(G.cyl(0.03, 0.03, 0.06, 8), C.iron, [0, 0.45, 0]);
    b.add(G.rbox(0.16, 0.03, 0.04, 0.012, 1), C.iron, [0.04, 0.49, 0], [0, 0, -0.2]);
    b.add(G.cyl(0.014, 0.02, 0.18, 8), C.iron, [-0.1, 0.4, 0], [0, 0, 0.9]);
    b.add(G.cyl(0.088, 0.088, 0.07, 16), '#fff4d6', [0, 0.22, 0]);
  });
}
// A disc of food or liquid inside a pan, pot or jug, with its own material so it can change colour.
export function fillMesh(r, h, seg = 18) {
  const m = new THREE.Mesh(G.cyl(r, r, h, seg), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55 }));
  m.castShadow = false;
  return m;
}
export const COL = C;
