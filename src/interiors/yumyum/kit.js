import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, umat, mesh, canvasTexture, roundRect, FONT, rng } from '../../util.js';
import { PAL, artReady, getArt } from './theme.js';

// Building blocks shared by Roji's YumYum (the restaurant inside and out) and the YumYum Kitchen game:
// primitives with cached geometry, a colour bake, painted textures, food, kitchen machines and furniture.

export { THREE, mergeGeometries, mat, umat, mesh, canvasTexture, roundRect, FONT, rng };

// Roji's YumYum colours, from Roji's logo card (theme.js): raspberry, cream, light pink, olive and brass.
// The key names are the old diner ones so every user keeps working: orange is now raspberry, teal olive, mint sage.
export const COL = {
  orange: PAL.ink,
  red: PAL.inkDeep,
  cherry: '#d8405f',
  cream: '#fbf0dc',
  cream2: PAL.paper,
  white: '#fffaf4',
  brown: '#7a3b45',
  ink: '#4a2b3a',
  bun: '#e9a548',
  bunLight: '#f6cd8c',
  seed: '#fff4d6',
  patty: '#7a3f22',
  raw: '#f08f98',
  burnt: '#3b2a22',
  cheese: '#ffcd3c',
  lettuce: '#62bf5e',
  tomato: '#ec4b4b',
  fries: '#ffcf4a',
  soda: '#ff9f43',
  shake: '#ff9eb5',
  teal: '#6f7b4d',
  mint: '#aab78a',
  mintPale: '#e8ecd8',
  pink: PAL.rose,
  hotpink: '#e0607e',
  rose: '#f4cfcb',
  sun: '#e2b04f',
  steel: '#d7dde3',
  steelDark: '#9aa3ad',
  iron: '#4b4248',
  wood: '#c98a5a',
  woodDark: '#8f5a3f',
  leaf: '#6f7d4c',
  sky: '#a6dde2',
  // the logo card's own names
  rasp: PAL.ink,
  raspDeep: PAL.inkDeep,
  band: PAL.band,
  frame: PAL.frame,
  blush: PAL.blush,
  olive: PAL.olive,
  oliveDeep: PAL.oliveDeep,
  brass: PAL.gold,
  paper: PAL.paper,
  lemonade: '#e4ef9a',
};
export const BRASS = { metal: 0.55, rough: 0.35 };

// ------------------------------------------------------------------ primitives (geometry cached by size)
const GEO = new Map();
export const cg = (key, make) => {
  let g = GEO.get(key);
  if (!g) GEO.set(key, (g = make()));
  return g;
};
export const M = (c, o) => (typeof c === 'string' ? mat(c, o) : c);
export const box = (w, h, d, c, o) => mesh(cg(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), M(c, o));
export const rbox = (w, h, d, c, r = 0.05, o) => mesh(cg(`rb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, Math.max(w, h, d) > 0.8 && r > 0.03 ? 2 : 1, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001))), M(c, o));
export const cyl = (a, b, h, c, seg = 16, o) => mesh(cg(`c${a},${b},${h},${seg}`, () => new THREE.CylinderGeometry(a, b, h, seg)), M(c, o));
export const sph = (r, c, o, seg = 16) => mesh(cg(`s${r},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7)))), M(c, o));
export const tor = (r, t, c, o, arc = Math.PI * 2, ts = 24) => mesh(cg(`t${r},${t},${arc},${ts}`, () => new THREE.TorusGeometry(r, t, 8, ts, arc)), M(c, o));
export const lathe = (key, pts, c, o, seg = 20) => mesh(cg(`l${key}`, () => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg)), M(c, o));
export const at = (o, x, y, z) => (o.position.set(x, y, z), o);
export const rot = (o, x, y, z) => (o.rotation.set(x, y, z), o);
export const noShadow = (o) => (o.traverse((m) => (m.castShadow = false)), o);

export function pattern(w, h, base, draw, rx = 1, ry = 1) {
  const t = canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    draw(ctx, w, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}

export function glowTexture() {
  return cg('glowTex', () =>
    canvasTexture(64, 64, (ctx) => {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
    }),
  );
}
export function glowSprite(color = '#ffffff', opacity = 0.8) {
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, depthWrite: false, opacity }));
}

// ------------------------------------------------------------------ colour bake
// Merge every plain-coloured, non-glowing static mesh under `group` into a few meshes with vertex colours
// (one per roughness, metalness and shadow setting). keep: objects (and children) to leave alone.
const vcMats = new Map();
export function colorBake(group, keep = []) {
  group.updateMatrixWorld(true);
  const skip = new Set();
  for (const d of keep) d?.traverse((o) => skip.add(o));
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const buckets = new Map();
  const victims = [];
  const shown = (o) => {
    for (let p = o; p && p !== group; p = p.parent) if (!p.visible) return false;
    return true;
  };
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || skip.has(o) || o === group || o.children.length) return;
    const m = o.material;
    if (Array.isArray(m) || !m.isMeshStandardMaterial || m.map || m.transparent || m.vertexColors || m.side !== THREE.FrontSide) return;
    if (m.emissiveIntensity > 0 && m.emissive.r + m.emissive.g + m.emissive.b > 0) return;
    if (!shown(o)) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.clearGroups();
    g.morphAttributes = {};
    rel.multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(rel);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([m.color.r, m.color.g, m.color.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const rough = m.roughness < 0.45 ? 0.3 : m.roughness < 0.72 ? 0.6 : 0.85;
    const metal = m.metalness > 0.3 ? 0.55 : 0;
    const key = `${rough}|${metal}|${m.flatShading ? 1 : 0}|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}`;
    if (!buckets.has(key)) buckets.set(key, { rough, metal, flat: m.flatShading, cast: o.castShadow, receive: o.receiveShadow, list: [] });
    buckets.get(key).list.push(g);
    victims.push(o);
  });
  for (const o of victims) o.removeFromParent();
  const out = [];
  for (const b of buckets.values()) {
    const geo = mergeGeometries(b.list, false);
    if (!geo) continue;
    const mk = `${b.rough}|${b.metal}|${b.flat}`;
    if (!vcMats.has(mk)) vcMats.set(mk, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: b.rough, metalness: b.metal, flatShading: !!b.flat }));
    const me = new THREE.Mesh(geo, vcMats.get(mk));
    me.castShadow = b.cast;
    me.receiveShadow = b.receive;
    group.add(me);
    out.push(me);
  }
  return out;
}

// A kid keeps every moving joint but its fixed parts merge per joint: about a third of the draw calls.
export function slimKid(kid, { shadow = true } = {}) {
  if (!shadow) kid.root.traverse((o) => o !== kid.blob && (o.castShadow = false));
  colorBake(kid.body, [...kid.legs, ...kid.arms, kid.head, kid.carryAnchor]);
  for (const p of [...kid.legs, ...kid.arms]) colorBake(p);
  colorBake(kid.head, [...kid.eyes, kid.mouth, ...kid.tails.map((t) => t.pivot)]);
  return kid;
}

// Fewer segments for a kid seen small (guests, diners): same shapes, about half the triangles.
// sphereMin: the fewest segments around a sphere (8 for people far from the camera).
export function lowPolyKid(kid, { sphereMin = 10 } = {}) {
  const swap = new Map();
  kid.root.traverse((o) => {
    if (!o.isMesh || o === kid.blob) return;
    const geo = o.geometry;
    const p = geo.parameters;
    if (!p) return;
    let next = swap.get(geo);
    if (!next) {
      if (geo.type === 'SphereGeometry' && p.widthSegments > 12) next = new THREE.SphereGeometry(p.radius, Math.max(sphereMin, p.widthSegments >> 1), Math.max(sphereMin - 3, Math.round(p.heightSegments * 0.55)), p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
      else if (geo.type === 'TorusGeometry' && p.tubularSegments > 16) next = new THREE.TorusGeometry(p.radius, p.tube, Math.min(p.radialSegments, 6), p.tubularSegments >> 1, p.arc);
      else if (geo.type === 'LatheGeometry' && p.segments > 16) next = new THREE.LatheGeometry(p.points, p.segments >> 1, p.phiStart, p.phiLength);
      else if (geo.type === 'CylinderGeometry' && p.radialSegments > 12) next = new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, p.radialSegments >> 1, p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength);
      else if (geo.type === 'CapsuleGeometry' && (p.radialSegments ?? 8) > 8) next = new THREE.CapsuleGeometry(p.radius, p.height ?? p.length, Math.min(p.capSegments, 3), 8);
      if (!next) return;
      swap.set(geo, next);
    }
    o.geometry = next;
    geo.dispose();
  });
  return kid;
}

// Small props and things against the back wall need no shadows (fewer shadow draw calls and triangles).
export function trimShadows(group, keep = [], { size = 0.2, wallZ = -Infinity } = {}) {
  const skip = new Set();
  for (const d of keep) d?.traverse((o) => skip.add(o));
  group.updateMatrixWorld(true);
  const s = new THREE.Vector3();
  const c = new THREE.Vector3();
  group.traverse((o) => {
    if (!o.isMesh || skip.has(o) || !o.castShadow) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    o.getWorldScale(s);
    const r = o.geometry.boundingSphere.radius * Math.max(s.x, s.y, s.z);
    c.copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld);
    if (r < size || c.z < wallZ) o.castShadow = false;
  });
}

