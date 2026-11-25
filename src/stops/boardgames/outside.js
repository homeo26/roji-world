import { Kid } from '../../kid.js';
import { THREE, COL, kit, mat, umat, mesh, colorBake, makeAtlas, fitText, heartPath, drawPips, drawCouple, BOXES, makeDie, dieTop, chessPiece, meepleGeo, rigidKid, addGlasses, makeCat, glowTex, roundRect, FONT, rng } from './kit.js';

// The Dice House from the outside: a café built like a stack of game boxes with a big die on the roof,
// a striped awning, a giant chessboard terrace (walk among the pieces), giant dice, outdoor tables with
// games going on, a chalkboard with the game of the day, and lights strung over it all.
// Local coordinates: origin at st.origin (6.2 m behind the pad), front (+Z) toward the pad.

const P = Math.PI;

// Where things stand (local metres). The footprint is x -4.5 .. 8.5, z -5 .. 2.
export const OUT = {
  house: { x: -1.2, z: -3.35, w: 6.2, d: 3.1, h: 2.45 },
  door: { x: -0.4, w: 1.25, h: 2.0 },
  board: { x: 5.6, z: -1.6, tile: 0.62 },
  tableA: { x: -3.05, z: 0.35 },
  tableB: { x: 1.3, z: 0.75 },
  chalk: { x: 2.25, z: -1.05 },
  dice: [{ x: 7.45, z: 1.45 }, { x: 6.35, z: 1.55 }],
  posts: [{ x: -4.3, z: 1.55 }, { x: 2.75, z: 1.45 }, { x: 8.3, z: 1.2 }, { x: 8.3, z: -4.3 }],
};
const FRONT = OUT.house.z + OUT.house.d / 2; // the café's front wall (z)
// The door in local metres, just in front of the wall (the engine's "Go inside" hotspot sits here)
export const DOOR_LOCAL = { x: OUT.door.x, z: FRONT + 0.35 };

// Game of the day: one of the café's four, by the date
const DAILY = ['Snakes and Ladders', 'Four in a Row', 'X O', 'Rock Paper Scissors'];

const LOOKS = {
  girl: { id: 'dice-girl', name: 'Lina', gender: 'girl', skin: '#c98f68', hair: '#2a1a13', hairstyle: 'ponytail', outfit: 'skirt', top: '#ffd166', bottom: '#6fb8ff', shoes: '#ef5b6f', accent: '#ff8fb1' },
  grandpa: { id: 'dice-grandpa', name: 'Grandpa Nabil', gender: 'boy', skin: '#e3b08e', hair: '#e8e2da', hairstyle: 'bald', mustache: '#e8e2da', outfit: 'tee-pants', top: '#8fd6c6', bottom: '#6b5a4a', shoes: '#7a4a26', accent: '#ffd166' },
  little: { id: 'dice-little', name: 'Little player', gender: 'boy', skin: '#f2cdb4', hair: '#7a4a26', hairstyle: 'curly', outfit: 'overalls', top: '#ffffff', bottom: '#ef5b6f', shoes: '#3f7bf0', accent: '#ffd166' },
};

