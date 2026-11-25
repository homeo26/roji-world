import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat as baseMat, umat, mesh, canvasTexture, roundRect, FONT, rng, bakeStatic } from '../../util.js';

// Building blocks for The Dice House (outside and in): primitives with a geometry cache, a texture atlas,
// the vertex-colour bake, dice, chess pieces, game boxes, the café cat and frozen people.

export { THREE, mergeGeometries, umat, mesh, canvasTexture, roundRect, FONT, rng, bakeStatic };

const P = Math.PI;

export const COL = {
  purple: '#8b5cf6',
  grape: '#6d3fd6',
  plum: '#4b2a8a',
  lilac: '#c7a6ff',
  lav: '#e6dcff',
  cream: '#fff4e3',
  paper: '#fffaf2',
  white: '#ffffff',
  sun: '#ffd166',
  gold: '#f4c24f',
  rose: '#ef5b6f',
  pink: '#ff9eb5',
  blush: '#ffd6e0',
  red: '#e5484d',
  blue: '#3f7bf0',
  sky: '#8fd3ff',
  mint: '#7fd8bf',
  teal: '#2fb39a',
  green: '#3fbf7f',
  leaf: '#6cc24a',
  leafDark: '#3f9a4f',
  orange: '#f6a04d',
  wood: '#d4a373',
  woodLight: '#e8c497',
  woodDark: '#9b6a43',
  ink: '#3b2b3f',
  felt: '#2f9b6e',
  stone: '#e9dcc8',
  chalk: '#2f4a43',
};

// Shared materials (roughness in three steps so more meshes merge)
export function mat(color, o = {}) {
  if (o.emissive || o.map || o.transparent || o.side) return baseMat(color, o);
  const r = o.rough === undefined ? 0.78 : o.rough;
  return baseMat(color, { ...o, rough: r < 0.45 ? 0.3 : r < 0.72 ? 0.6 : 0.85 });
}

// ------------------------------------------------------------------ geometry helpers
export function heartGeo(size, depth = 0.04, n = 28) {
  const s = new THREE.Shape();
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * P * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    if (i === 0) s.moveTo((x / 34) * size, ((y + 4) / 30) * size);
    else s.lineTo((x / 34) * size, ((y + 4) / 30) * size);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: depth * 0.35, bevelThickness: depth * 0.35, bevelSegments: 2 });
  g.computeBoundingBox();
  const b = g.boundingBox;
  g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -depth / 2);
  return g;
}

export function uvScale(geo, sx, sy) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
  return geo;
}

// Primitive makers with a geometry cache local to one build. Small things cast no shadow.
export function kit() {
  const cache = new Map();
  const geo = (key, make) => {
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
  };
  const M = (c, o) => (typeof c === 'string' ? mat(c, o) : c);
  const sm = (g, c, o, size) => mesh(g, M(c, o), { cast: size >= 0.3 });
  return {
    geo,
    M,
    box: (w, h, d, c, o) => sm(geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), c, o, Math.max(w, h, d)),
    rbox: (w, h, d, c, r = 0.06, o) =>
      sm(geo(`r${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, Math.max(w, h, d) > 0.7 && r >= 0.04 ? 2 : 1, Math.min(r, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002))), c, o, Math.max(w, h, d)),
    cyl: (a, b, h, c, seg = 16, o) => sm(geo(`c${a},${b},${h},${seg}`, () => new THREE.CylinderGeometry(a, b, h, Math.max(a, b) < 0.06 ? Math.min(seg, 8) : seg)), c, o, Math.max(a * 2, b * 2, h)),
    sph: (r, c, o, seg = 14) => sm(geo(`s${r},${seg}`, () => new THREE.SphereGeometry(r, r < 0.05 ? Math.min(seg, 8) : seg, Math.max(5, Math.round((r < 0.05 ? Math.min(seg, 8) : seg) * 0.7)))), c, o, r * 2),
    tor: (r, t, c, arc = P * 2, o, seg = 20, rs = 8) => sm(geo(`t${r},${t},${arc},${seg},${rs}`, () => new THREE.TorusGeometry(r, t, rs, seg, arc)), c, o, r * 2),
    cone: (r, h, c, seg = 16, o) => sm(geo(`k${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)), c, o, Math.max(r * 2, h)),
    heart: (size, depth, c, o) => sm(geo(`h${size},${depth}`, () => heartGeo(size, depth)), c, o, size),
    lathe: (pts, c, seg = 20, o) => sm(geo(`l${pts.join(';')},${seg}`, () => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg)), c, o, 1),
    at: (o, x, y, z) => (o.position.set(x, y, z), o),
    rot: (o, x, y, z) => (o.rotation.set(x, y, z), o),
  };
}

