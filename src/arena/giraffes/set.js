import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, mesh, rng, canvasTexture, roundRect, FONT } from '../../util.js';
import { bakeColors } from '../../places/zoo/rig.js';

// The Leaf Catch set: the giraffe enclosure at the zoo, with one huge acacia tree whose canopy covers
// the play area, a long plank walk in the tree for the partner, a squirrel's branch and Jodi's judging spot.

const WOOD = '#a8764a';
const WOOD_DK = '#7b4f2f';
const PLANK = '#c98a5a';
const BARK = '#8b5e3c';
const CREAM = '#fff3df';
const PINK = '#ff8fb1';
const CORAL = '#ef5b6f';
const TEAL = '#21a99a';
const SUN = '#ffd166';

const geoCache = new Map();
const G = (key, make) => (geoCache.has(key) ? geoCache.get(key) : (geoCache.set(key, make()), geoCache.get(key)));
const box = (w, h, d, c, o) => mesh(G(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d)), mat(c, o));
const rbox = (w, h, d, c, r = 0.05, o) => mesh(G(`r${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 2, r)), mat(c, o));
const cyl = (a, b, h, c, seg = 12, o) => mesh(G(`c${a}|${b}|${h}|${seg}`, () => new THREE.CylinderGeometry(a, b, h, seg)), mat(c, o));
const sph = (r, c, seg = 12, o) => mesh(G(`s${r}|${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7)))), mat(c, o));
const ico = (c, o) => mesh(G('ico', () => new THREE.IcosahedronGeometry(1, 1)), mat(c, { flat: true, rough: 0.85, ...o }));
const at = (o, x, y, z) => (o.position.set(x, y, z), o);

export const PLAY = { x0: -4.4, x1: 4.4, z: 0 }; // Jouri walks along x at z = 0
export const WALK = { y: 6.25, z: -1.1, x0: -4.4, x1: 4.4 }; // the partner's plank walk
export const SQUIRREL = { x: 5.3, y: 6.95, z: -1.0 };
export const JUDGE = { x: 5.7, z: -2.1 };

