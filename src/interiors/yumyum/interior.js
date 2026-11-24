import { ICONS } from '../../icons.js';
import * as K from './kit.js';

// Inside Roji's YumYum, open at the front like a dollhouse:
//   open kitchen (grill, fryer, prep island, the cook) | counter with stools, menu board and the shake bar |
//   dining room with booths, round tables and a jukebox.

const { THREE, COL, box, rbox, cyl, sph, tor, at, rot, mat, umat, mesh, canvasTexture, roundRect, FONT } = K;

const X0 = -13;
const X1 = 13;
const Z0 = -5;
const Z1 = 5;
const WALL_H = 3.2;
const KX = -5.5; // kitchen | counter
const DX = 3.8; // counter | dining room
const NAME = { roji: 'Roji', homama: 'Homama' };
const BOOTHS = [5.4, 8.3, 11.2];
const BOOTH_Z = -3.9;
const SEAT_Y = 0.22;
const JUKE = { x: 12.15, z: 0.9 };
const SHAKES = [
  { id: 'strawberry', label: 'Strawberry', sub: 'Pink and dreamy' },
  { id: 'chocolate', label: 'Chocolate', sub: 'Rich and creamy' },
  { id: 'vanilla', label: 'Vanilla', sub: 'Sweet and simple' },
  { id: 'mint', label: 'Mint', sub: 'Cool and fresh' },
];
const MEALS = [
  { id: 'burger', label: 'Burger and fries', sub: 'The YumYum classic', food: ['burger', 'burger'], middle: 'fries' },
  { id: 'shawarma', label: 'Shawarma', sub: 'Wrapped warm', food: ['shawarma', 'shawarma'], middle: 'juice' },
  { id: 'mansaf', label: 'Mansaf', sub: 'A big plate to share', food: [], middle: 'mansaf' },
  { id: 'cake', label: 'Cake and milkshakes', sub: 'Something sweet', food: ['pecan-cake', 'german-cake'], middle: 'milkshake' },
];
const LINES = {
  burger: ['This is the best burger on the island!', 'Extra cheese, just how you like it.'],
  shawarma: ['Warm, garlicky and perfect.', 'One more bite, then I share!'],
  mansaf: ['Mansaf, just like a family feast.', 'We should come here every Friday.'],
  cake: ['Cake tastes better with you.', 'A milkshake and a sweet date.'],
};
// Three jukebox songs: melody in eighth notes (MIDI numbers), four bars of chords
const SONGS = [
  { name: 'Burger Boogie', bpm: 150, chords: [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]], melody: [72, null, 72, 74, 76, null, 74, 72, 69, null, 72, null, 76, 74, 72, null, 77, null, 76, 74, 72, null, 69, null, 74, null, 72, 71, 72, null, null, null] },
  { name: 'Strawberry Shake', bpm: 128, chords: [[53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55]], melody: [77, 76, 77, null, 81, null, 79, 77, 74, null, 77, null, 81, null, 82, null, 81, 79, 77, null, 74, null, 72, 74, 76, null, 79, null, 77, null, null, null] },
  { name: 'Roji Rock', bpm: 170, chords: [[45, 49, 52], [45, 49, 52], [50, 54, 57], [52, 56, 59]], melody: [69, 69, 73, 76, 78, 76, 73, 69, 69, 69, 73, 76, 78, 76, 73, null, 74, 74, 78, 81, 83, 81, 78, 74, 76, null, 80, null, 81, null, null, null] },
];

// Line icons for these hotspots (24 x 24 strokes)
ICONS.shake ??= 'M7 9h10l-1.6 11H8.6z M6.5 9a5.5 3.5 0 0 1 11 0 M12 5.5l2.5-3 M9 13.5h6';
ICONS.chef ??= 'M7 13.5a4 4 0 0 1 .9-7.9 4.2 4.2 0 0 1 8.2 0A4 4 0 0 1 17 13.5V19H7z M7 16h10';

// Fit a prop so its largest side is `size` metres, base at y = 0, centred.
function fit(obj, size) {
  obj.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(obj);
  if (b.isEmpty()) return obj;
  const s = new THREE.Vector3();
  b.getSize(s);
  const k = size / Math.max(s.x, s.y, s.z, 1e-3);
  const wrap = new THREE.Group();
  obj.scale.multiplyScalar(k);
  obj.position.set(-((b.min.x + b.max.x) / 2) * k, -b.min.y * k, -((b.min.z + b.max.z) / 2) * k);
  wrap.add(obj);
  return wrap;
}