// ------------------------------------------------------------------ baking
// Merge every plain-coloured, non-glowing static mesh under `group` into a few meshes with vertex
// colours. single: everything in one mesh (for a moving part). Returns the merged meshes.
const vcMats = new Map();
export function colorBake(group, skip = [], { single = false, cast = true } = {}) {
  group.updateMatrixWorld(true);
  const skipSet = new Set();
  for (const d of skip) d.traverse((o) => skipSet.add(o));
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const buckets = new Map();
  const victims = [];
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o === group || skipSet.has(o) || o.children.length || !o.visible) return;
    const m = o.material;
    if (Array.isArray(m) || !m.isMeshStandardMaterial || m.map || m.transparent || m.vertexColors || m.side !== THREE.FrontSide) return;
    if (m.emissiveIntensity > 0 && m.emissive.r + m.emissive.g + m.emissive.b > 0) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.clearGroups();
    g.morphAttributes = {};
    rel.multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(rel);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = m.color.r;
      col[i * 3 + 1] = m.color.g;
      col[i * 3 + 2] = m.color.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const rough = single ? 0.6 : m.roughness < 0.45 ? 0.3 : m.roughness < 0.72 ? 0.6 : 0.85;
    const metal = !single && m.metalness > 0.3 ? 0.55 : 0;
    const key = single ? 'one' : `${rough}|${metal}|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}`;
    if (!buckets.has(key)) buckets.set(key, { rough, metal, cast: single ? cast : o.castShadow, receive: single ? true : o.receiveShadow, list: [] });
    buckets.get(key).list.push(g);
    victims.push(o);
  });
  for (const o of victims) o.removeFromParent();
  const out = [];
  for (const b of buckets.values()) {
    const geo = mergeGeometries(b.list, false);
    for (const g of b.list) g.dispose();
    if (!geo) continue;
    const mk = `${b.rough}|${b.metal}`;
    if (!vcMats.has(mk)) vcMats.set(mk, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: b.rough, metalness: b.metal }));
    const me = new THREE.Mesh(geo, vcMats.get(mk));
    me.castShadow = b.cast;
    me.receiveShadow = b.receive;
    group.add(me);
    out.push(me);
  }
  return out;
}
// A moving group: its fixed parts in one mesh (plus one per textured material)
export const bakeOne = (group, keep = [], cast = true) => {
  colorBake(group, keep, { single: true, cast });
  bakeStatic(group, keep, mergeGeometries);
  return group;
};

// ------------------------------------------------------------------ textures
// One canvas for many flat decals: one material, one draw call. glow: emissive strength (lit at night).
export function makeAtlas(W = 2048, H = 2048, { rough = 0.8, glow = 0 } = {}) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const material = umat('#ffffff', { rough, map: tex });
  if (glow) {
    material.emissive = new THREE.Color('#ffffff');
    material.emissiveMap = tex;
    material.emissiveIntensity = glow;
  }
  let x = 0;
  let y = 0;
  let row = 0;
  const PAD = 4;
  const cell = (w, h, draw, geo) => {
    if (x + w > W) {
      x = 0;
      y += row + PAD;
      row = 0;
    }
    if (y + h > H) console.warn('board games atlas is full');
    const cx = x;
    const cy = y;
    x += w + PAD;
    row = Math.max(row, h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    draw(ctx, w, h);
    ctx.restore();
    tex.needsUpdate = true;
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (cx + 0.5 + uv.getX(i) * (w - 1)) / W, 1 - (cy + h - 0.5) / H + (uv.getY(i) * (h - 1)) / H);
    return geo;
  };
  return {
    material,
    tex,
    cell,
    panel: (wm, hm, pw, ph, draw) => mesh(cell(pw, ph, draw, new THREE.PlaneGeometry(wm, hm)), material, { cast: false }),
    wrap: (geo, pw, ph, draw, cast = false) => mesh(cell(pw, ph, draw, geo), material, { cast }),
  };
}

// Text that shrinks until it fits maxW.
export function fitText(c, text, x, y, maxW, size, weight = 600) {
  c.font = `${weight} ${size}px ${FONT}`;
  const w = c.measureText(text).width;
  if (w > maxW) c.font = `${weight} ${Math.floor((size * maxW) / w)}px ${FONT}`;
  c.fillText(text, x, y);
}

export function heartPath(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y + s * 0.35);
  c.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  c.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  c.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  c.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.35);
  c.closePath();
}

let glow = null;
export function glowTex() {
  return (glow ??= canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }));
}

// A pip layout on a canvas die face (used by painted dice on boxes and signs)
export function drawPips(c, cx, cy, s, n, color) {
  const L = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]] }[n];
  c.fillStyle = color;
  for (const [u, v] of L) {
    c.beginPath();
    c.arc(cx + u * s * 0.27, cy + v * s * 0.27, s * 0.1, 0, P * 2);
    c.fill();
  }
}

