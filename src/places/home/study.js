import { THREE, mat, umat, mesh, box, rbox, cyl, sph, tor, at, rot, canvasTexture, heartGeo, FONT, roundRect } from './kit.js';
import { rng } from '../../util.js';

// Study: Homama's software engineering desk (two monitors with scrolling code) and Roji's doctor desk
// (medical books, stethoscope, heart model, a little skeleton, lab coat and her diploma).

const HDX = 11.65; // Homama's desk
const RDX = 14.55; // Roji's desk
const DT = 0.75; // desk top
const MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";

const CODE = [
  '// roji-world.js',
  "const roji = new Doctor('Roji');",
  "const homama = new Engineer('Homama');",
  '',
  'function weekend(day) {',
  "  homama.cook('pecan cake');",
  '  roji.smile();',
  '  return love + 1;',
  '}',
  '',
  'while (together) {',
  "  hearts.push('more');",
  '  bugs = 0;',
  '}',
  '',
  'export default forever;',
];
const TESTS = ['$ npm test', '', 'ok 1 Roji is the best doctor', 'ok 2 Homama makes cocoa', 'ok 3 Mishmish was fed', 'ok 4 movie night works', 'ok 5 hugs scale up', '', 'tests 5  pass 5  fail 0', '', '$ git push', 'done, with love'];
const KEYWORDS = new Set(['const', 'new', 'function', 'return', 'while', 'export', 'default']);

