// The room's saved progress: while in a room, every progress key in localStorage (src/online/profile.js
// says which) is mirrored at rooms/<CODE>/save/<key> as the same string. Joining loads the room's save
// into the game (the device's own progress waits aside); changes go out a moment later, one key at a time
// and only the keys that changed; the other player's changes come in as they happen. Two devices changing
// the same key at once are merged in a transaction: lists are joined, objects key by key, anything else
// is last-write-wins. Values over MAX_VALUE characters stay on the device.
import { ref, onValue, runTransaction } from '../../vendor/firebase/firebase-database.js';
import { raw, isProgress, canSync, progressKeys, activeRoom, useRoom, pendingKeys, setPending, watchWrites, watchOffline } from './profile.js';

export const NOBASE = Symbol('nobase'); // the value both sides started from is not known
const BAD = Symbol('bad');
const SEND_AFTER = 1200; // ms: changes made close together go out together
const J = (v) => JSON.stringify(v);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const parse = (s) => {
  if (s === null) return undefined;
  try {
    return JSON.parse(s);
  } catch {
    return BAD;
  }
};

// b: the value both started from (or NOBASE), l: ours (newer), r: the database's. undefined = absent.
function mergeVal(b, l, r) {
  if (J(l) === J(r)) return l;
  if (b !== NOBASE) {
    if (J(r) === J(b)) return l; // only we changed it
    if (J(l) === J(b)) return r; // only they did
  }
  if (l === undefined) return r; // we removed it while they changed it: theirs stays
  if (r === undefined) return l;
  if (Array.isArray(l) && Array.isArray(r)) {
    const before = b !== NOBASE && Array.isArray(b) ? new Set(b.map(J)) : new Set();
    const mine = new Set(l.map(J));
    const out = [];
    const seen = new Set();
    for (const x of r) {
      const j = J(x);
      if (seen.has(j) || (before.has(j) && !mine.has(j))) continue; // we took it out
      seen.add(j);
      out.push(x);
    }
    for (const x of l) {
      const j = J(x);
      if (seen.has(j) || before.has(j)) continue; // they took it out
      seen.add(j);
      out.push(x);
    }
    return out;
  }
  if (isObj(l) && isObj(r)) {
    const out = {};
    for (const k of new Set([...Object.keys(r), ...Object.keys(l)])) {
      const v = mergeVal(b === NOBASE ? NOBASE : isObj(b) ? b[k] : undefined, l[k], r[k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  return l;
}

// The same on the stored strings (null = no value)
export function mergeStr(b, l, r) {
  if (l === r) return l;
  if (b !== NOBASE && r === b) return l;
  if (b !== NOBASE && l === b) return r;
  if (l === null) return r;
  if (r === null) return l;
  const pl = parse(l);
  const pr = parse(r);
  if (pl === BAD || pr === BAD) return l;
  const pb = b === NOBASE ? NOBASE : parse(b);
  const m = mergeVal(pb === BAD ? NOBASE : pb, pl, pr);
  return m === undefined ? null : J(m);
}

// Before reloading into room CODE: load the database's save (server) as this device's progress; the
// device's own waits aside. This device's room changes that waited since last time are merged in and
// marked to be sent; values too big to send come back as they were.
export function enterProfile(code, server) {
  const waiting = useRoom(code);
  for (const [k, v] of Object.entries(server || {})) {
    if (!isProgress(k) || typeof v !== 'string') continue;
    try {
      raw.set(k, v);
    } catch {
      /* storage full */
    }
  }
  const pending = new Set();
  for (const [k, v] of Object.entries(waiting)) {
    if (v === null || !isProgress(k)) continue;
    const cur = raw.get(k);
    const val = canSync(k, v) ? mergeStr(NOBASE, v, cur) : v;
    try {
      raw.set(k, val);
    } catch {
      continue;
    }
    if (canSync(k, val) && val !== cur) pending.add(k);
  }
  setPending(pending);
}

export class RoomSave {
  // h: { reload(keys | null), onError(e) }
  constructor(db, code, h) {
    this.db = db;
    this.code = code;
    this.path = `rooms/${code}/save`;
    this.h = h;
    this.base = new Map(); // key -> the database's value as last seen (null: none)
    this.known = new Map(); // key -> the local value as last seen
    this.dirty = new Set(); // changed here, not sent yet
    this.inflight = new Set();
    this.running = new Set(); // transactions on their way
    this.localOnly = new Set(); // too big (or a name the database refuses): stays on this device
    this.stopped = false;
    this.stats = { sent: 0, keys: 0, merged: 0, received: 0 };
    this.onHide = () => document.visibilityState === 'hidden' && this.flush();
  }

  // Load the room's save into the game. Resolves once it is in.
  start() {
    return new Promise((resolve, reject) => {
      let first = true;
      const end = (e) => {
        if (!first) return false;
        first = false;
        clearTimeout(timer);
        if (e) {
          this.unsub?.();
          reject(e);
        }
        return true;
      };
      const timer = setTimeout(() => end(Object.assign(new Error('save timed out'), { code: 'timeout' })), 15000);
      this.unsub = onValue(
        ref(this.db, this.path),
        (snap) => {
          const server = snap.val() || {};
          if (!first) return this.remote(server);
          try {
            this.load(server);
            end();
            resolve();
          } catch (e) {
            end(e);
          }
        },
        (e) => {
          if (!end(e)) this.h.onError?.(e);
        },
      );
    });
  }

  // The room's progress is already loaded on this device (src/main.js started with it, or the player stayed
  // in the room offline): the database's values replace it, except what changed here and was not sent.
  load(server) {
    if (activeRoom() !== this.code) enterProfile(this.code, server);
    const pending = pendingKeys();
    const changed = [];
    for (const k of new Set([...progressKeys(), ...Object.keys(server)])) {
      if (!isProgress(k)) continue;
      const local = raw.get(k);
      const sv = typeof server[k] === 'string' ? server[k] : null;
      this.base.set(k, sv);
      if (local !== null && !canSync(k, local)) {
        this.localOnly.add(k); // too big to send: stays as it is here
        this.known.set(k, local);
        continue;
      }
      if (pending.has(k)) {
        this.known.set(k, local);
        if (local !== sv) {
          this.dirty.add(k);
          this.base.set(k, NOBASE); // what it started from is not known any more: merge both ways
        }
        continue;
      }
      if (local !== sv) {
        try {
          if (sv === null) raw.remove(k);
          else raw.set(k, sv);
        } catch {
          continue; // storage full
        }
        changed.push(k);
      }
      this.known.set(k, sv);
    }
    watchWrites((k) => this.touched(k));
    document.addEventListener('visibilitychange', this.onHide);
    window.addEventListener('pagehide', this.onHide);
    this.savePending();
    if (this.dirty.size) this.schedule();
    if (changed.length) this.h.reload(changed);
  }

  // The database's save changed (the other player, or our own write coming back)
  remote(server) {
    if (this.stopped) return;
    const changed = [];
    for (const k of new Set([...Object.keys(server), ...this.base.keys()])) {
      if (!isProgress(k) || this.dirty.has(k) || this.inflight.has(k)) continue; // ours is on its way and will merge
      const v = typeof server[k] === 'string' ? server[k] : null;
      if (this.base.get(k) === v) continue;
      this.base.set(k, v);
      const mine = raw.get(k);
      if (mine === v) {
        this.known.set(k, v);
        continue;
      }
      const val = this.localOnly.has(k) ? mergeStr(NOBASE, mine, v) : v; // a big local value keeps its own part
      try {
        if (val === null) raw.remove(k);
        else raw.set(k, val);
      } catch {
        continue;
      }
      this.known.set(k, val);
      this.stats.received++;
      changed.push(k);
    }
    if (changed.length) this.h.reload(changed);
  }

  // The game wrote key k
  touched(k) {
    if (this.stopped || !isProgress(k)) return;
    const v = raw.get(k);
    if (this.known.get(k) === v) return;
    this.known.set(k, v);
    if (!canSync(k, v)) {
      this.localOnly.add(k);
      this.dirty.delete(k);
      return;
    }
    this.localOnly.delete(k);
    this.dirty.add(k);
    this.savePending();
    this.schedule();
  }

  schedule(ms = SEND_AFTER) {
    if (!this.timer && !this.stopped) this.timer = setTimeout(() => this.flush(), ms);
  }

  savePending() {
    setPending(new Set([...this.dirty, ...this.inflight]));
  }

  // Send what changed. Resolves when the database has answered for each key.
  flush() {
    clearTimeout(this.timer);
    this.timer = null;
    if (this.stopped) return Promise.resolve();
    const jobs = [];
    for (const k of [...this.dirty]) {
      if (this.inflight.has(k)) continue;
      const local = raw.get(k);
      this.dirty.delete(k);
      if (!canSync(k, local)) {
        this.localOnly.add(k);
        continue;
      }
      const b = this.base.has(k) ? this.base.get(k) : null;
      this.inflight.add(k);
      const job = runTransaction(ref(this.db, `${this.path}/${k}`), (cur) => mergeStr(b, local, typeof cur === 'string' ? cur : null), { applyLocally: false }).then(
        ({ snapshot }) => {
          this.inflight.delete(k);
          const v = snapshot.val();
          const sv = typeof v === 'string' ? v : null;
          this.stats.sent += local?.length || 0;
          this.stats.keys++;
          if (raw.get(k) !== local) {
            // Changed again meanwhile: that change started from what we just sent
            this.base.set(k, local);
            this.dirty.add(k);
            return;
          }
          this.base.set(k, sv);
          if (sv === local || this.stopped) return;
          this.stats.merged++;
          try {
            if (sv === null) raw.remove(k);
            else raw.set(k, sv);
          } catch {
            return;
          }
          this.known.set(k, sv);
          this.h.reload([k]);
        },
        (e) => {
          this.inflight.delete(k);
          this.dirty.add(k);
          this.failed = e;
        },
      );
      this.running.add(job);
      job.finally(() => this.running.delete(job));
      jobs.push(job);
    }
    this.savePending();
    return Promise.allSettled(jobs).then(() => {
      this.savePending();
      const e = this.failed;
      this.failed = null;
      if (e && /permission/i.test(`${e.code} ${e.message}`)) return this.h.onError?.(e); // the room is not ours any more
      if (this.dirty.size) this.schedule(e ? 5000 : SEND_AFTER);
    });
  }

  // Stop syncing. flush: send what is left first (up to a few seconds). Returns the keys to keep on this
  // device for next time (not in the database).
  async stop(flush = true) {
    if (!this.stopped && flush) {
      const send = async () => {
        for (let i = 0; i < 3 && (this.dirty.size || this.running.size); i++) {
          await this.flush();
          await Promise.allSettled([...this.running]);
        }
      };
      await Promise.race([send(), new Promise((r) => setTimeout(r, 5000))]);
    }
    this.stopped = true;
    clearTimeout(this.timer);
    this.timer = null;
    watchOffline(); // still the room's progress: later changes wait for next time
    this.unsub?.();
    document.removeEventListener('visibilitychange', this.onHide);
    window.removeEventListener('pagehide', this.onHide);
    return new Set([...this.dirty, ...this.inflight, ...this.localOnly]);
  }
}
