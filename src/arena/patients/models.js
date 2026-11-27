import * as THREE from 'three';
import { C } from '../../places/hospital/models.js';
import { canvasTexture, roundRect, FONT, umat, mat, mesh } from '../../util.js';

// 3D models for Dr. Roji's Shift that the hospital rooms do not have: the hands-on tools, the theatre
// furniture, the cute things that come out in surgery, and the get-well things in recovery.
// Every function takes the kit from places/hospital/models.js and returns a Group (base at y = 0).

const steel = { metal: 0.6, rough: 0.25 };

// ------------------------------------------------------------------ hand tools (about 0.2 m long, along +X)
export function hammer(k) {
  const g = new THREE.Group();
  const stick = k.cyl(0.009, 0.011, 0.2, C.steel, 10, steel);
  stick.rotation.z = Math.PI / 2;
  k.at(stick, 0.02, 0, 0);
  const head = k.cyl(0.035, 0.035, 0.03, C.rose, 3, { rough: 0.5 });
  head.rotation.set(Math.PI / 2, 0, 0);
  k.at(head, -0.085, 0, 0);
  const head2 = k.cyl(0.035, 0.035, 0.03, C.rose, 3, { rough: 0.5 });
  k.at(head2, -0.085, 0, 0);
  const cap = k.sph(0.012, C.steel, steel, 8);
  k.at(cap, 0.12, 0, 0);
  g.add(stick, head, head2, cap);
  return g;
}

export function scalpel(k) {
  const g = new THREE.Group();
  const handle = k.rbox(0.13, 0.022, 0.03, C.mintDeep, 0.01);
  k.at(handle, 0.05, 0, 0);
  const blade = k.rbox(0.05, 0.006, 0.024, C.steel, 0.003, steel);
  k.at(blade, -0.04, 0, 0);
  const tip = k.sph(0.012, C.steel, steel, 8);
  tip.scale.set(1, 0.25, 1);
  k.at(tip, -0.066, 0, 0);
  const dot = k.heart(0.018, 0.004, C.white);
  dot.rotation.x = -Math.PI / 2;
  k.at(dot, 0.07, 0.013, 0);
  g.add(handle, blade, tip, dot);
  return g;
}

export function needle(k, thread = '#3f7bf0') {
  const g = new THREE.Group();
  const n = k.tor(0.03, 0.004, C.steel, Math.PI * 1.1, steel, 14);
  n.rotation.x = Math.PI / 2;
  g.add(n);
  const holder = k.rbox(0.11, 0.016, 0.02, C.pink, 0.007);
  k.at(holder, 0.075, 0.0, 0);
  g.add(holder);
  const th = k.tor(0.04, 0.003, thread, Math.PI * 0.8, undefined, 12);
  th.rotation.set(Math.PI / 2, 0, 2.2);
  k.at(th, -0.02, 0, -0.03);
  g.add(th);
  return g;
}

export function syringe(k) {
  const g = new THREE.Group();
  const body = k.cyl(0.018, 0.018, 0.12, '#dff3ff', 14, { rough: 0.25 });
  body.rotation.z = Math.PI / 2;
  const juice = k.cyl(0.014, 0.014, 0.07, '#ffd166', 12, { rough: 0.4 });
  juice.rotation.z = Math.PI / 2;
  k.at(juice, -0.02, 0, 0);
  const rod = k.cyl(0.006, 0.006, 0.07, C.white, 6);
  rod.rotation.z = Math.PI / 2;
  k.at(rod, 0.09, 0, 0);
  const thumb = k.cyl(0.02, 0.02, 0.008, C.rose, 12);
  thumb.rotation.z = Math.PI / 2;
  k.at(thumb, 0.125, 0, 0);
  const tipc = k.cyl(0.006, 0.012, 0.016, '#dff3ff', 8);
  tipc.rotation.z = -Math.PI / 2;
  k.at(tipc, -0.068, 0, 0);
  const pin = k.cyl(0.0018, 0.0018, 0.03, C.steel, 4, steel);
  pin.rotation.z = Math.PI / 2;
  k.at(pin, -0.09, 0, 0);
  const heart = k.heart(0.02, 0.004, C.rose);
  k.at(heart, 0, 0, 0.019);
  g.add(body, juice, rod, thumb, tipc, pin, heart);
  return g;
}

