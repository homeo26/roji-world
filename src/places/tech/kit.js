import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, umat, mesh, canvasTexture, roundRect, FONT, rng } from '../../util.js';

// Shared parts for the Tech Studio, its interior and the Ship It! game:
// palette, primitive helpers, canvas textures (code, pipeline, photo of Roji, stickers, whiteboard) and the rubber duck.

export const COL = {
  cream: '#fff6ec',
  cream2: '#f7ead2',
  peach: '#ffd9c2',
  pink: '#ff9eb5',
  coral: '#ef5b6f',
  teal: '#21a99a',
  tealDark: '#17857a',
  mint: '#8fd3b5',
  sky: '#6fb8ff',
  blue: '#3f7bf0',
  navy: '#2c3e66',
  sun: '#ffd166',
  wood: '#c49464',
  woodDark: '#9b6a43',
  white: '#ffffff',
  grey: '#d9dde3',
  steel: '#aeb6c2',
  ink: '#2b2f3a',
  leaf: '#6cc24a',
  leafDark: '#3fa45a',
  pot: '#e98a6b',
  lilac: '#c7a6ff',
  duck: '#ffd23f',
  beak: '#ff9f1c',
};

const RB = new Map();
export const box = (w, h, d, c, o) => mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? mat(c, o) : c);
export const rbox = (w, h, d, c, r = 0.06, o) => {
  const key = `${w}|${h}|${d}|${r}`;
  if (!RB.has(key)) RB.set(key, new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)));
  return mesh(RB.get(key), typeof c === 'string' ? mat(c, o) : c);
};
export const cyl = (a, b, h, c, seg = 16, o) => mesh(new THREE.CylinderGeometry(a, b, h, seg), typeof c === 'string' ? mat(c, o) : c);
export const sph = (r, c, o, seg = 16) => mesh(new THREE.SphereGeometry(r, seg, Math.max(8, Math.round(seg * 0.75))), typeof c === 'string' ? mat(c, o) : c);
export const at = (o, x, y, z) => (o.position.set(x, y, z), o);
export const planeTex = (w, h, tex, o = {}) =>
  mesh(new THREE.PlaneGeometry(w, h), o.basic ? new THREE.MeshBasicMaterial({ map: tex, transparent: !!o.transparent, toneMapped: o.toneMapped ?? true }) : new THREE.MeshStandardMaterial({ map: tex, roughness: o.rough ?? 0.7, transparent: !!o.transparent, emissive: o.glow ? '#ffffff' : '#000000', emissiveMap: o.glow ? tex : null, emissiveIntensity: o.glow ?? 0 }), { cast: false });

export function glowSprite(color = '#fff3c4', size = 1) {
  const tex = canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, opacity: 0.8 }));
  s.scale.setScalar(size);
  return s;
}

export function pattern(w, h, base, draw, rx = 1, ry = 1) {
  const t = canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    draw(ctx, w, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}

// ------------------------------------------------------------------ code on screens
const CODE = [
  "const day = new Day({ mood: 'sunny' });",
  '',
  'function remind(patient) {',
  '  if (!patient.visited) {',
  "    send(patient, 'See you soon!');",
  '  }',
  '  return true;',
  '}',
  '',
  "// built with love for Roji's clinic",
  'for (const task of todo) {',
  '  task.done = await ship(task);',
  '}',
  '',
  "test('reminders arrive on time', () => {",
  '  expect(remind(patient)).toBe(true);',
  '});',
  '',
  'while (coding) sip(coffee, 2);',
  "const smile = roji.happy ? 'big' : 'bigger';",
  '',
  'export function cheer() {',
  "  return 'You can do it, Homama!';",
  '}',
  '',
  'const bugs = [];',
  "if (tests.pass) deploy('today');",
  '',
];
const KW = /^(const|function|if|for|await|export|default|while|return|new|of|true|false)$/;
const MONO = "ui-monospace, 'DejaVu Sans Mono', 'Menlo', monospace";

function drawCodeLine(ctx, line, x, y, size) {
  ctx.font = `600 ${size}px ${MONO}`;
  const cw = ctx.measureText('m').width;
  const ci = line.indexOf('//');
  if (ci >= 0) {
    ctx.fillStyle = '#9a8fbf';
    ctx.fillText(line, x, y);
    return;
  }
  const parts = line.match(/('[^']*'|\d+|[A-Za-z_]+|\s+|[^\sA-Za-z_\d'])/g) || [];
  let cx = x;
  parts.forEach((p, i) => {
    let c = '#f3eefc';
    if (p[0] === "'") c = '#ffd166';
    else if (/^\d+$/.test(p)) c = '#ffb37a';
    else if (KW.test(p)) c = '#ff8fb1';
    else if (/^[A-Za-z_]+$/.test(p) && parts[i + 1] === '(') c = '#7fe0d0';
    else if (/^[{}()[\];.,]$/.test(p)) c = '#c9bfe8';
    ctx.fillStyle = c;
    ctx.fillText(p, cx, y);
    cx += cw * p.length;
  });
}

