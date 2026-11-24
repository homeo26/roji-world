import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat as baseMat, umat, mesh, canvasTexture, roundRect, FONT, heartShape, rng } from '../../util.js';

// Building blocks shared by the picnic garden, the cycling park and the cycle race.

export { THREE, mergeGeometries, umat, mesh, canvasTexture, roundRect, FONT, rng };

// Shared materials, roughness snapped to three steps so more meshes merge.
export function mat(color, o = {}) {
  if (o.emissive || o.map || o.transparent || o.side) return baseMat(color, o);
  const rough = o.rough === undefined ? 0.78 : o.rough;
  return baseMat(color, { ...o, rough: rough < 0.45 ? 0.3 : rough < 0.72 ? 0.6 : 0.85 });
}

// Vertex-coloured materials, one per surface kind, shared by every merged mesh.
const vcMats = new Map();
export function vcMaterial(rough = 0.85, metal = 0, flat = false) {
  const k = `${rough}|${metal}|${flat ? 1 : 0}`;
  if (!vcMats.has(k)) vcMats.set(k, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: metal, flatShading: flat }));
  return vcMats.get(k);
}

function withColor(g, color) {
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([color.r, color.g, color.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return g;
}

// Merge every plain-coloured static mesh under `group` into a few vertex-coloured meshes
// (one per roughness, metalness, flat shading and shadow setting). skip: objects to leave alone.
export function colorBake(group, skip = []) {
  group.updateMatrixWorld(true);
  const skipSet = new Set();
  for (const d of skip) d.traverse((o) => skipSet.add(o));
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const buckets = new Map();
  const victims = [];
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o === group || skipSet.has(o) || o.children.length) return;
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
    withColor(g, m.color);
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
    const me = new THREE.Mesh(geo, vcMaterial(b.rough, b.metal, b.flat));
    me.castShadow = b.cast;
    me.receiveShadow = b.receive;
    group.add(me);
    out.push(me);
  }
  return out;
}
// For a moving group: merge its fixed parts in place.
export const bake = (group, keep = []) => (colorBake(group, keep), group);

// A geometry painted one colour, placed with position / rotation / scale (for hand-built merges).
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
export function part(geo, color, x = 0, y = 0, z = 0, { rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n);
  g.applyMatrix4(_m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)));
  return withColor(g, new THREE.Color(color));
}
export function merge(parts) {
  const g = mergeGeometries(parts, false);
  g.computeBoundingSphere();
  return g;
}

// ------------------------------------------------------------------ primitives
export const M = (c, o) => (typeof c === 'string' ? mat(c, o) : c);
const sm = (geo, c, o, size) => mesh(geo, M(c, o), { cast: size >= 0.28 });
export const box = (w, h, d, c, o) => sm(new THREE.BoxGeometry(w, h, d), c, o, Math.max(w, h, d));
export const rbox = (w, h, d, c, r = 0.06, o) => sm(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002)), c, o, Math.max(w, h, d));
export const cyl = (rt, rb, h, c, seg = 14, o) => sm(new THREE.CylinderGeometry(rt, rb, h, seg), c, o, Math.max(rt * 2, rb * 2, h));
export const cone = (r, h, c, seg = 12, o) => sm(new THREE.ConeGeometry(r, h, seg), c, o, Math.max(r * 2, h));
export const sph = (r, c, o, seg = 14) => sm(new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7))), c, o, r * 2);
export const ico = (r, c, o, detail = 1) => sm(new THREE.IcosahedronGeometry(r, detail), c, { flat: true, ...o }, r * 2);
export const tor = (r, t, c, o, arc = Math.PI * 2, rs = 8, ts = 20) => sm(new THREE.TorusGeometry(r, t, rs, ts, arc), c, o, r * 2);
export const at = (o, x, y, z) => (o.position.set(x, y, z), o);
export const rot = (o, x, y, z) => (o.rotation.set(x, y, z), o);
export const scl = (o, x, y = x, z = x) => (o.scale.set(x, y, z), o);

// A rod from a to b (Vector3s).
export function rod(a, b, r, c, seg = 6) {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = sm(new THREE.CylinderGeometry(r, r, d.length(), seg), c, undefined, r * 2);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

export function heartGeo(size, depth = 0.04, bevel = 0.35) {
  const g = new THREE.ExtrudeGeometry(heartShape(size), { depth, bevelEnabled: true, bevelSize: depth * bevel, bevelThickness: depth * bevel, bevelSegments: 2, curveSegments: 10 });
  g.computeBoundingBox();
  const b = g.boundingBox;
  g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -depth / 2);
  return g;
}

