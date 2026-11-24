import * as THREE from 'three';
import { canvasTexture, roundRect, umat } from '../../util.js';

// Pots of the Clay Café: target shapes, glazes, patterns, the lathe mesh that the pottery wheel
// reshapes every frame, and the saved shelf (localStorage 'roji-world-clay-pots').
// Clay is measured in "clay units" (the old 2D game's numbers); UNIT turns them into metres.

export const N = 32; // profile rows, bottom to top
export const RMIN = 0.04;
export const RMAX = 0.42;
export const HMIN = 0.18;
export const HMAX = 1;
export const UNIT = 0.68;
export const WALL = 0.018; // wall thickness in metres
export const WIN_AT = 75;
export const KEY = 'roji-world-clay-pots';
export const SHELF_MAX = 12;
export const WET = '#c46b47';
export const FIRED = '#e8a07a';

export const TARGETS = [
  { name: 'Round vase', h: 0.82, pts: [[0, 0.16], [0.2, 0.27], [0.42, 0.29], [0.62, 0.22], [0.78, 0.1], [0.9, 0.09], [1, 0.14]] },
  { name: 'Tall bottle', h: 0.95, pts: [[0, 0.17], [0.15, 0.23], [0.38, 0.24], [0.55, 0.16], [0.68, 0.07], [0.88, 0.06], [1, 0.085]] },
  { name: 'Tulip cup', h: 0.7, pts: [[0, 0.11], [0.25, 0.16], [0.55, 0.22], [0.8, 0.27], [1, 0.3]] },
  { name: 'Honey jar', h: 0.6, pts: [[0, 0.2], [0.15, 0.27], [0.6, 0.28], [0.85, 0.22], [0.92, 0.17], [1, 0.18]] },
  { name: 'Fruit bowl', h: 0.4, pts: [[0, 0.14], [0.3, 0.25], [0.65, 0.33], [1, 0.37]] },
];

// name, glaze, accent for the pattern
export const GLAZES = [
  ['Terracotta', '#d9734e', '#fff1dc'],
  ['Sky', '#6fb8ff', '#ffffff'],
  ['Mint', '#7fd3a7', '#ffffff'],
  ['Rose', '#ff8fb1', '#ffffff'],
  ['Butter', '#ffd166', '#ef5b6f'],
  ['Lilac', '#b99af5', '#fff5c2'],
  ['Cream', '#fff1dc', '#6fb8ff'],
  ['Cobalt', '#3f5fd0', '#ffffff'],
];
export const PATTERNS = [
  { id: 'plain', name: 'Plain' },
  { id: 'dots', name: 'Dots' },
  { id: 'stripes', name: 'Stripes' },
  { id: 'hearts', name: 'Hearts' },
  { id: 'waves', name: 'Waves' },
  { id: 'stars', name: 'Stars' },
];

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function sampleTarget(tg, s) {
  const p = tg.pts;
  for (let i = 1; i < p.length; i++) {
    if (s <= p[i][0]) {
      const [s0, r0] = p[i - 1];
      const [s1, r1] = p[i];
      const k = (1 - Math.cos(((s - s0) / (s1 - s0)) * Math.PI)) / 2;
      return r0 + (r1 - r0) * k;
    }
  }
  return p[p.length - 1][1];
}

export function sampleRows(r, s) {
  const f = clamp(s, 0, 1) * (r.length - 1);
  const i = Math.floor(f);
  const j = Math.min(r.length - 1, i + 1);
  return r[i] + (r[j] - r[i]) * (f - i);
}

// Silhouette match in percent (the untouched lump stays below the win line for every target).
export function matchScore(r, h, tg) {
  const M = 120;
  const top = Math.max(h, tg.h);
  const tol = 0.012;
  let diff = 0;
  let uni = 0;
  for (let k = 0; k < M; k++) {
    const y = ((k + 0.5) / M) * top;
    const rc = y <= h ? sampleRows(r, y / h) : 0;
    const rt = y <= tg.h ? sampleTarget(tg, y / tg.h) : 0;
    uni += Math.max(rc, rt);
    diff += Math.max(0, Math.abs(rc - rt) - tol);
  }
  return Math.round(clamp(1 - 1.8 * (diff / uni), 0, 1) * 100);
}

