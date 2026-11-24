import * as THREE from 'three';
import { mat, umat, mesh, canvasTexture, roundRect } from '../../util.js';
import { C, kit, colorBake, Atlas, drawSign, signGeo, drawCertificate, drawNote, drawPolaroid, drawWheelBadge, HOMAMA_PHOTO, ROJI_PHOTO, makeNora, freezeKid, makeCone, tree, addFlowers, paintedPlane, paintText, heartPath, licenceProgress } from './kit.js';

// Inside Little Wheels, open at the front like a dollhouse:
//   reception with the waiting chairs | the theory corner with the quiz computer and Nora | the certificate room
//   with Homama's framed certificate, the wall of student photos and a sofa.

const X0 = -12;
const X1 = 12;
const Z0 = -5;
const Z1 = 5;
const WALL_H = 3.0;
const RT = -4; // reception | theory
const TC = 4; // theory | certificate room

const TALA = { id: 'tala', name: 'Tala', gender: 'girl', skin: '#c98f68', hair: '#141010', hairstyle: 'buns', outfit: 'dress', top: '#c7a6ff', bottom: '#c7a6ff', shoes: '#7a2e3a', accent: '#ffd166' };

// Little road-sign pictures for the quiz card
const SVG = {
  stop: '<polygon points="20,4 44,4 60,20 60,44 44,60 20,60 4,44 4,20" fill="#e5484d" stroke="#fff" stroke-width="3"/><text x="32" y="38" font-size="15" font-weight="700" fill="#fff" text-anchor="middle" font-family="Fredoka, sans-serif">STOP</text>',
  giveway: '<polygon points="4,8 60,8 32,58" fill="#e5484d"/><polygon points="14,14 50,14 32,46" fill="#fff"/>',
  roundabout: '<circle cx="32" cy="32" r="29" fill="#3f7bf0"/><g fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round"><path d="M32 16a16 16 0 0 1 14 8"/><path d="M46 40a16 16 0 0 1-14 8"/><path d="M18 40a16 16 0 0 1 0-16"/></g><g fill="#fff"><path d="M50 22l-2 9-7-6z"/><path d="M28 52l-6-7 9-2z"/><path d="M14 22l9 1-5 7z"/></g>',
  zebra: '<rect x="4" y="4" width="56" height="56" rx="8" fill="#3f7bf0"/><polygon points="32,10 56,54 8,54" fill="#fff"/><g fill="#3b2b3f"><rect x="14" y="48" width="6" height="3"/><rect x="24" y="48" width="6" height="3"/><rect x="34" y="48" width="6" height="3"/><rect x="44" y="48" width="6" height="3"/><circle cx="32" cy="26" r="3"/><path d="M30 30h4l2 12h-3l-1-6-2 6h-3z"/></g>',
  duck: '<polygon points="32,4 61,58 3,58" fill="#e5484d"/><polygon points="32,16 51,51 13,51" fill="#fff"/><ellipse cx="30" cy="42" rx="9" ry="6" fill="#ffd166"/><circle cx="36" cy="33" r="4.5" fill="#ffd166"/><path d="M40 32l5 1.5-5 1.5z" fill="#f4a742"/><circle cx="37" cy="32" r="1" fill="#3b2b3f"/>',
  speed20: '<circle cx="32" cy="32" r="29" fill="#e5484d"/><circle cx="32" cy="32" r="22" fill="#fff"/><text x="32" y="40" font-size="22" font-weight="700" fill="#3b2b3f" text-anchor="middle" font-family="Fredoka, sans-serif">20</text>',
  lights: '<rect x="20" y="4" width="24" height="56" rx="8" fill="#3b2b3f"/><circle cx="32" cy="16" r="6" fill="#7a3a44"/><circle cx="32" cy="32" r="6" fill="#ffc85a"/><circle cx="32" cy="48" r="6" fill="#2f6a4c"/>',
};
const QUESTIONS = [
  { sign: 'stop', q: 'What does this sign ask you to do?', a: ['Stop fully, look, then go', 'Slow down a little', 'Honk and keep going'] },
  { sign: 'giveway', q: 'An upside-down triangle means...', a: ['Give way to other cars', 'Ice cream ahead', 'Drive a bit faster'] },
  { sign: 'roundabout', q: 'Blue circle with arrows going round?', a: ['A roundabout: follow the arrows', 'Spin the car for fun', 'Car wash ahead'] },
  { sign: 'zebra', q: 'Stripes on the road ahead. You...', a: ['Get ready to stop for people', 'Speed up before anyone comes', 'Park on the stripes'] },
  { sign: 'duck', q: 'A duck in a red triangle?', a: ['Ducks may cross: wait for them', 'Duck pond: time for a swim', 'Ducks sell bread here'] },
  { sign: 'speed20', q: 'A red circle with 20 inside?', a: ['Drive no faster than 20', 'Twenty ducks live here', 'Park for 20 minutes'] },
  { sign: 'lights', q: 'The traffic light turns amber. You...', a: ['Get ready to stop', 'Go extra fast', 'Take a photo of it'] },
];
const signSvg = (kind) => `<span style="display:block;margin:2px auto 8px;width:76px;height:76px"><svg width="76" height="76" viewBox="0 0 64 64">${SVG[kind]}</svg></span>`;

