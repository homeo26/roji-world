import * as THREE from 'three';

// Activities: both kids settle into poses (sofa, bed, desks, picnic blanket...) until the player
// moves, presses A / E, or the activity calls end(). Positions are world coordinates here;
// the module-facing api converts from a place's local coordinates first.
//
// spec: {
//   label: 'Get up',                 // shown on the prompt and the A button while it runs
//   seats: [{ who, x, z, y, yaw, pose, hands, rot, prop }],
//        who: 'player' | 'partner' | 'roji' | 'homama'
//        pose: 'sit' | 'sleep' | 'stand' | 'ride' | 'drive' | 'bike' | 'ski' (Kid poses)
//        hands: null | 'carry' | 'type' | 'stir' | 'read' | 'hold' | 'wave2'
//        rot: optional [rx, ry, rz] full rotation of the kid (for lying down); overrides yaw
//   focus: { x, y, z, zoom },          // optional camera target while it runs
//   night: 0..1, music: 0..1,          // optional dimming and music level
//   endOnMove: true,                   // moving the stick ends it
//   exit: { x, z },                    // optional: where the kids stand afterwards
//   update(dt, t), onEnd(),            // optional hooks
// }

export class Activities {
  constructor(g) {
    this.g = g; // { actors, playerId(), sound, setNight(k), setFocus(spec|null) }
    this.current = null;
  }

  get active() {
    return !!this.current;
  }

  get label() {
    return this.current?.label || 'Get up';
  }

  who(w) {
    const g = this.g;
    const pid = g.playerId();
    if (w === 'player') return g.actors[pid];
    if (w === 'partner') return g.actors[pid === 'roji' ? 'homama' : 'roji'];
    return g.actors[w];
  }

  // Put one kid into a pose at a world position.
  seat(a, s) {
    const k = a.kid;
    k.cancelEmote();
    k.holdSide = 0;
    k.danceLoop = false;
    a.vel.set(0, 0, 0);
    a.speed = 0;
    a.vy = 0;
    a.pos.set(s.x, 0, s.z);
    a.y = s.y ?? 0;
    a.yaw = s.yaw ?? a.yaw;
    k.pose = s.pose || 'sit';
    k.hands = s.hands ?? null;
    k.root.position.set(s.x, s.y ?? 0, s.z);
    if (s.rot) k.root.rotation.set(s.rot[0], s.rot[1], s.rot[2]);
    else k.root.rotation.set(0, a.yaw, 0);
    a.seated = true;
  }

  release(a, at) {
    const k = a.kid;
    k.pose = 'stand';
    k.hands = k.carried ? 'carry' : null;
    k.danceLoop = false;
    k.cancelEmote();
    a.seated = false;
    if (at) {
      a.pos.set(at.x, 0, at.z);
      a.y = this.g.physics?.support ? this.g.physics.support(at.x, at.z, 0.3, (at.y ?? 0) + 0.3, 0) : 0;
    }
    a.vy = 0; // without an exit point the kid keeps its height and settles onto what is below
    k.root.rotation.set(0, a.yaw, 0);
  }

  start(spec) {
    if (this.current) this.end(true);
    const g = this.g;
    const seated = [];
    for (const s of spec.seats || []) {
      const a = this.who(s.who);
      if (!a) continue;
      this.seat(a, s);
      seated.push(a);
    }
    this.current = { endOnMove: true, ...spec, seated, t: 0 };
    if (spec.focus) g.setFocus(spec.focus);
    if (spec.night !== undefined) g.setNight(spec.night);
    if (spec.music !== undefined) g.sound.setMusicLevel(spec.music);
    g.life?.emit('activity', this.current);
    return this.current;
  }

  update(dt, t, intent) {
    const c = this.current;
    if (!c) return;
    c.t += dt;
    if (c.endOnMove && intent > 0.3 && c.t > 0.4) return this.end();
    c.update?.(dt, t);
  }

  end(silent = false) {
    const c = this.current;
    if (!c) return;
    this.current = null;
    const g = this.g;
    c.seated.forEach((a, i) => {
      const at = c.exit ? new THREE.Vector3(c.exit.x + i * 0.8, 0, c.exit.z) : null;
      this.release(a, at);
    });
    if (c.focus) g.setFocus(null);
    if (c.night !== undefined) g.setNight(0);
    if (c.music !== undefined) g.sound.setMusicLevel(1);
    c.onEnd?.(silent);
    g.life?.emit('activity-end', c);
  }
}