export function newLump() {
  const r = [];
  for (let i = 0; i < N; i++) r.push(0.21 * (1 - 0.45 * Math.pow(i / (N - 1), 1.6)));
  return { r, h: 0.4 };
}

// Outer profile in metres, [[radius, y], ...] bottom to top, from rows in clay units.
export function outerOf(rows, h, count = rows.length) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const s = i / (count - 1);
    out.push([sampleRows(rows, s) * UNIT, s * h * UNIT]);
  }
  return out;
}
export const targetOuter = (tg, count = 40) => Array.from({ length: count }, (_, i) => [sampleTarget(tg, i / (count - 1)) * UNIT, (i / (count - 1)) * tg.h * UNIT]);

// ---------------------------------------------------------------- lathe mesh
// Points of the whole pot: underside, outer wall, a rounded lip, inner wall and the inside floor.
// v runs 0 to 0.8 up the outer wall (where the pattern goes) and 0.8 to 1 down the inside.
function fullProfile(outer, wall = WALL) {
  const H = outer[outer.length - 1][1];
  const pts = [];
  const vs = [];
  const push = (r, y, v) => {
    pts.push(r, y);
    vs.push(v);
  };
  push(0, 0, 0);
  push(outer[0][0] * 0.86, 0, 0);
  for (const [r, y] of outer) push(Math.max(0.006, r), y, 0.8 * (y / H));
  const rt = Math.max(0.006, outer[outer.length - 1][0]);
  const lip = Math.min(wall, rt * 0.5);
  push(rt - lip * 0.15, H + lip * 0.45, 0.8);
  push(rt - lip * 0.5, H + lip * 0.6, 0.8);
  push(rt - lip * 0.85, H + lip * 0.45, 0.81);
  const floor = Math.min(wall * 1.4, H * 0.3);
  // Same number of points whatever the shape, so a live pot can be rewritten in place
  for (let i = outer.length - 1; i >= 0; i -= 2) {
    const [r, y] = outer[i];
    const yy = Math.max(y, floor);
    push(Math.max(0.004, r - lip), yy, 0.8 + 0.2 * (1 - yy / H));
  }
  push(Math.max(0.004, outer[0][0] - lip) * 0.9, floor, 1);
  push(0, floor, 1);
  return { pts, vs };
}

const SEG = 40;

// Fill (or refill) a lathe geometry. Normals come from the profile tangents.
function writeLathe(geo, pts, vs, seg) {
  const M = pts.length / 2;
  const count = (seg + 1) * M;
  let pos = geo.attributes.position;
  if (!pos || pos.count !== count) {
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    const idx = [];
    for (let i = 0; i < seg; i++) {
      for (let j = 0; j < M - 1; j++) {
        const a = j + i * M;
        const b = a + M;
        idx.push(a, b, a + 1, b + 1, a + 1, b);
      }
    }
    geo.setIndex(idx);
    pos = geo.attributes.position;
  }
  const P = pos.array;
  const Nn = geo.attributes.normal.array;
  const U = geo.attributes.uv.array;
  const nr = new Float32Array(M);
  const ny = new Float32Array(M);
  for (let j = 0; j < M; j++) {
    const j0 = Math.max(0, j - 1);
    const j1 = Math.min(M - 1, j + 1);
    const dr = pts[j1 * 2] - pts[j0 * 2];
    const dy = pts[j1 * 2 + 1] - pts[j0 * 2 + 1];
    const l = Math.hypot(dr, dy) || 1;
    nr[j] = dy / l;
    ny[j] = -dr / l;
  }
  for (let i = 0; i <= seg; i++) {
    const phi = (i / seg) * Math.PI * 2;
    const sn = Math.sin(phi);
    const cs = Math.cos(phi);
    for (let j = 0; j < M; j++) {
      const k = i * M + j;
      const r = pts[j * 2];
      P[k * 3] = r * sn;
      P[k * 3 + 1] = pts[j * 2 + 1];
      P[k * 3 + 2] = r * cs;
      Nn[k * 3] = nr[j] * sn;
      Nn[k * 3 + 1] = ny[j];
      Nn[k * 3 + 2] = nr[j] * cs;
      U[k * 2] = i / seg;
      U[k * 2 + 1] = vs[j];
    }
  }
  pos.needsUpdate = true;
  geo.attributes.normal.needsUpdate = true;
  geo.attributes.uv.needsUpdate = true;
  geo.computeBoundingSphere();
  return geo;
}

