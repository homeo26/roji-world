import * as THREE from 'three';
import { mat, mesh, canvasTexture, rng, damp, dampAngle, clamp, lerp } from '../../util.js';
import { skinify } from './rig.js';

// Jodi and Jouri. One rig, two personalities. Built from primitives on a chain of pivots, then
// drawn as two skinned meshes (spotted coat + vertex colours). Coordinates: the zoo's local space.

export const JODI = {
  id: 'jodi',
  name: 'Jodi',
  base: '#f6deac',
  spot: '#a8562c',
  spotIn: '#94471f',
  mane: '#9a552c',
  cream: '#fff2d9',
  dark: '#5a3420',
  cheek: '#f4b9ae',
  style: 'patch',
  seed: 7,
  scale: 1.06,
  walk: 0.62,
  rest: { lean: 0.22, curve: -0.014, pitch: -0.1, lid: 0.36, browL: -0.15, browR: 0.85, tiltL: 0.16, tiltR: 0.26, ear: 0.32, chew: 0.45, roll: 0 },
};
export const JOURI = {
  id: 'jouri',
  name: 'Jouri',
  base: '#ffe5a8',
  spot: '#e38e3d',
  spotIn: '#d27c2f',
  mane: '#d9843a',
  cream: '#fff7e6',
  dark: '#6b3e22',
  cheek: '#ff8fb1',
  style: 'round',
  seed: 23,
  scale: 0.95,
  walk: 1.05,
  rest: { lean: 0.34, curve: 0.0, pitch: 0.02, lid: 0.02, browL: 0.4, browR: 0.4, tiltL: -0.14, tiltR: -0.14, ear: 0.08, chew: 0, roll: 0.13 },
};

const REST = { lean: 0.3, curve: 0, sway: 0, swayF: 1.2, twist: 0, pitch: 0, roll: 0, jaw: 0, chew: 0, tongue: 0, tWag: 0, tCurl: 0, lid: 0.05, wink: 0, browL: 0, browR: 0, tiltL: 0, tiltR: 0, ear: 0.2, reach: 0, tail: 0.18 };
const RATE = { lid: 12, wink: 12, tongue: 9, tWag: 10, reach: 2.4, twist: 3, pitch: 3.5, lean: 3, curve: 3, ear: 8, browL: 6, browR: 6, sway: 3, jaw: 5 };
const NECK = 5;
const SEG = 0.36;

const smooth = (a, b, x) => {
  const k = clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};

