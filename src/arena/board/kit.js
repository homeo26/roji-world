import * as THREE from 'three';
import { mat, umat, mesh, canvasTexture, roundRect, FONT, clamp } from '../../util.js';
import { box, rbox, cyl, ball, cone, at, bakeVC, bakeLiveKid, overlay } from '../riding/kit.js';

// Shared pieces for the board games: player colours, a game-time scheduler, camera framing,
// the turn pill, a floating turn marker, a thought bubble and small wooden sounds.

export { box, rbox, cyl, ball, cone, at, bakeVC, bakeLiveKid, overlay, mat, umat, mesh, canvasTexture, roundRect, FONT };

export const PURPLE = '#8b5cf6';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

const rgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
const luma = (h) => {
  const [r, g, b] = rgb(h);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
const gap = (a, b) => {
  const x = rgb(a);
  const y = rgb(b);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};

// Piece colours from the players' tops, unless too light, too close to the board purple, or too close to each other.
export function playerColors(a, b) {
  const ok = (c) => /^#[0-9a-f]{6}$/i.test(c || '') && luma(c) < 0.82 && gap(c, PURPLE) > 80;
  let x = ok(a) ? a : '#ef5b6f';
  let y = ok(b) ? b : '#3f7bf0';
  if (gap(x, y) < 120) {
    x = '#ef5b6f';
    y = '#3f7bf0';
  }
  return [x, y];
}

export const shade = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Promises that resolve after some game time (so they follow dt and stop when the game is closed).
export function scheduler() {
  const list = [];
  return {
    wait: (sec) => new Promise((r) => list.push({ t: sec, r })),
    update(dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        list[i].t -= dt;
        if (list[i].t <= 0) list.splice(i, 1)[0].r();
      }
    },
  };
}

// Place the camera on `dir` from `look` so every point fits, leaving room for the HUD.
// pad: fractions of the screen kept clear { top, bottom, side }. Returns { pos, target }.
const _f = V();
const _r = V();
const _u = V();
const _d = V();
const UP = V(0, 1, 0);
export function frame(camera, look, dir, pts, pad = {}) {
  const { top = 0.12, bottom = 0.05, side = 0.04 } = pad;
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const tanH = tanV * camera.aspect;
  _f.copy(dir).negate().normalize();
  _r.crossVectors(_f, UP).normalize();
  _u.crossVectors(_r, _f);
  const yLo = -1 + 2 * bottom;
  const yHi = 1 - 2 * top;
  const xLo = -1 + 2 * side;
  const xHi = 1 - 2 * side;
  const hy = (yHi - yLo) / 2;
  const hx = (xHi - xLo) / 2;
  const t = look.clone();
  let D = 1;
  for (let it = 0; it < 5; it++) {
    D = 0.5;
    for (const p of pts) {
      _d.subVectors(p, t);
      const z = _d.dot(dir);
      D = Math.max(D, z + Math.abs(_d.dot(_r)) / (tanH * hx), z + Math.abs(_d.dot(_u)) / (tanV * hy));
    }
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of pts) {
      _d.subVectors(p, t);
      const depth = D - _d.dot(dir);
      const x = _d.dot(_r) / (depth * tanH);
      const y = _d.dot(_u) / (depth * tanV);
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    const dx = (x0 + x1) / 2 - (xLo + xHi) / 2;
    const dy = (y0 + y1) / 2 - (yLo + yHi) / 2;
    t.addScaledVector(_r, dx * D * tanH * 0.9).addScaledVector(_u, dy * D * tanV * 0.9);
  }
  return { pos: t.clone().addScaledVector(dir, D), target: t };
}

