import * as THREE from 'three';
import { makeBento, makeOpenBento } from './models.js';

// The hospital lunch box. The first time each day that Roji walks into Sunny Hill Hospital, Homama
// hurries in after her with a bento and a note. She carries it for a little while and then it sits,
// opened, on her office desk for the rest of the day. When Homama is the player, the lunch box is
// already waiting at the reception desk with its note, and he can give it to her.

const KEY = 'roji-world-love-lunch';
const NOTE = { title: 'Tucked under the knot', text: 'Eat something, Dr. Roji. I love you.', from: 'H' };

// Spots in the hospital interior (its own local frame: x -15..15, z -5..5, the front at +z)
const ENTRANCE = { x: -5.2, z: 4.55 };
const DESK = { x: -11.2, y: 0.8, z: -2.78, yaw: -0.12 }; // right end of Dr. Roji's desk, by the flowers
const DESK_NEAR = { x: -11.6, z: -1.9 };
const RECEPTION = { x: -6.8, y: 0.97, z: -2.7, yaw: 0.15 }; // between the plant and the bell
const RECEPTION_SPOT = { x: -6.8, z: -1.75 };

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const loadDay = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const saveDay = (v) => {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* storage blocked */
  }
};

export class Lunch {
  constructor(L, G) {
    this.L = L;
    this.G = G;
    this.carried = null; // { obj, t } the box in Roji's hands
    this.desk = null; // the open bento on her desk
    this.waiting = null; // the wrapped box at the reception
    this.removeHot = null;
    this.flying = null; // { obj, from, to, t, dur, done }
  }

  get game() {
    return this.L.game;
  }
  rec() {
    return this.game.spaces.interiors.hospital || null;
  }

  onEnter(space) {
    if (space.id !== 'hospital' || !this.rec()) return;
    const done = loadDay() === today();
    this.showDesk(space, done && !this.carried);
    if (done) return;
    if (this.game.playerId() === 'roji') this.G.start('lunch', (r) => this.handover(r, space), { take: true, policy: 'lunch' });
    else this.toReception(space);
  }

  onExit(space) {
    if (space.id !== 'hospital') return;
    this.clearReception();
  }

  // Sitting at the desk, or any other activity, puts the lunch box down first
  onActivity() {
    if (this.carried) this.putDown(false);
  }

  // ---------------------------------------------------------------- Homama hurries in
  *handover(r, space) {
    const G = this.G;
    const g = this.game;
    const O = space.origin;
    const P = G.P(); // Roji
    const C = G.C(); // Homama
    const bento = makeBento();
    let delivered = false;
    C.kid.root.visible = false;
    C.pos.set(O.x + ENTRANCE.x, 0, O.z + ENTRANCE.z);
    C.vel.set(0, 0, 0);
    C.y = 0;
    C.vy = 0;
    C.yaw = Math.PI;
    C.kid.root.position.copy(C.pos);
    r.cleanup.push(() => {
      C.kid.root.visible = true;
      if (C.kid.carried === bento) C.kid.carry(null);
      if (!delivered) {
        bento.removeFromParent();
        // Interrupted inside (she sat down): the lunch box still reaches her desk
        if (this.L.state().inside === 'hospital') {
          saveDay(today());
          this.showDesk(space, true);
          this.L.ui.showNote(NOTE, 5200);
        }
      }
    });
    // He is still parking the car for a moment
    yield* G.hold(2.1, Math.PI);
    C.kid.root.visible = true;
    C.kid.carry(bento);
    g.fx.puff(C.pos);
    this.L.sfx('door');
    this.L.ui.say(C.kid, 'Dr. Roji! You forgot your lunch!', 2600);
    const s = G.sideSign();
    const spot = () => P.pos.clone().add(new THREE.Vector3(Math.cos(P.yaw) * 0.62 * s, 0, -Math.sin(P.yaw) * 0.62 * s));
    const ok = yield* G.approach(spot, { speed: 6.8, timeout: 12, leash: Infinity, giveUp: 0.9 });
    if (!ok) {
      // Something in the way: he pops up next to her instead
      g.fx.poof(C.pos);
      C.pos.copy(spot());
      g.physics.resolve(C.pos, 0.34, C.vel);
      g.fx.poof(C.pos);
    }
    yield* G.hold(0.35, () => Math.atan2(P.pos.x - C.pos.x, P.pos.z - C.pos.z));
    C.kid.carry(null);
    // A rose in her hands goes into her hair first; anything else stays, and the box goes on her desk
    if (G.roseHeld && P.kid.carried === G.roseHeld.obj) {
      G.roseHeld.t = 0;
      G.keepers(0);
    }
    if (P.kid.carried) {
      bento.removeFromParent();
      delivered = true;
      saveDay(today());
      this.showDesk(space, true);
      this.L.ui.showNote(NOTE, 6000);
      this.L.toast('Homama puts the lunch box on her desk.', 2600);
      G.giggle(P);
      yield* G.hold(1.2, () => Math.atan2(P.pos.x - C.pos.x, P.pos.z - C.pos.z));
      return;
    }
    yield* G.fly(bento, P.kid.carryAnchor, 0.4, 0.14);
    bento.position.set(0, 0, 0);
    bento.quaternion.identity();
    P.kid.carry(bento);
    delivered = true;
    saveDay(today());
    this.carried = { obj: bento, t: 24, space };
    this.L.ui.showNote(NOTE, 6000);
    G.giggle(P);
    C.kid.emote('nod');
    yield* G.hold(1.4, () => Math.atan2(P.pos.x - C.pos.x, P.pos.z - C.pos.z));
  }

