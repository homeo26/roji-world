import { THREE, RoundedBoxGeometry, mat, umat, mesh, box, rbox, cyl, sph, tor, at, rot, heartGeo, starGeo, fit, glowTex, sprite, bake, FONT, roundRect, canvasTexture } from './kit.js';
import { damp, easeInOut, easeOutBack } from '../../util.js';

// Kitchen: counters with a sink and a stove, a fridge whose door really opens, the dining table and
// a baking island. Built in its own coordinates (the back wall at ZB); the interior moves it into place.
// Things on the wall go on the cutaway wall (R.hang), so they sink with it.

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
  // Open shelf over the sink with three herb pots and a little framed sign
  R.hang(at(rbox(1.3, 0.05, 0.24, wood, 0.015), -14.8, 1.62, ZB + 0.12));
  for (const s of [-1, 1]) R.hang(at(box(0.04, 0.14, 0.18, '#ffffff'), -14.8 + s * 0.58, 1.53, ZB + 0.1));
  for (let i = 0; i < 3; i++) {
    const x = -15.2 + i * 0.32;
    R.hang(at(cyl(0.07, 0.055, 0.1, ['#ffffff', '#ff9eb5', '#ffd166'][i], 10), x, 1.7, ZB + 0.13));
    for (let k = 0; k < 4; k++) R.hang(at(sph(0.05, k % 2 ? '#5aa84f' : '#7fbf5a', { rough: 0.8 }, 8), x + Math.cos(k * 1.7) * 0.04, 1.8 + (k % 2) * 0.04, ZB + 0.13 + Math.sin(k * 1.7) * 0.03));
  }
  const homeSign = (ctx, w, h) => {
    ctx.fillStyle = '#fffaf1';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ef5b6f';
    ctx.font = `600 30px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('Made with', w / 2, 56);
    ctx.font = `600 40px ${FONT}`;
    ctx.fillText('love', w / 2, 104);
    ctx.fillStyle = '#ff9eb5';
    ctx.beginPath();
    ctx.moveTo(w / 2, 150);
    ctx.bezierCurveTo(w / 2 - 26, 132, w / 2 - 16, 112, w / 2, 124);
    ctx.bezierCurveTo(w / 2 + 16, 112, w / 2 + 26, 132, w / 2, 150);
    ctx.fill();
  };
  R.hang(at(rbox(0.46, 0.56, 0.04, '#c98f5f', 0.02), -14.8, 2.25, ZB + 0.03));
  R.hang(at(R.atlas.panel(0.38, 0.48, 192, 170, homeSign), -14.8, 2.25, ZB + 0.055));

  // Prep corner: cutting board, carrot, tomato, utensil crock, jars on a shelf, hanging spoons
  add(at(rbox(0.5, 0.03, 0.32, wood, 0.01), -13.62, CT + 0.015, ZB + 0.45));
  add(rot(at(cyl(0.03, 0.004, 0.22, '#ff8a3d', 8), -13.7, CT + 0.06, ZB + 0.45), 0, 0, P / 2 - 0.2));
  add(at(sph(0.06, '#ef3b4d', { rough: 0.45 }, 10), -13.48, CT + 0.09, ZB + 0.42));
  add(at(cyl(0.07, 0.06, 0.18, '#ffffff', 12), -13.25, CT + 0.09, ZB + 0.18));
  for (const [dx, c] of [[-0.03, '#c98f5f'], [0.03, '#ef5b6f'], [0, '#63c7ba']]) add(at(cyl(0.01, 0.01, 0.22, c, 5), -13.25 + dx, CT + 0.25, ZB + 0.18));
  R.hang(at(box(0.7, 0.04, 0.22, wood), -13.5, 1.78, ZB + 0.11));
  ['#ffd166', '#ef5b6f', '#7fd3ff'].forEach((c, i) => {
    R.hang(at(cyl(0.07, 0.07, 0.18, mat('#fff7ea', { rough: 0.3 }), 12), -13.72 + i * 0.22, 1.89, ZB + 0.12));
    R.hang(at(cyl(0.074, 0.074, 0.04, c, 12), -13.72 + i * 0.22, 2.0, ZB + 0.12));
  });
  R.hang(rot(at(cyl(0.012, 0.012, 0.6, metal, 6), -13.5, 1.45, ZB + 0.06), 0, 0, P / 2));
  for (const [dx, c] of [[-0.18, '#ef5b6f'], [0, '#ffd166'], [0.18, '#63c7ba']]) {
    R.hang(at(cyl(0.008, 0.008, 0.22, c, 5), -13.5 + dx, 1.33, ZB + 0.07));
    R.hang(at(sph(0.035, c, undefined, 8), -13.5 + dx, 1.2, ZB + 0.07)).scale.set(1, 0.4, 1);
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
  R.hang(at(rbox(1.0, 0.32, 0.55, '#ffffff', 0.05), SX, 2.0, ZB + 0.3));
  R.hang(at(box(0.42, 1.05, 0.34, '#ffffff'), SX, 2.66, ZB + 0.18));
  R.hang(at(box(0.5, 0.02, 0.2, mat('#fff1c9', { emissive: '#ffd27a', ei: 0.9 })), SX, 1.835, ZB + 0.35));
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
  R.hang(at(rbox(0.5, 0.38, 0.03, wood, 0.02), -11.62, 1.62, ZB + 0.02));
  R.hang(at(R.atlas.panel(0.46, 0.34, 256, 192, menu), -11.62, 1.62, ZB + 0.04));

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
  // Sticky note on the door: a new one every visit
  const noteCanvas = document.createElement('canvas');
  noteCanvas.width = noteCanvas.height = 128;
  const noteTex = new THREE.CanvasTexture(noteCanvas);
  noteTex.colorSpace = THREE.SRGBColorSpace;
  const sticky = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), umat('#ffffff', { rough: 0.9, map: noteTex }));
  sticky.position.set(0.74, 1.0, 0.096);
  sticky.rotation.z = -0.08;
  door.add(sticky);
  // Bins on the inside of the door
  for (const y of [0.55, 1.15]) {
    door.add(at(box(0.8, 0.12, 0.09, fwhite), 0.5, y, -0.05));
    for (let k = 0; k < 4; k++) door.add(at(cyl(0.03, 0.03, 0.18, ['#7fd3a7', '#ff9a3d', '#ffffff', '#ff8fb1'][k], 8), 0.2 + k * 0.2, y + 0.12, -0.05));
  }
  add(bake(door, [sticky]));
  R.col({ type: 'box', x: FX, z: ZB + 0.42, hw: 0.52, hd: 0.44 });
  const FRIDGE_NOTES = [
    ['Cake on the', 'second shelf!', '- H'],
    ['Drink water,', 'Dr. Roji!', '- H'],
    ['You forgot', 'your lunch', 'again! - R'],
    ['I am proud', 'of you.', 'Love, H'],
    ['Good luck', 'at work today!', '- H'],
    ['The cookies', 'are all yours.', '- H'],
    ['Buy milk', 'and roses.', '- R + H'],
    ['You are my', 'sunshine.', '- H'],
  ];
  const drawNote = () => {
    const i = api.load('fridgeNote', 0) % FRIDGE_NOTES.length;
    api.save('fridgeNote', i + 1);
    const c = noteCanvas.getContext('2d');
    c.fillStyle = ['#fff1a8', '#ffd6e0', '#d6f0ff'][i % 3];
    c.fillRect(0, 0, 128, 128);
    c.fillStyle = 'rgba(0,0,0,0.06)';
    c.fillRect(0, 0, 128, 16);
    c.fillStyle = '#4a3423';
    c.textAlign = 'center';
    c.font = `600 19px ${FONT}`;
    FRIDGE_NOTES[i].forEach((l, j) => c.fillText(l, 64, 46 + j * 28));
    noteTex.needsUpdate = true;
  };
  drawNote();
  R.onEnter(drawNote);

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
  R.hang(at(tor(0.24, 0.035, '#ef5b6f', undefined, P * 2, 8, 24), FX, 2.6, ZB + 0.05));
  R.hang(at(R.atlas.wrap(new THREE.CircleGeometry(0.24, 24), 128, 128, clock), FX, 2.6, ZB + 0.04));

  // Mishmish's bowls
  const BW = -7.0;
  add(at(cyl(0.11, 0.08, 0.06, '#ff9eb5', 14), BW, 0.03, ZB + 1.85));
  for (let k = 0; k < 5; k++) add(at(sph(0.025, '#b8763f', undefined, 6), BW + Math.cos(k * 1.3) * 0.04, 0.065, ZB + 1.85 + Math.sin(k * 1.3) * 0.04));
  add(at(cyl(0.1, 0.08, 0.06, '#7fb0ff', 14), BW, 0.03, ZB + 2.15));
  add(at(cyl(0.085, 0.085, 0.01, mat('#bfe8ff', { rough: 0.1 }), 14), BW, 0.06, ZB + 2.15));
  add(rot(at(rbox(0.5, 0.008, 0.6, '#ffd6e0', 0.004), BW, 0.004, ZB + 2.0), 0, 0, 0));

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
  // Easter egg: R + H carved in a heart on the bar under the table
  add(at(box(1.24, 0.06, 0.04, wood), TX, 0.2, TZ + 0.32));
  const carve = (ctx, w, h) => {
    ctx.fillStyle = '#c98f5f';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#8a5a34';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w / 2, h - 6);
    ctx.bezierCurveTo(w / 2 - 34, h * 0.5, w / 2 - 20, 4, w / 2, h * 0.32);
    ctx.bezierCurveTo(w / 2 + 20, 4, w / 2 + 34, h * 0.5, w / 2, h - 6);
    ctx.stroke();
    ctx.fillStyle = '#8a5a34';
    ctx.font = `600 ${Math.round(h * 0.36)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('R+H', w / 2, h * 0.52);
  };
  add(at(R.atlas.panel(0.1, 0.055, 96, 52, carve), TX + 0.35, 0.2, TZ + 0.342));

  // ---------------------------------------------------------------- matching mugs
  // A pink mug and a blue mug: each has half a heart, and they always stand together
  const halfHeart = (side) => (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = side < 0 ? '#ffffff' : '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ef5b6f';
    ctx.beginPath();
    const cx = side < 0 ? w : 0;
    ctx.moveTo(cx, h * 0.9);
    ctx.bezierCurveTo(cx - side * w * 0.95, h * 0.5, cx - side * w * 0.7, h * 0.02, cx, h * 0.32);
    ctx.lineTo(cx, h * 0.9);
    ctx.fill();
  };
  for (const [x, c, side] of [[-11.95, '#ff9eb5', -1], [-11.84, '#7fb0ff', 1]]) {
    add(at(cyl(0.05, 0.046, 0.1, c, 12), x, CT + 0.05, ZB + 0.66));
    add(at(cyl(0.043, 0.043, 0.01, '#8a5a3c', 12), x, CT + 0.095, ZB + 0.66));
    add(rot(at(tor(0.026, 0.008, c, undefined, P * 2, 4, 10), x - side * 0.055, CT + 0.05, ZB + 0.66), 0, 0, P / 2));
    add(at(R.atlas.panel(0.035, 0.05, 32, 48, halfHeart(side)), x + side * -0.017, CT + 0.05, ZB + 0.712));
  }

  // ---------------------------------------------------------------- baking island
  const IX = -8.5;
  const IZ = -1.1;
  add(at(rbox(1.5, 0.84, 0.72, mint, 0.03), IX, 0.42, IZ));
  add(at(rbox(1.62, 0.06, 0.84, top, 0.02), IX, 0.87, IZ));
  for (const s of [-1, 1]) add(at(rbox(0.6, 0.6, 0.02, mintLight, 0.02), IX + s * 0.36, 0.44, IZ + 0.37));
  R.col({ type: 'box', x: IX, z: IZ, hw: 0.82, hd: 0.43, h: 0.9 });
  const IT = 0.9;
  // Flour bag, rolling pin, a mixing bowl and the cooling rack
  add(at(rbox(0.18, 0.24, 0.12, '#fff7ea', 0.04), IX - 0.62, IT + 0.12, IZ - 0.22));
  add(at(box(0.12, 0.05, 0.005, '#3f7bf0'), IX - 0.62, IT + 0.15, IZ - 0.158));
  add(rot(at(cyl(0.035, 0.035, 0.36, '#e2c29a', 10), IX + 0.05, IT + 0.035, IZ - 0.28), 0, 0.3, P / 2));
  add(at(cyl(0.13, 0.08, 0.12, '#ffffff', 16), IX + 0.55, IT + 0.06, IZ - 0.2));
  add(at(cyl(0.11, 0.11, 0.02, '#f6dcb8', 14), IX + 0.55, IT + 0.11, IZ - 0.2));
  add(at(box(0.5, 0.012, 0.32, metal), IX + 0.45, IT + 0.05, IZ + 0.18));
  for (const s of [-1, 1]) for (const t2 of [-1, 1]) add(at(cyl(0.006, 0.006, 0.05, metal, 4), IX + 0.45 + s * 0.23, IT + 0.025, IZ + 0.18 + t2 * 0.14));
  // Dough and cookie tray used while baking
  const dough = R.dyn(add(at(cyl(0.2, 0.22, 0.05, '#f2d3a3', 20), IX - 0.15, IT + 0.025, IZ + 0.05)));
  dough.visible = false;
  const tray = R.dyn(new THREE.Group());
  tray.add(at(rbox(0.5, 0.02, 0.36, metal, 0.008), 0, 0.01, 0));
  const cookieMat = umat('#f6dcb8', { rough: 0.7 });
  const hgeo = heartGeo(0.08, 0.025);
  const cookies = [];
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Mesh(hgeo, cookieMat);
    c.rotation.x = -P / 2;
    c.position.set(-0.16 + (i % 3) * 0.16, 0.035, -0.08 + Math.floor(i / 3) * 0.16);
    c.visible = false;
    tray.add(c);
    cookies.push(c);
  }
  tray.position.set(IX - 0.25, IT, IZ + 0.12);
  tray.visible = false;
  add(tray);
  const bakeSt = { t: 0, phase: 0 };

  function bakeCookies(a) {
    bakeSt.t = 0;
    bakeSt.phase = 0;
    const spec = R.start('bake', {
      label: 'Stop baking',
      seats: [
        { who: 'player', x: IX - 0.4, z: IZ - 0.78, yaw: 0, pose: 'stand', hands: 'stir' },
        { who: 'partner', x: IX + 0.4, z: IZ - 0.78, yaw: 0, pose: 'stand', hands: 'stir' },
      ],
      focus: { x: IX - 0.6, z: IZ - 0.8, y: 1.0, zoom: 0.62 },
      exit: { x: IX - 0.4, z: IZ + 0.9 },
      update(dt, t) {
        bakeSt.t += dt;
        const T = bakeSt.t;
        dough.scale.set(1 + Math.min(1, T / 2) * 0.5, 1 - Math.min(1, T / 2) * 0.5, 1 + Math.min(1, T / 2) * 0.5);
        const shown = Math.min(6, Math.floor((T - 1.2) / 0.45) + 1);
        cookies.forEach((c, i) => {
          if (i < shown && !c.visible) {
            c.visible = true;
            a.sound.ui('tick');
          }
        });
        if (bakeSt.phase === 0 && T > 4.2) {
          bakeSt.phase = 1;
          dough.visible = false;
          for (const w of [a.player, a.partner]) w.kid.hands = null;
          const from = tray.position.clone();
          R.tween(0.7, (k) => {
            tray.position.set(from.x + (SX - from.x) * k, from.y + Math.sin(k * P) * 0.4 - k * 0.5, from.z + (ZB + 0.95 - from.z) * k);
            tray.scale.setScalar(1 - k * 0.5);
          }, () => (tray.visible = false));
          a.sound.ui('swoosh');
          a.toast('Into the oven they go!', 2000);
        }
        if (bakeSt.phase === 1) {
          ovenGlass.emissiveIntensity = 1.2 + Math.sin(t * 6) * 0.2;
          if (Math.floor(T * 2) !== Math.floor((T - dt) * 2)) R.sound((s, t0) => s.tone(1800, t0, 0.03, { type: 'square', gain: 0.012 }));
          if (T > 5.0 && !bakeSt.danced) {
            bakeSt.danced = true;
            a.emote('player', 'dance');
            a.emote('partner', 'dance');
          }
        }
        if (bakeSt.phase === 1 && T > 8.2) {
          bakeSt.phase = 2;
          cookieMat.color.set('#d99a52');
          tray.visible = true;
          tray.scale.setScalar(1);
          const to = new THREE.Vector3(IX + 0.45, IT + 0.06, IZ + 0.18);
          const from = new THREE.Vector3(SX, CT - 0.4, ZB + 0.95);
          R.tween(0.7, (k) => tray.position.set(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k + Math.sin(k * P) * 0.4, from.z + (to.z - from.z) * k));
          R.sound((s, t0) => [0, 0.12].forEach((d) => s.tone(1568, t0 + d, 0.4, { type: 'sine', gain: 0.07 })));
          R.later(0.8, () => {
            a.fx.burst(a.world(IX + 0.45, IZ + 0.18, 1.3), ['#ffd166', '#ffffff', '#d99a52', '#ff8fb1'], 30);
            a.fx.heartsAt(R.headPos(a.partner), 3);
            a.emote('partner', 'heart');
            a.toast('Ding! <b>Fresh heart cookies!</b> They smell so good. Eat them at the table.', 3400);
            if (R.state.dish) R.state.dish.obj.removeFromParent();
            R.state.dish = { id: 'cookies', name: 'Heart cookies', obj: tray, keep: true };
          });
        }
        if (bakeSt.phase === 2 && T > 11) a.endActivity();
      },
      onEnd() {
        dough.visible = false;
        if (bakeSt.phase < 2) {
          tray.visible = false;
          for (const c of cookies) c.visible = false;
        }
      },
    });
    if (!spec) return;
    cookieMat.color.set('#f6dcb8');
    for (const c of cookies) c.visible = false;
    tray.visible = true;
    tray.scale.setScalar(1);
    tray.position.set(IX - 0.25, IT, IZ + 0.12);
    dough.visible = true;
    dough.scale.setScalar(1);
    bakeSt.danced = false;
    a.toast(`${nameOf('roji')} rolls the dough, ${nameOf('homama')} cuts little hearts.`, 2600);
  }

  // ---------------------------------------------------------------- doing the dishes
  const soapTex = canvasTexture(64, 64, (ctx) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(200,235,255,0.3)';
    ctx.beginPath();
    ctx.arc(32, 32, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(22, 22, 7, 4, -0.7, 0, Math.PI * 2);
    ctx.fill();
  });
  const soap = [];
  for (let i = 0; i < 10; i++) {
    const b = R.dyn(add(sprite(soapTex, { scale: 0.1 })));
    b.visible = false;
    soap.push({ s: b, ph: i / 10, dx: (Math.random() - 0.5) * 0.5 });
  }
  const clean = [];
  for (let i = 0; i < 4; i++) {
    const p = R.dyn(add(at(cyl(0.13, 0.11, 0.018, ['#ffffff', '#ffd6e0', '#d6f0ff', '#fff1a8'][i], 18), -15.5, CT + 0.012 + i * 0.022, ZB + 0.45)));
    p.visible = false;
    clean.push(p);
  }
  const towel = new THREE.Group();
  towel.add(at(rbox(0.22, 0.28, 0.03, '#ff9eb5', 0.01), 0, -0.05, 0.05));
  towel.add(at(box(0.22, 0.03, 0.032, '#ffffff'), 0, -0.12, 0.05));
  const dishSt = { t: 0, n: 0 };
  function dishes(a) {
    dishSt.t = 0;
    dishSt.n = 0;
    const spec = R.start('dishes', {
      label: 'Stop washing',
      seats: [
        { who: 'player', x: -15.1, z: ZB + 1.22, yaw: P, pose: 'stand', hands: 'stir' },
        { who: 'partner', x: -14.35, z: ZB + 1.22, yaw: P, pose: 'stand' },
      ],
      focus: { x: -14.8, z: ZB + 1.0, y: 1.15, zoom: 0.5 },
      exit: { x: -14.8, z: ZB + 1.8 },
      update(dt, t) {
        dishSt.t += dt;
        for (const b of soap) {
          const k = (t * 0.45 + b.ph) % 1;
          b.s.visible = true;
          b.s.position.set(-14.8 + b.dx + Math.sin(k * 6 + b.ph * 10) * 0.08, CT + 0.05 + k * 1.1, ZB + 0.4 + Math.cos(b.ph * 10) * 0.1);
          b.s.scale.setScalar(0.05 + b.ph * 0.07);
          b.s.material.opacity = k < 0.85 ? 1 : (1 - k) * 6;
        }
        a.partner.kid.arms[0].rotation.x = -1.2 + Math.sin(t * 8) * 0.15;
        const n = Math.min(4, Math.floor(dishSt.t / 1.5));
        if (n > dishSt.n) {
          dishSt.n = n;
          const p = clean[n - 1];
          p.visible = true;
          p.scale.setScalar(0.01);
          R.tween(0.35, (k) => p.scale.setScalar(Math.max(0.01, easeOutBack(k))));
          a.fx.burst(a.world(-15.5, ZB + 0.45, CT + 0.2), ['#ffffff', '#bfe8ff'], 8);
          a.sound.ui('coin');
          if (n === 2) a.toast(`<b>${nameOf(a.partnerId)}:</b> You wash, I dry. Best team.`, 2400);
          if (n === 4) {
            a.toast('Squeaky clean! Every plate sparkles.', 2400);
            a.fx.heartsAt(R.headPos(a.player), 3);
            R.later(1.6, () => R.is('dishes') && a.endActivity());
          }
        }
      },
      onEnd() {
        for (const b of soap) b.s.visible = false;
        for (const p of clean) p.visible = false;
        a.carry('partner', null);
      },
    });
    if (!spec) return;
    a.carry('partner', towel);
    a.partner.kid.hands = 'hold';
    a.toast('Dishes together, with lots of bubbles.', 2200);
  }

  // ---------------------------------------------------------------- the window, a lemon tree and the height marks
  R.sideWindow(11.98, 4.6, 1.7, 1.1, 0.85, -1, '#ffb3a7');
  for (let k = 0; k < 3; k++) {
    add(at(cyl(0.06, 0.05, 0.09, ['#ffffff', '#ff9eb5', '#9fd6e3'][k], 10), -6.46, 1.25, -0.95 + k * 0.25));
    for (let j = 0; j < 3; j++) add(at(sph(0.045, '#5aa84f', { rough: 0.8 }, 8), -6.46 + Math.cos(j * 2) * 0.03, 1.34 + (j % 2) * 0.03, -0.95 + k * 0.25 + Math.sin(j * 2) * 0.03));
  }
  add(at(cyl(0.26, 0.2, 0.46, '#e07a55', 14), -6.95, 0.23, 2.4));
  add(at(cyl(0.035, 0.05, 0.7, '#9b6a43', 8), -6.95, 0.8, 2.4));
  for (const [dx, dy, dz, rr] of [[0, 1.35, 0, 0.36], [0.22, 1.2, 0.1, 0.26], [-0.2, 1.22, -0.08, 0.27]]) add(at(sph(rr, dx > 0 ? '#76c25c' : '#5aa84f', { rough: 0.85 }, 12), -6.95 + dx, dy, 2.4 + dz));
  for (let i = 0; i < 6; i++) add(at(sph(0.045, '#ffe14d', { rough: 0.5 }, 8), -6.95 + Math.cos(i * 2.2) * 0.3, 1.2 + Math.sin(i * 1.4) * 0.12, 2.4 + Math.sin(i * 2.2) * 0.3 + 0.05));
  R.col({ type: 'circle', x: -6.95, z: 2.4, r: 0.3 });
  // Easter egg: pencil height marks on the kitchen door frame (Roji, Homama, and a tiny one for Mishmish)
  const marks = (ctx, w, h) => {
    ctx.fillStyle = '#6cc9a9';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2f5a4a';
    ctx.fillStyle = '#2f5a4a';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.font = `600 13px ${FONT}`;
    for (const [y, t] of [[0.18, 'H'], [0.32, 'R'], [0.86, 'M']]) {
      ctx.beginPath();
      ctx.moveTo(4, y * h);
      ctx.lineTo(w - 4, y * h);
      ctx.stroke();
      ctx.fillText(t, w / 2, y * h - 5);
    }
    ctx.fillStyle = '#ef5b6f';
    ctx.beginPath();
    const hx = w / 2;
    const hy = 0.25 * h;
    ctx.moveTo(hx, hy + 5);
    ctx.bezierCurveTo(hx - 7, hy, hx - 4, hy - 6, hx, hy - 2);
    ctx.bezierCurveTo(hx + 4, hy - 6, hx + 7, hy, hx, hy + 5);
    ctx.fill();
  };
  R.hang(at(R.atlas.panel(0.1, 1.5, 32, 400, marks), -9.76, 0.95, ZB + 0.052));

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
    if (R.state.dish) {
      if (R.state.dish.keep) R.state.dish.obj.visible = false;
      else R.state.dish.obj.removeFromParent();
    }
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
              if (R.state.dish.keep) R.tween(0.5, (k) => d.scale.setScalar(Math.max(0.01, 1 - k)), () => (d.visible = false));
              else R.tween(0.5, (k) => d.scale.setScalar(Math.max(0.01, 1 - k)), () => d.removeFromParent());
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
    { x: FX, z: ZB + 1.65, r: 1.1, label: 'Open the fridge', icon: 'fridge', act: openFridge },
    { x: SX, z: ZB + 1.65, r: 1.1, label: 'Cook together', icon: 'pot', act: cook },
    { x: TX, z: TZ + 1.05, r: 1.3, label: 'Eat together', icon: 'yum', act: eat },
    { x: IX, z: IZ + 0.9, r: 1.2, label: 'Bake cookies together', icon: 'cookie', act: bakeCookies },
    { x: -14.8, z: ZB + 1.65, r: 1.0, label: 'Do the dishes together', icon: 'dish', act: dishes },
  );

  R.upd((dt, t, a) => {
    st.door = damp(st.door, st.doorTarget, 5, dt);
    door.rotation.y = -easeInOut(Math.min(1, st.door)) * 1.85;
    fridgeLight.emissiveIntensity = 0.2 + st.door * 0.8;
    const cooking = R.is('cook');
    burner.emissiveIntensity = damp(burner.emissiveIntensity, cooking ? 1.3 + Math.sin(t * 13) * 0.2 : 0, 4, dt);
    if (!R.is('bake')) ovenGlass.emissiveIntensity = 0.25 + (cooking ? 0.35 : 0);
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