// ------------------------------------------------------------------ turn pill and score
const CSS = `
.bg-turn { position: absolute; left: 50%; top: max(12px, env(safe-area-inset-top)); transform: translateX(-50%); display: flex; align-items: center; gap: 8px; background: rgba(255,250,244,.95); border-radius: 999px; padding: 6px 16px 6px 8px; font-weight: 700; font-size: 1.02rem; box-shadow: 0 0 0 3px var(--c, #fff), 0 6px 18px rgba(60,30,40,.16); white-space: nowrap; transition: opacity .2s, box-shadow .25s; }
.bg-turn:empty, .bg-turn.off { opacity: 0; }
.bg-turn svg { width: 26px; height: 26px; flex: none; }
.bg-turn.pop { animation: bg-pop .4s cubic-bezier(.3,1.6,.5,1); }
@keyframes bg-pop { from { transform: translateX(-50%) scale(.8); } }
.bg-dots { display: inline-flex; gap: 3px; margin-left: 2px; }
.bg-dots i { width: 6px; height: 6px; border-radius: 50%; background: var(--c); animation: bg-dot 1s infinite ease-in-out; }
.bg-dots i:nth-child(2) { animation-delay: .15s; } .bg-dots i:nth-child(3) { animation-delay: .3s; }
@keyframes bg-dot { 0%, 80%, 100% { transform: translateY(0); opacity: .45; } 40% { transform: translateY(-4px); opacity: 1; } }
.bg-word { position: absolute; left: 50%; top: 33%; transform: translate(-50%, -50%) scale(.6); font-weight: 700; font-size: clamp(1.6rem, 6vw, 3.2rem); color: #fff; text-shadow: 0 4px 0 rgba(0,0,0,.16), 0 10px 26px rgba(0,0,0,.24); opacity: 0; transition: opacity .15s, transform .25s cubic-bezier(.2,1.5,.4,1); white-space: nowrap; }
.bg-word.on { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.bg-say { position: absolute; left: 50%; bottom: max(52px, calc(env(safe-area-inset-bottom) + 48px)); transform: translateX(-50%); background: rgba(255,250,244,.93); border-radius: 999px; padding: 5px 14px; font-weight: 600; font-size: .92rem; box-shadow: 0 6px 18px rgba(60,30,40,.12); white-space: nowrap; }
.bg-say:empty { display: none; }
body.touch .bg-say { bottom: max(12px, env(safe-area-inset-bottom)); }
body.touch .bg-turn { top: auto; bottom: max(10px, env(safe-area-inset-bottom)); }
body.touch .bg-turn ~ .bg-say { bottom: max(54px, calc(env(safe-area-inset-bottom) + 44px)); }
@media (max-width: 900px) { .bg-turn { font-size: .9rem; padding: 4px 12px 4px 6px; } .bg-turn svg { width: 22px; height: 22px; } }
`;

export const markSvg = {
  X: (c) => `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke="${c}" stroke-width="4.4" stroke-linecap="round" fill="none"/></svg>`,
  O: (c) => `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" stroke="${c}" stroke-width="4.2" fill="none"/></svg>`,
  disc: (c) => `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${c}"/><circle cx="12" cy="12" r="6" fill="none" stroke="rgba(0,0,0,.16)" stroke-width="2"/><ellipse cx="8.5" cy="8" rx="2.6" ry="1.5" fill="#fff" opacity=".45" transform="rotate(-35 8.5 8)"/></svg>`,
  face: (c) => `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${c}"/><circle cx="9" cy="10.5" r="1.4" fill="#fff"/><circle cx="15" cy="10.5" r="1.4" fill="#fff"/><path d="M8.5 14.5q3.5 3 7 0" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>`,
};

export function boardUi() {
  const ui = overlay(CSS, `<div class="bg-turn off"></div><div class="bg-word"></div><div class="bg-say"></div>`);
  const turnEl = ui.$('.bg-turn');
  const wordEl = ui.$('.bg-word');
  const sayEl = ui.$('.bg-say');
  let last = '';
  let wordTimer = 0;
  let sayTimer = 0;
  return {
    // icon: svg string, color: ring colour, text, thinking: show bouncing dots
    turn(icon, color, text, thinking = false) {
      const html = `${icon}<span>${esc(text)}</span>${thinking ? '<span class="bg-dots"><i></i><i></i><i></i></span>' : ''}`;
      turnEl.style.setProperty('--c', color);
      if (html === last && !turnEl.classList.contains('off')) return;
      last = html;
      turnEl.innerHTML = html;
      turnEl.classList.remove('off', 'pop');
      void turnEl.offsetWidth;
      turnEl.classList.add('pop');
    },
    hideTurn() {
      turnEl.classList.add('off');
    },
    word(html, color = '#fff', ms = 800) {
      wordEl.innerHTML = html;
      wordEl.style.color = color;
      wordEl.classList.remove('on');
      void wordEl.offsetWidth;
      wordEl.classList.add('on');
      clearTimeout(wordTimer);
      wordTimer = setTimeout(() => wordEl.classList.remove('on'), ms);
    },
    say(text, ms = 2400) {
      sayEl.textContent = text || '';
      clearTimeout(sayTimer);
      if (text && ms > 0) sayTimer = setTimeout(() => (sayEl.textContent = ''), ms);
    },
    remove() {
      clearTimeout(wordTimer);
      clearTimeout(sayTimer);
      ui.remove();
    },
  };
}

