import { P, seg, ease, hash, pulse, sky, cloud, sceneFade, caption, text, heart, face, melody, chords, rr } from './common.js';
import { DEFAULT_LOOKS } from '../../../looks.js';
import { STOPS } from '../../../config.js';

// "Roji and Homama: the movie", the secret film that unlocks after three others.
// Little scenes from their weekends (cinema, riding, fencing, board games, clay, drawing),
// then the stamp book with the stamps they have collected so far, and the credits.

const CH0 = 6; // first chapter starts here
const CH = 8; // seconds per chapter
const WEEKS = ['cinema', 'horse', 'fencing', 'boardgames', 'clay', 'drawing'];
const BOOK = CH0 + WEEKS.length * CH; // 54
const stop = (id) => STOPS.find((s) => s.id === id) || { title: id, color: '#ef5b6f' };

// A chibi Roji or Homama, feet at (x, y). arm: 0..1 raises the right arm (a wave or a cheer).
function chibi(ctx, x, y, s, L, { mood = 'smile', t = 0, arm = 0, armL = 0, dir = 1, bob = 0, mask = false, apron = null } = {}) {
  const girl = L.gender === 'girl';
  ctx.save();
  ctx.translate(x, y - Math.abs(Math.sin(t * 6)) * bob * 3 * s);
  ctx.scale(dir, 1);
  // Legs and shoes
  ctx.fillStyle = L.skin;
  for (const k of [-1, 1]) ctx.fillRect(k * 5 * s - 2.5 * s, -14 * s, 5 * s, 12 * s);
  ctx.fillStyle = L.shoes;
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(k * 5 * s, -2 * s, 5 * s, 3 * s, 0, 0, P * 2);
    ctx.fill();
  }
  // Body: a dress, or a tee and shorts
  if (girl) {
    ctx.fillStyle = L.top;
    ctx.beginPath();
    ctx.moveTo(-8 * s, -36 * s);
    ctx.lineTo(8 * s, -36 * s);
    ctx.lineTo(15 * s, -12 * s);
    ctx.lineTo(-15 * s, -12 * s);
    ctx.fill();
  } else {
    ctx.fillStyle = L.bottom;
    ctx.fillRect(-10 * s, -20 * s, 20 * s, 8 * s);
    ctx.fillStyle = L.top;
    rr(ctx, -10 * s, -37 * s, 20 * s, 19 * s, 4 * s);
    ctx.fill();
  }
  if (apron) {
    ctx.fillStyle = apron;
    rr(ctx, -7 * s, -30 * s, 14 * s, 16 * s, 3 * s);
    ctx.fill();
  }
  // Arms
  ctx.fillStyle = L.skin;
  ctx.save();
  ctx.translate(10 * s, -33 * s);
  ctx.rotate(-0.3 - arm * 2.2 + (arm ? Math.sin(t * 10) * 0.25 * arm : 0));
  ctx.fillRect(-2.5 * s, 0, 5 * s, 14 * s);
  ctx.restore();
  ctx.save();
  ctx.translate(-10 * s, -33 * s);
  ctx.rotate(0.3 + armL * 2.2);
  ctx.fillRect(-2.5 * s, 0, 5 * s, 14 * s);
  ctx.restore();
  // Head and hair
  const hy = -52 * s;
  ctx.fillStyle = L.hair;
  if (girl) {
    ctx.beginPath();
    ctx.arc(0, hy + 2 * s, 18 * s, 0, P * 2);
    ctx.fill();
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(k * 20 * s, hy + 6 * s + Math.sin(t * 4 + k) * 1.5 * s, 6 * s, 10 * s, k * 0.3, 0, P * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = L.skin;
  ctx.beginPath();
  ctx.arc(0, hy, 16 * s, 0, P * 2);
  ctx.fill();
  ctx.fillStyle = L.hair;
  ctx.beginPath();
  ctx.arc(0, hy - 2 * s, 16.5 * s, P * 1.02, P * 1.98);
  ctx.quadraticCurveTo(4 * s, hy - 10 * s, -16 * s, hy - 4 * s);
  ctx.fill();
  if (girl) {
    ctx.fillStyle = L.accent || '#ff7fa3';
    ctx.beginPath();
    ctx.arc(11 * s, hy - 12 * s, 3.5 * s, 0, P * 2);
    ctx.fill();
  }
  if (mask) {
    ctx.fillStyle = 'rgba(60,60,80,0.85)';
    rr(ctx, -12 * s, hy - 8 * s, 24 * s, 20 * s, 8 * s);
    ctx.fill();
  } else face(ctx, 0, hy + 2 * s, s * 0.75, mood, { gap: 7 });
  ctx.restore();
}

function pony(ctx, x, y, s, t) {
  ctx.save();
  ctx.translate(x, y);
  const b = Math.sin(t * 8) * 2 * s;
  ctx.fillStyle = '#c98a5a';
  for (const k of [-16, -8, 10, 18]) ctx.fillRect(k * s, -18 * s + (k > 0 ? b : -b) * 0.3, 5 * s, 18 * s);
  ctx.beginPath();
  ctx.ellipse(0, -24 * s + b * 0.3, 26 * s, 13 * s, 0, 0, P * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(26 * s, -40 * s + b * 0.3, 9 * s, 13 * s, 0.5, 0, P * 2);
  ctx.fill();
  ctx.fillStyle = '#7a4a2a';
  ctx.beginPath();
  ctx.ellipse(-26 * s, -26 * s, 5 * s, 12 * s, 0.6, 0, P * 2);
  ctx.ellipse(22 * s, -46 * s, 4 * s, 10 * s, -0.5, 0, P * 2);
  ctx.fill();
  face(ctx, 29 * s, -40 * s, s * 0.5, 'happy', { gap: 5 });
  ctx.restore();
}

function stampDraw(ctx, x, y, r, st, got, k, t) {
  ctx.save();
  ctx.translate(x, y);
  if (!got) {
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(120,90,110,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, P * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, 'soon', 0, 0, r * 0.42, 'rgba(120,90,110,0.6)', { weight: 600, maxW: r * 1.6 });
    ctx.restore();
    return;
  }
  const sc = k < 1 ? 1.6 - ease(k) * 0.6 : 1;
  ctx.scale(sc, sc);
  ctx.rotate(-0.12 + hash(r + x) * 0.24);
  ctx.globalAlpha = Math.min(1, k * 3);
  ctx.fillStyle = st.color;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, P * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.arc(0, 0, r - 5, 0, P * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  heart(ctx, 0, -r * 0.25, r * 0.5, '#ffffff', 0.95 * Math.min(1, k * 3));
  ctx.globalAlpha = Math.min(1, k * 3);
  text(ctx, st.title, 0, r * 0.42, r * 0.3, '#ffffff', { weight: 700, maxW: r * 1.6 });
  ctx.restore();
}

export default {
  id: 'ourmovie',
  title: 'Roji and Homama: the movie',
  short: 'Our movie',
  genre: 'Secret film',
  tag: 'Starring us',
  blurb: 'Scenes from their weekends together, and every stamp they collected.',
  len: 72,
  trailer: 14,
  secret: true,
  poster: {
    bg: ['#ffd1dc', '#ef5b6f'],
    art(ctx, w, h, S) {
      const s = w / 256;
      const L = S?.looks || DEFAULT_LOOKS;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 9; i++) heart(ctx, hash(i) * w, hash(i * 3) * h * 0.7, (10 + hash(i * 5) * 12) * s, '#ffffff', 0.35);
      chibi(ctx, w * 0.38, h * 0.66, 2.3 * s, L.roji, { mood: 'happy', armL: 0 });
      chibi(ctx, w * 0.62, h * 0.66, 2.3 * s, L.homama, { mood: 'happy', dir: -1 });
      heart(ctx, w * 0.5, h * 0.22, 30 * s, '#ffffff', 0.95);
    },
  },
  draw(ctx, W, H, t, S = {}) {
    const L = S.looks || DEFAULT_LOOKS;
    const R = L.roji;
    const Hm = L.homama;
    const stamps = new Set(S.stamps || []);
    if (t < CH0) {
      // Title over a strip of film
      sky(ctx, W, H, '#ffd1dc', '#ff9eb5');
      for (let i = 0; i < 12; i++) {
        const k = (t * 0.2 + hash(i)) % 1;
        heart(ctx, hash(i * 7) * W, H * (1.1 - k * 1.2), 10 + hash(i) * 14, '#ffffff', 0.5 * (1 - k));
      }
      ctx.fillStyle = '#3b2b3f';
      ctx.fillRect(0, H * 0.06, W, 22);
      ctx.fillRect(0, H * 0.94 - 22, W, 22);
      ctx.fillStyle = '#fff6e6';
      for (let i = 0; i < 24; i++) {
        const x = ((i * 30 - t * 40) % (W + 30) + W + 30) % (W + 30) - 15;
        rr(ctx, x, H * 0.06 + 6, 14, 10, 3);
        ctx.fill();
        rr(ctx, x, H * 0.94 - 16, 14, 10, 3);
        ctx.fill();
      }
      const k = pulse(t, 0.4, 5.2, 0.6, 0.6);
      ctx.globalAlpha = k;
      text(ctx, 'Roji and Homama', W / 2, H * 0.42, H * 0.14, '#c2405a', { stroke: '#ffffff', lw: 10 });
      text(ctx, 'the movie', W / 2, H * 0.6, H * 0.08, '#7a3a5a', { weight: 600 });
      ctx.globalAlpha = 1;
      chibi(ctx, W * 0.16, H * 0.86, 1.1, R, { t, mood: 'happy', arm: pulse(t, 1, 4, 0.3, 0.3) });
      chibi(ctx, W * 0.84, H * 0.86, 1.1, Hm, { t, mood: 'happy', arm: pulse(t, 1.4, 4.4, 0.3, 0.3), dir: -1 });
      sceneFade(ctx, W, H, t, CH0, 0.8, 0.5);
      return;
    }
    if (t < BOOK) {
      const i = Math.floor((t - CH0) / CH);
      const u = t - CH0 - i * CH;
      const id = WEEKS[i];
      const st = stop(id);
      const gx = W * 0.4;
      const gy = H * 0.84;
      if (id === 'cinema') {
        // A tiny cinema inside the movie
        ctx.fillStyle = '#4b2552';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#dff2ff';
        rr(ctx, W * 0.25, H * 0.08, W * 0.5, H * 0.36, 6);
        ctx.fill();
        heart(ctx, W * 0.5, H * 0.26, 40 + Math.sin(t * 3) * 4, '#ff9eb5');
        ctx.fillStyle = '#e5484d';
        rr(ctx, W * 0.3, H * 0.6, W * 0.4, H * 0.3, 14);
        ctx.fill();
        chibi(ctx, W * 0.44, H * 0.78, 1.4, R, { t, mood: u > 4 ? 'love' : 'happy' });
        chibi(ctx, W * 0.56, H * 0.78, 1.4, Hm, { t, mood: 'happy', dir: -1, arm: pulse(u, 2.5, 4.5, 0.3, 0.3) * 0.5 });
        ctx.fillStyle = '#ffffff';
        rr(ctx, W * 0.5 - 12, H * 0.62, 24, 22, 4);
        ctx.fill();
        ctx.fillStyle = '#fff3cf';
        for (let k = 0; k < 5; k++) {
          ctx.beginPath();
          ctx.arc(W * 0.5 - 8 + k * 4, H * 0.62 - 2 - (k % 2) * 3, 4, 0, P * 2);
          ctx.fill();
        }
      } else if (id === 'horse') {
        sky(ctx, W, H, '#8fd3ff', '#e3f6ff');
        for (let k = 0; k < 3; k++) cloud(ctx, ((k * 220 - t * 10) % (W + 100) + W + 100) % (W + 100) - 50, 40 + k * 16, 1.1);
        ctx.fillStyle = '#9ad97a';
        ctx.fillRect(0, H * 0.72, W, H);
        ctx.fillStyle = '#7fc35f';
        for (let k = 0; k < 20; k++) ctx.fillRect(((k * 40 - t * 30) % W + W) % W, H * 0.78 + (k % 3) * 10, 3, 8);
        const x = W * 0.45 + Math.sin(u * 0.6) * 20;
        pony(ctx, x, gy, 1.6, t);
        chibi(ctx, x - 4, gy - 38, 1.25, R, { t, mood: 'happy', arm: pulse(u, 3, 6, 0.3, 0.4) });
        chibi(ctx, x + 80, gy, 1.4, Hm, { t, mood: 'happy', dir: -1, bob: 1 });
      } else if (id === 'fencing') {
        ctx.fillStyle = '#e8f0ff';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#c9d6f0';
        ctx.fillRect(0, H * 0.76, W, H);
        ctx.fillStyle = '#3f7bf0';
        ctx.fillRect(W * 0.1, H * 0.8, W * 0.8, 6);
        const lunge = pulse(u, 2, 3.2, 0.3, 0.6);
        const wR = { ...R, top: '#ffffff', bottom: '#ffffff' };
        const wH = { ...Hm, top: '#ffffff', bottom: '#ffffff' };
        chibi(ctx, W * 0.36 + lunge * 20, gy, 1.55, wR, { t, mood: 'happy', mask: u < 4.5, arm: 0.45 });
        chibi(ctx, W * 0.64 - lunge * 10, gy, 1.55, wH, { t, mood: 'grin', mask: u < 4.5, arm: 0.45, dir: -1 });
        ctx.strokeStyle = '#9aa6b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(W * 0.4 + lunge * 20, H * 0.6);
        ctx.lineTo(W * 0.52 + lunge * 20, H * 0.48);
        ctx.moveTo(W * 0.6 - lunge * 10, H * 0.6);
        ctx.lineTo(W * 0.48 - lunge * 10, H * 0.48);
        ctx.stroke();
        if (u > 3) heart(ctx, W * 0.5, H * 0.42 - (u - 3) * 8, 18, '#ef5b6f', 1 - seg(u, 5, 7));
      } else if (id === 'boardgames') {
        ctx.fillStyle = '#efe3ff';
        ctx.fillRect(0, 0, W, H);
        chibi(ctx, W * 0.3, gy, 1.55, R, { t, mood: u > 3 ? 'grin' : 'smile', arm: pulse(u, 3, 6, 0.2, 0.4), armL: pulse(u, 3, 6, 0.2, 0.4) });
        chibi(ctx, W * 0.7, gy, 1.55, Hm, { t, mood: u > 3 ? 'happy' : 'smile', dir: -1 });
        ctx.fillStyle = '#c98a5a';
        rr(ctx, W * 0.36, H * 0.6, W * 0.28, H * 0.06, 6);
        ctx.fill();
        ctx.fillRect(W * 0.38, H * 0.66, 8, H * 0.2);
        ctx.fillRect(W * 0.6, H * 0.66, 8, H * 0.2);
        const roll = u < 2.4 ? u * 9 : 0;
        for (const [dx, n] of [[-20, 6], [14, 5]]) {
          ctx.save();
          ctx.translate(W * 0.5 + dx, H * 0.56 - (u < 2.4 ? Math.abs(Math.sin(u * 5)) * 20 : 0));
          ctx.rotate(roll);
          ctx.fillStyle = '#ffffff';
          rr(ctx, -10, -10, 20, 20, 4);
          ctx.fill();
          ctx.fillStyle = '#3b2b3f';
          for (let k = 0; k < n; k++) {
            ctx.beginPath();
            ctx.arc(-5 + (k % 2) * 10, -5 + Math.floor(k / 2) * 5, 1.8, 0, P * 2);
            ctx.fill();
          }
          ctx.restore();
        }
        if (u > 4.2) {
          ctx.fillStyle = '#ffd1dc';
          rr(ctx, W * 0.66, H * 0.48, 30, 18, 4);
          ctx.fill();
          ctx.fillStyle = '#ef5b6f';
          ctx.beginPath();
          ctx.arc(W * 0.66 + 15, H * 0.46, 5, 0, P * 2);
          ctx.fill();
          text(ctx, 'Winner picks dessert!', W * 0.5, H * 0.18, H * 0.075, '#8b5cf6', { stroke: '#ffffff', lw: 5 });
        }
      } else if (id === 'clay') {
        ctx.fillStyle = '#ffe8d6';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#d9a06a';
        ctx.fillRect(0, H * 0.7, W, H);
        // The pottery wheel and a growing vase
        ctx.fillStyle = '#8a8a9a';
        rr(ctx, W * 0.43, H * 0.66, W * 0.14, H * 0.06, 6);
        ctx.fill();
        const g = ease(seg(u, 0.8, 4.5));
        ctx.fillStyle = '#d9734e';
        ctx.beginPath();
        ctx.moveTo(W * 0.5 - 16, H * 0.66);
        ctx.quadraticCurveTo(W * 0.5 - 26, H * 0.66 - 24 * g, W * 0.5 - 8, H * 0.66 - 44 * g);
        ctx.lineTo(W * 0.5 + 8, H * 0.66 - 44 * g);
        ctx.quadraticCurveTo(W * 0.5 + 26, H * 0.66 - 24 * g, W * 0.5 + 16, H * 0.66);
        ctx.fill();
        if (u > 5) heart(ctx, W * 0.5, H * 0.66 - 22, 12, '#ffffff', seg(u, 5, 6));
        chibi(ctx, W * 0.32, gy, 1.55, R, { t, mood: 'happy', arm: 0.4, apron: '#ffd166' });
        chibi(ctx, W * 0.68, gy, 1.55, Hm, { t, mood: 'happy', arm: 0.4, dir: -1, apron: '#7fd8bf' });
        // Coffee cups
        for (const x of [0.16, 0.84]) {
          ctx.fillStyle = '#ffffff';
          rr(ctx, W * x - 9, H * 0.6, 18, 16, 4);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath();
          ctx.arc(W * x + Math.sin(t * 2) * 3, H * 0.55 - ((t * 10) % 10), 3, 0, P * 2);
          ctx.fill();
        }
      } else {
        // Drawing: an easel with a drawing of the two of them
        ctx.fillStyle = '#fff1f6';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ffd1dc';
        ctx.fillRect(0, H * 0.74, W, H);
        ctx.strokeStyle = '#9b6a43';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(W * 0.42, H * 0.86);
        ctx.lineTo(W * 0.5, H * 0.12);
        ctx.lineTo(W * 0.58, H * 0.86);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(W * 0.4, H * 0.16, W * 0.2, H * 0.42);
        const d = seg(u, 0.6, 5);
        ctx.save();
        ctx.beginPath();
        ctx.rect(W * 0.4, H * 0.16, W * 0.2 * d, H * 0.42);
        ctx.clip();
        chibi(ctx, W * 0.46, H * 0.52, 0.6, R, { t: 0, mood: 'happy' });
        chibi(ctx, W * 0.54, H * 0.52, 0.6, Hm, { t: 0, mood: 'happy', dir: -1 });
        heart(ctx, W * 0.5, H * 0.24, 14, '#ef5b6f');
        ctx.restore();
        chibi(ctx, W * 0.26, gy, 1.55, R, { t, mood: 'happy', arm: 0.5 + Math.sin(t * 6) * 0.1 });
        chibi(ctx, W * 0.74, gy, 1.55, Hm, { t, mood: u > 5 ? 'love' : 'wow', dir: -1 });
      }
      // Chapter card
      const k = pulse(u, 0.3, 3, 0.4, 0.5);
      if (k > 0) {
        ctx.globalAlpha = k;
        ctx.fillStyle = 'rgba(255,250,243,0.92)';
        rr(ctx, W * 0.03, H * 0.05, W * 0.34, H * 0.16, 14);
        ctx.fill();
        ctx.fillStyle = st.color;
        rr(ctx, W * 0.03, H * 0.05, 10, H * 0.16, 5);
        ctx.fill();
        text(ctx, `Weekend ${i + 1}`, W * 0.2, H * 0.095, H * 0.05, '#7a5a68', { weight: 600 });
        text(ctx, st.title, W * 0.2, H * 0.16, H * 0.065, st.color, { maxW: W * 0.3 });
        ctx.globalAlpha = 1;
      }
      sceneFade(ctx, W, H, u, CH, 0.4, 0.4, '#ffffff');
      return;
    }
    if (t < 64) {
      // The stamp book
      const u = t - BOOK;
      ctx.fillStyle = '#fff4e6';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#f3dcc4';
      ctx.fillRect(W / 2 - 3, 0, 6, H);
      text(ctx, 'Our stamp book', W / 2, H * 0.12, H * 0.09, '#c2405a');
      WEEKS.forEach((id, i) => {
        const x = W * (0.2 + (i % 3) * 0.3);
        const y = H * (0.4 + Math.floor(i / 3) * 0.36);
        const k = seg(u, 1 + i * 0.8, 1.4 + i * 0.8);
        stampDraw(ctx, x, y, 38, stop(id), stamps.has(id) && k > 0, k, t);
      });
      const n = WEEKS.filter((id) => stamps.has(id)).length;
      caption(ctx, W, H, n ? `${n} of ${WEEKS.length} weekends so far, and many more to come.` : 'Every weekend is a new stamp.', pulse(u, 6.2, 9.6, 0.3, 0.4));
      sceneFade(ctx, W, H, u, 10, 0.5, 0.5, '#ffffff');
      return;
    }
    // Credits and The End
    const u = t - 64;
    sky(ctx, W, H, '#2b1d4a', '#6a3a7a');
    for (let i = 0; i < 14; i++) {
      const k = (u * 0.15 + hash(i)) % 1;
      heart(ctx, hash(i * 7) * W, H * (1.1 - k * 1.2), 8 + hash(i) * 10, '#ff9eb5', 0.6 * (1 - k));
    }
    const lines = [['Starring', 'Dr. Roji'], ['and', 'Homama, her biggest fan'], ['Popcorn by', 'Homama'], ['To be continued', 'every weekend']];
    lines.forEach(([a, b], i) => {
      const k = pulse(u, i * 1.4, 7.4, 0.4, 0.5);
      ctx.globalAlpha = k;
      text(ctx, a, W / 2, H * (0.16 + i * 0.17), H * 0.05, '#ffd1dc', { weight: 600 });
      text(ctx, b, W / 2, H * (0.235 + i * 0.17), H * 0.075, '#ffffff');
      ctx.globalAlpha = 1;
    });
    chibi(ctx, W * 0.14, H * 0.92, 1, R, { t, mood: 'happy', arm: 0.6 });
    chibi(ctx, W * 0.86, H * 0.92, 1, Hm, { t, mood: 'happy', arm: 0.6, dir: -1 });
    sceneFade(ctx, W, H, u, 8, 0.5, 0.9);
  },
  cues: [
    [8.6, 'line', 'us'],
    [20, 'lean'],
    [28, 'share'],
    [44, 'love'],
    [56.5, 'lean'],
    [64.4, 'kiss'],
    [68.8, 'rest'],
  ],
  music: (() => {
    const M = [];
    const bpm = 92;
    const C = [48, 60, 64, 67];
    const G = [43, 59, 62, 67];
    const Am = [45, 60, 64, 69];
    const F = [41, 60, 65, 69];
    chords(M, { at: 0.2, bpm, voice: 'pad', gain: 0.024, beats: 4, prog: [C, G, Am, F, C, G, F, C], bass: 'bass', bassGain: 0.05 });
    const song = [76, 76, 79, [77, 2], 76, 74, [72, 2], 0, 74, 76, 77, [79, 2], 77, 76, [74, 4], 76, 79, 84, [83, 2], 81, 79, [77, 2], 76, 74, 72, 74, [72, 4], 0];
    for (let r = 0; r < 4; r++) {
      const at = CH0 + r * 15.65;
      chords(M, { at, bpm, voice: r % 2 ? 'strings' : 'pad', gain: 0.02, beats: 4, prog: [C, G, Am, F, C, G, F, C, C, G], bass: 'bass', bassGain: 0.05 });
      melody(M, { at, bpm, voice: r % 2 ? 'bell' : 'musicbox', gain: 0.045, step: 1, notes: song });
    }
    return M;
  })(),
  sfx: [
    [0.6, 'chime'],
    [BOOK + 6, 'tada'],
    [64.2, 'twinkle'],
  ],
  // A thump for every stamp they have really collected
  extraSfx: (S = {}) => WEEKS.map((id, i) => (S.stamps || []).includes(id) && [BOOK + 1.15 + i * 0.8, 'thump', 0.8]).filter(Boolean),
};