// A merged copy of a group: one mesh per material, for static things built many times.
export function bakeGroup(group, keep = []) {
  colorBake(group, keep);
  return group;
}

// ------------------------------------------------------------------ atlas: many painted decals, one material
export class Atlas {
  constructor(w = 2048, h = 1024, { rough = 0.75, glow = 0.08 } = {}) {
    this.W = w;
    this.H = h;
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');
    this.x = 0;
    this.y = 0;
    this.row = 0;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 8;
    this.material = new THREE.MeshStandardMaterial({ map: this.tex, roughness: rough, emissive: '#ffffff', emissiveMap: this.tex, emissiveIntensity: glow });
  }
  add(w, h, draw) {
    const pad = 8;
    if (this.x + w > this.W) {
      this.x = 0;
      this.y += this.row + pad;
      this.row = 0;
    }
    const { x, y } = this;
    if (y + h > this.H) console.warn('yumyum atlas full');
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.beginPath();
    c.rect(0, 0, w, h);
    c.clip();
    draw(c, w, h);
    c.restore();
    this.x += w + pad;
    this.row = Math.max(this.row, h);
    this.tex.needsUpdate = true;
    return { u0: x / this.W, u1: (x + w) / this.W, v0: 1 - (y + h) / this.H, v1: 1 - y / this.H };
  }
  // Like add, but drawn again once Roji's logo images are in (for anything showing the logo or its corners).
  addThemed(w, h, draw) {
    const r = this.add(w, h, draw);
    if (!getArt()) {
      const x = Math.round(r.u0 * this.W);
      const y = Math.round((1 - r.v1) * this.H);
      artReady.then(() => {
        const c = this.ctx;
        c.save();
        c.translate(x, y);
        c.beginPath();
        c.rect(0, 0, w, h);
        c.clip();
        c.clearRect(0, 0, w, h);
        draw(c, w, h);
        c.restore();
        this.tex.needsUpdate = true;
      });
    }
    return r;
  }
  themedPlane(w, h, pw, ph, draw) {
    return mesh(this.fit(new THREE.PlaneGeometry(w, h), this.addThemed(pw, ph, draw)), this.material, { cast: false });
  }
  fit(geo, r) {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, r.u0 + uv.getX(i) * (r.u1 - r.u0), r.v0 + uv.getY(i) * (r.v1 - r.v0));
    return geo;
  }
  plane(w, h, pw, ph, draw) {
    return mesh(this.fit(new THREE.PlaneGeometry(w, h), this.add(pw, ph, draw)), this.material, { cast: false });
  }
}

// A label: rounded plate with centred text.
export function drawLabel(c, w, h, text, { bg = COL.white, ink = COL.ink, edge = COL.orange, size = 0.56, weight = 700 } = {}) {
  c.fillStyle = bg;
  roundRect(c, 4, 4, w - 8, h - 8, Math.min(h / 2 - 4, 30));
  c.fill();
  if (edge) {
    c.lineWidth = Math.max(4, h * 0.07);
    c.strokeStyle = edge;
    c.stroke();
  }
  c.fillStyle = ink;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `${weight} ${Math.round(h * size)}px ${FONT}`;
  c.fillText(text, w / 2, h / 2 + h * 0.04, w - 24);
}

export function heartPath(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y + s * 0.35);
  c.bezierCurveTo(x - s * 0.62, y - s * 0.05, x - s * 0.36, y - s * 0.62, x, y - s * 0.24);
  c.bezierCurveTo(x + s * 0.36, y - s * 0.62, x + s * 0.62, y - s * 0.05, x, y + s * 0.35);
  c.closePath();
}

// ------------------------------------------------------------------ 2D food drawings (order bubbles, menu board)
const clamp01 = (v) => Math.max(0, Math.min(1, v));
function rr(ctx, x, y, w, h, r) {
  roundRect(ctx, x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
}
function ell(ctx, x, y, rx, ry, rotA = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rotA, 0, Math.PI * 2);
}

