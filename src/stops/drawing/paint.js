import * as THREE from 'three';
import { FONT, roundRect } from '../../util.js';

// Pictures painted on canvases for The Little Art Studio: little chibi people, funny portraits, still lifes,
// murals, the easter-egg paintings, and a Reveal that paints a picture onto a canvas texture dab by dab.

const P = Math.PI;
export const INK = '#4a3423';

export function heart(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y + s * 0.45);
  c.bezierCurveTo(x - s * 0.75, y - s * 0.05, x - s * 0.45, y - s * 0.62, x, y - s * 0.28);
  c.bezierCurveTo(x + s * 0.45, y - s * 0.62, x + s * 0.75, y - s * 0.05, x, y + s * 0.45);
  c.closePath();
}

export function star(c, x, y, R, r = R * 0.45, n = 5) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 ? r : R;
    const a = (i / (n * 2)) * P * 2 - P / 2;
    if (i === 0) c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
}

const circle = (c, x, y, r) => {
  c.beginPath();
  c.arc(x, y, r, 0, P * 2);
};

// Canvas paper with a soft grain
export function paper(c, w, h, color = '#fffaf1') {
  c.fillStyle = color;
  c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(160,120,90,0.05)';
  for (let i = 0; i < 90; i++) c.fillRect((i * 97) % w, (i * 53) % h, 2, 2);
}

// The two main looks, read from the game (falls back to the defaults)
export function lookOf(looks, id) {
  const L = looks?.[id] || {};
  return id === 'roji'
    ? { girl: true, skin: L.skin || '#f8dccb', hair: L.hair || '#2a1a13', top: L.top || '#ef5b6f', bottom: L.bottom || L.top || '#ef5b6f', accent: L.accent || '#ff7fa3', style: L.hairstyle || 'pigtails' }
    : { girl: false, skin: L.skin || '#f6d8c6', hair: L.hair || '#141010', top: L.top || '#3f7bf0', bottom: L.bottom || '#2c3e66', accent: L.accent || '#ffd166', style: L.hairstyle || 'short' };
}

// Hair behind the head (pigtails, long hair)
function hairBack(c, x, y, r, L) {
  c.fillStyle = L.hair;
  if (!L.girl) return;
  if (L.style === 'long') {
    roundRect(c, x - r * 1.05, y - r * 0.2, r * 2.1, r * 1.7, r * 0.5);
    c.fill();
  } else if (L.style === 'ponytail') {
    circle(c, x + r * 0.95, y - r * 0.2, r * 0.42);
    c.fill();
  } else if (L.style === 'buns') {
    circle(c, x - r * 0.8, y - r * 0.85, r * 0.38);
    circle(c, x + r * 0.8, y - r * 0.85, r * 0.38);
    c.fill();
  } else if (L.style !== 'bob') {
    circle(c, x - r * 1.08, y + r * 0.15, r * 0.42);
    circle(c, x + r * 1.08, y + r * 0.15, r * 0.42);
    c.fill();
    c.fillStyle = L.accent;
    circle(c, x - r * 0.9, y - r * 0.12, r * 0.13);
    circle(c, x + r * 0.9, y - r * 0.12, r * 0.13);
    c.fill();
  }
}

// Hair on top of the head (fringe and cap)
function hairFront(c, x, y, r, L) {
  c.fillStyle = L.hair;
  c.beginPath();
  c.ellipse(x, y - r * 0.32, r * 1.04, r * 0.78, 0, P, 0);
  c.fill();
  if (L.girl) {
    c.beginPath();
    c.moveTo(x - r * 0.95, y - r * 0.2);
    c.quadraticCurveTo(x - r * 0.4, y - r * 0.05, x - r * 0.05, y - r * 0.5);
    c.quadraticCurveTo(x + r * 0.4, y - r * 0.02, x + r * 0.95, y - r * 0.2);
    c.lineTo(x + r, y - r * 0.5);
    c.lineTo(x - r, y - r * 0.5);
    c.fill();
    if (L.style === 'bob') {
      roundRect(c, x - r * 1.08, y - r * 0.5, r * 0.36, r * 1.1, r * 0.18);
      roundRect(c, x + r * 0.72, y - r * 0.5, r * 0.36, r * 1.1, r * 0.18);
      c.fill();
    }
  } else {
    c.beginPath();
    c.moveTo(x - r * 1.0, y - r * 0.15);
    c.quadraticCurveTo(x - r * 0.6, y - r * 0.55, x + r * 0.2, y - r * 0.45);
    c.quadraticCurveTo(x + r * 0.7, y - r * 0.5, x + r * 1.0, y - r * 0.15);
    c.lineTo(x + r, y - r * 0.6);
    c.lineTo(x - r, y - r * 0.6);
    c.fill();
    if (L.style === 'spiky' || L.style === 'curly') {
      for (let i = -2; i <= 2; i++) {
        circle(c, x + i * r * 0.38, y - r * 0.98, r * 0.24);
        c.fill();
      }
    }
  }
}

