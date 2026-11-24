import { THREE, RoundedBoxGeometry, mat, umat, mesh, box, rbox, cyl, sph, tor, at, rot, heartGeo, starGeo, fit, glowTex, sprite, bake, FONT, roundRect } from './kit.js';
import { damp, easeInOut, easeOutBack } from '../../util.js';

// Kitchen: counters with a sink and a stove, a fridge whose door really opens, and the dining table.

export const FOODS = [
  { id: 'pecan-cake', label: 'Pecan cake', line: 'Pecan cake! Sweet, nutty and perfect.' },
  { id: 'german-cake', label: 'German cake', line: 'German chocolate cake. So rich!' },
  { id: 'cookies', label: 'Cookies', line: 'Warm cookies, crunchy and soft.' },
  { id: 'burger', label: 'Burger', line: 'A big juicy burger. Yum!' },
  { id: 'candy', label: 'Candy', line: 'Candy! A happy little sugar rush.' },
  { id: 'spanish-latte', label: 'Spanish latte', line: 'Spanish latte, creamy and sweet.' },
  { id: 'shawarma', label: 'Shawerma', line: 'Shawerma, wrapped and tasty.' },
  { id: 'mansaf', label: 'Mansaf', line: 'Mansaf, just like home.' },
  { id: 'strawberries', label: 'Strawberries', line: 'Fresh strawberries, the red ones are sweetest.' },
  { id: 'ice-cream', label: 'Ice cream', line: 'Ice cream! Brrr, brain freeze.' },
];
const DISHES = [
  ['mansaf', 'Mansaf'],
  ['shawarma', 'Shawerma'],
  ['pizza', 'A pizza'],
  ['burger', 'Burgers'],
  ['pecan-cake', 'A pecan cake'],
  ['german-cake', 'A German cake'],
  ['cookies', 'Cookies'],
  ['sandwich', 'Sandwiches'],
];

const MINT = '#8fd3b5';
const TOP = '#fbfaf5';
const CT = 0.91; // counter top
const FX = -10.6; // fridge centre
const TX = -12.9; // table centre
const TZ = 0.55;
const TT = 0.8; // table top

function gingham(a, b) {
  return (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = b;
    for (let i = 0; i < 8; i += 2) {
      ctx.fillRect(i * 16, 0, 16, h);
      ctx.fillRect(0, i * 16, w, 16);
    }
    ctx.fillStyle = a;
    for (let i = 0; i < 8; i += 2) for (let j = 0; j < 8; j += 2) ctx.fillRect(i * 16, j * 16, 16, 16);
  };
}