// A burger standing on its bottom edge at (cx, by), w wide.
export function drawBurger(ctx, cx, by, w, tops = []) {
  const u = w / 10;
  let y = by;
  ctx.fillStyle = '#e09a4c';
  rr(ctx, cx - w / 2, y - 2.1 * u, w, 2.1 * u, u);
  ctx.fill();
  ctx.fillStyle = COL.bunLight;
  rr(ctx, cx - w / 2 + 0.5 * u, y - 2.1 * u, w - u, 0.7 * u, 0.35 * u);
  ctx.fill();
  y -= 1.9 * u;
  ctx.fillStyle = '#7d4325';
  rr(ctx, cx - w * 0.54, y - 1.8 * u, w * 1.08, 1.8 * u, 0.9 * u);
  ctx.fill();
  y -= 1.55 * u;
  if (tops.includes('cheese')) {
    ctx.fillStyle = COL.cheese;
    rr(ctx, cx - w * 0.52, y - 0.7 * u, w * 1.04, 0.75 * u, 0.25 * u);
    ctx.fill();
    for (const k of [-0.32, 0.05, 0.34]) {
      ctx.beginPath();
      ctx.moveTo(cx + k * w - 0.7 * u, y);
      ctx.lineTo(cx + k * w + 0.7 * u, y);
      ctx.lineTo(cx + k * w, y + 1.1 * u);
      ctx.closePath();
      ctx.fill();
    }
    y -= 0.6 * u;
  }
  if (tops.includes('tomato')) {
    ctx.fillStyle = COL.tomato;
    rr(ctx, cx - w * 0.48, y - 0.85 * u, w * 0.96, 0.85 * u, 0.42 * u);
    ctx.fill();
    y -= 0.7 * u;
  }
  if (tops.includes('lettuce')) {
    ctx.fillStyle = COL.lettuce;
    const x0 = cx - w * 0.56;
    const x1 = cx + w * 0.56;
    ctx.beginPath();
    ctx.moveTo(x0, y - 0.7 * u);
    ctx.lineTo(x1, y - 0.7 * u);
    for (let i = 8; i >= 0; i--) ctx.lineTo(x0 + ((x1 - x0) * i) / 8, y + (i % 2 ? 0.6 : -0.05) * u);
    ctx.closePath();
    ctx.fill();
    y -= 0.6 * u;
  }
  ctx.fillStyle = '#f0b25e';
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.5, y + 0.3 * u);
  ctx.bezierCurveTo(cx - w * 0.52, y - 4.4 * u, cx + w * 0.52, y - 4.4 * u, cx + w * 0.5, y + 0.3 * u);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ell(ctx, cx - w * 0.2, y - 2.3 * u, w * 0.13, 0.5 * u, -0.3);
  ctx.fill();
  ctx.fillStyle = COL.seed;
  for (const [dx, dy] of [[-0.1, -2.8], [0.12, -2.6], [0.28, -1.8], [-0.3, -1.5], [0.03, -1.6]]) {
    ell(ctx, cx + dx * w, y + dy * u, 0.32 * u, 0.18 * u);
    ctx.fill();
  }
}
// Fries box centred at (cx, cy), about s tall.
export function drawFries(ctx, cx, cy, s) {
  const boxTop = cy - s * 0.04;
  [-0.22, -0.12, -0.01, 0.1, 0.21, -0.17, 0.15, 0.04].forEach((k, i) => {
    const h = s * (0.36 + ((i * 37) % 10) / 70);
    ctx.save();
    ctx.translate(cx + k * s, boxTop + s * 0.06);
    ctx.rotate(k * 0.7);
    ctx.fillStyle = COL.fries;
    rr(ctx, -s * 0.045, -h, s * 0.09, h, s * 0.03);
    ctx.fill();
    ctx.restore();
  });
  ctx.fillStyle = COL.orange;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.36, boxTop);
  ctx.quadraticCurveTo(cx, boxTop + s * 0.12, cx + s * 0.36, boxTop);
  ctx.lineTo(cx + s * 0.27, cy + s * 0.46);
  ctx.lineTo(cx - s * 0.27, cy + s * 0.46);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff1e8';
  heartPath(ctx, cx, cy + s * 0.22, s * 0.28);
  ctx.fill();
}
// Soda cup centred at (cx, cy), about s tall.
export function drawCup(ctx, cx, cy, s, liquid = COL.soda) {
  const tw = s * 0.3;
  const bw = s * 0.22;
  const top = cy - s * 0.28;
  const bot = cy + s * 0.46;
  ctx.strokeStyle = COL.pink;
  ctx.lineWidth = s * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.04, top);
  ctx.lineTo(cx + s * 0.14, top - s * 0.24);
  ctx.lineTo(cx + s * 0.24, top - s * 0.26);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - tw, top);
  ctx.lineTo(cx + tw, top);
  ctx.lineTo(cx + bw, bot);
  ctx.quadraticCurveTo(cx, bot + s * 0.04, cx - bw, bot);
  ctx.closePath();
  ctx.fillStyle = liquid;
  ctx.fill();
  ctx.fillStyle = COL.orange;
  ctx.fillRect(cx - tw * 0.92, cy + s * 0.02, tw * 1.84, s * 0.16);
  ctx.fillStyle = '#fff';
  heartPath(ctx, cx, cy + s * 0.1, s * 0.12);
  ctx.fill();
  ctx.fillStyle = '#ffd9cc';
  rr(ctx, cx - tw * 1.12, top - s * 0.07, tw * 2.24, s * 0.1, s * 0.05);
  ctx.fill();
}
// Milkshake glass centred at (cx, cy), about s tall.
export function drawShake(ctx, cx, cy, s, color = COL.shake) {
  const top = cy - s * 0.12;
  ctx.fillStyle = '#ffffff';
  ell(ctx, cx, top - s * 0.06, s * 0.27, s * 0.13);
  ctx.fill();
  ell(ctx, cx, top - s * 0.17, s * 0.18, s * 0.1);
  ctx.fill();
  ell(ctx, cx, top - s * 0.26, s * 0.09, s * 0.06);
  ctx.fill();
  ctx.fillStyle = COL.cherry;
  ell(ctx, cx + s * 0.02, top - s * 0.33, s * 0.075, s * 0.07);
  ctx.fill();
  ctx.strokeStyle = '#3f9a43';
  ctx.lineWidth = s * 0.025;
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.03, top - s * 0.39);
  ctx.quadraticCurveTo(cx + s * 0.07, top - s * 0.47, cx + s * 0.12, top - s * 0.48);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.27, top);
  ctx.lineTo(cx + s * 0.27, top);
  ctx.quadraticCurveTo(cx + s * 0.2, cy + s * 0.22, cx + s * 0.05, cy + s * 0.27);
  ctx.lineTo(cx - s * 0.05, cy + s * 0.27);
  ctx.quadraticCurveTo(cx - s * 0.2, cy + s * 0.22, cx - s * 0.27, top);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ell(ctx, cx - s * 0.12, cy + s * 0.02, s * 0.04, s * 0.1, 0.3);
  ctx.fill();
  ctx.fillStyle = '#dfe7ee';
  rr(ctx, cx - s * 0.035, cy + s * 0.25, s * 0.07, s * 0.16, s * 0.02);
  ctx.fill();
  ell(ctx, cx, cy + s * 0.43, s * 0.17, s * 0.05);
  ctx.fill();
}
export function drawShawarma(ctx, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.5);
  ctx.fillStyle = '#f3d9a4';
  rr(ctx, -s * 0.16, -s * 0.42, s * 0.32, s * 0.84, s * 0.15);
  ctx.fill();
  ctx.fillStyle = '#c9783e';
  ell(ctx, 0, -s * 0.4, s * 0.14, s * 0.07);
  ctx.fill();
  ctx.fillStyle = COL.lettuce;
  ell(ctx, -s * 0.06, -s * 0.44, s * 0.06, s * 0.04);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  rr(ctx, -s * 0.18, s * 0.05, s * 0.36, s * 0.38, s * 0.06);
  ctx.fill();
  ctx.fillStyle = COL.orange;
  ctx.fillRect(-s * 0.18, s * 0.14, s * 0.36, s * 0.06);
  ctx.restore();
}
export function drawMansaf(ctx, cx, cy, s) {
  ctx.fillStyle = '#ffffff';
  ell(ctx, cx, cy + s * 0.12, s * 0.48, s * 0.2);
  ctx.fill();
  ctx.fillStyle = '#d8b47a';
  ell(ctx, cx, cy + s * 0.1, s * 0.42, s * 0.16);
  ctx.fill();
  ctx.fillStyle = '#fff3d0';
  ell(ctx, cx, cy, s * 0.36, s * 0.16);
  ctx.fill();
  ctx.fillStyle = '#9a5b34';
  for (const [dx, dy] of [[-0.14, -0.06], [0.1, -0.08], [0.0, 0.02], [0.18, 0.02], [-0.18, 0.04]]) {
    ell(ctx, cx + dx * s, cy + dy * s, s * 0.08, s * 0.055);
    ctx.fill();
  }
  ctx.fillStyle = '#f0e1b0';
  for (const [dx, dy] of [[-0.05, -0.1], [0.06, 0.04], [-0.1, 0.06], [0.14, -0.04]]) {
    ell(ctx, cx + dx * s, cy + dy * s, s * 0.025, s * 0.018);
    ctx.fill();
  }
  ctx.fillStyle = COL.leaf;
  ell(ctx, cx + s * 0.02, cy - s * 0.04, s * 0.03, s * 0.02);
  ctx.fill();
}
export function drawCake(ctx, cx, cy, s) {
  ctx.fillStyle = '#ffffff';
  ell(ctx, cx, cy + s * 0.3, s * 0.42, s * 0.1);
  ctx.fill();
  ctx.fillStyle = '#efbd78';
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.32, cy - s * 0.05);
  ctx.lineTo(cx + s * 0.32, cy - s * 0.18);
  ctx.lineTo(cx + s * 0.32, cy + s * 0.22);
  ctx.lineTo(cx - s * 0.32, cy + s * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - s * 0.32, cy + s * 0.07, s * 0.64, s * 0.05);
  ctx.fillStyle = '#8b4a2b';
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.34, cy - s * 0.06);
  ctx.lineTo(cx + s * 0.1, cy - s * 0.32);
  ctx.lineTo(cx + s * 0.34, cy - s * 0.2);
  ctx.lineTo(cx - s * 0.32, cy + s * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COL.cherry;
  ell(ctx, cx + s * 0.08, cy - s * 0.32, s * 0.07, s * 0.065);
  ctx.fill();
}
// Spanish latte in a glass: coffee under milk, centred at (cx, cy), about s tall.
export function drawLatte(ctx, cx, cy, s) {
  const top = cy - s * 0.3;
  const bot = cy + s * 0.38;
  const tw = s * 0.24;
  const bw = s * 0.2;
  const glass = new Path2D();
  glass.moveTo(cx - tw, top);
  glass.lineTo(cx + tw, top);
  glass.lineTo(cx + bw, bot);
  glass.quadraticCurveTo(cx, bot + s * 0.04, cx - bw, bot);
  glass.closePath();
  ctx.save();
  ctx.clip(glass);
  ctx.fillStyle = '#e9d3b4';
  ctx.fillRect(cx - s, top, 2 * s, s);
  ctx.fillStyle = '#8a5434';
  ctx.fillRect(cx - s, cy + s * 0.1, 2 * s, s);
  ctx.fillStyle = '#fbf2e2';
  ctx.fillRect(cx - s, top, 2 * s, s * 0.12);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = s * 0.03;
  ctx.stroke(glass);
  ctx.fillStyle = '#ffffff';
  ell(ctx, cx + s * 0.12, cy + s * 0.48, s * 0.3, s * 0.05);
  ctx.fill();
  ctx.fillStyle = COL.rasp;
  heartPath(ctx, cx, top + s * 0.06, s * 0.1);
  ctx.fill();
}
// Mint lemonade: a tall glass with lemon and mint, centred at (cx, cy), about s tall.
export function drawLemonade(ctx, cx, cy, s) {
  drawCup(ctx, cx, cy, s, COL.lemonade);
  ctx.fillStyle = '#ffe14d';
  ell(ctx, cx - s * 0.22, cy - s * 0.3, s * 0.1, s * 0.1);
  ctx.fill();
  ctx.fillStyle = '#fff6b0';
  ell(ctx, cx - s * 0.22, cy - s * 0.3, s * 0.06, s * 0.06);
  ctx.fill();
  ctx.fillStyle = '#5fae5a';
  ell(ctx, cx + s * 0.08, cy - s * 0.34, s * 0.07, s * 0.035, -0.6);
  ctx.fill();
  ell(ctx, cx + s * 0.16, cy - s * 0.32, s * 0.06, s * 0.03, 0.5);
  ctx.fill();
}
// A slice of layer cake (pecan: caramel; German: chocolate), centred at (cx, cy), about s across.
export function drawLayerCake(ctx, cx, cy, s, { sponge = '#d9a86a', cream = '#fff3dc', top = '#a8693c', nut = '#7a4a2a' } = {}) {
  ctx.fillStyle = '#ffffff';
  ell(ctx, cx, cy + s * 0.3, s * 0.42, s * 0.1);
  ctx.fill();
  const layer = (y0, h, c) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.32, cy + y0 * s);
    ctx.lineTo(cx + s * 0.32, cy + (y0 - 0.12) * s);
    ctx.lineTo(cx + s * 0.32, cy + (y0 - 0.12 + h) * s);
    ctx.lineTo(cx - s * 0.32, cy + (y0 + h) * s);
    ctx.closePath();
    ctx.fill();
  };
  layer(0.16, 0.12, sponge);
  layer(0.1, 0.06, cream);
  layer(-0.04, 0.14, sponge);
  layer(-0.1, 0.06, top);
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.34, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.08, cy - s * 0.34);
  ctx.lineTo(cx + s * 0.34, cy - s * 0.22);
  ctx.lineTo(cx - s * 0.32, cy - s * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = nut;
  for (const [dx, dy] of [[-0.14, -0.13], [0.0, -0.2], [0.14, -0.24], [0.08, -0.16]]) {
    ell(ctx, cx + dx * s, cy + dy * s, s * 0.045, s * 0.03, 0.4);
    ctx.fill();
  }
}
export function drawCoin(ctx, x, y, r) {
  ctx.fillStyle = '#e2a52e';
  ell(ctx, x, y + r * 0.12, r, r);
  ctx.fill();
  ctx.fillStyle = COL.sun;
  ell(ctx, x, y, r, r);
  ctx.fill();
  ctx.strokeStyle = '#f0b73e';
  ctx.lineWidth = Math.max(1, r * 0.16);
  ell(ctx, x, y, r * 0.62, r * 0.62);
  ctx.stroke();
}
export const ICON_DRAW = {
  burger: (c, cx, cy, s, tops) => drawBurger(c, cx, cy + s * 0.36, s * 0.86, tops),
  fries: (c, cx, cy, s) => drawFries(c, cx, cy - s * 0.02, s * 0.92),
  soda: (c, cx, cy, s) => drawCup(c, cx, cy + s * 0.02, s * 0.86),
  shake: (c, cx, cy, s) => drawShake(c, cx, cy + s * 0.02, s * 0.9),
  shawarma: (c, cx, cy, s) => drawShawarma(c, cx, cy, s),
  mansaf: (c, cx, cy, s) => drawMansaf(c, cx, cy, s),
  cake: (c, cx, cy, s) => drawCake(c, cx, cy, s),
  latte: (c, cx, cy, s) => drawLatte(c, cx, cy, s),
  lemonade: (c, cx, cy, s) => drawLemonade(c, cx, cy + s * 0.04, s * 0.86),
  pecan: (c, cx, cy, s) => drawLayerCake(c, cx, cy, s),
  german: (c, cx, cy, s) => drawLayerCake(c, cx, cy, s, { sponge: '#6b3f2a', cream: '#e9d2a8', top: '#4a2a1e', nut: '#c9a06a' }),
};