// Eyes, blush and a smile. mood: 'smile' | 'grin' | 'o' | 'wink'
function face(c, x, y, r, L, { mood = 'smile', eyeL = 1, eyeR = 1, tilt = 0 } = {}) {
  c.fillStyle = '#2b1d1a';
  const ey = y + r * 0.08;
  for (const [s, k] of [[-1, eyeL], [1, eyeR]]) {
    if (mood === 'wink' && s > 0) {
      c.strokeStyle = '#2b1d1a';
      c.lineWidth = r * 0.07;
      c.lineCap = 'round';
      c.beginPath();
      c.arc(x + s * r * 0.36, ey + tilt * s, r * 0.12, P * 1.1, P * 1.9);
      c.stroke();
      continue;
    }
    c.fillStyle = '#2b1d1a';
    c.beginPath();
    c.ellipse(x + s * r * 0.36, ey + tilt * s, r * 0.1 * k, r * 0.14 * k, 0, 0, P * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    circle(c, x + s * r * 0.36 + r * 0.035, ey + tilt * s - r * 0.05, r * 0.04 * k);
    c.fill();
  }
  c.fillStyle = 'rgba(255,128,150,0.5)';
  circle(c, x - r * 0.6, y + r * 0.38, r * 0.15);
  circle(c, x + r * 0.6, y + r * 0.38, r * 0.15);
  c.fill();
  c.strokeStyle = '#b23a48';
  c.fillStyle = '#b23a48';
  c.lineWidth = r * 0.07;
  c.lineCap = 'round';
  c.beginPath();
  if (mood === 'o') {
    c.ellipse(x, y + r * 0.5, r * 0.1, r * 0.13, 0, 0, P * 2);
    c.fill();
  } else if (mood === 'grin') {
    c.moveTo(x - r * 0.25, y + r * 0.4);
    c.quadraticCurveTo(x, y + r * 0.78, x + r * 0.25, y + r * 0.4);
    c.closePath();
    c.fill();
  } else {
    c.arc(x, y + r * 0.34, r * 0.2, P * 0.15, P * 0.85);
    c.stroke();
  }
}

// A head with hair and face, centre (x, y), radius r
export function head(c, x, y, r, L, o = {}) {
  hairBack(c, x, y, r, L);
  c.fillStyle = L.skin;
  c.beginPath();
  c.ellipse(x, y, r, r * 0.95, 0, 0, P * 2);
  c.fill();
  hairFront(c, x, y, r, L);
  face(c, x, y, r, L, o);
}

// A chibi person standing with feet at (x, footY), s pixels tall. o.arms: [leftAngle, rightAngle]
export function chibi(c, x, footY, s, L, o = {}) {
  const r = s * 0.22;
  const hy = footY - s + r * 1.02;
  const by = hy + r * 0.85;
  c.lineCap = 'round';
  // legs
  c.strokeStyle = L.skin;
  c.lineWidth = s * 0.07;
  c.beginPath();
  c.moveTo(x - s * 0.07, footY - s * 0.28);
  c.lineTo(x - s * 0.08, footY - s * 0.04);
  c.moveTo(x + s * 0.07, footY - s * 0.28);
  c.lineTo(x + s * 0.08, footY - s * 0.04);
  c.stroke();
  c.fillStyle = L.girl ? '#7a2e3a' : '#ffffff';
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.ellipse(x + sx * s * 0.09, footY - s * 0.03, s * 0.06, s * 0.035, 0, 0, P * 2);
    c.fill();
  }
  // arms
  const [aL, aR] = o.arms || [0.35, 0.35];
  c.strokeStyle = L.skin;
  c.lineWidth = s * 0.06;
  const sh = by + s * 0.06;
  const arm = (sx, a) => {
    c.beginPath();
    c.moveTo(x + sx * s * 0.12, sh);
    c.lineTo(x + sx * s * 0.12 + sx * Math.sin(a) * s * 0.22, sh + Math.cos(a) * s * 0.22);
    c.stroke();
  };
  arm(-1, aL);
  arm(1, aR);
  // body
  c.fillStyle = L.top;
  c.beginPath();
  if (L.girl) {
    c.moveTo(x - s * 0.11, by);
    c.lineTo(x + s * 0.11, by);
    c.lineTo(x + s * 0.22, footY - s * 0.24);
    c.lineTo(x - s * 0.22, footY - s * 0.24);
  } else {
    c.moveTo(x - s * 0.14, by);
    c.lineTo(x + s * 0.14, by);
    c.lineTo(x + s * 0.15, footY - s * 0.36);
    c.lineTo(x - s * 0.15, footY - s * 0.36);
  }
  c.closePath();
  c.fill();
  if (!L.girl) {
    c.fillStyle = L.bottom;
    c.fillRect(x - s * 0.15, footY - s * 0.37, s * 0.3, s * 0.1);
  } else {
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillRect(x - s * 0.22, footY - s * 0.26, s * 0.44, s * 0.025);
  }
  head(c, x, hy, r, L, o);
}

// Two chibis holding hands, centred at x
export function couple(c, x, footY, s, looks, { heartAbove = true } = {}) {
  const R = lookOf(looks, 'roji');
  const H = lookOf(looks, 'homama');
  chibi(c, x - s * 0.24, footY, s * 0.95, R, { arms: [0.35, -0.9] });
  chibi(c, x + s * 0.24, footY, s, H, { arms: [0.9, -0.35] });
  if (heartAbove) {
    c.fillStyle = '#ef5b6f';
    heart(c, x, footY - s * 1.12, s * 0.28);
    c.fill();
  }
}

// ---------------------------------------------------------------- funny portraits
// Each draws a portrait of L on a w x h canvas. The id and a short caption describe it.
export const PORTRAITS = [
  { id: 'royal', what: 'as royalty' },
  { id: 'cat', what: 'as a cat' },
  { id: 'cube', what: 'in modern art' },
  { id: 'bighead', what: 'with an enormous head' },
  { id: 'moustache', what: 'with a fancy moustache' },
  { id: 'hero', what: 'as a superhero' },
  { id: 'astro', what: 'as an astronaut' },
  { id: 'stick', what: 'as a stick figure' },
];

function shoulders(c, w, h, L, cx, top) {
  c.fillStyle = L.top;
  c.beginPath();
  c.moveTo(cx - w * 0.36, h);
  c.quadraticCurveTo(cx - w * 0.34, top, cx, top - h * 0.02);
  c.quadraticCurveTo(cx + w * 0.34, top, cx + w * 0.36, h);
  c.fill();
}

