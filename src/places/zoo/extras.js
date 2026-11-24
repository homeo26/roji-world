import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mesh, umat, canvasTexture, roundRect, FONT } from '../../util.js';
import { bakeColors } from './rig.js';
import { DECK, FENCE, HOUSE, TREE } from './scenery.js';

// The v4 activity corners along the giraffe fence, plus the zoo's little easter eggs.
// buildExtras(atlas) -> { group (static, baked with the scenery), colliders, obstacles (for the giraffes) }.
// The make* functions build the props the scenes move around (each merged to one or two meshes).

export const CAKE = { x: -10.55, z: -3.15, top: 3.32 };
export const LADDER = { x: -8.85, z: -1.06, top: 1.25 };
export const HOSE = { x: -6.4, z: -2.22 };
export const CHART = { x: -0.3, z: -2.5 };
export const PAPER = { x: 3.4, z: -2.12 };
export const RADIO = { x: 1.2, z: 0.85 };
export const SHOP = { x: 8.1, z: 1.3 };
export const STALL = { x: -4.88, z: -1.42 };
export const BOWLS = { x: -7.0, z: -6.95 };

const WOOD = '#a8764a';
const WOOD_DK = '#7b4f2f';
const PLANK = '#c98a5a';
const CREAM = '#fff3df';
const PINK = '#ff8fb1';
const CORAL = '#ef5b6f';
const TEAL = '#21a99a';
const SUN = '#ffd166';
const LEAF = '#6dbb58';
const LEAF2 = '#8bd16a';

const geoCache = new Map();
const G = (key, make) => (geoCache.has(key) ? geoCache.get(key) : (geoCache.set(key, make()), geoCache.get(key)));
const box = (w, h, d, c, o) => mesh(G(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d)), mat(c, o));
const rbox = (w, h, d, c, r = 0.04, o) => mesh(G(`r${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 2, r)), mat(c, o));
const cyl = (a, b, h, c, seg = 12, o) => mesh(G(`c${a}|${b}|${h}|${seg}`, () => new THREE.CylinderGeometry(a, b, h, seg)), mat(c, o));
const sph = (r, c, seg = 12, o) => mesh(G(`s${r}|${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7)))), mat(c, o));
const cone = (r, h, c, seg = 10, o) => mesh(G(`k${r}|${h}|${seg}`, () => new THREE.ConeGeometry(r, h, seg)), mat(c, o));
const tor = (r, t, c, arc = Math.PI * 2, o) => mesh(G(`t${r}|${t}|${arc}`, () => new THREE.TorusGeometry(r, t, 6, 18, arc)), mat(c, o));
const at = (o, x, y, z) => (o.position.set(x, y, z), o);
const rot = (o, x, y, z) => (o.rotation.set(x, y, z), o);

// Merge a small prop group into vertex-coloured meshes so it costs one draw call.
function solid(group) {
  bakeColors(group);
  return group;
}

