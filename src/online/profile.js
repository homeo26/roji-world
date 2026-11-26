// Which progress this device has loaded: its own, or the saved room's. Progress is every localStorage key
// that starts with 'roji-', except the device settings below. While a room's progress is loaded, the
// device's own keys wait under 'rojisolo:<key>'; on leaving, room values the database does not hold (too
// big, or not sent yet) wait under 'rojiroom:<CODE>:<key>' for the next visit. No Firebase here: src/main.js
// imports this at start-up (bootProfile) to decide which progress the game starts with.
export const DEVICE_KEYS = new Set(['roji-muted', 'roji-weekends-player', 'roji-world-time', 'roji-world-love']);
export const KEY_RE = /^roji-[A-Za-z0-9_-]{1,96}$/;
export const MAX_VALUE = 60000; // characters; the database rules refuse longer values
const ACTIVE = 'rojiol-active';
const SOLO_KEYS = 'rojiol-solo-keys';
const PENDING = 'rojiol-pending';
const ROOM = 'rojiol-room';
const SOLO = 'rojisolo:';
const stash = (code) => `rojiroom:${code}:`;

// The real Storage methods, kept before src/online/save.js watches setItem and removeItem
const S = globalThis.Storage?.prototype;
const orig = S ? { get: S.getItem, set: S.setItem, remove: S.removeItem, key: S.key } : null;
let ls = null;
try {
  ls = window.localStorage;
} catch {
  ls = null;
}
export const raw = {
  get(k) {
    try {
      return orig.get.call(ls, k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    orig.set.call(ls, k, v); // throws when the storage is full
  },
  remove(k) {
    try {
      orig.remove.call(ls, k);
    } catch {
      /* blocked */
    }
  },
  keys() {
    const out = [];
    try {
      for (let i = 0; i < ls.length; i++) out.push(orig.key.call(ls, i));
    } catch {
      /* blocked */
    }
    return out;
  },
};

export const isProgress = (k) => typeof k === 'string' && k.startsWith('roji-') && !DEVICE_KEYS.has(k);
export const canSync = (k, v) => KEY_RE.test(k) && (v === null || v.length <= MAX_VALUE);
export const progressKeys = () => raw.keys().filter(isProgress);
export const activeRoom = () => raw.get(ACTIVE);
const readJson = (k, d) => {
  try {
    return JSON.parse(raw.get(k)) ?? d;
  } catch {
    return d;
  }
};

function move(from, to) {
  const v = raw.get(from);
  if (v === null) return;
  raw.set(to, v);
  raw.remove(from);
}

// Keys changed in the room that the database has not confirmed yet
export const pendingKeys = () => new Set(readJson(PENDING, []));
export function setPending(keys) {
  try {
    if (keys.size) raw.set(PENDING, JSON.stringify([...keys]));
    else raw.remove(PENDING);
  } catch {
    /* full: the values still wait in their own keys */
  }
}

// Load room CODE's progress: the device's own keys go aside. Returns this device's room values that waited
// from the last visit ({ key: value }), taken out of the stash for the caller to put back.
export function useRoom(code) {
  if (activeRoom() === code) return {};
  if (activeRoom()) useSolo();
  const keys = progressKeys();
  raw.set(SOLO_KEYS, JSON.stringify(keys));
  raw.set(ACTIVE, code);
  try {
    for (const k of keys) move(k, SOLO + k);
  } catch (e) {
    useSolo(new Set()); // storage full: put back what moved
    throw Object.assign(new Error('storage full'), { code: 'storage' });
  }
  const pre = stash(code);
  const waiting = {};
  for (const k of raw.keys()) {
    if (!k.startsWith(pre)) continue;
    waiting[k.slice(pre.length)] = raw.get(k);
    raw.remove(k);
  }
  return waiting;
}

// Back to the device's own progress. keep: room keys to hold on this device for next time (the database
// does not have them); by default the unconfirmed ones and those too big to send.
export function useSolo(keep = null) {
  const code = activeRoom();
  if (!code) return false;
  const solo = new Set(readJson(SOLO_KEYS, []));
  if (!keep) {
    keep = pendingKeys();
    for (const k of progressKeys()) if (!canSync(k, raw.get(k))) keep.add(k);
  }
  const pre = stash(code);
  for (const k of progressKeys()) {
    if (solo.has(k) && raw.get(SOLO + k) === null) continue; // never moved aside (an interrupted switch)
    if (keep.has(k)) {
      try {
        move(k, pre + k);
      } catch {
        raw.remove(k);
      }
    } else raw.remove(k);
  }
  for (const k of raw.keys()) {
    if (!k.startsWith(SOLO)) continue;
    try {
      move(k, k.slice(SOLO.length));
    } catch {
      /* cannot happen: the room's keys just made room */
    }
  }
  raw.remove(SOLO_KEYS);
  raw.remove(PENDING);
  raw.remove(ACTIVE);
  return true;
}

// Watch the game's localStorage writes (every save goes through setItem or removeItem). fn(key) or null.
let hook = null;
let patched = false;
export function watchWrites(fn) {
  hook = fn;
  if (patched || !fn || !S) return;
  patched = true;
  S.setItem = function (k, v) {
    orig.set.call(this, k, v);
    if (hook && this === ls) hook(String(k));
  };
  S.removeItem = function (k) {
    orig.remove.call(this, k);
    if (hook && this === ls) hook(String(k));
  };
}
// While a room's progress is loaded but not connected, changes wait to be sent next time
const markPending = (k) => {
  if (!isProgress(k) || !activeRoom()) return;
  const p = pendingKeys();
  if (p.has(k)) return;
  p.add(k);
  setPending(p);
};
export const watchOffline = () => watchWrites(activeRoom() ? markPending : null);

// At start-up, before the game reads its progress: the progress in use when the game was last closed stays,
// except that a link to another room starts from the device's own. Returns the code of the room whose
// progress is loaded, or null.
export function bootProfile(urlRoom) {
  const code = String(urlRoom || '').toUpperCase();
  const active = activeRoom();
  if (active && ((code && code !== active) || savedRoom()?.code !== active)) useSolo();
  watchOffline();
  return activeRoom();
}

// After a reload into or out of a room: { code, show, msg } once
const GO = 'rojiol-go';
export function setGo(v) {
  try {
    sessionStorage.setItem(GO, JSON.stringify(v));
  } catch {
    /* blocked */
  }
}
export function takeGo() {
  try {
    const v = JSON.parse(sessionStorage.getItem(GO));
    sessionStorage.removeItem(GO);
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

// The room this device belongs to: { code, seat } or null
export function savedRoom() {
  const r = readJson(ROOM, null);
  return r && typeof r.code === 'string' && /^[A-HJ-NP-Z2-9]{6}$/.test(r.code) ? { code: r.code, seat: r.seat === 'homama' ? 'homama' : 'roji' } : null;
}
export function rememberRoom(code, seat) {
  try {
    raw.set(ROOM, JSON.stringify({ code, seat }));
  } catch {
    /* full */
  }
}
// The room is gone or the seat went to another device: drop it and what waited for it
export function forgetRoom(code) {
  if (savedRoom()?.code === code) raw.remove(ROOM);
  const pre = stash(code);
  for (const k of raw.keys()) if (k.startsWith(pre)) raw.remove(k);
}