// A screen whose code scrolls forever (texture offset only, no redraw). aspect = width / height of the screen.
export function codeScreen(aspect, seed = 1, { bg = '#2a2440' } = {}) {
  const W = 512;
  const lineH = 30;
  const lines = CODE.length;
  const H = lineH * lines;
  const r = rng(seed);
  const shift = Math.floor(r() * lines);
  const tex = canvasTexture(W, H, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, 0, 44, H);
    ctx.textBaseline = 'middle';
    for (let i = 0; i < lines; i++) {
      const line = CODE[(i + shift) % lines];
      const y = i * lineH + lineH / 2;
      ctx.fillStyle = 'rgba(201,191,232,0.45)';
      ctx.font = `500 16px ${MONO}`;
      ctx.fillText(String(i + 1).padStart(2, ' '), 8, y);
      drawCodeLine(ctx, line, 56, y, 19);
    }
  });
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, Math.min(1, W / aspect / H));
  return tex;
}

// A screen that is redrawn on demand. draw(ctx, w, h) is called by redraw().
export function drawScreen(aspect, draw, w = 512) {
  const h = Math.round(w / aspect);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const s = {
    tex,
    ctx,
    w,
    h,
    redraw: (...args) => {
      draw(ctx, w, h, ...args);
      tex.needsUpdate = true;
    },
  };
  s.redraw();
  return s;
}

function check(ctx, x, y, s, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.22;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.45, y);
  ctx.lineTo(x - s * 0.1, y + s * 0.35);
  ctx.lineTo(x + s * 0.5, y - s * 0.35);
  ctx.stroke();
}

export const STAGES = ['Build', 'Test', 'Review', 'Deploy'];
// states: array of 'wait' | 'run' | 'ok' | 'fail', one per stage. t animates the running dots.
export function drawPipeline(ctx, w, h, states = ['wait', 'wait', 'wait', 'wait'], t = 0, note = null) {
  const allOk = states.every((s) => s === 'ok');
  const fail = states.includes('fail');
  ctx.fillStyle = fail ? '#3a2030' : allOk ? '#15382f' : '#1f2a3a';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f3eefc';
  ctx.font = `600 ${h * 0.11}px ${FONT}`;
  ctx.fillText('Pipeline', w * 0.06, h * 0.14);
  ctx.textAlign = 'right';
  ctx.font = `600 ${h * 0.075}px ${FONT}`;
  ctx.fillStyle = fail ? '#ff8b98' : allOk ? '#7ee8a8' : '#ffd166';
  ctx.fillText(note || (fail ? 'A bug got in!' : allOk ? 'All green' : 'Running'), w * 0.94, h * 0.14);
  const n = states.length;
  const y = h * 0.47;
  const x0 = w * 0.13;
  const step = (w * 0.74) / (n - 1);
  ctx.lineWidth = h * 0.03;
  for (let i = 0; i < n - 1; i++) {
    ctx.strokeStyle = states[i] === 'ok' ? '#3fd07f' : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(x0 + i * step, y);
    ctx.lineTo(x0 + (i + 1) * step, y);
    ctx.stroke();
  }
  const R = h * 0.12;
  states.forEach((s, i) => {
    const x = x0 + i * step;
    ctx.fillStyle = { wait: '#4a5568', run: '#ffc23f', ok: '#3fd07f', fail: '#ef5b6f' }[s];
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.fill();
    if (s === 'ok') check(ctx, x, y, R * 1.1, '#ffffff');
    else if (s === 'fail') {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = R * 0.25;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - R * 0.4, y - R * 0.4);
      ctx.lineTo(x + R * 0.4, y + R * 0.4);
      ctx.moveTo(x + R * 0.4, y - R * 0.4);
      ctx.lineTo(x - R * 0.4, y + R * 0.4);
      ctx.stroke();
    } else if (s === 'run') {
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = `rgba(80,50,0,${0.3 + 0.7 * ((Math.floor(t * 4) % 3) === k ? 1 : 0)})`;
        ctx.beginPath();
        ctx.arc(x + (k - 1) * R * 0.5, y, R * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#e8e3f5';
    ctx.textAlign = 'center';
    ctx.font = `600 ${h * 0.085}px ${FONT}`;
    ctx.fillText(STAGES[i] || '', x, y + R + h * 0.09);
  });
  // Little log lines at the bottom
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, w * 0.06, h * 0.78, w * 0.88, h * 0.15, h * 0.04);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.font = `500 ${h * 0.065}px ${MONO}`;
  ctx.fillStyle = fail ? '#ff8b98' : '#9ee6c4';
  const done = states.filter((s) => s === 'ok').length;
  ctx.fillText(fail ? '> 1 test failed: bug on the desk' : allOk ? '> shipped. well done!' : `> ${done * 32 + 12} tests passing`, w * 0.09, h * 0.855);
}

