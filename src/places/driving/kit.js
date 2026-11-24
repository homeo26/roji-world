import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, mesh, canvasTexture, roundRect, heartShape, bakeStatic, FONT } from '../../util.js';

// Models, paintings and helpers shared by Little Wheels Driving School, its office and the Driving Lesson game.

export const C = {
  cream: '#fff1dc',
  wall: '#fff6ea',
  peach: '#ffc9a8',
  pink: '#ff9eb5',
  blush: '#ffd1dc',
  rose: '#ef5b6f',
  coral: '#f6907a',
  sun: '#ffd166',
  sunDeep: '#f4a742',
  teal: '#21a99a',
  mint: '#7fd8bf',
  mintPale: '#d6f4ea',
  sky: '#8fd3ff',
  blue: '#3f7bf0',
  lilac: '#c7a6ff',
  wood: '#d4a373',
  woodDark: '#9b6a43',
  white: '#fffaf4',
  ink: '#3b2b3f',
  steel: '#d3dbe5',
  road: '#c9c2d4',
  roadDark: '#b4acc2',
  line: '#fffaf0',
  cone: '#ff8a5c',
  leaf: '#6cc24a',
  leafDark: '#3f9a4f',
  leafLight: '#8fd86a',
  cork: '#d9a86c',
};

// The arena saves the licence meter here (ctx.save in src/arena/drivinglesson.js); the place reads it.
const readNum = (key, fb) => {
  try {
    const v = localStorage.getItem(`roji-arena-drivinglesson-${key}`);
    return v === null ? fb : +JSON.parse(v) || fb;
  } catch {
    return fb;
  }
};
export const licenceProgress = () => Math.max(0, Math.min(100, readNum('licence', 0)));
export const lessonsDone = () => readNum('lessons', 0);
// The course of eight lessons: { stars: [8], best: [8], done: [8] } for Roji ('course') or Homama ('hcourse')
export const LESSON_COUNT = 8;
export const COURSE_TITLES = ['First drive', 'Roundabout traffic', 'School zone', 'Parking', 'Rainy day', 'Night drive', 'Hill and bridge', 'The driving test'];
export function courseState(key = 'course') {
  try {
    const v = JSON.parse(localStorage.getItem(`roji-arena-drivinglesson-${key}`) || 'null');
    if (v && Array.isArray(v.stars)) return v;
  } catch {
    /* fall through */
  }
  return null;
}

