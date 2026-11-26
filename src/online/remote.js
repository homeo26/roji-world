import * as THREE from 'three';
import { EMOTES } from '../kid.js';
import { HAIRSTYLES, OUTFITS_BY, DEFAULT_LOOKS } from '../looks.js';
import { clamp, dampAngle } from '../util.js';
import { RADIUS } from '../engine/movement.js';

// The other player's kid, drawn from the states their device sends (p/<uid>): checked, buffered and shown
// about 100 ms behind (a little more on a jittery connection) by interpolating between two states, so it
// moves smoothly. Seats, the car, the pony and the scooter follow the state's pose and mount.

export const POSES = new Set(['stand', 'sit', 'sleep', 'ride', 'drive', 'swim', 'ski', 'bike', 'scoot', 'run', 'hang']);
const MOUNTS = new Set(['none', 'car', 'pony', 'scooter']);
const HEX = /^#[0-9a-fA-F]{6}$/;
const LOOK_COLOURS = ['skin', 'hair', 'top', 'bottom', 'shoes', 'accent'];
const SEAT_DRIVE = new THREE.Vector3(0.33, 0.66, -0.25);
const SEAT_RIDE = new THREE.Vector3(-0.33, 0.66, -0.25);
const SEAT_PONY = new THREE.Vector3(0, 1.1, -0.02);
const JUMP = 5; // metres between two states that count as a jump (a door, a teleport), not a walk

const num = (n, lim) => (typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < lim ? n : null);

// A state from the network, or null when it is not one we can use
export function cleanState(v, who) {
  if (!v || typeof v !== 'object' || v.who !== who) return null;
  const x = num(v.x, 5000);
  const z = num(v.z, 5000);
  const yaw = num(v.yaw, 1e4);
  const t = num(v.t, 1e15);
  if (x === null || z === null || yaw === null || t === null) return null;
  return {
    x,
    z,
    t,
    yaw,
    y: clamp(num(v.y, 1000) ?? 0, -5, 40),
    speed: clamp(num(v.speed, 1000) ?? 0, -40, 40),
    pose: POSES.has(v.pose) ? v.pose : 'stand',
    mount: MOUNTS.has(v.mount) ? v.mount : 'none',
    space: typeof v.space === 'string' && /^[a-z0-9_-]{1,24}$/.test(v.space) ? v.space : 'town',
    emote: typeof v.emote === 'string' ? v.emote.slice(0, 24) : '',
    look: typeof v.look === 'string' ? v.look : '',
  };
}

// The wardrobe look in a state, kept inside that kid's own wardrobe
export function cleanLook(str, id) {
  let o;
  try {
    o = JSON.parse(str);
  } catch {
    return null;
  }
  if (!o || typeof o !== 'object') return null;
  const base = DEFAULT_LOOKS[id];
  const L = { ...base };
  for (const k of LOOK_COLOURS) if (typeof o[k] === 'string' && HEX.test(o[k])) L[k] = o[k];
  if (HAIRSTYLES[base.gender].includes(o.hairstyle)) L.hairstyle = o.hairstyle;
  if (OUTFITS_BY[base.gender].includes(o.outfit)) L.outfit = o.outfit;
  return L;
}

// What of a look goes over the wire
export const lookString = (L) => JSON.stringify(Object.fromEntries(['hairstyle', 'outfit', ...LOOK_COLOURS].filter((k) => L[k]).map((k) => [k, L[k]])));

const lerpAngle = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

export class Remote {
  // h: hooks from src/main.js (see makeHooks there)
  constructor(h, id) {
    this.h = h;
    this.id = id;
    this.buf = [];
    this.offs = [];
    this.minOff = 0;
    this.delay = 110;
    this.lastRecv = 0;
    this.cur = null;
    this.mode = null; // how the kid is attached: ground | drive | ride | pony (null: not yet, so the first state attaches it)
    this.local = null; // set while this device moves the kid itself (a shared activity, holding hands as the leader)
    this.blend = null;
    this.lastEmote = null;
    this.seat = null; // the other player's own seat in their activity ({ x, z, y, yaw, pose, hands, rot }, space-local)
    this.prev = new THREE.Vector3();
    this.pony = null;
    this.was = null;
  }

