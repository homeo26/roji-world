// Online play over the Firebase Realtime Database: anonymous sign-in and one lasting room at rooms/<CODE>.
// The database rules (online/database.rules.json in the project notes) allow: a new room takes a free code
// and one seat (seats/roji or seats/homama holds the player's user id); anyone signed in who knows the code
// can take a free seat; only the two seat holders read the room; each writes only its own kid at p/<uid>
// (removed when that player leaves or disconnects); shared moments are events at ev/<id>; the room's saved
// progress is at save/<key> (src/online/save.js). A seat holder can free the other seat, hand their own seat
// to their Google account, or delete the room. Nothing is deleted when a player leaves.
import { initializeApp, deleteApp } from '../../vendor/firebase/firebase-app.js';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence, signInAnonymously, GoogleAuthProvider, linkWithPopup, signInWithCredential, updateCurrentUser, browserPopupRedirectResolver } from '../../vendor/firebase/firebase-auth.js';
import { getDatabase, ref, get, set, update, remove, push, query, orderByChild, startAt, endAt, onValue, onChildAdded, onDisconnect, serverTimestamp, goOnline, goOffline } from '../../vendor/firebase/firebase-database.js';
import { FIREBASE } from './config.js';
import { CODE_CHARS } from './codes.js';

const timeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error(`${what} timed out`), { code: 'timeout' })), ms))]);
export const denied = (e) => /permission/i.test(e?.code || '') || /permission/i.test(e?.message || '');
export const otherKid = (k) => (k === 'roji' ? 'homama' : 'roji');
const seatOf = (seats, uid) => (seats?.roji === uid ? 'roji' : seats?.homama === uid ? 'homama' : null);
const EVENTS_KEPT = 120000; // older events are only history: the next player to arrive clears them

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
    this.seat = null; // 'roji' | 'homama': the kid this player has in the room
    this.seats = null;
    this.other = null; // the other seat holder's uid
    this.handover = null;
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
        if (this.connected && this.code) onDisconnect(this.r(`p/${this.uid}`)).remove().catch(() => {}); // a new connection forgets the old one's
        this.h.onConnection?.(this.connected);
      });
      onValue(ref(this.db, '.info/serverTimeOffset'), (s) => (this.offset = s.val() || 0));
    }
    await timeout(this.auth.authStateReady(), 12000, 'sign-in');
    if (!this.auth.currentUser) await timeout(signInAnonymously(this.auth), 12000, 'sign-in');
    this.uid = this.auth.currentUser.uid;
    return this.uid;
  }

  // The seat is kept with a Google account (it comes back on any device after signing in with Google)
  google() {
    return !!this.auth?.currentUser?.providerData?.some((p) => p.providerId === 'google.com');
  }

  serverNow() {
    return Date.now() + this.offset;
  }

  r(path = '') {
    return ref(this.db, `rooms/${this.code}${path ? '/' + path : ''}`);
  }

  // A new room with a free code and our seat in it. Returns the code.
  async create(seat) {
    await this.init();
    goOnline(this.db);
    for (let i = 0; i < 6; i++) {
      const code = newCode();
      try {
        await timeout(update(ref(this.db, `rooms/${code}`), { created: serverTimestamp(), [`seats/${seat}`]: this.uid }), 12000, 'create');
      } catch (e) {
        if (denied(e)) continue; // the code is taken: try another
        throw e;
      }
      this.code = code;
      this.seat = seat;
      this.seats = { [seat]: this.uid };
      await this.enter();
      return code;
    }
    throw Object.assign(new Error('no free code'), { code: 'nocode' });
  }

  async readSeats() {
    try {
      return (await timeout(get(this.r('seats')), 12000, 'join')).val() || {};
    } catch (e) {
      if (denied(e)) return null; // not our room (yet)
      throw e;
    }
  }

  // The room's saved progress ({ key: value }); readable once we have a seat
  async readSave(code) {
    await this.init();
    goOnline(this.db);
    return (await get(ref(this.db, `rooms/${code}/save`))).val() || {};
  }

  // Back to our seat, or take a free one (prefer: the kid to ask for first). Returns { seat, other, otherState }.
  async join(code, prefer = 'roji') {
    await this.init();
    goOnline(this.db);
    this.code = code;
    try {
      let seats = await this.readSeats();
      let seat = seatOf(seats, this.uid);
      if (!seat) {
        // A taken seat is refused, which is how we find the free one: keep that refusal out of the console
        const warn = console.warn;
        console.warn = (...a) => !/FIREBASE WARNING: set at \/rooms\/[A-Z0-9]+\/seats\/\w+ failed: permission_denied/.test(a.join(' ')) && warn(...a);
        try {
          for (const kid of [prefer, otherKid(prefer)]) {
            try {
              await timeout(set(this.r(`seats/${kid}`), this.uid), 12000, 'join');
              seat = kid;
              break;
            } catch (e) {
              if (!denied(e)) throw e;
            }
          }
        } finally {
          console.warn = warn;
        }
        if (!seat) throw Object.assign(new Error('room full'), { code: 'full' });
        seats = (await this.readSeats()) || { [seat]: this.uid };
      }
      this.seat = seat;
      this.seats = seats;
      const other = seats[otherKid(seat)] || null;
      const otherState = other ? (await timeout(get(this.r(`p/${other}`)), 12000, 'join')).val() : null;
      await this.enter();
      return { seat, other, otherState };
    } catch (e) {
      this.code = null;
      this.seat = null;
      throw e;
    }
  }

  async enter() {
    this.joinedAt = this.serverNow();
    await timeout(onDisconnect(this.r(`p/${this.uid}`)).remove(), 12000, 'join');
    // Clear old events so the room does not grow
    get(query(this.r('ev'), orderByChild('t'), endAt(this.serverNow() - EVENTS_KEPT)))
      .then((s) => {
        const gone = {};
        s.forEach((c) => void (gone[c.key] = null));
        if (Object.keys(gone).length && this.code) return update(this.r('ev'), gone);
      })
      .catch(() => {});
  }

  // Listen to the room. h: { onSeats(seats), onOther(uid | null), onState(value | null), onEvent(ev), onClosed(why), onConnection(on), onUser() }
  watch(h) {
    this.h = h;
    const fail = () => this.closed('denied');
    this.subs.push(
      onValue(
        this.r('seats'),
        (s) => {
          const v = s.val() || {};
          if (v[this.seat] !== this.uid && v[this.seat] !== this.handover) return this.closed('seat');
          this.seats = v;
          this.watchOther(v[otherKid(this.seat)] || null);
          this.h.onSeats?.(v);
        },
        fail,
      ),
    );
    this.subs.push(
      onChildAdded(
        query(this.r('ev'), orderByChild('t'), startAt(this.joinedAt - 4000)),
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

  watchOther(uid) {
    if (uid === this.other) return;
    this.otherSub?.();
    this.other = uid;
    this.otherSub = uid ? onValue(this.r(`p/${uid}`), (s) => this.h.onState?.(s.val()), () => {}) : null;
    this.h.onOther?.(uid);
  }

  closed(why) {
    if (!this.code || this.quiet) return;
    this.stop();
    this.h.onClosed?.(why);
  }

  unwatch() {
    for (const u of this.subs) u();
    this.subs = [];
    this.otherSub?.();
    this.otherSub = null;
    this.other = null;
  }

  stop() {
    this.unwatch();
    this.code = null;
    this.seat = null;
    this.seats = null;
  }

  sendState(patch) {
    if (!this.code) return;
    update(this.r(`p/${this.uid}`), patch).catch(() => {});
  }

  sendEvent(type, data = null) {
    if (!this.code) return Promise.resolve();
    const ev = { from: this.uid, type, t: serverTimestamp() };
    if (data !== null) ev.data = JSON.stringify(data);
    if (ev.data?.length > 800) return Promise.resolve(); // the rules refuse it; the callers keep their messages short
    return push(this.r('ev'), ev).catch(() => {});
  }

  // Leave for now: the room and both seats stay. Then close the connection until the next room.
  async leave() {
    if (!this.code) {
      if (this.db) goOffline(this.db);
      return;
    }
    const me = this.r(`p/${this.uid}`);
    this.stop();
    try {
      await timeout(remove(me), 6000, 'leave');
      await timeout(onDisconnect(me).cancel(), 4000, 'leave');
    } catch {
      /* offline: the onDisconnect clean-up runs when the server notices */
    }
    goOffline(this.db);
  }

  // Give the other seat back to the room (their phone was lost): they join again with the code
  async freeSeat(kid) {
    const uid = this.seats?.[kid];
    const u = { [`seats/${kid}`]: null };
    if (uid) u[`p/${uid}`] = null;
    await timeout(update(this.r(), u), 12000, 'free');
  }

  // Delete the room with everything saved in it
  async deleteRoom() {
    const room = this.r();
    const me = this.r(`p/${this.uid}`);
    this.quiet = true; // our own listeners stop because the room is gone
    try {
      await timeout(remove(room), 12000, 'delete');
    } finally {
      this.quiet = false;
    }
    this.stop();
    onDisconnect(me).cancel().catch(() => {});
    goOffline(this.db);
  }

  // Keep this player's seat with a Google account. Returns 'linked' (this user now has Google) or
  // 'switched' (that Google account already had a user here: we are that user now, with our seat).
  async linkGoogle() {
    await this.init();
    const provider = new GoogleAuthProvider();
    try {
      await linkWithPopup(this.auth.currentUser, provider, browserPopupRedirectResolver);
      return 'linked';
    } catch (e) {
      if (e?.code === 'auth/provider-already-linked') return 'linked';
      if (e?.code !== 'auth/credential-already-in-use') throw e;
      const cred = GoogleAuthProvider.credentialFromError(e);
      if (!cred) throw e;
      await this.switchUser(cred);
      return 'switched';
    }
  }

  async switchUser(cred) {
    const app2 = initializeApp(FIREBASE, `roji-world-google-${Date.now()}`);
    try {
      const auth2 = initializeAuth(app2, { persistence: inMemoryPersistence });
      const user = (await timeout(signInWithCredential(auth2, cred), 15000, 'google')).user;
      if (user.uid === this.uid) return;
      const old = this.uid;
      const inRoom = !!(this.code && this.seat);
      const h = this.h;
      if (inRoom) {
        // Hand our seat to the Google account's user first, so the seat stays ours. The listeners stop
        // meanwhile: the old user loses the right to read the room the moment the seat moves.
        this.unwatch();
        this.handover = user.uid;
        await timeout(update(this.r(), { [`seats/${this.seat}`]: user.uid, [`p/${old}`]: null }), 12000, 'google');
        onDisconnect(this.r(`p/${old}`))
          .cancel()
          .catch(() => {});
      }
      await updateCurrentUser(this.auth, user);
      this.uid = this.auth.currentUser.uid;
      if (inRoom) {
        // The connection takes the new user's token in a moment: read until the room answers
        for (let i = 0; i < 20 && !(await this.readSeats().catch(() => null)); i++) await new Promise((r) => setTimeout(r, 300));
        await onDisconnect(this.r(`p/${this.uid}`)).remove();
        this.joinedAt = this.serverNow();
        this.watch(h);
      }
      this.h.onUser?.();
    } finally {
      this.handover = null;
      deleteApp(app2).catch(() => {});
    }
  }

  // Tests only: remove this anonymous user (after leaving the room)
  async deleteUser() {
    await this.auth?.currentUser?.delete();
    this.uid = null;
  }
}
