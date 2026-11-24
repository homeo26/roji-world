import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, umat, mesh, canvasTexture, roundRect, heartShape, FONT } from '../../util.js';

// Small handmade models for Homama's gestures and the lunch box: a rose, a bento in a gingham cloth,
// the open bento with its food, and a little sun hat.

export const at = (o, x = 0, y = 0, z = 0) => (o.position.set(x, y, z), o);
export const sph = (r, color, o = {}, seg = 14) => mesh(new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7))), mat(color, o));
export const cyl = (rt, rb, h, color, seg = 12, o = {}) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, o));
export const box = (w, h, d, color, o = {}) => mesh(new THREE.BoxGeometry(w, h, d), mat(color, o));
export const rbox = (w, h, d, color, r = 0.02, o = {}) => mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)), mat(color, o));
export function heartGeo(size, depth = 0.03, bevel = 0.008) {
  const g = new THREE.ExtrudeGeometry(heartShape(size), { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, -size * 0.045, -depth / 2); // centred on the heart
  return g;
}

// ---------------------------------------------------------------- rose
// Held in the carry anchor: the stem runs up through the hands, the bloom sits at the chin.
export function makeRose({ hair = false } = {}) {
  const g = new THREE.Group();
  const red = '#e23b58';
  const deep = '#b8233f';
  if (!hair) {
    const stem = cyl(0.008, 0.009, 0.3, '#3f8a45', 6);
    at(stem, 0, 0.02, 0);
    g.add(stem);
    for (const [s, y] of [[1, 0.0], [-1, 0.07]]) {
      const leaf = sph(0.03, '#4f9a45', {}, 8);
      leaf.scale.set(1.2, 0.35, 0.6);
      leaf.rotation.z = 0.5 * s;
      at(leaf, 0.028 * s, y, 0);
      g.add(leaf);
    }
  }
  const bloom = new THREE.Group();
  const core = sph(0.034, deep, { rough: 0.6 }, 12);
  core.scale.set(1, 1.15, 1);
  bloom.add(core);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const p = sph(0.03, red, { rough: 0.55 }, 10);
    p.scale.set(1.15, 1.05, 0.55);
    p.position.set(Math.sin(a) * 0.028, -0.006, Math.cos(a) * 0.028);
    p.rotation.y = a;
    p.rotation.x = -0.35;
    bloom.add(p);
  }
  const top = sph(0.022, red, { rough: 0.5 }, 10);
  top.position.y = 0.02;
  bloom.add(top);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const sep = mesh(new THREE.ConeGeometry(0.012, 0.04, 4), mat('#4f9a45'));
    sep.position.set(Math.sin(a) * 0.02, -0.032, Math.cos(a) * 0.02);
    sep.rotation.set(Math.cos(a) * 2.4, 0, -Math.sin(a) * 2.4);
    bloom.add(sep);
  }
  if (hair) {
    const leaf = sph(0.026, '#4f9a45', {}, 8);
    leaf.scale.set(1.4, 0.3, 0.7);
    at(leaf, -0.035, -0.02, -0.01);
    leaf.rotation.z = 0.6;
    bloom.add(leaf);
  }
  bloom.position.y = hair ? 0 : 0.18;
  g.add(bloom);
  g.userData.bloom = bloom;
  if (!hair) {
    // A touch bigger than life, so it reads from the town camera
    const outer = new THREE.Group();
    g.scale.setScalar(1.3);
    outer.add(g);
    outer.userData.bloom = bloom;
    return outer;
  }
  return g;
}

// ---------------------------------------------------------------- bento
let ginghamTex = null;
function gingham() {
  if (ginghamTex) return ginghamTex;
  ginghamTex = canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(239, 91, 111, 0.45)';
    for (let i = 0; i < 8; i += 2) {
      c.fillRect((i * w) / 8, 0, w / 8, h);
      c.fillRect(0, (i * h) / 8, w, h / 8);
    }
  });
  ginghamTex.wrapS = ginghamTex.wrapT = THREE.RepeatWrapping;
  ginghamTex.repeat.set(2, 2);
  return ginghamTex;
}
let tagTex = null;
function noteTag() {
  if (tagTex) return tagTex;
  tagTex = canvasTexture(128, 96, (c, w, h) => {
    c.fillStyle = '#fffdf3';
    roundRect(c, 3, 3, w - 6, h - 6, 10);
    c.fill();
    c.strokeStyle = '#ffb3c6';
    c.lineWidth = 4;
    c.stroke();
    c.fillStyle = '#ef5b6f';
    const s = heartPath(c, w / 2, h * 0.36, 26);
    c.fill(s);
    c.fillStyle = '#4a3423';
    c.font = `700 22px ${FONT}`;
    c.textAlign = 'center';
    c.fillText('Dr. Roji', w / 2, h * 0.82);
  });
  return tagTex;
}

export function heartPath(c, x, y, s) {
  const p = new Path2D();
  p.moveTo(x, y + s * 0.42);
  p.bezierCurveTo(x - s * 0.95, y - s * 0.12, x - s * 0.5, y - s * 0.75, x, y - s * 0.28);
  p.bezierCurveTo(x + s * 0.5, y - s * 0.75, x + s * 0.95, y - s * 0.12, x, y + s * 0.42);
  return p;
}

