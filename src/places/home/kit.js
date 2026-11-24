import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat as baseMat, umat, mesh, canvasTexture, roundRect, FONT, heartShape, bakeStatic } from '../../util.js';

// Small building blocks shared by the home exterior and interior.

export { THREE, RoundedBoxGeometry, mergeGeometries, umat, mesh, canvasTexture, roundRect, FONT };

// Shared materials (roughness in three steps so more meshes can merge)
export function mat(color, o = {}) {
  if (o.emissive || o.map || o.transparent || o.side) return baseMat(color, o);
  const rough = o.rough === undefined ? 0.78 : o.rough;
  return baseMat(color, { ...o, rough: rough < 0.45 ? 0.3 : rough < 0.72 ? 0.6 : 0.85 });
}

// Merge every plain-coloured, non-glowing static mesh under `group` into a few meshes with vertex
// colours (one per roughness, metalness and shadow setting). Colours stay exact, draw calls drop a lot.
// skip: objects (and their children) to leave alone. Returns the merged meshes.
// single: put everything in one mesh (one draw call) whatever its roughness or shadow settings;
// used for small moving parts and the cut-away walls. cast: shadow casting for that one mesh.
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
    const key = single ? 'one' : `${rough}|${metal}|${m.flatShading ? 1 : 0}|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}`;
    if (!buckets.has(key)) buckets.set(key, { rough, metal, flat: single ? false : m.flatShading, cast: single ? cast : o.castShadow, receive: single ? true : o.receiveShadow, list: [] });
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
// For a moving group: merge its fixed parts in place, into one mesh
export const bake = (group, keep = []) => (colorBake(group, keep, { single: true }), group);

export const M = (c, o) => (typeof c === 'string' ? mat(c, o) : c);
// Small things do not cast shadows (fewer shadow draw calls)
const sm = (geo, c, o, size) => mesh(geo, M(c, o), { cast: size >= 0.28 });
export const box = (w, h, d, c, o) => sm(new THREE.BoxGeometry(w, h, d), c, o, Math.max(w, h, d));
// Fewer segments on small pieces: they look the same from the camera and cost far fewer triangles
const rcache = new Map();
export const rbox = (w, h, d, c, r = 0.06, o) => {
  const rr = Math.min(r, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002);
  const seg = Math.max(w, h, d) < 0.7 || rr < 0.025 ? 1 : 2;
  const key = `${w}|${h}|${d}|${rr}|${seg}`;
  if (!rcache.has(key)) rcache.set(key, new RoundedBoxGeometry(w, h, d, seg, rr));
  return sm(rcache.get(key), c, o, Math.max(w, h, d));
};
export const cyl = (rt, rb, h, c, seg = 16, o) => sm(new THREE.CylinderGeometry(rt, rb, h, Math.max(rt, rb) < 0.06 ? Math.min(seg, 8) : seg), c, o, Math.max(rt * 2, rb * 2, h));
export const sph = (r, c, o, seg = 14) => {
  const s2 = r < 0.04 ? Math.min(seg, 8) : r < 0.1 ? Math.min(seg, 10) : seg;
  return sm(new THREE.SphereGeometry(r, s2, Math.max(6, Math.round(s2 * 0.7))), c, o, r * 2);
};
export const tor = (r, t, c, o, arc = Math.PI * 2, rs = 8, ts = 20) => sm(new THREE.TorusGeometry(r, t, rs, ts, arc), c, o, r * 2);
export const at = (o, x, y, z) => (o.position.set(x, y, z), o);
export const rot = (o, x, y, z) => (o.rotation.set(x, y, z), o);

// Merge the static meshes inside a moving group (a door, the mobile) into one mesh per material.
export const bakeMat = (group, keep = []) => (bakeStatic(group, keep, mergeGeometries), group);

// One canvas for many small flat decals (clock, posters, labels): one material, one draw call.
export function makeAtlas(W = 2048, H = 2048) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const material = umat('#ffffff', { rough: 0.85, map: tex });
  let x = 0;
  let y = 0;
  let row = 0;
  const PAD = 6;
  // Paint a cell and point a geometry's 0..1 uvs into it
  const cell = (w, h, draw, geo) => {
    if (x + w > W) {
      x = 0;
      y += row + PAD;
      row = 0;
    }
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
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (cx + uv.getX(i) * w) / W, 1 - (cy + h) / H + (uv.getY(i) * h) / H);
    return geo;
  };
  return {
    material,
    cell,
    // A flat decal facing +Z
    panel: (wm, hm, pw, ph, draw) => mesh(cell(pw, ph, draw, new THREE.PlaneGeometry(wm, hm)), material, { cast: false }),
    // Any geometry with 0..1 uvs (a disc, a rounded slab)
    wrap: (geo, pw, ph, draw, cast = false) => mesh(cell(pw, ph, draw, geo), material, { cast }),
  };
}

export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Scale a geometry's uvs so a repeating texture keeps one tile per `tile` metres.
export function uvScale(geo, sx, sy) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
  return geo;
}

