// Fencing, bumper cars and football played for real with the other player online (ctx.online, see
// the stage B notes). The device that started the game (the host) decides everything both must agree
// on; the other device moves its own kid and sends its button presses. This file holds the common
// parts: the start handshake, the other player's shared state replayed about 100 ms behind so it moves
// smoothly, a real-time clock, small batched messages, and noticing that the other player left.
import { choose, closeChoices } from '../../engine/choose.js';

export const lerpA = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
const MAX_MSG = 700;

export class Link {
  // o: ctx.online. delay: ms the other player is shown behind their newest state.
  constructor(o, { delay = 100 } = {}) {
    this.o = o;
    this.inRoom = !!o?.inRoom;
    this.on = false; // playing together right now
    this.delay = delay;
    this.buf = [];
    this.lag = 150;
    this.gone = false;
    this.offs = [];
    this.queue = [];
    this.sentAt = 0;
    this.last = performance.now();
    this.msgs = { hello: null, solo: false };
    if (!this.inRoom) return;
    this.offs.push(
      o.on('hello', (d) => {
        this.msgs.hello = d || {};
        if (!o.isHost && !this.gone && !this.decided) this.on = true; // before the host's next message arrives
      }),
    );
    this.offs.push(o.on('solo', () => (this.msgs.solo = true)));
    this.offs.push(o.on('state', (s) => this.push(s)));
    this.offs.push(o.on('leave', () => this.left()));
    if (o.partnerState) this.push(o.partnerState);
  }


  get host() {
    return !this.inRoom || this.o.isHost;
  }

  now() {
    return this.o.now();
  }

  // ---------------------------------------------------------------- starting together
  // Host: wait for the other player to join, with a card to play the computer instead. Joiner: wait for
  // the host's hello. Resolves true when both play this game together, false to play it alone as before.
  async begin({ title, text, solo, exit } = {}) {
    if (!this.inRoom) return false;
    const o = this.o;
    let picked = false;
    let closing = false;
    let card = null;
    if (o.isHost && !o.partnerHere) card = choose({ title, text, options: [{ id: 'solo', label: solo }], exit }).then((v) => (picked = !closing));
    const joined = await Promise.race([o.waitPartner(33000), card ? card.then(() => false) : new Promise(() => {})]);
    if (card && !picked) {
      closing = true;
      closeChoices();
    }
    if (this.disposed) return false;
    if (o.isHost) {
      if (!joined || picked) return this.alone();
      this.on = this.decided = true;
      o.send('hello', { v: 1 });
      return true;
    }
    // The other device starts it (it opened the game first, or both opened it at once and theirs won)
    const end = performance.now() + 20000;
    while (!this.disposed && performance.now() < end) {
      if (this.msgs.hello) {
        this.decided = true;
        return (this.on = true);
      }
      if (this.msgs.solo || this.gone) break;
      await new Promise((r) => setTimeout(r, 80));
    }
    return this.alone();
  }

  // Play the computer as before. A late joiner hears it and plays its own copy too.
  alone() {
    this.on = false;
    this.decided = true;
    if (this.inRoom && this.o.isHost) {
      this.offs.push(this.o.on('join', () => this.o.send('solo')));
      if (this.o.partnerHere) this.o.send('solo');
    }
    return false;
  }

  // ---------------------------------------------------------------- the other player's state
  push(s) {
    if (!s || typeof s.t !== 'number') return;
    const lag = Math.max(0, Math.min(1500, this.o.now() - s.t));
    this.lag += (lag - this.lag) * (lag > this.lag ? 0.5 : 0.06);
    const b = this.buf;
    if (b.length && s.t <= b[b.length - 1].t) return;
    b.push(s);
    if (b.length > 40) b.shift();
    this.fresh = true;
  }

  latest() {
    return this.buf[this.buf.length - 1] || null;
  }

  // The time the other player is shown at (their clock), about `delay` ms behind their newest state
  renderTime() {
    return this.o.now() - this.lag - this.delay;
  }

  // { a, b, k }: the two states around the render time and how far between them (k 0..1), or null
  sample(at = this.renderTime()) {
    const b = this.buf;
    if (!b.length) return null;
    if (at <= b[0].t) return { a: b[0], b: b[0], k: 0 };
    for (let i = b.length - 1; i >= 0; i--) {
      if (b[i].t <= at) {
        const n = b[i + 1];
        if (!n) return { a: b[i], b: b[i], k: 0 };
        return { a: b[i], b: n, k: (at - b[i].t) / Math.max(1, n.t - b[i].t) };
      }
    }
    return { a: b[0], b: b[0], k: 0 };
  }

  share(state) {
    if (this.on) this.o.share({ t: this.o.now(), ...state });
  }

  // ---------------------------------------------------------------- messages
  send(type, data) {
    if (this.on) this.o.send(type, data);
  }

  listen(type, fn) {
    const off = this.o.on(type, (d) => this.on && fn(d));
    this.offs.push(off);
    return off;
  }

  // Small events sent together, at most every `every` ms, as one 'ev' message of [items]
  add(item) {
    if (this.on) this.queue.push(item);
  }

  flush(every = 130) {
    if (!this.on || !this.queue.length || performance.now() - this.sentAt < every) return;
    this.sentAt = performance.now();
    let pack = [];
    let len = 10;
    for (const it of this.queue.splice(0)) {
      const n = JSON.stringify(it).length + 1;
      if (len + n > MAX_MSG && pack.length) {
        this.o.send('ev', { e: pack });
        pack = [];
        len = 10;
      }
      if (n < MAX_MSG) {
        pack.push(it);
        len += n;
      }
    }
    if (pack.length) this.o.send('ev', { e: pack });
  }

  // ---------------------------------------------------------------- time and leaving
  // Seconds since the last call, in real time (the game runs at the same speed on both devices)
  dt(max = 0.25) {
    const t = performance.now();
    const d = Math.min(max, Math.max(0, (t - this.last) / 1000));
    this.last = t;
    return d;
  }

  // Call once a frame: true the moment the other player is found gone
  check() {
    if (this.on && !this.gone && !this.o.partnerHere) this.left();
    if (this.justLeft) {
      this.justLeft = false;
      return true;
    }
    return false;
  }

  left() {
    if (this.gone) return;
    this.gone = true;
    if (this.on) this.justLeft = true;
    this.on = false;
  }

  dispose() {
    this.disposed = true;
    this.on = false;
    for (const f of this.offs) f();
    this.offs = [];
  }
}
