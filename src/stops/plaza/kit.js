import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, umat, mesh, canvasTexture, roundRect, FONT, rng, heartShape } from '../../util.js';

// Small helpers and the palette shared by the Play Park parts.
export { THREE, mat, umat, mesh, canvasTexture, roundRect, FONT, rng, heartShape };

export const P = {
  cream: '#fff4e4',
  ivory: '#fffaf1',
  peach: '#ffc9a8',
  pink: '#ff8fb1',
  rose: '#ef5b9e',
  blush: '#ffd3e0',
  teal: '#21a99a',
  tealDark: '#17867b',
  mint: '#9fe3cf',
  sun: '#ffd166',
  gold: '#f4c24f',
  lilac: '#b9a6ff',
  violet: '#8b5cf6',
  sky: '#7fd3ff',
  navy: '#2b2550',
  ink: '#3b2b3f',
  wood: '#a8724a',
  woodDark: '#7a5234',
  stone: '#ebe3d4',
  stoneDark: '#cfc2ab',
  iron: '#3f4a5c',
  green: '#6dbb58',
  greenDark: '#4f9a45',
  soil: '#7a5638',
  white: '#ffffff',
  red: '#e5484d',
};

const M = (c, o) => (typeof c === 'string' ? mat(c, o) : c);
export const at = (o, x, y, z) => (o.position.set(x, y, z), o);
export const box = (w, h, d, c, o) => mesh(new THREE.BoxGeometry(w, h, d), M(c, o));
// Rounded box; small radii are just a box, big pieces can ask for smoother corners (seg 2)
export const rbox = (w, h, d, c, r = 0.06, seg = 1) => (r < 0.035 ? box(w, h, d, c) : mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)), M(c)));
export const cyl = (rt, rb, h, c, seg = 16, o) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(c, o));
export const sph = (r, c, seg = 14, o) => mesh(new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7))), M(c, o));

// A tube along points (an arch, a garland wire).
export function tube(points, r, c, seg = 32, radial = 5) {
  const curve = new THREE.CatmullRomCurve3(points);
  return mesh(new THREE.TubeGeometry(curve, seg, r, radial, false), M(c));
}

// Points along an elliptic arch from a to b (Vector3s) rising `rise` metres in the middle.
export function archPoints(a, b, rise, n = 24) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const p = a.clone().lerp(b, k);
    p.y += Math.sin(k * Math.PI) * rise;
    out.push(p);
  }
  return out;
}


// Soft round glow, white in the middle.
let glowTex = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  glowTex = canvasTexture(128, 128, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.6)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.16)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
  return glowTex;
}

// A four-point twinkle star for sparkles.
let starTex = null;
export function starTexture() {
  if (starTex) return starTex;
  starTex = canvasTexture(64, 64, (ctx, w) => {
    const c = w / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c * 0.5);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      ctx.beginPath();
      ctx.moveTo(c - dx * c, c - dy * c);
      ctx.quadraticCurveTo(c, c, c + dy * 3, c + dx * 3);
      ctx.quadraticCurveTo(c, c, c + dx * c, c + dy * c);
      ctx.quadraticCurveTo(c, c, c - dy * 3, c - dx * 3);
      ctx.quadraticCurveTo(c, c, c - dx * c, c - dy * c);
      ctx.fill();
    }
  });
  return starTex;
}

// Every painted label of the park on one canvas, so they all share a material and merge.
export class Atlas {
  constructor(w = 1024, h = 1024) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');
    this.x = 8;
    this.y = 8;
    this.row = 0;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 8;
    // Painted signs and boards, softly lit at night; neon and screens glow brighter
    this.paint = new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.8, emissive: '#ffffff', emissiveMap: this.tex, emissiveIntensity: 0.1, alphaTest: 0.5 });
    this.neon = new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.5, emissive: '#ffffff', emissiveMap: this.tex, emissiveIntensity: 0.55, alphaTest: 0.5 });
  }

  // Draw a w x h region; returns its rect for plane().
  add(w, h, draw) {
    const W = this.canvas.width;
    if (this.x + w + 8 > W) {
      this.x = 8;
      this.y += this.row + 12;
      this.row = 0;
    }
    const r = { x: this.x, y: this.y, w, h };
    const c = this.ctx;
    c.save();
    c.translate(r.x, r.y);
    c.beginPath();
    c.rect(0, 0, w, h);
    c.clip();
    draw(c, w, h);
    c.restore();
    this.x += w + 12;
    this.row = Math.max(this.row, h);
    if (r.y + h > this.canvas.height) console.warn('plaza atlas is full');
    this.tex.needsUpdate = true;
    return r;
  }

  // Remap a geometry's 0..1 uvs into the rect.
  fit(geo, r) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (r.x + uv.getX(i) * r.w) / W, 1 - (r.y + (1 - uv.getY(i)) * r.h) / H);
    return geo;
  }

  plane(r, w, h, neon = false) {
    return mesh(this.fit(new THREE.PlaneGeometry(w, h), r), neon ? this.neon : this.paint, { cast: false });
  }
}

// Centred text that shrinks to fit the width.
export function fitText(ctx, text, x, y, maxW, size, weight = 700) {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (ctx.measureText(text).width > maxW && s > 8) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
  ctx.fillText(text, x, y);
}

export function heartPath(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.9, cy - s * 0.25, cx + s * 0.45, cy - s * 0.95, cx, cy - s * 0.45);
  ctx.bezierCurveTo(cx - s * 0.45, cy - s * 0.95, cx - s * 0.9, cy - s * 0.25, cx, cy + s * 0.35);
  ctx.closePath();
}

