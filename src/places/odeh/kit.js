// Building blocks for Odeh's hill and Roji's family home: shapes, a colour palette, vertex-colour
// merging (few draw calls), painted canvas labels and the speech bubbles the family talks in.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat as baseMat, umat, mesh, canvasTexture, roundRect, FONT, clamp, damp, dampAngle, lerp, easeOutBack, easeOutCubic, easeInOut, heartShape, rng } from '../../util.js';

export { THREE, RoundedBoxGeometry, mergeGeometries, umat, mesh, canvasTexture, roundRect, FONT, clamp, damp, dampAngle, lerp, easeOutBack, easeOutCubic, easeInOut, heartShape, rng };

export const P = Math.PI;

// Desert and Levantine house palette
export const C = {
  sand: '#f0d39b',
  sandLight: '#f7e3b8',
  sandDeep: '#e2b877',
  dune: '#ecc98a',
  stone: '#e8cf9f',
  stoneDark: '#d3b07a',
  stoneEdge: '#f3e2bf',
  lime: '#f4e7cf', // limestone house walls
  limeDark: '#e3cfae',
  mortar: '#d8c09a',
  wood: '#a8724a',
  woodDark: '#7d5234',
  woodLight: '#c99a6b',
  blue: '#2f86c8',
  blueDark: '#1f5f99',
  teal: '#21a99a',
  turq: '#4fc3c8',
  terra: '#d9774f',
  terraDark: '#b85d3c',
  palmTrunk: '#9a6a43',
  palmTrunkDark: '#7f5435',
  palmLeaf: '#5fae5a',
  palmLeafDark: '#3f8f4e',
  olive: '#8a7a5a',
  oliveLeaf: '#93a86a',
  cactus: '#5aa35c',
  aloe: '#7cbf8a',
  cream: '#fff6e8',
  white: '#fffaf4',
  red: '#d9475a',
  rose: '#ef5b6f',
  pink: '#ff8fb1',
  sun: '#ffd166',
  gold: '#e7b54a',
  brass: '#d9a441',
  copper: '#c8743f',
  ink: '#3b2b3f',
  goat: '#f4ede2',
  camel: '#d8a96a',
  camelDark: '#b98a4f',
  leafGreen: '#6fb85f',
  lemon: '#ffe14d',
  jasmine: '#ffffff',
  charcoal: '#3a302c',
};

// Shared materials with roughness in three steps, so more meshes merge into one draw call
export function mat(color, o = {}) {
  if (o.emissive || o.map || o.transparent || o.side) return baseMat(color, o);
  const r = o.rough === undefined ? 0.78 : o.rough;
  return baseMat(color, { ...o, rough: r < 0.45 ? 0.3 : r < 0.72 ? 0.6 : 0.85 });
}
const M = (c, o) => (typeof c === 'string' ? mat(c, o) : c);
// Small things do not cast shadows (fewer shadow draw calls)
const mk = (geo, c, o, size) => mesh(geo, M(c, o), { cast: size >= 0.3 });

export const box = (w, h, d, c, o) => mk(new THREE.BoxGeometry(w, h, d), c, o, Math.max(w, h, d));
export const rbox = (w, h, d, c, r = 0.06, o) => mk(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)), c, o, Math.max(w, h, d));
export const cyl = (rt, rb, h, c, seg = 14, o) => mk(new THREE.CylinderGeometry(rt, rb, h, seg), c, o, Math.max(rb * 2, h));
export const sph = (r, c, ws = 14, hs = 10, o) => mk(new THREE.SphereGeometry(r, ws, hs), c, o, r * 2);
export const cone = (r, h, c, seg = 12, o) => mk(new THREE.ConeGeometry(r, h, seg), c, o, Math.max(r * 2, h));
export const tor = (r, t, c, rs = 8, ts = 20, arc = P * 2, o) => mk(new THREE.TorusGeometry(r, t, rs, ts, arc), c, o, r * 2);
export const caps = (r, len, c, o) => mk(new THREE.CapsuleGeometry(r, len, 3, 8), c, o, len + r * 2);

