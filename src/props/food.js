import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { umat, canvasTexture, rng } from '../util.js';

// Shared food models. makeFood(id) -> Object3D, base at y = 0, centred, front faces +Z.
// Each prop is built once from primitives, then merged into one mesh per finish. Colours live in a
// small palette texture, so a whole prop is usually 1 to 3 draw calls. Materials are shared by every
// prop: clone a material before recolouring or fading it.

export const TAU = Math.PI * 2;
const PI = Math.PI;

// ------------------------------------------------------------------ palette atlas
const CELLS = 64;
const CELL_PX = 4;
let pal = null;
function palette() {
  if (!pal) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = CELLS * CELL_PX;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    pal = { ctx: canvas.getContext('2d'), tex, index: new Map() };
  }
  return pal;
}
export function swatch(color) {
  const p = palette();
  const hex = new THREE.Color(color).getHexString();
  let i = p.index.get(hex);
  if (i === undefined) {
    i = Math.min(p.index.size, CELLS * CELLS - 1);
    p.index.set(hex, i);
    p.ctx.fillStyle = '#' + hex;
    p.ctx.fillRect((i % CELLS) * CELL_PX, Math.floor(i / CELLS) * CELL_PX, CELL_PX, CELL_PX);
    p.tex.needsUpdate = true;
  }
  return [((i % CELLS) + 0.5) / CELLS, 1 - (Math.floor(i / CELLS) + 0.5) / CELLS];
}

// ------------------------------------------------------------------ finishes (one shared material each)
const FINISH = {
  matte: { rough: 0.9 },
  soft: { rough: 0.66 },
  gloss: { rough: 0.3 },
  flat: { rough: 0.8, flat: true },
  metal: { rough: 0.24, metal: 0.62, glow: 0.16 },
  gem: { rough: 0.08, metal: 0.2, glow: 0.42, flat: true },
  glow: { rough: 0.5, glow: 1.15 },
  glass: { rough: 0.05, transparent: true, opacity: 0.3 },
};
const finishMats = {};
export function finishMat(name) {
  if (!finishMats[name]) {
    const f = FINISH[name] || FINISH.soft;
    const tex = palette().tex;
    const m = umat('#ffffff', { rough: f.rough, metal: f.metal || 0, flat: !!f.flat, transparent: !!f.transparent, opacity: f.opacity ?? 1, side: f.transparent ? THREE.DoubleSide : THREE.FrontSide, map: tex });
    if (f.glow) {
      m.emissive.set('#ffffff');
      m.emissiveMap = tex;
      m.emissiveIntensity = f.glow;
    }
    if (f.transparent) m.depthWrite = false;
    m.name = 'prop-' + name;
    finishMats[name] = m;
  }
  return finishMats[name];
}

// Textured material, cached by key (labels, photos, waffle cones).
const texMats = new Map();
export function texMat(key, w, h, draw, opts = {}) {
  if (!texMats.has(key)) {
    const tex = canvasTexture(w, h, draw);
    if (opts.repeat) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(...opts.repeat);
    }
    texMats.set(key, umat('#ffffff', { rough: opts.rough ?? 0.7, metal: opts.metal ?? 0, map: tex, side: opts.side ?? THREE.FrontSide }));
  }
  return texMats.get(key);
}

