import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { kit, makeAtlas, heartPath, fitText, starGeo, heartGeo } from '../../places/school/kit.js';
import { canvasTexture, roundRect, FONT } from '../../util.js';

// Building blocks for the Ghost Train: the palette, merging a model into a few vertex-coloured
// meshes, wallpapers and floors painted on canvases, and small sounds and a tune made with Web Audio.

export { THREE, kit, makeAtlas, heartPath, fitText, starGeo, heartGeo, canvasTexture, roundRect, FONT, mergeGeometries };

export const G = {
  plum: '#3a2a55',
  night: '#2b2140',
  violet: '#8a6fd1',
  lilac: '#c7a6ff',
  lav: '#e4d6ff',
  pink: '#ff9eb5',
  rose: '#ef5b6f',
  blush: '#ffd1dc',
  cream: '#fff4e3',
  paper: '#fffaf4',
  sun: '#ffd166',
  gold: '#f4c24f',
  mint: '#7fd8bf',
  teal: '#3fbf9f',
  sky: '#8fd3ff',
  pumpkin: '#ff9a3c',
  wood: '#c98f5f',
  woodDark: '#8a5a3c',
  ink: '#3b2b3f',
  leaf: '#4e9a5a',
  white: '#ffffff',
};

const KEEP = ['position', 'normal'];
const rel = new THREE.Matrix4();

// One geometry with vertex colours from every mesh under `group` (the group itself is left alone).
export function toGeo(group) {
  group.updateMatrixWorld(true);
  const inv = group.matrixWorld.clone().invert();
  const list = [];
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const n of Object.keys(g.attributes)) if (!KEEP.includes(n)) g.deleteAttribute(n);
    g.clearGroups();
    g.morphAttributes = {};
    rel.multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(rel);
    const c = new THREE.Color(o.userData.vc || o.material.color || '#ffffff');
    const n = g.attributes.position.count;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    list.push(g);
  });
  const out = mergeGeometries(list, false);
  for (const g of list) g.dispose();
  return out;
}

const vcCache = new Map();
export function vcMat(rough = 0.75, opts = {}) {
  const key = rough + JSON.stringify(opts);
  if (!vcCache.has(key)) vcCache.set(key, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, ...opts }));
  return vcCache.get(key);
}
const glowVC = () => new THREE.MeshBasicMaterial({ vertexColors: true });

// Merge the static meshes under `root` into a few meshes: plain colours into one vertex-coloured
// mesh (per roughness), unlit glows (MeshBasicMaterial) into one, and meshes sharing a textured
// material into one each. keep: objects whose subtrees stay as they are (animated parts).
export function bake(root, keep = [], { cast = false } = {}) {
  root.updateMatrixWorld(true);
  const skip = new Set();
  for (const k of keep) k?.traverse((o) => skip.add(o));
  const inv = root.matrixWorld.clone().invert();
  const buckets = new Map();
  const drop = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || skip.has(o) || !o.visible || o === root) return;
    if (o.children.some((c) => skip.has(c) || !c.isMesh)) return;
    const m = o.material;
    if (Array.isArray(m) || m.vertexColors) return;
    let key;
    let kind;
    if (m.map) {
      key = `tex|${m.uuid}`;
      kind = 'tex';
    } else if (m.transparent) return;
    else if (m.isMeshBasicMaterial) {
      key = 'glow';
      kind = 'glow';
    } else {
      const r = Math.round((m.roughness ?? 0.8) * 4) / 4;
      const metal = (m.metalness ?? 0) > 0.3 ? 0.4 : 0;
      key = `std|${r}|${metal}`;
      kind = 'std';
    }
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    const names = kind === 'tex' ? ['position', 'normal', 'uv'] : KEEP;
    for (const n of Object.keys(g.attributes)) if (!names.includes(n)) g.deleteAttribute(n);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (kind === 'tex' && !g.attributes.uv) return;
    g.clearGroups();
    g.morphAttributes = {};
    rel.multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(rel);
    if (rel.determinant() < 0) flipWinding(g);
    if (kind !== 'tex') {
      const c = new THREE.Color(o.userData.vc || m.color);
      if (kind === 'std' && m.emissive && m.emissiveIntensity) {
        c.r = Math.min(1, c.r + m.emissive.r * m.emissiveIntensity * 0.5);
        c.g = Math.min(1, c.g + m.emissive.g * m.emissiveIntensity * 0.5);
        c.b = Math.min(1, c.b + m.emissive.b * m.emissiveIntensity * 0.5);
      }
      const n = g.attributes.position.count;
      const a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    }
    if (!buckets.has(key)) buckets.set(key, { kind, m, list: [] });
    buckets.get(key).list.push(g);
    drop.push(o);
  });
  for (const o of drop) o.removeFromParent();
  const out = [];
  for (const [key, b] of buckets) {
    const g = mergeGeometries(b.list, false);
    for (const x of b.list) x.dispose();
    if (!g) continue;
    let material = b.m;
    if (b.kind === 'glow') material = glowVC();
    else if (b.kind === 'std') {
      const [, r, metal] = key.split('|');
      material = vcMat(+r, { metalness: +metal });
    }
    const mesh = new THREE.Mesh(g, material);
    mesh.castShadow = cast && b.kind === 'std';
    mesh.receiveShadow = b.kind !== 'glow';
    root.add(mesh);
    out.push(mesh);
  }
  return out;
}