export function buildExtras(atlas) {
  const g = new THREE.Group();
  const colliders = [];
  const obstacles = [];
  const add = (...o) => (g.add(...o), o[0]);
  const wall = (x, z, hw, hd, h) => colliders.push(h === undefined ? { type: 'box', x, z, hw, hd } : { type: 'box', x, z, hw, hd, h });
  const fz = FENCE.z1;

  // ------------------------------------------------ birthday corner: a cake on a tall stand, inside the fence
  {
    const { x, z } = CAKE;
    add(at(cyl(0.32, 0.38, 0.12, CREAM, 16), x, 0.06, z));
    add(at(cyl(0.075, 0.09, 2.62, CREAM, 10), x, 1.38, z));
    for (let k = 0; k < 6; k++) add(at(cyl(0.095, 0.095, 0.07, k % 2 ? PINK : TEAL, 10), x, 0.45 + k * 0.38, z));
    add(at(cyl(0.44, 0.3, 0.07, '#ffffff', 18), x, 2.74, z));
    add(at(cyl(0.34, 0.34, 0.24, PINK, 18), x, 2.9, z));
    add(at(cyl(0.355, 0.355, 0.05, '#ffffff', 18), x, 3.03, z));
    add(at(cyl(0.23, 0.23, 0.18, CREAM, 16), x, 3.14, z));
    add(at(cyl(0.245, 0.245, 0.04, PINK, 16), x, 3.24, z));
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const drip = at(sph(0.04, '#ffffff', 8), x + Math.cos(a) * 0.34, 2.99, z + Math.sin(a) * 0.34);
      drip.scale.set(1, 1.5, 1);
      add(drip);
      if (k % 2 === 0) add(at(sph(0.025, [SUN, TEAL, CORAL][k % 3], 6), x + Math.cos(a + 0.3) * 0.16, 3.27, z + Math.sin(a + 0.3) * 0.16));
    }
    // Two candles: navy stripes for Jodi, pink for Jouri
    for (const [dx, c1, c2] of [[-0.08, '#2c3e66', '#ffffff'], [0.08, '#ff8fb1', '#ffffff']]) {
      add(at(cyl(0.024, 0.024, 0.15, c2, 8), x + dx, 3.33, z + 0.04));
      for (const dy of [-0.04, 0.03]) add(at(cyl(0.026, 0.026, 0.025, c1, 8), x + dx, 3.33 + dy, z + 0.04));
      add(at(cyl(0.004, 0.004, 0.04, '#3b2b3f', 4), x + dx, 3.43, z + 0.04));
    }
    obstacles.push({ x, z, r: 1.0 });
    // Banner over the fence and the calendar with both birthdays
    for (const px of [x - 0.82, x + 0.82]) add(at(box(0.08, 0.5, 0.08, WOOD), px, 1.62, fz + 0.06));
    const banner = atlas.plane('birthday', 1.6, 0.32);
    banner.position.set(x, 1.72, fz + 0.12);
    add(banner);
    add(at(box(1.66, 0.36, 0.04, WOOD_DK), x, 1.72, fz + 0.09));
    // Their birthday calendar hangs on the giraffe house, left of the door
    const cal = atlas.plane('calendar', 0.6, 0.6);
    cal.position.set(HOUSE.x - 1.22, 1.55, HOUSE.z + HOUSE.d / 2 + 0.05);
    add(cal);
    add(at(box(0.66, 0.66, 0.03, WOOD_DK), HOUSE.x - 1.22, 1.55, HOUSE.z + HOUSE.d / 2 + 0.03));
    // Bunting along the top rail
    const cols = [CORAL, SUN, TEAL, PINK];
    for (let k = 0; k < 7; k++) {
      const f = at(cone(0.07, 0.16, cols[k % 4], 3), -11.35 + k * 0.27, 1.06, fz + 0.06);
      f.rotation.set(Math.PI, 0, 0);
      add(f);
    }
  }

  // ------------------------------------------------ hose reel and tap for bath time
  {
    const { x, z } = HOSE;
    const reel = new THREE.Group();
    for (const s of [1, -1]) {
      const leg = at(box(0.06, 0.62, 0.06, '#2f8f5b'), 0.24 * s, 0.31, 0);
      reel.add(leg);
      const disc = rot(at(cyl(0.3, 0.3, 0.04, '#3fae6a', 18), 0.2 * s, 0.55, 0), 0, 0, Math.PI / 2);
      reel.add(disc);
    }
    reel.add(rot(at(cyl(0.16, 0.16, 0.38, '#2f8f5b', 14), 0, 0.55, 0), 0, 0, Math.PI / 2));
    for (let k = 0; k < 4; k++) reel.add(rot(at(tor(0.2, 0.035, '#5ccf7e'), -0.13 + k * 0.086, 0.55, 0), 0, Math.PI / 2, 0));
    reel.add(rot(at(cyl(0.015, 0.015, 0.16, '#3b2b3f', 6), 0.31, 0.55, 0.06), Math.PI / 2, 0, 0));
    reel.add(at(sph(0.035, CORAL, 8), 0.31, 0.55, 0.15));
    reel.add(at(rbox(0.6, 0.05, 0.36, '#2f8f5b', 0.02), 0, 0.03, 0));
    reel.position.set(x, 0, z);
    add(reel);
    wall(x, z, 0.32, 0.2, 0.85);
    // Tap on a little pipe
    add(at(cyl(0.035, 0.035, 0.75, '#9aa7b0', 8), x - 0.55, 0.375, fz + 0.18));
    add(rot(at(cyl(0.03, 0.03, 0.16, '#9aa7b0', 8), x - 0.55, 0.72, fz + 0.26), Math.PI / 2, 0, 0));
    add(rot(at(tor(0.05, 0.012, CORAL), x - 0.55, 0.8, fz + 0.2), Math.PI / 2, 0, 0));
    colliders.push({ type: 'circle', x: x - 0.55, z: fz + 0.2, r: 0.1 });
    const s = atlas.sign('bath', { w: 0.8, h: 0.2, post: 0.92, depth: 0.04 });
    s.position.set(x + 0.42, 0, fz + 0.16);
    add(s);
    // A puddle on the path
    const pud = at(mesh(G('puddle', () => new THREE.CircleGeometry(0.4, 18)), mat('#a9e4f0', { rough: 0.12 })), x + 0.55, 0.04, z + 0.62);
    pud.rotation.x = -Math.PI / 2;
    pud.scale.set(1, 0.6, 1);
    add(pud);
  }

  // ------------------------------------------------ newspaper lectern and box
  {
    const { x, z } = PAPER;
    add(at(cyl(0.18, 0.22, 0.06, WOOD_DK, 12), x, 0.03, z));
    add(at(cyl(0.045, 0.055, 1.12, WOOD, 8), x, 0.6, z));
    const top = rot(at(rbox(0.56, 0.05, 0.42, PLANK, 0.02), x, 1.18, z), 0.3, 0, 0);
    add(top);
    const lip = rot(at(box(0.56, 0.05, 0.03, WOOD_DK), x, 1.13, z + 0.22), 0.3, 0, 0);
    add(lip);
    colliders.push({ type: 'circle', x, z, r: 0.22 });
    // The red newspaper box with a stack of papers
    const bx = x - 0.46;
    const bz = fz + 0.3;
    add(at(rbox(0.36, 0.56, 0.28, CORAL, 0.04), bx, 0.28, bz));
    add(at(box(0.3, 0.18, 0.02, '#bfe7f5', { rough: 0.3 }), bx, 0.38, bz + 0.14));
    for (let k = 0; k < 4; k++) add(at(box(0.28, 0.018, 0.2, k % 2 ? '#ffffff' : '#f1ece2'), bx + (k % 2) * 0.01, 0.57 + k * 0.02, bz));
    const lab = atlas.plane('times', 0.34, 0.13);
    lab.position.set(bx, 0.15, bz + 0.145);
    add(lab);
    wall(bx, bz, 0.19, 0.15, 0.6);
  }

  // ------------------------------------------------ the giraffe disco: a gramophone on a little round table
  {
    const { x, z } = RADIO;
    add(at(cyl(0.22, 0.26, 0.04, WOOD_DK, 14), x, 0.02, z));
    add(at(cyl(0.04, 0.05, 0.6, WOOD, 8), x, 0.32, z));
    add(at(cyl(0.36, 0.36, 0.05, CREAM, 18), x, 0.64, z));
    add(at(rbox(0.36, 0.16, 0.3, '#8b5e3c', 0.03), x, 0.75, z));
    add(at(cyl(0.15, 0.15, 0.015, '#3b2b3f', 18), x, 0.84, z));
    add(at(cyl(0.04, 0.04, 0.02, CORAL, 10), x, 0.855, z));
    add(rot(at(cyl(0.012, 0.012, 0.22, SUN, 6), x + 0.12, 0.92, z - 0.04), 0, 0, 0.9));
    const horn = rot(at(cone(0.22, 0.42, SUN, 16), x - 0.02, 1.12, z + 0.08), -0.9, 0, 0.2);
    add(horn);
    add(rot(at(cyl(0.15, 0.15, 0.02, '#e9b14a', 16), x - 0.05, 1.27, z + 0.24), 0.68, 0, 0.2));
    add(rot(at(cyl(0.035, 0.05, 0.28, SUN, 8), x, 0.95, z - 0.04), 0.5, 0, 0));
    colliders.push({ type: 'circle', x, z, r: 0.38, h: 0.9 });
    const s = atlas.sign('disco', { w: 0.7, h: 0.175, post: 0.55, depth: 0.04 });
    s.position.set(x + 0.62, 0, z - 0.05);
    s.rotation.y = -0.35;
    add(s);
    colliders.push({ type: 'circle', x: x + 0.62, z: z - 0.05, r: 0.18 });
  }

  // ------------------------------------------------ treat stall on the feeding deck: acacia, carrots, lettuce
  {
    const { x } = STALL;
    const y = DECK.h;
    const zs = [-1.72, -1.3, -0.88];
    zs.forEach((z, i) => {
      add(at(rbox(0.36, 0.24, 0.38, PLANK, 0.03), x, y + 0.12, z));
      add(at(box(0.3, 0.02, 0.32, WOOD_DK), x, y + 0.235, z));
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + i;
        const px = x + Math.cos(a) * 0.08;
        const pz = z + Math.sin(a) * 0.09;
        if (i === 0) {
          const l = at(sph(0.07, k % 2 ? LEAF : LEAF2, 8), px, y + 0.27, pz);
          l.scale.set(1, 0.5, 1.3);
          add(l);
        } else if (i === 1) {
          const c = rot(at(cone(0.035, 0.22, '#ff9a3c', 8), px, y + 0.27, pz), Math.PI / 2, a, 0);
          add(c);
        } else {
          const l = at(sph(0.08, k % 2 ? '#b8e986' : '#9fdc6a', 8), px, y + 0.28, pz);
          l.scale.set(1, 0.75, 1);
          add(l);
        }
      }
    });
    wall(x, -1.3, 0.2, 0.62, y + 0.25);
    const s = atlas.sign('treats', { w: 0.62, h: 0.23, post: 0.42, depth: 0.04 });
    s.position.set(x + 0.02, y, -0.6);
    add(s);
  }

  // ------------------------------------------------ easter eggs
  // Food bowls with their names, by the giraffe house door
  {
    const { x, z } = BOWLS;
    add(at(rbox(1.5, 0.5, 0.5, PLANK, 0.04), x, 0.25, z));
    for (const [dx, id, rim] of [[-0.36, 'bowlJodi', '#2c3e66'], [0.36, 'bowlJouri', CORAL]]) {
      add(at(cyl(0.26, 0.18, 0.18, '#fffaf0', 16), x + dx, 0.59, z));
      add(at(cyl(0.27, 0.27, 0.03, rim, 16), x + dx, 0.69, z));
      const hay = at(sph(0.2, '#e9c560', 10), x + dx, 0.66, z);
      hay.scale.set(1, 0.35, 1);
      add(hay);
      const tag = atlas.plane(id, 0.26, 0.13);
      tag.position.set(x + dx, 0.36, z + 0.256);
      add(tag);
    }
    obstacles.push({ x, z, r: 1.1 });
  }
  // "Adopted with love by Roji + Homama" on the giraffe house
  {
    const p = atlas.plane('adopt', 0.62, 0.31);
    p.position.set(HOUSE.x + 1.24, 1.45, HOUSE.z + HOUSE.d / 2 + 0.05);
    add(p);
    add(at(box(0.68, 0.37, 0.03, '#c9a25a'), HOUSE.x + 1.24, 1.45, HOUSE.z + HOUSE.d / 2 + 0.03));
  }
  // A crayon drawing of Roji, Homama and the giraffes, taped to the deck
  {
    const p = atlas.plane('drawing', 0.44, 0.22);
    p.position.set(-4.78, 0.42, DECK.z1 - 0.045);
    p.rotation.z = 0.06;
    add(p);
  }
  // R + H carved in the acacia trunk
  {
    const p = atlas.plane('initials', 0.24, 0.24);
    p.position.set(TREE.x, 1.25, TREE.z + 0.235);
    add(p);
  }
  // The little gift shop kiosk by the fence path
  buildShop(add, atlas, colliders);

  return { group: g, colliders, obstacles };
}

