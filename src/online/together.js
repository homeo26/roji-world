import { avatar } from '../games/avatar.js';
import { svgIcon } from '../icons.js';
import { kindOf, cleanResult, measure, compare } from './games.js';

// Minigames together. When one player in a room opens a minigame while the other is connected, the other
// gets "Homama started Kart Race. Play too?". Join opens the same game on their device with the same
// settings: the starter's answers to the game's question cards, the saved round or course it started
// from, the options it was opened with, and the shared seed (a kid picked by the starter becomes the
// joiner's own kid). Both play their own copy at the same time. A live strip shows the other's progress
// (the game's score badge, a few times a second through g/<uid>); the result card shows both results with
// a winner banner (or the total for co-op games) and Rematch invites the other again. A game tied to one
// kid (KINDS kind 'solo') is watched instead: the other sees the live score and can cheer.
// Events (ev/, from the other player): g-invite, g-set (more answers or settings from the starter), g-join,
// g-no, g-leave, g-cheer and g-m (a game's own message, ctx.online.send). State: g/<uid> { game, sid, t,
// live: { x: badge text, n: score, st: 'play' | 'done' | 'watch', r: round }, res: result, share }.
// The arena (src/engine/arena.js) and the 2D game shell (src/games/shell.js) ask for a session with
// begin(id, opts); a game sees it as ctx.online (Session.api(), documented in the stage B notes).

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const swapKid = (v) => (v === 'roji' ? 'homama' : v === 'homama' ? 'roji' : v);
const otherKid = (k) => (k === 'roji' ? 'homama' : 'roji');
const newSid = () => (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/g, '').slice(0, 10).padEnd(6, '0');
const J = (v) => JSON.stringify(v);
const parse = (s) => {
  try {
    return typeof s === 'string' ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};
const scalar = (v) => (typeof v === 'string' && v.length <= 40) || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v));
const SID_RE = /^[a-z0-9]{4,16}$/;
const ID_RE = /^[a-z0-9_-]{1,24}$/;
const LIVE_EVERY = 250; // ms between two live progress writes
const SHARE_EVERY = 90; // ms between two shared-state writes (ctx.online.share)
const SETTLE = 30000; // ms: a game's saved values read this soon after it starts are the starter's
const INVITE_MS = 30000;
const MSG_MAX = 760;
// What a game can listen to with ctx.online.on(type, fn) besides its own messages
const SYSTEM = new Set(['join', 'leave', 'finish', 'state', 'live', 'cheer', 'setting']);

