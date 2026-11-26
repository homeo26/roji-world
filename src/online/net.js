// Online play over the Firebase Realtime Database: anonymous sign-in and one room at rooms/<CODE>.
// The database rules (online/database.rules.json in the project notes) allow: the host claims a free code,
// the first other player claims the guest seat, only those two read the room, each writes only its own
// kid at p/<uid>, and shared moments are append-only events at ev/<id>. The host's room is deleted when
// the host leaves or disconnects; the guest's seat is freed the same way.
import { initializeApp } from '../../vendor/firebase/firebase-app.js';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence, signInAnonymously } from '../../vendor/firebase/firebase-auth.js';
import { getDatabase, ref, get, set, update, remove, push, onValue, onChildAdded, onDisconnect, serverTimestamp, goOnline, goOffline } from '../../vendor/firebase/firebase-database.js';
import { FIREBASE } from './config.js';
import { CODE_CHARS } from './codes.js';

const timeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error(`${what} timed out`), { code: 'timeout' })), ms))]);
const denied = (e) => /permission/i.test(e?.code || '') || /permission/i.test(e?.message || '');

function newCode() {
  const b = new Uint32Array(6);
  crypto.getRandomValues(b);
  return [...b].map((v) => CODE_CHARS[v % CODE_CHARS.length]).join('');
}

export class Net {
  constructor() {
    this.app = null;
    this.uid = null;
    this.code = null;
    this.role = null; // 'host' | 'guest'
    this.other = null; // the other player's uid
    this.connected = false;
    this.offset = 0; // server clock minus this clock (ms)
    this.subs = [];
    this.h = {};
  }

  // Sign in (once). Throws when Firebase cannot be reached.
  async init() {
    if (this.uid) return this.uid;
    if (!this.app) {
      this.app = initializeApp(FIREBASE, 'roji-world-online');
      // localStorage first: the IndexedDB store polls across tabs, which times out on a busy phone
      this.auth = initializeAuth(this.app, { persistence: [browserLocalPersistence, indexedDBLocalPersistence, inMemoryPersistence] });
      this.db = getDatabase(this.app, FIREBASE.databaseURL);
      onValue(ref(this.db, '.info/connected'), (s) => {
        this.connected = !!s.val();
        this.h.onConnection?.(this.connected);
      });
      onValue(ref(this.db, '.info/serverTimeOffset'), (s) => (this.offset = s.val() || 0));
    }
    await timeout(this.auth.authStateReady(), 12000, 'sign-in');
    if (!this.auth.currentUser) await timeout(signInAnonymously(this.auth), 12000, 'sign-in');
    this.uid = this.auth.currentUser.uid;
    return this.uid;
  }

  serverNow() {
    return Date.now() + this.offset;
  }

  r(path = '') {
    return ref(this.db, `rooms/${this.code}${path ? '/' + path : ''}`);
  }

  // A new room with a free code. Returns the code.
  async create() {
    await this.init();
    goOnline(this.db);
    for (let i = 0; i < 6; i++) {
      const code = newCode();
      try {
        await timeout(update(ref(this.db, `rooms/${code}`), { host: this.uid, created: serverTimestamp() }), 12000, 'create');
      } catch (e) {
        if (denied(e)) continue; // the code is taken: try another
        throw e;
      }
      this.code = code;
      this.role = 'host';
      this.joinedAt = this.serverNow();
      await timeout(onDisconnect(this.r()).remove(), 12000, 'create');
      return code;
    }
    throw Object.assign(new Error('no free code'), { code: 'nocode' });
  }

