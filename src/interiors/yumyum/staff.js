import * as K from './kit.js';
import { bakeZone } from './bake.js';

// The people of the big YumYum. Everyone is made with ctx.makeKid (so town life gives them chats), then made cheap:
//   still: merged into the room by the room's colour bake (guests at tables), nothing moves
//   arm:   one piece under its root, with the listed arms as their own parts (the host waves, the cook chops)
//   live:  legs and arms are their own parts and Kid.update runs every frame (the waiters walk)
// Hair, cheeks and eye shine get plain materials so the parts merge, and nobody casts a real shadow.

const { THREE, mat } = K;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Fewer segments again for people seen small: about a third of the triangles of a full kid.
function thinKid(kid) {
  const swap = new Map();
  kid.root.traverse((o) => {
    if (!o.isMesh || o === kid.blob) return;
    const geo = o.geometry;
    const p = geo.parameters;
    if (!p) return;
    let next = swap.get(geo);
    if (!next) {
      if (geo.type === 'SphereGeometry') {
        const w = Math.max(6, Math.ceil(p.widthSegments * 0.6));
        const h = Math.max(4, Math.ceil(p.heightSegments * 0.6));
        if (w < p.widthSegments || h < p.heightSegments) next = new THREE.SphereGeometry(p.radius, w, h, p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
      } else if (geo.type === 'TorusGeometry' && p.tubularSegments > 8) next = new THREE.TorusGeometry(p.radius, p.tube, Math.min(p.radialSegments, 4), Math.max(6, Math.ceil(p.tubularSegments * 0.6)), p.arc);
      else if (geo.type === 'CylinderGeometry' && p.radialSegments > 8) next = new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, Math.max(8, Math.ceil(p.radialSegments * 0.6)), 1, p.openEnded, p.thetaStart, p.thetaLength);
      else if (geo.type === 'LatheGeometry' && p.segments > 8) next = new THREE.LatheGeometry(p.points, Math.max(8, Math.ceil(p.segments * 0.6)), p.phiStart, p.phiLength);
      if (!next) return;
      swap.set(geo, next);
    }
    o.geometry = next;
  });
}

export function makePerson(ctx, look, { x, z, y = 0, yaw = 0, pose = 'stand', hands = null, mode = 'still', dress, arms = [1], scale = 1, lowPoly = 8 } = {}) {
  const k = ctx.makeKid(look);
  K.lowPolyKid(k, { sphereMin: lowPoly });
  if (mode !== 'live') thinKid(k);
  dress?.(k);
  k.pose = pose;
  k.hands = hands;
  k.blinkTimer = 1e9;
  for (let i = 0; i < 40; i++) k.update(1 / 30, 0, 0, 0, 0);
  const hair = mat(look.hair || '#2a1a13', { rough: 0.45 });
  const cheek = mat('#' + new THREE.Color(look.skin).lerp(new THREE.Color('#ff8fa0'), look.gender === 'girl' ? 0.5 : 0.32).getHexString(), { rough: 0.6 });
  const shine = mat('#ffffff', { rough: 0.2 });
  k.root.traverse((o) => {
    if (!o.isMesh || o === k.blob) return;
    const m = o.material;
    if (m.map) o.material = hair;
    else if (m.transparent) o.material = cheek;
    else if (m.emissive && m.emissiveIntensity > 0 && m.emissive.r + m.emissive.g + m.emissive.b > 0) o.material = shine;
    if (o.material.side !== THREE.FrontSide) o.material = mat('#' + o.material.color.getHexString(), { rough: 0.7 });
    o.castShadow = false;
  });
  k.blob.visible = pose === 'stand';
  k.root.scale.setScalar(scale);
  k.root.position.set(x, y, z);
  k.root.rotation.y = yaw;
  if (mode === 'arm') {
    const kept = arms.map((i) => k.arms[i]);
    bakeZone(k.root, [k.blob, ...kept, k.carryAnchor]);
    for (const a of kept) bakeZone(a);
  } else if (mode === 'live') {
    bakeZone(k.body, [...k.legs, ...k.arms, k.carryAnchor]);
    for (const p of [...k.legs, ...k.arms]) bakeZone(p);
  }
  k.userData = { mode };
  return k;
}

// A waiter who walks a loop of stops ({ x, z, wait, face }) and can be sent on errands. The loop's legs and the
// errand paths are laid out along clear aisles, so following them never walks through furniture.
export class Walker {
  constructor(kid, route, { hub = 0, speed = 1.25 } = {}) {
    this.kid = kid;
    this.route = route;
    this.hub = hub;
    this.speed = speed;
    this.pos = kid.root.position.clone();
    this.yaw = kid.root.rotation.y;
    this.ri = 0;
    this.path = [{ ...route[0] }];
    this.wait = 0;
    this.face = null;
    this.cur = 0;
    this.mode = 'patrol';
    this.visited = [];
    this.onArrive = null;
    this.collider = null;
    this.hold = 0; // seconds to stand still (someone is in the way)
  }

