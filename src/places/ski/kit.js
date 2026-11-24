// Shared winter kit for the ski area and the ski race: vertex-coloured models (pines, rocks,
// snowmen) that draw many copies in one call, a snowman built from growable parts, beanies,
// skis, poles and a falling-snow particle field.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const SNOW = '#f6f9fc';
export const SNOW_SHADE = '#dfeaf4';
export const COAL = '#2b2430';
export const CARROT = '#f28c38';
export const TWIG = '#7a5232';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

// Vertex-coloured material (one per scene; not cached so a minigame can dispose its own).
export function vcMat(opts = {}) {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, ...opts });
}

// Give a geometry a flat colour attribute (non-indexed, so every part merges cleanly).
export function paint(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 3] = c.r;
    a[i * 3 + 1] = c.g;
    a[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

// A coloured part placed with position, rotation and scale.
export function part(geo, color, x = 0, y = 0, z = 0, { rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  geo.applyMatrix4(_m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)));
  return paint(geo, color);
}

export function merge(parts) {
  const g = mergeGeometries(parts, false);
  g.computeBoundingSphere();
  return g;
}

// Many copies of one geometry. items: [{ x, y, z, s, sy, ry, color }]
export function instances(geo, material, items, { cast = true, receive = true } = {}) {
  const im = new THREE.InstancedMesh(geo, material, Math.max(1, items.length));
  items.forEach((it, i) => {
    const s = it.s ?? 1;
    _m.compose(_v.set(it.x, it.y ?? 0, it.z), _q.setFromEuler(_e.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0)), _s.set(it.sx ?? s, it.sy ?? s, it.sz ?? s));
    im.setMatrixAt(i, _m);
    if (it.color) im.setColorAt(i, new THREE.Color(it.color));
  });
  if (!items.length) im.count = 0;
  im.castShadow = cast;
  im.receiveShadow = receive;
  im.computeBoundingSphere();
  return im;
}

// ------------------------------------------------------------------ nature
// Pine with three tiers, each wearing a snow cap. Base at y = 0, about 3.2 m tall.
export function pineGeo(snow = true) {
  const parts = [part(new THREE.CylinderGeometry(0.13, 0.19, 0.8, 7), '#8b5e3c', 0, 0.4, 0)];
  const tiers = [
    [1.15, 1.35, 0.55],
    [0.9, 1.2, 1.3],
    [0.62, 1.05, 2.05],
  ];
  tiers.forEach(([r, h, y], i) => {
    parts.push(part(new THREE.ConeGeometry(r, h, 9), i === 1 ? '#3f8a5a' : '#4a9a63', 0, y + h / 2, 0, { ry: i * 0.4 }));
    if (snow) parts.push(part(new THREE.ConeGeometry(r * 0.76, h * 0.56, 9), SNOW, 0, y + h * 0.72 + 0.02, 0, { ry: i * 0.4 + 0.2 }));
  });
  if (snow) parts.push(part(new THREE.SphereGeometry(0.13, 8, 6), SNOW, 0, 3.12, 0));
  return merge(parts);
}

// Grey boulder with a soft snow cushion on top. Base near y = 0, about 1 m across.
export function rockGeo() {
  return merge([
    part(new THREE.DodecahedronGeometry(0.5, 0), '#aeb8c4', 0, 0.22, 0, { sy: 0.68, ry: 0.4 }),
    part(new THREE.SphereGeometry(0.42, 10, 6, 0, Math.PI * 2, 0, 1.3), SNOW, 0.02, 0.36, 0.02, { sy: 0.5, sx: 1.05 }),
  ]);
}

// Soft snow drift.
export function moundGeo() {
  return paint(new THREE.SphereGeometry(1, 16, 5, 0, Math.PI * 2, 0, Math.PI / 2), SNOW);
}

// ------------------------------------------------------------------ snowmen
export const SNOWMAN_STYLES = [
  { scarf: '#ef5b6f', tail: '#ffffff', hat: 'top', hatColor: '#3b2b3f', band: '#ef5b6f' },
  { scarf: '#4aa3df', tail: '#ffd166', hat: 'beanie', hatColor: '#ff9eb5', band: '#ffffff' },
  { scarf: '#7fd3a7', tail: '#ffffff', hat: 'beanie', hatColor: '#ffd166', band: '#ef5b6f' },
  { scarf: '#c7a6ff', tail: '#ffffff', hat: 'top', hatColor: '#2c3e66', band: '#ffd166' },
  { scarf: '#f08a5d', tail: '#ffd166', hat: 'beanie', hatColor: '#4aa3df', band: '#ffffff' },
];

