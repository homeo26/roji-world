import * as K from './kit.js';
import * as T from './theme.js';
import * as D from './decor.js';
import { uvScale } from './shell.js';
import { bakeZone } from './bake.js';
import { roundTable, wallLantern } from './centre.js';
import { X0, X1, Z0, Z1, CW, SX, FOUNTAIN, GARDEN_TABLES, STAGE, RUG, RESERVED, MAJLIS, BOOTHS, WALL_BOOTHS, E1, E2, BAR, LATTE_STOOLS, LATTE_Z, CAFE, RESTROOM } from './layout.js';

// The wings of the big YumYum. West: the garden terrace with the fountain and fairy lights, and behind it the
// lounge with the oud stage, majlis cushions and the cosy corner table reserved for Roji and Homama. East: the
// main dining room with booths, and behind it the dessert and coffee bar with the cake case and the restrooms.

const { THREE, COL, box, rbox, cyl, sph, tor, at, rot, mat, mesh, FONT } = K;

// A booth: a diner table and two padded benches facing each other. alongX: the table runs along X (against an
// east or west wall) and the benches face along Z. Returns the two seats { x, z, yaw }.
export function booth(S, add, x, z, color, alongX = false) {
  const seats = [];
  if (!alongX) {
    add(at(K.makeDinerTable(0.8, 1.3, COL.cream, COL.brass), x, 0, z));
    for (const s of [-1, 1]) {
      const b = K.makeBench(1.35, color, COL.cream);
      b.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2;
      add(at(b, x + s * 0.8, 0, z + 0.02));
      S.col(x + s * 0.82, z, 0.3, 0.7, 0.53);
      seats.push({ x: x + s * 0.66, z: z + 0.05, yaw: s < 0 ? Math.PI / 2 : -Math.PI / 2 });
    }
    S.col(x, z, 0.42, 0.66, 0.78);
    add(at(rbox(0.14, 0.1, 0.08, COL.brass, 0.02, K.BRASS), x, 0.83, z - 0.55));
    add(at(cyl(0.03, 0.035, 0.14, COL.cherry, 8), x - 0.12, 0.85, z - 0.55));
    add(at(cyl(0.03, 0.035, 0.14, '#f0c23c', 8), x + 0.12, 0.85, z - 0.55));
  } else {
    add(at(K.makeDinerTable(1.3, 0.8, COL.cream, COL.brass), x, 0, z));
    for (const s of [-1, 1]) {
      const b = K.makeBench(1.35, color, COL.cream);
      b.rotation.y = s < 0 ? 0 : Math.PI;
      add(at(b, x + 0.02, 0, z + s * 0.8));
      S.col(x, z + s * 0.82, 0.7, 0.3, 0.53);
      seats.push({ x: x + 0.05, z: z + s * 0.66, yaw: s < 0 ? 0 : Math.PI });
    }
    S.col(x, z, 0.66, 0.42, 0.78);
    add(at(rbox(0.08, 0.1, 0.14, COL.brass, 0.02, K.BRASS), x + 0.55, 0.83, z));
    add(at(cyl(0.03, 0.035, 0.14, COL.cherry, 8), x + 0.55, 0.85, z - 0.12));
    add(at(cyl(0.03, 0.035, 0.14, '#f0c23c', 8), x + 0.55, 0.85, z + 0.12));
  }
  return seats;
}

// An arched window in a small logo-card panel with rose corners, on a wall facing +Z (rotate the result).
function windowPanel(S, sky = true) {
  const g = new THREE.Group();
  const PNL = { w: 1.1, h: 1.57 };
  const px = [232, Math.round((232 * PNL.h) / PNL.w)];
  S.panelRect ??= S.atlas.addThemed(px[0], px[1], (c, w, h) => T.drawFrame(c, w, h));
  const PL = T.frameLayout(...px);
  const pk = PNL.w / px[0];
  const gw = (PL.x1 - PL.x0) * pk;
  const gb = (px[1] - PL.y1) * pk;
  const gs = (PL.y1 - PL.spring) * pk;
  const gr = PL.A * pk;
  const skyMat = K.cg('skyMat', () => new THREE.MeshBasicMaterial({ map: K.skyTexture() }));
  g.add(at(mesh(S.atlas.fit(new THREE.PlaneGeometry(PNL.w, PNL.h), S.panelRect), S.atlas.material, { cast: false }), 0, PNL.h / 2, 0));
  g.add(at(mesh(K.cg('yumWinGlass', () => T.shapeGeo(T.archShape(gw, gs, gr))), sky ? skyMat : mat('#e9bcb6'), { cast: false }), 0, gb, 0.005));
  g.add(at(mesh(K.cg('yumWinRingA', () => T.shapeGeo(T.archRing(gw + 0.08, gs + 0.04, gr + 0.052, 0.04))), mat(COL.band), { cast: false }), 0, gb - 0.04, 0.008));
  g.add(at(mesh(K.cg('yumWinRingB', () => T.shapeGeo(T.archRing(gw + 0.13, gs + 0.065, gr + 0.085, 0.025))), mat(COL.raspDeep), { cast: false }), 0, gb - 0.065, 0.008));
  g.add(at(box(0.03, gs + gr - 0.03, 0.03, COL.cream), 0, gb + (gs + gr) / 2, 0.02));
  g.add(at(box(gw, 0.03, 0.03, COL.cream), 0, gb + gs, 0.02));
  g.add(at(box(gw + 0.22, 0.05, 0.16, COL.cream), 0, gb - 0.07, 0.07));
  return g;
}

