// Roji's family: Odeh (her father), Hanan (her mother), Basem (her brother) and little Sultan.
// makePerson builds one of them (with a vest, a headscarf, a watch...), drawn as one skinned mesh.
// Walker moves a person around on their own, with the town physics: they walk the hill's steps,
// go round furniture and never walk through Roji or Homama.
import { THREE, mat, mesh, box, sph, cyl, tor, at, skinKid, P, C, damp, dampAngle, clamp } from './kit.js';

export const LOOKS = {
  odeh: { id: 'odeh', name: 'Odeh', gender: 'boy', hairstyle: 'bald', mustache: true, skin: '#c98f68', hair: '#2a1a13', outfit: 'tee-pants', top: '#f3e9d6', bottom: '#6b4f3a', shoes: '#5a3b2a', accent: '#c8875a' },
  hanan: { id: 'hanan', name: 'Hanan', gender: 'girl', hairstyle: 'bob', skin: '#ecc3a0', hair: '#3a2316', outfit: 'dress', top: '#b9668e', bottom: '#b9668e', shoes: '#7a2e3a', accent: '#f6d2e0' },
  basem: { id: 'basem', name: 'Basem', gender: 'boy', hairstyle: 'short', beard: true, skin: '#dca67e', hair: '#1f140e', outfit: 'tee-pants', top: '#2f8f6b', bottom: '#2c3e66', shoes: '#ffffff', accent: '#ffd166' },
  sultan: { id: 'sultan', name: 'Sultan', gender: 'boy', hairstyle: 'curly', skin: '#f3cfae', hair: '#2a1a13', outfit: 'tee-shorts', top: '#ffd166', bottom: '#3f7bf0', shoes: '#ef5b6f', accent: '#7fd3ff' },
};
export const SCALE = { odeh: 1.2, hanan: 1.15, basem: 1.18, sultan: 0.66 };
export const ACCENT = { odeh: '#c8875a', hanan: '#ff8fb1', basem: '#3f7bf0', sultan: '#ffd166', roji: '#ef5b6f', homama: '#3f7bf0' };

const HC = new THREE.Vector3(0, 0.29, 0); // head centre inside kid.head

export function makePerson(makeKid, id) {
  const kid = makeKid({ ...LOOKS[id] });
  const B = kid.body;
  const H = kid.head;
  if (id === 'odeh') {
    // A warm brown vest over his shirt, and prayer beads in his hand
    const vest = mesh(new THREE.LatheGeometry([[0.212, 0.34], [0.222, 0.44], [0.212, 0.6], [0.186, 0.7]].map(([x, y]) => new THREE.Vector2(x, y)), 20, 0.34, P * 2 - 0.68), mat('#8a5a3a', { rough: 0.8 }));
    B.add(vest);
    for (const s of [1, -1]) B.add(at(sph(0.014, '#e7b54a', 6, 4), 0.07 * s, 0.56, 0.2));
    const beads = tor(0.06, 0.012, '#7a2e3a', 4, 14);
    beads.scale.set(1, 1.5, 1);
    kid.arms[1].add(at(beads, 0, -0.36, 0.02, 0, P / 2, 0));
    kid.arms[1].add(at(sph(0.02, '#e7b54a', 6, 4), 0, -0.46, 0.02));
  } else if (id === 'hanan') {
    // A long dress down to the ankles and a soft headscarf framing her face
    const hair = [];
    H.traverse((o) => o.isMesh && o.material.emissiveMap && hair.push(o));
    for (const o of hair) o.removeFromParent();
    const dress = mat(LOOKS.hanan.top, { rough: 0.7 });
    B.add(mesh(new THREE.LatheGeometry([[0, 0.06], [0.24, 0.06], [0.27, 0.1], [0.31, 0.3], [0.2, 0.3]].map(([x, y]) => new THREE.Vector2(x, y)), 22), dress));
    B.add(at(tor(0.24, 0.018, '#f6d2e0', 6, 22), 0, 0.075, 0, P / 2, 0, 0));
    const scarf = mat('#e7a1bd', { rough: 0.8 });
    const R = 0.338;
    const cap = mesh(new THREE.SphereGeometry(R, 24, 10, 0, P * 2, 0, P * 0.4), scarf);
    cap.position.copy(HC);
    H.add(cap);
    const sideG = new THREE.SphereGeometry(R, 24, 12, P / 2 + 0.78, P * 2 - 1.56, P * 0.36, P * 0.5);
    const side = mesh(sideG, scarf);
    side.position.copy(HC);
    H.add(side);
    // The drape round the neck and onto the shoulders
    const drape = mesh(new THREE.LatheGeometry([[0.1, 1.02], [0.2, 0.9], [0.26, 0.78], [0.25, 0.7], [0.12, 0.68]].map(([x, y]) => new THREE.Vector2(x, y)), 20, 0.5, P * 2 - 1.0), scarf);
    B.add(drape);
    // A little gold pin
    H.add(at(sph(0.022, '#e7b54a', 8, 6), -0.2, HC.y - 0.16, 0.22));
  } else if (id === 'basem') {
    kid.arms[0].add(at(cyl(0.056, 0.056, 0.04, '#3b2b3f', 12), 0, -0.24, 0));
    kid.arms[0].add(at(box(0.04, 0.012, 0.04, '#ffd166'), 0, -0.24, 0.05));
  } else if (id === 'sultan') {
    // A bib with a star, he is still that little
    B.add(at(mesh(new THREE.CircleGeometry(0.09, 14), mat('#ffffff')), 0, 0.6, 0.205, -0.1, 0, 0));
    B.add(at(sph(0.025, '#ef5b6f', 8, 6), 0, 0.6, 0.212));
  }
  kid.root.scale.setScalar(SCALE[id]);
  skinKid(kid);
  kid.root.userData.person = id;
  return kid;
}

