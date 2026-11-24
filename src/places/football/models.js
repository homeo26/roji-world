// Football pieces shared by the pitch in town and the 3D match: a painted striped pitch, the ball,
// goals with springy nets, corner flags, a scoreboard, bunting and small synth sounds.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mesh, canvasTexture, roundRect, FONT, rng } from '../../util.js';

export const PAL = {
  grassA: '#8ad262',
  grassB: '#79c455',
  line: '#fbf7ec',
  post: '#fffaf4',
  cream: '#fff1dc',
  wood: '#c98a5a',
  woodDk: '#9b6a43',
  pink: '#ef5b6f',
  rose: '#ff9eb5',
  yellow: '#ffd166',
  teal: '#21a99a',
  mint: '#7fd3a7',
  sky: '#6fb8ff',
  blue: '#3f7bf0',
  plum: '#3b2b3f',
  peach: '#f8c9a6',
  lilac: '#c7a6ff',
};

// ------------------------------------------------------------------ primitives
const M = (c, o) => (typeof c === 'string' ? mat(c, o) : c);
export const box = (w, h, d, c, o) => mesh(new THREE.BoxGeometry(w, h, d), M(c, o));
export const rbox = (w, h, d, c, r = 0.05, o) => mesh(new RoundedBoxGeometry(w, h, d, 2, r), M(c, o));
export const cyl = (rt, rb, h, c, seg = 14, o) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(c, o));
export const ball = (r, c, o, seg = 14) => mesh(new THREE.SphereGeometry(r, seg, Math.max(8, Math.round(seg * 0.7))), M(c, o));
export function at(o, x, y, z, ry = 0) {
  o.position.set(x, y, z);
  if (ry) o.rotation.y = ry;
  return o;
}

// A cylinder from a to b (Vector3).
const UP = new THREE.Vector3(0, 1, 0);
export function tube(a, b, r, c, seg = 8) {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = cyl(r, r, d.length(), c, seg);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}

// ------------------------------------------------------------------ baking
// Give every plain-coloured static mesh under root its colour as vertex colours and a shared material,
// so meshes of different colours merge into a handful of draw calls. keep: objects to leave alone.
const vcMats = new Map();
function vcMat(rough, metal, flat, side) {
  const key = `${rough}|${metal}|${flat}|${side}`;
  if (!vcMats.has(key)) vcMats.set(key, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: metal, flatShading: flat, side }));
  return vcMats.get(key);
}
export function bakeColors(root, keep = []) {
  const skip = new Set();
  for (const k of keep) k.traverse((o) => skip.add(o));
  const col = new THREE.Color();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || skip.has(o)) return;
    const m = o.material;
    if (Array.isArray(m) || m.map || m.transparent || m.vertexColors || !m.color) return;
    if (m.emissive && m.emissiveIntensity * Math.max(m.emissive.r, m.emissive.g, m.emissive.b) > 0.2) return;
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    const n = geo.attributes.position.count;
    const arr = new Float32Array(n * 3);
    col.copy(m.color);
    for (let i = 0; i < n; i++) arr.set([col.r, col.g, col.b], i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    o.geometry = geo;
    o.material = vcMat(Math.round((m.roughness ?? 0.8) * 5) / 5, (m.metalness ?? 0) > 0.3 ? 0.5 : 0, !!m.flatShading, m.side);
  });
}

