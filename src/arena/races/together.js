// Races played together online (stage B2), for kartrace, skirace, cyclerace, horserace and swimrace.
// While the other player plays the same race on their device (ctx.online), their racer is on our track,
// moved by their own device: each copy shares its racer a few times a second and draws the other's
// about 100 ms behind, interpolated. The host (the one who opened the race) owns the computer rivals and
// shares them too, so both screens show the same race. Both start from one moment on the shared clock
// (the host picks it as soon as the other has joined) and both measure their time from it, so the two
// times give the real finish order. Outside a room, or when the other does not join, link.begin()
// resolves 'solo' and the game plays exactly as it always did.
//
//   const link = raceLink(ctx, { lead: 4200 });
//   const mode = await link.begin();        // 'together' | 'solo' (in a room the host waits for the other)
//   await link.countdown();                  // 3, 2, 1, Go on the shared clock (together only)
//   link.share({ me: [...], ai: [[...]], f }) every frame; link.sample(link.them, out) to draw them
//   link.elapsed()                           // seconds since the shared start
//   link.update() every frame; link.onLeave(fn): the other closed the race (the computer takes over)

const CSS = `
#rt-wait { position: fixed; left: 50%; bottom: max(64px, calc(env(safe-area-inset-bottom) + 56px)); transform: translateX(-50%); z-index: 46; display: flex; align-items: center; gap: 12px; background: rgba(255,250,244,.95); border-radius: 22px; padding: 10px 12px 10px 18px; box-shadow: 0 10px 30px rgba(60,30,40,.22); font-family: var(--font, 'Fredoka', system-ui, sans-serif); color: #3b2b3f; pointer-events: auto; max-width: min(92vw, 520px); }
#rt-wait.hidden { display: none; }
#rt-wait .rt-t { display: flex; flex-direction: column; line-height: 1.15; min-width: 0; }
#rt-wait .rt-t b { font-size: 1rem; white-space: nowrap; }
#rt-wait .rt-t span { font-size: .8rem; color: #7a6470; }
#rt-wait .rt-dots i { display: inline-block; width: 7px; height: 7px; margin: 0 2px; border-radius: 50%; background: #ef5b6f; animation: rt-dot 1.1s ease-in-out infinite; }
#rt-wait .rt-dots i:nth-child(2) { animation-delay: .18s; }
#rt-wait .rt-dots i:nth-child(3) { animation-delay: .36s; }
@keyframes rt-dot { 0%, 80%, 100% { transform: scale(.55); opacity: .45; } 40% { transform: scale(1); opacity: 1; } }
#rt-wait button { border: 0; border-radius: 999px; padding: .6em 1.1em; min-height: 40px; font: 600 .9rem var(--font, system-ui); cursor: pointer; background: #f3e6dc; color: #3b2b3f; white-space: nowrap; }
#rt-wait button[hidden], #rt-wait .rt-t span[hidden] { display: none; }
body.touch #rt-wait { bottom: max(12px, calc(env(safe-area-inset-bottom) + 8px)); max-width: min(56vw, 420px); } /* between the thumbstick and the buttons */
@media (max-height: 430px) { #rt-wait { padding: 7px 8px 7px 14px; gap: 9px; } #rt-wait .rt-t b { font-size: .92rem; } }
`;

const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000;
export const round = { r2, r3 };

// The other copy's racer (or a rival the host owns) as a time line of samples: arrays of numbers.
// kinds: one letter per field, 'l' interpolate, 'a' an angle (interpolate the short way round),
// 'n' the nearest sample (flags, modes, counters), 'p' a timer that is -1 when off (interpolated only
// while it runs on both sides).
export class Track {
  constructor(kinds) {
    this.kinds = kinds;
    this.buf = [];
    this.lat = 150; // ms from their share to our screen (smoothed)
    this.seen = 0; // our clock when the last sample came
  }

  push(t, a, nowMs) {
    if (!Array.isArray(a) || !Number.isFinite(t)) return;
    const last = this.buf[this.buf.length - 1];
    if (last && t <= last.t) return;
    this.buf.push({ t, a: a.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)) });
    while (this.buf.length > 3 && this.buf[1].t < t - 1500) this.buf.shift();
    const lag = Math.max(0, nowMs - t);
    this.lat = this.buf.length < 2 ? lag : this.lat + (Math.min(lag, 1500) - this.lat) * 0.15;
    this.seen = nowMs;
  }

  get ready() {
    return this.buf.length > 0;
  }

  get latest() {
    return this.buf[this.buf.length - 1]?.a || null;
  }

  // The racer at time T (shared clock ms) into out (an array). Returns out, or null without samples.
  at(T, out = []) {
    const b = this.buf;
    if (!b.length) return null;
    const K = this.kinds;
    if (b.length === 1 || T <= b[0].t) {
      for (let i = 0; i < K.length; i++) out[i] = b[T <= b[0].t ? 0 : b.length - 1].a[i];
      return out;
    }
    let j = b.length - 1;
    while (j > 0 && b[j - 1].t > T) j--;
    let A, B, u;
    if (T >= b[b.length - 1].t) {
      // Past the newest sample: carry on for a moment at the same pace, then hold
      A = b[b.length - 2];
      B = b[b.length - 1];
      u = 1 + Math.min(T - B.t, 250) / Math.max(1, B.t - A.t);
      u = Math.min(u, 2);
    } else {
      A = b[j - 1];
      B = b[j];
      u = (T - A.t) / Math.max(1, B.t - A.t);
    }
    for (let i = 0; i < K.length; i++) {
      const a = A.a[i];
      const c = B.a[i];
      const k = K[i];
      if (k === 'n' || (k === 'p' && (a < 0 || c < 0))) out[i] = u < 0.5 ? a : c;
      else if (k === 'a') {
        let d = c - a;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        out[i] = a + d * Math.min(u, 1.5);
      } else out[i] = a + (c - a) * (u > 1 ? Math.min(u, 1.5) : u);
    }
    return out;
  }
}