// ------------------------------------------------------------------ pictures
// Draw functions by name, with their canvas size, so they can also be painted into an Atlas.
export const DRAW = {};
export const SIZE = { rojiPhoto: [256, 320], laptopLid: [512, 352], deskMatTex: [512, 224], whiteboardTex: [1024, 480] };
// A little painted portrait of Roji in her pink dress, with a stethoscope.
export function rojiPhoto() {
  return canvasTexture(256, 320, DRAW.rojiPhoto);
}
function draw_rojiPhoto(ctx, w, h) {
  {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#ffe3ec');
    bg.addColorStop(1, '#ffd0dc');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    const heart = (x, y, s, c) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.35);
      ctx.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.35, y - s * 0.9, x, y - s * 0.35);
      ctx.bezierCurveTo(x + s * 0.35, y - s * 0.9, x + s * 0.9, y - s * 0.25, x, y + s * 0.35);
      ctx.fill();
    };
    heart(36, 40, 22, '#ff9eb5');
    heart(214, 70, 16, '#ffb3c7');
    heart(220, 250, 20, '#ff9eb5');
    heart(30, 230, 14, '#ffb3c7');
    const cx = w / 2;
    const cy = 138;
    // Pigtails
    ctx.fillStyle = '#2a1a13';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + s * 78, cy + 26, 26, 42, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ff7fa3';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + s * 66, cy - 8, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    // Dress and collar
    ctx.fillStyle = '#ef5b6f';
    ctx.beginPath();
    ctx.ellipse(cx, h + 20, 92, 92, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#fffaf4';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + s * 22, h - 62, 26, 12, -s * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Stethoscope
    ctx.strokeStyle = '#7b8494';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 36, h - 66);
    ctx.quadraticCurveTo(cx - 30, h - 16, cx + 6, h - 22);
    ctx.moveTo(cx + 36, h - 66);
    ctx.quadraticCurveTo(cx + 30, h - 30, cx + 6, h - 22);
    ctx.stroke();
    ctx.fillStyle = '#cfd6e0';
    ctx.beginPath();
    ctx.arc(cx + 6, h - 20, 9, 0, Math.PI * 2);
    ctx.fill();
    // Face
    ctx.fillStyle = '#f8dccb';
    ctx.beginPath();
    ctx.arc(cx, cy, 68, 0, Math.PI * 2);
    ctx.fill();
    // Hair cap and bangs
    ctx.fillStyle = '#2a1a13';
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 72, Math.PI * 1.02, Math.PI * 1.98);
    ctx.fill();
    for (const [x, r] of [[-38, 24], [-12, 26], [14, 26], [40, 22]]) {
      ctx.beginPath();
      ctx.arc(cx + x, cy - 44, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Bow
    ctx.fillStyle = '#ff7fa3';
    ctx.beginPath();
    ctx.ellipse(cx - 46, cy - 62, 14, 9, -0.4, 0, Math.PI * 2);
    ctx.ellipse(cx - 24, cy - 70, 14, 9, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // Eyes, cheeks, smile
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#1d130f';
      ctx.beginPath();
      ctx.ellipse(cx + s * 25, cy + 4, 9, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + s * 25 + 3, cy - 1, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,143,160,0.7)';
      ctx.beginPath();
      ctx.ellipse(cx + s * 42, cy + 26, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#b23a48';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy + 22, 13, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }
}

// Sticker-covered laptop lid, seen from above.
export function laptopLid() {
  return canvasTexture(512, 352, DRAW.laptopLid);
}
function draw_laptopLid(ctx, w, h) {
  {
    ctx.fillStyle = '#d7dbe6';
    roundRect(ctx, 0, 0, w, h, 30);
    ctx.fill();
    const pill = (x, y, ww, hh, c, text, tc = '#fff', rot = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, -ww / 2 - 6, -hh / 2 - 6, ww + 12, hh + 12, hh / 2 + 6);
      ctx.fill();
      ctx.fillStyle = c;
      roundRect(ctx, -ww / 2, -hh / 2, ww, hh, hh / 2);
      ctx.fill();
      ctx.fillStyle = tc;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${hh * 0.55}px ${FONT}`;
      ctx.fillText(text, 0, 2);
      ctx.restore();
    };
    pill(140, 80, 150, 60, '#21a99a', '</>', '#fff', -0.15);
    pill(360, 250, 170, 56, '#ffd166', 'Ship it', '#6b4a12', 0.12);
    // Heart
    ctx.save();
    ctx.translate(380, 96);
    ctx.rotate(0.2);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, 46);
    ctx.bezierCurveTo(-82, -6, -40, -76, 0, -30);
    ctx.bezierCurveTo(40, -76, 82, -6, 0, 46);
    ctx.fill();
    ctx.fillStyle = '#ef5b6f';
    ctx.scale(0.82, 0.82);
    ctx.beginPath();
    ctx.moveTo(0, 46);
    ctx.bezierCurveTo(-82, -6, -40, -76, 0, -30);
    ctx.bezierCurveTo(40, -76, 82, -6, 0, 46);
    ctx.fill();
    ctx.restore();
    // Star
    ctx.save();
    ctx.translate(110, 250);
    ctx.rotate(-0.2);
    for (const [r, c] of [[52, '#ffffff'], [42, '#ff9eb5']]) {
      ctx.fillStyle = c;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 ? r * 0.45 : r;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.fill();
    }
    ctx.restore();
    // Rainbow
    ctx.save();
    ctx.translate(250, 190);
    ['#ef5b6f', '#ffd166', '#7fd3a7', '#6fb8ff'].forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(0, 0, 54 - i * 12, Math.PI, 0);
      ctx.stroke();
    });
    ctx.restore();
    // Duck sticker
    ctx.save();
    ctx.translate(250, 60);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.ellipse(4, 10, 26, 18, 0, 0, Math.PI * 2);
    ctx.arc(-8, -10, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath();
    ctx.ellipse(-25, -8, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d130f';
    ctx.beginPath();
    ctx.arc(-11, -14, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function deskMatTex() {
  return canvasTexture(512, 224, DRAW.deskMatTex);
}
function draw_deskMatTex(ctx, w, h) {
  {
    ctx.fillStyle = '#2f3f6e';
    roundRect(ctx, 0, 0, w, h, 26);
    ctx.fill();
    const r = rng(7);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = ['rgba(255,209,102,0.7)', 'rgba(255,158,181,0.7)', 'rgba(127,224,208,0.7)'][i % 3];
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, 2 + r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 4;
    roundRect(ctx, 10, 10, w - 20, h - 20, 18);
    ctx.stroke();
  }
}

// Sticky notes and diagrams on the meeting room whiteboard.
export function whiteboardTex() {
  return canvasTexture(1024, 480, DRAW.whiteboardTex);
}
function draw_whiteboardTex(ctx, w, h) {
  {
    ctx.fillStyle = '#fdfdfb';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const note = (x, y, c, lines, rot) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(-44, -40, 92, 90);
      ctx.fillStyle = c;
      ctx.fillRect(-46, -44, 92, 88);
      ctx.fillStyle = '#4a3a3f';
      ctx.font = `600 17px ${FONT}`;
      lines.forEach((l, i) => ctx.fillText(l, 0, (i - (lines.length - 1) / 2) * 21));
      ctx.restore();
    };
    ctx.font = `600 30px ${FONT}`;
    const cols = [['To do', 90], ['Doing', 240], ['Done', 390]];
    for (const [t, x] of cols) {
      ctx.fillStyle = '#3b6fd6';
      ctx.fillText(t, x, 40);
    }
    ctx.strokeStyle = '#c9cfdb';
    ctx.lineWidth = 3;
    for (const x of [165, 315]) {
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, h - 30);
      ctx.stroke();
    }
    note(90, 120, '#fff0a3', ['Dark', 'mode'], -0.06);
    note(84, 230, '#ffc8d6', ['Fix the', 'login'], 0.05);
    note(94, 340, '#c6ecff', ['Coffee', 'break'], -0.03);
    note(240, 130, '#c9f2d9', ['Clinic', 'reminders'], 0.04);
    note(244, 250, '#fff0a3', ['Help', 'Roji'], -0.05);
    note(390, 120, '#ffc8d6', ['Tests', 'green'], 0.03);
    note(386, 236, '#c6ecff', ['New', 'icons'], -0.04);
    note(394, 350, '#ffd7a8', ['Ship', 'Friday'], 0.06);
    // Diagram: App -> API -> Database
    const boxAt = (x, y, label, c) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = 5;
      roundRect(ctx, x - 70, y - 34, 140, 68, 16);
      ctx.stroke();
      ctx.fillStyle = c;
      ctx.font = `600 26px ${FONT}`;
      ctx.fillText(label, x, y + 2);
    };
    const arrow = (x0, y0, x1, y1, c) => {
      ctx.strokeStyle = c;
      ctx.fillStyle = c;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      const a = Math.atan2(y1 - y0, x1 - x0);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - Math.cos(a - 0.5) * 18, y1 - Math.sin(a - 0.5) * 18);
      ctx.lineTo(x1 - Math.cos(a + 0.5) * 18, y1 - Math.sin(a + 0.5) * 18);
      ctx.fill();
    };
    boxAt(540, 90, 'App', '#ef5b6f');
    boxAt(760, 90, 'API', '#21a99a');
    boxAt(760, 230, 'Database', '#3b6fd6');
    arrow(612, 90, 686, 90, '#555c6b');
    arrow(760, 126, 760, 192, '#555c6b');
    // Chart going up
    ctx.strokeStyle = '#555c6b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(480, 300);
    ctx.lineTo(480, 440);
    ctx.lineTo(680, 440);
    ctx.stroke();
    ctx.strokeStyle = '#3fbf7f';
    ctx.lineWidth = 6;
    ctx.beginPath();
    [[490, 425], [530, 410], [570, 418], [610, 380], [650, 340], [675, 312]].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.fillStyle = '#555c6b';
    ctx.font = `600 22px ${FONT}`;
    ctx.fillText('Happy users', 580, 292);
    // Doodle heart and a tiny note
    ctx.strokeStyle = '#ef5b6f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(920, 400);
    ctx.bezierCurveTo(860, 350, 880, 300, 920, 330);
    ctx.bezierCurveTo(960, 300, 980, 350, 920, 400);
    ctx.stroke();
    note(900, 230, '#ffc8d6', ['Homama', 'loves', 'Roji'], 0.08);
    ctx.fillStyle = '#555c6b';
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText('Sprint goals', 900, 40);
  }
}

// Sky and soft town shapes for the windows.
export function cityWindowTex() {
  return canvasTexture(256, 192, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#8fd3ff');
    g.addColorStop(1, '#e7f7ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    for (const [x, y, s] of [[50, 40, 1], [180, 28, 0.8], [130, 70, 0.6]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, 26 * s, 11 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 16 * s, y - 7 * s, 17 * s, 11 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const blds = [[10, 60, '#ffd9c2'], [52, 90, '#c6ecff'], [86, 74, '#ffe0ea'], [120, 110, '#d6f2e4'], [160, 84, '#fff0c8'], [196, 100, '#e3dcff'], [232, 70, '#ffd9c2']];
    for (const [x, bh, c] of blds) {
      ctx.fillStyle = c;
      roundRect(ctx, x, h - bh, 34, bh + 10, 8);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let yy = h - bh + 10; yy < h - 8; yy += 16) for (const xx of [x + 7, x + 20]) ctx.fillRect(xx, yy, 7, 8);
    }
    ctx.fillStyle = '#8fd07a';
    for (const x of [30, 104, 150, 214]) {
      ctx.beginPath();
      ctx.arc(x, h - 6, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// What you see through the studio's front windows: warm rooms with glowing screens.
export function officeWindowTex() {
  return canvasTexture(256, 160, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#fff3dc');
    g.addColorStop(1, '#ffe1c6');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (const x of [44, 128, 212]) {
      ctx.beginPath();
      ctx.arc(x, 14, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const x of [20, 150]) {
      ctx.fillStyle = '#e8c49a';
      ctx.fillRect(x, 108, 86, 10);
      ctx.fillStyle = '#2b2f3a';
      roundRect(ctx, x + 10, 72, 30, 22, 3);
      roundRect(ctx, x + 46, 72, 30, 22, 3);
      ctx.fill();
      ctx.fillStyle = '#7fe0d0';
      ctx.fillRect(x + 13, 75, 24, 16);
      ctx.fillStyle = '#ff9eb5';
      ctx.fillRect(x + 49, 75, 24, 16);
    }
    ctx.fillStyle = '#6cc24a';
    for (const [x, y, r] of [[124, 96, 16], [116, 80, 11], [134, 82, 11]]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#e98a6b';
    ctx.fillRect(114, 104, 22, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(60, 0);
    ctx.lineTo(100, 0);
    ctx.lineTo(40, h);
    ctx.fill();
  });
}

// A glowing neon word on a dark rounded board (one texture, used as a Basic material).
export function neonTex(text, color = '#7fe0ff', { w = 512, h = 160, bg = 'rgba(0,0,0,0)', heart = true } = {}) {
  return canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${h * 0.5}px ${FONT}`;
    const tx = heart ? w / 2 - h * 0.25 : w / 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = h * 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = h * 0.06;
    ctx.strokeStyle = color;
    ctx.strokeText(text, tx, h / 2);
    ctx.fillText(text, tx, h / 2);
    if (heart) {
      const tw = ctx.measureText(text).width;
      const x = tx + tw / 2 + h * 0.35;
      const y = h / 2;
      const s = h * 0.22;
      ctx.shadowColor = '#ff7fa3';
      ctx.fillStyle = '#ffd0dc';
      ctx.strokeStyle = '#ff7fa3';
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.8);
      ctx.bezierCurveTo(x - s * 1.6, y - s * 0.3, x - s * 0.6, y - s * 1.5, x, y - s * 0.5);
      ctx.bezierCurveTo(x + s * 0.6, y - s * 1.5, x + s * 1.6, y - s * 0.3, x, y + s * 0.8);
      ctx.stroke();
      ctx.fill();
    }
  });
}

for (const n of Object.keys(SIZE)) DRAW[n] = { rojiPhoto: draw_rojiPhoto, laptopLid: draw_laptopLid, deskMatTex: draw_deskMatTex, whiteboardTex: draw_whiteboardTex }[n];

// Many small pictures painted into one canvas, so every decal in a scene shares one material (one draw call).
export class Atlas {
  constructor(size = 2048, { rough = 0.7, height = size, glow = 0.06 } = {}) {
    this.size = size;
    this.height = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    this.x = 0;
    this.y = 0;
    this.rowH = 0;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 8;
    this.material = new THREE.MeshStandardMaterial({ map: this.tex, roughness: rough, emissive: '#ffffff', emissiveMap: this.tex, emissiveIntensity: glow });
  }

  // Paint a w x h picture; returns its uv rectangle.
  add(w, h, draw) {
    const pad = 10;
    if (this.x + w > this.size) {
      this.x = 0;
      this.y += this.rowH + pad;
      this.rowH = 0;
    }
    const { x, y } = this;
    if (y + h > this.height) console.warn('atlas full');
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.beginPath();
    c.rect(0, 0, w, h);
    c.clip();
    draw(c, w, h);
    c.restore();
    this.x += w + pad;
    this.rowH = Math.max(this.rowH, h);
    this.tex.needsUpdate = true;
    const S = this.size;
    const H = this.height;
    return { u0: x / S, u1: (x + w) / S, v0: 1 - (y + h) / H, v1: 1 - y / H };
  }

  named(name) {
    const [w, h] = SIZE[name];
    return this.add(w, h, DRAW[name]);
  }

  fit(geo, r) {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, r.u0 + uv.getX(i) * (r.u1 - r.u0), r.v0 + uv.getY(i) * (r.v1 - r.v0));
    return geo;
  }

  plane(w, h, r) {
    return mesh(this.fit(new THREE.PlaneGeometry(w, h), r), this.material, { cast: false });
  }
}

