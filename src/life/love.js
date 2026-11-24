import { LoveUI } from './love/ui.js';
import { Nature } from './love/nature.js';
import { Gestures, FREQUENCY } from './love/gestures.js';
import { Lunch } from './love/lunch.js';
import { Secrets } from './love/secrets.js';

// Love: Homama's little gestures for Roji (a kiss, a clingy hug, a rose, her hand, a sweet line, a
// sunset together), the hospital lunch box, and twelve little secrets hidden around the island.
//
// Setting: localStorage 'roji-world-love' holds how often the gestures happen:
//   'often' | 'sometimes' (default) | 'rarely' | 'off'
// Saved: 'roji-world-love-roses' (how many roses he has given her), 'roji-world-love-lunch' (the day of
// the last lunch box), 'roji-world-secrets' (the secrets found).
// Test hook: window.__love (force a gesture or a sky moment, list and visit the secrets).

const GESTURE_IDS = ['kiss', 'hug', 'rose', 'line', 'hand', 'sunset', 'lean', 'hat'];

export default {
  id: 'love',
  init(ctx) {
    const { game, api, life, state } = ctx;
    const ui = new LoveUI(game.scene);
    const sound = game.sound;
    const sfx = (name) => {
      const ac = sound.ctx;
      if (!ac || sound.muted) return;
      const t = ac.currentTime;
      const T = (f, dt, dur, o = {}) => sound.tone(f, t + dt, dur, { gain: 0.04, ...o });
      if (name === 'kiss') {
        T(720, 0, 0.12, { slideTo: 1150, gain: 0.05 });
        T(1150, 0.1, 0.1, { slideTo: 820, gain: 0.03 });
      } else if (name === 'giggle') {
        [1250, 1420, 1320, 1500].forEach((f, i) => T(f, i * 0.075, 0.07, { type: 'triangle', slideTo: f * 0.86, gain: 0.03 }));
      } else if (name === 'hug') {
        T(392, 0, 0.5, { gain: 0.035, attack: 0.08 });
        T(587, 0.08, 0.6, { gain: 0.03, attack: 0.08 });
      } else if (name === 'pop') sound.ui('pop');
      else if (name === 'sparkle') [1568, 2093, 2637].forEach((f, i) => T(f, i * 0.06, 0.35, { gain: 0.025 }));
      else if (name === 'chime') [1047, 1319, 1568, 2093].forEach((f, i) => T(f, i * 0.11, 0.9, { gain: 0.035, attack: 0.01 }));
      else if (name === 'door') {
        T(1319, 0, 0.5, { gain: 0.04 });
        T(1047, 0.18, 0.7, { gain: 0.04 });
      } else if (name === 'star') {
        for (let i = 0; i < 7; i++) T(1800 + i * 240, i * 0.05, 0.25, { gain: 0.02 });
        T(2637, 0.4, 1.2, { gain: 0.025 });
      }
    };
    const cardOpen = () => {
      const c = document.getElementById('card');
      return !!c && !c.classList.contains('hidden');
    };
    // The town clock's phase ('Golden hour', 'Sunset', 'Night', ...), as the clock button shows it
    const phase = () => {
      if (game.phase) return game.phase();
      const el = document.querySelector('#clock .c-phase');
      return el ? el.textContent.split(' \u00b7 ')[0].trim() : '';
    };
    const L = { game, api, life, state, ui, nature: null, sfx, toast: (h, ms) => game.toast(h, ms), cardOpen, phase };
    const G = new Gestures(L);
    const lunch = new Lunch(L, G);
    const secrets = new Secrets(L);
    let ready = false;
    let broken = false;
    const safe = (name, fn) => (...a) => {
      if (broken) return;
      try {
        fn(...a);
      } catch (e) {
        broken = true; // log once and stay quiet instead of failing every frame
        console.error(`love: ${name} failed`, e);
        G.stop();
        ui.hideAll();
      }
    };
    const offs = [
      life.on(
        'tick',
        safe('tick', (dt, t) => {
          if (!ready) {
            ready = true;
            L.nature = new Nature(game.scene, game.physics);
            secrets.build();
          }
          G.tick(dt, t);
          lunch.tick(dt, t);
          secrets.tick(dt, t);
          ui.update(dt);
        }),
      ),
      life.on(
        'enter',
        safe('enter', (space) => {
          if (G.run && G.run.policy !== 'lunch') G.stop();
          ui.unsay();
          lunch.onEnter(space);
        }),
      ),
      life.on(
        'exit',
        safe('exit', (space) => {
          G.stop();
          ui.unsay();
          lunch.onExit(space);
        }),
      ),
      life.on(
        'arena',
        safe('arena', () => {
          G.stop();
          ui.hideAll();
        }),
      ),
      life.on(
        'activity',
        safe('activity', (spec) => {
          if (spec !== G.myActivity) lunch.onActivity(spec);
        }),
      ),
    ];

    const dispose = () => {
      for (const off of offs) off();
      G.dispose();
      lunch.dispose();
      secrets.dispose();
      ui.dispose();
      if (window.__love === hook) delete window.__love;
    };
    const hook = {
      // Start a gesture now: 'kiss' | 'hug' | 'rose' | 'line' | 'hand' | 'sunset' (Roji playing),
      // 'kiss' | 'lean' | 'hat' (Homama playing); 'cloud' | 'star' for the sky; 'lunch' inside the hospital
      force(id) {
        if (id === 'hug-behind' || id === 'hug-side') {
          G.hugMode = id.slice(4);
          id = 'hug';
        }
        if (id === 'cloud' || id === 'star') return secrets.skyMoment(id, id === 'cloud' ? 9 : 0);
        if (id === 'lunch') return lunch.force();
        if (id === 'tuck') return !!G.tuck(game.actors.roji.kid) || true;
        if (!GESTURE_IDS.includes(id)) return false;
        G.stop();
        if (game.partnerBusy?.startsWith?.('love-')) game.partnerBusy = null;
        return G.begin(id);
      },
      get running() {
        return G.run?.id || null;
      },
      frequency: () => G.freq,
      // The next gesture is due a second from now (natural pick, cooldowns and checks still apply)
      soon() {
        G.nextAt = G.clock + 1;
        return true;
      },
      setFrequency: (f) => G.setFrequency(f),
      frequencies: Object.keys(FREQUENCY),
      secrets: () => secrets.list.map((s) => ({ id: s.id, found: secrets.found.has(s.id), x: s.x == null ? null : +s.x.toFixed(2), z: s.z == null ? null : +s.z.toFixed(2), r: s.r })),
      found: () => secrets.found.size,
      // Stand the two kids right next to a secret (it is found on the next check)
      visit(id) {
        const s = secrets.list.find((q) => q.id === id);
        if (!s || s.x == null) return false;
        window.__roji?.goto?.(s.x, s.z);
        return { x: s.x, z: s.z };
      },
      // For screenshots: stand beside a secret and point the camera at it
      peek(id) {
        const s = secrets.list.find((q) => q.id === id);
        if (!s || !s.look) return false;
        window.__roji?.goto?.(s.look.x + 1.8, s.look.z + 1.6);
        secrets.focusT = 0;
        game.setFocus({ ...s.look, zoom: s.look.zoom ?? 0.5 });
        return s.look;
      },
      unpeek: () => game.setFocus(null),
      resetSecrets() {
        secrets.found.clear();
        secrets.saveFound();
        return true;
      },
      state: () => ({ running: G.run?.id || null, clock: +G.clock.toFixed(1), next: +G.nextAt.toFixed(1), freq: G.freq, partnerBusy: game.partnerBusy, roseHeld: !!G.roseHeld, hairRose: !!G.hairRose, hand: !!G.handOwned, lunch: !!lunch.carried, desk: !!lunch.desk?.parent, phase: phase() }),
      dispose,
    };
    window.__love = hook;
    return { dispose };
  },
};