function pattern(w, h, base, draw, rx = 1, ry = 1) {
  const t = canvasTexture(w, h, (c) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    draw(c, w, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}

const tone = (api, f, d, o) => {
  const s = api.sound;
  if (s?.ctx && !s.muted) s.tone(f, s.ctx.currentTime, d, o);
};

export function buildDrivingInterior(ctx) {
  const k = kit();
  const { box, rbox, cyl, sph, tor, at } = k;
  const g = new THREE.Group();
  const dynamic = [];
  const colliders = [];
  const flowers = [];
  const add = (...o) => (g.add(...o), o[0]);
  const col = (x, z, hw, hd, h) => colliders.push(h === undefined ? { type: 'box', x, z, hw, hd } : { type: 'box', x, z, hw, hd, h });
  const atlas = new Atlas(8, 4, 256);
  const cells = {};
  let seed = 9;
  const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // ---------------------------------------------------------------- shell
  add(at(box(X1 - X0 + 0.6, 0.6, Z1 - Z0 + 0.6, mat(C.wood)), 0, -0.33, 0.1));
  const planks = pattern(256, 256, '#e8c497', (c, w, h) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? '#e0b987' : '#eccb9f';
      c.fillRect(0, (i * h) / 8, w, h / 8 - 3);
      c.fillStyle = 'rgba(150,100,60,0.22)';
      c.fillRect((i * 97) % w, (i * h) / 8, 3, h / 8);
    }
  }, 4, 5);
  const tiles = pattern(256, 256, '#eafaf4', (c, w) => {
    c.fillStyle = '#d2f1e6';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) c.fillRect((i * w) / 4, (j * w) / 4, w / 4, w / 4);
  }, 4, 5);
  const carpet = pattern(128, 128, '#ffe4ea', (c, w) => {
    c.fillStyle = '#ffd3dd';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      c.beginPath();
      c.arc((i + 0.5) * (w / 4), (j + 0.5) * (w / 4), 4, 0, Math.PI * 2);
      c.fill();
    }
  }, 8, 10);
  const floor = (x0, x1, tex) => add(at(mesh(new THREE.BoxGeometry(x1 - x0, 0.1, Z1 - Z0), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), { cast: false }), (x0 + x1) / 2, -0.05, 0));
  floor(X0, RT, planks);
  floor(RT, TC, tiles);
  floor(TC, X1, carpet);

  const paper = (base, dot, kind) =>
    pattern(128, 128, base, (c, w) => {
      c.fillStyle = dot;
      if (kind === 'stripe') for (let i = 0; i < 4; i++) c.fillRect(i * 32 + 12, 0, 8, w);
      else
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
          c.beginPath();
          c.arc((i + 0.5 + (j % 2) * 0.5) * (w / 4), (j + 0.5) * (w / 4), 5, 0, Math.PI * 2);
          c.fill();
        }
    });
  const wall = (x0, x1, tex) => {
    tex.repeat.set((x1 - x0) / 2.2, 1.4);
    add(at(mesh(new THREE.BoxGeometry(x1 - x0, WALL_H, 0.2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })), (x0 + x1) / 2, WALL_H / 2, Z0));
    add(at(box(x1 - x0, 0.16, 0.06, C.white), (x0 + x1) / 2, 0.08, Z0 + 0.13));
    add(at(box(x1 - x0, 0.08, 0.08, C.white), (x0 + x1) / 2, WALL_H - 0.04, Z0 + 0.13));
  };
  wall(X0, RT, paper('#fff1cf', '#ffe3a3', 'stripe'));
  wall(RT, TC, paper('#e3f5ef', '#cdeee2'));
  wall(TC, X1, paper('#ffeaf0', '#ffd6e1'));
  col(0, Z0, 12, 0.2);
  for (const x of [X0, X1]) {
    add(at(box(0.2, WALL_H, Z1 - Z0, mat(C.cream)), x, WALL_H / 2, 0));
    col(x, 0, 0.15, 5);
  }
  add(at(box(X1 - X0, 0.14, 0.12, C.white), 0, 0.07, Z1));
  col(0, Z1 + 0.15, 12, 0.15);
  // Dividing walls with a wide opening at the front
  for (const x of [RT, TC]) {
    add(at(rbox(0.22, WALL_H, 3.8, C.cream, 0.05), x, WALL_H / 2, Z0 + 1.9));
    add(at(rbox(0.3, 0.14, 3.86, C.sun, 0.05), x, WALL_H - 0.07, Z0 + 1.9));
    col(x, Z0 + 1.9, 0.14, 1.9);
    // A low planter at the front end
    add(at(rbox(0.5, 0.6, 1.2, C.teal, 0.06), x, 0.3, 3.9));
    add(at(rbox(0.42, 0.08, 1.12, '#9a6a45', 0.03), x, 0.6, 3.9));
    for (let i = 0; i < 7; i++) flowers.push([x + (R() - 0.5) * 0.25, 0.62, 3.4 + i * 0.16, i % 5, 1]);
    col(x, 3.9, 0.27, 0.62, 0.62);
  }
  // Windows on the back wall
  const skyMat = new THREE.MeshBasicMaterial({ map: canvasTexture(128, 128, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#9fdcf2');
    gr.addColorStop(1, '#e6f7ff');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff';
    for (const [x, y, r] of [[30, 40, 14], [46, 36, 18], [64, 42, 12], [96, 80, 12], [110, 76, 16]]) {
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#9ad06a';
    c.fillRect(0, h * 0.82, w, h * 0.18);
  }) });
  const windowAt = (x, y, w, h) => {
    add(at(rbox(w + 0.2, h + 0.2, 0.1, C.white, 0.04), x, y, Z0 + 0.12));
    add(at(new THREE.Mesh(new THREE.PlaneGeometry(w, h), skyMat), x, y, Z0 + 0.18));
    add(at(box(0.05, h, 0.04, C.white), x, y, Z0 + 0.2));
    add(at(box(w, 0.05, 0.04, C.white), x, y, Z0 + 0.2));
    add(at(rbox(w + 0.3, 0.06, 0.2, C.white, 0.02), x, y - h / 2 - 0.12, Z0 + 0.18));
  };
  windowAt(-10.6, 1.9, 1.3, 1.1);

  // ---------------------------------------------------------------- reception
  const RX = -8;
  // Curved desk: a sun-yellow front with a teal top
  const desk = new THREE.Group();
  desk.add(at(rbox(3.0, 1.0, 0.62, C.sun, 0.08), 0, 0.5, 0));
  desk.add(at(rbox(3.2, 0.08, 0.82, C.teal, 0.03), 0, 1.04, -0.06));
  for (const s of [-1, 1]) {
    const end = cyl(0.31, 0.31, 1.0, C.sun, 16);
    desk.add(at(end, s * 1.5, 0.5, 0));
    desk.add(at(cyl(0.36, 0.36, 0.08, C.teal, 16), s * 1.5, 1.04, -0.02));
  }
  desk.add(at(box(2.8, 0.12, 0.6, C.white), 0, 0.06, 0.02));
  add(at(desk, RX, 0, -2.3));
  col(RX, -2.3, 1.85, 0.42);
  cells.welcome = atlas.add((c, w, h) => {
    c.fillStyle = '#ffffff';
    roundRect(c, 6, 40, w - 12, h - 80, 36);
    c.fill();
    drawWheelBadge(c, w * 0.18, h * 0.5, w * 0.12);
    paintText(c, 'Welcome!', w * 0.6, h * 0.5 + 4, h * 0.2, C.teal);
  }, 2);
  const welcome = atlas.plane(1.5, 0.75, cells.welcome);
  add(at(welcome, RX, 0.55, -1.98));
  // On the desk: a bell, a monitor, pens, leaflets, a plant and a tiny toy car
  const bellMat = umat('#f2c14e', { rough: 0.25, metal: 0.6 });
  const bell = new THREE.Group();
  bell.add(at(cyl(0.11, 0.12, 0.03, C.ink, 14), 0, 0.015, 0));
  const dome = mesh(new THREE.SphereGeometry(0.09, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), bellMat);
  bell.add(at(dome, 0, 0.03, 0));
  bell.add(at(sph(0.02, bellMat, undefined, 8), 0, 0.13, 0));
  add(at(bell, RX + 1.1, 1.08, -2.05));
  dynamic.push(bell);
  add(at(rbox(0.6, 0.4, 0.05, C.ink, 0.03), RX - 0.4, 1.38, -2.45));
  add(at(box(0.06, 0.25, 0.06, C.ink), RX - 0.4, 1.17, -2.45));
  add(at(box(0.46, 0.02, 0.18, '#e9e3ea'), RX - 0.4, 1.09, -2.15));
  add(at(cyl(0.05, 0.05, 0.13, C.rose, 10), RX + 0.4, 1.14, -2.25));
  for (const [dx, cc] of [[-0.02, C.sky], [0.02, C.sun], [0, C.teal]]) {
    const p = cyl(0.008, 0.008, 0.16, cc, 5);
    p.rotation.z = dx * 6;
    add(at(p, RX + 0.4 + dx, 1.2, -2.25));
  }
  for (let i = 0; i < 3; i++) add(at(box(0.24, 0.015, 0.32, [C.pink, C.mint, C.sun][i]), RX + 0.75 + i * 0.02, 1.09 + i * 0.016, -2.4 + i * 0.01));
  add(at(cyl(0.09, 0.07, 0.14, C.white, 12), RX - 1.3, 1.15, -2.3));
  add(at(sph(0.15, C.leaf, undefined, 12), RX - 1.3, 1.32, -2.3));
  const toyCar = (x, y, z, colr, s = 1, ry = 0) => {
    const t = new THREE.Group();
    t.add(at(rbox(0.16, 0.06, 0.28, colr, 0.025), 0, 0.05, 0));
    t.add(at(rbox(0.12, 0.05, 0.13, colr, 0.02), 0, 0.1, -0.02));
    for (const [wx, wz] of [[0.08, 0.09], [-0.08, 0.09], [0.08, -0.09], [-0.08, -0.09]]) {
      const w = cyl(0.03, 0.03, 0.025, C.ink, 8);
      w.rotation.z = Math.PI / 2;
      t.add(at(w, wx, 0.03, wz));
    }
    t.scale.setScalar(s);
    t.rotation.y = ry;
    add(at(t, x, y, z));
  };
  toyCar(RX + 0.05, 1.08, -2.0, C.sun, 1, 0.4);
  // Tala behind the desk
  const tala = ctx.makeKid(TALA);
  tala.root.scale.setScalar(1.1);
  freezeKid(tala, { pose: 'stand', hands: 'type' });
  tala.root.position.set(RX - 0.3, 0, -3.25);
  add(tala.root);
  col(RX - 0.3, -3.25, 0.35, 0.3);
  // Back wall: a key board with car keys, a sign and a poster
  add(at(rbox(1.4, 0.8, 0.06, C.woodDark, 0.04), RX - 1.8, 1.8, Z0 + 0.14));
  for (let i = 0; i < 6; i++) {
    const x = RX - 2.3 + (i % 3) * 0.5;
    const y = 2.0 - Math.floor(i / 3) * 0.36;
    add(at(cyl(0.015, 0.015, 0.08, C.steel, 6), x, y, Z0 + 0.2)).rotation.x = Math.PI / 2;
    add(at(rbox(0.1, 0.14, 0.02, [C.rose, C.sun, C.mint, C.sky, C.lilac, C.pink][i], 0.02), x, y - 0.12, Z0 + 0.22));
    add(at(tor(0.03, 0.008, C.steel, Math.PI * 2, undefined, 10), x, y - 0.03, Z0 + 0.22));
  }
  cells.reception = atlas.add((c, w, h) => {
    c.fillStyle = C.teal;
    roundRect(c, 4, 60, w - 8, h - 120, 50);
    c.fill();
    paintText(c, 'Reception', w / 2, h / 2 + 4, h * 0.26, '#ffffff');
  }, 2);
  const recSign = atlas.plane(1.6, 0.8, cells.reception);
  add(at(recSign, RX + 0.4, 2.45, Z0 + 0.13));
  cells.poster = atlas.add((c, w, h) => {
    c.fillStyle = '#fff6e6';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#9ad06a';
    c.fillRect(0, h * 0.62, w, h * 0.38);
    c.fillStyle = C.road;
    c.beginPath();
    c.moveTo(w * 0.42, h * 0.62);
    c.lineTo(w * 0.58, h * 0.62);
    c.lineTo(w * 0.9, h);
    c.lineTo(w * 0.1, h);
    c.fill();
    c.fillStyle = C.sun;
    c.beginPath();
    c.arc(w * 0.78, h * 0.26, w * 0.1, 0, Math.PI * 2);
    c.fill();
    paintText(c, 'Learn to drive', w / 2, h * 0.16, h * 0.1, C.teal);
    paintText(c, 'with a smile', w / 2, h * 0.3, h * 0.09, C.rose);
    c.save();
    c.translate(w * 0.5, h * 0.78);
    c.fillStyle = C.sun;
    roundRect(c, -w * 0.13, -h * 0.07, w * 0.26, h * 0.12, 12);
    c.fill();
    c.fillStyle = C.ink;
    c.beginPath();
    c.arc(-w * 0.07, h * 0.05, w * 0.03, 0, Math.PI * 2);
    c.arc(w * 0.07, h * 0.05, w * 0.03, 0, Math.PI * 2);
    c.fill();
    c.restore();
  });
  add(at(rbox(0.96, 0.96, 0.05, C.white, 0.03), RX + 2.6, 1.75, Z0 + 0.13));
  add(at(atlas.plane(0.84, 0.84, cells.poster), RX + 2.6, 1.75, Z0 + 0.165));
  // Waiting chairs, a side table and a water cooler
  const chair = (x, z, ry, colr) => {
    const c = new THREE.Group();
    c.add(at(rbox(0.5, 0.1, 0.5, colr, 0.04), 0, 0.44, 0));
    c.add(at(rbox(0.5, 0.5, 0.1, colr, 0.04), 0, 0.72, -0.21));
    for (const [lx, lz] of [[0.2, 0.2], [-0.2, 0.2], [0.2, -0.2], [-0.2, -0.2]]) c.add(at(cyl(0.025, 0.025, 0.4, C.ink, 6), lx, 0.2, lz));
    c.rotation.y = ry;
    add(at(c, x, 0, z));
    col(x, z, 0.27, 0.27, 0.49);
  };
  [[-0.4, C.rose], [0.3, C.sun], [1.0, C.mint]].forEach(([z, cc]) => chair(-11.35, z, Math.PI / 2, cc));
  add(at(cyl(0.3, 0.3, 0.05, C.white, 18), -11.35, 0.5, 1.9));
  add(at(cyl(0.04, 0.06, 0.5, C.ink, 8), -11.35, 0.25, 1.9));
  for (let i = 0; i < 2; i++) add(at(box(0.22, 0.02, 0.3, [C.sky, C.pink][i]), -11.33 + i * 0.03, 0.535 + i * 0.02, 1.9));
  colliders.push({ type: 'circle', x: -11.35, z: 1.9, r: 0.3, h: 0.53 });
  const cooler = new THREE.Group();
  cooler.add(at(rbox(0.42, 1.0, 0.42, C.white, 0.06), 0, 0.5, 0));
  cooler.add(at(box(0.08, 0.05, 0.06, C.sky), -0.08, 0.7, 0.22));
  cooler.add(at(box(0.08, 0.05, 0.06, C.rose), 0.08, 0.7, 0.22));
  const jug = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.42, 16), new THREE.MeshStandardMaterial({ color: '#9fdcf2', transparent: true, opacity: 0.65, roughness: 0.1 }));
  cooler.add(at(jug, 0, 1.22, 0));
  add(at(cooler, -11.3, 0, -3.9));
  col(-11.3, -3.9, 0.24, 0.24);
  add(at(cyl(0.3, 0.24, 0.5, '#e08a5c', 14), -4.8, 0.25, 3.9));
  add(at(sph(0.42, C.leaf, undefined, 14), -4.8, 0.8, 3.9));
  add(at(sph(0.28, C.leafDark, undefined, 12), -4.6, 1.1, 3.85));
  colliders.push({ type: 'circle', x: -4.8, z: 3.9, r: 0.32 });
  // A round rug by the door
  const rug = mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.02, 32), mat(C.peach, { rough: 0.95 }), { cast: false });
  add(at(rug, RX, 0.01, 2.6));
  add(at(tor(1.05, 0.03, C.white, Math.PI * 2, undefined, 32), RX, 0.022, 2.6)).rotation.x = Math.PI / 2;

  // ---------------------------------------------------------------- theory corner
  // Road-sign posters in two rows under a title strip
  cells.signsTitle = atlas.add((c, w, h) => {
    c.fillStyle = C.sun;
    roundRect(c, 4, 50, w - 8, h - 100, 50);
    c.fill();
    paintText(c, 'Know your signs', w / 2, h / 2 + 4, h * 0.24, C.ink);
  }, 2);
  add(at(atlas.plane(1.9, 0.95, cells.signsTitle), -2.1, 2.62, Z0 + 0.13));
  const posterKinds = ['stop', 'giveway', 'roundabout', 'zebra', 'duck', 'speed20', 'lights', 'parking'];
  posterKinds.forEach((kind, i) => {
    if (!cells[kind]) cells[kind] = atlas.add((c, w, h) => drawSign(c, kind, w, h));
    const x = -3.4 + (i % 4) * 0.86;
    const y = 1.98 - Math.floor(i / 4) * 0.82;
    add(at(rbox(0.74, 0.74, 0.04, C.white, 0.03), x, y, Z0 + 0.13));
    add(at(atlas.mesh(k.geo(`sg${kind}`, () => signGeo(kind, 0.56)), cells[kind]), x, y, Z0 + 0.16));
  });
  // The quiz computer
  const QX = 0.4;
  add(at(rbox(1.6, 0.06, 0.72, C.wood, 0.02), QX, 0.75, -3.9));
  for (const [lx, lz] of [[0.72, 0.3], [-0.72, 0.3], [0.72, -0.3], [-0.72, -0.3]]) add(at(cyl(0.03, 0.03, 0.72, C.ink, 6), QX + lx, 0.36, -3.9 + lz));
  col(QX, -3.9, 0.82, 0.38, 0.78);
  add(at(rbox(0.86, 0.56, 0.06, C.ink, 0.04), QX, 1.15, -4.1));
  add(at(box(0.08, 0.3, 0.08, C.ink), QX, 0.92, -4.12));
  cells.screen = atlas.add((c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#e9f8ff');
    gr.addColorStop(1, '#cfeefe');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    c.fillStyle = C.teal;
    c.fillRect(0, 0, w, h * 0.2);
    paintText(c, 'Theory quiz', w / 2, h * 0.1 + 2, h * 0.11, '#ffffff');
    c.save();
    c.translate(w * 0.27, h * 0.56);
    c.scale(0.36, 0.36);
    c.translate(-w / 2, -h / 2);
    drawSign(c, 'duck', w, h);
    c.restore();
    for (let i = 0; i < 3; i++) {
      c.fillStyle = i === 0 ? '#bdf0cf' : '#ffffff';
      roundRect(c, w * 0.5, h * (0.32 + i * 0.19), w * 0.44, h * 0.14, 10);
      c.fill();
    }
  });
  add(at(atlas.plane(0.76, 0.46, cells.screen, { glow: true }), QX, 1.15, -4.065));
  add(at(rbox(0.5, 0.025, 0.16, C.white, 0.01), QX, 0.79, -3.7));
  add(at(sph(0.035, C.white, undefined, 8), QX + 0.4, 0.79, -3.68));
  add(at(cyl(0.05, 0.045, 0.1, C.rose, 10), QX - 0.6, 0.83, -3.8));
  add(at(k.heart(0.06, 0.01, C.white), QX - 0.6, 0.84, -3.75));
  const stool = new THREE.Group();
  stool.add(at(cyl(0.24, 0.24, 0.08, C.rose, 16), 0, 0.48, 0));
  stool.add(at(cyl(0.04, 0.05, 0.44, C.ink, 8), 0, 0.22, 0));
  stool.add(at(cyl(0.2, 0.2, 0.03, C.ink, 12), 0, 0.02, 0));
  add(at(stool, QX, 0, -3.05));
  colliders.push({ type: 'circle', x: QX, z: -3.05, r: 0.24, h: 0.52 });
  // Whiteboard with a roundabout lesson, and Nora beside it
  const WBX = 2.6;
  cells.board = atlas.add((c, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = C.blue;
    c.lineWidth = 6;
    c.beginPath();
    c.arc(w * 0.3, h * 0.55, h * 0.26, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = C.rose;
    c.lineWidth = 5;
    c.beginPath();
    c.arc(w * 0.3, h * 0.55, h * 0.38, -0.3, Math.PI * 1.4);
    c.stroke();
    c.fillStyle = C.rose;
    c.beginPath();
    const a = Math.PI * 1.4;
    const ax = w * 0.3 + Math.cos(a) * h * 0.38;
    const ay = h * 0.55 + Math.sin(a) * h * 0.38;
    c.moveTo(ax + 14, ay - 4);
    c.lineTo(ax - 8, ay - 16);
    c.lineTo(ax - 6, ay + 12);
    c.fill();
    c.fillStyle = '#9ad06a';
    c.beginPath();
    c.arc(w * 0.3, h * 0.55, h * 0.1, 0, Math.PI * 2);
    c.fill();
    paintText(c, 'Go round', w * 0.74, h * 0.3, h * 0.13, C.blue);
    paintText(c, 'the arrows', w * 0.74, h * 0.46, h * 0.13, C.blue);
    paintText(c, 'way!', w * 0.74, h * 0.62, h * 0.13, C.rose);
    c.fillStyle = C.sun;
    heartPath(c, w * 0.74, h * 0.82, h * 0.1);
    c.fill();
  }, 2);
  const wb = new THREE.Group();
  wb.add(at(rbox(1.7, 0.95, 0.06, '#d8dee8', 0.03), 0, 1.6, 0));
  wb.add(at(atlas.plane(1.6, 0.85, cells.board), 0, 1.6, 0.035));
  wb.add(at(box(1.5, 0.05, 0.12, '#d8dee8'), 0, 1.1, 0.06));
  for (const [cc, dx] of [[C.blue, -0.4], [C.rose, -0.25], [C.mint, -0.1]]) {
    const m = cyl(0.015, 0.015, 0.12, cc, 6);
    m.rotation.z = Math.PI / 2;
    wb.add(at(m, dx, 1.14, 0.08));
  }
  for (const s of [-1, 1]) {
    wb.add(at(cyl(0.025, 0.025, 1.15, C.steel, 8), s * 0.8, 0.58, 0));
    wb.add(at(box(0.06, 0.04, 0.5, C.steel), s * 0.8, 0.04, 0));
  }
  wb.rotation.y = -0.12;
  add(at(wb, WBX, 0, -3.95));
  col(WBX, -3.95, 0.9, 0.28);
  const nora = makeNora(ctx.makeKid, { clipboard: false });
  const pointer = cyl(0.012, 0.012, 0.6, C.woodDark, 6);
  pointer.position.set(0, -0.36, 0.05);
  nora.arms[1].add(pointer);
  freezeKid(nora, { pose: 'stand', hands: 'hold' });
  nora.root.position.set(3.0, 0, -2.5);
  nora.root.rotation.y = -0.45;
  add(nora.root);
  colliders.push({ type: 'circle', x: 3.0, z: -2.5, r: 0.34 });
  // A play rug with a toy road loop, toy cars and tiny cones
  const mapRug = paintedPlane(3.6, 2.2, 512, (c, w, h) => {
    c.fillStyle = '#bfe8a6';
    roundRect(c, 0, 0, w, h, 40);
    c.fill();
    c.strokeStyle = C.road;
    c.lineWidth = h * 0.16;
    roundRect(c, w * 0.12, h * 0.18, w * 0.76, h * 0.64, h * 0.24);
    c.stroke();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.setLineDash([12, 10]);
    roundRect(c, w * 0.12, h * 0.18, w * 0.76, h * 0.64, h * 0.24);
    c.stroke();
    c.setLineDash([]);
    for (let i = 0; i < 4; i++) {
      c.fillStyle = '#ffffff';
      c.fillRect(w * 0.44 + i * 16, h * 0.74, 9, h * 0.16);
    }
    c.fillStyle = '#7fcfe0';
    c.beginPath();
    c.ellipse(w * 0.5, h * 0.5, w * 0.12, h * 0.1, 0, 0, Math.PI * 2);
    c.fill();
    for (const [x, y, cc] of [[0.25, 0.42, C.rose], [0.72, 0.4, C.sun], [0.62, 0.6, C.lilac]]) {
      c.fillStyle = cc;
      c.beginPath();
      c.arc(w * x, h * y, 10, 0, Math.PI * 2);
      c.fill();
    }
  });
  mapRug.material.alphaTest = 0.5;
  mapRug.rotation.x = -Math.PI / 2;
  add(at(mapRug, 0.3, 0.012, 0.9));
  toyCar(-0.9, 0.012, 0.4, C.sun, 1.8, Math.PI / 2);
  toyCar(1.5, 0.012, 1.4, C.pink, 1.8, -Math.PI / 2);
  toyCar(0.9, 0.012, 0.1, C.sky, 1.8, 0.2);
  for (const [x, z] of [[-0.3, 1.7], [0.0, 1.7]]) {
    const cn = makeCone(k);
    cn.scale.setScalar(0.35);
    add(at(cn, x, 0.012, z));
  }

  // ---------------------------------------------------------------- certificate room
  const CX = 6.9;
  // Homama's certificate in a big gold frame
  const certW = 1.6;
  const certH = 1.1;
  const cert = paintedPlane(certW, certH, 1024, drawCertificate, { rough: 0.7, glow: 0.08 });
  const gold = mat('#e8b84a', { rough: 0.35, metal: 0.35 });
  add(at(rbox(certW + 0.24, certH + 0.24, 0.06, gold, 0.04), CX, 1.85, Z0 + 0.14));
  add(at(rbox(certW + 0.06, certH + 0.06, 0.04, '#fff8ea', 0.02), CX, 1.85, Z0 + 0.17));
  add(at(cert, CX, 1.85, Z0 + 0.195));
  // Homama's note, pinned to the frame corner
  const note = paintedPlane(0.62, 0.62, 256, drawNote, { rough: 0.8 });
  note.rotation.z = -0.1;
  add(at(note, CX + 1.2, 1.5, Z0 + 0.2));
  add(at(sph(0.03, C.rose, undefined, 8), CX + 1.2, 1.78, Z0 + 0.22));
  // His thumbs-up photo and a "You can do it, Roji!" banner
  cells.homama = atlas.add((c, w, h) => drawPolaroid(c, 8, 4, w - 16, h - 8, HOMAMA_PHOTO, 'Go Roji!', 0, '#cfe9ff'));
  const photo = atlas.plane(0.62, 0.62, cells.homama);
  photo.rotation.z = 0.08;
  add(at(photo, CX - 1.45, 1.75, Z0 + 0.16));
  cells.banner = atlas.add((c, w, h) => {
    c.fillStyle = C.teal;
    roundRect(c, 4, 70, w - 8, h - 140, 58);
    c.fill();
    paintText(c, 'You can do it, Roji!', w / 2, h / 2 + 4, h * 0.2, '#ffffff');
    c.fillStyle = C.rose;
    heartPath(c, 60, h / 2 + 10, 34);
    c.fill();
    heartPath(c, w - 60, h / 2 + 10, 34);
    c.fill();
  }, 3);
  add(at(atlas.plane(2.6, 0.87, cells.banner), CX, 2.72, Z0 + 0.15));
  for (const [x, y, s, cc] of [[CX - 1.2, 1.1, 0.16, C.rose], [CX + 1.15, 2.25, 0.13, C.pink], [CX - 1.55, 2.35, 0.1, C.sun]]) add(at(k.heart(s, 0.03, cc), x, y, Z0 + 0.17));
  // A low shelf with a trophy and toy cars
  add(at(rbox(1.5, 0.8, 0.45, C.white, 0.05), CX - 1.6, 0.4, Z0 + 0.35));
  col(CX - 1.6, Z0 + 0.35, 0.78, 0.26, 0.82);
  const cup = new THREE.Group();
  const goldCup = mat('#f2c14e', { rough: 0.25, metal: 0.5 });
  cup.add(at(cyl(0.12, 0.05, 0.2, goldCup, 14), 0, 0.22, 0));
  cup.add(at(cyl(0.03, 0.03, 0.1, goldCup, 8), 0, 0.08, 0));
  cup.add(at(box(0.16, 0.04, 0.12, C.woodDark), 0, 0.02, 0));
  for (const s of [-1, 1]) {
    const handle = at(tor(0.05, 0.012, goldCup, Math.PI * 2, undefined, 10), s * 0.13, 0.24, 0);
    handle.rotation.y = Math.PI / 2;
    cup.add(handle);
  }
  add(at(cup, CX - 2.0, 0.8, Z0 + 0.35));
  toyCar(CX - 1.5, 0.8, Z0 + 0.35, C.mint, 1, 0.5);
  toyCar(CX - 1.15, 0.8, Z0 + 0.38, C.rose, 1, -0.3);
  // Wall of student photos with one frame saved for Roji
  const PW = 2.9;
  const PH = 1.7;
  const drawPhotos = (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const looks = [
      { skin: '#c98f68', hair: '#141010', top: '#7fd3a7' },
      { skin: '#fbe6d8', hair: '#b5773d', top: '#ffd166', girl: true, bow: '#ff9eb5' },
      { skin: '#e3b08e', hair: '#4a2c1a', top: '#6fb8ff' },
      { skin: '#9c6a4a', hair: '#141010', top: '#ff9eb5', girl: true, bow: '#ffd166' },
      { skin: '#f2cdb4', hair: '#c94f3b', top: '#c7a6ff', girl: true, bow: '#7fd3a7' },
      { skin: '#e3b08e', hair: '#7a4a26', top: '#f08a5d' },
      { skin: '#6e4630', hair: '#141010', top: '#3fbf7f' },
    ];
    const pw = w / 4.4;
    const ph = h / 2.25;
    let n = 0;
    for (let r = 0; r < 2; r++) {
      for (let cIdx = 0; cIdx < 4; cIdx++) {
        const x = w * 0.04 + cIdx * (pw + w * 0.025);
        const y = h * 0.04 + r * (ph + h * 0.06);
        const tilt = ((cIdx + r) % 3 - 1) * 0.04;
        if (r === 1 && cIdx === 3) {
          const has = licenceProgress() >= 100;
          if (has) drawPolaroid(c, x, y, pw, ph, { ...ROJI_PHOTO, licence: true }, 'Roji!', tilt, '#ffe1ea');
          else {
            c.save();
            c.translate(x + pw / 2, y + ph / 2);
            c.rotate(tilt);
            c.fillStyle = 'rgba(255,255,255,0.7)';
            c.fillRect(-pw / 2, -ph / 2, pw, ph);
            c.setLineDash([8, 6]);
            c.strokeStyle = C.rose;
            c.lineWidth = 4;
            c.strokeRect(-pw / 2 + 6, -ph / 2 + 6, pw - 12, ph - 12);
            c.setLineDash([]);
            c.fillStyle = C.pink;
            heartPath(c, 0, -ph * 0.08, pw * 0.18);
            c.fill();
            paintText(c, 'Roji', 0, ph * 0.2, ph * 0.12, C.rose);
            paintText(c, 'coming soon', 0, ph * 0.34, ph * 0.08, '#8a7480', 600);
            c.restore();
          }
        } else {
          const L = looks[n++ % looks.length];
          drawPolaroid(c, x, y, pw, ph, { ...L, licence: true }, 'Passed!', tilt, ['#cfe9ff', '#ffe9c7', '#e2f7e6', '#ffe1ea'][(cIdx + r) % 4]);
        }
      }
    }
  };
  const photos = paintedPlane(PW, PH, 1024, drawPhotos, { rough: 0.8, transparent: true });
  add(at(photos, 10.25, 1.75, Z0 + 0.13));
  dynamic.push(photos);
  let photosLicence = licenceProgress() >= 100;
  const refreshPhotos = () => {
    const has = licenceProgress() >= 100;
    if (has === photosLicence) return;
    photosLicence = has;
    const tex = photos.userData.tex;
    drawPhotos(tex.image.getContext('2d'), tex.image.width, tex.image.height);
    tex.needsUpdate = true;
  };
  cells.photosTitle = atlas.add((c, w, h) => {
    c.fillStyle = C.rose;
    roundRect(c, 4, 60, w - 8, h - 120, 50);
    c.fill();
    paintText(c, 'Our new drivers', w / 2, h / 2 + 4, h * 0.2, '#ffffff');
  }, 2);
  add(at(atlas.plane(1.8, 0.9, cells.photosTitle), 10.25, 2.78, Z0 + 0.14));
  // Sofa and a coffee table
  const SX = 10.1;
  const SZ = -1.3;
  const sofa = new THREE.Group();
  sofa.add(at(rbox(2.2, 0.38, 0.82, C.teal, 0.12), 0, 0.27, 0));
  for (const s of [-1, 1]) sofa.add(at(rbox(0.98, 0.16, 0.7, C.mint, 0.07), s * 0.5, 0.5, 0.04));
  sofa.add(at(rbox(2.2, 0.62, 0.24, C.teal, 0.1), 0, 0.66, -0.32));
  for (const s of [-1, 1]) sofa.add(at(rbox(0.24, 0.55, 0.82, C.teal, 0.1), s * 1.1, 0.44, 0));
  sofa.add(at(rbox(0.36, 0.34, 0.12, C.sun, 0.08), -0.62, 0.74, -0.16));
  const pillow = k.heart(0.32, 0.12, C.rose);
  pillow.rotation.x = -0.25;
  sofa.add(at(pillow, 0.62, 0.66, -0.13));
  add(at(sofa, SX, 0, SZ));
  col(SX, SZ, 1.22, 0.42, 0.58);
  add(at(rbox(1.1, 0.06, 0.6, C.white, 0.03), SX, 0.42, SZ + 1.15));
  for (const [lx, lz] of [[0.45, 0.22], [-0.45, 0.22], [0.45, -0.22], [-0.45, -0.22]]) add(at(cyl(0.025, 0.025, 0.4, C.woodDark, 6), SX + lx, 0.2, SZ + 1.15 + lz));
  col(SX, SZ + 1.15, 0.56, 0.31, 0.45);
  add(at(rbox(0.3, 0.07, 0.22, C.rose, 0.03), SX - 0.25, 0.485, SZ + 1.15));
  add(at(k.heart(0.1, 0.015, C.white), SX - 0.25, 0.53, SZ + 1.15)).rotation.x = -Math.PI / 2;
  add(at(cyl(0.05, 0.045, 0.1, C.sky, 10), SX + 0.3, 0.5, SZ + 1.1));
  const rug2 = mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.02, 32), mat(C.blush, { rough: 0.95 }), { cast: false });
  add(at(rug2, SX, 0.01, SZ + 1.2));
  for (const [x, z, cc] of [[SX - 1.7, SZ + 1.6, C.sun], [SX + 1.6, SZ + 1.7, C.lilac]]) {
    const cush = rbox(0.6, 0.22, 0.6, cc, 0.1);
    add(at(cush, x, 0.11, z));
    col(x, z, 0.3, 0.3, 0.22);
  }
  // A plant and a tall lamp
  add(at(tree(k, 0.42, 2), 11.4, 0, 3.6));
  colliders.push({ type: 'circle', x: 11.4, z: 3.6, r: 0.2 });
  const lampGlow = mat('#fff6d8', { emissive: '#ffe2a0', ei: 0.8 });
  add(at(cyl(0.03, 0.04, 1.6, C.ink, 8), 4.8, 0.8, -1.0));
  add(at(cyl(0.18, 0.18, 0.04, C.ink, 12), 4.8, 0.02, -1.0));
  add(at(cyl(0.16, 0.26, 0.3, lampGlow, 14), 4.8, 1.7, -1.0));
  colliders.push({ type: 'circle', x: 4.8, z: -1.0, r: 0.18 });

  addFlowers(g, flowers, R);

  // ---------------------------------------------------------------- hotspots
  let noraI = 0;
  let quizBusy = false;
  let bellT = 0;
  const roji = (api) => api.playerId === 'roji';
  const noraSays = (api) => {
    const p = licenceProgress();
    const lines = roji(api)
      ? [
          '<b>Nora:</b> Hello Roji! Gentle on the brake, smooth on the turns.',
          p >= 100 ? '<b>Nora:</b> Licensed driver Roji! I am so proud of you.' : `<b>Nora:</b> Your licence is ${Math.round(p)}% done. A few more lessons!`,
          '<b>Nora:</b> The ducks always have right of way. Always!',
          '<b>Nora:</b> Homama got full marks. He talks about you all the time.',
        ]
      : [
          '<b>Nora:</b> Hi Homama! Roji is doing wonderfully.',
          '<b>Nora:</b> Your certificate is on the wall. Roji reads it every visit.',
          p >= 100 ? '<b>Nora:</b> Roji passed! You two can take turns driving now.' : '<b>Nora:</b> Keep cheering, Homama. It really helps her.',
        ];
    return lines[noraI++ % lines.length];
  };
  async function quiz(api) {
    if (quizBusy) return;
    quizBusy = true;
    const pool = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 4);
    let score = 0;
    let lead = roji(api) ? 'Roji sits at the quiz computer. Homama peeks over her shoulder.' : 'Homama helps Roji practise for her theory test.';
    for (let i = 0; i < pool.length; i++) {
      const q = pool[i];
      const opts = q.a.map((label, j) => ({ id: String(j), label })).sort(() => Math.random() - 0.5);
      const pick = await api.choose({ title: `Question ${i + 1} of ${pool.length}`, text: `${lead}${signSvg(q.sign)}${q.q}`, options: opts });
      if (pick === null) {
        quizBusy = false;
        return api.toast('Quiz paused. The signs will wait for you.', 2200);
      }
      if (pick === '0') {
        score++;
        api.sound.ui('good');
        lead = '<b style="color:#21a99a">Correct!</b> ';
      } else {
        api.sound.ui('tick');
        lead = `<b style="color:#ef5b6f">Nearly!</b> It means: ${q.a[0].toLowerCase()}. `;
      }
    }
    quizBusy = false;
    const best = Math.max(score, api.load('quizBest', 0));
    api.save('quizBest', best);
    const deskPos = api.world(QX, -3.4, 1.6);
    if (score === pool.length) {
      api.sound.ui('win');
      api.fx.burst(deskPos, ['#ffd166', '#ff9eb5', '#7fd8bf', '#ffffff'], 60);
      api.fx.heartsAt(deskPos, 5);
      api.emote('roji', 'cheer');
      setTimeout(() => api.emote('homama', 'cheer'), 300);
      api.toast(`<b>${score} out of ${score}!</b> Nora: "A perfect score!" Homama cheers.`, 3600);
    } else {
      api.sound.ui('good');
      api.fx.burst(deskPos, ['#ffd166', '#ffffff'], 30);
      api.emote('player', 'cheer');
      api.toast(`<b>${score} out of ${pool.length}</b>. Homama: "So close! One more try?"`, 3200);
    }
  }
  const hotspots = [
    {
      x: CX,
      z: -3.6,
      r: 1.4,
      icon: 'heart',
      label: "Read Homama's certificate",
      act: (api) => {
        api.focus({ x: CX, z: Z0 + 1, y: 1.8, zoom: 0.34 });
        setTimeout(() => api.focus(null), 5200);
        api.fx.heartsAt(api.world(CX, Z0 + 0.6, 2.4), 4);
        api.emote('player', roji(api) ? 'heart' : 'bow');
        api.toast('Certified driver: <b>Homama</b>. Safe, kind and careful on every road.', 2800);
        setTimeout(() => api.toast('His note: <b>"I will do my very best to help Roji get hers!"</b>', 3200), 2700);
      },
    },
    {
      x: QX,
      z: -2.3,
      r: 1.3,
      icon: 'help',
      label: 'Take the theory quiz',
      act: (api) => quiz(api),
    },
    {
      x: 2.9,
      z: -1.4,
      r: 1.3,
      icon: 'smile',
      label: 'Talk to Nora',
      act: (api) => {
        api.emote('player', 'wave');
        api.toast(noraSays(api), 3400);
      },
    },
    {
      x: RX + 1.0,
      z: -1.2,
      r: 1.2,
      icon: 'sound',
      label: 'Ring the bell',
      act: (api) => {
        bellT = 0.5;
        tone(api, 1760, 0.6, { type: 'sine', gain: 0.07 });
        tone(api, 2640, 0.4, { type: 'sine', gain: 0.025 });
        api.toast('<b>Tala:</b> Ding! Welcome to Little Wheels. Nora is in the theory corner.', 3200);
      },
    },
    {
      x: SX,
      z: SZ + 2.1,
      r: 1.2,
      icon: 'smile',
      label: 'Sit on the sofa',
      act: (api) =>
        api.activity({
          label: 'Get up',
          seats: [
            { who: 'roji', x: SX - 0.5, z: SZ + 0.05, y: 0.4, yaw: 0, pose: 'sit', hands: 'read' },
            { who: 'homama', x: SX + 0.5, z: SZ + 0.05, y: 0.4, yaw: 0, pose: 'sit' },
          ],
          focus: { x: SX, z: SZ, y: 0.9, zoom: 0.5 },
          exit: { x: SX - 0.4, z: SZ + 2.0 },
          onEnd: (silent) => !silent && api.toast('Roji read the driving handbook. Homama asked her questions.', 2800),
        }),
    },
    {
      x: 10.25,
      z: -3.7,
      r: 1.2,
      icon: 'star',
      label: 'Look at the photos',
      act: (api) => {
        refreshPhotos();
        api.focus({ x: 10.25, z: Z0 + 1, y: 1.75, zoom: 0.36 });
        setTimeout(() => api.focus(null), 3600);
        api.toast(licenceProgress() >= 100 ? "Roji's licence photo is on the wall now. Homama beams." : 'Every smile here passed. One frame says <b>Roji, coming soon</b>.', 3400);
      },
    },
  ];

  return {
    group: g,
    dynamic: [...dynamic, ...colorBake(g, dynamic)],
    colliders,
    hotspots,
    size: { w: X1 - X0, d: Z1 - Z0 },
    spawn: { x: RX, z: 3.0, yaw: Math.PI },
    exit: { x: RX, z: 4.3 },
    background: '#fde3c9',
    onEnter(api) {
      refreshPhotos();
      setTimeout(() => {
        if (!api.inside) return;
        api.toast(roji(api) ? '<b>Homama:</b> Theory today? You will ace it, Roji!' : 'Homama holds the door for Roji. "After you, future driver!"', 3200);
      }, 1900);
    },
    update(dt, t) {
      if (bellT > 0) {
        bellT = Math.max(0, bellT - dt);
        bell.position.y = 1.08 + Math.sin(bellT * 30) * 0.015;
      }
    },
  };
}
