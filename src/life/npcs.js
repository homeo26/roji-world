// Town life: the people around the island. Every extra person a place builds (game.spaces.npcs) gets
// a "Chat with ..." prompt when Roji or Homama is near, with two or three things to do together
// (a high five, a selfie for the album, a flower, a dance, a check-up from Dr. Roji, a bug fix from
// Homama, and a question that fits the place). People answer in speech bubbles, turn round, wave
// and hop as far as the way their place built them allows (see npcs/puppet.js).
// With no button at all, people now and then call out a hello, and wave at the two walking hand in hand.
// The dances for two (dabke, slow dance, salsa) are coordinated here too (npcs/dances.js).
//
// Cost: people are looked at a few times a second, and only those of the room the player is in, or
// of a place the player is near. Prompts exist only for people within a few metres.
import { Bubbles } from './npcs/bubble.js';
import { Sparkles, makeSounds } from './npcs/fx.js';
import { Puppet } from './npcs/puppet.js';
import { Duets } from './npcs/dances.js';
import { makeModels } from './npcs/models.js';
import { ACTIONS } from './npcs/actions.js';
import { LINES, profileFor, nameFor, fill, actionLabel, linesFor } from './npcs/people.js';

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
const ALBUM_KEY = 'roji-world-selfies';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

class People {
  constructor(ctx) {
    const { THREE, util, game, api, life, props, state } = ctx;
    Object.assign(this, { THREE, util, game, api, life, state: state });
    this.V = THREE.Vector3;
    this.v1 = new THREE.Vector3();
    this.v2 = new THREE.Vector3();
    this.v3 = new THREE.Vector3();
    this.q = new THREE.Quaternion();
    this.e = new THREE.Euler();
    this.bubbles = new Bubbles(THREE, game.scene, util.FONT);
    this.sparkles = new Sparkles(THREE, game.scene);
    this.sounds = makeSounds(game.sound);
    this.models = makeModels(THREE, util, props);
    this.duets = new Duets({ THREE, game, state: () => this.st(), sparkles: this.sparkles, sounds: this.sounds });
    this.recs = new Map();
    this.list = [];
    this.mine = new Set();
    this.clock = 0;
    this.frame = 0;
    this.timers = [];
    this.tweens = [];
    this.busy = null;
    this.scanT = 0;
    this.ambientT = 0;
    this.lastAmbient = -20;
    this.userMoved = -10;
    this.inside = null;

    life.on('tick', (dt, t) => this.tick(dt, t));
    life.on('enter', () => this.roomChanged());
    life.on('exit', () => this.roomChanged());
    life.on('arena', () => this.interrupt());
    life.on('activity', () => this.interrupt());
    const moved = () => (this.userMoved = this.clock);
    window.addEventListener('keydown', (e) => MOVE_KEYS.has(e.key.toLowerCase()) && moved());
    document.getElementById('stick')?.addEventListener('pointerdown', moved);
    document.querySelector('#app canvas, canvas')?.addEventListener('pointerdown', moved);
  }

  // ---------------------------------------------------------------- helpers
  get me() {
    return this.game.playerId();
  }
  get other() {
    return this.me === 'roji' ? 'homama' : 'roji';
  }
  get player() {
    return this.game.actors[this.me];
  }
  get partner() {
    return this.game.actors[this.other];
  }

  st() {
    if (this.stFrame !== this.frame) {
      this.stFrame = this.frame;
      this.stCache = this.state();
    }
    return this.stCache;
  }

  wait(sec) {
    return new Promise((res) => this.timers.push({ at: this.clock + sec, fn: res }));
  }

  after(sec, fn) {
    this.timers.push({ at: this.clock + sec, fn });
  }

  pick(rec, key, list) {
    if (!list?.length) return '';
    const mem = rec.last;
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === mem[key]) i = (i + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
    mem[key] = i;
    return fill(list[i], this.me, this.other);
  }

  say(rec, text, ms = 2800) {
    if (text) this.bubbles.say(rec, rec.anchor, text, { ms, accent: rec.prof.accent });
  }

