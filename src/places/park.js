import * as THREE from 'three';
import { kit, makeAtlas, colorBake } from './school/kit.js';
import { buildScenery } from './park/scenery.js';
import { buildCastle, CASTLE } from './park/castle.js';
import { darkness } from './park/parts.js';
import { buildCarousel } from './park/carousel.js';
import { buildWheel } from './park/wheel.js';
import { buildTeacups } from './park/teacups.js';
import { buildSwings } from './park/swings.js';
import { buildBumper } from './park/bumper.js';
import { buildComet } from './park/comet.js';
import { buildStalls } from './park/stalls.js';
import { buildMascots } from './park/mascots.js';
import { Fireworks } from './park/fireworks.js';
import { sfx } from './park/music.js';

// Roji Land: a fairytale theme park on the east side of the island. A gate with turnstiles and a
// ticket booth, a castle with a moat at the back that lights up at night (fireworks after dark),
// the Comet rollercoaster with its own little train, a carousel, the big wheel, teacups, sky swings,
// bumper cars, a games alley, a cotton candy and churros cart, a balloon seller, and the park's
// mascots Mimi (a pink bunny) and Bobo (a blue bear), who parade round the park now and then.

const PI = Math.PI;

// Where everything stands (local metres; the gate faces +Z, the street)
export const SPOTS = {
  carousel: { x: 0, z: 11 },
  teacups: { x: -10.5, z: 15.5 },
  swings: { x: 10.5, z: 16.5 },
  bumper: { x: 10.5, z: 5.5 },
  alley: { x: -10.5, z: -1.6 },
  wheel: { x: -10.5, z: -12.2 },
  station: { x: 8.5, z: -1.5 },
  tickets: { x: -6.7, z: 23.9 },
  map: { x: 7.6, z: 24.0 },
  cart: { x: -6.2, z: 18.5 },
  balloons: { x: 5.4, z: 20.8 },
  stage: { x: -10.8, z: 4.6 },
  photo: { x: 0, z: -12.4 },
  benches: [
    { x: -7.4, z: -9.4, yaw: PI },
    { x: -4.0, z: -9.4, yaw: PI },
    { x: 4.3, z: 6.7, yaw: -PI * 0.75 },
    { x: -4.3, z: 6.7, yaw: PI * 0.75 },
    { x: 4.3, z: 15.3, yaw: -PI * 0.25 },
    { x: -4.3, z: 15.3, yaw: PI * 0.25 },
  ],
  plaqueBench: 1,
  beds: [
    { x: -3.75, z: 20.0, w: 0.8, d: 3.2 },
    { x: 3.75, z: 20.0, w: 0.8, d: 3.2 },
    { x: -3.75, z: 0.7, w: 0.8, d: 4.2 },
    { x: 3.75, z: 0.7, w: 0.8, d: 4.2 },
    { x: -3.75, z: -5.2, w: 0.8, d: 4.2 },
    { x: -6.0, z: -16.75, w: 3.4, d: 0.8 },
    { x: 6.0, z: -16.75, w: 3.4, d: 0.8 },
    { x: -15.3, z: 23.5, w: 1.6, d: 4.2 },
    { x: 15.3, z: 23.5, w: 1.6, d: 4.2 },
  ],
  trees: [
    [-15.0, 26.0 - 0.8, 1.0],
    [15.0, 26.0 - 0.8, 1.0],
    [-15.3, -22.0, 1.25],
    [15.3, -22.0, 1.25],
    [-15.4, -16.0, 1.0],
    [15.4, -18.2, 1.1],
    [-15.6, 9.8, 0.9],
    [15.6, 13.0, 0.85],
    [-8.6, 25.6, 0.8],
  ],
  hedges: [
    [-12.5, 26.0, 5.6, 0.6],
    [12.5, 26.0, 5.6, 0.6],
  ],
  bins: [
    [5.9, 12.6],
    [-5.9, 9.4],
    [3.3, -12.8],
    [-9.4, 22.2],
  ],
};