// ---------------------------------------------------------------- Walker
// pos: local (x, z) in the space; y: absolute feet height; the physics works in world coordinates.
const tmpW = new THREE.Vector3();
const tmpV = new THREE.Vector3();

export class Walker {
  constructor(api, kid, id, { r = 0.3, speed = 1.8 } = {}) {
    this.api = api;
    this.kid = kid;
    this.id = id;
    this.r = r;
    this.speed = speed;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.y = 0;
    this.vy = 0;
    this.yaw = 0;
    this.turn = 0;
    this.path = [];
    this.res = null;
    this.seat = null;
    this.hidden = false;
    this.faceYaw = null;
    this.faceAt = null;
    this.stuck = 0;
    this.collider = null;
    this.script = null; // (dt, t, w) => true while it moves the kid itself
    this.busy = null;
    this.accent = ACCENT[id] || '#ef5b6f';
    this.scale = SCALE[id] || 1;
    this.levelAt = null; // optional (x, z) -> floor height, used before the physics knows the space
  }

  get O() {
    return this.api.space.origin;
  }
  get physics() {
    return this.api.game?.physics;
  }

  // Where its speech bubble sits (local to the group)
  bubbleAt(out) {
    if (this.hidden || !this.kid.root.visible) return null;
    const p = this.kid.root.position;
    const sit = this.seat && this.seat.pose === 'sit' ? 0.72 : 1;
    return out.set(p.x, p.y + 1.62 * this.scale * sit + 0.12, p.z);
  }

  place(x, z, yaw = this.yaw, y = null) {
    this.pos.set(x, 0, z);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.vy = 0;
    this.seat = null;
    this.path = [];
    this.kid.pose = 'stand';
    this.kid.hands = null;
    const O = this.O;
    this.y = y ?? (this.levelAt ? this.levelAt(x, z) : this.physics ? this.physics.support(O.x + x, O.z + z, this.r, 9, 0) : 0);
    this.ground = this.y;
    this.sync();
  }

  setHidden(h) {
    this.hidden = h;
    this.kid.root.visible = !h;
    if (h) this.cancel();
    if (h && this.collider) {
      this.physics?.remove(this.collider);
      this.collider = null;
    }
  }