export function swab(k) {
  const g = new THREE.Group();
  const stick = k.cyl(0.004, 0.004, 0.14, '#9fe0c8', 6);
  stick.rotation.z = Math.PI / 2;
  const tip = k.sph(0.016, '#ffffff', { rough: 0.95 }, 10);
  tip.scale.set(1.6, 1, 1);
  k.at(tip, -0.075, 0, 0);
  g.add(stick, tip);
  return g;
}

export function castRoll(k, color = '#ffffff') {
  const g = new THREE.Group();
  const roll = k.cyl(0.035, 0.035, 0.08, color, 18, { rough: 0.9 });
  roll.rotation.x = Math.PI / 2;
  const hole = k.cyl(0.012, 0.012, 0.082, '#e6d6c8', 10);
  hole.rotation.x = Math.PI / 2;
  g.add(roll, hole);
  return g;
}

// A sticky plaster (flat, along +X).
export function plaster(k, color = '#f4c7a1') {
  const g = new THREE.Group();
  const strip = k.rbox(0.12, 0.008, 0.045, color, 0.004);
  const pad = k.rbox(0.04, 0.01, 0.035, C.white, 0.004);
  k.at(pad, 0, 0.002, 0);
  const heart = k.heart(0.016, 0.003, C.rose);
  heart.rotation.x = -Math.PI / 2;
  k.at(heart, 0, 0.008, 0);
  g.add(strip, pad, heart);
  return g;
}

export function sticker(k, color = C.rose) {
  const g = new THREE.Group();
  const back = k.heart(0.05, 0.004, '#ffffff');
  back.rotation.x = -Math.PI / 2;
  back.scale.setScalar(1.18);
  const h = k.heart(0.05, 0.006, color);
  h.rotation.x = -Math.PI / 2;
  k.at(h, 0, 0.004, 0);
  g.add(back, h);
  return g;
}

// Measuring cup (0.09 m tall) with a liquid you can fill: g.userData.fill(k 0..1, color)
export function cup(k) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.1, 22, 1, true), umat('#e8f6ff', { rough: 0.15, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
  k.at(glass, 0, 0.05, 0);
  glass.renderOrder = 3;
  const base = k.cyl(0.04, 0.04, 0.006, '#e8f6ff', 18);
  k.at(base, 0, 0.003, 0);
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.039, 1, 18), umat('#ff8fb1', { rough: 0.3 }));
  liquid.scale.y = 0.001;
  liquid.visible = false;
  g.add(glass, base, liquid);
  for (let i = 1; i <= 4; i++) {
    const mark = k.box(0.02, 0.003, 0.004, C.ink);
    k.at(mark, 0, 0.012 + i * 0.019, 0.047);
    g.add(mark);
  }
  g.userData.fill = (f, color) => {
    liquid.visible = f > 0.01;
    liquid.scale.y = Math.max(0.001, f * 0.09);
    liquid.position.y = 0.006 + liquid.scale.y / 2;
    if (color) liquid.material.color.set(color);
  };
  return g;
}

// A medicine bottle with a label and a heart (0.17 m tall).
export function bottle(k, color = '#ff8fb1') {
  const g = new THREE.Group();
  const body = k.cyl(0.05, 0.055, 0.13, color, 18, { rough: 0.35 });
  k.at(body, 0, 0.065, 0);
  const neck = k.cyl(0.026, 0.04, 0.03, color, 14, { rough: 0.35 });
  k.at(neck, 0, 0.145, 0);
  const cap = k.cyl(0.03, 0.03, 0.035, C.white, 14);
  k.at(cap, 0, 0.175, 0);
  const label = k.cyl(0.057, 0.057, 0.055, C.white, 18);
  k.at(label, 0, 0.065, 0);
  const heart = k.heart(0.034, 0.008, C.rose);
  k.at(heart, 0, 0.065, 0.057);
  g.add(body, neck, cap, label, heart);
  return g;
}