  title(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  npcLook(rec) {
    return { gender: 'girl', skin: '#e3b08e', hair: '#3a2316', hairstyle: 'short', top: '#ef5b6f', accent: '#ffd166', ...rec.look, name: this.title(rec.name) };
  }

  // Saves who is in the selfie album and returns the line under the photo
  album(rec) {
    let all = {};
    try {
      all = JSON.parse(localStorage.getItem(ALBUM_KEY) || '{}') || {};
    } catch {
      all = {};
    }
    const key = `${rec.space.id}:${rec.name}`;
    const fresh = !all[key];
    all[key] = (all[key] || 0) + 1;
    try {
      localStorage.setItem(ALBUM_KEY, JSON.stringify(all));
    } catch {
      /* storage full */
    }
    const n = Object.keys(all).length;
    const where = rec.space.title || rec.space.stop?.title || '';
    return fresh ? `New friend in the album: ${n} so far` : where;
  }

  // ---------------------------------------------------------------- people
  makeRec(npc) {
    const THREE = this.THREE;
    const same = this.list.filter((r) => r.space === npc.space && r.look.gender === npc.look.gender).length;
    const kid = npc.kid;
    const rec = {
      npc,
      kid,
      space: npc.space,
      look: npc.look,
      prof: profileFor(npc),
      name: nameFor(npc, same),
      puppet: new Puppet(THREE, kid),
      pos: new THREE.Vector3(),
      anchorV: new THREE.Vector3(),
      active: false,
      visible: false,
      dist: Infinity,
      hot: null,
      hotObj: null,
      off: null,
      headY: 1.6,
      near: false,
      lastCall: -100,
      lastLove: -100,
      token: 0,
      last: {},
    };
    rec.head = (dy = 0) => new THREE.Vector3(rec.pos.x, rec.pos.y + rec.headY + dy, rec.pos.z);
    rec.anchor = () => (rec.active && rec.visible ? rec.anchorV.set(rec.pos.x, rec.pos.y + rec.headY + 0.06, rec.pos.z) : null);
    kid.root.getWorldPosition(rec.pos);
    let meshes = false;
    kid.root.traverse((o) => {
      if (o.isMesh && o !== kid.blob) meshes = true;
    });
    const s = kid.root.getWorldScale(this.v1).y;
    if (meshes) {
      const box = new THREE.Box3().setFromObject(kid.root);
      rec.headY = Math.max(0.9, Math.min(2.4, box.max.y - rec.pos.y + 0.04));
    } else rec.headY = (kid.pose === 'stand' ? 1.5 : 1.12) * s;
    this.recs.set(npc, rec);
    this.list.push(rec);
    return rec;
  }

  inScene(o) {
    const scene = this.game.scene;
    while (o) {
      if (!o.visible) return false;
      if (o === scene) return true;
      o = o.parent;
    }
    return false;
  }

  scan() {
    const sp = this.game.spaces;
    for (const n of sp.npcs) if (!this.recs.has(n)) this.makeRec(n);
    const P = this.player.pos;
    const inside = sp.inside;
    for (const rec of this.list) {
      const S = rec.space;
      let active = false;
      if (inside) active = S === inside;
      else if (S.kind === 'place') active = Math.abs(P.x - S.origin.x) < S.size.w / 2 + 12 && Math.abs(P.z - S.origin.z) < S.size.d / 2 + 12;
      rec.active = active;
      if (!active) {
        rec.visible = false;
        rec.near = false;
        if (rec.hot) this.dropHot(rec);
        continue;
      }
      rec.puppet.checkLive();
      if (!rec.puppet.active) rec.kid.root.getWorldPosition(rec.pos);
      rec.visible = this.inScene(rec.kid.root);
      rec.dist = Math.hypot(P.x - rec.pos.x, P.z - rec.pos.z);
      const want = rec.visible && rec.dist < 9;
      if (want && !rec.hot) this.addHot(rec);
      else if (!want && rec.hot) this.dropHot(rec);
    }
  }

  // A place's own prompt right at the person (the zoo keeper's chat) means they are looked after already.
  // Doors and prompts that follow the partner around do not count.
  ownedByPlace(rec) {
    const C = this.partner?.pos;
    for (const h of rec.space.hotspots) {
      if (this.mine.has(h) || h.inside || h.icon === 'door') continue;
      const p = h.pos;
      if (Math.hypot(p.x - rec.pos.x, p.z - rec.pos.z) > 0.8) continue;
      if (C && Math.hypot(p.x - C.x, p.z - C.z) < 0.9) continue;
      return true;
    }
    return false;
  }

  // A prompt next to the person, on a free spot the player can stand on
  addHot(rec) {
    rec.owned = this.ownedByPlace(rec);
    if (rec.owned) return;
    if (rec.off === null) rec.off = this.spotFor(rec) || false;
    if (!rec.off) return;
    const sp = this.game.spaces;
    const O = rec.space.origin;
    const remove = sp.addHotspot(rec.space, {
      x: rec.pos.x + rec.off.x - O.x,
      z: rec.pos.z + rec.off.z - O.z,
      r: 1.1,
      icon: 'smile',
      label: `Chat with ${rec.name}`,
      track: () => {
        if (rec.puppet.mode === 'live' && !rec.puppet.active) rec.kid.root.getWorldPosition(rec.pos);
        return { x: rec.pos.x + rec.off.x - O.x, z: rec.pos.z + rec.off.z - O.z };
      },
      when: () => this.canChat(rec),
      act: () => this.interact(rec),
    });
    rec.hotObj = rec.space.hotspots[rec.space.hotspots.length - 1];
    this.mine.add(rec.hotObj);
    rec.hot = remove;
  }

  dropHot(rec) {
    rec.hot?.();
    this.mine.delete(rec.hotObj);
    rec.hot = null;
    rec.hotObj = null;
  }

  otherHotNear(x, z, d) {
    for (const h of this.game.spaces.hotspots()) {
      if (this.mine.has(h) || h.inside) continue;
      const p = h.pos;
      if (Math.hypot(p.x - x, p.z - z) < d) return true;
    }
    return false;
  }

  freeAt(x, z, space, feet = 0) {
    if (space.kind === 'interior' && space.bounds) {
      const b = space.bounds;
      if (x < b.x0 + 0.4 || x > b.x1 - 0.4 || z < b.z0 + 0.4 || z > b.z1 - 0.2) return false;
    }
    const p = this.v3.set(x, 0, z);
    this.game.physics.resolve(p, 0.32, this.v2.set(0, 0, 0), { feet });
    return Math.hypot(p.x - x, p.z - z) < 0.03;
  }

  spotFor(rec) {
    const yaw = this.e.setFromQuaternion(rec.kid.root.getWorldQuaternion(this.q), 'YXZ').y;
    // The side the camera sees first (people walk up from the front), then their sides, then behind
    const dirs = [0, yaw, 0.5, -0.5, yaw + 0.5, yaw - 0.5, 0.95, -0.95, yaw + 1.57, yaw - 1.57, 1.57, -1.57, yaw + Math.PI];
    for (const a of dirs) {
      for (const d of [1.0, 1.35, 1.7, 2.05]) {
        const x = rec.pos.x + Math.sin(a) * d;
        const z = rec.pos.z + Math.cos(a) * d;
        if (!this.freeAt(x, z, rec.space, rec.pos.y)) continue;
        if (this.otherHotNear(x, z, 0.8)) continue;
        if (this.list.some((r) => r !== rec && r.off && r.active && Math.hypot(r.pos.x + r.off.x - x, r.pos.z + r.off.z - z) < 0.8)) continue;
        if (!this.openToward(x, z, rec.space, rec.pos.y)) continue;
        return new this.THREE.Vector3(Math.sin(a) * d, 0, Math.cos(a) * d);
      }
    }
    return null;
  }

  // Can a kid walk up to this spot from the open floor on the camera side? (Not behind a counter.)
  openToward(x, z, space, feet = 0) {
    const b = space.kind === 'interior' ? space.bounds : null;
    for (const a of [0, 0.6, -0.6, 1.2, -1.2]) {
      let ok = true;
      for (let d = 0.3; d <= 2.1 && ok; d += 0.3) {
        const px = x + Math.sin(a) * d;
        const pz = z + Math.cos(a) * d;
        if (b && (pz > b.z1 - 0.3 || px < b.x0 || px > b.x1)) break;
        ok = this.freeAt(px, pz, { kind: 'place' }, feet);
      }
      if (ok) return true;
    }
    return false;
  }

  // Our prompt never takes the place of a place's own prompt or a station pad
  canChat(rec) {
    if (this.busy || !rec.active || !rec.visible || !rec.off || rec.broken) return false;
    const P = this.player.pos;
    const hx = rec.pos.x + rec.off.x;
    const hz = rec.pos.z + rec.off.z;
    if (Math.hypot(P.x - hx, P.z - hz) > 1.25) return true; // out of reach anyway
    if (!this.st().free) return false;
    if (this.othersFrame !== this.frame) {
      this.othersFrame = this.frame;
      this.othersHere = false;
      for (const h of this.game.spaces.hotspots()) {
        if (this.mine.has(h) || h.inside) continue;
        const p = h.pos;
        if (Math.hypot(P.x - p.x, P.z - p.z) < h.r && h.when()) {
          this.othersHere = true;
          break;
        }
      }
      if (!this.game.spaces.inside) for (const pl of this.game.spaces.places) if (pl.pad && Math.hypot(P.x - pl.pad.x, P.z - pl.pad.z) < 2.2) this.othersHere = true;
    }
    return !this.othersHere;
  }

  // ---------------------------------------------------------------- moving the player for a moment
  walkTo(target, timeout = 1.8) {
    this.walking?.res();
    return new Promise((res) => (this.walking = { target: target.clone().setY(0), t: 0, timeout, res, since: this.clock }));
  }

  async approach(rec, dist) {
    const P = this.player.pos;
    const dx = P.x - rec.pos.x;
    const dz = P.z - rec.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    if (d <= dist + 0.12) return;
    await this.walkTo(this.v1.set(rec.pos.x + (dx / d) * dist, 0, rec.pos.z + (dz / d) * dist));
  }

  // A free spot beside the person, along the screen's left-right line (for a selfie)
  sideSpot(rec, d) {
    const P = this.player.pos;
    const first = P.x >= rec.pos.x ? 1 : -1;
    for (const s of [first, -first]) {
      const x = rec.pos.x + s * d;
      if (this.freeAt(x, rec.pos.z, rec.space)) return new this.THREE.Vector3(x, 0, rec.pos.z);
    }
    return null;
  }

  faceTo(rec) {
    this.facing = { rec };
  }

  faceYaw(yaw) {
    this.facing = { yaw };
  }

  // Hand a held thing to a person: it flies over, they hold it a while, then it goes away
  give(obj, rec, hold) {
    const P = this.player;
    const from = new this.THREE.Vector3(P.pos.x + Math.sin(P.yaw) * 0.32, P.y + 0.85, P.pos.z + Math.cos(P.yaw) * 0.32);
    const dx = P.pos.x - rec.pos.x;
    const dz = P.pos.z - rec.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const to = new this.THREE.Vector3(rec.pos.x + (dx / d) * 0.26, rec.pos.y + rec.headY - 0.68, rec.pos.z + (dz / d) * 0.26);
    this.game.scene.add(obj);
    obj.rotation.set(0, Math.atan2(-dx, -dz) + Math.PI, 0);
    this.tweens.push({
      obj,
      from,
      to,
      t: 0,
      dur: 0.45,
      done: () => {
        if (rec.puppet.mode !== 'still' && this.inScene(rec.kid.root)) rec.kid.root.attach(obj);
        this.after(hold, () => this.tweens.push({ obj, shrink: true, s0: obj.scale.clone(), t: 0, dur: 0.35, done: () => obj.removeFromParent() }));
      },
    });
  }

  // ---------------------------------------------------------------- a chat
  async interact(rec) {
    if (this.busy) return;
    const s = { rec, cancelled: false, live: () => !s.cancelled && this.busy === s, room: this.game.spaces.inside };
    this.busy = s;
    rec.token++;
    rec.near = true;
    rec.lastCall = this.clock;
    const P = this.player;
    const me = this.me;
    try {
      rec.puppet.begin();
      rec.puppet.face(P.pos);
      rec.puppet.play('wave', 1.6);
      this.faceTo(rec);
      if (P.kid.pose === 'stand' && P.speed < 0.5) P.kid.emote('wave');
      this.game.sound.ui?.('pop');
      const greetLines = linesFor(rec.prof.greet, me);
      const greet = this.pick(rec, 'greet', greetLines.length ? greetLines : LINES.greet);
      const ids = rec.prof.actions(me, rec.puppet.seated).filter((id) => ACTIONS[id]);
      const options = ids.map((id) => {
        const l = actionLabel(id, rec.prof, rec);
        return { id, label: l.label, sub: l.sub };
      });
      const choice = await this.api.choose({
        title: this.title(rec.name),
        text: `<span style="display:block;font-size:.8em;color:#8a7480;margin-bottom:4px">${esc(rec.prof.role)}</span>"${esc(greet)}"`,
        options,
      });
      if (!s.live()) return;
      if (!choice || !ACTIONS[choice]) {
        this.say(rec, this.pick(rec, 'bye', LINES.bye), 1800);
        await this.wait(1.2);
        return;
      }
      await ACTIONS[choice](this, rec, s);
    } catch (e) {
      console.error('npcs: chat failed', e);
    } finally {
      if (this.busy === s) this.busy = null;
      this.lastAmbient = this.clock;
      this.facing = null;
      this.walking?.res();
      this.walking = null;
      rec.puppet.end();
    }
  }

  interrupt() {
    if (this.busy) this.busy.cancelled = true;
    this.busy = null;
    this.walking?.res();
    this.walking = null;
    this.facing = null;
    this.duets.stop();
  }

  roomChanged() {
    this.interrupt();
    this.scanT = 0;
  }

  // ---------------------------------------------------------------- little moments with no button
  ambient() {
    const st = this.st();
    if (!st.free || this.busy) return;
    const P = this.player;
    const quiet = this.clock - this.lastAmbient < 9;
    let love = null;
    let call = null;
    for (const rec of this.list) {
      if (!rec.active || !rec.visible || rec.broken) continue;
      const callR = rec.prof.callout ? 9 : 4.6;
      if (rec.dist > callR + 2.5) rec.near = false;
      if (rec.dist < callR && !rec.near) {
        rec.near = true;
        if (this.clock - rec.lastCall > 60 && (rec.prof.callout || Math.random() < 0.45)) call ||= rec;
      }
      if (st.holding && P.speed > 1.2 && rec.dist < 6.5 && this.clock - rec.lastLove > 50 && (!love || rec.dist < love.dist)) love = rec;
    }
    if (quiet && !call?.prof.callout) return;
    if (call) {
      call.lastCall = this.clock;
      const own = linesFor(call.prof.callout, this.me);
      this.moment(call, this.pick(call, 'callout', own.length ? own : LINES.callout), false);
    } else if (love && Math.random() < 0.65) {
      love.lastLove = this.clock;
      this.moment(love, this.pick(love, 'holding', LINES.holding), true);
    }
  }

  moment(rec, line, hearts) {
    this.lastAmbient = this.clock;
    const token = ++rec.token;
    rec.puppet.begin();
    rec.puppet.face(this.player.pos);
    rec.puppet.play('wave', 1.8);
    this.say(rec, line, 2600);
    if (hearts) this.game.fx.heartsAt(rec.head(0.25), 3);
    else this.sparkles.burst(rec.head(0.1), ['#ffd166', '#ffffff'], 5, 0.8);
    this.after(2.4, () => {
      if (rec.token === token && this.busy?.rec !== rec) rec.puppet.end();
    });
  }

  // ---------------------------------------------------------------- every frame
  // Life drops a handler that throws, so a surprise in one frame is logged and the town keeps its people
  tick(dt, t) {
    try {
      this.step(dt, t);
    } catch (e) {
      if ((this.errors = (this.errors || 0) + 1) <= 3) console.error('npcs: frame failed', e);
    }
  }

  step(dt, t) {
    this.frame++;
    this.clock += dt;
    for (let i = this.timers.length - 1; i >= 0; i--) {
      if (this.timers[i].at <= this.clock) {
        const { fn } = this.timers[i];
        this.timers.splice(i, 1);
        try {
          fn();
        } catch (e) {
          console.error('npcs: timer failed', e);
        }
      }
    }
    const sp = this.game.spaces;
    if (sp.inside !== this.inside) {
      this.inside = sp.inside;
      this.roomChanged();
    }
    this.scanT -= dt;
    if (this.scanT <= 0) {
      this.scanT = 0.35;
      this.scan();
    }
    this.ambientT -= dt;
    if (this.ambientT <= 0) {
      this.ambientT = 0.5;
      this.ambient();
    }
    const P = this.player;
    const s = this.busy;
    if (s) {
      const st = this.st();
      const rec = s.rec;
      if (st.mount || st.activity || sp.inside !== s.room || !rec.active || Math.hypot(P.pos.x - rec.pos.x, P.pos.z - rec.pos.z) > 4.5 || (this.userMoved > s.since && !document.querySelector('.choose'))) {
        s.cancelled = true;
        this.busy = null;
        this.facing = null;
        this.walking?.res();
        this.walking = null;
        rec.puppet.end();
      } else if (rec.puppet.faceAt && !s.faceFixed) rec.puppet.faceAt.copy(P.pos);
      if (!s.since) s.since = this.clock;
    }
    // Walking the player a step closer
    const w = this.walking;
    if (w) {
      w.t += dt;
      const dx = w.target.x - P.pos.x;
      const dz = w.target.z - P.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.07 || w.t > w.timeout || this.userMoved > w.since) {
        P.vel.set(0, 0, 0);
        this.walking = null;
        w.res();
      } else {
        const v = Math.min(2.4, 0.7 + d * 3);
        P.vel.set((dx / d) * v, 0, (dz / d) * v);
      }
    } else if (this.facing && P.speed < 0.5 && P.kid.pose === 'stand') {
      const f = this.facing;
      const yaw = f.rec ? Math.atan2(f.rec.pos.x - P.pos.x, f.rec.pos.z - P.pos.z) : f.yaw;
      P.yaw += wrap(yaw - P.yaw) * (1 - Math.exp(-12 * dt));
      P.kid.root.rotation.y = P.yaw;
    }
    // People who are reacting
    for (const rec of this.list) {
      if (!rec.puppet.active) continue;
      try {
        rec.puppet.update(dt, t);
      } catch (e) {
        // A person built in a way the puppet does not know: leave them still from now on
        rec.puppet.active = false;
        rec.broken = true;
        console.error(`npcs: ${rec.name} cannot react`, e);
      }
      if (rec.puppet.mode === 'live') rec.kid.root.getWorldPosition(rec.pos);
    }
    // Things in flight
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      if (tw.shrink) tw.obj.scale.copy(tw.s0).multiplyScalar(1 - k);
      else {
        tw.obj.position.lerpVectors(tw.from, tw.to, k);
        tw.obj.position.y += Math.sin(k * Math.PI) * 0.35;
      }
      if (k >= 1) {
        this.tweens.splice(i, 1);
        tw.done?.();
      }
    }
    this.duets.tick(dt, t);
    this.bubbles.update(dt);
    this.sparkles.update(dt);
  }
}