// The wrapped lunch box, carried in both hands. Origin at the bottom centre.
export function makeBento() {
  const g = new THREE.Group();
  const cloth = umat('#ffffff', { rough: 0.85, map: gingham() });
  const base = mesh(new RoundedBoxGeometry(0.3, 0.13, 0.21, 2, 0.03), cloth);
  base.position.y = 0.065;
  g.add(base);
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.05, 10, 8), cloth);
    ear.scale.set(1.1, 0.75, 0.45);
    ear.position.set(0.035 * s, 0.165, 0);
    ear.rotation.z = -0.55 * s;
    g.add(ear);
  }
  const knot = mesh(new THREE.SphereGeometry(0.03, 10, 8), cloth);
  knot.position.y = 0.14;
  g.add(knot);
  const tag = mesh(new THREE.PlaneGeometry(0.11, 0.08), umat('#ffffff', { rough: 0.8, map: noteTag(), side: THREE.DoubleSide }), { cast: false });
  tag.position.set(0.07, 0.11, 0.108);
  tag.rotation.set(-0.15, 0, -0.12);
  g.add(tag);
  return g;
}

// The open bento on the desk: heart rice balls, a happy egg, strawberries and broccoli, lid at the side.
export function makeOpenBento() {
  const g = new THREE.Group();
  const cloth = mesh(new THREE.PlaneGeometry(0.42, 0.34), umat('#ffffff', { rough: 0.9, map: gingham(), side: THREE.DoubleSide }), { cast: false });
  cloth.rotation.x = -Math.PI / 2;
  cloth.position.y = 0.004;
  g.add(cloth);
  const boxC = '#ff9eb5';
  g.add(at(rbox(0.28, 0.06, 0.19, boxC, 0.02), 0, 0.034, 0));
  g.add(at(box(0.25, 0.01, 0.16, '#fff3e4'), 0, 0.062, 0));
  g.add(at(box(0.006, 0.05, 0.16, boxC), -0.02, 0.05, 0));
  // Rice balls with a seaweed band
  for (const dx of [-0.085, -0.045]) {
    const rice = sph(0.034, '#ffffff', { rough: 0.9 }, 12);
    rice.scale.set(1, 0.9, 1);
    at(rice, dx, 0.078, -0.02);
    g.add(rice);
    g.add(at(box(0.03, 0.02, 0.012, '#2f3b2c'), dx, 0.065, 0.012));
  }
  // Heart egg, strawberries, broccoli
  const egg = mesh(heartGeo(0.06, 0.016, 0.004), mat('#ffd166', { rough: 0.6 }));
  egg.rotation.x = -Math.PI / 2;
  at(egg, -0.065, 0.075, 0.045);
  g.add(egg);
  for (const [x, z] of [[0.03, -0.04], [0.065, -0.035], [0.05, 0.0]]) {
    const s = mesh(new THREE.ConeGeometry(0.018, 0.04, 8), mat('#ef3b5d', { rough: 0.5 }));
    s.rotation.x = Math.PI;
    at(s, x, 0.08, z);
    g.add(s);
    g.add(at(sph(0.01, '#4f9a45', {}, 6), x, 0.1, z));
  }
  for (const [x, z] of [[0.09, 0.04], [0.06, 0.05], [0.025, 0.045]]) g.add(at(sph(0.022, '#5aa84f', { rough: 0.9, flat: true }, 7), x, 0.08, z));
  // A little heart pick in the rice
  g.add(at(cyl(0.003, 0.003, 0.06, '#ffffff', 4), -0.065, 0.11, -0.02));
  const pick = mesh(heartGeo(0.035, 0.008, 0.002), mat('#ef5b6f', { rough: 0.5 }));
  at(pick, -0.065, 0.145, -0.02);
  g.add(pick);
  g.scale.setScalar(1.1);
  return g;
}

// ---------------------------------------------------------------- sun hat
// Sits on a Kid's head group (head centre at y = 0.29, hair top about 0.62).
export function makeSunHat() {
  const g = new THREE.Group();
  const straw = mat('#f3d48b', { rough: 0.85 });
  const brim = mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.025, 24), straw);
  brim.position.y = 0;
  g.add(brim);
  const crown = mesh(new THREE.SphereGeometry(0.36, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), straw);
  crown.scale.set(1, 0.62, 1);
  g.add(crown);
  const band = mesh(new THREE.CylinderGeometry(0.352, 0.362, 0.07, 20, 1, true), mat('#ff7fa3', { rough: 0.6 }));
  band.position.y = 0.035;
  g.add(band);
  const bow = sph(0.055, '#ff7fa3', {}, 10);
  bow.scale.set(1.4, 0.8, 0.6);
  at(bow, 0.24, 0.05, 0.25);
  g.add(bow);
  return g;
}
// Where the sun hat sits on a head group.
export const HAT_POS = [0, 0.46, 0.01];