  // Walk through the points (local { x, z }); resolves true on arrival, false if cancelled
  go(points, { speed = this.speed, run = false } = {}) {
    this.cancel();
    if (this.seat) this.stand();
    this.path = points.map((p) => ({ x: p.x, z: p.z }));
    this.runSpeed = run ? speed * 1.6 : speed;
    this.stuck = 0;
    return new Promise((res) => (this.res = res));
  }

  cancel() {
    const r = this.res;
    this.res = null;
    this.path = [];
    r?.(false);
  }

  get moving() {
    return this.path.length > 0;
  }

  // Sit, lie or stand in place (local { x, z, y, yaw, pose, hands })
  sit(s) {
    this.cancel();
    this.seat = { pose: 'sit', ...s };
    this.pos.set(s.x, 0, s.z);
    this.y = s.y ?? 0;
    this.yaw = s.yaw ?? this.yaw;
    this.vel.set(0, 0, 0);
    this.kid.pose = this.seat.pose;
    this.kid.hands = s.hands ?? null;
    this.kid.cancelEmote();
    this.sync();
  }

  stand(at_ = null) {
    if (!this.seat) return;
    const s = this.seat;
    this.seat = null;
    this.kid.pose = 'stand';
    this.kid.hands = null;
    const p = at_ || s.exit || { x: s.x + Math.sin(s.yaw ?? 0) * 0.55, z: s.z + Math.cos(s.yaw ?? 0) * 0.55 };
    this.pos.set(p.x, 0, p.z);
    this.vy = 0;
    const O = this.O;
    if (this.physics) this.y = Math.max(this.physics.support(O.x + p.x, O.z + p.z, this.r, this.y + 0.3, 0), 0);
  }

  face(target) {
    if (typeof target === 'number') {
      this.faceYaw = target;
      this.faceAt = null;
    } else {
      this.faceAt = target;
      this.faceYaw = null;
    }
  }

  emote(type) {
    if (this.kid.pose === 'stand') this.kid.emote(type);
  }

  hop(power = 4) {
    if (this.seat) return;
    if (this.y <= this.ground + 0.01) {
      this.vy = power;
      this.kid.squash = 1.2;
    }
  }

  sync() {
    const k = this.kid;
    k.root.position.set(this.pos.x, this.y, this.pos.z);
    if (!this.seat?.rot) k.root.rotation.set(0, this.yaw, 0);
    else k.root.rotation.set(this.seat.rot[0], this.seat.rot[1], this.seat.rot[2]);
  }

  // Collider that keeps Roji and Homama from walking through this person
  updateCollider() {
    const ph = this.physics;
    if (!ph || this.hidden) return;
    if (!this.collider) this.collider = ph.add({ type: 'circle', x: 0, z: 0, r: this.r * 0.85, tag: `odeh-person-${this.id}` });
    const c = this.collider;
    c.x = this.O.x + this.pos.x;
    c.z = this.O.z + this.pos.z;
    // Seated people sit low: a kid can still walk round them, nobody stands on them
    c.r = this.seat ? this.r * 0.75 : this.r * 0.85;
  }