// Scale an object, returns it
export const sc = (o, x, y = x, z = x) => (o.scale.set(x, y, z), o);

// Position (and optionally rotate) an object, returns it
export function at(o, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  o.position.set(x, y, z);
  if (rx || ry || rz) o.rotation.set(rx, ry, rz);
  return o;
}

// A canvas-textured plane (a label, a photo, a drawing). Opaque, so it bakes with the scene.
export function panel(w, h, pw, ph, draw, o = {}) {
  const tex = canvasTexture(pw, ph, draw);
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: o.rough ?? 0.85, transparent: !!o.transparent, side: o.side ?? THREE.FrontSide, emissive: o.emissive ? new THREE.Color(o.emissive) : new THREE.Color(0), emissiveMap: o.emissive ? tex : null, emissiveIntensity: o.ei ?? 0 });
  if (o.transparent) m.depthWrite = false;
  const me = mesh(new THREE.PlaneGeometry(w, h), m, { cast: false });
  return me;
}

// Merge every plain-coloured, non-glowing static mesh under `group` into a few vertex-coloured meshes
// (one per roughness and shadow setting). skip: objects to leave alone (they and their children).
const vcMats = new Map();
export function vcMat(rough = 0.6, metal = 0) {
  const k = `${rough}|${metal}`;
  if (!vcMats.has(k)) vcMats.set(k, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: metal }));
  return vcMats.get(k);
}
export function colorBake(group, skip = [], { single = false } = {}) {
  group.updateMatrixWorld(true);
  const skipSet = new Set();
  for (const d of skip) d.traverse((o) => skipSet.add(o));
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const buckets = new Map();
  const victims = [];
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o === group || skipSet.has(o) || o.children.length) return;
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
    if (rel.determinant() < 0) flipWinding(g);
    paint(g, m.color);
    const rough = single ? 0.7 : m.roughness < 0.45 ? 0.3 : m.roughness < 0.72 ? 0.6 : 0.85;
    const metal = !single && m.metalness > 0.3 ? 0.5 : 0;
    const key = single ? 'one' : `${rough}|${metal}|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}`;
    if (!buckets.has(key)) buckets.set(key, { rough, metal, cast: single ? true : o.castShadow, receive: single ? true : o.receiveShadow, list: [] });
    buckets.get(key).list.push(g);
    victims.push(o);
  });
  for (const o of victims) o.removeFromParent();
  const out = [];
  for (const b of buckets.values()) {
    const geo = mergeGeometries(b.list, false);
    if (!geo) continue;
    const me = new THREE.Mesh(geo, vcMat(b.rough, b.metal));
    me.castShadow = b.cast;
    me.receiveShadow = b.receive;
    group.add(me);
    out.push(me);
  }
  return out;
}

function paint(g, color) {
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 3] = color.r;
    a[i * 3 + 1] = color.g;
    a[i * 3 + 2] = color.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
}

function flipWinding(g) {
  for (const a of Object.values(g.attributes)) {
    const s = a.itemSize;
    for (let i = 0; i < a.count; i += 3) {
      for (let k = 0; k < s; k++) {
        const t = a.array[(i + 1) * s + k];
        a.array[(i + 1) * s + k] = a.array[(i + 2) * s + k];
        a.array[(i + 2) * s + k] = t;
      }
    }
  }
}

// A moving part made of many pieces: merge its fixed meshes into one mesh, in place.
export const bakePart = (grp, keep = []) => (colorBake(grp, keep, { single: true }), grp);

