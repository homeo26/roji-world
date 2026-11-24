import { THREE, canvasTexture, roundRect, FONT } from './kit.js';
import { easeOutBack } from '../../util.js';

// Little speech bubbles over Roji's and Homama's heads, with small drawn icons instead of emoji:
// say(actor, kind, { dur, text }) where kind is one of the icon names below or 'text'.

const W = 256;
const H = 200;

function heartPath(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.75);
  ctx.bezierCurveTo(cx - s * 1.3, cy - s * 0.1, cx - s * 0.75, cy - s * 1.05, cx, cy - s * 0.4);
  ctx.bezierCurveTo(cx + s * 0.75, cy - s * 1.05, cx + s * 1.3, cy - s * 0.1, cx, cy + s * 0.75);
}

const ICONS = {
  scribble(ctx, cx, cy) {
    ctx.strokeStyle = '#6a5662';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      const y = cy - 22 + j * 22;
      const len = [70, 54, 62][j];
      for (let x = 0; x <= len; x += 6) ctx.lineTo(cx - 36 + x, y + Math.sin(x * 0.35 + j) * 5);
      ctx.stroke();
    }
  },
  cross(ctx, cx, cy) {
    ctx.fillStyle = '#ef5b6f';
    roundRect(ctx, cx - 12, cy - 34, 24, 68, 6);
    ctx.fill();
    roundRect(ctx, cx - 34, cy - 12, 68, 24, 6);
    ctx.fill();
  },
  bandage(ctx, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#ffc9a6';
    roundRect(ctx, -46, -16, 92, 32, 16);
    ctx.fill();
    ctx.fillStyle = '#ffe7d6';
    ctx.fillRect(-14, -16, 28, 32);
    ctx.fillStyle = '#e8a985';
    for (const [x, y] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  laugh(ctx, cx, cy) {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(cx, cy, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + s * 13, cy - 6, 7, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath();
    ctx.arc(cx, cy + 8, 16, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#ff8fb1';
    ctx.beginPath();
    ctx.arc(cx, cy + 17, 7, 0, Math.PI);
    ctx.fill();
  },
  cloud(ctx, cx, cy) {
    ctx.fillStyle = '#b9c3d6';
    ctx.beginPath();
    ctx.arc(cx - 18, cy - 4, 18, 0, Math.PI * 2);
    ctx.arc(cx + 4, cy - 14, 22, 0, Math.PI * 2);
    ctx.arc(cx + 24, cy - 2, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 18, cy - 4, 42, 18);
    ctx.fillStyle = '#7fb0ff';
    for (const [x, y] of [[-14, 26], [4, 32], [20, 24]]) {
      ctx.beginPath();
      ctx.moveTo(cx + x, cy + y - 10);
      ctx.quadraticCurveTo(cx + x + 6, cy + y, cx + x, cy + y + 4);
      ctx.quadraticCurveTo(cx + x - 6, cy + y, cx + x, cy + y - 10);
      ctx.fill();
    }
  },
  question(ctx, cx, cy) {
    ctx.fillStyle = '#8b5cf6';
    ctx.font = `700 82px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', cx, cy + 4);
  },
  excl(ctx, cx, cy) {
    ctx.fillStyle = '#ef5b6f';
    ctx.font = `700 82px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', cx, cy + 4);
  },
  star(ctx, cx, cy) {
    ctx.fillStyle = '#ffc93c';
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? 16 : 38;
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.fill();
    ctx.strokeStyle = '#ff9eb5';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (const [x, y] of [[-46, -26], [46, -20], [40, 30]]) {
      ctx.beginPath();
      ctx.moveTo(cx + x * 0.8, cy + y * 0.8);
      ctx.lineTo(cx + x, cy + y);
      ctx.stroke();
    }
  },
  eyes(ctx, cx, cy) {
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#3b2b3f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(cx + s * 20, cy, 15, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#3b2b3f';
      ctx.beginPath();
      ctx.arc(cx + s * 20 + 7, cy + 2, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ef5b6f';
    ctx.font = `600 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('psst', cx, cy + 40);
  },
  heart(ctx, cx, cy) {
    ctx.fillStyle = '#ff6b8a';
    heartPath(ctx, cx, cy + 4, 34);
    ctx.fill();
  },
  hearts(ctx, cx, cy) {
    ctx.fillStyle = '#ff6b8a';
    heartPath(ctx, cx - 16, cy + 6, 24);
    ctx.fill();
    ctx.fillStyle = '#ff9eb5';
    heartPath(ctx, cx + 22, cy - 10, 16);
    ctx.fill();
  },
  dots(ctx, cx, cy) {
    ctx.fillStyle = '#6a5662';
    for (const x of [-26, 0, 26]) {
      ctx.beginPath();
      ctx.arc(cx + x, cy, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  sun(ctx, cx, cy) {
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 28, cy + Math.sin(a) * 28);
      ctx.lineTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();
  },
  note(ctx, cx, cy) {
    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.ellipse(cx - 14, cy + 22, 13, 10, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 4, cy - 34, 6, 58);
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy - 34);
    ctx.quadraticCurveTo(cx + 30, cy - 24, cx + 22, cy - 4);
    ctx.quadraticCurveTo(cx + 22, cy - 20, cx + 2, cy - 22);
    ctx.fill();
  },
  zzz(ctx, cx, cy) {
    ctx.fillStyle = '#7b6aa8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 40px ${FONT}`;
    ctx.fillText('z', cx - 22, cy + 14);
    ctx.font = `700 52px ${FONT}`;
    ctx.fillText('z', cx + 14, cy - 6);
  },
};

function bubbleCanvas(kind, text) {
  return canvasTexture(W, H, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(90,60,70,0.28)';
    ctx.lineWidth = 6;
    roundRect(ctx, 10, 10, W - 20, H - 56, 44);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W * 0.4, H - 50);
    ctx.lineTo(W * 0.47, H - 10);
    ctx.lineTo(W * 0.58, H - 50);
    ctx.fill();
    const cx = W / 2;
    const cy = (H - 46) / 2 + 6;
    if (kind === 'text') {
      ctx.fillStyle = '#4a3423';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let size = 56;
      ctx.font = `600 ${size}px ${FONT}`;
      while (ctx.measureText(text).width > W - 50 && size > 22) {
        size -= 2;
        ctx.font = `600 ${size}px ${FONT}`;
      }
      ctx.fillText(text, cx, cy + 2);
    } else (ICONS[kind] || ICONS.dots)(ctx, cx, cy);
  });
}

export function setupTalk(R) {
  const cache = new Map();
  const texFor = (kind, text) => {
    const key = kind === 'text' ? `t:${text}` : kind;
    if (!cache.has(key)) cache.set(key, bubbleCanvas(kind, text));
    return cache.get(key);
  };
  const slots = new Map(); // actor id -> { sprite, t, dur }
  const slotFor = (actor) => {
    if (!slots.has(actor.id)) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      s.renderOrder = 5;
      s.visible = false;
      R.g.add(s);
      slots.set(actor.id, { sprite: s, t: 0, dur: 0, actor });
    }
    return slots.get(actor.id);
  };
  const tmp = new THREE.Vector3();
  return {
    say(actor, kind, { dur = 2.2, text = '' } = {}) {
      if (!actor) return;
      const sl = slotFor(actor);
      sl.sprite.material.map = texFor(kind, text);
      sl.sprite.material.needsUpdate = true;
      sl.t = 0;
      sl.dur = dur;
      sl.actor = actor;
      sl.sprite.visible = true;
    },
    clear() {
      for (const sl of slots.values()) {
        sl.sprite.visible = false;
        sl.dur = 0;
      }
    },
    update(dt, t) {
      for (const sl of slots.values()) {
        if (!sl.sprite.visible) continue;
        sl.t += dt;
        if (sl.t > sl.dur) {
          sl.sprite.visible = false;
          continue;
        }
        const k = Math.min(1, sl.t / 0.28);
        const out = Math.min(1, (sl.dur - sl.t) / 0.25);
        const s = Math.max(0.01, easeOutBack(k)) * 0.62 * (0.85 + 0.15 * out);
        sl.sprite.scale.set(s * 1.28, s, 1);
        sl.sprite.material.opacity = out;
        const w = R.headPos(sl.actor);
        tmp.copy(R.api.local(w));
        sl.sprite.position.set(tmp.x + 0.18, tmp.y + 0.12 + Math.sin(t * 3 + sl.t) * 0.03, tmp.z);
      }
    },
  };
}