// A canvas texture that tiles.
export function pattern(w, h, base, draw) {
  const t = canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    draw?.(ctx, w, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export const texMat = (map, o = {}) => umat('#ffffff', { rough: 0.85, ...o, map });

// A flat textured panel facing +Z.
export function panel(w, h, map, o = {}) {
  return mesh(new THREE.PlaneGeometry(w, h), texMat(map, o), { cast: false });
}

// Text painted on a rounded label (Fredoka).
export function labelTex(lines, o = {}) {
  return canvasTexture(o.w || 512, o.h || 160, labelDraw(lines, o));
}
export function labelDraw(lines, { bg = '#fff7ea', border = '#ef5b6f', color = '#4a3423', accent = '#ef5b6f', radius = 30, under = null } = {}) {
  return (ctx, w, h) => {
    if (under) {
      ctx.fillStyle = under;
      ctx.fillRect(0, 0, w, h);
    }
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
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Shrink the font until the text fits the label
    const fitText = (text, size, y) => {
      ctx.font = `600 ${size}px ${FONT}`;
      const tw = ctx.measureText(text).width;
      if (tw > w - 56) ctx.font = `600 ${Math.floor((size * (w - 56)) / tw)}px ${FONT}`;
      ctx.fillText(text, w / 2, y);
    };
    if (lines.length === 1) {
      ctx.fillStyle = color;
      fitText(lines[0], Math.round(h * 0.46), h / 2 + 4);
    } else {
      ctx.fillStyle = accent;
      fitText(lines[0], Math.round(h * 0.22), h * 0.3);
      ctx.fillStyle = color;
      fitText(lines[1], Math.round(h * 0.34), h * 0.66);
    }
  };
}

// Soft round glow for sprites (smoke, steam, sparkles).
let glow = null;
export function glowTex() {
  return (glow ??= canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }));
}

export function sprite(map, { color = '#ffffff', opacity = 1, scale = 0.3 } = {}) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false, opacity }));
  s.scale.setScalar(scale);
  return s;
}

// A small speech bubble sprite ("Meow!", "zzz").
export function bubbleTex(text, { color = '#4a3423', bg = '#ffffff', w = 256, h = 160 } = {}) {
  return canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = bg;
    ctx.strokeStyle = 'rgba(80,50,60,0.25)';
    ctx.lineWidth = 6;
    roundRect(ctx, 8, 8, w - 16, h - 50, 40);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.42, h - 44);
    ctx.lineTo(w * 0.5, h - 10);
    ctx.lineTo(w * 0.58, h - 44);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.round(h * 0.36)}px ${FONT}`;
    ctx.fillText(text, w / 2, (h - 42) / 2 + 6);
  });
}

export function starShape(R = 0.12, r = 0.05, n = 5) {
  const s = new THREE.Shape();
  for (let k = 0; k < n * 2; k++) {
    const rr = k % 2 ? r : R;
    const a = (k / (n * 2)) * Math.PI * 2 + Math.PI / 2;
    if (k === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  return s;
}

export function starGeo(R, r, depth = 0.03) {
  const g = new THREE.ExtrudeGeometry(starShape(R, r), { depth, bevelEnabled: true, bevelSize: depth * 0.4, bevelThickness: depth * 0.4, bevelSegments: 1 });
  g.translate(0, 0, -depth / 2);
  return g;
}

// The classic parametric heart with fewer points (util.heartShape uses 48)
function lowHeart(size, n) {
  const s = new THREE.Shape();
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    if (i === 0) s.moveTo((x / 34) * size, ((y + 4) / 30) * size);
    else s.lineTo((x / 34) * size, ((y + 4) / 30) * size);
  }
  return s;
}

// A heart centred on the origin, facing +Z.
export function heartGeo(size, depth = 0.04) {
  const g = new THREE.ExtrudeGeometry(lowHeart(size, size < 0.2 ? 20 : 32), { depth, bevelEnabled: true, bevelSize: depth * 0.35, bevelThickness: depth * 0.35, bevelSegments: size < 0.2 ? 1 : 2 });
  g.computeBoundingBox();
  const b = g.boundingBox;
  g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -depth / 2);
  return g;
}

// A plump pillow: thick in the middle, thin pinched corners. w (x) by h (y) by d (z).
export function pillowGeo(w, h, d, seg = 20) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const sx = Math.sign(x) * Math.pow(Math.abs(x), 0.42);
    const sz = Math.sign(z) * Math.pow(Math.abs(z), 0.42);
    const edge = Math.max(Math.abs(sx), Math.abs(sz));
    p.setXYZ(i, (sx * w) / 2, ((y * h) / 2) * (1 - 0.6 * Math.pow(edge, 3)), (sz * d) / 2);
  }
  g.computeVertexNormals();
  return g;
}

// Fit an object (prop) so its largest side is `size` metres, base at y = 0, centred on x/z.
export function fit(obj, size) {
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

// Merge a few meshes that share one material into one (for moving parts).
export function mergeInto(meshes, material) {
  const gs = meshes.map((m) => {
    m.updateMatrix();
    const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix);
    for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
    return g;
  });
  return mesh(mergeGeometries(gs, false), material);
}

// Sky seen through windows: day or night.
export function makeSky() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (night) => {
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, night ? '#1c2350' : '#8fd3ff');
    g.addColorStop(1, night ? '#53468a' : '#e7f7ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = night ? '#fff6cf' : '#ffffff';
    if (night) {
      for (let i = 0; i < 18; i++) ctx.fillRect((i * 53) % 128, (i * 31) % 90, 3, 3);
      ctx.beginPath();
      ctx.arc(88, 36, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = night ? '#2a2f62' : '#fff';
      ctx.beginPath();
      ctx.arc(95, 31, 13, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(40, 44, 22, 10, 0, 0, Math.PI * 2);
      ctx.ellipse(56, 38, 16, 10, 0, 0, Math.PI * 2);
      ctx.ellipse(96, 70, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = night ? '#2c3a3a' : '#9ad06a';
    ctx.beginPath();
    ctx.ellipse(30, 132, 60, 26, 0, 0, Math.PI * 2);
    ctx.ellipse(110, 136, 50, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    tex.needsUpdate = true;
  };
  draw(false);
  return { tex, material: new THREE.MeshBasicMaterial({ map: tex }), draw };
}