// "Play the computer" or "Two players". Resolves 'cpu' | 'duo' | null (closed).
export async function chooseMode(ctx, { title, text, cpuSub, duoSub }) {
  const p = ctx.looks[ctx.partner].name;
  return ctx.hud.choose({
    title,
    text,
    options: [
      { id: 'cpu', label: 'Play the computer', sub: cpuSub || `${p} is played by the computer` },
      { id: 'duo', label: 'Two players', sub: duoSub || 'Pass the device between turns' },
    ],
  });
}

// Close any choice card the game left open (it resolves to null).
export function closeChoices() {
  for (const el of document.querySelectorAll('.choose')) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

// ------------------------------------------------------------------ 3D bits
export function glowTex() {
  return canvasTexture(64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  });
}

export function glow(tex, color, size, opacity = 0.8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, opacity, toneMapped: false }));
  s.scale.setScalar(size);
  return s;
}

// A thought cloud with three bouncing dots, for a player who is thinking.
export function thoughtBubble() {
  const cloud = canvasTexture(256, 192, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.strokeStyle = 'rgba(59,43,63,0.18)';
    c.lineWidth = 6;
    const blobs = [[128, 80, 62], [72, 90, 42], [184, 90, 42], [100, 50, 40], [156, 50, 40], [128, 112, 40], [128, 158, 13], [128, 182, 7]];
    for (const pass of [0, 1]) {
      for (const [x, y, r] of blobs) {
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        if (pass === 0) c.stroke();
        else c.fill();
      }
    }
  });
  const dotTex = canvasTexture(32, 32, (c) => {
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(16, 16, 14, 0, Math.PI * 2);
    c.fill();
  });
  const g = new THREE.Group();
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloud, transparent: true, depthWrite: false }));
  s.scale.set(0.56, 0.42, 1);
  s.center.set(0.5, 0);
  s.renderOrder = 5;
  g.add(s);
  const dots = [];
  for (let i = 0; i < 3; i++) {
    const d = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: '#8b5cf6', transparent: true, depthWrite: false, depthTest: false }));
    d.scale.setScalar(0.07);
    d.renderOrder = 6;
    g.add(d);
    dots.push(d);
  }
  g.visible = false;
  let k = 0;
  return {
    group: g,
    show(on) {
      if (on && !g.visible) k = 0;
      g.visible = on;
    },
    update(dt, t) {
      if (!g.visible) return;
      k = Math.min(1, k + dt * 5);
      s.scale.set(0.56 * k, 0.42 * k, 1);
      dots.forEach((d, i) => {
        d.position.set((i - 1) * 0.1, 0.27 + Math.max(0, Math.sin(t * 7 - i * 0.9)) * 0.04, 0.01);
        d.visible = k > 0.8;
      });
    },
  };
}

// Little wooden and plastic sounds.
export function sounds(sound) {
  const tone = (f, d, o, when = 0) => {
    if (sound?.ctx && !sound.muted) sound.tone(f, sound.ctx.currentTime + when, d, o);
  };
  return {
    tone,
    tok(k = 1) {
      tone(520 * k, 0.07, { type: 'triangle', gain: 0.09, slideTo: 300 * k });
      tone(1250 * k, 0.04, { type: 'sine', gain: 0.03 });
    },
    clack(k = 1) {
      tone(900 * k, 0.05, { type: 'square', gain: 0.03, slideTo: 500 * k });
      tone(380 * k, 0.08, { type: 'triangle', gain: 0.07, slideTo: 220 * k });
    },
    whoosh() {
      tone(300, 0.18, { type: 'sine', gain: 0.04, slideTo: 900 });
    },
    sparkle() {
      [1568, 1976, 2349, 3136].forEach((f, i) => tone(f, 0.16, { gain: 0.035 }, i * 0.06));
    },
    hmm() {
      tone(240, 0.22, { type: 'triangle', gain: 0.03, slideTo: 300 });
      tone(300, 0.2, { type: 'triangle', gain: 0.025, slideTo: 260 }, 0.22);
    },
    giggle() {
      [660, 784, 660, 880].forEach((f, i) => tone(f, 0.07, { type: 'triangle', gain: 0.035 }, i * 0.08));
    },
  };
}

export { clamp };