// ------------------------------------------------------------------ 3D food (shared geometry, chunky game scale)
// Every model faces +Z, base at y = 0. Burger about 0.32 m across.
const FG = {};
function foodGeos() {
  if (FG.ready) return FG;
  const L = (pts, seg = 20) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
  FG.bunBottom = L([[0, 0], [0.13, 0], [0.155, 0.018], [0.158, 0.045], [0.145, 0.062], [0, 0.062]]);
  FG.patty = L([[0, 0], [0.15, 0], [0.168, 0.014], [0.17, 0.04], [0.152, 0.056], [0, 0.056]]);
  FG.cheese = new THREE.BoxGeometry(0.29, 0.013, 0.29).rotateY(Math.PI / 4);
  FG.tomato = mergeGeometries([new THREE.CylinderGeometry(0.075, 0.075, 0.024, 16).translate(-0.06, 0, 0.02), new THREE.CylinderGeometry(0.07, 0.07, 0.024, 16).translate(0.065, 0.004, -0.025)].map((g) => g.toNonIndexed()));
  const let_ = new THREE.CylinderGeometry(0.18, 0.18, 0.02, 32, 1);
  const p = let_.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 0.1) continue;
    const a = Math.atan2(z, x);
    const k = 1 + Math.sin(a * 9) * 0.07;
    p.setXYZ(i, x * k, p.getY(i) + Math.sin(a * 9 + 1) * 0.008, z * k);
  }
  let_.computeVertexNormals();
  FG.lettuce = let_;
  const dome = new THREE.SphereGeometry(0.158, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, 0.72, 1);
  FG.bunTop = dome;
  const seeds = [];
  const r = rng(11);
  for (let i = 0; i < 11; i++) {
    const a = r() * Math.PI * 2;
    const rad = 0.03 + r() * 0.1;
    const y = Math.sqrt(Math.max(0, 0.158 * 0.158 - rad * rad)) * 0.72;
    seeds.push(new THREE.SphereGeometry(0.012, 6, 4).scale(1.5, 0.6, 0.9).rotateY(a).translate(Math.cos(a) * rad, y, Math.sin(a) * rad).toNonIndexed());
  }
  FG.seeds = mergeGeometries(seeds);
  FG.plate = L([[0, 0], [0.19, 0], [0.225, 0.022], [0.232, 0.03], [0.2, 0.018], [0, 0.014]], 28);
  FG.plateRim = new THREE.TorusGeometry(0.205, 0.006, 4, 32).rotateX(Math.PI / 2).translate(0, 0.024, 0);
  FG.friesBox = new THREE.CylinderGeometry(0.105, 0.075, 0.17, 4, 1).rotateY(Math.PI / 4).translate(0, 0.085, 0);
  const sticks = [];
  const fr = rng(5);
  for (let i = 0; i < 14; i++) {
    const h = 0.13 + fr() * 0.06;
    const g = new THREE.BoxGeometry(0.022, h, 0.022);
    g.rotateZ((fr() - 0.5) * 0.5).rotateX((fr() - 0.5) * 0.4);
    g.translate((fr() - 0.5) * 0.11, 0.14 + h * 0.35, (fr() - 0.5) * 0.08);
    sticks.push(g.toNonIndexed());
  }
  FG.fries = mergeGeometries(sticks);
  FG.cup = L([[0, 0], [0.062, 0], [0.068, 0.006], [0.082, 0.2], [0.086, 0.205], [0.079, 0.205], [0.066, 0.012], [0, 0.012]], 20);
  FG.cupBand = new THREE.CylinderGeometry(0.0815, 0.0745, 0.07, 20, 1, true).translate(0, 0.11, 0);
  FG.liquid = new THREE.CylinderGeometry(0.076, 0.064, 1, 18).translate(0, 0.5, 0);
  FG.lid = L([[0, 0.012], [0.088, 0.012], [0.09, 0], [0.084, -0.006], [0, -0.006]], 20);
  FG.straw = new THREE.CylinderGeometry(0.009, 0.009, 0.22, 8).translate(0, 0.11, 0).rotateZ(-0.25);
  FG.glass = L([[0, 0], [0.07, 0], [0.072, 0.012], [0.022, 0.03], [0.018, 0.08], [0.03, 0.1], [0.08, 0.17], [0.095, 0.26], [0.1, 0.27], [0.092, 0.27], [0.084, 0.18], [0.03, 0.11], [0, 0.11]], 20);
  FG.shakeFill = L([[0, 0.11], [0.028, 0.112], [0.078, 0.178], [0.088, 0.25], [0, 0.25]], 18);
  FG.cream = mergeGeometries([
    new THREE.SphereGeometry(0.085, 16, 10).scale(1, 0.55, 1).translate(0, 0.262, 0),
    new THREE.SphereGeometry(0.06, 14, 8).scale(1, 0.62, 1).translate(0, 0.3, 0),
    new THREE.SphereGeometry(0.035, 12, 8).scale(1, 0.8, 1).translate(0, 0.33, 0),
  ].map((g) => g.toNonIndexed()));
  FG.cherry = new THREE.SphereGeometry(0.024, 12, 8).translate(0.006, 0.37, 0);
  FG.shakeStraw = new THREE.CylinderGeometry(0.01, 0.01, 0.26, 8).translate(0, 0.13, 0).rotateZ(-0.3).translate(0.04, 0.2, 0);
  FG.rawStack = L([[0, 0], [0.15, 0], [0.168, 0.012], [0.168, 0.035], [0.15, 0.045], [0, 0.045]]);
  FG.ready = true;
  return FG;
}

export const FOOD_MAT = {
  bun: () => mat(COL.bun, { rough: 0.6 }),
  patty: () => mat(COL.patty, { rough: 0.85 }),
  cheese: () => mat(COL.cheese, { rough: 0.6 }),
  tomato: () => mat(COL.tomato, { rough: 0.6 }),
  lettuce: () => mat(COL.lettuce, { rough: 0.6 }),
  seed: () => mat(COL.seed, { rough: 0.85 }),
  plate: () => mat('#ffffff', { rough: 0.3 }),
  rim: () => mat(COL.pink, { rough: 0.6 }),
  box: () => mat(COL.orange, { rough: 0.6 }),
  fries: () => mat(COL.fries, { rough: 0.6 }),
  cup: () => cg('cupMat', () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25, transparent: true, opacity: 0.5, depthWrite: false })),
  band: () => mat(COL.orange, { rough: 0.6 }),
  soda: () => mat(COL.soda, { rough: 0.3 }),
  lidMat: () => mat(COL.rose, { rough: 0.6 }),
  straw: () => mat(COL.hotpink, { rough: 0.6 }),
  glass: () => cg('glassMat', () => new THREE.MeshStandardMaterial({ color: '#eef8ff', roughness: 0.08, transparent: true, opacity: 0.38, depthWrite: false })),
  cream: () => mat('#ffffff', { rough: 0.85 }),
  cherry: () => mat(COL.cherry, { rough: 0.3 }),
};
export const SHAKE_COLORS = { strawberry: '#ff9eb5', chocolate: '#9b5e3c', vanilla: '#fff0c8', mint: '#9fe8c8' };

const fm = (geo, material) => mesh(geo, material, { cast: false, receive: true });