// ------------------------------------------------------------------ pitch
// Striped grass with white lines on one canvas. The canvas covers the grass [-gw, gw] x [-gd, gd]
// (x along the length). Lines: outer half sizes hl x hw, penalty box, goal box, spot, centre circle.
export function pitchTexture({ gw, gd, hl, hw, box: bx, small, spot, circle, band = 2, px = 2048, line = 0.09, seed = 4 }) {
  const W = px;
  const H = Math.round((px * gd) / gw);
  const s = W / (gw * 2);
  return canvasTexture(W, H, (c) => {
    const X = (x) => (x + gw) * s;
    const Y = (z) => (z + gd) * s;
    const r = rng(seed);
    // Mowed stripes across the length, darker outside the lines
    const n = Math.ceil((gw * 2) / band);
    for (let i = 0; i < n; i++) {
      c.fillStyle = i % 2 ? PAL.grassA : PAL.grassB;
      c.fillRect(X(-gw + i * band), 0, band * s + 1, H);
    }
    c.fillStyle = 'rgba(40, 90, 30, 0.10)';
    c.fillRect(0, 0, W, Y(-hw));
    c.fillRect(0, Y(hw), W, H - Y(hw));
    c.fillRect(0, Y(-hw), X(-hl), Y(hw) - Y(-hw));
    c.fillRect(X(hl), Y(-hw), W - X(hl), Y(hw) - Y(-hw));
    // Speckles so the grass does not look flat
    for (let i = 0; i < 9000; i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(255,255,220,0.07)' : 'rgba(30,80,20,0.08)';
      const d = 1 + r() * 2.5;
      c.fillRect(r() * W, r() * H, d, d * 1.6);
    }
    c.strokeStyle = PAL.line;
    c.fillStyle = PAL.line;
    c.lineWidth = line * s;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    const rect = (x0, z0, x1, z1) => c.strokeRect(X(x0), Y(z0), X(x1) - X(x0), Y(z1) - Y(z0));
    const dot = (x, z, rr) => {
      c.beginPath();
      c.arc(X(x), Y(z), rr * s, 0, Math.PI * 2);
      c.fill();
    };
    rect(-hl, -hw, hl, hw);
    c.beginPath();
    c.moveTo(X(0), Y(-hw));
    c.lineTo(X(0), Y(hw));
    c.stroke();
    c.beginPath();
    c.arc(X(0), Y(0), circle * s, 0, Math.PI * 2);
    c.stroke();
    dot(0, 0, 0.12);
    for (const side of [-1, 1]) {
      const gx = side * hl;
      rect(Math.min(gx, gx - side * bx.d), -bx.hw, Math.max(gx, gx - side * bx.d), bx.hw);
      rect(Math.min(gx, gx - side * small.d), -small.hw, Math.max(gx, gx - side * small.d), small.hw);
      const sx = gx - side * spot;
      dot(sx, 0, 0.1);
      // The arc outside the penalty box
      const k = (bx.d - spot) / circle;
      if (k < 1) {
        const a = Math.acos(k);
        c.beginPath();
        if (side > 0) c.arc(X(sx), Y(0), circle * s, Math.PI - a, Math.PI + a);
        else c.arc(X(sx), Y(0), circle * s, -a, a);
        c.stroke();
      }
      for (const zs of [-1, 1]) {
        c.beginPath();
        const a0 = side > 0 ? (zs > 0 ? Math.PI : Math.PI / 2) : zs > 0 ? -Math.PI / 2 : 0;
        c.arc(X(gx), Y(zs * hw), 0.5 * s, a0, a0 + Math.PI / 2);
        c.stroke();
      }
    }
  });
}

