import * as THREE from 'three';
import { glowTexture } from '../school/kit.js';
import { sfx } from './music.js';

// Fireworks: rockets that whistle up and burst into peonies, rings, gold willows, crackles and a heart
// for the finale. All sparks are one Points mesh with additive blending (one draw call). Used over
// Roji Land's castle after dark and at the end of the Comet's night ride.

const PALETTES = [
  ['#ff6f9a', '#ffd1dc'],
  ['#ffd166', '#fff3c4'],
  ['#8fd3ff', '#e6f6ff'],
  ['#c7a6ff', '#f0e6ff'],
  ['#7fd8bf', '#e6fff7'],
  ['#ff5d5d', '#ffd166'],
];

export class Fireworks {
  // parent: the group the sparks live in; area: { x, z, w, h0, h1, depth } launch area in parent coords
  constructor(parent, { max = 2200, area = { x: 0, z: 0, w: 14, h0: 15, h1: 24, depth: 3 }, size = 0.42, sound = null, listener = null } = {}) {
    this.max = max;
    this.area = area;
    this.sound = sound;
    this.listener = listener; // () => distance factor 0..1 for the sound
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(area.x, (area.h0 + area.h1) / 2, area.z), 60);
    this.mat = new THREE.PointsMaterial({ size, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, sizeAttenuation: true });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
    parent.add(this.points);
    // a soft flash where each rocket bursts
    this.flashes = [];
    const ft = glowTexture();
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ft, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      s.visible = false;
      s.renderOrder = 4;
      parent.add(s);
      this.flashes.push({ s, life: 0 });
    }
    this.flashNext = 0;
    this.p = [];
    for (let i = 0; i < max; i++) this.p.push({ life: 0, max: 1, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, drag: 1, grav: 1, kind: 0, flick: 0 });
    this.next = 0;
    this.rockets = [];
    this.queue = [];
    this.c = new THREE.Color();
    this.c2 = new THREE.Color();
    this.active = false;
    this.clock = 0;
  }

  spark(x, y, z, vx, vy, vz, color, life, { drag = 1.6, grav = 3.2, flick = 0 } = {}) {
    const q = this.p[this.next];
    this.next = (this.next + 1) % this.max;
    Object.assign(q, { x, y, z, vx, vy, vz, life, max: life, drag, grav, flick, r: color.r, g: color.g, b: color.b });
  }

  // Send one rocket up. kind: 'peony' | 'ring' | 'willow' | 'crackle' | 'heart'
  launch(kind = 'peony', at = null, palette = null) {
    const A = this.area;
    const x = at?.x ?? A.x + (Math.random() - 0.5) * A.w;
    const z = at?.z ?? A.z + (Math.random() - 0.5) * A.depth;
    const top = at?.y ?? A.h0 + Math.random() * (A.h1 - A.h0);
    const pal = palette || PALETTES[Math.floor(Math.random() * PALETTES.length)];
    this.rockets.push({ x, y: A.ground ?? 6, z, top, vy: 15 + Math.random() * 3, kind, pal, trail: 0 });
    sfx.whistle(this.sound, this.listener?.() ?? 0.6);
  }

  burst(r) {
    const c = this.c.set(r.pal[0]);
    const c2 = this.c2.set(r.pal[1]);
    const n = r.kind === 'heart' ? 150 : r.kind === 'willow' ? 110 : r.kind === 'crackle' ? 70 : 130;
    for (let i = 0; i < n; i++) {
      let vx;
      let vy;
      let vz;
      if (r.kind === 'ring') {
        const a = (i / n) * Math.PI * 2;
        const s = 7.5;
        vx = Math.cos(a) * s;
        vy = Math.sin(a) * s * 0.6;
        vz = Math.sin(a) * s * 0.6;
      } else if (r.kind === 'heart') {
        // the classic heart curve, upright and facing the camera
        const t = (i / n) * Math.PI * 2;
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        vx = hx * 0.5;
        vy = hy * 0.5 + 1;
        vz = (Math.random() - 0.5) * 0.6;
      } else {
        // a sphere of sparks
        const u = Math.random() * 2 - 1;
        const a = Math.random() * Math.PI * 2;
        const s = (r.kind === 'willow' ? 6 : r.kind === 'crackle' ? 5 : 8.5) * (0.85 + Math.random() * 0.15);
        const rr = Math.sqrt(1 - u * u);
        vx = Math.cos(a) * rr * s;
        vy = u * s;
        vz = Math.sin(a) * rr * s;
      }
      const col = i % 3 === 0 ? c2 : c;
      if (r.kind === 'willow') this.spark(r.x, r.y, r.z, vx, vy, vz, this.c.set('#ffd27a'), 3.2 + Math.random(), { drag: 1.1, grav: 2.2 });
      else if (r.kind === 'crackle') this.spark(r.x, r.y, r.z, vx, vy, vz, this.c.set('#fff6dc'), 1.3 + Math.random() * 0.6, { drag: 2.2, grav: 2.5, flick: 1 });
      else if (r.kind === 'heart') this.spark(r.x, r.y, r.z, vx, vy, vz, col, 2.2, { drag: 2.4, grav: 0.8 });
      else this.spark(r.x, r.y, r.z, vx, vy, vz, col, 1.8 + Math.random() * 0.7, { drag: 1.7, grav: 3 });
      if (r.kind === 'willow') this.c.set(r.pal[0]);
    }
    const fl = this.flashes[this.flashNext];
    this.flashNext = (this.flashNext + 1) % this.flashes.length;
    fl.life = 0.45;
    fl.s.position.set(r.x, r.y, r.z);
    fl.s.material.color.set(r.pal[0]);
    fl.s.visible = true;
    sfx.boom(this.sound, this.listener?.() ?? 0.6);
  }

  // A show of about 20 seconds; finale with a heart
  show(heart = true) {
    if (this.active) return;
    this.active = true;
    this.clock = 0;
    const kinds = ['peony', 'peony', 'ring', 'willow', 'crackle'];
    this.queue = [];
    let t = 0.3;
    for (let i = 0; i < 16; i++) {
      this.queue.push({ t, kind: kinds[i % kinds.length] });
      t += 0.8 + Math.random() * 0.6;
    }
    t += 0.6;
    for (let i = 0; i < 6; i++) this.queue.push({ t: t + i * 0.22, kind: i % 2 ? 'ring' : 'peony' });
    if (heart) this.queue.push({ t: t + 2.2, kind: 'heart', at: { x: this.area.x, z: this.area.z, y: this.area.h1 }, pal: ['#ff4d7d', '#ffb3c7'] });
    this.end = t + 6;
  }

  get running() {
    return this.active;
  }

  update(dt) {
    if (this.active) {
      this.clock += dt;
      while (this.queue.length && this.queue[0].t <= this.clock) {
        const q = this.queue.shift();
        this.launch(q.kind, q.at, q.pal);
      }
      if (this.clock > this.end && !this.queue.length) this.active = false;
    }
    // rockets climb, leaving a little trail, and burst at the top
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.y += r.vy * dt;
      r.vy = Math.max(4, r.vy - 4 * dt);
      r.trail -= dt;
      if (r.trail <= 0) {
        r.trail = 0.025;
        this.spark(r.x + (Math.random() - 0.5) * 0.1, r.y, r.z, (Math.random() - 0.5) * 0.4, -1, (Math.random() - 0.5) * 0.4, this.c.set('#ffe6b0'), 0.5, { drag: 3, grav: 1 });
      }
      if (r.y >= r.top) {
        this.rockets.splice(i, 1);
        this.burst(r);
      }
    }
    for (const fl of this.flashes) {
      if (fl.life <= 0) continue;
      fl.life -= dt;
      const k = Math.max(0, fl.life / 0.45);
      fl.s.material.opacity = k * 0.9;
      fl.s.scale.setScalar(this.mat.size * 9 * (1.4 - k * 0.6));
      if (fl.life <= 0) fl.s.visible = false;
    }
    let alive = 0;
    const pos = this.pos;
    const col = this.col;
    for (let i = 0; i < this.max; i++) {
      const q = this.p[i];
      if (q.life <= 0) {
        if (pos[i * 3 + 1] !== -999) {
          pos[i * 3 + 1] = -999;
          col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0;
        }
        continue;
      }
      alive++;
      q.life -= dt;
      const d = Math.exp(-q.drag * dt);
      q.vx *= d;
      q.vy = q.vy * d - q.grav * dt;
      q.vz *= d;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.z += q.vz * dt;
      let k = Math.max(0, q.life / q.max);
      k = k * k * (3 - 2 * k);
      if (q.flick) k *= Math.random() > 0.4 ? 1 : 0.2;
      pos[i * 3] = q.x;
      pos[i * 3 + 1] = q.y;
      pos[i * 3 + 2] = q.z;
      col[i * 3] = q.r * k;
      col[i * 3 + 1] = q.g * k;
      col[i * 3 + 2] = q.b * k;
    }
    this.points.visible = alive > 0 || this.rockets.length > 0;
    if (this.points.visible) {
      this.points.geometry.attributes.position.needsUpdate = true;
      this.points.geometry.attributes.color.needsUpdate = true;
    }
  }
}
