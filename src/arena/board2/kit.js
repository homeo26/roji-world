import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mesh, rng } from '../../util.js';

// Shared helpers for Snakes and Ladders and Memory Match: primitives, mesh baking,
// game-time timers, a small garden scatter, a HUD layer and synth sounds.

// ------------------------------------------------------------------ primitives
const M = (c, o) => (typeof c === 'string' ? mat(c, o) : c);
export const box = (w, h, d, c, o) => mesh(new THREE.BoxGeometry(w, h, d), M(c, o));
export const rbox = (w, h, d, c, r = 0.06, o) => mesh(new RoundedBoxGeometry(w, h, d, 2, r), M(c, o));
export const cyl = (rt, rb, h, c, seg = 14, o) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(c, o));
export const ball = (r, c, o, seg = 14) => mesh(new THREE.SphereGeometry(r, seg, Math.max(8, Math.round(seg * 0.7))), M(c, o));
export const cone = (r, h, c, seg = 10, o) => mesh(new THREE.ConeGeometry(r, h, seg), M(c, o));
export function at(o, x, y, z, ry = 0) {
  o.position.set(x, y, z);
  if (ry) o.rotation.y = ry;
  return o;
}
export const shade = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
export const tint = (hex, to, k) => '#' + new THREE.Color(hex).lerp(new THREE.Color(to), k).getHexString();

// Each kid's colour for the HUD and markers: their top, unless it is too pale, too dark or too
// close to the other one (then Roji pink and Homama blue).
const rgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
const luma = (h) => {
  const [r, g, b] = rgb(h);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
export function playerColors(looks, ids) {
  const base = (id) => (id === 'roji' ? '#ef5b6f' : '#3f7bf0');
  const usable = (c) => /^#[0-9a-f]{6}$/i.test(c || '') && luma(c) < 0.8 && luma(c) > 0.18;
  let out = ids.map((id) => (usable(looks[id]?.top) ? looks[id].top : base(id)));
  const [p, q] = out.map(rgb);
  if (Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 120) out = ids.map(base);
  return out;
}

// ------------------------------------------------------------------ baking
// Merge every static mesh under `root` into a few vertex-coloured meshes. Textured meshes
// that share a material merge with their uvs. keep: objects (and subtrees) to leave alone.
const bakedMats = new Map();
function bakedMat(flat, side, rough, metal) {
  const key = `${flat}|${side}|${rough}|${metal}`;
  if (!bakedMats.has(key)) bakedMats.set(key, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: flat, side, roughness: rough, metalness: metal }));
  return bakedMats.get(key);
}

function plain(o, skip) {
  if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || skip.has(o) || !o.visible) return false;
  const m = o.material;
  if (Array.isArray(m) || m.map || m.alphaTest > 0 || m.vertexColors) return false;
  return !m.transparent || !!o.userData.bakeColor;
}
function textured(o, skip) {
  if (!o.isMesh || o.isInstancedMesh || skip.has(o) || !o.visible) return false;
  const m = o.material;
  return !Array.isArray(m) && !!m.map && !m.transparent && !m.vertexColors && !!o.geometry.attributes.uv;
}

function prep(o, rel, color) {
  const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
  const keepUv = color === null;
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && !(keepUv && name === 'uv')) g.deleteAttribute(name);
  if (!g.attributes.normal) g.computeVertexNormals();
  g.morphAttributes = {};
  g.clearGroups();
  g.applyMatrix4(rel);
  const pos = g.attributes.position;
  const n = pos.count;
  if (rel.determinant() < 0) {
    // Mirrored: swap two corners of every triangle so faces stay front-facing
    const list = [pos, g.attributes.normal, g.attributes.uv].filter(Boolean);
    for (let i = 0; i < n; i += 3) {
      for (const a of list) {
        const s = a.itemSize;
        for (let c = 0; c < s; c++) {
          const tmp = a.array[(i + 1) * s + c];
          a.array[(i + 1) * s + c] = a.array[(i + 2) * s + c];
          a.array[(i + 2) * s + c] = tmp;
        }
      }
    }
  }
  if (keepUv) return g;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = color.r;
    arr[i * 3 + 1] = color.g;
    arr[i * 3 + 2] = color.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function colorOf(o, out) {
  const m = o.material;
  if (o.userData.bakeColor) return out.set(o.userData.bakeColor);
  out.copy(m.color);
  if (m.emissive && m.emissiveIntensity) {
    out.r = Math.min(1, out.r + m.emissive.r * m.emissiveIntensity * 0.5);
    out.g = Math.min(1, out.g + m.emissive.g * m.emissiveIntensity * 0.5);
    out.b = Math.min(1, out.b + m.emissive.b * m.emissiveIntensity * 0.5);
  }
  return out;
}