// ------------------------------------------------------------------ cute things that come out in surgery
export function appendix(k) {
  const g = new THREE.Group();
  const body = k.cap(0.022, 0.05, '#ff9eb5', { rough: 0.55 });
  body.rotation.z = 0.9;
  g.add(body);
  for (const s of [-1, 1]) {
    const eye = k.box(0.012, 0.003, 0.003, C.ink);
    eye.rotation.z = 0.9;
    k.at(eye, s * 0.009 - 0.004, 0.006 + s * 0.006, 0.021);
    g.add(eye);
  }
  const blush = k.sph(0.006, '#ff6f8f', undefined, 6);
  k.at(blush, 0.012, -0.004, 0.019);
  g.add(blush);
  return g;
}

export function duck(k) {
  const g = new THREE.Group();
  const body = k.sph(0.035, '#ffd23f', { rough: 0.4 }, 14);
  body.scale.set(1.2, 0.85, 1);
  const head = k.sph(0.022, '#ffd23f', { rough: 0.4 }, 12);
  k.at(head, 0.028, 0.028, 0);
  const beak = k.sph(0.011, '#ff8a3d', undefined, 8);
  beak.scale.set(1.4, 0.6, 1);
  k.at(beak, 0.05, 0.026, 0);
  const tail = k.sph(0.012, '#ffd23f', undefined, 8);
  k.at(tail, -0.04, 0.012, 0);
  g.add(body, head, beak, tail);
  for (const s of [-1, 1]) {
    const eye = k.sph(0.004, C.ink, undefined, 6);
    k.at(eye, 0.038, 0.035, s * 0.013);
    g.add(eye);
  }
  return g;
}

export function splinterModel(k) {
  const g = new THREE.Group();
  const s = k.cyl(0.006, 0.0025, 0.12, '#b9865a', 6);
  s.rotation.z = Math.PI / 2;
  const s2 = k.cyl(0.0025, 0.0025, 0.03, '#8a5a3c', 5);
  s2.rotation.z = Math.PI / 2 + 0.4;
  k.at(s2, 0.03, 0.004, 0);
  g.add(s, s2);
  return g;
}

export function stone(k, i = 0) {
  const g = new THREE.Group();
  const geo = k.geo(`stone${i}`, () => {
    const gg = new THREE.IcosahedronGeometry(0.022, 1);
    const p = gg.attributes.position;
    for (let j = 0; j < p.count; j++) {
      const f = 1 + Math.sin(j * 1.7 + i) * 0.12;
      p.setXYZ(j, p.getX(j) * f, p.getY(j) * f * 0.8, p.getZ(j) * f);
    }
    gg.computeVertexNormals();
    return gg;
  });
  const m = mesh(geo, mat(['#a8b8d8', '#b9a8d8', '#9fc8d0'][i % 3], { rough: 0.35, flat: true }));
  const shine = k.sph(0.005, '#ffffff', { emissive: '#ffffff', ei: 0.8 }, 6);
  k.at(shine, -0.008, 0.012, 0.01);
  g.add(m, shine);
  return g;
}

export function whistle(k) {
  const g = new THREE.Group();
  const body = k.cyl(0.018, 0.018, 0.05, '#ffd166', 14, { metal: 0.3, rough: 0.3 });
  body.rotation.z = Math.PI / 2;
  const mouth = k.rbox(0.035, 0.016, 0.022, '#ffd166', 0.006, { metal: 0.3, rough: 0.3 });
  k.at(mouth, 0.035, 0.008, 0);
  const ring = k.tor(0.01, 0.003, C.rose, Math.PI * 2, undefined, 10);
  k.at(ring, -0.03, 0.012, 0);
  g.add(body, mouth, ring);
  return g;
}

export function surgeryItem(k, id, i = 0) {
  if (id === 'appendix') return appendix(k);
  if (id === 'duck') return duck(k);
  if (id === 'splinter') return splinterModel(k);
  if (id === 'whistle') return whistle(k);
  return stone(k, i);
}