// ------------------------------------------------------------------ models
// Rubber duck, facing +Z, about `size` metres tall, base at y = 0.
// Built as three merged meshes (yellow, orange, black) so it stays cheap even when animated.
const DUCK = new Map();
function duckGeos() {
  if (DUCK.size) return DUCK;
  const part = (r, w, h, [sx, sy, sz], [x, y, z], rx = 0) => {
    const geo = new THREE.SphereGeometry(r, w, h);
    geo.scale(sx, sy, sz);
    if (rx) geo.rotateX(rx);
    geo.translate(x, y, z);
    return geo;
  };
  DUCK.set('yellow', mergeGeometries([
    part(0.42, 18, 12, [1.12, 0.78, 1.18], [0, 0.32, -0.04]),
    part(0.16, 12, 8, [1, 1.2, 0.8], [0, 0.5, -0.46]),
    part(0.27, 18, 12, [1, 1, 1], [0, 0.8, 0.17]),
    part(0.18, 12, 8, [0.45, 0.7, 1.1], [0.4, 0.36, -0.06], -0.3),
    part(0.18, 12, 8, [0.45, 0.7, 1.1], [-0.4, 0.36, -0.06], -0.3),
  ]));
  DUCK.set('orange', part(0.13, 14, 8, [1.25, 0.45, 1.3], [0, 0.74, 0.43]));
  DUCK.set('black', mergeGeometries([part(0.045, 10, 8, [1, 1, 1], [0.12, 0.86, 0.4]), part(0.045, 10, 8, [1, 1, 1], [-0.12, 0.86, 0.4])]));
  return DUCK;
}