// ------------------------------------------------------------------ dice
const PIP_LAYOUT = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]],
};
// Faces: [value, normal, u, v]; opposite faces add up to 7
const FACES = [
  [1, [0, 1, 0], [1, 0, 0], [0, 0, 1]],
  [6, [0, -1, 0], [1, 0, 0], [0, 0, 1]],
  [2, [0, 0, 1], [1, 0, 0], [0, 1, 0]],
  [5, [0, 0, -1], [1, 0, 0], [0, 1, 0]],
  [3, [1, 0, 0], [0, 0, 1], [0, 1, 0]],
  [4, [-1, 0, 0], [0, 0, 1], [0, 1, 0]],
];
export const DIE_FACES = FACES.map(([n, N]) => ({ n, normal: new THREE.Vector3(...N) }));

// A rounded die: body plus pips, baked into one mesh with vertex colours. Origin at its centre.
export function makeDie(size = 0.9, { body = '#fffdf7', pip = COL.plum, heartOne = false } = {}) {
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(size, size, size, size > 0.6 ? 3 : 2, size * 0.16), mat(body, { rough: 0.35 })));
  const pipGeo = new THREE.CylinderGeometry(size * 0.085, size * 0.085, size * 0.02, size > 0.6 ? 16 : 10);
  const heart = heartOne ? heartGeo(size * 0.3, size * 0.03) : null;
  const pm = mat(pip, { rough: 0.4 });
  const d = size * 0.26;
  const up = new THREE.Vector3(0, 1, 0);
  for (const [n, N, U, V] of FACES) {
    const nv = new THREE.Vector3(...N);
    for (const [u, v] of PIP_LAYOUT[n]) {
      let p;
      if (n === 1 && heart) {
        p = mesh(heart, mat(COL.rose, { rough: 0.4 }), { cast: false });
        p.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nv);
      } else {
        p = mesh(pipGeo, pm, { cast: false });
        p.quaternion.setFromUnitVectors(up, nv);
      }
      p.position.copy(nv).multiplyScalar(size * 0.497).addScaledVector(new THREE.Vector3(...U), u * d).addScaledVector(new THREE.Vector3(...V), v * d);
      g.add(p);
    }
  }
  colorBake(g, [], { single: true });
  return g;
}

// A plump heart with three white pips: the easter egg on the top shelf. Faces +Z, origin at its centre.
export function makeHeartDie(size = 0.3) {
  const g = new THREE.Group();
  g.add(mesh(heartGeo(size, size * 0.5), mat(COL.rose, { rough: 0.35 })));
  const pipGeo = new THREE.SphereGeometry(size * 0.065, 10, 8);
  for (const [x, y] of [[-0.18, 0.12], [0, -0.05], [0.18, 0.12]]) {
    const p = mesh(pipGeo, mat(COL.white, { rough: 0.3 }), { cast: false });
    p.position.set(x * size, y * size, size * 0.34);
    p.scale.z = 0.4;
    g.add(p);
  }
  colorBake(g, [], { single: true });
  return g;
}

// Quaternion that brings face `n` to the top.
const qTmp = new THREE.Quaternion();
export function dieTop(n, yaw = 0) {
  const f = DIE_FACES.find((d) => d.n === n);
  const q = new THREE.Quaternion().setFromUnitVectors(f.normal, new THREE.Vector3(0, 1, 0));
  return qTmp.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiply(q).clone();
}

// ------------------------------------------------------------------ chess pieces (lathe profiles, height about 1 at scale 1)
const PROFILES = {
  pawn: [[0, 0], [0.32, 0], [0.33, 0.06], [0.27, 0.11], [0.2, 0.16], [0.14, 0.3], [0.11, 0.48], [0.2, 0.52], [0.2, 0.56], [0.09, 0.6], [0, 0.6]],
  king: [[0, 0], [0.36, 0], [0.37, 0.07], [0.3, 0.12], [0.22, 0.2], [0.15, 0.42], [0.13, 0.7], [0.26, 0.74], [0.26, 0.79], [0.16, 0.82], [0.24, 1.02], [0.2, 1.06], [0, 1.08]],
  queen: [[0, 0], [0.36, 0], [0.37, 0.07], [0.3, 0.12], [0.22, 0.2], [0.15, 0.42], [0.12, 0.68], [0.25, 0.72], [0.25, 0.77], [0.15, 0.8], [0.25, 0.97], [0.2, 1.0], [0, 1.01]],
  rook: [[0, 0], [0.34, 0], [0.35, 0.07], [0.29, 0.12], [0.24, 0.18], [0.21, 0.6], [0.29, 0.64], [0.29, 0.8], [0, 0.8]],
  base: [[0, 0], [0.34, 0], [0.35, 0.07], [0.29, 0.12], [0.24, 0.2], [0.22, 0.3], [0, 0.3]],
};