// A burger that can grow: bottom bun, then patty, cheese, tomato, lettuce and the top bun.
export class Burger {
  constructor({ plate = false } = {}) {
    const G = foodGeos();
    this.group = new THREE.Group();
    if (plate) this.group.add(fm(G.plate, FOOD_MAT.plate()), fm(G.plateRim, FOOD_MAT.rim()));
    this.base = plate ? 0.016 : 0;
    this.bottom = at(fm(G.bunBottom, FOOD_MAT.bun()), 0, this.base, 0);
    this.patty = fm(G.patty, FOOD_MAT.patty());
    this.cheese = fm(G.cheese, FOOD_MAT.cheese());
    this.tomato = fm(G.tomato, FOOD_MAT.tomato());
    this.lettuce = fm(G.lettuce, FOOD_MAT.lettuce());
    this.top = new THREE.Group();
    this.top.add(fm(G.bunTop, FOOD_MAT.bun()), fm(G.seeds, FOOD_MAT.seed()));
    this.group.add(this.bottom, this.patty, this.cheese, this.tomato, this.lettuce, this.top);
    this.set(false, []);
  }
  set(patty, tops = []) {
    let y = this.base + 0.058;
    this.patty.visible = patty;
    this.patty.position.y = y;
    if (patty) y += 0.052;
    for (const [name, h] of [['cheese', 0.012], ['tomato', 0.024], ['lettuce', 0.02]]) {
      const on = patty && tops.includes(name);
      this[name].visible = on;
      this[name].position.y = y + h / 2;
      if (on) y += h;
    }
    this.top.visible = patty;
    this.top.position.y = y - 0.004;
    this.height = patty ? y + 0.11 : this.base + 0.06;
  }
}

export function makeFriesBox() {
  const G = foodGeos();
  const g = new THREE.Group();
  const fries = fm(G.fries, FOOD_MAT.fries());
  g.add(fm(G.friesBox, FOOD_MAT.box()), fries);
  g.userData.fries = fries;
  return g;
}
export function friesGeometry() {
  return foodGeos().fries;
}

export function makeCup() {
  const G = foodGeos();
  const g = new THREE.Group();
  const liquid = fm(G.liquid, FOOD_MAT.soda());
  liquid.scale.y = 0.001;
  liquid.position.y = 0.012;
  const lid = at(fm(G.lid, FOOD_MAT.lidMat()), 0, 0.205, 0);
  const straw = at(fm(G.straw, FOOD_MAT.straw()), 0.02, 0.21, 0);
  g.add(liquid, fm(G.cup, FOOD_MAT.cup()), fm(G.cupBand, FOOD_MAT.band()), lid, straw);
  const api = {
    group: g,
    setFill(k) {
      liquid.visible = k > 0.01;
      liquid.scale.y = Math.max(0.001, k * 0.19);
    },
    setLid(on) {
      lid.visible = straw.visible = on;
    },
  };
  api.setFill(1);
  api.setLid(true);
  return api;
}

export function makeShake(flavour = 'strawberry') {
  const G = foodGeos();
  const g = new THREE.Group();
  const fill = fm(G.shakeFill, mat(SHAKE_COLORS[flavour] || COL.shake, { rough: 0.6 }));
  const top = new THREE.Group();
  top.add(fm(G.cream, FOOD_MAT.cream()), fm(G.cherry, FOOD_MAT.cherry()), fm(G.shakeStraw, FOOD_MAT.straw()));
  g.add(fill, fm(G.glass, FOOD_MAT.glass()), top);
  const api = {
    group: g,
    fill,
    setFill(k) {
      fill.visible = k > 0.01;
      fill.scale.set(1, Math.max(0.01, k), 1);
      fill.position.y = 0.11 * (1 - Math.max(0.01, k));
    },
    setTop(on) {
      top.visible = on;
    },
  };
  api.setFill(1);
  api.setTop(true);
  return api;
}

export function rawPatty() {
  return fm(foodGeos().rawStack, mat(COL.raw, { rough: 0.85 }));
}
export function pattyGeometry() {
  return foodGeos().patty;
}
export function lettuceGeometry() {
  return foodGeos().lettuce;
}

// One finished order item as a little model: id is plain | cheese | garden | deluxe | fries | soda | shake
export const ITEM_TOPS = { plain: [], cheese: ['cheese'], garden: ['lettuce', 'tomato'], deluxe: ['cheese', 'lettuce', 'tomato'] };
export function makeItem(id) {
  if (ITEM_TOPS[id] || id === 'odd') {
    const b = new Burger({ plate: true });
    b.set(true, ITEM_TOPS[id] || []);
    return b.group;
  }
  if (id === 'fries') return makeFriesBox();
  if (id === 'soda') return makeCup().group;
  return makeShake().group;
}

// ------------------------------------------------------------------ kitchen machines (base at the worktop surface)
// Flat-top grill with n round spots. Returns { group, top, spots: [x...] }.
export function makeGrill(width = 1.8, n = 3, depth = 0.6) {
  const g = new THREE.Group();
  g.add(at(rbox(width, 0.08, depth, COL.steel, 0.02, { metal: 0.4, rough: 0.35 }), 0, 0.04, 0));
  const plateTex = pattern(256, 128, '#4a4147', (c, w, h) => {
    c.fillStyle = '#5b5157';
    for (let i = 0; i < 12; i++) c.fillRect(0, (i * h) / 12 + 3, w, 4);
    c.fillStyle = 'rgba(255,190,120,0.06)';
    c.fillRect(0, 0, w, h);
  });
  g.add(at(mesh(new THREE.BoxGeometry(width - 0.08, 0.03, depth - 0.1), new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.55, metalness: 0.3 })), 0, 0.095, 0.02));
  g.add(at(rbox(width, 0.34, 0.06, COL.steel, 0.02, { metal: 0.4, rough: 0.35 }), 0, 0.2, -depth / 2 + 0.02));
  const spots = [];
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * (width / n);
    spots.push(x);
    g.add(at(rot(cyl(0.035, 0.035, 0.05, COL.cherry, 12), Math.PI / 2, 0, 0), x, 0.045, depth / 2 + 0.02));
    g.add(at(rot(tor(0.17, 0.006, '#6b6066', undefined, Math.PI * 2, 28), Math.PI / 2, 0, 0), x, 0.112, 0.02));
  }
  return { group: g, top: 0.11, spots };
}

// Deep fryer with a basket that dips into the oil.
export function makeFryer() {
  const g = new THREE.Group();
  g.add(at(rbox(0.96, 0.3, 0.6, COL.steel, 0.03, { metal: 0.4, rough: 0.35 }), 0, 0.15, 0));
  g.add(at(box(0.72, 0.02, 0.42, '#7b6a50'), 0, 0.295, 0.02));
  const oil = at(box(0.68, 0.02, 0.38, umat('#f2b33d', { rough: 0.15, emissive: '#c77a10', ei: 0.25 })), 0, 0.3, 0.02);
  g.add(oil);
  g.add(at(rbox(0.96, 0.26, 0.06, COL.steel, 0.02, { metal: 0.4, rough: 0.35 }), 0, 0.42, -0.28));
  g.add(at(rot(cyl(0.03, 0.03, 0.04, COL.cherry, 10), Math.PI / 2, 0, 0), -0.3, 0.48, -0.24));
  g.add(at(sph(0.025, '#7fe0a0', { emissive: '#3fbf7f', ei: 0.9 }, 10), 0.32, 0.48, -0.245));
  const basket = new THREE.Group();
  const wire = mat(COL.steelDark, { metal: 0.5, rough: 0.3 });
  basket.add(at(box(0.46, 0.012, 0.3, wire), 0, 0, 0));
  for (const [w, d, x, z] of [[0.46, 0.012, 0, 0.15], [0.46, 0.012, 0, -0.15], [0.012, 0.3, 0.23, 0], [0.012, 0.3, -0.23, 0]]) basket.add(at(box(w, 0.16, d, wire), x, 0.08, z));
  basket.add(at(rot(cyl(0.012, 0.012, 0.3, wire, 6), Math.PI / 2 - 0.4, 0, 0), 0, 0.2, 0.26));
  basket.add(at(rot(cyl(0.024, 0.024, 0.14, COL.cherry, 10), Math.PI / 2 - 0.4, 0, 0), 0, 0.27, 0.42));
  const fries = mesh(friesGeometry(), umat(COL.fries, { rough: 0.6 }), { cast: false });
  fries.scale.set(2.6, 0.45, 2.4);
  fries.position.y = -0.05;
  fries.visible = false;
  basket.add(fries);
  basket.position.set(0, 0.5, 0.02);
  g.add(basket);
  return { group: g, basket, fries, oil, upY: 0.5, downY: 0.31 };
}