export function buildOutside(st) {
  const K = kit();
  const { box, rbox, cyl, sph, tor, cone, at, rot } = K;
  const g = st.group;
  const dynamic = [];
  const updates = [];
  const add = (...o) => (g.add(...o), o[0]);
  const dyn = (o) => (dynamic.push(o), o);
  const col = (c) => st.addCollider(c);
  const atlas = makeAtlas(1024, 1024, { rough: 0.8 });
  const glowAtlas = makeAtlas(512, 512, { rough: 0.6, glow: 0.22 });
  const H = OUT.house;
  const v = new THREE.Vector3();
  let playerPos = null;
  // The Station hands each frame the player's position to its own update: keep it for the cat and the dice
  const stUpdate = st.update.bind(st);
  st.update = (dt, t, pos) => {
    playerPos = pos;
    stUpdate(dt, t, pos);
  };
  const toLocal = (p) => v.set(p.x - st.origin.x, 0, p.z - st.origin.z);

  // ================================================================ the café: a stack of game boxes
  const X0 = H.x - H.w / 2;
  const X1 = H.x + H.w / 2;
  add(at(rbox(H.w, H.h, H.d, COL.lilac, 0.05), H.x, H.h / 2, H.z));
  add(at(box(H.w + 0.06, 0.22, H.d + 0.06, COL.grape), H.x, 0.11, H.z)); // base band
  // The lid of the bottom box, with the café's name on its front
  const LID = { y0: H.h - 0.1, h: 0.56 };
  add(at(rbox(H.w + 0.3, LID.h, H.d + 0.3, COL.sun, 0.04), H.x, LID.y0 + LID.h / 2, H.z));
  add(at(box(H.w + 0.32, 0.05, H.d + 0.32, COL.white), H.x, LID.y0 + 0.03, H.z));
  const roofY = LID.y0 + LID.h;
  const title = atlas.panel(5.2, 0.44, 640, 54, (c, w, h) => {
    c.fillStyle = COL.sun;
    c.fillRect(0, 0, w, h);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = COL.plum;
    fitText(c, 'THE DICE HOUSE', w / 2, h / 2 + 3, w * 0.62, h * 0.8, 700);
    for (const s of [-1, 1]) {
      c.fillStyle = '#ffffff';
      roundRect(c, w / 2 + s * w * 0.4 - 18, 7, 36, 36, 8);
      c.fill();
      drawPips(c, w / 2 + s * w * 0.4, 25, 36, s < 0 ? 5 : 3, COL.plum);
    }
  });
  add(at(title, H.x, LID.y0 + LID.h / 2 + 0.02, FRONT + 0.155));
  // Worn corners of the box, like an old favourite
  for (const sx of [-1, 1]) add(at(box(0.08, H.h - 0.3, 0.08, COL.lav), H.x + sx * (H.w / 2 - 0.02), H.h / 2 + 0.05, FRONT - 0.02));

  // The second box, a little askew, with round windows and its own lid
  const box2 = new THREE.Group();
  box2.position.set(H.x - 0.25, roofY, H.z - 0.25);
  box2.rotation.y = 0.07;
  add(box2);
  const B2 = { w: 4.3, d: 2.4, h: 1.25 };
  box2.add(at(rbox(B2.w, B2.h, B2.d, COL.mint, 0.05), 0, B2.h / 2, 0));
  box2.add(at(rbox(B2.w + 0.24, 0.42, B2.d + 0.24, COL.pink, 0.04), 0, B2.h - 0.12 + 0.21, 0));
  box2.add(at(box(B2.w + 0.26, 0.04, B2.d + 0.26, COL.white), 0, B2.h - 0.1, 0));
  const lid2 = atlas.panel(3.4, 0.34, 512, 52, (c, w, h) => {
    c.fillStyle = COL.pink;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'GAME NIGHT, EVERY NIGHT', w / 2, h / 2 + 3, w * 0.9, h * 0.72, 700);
  });
  box2.add(at(lid2, 0, B2.h + 0.09, B2.d / 2 + 0.125));
  const portGeo = new THREE.CircleGeometry(0.24, 20);
  const portArt = [0, 1, 2].map((i) => glowAtlas.cell(96, 96, (c, w, h) => paintPorthole(c, w, h, i), portGeo.clone()));
  [-1.3, 0, 1.3].forEach((x, i) => {
    box2.add(at(mesh(portArt[i], glowAtlas.material, { cast: false }), x, 0.52, B2.d / 2 + 0.012));
    box2.add(at(tor(0.25, 0.035, COL.white, P * 2, undefined, 20, 6), x, 0.52, B2.d / 2 + 0.02));
  });
  // The lids' tops are painted like the boards inside: a track of squares round the edge
  const roofArt = (w, d, base, draw) => {
    const p = atlas.panel(w, d, Math.round(w * 60), Math.round(d * 60), (c, cw, ch) => {
      c.fillStyle = base;
      c.fillRect(0, 0, cw, ch);
      draw(c, cw, ch);
    });
    p.rotation.x = -P / 2;
    return p;
  };
  const track = (c, w, h, cols, sq) => {
    let k = 0;
    const cell = (x, y) => {
      c.fillStyle = cols[k++ % cols.length];
      roundRect(c, x + 2, y + 2, sq - 4, sq - 4, 5);
      c.fill();
    };
    for (let x = 6; x <= w - sq - 6; x += sq) cell(x, 6);
    for (let y = 6 + sq; y <= h - sq - 6; y += sq) cell(w - sq - 6, y);
    for (let x = w - sq * 2 - 6; x >= 6; x -= sq) cell(x, h - sq - 6);
    for (let y = h - sq * 2 - 6; y >= 6 + sq; y -= sq) cell(6, y);
  };
  add(at(roofArt(H.w + 0.3, H.d + 0.3, COL.sun, (c, w, h) => {
    track(c, w, h, ['#ffffff', COL.rose, '#ffffff', COL.purple, '#ffffff', COL.teal], 26);
    const r = rng(31);
    for (let i = 0; i < 9; i++) {
      c.save();
      c.translate(50 + r() * (w - 100), 46 + r() * (h - 92));
      c.rotate(r() * 6);
      c.fillStyle = 'rgba(255,255,255,0.9)';
      roundRect(c, -11, -11, 22, 22, 5);
      c.fill();
      drawPips(c, 0, 0, 22, 1 + Math.floor(r() * 6), COL.plum);
      c.restore();
    }
  }), H.x, roofY + 0.003, H.z));
  box2.add(at(roofArt(B2.w + 0.24, B2.d + 0.24, COL.pink, (c, w, h) => {
    track(c, w, h, ['#ffffff', COL.sun, '#ffffff', COL.mint, '#ffffff', COL.lilac], 24);
    c.fillStyle = '#ffffff';
    c.font = `700 15px ${FONT}`;
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillText('START', 40, h - 44);
    c.fillStyle = COL.rose;
    heartPath(c, w - 52, 36, 22);
    c.fill();
  }), 0, B2.h + 0.304, 0));

  // A little rook for a chimney
  const rook = chessPiece(K, 'rook', COL.cream);
  rook.scale.set(0.7, 0.8, 0.7);
  add(at(rook, H.x + 2.35, roofY, H.z - 0.6));
  add(at(cyl(0.16, 0.16, 0.05, COL.ink, 14), H.x + 2.35, roofY + 0.66, H.z - 0.6));

  // The big die on the roof, which rolls over now and then
  const ROOF = { x: H.x - 0.2, y: roofY + B2.h + 0.3 + 0.56, z: H.z - 0.35 };
  const roofDie = add(dyn(makeDie(1.12, { heartOne: true })));
  roofDie.position.set(ROOF.x, ROOF.y, ROOF.z);
  let roofQ = dieTop(1, 0.55);
  roofDie.quaternion.copy(roofQ);
  const roofRoll = { t: 6, k: 1, from: roofQ.clone(), to: roofQ.clone() };
  updates.push((dt) => {
    roofRoll.t -= dt;
    if (roofRoll.k < 1) {
      roofRoll.k = Math.min(1, roofRoll.k + dt * 1.6);
      const e = roofRoll.k < 0.5 ? 2 * roofRoll.k * roofRoll.k : 1 - Math.pow(-2 * roofRoll.k + 2, 2) / 2;
      roofDie.quaternion.slerpQuaternions(roofRoll.from, roofRoll.to, e);
      roofDie.position.y = ROOF.y + Math.sin(roofRoll.k * P) * 0.35;
    } else if (roofRoll.t <= 0) {
      roofRoll.t = 7 + Math.random() * 5;
      roofRoll.k = 0;
      roofRoll.from.copy(roofDie.quaternion);
      const axis = Math.random() < 0.5 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
      roofRoll.to.setFromAxisAngle(axis, (Math.random() < 0.5 ? 1 : -1) * (P / 2)).multiply(roofRoll.from);
    }
  });

  // ---------------------------------------------------------------- the front: door, windows, awning
  const D = OUT.door;
  add(at(rbox(D.w + 0.22, D.h + 0.14, 0.1, COL.white, 0.04), D.x, (D.h + 0.14) / 2, FRONT + 0.02));
  add(at(rbox(D.w, D.h, 0.1, COL.grape, 0.04), D.x, D.h / 2, FRONT + 0.06));
  for (const y of [0.45, 1.05]) add(at(rbox(D.w - 0.3, 0.38, 0.03, COL.purple, 0.03), D.x, y, FRONT + 0.12));
  const doorWin = mesh(glowAtlas.cell(96, 96, (c, w, h) => paintPorthole(c, w, h, 3), new THREE.CircleGeometry(0.22, 20)), glowAtlas.material, { cast: false });
  add(at(doorWin, D.x, 1.6, FRONT + 0.12));
  add(at(tor(0.23, 0.03, COL.sun, P * 2, undefined, 20, 6), D.x, 1.6, FRONT + 0.125));
  add(at(sph(0.05, mat(COL.gold, { rough: 0.3, metal: 0.4 }), undefined, 10), D.x + D.w / 2 - 0.16, 1.0, FRONT + 0.14));
  // Doormat
  const matPanel = atlas.panel(1.1, 0.6, 176, 96, (c, w, h) => {
    c.fillStyle = '#b5773d';
    roundRect(c, 0, 0, w, h, 14);
    c.fill();
    c.strokeStyle = '#8a5528';
    c.lineWidth = 5;
    roundRect(c, 7, 7, w - 14, h - 14, 10);
    c.stroke();
    c.fillStyle = '#fff4e3';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Roll in', w / 2, h / 2 + 2, w * 0.8, 34, 700);
  });
  add(rot(at(matPanel, D.x, 0.045, FRONT + 0.45), -P / 2, 0, 0));

  // Windows with the café glowing inside
  const windowAt = (x, w, h, kind) => {
    const y = 1.32;
    add(at(rbox(w + 0.18, h + 0.18, 0.08, COL.white, 0.04), x, y, FRONT + 0.02));
    add(at(mesh(glowAtlas.cell(Math.round(w * 120), Math.round(h * 120), (c, cw, ch) => paintWindow(c, cw, ch, kind), new THREE.PlaneGeometry(w, h)), glowAtlas.material, { cast: false }), x, y, FRONT + 0.065));
    add(at(box(0.05, h, 0.04, COL.white), x, y, FRONT + 0.075));
    add(at(box(w, 0.05, 0.04, COL.white), x, y + h * 0.18, FRONT + 0.075));
    add(at(rbox(w + 0.3, 0.07, 0.24, COL.white, 0.02), x, y - h / 2 - 0.1, FRONT + 0.1));
    // Flower box
    add(at(rbox(w + 0.1, 0.3, 0.3, COL.woodDark, 0.03), x, y - h / 2 - 0.32, FRONT + 0.17));
    const r = rng(Math.round(x * 10) + 40);
    const n = Math.round(w * 5);
    for (let i = 0; i < n; i++) {
      const fx = x - w / 2 + 0.08 + (i / (n - 1)) * (w - 0.16);
      add(at(sph(0.08, COL.leaf, undefined, 8), fx, y - h / 2 - 0.15, FRONT + 0.17 + (r() - 0.5) * 0.08));
      add(at(sph(0.05, [COL.pink, COL.sun, '#ffffff', COL.rose][i % 4], undefined, 8), fx + 0.02, y - h / 2 - 0.07 + r() * 0.04, FRONT + 0.22));
    }
  };
  windowAt(H.x - 1.65, 1.9, 1.15, 0);
  windowAt(H.x + 2.4, 1.05, 1.15, 1);
  col({ type: 'box', x: H.x, z: H.z, hw: H.w / 2 + 0.05, hd: H.d / 2 + 0.12 });
  col({ type: 'box', x: H.x - 1.65, z: FRONT + 0.18, hw: 1.0, hd: 0.18 });
  col({ type: 'box', x: H.x + 2.4, z: FRONT + 0.18, hw: 0.58, hd: 0.18 });

  // Wall lanterns either side of the door
  const lanternGlass = umat('#fff1c4', { emissive: '#ffc35a', ei: 0.35, rough: 0.3 });
  const lanterns = [];
  for (const dx of [-D.w / 2 - 0.32, D.w / 2 + 0.32]) {
    const lx = D.x + dx;
    add(at(box(0.06, 0.06, 0.18, COL.ink), lx, 1.95, FRONT + 0.09));
    add(at(cyl(0.1, 0.12, 0.05, COL.ink, 10), lx, 2.0, FRONT + 0.2));
    add(at(mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.2, 10), lanternGlass, { cast: false }), lx, 1.87, FRONT + 0.2));
    add(at(cyl(0.11, 0.09, 0.05, COL.ink, 10), lx, 1.75, FRONT + 0.2));
    lanterns.push(new THREE.Vector3(lx, 1.87, FRONT + 0.22));
  }

  // The striped awning, tucked under the lid so the windows stay in view
  const AW = { x0: X0 + 0.15, x1: X1 - 0.15, y0: LID.y0 - 0.06, depth: 0.7, drop: 0.2 };
  const slope = Math.atan2(AW.drop, AW.depth);
  const len = Math.hypot(AW.drop, AW.depth);
  const stripes = 16;
  const sw = (AW.x1 - AW.x0) / stripes;
  for (let i = 0; i < stripes; i++) {
    const s = add(at(box(sw + 0.002, 0.03, len, i % 2 ? COL.cream : COL.purple), AW.x0 + sw * (i + 0.5), AW.y0 - AW.drop / 2, FRONT + AW.depth / 2));
    s.rotation.x = slope;
    s.castShadow = true;
    const sc = mesh(K.geo('scallop' + sw, () => new THREE.CylinderGeometry(sw / 2, sw / 2, 0.025, 10, 1, false, P / 2, P)), mat(i % 2 ? COL.cream : COL.purple), { cast: false });
    sc.rotation.x = -P / 2;
    add(at(sc, AW.x0 + sw * (i + 0.5), AW.y0 - AW.drop + 0.005, FRONT + AW.depth + 0.005));
  }
  add(rot(at(cyl(0.025, 0.025, AW.x1 - AW.x0, COL.grape, 8), (AW.x0 + AW.x1) / 2, AW.y0 - AW.drop, FRONT + AW.depth), 0, 0, P / 2));

  // The right side wall: a painted mural of the café's favourite pieces
  const mural = atlas.panel(2.6, 1.6, 300, 184, (c, w, h) => {
    c.fillStyle = COL.lilac;
    c.fillRect(0, 0, w, h);
    c.fillStyle = COL.sun;
    c.beginPath();
    c.moveTo(70, 160);
    c.lineTo(40, 160);
    c.quadraticCurveTo(46, 110, 60, 100);
    c.quadraticCurveTo(28, 92, 30, 78);
    c.quadraticCurveTo(40, 62, 60, 70);
    c.quadraticCurveTo(52, 40, 80, 36);
    c.quadraticCurveTo(108, 40, 100, 70);
    c.quadraticCurveTo(120, 62, 130, 78);
    c.quadraticCurveTo(132, 92, 100, 100);
    c.quadraticCurveTo(114, 110, 120, 160);
    c.lineTo(90, 160);
    c.lineTo(80, 132);
    c.closePath();
    c.fill();
    for (const [x, y, n, r] of [[190, 70, 5, -0.2], [250, 120, 2, 0.3]]) {
      c.save();
      c.translate(x, y);
      c.rotate(r);
      c.fillStyle = '#ffffff';
      roundRect(c, -32, -32, 64, 64, 12);
      c.fill();
      drawPips(c, 0, 0, 64, n, COL.plum);
      c.restore();
    }
    c.fillStyle = COL.plum;
    c.textAlign = 'center';
    fitText(c, 'Play nicely, laugh loudly', w / 2 + 40, h - 18, w * 0.6, 20, 700);
  });
  add(rot(at(mural, X1 + 0.006, 1.35, H.z), 0, P / 2, 0));

  // ================================================================ the patio
  const patio = { x0: X0 - 0.1, x1: 2.75, z0: FRONT, z1: 1.95 };
  const pw = patio.x1 - patio.x0;
  const pd = patio.z1 - patio.z0;
  const patioTop = atlas.cell(Math.round(pw * 60), Math.round(pd * 60), (c, w, h) => {
    c.fillStyle = '#d8c7ae';
    c.fillRect(0, 0, w, h);
    const r = rng(9);
    const s = 30;
    for (let y = 0; y < h; y += s) for (let x = (y / s) % 2 ? -s / 2 : 0; x < w; x += s) {
      const t = 225 + Math.floor(r() * 22);
      c.fillStyle = `rgb(${t + 12},${t},${t - 22})`;
      roundRect(c, x + 2, y + 2, s - 4, s - 4, 6);
      c.fill();
    }
  }, new THREE.BoxGeometry(pw, 0.03, pd));
  // Only the top face shows the stones; the box's other faces share the same cell, which is fine at 3 cm
  add(at(mesh(patioTop, atlas.material, { cast: false }), (patio.x0 + patio.x1) / 2, 0.015, (patio.z0 + patio.z1) / 2));

  // ---------------------------------------------------------------- outdoor tables with games going on
  const table = (x, z, top) => {
    add(at(cyl(0.48, 0.48, 0.05, top, 26), x, 0.74, z));
    add(at(cyl(0.49, 0.49, 0.03, COL.grape, 26), x, 0.705, z));
    add(at(cyl(0.05, 0.06, 0.68, COL.ink, 10), x, 0.36, z));
    add(at(cyl(0.26, 0.29, 0.04, COL.ink, 16), x, 0.02, z));
    col({ type: 'circle', x, z, r: 0.5, h: 0.77 });
  };
  const stool = (x, z, c) => {
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * P * 2 + 0.4;
      add(rot(at(cyl(0.022, 0.026, 0.42, COL.ink, 6), x + Math.sin(a) * 0.12, 0.21, z + Math.cos(a) * 0.12), Math.cos(a) * 0.15, 0, -Math.sin(a) * 0.15));
    }
    add(at(cyl(0.2, 0.19, 0.06, c, 16), x, 0.44, z));
    col({ type: 'circle', x, z, r: 0.22, h: 0.47 });
  };
  // Table A: a game of chess, a girl and her grandpa deep in thought
  const A = OUT.tableA;
  table(A.x, A.z, COL.cream);
  stool(A.x - 0.75, A.z, COL.sun);
  stool(A.x + 0.75, A.z, COL.mint);
  const miniBoard = atlas.wrap(new THREE.BoxGeometry(0.5, 0.025, 0.5), 128, 128, (c, w, h) => {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      c.fillStyle = (i + j) % 2 ? COL.grape : '#fff4e3';
      c.fillRect((i * w) / 8, (j * h) / 8, w / 8 + 1, h / 8 + 1);
    }
  });
  add(at(miniBoard, A.x, 0.78, A.z)).rotation.y = 0.2;
  const tiny = [[-0.15, -0.1, COL.grape, 'pawn'], [0.05, -0.15, COL.grape, 'king'], [-0.05, 0.12, COL.cream, 'queen'], [0.15, 0.05, COL.cream, 'pawn'], [0.12, -0.04, COL.grape, 'rook']];
  for (const [dx, dz, c, k] of tiny) {
    const pc = chessPiece(K, k, c);
    pc.scale.setScalar(0.11);
    add(at(pc, A.x + dx, 0.795, A.z + dz));
  }
  // Taken pieces by the board
  for (const [dx, dz] of [[-0.32, 0.25], [-0.36, 0.14]]) {
    const pc = chessPiece(K, 'pawn', COL.cream);
    pc.scale.setScalar(0.1);
    add(rot(at(pc, A.x + dx, 0.8, A.z + dz), 0, 0, P / 2));
  }
  add(at(cyl(0.05, 0.04, 0.09, COL.white, 10), A.x + 0.3, 0.81, A.z + 0.22));
  add(at(cyl(0.042, 0.042, 0.01, '#8d5532', 10), A.x + 0.3, 0.85, A.z + 0.22));
  const girl = rigidKid(new Kid(LOOKS.girl), { pose: 'sit', hands: 'hold', bake: false });
  girl.root.position.set(A.x - 0.75, 0.31, A.z);
  girl.root.rotation.y = P / 2;
  add(girl.root);
  const gramps = new Kid(LOOKS.grandpa);
  addGlasses(K, gramps);
  rigidKid(gramps, { pose: 'sit', keep: [gramps.head] });
  gramps.root.scale.setScalar(1.15);
  gramps.root.position.set(A.x + 0.75, 0.29, A.z);
  gramps.root.rotation.y = -P / 2;
  add(dyn(gramps.root));
  updates.push((dt, t) => {
    // Grandpa ponders: a slow tilt, then a little nod when he has a plan
    const k = (t * 0.25) % 1;
    gramps.head.rotation.z = Math.sin(t * 0.7) * 0.12;
    gramps.head.rotation.x = k > 0.86 ? Math.sin(((k - 0.86) / 0.14) * P * 2) * 0.18 : 0.12;
  });

  // Table B: snakes and ladders, two cocoas and a fan of cards, waiting for players
  const B = OUT.tableB;
  table(B.x, B.z, COL.cream);
  stool(B.x - 0.72, B.z + 0.15, COL.rose);
  stool(B.x + 0.25, B.z + 0.72, COL.sky);
  const snakesTop = atlas.wrap(new THREE.BoxGeometry(0.52, 0.02, 0.52), 160, 160, (c, w, h) => paintSnakesBoard(c, w, h));
  add(at(snakesTop, B.x - 0.05, 0.775, B.z - 0.05)).rotation.y = -0.15;
  for (const [dx, dz, cc] of [[0.12, -0.18, COL.rose], [0.18, -0.1, COL.blue]]) add(at(cone(0.025, 0.07, cc, 8), B.x + dx, 0.82, B.z + dz));
  const smallDie = makeDie(0.07);
  smallDie.quaternion.copy(dieTop(6, 0.4));
  add(at(smallDie, B.x + 0.28, 0.805, B.z + 0.1));
  for (const [dx, dz] of [[-0.32, 0.2], [0.3, 0.3]]) {
    add(at(cyl(0.05, 0.04, 0.1, COL.pink, 10), dx + B.x, 0.82, dz + B.z));
    add(at(cyl(0.042, 0.042, 0.01, '#8d5532', 10), dx + B.x, 0.87, dz + B.z));
    add(at(sph(0.02, '#ffffff', undefined, 6), dx + B.x + 0.01, 0.875, dz + B.z));
  }
  ['#e5484d', '#3f7bf0', '#ffcf3f'].forEach((cc, i) => {
    const card = add(at(box(0.09, 0.004, 0.13, COL.white), B.x - 0.3 + i * 0.04, 0.775 + i * 0.002, B.z - 0.28));
    card.rotation.y = -0.4 + i * 0.25;
    add(at(box(0.04, 0.002, 0.04, cc), B.x - 0.3 + i * 0.04, 0.778 + i * 0.002, B.z - 0.28)).rotation.y = -0.4 + i * 0.25;
  });

  // A ginger cat from next door keeps watch by the door (Domino, the café's own cat, stays inside)
  const cat = makeCat(K, { coat: '#f0a35e', belly: '#fff4e3' });
  cat.root.position.set(D.x + 1.25, 0.03, FRONT + 0.75);
  cat.root.rotation.y = 0.3;
  add(dyn(cat.root));
  col({ type: 'circle', x: D.x + 1.25, z: FRONT + 0.72, r: 0.2 });
  updates.push((dt, t) => {
    const near = playerPos && Math.hypot(playerPos.x - st.origin.x - cat.root.position.x, playerPos.z - st.origin.z - cat.root.position.z) < 4;
    cat.update(dt, t, near ? v.set(playerPos.x, 1, playerPos.z) : null);
  });

  // The chalkboard: game of the day
  const C = OUT.chalk;
  const chalk = new THREE.Group();
  chalk.position.set(C.x, 0, C.z);
  chalk.rotation.y = -0.35;
  add(chalk);
  for (const s of [-1, 1]) {
    chalk.add(rot(at(box(0.05, 1.25, 0.05, COL.woodDark), s * 0.38, 0.6, 0.12), -0.18, 0, 0));
    chalk.add(rot(at(box(0.05, 1.25, 0.05, COL.woodDark), s * 0.38, 0.6, -0.12), 0.18, 0, 0));
  }
  chalk.add(rot(at(box(0.82, 0.9, 0.04, COL.woodDark), 0, 0.78, 0.13), -0.18, 0, 0));
  const day = DAILY[Math.floor(Date.now() / 86400000) % DAILY.length];
  const board = atlas.panel(0.72, 0.8, 144, 160, (c, w, h) => {
    c.fillStyle = COL.chalk;
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 30; i++) c.fillRect((i * 37) % w, (i * 53) % h, 12, 2);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#ffd166';
    fitText(c, 'Game of the day', w / 2, 22, w - 16, 17, 700);
    c.fillStyle = '#ffffff';
    const words = day.split(' ');
    const lines = words.length > 2 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : [day];
    lines.forEach((l, i) => fitText(c, l, w / 2, 56 + i * 24 - (lines.length - 1) * 8, w - 20, 22, 700));
    c.strokeStyle = 'rgba(255,255,255,0.85)';
    c.lineWidth = 3;
    roundRect(c, w / 2 - 34, 96, 30, 30, 6);
    c.stroke();
    drawPips(c, w / 2 - 19, 111, 30, 4, '#ffffff');
    c.fillStyle = '#ff9eb5';
    heartPath(c, w / 2 + 22, 98, 26);
    c.fill();
    c.fillStyle = '#ffffff';
    fitText(c, 'Winner picks dessert', w / 2, 145, w - 14, 13, 600);
  });
  chalk.add(rot(at(board, 0, 0.8, 0.156), -0.18, 0, 0));
  col({ type: 'circle', x: C.x, z: C.z, r: 0.4 });

  // The big yellow meeple now stands guard on the roof
  const mp = mesh(K.geo('meeple', () => meepleGeo(0.3)), mat('#ffcf3f', { rough: 0.5 }));
  mp.scale.setScalar(0.6);
  mp.rotation.y = 0.35;
  add(at(mp, X0 + 0.5, roofY, FRONT - 0.32));

  // ================================================================ the giant chessboard
  const BD = OUT.board;
  const N = 8;
  const half = (N * BD.tile) / 2;
  add(at(rbox(N * BD.tile + 0.24, 0.1, N * BD.tile + 0.24, COL.woodDark, 0.03), BD.x, 0.05, BD.z));
  const top = atlas.panel(N * BD.tile, N * BD.tile, 256, 256, (c, w, h) => {
    const s = w / N;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      c.fillStyle = (i + j) % 2 ? '#7c4fe0' : '#fbf1e2';
      c.fillRect(i * s, j * s, s + 1, s + 1);
    }
    // A tiny heart hidden in one corner square
    c.fillStyle = '#ff9eb5';
    heartPath(c, 6 * s + s * 0.78, 1 * s + s * 0.66, s * 0.18);
    c.fill();
  });
  add(rot(at(top, BD.x, 0.102, BD.z), -P / 2, 0, 0));
  col({ type: 'box', x: BD.x, z: BD.z, hw: half + 0.12, hd: half + 0.12, h: 0.1 });
  const T = (i, j) => [BD.x + (i - 3.5) * BD.tile, BD.z + (j - 3.5) * BD.tile];
  // Pieces in the middle of a game (column i, row j; row 7 is the front)
  const PIECES = [
    { kind: 'king', c: COL.grape, i: 4, j: 0, sy: 1.25 },
    { kind: 'pawn', c: COL.grape, i: 1, j: 1, sy: 1.15 },
    { kind: 'pawn', c: COL.grape, i: 5, j: 2, sy: 1.15 },
    { kind: 'knight', c: COL.grape, i: 2, j: 3, sy: 1.15, acc: COL.lilac },
    { kind: 'queen', c: COL.cream, i: 3, j: 5, sy: 1.25, acc: COL.rose, rh: true },
    { kind: 'pawn', c: COL.cream, i: 6, j: 4, sy: 1.15 },
    { kind: 'rook', c: COL.cream, i: 7, j: 6, sy: 1.15 },
    { kind: 'knight', c: COL.cream, i: 0, j: 6, sy: 1.15, acc: COL.pink, yaw: 0.6 },
  ];
  const taken = new Set();
  for (const p of PIECES) {
    const [x, z] = T(p.i, p.j);
    taken.add(p.i + ',' + p.j);
    const pc = chessPiece(K, p.kind, p.c, 1, p.acc);
    pc.scale.set(0.82, p.sy, 0.82);
    pc.rotation.y = p.yaw ?? (p.c === COL.grape ? 0 : P);
    if (p.kind === 'knight') pc.rotation.y = p.c === COL.grape ? -0.4 : p.yaw;
    add(at(pc, x, 0.1, z));
    col({ type: 'circle', x, z, r: 0.31 });
    if (p.rh) {
      // R + H carved into the queen's base, facing the street
      const carve = atlas.wrap(new THREE.CylinderGeometry(0.312 * 0.82, 0.312 * 0.82, 0.16, 12, 1, true, -0.85, 1.7), 180, 56, (c, w, h) => {
        c.fillStyle = COL.cream;
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#a8865c';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        fitText(c, 'R + H', w / 2 - 12, h / 2 + 3, w * 0.62, 44, 700);
        c.fillStyle = COL.rose;
        heartPath(c, w / 2 + 52, h / 2 - 13, 24);
        c.fill();
      });
      add(at(carve, x, 0.1 + 0.17 * p.sy, z));
    }
  }

  // A little player hops from square to square, round the pieces
  const route = [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [5, 6], [6, 6], [6, 5], [5, 5], [4, 4], [3, 4], [3, 3], [2, 2], [3, 1], [2, 0], [1, 0], [0, 1], [0, 2], [1, 3], [1, 4], [0, 5], [1, 6]].filter(([i, j]) => !taken.has(i + ',' + j));
  const hopKid = new Kid(LOOKS.little);
  const hopKid2 = new Kid(LOOKS.little);
  rigidKid(hopKid, { pose: 'stand' });
  rigidKid(hopKid2, { pose: 'stand', air: 0.6 });
  const hopper = new THREE.Group();
  for (const k of [hopKid, hopKid2]) {
    k.root.scale.setScalar(0.66);
    hopper.add(k.root);
  }
  add(dyn(hopper));
  const hopCol = { type: 'circle', x: 0, z: 0, r: 0.2 };
  st.world.addCollider(hopCol);
  const hop = { i: 0, k: 1, wait: 0.6, from: new THREE.Vector3(), to: new THREE.Vector3(), yaw: 0 };
  const sq = (n) => {
    const [x, z] = T(...route[n % route.length]);
    return new THREE.Vector3(x, 0.1, z);
  };
  hop.to.copy(sq(0));
  hopper.position.copy(hop.to);
  updates.push((dt) => {
    if (hop.k < 1) {
      hop.k = Math.min(1, hop.k + dt * 2.4);
      hopper.position.lerpVectors(hop.from, hop.to, hop.k);
      hopper.position.y = 0.1 + Math.sin(hop.k * P) * 0.32;
      if (hop.k >= 1) hop.wait = hop.i % 7 === 0 ? 1.8 : 0.25 + Math.random() * 0.4;
    } else {
      hop.wait -= dt;
      if (hop.wait <= 0) {
        hop.from.copy(hop.to);
        hop.i++;
        hop.to.copy(sq(hop.i));
        hop.k = 0;
        hop.yaw = Math.atan2(hop.to.x - hop.from.x, hop.to.z - hop.from.z);
      }
    }
    hopper.rotation.y += (((hop.yaw - hopper.rotation.y + P * 3) % (P * 2)) - P) * Math.min(1, dt * 10);
    const air = hop.k < 1;
    hopKid.root.visible = !air;
    hopKid2.root.visible = air;
    hopCol.x = st.origin.x + hopper.position.x;
    hopCol.z = st.origin.z + hopper.position.z;
  });

  // ---------------------------------------------------------------- the giant dice (they roll when you come near)
  const dice = OUT.dice.map((p, i) => {
    const d = add(dyn(makeDie(0.82)));
    const q = dieTop(i ? 3 : 5, i * 0.7 + 0.3);
    d.quaternion.copy(q);
    d.position.set(p.x, 0.41, p.z);
    col({ type: 'circle', x: p.x, z: p.z, r: 0.5, h: 0.82 });
    return { d, p, k: 1, from: q.clone(), to: q.clone(), wait: 1 + i * 0.3 };
  });
  const faces = [1, 2, 3, 4, 5, 6];
  updates.push((dt, t, near) => {
    for (const r of dice) {
      if (r.k < 1) {
        r.k = Math.min(1, r.k + dt * 1.25);
        const e = 1 - Math.pow(1 - r.k, 3);
        r.d.quaternion.slerpQuaternions(r.from, r.to, e);
        r.d.rotateY(Math.sin(r.k * P) * 1.2);
        r.d.position.y = 0.41 + Math.abs(Math.sin(r.k * P * 2)) * 0.55 * (1 - r.k);
        continue;
      }
      r.wait -= dt;
      const lp = playerPos ? toLocal(playerPos) : null;
      const dist = lp ? Math.hypot(lp.x - r.p.x, lp.z - r.p.z) : 99;
      if (near > 0.5 && r.wait <= 0 && dist > 1.0 && dist < 7) {
        r.wait = 2.8 + Math.random();
        r.k = 0;
        r.from.copy(r.d.quaternion);
        r.to.copy(dieTop(faces[Math.floor(Math.random() * 6)], Math.random() * P * 2));
      }
    }
  });

  // ================================================================ string lights over the patio and the board
  const posts = OUT.posts;
  for (const p of posts) {
    add(at(cyl(0.05, 0.06, 2.7, COL.woodDark, 8), p.x, 1.35, p.z));
    add(at(sph(0.07, COL.gold, undefined, 8), p.x, 2.73, p.z));
    add(at(cyl(0.16, 0.2, 0.08, COL.stone, 10), p.x, 0.04, p.z));
    col({ type: 'circle', x: p.x, z: p.z, r: 0.12 });
  }
  const strands = [
    [[X0 + 0.1, LID.y0 + 0.02, FRONT + 0.1], [posts[0].x, 2.62, posts[0].z]],
    [[posts[0].x, 2.62, posts[0].z], [posts[1].x, 2.62, posts[1].z]],
    [[X1 - 0.1, LID.y0 + 0.02, FRONT + 0.1], [posts[1].x, 2.62, posts[1].z]],
    [[posts[1].x, 2.62, posts[1].z], [posts[2].x, 2.62, posts[2].z]],
    [[posts[2].x, 2.62, posts[2].z], [posts[3].x, 2.62, posts[3].z]],
    [[posts[3].x, 2.62, posts[3].z], [X1 + 0.05, LID.y0 + 0.3, H.z - 1.2]],
    [[X1 + 0.05, LID.y0 + 0.3, FRONT - 0.3], [posts[2].x, 2.62, posts[2].z]],
  ];
  const bulbs = [];
  const wire = [];
  for (const [a, b] of strands) {
    const A3 = new THREE.Vector3(...a);
    const B3 = new THREE.Vector3(...b);
    const L = A3.distanceTo(B3);
    const n = Math.max(3, Math.round(L / 0.42));
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const p = new THREE.Vector3().lerpVectors(A3, B3, k);
      p.y -= Math.sin(k * P) * Math.min(0.45, L * 0.07);
      if (prev) wire.push(prev, p);
      if (i > 0 && i < n) bulbs.push(p.clone().add(new THREE.Vector3(0, -0.07, 0)));
      prev = p;
    }
  }
  const wireGeo = new THREE.BufferGeometry().setFromPoints(wire);
  add(new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: '#4a3a3a' })));
  const bulbMat = umat('#fff3c8', { emissive: '#ffcf6b', ei: 0.45, rough: 0.4 });
  const bulbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 8, 6), bulbMat, bulbs.length);
  const m4 = new THREE.Matrix4();
  const tints = ['#fff3c8', '#ffd1dc', '#e6dcff', '#d7f5ea', '#fff3c8'].map((c) => new THREE.Color(c));
  bulbs.forEach((p, i) => {
    bulbMesh.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z));
    bulbMesh.setColorAt(i, tints[i % tints.length]);
  });
  bulbMesh.castShadow = false;
  add(bulbMesh);

  // Soft halos round every light after dark (one draw call)
  const glowPts = [...bulbs, ...lanterns];
  const haloGeo = new THREE.BufferGeometry().setFromPoints(glowPts);
  const haloMat = new THREE.PointsMaterial({ map: glowTex(), color: '#ffd89a', size: 0.55, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const halos = add(dyn(new THREE.Points(haloGeo, haloMat)));
  halos.frustumCulled = false;
  const nightK = () => Math.max(0, Math.min(1, (bulbMat.emissiveIntensity / 0.45 - 1) / 1.6));
  updates.push((dt, t) => {
    const k = nightK();
    haloMat.opacity = k * (0.62 + Math.sin(t * 2.3) * 0.06);
    haloMat.size = 0.5 + k * 0.25;
  });

  // Plain-coloured statics become a few vertex-coloured meshes; the Station merges the rest by material
  colorBake(g, dynamic);
  return {
    badgeY: 7.2,
    dynamic,
    update(dt, t, near) {
      for (const fn of updates) fn(dt, t, near);
    },
  };
}

// ------------------------------------------------------------------ painted windows
// A window into the café: warm light, shelves of game boxes and two people at a table.
function paintWindow(c, w, h, kind) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#ffe9b8');
  g.addColorStop(1, '#ffc98a');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  // Shelves full of boxes
  const r = rng(kind * 13 + 5);
  c.fillStyle = '#b07a4a';
  for (const y of [0.3, 0.55]) c.fillRect(0, h * y, w, 4);
  for (const y of [0.3, 0.55]) {
    let x = 4;
    while (x < w - 10) {
      const bw = 8 + r() * 10;
      const bh = h * (0.12 + r() * 0.09);
      c.fillStyle = BOXES[Math.floor(r() * BOXES.length)].c;
      c.fillRect(x, h * y - bh, bw, bh);
      x += bw + 2;
    }
  }
  // A hanging lamp
  c.fillStyle = '#8b5cf6';
  c.beginPath();
  c.arc(w * 0.5, h * 0.12, w * 0.08, P, 0);
  c.fill();
  c.fillStyle = 'rgba(255,255,220,0.8)';
  c.beginPath();
  c.arc(w * 0.5, h * 0.13, w * 0.04, 0, P * 2);
  c.fill();
  // A table with players
  c.fillStyle = '#8a5a3c';
  c.fillRect(w * 0.2, h * 0.82, w * 0.6, 6);
  if (kind === 0) {
    drawCouple(c, w * 0.5, h * 1.02, h * 0.42, { heart: false, hold: false, rojiLook: { top: '#6d3fd6', hair: '#4a2c1a' }, homamaLook: { top: '#2fb39a', hair: '#7a4a26', bottom: '#2fb39a' } });
  } else {
    c.fillStyle = '#ef5b6f';
    c.beginPath();
    c.arc(w * 0.5, h * 0.72, w * 0.12, 0, P * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    roundRect(c, w * 0.42, h * 0.62, w * 0.16, w * 0.16, 4);
    c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,0.18)';
  c.beginPath();
  c.moveTo(0, h * 0.4);
  c.lineTo(w * 0.35, 0);
  c.lineTo(w * 0.55, 0);
  c.lineTo(0, h * 0.65);
  c.fill();
}

function paintPorthole(c, w, h, i) {
  const g = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
  g.addColorStop(0, '#fff2c8');
  g.addColorStop(1, '#ffc27a');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.fillStyle = ['#8b5cf6', '#ef5b6f', '#2fb39a', '#f6a04d'][i % 4];
  if (i === 0) {
    roundRect(c, w * 0.3, h * 0.3, w * 0.4, h * 0.4, 8);
    c.fill();
    drawPips(c, w / 2, h / 2, w * 0.4, 3, '#ffffff');
  } else if (i === 1) {
    heartPath(c, w / 2, h * 0.28, w * 0.45);
    c.fill();
  } else if (i === 2) {
    c.beginPath();
    c.arc(w / 2, h * 0.4, w * 0.12, 0, P * 2);
    c.fill();
    c.fillRect(w * 0.38, h * 0.5, w * 0.24, h * 0.22);
  } else {
    c.fillStyle = 'rgba(160,96,46,0.5)';
    c.fillRect(0, h * 0.62, w, 4);
    c.fillStyle = '#8b5cf6';
    c.fillRect(w * 0.2, h * 0.42, w * 0.14, h * 0.2);
    c.fillStyle = '#ffd166';
    c.fillRect(w * 0.38, h * 0.36, w * 0.12, h * 0.26);
    c.fillStyle = '#ef5b6f';
    c.fillRect(w * 0.54, h * 0.46, w * 0.16, h * 0.16);
  }
}

// A small snakes and ladders board
export function paintSnakesBoard(c, w, h) {
  const n = 10;
  const s = w / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    c.fillStyle = (i + j) % 2 ? '#fff4e3' : ['#ffd166', '#7fd8bf', '#ff9eb5', '#8fd3ff'][(i * 3 + j) % 4];
    c.fillRect(i * s, j * s, s + 1, s + 1);
  }
  c.strokeStyle = '#a0602e';
  c.lineWidth = w * 0.02;
  for (const [x0, y0, x1, y1] of [[0.15, 0.85, 0.35, 0.45], [0.65, 0.75, 0.85, 0.25], [0.25, 0.35, 0.45, 0.05]]) {
    for (const o of [-0.03, 0.03]) {
      c.beginPath();
      c.moveTo((x0 + o) * w, y0 * h);
      c.lineTo((x1 + o) * w, y1 * h);
      c.stroke();
    }
    for (let k = 0.15; k < 1; k += 0.2) {
      c.beginPath();
      c.moveTo((x0 - 0.03 + (x1 - x0) * k) * w, (y0 + (y1 - y0) * k) * h);
      c.lineTo((x0 + 0.03 + (x1 - x0) * k) * w, (y0 + (y1 - y0) * k) * h);
      c.stroke();
    }
  }
  c.lineWidth = w * 0.035;
  c.lineCap = 'round';
  for (const [col, pts] of [['#3fbf7f', [0.55, 0.15, 0.75, 0.3, 0.45, 0.45, 0.6, 0.6]], ['#e5484d', [0.2, 0.55, 0.05, 0.7, 0.35, 0.8, 0.2, 0.95]]]) {
    c.strokeStyle = col;
    c.beginPath();
    c.moveTo(pts[0] * w, pts[1] * h);
    c.bezierCurveTo(pts[2] * w, pts[3] * h, pts[4] * w, pts[5] * h, pts[6] * w, pts[7] * h);
    c.stroke();
    c.fillStyle = col;
    c.beginPath();
    c.arc(pts[0] * w, pts[1] * h, w * 0.035, 0, P * 2);
    c.fill();
  }
}


