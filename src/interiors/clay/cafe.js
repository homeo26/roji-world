import * as THREE from 'three';
import { fit, bake, bakeMat } from '../../places/home/kit.js';
import { COL, box, rbox, cyl, sph, tor, at, rot, mat, umat, mesh, roundRect, FONT, glowTex, makeChair, makeTable, makeCup, makeVase, makeMug, makePlant, freezeKid, speechBubble, colorBake } from './models.js';
import { makeCat } from '../../stops/clay/parts.js';
import { X0, ZF, CW, MID, COUNTER, CAFE_TABLES, OUR_TABLE, WINDOW_SEAT, SHOP_COUNTER, SHOP_SHELVES, SHOP_TABLE, GUEST_BOOK, ENTRANCE } from './layout.js';

// The front rooms of the Clay Café: the café (counter, barista, cakes, tables, the window seat with the
// café cat) and the shop (shelves of pots, the shop counter, the guest book by the door).
// Moments: order coffee and cake, browse the shop, sign the guest book.

const P = Math.PI;

// A mug with "R+H" painted on it (Homama's coffee comes in it)
export function makeRHMug(atlas, color = '#fff1dc') {
  const g = makeMug(color, COL.terra);
  const label = atlas.panel(0.075, 0.05, 60, 40, (c, w, h) => {
    c.fillStyle = color;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#d9734e';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 22px ${FONT}`;
    c.fillText('R+H', w / 2, h / 2 + 1);
  });
  g.add(at(label, 0, 0.05, 0.052));
  return g;
}