// ------------------------------------------------------------------ cached geometries
const geoCache = new Map();
const cg = (key, make) => {
  let g = geoCache.get(key);
  if (!g) geoCache.set(key, (g = make()));
  return g;
};
const v2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y));
export const G = {
  box: (w, h, d) => cg(`box${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)),
  rbox: (w, h, d, r, s = 2) => cg(`rbox${w},${h},${d},${r},${s}`, () => new RoundedBoxGeometry(w, h, d, s, r)),
  cyl: (rt, rb, h, seg = 16, open = false, ts = 0, tl = TAU) => cg(`cyl${rt},${rb},${h},${seg},${open},${ts},${tl}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open, ts, tl)),
  sph: (r = 1, ws = 16, hs = 12, ts = 0, tl = PI) => cg(`sph${r},${ws},${hs},${ts},${tl}`, () => new THREE.SphereGeometry(r, ws, hs, 0, TAU, ts, tl)),
  dome: (r = 1, ws = 16, hs = 8) => cg(`dome${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs, 0, TAU, 0, PI / 2)),
  tor: (R, r, rs = 8, ts = 24, arc = TAU) => cg(`tor${R},${r},${rs},${ts},${arc}`, () => new THREE.TorusGeometry(R, r, rs, ts, arc)),
  cone: (r, h, seg = 12, open = false) => cg(`cone${r},${h},${seg},${open}`, () => new THREE.ConeGeometry(r, h, seg, 1, open)),
  ico: (r = 1, d = 0) => cg(`ico${r},${d}`, () => new THREE.IcosahedronGeometry(r, d)),
  oct: (r = 1) => cg(`oct${r}`, () => new THREE.OctahedronGeometry(r, 0)),
  capsule: (r, len, cs = 2, rs = 6) => cg(`cap${r},${len},${cs},${rs}`, () => new THREE.CapsuleGeometry(r, len, cs, rs)),
  plane: (w, h) => cg(`plane${w},${h}`, () => new THREE.PlaneGeometry(w, h)),
  circle: (r, seg = 24) => cg(`circle${r},${seg}`, () => new THREE.CircleGeometry(r, seg)),
  lathe: (key, pts, seg = 24) => cg('lathe' + key, () => new THREE.LatheGeometry(v2(pts), seg)),
  extrude: (key, shape, opts) => cg('ext' + key, () => centred(new THREE.ExtrudeGeometry(shape(), { curveSegments: 16, ...opts }), opts.keepY)),
  tube: (key, pts, r, seg = 24, rs = 6) => cg('tube' + key, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, rs, false)),
  heart: (depth = 0.3, bevel = 0.1, bs = 2, n = 40) => cg(`heart${depth},${bevel},${bs},${n}`, () => {
    const g = centred(new THREE.ExtrudeGeometry(heartN(n), { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.7, bevelSegments: bs }));
    return bevel > 0 ? smooth(g) : g;
  }),
  custom: (key, make) => cg(key, make),
};
// The util heart curve with a chosen number of points (fewer for small hearts).
function heartN(n) {
  const s = new THREE.Shape();
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    if (i) s.lineTo(x / 34, (y + 4) / 30);
    else s.moveTo(x / 34, (y + 4) / 30);
  }
  s.closePath();
  return s;
}
// Shared vertices and soft normals (puffy hearts, balloons); uv is refilled by the builder.
function smooth(g) {
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  const m = mergeVertices(g, 1e-5);
  m.computeVertexNormals();
  m.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(m.attributes.position.count * 2), 2));
  return m;
}
function centred(g) {
  g.computeBoundingBox();
  const c = g.boundingBox.getCenter(new THREE.Vector3());
  g.translate(-c.x, -c.y, -c.z);
  return g;
}

// ------------------------------------------------------------------ builder
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
function tmat(t) {
  if (!t) return new THREE.Matrix4();
  _p.set(t.x || 0, t.y || 0, t.z || 0);
  _e.set(t.rx || 0, t.ry || 0, t.rz || 0, t.order || 'XYZ');
  _q.setFromEuler(_e);
  const s = t.s ?? 1;
  if (Array.isArray(s)) _s.set(s[0], s[1], s[2]);
  else _s.set(s, s, s);
  return new THREE.Matrix4().compose(_p, _q, _s);
}
function flipWinding(g) {
  for (const name of ['position', 'normal', 'uv']) {
    const a = g.attributes[name];
    if (!a) continue;
    const n = a.itemSize;
    const arr = a.array;
    for (let i = 0; i < a.count; i += 3) {
      for (let k = 0; k < n; k++) {
        const t = arr[(i + 1) * n + k];
        arr[(i + 1) * n + k] = arr[(i + 2) * n + k];
        arr[(i + 2) * n + k] = t;
      }
    }
  }
}

// b.add(geometry, colour, { x, y, z, rx, ry, rz, order, s }, finish). Shorthands below.
export class Builder {
  constructor() {
    this.parts = [];
    this.subs = [];
    this.stack = [new THREE.Matrix4()];
  }
  get top() {
    return this.stack[this.stack.length - 1];
  }
  add(geo, color, t, finish = 'soft') {
    this.parts.push({ geo, color, finish, matrix: this.top.clone().multiply(tmat(t)) });
    return this;
  }
  tex(geo, material, t) {
    this.parts.push({ geo, material, matrix: this.top.clone().multiply(tmat(t)) });
    return this;
  }
  at(t, fn) {
    this.stack.push(this.top.clone().multiply(tmat(t)));
    fn(this);
    this.stack.pop();
    return this;
  }
  // A separately movable child (a balloon that bobs, a dancer that spins): root.userData.parts[name]
  part(name, t, fn) {
    const b = new Builder();
    fn(b);
    this.subs.push({ name, matrix: this.top.clone().multiply(tmat(t)), tpl: b.bake() });
    return this;
  }
  box(w, h, d, c, t, f) {
    return this.add(G.box(w, h, d), c, t, f);
  }
  rbox(w, h, d, r, c, t, f) {
    return this.add(G.rbox(w, h, d, r), c, t, f);
  }
  cyl(rt, rb, h, c, t, f, seg = 16) {
    return this.add(G.cyl(rt, rb, h, seg), c, t, f);
  }
  sph(r, c, t, f, seg = 14) {
    return this.add(G.sph(r, seg, Math.max(4, Math.round(seg * 0.6))), c, t, f);
  }
  dome(r, c, t, f, seg = 16) {
    return this.add(G.dome(r, seg, Math.max(4, Math.round(seg / 2))), c, t, f);
  }
  tor(R, r, c, t, f, arc = TAU, ts = 24, rs = 8) {
    return this.add(G.tor(R, r, rs, ts, arc), c, t, f);
  }
  cone(r, h, c, t, f, seg = 12) {
    return this.add(G.cone(r, h, seg), c, t, f);
  }
  ico(r, c, t, f = 'flat', d = 0) {
    return this.add(G.ico(r, d), c, t, f);
  }
  cap(r, len, c, t, f) {
    return this.add(G.capsule(r, len), c, t, f);
  }
  heart(size, c, t = {}, f = 'gloss', depth = 0.3, bevel = 0.1) {
    const small = size < 0.08;
    return this.add(G.heart(depth, bevel, small ? 1 : 2, small ? 18 : 40), c, { ...t, s: size }, f);
  }
  lathe(key, pts, c, t, f, seg = 24) {
    return this.add(G.lathe(key, pts, seg), c, t, f);
  }
  // Horizontal ring arc (crusts, rims) over the cylinder angles [ts, ts + len], at height y.
  arc(R, r, ts, len, c, y, f, rs = 6) {
    const segs = Math.max(4, Math.round((len / TAU) * 32));
    return this.add(G.tor(R, r, rs, segs, len), c, { y, rx: PI / 2, ry: ts + len - PI / 2, order: 'YXZ' }, f);
  }
  bake() {
    const buckets = new Map();
    for (const p of this.parts) {
      const material = p.material || finishMat(p.finish);
      const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
      if (!g.attributes.normal) g.computeVertexNormals();
      const n = g.attributes.position.count;
      if (!p.material || !g.attributes.uv) {
        const [u, v] = p.material ? [0.5, 0.5] : swatch(p.color);
        const uv = new Float32Array(n * 2);
        for (let i = 0; i < n; i++) {
          uv[i * 2] = u;
          uv[i * 2 + 1] = v;
        }
        g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      }
      g.clearGroups();
      g.morphAttributes = {};
      g.applyMatrix4(p.matrix);
      if (p.matrix.determinant() < 0) flipWinding(g);
      if (!buckets.has(material)) buckets.set(material, []);
      buckets.get(material).push(g);
    }
    const meshes = [];
    for (const [material, list] of buckets) {
      const geo = mergeGeometries(list, false);
      for (const g of list) g.dispose();
      geo.computeBoundingSphere();
      meshes.push({ geo, material, cast: !material.transparent });
    }
    return { meshes, subs: this.subs };
  }
}

export function instantiate(tpl, name = '') {
  const root = new THREE.Group();
  root.name = name;
  for (const m of tpl.meshes) {
    const o = new THREE.Mesh(m.geo, m.material);
    o.castShadow = m.cast;
    o.receiveShadow = true;
    root.add(o);
  }
  if (tpl.subs.length) {
    root.userData.parts = {};
    for (const s of tpl.subs) {
      const g = instantiate(s.tpl, s.name);
      s.matrix.decompose(g.position, g.quaternion, g.scale);
      root.add(g);
      root.userData.parts[s.name] = g;
    }
  }
  return root;
}

// ------------------------------------------------------------------ shared bits
export const C = {
  plate: '#fffaf3',
  cream: '#fff3dc',
  white: '#ffffff',
  sponge: '#efbd78',
  caramel: '#d4893a',
  pecan: '#8b4a2b',
  pecanDark: '#6e3820',
  choc: '#6b3a26',
  chocDark: '#43231a',
  berry: '#e5484d',
  leaf: '#5cb85c',
  pink: '#ff9eb5',
  hotpink: '#ff6f91',
  rose: '#ffc2d1',
  yellow: '#ffd166',
  gold: '#f4c24f',
  teal: '#5fd0c5',
  mint: '#a8e6cf',
  sky: '#9ad7ff',
  lilac: '#c7a6ff',
  peach: '#ffb38a',
  orange: '#ff9f1c',
  wood: '#d39a62',
  woodDark: '#a8764a',
  bread: '#e6a14f',
  dark: '#2b2230',
};
const SPRINKLES = ['#ff6f91', '#ffd166', '#5fd0c5', '#c7a6ff', '#ffffff', '#7fd3a7', '#6fb8ff'];

// A round plate with a coloured rim, top surface at y = 0.014 (centre) to 0.03 (rim).
export function plate(b, r = 0.17, rim = C.pink, t) {
  b.at(t, () => {
    b.lathe(`plate${r}`, [[0, 0.002], [r * 0.5, 0], [r * 0.56, 0.006], [r * 0.9, 0.021], [r, 0.03], [r * 0.97, 0.036], [r * 0.86, 0.028], [r * 0.55, 0.014], [0, 0.014]], C.plate, null, 'gloss', 28);
    b.tor(r * 0.935, 0.0045, rim, { y: 0.03, rx: PI / 2 }, 'gloss', TAU, 32, 4);
  });
}

// A bowl, lathe with inside wall; rim height h.
export function bowl(b, r, h, color, rim, t, key = '') {
  b.at(t, () => {
    b.lathe(`bowl${r},${h}${key}`, [[0, 0.002], [r * 0.45, 0], [r * 0.52, 0.008], [r * 0.9, h * 0.7], [r, h], [r * 0.93, h * 1.02], [r * 0.84, h * 0.72], [r * 0.42, h * 0.2], [0, h * 0.2]], color, null, 'gloss', 24);
    if (rim) b.tor(r * 0.965, 0.006, rim, { y: h, rx: PI / 2 }, 'gloss', TAU, 28, 4);
  });
}

// Flat faces closing a cylinder wedge: the cut sides between radius x0 and x1, angles +-gap/2 round +Z.
function cutFaces(b, x0, x1, y, h, color, gap) {
  const a = G.custom(`cutA${x0},${x1},${h}`, () => new THREE.PlaneGeometry(x1 - x0, h).translate((x0 + x1) / 2, 0, 0));
  const c = G.custom(`cutB${x0},${x1},${h}`, () => new THREE.PlaneGeometry(x1 - x0, h).rotateX(PI).translate((x0 + x1) / 2, 0, 0));
  b.add(a, color, { y, ry: gap / 2 - PI / 2 });
  b.add(c, color, { y, ry: -gap / 2 - PI / 2 });
}
// A cylinder with a wedge missing at the front (+Z), plus its cut faces.
function wedgeCyl(b, r, h, y, color, gap, cut = color, seg = 28) {
  b.add(G.cyl(r, r, h, seg, false, gap / 2, TAU - gap), color, { y: y + h / 2 });
  cutFaces(b, 0, r, y + h / 2, h, cut, gap);
}
// The missing wedge itself, as a separate slice.
function sliceCyl(b, r, h, y, color, gap, cut = color, seg = 6) {
  b.add(G.cyl(r, r, h, seg, false, -gap / 2, gap), color, { y: y + h / 2 });
  const a = G.custom(`cutA0,${r},${h}`, () => new THREE.PlaneGeometry(r, h).translate(r / 2, 0, 0));
  const c = G.custom(`cutB0,${r},${h}`, () => new THREE.PlaneGeometry(r, h).rotateX(PI).translate(r / 2, 0, 0));
  b.add(c, cut, { y: y + h / 2, ry: gap / 2 - PI / 2 });
  b.add(a, cut, { y: y + h / 2, ry: -gap / 2 - PI / 2 });
}

function sprinkles(b, n, seed, place) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = place(r, i);
    b.add(G.capsule(0.0032, 0.011, 1, 5), SPRINKLES[i % SPRINKLES.length], { x, y, z, rx: PI / 2 + (r() - 0.5) * 0.6, rz: r() * PI, order: 'ZXY' }, 'gloss');
  }
}
// Points on top of an ellipsoid dome (centre cx, cy, cz; radii rx, ry).
const onDome = (r, R, H, cy, spread = 0.85, cx = 0, cz = 0) => {
  const a = r() * TAU;
  const d = Math.sqrt(r()) * R * spread;
  return [cx + Math.cos(a) * d, cy + H * Math.sqrt(Math.max(0, 1 - (d / R) ** 2)), cz + Math.sin(a) * d];
};

// A strawberry, centre at the origin, tip pointing down.
export function strawberry(b, t, s = 1) {
  b.at({ ...t, s }, () => {
    b.lathe('berry', [[0, -0.032], [0.012, -0.024], [0.024, -0.007], [0.03, 0.01], [0.028, 0.022], [0.018, 0.03], [0, 0.032]], C.berry, null, 'gloss', 14);
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4;
      const yy = -0.016 + (i % 3) * 0.014;
      const rr = 0.018 + (i % 3) * 0.0055;
      b.sph(0.0028, '#ffe58a', { x: Math.sin(a) * rr, y: yy, z: Math.cos(a) * rr, s: [1, 1.5, 1] }, 'gloss', 5);
    }
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      b.sph(1, '#4caf50', { x: Math.sin(a) * 0.014, y: 0.031, z: Math.cos(a) * 0.014, ry: a, rx: 0.4, s: [0.007, 0.003, 0.016], order: 'YXZ' }, 'soft', 6);
    }
    b.cyl(0.003, 0.004, 0.016, '#3f8f3f', { y: 0.04 }, 'soft', 6);
  });
}

// A cupcake, base at y = 0.
export function cupcake(b, t, frost = C.pink, topper = 'heart', lite = false) {
  b.at(t, () => {
    const n = 14;
    for (let i = 0; i < n; i++) b.add(G.cyl(0.075, 0.058, 0.075, 2, true, (i / n) * TAU, TAU / n), i % 2 ? '#ff8fab' : '#ffc2d1', { y: 0.0375 });
    b.cyl(0.058, 0.058, 0.004, '#ff8fab', { y: 0.002 }, 'soft', 14);
    b.dome(0.077, C.sponge, { y: 0.072, s: [1, 0.42, 1] });
    b.tor(0.058, 0.026, frost, { y: 0.094, rx: PI / 2 }, 'gloss', TAU, 18, 7);
    b.tor(0.04, 0.022, frost, { y: 0.128, rx: PI / 2, rz: 0.5 }, 'gloss', TAU, 15, 7);
    b.tor(0.022, 0.018, frost, { y: 0.156, rx: PI / 2 }, 'gloss', TAU, 12, 6);
    b.sph(0.05, frost, { y: 0.11, s: [1, 0.9, 1] }, 'gloss', 12);
    b.cone(0.02, 0.034, frost, { y: 0.183 }, 'gloss', 10);
    if (!lite) sprinkles(b, 10, 9, (r) => {
      const a = r() * TAU;
      const lvl = r();
      const rr = lvl < 0.5 ? 0.075 : 0.055;
      return [Math.cos(a) * rr, lvl < 0.5 ? 0.1 : 0.136, Math.sin(a) * rr];
    });
    if (topper === 'heart') b.heart(0.032, C.berry, { y: 0.212, z: 0.004 });
    else b.sph(0.017, C.berry, { y: 0.205 }, 'gloss', 12);
  });
}

// ------------------------------------------------------------------ the menu
const DEFS = new Map();
function food(id, name, line, build) {
  DEFS.set(id, { id, name, line, build });
}

food('pecan-cake', 'Pecan cake', "Warm pecan cake, Roji's favourite.", (b) => {
  b.lathe('stand', [[0, 0], [0.09, 0], [0.095, 0.008], [0.036, 0.02], [0.028, 0.06], [0.168, 0.072], [0.176, 0.08], [0.17, 0.088], [0, 0.088]], C.white, null, 'gloss', 28);
  b.tor(0.172, 0.006, C.pink, { y: 0.083, rx: PI / 2 }, 'gloss', TAU, 32, 4);
  const y0 = 0.088;
  const R = 0.142;
  const gap = 0.9;
  // Body with a slice cut out at the front, showing sponge, cream and caramel layers
  b.add(G.cyl(R, R, 0.128, 28, false, gap / 2, TAU - gap), C.cream, { y: y0 + 0.064 });
  let y = y0;
  for (const [h, c] of [[0.034, C.sponge], [0.012, C.cream], [0.034, C.sponge], [0.012, C.caramel], [0.036, C.sponge]]) {
    cutFaces(b, 0, R - 0.007, y + h / 2, h, c, gap);
    y += h;
  }
  cutFaces(b, R - 0.007, R, y0 + 0.064, 0.128, C.cream, gap);
  // Caramel glaze on top, dripping down the sides
  const top = y0 + 0.128;
  wedgeCyl(b, R + 0.003, 0.012, top, C.caramel, gap);
  const r = rng(4);
  for (let i = 0; i < 16; i++) {
    const a = gap / 2 + 0.12 + (i / 16) * (TAU - gap - 0.24);
    const len = 0.012 + r() * 0.03;
    b.cap(0.009, len, C.caramel, { x: Math.sin(a) * (R + 0.002), y: top + 0.004 - len / 2, z: Math.cos(a) * (R + 0.002) }, 'gloss');
  }
  // Pecan halves and cream rosettes round the top
  const pecan = (x, z, ry, yy = top + 0.016) => {
    b.at({ x, y: yy, z, ry }, () => {
      b.sph(1, C.pecan, { x: -0.006, s: [0.008, 0.008, 0.02] }, 'gloss', 8);
      b.sph(1, C.pecanDark, { x: 0.006, s: [0.008, 0.008, 0.02] }, 'gloss', 8);
    });
  };
  for (let i = 0; i < 9; i++) {
    const a = gap / 2 + 0.25 + (i / 8) * (TAU - gap - 0.5);
    pecan(Math.sin(a) * 0.105, Math.cos(a) * 0.105, a);
    const a2 = a + (TAU - gap - 0.5) / 16;
    if (i < 8) {
      b.sph(0.014, C.cream, { x: Math.sin(a2) * 0.118, y: top + 0.018, z: Math.cos(a2) * 0.118 }, 'gloss', 10);
      b.cone(0.01, 0.018, C.cream, { x: Math.sin(a2) * 0.118, y: top + 0.033, z: Math.cos(a2) * 0.118 }, 'gloss', 8);
    }
  }
  pecan(-0.02, -0.03, 0.4, top + 0.02);
  pecan(0.022, -0.026, -0.6, top + 0.02);
  pecan(0, -0.002, 1.6, top + 0.03);
  b.tor(0.045, 0.006, C.caramel, { y: top + 0.014, rx: PI / 2 }, 'gloss', TAU, 20, 6);
});

food('german-cake', 'German chocolate cake', 'German chocolate cake with coconut pecan frosting.', (b) => {
  plate(b, 0.18, C.sky);
  const r = rng(11);
  const R = 0.132;
  const lumps = ['#c98d4a', '#e9cb93', '#b8743a', '#f3e2bd', C.pecan];
  const frosting = (y, h, top) => {
    b.cyl(R + 0.006, R + 0.006, h, '#c48841', { y: y + h / 2 }, 'soft', 28);
    const n = top ? 34 : 18;
    for (let i = 0; i < n; i++) {
      const a = r() * TAU;
      const d = top && i > 17 ? Math.sqrt(r()) * R * 0.85 : R + 0.004;
      const yy = top && i > 17 ? y + h : y + h * (0.3 + r() * 0.5);
      b.ico(0.008 + r() * 0.007, lumps[i % lumps.length], { x: Math.cos(a) * d, y: yy, z: Math.sin(a) * d, rx: r() * 3, ry: r() * 3 });
    }
  };
  let y = 0.014;
  for (let i = 0; i < 3; i++) {
    b.cyl(R, R, 0.042, C.choc, { y: y + 0.021 }, 'soft', 28);
    y += 0.042;
    frosting(y, i === 2 ? 0.024 : 0.018, i === 2);
    y += i === 2 ? 0.024 : 0.018;
  }
  // Chocolate rosettes round the top edge, pecans in the middle
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    b.sph(0.016, C.chocDark, { x: Math.sin(a) * 0.112, y: y + 0.008, z: Math.cos(a) * 0.112 }, 'gloss', 10);
    b.cone(0.012, 0.022, C.chocDark, { x: Math.sin(a) * 0.112, y: y + 0.026, z: Math.cos(a) * 0.112 }, 'gloss', 8);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.3;
    b.at({ x: Math.sin(a) * 0.045, y: y + 0.01, z: Math.cos(a) * 0.045, ry: a }, () => {
      b.sph(1, C.pecan, { x: -0.006, s: [0.008, 0.008, 0.02] }, 'gloss', 10);
      b.sph(1, C.pecanDark, { x: 0.006, s: [0.008, 0.008, 0.02] }, 'gloss', 10);
    });
  }
  b.sph(0.018, C.chocDark, { y: y + 0.012 }, 'gloss', 10);
});

food('cookies', 'Cookies', 'Fresh chocolate chip cookies, still warm.', (b) => {
  plate(b, 0.16, C.sky);
  const cookie = (t, seed) => {
    b.at(t, () => {
      b.sph(1, '#d99a5b', { s: [0.062, 0.017, 0.062] }, 'soft', 14);
      b.tor(0.054, 0.008, '#c8874a', { y: -0.004, rx: PI / 2 }, 'soft', TAU, 16, 4);
      const r = rng(seed);
      for (let i = 0; i < 6; i++) {
        const a = r() * TAU;
        const d = 0.012 + r() * 0.034;
        b.sph(1, '#4a2a1c', { x: Math.cos(a) * d, y: 0.016 * Math.sqrt(1 - (d / 0.062) ** 2), z: Math.sin(a) * d, s: [0.008, 0.005, 0.008] }, 'gloss', 6);
      }
    });
  };
  cookie({ x: -0.012, y: 0.03, z: -0.01, ry: 0.4 }, 1);
  cookie({ x: -0.004, y: 0.062, z: -0.016, ry: 1.3, rz: 0.04 }, 2);
  cookie({ x: -0.014, y: 0.094, z: -0.012, ry: 2.2, rx: -0.05 }, 3);
  cookie({ x: 0.09, y: 0.028, z: 0.04, ry: 0.9 }, 4);
  cookie({ x: -0.08, y: 0.03, z: 0.07, ry: 2.6 }, 5);
  cookie({ x: 0.06, y: 0.068, z: -0.07, rx: 1.15, ry: -0.5, order: 'YXZ' }, 6);
});

food('burger', 'Burger', 'A big juicy burger with extra cheese.', (b) => {
  b.cyl(0.16, 0.16, 0.018, C.wood, { y: 0.009 }, 'soft', 28);
  b.tor(0.13, 0.003, C.woodDark, { y: 0.018, rx: PI / 2 }, 'soft', TAU, 28, 3);
  let y = 0.018;
  b.lathe('bunlow', [[0, 0], [0.09, 0], [0.104, 0.01], [0.108, 0.026], [0.104, 0.034], [0, 0.034]], C.bread, { y }, 'soft', 24);
  y += 0.034;
  b.cyl(0.11, 0.11, 0.018, '#6e3b24', { y: y + 0.012 }, 'matte', 24);
  b.tor(0.108, 0.012, '#5e3220', { y: y + 0.012, rx: PI / 2 }, 'matte', TAU, 24, 6);
  y += 0.024;
  b.box(0.19, 0.007, 0.19, '#ffc93c', { y: y + 0.003, ry: PI / 4 }, 'gloss');
  y += 0.007;
  b.cyl(0.05, 0.05, 0.011, '#ef5b4f', { x: -0.045, y: y + 0.006, z: 0.04 }, 'gloss', 16);
  b.cyl(0.05, 0.05, 0.011, '#ef5b4f', { x: 0.05, y: y + 0.006, z: 0.02 }, 'gloss', 16);
  b.cyl(0.05, 0.05, 0.011, '#ef5b4f', { x: 0, y: y + 0.006, z: -0.05 }, 'gloss', 16);
  y += 0.011;
  b.cyl(0.112, 0.112, 0.008, '#7cc95a', { y: y + 0.004 }, 'soft', 24);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    b.sph(1, i % 2 ? '#7cc95a' : '#94d872', { x: Math.sin(a) * 0.112, y: y + 0.002, z: Math.cos(a) * 0.112, ry: a, s: [0.022, 0.008, 0.016] }, 'soft', 8);
  }
  y += 0.008;
  b.dome(0.112, '#e39646', { y, s: [1, 0.66, 1] }, 'gloss', 24);
  const r = rng(3);
  for (let i = 0; i < 16; i++) {
    const a = r() * TAU;
    const phi = 0.25 + r() * 0.85;
    b.sph(1, '#fff1cf', { x: Math.sin(phi) * Math.cos(a) * 0.112, y: y + Math.cos(phi) * 0.074, z: Math.sin(phi) * Math.sin(a) * 0.112, ry: -a, rz: phi * 0.8, s: [0.007, 0.003, 0.0045], order: 'YXZ' }, 'soft', 6);
  }
  // A little flag pick on top
  b.cyl(0.003, 0.003, 0.1, '#e8c79a', { y: y + 0.06 }, 'soft', 6);
  b.box(0.04, 0.026, 0.004, C.berry, { x: 0.021, y: y + 0.095 }, 'soft');
  b.box(0.02, 0.026, 0.0045, C.white, { x: 0.03, y: y + 0.095 }, 'soft');
  b.sph(0.006, C.yellow, { y: y + 0.112 }, 'gloss', 8);
});

food('candy', 'Candy', 'A sweet little pile of candy.', (b) => {
  bowl(b, 0.13, 0.05, '#ffd6e2', C.hotpink, null, 'candy');
  const r = rng(8);
  const cols = [C.hotpink, C.yellow, C.teal, C.lilac, '#ff9f5a', '#7fd3a7', '#6fb8ff'];
  const wrapped = (t, c) => {
    b.at(t, () => {
      b.sph(1, c, { s: [0.026, 0.02, 0.02] }, 'gloss', 12);
      b.cone(0.016, 0.022, c, { x: 0.034, rz: PI / 2 }, 'gloss', 8);
      b.cone(0.016, 0.022, c, { x: -0.034, rz: -PI / 2 }, 'gloss', 8);
      b.tor(0.012, 0.004, C.white, { x: 0.026, ry: PI / 2 }, 'gloss', TAU, 10, 4);
      b.tor(0.012, 0.004, C.white, { x: -0.026, ry: PI / 2 }, 'gloss', TAU, 10, 4);
    });
  };
  const spots = [[-0.05, 0.04, 0.03], [0.04, 0.04, 0.05], [0.0, 0.04, -0.05], [-0.06, 0.04, -0.04], [0.06, 0.042, -0.02], [-0.01, 0.07, 0.01], [0.03, 0.074, -0.02], [-0.035, 0.074, -0.01], [0.0, 0.04, 0.07]];
  spots.forEach(([x, y, z], i) => wrapped({ x, y, z, ry: r() * PI, rz: (r() - 0.5) * 0.5 }, cols[i % cols.length]));
  // Swirly lollipop standing in the pile
  b.at({ x: 0.02, y: 0.04, z: -0.01, rz: -0.12, rx: -0.08 }, () => {
    b.cyl(0.0045, 0.0045, 0.24, C.white, { y: 0.12 }, 'soft', 6);
    b.cyl(0.062, 0.062, 0.02, C.white, { y: 0.27, rx: PI / 2 }, 'gloss', 28);
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const a = i * 0.48;
      const rr = 0.056 * (i / 40);
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr, 0]);
    }
    const sp = G.tube('lolly', pts, 0.0075, 56, 4);
    b.add(sp, C.hotpink, { y: 0.27, z: 0.009 }, 'gloss');
    b.add(sp, C.hotpink, { y: 0.27, z: -0.009, ry: PI }, 'gloss');
    b.tor(0.012, 0.004, '#ff8fb1', { y: 0.2, rx: PI / 2 }, 'gloss', TAU, 10, 4);
    b.sph(1, '#ff8fb1', { x: 0.012, y: 0.2, s: [0.012, 0.007, 0.006] }, 'gloss', 8);
    b.sph(1, '#ff8fb1', { x: -0.012, y: 0.2, s: [0.012, 0.007, 0.006] }, 'gloss', 8);
  });
});

food('spanish-latte', 'Spanish latte', 'Iced Spanish latte, sweet and creamy.', (b) => {
  b.cyl(0.075, 0.075, 0.008, '#c99a6a', { y: 0.004 }, 'matte', 24);
  const y0 = 0.008;
  // Glass and its layers: condensed milk, milk, a soft mix, then espresso
  b.add(G.cyl(0.062, 0.054, 0.19, 20, true), C.white, { y: y0 + 0.095 }, 'glass');
  b.cyl(0.054, 0.054, 0.014, C.white, { y: y0 + 0.007 }, 'glass', 20);
  const layers = [[0.03, '#f7dfa6'], [0.062, '#fffaf0'], [0.024, '#e7c49d'], [0.042, '#8d5532']];
  let y = y0 + 0.014;
  for (const [h, c] of layers) {
    const rb = 0.0515 + ((y - y0) / 0.19) * 0.0075;
    const rt = 0.0515 + ((y + h - y0) / 0.19) * 0.0075;
    b.add(G.cyl(rt, rb, h, 20), c, { y: y + h / 2 }, 'gloss');
    y += h;
  }
  b.rbox(0.034, 0.03, 0.034, 0.006, '#e9f8ff', { x: -0.018, y: y + 0.002, z: 0.01, ry: 0.5, rz: 0.2 }, 'gloss');
  b.rbox(0.03, 0.028, 0.03, 0.006, '#e9f8ff', { x: 0.02, y: y - 0.002, z: -0.012, ry: 1.1, rx: 0.3 }, 'gloss');
  b.cyl(0.006, 0.006, 0.24, C.pink, { x: 0.016, y: y0 + 0.14, z: 0.01, rz: -0.18 }, 'gloss', 8);
  b.tor(0.061, 0.004, '#ffffff', { y: y0 + 0.19, rx: PI / 2 }, 'glass', TAU, 24, 4);
});

food('shawarma', 'Shawarma', 'A warm shawarma wrap with garlic sauce.', (b) => {
  plate(b, 0.15, '#7fd3a7');
  b.at({ x: -0.02, y: 0.016, z: -0.01, rz: 0.1, rx: 0.06 }, () => {
    // Saj bread rolled up, in a paper sleeve
    b.cyl(0.044, 0.042, 0.22, '#f0d29b', { y: 0.11 }, 'soft', 18);
    b.tor(0.042, 0.008, '#e8bd7a', { y: 0.22, rx: PI / 2 }, 'soft', TAU, 18, 6);
    const r = rng(14);
    for (let i = 0; i < 12; i++) {
      const a = r() * TAU;
      const yy = 0.12 + r() * 0.09;
      b.sph(1, '#c98a4a', { x: Math.sin(a) * 0.043, y: yy, z: Math.cos(a) * 0.043, ry: a, s: [0.008, 0.004, 0.002] }, 'soft', 6);
    }
    b.add(G.cyl(0.05, 0.046, 0.12, 18, true), C.white, { y: 0.06 }, 'matte');
    b.add(G.cyl(0.0505, 0.0495, 0.014, 18, true), C.berry, { y: 0.1 }, 'matte');
    b.add(G.cyl(0.0505, 0.0495, 0.006, 18, true), C.berry, { y: 0.083 }, 'matte');
    // Filling peeking out of the top
    const fill = [['#d9944f', 6], ['#b86b35', 4], ['#7cc95a', 5], ['#ef5b4f', 3], ['#fffaf0', 4], ['#8bc34a', 2]];
    let k = 0;
    for (const [c, n] of fill) {
      for (let i = 0; i < n; i++) {
        const a = (k++ * 2.39) % TAU;
        const d = 0.012 + (k % 3) * 0.009;
        b.ico(0.011 + r() * 0.006, c, { x: Math.cos(a) * d, y: 0.225 + r() * 0.02, z: Math.sin(a) * d, rx: r() * 3, ry: r() * 3 });
      }
    }
  });
  // Pickles and a cup of garlic sauce
  b.cap(0.012, 0.04, '#8bc34a', { x: 0.075, y: 0.028, z: 0.05, rz: PI / 2, ry: 0.5, order: 'YXZ' }, 'gloss');
  b.cap(0.011, 0.036, '#7cb342', { x: 0.06, y: 0.028, z: 0.085, rz: PI / 2, ry: -0.3, order: 'YXZ' }, 'gloss');
  b.lathe('saucecup', [[0, 0], [0.026, 0], [0.03, 0.028], [0.027, 0.03], [0.024, 0.006], [0, 0.006]], C.white, { x: 0.07, y: 0.014, z: -0.06 }, 'gloss', 16);
  b.cyl(0.025, 0.025, 0.004, '#fffdf2', { x: 0.07, y: 0.036, z: -0.06 }, 'gloss', 16);
});

food('mansaf', 'Mansaf', 'Mansaf, rice and lamb with jameed, made with love.', (b) => {
  // Big tray with a red and white pattern on the rim
  b.lathe('mtray', [[0, 0], [0.22, 0], [0.235, 0.006], [0.248, 0.028], [0.24, 0.03], [0.228, 0.012], [0, 0.012]], '#f3ece0', null, 'gloss', 36);
  b.tor(0.243, 0.0055, '#c0392b', { y: 0.029, rx: PI / 2 }, 'gloss', TAU, 40, 4);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    b.add(G.oct(1), C.white, { x: Math.sin(a) * 0.236, y: 0.022, z: Math.cos(a) * 0.236, ry: a, rx: -0.5, s: [0.008, 0.008, 0.003], order: 'YXZ' }, 'gloss');
  }
  // Shrak bread under the rice, edges peeking out
  b.cyl(0.215, 0.215, 0.008, '#e8c48d', { y: 0.016, ry: 0.2 }, 'flat', 11);
  b.cyl(0.2, 0.2, 0.006, '#dcb176', { y: 0.019, ry: 0.5 }, 'flat', 9);
  // The rice mound
  const top = 0.022;
  const RR = 0.185;
  const HH = 0.075;
  b.dome(RR, '#f4d77e', { y: top, s: [1, HH / RR, 1] }, 'soft', 22);
  const r = rng(21);
  for (let i = 0; i < 18; i++) {
    const [x, y, z] = onDome(r, RR, HH, top, 0.95);
    b.sph(1, i % 2 ? '#fbe6a6' : '#efc65e', { x, y, z, ry: r() * 3, s: [0.007, 0.003, 0.004] }, 'soft', 5);
  }
  // Lamb pieces
  const lamb = [[0, 0.07, 0, 0], [0.07, 0.055, 0.04, 1], [-0.07, 0.055, 0.03, 2], [0.03, 0.05, -0.08, 3], [-0.05, 0.05, -0.07, 4], [0.09, 0.04, -0.05, 5], [-0.02, 0.05, 0.09, 6]];
  for (const [x, y, z, i] of lamb) {
    b.add(G.rbox(0.062, 0.042, 0.05, 0.016, 1), i % 2 ? '#8a5636' : '#9c6440', { x, y: top + y, z, ry: i * 0.9, rz: (r() - 0.5) * 0.5 }, 'soft');
    if (i % 3 === 0) {
      b.cyl(0.007, 0.007, 0.05, '#fff6e6', { x: x + 0.02, y: top + y + 0.02, z: z + 0.01, rz: 1.1, ry: i }, 'soft', 8);
      b.sph(0.011, '#fff6e6', { x: x + 0.042, y: top + y + 0.033, z: z + 0.01 }, 'soft', 8);
    }
  }
  // Toasted almonds, pine nuts and parsley
  for (let i = 0; i < 18; i++) {
    const [x, y, z] = onDome(r, RR, HH, top + 0.006, 0.8);
    b.sph(1, '#f2d9b0', { x, y, z, ry: r() * 3, rz: (r() - 0.5) * 0.6, s: [0.013, 0.005, 0.007] }, 'soft', 6);
  }
  for (let i = 0; i < 18; i++) {
    const [x, y, z] = onDome(r, RR, HH, top + 0.005, 0.85);
    b.sph(1, '#fff2cc', { x, y, z, ry: r() * 3, s: [0.006, 0.003, 0.0035] }, 'soft', 5);
  }
  for (let i = 0; i < 14; i++) {
    const [x, y, z] = onDome(r, RR, HH, top + 0.004, 0.9);
    b.ico(0.006, '#4caf50', { x, y, z, rx: r() * 3 });
  }
  // A little bowl of jameed sauce
  bowl(b, 0.05, 0.04, C.white, '#b8323e', { x: 0.235, y: 0, z: 0.2 }, 'jameed');
  b.cyl(0.043, 0.043, 0.004, '#fff8e6', { x: 0.235, y: 0.032, z: 0.2 }, 'gloss', 18);
});

food('popcorn', 'Popcorn', 'Buttery popcorn for movie night.', (b) => {
  const n = 12;
  for (let i = 0; i < n; i++) b.add(G.cyl(0.11, 0.08, 0.2, 2, true, (i / n) * TAU, TAU / n), i % 2 ? C.white : '#e5484d', { y: 0.1 }, 'soft');
  b.cyl(0.08, 0.08, 0.006, '#e5484d', { y: 0.003 }, 'soft', 16);
  b.tor(0.11, 0.006, C.white, { y: 0.2, rx: PI / 2 }, 'soft', TAU, 28, 5);
  b.cyl(0.106, 0.106, 0.01, '#fff3cf', { y: 0.195 }, 'soft', 20);
  const r = rng(5);
  for (let i = 0; i < 38; i++) {
    const a = r() * TAU;
    const d = Math.sqrt(r()) * 0.1;
    const y = 0.205 + 0.07 * (1 - (d / 0.11) ** 2) * (0.6 + r() * 0.4);
    b.ico(0.019 + r() * 0.01, r() < 0.7 ? '#fff3cf' : '#ffe08a', { x: Math.cos(a) * d, y, z: Math.sin(a) * d, rx: r() * 3, ry: r() * 3 });
  }
  b.ico(0.02, '#fff3cf', { x: 0.13, y: 0.014, z: 0.05, rx: 1 });
  b.ico(0.018, '#ffe08a', { x: -0.12, y: 0.012, z: 0.08, rx: 2 });
});

food('pizza', 'Pizza', 'Cheesy pizza, the first slice is yours.', (b) => {
  b.cyl(0.175, 0.175, 0.016, C.wood, { y: 0.008 }, 'soft', 32);
  b.rbox(0.05, 0.016, 0.1, 0.007, C.wood, { y: 0.008, z: -0.215 }, 'soft');
  b.tor(0.012, 0.004, C.woodDark, { y: 0.017, z: -0.24, rx: PI / 2 }, 'soft', TAU, 10, 4);
  const gap = PI / 4;
  const y0 = 0.016;
  const toppings = (r, inSlice) => {
    for (let i = 0; i < 9; i++) {
      const a = r() * TAU;
      const d = 0.03 + r() * 0.085;
      if ((Math.abs(((a + PI) % TAU) - PI) < gap / 2 + 0.06) !== inSlice) continue;
      b.cyl(0.021, 0.021, 0.005, '#c0392b', { x: Math.sin(a) * d, y: y0 + 0.022, z: Math.cos(a) * d }, 'gloss', 14);
    }
  };
  const pizza = () => {
    wedgeCyl(b, 0.145, 0.01, y0, '#e5484d', gap, '#f0c27a');
    wedgeCyl(b, 0.137, 0.008, y0 + 0.01, '#ffd166', gap);
    b.arc(0.146, 0.014, gap / 2, TAU - gap, '#e0a457', y0 + 0.011, 'soft');
    const r = rng(2);
    toppings(r, false);
    for (let i = 0; i < 6; i++) {
      const a = gap / 2 + 0.3 + (i / 6) * (TAU - gap - 0.4);
      b.sph(1, '#3fa34d', { x: Math.sin(a) * 0.07, y: y0 + 0.02, z: Math.cos(a) * 0.07, ry: a * 2, s: [0.016, 0.003, 0.009] }, 'gloss', 8);
      b.tor(0.007, 0.0035, '#2b2b2b', { x: Math.sin(a + 0.4) * 0.11, y: y0 + 0.02, z: Math.cos(a + 0.4) * 0.11, rx: PI / 2 }, 'gloss', TAU, 10, 4);
    }
  };
  pizza();
  // The first slice, pulled out with strings of cheese
  b.at({ z: 0.05, ry: 0.05 }, () => {
    sliceCyl(b, 0.145, 0.01, y0, '#e5484d', gap, '#f0c27a');
    sliceCyl(b, 0.137, 0.008, y0 + 0.01, '#ffd166', gap);
    b.arc(0.146, 0.014, -gap / 2, gap, '#e0a457', y0 + 0.011, 'soft');
    b.cyl(0.021, 0.021, 0.005, '#c0392b', { x: 0.014, y: y0 + 0.022, z: 0.085 }, 'gloss', 14);
    b.cyl(0.018, 0.018, 0.005, '#c0392b', { x: -0.008, y: y0 + 0.022, z: 0.04 }, 'gloss', 14);
    b.sph(1, '#3fa34d', { x: -0.016, y: y0 + 0.02, z: 0.11, s: [0.014, 0.003, 0.008] }, 'gloss', 8);
  });
  for (const [x, z] of [[-0.02, 0.03], [0.012, 0.05], [0.03, 0.07]]) b.cyl(0.003, 0.003, 0.05, '#ffe08a', { x, y: y0 + 0.016, z, rx: PI / 2 }, 'gloss', 5);
});

food('ice-cream', 'Ice cream', 'Three scoops and a cherry on top.', (b) => {
  const waffle = texMat('waffle', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e3a75a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c0803c';
    ctx.lineWidth = 7;
    for (let i = -w; i < w * 2; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.moveTo(i + h, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }
  }, { repeat: [3, 2], rough: 0.8 });
  // Pink stand holding the cone
  b.lathe('icstand', [[0, 0], [0.056, 0], [0.059, 0.01], [0.036, 0.02], [0.022, 0.058], [0.03, 0.074], [0.026, 0.078], [0.017, 0.068], [0, 0.068]], '#ff9eb5', null, 'gloss', 20);
  b.tex(G.cone(0.056, 0.17, 18, true), waffle, { y: 0.115, rx: PI });
  b.tor(0.056, 0.008, '#e3a75a', { y: 0.2, rx: PI / 2 }, 'soft', TAU, 20, 6);
  const scoop = (r, y, c, x = 0, seed = 1) => {
    b.sph(r, c, { x, y }, 'gloss', 16);
    b.tor(r * 0.85, r * 0.25, c, { x, y: y - r * 0.55, rx: PI / 2 }, 'gloss', TAU, 18, 6);
    const rr = rng(seed);
    for (let i = 0; i < 4; i++) {
      const a = rr() * TAU;
      const len = 0.006 + rr() * 0.012;
      b.cap(r * 0.18, len, c, { x: x + Math.sin(a) * r * 0.95, y: y - r * 0.6 - len / 2, z: Math.cos(a) * r * 0.95 }, 'gloss');
    }
  };
  scoop(0.056, 0.236, '#ff9eb5', 0, 1);
  scoop(0.05, 0.31, '#fff1d6', 0.004, 2);
  scoop(0.044, 0.375, '#a8e6cf', -0.003, 3);
  b.dome(0.042, '#5b3122', { x: -0.003, y: 0.39, s: [1, 0.7, 1] }, 'gloss', 16);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.4;
    b.cap(0.0065, 0.012 + (i % 2) * 0.01, '#5b3122', { x: -0.003 + Math.sin(a) * 0.041, y: 0.384 - (i % 2) * 0.005, z: Math.cos(a) * 0.041 }, 'gloss');
  }
  sprinkles(b, 16, 4, (r) => onDome(r, 0.042, 0.03, 0.392, 0.8, -0.003));
  b.sph(0.017, '#d7263d', { x: -0.003, y: 0.437 }, 'gloss', 14);
  b.add(G.tube('cherry', [[0, 0, 0], [0.004, 0.015, 0], [0.012, 0.028, 0]], 0.0022, 8, 4), '#5d8a3a', { x: -0.003, y: 0.45 }, 'soft');
});

food('cupcake', 'Cupcake', 'A pink cupcake with sprinkles.', (b) => {
  cupcake(b, { s: 1.15 });
});

food('donut', 'Donuts', 'Glazed donuts with rainbow sprinkles.', (b) => {
  plate(b, 0.15, C.yellow);
  // One lying flat with pink icing
  b.at({ x: 0.015, y: 0.014 + 0.026, z: 0.045 }, () => {
    b.tor(0.058, 0.032, '#e0a457', { rx: PI / 2, s: [1, 1, 0.8] }, 'soft', TAU, 24, 9);
    b.tor(0.058, 0.034, '#ff8fb1', { y: 0.008, rx: PI / 2, s: [1, 1, 0.62] }, 'gloss', TAU, 24, 9);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.3;
      b.cap(0.009, 0.006 + (i % 2) * 0.008, '#ff8fb1', { x: Math.sin(a) * 0.09, y: -0.002 - (i % 2) * 0.003, z: Math.cos(a) * 0.09 }, 'gloss');
    }
    sprinkles(b, 20, 6, (r) => {
      const a = r() * TAU;
      const w = (r() - 0.5) * 1.3;
      return [Math.cos(a) * (0.058 + w * 0.03), 0.008 + 0.021 * Math.sqrt(1 - Math.min(1, w * w)), Math.sin(a) * (0.058 + w * 0.03)];
    });
  });
  // One standing behind it with chocolate icing
  b.at({ x: -0.03, y: 0.108, z: -0.075, rx: -0.3 }, () => {
    b.tor(0.058, 0.032, '#e0a457', { s: [1, 1, 0.8] }, 'soft', TAU, 24, 9);
    b.tor(0.058, 0.034, '#5b3122', { z: 0.008, s: [1, 1, 0.62] }, 'gloss', TAU, 24, 9);
    sprinkles(b, 14, 7, (r) => {
      const a = r() * TAU;
      const w = (r() - 0.5) * 1.2;
      return [Math.cos(a) * (0.058 + w * 0.03), Math.sin(a) * (0.058 + w * 0.03), 0.008 + 0.021 * Math.sqrt(1 - Math.min(1, w * w))];
    });
  });
});

food('fries', 'Fries', 'Golden fries with ketchup.', (b) => {
  b.add(G.cyl(0.085, 0.062, 0.14, 4, false, PI / 4), '#e5484d', { y: 0.07, s: [1, 1, 0.62] }, 'soft');
  const r = rng(12);
  for (let i = 0; i < 20; i++) {
    const x = ((i % 5) - 2) * 0.022 + (r() - 0.5) * 0.008;
    const z = (Math.floor(i / 5) - 1.5) * 0.014;
    b.box(0.016, 0.15, 0.016, i % 3 ? '#ffcf4d' : '#ffdb70', { x, y: 0.13 + r() * 0.04, z, rx: (r() - 0.5) * 0.4, rz: x * 3 + (r() - 0.5) * 0.3 }, 'soft');
  }
  b.heart(0.05, C.yellow, { y: 0.07, z: 0.039, rx: -0.07 }, 'gloss', 0.2, 0.06);
  // Ketchup cup
  b.lathe('ketchup', [[0, 0], [0.028, 0], [0.032, 0.028], [0.029, 0.03], [0.026, 0.006], [0, 0.006]], C.white, { x: 0.11, z: 0.05 }, 'gloss', 16);
  b.dome(0.027, '#d7263d', { x: 0.11, y: 0.022, z: 0.05, s: [1, 0.35, 1] }, 'gloss', 14);
});

food('milkshake', 'Milkshake', 'A strawberry milkshake to share.', (b) => {
  b.lathe('shakeglass', [[0, 0], [0.05, 0], [0.052, 0.008], [0.015, 0.02], [0.013, 0.05], [0.038, 0.07], [0.06, 0.2], [0.066, 0.245]], C.white, null, 'glass', 22);
  b.lathe('shake', [[0, 0.058], [0.034, 0.072], [0.056, 0.2], [0.061, 0.238], [0, 0.238]], '#ffadc6', null, 'gloss', 22);
  b.tor(0.042, 0.024, C.white, { y: 0.248, rx: PI / 2 }, 'gloss', TAU, 18, 8);
  b.tor(0.025, 0.021, C.white, { y: 0.276, rx: PI / 2, rz: 0.4 }, 'gloss', TAU, 14, 8);
  b.sph(0.035, C.white, { y: 0.262 }, 'gloss', 14);
  b.cone(0.017, 0.03, C.white, { y: 0.305 }, 'gloss', 10);
  b.sph(0.017, '#d7263d', { y: 0.325 }, 'gloss', 14);
  b.add(G.tube('cherry', [[0, 0, 0], [0.004, 0.015, 0], [0.012, 0.028, 0]], 0.0022, 8, 4), '#5d8a3a', { y: 0.337 }, 'soft');
  b.at({ x: 0.03, y: 0.21, z: -0.01, rz: -0.2 }, () => {
    b.cyl(0.008, 0.008, 0.22, C.hotpink, null, 'gloss', 10);
    for (let i = 0; i < 4; i++) b.tor(0.0083, 0.0022, C.white, { y: 0.062 + i * 0.012, rx: PI / 2 }, 'gloss', TAU, 10, 3);
  });
  b.rbox(0.012, 0.075, 0.03, 0.004, '#f0c27a', { x: -0.03, y: 0.28, z: 0.004, rz: 0.3 }, 'soft');
  sprinkles(b, 10, 5, (r) => onDome(r, 0.05, 0.03, 0.262, 0.9));
});

food('strawberries', 'Strawberries', 'A bowl of fresh red strawberries.', (b) => {
  bowl(b, 0.12, 0.06, C.white, C.teal, null, 'berries');
  const spots = [[-0.04, 0.05, 0.03, 0.6, 0.2], [0.04, 0.05, 0.03, -0.5, -0.3], [0, 0.05, -0.045, 0.3, 0.9], [-0.05, 0.055, -0.03, 0.9, -0.6], [0.05, 0.055, -0.03, -0.9, 0.5], [0, 0.088, 0.0, 0.1, 0], [-0.025, 0.085, 0.035, 0.7, 0.3], [0.03, 0.086, 0.025, -0.6, 0.2]];
  for (const [x, y, z, rz, rx] of spots) strawberry(b, { x, y, z, rz, rx }, 1.1);
  strawberry(b, { x: 0.13, y: 0.024, z: 0.06, rz: 1.5, ry: -0.6, order: 'YXZ' }, 1.05);
});

food('hot-cocoa', 'Hot cocoa', 'Hot cocoa with marshmallows.', (b) => {
  b.lathe('saucer', [[0, 0.002], [0.05, 0], [0.056, 0.006], [0.085, 0.016], [0.09, 0.022], [0.084, 0.024], [0.06, 0.014], [0, 0.012]], C.white, null, 'gloss', 24);
  b.tor(0.085, 0.004, C.pink, { y: 0.021, rx: PI / 2 }, 'gloss', TAU, 24, 4);
  b.lathe('mug', [[0, 0], [0.054, 0], [0.06, 0.006], [0.061, 0.1], [0.057, 0.106], [0.052, 0.1], [0.052, 0.012], [0, 0.012]], '#ff8fab', { y: 0.012 }, 'gloss', 24);
  b.tor(0.032, 0.011, '#ff8fab', { x: 0.064, y: 0.068, rz: -PI / 2 }, 'gloss', PI, 14, 8);
  b.heart(0.04, C.white, { y: 0.07, z: 0.059, rx: 0 }, 'gloss', 0.15, 0.05);
  b.cyl(0.052, 0.052, 0.004, '#7a4a2e', { y: 0.1 }, 'gloss', 22);
  const r = rng(6);
  const mm = [[-0.02, 0.008], [0.018, 0.014], [0.0, -0.022], [-0.026, -0.016], [0.022, -0.016]];
  mm.forEach(([x, z], i) => b.rbox(0.022, 0.02, 0.022, 0.006, i % 2 ? '#ffd6e2' : C.white, { x, y: 0.106, z, ry: r() * 2, rx: (r() - 0.5) * 0.5 }, 'soft'));
  // Soft steam
  b.add(G.tube('steam1', [[0, 0, 0], [0.012, 0.03, 0], [-0.008, 0.06, 0.004], [0.006, 0.09, 0]], 0.006, 16, 5), C.white, { x: -0.014, y: 0.125 }, 'glass');
  b.add(G.tube('steam2', [[0, 0, 0], [-0.01, 0.025, 0], [0.008, 0.05, 0], [-0.004, 0.072, 0]], 0.005, 14, 5), C.white, { x: 0.018, y: 0.125 }, 'glass');
});

food('sandwich', 'Sandwich', 'A tasty club sandwich.', (b) => {
  plate(b, 0.16, C.peach);
  const half = (t) => {
    b.at(t, () => {
      let y = 0;
      const layer = (r, h, c, f = 'soft') => {
        b.add(G.cyl(r, r, h, 3), c, { y: y + h / 2 }, f);
        y += h;
      };
      const bread = () => {
        b.add(G.cyl(0.086, 0.086, 0.022, 3), '#d9a15a', { y: y + 0.011 });
        b.add(G.cyl(0.078, 0.078, 0.024, 3), '#f6e2b5', { y: y + 0.011 });
        y += 0.023;
      };
      bread();
      layer(0.091, 0.008, '#7cc95a');
      layer(0.086, 0.01, '#f4a3a8');
      layer(0.088, 0.007, '#ffc93c', 'gloss');
      layer(0.084, 0.01, '#ef5b4f', 'gloss');
      layer(0.09, 0.007, '#94d872');
      bread();
      b.cyl(0.0025, 0.0025, 0.11, '#e8c79a', { y: y - 0.02 }, 'soft', 6);
      b.sph(0.009, C.hotpink, { y: y + 0.035 }, 'gloss', 10);
    });
  };
  half({ x: -0.05, y: 0.014, z: 0.035, ry: PI + 0.3 });
  half({ x: 0.06, y: 0.014, z: -0.03, ry: PI - 0.4 });
});

food('juice', 'Orange juice', 'Fresh orange juice, full of sunshine.', (b) => {
  b.cyl(0.07, 0.07, 0.008, '#ffd8a8', { y: 0.004 }, 'matte', 24);
  b.lathe('juiceglass', [[0, 0.008], [0.05, 0.008], [0.06, 0.17]], C.white, null, 'glass', 20);
  b.cyl(0.05, 0.05, 0.012, C.white, { y: 0.014 }, 'glass', 20);
  b.lathe('juice', [[0, 0.02], [0.0478, 0.02], [0.0565, 0.14], [0, 0.14]], '#ffa62b', null, 'gloss', 20);
  b.rbox(0.03, 0.028, 0.03, 0.006, '#fff4d6', { x: -0.016, y: 0.14, z: 0.006, ry: 0.4, rz: 0.25 }, 'gloss');
  // Orange wheel on the rim
  b.at({ x: 0.046, y: 0.165, z: 0.012, ry: 0.5 }, () => {
    b.cyl(0.042, 0.042, 0.012, C.orange, { rx: PI / 2 }, 'gloss', 20);
    b.cyl(0.035, 0.035, 0.0125, '#ffd27a', { rx: PI / 2 }, 'gloss', 20);
    for (let i = 0; i < 4; i++) b.box(0.068, 0.0035, 0.013, '#fff4d6', { rz: (i * PI) / 4 }, 'soft');
  });
  b.cyl(0.006, 0.006, 0.2, '#ffd166', { x: -0.014, y: 0.15, z: -0.01, rz: 0.2 }, 'gloss', 8);
});

// ------------------------------------------------------------------ extras
food('knafeh', 'Knafeh', 'Warm knafeh with pistachios.', (b) => {
  b.lathe('ktray', [[0, 0], [0.17, 0], [0.18, 0.006], [0.19, 0.034], [0.184, 0.036], [0.172, 0.012], [0, 0.012]], '#e0a15f', null, 'metal', 32);
  const gap = 0.7;
  const y0 = 0.012;
  wedgeCyl(b, 0.168, 0.008, y0, '#e8892c', gap);
  wedgeCyl(b, 0.165, 0.018, y0 + 0.008, '#fff8ec', gap);
  wedgeCyl(b, 0.168, 0.01, y0 + 0.026, '#f08a2c', gap);
  const r = rng(30);
  for (let i = 0; i < 40; i++) {
    const a = gap / 2 + 0.1 + r() * (TAU - gap - 0.2);
    const d = r() * 0.15;
    b.box(0.03, 0.003, 0.004, r() < 0.5 ? '#f7a04a' : '#d9731c', { x: Math.sin(a) * d, y: y0 + 0.037, z: Math.cos(a) * d, ry: r() * PI }, 'soft');
  }
  for (let i = 0; i < 34; i++) {
    const a = gap / 2 + 0.2 + r() * (TAU - gap - 0.4);
    const d = 0.02 + r() * 0.06;
    b.ico(0.0065, r() < 0.6 ? '#8cc152' : '#b5d96a', { x: Math.sin(a) * d, y: y0 + 0.039, z: Math.cos(a) * d, rx: r() * 3 });
  }
  // The first piece lifted, with a cheese pull
  b.at({ z: 0.055 }, () => {
    sliceCyl(b, 0.168, 0.008, y0, '#e8892c', gap);
    sliceCyl(b, 0.165, 0.018, y0 + 0.008, '#fff8ec', gap);
    sliceCyl(b, 0.168, 0.01, y0 + 0.026, '#f08a2c', gap);
    for (let i = 0; i < 6; i++) b.ico(0.006, '#8cc152', { x: (i - 2.5) * 0.012, y: y0 + 0.039, z: 0.06 + (i % 3) * 0.02, rx: i });
  });
  for (const [x, z] of [[-0.016, 0.07], [0.016, 0.065], [0.026, 0.1]]) b.cyl(0.0035, 0.0035, 0.04, '#fffaf0', { x, y: y0 + 0.02, z, ry: x > 0 ? -0.35 : 0.35, rz: PI / 2, order: 'YXZ' }, 'gloss', 6);
});

food('falafel', 'Falafel', 'Crispy falafel with hummus.', (b) => {
  plate(b, 0.17, C.teal);
  // Hummus with olive oil, paprika and chickpeas
  bowl(b, 0.065, 0.036, C.white, '#3c8fb5', { x: -0.065, y: 0.014, z: -0.03 }, 'hum');
  b.dome(0.058, '#e9d3a3', { x: -0.065, y: 0.032, z: -0.03, s: [1, 0.25, 1] }, 'soft', 18);
  b.tor(0.032, 0.007, '#f0dcae', { x: -0.065, y: 0.044, z: -0.03, rx: PI / 2 }, 'soft', TAU, 16, 5);
  b.cyl(0.02, 0.02, 0.003, '#c8b44a', { x: -0.065, y: 0.047, z: -0.03 }, 'gloss', 14);
  for (let i = 0; i < 3; i++) b.sph(0.008, '#e6c88a', { x: -0.065 + (i - 1) * 0.012, y: 0.05, z: -0.03 + (i % 2) * 0.008 }, 'soft', 8);
  for (let i = 0; i < 6; i++) b.sph(0.003, '#d9482b', { x: -0.065 + Math.cos(i) * 0.04, y: 0.047, z: -0.03 + Math.sin(i) * 0.04 }, 'soft', 5);
  // Falafel balls
  const r = rng(40);
  const balls = [[0.05, 0.03], [0.085, -0.015], [0.04, -0.035], [0.075, 0.07], [0.02, 0.07]];
  for (const [x, z] of balls) {
    b.ico(0.026, '#8a5a2b', { x, y: 0.038, z, rx: r() * 3, ry: r() * 3, s: [1, 0.85, 1] }, 'flat', 1);
    b.ico(0.004, '#5a8f3a', { x: x + 0.012, y: 0.058, z: z + 0.008 });
  }
  b.ico(0.026, '#7d4f24', { x: 0.06, y: 0.078, z: 0.02, rx: 1, s: [1, 0.85, 1] }, 'flat', 1);
  // Pita wedges and parsley
  for (const [x, z, ry] of [[-0.09, 0.08, 0.4], [-0.04, 0.1, 1.2], [-0.12, 0.03, 2.3]]) b.add(G.cyl(0.05, 0.05, 0.01, 3), '#efcf95', { x, y: 0.02, z, ry, rz: 0.08 }, 'soft');
  for (let i = 0; i < 5; i++) b.ico(0.01, '#4caf50', { x: 0.1 + (r() - 0.5) * 0.03, y: 0.022, z: -0.07 + (r() - 0.5) * 0.03, rx: r() * 3 });
});

food('pancakes', 'Pancakes', 'Fluffy pancakes with syrup and berries.', (b) => {
  plate(b, 0.16, C.lilac);
  let y = 0.014;
  for (let i = 0; i < 4; i++) {
    const x = (i % 2) * 0.006 - 0.003;
    b.cyl(0.09, 0.092, 0.018, '#e7a95a', { x, y: y + 0.009 }, 'soft', 26);
    b.tor(0.088, 0.009, '#f2c27e', { x, y: y + 0.009, rx: PI / 2 }, 'soft', TAU, 26, 6);
    y += 0.02;
  }
  b.dome(0.084, '#e0902f', { y, s: [1, 0.07, 1] }, 'gloss', 22);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.5;
    const len = 0.012 + (i % 3) * 0.012;
    b.cap(0.009, len, '#e0902f', { x: Math.sin(a) * 0.094, y: y - len / 2 - 0.003, z: Math.cos(a) * 0.094, s: [1, 1, 0.7], ry: a }, 'gloss');
  }
  b.rbox(0.036, 0.022, 0.034, 0.007, '#fff1a8', { x: 0.006, y: y + 0.014, z: -0.004, ry: 0.4 }, 'gloss');
  strawberry(b, { x: -0.04, y: y + 0.024, z: 0.03, rz: 1.3 }, 0.9);
  strawberry(b, { x: 0.05, y: y + 0.02, z: 0.03, rz: -1.2, ry: 0.5 }, 0.85);
  for (const [x, z] of [[-0.03, -0.04], [0.035, -0.04], [0.0, 0.055], [-0.06, -0.01]]) b.sph(0.011, '#3f4fa8', { x, y: y + 0.008, z }, 'gloss', 10);
});

food('macarons', 'Macarons', 'Pastel macarons, light as air.', (b) => {
  plate(b, 0.15, C.mint);
  const mac = (t, c) => {
    b.at(t, () => {
      b.add(G.sph(1, 14, 5, 0, PI / 2), c, { y: 0.004, s: [0.033, 0.016, 0.033] }, 'soft');
      b.add(G.sph(1, 14, 5, PI / 2, PI / 2), c, { y: -0.004, s: [0.033, 0.016, 0.033] }, 'soft');
      b.cyl(0.0335, 0.0335, 0.008, new THREE.Color(c).multiplyScalar(0.9), null, 'flat', 14);
      b.cyl(0.029, 0.029, 0.009, '#fff6ea', null, 'gloss', 14);
    });
  };
  const cols = ['#ffb3c6', '#a8e6cf', '#c7a6ff', '#ffe08a', '#ffb38a', '#9ad7ff', '#ffc2d1'];
  const lie = [[-0.06, 0.03, 0], [0.0, 0.03, 0.06], [0.06, 0.03, 0.01], [-0.02, 0.03, -0.05], [0.04, 0.03, -0.06]];
  lie.forEach(([x, y, z], i) => mac({ x, y, z }, cols[i]));
  mac({ x: -0.03, y: 0.056, z: 0.0 }, cols[5]);
  mac({ x: 0.03, y: 0.058, z: -0.02 }, cols[6]);
  mac({ x: 0.0, y: 0.06, z: 0.04, rx: -1.2 }, cols[0]);
  mac({ x: 0.0, y: 0.083, z: -0.01 }, cols[2]);
});

food('watermelon', 'Watermelon', 'Cold watermelon slices for a hot day.', (b) => {
  plate(b, 0.17, C.mint);
  const slice = (t) => {
    b.at(t, () => {
      const L = 1.15;
      const ts = -L / 2;
      b.add(G.cyl(0.112, 0.112, 0.028, 12, false, ts, L), '#4c9a3a', { rx: PI / 2 }, 'gloss');
      b.add(G.cyl(0.104, 0.104, 0.0295, 12, false, ts, L), '#f3f7dc', { rx: PI / 2 });
      b.add(G.cyl(0.098, 0.098, 0.031, 12, false, ts, L), '#ff5a6e', { rx: PI / 2 }, 'gloss');
      for (const s of [1, -1]) {
        for (let i = 0; i < 4; i++) {
          const a = ts + ((i + 0.6) / 4.2) * L;
          const d = 0.058 + (i % 2) * 0.016;
          b.sph(1, '#2b2230', { x: Math.sin(a) * d, y: -Math.cos(a) * d, z: s * 0.0158, rz: a, s: [0.0035, 0.007, 0.002] }, 'gloss', 6);
        }
      }
    });
  };
  slice({ x: -0.06, y: 0.126, z: -0.075, ry: 0.35 });
  slice({ x: 0.06, y: 0.126, z: -0.05, ry: -0.35 });
  slice({ x: 0.0, y: 0.036, z: -0.015, rx: -PI / 2 + 0.05, ry: 0.15, order: 'YXZ' });
});

food('bubble-tea', 'Bubble tea', 'Milk tea with chewy pearls.', (b) => {
  b.lathe('bobacup', [[0, 0], [0.05, 0], [0.062, 0.18]], C.white, null, 'glass', 20);
  b.cyl(0.05, 0.05, 0.008, C.white, { y: 0.004 }, 'glass', 20);
  b.lathe('bobasyrup', [[0, 0.006], [0.048, 0.006], [0.0525, 0.05], [0, 0.05]], '#8a5a2b', null, 'gloss', 20);
  b.lathe('bobatea', [[0, 0.05], [0.0525, 0.05], [0.0595, 0.16], [0, 0.16]], '#dcb791', null, 'gloss', 20);
  const r = rng(50);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU * 2 + r() * 0.3;
    const yy = 0.016 + (i % 3) * 0.013;
    const rr = 0.04 + (yy / 0.18) * 0.008;
    b.sph(0.011, '#2e1a12', { x: Math.sin(a) * rr, y: yy, z: Math.cos(a) * rr }, 'gloss', 10);
  }
  b.dome(0.062, C.white, { y: 0.18, s: [1, 0.55, 1] }, 'glass', 18);
  b.tor(0.062, 0.004, '#ffffff', { y: 0.18, rx: PI / 2 }, 'gloss', TAU, 24, 4);
  b.at({ x: 0.008, y: 0.2, z: 0.004, rz: -0.12 }, () => {
    b.cyl(0.011, 0.011, 0.25, C.hotpink, { y: 0.0 }, 'gloss', 12);
  });
  // A little heart sticker on the cup
  b.heart(0.032, C.pink, { y: 0.1, z: 0.059, rx: -0.07 }, 'gloss', 0.12, 0.03);
});

food('croissant', 'Croissant', 'A buttery croissant, fresh from the oven.', (b) => {
  plate(b, 0.14, C.yellow);
  const segs = 7;
  for (let i = 0; i < segs; i++) {
    const k = i / (segs - 1);
    const a = -1.25 + k * 2.5;
    const thick = 0.011 + 0.017 * Math.sin(k * PI);
    b.sph(1, i % 2 ? '#d98f3e' : '#e8a955', { x: Math.sin(a) * 0.065, y: 0.014 + thick * 0.85, z: -Math.cos(a) * 0.065 + 0.03, ry: -a, s: [0.02, thick, thick * 1.3] }, 'gloss', 14);
  }
});

food('birthday-cake', 'Birthday cake', 'A birthday cake with candles to wish on.', (b) => {
  b.lathe('bstand', [[0, 0], [0.09, 0], [0.095, 0.008], [0.036, 0.02], [0.028, 0.05], [0.158, 0.062], [0.165, 0.07], [0.16, 0.078], [0, 0.078]], C.white, null, 'gloss', 28);
  const y0 = 0.078;
  b.cyl(0.135, 0.135, 0.13, '#ffb3c6', { y: y0 + 0.065 }, 'soft', 30);
  b.cyl(0.138, 0.138, 0.012, C.white, { y: y0 + 0.128 }, 'gloss', 30);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU;
    const len = 0.012 + ((i * 7) % 5) * 0.007;
    b.cap(0.011, len, C.white, { x: Math.sin(a) * 0.136, y: y0 + 0.12 - len / 2, z: Math.cos(a) * 0.136 }, 'gloss');
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    b.sph(0.01, '#fff6ea', { x: Math.sin(a) * 0.137, y: y0 + 0.008, z: Math.cos(a) * 0.137 }, 'gloss', 6);
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + 0.3;
    b.sph(0.013, C.hotpink, { x: Math.sin(a) * 0.112, y: y0 + 0.138, z: Math.cos(a) * 0.112 }, 'gloss', 10);
  }
  sprinkles(b, 18, 13, (r) => {
    const a = r() * TAU;
    const d = r() * 0.09;
    return [Math.cos(a) * d, y0 + 0.136, Math.sin(a) * d];
  });
  const cols = ['#6fb8ff', C.yellow, '#7fd3a7', C.lilac, C.hotpink];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.6;
    const x = Math.sin(a) * 0.06;
    const z = Math.cos(a) * 0.06;
    b.cyl(0.0065, 0.0065, 0.07, cols[i], { x, y: y0 + 0.165, z }, 'gloss', 8);
    b.tor(0.0068, 0.0022, C.white, { x, y: y0 + 0.155, z, rx: PI / 2 }, 'gloss', TAU, 8, 3);
    b.tor(0.0068, 0.0022, C.white, { x, y: y0 + 0.175, z, rx: PI / 2 }, 'gloss', TAU, 8, 3);
    b.sph(1, '#ffb703', { x, y: y0 + 0.212, z, s: [0.009, 0.016, 0.009] }, 'glow', 10);
    b.sph(1, '#fff3b0', { x, y: y0 + 0.208, z: z + 0.002, s: [0.005, 0.009, 0.005] }, 'glow', 8);
  }
});

// Fallback for unknown ids: a plate with a silver cover
food('surprise', 'Surprise dish', 'Something tasty under the cover.', (b) => {
  plate(b, 0.16, C.pink);
  b.dome(0.12, '#e9ecf3', { y: 0.016, s: [1, 0.85, 1] }, 'metal', 22);
  b.tor(0.12, 0.007, '#d7dbe5', { y: 0.018, rx: PI / 2 }, 'metal', TAU, 28, 5);
  b.sph(0.016, C.gold, { y: 0.122 }, 'metal', 12);
  b.cyl(0.006, 0.008, 0.012, C.gold, { y: 0.114 }, 'metal', 8);
});

// ------------------------------------------------------------------ public api
export const FOODS = [...DEFS.values()].filter((d) => d.id !== 'surprise').map(({ id, name, line }) => ({ id, name, line }));

const tpls = new Map();
function template(id) {
  if (!tpls.has(id)) {
    const b = new Builder();
    DEFS.get(id).build(b);
    tpls.set(id, b.bake());
  }
  return tpls.get(id);
}

const ALIASES = { cake: 'pecan-cake', 'chocolate-cake': 'german-cake', cookie: 'cookies', latte: 'spanish-latte', coffee: 'spanish-latte', icecream: 'ice-cream', donuts: 'donut', shake: 'milkshake', strawberry: 'strawberries', cocoa: 'hot-cocoa', 'orange-juice': 'juice', kunafa: 'knafeh', kunafeh: 'knafeh', boba: 'bubble-tea', macaron: 'macarons' };
const resolve = (id) => (DEFS.has(id) ? id : DEFS.has(ALIASES[id]) ? ALIASES[id] : 'surprise');

export function makeFood(id) {
  const key = resolve(id);
  const obj = instantiate(template(key), 'food:' + key);
  obj.userData.prop = { kind: 'food', id: key, name: DEFS.get(key).name };
  return obj;
}

// Draw a food into another builder (the cupcake box, a picnic basket).
export function buildFood(b, id, t) {
  b.at(t, () => DEFS.get(resolve(id)).build(b));
}
