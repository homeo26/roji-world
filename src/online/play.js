import * as THREE from 'three';
import { OnlineUI, loadCss } from './ui.js';
import { Remote, cleanState, cleanLook, lookString, POSES } from './remote.js';
import { CODE_RE } from './codes.js';
import { chooseHook } from '../engine/choose.js';
import { stepWalker, stepVertical, tryJump, faceTo, airOf, RADIUS } from '../engine/movement.js';
import { damp, clamp } from '../util.js';

// Play together: two people on two devices, each moving their own kid in the same island.
// src/main.js loads this module when the player opens Play together (or a ?room=CODE link) and calls:
//   frame(dt, t)  after the kids moved, before they are drawn (the other kid follows its states)
//   late()        just before drawing (send our kid's state)
//   background()  while a minigame owns the screen (keep the room alive)
// and asks it about the partner: live() (a person moves the other kid), leading()/following() (hands),
// carTaken()/carLabel() (the other player is driving), pressed(hotspot), hands(), arena(id, on).
// Shared moments are events: hands-ask/yes/no/off, act/act-join/act-no/act-end (an activity for two),
// game (a minigame started). Stamps, gifts and notes stay on each device.

// How the invitations name the buildings ("Roji went into the cinema")
const PLACE_NAMES = {
  home: 'the house',
  cinema: 'the cinema',
  clay: 'the Clay Café',
  yumyum: "Roji's YumYum",
  odeh: "Odeh's house",
  hospital: 'the hospital',
  tech: 'the Tech Studio',
  driving: 'the driving school',
  school: 'the school',
  ski: 'the ski lodge',
  horse: 'the stables',
  fencing: 'the fencing club',
  boardgames: 'the board games café',
  drawing: 'the drawing studio',
};
const SEND_MOVING = 1000 / 12;
const SEND_STILL = 1000;
const HOLD_GAP = 0.64;
const otherId = (id) => (id === 'roji' ? 'homama' : 'roji');
const r2 = (v) => Math.round(v * 100) / 100;
const r1 = (v) => Math.round(v * 10) / 10;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const leftOf = (yaw, d) => new THREE.Vector3(Math.cos(yaw) * d, 0, -Math.sin(yaw) * d);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
async function waitFor(cond, ms) {
  const end = performance.now() + ms;
  while (!cond()) {
    if (performance.now() > end) return false;
    await sleep(100);
  }
  return true;
}

export function createOnline(h) {
  return new Online(h);
}

class Online {
  constructor(h) {
    this.h = h;
    this.ui = new OnlineUI({
      looks: h.looks,
      playerId: () => h.playerId(),
      onCreate: (who) => this.create(who),
      onJoin: (code) => this.join(code),
      onLeave: () => this.leave(),
      onChip: () => this.openDialog(),
    });
    this.net = null;
    this.room = null; // { code, role }
    this.remote = null;
    this.otherUid = null;
    this.isLive = false;
    this.sent = null;
    this.lastSend = 0;
    this.emoteSeq = 0;
    this.emoteTag = '';
    this.myEmote = { type: null, time: 0 };
    this.prevFlip = -1;
    this.lookRef = null;
    this.lookStr = '';
    this.holdRole = null; // 'lead' | 'follow'
    this.joining = null;
    this.out = null;
    this.joined = null;
    this.lastHot = null;
    this.tmp = new THREE.Vector3();
    this.actHook = { start: (spec) => this.onActStart(spec), end: (c, silent, replacing) => this.onActEnd(c, silent, replacing) };
    // Answer the place's questions the way the other player did, while joining their activity
    chooseHook.picked = (spec, v) => {
      if (this.lastHot && typeof v === 'string' && v.length <= 24 && this.lastHot.picks.length < 4) this.lastHot.picks.push(v);
    };
    chooseHook.auto = (spec) => {
      const j = this.joining;
      if (!j || performance.now() > j.until || !j.picks.length) return undefined;
      const v = j.picks.shift();
      return spec.options?.some((o) => o.id === v) ? v : undefined;
    };
  }

  // ---------------------------------------------------------------- questions from the game
  live() {
    return this.isLive;
  }
  inRoom() {
    return !!this.room;
  }
  leading() {
    return this.holdRole === 'lead';
  }
  following() {
    return this.holdRole === 'follow' && this.remote?.cur?.space === this.h.spaceId();
  }
  carTaken() {
    const s = this.remote?.cur;
    return this.isLive && s?.mount === 'car' && s.pose === 'drive' && s.space === 'town' && this.h.spaceId() === 'town';
  }
  carLabel() {
    return this.carTaken() ? `Ride with ${this.name()}` : null;
  }
  name(id = this.remoteId()) {
    return this.h.looks[id]?.name || id;
  }
  remoteId() {
    return otherId(this.h.playerId());
  }
  // her / him for the other kid
  them(id = this.remoteId()) {
    return this.h.looks[id]?.gender === 'boy' ? 'him' : 'her';
  }
  toast(html, ms = 3200) {
    this.h.toast(html, ms);
  }