export function portrait(c, w, h, L, kind, { hearts = 0, bg = null, seed = 1 } = {}) {
  const cx = w / 2;
  const back = bg || { royal: '#f7e3b5', cat: '#d9f2e6', cube: '#ffe0cc', bighead: '#dff0ff', moustache: '#efe4ff', hero: '#ffe9a8', astro: '#2a2f62', stick: '#ffffff' }[kind] || '#fff3e4';
  c.fillStyle = back;
  c.fillRect(0, 0, w, h);
  const r = w * 0.27;
  const hy = h * 0.42;
  if (kind === 'royal') {
    c.fillStyle = '#c73b45';
    c.beginPath();
    c.moveTo(cx - w * 0.48, h);
    c.quadraticCurveTo(cx - w * 0.4, h * 0.6, cx, h * 0.62);
    c.quadraticCurveTo(cx + w * 0.4, h * 0.6, cx + w * 0.48, h);
    c.fill();
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 9; i++) {
      circle(c, cx - w * 0.4 + i * w * 0.1, h * 0.67 + Math.abs(i - 4) * 4, 6);
      c.fill();
    }
    shoulders(c, w * 0.8, h, L, cx, h * 0.68);
    head(c, cx, hy, r, L, { mood: 'smile' });
    c.fillStyle = '#f4c24f';
    c.beginPath();
    c.moveTo(cx - r * 0.8, hy - r * 0.75);
    for (let i = 0; i <= 4; i++) {
      const x = cx - r * 0.8 + (i * r * 1.6) / 4;
      c.lineTo(x, hy - r * (i % 2 ? 1.05 : 1.45));
    }
    c.lineTo(cx + r * 0.8, hy - r * 0.75);
    c.closePath();
    c.fill();
    c.fillStyle = '#ef5b6f';
    for (const i of [0, 2, 4]) {
      circle(c, cx - r * 0.8 + (i * r * 1.6) / 4, hy - r * 1.45, 6);
      c.fill();
    }
  } else if (kind === 'cat') {
    shoulders(c, w, h, L, cx, h * 0.72);
    c.fillStyle = L.hair;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(cx + s * r * 0.95, hy - r * 0.35);
      c.lineTo(cx + s * r * 0.75, hy - r * 1.45);
      c.lineTo(cx + s * r * 0.2, hy - r * 0.85);
      c.fill();
    }
    head(c, cx, hy, r, L, { mood: 'o' });
    c.fillStyle = '#ff8fb1';
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(cx + s * r * 0.75, hy - r * 0.6);
      c.lineTo(cx + s * r * 0.72, hy - r * 1.15);
      c.lineTo(cx + s * r * 0.4, hy - r * 0.8);
      c.fill();
    }
    c.fillStyle = '#ef5b6f';
    c.beginPath();
    c.moveTo(cx - 7, hy + r * 0.22);
    c.lineTo(cx + 7, hy + r * 0.22);
    c.lineTo(cx, hy + r * 0.32);
    c.fill();
    c.strokeStyle = '#3b2b3f';
    c.lineWidth = 2.5;
    for (const s of [-1, 1]) for (const k of [-1, 0, 1]) {
      c.beginPath();
      c.moveTo(cx + s * r * 0.3, hy + r * 0.32 + k * 6);
      c.lineTo(cx + s * r * 1.15, hy + r * 0.25 + k * 14);
      c.stroke();
    }
  } else if (kind === 'cube') {
    const cols = ['#ffd166', '#6fb8ff', '#ef5b6f', '#7fd8bf', '#c7a6ff'];
    for (let i = 0; i < 5; i++) {
      c.fillStyle = cols[(i + seed) % 5];
      c.fillRect((i * w) / 5, 0, w / 5 + 1, h);
    }
    c.fillStyle = L.top;
    c.fillRect(cx - w * 0.3, h * 0.72, w * 0.6, h * 0.28);
    c.fillStyle = L.hair;
    c.beginPath();
    c.moveTo(cx - r * 1.1, hy - r * 0.9);
    c.lineTo(cx + r * 0.9, hy - r * 1.2);
    c.lineTo(cx + r * 1.15, hy + r * 0.2);
    c.lineTo(cx - r * 1.2, hy + r * 0.4);
    c.fill();
    c.fillStyle = L.skin;
    c.beginPath();
    c.moveTo(cx - r * 0.9, hy - r * 0.6);
    c.lineTo(cx + r * 0.2, hy - r * 0.9);
    c.lineTo(cx + r, hy + r * 0.6);
    c.lineTo(cx - r * 0.3, hy + r * 1.05);
    c.lineTo(cx - r * 1.0, hy + r * 0.4);
    c.closePath();
    c.fill();
    c.fillStyle = '#f2b49a';
    c.beginPath();
    c.moveTo(cx + r * 0.2, hy - r * 0.9);
    c.lineTo(cx + r, hy + r * 0.6);
    c.lineTo(cx + r * 0.2, hy + r * 0.3);
    c.fill();
    c.fillStyle = '#2b1d1a';
    c.beginPath();
    c.ellipse(cx - r * 0.5, hy - r * 0.2, 9, 13, 0.3, 0, P * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.ellipse(cx + r * 0.45, hy + r * 0.05, 14, 9, 0, 0, P * 2);
    c.fill();
    c.fillStyle = '#2b1d1a';
    circle(c, cx + r * 0.48, hy + r * 0.05, 5);
    c.fill();
    c.strokeStyle = '#b23a48';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(cx - r * 0.4, hy + r * 0.6);
    c.lineTo(cx + r * 0.1, hy + r * 0.45);
    c.lineTo(cx + r * 0.3, hy + r * 0.7);
    c.stroke();
    c.strokeStyle = '#3b2b3f';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(cx + r * 0.05, hy - r * 0.1);
    c.lineTo(cx - r * 0.2, hy + r * 0.3);
    c.lineTo(cx + r * 0.05, hy + r * 0.32);
    c.stroke();
  } else if (kind === 'bighead') {
    c.fillStyle = L.top;
    roundRect(c, cx - w * 0.08, h * 0.86, w * 0.16, h * 0.1, 6);
    c.fill();
    c.strokeStyle = L.skin;
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(cx - 6, h * 0.96);
    c.lineTo(cx - 8, h);
    c.moveTo(cx + 6, h * 0.96);
    c.lineTo(cx + 8, h);
    c.stroke();
    head(c, cx, h * 0.46, w * 0.4, L, { mood: 'grin' });
  } else if (kind === 'moustache') {
    shoulders(c, w, h, L, cx, h * 0.72);
    head(c, cx, hy, r, L, { mood: 'smile' });
    c.fillStyle = '#3b2b3f';
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(cx, hy + r * 0.28);
      c.bezierCurveTo(cx + s * r * 0.3, hy + r * 0.1, cx + s * r * 0.65, hy + r * 0.45, cx + s * r * 0.85, hy + r * 0.15);
      c.bezierCurveTo(cx + s * r * 0.9, hy + r * 0.5, cx + s * r * 0.4, hy + r * 0.55, cx, hy + r * 0.42);
      c.fill();
    }
    c.strokeStyle = '#f4c24f';
    c.lineWidth = 4;
    circle(c, cx + r * 0.36, hy + r * 0.08, r * 0.22);
    c.stroke();
    c.beginPath();
    c.moveTo(cx + r * 0.55, hy + r * 0.2);
    c.quadraticCurveTo(cx + r * 0.7, hy + r * 0.8, cx + r * 0.5, h * 0.8);
    c.stroke();
    c.fillStyle = '#3b2b3f';
    roundRect(c, cx - r * 0.75, hy - r * 1.55, r * 1.5, r * 0.75, 6);
    c.fill();
    c.fillRect(cx - r * 1.05, hy - r * 0.86, r * 2.1, r * 0.14);
  } else if (kind === 'hero') {
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 12; i++) {
      c.save();
      c.translate(cx, hy);
      c.rotate((i / 12) * P * 2);
      c.fillRect(-4, r * 1.25, 8, r * 1.2);
      c.restore();
    }
    c.fillStyle = '#e5484d';
    c.beginPath();
    c.moveTo(cx - w * 0.45, h);
    c.lineTo(cx - w * 0.2, h * 0.7);
    c.lineTo(cx + w * 0.2, h * 0.7);
    c.lineTo(cx + w * 0.45, h);
    c.fill();
    shoulders(c, w * 0.85, h, L, cx, h * 0.72);
    c.fillStyle = '#ffd166';
    circle(c, cx, h * 0.88, 18);
    c.fill();
    c.strokeStyle = '#3b2b3f';
    c.lineWidth = 3.5;
    if (L.girl) {
      // a doctor's cross
      c.fillStyle = '#e5484d';
      c.fillRect(cx - 3.5, h * 0.88 - 11, 7, 22);
      c.fillRect(cx - 11, h * 0.88 - 3.5, 22, 7);
    } else {
      c.strokeRect(cx - 10, h * 0.88 - 7, 20, 13);
      c.beginPath();
      c.moveTo(cx - 13, h * 0.88 + 8);
      c.lineTo(cx + 13, h * 0.88 + 8);
      c.stroke();
    }
    head(c, cx, hy, r, L, { mood: 'grin' });
    c.fillStyle = '#3b2b3f';
    c.beginPath();
    c.ellipse(cx, hy + r * 0.06, r * 0.82, r * 0.25, 0, 0, P * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    for (const s of [-1, 1]) {
      c.beginPath();
      c.ellipse(cx + s * r * 0.36, hy + r * 0.06, r * 0.13, r * 0.09, 0, 0, P * 2);
      c.fill();
    }
  } else if (kind === 'astro') {
    c.fillStyle = '#fff6cf';
    for (let i = 0; i < 26; i++) {
      star(c, (i * 71) % w, (i * 43) % h, 3 + (i % 3));
      c.fill();
    }
    c.fillStyle = '#e6ebf2';
    roundRect(c, cx - w * 0.36, h * 0.72, w * 0.72, h * 0.3, 30);
    c.fill();
    c.fillStyle = '#ef5b6f';
    c.fillRect(cx - w * 0.2, h * 0.8, 16, 10);
    c.fillStyle = '#6fb8ff';
    c.fillRect(cx + w * 0.08, h * 0.8, 16, 10);
    head(c, cx, hy, r, L, { mood: 'o' });
    c.strokeStyle = '#ffffff';
    c.lineWidth = 7;
    circle(c, cx, hy - r * 0.05, r * 1.42);
    c.stroke();
    c.fillStyle = 'rgba(170,220,255,0.25)';
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.beginPath();
    c.ellipse(cx - r * 0.7, hy - r * 0.8, r * 0.22, r * 0.12, -0.7, 0, P * 2);
    c.fill();
  } else if (kind === 'stick') {
    c.fillStyle = '#ffd166';
    circle(c, w * 0.82, h * 0.13, 22);
    c.fill();
    c.strokeStyle = '#3b2b3f';
    c.lineWidth = 5;
    c.lineCap = 'round';
    circle(c, cx, h * 0.3, w * 0.16);
    c.stroke();
    c.beginPath();
    c.moveTo(cx, h * 0.3 + w * 0.16);
    c.lineTo(cx, h * 0.68);
    c.moveTo(cx - w * 0.22, h * 0.42);
    c.lineTo(cx + w * 0.22, h * 0.48);
    c.moveTo(cx, h * 0.68);
    c.lineTo(cx - w * 0.14, h * 0.9);
    c.moveTo(cx, h * 0.68);
    c.lineTo(cx + w * 0.14, h * 0.9);
    c.stroke();
    c.fillStyle = '#3b2b3f';
    circle(c, cx - 12, h * 0.28, 5);
    circle(c, cx + 12, h * 0.28, 5);
    c.fill();
    c.beginPath();
    c.arc(cx, h * 0.31, 18, 0.15 * P, 0.85 * P);
    c.stroke();
    c.fillStyle = L.hair;
    if (L.girl) {
      circle(c, cx - w * 0.19, h * 0.27, 12);
      circle(c, cx + w * 0.19, h * 0.27, 12);
      c.fill();
    } else {
      c.fillRect(cx - w * 0.12, h * 0.17, w * 0.24, 9);
    }
    c.fillStyle = L.top;
    c.beginPath();
    c.moveTo(cx - 20, h * 0.66);
    c.lineTo(cx + 20, h * 0.66);
    c.lineTo(cx + 12, h * 0.48);
    c.lineTo(cx - 12, h * 0.48);
    c.fill();
  } else {
    shoulders(c, w, h, L, cx, h * 0.72);
    head(c, cx, hy, r, L, {});
  }
  if (hearts) {
    const cols = ['#ef5b6f', '#ff8fb1', '#e5484d'];
    for (let i = 0; i < hearts; i++) {
      const a = (i / hearts) * P * 2 + seed;
      const rr = w * (0.36 + (i % 2) * 0.08);
      c.fillStyle = cols[i % 3];
      heart(c, cx + Math.cos(a) * rr, h * 0.42 + Math.sin(a) * rr * 1.15, 18 + (i % 3) * 6);
      c.fill();
    }
  }
}

