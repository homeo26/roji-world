import { THREE, FONT, roundRect, heartPath } from './kit.js';

// A bout on a piste: two Fencers (kit.js) and a queue of timed steps (footwork, attacks, parries, salutes).
// update(dt) runs the steps; apply(dt) poses both kids and must run after their kid.update() of the frame.

export class Bout {
  constructor(left, right, { x, z, y = 0.04, guard = 0.95 } = {}) {
    this.F = [left, right];
    this.x = x;
    this.z = z;
    this.y = y;
    this.guard = guard;
    this.queue = [];
    this.seg = null;
    this.segT = 0;
    this.onTouch = null; // (scorers: [0 | 1], outcome, attacker)
  }

  push(...steps) {
    this.queue.push(...steps);
  }

  clear() {
    this.queue.length = 0;
    this.seg = null;
  }

  get idle() {
    return !this.seg && !this.queue.length;
  }

  update(dt) {
    if (this.seg) {
      this.segT += dt;
      if (this.segT >= this.seg.d) this.seg = null;
    }
    while (!this.seg && this.queue.length) {
      this.seg = this.queue.shift();
      this.segT = 0;
      this.seg.go?.();
      if (!this.seg.d) this.seg = null;
    }
  }

  apply(dt) {
    // two lunges at once never walk the fencers into each other
    const [a, b] = this.F;
    const gap = 2 * this.guard - (a.off + a.P.shift) - (b.off + b.P.shift);
    if (gap < 0.95) {
      const push = (0.95 - gap) / 2;
      a.off -= push;
      b.off -= push;
    }
    this.F[0].apply(dt, this.x - this.guard, this.y, this.z);
    this.F[1].apply(dt, this.x + this.guard, this.y, this.z);
  }

  // One exchange. att: 0 | 1, the fencer who attacks. out: 'touch' (the attack lands), 'parry' (parried, the riposte
  // lands), 'double' (both at once) or 'short' (nobody). steps: footwork steps first.
  exchange(att, out, steps = 1 + Math.floor(Math.random() * 3)) {
    const A = this.F[att];
    const D = this.F[1 - att];
    const hit = (who) => this.onTouch?.(who, out, att);
    const list = [];
    for (let i = 0; i < steps; i++) {
      const fwd = Math.random() < 0.65;
      list.push({ d: 0.36, go: () => (A.stepBy(fwd ? 0.16 : -0.12), D.stepBy(fwd ? -0.12 : 0.1)) });
    }
    list.push({ d: 0.22, go: () => A.to('windup', 14) });
    if (out === 'double') list.push({ d: 0.6, go: () => (A.to('lunge', 16), D.to('lunge', 16), hit([0, 1])) });
    else if (out === 'short') list.push({ d: 0.5, go: () => (A.to('lunge', 16), D.stepBy(-0.22, 0.25)) });
    else {
      list.push({ d: 0.3, go: () => A.to('lunge', 16) });
      if (out === 'touch') list.push({ d: 0.6, go: () => (D.to('hit', 10), hit([att])) });
      else {
        list.push({ d: 0.24, go: () => (D.to('parry', 18), A.to('parried', 12)) });
        list.push({ d: 0.6, go: () => (D.to('lunge', 16), A.to('hit', 10), hit([1 - att])) });
      }
    }
    list.push({ d: 0.95, go: () => this.F.forEach((f) => (f.to('idle', 7), (f.offT = 0))) });
    return list;
  }

  // Foils up to the face and down to the floor, facing each other
  salute(d = 1.6) {
    return [
      { d: 0.45, go: () => this.F.forEach((f) => f.to('stand', 7)) },
      { d, go: () => this.F.forEach((f) => (f.salute = 0)) },
      { d: 0.5, go: () => this.F.forEach((f) => ((f.salute = null), f.to('stand', 7))) },
    ];
  }
}

// ------------------------------------------------------------------ scoreboards
// A board on a stand: a lit screen (its own little canvas) and two lamps that light for a touch.
// lamps: { set(i, color) } shared by every board (one instanced mesh).
export class Board {
  constructor(label, lamps, index) {
    this.label = label;
    this.lamps = lamps;
    this.i = index;
    this.names = ['', ''];
    this.colors = ['#ff8a8f', '#8af0b6'];
    this.score = [0, 0];
    this.lampT = [0, 0];
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 128;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.material = new THREE.MeshStandardMaterial({ map: this.tex, emissive: '#ffffff', emissiveMap: this.tex, emissiveIntensity: 0.6, roughness: 0.5 });
    this.on = [new THREE.Color('#ff4d5a'), new THREE.Color('#3dff8f')];
    this.off = [new THREE.Color('#5a2a30'), new THREE.Color('#244d38')];
    this.draw();
  }

  set(names, colors, score) {
    if (names) this.names = names;
    if (colors) {
      this.colors = colors;
      this.on = colors.map((c) => new THREE.Color(c).multiplyScalar(1.15));
      this.off = colors.map((c) => new THREE.Color(c).multiplyScalar(0.28));
    }
    if (score) this.score = score.slice();
    this.draw();
  }

  touch(who) {
    for (const i of who) {
      this.score[i] = Math.min(this.score[i] + 1, 15);
      this.lampT[i] = 1.1;
    }
    this.draw();
  }

  reset() {
    this.score = [0, 0];
    this.lampT = [0, 0];
    this.draw();
  }

  draw() {
    const c = this.canvas.getContext('2d');
    const w = 256;
    const h = 128;
    c.fillStyle = '#1f2433';
    c.fillRect(0, 0, w, h);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 17px ${FONT}`;
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.fillText(this.label, w / 2, 14);
    for (const i of [0, 1]) {
      const x = i ? 192 : 64;
      if (this.names[i]) {
        c.font = `600 17px ${FONT}`;
        c.fillStyle = this.colors[i];
        c.fillText(this.names[i], x, 34);
      }
      c.font = `700 70px ${FONT}`;
      c.fillStyle = this.colors[i];
      c.fillText(String(this.score[i]), x, 84);
    }
    c.fillStyle = '#ffffff';
    c.font = `700 56px ${FONT}`;
    c.fillText(':', w / 2, 80);
    if (this.label === 'DUEL') {
      c.fillStyle = '#ff9eb5';
      heartPath(c, w / 2, 112, 14);
      c.fill();
    }
    this.tex.needsUpdate = true;
  }

  update(dt) {
    for (const i of [0, 1]) {
      const was = this.lampT[i] > 0;
      this.lampT[i] = Math.max(0, this.lampT[i] - dt);
      const now = this.lampT[i] > 0;
      if (was !== now || this.first !== true) this.lamps.set(this.i * 2 + i, now ? this.on[i] : this.off[i]);
    }
    this.first = true;
  }
}

// A rounded label for the stands of the boards (drawn into an atlas cell)
export const drawTag = (text, edge) => (c, w, h) => {
  c.fillStyle = '#fffaf0';
  roundRect(c, 3, 3, w - 6, h - 6, h * 0.3);
  c.fill();
  c.lineWidth = 4;
  c.strokeStyle = edge;
  c.stroke();
  c.fillStyle = '#2c3e66';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `700 ${Math.round(h * 0.52)}px ${FONT}`;
  c.fillText(text, w / 2, h / 2 + 2);
};