function drawCode(ctx, W, H, scroll, lines, tests) {
  ctx.fillStyle = tests ? '#15201b' : '#1f2233';
  ctx.fillRect(0, 0, W, H);
  ctx.font = `600 11px ${MONO}`;
  ctx.textBaseline = 'top';
  const lh = 14;
  const n = lines.length;
  const first = Math.floor(scroll / lh);
  for (let i = -1; i < Math.ceil(H / lh) + 1; i++) {
    const li = (((first + i) % n) + n) % n;
    const y = i * lh - (scroll % lh) + 6;
    const line = lines[li];
    if (tests) {
      ctx.fillStyle = line.startsWith('ok') || line.startsWith('done') ? '#7fe3a1' : line.startsWith('$') ? '#ffd166' : '#d6e6dc';
      ctx.fillText(line, 8, y);
      continue;
    }
    ctx.fillStyle = '#5b6386';
    ctx.fillText(String(li + 1).padStart(2, ' '), 4, y);
    let x = 26;
    for (const tok of line.split(/(\s+|[()[\]{};.,=+'])/)) {
      if (!tok) continue;
      ctx.fillStyle = line.trim().startsWith('//') ? '#7b84a8' : KEYWORDS.has(tok) ? '#ff8fb1' : /^[A-Z]/.test(tok) ? '#ffd166' : /[()[\]{}]/.test(tok) ? '#9fd6e3' : '#e8ecff';
      ctx.fillText(tok, x, y);
      x += ctx.measureText(tok).width;
    }
  }
  // Cursor blink and a tiny status bar
  ctx.fillStyle = tests ? '#2a3a31' : '#2c3150';
  ctx.fillRect(0, H - 14, W, 14);
  ctx.fillStyle = tests ? '#7fe3a1' : '#ff8fb1';
  ctx.font = `600 10px ${MONO}`;
  ctx.fillText(tests ? 'all green' : 'main  saved', 6, H - 12);
}

function screenTex(lines, tests) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const ctx = c.getContext('2d');
  const draw = (scroll) => {
    drawCode(ctx, 256, 160, scroll, lines, tests);
    tex.needsUpdate = true;
  };
  draw(0);
  return { tex, draw };
}

export function buildStudy(R) {
  const { add, L, api } = R;
  const ZB = L.ZB;
  const P = Math.PI;
  const r = rng(13);
  const st = { scroll: 0, t: 0, lineT: 0, line: 0 };
  const wood = mat('#e2c29a', { rough: 0.75 });
  const dark = mat('#2a2533', { rough: 0.4 });
  const metal = mat('#cfd8e3', { metal: 0.5, rough: 0.3 });
  const white = mat('#ffffff', { rough: 0.6 });

  const desk = (x, drawerSide, top) => {
    add(at(rbox(1.6, 0.05, 0.7, top, 0.02), x, DT - 0.025, ZB + 0.35));
    for (const [dx, dz] of [[-0.74, -0.3], [0.74, -0.3], [-0.74, 0.3], [0.74, 0.3]]) add(at(cyl(0.025, 0.025, DT - 0.05, top, 6), x + dx, (DT - 0.05) / 2, ZB + 0.35 + dz));
    add(at(rbox(0.42, 0.55, 0.6, top, 0.03), x + drawerSide * 0.55, 0.3, ZB + 0.35));
    for (let k = 0; k < 3; k++) add(at(box(0.08, 0.02, 0.02, metal), x + drawerSide * 0.55, 0.12 + k * 0.18, ZB + 0.66));
    R.col({ type: 'box', x, z: ZB + 0.35, hw: 0.82, hd: 0.36 });
  };
  const chair = (x, color) => {
    const c = mat(color, { rough: 0.7 });
    add(at(rbox(0.48, 0.08, 0.46, c, 0.04), x, 0.44, -3.6));
    add(at(rbox(0.46, 0.5, 0.07, c, 0.04), x, 0.82, -3.33));
    add(at(cyl(0.025, 0.025, 0.36, metal, 6), x, 0.22, -3.6));
    add(at(cyl(0.03, 0.03, 0.3, metal, 6), x, 0.6, -3.36));
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * P * 2;
      add(rot(at(box(0.26, 0.025, 0.04, dark), x + Math.cos(a) * 0.13, 0.05, -3.6 + Math.sin(a) * 0.13), 0, -a, 0));
      add(at(sph(0.025, dark, undefined, 6), x + Math.cos(a) * 0.25, 0.025, -3.6 + Math.sin(a) * 0.25));
    }
    R.col({ type: 'circle', x, z: -3.5, r: 0.22, h: 0.48 });
  };

  // ---------------------------------------------------------------- Homama's desk
  desk(HDX, -1, wood);
  chair(HDX, '#3f7bf0');
  const screens = [screenTex(CODE, false), screenTex(TESTS, true)];
  add(at(cyl(0.03, 0.05, 0.75, metal, 8), HDX, DT + 0.37, ZB + 0.1));
  add(rot(at(box(0.72, 0.03, 0.03, metal), HDX, 1.38, ZB + 0.13), 0, 0, 0));
  screens.forEach((s, i) => {
    const side = i ? 1 : -1;
    const g = new THREE.Group();
    g.add(at(rbox(0.68, 0.43, 0.04, dark, 0.02), 0, 0, 0));
    g.add(at(new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.38), new THREE.MeshBasicMaterial({ map: s.tex })), 0, 0, 0.022));
    if (i === 0) {
      // A sticky note on the monitor
      const sticky = (ctx, w, h) => {
        ctx.fillStyle = '#fff1a8';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#4a3423';
        ctx.textAlign = 'center';
        ctx.font = `600 15px ${FONT}`;
        ctx.fillText('Roji home', w / 2, 30);
        ctx.fillText('at 6!', w / 2, 52);
        ctx.fillStyle = '#ef5b6f';
        ctx.beginPath();
        ctx.moveTo(w / 2, 86);
        ctx.bezierCurveTo(w / 2 - 14, 76, w / 2 - 8, 64, w / 2, 71);
        ctx.bezierCurveTo(w / 2 + 8, 64, w / 2 + 14, 76, w / 2, 86);
        ctx.fill();
      };
      g.add(rot(at(R.atlas.panel(0.11, 0.11, 96, 96, sticky), -0.27, 0.15, 0.03), 0, 0, 0.1));
    }
    g.position.set(HDX + side * 0.36, 1.45, ZB + 0.2);
    g.rotation.y = -side * 0.16;
    add(g);
    R.dyn(g.children[1]);
  });
  const keys = (ctx, w, h) => {
    ctx.fillStyle = '#3b3542';
    ctx.fillRect(0, 0, w, h);
    const cols = ['#ffd6e0', '#fff1c9', '#d6f0ff', '#e3d6ff'];
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = (i === 13 && j === 1) || (i === 0 && j === 3) ? '#ef5b6f' : cols[(i + j) % 4];
        roundRect(ctx, 3 + i * 18, 3 + j * 17, 15, 14, 3);
        ctx.fill();
      }
    }
  };
  add(at(rbox(0.5, 0.03, 0.17, dark, 0.01), HDX, DT + 0.015, -3.98));
  add(rot(at(R.atlas.panel(0.47, 0.14, 256, 72, keys), HDX, DT + 0.032, -3.98), -P / 2, 0, 0));
  add(at(rbox(0.22, 0.005, 0.18, '#ff9eb5', 0.003), HDX + 0.42, DT + 0.003, -4.0));
  add(at(sph(0.035, white, undefined, 10), HDX + 0.42, DT + 0.02, -4.0)).scale.set(1, 0.55, 1.4);
  // Laptop with a chat on screen
  const chat = (ctx, w, h) => {
    ctx.fillStyle = '#fff7fb';
    ctx.fillRect(0, 0, w, h);
    ctx.font = `600 15px ${FONT}`;
    ctx.textBaseline = 'middle';
    const bubble = (x, y, text, bg, fg) => {
      const tw = ctx.measureText(text).width + 18;
      ctx.fillStyle = bg;
      roundRect(ctx, x, y, tw, 26, 12);
      ctx.fill();
      ctx.fillStyle = fg;
      ctx.fillText(text, x + 9, y + 14);
    };
    bubble(8, 12, 'Roji: lunch?', '#ffd6e0', '#7a2e3a');
    bubble(60, 46, 'Homama: always!', '#d6e9ff', '#2c3e66');
    bubble(8, 82, 'Roji: love you', '#ffd6e0', '#7a2e3a');
  };
  const lap = new THREE.Group();
  lap.add(at(rbox(0.36, 0.02, 0.25, metal, 0.008), 0, 0.01, 0));
  const lid = new THREE.Group();
  lid.position.set(0, 0.02, -0.12);
  lid.rotation.x = -0.25;
  lid.add(at(rbox(0.36, 0.24, 0.015, metal, 0.008), 0, 0.12, 0));
  lid.add(at(R.atlas.panel(0.32, 0.2, 192, 128, chat), 0, 0.12, 0.009));
  lid.add(rot(at(mesh(heartGeo(0.06, 0.005), mat('#ef5b6f')), 0.1, 0.18, -0.01), 0, P, 0));
  lap.add(lid);
  lap.position.set(HDX - 0.62, DT, -4.2);
  lap.rotation.y = 0.35;
  add(lap);
  // Rubber duck for debugging, a mug and a little cactus
  const duck = new THREE.Group();
  duck.add(at(sph(0.06, '#ffd23f', { rough: 0.35 }, 10), 0, 0.05, 0));
  duck.children[0].scale.set(1.2, 0.85, 1);
  duck.add(at(sph(0.04, '#ffd23f', { rough: 0.35 }, 10), 0, 0.11, 0.035));
  duck.add(rot(at(cyl(0.01, 0.022, 0.035, '#ff8a3d', 6), 0, 0.105, 0.08), P / 2, 0, 0));
  duck.position.set(HDX + 0.68, DT, -4.05);
  duck.rotation.y = -0.6;
  add(duck);
  add(at(cyl(0.045, 0.04, 0.1, '#ffffff', 12), HDX + 0.62, DT + 0.05, -4.42));
  add(at(mesh(heartGeo(0.04, 0.005), mat('#ef5b6f')), HDX + 0.62, DT + 0.05, -4.375));
  add(rot(at(tor(0.025, 0.008, '#ffffff', undefined, P * 2, 5, 10), HDX + 0.67, DT + 0.05, -4.42), 0, 0, P / 2));
  add(at(cyl(0.04, 0.035, 0.06, '#e07a55', 10), HDX + 0.12, DT + 0.03, -4.5));
  add(at(cyl(0.025, 0.028, 0.1, '#5aa84f', 8), HDX + 0.12, DT + 0.11, -4.5));
  // Poster and sticky notes above the desk
  const poster = (ctx, w, h) => {
    ctx.fillStyle = '#2c3150';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffd166';
    ctx.font = `600 22px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('print(', w / 2 - 54, 70);
    ctx.fillStyle = '#ff8fb1';
    ctx.font = `600 34px ${FONT}`;
    ctx.fillText('"Hello, Roji"', w / 2 + 18, 112);
    ctx.fillStyle = '#ffd166';
    ctx.font = `600 22px ${MONO}`;
    ctx.fillText(')', w / 2 + 112, 150);
  };
  add(at(rbox(0.66, 0.5, 0.03, '#ffffff', 0.01), HDX - 0.15, 2.15, ZB + 0.02));
  add(at(R.atlas.panel(0.6, 0.44, 256, 192, poster), HDX - 0.15, 2.15, ZB + 0.04));
  ['#fff1a8', '#ffd6e0', '#d6f0ff', '#d7f2e1'].forEach((c, i) => add(rot(at(box(0.14, 0.14, 0.01, c), HDX + 0.45 + (i % 2) * 0.18, 2.05 + Math.floor(i / 2) * 0.18, ZB + 0.02), 0, 0, (r() - 0.5) * 0.3)));

  // ---------------------------------------------------------------- Roji's desk
  desk(RDX, 1, mat('#fff7f2', { rough: 0.6 }));
  chair(RDX, '#ff8fb1');
  // Medical books with spines
  const spines = (ctx, w, h) => {
    const rows = [['Anatomy', '#ef5b6f'], ['Cardiology', '#3f7bf0'], ['Pediatrics', '#3fbf7f']];
    rows.forEach(([t, c], i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, i * 48, w, 46);
      ctx.fillStyle = '#ffffff';
      ctx.font = `600 26px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t, w / 2, i * 48 + 24);
    });
  };
  [['#ef5b6f', 0.34], ['#3f7bf0', 0.32], ['#3fbf7f', 0.3]].forEach(([c, w], i) => add(at(rbox(w, 0.055, 0.24, c, 0.008), RDX - 0.52, DT + 0.03 + (2 - i) * 0.058, -4.38)));
  add(at(R.atlas.panel(0.32, 0.17, 256, 144, spines), RDX - 0.52, DT + 0.09, -4.255));
  add(at(rbox(0.5, 0.012, 0.32, '#fffaf0', 0.004), RDX - 0.08, DT + 0.006, -4.05));
  add(rot(at(cyl(0.006, 0.006, 0.16, '#3f7bf0', 5), RDX + 0.08, DT + 0.015, -4.0), P / 2, 0.6, 0));
  // Stethoscope
  const steth = new THREE.Group();
  steth.add(rot(tor(0.11, 0.012, '#3b3542', undefined, P * 1.6, 6, 24), P / 2, 0, 0));
  steth.add(at(cyl(0.04, 0.04, 0.025, metal, 14), 0.11, 0.0, 0.0));
  steth.add(rot(at(cyl(0.006, 0.006, 0.14, metal, 5), -0.06, 0.0, -0.12), P / 2, 0.4, 0));
  steth.add(rot(at(cyl(0.006, 0.006, 0.14, metal, 5), 0.0, 0.0, -0.13), P / 2, -0.3, 0));
  steth.position.set(RDX + 0.24, DT + 0.015, -4.25);
  add(steth);
  // Heart model on a stand
  const heart = new THREE.Group();
  heart.add(at(cyl(0.07, 0.08, 0.02, '#ffffff', 12), 0, 0.01, 0));
  heart.add(at(cyl(0.008, 0.008, 0.14, metal, 5), 0, 0.08, 0));
  heart.add(at(sph(0.06, '#e5484d', { rough: 0.4 }, 12), -0.03, 0.2, 0), at(sph(0.055, '#d93b45', { rough: 0.4 }, 12), 0.03, 0.21, 0));
  heart.add(rot(at(mesh(new THREE.ConeGeometry(0.07, 0.1, 12), mat('#e5484d', { rough: 0.4 })), 0, 0.13, 0), P, 0, 0.3));
  heart.add(rot(at(tor(0.035, 0.014, '#6fb8ff', undefined, P, 5, 10), 0.02, 0.27, 0), 0, 0, 0.2));
  heart.add(rot(at(tor(0.03, 0.013, '#e5484d', undefined, P, 5, 10), -0.03, 0.27, 0.01), 0, 0.5, -0.3));
  heart.position.set(RDX + 0.6, DT, -4.3);
  add(heart);
  // A tiny photo of the two of them on Roji's desk
  const tiny = (ctx, w, h) => {
    ctx.fillStyle = '#ffe9f0';
    ctx.fillRect(0, 0, w, h);
    for (const [x, c] of [[w * 0.35, '#ef5b6f'], [w * 0.65, '#3f7bf0']]) {
      ctx.fillStyle = c;
      ctx.fillRect(x - 7, h * 0.6, 14, h * 0.3);
      ctx.fillStyle = '#ffd9c2';
      ctx.beginPath();
      ctx.arc(x, h * 0.48, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ff6b8a';
    ctx.fillRect(w / 2 - 3, h * 0.3, 6, 6);
  };
  add(rot(at(rbox(0.13, 0.16, 0.015, '#f4c24f', 0.005), RDX + 0.3, DT + 0.08, -4.5), -0.2, -0.2, 0));
  add(rot(at(R.atlas.panel(0.1, 0.13, 64, 80, tiny), RDX + 0.3, DT + 0.08, -4.49), -0.2, -0.2, 0));
  // Pink desk lamp
  add(at(cyl(0.07, 0.08, 0.03, '#ff8fb1', 12), RDX - 0.15, DT + 0.015, -4.48));
  add(rot(at(cyl(0.012, 0.012, 0.36, '#ff8fb1', 6), RDX - 0.15, DT + 0.19, -4.42), 0.35, 0, 0));
  add(rot(at(cyl(0.04, 0.09, 0.1, '#ff8fb1', 12), RDX - 0.15, DT + 0.36, -4.32), -0.5, 0, 0));
  add(at(sph(0.03, mat('#fff1c9', { emissive: '#ffd27a', ei: 1.2 }), undefined, 8), RDX - 0.15, DT + 0.32, -4.28));
  // Diploma
  const diploma = (ctx, w, h) => {
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d9b36a';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#7b5a2a';
    ctx.textAlign = 'center';
    ctx.font = `500 18px ${FONT}`;
    ctx.fillText('Doctor of Medicine', w / 2, 52);
    ctx.fillStyle = '#ef5b6f';
    ctx.font = `600 40px ${FONT}`;
    ctx.fillText('Dr. Roji', w / 2, 102);
    ctx.fillStyle = '#7b5a2a';
    ctx.font = `500 13px ${FONT}`;
    ctx.fillText('with highest honours', w / 2, 130);
    ctx.fillStyle = '#f4c24f';
    ctx.beginPath();
    ctx.arc(w - 56, h - 46, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef5b6f';
    ctx.fillRect(w - 64, h - 30, 6, 20);
    ctx.fillRect(w - 52, h - 30, 6, 20);
  };
  add(at(rbox(0.86, 0.66, 0.04, mat('#f4c24f', { metal: 0.3, rough: 0.4 }), 0.02), RDX + 0.1, 2.05, ZB + 0.02));
  add(at(R.atlas.panel(0.76, 0.56, 256, 192, diploma), RDX + 0.1, 2.05, ZB + 0.045));
  // Lab coat on a hook, between the desks
  add(at(sph(0.035, '#f4c24f', { metal: 0.5 }, 8), 13.1, 1.98, ZB + 0.05));
  // Lab coat on a wooden hanger: square shoulders, sleeves, lapels over a blue shirt, buttons and pockets
  const coat = new THREE.Group();
  coat.add(rot(at(tor(0.035, 0.008, '#c9a27a', undefined, P * 1.3, 4, 10), 0, 1.98, 0), 0, 0, -0.3));
  coat.add(rot(at(cyl(0.015, 0.015, 0.5, '#c9a27a', 6), 0, 1.9, 0.01), 0, 0, P / 2));
  coat.add(at(rbox(0.5, 0.86, 0.07, white, 0.03), 0, 1.44, 0));
  coat.add(at(box(0.12, 0.2, 0.02, '#9fd6e3'), 0, 1.76, 0.03));
  for (const s of [-1, 1]) {
    coat.add(rot(at(box(0.1, 0.28, 0.02, '#eef2f6'), s * 0.07, 1.72, 0.045), 0, 0, -s * 0.38));
    coat.add(rot(at(mesh(new THREE.CapsuleGeometry(0.05, 0.56, 3, 8), white), s * 0.29, 1.5, 0), 0, 0, s * 0.08));
    coat.add(at(box(0.12, 0.1, 0.012, '#eef2f6'), s * 0.13, 1.22, 0.042));
  }
  for (let k = 0; k < 3; k++) coat.add(at(sph(0.014, '#cfd8e3', undefined, 6), 0.03, 1.55 - k * 0.14, 0.04));
  coat.add(at(box(0.012, 0.08, 0.012, '#3f7bf0'), 0.16, 1.3, 0.05));
  coat.add(at(box(0.1, 0.03, 0.01, '#ef5b6f'), -0.15, 1.58, 0.04));
  coat.position.set(13.1, 0, ZB + 0.08);
  add(coat);
  // A little skeleton on a stand
  const bone = mat('#fbf6ea', { rough: 0.6 });
  const sk = new THREE.Group();
  sk.add(at(cyl(0.14, 0.16, 0.04, '#8d96a3', 14), 0, 0.02, 0));
  sk.add(at(cyl(0.012, 0.012, 1.0, '#8d96a3', 6), 0, 0.5, -0.06));
  sk.add(at(sph(0.1, bone, undefined, 14), 0, 0.98, 0));
  for (const s of [-1, 1]) sk.add(at(sph(0.025, '#3b3542', undefined, 8), s * 0.035, 0.99, 0.085));
  sk.add(at(rbox(0.1, 0.04, 0.07, bone, 0.015), 0, 0.9, 0.02));
  for (let i = 0; i < 5; i++) sk.add(at(cyl(0.022, 0.022, 0.03, bone, 8), 0, 0.5 + i * 0.07, -0.02));
  for (let i = 0; i < 3; i++) sk.add(rot(at(tor(0.07 - i * 0.008, 0.009, bone, undefined, P * 2, 4, 14), 0, 0.78 - i * 0.06, 0.01), P / 2, 0, 0));
  sk.add(at(rbox(0.18, 0.06, 0.08, bone, 0.02), 0, 0.46, 0));
  for (const s of [-1, 1]) {
    sk.add(rot(at(cyl(0.012, 0.012, 0.36, bone, 6), s * 0.12, 0.66, 0), 0, 0, s * 0.15));
    sk.add(at(cyl(0.015, 0.015, 0.4, bone, 6), s * 0.06, 0.24, 0));
    sk.add(at(sph(0.022, bone, undefined, 6), s * 0.15, 0.48, 0));
  }
  sk.position.set(15.62, 0, ZB + 0.42);
  sk.rotation.y = -0.4;
  add(sk);
  R.col({ type: 'circle', x: 15.62, z: ZB + 0.42, r: 0.18 });
  // Bookcase with a globe against the side wall
  add(at(box(0.32, 1.2, 1.0, wood), 15.74, 0.6, -2.4));
  for (let s = 0; s < 3; s++) {
    let z = -2.85;
    while (z < -1.95) {
      const bw = 0.06 + r() * 0.05;
      const bh = 0.24 + r() * 0.1;
      add(at(box(0.22, bh, bw, ['#ef5b6f', '#6fb8ff', '#ffd166', '#7fd3a7', '#c7a6ff', '#ffffff'][Math.floor(r() * 6)]), 15.66, 0.1 + s * 0.38 + bh / 2, z + bw / 2));
      z += bw + 0.012;
    }
  }
  add(at(cyl(0.02, 0.06, 0.08, '#c9a27a', 8), 15.74, 1.24, -2.4));
  add(at(sph(0.13, '#6fb8ff', { rough: 0.5 }, 14), 15.74, 1.4, -2.4));
  add(at(sph(0.06, '#7fd36b', { rough: 0.6 }, 8), 15.74, 1.45, -2.33)).scale.set(1.5, 1, 0.8);
  R.col({ type: 'box', x: 15.74, z: -2.4, hw: 0.17, hd: 0.5 });
  // Rug
  add(at(rbox(3.4, 0.012, 1.4, '#cfe8d6', 0.006), 13.1, 0.006, -2.25));
  add(at(rbox(3.1, 0.004, 1.1, '#e3f3e8', 0.004), 13.1, 0.014, -2.25));
  R.windowAt(13.1, 2.4, 0.8, 0.6, '#c7e8d2');

  // ---------------------------------------------------------------- study together
  const book = new THREE.Group();
  const bp = canvasTexture(256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e5484d';
    ctx.beginPath();
    ctx.moveTo(64, 120);
    ctx.bezierCurveTo(16, 84, 30, 30, 64, 56);
    ctx.bezierCurveTo(98, 30, 112, 84, 64, 120);
    ctx.fill();
    ctx.fillStyle = '#c7cbd6';
    for (let i = 0; i < 8; i++) ctx.fillRect(w / 2 + 14, 24 + i * 15, 96 - (i % 3) * 18, 5);
  });
  const pm = umat('#ffffff', { rough: 0.8, map: bp, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.rotation.y = -s * 0.3;
    const page = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.24), pm);
    const uv = page.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, s < 0 ? uv.getX(i) * 0.5 : 0.5 + uv.getX(i) * 0.5);
    page.position.x = s * 0.1;
    hinge.add(page, at(box(0.21, 0.25, 0.01, '#ef5b6f'), s * 0.1, 0, -0.007));
    book.add(hinge);
  }
  const LINES = ['Homama fixes a tricky bug.', 'Roji learns how the heart pumps.', '<b>Homama:</b> Your heart is my favourite topic.', '<b>Roji:</b> And your code is my favourite story.'];
  function study(a) {
    const spec = R.start('study', {
      label: 'Stop studying',
      seats: [
        { who: 'homama', x: HDX, z: -3.62, y: 0.15, yaw: P, pose: 'sit', hands: 'type' },
        { who: 'roji', x: RDX, z: -3.62, y: 0.15, yaw: P, pose: 'sit', hands: 'read' },
      ],
      focus: { x: 13.1, z: -3.7, y: 1.25, zoom: 0.62 },
      music: 0.5,
      exit: { x: 13.1, z: -2.4 },
      update(dt) {
        st.lineT += dt;
        if (st.lineT > 4.2) {
          st.lineT = 0;
          st.line = (st.line + 1) % LINES.length;
          a.toast(LINES[st.line], 3600);
          a.fx.heartsAt(R.headPos(st.line % 2 ? a.roji : a.homama), 2);
        }
      },
      onEnd(silent) {
        book.removeFromParent();
        if (!silent) a.toast('Great study session!', 1800);
      },
    });
    if (!spec) return;
    st.lineT = 0;
    st.line = 0;
    a.toast(R.cat?.spot === 'laptop' ? 'Mishmish is fast asleep on Homama\'s laptop. He types around her, very carefully.' : LINES[0], 3600);
    book.position.set(0, 0.1, 0.02);
    book.rotation.set(-0.7, 0, 0);
    a.roji.kid.carryAnchor.add(book);
  }
  R.hot({ x: 13.1, z: -2.45, r: 1.4, label: 'Study together', icon: 'code', act: study });

  R.upd((dt, t, a) => {
    const on = R.is('study');
    const near = api.localPos(api.player).x > 9.5;
    if (!on && !near) return;
    st.scroll += dt * (on ? 34 : 9);
    st.t += dt;
    if (st.t > (on ? 1 / 12 : 1 / 5)) {
      st.t = 0;
      screens[0].draw(st.scroll);
      screens[1].draw(st.scroll * 0.6);
    }
  });
  R.onExit(() => book.removeFromParent());
}