  get actor() {
    return this.h.actors[this.id];
  }

  get fresh() {
    return this.cur && performance.now() - this.lastRecv < 4500;
  }

  push(s) {
    const now = performance.now();
    const last = this.buf[this.buf.length - 1];
    if (last && s.t <= last.t) {
      if (s.t > last.t - 3000) return; // an old or repeated state
      this.buf.length = 0; // their clock went back (the page reloaded): start again
      this.offs.length = 0;
    }
    this.lastRecv = now;
    this.buf.push(s);
    if (this.buf.length > 30) this.buf.shift();
    // Their clock against ours: the smallest gap seen is the one with the least delay; the spread above it
    // is the jitter, which the delay has to cover
    this.offs.push(now - s.t);
    if (this.offs.length > 40) this.offs.shift();
    const sorted = [...this.offs].sort((a, b) => a - b);
    this.minOff = sorted[0];
    this.delay = clamp(100 + sorted[Math.floor(sorted.length * 0.9)] - sorted[0], 100, 300);
  }

  // The state at the moment being shown (about 100 ms ago on their clock)
  sample() {
    const b = this.buf;
    if (!b.length) return null;
    const rt = performance.now() - this.minOff - this.delay;
    while (b.length > 2 && b[1].t <= rt) b.shift();
    const s0 = b[0];
    const s1 = b[1];
    const out = { ...s0 };
    if (!s1 || rt <= s0.t) {
      if (!s1 && rt > s0.t && this.v && s0.mount === 'none') {
        // Late: carry on for a moment at the last speed, then wait
        const k = Math.min(rt - s0.t, 150) / 1000;
        out.x += this.v.x * k;
        out.z += this.v.z * k;
      }
      return out;
    }
    const k = clamp((rt - s0.t) / Math.max(1, s1.t - s0.t), 0, 1);
    const jump = s0.space !== s1.space || s0.mount !== s1.mount || Math.hypot(s1.x - s0.x, s1.z - s0.z) > JUMP;
    if (jump) return k >= 1 ? { ...s1 } : out;
    out.x = s0.x + (s1.x - s0.x) * k;
    out.z = s0.z + (s1.z - s0.z) * k;
    out.y = s0.y + (s1.y - s0.y) * k;
    out.yaw = lerpAngle(s0.yaw, s1.yaw, k);
    out.speed = s0.speed + (s1.speed - s0.speed) * k;
    const dt = (s1.t - s0.t) / 1000;
    this.v = dt > 0 && dt < 0.4 ? { x: (s1.x - s0.x) / dt, z: (s1.z - s0.z) / dt } : null;
    return out;
  }

  // Which world origin a space has on this device (interiors are built where each device first built them)
  origin(space) {
    if (space === 'town') return this.h.townOrigin;
    return this.h.spaces.interiors[space]?.space?.origin || null;
  }

  attach(mode) {
    if (mode === this.mode) return;
    const h = this.h;
    const a = this.actor;
    const k = a.kid;
    this.mode = mode;
    if (mode === 'ground') {
      h.scene.add(k.root);
      k.pose = 'stand';
      a.seated = false;
      k.root.rotation.set(0, a.yaw, 0);
      if (this.pony) h.scene.remove(this.pony.root);
      return;
    }
    const parent = mode === 'pony' ? this.ponyRoot() : h.car.body;
    parent.add(k.root);
    k.root.position.copy(mode === 'drive' ? SEAT_DRIVE : mode === 'ride' ? SEAT_RIDE : SEAT_PONY);
    k.root.rotation.set(0, 0, 0);
    k.pose = mode === 'drive' ? 'drive' : mode === 'ride' ? 'sit' : 'ride';
    k.cancelEmote();
    k.holdSide = 0;
    a.seated = true;
    if (mode !== 'pony' && this.pony) h.scene.remove(this.pony.root);
  }