  // ---------------------------------------------------------------- Homama is the player
  toReception(space) {
    this.clearReception();
    const box = makeBento();
    box.position.set(RECEPTION.x, RECEPTION.y, RECEPTION.z);
    box.rotation.y = RECEPTION.yaw;
    space.inst.group.add(box);
    this.waiting = box;
    this.removeHot = this.game.spaces.addHotspot(space, {
      x: RECEPTION_SPOT.x,
      z: RECEPTION_SPOT.z,
      r: 1.05,
      icon: 'heart',
      label: 'Lunch box for Roji',
      act: () => this.giveFromReception(space),
    });
  }

  clearReception() {
    this.removeHot?.();
    this.removeHot = null;
    this.waiting?.removeFromParent();
    this.waiting = null;
  }

  giveFromReception(space) {
    const box = this.waiting;
    if (!box) return;
    this.removeHot?.();
    this.removeHot = null;
    this.waiting = null;
    const roji = this.game.actors.roji;
    this.L.sfx('pop');
    this.L.ui.showNote({ title: 'On the lunch box', text: 'Eat something, Dr. Roji. I love you.', from: 'H' }, 5600);
    this.fly(box, roji.kid.carryAnchor, 0.6, () => {
      box.position.set(0, 0, 0);
      box.quaternion.identity();
      roji.kid.carry(box);
      this.carried = { obj: box, t: 22, space };
      this.G.giggle(roji);
      saveDay(today());
    });
  }

  // ---------------------------------------------------------------- the desk
  showDesk(space, on) {
    if (!this.desk) {
      this.desk = makeOpenBento();
      this.desk.position.set(DESK.x, DESK.y, DESK.z);
      this.desk.rotation.y = DESK.yaw;
    }
    if (on && this.desk.parent !== space.inst.group) space.inst.group.add(this.desk);
    if (!on) this.desk.removeFromParent();
  }

  // Roji puts the lunch box on her desk (flying there if she is close, else it is simply there later)
  putDown(near) {
    const c = this.carried;
    this.carried = null;
    const roji = this.game.actors.roji;
    if (roji.kid.carried === c.obj) roji.kid.carry(null);
    const space = this.rec()?.space;
    if (!space) return c.obj.removeFromParent();
    if (near) {
      const target = new THREE.Object3D();
      target.position.set(DESK.x, DESK.y, DESK.z);
      space.inst.group.add(target);
      this.game.scene.add(c.obj);
      roji.kid.carryAnchor.getWorldPosition(c.obj.position);
      this.fly(c.obj, target, 0.45, () => {
        c.obj.removeFromParent();
        target.removeFromParent();
        this.showDesk(space, true);
        this.L.sfx('pop');
        this.game.fx.heartsAt(space.origin.clone().add(new THREE.Vector3(DESK.x, DESK.y + 0.4, DESK.z)), 3);
      });
    } else {
      c.obj.removeFromParent();
      this.showDesk(space, true);
    }
  }

  // A small tween of a loose object toward an anchor
  fly(obj, toObj, dur, done) {
    const from = new THREE.Vector3();
    obj.getWorldPosition(from);
    const q0 = new THREE.Quaternion();
    obj.getWorldQuaternion(q0);
    this.game.scene.attach(obj);
    this.flying = { obj, toObj, from, q0, t: 0, dur, done };
  }

  tick(dt) {
    const f = this.flying;
    if (f) {
      f.t = Math.min(f.dur, f.t + dt);
      const k = f.t / f.dur;
      const to = f.toObj.getWorldPosition(new THREE.Vector3());
      f.obj.position.lerpVectors(f.from, to, k);
      f.obj.position.y += Math.sin(k * Math.PI) * 0.3;
      f.obj.quaternion.slerpQuaternions(f.q0, f.toObj.getWorldQuaternion(new THREE.Quaternion()), k);
      if (k >= 1) {
        this.flying = null;
        f.done();
      }
    }
    const c = this.carried;
    if (!c) return;
    const roji = this.game.actors.roji;
    if (roji.kid.carried !== c.obj) {
      this.carried = null; // she picked up something else
      c.obj.removeFromParent();
      const space = this.rec()?.space;
      if (space) this.showDesk(space, true);
      return;
    }
    const st = this.L.state();
    const inside = st.inside === 'hospital';
    if (st.free) c.t -= dt;
    let near = false;
    if (inside) {
      const O = c.space.origin;
      near = Math.hypot(roji.pos.x - O.x - DESK_NEAR.x, roji.pos.z - O.z - DESK_NEAR.z) < 1.7;
    }
    if (!inside || near || c.t <= 0 || st.activity || st.mount) this.putDown(near && inside && !st.activity);
  }

  force() {
    saveDay('');
    const s = this.rec()?.space;
    if (s && this.game.spaces.inside === s) this.onEnter(s);
    return true;
  }

  dispose() {
    this.clearReception();
    this.desk?.removeFromParent();
    if (this.carried) {
      const roji = this.game.actors.roji;
      if (roji.kid.carried === this.carried.obj) roji.kid.carry(null);
      this.carried = null;
    }
    this.flying?.obj.removeFromParent();
    this.flying = null;
  }
}
