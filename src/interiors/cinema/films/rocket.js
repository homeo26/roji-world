import { P, seg, ease, lerp, hash, wrap, pulse, sky, stars, cloud, sceneFade, titleCard, caption, theEnd, text, heart, face, shake, melody, chords, drums } from './common.js';
import { bunny } from '../models.js';

// "Island Rocket": a paper rocket lifts off from a tiny island, dodges seagulls and asteroids,
// plants a heart flag on the moon, glows hot coming home, and splashes down as a paper boat.

function rocket(ctx, x, y, s, t, { rot = 0, flame = 0, scorch = 0, mood = 'smile' } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (flame > 0) {
    const f = flame * (1 + Math.sin(t * 40) * 0.15);
    ctx.fillStyle = '#ff8a3a';
    ctx.beginPath();
    ctx.moveTo(-9 * s, 30 * s);
    ctx.quadraticCurveTo(0, (30 + 40 * f) * s, 9 * s, 30 * s);
    ctx.fill();
    ctx.fillStyle = '#ffe27a';
    ctx.beginPath();
    ctx.moveTo(-5 * s, 30 * s);
    ctx.quadraticCurveTo(0, (30 + 24 * f) * s, 5 * s, 30 * s);
    ctx.fill();
  }
  // Fins
  ctx.fillStyle = '#ff7fa3';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(k * 12 * s, 8 * s);
    ctx.lineTo(k * 26 * s, 32 * s);
    ctx.lineTo(k * 10 * s, 28 * s);
    ctx.fill();
  }
  // Paper body with fold lines
  const body = scorch > 0 ? `rgb(${255 - scorch * 20},${250 - scorch * 110},${240 - scorch * 170})` : '#fffaf2';
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -40 * s);
  ctx.quadraticCurveTo(16 * s, -20 * s, 13 * s, 30 * s);
  ctx.lineTo(-13 * s, 30 * s);
  ctx.quadraticCurveTo(-16 * s, -20 * s, 0, -40 * s);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,140,160,0.6)';
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.moveTo(0, -40 * s);
  ctx.lineTo(0, 30 * s);
  ctx.moveTo(-12 * s, 12 * s);
  ctx.lineTo(0, 4 * s);
  ctx.lineTo(12 * s, 12 * s);
  ctx.stroke();
  // Window with a heart, and a little face
  ctx.fillStyle = '#8fd3ff';
  ctx.beginPath();
  ctx.arc(0, -14 * s, 8 * s, 0, P * 2);
  ctx.fill();
  ctx.strokeStyle = '#3f7bf0';
  ctx.lineWidth = 2 * s;
  ctx.stroke();
  heart(ctx, 0, -14 * s, 8 * s, '#ef5b6f');
  face(ctx, 0, 14 * s, s * 0.55, mood, { gap: 7 });
  if (scorch > 0.2) {
    ctx.fillStyle = `rgba(255,120,40,${scorch * 0.5})`;
    ctx.beginPath();
    ctx.arc(0, -36 * s, 12 * s * scorch, 0, P * 2);
    ctx.fill();
  }
  ctx.restore();
}

