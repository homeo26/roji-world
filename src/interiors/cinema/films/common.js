import { FONT, heartPath } from '../../../places/school/kit.js';

// Drawing and music helpers shared by the short films on the big screen.
// Every film draws on a 640 x 302 canvas: draw(ctx, W, H, t) with t in seconds from the first frame.

export { FONT, heartPath };
export const P = Math.PI;
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = (x) => ((x = clamp01(x)), x * x * (3 - 2 * x));
export const seg = (t, a, b) => clamp01((t - a) / (b - a)); // progress of t through [a, b]
export const hash = (i) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const bounce = (x) => Math.abs(Math.sin(x * P));
export const wrap = (x, w) => ((x % w) + w) % w;

// A sharp in-and-out: 0 before a, rises over `rise`, holds, falls over `fall` after b.
export const pulse = (t, a, b, rise = 0.25, fall = 0.4) => Math.min(seg(t, a, a + rise), 1 - seg(t, b, b + fall));

export function sky(ctx, W, H, top, bottom, mid = null) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  if (mid) g.addColorStop(0.55, mid);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function stars(ctx, W, H, t, { n = 46, seed = 1, color = '#fff6cf', top = 0.75, size = 2.4 } = {}) {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const x = hash(i + seed) * W;
    const y = hash(i * 3.1 + seed) * H * top;
    ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * (1.2 + hash(i) * 2) + i));
    const s = size * (0.6 + hash(i * 7.7) * 0.8);
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}

