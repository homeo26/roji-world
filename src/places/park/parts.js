import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { kit, makeAtlas, colorBake, heartPath, fitText, glowTexture, C } from '../school/kit.js';
import { canvasTexture, roundRect, FONT, umat, mesh } from '../../util.js';

// Building blocks for Roji Land: merge a little model into one vertex-coloured geometry (so many copies
// of it become one InstancedMesh), glowing bulbs, garlands of lights and the park's colours.

export { THREE, kit, makeAtlas, colorBake, heartPath, fitText, glowTexture, C, canvasTexture, roundRect, FONT };

export const P = {
  pink: '#ff9eb5',
  rose: '#ef5b6f',
  blush: '#ffd1dc',
  cream: '#fff4e3',
  paper: '#fffaf4',
  peach: '#ffc9a8',
  coral: '#f6907a',
  sun: '#ffd166',
  gold: '#f4c24f',
  mint: '#7fd8bf',
  teal: '#3fbf9f',
  sky: '#8fd3ff',
  blue: '#6fb8ff',
  navy: '#3f5fb0',
  lilac: '#c7a6ff',
  violet: '#9b7be0',
  wood: '#d4a373',
  woodDark: '#9b6a43',
  leaf: '#6cc24a',
  leafDark: '#3f9a4f',
  ink: '#3b2b3f',
  stone: '#efe2d0',
  stoneDark: '#d9c6ae',
  path: '#f3dcc0',
  steel: '#d3dbe5',
  white: '#ffffff',
};

const KEEP = ['position', 'normal'];
const rel = new THREE.Matrix4();

// Merge every mesh under `group` into one geometry with vertex colours taken from each material.
// tint: optional (mesh) => colour override. The group is left untouched.
export function toGeo(group, tint = null) {
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
    const col = new THREE.Color(tint?.(o) || o.material.color || '#ffffff');
    const n = g.attributes.position.count;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      a[i * 3] = col.r;
      a[i * 3 + 1] = col.g;
      a[i * 3 + 2] = col.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    list.push(g);
  });
  return mergeGeometries(list, false);
}

const vcCache = new Map();
// A shared vertex-colour material (rough 0.3 | 0.6 | 0.85)
export function vcMat(rough = 0.7, opts = {}) {
  const key = rough + JSON.stringify(opts);
  if (!vcCache.has(key)) vcCache.set(key, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, ...opts }));
  return vcCache.get(key);
}

// An InstancedMesh of `geo` with `count` copies. colors: optional list of hex tints.
export function inst(geo, material, count, { cast = true, receive = true, colors = null } = {}) {
  const m = new THREE.InstancedMesh(geo, material, count);
  m.castShadow = cast;
  m.receiveShadow = receive;
  if (colors) {
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) m.setColorAt(i, c.set(colors[i % colors.length]));
    m.instanceColor.needsUpdate = true;
  }
  return m;
}

// Unlit carnival bulbs: they read as lit by day and glow after dark.
const bulbGeoCache = new Map();
export function bulbs(points, { r = 0.07, colors = ['#fff3c4'], seg = 8 } = {}) {
  const key = `${r}|${seg}`;
  if (!bulbGeoCache.has(key)) bulbGeoCache.set(key, seg > 8 ? new THREE.SphereGeometry(r, seg, Math.round(seg * 0.6)) : new THREE.IcosahedronGeometry(r, 0));
  const m = new THREE.InstancedMesh(bulbGeoCache.get(key), new THREE.MeshBasicMaterial({ color: '#ffffff' }), points.length);
  m.castShadow = false;
  m.receiveShadow = false;
  const M4 = new THREE.Matrix4();
  const c = new THREE.Color();
  points.forEach((p, i) => {
    m.setMatrixAt(i, M4.makeTranslation(p.x, p.y, p.z));
    m.setColorAt(i, c.set(colors[i % colors.length]));
  });
  m.instanceMatrix.needsUpdate = true;
  m.instanceColor.needsUpdate = true;
  m.userData.base = colors;
  return m;
}