// ------------------------------------------------------------------ primitives (geometry cache per build)
export function kit() {
  const cache = new Map();
  const g = (key, make) => {
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
  };
  const M = (c, o) => (typeof c === 'string' ? mat(c, o) : c);
  return {
    geo: g,
    box: (w, h, d, c, o) => mesh(g(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), M(c, o)),
    rbox: (w, h, d, c, r = 0.08, o) => mesh(g(`r${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, r >= 0.05 ? 2 : 1, r)), M(c, o)),
    cyl: (a, b, h, c, seg = 16, o) => mesh(g(`c${a},${b},${h},${seg}`, () => new THREE.CylinderGeometry(a, b, h, seg)), M(c, o)),
    cone: (r, h, c, seg = 14, o) => mesh(g(`k${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)), M(c, o)),
    sph: (r, c, o, seg = 14) => mesh(g(`s${r},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7)))), M(c, o)),
    tor: (r, t, c, arc = Math.PI * 2, o, seg = 20) => mesh(g(`t${r},${t},${arc},${seg}`, () => new THREE.TorusGeometry(r, t, 8, seg, arc)), M(c, o)),
    cap: (r, len, c, o) => mesh(g(`p${r},${len}`, () => new THREE.CapsuleGeometry(r, len, 4, 10)), M(c, o)),
    heart: (size, depth, c, o) =>
      mesh(
        g(`h${size},${depth}`, () => {
          const geo = new THREE.ExtrudeGeometry(heartShape(size), { depth, bevelEnabled: true, bevelSize: depth * 0.4, bevelThickness: depth * 0.4, bevelSegments: 2, curveSegments: 6 });
          geo.translate(0, -size * 0.05, -depth / 2);
          return geo;
        }),
        M(c, o),
      ),
    at: (o, x, y, z, ry = 0) => (o.position.set(x, y, z), ry && (o.rotation.y = ry), o),
  };
}

// Merge every plain-coloured static mesh under `group` into a few vertex-coloured meshes (one per roughness
// and shadow setting). Textured, transparent, metallic and glowing meshes are left alone. keep: objects to skip.
export function colorBake(group, keep = [], { coarse = false } = {}) {
  group.updateMatrixWorld(true);
  const skip = new Set();
  for (const d of keep) d.traverse((o) => skip.add(o));
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const buckets = new Map();
  const victims = [];
  const shown = (o) => {
    for (let p = o; p && p !== group; p = p.parent) if (!p.visible) return false;
    return true;
  };
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || skip.has(o) || o.children.length) return;
    const m = o.material;
    if (Array.isArray(m) || !m.isMeshStandardMaterial || m.map || m.transparent || m.metalness > 0 || m.vertexColors) return;
    if (m.emissiveIntensity > 0 && m.emissive.getHex() !== 0) return;
    if (!shown(o) || !o.geometry.attributes.normal) return;
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal') geo.deleteAttribute(name);
    geo.clearGroups();
    geo.morphAttributes = {};
    rel.multiplyMatrices(inv, o.matrixWorld);
    geo.applyMatrix4(rel);
    const n = geo.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([m.color.r, m.color.g, m.color.b], i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const rough = coarse ? 0.6 : Math.round(m.roughness * 5) / 5;
    const key = `${rough}${o.castShadow ? 'c' : ''}${o.receiveShadow ? 'r' : ''}${m.side}`;
    if (!buckets.has(key)) buckets.set(key, { rough, side: m.side, cast: o.castShadow, receive: o.receiveShadow, list: [] });
    buckets.get(key).list.push(geo);
    victims.push(o);
  });
  for (const o of victims) o.removeFromParent();
  const out = [];
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.list, false);
    if (!merged) continue;
    const mm = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: b.rough, side: b.side }));
    mm.castShadow = b.cast;
    mm.receiveShadow = b.receive;
    group.add(mm);
    out.push(mm);
  }
  return out;
}

// ------------------------------------------------------------------ texture atlas
// One canvas split into cells; mesh(geo, i) remaps a geometry's uvs into cell i, so every painted
// sign, plate and poster shares one material and merges into one draw call.
export class Atlas {
  constructor(cols = 8, rows = 4, cell = 256) {
    this.cols = cols;
    this.rows = rows;
    this.cell = cell;
    this.canvas = document.createElement('canvas');
    this.canvas.width = cols * cell;
    this.canvas.height = rows * cell;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 8;
    // Cut-out materials: cells may leave their corners transparent (rounded labels, polaroids)
    this.material = new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.62, alphaTest: 0.5 });
    this.glow = new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.4, emissive: '#ffffff', emissiveMap: this.tex, emissiveIntensity: 0.55, alphaTest: 0.5 });
    this.next = 0;
  }
  // Draw into the next free cell (wide: number of cells across). Returns the cell spec.
  add(draw, wide = 1) {
    let i = this.next;
    if ((i % this.cols) + wide > this.cols) i = Math.ceil(i / this.cols) * this.cols;
    const col = i % this.cols;
    const row = Math.floor(i / this.cols);
    if (row >= this.rows) console.warn('driving atlas is full');
    this.next = i + wide;
    const s = this.cell;
    const c = this.ctx;
    c.save();
    c.translate(col * s, row * s);
    c.beginPath();
    c.rect(0, 0, wide * s, s);
    c.clip();
    draw(c, wide * s, s);
    c.restore();
    this.tex.needsUpdate = true;
    return { col, row, wide, tall: 1 };
  }
  mesh(geo, cell, { glow = false, cast = false } = {}) {
    const g = geo.clone();
    const uv = g.attributes.uv;
    const ins = 2 / this.cell;
    for (let k = 0; k < uv.count; k++) {
      const u = uv.getX(k);
      const v = uv.getY(k);
      uv.setXY(k, (cell.col + ins + u * (cell.wide - 2 * ins)) / this.cols, (this.rows - cell.row - cell.tall + ins + v * (cell.tall - 2 * ins)) / this.rows);
    }
    return mesh(g, glow ? this.glow : this.material, { cast, receive: true });
  }
  plane(w, h, cell, o) {
    return this.mesh(new THREE.PlaneGeometry(w, h), cell, o);
  }
}

// ------------------------------------------------------------------ painting helpers
const P = (n, start, r = 1) => Array.from({ length: n }, (_, i) => [Math.cos(start + (i / n) * Math.PI * 2) * r, Math.sin(start + (i / n) * Math.PI * 2) * r]);
function poly(c, w, h, pts, k = 1) {
  c.beginPath();
  pts.forEach(([x, y], i) => {
    const px = ((x * k + 1) / 2) * w;
    const py = (1 - (y * k + 1) / 2) * h;
    if (i) c.lineTo(px, py);
    else c.moveTo(px, py);
  });
  c.closePath();
}
export function star(c, x, y, r, fill, stroke = null, lw = 0) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.48 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.lineJoin = 'round';
    c.lineWidth = lw;
    c.strokeStyle = stroke;
    c.stroke();
  }
}
export function heartPath(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y + s * 0.35);
  c.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.45, y - s * 0.95, x, y - s * 0.45);
  c.bezierCurveTo(x + s * 0.45, y - s * 0.95, x + s * 0.9, y - s * 0.25, x, y + s * 0.35);
  c.closePath();
}
const text = (c, str, x, y, size, color, weight = 700, align = 'center') => {
  c.font = `${weight} ${size}px ${FONT}`;
  c.fillStyle = color;
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.fillText(str, x, y);
};
// A small duck in profile, for signs and posters
function duckIcon(c, x, y, s, color = '#ffd166') {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y + s * 0.25, s * 0.55, s * 0.36, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(x + s * 0.32, y - s * 0.2, s * 0.26, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#f4a742';
  c.beginPath();
  c.moveTo(x + s * 0.55, y - s * 0.22);
  c.lineTo(x + s * 0.82, y - s * 0.12);
  c.lineTo(x + s * 0.55, y - s * 0.05);
  c.fill();
  c.fillStyle = C.ink;
  c.beginPath();
  c.arc(x + s * 0.38, y - s * 0.26, s * 0.05, 0, Math.PI * 2);
  c.fill();
}

// Road signs. Shapes match the geometries in signGeo(): octagon, circle, up and down triangles, square.
export const SIGN_SHAPE = { stop: 'oct', giveway: 'down', roundabout: 'circle', speed20: 'circle', noentry: 'circle', oncoming: 'circle', zebra: 'square', parking: 'square', duck: 'up', lights: 'up', school: 'up', narrow: 'up', hill: 'up', bump: 'up', animal: 'up' };
export function drawSign(c, kind, w, h) {
  const shape = SIGN_SHAPE[kind];
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, w, h);
  if (shape === 'oct') {
    const pts = P(8, Math.PI / 8);
    c.fillStyle = '#ffffff';
    poly(c, w, h, pts);
    c.fill();
    c.fillStyle = '#e5484d';
    poly(c, w, h, pts, 0.88);
    c.fill();
    text(c, 'STOP', w / 2, h / 2 + 4, h * 0.3, '#ffffff');
  } else if (shape === 'circle') {
    c.beginPath();
    c.arc(w / 2, h / 2, w * 0.5, 0, Math.PI * 2);
    if (kind === 'roundabout') {
      c.fillStyle = '#3f7bf0';
      c.fill();
      c.strokeStyle = '#ffffff';
      c.lineWidth = w * 0.07;
      c.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a0 = -Math.PI / 2 + (i * Math.PI * 2) / 3;
        c.beginPath();
        c.arc(w / 2, h / 2, w * 0.24, a0 + 0.35, a0 + 1.75);
        c.stroke();
        const a = a0 + 1.75;
        const ax = w / 2 + Math.cos(a) * w * 0.24;
        const ay = h / 2 + Math.sin(a) * w * 0.24;
        c.fillStyle = '#ffffff';
        c.beginPath();
        const tx = -Math.sin(a);
        const ty = Math.cos(a);
        c.moveTo(ax + tx * w * 0.09, ay + ty * w * 0.09);
        c.lineTo(ax - ty * w * 0.08 - tx * 0.02 * w, ay + tx * w * 0.08 - ty * 0.02 * w);
        c.lineTo(ax + ty * w * 0.08 - tx * 0.02 * w, ay - tx * w * 0.08 - ty * 0.02 * w);
        c.fill();
      }
    } else if (kind === 'speed20') {
      c.fillStyle = '#ffffff';
      c.fill();
      c.lineWidth = w * 0.1;
      c.strokeStyle = '#e5484d';
      c.beginPath();
      c.arc(w / 2, h / 2, w * 0.44, 0, Math.PI * 2);
      c.stroke();
      text(c, '20', w / 2, h / 2 + 6, h * 0.42, C.ink);
    } else if (kind === 'oncoming') {
      // Give way to oncoming traffic: your arrow (black, up) and theirs (red, down)
      c.fillStyle = '#ffffff';
      c.fill();
      c.lineWidth = w * 0.1;
      c.strokeStyle = '#e5484d';
      c.beginPath();
      c.arc(w / 2, h / 2, w * 0.44, 0, Math.PI * 2);
      c.stroke();
      const arrow = (x, up, col) => {
        c.fillStyle = col;
        c.fillRect(x - w * 0.035, up ? h * 0.4 : h * 0.3, w * 0.07, h * 0.3);
        const tip = up ? h * 0.27 : h * 0.73;
        const base = up ? h * 0.41 : h * 0.59;
        c.beginPath();
        c.moveTo(x, tip);
        c.lineTo(x + w * 0.1, base);
        c.lineTo(x - w * 0.1, base);
        c.fill();
      };
      arrow(w * 0.38, true, C.ink);
      arrow(w * 0.62, false, '#e5484d');
    } else {
      c.fillStyle = '#e5484d';
      c.fill();
      c.fillStyle = '#ffffff';
      roundRect(c, w * 0.18, h * 0.42, w * 0.64, h * 0.16, 8);
      c.fill();
    }
  } else if (shape === 'up' || shape === 'down') {
    const up = shape === 'up';
    const pts = P(3, up ? Math.PI / 2 : -Math.PI / 2);
    c.fillStyle = '#e5484d';
    poly(c, w, h, pts);
    c.fill();
    c.fillStyle = '#ffffff';
    poly(c, w, h, pts, 0.7);
    c.fill();
    if (kind === 'duck') duckIcon(c, w * 0.44, h * 0.47, w * 0.2);
    else if (kind === 'lights') {
      c.fillStyle = C.ink;
      roundRect(c, w * 0.43, h * 0.27, w * 0.14, h * 0.38, 10);
      c.fill();
      ['#e5484d', '#ffd166', '#3fbf7f'].forEach((col, i) => {
        c.fillStyle = col;
        c.beginPath();
        c.arc(w / 2, h * (0.33 + i * 0.12), w * 0.04, 0, Math.PI * 2);
        c.fill();
      });
    } else if (kind === 'narrow') {
      c.fillStyle = C.ink;
      for (const s of [-1, 1]) {
        c.beginPath();
        c.moveTo(w * (0.5 + s * 0.15), h * 0.66);
        c.lineTo(w * (0.5 + s * 0.15), h * 0.56);
        c.lineTo(w * (0.5 + s * 0.06), h * 0.46);
        c.lineTo(w * (0.5 + s * 0.06), h * 0.32);
        c.lineTo(w * (0.5 + s * 0.11), h * 0.32);
        c.lineTo(w * (0.5 + s * 0.11), h * 0.44);
        c.lineTo(w * (0.5 + s * 0.2), h * 0.54);
        c.lineTo(w * (0.5 + s * 0.2), h * 0.66);
        c.fill();
      }
    } else if (kind === 'hill') {
      c.fillStyle = C.ink;
      c.beginPath();
      c.moveTo(w * 0.3, h * 0.64);
      c.lineTo(w * 0.7, h * 0.64);
      c.lineTo(w * 0.7, h * 0.38);
      c.closePath();
      c.fill();
      text(c, '1:5', w * 0.42, h * 0.46, h * 0.1, C.ink);
    } else if (kind === 'bump') {
      c.fillStyle = C.ink;
      c.beginPath();
      c.moveTo(w * 0.28, h * 0.64);
      c.quadraticCurveTo(w * 0.5, h * 0.3, w * 0.72, h * 0.64);
      c.closePath();
      c.fill();
    } else if (kind === 'animal') {
      // A little fox face
      c.fillStyle = '#f08a5d';
      c.beginPath();
      c.moveTo(w * 0.36, h * 0.36);
      c.lineTo(w * 0.42, h * 0.46);
      c.lineTo(w * 0.58, h * 0.46);
      c.lineTo(w * 0.64, h * 0.36);
      c.lineTo(w * 0.62, h * 0.52);
      c.lineTo(w * 0.5, h * 0.64);
      c.lineTo(w * 0.38, h * 0.52);
      c.closePath();
      c.fill();
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.moveTo(w * 0.42, h * 0.54);
      c.lineTo(w * 0.5, h * 0.64);
      c.lineTo(w * 0.58, h * 0.54);
      c.closePath();
      c.fill();
      c.fillStyle = C.ink;
      for (const s of [-1, 1]) {
        c.beginPath();
        c.arc(w * (0.5 + s * 0.05), h * 0.5, w * 0.014, 0, Math.PI * 2);
        c.fill();
      }
    } else if (kind === 'school') {
      c.fillStyle = C.ink;
      for (const [x, s] of [[0.42, 1], [0.58, 0.8]]) {
        c.beginPath();
        c.arc(w * x, h * 0.36, w * 0.045 * s, 0, Math.PI * 2);
        c.fill();
        roundRect(c, w * (x - 0.04 * s), h * 0.41, w * 0.08 * s, h * 0.2 * s, 6);
        c.fill();
      }
    } else if (!up) text(c, 'GIVE WAY', w / 2, h * 0.3, h * 0.085, C.ink);
  } else {
    c.fillStyle = '#3f7bf0';
    roundRect(c, 0, 0, w, h, w * 0.12);
    c.fill();
    c.strokeStyle = '#ffffff';
    c.lineWidth = w * 0.04;
    roundRect(c, w * 0.06, h * 0.06, w * 0.88, h * 0.88, w * 0.08);
    c.stroke();
    if (kind === 'parking') text(c, 'P', w / 2, h / 2 + 8, h * 0.66, '#ffffff');
    else {
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.moveTo(w * 0.5, h * 0.14);
      c.lineTo(w * 0.88, h * 0.84);
      c.lineTo(w * 0.12, h * 0.84);
      c.closePath();
      c.fill();
      for (let i = 0; i < 4; i++) {
        c.fillStyle = C.ink;
        c.fillRect(w * (0.2 + i * 0.16), h * 0.76, w * 0.1, h * 0.05);
      }
      c.beginPath();
      c.arc(w * 0.5, h * 0.42, w * 0.05, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = w * 0.045;
      c.lineCap = 'round';
      c.strokeStyle = C.ink;
      c.beginPath();
      c.moveTo(w * 0.5, h * 0.48);
      c.lineTo(w * 0.48, h * 0.6);
      c.lineTo(w * 0.42, h * 0.7);
      c.moveTo(w * 0.48, h * 0.6);
      c.lineTo(w * 0.56, h * 0.7);
      c.moveTo(w * 0.42, h * 0.53);
      c.lineTo(w * 0.58, h * 0.55);
      c.stroke();
    }
  }
}
export function signGeo(kind, size) {
  const shape = SIGN_SHAPE[kind];
  if (shape === 'oct') return new THREE.CircleGeometry(size / 2, 8, Math.PI / 8);
  if (shape === 'circle') return new THREE.CircleGeometry(size / 2, 28);
  if (shape === 'up') return new THREE.CircleGeometry(size * 0.58, 3, Math.PI / 2);
  if (shape === 'down') return new THREE.CircleGeometry(size * 0.58, 3, -Math.PI / 2);
  return new THREE.PlaneGeometry(size, size);
}

// A road sign on a post, facing +Z. The face is an atlas cell drawn with drawSign.
export function signPost(k, atlas, cells, kind, { size = 0.62, post = 1.5 } = {}) {
  if (!cells[kind]) cells[kind] = atlas.add((c, w, h) => drawSign(c, kind, w, h));
  const g = new THREE.Group();
  g.add(k.at(k.cyl(0.04, 0.05, post + size * 0.3, C.steel, 8, { rough: 0.5 }), 0, (post + size * 0.3) / 2, -0.03));
  const geo = k.geo(`sign-${kind}-${size}`, () => signGeo(kind, size));
  const back = mesh(geo, mat('#dcd4de', { side: THREE.BackSide }), { cast: true });
  back.position.set(0, post + size * 0.2, -0.025);
  const face = atlas.mesh(geo, cells[kind], { cast: true });
  face.position.set(0, post + size * 0.2, -0.02);
  g.add(back, face);
  g.add(k.at(k.cyl(0.09, 0.11, 0.08, '#b9c2cf', 10), 0, 0.04, -0.03));
  return g;
}

// L plate (learner): white square, red L
export function drawLPlate(c, w, h) {
  c.fillStyle = '#ffffff';
  roundRect(c, 4, 4, w - 8, h - 8, w * 0.1);
  c.fill();
  c.lineWidth = w * 0.03;
  c.strokeStyle = '#e8dfe4';
  c.stroke();
  c.fillStyle = '#e5484d';
  c.fillRect(w * 0.3, h * 0.18, w * 0.16, h * 0.62);
  c.fillRect(w * 0.3, h * 0.64, w * 0.42, h * 0.16);
}

// The driving school badge: a sun-yellow steering wheel with a heart in the middle
export function drawWheelBadge(c, x, y, r) {
  c.lineWidth = r * 0.22;
  c.strokeStyle = C.sunDeep;
  c.beginPath();
  c.arc(x, y, r * 0.8, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = r * 0.16;
  c.lineCap = 'round';
  for (const a of [Math.PI / 2, Math.PI * 1.17, -Math.PI * 0.17]) {
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72);
    c.stroke();
  }
  c.fillStyle = C.rose;
  heartPath(c, x, y + r * 0.05, r * 0.42);
  c.fill();
}

// A chibi portrait (head and shoulders), for photos. look: { skin, hair, top, girl, thumbs, licence }
export function drawChibi(c, x, y, s, L) {
  const hair = L.hair || '#2a1a13';
  c.fillStyle = L.top || C.blue;
  c.beginPath();
  c.ellipse(x, y + s * 0.95, s * 0.62, s * 0.5, 0, Math.PI, 0);
  c.fill();
  c.fillRect(x - s * 0.62, y + s * 0.95, s * 1.24, s * 0.4);
  if (L.girl) {
    c.fillStyle = hair;
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.arc(x + sx * s * 0.5, y + s * 0.12, s * 0.2, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.fillStyle = L.skin || '#f8dccb';
  c.beginPath();
  c.arc(x, y, s * 0.5, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = hair;
  c.beginPath();
  c.arc(x, y - s * 0.04, s * 0.53, Math.PI * 1.02, Math.PI * 1.98);
  c.quadraticCurveTo(x + s * 0.2, y - s * 0.2, x - s * 0.1, y - s * 0.16);
  c.quadraticCurveTo(x - s * 0.4, y - s * 0.12, x - s * 0.53, y);
  c.fill();
  for (const sx of [-1, 1]) {
    c.fillStyle = C.ink;
    c.beginPath();
    c.ellipse(x + sx * s * 0.19, y + s * 0.08, s * 0.065, s * 0.09, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(x + sx * s * 0.19 + s * 0.02, y + s * 0.05, s * 0.025, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,120,150,0.45)';
    c.beginPath();
    c.ellipse(x + sx * s * 0.32, y + s * 0.24, s * 0.08, s * 0.05, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = '#7a3b3b';
  c.lineWidth = s * 0.045;
  c.lineCap = 'round';
  c.beginPath();
  c.arc(x, y + s * 0.2, s * 0.11, 0.2, Math.PI - 0.2);
  c.stroke();
  if (L.glasses) {
    c.strokeStyle = C.ink;
    c.lineWidth = s * 0.035;
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.arc(x + sx * s * 0.19, y + s * 0.08, s * 0.13, 0, Math.PI * 2);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(x - s * 0.06, y + s * 0.06);
    c.lineTo(x + s * 0.06, y + s * 0.06);
    c.stroke();
  }
  if (L.mustache) {
    c.fillStyle = L.mustache;
    c.beginPath();
    c.moveTo(x, y + s * 0.2);
    c.quadraticCurveTo(x - s * 0.12, y + s * 0.13, x - s * 0.2, y + s * 0.24);
    c.quadraticCurveTo(x - s * 0.1, y + s * 0.22, x, y + s * 0.25);
    c.quadraticCurveTo(x + s * 0.1, y + s * 0.22, x + s * 0.2, y + s * 0.24);
    c.quadraticCurveTo(x + s * 0.12, y + s * 0.13, x, y + s * 0.2);
    c.fill();
  }
  if (L.girl && L.bow) {
    c.fillStyle = L.bow;
    heartPath(c, x + s * 0.36, y - s * 0.42, s * 0.16);
    c.fill();
  }
  if (L.thumbs) {
    const hx = x + s * 0.7;
    const hy = y + s * 0.62;
    c.fillStyle = L.top || C.blue;
    c.beginPath();
    c.ellipse(hx - s * 0.1, hy + s * 0.25, s * 0.13, s * 0.3, -0.5, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = L.skin || '#f6d8c6';
    roundRect(c, hx - s * 0.13, hy - s * 0.05, s * 0.26, s * 0.22, s * 0.08);
    c.fill();
    roundRect(c, hx - s * 0.1, hy - s * 0.3, s * 0.1, s * 0.3, s * 0.05);
    c.fill();
  }
  if (L.licence) {
    c.save();
    c.translate(x - s * 0.55, y + s * 0.85);
    c.rotate(-0.15);
    c.fillStyle = '#ffffff';
    roundRect(c, -s * 0.3, -s * 0.2, s * 0.6, s * 0.4, s * 0.06);
    c.fill();
    c.fillStyle = C.teal;
    c.fillRect(-s * 0.3, -s * 0.2, s * 0.6, s * 0.1);
    c.fillStyle = L.skin || '#f8dccb';
    c.fillRect(-s * 0.24, -s * 0.05, s * 0.16, s * 0.18);
    c.fillStyle = '#d0c4cc';
    c.fillRect(-s * 0.02, -s * 0.03, s * 0.26, s * 0.04);
    c.fillRect(-s * 0.02, s * 0.05, s * 0.2, s * 0.04);
    c.restore();
  }
}

// A polaroid photo with a chibi and a caption
export function drawPolaroid(c, x, y, w, h, L, caption, tilt = 0, bg = '#bfe6ff') {
  c.save();
  c.translate(x + w / 2, y + h / 2);
  c.rotate(tilt);
  c.fillStyle = 'rgba(60,30,40,0.18)';
  c.fillRect(-w / 2 + 4, -h / 2 + 6, w, h);
  c.fillStyle = '#ffffff';
  c.fillRect(-w / 2, -h / 2, w, h);
  const pw = w * 0.86;
  const ph = h * 0.7;
  const px = -pw / 2;
  const py = -h / 2 + w * 0.07;
  const gr = c.createLinearGradient(0, py, 0, py + ph);
  gr.addColorStop(0, bg);
  gr.addColorStop(1, '#ffffff');
  c.fillStyle = gr;
  c.fillRect(px, py, pw, ph);
  c.fillStyle = '#9ad06a';
  c.fillRect(px, py + ph * 0.8, pw, ph * 0.2);
  c.save();
  c.beginPath();
  c.rect(px, py, pw, ph);
  c.clip();
  if (L) drawChibi(c, 0, py + ph * 0.45, ph * 0.36, L);
  c.restore();
  if (caption) text(c, caption, 0, (py + ph + h / 2) / 2 + 2, Math.max(10, h * 0.09), C.ink, 600);
  c.restore();
}

export const HOMAMA_PHOTO = { skin: '#f6d8c6', hair: '#141010', top: '#3f7bf0', thumbs: true };
export const ROJI_PHOTO = { skin: '#f8dccb', hair: '#2a1a13', top: '#ef5b6f', girl: true, bow: '#ff7fa3' };
export const ABU_SANAD_PHOTO = { skin: '#c98f68', hair: '#3a3634', top: '#21a99a', glasses: true, mustache: '#2b2624' };

// Homama's driving certificate
export function drawCertificate(c, w, h) {
  c.fillStyle = '#fff8ea';
  c.fillRect(0, 0, w, h);
  c.strokeStyle = '#e0b45a';
  c.lineWidth = w * 0.016;
  c.strokeRect(w * 0.04, h * 0.05, w * 0.92, h * 0.9);
  c.lineWidth = w * 0.006;
  c.strokeRect(w * 0.065, h * 0.09, w * 0.87, h * 0.82);
  for (const [x, y] of [[0.065, 0.09], [0.935, 0.09], [0.065, 0.91], [0.935, 0.91]]) {
    c.fillStyle = C.rose;
    heartPath(c, w * x, h * y + w * 0.012, w * 0.028);
    c.fill();
  }
  text(c, 'LITTLE WHEELS DRIVING SCHOOL', w / 2, h * 0.19, h * 0.055, C.teal, 700);
  text(c, 'Certificate', w / 2, h * 0.33, h * 0.14, '#c98a2e', 700);
  text(c, 'Certified driver:', w / 2, h * 0.5, h * 0.07, '#6a5662', 600);
  text(c, 'Homama', w / 2, h * 0.63, h * 0.15, C.ink, 700);
  c.strokeStyle = '#e0b45a';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(w * 0.3, h * 0.72);
  c.lineTo(w * 0.7, h * 0.72);
  c.stroke();
  text(c, 'Safe, kind and careful on every road', w / 2, h * 0.79, h * 0.048, '#6a5662', 500);
  // Seal with ribbons
  const sx = w * 0.82;
  const sy = h * 0.76;
  c.fillStyle = C.rose;
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(sx + s * w * 0.01, sy);
    c.lineTo(sx + s * w * 0.045, sy + h * 0.17);
    c.lineTo(sx + s * w * 0.02, sy + h * 0.14);
    c.lineTo(sx, sy + h * 0.17);
    c.fill();
  }
  star(c, sx, sy, w * 0.06, '#ffd166', '#e0a83a', 3);
  // Abu Sanad's signature
  c.strokeStyle = C.blue;
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(w * 0.13, h * 0.86);
  c.bezierCurveTo(w * 0.16, h * 0.8, w * 0.18, h * 0.9, w * 0.21, h * 0.84);
  c.bezierCurveTo(w * 0.23, h * 0.8, w * 0.25, h * 0.88, w * 0.29, h * 0.84);
  c.stroke();
  text(c, 'Abu Sanad, instructor', w * 0.21, h * 0.9, h * 0.035, '#8a7480', 500);
}

// Homama's sticky note next to the certificate
export function drawNote(c, w, h) {
  c.fillStyle = '#ffd6e2';
  c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.fillRect(w * 0.3, 0, w * 0.4, h * 0.08);
  const lines = ['I will do my', 'very best to help', 'Roji get hers!'];
  lines.forEach((l, i) => text(c, l, w / 2, h * (0.25 + i * 0.17), h * 0.12, C.ink, 600));
  text(c, '- Homama', w * 0.58, h * 0.8, h * 0.11, C.blue, 700);
  c.fillStyle = C.rose;
  heartPath(c, w * 0.2, h * 0.82, h * 0.1);
  c.fill();
}

// "Roji's progress" cork board: the certificate, the note, Homama's photo, lesson stickers and the licence meter.
// Layout in fractions of the board (also used to place the 3D frame around the certificate).
export const BOARD = { cert: [0.04, 0.2, 0.36, 0.42], note: [0.07, 0.66, 0.24, 0.27] };
export function drawBoard(c, w, h, { progress = 0, lessons = 0 } = {}) {
  c.fillStyle = C.cork;
  c.fillRect(0, 0, w, h);
  let seed = 3;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(120,70,30,0.18)' : 'rgba(255,230,190,0.2)';
    c.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 2);
  }
  // Title strip
  c.save();
  c.translate(w * 0.5, h * 0.09);
  c.rotate(-0.012);
  c.fillStyle = '#ffffff';
  roundRect(c, -w * 0.3, -h * 0.065, w * 0.6, h * 0.13, 14);
  c.fill();
  text(c, "Roji's progress", 0, 3, h * 0.085, C.rose, 700);
  c.restore();
  // Certificate (the 3D frame sits on top of this area)
  const [cx, cy, cw, ch] = BOARD.cert;
  c.save();
  c.translate(w * cx, h * cy);
  drawCertificate(c, w * cw, h * ch);
  c.restore();
  // Note
  const [nx, ny, nw, nh] = BOARD.note;
  c.save();
  c.translate(w * (nx + nw / 2), h * (ny + nh / 2));
  c.rotate(-0.06);
  c.translate(-w * nw / 2, -h * nh / 2);
  drawNote(c, w * nw, h * nh);
  c.restore();
  // Homama's thumbs-up photo
  drawPolaroid(c, w * 0.43, h * 0.2, w * 0.2, h * 0.5, HOMAMA_PHOTO, 'Go Roji!', 0.05, '#cfe9ff');
  // Pins
  for (const [x, y, col] of [[0.22, 0.22, C.rose], [0.53, 0.22, C.blue], [0.19, 0.67, C.sun]]) {
    c.fillStyle = col;
    c.beginPath();
    c.arc(w * x, h * y, h * 0.018, 0, Math.PI * 2);
    c.fill();
  }
  // Lesson stickers: one per lesson in Abu Sanad's course, gold once done
  const sx0 = w * 0.68;
  text(c, 'Lessons', sx0 + w * 0.14, h * 0.24, h * 0.055, '#5a3a20', 700);
  for (let i = 0; i < 8; i++) {
    const x = sx0 + w * (0.02 + (i % 4) * 0.07);
    const y = h * (0.36 + Math.floor(i / 4) * 0.15);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(x + w * 0.015, y, h * 0.055, 0, Math.PI * 2);
    c.fill();
    if (i < lessons) star(c, x + w * 0.015, y, h * 0.047, i === 7 ? C.rose : C.sun, i === 7 ? '#c7404f' : '#e0a83a', 3);
    else {
      c.setLineDash([5, 5]);
      c.strokeStyle = '#d8c6b8';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(x + w * 0.015, y, h * 0.04, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      text(c, String(i + 1), x + w * 0.015, y + 2, h * 0.04, '#c9b6a8', 700);
    }
  }
  // Licence meter
  const mx = w * 0.68;
  const my = h * 0.68;
  const mw = w * 0.28;
  c.fillStyle = '#ffffff';
  roundRect(c, mx, my, mw, h * 0.15, 14);
  c.fill();
  text(c, progress >= 100 ? 'Licence: got it!' : `Licence ${Math.round(progress)}%`, mx + mw / 2, my + h * 0.045, h * 0.048, C.teal, 700);
  c.fillStyle = '#f0e2d8';
  roundRect(c, mx + mw * 0.07, my + h * 0.085, mw * 0.86, h * 0.04, 8);
  c.fill();
  const gr = c.createLinearGradient(mx, 0, mx + mw, 0);
  gr.addColorStop(0, C.sun);
  gr.addColorStop(1, C.rose);
  c.fillStyle = gr;
  roundRect(c, mx + mw * 0.07, my + h * 0.085, Math.max(h * 0.04, mw * 0.86 * Math.min(1, progress / 100)), h * 0.04, 8);
  c.fill();
  // Banner
  c.save();
  c.translate(w * 0.52, h * 0.9);
  c.rotate(0.01);
  c.fillStyle = C.teal;
  roundRect(c, -w * 0.18, -h * 0.055, w * 0.36, h * 0.11, 12);
  c.fill();
  text(c, 'You can do it, Roji!', 0, 3, h * 0.06, '#ffffff', 700);
  c.restore();
  for (const [x, y, s] of [[0.33, 0.88, 0.035], [0.71, 0.9, 0.03], [0.96, 0.12, 0.03]]) {
    c.fillStyle = C.rose;
    heartPath(c, w * x, h * y, h * s * 1.6);
    c.fill();
  }
}

// ------------------------------------------------------------------ people and animals
// Abu Sanad's course chart on the office wall: the eight lessons with Roji's stars and her licence.
export function drawCourseChart(c, w, h, state = null, progress = 0) {
  c.fillStyle = '#fffaf0';
  roundRect(c, 0, 0, w, h, w * 0.05);
  c.fill();
  c.fillStyle = C.teal;
  roundRect(c, 0, 0, w, h * 0.15, w * 0.05);
  c.fill();
  c.fillRect(0, h * 0.08, w, h * 0.07);
  text(c, "Abu Sanad's course", w / 2, h * 0.075, h * 0.06, '#ffffff', 700);
  const rows = COURSE_TITLES.length;
  const top = h * 0.19;
  const rh = (h * 0.62) / rows;
  COURSE_TITLES.forEach((t, i) => {
    const y = top + rh * (i + 0.5);
    const done = !!state?.done?.[i];
    const stars = state?.stars?.[i] || 0;
    if (i % 2) {
      c.fillStyle = 'rgba(255,209,102,0.16)';
      c.fillRect(w * 0.04, y - rh / 2, w * 0.92, rh);
    }
    c.fillStyle = done ? (i === rows - 1 ? C.rose : C.mint) : '#efe4da';
    c.beginPath();
    c.arc(w * 0.11, y, rh * 0.34, 0, Math.PI * 2);
    c.fill();
    text(c, i === rows - 1 ? 'T' : String(i + 1), w * 0.11, y + 2, rh * 0.38, done ? '#ffffff' : '#a8969f', 700);
    text(c, t, w * 0.2, y + 2, rh * 0.42, done ? C.ink : '#a8969f', 600, 'left');
    for (let s = 0; s < 3; s++) star(c, w * (0.75 + s * 0.08), y, rh * 0.26, s < stars ? C.sun : '#eadfd8', s < stars ? '#e0a83a' : '#d8cbc2', 2);
  });
  // Licence bar
  const by = h * 0.915;
  text(c, progress >= 100 ? "Roji's licence: done!" : `Roji's licence ${Math.round(progress)}%`, w / 2, by - h * 0.03, h * 0.04, C.teal, 700);
  c.fillStyle = '#f0e2d8';
  roundRect(c, w * 0.1, by, w * 0.8, h * 0.035, h * 0.017);
  c.fill();
  const gr = c.createLinearGradient(w * 0.1, 0, w * 0.9, 0);
  gr.addColorStop(0, C.sun);
  gr.addColorStop(1, C.rose);
  c.fillStyle = gr;
  roundRect(c, w * 0.1, by, Math.max(h * 0.035, w * 0.8 * Math.min(1, progress / 100)), h * 0.035, h * 0.017);
  c.fill();
}

// ------------------------------------------------------------------ people and animals
const HC = new THREE.Vector3(0, 0.29, 0); // head centre inside kid.head

export const ABU_SANAD = { id: 'abusanad', name: 'Abu Sanad', gender: 'boy', skin: '#c98f68', hair: '#3a3634', hairstyle: 'short', mustache: '#2b2624', outfit: 'tee-pants', top: '#21a99a', bottom: '#2c3e66', shoes: '#3b2b3f', accent: '#ffd166' };
export const NORA = ABU_SANAD;

// Abu Sanad, the driving instructor: a grown-up with glasses, a moustache, a lanyard and a name badge.
export function makeAbuSanad(makeKid, { scale = 1.18, clipboard = true } = {}) {
  const kid = makeKid(ABU_SANAD);
  const H = kid.head;
  const frame = mat('#3b2b3f', { rough: 0.4 });
  const ringGeo = new THREE.TorusGeometry(0.066, 0.012, 6, 16);
  for (const s of [1, -1]) {
    const ring = mesh(ringGeo, frame, { cast: false });
    ring.position.set(HC.x + 0.108 * s, HC.y - 0.02, HC.z + 0.3);
    H.add(ring);
  }
  const bridge = mesh(new THREE.BoxGeometry(0.08, 0.014, 0.014), frame, { cast: false });
  bridge.position.set(0, HC.y - 0.005, HC.z + 0.305);
  H.add(bridge);
  const lanyard = mesh(new THREE.TorusGeometry(0.13, 0.012, 4, 16, Math.PI), mat(C.sun, { rough: 0.6 }));
  lanyard.rotation.set(0.25, 0, Math.PI);
  lanyard.position.set(0, 0.74, 0.1);
  kid.body.add(lanyard);
  const badge = mesh(new THREE.BoxGeometry(0.09, 0.11, 0.02), mat('#ffffff', { rough: 0.6 }));
  badge.position.set(0, 0.6, 0.18);
  badge.rotation.x = -0.15;
  kid.body.add(badge);
  if (clipboard) kid.carry(makeClipboard());
  kid.root.scale.setScalar(scale);
  return kid;
}
export const makeNora = makeAbuSanad;

export function makeClipboard() {
  const g = new THREE.Group();
  const b = mesh(new THREE.BoxGeometry(0.22, 0.28, 0.02), mat(C.woodDark));
  const p = mesh(new THREE.BoxGeometry(0.19, 0.22, 0.012), mat('#ffffff'));
  p.position.set(0, -0.015, 0.012);
  const clip = mesh(new THREE.BoxGeometry(0.09, 0.035, 0.03), mat(C.steel, { rough: 0.4 }));
  clip.position.set(0, 0.13, 0.015);
  for (let i = 0; i < 3; i++) {
    const l = mesh(new THREE.BoxGeometry(0.13, 0.012, 0.004), mat(C.teal));
    l.position.set(0, 0.04 - i * 0.05, 0.02);
    g.add(l);
  }
  g.add(b, p, clip);
  g.rotation.x = -0.9;
  g.position.set(0, 0.02, 0.06);
  return g;
}

// Freeze a kid in its pose so it merges with the scene; curved parts get fewer segments.
export function freezeKid(kid, { pose = 'stand', hands = null } = {}) {
  kid.pose = pose;
  kid.hands = hands ?? kid.hands;
  kid.update(1 / 60, 0, 0, 0, 0);
  kid.head.rotation.set(-0.08, 0, 0);
  kid.blob.visible = pose === 'stand';
  const half = (n, min) => Math.max(min, Math.round(n * 0.55));
  const skin = new THREE.Color(kid.look.skin);
  kid.root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.material.isMeshBasicMaterial && o !== kid.blob) {
      const c = skin.clone().lerp(o.material.color, o.material.opacity);
      o.material = mat('#' + c.getHexString(), { rough: 0.6 });
    }
    const g = o.geometry;
    const p = g.parameters;
    let next = null;
    if (g.type === 'SphereGeometry') next = new THREE.SphereGeometry(p.radius, half(p.widthSegments, 8), half(p.heightSegments, 6), p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
    else if (g.type === 'LatheGeometry') next = new THREE.LatheGeometry(p.points, half(p.segments, 10), p.phiStart, p.phiLength);
    else if (g.type === 'TorusGeometry') next = new THREE.TorusGeometry(p.radius, p.tube, half(p.radialSegments, 4), half(p.tubularSegments, 8), p.arc);
    else if (g.type === 'CapsuleGeometry') next = new THREE.CapsuleGeometry(p.radius, p.height, 2, half(p.radialSegments, 6));
    if (next) o.geometry = next;
  });
  return kid;
}

// Merge a live kid's meshes per moving part (body, head, each limb and hair tail) so Kid.update still
// animates it at a fraction of the draw calls. The torso (it breathes), the eyes (they blink) and the hair stay.
export function bakeLiveKid(kid, keep = []) {
  const o = { coarse: true };
  const tails = (kid.tails || []).map((t) => t.pivot);
  const parts = [...kid.legs, ...kid.arms, ...tails];
  colorBake(kid.body, [kid.head, kid.carryAnchor, kid.torso, ...parts, ...keep], o);
  colorBake(kid.head, [...kid.eyes, ...tails], o);
  // The hair is many textured pieces sharing one material: merge them too
  bakeStatic(kid.head, [...kid.eyes, ...tails], mergeGeometries);
  for (const p of parts) colorBake(p, [], o);
  for (const t of tails) bakeStatic(t, [], mergeGeometries);
  return kid;
}

// A duck facing +Z: the mother is cream, the ducklings sun-yellow.
export function makeDuck(k, { color = C.sun, size = 1 } = {}) {
  const g = new THREE.Group();
  const body = k.sph(0.2, color, { rough: 0.7 }, 14);
  body.scale.set(0.85, 0.72, 1.1);
  g.add(k.at(body, 0, 0.17, 0));
  const tail = k.cone(0.07, 0.14, color, 8, { rough: 0.7 });
  tail.rotation.x = -2.1;
  g.add(k.at(tail, 0, 0.24, -0.22));
  for (const s of [-1, 1]) {
    const wing = k.sph(0.1, color === C.sun ? '#ffc23d' : '#f1e6d2', { rough: 0.7 }, 10);
    wing.scale.set(0.35, 0.7, 1.2);
    g.add(k.at(wing, s * 0.16, 0.2, -0.02));
  }
  g.add(k.at(k.sph(0.12, color, { rough: 0.7 }, 12), 0, 0.37, 0.14));
  const beak = k.sph(0.06, C.sunDeep, { rough: 0.7 }, 10);
  beak.scale.set(1.1, 0.5, 1.4);
  g.add(k.at(beak, 0, 0.35, 0.27));
  for (const s of [-1, 1]) {
    g.add(k.at(k.sph(0.022, C.ink, { rough: 0.7 }, 8), s * 0.065, 0.4, 0.24));
    const foot = k.box(0.06, 0.015, 0.08, C.sunDeep, { rough: 0.7 });
    g.add(k.at(foot, s * 0.07, 0.008, 0.04));
  }
  g.scale.setScalar(size);
  return g;
}

// A traffic cone (about 0.6 m) with a white band
export function makeCone(k) {
  const g = new THREE.Group();
  g.add(k.at(k.rbox(0.46, 0.06, 0.46, C.cone, 0.02), 0, 0.03, 0));
  g.add(k.at(k.cyl(0.035, 0.19, 0.52, C.cone, 14), 0, 0.31, 0));
  g.add(k.at(k.cyl(0.115, 0.145, 0.1, C.white, 14), 0, 0.3, 0));
  g.add(k.at(k.sph(0.045, C.cone, undefined, 8), 0, 0.57, 0));
  return g;
}

// A traffic light on a pole, lamps facing +Z (and -X when twoFaced). mats: { red, amber, green } unique materials.
export function makeTrafficLight(k, mats, { pole = 2.2, twoFaced = false } = {}) {
  const g = new THREE.Group();
  g.add(k.at(k.cyl(0.06, 0.08, pole, '#5d6b7a', 10, { rough: 0.5 }), 0, pole / 2, 0));
  g.add(k.at(k.cyl(0.16, 0.2, 0.1, '#5d6b7a', 12), 0, 0.05, 0));
  const head = (ry) => {
    const h = new THREE.Group();
    h.add(k.at(k.rbox(0.36, 0.96, 0.24, C.ink, 0.08), 0, 0, 0));
    h.add(k.at(k.rbox(0.42, 1.02, 0.06, C.sun, 0.03), 0, 0, -0.13));
    ['red', 'amber', 'green'].forEach((n, i) => {
      const lamp = mesh(k.geo('lamp', () => new THREE.SphereGeometry(0.11, 14, 10)), mats[n], { cast: false });
      lamp.scale.z = 0.5;
      h.add(k.at(lamp, 0, 0.3 - i * 0.3, 0.12));
      const visor = mesh(k.geo('visor', () => new THREE.CylinderGeometry(0.14, 0.14, 0.14, 12, 1, true, -Math.PI / 2, Math.PI)), mat(C.ink, { side: THREE.DoubleSide }));
      visor.rotation.x = Math.PI / 2;
      h.add(k.at(visor, 0, 0.33 - i * 0.3, 0.18));
    });
    h.rotation.y = ry;
    return h;
  };
  g.add(k.at(head(0), 0, pole + 0.4, 0.06));
  if (twoFaced) g.add(k.at(head(-Math.PI / 2), -0.06, pole + 0.4, 0));
  return g;
}
export function lightMats(umat) {
  return {
    red: umat('#ff6b6b', { emissive: '#ff3b3b', ei: 0.05, rough: 0.3 }),
    amber: umat('#ffc85a', { emissive: '#ffb020', ei: 0.05, rough: 0.3 }),
    green: umat('#5fe39a', { emissive: '#22d07a', ei: 0.05, rough: 0.3 }),
  };
}
export function setLight(mats, state) {
  for (const n of ['red', 'amber', 'green']) {
    const on = n === state || (state === 'redamber' && (n === 'red' || n === 'amber'));
    mats[n].emissiveIntensity = on ? 2.2 : 0.04;
    mats[n].color.set(on ? (n === 'red' ? '#ff8a8a' : n === 'amber' ? '#ffe08a' : '#8af0b8') : n === 'red' ? '#7a3a44' : n === 'amber' ? '#7a6038' : '#2f6a4c');
  }
}

// L plates and school decals on a Car (src/car.js): one plate on the bonnet, one on the boot, a badge on each door.
export function learnerize(car, atlas, cells) {
  if (!cells.lplate) cells.lplate = atlas.add(drawLPlate);
  if (!cells.door) {
    cells.door = atlas.add((c, w, h) => {
      c.fillStyle = '#ffffff';
      roundRect(c, 4, 4, w - 8, h - 8, 40);
      c.fill();
      drawWheelBadge(c, w * 0.5, h * 0.42, w * 0.3);
      text(c, 'Little Wheels', w / 2, h * 0.84, h * 0.13, C.teal, 700);
    });
  }
  // Lying on the bonnet (read from the front) and on the boot (read from behind)
  const plate = (y, z, rz) => {
    const p = atlas.plane(0.32, 0.32, cells.lplate);
    p.position.set(0, y, z);
    p.rotation.set(-Math.PI / 2, 0, rz);
    car.body.add(p);
  };
  plate(1.006, 0.9, 0);
  plate(0.986, -1.02, Math.PI);
  for (const s of [1, -1]) {
    const d = atlas.plane(0.32, 0.32, cells.door);
    d.position.set(s * 0.812, 0.56, 0.12);
    d.rotation.y = (s * Math.PI) / 2;
    car.body.add(d);
  }
  return car;
}

// A round tree: a trunk and three leafy balls
export function tree(k, s = 1, tone = 0, seg = 14) {
  const t = new THREE.Group();
  const L = [C.leaf, C.leafDark, C.leafLight];
  t.add(k.at(k.cyl(0.14, 0.2, 1.4, C.woodDark, Math.min(10, seg)), 0, 0.7, 0));
  t.add(k.at(k.sph(0.9, L[tone % 3], { rough: 0.85 }, seg), 0, 2.0, 0));
  t.add(k.at(k.sph(0.62, L[(tone + 1) % 3], { rough: 0.85 }, seg - 2), 0.5, 1.7, 0.25));
  t.add(k.at(k.sph(0.55, L[(tone + 2) % 3], { rough: 0.85 }, seg - 2), -0.45, 2.4, 0.1));
  t.scale.setScalar(s);
  return t;
}

// Instanced flowers: list of [x, y, z, colorIndex, scale]. Adds three instanced meshes to group.
export function addFlowers(group, flowers, R, petals = [C.rose, C.pink, '#ffffff', C.sun, C.lilac, '#ff7fa3', '#ffb36b']) {
  if (!flowers.length) return;
  const petalGeo = mergeGeometries(
    Array.from({ length: 5 }, (_, i) => {
      const s = new THREE.SphereGeometry(0.045, 5, 3);
      s.scale(1, 0.55, 1);
      const a = (i / 5) * Math.PI * 2;
      s.translate(Math.cos(a) * 0.045, 0, Math.sin(a) * 0.045);
      return s;
    }),
  );
  const n = flowers.length;
  const blooms = new THREE.InstancedMesh(petalGeo, new THREE.MeshStandardMaterial({ roughness: 0.65 }), n);
  const middles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 5, 3), mat(C.sun), n);
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.01, 0.012, 1, 4, 1, true), mat(C.leafDark), n);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const col = new THREE.Color();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();
  flowers.forEach(([x, y, z, ci, s], i) => {
    const h = 0.18 * s;
    m4.compose(v.set(x, y + h, z), q.setFromEuler(e.set((R() - 0.5) * 0.4, R() * 6, (R() - 0.5) * 0.4)), sc.set(s, s, s));
    blooms.setMatrixAt(i, m4);
    blooms.setColorAt(i, col.set(petals[ci % petals.length]));
    m4.compose(v.set(x, y + h + 0.01, z), q.identity(), sc.set(s, s, s));
    middles.setMatrixAt(i, m4);
    m4.compose(v.set(x, y + h / 2, z), q, sc.set(1, h, 1));
    stems.setMatrixAt(i, m4);
  });
  for (const im of [blooms, middles, stems]) {
    im.castShadow = false;
    im.receiveShadow = true;
    group.add(im);
  }
}

// Paint a canvas texture for a flat plane
export function paintedPlane(w, h, px, draw, { rough = 0.85, transparent = false, glow = 0, cut = false } = {}) {
  const tex = canvasTexture(px, Math.round((px * h) / w), draw);
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: rough, transparent, alphaTest: cut ? 0.5 : 0 });
  if (glow) {
    m.emissive = new THREE.Color('#ffffff');
    m.emissiveMap = tex;
    m.emissiveIntensity = glow;
  }
  const p = mesh(new THREE.PlaneGeometry(w, h), m, { cast: false });
  p.userData.draw = draw;
  p.userData.tex = tex;
  return p;
}
export { text as paintText };
