import * as THREE from 'three';
import { mat, mesh, damp, dampAngle, clamp, lerp } from '../../util.js';
import { skinify } from './rig.js';

// Flamingos, penguins, the tortoise and the butterflies. Each animal is one skinned draw call.
// Coordinates: the zoo's local space. Every model faces +Z with its feet at y = 0.

const at = (o, x, y, z) => (o.position.set(x, y, z), o);
const geo = new Map();
const g1 = (key, make) => (geo.has(key) ? geo.get(key) : (geo.set(key, make()), geo.get(key)));
const sph = (r, c, seg = 12) => mesh(g1(`s${r}${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7)))), mat(c));
const cap = (r, h, c, rs = 10) => mesh(g1(`c${r}${h}${rs}`, () => new THREE.CapsuleGeometry(r, h, 3, rs)), mat(c));
const cyl = (a, b, h, c, seg = 10) => mesh(g1(`y${a}${b}${h}${seg}`, () => new THREE.CylinderGeometry(a, b, h, seg)), mat(c));
const cone = (r, h, c, seg = 10) => mesh(g1(`k${r}${h}${seg}`, () => new THREE.ConeGeometry(r, h, seg)), mat(c));
const group = (x = 0, y = 0, z = 0) => at(new THREE.Group(), x, y, z);

function eyesOn(parent, x, y, z, r = 0.022, spread = 1) {
  for (const s of [1, -1]) {
    const e = at(sph(r, '#1d130f', 10), x * s * spread, y, z);
    e.scale.set(0.8, 1.1, 0.6);
    const sh = at(sph(r * 0.32, '#ffffff', 6), x * s * spread + r * 0.3 * s, y + r * 0.4, z + r * 0.45);
    parent.add(e, sh);
  }
}

// ------------------------------------------------------------------ flamingo
export class Flamingo {
  constructor(x, z, yaw, seed) {
    this.holder = new THREE.Group();
    this.pos = new THREE.Vector3(x, 0, z);
    this.home = this.pos.clone();
    this.yaw = yaw;
    this.baseYaw = yaw;
    this.t0 = seed * 3.1;
    const PINK = '#ff9dbb';
    const DEEP = '#f2709a';
    const LEG = '#f37f9f';
    const body = group(0, 0.8, 0);
    this.body = body;
    const torso = sph(0.2, PINK, 14);
    torso.scale.set(0.85, 0.72, 1.3);
    body.add(torso);
    const tail = at(cone(0.08, 0.2, DEEP, 8), 0, 0.05, -0.27);
    tail.rotation.x = -Math.PI / 2 - 0.35;
    body.add(tail);
    this.wings = [];
    for (const s of [1, -1]) {
      const w = group(0.13 * s, 0.11, 0.02);
      const m = at(sph(0.17, '#ff86ab', 12), 0.01 * s, -0.07, -0.05);
      m.scale.set(0.28, 0.62, 1.12);
      const tip = at(sph(0.06, '#3b2b3f', 8), 0.01 * s, -0.09, -0.22);
      tip.scale.set(0.4, 0.6, 1.2);
      w.add(m, tip);
      body.add(w);
      this.wings.push(w);
    }
    // S-shaped neck
    this.neck = [];
    let parent = group(0, 0.08, 0.2);
    body.add(parent);
    this.neckBase = parent;
    for (let i = 0; i < 4; i++) {
      const s = group(0, i === 0 ? 0 : 0.15, 0);
      s.add(at(cap(0.036, 0.13, PINK, 8), 0, 0.075, 0));
      parent.add(s);
      this.neck.push(s);
      parent = s;
    }
    const head = group(0, 0.15, 0);
    parent.add(head);
    this.head = head;
    const skull = at(sph(0.068, PINK, 12), 0, 0.02, 0.01);
    const beak = at(cone(0.034, 0.12, '#fff0dc', 8), 0, 0.0, 0.1);
    beak.rotation.x = Math.PI / 2 + 0.5;
    const tip = at(cone(0.022, 0.06, '#2b2230', 8), 0, -0.045, 0.145);
    tip.rotation.x = Math.PI / 2 + 1.0;
    head.add(skull, beak, tip);
    eyesOn(head, 0.045, 0.04, 0.045, 0.016);
    for (const s of [1, -1]) {
      const c = at(sph(0.018, '#ff6f9a', 6), 0.05 * s, 0.0, 0.035);
      c.scale.set(0.4, 0.8, 1);
      head.add(c);
    }
    // Legs with a knee that bends backwards
    this.legs = [];
    for (const s of [1, -1]) {
      const hip = group(0.06 * s, 0.8, 0);
      hip.add(at(cyl(0.02, 0.018, 0.4, LEG, 6), 0, -0.2, 0));
      const knee = group(0, -0.4, 0);
      knee.add(at(sph(0.026, LEG, 8), 0, 0, 0));
      knee.add(at(cyl(0.018, 0.016, 0.4, LEG, 6), 0, -0.2, 0));
      const foot = at(sph(0.05, DEEP, 8), 0, -0.4, 0.035);
      foot.scale.set(0.9, 0.25, 1.4);
      knee.add(foot);
      hip.add(knee);
      this.holder.add(hip);
      this.legs.push({ hip, knee });
    }
    this.holder.add(body);
    this.holder.scale.setScalar(0.85);
    this.meshes = skinify(this.holder);
    this.state = 'stand';
    this.st = Math.random() * 4;
    this.standLeg = seed % 2;
    this.tuck = [this.standLeg === 0 ? 0 : 1, this.standLeg === 1 ? 0 : 1];
    this.dance = 0;
  }

  update(dt, t) {
    this.st += dt;
    const T = t + this.t0;
    let neckA = [-0.25, -0.45, 0.35, 0.95];
    let headPitch = 0.15;
    let wing = 0;
    let bodyPitch = 0;
    let lift = [0, 0];
    if (this.dance > 0) {
      this.dance -= dt;
      const k = Math.min(1, this.dance * 2);
      const m = Math.sin(T * 8);
      lift = [Math.max(0, m) * k, Math.max(0, -m) * k];
      this.tuck[0] = damp(this.tuck[0], 0, 10, dt);
      this.tuck[1] = damp(this.tuck[1], 0, 10, dt);
      wing = (0.9 + Math.sin(T * 14) * 0.5) * k;
      headPitch += Math.sin(T * 8) * 0.25 * k;
    } else if (this.state === 'stand') {
      for (let i = 0; i < 2; i++) this.tuck[i] = damp(this.tuck[i], i === this.standLeg ? 0 : 1, 3, dt);
      if (this.st > 7 + (this.t0 % 4)) {
        this.state = ['dip', 'preen', 'swap'][Math.floor(Math.random() * 3)];
        this.st = 0;
      }
    } else if (this.state === 'dip') {
      const k = Math.sin(clamp(this.st / 3, 0, 1) * Math.PI);
      neckA = [lerp(-0.25, 1.6, k), lerp(-0.45, 0.6, k), lerp(0.35, 0.4, k), lerp(0.95, 0.3, k)];
      bodyPitch = 0.7 * k;
      headPitch = lerp(0.15, 0.6, k);
      if (this.st > 3) this.next();
    } else if (this.state === 'preen') {
      const k = Math.sin(clamp(this.st / 2.6, 0, 1) * Math.PI);
      neckA = [lerp(-0.25, -0.9, k), lerp(-0.45, -0.9, k), lerp(0.35, 1.2, k), lerp(0.95, 1.3, k)];
      this.wings[0].rotation.z = k * 0.4;
      headPitch = lerp(0.15, 0.9, k) + Math.sin(T * 14) * 0.15 * k;
      if (this.st > 2.6) this.next();
    } else if (this.state === 'swap') {
      for (let i = 0; i < 2; i++) this.tuck[i] = damp(this.tuck[i], 0, 6, dt);
      if (this.st > 0.9) {
        this.standLeg = 1 - this.standLeg;
        this.next();
      }
    }
    const sway = Math.sin(T * 0.9) * 0.04;
    this.neckBase.rotation.set(neckA[0], 0, sway);
    for (let i = 1; i < 4; i++) this.neck[i].rotation.set(neckA[i] - (i === 1 ? 0 : 0), 0, sway * 0.5);
    let sum = neckA.reduce((a, b) => a + b, 0) + bodyPitch;
    this.head.rotation.set(-sum + headPitch, Math.sin(T * 0.5) * 0.3, 0);
    this.body.rotation.set(bodyPitch, 0, 0);
    this.body.position.y = 0.8 + Math.sin(T * 1.6) * 0.008 - Math.max(lift[0], lift[1]) * 0.02;
    for (let i = 0; i < 2; i++) {
      const tk = Math.max(this.tuck[i], lift[i] * 0.6);
      this.legs[i].hip.rotation.set(-0.35 * tk, 0, 0);
      this.legs[i].knee.rotation.set(2.5 * tk, 0, 0);
    }
    this.wings.forEach((w, i) => {
      const s = i === 0 ? 1 : -1;
      if (!(this.state === 'preen' && i === 0 && this.dance <= 0)) w.rotation.z = s * wing;
    });
    this.holder.position.copy(this.pos);
    this.holder.rotation.y = this.yaw + Math.sin(T * 0.3) * 0.25;
  }

  next() {
    this.state = 'stand';
    this.st = 0;
  }
}

// ------------------------------------------------------------------ penguin
// Pool spec: { ice: { x0, x1, z0, z1, y }, water: { x0, x1, z0, z1, y } }
export class Penguin {
  constructor(pool, seed) {
    this.pool = pool;
    this.seed = seed;
    this.holder = new THREE.Group();
    const NAVY = '#2b3346';
    const body = group(0, 0, 0);
    this.body = body;
    const torso = at(sph(0.2, NAVY, 14), 0, 0.24, 0);
    torso.scale.set(0.92, 1.2, 0.86);
    const belly = at(sph(0.17, '#fffaf0', 14), 0, 0.22, 0.07);
    belly.scale.set(0.82, 1.12, 0.62);
    const face = at(sph(0.11, '#fffaf0', 12), 0, 0.43, 0.08);
    face.scale.set(1.15, 0.8, 0.6);
    const beak = at(cone(0.035, 0.08, '#ffa44a', 8), 0, 0.4, 0.2);
    beak.rotation.x = Math.PI / 2;
    body.add(torso, belly, face, beak);
    eyesOn(body, 0.045, 0.45, 0.14, 0.02);
    for (const s of [1, -1]) {
      const c = at(sph(0.02, '#ff9fb8', 6), 0.075 * s, 0.4, 0.13);
      c.scale.set(1, 0.6, 0.4);
      body.add(c);
    }
    this.flips = [];
    for (const s of [1, -1]) {
      const f = group(0.17 * s, 0.32, 0);
      const m = at(cap(0.035, 0.16, NAVY, 8), 0, -0.1, 0);
      m.scale.set(1, 1, 0.4);
      f.add(m);
      f.rotation.z = 0.25 * s;
      body.add(f);
      this.flips.push(f);
    }
    this.feet = [];
    for (const s of [1, -1]) {
      const f = at(sph(0.05, '#ffa44a', 8), 0.07 * s, 0.015, 0.06);
      f.scale.set(1, 0.35, 1.5);
      this.holder.add(f);
      this.feet.push(f);
    }
    this.holder.add(body);
    this.meshes = skinify(this.holder);
    const I = pool.ice;
    this.pos = new THREE.Vector3(lerp(I.x0, I.x1, 0.3 + (seed % 3) * 0.2), I.y, lerp(I.z0, I.z1, 0.4 + (seed % 2) * 0.3));
    this.yaw = seed;
    this.mode = 'walk';
    this.st = 0;
    this.target = this.icePoint();
    this.ph = seed * 2;
    this.flap = 0;
  }

  icePoint() {
    const I = this.pool.ice;
    const av = this.pool.avoid;
    for (let k = 0; k < 20; k++) {
      const p = new THREE.Vector3(lerp(I.x0 + 0.3, I.x1 - 0.3, Math.random()), I.y, lerp(I.z0 + 0.3, I.z1 - 0.3, Math.random()));
      if (!av || Math.hypot(p.x - av.x, p.z - av.z) > av.r) return p;
    }
    return new THREE.Vector3(I.x0 + 0.5, I.y, I.z1 - 0.3);
  }

  waterPoint() {
    const W = this.pool.water;
    return new THREE.Vector3(lerp(W.x0 + 0.4, W.x1 - 0.4, Math.random()), W.y - 0.12, lerp(W.z0 + 0.4, W.z1 - 0.4, Math.random()));
  }

  update(dt, t) {
    this.st += dt;
    const p = this.pos;
    let lean = 0;
    let roll = 0;
    const I = this.pool.ice;
    if (this.mode === 'walk' || this.mode === 'swim') {
      const swim = this.mode === 'swim';
      const dx = this.target.x - p.x;
      const dz = this.target.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.1) {
        this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), swim ? 3 : 5, dt);
        const sp = swim ? 1.1 : 0.45;
        p.x += Math.sin(this.yaw) * sp * dt;
        p.z += Math.cos(this.yaw) * sp * dt;
      }
      this.ph += dt * (swim ? 5 : 11);
      if (swim) {
        lean = 1.35;
        p.y = this.target.y + Math.sin(this.ph * 0.6) * 0.03;
      } else {
        roll = Math.sin(this.ph) * 0.16;
        p.y = I.y + Math.abs(Math.sin(this.ph)) * 0.02;
      }
      if (d < 0.15 || this.st > 9) {
        this.st = 0;
        const r = Math.random();
        if (!swim && r < 0.35) this.jump(this.waterPoint(), 'swim');
        else if (swim && r < 0.4) this.jump(this.icePoint(), 'walk');
        else this.target = swim ? this.waterPoint() : this.icePoint();
      }
    } else if (this.mode === 'jump') {
      const k = clamp(this.st / 0.7, 0, 1);
      p.lerpVectors(this.from, this.to, k);
      p.y += Math.sin(k * Math.PI) * 0.45;
      lean = this.next === 'swim' ? k * 1.35 : (1 - k) * 1.35;
      this.yaw = dampAngle(this.yaw, Math.atan2(this.to.x - this.from.x, this.to.z - this.from.z), 8, dt);
      if (k >= 1) {
        this.mode = this.next;
        this.st = 0;
        this.target = this.next === 'swim' ? this.waterPoint() : this.icePoint();
      }
    }
    if (this.flap > 0) this.flap -= dt;
    const fl = this.flap > 0 ? 0.6 + Math.sin(t * 22) * 0.5 : this.mode === 'swim' ? 0.9 + Math.sin(t * 8) * 0.35 : 0.25 + Math.abs(roll) * 0.6;
    this.flips[0].rotation.z = fl;
    this.flips[1].rotation.z = -fl;
    this.body.rotation.set(lean, 0, roll);
    this.body.position.y = this.flap > 0 ? Math.abs(Math.sin(t * 9)) * 0.12 : 0;
    const step = this.mode === 'walk' ? Math.sin(this.ph) : 0;
    this.feet[0].position.y = 0.015 + Math.max(0, step) * 0.04;
    this.feet[1].position.y = 0.015 + Math.max(0, -step) * 0.04;
    this.holder.position.copy(p);
    this.holder.rotation.y = this.yaw;
  }

  jump(to, next) {
    this.mode = 'jump';
    this.from = this.pos.clone();
    this.to = to;
    this.next = next;
    this.st = 0;
  }
}

// ------------------------------------------------------------------ tortoise
export class Tortoise {
  // area: { x0, x1, z0, z1 } the garden it wanders in
  constructor(area) {
    this.area = area;
    this.holder = new THREE.Group();
    const SHELL = '#7fa65a';
    const SKIN = '#b6cf86';
    const body = group(0, 0.06, 0);
    this.body = body;
    const shell = mesh(new THREE.SphereGeometry(0.32, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(SHELL));
    shell.scale.set(1, 0.78, 1.2);
    shell.position.y = 0.06;
    const rim = at(cyl(0.33, 0.31, 0.07, '#d6b277', 18), 0, 0.06, 0);
    rim.scale.set(1, 1, 1.2);
    body.add(shell, rim);
    const scutes = [[0, 0.3, 0, 0.11], [0.15, 0.24, 0.12, 0.08], [-0.15, 0.24, 0.12, 0.08], [0.15, 0.24, -0.12, 0.08], [-0.15, 0.24, -0.12, 0.08], [0, 0.22, 0.25, 0.07], [0, 0.22, -0.25, 0.07]];
    for (const [x, y, z, r] of scutes) {
      const s = at(sph(r, '#5f8a45', 10), x, y, z);
      s.scale.set(1, 0.32, 1);
      s.lookAt(x * 3, y * 3 + 0.2, z * 3);
      s.rotateX(Math.PI / 2);
      body.add(s);
    }
    const head = group(0, 0.13, 0.36);
    this.head = head;
    head.add(at(cap(0.055, 0.12, SKIN, 8), 0, 0, -0.04));
    head.children[0].rotation.x = Math.PI / 2 - 0.3;
    const skull = at(sph(0.085, SKIN, 12), 0, 0.05, 0.07);
    skull.scale.set(1, 0.9, 1.1);
    head.add(skull);
    eyesOn(head, 0.042, 0.08, 0.135, 0.018);
    const smile = mesh(new THREE.TorusGeometry(0.03, 0.006, 5, 10, Math.PI * 0.8), mat('#3b4a2a'));
    smile.position.set(0, 0.025, 0.158);
    smile.rotation.z = -Math.PI / 2 - Math.PI * 0.4;
    head.add(smile);
    for (const s of [1, -1]) {
      const c = at(sph(0.016, '#ff9fb8', 6), 0.055 * s, 0.035, 0.13);
      c.scale.set(1, 0.6, 0.5);
      head.add(c);
    }
    body.add(head);
    this.legs = [];
    for (const [x, z] of [[0.2, 0.2], [-0.2, 0.2], [0.2, -0.2], [-0.2, -0.2]]) {
      const l = group(x, 0.08, z);
      l.add(at(cyl(0.055, 0.06, 0.12, SKIN, 8), 0, -0.04, 0));
      body.add(l);
      this.legs.push(l);
    }
    const tail = at(cone(0.03, 0.08, SKIN, 6), 0, 0.08, -0.38);
    tail.rotation.x = -Math.PI / 2 - 0.4;
    body.add(tail);
    this.holder.add(body);
    this.meshes = skinify(this.holder);
    this.pos = new THREE.Vector3((area.x0 + area.x1) / 2, 0, (area.z0 + area.z1) / 2);
    this.yaw = 0.6;
    this.target = this.pick();
    this.ph = 0;
    this.st = 0;
    this.hide = 0;
    this.pause = 0;
  }

  pick() {
    const a = this.area;
    return new THREE.Vector3(lerp(a.x0, a.x1, Math.random()), 0, lerp(a.z0, a.z1, Math.random()));
  }

  update(dt, t, avoid) {
    this.st += dt;
    const p = this.pos;
    let moving = 0;
    if (this.hide > 0) this.hide -= dt;
    else if (this.pause > 0) this.pause -= dt;
    else {
      const dx = this.target.x - p.x;
      const dz = this.target.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.1) {
        this.target = this.pick();
        this.pause = 2 + Math.random() * 3;
      } else {
        this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 1.2, dt);
        const blocked = avoid?.some((q) => Math.hypot(q.x - (p.x + Math.sin(this.yaw) * 0.5), q.z - (p.z + Math.cos(this.yaw) * 0.5)) < 0.45);
        if (!blocked) {
          p.x += Math.sin(this.yaw) * 0.16 * dt;
          p.z += Math.cos(this.yaw) * 0.16 * dt;
          moving = 1;
        }
      }
    }
    this.ph += dt * 3.2 * moving;
    this.legs.forEach((l, i) => {
      l.rotation.x = Math.sin(this.ph + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.4;
    });
    const hk = this.hide > 0 ? Math.min(1, (2.2 - this.hide) * 6, this.hide * 3) : 0;
    this.head.position.z = lerp(0.36, 0.2, clamp(hk, 0, 1));
    this.head.rotation.set(Math.sin(t * 0.7) * 0.08, Math.sin(t * 0.4) * 0.35 * (1 - hk), 0);
    this.body.position.y = 0.06 + Math.abs(Math.sin(this.ph)) * 0.012;
    this.holder.position.copy(p);
    this.holder.rotation.y = this.yaw;
  }

  shy() {
    this.hide = 2.2;
  }
}

// ------------------------------------------------------------------ butterfly
export class Butterfly {
  constructor(color, area, seed) {
    this.area = area;
    this.holder = new THREE.Group();
    this.wings = [];
    for (const s of [1, -1]) {
      const w = new THREE.Group();
      const a = at(sph(0.09, color, 10), 0.08 * s, 0, 0.02);
      a.scale.set(1, 0.12, 0.8);
      const b = at(sph(0.06, color, 8), 0.06 * s, 0, -0.07);
      b.scale.set(1, 0.12, 0.8);
      const dot = at(sph(0.025, '#ffffff', 6), 0.1 * s, 0.012, 0.03);
      dot.scale.set(1, 0.3, 1);
      w.add(a, b, dot);
      this.holder.add(w);
      this.wings.push(w);
    }
    const bodyM = cap(0.014, 0.1, '#3b2b3f', 6);
    bodyM.rotation.x = Math.PI / 2;
    this.holder.add(bodyM);
    this.meshes = skinify(this.holder, { rough: 0.5 });
    this.pos = new THREE.Vector3();
    this.ph = seed * 5;
  }

  update(dt, t) {
    const a = this.area;
    const k = t * 0.23 + this.ph;
    const cx = (a.x0 + a.x1) / 2;
    const cz = (a.z0 + a.z1) / 2;
    const rx = (a.x1 - a.x0) / 2;
    const rz = (a.z1 - a.z0) / 2;
    const prev = this.pos.clone();
    this.pos.set(cx + Math.sin(k) * rx * Math.cos(k * 0.37), a.y + Math.sin(t * 1.7 + this.ph) * 0.4 + Math.sin(k * 0.5) * 0.6, cz + Math.sin(k * 1.3) * rz);
    const f = Math.sin(t * 20 + this.ph) * 0.9;
    this.wings[0].rotation.z = f;
    this.wings[1].rotation.z = -f;
    this.holder.position.copy(this.pos);
    if (dt > 0) this.holder.rotation.y = Math.atan2(this.pos.x - prev.x, this.pos.z - prev.z);
  }
}
