import * as THREE from 'three';
import { canvasTexture } from '../../util.js';
import { starGeo } from '../../places/school/kit.js';

// Sparks off the ceiling grid, soft glows, the horn's shock ring, dizzy stars, pop words over the
// floor, and every sound of the bumper cars (bonks, honks, giggles, crackles and a fairground tune).

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class BumperFx {
  constructor(ctx, glowTex) {
    const { scene } = ctx;
    this.ctx = ctx;
    this.camera = ctx.camera;
    this.sound = ctx.sound;
    const sparkTex = canvasTexture(64, 64, (c) => {
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 30);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.25, 'rgba(255,255,255,.9)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
      c.fillStyle = '#fff';
      c.fillRect(30, 2, 4, 60);
      c.fillRect(2, 30, 60, 4);
    });
    const addMat = (map) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    // sparks
    this.NS = 260;
    this.sparks = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), addMat(sparkTex), this.NS);
    this.sparks.frustumCulled = false;
    this.sparks.renderOrder = 5;
    this.sp = [];
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.NS; i++) {
      this.sparks.setMatrixAt(i, zero);
      this.sparks.setColorAt(i, new THREE.Color('#ffffff'));
      this.sp.push({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 0.1, c: new THREE.Color() });
    }
    this.si = 0;
    scene.add(this.sparks);
    // glows: some live a while (flashes), some only for this frame (pole tips, tokens)
    this.NG = 48;
    this.glows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), addMat(glowTex), this.NG);
    this.glows.frustumCulled = false;
    this.glows.renderOrder = 4;
    for (let i = 0; i < this.NG; i++) {
      this.glows.setMatrixAt(i, zero);
      this.glows.setColorAt(i, new THREE.Color('#ffffff'));
    }
    scene.add(this.glows);
    this.flashes = [];
    this.now = [];
    // shock rings
    this.rings = [];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 48), new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.renderOrder = 3;
      scene.add(m);
      this.rings.push({ m, t: 1, max: 4.5, color: '#ffe08a' });
    }
    // dizzy stars, three per car
    this.dz = new THREE.InstancedMesh(starGeo(0.12, 0.055, 0.04), new THREE.MeshBasicMaterial({ color: '#ffd166', toneMapped: false }), 24);
    this.dz.frustumCulled = false;
    for (let i = 0; i < 24; i++) this.dz.setMatrixAt(i, zero);
    scene.add(this.dz);
    this.m4 = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.v = new THREE.Vector3();
    this.s = new THREE.Vector3();
    this.col = new THREE.Color();
    this.music = null;
  }

  spark(p, n, { color = '#fff3c4', speed = 2.5, up = 0.5, life = 0.7, size = 0.12, spread = 0.1 } = {}) {
    for (let i = 0; i < n; i++) {
      const s = this.sp[this.si];
      this.si = (this.si + 1) % this.NS;
      s.p.set(p.x + (Math.random() - 0.5) * spread, p.y, p.z + (Math.random() - 0.5) * spread);
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.3 + Math.random() * 0.9);
      s.v.set(Math.cos(a) * sp, (Math.random() - 0.3) * speed * up, Math.sin(a) * sp);
      s.life = s.max = life * (0.6 + Math.random() * 0.6);
      s.s = size * (0.6 + Math.random() * 0.8);
      s.c.set(Array.isArray(color) ? color[i % color.length] : color);
    }
  }

  // A glow just for this frame
  glow(p, size, color, a = 1) {
    if (this.now.length < this.NG - 12) this.now.push({ x: p.x, y: p.y, z: p.z, size, color, a });
  }

  flash(p, size, color, life = 0.35) {
    this.flashes.push({ x: p.x, y: p.y, z: p.z, size, color, life, max: life });
    if (this.flashes.length > 12) this.flashes.shift();
  }

  ring(p, max = 4.5, color = '#ffe08a') {
    const r = this.rings.find((x) => x.t >= 1) || this.rings[0];
    r.t = 0;
    r.max = max;
    r.m.material.color.set(color);
    r.m.position.set(p.x, 0.06, p.z);
    r.m.visible = true;
  }

  update(dt, cars, t) {
    const camQ = this.camera.quaternion;
    let i = 0;
    for (const s of this.sp) {
      if (s.life <= 0) {
        i++;
        continue;
      }
      s.life -= dt;
      s.v.y -= 7 * dt;
      s.v.multiplyScalar(Math.exp(-1.2 * dt));
      s.p.addScaledVector(s.v, dt);
      if (s.p.y < 0.05) {
        s.p.y = 0.05;
        s.v.y = Math.abs(s.v.y) * 0.3;
      }
      const k = Math.max(0, s.life / s.max);
      this.sparks.setMatrixAt(i, this.m4.compose(s.p, camQ, this.s.setScalar(s.s * (0.4 + k * 0.6))));
      this.sparks.setColorAt(i, this.col.copy(s.c).multiplyScalar(Math.min(1, k * 1.6)));
      if (s.life <= 0) this.sparks.setMatrixAt(i, this.m4.makeScale(0, 0, 0));
      i++;
    }
    this.sparks.instanceMatrix.needsUpdate = true;
    this.sparks.instanceColor.needsUpdate = true;
    // glows
    let g = 0;
    for (let j = this.flashes.length - 1; j >= 0; j--) {
      const f = this.flashes[j];
      f.life -= dt;
      if (f.life <= 0) this.flashes.splice(j, 1);
    }
    const all = [...this.now, ...this.flashes.map((f) => ({ ...f, a: f.life / f.max, size: f.size * (1.4 - (f.life / f.max) * 0.4) }))];
    for (const o of all) {
      if (g >= this.NG) break;
      this.v.set(o.x, o.y, o.z);
      this.glows.setMatrixAt(g, this.m4.compose(this.v, camQ, this.s.setScalar(o.size)));
      this.glows.setColorAt(g, this.col.set(o.color).multiplyScalar(Math.max(0, Math.min(1, o.a))));
      g++;
    }
    for (let j = g; j < this.NG; j++) this.glows.setMatrixAt(j, this.m4.makeScale(0, 0, 0));
    this.glows.instanceMatrix.needsUpdate = true;
    this.glows.instanceColor.needsUpdate = true;
    this.now.length = 0;
    // rings
    for (const r of this.rings) {
      if (r.t >= 1) continue;
      r.t = Math.min(1, r.t + dt / 0.45);
      const s = 0.8 + r.t * r.max;
      r.m.scale.set(s, s, s);
      r.m.material.opacity = (1 - r.t) * 0.85;
      if (r.t >= 1) r.m.visible = false;
    }
    // dizzy stars round the heads of dizzy drivers
    let d = 0;
    for (const c of cars) {
      if (!c.active || (c.dizzy <= 0 && c.alive) || !c.headPos) continue;
      if (!c.alive && c.outT > 2.5) continue;
      for (let s = 0; s < 3; s++) {
        if (d >= 24) break;
        const a = t * 5 + (s / 3) * Math.PI * 2;
        this.v.set(c.headPos.x + Math.cos(a) * 0.32, c.headPos.y + 0.42 + Math.sin(a * 2) * 0.04, c.headPos.z + Math.sin(a) * 0.32);
        this.q.setFromAxisAngle(this.s.set(0, 1, 0), -a);
        this.dz.setMatrixAt(d++, this.m4.compose(this.v, this.q, this.s.set(1, 1, 1)));
      }
    }
    for (let j = d; j < 24; j++) this.dz.setMatrixAt(j, this.m4.makeScale(0, 0, 0));
    this.dz.instanceMatrix.needsUpdate = true;
    this.music?.update();
  }

  // ---------------------------------------------------------------- sounds
  get ok() {
    return !!this.sound?.ctx && !this.sound.muted;
  }
  tone(f, when, dur, o) {
    if (!this.ok) return;
    this.sound.tone(f, this.sound.ctx.currentTime + when, dur, o);
  }
  noise({ freq = 3000, q = 1, gain = 0.05, dur = 0.08, type = 'bandpass', when = 0 } = {}) {
    if (!this.ok || !this.sound.noise) return;
    const ctx = this.sound.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.sound.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    const t0 = ctx.currentTime + when;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.015, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.sound.sfx);
    src.start(t0, Math.random() * 0.3, dur + 0.05);
  }
  bonk(k = 1) {
    k = Math.min(1.3, k);
    this.tone(150, 0, 0.2, { gain: 0.13 * k, slideTo: 70 });
    this.tone(430, 0, 0.09, { type: 'triangle', gain: 0.05 * k, slideTo: 250 });
    this.tone(320, 0.03, 0.16, { gain: 0.03 * k, slideTo: 640 });
    this.noise({ freq: 900, q: 0.8, gain: 0.05 * k, dur: 0.07, type: 'lowpass' });
  }
  clonk() {
    this.tone(110, 0, 0.22, { gain: 0.14, slideTo: 60 });
    this.tone(1760, 0.01, 0.12, { type: 'triangle', gain: 0.025 });
    this.tone(2350, 0.02, 0.1, { type: 'sine', gain: 0.02 });
  }
  thump(k = 1) {
    this.tone(120, 0, 0.12, { gain: 0.07 * Math.min(1, k), slideTo: 75 });
  }
  crackle(k = 1) {
    this.noise({ freq: 4200 + Math.random() * 1800, q: 1.4, gain: 0.03 * k, dur: 0.04 });
    this.noise({ freq: 6500, q: 2, gain: 0.02 * k, dur: 0.03, when: 0.03 + Math.random() * 0.03 });
  }
  beep(pitch = 1) {
    this.tone(523 * pitch, 0, 0.1, { type: 'square', gain: 0.035 });
    this.tone(659 * pitch, 0.13, 0.13, { type: 'square', gain: 0.035 });
  }
  honkAll() {
    [1, 1.26, 0.84, 1.5].forEach((p, i) => {
      this.tone(523 * p, i * 0.07, 0.09, { type: 'square', gain: 0.022 });
      this.tone(659 * p, i * 0.07 + 0.11, 0.1, { type: 'square', gain: 0.022 });
    });
  }
  megaHorn() {
    for (const [n, w] of [[57, 0], [61, 0], [64, 0], [69, 0.02]]) {
      this.tone(NOTE(n), w, 0.55, { type: 'sawtooth', gain: 0.035, attack: 0.02 });
    }
    this.tone(NOTE(69), 0.5, 0.35, { type: 'square', gain: 0.03, slideTo: NOTE(76) });
    this.noise({ freq: 400, q: 0.6, gain: 0.06, dur: 0.4, type: 'lowpass' });
  }
  whoosh() {
    this.tone(220, 0, 0.45, { type: 'triangle', gain: 0.05, slideTo: 980 });
    this.noise({ freq: 1800, q: 0.7, gain: 0.05, dur: 0.4 });
  }
  pickup() {
    this.tone(NOTE(84), 0, 0.09, { gain: 0.06 });
    this.tone(NOTE(88), 0.06, 0.09, { gain: 0.06 });
    this.tone(NOTE(91), 0.12, 0.25, { gain: 0.06 });
  }
  giggle(base = 900) {
    for (let i = 0; i < 5; i++) this.tone(base * (1 + (i % 2) * 0.13), i * 0.085, 0.08, { gain: 0.03 });
  }
  boing(base = 300) {
    this.tone(base, 0, 0.3, { gain: 0.05, slideTo: base * 2.4 });
  }
  tag() {
    this.tone(NOTE(79), 0, 0.12, { type: 'triangle', gain: 0.07 });
    this.tone(NOTE(86), 0.1, 0.22, { type: 'triangle', gain: 0.07 });
  }
  powerDown() {
    this.tone(620, 0, 0.8, { type: 'sine', gain: 0.06, slideTo: 110 });
    this.tone(630, 0.04, 0.8, { type: 'square', gain: 0.012, slideTo: 100 });
    this.noise({ freq: 3000, q: 1, gain: 0.04, dur: 0.2 });
  }
  goal() {
    [72, 76, 79, 84].forEach((n, i) => this.tone(NOTE(n), i * 0.09, 0.32, { type: 'square', gain: 0.03 }));
    this.tone(NOTE(84), 0.36, 0.6, { type: 'triangle', gain: 0.06 });
  }
  tick() {
    this.tone(NOTE(96), 0, 0.05, { gain: 0.04 });
  }
  startMusic(fast = 1) {
    this.music?.stop();
    this.music = new Tune(this.sound, fast);
  }
  stopMusic() {
    this.music?.stop();
    this.music = null;
  }
  dispose() {
    this.stopMusic();
  }
}

