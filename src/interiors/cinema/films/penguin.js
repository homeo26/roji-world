import { P, seg, ease, lerp, hash, pulse, sceneFade, titleCard, caption, theEnd, text, heart, face, shake, melody, chords, rr } from './common.js';

// "Chef Penguin": a penguin in a chef hat tries to make pancakes in his igloo kitchen.
// The egg cracks on his head, a pancake sticks to the ceiling, one burns, one lands on his head...

function penguin(ctx, x, y, s, { t = 0, mood = 'smile', waddle = 0, flap = 0, hat = true, bow = false, egg = 0, cake = 0, look = 0, dir = 1, sweat = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y - Math.abs(Math.sin(t * 10)) * 3 * s * waddle);
  ctx.rotate(Math.sin(t * 10) * 0.08 * waddle);
  ctx.scale(dir, 1);
  // Feet
  ctx.fillStyle = '#ff9a3a';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(k * 9 * s, 28 * s, 8 * s, 4 * s, 0, 0, P * 2);
    ctx.fill();
  }
  // Flippers
  ctx.fillStyle = '#2d3047';
  for (const k of [-1, 1]) {
    ctx.save();
    ctx.translate(k * 19 * s, -2 * s);
    ctx.rotate(k * (0.25 + flap * (0.9 + Math.sin(t * 22) * 0.4)));
    ctx.beginPath();
    ctx.ellipse(0, 10 * s, 6 * s, 15 * s, 0, 0, P * 2);
    ctx.fill();
    ctx.restore();
  }
  // Body, belly and face patch
  ctx.beginPath();
  ctx.ellipse(0, 4 * s, 21 * s, 26 * s, 0, 0, P * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, 10 * s, 14 * s, 18 * s, 0, 0, P * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-6 * s, -12 * s, 8 * s, 8 * s, 0, 0, P * 2);
  ctx.ellipse(6 * s, -12 * s, 8 * s, 8 * s, 0, 0, P * 2);
  ctx.fill();
  face(ctx, 0, -12 * s, s * 0.7, mood, { gap: 8, look });
  // Beak
  ctx.fillStyle = '#ff9a3a';
  ctx.beginPath();
  ctx.moveTo(-5 * s, -7 * s);
  ctx.lineTo(5 * s, -7 * s);
  ctx.lineTo(0, -1 * s);
  ctx.fill();
  if (sweat > 0) {
    ctx.fillStyle = `rgba(140,200,255,${sweat})`;
    ctx.beginPath();
    ctx.ellipse(16 * s, -22 * s, 3 * s, 4.5 * s, 0, 0, P * 2);
    ctx.fill();
  }
  // Egg yolk dripping down the head
  if (egg > 0) {
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath();
    ctx.ellipse(-4 * s, -24 * s, 9 * s, 4 * s, 0, 0, P * 2);
    ctx.fill();
    ctx.fillRect(2 * s, -24 * s, 3 * s, 6 * s * egg);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-8 * s, -26 * s, 6 * s, 3 * s, 0.3, 0, P * 2);
    ctx.fill();
  }
  // Chef hat
  if (hat) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-12 * s, -36 * s, 24 * s, 9 * s);
    ctx.beginPath();
    for (const [cx, cy, r] of [[-9, -42, 8], [0, -46, 10], [9, -42, 8]]) ctx.arc(cx * s, cy * s, r * s, 0, P * 2);
    ctx.fill();
    ctx.fillStyle = '#e6eef5';
    ctx.fillRect(-12 * s, -30 * s, 24 * s, 3 * s);
  }
  if (bow) {
    ctx.fillStyle = '#ff7fa3';
    ctx.beginPath();
    ctx.moveTo(8 * s, -30 * s);
    ctx.lineTo(18 * s, -36 * s);
    ctx.lineTo(18 * s, -24 * s);
    ctx.closePath();
    ctx.moveTo(8 * s, -30 * s);
    ctx.lineTo(-2 * s, -36 * s);
    ctx.lineTo(-2 * s, -24 * s);
    ctx.fill();
  }
  // A pancake worn like a hat
  if (cake > 0) pancake(ctx, 0, (hat ? -56 : -30) * s, s * 1.1, 0);
  ctx.restore();
}