export function buildYumYumInterior(ctx) {
  const { easeOutBack } = ctx.util;
  const g = new THREE.Group();
  const dynamic = [];
  const colliders = [];
  const hotspots = [];
  const atlas = new K.Atlas(2048, 1536);
  const add = (...o) => (g.add(...o), o[0]);
  const col = (x, z, hw, hd, h) => colliders.push(h === undefined ? { type: 'box', x, z, hw, hd } : { type: 'box', x, z, hw, hd, h });
  const circ = (x, z, r, h) => colliders.push(h === undefined ? { type: 'circle', x, z, r } : { type: 'circle', x, z, r, h });
  const tone = (api, f, d, o, delay = 0) => {
    const s = api.sound;
    if (s?.ctx && !s.muted) s.tone(f, s.ctx.currentTime + delay, d, o);
  };
  const later = [];
  const after = (sec, fn) => later.push({ t: sec, fn });

  // ---------------------------------------------------------------- shell: floors, walls, trims
  add(at(box(X1 - X0 + 0.6, 0.6, Z1 - Z0 + 0.6, COL.woodDark), 0, -0.33, 0.1));
  const tiles = K.pattern(128, 128, '#ffffff', (c, w) => {
    c.fillStyle = '#cdeee4';
    for (let i = 0; i <= 4; i++) {
      c.fillRect((i * w) / 4 - 2, 0, 4, w);
      c.fillRect(0, (i * w) / 4 - 2, w, 4);
    }
  }, (KX - X0) / 1.2, (Z1 - Z0) / 1.2);
  const checker = K.pattern(128, 128, '#fff8ec', (c, w) => {
    c.fillStyle = '#f6b8ab';
    c.fillRect(0, 0, w / 2, w / 2);
    c.fillRect(w / 2, w / 2, w / 2, w / 2);
  }, (DX - KX) / 1.2, (Z1 - Z0) / 1.2);
  const planks = K.pattern(256, 256, '#eccb9f', (c, w, h) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? '#e3bb88' : '#eecfa3';
      c.fillRect(0, (i * h) / 8, w, h / 8 - 3);
      c.fillStyle = 'rgba(150,100,60,0.22)';
      c.fillRect((i * 97) % w, (i * h) / 8, 3, h / 8);
    }
  }, (X1 - DX) / 2.4, (Z1 - Z0) / 2.4);
  const floor = (x0, x1, tex) => add(at(mesh(new THREE.BoxGeometry(x1 - x0, 0.1, Z1 - Z0), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82 }), { cast: false }), (x0 + x1) / 2, -0.05, 0));
  floor(X0, KX, tiles);
  floor(KX, DX, checker);
  floor(DX, X1, planks);

  const wallTiles = K.pattern(128, 128, '#e9f8f3', (c, w) => {
    c.fillStyle = '#c2eadf';
    for (let i = 0; i <= 4; i++) {
      c.fillRect((i * w) / 4 - 2, 0, 4, w);
      c.fillRect(0, (i * w) / 4 - 2, w, 4);
    }
  }, (KX - X0) / 1.0, WALL_H / 1.0);
  const stripes = K.pattern(128, 128, '#fff3f0', (c, w) => {
    c.fillStyle = '#ffd9df';
    for (let i = 0; i < 4; i++) c.fillRect(i * 32 + 10, 0, 14, w);
  }, (X1 - DX) / 1.1, 1.6);
  const wallSeg = (x0, x1, m) => add(at(mesh(new THREE.BoxGeometry(x1 - x0, WALL_H, 0.2), m), (x0 + x1) / 2, WALL_H / 2, Z0));
  wallSeg(X0, KX, new THREE.MeshStandardMaterial({ map: wallTiles, roughness: 0.6 }));
  wallSeg(KX, DX, mat(COL.cream));
  wallSeg(DX, X1, new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.9 }));
  // Red wainscot with a white rail in the counter area, cream panels in the dining room
  add(at(box(DX - KX, 1.0, 0.06, COL.red), (KX + DX) / 2, 0.5, Z0 + 0.12));
  add(at(box(DX - KX, 0.07, 0.1, COL.white), (KX + DX) / 2, 1.02, Z0 + 0.13));
  add(at(box(X1 - DX, 0.9, 0.06, COL.cream), (DX + X1) / 2, 0.45, Z0 + 0.12));
  add(at(box(X1 - DX, 0.07, 0.1, COL.orange), (DX + X1) / 2, 0.92, Z0 + 0.13));
  const band = K.pattern(256, 32, '#ffffff', (c, w, h) => {
    for (let i = 0; i < 16; i++) {
      c.fillStyle = i % 2 ? '#ffffff' : COL.red;
      c.fillRect((i * w) / 16, 0, w / 16, h / 2);
      c.fillStyle = i % 2 ? COL.red : '#ffffff';
      c.fillRect((i * w) / 16, h / 2, w / 16, h / 2);
    }
  }, (X1 - X0) / 1.6, 1);
  add(at(mesh(new THREE.PlaneGeometry(X1 - X0, 0.24), new THREE.MeshStandardMaterial({ map: band, roughness: 0.7 }), { cast: false }), 0, WALL_H - 0.2, Z0 + 0.11));
  const sideTiles = wallTiles.clone();
  sideTiles.repeat.set(Z1 - Z0, WALL_H);
  const sideStripes = stripes.clone();
  sideStripes.repeat.set((Z1 - Z0) / 1.1, 1.6);
  add(at(mesh(new THREE.BoxGeometry(0.2, WALL_H, Z1 - Z0), new THREE.MeshStandardMaterial({ map: sideTiles, roughness: 0.6 })), X0, WALL_H / 2, 0));
  add(at(mesh(new THREE.BoxGeometry(0.2, WALL_H, Z1 - Z0), new THREE.MeshStandardMaterial({ map: sideStripes, roughness: 0.9 })), X1, WALL_H / 2, 0));
  add(at(box(0.08, 0.9, Z1 - Z0, COL.cream), X1 - 0.12, 0.45, 0));
  add(at(box(0.1, 0.07, Z1 - Z0, COL.orange), X1 - 0.13, 0.92, 0));
  for (const x of [X0, X1]) col(x, 0, 0.15, 5);
  add(at(box(X1 - X0, 0.14, 0.12, COL.white), 0, 0.07, Z1));
  col(0, Z0, 13, 0.2);
  col(0, Z1 + 0.1, 13, 0.15);
  // Door mat at the way out
  add(at(rbox(1.6, 0.03, 0.8, COL.orange, 0.015), -1, 0.015, 4.35));
  add(at(rbox(1.4, 0.035, 0.6, COL.cream, 0.015), -1, 0.02, 4.35));

  // ---------------------------------------------------------------- kitchen
  // Cooking line along the back wall: fridge, grill, fryer, sink
  add(at(rbox(1.0, 2.2, 0.85, COL.steel, 0.06, { metal: 0.35, rough: 0.35 }), -12.35, 1.1, -4.5));
  add(at(box(0.92, 0.02, 0.02, COL.steelDark), -12.35, 1.35, -4.07));
  for (const y of [0.85, 1.75]) add(at(rbox(0.05, 0.4, 0.05, COL.steelDark, 0.02, { metal: 0.5, rough: 0.3 }), -11.95, y, -4.04));
  for (const [x, y, c] of [[-12.6, 1.8, COL.hotpink], [-12.4, 1.6, COL.sun], [-12.65, 0.9, COL.mint]]) add(at(rot(cyl(0.045, 0.045, 0.02, c, 12), Math.PI / 2, 0, 0), x, y, -4.065));
  add(at(atlas.plane(0.34, 0.42, 120, 150, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    c.fillStyle = COL.hotpink;
    K.heartPath(c, w / 2, h * 0.4, w * 0.5);
    c.fill();
    c.fillStyle = COL.ink;
    c.font = `600 ${h * 0.13}px ${FONT}`;
    c.textAlign = 'center';
    c.fillText('R + H', w / 2, h * 0.82);
  }), -12.5, 1.25, -4.068));
  add(at(rbox(6.2, 0.9, 0.85, COL.cream, 0.04), -8.65, 0.45, -4.55));
  add(at(rbox(6.3, 0.05, 0.92, COL.steel, 0.02, { metal: 0.45, rough: 0.3 }), -8.65, 0.925, -4.55));
  add(at(box(6.2, 0.1, 0.02, COL.orange), -8.65, 0.8, -4.12));
  col(-10.25, -4.55, 2.75, 0.45, 0.95);
  col(-12.35, -4.5, 0.52, 0.45);
  const grill = K.makeGrill(1.6, 3, 0.6);
  add(at(grill.group, -10.55, 0.95, -4.55));
  const sizzle = grill.spots.map((x) => {
    const p = mesh(K.pattyGeometry(), mat(COL.patty), { cast: false });
    add(at(p, -10.55 + x, 0.95 + grill.top, -4.53));
    return new THREE.Vector3(-10.55 + x, 1.1, -4.5);
  });
  const fryer = K.makeFryer();
  add(at(fryer.group, -8.6, 0.95, -4.55));
  fryer.fries.visible = true;
  fryer.fries.material.color.set(COL.fries);
  fryer.basket.position.y = fryer.downY;
  dynamic.push(fryer.basket);
  // Sink with a stack of plates
  add(at(box(0.8, 0.04, 0.55, COL.steelDark, { metal: 0.5, rough: 0.3 }), -6.6, 0.93, -4.5));
  add(at(rot(tor(0.08, 0.018, COL.steel, { metal: 0.6, rough: 0.25 }, Math.PI), 0, Math.PI / 2, 0), -6.6, 1.05, -4.82));
  for (let i = 0; i < 5; i++) add(at(cyl(0.16, 0.14, 0.02, '#ffffff', 18, { rough: 0.3 }), -7.3, 0.97 + i * 0.025, -4.55));
  // Hood with lights, utensil rail and shelves
  add(at(rbox(3.6, 0.5, 1.0, COL.steel, 0.05, { metal: 0.45, rough: 0.3 }), -9.6, 2.45, -4.5));
  add(at(box(3.4, 0.05, 0.9, '#c3cbd3'), -9.6, 2.18, -4.5));
  for (const x of [-10.9, -9.6, -8.3]) add(at(sph(0.07, '#fff6d8', { emissive: '#ffe9a8', ei: 0.8 }, 12), x, 2.15, -4.3));
  add(at(rot(cyl(0.015, 0.015, 1.8, COL.steelDark, 8, { metal: 0.5, rough: 0.3 }), 0, 0, Math.PI / 2), -7.0, 1.7, -4.85));
  for (const [x, c, kind] of [[-7.7, COL.steelDark, 'ladle'], [-7.35, COL.red, 'spatula'], [-7.0, COL.steelDark, 'whisk'], [-6.65, COL.mint, 'spatula'], [-6.3, COL.woodDark, 'spoon']]) {
    add(at(cyl(0.01, 0.01, 0.3, c, 6), x, 1.53, -4.85));
    if (kind === 'ladle') add(at(sph(0.05, c, undefined, 10), x, 1.36, -4.83));
    else if (kind === 'whisk') add(at(sph(0.045, '#c3cbd3', undefined, 8), x, 1.34, -4.84));
    else add(at(rbox(0.07, 0.1, 0.012, c, 0.01), x, 1.34, -4.84));
  }
  add(at(rbox(1.6, 0.05, 0.3, COL.woodDark, 0.02), -6.8, 2.3, -4.8));
  [COL.sun, COL.pink, COL.mint, COL.orange].forEach((c, i) => {
    add(at(cyl(0.09, 0.09, 0.22, c, 14), -7.35 + i * 0.37, 2.44, -4.8));
    add(at(cyl(0.095, 0.095, 0.03, '#ffffff', 14), -7.35 + i * 0.37, 2.56, -4.8));
  });
  add(at(rbox(1.6, 0.05, 0.3, COL.woodDark, 0.02), -12.0, 2.55, -4.8));
  for (let i = 0; i < 3; i++) add(at(cyl(0.16, 0.14, 0.2, COL.steel, 16, { metal: 0.45, rough: 0.3 }), -12.5 + i * 0.5, 2.68, -4.8));
  // Prep island with burgers being made, and the cook behind it
  const IX = -9.3;
  const IZ = -1.8;
  add(at(rbox(2.4, 0.9, 0.9, COL.orange, 0.05), IX, 0.45, IZ));
  add(at(rbox(2.5, 0.05, 1.0, COL.steel, 0.02, { metal: 0.45, rough: 0.3 }), IX, 0.925, IZ));
  add(at(box(2.4, 0.08, 0.02, COL.cream), IX, 0.6, IZ + 0.45));
  col(IX, IZ, 1.25, 0.5, 0.95);
  for (const [x, tops, patty] of [[-0.75, ['cheese', 'tomato', 'lettuce'], true], [-0.25, ['cheese'], true], [0.25, [], false]]) {
    const b = new K.Burger({ plate: true });
    b.set(patty, tops);
    b.group.scale.setScalar(0.8);
    add(at(b.group, IX + x, 0.95, IZ + 0.15));
  }
  add(at(rbox(0.5, 0.03, 0.32, COL.woodDark, 0.01), IX + 0.8, 0.965, IZ + 0.1));
  for (const [x, z] of [[0.68, 0.05], [0.78, 0.15], [0.9, 0.06]]) add(at(cyl(0.05, 0.05, 0.02, COL.tomato, 12), IX + x, 0.99, IZ + z));
  add(at(rot(mesh(K.lettuceGeometry(), mat(COL.lettuce)), 0.2, 0, 0), IX + 0.95, 1.0, IZ - 0.2));
  const fries = K.makeFriesBox();
  add(at(fries, IX - 1.05, 0.95, IZ + 0.15));
  // Potato sacks and a bun bag by the island
  for (const [x, z, s] of [[-12.5, -2.2, 1], [-12.2, -1.6, 0.85]]) {
    const sack = sph(0.32 * s, '#d9b98a', { rough: 0.95 }, 14);
    sack.scale.set(1, 1.15, 0.9);
    add(at(sack, x, 0.32 * s, z));
    add(at(cyl(0.12 * s, 0.17 * s, 0.12 * s, '#c9a674', 10), x, 0.68 * s, z));
    circ(x, z, 0.3 * s, 0.6 * s);
  }
  for (const [x, z] of [[-12.4, -2.0], [-12.3, -1.85]]) add(at(sph(0.06, '#c8a06a', undefined, 8), x, 0.76, z));
  // Divider: a low wall with a pass shelf, heat lamps and order tickets
  add(at(rbox(0.3, 1.05, 5.6, COL.cream, 0.04), KX, 0.525, -2.2));
  add(at(rbox(0.5, 0.06, 5.7, COL.steel, 0.02, { metal: 0.45, rough: 0.3 }), KX, 1.08, -2.2));
  add(at(box(0.02, 0.1, 5.6, COL.orange), KX + 0.16, 0.85, -2.2));
  col(KX, -2.2, 0.18, 2.8, 1.1);
  add(at(box(0.04, 0.04, 4.8, COL.steel, { metal: 0.5, rough: 0.3 }), KX, 1.95, -2.4));
  for (const z of [-4.8, 0.0]) add(at(cyl(0.025, 0.025, 0.86, COL.steelDark, 8, { metal: 0.5, rough: 0.3 }), KX, 1.52, z));
  for (const z of [-3.8, -2.4, -1.0]) {
    add(at(cyl(0.06, 0.16, 0.2, COL.red, 14), KX, 1.84, z));
    add(at(sph(0.07, '#fff3c4', { emissive: '#ffcf70', ei: 1.0 }, 10), KX, 1.74, z));
  }
  const ticketTex = atlas.add(64, 96, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#c9b8c2';
    for (let i = 0; i < 5; i++) c.fillRect(8, 16 + i * 14, w - 16 - (i % 2) * 14, 5);
    c.fillStyle = COL.orange;
    c.fillRect(0, 0, w, 8);
  });
  for (const z of [-4.2, -3.3, -2.9, -1.6, -0.7]) {
    const t = mesh(atlas.fit(new THREE.PlaneGeometry(0.13, 0.19), ticketTex), atlas.material, { cast: false });
    t.rotation.y = Math.PI / 2;
    add(at(t, KX + 0.03, 1.87 - 0.1, z));
  }
  for (const [z, id] of [[-3.5, 'cheese'], [-1.9, 'deluxe']]) {
    const it = K.makeItem(id);
    it.scale.setScalar(0.75);
    add(at(it, KX, 1.11, z));
  }

  // Front of the kitchen: crates of vegetables, a bin, a pink mat and the specials board
  for (const [x, z, h, fill] of [[-12.35, 2.2, 0, COL.tomato], [-12.35, 2.75, 0, '#d9b98a'], [-12.35, 2.48, 0.42, COL.lettuce]]) {
    add(at(rbox(0.56, 0.4, 0.5, COL.wood, 0.02), x, h + 0.2, z));
    for (const sx of [-1, 1]) add(at(box(0.02, 0.08, 0.46, COL.woodDark), x + sx * 0.28, h + 0.3, z));
    for (let i = 0; i < 6; i++) add(at(sph(0.07, fill, { rough: 0.6 }, 10), x - 0.15 + (i % 3) * 0.15, h + 0.42, z - 0.1 + Math.floor(i / 3) * 0.2));
  }
  col(-12.35, 2.48, 0.3, 0.55, 0.83);
  const bin = K.makeTrash(atlas);
  add(at(bin.group, -11.6, 0, -0.5));
  circ(-11.6, -0.5, 0.2, 0.37);
  add(at(rbox(2.6, 0.02, 0.7, COL.pink, 0.01), -9.6, 0.01, -3.55));
  const special = (x, z, ry, title, lines) => {
    const st = new THREE.Group();
    for (const s of [-1, 1]) {
      const leg = rbox(0.04, 1.0, 0.04, COL.woodDark, 0.01);
      st.add(at(rot(leg, s * 0.2, 0, 0), 0, 0.48, s * 0.17));
    }
    st.add(at(rot(rbox(0.66, 0.84, 0.04, COL.woodDark, 0.02), -0.2, 0, 0), 0, 0.56, 0.12));
    const face = atlas.plane(0.58, 0.76, 190, 250, (c, w, h) => {
      c.fillStyle = '#2f4a45';
      c.fillRect(0, 0, w, h);
      c.textAlign = 'center';
      c.fillStyle = COL.sun;
      c.font = `700 ${h * 0.1}px ${FONT}`;
      c.fillText(title, w / 2, h * 0.16);
      c.fillStyle = '#ffffff';
      c.font = `500 ${h * 0.075}px ${FONT}`;
      lines.forEach((l, i) => c.fillText(l, w / 2, h * (0.32 + i * 0.12)));
      c.fillStyle = COL.hotpink;
      K.heartPath(c, w / 2, h * 0.86, h * 0.12);
      c.fill();
    });
    st.add(at(rot(face, -0.2, 0, 0), 0, 0.56, 0.145));
    st.rotation.y = ry;
    add(at(st, x, 0, z));
    circ(x, z, 0.3);
  };
  special(-6.6, 2.6, -0.3, "Today's special", ['Mansaf Friday', 'Pecan cake', 'Two straws', 'for sweethearts']);
  special(2.7, 2.9, 0.35, 'Milkshake bar', ['Strawberry', 'Chocolate', 'Vanilla', 'Mint']);

  // ---------------------------------------------------------------- counter area
  // Back bar: soda fountain, shake mixer, cake domes, cups
  add(at(rbox(DX - KX - 0.9, 0.92, 0.75, COL.cream, 0.04), (KX + DX) / 2 - 0.2, 0.46, -4.58));
  add(at(rbox(DX - KX - 0.8, 0.05, 0.82, '#ffffff', 0.02, { rough: 0.35 }), (KX + DX) / 2 - 0.2, 0.945, -4.58));
  add(at(box(DX - KX - 0.9, 0.08, 0.02, COL.red), (KX + DX) / 2 - 0.2, 0.75, -4.2));
  col((KX + DX) / 2 - 0.2, -4.58, (DX - KX - 0.8) / 2, 0.42, 0.97);
  const soda = K.makeSodaMachine(atlas);
  add(at(soda.group, -4.35, 0.97, -4.6));
  const mixer = K.makeShakeMachine(atlas);
  add(at(mixer.group, -3.3, 0.97, -4.6));
  dynamic.push(mixer.spin, mixer.cup);
  const domeMat = new THREE.MeshStandardMaterial({ color: '#f2fbff', roughness: 0.05, transparent: true, opacity: 0.3, depthWrite: false });
  const domes = [];
  for (const [x, id] of [[-2.0, 'pecan-cake'], [-1.05, 'german-cake'], [-0.1, 'cupcake']]) {
    add(at(cyl(0.26, 0.28, 0.04, '#ffffff', 22, { rough: 0.3 }), x, 0.99, -4.6));
    add(at(cyl(0.04, 0.06, 0.12, '#ffffff', 12, { rough: 0.3 }), x, 0.93 + 0.12, -4.6));
    const dome = mesh(new THREE.SphereGeometry(0.27, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), domeMat, { cast: false });
    dome.scale.y = 1.25;
    add(at(dome, x, 1.01, -4.6));
    dynamic.push(dome);
    add(at(sph(0.035, COL.steelDark, { metal: 0.5, rough: 0.3 }, 10), x, 1.36, -4.6));
    domes.push({ x, id });
  }
  for (let i = 0; i < 4; i++) {
    const c = K.makeCup();
    c.setFill(0);
    c.setLid(false);
    add(at(c.group, 0.75 + (i % 2) * 0.2, 0.97 + Math.floor(i / 2) * 0.18, -4.6));
  }
  add(at(cyl(0.12, 0.1, 0.24, '#5b3a2a', 14), 1.6, 1.09, -4.6));
  add(at(rbox(0.36, 0.5, 0.36, COL.ink, 0.04), 2.2, 1.22, -4.62));
  add(at(cyl(0.1, 0.1, 0.16, '#efe6dc', 14, { rough: 0.3 }), 2.2, 1.1, -4.42));
  // Menu board, clock and neon on the back wall
  const menuTex = atlas.add(1024, 420, (c, w, h) => {
    c.fillStyle = COL.brown;
    roundRect(c, 0, 0, w, h, 34);
    c.fill();
    c.fillStyle = '#fff8ec';
    roundRect(c, 14, 14, w - 28, h - 28, 26);
    c.fill();
    c.fillStyle = COL.red;
    c.font = `700 62px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('YumYum Menu', w / 2, 62);
    c.fillStyle = COL.hotpink;
    K.heartPath(c, w / 2 - 230, 60, 40);
    c.fill();
    K.heartPath(c, w / 2 + 230, 60, 40);
    c.fill();
    const items = [
      ['burger', 'Burgers', '5'],
      ['fries', 'Fries', '4'],
      ['shake', 'Milkshakes', '5'],
      ['soda', 'Soda', '3'],
      ['shawarma', 'Shawarma', '7'],
      ['mansaf', 'Mansaf', '9'],
      ['cake', 'Cakes', '4'],
      ['burger', 'Cheeseburger', '6'],
    ];
    items.forEach(([icon, name, price], i) => {
      const col_ = Math.floor(i / 4);
      const row = i % 4;
      const x = 60 + col_ * 480;
      const y = 140 + row * 70;
      if (icon === 'burger') K.ICON_DRAW.burger(c, x + 30, y, 58, name === 'Cheeseburger' ? ['cheese', 'lettuce'] : []);
      else K.ICON_DRAW[icon](c, x + 30, y, 58);
      c.textAlign = 'left';
      c.fillStyle = COL.ink;
      c.font = `600 40px ${FONT}`;
      c.fillText(name, x + 78, y + 2);
      c.strokeStyle = '#e2cfc6';
      c.setLineDash([4, 10]);
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(x + 90 + c.measureText(name).width, y + 12);
      c.lineTo(x + 360, y + 12);
      c.stroke();
      c.setLineDash([]);
      K.drawCoin(c, x + 386, y, 16);
      c.fillStyle = COL.red;
      c.font = `700 40px ${FONT}`;
      c.fillText(price, x + 410, y + 2);
    });
  });
  add(at(mesh(atlas.fit(new THREE.PlaneGeometry(3.6, 1.48), menuTex), atlas.material, { cast: false }), -1.15, 2.25, Z0 + 0.12));
  add(at(rbox(3.72, 1.6, 0.04, COL.red, 0.02), -1.15, 2.25, Z0 + 0.08));
  const clockFace = atlas.add(128, 128, (c, w) => {
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(w / 2, w / 2, w / 2 - 2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = COL.ink;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.beginPath();
      c.arc(w / 2 + Math.cos(a) * 48, w / 2 + Math.sin(a) * 48, i % 3 ? 3 : 6, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = COL.hotpink;
    K.heartPath(c, w / 2, w * 0.7, 18);
    c.fill();
  });
  add(at(rot(tor(0.3, 0.035, COL.red), 0, 0, 0), -4.4, 2.35, Z0 + 0.13));
  add(at(mesh(atlas.fit(new THREE.CircleGeometry(0.29, 24), clockFace), atlas.material, { cast: false }), -4.4, 2.35, Z0 + 0.14));
  const hourHand = at(box(0.025, 0.15, 0.01, COL.ink), 0, 0.06, 0);
  const minHand = at(box(0.018, 0.22, 0.01, COL.ink), 0, 0.09, 0);
  const hourP = at(new THREE.Group(), -4.4, 2.35, Z0 + 0.16);
  const minP = at(new THREE.Group(), -4.4, 2.35, Z0 + 0.17);
  hourP.add(hourHand);
  minP.add(minHand);
  add(hourP, minP);
  dynamic.push(hourP, minP);
  const neonTex = atlas.add(512, 190, (c, w, h) => {
    c.fillStyle = '#3b2b3f';
    roundRect(c, 4, 4, w - 8, h - 8, 40);
    c.fill();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.shadowColor = '#ff6f91';
    c.shadowBlur = 18;
    c.fillStyle = '#ffd1dc';
    c.font = `700 92px ${FONT}`;
    c.fillText('YumYum', w / 2 + 26, h / 2 + 6);
    c.fillStyle = '#ff9eb5';
    K.heartPath(c, 72, h / 2, 74);
    c.fill();
  });
  const neon = mesh(atlas.fit(new THREE.PlaneGeometry(1.7, 0.63), neonTex), new THREE.MeshStandardMaterial({ map: atlas.tex, emissive: '#ffffff', emissiveMap: atlas.tex, emissiveIntensity: 0.55, roughness: 0.5 }), { cast: false });
  add(at(neon, 2.15, 2.45, Z0 + 0.12));
  dynamic.push(neon);
  // The long counter with stools
  const CX0 = -4.7;
  const CX1 = 2.6;
  const CZ = -2.5;
  add(at(rbox(CX1 - CX0, 0.95, 0.56, COL.red, 0.05), (CX0 + CX1) / 2, 0.475, CZ));
  add(at(rbox(CX1 - CX0 + 0.14, 0.06, 0.7, '#ffffff', 0.025, { rough: 0.35 }), (CX0 + CX1) / 2, 0.98, CZ));
  add(at(box(CX1 - CX0 + 0.1, 0.04, 0.02, COL.steel, { metal: 0.5, rough: 0.3 }), (CX0 + CX1) / 2, 0.93, CZ + 0.29));
  add(at(box(CX1 - CX0, 0.1, 0.02, COL.white), (CX0 + CX1) / 2, 0.6, CZ + 0.285));
  add(at(box(CX1 - CX0, 0.1, 0.62, COL.steelDark, { metal: 0.5, rough: 0.3 }), (CX0 + CX1) / 2, 0.05, CZ));
  for (let i = 0; i < 6; i++) add(at(atlas.plane(0.22, 0.2, 64, 58, (c, w, h) => {
    c.fillStyle = COL.red;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffe1e6';
    K.heartPath(c, w / 2, h / 2, h * 0.86);
    c.fill();
  }), CX0 + 0.6 + i * 1.22, 0.32, CZ + 0.285));
  col((CX0 + CX1) / 2, CZ, (CX1 - CX0) / 2 + 0.07, 0.35, 1.01);
  const STOOLS = [-4.0, -2.8, -1.6, -0.4, 0.8, 2.0];
  for (const x of STOOLS) {
    add(at(K.makeStool(COL.cherry), x, 0, -1.72));
    circ(x, -1.72, 0.22, 0.71);
  }
  // On the counter: napkins, sauces, a tip jar and the register
  for (const x of [-3.4, -0.95, 1.4]) {
    add(at(rbox(0.18, 0.12, 0.1, '#c3cbd3', 0.02, { metal: 0.4, rough: 0.35 }), x, 1.07, CZ - 0.05));
    add(at(box(0.14, 0.03, 0.08, '#ffffff'), x, 1.14, CZ - 0.05));
    add(at(cyl(0.035, 0.04, 0.16, COL.cherry, 10), x + 0.18, 1.09, CZ - 0.05));
    add(at(cyl(0.035, 0.04, 0.16, COL.sun, 10), x + 0.27, 1.09, CZ - 0.05));
  }
  const register = K.makeRegister();
  register.show('YUM');
  K.colorBake(register.group, [register.screen]);
  add(at(rot(register.group, 0, 0.35, 0), 2.15, 1.01, CZ - 0.02));
  const jar = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 16, 1, true), domeMat, { cast: false });
  add(at(jar, 1.65, 1.12, CZ + 0.05));
  dynamic.push(jar);
  add(at(cyl(0.09, 0.09, 0.08, '#f4c24f', 14, { metal: 0.5, rough: 0.35 }), 1.65, 1.05, CZ + 0.05));
  // A gumball machine and a plant by the door
  add(at(cyl(0.16, 0.2, 0.5, COL.red, 16), 1.0, 0.25, 3.9));
  add(at(sph(0.24, '#f2fbff', { rough: 0.1 }, 16), 1.0, 0.72, 3.9));
  for (let i = 0; i < 9; i++) add(at(sph(0.05, [COL.sun, COL.hotpink, COL.mint, '#6fb8ff'][i % 4], undefined, 8), 1.0 + Math.cos(i * 2.1) * 0.12, 0.62 + (i % 3) * 0.08, 3.9 + Math.sin(i * 2.1) * 0.12));
  add(at(cyl(0.05, 0.05, 0.06, COL.red, 10), 1.0, 0.98, 3.9));
  circ(1.0, 3.9, 0.25);
  add(at(K.makePlant(0.9, COL.teal), -4.9, 0, 4.2));
  circ(-4.9, 4.2, 0.22);

  // ---------------------------------------------------------------- dining room
  // Windows above the booths, posters between them
  for (const x of BOOTHS) add(at(K.windowMesh(1.3, 0.85), x, 2.15, Z0 + 0.12));
  const poster = (draw, x) => {
    add(at(rbox(0.66, 0.86, 0.04, COL.white, 0.03), x, 1.95, Z0 + 0.12));
    add(at(atlas.plane(0.56, 0.76, 180, 244, draw), x, 1.95, Z0 + 0.145));
  };
  poster((c, w, h) => {
    c.fillStyle = '#ffe1e6';
    c.fillRect(0, 0, w, h);
    K.ICON_DRAW.shake(c, w / 2, h * 0.45, h * 0.6, '#ff9eb5');
    c.fillStyle = COL.hotpink;
    c.font = `700 ${h * 0.11}px ${FONT}`;
    c.textAlign = 'center';
    c.fillText('Shakes!', w / 2, h * 0.88);
  }, 6.85);
  poster((c, w, h) => {
    c.fillStyle = '#e6f7f1';
    c.fillRect(0, 0, w, h);
    K.ICON_DRAW.burger(c, w / 2, h * 0.42, h * 0.55, ['cheese', 'lettuce', 'tomato']);
    c.fillStyle = COL.teal;
    c.font = `700 ${h * 0.1}px ${FONT}`;
    c.textAlign = 'center';
    c.fillText('Yum!', w / 2, h * 0.86);
  }, 9.75);
  // Booths: two padded benches facing each other across a table
  const benchColors = [COL.cherry, COL.teal, COL.cherry];
  BOOTHS.forEach((x, i) => {
    add(at(K.makeDinerTable(0.8, 1.3, '#ffffff', COL.red), x, 0, BOOTH_Z));
    for (const s of [-1, 1]) {
      const b = K.makeBench(1.35, benchColors[i], COL.white);
      b.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2;
      add(at(b, x + s * 0.8, 0, BOOTH_Z + 0.02));
      col(x + s * 0.82, BOOTH_Z, 0.3, 0.7, 0.53);
    }
    col(x, BOOTH_Z, 0.42, 0.66, 0.78);
    add(at(rbox(0.14, 0.1, 0.08, '#c3cbd3', 0.02, { metal: 0.4, rough: 0.35 }), x, 0.83, BOOTH_Z - 0.55));
    add(at(cyl(0.03, 0.035, 0.14, COL.cherry, 10), x - 0.12, 0.85, BOOTH_Z - 0.55));
    add(at(cyl(0.03, 0.035, 0.14, COL.sun, 10), x + 0.12, 0.85, BOOTH_Z - 0.55));
  });
  // Round tables in the middle
  const TABLES = [[6.3, 0.4], [9.9, 0.6]];
  for (const [x, z] of TABLES) {
    add(at(K.makeRoundTable(0.45, '#ffffff'), x, 0, z));
    circ(x, z, 0.47, 0.78);
    add(at(K.makeChair(COL.mint), x, 0, z - 0.62));
    circ(x, z - 0.62, 0.22, 0.49);
    add(at(rot(K.makeChair(COL.pink), 0, -Math.PI / 2, 0), x + 0.66, 0, z));
    circ(x + 0.66, z, 0.22, 0.49);
    add(at(rot(K.makeChair(COL.sun), 0, Math.PI / 2, 0), x - 0.66, 0, z));
    circ(x - 0.66, z, 0.22, 0.49);
    const vase = new THREE.Group();
    vase.add(at(cyl(0.045, 0.055, 0.13, COL.mint, 12), 0, 0.065, 0));
    for (const [vx, vz, c] of [[0, 0, COL.hotpink], [0.04, 0.02, COL.sun], [-0.04, 0.01, '#ffffff']]) vase.add(at(sph(0.032, c, undefined, 10), vx, 0.18, vz));
    add(at(vase, x + 0.18, 0.775, z - 0.18));
  }
  // Planter divider between the counter and the dining room
  add(at(rbox(0.42, 0.62, 2.8, COL.woodDark, 0.05), DX, 0.31, 0.2));
  add(at(box(0.32, 0.06, 2.7, '#7a5236'), DX, 0.63, 0.2));
  for (let i = 0; i < 6; i++) add(at(sph(0.17, i % 2 ? COL.leaf : '#6fc46a', { rough: 0.85 }, 12), DX + (i % 2 ? 0.05 : -0.05), 0.78, -1.0 + i * 0.48));
  for (let i = 0; i < 5; i++) add(at(sph(0.05, [COL.hotpink, COL.sun, '#ffffff'][i % 3], undefined, 8), DX + 0.1, 0.92, -0.8 + i * 0.5));
  col(DX, 0.2, 0.22, 1.42, 0.8);
  add(at(K.makePlant(1.0, COL.orange), 12.4, 0, -2.2));
  circ(12.4, -2.2, 0.24);
  add(at(K.makePlant(0.8, COL.teal), 12.4, 0, 4.2));
  circ(12.4, 4.2, 0.22);
  // A reserved table for Roji and Homama, with a heart balloon
  add(at(K.makeRoundTable(0.42, '#ffffff'), 5.9, 0, 3.0));
  circ(5.9, 3.0, 0.45, 0.78);
  add(at(rot(K.makeChair(COL.pink), 0, Math.PI / 2, 0), 5.25, 0, 3.0));
  circ(5.25, 3.0, 0.22, 0.49);
  add(at(rot(K.makeChair(COL.mint), 0, -Math.PI / 2, 0), 6.55, 0, 3.0));
  circ(6.55, 3.0, 0.22, 0.49);
  add(at(atlas.plane(0.26, 0.15, 120, 70, (c, w, h) => K.drawLabel(c, w, h, 'Reserved', { edge: COL.hotpink, ink: COL.hotpink, size: 0.4 })), 5.9, 0.86, 3.0));
  add(at(rot(box(0.27, 0.16, 0.01, COL.white), -0.3, 0, 0), 5.9, 0.85, 2.98));
  const balloon = new THREE.Group();
  const heartGeo = new THREE.ExtrudeGeometry(ctx.util.heartShape(0.42), { depth: 0.1, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 18 });
  heartGeo.center();
  const heart = mesh(heartGeo, umat(COL.hotpink, { rough: 0.3 }));
  heart.rotation.z = Math.PI;
  balloon.add(at(heart, 0, 0, 0));
  const string = mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.2, 4), mat('#ffffff'), { cast: false });
  balloon.add(at(string, 0, -0.78, 0));
  balloon.position.set(6.55, 2.05, 2.75);
  add(balloon);
  dynamic.push(balloon);
  for (const [x, z] of [[4.4, 4.3], [12.4, 1.95]]) {
    add(at(K.makePlant(0.75, COL.mint), x, 0, z));
    circ(x, z, 0.2);
  }

  // Jukebox in the corner with a little dance rug
  const juke = K.makeJukebox(atlas);
  juke.group.rotation.y = -0.75;
  add(at(juke.group, JUKE.x, 0, JUKE.z));
  dynamic.push(juke.record, ...juke.group.children.filter((o) => o.isMesh && juke.lights.includes(o.material)));
  circ(JUKE.x, JUKE.z, 0.55);
  const rugTex = canvasTexture(256, 256, (c, w) => {
    c.fillStyle = '#fff8ec';
    c.beginPath();
    c.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2);
    c.fill();
    c.save();
    c.beginPath();
    c.arc(w / 2, w / 2, w / 2 - 14, 0, Math.PI * 2);
    c.clip();
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      c.fillStyle = (i + j) % 2 ? COL.hotpink : '#ffffff';
      c.fillRect((i * w) / 8, (j * w) / 8, w / 8, w / 8);
    }
    c.restore();
  });
  const rug = mesh(new THREE.CircleGeometry(1.1, 36), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.9 }), { cast: false });
  rug.rotation.x = -Math.PI / 2;
  add(at(rug, 10.7, 0.012, 2.3));

  // ---------------------------------------------------------------- people (baked into the room)
  const r = K.rng(7);
  const people = [];
  const eaters = [];
  const cheeks = (look) => mat('#' + new THREE.Color(look.skin).lerp(new THREE.Color('#ff8fa0'), look.gender === 'girl' ? 0.5 : 0.32).getHexString());
  const person = (look, { x, z, y = 0, yaw = 0, pose = 'sit', hands = null, eat = false, dress }) => {
    const k = K.lowPolyKid(ctx.makeKid(look));
    dress?.(k);
    k.pose = pose;
    k.hands = hands;
    k.blinkTimer = 1e9;
    for (let i = 0; i < 40; i++) k.update(1 / 30, 0, 0, 0, 0);
    k.root.traverse((o) => {
      if (!o.isMesh || o === k.blob) return;
      if (o.material.transparent) o.material = cheeks(look);
      o.castShadow = false;
    });
    k.blob.visible = pose === 'stand';
    k.root.position.set(x, y, z);
    k.root.rotation.y = yaw;
    add(k.root);
    if (eat) {
      const arm = k.arms[1];
      K.colorBake(arm);
      arm.traverse((o) => (o.castShadow = false));
      dynamic.push(arm);
      eaters.push({ k, arm, phase: r() * 6, base: arm.rotation.clone() });
    }
    people.push(k);
    return k;
  };
  const look = () => K.guestLook(r);
  const cook = person({ ...look(), gender: 'boy', hairstyle: 'curly', outfit: 'tee-pants', top: '#7fd3a7', name: 'Cook' }, { x: IX, z: IZ - 0.85, pose: 'stand', dress: (k) => K.dressChef(k) });
  const cookArms = cook.arms;
  for (const a of cookArms) {
    K.colorBake(a);
    a.traverse((o) => (o.castShadow = false));
  }
  dynamic.push(...cookArms);
  const server = person({ ...look(), gender: 'girl', hairstyle: 'ponytail', outfit: 'skirt', top: '#ffd166', name: 'Server' }, { x: 0.9, z: -3.35, pose: 'stand', dress: (k) => K.dressChef(k, { hat: false, trim: COL.red }) });
  const serverArm = server.arms[1];
  K.colorBake(serverArm);
  dynamic.push(serverArm);
  person(look(), { x: -4.0, z: -1.72, y: 0.4, yaw: Math.PI, eat: true });
  person(look(), { x: -1.6, z: -1.72, y: 0.4, yaw: Math.PI + 0.7, eat: true });
  // Booth 2 and 3 guests face each other; a guest at a round table faces the room
  const boothSeat = (i, s) => ({ x: BOOTHS[i] + s * 0.66, z: BOOTH_Z + 0.05, y: SEAT_Y, yaw: s < 0 ? Math.PI / 2 : -Math.PI / 2 });
  person(look(), { ...boothSeat(1, -1), eat: true });
  person(look(), { ...boothSeat(1, 1), eat: true });
  person(look(), { ...boothSeat(2, -1), eat: true });
  person(look(), { ...boothSeat(2, 1) });
  person(look(), { x: TABLES[1][0], z: TABLES[1][1] - 0.62, y: 0.18, yaw: 0, eat: true });

  // Food on the tables (shared props load in the background)
  const props = ctx.props;
  const propAt = (id, size, x, y, z, ry = 0) =>
    props
      ?.food(id)
      .then((o) => {
        const f = fit(o, size);
        f.position.set(x, y, z);
        f.rotation.y = ry;
        g.add(f);
        return f;
      })
      .catch(() => null);
  propAt('burger', 0.26, BOOTHS[1] - 0.2, 0.775, BOOTH_Z + 0.2, 0.6);
  propAt('milkshake', 0.26, BOOTHS[1] - 0.2, 0.775, BOOTH_Z - 0.2);
  propAt('fries', 0.22, BOOTHS[1] + 0.2, 0.775, BOOTH_Z + 0.1, -0.6);
  propAt('shawarma', 0.26, BOOTHS[2] - 0.2, 0.775, BOOTH_Z + 0.15, 0.4);
  propAt('mansaf', 0.36, BOOTHS[2] + 0.15, 0.775, BOOTH_Z - 0.05);
  propAt('pecan-cake', 0.24, TABLES[1][0], 0.775, TABLES[1][1] - 0.05);
  propAt('milkshake', 0.24, -4.0, 1.01, CZ - 0.1);
  propAt('fries', 0.2, -1.6, 1.01, CZ - 0.1);
  for (const d of domes) propAt(d.id, 0.34, d.x, 1.11, -4.6);

  // ---------------------------------------------------------------- music notes, steam, hearts
  const noteTex = canvasTexture(64, 64, (c) => {
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#ffffff';
    c.lineWidth = 6;
    c.beginPath();
    c.ellipse(22, 46, 11, 8, -0.4, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(31, 44);
    c.lineTo(31, 10);
    c.quadraticCurveTo(44, 16, 50, 28);
    c.stroke();
  });
  const notes = [];
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTex, color: [COL.hotpink, '#7fe0d0', COL.sun][i % 3], transparent: true, depthWrite: false, opacity: 0 }));
    s.scale.setScalar(0.3);
    s.visible = false;
    add(s);
    dynamic.push(s);
    notes.push({ s, life: 0, x: 0 });
  }
  const steam = [];
  for (let i = 0; i < 6; i++) {
    const s = K.glowSprite('#ffffff', 0);
    add(s);
    dynamic.push(s);
    steam.push(s);
  }

  // ---------------------------------------------------------------- activities
  const carried = { roji: null, homama: null };
  const dropShakes = (api) => {
    for (const id of ['roji', 'homama']) {
      if (!carried[id]) continue;
      if (api.actor(id).kid.carried === carried[id].group) api.carry(id, null);
      carried[id] = null;
    }
  };

  // Run the kitchen: Roji or Homama steps up to the grill, then the YumYum Kitchen game opens
  function runKitchen(api) {
    if (!api.hasArena('cooking')) return api.toast('The kitchen opens soon.');
    dropShakes(api);
    let tt = 0;
    let started = false;
    const me = api.playerId;
    api.activity({
      label: 'Stop',
      seats: [
        { who: 'player', x: -10.55, z: -3.6, yaw: Math.PI, pose: 'stand', hands: 'stir' },
        { who: 'partner', x: -11.6, z: -2.9, yaw: Math.PI * 0.8, pose: 'stand' },
      ],
      focus: { x: -10.3, z: -3.4, y: 1.1, zoom: 0.5 },
      exit: { x: -10.9, z: -2.6 },
      update(dt) {
        tt += dt;
        if (started || tt < 1.3) return;
        started = true;
        api.playArena('cooking').then((res) => {
          if (api.activityRunning) api.endActivity();
          if (!res || res.quit || res.error) return;
          const coins = res.coins ?? 0;
          if (res.win) {
            api.emote('player', 'cheer');
            setTimeout(() => api.emote('partner', 'heart'), 400);
            api.fx.heartsAt(api.world(-10.4, -3.0, 1.6), 6);
            api.toast(`<b>${NAME[me]}</b> earned <b>${coins} coins</b> in the kitchen. ${NAME[api.partnerId]}: "Chef of the year!"`, 3600);
          } else api.toast(`<b>${coins} coins</b> this shift. ${NAME[api.partnerId]}: "Next shift is yours, I can feel it."`, 3400);
          api.save('lastShift', coins);
        });
      },
    });
    api.toast(`${NAME[me]} puts on the chef hat...`, 1600);
    api.sound.ui('pop');
  }

  // Eat at a booth: both sit in the first booth, food arrives and they share it
  let meal = null;
  async function eatAtBooth(api) {
    const choice = await api.choose({ title: "Roji's YumYum", text: 'What would you like today?', options: MEALS.map(({ id, label, sub }) => ({ id, label, sub })) });
    if (!choice) return;
    const m = MEALS.find((q) => q.id === choice);
    const xb = BOOTHS[0];
    const objs = [];
    const onTable = [];
    // Milkshakes in hand go on the table
    for (const [id, dx] of [[api.playerId, -0.28], [api.partnerId, 0.28]]) {
      const c = carried[id];
      if (!c) continue;
      if (api.actor(id).kid.carried === c.group) api.carry(id, null);
      c.group.scale.setScalar(0.85);
      c.group.position.set(xb + dx, 0.775, BOOTH_Z - 0.42);
      g.add(c.group);
      onTable.push(c.group);
      carried[id] = null;
    }
    let tt = 0;
    let step = 0;
    meal = { m, objs };
    const st = meal;
    api.activity({
      label: 'Get up',
      seats: [
        { who: 'player', x: xb - 0.66, z: BOOTH_Z + 0.05, y: SEAT_Y, yaw: Math.PI / 2, pose: 'sit' },
        { who: 'partner', x: xb + 0.66, z: BOOTH_Z + 0.05, y: SEAT_Y, yaw: -Math.PI / 2, pose: 'sit' },
      ],
      focus: { x: xb, z: BOOTH_Z + 0.2, y: 0.85, zoom: 0.48 },
      exit: { x: xb - 0.3, z: BOOTH_Z + 1.5 },
      update(dt, t) {
        tt += dt;
        if (step === 0 && tt > 1.2) {
          step = 1;
          const spots = [[m.food[0], xb - 0.2, BOOTH_Z + 0.12, 0.26], [m.food[1], xb + 0.2, BOOTH_Z + 0.12, 0.26], [m.middle, xb, BOOTH_Z - 0.25, m.middle === 'mansaf' ? 0.42 : 0.24]];
          for (const [id, x, z, size] of spots) {
            if (!id) continue;
            propAt(id, size, x, 0.775, z, x < xb ? Math.PI / 2 : x > xb ? -Math.PI / 2 : 0)?.then((f) => {
              if (!f) return;
              if (meal !== st) return f.removeFromParent();
              f.userData.k = 0;
              f.scale.setScalar(0.01);
              objs.push(f);
            });
          }
          api.sound.ui('pop');
          api.toast('Here you go! Fresh from the YumYum kitchen.', 2200);
        }
        for (const f of objs) {
          f.userData.k = Math.min(1, f.userData.k + dt * 2.5);
          const bite = step >= 3 ? Math.max(0.55, 1 - (tt - 4.6) * 0.06) : 1;
          f.scale.setScalar(Math.max(0.01, easeOutBack(f.userData.k) * bite));
        }
        if (step >= 1 && step < 4) {
          for (const a of [api.player, api.partner]) a.kid.hands = Math.sin(t * 3 + (a === api.partner ? 1.4 : 0)) > 0.3 ? 'hold' : null;
        }
        if (step === 1 && tt > 2.6) {
          step = 2;
          for (let i = 0; i < 3; i++) steam[i].userData.on = true;
        }
        if (step === 2 && tt > 4.4) {
          step = 3;
          api.fx.heartsAt(api.world(xb, BOOTH_Z, 1.5), 6);
          api.sound.ui('good');
          const [a, b] = LINES[m.id];
          api.toast(`<b>${NAME[api.playerId]}:</b> ${a}<br><b>${NAME[api.partnerId]}:</b> ${b}`, 3600);
        }
        if (step === 3 && tt > 9) {
          step = 4;
          for (const a of [api.player, api.partner]) a.kid.hands = null;
          api.fx.heartsAt(api.world(xb, BOOTH_Z, 1.4), 4);
          for (const s of steam) s.userData.on = false;
        }
      },
      onEnd() {
        for (const f of objs) f.removeFromParent();
        for (const o of onTable) o.removeFromParent();
        for (const s of steam) s.userData.on = false;
        meal = null;
      },
    });
    api.toast(`${NAME[api.playerId]} and ${NAME[api.partnerId]} slide into the cosy booth.`, 2200);
  }

  // Play the jukebox: a song plays, the lights dance and so do Roji and Homama
  let songIndex = 0;
  let playing = null;
  function playJukebox(api) {
    dropShakes(api);
    const song = SONGS[songIndex++ % SONGS.length];
    const st = { song, next: 0, i: 0, t: 0 };
    playing = st;
    api.activity({
      label: 'Stop dancing',
      seats: [
        { who: 'player', x: 10.35, z: 2.45, yaw: 0.35, pose: 'stand' },
        { who: 'partner', x: 11.15, z: 2.1, yaw: -0.4, pose: 'stand' },
      ],
      focus: { x: 10.9, z: 1.8, y: 0.9, zoom: 0.56 },
      night: 0.3,
      music: 0.12,
      exit: { x: 10.3, z: 3.2 },
      update(dt) {
        st.t += dt;
        for (const a of [api.player, api.partner]) {
          a.kid.danceLoop = true;
          if (a.kid.emoteType !== 'dance') a.kid.emote('dance');
        }
        const s = api.sound;
        const ac = s?.ctx;
        if (!ac || s.muted) return;
        const beat = 60 / song.bpm / 2;
        if (st.next < ac.currentTime) st.next = ac.currentTime + 0.06;
        const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
        while (st.next < ac.currentTime + 0.25) {
          const step = st.i % 32;
          const chord = song.chords[Math.floor(step / 8)];
          const m = song.melody[step];
          if (m) {
            s.tone(N(m), st.next, beat * 1.6, { type: 'square', gain: 0.022 });
            s.tone(N(m), st.next, beat * 2.2, { type: 'triangle', gain: 0.05 });
          }
          if (step % 4 === 0) s.tone(N(chord[0] - 12), st.next, beat * 1.8, { type: 'triangle', gain: 0.09 });
          if (step % 4 === 2) s.tone(N(chord[2] - 12), st.next, beat * 1.4, { type: 'triangle', gain: 0.07 });
          if (step % 2 === 1) for (const n of chord) s.tone(N(n), st.next, beat * 0.5, { type: 'square', gain: 0.008 });
          s.tone(step % 2 ? 5200 : 4200, st.next, 0.03, { type: 'square', gain: 0.006 });
          st.next += beat;
          st.i++;
        }
      },
      onEnd() {
        playing = null;
        for (const a of [api.roji, api.homama]) a.kid.danceLoop = false;
      },
    });
    api.toast(`Now playing: <b>${song.name}</b>`, 2400);
    api.sound.ui('coin');
  }

  // Order a milkshake: pick a flavour, the mixer whirs, and both kids get one to carry around
  function orderShake(api) {
    if (carried[api.playerId]) return api.toast('Finish this milkshake first!', 1800);
    api.choose({ title: 'Milkshake bar', text: `Pick a flavour. ${NAME[api.partnerId]} gets one too.`, options: SHAKES }).then((flavour) => {
      if (!flavour) return;
      let tt = 0;
      let done = false;
      api.activity({
        label: 'Done',
        seats: [
          { who: 'player', x: -3.4, z: -1.15, yaw: Math.PI, pose: 'stand' },
          { who: 'partner', x: -2.6, z: -1.05, yaw: Math.PI - 0.3, pose: 'stand' },
        ],
        focus: { x: -3.1, z: -3.2, y: 1.2, zoom: 0.5 },
        update(dt, t) {
          tt += dt;
          if (!done) {
            mixer.spin.rotation.y += dt * 40;
            mixer.cup.position.x = Math.sin(t * 50) * 0.006;
            if (Math.random() < dt * 12) tone(api, 120 + Math.random() * 40, 0.08, { type: 'sawtooth', gain: 0.012 });
          }
          if (!done && tt > 1.8) {
            done = true;
            mixer.cup.position.x = 0;
            for (const who of [api.playerId, api.partnerId]) {
              const sh = K.makeShake(flavour);
              sh.group.scale.setScalar(1.15);
              sh.group.position.set(0, -0.12, 0.02);
              carried[who] = { group: sh.group, shake: sh, sips: 0, t: 1.5 + (who === api.partnerId ? 1.2 : 0) };
              api.carry(who, sh.group);
            }
            api.sound.ui('pop');
            api.fx.heartsAt(api.world(-3.0, -1.1, 1.6), 4);
            api.toast(`Two ${flavour} milkshakes with whipped cream and a cherry on top.`, 2600);
          }
          if (done && tt > 2.6) api.endActivity();
        },
      });
      api.toast('The mixer whirs...', 1500);
    });
  }

  // Read the menu
  function readMenu(api) {
    api.focus({ x: -1.15, z: -4.4, y: 2.0, zoom: 0.42 });
    api.toast("Burgers, fries, milkshakes, shawarma, mansaf and cakes. <b>Roji's favourite:</b> the pecan cake.", 3600);
    after(3.7, () => api.focus(null));
  }

  hotspots.push(
    { x: -10.55, z: -3.25, r: 1.5, label: 'Run the kitchen', icon: 'chef', act: runKitchen },
    { x: BOOTHS[0], z: -2.3, r: 1.5, label: 'Eat at a booth', icon: 'yum', act: eatAtBooth },
    { x: 10.9, z: 1.75, r: 1.5, label: 'Play the jukebox', icon: 'music', act: playJukebox },
    { x: -3.0, z: -1.05, r: 1.3, label: 'Order a milkshake', icon: 'shake', act: orderShake },
    { x: -1.15, z: -0.6, r: 1.2, label: 'Read the menu', icon: 'note', act: readMenu },
  );

  // ---------------------------------------------------------------- update
  const juiceCol = new THREE.Color();
  let steamT = 0;
  function update(dt, t, api) {
    for (let i = later.length - 1; i >= 0; i--) {
      later[i].t -= dt;
      if (later[i].t <= 0) {
        const f = later[i].fn;
        later.splice(i, 1);
        f();
      }
    }
    const party = !!playing;
    // Diners eat; while the jukebox plays they wave along
    for (const e of eaters) {
      const k = Math.max(0, Math.sin(t * 1.4 + e.phase));
      if (party) e.arm.rotation.set(0, 0, -2.2 - Math.sin(t * 9 + e.phase) * 0.35);
      else e.arm.rotation.set(e.base.x - k * 1.4, e.base.y, e.base.z - k * 0.25);
    }
    // The cook chops and flips, the server polishes the counter
    const [cl, cr] = cookArms;
    cl.rotation.set(-1.1 + Math.max(0, Math.sin(t * 9)) * 0.35, 0, -0.25);
    cr.rotation.set(-1.0 + Math.sin(t * 3) * 0.25, Math.cos(t * 3) * 0.3, 0.2);
    serverArm.rotation.set(-1.1, Math.sin(t * 2.4) * 0.5, 0.3);
    // Sizzle on the grill, bubbles in the fryer
    steamT -= dt;
    if (steamT <= 0) {
      steamT = 0.22;
      const s = steam.find((q) => !(q.userData.life > 0));
      if (s) {
        const onBooth = steam.indexOf(s) < 3 && s.userData.on;
        const p = onBooth ? new THREE.Vector3(BOOTHS[0] + (Math.random() - 0.5) * 0.4, 0.95, BOOTH_Z) : sizzle[Math.floor(Math.random() * 3)];
        s.userData.life = 1;
        s.position.set(p.x + (Math.random() - 0.5) * 0.15, p.y, p.z);
      }
    }
    for (const s of steam) {
      if (!(s.userData.life > 0)) {
        s.visible = false;
        continue;
      }
      s.visible = true;
      s.userData.life -= dt * 0.9;
      s.position.y += dt * 0.5;
      s.scale.setScalar(0.12 + (1 - s.userData.life) * 0.35);
      s.material.opacity = Math.max(0, s.userData.life) * 0.4;
    }
    fryer.basket.position.x = Math.sin(t * 25) * 0.003;
    // Clock
    minP.rotation.z = -(t / 60) * Math.PI * 2;
    hourP.rotation.z = -((t / 60 + 2) / 12) * Math.PI * 2;
    // Neon hum and the jukebox
    neon.material.emissiveIntensity = 0.5 + Math.sin(t * 3) * 0.06 + (party ? Math.abs(Math.sin(t * 8)) * 0.3 : 0);
    juke.lights.forEach((m, i) => {
      if (party) {
        juiceCol.setHSL((t * 0.4 + i * 0.18) % 1, 0.85, 0.62);
        m.emissive.copy(juiceCol);
        m.emissiveIntensity = 1.1;
      } else m.emissiveIntensity = 0.55 + Math.sin(t * 2 + i) * 0.2;
    });
    juke.record.rotation.y += dt * (party ? 6 : 0);
    balloon.position.y = 2.05 + Math.sin(t * 1.3) * 0.06;
    balloon.rotation.z = Math.sin(t * 0.9) * 0.08;
    balloon.rotation.y = Math.sin(t * 0.5) * 0.4;
    for (const n of notes) {
      if (n.life > 0) {
        n.life -= dt * 0.5;
        n.s.position.y += dt * 0.6;
        n.s.position.x = n.x + Math.sin(n.life * 8) * 0.12;
        n.s.material.opacity = Math.min(1, n.life * 2);
        if (n.life <= 0) n.s.visible = false;
      } else if (party && Math.random() < dt * 1.6) {
        n.life = 1;
        n.x = JUKE.x - 0.3 + (Math.random() - 0.5) * 0.5;
        n.s.position.set(n.x, 1.7, JUKE.z + 0.3);
        n.s.visible = true;
      }
    }
    // Milkshakes in hand: a slow sip every few seconds until they are gone
    for (const id of ['roji', 'homama']) {
      const c = carried[id];
      if (!c) continue;
      const a = api.actor(id);
      if (a.kid.carried !== c.group) {
        carried[id] = null;
        continue;
      }
      c.t -= dt;
      if (c.t <= 0) {
        c.t = 3.2;
        c.sips++;
        c.shake.setFill(Math.max(0, 1 - c.sips / 3));
        if (c.sips === 1) c.shake.setTop(false);
        a.kid.squash = 1.1;
        tone(api, 520, 0.12, { type: 'triangle', gain: 0.025, slideTo: 300 });
        if (c.sips >= 3) {
          api.carry(id, null);
          carried[id] = null;
          api.fx.heartsAt(a.kid.head.localToWorld(new THREE.Vector3(0, 0.75, 0)), 3);
          if (id === api.playerId) api.toast('Slurp! All gone. That was yummy.', 2000);
        }
      }
    }
  }

  K.colorBake(fryer.basket, [fryer.fries]);
  for (const o of [mixer.spin, mixer.cup, juke.record]) K.colorBake(o);
  K.trimShadows(g, [], { size: 0.22, wallZ: Z0 + 0.4 });
  K.colorBake(g, dynamic);

  return {
    group: g,
    dynamic,
    colliders,
    hotspots,
    size: { w: X1 - X0, d: Z1 - Z0 },
    spawn: { x: -1, z: 3.4, yaw: Math.PI },
    exit: { x: -1, z: 4.35 },
    background: '#ffe3d3',
    update,
    onExit(api) {
      dropShakes(api);
      playing = null;
    },
  };
}