// Homama's portrait of Roji: lopsided, with hearts everywhere
export function lopsidedRoji(c, w, h, looks) {
  const L = lookOf(looks, 'roji');
  c.fillStyle = '#ffe3ec';
  c.fillRect(0, 0, w, h);
  c.save();
  c.translate(w / 2, h * 0.47);
  c.rotate(-0.16);
  const r = w * 0.28;
  // one pigtail much bigger than the other
  c.fillStyle = L.hair;
  circle(c, -r * 1.15, r * 0.2, r * 0.55);
  c.fill();
  circle(c, r * 1.02, r * 0.05, r * 0.3);
  c.fill();
  c.fillStyle = L.skin;
  c.beginPath();
  c.ellipse(0, 0, r * 1.05, r * 0.9, 0.12, 0, P * 2);
  c.fill();
  hairFront(c, 0, 0, r, L);
  face(c, 0, 0, r, L, { eyeL: 1.35, eyeR: 0.8, tilt: 6 });
  c.fillStyle = L.top;
  c.beginPath();
  c.moveTo(-r * 0.9, h * 0.55);
  c.quadraticCurveTo(-r * 0.5, r * 0.9, r * 0.1, r * 0.95);
  c.quadraticCurveTo(r * 0.9, r * 1.1, r * 1.4, h * 0.55);
  c.fill();
  c.restore();
  const cols = ['#ef5b6f', '#ff8fb1', '#e5484d', '#c73b45'];
  for (let i = 0; i < 22; i++) {
    c.fillStyle = cols[i % 4];
    heart(c, (i * 89 + 17) % w, 14 + ((i * 47) % (h - 40)), 14 + (i % 4) * 7);
    if (Math.hypot(((i * 89 + 17) % w) - w / 2, 14 + ((i * 47) % (h - 40)) - h * 0.47) > w * 0.34) c.fill();
  }
  c.fillStyle = '#b23a48';
  c.font = `600 ${Math.round(h * 0.075)}px ${FONT}`;
  c.textAlign = 'right';
  c.save();
  c.translate(w - 14, h - 14);
  c.rotate(-0.05);
  c.fillText('Roji, by Homama', 0, 0);
  c.restore();
}

