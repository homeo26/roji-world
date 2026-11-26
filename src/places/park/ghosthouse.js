import { THREE, P, inst, toGeo, vcMat, fitText, roundRect, drawStar, Polyline, wire } from './parts.js';
import { mat, mesh, heartShape } from '../../util.js';
import { sfx } from './music.js';

// The Ghost Train: a crooked little purple house in the middle of the Comet's loop, with a witch-hat
// tower, glowing round windows, a heart-shaped window, pumpkins by the door, bats on threads under
// the eaves and a big smiling ghost on the roof who waves at everybody. Pumpkin cars full of giggling
// visitors roll out of the Out door, round a little loop and back in through the In door.

export const GHOST = { x: 8.0, front: -11.6, back: -15.0, w: 5.2, doorIn: 6.6, doorOut: 9.4 };
const WALL_H = 3.0;
const BASE = 0.24;
const RISE = 1.45;
const LOOP_R = 1.4;
const LOOP_Z = -10.3;

// A pumpkin car (along +Z) with two visitors, hands up
function carModel(k) {
  const g = new THREE.Group();
  const body = k.sph(0.5, '#ff9a3c', undefined, 12);
  body.scale.set(0.8, 0.62, 1.0);
  body.position.y = 0.42;
  g.add(body);
  for (const s of [-1, 1]) {
    const rib = k.sph(0.5, '#f58a2e', undefined, 10);
    rib.scale.set(0.55, 0.6, 0.98);
    rib.position.set(s * 0.18, 0.42, 0);
    g.add(rib);
  }
  g.add(k.at(k.rbox(0.56, 0.14, 0.6, '#5b3f8f', 0.05), 0, 0.72, -0.05));
  // the stem curls up at the back as a handle
  const stem = k.tor(0.13, 0.04, P.leafDark, Math.PI * 1.3, undefined, 10, 5);
  stem.rotation.y = Math.PI / 2;
  stem.position.set(0, 0.88, -0.45);
  g.add(stem);
  // a smiling face on the front
  for (const s of [-1, 1]) g.add(k.at(k.sph(0.05, P.ink, undefined, 6), s * 0.13, 0.52, 0.47));
  const smile = k.tor(0.1, 0.022, P.ink, Math.PI, undefined, 10, 4);
  smile.rotation.z = Math.PI;
  smile.position.set(0, 0.42, 0.49);
  g.add(smile);
  for (const s of [-1, 1]) {
    for (const z of [-0.3, 0.3]) g.add(k.at(k.rot(k.cyl(0.11, 0.11, 0.07, '#5b3f8f', 10), 0, 0, Math.PI / 2), s * 0.4, 0.12, z));
  }
  for (const [x, shirt, hair] of [[-0.15, '#ff9eb5', '#2a1a13'], [0.15, '#8fd3ff', '#141010']]) {
    g.add(k.at(k.cyl(0.1, 0.12, 0.26, shirt, 8), x, 0.86, 0.02));
    g.add(k.at(k.sph(0.12, '#f2cdb4', undefined, 8), x, 1.08, 0.02));
    g.add(k.at(k.sph(0.125, hair, undefined, 7), x, 1.12, -0.01));
    const arm = k.cyl(0.03, 0.03, 0.28, '#f2cdb4', 5);
    arm.position.set(x + Math.sign(x) * 0.12, 1.08, 0.02);
    arm.rotation.z = -Math.sign(x) * 0.35;
    g.add(arm);
  }
  return g;
}

// A little bat (wings out), about 0.3 m across
function batModel(k) {
  const g = new THREE.Group();
  g.add(k.at(k.sph(0.07, '#5b3f8f', undefined, 8), 0, 0, 0));
  for (const s of [-1, 1]) {
    const wing = k.sph(0.09, '#5b3f8f', undefined, 6);
    wing.scale.set(1.3, 0.25, 0.7);
    wing.rotation.z = s * 0.35;
    wing.position.set(s * 0.12, 0.02, 0);
    g.add(wing);
    g.add(k.at(k.cone(0.025, 0.06, '#5b3f8f', 4), s * 0.04, 0.08, 0));
    g.add(k.at(k.sph(0.014, '#fff3c4', undefined, 5), s * 0.025, 0.01, 0.06));
  }
  return g;
}

