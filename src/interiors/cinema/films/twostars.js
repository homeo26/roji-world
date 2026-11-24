import { P, seg, ease, lerp, hash, pulse, sky, stars, cloud, sceneFade, titleCard, caption, theEnd, star5, heart, face, melody, chords } from './common.js';

// "Two Stars": two little stars far apart in the night sky build a bridge of tiny stars,
// a cloud gets in the way, and they finally meet over the sleepy sea town.

const PINK = '#ff8fb1';
const GOLD = '#ffd166';
const N = 14; // stars in the bridge
const arc = (u, W, H) => [lerp(W * 0.14, W * 0.86, u), H * 0.42 - Math.sin(u * P) * H * 0.14];

function starKid(ctx, x, y, r, col, halo, { mood = 'smile', glow = 1, rot = 0, look = 0 } = {}) {
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.6 * glow);
  g.addColorStop(0, halo);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 3 * glow, y - r * 3 * glow, r * 6 * glow, r * 6 * glow);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  star5(ctx, 0, 0, r, r * 0.56);
  ctx.fillStyle = col;
  ctx.lineJoin = 'round';
  ctx.lineWidth = r * 0.28;
  ctx.strokeStyle = col;
  ctx.stroke();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.25, -r * 0.35, r * 0.16, r * 0.1, -0.6, 0, P * 2);
  ctx.fill();
  ctx.rotate(-rot * 0.6);
  face(ctx, 0, r * 0.08, r / 15, mood, { look });
  ctx.restore();
}

function town(ctx, W, H, t, glow) {
  // Sea with star sparkles
  const sea = ctx.createLinearGradient(0, H * 0.78, 0, H);
  sea.addColorStop(0, '#2a2a6a');
  sea.addColorStop(1, '#171a44');
  ctx.fillStyle = sea;
  ctx.fillRect(-W, H * 0.8, W * 3, H * 0.4);
  ctx.fillStyle = 'rgba(255,240,200,0.55)';
  for (let i = 0; i < 22; i++) {
    const x = hash(i * 9.1) * W;
    const y = H * 0.83 + hash(i * 4.3) * H * 0.15;
    const w = 6 + Math.sin(t * 2 + i) * 4;
    ctx.fillRect(x - w / 2, y, w, 1.6);
  }
  // Rooftops on the shore
  ctx.fillStyle = '#231c4c';
  ctx.beginPath();
  ctx.moveTo(0, H * 0.82);
  let x = 0;
  let i = 0;
  while (x < W) {
    const w = 34 + hash(i) * 30;
    const h = H * (0.1 + hash(i * 2.7) * 0.08);
    ctx.lineTo(x, H * 0.82 - h);
    ctx.lineTo(x + w / 2, H * 0.82 - h - 14);
    ctx.lineTo(x + w, H * 0.82 - h);
    x += w;
    i++;
  }
  ctx.lineTo(W, H * 0.82);
  ctx.fill();
  // Lit windows: more come on after the stars meet
  x = 0;
  i = 0;
  while (x < W) {
    const w = 34 + hash(i) * 30;
    const h = H * (0.1 + hash(i * 2.7) * 0.08);
    for (let k = 0; k < 2; k++) {
      const on = hash(i * 5 + k) < 0.35 + glow * 0.6;
      if (!on) continue;
      ctx.fillStyle = `rgba(255,214,130,${0.55 + 0.35 * Math.sin(t * 1.5 + i + k)})`;
      ctx.fillRect(x + w * (0.25 + k * 0.32), H * 0.82 - h * 0.62, 6, 7);
    }
    x += w;
    i++;
  }
}

