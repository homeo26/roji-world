// Everyone and everything that moves on Abu Sanad's course besides the learner car:
// little cars on the roundabout, the crossing guard and the school children, the ball, the fox and the tractor.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, umat, mesh, damp, dampAngle, clamp, bakeStatic, canvasTexture, FONT } from '../../util.js';
import { C, colorBake } from '../../places/driving/kit.js';
import { RC, R_OUT, R_IN, SCHOOL, TRACTOR_PATH, heightAt } from './world.js';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const TAU = Math.PI * 2;

// Merge a whole Car (src/car.js) into a few meshes. Its lights keep their own materials so they can glow.
export function bakeCar(car) {
  colorBake(car.root);
  bakeStatic(car.root, [], mergeGeometries);
  return car;
}

// Background people (children, the crossing guard): merge every part that does not swing,
// eyes and torso included, so each one is a handful of draw calls. keep: extra objects to leave alone.
export function bakeNpc(kid, keep = []) {
  const o = { coarse: true };
  const tails = (kid.tails || []).map((t) => t.pivot);
  const parts = [...kid.legs, ...kid.arms, ...tails];
  colorBake(kid.head, tails, o);
  bakeStatic(kid.head, tails, mergeGeometries);
  colorBake(kid.body, [kid.head, kid.carryAnchor, ...parts, ...keep], o);
  bakeStatic(kid.body, [kid.head, kid.carryAnchor, ...parts, ...keep], mergeGeometries);
  for (const p of parts) colorBake(p, [], o);
  for (const t of tails) bakeStatic(t, [], mergeGeometries);
  return kid;
}

// A tiny driver for the little cars: a head with hair and shoulders, merged into one mesh.
function driverDoll(k, { skin, hair, top }) {
  const g = new THREE.Group();
  g.add(k.at(k.sph(0.2, skin, { rough: 0.6 }, 12), 0, 0.36, 0));
  const cap = k.sph(0.215, hair, { rough: 0.7 }, 12);
  cap.scale.set(1, 0.7, 1);
  g.add(k.at(cap, 0, 0.44, -0.03));
  g.add(k.at(k.rbox(0.36, 0.26, 0.24, top, 0.08), 0, 0.1, 0));
  for (const s of [-1, 1]) g.add(k.at(k.sph(0.025, '#3b2b3f', undefined, 6), s * 0.07, 0.37, 0.18));
  colorBake(g);
  return g;
}