// The options a game was opened with that can travel (plain values only; a kid becomes the other kid)
function cleanOpts(opts = {}) {
  const out = {};
  for (const [k, v] of Object.entries(opts || {})) if (k !== 'me' && /^[A-Za-z0-9_]{1,20}$/.test(k) && scalar(v) && Object.keys(out).length < 8) out[k] = v;
  return out;
}
const swapAll = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, swapKid(v)]));
// The text of a score badge (it is HTML): "Lap 2 / 3 1st"
function badgeText(html) {
  const d = document.createElement('div');
  d.innerHTML = String(html ?? '');
  return (d.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

// More answers, saved values or settings from the starter (g-set), into a session or an invitation.
// Returns the settings that changed: [[key, value]]
function applySet(o, d) {
  if (Array.isArray(d.p)) for (const [i, x] of d.p.slice(0, 8).entries()) if (!o.picks[i] && Array.isArray(x) && typeof x[1] === 'string') o.picks[i] = [String(x[0] ?? '').slice(0, 40), swapKid(x[1].slice(0, 24))];
  if (d.l && typeof d.l === 'object') for (const [k, v] of Object.entries(d.l)) if (!(k in o.loads) && /^[A-Za-z0-9_-]{1,40}$/.test(k) && scalar(v) && Object.keys(o.loads).length < 12) o.loads[k] = swapKid(v);
  const changed = [];
  if (d.v && typeof d.v === 'object')
    for (const [k, v] of Object.entries(d.v))
      if (/^[A-Za-z0-9_-]{1,24}$/.test(k) && scalar(v) && o.settings[k] !== swapKid(v)) {
        o.settings[k] = swapKid(v);
        changed.push([k, o.settings[k]]);
      }
  return changed;
}

export class Together {
  // o: the Online player (src/online/play.js): net, h, ui, room, isLive, remote, name(), remoteId()
  constructor(o) {
    this.o = o;
    this.h = o.h;
    this.sess = null; // the game this device plays (or watches) with the other player
    this.pending = null; // an invitation we said yes to, waiting for its game to open
    this.pg = null; // the other player's game state (g/<uid>)
    this.invites = new Map(); // sid -> invitation from the other player
    this.ui = new GameUi(this);
  }

  get net() {
    return this.o.net;
  }

  // The other player is in the room and connected (a moment without news, a busy phone, still counts)
  live() {
    return !!(this.o.room && this.o.isLive);
  }

  names() {
    return { me: this.o.name(this.h.playerId()), them: this.o.name() };
  }

  // A game is opening on this device (the arena or the 2D shell): the session to play it in, or null
  begin(id, opts = {}, where = '3d') {
    if (!this.o.room || !ID_RE.test(id)) return null;
    const p = this.pending;
    this.pending = null;
    if (this.sess?.mode === 'watch') this.sess.close({ quit: true }); // we play now, so we stop watching
    if (p && p.inv.id === id && performance.now() - p.at < 25000) return this.use(new Session(this, { ...p.inv, host: false, where }));
    if (!this.live()) return null;
    return this.use(new Session(this, { sid: newSid(), id, title: this.h.gameTitle(id), opts: cleanOpts(opts), host: true, where, seed: (Math.random() * 2 ** 31) >>> 0 }));
  }

  use(s) {
    if (this.sess && this.sess !== s) this.sess.close({ quit: true }, true);
    this.sess = s;
    return s;
  }

  // ---------------------------------------------------------------- from the room
  onEvent(ev) {
    const d = ev.data || {};
    const s = this.sess;
    if (ev.type === 'g-invite') return this.onInvite(d);
    if (typeof d.s !== 'string') return;
    if (ev.type === 'g-leave' || ev.type === 'g-no') {
      this.invites.delete(d.s);
      this.o.ui.clearInvite(`g:${d.s}`);
    }
    // Answers that come after the invitation: kept with it until Join opens the game
    if (ev.type === 'g-set' && (!s || s.sid !== d.s)) {
      const inv = this.invites.get(d.s) || (this.pending?.inv.sid === d.s ? this.pending.inv : null);
      if (inv) applySet(inv, d);
    }
    if (s && s.sid === d.s) s.onEvent(ev.type, d);
  }

  onGame(v) {
    this.pg = v && typeof v === 'object' && SID_RE.test(v.sid || '') && ID_RE.test(v.game || '') ? v : null;
    this.sess?.onG(this.pg && this.pg.sid === this.sess.sid ? this.pg : null);
  }

  // The other player went away (left the room or lost the connection)
  partnerGone() {
    this.invites.clear();
    this.pg = null;
    this.sess?.onG(null, true);
  }

  // ---------------------------------------------------------------- invitations
  onInvite(d) {
    if (!d || !SID_RE.test(d.s || '') || !ID_RE.test(d.id || '') || !this.o.room) return;
    const inv = {
      sid: d.s,
      id: d.id,
      title: typeof d.ti === 'string' ? d.ti.slice(0, 40) : this.h.gameTitle(d.id),
      mode: d.k === 'watch' ? 'watch' : 'play',
      where: d.w === '2d' ? '2d' : '3d',
      opts: swapAll(cleanOpts(d.o)),
      picks: Array.isArray(d.p) ? d.p.filter((x) => Array.isArray(x) && typeof x[1] === 'string').slice(0, 8).map((x) => [String(x[0] ?? '').slice(0, 40), swapKid(x[1].slice(0, 24))]) : [],
      loads: swapAll(Object.fromEntries(Object.entries(d.l || {}).filter(([k, v]) => /^[A-Za-z0-9_-]{1,40}$/.test(k) && scalar(v)).slice(0, 12))),
      settings: swapAll(Object.fromEntries(Object.entries(d.v || {}).filter(([k, v]) => /^[A-Za-z0-9_-]{1,24}$/.test(k) && scalar(v)).slice(0, 8))),
      seed: Number.isFinite(d.sd) ? d.sd >>> 0 : 1,
      rematch: !!d.re,
      at: performance.now(),
    };
    this.invites.set(inv.sid, inv);
    const s = this.sess;
    // Watching already: follow the player into their next game without asking again
    if (s?.mode === 'watch' && inv.mode === 'watch' && s.id === inv.id) return this.watch(inv);
    // Both of us opened the same game at once: one session wins (the smaller id), the other side joins it
    if (s?.host && s.id === inv.id && s.pState === 'wait' && !s.done) {
      if (s.sid < inv.sid) return;
      return s.becomeGuest(inv);
    }
    const name = esc(this.o.name());
    const game = `<b>${esc(inv.title)}</b>`;
    const html = inv.mode === 'watch' ? `<b>${name}</b> ${esc(kindOf(inv.id).doing || 'is playing')}: ${game}. Watch and cheer?` : inv.rematch ? `<b>${name}</b> wants a rematch: ${game}. Play again?` : `<b>${name}</b> started ${game}. Play too?`;
    this.o.ui.invite({
      key: `g:${inv.sid}`,
      who: this.o.remoteId(),
      html,
      yes: inv.mode === 'watch' ? 'Watch' : 'Join',
      ms: INVITE_MS,
      game: true,
      onYes: () => this.accept(inv),
      onNo: (expired) => {
        this.invites.delete(inv.sid);
        if (!expired) this.net?.sendEvent('g-no', { s: inv.sid });
      },
    });
  }

  // Join (or watch) the other player's game
  async accept(inv) {
    const h = this.h;
    if (!this.live() || !this.invites.has(inv.sid)) return this.o.toast(`${esc(this.o.name())} already closed ${esc(inv.title)}.`, 2400);
    this.invites.delete(inv.sid);
    if (inv.mode === 'watch') {
      // Watching happens in the town: close our own game first
      if (h.arena.active) h.arena.end({ quit: true });
      if (h.gameOpen()) h.closeGame2d();
      return this.watch(inv);
    }
    // Rematch while still on the result card of the same game: start it again here
    const cur = h.arena.current;
    if (h.arena.active && cur?.id === inv.id && cur.sess) {
      this.pending = { inv, at: performance.now() };
      return h.arena.again(true);
    }
    if (h.arena.active) h.arena.end({ quit: true });
    if (h.gameOpen()) h.closeGame2d();
    await sleep(60);
    if (h.activities.active) h.activities.end();
    if (h.mount()) h.dismount();
    this.pending = { inv, at: performance.now() };
    h.openGame(inv.id, inv.opts);
  }

  watch(inv) {
    const s = new Session(this, { ...inv, host: false, where: 'watch' });
    s.mode = 'watch';
    this.use(s);
    s.joinNow();
    this.ui.watchOpen(s);
  }

  // ---------------------------------------------------------------- the town around it
  frame() {
    if (this.sess?.mode === 'watch') this.ui.watchTick(this.sess);
  }

  leaveRoom() {
    this.sess?.close({ quit: true });
    this.sess = null;
    this.pending = null;
    this.invites.clear();
    this.pg = null;
    this.ui.hideAll();
  }

  debug() {
    const s = this.sess;
    return s ? { sid: s.sid, id: s.id, host: s.host, mode: s.mode, pState: s.pState, pLive: s.pLive, pRes: s.pRes, myRes: s.myRes, live: s.myLive, picks: s.picks, loads: s.loads, cheers: s.cheers, sent: s.sent, got: s.got } : null;
  }
}

class Session {
  constructor(T, o) {
    this.T = T;
    this.sid = o.sid;
    this.id = o.id;
    this.title = o.title || o.id;
    this.host = !!o.host;
    this.where = o.where || '3d';
    this.opts = o.opts || {};
    this.seed = o.seed >>> 0 || 1;
    this.K = kindOf(this.id);
    this.mode = this.K.kind === 'solo' && !this.host ? 'watch' : 'play';
    this.me = T.h.playerId();
    this.partner = otherKid(this.me);
    this.picks = o.picks ? o.picks.map((p) => [...p]) : []; // [title, value]: the starter's answers, in order
    this.used = new Set();
    this.loads = { ...(o.loads || {}) };
    this.settings = { ...(o.settings || {}) };
    this.rematch = !!o.rematch;
    this.pState = this.host ? 'wait' : 'play'; // the other player: wait, play, done, no, left, away
    this.pJoined = !this.host;
    this.pLive = null;
    this.pRes = null;
    this.pShare = null;
    this.myLive = { x: '', n: null, st: this.mode === 'watch' ? 'watch' : 'play', r: 0 };
    this.myRes = null;
    this.round = 0;
    this.cheers = 0;
    this.handlers = new Map();
    this.waiters = [];
    this.startedAt = this.createdAt = performance.now();
    this.invited = false;
    this.closed = false;
    this.sent = 0;
    this.got = 0;
    if (this.host) this.inviteTimer = setTimeout(() => this.invite(), 5000); // a slow start still invites soon
  }

  get net() {
    return this.T.net;
  }

  get done() {
    return !!this.myRes;
  }

  // ---------------------------------------------------------------- ctx.online
  api() {
    const S = this;
    return {
      inRoom: true,
      me: S.me,
      partner: S.partner,
      kind: S.K.kind,
      // These three can change once: both opened the same game at once and the other's session won
      get isHost() {
        return S.host;
      },
      get sid() {
        return S.sid;
      },
      get seed() {
        return S.seed;
      },
      get partnerHere() {
        return S.pState === 'play' || S.pState === 'done';
      },
      get partnerState() {
        return S.pShare;
      },
      get partnerLive() {
        return S.pLive ? { ...S.pLive } : null;
      },
      get partnerResult() {
        return S.pRes ? { ...S.pRes } : null;
      },
      send: (type, data) => S.send(type, data),
      on: (type, fn) => S.on(SYSTEM.has(type) ? type : `m:${type}`, fn),
      share: (state) => S.share(state),
      score: (n) => S.score(n),
      progress: (text) => S.progress(text),
      finished: (result) => S.finished(result),
      next: () => S.next(),
      setting: (key, value) => S.setting(key, value),
      now: () => S.net?.serverNow() ?? Date.now(),
      waitPartner: (ms) => S.waitPartner(ms),
      cheer: () => S.cheer(),
    };
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.handlers.get(type)?.delete(fn);
  }

  emit(type, ...a) {
    for (const fn of this.handlers.get(type) || []) {
      try {
        fn(...a);
      } catch (e) {
        console.error(`online game handler ${type}`, e);
      }
    }
  }

  // A game's own message to the other player's copy (in order, at most about 760 characters of JSON)
  send(type, data = null) {
    if (this.closed || typeof type !== 'string' || !/^[A-Za-z0-9_-]{1,24}$/.test(type) || SYSTEM.has(type)) return Promise.resolve(false);
    const msg = { s: this.sid, k: type };
    if (data !== null && data !== undefined) msg.d = data;
    if (J(msg).length > MSG_MAX) {
      console.warn(`online game message ${type} is too long`);
      return Promise.resolve(false);
    }
    this.sent++;
    return this.net.sendEvent('g-m', msg).then(() => true);
  }

  share(state) {
    if (this.closed) return;
    const s = J(state ?? null);
    if (s.length > 1500) return console.warn('online game state is too long to share');
    this.shareStr = s;
    this.flush('share', SHARE_EVERY);
  }

  score(n) {
    if (typeof n !== 'number' || !Number.isFinite(n)) return;
    n = Math.round(n * 100) / 100;
    if (n === this.myLive.n) return;
    this.myLive.n = n;
    this.flush('live', LIVE_EVERY);
  }

  // A line about where we are in the game ("Lesson 2: Parking"), for games without a score badge
  progress(text) {
    this.badge(esc(String(text ?? '')));
  }

  // From the game's score badge (hud.score / setScore): the default live progress
  badge(html) {
    const x = badgeText(html);
    if (!x || x === this.myLive.x) return;
    this.myLive.x = x;
    this.flush('live', LIVE_EVERY);
  }

  // Our result for this round. Games call it through ctx.finish / finish(); ctx.online.finished also works.
  finished(result = {}) {
    if (this.closed || this.mode === 'watch') return;
    const r = cleanResult(result);
    if (r.quit) return;
    r.r = this.round;
    this.myRes = r;
    this.myLive.st = 'done';
    this.write({ live: J(this.myLive), res: J(r) });
    this.T.ui.refresh(this);
  }

  // A new round in the same game (games with rounds of their own)
  next() {
    if (this.closed) return;
    this.round++;
    this.myRes = null;
    this.myLive = { ...this.myLive, st: 'play', r: this.round, n: null };
    this.write({ live: J(this.myLive), res: null });
    this.T.ui.refresh(this);
  }

  setting(key, value) {
    if (value === undefined) return this.settings[key];
    if (!this.host || !/^[A-Za-z0-9_-]{1,24}$/.test(key) || !scalar(value)) return value;
    if (this.settings[key] === value) return value;
    this.settings[key] = value;
    this.changed();
    return value;
  }

  waitPartner(ms = 30000) {
    if (this.pState === 'play' || this.pState === 'done') return Promise.resolve(true);
    if (this.closed || ['no', 'left', 'away'].includes(this.pState)) return Promise.resolve(false);
    return new Promise((resolve) => {
      const w = { resolve, timer: setTimeout(() => this.settleWaiters(false, w), ms) };
      this.waiters.push(w);
    });
  }

  settleWaiters(v, only = null) {
    for (const w of [...this.waiters]) {
      if (only && w !== only) continue;
      clearTimeout(w.timer);
      this.waiters.splice(this.waiters.indexOf(w), 1);
      w.resolve(v);
    }
  }

  cheer() {
    if (this.closed) return;
    this.cheersSent = (this.cheersSent || 0) + 1;
    this.net.sendEvent('g-cheer', { s: this.sid });
  }

  // ---------------------------------------------------------------- writes
  flush(what, every) {
    if (['no', 'left', 'away'].includes(this.pState) && !this.watcher) return; // nobody is looking
    const k = what === 'share' ? 'shareAt' : 'liveAt';
    const t = what === 'share' ? 'shareTimer' : 'liveTimer';
    if (this[t]) return;
    const wait = Math.max(0, (this[k] || 0) + every - performance.now());
    const go = () => {
      this[t] = null;
      if (this.closed) return;
      this[k] = performance.now();
      if (what === 'share') this.write({ share: this.shareStr });
      else this.write({ live: J(this.myLive) });
    };
    if (wait === 0) go();
    else this[t] = setTimeout(go, wait);
  }

  write(patch) {
    if (this.closed || this.mode === 'watch' || !this.net) return;
    if (!this.wrote) {
      this.wrote = true;
      patch = { live: J(this.myLive), ...patch };
    }
    this.net.sendGame({ game: this.id, sid: this.sid, ...patch });
  }

  // ---------------------------------------------------------------- the starter
  // The game is running (its start returned): invite the other player with what it has asked so far
  started() {
    if (this.closed) return;
    this.startedAt = performance.now();
    if (this.mode !== 'watch') this.write({});
    if (this.host) this.invite();
    else this.joinNow();
    this.T.ui.show(this);
  }

  invite() {
    clearTimeout(this.inviteTimer);
    if (this.invited || this.closed || !this.host) return;
    if (!this.T.live()) {
      this.pState = 'away';
      return this.T.ui.refresh(this);
    }
    this.invited = true;
    const d = { s: this.sid, id: this.id, ti: String(this.title).slice(0, 40), k: this.K.kind === 'solo' ? 'watch' : 'play', w: this.where === '2d' ? '2d' : '3d', o: this.opts, p: this.picks, l: this.loads, v: this.settings, sd: this.seed };
    if (this.rematch) d.re = 1;
    for (const k of ['l', 'p', 'o']) if (J(d).length > MSG_MAX) delete d[k];
    this.net.sendEvent('g-invite', d);
    this.waitTimer = setTimeout(() => {
      if (this.pState !== 'wait' || this.closed) return;
      this.pState = 'no'; // nobody answered
      this.settleWaiters(false);
      this.T.ui.refresh(this);
    }, INVITE_MS + 2000);
    this.T.ui.refresh(this);
  }

  // Answers or settings the joiner has not had yet
  changed() {
    if (!this.host || !this.invited || this.closed || !['wait', 'play'].includes(this.pState)) return;
    clearTimeout(this.setTimer);
    this.setTimer = setTimeout(() => {
      const d = { s: this.sid, p: this.picks, l: this.loads, v: this.settings };
      for (const k of ['l', 'p']) if (J(d).length > MSG_MAX) delete d[k];
      this.net.sendEvent('g-set', d);
    }, 150);
  }

  // Both started the same game at once and theirs won: join theirs
  becomeGuest(inv) {
    this.sid = inv.sid;
    this.host = false;
    this.invited = true;
    clearTimeout(this.inviteTimer);
    clearTimeout(this.waitTimer);
    for (const [i, p] of inv.picks.entries()) if (!this.picks[i]) this.picks[i] = p;
    this.loads = { ...inv.loads, ...this.loads };
    this.settings = { ...inv.settings };
    this.seed = inv.seed;
    this.pState = 'play';
    this.wrote = false;
    this.write({});
    this.joinNow();
    this.arrived();
    this.T.ui.refresh(this);
  }

  joinNow() {
    if (this.joined) return;
    this.joined = true;
    this.net.sendEvent('g-join', { s: this.sid, k: this.mode });
    const pg = this.T.pg;
    if (pg?.sid === this.sid) this.onG(pg);
  }

  // ---------------------------------------------------------------- the game's question cards and saves
  // hud.choose: the starter's answers are recorded; the joiner gets the same answer without the card
  async choose(spec, open) {
    const ids = (spec.options || []).map((o) => o.id);
    const title = String(spec.title || '').slice(0, 40);
    if (this.host || this.mode === 'watch') {
      const v = await open(spec);
      if (this.host && typeof v === 'string' && v.length <= 24 && this.picks.length < 8 && performance.now() - this.startedAt < 120000) {
        this.picks.push([title, v]);
        this.changed();
      }
      return v;
    }
    const pick = () => {
      for (let i = 0; i < this.picks.length; i++) if (!this.used.has(i) && this.picks[i][0] === title && ids.includes(this.picks[i][1])) return i;
      return -1;
    };
    let i = pick();
    if (i >= 0) {
      this.used.add(i);
      return this.picks[i][1];
    }
    // A card the starter was not asked (their game took another turn): ours alone
    if (performance.now() - this.createdAt > 20000) return open(spec);
    // Not answered there yet: ask here too, and take their answer if it comes first
    const name = esc(this.T.o.name());
    const card = open({ ...spec, text: `${spec.text ? spec.text + '<br>' : ''}<span class="ol-same">${name} is choosing too: you get the same in a moment.</span>` });
    const off = [];
    const theirs = new Promise((resolve) => {
      const fn = () => {
        i = pick();
        if (i < 0) return;
        this.used.add(i);
        resolve(this.picks[i][1]);
      };
      off.push(this.on('_set', fn));
    });
    const v = await Promise.race([card, theirs]);
    off.forEach((f) => f());
    const btn = document.querySelector(`.choose [data-c="${CSS.escape(String(v))}"]`);
    if (btn) btn.click(); // close our card with their answer
    return v;
  }

  // ctx.load: the starter's saved values (their course, round, mode) for a moment at the start
  load(key, value) {
    if (this.host) {
      if (scalar(value) && !(key in this.loads) && Object.keys(this.loads).length < 12 && performance.now() - this.startedAt < SETTLE && /^[A-Za-z0-9_-]{1,40}$/.test(key)) {
        this.loads[key] = value;
        this.changed();
      }
      return value;
    }
    if (key in this.loads && performance.now() - this.startedAt < SETTLE && (scalar(value) || value === null || value === undefined)) return this.loads[key];
    return value;
  }

  // ---------------------------------------------------------------- from the other player
  onEvent(type, d) {
    this.got++;
    if (type === 'g-join') {
      if (this.pState !== 'done') this.pState = 'play';
      if (d.k === 'watch') this.watcher = true;
      this.arrived();
    } else if (type === 'g-no') {
      if (this.pState === 'wait') this.pState = 'no';
      this.settleWaiters(false);
    } else if (type === 'g-leave') {
      this.gone(false);
      this.emit('leave');
    } else if (type === 'g-cheer') {
      this.cheers++;
      this.T.ui.cheered(this);
      this.emit('cheer');
    } else if (type === 'g-set' && !this.host) {
      for (const [k, v] of applySet(this, d)) this.emit('setting', k, v);
      this.emit('_set');
    } else if (type === 'g-m' && typeof d.k === 'string' && !SYSTEM.has(d.k)) this.emit(`m:${d.k}`, d.d ?? null);
    this.T.ui.refresh(this);
  }

  // Their g/<uid> state (null: gone, or another game)
  onG(v, away = false) {
    if (this.closed) return;
    if (!v) {
      if (away || !this.host || this.pState !== 'wait') this.gone(away);
      return;
    }
    const live = parse(v.live);
    if (live && typeof live === 'object') {
      this.pLive = { x: typeof live.x === 'string' ? live.x.slice(0, 120) : '', n: typeof live.n === 'number' ? live.n : null, st: ['play', 'done', 'watch'].includes(live.st) ? live.st : 'play', r: live.r | 0 };
      if (live.st === 'watch') this.watcher = true;
      if (this.pState === 'wait' || this.pState === 'no' || this.pState === 'left') this.pState = 'play';
      this.arrived();
      this.emit('live', { ...this.pLive });
    }
    const res = v.res ? parse(v.res) : null;
    if (res && typeof res === 'object') {
      const r = cleanResult(res);
      r.r = res.r | 0;
      const fresh = J(r) !== J(this.pRes);
      this.pRes = r;
      this.pState = 'done';
      if (fresh) this.emit('finish', { ...r });
    } else if (this.pRes && this.pLive?.st === 'play' && this.pLive.r > (this.pRes.r ?? 0)) {
      this.pRes = null; // they started another round
      this.pState = 'play';
    }
    if (typeof v.share === 'string' && v.share !== this.pShareStr) {
      this.pShareStr = v.share;
      this.pShare = parse(v.share);
      this.emit('state', this.pShare);
    }
    this.T.ui.refresh(this);
  }

  // The other player's copy is running
  arrived() {
    this.pJoined = true;
    this.settleWaiters(true);
    if (this.joinSaid) return;
    this.joinSaid = true;
    this.emit('join');
  }

  gone(away) {
    if (this.pState === 'done' && this.pRes) {
      this.pClosed = true;
    } else if (this.pState !== 'no' || away) this.pState = away ? 'away' : 'left';
    this.settleWaiters(false);
    this.T.ui.refresh(this);
  }

  // ---------------------------------------------------------------- the end
  // Play again: a rematch (a new session that invites the other again) while they are here
  again() {
    if (this.closed) return null;
    const T = this.T;
    if (!T.live() || this.mode === 'watch') {
      this.close({ quit: true });
      return null;
    }
    const next = new Session(T, { sid: newSid(), id: this.id, title: this.title, opts: this.opts, host: true, where: this.where, seed: (Math.random() * 2 ** 31) >>> 0, rematch: this.pState === 'play' || this.pState === 'done' });
    this.close({ quit: true }, true);
    T.sess = next;
    return next;
  }

  // Our result card is up (the arena's or the 2D shell's): the two results go into it
  cardShown(el) {
    if (el) this.T.ui.cardShown(this, el);
  }

  againLabel() {
    return this.T.live() && this.mode !== 'watch' && this.K.kind !== 'solo' && (this.pState === 'play' || this.pState === 'done') ? 'Rematch' : null;
  }

  // The game closed on this device. quietly: a rematch replaces it (the other gets a new invitation instead)
  close(result = {}, quietly = false) {
    if (this.closed) return;
    if (!this.myRes && result && !result.quit && !result.error && this.mode !== 'watch') this.finished(result); // a game that ends with ctx.end(result)
    this.closed = true;
    clearTimeout(this.inviteTimer);
    clearTimeout(this.waitTimer);
    clearTimeout(this.setTimer);
    clearTimeout(this.liveTimer);
    clearTimeout(this.shareTimer);
    this.settleWaiters(false);
    if (this.invited || this.joined) this.net?.sendEvent('g-leave', { s: this.sid, q: quietly ? 1 : 0 });
    if (this.mode !== 'watch') this.net?.sendGame(null);
    this.handlers.clear();
    if (this.T.sess === this) this.T.sess = null;
    this.T.ui.hide(this);
  }
}

// ------------------------------------------------------------------ what the players see
class GameUi {
  constructor(T) {
    this.T = T;
  }

  get looks() {
    return this.T.h.looks;
  }

  el(id, cls) {
    let e = document.getElementById(id);
    if (!e) {
      e = document.createElement('div');
      e.id = id;
      e.className = cls;
      document.body.appendChild(e);
    }
    return e;
  }

  show(s) {
    this.cur = s;
    this.refresh(s);
  }

  hide(s) {
    if (this.cur !== s) return;
    this.cur = null;
    document.getElementById('ol-gstrip')?.classList.add('hidden');
    document.getElementById('ol-watch')?.classList.add('hidden');
    document.body.classList.remove('ol-game-together');
  }

  hideAll() {
    this.cur = null;
    for (const id of ['ol-gstrip', 'ol-watch', 'ol-cheer']) document.getElementById(id)?.classList.add('hidden');
    document.body.classList.remove('ol-game-together');
  }

  // What the other player is up to, in a few words after their name
  status(s) {
    const live = s.pLive;
    switch (s.pState) {
      case 'wait':
        return s.invited ? 'is invited to play too...' : '';
      case 'no':
        return 'will play later';
      case 'left':
        return 'left the game';
      case 'away':
        return 'is away';
      case 'done':
        return s.pRes ? `Finished: ${esc(measure(s.pRes, s.K))}` : 'Finished';
      default:
        if (s.watcher || live?.st === 'watch') return `is watching${s.cheers ? ` · ${s.cheers} ${s.cheers === 1 ? 'cheer' : 'cheers'}` : ''}`;
        if (live?.n != null && !(live.x || '').includes(String(live.n))) return `${live.x ? `${esc(live.x)} · ` : ''}${esc(live.n)} ${esc(s.K.unit === '%' ? '%' : s.K.unit)}`;
        return live?.x ? esc(live.x) : 'Playing';
    }
  }

  refresh(s) {
    if (!s || s.closed) return;
    if (s.mode === 'watch') return this.watchTick(s);
    if (this.cur !== s) return;
    const strip = this.el('ol-gstrip', 'ol-gstrip hidden');
    const rid = this.T.o.remoteId();
    const quiet = s.pState === 'wait' && !s.invited;
    const st = this.status(s);
    const names = this.T.names();
    const banner = s.myRes && s.pRes ? compare(s.K, s.myRes, s.pRes, names).text : '';
    // A game with its own result screen (no result card): Rematch sits in the strip
    const again = s.myRes && s.where === '3d' && !s.hasCard && this.T.h.arena.current?.sess === s ? s.againLabel() : null;
    // Built once; only the words change, so a tap on a button never lands on one being replaced
    if (!strip.firstChild) {
      strip.innerHTML = `<span class="ol-av"></span><span class="ol-gs-t"><b></b> <span class="ol-gs-x"></span> <span class="ol-gs-b"></span></span><button class="ol-gs-cheer" title="Cheer">${svgIcon('heart', 18, 2.4)}</button><button class="btn primary ol-gs-again"></button>`;
      strip.addEventListener('click', (e) => {
        const cur = this.cur;
        if (!cur || cur.closed) return;
        if (e.target.closest('.ol-gs-cheer')) {
          cur.cheer();
          this.pop(strip.querySelector('.ol-gs-cheer'));
        } else if (e.target.closest('.ol-gs-again') && this.T.h.arena.current?.sess === cur) {
          this.T.h.sound?.ui?.('tap');
          this.T.h.arena.again();
        }
      });
    }
    const set = (sel, html, prop = 'innerHTML') => {
      const e = strip.querySelector(sel);
      if (e._ol !== html) e[prop] = e._ol = html;
      return e;
    };
    if (strip.dataset.who !== rid) {
      strip.dataset.who = rid;
      set('.ol-av', avatar(this.looks[rid], 30));
      set('.ol-gs-t b', this.looks[rid]?.name || '', 'textContent');
      strip.querySelector('.ol-gs-cheer').setAttribute('aria-label', `Cheer for ${this.looks[rid]?.name}`);
    }
    set('.ol-gs-x', st);
    set('.ol-gs-b', banner, 'textContent').hidden = !banner;
    strip.querySelector('.ol-gs-cheer').hidden = !(s.pState === 'play' || s.pState === 'done');
    set('.ol-gs-again', again || '', 'textContent').hidden = !again;
    strip.dataset.state = s.pState;
    strip.classList.toggle('both', !!banner);
    strip.classList.toggle('own', !!(s.myRes && !s.hasCard)); // over a game's own result screen
    strip.classList.toggle('hidden', quiet || (s.pState === 'no' && performance.now() - (s.noAt ||= performance.now()) > 5000));
    if (s.pState === 'no' && !s.noTimer) s.noTimer = setTimeout(() => this.refresh(s), 5200);
    document.body.classList.toggle('ol-game-together', !strip.classList.contains('hidden'));
    this.card(s);
  }

  pop(btn) {
    btn?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.2,1.5,.4,1)' });
  }

  // The two results in the game's result card (the arena's or the 2D shell's), with the banner
  card(s) {
    const card = s.cardEl;
    if (!card || !card.isConnected || !s.myRes) return;
    let box = card.querySelector('.ol-vs');
    if (!box) {
      box = document.createElement('div');
      box.className = 'ol-vs';
      card.querySelector('.row')?.before(box);
    }
    const names = this.T.names();
    const L = this.looks;
    const me = this.T.h.playerId();
    const rid = this.T.o.remoteId();
    if (s.K.kind === 'solo') {
      const html = s.watcher ? `<div class="ol-vs-b both">${esc(names.them)} watched${s.cheers ? ` and cheered ${s.cheers === 1 ? 'once' : `${s.cheers} times`}` : ''}</div>` : '';
      if (box.dataset.k !== html) box.innerHTML = box.dataset.k = html;
      return;
    }
    if (!s.pJoined) return box.remove(); // they never played this one
    const gone = !s.pRes && (s.pState === 'left' || s.pState === 'away');
    const cmp = gone ? { text: `${names.them} ${s.pState === 'away' ? 'lost the connection' : 'left the game'}`, who: null } : compare(s.K, s.myRes, s.pRes, names);
    const theirs = s.pRes ? esc(measure(s.pRes, s.K)) : gone ? 'Left the game' : `<i>${this.status(s) || 'Playing'}</i>`;
    const row = (id, label, text, win) => `<div class="ol-vs-p${win ? ' win' : ''}"><span class="ol-av">${avatar(L[id], 34)}</span> <b>${esc(label)}</b> <span>${text}</span></div>`;
    const html = `${cmp.text ? `<div class="ol-vs-b ${cmp.who || ''}">${esc(cmp.text)}</div>` : `<div class="ol-vs-b wait">${s.pState === 'play' ? `${esc(names.them)} is still playing...` : ''}</div>`}<div class="ol-vs-rows">${row(me, names.me, esc(measure(s.myRes, s.K)), cmp.who === 'me')}${row(rid, names.them, theirs, cmp.who === 'them')}</div>`;
    if (box.dataset.k !== html) {
      box.innerHTML = html;
      box.dataset.k = html;
    }
    const again = card.querySelector('[data-r="again"]');
    if (again) {
      if (!again.dataset.label) again.dataset.label = again.textContent;
      again.textContent = s.againLabel() || again.dataset.label;
    }
  }

  // Our result card is up (s.cardEl set by the arena or the shell)
  cardShown(s, el) {
    s.cardEl = el;
    s.hasCard = true;
    el.querySelector('.ol-vs')?.remove();
    this.card(s);
  }

  // A cheer from the other player, on our screen
  cheered(s) {
    if (s.mode === 'watch') return;
    const el = this.el('ol-cheer', 'ol-cheer hidden');
    const name = esc(this.T.o.name());
    el.innerHTML = `<span class="ol-av">${avatar(this.looks[this.T.o.remoteId()], 34)}</span><b>${name} cheers for you!</b>${`<i>${svgIcon('heart', 18, 2)}</i>`.repeat(6)}`;
    el.classList.remove('hidden');
    el.getAnimations?.().forEach((a) => a.cancel());
    el.animate([{ transform: 'translate(-50%, 10px) scale(.8)', opacity: 0 }, { transform: 'translate(-50%, 0) scale(1)', opacity: 1, offset: 0.15 }, { transform: 'translate(-50%, 0) scale(1)', opacity: 1, offset: 0.8 }, { transform: 'translate(-50%, -8px) scale(.96)', opacity: 0 }], { duration: 2200, easing: 'ease-out' });
    clearTimeout(this.cheerT);
    this.cheerT = setTimeout(() => el.classList.add('hidden'), 2150);
    this.T.h.sound?.ui?.('coin');
    this.refresh(s);
  }

  // ---------------------------------------------------------------- watching a game tied to one kid
  watchOpen(s) {
    const el = this.el('ol-watch', 'ol-watch hidden');
    this.cur = s;
    if (!el.firstChild) {
      el.innerHTML = `<span class="ol-av"></span><div class="ol-w-t"><b></b><span class="ol-w-x"></span></div><button class="btn primary ol-w-cheer" data-w="cheer">${svgIcon('heart', 18, 2.4)} Cheer <small></small></button><button class="round small ol-w-x2" data-w="close" aria-label="Stop watching">${svgIcon('close', 16)}</button>`;
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-w]');
        const cur = this.cur;
        if (!b || !cur || cur.mode !== 'watch' || cur.closed) return;
        if (b.dataset.w === 'cheer') {
          cur.cheer();
          this.pop(b);
          this.T.h.sound?.ui?.('pop');
          this.watchTick(cur);
        } else cur.close({ quit: true });
      });
    }
    el.classList.remove('hidden');
    this.watchTick(s);
  }

  // Only the words change while watching (the buttons stay put)
  watchTick(s) {
    const el = document.getElementById('ol-watch');
    if (!el || this.cur !== s || !el.firstChild) return;
    const rid = this.T.o.remoteId();
    const n = esc(this.T.o.name());
    const ended = s.pState === 'left' || s.pState === 'away' || (s.pState === 'done' && s.pClosed);
    const line = s.pState === 'done' ? `Finished: <b>${esc(measure(s.pRes, s.K))}</b>${s.pRes?.title ? ` · ${esc(s.pRes.title)}` : ''}` : ended ? `${n} closed the game` : s.pLive?.x ? esc(s.pLive.x) : 'Starting...';
    const set = (sel, html) => {
      const e = el.querySelector(sel);
      if (e._ol !== html) e.innerHTML = e._ol = html;
    };
    if (el.dataset.who !== rid) {
      el.dataset.who = rid;
      set('.ol-av', avatar(this.looks[rid], 40));
    }
    set('.ol-w-t b', `${n} ${esc(s.K.doing || 'is playing')}`);
    set('.ol-w-x', `${esc(s.title)}: ${line}`);
    set('.ol-w-cheer small', s.cheersSent ? String(s.cheersSent) : '');
    if (ended && !s.endTimer) s.endTimer = setTimeout(() => s.close({ quit: true }), 6000);
  }
}