function island(ctx, W, H, t, y0 = 0) {
  const sea = ctx.createLinearGradient(0, H * 0.66 + y0, 0, H + y0);
  sea.addColorStop(0, '#5ec8e8');
  sea.addColorStop(1, '#2f8fc8');
  ctx.fillStyle = sea;
  ctx.fillRect(0, H * 0.66 + y0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const x = wrap(hash(i) * W + t * 10, W);
    const y = H * 0.72 + y0 + hash(i * 3) * H * 0.25;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 6, y - 3, x + 12, y);
    ctx.stroke();
  }
  // Sandy island
  ctx.fillStyle = '#f6d48a';
  ctx.beginPath();
  ctx.ellipse(W * 0.5, H * 0.72 + y0, W * 0.24, H * 0.08, 0, P, 0);
  ctx.fill();
  ctx.fillStyle = '#7fd36a';
  ctx.beginPath();
  ctx.ellipse(W * 0.42, H * 0.66 + y0, W * 0.08, H * 0.03, 0, P, 0);
  ctx.fill();
  // Palm tree
  ctx.strokeStyle = '#a0703a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(W * 0.34, H * 0.7 + y0);
  ctx.quadraticCurveTo(W * 0.32, H * 0.55 + y0, W * 0.35, H * 0.44 + y0);
  ctx.stroke();
  ctx.fillStyle = '#4fb04a';
  for (let i = 0; i < 5; i++) {
    const a = -P / 2 + (i - 2) * 0.6 + Math.sin(t * 1.5 + i) * 0.05;
    ctx.beginPath();
    ctx.ellipse(W * 0.35 + Math.cos(a) * 18, H * 0.44 + y0 + Math.sin(a) * 10 + 8, 20, 6, a, 0, P * 2);
    ctx.fill();
  }
  // Lighthouse
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(W * 0.64, H * 0.7 + y0);
  ctx.lineTo(W * 0.66, H * 0.42 + y0);
  ctx.lineTo(W * 0.69, H * 0.42 + y0);
  ctx.lineTo(W * 0.71, H * 0.7 + y0);
  ctx.fill();
  ctx.fillStyle = '#ef5b6f';
  ctx.fillRect(W * 0.652, H * 0.52 + y0, W * 0.05, 8);
  ctx.fillRect(W * 0.645, H * 0.62 + y0, W * 0.06, 8);
  ctx.fillStyle = '#ffe27a';
  ctx.fillRect(W * 0.662, H * 0.37 + y0, W * 0.03, 14);
  ctx.fillStyle = '#ef5b6f';
  ctx.beginPath();
  ctx.moveTo(W * 0.655, H * 0.37 + y0);
  ctx.lineTo(W * 0.6775, H * 0.32 + y0);
  ctx.lineTo(W * 0.7, H * 0.37 + y0);
  ctx.fill();
  // Matchbox launch pad
  ctx.fillStyle = '#e5484d';
  ctx.fillRect(W * 0.47, H * 0.64 + y0, W * 0.06, 12);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(W * 0.47, H * 0.64 + y0, W * 0.06, 3);
}

function gull(ctx, x, y, s, t) {
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3 * s;
  ctx.lineCap = 'round';
  const f = Math.sin(t * 12) * 6 * s;
  ctx.beginPath();
  ctx.moveTo(x - 14 * s, y - f);
  ctx.quadraticCurveTo(x - 6 * s, y - 8 * s, x, y);
  ctx.quadraticCurveTo(x + 6 * s, y - 8 * s, x + 14 * s, y - f);
  ctx.stroke();
}

function rock(ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#8a7a9a';
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * P * 2;
    const rr2 = r * (0.8 + hash(i + r) * 0.3);
    ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
  }
  ctx.fill();
  ctx.fillStyle = '#6a5a7a';
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.2, r * 0.22, 0, P * 2);
  ctx.arc(r * 0.35, r * 0.25, r * 0.16, 0, P * 2);
  ctx.fill();
  ctx.restore();
}

function earth(ctx, x, y, r) {
  ctx.fillStyle = '#4fa8f0';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, P * 2);
  ctx.fill();
  ctx.fillStyle = '#7fd36a';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.3, y - r * 0.2, r * 0.35, r * 0.22, 0.4, 0, P * 2);
  ctx.ellipse(x + r * 0.35, y + r * 0.3, r * 0.25, r * 0.15, -0.3, 0, P * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.1, y - r * 0.55, r * 0.4, r * 0.1, 0.1, 0, P * 2);
  ctx.fill();
}

function boat(ctx, x, y, s, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 2) * 0.06);
  ctx.fillStyle = '#fffaf2';
  ctx.beginPath();
  ctx.moveTo(-34 * s, 0);
  ctx.lineTo(34 * s, 0);
  ctx.lineTo(22 * s, 14 * s);
  ctx.lineTo(-22 * s, 14 * s);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-14 * s, 0);
  ctx.lineTo(0, -30 * s);
  ctx.lineTo(14 * s, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,140,160,0.6)';
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.moveTo(0, -30 * s);
  ctx.lineTo(0, 14 * s);
  ctx.stroke();
  heart(ctx, 0, -6 * s, 9 * s, '#ef5b6f');
  ctx.restore();
}