function flipWinding(g) {
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i += 3) {
    for (const a of [pos, nor, uv]) {
      if (!a) continue;
      const s = a.itemSize;
      for (let c = 0; c < s; c++) {
        const t = a.array[(i + 1) * s + c];
        a.array[(i + 1) * s + c] = a.array[(i + 2) * s + c];
        a.array[(i + 2) * s + c] = t;
      }
    }
  }
}

// A tiling canvas texture; uv on the walls is in metres / `tile`.
export function tileTex(px, draw) {
  const t = canvasTexture(px, px, (c) => draw(c, px));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

// A flat plane w x h metres whose uvs count metres / tile, so every wall shares one texture scale.
export function plane(w, h, material, tile = 2, { u0 = 0, v0 = 0 } = {}) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (u0 + uv.getX(i) * w) / tile, (v0 + uv.getY(i) * h) / tile);
  const m = new THREE.Mesh(g, material);
  m.receiveShadow = true;
  return m;
}

// Wallpapers and floors
export const paint = {
  stripes(base, stripe, dot) {
    return tileTex(256, (c, s) => {
      c.fillStyle = base;
      c.fillRect(0, 0, s, s);
      c.fillStyle = stripe;
      for (let i = 0; i < 4; i++) c.fillRect(i * 64 + 22, 0, 20, s);
      c.fillStyle = dot;
      for (let i = 0; i < 4; i++) {
        drawStar(c, i * 64 + 0, ((i % 2) * 0.5 + 0.25) * s, 9);
        c.fill();
      }
    });
  },
  moons(base, ink) {
    return tileTex(256, (c, s) => {
      c.fillStyle = base;
      c.fillRect(0, 0, s, s);
      c.fillStyle = ink;
      for (const [x, y, r] of [[64, 64, 18], [192, 192, 18]]) {
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = base;
        c.beginPath();
        c.arc(x + 8, y - 5, r * 0.85, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = ink;
      }
      for (const [x, y] of [[192, 64], [64, 192]]) {
        drawStar(c, x, y, 10);
        c.fill();
      }
      c.globalAlpha = 0.5;
      for (const [x, y] of [[20, 128], [128, 20], [236, 128], [128, 236]]) {
        c.beginPath();
        c.arc(x, y, 3, 0, Math.PI * 2);
        c.fill();
      }
    });
  },
  tiles(a, b, line = 'rgba(0,0,0,0.12)') {
    return tileTex(256, (c, s) => {
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
        c.fillStyle = (x + y) % 2 ? a : b;
        c.fillRect(x * 128, y * 128, 128, 128);
      }
      c.strokeStyle = line;
      c.lineWidth = 4;
      c.strokeRect(0, 0, s, s);
      c.beginPath();
      c.moveTo(128, 0);
      c.lineTo(128, s);
      c.moveTo(0, 128);
      c.lineTo(s, 128);
      c.stroke();
    });
  },
  planks(a, b) {
    return tileTex(256, (c, s) => {
      for (let i = 0; i < 4; i++) {
        c.fillStyle = i % 2 ? a : b;
        c.fillRect(0, i * 64, s, 64);
        c.fillStyle = 'rgba(0,0,0,0.12)';
        c.fillRect(0, i * 64, s, 3);
        c.fillRect(((i * 97) % 200) + 20, i * 64, 3, 64);
      }
    });
  },
  grass(a, b) {
    return tileTex(256, (c, s) => {
      c.fillStyle = a;
      c.fillRect(0, 0, s, s);
      const r = rng(5);
      c.fillStyle = b;
      for (let i = 0; i < 160; i++) {
        const x = r() * s;
        const y = r() * s;
        c.fillRect(x, y, 3, 8 + r() * 6);
      }
    });
  },
  // a soft ceiling: a colour with little stars and dots (drawn unlit)
  ceiling(base, dot) {
    return tileTex(256, (c, s) => {
      c.fillStyle = base;
      c.fillRect(0, 0, s, s);
      c.fillStyle = dot;
      const r = rng(17);
      for (let i = 0; i < 9; i++) {
        const x = r() * s;
        const y = r() * s;
        c.globalAlpha = 0.5 + r() * 0.5;
        if (i % 3 === 0) {
          drawStar(c, x, y, 7);
          c.fill();
        } else {
          c.beginPath();
          c.arc(x, y, 2.5, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.globalAlpha = 1;
    });
  },
  sky() {
    return tileTex(256, (c, s) => {
      c.fillStyle = '#2d3270';
      c.fillRect(0, 0, s, s);
      const r = rng(9);
      for (let i = 0; i < 40; i++) {
        c.fillStyle = r() < 0.3 ? '#ffe9a8' : '#ffffff';
        c.globalAlpha = 0.5 + r() * 0.5;
        const x = r() * s;
        const y = r() * s;
        if (r() < 0.15) {
          drawStar(c, x, y, 5 + r() * 4);
          c.fill();
        } else {
          c.beginPath();
          c.arc(x, y, 1.2 + r() * 1.6, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.globalAlpha = 1;
    });
  },
};

export function drawStar(c, x, y, R, r = R * 0.45, n = 5) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 ? r : R;
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    if (i === 0) c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
}

// A cute ghost face drawn on a canvas (for doors, signs and portraits)
export function drawGhost(c, x, y, s, { body = '#ffffff', bow = null, cheeks = '#ffb3c6' } = {}) {
  c.save();
  c.translate(x, y);
  c.fillStyle = body;
  c.beginPath();
  c.moveTo(-s * 0.5, s * 0.45);
  c.lineTo(-s * 0.5, -s * 0.05);
  c.arc(0, -s * 0.05, s * 0.5, Math.PI, 0);
  c.lineTo(s * 0.5, s * 0.45);
  for (let i = 0; i < 4; i++) {
    const x0 = s * 0.5 - (i + 0.5) * (s / 4);
    c.quadraticCurveTo(x0 + s * 0.06, s * 0.6, x0 - s * 0.125, s * 0.45);
  }
  c.closePath();
  c.fill();
  c.fillStyle = '#2b2140';
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.ellipse(sx * s * 0.17, -s * 0.07, s * 0.07, s * 0.1, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#ffffff';
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.arc(sx * s * 0.17 + s * 0.025, -s * 0.11, s * 0.025, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = cheeks;
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.ellipse(sx * s * 0.3, s * 0.06, s * 0.06, s * 0.035, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = '#2b2140';
  c.lineWidth = Math.max(2, s * 0.03);
  c.lineCap = 'round';
  c.beginPath();
  c.arc(0, s * 0.04, s * 0.07, 0.15 * Math.PI, 0.85 * Math.PI);
  c.stroke();
  if (bow) {
    c.fillStyle = bow;
    c.beginPath();
    c.moveTo(s * 0.22, -s * 0.48);
    c.lineTo(s * 0.04, -s * 0.6);
    c.lineTo(s * 0.04, -s * 0.36);
    c.closePath();
    c.moveTo(s * 0.22, -s * 0.48);
    c.lineTo(s * 0.4, -s * 0.6);
    c.lineTo(s * 0.4, -s * 0.36);
    c.closePath();
    c.fill();
  }
  c.restore();
}

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
export const damp = (a, b, r, dt) => a + (b - a) * (1 - Math.exp(-r * dt));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const backOut = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// ------------------------------------------------------------------ sounds
const F = (n) => 440 * Math.pow(2, (n - 69) / 12);

function noise(sound, { freq = 900, q = 1.2, gain = 0.1, dur = 0.08, type = 'bandpass', when = 0 } = {}) {
  const ctx = sound?.ctx;
  if (!ctx || sound.muted || !sound.noise) return;
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

// A wobbly voice: a tone with a little vibrato, made of short slides
function voice(sound, t, notes, { type = 'triangle', gain = 0.05, step = 0.09 } = {}) {
  notes.forEach((n, i) => sound.tone(F(n), t + i * step, step * 1.6, { type, gain, slideTo: F(n + (i % 2 ? -1 : 1)) }));
}

export function sfx(sound) {
  const ok = () => sound?.ctx && !sound.muted;
  const now = () => sound.ctx.currentTime;
  return {
    flash() {
      if (!ok()) return;
      const t = now();
      sound.tone(1300, t, 0.09, { type: 'sine', gain: 0.045, slideTo: 2300 });
      sound.tone(2600, t + 0.03, 0.12, { type: 'triangle', gain: 0.018, slideTo: 3400 });
      noise(sound, { freq: 5200, q: 0.8, gain: 0.025, dur: 0.08 });
    },
    fizz() {
      if (!ok()) return;
      noise(sound, { freq: 700, q: 0.7, gain: 0.04, dur: 0.18, type: 'lowpass' });
      sound.tone(240, now(), 0.16, { type: 'square', gain: 0.012, slideTo: 170 });
    },
    // a happy giggle and a sparkle as a ghost turns into candy
    caught(n = 1) {
      if (!ok()) return;
      const t = now();
      const base = 79 + Math.min(5, n - 1) * 2;
      voice(sound, t, [base, base + 4, base + 2, base + 7], { gain: 0.035, step: 0.055 });
      [0, 4, 7, 12].forEach((d, i) => sound.tone(F(base + 5 + d), t + 0.18 + i * 0.05, 0.3, { type: 'sine', gain: 0.03 }));
      noise(sound, { freq: 3000, q: 1, gain: 0.03, dur: 0.12, when: 0.02 });
    },
    appear() {
      if (!ok()) return;
      const t = now();
      sound.tone(F(72 + Math.floor(Math.random() * 5)), t, 0.42, { type: 'sine', gain: 0.022, slideTo: F(79), attack: 0.08 });
      sound.tone(F(79), t + 0.3, 0.35, { type: 'sine', gain: 0.016, slideTo: F(74) });
    },
    escape() {
      if (!ok()) return;
      voice(sound, now(), [84, 82, 84, 80], { type: 'square', gain: 0.012, step: 0.06 });
    },
    candy() {
      if (!ok()) return;
      sound.tone(F(96 + Math.floor(Math.random() * 3)), now(), 0.12, { type: 'sine', gain: 0.03 });
    },
    reflection() {
      if (!ok()) return;
      const t = now();
      [91, 88, 84, 79].forEach((n, i) => sound.tone(F(n), t + i * 0.05, 0.2, { type: 'triangle', gain: 0.025 }));
      noise(sound, { freq: 6000, q: 1.5, gain: 0.03, dur: 0.25 });
    },
    creak() {
      if (!ok()) return;
      const t = now();
      sound.tone(320, t, 0.32, { type: 'triangle', gain: 0.03, slideTo: 210 });
      sound.tone(410, t + 0.12, 0.26, { type: 'triangle', gain: 0.02, slideTo: 300 });
      noise(sound, { freq: 400, q: 0.6, gain: 0.05, dur: 0.12, type: 'lowpass', when: 0.25 });
    },
    clack(gain = 0.012) {
      if (!ok()) return;
      sound.tone(170 + Math.random() * 20, now(), 0.05, { type: 'square', gain, slideTo: 120 });
    },
    zip() {
      if (!ok()) return;
      sound.tone(1400, now(), 0.6, { type: 'sine', gain: 0.02, slideTo: 500 });
    },
    warn() {
      if (!ok()) return;
      const t = now();
      sound.tone(F(88), t, 0.12, { type: 'square', gain: 0.025 });
      sound.tone(F(88), t + 0.16, 0.12, { type: 'square', gain: 0.025 });
    },
    bonk() {
      if (!ok()) return;
      const t = now();
      sound.tone(420, t, 0.25, { type: 'sine', gain: 0.07, slideTo: 140 });
      voice(sound, t + 0.12, [91, 95, 98], { type: 'triangle', gain: 0.03, step: 0.07 });
    },
    phew() {
      if (!ok()) return;
      const t = now();
      sound.tone(F(76), t, 0.2, { gain: 0.03 });
      sound.tone(F(83), t + 0.1, 0.35, { gain: 0.03 });
    },
    boo() {
      if (!ok()) return;
      const t = now();
      for (const [f, g] of [[150, 0.12], [225, 0.05], [300, 0.03]]) {
        const o = sound.ctx.createOscillator();
        const gn = sound.ctx.createGain();
        const lfo = sound.ctx.createOscillator();
        const lg = sound.ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(f * 1.3, t);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.25);
        o.frequency.exponentialRampToValueAtTime(f * 0.72, t + 1.1);
        lfo.frequency.value = 7;
        lg.gain.value = f * 0.04;
        lfo.connect(lg).connect(o.frequency);
        gn.gain.setValueAtTime(0.0001, t);
        gn.gain.exponentialRampToValueAtTime(g, t + 0.06);
        gn.gain.setValueAtTime(g, t + 0.7);
        gn.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        o.connect(gn).connect(sound.sfx);
        o.start(t);
        lfo.start(t);
        o.stop(t + 1.3);
        lfo.stop(t + 1.3);
      }
      noise(sound, { freq: 300, q: 0.5, gain: 0.08, dur: 0.6, type: 'lowpass' });
    },
    giggle(big = false) {
      if (!ok()) return;
      const base = big ? 62 : 81;
      voice(sound, now(), [base, base + 3, base, base + 3, base - 2], { gain: big ? 0.05 : 0.03, step: big ? 0.11 : 0.07 });
    },
    shower() {
      if (!ok()) return;
      const t = now();
      for (let i = 0; i < 12; i++) sound.tone(F(84 + Math.floor(Math.random() * 14)), t + i * 0.06, 0.2, { type: 'sine', gain: 0.025 });
    },
    heart() {
      if (!ok()) return;
      const t = now();
      [76, 80, 83, 88].forEach((n, i) => sound.tone(F(n), t + i * 0.08, 0.5, { type: 'sine', gain: 0.03 }));
    },
  };
}

// A playful music box waltz in A minor for the haunted house (original), scheduled a moment ahead
export class Tune {
  constructor(sound, { volume = 1 } = {}) {
    this.sound = sound;
    this.volume = volume;
    this.i = 0;
    this.next = null;
    this.on = true;
    this.bpm = 150;
    // 3/4: melody over oom-pah-pah. 0 is a rest.
    this.melody = [69, 0, 72, 76, 0, 75, 76, 0, 72, 69, 0, 0, 71, 0, 74, 77, 0, 76, 74, 0, 71, 68, 0, 0, 69, 0, 72, 76, 0, 79, 81, 0, 79, 77, 76, 74, 72, 0, 71, 69, 0, 68, 69, 0, 0, 0, 0, 0];
    this.bass = [45, 64, 64, 45, 64, 64, 45, 64, 64, 45, 64, 64, 40, 62, 62, 40, 62, 62, 40, 62, 62, 40, 64, 64, 45, 64, 64, 48, 64, 64, 41, 65, 65, 41, 65, 65, 40, 64, 64, 40, 62, 62, 45, 64, 64, 45, 0, 0];
  }

  update(speedUp = 1) {
    const s = this.sound;
    if (!this.on || !s?.ctx || s.muted) return;
    const ctx = s.ctx;
    const beat = 60 / (this.bpm * speedUp);
    if (this.next === null || this.next < ctx.currentTime - 0.5) this.next = ctx.currentTime + 0.05;
    const v = 0.03 * this.volume;
    while (this.next < ctx.currentTime + 0.35) {
      const m = this.melody[this.i % this.melody.length];
      const b = this.bass[this.i % this.bass.length];
      if (m) {
        s.tone(F(m + 12), this.next, beat * 1.8, { type: 'sine', gain: v, attack: 0.004 });
        s.tone(F(m + 24), this.next, beat * 0.5, { type: 'sine', gain: v * 0.25, attack: 0.003 });
      }
      if (b) s.tone(F(b), this.next, beat * 0.8, { type: 'triangle', gain: v * (b < 50 ? 1.1 : 0.45), attack: 0.01 });
      this.next += beat;
      this.i++;
    }
  }
}
