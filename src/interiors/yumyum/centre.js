import * as K from './kit.js';
import * as T from './theme.js';
import * as D from './decor.js';
import { uvScale } from './shell.js';
import { bakeZone } from './bake.js';
import { Z0, GRILL, ISLAND, COUNTER, STOOLS, STOOL_Z, MIX, MENU, T1, T2, T3, PARTY, HOST } from './layout.js';

// The centre of the big YumYum: the open kitchen along the back wall, the long counter in front of it with
// stools, the milkshake mixer and the register, the dining tables (one dressed for parties) and the entrance with
// the host stand, a waiting bench and the welcome mat.

const { THREE, COL, box, rbox, cyl, sph, tor, at, rot, mat, mesh, FONT } = K;

export const MENU_ITEMS = [
  ['shawarma', 'Shawarma', '7'],
  ['burger', 'Burgers', '5'],
  ['fries', 'Fries', '4'],
  ['latte', 'Spanish latte', '4'],
  ['lemonade', 'Mint lemonade', '3'],
  ['pecan', 'Pecan cake', '4'],
  ['german', 'German cake', '4'],
  ['mansaf', 'Mansaf', '9'],
];

// A round table with chairs on the named sides (N, S, E, W). Returns the seat of each chair: { x, z, yaw }.
export function roundTable(S, add, x, z, sides, { r = 0.45, colors = [COL.mint, COL.pink, COL.rasp, COL.sun], vase = true } = {}) {
  add(at(D.roundTable(r, COL.cream), x, 0, z));
  S.circ(x, z, r + 0.02, 0.78);
  const d = r + 0.17;
  const seats = {};
  [...sides].forEach((c, i) => {
    const [dx, dz, ry] = { N: [0, -d, 0], S: [0, d, Math.PI], E: [d, 0, -Math.PI / 2], W: [-d, 0, Math.PI / 2] }[c];
    add(at(rot(K.makeChair(colors[i % colors.length]), 0, ry, 0), x + dx, 0, z + dz));
    S.circ(x + dx, z + dz, 0.22, 0.49);
    seats[c] = { x: x + dx, z: z + dz, yaw: ry };
  });
  if (vase) {
    const v = new THREE.Group();
    v.add(at(cyl(0.045, 0.055, 0.13, COL.brass, 10, K.BRASS), 0, 0.065, 0));
    for (const [vx, vz, c] of [[0, 0, COL.rasp], [0.04, 0.02, COL.pink], [-0.04, 0.01, '#ffffff']]) v.add(at(sph(0.032, c, undefined, 8), vx, 0.18, vz));
    add(at(v, x + r * 0.4, 0.775, z - r * 0.4));
  }
  return seats;
}

