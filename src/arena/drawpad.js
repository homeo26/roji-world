import { makeSky } from '../places/home/kit.js';
import { COL, box, rbox, cyl, sph, at, rot, mat, mesh, canvasTexture, pattern, colorBake, makeEasel, makePlant, makeStool, speechBubble, woodFloorTex } from '../interiors/clay/models.js';
import { injectClayStyle, mountInArena, makeToast, onTap } from '../interiors/clay/ui.js';
import { ICONS } from '../icons.js';

// Drawing Pad: an art corner with an easel. Draw on the 3D paper with brushes, colours, an eraser
// and stamps, undo, clear and save. Saved drawings go to the gallery that the home's picture frames
// show (localStorage 'roji-game-drawpad-gallery', newest last). The partner poses as the model.

const GALLERY_KEY = 'roji-game-drawpad-gallery';
const GALLERY_MAX = 12;
const SAVE_W = 800;
const OPS_MAX = 30; // ops kept for undo; older ones are flattened into the base layer
const PAPER = '#fffdf8';
const PW = 1200;
const PH = 900;
const CW = 1.2; // paper size on the easel, metres
const CH = 0.9;
const C = '#ec5f9e';

const COLORS = [
  ['Ink', '#3b2b3f'],
  ['Red', '#e5484d'],
  ['Pink', '#ec5f9e'],
  ['Orange', '#ff7a59'],
  ['Yellow', '#ffd166'],
  ['Lime', '#9bd65b'],
  ['Green', '#3fbf7f'],
  ['Teal', '#2cb5c0'],
  ['Blue', '#3f7bf0'],
  ['Purple', '#8b5cf6'],
  ['Brown', '#a0602e'],
  ['Peach', '#f8cdb4'],
];
const SIZES = [4, 10, 22]; // brush width per 1000 px of paper
const STAMP_SIZES = [60, 100, 160];

function starPath() {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 4.4 : 10.2;
    d += (i ? 'L' : 'M') + (12 + r * Math.cos(a)).toFixed(2) + ' ' + (12.8 + r * Math.sin(a)).toFixed(2);
  }
  return d + 'Z';
}
const circ = (cx, cy, r) => `M${cx + r} ${cy}a${r} ${r} 0 1 0 ${-2 * r} 0a${r} ${r} 0 1 0 ${2 * r} 0`;
function petalsPath() {
  let d = '';
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
    d += circ(+(12 + 5.4 * Math.cos(a)).toFixed(2), +(12 + 5.4 * Math.sin(a)).toFixed(2), 4.3);
  }
  return d;
}
function raysPath() {
  let d = '';
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    d += `M${(12 + 7.6 * Math.cos(a)).toFixed(2)} ${(12 + 7.6 * Math.sin(a)).toFixed(2)}L${(12 + 10.6 * Math.cos(a)).toFixed(2)} ${(12 + 10.6 * Math.sin(a)).toFixed(2)}`;
  }
  return d;
}
const SHAPES = {
  heart: { fill: 'M12 21s-8.5-5.2-8.5-11.2A4.6 4.6 0 0 1 12 7.2a4.6 4.6 0 0 1 8.5 2.6C20.5 15.8 12 21 12 21z' },
  star: { fill: starPath() },
  flower: { fill: petalsPath(), center: circ(12, 12, 3.6) },
  sun: { fill: circ(12, 12, 5.6), rays: raysPath() },
};
const STAMPS = ['heart', 'star', 'flower', 'sun'];

function stampSvg(shape, color, px) {
  const s = SHAPES[shape];
  const center = color === '#ffd166' ? '#ff7a59' : '#ffd166';
  return `<svg width="${px}" height="${px}" viewBox="0 0 24 24" aria-hidden="true">${s.rays ? `<path d="${s.rays}" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>` : ''}<path d="${s.fill}" fill="${color}"/>${s.center ? `<path d="${s.center}" fill="${center}"/>` : ''}</svg>`;
}
const lineIcon = (d, px = 20) => `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const ICON = {
  undo: 'M9 5 4 10l5 5 M4 10h10a5.5 5.5 0 0 1 0 11h-3',
  clear: 'M5 7h14 M10 7V4.5h4V7 M7 7l1 13h8l1-13 M10.5 11v5.5 M13.5 11v5.5',
  save: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z M4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 18 M15.5 8.5h.01',
  done: ICONS.check || 'M5 12l5 5 9-10',
  grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
};
const ERASER = `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(-35 12 12)"><rect x="4" y="8" width="16" height="8.5" rx="2.6" fill="#ffb7cb" stroke="currentColor" stroke-width="2"/><path d="M10 8v8.5" stroke="currentColor" stroke-width="2"/></g></svg>`;