export function buildCafe(R) {
  const { add, dyn, col, circ, hot, upd, atlas, api, ictx, wallW, wallE } = R;
  const tone = R.tone;
  const v = new THREE.Vector3();

  // ================================================================ the café counter
  const { x0: cx0, x1: cx1, z: CZ } = COUNTER;
  const CX = (cx0 + cx1) / 2;
  const CL = cx1 - cx0;
  add(at(rbox(CL, 0.9, 0.72, '#fff3e4', 0.05), CX, 0.45, CZ));
  for (let i = 0; i < Math.round(CL / 0.4); i++) add(at(box(0.06, 0.72, 0.02, '#f2d6bd'), cx0 + 0.25 + i * 0.4, 0.46, CZ + 0.365));
  add(at(rbox(CL + 0.16, 0.07, 0.84, '#f7efe6', 0.03), CX, 0.93, CZ));
  add(at(box(CL, 0.05, 0.03, COL.terra), CX, 0.86, CZ + 0.425));
  add(at(box(CL, 0.1, 0.05, '#c98f5f'), CX, 0.05, CZ + 0.37));
  col(CX, CZ, CL / 2 + 0.08, 0.42, 0.96);
  // Espresso machine
  const EX = cx0 + 3.0;
  const machine = new THREE.Group();
  machine.position.set(EX, 0.965, CZ - 0.1);
  machine.add(at(rbox(0.72, 0.52, 0.44, COL.rose, 0.08), 0, 0.26, 0));
  machine.add(at(rbox(0.76, 0.06, 0.48, mat(COL.steel, { metal: 0.5, rough: 0.3 }), 0.03), 0, 0.54, 0));
  for (const s of [-1, 1]) {
    machine.add(at(cyl(0.06, 0.05, 0.08, mat(COL.steelDark, { metal: 0.5, rough: 0.3 }), 12), s * 0.17, 0.08, 0.22));
    machine.add(at(makeCup('#ffffff'), s * 0.17, 0.0, 0.26));
  }
  machine.add(at(rbox(0.62, 0.03, 0.18, mat(COL.steelDark, { metal: 0.5, rough: 0.3 }), 0.01), 0, 0.01, 0.26));
  machine.add(at(cyl(0.065, 0.065, 0.02, '#ffffff', 16).rotateX(P / 2), 0, 0.34, 0.225));
  machine.add(rot(at(cyl(0.008, 0.008, 0.25, mat(COL.steel, { metal: 0.5, rough: 0.3 }), 6), 0.34, 0.2, 0.18), 0, 0, 0.3));
  for (let i = 0; i < 4; i++) machine.add(at(makeCup(['#ffffff', COL.sun, COL.mint, COL.rose][i]), -0.24 + i * 0.16, 0.57, -0.08));
  add(machine);
  const steamAt = new THREE.Vector3(EX + 0.34, 1.35, CZ + 0.05);
  // Cake display case
  const DX = cx0 + 1.0;
  add(at(rbox(1.7, 0.08, 0.6, COL.woodDark, 0.02), DX, 1.0, CZ));
  add(at(rbox(1.7, 0.05, 0.6, COL.woodDark, 0.02), DX, 1.52, CZ));
  const cake = (x, base, frost, top) => {
    add(at(cyl(0.16, 0.18, 0.02, '#ffffff', 16), x, 1.05, CZ));
    add(at(cyl(0.13, 0.13, 0.1, base, 16), x, 1.11, CZ));
    add(at(cyl(0.135, 0.135, 0.025, frost, 16), x, 1.17, CZ));
    add(at(cyl(0.13, 0.13, 0.08, base, 16), x, 1.22, CZ));
    add(at(cyl(0.135, 0.13, 0.03, frost, 16), x, 1.27, CZ));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * P * 2;
      add(at(sph(0.02, top, undefined, 8), x + Math.sin(a) * 0.09, 1.3, CZ + Math.cos(a) * 0.09));
    }
  };
  cake(DX - 0.55, '#8b4a2b', '#f7e3c4', '#6e3820'); // pecan
  cake(DX - 0.1, '#5a3220', '#c99a5b', '#f7e3c4'); // German chocolate
  for (let i = 0; i < 4; i++) {
    add(at(cyl(0.045, 0.035, 0.05, '#f2a7c3', 10), DX + 0.3 + (i % 2) * 0.14, 1.07, CZ - 0.1 + (i >> 1) * 0.18));
    add(at(sph(0.048, ['#fff1dc', COL.sun, '#b99af5', COL.rose][i], undefined, 10), DX + 0.3 + (i % 2) * 0.14, 1.11, CZ - 0.1 + (i >> 1) * 0.18)).scale.y = 0.8;
  }
  add(at(cyl(0.1, 0.1, 0.02, '#ffffff', 14), DX + 0.65, 1.05, CZ));
  for (let i = 0; i < 4; i++) add(at(cyl(0.035, 0.035, 0.012, '#c98a4a', 10), DX + 0.62 + (i % 2) * 0.06, 1.07 + i * 0.013, CZ - 0.02 + (i % 2) * 0.03));
  const glass = new THREE.MeshStandardMaterial({ color: '#e8f8ff', transparent: true, opacity: 0.22, roughness: 0.1, depthWrite: false });
  const glassBox = dyn(add(at(new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.47, 0.56), glass), DX, 1.27, CZ)));
  glassBox.renderOrder = 2;
  // Register with a sticky note, cookie jar, tip jar and a little vase
  const RX = cx1 - 0.6;
  add(at(rbox(0.42, 0.24, 0.34, COL.mint, 0.05), RX, 1.09, CZ - 0.02));
  add(at(rot(rbox(0.36, 0.14, 0.04, '#ffffff', 0.02), -0.5, 0, 0), RX, 1.25, CZ + 0.1));
  add(at(rbox(0.3, 0.05, 0.12, COL.mintDark, 0.02), RX, 0.99, CZ + 0.18));
  const note = atlas.panel(0.13, 0.13, 104, 104, (c, w, h) => {
    c.fillStyle = '#fff07a';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#5a4630';
    c.textAlign = 'center';
    c.font = `600 15px ${FONT}`;
    c.fillText('Roji:', w / 2, 26);
    c.fillText('Spanish latte,', w / 2, 48);
    c.fillText('extra love', w / 2, 70);
    c.fillStyle = '#ef5b6f';
    c.font = `600 14px ${FONT}`;
    c.fillText('H', w / 2, 92);
  });
  add(rot(at(note, RX + 0.15, 1.17, CZ + 0.19), 0, 0, 0.12));
  add(at(cyl(0.12, 0.11, 0.24, '#fff7ee', 16), RX - 0.62, 1.08, CZ - 0.05));
  add(at(cyl(0.1, 0.1, 0.05, COL.terra, 16), RX - 0.62, 1.22, CZ - 0.05));
  add(at(sph(0.035, COL.terra, undefined, 8), RX - 0.62, 1.27, CZ - 0.05));
  add(at(cyl(0.06, 0.06, 0.12, mat('#e8f8ff', { rough: 0.2 }), 12), RX + 0.42, 1.03, CZ + 0.15));
  add(at(makeVase(1, COL.sky, 0.7), RX - 1.0, 0.965, CZ + 0.12));
  add(at(sph(0.035, COL.rose, undefined, 8), RX - 1.0, 1.24, CZ + 0.12));

  // The barista behind the counter (alive: she makes the coffee)
  const BX = cx0 + 2.1;
  const BZ = CZ - 0.72;
  const barista = ictx.makeKid({ id: 'barista', name: 'Barista', gender: 'girl', skin: '#e3b08e', hair: '#7a4a26', hairstyle: 'buns', outfit: 'overalls', top: '#ffffff', bottom: '#8fd6c6', shoes: '#3b2b3f', accent: COL.sun });
  // Frozen in place, then baked into a body that turns and a head that looks about (a few draw calls)
  freezeKid(barista, { pose: 'stand', hands: 'stir' });
  barista.root.scale.setScalar(1.12);
  barista.root.position.set(BX, 0, BZ);
  colorBake(barista.head, [], { single: true });
  bakeMat(barista.head);
  colorBake(barista.root, [barista.head], { single: true });
  bakeMat(barista.root, [barista.head]);
  add(dyn(barista.root));
  circ(BX, BZ, 0.3);
  const bBubble = speechBubble(THREE, R.g, { width: 1.5, color: COL.terra });
  dyn(bBubble.sprite);
  let baristaYaw = 0;
  let baristaYawTo = 0;
  upd((dt, t) => {
    baristaYaw += (baristaYawTo - baristaYaw) * Math.min(1, dt * 6);
    barista.root.rotation.y = baristaYaw;
    barista.head.rotation.set(Math.sin(t * 0.7) * 0.05, Math.sin(t * 0.45) * 0.35, Math.sin(t * 0.9) * 0.04);
    bBubble.update(dt, v.set(BX, 2.15, BZ + 0.1));
  });

  // The wall behind the counter: shelves of cups and syrups, the menu, the mug with R + H on it
  const ww = (x) => wallW.x(x);
  const wz = 0.12;
  for (const y of [1.55, 2.0]) wallW.add(at(box(2.2, 0.05, 0.26, COL.wood), ww(cx0 + 1.3), y, wz + 0.13));
  const mugCols = [COL.sun, COL.rose, COL.mint, COL.sky, '#ffffff', COL.lilac];
  for (let i = 0; i < 6; i++) wallW.add(at(i === 3 ? makeRHMug(atlas) : makeMug(mugCols[i]), ww(cx0 + 0.42 + i * 0.35), 1.575, wz + 0.13));
  for (let i = 0; i < 5; i++) {
    const c = ['#e9b35c', '#ff8fb1', '#8b4a2b', '#7fd3a7', '#fff1dc'][i];
    wallW.add(at(cyl(0.05, 0.05, 0.22, mat(c, { rough: 0.3 }), 10), ww(cx0 + 0.5 + i * 0.4), 2.135, wz + 0.13));
    wallW.add(at(cyl(0.018, 0.022, 0.07, '#ffffff', 8), ww(cx0 + 0.5 + i * 0.4), 2.28, wz + 0.13));
  }
  const menu = atlas.panel(1.9, 1.1, 456, 264, (c, w, h) => {
    c.fillStyle = '#3f5a52';
    roundRect(c, 0, 0, w, h, 20);
    c.fill();
    c.lineWidth = 12;
    c.strokeStyle = '#c98f5f';
    c.stroke();
    c.textAlign = 'center';
    c.fillStyle = '#ffe3a6';
    c.font = `700 40px ${FONT}`;
    c.fillText('Menu', w / 2, 52);
    c.font = `500 26px ${FONT}`;
    [['Spanish latte', '#ffffff'], ['Pecan cake', '#ffd0dc'], ['German cake', '#ffffff'], ['Cookies and cupcakes', '#c9f0e2']].forEach(([tx, c2], i) => {
      c.fillStyle = c2;
      c.fillText(tx, w / 2, 100 + i * 40);
    });
    c.fillStyle = '#ff8fb1';
    c.beginPath();
    c.moveTo(w - 50, h - 30);
    c.bezierCurveTo(w - 72, h - 46, w - 64, h - 64, w - 50, h - 54);
    c.bezierCurveTo(w - 36, h - 64, w - 28, h - 46, w - 50, h - 30);
    c.fill();
  });
  wallW.add(at(menu, ww(cx1 - 1.2), 2.15, wz + 0.01));
  // A framed drawing of Roji and Homama with clay on their hands
  const photo = atlas.panel(0.7, 0.56, 210, 168, (c, w, h) => {
    c.fillStyle = '#c98f5f';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff8ee';
    c.fillRect(12, 12, w - 24, h - 24);
    const kid = (x, hair, top) => {
      c.fillStyle = top;
      roundRect(c, x - 22, 92, 44, 50, 14);
      c.fill();
      c.fillStyle = '#f8dccb';
      c.beginPath();
      c.arc(x, 72, 24, 0, P * 2);
      c.fill();
      c.fillStyle = hair;
      c.beginPath();
      c.arc(x, 64, 25, P, 0);
      c.fill();
      c.fillStyle = '#c46b47';
      c.beginPath();
      c.arc(x + (x < w / 2 ? 22 : -22), 112, 9, 0, P * 2);
      c.fill();
    };
    kid(w / 2 - 36, '#2a1a13', '#ef5b6f');
    kid(w / 2 + 36, '#141010', '#3f7bf0');
    c.fillStyle = '#d9734e';
    c.beginPath();
    c.ellipse(w / 2, 126, 22, 14, 0, 0, P * 2);
    c.fill();
    c.fillStyle = '#ef5b6f';
    c.beginPath();
    c.moveTo(w / 2, 46);
    c.bezierCurveTo(w / 2 - 12, 36, w / 2 - 6, 26, w / 2, 32);
    c.bezierCurveTo(w / 2 + 6, 26, w / 2 + 12, 36, w / 2, 46);
    c.fill();
  });
  wallW.add(at(photo, ww(-4.6), 1.85, wz + 0.01));
  R.lamp(wallW.group, ww(-5.5), 2.25, wz - 0.08, COL.terra);
  R.lamp(wallW.group, ww(-3.7), 2.25, wz - 0.08, COL.terra);
  R.bunting(wallW.group, ww(X0 + 0.3), ww(-3.4), 3.05, wz + 0.02);

  // ================================================================ tables
  const steamFrom = [];
  CAFE_TABLES.forEach((T, i) => {
    add(at(makeTable(0.55), T.x, 0, T.z));
    circ(T.x, T.z, 0.58, 0.76);
    T.seats.forEach(([sx, sz, yaw], k) => {
      const ch = makeChair([[COL.rose, COL.mint], [COL.sun, COL.rose], [COL.mint, COL.sun]][i][k]);
      ch.rotation.y = yaw;
      add(at(ch, T.x + sx, 0, T.z + sz));
      circ(T.x + sx, T.z + sz, 0.24, i === 2 ? undefined : 0.48);
    });
  });
  // Our table: a reserved card and a rose in a vase
  const OT = CAFE_TABLES[OUR_TABLE];
  const card = atlas.panel(0.22, 0.12, 132, 72, (c, w, h) => {
    c.fillStyle = '#fffaf1';
    roundRect(c, 2, 2, w - 4, h - 4, 10);
    c.fill();
    c.strokeStyle = COL.rose;
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = '#8c3f22';
    c.textAlign = 'center';
    c.font = `600 17px ${FONT}`;
    c.fillText('Reserved for', w / 2, 30);
    c.fillText('R and H', w / 2, 54);
  });
  const reservedCard = new THREE.Group();
  reservedCard.position.set(OT.x + 0.18, 0.76, OT.z + 0.18);
  for (const s of [1, -1]) {
    const leaf = new THREE.Group();
    leaf.rotation.x = s * -0.35;
    leaf.position.z = s * 0.035;
    leaf.add(at(s > 0 ? card : rbox(0.22, 0.12, 0.004, '#fffaf1', 0.002), 0, 0.055, s * 0.003));
    reservedCard.add(leaf);
  }
  add(reservedCard);
  add(at(makeVase(1, '#ffffff', 0.6), OT.x - 0.15, 0.76, OT.z - 0.2));
  add(at(cyl(0.004, 0.004, 0.18, COL.leaf, 4), OT.x - 0.15, 0.92, OT.z - 0.2));
  add(at(sph(0.035, '#ef5b6f', undefined, 8), OT.x - 0.15, 1.02, OT.z - 0.2));
  // Two friends chatting over coffee at the third table, a reader at the second
  const T2 = CAFE_TABLES[2];
  const guests = [
    { look: { id: 'guest1', name: 'Guest', gender: 'girl', skin: '#c98f68', hair: '#141010', hairstyle: 'long', outfit: 'skirt', top: '#ffd166', bottom: '#7fd3a7', shoes: '#ffffff', accent: '#ef5b6f' }, x: T2.x - 0.62, z: T2.z, yaw: P / 2, hands: 'hold' },
    { look: { id: 'guest2', name: 'Guest', gender: 'girl', skin: '#fbe6d8', hair: '#b5773d', hairstyle: 'ponytail', outfit: 'dress', top: '#c7a6ff', bottom: '#c7a6ff', shoes: '#3b2b3f', accent: '#ffd166' }, x: T2.x + 0.62, z: T2.z, yaw: -P / 2, hands: null },
  ];
  for (const gu of guests) {
    const k = freezeKid(ictx.makeKid(gu.look), { pose: 'sit', hands: gu.hands });
    k.root.position.set(gu.x, 0.3, gu.z);
    k.root.rotation.y = gu.yaw;
    add(k.root);
  }
  add(at(makeCup('#ffffff'), T2.x - 0.2, 0.76, T2.z + 0.08));
  add(at(makeCup(COL.mint), T2.x + 0.22, 0.76, T2.z - 0.06));
  steamFrom.push(new THREE.Vector3(T2.x - 0.2, 0.88, T2.z + 0.08), new THREE.Vector3(T2.x + 0.22, 0.88, T2.z - 0.06));
  add(at(cyl(0.13, 0.12, 0.02, '#ffffff', 14), T2.x, 0.77, T2.z + 0.25));
  add(rot(at(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.035, 8, 12, P * 1.2), mat('#e0a24e', { rough: 0.6 })), T2.x, 0.81, T2.z + 0.25), -P / 2, 0, 0));
  const T1 = CAFE_TABLES[1];
  const reader = freezeKid(ictx.makeKid({ id: 'reader', name: 'Reader', gender: 'boy', skin: '#9c6a4a', hair: '#2a1a13', hairstyle: 'curly', outfit: 'hoodie', top: '#7fd3a7', bottom: '#2c3e66', shoes: '#ffffff', accent: '#ffd166' }), { pose: 'sit', hands: 'read' });
  reader.root.position.set(T1.x - 0.62, 0.3, T1.z);
  reader.root.rotation.y = P / 2;
  add(reader.root);
  add(rot(at(rbox(0.2, 0.26, 0.03, COL.pink, 0.01), T1.x - 0.3, 0.86, T1.z), 0, P / 2, -0.35));
  add(at(makeCup(COL.sun), T1.x - 0.1, 0.76, T1.z + 0.15));
  steamFrom.push(new THREE.Vector3(T1.x - 0.1, 0.88, T1.z + 0.15));
  circ(T1.x - 0.62, T1.z, 0.3);
  // Leafy pots in the corners
  for (const [x, z, s, k] of [[X0 + 0.5, 0.75, 1.1, 'tall'], [-1.0, 0.75, 0.95, 'round'], [X0 + 0.55, 6.6, 1.0, 'round']]) {
    add(at(makePlant(s, COL.terra, k), x, 0, z));
    circ(x, z, 0.22 * s);
  }

  // ================================================================ the window seat with the café cat
  const { x: WX, z0: wz0, z1: wz1 } = WINDOW_SEAT;
  const WZ = (wz0 + wz1) / 2;
  const WL = wz1 - wz0;
  R.windowAt(X0, 1.8, 2.2, 1.25, COL.rose, { z: WZ, side: -1 });
  add(at(rbox(0.95, 0.42, WL, '#fff3e4', 0.05), WX, 0.21, WZ));
  add(at(rbox(0.9, 0.1, WL - 0.1, COL.terra, 0.05), WX, 0.47, WZ));
  for (const [z, c] of [[WZ - 1.2, COL.sun], [WZ - 0.45, COL.mint], [WZ + 0.35, '#ffffff'], [WZ + 1.15, COL.rose]]) add(rot(at(rbox(0.14, 0.38, 0.44, c, 0.07), X0 + 0.14, 0.72, z), 0, 0, -0.2));
  add(at(rbox(0.5, 0.06, 0.6, '#b99af5', 0.03), WX + 0.08, 0.545, WZ + 0.5));
  col(WX, WZ, 0.5, WL / 2, 0.52);
  const cat = makeCat();
  cat.root.scale.setScalar(1.3);
  cat.root.position.set(WX + 0.05, 0.52, WZ - 0.7);
  cat.root.rotation.y = 0.5;
  add(dyn(cat.root));
  const catZ = WZ - 0.7;
  upd((dt, t, a) => {
    cat.body.scale.y = 1 + Math.sin(t * 2.1) * 0.035;
    cat.tail.rotation.y = Math.sin(t * 1.3) * 0.3;
    const p = a.localPos(a.player);
    const near = Math.hypot(p.x - WX, p.z - catZ) < 2.0;
    cat.head.rotation.x += ((near ? -0.35 : 0.08) - cat.head.rotation.x) * Math.min(1, dt * 3);
  });

  // ================================================================ the shop
  const { x: SX, z: SZ } = SHOP_COUNTER;
  add(at(rbox(2.6, 0.9, 0.7, '#e9d3bb', 0.05), SX, 0.45, SZ));
  add(at(rbox(2.76, 0.07, 0.82, COL.woodLight, 0.03), SX, 0.935, SZ));
  for (let i = 0; i < 6; i++) add(at(box(0.05, 0.7, 0.02, '#d8bea4'), SX - 1.1 + i * 0.44, 0.46, SZ + 0.355));
  col(SX, SZ, 1.38, 0.42, 0.96);
  // Till, paper bags, a ribbon roll and a wrapped present
  add(at(rbox(0.38, 0.22, 0.3, COL.sky, 0.05), SX + 0.8, 1.08, SZ - 0.05));
  add(at(rot(rbox(0.32, 0.12, 0.04, '#ffffff', 0.02), -0.5, 0, 0), SX + 0.8, 1.22, SZ + 0.08));
  for (let i = 0; i < 3; i++) add(at(rbox(0.26, 0.32, 0.14, '#d9b38c', 0.02), SX - 1.05 + i * 0.05, 1.13, SZ - 0.2 + i * 0.04));
  add(rot(at(cyl(0.07, 0.07, 0.07, COL.rose, 14), SX - 0.45, 1.0, SZ + 0.1), P / 2, 0, 0));
  add(at(rbox(0.22, 0.18, 0.22, COL.mint, 0.03), SX - 0.05, 1.06, SZ - 0.05));
  add(at(box(0.23, 0.185, 0.04, COL.sun), SX - 0.05, 1.06, SZ - 0.05));
  add(at(box(0.04, 0.185, 0.23, COL.sun), SX - 0.05, 1.06, SZ - 0.05));
  const shopkeeper = freezeKid(ictx.makeKid({ id: 'shopkeeper', name: 'Shopkeeper', gender: 'boy', skin: '#e3b08e', hair: '#e3c07a', hairstyle: 'sidepart', outfit: 'tee-pants', top: '#f08a5d', bottom: '#3b2b3f', shoes: '#7a2e3a', accent: '#ffffff', mustache: '#b58a4a' }), { pose: 'stand', hands: null });
  shopkeeper.root.scale.setScalar(1.18);
  shopkeeper.root.position.set(SX - 0.2, 0, SZ - 0.72);
  add(shopkeeper.root);
  circ(SX - 0.2, SZ - 0.72, 0.3);
  const sBubble = speechBubble(THREE, R.g, { width: 1.5, color: COL.mintDark });
  dyn(sBubble.sprite);
  upd((dt) => sBubble.update(dt, v.set(SX - 0.2, 2.3, SZ - 0.6)));
  // Wall behind the shop counter: a shelf of wrapped pots and a sign
  const ew = (x) => wallE.x(x);
  wallE.add(at(box(2.4, 0.05, 0.26, COL.wood), ew(SX), 1.6, wz + 0.13));
  for (let i = 0; i < 5; i++) wallE.add(at(makeVase(i % 5, [COL.rose, '#fff1dc', COL.sky, COL.sun, COL.mint][i], 1.1), ew(SX - 0.95 + i * 0.47), 1.625, wz + 0.13));
  const hand = atlas.panel(1.5, 0.4, 360, 96, (c, w, h) => {
    c.fillStyle = '#fff7ea';
    roundRect(c, 3, 3, w - 6, h - 6, 30);
    c.fill();
    c.lineWidth = 6;
    c.strokeStyle = COL.mintDark;
    c.stroke();
    c.fillStyle = '#3f5a52';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 ${h * 0.44}px ${FONT}`;
    c.fillText('Made here, by hand', w / 2, h * 0.55, w - 40);
  });
  wallE.add(at(hand, ew(SX), 2.3, wz + 0.01));
  R.lamp(wallE.group, ew(4.0), 2.2, wz - 0.08, COL.sun);
  R.fairy(wallE.group, ew(MID + 0.4), ew(12.6), 3.05, wz + 0.05);

  // Shelves along the right wall
  const { x: HX, z0: hz0, z1: hz1 } = SHOP_SHELVES;
  const HZ = (hz0 + hz1) / 2;
  const HL = hz1 - hz0;
  const shelfG = new THREE.Group();
  shelfG.position.set(HX, 0, HZ);
  shelfG.rotation.y = -P / 2;
  for (const y of [0.4, 0.95, 1.5, 2.05]) shelfG.add(at(box(HL, 0.05, 0.5, COL.woodLight), 0, y, 0));
  for (const s of [-1, 0, 1]) shelfG.add(at(box(0.06, 2.1, 0.5, COL.wood), s * (HL / 2 - 0.03), 1.05, 0));
  let seed = 3;
  const rr = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const glazes = [COL.mint, COL.rose, COL.sun, COL.sky, '#fff1dc', COL.lilac, COL.terra, '#3f5fd0'];
  for (const y of [0.425, 0.975, 1.525, 2.075]) {
    let x = -HL / 2 + 0.2;
    while (x < HL / 2 - 0.2) {
      const c = glazes[Math.floor(rr() * glazes.length)];
      const r = rr();
      if (r < 0.3) {
        shelfG.add(at(makeMug(c, rr() < 0.5 ? '#ffffff' : COL.terra), x + 0.06, y, 0));
        x += 0.22;
      } else if (r < 0.45) {
        shelfG.add(at(rot(cyl(0.16, 0.16, 0.02, c, 18), P / 2 - 0.25, 0, 0), x + 0.16, y + 0.17, -0.1));
        x += 0.36;
      } else {
        const s = 0.8 + rr() * 0.5;
        shelfG.add(at(makeVase(Math.floor(rr() * 5), c, s), x + 0.12, y, 0));
        x += 0.3 * s + 0.08;
      }
      if (x > -0.07 && x < 0.07) x = 0.12;
    }
  }
  add(shelfG);
  col(HX, HZ, 0.28, HL / 2);
  // The display table with today's favourites (what you can buy)
  const { x: TX, z: TZ } = SHOP_TABLE;
  add(at(rbox(2.2, 0.08, 1.0, COL.woodLight, 0.03), TX, 0.62, TZ));
  for (const [dx, dz] of [[-1, -0.42], [1, -0.42], [-1, 0.42], [1, 0.42]]) add(at(box(0.08, 0.6, 0.08, COL.woodDark), TX + dx, 0.3, TZ + dz));
  add(at(box(2.0, 0.04, 0.85, COL.woodDark), TX, 0.18, TZ));
  for (let i = 0; i < 4; i++) add(at(rbox(0.42, 0.2, 0.3, ['#d9b38c', '#cdb8a6'][i % 2], 0.05), TX - 0.7 + i * 0.47, 0.3, TZ));
  col(TX, TZ, 1.12, 0.52, 0.66);
  const shopItems = buildShopItems(R, TX, 0.66, TZ);
  // A low pot of pampas grass by the door
  add(at(cyl(0.2, 0.16, 0.5, '#fff1dc', 16), 4.4, 0.25, 6.6));
  for (let k = 0; k < 7; k++) add(rot(at(cyl(0.012, 0.012, 1.0, '#e9d3a6', 4), 4.4 + Math.sin(k) * 0.04, 0.95, 6.6 + Math.cos(k) * 0.04), Math.cos(k * 2.1) * 0.25, 0, Math.sin(k * 2.1) * 0.25));
  for (let k = 0; k < 7; k++) add(at(sph(0.06, '#f6ead2', undefined, 8), 4.4 + Math.sin(k * 2.1) * 0.24, 1.42, 6.6 + Math.cos(k * 2.1) * 0.24)).scale.set(0.8, 1.8, 0.8);
  circ(4.4, 6.6, 0.24);

  // ================================================================ the guest book by the door
  const { x: GX, z: GZ } = GUEST_BOOK;
  add(at(cyl(0.05, 0.07, 0.95, COL.woodDark, 10), GX, 0.48, GZ));
  add(at(cyl(0.26, 0.3, 0.05, COL.woodDark, 16), GX, 0.025, GZ));
  const bookG = new THREE.Group();
  bookG.position.set(GX, 1.0, GZ);
  bookG.rotation.x = 0.55;
  bookG.add(at(rbox(0.66, 0.05, 0.46, COL.wood, 0.02), 0, -0.02, 0));
  bookG.add(at(rbox(0.62, 0.03, 0.42, COL.terra, 0.01), 0, 0.015, 0));
  const pageCanvas = document.createElement('canvas');
  pageCanvas.width = 512;
  pageCanvas.height = 320;
  const pageTex = new THREE.CanvasTexture(pageCanvas);
  pageTex.colorSpace = THREE.SRGBColorSpace;
  pageTex.anisotropy = 4;
  const pages = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.38), umat('#ffffff', { rough: 0.9, map: pageTex }));
  pages.rotation.x = -P / 2;
  pages.position.y = 0.034;
  bookG.add(pages);
  add(dyn(bookG));
  add(at(cyl(0.035, 0.03, 0.09, COL.sky, 10), GX + 0.4, 0.98, GZ - 0.05));
  add(rot(at(cyl(0.006, 0.006, 0.16, '#ef5b6f', 5), GX + 0.4, 1.06, GZ - 0.05), 0.2, 0, 0.15));
  col(GX, GZ, 0.36, 0.28);
  const guestBook = () => api.load('guestbook', []);
  const drawBook = () => {
    const c = pageCanvas.getContext('2d');
    const w = pageCanvas.width;
    const h = pageCanvas.height;
    c.fillStyle = '#fffaf1';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#efe2cf';
    c.fillRect(w / 2 - 3, 0, 6, h);
    c.strokeStyle = 'rgba(111,184,255,0.35)';
    c.lineWidth = 2;
    for (let y = 70; y < h; y += 34) {
      c.beginPath();
      c.moveTo(20, y);
      c.lineTo(w / 2 - 18, y);
      c.moveTo(w / 2 + 18, y);
      c.lineTo(w - 20, y);
      c.stroke();
    }
    c.fillStyle = '#8c3f22';
    c.textAlign = 'center';
    c.font = `700 30px ${FONT}`;
    c.fillText('Guest book', w / 4, 46);
    c.textAlign = 'left';
    c.font = `500 19px ${FONT}`;
    c.fillStyle = '#4a3423';
    const left = ['Lovely latte. A. and family', 'Our first bowl! Two happy twins', 'Back every Friday. M.', 'Best cake in town'];
    left.forEach((tx, i) => c.fillText(tx, 26, 64 + i * 34, w / 2 - 50));
    const ours = guestBook().slice(-6);
    c.font = `600 19px ${FONT}`;
    if (!ours.length) {
      c.fillStyle = '#b8a594';
      c.fillText('This page is waiting for you two', w / 2 + 22, 64, w / 2 - 40);
    }
    ours.forEach((e, i) => {
      c.fillStyle = i % 2 ? '#3f7bf0' : '#ef5b6f';
      c.fillText(`${e.msg}. R + H`, w / 2 + 22, 64 + i * 34, w / 2 - 44);
    });
    c.fillStyle = '#ef5b6f';
    const hx = w - 44;
    const hy = h - 30;
    c.beginPath();
    c.moveTo(hx, hy + 10);
    c.bezierCurveTo(hx - 16, hy - 2, hx - 8, hy - 16, hx, hy - 6);
    c.bezierCurveTo(hx + 8, hy - 16, hx + 16, hy - 2, hx, hy + 10);
    c.fill();
    pageTex.needsUpdate = true;
  };
  drawBook();

  // ================================================================ steam over the cups
  const steam = [];
  steamFrom.forEach((p, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, opacity: 0 }));
    add(dyn(s));
    steam.push({ s, p, ph: i * 0.27 });
  });
  const machineSteam = [];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, opacity: 0 }));
    s.visible = false;
    add(dyn(s));
    machineSteam.push({ s, ph: i / 3 });
  }
  let brewing = 0;
  upd((dt, t) => {
    for (const st of steam) {
      const q = (t * 0.45 + st.ph) % 1;
      st.s.position.set(st.p.x + Math.sin(q * 6 + st.ph * 5) * 0.03, st.p.y + q * 0.4, st.p.z);
      st.s.scale.setScalar(0.07 + q * 0.13);
      st.s.material.opacity = 0.5 * Math.sin(q * P);
    }
    brewing = Math.max(0, brewing - dt);
    for (const st of machineSteam) {
      const q = (t * 1.2 + st.ph) % 1;
      st.s.visible = brewing > 0;
      st.s.position.set(steamAt.x + Math.sin(q * 5) * 0.04, steamAt.y + q * 0.5, steamAt.z);
      st.s.scale.setScalar(0.1 + q * 0.25);
      st.s.material.opacity = 0.7 * Math.sin(q * P) * Math.min(1, brewing);
    }
  });

  // ================================================================ moments
  let busy = false;
  const fade = (fn) => (api.game?.fade ? api.game.fade(fn) : fn());

  // Coffee and cake: a Spanish latte for Roji, Homama's coffee in the R + H mug, a cake to share
  const CAKES = [
    { id: 'pecan-cake', label: 'Pecan cake', sub: 'Roji loves it warm', say: 'a warm slice of pecan cake' },
    { id: 'german-cake', label: 'German cake', sub: 'Chocolate and coconut', say: 'a slice of German cake' },
    { id: 'cookies', label: 'Cookies', sub: 'Still warm', say: 'warm cookies' },
    { id: 'cupcake', label: 'A cupcake', sub: 'Pink frosting', say: 'a pink cupcake' },
  ];
  let food = [];
  const clearFood = () => {
    for (const f of food) f.removeFromParent();
    food = [];
  };
  const orderCoffee = async (a) => {
    if (busy) return;
    const pick = await a.choose({ title: 'Coffee and cake', text: "A Spanish latte for Roji and Homama's coffee. Which cake would you like?", options: CAKES.map(({ id, label, sub }) => ({ id, label, sub })) });
    if (!pick || busy) return;
    busy = true;
    const choice = CAKES.find((c) => c.id === pick);
    let latte;
    let cakeM;
    try {
      [latte, cakeM] = await Promise.all([ictx.props.food('spanish-latte'), ictx.props.food(pick)]);
    } catch {
      busy = false;
      return;
    }
    clearFood();
    const cup = fit(latte, 0.24);
    const mug = makeRHMug(atlas);
    mug.add(at(cyl(0.044, 0.044, 0.004, '#6b3b22', 12), 0, 0.1, 0));
    const plate = new THREE.Group();
    plate.add(at(cyl(0.16, 0.13, 0.02, '#ffffff', 18), 0, 0.01, 0));
    plate.add(at(fit(cakeM, 0.24), 0, 0.02, 0));
    // Ready on the counter first
    cup.position.set(CX - 0.6, 0.965, CZ + 0.18);
    mug.position.set(CX - 0.3, 0.965, CZ + 0.18);
    plate.position.set(CX - 0.45, 0.965, CZ + 0.3);
    for (const o of [cup, mug, plate]) o.visible = false;
    R.g.add(cup, mug, plate);
    food = [cup, mug, plate];
    let T = 0;
    let stage = 0;
    let heartT = 2;
    const seatsAt = OT.seats.map(([sx, sz, yaw]) => ({ x: OT.x + sx, z: OT.z + sz, yaw }));
    a.activity({
      label: 'Get up',
      seats: [
        { who: 'roji', x: CX - 0.75, z: CZ + 0.9, yaw: P, pose: 'stand' },
        { who: 'homama', x: CX - 0.05, z: CZ + 0.9, yaw: P, pose: 'stand' },
      ],
      focus: { x: CX - 0.6, z: CZ + 0.2, y: 1.2, zoom: 0.5 },
      exit: { x: OT.x - 0.4, z: OT.z + 1.1 },
      update: (dt) => {
        T += dt;
        if (stage === 0) {
          stage = 1;
          bBubble.set('One Spanish latte for Roji, and a coffee for Homama!', 2400);
          a.sound.ui('tap');
        }
        if (stage === 1 && T > 1.0) {
          stage = 2;
          baristaYawTo = P / 2;
          brewing = 2.2;
          const s = a.sound;
          if (s?.ctx) {
            const t0 = s.ctx.currentTime;
            s.tone(1400, t0, 1.6, { type: 'sawtooth', gain: 0.012, slideTo: 900, attack: 0.2 });
            s.tone(220, t0 + 0.2, 1.2, { type: 'triangle', gain: 0.03, slideTo: 180 });
          }
        }
        if (stage === 2 && T > 3.2) {
          stage = 3;
          baristaYawTo = 0;
          for (const o of food) o.visible = true;
          a.sound.ui('pop');
          bBubble.set('Here you go, you two. Enjoy!', 2200);
        }
        if (stage === 3 && T > 4.6) {
          stage = 4;
          fade(() => {
            if (!a.activityRunning) return;
            a.seat('roji', { x: seatsAt[0].x, z: seatsAt[0].z, y: 0.3, yaw: seatsAt[0].yaw, pose: 'sit' });
            a.seat('homama', { x: seatsAt[1].x, z: seatsAt[1].z, y: 0.3, yaw: seatsAt[1].yaw, pose: 'sit' });
            a.carry('roji', cup);
            a.carry('homama', mug);
            plate.position.set(OT.x, 0.765, OT.z + 0.02);
            a.focus({ x: OT.x, z: OT.z, y: 0.95, zoom: 0.42 });
            a.toast(`A Spanish latte for Roji, Homama's coffee in the R + H mug, and ${choice.say} to share.`, 3200);
          });
        }
        if (stage === 4 && T > 7.2) {
          stage = 5;
          tone(1568, 0.25, { gain: 0.05 });
          tone(2093, 0.3, { gain: 0.04, attack: 0.03 });
          a.fx.heartsAt(a.world(OT.x, OT.z, 1.5), 4);
        }
        if (stage >= 5) {
          heartT -= dt;
          if (heartT <= 0) {
            heartT = 5 + Math.random() * 2;
            const who = Math.random() < 0.5 ? a.roji : a.homama;
            a.fx.heartsAt(who.kid.head.localToWorld(v.set(0, 0.75, 0)), 3);
            tone(660, 0.12, { gain: 0.035 });
            tone(880, 0.16, { gain: 0.03, attack: 0.02 });
          }
        }
      },
      onEnd: () => {
        a.carry('roji', null);
        a.carry('homama', null);
        clearFood();
        baristaYawTo = 0;
        busy = false;
      },
    });
  };
  hot({ x: CX - 0.4, z: CZ + 0.95, r: 1.5, label: 'Order coffee', icon: 'yum', act: orderCoffee });

  // Browse the shop: Homama buys something for Roji
  const browse = async (a) => {
    if (busy) return;
    const pick = await a.choose({
      title: 'The little shop',
      text: 'Everything here was made by hand. What should Homama get for Roji?',
      options: shopItems.list.map((it) => ({ id: it.id, label: it.label, sub: it.sub })),
    });
    if (!pick || busy) return;
    busy = true;
    const item = shopItems.list.find((it) => it.id === pick);
    const box = await ictx.props.giftBox(item.wrap, '#ffffff');
    const gift = fit(box.root, 0.32);
    let T = 0;
    let stage = 0;
    a.activity({
      label: 'Done',
      seats: [
        { who: 'homama', x: SX - 0.35, z: SZ + 0.95, yaw: P, pose: 'stand' },
        { who: 'roji', x: SX + 0.55, z: SZ + 1.05, yaw: P + 0.35, pose: 'stand' },
      ],
      focus: { x: SX, z: SZ + 0.4, y: 1.2, zoom: 0.5 },
      exit: { x: SX, z: SZ + 1.5 },
      update: (dt) => {
        T += dt;
        if (stage === 0) {
          stage = 1;
          sBubble.set(`The ${item.short}? Good choice. I will wrap it.`, 2400);
          item.pick(true);
        }
        if (stage === 1 && T > 2.2) {
          stage = 2;
          a.carry('homama', gift);
          a.sound.ui('pop');
          sBubble.set('Wrapped with a ribbon. Lucky Roji!', 2400);
        }
        if (stage === 2 && T > 3.6) {
          stage = 3;
          a.carry('homama', null);
          a.carry('roji', gift);
          a.sound.ui('coin');
          a.fx.heartsAt(a.roji.kid.head.localToWorld(v.set(0, 0.7, 0)), 5);
          const bought = [...api.load('bought', []), item.id];
          api.save('bought', bought);
          a.toast(`Homama buys ${item.the} for Roji. It is going home with you.`, 3200);
        }
      },
      onEnd: () => {
        a.carry('roji', null);
        a.carry('homama', null);
        gift.removeFromParent();
        item.pick(false);
        busy = false;
      },
    });
  };
  hot({ x: TX, z: TZ + 1.05, r: 1.5, label: 'Browse the shop', icon: 'gift', act: browse });

  // Sign the guest book
  const MESSAGES = [
    { id: 'Best Spanish latte in town', label: 'Best Spanish latte in town' },
    { id: 'We made something together', label: 'We made something together' },
    { id: 'Roji and Homama were here', label: 'Roji and Homama were here' },
    { id: 'See you next weekend', label: 'See you next weekend' },
  ];
  const signBook = async (a) => {
    if (busy) return;
    const msg = await a.choose({ title: 'Sign the guest book', text: 'What should we write?', options: MESSAGES });
    if (!msg || busy) return;
    const list = [...guestBook(), { msg, d: Date.now() }].slice(-12);
    api.save('guestbook', list);
    let T = 0;
    let done = false;
    a.activity({
      label: 'Done',
      seats: [
        { who: 'player', x: GX - 0.62, z: GZ + 0.3, yaw: 2.05, pose: 'stand', hands: 'read' },
        { who: 'partner', x: GX + 0.7, z: GZ + 0.35, yaw: -2.0, pose: 'stand' },
      ],
      focus: { x: GX, z: GZ, y: 0.95, zoom: 0.34 },
      exit: { x: GX, z: GZ + 1.0 },
      update: (dt) => {
        T += dt;
        if (!done && T > 1.6) {
          done = true;
          drawBook();
          a.sound.ui('good');
          a.fx.heartsAt(a.world(GX, GZ, 1.4), 4);
          a.toast(`"${msg}." Signed R + H, with a little heart.`, 2800);
        }
      },
    });
  };
  hot({ x: GX, z: GZ + 0.75, r: 1.2, label: 'Sign the guest book', icon: 'book', act: signBook });

  R.onEnter(() => drawBook());
  return { entrance: ENTRANCE };
}

