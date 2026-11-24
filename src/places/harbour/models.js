import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { colorBake, boardDraw, fitText, heartPath, C } from '../school/kit.js';
import { mat, umat, mesh, canvasTexture, roundRect, bakeStatic, rng, FONT } from '../../util.js';
import { makeFish } from '../../arena/fishing/fish.js';

// Models for the harbour: boats, the lighthouse, the fish market, the bait hut, pier parts and gulls.
// Every builder returns a group whose origin is at its base (the ground, or the waterline for things
// that float), facing +Z. Boats point their bow along +Z.

export const SEA = -1.25; // the town's sea surface
export const DECK = 0.12; // top of the pier planks

const P = Math.PI;
const WOOD = '#c98a5a';
const WOOD_DARK = '#8a5a3c';
const PILE = '#7a5236';
const ROPE = '#ead6ad';

// Bake a floating model into a few meshes so each boat costs only a couple of draw calls.
export function bakeGroup(group, keep = []) {
  colorBake(group, keep);
  bakeStatic(group, keep, mergeGeometries);
  return group;
}

// ---------------------------------------------------------------- hull
// A rounded boat hull from the lower half of a sphere: a pointed bow at +Z, a flat transom at -Z
// and a sheer line that rises toward both ends. o: { bow, sheer, transom }.
export function hullPoint(v, L, B, D, o) {
  let xn = v.x;
  const yn = v.y;
  const zn = v.z;
  if (zn > 0) xn *= 1 - o.bow * zn * zn;
  const zc = Math.max(zn, -o.transom);
  const sheer = o.sheer * zc * zc * (zc > 0 ? 1.3 : 0.6) * (1 + yn);
  return v.set((xn * B) / 2, yn * D + sheer, (zc * L) / 2);
}

function hullGeo(L, B, D, o, seg = 26) {
  const g = new THREE.SphereGeometry(1, seg, 9, 0, P * 2, P / 2, P / 2);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    hullPoint(v.fromBufferAttribute(p, i), L, B, D, o);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function rimCurve(L, B, D, o, drop = 0, inset = 1) {
  const pts = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * P * 2;
    hullPoint(v.set(Math.cos(a) * inset, 0, Math.sin(a) * inset), L, B, D, o);
    pts.push(new THREE.Vector3(v.x, v.y - drop, v.z));
  }
  return new THREE.CatmullRomCurve3(pts, true);
}

// Half width of the hull at the rim at normalised length position zn (-1 stern .. 1 bow).
export function halfBeam(B, o, zn) {
  return (B / 2) * Math.sqrt(Math.max(0, 1 - zn * zn)) * (zn > 0 ? 1 - o.bow * zn * zn : 1);
}

function hull(k, { L, B, D, color, stripe, rim, inner = '#d9a874', o = { bow: 0.62, sheer: 0.16, transom: 0.84 } }) {
  const g = new THREE.Group();
  g.add(mesh(hullGeo(L, B, D, o), mat(color, { rough: 0.7 })));
  const inside = mesh(hullGeo(L * 0.94, B * 0.9, D * 0.9, o), mat(inner, { rough: 0.85, side: THREE.BackSide }), { cast: false });
  inside.position.y = 0.005;
  g.add(inside);
  g.add(mesh(new THREE.TubeGeometry(rimCurve(L, B, D, o), 60, 0.05, 6, true), mat(rim, { rough: 0.6 })));
  if (stripe) g.add(mesh(new THREE.TubeGeometry(rimCurve(L, B, D, o, 0.13, 0.985), 60, 0.035, 5, true), mat(stripe, { rough: 0.6 }), { cast: false }));
  return { g, o, L, B, D };
}

