import * as THREE from 'three';
import { stepWalker, stepVertical, faceTo, airOf } from '../../engine/movement.js';
import { clamp } from '../../util.js';
import { makeRose, makeSunHat, HAT_POS } from './models.js';

// Homama's little gestures for Roji (and a smaller set from Roji when Homama is the player).
// Each gesture is a generator that runs one step per frame while it owns the partner
// (game.partnerBusy), walking them with the game's own movement helpers so they collide with
// everything the player does. Anything that interrupts (a game, a card, an activity, a ride,
// switching players) ends it at once and hands the partner back.

const leftOf = (yaw, d = 1) => new THREE.Vector3(Math.cos(yaw) * d, 0, -Math.sin(yaw) * d);
const fwdOf = (yaw, d = 1) => new THREE.Vector3(Math.sin(yaw) * d, 0, Math.cos(yaw) * d);
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const angDiff = (a, b) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Seconds of free walking between gestures, on average
export const FREQUENCY = { often: 55, sometimes: 130, rarely: 280, off: Infinity };
const FREQ_KEY = 'roji-world-love';
const ROSE_KEY = 'roji-world-love-roses';

export function loadFrequency() {
  try {
    const v = localStorage.getItem(FREQ_KEY);
    if (!v) return 'sometimes';
    const f = v.startsWith('{') ? JSON.parse(v).frequency : v.replace(/"/g, '');
    return FREQUENCY[f] !== undefined ? f : 'sometimes';
  } catch {
    return 'sometimes';
  }
}

const LINES_H = [
  'You are my favourite place on this island <3',
  'Have I told you today? I love you.',
  'Every path is better with you on it.',
  'Proud of you, Dr. Roji. Always.',
  'You make the sun look a little shy.',
  'I would walk this whole island again with you.',
  'Best weekend ever. Because you are in it.',
  'My heart still does a flip when you smile.',
];
const SUNSET_LINES = ['Look, Roji. Our sunset <3', 'The sky turned pink for you.', 'Same time tomorrow? Here, with you.'];

export class Gestures {
  constructor(L) {
    this.L = L; // { game, api, state, ui, nature, sfx, toast, cardOpen }
    this.run = null; // { id, it, token, policy, cleanup: [] }
    this.clock = 0; // free walking time, seconds
    this.freq = loadFrequency();
    this.nextAt = this.mean() * 0.45;
    this.cool = {};
    this.pIdle = 0;
    this.lastId = null;
    this.over = []; // per-frame pose touches applied after the kids' own animation
    this.roseHeld = null; // { obj, t } a rose Roji is carrying
    this.hairRose = null; // { obj, kid, t }
    this.handOwned = null; // { t } Homama took her hand himself
    this.sunsetSeen = false;
    this.myActivity = null;
    this.tmp = new THREE.Vector3();
  }

  get game() {
    return this.L.game;
  }
  P() {
    return this.game.actors[this.game.playerId()];
  }
  C() {
    const id = this.game.playerId() === 'roji' ? 'homama' : 'roji';
    return this.game.actors[id];
  }
  mean() {
    const m = FREQUENCY[this.freq] ?? FREQUENCY.sometimes;
    return this.game.playerId() === 'homama' ? m * 1.8 : m;
  }
  setFrequency(f) {
    if (FREQUENCY[f] === undefined) return false;
    this.freq = f;
    try {
      localStorage.setItem(FREQ_KEY, f);
    } catch {
      /* storage blocked */
    }
    this.nextAt = this.clock + this.mean() * (0.6 + Math.random() * 0.8);
    return true;
  }

  // ---------------------------------------------------------------- the runner
  start(id, gen, { take = true, policy = 'free' } = {}) {
    if (this.run) this.stop();
    const g = this.game;
    if (take && g.partnerBusy) return false;
    const token = take ? `love-${id}` : null;
    if (token) g.partnerBusy = token;
    this.run = { id, token, policy, pid: g.playerId(), cleanup: [] };
    this.run.it = gen.call(this, this.run);
    this.lastId = id;
    if (token) {
      const P = this.P();
      const C = this.C();
      P.kid.holdSide = 0;
      C.kid.holdSide = 0;
    }
    return true;
  }

  stop() {
    const r = this.run;
    if (!r) return;
    this.run = null;
    try {
      r.it.return();
    } catch (e) {
      console.error('love: gesture cleanup failed', e);
    }
    for (const fn of r.cleanup.splice(0)) {
      try {
        fn();
      } catch (e) {
        console.error('love: cleanup failed', e);
      }
    }
    if (r.token && this.game.partnerBusy === r.token) this.game.partnerBusy = null;
    if (this.myActivity && this.game.activities.current === this.myActivity) this.game.activities.end(true);
    this.myActivity = null;
  }

  interrupted() {
    const r = this.run;
    const st = this.L.state();
    const g = this.game;
    if (st.playerId !== r.pid) return true;
    if (r.token && g.partnerBusy !== r.token) return true;
    if (r.policy === 'lunch') return !st.inside || (g.activities.active && g.activities.current !== this.myActivity) || !!st.mount;
    if (this.myActivity) return g.activities.current !== this.myActivity;
    if (!st.free || this.L.cardOpen()) return true;
    if (this.C().seated) return true;
    return false;
  }

  // Can a gesture start now?
  eligible() {
    const st = this.L.state();
    if (!st.free || this.L.cardOpen() || this.game.partnerBusy) return false;
    const P = this.P();
    const C = this.C();
    if (C.seated || P.mode !== 'walk' || C.mode !== 'walk') return false;
    if (P.pos.distanceTo(C.pos) > 9) return false;
    return true;
  }

  idleReady() {
    const P = this.P();
    const C = this.C();
    return this.pIdle > 0.8 && airOf(P) < 0.02 && airOf(C) < 0.02 && Math.abs(P.y - C.y) < 0.12 && P.surface !== 'ice' && P.pos.distanceTo(C.pos) < 7;
  }

  // ---------------------------------------------------------------- per frame
  tick(dt, t) {
    this.dt = dt;
    this.t = t;
    const P = this.P();
    this.pIdle = P.speed < 0.3 && !P.seated ? this.pIdle + dt : 0;
    this.keepers(dt);
    if (this.run) {
      if (this.interrupted()) this.stop();
      else {
        let done = true;
        try {
          done = this.run.it.next().done;
        } catch (e) {
          console.error(`love: gesture ${this.run.id} failed`, e);
        }
        if (done) this.stop();
      }
    } else if (this.eligible()) {
      this.clock += dt;
      this.maybeStart();
    }
    for (let i = this.over.length - 1; i >= 0; i--) {
      const o = this.over[i];
      o.t += dt;
      const alive = o.fn(o.t, dt) !== false && o.t < o.dur;
      if (!alive) this.over.splice(i, 1);
    }
  }

  // Pose touches that sit on top of Kid.update for a while: fn(t, dt) returns false to stop early
  touch(dur, fn) {
    const o = { t: 0, dur, fn };
    this.over.push(o);
    return o;
  }

  maybeStart() {
    if (this.freq === 'off') return;
    const roji = this.game.playerId() === 'roji';
    const st = this.L.state();
    // Sunset: once each evening, when the two are standing outside together
    const phase = this.L.phase();
    if (phase === 'Golden hour' || phase === 'Sunset') {
      if (!this.sunsetSeen && !st.inside && roji && this.idleReady() && this.clock > 20 && (this.cool.sunset ?? 0) <= this.clock) {
        this.sunsetSeen = true;
        this.cool.sunset = this.clock + 240;
        this.begin('sunset');
        return;
      }
    } else if (phase === 'Night' || phase === 'Morning' || phase === 'Noon') this.sunsetSeen = false;
    if (this.clock < this.nextAt) return;
    if ((this.checkAt ?? 0) > this.clock) return;
    this.checkAt = this.clock + 0.5;
    const list = (roji ? this.rojiSet() : this.homamaSet()).filter((g) => (this.cool[g.id] ?? 0) <= this.clock && g.id !== this.lastId && g.ok());
    if (!list.length) return;
    let sum = list.reduce((s, g) => s + g.w, 0);
    let r = Math.random() * sum;
    const g = list.find((q) => (r -= q.w) <= 0) || list[0];
    this.cool[g.id] = this.clock + g.cool;
    this.nextAt = this.clock + this.mean() * (0.6 + Math.random() * 0.8);
    this.begin(g.id);
  }

  // Gestures Homama does when Roji is the player
  rojiSet() {
    const st = this.L.state();
    const idle = () => this.idleReady();
    return [
      { id: 'kiss', w: 3, cool: 150, ok: idle },
      { id: 'hug', w: 2.2, cool: 180, ok: idle },
      { id: 'rose', w: 1.6, cool: 360, ok: idle },
      { id: 'line', w: 2.4, cool: 150, ok: () => idle() || st.holding },
      { id: 'hand', w: 1.3, cool: 300, ok: () => !st.holding && !st.inside && !!(this.L.game.setHolding || window.__roji?.toggleHands) && this.P().pos.distanceTo(this.C().pos) < 5 },
    ];
  }

  // What Roji does back when Homama is the player
  homamaSet() {
    const idle = () => this.idleReady();
    const P = this.P();
    return [
      { id: 'kiss', w: 3, cool: 200, ok: idle },
      { id: 'lean', w: 2, cool: 220, ok: idle },
      { id: 'hat', w: 1.4, cool: 420, ok: () => idle() && !P.kid.carried && P.pos.z > -86 },
    ];
  }

  begin(id) {
    const roji = this.game.playerId() === 'roji';
    const gens = {
      kiss: this.gKiss,
      hug: this.gHug,
      rose: this.gRose,
      line: this.gLine,
      hand: this.gHand,
      sunset: this.gSunset,
      lean: this.gLean,
      hat: this.gHat,
    };
    const gen = gens[id];
    if (!gen) return false;
    if (!roji && !['kiss', 'lean', 'hat'].includes(id)) return false;
    const take = !(id === 'hand' || (id === 'line' && this.L.state().holding));
    return this.start(id, gen, { take });
  }

  // ---------------------------------------------------------------- movement helpers
  vert(a) {
    const g = this.game;
    if (stepVertical(a, g.physics, this.dt, g.spaces.waterAt(a.pos.x, a.pos.z)) === 'land') a.kid.squash = 0.8;
  }

  moveTo(a, x, z, speed) {
    const g = this.game;
    a.surface = g.spaces.zoneAt(a.pos.x, a.pos.z);
    const dx = x - a.pos.x;
    const dz = z - a.pos.z;
    const d = Math.hypot(dx, dz);
    stepWalker(a, g.physics, dx, dz, clamp(d * 2.4, 0, 1), d > 2 ? speed : Math.min(speed, 3.4), 12, this.dt);
    if (a.speed > 0.35) faceTo(a, this.dt, Math.atan2(a.vel.x, a.vel.z));
    this.vert(a);
    return d;
  }

  still(a, yaw = null, rate = 9) {
    stepWalker(a, this.game.physics, 0, 0, 0, 4.6, 12, this.dt);
    if (yaw !== null) faceTo(a, this.dt, yaw, rate);
    else a.turn = 0;
    this.vert(a);
  }

  // Walk the partner to a (moving) target. Returns true on arrival, false when stuck or left behind.
  *approach(target, { speed = 6.2, tol = 0.1, giveUp = 0.4, timeout = 9, leash = 1.6 } = {}) {
    const C = this.C();
    const P = this.P();
    const start = P.pos.clone();
    let best = Infinity;
    let since = 0;
    let T = 0;
    for (;;) {
      T += this.dt;
      const tg = target();
      const d = this.moveTo(C, tg.x, tg.z, speed);
      if (d < tol) return true;
      if (d < best - 0.04) {
        best = d;
        since = 0;
      } else since += this.dt;
      if (P.pos.distanceTo(start) > leash) return false; // she walked off
      if (since > 1.1 || T > timeout) return d < giveUp;
      yield;
    }
  }

  // Keep the partner standing (facing a yaw, or a function of time) for s seconds.
  *hold(s, yaw = null) {
    let T = 0;
    while (T < s) {
      T += this.dt;
      this.still(this.C(), typeof yaw === 'function' ? yaw() : yaw);
      yield;
    }
  }

  // Where the partner should stand beside the player: on the side they already are
  sideSign() {
    const P = this.P();
    const C = this.C();
    const l = leftOf(P.yaw);
    return (C.pos.x - P.pos.x) * l.x + (C.pos.z - P.pos.z) * l.z >= 0 ? 1 : -1;
  }

  // The player glances at the partner (head turn on top of the idle look-around)
  glance(dur = 1.6, kid = this.P().kid, other = () => this.C()) {
    const self = kid === this.P().kid ? this.P() : this.C();
    return this.touch(dur, (t) => {
      const k = Math.min(1, t * 4, (dur - t) * 4);
      const want = clamp(angDiff(self.yaw, yawTo(self.pos, other().pos)), -0.7, 0.7);
      kid.head.rotation.y += want * k;
    });
  }

  giggle(a) {
    a.kid.squash = 1.14;
    this.L.sfx('giggle');
    this.L.game.fx.heartsAt(a.kid.head.localToWorld(this.tmp.set(0, 0.45, 0.1)), 3);
  }

  // Move a small object between two anchors with a little arc, then hand it over.
  *fly(obj, toObj, dur = 0.38, lift = 0.25, s0 = null, s1 = null) {
    const scene = this.game.scene;
    const from = new THREE.Vector3();
    const q0 = new THREE.Quaternion();
    obj.getWorldPosition(from);
    obj.getWorldQuaternion(q0);
    scene.attach(obj);
    const to = new THREE.Vector3();
    const q1 = new THREE.Quaternion();
    let T = 0;
    while (T < dur) {
      T = Math.min(dur, T + this.dt);
      const k = T / dur;
      toObj.getWorldPosition(to);
      toObj.getWorldQuaternion(q1);
      obj.position.lerpVectors(from, to, k);
      obj.position.y += Math.sin(k * Math.PI) * lift;
      obj.quaternion.slerpQuaternions(q0, q1, k);
      if (s0 !== null) obj.scale.setScalar(s0 + (s1 - s0) * k);
      yield;
    }
  }

  // Drop anything a gesture left loose in the world or in a kid's hands
  tidy(r, obj, owner) {
    r.cleanup.push(() => {
      if (!obj.parent || this.P().kid.carried === obj) return;
      if (owner && owner().kid.carried === obj) owner().kid.carry(null);
      else obj.removeFromParent();
    });
  }

  // ---------------------------------------------------------------- the gestures
  // A quick kiss on the cheek, then on with the walk
  *gKiss(r) {
    const P = this.P();
    const C = this.C();
    const s = this.sideSign();
    const ok = yield* this.approach(() => P.pos.clone().add(leftOf(P.yaw, 0.5 * s)));
    if (!ok) return;
    yield* this.hold(0.3, () => yawTo(C.pos, P.pos));
    C.kid.emote('kiss');
    this.L.sfx('kiss');
    this.glance(2.2);
    yield* this.hold(0.85, () => yawTo(C.pos, P.pos));
    this.giggle(P);
    if (P.id === 'homama') P.kid.emote('nod');
    yield* this.hold(0.9, () => yawTo(C.pos, P.pos));
    void r;
  }

  // A clingy hug from behind or from the side; Roji giggles
  *gHug(r) {
    const P = this.P();
    const C = this.C();
    const s = this.sideSign();
    const behind = this.hugMode ? this.hugMode === 'behind' : Math.random() < 0.5;
    // From behind he comes in at her shoulder, so his face peeks out beside hers
    const spot = () => (behind ? P.pos.clone().sub(fwdOf(P.yaw, 0.42)).add(leftOf(P.yaw, 0.36 * s)) : P.pos.clone().add(leftOf(P.yaw, 0.56 * s)));
    const ok = yield* this.approach(spot);
    if (!ok) return;
    const face = () => (behind ? P.yaw - 0.45 * s : yawTo(C.pos, P.pos));
    yield* this.hold(0.3, face);
    C.kid.emote('hug');
    this.L.sfx('hug');
    yield* this.hold(0.6, face);
    this.giggle(P);
    this.glance(1.8);
    // She leans back into it a little
    const lean = behind ? 0 : 0.1 * s;
    this.touch(1.6, (t) => {
      const k = Math.min(1, t * 3, (1.6 - t) * 3);
      P.kid.body.rotation.z += lean * k;
      P.kid.head.rotation.z += (behind ? 0 : 0.12 * s) * k;
      P.kid.head.rotation.x -= (behind ? 0.12 : 0) * k;
      if (behind) C.kid.head.rotation.z += 0.22 * s * k;
    });
    yield* this.hold(1.6, face);
    if (Math.random() < 0.5) this.L.ui.say(C.kid, pick(['Five more seconds.', 'Just one more hug.', 'Missed you. Already.']), 2200);
    yield* this.hold(0.5, face);
    void r;
  }

  // A rose from a flower bed (or from behind his back), counted in a little toast
  *gRose(r) {
    const P = this.P();
    const C = this.C();
    const g = this.game;
    const hands = P.kid.carried;
    const rose = makeRose();
    this.tidy(r, rose, () => C);
    let hidden = true;
    const st = this.L.state();
    const fl = !st.inside && this.L.nature ? this.L.nature.flowerNear(C.pos.x, C.pos.z, 6) : null;
    if (fl && this.L.nature.lineClear(C.pos.x, C.pos.z, fl.x, fl.z)) {
      // Off to the flowers first
      const dir = new THREE.Vector3(C.pos.x - fl.x, 0, C.pos.z - fl.z).normalize();
      const stand = { x: fl.x + dir.x * 0.42, z: fl.z + dir.z * 0.42 };
      let T = 0;
      let best = Infinity;
      let since = 0;
      const from = P.pos.clone();
      for (;;) {
        const d = this.moveTo(C, stand.x, stand.z, 4.6);
        T += this.dt;
        if (P.pos.distanceTo(from) > 2.5) return; // she walked on without him
        if (d < best - 0.04) {
          best = d;
          since = 0;
        } else since += this.dt;
        if (d < 0.12 || T > 4 || since > 1) break;
        yield;
      }
      yield* this.hold(0.25, yawTo(C.pos, fl));
      C.kid.emote('bow');
      yield* this.hold(0.6, yawTo(C.pos, fl));
      C.kid.carry(rose);
      this.L.sfx('pop');
      hidden = false;
      yield* this.hold(0.7, yawTo(C.pos, fl));
    } else {
      // A rose behind his back
      C.kid.body.add(rose);
      rose.position.set(0, 0.42, -0.26);
      rose.rotation.set(0.3, 0, 0);
    }
    const s = this.sideSign();
    const spot = () => P.pos.clone().add(fwdOf(P.yaw, 0.42)).add(leftOf(P.yaw, 0.42 * s));
    if (hidden) {
      this.touch(12, () => {
        if (rose.parent !== C.kid.body) return false;
        const [armL, armR] = C.kid.arms;
        armL.rotation.set(0.75, 0, -0.15);
        armR.rotation.set(0.75, 0, 0.15);
      });
    }
    const ok = yield* this.approach(spot, { speed: 5.4 });
    if (!ok) return;
    yield* this.hold(0.35, () => yawTo(C.pos, P.pos));
    if (hidden) {
      rose.position.set(0, 0, 0);
      rose.rotation.set(0, 0, 0);
      C.kid.carry(rose);
      C.kid.squash = 1.12;
      this.L.sfx('pop');
      yield* this.hold(0.55, () => yawTo(C.pos, P.pos));
    }
    // Hand it over; her hands full means it goes straight into her hair
    const n = this.countRose();
    if (hands) {
      C.kid.carry(null);
      yield* this.fly(rose, P.kid.head, 0.42, 0.15);
      rose.removeFromParent();
      this.tuck(P.kid);
      this.L.toast(`Homama tucks a rose in Roji's hair. <b>Rose number ${n}</b> from Homama.`, 3600);
    } else {
      C.kid.carry(null);
      yield* this.fly(rose, P.kid.carryAnchor, 0.36, 0.12);
      rose.position.set(0, 0, 0);
      rose.quaternion.identity();
      P.kid.carry(rose);
      this.roseHeld = { obj: rose, t: 15 + Math.random() * 6 };
      this.L.toast(`<b>Rose number ${n}</b> from Homama.`, 3200);
      // She smells it: eyes closed, the bloom to her nose, hearts
      const bloom = rose.userData.bloom;
      this.touch(1.7, (t) => {
        if (P.kid.carried !== rose) return false;
        const k = Math.min(1, t * 3, (1.7 - t) * 3);
        rose.position.set(0, 0.12 * k, 0.04 * k);
        P.kid.body.rotation.x += 0.12 * k;
        P.kid.head.rotation.x += 0.18 * k;
        if (k > 0.5) for (const e of P.kid.eyes) e.scale.y = 0.15;
        if (t > 1.68) rose.position.set(0, 0, 0);
      });
      yield* this.hold(0.6, () => yawTo(C.pos, P.pos));
      g.fx.heartsAt(bloom.getWorldPosition(this.tmp).setY(this.tmp.y + 0.2), 4);
      this.L.sfx('giggle');
    }
    yield* this.hold(0.9, () => yawTo(C.pos, P.pos));
    void st;
  }

  countRose() {
    let n = 0;
    try {
      n = (+localStorage.getItem(ROSE_KEY) || 0) + 1;
      localStorage.setItem(ROSE_KEY, String(n));
    } catch {
      n = 1;
    }
    return n;
  }

  // A rose in Roji's hair, above her ear on the side away from her bow
  tuck(kid) {
    if (this.hairRose) this.hairRose.obj.removeFromParent();
    const obj = makeRose({ hair: true });
    obj.scale.setScalar(1.6);
    this.hairRose = { obj, kid, t: 300 };
    this.placeHair();
    this.L.sfx('sparkle');
  }

  placeHair() {
    const h = this.hairRose;
    if (!h) return;
    if (h.obj.parent !== h.kid.head) {
      h.kid.head.add(h.obj);
      h.obj.position.set(0.24, 0.5, 0.15);
      h.obj.rotation.set(0.2, 0.5, -0.7);
    }
  }

  // Holding her hand for a while, all by himself
  *gHand() {
    const P = this.P();
    const C = this.C();
    if (this.L.game.setHolding) this.L.game.setHolding(true);
    else window.__roji.toggleHands();
    if (!this.L.state().holding) return;
    this.handOwned = { t: 28 + Math.random() * 20 };
    this.L.toast(pick(["Homama takes Roji's hand.", "Homama reaches for Roji's hand. She lets him.", 'Hand in hand. Homama will not let go for a while.']), 2600);
    this.glance(1.4, P.kid, () => C);
    yield;
  }

  // A sweet line in a bubble; he stops to say it
  *gLine(r) {
    const P = this.P();
    const C = this.C();
    const line = pick(LINES_H.filter((l) => l !== this.lastLine));
    this.lastLine = line;
    if (!r.token) {
      this.L.ui.say(C.kid, line, 3600);
      this.glance(1.6);
      yield;
      return;
    }
    yield* this.hold(0.35, () => yawTo(C.pos, P.pos));
    this.L.ui.say(C.kid, line, 3600);
    this.glance(2.2);
    let T = 0;
    while (T < 3.4 && P.pos.distanceTo(C.pos) < 4) {
      T += this.dt;
      this.still(C, yawTo(C.pos, P.pos));
      if (T > 1.4 && T - this.dt <= 1.4) this.L.game.fx.heartsAt(P.kid.head.localToWorld(this.tmp.set(0, 0.5, 0)), 2);
      yield;
    }
  }

  // At sunset he points at the sky and they watch it together for a moment
  *gSunset(r) {
    const P = this.P();
    const C = this.C();
    const g = this.game;
    // The sun goes down in the west (toward the camera's left); they face that way, a little toward the
    // camera, so they stand side by side in view rather than one behind the other
    const yawS = -0.62;
    const s = (() => {
      const l = leftOf(yawS);
      return (C.pos.x - P.pos.x) * l.x + (C.pos.z - P.pos.z) * l.z >= 0 ? 1 : -1;
    })();
    const ok = yield* this.approach(() => P.pos.clone().add(leftOf(yawS, 0.62 * s)));
    if (!ok) return;
    this.L.ui.say(C.kid, pick(SUNSET_LINES), 3400);
    // Both turn toward the sun
    let T = 0;
    const y0 = P.yaw;
    const turn = angDiff(y0, yawS);
    while (T < 1.1) {
      T += this.dt;
      if (P.speed > 0.6) return; // she walked on
      const e = Math.min(1, T / 1.0);
      P.yaw = y0 + turn * e * e * (3 - 2 * e);
      P.kid.root.rotation.y = P.yaw;
      this.still(C, yawS, 6);
      this.pointUp(C, Math.min(1, T * 2), s);
      yield;
    }
    const api = this.L.api;
    const mid = P.pos.clone().add(C.pos).multiplyScalar(0.5);
    this.myActivity = api.activity({
      label: 'Keep walking',
      seats: [
        { who: 'player', x: P.pos.x, z: P.pos.z, y: P.y, yaw: P.yaw, pose: 'stand', hands: P.kid.carried ? 'carry' : null },
        { who: 'partner', x: C.pos.x, z: C.pos.z, y: C.y, yaw: C.yaw, pose: 'stand', hands: C.kid.carried ? 'carry' : null },
      ],
      focus: { x: mid.x, z: mid.z, y: 1.15, zoom: 0.56 },
      music: 0.6,
    });
    T = 0;
    let hearts = 0;
    while (T < 8 && g.activities.current === this.myActivity) {
      T += this.dt;
      const point = T < 2.8 ? 1 : Math.max(0, 1 - (T - 2.8) * 2);
      if (point > 0) this.pointUp(C, point, s);
      // She rests her head on his shoulder
      const k = clamp((T - 2.6) * 1.5, 0, 1) * clamp((7.6 - T) * 2, 0, 1);
      P.kid.body.rotation.z += -0.16 * s * k;
      P.kid.head.rotation.z += -0.3 * s * k;
      C.kid.head.rotation.z += 0.14 * s * k;
      if (T > 3 + hearts * 1.6 && hearts < 3) {
        hearts++;
        g.fx.heartsAt(mid.clone().setY(P.y + 1.9), 2);
      }
      yield;
    }
    if (g.activities.current === this.myActivity) g.activities.end(true);
    this.myActivity = null;
    void r;
  }

  // Point up at the sky with the arm away from the other kid (side: +1 when they stand on his right)
  pointUp(a, k, side = 1) {
    const arm = a.kid.arms[side > 0 ? 0 : 1];
    const z = 2.75 * (side > 0 ? 1 : -1);
    arm.rotation.x += (0.35 - arm.rotation.x) * k;
    arm.rotation.y += (0 - arm.rotation.y) * k;
    arm.rotation.z += (z - arm.rotation.z) * k;
  }

  // Roji: a kiss is the same; she also leans on his shoulder, and borrows him for a hat
  *gLean(r) {
    const P = this.P();
    const C = this.C();
    const s = this.sideSign();
    const ok = yield* this.approach(() => P.pos.clone().add(leftOf(P.yaw, 0.58 * s)));
    if (!ok) return;
    yield* this.hold(0.4, () => P.yaw);
    // C stands on P's side s; leaning toward P means tilting toward her own -s side
    let T = 0;
    let hearted = false;
    while (T < 3.4) {
      T += this.dt;
      this.still(C, P.yaw);
      const k = Math.min(1, T * 2.2, (3.4 - T) * 2.2);
      C.kid.body.rotation.z += -0.13 * s * k;
      C.kid.head.rotation.z += -0.26 * s * k;
      P.kid.head.rotation.z += 0.1 * s * k;
      if (!hearted && T > 1) {
        hearted = true;
        this.game.fx.heartsAt(P.pos.clone().add(C.pos).multiplyScalar(0.5).setY(P.y + 1.8), 3);
        this.L.sfx('giggle');
      }
      yield;
    }
    void r;
  }

  *gHat(r) {
    const P = this.P();
    const C = this.C();
    const s = this.sideSign();
    const ok = yield* this.approach(() => P.pos.clone().add(fwdOf(P.yaw, 0.3)).add(leftOf(P.yaw, 0.5 * s)));
    if (!ok) return;
    const hat = makeSunHat();
    hat.scale.setScalar(0.55);
    r.cleanup.push(() => {
      if (C.kid.carried === hat) C.kid.carry(null);
      hat.removeFromParent();
    });
    yield* this.hold(0.3, () => yawTo(C.pos, P.pos));
    C.kid.carry(hat);
    hat.position.set(0, 0.12, 0.05);
    this.L.sfx('pop');
    yield* this.hold(0.5, () => yawTo(C.pos, P.pos));
    // On his head...
    C.kid.carry(null);
    const anchor = new THREE.Object3D();
    P.kid.head.add(anchor);
    anchor.position.set(...HAT_POS);
    r.cleanup.push(() => anchor.removeFromParent());
    yield* this.fly(hat, anchor, 0.34, 0.3, 0.55, 1);
    hat.scale.setScalar(1);
    anchor.add(hat);
    hat.position.set(0, 0, 0);
    hat.quaternion.identity();
    hat.rotation.z = 0.12;
    this.giggle(C);
    this.L.ui.say(C.kid, pick(['It suits you!', 'Cutest engineer ever.', 'Now you match me.']), 2000);
    yield* this.hold(2.1, () => yawTo(C.pos, P.pos));
    // ...and back on hers
    const mine = new THREE.Object3D();
    C.kid.head.add(mine);
    mine.position.set(...HAT_POS);
    r.cleanup.push(() => mine.removeFromParent());
    yield* this.fly(hat, mine, 0.3, 0.25);
    mine.add(hat);
    hat.position.set(0, 0, 0);
    hat.quaternion.identity();
    hat.rotation.z = -0.1;
    C.kid.emote('spin');
    this.L.ui.say(C.kid, 'Mine now.', 1800);
    this.L.sfx('giggle');
    P.kid.emote('nod');
    yield* this.hold(2.4, () => yawTo(C.pos, P.pos));
    this.game.fx.puff(C.pos);
    void r;
  }

  // ---------------------------------------------------------------- things that last after a gesture
  keepers(dt) {
    const st = this.L.state();
    // The rose she is carrying goes into her hair after a while, or as soon as she sits, rides or plays
    const rh = this.roseHeld;
    if (rh) {
      const roji = this.game.actors.roji;
      if (roji.kid.carried !== rh.obj) this.roseHeld = null;
      else {
        if (st.free) rh.t -= dt;
        const busy = !!st.activity || !!st.mount || !st.free;
        if (rh.t <= 0 || busy) {
          roji.kid.carry(null);
          this.roseHeld = null;
          this.tuck(roji.kid);
          if (!busy) roji.kid.squash = 1.1;
        }
      }
    }
    const h = this.hairRose;
    if (h) {
      h.t -= dt;
      if (h.t <= 0) {
        h.obj.removeFromParent();
        this.hairRose = null;
      } else this.placeHair(); // a new look rebuilds the head
    }
    // He lets go of her hand after a while, unless the player took over the hand holding
    const ho = this.handOwned;
    if (ho) {
      if (!st.holding) this.handOwned = null;
      else if (st.free) {
        ho.t -= dt;
        if (ho.t <= 0) {
          this.handOwned = null;
          if (this.L.game.setHolding) this.L.game.setHolding(false);
          else window.__roji?.toggleHands?.();
        }
      }
    }
  }

  dispose() {
    this.stop();
    this.over.length = 0;
    if (this.roseHeld) {
      const roji = this.game.actors.roji;
      if (roji.kid.carried === this.roseHeld.obj) roji.kid.carry(null);
    }
    this.hairRose?.obj.removeFromParent();
  }
}