// The four things on the shop's display table, each with a label for the choice card.
function buildShopItems(R, x, y, z) {
  const { add, atlas } = R;
  const holder = new THREE.Group();
  holder.position.set(x, y, z);
  add(R.dyn(holder));
  const groups = [];
  const place = (o, dx, dz) => {
    const g = new THREE.Group();
    g.position.set(dx, 0, dz);
    g.add(o);
    holder.add(g);
    groups.push(g);
    return g;
  };
  // Matching mugs: one with R, one with H
  const mugs = new THREE.Group();
  for (const [dx, letter, c] of [[-0.08, 'R', COL.rose], [0.1, 'H', COL.sky]]) {
    const m = makeMug(c, '#ffffff');
    m.position.x = dx;
    const l = atlas.panel(0.05, 0.05, 40, 40, (cc, w, h) => {
      cc.fillStyle = c;
      cc.fillRect(0, 0, w, h);
      cc.fillStyle = '#ffffff';
      cc.textAlign = 'center';
      cc.textBaseline = 'middle';
      cc.font = `700 30px ${FONT}`;
      cc.fillText(letter, w / 2, h / 2 + 2);
    });
    m.add(at(l, 0, 0.05, 0.052));
    mugs.add(m);
  }
  // A heart dish
  const heart = new THREE.Shape();
  for (let i = 0; i <= 24; i++) {
    const t = (i / 24) * P * 2;
    const hx = (16 * Math.pow(Math.sin(t), 3)) / 120;
    const hy = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 120;
    if (i === 0) heart.moveTo(hx, hy);
    else heart.lineTo(hx, hy);
  }
  const dishGeo = new THREE.ExtrudeGeometry(heart, { depth: 0.03, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1 });
  const dish = new THREE.Group();
  dish.add(rot(at(mesh(dishGeo, mat('#ff8fb1', { rough: 0.3 })), 0, 0.01, 0.02), -P / 2, 0, 0));
  // A honey jar with a wooden dipper
  const jar = new THREE.Group();
  jar.add(mesh(new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.09, 0.04], [0.09, 0.12], [0.06, 0.15], [0.06, 0.17]].map(([a, b]) => new THREE.Vector2(a, b)), 14), mat(COL.sun, { rough: 0.3 })));
  jar.add(at(cyl(0.07, 0.07, 0.03, COL.terra, 14), 0, 0.18, 0));
  jar.add(rot(at(cyl(0.008, 0.008, 0.2, COL.woodLight, 5), 0.02, 0.24, 0), 0, 0, -0.3));
  // A little clay bunny
  const bunny = new THREE.Group();
  bunny.add(at(sph(0.07, '#fff1dc', undefined, 12), 0, 0.06, 0)).scale.set(1, 0.85, 1.15);
  bunny.add(at(sph(0.05, '#fff1dc', undefined, 10), 0, 0.13, 0.05));
  for (const s of [-1, 1]) bunny.add(rot(at(sph(0.02, '#fff1dc', undefined, 8), s * 0.02, 0.2, 0.04), 0, 0, s * 0.2)).scale.set(0.7, 2.2, 0.6);
  bunny.add(at(sph(0.01, '#ef7b8f', undefined, 6), 0, 0.13, 0.1));
  const items = [
    { id: 'mugs', label: 'Matching mugs', sub: 'An R mug and an H mug', short: 'matching mugs', the: 'the matching mugs', o: mugs, dx: -0.75, wrap: COL.rose },
    { id: 'dish', label: 'A heart dish', sub: 'For her rings by the sink', short: 'heart dish', the: 'the heart dish', o: dish, dx: -0.25, wrap: '#ef5b6f' },
    { id: 'jar', label: 'A honey jar', sub: 'With a little wooden dipper', short: 'honey jar', the: 'the honey jar', o: jar, dx: 0.25, wrap: COL.sun },
    { id: 'bunny', label: 'A clay bunny', sub: 'Small enough for a pocket', short: 'clay bunny', the: 'the little clay bunny', o: bunny, dx: 0.75, wrap: COL.lilac },
  ];
  for (const it of items) {
    bake(it.o);
    bakeMat(it.o);
    const g = place(it.o, it.dx, -0.05);
    const tag = atlas.panel(0.34, 0.11, 136, 44, (c, w, h) => {
      c.fillStyle = '#fffaf1';
      roundRect(c, 2, 2, w - 4, h - 4, 10);
      c.fill();
      c.fillStyle = '#8c3f22';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `600 19px ${FONT}`;
      c.fillText(it.label.replace('A ', ''), w / 2, h / 2 + 1, w - 10);
    });
    add(rot(at(tag, x + it.dx, y + 0.02, z + 0.36), -P / 2 + 0.3, 0, 0));
    it.pick = (on) => (g.visible = !on);
  }
  return { list: items };
}