function knightHead() {
  const s = new THREE.Shape();
  s.moveTo(-0.2, 0.0);
  s.lineTo(0.2, 0.0);
  s.quadraticCurveTo(0.12, 0.22, 0.22, 0.34);
  s.lineTo(0.34, 0.42);
  s.quadraticCurveTo(0.42, 0.5, 0.33, 0.57);
  s.lineTo(0.12, 0.62);
  s.lineTo(0.12, 0.74);
  s.lineTo(0.03, 0.66);
  s.quadraticCurveTo(-0.22, 0.62, -0.25, 0.32);
  s.quadraticCurveTo(-0.26, 0.14, -0.2, 0.0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -0.1);
  return g;
}

// kind: pawn | king | queen | rook | knight. Returns a Group, base at y = 0, facing +Z.
export function chessPiece(K, kind, color, scale = 1, accent = null) {
  const g = new THREE.Group();
  const m = K.M(color, { rough: 0.45 });
  if (kind === 'knight') {
    g.add(K.lathe(PROFILES.base, m, 22));
    const head = mesh(K.geo('knight', knightHead), m);
    head.position.y = 0.28;
    head.rotation.y = -P / 2;
    g.add(head);
    const dark = K.M(accent || COL.ink, { rough: 0.4 });
    for (const s of [-1, 1]) g.add(K.at(K.sph(0.035, dark, undefined, 8), s * 0.125, 0.82, 0.1));
    for (let i = 0; i < 5; i++) g.add(K.at(K.sph(0.055, accent || m, undefined, 8), 0, 0.42 + i * 0.1, -0.2 + i * 0.03));
  } else {
    g.add(K.lathe(PROFILES[kind], m, kind === 'pawn' ? 18 : 22));
    if (kind === 'pawn') g.add(K.at(K.sph(0.17, m, undefined, 16), 0, 0.73, 0));
    if (kind === 'king') {
      g.add(K.at(K.box(0.08, 0.3, 0.08, m), 0, 1.22, 0));
      g.add(K.at(K.box(0.24, 0.08, 0.08, m), 0, 1.25, 0));
    }
    if (kind === 'queen') {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * P * 2;
        g.add(K.at(K.sph(0.045, m, undefined, 8), Math.sin(a) * 0.22, 1.0, Math.cos(a) * 0.22));
      }
      g.add(K.at(K.sph(0.09, accent || m, undefined, 12), 0, 1.1, 0));
    }
    if (kind === 'rook') {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * P * 2;
        const b = K.box(0.13, 0.12, 0.1, m);
        b.position.set(Math.sin(a) * 0.23, 0.86, Math.cos(a) * 0.23);
        b.rotation.y = a;
        g.add(b);
      }
    }
  }
  g.scale.setScalar(scale);
  return g;
}

// ------------------------------------------------------------------ meeple
export function meepleGeo(depth = 0.3) {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  s.lineTo(-0.18, 0);
  s.lineTo(0, 0.32);
  s.lineTo(0.18, 0);
  s.lineTo(0.5, 0);
  s.quadraticCurveTo(0.42, 0.5, 0.22, 0.62);
  s.quadraticCurveTo(0.6, 0.7, 0.6, 0.8);
  s.quadraticCurveTo(0.55, 0.92, 0.2, 0.88);
  s.quadraticCurveTo(0.3, 1.15, 0, 1.2);
  s.quadraticCurveTo(-0.3, 1.15, -0.2, 0.88);
  s.quadraticCurveTo(-0.55, 0.92, -0.6, 0.8);
  s.quadraticCurveTo(-0.6, 0.7, -0.22, 0.62);
  s.quadraticCurveTo(-0.42, 0.5, -0.5, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -depth / 2);
  return g;
}

