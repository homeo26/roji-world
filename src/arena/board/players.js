import * as THREE from 'three';
import { damp, clamp, lerp, easeInOut, easeOutBack } from '../../util.js';
import { bakeLiveKid, thoughtBubble } from './kit.js';

// A board-game player: Roji or Homama on a stool (or standing), with seated gestures that
// layer on top of Kid.update (emotes only play while standing), a turn badge and a thought bubble.

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ONE_SHOT = { reach: 0.6, reachUp: 0.7, cheer: 1.3, clap: 1.2, gasp: 1.1, heart: 1.8, sad: 1.4, wave: 1.5, nod: 0.9, pump: 0.42 };

export class Player {
  // seat: { x, y, z, yaw } (y = root height while sitting), stand: { x, z, yaw }, sitting: start seated
  constructor(ctx, id, { seat, stand, sitting = true, keepHands = false }) {
    this.ctx = ctx;
    this.id = id;
    this.look = ctx.looks[id];
    this.name = this.look.name;
    const kid = ctx.makeKid(id);
    this.kid = kid;
    this.hands = kid.arms.map((a) => a.children.find((c) => c.isMesh && Math.abs(c.position.y + 0.28) < 0.01));
    bakeLiveKid(kid, keepHands ? this.hands : []);
    kid.onEmoteFx = () => ctx.fx.heartsAt(kid.head.localToWorld(V(0, 0.75, 0)), 4);
    ctx.scene.add(kid.root);
    this.seat = seat;
    this.stand = stand || { x: seat.x, z: seat.z, yaw: seat.yaw };
    // The arm nearer the camera does the reaching and thinking
    this.near = Math.sin(this.stand.yaw) > 0 ? 1 : 0;
    this.inward = this.near === 1 ? 1 : -1;
    this.mode = sitting ? 'sit' : 'stand';
    this.trans = null;
    this.g = null; // one-shot gesture { name, t, dur }
    this.thinkK = 0;
    this.thinking = false;
    this.coverK = 0;
    this.covering = false; // hands over the eyes (no peeking)
    this.watchK = 0;
    this.queued = null;
    this.armOverride = null; // fn(kid, t) for game-specific arm poses (rock paper scissors)
    this.bubble = thoughtBubble();
    ctx.scene.add(this.bubble.group);
    this.badge = new THREE.Group();
    this.badgeK = 0;
    this.badgeOn = false;
    ctx.scene.add(this.badge);
    this.place(sitting ? 'sit' : 'stand');
  }

  place(mode) {
    const k = this.kid;
    if (mode === 'sit') {
      k.root.position.set(this.seat.x, this.seat.y, this.seat.z);
      k.root.rotation.y = this.seat.yaw;
      k.pose = 'sit';
    } else {
      k.root.position.set(this.stand.x, 0, this.stand.z);
      k.root.rotation.y = this.stand.yaw;
      k.pose = 'stand';
    }
    this.mode = mode;
  }

  get sitting() {
    return this.mode === 'sit';
  }

  gesture(name) {
    this.g = { name, t: 0, dur: ONE_SHOT[name] || 1 };
    if (name === 'heart') setTimeout(() => this.kid.onEmoteFx?.('heart', this.kid), 450);
  }

  think(on) {
    this.thinking = on;
    this.bubble.show(on && this.showBubble !== false);
  }

  setBadge(obj) {
    this.badge.clear();
    if (obj) this.badge.add(obj);
  }

  showBadge(on) {
    this.badgeOn = on;
  }

  // Hop off the stool (or onto the spot) and then play a real emote.
  standUp(emote = null) {
    this.queued = emote;
    if (this.mode === 'sit') this.trans = { t: 0, up: true };
    else if (emote && !this.trans) this.playQueued();
  }

  sitDown() {
    if (this.mode !== 'sit') this.trans = { t: 0, up: false };
  }

  playQueued() {
    if (!this.queued) return;
    this.kid.emote(this.queued);
    if (this.queued === 'dance') this.kid.danceLoop = false;
    this.queued = null;
  }

  headTop(out = V()) {
    return out.copy(this.kid.root.position).add(V(0, 1.45, 0));
  }