export function makeDuck(size = 0.12) {
  const g = new THREE.Group();
  const geos = duckGeos();
  g.add(mesh(geos.get('yellow'), mat(COL.duck, { rough: 0.35 })), mesh(geos.get('orange'), mat(COL.beak, { rough: 0.4 })), mesh(geos.get('black'), mat('#1d130f', { rough: 0.2 }), { cast: false }));
  for (const m of g.children) m.scale.setScalar(size);
  return g;
}

export function makePlant(kind = 'round', h = 0.6, potColor = COL.pot) {
  const g = new THREE.Group();
  const potH = h * 0.38;
  const pot = cyl(h * 0.22, h * 0.17, potH, potColor, 14);
  at(pot, 0, potH / 2, 0);
  const rim = cyl(h * 0.235, h * 0.235, potH * 0.18, potColor, 14);
  at(rim, 0, potH * 0.95, 0);
  const soil = cyl(h * 0.2, h * 0.2, 0.01, '#8a5a3c', 12);
  at(soil, 0, potH, 0);
  g.add(pot, rim, soil);
  if (kind === 'cactus') {
    const c = mesh(new THREE.CapsuleGeometry(h * 0.12, h * 0.3, 4, 10), mat(COL.leafDark));
    at(c, 0, potH + h * 0.24, 0);
    const arm = mesh(new THREE.CapsuleGeometry(h * 0.06, h * 0.12, 4, 8), mat(COL.leafDark));
    at(arm, h * 0.13, potH + h * 0.28, 0);
    arm.rotation.z = -0.5;
    const flower = sph(h * 0.06, COL.pink, undefined, 10);
    at(flower, 0, potH + h * 0.5, 0);
    g.add(c, arm, flower);
  } else if (kind === 'succulent') {
    const leaf = mat('#8fd3a7');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const l = mesh(new THREE.SphereGeometry(h * 0.1, 10, 8), leaf);
      l.scale.set(0.6, 0.5, 1.2);
      l.position.set(Math.sin(a) * h * 0.1, potH + h * 0.06, Math.cos(a) * h * 0.1);
      l.rotation.y = a;
      g.add(l);
    }
    const mid = sph(h * 0.08, '#8fd3a7', undefined, 10);
    at(mid, 0, potH + h * 0.1, 0);
    g.add(mid);
  } else if (kind === 'tall') {
    const stem = cyl(h * 0.015, h * 0.02, h * 0.55, COL.woodDark, 6);
    at(stem, 0, potH + h * 0.27, 0);
    g.add(stem);
    const leaf = mat(COL.leaf);
    const leaf2 = mat(COL.leafDark);
    for (const [x, y, z, r, m] of [[0, 0.78, 0, 0.2, leaf], [0.12, 0.66, 0.05, 0.15, leaf2], [-0.12, 0.64, -0.03, 0.15, leaf2], [0.03, 0.92, 0.05, 0.13, leaf2]]) {
      const b = mesh(new THREE.SphereGeometry(h * r, 12, 9), m);
      at(b, x * h, y * h, z * h);
      g.add(b);
    }
  } else {
    const leaf = mat(COL.leaf);
    for (const [x, y, z, r] of [[0, 0.62, 0, 0.24], [0.13, 0.55, 0.06, 0.17], [-0.12, 0.56, -0.05, 0.17]]) {
      const b = mesh(new THREE.SphereGeometry(h * r, 12, 9), leaf);
      at(b, x * h, y * h, z * h);
      g.add(b);
    }
  }
  return g;
}