// ------------------------------------------------------------------ theatre furniture
export function operatingTable(k) {
  const g = new THREE.Group();
  const top = k.rbox(1.95, 0.12, 0.72, C.mint, 0.05);
  k.at(top, 0, 0.78, 0);
  const pad = k.rbox(1.85, 0.06, 0.64, '#eefaf5', 0.03);
  k.at(pad, 0, 0.86, 0);
  const col = k.cyl(0.13, 0.16, 0.62, C.white, 16);
  k.at(col, 0, 0.4, 0);
  const foot = k.rbox(0.9, 0.08, 0.6, C.steel, 0.04, steel);
  k.at(foot, 0, 0.04, 0);
  const pillow = k.rbox(0.5, 0.1, 0.5, C.white, 0.05);
  k.at(pillow, -0.68, 0.93, 0);
  g.add(top, pad, col, foot, pillow);
  return g;
}

// The big round theatre lamp on an arm from the ceiling. heart: the heart-shaped unlock.
export function theatreLamp(k, { heart = false } = {}) {
  const g = new THREE.Group();
  const arm = k.cyl(0.04, 0.04, 1.0, C.white, 10);
  k.at(arm, 0, 0.5, 0);
  const joint = k.sph(0.08, C.white, undefined, 12);
  g.add(arm, joint);
  const head = new THREE.Group();
  if (heart) {
    const h = k.heart(0.55, 0.16, C.pink, { rough: 0.5 });
    h.rotation.x = Math.PI / 2;
    head.add(h);
  } else {
    const disc = k.cyl(0.52, 0.42, 0.16, C.white, 28);
    head.add(disc);
    const rim = k.tor(0.5, 0.04, C.mint, Math.PI * 2, undefined, 28);
    rim.rotation.x = Math.PI / 2;
    head.add(rim);
  }
  const glow = umat('#fff8e0', { emissive: '#fff2c4', ei: 1.0, rough: 0.4 });
  const spots = heart ? [[0, 0.02], [-0.16, 0.14], [0.16, 0.14], [0, 0.24]] : [[0, 0], [0.22, 0], [-0.22, 0], [0, 0.22], [0, -0.22], [0.16, 0.16], [-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16]];
  const bulbGeo = new THREE.SphereGeometry(0.07, 12, 8);
  for (const [x, z] of spots) {
    const b = new THREE.Mesh(bulbGeo, glow);
    b.scale.y = 0.4;
    b.position.set(x, -0.08, heart ? z - 0.12 : z);
    head.add(b);
  }
  head.position.y = -0.12;
  g.add(head);
  g.userData.glow = glow;
  return g;
}

// A heart monitor on a wheeled stand. Its screen is a canvas the game redraws: userData.screen = { canvas, tex }.
export function monitor(k) {
  const g = new THREE.Group();
  const pole = k.cyl(0.025, 0.025, 1.1, C.steel, 8, steel);
  k.at(pole, 0, 0.6, 0);
  const base = k.cyl(0.25, 0.25, 0.05, C.white, 16);
  k.at(base, 0, 0.05, 0);
  for (let i = 0; i < 4; i++) {
    const w = k.sph(0.04, C.ink, undefined, 8);
    k.at(w, Math.cos(i * 1.57) * 0.22, 0.03, Math.sin(i * 1.57) * 0.22);
    g.add(w);
  }
  const box = k.rbox(0.66, 0.5, 0.16, C.white, 0.06);
  k.at(box, 0, 1.38, 0);
  const bezel = k.rbox(0.58, 0.4, 0.04, C.mintDeep, 0.03);
  k.at(bezel, 0, 1.39, 0.07);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 340;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.36), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  k.at(screen, 0, 1.39, 0.092);
  const heart = k.heart(0.05, 0.02, C.rose);
  k.at(heart, 0.24, 1.6, 0.06);
  g.add(pole, base, box, bezel, screen, heart);
  g.userData.screen = { canvas, tex, mesh: screen };
  return g;
}