// ------------------------------------------------------------------ textures and labels
export const texMat = (map, o = {}) => umat('#ffffff', { rough: 0.85, ...o, map });
export function panel(w, h, map, o = {}) {
  return mesh(new THREE.PlaneGeometry(w, h), texMat(map, o), { cast: false });
}
export function labelTex(lines, { w = 512, h = 160, bg = '#fff7ea', border = '#ef5b6f', color = '#4a3423', accent = '#ef5b6f', radius = 30, draw = null } = {}) {
  return canvasTexture(w, h, (ctx) => {
    if (bg) {
      ctx.fillStyle = bg;
      roundRect(ctx, 6, 6, w - 12, h - 12, radius);
      ctx.fill();
      if (border) {
        ctx.lineWidth = 10;
        ctx.strokeStyle = border;
        ctx.stroke();
      }
    }
    draw?.(ctx, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fit = (text, size, y) => {
      ctx.font = `600 ${size}px ${FONT}`;
      const tw = ctx.measureText(text).width;
      if (tw > w - 60) ctx.font = `600 ${Math.floor((size * (w - 60)) / tw)}px ${FONT}`;
      ctx.fillText(text, w / 2, y);
    };
    if (lines.length === 1) {
      ctx.fillStyle = color;
      fit(lines[0], Math.round(h * 0.46), h / 2 + 4);
    } else {
      ctx.fillStyle = accent;
      fit(lines[0].toUpperCase(), Math.round(h * 0.2), h * 0.3);
      ctx.fillStyle = color;
      fit(lines[1], Math.round(h * 0.36), h * 0.66);
    }
  });
}

// ------------------------------------------------------------------ garden (instanced flowers and leaves)
export const FLOWER_COLS = ['#ff8fb1', '#ffffff', '#ffd75e', '#c7a6ff', '#ff6b6b', '#ffb36b', '#7fb0ff', '#ff5d8f'];
export const ROSE_COLS = ['#ef3b5d', '#ff5d8f', '#ff9eb5', '#ffffff', '#ffd75e', '#ffb36b', '#c7a6ff', '#ff7a6b', '#ffe4ec'];

export function makeGarden(seed = 7) {
  const list = [];
  const leaves = [];
  const api = {
    flower(x, y, z, kind, color, h = 0.28, s = 1) {
      list.push({ x, y, z, kind, color, h, s });
    },
    leaf(x, y, z, s = 1, ry = 0, rx = 0, color = null) {
      leaves.push({ x, y, z, s, ry, rx, color });
    },
    // Scatter flowers over a rectangle at height y
    bed(x0, x1, z0, z1, y, n, sd, kinds = ['tulip', 'daisy', 'pom', 'rose'], colors = FLOWER_COLS) {
      const r = rng(sd);
      for (let i = 0; i < n; i++) {
        const fx = x0 + r() * (x1 - x0);
        const fz = z0 + r() * (z1 - z0);
        api.flower(fx, y, fz, kinds[Math.floor(r() * kinds.length)], colors[Math.floor(r() * colors.length)], 0.18 + r() * 0.2);
        if (i % 2 === 0) api.leaf(fx + (r() - 0.5) * 0.1, y + 0.05, fz + (r() - 0.5) * 0.1, 0.8 + r() * 0.5, r() * 6, 0.4);
      }
    },
    // A round rose bush: a green mound dotted with roses of one or more colours
    roseBush(group, x, z, rad, colors, sd = 1) {
      const r = rng(sd);
      const g1 = mat('#4f9a45', { rough: 0.85, flat: true });
      const g2 = mat('#5fae4f', { rough: 0.85, flat: true });
      const b = at(mesh(new THREE.IcosahedronGeometry(rad, 1), g1), x, rad * 0.78, z);
      b.scale.set(1, 0.85, 1);
      group.add(b);
      group.add(at(scl(mesh(new THREE.IcosahedronGeometry(rad * 0.7, 1), g2), 1, 0.85, 1), x + rad * 0.45, rad * 0.62, z + rad * 0.25));
      const n = Math.round(rad * rad * 50);
      for (let i = 0; i < n; i++) {
        const th = r() * Math.PI * 2;
        const ph = 0.25 + r() * 1.05;
        const px = x + Math.sin(ph) * Math.cos(th) * rad * 1.02;
        const pz = z + Math.sin(ph) * Math.sin(th) * rad * 1.02;
        const py = rad * 0.78 + Math.cos(ph) * rad * 0.87;
        api.flower(px, py, pz, 'rose', colors[i % colors.length], 0.01, 0.9 + r() * 0.5);
        if (i % 3 === 0) api.leaf(px + (r() - 0.5) * 0.12, py + 0.02, pz + (r() - 0.5) * 0.12, 1.2, r() * 6, 0.9, '#6dbb58');
      }
    },
    build() {
      const out = [];
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      const v = new THREE.Vector3();
      const s = new THREE.Vector3();
      const c = new THREE.Color();
      const r = rng(seed);
      const make = (geo, material, items, fn, cast = false) => {
        if (!items.length) return;
        const im = new THREE.InstancedMesh(geo, material, items.length);
        im.castShadow = cast;
        im.receiveShadow = true;
        items.forEach((it, i) => {
          fn(it, i);
          im.setMatrixAt(i, m4);
          im.setColorAt(i, c.set(it.color || '#ffffff'));
        });
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.computeBoundingSphere();
        out.push(im);
      };
      const white = mat('#ffffff', { rough: 0.6 });
      const stems = list.filter((f) => f.h > 0.05);
      make(new THREE.CylinderGeometry(0.012, 0.014, 1, 4).translate(0, 0.5, 0), mat('#ffffff', { rough: 0.8 }), stems.map((f) => ({ ...f, color: '#4f9a45' })), (f) => {
        e.set((r() - 0.5) * 0.25, 0, (r() - 0.5) * 0.25);
        m4.compose(v.set(f.x, f.y, f.z), q.setFromEuler(e), s.set(1, f.h, 1));
      });
      for (const f of list) f.top = new THREE.Vector3(f.x, f.y + f.h, f.z);
      const kinds = {
        tulip: new THREE.LatheGeometry([[0.0, 0], [0.04, 0.005], [0.06, 0.04], [0.058, 0.08], [0.045, 0.1]].map(([a, b]) => new THREE.Vector2(a, b)), 7),
        daisy: (() => {
          const ps = [];
          for (let k = 0; k < 5; k++) {
            const p = new THREE.SphereGeometry(0.038, 5, 2);
            p.scale(1, 0.25, 0.6);
            p.translate(0.045, 0, 0);
            p.rotateY((k / 5) * Math.PI * 2);
            ps.push(p.toNonIndexed());
          }
          return mergeGeometries(ps);
        })(),
        pom: new THREE.IcosahedronGeometry(0.065, 0),
        rose: new THREE.DodecahedronGeometry(0.052, 0).scale(1, 0.85, 1),
      };
      for (const [kind, geo] of Object.entries(kinds)) {
        const items = list.filter((f) => f.kind === kind);
        make(geo, white, items, (f) => {
          e.set(kind === 'daisy' ? -0.3 + r() * 0.2 : (r() - 0.5) * 0.4, r() * 6, 0);
          m4.compose(f.top, q.setFromEuler(e), s.setScalar((0.85 + r() * 0.4) * f.s));
        });
      }
      const centres = list.filter((f) => f.kind === 'daisy').map((f) => ({ ...f, color: '#ffc93c' }));
      make(new THREE.SphereGeometry(0.025, 6, 4), white, centres, (f) => m4.compose(v.copy(f.top).setY(f.top.y + 0.008), q.identity(), s.set(1, 0.6, 1)));
      make(new THREE.SphereGeometry(0.06, 5, 3).scale(1, 0.3, 2.1), mat('#ffffff', { rough: 0.8 }), leaves.map((l) => ({ ...l, color: l.color || '#76c25c' })), (l) => {
        e.set(l.rx, l.ry, 0);
        m4.compose(v.set(l.x, l.y, l.z), q.setFromEuler(e), s.setScalar(l.s));
      });
      return out;
    },
  };
  return api;
}

// ------------------------------------------------------------------ trees and bushes
export const GREENS = ['#6dbb58', '#5aa84f', '#84c95f', '#77c05a'];
export function roundTree(group, x, z, s = 1, { colors = GREENS, blossom = false, trunk = '#9b6a43' } = {}) {
  group.add(at(cyl(0.14 * s, 0.22 * s, 1.6 * s, trunk, 8), x, 0.8 * s, z));
  const pal = blossom ? ['#f6a5c0', '#f9bfd2', '#f28db0'] : colors;
  const blobs = [[0, 2.05, 0, 1.0], [0.55, 1.75, 0.25, 0.66], [-0.5, 1.8, -0.2, 0.7], [0.1, 2.6, -0.1, 0.62]];
  blobs.forEach(([dx, dy, dz, rr], i) => group.add(at(scl(ico(rr * s, pal[Math.abs(i + Math.round(x * 3)) % pal.length], { rough: 0.85 }, 1), 1, 0.92, 1), x + dx * s, dy * s, z + dz * s)));
  return { type: 'circle', x, z, r: 0.28 * s };
}
export function bush(group, x, z, rr, color = '#5aa84f') {
  group.add(at(scl(ico(rr, color, { rough: 0.85 }, 1), 1, 0.8, 1), x, rr * 0.62, z));
  group.add(at(scl(ico(rr * 0.68, '#6dbb58', { rough: 0.85 }, 1), 1, 0.8, 1), x + rr * 0.55, rr * 0.45, z + rr * 0.25));
}
// A low clipped hedge along a straight line.
export function hedge(group, x0, z0, x1, z1, h = 0.7, t = 0.7, color = '#5aa84f') {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const m = rbox(len, h, t, color, 0.22, { rough: 0.85 });
  m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
  m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
  group.add(m);
  const top = rbox(len - 0.1, 0.12, t - 0.1, '#6dbb58', 0.05, { rough: 0.85 });
  top.position.set(m.position.x, h - 0.02, m.position.z);
  top.rotation.y = m.rotation.y;
  group.add(top);
  return { type: 'box', x: m.position.x, z: m.position.z, hw: Math.abs(x1 - x0) / 2 + t / 2, hd: Math.abs(z1 - z0) / 2 + t / 2, h };
}

// ------------------------------------------------------------------ flat paths
// A ribbon following a smooth curve through points [[x, z], ...] on the ground, with soft darker edges.
export function pathGeo(points, width, color, { y = 0.012, closed = false, edge = '#e3c08e', step = 0.25 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), closed, 'centripetal');
  const n = Math.max(2, Math.ceil(curve.getLength() / step));
  const pts = curve.getSpacedPoints(n);
  const us = [-1, -0.86, 0.86, 1];
  const cols = [edge, color, color, edge].map((c) => new THREE.Color(c));
  const pos = [];
  const col = [];
  const idx = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const L = Math.hypot(dx, dz) || 1;
    const nx = -dz / L;
    const nz = dx / L;
    us.forEach((u, j) => {
      pos.push(p.x + nx * u * width * 0.5, y, p.z + nz * u * width * 0.5);
      col.push(cols[j].r, cols[j].g, cols[j].b);
    });
    if (i < pts.length - 1) for (let j = 0; j < 3; j++) {
      const k = i * 4 + j;
      idx.push(k, k + 1, k + 4, k + 1, k + 5, k + 4);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const ng = g.toNonIndexed();
  ng.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(ng.attributes.position.count * 2), 2));
  return ng;
}
export function discGeo(r, color, { y = 0.014, edge = '#e3c08e', seg = 32, sx = 1, sz = 1 } = {}) {
  const g = merge([part(new THREE.CircleGeometry(r * 0.94, seg), color, 0, y + 0.001, 0, { rx: -Math.PI / 2 }), part(new THREE.RingGeometry(r * 0.93, r, seg), edge, 0, y, 0, { rx: -Math.PI / 2 })]);
  return g.scale(sx, 1, sz);
}
export const vcMesh = (geo, { rough = 0.85, cast = false, receive = true, flat = false } = {}) => mesh(geo, vcMaterial(rough, 0, flat), { cast, receive });