// ------------------------------------------------------------------ ball
// A classic football: the 12 pentagons of a truncated icosahedron, smoothed onto a sphere.
const ballGeos = new Map();
export function ballGeometry(r, depth = 2) {
  const key = `${r}|${depth}`;
  if (ballGeos.has(key)) return ballGeos.get(key);
  const corners = [];
  const ico = new THREE.IcosahedronGeometry(1, 0).attributes.position;
  for (let i = 0; i < ico.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(ico, i).normalize();
    if (!corners.some((c) => c.distanceTo(v) < 1e-3)) corners.push(v);
  }
  const fine = new THREE.IcosahedronGeometry(1, 2).attributes.position; // edges split in thirds: the truncation points
  const dark = new THREE.Color(PAL.plum);
  const light = new THREE.Color('#fffaf4');
  const pos = [];
  const col = [];
  const tri = [];
  const A = new THREE.Vector3();
  const B = new THREE.Vector3();
  const C = new THREE.Vector3();
  const split = (a, b, c, depth, color) => {
    if (depth === 0) {
      tri.push([a, b, c, color]);
      return;
    }
    const ab = a.clone().add(b).normalize();
    const bc = b.clone().add(c).normalize();
    const ca = c.clone().add(a).normalize();
    split(a, ab, ca, depth - 1, color);
    split(ab, b, bc, depth - 1, color);
    split(ca, bc, c, depth - 1, color);
    split(ab, bc, ca, depth - 1, color);
  };
  for (let i = 0; i < fine.count; i += 3) {
    A.fromBufferAttribute(fine, i).normalize();
    B.fromBufferAttribute(fine, i + 1).normalize();
    C.fromBufferAttribute(fine, i + 2).normalize();
    const isDark = corners.some((v) => v.dot(A) > 0.9999 || v.dot(B) > 0.9999 || v.dot(C) > 0.9999);
    split(A.clone(), B.clone(), C.clone(), depth, isDark ? dark : light);
  }
  for (const [a, b, c, color] of tri) {
    for (const v of [a, b, c]) {
      pos.push(v.x * r, v.y * r, v.z * r);
      col.push(color.r, color.g, color.b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((p) => p / r), 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
  g.computeBoundingSphere();
  ballGeos.set(key, g);
  return g;
}
let ballMaterial = null;
// depth 2 for the ball in play, 1 for decorations
export function makeBall(r = 0.2, depth = 2) {
  ballMaterial ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42 });
  return mesh(ballGeometry(r, depth), ballMaterial, { cast: true, receive: false });
}

// Soft round shadow for the ball (it helps to see how high it is).
export function blobShadow(r) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), new THREE.MeshBasicMaterial({ color: '#2b3b2a', transparent: true, opacity: 0.25, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  return m;
}

// ------------------------------------------------------------------ goal
let netTex = null;
function netTexture() {
  if (netTex) return netTex;
  netTex = canvasTexture(128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.lineWidth = 5;
    for (const k of [0, 64, 128]) {
      c.beginPath();
      c.moveTo(k, 0);
      c.lineTo(k, h);
      c.moveTo(0, k);
      c.lineTo(w, k);
      c.stroke();
    }
  });
  netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping;
  return netTex;
}
let netMaterial = null;
export function netMat() {
  netMaterial ??= new THREE.MeshStandardMaterial({ map: netTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.9, alphaTest: 0.02 });
  return netMaterial;
}