// Points along a sagging garland between a and b (Vector3), n bulbs, sag metres.
export function garland(a, b, n, sag = 0.35) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    out.push(p);
  }
  return out;
}

// A thin tube along points (a wire, a garland cord, a balloon string)
export function wire(points, r = 0.012, color = '#5a4a52', seg = 12) {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, 4, false), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
}

// Striped texture for awnings and canopies (vertical stripes, scalloped bottom optional)
export function stripes(a, b, n = 8, { w = 256, h = 128, scallop = false } = {}) {
  const t = canvasTexture(w, h, (c) => {
    for (let i = 0; i < n; i++) {
      c.fillStyle = i % 2 ? b : a;
      c.fillRect((i * w) / n, 0, w / n + 1, h);
    }
    if (scallop) {
      c.globalCompositeOperation = 'destination-out';
      const r = w / n / 2;
      for (let i = 0; i < n; i++) {
        c.beginPath();
        c.arc((i + 0.5) * (w / n), h + r * 0.35, r, 0, Math.PI * 2);
        c.fill();
      }
      c.globalCompositeOperation = 'source-over';
    }
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

// Light level 0 (day) .. 1 (night), read back from a reference glow material whose base intensity
// the town raises after dark. In the dev harness (no daylight) it is 0 unless the URL says ?night.
export function darkness(refMat, base) {
  const forced = typeof location !== 'undefined' && /[?&]parknight\b/.test(location.search);
  if (forced) return 1;
  return Math.max(0, Math.min(1, (refMat.emissiveIntensity / base - 1) / 1.8));
}

export const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
export const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// A plain glow material for windows: lit a little by day, the town brightens it at night.
export const glassMat = (color = '#ffe7b0', emissive = '#ffc96b', ei = 0.25) => umat(color, { emissive, ei, rough: 0.5 });

// Seat a kid at a world-space point with a yaw (kid.root and the actor both)
export function placeActor(a, wp, yaw, rot = null) {
  a.kid.root.position.copy(wp);
  if (rot) a.kid.root.rotation.set(rot.x, rot.y, rot.z, rot.order || 'XYZ');
  else a.kid.root.rotation.set(0, yaw, 0);
  a.pos.set(wp.x, 0, wp.z);
  a.y = wp.y;
  a.yaw = yaw;
}

// Merge every static mesh under `group` that uses `material` into one mesh (signs on one atlas, lit
// windows). keep: moving parts to leave alone. Returns the merged mesh, or null.
export function bakeMaterial(group, material, keep = []) {
  group.updateMatrixWorld(true);
  const skip = new Set();
  for (const d of keep) d.traverse((o) => skip.add(o));
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const list = [];
  const victims = [];
  let cast = false;
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || skip.has(o) || o.material !== material || o.children.length) return;
    for (let p = o; p && p !== group; p = p.parent) if (!p.visible) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal' && n !== 'uv') g.deleteAttribute(n);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.clearGroups();
    g.morphAttributes = {};
    rel.multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(rel);
    list.push(g);
    victims.push(o);
    cast = cast || o.castShadow;
  });
  if (list.length < 2) return null;
  for (const o of victims) o.removeFromParent();
  const merged = mesh(mergeGeometries(list, false), material, { cast, receive: true });
  group.add(merged);
  return merged;
}