export function buildKitchen(R) {
  const { add, L, api } = R;
  const ZB = L.ZB;
  const P = Math.PI;
  const st = { door: 0, doorTarget: 0, fridgeBusy: false, cook: 0, cooked: false, plates: [] };
  const mint = mat(MINT, { rough: 0.6 });
  const mintLight = mat('#a9e0c7', { rough: 0.6 });
  const top = mat(TOP, { rough: 0.35 });
  const metal = mat('#cfd8e3', { metal: 0.55, rough: 0.3 });
  const dark = mat('#3b3542', { rough: 0.5 });
  const wood = mat('#c98f5f', { rough: 0.75 });
  const white = mat('#ffffff', { rough: 0.5 });

  // ---------------------------------------------------------------- counters
  const cx0 = -15.88;
  const cx1 = -11.15;
  add(at(rbox(cx1 - cx0, 0.86, 0.78, mint, 0.03), (cx0 + cx1) / 2, 0.43, ZB + 0.4));
  add(at(box(cx1 - cx0 + 0.06, 0.05, 0.84, top), (cx0 + cx1) / 2, CT - 0.025, ZB + 0.42));
  for (let x = cx0 + 0.32; x < cx1 - 0.2; x += 0.6) {
    if (x > -13.1 && x < -12.1) continue; // the oven
    add(at(rbox(0.54, 0.66, 0.03, mintLight, 0.02), x, 0.44, ZB + 0.8));
    add(at(sph(0.025, metal, undefined, 8), x + 0.18, 0.66, ZB + 0.83));
  }
  R.col({ type: 'box', x: (cx0 + cx1) / 2, z: ZB + 0.42, hw: (cx1 - cx0) / 2 + 0.03, hd: 0.44 });

  // Sink under the window, with a dish rack
  add(at(rbox(0.72, 0.03, 0.46, metal, 0.01), -14.8, CT + 0.005, ZB + 0.4));
  add(at(box(0.6, 0.01, 0.34, '#8796a8'), -14.8, CT + 0.022, ZB + 0.4));
  add(rot(at(tor(0.13, 0.022, metal, undefined, P, 6, 12), -14.8, CT + 0.2, ZB + 0.18), 0, P / 2, 0));
  add(at(cyl(0.025, 0.03, 0.2, metal, 8), -14.8, CT + 0.1, ZB + 0.06));
  for (const s of [-1, 1]) add(at(sph(0.035, s < 0 ? '#ef5b6f' : '#6fb8ff', undefined, 8), -14.8 + s * 0.14, CT + 0.04, ZB + 0.1));
  add(at(rbox(0.36, 0.05, 0.3, '#ffffff', 0.02), -14.18, CT + 0.025, ZB + 0.4));
  ['#ffd166', '#ff9eb5', '#9fd6e3'].forEach((c, i) => add(rot(at(cyl(0.12, 0.12, 0.015, c, 16), -14.28 + i * 0.1, CT + 0.15, ZB + 0.4), 0, 0, P / 2)));
  add(at(cyl(0.04, 0.045, 0.14, '#7fd3a7', 10), -15.35, CT + 0.07, ZB + 0.3));
  R.windowAt(-14.8, 1.95, 1.2, 0.85, '#ffb3a7');
  add(at(cyl(0.09, 0.07, 0.12, '#e07a55', 10), -14.5, 1.47, ZB + 0.12));
  for (let k = 0; k < 3; k++) add(at(sph(0.06, '#5aa84f', { rough: 0.8 }, 8), -14.5 + (k - 1) * 0.04, 1.58 + (k % 2) * 0.03, ZB + 0.12));

  // Prep corner: cutting board, carrot, tomato, utensil crock, jars on a shelf, hanging spoons
  add(at(rbox(0.5, 0.03, 0.32, wood, 0.01), -13.62, CT + 0.015, ZB + 0.45));
  add(rot(at(cyl(0.03, 0.004, 0.22, '#ff8a3d', 8), -13.7, CT + 0.06, ZB + 0.45), 0, 0, P / 2 - 0.2));
  add(at(sph(0.06, '#ef3b4d', { rough: 0.45 }, 10), -13.48, CT + 0.09, ZB + 0.42));
  add(at(cyl(0.07, 0.06, 0.18, '#ffffff', 12), -13.25, CT + 0.09, ZB + 0.18));
  for (const [dx, c] of [[-0.03, '#c98f5f'], [0.03, '#ef5b6f'], [0, '#63c7ba']]) add(at(cyl(0.01, 0.01, 0.22, c, 5), -13.25 + dx, CT + 0.25, ZB + 0.18));
  add(at(box(0.7, 0.04, 0.22, wood), -13.5, 1.78, ZB + 0.11));
  ['#ffd166', '#ef5b6f', '#7fd3ff'].forEach((c, i) => {
    add(at(cyl(0.07, 0.07, 0.18, mat('#fff7ea', { rough: 0.3 }), 12), -13.72 + i * 0.22, 1.89, ZB + 0.12));
    add(at(cyl(0.074, 0.074, 0.04, c, 12), -13.72 + i * 0.22, 2.0, ZB + 0.12));
  });
  add(rot(at(cyl(0.012, 0.012, 0.6, metal, 6), -13.5, 1.45, ZB + 0.06), 0, 0, P / 2));
  for (const [dx, c] of [[-0.18, '#ef5b6f'], [0, '#ffd166'], [0.18, '#63c7ba']]) {
    add(at(cyl(0.008, 0.008, 0.22, c, 5), -13.5 + dx, 1.33, ZB + 0.07));
    add(at(sph(0.035, c, undefined, 8), -13.5 + dx, 1.2, ZB + 0.07)).scale.set(1, 0.4, 1);
  }

  // ---------------------------------------------------------------- stove
  const SX = -12.6;
  add(at(rbox(0.86, 0.03, 0.62, dark, 0.01), SX, CT + 0.015, ZB + 0.42));
  const burner = umat('#4a3a44', { emissive: '#ff5a2a', ei: 0, rough: 0.5 });
  const burners = [[-0.2, -0.13], [0.2, -0.13], [-0.2, 0.17], [0.2, 0.17]];
  for (const [dx, dz] of burners) add(rot(at(tor(0.09, 0.014, burner, undefined, P * 2, 6, 18), SX + dx, CT + 0.035, ZB + 0.42 + dz), P / 2, 0, 0));
  add(at(rbox(0.84, 0.62, 0.03, dark, 0.02), SX, 0.45, ZB + 0.81));
  const ovenGlass = umat('#ffb36b', { emissive: '#ff7a3d', ei: 0.25, rough: 0.3 });
  add(at(rbox(0.56, 0.26, 0.02, ovenGlass, 0.02), SX, 0.44, ZB + 0.83));
  add(rot(at(cyl(0.015, 0.015, 0.6, metal, 6), SX, 0.66, ZB + 0.86), 0, 0, P / 2));
  for (let k = 0; k < 4; k++) add(rot(at(cyl(0.03, 0.03, 0.03, metal, 10), SX - 0.27 + k * 0.18, 0.82, ZB + 0.83), P / 2, 0, 0));
  // Pot with a lid that jiggles, a pan with an egg
  add(at(cyl(0.16, 0.15, 0.22, '#e5484d', 18), SX - 0.2, CT + 0.15, ZB + 0.29));
  for (const s of [-1, 1]) add(at(box(0.06, 0.03, 0.04, '#c93b3b'), SX - 0.2 + s * 0.18, CT + 0.22, ZB + 0.29));
  const lid = R.dyn(new THREE.Group());
  lid.add(at(cyl(0.17, 0.17, 0.025, '#c93b3b', 18), 0, 0, 0), at(sph(0.03, '#ffffff', undefined, 8), 0, 0.03, 0));
  lid.position.set(SX - 0.2, CT + 0.275, ZB + 0.29);
  add(bake(lid));
  add(at(cyl(0.15, 0.13, 0.05, '#3a3a46', 18), SX + 0.2, CT + 0.06, ZB + 0.59));
  add(rot(at(box(0.3, 0.025, 0.05, '#3a3a46'), SX + 0.48, CT + 0.08, ZB + 0.62), 0, -0.2, 0));
  add(at(cyl(0.08, 0.08, 0.012, '#ffffff', 14), SX + 0.17, CT + 0.09, ZB + 0.58));
  add(at(sph(0.035, '#ffc93c', undefined, 10), SX + 0.17, CT + 0.1, ZB + 0.58)).scale.set(1, 0.5, 1);
  // Hood
  add(at(rbox(1.0, 0.32, 0.55, '#ffffff', 0.05), SX, 2.0, ZB + 0.3));
  add(at(box(0.42, 1.05, 0.34, '#ffffff'), SX, 2.66, ZB + 0.18));
  add(at(box(0.5, 0.02, 0.2, mat('#fff1c9', { emissive: '#ffd27a', ei: 0.9 })), SX, 1.835, ZB + 0.35));
  const steam = [];
  const sizzle = [];
  for (let i = 0; i < 4; i++) steam.push({ s: R.dyn(add(sprite(glowTex(), { opacity: 0 }))), ph: i / 4 });
  const sizzleTex = glowTex();
  for (let i = 0; i < 8; i++) sizzle.push({ s: R.dyn(add(sprite(sizzleTex, { color: '#ffc46b', opacity: 0, scale: 0.06 }))), ph: Math.random() });

  // Coffee machine for Spanish lattes, a little menu board and a fruit bowl
  add(at(rbox(0.32, 0.42, 0.3, '#ff9eb5', 0.05), -11.85, CT + 0.21, ZB + 0.3));
  add(at(box(0.2, 0.05, 0.12, dark), -11.85, CT + 0.3, ZB + 0.48));
  add(at(cyl(0.045, 0.04, 0.08, '#ffffff', 10), -11.85, CT + 0.06, ZB + 0.5));
  add(at(cyl(0.18, 0.12, 0.1, '#fff1d6', 14), -11.42, CT + 0.05, ZB + 0.4));
  for (const [dx, dz, c] of [[-0.06, 0, '#ef3b4d'], [0.06, 0.03, '#ffd166'], [0, -0.06, '#7fd36b'], [0.02, 0.05, '#ff8a3d']]) add(at(sph(0.055, c, { rough: 0.45 }, 10), -11.42 + dx, CT + 0.13, ZB + 0.4 + dz));
  const menu = (ctx, w, h) => {
    ctx.fillStyle = '#3d4a45';
    roundRect(ctx, 0, 0, w, h, 16);
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#c98f5f';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = `600 34px ${FONT}`;
    ctx.fillText('Menu', w / 2, 52);
    ctx.font = `500 26px ${FONT}`;
    ctx.fillStyle = '#ffd6e0';
    ctx.fillText('Mansaf', w / 2, 98);
    ctx.fillText('Pecan cake', w / 2, 132);
    ctx.fillStyle = '#ffd166';
    ctx.fillText('Love', w / 2, 166);
  };
  add(at(rbox(0.5, 0.38, 0.03, wood, 0.02), -11.62, 1.62, ZB + 0.02));
  add(at(R.atlas.panel(0.46, 0.34, 256, 192, menu), -11.62, 1.62, ZB + 0.04));

  // ---------------------------------------------------------------- fridge
  const fy = mat('#ffe08a', { rough: 0.45 });
  const fwhite = mat('#f7fbff', { rough: 0.4 });
  add(at(box(1.0, 2.0, 0.05, fy), FX, 1.0, ZB + 0.025));
  for (const s of [-1, 1]) {
    add(at(rbox(0.07, 2.0, 0.8, fy, 0.025), FX + s * 0.465, 1.0, ZB + 0.4));
    add(at(box(0.02, 1.76, 0.72, fwhite), FX + s * 0.42, 1.0, ZB + 0.42));
  }
  add(at(rbox(1.0, 0.1, 0.8, fy, 0.03), FX, 1.95, ZB + 0.4));
  add(at(box(1.0, 0.14, 0.8, fy), FX, 0.07, ZB + 0.4));
  const fridgeLight = umat('#f2fbff', { emissive: '#e6f6ff', ei: 0.2, rough: 0.4 });
  add(at(mesh(new THREE.PlaneGeometry(0.84, 1.76), fridgeLight, { cast: false }), FX, 1.0, ZB + 0.055));
  for (const y of [0.62, 1.07, 1.52]) add(at(box(0.84, 0.025, 0.66, mat('#dff3fb', { rough: 0.2 })), FX, y, ZB + 0.4));
  add(at(rbox(0.82, 0.32, 0.6, mat('#d7f2e1', { rough: 0.3 }), 0.03), FX, 0.32, ZB + 0.38));
  add(at(box(0.3, 0.04, 0.03, white), FX, 0.4, ZB + 0.69));
  for (let k = 0; k < 3; k++) add(at(sph(0.07, '#7fd36b', { rough: 0.6 }, 8), FX - 0.25 + k * 0.25, 0.5, ZB + 0.3));
  // Treats on the shelves
  add(at(cyl(0.05, 0.05, 0.22, '#ffffff', 12), FX - 0.3, 1.65, ZB + 0.3));
  add(at(cyl(0.035, 0.035, 0.05, '#3f7bf0', 10), FX - 0.3, 1.78, ZB + 0.3));
  add(at(box(0.11, 0.24, 0.11, '#ff9a3d'), FX - 0.12, 1.66, ZB + 0.32));
  add(at(sph(0.08, '#ff8fb1', { rough: 0.2 }, 12), FX + 0.13, 1.56, ZB + 0.33)).scale.set(1, 0.8, 1);
  for (let k = 0; k < 7; k++) add(at(sph(0.035, '#9b6bd3', { rough: 0.4 }, 8), FX + 0.3 + (k % 3) * 0.04 - 0.04, 1.6 + Math.floor(k / 3) * 0.04, ZB + 0.33 + (k % 2) * 0.03));
  add(at(cyl(0.14, 0.14, 0.12, '#a0602e', 16), FX - 0.2, 1.145, ZB + 0.32));
  add(at(cyl(0.14, 0.14, 0.025, '#fff1d6', 16), FX - 0.2, 1.215, ZB + 0.32));
  for (let k = 0; k < 6; k++) add(at(sph(0.022, '#7a4a26', undefined, 6), FX - 0.2 + Math.cos(k) * 0.08, 1.235, ZB + 0.32 + Math.sin(k) * 0.08));
  add(at(cyl(0.1, 0.07, 0.07, '#ffffff', 14), FX + 0.2, 1.12, ZB + 0.33));
  for (let k = 0; k < 6; k++) add(at(sph(0.035, '#ef3b4d', { rough: 0.4 }, 8), FX + 0.2 + Math.cos(k * 1.3) * 0.05, 1.17, ZB + 0.33 + Math.sin(k * 1.3) * 0.05));
  add(at(box(0.28, 0.07, 0.14, '#e9d2b0'), FX - 0.18, 0.67, ZB + 0.32));
  for (let k = 0; k < 6; k++) add(at(sph(0.03, '#fffaf0', undefined, 8), FX - 0.28 + (k % 3) * 0.1, 0.72, ZB + 0.29 + Math.floor(k / 3) * 0.06)).scale.set(1, 1.25, 1);
  const cheese = new THREE.Shape();
  cheese.moveTo(0, 0);
  cheese.lineTo(0.18, 0);
  cheese.lineTo(0, 0.1);
  cheese.closePath();
  add(at(mesh(new THREE.ExtrudeGeometry(cheese, { depth: 0.1, bevelEnabled: false }), mat('#ffd23f', { rough: 0.5 })), FX + 0.06, 0.635, ZB + 0.27));
  for (const dx of [0.3, 0.38]) add(at(cyl(0.035, 0.03, 0.08, dx > 0.33 ? '#ffb3c6' : '#c7a6ff', 10), FX + dx, 0.675, ZB + 0.33));
  // Cookie jar and a plant on top
  add(at(cyl(0.11, 0.11, 0.2, mat('#e8f6ff', { rough: 0.15 }), 14), FX - 0.2, 2.1, ZB + 0.3));
  add(at(cyl(0.12, 0.12, 0.04, '#ef5b6f', 14), FX - 0.2, 2.22, ZB + 0.3));
  for (let k = 0; k < 3; k++) add(rot(at(cyl(0.06, 0.06, 0.02, '#b8763f', 12), FX - 0.2, 2.03 + k * 0.05, ZB + 0.31), 0.2 * k, 0, 0));
  add(at(cyl(0.08, 0.06, 0.12, '#e07a55', 10), FX + 0.22, 2.06, ZB + 0.3));
  for (let k = 0; k < 4; k++) add(at(sph(0.06, '#5aa84f', { rough: 0.8 }, 8), FX + 0.22 + Math.cos(k * 1.6) * 0.05, 2.17 + (k % 2) * 0.04, ZB + 0.3 + Math.sin(k * 1.6) * 0.05));
  // The door, hinged on its left edge
  const door = R.dyn(new THREE.Group());
  door.position.set(FX - 0.5, 0, ZB + 0.8);
  door.add(at(rbox(1.0, 1.96, 0.09, fy, 0.04), 0.5, 1.0, 0.045));
  door.add(at(rbox(0.05, 0.62, 0.06, metal, 0.02), 0.9, 1.2, 0.12));
  door.add(at(box(0.8, 0.02, 0.02, '#f0c860'), 0.5, 1.62, 0.1));
  for (const [x, y, c, k] of [[0.25, 1.5, '#ef5b6f', 'h'], [0.66, 1.78, '#3f7bf0', 's'], [0.3, 0.95, '#3fbf7f', 'h'], [0.7, 0.7, '#c7a6ff', 's']]) {
    door.add(at(mesh(k === 'h' ? heartGeo(0.12, 0.03) : starGeo(0.07, 0.03, 0.03), mat(c)), x, y, 0.11));
  }
  const drawing = (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ef5b6f';
    ctx.fillStyle = '#ff9eb5';
    ctx.beginPath();
    ctx.moveTo(64, 70);
    ctx.bezierCurveTo(20, 40, 36, 8, 64, 30);
    ctx.bezierCurveTo(92, 8, 108, 40, 64, 70);
    ctx.fill();
    ctx.stroke();
    for (const [x, c] of [[40, '#ef5b6f'], [88, '#3f7bf0']]) {
      ctx.strokeStyle = c;
      ctx.beginPath();
      ctx.arc(x, 100, 12, 0, Math.PI * 2);
      ctx.moveTo(x, 112);
      ctx.lineTo(x, 140);
      ctx.moveTo(x - 14, 122);
      ctx.lineTo(x + 14, 122);
      ctx.stroke();
    }
    ctx.fillStyle = '#4a3423';
    ctx.font = `600 18px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('R + H', 64, 156);
  };
  door.add(rot(at(R.atlas.panel(0.28, 0.35, 128, 160, drawing), 0.52, 1.25, 0.095), 0, 0, 0.06));
  // Bins on the inside of the door
  for (const y of [0.55, 1.15]) {
    door.add(at(box(0.8, 0.12, 0.09, fwhite), 0.5, y, -0.05));
    for (let k = 0; k < 4; k++) door.add(at(cyl(0.03, 0.03, 0.18, ['#7fd3a7', '#ff9a3d', '#ffffff', '#ff8fb1'][k], 8), 0.2 + k * 0.2, y + 0.12, -0.05));
  }
  add(bake(door));
  R.col({ type: 'box', x: FX, z: ZB + 0.42, hw: 0.52, hd: 0.44 });

  // Wall clock above the fridge
  const clock = (ctx, w) => {
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath();
    ctx.arc(64, 64, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef5b6f';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(64 + Math.sin(a) * 50, 64 - Math.cos(a) * 50, i % 3 ? 3 : 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#3b2b3f';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(64, 64);
    ctx.lineTo(64, 28);
    ctx.moveTo(64, 64);
    ctx.lineTo(88, 74);
    ctx.stroke();
  };
  add(at(tor(0.24, 0.035, '#ef5b6f', undefined, P * 2, 8, 24), FX, 2.6, ZB + 0.05));
  add(at(R.atlas.wrap(new THREE.CircleGeometry(0.24, 24), 128, 128, clock), FX, 2.6, ZB + 0.04));

  // Mishmish's bowls
  add(at(cyl(0.11, 0.08, 0.06, '#ff9eb5', 14), -9.9, 0.03, ZB + 1.3));
  for (let k = 0; k < 5; k++) add(at(sph(0.025, '#b8763f', undefined, 6), -9.9 + Math.cos(k * 1.3) * 0.04, 0.065, ZB + 1.3 + Math.sin(k * 1.3) * 0.04));
  add(at(cyl(0.1, 0.08, 0.06, '#7fb0ff', 14), -9.9, 0.03, ZB + 1.0));
  add(at(cyl(0.085, 0.085, 0.01, mat('#bfe8ff', { rough: 0.1 }), 14), -9.9, 0.06, ZB + 1.0));

  // Runner rug in front of the counter
  add(at(rbox(3.7, 0.012, 0.74, '#ffd7b8', 0.005), -13.6, 0.006, ZB + 1.45));
  for (const dz of [-0.24, 0, 0.24]) add(at(box(3.6, 0.004, 0.06, '#f2a98a'), -13.6, 0.014, ZB + 1.45 + dz));

  // ---------------------------------------------------------------- dining table and chairs
  for (const [dx, dz] of [[-0.62, -0.32], [0.62, -0.32], [-0.62, 0.32], [0.62, 0.32]]) add(at(cyl(0.04, 0.035, 0.74, wood, 8), TX + dx, 0.37, TZ + dz));
  add(at(rbox(1.4, 0.05, 0.8, wood, 0.02), TX, 0.745, TZ));
  add(at(R.atlas.wrap(new RoundedBoxGeometry(1.52, 0.05, 0.92, 2, 0.02), 128, 128, gingham('#ef7a8f', '#ffc4cf'), true), TX, 0.775, TZ));
  for (const s of [-1, 1]) {
    add(at(cyl(0.17, 0.15, 0.02, white, 20), TX + s * 0.45, TT + 0.01, TZ));
    add(at(box(0.02, 0.008, 0.16, metal), TX + s * 0.45 - s * 0.22, TT + 0.004, TZ - 0.02));
    add(at(box(0.02, 0.008, 0.16, metal), TX + s * 0.45 + s * 0.22, TT + 0.004, TZ - 0.02));
    // Chair with a cushion and a heart on its back
    const chx = TX + s * 1.0;
    for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) add(at(cyl(0.025, 0.025, 0.45, wood, 6), chx + dx, 0.225, TZ + dz));
    add(at(rbox(0.46, 0.05, 0.46, wood, 0.02), chx, 0.47, TZ));
    add(at(rbox(0.4, 0.05, 0.4, '#ff9eb5', 0.02), chx, 0.5, TZ));
    add(at(rbox(0.05, 0.56, 0.46, wood, 0.02), chx + s * 0.21, 0.77, TZ));
    add(rot(at(mesh(heartGeo(0.18, 0.03), mat('#ef5b6f')), chx + s * 0.24, 0.85, TZ), 0, s * P / 2, 0));
    R.col({ type: 'box', x: chx, z: TZ, hw: 0.24, hd: 0.24, h: 0.53 });
  }
  add(at(cyl(0.06, 0.05, 0.16, '#9fd6e3', 10), TX, TT + 0.08, TZ - 0.3));
  for (const [dx, c] of [[-0.04, '#ff8fb1'], [0.04, '#ffd75e'], [0, '#ffffff']]) {
    add(at(cyl(0.006, 0.006, 0.18, '#4f9a45', 4), TX + dx, TT + 0.2, TZ - 0.3));
    add(at(sph(0.04, c, undefined, 8), TX + dx, TT + 0.3 + (c === '#ffffff' ? 0.04 : 0), TZ - 0.3));
  }
  R.col({ type: 'box', x: TX, z: TZ, hw: 0.72, hd: 0.42, h: 0.8 });

  // ---------------------------------------------------------------- actions
  const nameOf = (id) => api.looks[id]?.name || (id === 'roji' ? 'Roji' : 'Homama');
  async function openFridge(a) {
    if (st.fridgeBusy || R.state.eating) return;
    if (R.state.carrying) return a.toast('Open your gift first!', 1800);
    st.fridgeBusy = true;
    st.doorTarget = 1;
    a.sound.ui('swoosh');
    const id = await a.choose({ title: 'What would you like?', text: 'The fridge is full of treats.', options: FOODS.map((f) => ({ id: f.id, label: f.label })) });
    if (!id) {
      st.doorTarget = 0;
      st.fridgeBusy = false;
      return;
    }
    const f = FOODS.find((q) => q.id === id);
    const food = fit(await R.ctx.props.food(id), 0.3);
    food.position.set(0, -0.08, 0.06);
    R.state.eating = true;
    a.carry('player', food);
    a.sound.ui('pop');
    R.later(0.7, () => (st.doorTarget = 0));
    let bites = 0;
    const bite = () => {
      bites++;
      food.scale.setScalar(Math.max(0.05, 1 - bites * 0.3));
      a.sound.ui('tap');
      if (bites < 3) return R.later(0.55, bite);
      R.later(0.4, () => {
        a.carry('player', null);
        a.fx.heartsAt(R.headPos(a.player), 4);
        a.emote('player', 'cheer');
        a.toast(`<b>${nameOf(a.playerId)}:</b> ${f.line}`, 2600);
        R.state.eating = false;
        st.fridgeBusy = false;
      });
    };
    R.later(1.0, bite);
  }

  async function serveDish(a) {
    const [id, name] = DISHES[Math.floor(Math.random() * DISHES.length)];
    const obj = fit(await R.ctx.props.food(id), 0.42);
    if (R.state.dish) R.state.dish.obj.removeFromParent();
    obj.position.set(TX, TT + 0.01, TZ + 0.05);
    obj.scale.setScalar(0.01);
    add(obj);
    R.state.dish = { id, name, obj };
    R.tween(0.6, (k) => obj.scale.setScalar(Math.max(0.01, easeOutBack(k))));
    a.fx.burst(a.world(TX, TZ, TT + 0.3), ['#ffd166', '#ffffff', '#ff8fb1'], 24);
    a.sound.ui('win');
    a.toast(`Dinner is ready! <b>${name}</b> on the table.`, 3000);
  }

  function cook(a) {
    st.cook = 0;
    st.cooked = false;
    R.start('cook', {
      label: 'Stop cooking',
      seats: [
        { who: 'player', x: SX - 0.36, z: ZB + 1.24, yaw: P, pose: 'stand', hands: 'stir' },
        { who: 'partner', x: SX + 0.36, z: ZB + 1.24, yaw: P, pose: 'stand', hands: 'stir' },
      ],
      focus: { x: SX, z: ZB + 1.1, y: 1.1, zoom: 0.5 },
      exit: { x: SX - 0.4, z: ZB + 1.7 },
      update(dt) {
        st.cook += dt;
        if (st.cook > 5.5 && !st.cooked) {
          st.cooked = true;
          a.endActivity();
        }
      },
      onEnd(silent) {
        if (st.cooked) serveDish(a);
        else if (!silent) a.toast('The pot can wait.', 1600);
      },
    });
    a.toast(`${nameOf('homama')} and ${nameOf('roji')} cook together.`, 2400);
  }

  async function eat(a) {
    const spec = R.start('eat', {
      label: 'Get up',
      seats: [
        { who: 'player', x: TX - 0.97, z: TZ, y: 0.2, yaw: P / 2, pose: 'sit' },
        { who: 'partner', x: TX + 0.97, z: TZ, y: 0.2, yaw: -P / 2, pose: 'sit' },
      ],
      focus: { x: TX, z: TZ, y: 1.0, zoom: 0.5 },
      exit: { x: TX - 0.4, z: TZ + 1.1 },
      update(dt) {
        st.eatT = (st.eatT || 0) + dt;
        if (st.eatT > 1.6 && st.plates.length) {
          st.eatT = 0;
          st.bites = (st.bites || 0) + 1;
          for (const p of st.plates) p.scale.setScalar(Math.max(0, 1 - st.bites * 0.22));
          a.sound.ui('tap');
          a.fx.heartsAt(R.headPos(st.bites % 2 ? a.player : a.partner), 2);
          if (st.bites === 4) {
            a.toast('All gone! Thank you for dinner.', 2400);
            a.sound.ui('good');
            if (R.state.dish) {
              const d = R.state.dish.obj;
              R.tween(0.5, (k) => d.scale.setScalar(Math.max(0.01, 1 - k)), () => d.removeFromParent());
              R.state.dish = null;
            }
          }
        }
      },
      onEnd() {
        for (const p of st.plates) p.removeFromParent();
        st.plates = [];
      },
    });
    if (!spec) return;
    st.eatT = 0;
    st.bites = 0;
    a.toast(`<b>${nameOf(a.playerId)}:</b> This smells amazing!<br><b>${nameOf(a.partnerId)}:</b> Everything tastes better with you.`, 3200);
    const ids = R.state.dish ? [R.state.dish.id, R.state.dish.id] : [0, 1].map(() => FOODS[Math.floor(Math.random() * FOODS.length)].id);
    const objs = await Promise.all(ids.map((id) => R.ctx.props.food(id)));
    if (!R.is('eat')) return;
    objs.forEach((o, i) => {
      const f = fit(o, 0.22);
      f.position.set(TX + (i ? 0.45 : -0.45), TT + 0.025, TZ);
      add(f);
      st.plates.push(f);
    });
  }

  R.hot(
    { x: FX, z: ZB + 1.65, r: 1.2, label: 'Open the fridge', icon: 'fridge', act: openFridge },
    { x: SX, z: ZB + 1.65, r: 1.2, label: 'Cook together', icon: 'pot', act: cook },
    { x: TX, z: TZ + 1.05, r: 1.3, label: 'Eat together', icon: 'yum', act: eat },
  );

  R.upd((dt, t, a) => {
    st.door = damp(st.door, st.doorTarget, 5, dt);
    door.rotation.y = -easeInOut(Math.min(1, st.door)) * 1.85;
    fridgeLight.emissiveIntensity = 0.2 + st.door * 0.8;
    const cooking = R.is('cook');
    burner.emissiveIntensity = damp(burner.emissiveIntensity, cooking ? 1.3 + Math.sin(t * 13) * 0.2 : 0, 4, dt);
    ovenGlass.emissiveIntensity = 0.25 + (cooking ? 0.35 : 0);
    lid.position.y = CT + 0.275 + (cooking ? Math.max(0, Math.sin(t * 11)) * 0.025 : 0);
    lid.rotation.z = cooking ? Math.sin(t * 9) * 0.06 : 0;
    for (const s of steam) {
      const k = (t * (cooking ? 0.7 : 0.35) + s.ph) % 1;
      s.s.position.set(SX - 0.2 + Math.sin(k * 6 + s.ph * 9) * 0.07, CT + 0.35 + k * 0.8, ZB + 0.32);
      s.s.scale.setScalar(0.12 + k * (cooking ? 0.45 : 0.25));
      s.s.material.opacity = (cooking ? 0.7 : 0.35) * Math.sin(k * Math.PI);
    }
    for (const s of sizzle) {
      const k = (t * 1.7 + s.ph) % 1;
      if (k < 0.05) s.dx = (Math.random() - 0.5) * 0.24;
      s.s.position.set(SX + 0.2 + (s.dx || 0) + Math.sin(s.ph * 20) * 0.05, CT + 0.1 + Math.sin(k * Math.PI) * 0.18, ZB + 0.59 + Math.cos(s.ph * 20) * 0.06);
      s.s.visible = cooking;
      s.s.material.opacity = 1 - k;
    }
    if (cooking) {
      st.tick = (st.tick || 0) - dt;
      if (st.tick <= 0) {
        st.tick = 0.06 + Math.random() * 0.14;
        R.sound((s, t0) => s.tone(2200 + Math.random() * 2600, t0, 0.03, { type: 'square', gain: 0.008 }));
      }
    }
  });
  R.onExit(() => {
    st.doorTarget = 0;
    st.door = 0;
    if (R.state.eating) {
      api.carry('player', null);
      R.state.eating = false;
      st.fridgeBusy = false;
    }
  });
}