  // Take the guest seat of a room (or come back to a seat that is still ours). Returns { role, host }.
  async join(code) {
    await this.init();
    goOnline(this.db);
    this.code = code;
    let room = null;
    try {
      room = (await timeout(get(this.r()), 12000, 'join')).val(); // readable only if we are already in it
    } catch (e) {
      if (!denied(e)) throw e;
    }
    try {
      if (!room || (room.host !== this.uid && room.guest !== this.uid)) {
        await timeout(set(this.r('guest'), this.uid), 12000, 'join');
        room = (await timeout(get(this.r()), 12000, 'join')).val();
      }
    } catch (e) {
      this.code = null;
      if (denied(e)) throw Object.assign(new Error('room not open'), { code: 'closed' });
      throw e;
    }
    if (!room?.host) {
      this.code = null;
      throw Object.assign(new Error('room not open'), { code: 'closed' });
    }
    this.role = room.host === this.uid ? 'host' : 'guest';
    this.joinedAt = this.serverNow();
    if (this.role === 'host') await timeout(onDisconnect(this.r()).remove(), 12000, 'join');
    else await timeout(onDisconnect(this.r()).update({ guest: null, [`p/${this.uid}`]: null }), 12000, 'join');
    return { role: this.role, host: room.host, hostState: room.p?.[room.host] || null };
  }

  // Listen to the room. h: { onOther(uid | null), onState(value | null), onEvent(ev), onClosed(), onConnection(on) }
  watch(h) {
    this.h = h;
    const fail = () => this.closed();
    const watchOther = (uid) => {
      if (uid === this.other) return;
      this.otherSub?.();
      this.other = uid || null;
      this.otherSub = uid ? onValue(this.r(`p/${uid}`), (s) => this.h.onState?.(s.val()), fail) : null;
      this.h.onOther?.(this.other);
    };
    if (this.role === 'host') this.subs.push(onValue(this.r('guest'), (s) => watchOther(s.val()), fail));
    else
      this.subs.push(
        onValue(
          this.r('host'),
          (s) => {
            if (!s.val()) return this.closed();
            watchOther(s.val());
          },
          fail,
        ),
      );
    this.subs.push(
      onChildAdded(
        this.r('ev'),
        (s) => {
          const v = s.val();
          if (!v || v.from === this.uid || typeof v.t !== 'number' || v.t < this.joinedAt - 4000) return;
          let data = null;
          try {
            data = v.data ? JSON.parse(v.data) : null;
          } catch {
            return;
          }
          this.h.onEvent?.({ id: s.key, type: String(v.type), t: v.t, data });
        },
        fail,
      ),
    );
  }

  closed() {
    if (!this.code) return;
    this.stop();
    this.h.onClosed?.();
  }

  stop() {
    for (const u of this.subs) u();
    this.subs = [];
    this.otherSub?.();
    this.otherSub = null;
    this.other = null;
    this.code = null;
    this.role = null;
  }

  sendState(patch) {
    if (!this.code) return;
    update(this.r(`p/${this.uid}`), patch).catch(() => {});
  }

  sendEvent(type, data = null) {
    if (!this.code) return;
    const ev = { from: this.uid, type, t: serverTimestamp() };
    if (data !== null) ev.data = JSON.stringify(data);
    if (ev.data?.length > 800) return; // the rules refuse it; the callers keep their messages short
    push(this.r('ev'), ev).catch(() => {});
  }

  // Host: delete the room. Guest: free the seat. Then close the connection until the next room.
  async leave() {
    const code = this.code;
    if (!code) {
      if (this.db) goOffline(this.db);
      return;
    }
    const role = this.role;
    const room = this.r();
    this.stop();
    try {
      if (role === 'host') await timeout(remove(room), 6000, 'leave');
      else await timeout(update(room, { guest: null, [`p/${this.uid}`]: null }), 6000, 'leave');
      await timeout(onDisconnect(room).cancel(), 4000, 'leave');
    } catch {
      /* offline: the onDisconnect clean-up runs when the server notices */
    }
    goOffline(this.db);
  }

  // Tests only: remove this anonymous user (after leaving the room)
  async deleteUser() {
    await this.auth?.currentUser?.delete();
    this.uid = null;
  }
}