// A person built from many small meshes on pivots, drawn as one skinned mesh: every original mesh
// becomes a bone, so the Kid's own animation (walk, emotes, blinks) still moves its vertices.
const kidMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62 });
export function skinKid(kid) {
  const root = kid.root;
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const rel = new THREE.Matrix4();
  const skin = new THREE.Color(kid.look.skin);
  const found = [];
  root.traverse((o) => {
    if (o.isMesh && !o.isSkinnedMesh && o !== kid.blob && !Array.isArray(o.material)) found.push(o);
  });
  const bones = [];
  const list = [];
  const col = new THREE.Color();
  for (const o of found) {
    const m = o.material;
    // Blush circles become solid colour so they merge
    if (m.transparent) col.copy(skin).lerp(m.color, m.opacity ?? 1);
    else col.copy(m.color);
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.morphAttributes = {};
    g.clearGroups();
    rel.multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(rel);
    if (rel.determinant() < 0) flipWinding(g);
    // Double-sided parts (hair caps, the beard) get their back faces too
    if (m.side === THREE.DoubleSide) {
      const back = g.clone();
      flipWinding(back);
      const nn = back.attributes.normal;
      for (let i = 0; i < nn.count; i++) nn.setXYZ(i, -nn.getX(i), -nn.getY(i), -nn.getZ(i));
      list.push(withBone(back, bones.length, col));
    }
    list.push(withBone(g, bones.length, col));
    bones.push(o);
    o.visible = false;
  }
  const sk = new THREE.SkinnedMesh(mergeGeometries(list, false), kidMat);
  sk.castShadow = true;
  sk.receiveShadow = true;
  root.add(sk);
  sk.bind(new THREE.Skeleton(bones));
  sk.computeBoundingSphere();
  sk.boundingSphere.radius += 0.6;
  kid.skinned = sk;
  return kid;
}

function withBone(g, bi, color) {
  const n = g.attributes.position.count;
  const si = new Uint16Array(n * 4);
  const sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    si[i * 4] = bi;
    sw[i * 4] = 1;
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  paint(g, color);
  return g;
}

// ---------------------------------------------------------------- speech bubbles
// One bubble per speaker, drawn on a canvas and shown as a sprite above their head.
// who: { bubbleAt(out) -> Vector3 in the parent group's local frame } (a Walker or an actor adapter).
export class Talk {
  constructor(parent) {
    this.parent = parent;
    this.items = new Map();
  }