  update(dt, t) {
    const k = this.kid;
    // Stool hop
    if (this.trans) {
      const tr = this.trans;
      tr.t = Math.min(1, tr.t + dt / 0.5);
      const p = easeInOut(tr.t);
      const a = tr.up ? this.seat : { ...this.stand, y: 0 };
      const b = tr.up ? { ...this.stand, y: 0 } : this.seat;
      k.root.position.set(lerp(a.x, b.x, p), lerp(a.y, b.y, p) + Math.sin(p * Math.PI) * 0.22, lerp(a.z, b.z, p));
      k.root.rotation.y = lerp(a.yaw, b.yaw, p);
      k.pose = (tr.up ? p > 0.45 : p < 0.55) ? 'stand' : 'sit';
      if (tr.t >= 1) {
        this.trans = null;
        this.place(tr.up ? 'stand' : 'sit');
        k.squash = 0.82;
        this.ctx.sound?.land?.();
        if (tr.up) this.playQueued();
      }
    }
    k.update(dt, t, 0, this.trans ? Math.sin(easeInOut(this.trans.t) * Math.PI) * 0.22 : 0, 0);

    const [L, R] = k.arms;
    const A = k.arms[this.near];
    const O = k.arms[1 - this.near];
    const B = k.body;
    const H = k.head;
    const ins = this.inward;

    // Thinking: hand on the chin, head tilted, gentle sway (blended in and out)
    this.thinkK = damp(this.thinkK, this.thinking && !this.g ? 1 : 0, 8, dt);
    if (this.thinkK > 0.01) {
      const q = this.thinkK;
      A.rotation.x = lerp(A.rotation.x, -2.25 + Math.sin(t * 2.1) * 0.06, q);
      A.rotation.y = lerp(A.rotation.y, 0, q);
      A.rotation.z = lerp(A.rotation.z, 0.62 * ins, q);
      H.rotation.z += (0.14 * -ins + Math.sin(t * 1.4) * 0.05) * q;
      H.rotation.x += 0.08 * q;
      B.rotation.z += Math.sin(t * 1.4) * 0.03 * q;
    }

    // No peeking: both hands over the eyes
    this.coverK = damp(this.coverK, this.covering ? 1 : 0, 9, dt);
    if (this.coverK > 0.01) {
      const q = this.coverK;
      L.rotation.x = lerp(L.rotation.x, -2.6, q);
      L.rotation.z = lerp(L.rotation.z, -0.5, q);
      R.rotation.x = lerp(R.rotation.x, -2.6, q);
      R.rotation.z = lerp(R.rotation.z, 0.5, q);
      H.rotation.x += 0.12 * q;
      H.rotation.y += Math.sin(t * 3) * 0.08 * q;
    }

    // One-shot gestures
    if (this.g) {
      const g = this.g;
      g.t += dt;
      const T = g.t;
      const e = clamp(Math.min(T * 7, (g.dur - T) * 6), 0, 1);
      const set = (arm, x, y, z) => {
        arm.rotation.x = lerp(arm.rotation.x, x, e);
        arm.rotation.y = lerp(arm.rotation.y, y, e);
        arm.rotation.z = lerp(arm.rotation.z, z, e);
      };
      switch (g.name) {
        case 'reach': {
          const s = Math.sin(clamp(T / g.dur, 0, 1) * Math.PI);
          A.rotation.x = lerp(A.rotation.x, -1.5, s);
          A.rotation.z = lerp(A.rotation.z, 0.08 * ins, s);
          B.rotation.x += 0.12 * s;
          break;
        }
        case 'reachUp': {
          const s = Math.sin(clamp(T / g.dur, 0, 1) * Math.PI);
          A.rotation.x = lerp(A.rotation.x, -2.35, s);
          A.rotation.z = lerp(A.rotation.z, 0.05 * ins, s);
          B.rotation.x += 0.05 * s;
          break;
        }
        case 'cheer': {
          const w = Math.sin(T * 16) * 0.25;
          set(L, -0.15, 0, 2.55 + w);
          set(R, -0.15, 0, -2.55 - w);
          B.position.y += Math.abs(Math.sin(T * 9)) * 0.07 * e;
          H.rotation.x -= 0.15 * e;
          break;
        }
        case 'clap': {
          const s = Math.abs(Math.sin(T * 13));
          set(L, -1.25, 0, -0.3 + s * 0.25);
          set(R, -1.25, 0, 0.3 - s * 0.25);
          B.position.y += Math.abs(Math.sin(T * 6.5)) * 0.03 * e;
          break;
        }
        case 'gasp': {
          set(L, -2.3, 0, -0.62);
          set(R, -2.3, 0, 0.62);
          H.rotation.x -= 0.12 * e;
          B.rotation.x -= 0.06 * e;
          break;
        }
        case 'heart': {
          set(L, -0.35, 0, 2.63);
          set(R, -0.35, 0, -2.63);
          B.rotation.z += Math.sin(T * 3) * 0.06 * e;
          break;
        }
        case 'sad': {
          set(L, -0.35, 0, 0.05);
          set(R, -0.35, 0, -0.05);
          H.rotation.x += 0.22 * e;
          H.rotation.z += Math.sin(T * 9) * 0.08 * e;
          B.rotation.x += 0.05 * e;
          break;
        }
        case 'wave': {
          const w = Math.sin(T * 14) * 0.3;
          set(A, 0, 0, -ins * (2.5 + w));
          break;
        }
        case 'nod': {
          H.rotation.x += Math.sin(T * 14) * 0.18 * e;
          break;
        }
        case 'pump': {
          const s = Math.sin(clamp(T / g.dur, 0, 1) * Math.PI);
          set(L, -0.2, 0, 1.2 + s * 1.2);
          set(R, -0.2, 0, -1.2 - s * 1.2);
          break;
        }
      }
      if (T >= g.dur) this.g = null;
    }

    this.armOverride?.(k, t, dt, A, O);

    // Badge above the head (hidden while the thought bubble shows)
    this.badgeK = damp(this.badgeK, this.badgeOn && !this.bubble.group.visible ? 1 : 0, 10, dt);
    this.badge.visible = this.badgeK > 0.02;
    if (this.badge.visible) {
      this.headTop(this.badge.position);
      this.badge.position.y += 0.26 + Math.sin(t * 3) * 0.03;
      this.badge.rotation.y = Math.sin(t * 1.8) * 0.5;
      this.badge.scale.setScalar(easeOutBack(clamp(this.badgeK, 0, 1)));
    }
    // Thought bubble beside the head, on the outer side
    const out = Math.sign(k.root.position.x) || 1;
    this.headTop(this.bubble.group.position);
    this.bubble.group.position.x += out * 0.42;
    this.bubble.group.position.y -= 0.2;
    this.bubble.group.position.z += 0.12;
    this.bubble.update(dt, t);
  }
}