export function buildSet(scene) {
  const g = new THREE.Group();
  const add = (...o) => (g.add(...o), o[0]);
  const r = rng(5);

  // Ground: sandy enclosure in a green meadow
  const meadow = mesh(new THREE.CircleGeometry(60, 40), mat('#a6d873', { rough: 1 }), { cast: false });
  meadow.rotation.x = -Math.PI / 2;
  add(meadow);
  const sand = mesh(new THREE.CircleGeometry(15, 40), mat('#ead39a', { rough: 1 }), { cast: false });
  sand.rotation.x = -Math.PI / 2;
  sand.position.y = 0.01;
  sand.scale.set(1, 0.55, 1);
  add(sand);
  const patch = mesh(new THREE.CircleGeometry(5, 30), mat('#e2c27f', { rough: 1 }), { cast: false });
  patch.rotation.x = -Math.PI / 2;
  patch.position.set(0, 0.02, 0.6);
  patch.scale.set(1.3, 0.45, 1);
  add(patch);

  // Back fence and side fences
  const post = (x, z) => {
    add(at(box(0.16, 1.4, 0.16, WOOD), x, 0.7, z));
    add(at(sph(0.1, WOOD_DK, 8), x, 1.42, z));
  };
  for (let x = -13; x <= 13.01; x += 1.3) post(x, -7);
  for (const y of [0.62, 1.18]) add(at(box(26, 0.1, 0.07, WOOD), 0, y, -7));

  // The giraffe house (left) and the pool hedge (right), far back
  add(at(rbox(3.4, 3.6, 2.4, '#fff0dc', 0.08), -9.5, 1.8, -9.2));
  add(at(box(1.5, 2.6, 0.05, '#6b4a33'), -9.5, 1.3, -7.98));
  const top = at(cyl(0.75, 0.75, 0.05, '#6b4a33', 20), -9.5, 2.6, -7.98);
  top.rotation.x = Math.PI / 2;
  add(top);
  for (const s of [1, -1]) {
    const slope = at(rbox(2.05, 0.15, 2.9, '#e0785f', 0.04), -9.5 + 0.86 * s, 4.1, -9.2);
    slope.rotation.z = -0.52 * s;
    add(slope);
  }
  const tri = new THREE.Shape();
  tri.moveTo(-1.7, 0);
  tri.lineTo(1.7, 0);
  tri.lineTo(0, 1.0);
  tri.closePath();
  const gable = mesh(new THREE.ExtrudeGeometry(tri, { depth: 2.4, bevelEnabled: false }), mat('#fff0dc'));
  gable.position.set(-9.5, 3.6, -10.4);
  add(gable);
  for (const [dx, dy, s] of [[-1.2, 2.6, 0.2], [1.2, 2.0, 0.22], [1.1, 0.8, 0.14], [-1.15, 1.2, 0.16]]) {
    const sp = at(sph(s, '#e9b77a', 10), -9.5 + dx, dy, -7.98);
    sp.scale.set(1, 0.85, 0.12);
    add(sp);
  }
  add(at(rbox(6, 1.1, 1.2, '#5aa84f', 0.3), 10.5, 0.55, -8.5));

  // Far trees and hay feeders
  for (const [x, z, s, c] of [[-13, -10, 1.3, '#6dbb58'], [12.8, -11.5, 1.2, '#f6a5c0'], [-5.5, -11.5, 1.0, '#84c95f'], [6.5, -12, 1.1, '#6dbb58'], [-14.5, -3, 1.0, '#f9bfd2'], [14.5, -3, 1.1, '#84c95f']]) {
    add(at(cyl(0.14 * s, 0.2 * s, 1.5 * s, BARK, 8), x, 0.75 * s, z));
    for (const [dx, dy, dz, k] of [[0, 2.0, 0, 0.95], [0.55, 1.65, 0.25, 0.62], [-0.5, 1.7, -0.2, 0.64]]) {
      const b = at(ico(c), x + dx * s, dy * s, z + dz * s);
      b.scale.setScalar(k * s);
      b.rotation.set(r() * 3, r() * 3, 0);
      add(b);
    }
  }
  add(at(cyl(0.1, 0.12, 3.3, WOOD, 10), 4.2, 1.65, -6.2));
  add(at(cyl(0.5, 0.34, 0.5, WOOD_DK, 14), 4.2, 3.35, -6.2));
  const hay = at(sph(0.42, '#f0cf6a', 10), 4.2, 3.6, -6.2);
  hay.scale.set(1, 0.55, 1);
  add(hay);
  for (const [x, z, s] of [[-6.5, -5.8, 0.5], [-6, -6.2, 0.32], [7.5, -6.2, 0.45], [2.4, -6.5, 0.3]]) {
    const rock = at(mesh(G('rock', () => new THREE.DodecahedronGeometry(1, 0)), mat('#c9c2b3', { flat: true, rough: 0.9 })), x, s * 0.3, z);
    rock.scale.set(s, s * 0.7, s * 0.9);
    add(rock);
  }

  // The great acacia: trunk behind the play line, two big limbs, a flat canopy over everything
  const T = { x: 0, z: -3.4 };
  add(at(cyl(0.34, 0.55, 6.4, BARK, 12), T.x, 3.2, T.z));
  for (const [s, len, tilt] of [[1, 4.6, 1.05], [-1, 4.6, 1.05], [0.3, 2.4, 0.5], [-0.4, 2.2, 0.55]]) {
    const holder = new THREE.Group();
    const limb = at(cyl(0.14, 0.26, len, BARK, 8), 0, len / 2, 0);
    holder.add(limb);
    holder.position.set(T.x, 5.6, T.z);
    holder.rotation.set(0.25, 0, -tilt * s);
    add(holder);
  }
  const leafCols = ['#7cb342', '#8bc34a', '#689f38', '#9ccc65'];
  for (let k = 0; k < 14; k++) {
    const u = k / 13;
    const x = -6.4 + u * 12.8 + (r() - 0.5) * 0.8;
    const c = at(ico(leafCols[k % 4]), x, 8.0 + Math.sin(u * Math.PI) * 0.5 + (r() - 0.5) * 0.3, T.z + 1.3 + (r() - 0.5) * 1.6);
    c.scale.set(1.5 + r() * 0.6, 0.45 + r() * 0.15, 1.3 + r() * 0.5);
    c.rotation.set(0, r() * 3, 0);
    add(c);
  }
  // The partner's plank walk, hung from the limbs on ropes, with a rope rail
  const W = WALK;
  add(at(rbox(W.x1 - W.x0 + 1.2, 0.14, 0.9, PLANK, 0.04), 0, W.y - 0.07, W.z));
  for (let k = 0; k < 11; k++) add(at(box(0.04, 0.15, 0.92, WOOD_DK), W.x0 - 0.5 + k * ((W.x1 - W.x0 + 1) / 10), W.y - 0.07, W.z));
  for (const x of [W.x0 - 0.5, -1.8, 1.8, W.x1 + 0.5]) {
    for (const z of [W.z - 0.4, W.z + 0.4]) add(at(cyl(0.02, 0.02, 1.7, '#d9c08a', 5), x, W.y + 0.85, z));
  }
  add(at(box(W.x1 - W.x0 + 1.2, 0.04, 0.04, '#d9c08a'), 0, W.y + 0.62, W.z + 0.42));
  // The squirrel's branch on the right
  const sb = new THREE.Group();
  sb.add(at(cyl(0.08, 0.13, 2.2, BARK, 8), 0, 1.1, 0));
  sb.position.set(T.x + 3.4, 6.4, T.z + 1.6);
  sb.rotation.set(0, 0, -1.25);
  add(sb);
  add(at(rbox(1.0, 0.1, 0.6, PLANK, 0.03), SQUIRREL.x, SQUIRREL.y - 0.06, SQUIRREL.z));

  // Jodi's judging corner: a small podium with a sign
  add(at(rbox(1.1, 0.5, 0.7, CREAM, 0.05), JUDGE.x + 0.2, 0.25, JUDGE.z + 1.35));
  add(at(rbox(1.16, 0.1, 0.76, TEAL, 0.04), JUDGE.x + 0.2, 0.52, JUDGE.z + 1.35));
  const signTex = canvasTexture(256, 96, (c, w, h) => {
    c.fillStyle = '#f7ead2';
    roundRect(c, 4, 4, w - 8, h - 8, 22);
    c.fill();
    c.lineWidth = 7;
    c.strokeStyle = CORAL;
    c.stroke();
    c.fillStyle = '#4a3423';
    c.font = `700 44px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('Judge', w / 2, h / 2 + 2);
  });
  const sign = mesh(new THREE.PlaneGeometry(0.8, 0.3), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.8 }), { cast: false });
  sign.position.set(JUDGE.x + 0.2, 0.27, JUDGE.z + 1.71);
  add(sign);

  // Grass tufts and flowers (instanced)
  const tufts = [];
  for (let k = 0; k < 160; k++) {
    const a = r() * Math.PI * 2;
    const d = 5 + r() * 9;
    tufts.push([Math.cos(a) * d * 1.2, Math.sin(a) * d * 0.5 - 1, r() < 0.5 ? '#c9c45a' : '#a9c25a']);
  }
  const tg = new THREE.ConeGeometry(0.05, 0.42, 4);
  tg.translate(0, 0.21, 0);
  const tim = new THREE.InstancedMesh(tg, mat('#ffffff', { rough: 1 }), tufts.length * 3);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const c = new THREE.Color();
  const e = new THREE.Euler();
  let n = 0;
  for (const [x, z, col] of tufts) {
    for (let k = 0; k < 3; k++) {
      tim.setMatrixAt(n, m4.compose(v.set(x + (r() - 0.5) * 0.2, 0, z + (r() - 0.5) * 0.2), q.setFromEuler(e.set((r() - 0.5) * 0.6, 0, (r() - 0.5) * 0.6)), s.setScalar(0.7 + r() * 0.6)));
      tim.setColorAt(n++, c.set(col));
    }
  }
  tim.castShadow = false;
  scene.add(tim);

  // Merge everything static into a few vertex-coloured meshes
  scene.add(g);
  bakeColors(g);
  return { group: g };
}

// ------------------------------------------------ the falling things, each one instanced mesh
function tint(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const col = new THREE.Color(color);
  const a = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < g.attributes.position.count; i++) col.toArray(a, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
}

export function leafGeometry() {
  const parts = [];
  for (let k = 0; k < 3; k++) {
    const l = new THREE.SphereGeometry(0.13, 8, 6);
    l.scale(0.75, 0.25, 1.35);
    l.rotateY((k / 3) * Math.PI * 2);
    l.translate(Math.cos(k * 2.1) * 0.08, k * 0.03, Math.sin(k * 2.1) * 0.08);
    parts.push(tint(l, k % 2 ? '#6dbb58' : '#8bd16a'));
  }
  const twig = new THREE.CylinderGeometry(0.012, 0.016, 0.22, 5);
  twig.rotateX(0.5);
  parts.push(tint(twig, '#8b5e3c'));
  return mergeGeometries(parts);
}

export function carrotGeometry() {
  const body = new THREE.ConeGeometry(0.075, 0.42, 10);
  body.rotateZ(Math.PI);
  const parts = [tint(body, '#ff9a3c')];
  for (let k = 0; k < 3; k++) {
    const l = new THREE.CylinderGeometry(0.012, 0.018, 0.2, 5);
    l.translate(0, 0.1, 0);
    l.rotateZ((k - 1) * 0.45);
    l.translate(0, 0.2, 0);
    parts.push(tint(l, '#4f9a45'));
  }
  return mergeGeometries(parts);
}

export function goldGeometry() {
  // One big golden acacia leaf with a little stem and a bright midrib
  const l = new THREE.SphereGeometry(0.22, 14, 8);
  l.scale(0.62, 0.16, 1.25);
  l.rotateX(-0.5);
  const rib = new THREE.CylinderGeometry(0.012, 0.012, 0.5, 5);
  rib.rotateX(Math.PI / 2 - 0.5);
  rib.translate(0, 0.03, 0);
  const stem = new THREE.CylinderGeometry(0.014, 0.02, 0.16, 5);
  stem.rotateX(Math.PI / 2 - 0.5);
  stem.translate(0, -0.12, 0.33);
  return mergeGeometries([tint(l, '#ffc93c'), tint(rib, '#fff3c0'), tint(stem, '#c98a2e')]);
}

export function coneGeometry() {
  const core = new THREE.SphereGeometry(0.13, 10, 8);
  core.scale(0.85, 1.25, 0.85);
  const parts = [tint(core, '#7b4f2f')];
  for (let k = 0; k < 10; k++) {
    const sc = new THREE.ConeGeometry(0.055, 0.1, 4);
    const a = (k / 10) * Math.PI * 2;
    const y = ((k % 3) - 1) * 0.1;
    sc.rotateZ(-Math.PI / 2);
    sc.rotateY(-a);
    sc.translate(Math.cos(a) * 0.11, y, Math.sin(a) * 0.11);
    parts.push(tint(sc, k % 2 ? '#a8764a' : '#8b5e3c'));
  }
  return mergeGeometries(parts);
}

export function makeSquirrel() {
  const g = new THREE.Group();
  const fur = '#c9772e';
  const body = at(sph(0.16, fur, 12), 0, 0.17, 0);
  body.scale.set(1, 1.15, 0.9);
  g.add(body, at(sph(0.11, '#fff1dc', 10), 0, 0.15, 0.08));
  const head = at(sph(0.12, fur, 12), 0, 0.4, 0.04);
  g.add(head);
  for (const s of [1, -1]) {
    g.add(at(sph(0.035, '#3b2b3f', 8), 0.05 * s, 0.43, 0.14), at(sph(0.04, fur, 8), 0.07 * s, 0.53, 0.0));
  }
  g.add(at(sph(0.025, '#3b2b3f', 6), 0, 0.39, 0.16));
  const tail = new THREE.Group();
  for (let k = 0; k < 5; k++) {
    const t = at(sph(0.11 - k * 0.008, k % 2 ? '#d98a3e' : fur, 10), 0, 0.12 + k * 0.1, -0.16 - Math.sin(k * 0.6) * 0.12);
    tail.add(t);
  }
  g.add(tail);
  bakeColors(g);
  return { root: g, tail };
}

// A long leafy branch (the hazard in round four), origin at its middle
export function makeBranch() {
  const g = new THREE.Group();
  const limb = at(cyl(0.09, 0.13, 3.0, BARK, 8), 0, 0, 0);
  limb.rotation.z = Math.PI / 2;
  g.add(limb);
  for (let k = 0; k < 6; k++) {
    const b = at(ico(k % 2 ? '#7cb342' : '#8bc34a'), -1.3 + k * 0.52, 0.12 + (k % 2) * 0.08, 0.05);
    b.scale.set(0.34, 0.24, 0.3);
    g.add(b);
  }
  bakeColors(g);
  return g;
}

// Jodi's score card, held in her mouth: draw(n) repaints it
export function makeCard() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 200;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const root = new THREE.Group();
  const board = mesh(new THREE.BoxGeometry(0.62, 0.48, 0.03), [mat(CREAM), mat(CREAM), mat(CREAM), mat(CREAM), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), mat(CREAM)], { cast: true });
  board.position.y = -0.3;
  root.add(board);
  const stick = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.24, 5), mat(WOOD_DK));
  stick.position.y = -0.02;
  root.add(stick);
  const draw = (n) => {
    const x = c.getContext('2d');
    x.fillStyle = '#fffaf0';
    x.fillRect(0, 0, 256, 200);
    x.lineWidth = 12;
    x.strokeStyle = n >= 8 ? TEAL : n >= 5 ? SUN : CORAL;
    roundRect(x, 8, 8, 240, 184, 26);
    x.stroke();
    x.fillStyle = '#3b2b3f';
    x.font = `700 120px ${FONT}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(String(n), 128, 108);
    tex.needsUpdate = true;
  };
  draw(0);
  return { root, draw };
}

export function arrowMesh() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.35);
  s.lineTo(0.45, 0);
  s.lineTo(0, -0.35);
  s.lineTo(0, -0.15);
  s.lineTo(-0.4, -0.15);
  s.lineTo(-0.4, 0.15);
  s.lineTo(0, 0.15);
  s.closePath();
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: '#ef5b6f', transparent: true, opacity: 0.9, depthTest: false }));
  m.renderOrder = 5;
  return m;
}

export { PINK };