  say(who, text, ms = 2600, accent = '#ef5b6f') {
    if (!who || !text) return;
    this.hush(who);
    const lines = wrap(text, 22);
    const W = 512;
    const LH = 50;
    const H = 40 + lines.length * LH + 30;
    const tex = canvasTexture(W, H, (ctx, w, h) => {
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.clearRect(0, 0, w, h);
      const bh = h - 30;
      ctx.shadowColor = 'rgba(60,30,40,0.22)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#fffaf4';
      roundRect(ctx, 10, 8, w - 20, bh - 10, 34);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.beginPath();
      ctx.moveTo(w / 2 - 20, bh - 4);
      ctx.lineTo(w / 2, h - 4);
      ctx.lineTo(w / 2 + 20, bh - 4);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = accent;
      roundRect(ctx, 10, 8, w - 20, bh - 10, 34);
      ctx.stroke();
      ctx.fillStyle = '#3b2b3f';
      ctx.font = `600 40px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      lines.forEach((l, i) => ctx.fillText(l, w / 2, 8 + 30 + i * LH + LH / 2 - 6));
    });
    tex.minFilter = THREE.LinearFilter;
    // Same size on screen wherever the camera is (like the town's other speech bubbles)
    const sm = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false, sizeAttenuation: false });
    const s = new THREE.Sprite(sm);
    s.renderOrder = 1000;
    s.scale.set(0.001, 0.001, 1);
    s.center.set(0.5, 0);
    this.parent.add(s);
    this.items.set(who, { s, t: 0, life: ms / 1000, who });
  }

  hush(who) {
    const it = this.items.get(who);
    if (!it) return;
    it.s.removeFromParent();
    it.s.material.map.dispose();
    it.s.material.dispose();
    this.items.delete(who);
  }

  clear() {
    for (const who of [...this.items.keys()]) this.hush(who);
  }

  update(dt) {
    for (const it of [...this.items.values()]) {
      it.t += dt;
      const p = it.who.bubbleAt?.(it.s.position);
      if (!p || it.t > it.life) {
        this.hush(it.who);
        continue;
      }
      const a = Math.min(1, it.t * 6, (it.life - it.t) * 4);
      it.s.material.opacity = a;
      const pop = it.t < 0.25 ? easeOutBack(it.t / 0.25) : 1;
      const img = it.s.material.map.image;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
      const f = Math.min(0.46, Math.max(0.34, (vh / 800) * 0.42));
      const sy = ((2 * img.height * f) / (vh * P11)) * (0.6 + 0.4 * pop);
      it.s.scale.set((sy * img.width) / img.height, sy, 1);
    }
  }
}

function wrap(text, n) {
  const words = String(text).split(' ');
  const out = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > n && cur) {
      out.push(cur);
      cur = w;
    } else cur = (cur + ' ' + w).trim();
  }
  if (cur) out.push(cur);
  return out.slice(0, 4);
}

const P11 = 1 / Math.tan((40 / 2) * (Math.PI / 180)); // the game camera's vertical field of view

// Pick from a list without repeating the last pick of the same key
const lastPick = new Map();
export function pick(key, list) {
  if (!list?.length) return '';
  let i = Math.floor(Math.random() * list.length);
  if (list.length > 1 && lastPick.get(key) === i) i = (i + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
  lastPick.set(key, i);
  return list[i];
}

// A soft round glow sprite texture (lantern halos, the fire)
let glowTex = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  glowTex = canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,236,190,1)');
    g.addColorStop(0.35, 'rgba(255,200,120,0.55)');
    g.addColorStop(1, 'rgba(255,180,90,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  return glowTex;
}

// A short sound made from tones (guarded: the audio context exists only after the first click)
export function chirp(sound, notes, { type = 'triangle', gain = 0.12 } = {}) {
  const ctx = sound?.ctx;
  if (!ctx || !sound.tone) return;
  const t0 = ctx.currentTime + 0.01;
  for (const [f, at_, dur, slide] of notes) {
    try {
      sound.tone(f, t0 + at_, dur, { type, gain, slideTo: slide || null });
    } catch {
      /* audio not ready */
    }
  }
}

export const SOUNDS = {
  knock: (s) => chirp(s, [[180, 0, 0.08, 120], [180, 0.22, 0.08, 120], [180, 0.44, 0.08, 120]], { type: 'square', gain: 0.08 }),
  giggle: (s) => chirp(s, [[880, 0, 0.09, 1040], [990, 0.12, 0.09, 1180], [1100, 0.24, 0.12, 1320]], { type: 'sine', gain: 0.07 }),
  pour: (s) => chirp(s, [[520, 0, 0.5, 340]], { type: 'sine', gain: 0.04 }),
  camel: (s) => chirp(s, [[110, 0, 0.45, 80], [95, 0.5, 0.5, 70]], { type: 'sawtooth', gain: 0.05 }),
  goat: (s) => chirp(s, [[420, 0, 0.12, 380], [430, 0.13, 0.12, 390], [410, 0.26, 0.2, 360]], { type: 'sawtooth', gain: 0.045 }),
  clap: (s) => chirp(s, [[1400, 0, 0.04], [1300, 0.18, 0.04], [1450, 0.36, 0.04], [1350, 0.54, 0.04]], { type: 'square', gain: 0.03 }),
  splash: (s) => chirp(s, [[900, 0, 0.18, 300], [700, 0.08, 0.2, 250]], { type: 'sine', gain: 0.05 }),
  shutter: (s) => chirp(s, [[2200, 0, 0.03], [1600, 0.06, 0.05]], { type: 'square', gain: 0.04 }),
  boing: (s) => chirp(s, [[300, 0, 0.18, 620]], { type: 'sine', gain: 0.07 }),
  sizzle: (s) => chirp(s, [[2400, 0, 0.3, 1800]], { type: 'sawtooth', gain: 0.012 }),
};