// Soda fountain with a nozzle and a stream.
export function makeSodaMachine(atlas) {
  const g = new THREE.Group();
  g.add(at(rbox(0.62, 0.86, 0.42, COL.orange, 0.06), 0, 0.43, -0.05));
  g.add(at(rbox(0.66, 0.08, 0.46, COL.red, 0.03), 0, 0.88, -0.05));
  g.add(at(rbox(0.5, 0.36, 0.03, COL.cream2, 0.03), 0, 0.62, 0.165));
  if (atlas)
    g.add(
      at(
        atlas.plane(0.44, 0.3, 220, 150, (c, w, h) => {
          c.fillStyle = COL.cream2;
          c.fillRect(0, 0, w, h);
          drawCup(c, w * 0.26, h * 0.52, h * 0.78);
          c.fillStyle = COL.red;
          c.font = `700 ${h * 0.3}px ${FONT}`;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText('Soda', w * 0.66, h * 0.5);
        }),
        0,
        0.62,
        0.182,
      ),
    );
  g.add(at(rbox(0.5, 0.04, 0.3, COL.steel, 0.015, { metal: 0.4, rough: 0.35 }), 0, 0.02, 0.18));
  g.add(at(cyl(0.035, 0.025, 0.08, COL.steelDark, 10, { metal: 0.5, rough: 0.3 }), 0, 0.37, 0.17));
  g.add(at(box(0.3, 0.05, 0.1, COL.steelDark, { metal: 0.5, rough: 0.3 }), 0, 0.41, 0.12));
  const stream = mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 8).translate(0, -0.5, 0), umat(COL.soda, { rough: 0.2, emissive: COL.soda, ei: 0.2 }), { cast: false });
  stream.position.set(0, 0.33, 0.17);
  stream.scale.y = 0.29;
  stream.visible = false;
  g.add(stream);
  return { group: g, stream, cupAt: new THREE.Vector3(0, 0.04, 0.17) };
}

// Retro milkshake mixer: a steel cup under a spinning spindle.
export function makeShakeMachine(atlas) {
  const g = new THREE.Group();
  g.add(at(rbox(0.56, 0.1, 0.42, COL.mint, 0.04), 0, 0.05, 0));
  g.add(at(rbox(0.16, 0.74, 0.16, COL.mint, 0.05), 0, 0.42, -0.14));
  g.add(at(rbox(0.42, 0.18, 0.36, COL.pink, 0.07), 0, 0.82, -0.02));
  g.add(at(sph(0.05, COL.cherry, { rough: 0.3 }, 12), 0, 0.95, -0.02));
  g.add(at(cyl(0.004, 0.004, 0.06, '#3f9a43', 6), 0.01, 1.01, -0.02));
  if (atlas) g.add(at(atlas.plane(0.36, 0.11, 200, 60, (c, w, h) => drawLabel(c, w, h, 'Shakes', { bg: COL.cream2, edge: COL.hotpink, ink: COL.hotpink, size: 0.62 })), 0, 0.82, 0.165));
  const spin = new THREE.Group();
  spin.add(at(cyl(0.008, 0.008, 0.26, COL.steelDark, 6, { metal: 0.6, rough: 0.3 }), 0, -0.13, 0));
  spin.add(at(cyl(0.03, 0.03, 0.012, COL.steelDark, 8, { metal: 0.6, rough: 0.3 }), 0, -0.25, 0));
  spin.position.set(0, 0.73, 0.06);
  g.add(spin);
  const cup = new THREE.Group();
  cup.add(at(cyl(0.085, 0.065, 0.24, COL.steel, 16, { metal: 0.55, rough: 0.25 }), 0, 0.12, 0));
  cup.add(at(cyl(0.075, 0.075, 0.01, COL.shake, 14), 0, 0.2, 0));
  cup.position.set(0, 0.1, 0.06);
  g.add(cup);
  return { group: g, spin, cup };
}

export function makePattyTray(atlas) {
  const g = new THREE.Group();
  g.add(at(rbox(0.62, 0.07, 0.48, COL.steel, 0.02, { metal: 0.4, rough: 0.35 }), 0, 0.035, 0));
  g.add(at(box(0.36, 0.006, 0.36, '#ffffff'), -0.06, 0.073, 0));
  for (let i = 0; i < 4; i++) {
    const p = rawPatty();
    p.rotation.y = i * 0.7;
    g.add(at(p, -0.06, 0.076 + i * 0.047, 0));
  }
  const side = rawPatty();
  g.add(at(rot(side, 0, 0, 0.5), 0.2, 0.12, -0.02));
  if (atlas) g.add(at(atlas.plane(0.46, 0.1, 230, 50, (c, w, h) => drawLabel(c, w, h, 'Patties', { edge: COL.raw, size: 0.62 })), 0, 0.04, 0.245));
  return { group: g };
}

export function makeToppingBin(kind, atlas) {
  const g = new THREE.Group();
  g.add(at(rbox(0.4, 0.1, 0.38, COL.steel, 0.02, { metal: 0.4, rough: 0.35 }), 0, 0.05, 0));
  g.add(at(box(0.34, 0.01, 0.32, '#c3cbd3'), 0, 0.101, 0));
  if (kind === 'cheese') {
    for (let i = 0; i < 4; i++) g.add(at(rot(box(0.2, 0.012, 0.2, COL.cheese, { rough: 0.6 }), 0, i * 0.25, 0), 0, 0.11 + i * 0.013, 0));
  } else if (kind === 'lettuce') {
    for (let i = 0; i < 3; i++) {
      const l = mesh(lettuceGeometry(), mat(COL.lettuce, { rough: 0.6 }));
      l.scale.setScalar(0.85);
      g.add(at(rot(l, 0.12, i, 0.1 * (i - 1)), (i - 1) * 0.04, 0.115 + i * 0.022, (i - 1) * 0.03));
    }
  } else {
    for (const [x, z] of [[-0.09, -0.08], [0.08, -0.09], [0, 0.0], [-0.09, 0.08], [0.09, 0.08]]) {
      g.add(at(cyl(0.07, 0.07, 0.024, COL.tomato, 14, { rough: 0.6 }), x, 0.118, z));
      g.add(at(cyl(0.045, 0.045, 0.026, '#ff8f80', 12, { rough: 0.6 }), x, 0.119, z));
    }
  }
  if (atlas) {
    const name = { cheese: 'Cheese', lettuce: 'Lettuce', tomato: 'Tomato' }[kind];
    const edge = { cheese: '#f0b41e', lettuce: '#3f9a43', tomato: COL.tomato }[kind];
    g.add(at(atlas.plane(0.36, 0.09, 200, 50, (c, w, h) => drawLabel(c, w, h, name, { edge, size: 0.62 })), 0, 0.05, 0.195));
  }
  return { group: g };
}

export function makeTrash(atlas) {
  const g = new THREE.Group();
  g.add(at(cyl(0.16, 0.13, 0.34, COL.teal, 20), 0, 0.17, 0));
  g.add(at(tor(0.16, 0.012, COL.oliveDeep), 0, 0.34, 0));
  g.children[1].rotation.x = Math.PI / 2;
  const lid = new THREE.Group();
  lid.add(at(cyl(0.17, 0.17, 0.03, COL.oliveDeep, 20), 0, 0, 0.17));
  lid.add(at(sph(0.03, COL.white, undefined, 10), 0, 0.03, 0.17));
  lid.position.set(0, 0.355, -0.17);
  g.add(lid);
  if (atlas) g.add(at(atlas.plane(0.24, 0.1, 160, 66, (c, w, h) => drawLabel(c, w, h, 'Trash', { bg: COL.white, edge: COL.teal, size: 0.55 })), 0, 0.2, 0.152));
  return { group: g, lid };
}

// ------------------------------------------------------------------ furniture
export function makeStool(seat = COL.cherry) {
  const g = new THREE.Group();
  g.add(at(cyl(0.2, 0.22, 0.04, COL.brass, 18, BRASS), 0, 0.02, 0));
  g.add(at(cyl(0.035, 0.035, 0.6, COL.brass, 10, BRASS), 0, 0.32, 0));
  g.add(at(tor(0.13, 0.012, COL.brass, BRASS, Math.PI * 2, 16), 0, 0.26, 0));
  g.children[2].rotation.x = Math.PI / 2;
  g.add(at(cyl(0.2, 0.19, 0.1, seat, 20, { rough: 0.45 }), 0, 0.66, 0));
  g.add(at(cyl(0.205, 0.205, 0.025, COL.brass, 20, BRASS), 0, 0.6, 0));
  return g;
}

// Booth: a padded bench with a tall back. Faces +Z. len along X.
export function makeBench(len = 1.3, color = COL.cherry, trim = COL.white) {
  const g = new THREE.Group();
  g.add(at(rbox(len, 0.42, 0.5, trim, 0.05), 0, 0.21, 0));
  g.add(at(rbox(len - 0.04, 0.12, 0.5, color, 0.05, { rough: 0.45 }), 0, 0.47, 0.02));
  g.add(at(rbox(len, 0.72, 0.18, color, 0.07, { rough: 0.45 }), 0, 0.82, -0.2));
  const n = Math.round(len / 0.33);
  const seam = '#' + new THREE.Color(color).multiplyScalar(0.8).getHexString();
  for (let i = 1; i < n; i++) g.add(at(box(0.014, 0.6, 0.02, seam), -len / 2 + i * (len / n), 0.82, -0.105));
  g.add(at(rbox(len + 0.04, 0.06, 0.22, trim, 0.03), 0, 1.2, -0.2));
  return g;
}

export function makeDinerTable(w = 0.9, d = 1.3, top = COL.cream, edge = COL.brass) {
  const g = new THREE.Group();
  g.add(at(rbox(w, 0.05, d, top, 0.02, { rough: 0.35 }), 0, 0.75, 0));
  g.add(at(box(w + 0.02, 0.03, d + 0.02, edge, BRASS), 0, 0.725, 0));
  g.add(at(cyl(0.05, 0.05, 0.7, COL.brass, 10, BRASS), 0, 0.37, 0));
  g.add(at(cyl(0.26, 0.3, 0.04, COL.brass, 18, BRASS), 0, 0.02, 0));
  return g;
}

