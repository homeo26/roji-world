import { P, seg, ease, lerp, hash, pulse, sky, cloud, fade, sceneFade, titleCard, caption, theEnd, text, heart, face, shake, melody, chords, rr } from './common.js';

// "The Creaky House": a little mouse with a lantern explores a creaky house on a stormy night.
// A bat, a ghost on the stairs, a ghost under the table... and the ghost is only a kitten under a sheet.

// The three jump scares (film seconds). The couple reacts on these.
export const SCARES = [21, 34, 46];

function mouse(ctx, x, y, s, { t = 0, walk = 0, mood = 'smile', dir = 1, jump = 0, lantern = true, fur = 0 } = {}) {
  ctx.save();
  const hop = walk ? Math.abs(Math.sin(t * 9)) * 3 * s : 0;
  ctx.translate(x, y - hop - jump * 16 * s);
  ctx.scale(dir, 1);
  // Tail
  ctx.strokeStyle = '#d88a9a';
  ctx.lineWidth = 2.2 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-12 * s, 6 * s);
  ctx.bezierCurveTo(-26 * s, 8 * s, -24 * s, -10 * s + Math.sin(t * 5) * 3 * s, -34 * s, -6 * s);
  ctx.stroke();
  // Body and feet
  ctx.fillStyle = '#b7b0c4';
  ctx.beginPath();
  ctx.ellipse(0, 4 * s, 13 * s, 12 * s * (1 + fur * 0.12), 0, 0, P * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c7d0';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(k * 6 * s + (walk ? Math.sin(t * 9 + k) * 2 * s : 0), 15 * s, 4.5 * s, 2.5 * s, 0, 0, P * 2);
    ctx.fill();
  }
  // Fur standing up after a fright
  if (fur > 0) {
    ctx.strokeStyle = '#b7b0c4';
    ctx.lineWidth = 2 * s;
    for (let i = 0; i < 7; i++) {
      const a = -P + (i / 6) * P;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 12 * s, Math.sin(a) * 12 * s);
      ctx.lineTo(Math.cos(a) * (12 + 6 * fur) * s, Math.sin(a) * (12 + 6 * fur) * s);
      ctx.stroke();
    }
  }
  // Head with big round ears
  ctx.fillStyle = '#c4bdd0';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(k * 10 * s, -22 * s, 8 * s, 0, P * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#f3b6c6';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(k * 10 * s, -22 * s, 4.6 * s, 0, P * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#c4bdd0';
  ctx.beginPath();
  ctx.ellipse(3 * s, -12 * s, 11 * s, 9.5 * s, 0, 0, P * 2);
  ctx.fill();
  ctx.fillStyle = '#ff8fa8';
  ctx.beginPath();
  ctx.arc(13 * s, -11 * s, 2.2 * s, 0, P * 2);
  ctx.fill();
  face(ctx, 4 * s, -12 * s, s * 0.62, mood, { gap: 8 });
  // Lantern
  if (lantern) {
    ctx.strokeStyle = '#6a4a3a';
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.moveTo(10 * s, 0);
    ctx.lineTo(18 * s, -4 * s);
    ctx.stroke();
    const g = ctx.createRadialGradient(20 * s, 3 * s, 0, 20 * s, 3 * s, 14 * s);
    g.addColorStop(0, 'rgba(255,220,140,0.9)');
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(6 * s, -11 * s, 28 * s, 28 * s);
    ctx.fillStyle = '#ffd27a';
    rr(ctx, 16 * s, -2 * s, 8 * s, 10 * s, 2 * s);
    ctx.fill();
    ctx.fillStyle = '#6a4a3a';
    ctx.fillRect(15 * s, -4 * s, 10 * s, 2.4 * s);
  }
  ctx.restore();
}