  // ---------------------------------------------------------------- the window
  async open({ join = null } = {}) {
    await loadCss();
    this.getNet().catch(() => {}); // start downloading while the window is up
    if (join && !this.room) {
      this.ui.show('start', { code: join });
      this.ui.open();
      this.join(join);
      return;
    }
    this.openDialog();
  }

  openDialog() {
    if (this.room) this.ui.show('room', this.roomView());
    else this.ui.show('start', {});
    this.ui.open();
  }

  roomView() {
    return { code: this.room.code, role: this.room.role, link: this.link(), other: this.remoteId(), here: this.isLive };
  }

  link() {
    return `${location.origin}${location.pathname}?room=${this.room.code}`;
  }

  getNet() {
    this.netP ||= import('./net.js').then((m) => (this.net = new m.Net()));
    this.netP.catch(() => (this.netP = null));
    return this.netP;
  }

  fail(e, view = {}) {
    const code = e?.code || '';
    let msg = 'Something went wrong. Please try again in a moment.';
    if (code === 'closed') msg = 'That room is not open: check the code, or ask for a new one. A room has space for two players.';
    else if (code === 'nocode') msg = 'No free room right now. Please try again.';
    else if (code === 'timeout' || /network|offline|fetch|import|module|failed/i.test(`${code} ${e?.message}`)) msg = 'We could not reach the online playground. Check the internet and try again. You can keep playing here on your own.';
    if (code !== 'closed' && code !== 'nocode') console.warn('online play:', code || e?.message);
    this.ui.show('start', { ...view, msg, msgKind: 'bad' });
  }

  async create(who) {
    if (this.busy || this.room) return;
    this.busy = true;
    this.ui.show('busy', { busy: 'Making a room' });
    try {
      const net = await this.getNet();
      this.h.becomePlayer(who);
      const code = await net.create();
      this.enterRoom(code, 'host');
      this.ui.show('room', this.roomView());
    } catch (e) {
      this.fail(e);
    } finally {
      this.busy = false;
    }
  }

