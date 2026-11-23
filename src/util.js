import * as THREE from 'three';

export const FONT = "'Fredoka', ui-rounded, 'Nunito', system-ui, sans-serif";

// Small deterministic random generator (mulberry32).
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const matCache = new Map();

// Shared material, cached by its settings.
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, umat(color, opts));
  return matCache.get(key);
}

// Unique material, for anything animated per object.
export function umat(color, { rough = 0.78, metal = 0, emissive = null, ei = 1, flat = false, transparent = false, opacity = 1, side = THREE.FrontSide, map = null } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, flatShading: flat, transparent, opacity, side, map });
  if (emissive) {
    m.emissive = new THREE.Color(emissive);
    m.emissiveIntensity = ei;
  }
  return m;
}

export function mesh(geo, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));

export function dampAngle(a, b, rate, dt) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * (1 - Math.exp(-rate * dt));
}

export function lighten(hex, amount) {
  return new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), amount);
}

export const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// Heart outline from the classic parametric curve, about 1 unit tall.
export function heartShape(size = 1) {
  const s = new THREE.Shape();
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const px = (x / 34) * size;
    const py = ((y + 4) / 30) * size;
    if (i === 0) s.moveTo(px, py);
    else s.lineTo(px, py);
  }
  return s;
}

// Tiny tween manager driven by the frame delta.
export class Tweens {
  constructor() {
    this.list = [];
  }
  add(duration, onUpdate, ease = easeOutCubic, onDone) {
    this.list.push({ t: 0, duration, onUpdate, ease, onDone });
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i];
      tw.t += dt;
      const k = Math.min(tw.t / tw.duration, 1);
      tw.onUpdate(tw.ease(k));
      if (k >= 1) {
        this.list.splice(i, 1);
        tw.onDone?.();
      }
    }
  }
}

// Merge every static mesh under `group` into one mesh per material, to cut draw calls.
// `dynamic` objects (and everything under them) are left untouched.
export function bakeStatic(group, dynamic = [], mergeGeometries) {
  group.updateMatrixWorld(true);
  const skip = new Set();
  for (const d of dynamic) d.traverse((o) => skip.add(o));
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const buckets = new Map();
  const victims = [];
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || skip.has(o) || o === group) return;
    if (Array.isArray(o.material) || o.material.transparent) return;
    if (o.children.some((c) => skip.has(c) || !c.isMesh)) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv || !g.attributes.normal) return;
    g.clearGroups();
    g.morphAttributes = {};
    rel.multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(rel);
    const key = o.material.uuid + (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '');
    if (!buckets.has(key)) buckets.set(key, { material: o.material, cast: o.castShadow, receive: o.receiveShadow, list: [] });
    buckets.get(key).list.push(g);
    victims.push(o);
  });
  for (const o of victims) o.removeFromParent();
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.list, false);
    if (!merged) continue;
    const m = new THREE.Mesh(merged, b.material);
    m.castShadow = b.cast;
    m.receiveShadow = b.receive;
    group.add(m);
  }
}