// The tiny painting of the two of them, hidden behind a stack of canvases
export function tinyCouple(c, w, h, looks) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#ffcf9e');
  g.addColorStop(0.6, '#ffb3c6');
  g.addColorStop(1, '#ffe3ec');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#ffd166';
  circle(c, w * 0.5, h * 0.62, h * 0.18);
  c.fill();
  c.fillStyle = '#8fd16b';
  c.beginPath();
  c.ellipse(w / 2, h * 1.05, w * 0.75, h * 0.35, 0, 0, P * 2);
  c.fill();
  couple(c, w / 2, h * 0.86, h * 0.46, looks);
  c.fillStyle = '#7a3a5a';
  c.font = `600 ${Math.round(h * 0.09)}px ${FONT}`;
  c.textAlign = 'center';
  c.fillText('us', w / 2, h * 0.14);
}

// Paint handprints of both on a wall
export function handprints(c, w, h) {
  const hand = (x, y, s, rotA, color) => {
    c.save();
    c.translate(x, y);
    c.rotate(rotA);
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(0, 0, s * 0.36, s * 0.42, 0, 0, P * 2);
    c.fill();
    const fingers = [[-0.3, -0.42, -0.35], [-0.12, -0.58, -0.1], [0.06, -0.6, 0.05], [0.24, -0.5, 0.2]];
    for (const [fx, fy, a] of fingers) {
      c.save();
      c.translate(fx * s, fy * s);
      c.rotate(a);
      roundRect(c, -s * 0.07, -s * 0.24, s * 0.14, s * 0.36, s * 0.07);
      c.fill();
      c.restore();
    }
    c.save();
    c.translate(s * 0.38, s * 0.02);
    c.rotate(0.9);
    roundRect(c, -s * 0.07, -s * 0.22, s * 0.14, s * 0.3, s * 0.07);
    c.fill();
    c.restore();
    c.restore();
  };
  hand(w * 0.3, h * 0.48, h * 0.48, -0.25, '#ef5b6f');
  hand(w * 0.7, h * 0.44, h * 0.56, 0.2, '#3f7bf0');
  c.fillStyle = '#ffd166';
  heart(c, w * 0.5, h * 0.18, h * 0.2);
  c.fill();
  c.font = `700 ${Math.round(h * 0.13)}px ${FONT}`;
  c.textAlign = 'center';
  c.fillStyle = '#c73b45';
  c.fillText('R', w * 0.3, h * 0.95);
  c.fillStyle = '#2c5fc7';
  c.fillText('H', w * 0.7, h * 0.95);
}