// A sandwich board with a chalk menu.
export function specialBoard(S, add, x, z, ry, title, lines) {
  const st = new THREE.Group();
  for (const s of [-1, 1]) st.add(at(rot(rbox(0.04, 1.0, 0.04, COL.woodDark, 0.01), s * 0.2, 0, 0), 0, 0.48, s * 0.17));
  st.add(at(rot(rbox(0.66, 0.84, 0.04, COL.woodDark, 0.02), -0.2, 0, 0), 0, 0.56, 0.12));
  const face = S.atlas.plane(0.58, 0.76, 190, 250, (c, w, h) => {
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
  S.circ(x, z, 0.3);
}

export function wallLantern(S, add, x, y, z, reach = 0.32, ry = 0) {
  const g = new THREE.Group();
  g.add(at(box(0.04, 0.04, reach, COL.brass, K.BRASS), 0, 0.55, reach / 2));
  g.add(at(rbox(0.12, 0.16, 0.03, COL.brass, 0.01, K.BRASS), 0, 0.55, 0.01));
  g.add(at(cyl(0.006, 0.006, 0.14, COL.brass, 4, K.BRASS), 0, 0.47, reach));
  g.add(at(K.makeLantern(0.75, S.lampMat), 0, 0, reach));
  g.rotation.y = ry;
  return add(at(g, x, y, z));
}

export function buildCentre(S) {
  const { atlas, col, circ, dynamic } = S;
  const M = S.mats;
  const R = {};
  let zone = S.zones.kitchen;
  const add = (...o) => (zone.add(...o), o[0]);
  const BW = Z0 + 0.1; // the back wall's face

  // ---------------------------------------------------------------- the open kitchen
  // Fridge with a note on it
  add(at(rbox(1.0, 2.2, 0.85, COL.steel, 0.06, { metal: 0.35, rough: 0.35 }), -5.35, 1.1, -9.5));
  add(at(box(0.92, 0.02, 0.02, COL.steelDark), -5.35, 1.35, -9.07));
  for (const y of [0.85, 1.75]) add(at(rbox(0.05, 0.4, 0.05, COL.steelDark, 0.02, { metal: 0.5, rough: 0.3 }), -4.95, y, -9.04));
  for (const [x, y, c] of [[-5.6, 1.8, COL.hotpink], [-5.4, 1.6, COL.sun], [-5.65, 0.9, COL.mint]]) add(at(rot(cyl(0.045, 0.045, 0.02, c, 12), Math.PI / 2, 0, 0), x, y, -9.065));
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
  }), -5.5, 1.25, -9.068));
  col(-5.35, -9.5, 0.52, 0.45);
  // The cooking line: cabinets with a steel top, the grill, the fryer and the sink
  const LX0 = -4.8;
  const LX1 = 1.0;
  add(at(rbox(LX1 - LX0, 0.9, 0.85, COL.cream, 0.04), (LX0 + LX1) / 2, 0.45, -9.55));
  add(at(rbox(LX1 - LX0 + 0.1, 0.05, 0.92, COL.steel, 0.02, { metal: 0.45, rough: 0.3 }), (LX0 + LX1) / 2, 0.925, -9.55));
  add(at(box(LX1 - LX0, 0.1, 0.02, COL.orange), (LX0 + LX1) / 2, 0.8, -9.12));
  for (let i = 0; i < 6; i++) add(at(box(0.02, 0.6, 0.02, '#ead9c3'), LX0 + 0.5 + i * 0.96, 0.4, -9.12));
  col((LX0 + LX1) / 2, -9.55, (LX1 - LX0) / 2, 0.45, 0.95);
  add(at(mesh(uvScale(new THREE.PlaneGeometry(LX1 - LX0, 0.64), (LX1 - LX0) / 0.32, 2), M.mSplash, { cast: false }), (LX0 + LX1) / 2, 1.3, BW + 0.005));
  add(at(box(LX1 - LX0, 0.04, 0.03, COL.raspDeep), (LX0 + LX1) / 2, 1.635, BW + 0.01));
  const grill = K.makeGrill(1.6, 3, 0.6);
  add(at(grill.group, GRILL.x, 0.95, GRILL.z));
  R.sizzle = grill.spots.map((x) => {
    add(at(mesh(K.pattyGeometry(), mat(COL.patty), { cast: false }), GRILL.x + x, 0.95 + grill.top, GRILL.z + 0.02));
    return new THREE.Vector3(GRILL.x + x, 1.1, GRILL.z + 0.05);
  });
  const fryer = K.makeFryer();
  add(at(fryer.group, -1.6, 0.95, -9.55));
  fryer.fries.visible = true;
  fryer.fries.material.color.set(COL.fries);
  fryer.basket.position.y = fryer.downY;
  dynamic.push(fryer.basket);
  bakeZone(fryer.basket, [fryer.fries]);
  R.fryer = fryer;
  add(at(box(0.8, 0.04, 0.55, COL.steelDark, { metal: 0.5, rough: 0.3 }), 0.25, 0.93, -9.5));
  add(at(rot(tor(0.08, 0.018, COL.steel, { metal: 0.6, rough: 0.25 }, Math.PI), 0, Math.PI / 2, 0), 0.25, 1.05, -9.82));
  for (let i = 0; i < 5; i++) add(at(cyl(0.16, 0.14, 0.02, '#ffffff', 18, { rough: 0.3 }), -0.5, 0.97 + i * 0.025, -9.55));
  // Hood with lights, utensil rail and shelves
  add(at(rbox(3.6, 0.5, 1.0, COL.steel, 0.05, { metal: 0.45, rough: 0.3 }), -2.5, 2.45, -9.5));
  add(at(box(3.4, 0.05, 0.9, '#c3cbd3'), -2.5, 2.18, -9.5));
  for (const x of [-3.8, -2.5, -1.2]) add(at(sph(0.07, S.lampMat, undefined, 10), x, 2.15, -9.3));
  add(at(rot(cyl(0.015, 0.015, 1.5, COL.steelDark, 8, { metal: 0.5, rough: 0.3 }), 0, 0, Math.PI / 2), 0.2, 1.75, -9.85));
  for (const [x, c, kind] of [[-0.35, COL.steelDark, 'ladle'], [-0.05, COL.red, 'spatula'], [0.25, COL.steelDark, 'whisk'], [0.55, COL.mint, 'spatula']]) {
    add(at(cyl(0.01, 0.01, 0.3, c, 6), x, 1.58, -9.85));
    if (kind === 'ladle') add(at(sph(0.05, c, undefined, 10), x, 1.41, -9.83));
    else if (kind === 'whisk') add(at(sph(0.045, '#c3cbd3', undefined, 8), x, 1.39, -9.84));
    else add(at(rbox(0.07, 0.1, 0.012, c, 0.01), x, 1.39, -9.84));
  }
  add(at(rbox(1.5, 0.05, 0.3, COL.woodDark, 0.02), 0.3, 2.35, -9.8));
  [COL.sun, COL.pink, COL.mint, COL.orange].forEach((c, i) => {
    add(at(cyl(0.09, 0.09, 0.22, c, 12), -0.2 + i * 0.34, 2.49, -9.8));
    add(at(cyl(0.095, 0.095, 0.03, '#ffffff', 12), -0.2 + i * 0.34, 2.61, -9.8));
  });
  // Easter egg: a crayon drawing of Roji in a chef's hat, taped to the tiles behind the counter
  add(at(atlas.plane(0.27, 0.33, 108, 132, (c, w, h) => {
    c.fillStyle = '#fffdf6';
    c.fillRect(0, 0, w, h);
    c.lineCap = 'round';
    c.lineWidth = 3;
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#8a8f99';
    c.beginPath();
    c.arc(w / 2 - 12, 30, 12, 0, Math.PI * 2);
    c.arc(w / 2 + 12, 30, 12, 0, Math.PI * 2);
    c.arc(w / 2, 22, 13, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillRect(w / 2 - 18, 34, 36, 10);
    c.strokeRect(w / 2 - 18, 34, 36, 10);
    c.fillStyle = '#f8dccb';
    c.beginPath();
    c.arc(w / 2, 60, 16, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#2a1a13';
    c.fillRect(w / 2 - 22, 50, 7, 20);
    c.fillRect(w / 2 + 15, 50, 7, 20);
    c.beginPath();
    c.arc(w / 2 - 6, 58, 2, 0, Math.PI * 2);
    c.arc(w / 2 + 6, 58, 2, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#d23c5b';
    c.beginPath();
    c.arc(w / 2, 64, 6, 0.2, Math.PI - 0.2);
    c.stroke();
    c.fillStyle = '#ef5b6f';
    c.beginPath();
    c.moveTo(w / 2 - 14, 78);
    c.lineTo(w / 2 + 14, 78);
    c.lineTo(w / 2 + 22, 112);
    c.lineTo(w / 2 - 22, 112);
    c.fill();
    c.fillStyle = COL.rasp;
    c.font = `600 13px ${FONT}`;
    c.textAlign = 'center';
    c.fillText('Chef Roji', w / 2, 127);
    K.heartPath(c, w - 14, 100, 12);
    c.fill();
    c.fillStyle = 'rgba(240,220,160,0.8)';
    c.fillRect(w / 2 - 14, 0, 28, 7);
  }), 1.28, 1.36, BW + 0.012)).rotation.z = -0.05;

  // The back bar: soda fountain, cups, cake domes, and the arched menu above it
  add(at(rbox(4.4, 0.92, 0.75, COL.cream, 0.04), 3.65, 0.46, -9.58));
  add(at(rbox(4.5, 0.05, 0.82, '#ffffff', 0.02, { rough: 0.35 }), 3.65, 0.945, -9.58));
  add(at(box(4.4, 0.08, 0.02, COL.red), 3.65, 0.75, -9.2));
  col(3.65, -9.58, 2.25, 0.42, 0.97);
  const soda = K.makeSodaMachine(atlas);
  add(at(soda.group, 1.95, 0.97, -9.6));
  for (let i = 0; i < 4; i++) {
    const x = 2.75 + (i % 2) * 0.2;
    const y = 0.97 + Math.floor(i / 2) * 0.17;
    add(at(cyl(0.065, 0.05, 0.16, i % 2 ? COL.rasp : COL.paper, 10), x, y + 0.08, -9.6));
    add(at(cyl(0.068, 0.068, 0.012, COL.cream, 10), x, y + 0.165, -9.6));
  }
  const domeMat = new THREE.MeshStandardMaterial({ color: '#f2fbff', roughness: 0.05, transparent: true, opacity: 0.3, depthWrite: false });
  S.domeMat = domeMat;
  R.domes = [];
  const glassGeos = [];
  for (const [x, id] of [[3.6, 'pecan-cake'], [4.45, 'german-cake'], [5.3, 'cupcake']]) {
    add(at(cyl(0.26, 0.28, 0.04, '#ffffff', 20, { rough: 0.3 }), x, 0.99, -9.6));
    add(at(cyl(0.04, 0.06, 0.12, '#ffffff', 10, { rough: 0.3 }), x, 1.05, -9.6));
    glassGeos.push(new THREE.SphereGeometry(0.27, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.25, 1).translate(x, 1.01, -9.6));
    add(at(sph(0.035, COL.steelDark, { metal: 0.5, rough: 0.3 }, 8), x, 1.36, -9.6));
    R.domes.push({ x, id, z: -9.6 });
  }
  R.glassGeos = glassGeos;
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
  add(at(mesh(atlas.fit(T.shapeGeo(T.archShape(MENU.w, MENU.s, MENU.r)), menuRect), atlas.material, { cast: false }), MENU.x, MENU.y, BW + 0.06));
  add(at(mesh(T.shapeGeo(T.archShape(MENU.w + 0.12, MENU.s + 0.06, MENU.r + 0.08), 0.05), mat(COL.raspDeep)), MENU.x, MENU.y - 0.06, BW));
  wallLantern(S, add, 1.95, 1.95, BW);
  wallLantern(S, add, 5.35, 1.95, BW);
  // Clock above the fridge
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
  const CK = { x: -5.35, y: 2.72 };
  add(at(tor(0.28, 0.035, COL.brass, K.BRASS), CK.x, CK.y, BW + 0.03));
  add(at(mesh(atlas.fit(new THREE.CircleGeometry(0.27, 22), clockFace), atlas.material, { cast: false }), CK.x, CK.y, BW + 0.04));
  const hourP = at(new THREE.Group(), CK.x, CK.y, BW + 0.06);
  const minP = at(new THREE.Group(), CK.x, CK.y, BW + 0.07);
  hourP.add(at(box(0.025, 0.14, 0.01, COL.ink), 0, 0.055, 0));
  minP.add(at(box(0.018, 0.2, 0.01, COL.ink), 0, 0.085, 0));
  add(hourP, minP);
  dynamic.push(hourP, minP);
  R.hourP = hourP;
  R.minP = minP;
  // Prep island with burgers being made; the cook works behind it
  add(at(rbox(2.4, 0.9, 0.9, COL.orange, 0.05), ISLAND.x, 0.45, ISLAND.z));
  add(at(rbox(2.5, 0.05, 1.0, COL.steel, 0.02, { metal: 0.45, rough: 0.3 }), ISLAND.x, 0.925, ISLAND.z));
  add(at(box(2.4, 0.08, 0.02, COL.cream), ISLAND.x, 0.6, ISLAND.z + 0.45));
  col(ISLAND.x, ISLAND.z, 1.25, 0.5, 0.95);
  for (const [x, tops, patty] of [[-0.75, ['cheese', 'tomato', 'lettuce'], true], [-0.25, ['cheese'], true], [0.25, [], false]]) {
    const b = new K.Burger({ plate: true });
    b.set(patty, tops);
    b.group.scale.setScalar(0.8);
    add(at(b.group, ISLAND.x + x, 0.95, ISLAND.z + 0.15));
  }
  add(at(rbox(0.5, 0.03, 0.32, COL.woodDark, 0.01), ISLAND.x + 0.8, 0.965, ISLAND.z + 0.1));
  for (const [x, z] of [[0.68, 0.05], [0.78, 0.15], [0.9, 0.06]]) add(at(cyl(0.05, 0.05, 0.02, COL.tomato, 12), ISLAND.x + x, 0.99, ISLAND.z + z));
  add(at(rot(mesh(K.lettuceGeometry(), mat(COL.lettuce)), 0.2, 0, 0), ISLAND.x + 0.95, 1.0, ISLAND.z - 0.2));
  add(at(K.makeFriesBox(), ISLAND.x - 1.05, 0.95, ISLAND.z + 0.15));
  add(at(rbox(2.6, 0.02, 0.7, COL.pink, 0.01), GRILL.x, 0.01, -8.55));
  // Potato sacks and crates of vegetables by the fridge
  for (const [x, z, s] of [[-5.45, -7.6, 1], [-5.15, -7.0, 0.85]]) {
    const sack = sph(0.32 * s, '#d9b98a', { rough: 0.95 }, 12);
    sack.scale.set(1, 1.15, 0.9);
    add(at(sack, x, 0.32 * s, z));
    add(at(cyl(0.12 * s, 0.17 * s, 0.12 * s, '#c9a674', 10), x, 0.68 * s, z));
    circ(x, z, 0.3 * s, 0.6 * s);
  }
  for (const [x, z, h, fill] of [[-5.4, -5.6, 0, COL.tomato], [-5.4, -5.05, 0, '#d9b98a'], [-5.4, -5.32, 0.42, COL.lettuce]]) {
    add(at(rbox(0.56, 0.4, 0.5, COL.wood, 0.02), x, h + 0.2, z));
    for (const sx of [-1, 1]) add(at(box(0.02, 0.08, 0.46, COL.woodDark), x + sx * 0.28, h + 0.3, z));
    for (let i = 0; i < 6; i++) add(at(D.bud(0.075, fill, 0.6), x - 0.15 + (i % 3) * 0.15, h + 0.42, z - 0.1 + Math.floor(i / 3) * 0.2));
  }
  col(-5.4, -5.32, 0.3, 0.55, 0.83);
  const bin = K.makeTrash(atlas);
  add(at(bin.group, 5.45, 0, -8.6));
  circ(5.45, -8.6, 0.2, 0.37);

  // ---------------------------------------------------------------- the long counter
  zone = S.zones.dining;
  const { x0: CX0, x1: CX1, z: CZ } = COUNTER;
  const CL = CX1 - CX0;
  const CM = (CX0 + CX1) / 2;
  add(at(rbox(CL, 0.95, 0.56, COL.cream, 0.05), CM, 0.475, CZ));
  add(at(rbox(CL + 0.14, 0.06, 0.7, '#fffaf4', 0.025, { rough: 0.3 }), CM, 0.98, CZ));
  add(at(box(CL + 0.1, 0.04, 0.02, COL.raspDeep), CM, 0.93, CZ + 0.29));
  add(at(mesh(uvScale(new THREE.PlaneGeometry(CL - 0.2, 0.46), (CL - 0.2) / 0.46, 1), M.mSplash, { cast: false }), CM, 0.52, CZ + 0.285));
  for (const y of [0.27, 0.77]) add(at(box(CL - 0.16, 0.04, 0.03, COL.raspDeep), CM, y, CZ + 0.29));
  const PLQ = { x: -1.1, w: 1.0, h: 0.46 };
  add(at(atlas.themedPlane(PLQ.w, PLQ.h, 512, Math.round((512 * PLQ.h) / PLQ.w), (c, w, h) => T.drawPoster(c, w, h, { logoWidth: 0.6 })), PLQ.x, 0.52, CZ + 0.325));
  add(at(rbox(PLQ.w + 0.08, PLQ.h + 0.08, 0.04, COL.brass, 0.015, K.BRASS), PLQ.x, 0.52, CZ + 0.3));
  add(at(box(CL, 0.12, 0.62, COL.blush), CM, 0.06, CZ));
  add(at(rot(cyl(0.025, 0.025, CL - 0.1, COL.brass, 8, K.BRASS), 0, 0, Math.PI / 2), CM, 0.2, CZ + 0.4));
  for (let i = 0; i < 8; i++) add(at(rot(cyl(0.015, 0.015, 0.14, COL.brass, 6, K.BRASS), Math.PI / 2, 0, 0), CX0 + 0.3 + i * ((CL - 0.6) / 7), 0.2, CZ + 0.34));
  col(CM, CZ, CL / 2 + 0.07, 0.35, 1.01);
  for (const x of STOOLS) {
    add(at(D.stool(COL.rasp), x, 0, STOOL_Z));
    circ(x, STOOL_Z, 0.22, 0.71);
  }
  // The pass: a steel shelf on posts with heat lamps and order tickets over the west half of the counter
  add(at(rbox(4.4, 0.05, 0.34, COL.steel, 0.02, { metal: 0.45, rough: 0.3 }), -3.3, 1.5, CZ - 0.05));
  for (const x of [-5.4, -1.2]) add(at(cyl(0.025, 0.025, 0.5, COL.steelDark, 8, { metal: 0.5, rough: 0.3 }), x, 1.25, CZ - 0.05));
  add(at(box(4.2, 0.04, 0.04, COL.steel, { metal: 0.5, rough: 0.3 }), -3.3, 2.05, CZ - 0.05));
  for (const x of [-4.8, -3.3, -1.8]) {
    add(at(cyl(0.06, 0.16, 0.2, COL.brass, 12, K.BRASS), x, 1.92, CZ - 0.05));
    add(at(sph(0.07, S.lampMat, undefined, 10), x, 1.82, CZ - 0.05));
  }
  const ticketTex = atlas.add(64, 96, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#c9b8c2';
    for (let i = 0; i < 5; i++) c.fillRect(8, 16 + i * 14, w - 16 - (i % 2) * 14, 5);
    c.fillStyle = COL.orange;
    c.fillRect(0, 0, w, 8);
  });
  for (const x of [-5.0, -4.4, -3.9, -2.6, -2.1]) add(at(mesh(atlas.fit(new THREE.PlaneGeometry(0.13, 0.19), ticketTex), atlas.material, { cast: false }), x, 1.88, CZ + 0.01));
  for (const [x, id] of [[-4.2, 'cheese'], [-2.4, 'deluxe']]) {
    const it = K.makeItem(id);
    it.scale.setScalar(0.75);
    add(at(it, x, 1.53, CZ - 0.05));
  }
  // Napkins and sauces, the shake mixer, the register and a tip jar
  for (const x of [-4.6, -2.2, 0.2]) {
    add(at(rbox(0.18, 0.12, 0.1, COL.brass, 0.02, K.BRASS), x, 1.07, CZ + 0.05));
    add(at(box(0.14, 0.03, 0.08, '#ffffff'), x, 1.14, CZ + 0.05));
    add(at(cyl(0.035, 0.04, 0.16, COL.cherry, 8), x + 0.18, 1.09, CZ + 0.05));
    add(at(cyl(0.035, 0.04, 0.16, '#f0c23c', 8), x + 0.27, 1.09, CZ + 0.05));
  }
  const mixer = K.makeShakeMachine(atlas);
  add(at(mixer.group, MIX.x, 1.01, MIX.z));
  dynamic.push(mixer.spin, mixer.cup);
  K.colorBake(mixer.spin);
  K.colorBake(mixer.cup);
  R.mixer = mixer;
  const register = K.makeRegister();
  register.show('YUM');
  add(at(rot(register.group, 0, -0.35, 0), 3.2, 1.01, CZ - 0.02));
  // The domes over the cakes and the tip jar share one glass mesh
  glassGeos.push(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 14, 1, true).translate(1.5, 1.12, CZ + 0.05));
  const glass = mesh(K.mergeGeometries(glassGeos.map((q) => q.toNonIndexed()), false), domeMat, { cast: false, receive: false });
  S.g.add(glass);
  dynamic.push(glass);
  add(at(cyl(0.09, 0.09, 0.08, COL.brass, 12, K.BRASS), 1.5, 1.05, CZ + 0.05));
  // A little post sign at the kitchen gap
  add(at(cyl(0.03, 0.03, 1.0, COL.brass, 6, K.BRASS), 3.85, 0.5, CZ + 0.15));
  add(at(cyl(0.12, 0.14, 0.04, COL.brass, 12, K.BRASS), 3.85, 0.02, CZ + 0.15));
  add(at(D.paperSign(atlas, 0.62, 0.26, 'Staff and Roji', { size: 0.34 }), 3.85, 1.08, CZ + 0.18));
  circ(3.85, CZ + 0.15, 0.1);

  // ---------------------------------------------------------------- dining tables
  R.t1 = roundTable(S, add, T1.x, T1.z, 'NEW');
  R.t2 = roundTable(S, add, T2.x, T2.z, 'NWE', { colors: [COL.pink, COL.mint, COL.rasp] });
  R.t3 = roundTable(S, add, T3.x, T3.z, 'NWE', { colors: [COL.rasp, COL.sun, COL.mint] });
  R.party = roundTable(S, add, PARTY.x, PARTY.z, 'NESW', { r: PARTY.r, colors: [COL.rasp, COL.pink, COL.sun, COL.mint], vase: false });
  // The party table has a lace runner, a little garland and three balloons tied to a chair
  add(at(box(1.0, 0.006, 0.24, COL.paper), PARTY.x, 0.78, PARTY.z));
  const balloons = new THREE.Group();
  [[COL.rasp, -0.12, 2.05], [COL.sun, 0.14, 1.95], ['#aab78a', 0.0, 2.25]].forEach(([c, dx, y], i) => {
    const b = i === 0 ? mesh(heartExtrude(0.32), mat(c, { rough: 0.3 })) : sph(0.16, mat(c, { rough: 0.3 }), undefined, 12);
    if (i) b.scale.y = 1.18;
    balloons.add(at(b, dx, y, 0));
    const len = y - 0.6;
    balloons.add(at(rot(cyl(0.004, 0.004, len, '#ffffff', 3), 0, 0, -dx * 0.6), dx * 0.5, 0.6 + len / 2, 0));
  });
  bakeZone(balloons);
  balloons.position.set(PARTY.x - 0.72 - 0.15, 0, PARTY.z - 0.1);
  add(balloons);
  dynamic.push(balloons);
  R.balloons = balloons;
  specialBoard(S, add, -5.3, 1.6, 0.5, 'Milkshake bar', ['Strawberry', 'Chocolate', 'Vanilla', 'Mint']);

  // ---------------------------------------------------------------- the entrance
  zone = S.zones.foyer;
  // Welcome mat and a long runner rug up the middle to the counter
  add(at(rbox(1.6, 0.03, 0.8, COL.rasp, 0.015), 0, 0.015, 9.25));
  add(at(rbox(1.4, 0.035, 0.6, COL.cream, 0.015), 0, 0.02, 9.25));
  add(at(atlas.plane(0.9, 0.3, 240, 80, (c, w, h) => {
    c.fillStyle = COL.cream;
    c.fillRect(0, 0, w, h);
    c.fillStyle = COL.rasp;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 ${h * 0.6}px ${FONT}`;
    c.fillText('Welcome', w / 2, h / 2 + 2);
  }), 0, 0.04, 9.25)).rotation.x = -Math.PI / 2;
  const RUN = { z0: -2.25, z1: 8.7, w: 1.7 };
  // The runner lives on the atlas: three tiles of its pattern in one long strip
  const tile = (c, w, h, oy) => {
    c.fillStyle = COL.raspDeep;
    c.fillRect(0, oy, w, h);
    c.fillStyle = COL.paper;
    c.fillRect(10, oy, w - 20, h);
    c.fillStyle = COL.rasp;
    c.fillRect(20, oy, w - 40, h);
    c.fillStyle = '#f3cdc8';
    c.fillRect(26, oy, w - 52, h);
    for (const [y, rr, col] of [[h * 0.25, 18, COL.rasp], [h * 0.75, 18, COL.rasp], [h * 0.25, 9, COL.paper], [h * 0.75, 9, COL.paper]]) {
      c.fillStyle = col;
      c.save();
      c.translate(w / 2, oy + y);
      c.rotate(Math.PI / 4);
      c.fillRect(-rr, -rr, 2 * rr, 2 * rr);
      c.restore();
    }
    c.fillStyle = COL.band;
    for (const y of [0, h * 0.5]) {
      K.heartPath(c, w / 2, oy + y + 6, 14);
      c.fill();
    }
  };
  const runnerRect = atlas.add(128, 768, (c, w, h) => {
    for (let i = 0; i < 3; i++) tile(c, w, h / 3, (i * h) / 3);
  });
  const runner = mesh(atlas.fit(new THREE.PlaneGeometry(RUN.w, RUN.z1 - RUN.z0), runnerRect), atlas.material, { cast: false });
  runner.rotation.x = -Math.PI / 2;
  add(at(runner, 0, 0.008, (RUN.z0 + RUN.z1) / 2));
  // Easter egg: one floor tile by the host stand has a little raspberry heart instead of a star
  add(at(rot(mesh(heartFlat(0.16), mat(COL.rasp, { rough: 0.6 }), { cast: false }), -Math.PI / 2, 0, 0), 1.3, 0.006, 7.8));
  // Host stand
  add(at(D.makeHostStand(atlas), HOST.x, 0, HOST.z));
  col(HOST.x, HOST.z, 0.42, 0.27, 1.06);
  // Waiting bench, a coat stand, plants and a gumball machine
  add(at(K.makeBench(1.6, COL.rasp, COL.cream), -3.0, 0, 8.7));
  col(-3.0, 8.7, 0.82, 0.27, 0.53);
  const coat = new THREE.Group();
  coat.add(at(cyl(0.2, 0.24, 0.05, COL.brass, 12, K.BRASS), 0, 0.025, 0));
  coat.add(at(cyl(0.025, 0.03, 1.75, COL.woodDark, 8), 0, 0.9, 0));
  coat.add(at(sph(0.05, COL.brass, K.BRASS, 8), 0, 1.8, 0));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    coat.add(at(rot(cyl(0.012, 0.012, 0.2, COL.brass, 4, K.BRASS), Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9), Math.cos(a) * 0.08, 1.62, Math.sin(a) * 0.08));
  }
  const scarf = rbox(0.12, 0.5, 0.05, COL.sun, 0.03);
  coat.add(at(scarf, 0.14, 1.36, 0));
  const hat = new THREE.Group();
  hat.add(cyl(0.16, 0.16, 0.015, '#d9b98a', 14));
  hat.add(at(cyl(0.09, 0.1, 0.09, '#d9b98a', 12), 0, 0.05, 0));
  hat.add(at(cyl(0.101, 0.101, 0.025, COL.rasp, 12), 0, 0.02, 0));
  coat.add(at(rot(hat, 0.3, 0, 0.4), -0.14, 1.66, 0.05));
  add(at(coat, -4.75, 0, 7.6));
  circ(-4.75, 7.6, 0.22);
  add(at(D.oliveTree(1.5, COL.rasp, 14), -5.15, 0, 9.3));
  circ(-5.15, 9.3, 0.27);
  add(at(K.makePlant(0.8, COL.olive), 5.2, 0, 9.3));
  circ(5.2, 9.3, 0.22);
  add(at(cyl(0.16, 0.2, 0.5, COL.rasp, 14), 4.3, 0.25, 9.2));
  add(at(tor(0.17, 0.02, COL.brass, K.BRASS), 4.3, 0.5, 9.2)).rotation.x = Math.PI / 2;
  add(at(sph(0.24, '#f2fbff', { rough: 0.1 }, 14), 4.3, 0.72, 9.2));
  for (let i = 0; i < 9; i++) add(at(sph(0.05, [COL.sun, COL.hotpink, COL.mint, COL.paper][i % 4], undefined, 6), 4.3 + Math.cos(i * 2.1) * 0.12, 0.62 + (i % 3) * 0.08, 9.2 + Math.sin(i * 2.1) * 0.12));
  add(at(cyl(0.05, 0.05, 0.06, COL.raspDeep, 8), 4.3, 0.98, 9.2));
  circ(4.3, 9.2, 0.25);
  specialBoard(S, add, -1.85, 7.9, -0.3, "Today's special", ['Mansaf Friday', 'Pecan cake', 'Spanish latte', 'for two']);
  return R;
}

function heartExtrude(s) {
  const g = new THREE.ExtrudeGeometry(D.heartShape(s), { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 12 });
  g.center();
  return g;
}
function heartFlat(s) {
  const g = new THREE.ShapeGeometry(D.heartShape(s), 10);
  g.center();
  return g;
}
