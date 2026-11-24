// Speech bubbles over people's heads: a canvas sprite that pops in, floats a little and fades.
// They keep the same size on screen (sizeAttenuation off) so they stay readable on a phone.

const W = 512;
const H = 200;
const P11 = 1 / Math.tan((40 / 2) * (Math.PI / 180)); // the game camera's vertical field of view is 40 degrees

export class Bubbles {
  constructor(THREE, scene, font) {
    this.THREE = THREE;
    this.font = font;
    this.slots = [];
    for (let i = 0; i < 4; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false, sizeAttenuation: false }));
      s.center.set(0.5, 0);
      s.renderOrder = 1000;
      s.visible = false;
      scene.add(s);
      this.slots.push({ s, canvas, tex, owner: null, anchor: null, t: 0, life: 0 });
    }
    this.tmp = new THREE.Vector3();
  }

  // owner: any object (a person) so a new line replaces their old one. anchor(): world Vector3 above the head.
  say(owner, anchor, text, { ms = 2600, accent = '#ef5b6f' } = {}) {
    let slot = this.slots.find((b) => b.owner === owner && b.life > 0);
    slot ||= this.slots.find((b) => b.life <= 0) || this.slots.reduce((a, b) => (a.life < b.life ? a : b));
    this.draw(slot, text, accent);
    slot.owner = owner;
    slot.anchor = anchor;
    slot.t = 0;
    slot.life = ms / 1000;
    slot.s.visible = true;
    return slot;
  }

  hide(owner) {
    for (const b of this.slots) if (b.owner === owner && b.life > 0.3) b.life = 0.3;
  }

  draw(slot, text, accent) {
    const g = slot.canvas.getContext('2d');
    g.clearRect(0, 0, W, H);
    g.font = `600 38px ${this.font}`;
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = '';
    for (const w of words) {
      const next = line ? line + ' ' + w : w;
      if (g.measureText(next).width > 420 && line) {
        lines.push(line);
        line = w;
      } else line = next;
    }
    if (line) lines.push(line);
    if (lines.length > 2) lines.splice(2, lines.length - 2, lines.slice(1).join(' '));
    const tw = Math.min(440, Math.max(...lines.map((l) => g.measureText(l).width)));
    const bw = tw + 52;
    const bh = lines.length * 44 + 30;
    const x = (W - bw) / 2;
    const y = H - 24 - bh;
    g.save();
    g.shadowColor = 'rgba(59, 43, 63, 0.28)';
    g.shadowBlur = 12;
    g.shadowOffsetY = 4;
    g.fillStyle = '#fffaf4';
    g.beginPath();
    g.roundRect(x, y, bw, bh, 30);
    g.moveTo(W / 2 - 15, y + bh - 1);
    g.lineTo(W / 2, H - 6);
    g.lineTo(W / 2 + 15, y + bh - 1);
    g.fill();
    g.restore();
    g.strokeStyle = accent;
    g.lineWidth = 5;
    g.beginPath();
    g.roundRect(x + 2.5, y + 2.5, bw - 5, bh - 5, 28);
    g.stroke();
    g.fillStyle = '#3b2b3f';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    lines.forEach((l, i) => g.fillText(l, W / 2, y + 15 + 22 + i * 44, 440));
    slot.tex.needsUpdate = true;
  }

  update(dt) {
    const vh = window.innerHeight || 800;
    // Screen pixels per canvas pixel: about 16 px text on a laptop, 13 px on a landscape phone
    const f = Math.min(0.46, Math.max(0.34, (vh / 800) * 0.42));
    const sy = (2 * H * f) / (vh * P11);
    for (const b of this.slots) {
      if (b.life <= 0) continue;
      b.t += dt;
      b.life -= dt;
      if (b.life <= 0) {
        b.s.visible = false;
        b.owner = null;
        continue;
      }
      const a = b.anchor?.();
      if (!a) {
        b.life = 0;
        b.s.visible = false;
        continue;
      }
      const pop = b.t < 0.28 ? easeOutBack(b.t / 0.28) : 1;
      const fade = Math.min(1, b.life / 0.3);
      b.s.position.copy(a);
      b.s.position.y += Math.sin(b.t * 2.4) * 0.03;
      b.s.scale.set(sy * (W / H) * pop * (0.92 + 0.08 * fade), sy * pop * (0.92 + 0.08 * fade), 1);
      b.s.material.opacity = fade;
    }
  }
}

function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
