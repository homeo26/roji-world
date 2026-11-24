import { THREE, mat, umat, mesh, box, rbox, cyl, sph, tor, at, rot, canvasTexture, heartGeo, starGeo, glowTex, sprite, roundRect, FONT, bake } from './kit.js';
import { L } from './shell.js';
import { STOPS } from '../../config.js';
import { easeOutBack } from '../../util.js';

// The porch with the front door, the front hall (coats, shoes, a jar of love notes) and the long
// hallway with the photo wall of their weekends. Interior coordinates.

const P = Math.PI;
const STAMPS = 'roji-weekends-stamps-v1';

const NOTES_FROM_HOMAMA = [
  'You are my favourite hello and my hardest goodbye.',
  'I saved you the last cookie. Okay, half of it.',
  'Thank you for taking care of everyone. Let me take care of you.',
  'Your laugh is my favourite sound in the whole world.',
  'Dr. Roji, you healed my heart a long time ago.',
  'I love you more than coffee. Do not tell the coffee.',
  'Every weekend with you is my favourite weekend.',
  'You looked so pretty this morning. And every morning.',
  'I would fix every bug in the world just to see you smile.',
  'Come home soon. Mishmish and I miss you.',
  'You are the best thing that ever happened to me.',
  'I made the cocoa. It is waiting for you.',
];
const NOTES_FROM_ROJI = [
  'Thank you for always believing in me.',
  'You make every ordinary day feel special.',
  'My favourite place is next to you.',
  'You give the best hugs on the whole island.',
  'Your code may have bugs, but your heart has none.',
  'I love the way you listen to me.',
  'Thank you for the cocoa. And for everything.',
  'You are my safe place, Homama.',
  'Every night I am happy to come home to you.',
  'I love you more than all the pecan cake in the world.',
];
const MEMORIES = {
  cinema: 'Cinema night. Roji ate most of the popcorn, and Homama let her.',
  horse: 'Horse riding. Homama pretended he was not scared of the big pony.',
  fencing: 'Fencing. Roji won the first point and never let him forget it.',
  boardgames: 'Board games. The winner picked dessert. It was pecan cake. Again.',
  clay: 'Clay at the café. Two wobbly mugs, made with love.',
  drawing: 'Drawing day. Homama drew Roji as a princess doctor.',
};