// An arched niche with a coffee pot or roses on its shelf, facing +Z.
function niche(S, what) {
  const g = new THREE.Group();
  const N = { w: 0.66, s: 0.62, r: 0.36 };
  g.add(mesh(K.cg('yumNiche', () => T.shapeGeo(T.archShape(N.w, N.s, N.r))), mat('#e9bcb6', { rough: 0.9 }), { cast: false }));
  g.add(at(mesh(K.cg('yumNicheR1', () => T.shapeGeo(T.archRing(N.w + 0.1, N.s, N.r + 0.065, 0.05, { open: true }))), mat(COL.band), { cast: false }), 0, 0, 0.005));
  g.add(at(mesh(K.cg('yumNicheR2', () => T.shapeGeo(T.archRing(N.w + 0.16, N.s, N.r + 0.104, 0.03, { open: true }))), mat(COL.raspDeep), { cast: false }), 0, 0, 0.005));
  g.add(at(box(N.w + 0.24, 0.05, 0.22, COL.cream), 0, -0.02, 0.1));
  g.add(at(box(N.w - 0.04, 0.025, 0.16, COL.cream), 0, 0.46, 0.08));
  if (what === 'coffee') {
    g.add(at(K.makeDallah(0.22), -0.1, 0.475, 0.08));
    for (const dx of [0.1, 0.2]) g.add(at(cyl(0.03, 0.024, 0.045, COL.cream, 8, { rough: 0.3 }), dx, 0.51, 0.1));
    g.add(at(cyl(0.12, 0.12, 0.012, COL.brass, 14, K.BRASS), 0, 0.01, 0.1));
    for (const dx of [-0.07, 0.07]) g.add(at(cyl(0.03, 0.024, 0.045, COL.rasp, 8), dx, 0.04, 0.1));
  } else {
    g.add(at(K.lathe('vase', [[0, 0], [0.06, 0], [0.09, 0.08], [0.07, 0.16], [0.035, 0.2], [0.05, 0.24], [0, 0.24]], mat(COL.brass, K.BRASS), undefined, 10), 0, 0, 0.1));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.add(at(sph(0.045, i % 2 ? COL.leaf : '#8b9466', { rough: 0.85 }, 7), Math.cos(a) * 0.08, 0.3 + (i % 2) * 0.04, 0.1 + Math.sin(a) * 0.05));
    }
    for (const [dx, dy, c] of [[0, 0.38, COL.rasp], [-0.08, 0.33, COL.pink], [0.08, 0.34, COL.rasp], [0.03, 0.3, COL.pink]]) g.add(at(sph(0.045, c, { rough: 0.7 }, 8), dx, dy, 0.13));
  }
  return g;
}

const leafy = (add, r, x, y, z, n = 6, s = 1) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r();
    add(at(D.bud((0.15 + r() * 0.06) * s, i % 2 ? COL.leaf : '#8b9466'), x + Math.cos(a) * 0.16 * s, y + r() * 0.12 * s, z + Math.sin(a) * 0.12 * s));
  }
  for (let i = 0; i < 3; i++) add(at(D.bud(0.055 * s, i % 2 ? COL.rasp : COL.pink, 0.7), x + (r() - 0.5) * 0.3 * s, y + 0.1 * s + r() * 0.1, z + (r() - 0.5) * 0.25 * s + 0.08));
};