// Snowman parts in snowman space (base at y = 0, faces +Z, about 1.95 m tall at scale 1).
// Returns { name: { pivot: [x, y, z], geos: [...] } } so each group can pop in on its own.
export function snowmanParts(style = SNOWMAN_STYLES[0]) {
  const P = {};
  const add = (name, pivot, geos) => (P[name] = { pivot, geos });
  add('base', [0, 0.46, 0], [part(new THREE.SphereGeometry(0.52, 18, 14), SNOW, 0, 0.46, 0, { sy: 0.9 })]);
  add('mid', [0, 1.08, 0], [part(new THREE.SphereGeometry(0.37, 18, 14), SNOW, 0, 1.08, 0)]);
  add('head', [0, 1.56, 0], [part(new THREE.SphereGeometry(0.27, 18, 14), SNOW, 0, 1.56, 0)]);
  const face = [];
  for (const s of [1, -1]) face.push(part(new THREE.SphereGeometry(0.036, 8, 6), COAL, 0.095 * s, 1.62, 0.235));
  face.push(part(new THREE.ConeGeometry(0.05, 0.26, 10), CARROT, 0, 1.55, 0.37, { rx: Math.PI / 2 }));
  for (let i = 0; i < 5; i++) {
    const a = -0.5 + i * 0.25;
    face.push(part(new THREE.SphereGeometry(0.022, 6, 5), COAL, Math.sin(a) * 0.12, 1.47 - Math.cos(a) * 0.02 + Math.abs(a) * 0.05, 0.245 - Math.abs(a) * 0.03));
  }
  add('face', [0, 1.56, 0.2], face);
  const buttons = [];
  for (let i = 0; i < 3; i++) buttons.push(part(new THREE.SphereGeometry(0.04, 8, 6), COAL, 0, 1.24 - i * 0.15, 0.335 - Math.abs(i - 1) * 0.015));
  add('buttons', [0, 1.1, 0.3], buttons);
  const arms = [];
  for (const s of [1, -1]) {
    arms.push(part(new THREE.CylinderGeometry(0.022, 0.03, 0.62, 5), TWIG, 0.56 * s, 1.24, 0, { rz: -1.05 * s }));
    arms.push(part(new THREE.CylinderGeometry(0.014, 0.018, 0.2, 4), TWIG, 0.78 * s, 1.43, 0.02, { rz: -0.3 * s }));
    arms.push(part(new THREE.CylinderGeometry(0.014, 0.018, 0.18, 4), TWIG, 0.8 * s, 1.33, 0, { rz: -1.9 * s }));
  }
  add('arms', [0, 1.2, 0], arms);
  add('scarf', [0, 1.33, 0], [
    part(new THREE.TorusGeometry(0.24, 0.075, 8, 18), style.scarf, 0, 1.34, 0, { rx: Math.PI / 2 }),
    part(new THREE.BoxGeometry(0.13, 0.36, 0.05), style.scarf, 0.14, 1.17, 0.25, { rz: 0.15, rx: -0.25 }),
    part(new THREE.BoxGeometry(0.135, 0.05, 0.055), style.tail, 0.162, 1.02, 0.29, { rz: 0.15, rx: -0.25 }),
  ]);
  if (style.hat === 'top') {
    add('hat', [0, 1.82, 0], [
      part(new THREE.CylinderGeometry(0.3, 0.3, 0.035, 18), style.hatColor, 0, 1.79, 0),
      part(new THREE.CylinderGeometry(0.19, 0.2, 0.32, 18), style.hatColor, 0, 1.96, 0),
      part(new THREE.CylinderGeometry(0.205, 0.205, 0.07, 18), style.band, 0, 1.84, 0),
    ]);
  } else {
    add('hat', [0, 1.8, 0], [
      part(new THREE.SphereGeometry(0.255, 16, 10, 0, Math.PI * 2, 0, 1.45), style.hatColor, 0, 1.64, 0, { rx: -0.12 }),
      part(new THREE.TorusGeometry(0.235, 0.05, 6, 18), style.band, 0, 1.68, 0.01, { rx: Math.PI / 2 - 0.12 }),
      part(new THREE.SphereGeometry(0.085, 10, 8), style.band, 0, 1.94, -0.04),
    ]);
  }
  return P;
}