function pancake(ctx, x, y, s, burnt = 0, tilt = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.fillStyle = burnt > 0.5 ? '#3a2a24' : '#d98a3a';
  ctx.beginPath();
  ctx.ellipse(0, 2 * s, 20 * s, 6 * s, 0, 0, P * 2);
  ctx.fill();
  ctx.fillStyle = burnt > 0.5 ? '#4a3a32' : burnt > 0.2 ? '#b86a2a' : '#f2b860';
  ctx.beginPath();
  ctx.ellipse(0, 0, 19 * s, 5 * s, 0, 0, P * 2);
  ctx.fill();
  ctx.restore();
}

function smoke(ctx, x, y, t, k, dark = 0) {
  for (let i = 0; i < 7; i++) {
    const u = (t * 0.6 + i / 7) % 1;
    ctx.globalAlpha = (1 - u) * k * 0.8;
    ctx.fillStyle = dark ? '#5a5a66' : '#c9ccd6';
    ctx.beginPath();
    ctx.arc(x + Math.sin(u * 6 + i) * 10, y - u * 90, 8 + u * 18, 0, P * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function kitchen(ctx, W, H, t, alarm) {
  ctx.fillStyle = '#cdeefb';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(120,180,210,0.35)';
  ctx.lineWidth = 2;
  for (let r = 0; r < 5; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * 42 + 10);
    ctx.lineTo(W, r * 42 + 10);
    ctx.stroke();
    for (let c = 0; c < 9; c++) {
      ctx.beginPath();
      ctx.moveTo(c * 80 + (r % 2) * 40, r * 42 + 10);
      ctx.lineTo(c * 80 + (r % 2) * 40, r * 42 + 52);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#9fd3ea';
  ctx.fillRect(0, H * 0.8, W, H * 0.2);
  // Window with falling snow
  ctx.fillStyle = '#6fa8d8';
  rr(ctx, W * 0.76, H * 0.12, 110, 80, 40);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 14; i++) {
    const sx = W * 0.76 + 10 + hash(i) * 90;
    const sy = H * 0.12 + ((hash(i * 3) * 80 + t * 18) % 76) + 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 2, 0, P * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  rr(ctx, W * 0.76, H * 0.12, 110, 80, 40);
  ctx.stroke();
  // Shelf with fish jars
  ctx.fillStyle = '#c98a5a';
  ctx.fillRect(W * 0.04, H * 0.34, 130, 6);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = 'rgba(220,245,255,0.8)';
    rr(ctx, W * 0.05 + i * 42, H * 0.34 - 36, 30, 36, 6);
    ctx.fill();
    ctx.fillStyle = ['#ff9a5a', '#8fd3ff', '#ffd166'][i];
    ctx.beginPath();
    ctx.ellipse(W * 0.05 + i * 42 + 15, H * 0.34 - 16, 9, 5, 0, 0, P * 2);
    ctx.fill();
  }
  // Smoke alarm on the ceiling
  ctx.fillStyle = '#f3f3f3';
  ctx.beginPath();
  ctx.ellipse(W * 0.3, 6, 16, 8, 0, 0, P);
  ctx.fill();
  ctx.fillStyle = alarm && Math.sin(t * 20) > 0 ? '#ff3a3a' : '#c94a4a';
  ctx.beginPath();
  ctx.arc(W * 0.3, 8, 3, 0, P * 2);
  ctx.fill();
  // Stove
  ctx.fillStyle = '#e5484d';
  rr(ctx, W * 0.42, H * 0.6, 130, H * 0.22, 10);
  ctx.fill();
  ctx.fillStyle = '#3b2b3f';
  ctx.fillRect(W * 0.42, H * 0.6, 130, 8);
  ctx.fillStyle = '#ffd166';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(W * 0.42 + 30 + i * 35, H * 0.74, 5, 0, P * 2);
    ctx.fill();
  }
}

// The frying pan, and where it sits.
const PAN = [0.52, 0.58];
function pan(ctx, W, H, tilt = 0) {
  ctx.save();
  ctx.translate(W * PAN[0], H * PAN[1]);
  ctx.rotate(tilt);
  ctx.fillStyle = '#4a4a5a';
  ctx.fillRect(22, -4, 46, 7);
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 8, 0, 0, P * 2);
  ctx.fill();
  ctx.fillStyle = '#2a2a36';
  ctx.beginPath();
  ctx.ellipse(0, -2, 26, 5, 0, 0, P * 2);
  ctx.fill();
  ctx.restore();
}

export default {
  id: 'penguin',
  title: 'Chef Penguin',
  genre: 'Comedy',
  tag: 'A breakfast comedy',
  blurb: 'A penguin chef tries to make pancakes. The ceiling gets breakfast first.',
  len: 56,
  trailer: 13,
  poster: {
    bg: ['#bfe9ff', '#6fb8ff'],
    art(ctx, w, h) {
      const s = w / 256;
      for (let i = 0; i < 4; i++) pancake(ctx, w * 0.5, h * 0.64 - i * 10 * s, 2.2 * s, 0);
      penguin(ctx, w * 0.5, h * 0.4, 2.0 * s, { mood: 'grin', flap: 0.4 });
      heart(ctx, w * 0.5, h * 0.58, 16 * s, '#ff5f86');
    },
  },
  draw(ctx, W, H, t) {
    const alarm = (t > 23.4 && t < 27) || (t > 46.8 && t < 50);
    ctx.save();
    shake(ctx, t, pulse(t, 15.2, 15.4, 0.02, 0.5) * 4 + pulse(t, 30.5, 30.7, 0.02, 0.4) * 3);
    // The camera is close in, and pulls back whenever something happens up at the ceiling
    const wide = Math.max(pulse(t, 0, 4.2, 0.01, 1.2), pulse(t, 14.1, 18.4, 0.5, 0.9), pulse(t, 22.8, 26.8, 0.5, 0.7), pulse(t, 28.7, 31, 0.4, 0.7), pulse(t, 35.9, 37.6, 0.4, 0.7), pulse(t, 41, 56, 1, 0.1));
    const z = 1 + 0.32 * (1 - ease(wide));
    ctx.translate(W * 0.47, H * 0.64);
    ctx.scale(z, z);
    ctx.translate(-W * 0.47, -H * 0.64);
    kitchen(ctx, W, H, t, alarm);
    const px = W * PAN[0];
    const py = H * PAN[1];
    // Pancake 1 flies up and sticks to the ceiling until 36.6, then drops onto the plate
    const flip = (t >= 14.5 && t < 15.3) || (t >= 29 && t < 29.5);
    pan(ctx, W, H, flip ? -0.35 : 0);
    if (t > 11.6 && t < 14.5) pancake(ctx, px, py - 5, 0.95, 0);
    if (t >= 14.5 && t < 15.3) {
      const k = seg(t, 14.5, 15.3);
      pancake(ctx, lerp(px, W * 0.44, k), lerp(py - 4, 12, ease(k)), 1, 0, k * 6);
    }
    const stuck = t >= 15.3 && t < 36.6;
    // Pancake 2 burns
    const burn = seg(t, 20.5, 24);
    if (t > 19.6 && t < 27) pancake(ctx, px, py - 5, 0.95, burn);
    if (t > 21.4 && t < 28) smoke(ctx, px, py - 10, t, Math.min(1, seg(t, 21.4, 22.4), 1 - seg(t, 26.4, 28)), burn > 0.6);
    // Pancake 3 flies too high and lands on his head
    if (t > 27.6 && t < 29) pancake(ctx, px, py - 5, 0.95, 0);
    const onHead = t >= 30.6;
    if (t >= 29 && t < 30.6) {
      const k = seg(t, 29, 30.6);
      const y = k < 0.5 ? lerp(py, -40, ease(k * 2)) : lerp(-40, H * 0.38, ease((k - 0.5) * 2));
      pancake(ctx, lerp(px, W * 0.38, k), y, 1, 0, k * 9);
    }
    if (stuck) {
      pancake(ctx, W * 0.44, 10, 1, 0);
      ctx.fillStyle = '#f2b860';
      ctx.fillRect(W * 0.44 - 3, 14, 6, 6 + Math.sin(t * 2) * 2);
    }
    // The plate and the falling pancake
    const plate = t > 34.6;
    const drop = seg(t, 36.6, 37.3);
    const px2 = W * 0.36;
    if (plate && t < 52) {
      if (t < 37.3 && t > 36.6) pancake(ctx, W * 0.44 - (W * 0.44 - px2) * drop, lerp(10, H * 0.54, drop * drop), 1, 0, drop * 2);
    }
    // The penguin chef
    let x = lerp(-W * 0.1, W * 0.38, ease(seg(t, 0.6, 4.6)));
    const mood =
      t < 7.4 ? 'happy' : t < 9.6 ? 'wow' : t < 14.6 ? 'smile' : t < 18.4 ? (t < 16.2 ? 'wow' : 'sad') : t < 21.5 ? 'happy' : t < 27 ? (t < 23 ? 'wow' : 'scared') : t < 30.6 ? 'smile' : t < 34 ? 'grin' : t < 36.6 ? 'smile' : t < 46.6 ? 'happy' : t < 48 ? 'wow' : 'grin';
    const towel = t > 24 && t < 27;
    const cakeStack = t > 37.3;
    penguin(ctx, x, H * 0.62, 1.5, {
      t,
      mood,
      waddle: t < 4.6 ? 1 : 0,
      flap: towel ? 1 : pulse(t, 15.4, 17, 0.1, 0.4) * 0.6 + pulse(t, 47, 50, 0.2, 0.4),
      egg: t > 7.4 && t < 34 ? Math.min(1, (t - 7.4) * 0.5) : 0,
      cake: onHead && t < 38.6 ? 1 : 0,
      look: stuck && t < 18.4 ? 0 : 0,
      sweat: pulse(t, 23, 27, 0.2, 0.5),
    });
    if (towel) {
      ctx.fillStyle = '#ff9eb5';
      ctx.save();
      ctx.translate(x + 30, H * 0.4);
      ctx.rotate(Math.sin(t * 22) * 0.6);
      ctx.fillRect(-4, -26, 22, 30);
      ctx.restore();
    }
    // Egg cracking on his head
    if (t > 5.8 && t < 7.6) {
      const k = seg(t, 5.8, 7.4);
      ctx.fillStyle = '#fff6e6';
      ctx.beginPath();
      ctx.ellipse(x + 24 - k * 20, H * 0.4 - Math.sin(k * P * 3) * 8, 7, 9, 0, 0, P * 2);
      ctx.fill();
    }
    // Whisking: a bowl in his flippers
    if (t > 8.4 && t < 11.4) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x + 26, H * 0.66, 16, 9, 0, 0, P);
      ctx.fill();
      ctx.strokeStyle = '#9aa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 26 + Math.sin(t * 25) * 6, H * 0.62);
      ctx.lineTo(x + 34, H * 0.5);
      ctx.stroke();
    }
    // The plate with the stack
    if (plate && t < 56) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(px2 + 40, H * 0.79, 30, 7, 0, 0, P * 2);
      ctx.fill();
      ctx.fillStyle = '#d9e6ee';
      ctx.beginPath();
      ctx.ellipse(px2 + 40, H * 0.79, 22, 4, 0, 0, P * 2);
      ctx.fill();
      if (cakeStack) {
        const n = t > 38.6 ? 3 : 2;
        for (let i = 0; i < n; i++) pancake(ctx, px2 + 40, H * 0.765 - i * 7, 1, 0);
        if (t > 39.4) heart(ctx, px2 + 40, H * 0.735 - n * 7 + 8, 12, '#e5484d', seg(t, 39.4, 40));
      }
    }
    // His friend arrives for breakfast
    if (t > 39.6) {
      const k = ease(seg(t, 39.6, 42));
      penguin(ctx, lerp(W * 1.1, W * 0.78, k), H * 0.64, 1.3, { t, mood: t > 46.6 && t < 48 ? 'wow' : t > 48 ? 'grin' : 'happy', waddle: t < 42 ? 1 : 0, hat: false, bow: true, dir: -1, flap: pulse(t, 47, 50, 0.2, 0.4) });
      if (t > 42.5 && t < 46.4) for (let i = 0; i < 3; i++) {
        const u = ((t - 42.5) * 0.45 + i * 0.33) % 1;
        heart(ctx, W * 0.6 + Math.sin(u * 6 + i) * 14, H * 0.42 - u * 50, 10, '#ff8fa8', 1 - u);
      }
    }
    // The toaster pops burnt toast
    if (t > 44) {
      const tx = W * 0.62;
      ctx.fillStyle = '#c9ccd6';
      rr(ctx, tx, H * 0.48, 44, 30, 8);
      ctx.fill();
      const up = pulse(t, 46.5, 56, 0.25, 0.1);
      ctx.fillStyle = '#2e221e';
      for (const d of [8, 24]) ctx.fillRect(tx + d, H * 0.48 - up * 20, 12, 16);
      if (t > 46.5) smoke(ctx, tx + 22, H * 0.44, t, Math.min(1, seg(t, 46.5, 47.2), 1 - seg(t, 50, 52)), true);
    }
    ctx.restore();
    titleCard(ctx, W, H, t, 'Chef Penguin', { a: 0.4, b: 4.2, color: '#3f7bf0', sub: 'Breakfast is coming' });
    caption(ctx, W, H, 'Step one: crack the egg.', pulse(t, 5.2, 7.6, 0.3, 0.3));
    caption(ctx, W, H, 'Step two: flip the pancake.', pulse(t, 12, 14.4, 0.3, 0.3));
    caption(ctx, W, H, 'Step three: do not burn it.', pulse(t, 19.6, 22, 0.3, 0.3));
    caption(ctx, W, H, 'Breakfast for two!', pulse(t, 40.6, 44.6, 0.3, 0.3));
    if (t > 23.6 && t < 26.8) text(ctx, 'BEEP BEEP', W * 0.3, H * 0.14, H * 0.08, '#e5484d', { stroke: '#ffffff', lw: 6 });
    if (t > 46.8 && t < 49.4) text(ctx, 'BEEP', W * 0.3, H * 0.14, H * 0.08, '#e5484d', { stroke: '#ffffff', lw: 6 });
    theEnd(ctx, W, H, pulse(t, 51.6, 55.4, 0.5, 0.5), '#3f7bf0', 0.24, '#ffffff');
    sceneFade(ctx, W, H, t, 56, 0.6, 0.8);
  },
  cues: [
    [8.1, 'joke', 'egg'],
    [16.2, 'joke', 'ceiling'],
    [21, 'share'],
    [25, 'joke', 'smoke'],
    [31, 'laugh'],
    [38.4, 'lean'],
    [42.6, 'love'],
    [47.4, 'joke', 'toast'],
  ],
  music: (() => {
    const M = [];
    const bpm = 126;
    const C = [48, 64, 67];
    const F = [53, 65, 69];
    const G = [55, 62, 67];
    const Am = [45, 64, 69];
    chords(M, { at: 0.3, bpm, voice: 'pizz', bass: 'bass', gain: 0.03, bassGain: 0.06, beats: 4, prog: [C, C, F, G, C, F, G, C, C, F, G, C], style: 'oom' });
    const bop = [72, 0, 76, 79, 77, 76, 74, 0, 72, 74, 76, 72, [67, 2], 0, 0, 69, 0, 72, 77, 76, 74, 72, 0, 71, 72, 74, 71, [72, 2], 0, 0];
    melody(M, { at: 0.3, bpm, voice: 'xylo', gain: 0.045, step: 0.5, notes: bop });
    melody(M, { at: 8, bpm, voice: 'xylo', gain: 0.04, step: 0.5, notes: bop, transpose: 5 });
    // Sad trombones after the flops
    melody(M, { at: 16.4, bpm: 100, voice: 'brass', gain: 0.03, step: 1, notes: [67, 66, 65, [64, 3]] });
    melody(M, { at: 25.4, bpm: 100, voice: 'brass', gain: 0.03, step: 1, notes: [62, 61, 60, [59, 3]] });
    chords(M, { at: 30.6, bpm, voice: 'pizz', bass: 'bass', gain: 0.03, bassGain: 0.06, beats: 4, prog: [C, F, G, C, Am, F, G, C, C, F, G, C, F, G, C, C], style: 'oom' });
    melody(M, { at: 30.6, bpm, voice: 'xylo', gain: 0.045, step: 0.5, notes: [...bop, ...bop] });
    melody(M, { at: 38, bpm, voice: 'whistle', gain: 0.03, step: 1, notes: [76, 77, 79, [84, 2], 81, 79, [77, 2], 76, 74, [72, 4]] });
    M.push([52, 'xylo', 84, 0.6, 0.05], [52.2, 'xylo', 79, 0.6, 0.05], [52.4, 'xylo', 72, 0.9, 0.05]);
    return M;
  })(),
  sfx: [
    [6.9, 'crack'],
    [7.4, 'splat', 0.4],
    [8.6, 'whisk'],
    [9.5, 'whisk'],
    [11.8, 'sizzle'],
    [14.5, 'swish'],
    [15.3, 'splat'],
    [19.8, 'sizzle'],
    [21.4, 'sizzle'],
    [23.4, 'beep'],
    [24.3, 'beep'],
    [25.2, 'beep'],
    [27.8, 'sizzle', 0.7],
    [29, 'swish'],
    [29.6, 'fall'],
    [30.6, 'boing'],
    [36.6, 'fall', 0.6],
    [37.2, 'splat', 0.5],
    [37.5, 'tada'],
    [46.5, 'pop'],
    [46.6, 'boing', 0.6],
    [47, 'beep'],
    [48, 'beep', 0.7],
  ],
};