export default {
  id: 'twostars',
  title: 'Two Stars',
  genre: 'Romance',
  tag: 'A love story',
  blurb: 'Two little stars find each other across the night sky.',
  len: 60,
  trailer: 37,
  poster: {
    bg: ['#ff9fb8', '#c94f7a'],
    art(ctx, w, h) {
      const s = w / 256;
      ctx.fillStyle = 'rgba(255,246,220,0.8)';
      for (let i = 0; i < 18; i++) ctx.fillRect(hash(i) * w, hash(i * 3) * h * 0.6, 3 * s, 3 * s);
      starKid(ctx, w * 0.36, h * 0.4, 40 * s, PINK, 'rgba(255,255,255,0.5)', { mood: 'happy', rot: -0.15 });
      starKid(ctx, w * 0.64, h * 0.38, 40 * s, GOLD, 'rgba(255,255,255,0.5)', { mood: 'happy', rot: 0.15 });
      heart(ctx, w * 0.5, h * 0.22, 26 * s, '#ffffff', 0.9);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.setLineDash([3 * s, 6 * s]);
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(w * 0.08, h * 0.62);
      ctx.quadraticCurveTo(w * 0.5, h * 0.5, w * 0.92, h * 0.62);
      ctx.stroke();
      ctx.setLineDash([]);
    },
  },
  draw(ctx, W, H, t) {
    const zoom = 1 + 0.55 * ease(seg(t, 38.5, 42)) - 0.55 * ease(seg(t, 52, 55.5));
    const zy = H * 0.3;
    ctx.save();
    ctx.translate(W / 2, zy);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -zy);
    sky(ctx, W, H, '#151a4a', '#4a3277', '#2e2766');
    stars(ctx, W, H, t, { n: 60, seed: 3, top: 0.78 });
    // A little crescent moon
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(W * 0.3, H * 0.14, 16, 0, P * 2);
    ctx.fill();
    ctx.fillStyle = '#1d1f52';
    ctx.beginPath();
    ctx.arc(W * 0.3 + 7, H * 0.14 - 4, 14, 0, P * 2);
    ctx.fill();
    const met = seg(t, 42.4, 46);
    town(ctx, W, H, t, met);

    // Positions along the bridge
    const glide = ease(seg(t, 36, 40.6));
    const close = ease(seg(t, 40.6, 42.4));
    const up = ease(seg(t, 46, 54)) * H * 0.07;
    const pu = lerp(0, 0.42, glide) + close * 0.032;
    const gu = lerp(1, 0.58, glide) - close * 0.032;
    let [px, py] = arc(pu, W, H);
    let [gx, gy] = arc(gu, W, H);
    // Gentle float
    py += Math.sin(t * 1.6) * 3 - up;
    gy += Math.sin(t * 1.6 + 1.5) * 3 - up;
    if (t > 46) {
      // Twirl together once they have met
      const a = (t - 46) * 0.9;
      const cx = (px + gx) / 2;
      const cy = (py + gy) / 2;
      const d = 22;
      px = cx - Math.cos(a) * d;
      py = cy - Math.sin(a) * d * 0.4;
      gx = cx + Math.cos(a) * d;
      gy = cy + Math.sin(a) * d * 0.4;
    }

    // The bridge: dots appear from both ends, then the lines between them
    ctx.lineWidth = 1.6;
    const dotT = (i) => (i >= N / 2 ? 21.4 + (N - 1 - i) * 0.6 : 21.7 + (i - 1) * 0.6);
    const lines = seg(t, 26, 28);
    if (lines > 0) {
      ctx.strokeStyle = `rgba(255,240,210,${0.45 * lines})`;
      ctx.beginPath();
      for (let i = 1; i < N; i++) {
        const [x, y] = arc(i / N, W, H);
        if (i === 1) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 1; i < N; i++) {
      const k = seg(t, dotT(i), dotT(i) + 0.4);
      if (k <= 0) continue;
      const [x, y] = arc(i / N, W, H);
      const r = (2.2 + Math.sin(t * 3 + i) * 0.6) * (k < 1 ? 1 + (1 - k) * 2 : 1);
      ctx.fillStyle = i >= N / 2 ? '#fff0b8' : '#ffd6e2';
      ctx.globalAlpha = k;
      star5(ctx, x, y, r * 1.8, r * 0.8, t * 0.5 + i);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Moods
    const notice = t > 13.6;
    const worried = t > 31.5 && t < 34.6;
    const pMood = t < 13.6 ? (t > 7 ? 'sad' : 'smile') : worried ? 'sad' : t > 42.2 ? 'love' : t > 36 ? 'happy' : 'smile';
    const gMood = t < 14.6 ? (t > 7 ? 'sad' : 'smile') : t < 16 ? 'wow' : worried ? 'sad' : t > 42.2 ? 'love' : t > 36 ? 'happy' : 'smile';
    const pGlow = 1 + pulse(t, 13.6, 14.6, 0.2, 0.8) * 0.8 + pulse(t, 34, 35.6, 0.3, 1) * 1.6 + met * 0.5;
    const gGlow = 1 + pulse(t, 15, 15.8, 0.2, 0.6) * 0.5 + met * 0.5;
    const wave = t > 15.6 && t < 19 ? Math.sin(t * 9) * 0.25 : 0;
    starKid(ctx, px, py, 23, PINK, 'rgba(255,143,177,0.5)', { mood: pMood, glow: pGlow, rot: -0.1 + Math.sin(t) * 0.05, look: notice && t < 36 ? 1 : 0 });
    starKid(ctx, gx, gy, 23, GOLD, 'rgba(255,209,102,0.5)', { mood: gMood, glow: gGlow, rot: 0.1 + wave, look: notice && t < 36 ? -1 : 0 });
    // Twinkle rays when the pink star shines
    const tw = pulse(t, 13.6, 14.4, 0.15, 0.6) + pulse(t, 34, 35.4, 0.3, 0.8);
    if (tw > 0) {
      ctx.strokeStyle = `rgba(255,220,235,${Math.min(1, tw)})`;
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * P * 2 + t;
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a) * 30, py + Math.sin(a) * 30);
        ctx.lineTo(px + Math.cos(a) * (30 + 18 * tw), py + Math.sin(a) * (30 + 18 * tw));
        ctx.stroke();
      }
    }

    // Clouds drift in over the middle of the bridge, then part when the pink star shines
    const cin = ease(seg(t, 30.6, 32.6));
    const cout = ease(seg(t, 34.4, 36.6));
    if (cin > 0 && cout < 1) {
      for (let i = 0; i < 4; i++) {
        const side = i % 2 ? 1 : -1;
        const x = W * (0.5 + side * (0.06 + (i >> 1) * 0.07)) + side * cout * W * 0.5;
        const y = lerp(H * 1.1, H * (0.2 + (i >> 1) * 0.08), cin);
        cloud(ctx, x, y, 1.5 + (i >> 1) * 0.3, '#8a7fb8', 0.95);
        cloud(ctx, x + 6, y + 6, 1.2, '#a69ad0', 0.8);
      }
    }

    // The meeting: a burst, then a heart drawn in stars around them
    if (t > 42.4) {
      const b = seg(t, 42.4, 43.4);
      if (b < 1) {
        ctx.strokeStyle = `rgba(255,240,220,${1 - b})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc((px + gx) / 2, (py + gy) / 2, 10 + b * 70, 0, P * 2);
        ctx.stroke();
      }
      const cx = (px + gx) / 2;
      const cy = (py + gy) / 2 - 4;
      const hk = seg(t, 42.8, 45.2);
      const n = 30;
      for (let i = 0; i < n * hk; i++) {
        const a = (i / n) * P * 2;
        const hx = 16 * Math.pow(Math.sin(a), 3);
        const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
        ctx.fillStyle = i % 2 ? '#ffe3ec' : '#fff4c8';
        star5(ctx, cx + hx * 4.2, cy + hy * 3.6, 4 + Math.sin(t * 4 + i) * 1, 1.8, t + i);
        ctx.fill();
      }
      for (let i = 0; i < 5; i++) {
        const k = (t * 0.4 + i * 0.2) % 1;
        heart(ctx, cx + Math.sin(i * 2 + k * 5) * 26, cy - 10 - k * 50, 8 + i, i % 2 ? '#ff9eb5' : '#ffd1dc', (1 - k) * seg(t, 42.6, 43.6));
      }
    }
    // Shooting stars at the end
    for (const s0 of [47.5, 50.2, 52.4]) {
      const k = seg(t, s0, s0 + 1.1);
      if (k <= 0 || k >= 1) continue;
      const x = W * (0.85 - k * 0.6);
      const y = H * (0.06 + k * 0.16);
      const g = ctx.createLinearGradient(x, y, x + 60, y - 18);
      g.addColorStop(0, 'rgba(255,246,207,1)');
      g.addColorStop(1, 'rgba(255,246,207,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 60, y - 18);
      ctx.stroke();
    }

    ctx.restore();
    titleCard(ctx, W, H, t, 'Two Stars', { a: 0.6, b: 4.2, sub: 'A love story', color: '#e8507a' });
    caption(ctx, W, H, 'Two little stars lived far, far apart.', pulse(t, 6, 10.6, 0.4, 0.5));
    caption(ctx, W, H, 'One night, they saw each other twinkle.', pulse(t, 15, 19.4, 0.4, 0.5));
    caption(ctx, W, H, 'So they built a bridge of tiny stars.', pulse(t, 22, 26.4, 0.4, 0.5));
    caption(ctx, W, H, 'And they never shone apart again.', pulse(t, 47.4, 52.6, 0.4, 0.5));
    theEnd(ctx, W, H, pulse(t, 54.6, 59, 0.6, 0.6), '#ffe1ea', 0.64, 'rgba(120,40,80,0.6)');
    sceneFade(ctx, W, H, t, 60, 0.8, 1.0);
  },
  cues: [
    [8.5, 'lean'],
    [17, 'love'],
    [27.5, 'share'],
    [41.0, 'kiss'],
    [49, 'rest'],
  ],
  music: (() => {
    const M = [];
    const bpm = 72;
    const F = [53, 57, 60, 65];
    const Am = [52, 57, 60, 64];
    const Bb = [53, 58, 62, 65];
    const C = [52, 55, 60, 64];
    const Dm = [50, 53, 57, 62];
    const Gm = [50, 55, 58, 62];
    chords(M, { at: 0.2, bpm, voice: 'pad', gain: 0.022, beats: 3, prog: [F, Am, Bb, C, F], bass: 'bass', bassGain: 0.04 });
    const tune = [72, 77, 76, [72, 2], 69, 70, 74, 77, [76, 3], 77, 72, 69, [74, 2], 72, 70, 69, 67, [72, 3]];
    chords(M, { at: 12.7, bpm, voice: 'pad', gain: 0.02, beats: 3, prog: [F, Am, Bb, C, F, Dm, Bb, C], bass: 'bass', bassGain: 0.04 });
    melody(M, { at: 12.7, bpm, voice: 'musicbox', gain: 0.05, step: 1, hold: 1.2, notes: tune });
    // The cloud: a worried minor turn
    chords(M, { at: 31, bpm, voice: 'strings', gain: 0.016, beats: 3, prog: [Dm, Gm] });
    melody(M, { at: 31, bpm, voice: 'musicbox', gain: 0.04, step: 1, notes: [69, 0, 67, [65, 3]] });
    // Gliding to each other and the meeting: the tune again, an octave up with strings
    chords(M, { at: 36, bpm, voice: 'strings', gain: 0.018, beats: 3, prog: [F, Am, Bb, C, F, Dm, Bb, C], bass: 'bass', bassGain: 0.045 });
    melody(M, { at: 36, bpm, voice: 'bell', gain: 0.05, step: 1, hold: 1.3, notes: tune, transpose: 12 });
    chords(M, { at: 56, bpm, voice: 'pad', gain: 0.025, beats: 3, prog: [F] , bass: 'bass' });
    // The bridge: a rising note for every new little star
    for (let i = 1; i < N; i++) {
      const at = i >= N / 2 ? 21.4 + (N - 1 - i) * 0.6 : 21.7 + (i - 1) * 0.6;
      M.push([at, 'xylo', [84, 86, 88, 89, 91, 93, 96][Math.min(6, i >= N / 2 ? N - 1 - i : i - 1)], 0.5, 0.03]);
    }
    return M;
  })(),
  sfx: [
    [14, 'twinkle'],
    [30.8, 'wind', 0.8],
    [34.2, 'twinkle'],
    [42.35, 'kiss', 0.7],
    [42.45, 'chime'],
    [42.7, 'twinkle'],
    [47.6, 'whoosh', 0.3],
    [50.3, 'whoosh', 0.3],
  ],
};