export function buildWings(S) {
  const { atlas, col, circ, dynamic } = S;
  const R = {};
  const r = K.rng(31);
  let zone = S.zones.terrace;
  const add = (...o) => (zone.add(...o), o[0]);

  // ================================================================ WEST FRONT: the garden terrace
  // Trellis with climbing roses on the west wall, and vines on the lounge wall's front
  const trellis = mesh(uvScale(new THREE.PlaneGeometry(Z1 - CW - 0.6, 2.5), (Z1 - CW - 0.6) / 0.8, 2.5 / 0.8), D.trellisMaterial(), { cast: false });
  trellis.rotation.y = Math.PI / 2;
  add(at(trellis, X0 + 0.115, 1.5, (Z1 + CW) / 2));
  for (let i = 0; i < 8; i++) {
    const z = CW + 0.8 + i * 1.3;
    leafy(add, r, X0 + 0.25, 0.5 + (i % 3) * 0.7, z, 5, 1.05);
    leafy(add, r, X0 + 0.25, 1.8 + (i % 2) * 0.6, z + 0.6, 4, 0.95);
  }
  // Rose bushes along the west wall's foot
  for (let i = 0; i < 7; i++) leafy(add, r, X0 + 0.45, 0.2, CW + 0.9 + i * 1.45, 5, 1.25);
  col(X0 + 0.42, CW + 0.9 + 3 * 1.45, 0.42, 3 * 1.45 + 0.4);
  const cut = S.cutWalls[0];
  const cAdd = cut.add;
  for (const q of [-1, 1]) {
    const xs = q < 0 ? -cut.L / 2 + 0.5 : cut.L / 2 - 0.5;
    for (let i = 0; i < 5; i++) leafy(cAdd, r, xs + (r() - 0.5) * 0.6, 0.35 + i * 0.55, 0.2, 4, 0.85);
  }
  wallLantern(S, cAdd, cut.dx - 1.35, 1.55, 0.1);
  wallLantern(S, cAdd, cut.dx + 1.35, 1.55, 0.1);
  cAdd(at(D.paperSign(atlas, 1.0, 0.62, 'Live oud', { size: 0.34, sub: 'every evening' }), cut.dx - 3.2, 1.7, 0.16));
  cAdd(at(rbox(1.08, 0.7, 0.04, COL.brass, 0.015, K.BRASS), cut.dx - 3.2, 1.7, 0.11));
  // The fountain
  const fountain = D.makeFountain(S.mats.mSplash, FOUNTAIN.r);
  add(at(fountain.group, FOUNTAIN.x, 0, FOUNTAIN.z));
  dynamic.push(fountain.drops);
  circ(FOUNTAIN.x, FOUNTAIN.z, FOUNTAIN.r + 0.12);
  R.fountain = fountain;
  // Bistro tables round it, olive trees, lantern posts
  R.garden = GARDEN_TABLES.map((t, i) => roundTable(S, add, t.x, t.z, 'WE', { r: 0.42, colors: i % 2 ? [COL.mint, COL.pink] : [COL.rasp, COL.sun] }));
  for (const [x, z, h, seed] of [[-14.25, -0.25, 1.6, 21], [-14.25, 9.3, 1.5, 22], [-6.9, 9.3, 1.4, 23], [-6.95, -0.2, 1.3, 24]]) {
    add(at(D.oliveTree(h, COL.rasp, seed), x, 0, z));
    circ(x, z, 0.27);
  }
  for (const [x, z] of [[-12.7, 2.6], [-8.3, 6.2]]) {
    add(at(cyl(0.16, 0.2, 0.12, COL.cream, 12), x, 0.06, z));
    add(at(cyl(0.035, 0.05, 1.9, COL.brass, 8, K.BRASS), x, 1.05, z));
    add(at(K.makeLantern(1.2, S.lampMat), x, 2.0, z));
    circ(x, z, 0.18);
  }
  // Fairy lights from the west wall to the arcade
  const pairs = [];
  for (const z of [0.4, 3.0, 5.6, 8.2]) pairs.push([new THREE.Vector3(X0 + 0.15, 3.05, z), new THREE.Vector3(-SX - 0.1, 2.95, z + 0.4), 0.45]);
  pairs.push([new THREE.Vector3(X0 + 0.15, 3.05, CW + 0.15), new THREE.Vector3(X0 + 0.15, 3.05, Z1 - 0.3), 0.25]);
  const lights = D.fairyStrings(pairs, { every: 0.45 });
  add(lights.wires);
  S.bulbs.push(...lights.bulbs);

  // ================================================================ WEST BACK: the lounge
  zone = S.zones.lounge;
  // Stage with a curtained arch backdrop
  add(at(D.makeStage(STAGE.w, STAGE.d, STAGE.h, S.lampMat), STAGE.x, 0, STAGE.z));
  col(STAGE.x, STAGE.z, STAGE.w / 2, STAGE.d / 2, STAGE.h);
  const BW = Z0 + 0.105;
  add(at(atlas.themedPlane(2.4, 2.3, 384, 368, (c, w, h) => {
    T.drawFrame(c, w, h, { inside: '#f6dcd6' });
    const L = T.frameLayout(w, h);
    c.fillStyle = COL.rasp;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 ${h * 0.11}px ${FONT}`;
    c.fillText('Oud nights', w / 2, L.spring + h * 0.12);
    c.font = `500 ${h * 0.06}px ${FONT}`;
    c.fillText('at Roji\u2019s YumYum', w / 2, L.spring + h * 0.24);
    K.heartPath(c, w / 2, L.spring + h * 0.38, h * 0.08);
    c.fill();
  }), STAGE.x, STAGE.h + 1.35, BW + 0.045));
  add(at(rbox(2.52, 2.42, 0.05, COL.brass, 0.02, K.BRASS), STAGE.x, STAGE.h + 1.35, BW - 0.005));
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) add(at(rbox(0.22, 2.9, 0.12, i % 2 ? COL.raspDeep : COL.rasp, 0.06), STAGE.x + s * (1.45 + i * 0.16), 1.6, BW + 0.12 + (i % 2) * 0.04));
    add(at(rot(tor(0.14, 0.025, COL.brass, K.BRASS, Math.PI * 2, 10), Math.PI / 2, 0, 0), STAGE.x + s * 1.6, 1.4, BW + 0.2));
  }
  add(at(box(3.6, 0.14, 0.22, COL.rasp), STAGE.x, 3.05, BW + 0.12));
  // The musician's stool and a glass of tea on the stage
  add(at(cyl(0.2, 0.22, 0.42, COL.raspDeep, 14), STAGE.x, STAGE.h + 0.21, STAGE.z - 0.1));
  add(at(cyl(0.21, 0.21, 0.06, COL.sun, 14), STAGE.x, STAGE.h + 0.45, STAGE.z - 0.1));
  add(at(cyl(0.035, 0.03, 0.08, mat('#f4e2c8', { rough: 0.2 }), 8), STAGE.x + 0.55, STAGE.h + 0.04, STAGE.z + 0.2));
  // Dance rug in front of the stage
  const rugRect = atlas.add(256, 256, (c, w) => {
    const ring = (rr, color) => {
      c.fillStyle = color;
      c.beginPath();
      c.arc(w / 2, w / 2, rr, 0, Math.PI * 2);
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
    for (const a of [0, Math.PI / 4]) {
      c.save();
      c.translate(w / 2, w / 2);
      c.rotate(a);
      c.fillRect(-34, -34, 68, 68);
      c.restore();
    }
  });
  const rug = mesh(atlas.fit(new THREE.CircleGeometry(RUG.r, 32), rugRect), atlas.material, { cast: false });
  rug.rotation.x = -Math.PI / 2;
  add(at(rug, RUG.x, 0.012, RUG.z));
  // Majlis cushions along the west wall and a brass tea table
  const maj = D.makeMajlis(MAJLIS.len);
  maj.rotation.y = Math.PI / 2;
  add(at(maj, MAJLIS.x, 0, MAJLIS.z));
  col(MAJLIS.x, MAJLIS.z, 0.36, MAJLIS.len / 2, 0.34);
  add(at(D.makeTeaTable(), MAJLIS.x + 1.15, 0, MAJLIS.z));
  circ(MAJLIS.x + 1.15, MAJLIS.z, 0.44, 0.46);
  wallLantern(S, add, X0 + 0.1, 1.95, MAJLIS.z - 1.0, 0.32, Math.PI / 2);
  wallLantern(S, add, X0 + 0.1, 1.95, MAJLIS.z + 1.0, 0.32, Math.PI / 2);
  // A low arched mirror over the majlis
  const mirror = new THREE.Group();
  mirror.add(mesh(T.shapeGeo(T.archShape(1.1, 0.7, 0.4)), mat('#dfeef2', { rough: 0.08, metal: 0.3 }), { cast: false }));
  mirror.add(at(mesh(T.shapeGeo(T.archRing(1.24, 0.72, 0.48, 0.07), 0.04), mat(COL.brass, K.BRASS)), 0, -0.03, 0));
  mirror.rotation.y = Math.PI / 2;
  add(at(mirror, X0 + 0.11, 1.3, MAJLIS.z));
  // The corner reserved for Roji and Homama: an arched alcove, heart lanterns, roses and a candle
  const RT = RESERVED;
  add(at(mesh(T.shapeGeo(T.archShape(2.3, 1.7, 0.7)), mat('#f2d3cd', { rough: 0.9 }), { cast: false }), RT.x, 0.0, BW + 0.005));
  add(at(mesh(T.shapeGeo(T.archRing(2.42, 1.72, 0.77, 0.07, { open: true }), 0.04), mat(COL.band)), RT.x, 0, BW + 0.01));
  add(at(mesh(T.shapeGeo(T.archRing(2.54, 1.74, 0.84, 0.05, { open: true }), 0.04), mat(COL.raspDeep)), RT.x, 0, BW + 0.01));
  for (const s of [-1, 1]) wallLantern(S, add, RT.x + s * 1.45, 1.7, BW);
  add(at(D.roundTable(0.45, COL.cream), RT.x, 0, RT.z));
  circ(RT.x, RT.z, 0.47, 0.78);
  add(at(box(0.6, 0.006, 0.6, COL.rasp), RT.x, 0.778, RT.z)).rotation.y = Math.PI / 4;
  // Roji's chair is its own piece: Homama pulls it out for her
  const rojiChair = K.makeChair(COL.pink);
  rojiChair.rotation.y = Math.PI / 2;
  rojiChair.position.set(RT.x - 0.62, 0, RT.z);
  bakeZone(rojiChair);
  add(rojiChair);
  dynamic.push(rojiChair);
  R.rojiChair = rojiChair;
  R.rojiChairCol = circ(RT.x - 0.62, RT.z, 0.22, 0.49);
  add(at(rot(K.makeChair(COL.mint), 0, -Math.PI / 2, 0), RT.x + 0.62, 0, RT.z));
  circ(RT.x + 0.62, RT.z, 0.22, 0.49);
  const candle = D.makeCandle();
  add(at(candle.group, RT.x + 0.06, 0.775, RT.z - 0.18));
  dynamic.push(candle.flame);
  R.candle = candle;
  R.candleGlow = K.glowSprite('#ffc978', 0.5);
  R.candleGlow.scale.setScalar(0.32);
  add(at(R.candleGlow, RT.x + 0.06, 0.99, RT.z - 0.18));
  dynamic.push(R.candleGlow);
  const vase = new THREE.Group();
  vase.add(at(cyl(0.035, 0.045, 0.14, COL.brass, 10, K.BRASS), 0, 0.07, 0));
  for (const [vx, vy, vz, c] of [[0, 0.2, 0, COL.rasp], [0.04, 0.18, 0.02, COL.rasp], [-0.035, 0.19, 0.015, COL.pink]]) vase.add(at(sph(0.035, c, undefined, 8), vx, vy, vz));
  add(at(vase, RT.x - 0.16, 0.775, RT.z - 0.22));
  const cardRect = S.atlas.add(150, 85, (c, w, h) => {
    c.fillStyle = COL.paper;
    K.roundRect(c, 2, 2, w - 4, h - 4, 10);
    c.fill();
    c.strokeStyle = COL.band;
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = COL.rasp;
    c.textAlign = 'center';
    c.font = `600 ${h * 0.2}px ${FONT}`;
    c.fillText('Reserved for', w / 2, h * 0.36);
    c.font = `600 ${h * 0.22}px ${FONT}`;
    c.fillText('Roji and Homama', w / 2, h * 0.68);
    K.heartPath(c, w / 2, h * 0.88, h * 0.12);
    c.fill();
  });
  const card = mesh(S.atlas.fit(new THREE.BoxGeometry(0.3, 0.17, 0.008), cardRect), S.atlas.material, { cast: false });
  // The card is its own piece so it can step aside for the dessert
  add(at(rot(card, -0.35, 0, 0), RT.x, 0.85, RT.z + 0.2));
  dynamic.push(card);
  R.reservedCard = card;
  // Easter egg: Roji's very first menu, framed on the wall by the table
  add(at(atlas.plane(0.5, 0.68, 150, 204, (c, w, h) => {
    c.fillStyle = '#fbf3df';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = COL.band;
    c.lineWidth = 3;
    c.strokeRect(8, 8, w - 16, h - 16);
    c.fillStyle = COL.rasp;
    c.textAlign = 'center';
    c.font = `600 ${h * 0.075}px ${FONT}`;
    c.fillText("Roji's first menu", w / 2, h * 0.14);
    c.fillStyle = COL.ink;
    c.font = `500 ${h * 0.06}px ${FONT}`;
    ['Pecan cake', 'Spanish latte', 'Shawarma', 'Lemonade'].forEach((s, i) => c.fillText(s, w / 2, h * (0.3 + i * 0.1)));
    c.font = `500 ${h * 0.045}px ${FONT}`;
    c.fillStyle = COL.raspDeep;
    c.fillText('Opening day.', w / 2, h * 0.76);
    c.fillText('First guest: Homama', w / 2, h * 0.82);
    K.heartPath(c, w / 2, h * 0.91, h * 0.06);
    c.fill();
  }), RT.x - 2.0, 1.55, BW + 0.03));
  add(at(rbox(0.58, 0.76, 0.04, COL.woodDark, 0.015), RT.x - 2.0, 1.55, BW + 0.005));
  add(at(K.makePlant(0.7, COL.rasp), -6.55, 0, -9.4));
  circ(-6.55, -9.4, 0.2);
  // Lounge plants and lights
  add(at(D.oliveTree(1.4, COL.rasp, 26), -14.3, 0, -1.65));
  circ(-14.3, -1.65, 0.26);

  // ================================================================ EAST FRONT: the main dining room
  zone = S.zones.east;
  const ecut = S.cutWalls[1];
  const eAdd = ecut.add;
  const colors = [COL.rasp, COL.pink];
  R.booths = BOOTHS.map((b, i) => booth(S, add, b.x, b.z, colors[i % 2]));
  R.wallBooths = WALL_BOOTHS.map((b, i) => booth(S, add, b.x, b.z, colors[(i + 1) % 2], true));
  // Windows above the booths: on the dessert bar wall and on the east wall
  for (const b of BOOTHS) eAdd(at(windowPanel(S), b.x - ecut.cx, 1.22, 0.11));
  for (const b of WALL_BOOTHS) {
    const w = windowPanel(S);
    w.rotation.y = -Math.PI / 2;
    add(at(w, X1 - 0.11, 1.22, b.z));
  }
  // Niches and lanterns between them, and Roji's logo card in brass
  eAdd(at(niche(S, 'coffee'), BOOTHS[0].x - ecut.cx - 1.4, 1.02, 0.1));
  eAdd(at(niche(S, 'roses'), (BOOTHS[0].x + BOOTHS[1].x) / 2 - ecut.cx, 1.02, 0.1));
  wallLantern(S, eAdd, (BOOTHS[0].x + BOOTHS[1].x) / 2 - ecut.cx, 2.25, 0.1);
  wallLantern(S, eAdd, BOOTHS[0].x - ecut.cx - 1.4, 2.25, 0.1);
  const logoCard = new THREE.Group();
  logoCard.add(atlas.themedPlane(0.92, 1.3, 336, 474, (c, w, h) => T.drawPoster(c, w, h)));
  logoCard.add(at(rbox(1.04, 1.42, 0.05, COL.brass, 0.02, K.BRASS), 0, 0, -0.04));
  logoCard.add(at(rbox(0.96, 1.34, 0.06, COL.raspDeep, 0.01), 0, 0, -0.04));
  logoCard.rotation.y = -Math.PI / 2;
  add(at(logoCard, X1 - 0.08, 1.85, (WALL_BOOTHS[0].z + WALL_BOOTHS[1].z) / 2));
  for (const z of [1.7, 8.9]) {
    const n = niche(S, z < 5 ? 'roses' : 'coffee');
    n.rotation.y = -Math.PI / 2;
    add(at(n, X1 - 0.1, 1.02, z));
  }
  R.e1 = roundTable(S, add, E1.x, E1.z, 'WES', { colors: [COL.mint, COL.rasp, COL.pink] });
  R.e2 = roundTable(S, add, E2.x, E2.z, 'NWE', { colors: [COL.pink, COL.sun, COL.mint] });
  for (const [x, z] of [[14.4, 9.3], [7.0, 9.3]]) {
    add(at(K.makePlant(0.8, COL.mint), x, 0, z));
    circ(x, z, 0.22);
  }
  const longRug = atlas.addThemed(512, 256, (c, w, h) => {
    c.fillStyle = COL.raspDeep;
    c.fillRect(0, 0, w, h);
    c.fillStyle = COL.paper;
    c.fillRect(8, 8, w - 16, h - 16);
    c.fillStyle = COL.rasp;
    c.fillRect(20, 20, w - 40, h - 40);
    c.fillStyle = '#f3cdc8';
    c.fillRect(26, 26, w - 52, h - 52);
    const a = T.getArt();
    if (a?.left && a?.right) {
      const cs = (h - 52) * 0.5;
      c.drawImage(a.left, 26, 26, cs, cs);
      c.drawImage(a.right, w - 26 - cs, 26, cs, cs);
    }
    c.fillStyle = COL.rasp;
    for (const rr of [h * 0.2, h * 0.13]) {
      c.fillStyle = rr > h * 0.15 ? COL.rasp : COL.paper;
      for (const ang of [0, Math.PI / 4]) {
        c.save();
        c.translate(w / 2, h / 2);
        c.rotate(ang);
        c.fillRect(-rr, -rr, 2 * rr, 2 * rr);
        c.restore();
      }
    }
  });
  const er = mesh(atlas.fit(new THREE.PlaneGeometry(4.0, 2.0), longRug), atlas.material, { cast: false });
  er.rotation.x = -Math.PI / 2;
  add(at(er, (E1.x + E2.x) / 2, 0.008, (E1.z + E2.z) / 2));
  er.rotation.z = Math.PI / 2;

  // ================================================================ EAST BACK: the dessert and coffee bar
  zone = S.zones.dessert;
  // Back bar with the espresso machine, a brass coffee pot, cups and syrups
  add(at(rbox(7.4, 0.92, 0.72, COL.cream, 0.04), 10.9, 0.46, -9.6));
  add(at(rbox(7.5, 0.05, 0.8, '#ffffff', 0.02, { rough: 0.35 }), 10.9, 0.945, -9.6));
  add(at(box(7.4, 0.08, 0.02, COL.rasp), 10.9, 0.75, -9.23));
  col(10.9, -9.6, 3.75, 0.42, 0.97);
  const ESP = { x: 10.0, z: -9.65 };
  add(at(rbox(0.62, 0.5, 0.42, COL.raspDeep, 0.05), ESP.x, 1.22, ESP.z));
  add(at(sph(0.16, COL.brass, K.BRASS, 14), ESP.x, 1.52, ESP.z));
  add(at(sph(0.04, COL.brass, K.BRASS, 8), ESP.x, 1.7, ESP.z));
  add(at(box(0.46, 0.05, 0.08, COL.brass, K.BRASS), ESP.x, 1.15, ESP.z + 0.24));
  for (const dx of [-0.13, 0.13]) {
    add(at(cyl(0.03, 0.03, 0.08, COL.steelDark, 8, { metal: 0.5, rough: 0.3 }), ESP.x + dx, 1.08, ESP.z + 0.25));
    add(at(cyl(0.04, 0.032, 0.06, COL.cream, 8, { rough: 0.3 }), ESP.x + dx, 1.0, ESP.z + 0.25));
  }
  R.espresso = new THREE.Vector3(ESP.x, 1.2, ESP.z + 0.3);
  add(at(K.makeDallah(0.36), 11.0, 0.97, -9.65));
  for (let i = 0; i < 6; i++) add(at(cyl(0.045, 0.035, 0.07, i % 2 ? COL.cream : COL.rasp, 8, { rough: 0.3 }), 11.8 + (i % 3) * 0.12, 1.0 + Math.floor(i / 3) * 0.075, -9.65));
  [COL.sun, '#9b5e3c', COL.pink, '#e4ef9a'].forEach((c, i) => {
    add(at(cyl(0.04, 0.04, 0.26, c, 8, { rough: 0.25 }), 12.7 + i * 0.13, 1.1, -9.7));
    add(at(cyl(0.012, 0.012, 0.08, COL.steelDark, 6), 12.7 + i * 0.13, 1.27, -9.7));
  });
  add(at(rbox(4.0, 0.05, 0.28, COL.woodDark, 0.02), 11.2, 2.15, -9.8));
  [COL.sun, COL.pink, COL.mint, COL.orange, COL.cream, COL.rasp].forEach((c, i) => {
    add(at(cyl(0.09, 0.09, 0.22, c, 10), 9.6 + i * 0.6, 2.29, -9.8));
    add(at(cyl(0.095, 0.095, 0.03, '#ffffff', 10), 9.6 + i * 0.6, 2.41, -9.8));
  });
  add(at(D.paperSign(atlas, 1.8, 0.5, 'Spanish latte', { size: 0.42, sub: 'with love from Roji' }), 8.1, 1.9, BW + 0.01));
  wallLantern(S, add, 7.0, 1.9, BW);
  wallLantern(S, add, 13.9, 1.9, BW);
  // The bar counter with the cake case and the stools
  const BL = BAR.x1 - BAR.x0;
  const BM = (BAR.x0 + BAR.x1) / 2;
  add(at(rbox(BL, 0.95, 0.56, COL.cream, 0.05), BM, 0.475, BAR.z));
  add(at(rbox(BL + 0.14, 0.06, 0.7, '#fffaf4', 0.025, { rough: 0.3 }), BM, 0.98, BAR.z));
  add(at(mesh(uvScale(new THREE.PlaneGeometry(BL - 0.2, 0.46), (BL - 0.2) / 0.46, 1), S.mats.mSplash, { cast: false }), BM, 0.52, BAR.z + 0.285));
  for (const y of [0.27, 0.77]) add(at(box(BL - 0.16, 0.04, 0.03, COL.raspDeep), BM, y, BAR.z + 0.29));
  add(at(box(BL, 0.12, 0.62, COL.blush), BM, 0.06, BAR.z));
  add(at(rot(cyl(0.025, 0.025, BL - 0.1, COL.brass, 8, K.BRASS), 0, 0, Math.PI / 2), BM, 0.2, BAR.z + 0.4));
  col(BM, BAR.z, BL / 2 + 0.07, 0.35, 1.01);
  const cakeCase = D.makeCakeCase(2.4, 0.56, 0.62);
  add(at(cakeCase.group, 9.2, 1.01, BAR.z - 0.02));
  dynamic.push(cakeCase.glass);
  R.cakeSlots = cakeCase.slots.map((s) => ({ x: 9.2 + s.x, y: 1.01 + s.y, z: BAR.z - 0.02 }));
  for (const x of LATTE_STOOLS) {
    add(at(D.stool(COL.rasp), x, 0, LATTE_Z));
    circ(x, LATTE_Z, 0.22, 0.71);
  }
  // Easter egg: a little bowl of sugar packets, and one of them says R + H
  add(at(cyl(0.09, 0.07, 0.07, COL.cream, 12, { rough: 0.3 }), 13.45, 1.045, BAR.z));
  const pk = atlas.add(64, 40, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    c.fillStyle = COL.rasp;
    c.fillRect(0, 0, w, 6);
    c.fillRect(0, h - 6, w, 6);
    c.font = `700 ${h * 0.42}px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('R + H', w / 2, h / 2 + 1);
  });
  const pk2 = atlas.add(64, 40, (c, w, h) => {
    c.fillStyle = '#fff6e6';
    c.fillRect(0, 0, w, h);
    c.fillStyle = COL.band;
    c.fillRect(0, 0, w, 6);
    c.fillRect(0, h - 6, w, 6);
  });
  [[13.42, 1.095, BAR.z + 0.02, 0.5, pk], [13.48, 1.09, BAR.z - 0.02, -0.4, pk2], [13.4, 1.085, BAR.z - 0.03, 0.2, pk2]].forEach(([x, y, z, ry, rect]) => {
    const p = mesh(atlas.fit(new THREE.PlaneGeometry(0.08, 0.05), rect), atlas.material, { cast: false });
    p.rotation.set(-1.1, ry, 0);
    add(at(p, x, y, z));
  });
  R.cafe = CAFE.map((t, i) => roundTable(S, add, t.x, t.z, 'WE', { r: 0.42, colors: i ? [COL.pink, COL.mint] : [COL.sun, COL.rasp] }));
  // The restroom door on the east wall
  const rd = D.makeRestroomDoor(atlas);
  rd.rotation.y = -Math.PI / 2;
  add(at(rd, RESTROOM.x - 0.1, 0, RESTROOM.z));
  add(at(K.makePlant(0.75, COL.rasp), 14.4, 0, -1.65));
  circ(14.4, -1.65, 0.2);
  add(at(K.makePlant(0.7, COL.mint), 6.7, 0, -5.2));
  circ(6.7, -5.2, 0.2);
  return R;
}
