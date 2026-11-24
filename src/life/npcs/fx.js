// Small effects for moments with people: sparkles, floating music notes, a camera flash, a polaroid
// card for selfies, and a few synthesized sounds (clap, shutter, heartbeat, beeps, a jingle).
import { avatar } from '../../games/avatar.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function starTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.25, 'rgba(255,255,255,0.65)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? 7 : 30;
    g.lineTo(32 + Math.cos(a) * rr, 32 + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function noteTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#ffffff';
  g.lineWidth = 6;
  g.lineCap = 'round';
  g.beginPath();
  g.ellipse(20, 47, 11, 8, -0.4, 0, Math.PI * 2);
  g.ellipse(46, 41, 11, 8, -0.4, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(29, 45);
  g.lineTo(29, 12);
  g.lineTo(55, 6);
  g.lineTo(55, 39);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Sparkles {
  constructor(THREE, scene) {
    this.THREE = THREE;
    this.star = starTexture(THREE);
    this.note = noteTexture(THREE);
    this.parts = [];
    for (let i = 0; i < 36; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.star, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
      s.visible = false;
      s.renderOrder = 6;
      scene.add(s);
      this.parts.push({ s, v: new THREE.Vector3(), life: 0, max: 1, size: 0.2 });
    }
    this.next = 0;
  }

  spawn(pos, color, { note = false, size = 0.18, life = 0.7, vx = 0, vy = 1, vz = 0 } = {}) {
    const p = this.parts[this.next];
    this.next = (this.next + 1) % this.parts.length;
    p.s.material.map = note ? this.note : this.star;
    p.s.material.color.set(color);
    p.s.material.opacity = 1;
    p.s.position.copy(pos);
    p.v.set(vx, vy, vz);
    p.life = p.max = life;
    p.size = size;
    p.note = note;
    p.s.visible = true;
  }

  // A little star burst (a high five, a stamp, a selfie flash)
  burst(pos, colors = ['#ffd166', '#ffffff', '#ff8fb1'], n = 8, spread = 1.6) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const sp = spread * (0.6 + Math.random() * 0.6);
      this.spawn(pos, colors[i % colors.length], { size: 0.12 + Math.random() * 0.12, life: 0.45 + Math.random() * 0.3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8 + 0.4, vz: (Math.random() - 0.5) * 0.6 });
    }
  }

  notes(pos, n = 1) {
    const colors = ['#ef5b6f', '#7f6bd8', '#21a99a', '#f59f3a'];
    for (let i = 0; i < n; i++) {
      this.spawn(pos, colors[Math.floor(Math.random() * colors.length)], { note: true, size: 0.26, life: 1.3, vx: (Math.random() - 0.5) * 0.5, vy: 0.9, vz: (Math.random() - 0.5) * 0.2 });
    }
  }

  update(dt) {
    for (const p of this.parts) {
      if (!p.s.visible) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.s.visible = false;
        continue;
      }
      const k = p.life / p.max;
      p.s.position.addScaledVector(p.v, dt);
      p.v.multiplyScalar(Math.exp(-(p.note ? 0.8 : 4) * dt));
      if (p.note) p.s.position.x += Math.sin(p.life * 7) * 0.004;
      const pop = Math.min(1, (1 - k) * 8);
      p.s.scale.setScalar(p.size * pop * (p.note ? 1 : 0.6 + k * 0.6));
      p.s.material.opacity = Math.min(1, k * 2.2);
      p.s.material.rotation = p.note ? Math.sin(p.life * 4) * 0.25 : p.life * 3;
    }
  }
}

// ------------------------------------------------------------------ sounds
export function makeSounds(sound) {
  const ok = () => sound?.ctx && !sound.muted;
  const noise = (t, dur, { freq = 1800, q = 1.2, gain = 0.25, type = 'bandpass' } = {}) => {
    const ctx = sound.ctx;
    const len = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(sound.sfx || ctx.destination);
    src.start(t);
  };
  const tone = (...a) => sound.tone(...a);
  return {
    clap() {
      if (!ok()) return;
      const t = sound.ctx.currentTime;
      noise(t, 0.09, { freq: 1500, q: 0.9, gain: 0.5 });
      noise(t + 0.012, 0.07, { freq: 2400, q: 1.4, gain: 0.25 });
    },
    shutter() {
      if (!ok()) return;
      const t = sound.ctx.currentTime;
      noise(t, 0.04, { freq: 4200, q: 0.7, gain: 0.35, type: 'highpass' });
      noise(t + 0.07, 0.05, { freq: 2600, q: 0.8, gain: 0.3 });
      tone(1760, t + 0.12, 0.08, { gain: 0.03, type: 'triangle' });
    },
    heartbeat() {
      if (!ok()) return;
      const t = sound.ctx.currentTime;
      for (const d of [0, 0.2, 0.75, 0.95]) tone(d % 0.75 ? 62 : 74, t + d, 0.14, { gain: 0.3, slideTo: 45 });
    },
    stamp() {
      if (!ok()) return;
      const t = sound.ctx.currentTime;
      tone(130, t, 0.16, { gain: 0.24, slideTo: 48 });
      noise(t, 0.06, { freq: 500, q: 0.7, gain: 0.25 });
    },
    beep(i) {
      if (!ok()) return;
      tone([880, 660, 990, 740][i % 4], sound.ctx.currentTime, 0.07, { gain: 0.025, type: 'square' });
    },
    shake() {
      if (!ok()) return;
      noise(sound.ctx.currentTime, 0.07, { freq: 6000, q: 0.6, gain: 0.12, type: 'highpass' });
    },
    twinkle() {
      if (!ok()) return;
      const t = sound.ctx.currentTime;
      tone(1568, t, 0.14, { gain: 0.025, type: 'triangle' });
      tone(2093, t + 0.06, 0.18, { gain: 0.02, type: 'triangle' });
    },
    tap() {
      if (!ok()) return;
      noise(sound.ctx.currentTime, 0.05, { freq: 900, q: 0.8, gain: 0.12 });
    },
    // A cheerful four-bar tune for dancing with someone (C major, triangle and sine)
    jingle() {
      if (!ok()) return;
      const t = sound.ctx.currentTime + 0.05;
      const N = (m) => 440 * Math.pow(2, (m - 69) / 12);
      const mel = [72, 76, 79, 76, 77, 74, 71, 74, 72, 76, 79, 84];
      mel.forEach((m, i) => tone(N(m), t + i * 0.22, 0.28, { gain: 0.045, type: 'triangle' }));
      [48, 53, 55, 48].forEach((m, i) => tone(N(m), t + i * 0.66, 0.6, { gain: 0.05 }));
    },
  };
}