export default {
  id: 'park',
  stop: {
    title: 'Roji Land',
    tag: 'Theme park',
    icon: 'park-castle',
    color: '#b9a6ff',
    text: 'A fairytale park with a castle, the Comet rollercoaster, a carousel, the big wheel, teacups, sky swings, bumper cars, a games alley and fireworks after dark.',
  },
  icons: {
    'park-castle': 'M4 21V11l2-2 2 2v3h2V8l2-3 2 3v6h2v-3l2-2 2 2v10z M10 21v-3a2 2 0 0 1 4 0v3 M12 5V2.5l2.5 1L12 4.5',
    'park-coaster': 'M2.5 18c3-9 6-12 8-12s3 4 4.5 7 3 4.5 6.5 4.5 M4 18v3 M8 10v11 M13 9v12 M18 17v4 M2.5 21h19',
    'park-wheel': 'M12 11.5m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0 M12 11.5V4.5 M12 11.5l6 3.5 M12 11.5l-6 3.5 M8.5 21l3.5-9.5 3.5 9.5',
    'park-ticket': 'M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V4H3z M14.5 4v12 M7 8h4 M7 12h3',
    'park-candy': 'M12 14l-1 7.5 M12 14c-4.5 0-6.5-3-6.5-5.5A4 4 0 0 1 9 4.6 3.6 3.6 0 0 1 12 3a3.6 3.6 0 0 1 3 1.6 4 4 0 0 1 3.5 3.9c0 2.5-2 5.5-6.5 5.5z',
    'park-balloon': 'M12 15c3.3 0 5.5-3 5.5-6.2a5.5 5.5 0 0 0-11 0C6.5 12 8.7 15 12 15z M12 15l-1 1.5h2z M12 16.5c-1 2 1 3 0 5',
    'park-bunny': 'M9 9.5C8 6 8 3 9.5 3S11 6.5 11 9 M15 9.5c1-3.5 1-6.5-.5-6.5S13 6.5 13 9 M12 21a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z M10 15h.01 M14 15h.01 M11 17.5h2',
    'park-cup': 'M4 9h13v3a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z M17 10.5h1.5a2 2 0 0 1 0 4H17 M3 21h16',
    'park-swing': 'M12 2.5v4 M4.5 8.5 12 6.5l7.5 2 M6 8.5l-2 8 M18 8.5l2 8 M2.5 16.5h3 M18.5 16.5h3',
    'park-car': 'M4.5 13.5h15l-1.5 5h-12z M7 13.5 9 9h6l2 4.5 M12 9V3',
    'park-firework': 'M12 12m-1 0a1 1 0 1 0 2 0 1 1 0 1 0-2 0 M12 3v4 M12 17v4 M3 12h4 M17 12h4 M5.6 5.6l2.8 2.8 M15.6 15.6l2.8 2.8 M5.6 18.4l2.8-2.8 M15.6 8.4l2.8-2.8',
    'park-camera': 'M3 8h4l2-2.5h6L17 8h4v11H3z M12 13.5m-3.5 0a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0',
    'park-lock': 'M6 11h12v9H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3 M12 14.5v2.5',
  },

  build(ctx) {
    const { util, api } = ctx;
    const k = kit();
    const g = new THREE.Group();
    const dynamic = [];
    const colliders = [];
    const hotspots = [];
    const updates = [];
    const atlas = makeAtlas(2048, 2048, { rough: 0.8 });
    atlas.material.alphaTest = 0.5;
    const use = (part) => {
      g.add(part.root);
      dynamic.push(...(part.dynamic || []));
      colliders.push(...(part.colliders || []));
      hotspots.push(...(part.hotspots || []));
      if (part.update) updates.push(part.update);
      return part;
    };

    const scenery = use(buildScenery(ctx, k, atlas, SPOTS));
    const castle = use(buildCastle(ctx, k, atlas));
    const phase = () => (api.game?.phase ? api.game.phase() : '');
    const moment = () => {
      const p = phase();
      if (/golden|sunset|dusk/i.test(p)) return 'sunset';
      if (/night|dawn/i.test(p) || darkness(scenery.globeMat, 0.55) > 0.6) return 'night';
      return 'day';
    };
    const debug = {};
    debug.carousel = use(buildCarousel(ctx, k, SPOTS.carousel)).debug;
    debug.wheel = use(buildWheel(ctx, k, atlas, SPOTS.wheel, { moment, fireworks: () => fireworks?.show(true) })).debug;
    debug.teacups = use(buildTeacups(ctx, k, SPOTS.teacups)).debug;
    debug.swings = use(buildSwings(ctx, k, atlas, SPOTS.swings)).debug;
    debug.bumper = use(buildBumper(ctx, k, atlas, SPOTS.bumper)).debug;
    debug.comet = use(buildComet(ctx, k, atlas)).debug;
    const stalls = use(buildStalls(ctx, k, atlas, SPOTS));
    const mascots = use(buildMascots(ctx, k, atlas, SPOTS));
    debug.mascots = mascots.debug;

    // Fireworks over the castle after dark
    const listener = () => {
      const p = api.localPos(api.player);
      return Math.max(0.15, 1 - Math.hypot(p.x, p.z + 22) / 70);
    };
    // They burst low over the moat, in front of the castle, so the town camera (which looks down) sees them
    const fireworks = new Fireworks(g, { area: { x: 0, z: -20.5, w: 15, h0: 8.5, h1: 12.5, depth: 2, ground: 1.5 }, size: 0.85, sound: api.sound, listener });
    dynamic.push(fireworks.points);
    debug.fireworks = fireworks;
    const show = { next: 12, wasDark: false };

    // Benches by the castle: watch the fireworks after dark, or sit a while by day.
    // The one on the right has a little plaque.
    const fwBench = (i) => {
      const b = SPOTS.benches[i];
      return {
        x: b.x,
        z: b.z + 0.9,
        r: 1.25,
        label: () => (darkness(scenery.globeMat, 0.55) > 0.6 ? 'Watch the fireworks' : i === SPOTS.plaqueBench ? 'Sit on the bench' : 'Sit and look at the castle'),
        icon: 'park-firework',
        act: (a) => {
          const night = darkness(scenery.globeMat, 0.55) > 0.6;
          const st = { t: 0, said: false };
          if (night) fireworks.show(true);
          a.activity({
            label: 'Get up',
            seats: [
              { who: 'roji', x: b.x + 0.36, z: b.z - 0.02, y: 0.3, yaw: PI, pose: 'sit' },
              { who: 'homama', x: b.x - 0.36, z: b.z - 0.02, y: 0.3, yaw: PI, pose: 'sit' },
            ],
            focus: night ? { x: b.x * 0.5, z: -15, y: 6, zoom: 1.3 } : { x: b.x, z: b.z - 2.2, y: 2.2, zoom: 0.7 },
            exit: { x: b.x - 0.4, z: b.z + 0.9 },
            music: night ? 0.3 : 0.8,
            update: (dt) => {
              st.t += dt;
              // Homama's arm round Roji, her head on his shoulder
              const k2 = Math.min(1, Math.max(0, (st.t - 1.2) / 0.8));
              const hk = a.homama.kid;
              const rk = a.roji.kid;
              hk.arms[1].rotation.set(-0.3 * k2, 0, -1.6 * k2 - 0.12 * (1 - k2));
              rk.head.rotation.z += -0.22 * k2;
              rk.body.rotation.z = -0.08 * k2;
              if (!st.said && st.t > 2.2) {
                st.said = true;
                if (i === SPOTS.plaqueBench && !night) a.toast('Roji finds a little brass plaque on the bench: For Roji, my favourite ride. H. She looks at Homama. He looks very innocent.', 4200);
                else if (night) a.toast('The castle lights up the sky. Roji leans on Homama to watch.', 2800);
                else a.toast('A quiet minute in front of the castle.', 2000);
              }
              if (night && !fireworks.running && st.t > 8 && !st.hearted) {
                st.hearted = true;
                a.fx.heartsAt(rk.root.position.clone().lerp(hk.root.position, 0.5).setY(1.5), 5);
              }
            },
          });
        },
      };
    };
    hotspots.push(fwBench(0), fwBench(1));
    // The ticket booth and the park map by the gate
    hotspots.push(
      {
        x: SPOTS.tickets.x + 0.2,
        z: SPOTS.tickets.z + 1.45,
        r: 1.1,
        label: 'Buy two tickets',
        icon: 'park-ticket',
        act: (a) => {
          a.sound.ui('coin');
          a.choose({
            title: 'Two tickets, please',
            text: 'Lina slides two golden tickets under the window: <b>Roji Land, admit one</b>. On the back of Roji\u2019s, in Homama\u2019s handwriting, there is a tiny heart.',
            options: [{ id: 'ok', label: 'Thank you, Lina' }],
          });
        },
      },
      {
        x: SPOTS.map.x,
        z: SPOTS.map.z + 1.0,
        r: 1.2,
        label: 'Read the park map',
        icon: 'book',
        act: (a) =>
          a.choose({
            title: 'Welcome to Roji Land',
            text: 'The <b>Comet</b> rollercoaster and the <b>bumper cars</b> are on the right, with the <b>sky swings</b> by the gate. The <b>teacups</b>, the <b>games alley</b> and the <b>big wheel</b> are on the left. The <b>carousel</b> is in the middle, and the <b>castle</b> is at the end of the avenue. Mimi and Bobo parade every few minutes, and after dark there are fireworks over the castle.',
            options: [{ id: 'ok', label: 'Let us go' }],
          }),
      },
    );
    // The castle door, and the love lock on the bridge
    const knocks = ['Knock knock. A tiny voice from inside: Mimi is busy baking cookies.', 'Knock knock. Somebody giggles behind the door, and a little shower of confetti comes out.', 'Knock knock. Bobo peeks out, waves, and shuts the door again.'];
    let knock = 0;
    hotspots.push(
      {
        x: castle.door.x,
        z: castle.door.z + 0.5,
        r: 1.0,
        label: 'Knock on the castle door',
        icon: 'door',
        act: (a) => {
          a.sound.ui('tap');
          setTimeout(() => a.sound.ui('tap'), 180);
          const night = darkness(scenery.globeMat, 0.55) > 0.6;
          a.toast(night ? 'Knock knock. A whisper from inside: Shh, the fireworks are about to start.' : knocks[knock++ % knocks.length], 3000);
          a.fx.burst(a.world(castle.door.x, castle.door.z + 0.3, 1.6), ['#ff9eb5', '#ffd166', '#8fd3ff', '#ffffff'], 30);
          if (night) setTimeout(() => fireworks.show(true), 1200);
        },
      },
      {
        x: castle.lockSpot.x,
        z: castle.lockSpot.z,
        r: 0.75,
        label: 'Read the love lock',
        icon: 'park-lock',
        act: (a) => {
          a.emote('roji', 'heart');
          sfx.chime(a.sound);
          a.fx.heartsAt(a.world(castle.lockSpot.x + 0.5, castle.lockSpot.z, 1.2), 5);
          a.toast('A heart padlock among the love locks: R + H. Homama says he threw the key in the moat, so it can never come off.', 4000);
        },
      },
    );

    // Merge every plain-coloured static mesh into a few vertex-coloured meshes (dynamic parts stay)
    colorBake(g, dynamic);

    const people = [new THREE.Vector3(), new THREE.Vector3()];
    let movers = null;
    const moveColliders = () => {
      if (!movers) {
        movers = (api.space.colliders || []).filter((c) => c.mover);
        if (!movers.length) return;
      }
      const O = api.space.origin;
      for (const c of movers) {
        const p = mascots.moverAt(c.mover);
        c.x = O.x + p.x;
        c.z = O.z + p.z;
      }
    };
    const M = CASTLE.moat;
    return {
      group: g,
      dynamic,
      colliders,
      hotspots,
      holes: [{ x: M.x, z: M.z, hw: M.hw, hd: M.hd }],
      badgeY: 9.5,
      debug, // ride states, for the test scripts
      update(dt, t) {
        people[0].copy(api.localPos(api.player));
        people[1].copy(api.localPos(api.partner));
        const dark = darkness(scenery.globeMat, 0.55);
        for (const u of updates) u(dt, t, people, dark);
        // A fireworks show every so often after dark while somebody is in the park
        const inPark = Math.abs(people[0].x) < 22 && Math.abs(people[0].z) < 32;
        if (dark > 0.6 && inPark) {
          if (!show.wasDark) show.next = Math.min(show.next, 12);
          show.next -= dt;
          if (show.next <= 0 && !api.activityRunning) {
            show.next = 75 + Math.random() * 20;
            fireworks.show(Math.random() < 0.6);
          }
        }
        show.wasDark = dark > 0.6;
        fireworks.update(dt);
        // Mimi, Bobo and the float push people aside: their colliders move with them
        moveColliders();
      },
    };
  },
};