// ------------------------------------------------------------------ game boxes
// Made-up games for the shelves, plus the four the café can open. line: what the box says when picked.
export const BOXES = [
  { title: 'Snakes and Ladders', c: '#3fbf7f', c2: '#ffd166', motif: 'ladder', arena: 'snakes', line: 'Up the ladders, down the snakes. The snakes here are very polite.' },
  { title: 'Four in a Row', c: '#3f7bf0', c2: '#ffd166', motif: 'discs', arena: 'connect4', line: 'Drop the discs and line up four. Roji always guards the middle.' },
  { title: 'X O', c: '#ef5b6f', c2: '#fff4e3', motif: 'xo', arena: 'tictactoe', line: 'Three in a row. The oldest game in the café, and still the quickest.' },
  { title: 'Rock Paper Scissors', c: '#f6a04d', c2: '#fff4e3', motif: 'hand', arena: 'rps', line: 'Best of five. Homama always opens with rock. Do not tell him we know.' },
  { title: 'Llama Drama', c: '#c7a6ff', c2: '#ffffff', motif: 'dots', line: 'Six llamas, one hat, a lot of shouting. The hat goes to Roji.' },
  { title: 'Pancake Tower', c: '#ffd166', c2: '#a0602e', motif: 'stack', line: 'Stack the pancakes before the syrup runs out. Eat the ones that fall.' },
  { title: 'Penguin Party', c: '#8fd3ff', c2: '#3b2b3f', motif: 'dots', line: 'Penguins slide, penguins wobble, penguins win. Best played with cocoa.' },
  { title: 'Moon Race', c: '#4b2a8a', c2: '#ffd166', motif: 'stars', line: 'Rockets made of cardboard race to the moon. First one there names a crater.' },
  { title: 'Dragon Picnic', c: '#2fb39a', c2: '#ff9eb5', motif: 'hearts', line: 'Feed the dragons before they get grumpy. They like strawberries best.' },
  { title: 'Cat Castle', c: '#ff9eb5', c2: '#ffffff', motif: 'stack', line: 'Build a castle out of cats. The cats have opinions.' },
  { title: 'Treasure Isle', c: '#f2d59b', c2: '#3f7bf0', motif: 'stars', line: 'Dig for gold on a tiny island. The real treasure is the snacks.' },
  { title: 'Robot Bakery', c: '#d3dbe5', c2: '#ef5b6f', motif: 'dots', line: 'Robots bake cakes against the clock. Homama would love this one.' },
  { title: 'Cloud Hop', c: '#e6f6ff', c2: '#6fb8ff', motif: 'dots', line: 'Hop from cloud to cloud without looking down. Roji never looks down.' },
  { title: 'Dino Dash', c: '#6cc24a', c2: '#fff4e3', motif: 'stripes', line: 'Tiny dinosaurs race to the volcano. The slowest one gets a hug.' },
  { title: 'Word Soup', c: '#fff4e3', c2: '#e5484d', motif: 'letters', line: 'Fish letters out of the soup and spell things. Roji spells "doctor" in one go.' },
  { title: 'Bunny Bingo', c: '#ffd6e0', c2: '#8b5cf6', motif: 'dots', line: 'Bingo, but every number is a bunny. Everybody wins a carrot.' },
  { title: 'Pirate Pizza', c: '#e5484d', c2: '#ffd166', motif: 'stripes', line: 'Pirates sail for the best pizza on the sea. Extra cheese is the treasure.' },
  { title: 'Garden Gnomes', c: '#7fd8bf', c2: '#e5484d', motif: 'hearts', line: 'Hide the gnomes in the garden. Find them before the sprinklers do.' },
  { title: 'Space Kittens', c: '#2c3e66', c2: '#ff9eb5', motif: 'stars', line: 'Kittens in tiny helmets explore the stars. Very fluffy, very brave.' },
  { title: 'Jelly Jump', c: '#ff7fa3', c2: '#fff4e3', motif: 'dots', line: 'Bounce across the jelly before it sets. Wobbly fun for everyone.' },
  { title: 'Sushi Stack', c: '#fff4e3', c2: '#2fb39a', motif: 'stack', line: 'Stack sushi as tall as you dare. The tallest tower gets eaten first.' },
  { title: 'Doctor Dash', c: '#8fd3ff', c2: '#ef5b6f', motif: 'hearts', line: 'Race round the hospital helping everyone. Roji holds the record, obviously.' },
  { title: 'Code Quest', c: '#3b2b3f', c2: '#7fd8bf', motif: 'letters', line: 'Write tiny programs to guide a robot home. Homama reads every rule twice.' },
];
// The rare one, only found after a few picks
export const SECRET_BOX = { title: 'Roji and Homama', sub: 'The Game', c: '#ef5b6f', c2: '#ffffff', motif: 'hearts', line: 'Two players. Nobody ever loses. Every card in the box is a hug.' };