// ---------------------------------------------------------------- still life (a fruit bowl and a vase)
// style: 'neat' (Roji) or 'hearts' (Homama paints every apple as a heart). stage 0 sketch, 1 colour, 2 light.
export function stillLife(c, w, h, style, stage = 2) {
  c.fillStyle = stage === 0 ? '#fffaf1' : '#f6e6d4';
  c.fillRect(0, 0, w, h);
  if (stage > 0) {
    c.fillStyle = '#c9b3e8';
    c.fillRect(0, h * 0.66, w, h * 0.34);
    c.fillStyle = '#b39ad9';
    c.beginPath();
    c.moveTo(0, h * 0.66);
    c.quadraticCurveTo(w * 0.5, h * 0.62, w, h * 0.68);
    c.lineTo(w, h * 0.72);
    c.quadraticCurveTo(w * 0.5, h * 0.66, 0, h * 0.7);
    c.fill();
  }
  const sketch = (fn) => {
    c.strokeStyle = 'rgba(70,60,60,0.65)';
    c.lineWidth = 2;
    c.beginPath();
    fn();
    c.stroke();
  };
  const fill = (color, fn) => {
    if (stage === 0) return sketch(fn);
    c.fillStyle = color;
    c.beginPath();
    fn();
    c.fill();
  };
  const vx = w * 0.72;
  // vase
  fill('#6fb8ff', () => {
    c.moveTo(vx - w * 0.05, h * 0.66);
    c.quadraticCurveTo(vx - w * 0.13, h * 0.5, vx - w * 0.04, h * 0.38);
    c.lineTo(vx + w * 0.04, h * 0.38);
    c.quadraticCurveTo(vx + w * 0.13, h * 0.5, vx + w * 0.05, h * 0.66);
    c.closePath();
  });
  // flowers
  const fl = [[-0.07, 0.24, '#ff8fb1'], [0.0, 0.18, '#ffd166'], [0.07, 0.25, '#ffffff'], [-0.02, 0.29, '#ef5b6f']];
  for (const [dx, y, col] of fl) {
    if (stage > 0) {
      c.strokeStyle = '#5aa84f';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(vx, h * 0.4);
      c.lineTo(vx + dx * w, h * y);
      c.stroke();
    }
    fill(col, () => c.arc(vx + dx * w, h * y, w * 0.035, 0, P * 2));
  }
  // bowl and fruit
  const bx = w * 0.34;
  const by = h * 0.62;
  const apple = (x, y, s, col) => {
    if (style === 'hearts') fill(col, () => heartPathOnly(c, x, y, s * 2.1));
    else fill(col, () => c.arc(x, y, s, 0, P * 2));
  };
  fill('#ffd166', () => c.ellipse(bx + w * 0.09, by - h * 0.12, w * 0.12, w * 0.035, -0.5, 0, P * 2));
  fill('#8b5cf6', () => {
    for (let i = 0; i < 6; i++) c.arc(bx - w * 0.12 + (i % 3) * w * 0.03, by - h * 0.1 - Math.floor(i / 3) * w * 0.03, w * 0.022, 0, P * 2);
  });
  apple(bx - w * 0.03, by - h * 0.11, w * 0.06, '#e5484d');
  apple(bx + w * 0.07, by - h * 0.07, w * 0.055, '#ff9a3c');
  apple(bx + w * 0.01, by - h * 0.04, w * 0.055, '#7fd36b');
  fill('#ffffff', () => {
    c.moveTo(bx - w * 0.2, by - h * 0.06);
    c.quadraticCurveTo(bx, by + h * 0.12, bx + w * 0.2, by - h * 0.06);
    c.closePath();
  });
  if (stage > 0) {
    c.fillStyle = '#ef5b6f';
    c.fillRect(bx - w * 0.19, by - h * 0.035, w * 0.38, 4);
  }
  if (stage > 1) {
    c.fillStyle = 'rgba(255,255,255,0.75)';
    for (const [x, y] of [[bx - w * 0.05, by - h * 0.14], [vx - w * 0.04, h * 0.48], [bx + w * 0.05, by - h * 0.1]]) {
      c.beginPath();
      c.ellipse(x, y, w * 0.012, w * 0.02, -0.4, 0, P * 2);
      c.fill();
    }
    c.fillStyle = 'rgba(80,50,90,0.18)';
    c.beginPath();
    c.ellipse(bx, by + h * 0.075, w * 0.18, h * 0.02, 0, 0, P * 2);
    c.ellipse(vx, h * 0.665, w * 0.08, h * 0.015, 0, 0, P * 2);
    c.fill();
    c.fillStyle = style === 'hearts' ? '#c73b45' : '#6b4a8a';
    c.font = `600 ${Math.round(h * 0.06)}px ${FONT}`;
    c.textAlign = 'right';
    c.fillText(style === 'hearts' ? 'H' : 'R', w - 12, h - 12);
  }
}

function heartPathOnly(c, x, y, s) {
  c.moveTo(x, y + s * 0.45);
  c.bezierCurveTo(x - s * 0.75, y - s * 0.05, x - s * 0.45, y - s * 0.62, x, y - s * 0.28);
  c.bezierCurveTo(x + s * 0.45, y - s * 0.62, x + s * 0.75, y - s * 0.05, x, y + s * 0.45);
}

// ---------------------------------------------------------------- murals (wide)
export const MURALS = [
  { id: 'island', name: 'our island' },
  { id: 'garden', name: 'a garden full of flowers' },
  { id: 'night', name: 'a starry night' },
];

