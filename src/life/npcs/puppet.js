// How a person a place built can react, depending on how the place built them:
//   live:  the place animates the kid every frame (the zoo keeper): emotes play, we only turn them.
//   full:  a whole kid nobody animates: Kid.update runs while it reacts, then every part goes back
//          exactly where the place left it.
//   arm:   baked for speed but the right arm is its own part (a nurse who waves): the arm waves and
//          high-fives, the body hops.
//   rigid: baked into one piece under its root: it hops, sways and turns.
//   still: merged into the room itself: nothing can move, so it only gets a bubble and sparkles.
// Moves: 'wave' | 'highfive' | 'handshake' | 'nod' | 'cheer' | 'hug' | 'hop' | 'happy' | a dance id.

const DANCES = new Set(['dance', 'spin', 'dabke', 'slow', 'twirl', 'robot', 'salsa', 'moonwalk', 'hop', 'shimmy', 'ballet', 'jazz']);
const EMOTE_OF = { wave: 'wave', highfive: 'highfive', handshake: 'handshake', nod: 'nod', cheer: 'cheer', hug: 'hug' };
const bump = (x, a, b) => (x <= a || x >= b ? 0 : Math.sin((Math.PI * (x - a)) / (b - a)));
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function meshCount(o) {
  let n = 0;
  o?.traverse((q) => {
    if (q.isMesh) n++;
  });
  return n;
}

export class Puppet {
  constructor(THREE, kid) {
    this.THREE = THREE;
    this.kid = kid;
    this.root = kid.root;
    this.lastPhase = kid.walkPhase;
    this.live = false;
    this.active = false;
    this.move = null;
    this.t = 0;
    this.dur = 0;
    this.yawOff = 0;
    this.faceAt = null;
    this.tmpV = new THREE.Vector3();
    this.tmpQ = new THREE.Quaternion();
    this.tmpE = new THREE.Euler();
    this.detect();
  }

  detect() {
    const k = this.kid;
    const body = meshCount(k.body);
    const arm = meshCount(k.arms?.[1]);
    const all = meshCount(this.root);
    this.mode = this.live ? 'live' : body >= 20 ? 'full' : arm > 0 ? 'arm' : all > 0 ? 'rigid' : 'still';
    this.seated = k.pose !== 'stand';
  }

  // The place animates this kid itself when its walk phase moves between checks.
  checkLive() {
    if (this.active) return;
    if (this.kid.walkPhase !== this.lastPhase && meshCount(this.root) > 0) {
      this.live = true;
      this.mode = 'live';
    }
    this.lastPhase = this.kid.walkPhase;
  }

  get canTurn() {
    return !this.seated && this.mode !== 'still';
  }

