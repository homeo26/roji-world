import { THREE, sph, cone, tor, at, rot, scl, bake } from './kit.js';

// Pond ducks: a white mama duck, a mallard papa and fluffy yellow ducklings that paddle after mama.
// Local frame of the pond owner; the duck floats with its body at the water surface y.

const KINDS = {
  white: { body: '#fffaf4', wing: '#efe6da', head: '#fffaf4', bill: '#ffa53b', s: 1, speed: 0.5 },
  mallard: { body: '#e3d1b4', wing: '#a8835e', head: '#3f9a6a', ring: '#ffffff', bill: '#ffd166', s: 1.05, speed: 0.48 },
  duckling: { body: '#ffe27a', wing: '#ffd34a', head: '#ffe27a', bill: '#ffa53b', s: 0.52, speed: 0.55 },
};

export class Duck {
  // pond: { x, z, rx, rz, y, bridge: { z, half, gapX, gapHalf } }
  constructor(kind, pond, x, z, seed = 1) {
    const K = KINDS[kind];
    this.kind = kind;
    this.K = K;
    this.pond = pond;
    this.holder = new THREE.Group();
    const body = new THREE.Group();
    const baby = kind === 'duckling';
    body.add(at(scl(sph(0.17, K.body, { rough: 0.7 }, 14), 1, baby ? 0.85 : 0.72, baby ? 1.1 : 1.32), 0, 0.08, 0));
    body.add(rot(at(scl(cone(0.08, 0.16, K.body, 8, { rough: 0.7 }), 1, 1, 0.6), 0, 0.15, -0.2), -1.0, 0, 0));
    for (const s of [1, -1]) {
      body.add(rot(at(scl(sph(0.1, K.wing, { rough: 0.7 }, 10), 0.32, 0.55, 1.15), s * 0.13, 0.12, -0.04), 0.25, 0, s * 0.25));
    }
    const head = new THREE.Group();
    head.position.set(0, baby ? 0.21 : 0.24, baby ? 0.13 : 0.17);
    const hs = baby ? 1.3 : 1;
    head.add(at(sph(0.1 * hs, K.head, { rough: 0.6 }, 14), 0, 0.03 * hs, 0));
    if (K.ring) head.add(rot(at(tor(0.07, 0.015, K.ring, undefined, Math.PI * 2, 6, 14), 0, -0.05, -0.01), Math.PI / 2 - 0.3, 0, 0));
    head.add(at(scl(sph(0.06 * hs, K.bill, { rough: 0.5 }, 10), 0.95, 0.4, 1.35), 0, 0.0, 0.1 * hs));
    for (const s of [1, -1]) {
      head.add(at(sph(0.017 * hs, '#1d130f', { rough: 0.2 }, 8), s * 0.06 * hs, 0.06 * hs, 0.065 * hs));
      head.add(at(sph(0.006 * hs, '#ffffff', { rough: 0.2 }, 6), s * 0.064 * hs, 0.068 * hs, 0.079 * hs));
      head.add(at(scl(sph(0.022 * hs, '#ff9eb5', { rough: 0.7 }, 8), 1, 0.6, 0.5), s * 0.075 * hs, 0.015 * hs, 0.05 * hs));
    }
    body.add(head);
    bake(head);
    bake(body, [head]);
    body.traverse((o) => {
      if (o.isMesh) o.castShadow = false;
    });
    this.body = body;
    this.head = head;
    this.holder.add(body);
    this.holder.scale.setScalar(K.s);
    this.pos = new THREE.Vector3(x, 0, z);
    this.yaw = seed;
    this.speed = 0;
    this.ph = seed * 1.7;
    this.dest = null;
    this.viaX = null;
    this.peck = 0;
    this.rand = ((s) => () => ((s = (s * 16807) % 2147483647) / 2147483647))(seed * 977 + 13);
  }

  inside(x, z, k = 0.78) {
    const p = this.pond;
    return ((x - p.x) / (p.rx * k)) ** 2 + ((z - p.z) / (p.rz * k)) ** 2 < 1;
  }

  pickDest() {
    const p = this.pond;
    for (let i = 0; i < 20; i++) {
      const a = this.rand() * Math.PI * 2;
      const r = Math.sqrt(this.rand()) * 0.75;
      const x = p.x + Math.cos(a) * p.rx * r;
      const z = p.z + Math.sin(a) * p.rz * r;
      if (Math.abs(z - p.bridge.z) < p.bridge.half + 0.25) continue;
      return { x, z };
    }
    return { x: p.x, z: p.z + p.rz * 0.5 };
  }