function buildShop(add, atlas, colliders) {
  // A little kiosk on the lawn by the fence path, facing the street
  const { x, z } = SHOP;
  add(at(rbox(1.4, 1.75, 0.7, '#ffc8a2', 0.06), x, 0.875, z));
  add(at(rbox(1.5, 0.12, 0.8, TEAL, 0.04), x, 1.8, z));
  add(at(box(1.16, 0.9, 0.02, '#ffe9ef'), x, 1.15, z + 0.355));
  add(at(rbox(1.3, 0.1, 0.34, PLANK, 0.03), x, 0.72, z + 0.5));
  for (const y of [1.02, 1.36]) add(at(box(1.12, 0.04, 0.2, PLANK), x, y, z + 0.45));
  for (const s of [1, -1]) add(at(box(0.08, 0.95, 0.08, CREAM), x + 0.6 * s, 1.15, z + 0.38));
  // Striped awning
  for (let k = 0; k < 5; k++) add(rot(at(box(0.3, 0.04, 0.46, k % 2 ? CREAM : PINK), x - 0.6 + k * 0.3, 1.74, z + 0.5), 0.35, 0, 0));
  const s = atlas.sign('gift', { w: 0.8, h: 0.3, post: 0, depth: 0.05 });
  s.position.set(x, 1.86, z + 0.1);
  add(s);
  // Plush toys: the baby giraffe (top shelf), a penguin and a flamingo; balloons on the counter
  const baby = makePlush();
  baby.position.set(x - 0.26, 1.04, z + 0.45);
  baby.rotation.y = 0.35;
  add(baby);
  const tag = atlas.plane('plush', 0.3, 0.11);
  tag.position.set(x + 0.18, 1.0, z + 0.555);
  add(tag);
  const peng = new THREE.Group();
  peng.add(at(sph(0.09, '#2b3550', 10), 0, 0.09, 0), at(sph(0.068, '#ffffff', 10), 0, 0.085, 0.035), at(sph(0.055, '#2b3550', 10), 0, 0.2, 0));
  const beak = rot(at(cone(0.018, 0.05, SUN, 6), 0, 0.2, 0.06), Math.PI / 2, 0, 0);
  peng.add(beak);
  peng.position.set(x + 0.3, 1.38, z + 0.45);
  add(peng);
  const fla = new THREE.Group();
  fla.add(at(sph(0.08, PINK, 10), 0, 0.2, 0), at(cyl(0.012, 0.012, 0.16, PINK, 5), 0, 0.08, 0));
  const fneck = rot(at(cyl(0.014, 0.014, 0.14, PINK, 6), 0.04, 0.31, 0.02), 0, 0, -0.4);
  fla.add(fneck, at(sph(0.035, PINK, 8), 0.07, 0.39, 0.03), at(cone(0.015, 0.04, '#3b2b3f', 5), 0.1, 0.38, 0.03));
  fla.position.set(x - 0.2, 1.38, z + 0.45);
  add(fla);
  for (const [dx, c] of [[0.25, CORAL], [0.38, TEAL], [0.51, SUN]]) add(at(sph(0.045, c, 8), x + dx - 0.3, 0.8, z + 0.52));
  colliders.push({ type: 'box', x, z: z + 0.1, hw: 0.75, hd: 0.5 });
}