  async join(raw) {
    const code = String(raw || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    if (!CODE_RE.test(code)) {
      this.ui.show('start', { code, msg: 'A room code has 6 letters and numbers, like ABC234.', msgKind: 'bad' });
      return;
    }
    if (this.busy || this.room) return;
    this.busy = true;
    this.ui.show('busy', { busy: `Joining room ${code}` });
    try {
      const net = await this.getNet();
      const r = await net.join(code);
      if (r.role === 'guest') {
        // The guest plays whoever the host does not, and starts beside the host
        if (r.hostState?.who === this.h.playerId()) this.h.becomePlayer(otherId(r.hostState.who));
        this.arriving = true;
        const url = new URL(location.href);
        url.searchParams.set('room', code);
        history.replaceState(null, '', url);
      }
      this.enterRoom(code, r.role);
      this.ui.close();
      this.toast(`You are in the room. Finding ${this.name()}...`, 2600);
    } catch (e) {
      this.fail(e, { code });
    } finally {
      this.busy = false;
    }
  }

  // The guest plays whoever the host does not
  takeOther(hostWho) {
    if (this.room?.role !== 'guest' || (hostWho !== 'roji' && hostWho !== 'homama')) return;
    if (hostWho === this.h.playerId()) {
      this.h.becomePlayer(otherId(hostWho));
      this.sent = null;
    }
  }

  enterRoom(code, role) {
    this.room = { code, role };
    this.savedLooks = { roji: { ...this.h.looks.roji }, homama: { ...this.h.looks.homama } };
    this.sent = null;
    this.lastSeen = null;
    this.h.activities.hook = this.actHook;
    this.net.watch({
      onOther: (uid) => this.onOther(uid),
      onState: (v) => this.onState(v),
      onEvent: (ev) => this.onEvent(ev),
      onClosed: () => this.onClosed(),
      onConnection: () => this.updateChip(),
    });
    this.updateChip();
  }

  exitRoom() {
    this.room = null;
    this.otherUid = null;
    this.arriving = false;
    this.h.activities.hook = null;
    this.joining = this.out = this.joined = null;
    this.ui.chip(false);
    this.ui.clearInvite();
    const url = new URL(location.href);
    if (url.searchParams.has('room')) {
      url.searchParams.delete('room');
      history.replaceState(null, '', url);
    }
  }

  async leave() {
    if (!this.room) return this.ui.close();
    const was = this.room.role;
    this.goSolo(null);
    this.exitRoom();
    this.ui.close();
    await this.net.leave();
    this.toast(was === 'host' ? 'Room closed. Back to playing on your own.' : 'You left the room. Back to playing on your own.', 3000);
  }

  onClosed() {
    if (!this.room) return;
    const name = this.name();
    this.goSolo(null);
    this.exitRoom();
    this.net.leave();
    this.toast(`${name} closed the room. You can keep playing here.`, 4200);
    if (this.ui.isOpen) this.ui.show('start', { msg: `${name} closed the room.`, msgKind: 'bad' });
  }

  onOther(uid) {
    const prev = this.otherUid;
    this.otherUid = uid;
    if (prev && !uid) {
      const name = this.name();
      this.goSolo(`${name} left the room. ${name} walks with you again.`);
    }
    if (this.ui.isOpen && this.ui.view === 'room') this.ui.show('room', this.roomView());
    this.updateChip();
  }

  // ---------------------------------------------------------------- the other player's states
  onState(v) {
    if (!this.room || !v) return;
    if (this.room.role === 'guest') this.takeOther(v.who);
    const rid = this.remoteId();
    const s = cleanState(v, rid);
    if (!s) return;
    if (!this.remote || this.remote.id !== rid) this.remote = new Remote(this.h, rid);
    if (s.look && s.look !== this.remoteLook) {
      this.remoteLook = s.look;
      const L = cleanLook(s.look, rid);
      if (L && JSON.stringify(L) !== JSON.stringify(this.h.looks[rid])) {
        this.h.looks[rid] = L;
        this.h.actors[rid].kid.setLook(L);
        this.h.refreshLooks();
      }
    }
    this.remote.push(s);
    if (!this.isLive) this.goLive();
    if (this.arriving) this.arrive(s);
  }

  goLive() {
    this.isLive = true;
    const g = this.h.game;
    if (this.h.activities.active) this.h.activities.end(true);
    if (this.h.holding()) this.h.setHolding(false);
    g.partnerBusy = 'online';
    document.body.dataset.olRemote = this.remoteId(); // the wardrobe shows only our own kid
    this.lastSeen = null;
    this.ui.clearInvite();
    if (this.ui.isOpen && this.ui.view === 'room') this.ui.show('room', this.roomView());
    this.toast(`<b>${esc(this.name())}</b> is here! You each move your own kid now.`, 3600);
    this.updateChip();
  }

  // Back to one player: the other kid is the computer partner again
  goSolo(msg) {
    if (!this.isLive) {
      if (msg) this.toast(msg, 3600);
      return;
    }
    this.isLive = false;
    const h = this.h;
    if (this.holdRole) this.letGo(false);
    if (h.mount()?.ride) h.dismount();
    if (h.activities.active && h.activities.current?._ol) h.activities.end(true);
    this.joining = this.out = this.joined = null;
    const rid = this.remote?.id || this.remoteId();
    this.remote?.release();
    this.remote = null;
    this.remoteLook = null;
    if (h.game.partnerBusy === 'online') h.game.partnerBusy = null;
    delete document.body.dataset.olRemote;
    if (h.scooting()) h.stopScooting(); // the partner's scooter went with the other player
    if (this.savedLooks?.[rid]) {
      h.looks[rid] = { ...this.savedLooks[rid] };
      h.actors[rid].kid.setLook(h.looks[rid]);
      h.refreshLooks(true);
    }
    // The partner comes back to the player's side
    const P = h.actors[h.playerId()];
    const C = h.actors[rid];
    if (C.pos.distanceTo(P.pos) > 6 || !C.kid.root.visible) {
      C.pos.copy(P.pos).add(leftOf(P.yaw, 0.9));
      C.y = P.y;
      C.vel.set(0, 0, 0);
      h.fx.poof(C.pos);
    }
    C.kid.root.visible = true;
    this.ui.clearInvite();
    if (msg) this.toast(msg, 3600);
    this.updateChip();
  }

  // The guest's first look at the host: go to the same place and stand beside them
  async arrive(s) {
    this.arriving = false;
    const ok = await this.goToSpace(s.space);
    const cur = this.remote?.cur || s;
    const O = ok && this.remote?.origin(cur.space);
    if (!O) return;
    const side = leftOf(cur.yaw, 0.9);
    this.h.placePlayer(O.x + cur.x + side.x, O.z + cur.z + side.z);
    this.h.fx.poof(this.h.actors[this.h.playerId()].pos);
    this.toast(`Here you are, together with <b>${esc(this.name())}</b>!`, 3000);
  }

  async goToSpace(space) {
    const sp = this.h.spaces;
    if (this.h.spaceId() === space) return true;
    if (space !== 'town' && !sp.interiors[space]) return false;
    if (this.h.mount()) this.h.dismount();
    if (sp.inside) {
      sp.exit();
      await waitFor(() => !sp.inside, 4000);
      await sleep(120);
    }
    if (space !== 'town') {
      await waitFor(() => !sp.entering, 4000);
      sp.enter(space, { force: true });
      await waitFor(() => sp.inside?.id === space, 9000);
    }
    await sleep(450); // the screen fades back in
    if (this.h.spaceId() !== space) return false;
    this.standBeside();
    return true;
  }

  // Through the same door as the other kid: stand at their side, not on top of them
  standBeside() {
    const net = this.remote?.netPos();
    const P = this.h.actors[this.h.playerId()];
    if (!net || net.distanceTo(P.pos) > 1) return;
    const side = leftOf(this.remote.cur.yaw, 0.9);
    this.h.placePlayer(net.x + side.x, net.z + side.z);
  }

  // ---------------------------------------------------------------- events
  onEvent(ev) {
    if (!this.room) return;
    const d = ev.data || {};
    const name = this.name();
    switch (ev.type) {
      case 'hands-ask':
        if (!this.isLive || this.holdRole) return;
        this.ui.invite({ key: 'hands', who: this.remoteId(), html: `<b>${esc(name)}</b> wants to hold your hand`, yes: 'Yes', onYes: () => this.acceptHands(), onNo: (expired) => !expired && this.net.sendEvent('hands-no') });
        break;
      case 'hands-yes':
        if (!this.isLive || this.holdRole || !this.asked || performance.now() - this.asked > 30000) return this.net.sendEvent('hands-off');
        this.asked = 0;
        this.holdRole = 'lead';
        this.remote?.setLocal('hands');
        this.h.setHolding(true, d.side === -1 ? -1 : 1);
        this.toast(`<b>${esc(name)}</b> is holding your hand. You lead the way.`, 2600);
        break;
      case 'hands-no':
        this.asked = 0;
        this.toast(`${esc(name)} said maybe later.`, 2200);
        break;
      case 'hands-off':
        this.ui.clearInvite('hands');
        if (this.holdRole) this.letGo(false);
        break;
      case 'act':
        this.onRemoteAct(d);
        break;
      case 'act-join':
        this.onActJoin(d.id);
        break;
      case 'act-no':
        if (this.out?.id === d.id) this.toast(`${esc(name)} is busy right now.`, 2000);
        break;
      case 'act-end':
        this.onRemoteActEnd(d.id);
        break;
      case 'game':
        if (typeof d.title === 'string' && d.on) this.toast(`${esc(name)} is playing <b>${esc(d.title.slice(0, 40))}</b>`, 2600);
        break;
    }
  }

  // ---------------------------------------------------------------- hand in hand
  // H or the hands button while someone is in the room. Returns true when it was handled here.
  hands() {
    if (!this.isLive) return false;
    const name = this.name();
    if (this.holdRole) {
      this.letGo(true);
      return true;
    }
    if (this.ui.inviteKey() === 'hands') {
      this.ui.answer(true);
      return true;
    }
    const s = this.remote?.cur;
    if (!s || !this.remote.fresh || s.space !== this.h.spaceId()) {
      this.toast(`${esc(name)} is not here right now.`, 2000);
      return true;
    }
    if (s.mount !== 'none') {
      this.toast(`${esc(name)} is riding right now.`, 2000);
      return true;
    }
    if (this.asked && performance.now() - this.asked < 8000) {
      this.toast(`Waiting for ${esc(name)} to say yes...`, 2000);
      return true;
    }
    this.asked = performance.now();
    this.net.sendEvent('hands-ask');
    this.toast(`You asked ${esc(name)} to hold hands.`, 2400);
    return true;
  }

  acceptHands() {
    const h = this.h;
    const L = h.actors[this.remoteId()];
    const P = h.actors[h.playerId()];
    if (!this.isLive || this.remote?.cur?.space !== h.spaceId()) return this.toast(`${esc(this.name())} is somewhere else now.`, 2000);
    if (h.mount()) h.dismount();
    if (h.activities.active) h.activities.end();
    h.stopScooting();
    const l = leftOf(L.yaw, 1);
    this.holdSign = (P.pos.x - L.pos.x) * l.x + (P.pos.z - L.pos.z) * l.z >= 0 ? 1 : -1;
    this.holdRole = 'follow';
    this.grip = false;
    this.pushT = 0;
    this.net.sendEvent('hands-yes', { side: this.holdSign });
    h.setHandsUi(true);
    this.toast(`Hand in hand with <b>${esc(this.name())}</b>. Push the stick to let go.`, 2800);
  }

  letGo(tell) {
    const role = this.holdRole;
    if (!role) return;
    this.holdRole = null;
    if (tell) this.net?.sendEvent('hands-off');
    const h = this.h;
    if (role === 'lead') {
      if (h.holding()) h.setHolding(false);
      this.remote?.setLocal(null);
    } else h.setHandsUi(false);
    h.actors.roji.kid.holdSide = 0;
    h.actors.homama.kid.holdSide = 0;
  }

  // The follower's own kid walks at the leader's side (main.js calls this instead of the stick)
  follow(dt, intent) {
    const h = this.h;
    const P = h.actors[h.playerId()];
    const L = h.actors[this.remoteId()];
    if (intent > 0.6) {
      this.pushT += dt;
      if (this.pushT > 0.35) {
        this.letGo(true);
        this.toast('You let go.', 1600);
        return false;
      }
    } else this.pushT = 0;
    const side = leftOf(L.yaw, this.holdSign);
    const tx = L.pos.x + side.x * HOLD_GAP;
    const tz = L.pos.z + side.z * HOLD_GAP;
    const dx = tx - P.pos.x;
    const dz = tz - P.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > 14) {
      h.fx.poof(P.pos);
      P.pos.set(tx, 0, tz);
      h.physics.resolve(P.pos, RADIUS, P.vel, { feet: L.y });
      P.y = L.y;
      this.grip = false;
    } else if (!this.grip || d > 1.2) {
      stepWalker(P, h.physics, dx, dz, clamp(d * 2, 0, 1), d > 3 ? 7.2 : 5.4, 14, dt);
      if (P.speed > 0.25) faceTo(P, dt, Math.atan2(P.vel.x, P.vel.z));
      else faceTo(P, dt, L.yaw, 8);
      if (d < 0.35) this.grip = true;
    } else {
      const bx = P.pos.x;
      const bz = P.pos.z;
      P.pos.x = damp(P.pos.x, tx, 14, dt);
      P.pos.z = damp(P.pos.z, tz, 14, dt);
      h.physics.resolve(P.pos, RADIUS, P.vel, { feet: P.y });
      P.vel.set((P.pos.x - bx) / Math.max(dt, 1e-3), 0, (P.pos.z - bz) / Math.max(dt, 1e-3));
      P.speed = Math.min(L.speed + 0.01, Math.hypot(P.vel.x, P.vel.z));
      faceTo(P, dt, L.yaw, 14);
    }
    // Hop when they hop
    const up = L.y - (L.ground ?? 0) > 0.25;
    if (up && !this.hopped && airOf(P) < 0.02) tryJump(P);
    this.hopped = up;
    stepVertical(P, h.physics, dt, h.spaces.waterAt(P.pos.x, P.pos.z));
    const linked = d < 0.3;
    P.kid.holdSide = linked ? -this.holdSign : 0;
    L.kid.holdSide = linked ? this.holdSign : 0;
    P.idle = 0;
    return true;
  }

