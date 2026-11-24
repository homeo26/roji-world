// Dances for two, and the little extras on every dance move.
//
// When the player starts a dance marked `duo` in EMOTES (dabke, slow dance, salsa) and the partner is
// close, the partner walks to their place (side by side for dabke, facing each other for the slow
// dance and salsa), joins in time with the player, and the slow dance turns slowly in a circle.
// If the partner cannot get there, the player just dances alone. game.partnerBusy is held while the
// partner is moved here, and always given back.
//
// Each dance move counts its hits in kid.emoteBeat (a stamp, a beep, a landing); this adds a dust
// puff, a sparkle or a sound for them, so the animation code stays free of effects.
import { EMOTES } from '../../kid.js';
import { stepWalker, faceTo, RADIUS } from '../../engine/movement.js';

const BUSY = 'duet-dance';
const GAP = { dabke: 0.64, slow: 0.62, salsa: 0.8 };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class Duets {
  // L: { THREE, game, state, sparkles, sounds }
  constructor(L) {
    this.L = L;
    this.cur = null;
    this.beats = new Map();
    this.v = new L.THREE.Vector3();
    this.w = new L.THREE.Vector3();
  }

  get P() {
    const g = this.L.game;
    return g.actors[g.playerId()];
  }

  get C() {
    const g = this.L.game;
    return g.actors[g.playerId() === 'roji' ? 'homama' : 'roji'];
  }

  // Is a point free for a kid to stand on (nothing pushes it away)?
  free(x, z, feet) {
    const p = this.w.set(x, 0, z);
    const before = p.clone();
    this.L.game.physics.resolve(p, RADIUS, this.v.set(0, 0, 0), { feet });
    return p.distanceTo(before) < 0.05;
  }

  tick(dt, t) {
    const P = this.P;
    const C = this.C;
    if (!P || !C) return;
    this.fx(P, true);
    this.fx(C, false);
    const pk = P.kid;
    const type = pk.emoteType;
    const cur = this.cur;
    if (cur) {
      if (type !== cur.type || pk.emoteTime + 1e-4 < cur.lastT || pk.pose !== 'stand') {
        this.stop();
        return this.tick(0, t);
      }
      cur.lastT = pk.emoteTime;
      cur.t += dt;
      if (cur.phase === 'walk') this.walk(dt);
      else this.dance(dt, t);
      return;
    }
    if (!type || !EMOTES[type]?.duo || pk.emoteTime > 0.6 || this.started === pk.emoteTime) return;
    this.started = pk.emoteTime;
    this.start(type);
  }

  start(type) {
    const g = this.L.game;
    const P = this.P;
    const C = this.C;
    const st = this.L.state();
    if (g.partnerBusy || st.mount || st.activity || C.seated || C.kid.pose !== 'stand' || P.mode === 'swim' || C.mode === 'swim') return;
    if (Math.abs(C.y - P.y) > 0.25 || C.pos.distanceTo(P.pos) > 9) return;
    const mode = EMOTES[type].duo;
    const gap = GAP[type] || 0.64;
    // Along the screen's left-right axis so the camera sees both faces; the partner's side first
    let sx = Math.sign(C.pos.x - P.pos.x) || 1;
    if (!this.free(P.pos.x + sx * gap, P.pos.z, P.y)) sx = -sx;
    if (!this.free(P.pos.x + sx * gap, P.pos.z, P.y)) return;
    const face = mode === 'face';
    const pg = this.L.game.looks[g.playerId()]?.gender;
    const cg = this.L.game.looks[C.id]?.gender;
    const pHold = pg === 'girl' && cg !== 'girl' ? 'shoulders' : 'waist';
    this.cur = {
      type,
      face,
      sx,
      gap,
      phase: 'walk',
      t: 0,
      lastT: P.kid.emoteTime,
      target: new this.L.THREE.Vector3(P.pos.x + sx * gap, 0, P.pos.z),
      mid: new this.L.THREE.Vector3(P.pos.x + (sx * gap) / 2, 0, P.pos.z),
      ang: sx > 0 ? 0 : Math.PI,
      pYaw: face ? Math.atan2(sx, 0) : 0,
      cYaw: face ? Math.atan2(-sx, 0) : 0,
      pDuet: face ? { mirror: 1, hold: pHold, lead: pHold === 'waist' } : { side: sx, lead: true },
      cDuet: face ? { mirror: -1, hold: pHold === 'waist' ? 'shoulders' : 'waist', lead: pHold !== 'waist' } : { side: -sx, lead: false },
      hearts: 0,
    };
    g.partnerBusy = BUSY;
  }

  hold(a, yaw, dt, rate = 10) {
    a.yaw += wrap(yaw - a.yaw) * (1 - Math.exp(-rate * dt));
    a.kid.root.rotation.y = a.yaw;
  }

  walk(dt) {
    const cur = this.cur;
    const P = this.P;
    const C = this.C;
    const g = this.L.game;
    this.hold(P, cur.pYaw, dt);
    const dx = cur.target.x - C.pos.x;
    const dz = cur.target.z - C.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.08 || (cur.t > 2.2 && d < 0.45)) {
      C.pos.set(cur.target.x, 0, cur.target.z);
      C.vel.set(0, 0, 0);
      C.speed = 0;
      C.yaw = cur.cYaw;
      cur.phase = 'dance';
      return;
    }
    if (cur.t > 3.5) {
      // Could not get there: the partner joins in on their own
      this.stop();
      if (C.kid.pose === 'stand') C.kid.emote(cur.type);
      return;
    }
    stepWalker(C, g.physics, dx, dz, Math.min(1, 0.35 + d * 2), d > 2 ? 6.5 : 3.8, 14, dt);
    if (C.speed > 0.2) faceTo(C, dt, Math.atan2(C.vel.x, C.vel.z));
  }

  dance(dt, t) {
    const cur = this.cur;
    const P = this.P;
    const C = this.C;
    const pk = P.kid;
    const ck = C.kid;
    if (ck.pose !== 'stand') return this.stop();
    if (ck.emoteType !== cur.type) ck.emote(cur.type);
    ck.emoteTime = pk.emoteTime;
    pk.duet = cur.pDuet;
    ck.duet = cur.cDuet;
    C.vel.set(0, 0, 0);
    C.speed = 0;
    P.vel.set(0, 0, 0);
    if (cur.type === 'slow') {
      // Turn slowly round the middle; stop turning if either would bump into something
      const next = cur.ang + 0.42 * dt;
      const h = cur.gap / 2;
      const px = cur.mid.x - Math.cos(next) * h;
      const pz = cur.mid.z + Math.sin(next) * h;
      const cx = cur.mid.x + Math.cos(next) * h;
      const cz = cur.mid.z - Math.sin(next) * h;
      if (this.free(px, pz, P.y) && this.free(cx, cz, C.y)) {
        cur.ang = next;
        P.pos.set(px, 0, pz);
        C.pos.set(cx, 0, cz);
      }
      cur.pYaw = Math.atan2(C.pos.x - P.pos.x, C.pos.z - P.pos.z);
      cur.cYaw = cur.pYaw + Math.PI;
      cur.hearts -= dt;
      if (cur.hearts <= 0 && pk.emoteTime > 1) {
        cur.hearts = 1.8;
        this.L.game.fx.heartsAt(this.w.set(cur.mid.x, P.y + 1.75, cur.mid.z), 2);
      }
    }
    for (const [a, yaw] of [[P, cur.pYaw], [C, cur.cYaw]]) {
      this.hold(a, yaw, dt, 16);
      a.kid.root.position.set(a.pos.x, a.y, a.pos.z);
    }
  }

  stop() {
    const cur = this.cur;
    this.cur = null;
    const g = this.L.game;
    const P = this.P;
    const C = this.C;
    if (P) P.kid.duet = null;
    if (C) {
      C.kid.duet = null;
      if (cur?.phase === 'dance' && C.kid.emoteType === cur.type) C.kid.cancelEmote();
    }
    if (g.partnerBusy === BUSY) g.partnerBusy = null;
  }

  // A puff, a sparkle or a sound on each hit of a dance move
  fx(a, mine) {
    const k = a.kid;
    const n = k.emoteBeat || 0;
    const last = this.beats.get(k);
    this.beats.set(k, n);
    if (last === undefined || n === last || !k.emoteType) return;
    const { sparkles, sounds } = this.L;
    const fx = this.L.game.fx;
    const at = (y) => this.w.set(a.pos.x, a.y + y, a.pos.z);
    switch (k.beatKind) {
      case 'stamp':
        fx.puff(a.pos);
        fx.puff(a.pos);
        if (mine) sounds.stamp();
        break;
      case 'land':
        fx.puff(a.pos);
        if (mine) sounds.tap();
        break;
      case 'beep':
        if (mine) sounds.beep(n);
        if (n % 4 === 0) sparkles.burst(at(1.25), ['#7fd3ff', '#ffffff'], 4, 0.8);
        break;
      case 'shake':
        if (mine) sounds.shake();
        break;
      case 'sparkle':
      case 'pop':
        sparkles.burst(at(1.0), ['#ffd166', '#ffffff', '#ff8fb1', '#b9a6ff'], 10, 1.4);
        if (mine) sounds.twinkle();
        break;
      case 'shimmer':
        sparkles.burst(at(0.9), ['#ffd166', '#fff3c4'], 4, 0.9);
        break;
      case 'twinkle':
        for (const i of [0, 1]) sparkles.burst(k.handWorld(i, this.v), ['#ffd166', '#ffffff', '#ff8fb1'], 3, 0.7);
        if (mine) sounds.twinkle();
        break;
    }
  }
}