// One tiny palette texture for the things that glow after dark: each swatch has a colour and a glow
// ([colour, glowColour, strength]) and a mesh picks its swatch by uv, so all of them share one
// material (and one draw call once merged). paint(geo, name) returns a copy of geo on that swatch.
export function makePalette(swatches, { rough = 0.55 } = {}) {
  const names = Object.keys(swatches);
  const n = names.length;
  const draw = (pick) => canvasTexture(n * 4, 4, (c) => names.forEach((k, i) => ((c.fillStyle = pick(swatches[k])), c.fillRect(i * 4, 0, 4, 4))));
  const map = draw(([c]) => c);
  const emap = draw(([, g, s]) => (g ? '#' + new THREE.Color(g).multiplyScalar(s).getHexString() : '#000000'));
  for (const t of [map, emap]) {
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
  }
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', map, emissive: '#ffffff', emissiveMap: emap, emissiveIntensity: 1, roughness: rough });
  const uvOf = (name) => [(names.indexOf(name) * 4 + 2) / (n * 4), 0.5];
  const paint = (geo, name) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    const [u, v] = uvOf(name);
    const a = new Float32Array(g.attributes.position.count * 2);
    for (let i = 0; i < a.length; i += 2) {
      a[i] = u;
      a[i + 1] = v;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(a, 2));
    return g;
  };
  // Merge the meshes under `group` into one palette geometry; each mesh names its swatch in userData.swatch
  const merge = (group) => {
    group.updateMatrixWorld(true);
    const inv = group.matrixWorld.clone().invert();
    const list = [];
    group.traverse((o) => {
      if (!o.isMesh) return;
      const g = paint(o.geometry, o.userData.swatch || names[0]);
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
      g.clearGroups();
      g.applyMatrix4(rel.multiplyMatrices(inv, o.matrixWorld));
      list.push(g);
    });
    return mergeGeometries(list, false);
  };
  return { material, uvOf, paint, merge };
}

// A path made of straight pieces through `points` (closed when the last point is the first).
// tags[i] names the piece that starts at point i ('lift', 'drop' ...).
export class Polyline {
  constructor(points, tags = []) {
    this.p = points;
    this.tags = tags;
    this.cum = [0];
    for (let i = 1; i < points.length; i++) this.cum.push(this.cum[i - 1] + points[i].distanceTo(points[i - 1]));
    this.length = this.cum[this.cum.length - 1];
  }

  wrap(d) {
    return ((d % this.length) + this.length) % this.length;
  }

  index(d) {
    let lo = 0;
    let hi = this.cum.length - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.cum[mid] <= d) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  // Position at distance d (wrapped); returns the tag of that piece
  at(d, pos) {
    d = this.wrap(d);
    const i = this.index(d);
    const len = this.cum[i + 1] - this.cum[i] || 1;
    pos.lerpVectors(this.p[i], this.p[i + 1], (d - this.cum[i]) / len);
    return this.tags[i];
  }

  tag(d) {
    return this.tags[this.index(this.wrap(d))];
  }
}

// Little line icons painted on the canvas atlas
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

// "R(heart)ji Land": the park's name with a heart for the o. Draws centred at (x, y), size px tall.
export function drawLogo(c, x, y, size, { ink = '#ef5b6f', heart = '#ff5d7a', outline = '#ffffff', line = 0 } = {}) {
  c.save();
  c.font = `700 ${size}px ${FONT}`;
  c.textBaseline = 'middle';
  const parts = ['R', '\u2661', 'ji Land'];
  const wR = c.measureText('R').width;
  const wH = size * 0.62;
  const wRest = c.measureText('ji Land').width;
  const total = wR + wH + wRest + size * 0.04;
  let px = x - total / 2;
  const txt = (s, at) => {
    if (line) {
      c.lineJoin = 'round';
      c.lineWidth = line;
      c.strokeStyle = outline;
      c.strokeText(s, at, y);
    }
    c.fillStyle = ink;
    c.fillText(s, at, y);
  };
  c.textAlign = 'left';
  txt(parts[0], px);
  px += wR + size * 0.02;
  // the heart sits where the o would, a little lower than the cap height
  const hx = px + wH / 2;
  const hy = y + size * 0.06;
  if (line) {
    heartPath(c, hx, hy, wH * 1.02);
    c.lineWidth = line;
    c.strokeStyle = outline;
    c.stroke();
  }
  heartPath(c, hx, hy, wH * 1.02);
  c.fillStyle = heart;
  c.fill();
  px += wH + size * 0.02;
  txt(parts[2], px);
  c.restore();
}
