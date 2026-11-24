import { THREE } from '../../places/school/kit.js';
import { FONT, heartPath, P } from './films/common.js';

// Little bubbles over people's heads in the cinema: a whisper (dotted, with thought dots),
// a normal line (a pointed tail) or a heart. They always draw on top so the seats never hide them.

const CW = 512;
const CH = 200;
const phone = () => typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 520;

function wrapLines(ctx, s, maxW) {
  const words = s.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

export class Bubble {
  constructor(parent) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = CW;
    this.canvas.height = CH;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthTest: false, depthWrite: false }));
    this.sprite.renderOrder = 20;
    this.sprite.visible = false;
    this.sprite.center.set(0.5, 0);
    parent.add(this.sprite);
    this.t = 0;
    this.dur = 0;
    this.base = 1;
  }

  // kind: 'whisper' | 'say' | 'heart'. side: -1 / 1 moves the tail toward the speaker.
  say(text, { kind = 'say', dur = 3, side = 0 } = {}) {
    const c = this.ctx;
    c.clearRect(0, 0, CW, CH);
    c.font = `600 44px ${FONT}`;
    const lines = kind === 'heart' ? [] : wrapLines(c, text, CW - 90);
    const lh = 50;
    const tw = kind === 'heart' ? 110 : Math.min(CW - 30, Math.max(140, ...lines.map((l) => c.measureText(l).width)) + 60);
    const th = kind === 'heart' ? 96 : lines.length * lh + 34;
    const x0 = (CW - tw) / 2;
    const y0 = CH - 44 - th;
    c.fillStyle = kind === 'whisper' ? 'rgba(255,248,252,0.96)' : '#fffaf2';
    c.strokeStyle = kind === 'whisper' ? '#e58aa8' : '#6b1f33';
    c.lineWidth = 5;
    c.beginPath();
    c.roundRect(x0, y0, tw, th, 34);
    c.fill();
    if (kind === 'whisper') c.setLineDash([10, 8]);
    c.stroke();
    c.setLineDash([]);
    const tx = CW / 2 + side * Math.min(80, tw * 0.25);
    if (kind === 'whisper' || kind === 'heart') {
      for (const [dx, dy, r] of [[0, 14, 9], [side * 10, 30, 6]]) {
        c.beginPath();
        c.arc(tx + dx, y0 + th + dy, r, 0, P * 2);
        c.fill();
        c.stroke();
      }
    } else {
      c.beginPath();
      c.moveTo(tx - 16, y0 + th - 3);
      c.lineTo(tx + side * 14, y0 + th + 30);
      c.lineTo(tx + 16, y0 + th - 3);
      c.fill();
      c.stroke();
      c.fillStyle = '#fffaf2';
      c.fillRect(tx - 13, y0 + th - 8, 26, 7);
    }
    if (kind === 'heart') {
      c.fillStyle = '#ef5b6f';
      heartPath(c, CW / 2, y0 + th / 2 + 4, 58);
      c.fill();
    } else {
      c.fillStyle = kind === 'whisper' ? '#8a2a4a' : '#3b2b3f';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      if (kind === 'whisper') c.font = `italic 600 44px ${FONT}`;
      lines.forEach((l, i) => c.fillText(l, CW / 2, y0 + 17 + lh * (i + 0.5) + 2));
    }
    this.tex.needsUpdate = true;
    this.t = 0;
    this.dur = dur;
    this.base = phone() ? 1.3 : 1;
    this.sprite.visible = true;
  }

  hide() {
    this.dur = 0;
    this.sprite.visible = false;
  }

  // pos: where the bottom of the tail sits (in the parent's coordinates)
  update(dt, pos) {
    if (!this.sprite.visible) return;
    this.t += dt;
    const pop = Math.min(1, this.t * 6);
    const out = Math.min(1, Math.max(0, (this.dur - this.t) * 4));
    const k = Math.min(pop, out);
    const s = this.base * (0.6 + 0.4 * k) * 1.55;
    this.sprite.scale.set(s, (s * CH) / CW, 1);
    this.sprite.material.opacity = k;
    this.sprite.position.copy(pos);
    if (this.t >= this.dur) this.sprite.visible = false;
  }

  dispose() {
    this.sprite.removeFromParent();
    this.tex.dispose();
    this.sprite.material.dispose();
  }
}
