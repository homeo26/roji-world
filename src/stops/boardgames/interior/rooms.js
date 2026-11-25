import { THREE, COL, mat, umat, mesh, canvasTexture, roundRect, fitText, heartPath, drawPips, drawBoxArt, drawCouple, BOXES, makeDie, dieTop, makeHeartDie, chessPiece, rng, FONT } from '../kit.js';
import { paintSnakesBoard } from '../outside.js';
import * as Lay from './layout.js';

const { ZB, H, CW, SX, SHELVES, SHELF, SIDE_SHELF, COUNTER, BACKBAR, FRIDGE, STOOLS, STOOL_Z, MENU, CORK, PUZZLE, BEANS, XO, C4, NPC_TABLE, CHESS, COIN, TOWER, RPS, SNAKES, CARD_NPCS, TABLE_H, ROOMS } = Lay;
const P = Math.PI;

// Furniture for every room of The Dice House. Things the activities move or redraw are left on R
// (R.pickSlot, R.heartDie, R.cardTable, ...).

export function buildRooms(R) {
  const { K, add, col, atlas } = R;
  const { box, rbox, cyl, sph, tor, cone, at, rot } = K;
  const r = rng(77);

  // ---------------------------------------------------------------- furniture makers
  const table = (x, z, w, d, top, { felt = null, round = false } = {}) => {
    if (round) {
      add(at(cyl(w / 2, w / 2, 0.05, top, 26), x, TABLE_H - 0.025, z));
      add(at(cyl(w / 2 + 0.01, w / 2 + 0.01, 0.03, COL.woodDark, 26), x, TABLE_H - 0.06, z));
      add(at(cyl(0.05, 0.06, TABLE_H - 0.08, COL.woodDark, 10), x, (TABLE_H - 0.08) / 2, z));
      add(at(cyl(0.26, 0.29, 0.04, COL.woodDark, 16), x, 0.02, z));
      col({ type: 'circle', x, z, r: w / 2 + 0.02, h: TABLE_H + 0.02 });
      return;
    }
    add(at(rbox(w, 0.06, d, top, 0.025), x, TABLE_H - 0.03, z));
    if (felt) add(at(box(w - 0.12, 0.005, d - 0.12, felt), x, TABLE_H + 0.003, z));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(at(box(0.07, TABLE_H - 0.06, 0.07, COL.woodDark), x + sx * (w / 2 - 0.08), (TABLE_H - 0.06) / 2, z + sz * (d / 2 - 0.08)));
    add(at(box(w - 0.12, 0.08, 0.04, COL.woodDark), x, TABLE_H - 0.1, z + d / 2 - 0.06));
    col({ type: 'box', x, z, hw: w / 2, hd: d / 2, h: TABLE_H + 0.02 });
  };
  // Chair facing +Z before yaw, seat top at 0.46
  const chair = (x, z, yaw, c) => {
    const g = new THREE.Group();
    for (const [lx, lz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) g.add(at(cyl(0.022, 0.026, 0.42, COL.woodDark, 6), lx, 0.21, lz));
    g.add(at(box(0.44, 0.05, 0.44, COL.wood), 0, 0.43, 0));
    g.add(at(rbox(0.4, 0.04, 0.4, c, 0.02), 0, 0.47, 0));
    for (const lx of [-0.17, 0.17]) g.add(at(cyl(0.02, 0.02, 0.42, COL.woodDark, 6), lx, 0.67, -0.19));
    g.add(at(rbox(0.44, 0.22, 0.05, c, 0.025), 0, 0.84, -0.2));
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    add(g);
    col({ type: 'circle', x, z, r: 0.22, h: 0.48 });
    return g;
  };
  const stool = (x, z, c, h = 0.62) => {
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * P * 2 + 0.5;
      add(rot(at(cyl(0.022, 0.028, h - 0.04, COL.ink, 6), x + Math.sin(a) * 0.13, (h - 0.04) / 2, z + Math.cos(a) * 0.13), Math.cos(a) * 0.12, 0, -Math.sin(a) * 0.12));
    }
    add(rot(at(tor(0.14, 0.014, COL.ink, P * 2, undefined, 16, 4), x, h * 0.35, z), P / 2, 0, 0));
    add(at(cyl(0.2, 0.19, 0.05, COL.wood, 18), x, h - 0.04, z));
    const cu = add(at(sph(0.19, c, undefined, 14), x, h - 0.01, z));
    cu.scale.set(1, 0.2, 1);
    col({ type: 'circle', x, z, r: 0.22, h: h + 0.02 });
  };
  const plant = (x, z, s = 1, pot = COL.white) => {
    add(at(cyl(0.18 * s, 0.14 * s, 0.32 * s, pot, 12), x, 0.16 * s, z));
    add(at(cyl(0.16 * s, 0.16 * s, 0.02, '#6b4a33', 12), x, 0.32 * s, z));
    for (const [dx, dy, dz, rr] of [[0, 0.62, 0, 0.26], [0.13, 0.48, 0.05, 0.18], [-0.12, 0.5, -0.04, 0.19], [0.02, 0.8, -0.06, 0.16]]) add(at(sph(rr * s, dy > 0.7 ? COL.leaf : COL.leafDark, undefined, 10), x + dx * s, dy * s, z + dz * s));
    col({ type: 'circle', x, z, r: 0.2 * s + 0.04 });
  };
  const beanBag = (x, z, c) => {
    const b = add(at(sph(0.42, c, { rough: 0.9 }, 16), x, 0.2, z));
    b.scale.set(1, 0.55, 1);
    const top = add(at(sph(0.28, c, { rough: 0.9 }, 14), x, 0.34, z + 0.04));
    top.scale.set(1, 0.4, 1);
    col({ type: 'circle', x, z, r: 0.4, h: 0.3 });
  };
  R.chair = chair;
  R.table = table;

  // Spine labels: one atlas cell per game, shared by every copy of that box
  const spineGeo = BOXES.map((b, i) => K.geo('spine' + i, () => atlas.cell(132, 26, (c, w, h) => drawBoxArt(c, w, h, b, { spine: true }), new THREE.PlaneGeometry(1, 1))));
  // A shelf unit facing +Z (before yaw), filled with stacks of boxes. skip: { 'level,slot': name } left
  // empty; each empty slot's spot is kept in R.slots[name].
  R.slots = {};
  const shelfUnit = (x, z, yaw, { skip = {} } = {}) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    add(g);
    const { w, d, h, planks } = SHELF;
    const wood = COL.woodDark;
    for (const s of [-1, 1]) g.add(at(box(0.06, h, d, wood), s * (w / 2 - 0.03), h / 2, 0));
    g.add(at(box(w, h, 0.03, '#8a5a38'), 0, h / 2, -d / 2 + 0.015));
    for (const y of planks) g.add(at(box(w - 0.04, 0.04, d, COL.wood), 0, y, 0));
    g.add(at(box(w + 0.1, 0.08, d + 0.06, wood), 0, h + 0.04, 0.0));
    const world = new THREE.Vector3();
    planks.slice(0, -1).forEach((py, lv) => {
      const gap = planks[lv + 1] - py - 0.04;
      let u = -w / 2 + 0.1;
      let slot = 0;
      while (u < w / 2 - 0.35) {
        const bw = 0.36 + r() * 0.22;
        if (u + bw > w / 2 - 0.08) break;
        const n = 1 + Math.floor(r() * Math.min(4, gap / 0.13));
        let y = py + 0.02;
        const isSkip = skip[lv + ',' + slot];
        if (!isSkip) for (let k = 0; k < n; k++) {
          const bh = 0.08 + r() * 0.06;
          if (y + bh > py + gap - 0.02) break;
          const bb = new THREE.Group();
          const idx = Math.floor(r() * BOXES.length);
          const b = BOXES[idx];
          bb.add(at(box(bw - k * 0.02, bh, d - 0.08, b.c), 0, bh / 2, 0));
          const sp = mesh(spineGeo[idx], atlas.material, { cast: false });
          sp.scale.set((bw - k * 0.02) * 0.98, bh * 0.9, 1);
          bb.add(at(sp, 0, bh / 2, (d - 0.08) / 2 + 0.003));
          bb.position.set(u + bw / 2 + (r() - 0.5) * 0.02, y, 0.02);
          bb.rotation.y = (r() - 0.5) * 0.06;
          g.add(bb);
          y += bh;
        } else {
          g.updateMatrixWorld(true);
          R.slots[isSkip] = { world: g.localToWorld(world.set(u + bw / 2, py + 0.02, 0.02)).clone(), yaw, w: bw, d: d - 0.08 };
        }
        u += bw + 0.06 + r() * 0.06;
        slot++;
      }
    });
    return g;
  };

  // ================================================================ GAME LIBRARY
  const lib = ROOMS.lib;
  SHELVES.forEach((x, i) => shelfUnit(x, ZB + SHELF.d / 2 + 0.02, 0, { skip: i === 1 ? { '2,1': 'pick', '3,2': 'heart' } : {} }));
  R.pickSlot = R.slots.pick;
  col({ type: 'box', x: (SHELVES[0] + SHELVES[2]) / 2, z: ZB + SHELF.d / 2 + 0.02, hw: (SHELVES[2] - SHELVES[0]) / 2 + SHELF.w / 2, hd: SHELF.d / 2 + 0.02 });
  shelfUnit(SIDE_SHELF.x, SIDE_SHELF.z, P / 2);
  col({ type: 'box', x: SIDE_SHELF.x, z: SIDE_SHELF.z, hw: SHELF.d / 2 + 0.02, hd: SHELF.w / 2 });
  // Signs over the shelves
  const libSign = atlas.panel(1.7, 0.36, 220, 46, (c, w, h) => {
    c.fillStyle = COL.plum;
    roundRect(c, 0, 0, w, h, 16);
    c.fill();
    c.fillStyle = '#ffd166';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Game library', w / 2, h / 2 + 2, w * 0.8, 28, 700);
  });
  add(at(libSign, SHELVES[1], SHELF.h + 0.3, ZB + 0.06));
  // The heart-shaped die, up on the highest shelf
  const hd = makeHeartDie(0.22);
  const hs = R.slots.heart?.world || new THREE.Vector3(SHELVES[1] + 0.6, SHELF.planks[3] + 0.02, ZB + 0.24);
  hd.position.set(hs.x, hs.y + 0.14, hs.z + 0.04);
  hd.rotation.set(-0.15, -0.2, 0.1);
  add(hd);
  R.heartDie = hd;
  // A rolling ladder against the middle shelf
  const ladder = new THREE.Group();
  for (const s of [-1, 1]) ladder.add(at(box(0.05, 3.0, 0.05, COL.wood), s * 0.22, 1.5, 0));
  for (let k = 0; k < 8; k++) ladder.add(at(box(0.44, 0.04, 0.05, COL.wood), 0, 0.25 + k * 0.36, 0));
  for (const s of [-1, 1]) ladder.add(at(cyl(0.04, 0.04, 0.03, COL.ink, 10), s * 0.22, 0.04, 0.02));
  ladder.position.set(SHELVES[1] - 0.85, 0, ZB + 0.82);
  ladder.rotation.x = -0.14;
  add(ladder);
  col({ type: 'box', x: SHELVES[1] - 0.85, z: ZB + 0.72, hw: 0.28, hd: 0.14 });
  // Reading nook: armchair, lamp, side table with a pile of boxes
  const arm = new THREE.Group();
  arm.add(at(rbox(0.95, 0.42, 0.85, COL.teal, 0.12), 0, 0.3, 0));
  arm.add(at(rbox(0.95, 0.7, 0.24, COL.teal, 0.1), 0, 0.72, -0.32));
  for (const s of [-1, 1]) arm.add(at(rbox(0.2, 0.55, 0.8, COL.teal, 0.08), s * 0.42, 0.5, 0));
  arm.add(at(rbox(0.6, 0.12, 0.55, COL.mint, 0.05), 0, 0.56, 0.06));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) arm.add(at(cyl(0.03, 0.025, 0.1, COL.woodDark, 6), sx * 0.38, 0.05, sz * 0.32));
  arm.position.set(-11.8, 0, -2.5);
  arm.rotation.y = 0.55;
  add(arm);
  col({ type: 'circle', x: -11.8, z: -2.5, r: 0.55, h: 0.55 });
  add(at(cyl(0.02, 0.02, 1.5, COL.ink, 6), -12.6, 0.75, -1.9));
  add(at(cyl(0.16, 0.18, 0.03, COL.ink, 12), -12.6, 0.015, -1.9));
  add(at(mesh(K.geo('fshade', () => new THREE.CylinderGeometry(0.14, 0.24, 0.3, 14, 1, true)), mat(COL.sun, { side: THREE.DoubleSide })), -12.6, 1.55, -1.9));
  add(at(mesh(K.geo('fbulb', () => new THREE.SphereGeometry(0.07, 10, 8)), umat('#fff3c8', { emissive: '#ffd27a', ei: 0.9 }), { cast: false }), -12.6, 1.5, -1.9));
  col({ type: 'circle', x: -12.6, z: -1.9, r: 0.15 });
  table(-10.7, -2.1, 0.6, 0.6, COL.cream, { round: true });
  for (let k = 0; k < 3; k++) add(at(box(0.42 - k * 0.04, 0.09, 0.3, BOXES[k + 5].c), -10.7, TABLE_H + 0.045 + k * 0.09, -2.1)).rotation.y = k * 0.3;
  // A trolley of boxes waiting to go back
  const cart = new THREE.Group();
  cart.add(at(box(1.1, 0.05, 0.5, COL.woodDark), 0, 0.35, 0));
  cart.add(at(box(1.1, 0.05, 0.5, COL.woodDark), 0, 0.8, 0));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    cart.add(at(box(0.04, 0.82, 0.04, COL.ink), sx * 0.52, 0.47, sz * 0.22));
    cart.add(at(sph(0.05, COL.ink, undefined, 8), sx * 0.48, 0.05, sz * 0.2));
  }
  for (const y of [0.375, 0.825]) for (let k = 0; k < 3; k++) cart.add(at(box(0.3, 0.12 + k * 0.03, 0.36, BOXES[(k * 5 + Math.round(y * 10)) % BOXES.length].c), -0.34 + k * 0.34, y + 0.07 + k * 0.015, 0));
  cart.position.set(-6.0, 0, -2.6);
  cart.rotation.y = -0.3;
  add(cart);
  col({ type: 'circle', x: -6.0, z: -2.6, r: 0.6, h: 0.9 });
  // A rug, and a low table of new arrivals standing up to show their covers
  add(at(rbox(3.0, 0.012, 1.9, COL.mint, 0.006), -9.9, 0.006, -4.35));
  add(at(rbox(2.7, 0.014, 1.6, COL.cream, 0.006), -9.9, 0.008, -4.35));
  const NX = -10.1;
  const NZ = -4.5;
  add(at(rbox(1.5, 0.06, 0.6, COL.wood, 0.02), NX, 0.5, NZ));
  for (const s of [-1, 1]) add(at(box(0.08, 0.47, 0.5, COL.woodDark), NX + s * 0.66, 0.235, NZ));
  col({ type: 'box', x: NX, z: NZ, hw: 0.76, hd: 0.31, h: 0.53 });
  [9, 16, 8].forEach((bi, k) => {
    const b = BOXES[bi];
    const cover = atlas.panel(0.42, 0.31, 128, 94, (c, w, h) => drawBoxArt(c, w, h, b));
    const bx = NX - 0.46 + k * 0.46;
    add(rot(at(box(0.44, 0.33, 0.06, b.c), bx, 0.7, NZ - 0.05), -0.2, (k - 1) * 0.15, 0));
    add(rot(at(cover, bx + Math.sin((k - 1) * 0.15) * 0.031, 0.7 + 0.006, NZ - 0.05 + 0.031), -0.2, (k - 1) * 0.15, 0));
  });
  const newSign = atlas.panel(0.6, 0.16, 120, 32, (c, w, h) => {
    c.fillStyle = COL.rose;
    roundRect(c, 0, 0, w, h, 10);
    c.fill();
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'New in!', w / 2, h / 2 + 1, w - 14, 20, 700);
  });
  add(rot(at(newSign, NX, 0.5, NZ + 0.305), 0, 0, 0));
  plant(lib.x0 + 0.5, ZB + 0.55, 1.1);
  plant(-SX - 0.45, ZB + 0.55, 0.9, COL.pink);

  // ================================================================ COUNTER
  const C = COUNTER;
  const cw = C.x1 - C.x0;
  const cx = (C.x0 + C.x1) / 2;
  add(at(rbox(cw, C.h - 0.06, C.d, COL.lav, 0.04), cx, (C.h - 0.06) / 2, C.z));
  add(at(rbox(cw + 0.12, 0.07, C.d + 0.12, COL.wood, 0.025), cx, C.h - 0.035, C.z));
  const front = atlas.panel(cw - 0.3, C.h - 0.3, 600, 150, (c, w, h) => {
    c.fillStyle = COL.purple;
    roundRect(c, 0, 0, w, h, 18);
    c.fill();
    for (let i = 0; i < 7; i++) {
      const x = 50 + i * 83;
      c.save();
      c.translate(x, i % 2 ? 46 : 104);
      c.rotate((i % 3) * 0.3 - 0.3);
      c.fillStyle = '#ffffff';
      roundRect(c, -22, -22, 44, 44, 10);
      c.fill();
      drawPips(c, 0, 0, 44, (i % 6) + 1, COL.plum);
      c.restore();
    }
    c.fillStyle = '#ffd166';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 30px ${FONT}`;
    c.fillText('Snacks and smiles', w / 2, h / 2 + 2);
  });
  add(at(front, cx, (C.h - 0.06) / 2, C.z + C.d / 2 + 0.003));
  col({ type: 'box', x: cx, z: C.z, hw: cw / 2 + 0.06, hd: C.d / 2 + 0.06 });
  // On the counter: a die-shaped till, a bell, a jar of sweets and a glass case of cakes
  const till = makeDie(0.3, { body: COL.sun, pip: COL.plum });
  till.position.set(C.x0 + 0.45, C.h + 0.15, C.z);
  till.quaternion.copy(dieTop(5, 0.3));
  add(till);
  add(at(cyl(0.09, 0.1, 0.02, COL.gold, 14), C.x0 + 1.2, C.h + 0.01, C.z + 0.15));
  add(at(sph(0.07, mat(COL.gold, { rough: 0.3, metal: 0.5 }), undefined, 12), C.x0 + 1.2, C.h + 0.03, C.z + 0.15)).scale.y = 0.8;
  const jarGlass = new THREE.MeshStandardMaterial({ color: '#e8f8ff', transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false });
  const jarX = C.x0 + 2.0;
  for (let k = 0; k < 14; k++) add(at(sph(0.035, [COL.rose, COL.sun, COL.mint, COL.lilac, COL.sky][k % 5], undefined, 8), jarX + Math.cos(k * 2.4) * 0.08, C.h + 0.05 + Math.floor(k / 5) * 0.06, C.z + Math.sin(k * 2.4) * 0.08));
  add(at(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.3, 16), jarGlass, { cast: false }), jarX, C.h + 0.15, C.z));
  add(at(cyl(0.135, 0.135, 0.04, COL.rose, 16), jarX, C.h + 0.32, C.z));
  const caseX = C.x1 - 0.9;
  add(at(rbox(1.2, 0.05, 0.55, COL.white, 0.02), caseX, C.h + 0.025, C.z));
  add(at(mesh(new THREE.BoxGeometry(1.16, 0.42, 0.5), jarGlass, { cast: false }), caseX, C.h + 0.26, C.z));
  add(at(box(1.18, 0.03, 0.52, COL.white), caseX, C.h + 0.48, C.z));
  for (let k = 0; k < 5; k++) {
    const x = caseX - 0.44 + k * 0.22;
    add(at(cyl(0.06, 0.045, 0.07, [COL.pink, COL.sky, COL.sun, COL.mint, COL.lilac][k], 10), x, C.h + 0.085, C.z));
    add(at(sph(0.065, k % 2 ? '#fff4e3' : '#ffd6e0', undefined, 10), x, C.h + 0.14, C.z)).scale.y = 0.75;
    add(at(sph(0.02, COL.red, undefined, 6), x, C.h + 0.2, C.z));
  }
  // Stools
  STOOLS.forEach((x, i) => stool(x, STOOL_Z, [COL.rose, COL.sun, COL.mint, COL.sky][i]));
  // The back bar: cupboards, the cocoa machine, jars and the fridge
  const B = BACKBAR;
  const bw = B.x1 - B.x0;
  const bx = (B.x0 + B.x1) / 2;
  add(at(rbox(bw, B.h, B.d, COL.cream, 0.03), bx, B.h / 2, B.z));
  add(at(rbox(bw + 0.06, 0.05, B.d + 0.06, COL.wood, 0.02), bx, B.h + 0.025, B.z));
  for (let k = 0; k < 6; k++) {
    add(at(box(bw / 6 - 0.08, B.h - 0.2, 0.02, COL.lav), B.x0 + (k + 0.5) * (bw / 6), B.h / 2, B.z + B.d / 2 + 0.01));
    add(at(sph(0.025, COL.gold, undefined, 6), B.x0 + (k + 0.5) * (bw / 6), B.h - 0.2, B.z + B.d / 2 + 0.03));
  }
  col({ type: 'box', x: bx, z: B.z, hw: bw / 2, hd: B.d / 2 });
  // Cocoa machine
  const mx = 0.5;
  add(at(rbox(0.5, 0.6, 0.42, COL.rose, 0.05), mx, B.h + 0.33, B.z));
  add(at(rbox(0.36, 0.16, 0.06, COL.white, 0.03), mx, B.h + 0.5, B.z + 0.22));
  add(at(cyl(0.03, 0.03, 0.08, COL.ink, 8), mx, B.h + 0.2, B.z + 0.16));
  add(at(cyl(0.05, 0.04, 0.09, COL.white, 10), mx, B.h + 0.08, B.z + 0.16));
  for (let k = 0; k < 4; k++) add(at(cyl(0.045, 0.038, 0.09, [COL.pink, COL.sky, COL.sun, COL.mint][k], 10), mx + 0.45 + k * 0.13, B.h + 0.095, B.z + 0.05));
  // Jar shelves
  for (const y of [1.5, 2.0]) {
    add(at(box(2.4, 0.04, 0.26, COL.wood), 1.2, y, ZB + 0.13));
    for (let k = 0; k < 6; k++) {
      const jx = 0.2 + k * 0.38;
      add(at(cyl(0.1, 0.1, 0.22, '#ffffff', 12), jx, y + 0.13, ZB + 0.14));
      add(at(cyl(0.095, 0.095, 0.12, [COL.orange, COL.sun, COL.rose, '#a0602e', COL.mint, COL.lilac][(k + Math.round(y * 2)) % 6], 12), jx, y + 0.09, ZB + 0.14));
      add(at(cyl(0.105, 0.105, 0.04, COL.woodDark, 12), jx, y + 0.26, ZB + 0.14));
    }
  }
  // Fridge, glowing a little
  add(at(rbox(0.95, 1.95, 0.7, COL.white, 0.06), FRIDGE.x, 0.975, FRIDGE.z));
  const fridgeGlass = atlas.panel(0.75, 1.55, 96, 196, (c, w, h) => {
    c.fillStyle = '#e8f7ff';
    c.fillRect(0, 0, w, h);
    for (let s = 0; s < 4; s++) {
      c.fillStyle = '#c6dce8';
      c.fillRect(0, 44 + s * 46, w, 4);
      for (let k = 0; k < 4; k++) {
        c.fillStyle = [COL.rose, COL.sun, COL.mint, COL.orange, COL.sky][(s + k) % 5];
        roundRect(c, 8 + k * 21, 14 + s * 46, 14, 30, 5);
        c.fill();
      }
    }
  });
  add(at(fridgeGlass, FRIDGE.x, 1.0, FRIDGE.z + 0.355));
  add(at(box(0.04, 0.5, 0.05, COL.steel || '#d3dbe5'), FRIDGE.x + 0.36, 1.1, FRIDGE.z + 0.37));
  col({ type: 'box', x: FRIDGE.x, z: FRIDGE.z, hw: 0.5, hd: 0.37 });
  // Menu
  const menu = atlas.panel(MENU.w, MENU.h, 300, 116, (c, w, h) => {
    c.fillStyle = COL.chalk;
    roundRect(c, 0, 0, w, h, 14);
    c.fill();
    c.strokeStyle = COL.wood;
    c.lineWidth = 8;
    roundRect(c, 4, 4, w - 8, h - 8, 12);
    c.stroke();
    c.fillStyle = '#ffd166';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Snacks and drinks', w / 2, 24, w - 40, 22, 700);
    c.fillStyle = '#ffffff';
    c.textAlign = 'left';
    const items = ['Popcorn', 'Cookies', 'Cupcakes', 'Pizza slices', 'Hot cocoa', 'Milkshakes', 'Juice', 'Lattes'];
    items.forEach((it, i) => fitText(c, it, 22 + (i % 2) * 140, 52 + Math.floor(i / 2) * 16, 120, 14, 600));
  });
  add(at(menu, MENU.x, MENU.y, ZB + 0.03));
  // The corkboard with notes, a photo of Roji and Homama, and the famous score sheet
  const cork = atlas.panel(1.35, 0.95, 200, 140, (c, w, h) => {
    c.fillStyle = '#c98f5a';
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(120,70,30,0.25)';
    for (let i = 0; i < 160; i++) c.fillRect((i * 37) % w, (i * 53) % h, 2, 2);
    c.strokeStyle = COL.woodDark;
    c.lineWidth = 8;
    c.strokeRect(4, 4, w - 8, h - 8);
    // flyer
    c.fillStyle = '#fff4a8';
    c.save();
    c.translate(36, 38);
    c.rotate(-0.08);
    c.fillRect(-26, -24, 54, 50);
    c.fillStyle = COL.ink;
    c.font = `600 9px ${FONT}`;
    c.textAlign = 'center';
    c.fillText('Game night', 1, -8);
    c.fillText('every night', 1, 4);
    c.fillStyle = COL.rose;
    heartPath(c, 1, 9, 10);
    c.fill();
    c.restore();
    // photo
    c.save();
    c.translate(46, 104);
    c.rotate(0.1);
    c.fillStyle = '#ffffff';
    c.fillRect(-28, -26, 56, 52);
    c.fillStyle = '#bfe6ff';
    c.fillRect(-24, -22, 48, 38);
    drawCouple(c, 0, 14, 34, { heart: true });
    c.restore();
    // pins
    for (const [x, y, cc] of [[38, 15, COL.rose], [46, 79, COL.blue], [138, 18, COL.sun]]) {
      c.fillStyle = cc;
      c.beginPath();
      c.arc(x, y, 4, 0, P * 2);
      c.fill();
    }
  });
  const corkWall = R.cutWalls.cosy;
  corkWall.add(at(cork, CORK.x - corkWall.cx, CORK.y, 0.105));
  // The score sheet, pinned on the right of the corkboard
  const sheet = atlas.panel(0.46, 0.64, 92, 128, (c, w, h) => paintScoreSheet(c, w, h));
  corkWall.add(at(sheet, CORK.x + 0.36 - corkWall.cx, CORK.y + 0.02, 0.112)).rotation.z = -0.04;

  // ================================================================ COSY CORNER
  const co = ROOMS.cosy;
  const rugC = mesh(new THREE.CircleGeometry(2.1, 40), mat(COL.blush), { cast: false });
  add(at(rugC, PUZZLE.x, 0.005, PUZZLE.z)).rotation.x = -P / 2;
  const rugC2 = mesh(new THREE.RingGeometry(1.75, 1.9, 40), mat(COL.pink), { cast: false });
  add(at(rugC2, PUZZLE.x, 0.007, PUZZLE.z)).rotation.x = -P / 2;
  // The low jigsaw table
  const PZ = PUZZLE;
  add(at(rbox(PZ.w, 0.06, PZ.d, COL.wood, 0.03), PZ.x, PZ.h - 0.03, PZ.z));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(at(cyl(0.04, 0.035, PZ.h - 0.06, COL.woodDark, 8), PZ.x + sx * (PZ.w / 2 - 0.1), (PZ.h - 0.06) / 2, PZ.z + sz * (PZ.d / 2 - 0.1)));
  col({ type: 'box', x: PZ.x, z: PZ.z, hw: PZ.w / 2, hd: PZ.d / 2, h: PZ.h + 0.01 });
  BEANS.forEach((b) => beanBag(b.x, b.z, b.c));
  // Window with curtains on the back wall
  const WX = 8.8;
  const sky = canvasTexture(128, 96, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#9fd8ff');
    g.addColorStop(1, '#eaf8ff');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.ellipse(36, 30, 18, 8, 0, 0, P * 2);
    c.ellipse(50, 26, 13, 8, 0, 0, P * 2);
    c.fill();
    c.fillStyle = '#9ad06a';
    c.beginPath();
    c.ellipse(30, 104, 60, 26, 0, 0, P * 2);
    c.ellipse(110, 108, 50, 24, 0, 0, P * 2);
    c.fill();
  });
  R.skyMat = new THREE.MeshBasicMaterial({ map: sky });
  add(at(rbox(2.3, 1.5, 0.08, COL.white, 0.04), WX, 1.8, ZB + 0.04));
  add(at(mesh(new THREE.PlaneGeometry(2.1, 1.3), R.skyMat, { cast: false }), WX, 1.8, ZB + 0.085));
  add(at(box(0.05, 1.3, 0.04, COL.white), WX, 1.8, ZB + 0.1));
  add(at(box(2.1, 0.05, 0.04, COL.white), WX, 1.8, ZB + 0.1));
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) add(at(cyl(0.07, 0.09, 1.7, COL.pink, 10), WX + s * (1.2 + k * 0.1), 1.75, ZB + 0.14 + (k % 2) * 0.03));
  }
  add(rot(at(cyl(0.025, 0.025, 3.0, COL.gold, 8), WX, 2.62, ZB + 0.16), 0, 0, P / 2));
  add(at(rbox(2.4, 0.08, 0.26, COL.white, 0.03), WX, 1.02, ZB + 0.13));
  // A low shelf of jigsaw boxes and a reading lamp
  const lowShelf = (x) => {
    add(at(box(1.2, 0.7, 0.36, COL.wood), x, 0.35, ZB + 0.2));
    for (let k = 0; k < 4; k++) add(at(box(0.24, 0.3, 0.3, BOXES[(k * 3 + 2) % BOXES.length].c), x - 0.42 + k * 0.28, 0.85, ZB + 0.2));
    col({ type: 'box', x, z: ZB + 0.2, hw: 0.62, hd: 0.2 });
  };
  lowShelf(co.x0 + 1.0);
  add(at(cyl(0.02, 0.02, 1.5, COL.ink, 6), co.x1 - 0.5, 0.75, -2.0));
  add(at(cyl(0.16, 0.18, 0.03, COL.ink, 12), co.x1 - 0.5, 0.015, -2.0));
  add(at(mesh(K.geo('fshade', () => new THREE.CylinderGeometry(0.14, 0.24, 0.3, 14, 1, true)), mat(COL.pink, { side: THREE.DoubleSide })), co.x1 - 0.5, 1.55, -2.0));
  add(at(mesh(K.geo('fbulb', () => new THREE.SphereGeometry(0.07, 10, 8)), umat('#fff3c8', { emissive: '#ffd27a', ei: 0.9 }), { cast: false }), co.x1 - 0.5, 1.5, -2.0));
  col({ type: 'circle', x: co.x1 - 0.5, z: -2.0, r: 0.15 });
  plant(co.x1 - 0.5, ZB + 0.5, 1.2, COL.rose);
  // Fairy lights along the top of the back wall
  const fairy = [];
  for (let x = co.x0 + 0.4; x < co.x1 - 0.3; x += 0.32) fairy.push(new THREE.Vector3(x, H - 0.32 - Math.abs(Math.sin((x - co.x0) * 0.9)) * 0.18, ZB + 0.12));
  R.fairy = fairy;

  // ================================================================ GAME TABLES
  // X O
  table(XO.x, XO.z, 1.1, 1.1, COL.cream);
  chair(XO.x - 0.82, XO.z, P / 2, COL.rose);
  chair(XO.x + 0.82, XO.z, -P / 2, COL.sky);
  add(at(rbox(0.6, 0.05, 0.6, COL.wood, 0.02), XO.x, TABLE_H + 0.025, XO.z));
  for (const k of [-1, 1]) {
    add(at(box(0.56, 0.02, 0.03, COL.woodDark), XO.x, TABLE_H + 0.06, XO.z + k * 0.1));
    add(at(box(0.03, 0.02, 0.56, COL.woodDark), XO.x + k * 0.1, TABLE_H + 0.06, XO.z));
  }
  const xMat = K.M(COL.rose, { rough: 0.5 });
  const oMat = K.M(COL.blue, { rough: 0.5 });
  for (const [i, j, x] of [[0, 0, true], [1, 1, false], [2, 0, true], [0, 2, false]]) {
    const px = XO.x + (i - 1) * 0.2;
    const pz = XO.z + (j - 1) * 0.2;
    if (x) for (const s of [-1, 1]) add(rot(at(box(0.15, 0.04, 0.035, xMat), px, TABLE_H + 0.08, pz), 0, s * P / 4, 0));
    else add(rot(at(tor(0.055, 0.018, oMat, P * 2, undefined, 14, 6), px, TABLE_H + 0.08, pz), P / 2, 0, 0));
  }
  // Four in a Row: the blue stand with its discs
  table(C4.x, C4.z, 1.1, 1.1, COL.cream);
  chair(C4.x - 0.82, C4.z, P / 2, COL.sun);
  chair(C4.x + 0.82, C4.z, -P / 2, COL.mint);
  const c4 = new THREE.Group();
  c4.add(at(rbox(0.66, 0.5, 0.06, COL.blue, 0.03), 0, 0.3, 0));
  for (const s of [-1, 1]) c4.add(rot(at(box(0.05, 0.03, 0.3, COL.blue), s * 0.31, 0.04, 0), 0, 0, 0));
  const holeM = K.M('#2c4fa8', { rough: 0.6 });
  for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) {
    const filled = j < [2, 4, 1, 3, 2, 0][i];
    const hx = -0.27 + i * 0.108;
    const hy = 0.1 + j * 0.09;
    const disc = cyl(0.04, 0.04, 0.07, filled ? ((i + j) % 2 ? COL.red : COL.sun) : holeM, 12);
    disc.rotation.x = P / 2;
    c4.add(at(disc, hx, hy, 0));
  }
  c4.position.set(C4.x, TABLE_H, C4.z - 0.1);
  add(c4);
  for (const [dx, cc] of [[-0.3, COL.red], [-0.22, COL.red], [0.25, COL.sun], [0.33, COL.sun]]) add(at(cyl(0.04, 0.04, 0.02, cc, 12), C4.x + dx, TABLE_H + 0.012, C4.z + 0.32));
  // Somebody else's game
  table(NPC_TABLE.x, NPC_TABLE.z, 1.0, 1.0, COL.cream, { round: true });
  chair(NPC_TABLE.x - 0.8, NPC_TABLE.z, P / 2, COL.lilac);
  chair(NPC_TABLE.x + 0.8, NPC_TABLE.z, -P / 2, COL.pink);
  const ludo = atlas.wrap(new THREE.BoxGeometry(0.56, 0.02, 0.56), 128, 128, (c, w, h) => {
    c.fillStyle = '#fff4e3';
    c.fillRect(0, 0, w, h);
    [[0, 0, COL.red], [w / 2, 0, COL.blue], [0, h / 2, COL.sun], [w / 2, h / 2, COL.green]].forEach(([x, y, cc]) => {
      c.fillStyle = cc;
      roundRect(c, x + 8, y + 8, w / 2 - 16, h / 2 - 16, 10);
      c.fill();
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(x + w / 4, y + h / 4, 12, 0, P * 2);
      c.fill();
    });
    c.fillStyle = '#ffd166';
    c.beginPath();
    c.arc(w / 2, h / 2, 16, 0, P * 2);
    c.fill();
  });
  add(at(ludo, NPC_TABLE.x, TABLE_H + 0.01, NPC_TABLE.z)).rotation.y = 0.3;
  for (const [dx, dz, cc] of [[-0.12, 0.05, COL.red], [0.1, -0.12, COL.blue], [0.15, 0.14, COL.green]]) add(at(cone(0.03, 0.08, cc, 8), NPC_TABLE.x + dx, TABLE_H + 0.06, NPC_TABLE.z + dz));
  plant(ROOMS.tables.x0 + 0.5, 7.3, 1.1, COL.sun);
  plant(-SX - 0.5, 2.9, 0.9);

  // Posters on the library's cutaway wall (front face), so they sink with it
  const libWall = R.cutWalls.lib;
  const poster = (wallRec, x, y, w, h, pw, ph, draw) => {
    const p = atlas.panel(w, h, pw, ph, draw);
    wallRec.add(at(p, x - wallRec.cx, y, 0.105));
  };
  poster(libWall, XO.x, 1.85, 1.1, 1.3, 132, 156, (c, w, h) => {
    c.fillStyle = '#ffffff';
    roundRect(c, 0, 0, w, h, 10);
    c.fill();
    c.fillStyle = COL.plum;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'House rules', w / 2, 20, w - 20, 18, 700);
    c.fillStyle = COL.ink;
    ['Be kind', 'Roll gently', 'Share snacks', 'No flipping', 'the board', 'Hug the loser'].forEach((l, i) => fitText(c, l, w / 2, 46 + i * 18, w - 20, 13, 600));
  });
  poster(libWall, C4.x, 1.85, 1.1, 1.3, 132, 156, (c, w, h) => {
    c.fillStyle = COL.sun;
    roundRect(c, 0, 0, w, h, 10);
    c.fill();
    c.fillStyle = '#ffffff';
    roundRect(c, 36, 30, 60, 60, 12);
    c.fill();
    drawPips(c, 66, 60, 60, 6, COL.plum);
    c.fillStyle = COL.plum;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Roll with it', w / 2, 118, w - 16, 18, 700);
  });

  // ================================================================ ENTRANCE
  table(CHESS.x, CHESS.z, 0.9, 0.9, COL.cream);
  chair(CHESS.x - 0.75, CHESS.z, P / 2, COL.purple);
  chair(CHESS.x + 0.75, CHESS.z, -P / 2, COL.purple);
  const cb = atlas.wrap(new THREE.BoxGeometry(0.56, 0.03, 0.56), 128, 128, (c, w, h) => {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      c.fillStyle = (i + j) % 2 ? COL.grape : '#fff4e3';
      c.fillRect((i * w) / 8, (j * h) / 8, w / 8 + 1, h / 8 + 1);
    }
  });
  add(at(cb, CHESS.x, TABLE_H + 0.015, CHESS.z));
  for (const [i, j, k, cc] of [[4, 0, 'king', COL.grape], [3, 1, 'pawn', COL.grape], [5, 2, 'knight', COL.grape], [2, 2, 'pawn', COL.grape], [3, 6, 'queen', COL.cream], [4, 7, 'king', COL.cream], [6, 5, 'pawn', COL.cream], [1, 4, 'rook', COL.cream]]) {
    const pc = chessPiece(K, k, cc, 1, k === 'knight' ? COL.lilac : null);
    pc.scale.setScalar(0.1);
    pc.rotation.y = P / 2;
    add(at(pc, CHESS.x + (j - 3.5) * 0.07, TABLE_H + 0.03, CHESS.z + (i - 3.5) * 0.07));
  }
  // chess clock
  add(at(rbox(0.2, 0.09, 0.09, COL.woodDark, 0.02), CHESS.x, TABLE_H + 0.045, CHESS.z + 0.36));
  for (const s of [-1, 1]) {
    add(at(cyl(0.032, 0.032, 0.012, COL.white, 12), CHESS.x + s * 0.05, TABLE_H + 0.05, CHESS.z + 0.41)).rotation.x = P / 2;
    add(at(cyl(0.012, 0.012, 0.03, s < 0 ? COL.rose : COL.ink, 8), CHESS.x + s * 0.05, TABLE_H + 0.105, CHESS.z + 0.36));
  }
  // Coin toss stand
  add(at(cyl(0.32, 0.38, 0.12, COL.grape, 20), COIN.x, 0.06, COIN.z));
  add(at(cyl(0.12, 0.16, 0.8, COL.lilac, 16), COIN.x, 0.52, COIN.z));
  add(at(cyl(0.3, 0.26, 0.08, COL.grape, 20), COIN.x, 0.96, COIN.z));
  add(at(tor(0.3, 0.02, COL.gold, P * 2, undefined, 24, 6), COIN.x, 1.0, COIN.z)).rotation.x = P / 2;
  col({ type: 'circle', x: COIN.x, z: COIN.z, r: 0.38 });
  const coinSign = atlas.panel(0.9, 0.42, 150, 70, (c, w, h) => {
    c.fillStyle = '#ffffff';
    roundRect(c, 0, 0, w, h, 14);
    c.fill();
    c.strokeStyle = COL.gold;
    c.lineWidth = 6;
    roundRect(c, 3, 3, w - 6, h - 6, 12);
    c.stroke();
    c.fillStyle = COL.plum;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Coin toss', w / 2, 24, w - 20, 22, 700);
    c.fillStyle = COL.rose;
    fitText(c, 'The loser dances', w / 2, 50, w - 20, 15, 600);
  });
  add(at(coinSign, COIN.x, 0.55, COIN.z + 0.19)).rotation.x = -0.05;
  // Coat stand and plants by the door
  add(at(cyl(0.03, 0.03, 1.8, COL.woodDark, 8), 3.7, 0.9, 7.0));
  add(at(cyl(0.2, 0.22, 0.04, COL.woodDark, 12), 3.7, 0.02, 7.0));
  for (let k = 0; k < 4; k++) add(rot(at(cyl(0.015, 0.015, 0.25, COL.woodDark, 6), 3.7 + Math.sin(k * 1.57) * 0.1, 1.7, 7.0 + Math.cos(k * 1.57) * 0.1), Math.cos(k * 1.57) * 0.7, 0, -Math.sin(k * 1.57) * 0.7));
  add(at(sph(0.16, COL.rose, undefined, 10), 3.82, 1.6, 7.0)).scale.set(0.8, 1.3, 0.6);
  col({ type: 'circle', x: 3.7, z: 7.0, r: 0.22 });
  plant(-3.8, 7.3, 1.2, COL.lilac);
  plant(3.9, -0.6, 1.0, COL.sky);
  plant(-3.9, -0.6, 1.0, COL.pink);
  // Two die-shaped poufs
  for (const [x, z, n, yaw] of [[-3.4, 5.0, 3, 0.4], [3.3, 4.6, 5, -0.3]]) {
    const pf = makeDie(0.5, { body: '#fff4e3', pip: COL.grape });
    pf.position.set(x, 0.25, z);
    pf.quaternion.copy(dieTop(n, yaw));
    add(pf);
    col({ type: 'circle', x, z, r: 0.3, h: 0.5 });
  }
  // ================================================================ CARD ROOM
  table(TOWER.x, TOWER.z, 1.1, 1.1, COL.wood, { felt: COL.felt });
  chair(TOWER.x - 0.8, TOWER.z, P / 2, COL.rose);
  chair(TOWER.x + 0.8, TOWER.z, -P / 2, COL.sky);
  // a deck waiting at the table edge
  for (let k = 0; k < 6; k++) add(at(box(0.14, 0.006, 0.2, k % 2 ? '#ffffff' : '#f4efe6'), TOWER.x + 0.36, TABLE_H + 0.01 + k * 0.006, TOWER.z + 0.36)).rotation.y = 0.2;
  table(RPS.x, RPS.z, 1.1, 1.1, COL.cream);
  chair(RPS.x - 0.8, RPS.z, P / 2, COL.sun);
  chair(RPS.x + 0.8, RPS.z, -P / 2, COL.mint);
  // A little fist, a flat hand and scissors on the table
  const skin = K.M('#f8dccb', { rough: 0.7 });
  add(at(sph(0.07, skin, undefined, 10), RPS.x - 0.2, TABLE_H + 0.06, RPS.z));
  add(rot(at(rbox(0.12, 0.03, 0.16, skin, 0.012), RPS.x, TABLE_H + 0.02, RPS.z), 0, 0.2, 0));
  for (const s of [-1, 1]) add(rot(at(box(0.02, 0.005, 0.16, mat('#d3dbe5', { metal: 0.5, rough: 0.3 })), RPS.x + 0.2 + s * 0.02, TABLE_H + 0.006, RPS.z), 0, s * 0.3, 0));
  for (const s of [-1, 1]) add(at(tor(0.025, 0.008, COL.rose, P * 2, undefined, 12, 4), RPS.x + 0.2 + s * 0.05, TABLE_H + 0.01, RPS.z + 0.1)).rotation.x = P / 2;
  // Big foam hands on the cutaway wall behind it
  const cosyWall = R.cutWalls.cosy;
  poster(cosyWall, RPS.x, 1.95, 2.2, 0.8, 264, 96, (c, w, h) => {
    c.fillStyle = '#ffffff';
    roundRect(c, 0, 0, w, h, 16);
    c.fill();
    c.fillStyle = '#f2c9a8';
    c.beginPath();
    c.arc(44, 48, 26, 0, P * 2);
    c.fill();
    roundRect(c, 106, 18, 52, 60, 12);
    c.fill();
    for (let k = 0; k < 4; k++) {
      roundRect(c, 108 + k * 12, 6, 10, 26, 5);
      c.fill();
    }
    c.save();
    c.translate(220, 52);
    for (const s of [-1, 1]) {
      c.save();
      c.rotate(s * 0.35);
      roundRect(c, -5, -42, 11, 40, 5);
      c.fill();
      c.restore();
    }
    c.beginPath();
    c.arc(0, 8, 18, 0, P * 2);
    c.fill();
    c.restore();
    c.fillStyle = COL.plum;
    c.font = `700 12px ${FONT}`;
    c.textAlign = 'center';
    c.fillText('Rock', 44, 90);
    c.fillText('Paper', 132, 90);
    c.fillText('Scissors', 220, 90);
  });
  poster(cosyWall, TOWER.x, 1.95, 1.0, 1.2, 120, 144, (c, w, h) => {
    c.fillStyle = COL.felt;
    roundRect(c, 0, 0, w, h, 12);
    c.fill();
    c.fillStyle = '#ffffff';
    for (const [x, y, rr] of [[30, 50, -0.3], [60, 44, 0], [90, 50, 0.3]]) {
      c.save();
      c.translate(x, y);
      c.rotate(rr);
      roundRect(c, -16, -24, 32, 48, 5);
      c.fill();
      c.fillStyle = COL.rose;
      heartPath(c, 0, -8, 16);
      c.fill();
      c.fillStyle = '#ffffff';
      c.restore();
    }
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Card towers', w / 2, 104, w - 16, 16, 700);
    fitText(c, 'Highest: 3 floors', w / 2, 124, w - 16, 12, 600);
  });
  // Snakes and Ladders
  table(SNAKES.x, SNAKES.z, 1.2, 1.2, COL.cream);
  chair(SNAKES.x - 0.86, SNAKES.z, P / 2, COL.green);
  chair(SNAKES.x + 0.86, SNAKES.z, -P / 2, COL.orange);
  const sb = atlas.wrap(new THREE.BoxGeometry(0.8, 0.025, 0.8), 200, 200, (c, w, h) => paintSnakesBoard(c, w, h));
  add(at(sb, SNAKES.x, TABLE_H + 0.012, SNAKES.z));
  for (const [dx, dz, cc] of [[0.2, 0.3, COL.rose], [-0.1, -0.25, COL.blue]]) add(at(cone(0.03, 0.08, cc, 8), SNAKES.x + dx, TABLE_H + 0.065, SNAKES.z + dz));
  const sd = makeDie(0.09);
  sd.quaternion.copy(dieTop(4, 0.5));
  add(at(sd, SNAKES.x + 0.48, TABLE_H + 0.045, SNAKES.z - 0.4));
  // The card players' table
  table(CARD_NPCS.x, CARD_NPCS.z, 1.0, 1.0, COL.wood, { round: true });
  chair(CARD_NPCS.x - 0.8, CARD_NPCS.z, P / 2, COL.teal);
  chair(CARD_NPCS.x + 0.8, CARD_NPCS.z, -P / 2, COL.pink);
  for (let k = 0; k < 5; k++) add(rot(at(box(0.12, 0.004, 0.17, '#ffffff'), CARD_NPCS.x + (k - 2) * 0.05, TABLE_H + 0.004 + k * 0.002, CARD_NPCS.z + 0.05), 0, (k - 2) * 0.25, 0));
  add(at(box(0.13, 0.04, 0.18, COL.red), CARD_NPCS.x, TABLE_H + 0.02, CARD_NPCS.z - 0.25));
  // The cat's cushion between the tables
  add(at(cyl(0.34, 0.36, 0.1, COL.rose, 18), Lay.CAT.x, 0.05, Lay.CAT.z));
  add(at(tor(0.32, 0.05, COL.pink, P * 2, undefined, 20, 6), Lay.CAT.x, 0.1, Lay.CAT.z)).rotation.x = P / 2;
  col({ type: 'circle', x: Lay.CAT.x, z: Lay.CAT.z, r: 0.36, h: 0.12 });
  plant(ROOMS.cards.x1 - 0.5, 7.3, 1.1, COL.mint);
  plant(SX + 0.5, 2.9, 0.9, COL.sun);
}

// The score sheet where Homama "lets" Roji win: her side is full of tally marks, his has one, crossed out.
export function paintScoreSheet(c, w, h) {
  c.fillStyle = '#fffdf6';
  c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(111,184,255,0.5)';
  c.lineWidth = 1;
  for (let y = 26; y < h; y += 10) {
    c.beginPath();
    c.moveTo(4, y);
    c.lineTo(w - 4, y);
    c.stroke();
  }
  c.strokeStyle = 'rgba(239,91,111,0.6)';
  c.beginPath();
  c.moveTo(w / 2, 22);
  c.lineTo(w / 2, h - 18);
  c.stroke();
  c.fillStyle = COL.ink;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  fitText(c, 'Score sheet', w / 2, 10, w - 10, 11, 700);
  fitText(c, 'Roji', w / 4, 22, w / 2 - 8, 9, 700);
  fitText(c, 'Homama', (w * 3) / 4, 22, w / 2 - 8, 9, 700);
  // Roji's tallies, five at a time
  c.strokeStyle = COL.rose;
  c.lineWidth = 1.3;
  for (let g = 0; g < 9; g++) {
    const x0 = 6 + (g % 2) * 20;
    const y0 = 30 + Math.floor(g / 2) * 14;
    for (let k = 0; k < 4; k++) {
      c.beginPath();
      c.moveTo(x0 + k * 3.5, y0);
      c.lineTo(x0 + k * 3.5, y0 + 9);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(x0 - 1, y0 + 8);
    c.lineTo(x0 + 13, y0 + 1);
    c.stroke();
  }
  // Homama's lonely tally, crossed out
  c.strokeStyle = COL.blue;
  c.beginPath();
  c.moveTo(w * 0.7, 32);
  c.lineTo(w * 0.7, 41);
  c.stroke();
  c.beginPath();
  c.moveTo(w * 0.62, 34);
  c.lineTo(w * 0.78, 39);
  c.stroke();
  c.fillStyle = COL.blue;
  c.font = `italic 600 7px ${FONT}`;
  c.fillText('I let her', (w * 3) / 4, 56);
  c.fillText('win. Again.', (w * 3) / 4, 64);
  c.fillText('H', (w * 3) / 4, 74);
  c.fillStyle = COL.rose;
  c.fillText('Sure you did', w / 4, 104);
  heartPath(c, w / 4, 109, 8);
  c.fill();
  c.fillStyle = COL.ink;
  c.font = `700 9px ${FONT}`;
  c.fillText('45 : 0', w / 2, h - 9);
}