export function mural(c, w, h, id, looks) {
  if (id === 'night') {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1f2a63');
    g.addColorStop(1, '#6a4f9a');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff6cf';
    for (let i = 0; i < 60; i++) {
      star(c, (i * 173) % w, (i * 61) % (h * 0.7), 3 + (i % 4) * 1.5);
      c.fill();
    }
    circle(c, w * 0.82, h * 0.2, h * 0.11);
    c.fill();
    c.fillStyle = '#2a3366';
    circle(c, w * 0.845, h * 0.18, h * 0.1);
    c.fill();
    c.strokeStyle = '#fff6cf';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(w * 0.2, h * 0.12);
    c.lineTo(w * 0.32, h * 0.28);
    c.stroke();
    c.fillStyle = '#3c5a3f';
    c.beginPath();
    c.ellipse(w * 0.5, h * 1.15, w * 0.6, h * 0.42, 0, 0, P * 2);
    c.fill();
    for (let i = 0; i < 7; i++) {
      const x = w * (0.08 + i * 0.14);
      c.fillStyle = '#ffd27a';
      roundRect(c, x - 10, h * 0.5 + (i % 2) * 20, 20, 28, 6);
      c.fill();
      c.fillStyle = 'rgba(255,210,122,0.25)';
      circle(c, x, h * 0.53 + (i % 2) * 20, 30);
      c.fill();
    }
    couple(c, w * 0.5, h * 0.84, h * 0.34, looks);
    return;
  }
  const sky = c.createLinearGradient(0, 0, 0, h * 0.7);
  sky.addColorStop(0, id === 'garden' ? '#bfe8ff' : '#8fd3ff');
  sky.addColorStop(1, '#fff1d6');
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#ffd166';
  circle(c, w * 0.12, h * 0.2, h * 0.11);
  c.fill();
  c.fillStyle = '#ffffff';
  for (const [x, y, s] of [[0.3, 0.16, 1.2], [0.62, 0.1, 0.9], [0.86, 0.2, 1]]) {
    c.beginPath();
    c.ellipse(w * x, h * y, 50 * s, 18 * s, 0, 0, P * 2);
    c.ellipse(w * x + 30 * s, h * y - 12 * s, 34 * s, 18 * s, 0, 0, P * 2);
    c.fill();
  }
  if (id === 'island') {
    const rb = ['#ef5b6f', '#ff9a3c', '#ffd166', '#7fd36b', '#6fb8ff', '#8b5cf6'];
    rb.forEach((col, i) => {
      c.strokeStyle = col;
      c.lineWidth = 9;
      c.beginPath();
      c.arc(w * 0.7, h * 0.62, h * (0.5 - i * 0.035), P, 0);
      c.stroke();
    });
    c.fillStyle = '#5cc8e8';
    c.fillRect(0, h * 0.62, w, h * 0.38);
    c.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 18; i++) c.fillRect((i * 131) % w, h * 0.68 + ((i * 37) % (h * 0.28)), 26, 3);
    c.fillStyle = '#f2d59b';
    c.beginPath();
    c.ellipse(w * 0.5, h * 0.8, w * 0.36, h * 0.13, 0, 0, P * 2);
    c.fill();
    c.fillStyle = '#8fd16b';
    c.beginPath();
    c.ellipse(w * 0.5, h * 0.76, w * 0.32, h * 0.12, 0, 0, P * 2);
    c.fill();
    const houses = [[0.28, '#ffb3c6'], [0.36, '#ffd166'], [0.62, '#7fd8bf'], [0.7, '#c7a6ff']];
    for (const [x, col] of houses) {
      c.fillStyle = col;
      c.fillRect(w * x - 22, h * 0.6, 44, 36);
      c.fillStyle = '#e5484d';
      c.beginPath();
      c.moveTo(w * x - 28, h * 0.6);
      c.lineTo(w * x, h * 0.53);
      c.lineTo(w * x + 28, h * 0.6);
      c.fill();
    }
    c.fillStyle = '#4f9a45';
    for (const x of [0.22, 0.44, 0.56, 0.78]) {
      circle(c, w * x, h * 0.62, 18);
      c.fill();
    }
    couple(c, w * 0.5, h * 0.8, h * 0.32, looks);
  } else {
    c.fillStyle = '#8fd16b';
    c.fillRect(0, h * 0.62, w, h * 0.38);
    c.fillStyle = '#6cbb55';
    c.beginPath();
    c.moveTo(0, h * 0.74);
    c.quadraticCurveTo(w * 0.5, h * 0.6, w, h * 0.76);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.fill();
    const cols = ['#ef5b6f', '#ffd166', '#ffffff', '#c7a6ff', '#ff9a3c', '#ff8fb1'];
    for (let i = 0; i < 16; i++) {
      const x = ((i * 0.0625 + 0.03) % 1) * w;
      const y = h * (0.72 + (i % 3) * 0.08);
      const s = 14 + (i % 4) * 5;
      c.strokeStyle = '#3f9a4f';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x, y - s * 2.2);
      c.stroke();
      c.fillStyle = cols[i % cols.length];
      for (let k = 0; k < 5; k++) {
        circle(c, x + Math.cos((k / 5) * P * 2) * s * 0.6, y - s * 2.2 + Math.sin((k / 5) * P * 2) * s * 0.6, s * 0.45);
        c.fill();
      }
      c.fillStyle = '#ffd166';
      circle(c, x, y - s * 2.2, s * 0.35);
      c.fill();
    }
    for (const [x, y, col] of [[0.24, 0.36, '#ff8fb1'], [0.7, 0.3, '#ffd166'], [0.86, 0.42, '#c7a6ff']]) {
      c.fillStyle = col;
      for (const s of [-1, 1]) {
        c.beginPath();
        c.ellipse(w * x + s * 12, h * y, 12, 16, s * 0.5, 0, P * 2);
        c.fill();
      }
    }
    c.fillStyle = '#ef5b6f';
    heart(c, w * 0.5, h * 0.3, h * 0.28);
    c.fill();
    couple(c, w * 0.5, h * 0.9, h * 0.34, looks, { heartAbove: false });
  }
}

// ---------------------------------------------------------------- outdoor paintings
export function landscape(c, w, h) {
  const sky = c.createLinearGradient(0, 0, 0, h * 0.6);
  sky.addColorStop(0, '#9fd8ff');
  sky.addColorStop(1, '#fff1d6');
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#ffd166';
  circle(c, w * 0.78, h * 0.22, h * 0.1);
  c.fill();
  c.fillStyle = '#ffffff';
  for (const [x, y, s] of [[0.2, 0.18, 1], [0.45, 0.12, 0.7]]) {
    c.beginPath();
    c.ellipse(w * x, h * y, 50 * s, 20 * s, 0, 0, P * 2);
    c.ellipse(w * x + 30 * s, h * y - 12 * s, 34 * s, 20 * s, 0, 0, P * 2);
    c.fill();
  }
  c.fillStyle = '#8fd16b';
  c.beginPath();
  c.moveTo(0, h * 0.62);
  c.quadraticCurveTo(w * 0.3, h * 0.45, w * 0.6, h * 0.6);
  c.quadraticCurveTo(w * 0.85, h * 0.5, w, h * 0.58);
  c.lineTo(w, h);
  c.lineTo(0, h);
  c.fill();
  c.fillStyle = '#6cbb55';
  c.beginPath();
  c.moveTo(0, h * 0.78);
  c.quadraticCurveTo(w * 0.5, h * 0.62, w, h * 0.8);
  c.lineTo(w, h);
  c.lineTo(0, h);
  c.fill();
  c.fillStyle = '#8b5e3c';
  c.fillRect(w * 0.13, h * 0.45, w * 0.03, h * 0.2);
  c.fillStyle = '#4f9a45';
  circle(c, w * 0.145, h * 0.42, h * 0.1);
  c.fill();
  for (let i = 0; i < 9; i++) {
    c.fillStyle = ['#ff8fb1', '#ffd75e', '#ffffff', '#c7a6ff'][i % 4];
    circle(c, w * (0.08 + i * 0.1), h * (0.88 + (i % 2) * 0.05), 9);
    c.fill();
  }
  c.fillStyle = '#ffb3c6';
  c.fillRect(w * 0.6, h * 0.5, 50, 40);
  c.fillStyle = '#e5484d';
  c.beginPath();
  c.moveTo(w * 0.6 - 8, h * 0.5);
  c.lineTo(w * 0.6 + 25, h * 0.42);
  c.lineTo(w * 0.6 + 58, h * 0.5);
  c.fill();
  c.fillStyle = '#fff6cf';
  c.fillRect(w * 0.6 + 18, h * 0.55, 14, 14);
}