export function potGeometry(outer, seg = SEG) {
  const { pts, vs } = fullProfile(outer);
  return writeLathe(new THREE.BufferGeometry(), pts, vs, seg);
}
export function updatePotGeometry(geo, outer, seg = SEG) {
  const { pts, vs } = fullProfile(outer);
  return writeLathe(geo, pts, vs, seg);
}

// ---------------------------------------------------------------- textures
const texCache = new Map();
const V_RIM = 0.8;

// Greyscale throwing rings and finger streaks, multiplied with the clay colour.
export function clayDetailTex() {
  if (texCache.has('clay')) return texCache.get('clay');
  const t = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    const rim = h * (1 - V_RIM);
    for (let y = rim + 6; y < h; y += 11) {
      c.fillStyle = `rgba(90,40,20,${0.05 + ((y * 7) % 5) * 0.015})`;
      c.fillRect(0, y, w, 3);
      c.fillStyle = 'rgba(255,255,255,0.22)';
      c.fillRect(0, y + 3, w, 2);
    }
    for (const [x, a] of [[30, 0.16], [118, 0.1], [190, 0.14]]) {
      const g = c.createLinearGradient(x - 10, 0, x + 10, 0);
      g.addColorStop(0, 'rgba(255,240,225,0)');
      g.addColorStop(0.5, `rgba(255,240,225,${a * 2.2})`);
      g.addColorStop(1, 'rgba(255,240,225,0)');
      c.fillStyle = g;
      c.fillRect(x - 10, rim, 20, h - rim);
    }
    c.fillStyle = 'rgba(70,30,15,0.28)';
    c.fillRect(0, 0, w, rim);
  });
  texCache.set('clay', t);
  return t;
}

function heartPath(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y + s * 0.35);
  c.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.45, y - s * 0.85, x, y - s * 0.4);
  c.bezierCurveTo(x + s * 0.45, y - s * 0.85, x + s * 0.9, y - s * 0.25, x, y + s * 0.35);
  c.fill();
}
function starPath(c, x, y, s) {
  c.beginPath();
  for (let k = 0; k < 10; k++) {
    const rr = k % 2 ? s * 0.42 : s;
    const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
}
const shadeHex = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();

// Draw a glaze with its pattern on a 2D canvas of the pot's surface (also used for the panel chips).
export function drawGlaze(c, w, h, color, accent, pattern, { band = true } = {}) {
  const rim = band ? h * (1 - V_RIM) : 0;
  c.fillStyle = color;
  c.fillRect(0, 0, w, h);
  if (band) {
    c.fillStyle = new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.25).getStyle();
    c.fillRect(0, 0, w, rim);
  }
  const bh = h - rim;
  c.fillStyle = accent;
  c.strokeStyle = accent;
  if (pattern === 'dots') {
    for (let j = 0; j < 5; j++) for (let i = 0; i < 10; i++) {
      c.beginPath();
      c.arc(((i + 0.5 + (j % 2) * 0.5) * w) / 10, rim + ((j + 0.6) * bh) / 5.4, bh * 0.045, 0, Math.PI * 2);
      c.fill();
    }
  } else if (pattern === 'stripes') {
    for (let j = 0; j < 5; j++) c.fillRect(0, rim + ((j + 0.5) * bh) / 5.4, w, bh * 0.06);
  } else if (pattern === 'hearts') {
    for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) heartPath(c, ((i + 0.5 + (j % 2) * 0.5) * w) / 8, rim + ((j + 0.62) * bh) / 4.3, bh * 0.08);
  } else if (pattern === 'waves') {
    c.lineWidth = bh * 0.045;
    c.lineCap = 'round';
    for (let j = 0; j < 4; j++) {
      c.beginPath();
      const y0 = rim + ((j + 0.6) * bh) / 4.3;
      for (let x = 0; x <= w; x += 4) c.lineTo(x, y0 + Math.sin((x / w) * Math.PI * 16) * bh * 0.035);
      c.stroke();
    }
  } else if (pattern === 'stars') {
    for (let j = 0; j < 4; j++) for (let i = 0; i < 9; i++) starPath(c, ((i + 0.5 + (j % 2) * 0.5) * w) / 9, rim + ((j + 0.62) * bh) / 4.3, bh * 0.06);
  }
  if (band) {
    // Unglazed foot ring and a soft drip line above it
    c.fillStyle = FIRED;
    c.fillRect(0, h - bh * 0.05, w, bh * 0.05);
    c.fillStyle = shadeHex(color, 0.82);
    for (let i = 0; i < 24; i++) {
      const x = (i + 0.5) * (w / 24);
      roundRect(c, x - 4, h - bh * 0.085, 8, bh * 0.04 + ((i * 37) % 7), 4);
      c.fill();
    }
  }
}