  update(dt, t) {
    if (this.hidden) return;
    const k = this.kid;
    if (this.script && this.script(dt, t, this)) {
      this.updateCollider();
      k.update(dt, t, this.scriptSpeed || 0, Math.max(0, this.y - (this.ground ?? 0)), 0);
      return;
    }
    if (this.seat) {
      this.sync();
      this.face_(dt);
      this.updateCollider();
      k.update(dt, t, 0, 0, 0);
      return;
    }
    const ph = this.physics;
    const O = this.O;
    let ix = 0;
    let iz = 0;
    let intent = 0;
    const wp = this.path[0];
    if (wp) {
      const dx = wp.x - this.pos.x;
      const dz = wp.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      const last = this.path.length === 1;
      if (d < (last ? 0.12 : 0.35)) {
        this.path.shift();
        if (!this.path.length) {
          this.vel.multiplyScalar(0.2);
          const r = this.res;
          this.res = null;
          r?.(true);
        }
      } else {
        ix = dx / d;
        iz = dz / d;
        intent = last ? clamp(d * 1.6, 0.25, 1) : 1;
      }
    }
    const top = this.runSpeed || this.speed;
    this.vel.x = damp(this.vel.x, ix * top * intent, intent > 0 ? 8 : 10, dt);
    this.vel.z = damp(this.vel.z, iz * top * intent, intent > 0 ? 8 : 10, dt);
    const before = tmpV.copy(this.pos);
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    if (ph) {
      const w = tmpW.set(O.x + this.pos.x, 0, O.z + this.pos.z);
      const own = this.collider;
      ph.resolve(w, this.r, this.vel, { feet: this.y, skip: (c) => c === own, bounds: false });
      // Never through Roji or Homama: step round them
      for (const a of [this.api.roji, this.api.homama]) {
        if (!a) continue;
        if (Math.abs(a.y - this.y) > 0.9) continue;
        const dx = w.x - a.pos.x;
        const dz = w.z - a.pos.z;
        const d = Math.hypot(dx, dz);
        const min = this.r + 0.32;
        if (d < min && d > 1e-4) {
          w.x += (dx / d) * (min - d);
          w.z += (dz / d) * (min - d);
        }
      }
      this.pos.set(w.x - O.x, 0, w.z - O.z);
      // Vertical: steps, ledges and gravity
      const ground = ph.support(w.x, w.z, this.r, this.y, 0);
      this.ground = ground;
      if (this.y > ground + 1e-3 || this.vy > 0) {
        this.vy -= 22 * dt;
        this.y += this.vy * dt;
        if (this.y <= ground) {
          if (this.vy < -3) k.squash = 0.82;
          this.y = ground;
          this.vy = 0;
        }
      } else {
        this.y = ground;
        this.vy = 0;
      }
    }
    // Stuck behind something: after a while, skip to the next point
    const moved = before.distanceTo(this.pos);
    if (intent > 0 && moved < 0.25 * top * dt) {
      this.stuck += dt;
      if (this.stuck > 2.2 && this.path.length) {
        const p = this.path[0];
        this.api.fx?.puff?.(this.api.world(this.pos.x, this.pos.z));
        this.pos.set(p.x, 0, p.z);
        if (ph) this.y = ph.support(O.x + p.x, O.z + p.z, this.r, this.y + 2, 0);
        this.stuck = 0;
      }
    } else this.stuck = 0;
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (sp > 0.25) {
      const prev = this.yaw;
      this.yaw = dampAngle(this.yaw, Math.atan2(this.vel.x, this.vel.z), 10, dt);
      this.turn = (this.yaw - prev) / Math.max(dt, 1e-3);
    } else this.face_(dt);
    this.sync();
    this.updateCollider();
    k.update(dt, t, sp, Math.max(0, this.y - (this.ground ?? 0)), this.turn || 0);
  }

  face_(dt) {
    let want = this.faceYaw;
    if (this.faceAt) {
      const f = this.faceAt;
      const fx = f.pos ? f.pos.x - this.O.x : f.x;
      const fz = f.pos ? f.pos.z - this.O.z : f.z;
      want = Math.atan2(fx - this.pos.x, fz - this.pos.z);
    }
    if (want === null || want === undefined) {
      this.turn = 0;
      return;
    }
    if (this.seat && !this.seat.turn) return;
    this.yaw = dampAngle(this.yaw, want, 6, dt);
  }
}

// Roji or Homama as a bubble speaker (actors live in world coordinates)
export function actorSpeaker(api, who) {
  return {
    who,
    bubbleAt(out) {
      const a = typeof who === 'string' ? api[who] || api.actor(who) : who;
      if (!a) return null;
      const O = api.space.origin;
      const sit = a.kid.pose === 'sit' ? 0.74 : 1;
      return out.set(a.pos.x - O.x, a.y + 1.62 * sit + 0.12, a.pos.z - O.z);
    },
  };
}