export default {
  id: 'npcs',
  init(ctx) {
    const people = new People(ctx);
    // Test hook: __npcs.list() names the people near you, __npcs.chat('Maya') opens a chat
    window.__npcs = {
      people,
      list: () => people.list.filter((r) => r.active).map((r) => ({ name: r.name, space: r.space.id, mode: r.puppet.mode, seated: r.puppet.seated, dist: +r.dist.toFixed(1), prompt: !!r.hot, owned: !!r.owned, x: +r.pos.x.toFixed(1), z: +r.pos.z.toFixed(1) })),
      chat: (name) => {
        const rec = people.list.find((r) => r.active && r.name.toLowerCase().includes(name.toLowerCase()));
        if (!rec) return false;
        void people.interact(rec);
        return rec.name;
      },
      spot: (name) => {
        const rec = people.list.find((r) => r.active && r.name.toLowerCase().includes(name.toLowerCase()));
        return rec?.off ? { x: rec.pos.x + rec.off.x, z: rec.pos.z + rec.off.z } : null;
      },
      say: (name, text) => {
        const rec = people.list.find((r) => r.active && r.name.toLowerCase().includes(name.toLowerCase()));
        if (rec) people.say(rec, text || 'Hello!');
        return !!rec;
      },
    };
    return people;
  },
};