export function anaesthesia(k) {
  const g = new THREE.Group();
  const cart = k.rbox(0.5, 0.9, 0.45, C.lilac, 0.06);
  k.at(cart, 0, 0.5, 0);
  const top = k.rbox(0.54, 0.06, 0.5, C.white, 0.03);
  k.at(top, 0, 0.98, 0);
  g.add(cart, top);
  for (const [x, c] of [[-0.12, C.sun], [0.12, C.mint]]) {
    const dial = k.cyl(0.07, 0.07, 0.03, C.white, 16);
    dial.rotation.x = Math.PI / 2;
    k.at(dial, x, 0.72, 0.23);
    const needle = k.box(0.008, 0.05, 0.01, c);
    k.at(needle, x, 0.73, 0.25);
    needle.rotation.z = 0.5;
    g.add(dial, needle);
  }
  const bag = k.sph(0.09, '#8fd3ff', { rough: 0.5 }, 12);
  bag.scale.set(1, 1.3, 0.8);
  k.at(bag, 0.18, 1.16, 0);
  const drawer = k.rbox(0.42, 0.14, 0.02, C.white, 0.02);
  k.at(drawer, 0, 0.4, 0.23);
  g.add(bag, drawer);
  return g;
}

// A soft mask the sleepy patient wears (0.12 m), facing +Z. Add it to the kid's head.
export function sleepMask(k) {
  const g = new THREE.Group();
  const dome = k.sph(0.08, '#bfe8ff', { rough: 0.3 }, 14);
  dome.scale.set(1, 0.85, 0.6);
  const rim = k.tor(0.075, 0.012, C.mintDeep, Math.PI * 2, undefined, 18);
  g.add(dome, rim);
  const tube = k.cyl(0.018, 0.018, 0.22, C.mint, 8);
  tube.rotation.x = Math.PI / 2;
  k.at(tube, 0, 0, 0.13);
  g.add(tube);
  return g;
}

export function scrubSink(k) {
  const g = new THREE.Group();
  const cab = k.rbox(1.3, 0.85, 0.55, C.white, 0.05);
  k.at(cab, 0, 0.43, 0);
  const basin = k.rbox(1.1, 0.12, 0.45, C.steel, 0.04, steel);
  k.at(basin, 0, 0.9, 0);
  const inner = k.box(0.95, 0.02, 0.32, '#a9b7c6');
  k.at(inner, 0, 0.955, 0);
  const tap = k.tor(0.12, 0.022, C.steel, Math.PI, steel);
  tap.rotation.y = Math.PI / 2;
  k.at(tap, 0, 1.0, -0.15);
  const soap = k.rbox(0.12, 0.2, 0.1, C.pink, 0.04);
  k.at(soap, 0.42, 1.05, -0.12);
  const pump = k.cyl(0.015, 0.015, 0.06, C.white, 6);
  k.at(pump, 0.42, 1.18, -0.12);
  g.add(cab, basin, inner, tap, soap, pump);
  return g;
}

export function ivStand(k) {
  const g = new THREE.Group();
  const pole = k.cyl(0.02, 0.02, 1.8, C.steel, 8, steel);
  k.at(pole, 0, 0.9, 0);
  const hook = k.tor(0.12, 0.012, C.steel, Math.PI, steel);
  k.at(hook, 0, 1.8, 0);
  const bag = k.rbox(0.16, 0.24, 0.05, '#d8f3ff', 0.04);
  k.at(bag, 0.12, 1.6, 0);
  const heart = k.heart(0.05, 0.01, C.rose);
  k.at(heart, 0.12, 1.6, 0.03);
  const base = k.cyl(0.22, 0.22, 0.04, C.white, 12);
  k.at(base, 0, 0.03, 0);
  g.add(pole, hook, bag, heart, base);
  return g;
}

export function trolley(k) {
  const g = new THREE.Group();
  const top = k.rbox(0.9, 0.05, 0.5, C.steel, 0.02, steel);
  k.at(top, 0, 0.88, 0);
  const cloth = k.rbox(0.82, 0.012, 0.44, C.mint, 0.005);
  k.at(cloth, 0, 0.912, 0);
  const low = k.rbox(0.86, 0.04, 0.46, C.white, 0.02);
  k.at(low, 0, 0.3, 0);
  g.add(top, cloth, low);
  for (const [x, z] of [[-0.4, -0.2], [0.4, -0.2], [-0.4, 0.2], [0.4, 0.2]]) {
    const leg = k.cyl(0.015, 0.015, 0.86, C.steel, 6, steel);
    k.at(leg, x, 0.45, z);
    const w = k.sph(0.035, C.ink, undefined, 8);
    k.at(w, x, 0.03, z);
    g.add(leg, w);
  }
  return g;
}