// A goal in its own frame: the mouth at z = 0 faces +Z, the net is behind (-Z).
// w: width, h: height, dTop / dBot: net depth at the top and at the ground.
// Returns { group, nets: [sheet, sides], bulge(x, y, k), update(dt) }.
export function makeGoal({ w = 3, h = 1.3, dTop = 0.45, dBot = 0.85, post = 0.055, cell = 0.3 } = {}) {
  const g = new THREE.Group();
  const white = mat(PAL.post, { rough: 0.4 });
  const frame = mat('#e9e2da', { rough: 0.6 });
  for (const s of [-1, 1]) {
    g.add(at(cyl(post, post, h, white, 12), (s * w) / 2, h / 2, 0));
    g.add(at(ball(post * 1.05, white, {}, 12), (s * w) / 2, h, 0));
    const x = (s * w) / 2;
    g.add(tube(new THREE.Vector3(x, h, 0), new THREE.Vector3(x, h, -dTop), 0.022, frame));
    g.add(tube(new THREE.Vector3(x, h, -dTop), new THREE.Vector3(x, 0.02, -dBot), 0.022, frame));
    g.add(tube(new THREE.Vector3(x, 0.02, 0), new THREE.Vector3(x, 0.02, -dBot), 0.02, frame));
  }
  const bar = cyl(post, post, w, white, 12);
  bar.rotation.z = Math.PI / 2;
  g.add(at(bar, 0, h, 0));
  g.add(tube(new THREE.Vector3(-w / 2, h, -dTop), new THREE.Vector3(w / 2, h, -dTop), 0.022, frame));
  g.add(tube(new THREE.Vector3(-w / 2, 0.02, -dBot), new THREE.Vector3(w / 2, 0.02, -dBot), 0.022, frame));

  // Net sheet: the top and the back in one grid, so a shot can bulge it
  const Lb = Math.hypot(dBot - dTop, h);
  const Lt = dTop + Lb;
  const nu = 16;
  const nTop = 3;
  const nBack = 9;
  const pos = [];
  const uv = [];
  const sArr = [];
  for (let j = 0; j <= nTop + nBack; j++) {
    let z;
    let y;
    let sv;
    if (j <= nTop) {
      sv = (j / nTop) * dTop;
      z = -sv;
      y = h;
    } else {
      const k = (j - nTop) / nBack;
      sv = dTop + k * Lb;
      z = -dTop - k * (dBot - dTop);
      y = h - k * h;
    }
    for (let i = 0; i <= nu; i++) {
      const x = -w / 2 + (i / nu) * w;
      pos.push(x, y, z);
      uv.push(x / cell, sv / cell);
      sArr.push(sv);
    }
  }
  const idx = [];
  for (let j = 0; j < nTop + nBack; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i;
      const b = a + 1;
      const c = a + nu + 1;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const sheetGeo = new THREE.BufferGeometry();
  sheetGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sheetGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  sheetGeo.setIndex(idx);
  sheetGeo.computeVertexNormals();
  const base = Float32Array.from(pos);
  const out = new Float32Array(pos.length);
  // the stored outward direction: the top pushes up, the back pushes back
  for (let j = 0; j <= nTop + nBack; j++) {
    for (let i = 0; i <= nu; i++) {
      const v = (j * (nu + 1) + i) * 3;
      if (j <= nTop) out.set([0, 1, 0], v);
      else out.set([0, 0.25, -1], v);
    }
  }
  const sheet = mesh(sheetGeo, netMat(), { cast: false, receive: false });
  sheet.renderOrder = 2;
  g.add(sheet);

  const sideShape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, h), new THREE.Vector2(-dTop, h), new THREE.Vector2(-dBot, 0)]);
  const sides = [];
  for (const s of [-1, 1]) {
    const sg = new THREE.ShapeGeometry(sideShape);
    const suv = sg.attributes.uv;
    for (let i = 0; i < suv.count; i++) suv.setXY(i, suv.getX(i) / cell, suv.getY(i) / cell);
    sg.rotateY(-Math.PI / 2);
    sg.translate((s * w) / 2, 0, 0);
    sides.push(sg);
  }
  const sideMesh = mesh(mergeGeometries(sides, false), netMat(), { cast: false, receive: false });
  sideMesh.renderOrder = 2;
  g.add(sideMesh);

  let hit = null;
  const P = sheetGeo.attributes.position;
  return {
    group: g,
    nets: [sheet, sideMesh],
    w,
    h,
    dBot,
    // A shot hits the net at local x across the mouth and height y. k: how hard (0..1).
    bulge(x, y, k = 1) {
      const s0 = dTop + clamp01((h - y) / h) * Lb * 0.9;
      hit = { x, s0, k: 0.12 + 0.2 * k, t: 0 };
    },
    update(dt) {
      if (!hit) return;
      hit.t += dt;
      const t = hit.t;
      const amp = t > 1.6 ? 0 : hit.k * Math.exp(-3.4 * t) * Math.sin(Math.min(t * 13, Math.PI / 2) + Math.max(0, t - 0.12) * 9);
      for (let i = 0; i < P.count; i++) {
        const dx = base[i * 3] - hit.x;
        const ds = sArr[i] - hit.s0;
        const wgt = Math.exp(-(dx * dx) / 0.45 - (ds * ds) / 0.35) * (sArr[i] < 0.02 || Math.abs(base[i * 3]) > w / 2 - 0.01 || sArr[i] > Lt - 0.02 ? 0 : 1);
        P.setXYZ(i, base[i * 3] + out[i * 3] * amp * wgt, base[i * 3 + 1] + out[i * 3 + 1] * amp * wgt, base[i * 3 + 2] + out[i * 3 + 2] * amp * wgt);
      }
      P.needsUpdate = true;
      if (t > 1.6) hit = null;
    },
  };
}
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ------------------------------------------------------------------ corner flag
// Returns { group, flag } where flag is the pivot to sway.
export function makeCornerFlag(color = PAL.pink, height = 1.05) {
  const g = new THREE.Group();
  g.add(at(cyl(0.022, 0.026, height, mat(PAL.post, { rough: 0.5 }), 8), 0, height / 2, 0));
  for (let k = 0; k < 3; k++) g.add(at(cyl(0.027, 0.027, 0.07, mat(color), 8), 0, 0.2 + k * 0.28, 0));
  g.add(at(ball(0.04, PAL.yellow, { rough: 0.4 }, 10), 0, height + 0.02, 0));
  const pivot = new THREE.Group();
  pivot.position.y = height - 0.03;
  const tri = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.34, -0.11), new THREE.Vector2(0, -0.24)]);
  const f = mesh(new THREE.ShapeGeometry(tri), mat(color, { side: THREE.DoubleSide, rough: 0.7 }), { cast: true, receive: false });
  f.position.x = 0.02;
  pivot.add(f);
  g.add(pivot);
  return { group: g, flag: pivot };
}

