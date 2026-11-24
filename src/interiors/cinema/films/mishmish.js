import { P, seg, ease, lerp, pulse, sceneFade, titleCard, caption, theEnd, text, heart, face, melody, chords, rr } from './common.js';

// "Mishmish and the Yarn": an orange cat wakes up from her nap and chases a pink ball of yarn
// round the living room, up the curtain and into a big tangle. The trail of yarn ends as a heart.

const ORANGE = '#f39a3d';
const STRIPE = '#d9772a';
const YARN = '#ff7fa3';

function cat(ctx, x, y, s, t, { pose = 'sit', mood = 'smile', dir = 1, stretch = 0, scarf = 0, dizzy = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  const run = pose === 'run';
  const sleep = pose === 'sleep';
  const hang = pose === 'hang';
  // Tail
  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = 7 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (sleep) {
    ctx.moveTo(18 * s, 10 * s);
    ctx.quadraticCurveTo(34 * s, 22 * s, 0, 24 * s);
  } else if (hang) {
    ctx.moveTo(0, 22 * s);
    ctx.quadraticCurveTo(14 * s, 40 * s + Math.sin(t * 4) * 4 * s, 4 * s, 52 * s);
  } else {
    ctx.moveTo(-20 * s, 6 * s);
    ctx.quadraticCurveTo(-40 * s, run ? -2 * s : 4 * s, -36 * s + Math.sin(t * 5) * 4 * s, run ? -18 * s : -16 * s);
  }
  ctx.stroke();
  // Legs while running
  ctx.fillStyle = '#fff4e6';
  if (run) {
    for (let i = 0; i < 4; i++) {
      const ph = t * 18 + i * P * 0.5;
      ctx.beginPath();
      ctx.ellipse((-14 + i * 9) * s + Math.sin(ph) * 5 * s, 18 * s, 4.5 * s, 3.5 * s, 0, 0, P * 2);
      ctx.fill();
    }
  }
  // Body
  ctx.fillStyle = ORANGE;
  ctx.beginPath();
  if (sleep) ctx.ellipse(0, 10 * s, 26 * s, 15 * s, 0, 0, P * 2);
  else if (run) ctx.ellipse(-2 * s, 6 * s, (26 + stretch * 8) * s, 13 * s, 0, 0, P * 2);
  else if (hang) ctx.ellipse(0, 10 * s, 14 * s, 20 * s, 0, 0, P * 2);
  else ctx.ellipse(-4 * s, 8 * s, 20 * s, 18 * s, 0, 0, P * 2);
  ctx.fill();
  ctx.strokeStyle = STRIPE;
  ctx.lineWidth = 3 * s;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    if (hang) {
      ctx.moveTo(-10 * s, (4 + i * 8) * s);
      ctx.lineTo(-2 * s, (6 + i * 8) * s);
    } else {
      ctx.moveTo((-12 + i * 8) * s, -6 * s + (sleep ? 6 * s : 0));
      ctx.lineTo((-14 + i * 8) * s, 2 * s + (sleep ? 6 * s : 0));
    }
    ctx.stroke();
  }
  // Paws
  ctx.fillStyle = '#fff4e6';
  if (!run && !sleep && !hang)
    for (const k of [0, 1]) {
      ctx.beginPath();
      ctx.ellipse((4 + k * 10) * s, 24 * s, 6 * s, 4 * s, 0, 0, P * 2);
      ctx.fill();
    }
  if (hang)
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(k * 10 * s, -24 * s, 5 * s, 5 * s, 0, 0, P * 2);
      ctx.fill();
    }
  // Head
  const hx = sleep ? 14 * s : run ? 24 * s : hang ? 0 : 10 * s;
  const hy = sleep ? 4 * s : run ? -6 * s : hang ? -12 * s : -14 * s;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.fillStyle = ORANGE;
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(k * 15 * s, -6 * s);
    ctx.lineTo(k * 13 * s, -24 * s);
    ctx.lineTo(k * 2 * s, -14 * s);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, 17 * s, 14 * s, 0, 0, P * 2);
  ctx.fill();
  ctx.fillStyle = '#ffc2d4';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(k * 12 * s, -9 * s);
    ctx.lineTo(k * 12 * s, -19 * s);
    ctx.lineTo(k * 5 * s, -13 * s);
    ctx.fill();
  }
  ctx.fillStyle = STRIPE;
  ctx.fillRect(-2 * s, -14 * s, 4 * s, 6 * s);
  ctx.fillStyle = '#fff4e6';
  ctx.beginPath();
  ctx.ellipse(0, 6 * s, 9 * s, 6 * s, 0, 0, P * 2);
  ctx.fill();
  face(ctx, 0, 0, s * 0.8, sleep ? 'sleep' : mood, { gap: 8 });
  ctx.fillStyle = '#ff8fa8';
  ctx.beginPath();
  ctx.moveTo(-2.5 * s, 3 * s);
  ctx.lineTo(2.5 * s, 3 * s);
  ctx.lineTo(0, 5.5 * s);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,50,30,0.5)';
  ctx.lineWidth = 1;
  for (const k of [-1, 1])
    for (const d of [-2, 2]) {
      ctx.beginPath();
      ctx.moveTo(k * 8 * s, 5 * s);
      ctx.lineTo(k * 22 * s, (4 + d) * s);
      ctx.stroke();
    }
  // Dizzy stars after bumping into the sofa
  if (dizzy > 0) {
    ctx.fillStyle = '#ffd166';
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + (i * P * 2) / 3;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 18 * s, -26 * s + Math.sin(a) * 5 * s, 3.5 * s * dizzy, 0, P * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  if (scarf > 0) {
    ctx.fillStyle = YARN;
    rr(ctx, hx - 15 * s, hy + 10 * s, 30 * s, 7 * s, 3 * s);
    ctx.fill();
    ctx.fillRect(hx + 6 * s, hy + 14 * s, 6 * s, 14 * s * scarf);
  }
  ctx.restore();
}