// A small painted photo of one weekend (or a blank one still to take)
function drawPhoto(ctx, x0, y0, w, h, id, taken) {
  ctx.save();
  ctx.translate(x0, y0);
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  if (!taken) {
    ctx.fillStyle = '#fbf4ec';
    ctx.fillRect(0, 0, w, h);
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = '#e8b7c2';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.72);
    ctx.bezierCurveTo(w * 0.18, h * 0.46, w * 0.3, h * 0.16, w / 2, h * 0.36);
    ctx.bezierCurveTo(w * 0.7, h * 0.16, w * 0.82, h * 0.46, w / 2, h * 0.72);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#c98a98';
    ctx.font = `600 ${Math.round(h * 0.13)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('soon', w / 2, h * 0.9);
    ctx.restore();
    return;
  }
  const sky = { cinema: ['#2a2f62', '#5a4a8a'], horse: ['#8fd3ff', '#e7f7ff'], fencing: ['#fff1e0', '#ffe1d2'], boardgames: ['#f3e6fb', '#e6d2f5'], clay: ['#ffe9d6', '#ffd7b8'], drawing: ['#fff7d6', '#ffe9a8'] }[id] || ['#ffffff', '#eeeeee'];
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, sky[0]);
  g.addColorStop(1, sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // The scene behind the two of them
  if (id === 'cinema') {
    ctx.fillStyle = '#f4f1ff';
    ctx.fillRect(w * 0.12, h * 0.1, w * 0.76, h * 0.34);
    ctx.fillStyle = '#e5484d';
    ctx.fillRect(w * 0.06, h * 0.72, w * 0.88, h * 0.3);
  } else if (id === 'horse') {
    ctx.fillStyle = '#8fd36b';
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
    ctx.fillStyle = '#c9772f';
    ctx.beginPath();
    ctx.ellipse(w * 0.72, h * 0.58, w * 0.16, h * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(w * 0.6, h * 0.6, w * 0.04, h * 0.18);
    ctx.fillRect(w * 0.8, h * 0.6, w * 0.04, h * 0.18);
    ctx.beginPath();
    ctx.ellipse(w * 0.88, h * 0.46, w * 0.06, h * 0.07, 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'fencing') {
    ctx.strokeStyle = '#8d96a3';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(w * 0.18, h * 0.3);
    ctx.lineTo(w * 0.5, h * 0.55);
    ctx.moveTo(w * 0.82, h * 0.3);
    ctx.lineTo(w * 0.5, h * 0.55);
    ctx.stroke();
  } else if (id === 'boardgames') {
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, w * 0.42, h * 0.2, w * 0.16, w * 0.16, 6);
    ctx.fill();
    ctx.fillStyle = '#3b2b3f';
    for (const [dx, dy] of [[0.46, 0.25], [0.54, 0.33], [0.5, 0.29]]) {
      ctx.beginPath();
      ctx.arc(w * dx, h * dy + w * 0.02, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'clay') {
    ctx.fillStyle = '#d9734e';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.3, w * 0.09, h * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(w * 0.45, h * 0.12, w * 0.1, h * 0.06);
  } else if (id === 'drawing') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w * 0.38, h * 0.1, w * 0.24, h * 0.3);
    ctx.fillStyle = '#ff8fb1';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.25, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  // Roji (pink) and Homama (blue), with a heart between them
  const kid = (x, top, hair, girl) => {
    ctx.fillStyle = top;
    ctx.beginPath();
    if (girl) {
      ctx.moveTo(x - w * 0.09, h * 0.86);
      ctx.lineTo(x + w * 0.09, h * 0.86);
      ctx.lineTo(x + w * 0.04, h * 0.6);
      ctx.lineTo(x - w * 0.04, h * 0.6);
    } else roundRect(ctx, x - w * 0.06, h * 0.6, w * 0.12, h * 0.26, 6);
    ctx.fill();
    ctx.fillStyle = '#ffd9c2';
    ctx.beginPath();
    ctx.arc(x, h * 0.5, w * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(x, h * 0.47, w * 0.083, Math.PI, 0);
    ctx.fill();
    if (girl) {
      ctx.beginPath();
      ctx.arc(x - w * 0.085, h * 0.53, w * 0.03, 0, Math.PI * 2);
      ctx.arc(x + w * 0.085, h * 0.53, w * 0.03, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#3b2b3f';
    ctx.fillRect(x - w * 0.03, h * 0.5, 3, 4);
    ctx.fillRect(x + w * 0.02, h * 0.5, 3, 4);
  };
  kid(w * 0.34, '#ef5b6f', '#4a2a1a', true);
  kid(w * 0.62, '#3f7bf0', '#1d130f', false);
  ctx.fillStyle = '#ff6b8a';
  const hx = w * 0.48;
  const hy = h * 0.36;
  ctx.beginPath();
  ctx.moveTo(hx, hy + 7);
  ctx.bezierCurveTo(hx - 11, hy - 1, hx - 7, hy - 10, hx, hy - 4);
  ctx.bezierCurveTo(hx + 7, hy - 10, hx + 11, hy - 1, hx, hy + 7);
  ctx.fill();
  ctx.restore();
}

export function buildHall(R) {
  const { add, api } = R;
  const st = { jar: 0, photo: -1, look: 0 };
  const wood = mat('#c98f5f', { rough: 0.75 });
  const white = mat('#ffffff', { rough: 0.6 });
  const brass = mat('#f4c24f', { metal: 0.5, rough: 0.35 });
  const hallDecor = R.walls['z2-hall'].decor;
  const porchDecor = R.walls.z3.decor;
  const hallwayDecor = (x) => (x < L.X1 ? R.walls['z1-bedroom'] : x < L.X2 ? R.walls['z1-bathroom'] : x < L.X3 ? R.walls['z1-study'] : R.walls['z1-sunroom']).decor;
  const ZH = L.Z1 + L.T / 2; // hallway face of the back-room wall
  const ZR = L.Z2 + L.T / 2; // front rooms' face of the hallway wall

  // ================================================================ porch
  // The porch sits between the living room and the kitchen: steps at the front, a lantern, the house
  // number and the name sign by the door
  const PXC = -0.1; // door centre
  add(at(rbox(2.0, 0.06, 0.24, '#d6a473', 0.02), PXC, 0.03, 9.0));
  // Little posts with a garland at the porch front
  for (const s of [-1, 1]) {
    add(at(box(0.12, 1.0, 0.12, white), PXC + s * 2.12, 0.5, 8.95));
    add(at(sph(0.08, white, undefined, 8), PXC + s * 2.12, 1.05, 8.95));
  }
  R.col({ type: 'circle', x: PXC - 2.12, z: 8.95, r: 0.1 }, { type: 'circle', x: PXC + 2.12, z: 8.95, r: 0.1 });
  // Welcome mat and two flower pots beside the door
  const welcome = (ctx, w, h) => {
    ctx.fillStyle = '#c67a3e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e9a86a';
    ctx.fillRect(9, 9, w - 18, h - 18);
    ctx.fillStyle = '#6b3d1f';
    ctx.font = `600 ${Math.round(h * 0.42)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Welcome home', w / 2, h / 2 + 3);
  };
  const wm = add(R.atlas.panel(1.25, 0.55, 300, 128, welcome));
  wm.rotation.x = -P / 2;
  wm.position.set(PXC, 0.012, 5.65);
  for (const [x, c] of [[PXC - 1.35, '#ff8fb1'], [PXC + 1.25, '#ffd75e']]) {
    add(at(cyl(0.22, 0.16, 0.36, '#e07a55', 12), x, 0.18, 5.45));
    add(at(cyl(0.23, 0.23, 0.05, '#c9653f', 12), x, 0.36, 5.45));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * P * 2;
      add(at(sph(0.1, k % 2 ? '#5aa84f' : '#76c25c', { rough: 0.85 }, 8), x + Math.cos(a) * 0.12, 0.5 + (k % 3) * 0.05, 5.45 + Math.sin(a) * 0.1));
      add(at(sph(0.05, k % 2 ? c : '#ffffff', undefined, 8), x + Math.cos(a + 0.5) * 0.1, 0.62 + (k % 2) * 0.05, 5.45 + Math.sin(a + 0.5) * 0.08));
    }
    R.col({ type: 'circle', x, z: 5.45, r: 0.24 });
  }
  // Porch bench with cushions against the living room wall
  const bx = L.XA + 0.4;
  const bz = 7.6;
  add(at(rbox(0.5, 0.07, 1.4, wood, 0.02), bx, 0.44, bz));
  add(at(rbox(0.06, 0.45, 1.4, wood, 0.02), bx - 0.24, 0.72, bz));
  for (const s of [-1, 1]) add(at(box(0.44, 0.42, 0.06, '#8d5a3a'), bx, 0.21, bz + s * 0.62));
  add(at(rbox(0.4, 0.08, 0.5, '#ff9eb5', 0.04), bx + 0.02, 0.51, bz - 0.3));
  add(at(rbox(0.4, 0.08, 0.5, '#9fd6e3', 0.04), bx + 0.02, 0.51, bz + 0.3));
  R.col({ type: 'box', x: bx, z: bz, hw: 0.27, hd: 0.72, h: 0.48 });
  // Watering can by the bench
  const can = new THREE.Group();
  can.add(at(cyl(0.12, 0.13, 0.22, '#63c7ba', 12), 0, 0.11, 0));
  can.add(rot(at(cyl(0.018, 0.026, 0.3, '#63c7ba', 8), 0.17, 0.19, 0), 0, 0, -1.0));
  can.add(rot(at(tor(0.08, 0.018, '#63c7ba', undefined, P, 6, 10), 0, 0.24, 0), 0, P / 2, 0));
  can.position.set(L.XA + 0.4, 0, 8.65);
  can.rotation.y = 0.8;
  add(can);
  // Umbrella stand by the kitchen wall
  add(at(cyl(0.16, 0.14, 0.5, '#63c7ba', 12), L.XB - 0.3, 0.25, 6.3));
  for (const [dx, c] of [[-0.05, '#ff8fb1'], [0.05, '#3f7bf0']]) {
    add(rot(at(cyl(0.035, 0.012, 0.8, c, 8), L.XB - 0.3 + dx, 0.55, 6.3), 0, 0, dx * 2));
    add(at(tor(0.04, 0.01, '#8d5a3a', undefined, P, 4, 8), L.XB - 0.3 + dx * 2, 0.98, 6.3));
  }
  R.col({ type: 'circle', x: L.XB - 0.3, z: 6.3, r: 0.2 });

  // The front of the house around the front door (on the porch side of the front wall)
  const ZP = L.Z3 + L.T / 2;
  const pd = (o) => (porchDecor.add(o), o);
  // Window with a flower box, left of the door
  R.windowAt(PXC - 1.62, 1.65, 0.7, 0.85, '#ff9eb5', { z: ZP - 0.02, parent: porchDecor });
  pd(at(rbox(0.95, 0.2, 0.26, wood, 0.03), PXC - 1.62, 1.0, ZP + 0.14));
  for (let k = 0; k < 6; k++) pd(at(sph(0.06, ['#ff8fb1', '#ffffff', '#ffd75e', '#ff6b6b'][k % 4], undefined, 8), PXC - 1.97 + k * 0.14, 1.15 + (k % 2) * 0.03, ZP + 0.16));
  // The name sign over the door
  const sign = (ctx, w, h) => {
    ctx.fillStyle = '#c98f5f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff6e6';
    roundRect(ctx, 16, 16, w - 32, h - 32, 22);
    ctx.fill();
    ctx.fillStyle = '#ef5b6f';
    ctx.font = `600 ${Math.round(h * 0.44)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Roji and Homama', w / 2, h / 2 + 4);
  };
  pd(at(rbox(1.9, 0.42, 0.05, wood, 0.03), PXC, 2.78, ZP + 0.03));
  pd(at(R.atlas.panel(1.82, 0.36, 512, 104, sign), PXC, 2.78, ZP + 0.06));
  for (const s of [-1, 1]) pd(at(mesh(heartGeo(0.14, 0.03), mat('#ef5b6f')), PXC + s * 1.0, 2.78, ZP + 0.07));
  // House number 14 (their favourite day) under the porch light
  const num = (ctx, w, h) => {
    ctx.fillStyle = '#f4c24f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2c3e66';
    roundRect(ctx, 5, 5, w - 10, h - 10, 14);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(h * 0.6)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('14', w / 2, h / 2 + 4);
  };
  pd(at(R.atlas.panel(0.36, 0.3, 120, 100, num), PXC + 1.75, 1.45, ZP + 0.03));
  // Porch lantern: brass bracket, warm glass and a soft glow
  pd(at(box(0.05, 0.05, 0.24, brass), PXC + 1.2, 2.12, ZP + 0.1));
  const lamp = umat('#fff1c9', { emissive: '#ffc977', ei: 1.5, rough: 0.5 });
  pd(at(rbox(0.2, 0.28, 0.2, lamp, 0.05), PXC + 1.2, 1.96, ZP + 0.26));
  pd(rot(at(cyl(0.0, 0.16, 0.12, brass, 4), PXC + 1.2, 2.16, ZP + 0.26), 0, P / 4, 0));
  pd(rot(at(cyl(0.12, 0.12, 0.03, brass, 4), PXC + 1.2, 1.81, ZP + 0.26), 0, P / 4, 0));
  const halo = R.dyn(sprite(glowTex(), { color: '#ffd38a', opacity: 0.55, scale: 1.1 }));
  halo.position.set(PXC + 1.2, 1.96, ZP + 0.3);
  porchDecor.add(halo);

  // ================================================================ front hall
  // Coat hooks by the hallway door: Roji's coat, Homama's hoodie, her stethoscope next to his headphones
  const hd = (o) => (hallDecor.add(o), o);
  const HX0 = L.XA + 0.12; // left end of the coat rack
  hd(at(rbox(1.2, 0.12, 0.05, wood, 0.02), HX0 + 0.55, 1.82, ZR + 0.03));
  for (let k = 0; k < 4; k++) {
    const x = HX0 + 0.1 + k * 0.3;
    hd(rot(at(cyl(0.015, 0.015, 0.12, brass, 6), x, 1.78, ZR + 0.1), P / 2 - 0.4, 0, 0));
    hd(at(sph(0.025, brass, undefined, 8), x, 1.8, ZR + 0.15));
  }
  // Roji's pink coat
  hd(at(mesh(new THREE.CylinderGeometry(0.08, 0.2, 0.7, 12).scale(1, 1, 0.45), mat('#ff9eb5', { rough: 0.8 })), HX0 + 0.1, 1.42, ZR + 0.14));
  hd(at(box(0.04, 0.5, 0.01, '#ffffff'), HX0 + 0.1, 1.4, ZR + 0.23));
  // Stethoscope, hanging next to...
  hd(rot(at(tor(0.1, 0.012, '#3b3542', undefined, P * 1.5, 6, 20), HX0 + 0.4, 1.66, ZR + 0.12), 0, 0, P * 0.75));
  hd(at(cyl(0.035, 0.035, 0.02, mat('#cfd8e3', { metal: 0.5, rough: 0.3 }), 12), HX0 + 0.4, 1.45, ZR + 0.12)).rotation.x = P / 2;
  hd(at(box(0.008, 0.2, 0.008, '#3b3542'), HX0 + 0.4, 1.53, ZR + 0.12));
  // ...Homama's headphones
  hd(at(tor(0.1, 0.018, '#2c3e66', undefined, P, 6, 16), HX0 + 0.7, 1.66, ZR + 0.12));
  for (const s of [-1, 1]) hd(at(rbox(0.07, 0.1, 0.05, '#3f7bf0', 0.02), HX0 + 0.7 + s * 0.1, 1.64, ZR + 0.12));
  // Homama's blue hoodie
  hd(at(rbox(0.32, 0.6, 0.1, '#3f7bf0', 0.05), HX0 + 1.0, 1.42, ZR + 0.13));
  hd(at(sph(0.1, '#3f7bf0', undefined, 10), HX0 + 1.0, 1.74, ZR + 0.12)).scale.set(1.2, 0.8, 0.6);
  // Slim console with the jar of love notes, a key bowl and a little vase
  const CX0 = HX0 + 0.6;
  add(at(rbox(1.2, 0.05, 0.32, wood, 0.02), CX0, 0.84, ZR + 0.2));
  for (const dx of [-0.54, 0.54]) for (const dz of [-0.11, 0.11]) add(at(cyl(0.025, 0.02, 0.82, '#8d5a3a', 6), CX0 + dx, 0.41, ZR + 0.2 + dz));
  R.col({ type: 'box', x: CX0, z: ZR + 0.2, hw: 0.62, hd: 0.18, h: 0.86 });
  const jarGlass = mat('#e8f6ff', { rough: 0.12 });
  const JX = CX0 - 0.27;
  add(at(cyl(0.11, 0.1, 0.24, jarGlass, 14), JX, 0.99, ZR + 0.2));
  const notes = new THREE.Group();
  for (let k = 0; k < 9; k++) notes.add(rot(at(box(0.05, 0.03, 0.05, ['#ff9eb5', '#fff1a8', '#ffffff', '#c7a6ff', '#9fd6e3'][k % 5]), Math.cos(k * 2.1) * 0.05, 0.03 + (k % 3) * 0.045, Math.sin(k * 2.1) * 0.05), k, k * 0.7, 0));
  notes.position.set(JX, 0.88, ZR + 0.2);
  add(notes);
  const lid = R.dyn(new THREE.Group());
  lid.add(at(cyl(0.12, 0.12, 0.04, '#ef5b6f', 14), 0, 0, 0), at(mesh(heartGeo(0.07, 0.02), mat('#ffffff')), 0, 0.035, 0));
  lid.children[1].rotation.x = -P / 2;
  lid.position.set(JX, 1.13, ZR + 0.2);
  add(bake(lid));
  const tag = (ctx, w, h) => {
    ctx.fillStyle = '#fff7ea';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ef5b6f';
    ctx.font = `600 ${Math.round(h * 0.5)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Open when', w / 2, h / 2 + 2);
  };
  add(rot(at(R.atlas.panel(0.16, 0.06, 128, 48, tag), JX, 0.97, ZR + 0.31), 0, 0, 0.05));
  // Key bowl with a heart key ring and a star key ring
  add(at(cyl(0.12, 0.08, 0.05, '#9fd6e3', 14), CX0 + 0.13, 0.89, ZR + 0.2));
  add(rot(at(mesh(heartGeo(0.06, 0.015), mat('#ef5b6f')), CX0 + 0.09, 0.93, ZR + 0.19), -1.2, 0, 0.3));
  add(rot(at(mesh(starGeo(0.035, 0.015, 0.015), mat('#3f7bf0')), CX0 + 0.18, 0.93, ZR + 0.22), -1.3, 0, -0.2));
  for (const dx of [-0.09, 0.01]) add(rot(at(box(0.012, 0.05, 0.004, '#cfd8e3'), CX0 + 0.13 + dx + 0.1, 0.92, ZR + 0.2), -1.4, 0.5, 0));
  // Small vase
  add(at(cyl(0.05, 0.07, 0.16, '#ffffff', 12), CX0 + 0.43, 0.95, ZR + 0.18));
  for (const [dx, c] of [[-0.03, '#ff8fb1'], [0.03, '#ffd75e'], [0, '#ffffff']]) {
    add(at(cyl(0.005, 0.005, 0.2, '#4f9a45', 4), CX0 + 0.43 + dx, 1.1, ZR + 0.18));
    add(at(sph(0.035, c, undefined, 8), CX0 + 0.43 + dx, 1.21 + (c === '#ffffff' ? 0.04 : 0), ZR + 0.18));
  }

  // Shoe bench on the left wall with slippers underneath, and a round mirror above
  const sbx = L.XB - 0.32;
  const sbz = 4.28;
  add(at(rbox(0.4, 0.06, 1.0, wood, 0.02), sbx, 0.42, sbz));
  for (const s of [-1, 1]) add(at(box(0.38, 0.4, 0.05, '#8d5a3a'), sbx, 0.2, sbz + s * 0.47));
  add(at(rbox(0.36, 0.06, 0.82, '#ffd6e0', 0.03), sbx, 0.48, sbz));
  for (const [dz, c] of [[-0.33, '#ef5b6f'], [-0.2, '#ef5b6f'], [0.16, '#3f7bf0'], [0.29, '#3f7bf0']]) add(at(sph(0.06, c, undefined, 8), sbx - 0.05, 0.05, sbz + dz)).scale.set(1.5, 0.6, 0.8);
  // Roji's sneakers and Homama's trainers on the shelf
  for (const [dz, c] of [[-0.25, '#ffffff'], [-0.12, '#ffffff'], [0.15, '#2c3e66'], [0.28, '#2c3e66']]) add(at(rbox(0.22, 0.08, 0.1, c, 0.04), sbx, 0.12, sbz + dz));
  R.col({ type: 'box', x: sbx, z: sbz, hw: 0.22, hd: 0.52, h: 0.5 });
  add(rot(at(tor(0.3, 0.035, brass, undefined, P * 2, 8, 24), L.XB - 0.12, 1.62, sbz), 0, P / 2, 0));
  add(rot(at(mesh(new THREE.CircleGeometry(0.3, 24), mat('#d9eef6', { rough: 0.15 })), L.XB - 0.115, 1.62, sbz), 0, -P / 2, 0));
  // Runner from the front door to the hallway
  add(at(rbox(1.05, 0.012, 3.4, '#9fd6c9', 0.006), PXC, 0.006, 2.8));
  add(at(rbox(0.85, 0.004, 3.2, '#fff7ea', 0.004), PXC, 0.014, 2.8));
  for (let k = 0; k < 5; k++) add(rot(at(mesh(heartGeo(0.14, 0.004), mat('#ff9eb5')), PXC, 0.018, 1.5 + k * 0.65), -P / 2, 0, 0));

  // ================================================================ hallway
  // Long runner rug, lamps, plants at the ends, a console with flowers
  add(at(rbox(22.4, 0.012, 1.15, '#f2a98a', 0.006), 0, 0.006, -0.7));
  add(at(rbox(22.1, 0.004, 0.85, '#ffe9d6', 0.004), 0, 0.014, -0.7));
  for (let x = -10.5; x < 11; x += 1.5) add(rot(at(mesh(starGeo(0.08, 0.035, 0.004), mat('#ffb8a0')), x, 0.018, -0.7), -P / 2, 0, 0));
  for (const x of [-11.45, 11.45]) {
    add(at(cyl(0.24, 0.2, 0.44, '#e07a55', 14), x, 0.22, 0.12));
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * P * 2;
      const leaf = add(at(sph(0.22, i % 2 ? '#4f9a45' : '#5aa84f', { rough: 0.8 }, 10), x + Math.cos(a) * 0.2, 0.75 + (i % 3) * 0.18, 0.12 + Math.sin(a) * 0.14));
      leaf.scale.set(0.8, 0.22, 0.5);
      leaf.rotation.set(0.3 * Math.sin(a), -a, 0.5 * Math.cos(a));
    }
    R.col({ type: 'circle', x, z: 0.12, r: 0.26 });
  }
  // Wall lamps along the back-room wall
  const sconce = umat('#fff1c9', { emissive: '#ffc977', ei: 1.0, rough: 0.6 });
  for (const x of [0.95, 4.4, 8.5]) {
    const d = hallwayDecor(x);
    d.add(at(rbox(0.1, 0.16, 0.06, brass, 0.02), x, 2.2, ZH + 0.03));
    d.add(at(mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.2, 14, 1, true), sconce), x, 2.32, ZH + 0.14));
  }
  // Console table with a vase of tulips (between the study and the sunroom doors)
  const KX = 5.9;
  add(at(rbox(1.4, 0.05, 0.34, wood, 0.02), KX, 0.8, ZH + 0.19));
  for (const dx of [-0.64, 0.64]) for (const dz of [-0.12, 0.12]) add(at(cyl(0.025, 0.02, 0.78, '#8d5a3a', 6), KX + dx, 0.39, ZH + 0.19 + dz));
  R.col({ type: 'box', x: KX, z: ZH + 0.19, hw: 0.72, hd: 0.19, h: 0.82 });
  add(at(cyl(0.07, 0.09, 0.22, '#ff9eb5', 12), KX - 0.3, 0.94, ZH + 0.2));
  for (let k = 0; k < 5; k++) {
    add(at(cyl(0.005, 0.005, 0.26, '#4f9a45', 4), KX - 0.3 + (k - 2) * 0.025, 1.17, ZH + 0.2));
    add(at(cyl(0.025, 0.035, 0.07, ['#ef5b6f', '#ffd166', '#ffffff', '#c7a6ff', '#ff8fb1'][k], 8), KX - 0.3 + (k - 2) * 0.03, 1.32 + (k % 2) * 0.04, ZH + 0.2));
  }
  add(at(rbox(0.3, 0.04, 0.22, '#ffffff', 0.01), KX + 0.3, 0.84, ZH + 0.2));
  add(at(rbox(0.26, 0.03, 0.18, '#ef5b6f', 0.01), KX + 0.3, 0.875, ZH + 0.2));
  // A framed cross-stitch over it
  const stitch = (ctx, w, h) => {
    ctx.fillStyle = '#fffaf1';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ef5b6f';
    const px = 8;
    const heart = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
    heart.forEach((row, j) => [...row].forEach((c, i) => c === '1' && ctx.fillRect(w / 2 - 28 + i * px, 22 + j * px, px - 2, px - 2)));
    ctx.fillStyle = '#4a7a5a';
    ctx.font = `600 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('Home is you', w / 2, h - 22);
  };
  const dStudy = hallwayDecor(KX);
  dStudy.add(at(rbox(0.62, 0.52, 0.04, '#e9b949', 0.02), KX, 1.75, ZH + 0.02));
  dStudy.add(at(R.atlas.panel(0.54, 0.44, 192, 160, stitch), KX, 1.75, ZH + 0.045));
  // Easter egg: a tiny crayon drawing of the two of them, low on the wall, like someone small drew it
  const doodle = (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fff3e8';
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const [x, c, girl] of [[34, '#ef5b6f', true], [70, '#3f7bf0', false]]) {
      ctx.strokeStyle = c;
      ctx.beginPath();
      ctx.arc(x, 26, 9, 0, Math.PI * 2);
      ctx.moveTo(x, 35);
      ctx.lineTo(x, 56);
      ctx.moveTo(x - 10, 44);
      ctx.lineTo(x + 10, 44);
      ctx.moveTo(x, 56);
      ctx.lineTo(x - 7, 70);
      ctx.moveTo(x, 56);
      ctx.lineTo(x + 7, 70);
      ctx.stroke();
      if (girl) {
        ctx.beginPath();
        ctx.moveTo(x - 8, 58);
        ctx.lineTo(x + 8, 58);
        ctx.lineTo(x, 42);
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#ff6b8a';
    ctx.beginPath();
    ctx.moveTo(52, 22);
    ctx.bezierCurveTo(44, 16, 46, 8, 52, 12);
    ctx.bezierCurveTo(58, 8, 60, 16, 52, 22);
    ctx.fill();
  };
  hallwayDecor(7.9).add(at(R.atlas.panel(0.22, 0.16, 104, 76, doodle), 7.9, 0.34, ZH + 0.01));
  // The wedding photo between the bathroom and its neighbour
  const wedding = (ctx, w, h) => {
    const gg = ctx.createLinearGradient(0, 0, 0, h);
    gg.addColorStop(0, '#ffe9f0');
    gg.addColorStop(1, '#fff7ea');
    ctx.fillStyle = gg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ff9eb5';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.7, w * 0.36, Math.PI, 0);
    ctx.stroke();
    for (let k = 0; k < 9; k++) {
      const a = Math.PI + (k / 8) * Math.PI;
      ctx.fillStyle = ['#ffffff', '#ff8fb1', '#ffd166'][k % 3];
      ctx.beginPath();
      ctx.arc(w / 2 + Math.cos(a) * w * 0.36, h * 0.7 + Math.sin(a) * w * 0.36, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    drawPhoto(ctx, w * 0.12, h * 0.25, w * 0.76, h * 0.7, 'wedding', true);
  };
  const dBath = hallwayDecor(-2.25);
  dBath.add(at(rbox(0.66, 0.78, 0.05, '#ffffff', 0.02), -2.25, 1.72, ZH + 0.025));
  dBath.add(at(R.atlas.panel(0.56, 0.68, 160, 192, wedding), -2.25, 1.72, ZH + 0.055));

  // ---------------------------------------------------------------- the photo wall
  const weeks = STOPS.filter((s) => s.week && !s.locked).slice(0, 6);
  const PW = 0.78;
  const PH = 0.6;
  const photoCanvas = document.createElement('canvas');
  photoCanvas.width = 1536;
  photoCanvas.height = 200;
  const photoTex = new THREE.CanvasTexture(photoCanvas);
  photoTex.colorSpace = THREE.SRGBColorSpace;
  photoTex.anisotropy = 8;
  const photoMat = umat('#ffffff', { rough: 0.8, map: photoTex });
  const taken = () => {
    try {
      return new Set(JSON.parse(localStorage.getItem(STAMPS) || '[]'));
    } catch {
      return new Set();
    }
  };
  const drawWall = () => {
    const ctx = photoCanvas.getContext('2d');
    const have = taken();
    weeks.forEach((s, i) => drawPhoto(ctx, i * 256, 0, 256, 200, s.id, have.has(s.id)));
    photoTex.needsUpdate = true;
  };
  drawWall();
  const dBed = hallwayDecor(-9);
  const frames = ['#f4c24f', '#ffffff', '#ff9eb5', '#9fd6e3', '#ffffff', '#c7a6ff'];
  const photoPos = [];
  weeks.forEach((s, i) => {
    const x = -10.95 + i * 1.06;
    const y = i % 2 ? 1.62 : 1.82;
    photoPos.push({ x, y, id: s.id, title: s.title });
    dBed.add(at(rbox(PW + 0.12, PH + 0.12, 0.05, mat(frames[i], { metal: frames[i] === '#f4c24f' ? 0.3 : 0, rough: 0.5 }), 0.02), x, y, ZH + 0.025));
    const geo = new THREE.PlaneGeometry(PW, PH);
    const uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / 6);
    dBed.add(at(mesh(geo, photoMat, { cast: false }), x, y, ZH + 0.055));
    // A little clip on top
    dBed.add(at(box(0.06, 0.08, 0.03, '#ef5b6f'), x, y + PH / 2 + 0.05, ZH + 0.07));
  });
  // A string over the photos, and a label
  dBed.add(at(box(6.6, 0.015, 0.015, '#c9a27a'), -8.3, 2.3, ZH + 0.05));
  const label = (ctx, w, h) => {
    ctx.fillStyle = '#ef5b6f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fffaf2';
    roundRect(ctx, 6, 6, w - 12, h - 12, 20);
    ctx.fill();
    ctx.fillStyle = '#ef5b6f';
    ctx.font = `600 ${Math.round(h * 0.5)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Our weekends', w / 2, h / 2 + 3);
  };
  dBed.add(at(R.atlas.panel(1.1, 0.26, 320, 76, label), -8.3, 2.52, ZH + 0.04));
  // Glowing frame that moves to the photo being remembered
  const glow = umat('#fff1a8', { emissive: '#ffd166', ei: 1.4, rough: 0.5 });
  const hi = R.dyn(new THREE.Group());
  for (const [w, h, x, y] of [[PW + 0.2, 0.04, 0, PH / 2 + 0.08], [PW + 0.2, 0.04, 0, -PH / 2 - 0.08], [0.04, PH + 0.2, PW / 2 + 0.08, 0], [0.04, PH + 0.2, -PW / 2 - 0.08, 0]]) hi.add(at(mesh(new THREE.BoxGeometry(w, h, 0.03), glow, { cast: false }), x, y, 0));
  hi.visible = false;
  dBed.add(hi);
  R.onEnter(drawWall);

  // ---------------------------------------------------------------- actions
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function readNote(a) {
    const fromHim = a.playerId === 'roji';
    const list = fromHim ? NOTES_FROM_HOMAMA : NOTES_FROM_ROJI;
    const key = fromHim ? 'noteH' : 'noteR';
    const i = a.load(key, Math.floor(Math.random() * list.length));
    a.save(key, (i + 1) % list.length);
    st.jar = 1;
    a.sound.ui('pop');
    const paper = R.dyn(add(at(mesh(heartGeo(0.12, 0.01), mat('#fff1a8')), JX, 1.1, ZR + 0.2)));
    R.tween(0.9, (k) => {
      paper.position.set(JX + k * 0.4, 1.1 + Math.sin(k * P) * 0.5 + k * 0.2, ZR + 0.2 + k * 0.4);
      paper.rotation.set(k * 3, k * 5, 0);
    }, () => {
      paper.removeFromParent();
      a.fx.heartsAt(R.headPos(a.player), 3);
    });
    a.emote('player', 'heart');
    a.toast(`<b>A note from ${fromHim ? 'Homama' : 'Roji'}:</b> "${list[i % list.length]}"`, 4200);
  }

  function lookPhotos(a) {
    const have = taken();
    const list = photoPos.filter((p) => have.has(p.id));
    st.look = 0;
    st.photo = -1;
    const spec = R.start('photos', {
      label: 'Walk on',
      seats: [
        { who: 'roji', x: -8.75, z: -0.95, yaw: P, pose: 'stand' },
        { who: 'homama', x: -7.95, z: -0.95, yaw: P, pose: 'stand' },
      ],
      focus: { x: -8.3, z: -1.7, y: 1.6, zoom: 0.52 },
      exit: { x: -8.5, z: -0.6 },
      update(dt) {
        st.look += dt;
        const n = Math.floor(st.look / 3.6);
        if (n !== st.photo) {
          st.photo = n;
          if (!list.length) {
            if (n === 0) a.toast('<b>Homama:</b> Our photo wall is waiting for our first weekend together.<br><b>Roji:</b> Then let us go make some memories!', 4200);
            if (n === 1) a.endActivity();
            return;
          }
          if (n >= list.length) {
            hi.visible = false;
            a.toast(list.length >= weeks.length ? '<b>Roji:</b> Every single weekend, together. <b>Homama:</b> And many more to come.' : `<b>Homama:</b> ${weeks.length - list.length} more photos to take. I can't wait.`, 3800);
            a.fx.heartsAt(a.world(-8.3, -1.0, 1.9), 5);
            R.later(2.6, () => R.is('photos') && a.endActivity());
            st.photo = 99;
            return;
          }
          const p = list[n];
          hi.visible = true;
          hi.position.set(p.x, p.y, ZH + 0.08);
          a.toast(MEMORIES[p.id] || `${p.title}. What a day that was.`, 3400);
          a.sound.ui('tick');
          a.emote(n % 2 ? 'homama' : 'roji', n % 2 ? 'heart' : 'nod');
        }
      },
      onEnd() {
        hi.visible = false;
      },
    });
    if (spec) a.sound.ui('swoosh');
  }

  R.hot(
    { x: CX0 - 0.1, z: 1.6, r: 1.0, label: 'Read a love note', icon: 'note', act: readNote },
    { x: -8.3, z: -0.55, r: 1.35, label: 'Look at our photos', icon: 'photo', act: lookPhotos },
  );

  R.upd((dt, t) => {
    st.jar = Math.max(0, st.jar - dt * 1.6);
    lid.position.y = 1.13 + Math.sin(Math.min(1, st.jar) * P) * 0.12;
    lid.rotation.z = Math.sin(Math.min(1, st.jar) * P) * 0.4;
    halo.material.opacity = 0.45 + Math.sin(t * 1.3) * 0.08;
    if (hi.visible) glow.emissiveIntensity = 1.1 + Math.sin(t * 5) * 0.4;
  });
  R.onExit(() => {
    hi.visible = false;
  });
  void easeOutBack;
}