// A mesh's geometry in `root` coordinates, with only position, normal, uv (and colour when asked).
const rel = new THREE.Matrix4();
export function geoIn(o, root, keepColor = false) {
  root.updateMatrixWorld(true);
  const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
  const keep = ['position', 'normal', 'uv', ...(keepColor ? ['color'] : [])];
  for (const name of Object.keys(g.attributes)) if (!keep.includes(name)) g.deleteAttribute(name);
  g.morphAttributes = {};
  g.clearGroups();
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  rel.copy(root.matrixWorld).invert().multiply(o.matrixWorld);
  g.applyMatrix4(rel);
  if (rel.determinant() < 0) {
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
  return g;
}

function paintGeo(g, color) {
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([color.r, color.g, color.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
}

// Merge every static mesh under `group` into a handful of vertex-coloured meshes, one per kind of surface
// (matte, satin, shiny metal, faceted, two-sided, glowing), plus one per texture. Things that glow become
// unlit colour, so lamps and neon read as lit by day and night. Returns the merged meshes.
export function bakePark(group, skip, mergeGeometries) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  const victims = [];
  const glowC = new THREE.Color();
  const scaleV = new THREE.Vector3();
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || skip.has(o) || o.children.length) return;
    for (let p = o.parent; p && p !== group; p = p.parent) if (skip.has(p)) return;
    const m = o.material;
    if (Array.isArray(m) || m.transparent) return;
    const keepColor = !!(m.vertexColors && o.geometry.attributes.color);
    let kind;
    let color = m.color;
    if (m.map) kind = 'map:' + m.uuid;
    else if (m.isMeshBasicMaterial) kind = 'glow';
    else if (m.emissive && m.emissiveIntensity > 0 && m.emissive.r + m.emissive.g + m.emissive.b > 0.15) {
      kind = 'glow';
      color = glowC.copy(m.color).lerp(m.emissive, 0.45);
    } else if (m.side !== THREE.FrontSide) kind = 'double';
    else if (m.flatShading) kind = 'flat';
    else if (m.metalness >= 0.3 || m.roughness < 0.4) kind = 'gloss';
    else if (m.roughness < 0.7) kind = 'satin';
    else kind = 'matte';
    // Only pieces bigger than a hand cast a shadow
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const ws = o.getWorldScale(scaleV);
    const cast = o.castShadow && o.geometry.boundingSphere.radius * Math.max(ws.x, ws.y, ws.z) > 0.16;
    const key = kind === 'glow' ? 'glow' : kind + (cast ? 'c' : '') + (o.receiveShadow ? 'r' : '');
    if (!buckets.has(key)) buckets.set(key, { kind, m, cast, receive: o.receiveShadow, list: [] });
    const g = geoIn(o, group, keepColor);
    if (!kind.startsWith('map') && !keepColor) paintGeo(g, color);
    buckets.get(key).list.push(g);
    victims.push(o);
  });
  for (const o of victims) o.removeFromParent();
  const MATS = {
    matte: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }),
    satin: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.52 }),
    gloss: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.45 }),
    flat: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }),
    double: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }),
    glow: () => new THREE.MeshBasicMaterial({ vertexColors: true }),
  };
  const made = {};
  const out = [];
  for (const b of buckets.values()) {
    const material = b.kind.startsWith('map') ? b.m : (made[b.kind] ||= MATS[b.kind]());
    const merged = mergeGeometries(b.list, false);
    for (const g of b.list) g.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = b.cast && b.kind !== 'glow';
    mesh.receiveShadow = b.receive;
    group.add(mesh);
    out.push(mesh);
  }
  return out;
}

// One instanced mesh for many little lights: bulbs[i] = { p: Vector3, base: Color, group }.
// Colours are written each frame by the caller (MeshBasicMaterial, so they always read as lit).
export function bulbMesh(list, r = 0.045) {
  const geo = new THREE.IcosahedronGeometry(r, 0);
  const im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), list.length);
  const m4 = new THREE.Matrix4();
  list.forEach((b, i) => {
    m4.makeTranslation(b.p.x, b.p.y, b.p.z);
    im.setMatrixAt(i, m4);
    im.setColorAt(i, b.base);
  });
  im.instanceMatrix.needsUpdate = true;
  im.computeBoundingSphere();
  return im;
}

// One small canvas for every animated screen in the park (the arcade games, the DJ's equaliser), so they
// all draw as one mesh. add(rect, geo, draw): geo is a plane already placed in the park's coordinates.
export class Screens {
  constructor(w = 512, h = 256) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.c = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.geos = [];
    this.draws = [];
    this.timer = 0;
  }

  add(r, geo, draw) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (r.x + uv.getX(i) * r.w) / W, 1 - (r.y + (1 - uv.getY(i)) * r.h) / H);
    this.geos.push(geo);
    this.draws.push({ r, draw });
  }

  mesh(mergeGeometries) {
    return mesh(mergeGeometries(this.geos, false), new THREE.MeshBasicMaterial({ map: this.tex }), { cast: false });
  }

  // About ten pictures a second
  update(dt, t, S) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.1;
    const c = this.c;
    for (const { r, draw } of this.draws) {
      c.save();
      c.translate(r.x, r.y);
      c.beginPath();
      c.rect(0, 0, r.w, r.h);
      c.clip();
      draw(c, r.w, r.h, t, S);
      c.restore();
    }
    this.tex.needsUpdate = true;
  }
}