  // Hands come apart when either kid rides, swims, sits down, goes elsewhere or the other player is away
  checkHands(dt) {
    const role = this.holdRole;
    if (!role) return;
    const h = this.h;
    const s = this.remote?.cur;
    const P = h.actors[h.playerId()];
    const C = h.actors[this.remoteId()];
    const apart = !this.remote?.fresh || !s || s.mount !== 'none' || s.pose !== 'stand' || h.mount() || h.scooting() || h.activities.active || P.mode === 'swim' || C.mode === 'swim' || (role === 'lead' && !h.holding());
    const elsewhere = s && s.space !== h.spaceId();
    if (apart && !elsewhere) {
      // Kept for the debug view: which condition let go
      this.lastDrop = !this.remote?.fresh ? 'stale' : !s ? 'nostate' : s.mount !== 'none' ? 'mount:' + s.mount : s.pose !== 'stand' ? 'pose:' + s.pose : h.mount() ? 'mymount' : h.scooting() ? 'scoot' : h.activities.active ? 'activity' : P.mode === 'swim' || C.mode === 'swim' ? 'swim' : 'notholding';
      return this.letGo(true);
    }
    // The leader's screen walks the follower itself; if that copy got caught on something the follower's
    // own device walked round, it comes back to where they really are
    if (role === 'lead') {
      const net = this.remote.netPos();
      this.offT = net && net.distanceTo(C.pos) > 2.2 ? (this.offT || 0) + dt : 0;
      if (this.offT > 1.5) {
        this.offT = 0;
        C.pos.copy(net);
        C.vel.set(0, 0, 0);
      }
    }
    // Through a door hand in hand: the follower goes in (or out) too
    if (role === 'follow' && elsewhere && !this.followingDoor) {
      this.followingDoor = true;
      this.goToSpace(s.space).then(() => (this.followingDoor = false));
    }
  }

