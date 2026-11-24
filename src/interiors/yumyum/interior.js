import { ICONS } from '../../icons.js';
import * as K from './kit.js';
import * as T from './theme.js';

// Inside Roji's YumYum, open at the front like a dollhouse, dressed like Roji's logo card (cream, raspberry,
// light pink, olive and brass): open kitchen (grill, fryer, prep island, the cook) | counter with stools,
// the arched menu board, the logo card and the shake bar | dining room with booths under arched windows,
// niches, round tables and a jukebox.

const { THREE, COL, box, rbox, cyl, sph, tor, at, rot, mat, umat, mesh, canvasTexture, FONT } = K;

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
  { id: 'cake', label: 'Cake and Spanish latte', sub: "Roji's sweet favourite", food: ['pecan-cake', 'german-cake'], middle: 'spanish-latte' },
];
const LINES = {
  burger: ['This is the best burger on the island!', 'Extra cheese, just how you like it.'],
  shawarma: ['Warm, garlicky and perfect.', 'One more bite, then I share!'],
  mansaf: ['Mansaf, just like a family feast.', 'We should come here every Friday.'],
  cake: ['Cake tastes better with you.', 'A Spanish latte and a sweet date.'],
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
  add(at(box(X1 - X0 + 0.6, 0.6, Z1 - Z0 + 0.6, COL.frame), 0, -0.33, 0.1));
  const diamond = (c, x, y, r) => {
    c.beginPath();
    c.moveTo(x, y - r);
    c.lineTo(x + r, y);
    c.lineTo(x, y + r);
    c.lineTo(x - r, y);
    c.closePath();
    c.fill();
  };
  const star = (c, x, y, r) => {
    for (const a of [0, Math.PI / 4]) {
      c.save();
      c.translate(x, y);
      c.rotate(a);
      c.fillRect(-r, -r, 2 * r, 2 * r);
      c.restore();
    }
  };
  // Stretch a geometry's UVs so walls of different lengths can share one repeating material
  const uvScale = (geo, su, sv = 1) => {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    return geo;
  };
  // Kitchen: cream tiles with blush grout; counter: rose star tiles; dining room: honey planks
  const tiles = K.pattern(128, 128, '#fbf3e6', (c, w) => {
    c.fillStyle = '#efd8ce';
    for (let i = 0; i <= 2; i++) {
      c.fillRect((i * w) / 2 - 2, 0, 4, w);
      c.fillRect(0, (i * w) / 2 - 2, w, 4);
    }
    c.fillStyle = COL.band;
    for (const [x, y] of [[0, 0], [w, 0], [0, w], [w, w], [w / 2, w / 2], [w / 2, 0], [0, w / 2], [w, w / 2], [w / 2, w]]) diamond(c, x, y, 8);
  }, (KX - X0) / 1.2, (Z1 - Z0) / 1.2);
  const starTiles = K.pattern(256, 256, '#fbefe2', (c, w) => {
    c.fillStyle = '#ebcfc5';
    c.fillRect(0, 0, w, 5);
    c.fillRect(0, 0, 5, w);
    c.fillStyle = '#f3d3cb';
    star(c, w / 2, w / 2, w * 0.24);
    c.fillStyle = '#fbefe2';
    star(c, w / 2, w / 2, w * 0.16);
    c.fillStyle = '#e8a4a6';
    star(c, w / 2, w / 2, w * 0.065);
    c.fillStyle = '#c9cfa9';
    for (const [x, y] of [[0, 0], [w, 0], [0, w], [w, w]]) diamond(c, x, y, w * 0.09);
  }, (DX - KX) / 1.3, (Z1 - Z0) / 1.3);
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
  floor(KX, DX, starTiles);
  floor(DX, X1, planks);

  // Walls: cream glazed tiles in the kitchen, soft cream plaster elsewhere
  const wallTiles = K.pattern(128, 128, '#fbf4e8', (c, w) => {
    c.fillStyle = '#eedcd2';
    for (let i = 0; i <= 4; i++) {
      c.fillRect((i * w) / 4 - 1.5, 0, 3, w);
      c.fillRect(0, (i * w) / 4 - 1.5, w, 3);
    }
  }, (KX - X0) / 1.0, WALL_H / 1.0);
  const plaster = K.pattern(256, 256, '#fbf0dc', (c, w) => {
    const pr = K.rng(3);
    for (let i = 0; i < 900; i++) {
      c.fillStyle = pr() < 0.5 ? 'rgba(214,160,150,0.09)' : 'rgba(255,255,255,0.35)';
      c.beginPath();
      c.arc(pr() * w, pr() * w, 1 + pr() * 2.5, 0, Math.PI * 2);
      c.fill();
    }
  }, (X1 - KX) / 2.5, WALL_H / 2.5);
  const plasterMat = new THREE.MeshStandardMaterial({ map: plaster, roughness: 0.92 });
  const wallSeg = (x0, x1, m) => add(at(mesh(new THREE.BoxGeometry(x1 - x0, WALL_H, 0.2), m), (x0 + x1) / 2, WALL_H / 2, Z0));
  const tileWallMat = new THREE.MeshStandardMaterial({ map: wallTiles, roughness: 0.5 });
  wallSeg(X0, KX, tileWallMat);
  wallSeg(KX, X1, plasterMat);
  // Blush wainscot with a raspberry rail; in the dining room it carries a row of little pink arches
  add(at(box(DX - KX, 1.0, 0.06, COL.blush), (KX + DX) / 2, 0.5, Z0 + 0.12));
  add(at(box(DX - KX, 0.07, 0.1, COL.raspDeep), (KX + DX) / 2, 1.02, Z0 + 0.13));
  const arcade = K.pattern(256, 256, '#f2d3cd', (c, w, h) => {
      const k = w / 0.9;
      const p = new Path2D();
      T.archPoints(0.56, 0.4, 0.26).forEach(([x, y], i) => (i ? p.lineTo(w / 2 + x * k, h - 0.12 * k - y * k) : p.moveTo(w / 2 + x * k, h - 0.12 * k - y * k)));
      p.closePath();
      c.fillStyle = '#f8e4de';
      c.fill(p);
      c.lineJoin = 'round';
      c.strokeStyle = COL.band;
      c.lineWidth = 7;
      c.stroke(p);
      c.fillStyle = COL.rasp;
      K.heartPath(c, w / 2, h - 0.5 * k, 26);
      c.fill();
    }, (X1 - DX) / 0.9, 1);
  const arcadeMat = new THREE.MeshStandardMaterial({ map: arcade, roughness: 0.85 });
  add(at(mesh(new THREE.BoxGeometry(X1 - DX, 0.9, 0.06), arcadeMat), (DX + X1) / 2, 0.45, Z0 + 0.12));
  add(at(box(X1 - DX, 0.07, 0.1, COL.raspDeep), (DX + X1) / 2, 0.92, Z0 + 0.13));
  add(at(box(X1 - DX, 0.03, 0.08, COL.cream), (DX + X1) / 2, 0.97, Z0 + 0.13));
  // A frieze of little arches with rose corners along the top of every wall
  const friezeTex = T.themedTexture(960, 96, (c, w, h) => T.drawFrieze(c, w, h, { tile: 120 }));
  friezeTex.wrapS = THREE.RepeatWrapping;
  friezeTex.repeat.set((X1 - X0) / 3.0, 1);
  const friezeMat = new THREE.MeshStandardMaterial({ map: friezeTex, roughness: 0.8 });
  add(at(mesh(new THREE.PlaneGeometry(X1 - X0, 0.3), friezeMat, { cast: false }), 0, WALL_H - 0.18, Z0 + 0.11));
  for (const [x, ry] of [[X0 + 0.11, Math.PI / 2], [X1 - 0.11, -Math.PI / 2]]) add(at(rot(mesh(uvScale(new THREE.PlaneGeometry(Z1 - Z0, 0.3), (Z1 - Z0) / (X1 - X0)), friezeMat, { cast: false }), 0, ry, 0), x, WALL_H - 0.18, 0));
  add(at(mesh(uvScale(new THREE.BoxGeometry(0.2, WALL_H, Z1 - Z0), (Z1 - Z0) / (KX - X0)), tileWallMat, { cast: false }), X0, WALL_H / 2, 0));
  add(at(mesh(uvScale(new THREE.BoxGeometry(0.2, WALL_H, Z1 - Z0), (Z1 - Z0) / (X1 - KX)), plasterMat, { cast: false }), X1, WALL_H / 2, 0));
  add(at(mesh(uvScale(new THREE.BoxGeometry(0.08, 0.9, Z1 - Z0), (Z1 - Z0) / (X1 - DX)), arcadeMat, { cast: false }), X1 - 0.12, 0.45, 0));
  add(at(box(0.1, 0.07, Z1 - Z0, COL.raspDeep), X1 - 0.13, 0.92, 0));
  for (const x of [X0, X1]) col(x, 0, 0.15, 5);
  add(at(box(X1 - X0, 0.14, 0.12, COL.cream), 0, 0.07, Z1));
  add(at(box(X1 - X0, 0.03, 0.13, COL.raspDeep), 0, 0.15, Z1));
  col(0, Z0, 13, 0.2);
  col(0, Z1 + 0.1, 13, 0.15);
  // Door mat at the way out
  add(at(rbox(1.6, 0.03, 0.8, COL.rasp, 0.015), -1, 0.015, 4.35));
  add(at(rbox(1.4, 0.035, 0.6, COL.cream, 0.015), -1, 0.02, 4.35));
  add(at(atlas.plane(0.9, 0.3, 240, 80, (c, w, h) => {
    c.fillStyle = COL.cream;
    c.fillRect(0, 0, w, h);
    c.fillStyle = COL.rasp;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 ${h * 0.6}px ${FONT}`;
    c.fillText('Welcome', w / 2, h / 2 + 2);
  }), -1, 0.04, 4.35)).rotation.x = -Math.PI / 2;

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
  // Floral tiles behind the cooking line, like the corners of Roji's logo card
  const splash = T.themedTexture(256, 256, (c, w) => T.drawTile(c, 0, 0, w, { ground: '#fbefe2' }));
  splash.wrapS = splash.wrapT = THREE.RepeatWrapping;
  const SPLASH_W = KX - 0.2 - (X0 + 1.0);
  splash.repeat.set(SPLASH_W / 0.32, 2);
  const tileMat = new THREE.MeshStandardMaterial({ map: splash, roughness: 0.45 });
  add(at(mesh(new THREE.PlaneGeometry(SPLASH_W, 0.64), tileMat, { cast: false }), (KX - 0.2 + X0 + 1.0) / 2, 1.3, Z0 + 0.105));
  add(at(box(KX - 0.2 - (X0 + 1.0), 0.04, 0.03, COL.raspDeep), (KX - 0.2 + X0 + 1.0) / 2, 1.635, Z0 + 0.11));
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
    add(at(cyl(0.06, 0.16, 0.2, COL.brass, 14, K.BRASS), KX, 1.84, z));
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
      c.fillStyle = '#3f4734';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = COL.band;
      c.lineWidth = 6;
      c.strokeRect(9, 9, w - 18, h - 18);
      c.textAlign = 'center';
      c.fillStyle = COL.sun;
      c.font = `700 ${h * 0.1}px ${FONT}`;
      c.fillText(title, w / 2, h * 0.16);
      c.fillStyle = '#ffffff';
      c.font = `500 ${h * 0.075}px ${FONT}`;
      lines.forEach((l, i) => c.fillText(l, w / 2, h * (0.32 + i * 0.12)));
      c.fillStyle = COL.band;
      K.heartPath(c, w / 2, h * 0.86, h * 0.12);
      c.fill();
    });
    st.add(at(rot(face, -0.2, 0, 0), 0, 0.56, 0.145));
    st.rotation.y = ry;
    add(at(st, x, 0, z));
    circ(x, z, 0.3);
  };
  special(-6.6, 2.6, -0.3, "Today's special", ['Mansaf Friday', 'Pecan cake', 'Spanish latte', 'for two']);
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
  // Spanish latte corner: a brass coffee pot, an espresso machine and a stack of cups
  add(at(K.makeDallah(0.34), 1.55, 0.97, -4.6));
  add(at(rbox(0.42, 0.42, 0.36, COL.brown, 0.04), 2.25, 1.18, -4.62));
  add(at(sph(0.13, COL.brass, K.BRASS, 14), 2.25, 1.42, -4.62));
  add(at(box(0.3, 0.05, 0.06, COL.brass, K.BRASS), 2.25, 1.13, -4.42));
  for (const [x, y] of [[2.17, 0.99], [2.33, 0.99], [2.25, 1.05]]) add(at(cyl(0.045, 0.035, 0.06, COL.cream, 12, { rough: 0.3 }), x, y + 0.03, -4.4));
  add(at(box(DX - KX - 0.9, 0.04, 0.02, COL.band), (KX + DX) / 2 - 0.2, 0.62, -4.2));

  // The menu: an arch-topped board in raspberry, the shape of Roji's logo arch
  const MENU = { x: -1.3, y: 1.44, w: 2.9, s: 0.9, r: 0.44 };
  const MENU_ITEMS = [
    ['shawarma', 'Shawarma', '7'],
    ['burger', 'Burgers', '5'],
    ['fries', 'Fries', '4'],
    ['latte', 'Spanish latte', '4'],
    ['lemonade', 'Mint lemonade', '3'],
    ['pecan', 'Pecan cake', '4'],
    ['german', 'German cake', '4'],
    ['mansaf', 'Mansaf', '9'],
  ];
  const menuRect = atlas.add(1024, Math.round((1024 * (MENU.s + MENU.r)) / MENU.w), (c, w, h) => {
    const k = w / MENU.w;
    const outline = (inset) => {
      const p = new Path2D();
      T.archPoints(MENU.w, MENU.s, MENU.r, { inset }).forEach(([x, y], i) => (i ? p.lineTo(w / 2 + x * k, h - y * k) : p.moveTo(w / 2 + x * k, h - y * k)));
      p.closePath();
      return p;
    };
    c.fillStyle = COL.paper;
    c.fillRect(0, 0, w, h);
    c.lineJoin = 'round';
    c.strokeStyle = COL.raspDeep;
    c.lineWidth = 12;
    c.stroke(outline(0.04));
    c.strokeStyle = COL.band;
    c.lineWidth = 9;
    c.stroke(outline(0.075));
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = COL.rasp;
    c.font = `600 66px ${FONT}`;
    c.fillText('Menu', w / 2, 86);
    for (const dx of [-112, 112]) {
      K.heartPath(c, w / 2 + dx, 82, 34);
      c.fill();
    }
    c.font = `500 26px ${FONT}`;
    c.fillText('food and more', w / 2, 132);
    MENU_ITEMS.forEach(([icon, name, price], i) => {
      const x = 62 + Math.floor(i / 4) * 470;
      const y = 200 + (i % 4) * 70;
      c.save();
      c.translate(x, y);
      c.rotate(((i * 37) % 5) * 0.006 - 0.012);
      if (icon === 'burger') K.ICON_DRAW.burger(c, 30, 0, 56, ['cheese', 'lettuce']);
      else K.ICON_DRAW[icon](c, 30, 0, 56);
      c.textAlign = 'left';
      c.fillStyle = COL.rasp;
      c.font = `500 38px ${FONT}`;
      c.fillText(name, 72, 2);
      c.strokeStyle = COL.band;
      c.setLineDash([3, 9]);
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(84 + c.measureText(name).width, 14);
      c.lineTo(360, 14);
      c.stroke();
      c.setLineDash([]);
      K.drawCoin(c, 384, 0, 15);
      c.fillStyle = COL.raspDeep;
      c.font = `600 38px ${FONT}`;
      c.fillText(price, 406, 2);
      c.restore();
    });
  });
  add(at(mesh(atlas.fit(T.shapeGeo(T.archShape(MENU.w, MENU.s, MENU.r)), menuRect), atlas.material, { cast: false }), MENU.x, MENU.y, Z0 + 0.16));
  add(at(mesh(T.shapeGeo(T.archShape(MENU.w + 0.12, MENU.s + 0.06, MENU.r + 0.08), 0.05), mat(COL.raspDeep)), MENU.x, MENU.y - 0.06, Z0 + 0.1));

  // Roji's logo card, framed in brass, with a lantern either side
  add(at(atlas.themedPlane(0.92, 1.3, 336, 474, (c, w, h) => T.drawPoster(c, w, h)), 2.4, 2.2, Z0 + 0.17));
  add(at(rbox(1.04, 1.42, 0.05, COL.brass, 0.02, K.BRASS), 2.4, 2.2, Z0 + 0.13));
  add(at(rbox(0.96, 1.34, 0.06, COL.raspDeep, 0.01), 2.4, 2.2, Z0 + 0.13));
  const lampMat = umat('#fff0d0', { emissive: '#ffd48a', ei: 0.75, rough: 0.25 });
  const wallLantern = (x, y, z = Z0 + 0.1, reach = 0.32) => {
    add(at(box(0.04, 0.04, reach, COL.brass, K.BRASS), x, y + 0.55, z + reach / 2));
    add(at(rbox(0.12, 0.16, 0.03, COL.brass, 0.01, K.BRASS), x, y + 0.55, z + 0.01));
    add(at(cyl(0.006, 0.006, 0.14, COL.brass, 4, K.BRASS), x, y + 0.47, z + reach));
    add(at(K.makeLantern(0.75, lampMat), x, y, z + reach));
  };
  wallLantern(1.55, 1.95);
  wallLantern(3.25, 1.95);

  // Clock in a brass ring
  const clockFace = atlas.add(128, 128, (c, w) => {
    c.fillStyle = COL.paper;
    c.beginPath();
    c.arc(w / 2, w / 2, w / 2 - 2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = COL.rasp;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.beginPath();
      c.arc(w / 2 + Math.cos(a) * 48, w / 2 + Math.sin(a) * 48, i % 3 ? 3 : 6, 0, Math.PI * 2);
      c.fill();
    }
    K.heartPath(c, w / 2, w * 0.7, 18);
    c.fill();
  });
  add(at(tor(0.3, 0.035, COL.brass, K.BRASS), -4.4, 2.35, Z0 + 0.13));
  add(at(mesh(atlas.fit(new THREE.CircleGeometry(0.29, 24), clockFace), atlas.material, { cast: false }), -4.4, 2.35, Z0 + 0.14));
  const hourHand = at(box(0.025, 0.15, 0.01, COL.ink), 0, 0.06, 0);
  const minHand = at(box(0.018, 0.22, 0.01, COL.ink), 0, 0.09, 0);
  const hourP = at(new THREE.Group(), -4.4, 2.35, Z0 + 0.16);
  const minP = at(new THREE.Group(), -4.4, 2.35, Z0 + 0.17);
  hourP.add(hourHand);
  minP.add(minHand);
  add(hourP, minP);
  dynamic.push(hourP, minP);

  // The long counter: cream, with a band of floral tiles across the front, a marble top and a brass foot rail
  const CX0 = -4.7;
  const CX1 = 2.6;
  const CZ = -2.5;
  add(at(rbox(CX1 - CX0, 0.95, 0.56, COL.cream, 0.05), (CX0 + CX1) / 2, 0.475, CZ));
  add(at(rbox(CX1 - CX0 + 0.14, 0.06, 0.7, '#fffaf4', 0.025, { rough: 0.3 }), (CX0 + CX1) / 2, 0.98, CZ));
  add(at(box(CX1 - CX0 + 0.1, 0.04, 0.02, COL.raspDeep), (CX0 + CX1) / 2, 0.93, CZ + 0.29));
  add(at(mesh(uvScale(new THREE.PlaneGeometry(CX1 - CX0 - 0.2, 0.46), (CX1 - CX0 - 0.2) / 0.46 / (SPLASH_W / 0.32), 0.5), tileMat, { cast: false }), (CX0 + CX1) / 2, 0.52, CZ + 0.285));
  for (const y of [0.27, 0.77]) add(at(box(CX1 - CX0 - 0.16, 0.04, 0.03, COL.raspDeep), (CX0 + CX1) / 2, y, CZ + 0.29));
  // Roji's logo card in the middle of the counter front, in a brass frame
  const PLQ = { x: 0.2, w: 1.0, h: 0.46 };
  add(at(atlas.themedPlane(PLQ.w, PLQ.h, 512, Math.round((512 * PLQ.h) / PLQ.w), (c, w, h) => T.drawPoster(c, w, h, { logoWidth: 0.6 })), PLQ.x, 0.52, CZ + 0.325));
  add(at(rbox(PLQ.w + 0.08, PLQ.h + 0.08, 0.04, COL.brass, 0.015, K.BRASS), PLQ.x, 0.52, CZ + 0.3));
  add(at(box(CX1 - CX0, 0.12, 0.62, COL.blush), (CX0 + CX1) / 2, 0.06, CZ));
  add(at(rot(cyl(0.025, 0.025, CX1 - CX0 - 0.1, COL.brass, 10, K.BRASS), 0, 0, Math.PI / 2), (CX0 + CX1) / 2, 0.2, CZ + 0.4));
  for (let i = 0; i < 6; i++) add(at(rot(cyl(0.015, 0.015, 0.14, COL.brass, 6, K.BRASS), Math.PI / 2, 0, 0), CX0 + 0.3 + i * 1.34, 0.2, CZ + 0.34));
  col((CX0 + CX1) / 2, CZ, (CX1 - CX0) / 2 + 0.07, 0.35, 1.01);
  const STOOLS = [-4.0, -2.8, -1.6, -0.4, 0.8, 2.0];
  for (const x of STOOLS) {
    add(at(K.makeStool(COL.rasp), x, 0, -1.72));
    circ(x, -1.72, 0.22, 0.71);
  }
  // On the counter: napkins, sauces, a tip jar and the register
  for (const x of [-3.4, -0.95, 1.4]) {
    add(at(rbox(0.18, 0.12, 0.1, COL.brass, 0.02, K.BRASS), x, 1.07, CZ - 0.05));
    add(at(box(0.14, 0.03, 0.08, '#ffffff'), x, 1.14, CZ - 0.05));
    add(at(cyl(0.035, 0.04, 0.16, COL.cherry, 10), x + 0.18, 1.09, CZ - 0.05));
    add(at(cyl(0.035, 0.04, 0.16, '#f0c23c', 10), x + 0.27, 1.09, CZ - 0.05));
  }
  const register = K.makeRegister();
  register.show('YUM');
  K.colorBake(register.group, [register.screen]);
  add(at(rot(register.group, 0, 0.35, 0), 2.15, 1.01, CZ - 0.02));
  const jar = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 16, 1, true), domeMat, { cast: false });
  add(at(jar, 1.65, 1.12, CZ + 0.05));
  dynamic.push(jar);
  add(at(cyl(0.09, 0.09, 0.08, COL.brass, 14, K.BRASS), 1.65, 1.05, CZ + 0.05));
  // A gumball machine and an olive tree by the door
  add(at(cyl(0.16, 0.2, 0.5, COL.rasp, 16), 1.0, 0.25, 3.9));
  add(at(tor(0.17, 0.02, COL.brass, K.BRASS), 1.0, 0.5, 3.9)).rotation.x = Math.PI / 2;
  add(at(sph(0.24, '#f2fbff', { rough: 0.1 }, 16), 1.0, 0.72, 3.9));
  for (let i = 0; i < 9; i++) add(at(sph(0.05, [COL.sun, COL.hotpink, COL.mint, COL.paper][i % 4], undefined, 8), 1.0 + Math.cos(i * 2.1) * 0.12, 0.62 + (i % 3) * 0.08, 3.9 + Math.sin(i * 2.1) * 0.12));
  add(at(cyl(0.05, 0.05, 0.06, COL.raspDeep, 10), 1.0, 0.98, 3.9));
  circ(1.0, 3.9, 0.25);
  add(at(K.makeOliveTree(1.2, COL.rasp, 4), -4.9, 0, 4.2));
  circ(-4.9, 4.2, 0.26);

  // ---------------------------------------------------------------- dining room
  // Arched windows above the booths, each in a small logo-card panel with rose corners
  const PNL = { w: 1.1, h: 1.57, y: 1.26 };
  const panelPx = [232, Math.round((232 * PNL.h) / PNL.w)];
  const panelRect = atlas.addThemed(panelPx[0], panelPx[1], (c, w, h) => T.drawFrame(c, w, h));
  const PL = T.frameLayout(...panelPx);
  const pk = PNL.w / panelPx[0];
  const gw = (PL.x1 - PL.x0) * pk;
  const gb = (panelPx[1] - PL.y1) * pk;
  const gs = (PL.y1 - PL.spring) * pk;
  const gr = PL.A * pk;
  const skyMat = K.cg('skyMat', () => new THREE.MeshBasicMaterial({ map: K.skyTexture() }));
  const glassGeo = T.shapeGeo(T.archShape(gw, gs, gr));
  const ringA = T.shapeGeo(T.archRing(gw + 0.08, gs + 0.04, gr + 0.052, 0.04));
  const ringB = T.shapeGeo(T.archRing(gw + 0.13, gs + 0.065, gr + 0.085, 0.025));
  for (const x of BOOTHS) {
    add(at(mesh(atlas.fit(new THREE.PlaneGeometry(PNL.w, PNL.h), panelRect), atlas.material, { cast: false }), x, PNL.y + PNL.h / 2, Z0 + 0.11));
    add(at(mesh(glassGeo, skyMat, { cast: false }), x, PNL.y + gb, Z0 + 0.115));
    add(at(mesh(ringA, mat(COL.band), { cast: false }), x, PNL.y + gb - 0.04, Z0 + 0.118));
    add(at(mesh(ringB, mat(COL.raspDeep), { cast: false }), x, PNL.y + gb - 0.065, Z0 + 0.118));
    add(at(box(0.03, gs + gr - 0.03, 0.03, COL.cream), x, PNL.y + gb + (gs + gr) / 2, Z0 + 0.13));
    add(at(box(gw, 0.03, 0.03, COL.cream), x, PNL.y + gb + gs, Z0 + 0.13));
    add(at(box(gw + 0.22, 0.05, 0.16, COL.cream), x, PNL.y + gb - 0.07, Z0 + 0.18));
  }
  // Arched niches between the windows: a coffee pot with cups, and roses in a brass vase; a lantern above each
  const NICHE = { w: 0.66, s: 0.62, r: 0.36, y: 1.02 };
  const lathe2 = (key, pts, c) => K.lathe(key, pts, typeof c === 'string' ? mat(c, { rough: 0.5 }) : c, undefined, 12);
  const nicheGeo = T.shapeGeo(T.archShape(NICHE.w, NICHE.s, NICHE.r));
  const nicheRing = T.shapeGeo(T.archRing(NICHE.w + 0.1, NICHE.s, NICHE.r + 0.065, 0.05, { open: true }));
  const nicheRing2 = T.shapeGeo(T.archRing(NICHE.w + 0.16, NICHE.s, NICHE.r + 0.104, 0.03, { open: true }));
  for (const [x, what] of [[6.85, 'coffee'], [9.75, 'roses']]) {
    add(at(mesh(nicheGeo, mat('#e9bcb6', { rough: 0.9 }), { cast: false }), x, NICHE.y, Z0 + 0.105));
    add(at(mesh(nicheRing, mat(COL.band), { cast: false }), x, NICHE.y, Z0 + 0.11));
    add(at(mesh(nicheRing2, mat(COL.raspDeep), { cast: false }), x, NICHE.y, Z0 + 0.11));
    add(at(box(NICHE.w + 0.24, 0.05, 0.22, COL.cream), x, NICHE.y - 0.02, Z0 + 0.2));
    add(at(box(NICHE.w - 0.04, 0.025, 0.16, COL.cream), x, NICHE.y + 0.46, Z0 + 0.18));
    if (what === 'coffee') {
      add(at(K.makeDallah(0.22), x - 0.1, NICHE.y + 0.475, Z0 + 0.18));
      for (const dx of [0.1, 0.2]) add(at(cyl(0.03, 0.024, 0.045, COL.cream, 10, { rough: 0.3 }), x + dx, NICHE.y + 0.51, Z0 + 0.2));
      add(at(cyl(0.12, 0.12, 0.012, COL.brass, 16, K.BRASS), x, NICHE.y + 0.01, Z0 + 0.2));
      for (const dx of [-0.07, 0.07]) add(at(cyl(0.03, 0.024, 0.045, COL.rasp, 10), x + dx, NICHE.y + 0.04, Z0 + 0.2));
    } else {
      add(at(lathe2('vase', [[0, 0], [0.06, 0], [0.09, 0.08], [0.07, 0.16], [0.035, 0.2], [0.05, 0.24], [0, 0.24]], mat(COL.brass, K.BRASS)), x, NICHE.y + 0.0, Z0 + 0.2));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        add(at(sph(0.045, i % 2 ? COL.leaf : '#8b9466', { rough: 0.85 }, 7), x + Math.cos(a) * 0.08, NICHE.y + 0.3 + (i % 2) * 0.04, Z0 + 0.2 + Math.sin(a) * 0.05));
      }
      for (const [dx, dy, c] of [[0, 0.38, COL.rasp], [-0.08, 0.33, COL.pink], [0.08, 0.34, COL.rasp], [0.03, 0.3, COL.pink]]) add(at(sph(0.045, c, { rough: 0.7 }, 8), x + dx, NICHE.y + dy, Z0 + 0.23));
      for (const dx of [-0.16, 0.16]) add(at(cyl(0.03, 0.024, 0.045, COL.rasp, 10), x + dx, NICHE.y + 0.51, Z0 + 0.2));
      add(at(lathe2('jug', [[0, 0], [0.05, 0], [0.065, 0.06], [0.04, 0.12], [0.03, 0.15], [0, 0.15]], COL.cream), x, NICHE.y + 0.4875, Z0 + 0.2));
    }
    wallLantern(x, 2.2);
  }
  // Booths: two padded benches facing each other across a table
  const benchColors = [COL.rasp, COL.pink, COL.rasp];
  BOOTHS.forEach((x, i) => {
    add(at(K.makeDinerTable(0.8, 1.3, COL.cream, COL.brass), x, 0, BOOTH_Z));
    for (const s of [-1, 1]) {
      const b = K.makeBench(1.35, benchColors[i], COL.cream);
      b.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2;
      add(at(b, x + s * 0.8, 0, BOOTH_Z + 0.02));
      col(x + s * 0.82, BOOTH_Z, 0.3, 0.7, 0.53);
    }
    col(x, BOOTH_Z, 0.42, 0.66, 0.78);
    add(at(rbox(0.14, 0.1, 0.08, COL.brass, 0.02, K.BRASS), x, 0.83, BOOTH_Z - 0.55));
    add(at(cyl(0.03, 0.035, 0.14, COL.cherry, 10), x - 0.12, 0.85, BOOTH_Z - 0.55));
    add(at(cyl(0.03, 0.035, 0.14, '#f0c23c', 10), x + 0.12, 0.85, BOOTH_Z - 0.55));
  });
  // Round tables in the middle
  const TABLES = [[6.3, 0.4], [9.9, 0.6]];
  for (const [x, z] of TABLES) {
    add(at(K.makeRoundTable(0.45, COL.cream), x, 0, z));
    circ(x, z, 0.47, 0.78);
    add(at(K.makeChair(COL.mint), x, 0, z - 0.62));
    circ(x, z - 0.62, 0.22, 0.49);
    add(at(rot(K.makeChair(COL.pink), 0, -Math.PI / 2, 0), x + 0.66, 0, z));
    circ(x + 0.66, z, 0.22, 0.49);
    add(at(rot(K.makeChair(COL.rasp), 0, Math.PI / 2, 0), x - 0.66, 0, z));
    circ(x - 0.66, z, 0.22, 0.49);
    const vase = new THREE.Group();
    vase.add(at(cyl(0.045, 0.055, 0.13, COL.brass, 12, K.BRASS), 0, 0.065, 0));
    for (const [vx, vz, c] of [[0, 0, COL.rasp], [0.04, 0.02, COL.pink], [-0.04, 0.01, '#ffffff']]) vase.add(at(sph(0.032, c, undefined, 10), vx, 0.18, vz));
    add(at(vase, x + 0.18, 0.775, z - 0.18));
  }
  // Planter divider between the counter and the dining room
  add(at(rbox(0.42, 0.62, 2.8, COL.cream, 0.05), DX, 0.31, 0.2));
  add(at(box(0.44, 0.05, 2.82, COL.raspDeep), DX, 0.6, 0.2));
  add(at(box(0.32, 0.06, 2.7, '#7a5a3e'), DX, 0.63, 0.2));
  for (const s of [-1, 1]) add(at(box(0.01, 0.2, 2.6, COL.band), DX + s * 0.215, 0.32, 0.2));
  for (let i = 0; i < 6; i++) add(at(sph(0.17, i % 2 ? COL.leaf : '#8b9466', { rough: 0.85 }, 12), DX + (i % 2 ? 0.05 : -0.05), 0.78, -1.0 + i * 0.48));
  for (let i = 0; i < 7; i++) add(at(sph(0.05, [COL.rasp, COL.pink, '#ffffff'][i % 3], { rough: 0.7 }, 8), DX + (i % 2 ? 0.12 : -0.1), 0.9 + (i % 3) * 0.03, -1.05 + i * 0.4));
  col(DX, 0.2, 0.22, 1.42, 0.8);
  add(at(K.makeOliveTree(1.4, COL.rasp, 12), 12.4, 0, -2.2));
  circ(12.4, -2.2, 0.26);
  add(at(K.makePlant(0.8, COL.olive), 12.4, 0, 4.2));
  circ(12.4, 4.2, 0.22);
  // A reserved table for Roji and Homama, with a heart balloon
  add(at(K.makeRoundTable(0.42, COL.cream), 5.9, 0, 3.0));
  circ(5.9, 3.0, 0.45, 0.78);
  add(at(rot(K.makeChair(COL.pink), 0, Math.PI / 2, 0), 5.25, 0, 3.0));
  circ(5.25, 3.0, 0.22, 0.49);
  add(at(rot(K.makeChair(COL.mint), 0, -Math.PI / 2, 0), 6.55, 0, 3.0));
  circ(6.55, 3.0, 0.22, 0.49);
  add(at(atlas.plane(0.26, 0.15, 120, 70, (c, w, h) => K.drawLabel(c, w, h, 'Reserved', { edge: COL.rasp, ink: COL.rasp, size: 0.4, bg: COL.paper })), 5.9, 0.86, 3.0));
  add(at(rot(box(0.27, 0.16, 0.01, COL.white), -0.3, 0, 0), 5.9, 0.85, 2.98));
  const balloon = new THREE.Group();
  const heartGeo = new THREE.ExtrudeGeometry(ctx.util.heartShape(0.42), { depth: 0.1, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 18 });
  heartGeo.center();
  const heart = mesh(heartGeo, umat(COL.rasp, { rough: 0.3 }));
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
  // A round rug to dance on and a long rug under the round tables, with the rose corners of Roji's card
  const rugTex = canvasTexture(256, 256, (c, w) => {
    const ring = (r, color) => {
      c.fillStyle = color;
      c.beginPath();
      c.arc(w / 2, w / 2, r, 0, Math.PI * 2);
      c.fill();
    };
    ring(w / 2, COL.raspDeep);
    ring(w / 2 - 8, COL.band);
    ring(w / 2 - 16, COL.paper);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.fillStyle = i % 2 ? COL.rasp : COL.band;
      K.heartPath(c, w / 2 + Math.cos(a) * (w / 2 - 34), w / 2 + Math.sin(a) * (w / 2 - 34), 22);
      c.fill();
    }
    ring(w / 2 - 54, COL.blush);
    c.fillStyle = COL.rasp;
    star(c, w / 2, w / 2, 34);
    c.fillStyle = COL.paper;
    star(c, w / 2, w / 2, 20);
  });
  const rug = mesh(new THREE.CircleGeometry(1.05, 36), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.95 }), { cast: false });
  rug.rotation.x = -Math.PI / 2;
  add(at(rug, 10.75, 0.012, 2.4));
  const RUG = { x: 7.65, z: 0.42, w: 5.0, d: 2.05 };
  const longRug = T.themedTexture(1024, Math.round((1024 * RUG.d) / RUG.w), (c, w, h) => {
    c.fillStyle = COL.raspDeep;
    c.fillRect(0, 0, w, h);
    c.fillStyle = COL.paper;
    c.fillRect(14, 14, w - 28, h - 28);
    c.fillStyle = COL.band;
    for (let x = 30; x < w - 20; x += 32) {
      diamond(c, x, 24, 7);
      diamond(c, x, h - 24, 7);
    }
    for (let y = 56; y < h - 40; y += 32) {
      diamond(c, 24, y, 7);
      diamond(c, w - 24, y, 7);
    }
    c.fillStyle = COL.rasp;
    c.fillRect(38, 38, w - 76, h - 76);
    c.fillStyle = '#f3cdc8';
    c.fillRect(46, 46, w - 92, h - 92);
    const a = T.getArt();
    if (a?.left && a?.right) {
      const cs = (h - 92) * 0.5;
      c.drawImage(a.left, 46, 46, cs, cs);
      c.drawImage(a.right, w - 46 - cs, 46, cs, cs);
      c.save();
      c.translate(0, h);
      c.scale(1, -1);
      c.drawImage(a.left, 46, 46, cs, cs);
      c.drawImage(a.right, w - 46 - cs, 46, cs, cs);
      c.restore();
    }
    c.fillStyle = COL.rasp;
    star(c, w / 2, h / 2, h * 0.2);
    c.fillStyle = COL.band;
    star(c, w / 2, h / 2, h * 0.14);
    c.fillStyle = COL.paper;
    star(c, w / 2, h / 2, h * 0.07);
    for (const dx of [-1, 1]) {
      c.fillStyle = COL.rasp;
      diamond(c, w / 2 + dx * h * 0.42, h / 2, h * 0.09);
      c.fillStyle = COL.paper;
      diamond(c, w / 2 + dx * h * 0.42, h / 2, h * 0.04);
    }
  });
  const longRugMesh = mesh(new THREE.PlaneGeometry(RUG.w, RUG.d), new THREE.MeshStandardMaterial({ map: longRug, roughness: 0.95 }), { cast: false });
  longRugMesh.rotation.x = -Math.PI / 2;
  add(at(longRugMesh, RUG.x, 0.008, RUG.z));

  // ---------------------------------------------------------------- people (baked into the room)
  const r = K.rng(7);
  const people = [];
  const eaters = [];
  const cheeks = (look) => mat('#' + new THREE.Color(look.skin).lerp(new THREE.Color('#ff8fa0'), look.gender === 'girl' ? 0.5 : 0.32).getHexString());
  const person = (look, { x, z, y = 0, yaw = 0, pose = 'sit', hands = null, eat = false, dress }) => {
    const k = K.lowPolyKid(ctx.makeKid(look), { sphereMin: pose === 'stand' ? 10 : 8 });
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
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTex, color: [COL.rasp, COL.band, COL.sun][i % 3], transparent: true, depthWrite: false, opacity: 0 }));
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
    api.focus({ x: MENU.x, z: -4.4, y: 2.0, zoom: 0.42 });
    api.toast("Shawarma, burgers, fries, Spanish latte, mint lemonade, pecan cake, German cake and mansaf. <b>Roji's favourite:</b> the pecan cake.", 4200);
    after(4.3, () => api.focus(null));
  }

  hotspots.push(
    { x: -10.55, z: -3.25, r: 1.5, label: 'Run the kitchen', icon: 'chef', act: runKitchen },
    { x: BOOTHS[0], z: -2.3, r: 1.5, label: 'Eat at a booth', icon: 'yum', act: eatAtBooth },
    { x: 10.9, z: 1.75, r: 1.5, label: 'Play the jukebox', icon: 'music', act: playJukebox },
    { x: -3.0, z: -1.05, r: 1.3, label: 'Order a milkshake', icon: 'shake', act: orderShake },
    { x: MENU.x, z: -0.6, r: 1.2, label: 'Read the menu', icon: 'note', act: readMenu },
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
    lampMat.emissiveIntensity = 0.72 + Math.sin(t * 2.3) * 0.05 + (party ? Math.abs(Math.sin(t * 8)) * 0.45 : 0);
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
    background: '#f7e2da',
    update,
    onExit(api) {
      dropShakes(api);
      playing = null;
    },
  };
}
