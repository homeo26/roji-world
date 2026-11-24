import { FONT, heartPath } from '../../places/school/kit.js';
import { bunny, bear } from './models.js';

// "Moon Bunny", the looping cartoon on the big screen (30 seconds):
// a sunny meadow, a balloon ride over the clouds, then a starry night on the moon.

export const LOOP = 30;
const P = Math.PI;

function sky(ctx, W, H, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function cloud(ctx, x, y, s, a = 1) {
  ctx.globalAlpha = a;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y, 30 * s, 12 * s, 0, 0, P * 2);
  ctx.ellipse(x + 18 * s, y - 8 * s, 18 * s, 13 * s, 0, 0, P * 2);
  ctx.ellipse(x - 16 * s, y - 4 * s, 15 * s, 10 * s, 0, 0, P * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function hills(ctx, W, H, off, cols) {
  cols.forEach(([y, c, k], i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, y + Math.sin((x + off * k) * 0.02 + i) * 10);
    ctx.lineTo(W, H);
    ctx.fill();
  });
}

function sun(ctx, x, y, r, t) {
  ctx.fillStyle = '#ffe680';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, P * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffe680';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * P * 2 + t * 0.4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6));
    ctx.lineTo(x + Math.cos(a) * (r + 13), y + Math.sin(a) * (r + 13));
    ctx.stroke();
  }
  ctx.fillStyle = '#c98a2a';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + s * r * 0.35, y - r * 0.15, r * 0.1, 0, P * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#c98a2a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y + r * 0.1, r * 0.35, 0.3, P - 0.3);
  ctx.stroke();
}

function flowerRow(ctx, W, y, off) {
  const cols = ['#ff7fa3', '#ffd166', '#ffffff', '#c7a6ff'];
  for (let i = 0; i < 18; i++) {
    const x = ((i * 37 - off) % (W + 40) + W + 40) % (W + 40) - 20;
    ctx.fillStyle = cols[i % 4];
    ctx.beginPath();
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * P * 2;
      ctx.moveTo(x, y);
      ctx.arc(x + Math.cos(a) * 4, y + (i % 3) * 6 + Math.sin(a) * 4, 3.4, 0, P * 2);
    }
    ctx.fill();
  }
}

function balloon(ctx, x, y, t) {
  const cols = ['#ef5b6f', '#ffffff', '#ffd166', '#ffffff', '#6fb8ff', '#ffffff'];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 1.2) * 0.05);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = cols[i];
    ctx.beginPath();
    ctx.ellipse(0, 0, 44 - i * 7.3, 50, 0, -P / 2, P / 2);
    ctx.ellipse(0, 0, 44 - i * 7.3, 50, 0, P / 2, P * 1.5);
    ctx.fill();
  }
  ctx.strokeStyle = '#9b6a43';
  ctx.lineWidth = 2;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 26, 40);
    ctx.lineTo(s * 16, 78);
    ctx.stroke();
  }
  ctx.fillStyle = '#c98a5a';
  ctx.beginPath();
  ctx.moveTo(-26, 78);
  ctx.lineTo(26, 78);
  ctx.lineTo(20, 104);
  ctx.lineTo(-20, 104);
  ctx.fill();
  bunny(ctx, -9, 64, 0.5);
  bear(ctx, 11, 66, 0.48, Math.sin(t * 6) * 0.4);
  ctx.fillStyle = '#c98a5a';
  ctx.fillRect(-26, 78, 52, 8);
  ctx.restore();
}

function stars(ctx, W, H, t) {
  ctx.fillStyle = '#fff6cf';
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(t * 2 + i * 1.7));
    const s = i % 5 ? 2 : 3;
    ctx.fillRect((i * 97) % W, (i * 53) % (H * 0.8), s, s);
  }
  ctx.globalAlpha = 1;
}

function fadeTo(ctx, W, H, a, color = '#000000') {
  if (a <= 0) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}