export function bakeVC(root, keep = [], { coarse = true, oneCast = false } = {}) {
  root.updateMatrixWorld(true);
  const skip = new Set();
  for (const k of keep) k?.traverse((o) => skip.add(o));
  const ok = new Set();
  const tex = new Set();
  root.traverse((o) => o !== root && (plain(o, skip) ? ok.add(o) : textured(o, skip) && tex.add(o)));
  // A mesh whose children are not all baked must stay, or removing it would drop them
  const gone = (c) => ok.has(c) || tex.has(c);
  for (let again = true; again; ) {
    again = false;
    for (const set of [ok, tex]) {
      for (const o of [...set]) {
        let fine = true;
        o.traverse((c) => c !== o && !gone(c) && (fine = false));
        if (!fine) {
          set.delete(o);
          again = true;
        }
      }
    }
  }
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const col = new THREE.Color();
  const buckets = new Map();
  for (const o of ok) {
    const m = o.material;
    const rough = coarse ? 0.7 : Math.round((m.roughness ?? 0.8) * 5) / 5;
    const metal = (m.metalness ?? 0) > 0.3 ? 0.4 : 0;
    const cast = oneCast || o.castShadow;
    const receive = oneCast || o.receiveShadow;
    const key = `${!!m.flatShading}|${m.side}|${rough}|${metal}|${cast}|${receive}`;
    if (!buckets.has(key)) buckets.set(key, { mat: bakedMat(!!m.flatShading, m.side, rough, metal), cast, receive, list: [] });
    rel.multiplyMatrices(inv, o.matrixWorld);
    buckets.get(key).list.push(prep(o, rel, colorOf(o, col)));
  }
  for (const o of tex) {
    const key = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}`;
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, receive: o.receiveShadow, list: [] });
    rel.multiplyMatrices(inv, o.matrixWorld);
    buckets.get(key).list.push(prep(o, rel, null));
  }
  for (const o of ok) o.removeFromParent();
  for (const o of tex) o.removeFromParent();
  const out = [];
  for (const b of buckets.values()) {
    const g = mergeGeometries(b.list, false);
    for (const x of b.list) x.dispose();
    if (!g) continue;
    const m = new THREE.Mesh(g, b.mat);
    m.castShadow = b.cast;
    m.receiveShadow = b.receive;
    root.add(m);
    out.push(m);
  }
  return out;
}

// Cheeks are see-through circles; give them their blended colour so they can be baked.
function markCheeks(kid) {
  const skin = new THREE.Color(kid.look.skin);
  kid.root.traverse((o) => {
    if (o.isMesh && o !== kid.blob && o.material.isMeshBasicMaterial && o.material.transparent) {
      o.userData.bakeColor = skin.clone().lerp(o.material.color, o.material.opacity * 0.8);
    }
  });
}

// Merge a live kid's meshes per moving part, so Kid.update still animates it for far fewer draw calls.
export function bakeLiveKid(kid, keep = []) {
  markCheeks(kid);
  const tails = kid.tails.map((t) => t.pivot);
  const parts = [...kid.legs, ...kid.arms, ...kid.eyes, ...tails];
  bakeVC(kid.body, [kid.head, kid.carryAnchor, kid.torso, ...parts, ...keep]);
  bakeVC(kid.head, [...kid.eyes, ...tails, ...keep]);
  for (const p of parts) bakeVC(p, keep);
  return kid;
}

// ------------------------------------------------------------------ game-time timers
// Promises that resolve on the game clock (so they follow the frame rate and a test speed-up).
export function makeClock() {
  let list = [];
  return {
    sleep(s) {
      return new Promise((r) => list.push({ t: 0, d: Math.max(0, s), r }));
    },
    // fn(k) runs every frame with k going 0..1 over s seconds.
    tween(s, fn, ease = (k) => k) {
      fn(0);
      return new Promise((r) => list.push({ t: 0, d: Math.max(1e-4, s), r, fn, ease }));
    },
    update(dt) {
      if (!list.length) return;
      const done = [];
      for (const w of list) {
        w.t += dt;
        const k = Math.min(1, w.t / w.d);
        if (w.fn) w.fn(w.ease(k));
        if (k >= 1) done.push(w);
      }
      if (done.length) {
        list = list.filter((w) => !done.includes(w));
        for (const w of done) w.r();
      }
    },
    clear() {
      list = [];
    },
  };
}

// ------------------------------------------------------------------ garden scatter
const LEAF = ['#6dbb58', '#5aa84f', '#84c95f', '#77c05a'];
const BLOSSOM = ['#f6a5c0', '#f9bfd2', '#f28db0'];
const PETALS = ['#ff8fb1', '#ffffff', '#ffd75e', '#c7a6ff', '#ff6b6b', '#ffb36b'];

// Trees, bushes, flowers and grass tufts, all instanced. free(x, z) -> true where things may grow.
export function garden(group, { seed = 3, bounds, free, trees = 30, bushes = 30, flowers = 300, tufts = 300 }) {
  const r = rng(seed);
  const [x0, x1, z0, z1] = bounds;
  const rp = () => [x0 + r() * (x1 - x0), z0 + r() * (z1 - z0)];
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const e = new THREE.Euler();
  const add = (im, cast = true) => {
    im.castShadow = cast;
    im.receiveShadow = true;
    group.add(im);
    return im;
  };
  const T = [];
  for (let i = 0; i < trees * 40 && T.length < trees; i++) {
    const [x, z] = rp();
    if (!free(x, z, 'tree') || T.some((t) => Math.hypot(t.x - x, t.z - z) < 2.4)) continue;
    const roll = r();
    T.push({ x, z, s: 0.85 + r() * 0.6, kind: roll < 0.5 ? 'round' : roll < 0.78 ? 'pine' : 'blossom', rot: r() * 6.28 });
  }
  if (T.length) {
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.3, 7);
    trunkGeo.translate(0, 0.65, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, mat('#8b5e3c', { rough: 0.9 }), T.length);
    const balls = [];
    const cones = [];
    T.forEach((t, i) => {
      trunks.setMatrixAt(i, m4.compose(v.set(t.x, 0, t.z), q.setFromEuler(e.set(0, t.rot, 0)), s.setScalar(t.s)));
      if (t.kind === 'pine') {
        for (let k = 0; k < 3; k++) cones.push({ x: t.x, y: (1.3 + k * 0.62) * t.s, z: t.z, sc: (0.95 - k * 0.22) * t.s, col: k === 2 ? '#4d9a5f' : '#3f8a55' });
      } else {
        const pal = t.kind === 'blossom' ? BLOSSOM : LEAF;
        const c = pal[Math.floor(r() * pal.length)];
        balls.push({ x: t.x, y: 1.85 * t.s, z: t.z, sc: 0.92 * t.s, c });
        balls.push({ x: t.x + 0.5 * t.s, y: 1.55 * t.s, z: t.z + 0.25 * t.s, sc: 0.6 * t.s, c });
        balls.push({ x: t.x - 0.45 * t.s, y: 1.6 * t.s, z: t.z - 0.2 * t.s, sc: 0.62 * t.s, c });
      }
    });
    add(trunks);
    if (balls.length) {
      const leaf = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), mat('#ffffff', { rough: 0.85, flat: true }), balls.length);
      balls.forEach((b, i) => {
        leaf.setMatrixAt(i, m4.compose(v.set(b.x, b.y, b.z), q.setFromEuler(e.set(r(), r(), r())), s.set(b.sc, b.sc * 0.92, b.sc)));
        leaf.setColorAt(i, new THREE.Color(b.c));
      });
      add(leaf);
    }
    if (cones.length) {
      const pine = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1.4, 8), mat('#ffffff', { rough: 0.85, flat: true }), cones.length);
      cones.forEach((c, i) => {
        pine.setMatrixAt(i, m4.compose(v.set(c.x, c.y, c.z), q.identity(), s.setScalar(c.sc)));
        pine.setColorAt(i, new THREE.Color(c.col));
      });
      add(pine);
    }
  }
  const B = [];
  for (let i = 0; i < bushes * 40 && B.length < bushes; i++) {
    const [x, z] = rp();
    if (free(x, z, 'bush')) B.push({ x, z, s: 0.35 + r() * 0.3 });
  }
  if (B.length) {
    const bush = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat('#ffffff', { rough: 0.85, flat: true }), B.length * 2);
    B.forEach((b, i) => {
      const c = new THREE.Color(LEAF[i % LEAF.length]);
      bush.setMatrixAt(i * 2, m4.compose(v.set(b.x, b.s * 0.55, b.z), q.identity(), s.set(b.s, b.s * 0.8, b.s)));
      bush.setColorAt(i * 2, c);
      bush.setMatrixAt(i * 2 + 1, m4.compose(v.set(b.x + b.s * 0.7, b.s * 0.4, b.z + b.s * 0.2), q.identity(), s.set(b.s * 0.7, b.s * 0.6, b.s * 0.7)));
      bush.setColorAt(i * 2 + 1, c);
    });
    add(bush);
  }
  const F = [];
  for (let i = 0; i < flowers * 12 && F.length < flowers; i++) {
    const [x, z] = rp();
    if (!free(x, z, 'flower')) continue;
    const cluster = Math.sin(x * 0.35) * Math.cos(z * 0.4) + Math.sin(x * 0.11 + z * 0.17);
    if (cluster < 0.2 && r() > 0.25) continue;
    F.push({ x, z, c: PETALS[Math.floor(r() * PETALS.length)], h: 0.14 + r() * 0.14 });
  }
  flowerPatch(group, F);
  const G = [];
  for (let i = 0; i < tufts * 8 && G.length < tufts; i++) {
    const [x, z] = rp();
    if (free(x, z, 'tuft')) G.push([x, z]);
  }
  if (G.length) {
    const tuftGeo = new THREE.ConeGeometry(0.05, 0.32, 4);
    tuftGeo.translate(0, 0.16, 0);
    const tuft = new THREE.InstancedMesh(tuftGeo, mat('#ffffff', { rough: 1 }), G.length * 3);
    let n = 0;
    for (const [x, z] of G) {
      for (let k = 0; k < 3; k++) {
        tuft.setMatrixAt(n, m4.compose(v.set(x + (r() - 0.5) * 0.18, 0, z + (r() - 0.5) * 0.18), q.setFromEuler(e.set((r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5)), s.setScalar(0.7 + r() * 0.6)));
        tuft.setColorAt(n++, new THREE.Color(r() < 0.5 ? '#6fb04f' : '#88c560'));
      }
    }
    add(tuft, false);
  }
  return T;
}

// Instanced little flowers: [{ x, z, c, h, y? }]
export function flowerPatch(group, F) {
  if (!F.length) return;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const heads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.08, 0), mat('#ffffff', { rough: 0.6, flat: true }), F.length);
  const stemGeo = new THREE.CylinderGeometry(0.012, 0.015, 1, 4);
  stemGeo.translate(0, 0.5, 0);
  const stems = new THREE.InstancedMesh(stemGeo, mat('#4f9a45'), F.length);
  F.forEach((f, i) => {
    const y = f.y || 0;
    heads.setMatrixAt(i, m4.compose(v.set(f.x, y + f.h, f.z), q.identity(), s.set(1, 0.75, 1)));
    heads.setColorAt(i, new THREE.Color(f.c));
    stems.setMatrixAt(i, m4.compose(v.set(f.x, y, f.z), q.identity(), s.set(1, f.h, 1)));
  });
  heads.castShadow = stems.castShadow = false;
  heads.receiveShadow = true;
  group.add(heads, stems);
}

// Puffy clouds far away.
export function clouds(group, { seed = 5, radius = 90, count = 10, center = [0, 0] } = {}) {
  const r = rng(seed);
  const parts = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + r() * 0.4;
    const d = radius * (0.5 + r() * 0.5);
    const cx = center[0] + Math.cos(a) * d;
    const cz = center[1] + Math.sin(a) * d;
    const cy = 18 + r() * 14;
    const k = 4 + Math.floor(r() * 3);
    for (let j = 0; j < k; j++) parts.push([cx + (j - k / 2) * 3 + r() * 2, cy + r() * 1.6, cz + (r() - 0.5) * 3, 2 + r() * 2.4]);
  }
  const cm = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.3, flatShading: true });
  const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), cm, parts.length);
  const m4 = new THREE.Matrix4();
  parts.forEach(([x, y, z, sc], i) => im.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sc * 1.2, sc * 0.75, sc))));
  group.add(im);
}

// ------------------------------------------------------------------ HUD layer
export const BASE_CSS = `
.b2-layer { position: absolute; inset: 0; pointer-events: none; font-family: var(--font, 'Fredoka', system-ui, sans-serif); color: #3b2b3f; }
.b2-say { position: absolute; left: 50%; bottom: max(54px, calc(env(safe-area-inset-bottom) + 50px)); transform: translateX(-50%); background: rgba(255,250,244,.94); border-radius: 999px; padding: 6px 16px; font-weight: 600; font-size: .95rem; box-shadow: 0 6px 18px rgba(60,30,40,.14); white-space: nowrap; transition: opacity .2s; }
.b2-say:empty { opacity: 0; }
.b2-say i { font-style: normal; display: inline-block; width: .7em; height: .7em; border-radius: 50%; margin-right: 7px; vertical-align: 0; box-shadow: 0 0 0 2px #fff; }
body.touch .b2-say { left: max(14px, env(safe-area-inset-left)); transform: none; bottom: max(14px, env(safe-area-inset-bottom)); max-width: calc(100vw - 150px); overflow: hidden; text-overflow: ellipsis; font-size: .85rem; }
.b2-float { position: absolute; transform: translate(-50%, -100%); font-weight: 700; font-size: clamp(.95rem, 2.4vw, 1.25rem); color: #fff; background: var(--c, #ef5b6f); padding: 3px 14px 4px; border-radius: 999px; box-shadow: 0 0 0 3px #fff, 0 8px 18px rgba(60,30,40,.25); white-space: nowrap; opacity: 0; }
.b2-float.num { width: 2.3em; height: 2.3em; padding: 0; display: grid; place-items: center; font-size: clamp(1.4rem, 3.6vw, 2rem); background: #fff; color: var(--c, #ef5b6f); box-shadow: 0 0 0 4px var(--c, #ef5b6f), 0 10px 22px rgba(60,30,40,.28); }
body.touch .b2-float { font-size: .85rem; padding: 2px 10px 3px; }
body.touch .b2-float.num { font-size: 1.15rem; padding: 0; }
#arena .a-btn.b2-hot { animation: b2-hot .5s ease-in-out infinite alternate; }
@keyframes b2-hot { from { box-shadow: 0 0 0 0 rgba(255,209,102,.95), 0 6px 18px rgba(60,30,40,.2); } to { box-shadow: 0 0 0 12px rgba(255,209,102,0), 0 6px 18px rgba(60,30,40,.2); transform: scale(1.07); } }
`;

// A layer inside the arena HUD. remove() on dispose.
export function overlay(css, html) {
  const style = document.createElement('style');
  style.textContent = BASE_CSS + css;
  document.head.appendChild(style);
  const el = document.createElement('div');
  el.className = 'b2-layer';
  el.innerHTML = html;
  const host = document.getElementById('arena') || document.body;
  // First child, so the result card and the host's messages stay on top
  host.insertBefore(el, host.firstChild);
  return {
    el,
    $: (s) => el.querySelector(s),
    remove() {
      el.remove();
      style.remove();
    },
  };
}

// Floating words over 3D positions. Call update(dt, camera) every frame.
export function floaters(layer, n = 4) {
  const items = [];
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'b2-float';
    layer.appendChild(el);
    items.push({ el, t: 9, pos: new THREE.Vector3(), dur: 1.2 });
  }
  let next = 0;
  const v = new THREE.Vector3();
  return {
    show(text, color, pos, dur = 1.3, kind = '') {
      const q = items[next++ % items.length];
      q.el.textContent = text;
      q.el.className = `b2-float ${kind}`;
      q.el.style.setProperty('--c', color || '#ef5b6f');
      q.pos.copy(pos);
      q.t = 0;
      q.dur = dur;
    },
    update(dt, camera) {
      for (const q of items) {
        q.t += dt;
        const k = q.t / q.dur;
        if (k > 1) {
          q.el.style.opacity = '0';
          continue;
        }
        v.copy(q.pos);
        v.y += k * 0.6;
        v.project(camera);
        q.el.style.left = `${((v.x + 1) / 2) * 100}%`;
        q.el.style.top = `${Math.max(14, ((1 - v.y) / 2) * 100)}%`;
        const pop = Math.min(1, q.t * 8);
        q.el.style.opacity = String(Math.min(pop, (1 - k) * 3));
        q.el.style.transform = `translate(-50%, -100%) scale(${0.6 + 0.4 * pop})`;
      }
    },
  };
}

export function hotButton(id, on) {
  document.querySelector(`#arena .a-btn[data-b="${id}"]`)?.classList.toggle('b2-hot', !!on);
}

// ------------------------------------------------------------------ sounds
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const live = (sound) => sound?.ctx && !sound.muted;

function noise(sound, { freq = 900, q = 1.2, gain = 0.1, dur = 0.08, type = 'bandpass', when = 0 } = {}) {
  if (!live(sound) || !sound.noise) return;
  const ctx = sound.ctx;
  const src = ctx.createBufferSource();
  src.buffer = sound.noise;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  const t = ctx.currentTime + when;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.02, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(sound.sfx);
  src.start(t, Math.random() * 0.3, dur + 0.05);
}

export const sfx = {
  // A little hop from square to square, rising with each step.
  hop(sound, i = 0) {
    if (!live(sound)) return;
    const t = sound.ctx.currentTime;
    sound.tone(NOTE(72 + ((i * 2) % 14)), t, 0.12, { gain: 0.05, type: 'triangle' });
    sound.tone(160, t, 0.08, { gain: 0.06, slideTo: 90 });
  },
  // Die clack on the board, louder for a harder bounce.
  clack(sound, k = 1) {
    if (!live(sound)) return;
    const g = Math.min(0.14, 0.03 + k * 0.03);
    sound.tone(420 + Math.random() * 160, sound.ctx.currentTime, 0.05, { gain: g * 0.6, type: 'square', slideTo: 220 });
    noise(sound, { freq: 2400, q: 1.5, gain: g, dur: 0.05 });
  },
  bonk(sound) {
    if (!live(sound)) return;
    const t = sound.ctx.currentTime;
    sound.tone(520, t, 0.12, { gain: 0.08, type: 'square', slideTo: 900 });
    sound.tone(1040, t + 0.03, 0.1, { gain: 0.04 });
  },
  rung(sound, i, down = false) {
    if (!live(sound)) return;
    const scale = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
    const n = 67 + scale[Math.min(scale.length - 1, i)] * (down ? -0.5 : 1);
    sound.tone(NOTE(n), sound.ctx.currentTime, 0.14, { gain: 0.05, type: 'triangle' });
  },
  // Wheee: up, then a long wobbly slide down.
  whee(sound, dur = 1.2) {
    if (!live(sound)) return;
    const ctx = sound.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(1250, t + 0.22);
    o.frequency.exponentialRampToValueAtTime(330, t + dur);
    lfo.frequency.value = 9;
    depth.gain.value = 28;
    lfo.connect(depth).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.05);
    g.gain.setValueAtTime(0.07, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(sound.sfx);
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.05);
    lfo.stop(t + dur + 0.05);
    noise(sound, { freq: 1800, q: 0.6, gain: 0.03, dur: dur * 0.8, when: 0.15 });
  },
  hiss(sound) {
    noise(sound, { freq: 5200, q: 0.8, gain: 0.05, dur: 0.35, type: 'highpass' });
  },
  ladder(sound) {
    if (!live(sound)) return;
    const t = sound.ctx.currentTime;
    [72, 76, 79, 84, 88].forEach((n, i) => sound.tone(NOTE(n), t + i * 0.07, 0.4, { gain: 0.06 }));
  },
  flip(sound) {
    if (!live(sound)) return;
    sound.tone(NOTE(81 + Math.random() * 3), sound.ctx.currentTime, 0.08, { gain: 0.04, type: 'triangle', slideTo: NOTE(88) });
    noise(sound, { freq: 3200, q: 0.9, gain: 0.04, dur: 0.07 });
  },
  match(sound, k = 0) {
    if (!live(sound)) return;
    const t = sound.ctx.currentTime;
    [76, 80, 83, 88].forEach((n, i) => sound.tone(NOTE(n + k), t + i * 0.06, 0.45, { gain: 0.06 }));
    sound.tone(NOTE(100 + k), t + 0.26, 0.6, { gain: 0.025 });
  },
  miss(sound) {
    if (!live(sound)) return;
    const t = sound.ctx.currentTime;
    sound.tone(NOTE(67), t, 0.18, { gain: 0.05, type: 'triangle' });
    sound.tone(NOTE(62), t + 0.13, 0.28, { gain: 0.05, type: 'triangle' });
  },
  cheer(sound, gain = 0.05, dur = 1.2) {
    noise(sound, { freq: 1100, q: 0.6, gain, dur });
    noise(sound, { freq: 2300, q: 0.9, gain: gain * 0.6, dur: dur * 0.8, when: 0.1 });
  },
};