  // Go to (x, z); under the bridge only through its tall middle.
  route(x, z) {
    const b = this.pond.bridge;
    const sideA = this.pos.z > b.z;
    const sideB = z > b.z;
    if (sideA !== sideB && Math.abs(this.pos.z - b.z) > 0.15) {
      if (this.viaX === null) this.viaX = b.gapX + (this.rand() - 0.5) * b.gapHalf;
      return { x: this.viaX, z: b.z };
    }
    this.viaX = null;
    return { x, z };
  }

  // env: { food: [{ p, alive }], leader: Duck | null, slot, t }
  update(dt, t, env) {
    const p = this.pond;
    let tx = null;
    let tz = null;
    let want = 0;
    let target = null;
    if (this.peck > 0) this.peck = Math.max(0, this.peck - dt);
    else if (env.food?.length) {
      let best = 7;
      for (const f of env.food) {
        if (!f.alive || !f.floating) continue;
        const d = Math.hypot(f.p.x - this.pos.x, f.p.z - this.pos.z);
        if (d < best) {
          best = d;
          target = f;
        }
      }
    }
    if (this.peck > 0) want = 0;
    else if (target) {
      ({ x: tx, z: tz } = this.route(target.p.x, target.p.z));
      want = this.K.speed * 1.6;
      if (Math.hypot(target.p.x - this.pos.x, target.p.z - this.pos.z) < 0.16 * this.K.s + 0.08) {
        target.alive = false;
        this.peck = 0.7;
        env.onEat?.(this, target);
      }
    } else if (env.leader) {
      const L = env.leader;
      const back = 0.34 + env.slot * 0.26;
      ({ x: tx, z: tz } = this.route(L.pos.x - Math.sin(L.yaw) * back, L.pos.z - Math.cos(L.yaw) * back));
      const d = Math.hypot(tx - this.pos.x, tz - this.pos.z);
      want = Math.min(this.K.speed * 1.5, d * 1.4);
    } else {
      if (!this.dest || Math.hypot(this.dest.x - this.pos.x, this.dest.z - this.pos.z) < 0.2) {
        this.dest = this.pickDest();
        this.wait = 1 + this.rand() * 3;
      }
      if (this.wait > 0) this.wait -= dt;
      else {
        ({ x: tx, z: tz } = this.route(this.dest.x, this.dest.z));
        want = this.K.speed;
      }
    }
    if (tx !== null) {
      const ty = Math.atan2(tx - this.pos.x, tz - this.pos.z);
      let d = ty - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * (1 - Math.exp(-4 * dt));
      if (Math.abs(d) > 1.2) want *= 0.4;
    }
    this.speed += (want - this.speed) * (1 - Math.exp(-3 * dt));
    this.pos.x += Math.sin(this.yaw) * this.speed * dt;
    this.pos.z += Math.cos(this.yaw) * this.speed * dt;
    // Stay in the water
    const ex = (this.pos.x - p.x) / (p.rx * 0.84);
    const ez = (this.pos.z - p.z) / (p.rz * 0.84);
    const e = Math.hypot(ex, ez);
    if (e > 1) {
      this.pos.x = p.x + (ex / e) * p.rx * 0.84;
      this.pos.z = p.z + (ez / e) * p.rz * 0.84;
    }
    // Keep a little space from the others
    for (const o of env.others || []) {
      if (o === this) continue;
      const dx = this.pos.x - o.pos.x;
      const dz = this.pos.z - o.pos.z;
      const dd = Math.hypot(dx, dz);
      const min = 0.17 * (this.K.s + o.K.s);
      if (dd > 1e-4 && dd < min) {
        this.pos.x += (dx / dd) * (min - dd) * 0.5;
        this.pos.z += (dz / dd) * (min - dd) * 0.5;
      }
    }
    const bob = Math.sin(t * 2.2 + this.ph) * 0.012;
    this.holder.position.set(this.pos.x, p.y + bob - 0.02 * this.K.s, this.pos.z);
    this.holder.rotation.set(0, this.yaw, Math.sin(t * 3 + this.ph) * 0.04 * (0.4 + this.speed));
    const dip = this.peck > 0 ? Math.sin((1 - this.peck / 0.7) * Math.PI) : 0;
    this.head.rotation.x = dip * 1.0 + Math.sin(t * 4 + this.ph) * 0.06 * this.speed;
    this.head.position.z = (this.kind === 'duckling' ? 0.13 : 0.17) + dip * 0.05;
    this.head.position.y = (this.kind === 'duckling' ? 0.21 : 0.24) - dip * 0.08;
  }
}