// ------------------------------------------------------------------ butterflies (all in two draw calls)
const MIRROR = new THREE.Matrix4().makeScale(-1, 1, 1);
const WM = new THREE.Matrix4();
export class Butterflies {
  // spots: [{ x0, x1, z0, z1, y }] home areas, one per butterfly (cycled)
  constructor(n, colors, spots, seed = 3) {
    const r = rng(seed);
    const wing = new THREE.Shape();
    wing.moveTo(0, 0);
    wing.bezierCurveTo(0.05, 0.12, 0.17, 0.12, 0.16, 0.02);
    wing.bezierCurveTo(0.16, -0.04, 0.1, -0.05, 0.06, -0.04);
    wing.bezierCurveTo(0.11, -0.08, 0.08, -0.14, 0.03, -0.1);
    wing.lineTo(0, 0);
    const wg = new THREE.ShapeGeometry(wing, 8);
    wg.rotateX(-Math.PI / 2);
    this.wings = new THREE.InstancedMesh(wg, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, side: THREE.DoubleSide }), n * 2);
    this.bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.012, 0.07, 2, 6).rotateX(Math.PI / 2), mat('#3b2b3f', { rough: 0.6 }), n);
    for (const im of [this.wings, this.bodies]) {
      im.castShadow = false;
      im.frustumCulled = false;
    }
    this.list = [];
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const col = colors[i % colors.length];
      this.wings.setColorAt(i * 2, c.set(col));
      this.wings.setColorAt(i * 2 + 1, c.set(col));
      const spot = spots[i % spots.length];
      this.list.push({ spot, ph: r() * 50, sp: 0.18 + r() * 0.12, pos: new THREE.Vector3((spot.x0 + spot.x1) / 2, spot.y, (spot.z0 + spot.z1) / 2), yaw: 0, target: null, flap: 0 });
    }
    this.group = new THREE.Group();
    this.group.add(this.wings, this.bodies);
    this.m = new THREE.Matrix4();
    this.w = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.s = new THREE.Vector3(1, 1, 1);
    this.tmp = new THREE.Vector3();
  }

  // focus: optional { x, y, z, r } that pulls every butterfly toward it (a picnic)
  update(dt, t, focus = null) {
    const { m, w, q, s, tmp } = this;
    this.list.forEach((b, i) => {
      const a = b.spot;
      const k = t * b.sp + b.ph;
      let x;
      let y;
      let z;
      if (focus) {
        const ang = k * 2.2 + i * 1.7;
        x = focus.x + Math.cos(ang) * focus.r * (0.6 + 0.4 * Math.sin(k * 1.3));
        z = focus.z + Math.sin(ang) * focus.r * 0.8;
        y = focus.y + Math.sin(t * 1.9 + b.ph) * 0.25 + 0.2 * Math.sin(k);
      } else {
        const cx = (a.x0 + a.x1) / 2;
        const cz = (a.z0 + a.z1) / 2;
        x = cx + Math.sin(k) * (a.x1 - a.x0) * 0.5 * Math.cos(k * 0.37);
        z = cz + Math.sin(k * 1.3) * (a.z1 - a.z0) * 0.5;
        y = a.y + Math.sin(t * 1.7 + b.ph) * 0.3 + Math.sin(k * 0.5) * 0.4;
      }
      tmp.set(x, y, z);
      const blend = 1 - Math.exp(-2.5 * dt);
      const dx = tmp.x - b.pos.x;
      const dz = tmp.z - b.pos.z;
      b.pos.lerp(tmp, dt > 0 ? blend : 1);
      if (Math.abs(dx) + Math.abs(dz) > 1e-4) b.yaw = Math.atan2(dx, dz);
      const flap = Math.sin(t * 22 + b.ph) * 1.0;
      m.compose(b.pos, q.setFromAxisAngle(tmp.set(0, 1, 0), b.yaw), s.set(1, 1, 1));
      this.bodies.setMatrixAt(i, m);
      for (const side of [0, 1]) {
        w.makeRotationZ(flap);
        if (side) w.premultiply(MIRROR);
        this.wings.setMatrixAt(i * 2 + side, WM.multiplyMatrices(m, w));
      }
    });
    this.wings.instanceMatrix.needsUpdate = true;
    this.bodies.instanceMatrix.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ fairy lights (bulbs, halos and wires in three draw calls)
export const BULB_COLS = ['#fff3c4', '#ff9ec4', '#ffd36b', '#8ff0e0', '#d6b8ff', '#ffb38a'];
export class FairyLights {
  constructor() {
    this.bulbs = [];
    this.wires = [];
  }

  // A drooping string from a to b ([x, y, z]) with n bulbs
  string(a, b, n = 10, sag = 0.35) {
    const A = new THREE.Vector3(...a);
    const B = new THREE.Vector3(...b);
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const k = i / 16;
      const p = A.clone().lerp(B, k);
      p.y -= Math.sin(k * Math.PI) * sag;
      pts.push(p);
    }
    this.wires.push(new THREE.CatmullRomCurve3(pts));
    for (let i = 1; i <= n; i++) {
      const k = i / (n + 1);
      const p = A.clone().lerp(B, k);
      p.y -= Math.sin(k * Math.PI) * sag + 0.05;
      this.bulbs.push({ p, c: BULB_COLS[this.bulbs.length % BULB_COLS.length], ph: Math.random() * 6.28 });
    }
  }

  build(group) {
    const wireGeos = this.wires.map((c) => part(new THREE.TubeGeometry(c, 20, 0.012, 4, false), '#4a3a3a'));
    if (wireGeos.length) group.add(vcMesh(merge(wireGeos), { rough: 0.6, cast: false }));
    const n = this.bulbs.length;
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 6, 4).scale(1, 1.25, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), n);
    this.halo = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }), n);
    const m4 = new THREE.Matrix4();
    const c = new THREE.Color();
    this.bulbs.forEach((b, i) => {
      m4.makeTranslation(b.p.x, b.p.y, b.p.z);
      this.mesh.setMatrixAt(i, m4);
      this.halo.setMatrixAt(i, m4);
      this.mesh.setColorAt(i, c.set(b.c));
      this.halo.setColorAt(i, c.set(b.c));
    });
    for (const im of [this.mesh, this.halo]) {
      im.castShadow = false;
      im.receiveShadow = false;
      im.computeBoundingSphere();
      group.add(im);
    }
    this.col = new THREE.Color();
    this.base = this.bulbs.map((b) => new THREE.Color(b.c));
    return [this.mesh, this.halo];
  }

  update(t, glow = 0) {
    if (!this.mesh) return;
    const c = this.col;
    this.bulbs.forEach((b, i) => {
      const k = 0.72 + 0.28 * Math.sin(t * 2.2 + b.ph) + glow * 0.2;
      c.copy(this.base[i]).multiplyScalar(Math.min(1.25, k));
      this.mesh.setColorAt(i, c);
      this.halo.setColorAt(i, c.multiplyScalar(0.6 + glow));
    });
    this.mesh.instanceColor.needsUpdate = true;
    this.halo.instanceColor.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ little synth sounds
export function sfx(getSound) {
  const tone = (f, delay, dur, o) => {
    const S = getSound();
    const c = S?.ctx;
    if (!c || S.muted) return;
    S.tone(f, c.currentTime + delay, dur, o);
  };
  return {
    tone,
    pop: () => tone(480, 0, 0.12, { gain: 0.07, slideTo: 900 }),
    quack: (d = 0, p = 1) => {
      tone(420 * p, d, 0.11, { type: 'sawtooth', gain: 0.03, slideTo: 300 * p });
      tone(840 * p, d, 0.08, { type: 'square', gain: 0.012, slideTo: 600 * p });
    },
    peep: (d = 0) => tone(1500 + Math.random() * 300, d, 0.07, { gain: 0.03, slideTo: 1900 }),
    bell: (d = 0) => {
      for (const [k, dd] of [[0, 0], [1, 0.16]]) {
        tone(2350, d + dd, 0.5, { gain: 0.05 - k * 0.01 });
        tone(3520, d + dd, 0.3, { gain: 0.02 });
      }
    },
    whee: (d = 0) => tone(520, d, 0.5, { type: 'triangle', gain: 0.04, slideTo: 1050, attack: 0.04 }),
    chime: (d = 0) => [76, 79, 83, 88].forEach((n, i) => tone(440 * Math.pow(2, (n - 69) / 12), d + i * 0.09, 0.6, { gain: 0.04 })),
    splash: (d = 0) => tone(900, d, 0.12, { type: 'triangle', gain: 0.03, slideTo: 200 }),
    swish: (d = 0) => tone(300, d, 0.35, { type: 'triangle', gain: 0.025, slideTo: 180, attack: 0.08 }),
  };
}