const PATHS = {};
const path2d = (d) => (PATHS[d] ||= new Path2D(d));
function drawStamp(ctx, shape, x, y, d, color) {
  const s = SHAPES[shape];
  ctx.save();
  ctx.translate(x - d / 2, y - d / 2);
  ctx.scale(d / 24, d / 24);
  if (s.rays) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.stroke(path2d(s.rays));
  }
  ctx.fillStyle = color;
  ctx.fill(path2d(s.fill));
  if (s.center) {
    ctx.fillStyle = color === '#ffd166' ? '#ff7a59' : '#ffd166';
    ctx.fill(path2d(s.center));
  }
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.beginPath();
  ctx.ellipse(shape === 'heart' ? 8 : 9.5, shape === 'heart' ? 9.6 : 9, 1.6, 1.1, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Tall screens get a dock under the easel; short (phone) screens get a column on each side.
const CSS = `
.dp-ui { position: absolute; inset: 0; pointer-events: none; --b: 46px; --g: 5px; }
.dp-colors, .dp-tools { position: absolute; left: 0; right: 0; margin: 0 auto; width: max-content; max-width: calc(100% - 20px); display: flex; flex-wrap: wrap; justify-content: center; gap: var(--g); pointer-events: auto; background: rgba(255,250,243,.92); border-radius: 20px; padding: 7px; box-shadow: 0 6px 18px rgba(60,30,40,.15); }
.dp-colors { bottom: calc(max(12px, env(safe-area-inset-bottom)) + var(--b) + 26px); }
.dp-tools { bottom: max(12px, env(safe-area-inset-bottom)); }
.dp-b { width: var(--b); height: var(--b); border: 0; border-radius: 14px; background: #fffaf3; box-shadow: 0 2px 6px rgba(52,40,70,.12), inset 0 -3px 0 rgba(0,0,0,.06); display: grid; place-items: center; padding: 0; color: #3b2b3f; position: relative; cursor: pointer; transition: transform .12s; flex: none; }
.dp-b:active { transform: scale(.94); }
.dp-b[aria-pressed="true"] { box-shadow: 0 0 0 3px ${C}, 0 4px 10px rgba(236,95,158,.3); }
.dp-b small { position: absolute; bottom: 2px; left: 0; right: 0; font-size: .6rem; font-weight: 600; color: #6f5f73; line-height: 1; text-align: center; }
.dp-b.cap svg { margin-bottom: 9px; }
.dp-b.primary { background: ${C}; color: #fff; }
.dp-b.primary small { color: #fff; }
.dp-sw { border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(52,40,70,.2), inset 0 -5px 7px rgba(0,0,0,.12), inset 0 5px 7px rgba(255,255,255,.35); }
.dp-sw[aria-pressed="true"] { box-shadow: 0 0 0 3px ${C}, inset 0 -5px 7px rgba(0,0,0,.12); transform: scale(1.06); }
.dp-sep { width: 2px; align-self: stretch; background: rgba(59,43,63,.1); border-radius: 2px; margin: 4px 2px; }
@media (max-height: 520px) {
  .dp-ui { --b: clamp(34px, calc((100vh - 84px - 6 * 4px) / 7), 46px); --g: 4px; }
  .dp-colors, .dp-tools { display: grid; grid-template-columns: repeat(2, var(--b)); grid-auto-rows: var(--b); top: 60px; bottom: auto; margin: 0; padding: 5px; border-radius: 16px; align-content: start; }
  .dp-colors { left: max(10px, env(safe-area-inset-left)); right: auto; }
  .dp-tools { left: auto; right: max(10px, env(safe-area-inset-right)); }
  .dp-sep { display: none; }
  .dp-b { border-radius: 12px; }
  .dp-b small { font-size: .55rem; }
}
.dp-modal { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(59,43,63,.35); pointer-events: auto; padding: 10px; }
.dp-modal.hidden { display: none; }
.dp-sheet { background: #fffaf3; border-radius: 22px; padding: 14px 16px; box-shadow: 0 20px 60px rgba(40,20,30,.35); max-width: 100%; max-height: 100%; display: flex; flex-direction: column; gap: 10px; align-items: center; text-align: center; min-height: 0; font-family: var(--font, system-ui); }
.dp-sheet h3 { margin: 0; font-size: 1.2rem; }
.dp-sheet p { margin: 0; color: #6f5f73; font-size: .92rem; }
.dp-sheet .row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.dp-big { max-width: 100%; min-height: 0; flex: 1 1 auto; object-fit: contain; border-radius: 12px; box-shadow: 0 2px 10px rgba(52,40,70,.15); background: #fff; }
.dp-grid { display: grid; gap: 8px; }
.dp-thumb { padding: 0; border: 0; border-radius: 10px; overflow: hidden; background: #fff; box-shadow: 0 2px 6px rgba(52,40,70,.15); cursor: pointer; }
.dp-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

export default {
  id: 'drawpad',
  title: 'Drawing Pad',
  tagline: 'Paint a picture and keep it',

  async start(ctx) {
    const { THREE, scene, camera, hud, input, sound, fx, renderer } = ctx;
    const { damp, clamp, easeInOut } = ctx.util;
    injectClayStyle('drawpad', CSS);
    const P = Math.PI;
    const tmp = new THREE.Vector3();
    const tmp2 = new THREE.Vector3();

    // ---------------------------------------------------------------- room
    const env = ctx.env.indoor({ color: '#fde4d4' });
    env.sun.position.set(-2.5, 6, 6);
    env.hemi.intensity = 1.7;
    const room = new THREE.Group();
    scene.add(room);
    const add = (...o) => (room.add(...o), o[0]);
    const BACK = -2.1;
    const ft = woodFloorTex();
    ft.repeat.set(5, 4);
    const floor = mesh(new THREE.PlaneGeometry(10, 7), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.85 }), { cast: false });
    floor.rotation.x = -P / 2;
    add(at(floor, 0, 0, 1.3));
    const wallTex = pattern(128, 128, '#ffe9dc', (c, w) => {
      c.fillStyle = '#ffd6c4';
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.arc((i + 0.5 + (j % 2) * 0.5) * (w / 4), (j + 0.5) * (w / 4), 5, 0, P * 2);
        c.fill();
      }
    });
    wallTex.repeat.set(7, 2.2);
    add(at(mesh(new THREE.BoxGeometry(10, 3.4, 0.2), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 })), 0, 1.7, BACK - 0.1));
    add(at(box(10, 0.9, 0.04, '#f6c3b0'), 0, 0.45, BACK + 0.02));
    add(at(box(10, 0.06, 0.06, '#ffffff'), 0, 0.92, BACK + 0.04));
    const sky = makeSky();
    for (const x of [-2.2, 2.3]) {
      add(at(rbox(1.38, 1.18, 0.08, '#ffffff', 0.04), x, 1.75, BACK + 0.04));
      add(at(mesh(new THREE.PlaneGeometry(1.2, 1.0), sky.material, { cast: false }), x, 1.75, BACK + 0.085));
      add(at(box(0.05, 1.0, 0.04, '#ffffff'), x, 1.75, BACK + 0.1));
      add(at(box(1.2, 0.05, 0.04, '#ffffff'), x, 1.75, BACK + 0.1));
      add(at(box(1.5, 0.06, 0.16, '#ffffff'), x, 1.15, BACK + 0.1));
      for (const s of [-1, 1]) add(at(rbox(0.28, 1.4, 0.07, '#9fd8ef', 0.035), x + s * 0.76, 1.73, BACK + 0.18));
    }
    // Splattered rug under the easel
    const rug = mesh(new THREE.CircleGeometry(1.15, 36), new THREE.MeshStandardMaterial({
      roughness: 0.95,
      map: canvasTexture(256, 256, (c, w) => {
        c.fillStyle = '#fff3e4';
        c.fillRect(0, 0, w, w);
        c.strokeStyle = '#f2b79c';
        c.lineWidth = 10;
        c.beginPath();
        c.arc(w / 2, w / 2, w / 2 - 12, 0, P * 2);
        c.stroke();
        const cols = ['#ec5f9e', '#ffd166', '#2cb5c0', '#9bd65b', '#8b5cf6', '#ff7a59'];
        for (let i = 0; i < 26; i++) {
          c.fillStyle = cols[i % cols.length];
          const a = i * 2.39;
          const r = 20 + ((i * 37) % 90);
          c.beginPath();
          c.arc(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r, 4 + (i % 4) * 2.5, 0, P * 2);
          c.fill();
        }
      }),
    }), { cast: false });
    rug.rotation.x = -P / 2;
    add(at(rug, -0.3, 0.008, 0.4));

    // The easel and the paper
    const cv = document.createElement('canvas');
    cv.width = PW;
    cv.height = PH;
    const g2 = cv.getContext('2d');
    const paperTex = new THREE.CanvasTexture(cv);
    paperTex.colorSpace = THREE.SRGBColorSpace;
    paperTex.generateMipmaps = false;
    paperTex.minFilter = THREE.LinearFilter;
    paperTex.anisotropy = 4;
    const paperMat = new THREE.MeshStandardMaterial({ map: paperTex, emissiveMap: paperTex, emissive: '#ffffff', emissiveIntensity: 0.45, roughness: 0.95 });
    const easel = makeEasel({ w: CW, h: CH, cy: 1.12, tilt: 0.1, paper: paperMat });
    add(easel.root);
    const face = easel.face;
    // Side table with paint jars, brushes and a water cup
    const TX = -1.55;
    const TZ = -0.75;
    add(at(rbox(0.7, 0.05, 0.5, COL.woodLight, 0.02), TX, 0.66, TZ));
    for (const [dx, dz] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) add(at(box(0.05, 0.64, 0.05, COL.woodDark), TX + dx, 0.32, TZ + dz));
    COLORS.slice(1, 9).forEach(([, c], i) => {
      add(at(cyl(0.045, 0.045, 0.07, '#ffffff', 10), TX - 0.25 + (i % 4) * 0.13, 0.72, TZ - 0.12 + Math.floor(i / 4) * 0.13));
      add(at(cyl(0.046, 0.046, 0.03, c, 10), TX - 0.25 + (i % 4) * 0.13, 0.74, TZ - 0.12 + Math.floor(i / 4) * 0.13));
    });
    add(at(cyl(0.05, 0.045, 0.12, COL.sky, 12), TX + 0.25, 0.74, TZ + 0.12));
    for (let k = 0; k < 4; k++) add(rot(at(cyl(0.006, 0.006, 0.24, COL.woodLight, 5), TX + 0.25 + (k - 1.5) * 0.015, 0.86, TZ + 0.12), 0, 0, (k - 1.5) * 0.18));
    add(at(cyl(0.05, 0.05, 0.1, mat('#d8f2ff', { rough: 0.2 }), 12), TX + 0.25, 0.73, TZ - 0.12));
    add(at(makePlant(1.0, COL.terra, 'tall'), -3.0, 0, BACK + 0.5));
    add(at(makePlant(0.85, COL.mint), 3.2, 0, BACK + 0.5));
    // A little stage for the model, with a backdrop and a vase of flowers
    const MX = 1.2;
    const MZ = -0.7;
    add(at(cyl(0.55, 0.58, 0.18, '#fff3e4', 28), MX, 0.09, MZ));
    add(at(cyl(0.585, 0.585, 0.04, COL.rose, 28), MX, 0.17, MZ));
    add(at(cyl(0.012, 0.012, 2.0, COL.woodDark, 6), MX, 2.15, BACK + 0.25)).rotation.z = P / 2;
    for (let i = 0; i < 6; i++) {
      const fold = add(at(rbox(0.36, 1.9, 0.06, i % 2 ? '#c7a6ff' : '#b99af5', 0.03), MX - 0.9 + i * 0.36, 1.18, BACK + 0.22 + (i % 2) * 0.05));
      fold.rotation.y = (i % 2 ? 1 : -1) * 0.2;
    }
    add(at(cyl(0.1, 0.12, 0.75, '#ffffff', 14), MX + 0.85, 0.375, MZ + 0.1));
    add(at(cyl(0.16, 0.16, 0.04, '#ffffff', 14), MX + 0.85, 0.77, MZ + 0.1));
    add(at(cyl(0.07, 0.09, 0.2, COL.sky, 12), MX + 0.85, 0.89, MZ + 0.1));
    for (let k = 0; k < 5; k++) {
      const a = k * 1.25;
      add(at(cyl(0.006, 0.006, 0.22, COL.leaf, 5), MX + 0.85 + Math.sin(a) * 0.03, 1.07, MZ + 0.1 + Math.cos(a) * 0.03));
      add(at(sph(0.045, [COL.rose, COL.sun, '#ffffff', COL.pink, COL.lilac][k], undefined, 8), MX + 0.85 + Math.sin(a) * 0.06, 1.19 + (k % 2) * 0.04, MZ + 0.1 + Math.cos(a) * 0.06));
    }
    // A stool for the painter to rest on later, and the clothesline of saved drawings
    add(at(makeStool(COL.sun, 0.45), -2.4, 0, 0.4));
    const LINE_Y = 2.25;
    const LZ = BACK + 0.35;
    add(at(cyl(0.006, 0.006, 4.4, '#ffffff', 4), 0, LINE_Y, LZ)).rotation.z = P / 2;
    for (const s of [-1, 1]) add(at(sph(0.03, COL.woodDark, undefined, 8), s * 2.2, LINE_Y, LZ));
    colorBake(room, []);

    // ---------------------------------------------------------------- the kids
    const me = ctx.makeKid(ctx.me);
    const pal = ctx.makeKid(ctx.partner);
    const meName = ctx.looks[ctx.me].name;
    const KP = new THREE.Vector3(-1.08, 0, 0.12);
    me.root.position.copy(KP);
    let meYaw = Math.atan2(0 - KP.x, -0.05 - KP.z);
    me.root.rotation.y = meYaw;
    me.hands = 'hold';
    scene.add(me.root);
    pal.root.position.set(MX, 0.19, MZ);
    pal.root.rotation.y = -0.45;
    pal.onEmoteFx = () => fx.heartsAt(pal.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.7, 0)), 4);
    scene.add(pal.root);
    // Brush in the right hand, palette in the left
    const brush = new THREE.Group();
    brush.add(at(cyl(0.012, 0.009, 0.3, COL.wood, 8), 0, -0.15, 0));
    brush.add(at(cyl(0.014, 0.014, 0.03, mat(COL.steel, { metal: 0.5, rough: 0.3 }), 8), 0, -0.31, 0));
    const tipMat = new THREE.MeshStandardMaterial({ color: COLORS[0][1], roughness: 0.5 });
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 10), tipMat);
    tip.rotation.x = P;
    tip.position.y = -0.355;
    brush.add(tip);
    brush.position.y = -0.2;
    me.arms[1].add(brush);
    const palette = new THREE.Group();
    const board = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.014, 24), mat('#e7c08f', { rough: 0.7 }), { cast: false });
    board.scale.set(1.3, 1, 0.9);
    palette.add(board);
    COLORS.forEach(([, c], i) => {
      const a = (i / COLORS.length) * P * 1.6 + 0.6;
      palette.add(at(sph(0.022, c, undefined, 8), Math.cos(a) * 0.14, 0.012, Math.sin(a) * 0.09)).scale.y = 0.5;
    });
    palette.rotation.set(0.9, 0, 0.2);
    palette.position.set(0.02, -0.3, 0.08);
    me.arms[0].add(palette);
    const animate = (kid, dt, t) => {
      const n = Math.max(1, Math.ceil(dt / 0.05));
      for (let i = 0; i < n; i++) kid.update(dt / n, t, 0, 0, 0);
    };
    const bubble = speechBubble(THREE, scene, { width: 0.85, color: C });

    // ---------------------------------------------------------------- the paper
    let color = 0;
    let size = 1;
    let tool = 'brush'; // brush | eraser | heart | star | flower | sun
    let dirty = false;
    let texDirty = true;
    const baseCv = document.createElement('canvas');
    baseCv.width = PW;
    baseCv.height = PH;
    const bctx = baseCv.getContext('2d');
    bctx.fillStyle = PAPER;
    bctx.fillRect(0, 0, PW, PH);
    let ops = [];
    let cur = null;
    const unit = PW / 1000;

    function paintOp(c, op) {
      if (op.type === 'clear') {
        c.fillStyle = PAPER;
        c.fillRect(0, 0, PW, PH);
      } else if (op.type === 'stamp') drawStamp(c, op.shape, op.x, op.y, op.d, op.color);
      else if (op.type === 'image') {
        c.fillStyle = PAPER;
        c.fillRect(0, 0, PW, PH);
        const k = Math.min(PW / op.img.naturalWidth, PH / op.img.naturalHeight);
        const w = op.img.naturalWidth * k;
        const h = op.img.naturalHeight * k;
        c.drawImage(op.img, (PW - w) / 2, (PH - h) / 2, w, h);
      } else if (op.type === 'stroke') for (let i = 0; i < op.pts.length; i++) paintSeg(c, op, i, i === op.pts.length - 1);
    }
    // The piece of a stroke that point i completes (quadratic curves through the midpoints)
    function paintSeg(c, op, i, end) {
      const p = op.pts;
      c.strokeStyle = op.color;
      c.fillStyle = op.color;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      if (p.length === 1) {
        c.beginPath();
        c.arc(p[0].x, p[0].y, (op.w * p[0].p) / 2, 0, P * 2);
        c.fill();
        return;
      }
      if (i === 0) return;
      const a = p[i - 1];
      const b = p[i];
      const mid = (u, v) => ({ x: (u.x + v.x) / 2, y: (u.y + v.y) / 2 });
      c.lineWidth = (op.w * (a.p + b.p)) / 2;
      c.beginPath();
      if (i === 1) {
        c.moveTo(a.x, a.y);
        c.lineTo(mid(a, b).x, mid(a, b).y);
      } else {
        const m0 = mid(p[i - 2], a);
        const m1 = mid(a, b);
        c.moveTo(m0.x, m0.y);
        c.quadraticCurveTo(a.x, a.y, m1.x, m1.y);
      }
      if (end) c.lineTo(b.x, b.y);
      c.stroke();
    }
    function redraw() {
      g2.drawImage(baseCv, 0, 0);
      for (const op of ops) paintOp(g2, op);
      if (cur) paintOp(g2, cur);
      texDirty = true;
    }
    function pushOp(op) {
      ops.push(op);
      while (ops.length > OPS_MAX) paintOp(bctx, ops.shift());
      dirty = true;
    }
    const isBlank = () => !dirty && !ops.length;
    redraw();

    // ---------------------------------------------------------------- pointer on the 3D paper
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane();
    const ndc = new THREE.Vector2();
    const hit = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    const lastHit = new THREE.Vector3(0, 1.12, 0);
    let drawT = 9; // seconds since the brush last touched the paper
    // Paper pixel under a screen point, or null when off the paper plane
    function paperPt(e, inside = true) {
      ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      face.updateMatrixWorld();
      nrm.set(0, 0, 1).transformDirection(face.matrixWorld);
      plane.setFromNormalAndCoplanarPoint(nrm, face.getWorldPosition(hit));
      ray.setFromCamera(ndc, camera);
      if (!ray.ray.intersectPlane(plane, hit)) return null;
      lastHit.copy(hit);
      const l = face.worldToLocal(hit.clone());
      const u = l.x / CW + 0.5;
      const v = 0.5 - l.y / CH;
      if (inside && (u < -0.01 || u > 1.01 || v < -0.01 || v > 1.01)) return null;
      const pressure = e.pointerType === 'pen' ? 0.35 + 1.1 * (e.pressure || 0.5) : 1;
      return { x: u * PW, y: v * PH, p: pressure };
    }
    let blocked = false; // a modal or the save animation is up
    const dom = renderer.domElement;
    function onDown(e) {
      if (blocked || e.button > 0 || ctx.opts.noDraw) return;
      const p = paperPt(e);
      if (!p) return;
      e.preventDefault();
      drawT = 0;
      if (STAMPS.includes(tool)) {
        pushOp({ type: 'stamp', shape: tool, x: p.x, y: p.y, d: STAMP_SIZES[size] * unit, color: COLORS[color][1] });
        paintOp(g2, ops[ops.length - 1]);
        texDirty = true;
        me.squash = 1.1;
        sound.ui('pop');
        return;
      }
      if (cur) return;
      dom.setPointerCapture?.(e.pointerId);
      const eraser = tool === 'eraser';
      cur = { type: 'stroke', id: e.pointerId, color: eraser ? PAPER : COLORS[color][1], w: SIZES[size] * unit * (eraser ? 2.2 : 1), pts: [p] };
      paintSeg(g2, cur, 0, false);
      texDirty = true;
    }
    function onMove(e) {
      if (!cur || e.pointerId !== cur.id) return;
      const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of list.length ? list : [e]) {
        const p = paperPt(ev, false);
        if (!p) continue;
        const last = cur.pts[cur.pts.length - 1];
        if (Math.hypot(p.x - last.x, p.y - last.y) < 1.5) continue;
        cur.pts.push(p);
        paintSeg(g2, cur, cur.pts.length - 1, false);
      }
      drawT = 0;
      texDirty = true;
    }
    function onUp(e) {
      if (!cur || e.pointerId !== cur.id) return;
      const op = cur;
      cur = null;
      delete op.id;
      pushOp(op);
      redraw();
    }
    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerup', onUp);
    dom.addEventListener('pointercancel', onUp);

    // ---------------------------------------------------------------- gallery
    const loadGallery = () => {
      try {
        const g = JSON.parse(localStorage.getItem(GALLERY_KEY) || '[]');
        return Array.isArray(g) ? g.filter((d) => d && (typeof d === 'string' || d.src)) : [];
      } catch {
        return [];
      }
    };
    let gallery = loadGallery();
    const srcOf = (d) => (typeof d === 'string' ? d : d.src);
    const showCount = () => hud.score(`Gallery ${gallery.length}/${GALLERY_MAX}`);
    function persist() {
      for (;;) {
        try {
          localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery));
          showCount();
          return true;
        } catch {
          if (gallery.length <= 1) return false;
          gallery.shift();
        }
      }
    }
    // Pinned drawings on the clothesline (the latest four)
    const PIN_W = 0.5;
    const PIN_H = 0.375;
    const pinX = (i) => -1.35 + i * 0.9;
    const pins = [0, 1, 2, 3].map((i) => {
      const g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.PlaneGeometry(PIN_W, PIN_H), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, emissive: '#ffffff', emissiveIntensity: 0.25 }));
      m.position.y = -PIN_H / 2 - 0.02;
      g.add(m);
      for (const s of [-1, 1]) g.add(at(rbox(0.03, 0.08, 0.025, [COL.rose, COL.sun, COL.mint, COL.sky][i], 0.008), s * PIN_W * 0.32, -0.02, 0.012));
      g.position.set(pinX(i), LINE_Y + 0.01, LZ + 0.02);
      g.rotation.z = (i % 2 ? 1 : -1) * 0.04;
      g.visible = false;
      scene.add(g);
      return { g, m, src: null };
    });
    const texFor = (src, onLoad) => {
      const img = new Image();
      img.onload = () => {
        const t = new THREE.Texture(img);
        t.colorSpace = THREE.SRGBColorSpace;
        t.needsUpdate = true;
        onLoad(t);
      };
      img.src = src;
    };
    function showPins() {
      const latest = gallery.slice(-4).reverse();
      pins.forEach((pin, i) => {
        const src = latest[i] ? srcOf(latest[i]) : null;
        if (src === pin.src) return;
        pin.src = src;
        pin.g.visible = !!src;
        if (!src) return;
        texFor(src, (t) => {
          if (pin.src !== src) return t.dispose();
          pin.m.material.map?.dispose();
          pin.m.material.map = t;
          pin.m.material.emissiveMap = t;
          pin.m.material.needsUpdate = true;
        });
      });
    }
    showPins();
    showCount();

    // ---------------------------------------------------------------- panel
    const ui = document.createElement('div');
    ui.className = 'clay-ui dp-ui';
    const sizeBtns = SIZES.map((s, i) => `<button class="dp-b" data-size="${i}" aria-label="${['Thin', 'Medium', 'Thick'][i]} brush" title="${['Thin', 'Medium', 'Thick'][i]} brush (${i + 1})"><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="${[2.4, 4.6, 8][i]}" fill="currentColor"/></svg></button>`).join('');
    ui.innerHTML = `
      <div class="dp-colors" role="group" aria-label="Colours">${COLORS.map(([n, c], i) => `<button class="dp-b dp-sw" data-color="${i}" style="background:${c}" aria-label="${n}" title="${n}"></button>`).join('')}</div>
      <div class="dp-tools" role="group" aria-label="Tools">
        ${sizeBtns}
        <button class="dp-b" data-tool="eraser" aria-label="Eraser" title="Eraser (E)">${ERASER}</button>
        ${STAMPS.map((s) => `<button class="dp-b dp-stamp" data-tool="${s}" aria-label="${s} stamp" title="${s[0].toUpperCase() + s.slice(1)} stamp"></button>`).join('')}
        <span class="dp-sep"></span>
        <button class="dp-b cap" data-act="undo" aria-label="Undo" title="Undo (Ctrl+Z)">${lineIcon(ICON.undo)}<small>Undo</small></button>
        <button class="dp-b cap" data-act="clear" aria-label="Clear the paper" title="Clear">${lineIcon(ICON.clear)}<small>Clear</small></button>
        <button class="dp-b cap" data-act="gallery" aria-label="Open the gallery" title="Gallery">${lineIcon(ICON.grid)}<small>Gallery</small></button>
        <button class="dp-b cap" data-act="save" aria-label="Save to the gallery" title="Save">${lineIcon(ICON.save)}<small>Save</small></button>
        <button class="dp-b cap primary" data-act="done" aria-label="Done" title="Done">${lineIcon(ICON.done)}<small>Done</small></button>
      </div>
      <div class="dp-modal hidden"><div class="dp-sheet"></div></div>`;
    mountInArena(ui);
    const $ = (s) => ui.querySelector(s);
    const modal = $('.dp-modal');
    const sheet = $('.dp-sheet');
    const toast = makeToast();

    function syncTools() {
      ui.querySelectorAll('[data-color]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.color === color)));
      ui.querySelectorAll('[data-size]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.size === size)));
      ui.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
      ui.querySelectorAll('.dp-stamp').forEach((b) => (b.innerHTML = stampSvg(b.dataset.tool, COLORS[color][1], 26)));
      ui.querySelectorAll('[data-size] svg').forEach((s) => (s.style.color = tool === 'eraser' ? '#c9b8c4' : COLORS[color][1]));
      tipMat.color.set(tool === 'eraser' ? '#ffb7cb' : COLORS[color][1]);
      tip.scale.setScalar(tool === 'eraser' ? 1.6 : [0.7, 1, 1.4][size]);
    }
    function undo() {
      if (!ops.length) return toast.show('Nothing to undo');
      ops.pop();
      dirty = true;
      redraw();
      sound.ui('swoosh');
    }
    function clearPaper() {
      if (isBlank()) return;
      pushOp({ type: 'clear' });
      redraw();
      sound.ui('swoosh');
      pal.squash = 1.15;
    }

    // Save: the drawing flies from the easel to the clothesline, and the model cheers
    let fly = null;
    function saveDrawing() {
      if (isBlank()) {
        toast.show('Draw something first');
        return false;
      }
      const w = Math.min(SAVE_W, PW);
      const h = Math.round((PH * w) / PW);
      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      const o = out.getContext('2d');
      o.fillStyle = PAPER;
      o.fillRect(0, 0, w, h);
      o.drawImage(cv, 0, 0, w, h);
      const src = out.toDataURL('image/jpeg', 0.85);
      gallery.push({ src, t: Date.now() });
      let dropped = false;
      while (gallery.length > GALLERY_MAX) {
        gallery.shift();
        dropped = true;
      }
      if (!persist()) {
        gallery.pop();
        toast.show('No room left to save');
        return false;
      }
      dirty = false;
      sound.ui('coin');
      toast.show(dropped ? `Saved. The gallery keeps ${GALLERY_MAX}, so the oldest left.` : 'Saved to your gallery', 2200);
      // Flying copy
      const t = new THREE.CanvasTexture(out);
      t.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 0.4, roughness: 0.9, side: THREE.DoubleSide }));
      face.getWorldPosition(m.position);
      face.getWorldQuaternion(m.quaternion);
      m.position.z += 0.02;
      scene.add(m);
      if (fly) fly.m.removeFromParent();
      fly = { m, t: 0, from: m.position.clone(), to: new THREE.Vector3(pinX(0), LINE_Y - PIN_H / 2 - 0.01, LZ + 0.03), q: m.quaternion.clone() };
      return true;
    }

    // Modal sheets: the gallery grid, one drawing, and "keep this drawing?"
    function showModal(html) {
      sheet.innerHTML = html;
      modal.classList.remove('hidden');
      blocked = true;
    }
    function hideModal() {
      modal.classList.add('hidden');
      sheet.innerHTML = '';
      blocked = false;
    }
    function openGrid() {
      if (!gallery.length) return toast.show('Saved drawings show up here');
      const r = ui.getBoundingClientRect();
      const n = gallery.length;
      const cols = Math.min(n, 4);
      const rows = Math.ceil(n / cols);
      const cellH = clamp(Math.floor((r.height - 150) / rows), 44, 120);
      const cellW = Math.round(cellH * (PW / PH));
      const items = gallery.map((g, i) => `<button class="dp-thumb" data-open="${i}" aria-label="Saved drawing ${i + 1}" style="width:${cellW}px;height:${cellH}px"><img src="${srcOf(g)}" alt=""></button>`).reverse();
      showModal(`<h3>Your gallery</h3><div class="dp-grid" style="grid-template-columns:repeat(${cols}, ${cellW}px)">${items.join('')}</div><div class="row"><button class="clay-btn" data-m="close">Close</button></div>`);
    }
    function openPreview(i) {
      const g = gallery[i];
      if (!g) return;
      showModal(`<img class="dp-big" src="${srcOf(g)}" alt="Saved drawing ${i + 1}"><div class="row"><button class="clay-btn primary" style="--c:${C}" data-m="use" data-i="${i}">Draw on it</button><button class="clay-btn" data-m="del" data-i="${i}">Delete</button><button class="clay-btn" data-m="close">Close</button></div>`);
      const img = sheet.querySelector('.dp-big');
      img.style.maxHeight = Math.max(80, ui.getBoundingClientRect().height - 120) + 'px';
    }
    function done() {
      if (!isBlank() && dirty) {
        showModal(`<h3>Keep this drawing?</h3><p>It is not in your gallery yet.</p><div class="row"><button class="clay-btn primary" style="--c:${C}" data-m="savefin">Save and finish</button><button class="clay-btn" data-m="fin">Finish without saving</button><button class="clay-btn" data-m="close">Keep drawing</button></div>`);
        return;
      }
      finishUp(false);
    }
    let finished = false;
    function finishUp(saved) {
      finished = true;
      blocked = true;
      const n = gallery.length;
      const palName = ctx.looks[ctx.partner].name;
      ctx.finish({
        win: null,
        title: 'Lovely drawing!',
        text: `${saved ? 'Saved. ' : ''}Your gallery has ${n} drawing${n === 1 ? '' : 's'}${n ? ` for ${palName} to admire. The newest two hang in the picture frames at home` : ''}.`,
      });
      pal.emote('heart');
    }
    onTap(sheet, (b) => {
      if (b.dataset.open != null) {
        sound.ui('tap');
        return openPreview(+b.dataset.open);
      }
      const m = b.dataset.m;
      if (m === 'close') {
        sound.ui('tap');
        hideModal();
      } else if (m === 'use') {
        const g = gallery[+b.dataset.i];
        hideModal();
        if (!g) return;
        const img = new Image();
        img.onload = () => {
          pushOp({ type: 'image', img });
          dirty = false;
          redraw();
          sound.ui('pop');
        };
        img.src = srcOf(g);
      } else if (m === 'del') {
        if (b.dataset.sure !== '1') {
          b.dataset.sure = '1';
          b.textContent = 'Really delete?';
          sound.ui('tap');
          return;
        }
        gallery.splice(+b.dataset.i, 1);
        persist();
        showPins();
        hideModal();
        sound.ui('swoosh');
        toast.show('Drawing deleted');
      } else if (m === 'savefin') {
        hideModal();
        if (saveDrawing()) finishUp(true);
      } else if (m === 'fin') {
        hideModal();
        finishUp(false);
      }
    });
    modal.addEventListener('pointerdown', (e) => {
      if (e.target === modal) hideModal();
    });
    onTap($('.dp-colors'), (b) => {
      color = +b.dataset.color;
      if (tool === 'eraser') tool = 'brush';
      sound.ui('tap');
      syncTools();
    });
    onTap($('.dp-tools'), (b) => {
      if (b.dataset.size != null) {
        size = +b.dataset.size;
        if (STAMPS.includes(tool) === false && tool !== 'eraser') tool = 'brush';
        sound.ui('tap');
      } else if (b.dataset.tool) {
        tool = tool === b.dataset.tool ? 'brush' : b.dataset.tool;
        sound.ui('tap');
      } else if (b.dataset.act === 'undo') undo();
      else if (b.dataset.act === 'clear') clearPaper();
      else if (b.dataset.act === 'save') saveDrawing();
      else if (b.dataset.act === 'gallery') {
        sound.ui('tap');
        openGrid();
      } else if (b.dataset.act === 'done') done();
      syncTools();
    });
    syncTools();

    function onKey(e) {
      if (!modal.classList.contains('hidden') || finished) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey || e.metaKey || e.altKey) return;
      else if (k === 'e') {
        tool = tool === 'eraser' ? 'brush' : 'eraser';
        syncTools();
      } else if (k === 'b') {
        tool = 'brush';
        syncTools();
      } else if (/^[1-3]$/.test(k)) {
        size = +k - 1;
        syncTools();
      }
    }
    window.addEventListener('keydown', onKey);

    // ---------------------------------------------------------------- camera
    // The paper fills the free space between the panels; on tall screens the kids stand beside it.
    const camPos = new THREE.Vector3(0.4, 1.9, 5.2);
    const camLook = new THREE.Vector3(0, 1.1, 0);
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    const up = new THREE.Vector3();
    const right = new THREE.Vector3();
    let free = null;
    function paperShot() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const cr = $('.dp-colors').getBoundingClientRect();
      const tr = $('.dp-tools').getBoundingClientRect();
      const side = cr.height > cr.width;
      const top = 62;
      const bottom = side ? H - 10 : Math.min(cr.top, tr.top) - 10;
      const left = side ? cr.right + 10 : 10;
      const rightPx = side ? tr.left - 10 : W - 10;
      const fill = side ? 0.95 : 0.74;
      free = side ? { left, right: rightPx, top, bottom } : { left: 10, right: W - 10, top, bottom };
      const ppm = Math.min((fill * (bottom - top)) / CH, (0.96 * (rightPx - left)) / CW);
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const d = H / (2 * tan * ppm);
      // Shift the camera inside the paper's plane so the paper sits in the middle of the free space
      const cx = ((left + rightPx) / 2 / W) * 2 - 1;
      const cy = 1 - ((top + bottom) / 2 / H) * 2;
      face.updateMatrixWorld();
      face.getWorldPosition(wantLook);
      fwd.set(0, 0, 1).transformDirection(face.matrixWorld);
      up.set(0, 1, 0).transformDirection(face.matrixWorld);
      right.crossVectors(up, fwd).normalize();
      const sx = -cx * d * tan * camera.aspect;
      const sy = -cy * d * tan;
      wantPos.copy(wantLook).addScaledVector(fwd, d).addScaledVector(right, sx).addScaledVector(up, sy);
      wantLook.addScaledVector(right, sx).addScaledVector(up, sy);
    }
    function wideShot() {
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const d = Math.max(4.3, 2.4 / (tan * camera.aspect));
      wantLook.set(0.1, 1.45, -0.6);
      wantPos.set(0.25, 1.45 + d * 0.18, -0.6 + d * 0.98);
    }

    // ---------------------------------------------------------------- the model
    const poses = ['heart', 'wave', 'bow', 'spin', 'cheer'];
    const lines = ctx.partner === 'homama'
      ? ['Paint me with a big smile!', 'Is my good side showing?', 'Hold still... I am trying!', 'Do I look handsome?']
      : ['Paint me with a big smile!', 'Is my good side showing?', 'Hold still... I am trying!', 'Make my dress extra pretty!'];
    let poseT = 2.2;
    let poseI = 0;
    let lineT = 1.0;
    let lineI = 0;

    hud.buttons({ action: null, jump: null, stick: false });
    hud.hint('');
    hud.message('Paint a picture!', 1300);
    const hintTimer = setTimeout(() => toast.show(document.body.classList.contains('touch') ? 'Drag on the paper to paint' : 'Drag on the paper to paint. Keys: 1 2 3 sizes, E eraser, Ctrl+Z undo', 3400), 1600);
    let intro = 1.5;

    const debug = {
      get ops() {
        return ops.length;
      },
      get gallery() {
        return gallery.length;
      },
      get dirty() {
        return dirty;
      },
      snap() {
        intro = 0;
        paperShot();
        camPos.copy(wantPos);
        camLook.copy(wantLook);
      },
      // Screen pixel of a paper point (u, v from 0 to 1, top left)
      screen(u, v) {
        face.updateMatrixWorld();
        const p = face.localToWorld(new THREE.Vector3((u - 0.5) * CW, (0.5 - v) * CH, 0)).project(camera);
        return { x: ((p.x + 1) / 2) * window.innerWidth, y: ((1 - p.y) / 2) * window.innerHeight };
      },
      save: () => saveDrawing(),
    };

    return {
      debug,
      update(dt, t) {
        // Camera: a wide hello, then the paper; a step back while a saved drawing flies
        intro -= dt;
        if (intro > 0 || fly) wideShot();
        else paperShot();
        const rate = fly ? 2.6 : 3.2;
        camPos.x = damp(camPos.x, wantPos.x, rate, dt);
        camPos.y = damp(camPos.y, wantPos.y, rate, dt);
        camPos.z = damp(camPos.z, wantPos.z, rate, dt);
        camLook.x = damp(camLook.x, wantLook.x, rate, dt);
        camLook.y = damp(camLook.y, wantLook.y, rate, dt);
        camLook.z = damp(camLook.z, wantLook.z, rate, dt);
        camera.position.copy(camPos);
        camera.lookAt(camLook);
        if (texDirty) {
          paperTex.needsUpdate = true;
          texDirty = false;
        }

        // The flying drawing
        if (fly) {
          fly.t += dt / 1.3;
          const e = easeInOut(clamp(fly.t, 0, 1));
          fly.m.position.lerpVectors(fly.from, fly.to, e);
          fly.m.position.y += Math.sin(e * P) * 0.5;
          const s = 1 + (PIN_W / CW - 1) * e;
          fly.m.scale.setScalar(s);
          fly.m.rotation.set(-0.1 * (1 - e), 0, Math.sin(e * P * 2) * 0.25);
          if (fly.t >= 1) {
            fly.m.geometry.dispose();
            fly.m.material.map.dispose();
            fly.m.material.dispose();
            fly.m.removeFromParent();
            fly = null;
            showPins();
            fx.heartsAt(new THREE.Vector3(pinX(0), LINE_Y + 0.1, LZ + 0.1), 4);
            bubble.set(['I love it!', 'You are a real artist!', 'That one goes on our wall!'][Math.floor(Math.random() * 3)], 2200);
            pal.emote('cheer');
          }
        }

        // Painter: faces the brush spot, the arm reaches for it
        drawT += dt;
        const painting = drawT < 0.6;
        me.hands = 'hold';
        animate(me, dt, t);
        const target = painting ? lastHit : tmp.set(0, 1.1, 0);
        const wantYaw = painting ? Math.atan2(target.x - KP.x, target.z - 0.1 - KP.z) : 0.85 + Math.sin(t * 0.5) * 0.12;
        meYaw = damp(meYaw, wantYaw, 5, dt);
        me.root.rotation.y = meYaw;
        me.root.updateMatrixWorld(true);
        const arm = me.arms[1];
        const d3 = me.body.worldToLocal(tmp2.copy(target)).sub(arm.position).normalize();
        const rz = Math.asin(clamp(d3.x, -1, 1));
        const rx = Math.atan2(-d3.z, -d3.y);
        const reach = painting ? 1 : 0.55 + Math.sin(t * 1.3) * 0.05;
        arm.rotation.set(rx * reach, 0, rz * reach);
        me.arms[0].rotation.set(-0.75, 0, 0.35);
        if (painting) me.body.position.y += Math.abs(Math.sin(t * 9)) * 0.01;

        // Model: strikes a pose now and then, and chats
        animate(pal, dt, t);
        poseT -= dt;
        if (poseT <= 0 && !fly && !finished) {
          poseT = 4.5 + Math.random() * 2.5;
          pal.emote(poses[poseI++ % poses.length]);
        }
        lineT -= dt;
        if (lineT <= 0 && !fly) {
          lineT = 9 + Math.random() * 5;
          bubble.set(lines[lineI++ % lines.length], 2600);
        }
        if (drawT < 1.2 && free && free.right - free.left < window.innerWidth * 0.8) bubble.hide();
        bubble.update(dt, tmp.copy(pal.head.getWorldPosition(tmp2)).add(tmp2.set(0.12, 0.78, 0.1)));
        if (free && !fly && intro <= 0) bubble.fit(camera, free);
      },
      dispose() {
        dom.removeEventListener('pointerdown', onDown);
        dom.removeEventListener('pointermove', onMove);
        dom.removeEventListener('pointerup', onUp);
        dom.removeEventListener('pointercancel', onUp);
        window.removeEventListener('keydown', onKey);
        clearTimeout(hintTimer);
        ui.remove();
        toast.remove();
        hud.hint('');
        for (const pin of pins) pin.m.material.map?.dispose();
      },
    };
  },
};