// X-ray lightbox on the wall: userData.screen = { canvas, tex, mesh } (0.9 x 0.7 m).
export function lightbox(k) {
  const g = new THREE.Group();
  const frame = k.rbox(1.06, 0.86, 0.1, C.white, 0.04);
  g.add(frame);
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 500;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.72), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  k.at(screen, 0, 0, 0.056);
  const clip = k.rbox(0.2, 0.05, 0.03, C.mintDeep, 0.015);
  k.at(clip, 0, 0.37, 0.07);
  g.add(screen, clip);
  g.userData.screen = { canvas, tex, mesh: screen };
  return g;
}

// A tall staff locker (0.6 x 1.9 m) with vents and a handle, facing +Z.
export function locker(k, color = C.mint) {
  const g = new THREE.Group();
  const body = k.rbox(0.62, 1.9, 0.5, color, 0.04);
  k.at(body, 0, 0.95, 0);
  const door = k.rbox(0.54, 1.8, 0.03, '#a6e6d3', 0.02);
  k.at(door, 0, 0.95, 0.255);
  for (let i = 0; i < 4; i++) {
    const v = k.box(0.3, 0.02, 0.01, '#5fb8a2');
    k.at(v, 0, 1.6 + i * 0.05, 0.272);
    g.add(v);
  }
  const handle = k.rbox(0.03, 0.16, 0.03, C.steel, 0.01, steel);
  k.at(handle, 0.2, 1.0, 0.28);
  g.add(body, door, handle);
  return g;
}

// ------------------------------------------------------------------ cards, signs, balloons
export function note(k, lines, { w = 0.22, h = 0.22, color = '#fff3a8', ink = C.ink } = {}) {
  return k.panel(w, h, 256, (c, W, H) => {
    c.fillStyle = color;
    c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(0,0,0,0.06)';
    c.fillRect(0, 0, W, H * 0.12);
    c.fillStyle = ink;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    lines.forEach((ln, i) => {
      c.font = `600 ${Math.round(H * (i === 0 ? 0.15 : 0.13))}px ${FONT}`;
      c.fillText(ln, W / 2, H * (0.36 + i * 0.2), W * 0.9);
    });
    c.fillStyle = C.rose;
    c.save();
    c.translate(W * 0.5, H * 0.82);
    c.scale(H * 0.0016, H * 0.0016);
    heartPath(c);
    c.fill();
    c.restore();
  });
}

function heartPath(c) {
  c.beginPath();
  c.moveTo(0, 30);
  c.bezierCurveTo(-60, -10, -30, -60, 0, -28);
  c.bezierCurveTo(30, -60, 60, -10, 0, 30);
  c.closePath();
}

