// Playing a co-op game together in one scene (online, stage B): small helpers on top of ctx.online,
// shared by the kitchen, the parade, fishing, the log flume and the coaster. The host decides how a
// round goes (the plan) and sends it; the other copy asks for it once it is ready. Each player's kid is
// moved by their own device: the other copy draws it from the shared state, about 120 ms behind.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const nameOf = (id) => (id === 'roji' ? 'Roji' : 'Homama');

// Is the other player's copy of this game running with us (joined, not left)?
export const together = (ctx) => !!ctx.online.inRoom && ctx.online.partnerHere;

// ------------------------------------------------------------------ the plan
// Host side: plan.set(p) sends it now and again to a copy that asks later ('want'). A copy that asks
// while we play without them gets 'solo' (they play their own copy).
export function hostPlan(ctx, type = 'plan') {
  let plan = null;
  let solo = false;
  const offs = [
    ctx.online.on('want', () => {
      if (plan) ctx.online.send(type, plan);
      else if (solo) ctx.online.send('solo', null);
    }),
  ];
  return {
    get plan() {
      return plan;
    },
    set(p) {
      plan = p;
      solo = false;
      ctx.online.send(type, p);
    },
    // we play this one alone: a copy that turns up now plays its own
    alone() {
      plan = null;
      solo = true;
      ctx.online.send('solo', null);
    },
    off() {
      for (const f of offs) f();
    },
  };
}

// Guest side: ask for the host's plan and wait for it. Resolves with the plan, 'solo' (play alone) or
// null (the host left, or the game closed: isGone()).
export function guestPlan(ctx, type = 'plan', { isGone = () => false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const offs = [];
    const end = (v) => {
      if (done) return;
      done = true;
      for (const f of offs) f();
      resolve(v);
    };
    offs.push(ctx.online.on(type, (p) => end(p && typeof p === 'object' ? p : null)));
    offs.push(ctx.online.on('solo', () => end('solo')));
    offs.push(ctx.online.on('leave', () => end(null)));
    (async () => {
      for (let i = 0; i < 40 && !done; i++) {
        if (isGone()) return end(null);
        ctx.online.send('want', null);
        await sleep(i < 3 ? 1500 : 3000);
      }
      end('solo');
    })();
  });
}

// ------------------------------------------------------------------ a card while we wait for the other
const CSS = `
.coop-wait { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 46; pointer-events: auto; background: #fffaf4; color: #3b2b3f; border-radius: 24px; padding: 18px 22px; width: min(380px, 84vw); text-align: center; box-shadow: 0 18px 50px rgba(40,20,30,.3); font-family: var(--font, 'Fredoka', system-ui, sans-serif); }
.coop-wait h3 { margin: 0 0 4px; font-size: 1.2rem; }
.coop-wait p { margin: 0 0 12px; color: #6a5662; font-size: .92rem; line-height: 1.3; }
.coop-wait .dots { display: inline-flex; gap: 5px; margin: 2px 0 12px; }
.coop-wait .dots i { width: 9px; height: 9px; border-radius: 50%; background: #ef5b6f; animation: coop-dot 1.1s ease-in-out infinite; }
.coop-wait .dots i:nth-child(2) { animation-delay: .18s; background: #ffb547; }
.coop-wait .dots i:nth-child(3) { animation-delay: .36s; background: #5fb4ff; }
@keyframes coop-dot { 0%, 100% { transform: translateY(0); opacity: .5; } 50% { transform: translateY(-6px); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .coop-wait .dots i { animation: none; opacity: .8; } }
.coop-wait button { border: 0; border-radius: 999px; padding: .65em 1.2em; font: 600 .95rem var(--font, system-ui); cursor: pointer; background: #f3e6dc; color: #3b2b3f; min-height: 42px; }
.coop-wait button:empty { display: none; }
@media (max-height: 520px) { .coop-wait { padding: 12px 16px; } .coop-wait h3 { font-size: 1.05rem; } .coop-wait p { font-size: .85rem; margin-bottom: 8px; } }
`;