export function sunflowers(c, w, h) {
  c.fillStyle = '#7fc8f0';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#5aa84f';
  c.fillRect(0, h * 0.75, w, h * 0.25);
  for (const [x, y, s] of [[0.25, 0.4, 1], [0.55, 0.3, 1.2], [0.8, 0.45, 0.9]]) {
    c.strokeStyle = '#3f9a4f';
    c.lineWidth = 8 * s;
    c.beginPath();
    c.moveTo(w * x, h * y);
    c.lineTo(w * x + 6, h);
    c.stroke();
    c.fillStyle = '#ffc23d';
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * P * 2;
      c.beginPath();
      c.ellipse(w * x + Math.cos(a) * 30 * s, h * y + Math.sin(a) * 30 * s, 16 * s, 8 * s, a, 0, P * 2);
      c.fill();
    }
    c.fillStyle = '#8b5e3c';
    circle(c, w * x, h * y, 20 * s);
    c.fill();
  }
}

// A child's crayon drawing: a house, a sun, two people and a heart
export function crayonHouse(c, w, h, looks) {
  paper(c, w, h, '#ffffff');
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = '#ffc23d';
  c.lineWidth = 6;
  circle(c, w * 0.15, h * 0.18, h * 0.09);
  c.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * P * 2;
    c.beginPath();
    c.moveTo(w * 0.15 + Math.cos(a) * h * 0.12, h * 0.18 + Math.sin(a) * h * 0.12);
    c.lineTo(w * 0.15 + Math.cos(a) * h * 0.17, h * 0.18 + Math.sin(a) * h * 0.17);
    c.stroke();
  }
  c.strokeStyle = '#e5484d';
  c.beginPath();
  c.moveTo(w * 0.45, h * 0.5);
  c.lineTo(w * 0.62, h * 0.3);
  c.lineTo(w * 0.8, h * 0.5);
  c.stroke();
  c.strokeStyle = '#3f7bf0';
  c.strokeRect(w * 0.48, h * 0.5, w * 0.3, h * 0.3);
  c.strokeStyle = '#3fbf7f';
  c.beginPath();
  c.moveTo(0, h * 0.82);
  for (let x = 0; x <= w; x += 16) c.lineTo(x, h * 0.82 - (x % 32 ? 10 : 0));
  c.stroke();
  const R = lookOf(looks, 'roji');
  const H = lookOf(looks, 'homama');
  for (const [x, L] of [[0.22, R], [0.33, H]]) {
    c.strokeStyle = L.top;
    c.lineWidth = 5;
    circle(c, w * x, h * 0.55, 12);
    c.stroke();
    c.beginPath();
    c.moveTo(w * x, h * 0.55 + 12);
    c.lineTo(w * x, h * 0.74);
    c.moveTo(w * x - 14, h * 0.64);
    c.lineTo(w * x + 14, h * 0.64);
    c.moveTo(w * x, h * 0.74);
    c.lineTo(w * x - 10, h * 0.82);
    c.moveTo(w * x, h * 0.74);
    c.lineTo(w * x + 10, h * 0.82);
    c.stroke();
  }
  c.fillStyle = '#ff8fb1';
  heart(c, w * 0.275, h * 0.4, 26);
  c.fill();
}

// ---------------------------------------------------------------- Reveal: paint a picture onto a texture
// target: a canvas with the finished picture. view: the canvas the texture shows. start(): sketch state.
export class Reveal {
  constructor(w, h, { dab = 0.09, cols = 9, rows = 7 } = {}) {
    this.w = w;
    this.h = h;
    this.full = document.createElement('canvas');
    this.full.width = w;
    this.full.height = h;
    this.view = document.createElement('canvas');
    this.view.width = w;
    this.view.height = h;
    this.fctx = this.full.getContext('2d');
    this.vctx = this.view.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.view);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 8;
    this.cols = cols;
    this.rows = rows;
    this.dabR = Math.max(w, h) * dab;
    this.total = cols * rows * 3;
    this.progress = this.total;
    this.speed = 0;
  }

  // Paint the finished picture (fn(ctx, w, h)) and show it at once (done) or start from a sketch
  set(fn, { done = false, ghost = 0.14, blank = '#fffaf1' } = {}) {
    this.fctx.clearRect(0, 0, this.w, this.h);
    fn(this.fctx, this.w, this.h);
    if (done) this.finish();
    else this.blank(ghost, blank);
  }

  // Paint a new stage (fn) over what is shown now, dab by dab, in `seconds`
  paintOver(fn, seconds) {
    this.fctx.clearRect(0, 0, this.w, this.h);
    fn(this.fctx, this.w, this.h);
    this.progress = 0;
    this.play(seconds);
  }

  blank(ghost = 0.14, color = '#fffaf1') {
    paper(this.vctx, this.w, this.h, color);
    if (ghost) {
      this.vctx.globalAlpha = ghost;
      this.vctx.drawImage(this.full, 0, 0);
      this.vctx.globalAlpha = 1;
    }
    this.progress = 0;
    this.tex.needsUpdate = true;
  }

  finish() {
    this.vctx.drawImage(this.full, 0, 0);
    this.progress = this.total;
    this.tex.needsUpdate = true;
  }

  get done() {
    return this.progress >= this.total;
  }

  // Paint for `seconds` more seconds over the whole picture
  play(seconds) {
    this.speed = (this.total - this.progress) / Math.max(0.2, seconds);
  }

  update(dt) {
    if (this.progress >= this.total || !this.speed) return false;
    const n = Math.min(this.total, this.progress + dt * this.speed);
    const { cols, rows, w, h, vctx } = this;
    for (let i = Math.floor(this.progress); i < Math.floor(n); i++) {
      const row = Math.floor(i / (cols * 3));
      const colF = (i % (cols * 3)) / 3;
      const col = row % 2 ? cols - colF : colF;
      const x = (col / cols) * w + Math.sin(i * 1.7) * w * 0.02;
      const y = ((row + 0.5) / rows) * h + Math.cos(i * 2.3) * h * 0.03;
      vctx.save();
      vctx.beginPath();
      vctx.ellipse(x, y, this.dabR * 1.15, this.dabR, i * 0.7, 0, P * 2);
      vctx.clip();
      vctx.drawImage(this.full, 0, 0);
      vctx.restore();
    }
    this.progress = n;
    if (this.progress >= this.total) {
      vctx.drawImage(this.full, 0, 0);
      this.speed = 0;
    }
    this.tex.needsUpdate = true;
    return true;
  }
}