// A bat-wing flap door panel, hinge at x = 0, swinging into the house
function flapModel(k) {
  const g = new THREE.Group();
  g.add(k.at(k.box(0.5, 1.0, 0.05, '#6b4f8f'), 0.25, 0.62, 0));
  g.add(k.at(k.box(0.5, 0.06, 0.06, P.gold), 0.25, 1.1, 0));
  g.add(k.at(k.box(0.5, 0.06, 0.06, P.gold), 0.25, 0.14, 0));
  const moon = k.sph(0.08, '#ffe08a', undefined, 8);
  moon.scale.set(1, 1, 0.3);
  moon.position.set(0.3, 0.72, 0.03);
  g.add(moon);
  return g;
}

export function buildGhostHouse(ctx, k, shared) {
  const { api } = ctx;
  const { atlas, pal, lights } = shared;
  const lit = (geo, swatch) => new THREE.Mesh(pal.paint(geo, swatch), pal.material);
  const root = new THREE.Group();
  const dynamic = [];
  const colliders = [];
  const G = GHOST;
  const D = G.front - G.back;
  const CZ = (G.front + G.back) / 2;
  const wallC = '#a68ae6';
  const trimC = '#6b4f8f';
  const roofC = '#5b3f8f';

  // ------------------------------------------------ the house
  root.add(k.at(k.box(G.w + 0.3, BASE, D + 0.3, trimC), G.x, BASE / 2, CZ));
  root.add(k.at(k.box(G.w, WALL_H, D, wallC), G.x, BASE + WALL_H / 2, CZ));
  // siding boards and corner posts
  for (let y = BASE + 0.5; y < BASE + WALL_H - 0.1; y += 0.5) {
    const b = k.box(G.w + 0.02, 0.035, D + 0.02, '#9a7ddc');
    b.castShadow = false;
    b.position.set(G.x, y, CZ);
    root.add(b);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) root.add(k.at(k.box(0.18, WALL_H + 0.05, 0.18, trimC), G.x + sx * (G.w / 2), BASE + WALL_H / 2, CZ + sz * (D / 2)));
  root.add(k.at(k.box(G.w + 0.24, 0.14, D + 0.24, P.cream), G.x, BASE + WALL_H, CZ));
  // the roof: two slopes with a ridge along x, gable ends and a scalloped trim
  const run = D / 2 + 0.38;
  const slope = Math.hypot(run, RISE);
  const ang = Math.atan2(RISE, run);
  const top = BASE + WALL_H + 0.07;
  for (const s of [-1, 1]) {
    const r = k.box(G.w + 0.5, 0.14, slope, roofC);
    r.position.set(G.x, top + RISE / 2, CZ + (s * run) / 2);
    r.rotation.x = s * ang;
    root.add(r);
    // scallops along the eave
    for (let i = 0; i < 14; i++) {
      const sc = k.cyl(0.2, 0.2, 0.06, '#c7a6ff', 10);
      sc.rotation.x = Math.PI / 2 - s * ang;
      sc.scale.set(1, 1, 0.6);
      sc.position.set(G.x - G.w / 2 - 0.05 + i * ((G.w + 0.1) / 13), top + 0.02, CZ + s * (run - 0.02));
      sc.castShadow = false;
      root.add(sc);
    }
  }
  const tri = new THREE.Shape();
  tri.moveTo(-D / 2 - 0.05, 0);
  tri.lineTo(D / 2 + 0.05, 0);
  tri.lineTo(0, RISE * ((D / 2) / run) + 0.05);
  tri.closePath();
  const triGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.12, bevelEnabled: false });
  for (const s of [-1, 1]) {
    const gable = mesh(triGeo, mat(wallC, { rough: 0.78 }));
    gable.rotation.y = Math.PI / 2;
    gable.position.set(G.x + s * (G.w / 2) - 0.06, top, CZ);
    root.add(gable);
  }
  root.add(k.at(k.rot(k.cyl(0.09, 0.09, G.w + 0.6, P.cream, 8), 0, 0, Math.PI / 2), G.x, top + RISE + 0.02, CZ));
  // a crooked chimney with a puff of smoke
  const chim = k.box(0.42, 1.1, 0.42, '#7a5aa6');
  chim.position.set(G.x + 1.7, top + RISE * 0.6, CZ - 0.6);
  chim.rotation.z = -0.12;
  root.add(chim);
  root.add(k.at(k.box(0.52, 0.12, 0.52, trimC), G.x + 1.76, top + RISE * 0.6 + 0.56, CZ - 0.6));
  for (const [dx, dy, r] of [[0.1, 0.85, 0.16], [0.28, 1.08, 0.12], [0.5, 1.25, 0.09]]) root.add(k.at(k.sph(r, '#f4eefc', undefined, 10), G.x + 1.76 + dx, top + RISE * 0.6 + dy, CZ - 0.6));

  // The tower on the left with a witch-hat roof that bends at the tip
  const TW = { x: G.x - G.w / 2 + 0.3, z: G.back + 1.0, r: 0.72, h: 4.3 };
  root.add(k.at(k.cyl(TW.r + 0.08, TW.r + 0.1, 0.26, trimC, 18), TW.x, 0.13, TW.z));
  root.add(k.at(k.cyl(TW.r, TW.r, TW.h, wallC, 18), TW.x, TW.h / 2 + 0.2, TW.z));
  root.add(k.at(k.cyl(TW.r + 0.12, TW.r + 0.12, 0.14, P.cream, 18), TW.x, TW.h + 0.25, TW.z));
  const hat = k.cone(TW.r + 0.22, 1.7, roofC, 18);
  hat.position.set(TW.x, TW.h + 1.15, TW.z);
  root.add(hat);
  const tip = k.cone(0.2, 0.7, roofC, 10);
  tip.position.set(TW.x + 0.18, TW.h + 2.15, TW.z);
  tip.rotation.z = -0.7;
  root.add(tip);
  root.add(k.at(k.star(0.14, 0.06, 0.04, P.sun), TW.x + 0.48, TW.h + 2.35, TW.z));

  // ------------------------------------------------ the front: doors, windows, the sign
  const FZ = G.front;
  for (const x of [G.doorIn, G.doorOut]) {
    const hole = k.box(1.12, 1.25, 0.06, '#2b2140');
    hole.castShadow = false;
    hole.position.set(x, BASE + 0.62, FZ + 0.03);
    root.add(hole);
    const arch = k.cyl(0.56, 0.56, 0.06, '#2b2140', 18);
    arch.rotation.x = Math.PI / 2;
    arch.castShadow = false;
    arch.position.set(x, BASE + 1.25, FZ + 0.03);
    root.add(arch);
    const frame = k.tor(0.6, 0.06, P.gold, Math.PI, undefined, 18, 6);
    frame.position.set(x, BASE + 1.25, FZ + 0.07);
    root.add(frame);
    for (const s of [-1, 1]) root.add(k.at(k.box(0.12, 1.28, 0.12, P.gold), x + s * 0.6, BASE + 0.62, FZ + 0.07));
  }
  // round windows with crooked shutters
  const winGeo = k.geo('ghostwin', () => new THREE.CircleGeometry(0.3, 18));
  for (const x of [G.x - 2.05, G.x + 2.05]) {
    const w = lit(winGeo, 'warm');
    w.position.set(x, BASE + 2.05, FZ + 0.03);
    root.add(w);
    root.add(k.at(k.tor(0.31, 0.05, P.cream, Math.PI * 2, undefined, 18, 5), x, BASE + 2.05, FZ + 0.04));
    root.add(k.at(k.rot(k.box(0.04, 0.6, 0.04, P.cream), 0, 0, 0), x, BASE + 2.05, FZ + 0.05));
    const sh = k.box(0.24, 0.62, 0.05, trimC);
    sh.position.set(x + (x < G.x ? -0.47 : 0.47), BASE + 2.0, FZ + 0.04);
    sh.rotation.z = x < G.x ? 0.12 : -0.1;
    root.add(sh);
  }
  // the tower window
  {
    const w = lit(winGeo, 'warm');
    w.scale.setScalar(0.75);
    w.position.set(TW.x, 3.3, TW.z + TW.r + 0.01);
    root.add(w);
    root.add(k.at(k.tor(0.23, 0.04, P.cream, Math.PI * 2, undefined, 16, 4), TW.x, 3.3, TW.z + TW.r + 0.03));
  }
  // An easter egg between the doors: a heart-shaped window glowing pink
  const hs = heartShape(0.46);
  const heartGeo = new THREE.ShapeGeometry(hs, 8);
  heartGeo.computeBoundingBox();
  {
    const b = heartGeo.boundingBox;
    heartGeo.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, 0);
  }
  const hw = lit(heartGeo, 'pink');
  hw.position.set(G.x, BASE + 1.05, FZ + 0.035);
  root.add(hw);
  const hframe = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(0.56), 8), mat(P.cream, { rough: 0.7 }));
  hframe.geometry.computeBoundingBox();
  {
    const b = hframe.geometry.boundingBox;
    hframe.geometry.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, 0);
  }
  hframe.position.set(G.x, BASE + 1.05, FZ + 0.025);
  hframe.castShadow = false;
  root.add(hframe);

  const board = (w, h, pw, ph, draw, x, y, z) => {
    const p = atlas.panel(w, h, pw, ph, draw);
    p.position.set(x, y, z);
    root.add(p);
    return p;
  };
  // The big sign: a wavy board with a little ghost
  board(2.55, 0.78, 510, 156, (c, w, h) => {
    c.fillStyle = '#3b2b5f';
    c.beginPath();
    c.moveTo(20, h - 22);
    for (let x = 20; x <= w - 20; x += 4) c.lineTo(x, h - 22 + Math.sin(x / 18) * 6);
    c.lineTo(w - 20, 26);
    for (let x = w - 20; x >= 20; x -= 4) c.lineTo(x, 26 + Math.sin(x / 18 + 1) * 6);
    c.closePath();
    c.fill();
    c.lineWidth = 7;
    c.strokeStyle = '#c7a6ff';
    c.stroke();
    // a little ghost on the left
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(68, 70, 30, Math.PI, 0);
    c.lineTo(98, 112);
    for (let i = 0; i < 4; i++) c.arc(90 - i * 15, 112, 7.5, 0, Math.PI);
    c.closePath();
    c.fill();
    c.fillStyle = '#3b2b5f';
    for (const x of [58, 78]) {
      c.beginPath();
      c.ellipse(x, 70, 4.5, 6.5, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#ffd166';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Ghost Train', w / 2 + 36, h / 2 + 3, w * 0.66, 76, 700);
    c.fillStyle = '#c7a6ff';
    drawStar(c, w - 40, 44, 12);
    c.fill();
  }, G.x, BASE + 2.36, FZ + 0.06);
  root.add(k.at(k.box(0.06, 0.4, 0.06, trimC), G.x - 0.9, BASE + 2.92, FZ + 0.04));
  root.add(k.at(k.box(0.06, 0.4, 0.06, trimC), G.x + 0.9, BASE + 2.92, FZ + 0.04));
  const plaque = (text, x) =>
    board(0.62, 0.26, 124, 52, (c, w, h) => {
      c.fillStyle = '#ffd166';
      roundRect(c, 3, 3, w - 6, h - 6, 14);
      c.fill();
      c.fillStyle = '#3b2b5f';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fitText(c, text, w / 2, h / 2 + 2, w * 0.8, 34, 700);
    }, x, BASE + 1.0, FZ + 0.05);
  plaque('In', G.doorIn - 0.95);
  plaque('Out', G.doorOut + 0.95);
  // A speech bubble by the roof ghost
  board(1.05, 0.5, 210, 100, (c, w, h) => {
    c.fillStyle = '#ffffff';
    roundRect(c, 4, 4, w - 8, h - 26, 26);
    c.fill();
    c.beginPath();
    c.moveTo(40, h - 24);
    c.lineTo(28, h - 4);
    c.lineTo(64, h - 24);
    c.closePath();
    c.fill();
    c.fillStyle = '#7a5aa6';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Boo! (a nice one)', w / 2, (h - 22) / 2 + 3, w * 0.84, 28, 700);
  }, G.x + 0.4 + 1.2, top + RISE + 1.55, CZ + 0.2);

  // Pumpkins by the doors, one with a glowing smile
  const pumpkin = (x, z, s, glowing) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    for (const [dx, sc] of [[0, 1], [-0.07, 0.8], [0.07, 0.8]]) {
      const b = k.sph(0.22 * s, dx === 0 ? '#ff9a3c' : '#f58a2e', undefined, 9);
      b.scale.set(sc, 0.72, sc);
      b.position.set(dx * s, 0.16 * s, 0);
      g.add(b);
    }
    g.add(k.at(k.cyl(0.025 * s, 0.035 * s, 0.1 * s, P.leafDark, 6), 0, 0.33 * s, 0));
    if (glowing) {
      for (const dx of [-0.07, 0.07]) {
        const eye = lit(k.geo('peye', () => new THREE.CircleGeometry(0.035, 3)), 'warm');
        eye.position.set(dx * s, 0.2 * s, 0.215 * s);
        eye.rotation.z = Math.PI / 2;
        g.add(eye);
      }
      const m = lit(k.geo('pmouth', () => new THREE.CircleGeometry(0.07, 10, Math.PI, Math.PI)), 'warm');
      m.position.set(0, 0.13 * s, 0.218 * s);
      g.add(m);
    }
    root.add(g);
  };
  pumpkin(G.doorIn - 0.95, FZ + 0.3, 1.1, true);
  pumpkin(G.doorOut + 0.95, FZ + 0.32, 1.0, true);
  pumpkin(G.doorOut + 1.3, FZ + 0.62, 0.7, false);
  pumpkin(G.doorIn - 1.3, FZ + 0.7, 0.65, false);
  // a soft cobweb in the right corner
  {
    const cx = G.x + G.w / 2 - 0.06;
    const cy = BASE + WALL_H - 0.1;
    for (let i = 0; i < 4; i++) {
      const a = Math.PI + (i / 3) * (Math.PI / 2);
      const th = k.cyl(0.008, 0.008, 0.6, '#ffffff', 3);
      th.position.set(cx + Math.cos(a) * 0.3, cy + Math.sin(a) * 0.3, FZ + 0.05);
      th.rotation.z = a + Math.PI / 2;
      th.castShadow = false;
      root.add(th);
    }
    for (const r of [0.2, 0.38, 0.54]) {
      const arc = k.tor(r, 0.006, '#ffffff', Math.PI / 2, undefined, 8, 3);
      arc.position.set(cx, cy, FZ + 0.05);
      arc.rotation.z = Math.PI;
      arc.castShadow = false;
      root.add(arc);
    }
  }
  // a string of little lights along the front eave
  const eave = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    eave.push(new THREE.Vector3(G.x - G.w / 2 - 0.1 + t * (G.w + 0.2), top - 0.12 - Math.sin(t * Math.PI * 4) ** 2 * 0.08, CZ + run - 0.05));
  }
  const EC = ['#c7a6ff', '#b8f5c9', '#fff3c4', '#ffb3d1'];
  eave.forEach((p, i) => lights.push({ p, c: EC[i % 4], r: 0.055 }));

  // ------------------------------------------------ the ghost on the roof
  const gh = new THREE.Group();
  const GHP = { x: G.x + 0.4, y: top + RISE - 0.08, z: CZ + 0.15 };
  gh.position.set(GHP.x, GHP.y, GHP.z);
  root.add(gh);
  dynamic.push(gh);
  const bodyG = new THREE.Group();
  const head = k.sph(0.52, '#ffffff', undefined, 18);
  head.position.y = 0.95;
  bodyG.add(head);
  bodyG.add(k.at(k.cyl(0.52, 0.66, 0.62, '#ffffff', 18), 0, 0.64, 0));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    bodyG.add(k.at(k.sph(0.17, '#ffffff', undefined, 8), Math.sin(a) * 0.55, 0.34, Math.cos(a) * 0.55));
  }
  const leftArm = k.sph(0.16, '#ffffff', undefined, 10);
  leftArm.scale.set(1.6, 0.8, 0.8);
  leftArm.position.set(-0.62, 0.72, 0.05);
  bodyG.add(leftArm);
  // the right arm is up in a wave (the whole ghost rocks from side to side)
  const rightArm = k.sph(0.16, '#ffffff', undefined, 10);
  rightArm.scale.set(1.6, 0.8, 0.8);
  rightArm.rotation.z = 0.9;
  rightArm.position.set(0.66, 0.95, 0.05);
  bodyG.add(rightArm);
  const faceG = bodyG;
  const sw = (m, name) => ((m.userData.swatch = name), m);
  for (const s of [-1, 1]) {
    const eye = sw(k.sph(0.075, P.ink, undefined, 10), 'ink');
    eye.scale.set(0.85, 1.25, 0.5);
    eye.position.set(s * 0.18, 1.02, 0.47);
    faceG.add(eye);
    faceG.add(sw(k.at(k.sph(0.022, '#ffffff', undefined, 6), s * 0.18 + 0.025, 1.08, 0.51), 'white'));
    const blush = sw(k.sph(0.07, '#ffb3c8', undefined, 8), 'blush');
    blush.scale.set(1.1, 0.6, 0.3);
    blush.position.set(s * 0.31, 0.88, 0.43);
    faceG.add(blush);
  }
  const mouth = sw(k.sph(0.09, '#5a2a44', undefined, 10), 'mouth');
  mouth.scale.set(1.1, 0.8, 0.4);
  mouth.position.set(0, 0.84, 0.49);
  faceG.add(mouth);
  faceG.add(sw(k.at(k.sph(0.045, '#ff7fa3', undefined, 8), 0, 0.8, 0.52), 'tongue'));
  const body = mesh(pal.merge(bodyG), pal.material);
  body.castShadow = true;
  gh.add(body);

  // ------------------------------------------------ the track, the cars and the flap doors
  const pts = [];
  const tags = [];
  const add = (x, z, tag) => {
    pts.push(new THREE.Vector3(x, 0.12, z));
    tags.push(tag);
  };
  const IN = G.doorIn;
  const OUT = G.doorOut;
  const LC = (IN + OUT) / 2;
  // out of the Out door, round the loop, in through the In door, then round inside the house
  add(OUT, FZ - 0.9, 'in');
  for (let z = FZ - 0.4; z < LOOP_Z; z += 0.3) add(OUT, z, 'out');
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI;
    add(LC + Math.cos(a) * LOOP_R, LOOP_Z + Math.sin(a) * LOOP_R, 'out');
  }
  for (let z = LOOP_Z - 0.3; z > FZ - 0.4; z -= 0.3) add(IN, z, 'out');
  add(IN, FZ - 0.9, 'in');
  add(IN, G.back + 1.2, 'in');
  add(OUT, G.back + 1.2, 'in');
  add(pts[0].x, pts[0].z, 'in');
  const loop = new Polyline(pts, tags);
  // the rails and the bed of the visible part (from just inside one door to just inside the other)
  const railPts = [];
  for (let d = 0.4; d < loop.length; d += 0.25) {
    const p = new THREE.Vector3();
    loop.at(d, p);
    if (p.z > FZ - 0.25) railPts.push(p);
  }
  const offsetLine = (side) => {
    const out = [];
    const tmp = new THREE.Vector3();
    for (let i = 0; i < railPts.length; i++) {
      const a = railPts[Math.max(0, i - 1)];
      const b = railPts[Math.min(railPts.length - 1, i + 1)];
      tmp.subVectors(b, a).normalize();
      out.push(new THREE.Vector3(railPts[i].x - tmp.z * side, 0.09, railPts[i].z + tmp.x * side));
    }
    return out;
  };
  for (const s of [-0.21, 0.21]) root.add(wire(offsetLine(s), 0.025, '#d3dbe5', railPts.length * 2));
  for (let i = 0; i < railPts.length; i += 2) {
    const a = railPts[Math.max(0, i - 1)];
    const b = railPts[Math.min(railPts.length - 1, i + 1)];
    const tie = k.box(0.62, 0.05, 0.1, '#7a5236');
    tie.position.set(railPts[i].x, 0.045, railPts[i].z);
    tie.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    tie.castShadow = false;
    root.add(tie);
  }
  // a purple bed under the track
  {
    const L = offsetLine(-0.42);
    const Rr = offsetLine(0.42);
    const pos = [];
    for (let i = 0; i < L.length - 1; i++) {
      const a = L[i];
      const b = Rr[i];
      const c = L[i + 1];
      const d = Rr[i + 1];
      pos.push(a.x, 0.025, a.z, b.x, 0.025, b.z, c.x, 0.025, c.z, b.x, 0.025, b.z, d.x, 0.025, d.z, c.x, 0.025, c.z);
    }
    const bed = new THREE.BufferGeometry();
    bed.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    bed.computeVertexNormals();
    // face it up whichever way the loop winds
    if (bed.attributes.normal.getY(0) < 0) {
      for (let i = 0; i < pos.length; i += 9) for (let j = 0; j < 3; j++) [pos[i + 3 + j], pos[i + 6 + j]] = [pos[i + 6 + j], pos[i + 3 + j]];
      bed.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      bed.computeVertexNormals();
    }
    root.add(mesh(bed, mat('#8f74c9', { rough: 0.85 }), { cast: false }));
  }

  const carMesh = inst(toGeo(carModel(k)), vcMat(0.6), 2, { cast: true });
  root.add(carMesh);
  dynamic.push(carMesh);
  const flapMesh = inst(toGeo(flapModel(k)), vcMat(0.7), 4, { cast: false });
  root.add(flapMesh);
  dynamic.push(flapMesh);
  const FLAPS = [];
  for (const x of [IN, OUT]) for (const s of [-1, 1]) FLAPS.push({ x: x + s * 0.55, door: x, s, open: 0 });
  // two little bats hanging on threads from the eave
  const BATS = [[G.x - 2.2, 0.3, 0.3], [G.x + 2.3, 0.38, -0.4]];
  for (const [x, len, tilt] of BATS) {
    const th = k.cyl(0.006, 0.006, len, '#5a4a52', 3);
    th.position.set(x, top - 0.1 - len / 2, CZ + run - 0.25);
    th.castShadow = false;
    root.add(th);
    const bat = batModel(k);
    bat.position.set(x, top - 0.12 - len, CZ + run - 0.25);
    bat.rotation.set(0.1, tilt, tilt * 0.3);
    root.add(bat);
  }

  const cars = [{ d: 0 }, { d: loop.length / 2 }];
  const st = { cars, ghost: { boo: 0, next: 6 }, loop, loveIn: 8 };
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const pC = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const zero = new THREE.Vector3();
  const Yax = new THREE.Vector3(0, 1, 0);
  const place = (t) => {
    cars.forEach((c, i) => {
      loop.at(c.d, pC);
      // hidden once it is all the way inside the house
      if (pC.z < FZ - 0.75) {
        carMesh.setMatrixAt(i, m4.compose(pC, q.identity(), zero));
        return;
      }
      loop.at(c.d + 0.3, pB);
      loop.at(c.d - 0.3, pA);
      const yaw = Math.atan2(pB.x - pA.x, pB.z - pA.z);
      e.set(0, yaw, Math.sin(t * 9 + i * 2) * 0.025);
      pC.y = 0.06 + Math.abs(Math.sin(t * 8 + i)) * 0.015;
      carMesh.setMatrixAt(i, m4.compose(pC, q.setFromEuler(e), one));
    });
    carMesh.instanceMatrix.needsUpdate = true;
  };
  const placeFlaps = () => {
    FLAPS.forEach((f, i) => {
      // the hinge is at the doorway's side; the panel reaches toward the middle and swings inward
      // In swings into the house, Out swings out toward the street
      const dir = f.door === IN ? 1 : -1;
      q.setFromAxisAngle(Yax, f.s > 0 ? Math.PI - dir * f.open * 1.3 : dir * f.open * 1.3);
      flapMesh.setMatrixAt(i, m4.compose(pA.set(f.x, BASE - 0.02, FZ + 0.12), q, one));
    });
    flapMesh.instanceMatrix.needsUpdate = true;
  };
  place(0);
  placeFlaps();

  // A little sign post by the queue at the front-left of the loop
  const QS = { x: IN - 0.85, z: LOOP_Z + LOOP_R + 0.15 };
  root.add(k.at(k.cyl(0.05, 0.06, 1.3, trimC, 8), QS.x, 0.65, QS.z));
  root.add(k.at(k.rbox(1.02, 0.5, 0.06, '#3b2b5f', 0.04), QS.x, 1.25, QS.z));
  board(0.96, 0.44, 240, 110, (c, w, h) => {
    c.fillStyle = '#fff4e3';
    roundRect(c, 4, 4, w - 8, h - 8, 18);
    c.fill();
    c.fillStyle = '#7a5aa6';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'No scary ghosts.', w / 2, h * 0.36, w * 0.86, 30, 700);
    fitText(c, 'Only cute ones.', w / 2, h * 0.68, w * 0.86, 30, 700);
  }, QS.x, 1.25, QS.z + 0.035);
  colliders.push(
    { type: 'circle', x: QS.x, z: QS.z, r: 0.1 },
    { type: 'box', x: G.x, z: CZ, hw: G.w / 2 + 0.15, hd: D / 2 + 0.15 },
    { type: 'circle', x: TW.x, z: TW.z, r: TW.r + 0.12 },
    { type: 'box', x: LC, z: (FZ + LOOP_Z + LOOP_R + 0.45) / 2, hw: LOOP_R + 0.45, hd: (LOOP_Z + LOOP_R + 0.45 - FZ) / 2 },
  );

  const me = new THREE.Vector3();
  return {
    debug: st,
    root,
    dynamic,
    colliders,
    hotspots: [
      {
        x: IN + 0.3,
        z: LOOP_Z + LOOP_R + 0.95,
        r: 1.5,
        label: 'Ride ghost train',
        icon: 'park-ghost',
        act: (a) => (a.hasArena('ghosttrain') ? a.playArena('ghosttrain', { me: a.playerId }) : a.toast('The ghosts are still tidying their house. Come back soon.', 2400)),
      },
    ],
    update(dt, t, people) {
      me.set(people[0].x, 0, people[0].z);
      const near = Math.max(0, 1 - Math.hypot(me.x - G.x, me.z - FZ) / 18);
      for (const c of cars) {
        const before = c.d;
        c.d = loop.wrap(c.d + 0.8 * dt);
        // a giggle and a friendly boo from inside as a car rolls in
        loop.at(before, pA);
        loop.at(c.d, pB);
        if (pA.x === IN && pA.z >= FZ - 0.05 && pB.z < FZ - 0.05 && near > 0.4 && Math.random() < 0.5) setTimeout(() => sfx.giggle(api.sound, 1200), 900);
      }
      place(t);
      // flap doors open as a car goes through
      for (const f of FLAPS) {
        let want = 0;
        for (const c of cars) {
          loop.at(c.d, pA);
          if (Math.abs(pA.x - f.door) < 0.1 && Math.abs(pA.z - FZ) < 0.75) want = 1;
        }
        if (want && f.open < 0.05 && f.s < 0 && near > 0.3) sfx.creak(api.sound, near);
        f.open += (want - f.open) * Math.min(1, dt * (want ? 7 : 3));
      }
      placeFlaps();
      // the ghost bobs and sways, waves, and now and then says boo
      const gs = st.ghost;
      st.loveIn -= dt;
      gs.next -= dt;
      if (gs.next <= 0) {
        gs.next = 9 + Math.random() * 7;
        gs.boo = 1.4;
        if (near > 0.25) sfx.boo(api.sound, near);
        // a little moment when the two of them are right by the house
        if (st.loveIn <= 0 && !api.activityRunning && Math.hypot(me.x - G.x, me.z - (FZ + 2.5)) < 4.5) {
          st.loveIn = 150;
          api.toast('Boo! The roof ghost waves hello. Roji squeezes Homama\u2019s hand, and he pretends he was not scared at all.', 3400);
          api.emote('roji', 'heart');
        }
      }
      gs.boo = Math.max(0, gs.boo - dt);
      const b = gs.boo > 0 ? Math.sin(((1.4 - gs.boo) / 1.4) * Math.PI) : 0;
      gh.position.y = GHP.y + 0.12 + Math.sin(t * 1.6) * 0.1 + b * 0.25;
      gh.rotation.set(Math.sin(t * 0.9) * 0.04, Math.sin(t * 0.5) * 0.25, Math.sin(t * 2.6) * 0.12);
      gh.scale.set(1 + b * 0.12, 1 + b * 0.18, 1 + b * 0.12);
    },
  };
}