  begin() {
    if (this.active) return;
    this.active = true;
    this.ending = -1;
    this.yawOff = 0;
    const r = this.root;
    this.base = { pos: r.position.clone(), rot: r.rotation.clone(), scale: r.scale.clone() };
    if (this.mode === 'full') {
      this.parts = [];
      r.traverse((o) => {
        if (o !== r) this.parts.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]);
      });
      this.kidState = { pose: this.kid.pose, hands: this.kid.hands, emoteType: this.kid.emoteType };
    }
    if (this.mode === 'arm') this.armBase = this.kid.arms[1].rotation.clone();
  }

  // Start a move for dur seconds (a dance or emote keeps its own length on full and live kids).
  play(move, dur = 1.6) {
    if (!this.active) this.begin();
    this.move = move;
    this.t = 0;
    this.dur = dur;
    this.ending = -1;
    const k = this.kid;
    if ((this.mode === 'full' || this.mode === 'live') && !this.seated) {
      const e = EMOTE_OF[move] || (DANCES.has(move) ? move : move === 'happy' ? 'cheer' : null);
      if (e) k.emote(e);
    }
  }

  // Turn toward a world position (or null to turn back).
  face(pos) {
    if (!this.active) this.begin();
    this.faceAt = pos ? pos.clone() : null;
  }

  // Let go: turn back, settle and put everything back as the place had it.
  end() {
    if (!this.active || this.ending >= 0) return;
    this.ending = 0;
    this.faceAt = null;
    this.move = null;
  }

  worldPos(out) {
    return this.root.getWorldPosition(out);
  }

  update(dt, t) {
    if (!this.active) return;
    const r = this.root;
    const k = this.kid;
    const live = this.mode === 'live';
    if (this.mode === 'still') {
      if (this.ending >= 0) this.active = false;
      return;
    }
    if (!live) {
      r.position.copy(this.base.pos);
      r.rotation.copy(this.base.rot);
      r.scale.copy(this.base.scale);
    } else if (this.lastYaw !== undefined && r.rotation.y === this.lastYaw) {
      // A live kid's place sets its root every frame; if it did not this frame, take off last frame's turn
      r.rotation.y -= this.lastOff;
    }
    // Facing, in the parent's frame
    let want = 0;
    if (this.faceAt && this.canTurn) {
      const p = r.getWorldPosition(this.tmpV);
      const yawW = Math.atan2(this.faceAt.x - p.x, this.faceAt.z - p.z);
      r.parent?.getWorldQuaternion(this.tmpQ);
      const parentYaw = r.parent ? this.tmpE.setFromQuaternion(this.tmpQ, 'YXZ').y : 0;
      const baseYaw = live ? r.rotation.y : this.base.rot.y;
      want = wrap(yawW - parentYaw - baseYaw);
      if (this.mode !== 'full' && !live) want = Math.max(-1.3, Math.min(1.3, want));
    }
    this.yawOff += wrap(want - this.yawOff) * (1 - Math.exp(-7 * dt));
    r.rotation.y += this.yawOff;
    this.lastYaw = r.rotation.y;
    this.lastOff = this.yawOff;

    // The move
    const m = this.move;
    if (m) this.t += dt;
    const u = this.t;
    const env = m ? Math.min(1, u * 5, Math.max(0, this.dur - u) * 5) : 0;
    const lift = this.seated ? 0.45 : 1;
    let y = 0;
    let rz = 0;
    let rx = 0;
    let ry = 0;
    const animated = (this.mode === 'full' || live) && !this.seated;
    if (m && !animated) {
      if (m === 'hop' || m === 'cheer') y = Math.abs(Math.sin(u * Math.PI * 2.6)) * 0.13 * env;
      else if (m === 'happy' || m === 'wave') {
        y = bump(u, 0.05, 0.45) * 0.1;
        rz = Math.sin(u * 9) * 0.05 * env;
      } else if (m === 'highfive') y = bump(u, 0.3, 0.62) * 0.1;
      else if (m === 'nod' || m === 'handshake') rx = Math.max(0, Math.sin(u * 8)) * 0.07 * env;
      else if (m === 'hug') rz = Math.sin(u * 2.6) * 0.06 * env;
      else if (DANCES.has(m)) {
        y = Math.abs(Math.sin(u * Math.PI * 2)) * 0.1 * env;
        rz = Math.sin(u * Math.PI * 2) * 0.09 * env;
        if (!this.seated) ry = Math.sin(u * Math.PI) * 0.3 * env;
      }
      r.position.y += y * lift;
      r.rotation.z += rz * lift;
      r.rotation.x += rx * lift;
      r.rotation.y += ry;
    }
    if (this.mode === 'full') k.update(dt, t, 0, 0, 0);
    if (this.mode === 'arm') this.armMove(m, u, env, t);
    if (m && u >= this.dur) this.move = null;

    if (this.ending >= 0) {
      this.ending += dt;
      if (this.ending > 0.55 && Math.abs(this.yawOff) < 0.03) this.restore();
    }
  }

  armMove(m, u, env, t) {
    const a = this.kid.arms[1];
    const b = this.armBase;
    let tx = b.x;
    let tz = b.z;
    if (m === 'wave' || m === 'cheer' || (m && DANCES.has(m))) {
      tx = 0;
      tz = -(2.4 + Math.sin(t * 14) * 0.3);
    } else if (m === 'highfive') {
      const up = smooth(u / 0.32);
      const slap = smooth((u - 0.32) / 0.14);
      tx = -0.3 * up + 1.2 * slap;
      tz = -0.18 - 2.5 * up;
    } else if (m === 'handshake') {
      tx = -1.2 + Math.sin(u * 18) * 0.12 * bump(u, 0.35, 1.25);
      tz = 0.1;
    }
    a.rotation.set(b.x + (tx - b.x) * env, b.y * (1 - env), b.z + (tz - b.z) * env);
  }

  restore() {
    const r = this.root;
    if (this.mode !== 'live') {
      r.position.copy(this.base.pos);
      r.rotation.copy(this.base.rot);
      r.scale.copy(this.base.scale);
    } else if (r.rotation.y === this.lastYaw) r.rotation.y -= this.lastOff;
    this.lastYaw = undefined;
    if (this.mode === 'full') {
      for (const [o, p, q, s] of this.parts) {
        o.position.copy(p);
        o.quaternion.copy(q);
        o.scale.copy(s);
      }
      Object.assign(this.kid, this.kidState);
      this.kid.emoteType = null;
      this.parts = null;
    }
    if (this.mode === 'arm') this.kid.arms[1].rotation.copy(this.armBase);
    this.active = false;
    this.ending = -1;
  }
}