export function makeRoundTable(r = 0.45, top = COL.cream) {
  const g = new THREE.Group();
  g.add(at(cyl(r, r, 0.05, top, 28, { rough: 0.35 }), 0, 0.75, 0));
  g.add(at(rot(tor(r, 0.02, COL.brass, BRASS, Math.PI * 2, 24), Math.PI / 2, 0, 0), 0, 0.75, 0));
  g.add(at(cyl(0.045, 0.045, 0.7, COL.brass, 10, BRASS), 0, 0.37, 0));
  g.add(at(cyl(0.24, 0.27, 0.04, COL.brass, 18, BRASS), 0, 0.02, 0));
  return g;
}

export function makeChair(color = COL.mint) {
  const g = new THREE.Group();
  g.add(at(rbox(0.42, 0.07, 0.42, color, 0.03, { rough: 0.45 }), 0, 0.45, 0));
  g.add(at(rbox(0.42, 0.4, 0.06, color, 0.03, { rough: 0.45 }), 0, 0.72, -0.19));
  for (const [x, z] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) g.add(at(cyl(0.018, 0.018, 0.44, COL.brass, 6, BRASS), x, 0.22, z));
  return g;
}

// Jukebox: arched cabinet with glowing bands. Faces +Z. Returns { group, lights: [materials], record }.
export function makeJukebox(atlas) {
  const g = new THREE.Group();
  g.add(at(rbox(0.9, 1.1, 0.5, COL.woodDark, 0.06), 0, 0.55, 0));
  const arch = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.5, 24, 1, false, -Math.PI / 2, Math.PI), mat(COL.woodDark));
  arch.rotation.x = Math.PI / 2;
  arch.rotation.y = Math.PI / 2;
  g.add(at(arch, 0, 1.1, 0));
  const lights = [];
  const band = (r, tube, y, color) => {
    const m = umat(color, { emissive: color, ei: 0.8, rough: 0.4 });
    lights.push(m);
    const t = mesh(new THREE.TorusGeometry(r, tube, 8, 24, Math.PI), m, { cast: false });
    t.position.set(0, y, 0.26);
    g.add(t);
    return t;
  };
  band(0.42, 0.035, 1.1, COL.hotpink);
  band(0.34, 0.03, 1.1, COL.sun);
  band(0.26, 0.025, 1.1, '#c3d39a');
  const glass = mesh(new THREE.CircleGeometry(0.22, 24, 0, Math.PI), umat('#4a2b3a', { emissive: '#8a3d5c', ei: 0.4, rough: 0.2 }), { cast: false });
  glass.position.set(0, 1.1, 0.252);
  g.add(glass);
  const record = new THREE.Group();
  record.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.01, 24), mat('#1d1620', { rough: 0.3 })));
  record.add(at(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 16), mat(COL.cherry)), 0, 0.001, 0));
  record.rotation.x = Math.PI / 2;
  record.position.set(0, 1.16, 0.23);
  g.add(record);
  for (const [x, c] of [[-0.3, COL.hotpink], [0.3, '#c3d39a']]) {
    const m = umat(c, { emissive: c, ei: 0.8 });
    lights.push(m);
    g.add(at(mesh(new THREE.BoxGeometry(0.08, 0.9, 0.04), m, { cast: false }), x, 0.55, 0.26));
  }
  if (atlas)
    g.add(
      at(
        atlas.plane(0.44, 0.36, 220, 180, (c, w, h) => {
          c.fillStyle = COL.paper;
          roundRect(c, 4, 4, w - 8, h - 8, 16);
          c.fill();
          c.fillStyle = COL.red;
          c.font = `700 ${h * 0.17}px ${FONT}`;
          c.textAlign = 'center';
          c.fillText('Jukebox', w / 2, h * 0.24);
          c.font = `500 ${h * 0.11}px ${FONT}`;
          c.fillStyle = COL.ink;
          ['A1 Burger Boogie', 'B2 Strawberry Shake', 'C3 Roji Rock'].forEach((s, i) => c.fillText(s, w / 2, h * (0.47 + i * 0.17)));
        }),
        0,
        0.62,
        0.255,
      ),
    );
  g.add(at(rbox(0.96, 0.08, 0.54, '#6e4330', 0.03), 0, 0.04, 0));
  for (const s of [-1, 1]) g.add(at(box(0.04, 1.05, 0.04, COL.brass, BRASS), s * 0.46, 0.55, 0.25));
  return { group: g, lights, record };
}