// A small card in the middle: { title, text, button: label | null } -> { set(spec), close(), clicked: Promise }
export function waitCard({ title, text = '', button = null } = {}) {
  if (!document.getElementById('coop-style')) {
    const s = document.createElement('style');
    s.id = 'coop-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  const el = document.createElement('div');
  el.className = 'coop-wait';
  el.innerHTML = '<h3></h3><div class="dots"><i></i><i></i><i></i></div><p></p><button></button>';
  document.body.appendChild(el);
  let onClick = null;
  const clicked = new Promise((r) => (onClick = r));
  el.querySelector('button').addEventListener('click', () => onClick(true));
  const set = (spec) => {
    if (spec.title !== undefined) el.querySelector('h3').textContent = spec.title;
    if (spec.text !== undefined) el.querySelector('p').innerHTML = spec.text;
    if (spec.button !== undefined) el.querySelector('button').textContent = spec.button || '';
  };
  set({ title, text, button });
  return {
    el,
    set,
    clicked,
    close() {
      el.remove();
      onClick(false);
    },
  };
}

// Host: wait for the other copy to start (with a card and a button to go on alone). Resolves true when
// they are here, false when they said no, left, or we chose to go alone.
export async function waitForPartner(ctx, { what = 'the game', isGone = () => false } = {}) {
  if (!ctx.online.inRoom) return false;
  if (ctx.online.partnerHere) return true;
  const them = nameOf(ctx.partner);
  const card = waitCard({ title: `Waiting for ${them}`, text: `${them} is invited to ${what}.`, button: `Play without ${them}` });
  const timer = setInterval(() => isGone() && card.close(), 300);
  const v = await Promise.race([ctx.online.waitPartner(32000), card.clicked.then(() => false)]);
  clearInterval(timer);
  card.close();
  return !!v && !isGone();
}

// ------------------------------------------------------------------ a countdown to a shared moment
// Shows 3, 2, 1 and the last word so that it lands at `at` on the shared clock (ctx.online.now()).
export async function countTo(ctx, at, { word = 'Go!', isGone = () => false } = {}) {
  const now = () => ctx.online.now();
  for (let i = 3; i >= 1; i--) {
    const wait = at - i * 800 - now();
    if (wait < -400) continue;
    if (wait > 0) await sleep(wait);
    if (isGone()) return false;
    ctx.hud.message(String(i), 700);
    ctx.sound?.ui?.('tick');
  }
  const rest = at - now();
  if (rest > 0) await sleep(rest);
  if (isGone()) return false;
  ctx.hud.message(word, 700);
  ctx.sound?.ui?.('good');
  return true;
}

// ------------------------------------------------------------------ the other player's moves
// A short history of values stamped with the shared clock: what was true at time T.
export class History {
  constructor(keepMs = 4000) {
    this.keep = keepMs;
    this.list = [];
  }
  push(at, v) {
    if (!Number.isFinite(at)) return;
    const L = this.list;
    if (L.length && at < L[L.length - 1].at) return; // out of order: keep the newer one
    L.push({ at, v });
    while (L.length > 2 && L[0].at < at - this.keep) L.shift();
  }
  // a number at T, blended between the two values around it
  num(T) {
    const L = this.list;
    if (!L.length) return null;
    let i = L.length - 1;
    while (i > 0 && L[i].at > T) i--;
    const a = L[i];
    const b = L[i + 1];
    if (!b || T <= a.at) return a.v;
    return a.v + (b.v - a.v) * Math.min(1, (T - a.at) / Math.max(1, b.at - a.at));
  }
  // the latest value at or before T (the oldest one if T is before all of them)
  at(T) {
    const L = this.list;
    if (!L.length) return null;
    for (let i = L.length - 1; i >= 0; i--) if (L[i].at <= T) return L[i].v;
    return L[0].v;
  }
  last() {
    return this.list.length ? this.list[this.list.length - 1].v : null;
  }
  lastAt() {
    return this.list.length ? this.list[this.list.length - 1].at : -Infinity;
  }
}

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// Draws the other player's kid from their shared states ({ at, ...numbers }), `delay` ms behind the
// shared clock, interpolating numbers (keys in `angles` turn the short way round).
export class Follow {
  constructor({ delay = 120, angles = [] } = {}) {
    this.delay = delay;
    this.angles = new Set(angles);
    this.list = [];
  }
  push(s) {
    if (!s || !Number.isFinite(s.at)) return;
    const L = this.list;
    if (L.length && s.at <= L[L.length - 1].at) return;
    L.push(s);
    if (L.length > 30) L.shift();
  }
  get latest() {
    return this.list[this.list.length - 1] || null;
  }
  // the state at now - delay: { ...the later sample, numbers blended }
  sample(now) {
    const L = this.list;
    if (!L.length) return null;
    const T = now - this.delay;
    let i = L.length - 1;
    while (i > 0 && L[i - 1].at > T) i--;
    const b = L[i];
    const a = L[i - 1];
    if (!a || T >= b.at) return { ...b };
    const k = Math.max(0, Math.min(1, (T - a.at) / Math.max(1, b.at - a.at)));
    const out = { ...b };
    for (const key of Object.keys(b)) {
      const x = a[key];
      const y = b[key];
      if (typeof x !== 'number' || typeof y !== 'number' || key === 'at') continue;
      out[key] = this.angles.has(key) ? x + wrap(y - x) * k : x + (y - x) * k;
    }
    return out;
  }
}

// The end of a round played together: the copy that decides settles what is still open (flush) and sends
// the final numbers; the other copy waits for them (C.fin, set by an on('fin') handler that calls
// C.finWait) and gets them back, or null if they did not come.
export async function settleFinal(ctx, C, { flush, numbers }) {
  if (C.owner) {
    await sleep(250);
    flush();
    ctx.online.send('fin', numbers());
    return null;
  }
  await new Promise((r) => {
    C.finWait = r;
    if (C.fin || !C.here) r();
    setTimeout(r, 5000);
  });
  return C.fin || null;
}

// Split n points between two players as fairly as whole numbers allow (the first gets the odd one
// when `firstOdd`).
export const halves = (n, firstOdd = true) => {
  const a = firstOdd ? Math.ceil(n / 2) : Math.floor(n / 2);
  return [a, n - a];
};