export default {
  id: 'rocket',
  title: 'Island Rocket',
  genre: 'Adventure',
  tag: 'To the moon and back',
  blurb: 'A paper rocket flies from a tiny island to the moon and back.',
  len: 60,
  trailer: 23,
  poster: {
    bg: ['#2b2d6e', '#ff9a6a'],
    dark: true,
    art(ctx, w, h) {
      const s = w / 256;
      ctx.fillStyle = '#fff6cf';
      for (let i = 0; i < 20; i++) ctx.fillRect(hash(i) * w, hash(i * 3) * h * 0.5, 3 * s, 3 * s);
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath();
      ctx.arc(w * 0.74, h * 0.24, 28 * s, 0, P * 2);
      ctx.fill();
      for (let i = 0; i < 4; i++) cloud(ctx, w * (0.15 + i * 0.25), h * 0.7 + (i % 2) * 12 * s, 1.4 * s, '#ffe9dc', 0.9);
      rocket(ctx, w * 0.45, h * 0.42, 2.1 * s, 0.3, { rot: 0.35, flame: 1 });
    },
  },
  draw(ctx, W, H, t) {
    ctx.save();
    if (t < 12) {
      // The island and the countdown
      sky(ctx, W, H, '#7fd0ff', '#d8f4ff');
      for (let i = 0; i < 3; i++) cloud(ctx, wrap(i * 230 - t * 8, W + 120) - 60, 40 + i * 20, 1.2);
      island(ctx, W, H, t);
      const lift = ease(seg(t, 11.6, 12.4));
      ctx.save();
      shake(ctx, t, pulse(t, 11, 12, 0.3, 0.1) * 2.5);
      rocket(ctx, W * 0.5, H * 0.53 - lift * H * 0.3, 1.1, t, { flame: seg(t, 11.2, 11.6), mood: t > 8 ? 'wow' : 'smile' });
      ctx.restore();
      if (t > 11) for (let i = 0; i < 6; i++) cloud(ctx, W * 0.5 + (i - 2.5) * 18 * seg(t, 11, 12), H * 0.66, 0.6 + seg(t, 11, 12) * 0.5, '#f3f3f3', 0.9);
      const n = t >= 8.2 && t < 11.2 ? 3 - Math.floor((t - 8.2) / 1) : 0;
      if (n > 0) text(ctx, String(n), W * 0.5, H * 0.26, H * 0.24 * (1.3 - ((t - 8.2) % 1) * 0.3), '#ffffff', { stroke: '#3f7bf0', lw: 10 });
      titleCard(ctx, W, H, t, 'Island Rocket', { a: 0.4, b: 4.4, color: '#3f7bf0', sub: 'To the moon and back' });
      caption(ctx, W, H, 'A paper rocket with a very big dream.', pulse(t, 4.8, 7.8, 0.3, 0.4));
      sceneFade(ctx, W, H, t, 12.2, 0, 0.3, '#ffffff');
    } else if (t < 22) {
      // Up through the sky: the clouds rush past
      const u = t - 12;
      const k = u / 10;
      sky(ctx, W, H, `rgb(${lerp(127, 40, k)},${lerp(208, 60, k)},${lerp(255, 150, k)})`, `rgb(${lerp(216, 120, k)},${lerp(244, 160, k)},255)`);
      if (k > 0.6) stars(ctx, W, H, t, { n: 30, seed: 5, top: 1 });
      for (let i = 0; i < 8; i++) cloud(ctx, hash(i * 5) * W, wrap(hash(i) * H * 1.6 + u * 140, H * 1.6) - H * 0.3, 1.2 + hash(i * 2) * 0.8, '#ffffff', 0.9 * (1 - k * 0.6));
      // Speed lines
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        const x = hash(i * 7) * W;
        const y = wrap(hash(i * 11) * H + u * 420, H);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 30);
        ctx.stroke();
      }
      const dodge = pulse(u, 5.6, 6.6, 0.25, 0.4);
      gull(ctx, lerp(W * 1.1, -W * 0.1, seg(u, 4.6, 7.6)), H * 0.42, 1.6, t);
      gull(ctx, lerp(W * 1.2, -W * 0.1, seg(u, 4.9, 7.9)), H * 0.3, 1.2, t + 0.3);
      rocket(ctx, W * 0.5 - dodge * 60, H * 0.56 + Math.sin(u * 3) * 4, 1.25, t, { rot: -dodge * 0.4, flame: 1, mood: dodge > 0.3 ? 'wow' : 'happy' });
      caption(ctx, W, H, 'Up, up and away!', pulse(u, 1, 3.8, 0.3, 0.4));
      sceneFade(ctx, W, H, u, 10, 0.3, 0.5);
    } else if (t < 31) {
      // Space: dodging asteroids
      const u = t - 22;
      sky(ctx, W, H, '#140f2e', '#2a1f5a');
      ctx.strokeStyle = 'rgba(255,246,207,0.8)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 40; i++) {
        const x = hash(i * 3) * W;
        const y = wrap(hash(i * 9) * H + u * 160 * (0.5 + hash(i)), H);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 4 + hash(i) * 8);
        ctx.stroke();
      }
      const lane = Math.sin(u * 1.3) * 0.18 + (u > 2 && u < 3 ? -0.08 : 0);
      const rx = W * (0.5 + lane);
      for (let i = 0; i < 7; i++) {
        const x = W * (0.12 + ((i * 0.37) % 0.8));
        const y = wrap(hash(i * 4) * H * 2 + u * 170, H * 2) - H * 0.6;
        const near = Math.abs(x - rx) < 60 ? 1 : 0;
        rock(ctx, x + (near ? (x < rx ? -40 : 40) : 0), y, 18 + hash(i) * 16, u * (0.5 + hash(i)));
      }
      rocket(ctx, rx, H * 0.6, 1.25, t, { rot: Math.cos(u * 1.3) * 0.25, flame: 1, mood: u > 7.6 ? 'happy' : 'wow' });
      caption(ctx, W, H, 'Look out, rocks!', pulse(u, 1.2, 3.6, 0.3, 0.4));
      caption(ctx, W, H, 'Made it!', pulse(u, 7.6, 8.8, 0.2, 0.3));
      sceneFade(ctx, W, H, u, 9, 0.4, 0.5);
    } else if (t < 40) {
      // The moon: a bumpy landing, a heart flag, and a friendly bunny
      const u = t - 31;
      sky(ctx, W, H, '#140f2e', '#3a2a6a');
      stars(ctx, W, H, t, { n: 50, seed: 9, top: 0.7 });
      earth(ctx, W * 0.82, H * 0.22, 26);
      ctx.fillStyle = '#e9e2c8';
      ctx.beginPath();
      ctx.ellipse(W * 0.5, H * 1.25, W * 0.8, H * 0.5, 0, 0, P * 2);
      ctx.fill();
      ctx.fillStyle = '#d6ccae';
      for (const [x, y, r] of [[0.2, 0.86, 22], [0.68, 0.9, 30], [0.86, 0.82, 14], [0.4, 0.95, 16]]) {
        ctx.beginPath();
        ctx.ellipse(W * x, H * y, r, r * 0.35, 0, 0, P * 2);
        ctx.fill();
      }
      const down = ease(seg(u, 0, 2.5));
      const bump = pulse(u, 2.5, 2.8, 0.1, 0.4);
      rocket(ctx, W * 0.45, lerp(-H * 0.2, H * 0.62, down) - bump * 20, 1.2, t, { rot: bump * 0.3, flame: u < 2.5 ? 0.6 : 0, mood: u > 2.8 ? 'happy' : 'wow' });
      // The flag
      const f = ease(seg(u, 4, 4.8));
      if (f > 0) {
        ctx.strokeStyle = '#9b6a43';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(W * 0.56, H * 0.8);
        ctx.lineTo(W * 0.56, H * 0.8 - 56 * f);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(W * 0.56, H * 0.8 - 56 * f);
        ctx.quadraticCurveTo(W * 0.56 + 20, H * 0.8 - 52 * f + Math.sin(t * 4) * 3, W * 0.56 + 38, H * 0.8 - 48 * f);
        ctx.lineTo(W * 0.56 + 38, H * 0.8 - 28 * f);
        ctx.quadraticCurveTo(W * 0.56 + 20, H * 0.8 - 32 * f + Math.sin(t * 4) * 3, W * 0.56, H * 0.8 - 36 * f);
        ctx.fill();
        heart(ctx, W * 0.56 + 19, H * 0.8 - 42 * f, 12, '#ef5b6f', f);
      }
      // Moon Bunny peeks out of a crater and waves
      const pk = ease(seg(u, 5.4, 6.4));
      if (pk > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, H * 0.86);
        ctx.clip();
        bunny(ctx, W * 0.76, H * 0.86 - pk * 48, 0.75, { ear: Math.sin(t * 6) * 0.15 });
        ctx.restore();
        ctx.fillStyle = '#d6ccae';
        ctx.beginPath();
        ctx.ellipse(W * 0.76, H * 0.87, 34, 9, 0, 0, P * 2);
        ctx.fill();
      }
      caption(ctx, W, H, 'Hello, moon!', pulse(u, 5, 8, 0.3, 0.4));
      sceneFade(ctx, W, H, u, 9, 0.4, 0.5);
    } else if (t < 52) {
      // Home again: a hot glowing trip down, then a napkin parachute and a splash
      const u = t - 40;
      const k = seg(u, 0, 6.5);
      sky(ctx, W, H, `rgb(${lerp(40, 255, k)},${lerp(30, 170, k)},${lerp(90, 120, k)})`, `rgb(${lerp(90, 255, k)},${lerp(60, 220, k)},${lerp(140, 170, k)})`);
      if (k < 0.6) stars(ctx, W, H, t, { n: 30, seed: 2, top: 1 });
      const hot = pulse(u, 1.5, 6.2, 1, 0.8);
      const chute = ease(seg(u, 6.4, 7.2));
      if (u > 5.5) for (let i = 0; i < 5; i++) cloud(ctx, hash(i * 5) * W, wrap(hash(i) * H * 1.4 - (u - 5.5) * 50 * (1 - chute * 0.7), H * 1.4) - H * 0.2, 1.5, '#ffffff', 0.9);
      if (u > 7.5) island(ctx, W, H, t, lerp(H * 0.5, 0, ease(seg(u, 7.5, 10.5))));
      ctx.save();
      shake(ctx, t, hot * 3);
      const ry = u < 7 ? H * 0.42 : lerp(H * 0.42, H * 0.74, ease(seg(u, 7.5, 10.5)));
      const sway = chute > 0 ? Math.sin(u * 2) * 0.15 : 0;
      if (chute > 0) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(W * 0.5 - 40 * chute, ry - 90 * chute);
        ctx.lineTo(W * 0.5, ry - 30);
        ctx.lineTo(W * 0.5 + 40 * chute, ry - 90 * chute);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(W * 0.5, ry - 92 * chute, 48 * chute, 24 * chute, 0, P, 0);
        ctx.fill();
        heart(ctx, W * 0.5, ry - 100 * chute, 14 * chute, '#ff7fa3');
      }
      rocket(ctx, W * 0.5, ry, 1.2, t, { rot: P + sway * (u < 6.4 ? 0 : 1) - (chute > 0 ? P * chute : 0), scorch: hot, mood: hot > 0.4 ? 'scared' : 'happy' });
      if (hot > 0.1) {
        ctx.fillStyle = `rgba(255,140,60,${hot * 0.5})`;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.arc(W * 0.5 + (hash(i + Math.floor(t * 10)) - 0.5) * 30, ry - 40 - i * 12, 6 + i * 2, 0, P * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      if (u > 10.5) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * P;
          const r = seg(u, 10.5, 11.5) * 40;
          ctx.beginPath();
          ctx.arc(W * 0.5 - Math.cos(a) * r, H * 0.74 - Math.sin(a) * r * 0.8, 4, 0, P * 2);
          ctx.fill();
        }
      }
      caption(ctx, W, H, 'Hot, hot, hot!', pulse(u, 2.4, 5.4, 0.3, 0.4));
      sceneFade(ctx, W, H, u, 12, 0.4, 0.6);
    } else {
      // A paper boat at sunset
      const u = t - 52;
      sky(ctx, W, H, '#ff9a8a', '#ffd9a8');
      ctx.fillStyle = '#ffe27a';
      ctx.beginPath();
      ctx.arc(W * 0.5, H * 0.66, 40, P, 0);
      ctx.fill();
      island(ctx, W, H, t);
      boat(ctx, lerp(W * 0.86, W * 0.62, ease(seg(u, 0, 7))), H * 0.8, 1, t);
      theEnd(ctx, W, H, pulse(u, 1, 7, 0.5, 0.5), '#ffffff', 0.2, 'rgba(200,80,90,0.6)');
      sceneFade(ctx, W, H, u, 8, 0.5, 0.8);
    }
    ctx.restore();
  },
  cues: [
    [8.4, 'grip', 3.2],
    [11.9, 'cheer', 'liftoff'],
    [17, 'love'],
    [23.4, 'grip', 5.6],
    [29.7, 'cheer', 'rocks'],
    [33.4, 'share'],
    [36.6, 'lean'],
    [42, 'grip', 4.4],
    [46.7, 'cheer', 'chute'],
    [53, 'lean'],
  ],
  music: (() => {
    const M = [];
    const bpm = 108;
    const D = [50, 54, 57, 62];
    const G = [43, 55, 59, 62];
    const A = [45, 52, 57, 61];
    const Bm = [47, 54, 59, 62];
    chords(M, { at: 0.3, bpm, voice: 'pad', gain: 0.022, beats: 4, prog: [D, G, A, D], bass: 'bass', bassGain: 0.05 });
    melody(M, { at: 0.3, bpm, voice: 'bell', gain: 0.04, step: 1, notes: [74, 78, 81, [78, 2], 76, 74, 76, [81, 4], 0, 0, 0, 0] });
    // Countdown drum hits, one a second
    for (let i = 0; i < 3; i++) M.push([8.2 + i, 'tom', 45, 0.4, 0.2]);
    // The march
    const march = [74, 0, 74, 76, [78, 2], 81, 0, [79, 2], 78, 76, [74, 4], 76, 78, [79, 2], 81, 83, [81, 2], 78, 76, [74, 4]];
    chords(M, { at: 11.6, bpm, voice: 'brass', gain: 0.022, beats: 4, prog: [D, G, A, D, Bm, G, A, D], bass: 'bass', bassGain: 0.06 });
    melody(M, { at: 11.6, bpm, voice: 'lead', gain: 0.03, step: 0.5, notes: [...march, ...march] });
    drums(M, { at: 11.6, bpm, bars: 8, pattern: 'k.h.s.h.k.k.s.h.' });
    // Space: quiet and twinkly, with a pulse during the rocks
    chords(M, { at: 29.4, bpm: 80, voice: 'pad', gain: 0.025, beats: 4, prog: [D, Bm, G, A, D], bass: 'bass' });
    melody(M, { at: 31, bpm: 80, voice: 'bell', gain: 0.04, step: 1, notes: [86, 85, 83, [81, 2], 0, 81, 83, 85, [86, 4]] });
    // Coming home: drum roll, then the march again under the parachute
    drums(M, { at: 41.6, bpm: 120, bars: 5, pattern: 'ssss', step: 0.25, gain: 0.7 });
    chords(M, { at: 46.6, bpm, voice: 'brass', gain: 0.024, beats: 4, prog: [D, G, A, D], bass: 'bass', bassGain: 0.06 });
    melody(M, { at: 46.6, bpm, voice: 'lead', gain: 0.032, step: 0.5, notes: march });
    drums(M, { at: 46.6, bpm, bars: 4, pattern: 'k.h.s.h.k.k.s.h.' });
    chords(M, { at: 52.6, bpm: 72, voice: 'pad', gain: 0.025, beats: 4, prog: [G, D, A, D], bass: 'bass' });
    melody(M, { at: 52.6, bpm: 72, voice: 'musicbox', gain: 0.045, step: 1, notes: [78, 76, 74, [76, 2], 74, 71, [74, 4], 78, 81, [86, 4]] });
    return M;
  })(),
  sfx: [
    [11.2, 'launch'],
    [11.7, 'boom', 0.6],
    [17.2, 'tweet'],
    [17.6, 'whoosh', 0.6],
    [24, 'whoosh', 0.7],
    [26, 'whoosh', 0.7],
    [28, 'whoosh', 0.7],
    [33.5, 'thump'],
    [35, 'pop'],
    [35.8, 'tada'],
    [36.6, 'squeak', 0.6],
    [41.4, 'rumble'],
    [43, 'rumble'],
    [44.6, 'rumble'],
    [46.5, 'pop'],
    [46.6, 'whoosh', 0.5],
    [50.5, 'splash'],
  ],
};