export function glazeTex(color, pattern) {
  const key = `${color}|${pattern}`;
  if (texCache.has(key)) return texCache.get(key);
  const accent = (GLAZES.find((g) => g[1] === color) || [0, 0, '#ffffff'])[2];
  const t = canvasTexture(512, 256, (c, w, h) => drawGlaze(c, w, h, color, accent, pattern));
  texCache.set(key, t);
  return t;
}

// The pot material in each state: 'wet' clay, 'fired' bisque, or glazed with a colour and pattern.
export function setPotLook(material, state, color = GLAZES[0][1], pattern = 'plain') {
  if (state === 'glazed') {
    material.map = glazeTex(color, pattern);
    material.color.set('#ffffff');
    material.roughness = 0.24;
  } else {
    material.map = clayDetailTex();
    material.color.set(state === 'fired' ? FIRED : WET);
    material.roughness = state === 'fired' ? 0.92 : 0.5;
  }
  material.needsUpdate = true;
}

export function potMaterial(state = 'wet') {
  const m = umat('#ffffff', { rough: 0.5 });
  setPotLook(m, state);
  return m;
}

// A finished pot from the saved shelf. item: { profile: [[r, y], ...], color, pattern }
export function makePot(item, seg = 28) {
  const geo = potGeometry(item.profile, seg);
  const m = new THREE.Mesh(geo, potMaterial('glazed'));
  setPotLook(m.material, 'glazed', item.color, item.pattern);
  m.castShadow = false;
  m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------- the saved shelf
export function loadPots() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((p) => Array.isArray(p?.profile) && p.profile.length > 2) : [];
  } catch {
    return [];
  }
}
export function savePots(list) {
  const keep = list.slice(-SHELF_MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(keep));
  } catch {
    /* storage full */
  }
  return keep;
}

// Small SVG of a profile for the panel. outer: [[r, y], ...] in metres.
export function potSvg(outer, color, px, stroke = '#a0705a') {
  const H = outer[outer.length - 1][1];
  const S = 40 / Math.max(0.3, H * 1.1, Math.max(...outer.map((p) => p[0])) * 2.3);
  const L = [];
  const R = [];
  for (const [r, y] of outer) {
    L.push(`${(20 - r * S).toFixed(1)} ${(46 - y * S).toFixed(1)}`);
    R.unshift(`${(20 + r * S).toFixed(1)} ${(46 - y * S).toFixed(1)}`);
  }
  const rx = outer[outer.length - 1][0] * S;
  const top = 46 - H * S;
  return `<svg width="${px}" height="${px * 1.2}" viewBox="0 0 40 48" aria-hidden="true"><path d="M${L.join(' L')} L${R.join(' L')} Z" fill="${color}" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round"/><ellipse cx="20" cy="${top.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${Math.max(0.8, rx * 0.25).toFixed(1)}" fill="${shadeHex(color, 0.7)}"/></svg>`;
}