function yarnBall(ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = YARN;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, P * 2);
  ctx.fill();
  ctx.strokeStyle = '#e95b86';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.95, r * (0.3 + i * 0.18), i * 0.8, 0, P * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function room(ctx, W, H, t, rod) {
  ctx.fillStyle = '#cdeedd';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#bfe6d2';
  for (let i = 0; i < 20; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2) ctx.fillRect(i * 34, j * 34, 34, 34);
  // Window and curtain on its rod
  ctx.fillStyle = '#9fdcff';
  rr(ctx, W * 0.68, H * 0.14, 130, 100, 10);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(W * 0.68 + 62, H * 0.14, 6, 100);
  ctx.save();
  ctx.translate(W * 0.66, H * 0.1);
  ctx.rotate(rod);
  ctx.fillStyle = '#9b6a43';
  ctx.fillRect(0, -3, 170, 6);
  ctx.fillStyle = '#ffd166';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(4 + i * 10, 0);
    ctx.quadraticCurveTo(10 + i * 10, 60, 4 + i * 8, 124);
    ctx.lineTo(14 + i * 8, 124);
    ctx.quadraticCurveTo(18 + i * 10, 60, 14 + i * 10, 0);
    ctx.fill();
  }
  ctx.restore();
  // Floor and rug
  ctx.fillStyle = '#e8b98a';
  ctx.fillRect(0, H * 0.76, W, H * 0.24);
  ctx.fillStyle = '#c7a6ff';
  ctx.beginPath();
  ctx.ellipse(W * 0.5, H * 0.9, W * 0.32, H * 0.07, 0, 0, P * 2);
  ctx.fill();
  // Sofa on the left
  ctx.fillStyle = '#ef7a8a';
  rr(ctx, W * 0.06, H * 0.5, 170, 70, 18);
  ctx.fill();
  ctx.fillStyle = '#e05f72';
  rr(ctx, W * 0.06, H * 0.42, 170, 40, 16);
  ctx.fill();
  ctx.fillStyle = '#9b6a43';
  ctx.fillRect(W * 0.06 + 14, H * 0.5 + 66, 8, 12);
  ctx.fillRect(W * 0.06 + 148, H * 0.5 + 66, 8, 12);
  // A plant
  ctx.fillStyle = '#f2b880';
  ctx.fillRect(W * 0.92, H * 0.64, 26, 30);
  ctx.fillStyle = '#5aa84f';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(W * 0.92 + 13 + (i - 2) * 7, H * 0.58 - (i % 2) * 8, 6, 16, (i - 2) * 0.3, 0, P * 2);
    ctx.fill();
  }
}