// One merged geometry for a whole snowman (decoration and race obstacles).
export function snowmanGeo(style) {
  return merge(Object.values(snowmanParts(style)).flatMap((p) => p.geos));
}

// A snowman whose parts are separate meshes (for the building animation).
// Returns { root, parts: { name: mesh } }; each mesh sits at its pivot so it can scale in place.
export function growableSnowman(style, material) {
  const root = new THREE.Group();
  const parts = {};
  for (const [name, p] of Object.entries(snowmanParts(style))) {
    const g = merge(p.geos);
    g.translate(-p.pivot[0], -p.pivot[1], -p.pivot[2]);
    const m = new THREE.Mesh(g, material);
    m.castShadow = true;
    m.receiveShadow = true;
    m.position.set(...p.pivot);
    m.userData.pivot = new THREE.Vector3(...p.pivot);
    root.add(m);
    parts[name] = m;
  }
  return { root, parts };
}

// ------------------------------------------------------------------ winter wear and gear
// A knitted beanie with a pompom that fits a Kid's head group.
export function beanie(color, band = '#ffffff') {
  const g = new THREE.Group();
  const knit = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
  const rim = new THREE.MeshStandardMaterial({ color: band, roughness: 0.95 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.352, 22, 12, 0, Math.PI * 2, 0, 1.2), knit);
  cap.scale.set(1.02, 0.98, 1.02);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.052, 8, 26), rim);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.122;
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), rim);
  pom.position.y = 0.39;
  g.add(cap, ring, pom);
  g.position.set(0, 0.31, -0.01);
  g.rotation.x = -0.1;
  for (const m of [cap, ring, pom]) m.castShadow = true;
  return g;
}

// A soft scarf for a Kid's body group (neck at y = 0.79).
export function scarf(color) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.05, 8, 18), m);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.79;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.04), m);
  tail.position.set(0.07, 0.66, 0.15);
  tail.rotation.set(-0.35, 0, 0.12);
  g.add(ring, tail);
  return g;
}

// A pair of skis with turned-up tips, centred under the feet (faces +Z).
export function skis(color) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.45 });
  const dark = new THREE.MeshStandardMaterial({ color: '#3b2b3f', roughness: 0.5 });
  for (const s of [1, -1]) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 1.25), m);
    board.position.set(0.1 * s, 0.015, 0.1);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.2), m);
    tip.position.set(0.1 * s, 0.06, 0.79);
    tip.rotation.x = -0.55;
    const binding = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.22), dark);
    binding.position.set(0.1 * s, 0.045, 0.12);
    for (const o of [board, tip, binding]) o.castShadow = true;
    g.add(board, tip, binding);
  }
  return g;
}

// A ski pole that hangs from a Kid's hand (attach to kid.arms[i]).
export function pole(color = '#3b2b3f') {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.0, 6), new THREE.MeshStandardMaterial({ color: '#c9d2dc', metalness: 0.5, roughness: 0.35 }));
  shaft.position.y = -0.48;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
  const basket = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 5, 12), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
  basket.rotation.x = Math.PI / 2;
  basket.position.y = -0.88;
  g.add(shaft, grip, basket);
  g.position.y = -0.28;
  g.rotation.x = 0.95;
  return g;
}