// ------------------------------------------------------------------ scoreboard
// A cabinet on two posts with a glowing face. set({ a, b, nameA, nameB, colorA, colorB, top, sub }) redraws it.
export function makeScoreboard({ w = 4, h = 1.5, post = 2.3, title = 'SUNNY KICKS' } = {}) {
  const g = new THREE.Group();
  const plum = mat('#4a3550', { rough: 0.6 });
  for (const s of [-1, 1]) g.add(at(cyl(0.09, 0.11, post + 0.2, mat('#fff1dc', { rough: 0.7 }), 12), s * w * 0.36, (post + 0.2) / 2, -0.05));
  const cab = rbox(w + 0.24, h + 0.24, 0.3, plum, 0.08);
  g.add(at(cab, 0, post + h / 2, 0));
  // Little bulbs along the top
  for (let i = 0; i < 9; i++) g.add(at(ball(0.07, i % 2 ? PAL.yellow : PAL.rose, { rough: 0.3, emissive: i % 2 ? '#ffb347' : '#ff7fa3', ei: 0.5 }, 10), -w / 2 + (i / 8) * w, post + h + 0.17, 0.02));
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = Math.round((512 * h) / w);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const faceMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.45 });
  const face = mesh(new THREE.PlaneGeometry(w, h), faceMat, { cast: false });
  face.position.set(0, post + h / 2, 0.152);
  g.add(face);
  const c = cv.getContext('2d');
  function set({ a = 0, b = 0, nameA = 'Roji', nameB = 'Homama', colorA = PAL.pink, colorB = PAL.blue, top = title, sub = '' } = {}) {
    const W = cv.width;
    const H = cv.height;
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#2f2236';
    c.fillRect(0, 0, W, H);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = PAL.yellow;
    c.font = `600 ${H * 0.13}px ${FONT}`;
    c.fillText(top, W / 2, H * 0.13);
    for (const [i, name, color] of [[0, nameA, colorA], [1, nameB, colorB]]) {
      const x = i === 0 ? W * 0.27 : W * 0.73;
      c.fillStyle = color;
      roundRect(c, x - W * 0.21, H * 0.25, W * 0.42, H * 0.2, H * 0.06);
      c.fill();
      c.fillStyle = '#ffffff';
      c.font = `600 ${H * 0.13}px ${FONT}`;
      c.fillText(name.length > 12 ? name.slice(0, 11) + '.' : name, x, H * 0.352);
      c.fillStyle = '#ffe9a8';
      c.shadowColor = '#ffb347';
      c.shadowBlur = 14;
      c.font = `700 ${H * 0.4}px ${FONT}`;
      c.fillText(String(i === 0 ? a : b), x, H * 0.69);
      c.shadowBlur = 0;
    }
    c.fillStyle = '#ffe9a8';
    c.font = `700 ${H * 0.3}px ${FONT}`;
    c.fillText(':', W / 2, H * 0.66);
    if (sub) {
      c.fillStyle = '#c9b8d6';
      c.font = `500 ${H * 0.1}px ${FONT}`;
      c.fillText(sub, W / 2, H * 0.92);
    }
    tex.needsUpdate = true;
  }
  set();
  return { group: g, face, set };
}

// ------------------------------------------------------------------ bunting
// Little triangle flags strung along points (Vector3[]), sagging between them. One mesh with vertex colours.
export function makeBunting(points, { spacing = 0.42, sag = 0.35, size = 0.26, colors = [PAL.pink, PAL.yellow, PAL.mint, PAL.sky, PAL.rose, '#fffaf4'] } = {}) {
  const g = new THREE.Group();
  const pos = [];
  const col = [];
  const c = new THREE.Color();
  let ci = 0;
  const lines = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = a.distanceTo(b);
    const pt = (k) => new THREE.Vector3().lerpVectors(a, b, k).add(new THREE.Vector3(0, -Math.sin(k * Math.PI) * sag, 0));
    const curve = [];
    for (let k = 0; k <= 12; k++) curve.push(pt(k / 12));
    lines.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve), 12, 0.012, 4));
    const dir = new THREE.Vector3().subVectors(b, a).setY(0).normalize();
    const n = Math.max(2, Math.floor(len / spacing));
    for (let k = 0; k < n; k++) {
      const p = pt((k + 0.5) / n);
      const q = pt((k + 0.5) / n + 0.3 / len);
      const e = new THREE.Vector3().subVectors(q, p).normalize().multiplyScalar(size / 2);
      if (!e.lengthSq()) e.copy(dir).multiplyScalar(size / 2);
      const l = p.clone().sub(e);
      const r = p.clone().add(e);
      const tip = p.clone().add(new THREE.Vector3(0, -size * 1.1, 0));
      pos.push(l.x, l.y, l.z, r.x, r.y, r.z, tip.x, tip.y, tip.z);
      c.set(colors[ci++ % colors.length]);
      for (let v = 0; v < 3; v++) col.push(c.r, c.g, c.b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
  geo.computeVertexNormals();
  g.add(mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 }), { cast: false }));
  g.add(mesh(mergeGeometries(lines, false), mat('#fffaf4', { rough: 0.7 }), { cast: false }));
  return g;
}

