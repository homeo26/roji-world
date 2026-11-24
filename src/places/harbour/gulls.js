import * as THREE from 'three';
import { gullGeometries } from './models.js';

// Seagulls: three instanced meshes (body, left wing, right wing) for the whole flock.
// They sit on perches, hop and peck, fly off in a loop when someone walks up, and come down
// to peck at crumbs when the kids feed them.

export class Gulls {
  // perches: [{ x, y, z, yaw? }] local positions. bounds: { x0, x1, z0, z1 } of the sky they circle in.
  constructor(perches, { count = 7, bounds, seed = 3 } = {}) {
    const { body, wing } = gullGeometries();
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
    this.body = new THREE.InstancedMesh(body, material, count);
    this.wingL = new THREE.InstancedMesh(wing, material, count);
    this.wingR = new THREE.InstancedMesh(wing, material, count);
    this.group = new THREE.Group();
    for (const m of [this.body, this.wingL, this.wingR]) {
      m.castShadow = true;
      m.frustumCulled = false;
      this.group.add(m);
    }
    this.perches = perches.map((p) => ({ ...p, taken: null }));
    this.bounds = bounds;
    this.list = [];
    let s = seed;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    this.rand = r;
    for (let i = 0; i < count; i++) {
      const g = { i, pos: new THREE.Vector3(), yaw: r() * 6.28, pitch: 0, flap: 0, fold: 1, state: 'perch', t: r() * 4, perch: null, hop: 0, peck: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), dur: 1, orbit: null, next: 2 + r() * 4, crumb: null };
      const p = this.freePerch(null);
      this.sit(g, p);
      this.list.push(g);
    }
    this.m4 = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.e = new THREE.Euler(0, 0, 0, 'YXZ');
    this.one = new THREE.Vector3(1, 1, 1);
    this.tmp = new THREE.Matrix4();
    this.tmp2 = new THREE.Matrix4();
    this.offL = new THREE.Matrix4().makeTranslation(0.11, 0.28, 0);
    this.offR = new THREE.Matrix4().makeTranslation(-0.11, 0.28, 0);
    this.feeding = null;
  }

  freePerch(avoid, far = 0) {
    const free = this.perches.filter((p) => !p.taken && (!avoid || Math.hypot(p.x - avoid.x, p.z - avoid.z) > far));
    const list = free.length ? free : this.perches.filter((p) => !p.taken);
    return list[Math.floor(this.rand() * list.length)] || this.perches[0];
  }

  sit(g, p) {
    if (g.perch) g.perch.taken = null;
    g.perch = p;
    p.taken = g;
    g.pos.set(p.x, p.y, p.z);
    g.yaw = p.yaw ?? this.rand() * 6.28;
    g.state = 'perch';
    g.fold = 1;
    g.next = 2 + this.rand() * 4;
  }

  takeOff(g) {
    if (g.state === 'fly' || g.state === 'takeoff') return;
    if (g.perch) g.perch.taken = null;
    g.perch = null;
    g.crumb = null;
    const b = this.bounds;
    const cx = (b.x0 + b.x1) / 2 + (this.rand() - 0.5) * (b.x1 - b.x0) * 0.4;
    const cz = (b.z0 + b.z1) / 2 + (this.rand() - 0.5) * (b.z1 - b.z0) * 0.4;
    g.orbit = { cx, cz, r: 4 + this.rand() * 4, y: 4.5 + this.rand() * 2.5, w: (this.rand() < 0.5 ? -1 : 1) * (0.55 + this.rand() * 0.3), a: Math.atan2(g.pos.z - cz, g.pos.x - cx) };
    g.from.copy(g.pos);
    g.state = 'takeoff';
    g.t = 0;
    g.dur = 1.1;
    g.flyTime = 5 + this.rand() * 6;
  }

  // Scare every gull within r of (x, z), even high ones.
  scatter(x, z, r = 9) {
    for (const g of this.list) if (Math.hypot(g.pos.x - x, g.pos.z - z) < r) this.takeOff(g);
  }

  // Bring the flock down to crumbs at the given deck spots for `time` seconds.
  feed(spots, deckY, time = 8) {
    this.feeding = { t: time };
    this.list.forEach((g, i) => {
      const c = spots[i % spots.length];
      if (g.perch) g.perch.taken = null;
      g.perch = null;
      g.crumb = c;
      g.from.copy(g.pos);
      g.to.set(c.x + (this.rand() - 0.5) * 0.5, deckY, c.z + (this.rand() - 0.5) * 0.5);
      g.state = 'land';
      g.t = -i * 0.35;
      g.dur = 1.8 + this.rand() * 0.6;
    });
  }

  orbitPos(g, out) {
    const o = g.orbit;
    return out.set(o.cx + Math.cos(o.a) * o.r, o.y + Math.sin(o.a * 2) * 0.4, o.cz + Math.sin(o.a) * o.r);
  }

  // people: local positions of the kids ({ x, z, y }).
  update(dt, t, people) {
    const tmpV = this.tmpV || (this.tmpV = new THREE.Vector3());
    if (this.feeding) {
      this.feeding.t -= dt;
      if (this.feeding.t <= 0) {
        this.feeding = null;
        for (const g of this.list) if (g.state === 'feed') g.scareIn = 1.5 + this.rand() * 2;
      }
    }
    for (const g of this.list) {
      g.t += dt;
      if (g.state === 'perch' || g.state === 'feed') {
        // Hop, peck and look around
        g.next -= dt;
        if (g.next <= 0) {
          const roll = this.rand();
          if (roll < 0.35) g.hop = 1;
          else if (roll < 0.7 || g.state === 'feed') g.peck = 1;
          else g.yaw += (this.rand() - 0.5) * 2.2;
          g.next = g.state === 'feed' ? 0.5 + this.rand() * 0.8 : 1.5 + this.rand() * 3.5;
        }
        g.hop = Math.max(0, g.hop - dt * 2.6);
        g.peck = Math.max(0, g.peck - dt * 3);
        g.fold = Math.min(1, g.fold + dt * 4);
        g.flap = g.hop > 0 ? Math.sin(g.hop * 18) * 0.5 : -0.05;
        const base = g.perch ? g.perch.y : g.to.y;
        g.pos.y = base + Math.sin(g.hop * Math.PI) * 0.18;
        g.pitch = Math.sin(g.peck * Math.PI) * 0.6;
        if (g.scareIn !== undefined) {
          g.scareIn -= dt;
          if (g.scareIn <= 0) {
            g.scareIn = undefined;
            this.takeOff(g);
          }
        }
        if (!this.feeding) {
          for (const p of people) {
            if (Math.hypot(p.x - g.pos.x, p.z - g.pos.z) < 2.3 && g.pos.y - p.y < 2.6) {
              this.takeOff(g);
              break;
            }
          }
        }
      } else if (g.state === 'takeoff' || g.state === 'land') {
        const k = Math.max(0, Math.min(1, g.t / g.dur));
        const target = g.state === 'takeoff' ? this.orbitPos(g, tmpV) : g.to;
        const prev = this.prevV || (this.prevV = new THREE.Vector3());
        prev.copy(g.pos);
        g.pos.lerpVectors(g.from, target, k * k * (3 - 2 * k));
        g.pos.y += Math.sin(k * Math.PI) * (g.state === 'land' ? 0.9 : 0.6);
        const dx = g.pos.x - prev.x;
        const dz = g.pos.z - prev.z;
        if (Math.abs(dx) + Math.abs(dz) > 1e-4) g.yaw = Math.atan2(dx, dz);
        g.fold = Math.max(0, g.fold - dt * 5);
        g.flap = Math.sin(t * 16 + g.i) * (g.state === 'land' && k > 0.8 ? 0.4 : 0.9);
        g.pitch = g.state === 'land' ? -0.2 : -0.35;
        if (k >= 1) {
          if (g.state === 'takeoff') {
            g.state = 'fly';
            g.t = 0;
          } else if (g.crumb) {
            g.state = 'feed';
            g.next = 0.3;
          } else if (g.perch) this.sit(g, g.perch);
          else g.state = 'feed';
        }
      } else if (g.state === 'fly') {
        g.orbit.a += g.orbit.w * dt * (6 / g.orbit.r);
        this.orbitPos(g, g.pos);
        g.yaw = Math.atan2(-Math.sin(g.orbit.a) * Math.sign(g.orbit.w), Math.cos(g.orbit.a) * Math.sign(g.orbit.w));
        g.fold = 0;
        const glide = Math.sin(t * 0.7 + g.i) > 0.2;
        g.flap = glide ? 0.12 + Math.sin(t * 3 + g.i) * 0.05 : Math.sin(t * 13 + g.i) * 0.8;
        g.pitch = -0.08;
        if (g.t > g.flyTime) {
          const p = this.freePerch(people[0], 4);
          p.taken = g;
          g.perch = p;
          g.from.copy(g.pos);
          g.to.set(p.x, p.y, p.z);
          g.state = 'land';
          g.t = 0;
          g.dur = 2.2;
        }
      }
      this.write(g);
    }
    for (const m of [this.body, this.wingL, this.wingR]) m.instanceMatrix.needsUpdate = true;
  }

  write(g) {
    const { m4, q, e, one, tmp, tmp2 } = this;
    e.set(g.pitch, g.yaw, 0, 'YXZ');
    q.setFromEuler(e);
    m4.compose(g.pos, q, one);
    this.body.setMatrixAt(g.i, m4);
    const fold = g.fold * 1.35;
    // Left wing along +X; the right one is the same wing turned round
    tmp.multiplyMatrices(m4, this.offL);
    tmp2.makeRotationY(fold);
    tmp.multiply(tmp2);
    tmp2.makeRotationZ(g.flap);
    tmp.multiply(tmp2);
    this.wingL.setMatrixAt(g.i, tmp);
    tmp.multiplyMatrices(m4, this.offR);
    tmp2.makeRotationY(Math.PI - fold);
    tmp.multiply(tmp2);
    tmp2.makeRotationZ(g.flap);
    tmp.multiply(tmp2);
    this.wingR.setMatrixAt(g.i, tmp);
  }
}
