// Snowflake Peak: the snowy ski area at the far end of the map. A big ski hill with a chairlift,
// an ice rink to skate on together, a corner for building snowmen, a ski rental hut, the start
// of the ski race and a cosy lodge with hot cocoa by the fire. Snow falls around the kids here.
import { vcMat, snowmanGeo, growableSnowman, SNOWMAN_STYLES, beanie, scarf, snowfall, bakeColored } from './ski/kit.js';
import { buildHill, HILL_FRONT } from './ski/hill.js';
import { builder, labelTex, buildRink, RINK, buildRentalHut, buildStart, ARCH, buildPaths, buildFence, buildLamp, buildNature, hillPines, buildBunnies, updateBunnies, buildBirdHouse, buildSled } from './ski/scenery.js';
import { buildLodgeExterior, lodgeInterior, LODGE } from './ski/lodge.js';


const SLOTS = [
  { x: -6.8, z: 4.4 },
  { x: -4.4, z: 3.9 },
  { x: -2.0, z: 4.4 },
];
const SNOWMAN_NAMES = ['Marshmallow', 'Button', 'Sir Flurry', 'Snowdrop', 'Pebble', 'Cocoa Bean', 'Sugar', 'Mr Mittens'];

export default {
  id: 'ski',
  stop: {
    title: 'Snowflake Peak',
    tag: 'Ski area',
    icon: 'ski_flake',
    color: '#5aaee0',
    text: 'Skate together, build snowmen, sip cocoa by the fire and race down the mountain.',
  },
  icons: {
    ski_flake: 'M12 2.5v19 M3.8 7.25l16.4 9.5 M3.8 16.75l16.4-9.5 M9.6 4.2 12 5.8l2.4-1.6 M9.6 19.8 12 18.2l2.4 1.6 M4.3 10.6l2.5-.7-.6-2.6 M19.7 13.4l-2.5.7.6 2.6 M4.3 13.4l2.5.7-.6 2.6 M19.7 10.6l-2.5-.7.6-2.6',
    ski_skate: 'M7 3.5h4.5v7.2l5.2 2.3a2.4 2.4 0 0 1 1.4 2.2V17H7z M4 20.5h15.5 M9 17v3.5 M15.5 17v3.5',
    ski_snowman: 'M12 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M12 21a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z M6.7 13.3 3.5 11.4 M17.3 13.3l3.2-1.9 M12 14h.01 M12 17h.01',
    ski_race: 'M4 20 10 8l3.5 5.5L16 10l5 10z M10 8V3 M10 3l4 1.6L10 6.2',
    ski_cocoa: 'M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16 M8.5 3.5c0 1.2 1.2 1.2 1.2 2.5 M12.3 3.5c0 1.2 1.2 1.2 1.2 2.5',
  },

  build(ctx) {
    const { THREE, util, size, api } = ctx;
    const { mat, mesh, easeOutBack, easeOutCubic, clamp, rng } = util;
    const g = new THREE.Group();
    const dynamic = [];
    const colliders = [];
    const b = builder(g);
    const vcFlat = vcMat({ flatShading: true, roughness: 0.85 });
    const vcSoft = vcMat({ roughness: 0.9 });

    // ---------------------------------------------------------- landscape
    const hill = buildHill(g, dynamic, vcSoft);
    colliders.push({ type: 'box', x: 0, z: (HILL_FRONT - 15.4) / 2 - 0.2, hw: size.w / 2, hd: (HILL_FRONT + 15.4) / 2 }, { type: 'circle', x: 5.2, z: -7.4, r: 1.4 });
    buildRink(g, colliders);
    const hut = buildRentalHut(g, colliders, ctx.makeKid, ctx.looks);
    buildStart(g, colliders);
    const lodge = buildLodgeExterior(g, colliders, dynamic);
    buildPaths(g, [
      [[0, 11.5], [0.4, 9], [-0.3, 6.5], [0, 3], [0.5, 0.2]],
      [[0.5, 0.2], [5, -0.7], [10, -0.3], [LODGE.x, -0.55]],
      [[0.5, 0.2], [-1.6, -2.2], [-3.4, -3.9]],
      [[0.5, 0.2], [3.2, -2.8], [4.6, -5.4]],
      [[-1.6, -2.2], [-6, -3.3], [ARCH.x, -4.3]],
      [[-0.3, 6.6], [-6, 7.9], [-12, 8.6], [RINK.x, 8.2]],
    ]);
    buildFence(g, colliders, [-27.2, 7.6], [-20.5, 9.6]);
    buildFence(g, colliders, [-20.5, 9.6], [-13.5, 10.2]);
    buildFence(g, colliders, [7.5, 10.2], [16, 9.9]);
    buildFence(g, colliders, [16, 9.9], [24, 8]);
    for (const [x, z] of [[2.1, 10.2], [-2.1, 2.3], [6.8, -1.9], [-11.2, 9.4], [-7.5, -2.0], [11.2, 1.2]]) buildLamp(g, colliders, x, z);

    const r = rng(17);
    const pines = [
      [-26, 12.4, 1.1], [-24, 13.4, 0.9], [-27, 9.6, 1.0], [-22.6, 11.6, 0.75], [-18.5, 12.6, 0.7],
      [25.5, 12.8, 1.1], [23, 13.6, 0.85], [27, 10.4, 0.95], [20.8, 12.0, 0.7], [17.5, 12.8, 0.65],
      [-26.8, 4, 1.05], [-25.2, 0.8, 0.85], [-27, -2.8, 1.2], [-24.6, -4.9, 0.8],
      [26.6, 3.5, 1.1], [24.6, 1.2, 0.8], [26.8, -2, 1.0], [22.6, -2.6, 0.9], [23.6, -6.0, 1.15],
      [8.4, -6.6, 0.9], [9.3, -3.8, 0.65], [-9.6, 0.4, 0.7], [12.2, 6.8, 0.8], [6.4, 9.0, 0.6],
    ].map(([x, z, s]) => ({ x, z, s, ry: r() * 6, color: r() < 0.5 ? '#ffffff' : '#eaf6ee' }));
    const rocks = [
      [-24.5, 7.4, 0.9], [-21, 11.2, 0.6], [24, 6.2, 1.0], [21.8, 9, 0.55], [-25.4, -1.4, 0.7], [10.2, 4.6, 0.6],
      [-14, -2.2, 0.5], [3.6, 10.6, 0.5], [-26.2, 10.8, 0.55], [26.2, 7.6, 0.75], [20.6, -3.8, 0.5],
    ].map(([x, z, s]) => ({ x, z, s, ry: r() * 6 }));
    const mounds = [];
    for (let i = 0; i < 26; i++) {
      const x = -26 + r() * 52;
      const z = HILL_FRONT - 0.1 - r() * 0.5;
      mounds.push({ x, y: -0.05, z, sx: 1 + r() * 1.4, sy: 0.32 + r() * 0.2, sz: 0.8 + r() * 0.5 });
    }
    for (const p of pines) mounds.push({ x: p.x + 0.2, y: -0.04, z: p.z + 0.25, sx: 1.2 * p.s, sy: 0.25, sz: 1.1 * p.s });
    for (const [x, z, s] of [[-20, -3, 1.3], [-23.5, 5.6, 1], [20, 3.5, 1.4], [14.5, 7.6, 1.1], [-14.5, 11, 1], [4.5, 6.2, 0.8], [-9, -5, 0.9], [9.2, -1.5, 0.7], [20.2, -1.2, 1.1], [10.1, -8.4, 1.2], [21, -8.2, 1.3]]) {
      mounds.push({ x, y: -0.05, z, sx: s * 1.3, sy: 0.3 * s + 0.1, sz: s });
    }
    buildNature(g, colliders, vcFlat, { pines: [...pines, ...hillPines(26)], rocks, mounds });
    const bunnies = buildBunnies(g, dynamic, vcSoft, [[17.5, 5.2, 1.8], [-23, 6.4, 1.1]]);
    buildBirdHouse(g, colliders, 5.2, 6.8);
    buildSled(g, -10.2, 6.0, 0.6);
    buildSled(g, 13.4, 3.6, -0.4, '#c7a6ff');
    colliders.push({ type: 'circle', x: -10.2, z: 6.0, r: 0.5, h: 0.5 }, { type: 'circle', x: 13.4, z: 3.6, r: 0.5, h: 0.5 });

    // Welcome sign at the entrance
    const welcome = ctx.sign(['Ski area', 'Snowflake Peak'], { width: 2.8, height: 1.15, accent: '#4aa3df', color: '#4aa3df' });
    welcome.position.set(-3.4, 0, 11.6);
    welcome.rotation.y = 0.25;
    g.add(welcome);
    const signSnow = b.rbox(2.95, 0.14, 0.24, '#f6f9fc', 0.06, -3.4, 2.47, 11.6);
    signSnow.rotation.y = 0.25;
    colliders.push({ type: 'box', x: -3.4, z: 11.6, hw: 1.3, hd: 0.2 });

    // The big snowman by the lodge path
    const deco = new THREE.Mesh(snowmanGeo(SNOWMAN_STYLES[0]), vcSoft);
    deco.castShadow = deco.receiveShadow = true;
    deco.position.set(8.8, 0, 2.6);
    deco.rotation.y = -0.35;
    deco.scale.setScalar(1.05);
    g.add(deco);
    dynamic.push(deco);
    colliders.push({ type: 'circle', x: 8.8, z: 2.6, r: 0.55 });

    // ---------------------------------------------------------- snowman corner
    const cornerSign = labelTex('Snowman Corner', { w: 640, h: 170, edge: '#ef5b6f' });
    b.box(0.1, 1.2, 0.1, '#9b6a43', -9.95, 0.6, 2.95);
    b.box(0.1, 1.2, 0.1, '#9b6a43', -8.25, 0.6, 2.95);
    b.rbox(2.0, 0.6, 0.08, '#ef5b6f', 0.05, -9.1, 1.3, 2.95);
    b.plane(1.9, 0.5, cornerSign, -9.1, 1.3, 3.0);
    b.rbox(2.05, 0.08, 0.16, '#f6f9fc', 0.03, -9.1, 1.64, 2.95);
    // A crate of carrots, a bucket of coal and a stack of snowballs
    b.rbox(0.7, 0.42, 0.5, '#c98a5a', 0.04, -9.7, 0.21, 4.1);
    for (let i = 0; i < 4; i++) {
      const c = b.cone(0.045, 0.3, '#f28c38', -9.9 + i * 0.13, 0.46, 4.1 + (i % 2) * 0.1, 8);
      c.rotation.z = 1.3 + i * 0.1;
    }
    b.cyl(0.2, 0.16, 0.3, '#4aa3df', -9.3, 0.15, 4.95, 14);
    for (let i = 0; i < 5; i++) b.sph(0.05, '#2b2430', -9.35 + (i % 3) * 0.06, 0.32, 4.91 + (i % 2) * 0.07, 6);
    for (const [dx, dy, dz] of [[0, 0.16, 0], [0.3, 0.16, 0.05], [0.15, 0.16, 0.28], [0.15, 0.42, 0.11]]) b.sph(0.17, '#f6f9fc', -10.3 + dx, dy, 3.6 + dz, 10);
    colliders.push({ type: 'box', x: -9.7, z: 4.1, hw: 0.36, hd: 0.26, h: 0.42 }, { type: 'circle', x: -9.3, z: 4.95, r: 0.2 }, { type: 'circle', x: -10.15, z: 3.7, r: 0.35 });
    colliders.push({ type: 'circle', x: -9.95, z: 2.95, r: 0.12 }, { type: 'circle', x: -8.25, z: 2.95, r: 0.12 });

    const state = api.load('snowmen', null) || {};
    if (!Array.isArray(state.styles) || state.styles.length !== SLOTS.length) state.styles = SLOTS.map(() => null);
    state.next = Number.isInteger(state.next) ? state.next : 0;
    state.made = Number.isInteger(state.made) ? state.made : 0;
    const slots = SLOTS.map((s, i) => {
      const seed = b.sph(0.22, '#f6f9fc', s.x, 0.2, s.z, 12);
      seed.scale.y = 0.9;
      dynamic.push(seed);
      const patch = mesh(new THREE.CircleGeometry(0.9, 20), mat('#ffffff', { rough: 1 }), { cast: false });
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(s.x, 0.014, s.z);
      g.add(patch);
      colliders.push({ type: 'circle', x: s.x, z: s.z, r: 0.45 });
      return { ...s, seed, done: null, i };
    });
    const placeDone = (slot, styleIdx) => {
      const m = new THREE.Mesh(snowmanGeo(SNOWMAN_STYLES[styleIdx % SNOWMAN_STYLES.length]), vcSoft);
      m.castShadow = m.receiveShadow = true;
      m.position.set(slot.x, 0, slot.z);
      m.rotation.y = (slot.i - 1) * -0.25;
      m.scale.setScalar(0.82);
      g.add(m);
      slot.done = m;
      slot.seed.visible = false;
      return m;
    };
    slots.forEach((s, i) => {
      if (state.styles[i] !== null && state.styles[i] !== undefined) {
        const m = placeDone(s, state.styles[i]);
        dynamic.push(m);
      }
    });

    // Building animation
    let build = null;
    const worldAt = (x, z, y = 0) => api.world(x, z, y);
    const ORDER = [
      { name: 'mid', at: 2.3, drop: 1.0 },
      { name: 'head', at: 3.1, drop: 0.9 },
      { name: 'face', at: 3.9 },
      { name: 'buttons', at: 4.3 },
      { name: 'arms', at: 4.7 },
      { name: 'scarf', at: 5.2 },
      { name: 'hat', at: 5.8, drop: 0.8 },
    ];
    const setPart = (m, k, drop = 0) => {
      const p = m.userData.pivot;
      m.visible = k > 0;
      if (drop) {
        m.scale.setScalar(1);
        m.position.set(p.x, p.y + (1 - easeOutBack(Math.min(1, k))) * drop, p.z);
      } else m.scale.setScalar(Math.max(0.001, easeOutBack(Math.min(1, k))));
    };
    const finishBuild = () => {
      if (!build) return;
      const bd = build;
      build = null;
      bd.gs.root.removeFromParent();
      placeDone(bd.slot, bd.style);
      state.styles[bd.slot.i] = bd.style;
      state.next = (bd.slot.i + 1) % SLOTS.length;
      state.made = (state.made || 0) + 1;
      api.save('snowmen', state);
      for (const a of [api.player, api.partner]) a.kid.hands = null;
    };
    const stepBuild = (dt, a) => {
      const bd = build;
      if (!bd) return;
      const t0 = bd.t;
      bd.t += dt;
      const t = bd.t;
      const P = bd.gs.parts;
      const k = Math.min(1, t / 2.1);
      const s = 0.12 + 0.88 * easeOutCubic(k);
      P.base.scale.setScalar(s);
      P.base.position.y = P.base.userData.pivot.y * s;
      P.base.rotation.x = -t * 2.2 * (1 - k);
      if (t < 2.1 && Math.floor(t / 0.45) !== Math.floor(t0 / 0.45)) a.fx.puff(worldAt(bd.slot.x + (Math.random() - 0.5) * 0.6, bd.slot.z + 0.3));
      for (const o of ORDER) {
        const kk = (t - o.at) / 0.45;
        setPart(P[o.name], kk, o.drop);
        if (t0 < o.at + (o.drop ? 0.3 : 0) && t >= o.at + (o.drop ? 0.3 : 0)) {
          a.sound.ui('pop');
          if (o.drop) a.fx.puff(worldAt(bd.slot.x, bd.slot.z + 0.4));
        }
      }
      if (t0 < 2.1 && t >= 2.1) for (const q of [a.player, a.partner]) q.kid.hands = 'carry';
      if (t0 < 3.9 && t >= 3.9) for (const q of [a.player, a.partner]) q.kid.hands = 'hold';
      if (t0 < 6.5 && t >= 6.5) {
        for (const q of [a.player, a.partner]) {
          q.kid.hands = null;
          q.kid.emote('cheer');
        }
        a.fx.burst(worldAt(bd.slot.x, bd.slot.z, 1.4), ['#ffffff', '#bfe8ff', '#ff9eb5', '#ffd166'], 40);
        a.fx.heartsAt(worldAt(bd.slot.x, bd.slot.z, 1.9), 4);
        a.sound.ui('win');
        a.toast(`${a.player.kid.name} and ${a.partner.kid.name} built a snowman. Say hello to <b>${bd.name}</b>!`, 3200);
      }
      if (t >= 6.5) {
        const wig = Math.sin((t - 6.5) * 9) * 0.08 * Math.max(0, 1 - (t - 6.5) / 1.2);
        bd.gs.root.rotation.z = wig;
      }
      if (t >= 8.2) a.endActivity();
    };
    const startBuild = (a) => {
      if (build || a.activityRunning) return;
      const slot = slots[state.next % SLOTS.length];
      if (slot.done) {
        a.fx.poof(worldAt(slot.x, slot.z));
        slot.done.removeFromParent();
        slot.done = null;
      }
      slot.seed.visible = false;
      const used = new Set(slots.filter((q) => q !== slot && q.done).map((q) => state.styles[q.i]));
      let style = ((state.made || 0) * 2 + 1) % SNOWMAN_STYLES.length;
      for (let i = 0; i < SNOWMAN_STYLES.length && used.has(style); i++) style = (style + 1) % SNOWMAN_STYLES.length;
      const gs = growableSnowman(SNOWMAN_STYLES[style], vcSoft);
      gs.root.position.set(slot.x, 0, slot.z);
      gs.root.rotation.y = (slot.i - 1) * -0.25;
      gs.root.scale.setScalar(0.82);
      for (const o of ORDER) gs.parts[o.name].visible = false;
      g.add(gs.root);
      build = { slot, style, gs, t: 0, name: SNOWMAN_NAMES[(state.made || 0) % SNOWMAN_NAMES.length] };
      a.activity({
        label: 'Stop building',
        seats: [
          { who: 'player', x: slot.x - 1.0, z: slot.z + 0.45, yaw: Math.PI / 2 - 0.4, pose: 'stand', hands: 'stir' },
          { who: 'partner', x: slot.x + 1.0, z: slot.z + 0.45, yaw: -Math.PI / 2 + 0.4, pose: 'stand', hands: 'stir' },
        ],
        focus: { x: slot.x, z: slot.z + 0.6, y: 1.0, zoom: 0.5 },
        exit: { x: slot.x - 0.4, z: slot.z + 1.7 },
        update: (dt) => stepBuild(dt, a),
        onEnd: () => finishBuild(),
      });
    };

    // ---------------------------------------------------------- skating together
    const bladeMat = mat('#d6dee7', { rough: 0.25, metal: 0.7 });
    const blades = [];
    const addSkates = (kid) => {
      for (const leg of kid.legs) {
        const bl = new THREE.Group();
        const blade = mesh(new THREE.BoxGeometry(0.025, 0.05, 0.27), bladeMat);
        blade.position.set(0, -0.345, 0.03);
        const curl = mesh(new THREE.TorusGeometry(0.03, 0.009, 4, 8, Math.PI), bladeMat);
        curl.rotation.y = Math.PI / 2;
        curl.position.set(0, -0.34, 0.16);
        bl.add(blade, curl);
        leg.add(bl);
        blades.push(bl);
      }
    };
    let skate = null;
    const skatePos = (th) => ({
      x: RINK.x + Math.cos(th) * 3.9,
      z: RINK.z + Math.sin(th) * 2.05,
      tx: -Math.sin(th) * 3.9,
      tz: Math.cos(th) * 2.05,
    });
    const startSkate = (a) => {
      const th = Math.PI / 2;
      const p = skatePos(th);
      a.activity({
        label: 'Stop skating',
        seats: [
          { who: 'player', x: p.x, z: p.z, y: 0.05, yaw: -Math.PI / 2, pose: 'stand' },
          { who: 'partner', x: p.x + 0.7, z: p.z, y: 0.05, yaw: -Math.PI / 2, pose: 'stand' },
        ],
        focus: { x: RINK.x, z: RINK.z + 0.4, y: 0.6, zoom: 0.78 },
        exit: { x: RINK.x - 0.4, z: RINK.z + RINK.hd + 1.1 },
        update: (dt, t) => stepSkate(dt, t, a),
        onEnd: () => {
          for (const bl of blades) bl.removeFromParent();
          blades.length = 0;
          for (const q of [a.player, a.partner]) {
            q.kid.holdSide = 0;
            q.kid.root.rotation.z = 0;
          }
          skate = null;
        },
      });
      addSkates(a.player.kid);
      addSkates(a.partner.kid);
      skate = { th, yaw: null, spinT: 4.5, swoosh: 1 };
      a.sound.ui('swoosh');
    };
    const stepSkate = (dt, t, a) => {
      if (!skate) return;
      skate.th += dt * 0.6;
      const p = skatePos(skate.th);
      const tl = Math.hypot(p.tx, p.tz);
      const fx = p.tx / tl;
      const fz = p.tz / tl;
      const yaw = Math.atan2(fx, fz);
      let rate = 0;
      if (skate.yaw !== null) {
        let d = yaw - skate.yaw;
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        rate = d / Math.max(dt, 1e-3);
      }
      skate.yaw = yaw;
      const lx = fz;
      const lz = -fx;
      const roll = clamp(-rate * 0.18, -0.22, 0.22);
      [[a.player, 0.36, -1], [a.partner, -0.36, 1]].forEach(([q, off, hold], i) => {
        const x = p.x + lx * off;
        const z = p.z + lz * off;
        const glide = Math.sin(t * 2.4 + i * 0.4);
        q.pos.set(x, 0, z);
        q.yaw = yaw;
        q.kid.root.position.set(x, 0.05 + Math.abs(glide) * 0.015, z);
        q.kid.root.rotation.set(0, yaw + glide * 0.08, roll);
        q.kid.holdSide = q.kid.emoteType ? 0 : hold;
      });
      skate.spinT -= dt;
      if (skate.spinT <= 0) {
        skate.spinT = 7;
        for (const q of [a.player, a.partner]) q.kid.emote('spin');
        a.fx.heartsAt(worldAt(p.x, p.z, 1.9), 3);
      }
      skate.swoosh -= dt;
      if (skate.swoosh <= 0) {
        skate.swoosh = 1.4;
        swoosh(a);
      }
    };
    const swoosh = (a) => {
      const s = a.sound;
      if (!s?.ctx || s.muted || !s.noise) return;
      const c = s.ctx;
      const src = c.createBufferSource();
      src.buffer = s.noise;
      const f = c.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 3800;
      const gn = c.createGain();
      const t0 = c.currentTime;
      gn.gain.setValueAtTime(0.0001, t0);
      gn.gain.exponentialRampToValueAtTime(0.03, t0 + 0.12);
      gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      src.connect(f).connect(gn).connect(s.sfx);
      src.start(t0, Math.random() * 0.2, 0.55);
    };

    // ---------------------------------------------------------- winter hats and scarves while here
    const winter = new Map();
    const dress = (kid, on) => {
      let w = winter.get(kid);
      if (on) {
        if (!w) {
          const look = kid.look;
          w = { hat: beanie(look.accent || '#ff7fa3', '#ffffff'), scarf: scarf(look.id === 'homama' ? '#ef5b6f' : '#ffffff') };
          winter.set(kid, w);
        }
        if (w.hat.parent !== kid.head) kid.head.add(w.hat);
        if (w.scarf.parent !== kid.body) kid.body.add(w.scarf);
      } else if (w) {
        w.hat.removeFromParent();
        w.scarf.removeFromParent();
      }
    };

    // ---------------------------------------------------------- falling snow
    const snow = snowfall(650, { w: 34, h: 13, d: 28, size: 0.22 });
    g.add(snow.points);
    dynamic.push(snow.points);

    // ---------------------------------------------------------- the lodge's inside
    const interior = {
      title: lodgeInterior.title,
      build(ictx) {
        const inst = lodgeInterior.build(ictx);
        const enter = inst.onEnter;
        inst.onEnter = (a) => {
          enter?.(a);
          for (const q of [a.roji, a.homama]) dress(q.kid, false);
        };
        return inst;
      },
    };

    const hotspots = [
      { x: RINK.x, z: RINK.z + RINK.hd + 0.8, r: 1.5, label: 'Skate on the ice', icon: 'ski_skate', act: (a) => startSkate(a) },
      { x: SLOTS[1].x, z: SLOTS[1].z + 2.0, r: 1.6, label: 'Build a snowman', icon: 'ski_snowman', act: (a) => startBuild(a) },
      {
        x: ARCH.x,
        z: ARCH.z + 1.3,
        r: 1.5,
        label: 'Ski race',
        icon: 'ski_race',
        act: (a) => (a.hasArena('skirace') ? a.playArena('skirace') : a.toast('The race course is being groomed. Come back soon.')),
      },
      {
        x: hut.instructor.x,
        z: hut.instructor.z + 0.85,
        r: 1.2,
        label: 'Say hi',
        icon: 'hand',
        act: (a) => {
          a.emote('player', 'wave');
          a.sound.ui('pop');
          a.toast('The ski instructor waves back: <b>Fresh snow today!</b> The race starts at the red arch.', 3200);
        },
      },
    ];

    bakeColored(g, dynamic);

    return {
      group: g,
      dynamic,
      colliders,
      hotspots,
      pad: { x: 0, z: size.d / 2 + 1.2 },
      ground: [{ x: 0, z: -3.2, hw: 23, hd: 11.7, color: '#e3ecf6', feather: 6 }],
      zones: [
        { x: RINK.x, z: RINK.z, hw: RINK.hw - 0.15, hd: RINK.hd - 0.15, ground: 'ice' },
        { x: -4.6, z: 4.6, hw: 3.6, hd: 2.2, ground: 'snow' },
        { x: 18, z: 5.6, hw: 6.2, hd: 3.2, ground: 'snow' },
        { x: -21.5, z: -4.2, hw: 4.5, hd: 2.0, ground: 'snow' },
      ],
      door: lodge.door,
      interior,
      update(dt, t, a) {
        hill.update(dt, t);
        lodge.update(dt, t);
        updateBunnies(bunnies, dt);
        const lp = a.localPos(a.player);
        const out = Math.max(Math.abs(lp.x) - size.w / 2, lp.z - size.d / 2 + 4, -size.d / 2 - lp.z, 0);
        snow.update(dt, t, lp.x, 0, lp.z, clamp(1 - out / 8, 0, 1));
        const inArea = Math.abs(lp.x) < size.w / 2 + 1 && lp.z < size.d / 2 - 3 && lp.z > -size.d / 2 - 2;
        for (const q of [a.roji, a.homama]) dress(q.kid, inArea);
        if (build && !a.activityRunning) finishBuild();
      },
    };
  },
};
