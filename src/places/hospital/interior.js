import * as THREE from 'three';
import { canvasTexture, roundRect, FONT } from '../../util.js';
import { kit, C, emblem, drawBoard, makeTool, bouquet, heartMug, plant, chair, hospitalBed, skyTexture, windowMesh, sparkleTexture, colorBake } from './models.js';
import { WARD, VISITORS, STAFF, SYMPTOMS } from './roster.js';
import { makePerson, freeze } from './people.js';

// Inside Sunny Hill Hospital, open at the front like a dollhouse:
// Dr. Roji's office | reception and waiting room | three patient rooms, with a corridor along the front.

const X0 = -15;
const X1 = 15;
const Z0 = -5;
const Z1 = 5;
const WALL_H = 3.4;
const OFFICE = -9; // office | reception
const WARD_X = 3; // reception | patient rooms
const ROOMS = [5, 9, 13]; // centres of the patient rooms

// Sweet notes from Homama, one each time Roji comes to work.
export const NOTES = [
  'Good morning, Dr. Roji. Your patients are lucky to have you. So am I.',
  'You studied so hard for this. I am proud of you every single day.',
  'Drink your coffee while it is warm. You have got this, Doctor!',
  'Every patient you help makes the world a little kinder. Go, Dr. Roji!',
  'Long shift today? Your favourite snack is waiting at home.',
  'From late study nights to that white coat. Look at you, Doctor.',
];
const HOMAMA_LINES = [
  'Homama visits Sunny Hill. He is so proud of Dr. Roji.',
  'Homama spots the balloon he left for Roji and smiles. His Roji is a real doctor.',
  'Homama: "My Roji helps people feel better every day. I am her biggest fan."',
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function pattern(w, h, base, draw, rx = 1, ry = 1) {
  const t = canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    draw(ctx, w, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}

// Homama's handwritten note in a frame on the desk.
function drawNote(ctx, w, h) {
  ctx.fillStyle = '#fffdf5';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#cfe3f5';
  ctx.lineWidth = 2;
  for (let y = 70; y < h - 20; y += 34) {
    ctx.beginPath();
    ctx.moveTo(18, y);
    ctx.lineTo(w - 18, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#3f5fbf';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const lines = ['Dear Dr. Roji,', 'You have got this.', 'I am so proud', 'of you.', '        Love, Homama'];
  lines.forEach((l, i) => {
    ctx.save();
    ctx.translate(26, 62 + i * 34);
    ctx.rotate(-0.03 + (i % 2) * 0.02);
    ctx.font = `500 ${i === 0 ? 30 : 27}px ${FONT}`;
    ctx.fillText(l, 0, 0);
    ctx.restore();
  });
  ctx.fillStyle = '#ef5b6f';
  ctx.save();
  ctx.translate(w - 50, 52);
  ctx.scale(1.3, 1.3);
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.bezierCurveTo(-16, 0, -10, -12, 0, -4);
  ctx.bezierCurveTo(10, -12, 16, 0, 0, 12);
  ctx.fill();
  ctx.restore();
}

function drawDiploma(ctx, w, h) {
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#e7c46a';
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, w - 28, h - 28);
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, w - 56, h - 56);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#8a6a3a';
  ctx.font = `600 ${h * 0.075}px ${FONT}`;
  ctx.fillText('SUNNY HILL MEDICAL SCHOOL', w / 2, h * 0.2);
  ctx.fillStyle = C.ink;
  ctx.font = `600 ${h * 0.12}px ${FONT}`;
  ctx.fillText('Doctor of Medicine', w / 2, h * 0.4);
  ctx.fillStyle = '#ef5b6f';
  ctx.font = `700 ${h * 0.2}px ${FONT}`;
  ctx.fillText('Roji', w / 2, h * 0.62);
  ctx.fillStyle = '#f4c24f';
  ctx.beginPath();
  ctx.arc(w * 0.82, h * 0.8, h * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ef5b6f';
  ctx.fillRect(w * 0.8, h * 0.86, w * 0.015, h * 0.1);
  ctx.fillRect(w * 0.83, h * 0.86, w * 0.015, h * 0.1);
}

// A crayon-style photo of Roji and Homama.
function drawPhoto(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#bfe9ff');
  g.addColorStop(1, '#fff1d6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#9ad06a';
  ctx.fillRect(0, h * 0.78, w, h * 0.22);
  const kidAt = (x, hair, shirt, bunches) => {
    ctx.fillStyle = shirt;
    roundRect(ctx, x - 26, h * 0.55, 52, h * 0.3, 14);
    ctx.fill();
    ctx.fillStyle = '#f8dccb';
    ctx.beginPath();
    ctx.arc(x, h * 0.42, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(x, h * 0.38, 31, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    if (bunches) {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x + s * 32, h * 0.46, 11, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#1d130f';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + s * 10, h * 0.43, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#b23a48';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, h * 0.47, 8, 0.2, Math.PI - 0.2);
    ctx.stroke();
  };
  kidAt(w * 0.33, '#2a1a13', '#ef5b6f', true);
  kidAt(w * 0.67, '#141010', '#3f7bf0', false);
  ctx.fillStyle = '#ff6b8a';
  ctx.save();
  ctx.translate(w / 2, h * 0.2);
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.bezierCurveTo(-18, 0, -10, -14, 0, -5);
  ctx.bezierCurveTo(10, -14, 18, 0, 0, 12);
  ctx.fill();
  ctx.restore();
}

function drawScreen(ctx, w, h) {
  ctx.fillStyle = '#eaf8f3';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = C.mintDeep;
  ctx.fillRect(0, 0, w, h * 0.2);
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 ${h * 0.12}px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText("Today's patients", 14, h * 0.1);
  ctx.fillStyle = C.ink;
  ctx.font = `500 ${h * 0.1}px ${FONT}`;
  WARD.forEach((p, i) => {
    ctx.fillStyle = ['#ffb3c7', '#9fe0c8', '#ffe08a'][i];
    roundRect(ctx, 14, h * (0.28 + i * 0.16), w * 0.5, h * 0.12, 8);
    ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.fillText(p.name, 22, h * (0.34 + i * 0.16));
  });
  ctx.strokeStyle = '#ef5b6f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  const y = h * 0.82;
  ctx.moveTo(14, y);
  for (const [x, dy] of [[0.25, 0], [0.32, -0.16], [0.38, 0.1], [0.44, 0], [0.7, 0], [0.76, -0.16], [0.82, 0.1], [0.88, 0], [0.98, 0]]) ctx.lineTo(w * x, y + dy * h);
  ctx.stroke();
}

// Heartbeat line that scrolls on the bedside monitors.
function beatTexture() {
  const t = canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#20343a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(127,216,191,0.25)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.strokeStyle = '#7fffd0';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const y = h * 0.58;
    ctx.moveTo(0, y);
    for (const [x, dy] of [[0.3, 0], [0.36, -0.1], [0.4, 0], [0.46, 0.12], [0.52, -0.42], [0.58, 0.22], [0.63, 0], [0.7, -0.08], [0.76, 0], [1, 0]]) ctx.lineTo(w * x, y + dy * h);
    ctx.stroke();
    ctx.fillStyle = '#ff8fb1';
    ctx.beginPath();
    ctx.arc(w * 0.88, h * 0.22, 9, 0, Math.PI * 2);
    ctx.fill();
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

export function buildInterior(ctx) {
  const { THREE: T, makeKid, api: hostApi } = ctx;
  const k = kit();
  const { box, rbox, cyl, sph, at } = k;
  const root = new T.Group();
  const dynamic = [];
  const colliders = [];
  const hotspots = [];
  const add = (...o) => (root.add(...o), o[0]);
  const wall = (c) => colliders.push(c);

  // ---------------------------------------------------------------- shell
  const base = box(X1 - X0 + 0.8, 0.6, Z1 - Z0 + 0.6, '#e9c9a6');
  add(at(base, 0, -0.31, 0.1));
  const wood = pattern(256, 256, '#e6bd8e', (c, w, h) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? '#deb282' : '#ecc79b';
      c.fillRect(0, (i * h) / 8, w, h / 8 - 3);
      c.fillStyle = 'rgba(150,100,60,0.2)';
      c.fillRect((i * 97) % w, (i * h) / 8, 3, h / 8);
    }
  }, 3, 5);
  const tiles = pattern(256, 256, '#fff7ec', (c, w) => {
    c.fillStyle = '#ffe9cf';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) c.fillRect((i * w) / 4, (j * w) / 4, w / 4, w / 4);
    c.fillStyle = '#ffd6dc';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      c.beginPath();
      c.arc((i * w) / 4, (j * w) / 4, 7, 0, Math.PI * 2);
      c.fill();
    }
  }, 6, 5);
  const ward = pattern(256, 256, '#f2fbf7', (c, w) => {
    c.fillStyle = '#d3f1e5';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) c.fillRect((i * w) / 4, (j * w) / 4, w / 4, w / 4);
  }, 6, 5);
  const floor = (x0, x1, tex) => {
    const f = new T.Mesh(new T.BoxGeometry(x1 - x0, 0.1, Z1 - Z0), new T.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
    f.receiveShadow = true;
    add(at(f, (x0 + x1) / 2, -0.05, 0));
  };
  floor(X0, OFFICE, wood);
  floor(OFFICE, WARD_X, tiles);
  floor(WARD_X, X1, ward);

  const paper = (base_, draw) => pattern(128, 128, base_, draw);
  const dots = (col, r = 5) => (c, w) => {
    c.fillStyle = col;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      c.beginPath();
      c.arc((i + 0.5 + (j % 2) * 0.5) * (w / 4), (j + 0.5) * (w / 4), r, 0, Math.PI * 2);
      c.fill();
    }
  };
  const pluses = (col) => (c, w) => {
    c.fillStyle = col;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const x = (i + 0.5 + (j % 2) * 0.5) * (w / 3);
      const y = (j + 0.5) * (w / 3);
      c.fillRect(x - 9, y - 3, 18, 6);
      c.fillRect(x - 3, y - 9, 6, 18);
    }
  };
  const backWall = (x0, x1, tex, rx) => {
    tex.repeat.set(rx, 3);
    const m = new T.Mesh(new T.BoxGeometry(x1 - x0, WALL_H, 0.2), new T.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    m.receiveShadow = true;
    add(at(m, (x0 + x1) / 2, WALL_H / 2, Z0 - 0.1));
    add(at(box(x1 - x0, 0.18, 0.06, C.white), (x0 + x1) / 2, 0.09, Z0 + 0.03));
    add(at(box(x1 - x0, 0.08, 0.05, C.white), (x0 + x1) / 2, 1.05, Z0 + 0.025));
  };
  backWall(X0, OFFICE, paper('#ffe6ec', dots('#ffd0da')), 3);
  backWall(OFFICE, WARD_X, paper('#fff1d6', dots('#ffe2a8', 6)), 6);
  backWall(WARD_X, X1, paper('#e3f6ef', pluses('#c6ecdd')), 6);
  wall({ type: 'box', x: 0, z: Z0 - 0.05, hw: (X1 - X0) / 2, hd: 0.15 });
  const cornice = box(X1 - X0 + 0.4, 0.22, 0.34, C.coral);
  add(at(cornice, 0, WALL_H + 0.11, Z0 - 0.08));
  for (const x of [X0, X1]) {
    add(at(box(0.24, WALL_H, Z1 - Z0 + 0.2, '#fbe9d8'), x + Math.sign(x) * 0.02, WALL_H / 2, -0.1));
    add(at(box(0.34, 0.22, Z1 - Z0 + 0.4, C.coral), x + Math.sign(x) * 0.02, WALL_H + 0.11, -0.1));
    wall({ type: 'box', x, z: 0, hw: 0.15, hd: (Z1 - Z0) / 2 });
  }
  // Partitions: from the back wall to the corridor, with a rounded end
  const partition = (x, zEnd, color = '#fbe9d8') => {
    const len = zEnd - Z0;
    add(at(box(0.2, 2.8, len, color), x, 1.4, Z0 + len / 2));
    const capEnd = cyl(0.13, 0.13, 2.8, C.white, 14);
    add(at(capEnd, x, 1.4, zEnd));
    const top = box(0.28, 0.1, len + 0.1, C.coral);
    add(at(top, x, 2.85, Z0 + len / 2));
    wall({ type: 'box', x, z: Z0 + len / 2, hw: 0.13, hd: len / 2 + 0.1 });
  };
  partition(OFFICE, 1.0);
  for (const x of [WARD_X, 7, 11]) partition(x, 0.4);
  // Front lip keeps everyone in the dollhouse
  add(at(box(X1 - X0, 0.14, 0.14, C.white), 0, 0.07, Z1 - 0.04));
  wall({ type: 'box', x: 0, z: Z1 + 0.12, hw: (X1 - X0) / 2, hd: 0.15 });

  const skyMat = new T.MeshBasicMaterial({ map: skyTexture() });
  const win = (x, y, opts) => add(at(windowMesh(k, skyMat, opts), x, y, Z0 + 0.06));
  const board = (lines, w, h, x, y, z, opts = {}) => {
    const p = k.panel(w, h, 512, (c, cw, ch) => drawBoard(c, cw, ch, { lines, ...opts }));
    const back = rbox(w + 0.1, h + 0.1, 0.06, opts.edge || C.mintDeep, 0.04);
    add(at(back, x, y, z));
    add(at(p, x, y, z + 0.035));
    return p;
  };

  // ---------------------------------------------------------------- Dr. Roji's office
  const OX = -12;
  board(["Dr. Roji's", 'Office'], 1.9, 0.6, OX, 3.0, Z0 + 0.06, { edge: C.rose, small: C.rose, sizes: [0.3, 0.42] });
  const rugA = rbox(3.2, 0.03, 2.6, '#ffd1dc', 0.02);
  add(at(rugA, OX, 0.015, -2.6));
  const rugB = rbox(2.8, 0.04, 2.2, '#fff3f6', 0.02);
  add(at(rugB, OX, 0.02, -2.6));
  // Desk
  const DZ = -3.05;
  add(at(rbox(2.3, 0.08, 0.95, C.wood, 0.03), OX, 0.76, DZ));
  for (const x of [OX - 0.82, OX + 0.82]) {
    add(at(rbox(0.56, 0.72, 0.86, C.white, 0.04), x, 0.36, DZ));
    for (const y of [0.2, 0.46]) add(at(sph(0.03, C.sun, { metal: 0.4, rough: 0.3 }, 8), x, y, DZ + 0.45));
  }
  add(at(rbox(1.1, 0.5, 0.05, C.mint, 0.02), OX, 0.47, DZ + 0.36));
  const deskHeart = emblem(k, 0.32, { badge: false, heartColor: C.rose });
  add(at(deskHeart, OX, 0.5, DZ + 0.4));
  // Name plate facing the camera
  const plateBack = rbox(0.86, 0.22, 0.07, C.woodDark, 0.03);
  plateBack.rotation.x = -0.35;
  add(at(plateBack, OX + 0.15, 0.9, DZ + 0.36));
  const plate = k.panel(0.8, 0.17, 512, (c, w, h) => {
    c.fillStyle = '#fff6e6';
    roundRect(c, 4, 4, w - 8, h - 8, 18);
    c.fill();
    c.fillStyle = C.ink;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 ${h * 0.62}px ${FONT}`;
    c.fillText('Dr. Roji', w / 2, h / 2 + 3);
  });
  plate.rotation.x = -0.35;
  add(at(plate, OX + 0.15, 0.9, DZ + 0.4));
  // Computer, angled toward Roji's chair
  const monitor = new T.Group();
  monitor.add(at(cyl(0.12, 0.14, 0.03, C.ink, 14), 0, 0.015, 0));
  monitor.add(at(box(0.05, 0.28, 0.05, C.ink), 0, 0.16, 0));
  monitor.add(at(rbox(0.78, 0.5, 0.05, C.ink, 0.03), 0, 0.5, 0));
  const scr = k.panel(0.7, 0.42, 256, drawScreen, { glow: 0.35 });
  monitor.add(at(scr, 0, 0.5, 0.03));
  monitor.rotation.y = 0.55;
  add(at(monitor, OX - 0.8, 0.8, DZ - 0.15));
  add(at(rbox(0.56, 0.03, 0.18, C.white, 0.012), OX - 0.1, 0.815, DZ - 0.2));
  add(at(rbox(0.08, 0.03, 0.12, C.white, 0.015), OX + 0.3, 0.815, DZ - 0.2));
  // Stethoscope, files, pen cup
  const steth = makeTool(k, 'stethoscope');
  steth.scale.setScalar(1.7);
  steth.rotation.y = 0.4;
  add(at(steth, OX + 0.32, 0.8, DZ + 0.12));
  for (let i = 0; i < 3; i++) {
    const f = rbox(0.34, 0.03, 0.26, ['#9fe0c8', '#ffd166', '#c7a6ff'][i], 0.01);
    f.rotation.y = (i - 1) * 0.12;
    add(at(f, OX - 0.62, 0.815 + i * 0.03, DZ + 0.25));
  }
  add(at(cyl(0.05, 0.045, 0.12, C.sky, 12), OX - 0.25, 0.86, DZ + 0.3));
  for (const [dx, c] of [[-0.015, C.rose], [0.02, C.mintDeep]]) {
    const pen = cyl(0.008, 0.008, 0.16, c, 6);
    pen.rotation.z = dx * 8;
    add(at(pen, OX - 0.25 + dx, 0.93, DZ + 0.3));
  }
  // Homama's coffee with a heart
  const mug = heartMug(k, { color: '#ffffff', heart: C.rose });
  mug.scale.setScalar(1.5);
  add(at(mug, OX - 0.45, 0.8, DZ + 0.02));
  // Homama's flowers and framed note
  const flowers = bouquet(k, { scale: 1.7, vase: '#dcf1ff', blooms: [C.rose, '#ffffff', C.pink, '#ff7fa3', '#ffe08a'], count: 9 });
  add(at(flowers, OX + 0.88, 0.8, DZ - 0.12));
  const noteFrame = new T.Group();
  noteFrame.add(rbox(0.44, 0.36, 0.04, C.pink, 0.02));
  const notePanel = k.panel(0.36, 0.28, 256, drawNote);
  noteFrame.add(at(notePanel, 0, 0, 0.022));
  const stand = box(0.04, 0.28, 0.02, C.pink);
  stand.rotation.x = 0.45;
  noteFrame.add(at(stand, 0, -0.06, -0.08));
  noteFrame.rotation.set(-0.22, -0.18, 0);
  add(at(noteFrame, OX + 0.42, 0.97, DZ + 0.05));
  const tag = rbox(0.12, 0.08, 0.01, C.white, 0.01);
  add(at(tag, OX + 0.98, 1.0, DZ + 0.08));
  // Roji's chair
  const rc = new T.Group();
  rc.add(at(cyl(0.29, 0.29, 0.1, C.pink, 18), 0, 0.46, 0));
  const rcb = rbox(0.56, 0.62, 0.1, C.pink, 0.05);
  rcb.rotation.x = -0.12;
  rc.add(at(rcb, 0, 0.86, -0.27));
  rc.add(at(cyl(0.04, 0.04, 0.32, C.steel, 8), 0, 0.27, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = box(0.32, 0.04, 0.06, C.ink);
    leg.rotation.y = -a;
    rc.add(at(leg, Math.cos(a) * 0.15, 0.08, Math.sin(a) * 0.15));
    rc.add(at(sph(0.045, C.ink, undefined, 8), Math.cos(a) * 0.28, 0.045, Math.sin(a) * 0.28));
  }
  add(at(rc, OX, 0, -3.95));
  wall({ type: 'circle', x: OX, z: -3.95, r: 0.32, h: 0.5 });
  wall({ type: 'box', x: OX, z: DZ, hw: 1.15, hd: 0.48, h: 0.8 });
  // Wall: diploma, a photo of the two of them, a window
  const dip = new T.Group();
  dip.add(rbox(1.12, 0.84, 0.06, '#c99a5a', 0.03));
  dip.add(at(k.panel(0.98, 0.7, 512, drawDiploma), 0, 0, 0.035));
  add(at(dip, OX, 2.05, Z0 + 0.06));
  const photo = new T.Group();
  photo.add(rbox(0.7, 0.56, 0.06, C.sun, 0.04));
  photo.add(at(k.panel(0.58, 0.44, 256, drawPhoto), 0, 0, 0.035));
  photo.rotation.z = 0.05;
  add(at(photo, OX - 1.55, 1.95, Z0 + 0.06));
  win(-10.05, 1.95, { w: 1.0, h: 1.0, curtain: '#ffb3c7' });
  // Bookshelf on the side wall
  const shelf = new T.Group();
  shelf.add(at(rbox(0.42, 2.2, 1.5, C.wood, 0.03), 0, 1.1, 0));
  for (const y of [0.45, 0.98, 1.5]) shelf.add(at(box(0.36, 0.04, 1.38, C.woodDark), 0.04, y, 0));
  const bookColors = [C.rose, C.mint, C.sun, C.lilac, C.sky, '#f08a5d'];
  [0.47, 1.0, 1.52].forEach((y, row) => {
    let z = -0.62;
    for (let i = 0; z < 0.6; i++) {
      const hgt = 0.3 + ((i * 7 + row * 3) % 5) * 0.03;
      const thick = 0.07 + ((i + row) % 3) * 0.015;
      const b = rbox(0.26, hgt, thick, bookColors[(i + row * 2) % bookColors.length], 0.01);
      if (i % 5 === 4) b.rotation.x = 0.12;
      shelf.add(at(b, 0.06, y + 0.02 + hgt / 2, z + thick / 2));
      z += thick + 0.012;
    }
  });
  const heartModel = k.heart(0.26, 0.1, C.rose, { rough: 0.4 });
  shelf.add(at(heartModel, 0.08, 2.32, 0.2));
  shelf.add(at(plant(k, { scale: 0.45, pot: C.mint }), 0.04, 2.2, -0.4));
  add(at(shelf, X0 + 0.38, 0, -3.7));
  wall({ type: 'box', x: X0 + 0.38, z: -3.7, hw: 0.24, hd: 0.76 });
  add(at(plant(k, { scale: 1.1 }), X0 + 0.55, 0, -1.9));
  wall({ type: 'circle', x: X0 + 0.55, z: -1.9, r: 0.3 });
  // Armchair for visitors (Homama's spot)
  const arm = new T.Group();
  arm.add(at(rbox(0.86, 0.36, 0.8, C.lilac, 0.1), 0, 0.22, 0));
  arm.add(at(rbox(0.74, 0.14, 0.66, '#e0d0ff', 0.06), 0, 0.44, 0.04));
  arm.add(at(rbox(0.86, 0.72, 0.2, C.lilac, 0.09), 0, 0.62, -0.32));
  for (const s of [-1, 1]) arm.add(at(rbox(0.16, 0.5, 0.78, C.lilac, 0.07), s * 0.4, 0.42, 0));
  const pillowH = k.heart(0.3, 0.08, C.rose);
  arm.add(at(pillowH, 0.0, 0.74, -0.18));
  arm.rotation.y = 1.05;
  add(at(arm, -14.0, 0, -0.55));
  wall({ type: 'circle', x: -14.0, z: -0.55, r: 0.5, h: 0.5 });
  // Roji's white coat on a stand
  const coat = new T.Group();
  coat.add(at(cyl(0.22, 0.25, 0.05, C.woodDark, 14), 0, 0.025, 0));
  coat.add(at(cyl(0.03, 0.03, 1.75, C.woodDark, 8), 0, 0.9, 0));
  const coatBody = k.geo('coatBody', () => new T.LatheGeometry([[0, 0.72], [0.3, 0.72], [0.31, 0.8], [0.25, 1.2], [0.19, 1.45], [0.1, 1.55], [0, 1.56]].map(([x, y]) => new T.Vector2(x, y)), 18));
  const coatMesh = new T.Mesh(coatBody, ctx.util.mat('#ffffff', { rough: 0.7 }));
  coatMesh.castShadow = true;
  coat.add(coatMesh);
  for (const s of [-1, 1]) {
    const sleeve = k.cap(0.07, 0.42, '#ffffff');
    sleeve.rotation.z = s * 0.18;
    coat.add(at(sleeve, s * 0.26, 1.2, 0));
  }
  coat.add(at(box(0.14, 0.1, 0.02, C.sky), 0.12, 1.25, 0.25));
  coat.add(at(cyl(0.008, 0.008, 0.12, C.rose, 6), 0.1, 1.31, 0.26));
  const nameTag = k.panel(0.16, 0.07, 128, (c, w, h) => {
    c.fillStyle = C.rose;
    roundRect(c, 2, 2, w - 4, h - 4, 10);
    c.fill();
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 ${h * 0.6}px ${FONT}`;
    c.fillText('Roji', w / 2, h / 2 + 2);
  });
  coat.add(at(nameTag, -0.11, 1.3, 0.25));
  coat.rotation.y = 0.5;
  add(at(coat, -14.35, 0, 1.0));
  wall({ type: 'circle', x: -14.35, z: 1.0, r: 0.3 });

  // "Go Dr. Roji!" balloon from Homama, tied to the desk
  const balloon = new T.Group();
  const strLen = 1.1;
  const string = cyl(0.006, 0.006, strLen, '#ffffff', 4);
  balloon.add(at(string, 0, strLen / 2, 0));
  const foil = k.heart(0.85, 0.16, ctx.util.umat('#ff6b8a', { rough: 0.25, metal: 0.15 }));
  const foilHolder = new T.Group();
  foilHolder.add(foil);
  const words = k.panel(0.72, 0.36, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.font = `700 ${h * 0.34}px ${FONT}`;
    c.strokeStyle = '#d6335a';
    c.lineWidth = 14;
    c.fillStyle = '#ffffff';
    for (const [txt, y] of [['Go', 0.28], ['Dr. Roji!', 0.7]]) {
      c.strokeText(txt, w / 2, h * y);
      c.fillText(txt, w / 2, h * y);
    }
  }, { transparent: true });
  foilHolder.add(at(words, 0, 0.06, 0.17));
  foilHolder.position.y = strLen + 0.36;
  balloon.add(foilHolder);
  add(at(balloon, OX + 1.05, 0.8, DZ - 0.3));
  dynamic.push(balloon);
  const bal = { ax: 0, az: 0, vx: 0, vz: 0 };

  // Coffee steam and sparkles around the flowers
  const glow = canvasTexture(64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  });
  const steam = [];
  for (let i = 0; i < 3; i++) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, opacity: 0 }));
    add(s);
    steam.push(s);
    dynamic.push(s);
  }
  const sparkTex = sparkleTexture();
  const sparks = [];
  for (let i = 0; i < 10; i++) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: sparkTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.visible = false;
    add(s);
    sparks.push({ s, a: (i / 10) * Math.PI * 2, r: 0.25 + (i % 3) * 0.12, y: 0.25 + (i % 4) * 0.12, sp: 0.8 + (i % 3) * 0.4 });
    dynamic.push(s);
  }
  const flowerTop = new T.Vector3(OX + 0.88, 1.35, DZ - 0.12);
  let sparkleT = 0;

  // ---------------------------------------------------------------- reception and waiting room
  board(['Welcome to', 'Sunny Hill Hospital'], 3.4, 0.8, -6.0, 2.85, Z0 + 0.06, { sizes: [0.26, 0.38] });
  const sun = new T.Group();
  sun.add(cyl(0.3, 0.3, 0.06, C.sun, 20));
  sun.children[0].rotation.x = Math.PI / 2;
  for (let i = 0; i < 10; i++) {
    const ray = box(0.08, 0.16, 0.04, C.sun);
    const a = (i / 10) * Math.PI * 2;
    ray.rotation.z = a;
    sun.add(at(ray, Math.sin(a) * -0.42, Math.cos(a) * 0.42, 0));
  }
  add(at(sun, -8.2, 2.85, Z0 + 0.1));
  // Desk
  const RX = -6.0;
  const RZ = -2.75;
  add(at(rbox(3.4, 0.9, 0.8, C.mint, 0.08), RX, 0.45, RZ));
  add(at(rbox(3.55, 0.08, 0.95, C.white, 0.04), RX, 0.93, RZ - 0.02));
  add(at(rbox(3.5, 0.14, 0.06, C.white, 0.03), RX, 0.12, RZ + 0.41));
  const recEmblem = emblem(k, 0.5);
  add(at(recEmblem, RX - 0.9, 0.5, RZ + 0.42));
  const recSign = k.panel(1.5, 0.36, 512, (c, w, h) => drawBoard(c, w, h, { lines: ['Reception'], edge: C.mintDeep, fill: '#ffffff', radius: 0.4 }));
  add(at(recSign, RX + 0.6, 0.52, RZ + 0.43));
  const recMon = new T.Group();
  recMon.add(at(box(0.05, 0.2, 0.05, C.ink), 0, 0.1, 0));
  recMon.add(at(rbox(0.6, 0.38, 0.05, C.ink, 0.03), 0, 0.36, 0));
  recMon.rotation.y = Math.PI - 0.5;
  add(at(recMon, RX + 1.1, 0.97, RZ - 0.15));
  const bell = new T.Group();
  bell.add(cyl(0.08, 0.09, 0.02, C.ink, 14));
  const dome = sph(0.07, C.sun, { metal: 0.6, rough: 0.25 }, 14);
  dome.scale.y = 0.8;
  bell.add(dome);
  bell.add(at(sph(0.015, C.sun, { metal: 0.6, rough: 0.25 }, 6), 0, 0.065, 0));
  add(at(bell, RX - 0.25, 0.98, RZ + 0.2));
  const jar = cyl(0.11, 0.1, 0.22, '#dff4ff', 14, { rough: 0.2 });
  add(at(jar, RX + 0.25, 1.08, RZ + 0.15));
  for (let i = 0; i < 6; i++) add(at(sph(0.035, [C.rose, C.sun, C.mint, C.lilac][i % 4], undefined, 8), RX + 0.25 + Math.cos(i) * 0.05, 1.02 + (i % 3) * 0.05, RZ + 0.15 + Math.sin(i * 2) * 0.05));
  add(at(cyl(0.11, 0.11, 0.03, C.rose, 14), RX + 0.25, 1.205, RZ + 0.15));
  add(at(plant(k, { scale: 0.5, pot: C.sun }), RX - 1.35, 0.97, RZ - 0.1));
  wall({ type: 'box', x: RX, z: RZ, hw: 1.75, hd: 0.45, h: 0.97 });
  // Maya at the front desk: frozen except her waving arm
  const maya = makePerson(makeKid, STAFF.maya);
  freeze(maya, { pose: 'stand', keep: [maya.arms[1]] });
  maya.root.position.set(RX + 0.3, 0, RZ - 0.85);
  wall({ type: 'circle', x: RX + 0.3, z: RZ - 0.85, r: 0.3 });
  root.add(maya.root);
  dynamic.push(maya.root);
  let mayaWave = 0;
  let mayaGreeted = false;
  // Clock
  const clock = new T.Group();
  clock.add(at(cyl(0.3, 0.3, 0.06, C.white, 24), 0, 0, 0));
  clock.children[0].rotation.x = Math.PI / 2;
  clock.add(at(k.tor(0.3, 0.035, C.rose, Math.PI * 2, undefined, 28), 0, 0, 0.02));
  const hand1 = box(0.03, 0.2, 0.02, C.ink);
  hand1.rotation.z = -0.6;
  clock.add(at(hand1, 0.06, 0.08, 0.05));
  const hand2 = box(0.03, 0.14, 0.02, C.ink);
  hand2.rotation.z = 1.2;
  clock.add(at(hand2, -0.06, 0.03, 0.05));
  add(at(clock, -3.7, 2.4, Z0 + 0.08));
  // Water cooler
  add(at(rbox(0.5, 0.95, 0.45, C.white, 0.06), -3.4, 0.48, -4.55));
  add(at(cyl(0.18, 0.18, 0.5, '#bfe6ff', 16, { rough: 0.15 }), -3.4, 1.2, -4.55));
  add(at(sph(0.18, '#bfe6ff', { rough: 0.15 }, 16), -3.4, 1.45, -4.55));
  add(at(box(0.08, 0.06, 0.06, C.sky), -3.48, 0.75, -4.3));
  add(at(box(0.08, 0.06, 0.06, C.rose), -3.32, 0.75, -4.3));
  wall({ type: 'box', x: -3.4, z: -4.55, hw: 0.28, hd: 0.25 });
  // Waiting chairs
  const chairXs = [-2.4, -1.65, -0.9, -0.15, 0.6];
  const chairColors = [C.mint, C.pink, C.sun, C.sky, C.lilac];
  chairXs.forEach((x, i) => add(at(chair(k, { color: chairColors[i] }), x, 0, -4.35)));
  wall({ type: 'box', x: -0.9, z: -4.38, hw: 1.85, hd: 0.3, h: 0.5 });
  win(-1.3, 2.05, { w: 1.4, h: 0.95, curtain: '#ffe08a' });
  // Poster: wash your hands
  const poster = new T.Group();
  poster.add(rbox(0.95, 1.2, 0.04, C.sky, 0.04));
  poster.add(at(k.panel(0.85, 1.1, 256, (c, w, h) => {
    c.fillStyle = '#f3fbff';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#bfe6ff';
    for (const [x, y, r] of [[0.25, 0.3, 30], [0.62, 0.22, 22], [0.72, 0.45, 36], [0.35, 0.55, 18]]) {
      c.beginPath();
      c.arc(w * x, h * y, r, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#f8dccb';
    roundRect(c, w * 0.3, h * 0.38, w * 0.4, h * 0.2, 30);
    c.fill();
    c.fillStyle = C.ink;
    c.textAlign = 'center';
    c.font = `600 ${h * 0.085}px ${FONT}`;
    c.fillText('Wash your', w / 2, h * 0.75);
    c.fillText('hands!', w / 2, h * 0.86);
  }), 0, 0, 0.025));
  add(at(poster, -2.75, 2.1, Z0 + 0.05));
  // Nour waits with her teddy
  const nourDef = VISITORS.find((v) => v.id === 'nour');
  const nour = makePerson(makeKid, nourDef);
  const teddy = new T.Group();
  const bear = '#c98a5a';
  teddy.add(at(sph(0.11, bear, undefined, 12), 0, 0, 0));
  teddy.add(at(sph(0.08, bear, undefined, 12), 0, 0.14, 0.01));
  for (const s of [-1, 1]) teddy.add(at(sph(0.035, bear, undefined, 8), s * 0.06, 0.21, 0));
  teddy.add(at(sph(0.03, '#f3d5b5', undefined, 8), 0, 0.13, 0.08));
  nour.carry(teddy);
  freeze(nour, { pose: 'sit', hands: 'carry' });
  nour.root.position.set(chairXs[3], 0.32, -4.32);
  add(nour.root);
  // Fish tank on a cabinet against the back wall
  const tankBox = new T.Group();
  tankBox.add(at(rbox(0.6, 0.8, 1.3, C.wood, 0.04), 0, 0.4, 0));
  tankBox.add(at(rbox(0.04, 0.5, 0.9, C.woodDark, 0.02), -0.3, 0.4, 0));
  tankBox.rotation.y = Math.PI / 2;
  add(at(tankBox, 1.65, 0, -4.5));
  const tank = new T.Group();
  tank.add(at(box(0.5, 0.06, 1.2, C.white), 0, 0, 0));
  tank.add(at(box(0.5, 0.06, 1.2, C.white), 0, 0.64, 0));
  tank.add(at(box(0.46, 0.08, 1.14, '#f3e1b5'), 0, 0.07, 0));
  for (const [z, h] of [[-0.35, 0.35], [-0.25, 0.25], [0.3, 0.3]]) tank.add(at(cyl(0.025, 0.04, h, C.leaf, 6), 0, 0.1 + h / 2, z));
  const water = new T.Mesh(new T.BoxGeometry(0.46, 0.54, 1.14), new T.MeshStandardMaterial({ color: '#8fdcf0', transparent: true, opacity: 0.38, roughness: 0.1 }));
  at(water, 0, 0.34, 0);
  tank.add(water);
  dynamic.push(water);
  const fish = [];
  ['#ff9f43', C.rose, C.sun].forEach((c, i) => {
    const f = new T.Group();
    const body = sph(0.06, c, { rough: 0.4 }, 10);
    body.scale.set(0.6, 0.8, 1.3);
    const tail = ctx.util.mesh(new T.ConeGeometry(0.05, 0.08, 6), ctx.util.mat(c));
    tail.rotation.x = Math.PI / 2;
    at(tail, 0, 0, -0.1);
    f.add(body, tail);
    f.scale.setScalar(1.5);
    tank.add(f);
    fish.push({ f, ph: i * 2.1, y: 0.25 + i * 0.1 });
    dynamic.push(f);
  });
  tank.rotation.y = Math.PI / 2;
  add(at(tank, 1.65, 0.8, -4.5));
  wall({ type: 'box', x: 1.65, z: -4.5, hw: 0.66, hd: 0.32 });
  let feedT = 0;
  const flakes = [];
  for (let i = 0; i < 8; i++) {
    const f = box(0.02, 0.01, 0.02, C.sun);
    f.visible = false;
    tank.add(f);
    flakes.push(f);
    dynamic.push(f);
  }
  // Kids' corner
  const rug = cyl(1.4, 1.4, 0.03, '#ffe9a8', 32);
  add(at(rug, 0.2, 0.015, 1.4));
  const rug2 = cyl(1.1, 1.1, 0.035, '#fff6d6', 32);
  add(at(rug2, 0.2, 0.02, 1.4));
  [[-0.3, 1.1, C.rose], [-0.05, 1.15, C.sky], [-0.18, 1.12, C.sun]].forEach(([x, z, c], i) => {
    const b = rbox(0.24, 0.24, 0.24, c, 0.04);
    b.rotation.y = i * 0.4;
    add(at(b, x + (i === 2 ? 0.1 : 0), 0.14 + (i === 2 ? 0.24 : 0), z));
  });
  add(at(sph(0.16, C.mint, { rough: 0.5 }, 16), 0.8, 0.18, 1.7));
  const toyTrain = new T.Group();
  for (let i = 0; i < 3; i++) {
    toyTrain.add(at(rbox(0.26, 0.18, 0.18, [C.rose, C.sky, C.sun][i], 0.04), i * 0.3, 0.13, 0));
    for (const s of [-1, 1]) {
      const w_ = cyl(0.05, 0.05, 0.03, C.ink, 10);
      w_.rotation.x = Math.PI / 2;
      toyTrain.add(at(w_, i * 0.3, 0.05, s * 0.1));
    }
  }
  toyTrain.add(at(cyl(0.04, 0.05, 0.12, C.ink, 8), -0.04, 0.28, 0));
  toyTrain.rotation.y = 0.3;
  add(at(toyTrain, -0.2, 0, 2.0));
  // "Get well soon" balloons by the desk
  const balloons = [];
  [[C.rose, -0.18, 1.8], [C.mint, 0.12, 1.95], [C.sun, 0.0, 2.1]].forEach(([c, dx, h], i) => {
    const g = new T.Group();
    g.add(at(cyl(0.005, 0.005, h, '#ffffff', 4), 0, h / 2, 0));
    const b = sph(0.2, ctx.util.mat(c, { rough: 0.3 }), undefined, 14);
    b.scale.set(1, 1.18, 1);
    g.add(at(b, 0, h + 0.18, 0));
    g.add(at(k.cyl(0.03, 0.015, 0.05, c, 6), 0, h - 0.04, 0));
    g.rotation.z = dx;
    add(at(g, RX - 1.85, 0, RZ + 0.3));
    balloons.push({ g, ph: i * 1.7, base: dx });
    dynamic.push(g);
  });
  add(at(plant(k, { scale: 1.2 }), -8.4, 0, -4.4));
  wall({ type: 'circle', x: -8.4, z: -4.4, r: 0.32 });
  add(at(plant(k, { scale: 1.0, pot: C.mint }), 2.65, 0, -4.45));
  wall({ type: 'circle', x: 2.65, z: -4.45, r: 0.28 });
  // Entrance mat
  const welcome = k.panel(1.8, 0.9, 512, (c, w, h) => {
    c.fillStyle = C.mintDeep;
    roundRect(c, 0, 0, w, h, 60);
    c.fill();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 8;
    c.setLineDash([22, 16]);
    roundRect(c, 20, 20, w - 40, h - 40, 44);
    c.stroke();
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 ${h * 0.3}px ${FONT}`;
    c.fillText('Welcome', w / 2, h / 2 + 4);
  }, { transparent: true });
  welcome.rotation.x = -Math.PI / 2;
  add(at(welcome, -6.5, 0.012, 4.2));
  const wayOut = new T.Group();
  wayOut.add(at(cyl(0.035, 0.035, 1.2, C.white, 8), 0, 0.6, 0));
  wayOut.add(at(rbox(0.8, 0.32, 0.06, C.sun, 0.05), 0, 1.25, 0));
  wayOut.add(at(k.panel(0.72, 0.26, 256, (c, w, h) => {
    c.fillStyle = '#fff8e1';
    roundRect(c, 2, 2, w - 4, h - 4, 18);
    c.fill();
    c.fillStyle = C.ink;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 ${h * 0.5}px ${FONT}`;
    c.fillText('Way out', w / 2, h / 2 + 2);
  }), 0, 1.25, 0.035));
  add(at(wayOut, -8.1, 0, 4.25));
  wall({ type: 'circle', x: -8.1, z: 4.25, r: 0.1 });

  // ---------------------------------------------------------------- patient rooms
  const beatTex = beatTexture();
  const beatMat = new T.MeshBasicMaterial({ map: beatTex });
  const curedHearts = {};
  const cured = new Set(hostApi.load('cured', []));
  const beds = {};
  const heartTex = canvasTexture(128, 128, (c) => {
    c.fillStyle = '#ff6b8a';
    c.strokeStyle = '#ffffff';
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(64, 108);
    c.bezierCurveTo(8, 70, 18, 14, 64, 40);
    c.bezierCurveTo(110, 14, 120, 70, 64, 108);
    c.closePath();
    c.stroke();
    c.fill();
  });
  WARD.forEach((p, i) => {
    const rcx = ROOMS[i];
    const bx = rcx - 0.45;
    const bz = Z0 + 0.1 + 1.05;
    const bed = hospitalBed(k, { blanket: p.blanket });
    add(at(bed, bx, 0, bz));
    wall({ type: 'box', x: bx, z: bz, hw: 0.62, hd: 1.07 });
    beds[p.id] = { x: bx, z: bz };
    // Patient sitting up in bed
    const kid = makePerson(makeKid, p);
    freeze(kid, { pose: 'sit' });
    kid.root.position.set(bx, 0.33, bz - 0.38);
    add(kid.root);
    if (p.symptom === 'wrist') {
      const sling = k.tor(0.15, 0.03, C.mintDeep, Math.PI, undefined, 14);
      sling.rotation.set(0, 0, Math.PI);
      add(at(sling, bx - 0.06, 0.33 + 0.62 * (p.grown ? 1.14 : 1), bz - 0.2));
    }
    // Bedside table
    add(at(rbox(0.5, 0.6, 0.45, C.white, 0.05), bx + 0.98, 0.3, Z0 + 0.4));
    add(at(sph(0.025, C.sun, undefined, 8), bx + 0.98, 0.42, Z0 + 0.64));
    wall({ type: 'box', x: bx + 0.98, z: Z0 + 0.4, hw: 0.26, hd: 0.24, h: 0.6 });
    if (i === 0) {
      add(at(bouquet(k, { scale: 0.9, vase: C.mintPale, blooms: [C.sun, '#ffffff', C.pink] }), bx + 0.9, 0.6, Z0 + 0.4));
      add(at(cyl(0.04, 0.035, 0.1, '#dff4ff', 10), bx + 1.12, 0.65, Z0 + 0.46));
    } else if (i === 1) {
      const card = new T.Group();
      for (const s of [-1, 1]) {
        const leaf = rbox(0.16, 0.2, 0.01, s > 0 ? C.sky : C.sun, 0.01);
        leaf.rotation.y = s * 0.5;
        card.add(at(leaf, s * 0.07, 0.1, 0));
      }
      const h = k.heart(0.08, 0.01, C.rose);
      card.add(at(h, 0.07, 0.1, 0.05));
      add(at(card, bx + 0.98, 0.6, Z0 + 0.42));
      const ball = new T.Group();
      ball.add(sph(0.17, C.white, { rough: 0.5 }, 14));
      for (let j = 0; j < 5; j++) {
        const a = (j / 5) * Math.PI * 2;
        ball.add(at(sph(0.06, C.ink, undefined, 6), Math.cos(a) * 0.15, 0.05 * Math.sin(j), Math.sin(a) * 0.15));
      }
      add(at(ball, bx + 1.4, 0.17, bz + 1.1));
    } else {
      add(at(heartMug(k, { color: C.sun, heart: C.white }), bx + 0.88, 0.6, Z0 + 0.42));
      const book = rbox(0.22, 0.05, 0.16, C.mintDeep, 0.01);
      book.rotation.y = 0.3;
      add(at(book, bx + 1.08, 0.625, Z0 + 0.38));
    }
    // IV stand with a soft drip bag
    const iv = new T.Group();
    for (let j = 0; j < 4; j++) {
      const leg = box(0.34, 0.03, 0.04, C.steel);
      leg.rotation.y = (j * Math.PI) / 2 + 0.4;
      iv.add(at(leg, 0, 0.03, 0));
    }
    iv.add(at(cyl(0.02, 0.02, 1.8, C.steel, 6), 0, 0.92, 0));
    iv.add(at(k.tor(0.08, 0.012, C.steel, Math.PI, undefined, 10), 0, 1.82, 0));
    iv.add(at(rbox(0.2, 0.28, 0.07, '#dff4ff', 0.04), 0.08, 1.62, 0));
    iv.add(at(k.heart(0.08, 0.01, C.rose), 0.08, 1.63, 0.04));
    add(at(iv, bx - 0.9, 0, Z0 + 0.45));
    wall({ type: 'circle', x: bx - 0.9, z: Z0 + 0.45, r: 0.18 });
    // Heart monitor on the wall
    add(at(rbox(0.64, 0.46, 0.08, '#44505e', 0.04), rcx + 1.45, 1.6, Z0 + 0.06));
    const screen = new T.Mesh(k.geo('beat', () => new T.PlaneGeometry(0.54, 0.34)), beatMat);
    add(at(screen, rcx + 1.45, 1.62, Z0 + 0.105));
    // Window and name board
    win(bx, 2.15, { w: 1.0, h: 0.8, curtain: p.blanket });
    board([`Room ${i + 1}`, p.name], 1.5, 0.5, bx, 3.0, Z0 + 0.06, { edge: C.mintDeep, sizes: [0.24, p.name.length > 8 ? 0.32 : 0.4] });
    // Small rug and a chair for visitors
    add(at(cyl(0.7, 0.7, 0.025, p.blanket, 24), rcx + 0.7, 0.013, -1.3));
    const vc = chair(k, { color: p.blanket });
    vc.rotation.y = 0.7;
    add(at(vc, rcx - 1.45, 0, -2.2));
    wall({ type: 'circle', x: rcx - 1.45, z: -2.2, r: 0.3, h: 0.5 });
    // Floating heart when this patient is better
    const hs = new T.Sprite(new T.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
    hs.scale.setScalar(0.42);
    hs.position.set(bx, 2.15, bz - 0.3);
    hs.visible = cured.has(p.id);
    add(hs);
    dynamic.push(hs);
    curedHearts[p.id] = hs;
  });
  // Ward decor: a sign over the corridor and plants
  board(['This way to', 'Patient rooms'], 2.0, 0.6, WARD_X - 1.4, 2.7, Z0 + 0.06, { edge: C.mintDeep, sizes: [0.24, 0.34] });
  add(at(plant(k, { scale: 0.9 }), X1 - 0.5, 0, 4.2));
  wall({ type: 'circle', x: X1 - 0.5, z: 4.2, r: 0.28 });
  // A rolling cart in the corridor
  const cart = new T.Group();
  for (const y of [0.3, 0.85]) cart.add(at(rbox(0.9, 0.06, 0.5, C.white, 0.02), 0, y, 0));
  for (const [x, z] of [[-0.4, -0.2], [0.4, -0.2], [-0.4, 0.2], [0.4, 0.2]]) {
    cart.add(at(cyl(0.02, 0.02, 0.85, C.steel, 6), x, 0.45, z));
    cart.add(at(sph(0.04, C.ink, undefined, 8), x, 0.04, z));
  }
  cart.add(at(rbox(0.3, 0.12, 0.2, C.mint, 0.03), -0.18, 0.94, 0));
  cart.add(at(cyl(0.05, 0.05, 0.14, C.pink, 10), 0.2, 0.95, 0.05));
  const cartEm = emblem(k, 0.22, { badge: false });
  cart.add(at(cartEm, 0, 0.58, 0.26));
  add(at(cart, 9.6, 0, 3.6));
  wall({ type: 'box', x: 9.6, z: 3.6, hw: 0.48, hd: 0.28, h: 0.9 });

  // ---------------------------------------------------------------- hotspots
  const markCured = (id) => {
    cured.add(id);
    hostApi.save('cured', [...cured]);
    if (curedHearts[id]) curedHearts[id].visible = true;
  };
  let visitToken = 0;
  async function rounds(api, p) {
    const b = beds[p.id];
    const s = SYMPTOMS[p.symptom];
    const token = ++visitToken;
    api.activity({
      label: 'Step back',
      seats: [
        { who: 'roji', x: b.x + 0.95, z: b.z + 0.3, yaw: -1.05, pose: 'stand', hands: 'hold' },
        { who: 'homama', x: b.x + 1.7, z: b.z + 1.15, yaw: -0.8, pose: 'stand' },
      ],
      focus: { x: b.x + 0.5, z: b.z, y: 1.0, zoom: 0.5 },
      exit: { x: b.x + 1.2, z: b.z + 1.6 },
    });
    api.toast(`<b>${p.name}:</b> ${s.line}`, 2600);
    await wait(1800);
    if (token !== visitToken || !api.activityRunning) return;
    if (!api.hasArena('patients')) {
      api.endActivity();
      markCured(p.id);
      api.fx.heartsAt(api.world(b.x, b.z - 0.3, 1.6), 5);
      api.toast(`${p.name} feels better already. Thank you, Dr. Roji!`, 3000);
      return;
    }
    await api.playArena('patients', { patient: p.id, onCured: markCured });
    if (api.activityRunning) api.endActivity();
    if (cured.has(p.id)) {
      api.fx.heartsAt(api.world(b.x, b.z - 0.3, 1.6), 6);
      api.toast(`${p.name} feels much better. Thank you, Dr. Roji!`, 3200);
    }
  }
  async function visit(api, p) {
    const s = SYMPTOMS[p.symptom];
    const pick = await api.choose({
      title: `Visit ${p.name}`,
      text: `<b>${p.name}:</b> "${s.line}"`,
      options: [
        { id: 'help', label: 'Help Dr. Roji', sub: 'Play Patient Rounds together' },
        { id: 'cheer', label: `Cheer ${p.name} up`, sub: 'A big wave and a smile' },
      ],
    });
    if (pick === 'help') return rounds(api, p);
    if (pick !== 'cheer') return;
    const b = beds[p.id];
    api.activity({
      label: 'Step back',
      seats: [{ who: 'homama', x: b.x + 1.0, z: b.z + 0.7, yaw: -0.9, pose: 'stand' }],
      focus: { x: b.x + 0.5, z: b.z, y: 1.0, zoom: 0.52 },
      exit: { x: b.x + 1.2, z: b.z + 1.6 },
    });
    setTimeout(() => {
      api.emote('homama', 'cheer');
      api.fx.heartsAt(api.world(b.x, b.z - 0.3, 1.5), 4);
      api.sound.ui('pop');
      api.toast(`${p.name} giggles. <b>Homama:</b> "Dr. Roji will have you feeling better in no time!"`, 3600);
    }, 250);
  }
  WARD.forEach((p) => {
    const b = beds[p.id];
    hotspots.push({
      x: b.x + 1.15,
      z: b.z + 1.45,
      r: 1.35,
      icon: 'medic',
      label: (api) => (api.playerId === 'roji' ? `Check on ${p.name}` : `Visit ${p.name}`),
      act: (api) => (api.playerId === 'roji' ? rounds(api, p) : visit(api, p)),
    });
  });

  let lastNote = null;
  const nextNote = (api) => {
    const i = api.load('note', 0) % NOTES.length;
    api.save('note', i + 1);
    lastNote = NOTES[i];
    return lastNote;
  };
  const sparkle = (api, sec = 6) => {
    sparkleT = sec;
    api.fx.heartsAt(api.world(flowerTop.x, flowerTop.z, flowerTop.y), 3);
  };
  hotspots.push({
    x: OX + 0.9,
    z: -1.95,
    r: 1.2,
    icon: 'note',
    label: "Read Homama's note",
    act: async (api) => {
      const note = lastNote || nextNote(api);
      sparkle(api, 4);
      api.sound.ui('pop');
      const roji = api.playerId === 'roji';
      const pick = await api.choose({
        title: roji ? 'A note from Homama' : 'Your note for Roji',
        text: `"${note}"<br><br>${roji ? 'Love, Homama' : 'Homama hopes it makes her smile.'}`,
        options: [
          { id: 'smile', label: roji ? 'Aww, thank you' : 'Leave it on her desk' },
          { id: 'more', label: 'Read another', sub: 'There are more in the drawer' },
        ],
      });
      if (pick === 'more') {
        const n = nextNote(api);
        api.toast(`<b>Homama:</b> ${n}`, 5000);
        sparkle(api, 3);
      }
      api.emote(roji ? 'roji' : 'homama', 'heart');
    },
  });
  hotspots.push({
    x: OX - 0.95,
    z: -1.95,
    r: 1.2,
    icon: 'smile',
    label: (api) => (api.playerId === 'roji' ? 'Work at your desk' : 'Keep Roji company'),
    act: (api) => {
      api.toast('Dr. Roji writes up her notes. Homama keeps her company.', 2800);
      api.activity({
        label: 'Get up',
        seats: [
          { who: 'roji', x: OX, z: -3.9, y: 0.3, yaw: 0, pose: 'sit', hands: 'type' },
          { who: 'homama', x: -14.0, z: -0.55, y: 0.3, yaw: 1.05, pose: 'sit' },
        ],
        focus: { x: OX - 0.8, z: -2.6, y: 1.0, zoom: 0.55 },
        exit: { x: OX - 0.9, z: -1.6 },
        update: () => {
          sparkleT = Math.max(sparkleT, 0.5);
        },
        onEnd: (silent) => !silent && api.toast('Notes all done. Homama says Dr. Roji works too hard.', 2800),
      });
    },
  });
  hotspots.push({
    x: -9.95,
    z: -2.9,
    r: 1.1,
    icon: 'heart',
    label: 'Bop the balloon',
    act: (api) => {
      bal.vx += 2.4;
      bal.vz -= 1.2;
      api.sound.tone && api.sound.ctx && api.sound.tone(520, api.sound.ctx.currentTime, 0.25, { type: 'triangle', gain: 0.06, slideTo: 880 });
      api.emote('player', 'cheer');
      api.toast(api.playerId === 'roji' ? 'The balloon from Homama bobs: "Go Dr. Roji!"' : 'Homama bops his balloon for Roji: "Go Dr. Roji!"', 2600);
    },
  });
  hotspots.push({
    x: RX + 0.3,
    z: RZ + 0.95,
    r: 1.35,
    icon: 'hand',
    label: 'Say hi to Maya',
    act: (api) => {
      mayaWave = 2;
      api.emote('player', 'wave');
      const bell = api.sound.ctx;
      if (bell) api.sound.tone(1568, bell.currentTime, 0.6, { gain: 0.05 });
      api.toast(api.playerId === 'roji' ? '<b>Maya:</b> Good morning, Dr. Roji! Lina, Yousef and Grandpa Sami are waiting.' : '<b>Maya:</b> Hi Homama! Dr. Roji is on her rounds. Her office is on the left.', 3600);
    },
  });
  hotspots.push({
    x: chairXs[1],
    z: -3.35,
    r: 1.25,
    icon: 'smile',
    label: 'Sit in the waiting room',
    act: (api) =>
      api.activity({
        label: 'Get up',
        seats: [
          { who: 'player', x: chairXs[0], z: -4.3, y: 0.32, yaw: 0, pose: 'sit' },
          { who: 'partner', x: chairXs[1], z: -4.3, y: 0.32, yaw: 0, pose: 'sit', hands: 'read' },
        ],
        focus: { x: chairXs[1], z: -3.6, y: 0.9, zoom: 0.55 },
        exit: { x: chairXs[1], z: -3.1 },
        onEnd: (silent) => !silent && api.toast('Nour waves goodbye with her teddy.', 2400),
      }),
  });
  hotspots.push({
    x: 1.65,
    z: -3.35,
    r: 1.1,
    icon: 'heart',
    label: 'Feed the fish',
    act: (api) => {
      feedT = 4;
      flakes.forEach((f, i) => {
        f.visible = true;
        f.position.set((Math.random() - 0.5) * 0.3, 0.62, (i / flakes.length - 0.5) * 0.9);
      });
      const ac = api.sound.ctx;
      if (ac) for (let i = 0; i < 5; i++) api.sound.tone(900 + i * 140, ac.currentTime + i * 0.09, 0.12, { gain: 0.03 });
      api.toast('The fish wiggle with joy. Tiny bubbles say thank you.', 2600);
    },
  });

  // ---------------------------------------------------------------- life
  dynamic.push(...colorBake(root, dynamic));
  return {
    group: root,
    dynamic,
    colliders,
    hotspots,
    size: { w: X1 - X0, d: Z1 - Z0 },
    spawn: { x: -6.5, z: 2.6, yaw: 0 },
    exit: { x: -6.5, z: 4.3 },
    background: '#cdebe3',
    onEnter(api) {
      mayaGreeted = false;
      const roji = api.playerId === 'roji';
      const msg = roji ? `<b>Note from Homama:</b> ${nextNote(api)}` : HOMAMA_LINES[api.load('line', 0) % HOMAMA_LINES.length];
      if (!roji) api.save('line', api.load('line', 0) + 1);
      setTimeout(() => {
        if (!api.inside) return;
        api.toast(msg, 5600);
        sparkle(api, 7);
      }, 1900);
    },
    update(dt, t, api) {
      // Maya waves when someone comes close, and when greeted
      const p = api.localPos(api.player);
      if (!mayaGreeted && Math.hypot(p.x - RX, p.z - RZ) < 3.6) {
        mayaGreeted = true;
        mayaWave = 1.8;
      }
      const armR = maya.arms[1];
      if (mayaWave > 0) {
        mayaWave -= dt;
        const kk = Math.min(1, mayaWave * 4, (2 - mayaWave) * 4);
        armR.rotation.set(0, 0, -0.18 - Math.max(0, kk) * (2.4 + Math.sin(t * 14) * 0.3));
      } else armR.rotation.set(0, 0, -0.18);
      maya.root.rotation.y = Math.sin(t * 0.5) * 0.12;
      maya.root.position.y = Math.sin(t * 2.2) * 0.008;
      // Homama's balloon sways on its string
      bal.vx += (-bal.ax * 9 - bal.vx * 1.6) * dt;
      bal.vz += (-bal.az * 9 - bal.vz * 1.6) * dt;
      bal.ax += bal.vx * dt;
      bal.az += bal.vz * dt;
      balloon.rotation.set(bal.ax + Math.sin(t * 0.9) * 0.04, 0, bal.az + Math.sin(t * 0.7) * 0.05);
      foilHolder.rotation.y = Math.sin(t * 0.6) * 0.2;
      for (const b of balloons) b.g.rotation.set(Math.sin(t * 0.8 + b.ph) * 0.04, 0, b.base + Math.sin(t * 1.1 + b.ph) * 0.05);
      // Coffee steam
      steam.forEach((s, i) => {
        const kk = (t * 0.45 + i / steam.length) % 1;
        s.position.set(OX - 0.45 + Math.sin(kk * 6 + i) * 0.04, 1.0 + kk * 0.5, DZ + 0.02);
        s.scale.setScalar(0.08 + kk * 0.18);
        s.material.opacity = 0.5 * (1 - kk);
      });
      // Sparkles around Homama's flowers
      sparkleT = Math.max(0, sparkleT - dt);
      const on = Math.min(1, sparkleT);
      sparks.forEach((q, i) => {
        q.s.visible = on > 0;
        if (!q.s.visible) return;
        const a = q.a + t * q.sp;
        q.s.position.set(flowerTop.x + Math.cos(a) * q.r, flowerTop.y - 0.2 + q.y + Math.sin(t * 2 + i) * 0.05, flowerTop.z + Math.sin(a) * q.r * 0.7);
        const tw = 0.5 + 0.5 * Math.sin(t * 7 + i * 1.9);
        q.s.scale.setScalar(0.08 + tw * 0.12);
        q.s.material.opacity = on * (0.4 + tw * 0.6);
      });
      // Fish
      feedT = Math.max(0, feedT - dt);
      const fed = feedT > 0;
      fish.forEach((f, i) => {
        f.ph += dt * (fed ? 2.4 : 0.8);
        const z = Math.sin(f.ph) * 0.42;
        const vz = Math.cos(f.ph);
        f.f.position.set(Math.sin(f.ph * 1.3 + i) * 0.08, fed ? 0.5 : f.y + Math.sin(f.ph * 2) * 0.03, z);
        f.f.rotation.y = vz > 0 ? 0 : Math.PI;
      });
      flakes.forEach((f) => {
        if (!f.visible) return;
        f.position.y -= dt * 0.12;
        f.rotation.y += dt * 3;
        if (f.position.y < 0.2 || !fed) f.visible = false;
      });
      // Monitors and the floating hearts over patients who feel better
      beatTex.offset.x = (t * 0.35) % 1;
      for (const id in curedHearts) {
        const h = curedHearts[id];
        if (!h.visible) continue;
        h.position.y = 2.15 + Math.sin(t * 2 + id.length) * 0.08;
        h.material.rotation = Math.sin(t * 1.5) * 0.15;
      }
    },
  };
}