export function makeMug(color = COL.white, band = COL.coral, s = 1) {
  const g = new THREE.Group();
  const body = cyl(0.045 * s, 0.04 * s, 0.1 * s, color, 14);
  at(body, 0, 0.05 * s, 0);
  const stripe = cyl(0.0465 * s, 0.0465 * s, 0.022 * s, band, 14);
  at(stripe, 0, 0.065 * s, 0);
  const handle = mesh(new THREE.TorusGeometry(0.026 * s, 0.008 * s, 6, 12), mat(color));
  at(handle, 0.047 * s, 0.055 * s, 0);
  const coffee = cyl(0.04 * s, 0.04 * s, 0.004 * s, '#8a5a3c', 12);
  at(coffee, 0, 0.094 * s, 0);
  g.add(body, stripe, handle, coffee);
  return g;
}

// Small props and things hung on the back wall do not need shadows. A material stops casting only when
// every mesh using it is small (radius < size) or sits behind wallZ, so merged buckets never split in two.
export function trimShadows(group, dynamic = [], { size = 0.16, wallZ = -Infinity } = {}) {
  const skip = new Set();
  for (const d of dynamic) d.traverse((o) => skip.add(o));
  group.updateMatrixWorld(true);
  const byMat = new Map();
  const s = new THREE.Vector3();
  const c = new THREE.Vector3();
  group.traverse((o) => {
    if (!o.isMesh || skip.has(o) || Array.isArray(o.material)) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    o.getWorldScale(s);
    const r = o.geometry.boundingSphere.radius * Math.max(s.x, s.y, s.z);
    c.copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld);
    const e = byMat.get(o.material) || { ok: true, list: [] };
    e.ok = e.ok && (r < size || c.z < wallZ);
    e.list.push(o);
    byMat.set(o.material, e);
  });
  for (const e of byMat.values()) if (e.ok) for (const o of e.list) o.castShadow = false;
}

export { mat, umat, mesh, canvasTexture, roundRect, FONT, rng };