// ------------------------------------------------ props the scenes move

// The rolling library ladder: five steps you can walk up, a top platform with a rail, four wheels.
// Origin at the bottom front edge centre; it faces -Z (you climb toward the fence).
export function makeLadder(atlas) {
  const g = new THREE.Group();
  const sign = atlas.plane('brush', 0.66, 0.165);
  sign.position.set(0, 1.79, -1.3);
  g.add(sign);
  const frame = '#21a99a';
  for (let k = 0; k < 5; k++) {
    const y = 0.25 * (k + 1);
    const top = k === 4;
    const d = top ? 0.56 : 0.2;
    const z = top ? -1.08 : -0.1 - 0.2 * k;
    g.add(at(rbox(0.66, 0.06, d, k % 2 ? PLANK : '#d39463', 0.015), 0, y - 0.03, z));
    if (!top) g.add(at(box(0.62, 0.25 * (k + 1) - 0.06, 0.03, '#b98258'), 0, (0.25 * (k + 1) - 0.06) / 2, z + 0.09));
  }
  for (const s of [1, -1]) {
    const rail = at(box(0.06, 0.06, 1.85, frame), 0.35 * s, 0.64, -0.68);
    rail.rotation.x = Math.atan2(1.25, 1.36);
    g.add(rail);
    g.add(at(box(0.06, 1.97, 0.06, frame), 0.35 * s, 0.985, -1.33));
    g.add(at(box(0.05, 0.63, 0.05, frame), 0.35 * s, 1.565, -0.83));
    g.add(at(box(0.05, 0.05, 0.52, frame), 0.35 * s, 1.88, -1.08));
    for (const wz of [-0.04, -1.3]) g.add(rot(at(cyl(0.07, 0.07, 0.05, SUN, 12), 0.39 * s, 0.07, wz), 0, 0, Math.PI / 2));
  }
  g.add(at(box(0.75, 0.05, 0.05, frame), 0, 1.97, -1.33));
  g.add(at(box(0.75, 0.05, 0.05, frame), 0, 1.6, -1.33));
  g.add(at(sph(0.05, CORAL, 10), 0.35, 1.99, -1.33), at(sph(0.05, CORAL, 10), -0.35, 1.99, -1.33));
  return solid(g);
}