function ghost(ctx, x, y, s, t, { mood = 'boo', lift = 0, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y + Math.sin(t * 2.4) * 4 * s);
  ctx.fillStyle = '#f7f3ff';
  ctx.beginPath();
  ctx.moveTo(-24 * s, 20 * s);
  ctx.bezierCurveTo(-26 * s, -34 * s, 26 * s, -34 * s, 24 * s, 20 * s);
  for (let i = 0; i < 4; i++) {
    const x0 = 24 * s - (i + 1) * 12 * s;
    ctx.quadraticCurveTo(x0 + 6 * s, (28 + Math.sin(t * 6 + i) * 3) * s, x0, 20 * s);
  }
  ctx.fill();
  ctx.fillStyle = 'rgba(160,140,200,0.25)';
  ctx.beginPath();
  ctx.ellipse(10 * s, 4 * s, 8 * s, 18 * s, 0.2, 0, P * 2);
  ctx.fill();
  // Eye holes and mouth
  ctx.fillStyle = '#2a1a3a';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(k * 8 * s, -8 * s, 4 * s, 6 * s, 0, 0, P * 2);
    ctx.fill();
  }
  if (mood === 'boo') {
    ctx.beginPath();
    ctx.ellipse(0, 6 * s, 6 * s, 7 * s, 0, 0, P * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#2a1a3a';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.arc(0, 3 * s, 4 * s, 0.2 * P, 0.8 * P);
    ctx.stroke();
  }
  // Little paws under the sheet (a clue)
  if (lift > 0) {
    ctx.fillStyle = '#d9d3e2';
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(k * 8 * s, 22 * s, 4 * s, 3 * s, 0, 0, P * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function kitten(ctx, x, y, s, t, { mood = 'smile', meow = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  // Tail
  ctx.strokeStyle = '#a9a3b8';
  ctx.lineWidth = 6 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(14 * s, 14 * s);
  ctx.quadraticCurveTo(34 * s, 10 * s, 30 * s, -10 * s + Math.sin(t * 3) * 4 * s);
  ctx.stroke();
  ctx.fillStyle = '#b9b3c8';
  ctx.beginPath();
  ctx.ellipse(0, 10 * s, 18 * s, 14 * s, 0, 0, P * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, 14 * s, 10 * s, 9 * s, 0, 0, P * 2);
  ctx.fill();
  // Head and ears
  ctx.fillStyle = '#b9b3c8';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(k * 16 * s, -14 * s);
    ctx.lineTo(k * 14 * s, -32 * s);
    ctx.lineTo(k * 3 * s, -22 * s);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, -12 * s, 18 * s, 15 * s, 0, 0, P * 2);
  ctx.fill();
  ctx.fillStyle = '#ffc2d4';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(k * 13 * s, -18 * s);
    ctx.lineTo(k * 13 * s, -27 * s);
    ctx.lineTo(k * 6 * s, -21 * s);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, -6 * s, 9 * s, 6 * s, 0, 0, P * 2);
  ctx.fill();
  face(ctx, 0, -11 * s, s * 0.85, mood, { gap: 8 });
  if (meow > 0) {
    ctx.fillStyle = '#c2405a';
    ctx.beginPath();
    ctx.ellipse(0, -4 * s, 3 * s, 3.5 * s * meow, 0, 0, P * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(80,60,80,0.6)';
  ctx.lineWidth = 1;
  for (const k of [-1, 1])
    for (const d of [-2, 2]) {
      ctx.beginPath();
      ctx.moveTo(k * 8 * s, -6 * s);
      ctx.lineTo(k * 22 * s, (-7 + d) * s);
      ctx.stroke();
    }
  ctx.restore();
}

function bat(ctx, x, y, s, t) {
  ctx.save();
  ctx.translate(x, y);
  const f = Math.sin(t * 24) * 0.5;
  ctx.fillStyle = '#6b4a8a';
  for (const k of [-1, 1]) {
    ctx.save();
    ctx.scale(k, 1);
    ctx.rotate(f);
    ctx.beginPath();
    ctx.moveTo(8 * s, -4 * s);
    ctx.quadraticCurveTo(30 * s, -22 * s, 46 * s, -6 * s);
    ctx.quadraticCurveTo(38 * s, 0, 34 * s, 8 * s);
    ctx.quadraticCurveTo(26 * s, 2 * s, 20 * s, 10 * s);
    ctx.quadraticCurveTo(14 * s, 4 * s, 6 * s, 8 * s);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#7d5a9e';
  ctx.beginPath();
  ctx.ellipse(0, 0, 13 * s, 14 * s, 0, 0, P * 2);
  ctx.fill();
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(k * 4 * s, -10 * s);
    ctx.lineTo(k * 11 * s, -24 * s);
    ctx.lineTo(k * 12 * s, -6 * s);
    ctx.fill();
  }
  face(ctx, 0, -1 * s, s * 0.8, 'wow', { gap: 6, ink: '#1a0f22' });
  ctx.fillStyle = '#ffffff';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(k * 3 * s, 7 * s);
    ctx.lineTo(k * 1.5 * s, 11 * s);
    ctx.lineTo(k * 0.2 * s, 7 * s);
    ctx.fill();
  }
  ctx.restore();
}

function darkness(ctx, W, H, x, y, r, a = 0.93) {
  const g = ctx.createRadialGradient(x, y, r * 0.3, x, y, r);
  g.addColorStop(0, 'rgba(12,6,22,0)');
  g.addColorStop(1, `rgba(12,6,22,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const w = ctx.createRadialGradient(x, y, 0, x, y, r * 0.8);
  w.addColorStop(0, 'rgba(255,190,110,0.22)');
  w.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = w;
  ctx.fillRect(0, 0, W, H);
}

function rain(ctx, W, H, t, a = 0.5) {
  ctx.strokeStyle = `rgba(200,200,255,${a})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 70; i++) {
    const x = (hash(i) * W + t * 60) % W;
    const y = (hash(i * 2.3) * H + t * 520) % H;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 4, y + 12);
  }
  ctx.stroke();
}

function house(ctx, W, H, t, door, warm = 0) {
  // Hill
  ctx.fillStyle = warm ? '#4a3a6a' : '#2a2045';
  ctx.beginPath();
  ctx.moveTo(-W * 0.3, H);
  ctx.quadraticCurveTo(W * 0.45, H * 0.5, W * 1.3, H * 0.8);
  ctx.lineTo(W * 1.3, H);
  ctx.fill();
  // Bare tree
  ctx.strokeStyle = '#1d1530';
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(W * 0.16, H * 0.86);
  ctx.quadraticCurveTo(W * 0.15, H * 0.6, W * 0.2, H * 0.46);
  ctx.stroke();
  ctx.lineWidth = 3;
  for (const [a, b, c, d] of [[0.17, 0.62, 0.1, 0.5], [0.19, 0.52, 0.27, 0.4], [0.2, 0.47, 0.17, 0.34]]) {
    ctx.beginPath();
    ctx.moveTo(W * a, H * b);
    ctx.lineTo(W * c, H * d);
    ctx.stroke();
  }
  // The crooked house
  ctx.save();
  ctx.translate(W * 0.58, H * 0.62);
  ctx.rotate(-0.04);
  ctx.fillStyle = warm ? '#7a5a9a' : '#4a3570';
  ctx.fillRect(-70, -70, 140, 80);
  ctx.fillRect(34, -122, 40, 60);
  ctx.fillStyle = warm ? '#5a3a6a' : '#2e2050';
  ctx.beginPath();
  ctx.moveTo(-84, -68);
  ctx.lineTo(-10, -118);
  ctx.lineTo(60, -66);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(28, -120);
  ctx.lineTo(56, -158);
  ctx.lineTo(82, -118);
  ctx.fill();
  // Windows: one glows, they all glow when the house turns friendly
  const wins = [[-52, -50], [20, -50], [46, -104], [-14, -96]];
  wins.forEach(([x, y], i) => {
    const on = warm || i === 2 ? 1 : 0.15 + 0.15 * Math.sin(t * 3 + i);
    ctx.fillStyle = `rgba(255,${200 + 30 * warm},110,${on})`;
    ctx.fillRect(x, y, 18, 20);
    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(x + 8, y, 2, 20);
    ctx.fillRect(x, y + 9, 18, 2);
  });
  // Door that swings open
  ctx.fillStyle = '#ffcf7a';
  ctx.fillRect(-14, -30, 26, 40);
  ctx.fillStyle = '#3a2030';
  ctx.fillRect(-14, -30, 26 * (1 - door), 40);
  ctx.restore();
}

export default {
  id: 'creaky',
  title: 'The Creaky House',
  genre: 'Horror',
  tag: 'Cute and spooky',
  blurb: 'A little mouse, a lantern and a house that creaks. Who is under that sheet?',
  len: 64,
  trailer: 27,
  night: 0.86,
  poster: {
    bg: ['#3e2a6a', '#16102c'],
    dark: true,
    art(ctx, w, h) {
      const s = w / 256;
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(w * 0.72, h * 0.16, 26 * s, 0, P * 2);
      ctx.fill();
      ctx.save();
      ctx.scale(w / 640, w / 640);
      house(ctx, 640, 640, 0, 0.4, 0);
      ctx.restore();
      ghost(ctx, w * 0.32, h * 0.42, 1.6 * s, 0.5, {});
      mouse(ctx, w * 0.68, h * 0.62, 1.4 * s, { mood: 'wow' });
    },
  },
  draw(ctx, W, H, t) {
    ctx.save();
    if (t < 12) {
      // Outside in the storm
      const flash = Math.max(pulse(t, 2.4, 2.6, 0.05, 0.5), pulse(t, 8.4, 8.6, 0.05, 0.6));
      sky(ctx, W, H, '#1c1438', '#4b3478');
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(W * 0.8, H * 0.2, 22, 0, P * 2);
      ctx.fill();
      for (let i = 0; i < 4; i++) cloud(ctx, ((i * 190 + t * 14) % (W + 160)) - 80, 40 + (i % 2) * 22, 1.7, '#3a2d5a', 0.9);
      house(ctx, W, H, t, ease(seg(t, 10.2, 11.2)), 0);
      mouse(ctx, lerp(W * 0.08, W * 0.55, ease(seg(t, 4.6, 10.4))), H * 0.8 - seg(t, 4.6, 10.4) * H * 0.08, 1.15, { t, walk: t > 4.6 && t < 10.4 ? 1 : 0, mood: t > 8.4 && t < 9.6 ? 'wow' : 'smile' });
      rain(ctx, W, H, t);
      if (flash > 0) {
        fade(ctx, W, H, flash * 0.5, '#e8e4ff');
        ctx.strokeStyle = `rgba(255,255,230,${flash})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(W * 0.3, 0);
        ctx.lineTo(W * 0.26, H * 0.18);
        ctx.lineTo(W * 0.31, H * 0.22);
        ctx.lineTo(W * 0.25, H * 0.42);
        ctx.stroke();
      }
      titleCard(ctx, W, H, t, 'The Creaky House', { a: 0.5, b: 4.4, color: '#9fe07a', plate: 'rgba(30,18,50,0.85)', sub: 'Who goes there?', subColor: '#d9c8ff' });
      sceneFade(ctx, W, H, t, 12, 0.6, 0.7);
    } else if (t < 26) {
      // The dark hallway
      const u = t - 12;
      ctx.fillStyle = '#4a2f4e';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#5a3a5e';
      for (let i = 0; i < 16; i++) ctx.fillRect(i * 42, 0, 18, H * 0.74);
      ctx.fillStyle = '#3a2232';
      ctx.fillRect(0, H * 0.74, W, H * 0.26);
      ctx.fillStyle = '#6a3a3a';
      ctx.fillRect(0, H * 0.72, W, 8);
      // Portraits, one of a cat whose eyes follow the mouse
      const mx = lerp(W * 0.06, W * 0.62, ease(seg(u, 0.6, 8.4))) + (u > 9.4 ? lerp(0, W * 0.2, ease(seg(u, 11, 13.6))) : 0);
      for (const [x, cat] of [[0.22, 0], [0.5, 1], [0.8, 0]]) {
        ctx.fillStyle = '#c99a3a';
        ctx.fillRect(W * x - 30, H * 0.18, 60, 74);
        ctx.fillStyle = cat ? '#8a7aa0' : '#6a5a7a';
        ctx.fillRect(W * x - 24, H * 0.18 + 6, 48, 62);
        if (cat) {
          kitten(ctx, W * x, H * 0.18 + 48, 0.8, t);
          ctx.fillStyle = '#ffe27a';
          const look = Math.max(-2, Math.min(2, (mx - W * x) / 60));
          for (const k of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(W * x + k * 6.8 + look, H * 0.18 + 36, 1.6, 0, P * 2);
            ctx.fill();
          }
        } else {
          ctx.fillStyle = '#c4a0b0';
          ctx.beginPath();
          ctx.arc(W * x, H * 0.18 + 30, 12, 0, P * 2);
          ctx.fill();
        }
      }
      // Grandfather clock
      ctx.fillStyle = '#5a3324';
      ctx.fillRect(W * 0.66 - 16, H * 0.3, 32, H * 0.44);
      ctx.fillStyle = '#f3e3c3';
      ctx.beginPath();
      ctx.arc(W * 0.66, H * 0.38, 11, 0, P * 2);
      ctx.fill();
      ctx.strokeStyle = '#5a3324';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W * 0.66, H * 0.38);
      ctx.lineTo(W * 0.66 + Math.sin(t) * 7, H * 0.38 - Math.cos(t) * 7);
      ctx.moveTo(W * 0.66 + Math.sin(t * 3) * 5, H * 0.58);
      ctx.lineTo(W * 0.66, H * 0.48);
      ctx.stroke();
      const scared = pulse(u, 9, 10.6, 0.05, 0.8);
      mouse(ctx, mx, H * 0.84, 1.3, { t, walk: (u > 0.6 && u < 8.4) || (u > 11 && u < 13.6) ? 1 : 0, mood: scared > 0.2 ? 'scared' : u > 10.6 && u < 11.6 ? 'sad' : 'smile', jump: scared * 0.8, fur: scared });
      // The bat swoops into the light
      if (u > 8.8 && u < 11.6) {
        const k = seg(u, 8.8, 9.2);
        const away = ease(seg(u, 10.2, 11.6));
        const s = lerp(0.6, 2.2, k) * (1 - away * 0.6);
        bat(ctx, mx + 36 + away * W * 0.5, H * 0.45 - away * H * 0.4, s, t);
      }
      darkness(ctx, W, H, mx + 22, H * 0.78, 150 + Math.sin(t * 7) * 6);
      const fl = pulse(u, 9, 9.15, 0.03, 0.35);
      if (fl > 0) fade(ctx, W, H, fl * 0.55, '#ffffff');
      caption(ctx, W, H, 'Hello? Is anybody home?', pulse(u, 2, 6.4, 0.4, 0.5));
      caption(ctx, W, H, 'Phew. Only a bat.', pulse(u, 11, 13.4, 0.3, 0.4));
      sceneFade(ctx, W, H, u, 14, 0.5, 0.6);
    } else if (t < 40) {
      // The staircase and the ghost on the landing
      const u = t - 26;
      ctx.fillStyle = '#3e2846';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#4c3254';
      ctx.fillRect(0, H * 0.3, W, 6);
      // Stairs going up to the right
      ctx.fillStyle = '#5a3a3a';
      for (let i = 0; i < 9; i++) ctx.fillRect(W * 0.2 + i * 40, H * 0.92 - i * 20, 44, H);
      ctx.fillStyle = '#7a4a3a';
      for (let i = 0; i < 9; i++) ctx.fillRect(W * 0.2 + i * 40, H * 0.92 - i * 20, 44, 5);
      ctx.fillStyle = '#5a3a3a';
      ctx.fillRect(W * 0.2 + 9 * 40, H * 0.92 - 8 * 20, W, H);
      // Banister posts
      ctx.fillStyle = '#7a4a3a';
      for (let i = 0; i < 9; i += 2) ctx.fillRect(W * 0.2 + i * 40 + 18, H * 0.92 - i * 20 - 48, 5, 48);
      const climb = ease(seg(u, 0.8, 7));
      const step = Math.floor(climb * 5);
      const mx = W * 0.2 + 20 + climb * 5 * 40;
      const my = H * 0.92 - climb * 5 * 20 - 16;
      const fright = pulse(u, 8, 9.6, 0.1, 0.6);
      const pop = seg(u, 8, 8.25);
      mouse(ctx, u > 8.6 ? mx - ease(seg(u, 8.6, 9.8)) * W * 0.6 : mx, my + (step % 2) * 0, 1.3, { t, walk: u < 7 || (u > 8.6 && u < 9.8) ? 1 : 0, mood: u > 6.2 && u < 8 ? 'wow' : u >= 8 ? 'scared' : 'smile', dir: u > 8.6 ? -1 : 1, fur: fright, jump: fright * 0.5 });
      darkness(ctx, W, H, mx + 20, my, 160 + Math.sin(t * 7) * 6);
      // The ghost glides across the landing in the back, glowing faintly
      if (u > 2 && u < 6.2) {
        const g = seg(u, 2, 6.2);
        ghost(ctx, lerp(W * 1.05, W * 0.5, g), H * 0.2, 0.95, t, { mood: 'smile', alpha: 0.55 * Math.min(1, g * 5, (1 - g) * 5) });
      }
      if (u > 6.2 && u < 8) caption(ctx, W, H, 'Thump. Thump. Thump.', pulse(u, 6.2, 8, 0.2, 0.2));
      // BOO
      if (u > 8 && u < 10.2) {
        ctx.save();
        shake(ctx, t, (1 - seg(u, 8, 9)) * 7);
        const s = lerp(1, 4.2, ease(pop));
        ghost(ctx, W * 0.55, H * 0.62, s, t, { mood: 'boo', alpha: 1 - seg(u, 9.4, 10.2) });
        ctx.globalAlpha = 1 - seg(u, 9.4, 10.2);
        text(ctx, 'BOO!', W * 0.5, H * 0.16, H * 0.2, '#ffffff', { stroke: '#4a2a6a', lw: 10 });
        ctx.globalAlpha = 1;
        ctx.restore();
        fade(ctx, W, H, pulse(u, 8, 8.12, 0.03, 0.35) * 0.55, '#ffffff');
      }
      sceneFade(ctx, W, H, u, 14, 0.5, 0.6);
    } else if (t < 50) {
      // Hiding under the table; the ghost sniffs around... then leaps and the sheet slips off
      const u = t - 40;
      ctx.fillStyle = '#41294a';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#332038';
      ctx.fillRect(0, H * 0.78, W, H);
      // Table with a long cloth
      ctx.fillStyle = '#8a3a4a';
      ctx.beginPath();
      ctx.moveTo(W * 0.3, H * 0.46);
      ctx.lineTo(W * 0.7, H * 0.46);
      ctx.lineTo(W * 0.74, H * 0.84);
      for (let i = 0; i < 8; i++) ctx.quadraticCurveTo(W * (0.74 - i * 0.055 - 0.027), H * 0.88, W * (0.74 - (i + 1) * 0.055), H * 0.84);
      ctx.lineTo(W * 0.3, H * 0.46);
      ctx.fill();
      ctx.fillStyle = '#a84a5a';
      ctx.fillRect(W * 0.3, H * 0.44, W * 0.4, 8);
      // Candle on the table
      ctx.fillStyle = '#fff3d8';
      ctx.fillRect(W * 0.5 - 4, H * 0.34, 8, 20);
      ctx.fillStyle = '#ffc94a';
      ctx.beginPath();
      ctx.ellipse(W * 0.5, H * 0.32, 3.5, 6 + Math.sin(t * 13), 0, 0, P * 2);
      ctx.fill();
      // Mouse eyes peeking from under the cloth
      if (u < 8.2) {
        ctx.fillStyle = '#ffffff';
        for (const k of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(W * 0.47 + k * 6 + Math.sin(u) * 2, H * 0.8, 3, u > 6 ? 4.5 : 3.6, 0, 0, P * 2);
          ctx.fill();
        }
      }
      const leap = seg(u, 6, 6.6);
      const gx = lerp(W * 0.95, W * 0.7, ease(seg(u, 0.4, 4.5)));
      if (u < 6) {
        darkness(ctx, W, H, W * 0.5, H * 0.4, 250, 0.85);
        ghost(ctx, gx, H * 0.56 + Math.sin(u * 2) * 6, 1.15, t, { mood: 'smile', lift: 1, alpha: 0.85 });
        caption(ctx, W, H, 'Sniff... sniff...', pulse(u, 2.4, 5.6, 0.3, 0.3));
      } else {
        // The leap: the sheet flies up and off, a kitten lands
        ctx.save();
        shake(ctx, t, (1 - seg(u, 6, 7)) * 6);
        const off = ease(seg(u, 6.15, 7.2));
        const kx = lerp(gx, W * 0.56, ease(seg(u, 6, 7)));
        const ky = lerp(H * 0.4, H * 0.72, ease(seg(u, 6.4, 7.2))) - Math.sin(leap * P) * 40;
        kitten(ctx, kx, ky, lerp(1.6, 1.25, off), t, { mood: u > 7.4 ? 'happy' : 'wow', meow: pulse(u, 7.4, 8.4, 0.1, 0.3) });
        ghost(ctx, kx + off * 60, ky - 12 - off * H * 0.5, lerp(1.7, 1.4, off), t, { mood: 'boo', alpha: 1 - off });
        if (u > 7.4 && u < 9.2) text(ctx, 'Meow!', kx + 40, ky - 50, H * 0.11, '#fff6e6', { stroke: '#6a3a5a', lw: 7 });
        ctx.restore();
        if (u > 8.2) mouse(ctx, W * 0.4, H * 0.84, 1.2, { t, mood: 'wow', lantern: false });
      }
      if (u >= 6) darkness(ctx, W, H, W * 0.5, H * 0.4, 250, lerp(0.85, 0.25, seg(u, 7.6, 9.6)));
      if (u > 6) fade(ctx, W, H, pulse(u, 6, 6.12, 0.03, 0.35) * 0.6, '#ffffff');
      sceneFade(ctx, W, H, u, 10, 0.5, 0.5);
    } else if (t < 58) {
      // Lights on: the kitten and the mouse share milk by the fire
      const u = t - 50;
      ctx.fillStyle = '#ffd9b8';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffc9a8';
      for (let i = 0; i < 16; i++) ctx.fillRect(i * 42, 0, 18, H * 0.72);
      ctx.fillStyle = '#c98a5a';
      ctx.fillRect(0, H * 0.72, W, H);
      // Fireplace
      ctx.fillStyle = '#b5644a';
      ctx.fillRect(W * 0.08, H * 0.3, 150, H * 0.42);
      ctx.fillStyle = '#3a1a1a';
      ctx.fillRect(W * 0.08 + 26, H * 0.44, 98, H * 0.28);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = ['#ff9a3a', '#ffd166', '#ff6b4a'][i];
        ctx.beginPath();
        ctx.ellipse(W * 0.08 + 55 + i * 20, H * 0.66 - Math.sin(t * 9 + i) * 3, 10, 18 + Math.sin(t * 7 + i * 2) * 4, 0, 0, P * 2);
        ctx.fill();
      }
      // The sheet is a blanket now
      ctx.fillStyle = '#f7f3ff';
      rr(ctx, W * 0.42, H * 0.8, 230, 40, 18);
      ctx.fill();
      kitten(ctx, W * 0.58, H * 0.74, 1.3, t, { mood: 'happy' });
      mouse(ctx, W * 0.75, H * 0.8, 1.2, { t, mood: 'happy', lantern: false, dir: -1 });
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(W * 0.67, H * 0.9, 18, 5, 0, 0, P * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(W * 0.66, H * 0.86);
      ctx.lineTo(W * 0.7, H * 0.86);
      ctx.lineTo(W * 0.68, H * 0.8);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const k = (u * 0.4 + i * 0.33) % 1;
        heart(ctx, W * 0.66 + Math.sin(k * 6 + i) * 12, H * 0.6 - k * 50, 10, '#ff8fa8', 1 - k);
      }
      caption(ctx, W, H, 'It was only a kitten who wanted a friend.', pulse(u, 1, 6.6, 0.4, 0.5));
      sceneFade(ctx, W, H, u, 8, 0.5, 0.5);
    } else {
      // The storm is over
      const u = t - 58;
      sky(ctx, W, H, '#2a2a6a', '#8a6ab8');
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(W * 0.8, H * 0.2, 22, 0, P * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(W * 0.15, H * 0.06);
      house(ctx, W, H, t, 0, 1);
      ghost(ctx, W * 0.58 + 52, H * 0.12 - Math.sin(u * 2) * 3, 0.45, t, { mood: 'smile' });
      ctx.restore();
      ctx.save();
      ctx.translate(-W * 0.2, 0);
      theEnd(ctx, W, H, pulse(u, 0.5, 5.2, 0.5, 0.5), '#ffe9a8', 0.26, 'rgba(40,20,70,0.6)');
      ctx.restore();
      sceneFade(ctx, W, H, u, 6, 0.5, 0.8);
    }
    ctx.restore();
  },
  cues: [
    [8.6, 'brave'],
    [SCARES[0], 'scare'],
    [27.5, 'share'],
    [SCARES[1], 'scare'],
    [SCARES[2], 'scare'],
    [48.8, 'reveal'],
    [53, 'lean'],
  ],
  music: (() => {
    const M = [];
    const bpm = 60;
    const Dm = [50, 53, 57];
    const Bb = [46, 50, 53];
    const A = [45, 49, 52];
    const Gm = [43, 46, 50];
    chords(M, { at: 0.3, bpm, voice: 'organ', gain: 0.022, beats: 4, prog: [Dm, Bb, Gm, A, Dm, Bb, Gm, A, Dm, Bb], bass: 'bass', bassGain: 0.05 });
    const creep = [74, 0, 73, 0, 74, 77, [76, 2], 74, 0, 70, 0, 69, [0, 2], 0];
    melody(M, { at: 12, bpm, voice: 'musicbox', gain: 0.04, step: 0.5, notes: creep });
    melody(M, { at: 20.5, bpm, voice: 'musicbox', gain: 0.035, step: 0.5, notes: creep, transpose: -12 });
    melody(M, { at: 26.5, bpm, voice: 'musicbox', gain: 0.04, step: 0.5, notes: creep });
    // Under the table: a slow pulse
    for (let i = 0; i < 6; i++) M.push([40.5 + i * 1, 'bass', 38, 0.6, 0.06]);
    // The friendly ending in D major
    const D = [50, 54, 57];
    const G = [43, 47, 50];
    const Aj = [45, 49, 52];
    chords(M, { at: 47.2, bpm: 90, voice: 'pad', gain: 0.024, beats: 4, prog: [D, G, Aj, D, G, Aj, D, D], bass: 'bass', bassGain: 0.05 });
    melody(M, { at: 47.2, bpm: 90, voice: 'bell', gain: 0.045, step: 1, notes: [74, 78, 81, [78, 2], 76, 74, [73, 2], 74, 76, 78, [79, 2], 78, 76, [74, 4], 74, 78, 81, [83, 2], 81, 78, [81, 4]] });
    return M;
  })(),
  sfx: [
    [0.5, 'rain'],
    [2.4, 'thunder'],
    [2.8, 'rain'],
    [5, 'rain'],
    [7.2, 'rain'],
    [8.4, 'thunder', 0.8],
    [9.4, 'rain'],
    [10.2, 'door'],
    [13, 'clock'],
    [15, 'creak'],
    [17, 'clock'],
    [18.6, 'creak', 0.8],
    [SCARES[0], 'sting'],
    [SCARES[0] + 0.05, 'flap'],
    [SCARES[0] + 0.4, 'squeak'],
    [28.2, 'boo', 0.5],
    [30, 'creak'],
    [32.2, 'heartbeat'],
    [33.1, 'heartbeat'],
    [SCARES[1], 'sting'],
    [SCARES[1] + 0.05, 'boo'],
    [SCARES[1] + 0.6, 'squeak'],
    [43, 'heartbeat', 0.8],
    [44.2, 'heartbeat'],
    [45.2, 'heartbeat'],
    [SCARES[2], 'sting'],
    [SCARES[2] + 0.4, 'whoosh'],
    [47.4, 'meow'],
    [51.5, 'purr'],
    [54, 'purr'],
    [55.5, 'meow', 0.6],
  ],
};
