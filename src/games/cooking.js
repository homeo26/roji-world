// Roji's YumYum Kitchen: a Cooking Fever style shift at the YumYum restaurant, drawn on one canvas.
// Patties -> grill -> bun on a plate -> toppings -> guest. Fryer -> fries box. Soda machine -> cup.
// Tap food to pick it, then tap a guest; tap the same food again to serve whoever ordered it.
import { ICONS } from '../icons.js';

const ID = 'cooking';
const C = '#ff7a59';
const INK = '#3b2b3f';
const SOFT = '#6f5f73';
const FONT = 'Fredoka, ui-rounded, Nunito, system-ui, sans-serif';
const SHIFT = 90;

const ITEMS = {
  plain: { kind: 'burger', tops: [], price: 5, name: 'burger' },
  cheese: { kind: 'burger', tops: ['cheese'], price: 6, name: 'cheeseburger' },
  garden: { kind: 'burger', tops: ['lettuce', 'tomato'], price: 7, name: 'garden burger' },
  deluxe: { kind: 'burger', tops: ['cheese', 'lettuce', 'tomato'], price: 9, name: 'deluxe burger' },
  fries: { kind: 'fries', tops: [], price: 4, name: 'fries' },
  soda: { kind: 'soda', tops: [], price: 3, name: 'soda' },
};
const BURGERS = ['plain', 'cheese', 'garden', 'deluxe'];
const TOPS = ['cheese', 'lettuce', 'tomato'];
const LEVELS = [
  { name: 'Lunch time', goal: 60, items: { plain: 3, cheese: 3, soda: 3 }, sizes: [0.55, 0.45, 0], tops: ['cheese'], fryer: false, cook: 5, burn: 7, fry: 4, fryBurn: 10, fill: 2.2, patience: 32, extra: 6, spawn: [4, 7] },
  { name: 'Afternoon rush', goal: 100, items: { plain: 2, cheese: 2, garden: 2, fries: 3, soda: 3 }, sizes: [0.35, 0.45, 0.2], tops: TOPS, fryer: true, cook: 4.6, burn: 6.5, fry: 4, fryBurn: 9, fill: 2, patience: 32, extra: 6, spawn: [3.5, 6] },
  { name: 'Dinner party', goal: 140, items: { plain: 1, cheese: 2, garden: 2, deluxe: 2, fries: 3, soda: 3 }, sizes: [0.2, 0.45, 0.35], tops: TOPS, fryer: true, cook: 4.3, burn: 6, fry: 3.8, fryBurn: 8, fill: 1.9, patience: 30, extra: 6, spawn: [3, 5] },
];
const SPECIES = [
  ['cat', ['#f5a25d', '#b9b3c9', '#f1d3a8', '#8f7f7f']],
  ['bear', ['#b07a52', '#d9a066', '#9a7052']],
  ['bunny', ['#fbf3ec', '#f3d6e2', '#e2d3c4']],
  ['pig', ['#ffb8c6', '#ffc6b2']],
  ['frog', ['#8fd694', '#6fc7a8']],
  ['chick', ['#ffd166', '#ffe08a']],
  ['panda', ['#fdfaf6']],
];
const SHIRTS = ['#6fb8ff', '#7fd3a7', '#c7a6ff', '#ff9eb5', '#ffd166', '#3f7bf0', '#f08a5d', '#8b5cf6'];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeIn = (t) => Math.pow(clamp(t, 0, 1), 2);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const A = hexRgb(a);
  const B = hexRgb(b);
  const k = clamp(t, 0, 1);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
}
function shade(h, k) {
  const f = (v) => clamp(Math.round(v * k), 0, 255);
  return `rgb(${hexRgb(h).map(f).join(',')})`;
}
function pickWeighted(obj) {
  const e = Object.entries(obj).filter(([, w]) => w > 0);
  let r = Math.random() * e.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of e) {
    r -= w;
    if (r <= 0) return k;
  }
  return e[e.length - 1][0];
}

