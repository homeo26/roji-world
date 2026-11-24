import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, mesh } from './kit.js';

// Chunky cartoon hands for rock, paper and scissors, in the frame of a kid's arm:
// the wrist is at the origin, fingers point along -Y, the thumb side is +Z and the palm faces +X or -X.
// One merged geometry per sign, so a hand costs one draw call.

export const SIGNS = ['rock', 'paper', 'scissors'];
export const SIGN_NAMES = { rock: 'Rock', paper: 'Paper', scissors: 'Scissors' };
export const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
export const VERBS = { rock: 'Rock crushes scissors', paper: 'Paper wraps rock', scissors: 'Scissors cut paper' };

const cache = new Map();
const S = (r, x, y, z, sx = 1, sy = 1, sz = 1) => new THREE.SphereGeometry(r, 14, 10).scale(sx, sy, sz).translate(x, y, z);
// A finger from (x, y, z) pointing along the angle a in the Y-Z plane (0 = straight along -Y)
const finger = (r, len, x, y, z, a = 0, tilt = 0) => {
  const g = new THREE.CapsuleGeometry(r, len, 4, 10);
  g.translate(0, -len / 2 - r * 0.4, 0);
  g.rotateZ(tilt);
  g.rotateX(a);
  return g.translate(x, y, z);
};

function build(kind) {
  const parts = [];
  if (kind === 'rock') {
    parts.push(S(0.062, 0, -0.05, 0, 0.82, 1.0, 1.0));
    for (let i = 0; i < 4; i++) parts.push(S(0.024, 0.0, -0.1, -0.042 + i * 0.028, 1.15, 0.95, 1));
    for (let i = 0; i < 4; i++) parts.push(S(0.021, 0.035, -0.078, -0.042 + i * 0.028, 0.9, 1.1, 1));
    parts.push(finger(0.02, 0.06, 0.04, -0.06, 0.05, 1.3, 0.0));
  } else if (kind === 'paper') {
    parts.push(S(0.06, 0, -0.045, 0, 0.55, 1.0, 1.05));
    [0.24, 0.08, -0.08, -0.24].forEach((a, i) => parts.push(finger(0.0175, [0.05, 0.065, 0.068, 0.058][3 - i], 0, -0.085, -0.04 + i * 0.027, a)));
    parts.push(finger(0.019, 0.045, 0, -0.035, 0.05, -1.05, 0));
  } else {
    parts.push(S(0.06, 0, -0.05, 0, 0.82, 1.0, 1.0));
    parts.push(finger(0.018, 0.07, 0, -0.09, 0.012, -0.32));
    parts.push(finger(0.018, 0.074, 0, -0.09, -0.014, 0.32));
    for (let i = 0; i < 2; i++) parts.push(S(0.021, 0.022, -0.085, -0.042 + i * 0.024, 1.0, 1.05, 1));
    parts.push(finger(0.019, 0.05, 0.04, -0.06, 0.045, 1.3, 0.0));
  }
  const geo = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  for (const g of parts) g.dispose();
  return geo;
}

export function handGeo(kind) {
  if (!cache.has(kind)) cache.set(kind, build(kind));
  return cache.get(kind);
}

// A set of the three signs that can be swapped: { group, show(kind), kind }
export function handSet(skin) {
  const group = new THREE.Group();
  const m = mat(skin, { rough: 0.6 });
  const meshes = {};
  for (const k of SIGNS) {
    meshes[k] = mesh(handGeo(k), m);
    meshes[k].visible = k === 'rock';
    group.add(meshes[k]);
  }
  const set = {
    group,
    kind: 'rock',
    show(kind) {
      set.kind = kind;
      for (const k of SIGNS) meshes[k].visible = k === kind;
    },
  };
  return set;
}

// Clear the hand-geometry cache (the host disposes geometries when a game closes).
export function resetHands() {
  cache.clear();
}