// Cash register with a little screen that can show a number.
export function makeRegister() {
  const g = new THREE.Group();
  g.add(at(rbox(0.46, 0.16, 0.38, COL.mint, 0.04), 0, 0.08, 0));
  const keys = new THREE.Group();
  keys.add(at(rot(rbox(0.38, 0.05, 0.2, COL.white, 0.02), -0.35, 0, 0), 0, 0.18, 0.06));
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) keys.add(at(rot(box(0.05, 0.02, 0.035, [COL.rasp, COL.sun, COL.pink][i]), -0.35, 0, 0), -0.12 + j * 0.08, 0.21 - i * 0.022, 0.03 + i * 0.05));
  g.add(keys);
  g.add(at(rbox(0.36, 0.2, 0.12, COL.mint, 0.04), 0, 0.3, -0.12));
  g.add(at(box(0.08, 0.1, 0.06, COL.mint), 0, 0.17, -0.12));
  g.add(at(rbox(0.46, 0.08, 0.3, COL.teal, 0.02), 0, -0.02, 0.02));
  const screen = canvasTexture(256, 112, () => {});
  const scr = mesh(new THREE.PlaneGeometry(0.3, 0.13), new THREE.MeshBasicMaterial({ map: screen }), { cast: false });
  scr.position.set(0, 0.31, -0.059);
  g.add(scr);
  const show = (text) => {
    const c = screen.image.getContext('2d');
    c.fillStyle = '#3d4433';
    c.fillRect(0, 0, 256, 112);
    c.fillStyle = '#f3f0c0';
    c.font = `700 70px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, 128, 60);
    screen.needsUpdate = true;
  };
  show('0');
  return { group: g, screen: scr, show };
}

// Window with a painted sky (shared material).
export function skyTexture() {
  return cg('skyTex', () =>
    canvasTexture(256, 256, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#8fd3ef');
      gr.addColorStop(1, '#e0f6fb');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      for (const [x, y, s] of [[60, 70, 1], [180, 110, 0.8], [120, 40, 0.6]]) {
        c.beginPath();
        c.arc(x, y, 22 * s, 0, Math.PI * 2);
        c.arc(x + 24 * s, y + 4, 18 * s, 0, Math.PI * 2);
        c.arc(x - 22 * s, y + 6, 15 * s, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = '#9ad06a';
      c.beginPath();
      c.ellipse(70, h + 10, 120, 60, 0, 0, Math.PI * 2);
      c.ellipse(220, h + 20, 110, 70, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#6fbf6a';
      c.beginPath();
      c.arc(200, h - 52, 22, 0, Math.PI * 2);
      c.arc(222, h - 40, 18, 0, Math.PI * 2);
      c.fill();
    }),
  );
}
export function windowMesh(w, h, frame = COL.white) {
  const g = new THREE.Group();
  g.add(at(rbox(w + 0.18, h + 0.18, 0.1, frame, 0.05), 0, 0, 0));
  g.add(at(mesh(new THREE.PlaneGeometry(w, h), cg('skyMat', () => new THREE.MeshBasicMaterial({ map: skyTexture() })), { cast: false }), 0, 0, 0.055));
  g.add(at(box(0.04, h, 0.03, frame), 0, 0, 0.07));
  g.add(at(box(w, 0.04, 0.03, frame), 0, 0, 0.07));
  g.add(at(rbox(w + 0.3, 0.06, 0.16, frame, 0.02), 0, -h / 2 - 0.1, 0.06));
  return g;
}

// A brass lantern with warm glass, about 0.55 m tall times s, base at y = 0. glass: its glowing material.
export function makeLantern(s = 1, glass = mat('#fff0d0', { emissive: '#ffe1a8', ei: 0.55, rough: 0.25 })) {
  const g = new THREE.Group();
  const B = mat(COL.brass, BRASS);
  g.add(at(cyl(0.11 * s, 0.07 * s, 0.07 * s, B, 6), 0, 0.035 * s, 0));
  g.add(at(mesh(cg(`lanternGlass${s}`, () => new THREE.CylinderGeometry(0.12 * s, 0.12 * s, 0.26 * s, 6)), glass, { cast: false }), 0, 0.2 * s, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(at(box(0.018 * s, 0.27 * s, 0.018 * s, B), Math.cos(a) * 0.12 * s, 0.2 * s, Math.sin(a) * 0.12 * s));
  }
  g.add(at(cyl(0.02 * s, 0.14 * s, 0.13 * s, B, 6), 0, 0.4 * s, 0));
  g.add(at(sph(0.035 * s, B, undefined, 8), 0, 0.48 * s, 0));
  g.add(at(tor(0.035 * s, 0.008 * s, B, undefined, Math.PI * 2, 12), 0, 0.53 * s, 0));
  g.userData.glass = glass;
  return g;
}

// A brass Arabic coffee pot (dallah), spout toward +X, base at y = 0, about 1.1 m tall times s.
export function makeDallah(s = 1) {
  const g = new THREE.Group();
  const B = mat(COL.brass, BRASS);
  g.add(lathe('dallah', [[0, 0], [0.3, 0], [0.33, 0.05], [0.31, 0.14], [0.25, 0.3], [0.2, 0.44], [0.16, 0.58], [0.17, 0.66], [0.23, 0.7], [0.24, 0.74], [0.2, 0.76], [0.15, 0.86], [0.08, 0.96], [0.05, 1.0], [0, 1.02]], B, undefined, 16));
  g.add(at(sph(0.06, B, undefined, 8), 0, 1.06, 0));
  g.add(at(rot(tor(0.3, 0.02, mat(COL.raspDeep, BRASS), undefined, Math.PI * 2, 18), Math.PI / 2, 0, 0), 0, 0.12, 0));
  const spout = new THREE.CatmullRomCurve3([new THREE.Vector3(0.22, 0.28, 0), new THREE.Vector3(0.38, 0.46, 0), new THREE.Vector3(0.46, 0.7, 0), new THREE.Vector3(0.6, 0.86, 0)]);
  g.add(mesh(cg('dallahSpout', () => new THREE.TubeGeometry(spout, 12, 0.045, 7)), B));
  g.add(at(rot(cyl(0.02, 0.06, 0.12, B, 8), 0, 0, -0.9), 0.64, 0.89, 0));
  const handle = mesh(cg('dallahHandle', () => new THREE.TorusGeometry(0.22, 0.03, 6, 12, Math.PI * 1.1)), B);
  handle.rotation.z = Math.PI / 2 - 0.1;
  g.add(at(handle, -0.2, 0.5, 0));
  g.userData.spout = new THREE.Vector3(0.7, 0.93, 0);
  g.scale.setScalar(s);
  return g;
}

// An olive tree in a pot, about h tall, base at y = 0.
export function makeOliveTree(h = 1.2, pot = COL.rasp, seed = 3) {
  const r = rng(seed);
  const g = new THREE.Group();
  g.add(at(cyl(0.24, 0.18, 0.36, pot, 12), 0, 0.18, 0));
  g.add(at(cyl(0.25, 0.25, 0.05, COL.cream, 12), 0, 0.36, 0));
  g.add(at(cyl(0.21, 0.21, 0.03, '#7a5a3e', 10), 0, 0.37, 0));
  g.add(at(rot(cyl(0.035, 0.05, h * 0.5, '#8a6a4c', 6), 0, 0, 0.12), 0.03, 0.36 + h * 0.25, 0));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + r();
    const y = 0.36 + h * (0.5 + r() * 0.35);
    g.add(at(sph(0.14 + r() * 0.07, i % 2 ? '#8b9466' : '#76804f', { rough: 0.9 }, 8), Math.cos(a) * 0.2, y, Math.sin(a) * 0.18));
  }
  for (let i = 0; i < 5; i++) g.add(at(sph(0.022, '#4b4a3a', undefined, 6), (r() - 0.5) * 0.4, 0.36 + h * (0.55 + r() * 0.3), 0.18 + r() * 0.05));
  return g;
}

// A potted plant, base at y = 0.
export function makePlant(h = 0.6, pot = COL.orange) {
  const g = new THREE.Group();
  g.add(at(cyl(0.14 * (h / 0.6), 0.11 * (h / 0.6), 0.22 * (h / 0.6), pot, 16), 0, 0.11 * (h / 0.6), 0));
  const leaf = mat(COL.leaf, { rough: 0.85 });
  const s = h / 0.6;
  for (const [x, y, z, r] of [[0, 0.42, 0, 0.17], [0.1, 0.34, 0.05, 0.12], [-0.1, 0.36, -0.03, 0.13], [0.02, 0.55, 0.02, 0.11]]) g.add(at(sph(r * s, leaf, undefined, 12), x * s, y * s, z * s));
  return g;
}

// ------------------------------------------------------------------ people
// Chef hat and apron on a kid (Roji or Homama as the chef, or the cook).
export function dressChef(kid, { apron = '#ffffff', trim = COL.orange, hat: withHat = true } = {}) {
  const hat = new THREE.Group();
  hat.add(at(cyl(0.19, 0.2, 0.12, '#ffffff', 22, { rough: 0.85 }), 0, 0, 0));
  hat.add(at(tor(0.195, 0.012, trim, { rough: 0.6 }), 0, -0.05, 0));
  hat.children[1].rotation.x = Math.PI / 2;
  for (const [x, y, z, r] of [[0, 0.16, 0, 0.19], [0.12, 0.12, 0.04, 0.12], [-0.12, 0.12, 0.03, 0.12], [0.02, 0.12, -0.13, 0.12], [0, 0.13, 0.12, 0.11]]) {
    const s = sph(r, '#ffffff', { rough: 0.85 }, 14);
    s.scale.y = 0.8;
    hat.add(at(s, x, y, z));
  }
  hat.position.set(0, 0.6, -0.02);
  hat.rotation.x = -0.12;
  if (withHat) kid.head.add(hat);
  else {
    // A little paper diner cap instead
    const cap = new THREE.Group();
    cap.add(at(rot(box(0.36, 0.1, 0.16, '#ffffff', { rough: 0.85 }), 0, 0, 0), 0, 0, 0));
    cap.add(at(box(0.37, 0.03, 0.17, trim), 0, -0.04, 0));
    cap.add(at(rot(cyl(0.001, 0.08, 0.36, '#ffffff', 3, { rough: 0.85 }), 0, 0, Math.PI / 2), 0, 0.08, 0));
    cap.position.set(0, 0.61, -0.02);
    cap.rotation.x = -0.15;
    kid.head.add(cap);
  }
  const o = kid.look.outfit;
  const rb = o === 'dress' ? 0.335 : o === 'skirt' ? 0.3 : 0.222;
  const front = new THREE.CylinderGeometry(0.214, rb, 0.36, 18, 1, true, -0.95, 1.9);
  const ap = mesh(front, mat(apron, { rough: 0.85 }));
  ap.position.y = o === 'dress' ? 0.47 : 0.5;
  kid.body.add(ap);
  kid.body.add(at(rbox(0.16, 0.13, 0.02, apron, 0.02), 0, 0.71, 0.155));
  kid.body.add(at(box(0.11, 0.012, 0.02, trim), 0, 0.775, 0.16));
  const pocket = rbox(0.12, 0.07, 0.02, trim, 0.015);
  kid.body.add(at(pocket, 0.06, o === 'dress' ? 0.45 : 0.46, rb > 0.3 ? 0.27 : 0.225));
  for (const s of [1, -1]) kid.body.add(at(rot(box(0.02, 0.2, 0.012, trim), -0.2, 0, 0.5 * s), 0.08 * s, 0.82, 0.08));
  return kid;
}

// Varied looks for guests: never Roji's pink dress or Homama's blue tee.
const NAMES = ['Lina', 'Omar', 'Sara', 'Yusuf', 'Maya', 'Adam', 'Noor', 'Zain', 'Hana', 'Sami', 'Leen', 'Karim', 'Dana', 'Rami', 'Tala', 'Fadi'];
const TOPS = ['#7fd3a7', '#ffd166', '#c7a6ff', '#6fb8ff', '#f08a5d', '#3fbf7f', '#8b5cf6', '#ffffff', '#ff9eb5', '#21a99a'];
const BOTTOMS = ['#2c3e66', '#3b2b3f', '#a0602e', '#6fb8ff', '#ffffff', '#8b5cf6'];
const SKINS = ['#fbe6d8', '#f2cdb4', '#e3b08e', '#c98f68', '#9c6a4a', '#6e4630'];
const HAIRS = ['#141010', '#4a2c1a', '#7a4a26', '#b5773d', '#e3c07a', '#c94f3b'];
const SHOES = ['#ffffff', '#3b2b3f', '#e5484d', '#3f7bf0', '#ffd166'];
export function guestLook(r = Math.random) {
  const pick = (a) => a[Math.floor(r() * a.length)];
  const girl = r() < 0.5;
  const top = pick(TOPS);
  return {
    id: 'guest',
    name: pick(NAMES),
    gender: girl ? 'girl' : 'boy',
    skin: pick(SKINS),
    hair: pick(HAIRS),
    hairstyle: girl ? pick(['ponytail', 'bob', 'long', 'buns']) : pick(['curly', 'spiky', 'sidepart', 'short']),
    outfit: girl ? pick(['skirt', 'overalls', 'dress']) : pick(['tee-pants', 'hoodie', 'tee-shorts']),
    top: girl ? (top === '#ff9eb5' ? '#ffd166' : top) : top === '#6fb8ff' ? '#7fd3a7' : top,
    bottom: pick(BOTTOMS),
    shoes: pick(SHOES),
    accent: pick(['#ffd166', '#ff7fa3', '#7fd3a7', '#c7a6ff']),
  };
}