// ---------- canvas drawing helpers ----------
function rr(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.01, r), 0, Math.PI * 2);
}
function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
}
function panel(ctx, r, fill = '#fffaf3', rad = 14) {
  ctx.fillStyle = 'rgba(150,90,50,.14)';
  rr(ctx, r.x, r.y + 3, r.w, r.h, rad);
  ctx.fill();
  ctx.fillStyle = fill;
  rr(ctx, r.x, r.y, r.w, r.h, rad);
  ctx.fill();
}
function text(ctx, str, x, y, px, color = INK, align = 'center', weight = 600) {
  ctx.font = `${weight} ${px}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}
function wrap(ctx, str, maxW, px, weight = 500) {
  ctx.font = `${weight} ${px}px ${FONT}`;
  const out = [];
  let line = '';
  for (const w of str.split(' ')) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) {
      out.push(line);
      line = w;
    } else line = t;
  }
  if (line) out.push(line);
  return out;
}

const PATHS = {};
function icon(ctx, name, cx, cy, size, fill, stroke, lw = 2.4) {
  const p = PATHS[name] || (PATHS[name] = new Path2D(ICONS[name]));
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill(p);
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(p);
  }
  ctx.restore();
}
function drawHeart(ctx, x, y, size, frac) {
  const yy = y - size * 0.06;
  icon(ctx, 'heart', x, yy, size, '#f3d0d8');
  if (frac <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - size / 2, yy - size / 2, (size * (5 + 14 * clamp(frac, 0, 1))) / 24, size);
  ctx.clip();
  icon(ctx, 'heart', x, yy, size, '#ef5b6f');
  ctx.restore();
}
function drawCheck(ctx, x, y, r) {
  ctx.fillStyle = '#3fbf7f';
  circle(ctx, x, y, r);
  ctx.fill();
  icon(ctx, 'check', x, y, r * 1.5, null, '#fff', 3.4);
}
function drawCoin(ctx, x, y, r) {
  ctx.fillStyle = '#e2a52e';
  circle(ctx, x, y + r * 0.12, r);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.strokeStyle = '#f0b73e';
  ctx.lineWidth = Math.max(1, r * 0.16);
  circle(ctx, x, y, r * 0.62);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ellipse(ctx, x - r * 0.35, y - r * 0.4, r * 0.22, r * 0.12, -0.6);
  ctx.fill();
}

// A burger standing on its bottom edge at (cx, by), w wide. patty=false draws just the bottom bun.
function drawBurger(ctx, cx, by, w, tops, patty = true, pattyCol = '#7d4325') {
  const u = w / 10;
  let y = by;
  ctx.fillStyle = '#e09a4c';
  rr(ctx, cx - w / 2, y - 2.1 * u, w, 2.1 * u, u);
  ctx.fill();
  ctx.fillStyle = '#f6cd8c';
  rr(ctx, cx - w / 2 + 0.5 * u, y - 2.1 * u, w - u, 0.7 * u, 0.35 * u);
  ctx.fill();
  y -= 1.9 * u;
  if (!patty) return;
  ctx.fillStyle = pattyCol;
  rr(ctx, cx - w * 0.54, y - 1.8 * u, w * 1.08, 1.8 * u, 0.9 * u);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  for (const k of [-0.3, -0.05, 0.22, 0.4]) {
    circle(ctx, cx + k * w, y - 0.9 * u, 0.18 * u);
    ctx.fill();
  }
  y -= 1.55 * u;
  if (tops.includes('cheese')) {
    ctx.fillStyle = '#ffcd3c';
    rr(ctx, cx - w * 0.52, y - 0.7 * u, w * 1.04, 0.75 * u, 0.25 * u);
    ctx.fill();
    for (const k of [-0.32, 0.05, 0.34]) {
      ctx.beginPath();
      ctx.moveTo(cx + k * w - 0.7 * u, y);
      ctx.lineTo(cx + k * w + 0.7 * u, y);
      ctx.lineTo(cx + k * w, y + 1.1 * u);
      ctx.closePath();
      ctx.fill();
    }
    y -= 0.6 * u;
  }
  if (tops.includes('tomato')) {
    ctx.fillStyle = '#ec4b4b';
    rr(ctx, cx - w * 0.48, y - 0.85 * u, w * 0.96, 0.85 * u, 0.42 * u);
    ctx.fill();
    ctx.fillStyle = '#ff9a8a';
    for (const k of [-0.25, 0.05, 0.3]) {
      ellipse(ctx, cx + k * w, y - 0.45 * u, 0.5 * u, 0.16 * u);
      ctx.fill();
    }
    y -= 0.7 * u;
  }
  if (tops.includes('lettuce')) {
    ctx.fillStyle = '#62bf5e';
    const x0 = cx - w * 0.56;
    const x1 = cx + w * 0.56;
    const n = 8;
    ctx.beginPath();
    ctx.moveTo(x0, y - 0.7 * u);
    ctx.lineTo(x1, y - 0.7 * u);
    for (let i = n; i >= 0; i--) ctx.lineTo(lerp(x0, x1, i / n), y + (i % 2 ? 0.6 : -0.05) * u);
    ctx.closePath();
    ctx.fill();
    y -= 0.6 * u;
  }
  ctx.fillStyle = '#f0b25e';
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.5, y + 0.3 * u);
  ctx.bezierCurveTo(cx - w * 0.52, y - 4.4 * u, cx + w * 0.52, y - 4.4 * u, cx + w * 0.5, y + 0.3 * u);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ellipse(ctx, cx - w * 0.2, y - 2.3 * u, w * 0.13, 0.5 * u, -0.3);
  ctx.fill();
  ctx.fillStyle = '#fff4d6';
  for (const [dx, dy] of [[-0.1, -2.8], [0.12, -2.6], [0.28, -1.8], [-0.3, -1.5], [0.03, -1.6]]) {
    ellipse(ctx, cx + dx * w, y + dy * u, 0.32 * u, 0.18 * u);
    ctx.fill();
  }
}
// Fries box centred at (cx, cy), about s tall. tone: -1 pale, 0 golden, 1 burnt.
function drawFries(ctx, cx, cy, s, tone = 0, box = true) {
  const fc = tone >= 1 ? '#4a3426' : tone < 0 ? '#f6e3a1' : '#ffcf4a';
  const boxTop = cy - s * 0.04;
  [-0.22, -0.12, -0.01, 0.1, 0.21, -0.17, 0.15, 0.04].forEach((k, i) => {
    const h = s * (0.36 + ((i * 37) % 10) / 70);
    ctx.save();
    ctx.translate(cx + k * s, boxTop + s * 0.06);
    ctx.rotate(k * 0.7);
    ctx.fillStyle = fc;
    rr(ctx, -s * 0.045, -h, s * 0.09, h, s * 0.03);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,90,20,.18)';
    ctx.fillRect(s * 0.015, -h + s * 0.03, s * 0.025, h - s * 0.05);
    ctx.restore();
  });
  if (!box) return;
  ctx.fillStyle = C;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.36, boxTop);
  ctx.quadraticCurveTo(cx, boxTop + s * 0.12, cx + s * 0.36, boxTop);
  ctx.lineTo(cx + s * 0.27, cy + s * 0.46);
  ctx.lineTo(cx - s * 0.27, cy + s * 0.46);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  ctx.fillRect(cx - s * 0.28, cy + s * 0.38, s * 0.56, s * 0.08);
  icon(ctx, 'heart', cx, cy + s * 0.22, s * 0.3, '#fff1e8');
}
// Cup centred at (cx, cy), about s tall. fill 0..1 is the soda level; lid adds a lid and straw.
function drawCup(ctx, cx, cy, s, fill = 1, lid = true) {
  const tw = s * 0.3;
  const bw = s * 0.22;
  const top = cy - s * 0.28;
  const bot = cy + s * 0.46;
  if (lid) {
    ctx.strokeStyle = '#ff9eb5';
    ctx.lineWidth = s * 0.07;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.04, top);
    ctx.lineTo(cx + s * 0.14, top - s * 0.24);
    ctx.lineTo(cx + s * 0.24, top - s * 0.26);
    ctx.stroke();
  }
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(cx - tw, top);
    ctx.lineTo(cx + tw, top);
    ctx.lineTo(cx + bw, bot);
    ctx.quadraticCurveTo(cx, bot + s * 0.04, cx - bw, bot);
    ctx.closePath();
  };
  body();
  ctx.fillStyle = '#fffdf9';
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  const lvl = bot - (bot - top) * clamp(fill, 0, 1);
  ctx.fillStyle = '#ff9f43';
  ctx.fillRect(cx - tw, lvl, tw * 2, bot - lvl + 4);
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  for (let i = 0; i < 3 && fill > 0.2; i++) {
    circle(ctx, cx - tw * 0.4 + i * tw * 0.4, lvl + (bot - lvl) * (0.3 + i * 0.2), s * 0.025);
    ctx.fill();
  }
  if (lid) {
    ctx.fillStyle = C;
    ctx.fillRect(cx - tw, cy + s * 0.02, tw * 2, s * 0.16);
    icon(ctx, 'heart', cx, cy + s * 0.1, s * 0.13, '#fff');
  }
  ctx.restore();
  body();
  ctx.strokeStyle = 'rgba(120,70,50,.25)';
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.stroke();
  if (lid) {
    ctx.fillStyle = '#ffd9cc';
    rr(ctx, cx - tw * 1.12, top - s * 0.07, tw * 2.24, s * 0.1, s * 0.05);
    ctx.fill();
  }
}
function drawRawPatty(ctx, cx, cy, rx, col = '#f08f98') {
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  ellipse(ctx, cx, cy + rx * 0.14, rx, rx * 0.74);
  ctx.fill();
  ctx.fillStyle = col;
  ellipse(ctx, cx, cy, rx, rx * 0.74);
  ctx.fill();
}
function drawTopping(ctx, name, cx, cy, s, n = 3) {
  const spots = n === 1 ? [[0, 0, 0]] : [[-0.22, 0.08, -0.2], [0.2, 0.1, 0.25], [0, -0.12, 0.05]];
  for (const [dx, dy, rot] of spots) {
    const x = cx + dx * s;
    const y = cy + dy * s;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    if (name === 'cheese') {
      ctx.fillStyle = '#ffcd3c';
      rr(ctx, -s * 0.24, -s * 0.24, s * 0.48, s * 0.48, s * 0.06);
      ctx.fill();
      ctx.fillStyle = '#f0b41e';
      circle(ctx, -s * 0.08, -s * 0.06, s * 0.05);
      ctx.fill();
      circle(ctx, s * 0.1, s * 0.09, s * 0.04);
      ctx.fill();
    } else if (name === 'lettuce') {
      ctx.fillStyle = '#62bf5e';
      ellipse(ctx, 0, 0, s * 0.28, s * 0.2);
      ctx.fill();
      ctx.strokeStyle = '#3f9a43';
      ctx.lineWidth = Math.max(1, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, 0);
      ctx.lineTo(s * 0.2, 0);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ec4b4b';
      circle(ctx, 0, 0, s * 0.23);
      ctx.fill();
      ctx.fillStyle = '#ff8f80';
      circle(ctx, 0, 0, s * 0.15);
      ctx.fill();
      ctx.fillStyle = '#fff1c4';
      for (const a of [0, 2.1, 4.2]) {
        ellipse(ctx, Math.cos(a) * s * 0.08, Math.sin(a) * s * 0.08, s * 0.03, s * 0.02, a);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

// A round little animal guest, head centred at (x, y) with radius r. mood: 'happy' | 'ok' | 'grumpy'.
function drawAnimal(ctx, c, x, y, r, mood) {
  const col = c.col;
  const sp = c.sp;
  const inner = '#ffb3c1';
  const dark = '#2b2430';
  ctx.fillStyle = c.shirt;
  ellipse(ctx, x, y + r * 1.42, r * 1.02, r * 0.72);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ellipse(ctx, x, y + r * 0.9, r * 0.34, r * 0.12);
  ctx.fill();
  if (sp === 'cat') {
    for (const k of [-1, 1]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x + k * r * 0.88, y - r * 0.2);
      ctx.lineTo(x + k * r * 0.74, y - r * 1.15);
      ctx.lineTo(x + k * r * 0.16, y - r * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = inner;
      ctx.beginPath();
      ctx.moveTo(x + k * r * 0.72, y - r * 0.45);
      ctx.lineTo(x + k * r * 0.68, y - r * 0.95);
      ctx.lineTo(x + k * r * 0.36, y - r * 0.74);
      ctx.closePath();
      ctx.fill();
    }
  } else if (sp === 'bear' || sp === 'panda') {
    for (const k of [-1, 1]) {
      ctx.fillStyle = sp === 'panda' ? dark : col;
      circle(ctx, x + k * r * 0.68, y - r * 0.7, r * 0.34);
      ctx.fill();
      ctx.fillStyle = sp === 'panda' ? '#4a3f4f' : shade(col, 1.18);
      circle(ctx, x + k * r * 0.68, y - r * 0.7, r * 0.17);
      ctx.fill();
    }
  } else if (sp === 'bunny') {
    for (const k of [-1, 1]) {
      ctx.save();
      ctx.translate(x + k * r * 0.36, y - r * 1.02);
      ctx.rotate(k * 0.16);
      ctx.fillStyle = col;
      ellipse(ctx, 0, 0, r * 0.22, r * 0.6);
      ctx.fill();
      ctx.fillStyle = inner;
      ellipse(ctx, 0, r * 0.06, r * 0.11, r * 0.44);
      ctx.fill();
      ctx.restore();
    }
  } else if (sp === 'pig') {
    for (const k of [-1, 1]) {
      ctx.fillStyle = shade(col, 0.88);
      ctx.beginPath();
      ctx.moveTo(x + k * r * 0.86, y - r * 0.32);
      ctx.lineTo(x + k * r * 0.82, y - r * 1.0);
      ctx.lineTo(x + k * r * 0.3, y - r * 0.82);
      ctx.closePath();
      ctx.fill();
    }
  } else if (sp === 'chick') {
    ctx.fillStyle = shade(col, 0.92);
    for (const a of [-0.45, 0, 0.45]) {
      ellipse(ctx, x + Math.sin(a) * r * 0.25, y - r * 1.02, r * 0.09, r * 0.24, a);
      ctx.fill();
    }
  }
  ctx.fillStyle = col;
  if (sp === 'frog') ellipse(ctx, x, y, r * 1.12, r * 0.88);
  else circle(ctx, x, y, r);
  ctx.fill();
  if (sp === 'panda' || sp === 'bunny') {
    ctx.strokeStyle = 'rgba(59,43,63,.12)';
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.stroke();
  }
  let ex = r * 0.36;
  let ey = y - r * 0.02;
  if (sp === 'frog') {
    ex = r * 0.5;
    ey = y - r * 0.68;
    for (const k of [-1, 1]) {
      ctx.fillStyle = col;
      circle(ctx, x + k * ex, ey, r * 0.34);
      ctx.fill();
      ctx.fillStyle = '#fff';
      circle(ctx, x + k * ex, ey, r * 0.24);
      ctx.fill();
    }
  }
  if (sp === 'panda') {
    for (const k of [-1, 1]) {
      ctx.fillStyle = dark;
      ellipse(ctx, x + k * ex, ey + r * 0.02, r * 0.2, r * 0.26, k * -0.5);
      ctx.fill();
    }
  }
  const eyeCol = sp === 'panda' ? '#fff' : '#2a1d22';
  ctx.strokeStyle = eyeCol;
  ctx.fillStyle = eyeCol;
  ctx.lineWidth = Math.max(1.2, r * 0.09);
  ctx.lineCap = 'round';
  for (const k of [-1, 1]) {
    const px = x + k * ex;
    if (mood === 'happy') {
      ctx.beginPath();
      ctx.arc(px, ey + r * 0.06, r * 0.11, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else {
      ellipse(ctx, px, ey, r * 0.085, r * 0.11);
      ctx.fill();
      if (sp !== 'panda') {
        ctx.fillStyle = '#fff';
        circle(ctx, px + r * 0.03, ey - r * 0.04, r * 0.03);
        ctx.fill();
        ctx.fillStyle = eyeCol;
      }
      if (mood === 'grumpy') {
        ctx.strokeStyle = sp === 'panda' ? '#fff' : '#2a1d22';
        ctx.beginPath();
        ctx.moveTo(px - k * r * 0.16, ey - r * 0.26);
        ctx.lineTo(px + k * r * 0.12, ey - r * 0.17);
        ctx.stroke();
        ctx.strokeStyle = eyeCol;
      }
    }
  }
  ctx.fillStyle = 'rgba(255,120,140,.45)';
  for (const k of [-1, 1]) {
    ellipse(ctx, x + k * r * 0.6, y + r * 0.28, r * 0.15, r * 0.09);
    ctx.fill();
  }
  let my = y + r * 0.42;
  if (sp === 'pig') {
    ctx.fillStyle = shade(col, 0.86);
    ellipse(ctx, x, y + r * 0.3, r * 0.3, r * 0.2);
    ctx.fill();
    ctx.fillStyle = shade(col, 0.6);
    for (const k of [-1, 1]) {
      ellipse(ctx, x + k * r * 0.1, y + r * 0.3, r * 0.05, r * 0.08);
      ctx.fill();
    }
    my = y + r * 0.62;
  } else if (sp === 'bear') {
    ctx.fillStyle = shade(col, 1.25);
    ellipse(ctx, x, y + r * 0.36, r * 0.32, r * 0.24);
    ctx.fill();
    ctx.fillStyle = dark;
    ellipse(ctx, x, y + r * 0.26, r * 0.1, r * 0.07);
    ctx.fill();
    my = y + r * 0.46;
  } else if (sp === 'chick') {
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.14, y + r * 0.2);
    ctx.lineTo(x + r * 0.14, y + r * 0.2);
    ctx.lineTo(x, y + r * 0.38);
    ctx.closePath();
    ctx.fill();
    my = y + r * 0.5;
  } else if (sp === 'cat' || sp === 'panda' || sp === 'bunny') {
    ctx.fillStyle = sp === 'panda' ? dark : '#ff8fa0';
    ellipse(ctx, x, y + r * 0.22, r * 0.08, r * 0.06);
    ctx.fill();
    my = y + r * 0.38;
  } else if (sp === 'frog') my = y + r * 0.3;
  ctx.strokeStyle = '#8a3a44';
  ctx.lineWidth = Math.max(1.2, r * 0.075);
  ctx.beginPath();
  if (mood === 'happy') {
    ctx.fillStyle = '#b23a48';
    ctx.moveTo(x - r * 0.18, my - r * 0.04);
    ctx.quadraticCurveTo(x, my + r * 0.28, x + r * 0.18, my - r * 0.04);
    ctx.closePath();
    ctx.fill();
  } else if (mood === 'ok') {
    ctx.moveTo(x - r * 0.12, my);
    ctx.quadraticCurveTo(x, my + r * 0.08, x + r * 0.12, my);
    ctx.stroke();
  } else {
    ctx.moveTo(x - r * 0.14, my + r * 0.08);
    ctx.quadraticCurveTo(x, my - r * 0.08, x + r * 0.14, my + r * 0.08);
    ctx.stroke();
  }
}
// Grumpy steam puffs above a head.
function drawSteam(ctx, x, y, r, T) {
  for (let i = 0; i < 2; i++) {
    const ph = (T * 0.9 + i * 0.5) % 1;
    ctx.fillStyle = `rgba(150,140,160,${0.55 * (1 - ph)})`;
    circle(ctx, x + (i ? 1 : -1) * r * (0.5 + ph * 0.3), y - r * (1.1 + ph * 0.6), r * (0.14 + ph * 0.16));
    ctx.fill();
  }
}

// ---------- small SVG icons for the level cards ----------
function svgBurger(tops, px = 28) {
  let y = 35;
  let s = `<rect x="5" y="${y - 6}" width="30" height="6" rx="3" fill="#e09a4c"/>`;
  y -= 6;
  s += `<rect x="4" y="${y - 5}" width="32" height="5" rx="2.5" fill="#7d4325"/>`;
  y -= 5;
  if (tops.includes('cheese')) {
    s += `<path d="M4 ${y - 2.5}h32v2.5h-5l-2.5 3-2.5-3h-8l-2.5 3-2.5-3H4z" fill="#ffcd3c"/>`;
    y -= 2.5;
  }
  if (tops.includes('tomato')) {
    s += `<rect x="6" y="${y - 3}" width="28" height="3" rx="1.5" fill="#ec4b4b"/>`;
    y -= 3;
  }
  if (tops.includes('lettuce')) {
    let d = `M3 ${y - 3}H37`;
    for (let i = 8; i >= 0; i--) d += `L${3 + (34 * i) / 8} ${y + (i % 2 ? 1.6 : 0)}`;
    s += `<path d="${d}Z" fill="#62bf5e"/>`;
    y -= 3;
  }
  s += `<path d="M5 ${y + 0.5}C5 ${y - 15} 35 ${y - 15} 35 ${y + 0.5}Z" fill="#f0b25e"/>`;
  s += `<ellipse cx="16" cy="${y - 7}" rx="1.6" ry="1" fill="#fff4d6"/><ellipse cx="24" cy="${y - 6}" rx="1.6" ry="1" fill="#fff4d6"/><ellipse cx="20" cy="${y - 9.5}" rx="1.6" ry="1" fill="#fff4d6"/>`;
  return `<svg width="${px}" height="${px}" viewBox="0 0 40 40" aria-hidden="true">${s}</svg>`;
}
function svgFries(px = 28) {
  let s = '';
  [10, 14, 18, 22, 26, 30].forEach((x, i) => (s += `<rect x="${x - 1.8}" y="${6 + (i % 3) * 2}" width="3.6" height="16" rx="1.5" fill="#ffcf4a" transform="rotate(${(x - 20) * 0.9} ${x} 22)"/>`));
  s += `<path d="M8 18Q20 22 32 18L29 36H11Z" fill="${C}"/>`;
  return `<svg width="${px}" height="${px}" viewBox="0 0 40 40" aria-hidden="true">${s}</svg>`;
}
function svgSoda(px = 28) {
  const s = `<path d="M21 9L25 2L29 2" fill="none" stroke="#ff9eb5" stroke-width="2.6" stroke-linecap="round"/><path d="M11 10H29L26.5 37H13.5Z" fill="#fffdf9" stroke="#e3cfc2" stroke-width="1.2"/><path d="M12.2 20H27.8L27.1 27H12.9Z" fill="${C}"/><rect x="9.5" y="7.5" width="21" height="4" rx="2" fill="#ffd9cc"/>`;
  return `<svg width="${px}" height="${px}" viewBox="0 0 40 40" aria-hidden="true">${s}</svg>`;
}
function svgItem(id, px) {
  const it = ITEMS[id];
  if (it.kind === 'burger') return svgBurger(it.tops, px);
  return it.kind === 'fries' ? svgFries(px) : svgSoda(px);
}
const LOCK_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS.lock}"/></svg>`;

function injectStyle() {
  if (document.getElementById(`style-g-${ID}`)) return;
  const st = document.createElement('style');
  st.id = `style-g-${ID}`;
  st.textContent = `
  .g-cooking-root { position: absolute; inset: 0; overflow: hidden; font-family: var(--font); }
  .g-cooking-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; cursor: pointer; -webkit-user-select: none; user-select: none; }
  .g-cooking-menu { position: absolute; inset: 0; display: grid; place-items: center; padding: 10px; background: rgba(255,240,228,.6); }
  .g-cooking-card { width: min(780px, 100%); max-height: 100%; background: var(--paper); border-radius: 24px; box-shadow: var(--shadow); padding: 14px 18px; display: flex; flex-direction: column; gap: 10px; animation: g-cooking-pop .3s cubic-bezier(.2,1.3,.4,1); }
  @keyframes g-cooking-pop { from { opacity: 0; transform: scale(.94); } }
  .g-cooking-head { display: flex; align-items: center; gap: 12px; }
  .g-cooking-head b { display: block; font-size: 1.15rem; }
  .g-cooking-head span { color: var(--ink-soft); font-size: .9rem; }
  .g-cooking-levels { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .g-cooking-lv { border: 0; border-radius: 18px; padding: 10px 12px; min-height: 44px; background: #fff; color: var(--ink); font: inherit; text-align: left; display: flex; flex-direction: column; gap: 3px; box-shadow: inset 0 -4px 0 rgba(0,0,0,.06), 0 4px 12px rgba(120,70,40,.12); transition: transform .15s; }
  .g-cooking-lv:hover:not(:disabled) { transform: translateY(-2px); }
  .g-cooking-lv:focus-visible { outline: 3px solid ${C}; outline-offset: 2px; }
  .g-cooking-lv.g-cooking-next { box-shadow: inset 0 0 0 3px ${C}, inset 0 -4px 0 rgba(0,0,0,.06), 0 6px 16px rgba(255,122,89,.3); }
  .g-cooking-lv:disabled { opacity: .55; cursor: default; }
  .g-cooking-lv i { font-style: normal; font-size: .72rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: ${C}; display: flex; align-items: center; gap: 4px; }
  .g-cooking-lv b { font-size: 1.05rem; }
  .g-cooking-lv small { color: var(--ink-soft); font-size: .82rem; }
  .g-cooking-icons { display: flex; flex-wrap: wrap; gap: 1px; min-height: 28px; align-items: center; }
  .g-cooking-hint { color: var(--ink-soft); font-size: .85rem; line-height: 1.3; margin: 0; }
  .g-cooking-hint kbd { font-size: .7rem; }
  @media (max-height: 440px) {
    .g-cooking-card { padding: 10px 14px; gap: 7px; border-radius: 20px; }
    .g-cooking-head b { font-size: 1.02rem; }
    .g-cooking-head span, .g-cooking-hint { font-size: .78rem; }
    .g-cooking-lv { padding: 7px 10px; }
  }
  @media (min-height: 620px) and (min-width: 1000px) {
    .g-cooking-card { width: min(900px, 100%); padding: 22px 26px; gap: 14px; }
    .g-cooking-head b { font-size: 1.4rem; }
    .g-cooking-head span, .g-cooking-hint { font-size: 1rem; }
    .g-cooking-lv { padding: 14px 16px; }
    .g-cooking-lv b { font-size: 1.25rem; }
  }
  @media (prefers-reduced-motion: reduce) { .g-cooking-card { animation: none; } .g-cooking-lv { transition: none; } }
  `;
  document.head.appendChild(st);
}

function svgImage(svg) {
  const img = new Image();
  const src = svg.includes('xmlns=') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
  return img;
}

export default {
  id: ID,
  start(stage, api) {
    injectStyle();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.createElement('div');
    root.className = 'g-cooking-root';
    const canvas = document.createElement('canvas');
    canvas.className = 'g-cooking-canvas';
    canvas.setAttribute('aria-label', "Roji's YumYum Kitchen");
    root.appendChild(canvas);
    stage.appendChild(root);
    const ctx = canvas.getContext('2d');
    const me = api.me;
    const partner = api.partner;
    const chefImg = svgImage(api.avatar(me, 160));
    const partnerImg = svgImage(api.avatar(partner, 160));

    let W = 1;
    let H = 1;
    let dpr = 1;
    let s = 1;
    let LW = 1000;
    let LH = 390;
    let ox = 0;
    let oy = 0;
    let L = null;
    let G = null;
    let fx = [];
    const shakes = {};
    let menu = null;
    let T = 0;
    let raf = 0;
    let last = performance.now();
    let alive = true;
    let scoreText = null;

    // ---------- layout (logical units; 1 unit = s CSS px) ----------
    function thirds(r, gap) {
      const w = (r.w - gap * 2) / 3;
      return [0, 1, 2].map((i) => ({ x: r.x + i * (w + gap), y: r.y, w, h: r.h }));
    }
    function layout() {
      let sc = H / 390;
      let lw = W / sc;
      let lh = 390;
      if (lw < 900) {
        sc = W / 900;
        lw = 900;
        lh = H / sc;
      }
      s = sc;
      LW = Math.min(lw, 1400);
      LH = Math.min(lh, 640);
      ox = (W / s - LW) / 2;
      oy = (H / s - LH) / 2;
      const f = LW / 1000;
      const topH = clamp(LH * 0.46, 176, 250);
      const cc = clamp(topH / 180, 1, 1.3);
      const awnH = 12 * cc;
      const chefW = clamp(178 * f, 160, 230);
      const chef = { x: 8, y: awnH * 1.6 + 4, w: chefW, h: topH - awnH * 1.6 - 12 };
      const sx0 = chef.x + chefW + 8;
      const seatW = (LW - 6 - sx0) / 3;
      const bs = Math.min(cc, (seatW - 14) / 170);
      const counterH = 26 * cc;
      const counterTop = topH - counterH;
      const headR = 25 * cc;
      const hy = counterTop - headR * 1.2;
      const iconS = 40 * bs;
      const bubbleH = 52 * bs;
      const bubbleY = Math.max(awnH * 1.6 + 4, hy - headR * 1.9 - bubbleH - 10);
      const seats = [0, 1, 2].map((i) => ({ x: sx0 + i * seatW, y: 0, w: seatW, h: topH, cx: sx0 + (i + 0.5) * seatW }));
      const ky0 = topH + 8;
      const ky1 = LH - 8;
      const kh = ky1 - ky0;
      const ks = clamp(kh / 195, 1, 1.35);
      const r1h = Math.round(kh * 0.52);
      const r2y = ky0 + r1h + 8;
      const r2h = ky1 - r2y;
      const m = 10 * f;
      const g = 10 * f;
      const xA = m;
      const xB = xA + 96 * f + g;
      const xC = xB + 316 * f + g;
      const xD = xC + 92 * f + g;
      const xE = xD + 218 * f + g;
      const wE = LW - m - xE;
      const grill = { x: xB, y: ky0, w: 316 * f, h: r1h };
      const tb = (kh - 12) / 3;
      L = {
        topH, cc, awnH, chef, seats, bs, counterH, counterTop, headR, hy, iconS, bubbleH, bubbleY, ks,
        labH: 15 * ks,
        box: { x: xA, y: ky0, w: 96 * f, h: r1h },
        trash: { x: xA, y: r2y, w: 96 * f, h: r2h },
        grill,
        gslots: thirds(grill, 0),
        plateRow: { x: xB, y: r2y, w: 316 * f, h: r2h },
        plates: thirds({ x: xB, y: r2y, w: 316 * f, h: r2h }, 6),
        tops: Object.fromEntries(TOPS.map((t, i) => [t, { x: xC, y: ky0 + i * (tb + 6), w: 92 * f, h: tb }])),
        fryer: { x: xD, y: ky0, w: 218 * f, h: r1h },
        friesTray: { x: xD, y: r2y, w: 218 * f, h: r2h },
        fslots: thirds({ x: xD, y: r2y, w: 218 * f, h: r2h }, 0),
        soda: { x: xE, y: ky0, w: wE, h: r1h },
        cupTray: { x: xE, y: r2y, w: wE, h: r2h },
        cslots: thirds({ x: xE, y: r2y, w: wE, h: r2h }, 0),
      };
      // Coin row sits under the chef avatar (avatar is min(h*.36, 62cc) tall, drawn from y + 0.3*size + 4).
      const avs = Math.min(chef.h * 0.36, 62 * cc);
      L.coinPt = { x: chef.x + 20 * cc, y: chef.y + avs * 1.3 + 4 + 12 * cc };
      L.hits = [
        ...seats.map((r, i) => [r, () => tapSeat(i)]),
        ...L.gslots.map((r, i) => [r, () => tapGrill(i)]),
        [L.box, tapBox],
        [L.trash, tapTrash],
        ...L.plates.map((r, i) => [r, () => tapPlate(i)]),
        ...TOPS.map((t) => [L.tops[t], () => tapTop(t)]),
        [L.fryer, tapFryer],
        ...L.fslots.map((r, i) => [r, () => tapFriesBox(i)]),
        [L.soda, tapSoda],
        ...L.cslots.map((r, i) => [r, () => tapCup(i)]),
      ];
    }
    function resize() {
      const r = stage.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      layout();
    }
    const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

    // ---------- state ----------
    function newShift(lv) {
      return {
        lv, cfg: LEVELS[lv], phase: 'ready', phaseT: 0, time: SHIFT, coins: 0, shown: 0, served: 0, lost: 0,
        grill: [null, null, null],
        plates: [0, 1, 2].map(() => ({ patty: false, tops: [] })),
        fryer: { on: false, t: 0 }, fries: [false, false, false],
        soda: { filling: false, t: 0 }, cups: [false, false, false],
        seats: [null, null, null], sel: null, spawnT: 0.6, partnerVisits: 0, partnerServed: false, hint: null,
      };
    }
    const pattyState = (p) => (p.t < G.cfg.cook ? 'raw' : p.t < G.cfg.cook + G.cfg.burn ? 'done' : 'burnt');
    const fryState = () => (!G.fryer.on ? 'empty' : G.fryer.t < G.cfg.fry ? 'cooking' : G.fryer.t < G.cfg.fry + G.cfg.fryBurn ? 'done' : 'burnt');
    function plateId(pl) {
      if (!pl.patty) return null;
      const key = [...pl.tops].sort().join(',');
      return BURGERS.find((b) => [...ITEMS[b].tops].sort().join(',') === key) || 'odd';
    }
    function selItem(sel) {
      if (!sel) return null;
      if (sel.kind === 'plate') return plateId(G.plates[sel.i]);
      if (sel.kind === 'fries') return G.fries[sel.i] ? 'fries' : null;
      return G.cups[sel.i] ? 'soda' : null;
    }
    const selKey = (sel) => sel.kind + sel.i;
    function selRect(sel) {
      return sel.kind === 'plate' ? L.plates[sel.i] : sel.kind === 'fries' ? L.fslots[sel.i] : L.cslots[sel.i];
    }
    function takeSel(sel) {
      if (sel.kind === 'plate') G.plates[sel.i] = { patty: false, tops: [] };
      else if (sel.kind === 'fries') G.fries[sel.i] = false;
      else G.cups[sel.i] = false;
      if (G.sel && G.sel.kind === sel.kind && G.sel.i === sel.i) G.sel = null;
    }
    function needs() {
      const n = {};
      for (const c of G.seats) if (c && c.st === 'wait') for (const o of c.order) if (!o.done) n[o.id] = (n[o.id] || 0) + 1;
      return n;
    }
    function makeOrder(cfg) {
      const n = Number(pickWeighted({ 1: cfg.sizes[0], 2: cfg.sizes[1], 3: cfg.sizes[2] }));
      const order = [];
      let burgers = 0;
      while (order.length < n) {
        const id = pickWeighted(cfg.items);
        if (ITEMS[id].kind === 'burger') {
          if (burgers >= 2) continue;
          burgers++;
        }
        order.push({ id, done: false });
      }
      const rank = { burger: 0, fries: 1, soda: 2 };
      return order.sort((a, b) => rank[ITEMS[a.id].kind] - rank[ITEMS[b.id].kind]);
    }
    function spawn(i) {
      const cfg = G.cfg;
      const here = G.seats.some((c) => c && c.who === 'partner');
      const isPartner = !here && G.partnerVisits < 2 && G.time < SHIFT - 8 && Math.random() < 0.2;
      const [sp, cols] = pick(SPECIES);
      const order = makeOrder(cfg);
      const max = cfg.patience + cfg.extra * (order.length - 1);
      if (isPartner) G.partnerVisits++;
      G.seats[i] = { who: isPartner ? 'partner' : 'animal', sp, col: pick(cols), shirt: pick(SHIRTS), order, max, pat: max, st: 'in', p: 0, t: 0, yum: 0, angry: false };
    }

    // ---------- effects ----------
    function shake(key, d = 0.35) {
      shakes[key] = d;
    }
    function shakeX(key) {
      const v = shakes[key];
      if (!v || reduce) return 0;
      return Math.sin(v * 60) * 5 * (v / 0.35);
    }
    function floatText(x, y, str, color = INK, px = 16) {
      fx.push({ kind: 'text', x, y, str, color, px, t: 0, dur: reduce ? 0.8 : 1.1 });
    }
    function fly(item, from, to, size, dur = 0.35) {
      fx.push({ kind: 'fly', item, from, to, size, t: 0, dur: reduce ? 0.12 : dur });
    }
    function bubblePoint(i, k) {
      const c = G.seats[i];
      const n = c.order.length;
      const is = L.iconS;
      const gap = 6 * L.bs;
      const pad = 8 * L.bs;
      const bw = n * is + (n - 1) * gap + pad * 2;
      const seat = L.seats[i];
      const bx = clamp(seat.cx - bw / 2, seat.x + 4, seat.x + seat.w - 4 - bw);
      return { x: bx + pad + k * (is + gap) + is / 2, y: L.bubbleY + L.bubbleH / 2, bx, bw };
    }
    function flyItemOf(id) {
      const it = ITEMS[id];
      return it.kind === 'burger' ? { type: 'burger', tops: it.tops } : { type: it.kind };
    }

    // ---------- actions ----------
    function placePatty(i) {
      G.grill[i] = { t: 0 };
      fly({ type: 'raw' }, center(L.box), center(L.gslots[i]), Math.min(L.gslots[i].w, L.gslots[i].h) * 0.34, 0.25);
      api.sfx('tap');
    }
    function tapBox() {
      const i = G.grill.indexOf(null);
      if (i < 0) {
        shake('box');
        shake('grill');
        api.sfx('tick');
        return;
      }
      placePatty(i);
    }
    function trashFrom(from, item) {
      fly(item, from, center(L.trash), L.iconS, 0.3);
      shake('trash', 0.25);
      api.sfx('swoosh');
    }
    function tapGrill(i) {
      const p = G.grill[i];
      if (!p) return placePatty(i);
      const st = pattyState(p);
      if (st === 'raw') {
        shake('g' + i, 0.25);
        api.sfx('tick');
      } else if (st === 'burnt') {
        G.grill[i] = null;
        trashFrom(center(L.gslots[i]), { type: 'burnt' });
      } else {
        const sel = G.sel;
        let j = sel && sel.kind === 'plate' && !G.plates[sel.i].patty ? sel.i : G.plates.findIndex((pl) => !pl.patty);
        if (j < 0) {
          shake('plates');
          api.sfx('tick');
          floatText(center(L.plateRow).x, L.plateRow.y + 10, 'Plates are full', SOFT, 14);
          return;
        }
        G.grill[i] = null;
        G.plates[j] = { patty: true, tops: [] };
        G.sel = { kind: 'plate', i: j };
        fly({ type: 'patty' }, center(L.gslots[i]), center(L.plates[j]), Math.min(L.gslots[i].w, L.gslots[i].h) * 0.34, 0.25);
        api.sfx('swoosh');
      }
    }
    function tapTop(t) {
      if (!G.cfg.tops.includes(t)) {
        shake('top' + t);
        api.sfx('tick');
        return;
      }
      const sel = G.sel;
      let j = sel && sel.kind === 'plate' && G.plates[sel.i].patty && !G.plates[sel.i].tops.includes(t) ? sel.i : -1;
      if (j < 0) j = G.plates.findIndex((pl) => pl.patty && !pl.tops.includes(t));
      if (j < 0) {
        shake('top' + t);
        api.sfx('tick');
        floatText(center(L.tops[t]).x, L.tops[t].y + 8, 'Plate a patty first', SOFT, 13);
        return;
      }
      G.plates[j].tops.push(t);
      G.sel = { kind: 'plate', i: j };
      fly({ type: 'top', name: t }, center(L.tops[t]), center(L.plates[j]), L.iconS, 0.22);
      api.sfx('tap');
    }
    function tapPlate(i) {
      const pl = G.plates[i];
      const sel = G.sel;
      if (pl.patty && sel && sel.kind === 'plate' && sel.i === i) return autoServe(sel);
      G.sel = { kind: 'plate', i };
      api.sfx('tap');
    }
    function tapFryer() {
      if (!G.cfg.fryer) {
        shake('fryer');
        api.sfx('tick');
        return;
      }
      const st = fryState();
      if (st === 'empty') {
        G.fryer = { on: true, t: 0 };
        api.sfx('tap');
      } else if (st === 'cooking') {
        shake('fryer', 0.25);
        api.sfx('tick');
      } else if (st === 'burnt') {
        G.fryer = { on: false, t: 0 };
        trashFrom(center(L.fryer), { type: 'fries', tone: 1 });
      } else {
        const j = G.fries.indexOf(false);
        if (j < 0) {
          shake('friesTray');
          api.sfx('tick');
          return;
        }
        G.fryer = { on: false, t: 0 };
        G.fries[j] = true;
        fly({ type: 'fries' }, center(L.fryer), center(L.fslots[j]), L.iconS, 0.25);
        api.sfx('swoosh');
      }
    }
    function tapHeld(kind, i, has) {
      if (!G.cfg.fryer && kind === 'fries') return;
      if (!has) {
        api.sfx('tick');
        return;
      }
      const sel = G.sel;
      if (sel && sel.kind === kind && sel.i === i) return autoServe(sel);
      G.sel = { kind, i };
      api.sfx('tap');
    }
    const tapFriesBox = (i) => tapHeld('fries', i, G.fries[i]);
    const tapCup = (i) => tapHeld('cup', i, G.cups[i]);
    function tapSoda() {
      if (G.soda.filling) {
        shake('soda', 0.25);
        api.sfx('tick');
        return;
      }
      if (G.cups.every(Boolean)) {
        shake('cupTray');
        api.sfx('tick');
        return;
      }
      G.soda = { filling: true, t: 0 };
      api.sfx('tap');
    }
    function tapTrash() {
      const sel = G.sel;
      const id = selItem(sel);
      if (id) {
        const it = id === 'odd' ? { type: 'burger', tops: G.plates[sel.i].tops } : flyItemOf(id);
        const from = center(selRect(sel));
        takeSel(sel);
        G.sel = null;
        trashFrom(from, it);
        return;
      }
      const b = G.grill.findIndex((p) => p && pattyState(p) === 'burnt');
      if (b >= 0) return tapGrill(b);
      if (G.cfg.fryer && fryState() === 'burnt') return tapFryer();
      G.sel = null;
      api.sfx('tick');
    }
    function serveTo(sel, i) {
      const c = G.seats[i];
      if (!c || c.st !== 'wait') return false;
      const id = selItem(sel);
      if (!id || id === 'odd') return false;
      const k = c.order.findIndex((o) => !o.done && o.id === id);
      if (k < 0) return false;
      const from = center(selRect(sel));
      const to = bubblePoint(i, k);
      c.order[k].done = true;
      takeSel(sel);
      G.sel = null;
      c.pat = Math.min(c.max, c.pat + c.max * 0.12);
      c.yum = 0.6;
      fly(flyItemOf(id), from, to, L.iconS * 0.9);
      api.sfx('good');
      if (c.order.every((o) => o.done)) pay(c, i);
      return true;
    }
    function autoServe(sel) {
      const id = selItem(sel);
      if (!id) return;
      const at = center(selRect(sel));
      if (id === 'odd') {
        shake(selKey(sel));
        api.sfx('bad');
        floatText(at.x, at.y - 30, 'No one ordered that', SOFT, 14);
        return;
      }
      let best = -1;
      G.seats.forEach((c, i) => {
        if (c && c.st === 'wait' && c.order.some((o) => !o.done && o.id === id) && (best < 0 || c.pat < G.seats[best].pat)) best = i;
      });
      if (best < 0) {
        shake(selKey(sel));
        api.sfx('tick');
        floatText(at.x, at.y - 30, 'No one is waiting for that', SOFT, 14);
        return;
      }
      serveTo(sel, best);
    }
    function tapSeat(i) {
      const c = G.seats[i];
      if (!c || c.st !== 'wait') return;
      if (!G.sel || !selItem(G.sel)) {
        shake('seat' + i, 0.25);
        api.sfx('tick');
        return;
      }
      if (!serveTo(G.sel, i)) {
        shake('seat' + i);
        api.sfx('bad');
        floatText(L.seats[i].cx, L.bubbleY + L.bubbleH + 14, 'Not on my order', SOFT, 14);
      }
    }
    function pay(c, i) {
      const base = c.order.reduce((a, o) => a + ITEMS[o.id].price, 0);
      const frac = clamp(c.pat / c.max, 0, 1);
      let tip = Math.round(frac * (1 + c.order.length * 1.5));
      if (c.who === 'partner') {
        tip += 3;
        G.partnerServed = true;
      }
      G.coins += base + tip;
      G.served++;
      c.st = 'pay';
      c.payT = reduce ? 0.5 : 0.9;
      const from = { x: L.seats[i].cx, y: L.hy };
      const n = reduce ? 1 : Math.min(6, 2 + c.order.length);
      for (let k = 0; k < n; k++) fx.push({ kind: 'coin', from, to: L.coinPt, t: -k * 0.07, dur: reduce ? 0.3 : 0.7 });
      floatText(from.x, L.hy - L.headR * 1.7, `+${base + tip}`, '#c77800', 22);
      if (tip > 0) floatText(from.x + L.headR * 1.6, L.hy - L.headR * 0.8, `tip ${tip}`, '#3fa06a', 14);
      if (!reduce) for (let k = 0; k < 3; k++) fx.push({ kind: 'heart', x: from.x + (k - 1) * L.headR * 0.7, y: L.hy - L.headR, t: -k * 0.12, dur: 1 });
      api.sfx('coin');
    }

    function tap(x, y) {
      if (!G || G.phase !== 'play') return;
      for (const [r, fn] of L.hits) {
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          fn();
          return;
        }
      }
    }

    // ---------- update ----------
    const walkDur = reduce ? 0.3 : 1.0;
    function update(dt) {
      for (const f of fx) f.t += dt;
      fx = fx.filter((f) => f.t < f.dur);
      for (const k in shakes) {
        shakes[k] -= dt;
        if (shakes[k] <= 0) delete shakes[k];
      }
      if (!G) return;
      G.shown += (G.coins - G.shown) * Math.min(1, dt * 6);
      if (Math.abs(G.coins - G.shown) < 0.5) G.shown = G.coins;
      updateCustomers(dt);
      if (G.phase === 'ready') {
        G.phaseT += dt;
        if (G.phaseT > (reduce ? 1 : 1.7)) G.phase = 'play';
        setScore();
        return;
      }
      if (G.phase === 'over') {
        G.phaseT += dt;
        if (G.phaseT > 1.6 && !G.finished) {
          G.finished = true;
          end();
        }
        return;
      }
      if (G.phase !== 'play') return;
      const cfg = G.cfg;
      G.time = Math.max(0, G.time - dt);
      G.grill.forEach((p) => {
        if (!p) return;
        const a = pattyState(p);
        p.t += dt;
        const b = pattyState(p);
        if (a !== b) api.sfx(b === 'done' ? 'pop' : 'bad');
      });
      if (G.fryer.on) {
        const a = fryState();
        G.fryer.t += dt;
        const b = fryState();
        if (a !== b) api.sfx(b === 'done' ? 'pop' : 'bad');
      }
      if (G.soda.filling) {
        G.soda.t += dt;
        if (G.soda.t >= cfg.fill) {
          const j = G.cups.indexOf(false);
          if (j >= 0) {
            G.cups[j] = true;
            fly({ type: 'soda' }, center(L.soda), center(L.cslots[j]), L.iconS, 0.25);
          }
          G.soda = { filling: false, t: 0 };
          api.sfx('pop');
        }
      }
      G.spawnT -= dt;
      if (G.spawnT <= 0) {
        const free = [0, 1, 2].filter((i) => !G.seats[i]);
        if (free.length && G.time > 10) {
          spawn(pick(free));
          G.spawnT = rnd(cfg.spawn[0], cfg.spawn[1]);
        } else G.spawnT = 0.8;
      }
      if (G.sel && !selItem(G.sel) && !(G.sel.kind === 'plate')) G.sel = null;
      G.hint = makeHint();
      if (G.time <= 0) {
        G.phase = 'over';
        G.phaseT = 0;
        G.sel = null;
        for (const c of G.seats) if (c && (c.st === 'wait' || c.st === 'in')) Object.assign(c, { st: 'out', p: 0 });
        api.sfx('tick');
      }
      setScore();
    }
    function updateCustomers(dt) {
      G.seats.forEach((c, i) => {
        if (!c) return;
        c.t += dt;
        c.yum = Math.max(0, c.yum - dt);
        if (c.st === 'in') {
          c.p = Math.min(1, c.p + dt / walkDur);
          if (c.p >= 1) c.st = 'wait';
        } else if (c.st === 'wait' && G.phase === 'play') {
          c.pat -= dt;
          if (c.pat <= 0) {
            c.pat = 0;
            c.st = 'out';
            c.p = 0;
            c.angry = true;
            G.lost++;
            api.sfx('bad');
            floatText(L.seats[i].cx, L.hy - L.headR * 1.6, 'Too slow', '#e5484d', 16);
          }
        } else if (c.st === 'pay') {
          c.payT -= dt;
          if (c.payT <= 0) {
            c.st = 'out';
            c.p = 0;
          }
        } else if (c.st === 'out') {
          c.p += dt / walkDur;
          if (c.p >= 1) G.seats[i] = null;
        }
      });
    }
    function setScore() {
      const sec = Math.ceil(G.time);
      const str = `${G.coins} / ${G.cfg.goal} coins · ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
      if (str !== scoreText) {
        scoreText = str;
        api.setScore(str);
      }
    }
    function makeHint() {
      const need = needs();
      const any = Object.keys(need).length > 0;
      if (G.sel && selItem(G.sel) && selItem(G.sel) !== 'odd') return { text: 'Tap a guest who ordered it, or tap it again', target: null };
      let i = G.grill.findIndex((p) => p && pattyState(p) === 'burnt');
      if (i >= 0) return { text: 'Burnt! Tap it to throw it away', target: L.gslots[i] };
      if (G.cfg.fryer && fryState() === 'burnt') return { text: 'Burnt fries! Tap the fryer to toss them', target: L.fryer };
      i = G.grill.findIndex((p) => p && pattyState(p) === 'done');
      if (i >= 0 && G.plates.some((pl) => !pl.patty)) return { text: 'Tap the cooked patty to put it on a bun', target: L.gslots[i] };
      for (let j = 0; j < 3; j++) {
        const pl = G.plates[j];
        const id = plateId(pl);
        if (!id) continue;
        if (need[id]) return { text: `Tap the ${ITEMS[id].name}, then tap the guest`, target: L.plates[j] };
        const want = BURGERS.find((b) => need[b] && pl.tops.every((t) => ITEMS[b].tops.includes(t)));
        if (want) {
          const t = ITEMS[want].tops.find((x) => !pl.tops.includes(x));
          return { text: `Add ${t} for the ${ITEMS[want].name}`, target: L.tops[t] };
        }
        if (any) return { text: 'No one wants that burger. Tap it, then the trash', target: L.plates[j] };
      }
      if (G.cfg.fryer && fryState() === 'done') return { text: 'Fries are ready! Tap the fryer to box them', target: L.fryer };
      i = G.fries.findIndex(Boolean);
      if (i >= 0 && need.fries) return { text: 'Tap the fries, then tap the guest', target: L.fslots[i] };
      i = G.cups.findIndex(Boolean);
      if (i >= 0 && need.soda) return { text: 'Tap the soda, then tap the guest', target: L.cslots[i] };
      const burgersNeeded = BURGERS.reduce((a, b) => a + (need[b] || 0), 0);
      const pattiesOut = G.grill.filter((p) => p && pattyState(p) !== 'burnt').length + G.plates.filter((pl) => pl.patty).length;
      if (burgersNeeded > pattiesOut && G.grill.includes(null)) return { text: 'Tap the patties to grill one', target: L.box };
      if (G.grill.some((p) => p && pattyState(p) === 'raw')) {
        if (need.soda > G.cups.filter(Boolean).length + (G.soda.filling ? 1 : 0)) return { text: 'While it sizzles, tap the soda machine', target: L.soda };
      }
      if (G.cfg.fryer && need.fries > G.fries.filter(Boolean).length + (G.fryer.on ? 1 : 0)) return { text: 'Tap the fryer to cook fries', target: L.fryer };
      if (need.soda > G.cups.filter(Boolean).length + (G.soda.filling ? 1 : 0)) return { text: 'Tap the soda machine to fill a cup', target: L.soda };
      if (G.grill.some(Boolean)) return { text: 'Sizzle sizzle... watch the grill', target: null };
      if (!G.seats.some(Boolean)) return { text: 'Guests are on the way', target: null };
      return { text: 'Keep the guests happy!', target: null };
    }

    // ---------- menu and end ----------
    function loadBest() {
      const b = api.load('best', [0, 0, 0]);
      return Array.isArray(b) ? [0, 1, 2].map((i) => Number(b[i]) || 0) : [0, 0, 0];
    }
    const loadUnlocked = () => clamp(Number(api.load('unlocked', 1)) || 1, 1, LEVELS.length);
    function showMenu() {
      G = null;
      api.setScore('');
      const unlocked = loadUnlocked();
      const best = loadBest();
      const next = Math.min(unlocked, LEVELS.length) - 1;
      menu = document.createElement('div');
      menu.className = 'g-cooking-menu';
      const cards = LEVELS.map((lv, i) => {
        const open = i < unlocked;
        const icons = Object.keys(lv.items).map((id) => svgItem(id, 26)).join('');
        return `<button class="g-cooking-lv${i === next ? ' g-cooking-next' : ''}" data-lv="${i}" ${open ? '' : 'disabled'}>
          <i>${open ? '' : LOCK_SVG}Level ${i + 1}</i><b>${lv.name}</b>
          <span class="g-cooking-icons">${icons}</span>
          <small>Goal ${lv.goal} coins${open ? (best[i] ? ` · best ${best[i]}` : '') : ` · win level ${i} to open`}</small></button>`;
      }).join('');
      const keys = api.isTouch ? '' : ' Keys: <kbd>P</kbd> patty <kbd>G</kbd> plate it <kbd>C</kbd><kbd>L</kbd><kbd>T</kbd> toppings <kbd>F</kbd> fryer <kbd>D</kbd> soda <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> plates <kbd>Space</kbd> serve <kbd>X</kbd> trash.';
      menu.innerHTML = `<div class="g-cooking-card" role="group" aria-label="Pick a shift">
        <div class="g-cooking-head">${api.avatar(me, 48)}<div><b>Chef ${me.name}, the YumYum doors open soon!</b><span>Cook, plate and serve. Earn the coin goal in ${SHIFT} seconds.</span></div></div>
        <div class="g-cooking-levels">${cards}</div>
        <p class="g-cooking-hint">Tap the patties to grill one. Tap a cooked patty to put it on a bun, add toppings, then tap the food and tap a guest. Tap food twice to hand it to whoever ordered it.${keys}</p>
      </div>`;
      menu.addEventListener('click', (e) => {
        const b = e.target.closest('[data-lv]');
        if (b && !b.disabled) startLevel(Number(b.dataset.lv));
      });
      root.appendChild(menu);
      menu.querySelector('.g-cooking-next')?.focus({ preventScroll: true });
    }
    function startLevel(lv) {
      if (lv >= loadUnlocked()) return;
      menu?.remove();
      menu = null;
      fx = [];
      G = newShift(lv);
      scoreText = null;
      setScore();
      api.sfx('pop');
      canvas.focus?.();
    }
    function end() {
      const lv = G.lv;
      const goal = G.cfg.goal;
      const win = G.coins >= goal;
      const best = loadBest();
      const prev = best[lv];
      if (G.coins > prev) {
        best[lv] = G.coins;
        api.save('best', best);
      }
      let opened = false;
      if (win && lv + 1 < LEVELS.length && loadUnlocked() < lv + 2) {
        api.save('unlocked', lv + 2);
        opened = true;
      }
      const parts = [`${me.name} earned ${G.coins} of ${goal} coins and served ${G.served} guest${G.served === 1 ? '' : 's'}.`];
      parts.push(G.coins > prev && G.coins > 0 ? 'New best!' : `Best: ${Math.max(prev, G.coins)}.`);
      if (opened) parts.push(`Level ${lv + 2} is open.`);
      if (G.partnerServed) parts.push(`${partner.name} loved the food.`);
      if (!win) parts.push(`Just ${goal - G.coins} more next time.`);
      G.phase = 'done';
      api.finish({ win, title: win ? (lv === LEVELS.length - 1 ? 'Star chef!' : 'Shift complete!') : 'So close!', text: parts.join(' ') });
    }

    // ---------- drawing: dining room ----------
    const X0 = () => -ox - 2;
    const XW = () => LW + ox * 2 + 4;
    function drawRoom() {
      const t = L.topH;
      ctx.fillStyle = '#fff3e4';
      ctx.fillRect(X0(), -oy - 2, XW(), t + oy + 2);
      ctx.fillStyle = 'rgba(255,122,89,.07)';
      for (let x = Math.floor(X0() / 36) * 36; x < LW + ox; x += 36) ctx.fillRect(x, 0, 18, t);
      const sw = 40 * L.cc;
      for (let i = 0, x = Math.floor(X0() / sw) * sw; x < LW + ox + sw; i++, x += sw) {
        ctx.fillStyle = i % 2 ? '#fffaf3' : C;
        ctx.fillRect(x, -oy - 2, sw, L.awnH + oy + 2);
        ctx.beginPath();
        ctx.ellipse(x + sw / 2, L.awnH, sw / 2, L.awnH * 0.6, 0, 0, Math.PI);
        ctx.fill();
      }
      // kitchen floor
      ctx.fillStyle = '#fdeedd';
      ctx.fillRect(X0(), t, XW(), LH - t + oy + 2);
      ctx.fillStyle = '#f9e2cb';
      const ts = 30;
      for (let y = t, r = 0; y < LH + oy; y += ts, r++) for (let x = Math.floor(X0() / ts) * ts + (r % 2) * ts; x < LW + ox; x += ts * 2) ctx.fillRect(x, y, ts, ts);
    }
    function moodOf(c) {
      if (c.st === 'pay' || c.yum > 0) return 'happy';
      if (c.angry) return 'grumpy';
      const f = c.pat / c.max;
      return f > 0.6 ? 'happy' : f > 0.3 ? 'ok' : 'grumpy';
    }
    function custPos(c, i) {
      const seat = L.seats[i];
      let x = seat.cx;
      let alpha = 1;
      let bob = 0;
      const away = LW + ox + L.headR * 2.5;
      if (c.st === 'in' || c.st === 'out') {
        if (reduce) alpha = c.st === 'in' ? c.p : 1 - c.p;
        else {
          x = c.st === 'in' ? lerp(away, seat.cx, easeOut(c.p)) : lerp(seat.cx, away, easeIn(c.p));
          bob = Math.abs(Math.sin(c.p * 14)) * L.headR * 0.2;
        }
      } else if (c.st === 'pay' && !reduce) bob = Math.abs(Math.sin(c.t * 10)) * L.headR * 0.15;
      return { x: x + shakeX('seat' + i), y: L.hy - bob, alpha };
    }
    function drawCustomers() {
      if (!G) return;
      G.seats.forEach((c, i) => {
        if (!c) return;
        const p = custPos(c, i);
        const r = L.headR;
        const mood = moodOf(c);
        ctx.save();
        ctx.globalAlpha = p.alpha;
        if (c.who === 'partner') {
          if (partnerImg.complete && partnerImg.naturalWidth) {
            const size = r / 0.3;
            ctx.drawImage(partnerImg, p.x - size * 0.5, p.y - size * 0.55, size, size);
          } else {
            ctx.fillStyle = partner.skin || '#f8dccb';
            circle(ctx, p.x, p.y, r);
            ctx.fill();
          }
        } else drawAnimal(ctx, c, p.x, p.y, r, mood);
        if (mood === 'grumpy') drawSteam(ctx, p.x, p.y, r, T);
        ctx.restore();
      });
    }
    function drawCounter() {
      const top = L.counterTop;
      const h = L.counterH;
      ctx.fillStyle = 'rgba(120,60,30,.12)';
      ctx.fillRect(X0(), top + h, XW(), 6);
      ctx.fillStyle = '#e99f62';
      ctx.fillRect(X0(), top, XW(), h);
      ctx.fillStyle = 'rgba(160,80,30,.13)';
      for (let x = Math.floor(X0() / 54) * 54; x < LW + ox; x += 54) ctx.fillRect(x, top + h * 0.3, 2, h * 0.7);
      ctx.fillStyle = '#f8c891';
      ctx.fillRect(X0(), top, XW(), h * 0.3);
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      ctx.fillRect(X0(), top, XW(), 2);
      if (!G) return;
      G.seats.forEach((c, i) => {
        if (!c || c.st === 'in' || c.st === 'out') return;
        const seat = L.seats[i];
        const hs = 15 * L.cc;
        const frac = c.pat / c.max;
        const low = frac < 0.3 && c.st === 'wait';
        const bw = hs * 4 + 18 * L.cc + (c.who === 'partner' ? 0 : 0);
        const by = top + h * 0.62;
        ctx.fillStyle = 'rgba(255,250,243,.92)';
        rr(ctx, seat.cx - bw / 2, by - hs * 0.62, bw, hs * 1.24, hs * 0.62);
        ctx.fill();
        for (let k = 0; k < 4; k++) {
          const pulse = low && !reduce ? 1 + Math.sin(T * 10) * 0.08 : 1;
          drawHeart(ctx, seat.cx - hs * 1.5 - 3 * L.cc + k * (hs + 2 * L.cc), by, hs * pulse, frac * 4 - k);
        }
        if (c.who === 'partner') {
          ctx.fillStyle = '#ffffff';
          const nw = Math.max(52, partner.name.length * 9) * L.cc;
          rr(ctx, seat.cx + bw / 2 + 4, by - 9 * L.cc, nw, 18 * L.cc, 9 * L.cc);
          ctx.fill();
          text(ctx, partner.name, seat.cx + bw / 2 + 4 + nw / 2, by + 0.5, 12 * L.cc, partner.top || INK, 'center', 700);
        }
      });
    }
    function drawItemIcon(id, x, y, size, alpha = 1) {
      const it = ITEMS[id];
      ctx.save();
      ctx.globalAlpha *= alpha;
      if (it.kind === 'burger') drawBurger(ctx, x, y + size * 0.36, size * 0.84, it.tops);
      else if (it.kind === 'fries') drawFries(ctx, x, y, size * 0.9);
      else drawCup(ctx, x, y + size * 0.04, size * 0.9);
      ctx.restore();
    }
    function drawBubbles() {
      if (!G) return;
      const selId = G.sel ? selItem(G.sel) : null;
      G.seats.forEach((c, i) => {
        if (!c || (c.st !== 'wait' && c.st !== 'pay')) return;
        const b0 = bubblePoint(i, 0);
        const sx = shakeX('seat' + i);
        const bx = b0.bx + sx;
        const by = L.bubbleY;
        const bh = L.bubbleH;
        const cx = L.seats[i].cx + sx;
        const pop = reduce ? 1 : easeOut(Math.min(1, c.t * 4 - (c.st === 'wait' ? 0 : 0)));
        ctx.save();
        ctx.translate(cx, by + bh);
        ctx.scale(pop, pop);
        ctx.translate(-cx, -(by + bh));
        const wants = selId && c.st === 'wait' && c.order.some((o) => !o.done && o.id === selId);
        ctx.fillStyle = 'rgba(150,90,50,.16)';
        rr(ctx, bx, by + 3, b0.bw, bh, 14 * L.bs);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        rr(ctx, bx, by, b0.bw, bh, 14 * L.bs);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx - 8 * L.bs, by + bh - 1);
        ctx.lineTo(cx + 8 * L.bs, by + bh - 1);
        ctx.lineTo(cx, by + bh + 9 * L.bs);
        ctx.closePath();
        ctx.fill();
        if (wants) {
          ctx.strokeStyle = C;
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.55 + Math.sin(T * 8) * 0.35;
          rr(ctx, bx - 2, by - 2, b0.bw + 4, bh + 4, 15 * L.bs);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        c.order.forEach((o, k) => {
          const p = bubblePoint(i, k);
          drawItemIcon(o.id, p.x + sx, p.y, L.iconS, o.done ? 0.35 : 1);
          if (o.done) drawCheck(ctx, p.x + sx + L.iconS * 0.3, p.y - L.iconS * 0.3, 8 * L.bs);
          else if (selId === o.id && c.st === 'wait') {
            ctx.strokeStyle = C;
            ctx.lineWidth = 2.5;
            circle(ctx, p.x + sx, p.y, L.iconS * 0.56);
            ctx.stroke();
          }
        });
        ctx.restore();
      });
    }

    // ---------- drawing: kitchen ----------
    function label(r, str, locked) {
      text(ctx, str, r.x + r.w / 2, r.y + r.h - L.labH * 0.55, 12 * L.ks, locked ? '#b3a6b5' : SOFT, 'center', 600);
    }
    function lockOver(r, lvText) {
      ctx.fillStyle = 'rgba(253,238,221,.72)';
      rr(ctx, r.x, r.y, r.w, r.h, 14);
      ctx.fill();
      icon(ctx, 'lock', r.x + r.w / 2, r.y + r.h / 2 - 7 * L.ks, 24 * L.ks, null, '#9c8ca0', 2.2);
      text(ctx, lvText, r.x + r.w / 2, r.y + r.h / 2 + 14 * L.ks, 11 * L.ks, '#9c8ca0', 'center', 600);
    }
    function glow(r, strong) {
      ctx.save();
      ctx.strokeStyle = C;
      ctx.lineWidth = strong ? 3.5 : 2.5;
      ctx.globalAlpha = strong ? 0.95 : 0.45 + Math.sin(T * 6) * 0.3;
      rr(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, 13);
      ctx.stroke();
      ctx.restore();
    }
    function sizzle(x, y, rx, burnt, warn) {
      if (reduce) return;
      if (!burnt) {
        ctx.strokeStyle = 'rgba(255,255,255,.55)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        for (const k of [-0.35, 0.3]) {
          const ph = (T * 1.3 + (k > 0 ? 0.5 : 0)) % 1;
          ctx.globalAlpha = 1 - ph;
          ctx.beginPath();
          const sx = x + k * rx;
          const sy = y - rx * 0.6 - ph * rx * 0.9;
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(sx + rx * 0.15, sy - rx * 0.2, sx, sy - rx * 0.4);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(255,240,200,.9)';
        for (let k = 0; k < 4; k++) {
          if (Math.sin(T * 17 + k * 2.3) > 0.4) {
            const a = k * 1.7 + Math.floor(T * 3);
            circle(ctx, x + Math.cos(a) * rx * 1.05, y + Math.sin(a) * rx * 0.8, 1.6);
            ctx.fill();
          }
        }
      }
      if (burnt || warn) {
        for (let k = 0; k < 3; k++) {
          const ph = (T * 0.8 + k / 3) % 1;
          ctx.fillStyle = burnt ? `rgba(95,85,95,${0.55 * (1 - ph)})` : `rgba(190,182,196,${0.45 * (1 - ph)})`;
          circle(ctx, x + Math.sin(ph * 6 + k) * rx * 0.3, y - rx * 0.4 - ph * rx * 1.4, rx * (0.22 + ph * 0.3));
          ctx.fill();
        }
      }
    }
    function ring(x, y, r, frac, color, lw = 4) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,.25)';
      ctx.lineWidth = lw;
      circle(ctx, x, y, r);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.01, r), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(frac, 0, 1));
      ctx.stroke();
    }
    function drawBox() {
      const r = L.box;
      const sx = shakeX('box');
      ctx.save();
      ctx.translate(sx, 0);
      panel(ctx, r);
      const ch = r.h - L.labH;
      const cx = r.x + r.w / 2;
      const rx = Math.min(r.w * 0.2, ch * 0.2);
      const py = r.y + ch * 0.52;
      ctx.fillStyle = '#f3d2a2';
      rr(ctx, cx - rx * 2.2, py - rx * 0.5, rx * 4.4, ch * 0.42, 8);
      ctx.fill();
      for (const [dx, dy] of [[-0.95, 0.15], [0.95, 0.15], [0, -0.45]]) {
        drawRawPatty(ctx, cx + dx * rx, py + dy * rx, rx);
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ellipse(ctx, cx + dx * rx - rx * 0.3, py + dy * rx - rx * 0.25, rx * 0.25, rx * 0.12, -0.3);
        ctx.fill();
      }
      ctx.fillStyle = '#e8b97f';
      rr(ctx, cx - rx * 2.2, py + rx * 0.45, rx * 4.4, r.y + ch - (py + rx * 0.45) - 2, 8);
      ctx.fill();
      label(r, 'Patties');
      ctx.restore();
    }
    function drawGrill() {
      const r = L.grill;
      const sx = shakeX('grill');
      ctx.save();
      ctx.translate(sx, 0);
      panel(ctx, r);
      const inner = { x: r.x + 6, y: r.y + 6, w: r.w - 12, h: r.h - 12 - L.labH + 4 };
      ctx.fillStyle = '#4d4250';
      rr(ctx, inner.x, inner.y, inner.w, inner.h, 10);
      ctx.fill();
      ctx.strokeStyle = '#62566a';
      ctx.lineWidth = 2;
      for (let y = inner.y + 8; y < inner.y + inner.h - 4; y += 9) {
        ctx.beginPath();
        ctx.moveTo(inner.x + 6, y);
        ctx.lineTo(inner.x + inner.w - 6, y);
        ctx.stroke();
      }
      label(r, 'Grill');
      L.gslots.forEach((slot, i) => {
        const x = slot.x + slot.w / 2 + shakeX('g' + i);
        const y = inner.y + inner.h / 2;
        const rx = Math.min(slot.w * 0.3, inner.h * 0.36);
        ctx.fillStyle = 'rgba(255,120,60,.12)';
        circle(ctx, x, y, rx * 1.25);
        ctx.fill();
        const p = G?.grill[i];
        if (!p) {
          ctx.strokeStyle = 'rgba(255,255,255,.18)';
          ctx.setLineDash([5, 5]);
          ctx.lineWidth = 2;
          ellipse(ctx, x, y, rx, rx * 0.74);
          ctx.stroke();
          ctx.setLineDash([]);
          return;
        }
        const st = pattyState(p);
        const cfg = G.cfg;
        let col;
        if (st === 'raw') col = mix('#f08f98', '#8b4a2b', p.t / cfg.cook);
        else if (st === 'done') col = mix('#8b4a2b', '#5a3020', (p.t - cfg.cook) / cfg.burn);
        else col = '#2f2422';
        const warn = st === 'done' && (p.t - cfg.cook) / cfg.burn > 0.6;
        drawRawPatty(ctx, x, y, rx, col);
        ctx.fillStyle = 'rgba(0,0,0,.2)';
        for (const [a, d] of [[0.5, 0.4], [2.2, 0.5], [4, 0.35], [5.4, 0.55]]) {
          circle(ctx, x + Math.cos(a) * rx * d, y + Math.sin(a) * rx * d * 0.7, rx * 0.07);
          ctx.fill();
        }
        if (st === 'done') {
          ctx.strokeStyle = 'rgba(40,20,10,.35)';
          ctx.lineWidth = 2.5;
          for (const k of [-0.3, 0, 0.3]) {
            ctx.beginPath();
            ctx.moveTo(x + k * rx - rx * 0.2, y - rx * 0.35);
            ctx.lineTo(x + k * rx + rx * 0.2, y + rx * 0.35);
            ctx.stroke();
          }
        }
        sizzle(x, y, rx, st === 'burnt', warn);
        const rr2 = rx + 7;
        if (st === 'raw') ring(x, y, rr2, p.t / cfg.cook, '#7fd3a7');
        else if (st === 'done') {
          ring(x, y, rr2, 1 - (p.t - cfg.cook) / cfg.burn, warn && Math.sin(T * 14) > 0 ? '#ff5a3c' : '#ffd166');
          drawCheck(ctx, x + rx * 0.85, y - rx * 0.7, 9 * L.ks);
        }
      });
      ctx.restore();
    }
    function drawPlates() {
      const sx = shakeX('plates');
      const need = G ? needs() : {};
      L.plates.forEach((r, i) => {
        const pl = G ? G.plates[i] : { patty: false, tops: [] };
        const x0 = sx + shakeX('plate' + i);
        ctx.save();
        ctx.translate(x0, 0);
        panel(ctx, r, '#fffaf3', 12);
        const cx = r.x + r.w / 2;
        const pw = Math.min(r.w * 0.86, r.h * 1.2);
        const py = r.y + r.h * 0.8;
        ctx.fillStyle = '#efe3d6';
        ellipse(ctx, cx, py + 3, pw / 2, pw * 0.16);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ellipse(ctx, cx, py, pw / 2, pw * 0.15);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,122,89,.35)';
        ctx.lineWidth = 1.5;
        ellipse(ctx, cx, py, pw * 0.38, pw * 0.1);
        ctx.stroke();
        const bw = Math.min(r.w * 0.62, r.h * 0.72);
        drawBurger(ctx, cx, py + bw * 0.05, bw, pl.tops, pl.patty);
        const id = G ? plateId(pl) : null;
        if (id && id !== 'odd' && need[id]) drawCheck(ctx, r.x + r.w - 13 * L.ks, r.y + 13 * L.ks, 9 * L.ks);
        ctx.restore();
        const sel = G?.sel;
        if (sel && sel.kind === 'plate' && sel.i === i) glow({ ...r, x: r.x + x0 }, true);
      });
    }
    function drawToppings() {
      for (const t of TOPS) {
        const r = L.tops[t];
        const sx = shakeX('top' + t);
        const locked = G ? !G.cfg.tops.includes(t) : false;
        ctx.save();
        ctx.translate(sx, 0);
        panel(ctx, r, '#fffaf3', 12);
        const showLabel = r.h > 70;
        const ch = r.h - (showLabel ? L.labH : 0);
        ctx.fillStyle = '#e6e0ea';
        rr(ctx, r.x + 7, r.y + 6, r.w - 14, ch - 12, 9);
        ctx.fill();
        drawTopping(ctx, t, r.x + r.w / 2, r.y + ch / 2, Math.min(r.w * 0.62, ch * 0.9));
        if (showLabel && !locked) label(r, t[0].toUpperCase() + t.slice(1));
        if (locked) lockOver(r, 'Level 2');
        ctx.restore();
      }
    }
    function drawFryer() {
      const r = L.fryer;
      const locked = G ? !G.cfg.fryer : false;
      const sx = shakeX('fryer');
      ctx.save();
      ctx.translate(sx, 0);
      panel(ctx, r);
      const ch = r.h - L.labH;
      const fw = Math.min(r.w * 0.6, ch * 1.6);
      const fh = ch * 0.78;
      const fx0 = r.x + r.w * 0.42 - fw / 2;
      const fy0 = r.y + ch * 0.14;
      ctx.fillStyle = '#cfc8d4';
      rr(ctx, fx0, fy0, fw, fh, 10);
      ctx.fill();
      ctx.fillStyle = '#b5adbb';
      rr(ctx, fx0, fy0 + fh * 0.72, fw, fh * 0.28, 8);
      ctx.fill();
      ctx.fillStyle = '#e3a33c';
      rr(ctx, fx0 + 7, fy0 + 7, fw - 14, fh * 0.55, 7);
      ctx.fill();
      const st = G && G.cfg.fryer ? fryState() : 'empty';
      const bx = fx0 + fw * 0.2;
      const bwid = fw * 0.6;
      const by = st === 'empty' ? fy0 - fh * 0.12 : fy0 + 9;
      const bh = fh * 0.46;
      if (st === 'cooking' && !reduce) {
        ctx.fillStyle = 'rgba(255,240,190,.8)';
        for (let k = 0; k < 6; k++) {
          const ph = (T * 1.7 + k * 0.37) % 1;
          circle(ctx, fx0 + 12 + ((k * 53) % (fw - 24)), fy0 + 7 + fh * 0.5 - ph * fh * 0.4, 2 + ph * 2);
          ctx.fill();
        }
      }
      if (st !== 'empty') {
        ctx.save();
        rr(ctx, bx, by, bwid, bh, 5);
        ctx.clip();
        const tone = st === 'cooking' ? (G.fryer.t / G.cfg.fry < 0.5 ? -1 : 0) : st === 'done' ? 0 : 1;
        drawFries(ctx, bx + bwid / 2, by + bh * 0.95, bh * 1.2, tone, false);
        ctx.restore();
      }
      ctx.strokeStyle = '#8f8797';
      ctx.lineWidth = 2;
      rr(ctx, bx, by, bwid, bh, 5);
      ctx.stroke();
      for (let k = 1; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(bx + (bwid * k) / 4, by);
        ctx.lineTo(bx + (bwid * k) / 4, by + bh);
        ctx.stroke();
      }
      ctx.strokeStyle = '#6f6777';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(bx + bwid, by + 4);
      ctx.lineTo(bx + bwid + fw * 0.22, by - 4);
      ctx.stroke();
      ctx.fillStyle = '#e5484d';
      rr(ctx, bx + bwid + fw * 0.18, by - 10, fw * 0.16, 10, 5);
      ctx.fill();
      const dx = fx0 + fw + (r.x + r.w - fx0 - fw) / 2;
      const dy = r.y + ch * 0.5;
      const dr = Math.min((r.x + r.w - fx0 - fw) * 0.32, ch * 0.24);
      ctx.fillStyle = '#4d4250';
      circle(ctx, dx, dy, dr + 4);
      ctx.fill();
      if (st === 'cooking') ring(dx, dy, dr, G.fryer.t / G.cfg.fry, '#7fd3a7', 4);
      else if (st === 'done') {
        const left = 1 - (G.fryer.t - G.cfg.fry) / G.cfg.fryBurn;
        ring(dx, dy, dr, left, left < 0.4 && Math.sin(T * 14) > 0 ? '#ff5a3c' : '#ffd166', 4);
        drawCheck(ctx, dx, dy, dr * 0.6);
      } else if (st === 'burnt') {
        sizzle(bx + bwid / 2, by + bh * 0.4, bwid * 0.3, true, false);
        ring(dx, dy, dr, 1, '#5f555f', 4);
      } else ring(dx, dy, dr, 0, '#7fd3a7', 4);
      label(r, 'Fryer', locked);
      if (locked) lockOver(r, 'Level 2');
      ctx.restore();
    }
    function drawTray(r, slots, has, kind, key) {
      const sx = shakeX(key);
      const locked = G ? kind === 'fries' && !G.cfg.fryer : false;
      ctx.save();
      ctx.translate(sx, 0);
      panel(ctx, r, '#f6ece2', 12);
      slots.forEach((sl, i) => {
        const x = sl.x + sl.w / 2;
        const y = sl.y + sl.h / 2;
        const size = Math.min(sl.w * 0.78, sl.h * 0.78);
        if (G && has[i]) {
          if (kind === 'fries') drawFries(ctx, x, y, size);
          else drawCup(ctx, x, y + size * 0.05, size);
          const sel = G.sel;
          if (sel && sel.kind === kind && sel.i === i) glow({ x: sl.x + 3, y: sl.y + 3, w: sl.w - 6, h: sl.h - 6 }, true);
        } else {
          ctx.strokeStyle = 'rgba(111,95,115,.18)';
          ctx.setLineDash([4, 5]);
          ctx.lineWidth = 2;
          ellipse(ctx, x, y + size * 0.36, size * 0.3, size * 0.1);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
      if (locked) lockOver(r, 'Level 2');
      ctx.restore();
    }
    function drawSoda() {
      const r = L.soda;
      const sx = shakeX('soda');
      ctx.save();
      ctx.translate(sx, 0);
      panel(ctx, r);
      const ch = r.h - L.labH;
      const mw = Math.min(r.w * 0.56, ch * 1.3);
      const mx = r.x + r.w * 0.4 - mw / 2;
      const my = r.y + 6;
      const mh = ch - 6;
      ctx.fillStyle = C;
      rr(ctx, mx, my, mw, mh, 12);
      ctx.fill();
      ctx.fillStyle = '#fff3e4';
      rr(ctx, mx + mw * 0.12, my + mh * 0.08, mw * 0.76, mh * 0.24, 8);
      ctx.fill();
      text(ctx, 'YumYum', mx + mw / 2, my + mh * 0.2, Math.min(14 * L.ks, mh * 0.15, mw * 0.17), C, 'center', 700);
      const rx = mx + mw * 0.18;
      const ry = my + mh * 0.38;
      const rw = mw * 0.64;
      const rh = mh * 0.56;
      ctx.fillStyle = '#d9583a';
      rr(ctx, rx, ry, rw, rh, 8);
      ctx.fill();
      ctx.fillStyle = '#8f8797';
      ctx.fillRect(mx + mw / 2 - 5, ry, 10, rh * 0.14);
      ctx.fillStyle = '#b5adbb';
      ctx.fillRect(rx + 4, ry + rh - 6, rw - 8, 4);
      const cupS = Math.min(rh * 0.72, rw * 1.2);
      const ccx = mx + mw / 2;
      const ccy = ry + rh - 6 - cupS * 0.46;
      if (G && G.soda.filling) {
        const f = G.soda.t / G.cfg.fill;
        ctx.fillStyle = '#ff9f43';
        ctx.fillRect(ccx - 2, ry + rh * 0.14, 4, ccy - (ry + rh * 0.14) + cupS * 0.3 * (1 - f));
        drawCup(ctx, ccx, ccy, cupS, f, false);
      }
      const bx = mx + mw + (r.x + r.w - mx - mw) / 2;
      const brd = Math.min((r.x + r.w - mx - mw) * 0.3, ch * 0.2);
      ctx.fillStyle = '#4d4250';
      circle(ctx, bx, r.y + ch * 0.5, brd + 4);
      ctx.fill();
      if (G && G.soda.filling) ring(bx, r.y + ch * 0.5, brd, G.soda.t / G.cfg.fill, '#ff9f43', 4);
      else {
        ctx.fillStyle = '#ffd9cc';
        circle(ctx, bx, r.y + ch * 0.5, brd * 0.7);
        ctx.fill();
      }
      label(r, 'Soda');
      ctx.restore();
    }
    function drawTrash() {
      const r = L.trash;
      const sx = shakeX('trash');
      const open = G && G.sel && selItem(G.sel);
      ctx.save();
      ctx.translate(sx, 0);
      panel(ctx, r, '#f6ece2', 12);
      const ch = r.h - L.labH;
      const w = Math.min(r.w * 0.5, ch * 0.62);
      const h = ch * 0.62;
      const cx = r.x + r.w / 2;
      const top = r.y + ch * 0.3;
      ctx.fillStyle = '#a9b4c2';
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, top);
      ctx.lineTo(cx + w / 2, top);
      ctx.lineTo(cx + w * 0.4, top + h);
      ctx.lineTo(cx - w * 0.4, top + h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.45)';
      ctx.lineWidth = 2;
      for (const k of [-0.2, 0, 0.2]) {
        ctx.beginPath();
        ctx.moveTo(cx + k * w, top + h * 0.18);
        ctx.lineTo(cx + k * w * 0.9, top + h * 0.85);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(cx - w * 0.55, top);
      ctx.rotate(open && !reduce ? -0.35 - Math.sin(T * 6) * 0.06 : 0);
      ctx.fillStyle = '#8e9aab';
      rr(ctx, 0, -h * 0.16, w * 1.1, h * 0.16, 4);
      ctx.fill();
      rr(ctx, w * 0.4, -h * 0.26, w * 0.3, h * 0.12, 3);
      ctx.fill();
      ctx.restore();
      label(r, 'Trash');
      ctx.restore();
      if (open) glow(r, false);
    }

    // ---------- drawing: chef panel, effects, banner ----------
    function drawChef() {
      const r = L.chef;
      const k = L.cc;
      panel(ctx, r, '#ffffff', 18);
      const as = Math.min(r.h * 0.36, 62 * k);
      const ax = r.x + 8;
      const ay = r.y + as * 0.3 + 4;
      if (chefImg.complete && chefImg.naturalWidth) ctx.drawImage(chefImg, ax, ay, as, as);
      // chef hat over the hair
      const hx = ax + as * 0.5;
      const hy = ay + as * 0.27;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(59,43,63,.15)';
      ctx.lineWidth = 1.5;
      for (const [dx, dy, rad] of [[-0.17, -0.12, 0.15], [0.17, -0.12, 0.15], [0, -0.2, 0.18]]) {
        circle(ctx, hx + dx * as, hy + dy * as, rad * as);
        ctx.fill();
        ctx.stroke();
      }
      rr(ctx, hx - as * 0.26, hy - as * 0.1, as * 0.52, as * 0.16, as * 0.05);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = C;
      ctx.fillRect(hx - as * 0.24, hy + as * 0.0, as * 0.48, as * 0.03);
      const tx = ax + as + 8;
      text(ctx, `Chef ${me.name}`, tx, r.y + 16 * k, 13 * k, SOFT, 'left', 600);
      const sec = G ? Math.ceil(G.time) : SHIFT;
      const low = G && G.phase === 'play' && sec <= 10;
      const tstr = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
      const tr = 11 * k;
      const tcy = r.y + 16 * k + 26 * k;
      ctx.fillStyle = low ? '#ffe1dc' : '#fff3e4';
      circle(ctx, tx + tr, tcy, tr + 2);
      ctx.fill();
      ring(tx + tr, tcy, tr - 2, G ? G.time / SHIFT : 1, low ? '#e5484d' : C, 3.5);
      text(ctx, tstr, tx + tr * 2 + 6, tcy + 1, 21 * k * (low && !reduce ? 1 + Math.max(0, Math.sin(T * 8)) * 0.06 : 1), low ? '#e5484d' : INK, 'left', 700);
      // coins and goal
      const goal = G ? G.cfg.goal : LEVELS[0].goal;
      const shown = G ? Math.round(G.shown) : 0;
      const cy = L.coinPt.y;
      const bump = fx.some((f) => f.kind === 'coin' && f.t > f.dur - 0.08) && !reduce ? 1.18 : 1;
      drawCoin(ctx, L.coinPt.x, cy, 10 * k * bump);
      text(ctx, `${shown}`, L.coinPt.x + 16 * k, cy + 1, 19 * k, INK, 'left', 700);
      ctx.font = `700 ${19 * k}px ${FONT}`;
      const w1 = ctx.measureText(`${shown}`).width;
      text(ctx, ` / ${goal}`, L.coinPt.x + 16 * k + w1, cy + 2, 13 * k, SOFT, 'left', 600);
      const bx = r.x + 10;
      const bw = r.w - 20;
      const by = cy + 15 * k;
      ctx.fillStyle = '#f3e6da';
      rr(ctx, bx, by, bw, 9 * k, 5 * k);
      ctx.fill();
      const frac = clamp(shown / goal, 0, 1);
      if (frac > 0) {
        ctx.fillStyle = shown >= goal ? '#3fbf7f' : C;
        rr(ctx, bx, by, Math.max(9 * k, bw * frac), 9 * k, 5 * k);
        ctx.fill();
      }
      const hint = G && G.phase === 'play' && G.hint ? G.hint.text : G ? '' : 'Pick a shift to start';
      const lines = wrap(ctx, hint, r.w - 18, 12 * k, 500).slice(0, 2);
      const hy0 = by + 9 * k + 14 * k;
      lines.forEach((ln, i) => text(ctx, ln, r.x + 10, hy0 + i * 14 * k, 12 * k, SOFT, 'left', 500));
    }
    function drawFlyItem(it, x, y, size) {
      if (it.type === 'burger') drawBurger(ctx, x, y + size * 0.36, size * 0.84, it.tops);
      else if (it.type === 'fries') drawFries(ctx, x, y, size * 0.9, it.tone || 0);
      else if (it.type === 'soda') drawCup(ctx, x, y, size * 0.9);
      else if (it.type === 'raw') drawRawPatty(ctx, x, y, size);
      else if (it.type === 'patty') drawRawPatty(ctx, x, y, size, '#8b4a2b');
      else if (it.type === 'burnt') drawRawPatty(ctx, x, y, size * 0.8, '#2f2422');
      else if (it.type === 'top') drawTopping(ctx, it.name, x, y, size * 0.8, 1);
    }
    function drawFx() {
      for (const f of fx) {
        if (f.t < 0) continue;
        const p = clamp(f.t / f.dur, 0, 1);
        if (f.kind === 'fly' || f.kind === 'coin') {
          const e = easeOut(p);
          const lift = f.kind === 'coin' ? 70 : 40;
          const cx = (f.from.x + f.to.x) / 2;
          const cy = Math.min(f.from.y, f.to.y) - lift;
          const x = (1 - e) * (1 - e) * f.from.x + 2 * (1 - e) * e * cx + e * e * f.to.x;
          const y = (1 - e) * (1 - e) * f.from.y + 2 * (1 - e) * e * cy + e * e * f.to.y;
          if (f.kind === 'coin') drawCoin(ctx, x, y, 9 * L.cc);
          else drawFlyItem(f.item, x, y, f.size);
        } else if (f.kind === 'text') {
          ctx.save();
          ctx.globalAlpha = 1 - easeIn(p);
          const y = f.y - easeOut(p) * 26;
          ctx.font = `700 ${f.px}px ${FONT}`;
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(255,255,255,.9)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.strokeText(f.str, f.x, y);
          text(ctx, f.str, f.x, y, f.px, f.color, 'center', 700);
          ctx.restore();
        } else if (f.kind === 'heart') {
          ctx.save();
          ctx.globalAlpha = 1 - p;
          icon(ctx, 'heart', f.x + Math.sin(p * 8) * 6, f.y - p * 50, 16 * L.cc, '#ef5b6f');
          ctx.restore();
        }
      }
    }
    function drawTutorRing() {
      if (!G || G.phase !== 'play' || G.lv !== 0 || !G.hint || !G.hint.target) return;
      const r = G.hint.target;
      ctx.save();
      ctx.setLineDash([7, 6]);
      ctx.lineDashOffset = reduce ? 0 : -T * 30;
      ctx.strokeStyle = C;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.8;
      rr(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, 15);
      ctx.stroke();
      ctx.restore();
    }
    function drawBanner() {
      if (!G || (G.phase !== 'ready' && G.phase !== 'over' && G.phase !== 'done')) return;
      if (G.phase === 'done') return;
      const p = G.phaseT;
      const sc = reduce ? 1 : easeOut(Math.min(1, p * 4)) * (G.phase === 'ready' && p > 1.4 ? 1 - (p - 1.4) * 3 : 1);
      const cx = LW / 2;
      const cy = L.topH + (LH - L.topH) / 2;
      const w = 420;
      const h = 104;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(Math.max(0.01, sc), Math.max(0.01, sc));
      ctx.fillStyle = 'rgba(150,90,50,.2)';
      rr(ctx, -w / 2, -h / 2 + 5, w, h, 26);
      ctx.fill();
      ctx.fillStyle = '#fffaf3';
      rr(ctx, -w / 2, -h / 2, w, h, 26);
      ctx.fill();
      ctx.strokeStyle = C;
      ctx.lineWidth = 3;
      ctx.stroke();
      if (G.phase === 'ready') {
        text(ctx, `Level ${G.lv + 1}: ${G.cfg.name}`, 0, -18, 26, INK, 'center', 700);
        text(ctx, `Earn ${G.cfg.goal} coins in ${SHIFT} seconds`, 0, 20, 17, SOFT, 'center', 600);
      } else {
        text(ctx, "Time's up!", 0, -16, 30, C, 'center', 700);
        text(ctx, `${G.coins} coins today`, 0, 22, 17, SOFT, 'center', 600);
      }
      ctx.restore();
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#fdeedd';
      ctx.fillRect(0, 0, W, H);
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * s * ox, dpr * s * oy);
      drawRoom();
      drawCustomers();
      drawCounter();
      drawBubbles();
      drawBox();
      drawGrill();
      drawPlates();
      drawToppings();
      drawFryer();
      drawTray(L.friesTray, L.fslots, G ? G.fries : [], 'fries', 'friesTray');
      drawSoda();
      drawTray(L.cupTray, L.cslots, G ? G.cups : [], 'cup', 'cupTray');
      drawTrash();
      drawChef();
      drawTutorRing();
      drawFx();
      drawBanner();
    }

    // ---------- loop and input ----------
    function frame(now) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      T += dt;
      update(dt);
      draw();
    }
    function onDown(e) {
      if (!alive || !L) return;
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      tap((e.clientX - r.left) / s - ox, (e.clientY - r.top) / s - oy);
    }
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const k = e.key.toLowerCase();
      if (!G && menu && ['1', '2', '3'].includes(k)) {
        e.preventDefault();
        startLevel(Number(k) - 1);
        return;
      }
      if (!G || G.phase !== 'play') return;
      const act = {
        p: tapBox,
        c: () => tapTop('cheese'),
        l: () => tapTop('lettuce'),
        t: () => tapTop('tomato'),
        f: tapFryer,
        d: tapSoda,
        x: tapTrash,
        1: () => tapPlate(0),
        2: () => tapPlate(1),
        3: () => tapPlate(2),
        g: () => {
          const i = G.grill.findIndex((p) => p && pattyState(p) !== 'raw');
          if (i >= 0) tapGrill(i);
          else api.sfx('tick');
        },
        ' ': () => {
          if (G.sel && selItem(G.sel)) autoServe(G.sel);
          else {
            const j = G.fries.findIndex(Boolean);
            const q = G.cups.findIndex(Boolean);
            const pl = G.plates.findIndex((x) => x.patty);
            const sel = pl >= 0 ? { kind: 'plate', i: pl } : j >= 0 ? { kind: 'fries', i: j } : q >= 0 ? { kind: 'cup', i: q } : null;
            if (sel) autoServe(sel);
            else api.sfx('tick');
          }
        },
      }[k];
      if (!act) return;
      e.preventDefault();
      act();
    }
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    const ro = new ResizeObserver(() => resize());
    ro.observe(stage);
    resize();
    showMenu();
    raf = requestAnimationFrame(frame);

    // Read-only hook for headless tests: state summary and tap points in client pixels.
    root.__cooking = {
      peek: () =>
        G && {
          phase: G.phase, lv: G.lv, time: G.time, coins: G.coins, goal: G.cfg.goal, sel: G.sel && { ...G.sel },
          grill: G.grill.map((p) => p && pattyState(p)),
          plates: G.plates.map((p) => ({ patty: p.patty, tops: [...p.tops], id: plateId(p) })),
          fryer: G.cfg.fryer ? fryState() : 'locked', fries: [...G.fries], filling: G.soda.filling, cups: [...G.cups],
          seats: G.seats.map((c) => c && { st: c.st, who: c.who, pat: c.pat / c.max, order: c.order.map((o) => ({ ...o })) }),
          tops: [...G.cfg.tops], served: G.served, lost: G.lost,
        },
      points: () => {
        const b = canvas.getBoundingClientRect();
        const pt = (r) => ({ x: b.left + (r.x + r.w / 2 + ox) * s, y: b.top + (r.y + r.h / 2 + oy) * s });
        return {
          seat: L.seats.map((r) => pt({ ...r, y: L.hy - L.headR, h: L.headR * 2 })), grill: L.gslots.map(pt), box: pt(L.box), trash: pt(L.trash),
          plate: L.plates.map(pt), top: Object.fromEntries(TOPS.map((t) => [t, pt(L.tops[t])])), fryer: pt(L.fryer),
          fries: L.fslots.map(pt), soda: pt(L.soda), cup: L.cslots.map(pt), scale: s,
        };
      },
    };

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
      delete root.__cooking;
      root.remove();
    };
  },
};