export default {
  id: 'mishmish',
  title: 'Mishmish and the Yarn',
  genre: 'Cartoon',
  tag: 'For everyone',
  blurb: 'An orange cat called Mishmish chases a ball of yarn all round the house.',
  len: 50,
  trailer: 11,
  poster: {
    bg: ['#d8f3e6', '#7fd8bf'],
    art(ctx, w, h) {
      const s = w / 256;
      ctx.strokeStyle = YARN;
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.66);
      ctx.bezierCurveTo(w * 0.3, h * 0.5, w * 0.5, h * 0.75, w * 0.72, h * 0.58);
      ctx.stroke();
      cat(ctx, w * 0.42, h * 0.44, 2.6 * s, 0.4, { mood: 'happy' });
      yarnBall(ctx, w * 0.78, h * 0.56, 22 * s, 0.6);
    },
  },
  draw(ctx, W, H, t) {
    // The camera follows Mishmish up close, and pulls back for the curtain and the heart
    const wide = Math.max(pulse(t, 0, 4.2, 0.01, 1.2), pulse(t, 22.2, 32.4, 0.6, 0.8), pulse(t, 41.2, 50, 0.9, 0.1));
    const z = 1 + 0.34 * (1 - ease(wide));
    const follow = t < 10 ? 0.4 : t < 13.6 ? lerp(0.42, 0.26, seg(t, 10, 13.6)) : t < 18.4 ? 0.2 : t < 22.4 ? lerp(0.2, 0.66, ease(seg(t, 18.4, 22.4))) : t < 32.4 ? 0.7 : 0.5;
    const half = W / (2 * z);
    const cx = Math.min(W - half, Math.max(half, W * follow));
    ctx.save();
    ctx.translate(W / 2, H * 0.66);
    ctx.scale(z, z);
    ctx.translate(-cx, -H * 0.66);
    // The curtain rod tips when Mishmish swings on it
    const rod = pulse(t, 27.6, 31, 0.5, 1) * 0.28;
    room(ctx, W, H, t, rod);
    const fy = H * 0.8;
    // Her cushion
    ctx.fillStyle = '#8fd3ff';
    ctx.beginPath();
    ctx.ellipse(W * 0.4, fy + 6, 60, 14, 0, 0, P * 2);
    ctx.fill();

    // Yarn trail on the floor (it grows as the ball unrolls; at the end it is a heart)
    const trail = seg(t, 10, 32);
    if (t > 10 && t < 42) {
      ctx.strokeStyle = YARN;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W * 0.95, fy + 14);
      for (let i = 0; i <= 30 * trail; i++) {
        const u = i / 30;
        ctx.lineTo(W * (0.95 - u * 0.85 + Math.sin(u * 9) * 0.05), fy + 14 + Math.sin(u * 13) * 6);
      }
      ctx.stroke();
    }
    if (t > 42) {
      const k = seg(t, 42, 44.6);
      ctx.strokeStyle = YARN;
      ctx.lineWidth = 3;
      ctx.beginPath();
      const n = 60;
      for (let i = 0; i <= n * k; i++) {
        const a = (i / n) * P * 2;
        const hx = 16 * Math.pow(Math.sin(a), 3);
        const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
        ctx.lineTo(W * 0.5 + hx * 6, H * 0.64 + hy * 4.6);
      }
      ctx.stroke();
    }

    // The yarn ball
    let yx;
    let yy = fy;
    if (t < 7.5) yx = W * 1.2;
    else if (t < 9) yx = lerp(W * 1.1, W * 0.55, ease(seg(t, 7.5, 9)));
    else if (t < 14.5) yx = lerp(W * 0.55, W * 0.14, ease(seg(t, 10.4, 14.5)));
    else if (t < 18) yx = W * 0.14;
    else if (t < 23.5) yx = lerp(W * 0.3, W * 0.76, ease(seg(t, 18, 22.4)));
    else yx = W * 0.8;
    if (t >= 22.4 && t < 24) {
      const k = seg(t, 22.4, 23.5);
      yx = lerp(W * 0.76, W * 0.8, k);
      yy = lerp(fy, H * 0.1 + 4, ease(k)) - Math.sin(k * P) * 30;
    }
    if (t >= 24 && t < 32) yy = H * 0.1 + 4 + Math.sin(t * 3) * 2;
    const hideBall = (t > 14.5 && t < 18) || t > 32;
    if (!hideBall) yarnBall(ctx, yx, yy - 10, 10, -yx * 0.08);
    if (t >= 24 && t < 32) {
      ctx.strokeStyle = YARN;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(yx, yy);
      ctx.quadraticCurveTo(yx + 10, H * 0.5, yx - 6, fy + 10);
      ctx.stroke();
    }

    // Mishmish
    if (t < 10) {
      const wake = t > 9;
      cat(ctx, W * 0.4, fy - 12, 1.25, t, { pose: wake ? 'sit' : 'sleep', mood: wake ? 'wow' : 'sleep' });
      if (!wake)
        for (let i = 0; i < 3; i++) {
          const k = (t * 0.4 + i / 3) % 1;
          ctx.globalAlpha = 1 - k;
          text(ctx, 'z', W * 0.44 + k * 30 + i * 4, fy - 40 - k * 50, 14 + i * 4, '#6a5a8a');
          ctx.globalAlpha = 1;
        }
    } else if (t < 22.4) {
      // The chase: a pounce that misses, a slide into the sofa, then off to the right
      let x;
      let y = fy - 12;
      let pose = 'run';
      let dir = -1;
      let mood = 'grin';
      let dizzy = 0;
      if (t < 12.4) x = lerp(W * 0.4, W * 0.5, seg(t, 10, 12.4)) - seg(t, 10.4, 12.4) * W * 0.1;
      else if (t < 13.6) {
        const k = seg(t, 12.4, 13.6);
        x = lerp(W * 0.4, W * 0.24, k);
        y -= Math.sin(k * P) * 50;
        pose = 'run';
        mood = 'wow';
      } else if (t < 16.4) {
        x = lerp(W * 0.24, W * 0.13, ease(seg(t, 13.6, 16.4)));
        pose = 'run';
        mood = t > 15.4 ? 'scared' : 'wow';
      } else if (t < 18.4) {
        x = W * 0.16;
        pose = 'sit';
        mood = 'sad';
        dizzy = pulse(t, 16.4, 18.4, 0.1, 0.4);
        dir = 1;
      } else {
        x = lerp(W * 0.16, W * 0.68, ease(seg(t, 18.4, 22.4)));
        dir = 1;
      }
      cat(ctx, x, y, 1.25, t, { pose, dir, mood, stretch: pose === 'run' ? 1 : 0, dizzy });
      if (t > 16.4 && t < 17.2) text(ctx, 'BONK', W * 0.2, H * 0.32, H * 0.1, '#ffffff', { stroke: '#e05f72', lw: 7 });
    } else if (t < 32) {
      // Up the curtain, a swing on the rod and a drop onto the cushion
      let x = W * 0.78;
      let y;
      let pose = 'hang';
      let mood = 'grin';
      if (t < 24) {
        pose = 'sit';
        x = W * 0.72;
        y = fy - 12;
        mood = 'wow';
      } else if (t < 27.6) y = lerp(fy - 30, H * 0.36, ease(seg(t, 24, 27.6)));
      else if (t < 30.6) {
        y = H * 0.36 + seg(t, 27.6, 30.6) * 10;
        x = W * 0.78 + Math.sin((t - 27.6) * 4) * 22;
        mood = 'scared';
      } else {
        const k = ease(seg(t, 30.6, 31.6));
        pose = 'sit';
        x = lerp(W * 0.74, W * 0.42, k);
        y = lerp(H * 0.4, fy - 12, k) - Math.sin(k * P) * 30;
        mood = 'happy';
      }
      cat(ctx, x, y, 1.25, t, { pose, mood });
    } else if (t < 42) {
      // All tangled up in yarn, while a bird laughs at the window
      const wig = Math.sin(t * 8) * 3 * pulse(t, 33, 41, 0.5, 0.5);
      const x = W * 0.44 + wig;
      cat(ctx, x, fy - 12, 1.25, t, { pose: 'sit', mood: t < 36 ? 'wow' : t < 39 ? 'sad' : 'smile' });
      const wrap = ease(seg(t, 32.4, 35));
      ctx.strokeStyle = YARN;
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 16 * wrap; i++) {
        ctx.beginPath();
        ctx.ellipse(x - 4, fy - 6 - i * 1.4, 26 - Math.abs(i - 8) * 0.6, 8, 0.2 * Math.sin(i * 1.7), 0, P * 2);
        ctx.stroke();
      }
      // A little bird on the windowsill
      const bx = W * 0.74;
      const by = H * 0.46;
      ctx.fillStyle = '#6fb8ff';
      ctx.beginPath();
      ctx.ellipse(bx, by - Math.abs(Math.sin(t * 9)) * 3, 12, 10, 0, 0, P * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(bx - 10, by - 2);
      ctx.lineTo(bx - 18, by);
      ctx.lineTo(bx - 10, by + 2);
      ctx.fill();
      face(ctx, bx - 3, by - 2, 0.5, 'happy', { gap: 6 });
      if (t > 35 && t < 38) text(ctx, 'tweet hee hee', bx - 20, by - 26, H * 0.06, '#3f7bf0', { stroke: '#ffffff', lw: 5 });
    } else {
      // The heart of yarn and a sleepy, happy cat with a new scarf
      const k = ease(seg(t, 44, 45.6));
      cat(ctx, W * 0.5, lerp(fy - 12, H * 0.66, k), 1.25, t, { pose: t > 45.6 ? 'sleep' : 'sit', mood: 'happy', scarf: 1 });
      for (let i = 0; i < 3; i++) {
        const u = (t * 0.4 + i / 3) % 1;
        heart(ctx, W * 0.5 + 30 + Math.sin(u * 6 + i) * 10, H * 0.5 - u * 40, 9, '#ff8fa8', (1 - u) * seg(t, 45, 46));
      }
    }
    ctx.restore();
    titleCard(ctx, W, H, t, 'Mishmish and the Yarn', { a: 0.4, b: 4.2, color: '#e0702a', sub: 'A cartoon for everyone' });
    caption(ctx, W, H, 'Mishmish loves her naps...', pulse(t, 4.6, 7.4, 0.3, 0.4));
    caption(ctx, W, H, '...and yarn even more.', pulse(t, 10, 12.4, 0.3, 0.4));
    theEnd(ctx, W, H, pulse(t, 46.2, 49.4, 0.5, 0.5), '#e0702a', 0.16, '#ffffff');
    sceneFade(ctx, W, H, t, 50, 0.6, 0.6);
  },
  cues: [
    [6, 'lean'],
    [12.6, 'share'],
    [16.8, 'joke', 'slide'],
    [29, 'laugh'],
    [35.6, 'joke', 'tangle'],
    [43, 'love'],
  ],
  music: (() => {
    const M = [];
    const G = [43, 59, 62, 67];
    const C = [48, 60, 64, 67];
    const D = [50, 57, 62, 66];
    const Em = [52, 59, 64, 67];
    // Lullaby for the nap
    chords(M, { at: 0.3, bpm: 76, voice: 'pad', gain: 0.022, beats: 4, prog: [G, C, D], bass: 'bass', bassGain: 0.045 });
    melody(M, { at: 0.3, bpm: 76, voice: 'musicbox', gain: 0.045, step: 1, notes: [79, 78, 76, [74, 2], 76, [79, 2], 81, 79, [74, 3]] });
    // The chase
    const bpm = 138;
    chords(M, { at: 9.8, bpm, voice: 'pizz', bass: 'bass', gain: 0.03, bassGain: 0.06, beats: 4, prog: [G, C, D, G, Em, C, D, G, G, C, D, G, Em, C, D, G], style: 'oom' });
    const run = [79, 81, 83, 0, 83, 81, 79, 76, 74, 76, 79, 0, 81, 0, 79, 0, 76, 78, 79, 81, 83, 86, 83, 79, [81, 2], 0, 0, 0, 0, 0, 0];
    melody(M, { at: 9.8, bpm, voice: 'xylo', gain: 0.045, step: 0.5, notes: [...run, ...run, ...run, ...run] });
    // The tangle: a slow, silly trombone
    melody(M, { at: 33, bpm: 90, voice: 'brass', gain: 0.03, step: 1, notes: [67, 66, 65, [64, 2], 0, 62, 64, 65, [67, 3]] });
    chords(M, { at: 33, bpm: 90, voice: 'pad', gain: 0.02, beats: 4, prog: [C, D, G] });
    // The heart and the nap
    chords(M, { at: 42, bpm: 76, voice: 'pad', gain: 0.024, beats: 4, prog: [G, C, D, G], bass: 'bass', bassGain: 0.045 });
    melody(M, { at: 42, bpm: 76, voice: 'musicbox', gain: 0.045, step: 1, notes: [79, 78, 76, [74, 2], 76, [79, 2], 83, 81, [79, 4]] });
    return M;
  })(),
  sfx: [
    [1.5, 'purr', 0.8],
    [4.6, 'purr', 0.8],
    [7.6, 'yawn'],
    [9, 'pop'],
    [9.2, 'meow'],
    [13.4, 'swish'],
    [15.8, 'whoosh', 0.6],
    [16.4, 'thump'],
    [16.5, 'boing', 0.6],
    [22.6, 'swish'],
    [23.4, 'pop'],
    [27.8, 'creak', 0.6],
    [30.6, 'boing'],
    [32.6, 'swish'],
    [35.2, 'tweet'],
    [36.2, 'tweet'],
    [37.4, 'meow', 0.7],
    [42.2, 'twinkle'],
    [45.8, 'purr'],
    [47.8, 'purr'],
  ],
};