// Painted letters (a boat's name) on transparent canvas, cut out with alphaTest.
function nameDecal(atlas, text, w, h, color, { outline = null, heart = true } = {}) {
  return atlas.panel(w, h, Math.round(w * 400), Math.round(h * 400), (ctx, pw, ph) => {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(ph * 0.7)}px ${FONT}`;
    if (outline) {
      ctx.lineWidth = ph * 0.12;
      ctx.strokeStyle = outline;
      ctx.lineJoin = 'round';
      ctx.strokeText(text, pw / 2 - (heart ? ph * 0.2 : 0), ph * 0.54);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, pw / 2 - (heart ? ph * 0.2 : 0), ph * 0.54);
    if (heart) {
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = color;
      heartPath(ctx, pw / 2 + tw / 2 + ph * 0.18, ph * 0.5, ph * 0.42);
      ctx.fill();
    }
  });
}

// A name lying flat (on a floor or a roof), reading along the boat with its top toward the boat's left.
function topDecal(group, atlas, text, { x = 0, y, z, w, h, color, outline }) {
  const d = nameDecal(atlas, text, w, h, color, { outline });
  d.rotation.order = 'YXZ';
  d.rotation.set(-P / 2, -P / 2, 0);
  d.position.set(x, y, z);
  group.add(d);
  return d;
}

function sideDecals(group, atlas, text, { B, o, zn, y, w, h, color, outline, L }) {
  const hb = halfBeam(B, o, zn) + 0.03;
  for (const s of [1, -1]) {
    const d = nameDecal(atlas, text, w, h, color, { outline });
    d.position.set(s * hb, y, (zn * L) / 2);
    d.rotation.y = s * (P / 2) - s * 0.22 * Math.sign(zn);
    group.add(d);
  }
}

// ---------------------------------------------------------------- boats
// The little rowing boat "Roji". Oars and the bow lantern stay separate so they can move and glow.
export const ROW = { L: 3.0, B: 1.34, D: 0.44, seatY: -0.12, rowZ: 0.08, sternZ: -0.86 };
export function rowBoat(k, atlas, glassMat) {
  const root = new THREE.Group();
  const H = hull(k, { L: ROW.L, B: ROW.B, D: ROW.D, color: '#ffe0e8', stripe: C.rose, rim: '#fff4e3' });
  root.add(H.g);
  const o = H.o;
  for (const zn of [ROW.rowZ / (ROW.L / 2), ROW.sternZ / (ROW.L / 2), 0.55]) {
    const w = halfBeam(ROW.B, o, zn) * 2 * 0.9;
    root.add(k.at(k.box(w, 0.06, zn > 0.4 ? 0.22 : 0.3, '#e9b98a'), 0, ROW.seatY - 0.03, (zn * ROW.L) / 2));
  }
  root.add(k.at(k.box(0.22, 0.03, ROW.L * 0.7, '#d29d6c'), 0, -ROW.D * 0.78, -0.05));
  sideDecals(root, atlas, 'Roji', { B: ROW.B, o, zn: 0.36, y: -0.1, w: 0.7, h: 0.24, color: C.rose, outline: '#ffffff', L: ROW.L });
  topDecal(root, atlas, 'Roji', { y: -ROW.D * 0.78 + 0.02, z: -0.42, w: 0.6, h: 0.22, color: C.rose, outline: '#ffffff' });
  // Oars: pivots at the oarlocks, the shaft points outwards along +X (left) / -X (right)
  const oars = [];
  const hb = halfBeam(ROW.B, o, ROW.rowZ / (ROW.L / 2));
  for (const s of [1, -1]) {
    root.add(k.at(k.tor(0.05, 0.015, '#8a8f9a', P * 2, { metal: 0.5, rough: 0.4 }), s * hb, 0.07, ROW.rowZ));
    const pivot = new THREE.Group();
    pivot.position.set(s * hb, 0.06, ROW.rowZ);
    const arm = new THREE.Group();
    pivot.add(arm);
    const shaft = k.cyl(0.028, 0.028, 2.0, '#e8c48e', 8);
    shaft.rotation.z = P / 2;
    shaft.position.x = s * 0.55;
    const blade = k.rbox(0.5, 0.03, 0.18, s > 0 ? '#ef5b6f' : '#3f7bf0', 0.012);
    blade.position.x = s * 1.42;
    const grip = k.cyl(0.035, 0.035, 0.16, '#9b6a43', 8);
    grip.rotation.z = P / 2;
    grip.position.x = -s * 0.42;
    arm.add(shaft, blade, grip);
    colorBake(arm);
    root.add(pivot);
    oars.push({ pivot, arm, side: s });
  }
  // Bow lantern on a little pole
  const lz = 0.78 * (ROW.L / 2);
  root.add(k.at(k.cyl(0.02, 0.02, 0.7, '#5c4a3c', 6), 0, 0.3, lz));
  const lantern = new THREE.Group();
  lantern.position.set(0, 0.7, lz);
  lantern.add(k.at(k.box(0.15, 0.03, 0.15, '#3d4a52'), 0, 0.12, 0), k.at(k.box(0.15, 0.03, 0.15, '#3d4a52'), 0, -0.1, 0));
  const glass = mesh(new THREE.BoxGeometry(0.11, 0.19, 0.11), glassMat, { cast: false });
  lantern.add(glass, k.at(k.cone(0.1, 0.08, '#3d4a52', 4), 0, 0.17, 0));
  colorBake(lantern, [glass]);
  root.add(lantern);
  return { root, oars, lantern, hull: H };
}

// The red fishing boat "Homama", with a little cabin, a mast and nets.
export function fishingBoat(k, atlas) {
  const root = new THREE.Group();
  const L = 4.6;
  const B = 1.9;
  const D = 0.62;
  const H = hull(k, { L, B, D, color: '#e5484d', stripe: '#fff4e3', rim: '#fff4e3', inner: '#c98a5a' });
  root.add(H.g);
  const deck = k.cyl(1, 1, 0.06, '#d9a874', 26);
  deck.scale.set((B / 2) * 0.86, 1, (L / 2) * 0.8);
  root.add(k.at(deck, 0, -0.2, -0.05));
  // Cabin
  root.add(k.at(k.rbox(1.25, 1.05, 1.3, '#fff4e3', 0.08), 0, 0.33, -0.65));
  root.add(k.at(k.rbox(1.5, 0.12, 1.62, C.teal, 0.05), 0, 0.92, -0.65));
  for (const s of [1, -1]) {
    root.add(k.at(k.rot(k.tor(0.13, 0.03, C.teal, P * 2), 0, P / 2, 0), s * 0.63, 0.45, -0.6));
    root.add(k.at(k.rot(k.cyl(0.11, 0.11, 0.02, '#8fd3ff', 14), 0, 0, P / 2), s * 0.635, 0.45, -0.6));
  }
  for (const x of [-0.3, 0.3]) {
    root.add(k.at(k.rot(k.tor(0.12, 0.03, C.teal, P * 2), 0, 0, 0), x, 0.5, 0.0));
    root.add(k.at(k.rot(k.cyl(0.1, 0.1, 0.02, '#8fd3ff', 14), P / 2, 0, 0), x, 0.5, 0.005));
  }
  // Life ring on the back of the cabin
  for (let i = 0; i < 4; i++) root.add(k.at(k.rot(k.tor(0.2, 0.06, i % 2 ? '#ffffff' : '#ff7a4d', P / 2, undefined, 6, 6), 0, 0, (i * P) / 2), 0, 0.42, -1.31));
  // Mast, pennant and a lamp
  root.add(k.at(k.cyl(0.05, 0.06, 2.6, '#f2e6d0', 8), 0, 1.0, 0.75));
  root.add(k.at(k.box(0.9, 0.05, 0.05, '#f2e6d0'), 0, 1.7, 0.75));
  const flag = new THREE.Group();
  flag.position.set(0, 2.2, 0.75);
  const fs = new THREE.Shape();
  fs.moveTo(0, 0.14);
  fs.lineTo(0.6, 0.0);
  fs.lineTo(0, -0.14);
  fs.closePath();
  flag.add(k.at(k.rot(mesh(new THREE.ShapeGeometry(fs), mat(C.sun, { side: THREE.DoubleSide }), { cast: false }), 0, -P / 2, 0), 0, 0, 0));
  root.add(flag);
  root.add(k.at(k.sph(0.08, '#ffffff'), 0, 2.32, 0.75));
  // Nets and crates on deck
  for (let i = 0; i < 9; i++) root.add(k.at(k.sph(0.18 + (i % 3) * 0.04, i % 2 ? '#4f9a8f' : '#5fae9e', undefined, 10), Math.sin(i * 2.1) * 0.32, -0.1 + (i % 3) * 0.08, 1.25 + Math.cos(i * 1.7) * 0.25));
  for (const [x, z] of [[-0.45, -1.55], [0.42, -1.5]]) {
    root.add(k.at(k.rbox(0.46, 0.3, 0.42, WOOD, 0.03), x, -0.02, z));
    root.add(k.at(k.box(0.4, 0.04, 0.36, '#e8f6ff'), x, 0.13, z));
  }
  for (const s of [1, -1]) for (const z of [-0.8, 0.6]) root.add(k.at(k.rot(k.tor(0.12, 0.05, '#2f2a33', P * 2, undefined, 14, 6), 0, P / 2, 0), s * (halfBeam(B, H.o, (z * 2) / L) + 0.04), -0.18, z));
  sideDecals(root, atlas, 'Homama', { B, o: H.o, zn: 0.4, y: -0.16, w: 1.15, h: 0.3, color: '#ffffff', outline: null, L });
  topDecal(root, atlas, 'Homama', { y: 0.985, z: -0.65, w: 1.4, h: 0.36, color: '#ffffff', outline: '#2f8f7a' });
  return { root, flag };
}

// A striped sail on a slightly bellied triangle. u along the boom, v up the mast.
function sailGeo(height, boom, belly = 0.28, seg = 8) {
  const pos = [];
  const uv = [];
  const idx = [];
  for (let j = 0; j <= seg; j++) {
    const v = j / seg;
    for (let i = 0; i <= seg; i++) {
      const u = i / seg;
      const chord = boom * (1 - v);
      pos.push(belly * Math.sin(P * u) * (1 - v * 0.7), v * height, -u * chord);
      uv.push(u, v);
    }
  }
  for (let j = 0; j < seg; j++) {
    for (let i = 0; i < seg; i++) {
      const a = j * (seg + 1) + i;
      idx.push(a, a + 1, a + seg + 1, a + 1, a + seg + 2, a + seg + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

let stripeTex = null;
function sailMaterial() {
  stripeTex ??= canvasTexture(64, 256, (ctx, w, h) => {
    const cols = ['#f6907a', '#fff4e3', '#ffd166', '#fff4e3', '#3fbf9f', '#fff4e3'];
    const n = 12;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(0, (i * h) / n, w, h / n + 1);
    }
  });
  return umat('#ffffff', { map: stripeTex, side: THREE.DoubleSide, rough: 0.85 });
}

export function sailBoat(k) {
  const root = new THREE.Group();
  const L = 4.0;
  const B = 1.5;
  const H = hull(k, { L, B, D: 0.52, color: '#fdf7ee', stripe: C.teal, rim: C.teal, inner: '#e3c49a' });
  root.add(H.g);
  const deck = k.cyl(1, 1, 0.05, '#e9c79c', 24);
  deck.scale.set((B / 2) * 0.86, 1, (L / 2) * 0.78);
  root.add(k.at(deck, 0, -0.14, 0));
  const mz = 0.35;
  root.add(k.at(k.cyl(0.05, 0.06, 4.6, '#f2e6d0', 8), 0, 2.2, mz));
  root.add(k.at(k.rot(k.cyl(0.04, 0.04, 2.2, '#c98a5a', 8), P / 2, 0, 0), 0, 0.62, mz - 1.1));
  const sail = new THREE.Group();
  sail.position.set(0, 0.68, mz - 0.03);
  sail.add(mesh(sailGeo(3.7, 2.15), sailMaterial(), { cast: true }));
  root.add(sail);
  const jibShape = new THREE.Shape();
  jibShape.moveTo(0, 0);
  jibShape.lineTo(1.3, 0);
  jibShape.lineTo(0, 2.9);
  jibShape.closePath();
  const jib = mesh(new THREE.ShapeGeometry(jibShape), mat('#fff4e3', { side: THREE.DoubleSide, rough: 0.85 }));
  jib.rotation.y = -P / 2;
  jib.position.set(0.02, 0.62, mz + 0.15);
  root.add(jib);
  root.add(k.at(k.cone(0.12, 0.3, C.rose, 4), 0, 4.62, mz));
  for (let i = 0; i < 5; i++) root.add(k.at(k.sph(0.06, ['#ff8fb1', '#ffd166', '#7fd8bf', '#8fd3ff', '#c7a6ff'][i], undefined, 8), 0, 4.3 - i * 0.62, mz + 0.03 + i * 0.27));
  return { root, sail };
}

// A white swan pedal boat with a curly neck and two pink seats.
export function swanBoat(k) {
  const root = new THREE.Group();
  const L = 2.5;
  const B = 1.6;
  const o = { bow: 0.35, sheer: 0.05, transom: 0.95 };
  const H = hull(k, { L, B, D: 0.5, color: '#ffffff', stripe: null, rim: '#ffd1dc', inner: '#f3e8f0', o });
  root.add(H.g);
  for (const z of [0.15, -0.45]) root.add(k.at(k.rbox(1.0, 0.3, 0.42, '#ff9eb5', 0.06), 0, -0.08, z));
  const neck = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0.95), new THREE.Vector3(0, 0.55, 1.2), new THREE.Vector3(0, 1.05, 0.95), new THREE.Vector3(0, 1.4, 1.05)]);
  root.add(mesh(new THREE.TubeGeometry(neck, 20, 0.13, 10), mat('#ffffff', { rough: 0.6 })));
  root.add(k.at(k.sph(0.22, '#ffffff', undefined, 16), 0, 1.5, 1.12));
  root.add(k.at(k.rot(k.cone(0.09, 0.26, '#ff9f43', 10), P / 2, 0, 0), 0, 1.46, 1.42));
  root.add(k.at(k.sph(0.07, '#2f2a33', undefined, 10), 0, 1.5, 1.3));
  for (const s of [1, -1]) {
    root.add(k.at(k.sph(0.035, '#2f2a33', undefined, 8), s * 0.14, 1.57, 1.22));
    const wing = k.sph(0.5, '#ffffff', undefined, 14);
    wing.scale.set(0.28, 0.42, 1.0);
    wing.rotation.set(-0.35, 0, s * 0.15);
    root.add(k.at(wing, s * 0.74, 0.18, -0.15));
  }
  const tail = k.cone(0.25, 0.5, '#ffffff', 10);
  tail.rotation.x = -2.2;
  root.add(k.at(tail, 0, 0.18, -1.2));
  return { root };
}

// ---------------------------------------------------------------- lighthouse on its rock
export function lighthouse(k, atlas) {
  const root = new THREE.Group();
  const rocks = [
    [0, -0.4, 0, 2.3, '#b8aa9c'],
    [1.4, -0.6, 0.9, 1.3, '#a39587'],
    [-1.5, -0.7, 0.6, 1.2, '#c9bcae'],
    [0.6, -0.7, -1.4, 1.4, '#a39587'],
    [-0.9, -0.8, 1.6, 0.8, '#b8aa9c'],
    [1.8, -0.9, -0.6, 0.9, '#c9bcae'],
  ];
  for (const [x, y, z, r, c] of rocks) {
    const m = mesh(new THREE.IcosahedronGeometry(r, 1), mat(c, { flat: true, rough: 0.95 }));
    m.scale.set(1, 0.55, 1);
    m.position.set(x, y, z);
    root.add(m);
  }
  root.add(k.at(k.cyl(1.25, 1.35, 0.3, '#d8cfc4', 22), 0, 0.72, 0));
  const bands = 5;
  const bh = 1.15;
  const r0 = 0.98;
  const r1 = 0.7;
  for (let i = 0; i < bands; i++) {
    const a = r0 + ((r1 - r0) * i) / bands;
    const b = r0 + ((r1 - r0) * (i + 1)) / bands;
    root.add(k.at(k.cyl(b, a, bh, i % 2 ? C.red : '#fffaf4', 22), 0, 0.87 + bh * (i + 0.5), 0));
  }
  const top = 0.87 + bh * bands;
  // Door and windows facing the harbour (+Z)
  root.add(k.at(k.rbox(0.5, 0.85, 0.1, C.teal, 0.05), 0, 1.3, 0.95));
  root.add(k.at(k.sph(0.035, C.sun, undefined, 8), 0.15, 1.28, 1.01));
  const winR = (y) => r0 + ((r1 - r0) * (y - 0.87)) / (bh * bands);
  for (const [y, heart] of [[2.95, true], [4.15, false], [5.2, false]]) {
    const r = winR(y);
    root.add(k.at(k.rbox(0.34, 0.44, 0.08, '#fff4e3', 0.04), 0, y, r - 0.01));
    if (heart) {
      // The window with a heart in it
      const pane = atlas.panel(0.26, 0.34, 104, 136, (ctx, w, h) => {
        ctx.fillStyle = '#ffe9a8';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ff6b8a';
        heartPath(ctx, w / 2, h * 0.52, w * 0.62);
        ctx.fill();
        ctx.strokeStyle = '#fff4e3';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.stroke();
      });
      pane.position.set(0, y, r + 0.035);
      root.add(pane);
    } else root.add(k.at(k.box(0.26, 0.34, 0.02, '#5d7fa8'), 0, y, r + 0.035));
  }
  // Gallery and rail
  root.add(k.at(k.cyl(1.0, 0.85, 0.14, '#3d4a52', 22), 0, top + 0.07, 0));
  root.add(k.at(k.rot(k.tor(0.96, 0.03, '#3d4a52', P * 2, undefined, 28, 6), P / 2, 0, 0), 0, top + 0.55, 0));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * P * 2;
    root.add(k.at(k.cyl(0.02, 0.02, 0.45, '#3d4a52', 5), Math.cos(a) * 0.96, top + 0.35, Math.sin(a) * 0.96));
  }
  // Lantern room, roof and a tiny fish weathervane
  const lampMat = umat('#fff3c4', { emissive: '#ffcf6a', ei: 0.7, rough: 0.25 });
  const lamp = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.85, 16), lampMat, { cast: false });
  lamp.position.y = top + 0.57;
  root.add(lamp);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * P * 2;
    root.add(k.at(k.box(0.05, 0.86, 0.05, '#3d4a52'), Math.cos(a) * 0.5, top + 0.57, Math.sin(a) * 0.5));
  }
  root.add(k.at(k.cone(0.72, 0.62, C.red, 18), 0, top + 1.31, 0));
  root.add(k.at(k.sph(0.12, C.sun, undefined, 12), 0, top + 1.66, 0));
  root.add(k.at(k.cyl(0.015, 0.015, 0.4, '#3d4a52', 5), 0, top + 1.9, 0));
  const vane = makeFish('sardine', { lite: true });
  vane.scale.setScalar(0.42);
  vane.position.set(0, top + 2.1, 0);
  vane.rotation.y = 0.4;
  root.add(vane);
  // Two slow beams, shown at dusk and night
  const beamMat = new THREE.MeshBasicMaterial({ color: '#fff1b8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const beamGeo = new THREE.ConeGeometry(1.2, 10, 16, 1, true);
  beamGeo.translate(0, -5, 0);
  beamGeo.rotateZ(P / 2);
  const beam = new THREE.Group();
  beam.position.y = top + 0.57;
  const b1 = new THREE.Mesh(beamGeo, beamMat);
  const b2 = new THREE.Mesh(beamGeo, beamMat);
  b2.rotation.y = P;
  beam.add(b1, b2);
  root.add(beam);
  return { root, beam, beamMat, lampTop: top + 0.57 };
}

// ---------------------------------------------------------------- the fish market
export function market(k, atlas) {
  const root = new THREE.Group();
  const W = 4.8;
  // Counter with a painted front
  root.add(k.at(k.box(W, 0.92, 1.0, WOOD), 0, 0.46, 0));
  root.add(k.at(k.box(W + 0.1, 0.08, 1.1, WOOD_DARK), 0, 0.9, 0));
  const front = atlas.panel(W - 0.3, 0.62, 900, 116, (ctx, w, h) => {
    ctx.fillStyle = '#fff4e3';
    roundRect(ctx, 4, 4, w - 8, h - 8, 26);
    ctx.fill();
    ctx.strokeStyle = '#2f9fb8';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.fillStyle = '#2f9fb8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fitText(ctx, 'Fresh fish every morning', w / 2, h * 0.54, w * 0.62, h * 0.5, 700);
    for (const [x, c] of [[w * 0.09, '#ff8a3d'], [w * 0.91, '#e98f9a']]) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(x, h / 2, h * 0.32, h * 0.18, 0, 0, P * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - h * 0.28, h / 2);
      ctx.lineTo(x - h * 0.48, h * 0.3);
      ctx.lineTo(x - h * 0.48, h * 0.7);
      ctx.fill();
      ctx.fillStyle = '#23202a';
      ctx.beginPath();
      ctx.arc(x + h * 0.16, h * 0.46, 4, 0, P * 2);
      ctx.fill();
    }
  });
  front.position.set(0, 0.48, 0.505);
  root.add(front);
  // Tilted ice bed with crushed ice
  const ice = new THREE.Group();
  ice.position.set(0, 1.0, 0.02);
  ice.rotation.x = 0.16;
  ice.add(k.box(W - 0.3, 0.12, 0.92, '#e3f4ff'));
  const r = rng(5);
  for (let i = 0; i < 46; i++) {
    const c = k.box(0.09, 0.07, 0.09, r() < 0.5 ? '#f6fcff' : '#cfeaff');
    c.position.set((r() - 0.5) * (W - 0.45), 0.07, (r() - 0.5) * 0.8);
    c.rotation.set(r() * 3, r() * 3, r() * 3);
    ice.add(c);
  }
  const lay = [
    ['sardine', -1.85, -0.1, 0.18, 0.2],
    ['sardine', -1.6, 0.18, 0.17, -0.3],
    ['sardine', -1.35, -0.18, 0.19, 0.1],
    ['mackerel', -0.85, 0.05, 0.34, 0.2],
    ['seabream', -0.2, -0.05, 0.4, -0.15],
    ['snapper', 0.55, 0.06, 0.5, 0.1],
    ['octopus', 1.45, 0.0, 0.42, 0.6],
    ['seabass', 2.05, -0.12, 0.42, -0.2],
  ];
  for (const [id, x, z, s, yaw] of lay) {
    const f = makeFish(id, { lite: true });
    f.scale.setScalar(s);
    if (id === 'octopus') f.position.set(x, 0.11, z);
    else {
      f.rotation.set(-P / 2, 0, yaw);
      f.position.set(x, 0.09 + s * 0.04, z);
    }
    ice.add(f);
  }
  for (const [x, z] of [[-1.1, 0.32], [0.15, 0.34], [1.0, -0.32], [1.85, 0.3]]) {
    ice.add(k.at(k.sph(0.06, '#ffe066', undefined, 10), x, 0.1, z));
    ice.add(k.at(k.sph(0.05, '#5aa84f', undefined, 8), x + 0.08, 0.1, z - 0.05));
  }
  root.add(ice);
  // Striped awning on four posts, with a scalloped edge
  const roofY = (z) => 2.62 - 0.2236 * (z + 0.4) - 0.03;
  for (const [x, z] of [[-W / 2 - 0.05, 0.7], [W / 2 + 0.05, 0.7], [-W / 2 - 0.05, -1.5], [W / 2 + 0.05, -1.5]]) root.add(k.at(k.cyl(0.06, 0.07, roofY(z), '#fff4e3', 10), x, roofY(z) / 2, z));
  const roof = new THREE.Group();
  roof.position.set(0, 2.62, -0.4);
  roof.rotation.x = 0.22;
  const n = 9;
  for (let i = 0; i < n; i++) roof.add(k.at(k.box((W + 0.5) / n + 0.002, 0.06, 2.6, i % 2 ? '#fff4e3' : '#2f9fb8'), -((W + 0.5) / 2) + ((W + 0.5) / n) * (i + 0.5), 0, 0));
  root.add(roof);
  const valY = 2.62 - Math.sin(0.22) * 1.3;
  for (let i = 0; i < n * 2; i++) {
    const sc = mesh(new THREE.CircleGeometry(0.16, 12, 0, P), mat(i % 2 ? '#fff4e3' : '#2f9fb8', { side: THREE.DoubleSide }), { cast: false });
    sc.rotation.z = P;
    sc.position.set(-((W + 0.5) / 2) + ((W + 0.5) / (n * 2)) * (i + 0.5), valY - 0.02, 0.9 + 0.005);
    root.add(sc);
  }
  root.add(k.at(k.box(W + 0.5, 0.12, 0.05, '#2f9fb8'), 0, valY + 0.04, 0.89));
  // Board on top
  const sign = atlas.panel(2.3, 0.62, 520, 140, boardDraw(['Island harbour', 'Fish Market'], { edge: '#2f9fb8', small: '#2f9fb8' }));
  sign.position.set(0, 2.72, 0.95);
  root.add(sign, k.at(k.box(2.36, 0.68, 0.05, WOOD_DARK), 0, 2.72, 0.91));
  // Hanging scale at the right end: dial, needle and pan
  const SX = W / 2 - 0.35;
  root.add(k.at(k.box(0.06, 0.06, 0.9, '#3d4a52'), SX, 2.25, 0.35));
  root.add(k.at(k.rot(k.cyl(0.18, 0.18, 0.07, '#fff4e3', 20), P / 2, 0, 0), SX, 1.95, 0.75));
  const face = atlas.panel(0.3, 0.3, 120, 120, (ctx, w, h) => {
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2, 0, P * 2);
    ctx.fill();
    ctx.strokeStyle = '#3b2b3f';
    ctx.lineWidth = 4;
    for (let i = 0; i <= 10; i++) {
      const a = -P * 0.75 + (i / 10) * P * 1.5;
      ctx.beginPath();
      ctx.moveTo(w / 2 + Math.sin(a) * w * 0.38, h / 2 - Math.cos(a) * h * 0.38);
      ctx.lineTo(w / 2 + Math.sin(a) * w * 0.46, h / 2 - Math.cos(a) * h * 0.46);
      ctx.stroke();
    }
    ctx.fillStyle = '#ef5b6f';
    heartPath(ctx, w / 2, h * 0.7, 22);
    ctx.fill();
  });
  face.position.set(SX, 1.95, 0.79);
  root.add(face);
  const needle = new THREE.Group();
  needle.position.set(SX, 1.95, 0.8);
  needle.add(k.at(k.box(0.018, 0.13, 0.012, C.red), 0, 0.055, 0));
  root.add(needle);
  for (const a of [0, 2.1, 4.2]) root.add(k.at(k.rot(k.cyl(0.006, 0.006, 0.42, '#8a8f9a', 4), Math.sin(a) * 0.32, 0, Math.cos(a) * 0.32), SX + Math.cos(a) * 0.07, 1.6, 0.75 + Math.sin(a) * 0.07));
  const pan = new THREE.Group();
  pan.position.set(SX, 1.38, 0.75);
  pan.add(k.cyl(0.24, 0.2, 0.04, '#c9d3dc', 18, { metal: 0.4, rough: 0.4 }));
  root.add(pan);
  // Price board on an easel beside the stall
  const chalk = atlas.panel(0.9, 1.05, 270, 315, (ctx, w, h) => {
    ctx.fillStyle = '#2f3b38';
    roundRect(ctx, 0, 0, w, h, 18);
    ctx.fill();
    ctx.strokeStyle = '#c98a5a';
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.fillStyle = '#fff6e0';
    ctx.textAlign = 'center';
    fitText(ctx, "Today's catch", w / 2, h * 0.16, w * 0.8, 34, 600);
    ctx.textAlign = 'left';
    const rows = [['Sardines', '#9cc0e0'], ['Sea bream', '#f2b2b8'], ['Octopus', '#d99ac4'], ['Sea bass', '#c7d3dc']];
    rows.forEach(([t, c], i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(36, h * (0.33 + i * 0.15), 16, 8, 0, 0, P * 2);
      ctx.fill();
      ctx.fillStyle = '#fff6e0';
      fitText(ctx, t, 62, h * (0.345 + i * 0.15), w - 80, 28, 500);
    });
    ctx.fillStyle = '#ff9eb5';
    heartPath(ctx, w * 0.82, h * 0.92, 24);
    ctx.fill();
  });
  const easel = new THREE.Group();
  easel.position.set(-W / 2 - 0.9, 0, 0.6);
  easel.rotation.y = 0.35;
  for (const s of [1, -1]) easel.add(k.at(k.rot(k.box(0.06, 1.5, 0.06, WOOD_DARK), 0.12, 0, s * 0.12), s * 0.38, 0.72, 0));
  chalk.position.set(0, 0.92, 0.1);
  chalk.rotation.x = -0.12;
  easel.add(chalk);
  root.add(easel);
  // Crates and an ice tub behind the counter
  for (const [x, z, y] of [[-1.6, -1.15, 0], [-1.0, -1.25, 0], [-1.3, -1.2, 0.42], [1.8, -1.2, 0]]) root.add(k.at(k.rbox(0.55, 0.42, 0.5, '#d6a06a', 0.03), x, y + 0.21, z));
  root.add(k.at(k.cyl(0.32, 0.28, 0.5, '#8fd3ff', 16), 1.1, 0.25, -1.25));
  root.add(k.at(k.cyl(0.3, 0.3, 0.04, '#f6fcff', 16), 1.1, 0.5, -1.25));
  return { root, needle, pan, scale: new THREE.Vector3(SX, 1.38, 0.75), W };
}

// The fishmonger: a cheerful grown-up in a cap and apron behind the counter.
export const FISHMONGER_LOOK = { id: 'fishmonger', name: 'Fishmonger', gender: 'boy', skin: '#c98f68', hair: '#5b5552', hairstyle: 'short', mustache: '#4a4442', outfit: 'tee-pants', top: '#e8f3ff', bottom: '#2c3e66', shoes: '#3b2b3f', accent: '#2f9fb8' };
export function dressFishmonger(kid, k) {
  const cap = new THREE.Group();
  cap.add(k.at(k.sph(0.31, '#2f9fb8', undefined, 16), 0, 0.33, 0));
  cap.children[0].scale.set(1.04, 0.55, 1.04);
  cap.add(k.at(k.rot(k.cyl(0.2, 0.22, 0.03, '#2f9fb8', 14), 0.25, 0, 0), 0, 0.36, 0.25));
  cap.add(k.at(k.sph(0.04, '#fff4e3', undefined, 8), 0, 0.5, 0));
  kid.head.add(cap);
  const apron = k.rbox(0.36, 0.42, 0.05, '#ffffff', 0.02);
  apron.position.set(0, 0.5, 0.2);
  kid.body.add(apron);
  const pocket = k.box(0.14, 0.08, 0.01, '#2f9fb8');
  pocket.position.set(0, 0.45, 0.228);
  kid.body.add(pocket);
}

// ---------------------------------------------------------------- bait and tackle hut
export function tackleHut(k, atlas) {
  const root = new THREE.Group();
  const W = 3.8;
  const D = 2.8;
  const H = 2.3;
  root.add(k.at(k.box(W, H, D, '#a8dbe6'), 0, H / 2, 0));
  for (let i = 1; i < 6; i++) root.add(k.at(k.box(W + 0.02, 0.04, D + 0.02, '#c7ebf2'), 0, (i * H) / 6, 0));
  for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) root.add(k.at(k.box(0.12, H, 0.12, '#fff4e3'), x, H / 2, z));
  // Gable roof
  for (const s of [1, -1]) {
    const slab = k.box(W + 0.5, 0.14, D / 2 / Math.cos(0.5) + 0.3, '#f6907a');
    slab.rotation.x = s * 0.5;
    slab.position.set(0, H + 0.42, (s * D) / 4 + s * 0.05);
    root.add(slab);
  }
  root.add(k.at(k.rot(k.cyl(0.1, 0.1, W + 0.55, '#e5484d', 10), 0, 0, P / 2), 0, H + 0.82, 0));
  const gable = new THREE.Shape();
  gable.moveTo(-D / 2, 0);
  gable.lineTo(D / 2, 0);
  gable.lineTo(0, 0.72);
  gable.closePath();
  for (const s of [1, -1]) {
    const gm = mesh(new THREE.ShapeGeometry(gable), mat('#a8dbe6', { side: THREE.DoubleSide }));
    gm.rotation.y = P / 2;
    gm.position.set((s * W) / 2, H, 0);
    root.add(gm);
  }
  // Door with a porthole
  root.add(k.at(k.rbox(0.95, 1.85, 0.1, C.rose, 0.06), 0.75, 0.93, D / 2 + 0.03));
  root.add(k.at(k.tor(0.15, 0.04, '#fff4e3', P * 2), 0.75, 1.42, D / 2 + 0.09));
  root.add(k.at(k.cyl(0.13, 0.13, 0.02, '#8fd3ff', 14), 0.75, 1.42, D / 2 + 0.085).rotateX(P / 2));
  root.add(k.at(k.sph(0.045, C.sun, undefined, 8), 1.05, 0.95, D / 2 + 0.1));
  // Shop window with rods and a little drawing taped inside
  root.add(k.at(k.box(1.3, 1.0, 0.1, '#fff4e3'), -0.95, 1.25, D / 2 + 0.03));
  root.add(k.at(k.box(1.14, 0.84, 0.02, '#6f9cc8'), -0.95, 1.25, D / 2 + 0.085));
  for (let i = 0; i < 3; i++) root.add(k.at(k.rot(k.cyl(0.012, 0.018, 0.8, ['#ef5b6f', '#ffd166', '#3fbf9f'][i], 5), 0, 0, 0.5 - i * 0.12), -1.3 + i * 0.16, 1.25, D / 2 + 0.1));
  const drawing = atlas.panel(0.34, 0.27, 136, 108, (ctx, w, h) => {
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#9fd8ff';
    ctx.fillRect(0, h * 0.68, w, h * 0.32);
    // Two little people holding a fish, a heart above
    const kidDraw = (x, col, hair) => {
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.arc(x, h * 0.3, 11, 0, P * 2);
      ctx.fill();
      ctx.fillStyle = '#f8dccb';
      ctx.beginPath();
      ctx.arc(x, h * 0.33, 8, 0, P * 2);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.fillRect(x - 9, h * 0.42, 18, 26);
    };
    kidDraw(w * 0.33, '#ef5b6f', '#2a1a13');
    kidDraw(w * 0.67, '#3f7bf0', '#141010');
    ctx.fillStyle = '#ff8a3d';
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.6, 14, 6, 0, 0, P * 2);
    ctx.fill();
    ctx.fillStyle = '#ff6b8a';
    heartPath(ctx, w / 2, h * 0.14, 16);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(w * 0.42, 0, w * 0.16, 8);
  });
  drawing.position.set(-0.6, 1.5, D / 2 + 0.1);
  drawing.rotation.z = 0.08;
  root.add(drawing);
  // Sign over the door and window
  const sign = atlas.panel(2.4, 0.5, 560, 116, boardDraw(['Bait and Tackle'], { edge: C.rose }));
  sign.position.set(-0.1, 2.05, D / 2 + 0.09);
  root.add(sign);
  // Rods leaning on the side, a barrel, floats hanging on the wall, a worm bucket
  for (let i = 0; i < 3; i++) {
    const rod = k.cyl(0.015, 0.025, 2.3, ['#3f7bf0', '#ef5b6f', '#3fbf9f'][i], 6);
    rod.rotation.set(0.0, 0, 0.18 + i * 0.05);
    rod.position.set(W / 2 + 0.25 + i * 0.12, 1.12, 0.5 - i * 0.3);
    root.add(rod);
    root.add(k.at(k.cyl(0.05, 0.05, 0.05, '#3d4a52', 10).rotateZ(P / 2), W / 2 + 0.14 + i * 0.12, 0.4, 0.5 - i * 0.3));
  }
  root.add(k.at(k.cyl(0.32, 0.32, 0.8, '#a0602e', 14), -W / 2 - 0.45, 0.4, 0.7));
  for (const y of [0.15, 0.65]) root.add(k.at(k.rot(k.tor(0.33, 0.025, '#5c4a3c', P * 2, undefined, 18, 5), P / 2, 0, 0), -W / 2 - 0.45, y, 0.7));
  [C.sun, C.rose, C.teal, '#ffffff'].forEach((c, i) => {
    root.add(k.at(k.sph(0.12, c, undefined, 10), -W / 2 + 0.4 + i * 0.32, 1.65 - (i % 2) * 0.15, D / 2 + 0.16));
    root.add(k.at(k.cyl(0.008, 0.008, 0.3, ROPE, 4), -W / 2 + 0.4 + i * 0.32, 1.85 - (i % 2) * 0.08, D / 2 + 0.16));
  });
  root.add(k.at(k.cyl(0.2, 0.17, 0.3, '#7fd8bf', 14), 1.7, 0.15, D / 2 + 0.45));
  for (let i = 0; i < 3; i++) root.add(k.at(k.rot(k.tor(0.05, 0.018, '#ff9eb5', P * 1.4, undefined, 8, 4), P / 2, 0, i * 2), 1.66 + i * 0.05, 0.31, D / 2 + 0.42 + (i % 2) * 0.06));
  return { root, W, D };
}

// ---------------------------------------------------------------- little props
export function netTexture() {
  const t = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#3f8f86';
    ctx.lineWidth = 5;
    for (let i = -4; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 32, 0);
      ctx.lineTo(i * 32 + h, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i * 32 + h, 0);
      ctx.lineTo(i * 32, h);
      ctx.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function netRack(k, netMat) {
  const root = new THREE.Group();
  for (const x of [-2, 0, 2]) root.add(k.at(k.cyl(0.07, 0.08, 2.0, WOOD_DARK, 8), x, 1.0, 0));
  root.add(k.at(k.rot(k.cyl(0.025, 0.025, 4.1, ROPE, 5), 0, 0, P / 2), 0, 1.9, 0));
  const g = new THREE.PlaneGeometry(4, 1.5, 16, 5);
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const sag = Math.cos((x / 2) * P) * 0.5 + 0.5;
    const between = Math.abs(Math.sin((x / 2) * P));
    p.setXYZ(i, x, y - between * 0.18 * (0.5 - y / 1.5), Math.sin(x * 2.2) * 0.06 + sag * 0.02);
    uv.setXY(i, uv.getX(i) * 5, uv.getY(i) * 2);
  }
  g.computeVertexNormals();
  const net = mesh(g, netMat, { cast: true });
  net.position.y = 1.15;
  root.add(net);
  for (let i = 0; i < 9; i++) root.add(k.at(k.sph(0.07, i % 2 ? C.sun : '#ff9f43', undefined, 8), -1.9 + i * 0.475, 1.86, 0.03));
  return root;
}

export function lobsterPot(k, netMat) {
  const root = new THREE.Group();
  root.add(k.at(k.box(0.85, 0.05, 0.55, WOOD_DARK), 0, 0.025, 0));
  const shell = mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.84, 12, 1, true, 0, P), netMat);
  shell.rotation.set(0, 0, P / 2);
  shell.position.y = 0.05;
  root.add(shell);
  for (const x of [-0.4, 0, 0.4]) root.add(k.at(k.rot(k.tor(0.27, 0.018, WOOD, P, undefined, 10, 4), 0, P / 2, 0), x, 0.05, 0));
  return root;
}

export function bollard(k) {
  const g = new THREE.Group();
  g.add(k.at(k.cyl(0.11, 0.13, 0.32, '#3d4a52', 10), 0, 0.16, 0));
  g.add(k.at(k.cyl(0.15, 0.15, 0.06, '#3d4a52', 10), 0, 0.33, 0));
  return g;
}

export function crate(k, color = WOOD, s = 0.6) {
  const g = new THREE.Group();
  g.add(k.at(k.rbox(s, s * 0.8, s, color, 0.03), 0, s * 0.4, 0));
  for (const y of [0.18, 0.62]) g.add(k.at(k.box(s + 0.02, 0.05, s + 0.02, WOOD_DARK), 0, s * 0.8 * y, 0));
  return g;
}

// The sunset bench: two people wide, with a tiny brass plaque on the backrest.
export function bench(k, atlas) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) g.add(k.at(k.rbox(1.8, 0.05, 0.11, '#d4a373', 0.02), 0, 0.45, -0.17 + i * 0.12));
  for (let i = 0; i < 3; i++) g.add(k.at(k.rot(k.rbox(1.8, 0.11, 0.05, '#d4a373', 0.02), -0.18, 0, 0), 0, 0.66 + i * 0.15, -0.29 - i * 0.03));
  for (const x of [-0.78, 0.78]) {
    g.add(k.at(k.box(0.08, 0.45, 0.4, '#5c4a3c'), x, 0.22, 0));
    g.add(k.at(k.box(0.08, 0.58, 0.06, '#5c4a3c'), x, 0.72, -0.31));
    g.add(k.at(k.rbox(0.09, 0.05, 0.44, '#5c4a3c', 0.02), x, 0.66, -0.05));
  }
  const plaque = atlas.panel(0.42, 0.09, 210, 45, (ctx, w, h) => {
    ctx.fillStyle = '#e0b04f';
    roundRect(ctx, 2, 2, w - 4, h - 4, 10);
    ctx.fill();
    ctx.fillStyle = '#6a4a1a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fitText(ctx, 'For Roji, every sunset. H', w / 2, h / 2 + 1, w - 16, 22, 600);
  });
  plaque.position.set(0, 0.82, -0.27);
  plaque.rotation.x = -0.18;
  g.add(plaque);
  return g;
}

// The harbour bell on a little frame. Returns the swinging pivot.
export function bellFrame(k) {
  const root = new THREE.Group();
  for (const x of [-0.45, 0.45]) root.add(k.at(k.cyl(0.06, 0.07, 1.95, WOOD_DARK, 8), x, 0.97, 0));
  root.add(k.at(k.rot(k.cyl(0.06, 0.06, 1.1, WOOD_DARK, 8), 0, 0, P / 2), 0, 1.9, 0));
  const pivot = new THREE.Group();
  pivot.position.y = 1.84;
  const pts = [[0.03, 0], [0.08, -0.03], [0.1, -0.12], [0.14, -0.26], [0.2, -0.34], [0.2, -0.37], [0, -0.37]].map(([x, y]) => new THREE.Vector2(x, y));
  pivot.add(mesh(new THREE.LatheGeometry(pts, 18), mat(C.gold, { metal: 0.6, rough: 0.3 })));
  pivot.add(k.at(k.sph(0.045, '#8a6a2a', undefined, 8), 0, -0.36, 0));
  pivot.add(k.at(k.cyl(0.012, 0.012, 0.5, ROPE, 4), 0.02, -0.6, 0));
  pivot.add(k.at(k.sph(0.05, C.rose, undefined, 8), 0.02, -0.86, 0));
  root.add(pivot);
  return { root, pivot };
}

export function lanternPost(k, glassMat, h = 1.55) {
  const g = new THREE.Group();
  g.add(k.at(k.box(0.12, h, 0.12, WOOD_DARK), 0, h / 2, 0));
  g.add(k.at(k.box(0.3, 0.05, 0.06, WOOD_DARK), 0.1, h - 0.05, 0));
  const lan = new THREE.Group();
  lan.position.set(0.22, h - 0.28, 0);
  lan.add(k.at(k.box(0.17, 0.03, 0.17, '#3d4a52'), 0, 0.11, 0), k.at(k.box(0.17, 0.03, 0.17, '#3d4a52'), 0, -0.11, 0));
  lan.add(mesh(new THREE.BoxGeometry(0.13, 0.19, 0.13), glassMat, { cast: false }));
  lan.add(k.at(k.cone(0.12, 0.09, '#3d4a52', 4), 0, 0.17, 0));
  g.add(lan);
  return { root: g, light: new THREE.Vector3(0.22, h - 0.28, 0) };
}

// The upside-down rowing boat on trestles, half repainted, with a paint pot and brush.
export function boatOnTrestles(k) {
  const root = new THREE.Group();
  const o = { bow: 0.62, sheer: 0.16, transom: 0.84 };
  const hullM = mesh(hullGeo(2.8, 1.25, 0.42, o), mat('#7fd8bf', { rough: 0.75 }));
  hullM.rotation.z = P;
  hullM.position.y = 0.96;
  root.add(hullM);
  const keel = k.box(0.08, 0.05, 2.3, '#fff4e3');
  keel.position.set(0, 1.4, 0);
  root.add(keel);
  for (const z of [-0.8, 0.8]) {
    for (const s of [1, -1]) root.add(k.at(k.rot(k.box(0.06, 0.95, 0.06, WOOD_DARK), 0, 0, s * 0.25), s * 0.42, 0.46, z));
    root.add(k.at(k.box(1.1, 0.06, 0.08, WOOD_DARK), 0, 0.9, z));
  }
  root.add(k.at(k.cyl(0.12, 0.11, 0.18, '#ffffff', 12), 0.95, 0.09, 0.5));
  root.add(k.at(k.cyl(0.11, 0.11, 0.02, '#ff9eb5', 12), 0.95, 0.185, 0.5));
  root.add(k.at(k.rot(k.box(0.04, 0.3, 0.02, WOOD), 0, 0, 0.5), 0.88, 0.3, 0.5));
  return root;
}

// ---------------------------------------------------------------- instanced things
// Vertex-coloured geometry merged from simple parts, for instanced gulls and buoys.
function colored(parts) {
  const list = parts.map(([geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1]) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    geo.dispose();
    for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    g.applyMatrix4(m);
    const c = new THREE.Color(color);
    const a = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < a.length; i += 3) a.set([c.r, c.g, c.b], i);
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  });
  return mergeGeometries(list, false);
}

// A seagull: body (with head, beak, tail and legs) and one wing (pivot at the shoulder, along +X).
export function gullGeometries() {
  const S = (r, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h);
  const body = colored([
    [S(0.16), '#ffffff', 0, 0.2, 0, 0, 0, 0, 0.85, 0.8, 1.35],
    [S(0.12), '#d9dee6', 0, 0.27, -0.02, 0, 0, 0, 0.75, 0.4, 1.2],
    [S(0.1), '#ffffff', 0, 0.36, 0.17],
    [new THREE.ConeGeometry(0.035, 0.12, 6), '#ffb02e', 0, 0.35, 0.3, P / 2],
    [S(0.018, 6, 5), '#23202a', 0.06, 0.39, 0.22],
    [S(0.018, 6, 5), '#23202a', -0.06, 0.39, 0.22],
    [new THREE.ConeGeometry(0.08, 0.16, 5), '#9aa3ad', 0, 0.22, -0.26, -P / 2 - 0.25],
    [new THREE.CylinderGeometry(0.012, 0.012, 0.1, 4), '#ffb02e', 0.05, 0.05, 0],
    [new THREE.CylinderGeometry(0.012, 0.012, 0.1, 4), '#ffb02e', -0.05, 0.05, 0],
    [new THREE.BoxGeometry(0.05, 0.01, 0.06), '#ffb02e', 0.05, 0.005, 0.02],
    [new THREE.BoxGeometry(0.05, 0.01, 0.06), '#ffb02e', -0.05, 0.005, 0.02],
  ]);
  const wing = colored([
    [S(0.2, 10, 6), '#cfd6de', 0.2, 0, 0, 0, 0, 0, 1.0, 0.12, 0.42],
    [S(0.1, 8, 5), '#3d4450', 0.38, 0, -0.02, 0, 0, 0, 0.8, 0.1, 0.5],
  ]);
  return { body, wing };
}

// A red-and-white channel buoy with a little bell on top.
export function buoyGeometry() {
  return colored([
    [new THREE.CylinderGeometry(0.34, 0.42, 0.5, 14), '#ef5b6f', 0, 0.05, 0],
    [new THREE.CylinderGeometry(0.3, 0.34, 0.25, 14), '#ffffff', 0, 0.42, 0],
    [new THREE.ConeGeometry(0.3, 0.5, 14), '#ef5b6f', 0, 0.8, 0],
    [new THREE.SphereGeometry(0.08, 10, 8), '#ffd166', 0, 1.1, 0],
    [new THREE.TorusGeometry(0.42, 0.05, 6, 16), '#3d4a52', 0, -0.18, 0, P / 2],
  ]);
}

// Soft dot texture for glows and sparkles.
let dotTex = null;
export function dotTexture() {
  dotTex ??= canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  return dotTex;
}

let heartTex = null;
export function heartTexture() {
  heartTex ??= canvasTexture(64, 64, (ctx) => {
    ctx.fillStyle = '#ff6b8a';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    heartPath(ctx, 32, 34, 46);
    ctx.stroke();
    ctx.fill();
  });
  return heartTex;
}