  // ---------------------------------------------------------------- activities for two
  // A hotspot was pressed (main.js): if it starts an activity, the other player can join the same one
  pressed(hs) {
    this.lastHot = { label: typeof hs?.label === 'string' ? hs.label.slice(0, 40) : '', at: performance.now(), picks: [] };
  }

  seatLocal(s, id, O) {
    const a = this.h.actors[id];
    const out = { id, x: r2(s.x - O.x), z: r2(s.z - O.z), y: r2(s.y ?? 0), yaw: r2(wrap(s.yaw ?? a?.yaw ?? 0)), pose: s.pose || 'sit' };
    if (s.hands) out.hands = String(s.hands).slice(0, 8);
    if (s.rot) out.rot = s.rot.map(r2);
    return out;
  }

  seatWorld(e, O) {
    return { x: O.x + e.x, z: O.z + e.z, y: e.y, yaw: e.yaw, pose: e.pose, hands: e.hands ?? null, rot: e.rot || undefined };
  }

  originOf(space) {
    if (space === 'town') return this.h.townOrigin;
    return this.h.spaces.interiors[space]?.space?.origin || null;
  }

  onActStart(spec) {
    if (!this.isLive || !this.remote) return spec;
    const A = this.h.activities;
    const rid = this.remote.id;
    const idOf = (w) => A.who(w)?.id;
    const now = performance.now();
    if (this.holdRole) this.letGo(true);
    const space = this.h.spaceId();
    const O = this.originOf(space);
    // Joining the other player's activity: everyone sits where they sat
    if (this.joining && now < this.joining.until && this.joining.inv.space === space) {
      const inv = this.joining.inv;
      const seats = [];
      const used = new Set();
      for (const s of spec.seats || []) {
        const id = idOf(s.who);
        if (!id || used.has(id)) continue;
        used.add(id);
        const e = inv.seats.find((q) => q.id === id);
        seats.push(e ? { ...s, ...this.seatWorld(e, O), who: id } : { ...s, who: id });
      }
      for (const e of inv.seats) if (!used.has(e.id)) seats.push({ ...this.seatWorld(e, O), who: e.id });
      if (this.joined !== inv.id) this.net.sendEvent('act-join', { id: inv.id });
      this.joined = inv.id;
      this.remote.setLocal('act');
      return { ...spec, seats, _ol: inv.id };
    }
    // Starting one here: keep the other kid's seat free and offer it to them
    const seats = spec.seats || [];
    const theirs = seats.filter((s) => idOf(s.who) === rid);
    const mine = seats.filter((s) => idOf(s.who) !== rid);
    const id = Math.random().toString(36).slice(2, 10);
    const hot = this.lastHot && now - this.lastHot.at < 30000 ? this.lastHot : null;
    this.lastHot = null;
    const msg = { id, space, label: String(spec.label || '').slice(0, 40), hot: hot?.label || '', picks: hot?.picks || [], invite: theirs.length > 0, seats: seats.filter((s) => idOf(s.who)).slice(0, 4).map((s) => this.seatLocal(s, idOf(s.who), O)) };
    if (spec.focus) msg.focus = { x: r2(spec.focus.x - O.x), z: r2(spec.focus.z - O.z), y: r2(spec.focus.y ?? 1), zoom: r2(spec.focus.zoom ?? 0.62) };
    if (typeof spec.night === 'number') msg.night = r2(spec.night);
    if (typeof spec.music === 'number') msg.music = r2(spec.music);
    for (const k of ['focus', 'picks', 'hot']) if (JSON.stringify(msg).length > 790) delete msg[k];
    if (JSON.stringify(msg).length <= 790) this.net.sendEvent('act', msg);
    this.out = { id, theirs };
    return { ...spec, seats: mine, _ol: id };
  }