// ------------------------------------------------------------------ falling snow
function flakeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Snowflakes that drift down inside a box that follows a centre point.
// update(dt, t, cx, cy, cz, strength 0..1)
export function snowfall(count = 600, { w = 34, h = 14, d = 30, size = 0.16 } = {}) {
  const pos = new Float32Array(count * 3);
  const seed = [];
  for (let i = 0; i < count; i++) seed.push([Math.random() * w, Math.random() * h, Math.random() * d, 0.6 + Math.random() * 0.8, Math.random() * 10]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size, map: flakeTexture(), transparent: true, depthWrite: false, color: '#ffffff', opacity: 0.9 });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const mod = (a, n) => ((a % n) + n) % n;
  return {
    points,
    update(dt, t, cx, cy, cz, strength = 1) {
      points.visible = strength > 0.01;
      if (!points.visible) return;
      mat.opacity = 0.9 * strength;
      for (let i = 0; i < count; i++) {
        const [bx, by, bz, sp, ph] = seed[i];
        const x = bx + Math.sin(t * 0.6 + ph) * 0.7 + t * 0.25;
        const y = by - t * sp;
        const z = bz + Math.cos(t * 0.45 + ph) * 0.5;
        pos[i * 3] = cx + mod(x - cx, w) - w / 2;
        pos[i * 3 + 1] = cy + mod(y, h) - 1;
        pos[i * 3 + 2] = cz + mod(z - cz, d) - d / 2;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

// Merge every plain, opaque, non-glowing static mesh under `group` into a few vertex-coloured
// meshes (one per roughness / metalness / side bucket), so a scene with dozens of colours costs a
// handful of draw calls. The merged meshes are pushed onto `dynamic` so the engine's own merge
// (which drops vertex colours) leaves them alone. Leaf meshes only.
export function bakeColored(group, dynamic) {
  group.updateMatrixWorld(true);
  const skip = new Set();
  for (const d of dynamic) d.traverse((o) => skip.add(o));
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const buckets = new Map();
  const victims = [];
  const ROUGH = [0.3, 0.5, 0.7, 0.9];
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || skip.has(o) || o.children.length) return;
    const m = o.material;
    if (Array.isArray(m) || !m.isMeshStandardMaterial || m.map || m.transparent || m.vertexColors || m.alphaMap) return;
    if (m.emissiveIntensity > 0 && m.emissive.r + m.emissive.g + m.emissive.b > 0.001) return;
    const src = o.geometry;
    if (!src.attributes.normal || !src.attributes.uv) return;
    const g = src.index ? src.toNonIndexed() : src.clone();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    g.clearGroups();
    g.morphAttributes = {};
    rel.multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(rel);
    if (rel.determinant() < 0) {
      for (const name of ['position', 'normal', 'uv']) {
        const a = g.attributes[name];
        for (let i = 0; i < a.count; i += 3) {
          for (let k = 0; k < a.itemSize; k++) {
            const t = a.array[(i + 1) * a.itemSize + k];
            a.array[(i + 1) * a.itemSize + k] = a.array[(i + 2) * a.itemSize + k];
            a.array[(i + 2) * a.itemSize + k] = t;
          }
        }
      }
    }
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    const c = m.color;
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const rough = ROUGH.reduce((a, b) => (Math.abs(b - m.roughness) < Math.abs(a - m.roughness) ? b : a));
    const metal = m.metalness > 0.25 ? 0.45 : 0;
    const key = `${rough}|${metal}|${m.side}|${m.flatShading}|${o.castShadow}|${o.receiveShadow}`;
    if (!buckets.has(key)) buckets.set(key, { rough, metal, side: m.side, flat: m.flatShading, cast: o.castShadow, receive: o.receiveShadow, list: [] });
    buckets.get(key).list.push(g);
    victims.push(o);
  });
  for (const o of victims) o.removeFromParent();
  for (const bk of buckets.values()) {
    const merged = mergeGeometries(bk.list, false);
    if (!merged) continue;
    merged.computeBoundingSphere();
    const mm = new THREE.Mesh(merged, vcMat({ roughness: bk.rough, metalness: bk.metal, side: bk.side, flatShading: bk.flat }));
    mm.castShadow = bk.cast;
    mm.receiveShadow = bk.receive;
    group.add(mm);
    dynamic.push(mm);
  }
}

// Scale an object so its largest side is `size` metres, base resting at y = 0.
export function fit(obj, size) {
  const box = new THREE.Box3().setFromObject(obj);
  const dim = box.getSize(new THREE.Vector3());
  const k = size / Math.max(dim.x, dim.y, dim.z, 1e-3);
  obj.scale.multiplyScalar(k);
  return obj;
}