export function drawCartoon(ctx, W, H, time) {
  const t = ((time % LOOP) + LOOP) % LOOP;
  if (t < 10) {
    // Sunny meadow: the bunny hops after a butterfly, the bear waves
    sky(ctx, W, H, '#7fd0ff', '#d8f4ff');
    sun(ctx, W * 0.84, H * 0.2, 20, t);
    for (let i = 0; i < 3; i++) cloud(ctx, ((i * 190 - t * 12) % (W + 120) + W + 120) % (W + 120) - 60, 34 + i * 16, 0.9);
    hills(ctx, W, H, t * 20, [[H * 0.68, '#9ad97a', 0.5], [H * 0.8, '#6cc24a', 1]]);
    flowerRow(ctx, W, H * 0.86, t * 20);
    const bx = W * 0.15 + (t / 10) * W * 0.55;
    const hop = Math.abs(Math.sin(t * 4)) * 26;
    bunny(ctx, bx, H * 0.72 - hop, 0.9, { ear: hop * 0.005 });
    bear(ctx, W * 0.82, H * 0.73, 0.9, Math.sin(t * 7) * 0.5);
    const fx = bx + 56 + Math.sin(t * 2.2) * 14;
    const fy = H * 0.42 + Math.cos(t * 3) * 12;
    const flap = Math.abs(Math.sin(t * 14)) * 7 + 2;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.ellipse(fx - 5, fy, flap, 8, 0, 0, P * 2);
    ctx.ellipse(fx + 5, fy, flap, 8, 0, 0, P * 2);
    ctx.fill();
    if (t < 3) {
      // Title card
      const a = Math.min(1, t * 2, (3 - t) * 2);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(255,250,243,0.92)';
      ctx.beginPath();
      ctx.roundRect(W * 0.3, H * 0.1, W * 0.4, H * 0.26, 22);
      ctx.fill();
      ctx.fillStyle = '#ef5b6f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${H * 0.13}px ${FONT}`;
      ctx.fillText('Moon Bunny', W / 2, H * 0.23);
      ctx.globalAlpha = 1;
    }
    if (t > 7.5 && t < 9.5) {
      const k = (t - 7.5) / 2;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = '#ff6b8a';
      heartPath(ctx, (bx + W * 0.82) / 2, H * 0.5 - k * 40, 26);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    fadeTo(ctx, W, H, t > 9.55 ? (t - 9.55) / 0.45 : 0);
  } else if (t < 20) {
    // Balloon ride over the clouds
    const u = t - 10;
    sky(ctx, W, H, '#ffb7c9', '#ffe6b8');
    sun(ctx, W * 0.15, H * 0.75 - u * 3, 26, t);
    for (let i = 0; i < 7; i++) cloud(ctx, ((i * 97 - u * 22) % (W + 120) + W + 120) % (W + 120) - 60, H * 0.25 + ((i * 47) % 140) + u * 6, 1 + (i % 3) * 0.3, 0.95);
    for (let i = 0; i < 3; i++) {
      const x = ((i * 160 + u * 30) % (W + 60)) - 30;
      const y = 40 + i * 22 + Math.sin(u * 3 + i) * 4;
      ctx.strokeStyle = '#6b4a5a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 8, y);
      ctx.quadraticCurveTo(x - 4, y - 6 + Math.sin(u * 10 + i) * 3, x, y);
      ctx.quadraticCurveTo(x + 4, y - 6 + Math.sin(u * 10 + i) * 3, x + 8, y);
      ctx.stroke();
    }
    balloon(ctx, W * 0.5 + Math.sin(u * 0.6) * 40, H * 0.36 - Math.sin(u * 0.9) * 10, t);
    fadeTo(ctx, W, H, Math.max(u < 0.45 ? 1 - u / 0.45 : 0, u > 9.55 ? (u - 9.55) / 0.45 : 0));
  } else {
    // Starry night: sitting on the moon, a shooting star and floating hearts
    const u = t - 20;
    sky(ctx, W, H, '#1d2350', '#5a3f8a');
    stars(ctx, W, H, t);
    if (u > 2 && u < 6) {
      const k = (u - 2) / 4;
      const x = W * (0.1 + k * 0.7);
      const y = H * (0.15 + k * 0.2);
      const g = ctx.createLinearGradient(x - 60, y - 16, x, y);
      g.addColorStop(0, 'rgba(255,246,207,0)');
      g.addColorStop(1, 'rgba(255,246,207,1)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 60, y - 16);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    // The crescent moon with the two friends on top
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.arc(W * 0.5, H * 0.95, 92, P, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(220,200,120,0.5)';
    for (const [x, y, r] of [[-40, 0.86, 10], [26, 0.8, 8], [52, 0.92, 6]]) {
      ctx.beginPath();
      ctx.arc(W * 0.5 + x, H * y, r, 0, P * 2);
      ctx.fill();
    }
    bunny(ctx, W * 0.46, H * 0.52 + Math.sin(u * 2) * 2, 0.8);
    bear(ctx, W * 0.56, H * 0.53, 0.78, Math.sin(u * 3) * 0.2);
    for (let i = 0; i < 4; i++) {
      const k = ((u * 0.35 + i * 0.25) % 1);
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = i % 2 ? '#ff9eb5' : '#ff6b8a';
      heartPath(ctx, W * 0.51 + Math.sin(k * 6 + i) * 30, H * 0.36 - k * 70, 12 + i * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (u > 7.5) {
      const a = Math.min(1, (u - 7.5) * 2, (10 - u) * 2.2);
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = '#fff6dc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${H * 0.12}px ${FONT}`;
      ctx.fillText('The End', W / 2, H * 0.2);
      ctx.globalAlpha = 1;
    }
    fadeTo(ctx, W, H, Math.max(u < 0.45 ? 1 - u / 0.45 : 0, u > 9.55 ? (u - 9.55) / 0.45 : 0));
  }
}