export function raceLink(ctx, o = {}) {
  const on = ctx.online;
  const hud = ctx.hud;
  const names = { me: ctx.looks[ctx.me]?.name || ctx.me, them: ctx.looks[ctx.partner]?.name || ctx.partner };
  const offs = [];
  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  };
  let el = null;
  let dead = false;
  let leaveFns = [];
  let joinT = 0;
  let soloSaid = false;

  const L = {
    inRoom: !!on.inRoom,
    mode: on.inRoom ? 'pending' : 'solo', // pending, wait, ready, together, solo
    together: false,
    left: false, // they closed the race (or lost the connection) before the end
    at: null, // the shared start, ms on the shared clock
    names,
    last: null, // the latest state they shared (the whole object)
    them: new Track(o.kinds || []),
    ai: [], // Tracks of the rivals the host owns (filled on the other side)
    aiKinds: o.aiKinds || o.kinds || [],
    get host() {
      return on.isHost;
    },
    get seed() {
      return on.seed;
    },
    now: () => on.now(),
    // Seconds since the shared start (negative before it)
    elapsed: () => (L.at === null ? 0 : (on.now() - L.at) / 1000),
    // The moment to draw the other player at: a little behind their newest news, so it moves smoothly
    view() {
      const lat = Math.min(600, Math.max(0, L.them.lat));
      return on.now() - Math.max(100, lat + 100);
    },
    sample(track, out) {
      return track.at(L.view(), out);
    },
    send: (type, data) => on.send(type, data),
    on: (type, fn) => {
      const off = on.on(type, fn);
      offs.push(off);
      return off;
    },
    // Only while racing together (and once to say we race the computer instead)
    share(state) {
      if (!L.inRoom || dead) return;
      if (L.mode === 'solo') {
        if (soloSaid) return;
        soloSaid = true;
      } else if (!L.together) return;
      on.share({ t: Math.round(on.now()), at: L.at, so: L.mode === 'solo' ? 1 : 0, ...state });
    },
    onLeave(fn) {
      leaveFns.push(fn);
    },
    // Call every frame
    update() {
      if (dead) return;
      if (L.mode === 'wait' && L.skip && ctx.input.pressed('enter')) L.skip();
      if (!L.together || L.left) return;
      if (!on.partnerHere && on.now() - joinT > 1500) {
        L.left = true;
        for (const fn of leaveFns) {
          try {
            fn();
          } catch (e) {
            console.error('race leave', e);
          }
        }
      }
    },
    begin,
    countdown,
    meet,
    dispose() {
      dead = true;
      for (const f of offs) f();
      offs.length = 0;
      for (const id of timers) clearTimeout(id);
      timers.clear();
      el?.remove();
      el = null;
      leaveFns = [];
    },
  };

  // Meeting points (games with several races in a row): who has arrived, and the moments agreed
  const arrived = new Set();
  const agreed = new Map();
  const meetWaiters = new Set();
  const poke = () => meetWaiters.forEach((fn) => fn());
  // Their shared state: their racer (me), the rivals (ai, from the host)
  if (L.inRoom) {
    L.on('mt', (d) => d && typeof d.k === 'string' && (arrived.add(d.k), poke()));
    L.on('mg', (d) => d && typeof d.k === 'string' && Number.isFinite(d.at) && (agreed.set(d.k, d.at), poke()));
    L.on('state', (st) => {
      if (!st || typeof st !== 'object') return;
      L.last = st;
      const n = on.now();
      if (Array.isArray(st.me)) L.them.push(st.t, st.me, n);
      if (Array.isArray(st.ai) && !on.isHost) {
        st.ai.forEach((a, i) => {
          if (!L.ai[i]) L.ai[i] = new Track(L.aiKinds);
          L.ai[i].push(st.t, a, n);
        });
      }
    });
  }

  function panel(title, sub, button) {
    if (!document.getElementById('rt-style')) {
      const s = document.createElement('style');
      s.id = 'rt-style';
      s.textContent = CSS;
      document.head.appendChild(s);
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'rt-wait';
      el.innerHTML = `<span class="rt-dots"><i></i><i></i><i></i></span><span class="rt-t"><b></b><span></span></span><button type="button"></button>`;
      document.body.appendChild(el);
    }
    el.querySelector('.rt-t b').textContent = title;
    el.querySelector('.rt-t span').textContent = sub || '';
    el.querySelector('.rt-t span').hidden = !sub;
    const b = el.querySelector('button');
    b.textContent = button || '';
    b.hidden = !button;
    el.classList.remove('hidden');
    return b;
  }
  const hidePanel = () => el?.classList.add('hidden');

  // In a room: the host waits for the other player, then picks the start; the other waits for it.
  // Resolves 'together' (L.at is the start) or 'solo' (play against the computer, as always).
  async function begin() {
    if (!L.inRoom) return 'solo';
    const lead = o.lead || 4000;
    for (;;) {
      if (dead) return 'solo';
      if (on.isHost) {
        L.mode = 'wait';
        let skip;
        const skipped = new Promise((res) => (skip = res));
        const btn = panel(`Waiting for ${names.them}`, 'They have the invitation', 'Start now');
        btn.onclick = () => {
          ctx.sound?.ui?.('tap');
          skip('skip');
        };
        L.skip = () => skip('skip'); // the Enter key (and tests)
        const got = await Promise.race([on.waitPartner(32000), skipped]);
        if (dead) return 'solo';
        if (got === true && !on.isHost) continue; // both opened it at once and theirs won: join theirs
        if (got === true) {
          L.at = Math.round(on.now() + lead);
          L.mode = 'together';
          L.together = true;
          joinT = on.now();
          on.send('go', { at: L.at });
          L.share({});
          hidePanel();
          return 'together';
        }
        L.mode = 'solo';
        on.send('solo', null);
        L.share({});
        hidePanel();
        return 'solo';
      }
      // The one who joined: the host's start comes as a message (or in its shared state)
      L.mode = 'ready';
      panel(`Getting ready with ${names.them}`, '', '');
      const res = await new Promise((resolve) => {
        const done = (v) => {
          clearInterval(poll);
          offA();
          offB();
          offC();
          resolve(v);
        };
        const pick = (st) => {
          if (!st) return;
          if (st.so) return done('solo');
          if (Number.isFinite(st.at)) done(st.at);
        };
        const offA = on.on('go', (d) => d && Number.isFinite(d.at) && done(d.at));
        const offB = on.on('solo', () => done('solo'));
        const offC = on.on('leave', () => done('solo'));
        const t0 = on.now();
        const poll = setInterval(() => {
          if (dead) return done('solo');
          pick(on.partnerState);
          if (on.isHost) return done('host'); // the merge went the other way
          if (on.now() - t0 > 15000) done('solo');
        }, 120);
        pick(on.partnerState);
      });
      if (dead) return 'solo';
      if (res === 'host') continue;
      hidePanel();
      if (res === 'solo' || on.now() - res > 20000) {
        L.mode = 'solo';
        return 'solo';
      }
      L.at = res;
      L.mode = 'together';
      L.together = true;
      joinT = on.now();
      return 'together';
    }
  }

  // Both arrive at the same point (key), then agree on a moment lead ms later: the host picks it as soon
  // as the other has arrived. Resolves the moment (shared clock ms), or null when the other has gone.
  function meet(key, lead = 3000) {
    if (!L.together || L.left || dead) return Promise.resolve(null);
    if (!on.isHost) on.send('mt', { k: key });
    return new Promise((resolve) => {
      let shown = false;
      const t0 = on.now();
      const check = () => {
        if (dead || L.left || !on.partnerHere) return finish(null);
        if (on.isHost && arrived.has(key)) {
          const at = Math.round(on.now() + lead);
          on.send('mg', { k: key, at });
          return finish(at);
        }
        if (!on.isHost && agreed.has(key)) return finish(agreed.get(key));
        if (!shown && on.now() - t0 > 1200) {
          shown = true;
          panel(`Waiting for ${names.them}`, '', '');
        }
      };
      const poll = setInterval(check, 150);
      const finish = (v) => {
        clearInterval(poll);
        meetWaiters.delete(check);
        hidePanel();
        resolve(v);
      };
      meetWaiters.add(check);
      check();
    });
  }

  // 3, 2, 1, Go on the shared clock (resolves at the start). n numbers, step ms apart.
  function countdown(n = 3, step = 800) {
    return new Promise((resolve) => {
      let shown = n + 1;
      const tick = () => {
        if (dead) return resolve();
        const left = L.at - on.now();
        if (left <= 0) {
          hud.message('Go!', 700);
          ctx.sound?.ui?.('good');
          return resolve();
        }
        const k = Math.ceil(left / step);
        if (k <= n && k < shown) {
          shown = k;
          hud.message(String(k), 700);
          ctx.sound?.ui?.('tick');
        }
        later(tick, Math.min(40, left));
      };
      tick();
    });
  }

  return L;
}

// Places from finish times (shared clock seconds). list: [{ time, finished, slot }]: a tie goes to the
// smaller slot (the same racer on both screens).
export function rank(list, key = 'time') {
  const done = list.filter((r) => r.finished).sort((a, b) => r2(a[key]) - r2(b[key]) || (a.slot ?? 0) - (b.slot ?? 0));
  done.forEach((r, i) => (r.place = i + 1));
  return done;
}
