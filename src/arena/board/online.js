// One board on two devices (online rooms, v11 stage B): the turn-based games played for real between
// Roji and Homama, each on their own device, through ctx.online. The game offers "Play together" on its
// first card; both copies then say hi with the way they play, the host (the one who started the game)
// sends 'go' with the shared start (who goes first, the deck), and every move travels as a small message
// that the other copy plays out the same way. Outside a room nothing here is used.

export function together(ctx) {
  const O = ctx.online;
  const can = !!O?.inRoom;
  const pa = ctx.looks[ctx.partner] || {};
  const name = pa.name || ctx.partner;
  const his = pa.gender === 'boy' ? 'his' : 'her';
  const him = pa.gender === 'boy' ? 'him' : 'her';
  const offs = [];
  const got = {}; // the first 'hi' and 'go' from the other copy
  const wake = {};
  let live = false;
  let gone = false;
  let left = false;
  const goneFns = [];
  const fire = () => {
    if (!live || gone) return;
    gone = true;
    live = false;
    for (const f of goneFns) f();
  };
  if (can) {
    for (const type of ['hi', 'go'])
      offs.push(
        O.on(type, (d) => {
          if (!got[type]) got[type] = d && typeof d === 'object' ? d : {};
          wake[type]?.();
        }),
      );
    offs.push(
      O.on('leave', () => {
        left = true;
        wake.hi?.();
        wake.go?.();
        fire();
      }),
    );
  }
  const wait = (type, ms) =>
    got[type] || left
      ? Promise.resolve(got[type] || null)
      : new Promise((resolve) => {
          const timer = setTimeout(() => {
            wake[type] = null;
            resolve(null);
          }, ms);
          wake[type] = () => {
            clearTimeout(timer);
            wake[type] = null;
            resolve(got[type] || null);
          };
        });

  return {
    can,
    name,
    his,
    him,
    // Playing together with the other copy right now
    get live() {
      return live;
    },
    // The other player left in the middle of a game played together
    get gone() {
      return gone;
    },
    // The extra choice on the game's first card
    option: (label = 'Play together') => ({ id: 'online', label, sub: `${name} plays on ${his} own device` }),
    // Call once the way to play is known. Another mode only tells the other copy (so it does not wait for
    // us). 'online' links up: start(theirHi) on the host returns the 'go' data both start from
    // ({ no: true } to call it off). Resolves { ok: true, host, go, hi } or { ok: false, why: 'away' | 'mode' | 'late' | 'off' }.
    async link(mode, { hello = {}, start = () => ({}) } = {}) {
      if (!can) return { ok: false, why: 'off' };
      if (mode !== 'online') {
        O.waitPartner(30000).then((here) => here && O.send('hi', { m: mode }));
        return { ok: false, why: 'mode' };
      }
      const here = await O.waitPartner(32000);
      if (!here || left) return { ok: false, why: 'away' };
      O.send('hi', { m: 'online', ...hello });
      const hi = await wait('hi', 60000);
      if (!hi) return { ok: false, why: left ? 'away' : 'late' };
      if (hi.m !== 'online') return { ok: false, why: 'mode' };
      if (O.isHost) {
        const go = { ...(start(hi) || {}) };
        O.send('go', go);
        if (go.no) return { ok: false, why: 'mode' };
        live = true;
        return { ok: true, host: true, go, hi };
      }
      const go = await wait('go', 20000);
      if (!go || go.no) return { ok: false, why: left ? 'away' : go ? 'mode' : 'late' };
      live = true;
      return { ok: true, host: false, go, hi };
    },
    // Why we play the computer after all, in a few words
    why(r) {
      if (r.why === 'mode') return `${name} is playing the computer, so you are too`;
      return `${name} is not here, so the computer plays for ${him}`;
    },
    send: (type, data) => (live ? O.send(type, data) : Promise.resolve(false)),
    on: (type, fn) => {
      const off = O.on(type, fn);
      offs.push(off);
      return off;
    },
    share: (state) => live && O.share(state),
    // The other copy's latest shared state, while playing together
    state: () => (live ? O.partnerState : null),
    now: () => O.now(),
    onGone(fn) {
      goneFns.push(fn);
    },
    // Every frame: a lost connection counts as leaving
    tick() {
      if (live && !O.partnerHere) fire();
    },
    // Who won, by name: the computer, when it finished the side of a player who left
    winner: (name, partnerSide) => (gone && partnerSide ? 'The computer' : name),
    // The game is decided: from now on a leaving partner changes nothing
    end() {
      live = false;
    },
    dispose() {
      live = false;
      for (const f of offs) f();
      offs.length = 0;
    },
  };
}

// A fingerprint of a secret pick and a long random salt (cyrb53, the same on every device): rock paper
// scissors sends it first and the pick itself only once both fingerprints are in, so neither side can
// see the other's hand before choosing its own.
export function seal(text) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export const salt = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join('');