// Paint a box lid: background, a motif and the title. Fits any w x h cell.
export function drawBoxArt(c, w, h, b, { spine = false } = {}) {
  c.fillStyle = b.c;
  c.fillRect(0, 0, w, h);
  const s = Math.min(w, h);
  c.fillStyle = b.c2;
  c.globalAlpha = 0.85;
  const m = b.motif;
  if (m === 'stripes') for (let x = -h; x < w; x += s * 0.5) {
    c.beginPath();
    c.moveTo(x, h);
    c.lineTo(x + s * 0.22, h);
    c.lineTo(x + s * 0.22 + h, 0);
    c.lineTo(x + h, 0);
    c.fill();
  }
  else if (m === 'stars' || m === 'dots' || m === 'hearts') {
    const r = rng(b.title.length * 7 + 3);
    for (let i = 0; i < (spine ? 6 : 10); i++) {
      const x = r() * w;
      const y = r() * h;
      const z = s * (0.06 + r() * 0.08);
      if (m === 'hearts') {
        heartPath(c, x, y - z / 2, z);
        c.fill();
      } else if (m === 'stars') {
        c.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * P * 2 - P / 2;
          const rr = k % 2 ? z * 0.4 : z;
          c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        c.fill();
      } else {
        c.beginPath();
        c.arc(x, y, z * 0.6, 0, P * 2);
        c.fill();
      }
    }
  } else if (m === 'ladder') {
    c.lineWidth = s * 0.05;
    c.strokeStyle = b.c2;
    for (const x of [0.12, 0.24]) {
      c.beginPath();
      c.moveTo(w * x, h * 0.1);
      c.lineTo(w * x, h * 0.9);
      c.stroke();
    }
    for (let y = 0.18; y < 0.9; y += 0.14) {
      c.beginPath();
      c.moveTo(w * 0.12, h * y);
      c.lineTo(w * 0.24, h * y);
      c.stroke();
    }
    c.strokeStyle = '#e5484d';
    c.lineWidth = s * 0.07;
    c.beginPath();
    c.moveTo(w * 0.78, h * 0.12);
    c.bezierCurveTo(w * 0.95, h * 0.35, w * 0.65, h * 0.6, w * 0.85, h * 0.88);
    c.stroke();
  } else if (m === 'discs') {
    for (let i = 0; i < 6; i++) {
      c.fillStyle = i % 2 ? '#e5484d' : '#ffd166';
      c.beginPath();
      c.arc(w * (0.12 + (i % 3) * 0.08), h * (0.35 + Math.floor(i / 3) * 0.3), s * 0.09, 0, P * 2);
      c.fill();
    }
  } else if (m === 'xo') {
    c.lineWidth = s * 0.06;
    c.strokeStyle = b.c2;
    c.beginPath();
    c.moveTo(w * 0.08, h * 0.25);
    c.lineTo(w * 0.2, h * 0.75);
    c.moveTo(w * 0.2, h * 0.25);
    c.lineTo(w * 0.08, h * 0.75);
    c.stroke();
    c.beginPath();
    c.arc(w * 0.86, h * 0.5, s * 0.18, 0, P * 2);
    c.stroke();
  } else if (m === 'hand') {
    c.beginPath();
    c.arc(w * 0.14, h * 0.5, s * 0.22, 0, P * 2);
    c.fill();
    c.fillRect(w * 0.8, h * 0.2, s * 0.25, h * 0.6);
  } else if (m === 'stack') {
    for (let i = 0; i < 4; i++) {
      c.fillStyle = i % 2 ? b.c2 : '#ffffff';
      roundRect(c, w * 0.06, h * (0.72 - i * 0.16), w * 0.18, h * 0.13, h * 0.05);
      c.fill();
    }
  } else if (m === 'letters') {
    c.font = `700 ${s * 0.3}px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('A', w * 0.1, h * 0.35);
    c.fillText('Z', w * 0.9, h * 0.65);
  }
  c.globalAlpha = 1;
  // Title on a white band
  c.fillStyle = 'rgba(255,255,255,0.9)';
  const bh = spine ? h * 0.7 : h * 0.4;
  roundRect(c, w * 0.14, (h - bh) / 2, w * 0.72, bh, bh * 0.3);
  c.fill();
  c.fillStyle = COL.ink;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  if (b.sub && !spine) {
    fitText(c, b.title, w / 2, h / 2 - bh * 0.15, w * 0.66, bh * 0.36, 700);
    c.fillStyle = COL.rose;
    fitText(c, b.sub, w / 2, h / 2 + bh * 0.25, w * 0.6, bh * 0.26, 600);
  } else fitText(c, b.title, w / 2, h / 2 + bh * 0.04, w * 0.66, bh * (spine ? 0.62 : 0.42), 700);
}

// ------------------------------------------------------------------ Roji and Homama, painted
// Chibi Roji (left) and Homama (right) standing side by side, feet at (x, y), s = height in px.
export function drawCouple(c, x, y, s, { hold = true, heart = true, rojiLook = null, homamaLook = null } = {}) {
  const R = { skin: '#f8dccb', hair: '#2a1a13', top: '#ef5b6f', ...(rojiLook || {}) };
  const H = { skin: '#f6d8c6', hair: '#141010', top: '#6fb8ff', bottom: '#2c3e66', ...(homamaLook || {}) };
  const u = s / 100;
  const person = (cx, L, girl) => {
    // legs
    c.fillStyle = L.skin;
    c.fillRect(cx - 9 * u, y - 22 * u, 6 * u, 20 * u);
    c.fillRect(cx + 3 * u, y - 22 * u, 6 * u, 20 * u);
    c.fillStyle = girl ? '#7a2e3a' : '#3b2b3f';
    roundRect(c, cx - 11 * u, y - 5 * u, 9 * u, 5 * u, 2 * u);
    c.fill();
    roundRect(c, cx + 2 * u, y - 5 * u, 9 * u, 5 * u, 2 * u);
    c.fill();
    // body
    c.fillStyle = L.top;
    if (girl) {
      c.beginPath();
      c.moveTo(cx - 9 * u, y - 52 * u);
      c.lineTo(cx + 9 * u, y - 52 * u);
      c.lineTo(cx + 18 * u, y - 20 * u);
      c.lineTo(cx - 18 * u, y - 20 * u);
      c.closePath();
      c.fill();
    } else {
      roundRect(c, cx - 13 * u, y - 52 * u, 26 * u, 22 * u, 5 * u);
      c.fill();
      c.fillStyle = H.bottom;
      c.fillRect(cx - 12 * u, y - 32 * u, 24 * u, 12 * u);
    }
    // head
    const hy = y - 68 * u;
    c.fillStyle = L.hair;
    if (girl) {
      for (const sd of [-1, 1]) {
        c.beginPath();
        c.ellipse(cx + sd * 22 * u, hy + 6 * u, 7 * u, 12 * u, sd * 0.3, 0, P * 2);
        c.fill();
      }
    }
    c.fillStyle = L.skin;
    c.beginPath();
    c.arc(cx, hy, 20 * u, 0, P * 2);
    c.fill();
    c.fillStyle = L.hair;
    c.beginPath();
    c.arc(cx, hy - 2 * u, 20.5 * u, P * 1.02, P * 1.98);
    c.quadraticCurveTo(cx + 8 * u, hy - 12 * u, cx - 20 * u, hy - 4 * u);
    c.fill();
    if (girl) {
      c.fillStyle = '#ff7fa3';
      c.beginPath();
      c.arc(cx - 16 * u, hy - 16 * u, 5 * u, 0, P * 2);
      c.fill();
    }
    // face
    c.fillStyle = '#3b2b3f';
    for (const sd of [-1, 1]) {
      c.beginPath();
      c.ellipse(cx + sd * 7 * u, hy + 3 * u, 2.6 * u, 3.4 * u, 0, 0, P * 2);
      c.fill();
    }
    c.fillStyle = 'rgba(255,120,140,0.5)';
    for (const sd of [-1, 1]) {
      c.beginPath();
      c.arc(cx + sd * 12 * u, hy + 9 * u, 3.4 * u, 0, P * 2);
      c.fill();
    }
    c.strokeStyle = '#b23a48';
    c.lineWidth = 1.6 * u;
    c.beginPath();
    c.arc(cx, hy + 9 * u, 4 * u, 0.2, P - 0.2);
    c.stroke();
  };
  person(x - 22 * u, R, true);
  person(x + 22 * u, H, false);
  if (hold) {
    c.strokeStyle = '#f6d8c6';
    c.lineWidth = 5 * u;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x - 10 * u, y - 42 * u);
    c.quadraticCurveTo(x, y - 34 * u, x + 10 * u, y - 42 * u);
    c.stroke();
  }
  if (heart) {
    c.fillStyle = '#ef5b6f';
    heartPath(c, x, y - 112 * u, 20 * u);
    c.fill();
  }
}

// Fit an object (a prop) so its largest side is `size` metres, base at y = 0, centred on x/z.
export function fitObj(obj, size) {
  obj.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(obj);
  if (b.isEmpty()) return obj;
  const s = new THREE.Vector3();
  b.getSize(s);
  const k = size / Math.max(s.x, s.y, s.z, 1e-3);
  const wrap = new THREE.Group();
  obj.scale.multiplyScalar(k);
  obj.position.set(-((b.min.x + b.max.x) / 2) * k, -b.min.y * k, -((b.min.z + b.max.z) / 2) * k);
  wrap.add(obj);
  return wrap;
}

// ------------------------------------------------------------------ people
// Freeze a Kid into a pose and make it cheap: fewer segments, opaque cheeks, hair without the shine
// (so the town's night glow leaves it alone), then baked to one mesh (plus the hair and the eye shine).
// keep: parts that stay separate so they can move (for example [kid.head]).
const plainHair = new Map();
export function rigidKid(kid, { pose = 'stand', hands = null, air = 0, keep = [], shadow = true, bake = true } = {}) {
  kid.pose = pose;
  kid.hands = hands;
  for (let i = 0; i < 3; i++) kid.update(1 / 30, 0, 0, air, 0);
  kid.blob.visible = false;
  kid.blob.removeFromParent();
  const half = (n, min) => Math.max(min, Math.round(n * 0.5));
  kid.root.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    if (m.isMeshBasicMaterial && m.transparent) {
      const c = new THREE.Color(kid.look.skin).lerp(m.color, m.opacity);
      o.material = mat('#' + c.getHexString(), { rough: 0.6 });
    } else if (m.emissiveMap) {
      const key = m.uuid;
      if (!plainHair.has(key)) plainHair.set(key, new THREE.MeshStandardMaterial({ color: m.color, map: m.map, roughness: m.roughness }));
      o.material = plainHair.get(key);
    }
    const p = o.geometry.parameters;
    const t = o.geometry.type;
    let next = null;
    if (t === 'SphereGeometry') next = new THREE.SphereGeometry(p.radius, half(p.widthSegments, 8), half(p.heightSegments, 6), p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
    else if (t === 'TorusGeometry') next = new THREE.TorusGeometry(p.radius, p.tube, half(p.radialSegments, 4), half(p.tubularSegments, 8), p.arc);
    else if (t === 'CapsuleGeometry') next = new THREE.CapsuleGeometry(p.radius, p.height, 2, half(p.radialSegments, 6));
    else if (t === 'LatheGeometry') next = new THREE.LatheGeometry(p.points, half(p.segments, 10), p.phiStart, p.phiLength);
    if (next) o.geometry = next;
    o.castShadow = shadow && o.castShadow;
  });
  if (!bake) return kid;
  for (const part of keep) bakeOne(part, [], shadow);
  bakeOne(kid.root, keep, shadow);
  return kid;
}

// Round glasses on a Kid's face.
export function addGlasses(K, kid, color = COL.ink) {
  const m = K.M(color, { rough: 0.4 });
  for (const s of [-1, 1]) kid.head.add(K.at(K.tor(0.058, 0.008, m, P * 2, undefined, 14, 4), 0.108 * s, 0.265, 0.3));
  kid.head.add(K.at(K.box(0.07, 0.012, 0.012, m), 0, 0.275, 0.305));
}

// ------------------------------------------------------------------ Domino, the café cat
// A black and white cat sitting up. Returns { root, head, tail, update(dt, t, lookAt?) }.
export function makeCat(K, { coat = '#2d2733', belly = '#fffaf2', shadow = true } = {}) {
  const black = K.M(coat, { rough: 0.8 });
  const white = K.M(belly, { rough: 0.8 });
  const pink = K.M('#ff9eb5', { rough: 0.6 });
  const root = new THREE.Group();
  const body = K.sph(0.17, black, undefined, 14);
  body.scale.set(0.9, 1.15, 1.05);
  body.position.set(0, 0.19, -0.02);
  const chest = K.sph(0.11, white, undefined, 12);
  chest.scale.set(0.9, 1.2, 0.7);
  chest.position.set(0, 0.2, 0.1);
  root.add(body, chest);
  for (const s of [-1, 1]) {
    root.add(K.at(K.cyl(0.035, 0.04, 0.18, white, 8), s * 0.06, 0.09, 0.1));
    root.add(K.at(K.sph(0.042, white, undefined, 8), s * 0.06, 0.02, 0.12));
    const haunch = K.sph(0.09, black, undefined, 10);
    haunch.scale.set(0.8, 0.8, 1.2);
    root.add(K.at(haunch, s * 0.11, 0.08, -0.06));
  }
  const head = new THREE.Group();
  head.position.set(0, 0.42, 0.03);
  const skull = K.sph(0.12, black, undefined, 14);
  skull.scale.set(1.1, 0.95, 1);
  const muzzle = K.sph(0.06, white, undefined, 10);
  muzzle.scale.set(1.3, 0.8, 0.8);
  muzzle.position.set(0, -0.035, 0.085);
  head.add(skull, muzzle, K.at(K.sph(0.016, pink, undefined, 6), 0, -0.01, 0.13));
  for (const s of [-1, 1]) {
    const ear = K.cone(0.05, 0.09, black, 6);
    ear.position.set(s * 0.07, 0.11, 0);
    ear.rotation.z = -s * 0.3;
    head.add(ear);
    const eye = K.sph(0.02, K.M('#ffd166', { rough: 0.3 }), undefined, 8);
    eye.position.set(s * 0.045, 0.02, 0.1);
    eye.scale.set(1, 1.3, 0.6);
    head.add(eye, K.at(K.box(0.006, 0.026, 0.01, K.M('#141010')), s * 0.045, 0.02, 0.112));
  }
  root.add(head);
  const tail = new THREE.Group();
  tail.position.set(0, 0.05, -0.17);
  for (let i = 0; i < 6; i++) {
    const a = i / 5;
    tail.add(K.at(K.sph(0.035 - a * 0.008, i === 5 ? white : black, undefined, 8), Math.sin(a * 2.4) * 0.16, 0.02 + a * 0.03, -Math.cos(a * 2.4) * 0.08 + 0.04));
  }
  root.add(tail);
  bakeOne(head, [], shadow);
  bakeOne(tail, [], false);
  bakeOne(root, [head, tail], shadow);
  const v = new THREE.Vector3();
  return {
    root,
    head,
    tail,
    update(dt, t, look = null) {
      tail.rotation.y = Math.sin(t * 1.7) * 0.35 + Math.sin(t * 4.1) * 0.08;
      let want = Math.sin(t * 0.4) * 0.5;
      if (look) {
        root.worldToLocal(v.copy(look));
        want = Math.max(-1, Math.min(1, Math.atan2(v.x, v.z)));
      }
      head.rotation.y += (want - head.rotation.y) * Math.min(1, dt * 3);
      head.rotation.z = Math.sin(t * 0.9) * 0.08;
    },
  };
}