// Ladder step colliders, for a ladder whose bottom front edge sits at (x, z)
export function ladderColliders(x, z) {
  const out = [];
  for (let k = 0; k < 5; k++) {
    const top = k === 4;
    const d = top ? 0.56 : 0.2;
    const cz = z + (top ? -1.08 : -0.1 - 0.2 * k);
    out.push({ type: 'box', x, z: cz, hw: 0.36, hd: d / 2, h: 0.25 * (k + 1), tag: 'zoo-ladder' });
  }
  return out;
}

export function makeBrush() {
  const g = new THREE.Group();
  g.add(rot(at(cyl(0.02, 0.025, 0.26, '#a8764a', 8), 0, -0.1, 0), 0, 0, 0));
  g.add(at(rbox(0.12, 0.05, 0.07, CORAL, 0.015), 0, -0.25, 0.0));
  for (let k = 0; k < 4; k++) g.add(at(box(0.022, 0.045, 0.05, '#fff3c9'), -0.045 + k * 0.03, -0.29, 0));
  return solid(g);
}

export function makeNozzle() {
  const g = new THREE.Group();
  g.add(rot(at(cyl(0.035, 0.03, 0.2, SUN, 10), 0, 0, 0.06), Math.PI / 2, 0, 0));
  g.add(rot(at(cyl(0.045, 0.04, 0.05, '#3fae6a', 10), 0, 0, 0.17), Math.PI / 2, 0, 0));
  g.add(rot(at(rbox(0.05, 0.14, 0.05, SUN, 0.015), 0, -0.07, -0.02), 0.3, 0, 0));
  g.add(at(rbox(0.02, 0.06, 0.02, CORAL, 0.008), 0, -0.04, 0.03));
  solid(g);
  g.traverse((o) => (o.castShadow = false));
  return g;
}