// ------------------------------------------------------------------ camera flash and polaroid
const CSS = `
.rw-flash { position: fixed; inset: 0; background: #fff; pointer-events: none; z-index: 65; opacity: 0; }
.rw-polaroid { position: fixed; left: 50%; top: 22%; z-index: 64; pointer-events: none; width: 196px; padding: 10px 10px 8px; background: #fffdf8; border-radius: 6px;
  box-shadow: 0 14px 34px rgba(52, 40, 70, .3), 0 2px 6px rgba(52, 40, 70, .15); font-family: var(--font, 'Fredoka', system-ui, sans-serif); color: #3b2b3f; text-align: center; }
.rw-polaroid .rw-photo { height: 112px; border-radius: 3px; display: flex; align-items: flex-end; justify-content: center; gap: 0; overflow: hidden;
  background: linear-gradient(180deg, #bfe9f2 0%, #e8f6f0 58%, #a9dc8a 58%, #8ccc72 100%); position: relative; }
.rw-polaroid .rw-photo .avatar { margin: 0 -9px -6px; filter: drop-shadow(0 3px 2px rgba(0,0,0,.12)); }
.rw-polaroid .rw-photo .rw-sun { position: absolute; right: 14px; top: 12px; width: 18px; height: 18px; border-radius: 50%; background: #ffe08a; box-shadow: 0 0 12px #ffe08a; }
.rw-polaroid .rw-photo .rw-heart { position: absolute; left: 12px; top: 10px; color: #ef5b6f; display: grid; }
.rw-polaroid b { display: block; margin-top: 7px; font-size: .92rem; font-weight: 600; line-height: 1.15; }
.rw-polaroid small { display: block; font-size: .7rem; color: #7a6470; margin-top: 2px; line-height: 1.2; }
@media (max-height: 520px) { .rw-polaroid { width: 182px; padding: 8px 8px 6px; } .rw-polaroid .rw-photo { height: 84px; } .rw-polaroid .rw-photo .avatar { width: 58px; height: 58px; }
  .rw-polaroid b { font-size: .8rem; margin-top: 5px; } .rw-polaroid small { font-size: .62rem; } }
`;
function ensureStyle() {
  if (document.getElementById('rw-npcs-style')) return;
  const s = document.createElement('style');
  s.id = 'rw-npcs-style';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function cameraFlash() {
  ensureStyle();
  const el = document.createElement('div');
  el.className = 'rw-flash';
  document.body.appendChild(el);
  el.animate([{ opacity: 0.85 }, { opacity: 0 }], { duration: 420, easing: 'ease-out' }).onfinish = () => el.remove();
}

// people: looks to show in the photo, left to right. caption and sub: short text.
export function polaroid(people, caption, sub) {
  ensureStyle();
  document.querySelector('.rw-polaroid')?.remove();
  const el = document.createElement('div');
  el.className = 'rw-polaroid';
  const heart = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 19.5s-7-4.3-7-9.7A3.9 3.9 0 0 1 12 7.4a3.9 3.9 0 0 1 7 2.4c0 5.4-7 9.7-7 9.7z"/></svg>';
  el.innerHTML = `<div class="rw-photo"><span class="rw-sun"></span><span class="rw-heart">${heart}</span>${people.map((l) => avatar(l, 74)).join('')}</div><b>${esc(caption)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`;
  document.body.appendChild(el);
  // Phones in landscape: on the right, clear of the welcome line and the station card
  const phone = window.innerHeight < 520;
  if (phone) {
    el.style.left = `${Math.max(8, window.innerWidth - 182 - Math.max(16, window.innerWidth * 0.04))}px`;
    el.style.top = '58px';
  }
  const tx = phone ? '0' : '-50%';
  const tilt = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 3);
  el.animate(
    [
      { transform: `translate(${tx}, 30px) rotate(${tilt * 2}deg) scale(.7)`, opacity: 0 },
      { transform: `translate(${tx}, 0) rotate(${tilt}deg) scale(1.04)`, opacity: 1, offset: 0.12 },
      { transform: `translate(${tx}, 0) rotate(${tilt}deg) scale(1)`, opacity: 1, offset: 0.85 },
      { transform: `translate(${tx}, -20px) rotate(${tilt}deg) scale(.96)`, opacity: 0 },
    ],
    { duration: 3600, easing: 'ease-out' },
  ).onfinish = () => el.remove();
}