// ------------------------------------------------------------------ sounds
function noise(sound, { freq = 900, q = 1, gain = 0.1, dur = 0.1, type = 'bandpass', when = 0 } = {}) {
  const ctx = sound?.ctx;
  if (!ctx || sound.muted || !sound.noise) return;
  const src = ctx.createBufferSource();
  src.buffer = sound.noise;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const gn = ctx.createGain();
  const t = ctx.currentTime + when;
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.03, dur * 0.3));
  gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(gn).connect(sound.sfx);
  src.start(t, Math.random() * 0.2, dur + 0.05);
}
const ok = (s) => s?.ctx && !s.muted;

export const sfx = {
  // A referee's whistle: one short, one long, or three for full time.
  whistle(s, kind = 'short') {
    if (!ok(s)) return;
    const t = s.ctx.currentTime;
    const blow = (at, dur) => {
      s.tone(2250, t + at, dur, { gain: 0.045, attack: 0.01 });
      s.tone(2330, t + at, dur, { gain: 0.03, type: 'triangle', attack: 0.01 });
      noise(s, { freq: 2400, q: 3, gain: 0.03, dur, when: at });
    };
    if (kind === 'short') blow(0, 0.22);
    else if (kind === 'long') {
      blow(0, 0.18);
      blow(0.24, 0.6);
    } else {
      blow(0, 0.2);
      blow(0.3, 0.2);
      blow(0.6, 0.8);
    }
  },
  kick(s, k = 0.5) {
    if (!ok(s)) return;
    s.tone(170 + k * 40, s.ctx.currentTime, 0.1, { slideTo: 70, gain: 0.1 + k * 0.08 });
    noise(s, { freq: 1300, gain: 0.04 + k * 0.05, dur: 0.05 });
  },
  bounce(s, k = 0.5) {
    if (!ok(s)) return;
    s.tone(140, s.ctx.currentTime, 0.07, { slideTo: 80, gain: 0.03 + k * 0.05 });
  },
  post(s) {
    if (!ok(s)) return;
    const t = s.ctx.currentTime;
    s.tone(1320, t, 0.5, { gain: 0.05, type: 'triangle' });
    s.tone(1980, t, 0.3, { gain: 0.025 });
  },
  net(s) {
    noise(s, { freq: 700, q: 0.6, gain: 0.1, dur: 0.35, type: 'lowpass' });
  },
  cheer(s, k = 1) {
    noise(s, { freq: 1100, q: 0.5, gain: 0.07 * k, dur: 1.8 });
    noise(s, { freq: 2300, q: 0.8, gain: 0.04 * k, dur: 1.4, when: 0.12 });
    if (!ok(s)) return;
    const t = s.ctx.currentTime;
    for (let i = 0; i < 6; i++) s.tone(480 + Math.random() * 520, t + Math.random() * 0.6, 0.32, { slideTo: 900 + Math.random() * 500, gain: 0.014, type: 'triangle' });
  },
  aww(s) {
    noise(s, { freq: 600, q: 0.6, gain: 0.05, dur: 1.0 });
    if (!ok(s)) return;
    const t = s.ctx.currentTime;
    for (let i = 0; i < 4; i++) s.tone(520 + Math.random() * 120, t + Math.random() * 0.15, 0.7, { slideTo: 300, gain: 0.012, type: 'triangle' });
  },
};