// The sliding head bar of the height chart: collar on the pole, a plate over the head, a number label.
export function makeBar() {
  const g = new THREE.Group();
  const frame = new THREE.Group();
  frame.add(at(rbox(0.3, 0.12, 0.26, SUN, 0.03), 0, 0, 0));
  frame.add(at(rbox(1.0, 0.05, 0.62, CREAM, 0.02), 0.6, 0, -0.4));
  frame.add(at(box(0.98, 0.06, 0.04, CORAL), 0.6, 0, -0.08));
  solid(frame);
  g.add(frame);
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const label = mesh(new THREE.PlaneGeometry(0.78, 0.29), new THREE.MeshBasicMaterial({ map: tex, transparent: true }), { cast: false, receive: false });
  label.position.set(0.62, 0.22, 0.02);
  g.add(label);
  const draw = (txt, color = CORAL) => {
    const x = c.getContext('2d');
    x.clearRect(0, 0, 256, 96);
    x.fillStyle = color;
    roundRect(x, 4, 4, 248, 88, 40);
    x.fill();
    x.fillStyle = '#ffffff';
    x.font = `700 52px ${FONT}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(txt, 128, 52);
    tex.needsUpdate = true;
  };
  draw('?');
  return { root: g, draw, label };
}

// Today's front page of the Island Times. setHeadline() repaints it; bite(k) eats it from one corner.
export function makePaper() {
  const root = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 192;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const holder = new THREE.Group();
  const page = mesh(new THREE.BoxGeometry(0.44, 0.012, 0.33), [mat('#f1ece2'), mat('#f1ece2'), umat('#ffffff', { map: tex, rough: 0.9 }), mat('#f1ece2'), mat('#f1ece2'), mat('#f1ece2')], { cast: true });
  holder.add(page);
  root.add(holder);
  const setHeadline = (lines, pic) => {
    const x = c.getContext('2d');
    x.fillStyle = '#fbf7ee';
    x.fillRect(0, 0, 256, 192);
    x.fillStyle = '#3b2b3f';
    x.font = `700 30px ${FONT}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('Island Times', 128, 24);
    x.fillRect(12, 44, 232, 3);
    x.font = `600 19px ${FONT}`;
    lines.forEach((l, i) => x.fillText(l, 128, 68 + i * 22));
    x.fillStyle = pic || '#ffd9e3';
    x.fillRect(16, 124, 100, 56);
    x.fillStyle = '#e38e3d';
    x.beginPath();
    x.arc(66, 152, 14, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#c9c2b3';
    for (let k = 0; k < 5; k++) x.fillRect(128, 128 + k * 11, 112 - (k === 4 ? 40 : 0), 5);
    tex.needsUpdate = true;
  };
  // k: 0 whole page .. 1 eaten. The page shrinks from its right edge.
  const bite = (k) => {
    const s = Math.max(0.001, 1 - k);
    holder.scale.set(s, 1, 1 - k * 0.35);
    holder.position.x = -0.22 * (1 - s);
  };
  return { root, setHeadline, bite };
}

// Round reading glasses for Jodi (on her head, in front of the eyes)
export function makeGlasses() {
  const g = new THREE.Group();
  for (const s of [1, -1]) {
    g.add(at(tor(0.062, 0.009, '#3b2b3f'), 0.105 * s, 0, 0));
    g.add(rot(at(cyl(0.007, 0.007, 0.16, '#3b2b3f', 5), 0.17 * s, 0.0, -0.08), Math.PI / 2, 0, 0));
  }
  g.add(rot(at(tor(0.03, 0.008, '#3b2b3f', Math.PI), 0, 0.006, 0), 0, 0, 0));
  return solid(g);
}

// Two candle flames, one per candle
export function makeFlames() {
  const out = [];
  for (const dx of [-0.08, 0.08]) {
    const f = new THREE.Group();
    const outer = mesh(G('flameO', () => new THREE.SphereGeometry(0.045, 10, 8)), new THREE.MeshBasicMaterial({ color: '#ff9a1f' }), { cast: false });
    outer.scale.set(0.75, 1.7, 0.75);
    const inner = mesh(G('flameI', () => new THREE.SphereGeometry(0.024, 8, 6)), new THREE.MeshBasicMaterial({ color: '#fff0a0' }), { cast: false });
    inner.position.z = 0.02;
    inner.position.y = -0.012;
    inner.scale.set(1, 1.5, 1);
    f.add(outer, inner);
    f.position.set(CAKE.x + dx, CAKE.top + 0.18, CAKE.z + 0.04);
    out.push(f);
  }
  return out;
}

export function makeCarrot() {
  const g = new THREE.Group();
  g.add(rot(at(cone(0.045, 0.26, '#ff9a3c', 10), 0, 0, 0.02), Math.PI / 2, 0, 0));
  for (let k = 0; k < 3; k++) g.add(rot(at(cyl(0.008, 0.012, 0.12, '#4f9a45', 5), (k - 1) * 0.018, 0, -0.17), Math.PI / 2, 0, (k - 1) * 0.5));
  for (let k = 0; k < 3; k++) g.add(at(tor(0.036 - k * 0.009, 0.004, '#e07f2a'), 0, 0, -0.06 + k * 0.05));
  return solid(g);
}

export function makeLettuce() {
  const g = new THREE.Group();
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    const l = at(sph(0.07, k % 2 ? '#b8e986' : '#9fdc6a', 10), Math.cos(a) * 0.05, (k % 3) * 0.02, Math.sin(a) * 0.05);
    l.scale.set(1.1, 0.5, 1.2);
    l.rotation.set(Math.sin(a) * 0.5, a, Math.cos(a) * 0.5);
    g.add(l);
  }
  g.add(at(sph(0.05, '#e6f8c8', 10), 0, 0.03, 0));
  return solid(g);
}