// ------------------------------------------------------------------ roundabout traffic
export class RingTraffic {
  constructor(ctx, k, physics) {
    this.cars = [];
    this.r = 6.9;
    const looks = [
      { color: C.lilac, skin: '#c98f68', hair: '#141010', top: '#ffd166' },
      { color: C.mint, skin: '#fbe6d8', hair: '#b5773d', top: '#ef5b6f' },
      { color: C.sky, skin: '#9c6a4a', hair: '#141010', top: '#7fd3a7' },
    ];
    for (const L of looks) {
      const car = ctx.models.car(L.color);
      const doll = driverDoll(k, L);
      doll.position.set(0.33, 0.62, -0.25);
      car.body.add(doll);
      bakeCar(car);
      car.root.visible = false;
      ctx.scene.add(car.root);
      const cols = [physics.add({ type: 'circle', x: 999, z: 999, r: 0.86 }), physics.add({ type: 'circle', x: 999, z: 999, r: 0.86 })];
      this.cars.push({ car, th: 0, v: 0, want: 3.6, cols, active: false, honkCd: 0 });
    }
    this.n = 0;
  }
  setup(n, { night = false } = {}) {
    this.n = n;
    this.cars.forEach((c, i) => {
      c.active = i < n;
      c.car.root.visible = c.active;
      c.th = Math.PI * 0.35 + (i * TAU) / Math.max(1, n) + i * 0.6;
      c.v = c.want;
      for (const cc of c.cols) cc.x = cc.z = 999;
      c.car.headMat.emissiveIntensity = night ? 2.6 : 0.6;
      if (c.active) this.place(c);
    });
  }
  place(c) {
    const x = RC.x + Math.cos(c.th) * this.r;
    const z = RC.z + Math.sin(c.th) * this.r;
    c.car.root.position.set(x, 0, z);
    const yaw = Math.atan2(Math.sin(c.th), -Math.cos(c.th));
    c.car.yaw = yaw;
    c.cols.forEach((cc, i) => {
      const off = i ? -0.65 : 0.65;
      cc.x = x + Math.sin(yaw) * off;
      cc.z = z + Math.cos(yaw) * off;
    });
  }
  // Is one of the little cars just ahead of (x, z) heading yaw? (for the autopilot)
  blocking(x, z, yaw, dist = 5.2) {
    return this.cars.some((c) => {
      if (!c.active) return false;
      const dx = c.car.root.position.x - x;
      const dz = c.car.root.position.z - z;
      const lz = dx * Math.sin(yaw) + dz * Math.cos(yaw);
      const lx = dx * Math.cos(yaw) - dz * Math.sin(yaw);
      return lz > 0 && lz < dist && Math.abs(lx) < 2.0;
    });
  }
  // Is a car coming round toward the west entry (angle PI) within `ahead` radians?
  danger(ahead = 1.35) {
    return this.cars.some((c) => c.active && (() => {
      const d = wrap(c.th - Math.PI);
      return d > -0.25 && d < ahead;
    })());
  }
  nearest(px, pz) {
    let best = null;
    let bd = Infinity;
    for (const c of this.cars) {
      if (!c.active) continue;
      const d = Math.hypot(c.car.root.position.x - px, c.car.root.position.z - pz);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return { car: best, d: bd };
  }
  // player: { x, z } of the learner car. sound: for honks.
  update(dt, t, player, sound) {
    if (!this.n) return;
    const dx = player.x - RC.x;
    const dz = player.z - RC.z;
    const pr = Math.hypot(dx, dz);
    // Only a car that is really on the ring counts (one waiting at the give way line does not)
    const inRing = pr > R_IN - 0.6 && pr < R_OUT - 0.2;
    const thP = Math.atan2(dz, dx);
    for (const c of this.cars) {
      if (!c.active) continue;
      let target = c.want;
      // Keep a gap to the little car in front
      for (const o of this.cars) {
        if (o === c || !o.active) continue;
        const gap = (((c.th - o.th) % TAU) + TAU) % TAU;
        if (gap < 0.9) target = Math.min(target, gap < 0.55 ? 0 : c.want * (gap - 0.55) / 0.35);
      }
      if (inRing) {
        let ahead = c.th - thP;
        ahead = ((ahead % TAU) + TAU) % TAU;
        if (ahead > TAU - 0.3) ahead -= TAU; // side by side
        if (ahead < 0.95) {
          target = ahead < 0.55 ? 0 : Math.min(target, c.want * (ahead - 0.55) / 0.4);
          if (ahead < 0.62 && c.v > 1.6 && c.honkCd <= 0) {
            c.honkCd = 3;
            c.car.honk();
            sound?.honk?.();
            this.onHonk?.(c);
          }
        }
      }
      c.honkCd -= dt;
      c.v = damp(c.v, target, target < c.v ? 6 : 1.6, dt);
      c.th -= (c.v / this.r) * dt;
      if (c.th < -Math.PI) c.th += TAU;
      c.car.speed = c.v;
      this.place(c);
      c.car.steer = 0.16;
      c.car.turnRate = c.v / this.r;
      c.car.update(dt, t);
    }
  }
  hide() {
    this.setup(0);
  }
}

// ------------------------------------------------------------------ lollipop sign, umbrella, ball, fox, tractor
function lollipop(k) {
  const g = new THREE.Group();
  g.add(k.at(k.cyl(0.025, 0.025, 1.3, C.white, 8), 0, 0.65, 0));
  const face = canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(w / 2, h / 2, w / 2, 0, TAU);
    c.fill();
    c.fillStyle = '#e5484d';
    c.beginPath();
    c.arc(w / 2, h / 2, w * 0.42, 0, TAU);
    c.fill();
    c.fillStyle = '#ffffff';
    c.font = `700 ${h * 0.26}px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('STOP', w / 2, h / 2 + 3);
  });
  const disc = mesh(new THREE.CircleGeometry(0.27, 24), new THREE.MeshStandardMaterial({ map: face, roughness: 0.6, side: THREE.DoubleSide }));
  g.add(k.at(disc, 0, 1.52, 0.03));
  g.add(k.at(k.cyl(0.29, 0.29, 0.03, C.white, 24), 0, 1.52, 0)).rotation.x = Math.PI / 2;
  return g;
}
export function makeUmbrella(k, color = C.rose) {
  const g = new THREE.Group();
  g.add(k.at(k.cyl(0.015, 0.015, 1.25, C.ink, 6), 0, 0.55, 0));
  const canopy = mesh(new THREE.SphereGeometry(0.62, 16, 6, 0, TAU, 0, Math.PI * 0.42), umat(color, { rough: 0.5, side: THREE.DoubleSide }));
  canopy.scale.y = 0.62;
  g.add(k.at(canopy, 0, 1.08, 0));
  for (let i = 0; i < 8; i += 2) {
    const a = (i / 8) * TAU;
    g.add(k.at(k.sph(0.045, C.white, undefined, 6), Math.cos(a) * 0.53, 1.18, Math.sin(a) * 0.53));
  }
  g.add(k.at(k.sph(0.04, C.sun, undefined, 6), 0, 1.5, 0));
  // Held a little behind the head and tipped back, so the face stays in view
  g.position.set(0.08, 0.1, -0.3);
  g.rotation.x = -0.42;
  return g;
}
function makeBall(k) {
  const g = new THREE.Group();
  const tex = canvasTexture(128, 64, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    ['#ef5b6f', '#ffd166', '#3f7bf0', '#7fd8bf'].forEach((col, i) => {
      c.fillStyle = col;
      c.fillRect((i * w) / 4, 0, w / 8, h);
    });
  });
  g.add(mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 })));
  return g;
}
export function makeFox(k) {
  const g = new THREE.Group();
  const orange = '#f08a5d';
  const body = k.sph(0.24, orange, { rough: 0.8 }, 14);
  body.scale.set(0.8, 0.75, 1.35);
  g.add(k.at(body, 0, 0.36, 0));
  const chest = k.sph(0.13, C.white, { rough: 0.8 }, 10);
  chest.scale.set(1, 1.1, 0.7);
  g.add(k.at(chest, 0, 0.36, 0.25));
  const head = new THREE.Group();
  head.add(k.at(k.sph(0.17, orange, { rough: 0.8 }, 14), 0, 0, 0));
  const snout = k.cone(0.09, 0.2, C.white, 10);
  snout.rotation.x = Math.PI / 2;
  head.add(k.at(snout, 0, -0.04, 0.2));
  head.add(k.at(k.sph(0.03, C.ink, undefined, 6), 0, -0.04, 0.3));
  for (const s of [-1, 1]) {
    const ear = k.cone(0.07, 0.16, orange, 6);
    head.add(k.at(ear, s * 0.09, 0.17, -0.02));
    const tip = k.cone(0.03, 0.06, C.ink, 6);
    head.add(k.at(tip, s * 0.09, 0.24, -0.02));
  }
  const eyeMat = umat('#3b2b3f', { emissive: '#ffe38a', ei: 0, rough: 0.3 });
  for (const s of [-1, 1]) head.add(k.at(mesh(new THREE.SphereGeometry(0.03, 8, 6), eyeMat, { cast: false }), s * 0.07, 0.03, 0.14));
  head.position.set(0, 0.56, 0.34);
  colorBake(head, head.children.filter((o) => o.material === eyeMat));
  g.add(head);
  const tail = new THREE.Group();
  const tl = k.sph(0.12, orange, { rough: 0.8 }, 10);
  tl.scale.set(0.9, 0.9, 2.2);
  tail.add(k.at(tl, 0, 0, -0.22));
  tail.add(k.at(k.sph(0.08, C.white, { rough: 0.8 }, 8), 0, 0, -0.47));
  tail.position.set(0, 0.42, -0.3);
  tail.rotation.x = -0.4;
  colorBake(tail);
  g.add(tail);
  const legs = [];
  for (const [x, z] of [[0.1, 0.18], [-0.1, 0.18], [0.1, -0.18], [-0.1, -0.18]]) {
    const leg = new THREE.Group();
    leg.add(k.at(k.cyl(0.035, 0.03, 0.26, '#3b2b3f', 6), 0, -0.13, 0));
    leg.position.set(x, 0.28, z);
    colorBake(leg);
    g.add(leg);
    legs.push(leg);
  }
  colorBake(g, [head, tail, ...legs]);
  g.userData = { head, tail, legs, eyeMat };
  return g;
}
function makeTractor(k) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  body.add(k.at(k.rbox(1.0, 0.6, 1.7, C.mint, 0.12), 0, 0.75, 0.25));
  body.add(k.at(k.rbox(1.1, 0.9, 0.9, C.mint, 0.1), 0, 1.15, -0.4));
  body.add(k.at(k.rbox(1.24, 0.08, 1.1, C.white, 0.04), 0, 2.0, -0.4));
  for (const s of [-1, 1]) body.add(k.at(k.box(0.06, 0.4, 0.06, C.white), s * 0.55, 1.78, -0.4 + 0.45));
  body.add(k.at(k.cyl(0.05, 0.05, 0.5, C.ink, 8), 0.3, 1.25, 0.75));
  body.add(k.at(k.rbox(0.8, 0.12, 0.1, C.white, 0.03), 0, 0.68, 1.12));
  for (const s of [-1, 1]) body.add(k.at(k.sph(0.08, '#fff6d8', { emissive: '#ffe9a8', ei: 0.5 }, 8), s * 0.32, 0.85, 1.1));
  // A farmer in a straw hat
  body.add(k.at(k.sph(0.18, '#e3b08e', { rough: 0.6 }, 12), 0, 1.55, -0.45));
  body.add(k.at(k.cyl(0.32, 0.32, 0.04, '#e0b45a', 14), 0, 1.72, -0.45));
  body.add(k.at(k.cyl(0.14, 0.17, 0.14, '#e0b45a', 12), 0, 1.8, -0.45));
  body.add(k.at(k.rbox(0.42, 0.3, 0.26, C.rose, 0.08), 0, 1.28, -0.45));
  colorBake(body);
  g.add(body);
  const wheels = [];
  for (const [x, z, r] of [[0.62, -0.5, 0.55], [-0.62, -0.5, 0.55], [0.5, 0.75, 0.32], [-0.5, 0.75, 0.32]]) {
    const w = new THREE.Group();
    const tyre = k.cyl(r, r, 0.3, C.ink, 16);
    tyre.rotation.z = Math.PI / 2;
    w.add(tyre);
    const hub = k.cyl(r * 0.5, r * 0.5, 0.32, C.sun, 12);
    hub.rotation.z = Math.PI / 2;
    w.add(hub);
    w.position.set(x, r, z);
    colorBake(w);
    g.add(w);
    wheels.push({ w, r });
  }
  g.userData = { wheels };
  return g;
}

// ------------------------------------------------------------------ the school crossing and the ball
const KID_LOOKS = [
  { id: 'kid1', name: 'Kid', gender: 'girl', skin: '#c98f68', hair: '#141010', hairstyle: 'ponytail', outfit: 'dress', top: '#ffd166', bottom: '#ffd166', shoes: '#ef5b6f', accent: '#ff7fa3' },
  { id: 'kid2', name: 'Kid', gender: 'boy', skin: '#fbe6d8', hair: '#b5773d', hairstyle: 'curly', outfit: 'tee-shorts', top: '#7fd3a7', bottom: '#2c3e66', shoes: '#ffffff', accent: '#ffd166' },
  { id: 'kid3', name: 'Kid', gender: 'girl', skin: '#9c6a4a', hair: '#141010', hairstyle: 'buns', outfit: 'overalls', top: '#ff9eb5', bottom: '#6fb8ff', shoes: '#3b2b3f', accent: '#ffd166' },
  { id: 'kid4', name: 'Kid', gender: 'boy', skin: '#e3b08e', hair: '#4a2c1a', hairstyle: 'spiky', outfit: 'tee-shorts', top: '#c7a6ff', bottom: '#3b2b3f', shoes: '#ffd166', accent: '#ffd166' },
];
const GUARD = { id: 'guard', name: 'Crossing guard', gender: 'girl', skin: '#e3b08e', hair: '#4a2c1a', hairstyle: 'bob', outfit: 'dress', top: '#ffd166', bottom: '#ffd166', shoes: '#3b2b3f', accent: '#ef5b6f' };

// A person that walks along waypoints
class Walker {
  constructor(kid, x, z, yaw = 0) {
    this.kid = kid;
    this.pos = new THREE.Vector3(x, 0, z);
    this.yaw = yaw;
    this.path = [];
    this.speed = 0;
    this.max = 1.4;
    this.face = null;
  }
  go(path, max = 1.4) {
    this.path = path.map(([x, z]) => new THREE.Vector3(x, 0, z));
    this.max = max;
  }
  get moving() {
    return this.path.length > 0;
  }
  update(dt, t) {
    const tgt = this.path[0];
    if (tgt) {
      const dx = tgt.x - this.pos.x;
      const dz = tgt.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.08) this.path.shift();
      else {
        this.speed = damp(this.speed, Math.min(this.max, d * 3), 8, dt);
        const step = Math.min(d, this.speed * dt);
        this.pos.x += (dx / d) * step;
        this.pos.z += (dz / d) * step;
        this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 10, dt);
      }
    } else {
      this.speed = damp(this.speed, 0, 10, dt);
      if (this.face !== null) this.yaw = dampAngle(this.yaw, this.face, 5, dt);
    }
    this.kid.root.position.copy(this.pos);
    this.kid.root.rotation.y = this.yaw;
    this.kid.update(dt, t, this.speed, 0, 0);
  }
}

export class Crossing {
  constructor(ctx, k, physics) {
    this.ctx = ctx;
    this.physics = physics;
    const [x0, x1] = SCHOOL.zeb;
    this.mid = (x0 + x1) / 2;
    const guardKid = ctx.makeKid(GUARD);
    guardKid.root.scale.setScalar(1.16);
    // A white hi-vis band round the coat
    const band = mesh(new THREE.CylinderGeometry(0.235, 0.25, 0.06, 16, 1, true), mat('#ffffff', { rough: 0.4 }));
    band.position.set(0, 0.5, 0);
    guardKid.body.add(band);
    this.sign = lollipop(k);
    colorBake(this.sign);
    guardKid.root.add(this.sign);
    bakeNpc(guardKid);
    ctx.scene.add(guardKid.root);
    this.guard = new Walker(guardKid, this.mid + 1.6, -13.6, 0);
    this.guard.face = 0;
    this.guardCol = physics.add({ type: 'circle', x: 0, z: 0, r: 0.4 });
    this.kids = KID_LOOKS.slice(0, 3).map((L, i) => {
      const kid = ctx.makeKid(L);
      kid.root.scale.setScalar(0.72);
      const bag = k.rbox(0.3, 0.34, 0.14, [C.rose, C.sky, C.sun][i], 0.05);
      bag.position.set(0, 0.62, -0.24);
      kid.body.add(bag);
      bakeNpc(kid);
      ctx.scene.add(kid.root);
      const w = new Walker(kid, 35 + i * 3, -17, 0);
      w.col = physics.add({ type: 'circle', x: 0, z: 0, r: 0.3 });
      return w;
    });
    // The ball and the child who chases it, in the little park
    this.ball = makeBall(k);
    ctx.scene.add(this.ball);
    const bk = ctx.makeKid(KID_LOOKS[3]);
    bk.root.scale.setScalar(0.72);
    bakeNpc(bk);
    ctx.scene.add(bk.root);
    this.ballKid = new Walker(bk, SCHOOL.ballX - 1.2, -3.6, Math.PI);
    this.reset();
  }
  reset() {
    this.state = 'idle';
    this.t = 0;
    this.played = 0;
    this.guard.pos.set(this.mid + 1.6, 0, -13.6);
    this.guard.path = [];
    this.guard.face = 0;
    this.raise = 0;
    this.kids.forEach((w, i) => {
      w.pos.set(34 + i * 4.2, 0, -16.6 - (i % 2) * 0.9);
      w.path = [];
      w.face = 0;
      w.wander = 1 + i;
    });
    this.ballState = 'idle';
    this.ballP = new THREE.Vector3(SCHOOL.ballX - 0.6, 0.2, -3.2);
    this.ballV = new THREE.Vector3();
    this.ballKid.pos.set(SCHOOL.ballX - 1.4, 0, -3.4);
    this.ballKid.path = [];
    this.ballKid.face = Math.PI * 0.8;
    this.kick = 0;
  }
  // The children line up at the gate (lesson start)
  ready() {
    this.reset();
    this.state = 'waiting';
    this.kids.forEach((w, i) => {
      w.pos.set(this.mid - 0.5 + i * 0.5, 0, -14.2 - i * 0.55);
      w.face = Math.PI;
    });
  }
  // Start the crossing: the guard walks out, then the children cross
  start() {
    if (this.state !== 'waiting') return;
    this.state = 'out';
    this.t = 0;
    this.guard.go([[this.mid + 1.0, -12.2], [this.mid + 1.0, -10.0]], 1.6);
  }
  get onRoad() {
    const inR = (p) => p.z > -12.6 && p.z < -7.4 && p.x > this.mid - 2.2 && p.x < this.mid + 2.2;
    return inR(this.guard.pos) || this.kids.some((w) => inR(w.pos));
  }
  get kidsOnRoad() {
    return this.kids.some((w) => w.pos.z > -12.6 && w.pos.z < -7.4 && Math.abs(w.pos.x - this.mid) < 2.2);
  }
  get clear() {
    return this.state === 'done' || this.state === 'idle';
  }
  squeal() {
    for (const w of this.kids) if (w.pos.z > -12.8 && w.pos.z < -7.2) w.kid.squash = 1.25;
  }
  // The ball rolls out from the park
  ballGo() {
    if (this.ballState !== 'idle') return;
    this.ballState = 'roll';
    this.ballP.set(SCHOOL.ballX, 0.2, -5.6);
    this.ballV.set(0.15, 0, -2.6);
    this.ballKid.pos.set(SCHOOL.ballX - 0.6, 0, -3.4);
    this.ballKid.go([[SCHOOL.ballX, -5.0], [SCHOOL.ballX, -6.7]], 2.4);
    this.ballKid.face = Math.PI;
  }
  get ballOnRoad() {
    return this.ballState === 'roll' && this.ballP.z < -7.4 && this.ballP.z > -12.6;
  }
  fetchBall() {
    if (this.ballState !== 'stopped') return;
    this.ballState = 'fetch';
    this.ballKid.go([[SCHOOL.ballX + 0.4, -12.4], [SCHOOL.ballX - 0.2, -5.6], [SCHOOL.ballX - 1.4, -3.4]], 1.8);
  }
  update(dt, t) {
    this.t += dt;
    if (this.state === 'out' && !this.guard.moving) {
      this.state = 'crossing';
      this.t = 0;
      this.guard.face = -Math.PI / 2;
      this.kids.forEach((w) => (w.sent = false));
    }
    if (this.state === 'crossing') {
      this.kids.forEach((w, i) => {
        if (!w.sent && this.t > 0.25 + i * 0.65) {
          w.sent = true;
          w.go([[this.mid - 0.4 + i * 0.4, -12.9], [this.mid - 0.6 + i * 0.5, -7.0], [31 + i * 3.6, -3.2 - (i % 2) * 0.6]], 1.25);
        }
      });
    }
    if (this.state === 'crossing' && this.t > 2.5 && this.kids.every((w) => w.sent) && !this.kidsOnRoad && this.kids.every((w) => w.pos.z > -7)) {
      this.state = 'back';
      this.guard.go([[this.mid + 1.6, -12.2], [this.mid + 1.6, -13.6]], 1.6);
      this.guard.face = 0;
    }
    if (this.state === 'back' && !this.guard.moving) {
      this.state = 'done';
      this.t = 0;
      this.guard.kid.emote('wave');
    }
    this.raise = damp(this.raise, this.state === 'crossing' || (this.state === 'out' && this.guard.pos.z > -11.5) ? 1 : 0, 6, dt);
    // Idle children wander about the yard
    for (const w of this.kids) {
      if (this.state === 'idle' && !w.moving) {
        w.wander -= dt;
        if (w.wander <= 0) {
          w.wander = 2 + Math.random() * 3;
          if (Math.random() < 0.35) w.kid.squash = 1.2;
          else w.go([[34 + Math.random() * 12, -18 + Math.random() * 2.2]], 1.0);
        }
      }
      w.update(dt, t);
      w.col.x = w.pos.x;
      w.col.z = w.pos.z;
    }
    this.guard.update(dt, t);
    this.guardCol.x = this.guard.pos.x;
    this.guardCol.z = this.guard.pos.z;
    // The guard holds the lollipop beside her, and raises it high in the road
    const gk = this.guard.kid;
    const arm = gk.arms[1];
    arm.rotation.z = -0.35 - this.raise * 0.5;
    arm.rotation.x = -0.4 - this.raise * 0.9;
    this.sign.position.set(-0.3, 0.2 + this.raise * 0.35, 0.2 + this.raise * 0.08);
    // The sign turns to face the cars coming along School Street (and a little toward the camera)
    this.sign.rotation.set(-this.raise * 0.15, -0.75 - this.guard.yaw, 0);
    // The ball
    if (this.ballState === 'roll') {
      this.ballP.addScaledVector(this.ballV, dt);
      this.ball.rotation.x -= (this.ballV.z / 0.2) * dt;
      if (this.ballP.z < -12.5) {
        this.ballState = 'stopped';
        this.ballP.z = -12.5;
      }
    }
    if (this.ballState === 'fetch' && this.ballKid.path.length <= 2 && this.ballP.z < -12) this.ballState = 'carried';
    if (this.ballState === 'carried') this.ballP.set(this.ballKid.pos.x, 0.62, this.ballKid.pos.z + 0.22);
    if (this.ballState === 'carried' && !this.ballKid.moving) {
      this.ballState = 'home';
      this.ballP.set(SCHOOL.ballX - 0.8, 0.2, -3.0);
    }
    this.ball.position.copy(this.ballP);
    this.ballKid.update(dt, t);
    if (this.ballState === 'idle' || this.ballState === 'home') {
      // A gentle game of keepy-uppy in the park
      this.kick += dt;
      this.ball.position.y = 0.2 + Math.abs(Math.sin(this.kick * 2.6)) * 0.7;
      this.ballKid.face = Math.atan2(this.ballP.x - this.ballKid.pos.x, this.ballP.z - this.ballKid.pos.z);
    }
  }
}

// ------------------------------------------------------------------ the fox (night lesson)
export class Fox {
  constructor(ctx, k) {
    this.g = makeFox(k);
    this.g.visible = false;
    ctx.scene.add(this.g);
    this.state = 'hidden';
    this.phase = 0;
  }
  ready(from, to) {
    this.from = new THREE.Vector3(...from);
    this.to = new THREE.Vector3(...to);
    this.pos = this.from.clone();
    this.state = 'wait';
    this.g.visible = true;
    this.g.position.copy(this.pos);
    this.g.rotation.y = Math.atan2(this.to.x - this.from.x, this.to.z - this.from.z);
    this.pause = 0;
    this.looked = false;
  }
  hide() {
    this.state = 'hidden';
    this.g.visible = false;
  }
  go() {
    if (this.state === 'wait') this.state = 'run';
  }
  get onRoad() {
    return (this.state === 'run' || this.state === 'look') && Math.abs(this.pos.x) < 2.8;
  }
  update(dt, t, carPos, lightsOn) {
    if (this.state === 'hidden') return;
    const u = this.g.userData;
    let speed = 0;
    if (this.state === 'run') {
      speed = 2.3;
      const d = this.to.clone().sub(this.pos);
      const len = d.length();
      if (len < 0.1) {
        this.state = 'gone';
      } else {
        this.pos.addScaledVector(d.normalize(), Math.min(len, speed * dt));
        if (!this.looked && Math.abs(this.pos.x) < 0.6) {
          this.looked = true;
          this.state = 'look';
          this.pause = 1.3;
        }
      }
    } else if (this.state === 'look') {
      this.pause -= dt;
      if (this.pause <= 0) this.state = 'run';
    } else if (this.state === 'gone') {
      this.g.visible = false;
    }
    this.phase += dt * (4 + speed * 5);
    u.legs.forEach((l, i) => (l.rotation.x = speed ? Math.sin(this.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.7 : 0));
    u.tail.rotation.y = Math.sin(t * 3) * 0.3;
    const look = this.state === 'look';
    u.head.rotation.y = damp(u.head.rotation.y, look && carPos ? wrap(Math.atan2(carPos.x - this.pos.x, carPos.z - this.pos.z) - this.g.rotation.y) * 0.8 : 0, 6, dt);
    const near = carPos ? Math.hypot(carPos.x - this.pos.x, carPos.z - this.pos.z) : 99;
    u.eyeMat.emissiveIntensity = lightsOn && near < 14 ? 2.5 : 0;
    this.g.position.set(this.pos.x, Math.abs(Math.sin(this.phase)) * 0.04 * (speed ? 1 : 0), this.pos.z);
  }
}

// ------------------------------------------------------------------ the tractor at the narrow bridge
export class Tractor {
  constructor(ctx, k, physics) {
    this.g = makeTractor(k);
    ctx.scene.add(this.g);
    this.col = physics.add({ type: 'circle', x: 0, z: 0, r: 1.0 });
    this.pts = TRACTOR_PATH.map(([x, z]) => new THREE.Vector2(x, z));
    this.lens = [0];
    for (let i = 1; i < this.pts.length; i++) this.lens.push(this.lens[i - 1] + this.pts[i].distanceTo(this.pts[i - 1]));
    this.total = this.lens[this.lens.length - 1];
    this.sOn = this.lens[3]; // bridge south end
    this.sOff = this.lens[5]; // past the bridge
    this.park();
  }
  at(s) {
    s = clamp(s, 0, this.total);
    let i = 1;
    while (i < this.lens.length - 1 && this.lens[i] < s) i++;
    const a = this.pts[i - 1];
    const b = this.pts[i];
    const f = (s - this.lens[i - 1]) / (this.lens[i] - this.lens[i - 1] || 1);
    return { x: a.x + (b.x - a.x) * f, z: a.y + (b.y - a.y) * f, yaw: Math.atan2(b.x - a.x, b.y - a.y) };
  }
  park() {
    this.s = this.total;
    this.v = 0;
    this.state = 'parked';
    this.place(0, 0);
  }
  ready() {
    this.s = 0;
    this.v = 0;
    this.state = 'wait';
    this.place(0, 0);
  }
  go() {
    if (this.state === 'wait') this.state = 'go';
  }
  // Has it come onto (or is about to come onto) the bridge?
  get coming() {
    return (this.state === 'go' || this.state === 'yield') && this.s < this.sOff;
  }
  get onBridge() {
    return this.s > this.sOn - 0.6 && this.s < this.sOff + 0.6 && this.state !== 'parked';
  }
  get passed() {
    return this.s > this.sOff + 1.6 || this.state === 'parked' || this.state === 'done';
  }
  place(dt, t) {
    const p = this.at(this.s);
    const y = heightAt(p.x, p.z);
    this.g.position.set(p.x, y, p.z);
    this.g.rotation.y = dt ? dampAngle(this.g.rotation.y, p.yaw, 8, dt) : p.yaw;
    this.col.x = p.x;
    this.col.z = p.z;
    for (const { w, r } of this.g.userData.wheels) w.rotation.x += (this.v / r) * dt;
    this.g.children[0].position.y = Math.abs(Math.sin(t * 14)) * 0.02 * Math.min(1, Math.abs(this.v));
  }
  // carOnBridge: the learner car is on the bridge (the tractor waits off it, or backs off it)
  update(dt, t, carOnBridge, sound) {
    let want = 0;
    if (this.state === 'go') {
      want = 2.6;
      if (carOnBridge && this.s < this.sOn - 0.8) {
        this.state = 'yield';
        sound?.honk?.();
      } else if (carOnBridge && this.s < this.sOff) {
        this.state = 'back';
        sound?.honk?.();
      }
    } else if (this.state === 'yield') {
      want = 0;
      if (!carOnBridge) this.state = 'go';
    } else if (this.state === 'back') {
      want = -1.8;
      if (this.s <= this.sOn - 1.4) this.state = 'yield';
    }
    if (this.state === 'go' && this.s >= this.total - 0.05) this.state = 'done';
    this.v = damp(this.v, want, 4, dt);
    this.s = clamp(this.s + this.v * dt, 0, this.total);
    this.place(dt, t);
  }
}

// ------------------------------------------------------------------ the duck family (world.ducks)
// home: waiting by their hut; walking: crossing the duck road; scared: hurrying; pond: swimming.
export class Ducks {
  constructor(list, { zebra, pond, duckZ }) {
    this.list = list;
    this.Z = zebra;
    this.P = pond;
    this.duckZ = duckZ;
    this.pond();
  }
  home() {
    this.state = 'home';
    this.speed = 1.6;
    this.list.forEach((d, i) => {
      d.x = 13.9 - i * 0.65;
      d.z = this.duckZ;
      d.done = false;
      d.hop = 0;
    });
  }
  pond() {
    this.state = 'pond';
    this.list.forEach((d, i) => {
      d.done = true;
      d.swimA = Math.PI + i * 0.9;
    });
  }
  walk() {
    if (this.state === 'home') this.state = 'walking';
  }
  scare() {
    this.state = 'scared';
    this.speed = 4.5;
    for (const d of this.list) d.hop = 1;
  }
  quackHop() {
    for (const d of this.list) d.hop = 0.5;
  }
  get onRoad() {
    return this.list.some((d) => !d.done && d.x > this.Z.x0 - 0.3 && d.x < this.Z.x1 + 0.3);
  }
  get clear() {
    return this.state === 'crossed' || this.state === 'pond';
  }
  update(dt, t) {
    const walking = this.state === 'walking' || this.state === 'scared' || this.state === 'crossed';
    this.list.forEach((dk, i) => {
      dk.hop = Math.max(0, dk.hop - dt);
      if (walking && !dk.done) {
        dk.x += this.speed * dt;
        if (dk.x > this.P.x - 1.6) {
          dk.done = true;
          dk.swimA = Math.PI + i * 0.9;
        }
        const bob = Math.abs(Math.sin(t * 9 + i)) * 0.05;
        dk.g.position.set(dk.x, bob + (dk.hop > 0 ? Math.abs(Math.sin(dk.hop * 12)) * 0.25 : 0), this.duckZ + (i ? Math.sin(t * 4 + i) * 0.04 : 0));
        dk.g.rotation.set(0, Math.PI / 2, Math.sin(t * 9 + i) * 0.12);
      } else if (dk.done) {
        dk.swimA += dt * 0.5;
        const r = this.P.r - 0.55;
        dk.g.position.set(this.P.x + Math.cos(dk.swimA) * r, 0.17 + Math.sin(t * 3 + i) * 0.012 + (dk.hop > 0 ? Math.abs(Math.sin(dk.hop * 12)) * 0.1 : 0), this.P.z + Math.sin(dk.swimA) * r);
        dk.g.rotation.set(0, -dk.swimA, 0);
      } else {
        dk.g.position.set(dk.x, dk.hop > 0 ? Math.abs(Math.sin(dk.hop * 12)) * 0.2 : 0, this.duckZ + 0.4);
        dk.g.rotation.set(0, Math.PI / 2 + Math.sin(t * 0.8 + i) * 0.3, 0);
      }
    });
    if ((this.state === 'walking' || this.state === 'scared') && this.list.every((d) => d.done || d.x > this.Z.x1 + 0.6)) this.state = 'crossed';
    if (this.state === 'crossed' && this.list.every((d) => d.done)) this.state = 'pond';
  }
}