export function cloud(ctx, x, y, s, color = '#ffffff', a = 1) {
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, 30 * s, 12 * s, 0, 0, P * 2);
  ctx.ellipse(x + 18 * s, y - 8 * s, 18 * s, 13 * s, 0, 0, P * 2);
  ctx.ellipse(x - 16 * s, y - 4 * s, 15 * s, 10 * s, 0, 0, P * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function fade(ctx, W, H, a, color = '#000000') {
  if (a <= 0.001) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}

// Fade in from black over the first `fin` seconds of a scene and out over its last `fout`.
export function sceneFade(ctx, W, H, u, len, fin = 0.5, fout = 0.5, color = '#000000') {
  fade(ctx, W, H, Math.max(u < fin ? 1 - u / fin : 0, u > len - fout ? (u - (len - fout)) / fout : 0), color);
}

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// Centre text that shrinks to fit maxW.
export function text(ctx, s, x, y, size, color, { weight = 700, maxW = 600, align = 'center', stroke = null, lw = 6 } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  const w = ctx.measureText(s).width;
  if (w > maxW) ctx.font = `${weight} ${Math.floor((size * maxW) / w)}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

// The opening title: a soft plate with the film name, fading in and out between a and b.
export function titleCard(ctx, W, H, t, title, { a = 0.4, b = 3.8, color = '#ef5b6f', plate = 'rgba(255,250,243,0.92)', sub = null, subColor = '#7a5a68' } = {}) {
  const k = pulse(t, a, b, 0.5, 0.6);
  if (k <= 0) return;
  ctx.globalAlpha = k;
  const pw = W * 0.56;
  const ph = sub ? H * 0.34 : H * 0.26;
  const y0 = H * 0.13 - (1 - k) * 8;
  ctx.fillStyle = plate;
  rr(ctx, (W - pw) / 2, y0, pw, ph, 24);
  ctx.fill();
  text(ctx, title, W / 2, y0 + (sub ? ph * 0.4 : ph * 0.53), H * 0.12, color, { maxW: pw * 0.88 });
  if (sub) text(ctx, sub, W / 2, y0 + ph * 0.77, H * 0.055, subColor, { weight: 600, maxW: pw * 0.8 });
  ctx.globalAlpha = 1;
}

// A caption on a dark band at the bottom of the screen.
export function caption(ctx, W, H, s, k) {
  if (k <= 0) return;
  ctx.globalAlpha = Math.min(1, k) * 0.82;
  ctx.fillStyle = '#1d1424';
  ctx.font = `600 ${H * 0.068}px ${FONT}`;
  const w = Math.min(W * 0.9, ctx.measureText(s).width + 40);
  rr(ctx, (W - w) / 2, H * 0.84, w, H * 0.12, 14);
  ctx.fill();
  ctx.globalAlpha = Math.min(1, k);
  text(ctx, s, W / 2, H * 0.9, H * 0.068, '#fff6e6', { weight: 600, maxW: W * 0.86 });
  ctx.globalAlpha = 1;
}

export function theEnd(ctx, W, H, k, color = '#fff6dc', y = 0.24, glow = 'rgba(0,0,0,0.25)') {
  if (k <= 0) return;
  ctx.globalAlpha = Math.min(1, k);
  text(ctx, 'The End', W / 2, H * y, H * 0.14, color, { stroke: glow, lw: 8 });
  ctx.globalAlpha = 1;
}

export function star5(ctx, x, y, R, r = R * 0.46, rot = 0, n = 5) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 ? r : R;
    const a = (i / (n * 2)) * P * 2 - P / 2 + rot;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
}

export function heart(ctx, x, y, s, color, a = 1) {
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  heartPath(ctx, x, y, s);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// Cute face: eyes and mouth around (x, y), s = scale. mood: happy | smile | sad | wow | scared | sleep | wink | love | grin
export function face(ctx, x, y, s, mood = 'smile', { ink = '#2b1b22', blush = 'rgba(255,120,150,0.55)', look = 0, gap = 9 } = {}) {
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.2 * s;
  const ex = gap * s;
  const lx = look * 2 * s;
  for (const sx of [-1, 1]) {
    const cx = x + sx * ex + lx;
    const cy = y - 2 * s;
    if (mood === 'sleep' || mood === 'happy' || (mood === 'wink' && sx > 0)) {
      ctx.beginPath();
      if (mood === 'sleep') ctx.arc(cx, cy - 1 * s, 3 * s, 0.15 * P, 0.85 * P);
      else ctx.arc(cx, cy + 1.5 * s, 3.2 * s, 1.15 * P, 1.85 * P);
      ctx.stroke();
    } else if (mood === 'love') {
      heartPath(ctx, cx, cy, 7 * s);
      ctx.fillStyle = '#ff5f86';
      ctx.fill();
      ctx.fillStyle = ink;
    } else {
      const r = mood === 'wow' || mood === 'scared' ? 3.4 * s : 2.7 * s;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.85, r * 1.15, 0, 0, P * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + r * 0.3, cy - r * 0.4, r * 0.32, 0, P * 2);
      ctx.fill();
      ctx.fillStyle = ink;
    }
  }
  ctx.beginPath();
  if (mood === 'sad') ctx.arc(x + lx, y + 8 * s, 3.5 * s, 1.15 * P, 1.85 * P);
  else if (mood === 'wow' || mood === 'scared') {
    ctx.ellipse(x + lx, y + 6 * s, 2.6 * s, 3.4 * s, 0, 0, P * 2);
    ctx.fill();
  } else if (mood === 'grin') {
    ctx.arc(x + lx, y + 3 * s, 5 * s, 0.1 * P, 0.9 * P);
    ctx.fill();
  } else ctx.arc(x + lx, y + 3 * s, 4 * s, 0.15 * P, 0.85 * P);
  if (mood !== 'wow' && mood !== 'scared' && mood !== 'grin') ctx.stroke();
  if (blush) {
    ctx.fillStyle = blush;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + sx * (ex + 6 * s) + lx, y + 4 * s, 3.6 * s, 2.4 * s, 0, 0, P * 2);
      ctx.fill();
    }
  }
}

// A short shake for jump scares and bumps.
export function shake(ctx, t, amt) {
  if (amt <= 0) return;
  ctx.translate(Math.sin(t * 71) * amt, Math.cos(t * 53) * amt);
}

// Film leader countdown before every film: a sepia circle wipe with 3, 2, 1.
export function leader(ctx, W, H, t) {
  const n = 3 - Math.floor(t);
  const u = t % 1;
  ctx.fillStyle = '#d9c3a0';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#b89c74';
  ctx.beginPath();
  ctx.moveTo(W / 2, H / 2);
  ctx.arc(W / 2, H / 2, W, -P / 2, -P / 2 + u * P * 2);
  ctx.fill();
  ctx.strokeStyle = '#3b2b22';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.lineWidth = 4;
  for (const r of [H * 0.36, H * 0.42]) {
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, r, 0, P * 2);
    ctx.stroke();
  }
  text(ctx, String(Math.max(1, n)), W / 2, H / 2 + 4, H * 0.46, '#2b1b16');
  // Dust and scratches
  ctx.fillStyle = 'rgba(40,25,20,0.5)';
  for (let i = 0; i < 6; i++) ctx.fillRect(hash(Math.floor(t * 12) + i) * W, hash(Math.floor(t * 12) * 3 + i) * H, 2, 2 + hash(i) * 5);
}

// ------------------------------------------------------------------ music
// Score events: [time s, voice, midi, duration s, gain]. Voices are synthesised in score.js.

// notes: midi numbers, 0 for a rest, or [midi, steps] for a longer note. step: beats per entry.
export function melody(out, { at, bpm, voice, gain = 0.06, step = 0.5, hold = 1.6, notes, transpose = 0 }) {
  const sb = 60 / bpm;
  let k = 0;
  for (const n of notes) {
    const [m, len] = Array.isArray(n) ? n : [n, 1];
    if (m) out.push([at + k * step * sb, voice, m + transpose, Math.max(0.12, len * step * sb * hold), gain]);
    k += len;
  }
  return at + k * step * sb;
}

// prog: chords (arrays of midi). Each chord lasts `beats`. style: 'block' | 'arp' | 'oom' (bass then chord)
export function chords(out, { at, bpm, voice, gain = 0.03, beats = 4, prog, style = 'block', bass = null, bassGain = 0.05 }) {
  const sb = 60 / bpm;
  let t = at;
  for (const c of prog) {
    if (style === 'block') for (const m of c) out.push([t, voice, m, beats * sb * 0.98, gain]);
    else if (style === 'arp') {
      const n = beats * 2;
      for (let i = 0; i < n; i++) out.push([t + i * sb * 0.5, voice, c[i % c.length] + (i >= c.length * 1 && i % 2 ? 12 : 0), sb * 0.9, gain]);
    } else if (style === 'oom') {
      for (let b = 0; b < beats; b++) {
        if (b % 2 === 0) out.push([t + b * sb, bass || voice, c[0] - 12, sb * 0.6, bassGain]);
        else for (const m of c.slice(1)) out.push([t + b * sb, voice, m, sb * 0.35, gain]);
      }
    }
    if (bass && style !== 'oom') out.push([t, bass, c[0] - 12, beats * sb * 0.95, bassGain]);
    t += beats * sb;
  }
  return t;
}

// Repeat a drum pattern: pattern is a string per beat-step, e.g. 'k.h.s.h.' (k kick, s snare, h hat, . rest)
export function drums(out, { at, bpm, bars = 1, pattern, step = 0.5, gain = 1 }) {
  const sb = 60 / bpm;
  const per = pattern.length;
  for (let b = 0; b < bars; b++)
    for (let i = 0; i < per; i++) {
      const c = pattern[i];
      const t = at + (b * per + i) * step * sb;
      if (c === 'k') out.push([t, 'kick', 36, 0.3, 0.2 * gain]);
      if (c === 's') out.push([t, 'snare', 40, 0.18, 0.09 * gain]);
      if (c === 'h') out.push([t, 'hat', 42, 0.05, 0.035 * gain]);
      if (c === 't') out.push([t, 'tom', 45, 0.35, 0.14 * gain]);
    }
  return at + bars * per * step * sb;
}