function coatTexture(o) {
  const tex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = o.base;
    ctx.fillRect(0, 0, w, h);
    const r = rng(o.seed);
    const N = 4;
    const cell = w / N;
    const blobs = [];
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const x = (i + 0.5 + (j % 2) * 0.5 + (r() - 0.5) * 0.28) * cell;
        const y = (j + 0.5 + (r() - 0.5) * 0.25) * cell;
        const n = o.style === 'patch' ? 7 : 10;
        const base = cell * (o.style === 'patch' ? 0.4 : 0.27 + r() * 0.07);
        const pts = [];
        for (let k = 0; k < n; k++) pts.push([(k / n) * Math.PI * 2 + r() * 0.3, base * (0.82 + r() * 0.3)]);
        blobs.push({ x, y, pts, heart: o.style === 'round' && i === 1 && j === 2 });
      }
    }
    const path = (b, x, y, s) => {
      ctx.beginPath();
      if (b.heart) {
        for (let k = 0; k <= 40; k++) {
          const a = (k / 40) * Math.PI * 2;
          const hx = 16 * Math.pow(Math.sin(a), 3);
          const hy = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
          const px = x + hx * 1.05 * s;
          const py = y - (hy + 3) * 1.05 * s;
          if (k) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }
        return;
      }
      const P = b.pts.map(([a, rr]) => [x + Math.cos(a) * rr * s, y + Math.sin(a) * rr * s]);
      if (o.style === 'patch') {
        P.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        return;
      }
      const mid = (a, c) => [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
      const m0 = mid(P[0], P[1]);
      ctx.moveTo(m0[0], m0[1]);
      for (let k = 1; k <= P.length; k++) {
        const p = P[k % P.length];
        const m = mid(p, P[(k + 1) % P.length]);
        ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
      }
      ctx.closePath();
    };
    ctx.lineJoin = 'round';
    for (const b of blobs) {
      for (const ox of [-w, 0, w]) {
        for (const oy of [-h, 0, h]) {
          path(b, b.x + ox, b.y + oy, 1);
          ctx.fillStyle = o.spot;
          ctx.fill();
          if (o.style === 'patch') {
            ctx.strokeStyle = o.spot;
            ctx.lineWidth = 8;
            ctx.stroke();
          }
          path(b, b.x + ox, b.y + oy, 0.55);
          ctx.fillStyle = o.spotIn;
          ctx.fill();
        }
      }
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const geoCache = new Map();
const cached = (key, make) => {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
};
const sph = (r, color, seg = 14) => mesh(cached(`s${r}|${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(8, Math.round(seg * 0.7)))), mat(color));
const cap = (r, h, color, rs = 12) => mesh(cached(`c${r}|${h}|${rs}`, () => new THREE.CapsuleGeometry(r, h, 4, rs)), mat(color));
const cyl = (a, b, h, color, seg = 10) => mesh(cached(`y${a}|${b}|${h}|${seg}`, () => new THREE.CylinderGeometry(a, b, h, seg)), mat(color));
const at = (o, x, y, z) => (o.position.set(x, y, z), o);
const coat = (m, u, v) => ((m.userData.coat = [u, v]), m);

export class Giraffe {
  // cfg: JODI | JOURI. place: { home: { x, z, yaw }, bounds: { x0, x1, z0, z1 }, obstacles: [{ x, z, r }] }
  constructor(cfg, place) {
    this.cfg = cfg;
    this.name = cfg.name;
    this.holder = new THREE.Group();
    this.root = new THREE.Group();
    this.holder.add(this.root);
    this.build();
    this.holder.scale.setScalar(cfg.scale);
    const coatMat = new THREE.MeshStandardMaterial({ map: coatTexture(cfg), roughness: 0.74 });
    this.meshes = skinify(this.holder, { coatMaterial: coatMat, rough: 0.6 });
    this.pos = new THREE.Vector3(place.home.x, 0, place.home.z);
    this.yaw = place.home.yaw ?? 0;
    this.bounds = place.bounds;
    this.obstacles = place.obstacles;
    this.speed = 0;
    this.gait = 0;
    this.turn = 0;
    this.dest = null;
    this.destSpeed = cfg.walk;
    this.faceYaw = null;
    this.lookAt = null;
    this.P = { ...REST, ...cfg.rest };
    this.T = { ...this.P };
    this.A = this.zeroA();
    this.swayPh = 0;
    this.chewPh = 0;
    this.tailPh = Math.random() * 6;
    this.blinkT = 1 + Math.random() * 2;
    this.blinkAge = 9;
    this.beh = null;
    this.script = null;
    this.hooks = { say() {}, fx() {} };
    this.tmp = new THREE.Vector3();
    this.apply();
  }

  zeroA() {
    return { lean: 0, curve: 0, pitch: 0, yaw: 0, roll: 0, y: 0, z: 0, spin: 0, bodyRoll: 0, bodyPitch: 0, squash: 0, tuck: 0, step: 0, ear: 0, flick: 0, tWag: 0, jaw: 0 };
  }

  // ---------------------------------------------------------------- model
  build() {
    const o = this.cfg;
    const B = o.base;
    const root = this.root;
    this.legs = [];
    for (const [x, z] of [[0.21, 0.46], [-0.21, 0.46], [0.21, -0.46], [-0.21, -0.46]]) {
      const p = at(new THREE.Group(), x, 1.6, z);
      p.add(at(coat(cap(0.085, 1.25, B), 1, 1.8), 0, -0.76, 0));
      p.add(at(coat(sph(0.102, B, 12), 1, 0.6), 0, -0.76, 0.01));
      p.add(at(cyl(0.086, 0.11, 0.14, o.dark), 0, -1.53, 0.012));
      root.add(p);
      this.legs.push(p);
    }
    const body = at(new THREE.Group(), 0, 1.78, 0);
    root.add(body);
    this.body = body;
    const torso = coat(cap(0.43, 0.74, B, 18), 3, 2);
    torso.rotation.x = Math.PI / 2 - 0.1;
    body.add(torso);
    const belly = at(sph(0.34, o.cream, 16), 0, -0.21, 0.02);
    belly.scale.set(1, 0.55, 1.55);
    body.add(belly);
    const tail = at(new THREE.Group(), 0, 0.16, -0.9);
    body.add(tail);
    this.tail = tail;
    tail.add(at(cap(0.03, 0.46, B, 8), 0, -0.26, 0));
    const tuft = at(sph(0.075, o.dark, 10), 0, -0.56, 0);
    tuft.scale.set(0.8, 1.5, 0.8);
    tail.add(tuft);

    // Neck: a chain of pivots, each one segment long
    const base = at(new THREE.Group(), 0, 0.2, 0.6);
    body.add(base);
    this.neckBase = base;
    base.add(coat(sph(0.27, B, 16), 1, 1));
    this.segs = [];
    let parent = base;
    for (let i = 0; i < NECK; i++) {
      const s = at(new THREE.Group(), 0, i === 0 ? 0.04 : SEG, 0);
      const r = lerp(0.2, 0.135, i / (NECK - 1));
      s.add(at(coat(cap(r, SEG * 0.85, B, 14), 1, 0.7), 0, SEG / 2, 0));
      const mane = at(sph(0.07, o.mane, 10), 0, SEG / 2, -r + 0.012);
      mane.scale.set(0.5, 1.9, 0.75);
      s.add(mane);
      parent.add(s);
      this.segs.push(s);
      parent = s;
    }
    const head = at(new THREE.Group(), 0, SEG, 0);
    parent.add(head);
    this.head = head;
    this.buildHead(head);
    if (o.id === 'jodi') this.buildBowTie(this.segs[0]);
    else this.buildFlower(head);
  }

  buildHead(H) {
    const o = this.cfg;
    const B = o.base;
    const skull = at(coat(sph(0.23, B, 18), 2, 1), 0, 0.1, 0.06);
    skull.scale.set(1, 0.95, 1);
    const muzzle = at(sph(0.14, o.cream, 16), 0, -0.04, 0.27);
    muzzle.scale.set(0.95, 0.8, 1.1);
    H.add(skull, muzzle);
    this.jaw = at(new THREE.Group(), 0, -0.1, 0.2);
    const jawM = at(sph(0.11, o.cream, 12), 0, -0.005, 0.09);
    jawM.scale.set(0.8, 0.5, 1.1);
    this.jaw.add(jawM);
    H.add(this.jaw);
    for (const s of [1, -1]) {
      const n = at(sph(0.019, o.dark, 8), 0.05 * s, 0.02, 0.418);
      n.scale.set(1, 0.6, 0.6);
      H.add(n);
      const cheek = at(sph(0.042, o.cheek, 10), 0.118 * s, -0.04, 0.31);
      cheek.scale.set(0.45, 0.62, 0.9);
      cheek.rotation.y = 0.55 * s;
      H.add(cheek);
    }
    // Mouth: a smile for Jouri, a short neat line for Jodi
    const jouri = o.id === 'jouri';
    const arc = jouri ? Math.PI * 0.75 : Math.PI * 0.4;
    const mouth = mesh(new THREE.TorusGeometry(jouri ? 0.045 : 0.055, 0.008, 6, 14, arc), mat(o.dark));
    mouth.position.set(0, jouri ? -0.04 : -0.03, 0.405);
    mouth.rotation.set(-0.35, 0, -Math.PI / 2 - arc / 2);
    H.add(mouth);
    // Tongue: scaled along z to stick out
    this.tongue = at(new THREE.Group(), 0, -0.09, 0.34);
    const tg = at(cap(0.032, 0.2, '#d465a8', 10), 0, 0, 0.12);
    tg.rotation.x = Math.PI / 2;
    tg.scale.set(1.25, 1, 0.75);
    this.tongue.add(tg);
    H.add(this.tongue);

    // Big front eyes with lids, long lashes and brows
    this.eyes = [];
    this.lids = [];
    this.brows = [];
    const eyeMat = '#1d130f';
    for (const s of [1, -1]) {
      const e = at(new THREE.Group(), 0.105 * s, 0.165, 0.24);
      e.lookAt(0.105 * s * 3.2, 0.62, 1.4);
      const ball = sph(0.075, eyeMat, 16);
      ball.scale.set(0.8, 1.1, 0.5);
      const shine = at(sph(0.022, '#ffffff', 8), 0.016 * s, 0.03, 0.03);
      const shine2 = at(sph(0.011, '#ffffff', 6), -0.017 * s, -0.026, 0.033);
      e.add(ball, shine, shine2);
      const lid = new THREE.Group();
      const shell = mesh(cached('lid', () => new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)), mat(B));
      shell.scale.set(0.067, 0.09, 0.09);
      lid.add(shell);
      [[0.0, 0.045], [0.55, 0.06], [1.05, 0.078]].forEach(([phi, len]) => {
        const lash = cap(0.0065, len, eyeMat, 5);
        const a = phi * s;
        const p = new THREE.Vector3(Math.sin(a) * 0.066, 0, Math.cos(a) * 0.088);
        const dir = new THREE.Vector3(s * (0.08 + Math.abs(Math.sin(a)) * 0.7), -0.22, 1).normalize();
        lash.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        lash.position.copy(p).addScaledVector(dir, len * 0.45);
        lid.add(lash);
      });
      e.add(lid);
      H.add(e);
      this.eyes.push(e);
      this.lids.push(lid);
      const brow = at(new THREE.Group(), 0.1 * s, 0.275, 0.17);
      const bm = cap(0.013, 0.07, o.dark, 6);
      bm.rotation.z = Math.PI / 2;
      brow.add(bm);
      brow.rotation.set(-0.5, 0.3 * s, 0);
      H.add(brow);
      this.brows.push(brow);
    }

    // Ossicones and ears
    for (const s of [1, -1]) {
      const oss = at(cyl(0.028, 0.036, 0.18, B, 8), 0.075 * s, 0.36, -0.03);
      oss.rotation.z = -0.2 * s;
      const knob = at(sph(0.045, o.dark, 10), 0.093 * s, 0.45, -0.03);
      H.add(oss, knob);
    }
    this.ears = [];
    for (const s of [1, -1]) {
      const p = at(new THREE.Group(), 0.2 * s, 0.22, -0.04);
      const ear = at(mesh(cached('ear', () => new THREE.ConeGeometry(0.06, 0.21, 10)), mat(B)), 0.1 * s, 0, 0);
      ear.rotation.z = (-Math.PI / 2) * s;
      ear.scale.set(1, 1, 0.5);
      const inner = at(mesh(cached('earIn', () => new THREE.ConeGeometry(0.037, 0.15, 8)), mat('#ffb3c4')), 0.09 * s, 0, 0.018);
      inner.rotation.z = (-Math.PI / 2) * s;
      inner.scale.set(1, 1, 0.4);
      p.add(ear, inner);
      H.add(p);
      this.ears.push(p);
    }
    this.mouthAnchor = at(new THREE.Object3D(), 0, -0.07, 0.44);
    H.add(this.mouthAnchor);
    // Top of the head, between the ossicones (height chart, crown)
    this.crownAnchor = at(new THREE.Object3D(), 0, 0.49, -0.03);
    H.add(this.crownAnchor);
  }

  buildBowTie(seg) {
    const g = at(new THREE.Group(), 0, 0.1, 0.195);
    g.rotation.x = -0.35;
    for (const s of [1, -1]) {
      const wing = at(mesh(cached('bow', () => new THREE.ConeGeometry(0.06, 0.12, 4)), mat('#2c3e66')), 0.06 * s, 0, 0);
      wing.rotation.z = (Math.PI / 2) * s;
      wing.scale.set(1, 1, 0.45);
      g.add(wing);
    }
    g.add(sph(0.032, '#3f5a8f', 8));
    seg.add(g);
  }

  buildFlower(H) {
    const f = at(new THREE.Group(), -0.17, 0.33, -0.07);
    f.rotation.set(0.2, -0.6, 0.5);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const p = at(sph(0.034, '#ff8fb1', 8), Math.cos(a) * 0.04, Math.sin(a) * 0.04, 0);
      p.scale.set(1, 1, 0.45);
      f.add(p);
    }
    f.add(at(sph(0.024, '#ffd166', 8), 0, 0, 0.01));
    H.add(f);
  }

  // ---------------------------------------------------------------- helpers
  // Local (zoo space) position of an object inside the rig
  localOf(obj, out = new THREE.Vector3()) {
    obj.getWorldPosition(out);
    return this.holder.parent ? this.holder.parent.worldToLocal(out) : out;
  }

  worldOf(obj, out = new THREE.Vector3()) {
    return obj.getWorldPosition(out);
  }

  goTo(x, z, speed = this.cfg.walk) {
    const b = this.bounds;
    this.dest = { x: clamp(x, b.x0, b.x1), z: clamp(z, b.z0, b.z1) };
    this.destSpeed = speed;
  }

  get arrived() {
    return !this.dest;
  }

  trigger(name, dur) {
    if (this.script) return;
    this.beh = { name, t: 0, dur: dur ?? 3 };
  }

  // Find the stance and neck reach that put the mouth on `target` (zoo space), facing +Z.
  solve(target, { pitch = 0.3, minZ = -8.5, maxZ = -3.6 } = {}) {
    const saveP = { ...this.P };
    const saveA = this.A;
    const sx = this.pos.x;
    const sz = this.pos.z;
    const syaw = this.yaw;
    this.A = this.zeroA();
    this.yaw = 0;
    this.pos.x = target.x;
    Object.assign(this.P, { lean: this.cfg.rest.lean, curve: this.cfg.rest.curve, twist: 0, roll: 0, sway: 0, pitch, tongue: 0 });
    let r = 0.5;
    const m = new THREE.Vector3();
    for (let it = 0; it < 4; it++) {
      let lo = 0;
      let hi = 1;
      for (let k = 0; k < 14; k++) {
        r = (lo + hi) / 2;
        this.P.reach = r;
        this.apply();
        this.holder.updateMatrixWorld(true);
        this.localOf(this.mouthAnchor, m);
        if (m.y > target.y) lo = r;
        else hi = r;
      }
      this.pos.z = clamp(this.pos.z + (target.z - m.z), minZ, maxZ);
    }
    const out = { r, x: this.pos.x, z: this.pos.z, pitch };
    this.P = saveP;
    this.A = saveA;
    this.pos.set(sx, 0, sz);
    this.yaw = syaw;
    this.apply();
    return out;
  }

  // ---------------------------------------------------------------- frame
  update(dt, t, env) {
    this.T = { ...REST, ...this.cfg.rest };
    this.A = this.zeroA();
    this.R = {};
    this.lookAt = null;
    if (this.script) this.script.step(this, dt, this.script);
    else this.behave(dt, t, env);

    // Look at a point: split the turn between neck and head
    if (this.lookAt) {
      const hp = this.localOf(this.head, this.tmp);
      const dx = this.lookAt.x - hp.x;
      const dz = this.lookAt.z - hp.z;
      const c = Math.cos(this.yaw);
      const s = Math.sin(this.yaw);
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;
      this.T.twist = clamp(Math.atan2(lx, lz), -1.15, 1.15);
      const up = Math.atan2(this.lookAt.y - hp.y, Math.max(0.4, Math.hypot(dx, dz)));
      this.T.pitch += -clamp(up, -0.8, 0.6) * 0.75;
    }

    // Blinks: Jodi slow and heavy, Jouri quick
    this.blinkT -= dt;
    this.blinkAge += dt;
    const slow = this.cfg.id === 'jodi';
    if (this.blinkT <= 0) {
      this.blinkAge = 0;
      this.blinkT = slow ? 3.6 + Math.random() * 3 : 1.8 + Math.random() * 2.4;
      if (!slow && Math.random() < 0.3) this.blinkT = 0.32;
    }
    const bd = slow ? 0.75 : 0.16;
    const blink = this.blinkAge < bd ? Math.sin((this.blinkAge / bd) * Math.PI) : 0;

    // Walking
    let want = 0;
    const prevYaw = this.yaw;
    if (this.manual) {
      // Leaf Catch drives position and yaw itself; the speed only sets the leg gait
      this.speed = damp(this.speed, this.manual.speed || 0, 8, dt);
    } else if (this.dest) {
      const dx = this.dest.x - this.pos.x;
      const dz = this.dest.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.12) this.dest = null;
      else {
        const target = Math.atan2(dx, dz);
        let diff = ((target - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        this.yaw = dampAngle(this.yaw, target, slow ? 2 : 2.8, dt);
        want = this.destSpeed * clamp(d / 0.8, 0.22, 1) * Math.max(0.12, Math.cos(diff));
      }
    } else if (this.faceYaw !== null) this.yaw = dampAngle(this.yaw, this.faceYaw, 2.2, dt);
    if (!this.manual) {
      this.speed = damp(this.speed, want, 4, dt);
      this.pos.x += Math.sin(this.yaw) * this.speed * dt;
      this.pos.z += Math.cos(this.yaw) * this.speed * dt;
    }
    let turn = this.yaw - prevYaw;
    if (turn > Math.PI) turn -= Math.PI * 2;
    if (turn < -Math.PI) turn += Math.PI * 2;
    this.turn = turn / Math.max(dt, 1e-3);
    for (const ob of this.manual ? [] : this.obstacles) {
      const dx = this.pos.x - ob.x;
      const dz = this.pos.z - ob.z;
      const d = Math.hypot(dx, dz);
      if (d < ob.r && d > 1e-3) this.pos.set(ob.x + (dx / d) * ob.r, 0, ob.z + (dz / d) * ob.r);
    }
    const other = env?.other;
    if (other && !this.script) {
      const dx = this.pos.x - other.pos.x;
      const dz = this.pos.z - other.pos.z;
      const d = Math.hypot(dx, dz);
      const k = other.script ? 1 : 0.5;
      if (d < 1.7 && d > 1e-3) {
        this.pos.x += (dx / d) * (1.7 - d) * k;
        this.pos.z += (dz / d) * (1.7 - d) * k;
      }
    }
    const b = this.bounds;
    if (b && !this.manual) {
      this.pos.x = clamp(this.pos.x, b.x0, b.x1);
      this.pos.z = clamp(this.pos.z, b.z0, b.z1);
    }
    this.gait += dt * ((this.speed * 3.3) / this.cfg.scale + Math.min(2.5, Math.abs(this.turn)) * 1.6);
    if (this.speed > 0.1) this.A.lean += Math.sin(this.gait * 2) * 0.035;

    // Ease every parameter toward its target
    for (const k of Object.keys(this.T)) this.P[k] = damp(this.P[k] ?? this.T[k], this.T[k], this.R[k] ?? RATE[k] ?? 4, dt);
    this.blink = blink;
    this.swayPh += dt * this.P.swayF * Math.PI * 2;
    this.chewPh += dt * (slow ? 4.5 : 9);
    this.tailPh += dt * (2.2 + this.P.tail * 8);
    this.apply();
  }

  apply() {
    const P = this.P;
    const A = this.A;
    this.holder.position.set(this.pos.x, 0, this.pos.z);
    this.holder.rotation.y = this.yaw;
    const reach = P.reach;
    const splay = smooth(0.55, 1, reach) * 0.34;
    const lean = lerp(P.lean, 1.36, reach) + A.lean;
    const curve = lerp(P.curve, 0.165, reach) + A.curve;
    this.root.position.set(0, A.y - splay * 0.16, A.z);
    this.root.rotation.set(0, A.spin, A.bodyRoll);
    const sq = 1 + A.squash;
    this.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    this.body.rotation.x = reach * 0.1 + A.bodyPitch;

    // Legs: a pacing walk (both legs on one side swing together), dance steps, hop tucks, splay to reach low
    const amp = Math.min(0.42, this.speed * 0.45 + Math.min(1, Math.abs(this.turn)) * 0.12);
    const sw = Math.sin(this.gait) * amp;
    const [fl, fr, bl, br] = this.legs;
    const stepL = Math.max(0, A.step) * 0.5;
    const stepR = Math.max(0, -A.step) * 0.5;
    fl.rotation.set(sw - A.tuck * 0.55 - stepL, 0, splay);
    fr.rotation.set(-sw - A.tuck * 0.55 - stepR, 0, -splay);
    bl.rotation.set(sw + A.tuck * 0.4 + stepL * 0.6, 0, 0);
    br.rotation.set(-sw + A.tuck * 0.4 + stepR * 0.6, 0, 0);

    // Neck chain, then a head that stays level and aims
    this.neckBase.rotation.set(lean, P.twist * 0.12, 0);
    let sumX = lean;
    let sumZ = 0;
    for (let i = 0; i < NECK; i++) {
      const sz = P.sway * Math.sin(this.swayPh - i * 0.85);
      this.segs[i].rotation.set(curve, P.twist * 0.1, sz);
      sumX += curve;
      sumZ += sz;
    }
    this.head.rotation.set(-sumX + P.pitch + A.pitch, P.twist * 0.38 + A.yaw, -sumZ * 0.85 + P.roll + A.roll);

    // Face
    const chew = P.chew * (0.5 + 0.5 * Math.sin(this.chewPh));
    this.jaw.rotation.set(chew * 0.22 + A.jaw, Math.sin(this.chewPh * 0.5) * P.chew * 0.12, 0);
    this.tongue.scale.set(1, 1, 0.12 + Math.max(0, P.tongue) * 0.95);
    this.tongue.rotation.set(0.15 - P.tCurl, P.tWag + A.tWag, 0);
    const lidBase = Math.max(P.lid, this.blink || 0);
    this.lids.forEach((lid, i) => {
      const k = clamp(i === 0 ? Math.max(lidBase, P.wink) : lidBase, 0, 1);
      lid.rotation.x = lerp(-1.25, 1.32, k);
    });
    this.brows.forEach((br, i) => {
      const s = i === 0 ? 1 : -1;
      const raise = i === 0 ? P.browL : P.browR;
      const tilt = i === 0 ? P.tiltL : P.tiltR;
      br.position.y = 0.275 + raise * 0.032;
      br.rotation.z = s * tilt;
    });
    this.ears.forEach((e, i) => {
      const s = i === 0 ? 1 : -1;
      e.rotation.set(A.flick * (i === 0 ? 1 : -0.7), 0, -s * (P.ear + A.ear));
    });
    this.tail.rotation.set(0.28 + Math.abs(Math.sin(this.tailPh)) * 0.08, 0, Math.sin(this.tailPh) * P.tail);
  }

  // ---------------------------------------------------------------- free behaviour
  behave(dt, t, env) {
    if (!this.beh || this.beh.t >= this.beh.dur) {
      const prev = this.beh?.name;
      this.beh = this.pick(env, prev);
      this.onStart(this.beh, env);
      if (prev && this.cfg.id === 'jouri' && ['tongue', 'sneeze', 'dance', 'hop', 'wiggle', 'hide'].includes(prev)) env?.onSilly?.(prev);
    }
    const b = this.beh;
    b.t += dt;
    const fn = BEHAVIOURS[b.name];
    if (fn) fn(this, b, dt, t, env);
  }

  pick(env, prev) {
    const jodi = this.cfg.id === 'jodi';
    const near = env?.playerNear ?? 99;
    const list = jodi
      ? [['stand', 4], ['nod', near < 8 ? 3 : 0.4], ['stroll', 2.2], ['graze', 1.4]]
      : [['bob', 2], ['tongue', 2], ['wiggle', 2], ['hop', 2], ['dance', 1.6], ['sneeze', 1.3], ['chase', 1.6], ['wander', 2], ['hide', env?.tree ? 1.1 : 0], ['visit', env?.atFence && near > 2.4 ? 4 : 0]];
    const pool = list.filter(([n, w]) => n !== prev && w > 0);
    let sum = pool.reduce((a, [, w]) => a + w, 0) * Math.random();
    for (const [n, w] of pool) {
      sum -= w;
      if (sum <= 0) return { name: n, t: 0, dur: 4 };
    }
    return { name: pool[0][0], t: 0, dur: 4 };
  }

  onStart(b, env) {
    const DUR = { stand: 4 + Math.random() * 3, nod: 2.6, stroll: 14, graze: 16, bob: 4, tongue: 3.2, wiggle: 3.6, hop: 2.6, dance: 5.2, sneeze: 2.6, chase: 9, wander: 12, visit: 14, sigh: 3, hide: 15 };
    b.dur = DUR[b.name] ?? 4;
    if (b.name === 'hide' && env?.tree) this.goTo(env.tree.x + 0.27, env.tree.z - 1.12, this.cfg.walk * 1.4);
    if (b.name === 'stroll' || b.name === 'wander') {
      const p = env?.randomSpot?.() || { x: this.pos.x, z: this.pos.z };
      this.goTo(p.x, p.z, this.cfg.walk);
    }
    if (b.name === 'graze' && env?.tree) this.goTo(env.tree.x - 0.2, env.tree.z + 1.75, this.cfg.walk);
    if (b.name === 'visit' && env?.fencePoint) {
      const p = env.fencePoint();
      this.goTo(p.x, p.z, this.cfg.walk * 1.3);
    }
    if (b.name === 'nod') this.hooks.say(this, 'hum');
    if (b.name === 'tongue') this.hooks.say(this, 'blep');
    if (b.name === 'sneeze') this.hooks.say(this, 'ahh');
    if (b.name === 'sigh') b.puffed = false;
  }
}

// Each behaviour writes this frame's targets (g.T), additive wobbles (g.A), destination and gaze.
const BEHAVIOURS = {
  // ------------------------------------------------ Jodi
  stand(g, b, dt, t, env) {
    g.T.chew = 0.5;
    if (env?.playerNear < 9) {
      g.lookAt = env.playerHead;
      g.T.browR = 1;
    } else g.T.twist = Math.sin(t * 0.25) * 0.3;
    g.faceYaw = null;
  },
  nod(g, b, dt, t, env) {
    if (env?.playerHead) g.lookAt = env.playerHead;
    g.T.browR = 1;
    g.T.browL = 0.2;
    g.T.lid = 0.3;
    g.A.pitch += Math.sin(b.t * 6.5) * 0.2 * smooth(0.2, 0.5, b.t) * (1 - smooth(1.6, 2.1, b.t));
  },
  stroll(g, b, dt, t) {
    g.T.pitch = 0.05;
    g.T.chew = 0.3;
    if (g.arrived) b.t = Math.max(b.t, b.dur - 0.5);
  },
  graze(g, b, dt, t, env) {
    if (!g.arrived) {
      if (b.t > 10) b.t = b.dur;
      return;
    }
    if (!b.at) b.at = b.t;
    const k = b.t - b.at;
    g.faceYaw = Math.PI;
    g.T.lean = 0.02;
    g.T.curve = -0.03;
    g.T.pitch = -0.55;
    g.T.chew = 0.6;
    g.T.lid = 0.25;
    g.T.tongue = Math.sin(k * 1.7) > 0.75 ? 0.9 : 0;
    if (k > 5.5) b.t = b.dur;
  },
  sigh(g, b, dt, t, env) {
    const other = env?.other;
    if (other) g.lookAt = g.localOf(other.head, new THREE.Vector3());
    const k = b.t;
    g.T.browL = 0.8;
    g.T.browR = 0.8;
    g.T.tiltL = -0.2;
    g.T.tiltR = -0.2;
    if (k < 0.8) {
      g.T.lean -= 0.07;
      g.A.squash = smooth(0, 0.8, k) * 0.04;
      g.T.lid = 0.45;
    } else if (k < 1.9) {
      g.T.lid = 0.96;
      g.T.pitch += 0.3;
      g.T.lean += 0.1;
      g.T.ear = 0.75;
      if (!b.puffed) {
        b.puffed = true;
        g.hooks.say(g, 'sigh');
        g.hooks.fx(g, 'breath');
      }
    } else {
      g.T.lid = 0.6;
      g.A.yaw = Math.sin((k - 1.9) * 7) * 0.12 * (1 - smooth(1.9, 3, k));
    }
  },
  // ------------------------------------------------ Jouri
  bob(g, b, dt, t, env) {
    if (env?.playerNear < 10) g.lookAt = env.playerHead;
    g.A.pitch += Math.sin(t * 9) * 0.2;
    g.A.y += Math.abs(Math.sin(t * 4.5)) * 0.06;
    g.A.ear = Math.sin(t * 9) * 0.35;
    g.A.roll = Math.sin(t * 4.5) * 0.12;
    g.T.tail = 0.7;
    g.T.lid = 0;
  },
  tongue(g, b, dt, t, env) {
    if (env?.playerNear < 10) g.lookAt = env.playerHead;
    const on = smooth(0.2, 0.45, b.t) * (1 - smooth(2.7, 3.1, b.t));
    g.T.tongue = on * 1.05;
    g.A.tWag = Math.sin(t * 11) * 0.45 * on;
    g.T.wink = on;
    g.T.roll = 0.3;
    g.A.flick = Math.sin(t * 13) * 0.2 * on;
  },
  wiggle(g, b, dt, t) {
    g.T.sway = 0.24 * (1 - smooth(3, 3.6, b.t));
    g.T.swayF = 1.6;
    g.T.lid = 0.6;
    g.A.ear = Math.sin(t * 7) * 0.3;
    g.T.tail = 0.6;
  },
  hop(g, b, dt, t) {
    const ph = (b.t / 0.65) * Math.PI;
    const up = b.t < 2.6 ? Math.abs(Math.sin(ph)) : 0;
    g.A.y = up * 0.32;
    g.A.tuck = up;
    g.A.squash = up < 0.15 && b.t < 2.6 ? -0.06 : 0.04 * up;
    g.A.ear = up * 0.6;
    g.A.pitch = -up * 0.12;
    g.T.lid = 0;
    const n = Math.floor(b.t / 0.65);
    if (n !== b.n) {
      b.n = n;
      if (n > 0 && n < 5) g.hooks.say(g, 'boing');
    }
  },
  dance(g, b, dt, t) {
    const k = smooth(0, 0.5, b.t) * (1 - smooth(4.6, 5.2, b.t));
    g.A.step = Math.sin(t * 6) * k;
    g.A.bodyRoll = Math.sin(t * 6) * 0.06 * k;
    g.A.y = Math.abs(Math.sin(t * 6)) * 0.05 * k;
    g.T.sway = 0.13 * k;
    g.T.swayF = 0.95;
    g.A.pitch = Math.sin(t * 12) * 0.1 * k;
    g.faceYaw = g.yaw + dt * 1.1 * k + 0.3;
    g.T.tail = 0.9;
    g.T.lid = 0.55;
    g.A.ear = Math.sin(t * 12) * 0.3 * k;
  },
  sneeze(g, b, dt, t) {
    const k = b.t;
    if (k < 0.95) {
      g.T.pitch = -0.45;
      g.T.lean -= 0.08;
      g.T.lid = 0.55 + k * 0.3;
      g.A.pitch = Math.sin(k * 40) * 0.02 * k;
      g.T.browL = g.T.browR = 0.9;
      g.T.tiltL = g.T.tiltR = -0.25;
    } else {
      if (!b.done) {
        b.done = true;
        g.hooks.say(g, 'sneeze');
        g.hooks.fx(g, 'sneeze');
      }
      const s = k - 0.95;
      g.A.pitch = Math.exp(-s * 5) * 0.75 - 0.1 * (1 - smooth(0, 0.3, s));
      g.A.z = Math.exp(-s * 6) * 0.08;
      g.A.yaw = Math.sin(s * 22) * 0.22 * Math.exp(-s * 2.2) * smooth(0.25, 0.4, s);
      g.T.lid = s < 0.4 ? 1 : 0.1;
      g.A.ear = Math.sin(s * 22) * 0.4 * Math.exp(-s * 2);
    }
  },
  chase(g, b, dt, t, env) {
    const bf = env?.butterfly;
    if (!bf) return;
    g.lookAt = bf;
    const dx = bf.x - g.pos.x;
    const dz = bf.z - g.pos.z;
    if (Math.hypot(dx, dz) > 1.6) g.goTo(bf.x - dx * 0.25, bf.z - dz * 0.25, 1.45);
    g.T.ear = -0.05;
    g.T.lid = 0;
    g.T.tail = 0.8;
    const hp = g.localOf(g.mouthAnchor, g.tmp);
    const close = Math.hypot(bf.x - hp.x, bf.y - hp.y, bf.z - hp.z) < 1.1;
    g.T.tongue = close && Math.sin(t * 5) > 0.2 ? 1 : 0;
    if (b.t > b.dur - 0.2) g.dest = null;
  },
  wander(g, b, dt, t) {
    g.A.pitch += Math.sin(g.gait * 2) * 0.06;
    g.T.tail = 0.5;
    if (g.arrived) b.t = Math.max(b.t, b.dur - 0.3);
  },
  // Jouri "hides" behind the skinny acacia trunk: head behind it, eyes shut, peeking now and then
  hide(g, b, dt, t, env) {
    if (!g.arrived) {
      g.T.ear = -0.05;
      g.T.lid = 0;
      if (b.t > 8) b.t = b.dur;
      return;
    }
    if (b.at === undefined) b.at = b.t;
    const k = b.t - b.at;
    g.faceYaw = 0;
    const peek = k % 2.4 > 1.7;
    const side = Math.floor(k / 2.4) % 2 ? 1 : -1;
    g.T.lean = 0.42;
    g.T.roll = 0;
    g.T.twist = 0;
    g.T.lid = peek ? 0.1 : 0.96;
    g.T.wink = peek ? 1 : 0;
    g.T.ear = 0.7;
    g.A.yaw = peek ? side * 0.42 : 0;
    g.A.roll = peek ? side * 0.18 : 0;
    g.T.tongue = peek && k % 2.4 > 2.0 ? 0.8 : 0;
    g.T.tail = 0.9;
    g.A.squash = -0.025;
    if (k > 7.5) b.t = b.dur;
  },
  visit(g, b, dt, t, env) {
    if (!g.arrived) {
      g.T.ear = -0.05;
      if (b.t > 9) b.t = b.dur - 4;
      return;
    }
    if (!b.at) b.at = b.t;
    const k = b.t - b.at;
    g.faceYaw = 0;
    if (env?.playerHead) g.lookAt = env.playerHead;
    g.A.pitch += Math.sin(t * 8) * 0.14;
    g.A.ear = Math.sin(t * 8) * 0.3;
    g.T.tongue = k > 1.2 && k < 2.6 ? 1 : 0;
    g.A.tWag = Math.sin(t * 11) * 0.4;
    g.T.tail = 0.8;
    if (k > 4) b.t = b.dur;
  },
};