  onActEnd(c, silent, replacing) {
    const id = c._ol;
    if (!id) return;
    if (replacing && this.joining && performance.now() < this.joining.until) return; // the place is starting the joined activity again
    if (this.joined === id) {
      this.joined = null;
      this.joining = null;
      this.remote?.setLocal(null);
    }
    if (this.out?.id === id) {
      this.out = null;
      if (this.remote?.local === 'act') this.remote.setLocal(null);
    }
    if (!this.endingFromRemote) this.net?.sendEvent('act-end', { id });
  }

  validAct(d) {
    if (!d || typeof d.id !== 'string' || d.id.length > 12 || typeof d.space !== 'string' || !/^[a-z0-9_-]{1,24}$/.test(d.space) || !Array.isArray(d.seats)) return null;
    const n = (v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 5000;
    const seats = d.seats
      .filter((s) => s && (s.id === 'roji' || s.id === 'homama') && n(s.x) && n(s.z) && n(s.y) && n(s.yaw) && POSES.has(s.pose))
      .map((s) => ({ id: s.id, x: s.x, z: s.z, y: s.y, yaw: s.yaw, pose: s.pose, hands: typeof s.hands === 'string' ? s.hands : null, rot: Array.isArray(s.rot) && s.rot.length === 3 && s.rot.every(n) ? s.rot : undefined }));
    const focus = d.focus && n(d.focus.x) && n(d.focus.z) ? { x: d.focus.x, z: d.focus.z, y: n(d.focus.y) ? d.focus.y : 1, zoom: n(d.focus.zoom) ? d.focus.zoom : 0.62 } : null;
    return {
      id: d.id,
      space: d.space,
      label: typeof d.label === 'string' ? d.label.slice(0, 40) : '',
      hot: typeof d.hot === 'string' ? d.hot.slice(0, 40) : '',
      picks: Array.isArray(d.picks) ? d.picks.filter((p) => typeof p === 'string').slice(0, 4) : [],
      invite: !!d.invite,
      seats,
      focus,
      night: n(d.night) ? d.night : undefined,
      music: n(d.music) ? d.music : undefined,
    };
  }

  onRemoteAct(raw) {
    const d = this.validAct(raw);
    if (!d || !this.remote) return;
    const rid = this.remote.id;
    const pid = this.h.playerId();
    this.remoteAct = d;
    const own = d.seats.find((s) => s.id === rid);
    this.remote.seat = own ? { ...own, space: d.space } : null;
    if (!d.invite || !d.seats.some((s) => s.id === pid)) return;
    const name = esc(this.name());
    const what = d.hot ? `invites you: <b>${esc(d.hot)}</b>` : 'kept a seat for you';
    this.ui.invite({
      key: `act:${d.id}`,
      who: rid,
      html: `<b>${name}</b> ${what}`,
      yes: 'Join',
      ms: 30000,
      onYes: () => this.joinAct(d),
      onNo: (expired) => !expired && this.net.sendEvent('act-no', { id: d.id }),
    });
  }

  async joinAct(d) {
    const h = this.h;
    if (!this.isLive || this.remoteAct?.id !== d.id) return;
    if (h.arenaActive()) return;
    if (h.mount()) h.dismount();
    if (h.activities.active) h.activities.end();
    if (!(await this.goToSpace(d.space))) return this.toast('That is somewhere we cannot go just now.', 2200);
    if (this.remoteAct?.id !== d.id) return this.toast(`${esc(this.name())} already got up.`, 2200);
    this.joining = { inv: d, until: performance.now() + 12000, picks: [...d.picks] };
    const hs = d.hot && h.hotspots().find((q) => q.label === d.hot && q.when());
    if (hs) {
      try {
        hs.act();
      } catch (e) {
        console.warn('online join:', e?.message);
      }
    }
    // The place may need a moment (a question, a model loading); if nothing started, sit down anyway
    const ok = await waitFor(() => this.joined === d.id, hs ? 2500 : 0);
    if (ok) return this.danceAlong();
    if (!this.joining || this.remoteAct?.id !== d.id) return;
    const O = this.originOf(d.space);
    h.activities.start({
      label: d.label || 'Get up',
      seats: d.seats.map((e) => ({ ...this.seatWorld(e, O), who: e.id })),
      focus: d.focus ? { x: O.x + d.focus.x, z: O.z + d.focus.z, y: d.focus.y, zoom: d.focus.zoom } : undefined,
      night: d.night,
      music: d.music,
    });
  }

  onActJoin(id) {
    const A = this.h.activities;
    if (!this.out || this.out.id !== id || A.current?._ol !== id || !this.remote) return;
    const a = this.h.actors[this.remote.id];
    this.remote.setLocal('act');
    for (const s of this.out.theirs) A.seat(a, s);
    if (!A.current.seated.includes(a)) A.current.seated.push(a);
    this.danceAlong();
    this.toast(`<b>${esc(this.name())}</b> joined you`, 2200);
  }

  // A dance for two: the other kid, moved here for now, keeps dancing as long as ours does
  danceAlong() {
    const me = this.h.actors[this.h.playerId()].kid;
    const a = this.h.actors[this.remoteId()];
    if (!me.danceLoop || this.remote?.local !== 'act') return;
    a.kid.danceLoop = true;
    a.kid.emote(me.emoteType || 'dance');
  }

  onRemoteActEnd(id) {
    const A = this.h.activities;
    this.ui.clearInvite(`act:${id}`);
    if (this.remoteAct?.id === id) {
      this.remoteAct = null;
      if (this.remote) this.remote.seat = null;
    }
    if (this.joining?.inv.id === id) this.joining = null;
    if (A.current?._ol === id) {
      this.endingFromRemote = true;
      try {
        A.end();
      } finally {
        this.endingFromRemote = false;
      }
    }
  }

  // ---------------------------------------------------------------- minigames
  arena(id, on) {
    if (!this.isLive) return;
    if (on) this.net.sendEvent('game', { id: String(id).slice(0, 24), title: this.h.gameTitle(id), on: true });
  }

  // ---------------------------------------------------------------- every frame
  frame(dt, t) {
    if (!this.room) return;
    const h = this.h;
    if (this.isLive && !h.game.partnerBusy) h.game.partnerBusy = 'online';
    const space = h.spaceId();
    if (space !== this.mySpace) {
      this.mySpace = space;
      this.lastHot = null; // a door was the last thing pressed, not an activity
    }
    if (this.remote) {
      this.remote.update(dt, t);
      this.watchRemote();
    }
    this.checkHands(dt);
    if ((this.chipT = (this.chipT || 0) + dt) > 0.5) {
      this.chipT = 0;
      this.updateChip();
    }
  }

  late() {
    if (!this.room) return;
    this.remote?.late();
    this.send();
  }

  background() {
    if (this.room) this.send();
  }

  // What the other player just did that this player may want to join
  watchRemote() {
    const s = this.remote.cur;
    if (!s || !this.isLive) return;
    const prev = this.lastSeen;
    this.lastSeen = { space: s.space, mount: s.mount, pose: s.pose };
    if (!prev) return;
    const h = this.h;
    const mine = h.spaceId();
    const name = esc(this.name());
    if (s.space !== prev.space) {
      this.ui.clearInvite('car');
      if (s.space === mine) this.ui.clearInvite('space');
      else if (this.holdRole !== 'follow') {
        const rec = h.spaces.interiors[s.space];
        if (s.space === 'town') this.ui.invite({ key: 'space', who: this.remote.id, html: `<b>${name}</b> went outside. Go out too?`, yes: 'Go outside', ms: 30000, onYes: () => this.goToSpace('town') });
        else if (rec) this.ui.invite({ key: 'space', who: this.remote.id, html: `<b>${name}</b> went into ${esc(PLACE_NAMES[s.space] || rec.def.title || 'a building')}. Join ${this.them()}?`, yes: 'Join', ms: 30000, onYes: () => this.goToSpace(s.space) });
      }
    }
    const driving = s.mount === 'car' && s.pose === 'drive';
    const wasDriving = prev.mount === 'car' && prev.pose === 'drive';
    const m = h.mount();
    if (driving && !wasDriving) {
      if (m?.type === 'car' && !m.ride && this.room.role === 'guest') {
        h.dismount(); // both took the wheel at once: the host drives
        this.toast(`${name} got to the wheel first.`, 2200);
      }
      if (mine === 'town' && s.space === 'town' && !h.mount()) this.ui.invite({ key: 'car', who: this.remote.id, html: `<b>${name}</b> is driving. Ride along?`, yes: 'Ride along', ms: 30000, onYes: () => this.carTaken() && h.rideAlong() });
    }
    if (wasDriving && !driving) {
      this.ui.clearInvite('car');
      if (m?.type === 'car' && m.ride) {
        h.dismount();
        this.toast(`${name} parked the car.`, 2200);
      }
    }
  }

  // ---------------------------------------------------------------- our kid's state
  myState() {
    const h = this.h;
    const pid = h.playerId();
    const P = h.actors[pid];
    const k = P.kid;
    const m = h.mount();
    const space = h.spaceId();
    const O = this.originOf(space) || h.townOrigin;
    let x;
    let y;
    let z;
    let yaw = P.yaw;
    let speed = P.speed;
    let pose = k.pose;
    let mount = 'none';
    if (m?.type === 'car') {
      const cp = h.car.root.position;
      [x, y, z] = [cp.x, 0, cp.z];
      yaw = h.car.yaw;
      speed = m.ride ? 0 : h.car.speed;
      mount = 'car';
      pose = m.ride ? 'sit' : 'drive';
    } else if (m?.type === 'pony') {
      const pr = m.ctl.pony.root.position;
      [x, y, z] = [pr.x, pr.y, pr.z];
      speed = m.walker.speed;
      mount = 'pony';
      pose = 'ride';
    } else if (P.seated || (pose !== 'stand' && pose !== 'swim' && pose !== 'scoot')) {
      k.root.getWorldPosition(this.tmp);
      [x, y, z] = [this.tmp.x, this.tmp.y, this.tmp.z];
      speed = 0;
    } else {
      [x, y, z] = [P.pos.x, P.y, P.pos.z];
      if (h.scooting()) mount = 'scooter';
    }
    // A new move (or a flip) gets a new tag, so the same dance twice still shows twice
    const type = k.emoteType;
    if (type && (type !== this.myEmote.type || k.emoteTime < this.myEmote.time - 0.05)) this.emoteTag = `${type}.${++this.emoteSeq % 1000}`;
    this.myEmote = { type, time: k.emoteTime };
    if (P.flipT >= 0 && this.prevFlip < 0) this.emoteTag = `flip.${++this.emoteSeq % 1000}`;
    this.prevFlip = P.flipT;
    if (h.looks[pid] !== this.lookRef) {
      this.lookRef = h.looks[pid];
      this.lookStr = lookString(this.lookRef);
    }
    return { who: pid, x: r2(x - O.x), y: r2(y), z: r2(z - O.z), yaw: r2(wrap(yaw)), speed: r1(speed), pose: POSES.has(pose) ? pose : 'stand', mount, space, emote: this.emoteTag, look: this.lookStr };
  }

  send() {
    const net = this.net;
    if (!this.room || !net?.connected) return;
    const now = performance.now();
    const gap = now - this.lastSend;
    if (gap < 30) return;
    const st = this.myState();
    const prev = this.sent;
    const moved = !prev || Math.abs(st.x - prev.x) > 0.01 || Math.abs(st.z - prev.z) > 0.01 || Math.abs(st.y - prev.y) > 0.01 || Math.abs(wrap(st.yaw - prev.yaw)) > 0.02 || st.speed !== prev.speed;
    const changed = !prev || st.pose !== prev.pose || st.mount !== prev.mount || st.space !== prev.space || st.emote !== prev.emote || st.look !== prev.look || st.who !== prev.who;
    if (!changed && !(moved && gap >= SEND_MOVING - 4) && gap < SEND_STILL) return;
    const patch = {};
    for (const k of Object.keys(st)) if (!prev || st[k] !== prev[k]) patch[k] = st[k];
    patch.t = Date.now();
    net.sendState(patch);
    this.sent = { ...st };
    this.lastSend = now;
  }

  // ---------------------------------------------------------------- the chip
  updateChip() {
    if (!this.room) return this.ui.chip(false);
    const name = this.name();
    const rid = this.remoteId();
    if (!this.net?.connected) return this.ui.chip(true, 'wait', 'Connecting...', null);
    if (!this.otherUid) return this.ui.chip(true, 'wait', this.room.role === 'host' ? `Room ${this.room.code}: waiting for ${name}` : 'Waiting...', null);
    if (!this.isLive) return this.ui.chip(true, 'wait', `${name} is joining...`, rid);
    if (!this.remote?.fresh) return this.ui.chip(true, 'off', `${name} is away`, rid);
    this.ui.chip(true, 'live', `Playing with ${name}`, rid);
  }

  // Tests only
  debug() {
    return { room: this.room, live: this.isLive, other: this.otherUid, hold: this.holdRole, lastDrop: this.lastDrop || null, sinceRecv: this.remote ? Math.round(performance.now() - this.remote.lastRecv) : null, joined: this.joined, out: this.out?.id || null, remote: this.remote?.cur || null, mode: this.remote?.mode, local: this.remote?.local || null, connected: !!this.net?.connected, delay: this.remote?.delay };
  }
}