// One lettuce leaf that ends up on Jouri's head like a hat
export function makeLeafHat() {
  const g = new THREE.Group();
  const l = at(sph(0.13, '#a8e07a', 12), 0, 0, 0);
  l.scale.set(1.15, 0.22, 1.0);
  g.add(l);
  g.add(at(sph(0.05, '#d4f2b0', 8), 0.02, 0.025, 0.02));
  return solid(g);
}

// The plush baby giraffe in the gift shop (and the one Roji carries)
export function makePlush() {
  const g = new THREE.Group();
  const B = '#ffe5a8';
  const S = '#e38e3d';
  const body = at(sph(0.11, B, 12), 0, 0.12, 0);
  body.scale.set(1, 0.9, 1.2);
  g.add(body);
  for (const [x, z] of [[0.06, 0.07], [-0.06, 0.07], [0.06, -0.07], [-0.06, -0.07]]) g.add(at(cyl(0.025, 0.025, 0.1, B, 6), x, 0.04, z));
  g.add(rot(at(cyl(0.035, 0.045, 0.2, B, 8), 0, 0.27, 0.07), 0.3, 0, 0));
  g.add(at(sph(0.07, B, 12), 0, 0.39, 0.12));
  g.add(at(sph(0.045, '#fff7e6', 10), 0, 0.37, 0.18));
  for (const s of [1, -1]) {
    g.add(at(sph(0.013, '#1d130f', 6), 0.03 * s, 0.41, 0.175));
    g.add(at(cyl(0.008, 0.01, 0.05, B, 5), 0.025 * s, 0.47, 0.11));
    g.add(at(sph(0.014, '#6b3e22', 6), 0.026 * s, 0.5, 0.11));
    g.add(at(sph(0.014, PINK, 6), 0.05 * s, 0.37, 0.16));
  }
  for (const [x, y, z] of [[0.08, 0.15, 0.04], [-0.07, 0.1, -0.06], [0.0, 0.2, -0.1], [-0.09, 0.16, 0.05]]) {
    const sp = at(sph(0.025, S, 6), x, y, z);
    sp.scale.set(1, 1, 0.4);
    g.add(sp);
  }
  return g;
}