  get busy() {
    return this.mode !== 'patrol';
  }

  // The shortest way back along the loop to the hub stop, from the leg it is walking now.
  toHub() {
    const n = this.route.length;
    const fwd = [];
    for (let i = this.ri; ; i = (i + 1) % n) {
      fwd.push(this.route[i]);
      if (i === this.hub || fwd.length > n) break;
    }
    const back = [];
    for (let i = (this.ri - 1 + n) % n; ; i = (i - 1 + n) % n) {
      back.push(this.route[i]);
      if (i === this.hub || back.length > n) break;
    }
    const len = (list) => {
      let d = 0;
      let p = this.pos;
      for (const q of list) {
        d += Math.hypot(q.x - p.x, q.z - p.z);
        p = q;
      }
      return d;
    };
    return (len(fwd) <= len(back) ? fwd : back).map((q) => ({ x: q.x, z: q.z }));
  }

  // Walk to the hub, then along `points`; onArrive runs at the last point.
  errand(points, onArrive) {
    const hub = this.route[this.hub];
    let lead;
    if (this.mode === 'patrol') lead = this.toHub();
    else if (this.mode === 'return') lead = this.path.map((p) => ({ x: p.x, z: p.z }));
    else lead = [...[...this.visited].reverse(), hub].map((p) => ({ x: p.x, z: p.z }));
    this.mode = 'errand';
    this.path = [...lead, ...points.map((p) => ({ ...p }))];
    this.leadLeft = lead.length;
    this.visited = [];
    this.wait = 0;
    this.onArrive = onArrive;
  }

  // Start an errand at points[start] straight away (out of sight of the camera), then walk the rest. The points
  // before it still count as the way home.
  jump(points, onArrive, start = 0) {
    this.mode = 'errand';
    this.pos.set(points[start].x, 0, points[start].z);
    this.path = points.slice(start + 1).map((p) => ({ ...p }));
    this.leadLeft = 0;
    this.visited = points.slice(0, start + 1).map((p) => ({ x: p.x, z: p.z }));
    this.wait = 0;
    this.hold = 0;
    this.onArrive = onArrive;
  }

  // Back along the errand's own way to the hub, then on with the loop.
  goHome() {
    if (this.mode === 'patrol') return;
    this.onArrive = null;
    const hub = this.route[this.hub];
    if (this.mode === 'errand' && this.leadLeft > 0) this.path = this.path.slice(0, this.leadLeft);
    else this.path = [...[...this.visited].reverse(), hub].map((p) => ({ x: p.x, z: p.z }));
    this.mode = 'return';
    this.wait = 0;
  }

  update(dt, t, blocked) {
    let sp = 0;
    if (this.hold > 0) this.hold -= dt;
    else if (this.wait > 0) this.wait -= dt;
    else if (this.path.length) {
      const p = this.path[0];
      const dx = p.x - this.pos.x;
      const dz = p.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.04) {
        this.path.shift();
        if (this.mode === 'errand') {
          if (this.leadLeft > 0) this.leadLeft--;
          else this.visited.push(p);
        }
        if (p.wait) this.wait = p.wait;
        this.face = p.face ?? null;
        p.do?.(this);
        if (!this.path.length) this.arrived();
      } else if (blocked?.(this.pos, dx / d, dz / d)) {
        this.hold = 0.4;
      } else {
        const step = Math.min(d, this.speed * dt);
        this.pos.x += (dx / d) * step;
        this.pos.z += (dz / d) * step;
        sp = this.speed;
        this.yaw += wrap(Math.atan2(dx, dz) - this.yaw) * (1 - Math.exp(-10 * dt));
      }
    }
    if (sp === 0 && this.face !== null) this.yaw += wrap(this.face - this.yaw) * (1 - Math.exp(-6 * dt));
    this.cur += (sp - this.cur) * (1 - Math.exp(-8 * dt));
    const r = this.kid.root;
    r.position.set(this.pos.x, 0, this.pos.z);
    r.rotation.y = this.yaw;
    this.kid.update(dt, t, this.cur < 0.05 ? 0 : this.cur, 0, 0);
    if (this.collider) {
      this.collider.x = this.collider.ox + this.pos.x;
      this.collider.z = this.collider.oz + this.pos.z;
    }
  }

  arrived() {
    if (this.mode === 'errand') {
      const f = this.onArrive;
      this.onArrive = null;
      f?.(this);
      return;
    }
    if (this.mode === 'return') {
      this.mode = 'patrol';
      this.ri = this.hub;
    }
    this.ri = (this.ri + 1) % this.route.length;
    this.path = [{ ...this.route[this.ri] }];
  }
}