// A board on a stick with big words, held up (board centre about 0.55 m above the hands).
export function sign(k, text, { color = C.rose } = {}) {
  const g = new THREE.Group();
  const stick = k.cyl(0.015, 0.015, 0.6, C.woodDark, 6);
  k.at(stick, 0, 0.25, 0);
  const board = k.panel(0.7, 0.36, 512, (c, W, H) => {
    c.fillStyle = '#fffaf2';
    roundRect(c, 4, 4, W - 8, H - 8, 40);
    c.fill();
    c.lineWidth = 14;
    c.strokeStyle = color;
    c.stroke();
    c.fillStyle = color;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 ${Math.round(H * 0.36)}px ${FONT}`;
    c.fillText(text, W / 2, H * 0.48, W * 0.86);
    c.save();
    c.translate(W * 0.88, H * 0.2);
    c.scale(0.5, 0.5);
    heartPath(c);
    c.fill();
    c.restore();
  });
  k.at(board, 0, 0.62, 0.02);
  g.add(stick, board);
  return g;
}

export function card(k, lines = ['Get well', 'soon!']) {
  const g = new THREE.Group();
  const back = k.panel(0.24, 0.3, 256, (c, W, H) => {
    c.fillStyle = '#ffe3ec';
    c.fillRect(0, 0, W, H);
    c.fillStyle = C.rose;
    for (let i = 0; i < 6; i++) {
      c.save();
      c.translate(W * (0.15 + (i % 3) * 0.35), H * (0.12 + Math.floor(i / 3) * 0.78));
      c.scale(0.25, 0.25);
      heartPath(c);
      c.fill();
      c.restore();
    }
    c.fillStyle = C.ink;
    c.textAlign = 'center';
    c.font = `700 ${Math.round(H * 0.12)}px ${FONT}`;
    lines.forEach((ln, i) => c.fillText(ln, W / 2, H * (0.45 + i * 0.16), W * 0.9));
  });
  back.position.y = 0.15;
  back.rotation.x = -0.12;
  const stand = k.box(0.24, 0.3, 0.01, '#ffc9d6');
  stand.position.set(0, 0.15, -0.06);
  stand.rotation.x = 0.35;
  g.add(back, stand);
  return g;
}

// A balloon on a string (string 1.0 m long, balloon on top). Returns { root, ball }.
export function balloon(k, color = C.pink) {
  const root = new THREE.Group();
  const ball = new THREE.Group();
  const b = k.sph(0.16, color, { rough: 0.3 }, 16);
  b.scale.set(1, 1.15, 1);
  const knot = k.cyl(0.02, 0.006, 0.04, color, 6);
  k.at(knot, 0, -0.19, 0);
  const shine = k.sph(0.035, '#ffffff', { emissive: '#ffffff', ei: 0.5 }, 8);
  k.at(shine, -0.06, 0.07, 0.11);
  ball.add(b, knot, shine);
  ball.position.y = 1.0;
  const str = k.cyl(0.003, 0.003, 0.82, '#ffffff', 4);
  k.at(str, 0, 0.6, 0);
  root.add(str, ball);
  return { root, ball };
}

// The "Doctor of the week" plaque (0.7 x 0.5 m), facing +Z.
export function plaque(k, count = 1) {
  const g = new THREE.Group();
  const wood = k.rbox(0.74, 0.56, 0.05, C.woodDark, 0.04);
  const face = k.panel(0.64, 0.46, 512, (c, W, H) => {
    const gr = c.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#ffe9a8');
    gr.addColorStop(1, '#f4c24f');
    c.fillStyle = gr;
    roundRect(c, 0, 0, W, H, 30);
    c.fill();
    c.strokeStyle = '#c9921e';
    c.lineWidth = 8;
    c.stroke();
    c.fillStyle = '#7a4a1a';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 ${Math.round(H * 0.11)}px ${FONT}`;
    c.fillText('Doctor of the week', W / 2, H * 0.2);
    c.font = `700 ${Math.round(H * 0.2)}px ${FONT}`;
    c.fillText('Dr. Roji', W / 2, H * 0.47);
    c.font = `500 ${Math.round(H * 0.09)}px ${FONT}`;
    c.fillText(count > 1 ? `${count} times and counting` : 'Sunny Hill Hospital', W / 2, H * 0.73);
    c.fillStyle = C.rose;
    c.save();
    c.translate(W * 0.5, H * 0.88);
    c.scale(0.4, 0.4);
    heartPath(c);
    c.fill();
    c.restore();
  }, { rough: 0.4 });
  k.at(face, 0, 0, 0.03);
  g.add(wood, face);
  return g;
}

// Surgical cap, mask and gown for a kid (added to kid.head and kid.body). Returns the parts to remove later.
export function gownUp(k, kid, color = '#8fd3ff') {
  const HC = new THREE.Vector3(0, 0.29, 0);
  const capM = umat(color, { rough: 0.85 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.315, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.46), capM);
  cap.position.copy(HC).add(new THREE.Vector3(0, 0.03, -0.01));
  const maskM = umat('#e7f7ff', { rough: 0.8 });
  const mask = new THREE.Mesh(new THREE.SphereGeometry(0.312, 18, 8, Math.PI / 2 - 0.8, 1.6, Math.PI * 0.54, Math.PI * 0.2), maskM);
  mask.position.copy(HC);
  mask.position.z += 0.006;
  const gown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.27, 0.42, 16, 1, true), umat(color, { rough: 0.85, side: THREE.DoubleSide }));
  gown.position.set(0, 0.52, 0);
  kid.head.add(cap, mask);
  kid.body.add(gown);
  return [cap, mask, gown];
}