  // Their own pony (each player rides their own), made the first time they ride
  ponyRoot() {
    if (!this.pony) this.pony = this.h.makePony('#e8c79a');
    this.h.scene.add(this.pony.root);
    return this.pony.root;
  }

  // Start or stop moving the kid on this device. Back on the network it glides to where they really are.
  setLocal(why) {
    if (why === this.local) return;
    const a = this.actor;
    if (why) {
      this.attach('ground');
      this.local = why;
      this.blend = null;
      return;
    }
    this.local = null;
    const s = this.cur;
    const O = s && this.origin(s.space);
    if (s && O) {
      const dx = a.pos.x - (O.x + s.x);
      const dz = a.pos.z - (O.z + s.z);
      this.blend = Math.hypot(dx, dz) < 3 ? { x: dx, z: dz, y: a.y - s.y } : null;
    }
  }

  // Where their own device has the kid now (world), when it is in this space
  netPos() {
    const s = this.cur;
    const O = s && s.space === this.h.spaceId() && this.origin(s.space);
    return O ? new THREE.Vector3(O.x + s.x, 0, O.z + s.z) : null;
  }

  // Before the kids are drawn: put the kid where the state says
  update(dt, t) {
    const s = this.sample();
    if (!s) return;
    this.cur = s;
    const h = this.h;
    const a = this.actor;
    const k = a.kid;
    const mySpace = h.spaceId();
    const O = this.origin(s.space);
    const seen = s.space === mySpace && !!O;
    if (s.emote !== this.lastEmote) {
      const play = this.lastEmote !== null && seen;
      this.lastEmote = s.emote;
      const type = s.emote.split('.')[0];
      if (play && type === 'flip') a.flipT = 0;
      else if (play && EMOTES[type] && this.mode === 'ground' && !k.danceLoop) k.emote(type);
    }
    if (this.local) return;
    this.at = null;
    if (!seen) {
      // In another building (or outside while we are in): hidden; on the map they wait at its door
      k.root.visible = false;
      this.attach('ground');
      h.scooters[this.id].root.visible = false;
      const door = mySpace === 'town' && h.spaces.interiors[s.space]?.door;
      if (door) a.pos.set(door.x, 0, door.z);
      this.was = null;
      return;
    }
    k.root.visible = true;
    const wx = O.x + s.x;
    const wz = O.z + s.z;
    const myMount = h.mount();
    let mode = 'ground';
    if (s.mount === 'car' && mySpace === 'town') {
      if (s.pose === 'drive' && !(myMount?.type === 'car' && !myMount.ride)) mode = 'drive';
      else if (s.pose !== 'drive' && myMount?.type === 'car' && !myMount.ride) mode = 'ride';
    } else if (s.mount === 'pony') mode = 'pony';
    const jumped = this.was && (this.was.space !== s.space || Math.hypot(this.was.x - wx, this.was.z - wz) > JUMP);
    if (jumped && mode === 'ground' && this.mode === 'ground') h.fx.poof(a.pos);
    this.attach(mode);
    const scooter = h.scooters[this.id];
    scooter.root.visible = mode === 'ground' && s.mount === 'scooter';
    a.turn = this.was ? Math.atan2(Math.sin(s.yaw - a.yaw), Math.cos(s.yaw - a.yaw)) / Math.max(dt, 1e-3) : 0;
    if (mode === 'drive') {
      const car = h.car;
      car.root.position.set(wx, 0, wz);
      car.yaw = s.yaw;
      car.root.rotation.y = s.yaw;
      car.turnRate = a.turn;
      car.speed = s.speed;
      h.moveCarCollider(wx, wz);
      if (myMount?.type === 'car') car.update(dt, t); // riding along: the town loop leaves the car to us
      a.pos.set(wx, 0, wz);
      a.yaw = s.yaw;
      a.speed = Math.abs(s.speed);
    } else if (mode === 'pony') {
      const pr = this.pony.root;
      pr.position.set(wx, s.y, wz);
      pr.rotation.y = s.yaw;
      this.pony.animate(dt, Math.abs(s.speed));
      a.pos.set(wx, 0, wz);
      a.yaw = s.yaw;
      a.speed = Math.abs(s.speed);
    } else if (mode === 'ride') {
      a.pos.copy(h.car.root.position);
    } else {
      let bx = 0;
      let bz = 0;
      let by = 0;
      if (this.blend) {
        const f = Math.exp(-7 * dt);
        this.blend.x *= f;
        this.blend.z *= f;
        this.blend.y *= f;
        ({ x: bx, z: bz, y: by } = this.blend);
        if (Math.abs(bx) + Math.abs(bz) + Math.abs(by) < 0.01) this.blend = null;
      }
      this.prev.copy(a.pos);
      a.pos.set(wx + bx, 0, wz + bz);
      this.at = { x: a.pos.x, z: a.pos.z };
      a.y = s.y + by;
      a.yaw = jumped || !this.was ? s.yaw : dampAngle(a.yaw, s.yaw, 30, dt);
      a.speed = Math.abs(s.speed);
      const vx = (a.pos.x - this.prev.x) / Math.max(dt, 1e-3);
      const vz = (a.pos.z - this.prev.z) / Math.max(dt, 1e-3);
      if (Math.hypot(vx, vz) < 30) a.vel.set(vx, 0, vz);
      a.mode = s.pose === 'swim' ? 'swim' : 'walk';
      if (s.pose === 'stand' || s.pose === 'swim' || s.pose === 'scoot') {
        if (a.seated || (k.pose !== 'stand' && k.pose !== 'swim' && k.pose !== 'scoot')) {
          k.pose = 'stand';
          k.hands = k.carried ? 'carry' : null;
          a.seated = false;
        }
        if (s.pose === 'scoot') {
          k.pose = 'scoot';
          k.kickWant = a.speed > 0.6 && a.speed < 11 ? 1 : 0;
          scooter.spin(dt, a.speed);
        } else if (k.pose === 'scoot') k.pose = 'stand';
        a.ground = s.pose === 'swim' ? a.y : Math.min(a.y, h.physics.support(a.pos.x, a.pos.z, RADIUS, a.y + 0.05, 0));
      } else {
        // Seated (an activity): their seat from the activity message gives the full turn (lying in bed)
        const seat = this.seat && this.seat.space === s.space && this.seat.pose === s.pose && Math.hypot(this.seat.x - s.x, this.seat.z - s.z) < 0.6 ? this.seat : null;
        if (k.pose !== s.pose) k.cancelEmote();
        k.pose = s.pose;
        k.hands = seat?.hands ?? null;
        a.seated = true;
        a.ground = a.y;
        k.root.position.set(a.pos.x, a.y, a.pos.z);
        if (seat?.rot) k.root.rotation.set(seat.rot[0], seat.rot[1], seat.rot[2]);
        else k.root.rotation.set(0, a.yaw, 0);
      }
    }
    this.was = { space: s.space, x: wx, z: wz };
  }

  // Just before the frame is drawn: a place or a town module may have moved the kid since; the state wins
  late() {
    if (this.local || !this.cur || this.mode !== 'ground') return;
    const a = this.actor;
    const k = a.kid;
    if (!k.root.visible) return;
    if (k.pose === 'stand' || k.pose === 'swim' || k.pose === 'scoot') {
      if (this.at) a.pos.set(this.at.x, 0, this.at.z); // pushed by people here, who stand elsewhere on their screen
      k.root.position.set(a.pos.x, a.y - (a.stepLag || 0), a.pos.z);
      k.root.rotation.set(0, a.yaw, 0);
    }
  }

  // The other player left: the kid is the computer partner again
  release() {
    const a = this.actor;
    this.local = null;
    this.attach('ground');
    if (this.pony) this.h.scene.remove(this.pony.root);
    const k = a.kid;
    k.root.visible = true;
    k.pose = 'stand';
    k.hands = k.carried ? 'carry' : null;
    k.holdSide = 0;
    k.danceLoop = false;
    a.seated = false;
    a.mode = 'walk';
    this.h.scooters[this.id].root.visible = false;
    this.buf.length = 0;
    this.cur = null;
  }
}