// An original fairground tune: a bouncy melody over an oom-pah bass, looping. It schedules notes a
// moment ahead so it keeps time on slow frames.
const MEL = [
  72, 0, 76, 79, 81, 79, 76, 0, 77, 0, 74, 77, 79, 77, 74, 0,
  76, 0, 72, 76, 79, 81, 84, 0, 83, 81, 79, 77, 76, 74, 72, 0,
  69, 0, 72, 77, 81, 0, 79, 77, 76, 0, 79, 84, 83, 0, 79, 0,
  77, 76, 74, 76, 77, 79, 81, 83, 84, 0, 79, 0, 72, 0, 0, 0,
];
const BASS = [48, 55, 52, 55, 50, 57, 53, 57, 48, 55, 52, 55, 55, 59, 50, 55, 53, 60, 57, 60, 48, 55, 52, 55, 55, 59, 55, 59, 48, 55, 48, 0];
class Tune {
  constructor(sound, fast = 1) {
    this.sound = sound;
    this.beat = 60 / (150 * fast) / 2;
    this.i = 0;
    this.next = null;
    this.on = true;
  }
  stop() {
    this.on = false;
  }
  update() {
    const s = this.sound;
    if (!this.on || !s?.ctx || s.muted) return;
    const now = s.ctx.currentTime;
    if (this.next === null || this.next < now - 0.5) this.next = now + 0.05;
    while (this.next < now + 0.35) {
      const m = MEL[this.i % MEL.length];
      if (m) {
        s.tone(NOTE(m), this.next, this.beat * 1.5, { type: 'square', gain: 0.016, attack: 0.006 });
        s.tone(NOTE(m + 12), this.next, this.beat * 0.7, { type: 'sine', gain: 0.012, attack: 0.004 });
      }
      if (this.i % 2 === 0) {
        const b = BASS[(this.i / 2) % BASS.length];
        if (b) s.tone(NOTE(b - 12), this.next, this.beat * 1.4, { type: 'triangle', gain: 0.05, attack: 0.01 });
      }
      this.next += this.beat;
      this.i++;
    }
  }
}