export function makeCrown() {
  const g = new THREE.Group();
  g.add(rot(at(tor(0.1, 0.014, SUN), 0, 0, 0), Math.PI / 2, 0, 0));
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const l = at(sph(0.035, k % 2 ? '#ffd166' : '#f5b83d', 8, { rough: 0.35, metal: 0.3 }), Math.cos(a) * 0.1, 0.035, Math.sin(a) * 0.1);
    l.scale.set(0.6, 1.4, 0.4);
    l.rotation.y = -a;
    g.add(l);
  }
  return solid(g);
}

// A small rainbow arc (bath time), see-through
export function makeRainbow() {
  const cols = ['#ff6b6b', '#ffb36b', '#ffe066', '#7fd36a', '#6fb8ff', '#b58cff'];
  const list = cols.map((c, i) => {
    const geo = new THREE.TorusGeometry(0.9 - i * 0.07, 0.035, 6, 28, Math.PI);
    const col = new THREE.Color(c);
    const n = geo.attributes.position.count;
    const a = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) col.toArray(a, k * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return geo;
  });
  const merged = new THREE.Mesh(mergeAll(list), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.0, depthWrite: false }));
  merged.castShadow = false;
  return merged;
}

function mergeAll(list) {
  const pos = [];
  const col = [];
  for (const g of list) {
    const ng = g.index ? g.toNonIndexed() : g;
    pos.push(...ng.attributes.position.array);
    col.push(...ng.attributes.color.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}

// Instanced bits for water drops and music notes, hidden while idle.
export function makeSwarm(count, geo, material) {
  const im = new THREE.InstancedMesh(geo, material, count);
  im.frustumCulled = false;
  im.castShadow = false;
  const m4 = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < count; i++) im.setMatrixAt(i, m4);
  im.visible = false;
  return im;
}

export function noteGeometry() {
  const s = new THREE.Shape();
  s.absellipse(0, 0, 0.07, 0.055, 0, Math.PI * 2, false, -0.4);
  const head = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false });
  const stem = new THREE.BoxGeometry(0.02, 0.2, 0.02);
  stem.translate(0.06, 0.1, 0.01);
  const flag = new THREE.BoxGeometry(0.07, 0.025, 0.02);
  flag.translate(0.09, 0.19, 0.01);
  const parts = [head, stem, flag].map((g) => (g.index ? g.toNonIndexed() : g));
  const pos = [];
  const nor = [];
  for (const g of parts) {
    g.computeVertexNormals();
    pos.push(...g.attributes.position.array);
    nor.push(...g.attributes.normal.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}
