import * as THREE from 'three';
import * as K from '../interiors/yumyum/kit.js';
import { PAL } from '../interiors/yumyum/theme.js';
import { makeFood } from '../props/food.js';
import * as FD from './cooking/food.js';
import { LEVELS, DISH, EXTRA, UPGRADES, INTRO, itemKey, parseKey, itemPrice, itemName, loadProgress, saveProgress, isOpen, starsFor, kitchenStats, challengeText, CHALLENGE_BONUS, firstLevelOf } from './cooking/levels.js';
import { buildKitchen, WT, BZ, FZ, PASS, DF, SPOT_Z, LANE_Z, CHEF, TRASH, SPOTS, DOOR_X, X, TABLES, SEAT_H } from './cooking/kitchen.js';
import { makeRing, makePuffs, makeWords, makeTagBatch, tagTexture, makeBubble, drawBubble, BUB, makeArrow } from './cooking/effects.js';
import { bakeKid, headPos, walk, animate } from './cooking/people.js';
import { createUI } from './cooking/ui.js';

// Roji's YumYum Kitchen: a Cooking Fever style restaurant game in Roji's own YumYum.
// Guests line up behind the pass and order shawarma, burgers, fries, Spanish latte, mint lemonade,
// pecan and German cake and mansaf. Tap a station to cook, tap finished food (or drag it to a guest)
// to serve. Twelve levels with stars, coins that buy kitchen upgrades, combos and tips.

const NAME = { roji: 'Roji', homama: 'Homama' };
const COMBO_WINDOW = 6;
const KEYS = { 1: 'wrap', 2: 'burger', 3: 'fries', 4: 'latte', 5: 'lemonade', 6: 'pecan', 7: 'german', 8: 'mansaf', 9: 'trash', 0: 'trash' };
const DISH_OF = {
  spit: 'wrap', bread: 'wrap', board0: 'wrap', board1: 'wrap', toum: 'toum', pickles: 'pickles',
  grill0: 'burger', grill1: 'burger', grill2: 'burger', plate0: 'burger', plate1: 'burger', cheese: 'cheese', salad: 'salad',
  fryer: 'fries', tray: 'fries', coffee: 'latte', jar: 'lemonade', pecan: 'pecan', german: 'german', pot: 'mansaf', platter: 'mansaf',
};
const VIP_ORDERS = [['wrap:toum', 'latte'], ['pecan', 'latte'], ['wrap:toum+pickles', 'lemonade'], ['german', 'latte'], ['mansaf', 'lemonade'], ['wrap:toum', 'pecan']];
const LOVE = {
  roji: ['Best shawarma on the island, Chef Roji!', 'You make every day sweeter, Roji.', 'Ten stars from me, Chef Roji!'],
  homama: ['You cook like a dream, Homama!', 'My favourite chef in the whole world.', 'That was perfect, Homama!'],
};

export default {
  id: 'cooking',
  title: "Roji's YumYum Kitchen",
  tagline: 'Cook, serve and earn stars',

  async start(ctx) {
    const { scene, camera, util, hud, input, sound, fx } = ctx;
    const { damp, clamp, easeOutBack, dampAngle } = util;
    const me = ctx.me;
    const pid = ctx.partner;
    const touch = () => document.body.classList.contains('touch');
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    let simming = false;
    let alive = true;

    // ---------------------------------------------------------------- sound
    const canSound = () => alive && !simming && sound?.ctx && !sound.muted;
    const tone = (f, d, o = {}, delay = 0) => canSound() && sound.tone(f, sound.ctx.currentTime + delay, d, o);
    const sfx = (n) => !simming && sound?.ui(n);
    let noiseBuf = null;
    function noise(dur, { freq = 3000, q = 1, gain = 0.03, slideTo = null, type = 'bandpass', delay = 0 } = {}) {
      if (!canSound() || !sound.sfx) return;
      const ac = sound.ctx;
      noiseBuf ??= sound.makeNoise();
      const src = ac.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const f = ac.createBiquadFilter();
      f.type = type;
      f.Q.value = q;
      const t0 = ac.currentTime + delay;
      f.frequency.setValueAtTime(freq, t0);
      if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.03);
      g.gain.setValueAtTime(gain, t0 + Math.max(0.04, dur - 0.1));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f).connect(g).connect(sound.sfx);
      src.start(t0, Math.random() * 0.3);
      src.stop(t0 + dur + 0.05);
    }
    const sizzle = (gain = 0.02) => noise(0.35, { freq: 5200, q: 0.7, gain, type: 'highpass' });
    const pour = (dur) => noise(dur, { freq: 600, slideTo: 1500, q: 2.5, gain: 0.028 });
    const kaching = () => {
      tone(1568, 0.07, { type: 'square', gain: 0.02 });
      tone(2093, 0.3, { type: 'triangle', gain: 0.05 }, 0.07);
      tone(2637, 0.25, { type: 'sine', gain: 0.03 }, 0.12);
    };
    const pop = (f = 700) => tone(f, 0.09, { type: 'sine', gain: 0.05, slideTo: f * 1.6 });
    const thud = () => tone(160, 0.15, { type: 'triangle', gain: 0.06, slideTo: 90 });

    // ---------------------------------------------------------------- scene
    const env = ctx.env.indoor({ color: '#f3e3cf' });
    env.hemi.intensity = 1.5;
    env.hemi.color.set('#fff6ea');
    env.hemi.groundColor.set('#e8c8b8');
    env.sun.intensity = 1.75;
    env.sun.position.set(-3, 10, 8);
    env.sun.target.position.set(0, 0.6, -0.8);
    const sc = env.sun.shadow.camera;
    sc.left = -7.5;
    sc.right = 7.5;
    sc.top = 6;
    sc.bottom = -6;
    sc.near = 2;
    sc.far = 30;
    sc.updateProjectionMatrix();
    env.sun.shadow.mapSize.set(2048, 2048);
    env.sun.shadow.bias = -0.0005;
    env.sun.shadow.normalBias = 0.03;
    fx.confetti?.geometry?.scale(0.6, 0.6, 0.6);

    const KT = buildKitchen(ctx);
    scene.add(KT.world, KT.dyn);
    const P = loadProgress(ctx.load);
    KT.applyUpgrades(P.up);
    const persist = () => !simming && saveProgress(ctx.save, P);

    // ---------------------------------------------------------------- dynamic food on the stations
    // A slot shows one cached model at a time; changing its key swaps the model with a little pop.
    const slot = (holder, scale = 1) => ({ holder, key: null, obj: null, pop: 1, scale, shake: 0 });
    function setSlot(s, key, make) {
      if (s.key === key) return;
      s.key = key;
      if (s.obj) s.holder.remove(s.obj);
      s.obj = key ? make() : null;
      if (s.obj) {
        s.obj.scale.setScalar(s.scale);
        s.holder.add(s.obj);
      }
      s.pop = 0;
    }
    const slots = {
      boards: KT.boards.map((h) => slot(h, 1.3)),
      plates: KT.plates.map((h) => slot(h, 1.3)),
      tray: slot(KT.trayFries, 1),
      basket: slot(KT.basketLoad, 1),
      cakes: { pecan: slot(KT.cakeSlots.pecan, 1.18), german: slot(KT.cakeSlots.german, 1.18) },
      platter: slot(KT.platter, 1.25),
      cups: KT.coffeeCups.map((h) => slot(h, 1.25)),
      jar: slot(KT.jarCup, 1.25),
    };
    const spitMeat = FD.spitMeat();
    KT.meatHolder.add(spitMeat);
    const pattyMats = [0, 1, 2].map(() => K.umat(FD.F.raw, { rough: 0.8 }));
    const patties = X.gx.map((x, i) => {
      const m = K.mesh(FD.pattyGeometry(), pattyMats[i], { cast: false });
      m.position.set(x, WT + 0.165, BZ + 0.02);
      m.visible = false;
      scene.add(m);
      return { m, pop: 1 };
    });
    const selRing = K.mesh(new THREE.RingGeometry(0.27, 0.34, 36), new THREE.MeshBasicMaterial({ color: PAL.ink, transparent: true, opacity: 0.85, depthWrite: false }), { cast: false });
    selRing.rotation.x = -Math.PI / 2;
    selRing.renderOrder = 2;
    selRing.visible = false;
    scene.add(selRing);

    // ---------------------------------------------------------------- fx
    const puffs = makePuffs(scene);
    const words = makeWords(scene, 6);
    const arrow = makeArrow(scene);
    const say = (text, pos, color, size) => !simming && words.say(text, pos, color, size);
    const rings = {
      grill: X.gx.map((x) => makeRing(scene, 0.2)),
      fryer: makeRing(scene, 0.22),
      coffee: [makeRing(scene, 0.19), makeRing(scene, 0.19)],
      jar: makeRing(scene, 0.19),
      pot: makeRing(scene, 0.22),
      spit: makeRing(scene, 0.19),
      pecan: makeRing(scene, 0.2),
      german: makeRing(scene, 0.2),
    };
    const tags = tagTexture();
    const keyBadges = makeTagBatch(scene, tags.texture, tags.cols, tags.rows);
    const lockTags = makeTagBatch(scene, tags.texture, tags.cols, tags.rows);

    // Flights: a model flying in an arc to a point, then a callback
    const flights = [];
    function fly(obj, from, to, { dur = 0.4, arc = 0.4, spin = 0, done, grow = 1 } = {}) {
      if (obj.parent !== scene) scene.add(obj);
      obj.position.copy(from);
      const s0 = obj.scale.x;
      flights.push({ obj, from: from.clone(), to: to.clone(), t: 0, dur: simming ? 0.01 : dur, arc, spin, done, s0, grow });
    }

    // ---------------------------------------------------------------- people
    const chef = { kid: bakeKid(K.dressChef(ctx.makeKid(me), { apron: PAL.paper, trim: PAL.ink }), { keepEyes: true }), yaw: 0.75, look: 0.75, work: 0, hands: null, cheer: 0, oops: 0 };
    chef.kid.root.position.set(CHEF.x, CHEF.y, CHEF.z);
    chef.kid.onEmoteFx = (_, k) => fx.heartsAt(headPos(k), 4);
    scene.add(chef.kid.root);
    const chefAt = (x, z, hands = 'hold', work = 0.5) => {
      chef.look = clamp(Math.atan2(x - CHEF.x, z - CHEF.z), 0.3, 1.75);
      chef.hands = hands;
      chef.work = work;
    };
    const chefCheer = () => {
      chef.cheer = 1.2;
      if (!simming) chef.kid.emote('cheer');
    };
    const chefOops = () => {
      chef.oops = 1.3;
      chef.kid.squash = 0.78;
      say('Oops!', headPos(chef.kid).add(new THREE.Vector3(0.35, 0.15, 0.2)), '#e5484d', 0.8);
    };
    const GUEST_SCALE = 1.2;
    const partner = { kid: bakeKid(ctx.makeKid(pid), { shadow: false }), busy: false };
    partner.kid.blob.removeFromParent();
    partner.kid.root.scale.setScalar(GUEST_SCALE);
    partner.kid.onEmoteFx = (_, k) => fx.heartsAt(headPos(k), 6);
    const pool = [];
    function guestKid() {
      const free = pool.filter((p) => !p.busy);
      if (free.length && (pool.length >= 9 || Math.random() < 0.45)) {
        const p = pick(free);
        p.busy = true;
        return p;
      }
      const kid = bakeKid(K.lowPolyKid(ctx.makeKid(K.guestLook())), { shadow: false });
      kid.blob.removeFromParent();
      kid.root.scale.setScalar(GUEST_SCALE);
      const p = { kid, busy: true };
      pool.push(p);
      return p;
    }
    const bags = [];
    const getBag = () => bags.pop() || FD.paperBag();

    // ---------------------------------------------------------------- hit targets
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const T = {};
    const hits = [];
    function target(key, x, y, z, w, h, d, anchor, enabled) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitMat);
      m.position.set(x, y, z);
      m.userData.key = key;
      scene.add(m);
      hits.push(m);
      T[key] = { key, m, anchor: anchor || new THREE.Vector3(x, y, z), enabled: enabled || (() => true), dish: DISH_OF[key] };
    }
    target('spit', X.spit, WT + 0.5, BZ, 0.62, 1.0, 0.5, new THREE.Vector3(X.spit, WT + 0.55, BZ));
    target('bread', X.bread, WT + 0.12, BZ, 0.52, 0.3, 0.5);
    target('toum', X.toum, WT + 0.1, BZ, 0.46, 0.3, 0.46);
    target('board0', X.board0, WT + 0.08, FZ, 0.66, 0.2, 0.5);
    target('board1', X.board1, WT + 0.08, FZ, 0.66, 0.2, 0.5);
    target('pickles', X.pickles, WT + 0.08, FZ, 0.46, 0.24, 0.46);
    X.gx.forEach((x, i) => target('grill' + i, x, WT + 0.22, BZ, 0.56, 0.3, 0.62, new THREE.Vector3(x, WT + 0.2, BZ + 0.02), () => i < 2 || (G && G.S.grillSpots > 2)));
    target('plate0', X.plate0, WT + 0.1, FZ, 0.6, 0.3, 0.5);
    target('plate1', X.plate1, WT + 0.1, FZ, 0.6, 0.3, 0.5);
    target('cheese', X.cheese, WT + 0.08, FZ, 0.5, 0.22, 0.42);
    target('salad', X.salad, WT + 0.08, FZ, 0.5, 0.24, 0.44);
    target('fryer', X.fryer, WT + 0.36, BZ, 0.86, 0.72, 0.62, new THREE.Vector3(X.fryer, WT + 0.42, BZ));
    target('tray', X.tray, WT + 0.08, FZ, 0.76, 0.24, 0.44);
    target('coffee', X.coffee, WT + 0.45, BZ, 0.74, 0.9, 0.55, new THREE.Vector3(X.coffee, WT + 0.3, BZ + 0.1));
    target('jar', X.jar, WT + 0.4, BZ, 0.46, 0.82, 0.46, new THREE.Vector3(X.jar, WT + 0.25, BZ + 0.1));
    target('pecan', X.pecan, WT + 0.26, FZ, 0.6, 0.42, 0.52, new THREE.Vector3(X.pecan, WT + 0.3, FZ));
    target('german', X.german, WT + 0.26, FZ, 0.6, 0.42, 0.52, new THREE.Vector3(X.german, WT + 0.3, FZ));
    target('pot', X.pot, WT + 0.32, BZ, 0.68, 0.6, 0.58, new THREE.Vector3(X.pot, WT + 0.4, BZ));
    target('platter', X.platter, WT + 0.1, FZ, 0.74, 0.26, 0.7);
    target('trash', TRASH.x, 0.5, TRASH.z, 0.7, 1.0, 0.7, new THREE.Vector3(TRASH.x, 0.8, TRASH.z));
    for (let i = 0; i < 4; i++) target('guest' + i, 0, DF + 1.6, SPOT_Z, 1.5, 3.2, 0.7, new THREE.Vector3(0, DF + 1.3, SPOT_Z), () => G && G.seats[i] && G.seats[i].st === 'wait' && (G.sel || press?.drag));

    const ndcV = new THREE.Vector3();
    const toPx = (v) => {
      ndcV.copy(v).project(camera);
      return { x: ((ndcV.x + 1) / 2) * innerWidth, y: ((1 - ndcV.y) / 2) * innerHeight };
    };
    function pickKey(ndc) {
      const live = hits.filter((m) => T[m.userData.key].enabled());
      const px = { x: ((ndc.x + 1) / 2) * innerWidth, y: ((1 - ndc.y) / 2) * innerHeight };
      const hitSet = new Set(input.pick(live, ndc).map((h) => h.object));
      let best = null;
      let bd = Infinity;
      const near = Math.max(28, Math.min(innerWidth, innerHeight) * 0.07);
      for (const m of live) {
        const p = toPx(T[m.userData.key].anchor);
        const d = Math.hypot(p.x - px.x, p.y - px.y) * (m.userData.key.startsWith('guest') ? 1.6 : 1);
        if ((hitSet.has(m) || d < near) && d < bd) {
          bd = d;
          best = m.userData.key;
        }
      }
      return best;
    }

    // ---------------------------------------------------------------- the shift
    let mode = 'map';
    let G = null;
    let press = null;
    let lastResult = null;

    function newRun(lv) {
      const cfg = LEVELS[lv];
      const S = kitchenStats(P.up);
      return {
        lv, cfg, S, time: cfg.time, phase: 'ready', phaseT: 0, finished: false,
        coins: 0, shown: 0, tips: 0, served: 0, lost: 0, burnt: 0, combo: 0, bestCombo: 0, comboT: 0,
        menu: new Set(Object.keys(cfg.menu)), extras: new Set(cfg.extras),
        spit: { meat: S.spitMax, t: 0 },
        boards: [null, null],
        grill: [null, null, null],
        plates: [0, 1].map(() => ({ patty: false, cheese: false, salad: false })),
        fryer: { st: 'empty', t: 0 }, tray: 0,
        coffee: [{ st: 'empty', t: 0 }, { st: 'empty', t: 0 }],
        jar: { st: 'empty', t: 0 },
        cakes: { pecan: { n: S.slices, bake: 0, drop: 1 }, german: { n: S.slices, bake: 0, drop: 1 } },
        pot: { st: 'empty', t: 0 }, platter: { step: 0, t: 0, building: false },
        seats: Array(cfg.spots).fill(null), spots: SPOTS[cfg.spots],
        spawnT: 0.5, vipAt: cfg.vip ? cfg.time * rnd(0.45, 0.72) : -1, vipDone: !cfg.vip, vipServed: false,
        sel: null, goalHit: [false, false, false], idle: 0, helpT: 0, helpKey: null, fresh: [], sizzleT: 0, lastTick: 99,
      };
    }
    let idleRun = null;
    const view = () => G || (idleRun ??= newRun(0));

    const unlocked = (key) => {
      const d = DISH_OF[key];
      return !d || G.menu.has(d) || G.extras.has(d);
    };
    const waiting = () => G.seats.map((c, i) => [c, i]).filter(([c]) => c && c.st === 'wait');
    // Everything still wanted, the most impatient guests first
    function needs(dish) {
      const out = [];
      for (const [c, i] of waiting()) for (const o of c.order) if (!o.done && (!dish || o.dish === dish)) out.push({ i, o, frac: c.pat / c.max });
      return out.sort((a, b) => a.frac - b.frac);
    }
    function wantedBy(key) {
      let best = -1;
      let bf = 9;
      for (const [c, i] of waiting()) {
        if (!c.order.some((o) => !o.done && o.key === key)) continue;
        const f = c.pat / c.max;
        if (f < bf) {
          bf = f;
          best = i;
        }
      }
      return best;
    }
    // The extra a dish still lacks for a waiting order that has all of its extras and more
    function missingExtra(key) {
      const { dish, extras } = parseKey(key);
      for (const { o } of needs(dish)) {
        const ex = parseKey(o.key).extras;
        if (!extras.every((e) => ex.includes(e))) continue;
        const m = ex.find((e) => !extras.includes(e));
        if (m) return m;
      }
      return null;
    }
    const helps = (dish, have, e) => needs(dish).some(({ o }) => [...have, e].every((x) => parseKey(o.key).extras.includes(x)));
    const pattyState = (p) => (p.t < G.S.cook ? 'raw' : p.t < G.S.cook + G.S.burn ? 'done' : 'burnt');

    // ---------------------------------------------------------------- what is ready where
    const SOURCES = ['board0', 'board1', 'plate0', 'plate1', 'tray', 'coffee', 'jar', 'pecan', 'german', 'platter'];
    const fullCup = () => G.coffee.findIndex((c, i) => i < G.S.coffeeSpouts && c.st === 'full');
    function itemAt(src) {
      if (!G || !src) return null;
      if (src.startsWith('board')) {
        const b = G.boards[+src.slice(-1)];
        return b && b.meat ? itemKey('wrap', ['toum', 'pickles'].filter((e) => b[e])) : null;
      }
      if (src.startsWith('plate')) {
        const p = G.plates[+src.slice(-1)];
        return p.patty ? itemKey('burger', ['cheese', 'salad'].filter((e) => p[e])) : null;
      }
      if (src === 'tray') return G.tray > 0 ? 'fries' : null;
      if (src === 'coffee') return fullCup() >= 0 ? 'latte' : null;
      if (src === 'jar') return G.jar.st === 'full' ? 'lemonade' : null;
      if (src === 'pecan' || src === 'german') return G.cakes[src].n > 0 && G.cakes[src].drop >= 1 ? src : null;
      if (src === 'platter') return G.platter.step >= 4 && !G.platter.building ? 'mansaf' : null;
      return null;
    }
    const sourceFor = (key) => SOURCES.find((s) => unlocked(s) && itemAt(s) === key) || null;
    const anchorOf = (key) => T[key].anchor.clone();
    const cupX = (i, S = G.S) => (S.coffeeSpouts > 1 ? X.cx2[i] : X.cx1[0]);
    function srcPos(src) {
      if (src === 'coffee') return new THREE.Vector3(cupX(Math.max(0, fullCup())), WT + 0.18, BZ + 0.13);
      if (src === 'jar') return KT.jarCup.position.clone().add(new THREE.Vector3(0, 0.15, 0));
      return anchorOf(src);
    }
    function servedModel(key) {
      const { dish, extras } = parseKey(key);
      let o;
      let s = 1.2;
      if (dish === 'wrap') [o, s] = [FD.rolledWrap(extras), 1.3];
      else if (dish === 'burger') [o, s] = [FD.openBurger({ patty: true, cheese: extras.includes('cheese'), salad: extras.includes('salad') }), 1.05];
      else if (dish === 'fries') [o, s] = [FD.friesBox(), 1.35];
      else if (dish === 'latte') [o, s] = [FD.latteGlass(), 1.12];
      else if (dish === 'lemonade') [o, s] = [FD.lemonadeGlass(), 1.12];
      else if (dish === 'pecan' || dish === 'german') [o, s] = [FD.cakeSlice(dish), 1.35];
      else {
        o = makeFood('mansaf');
        o.traverse((m) => m.isMesh && (m.castShadow = false));
        s = 1.3;
      }
      o.scale.setScalar(s);
      return o;
    }
    function consume(src) {
      if (src.startsWith('board')) G.boards[+src.slice(-1)] = null;
      else if (src.startsWith('plate')) G.plates[+src.slice(-1)] = { patty: false, cheese: false, salad: false };
      else if (src === 'tray') G.tray--;
      else if (src === 'coffee') G.coffee[fullCup()] = { st: 'empty', t: 0 };
      else if (src === 'jar') G.jar = { st: 'empty', t: 0 };
      else if (src === 'pecan' || src === 'german') {
        const c = G.cakes[src];
        c.n--;
        c.bake = 0;
      } else if (src === 'platter') G.platter = { step: 0, t: 0, building: false };
      if (G.sel === src) G.sel = null;
    }

    // ---------------------------------------------------------------- taps on stations
    const slotOf = (key) => (key.startsWith('board') ? slots.boards[+key.slice(-1)] : key.startsWith('plate') ? slots.plates[+key.slice(-1)] : key === 'tray' ? slots.tray : key === 'platter' ? slots.platter : slots.cakes[key] || null);
    function nope(key, text, point) {
      sfx('tick');
      const s = slotOf(key);
      if (s) s.shake = 0.35;
      if (key.startsWith('grill')) patties[+key.slice(-1)].shake = 0.35;
      if (text && T[key]) say(text, anchorOf(key).add(new THREE.Vector3(0, 0.45, 0.3)), PAL.inkDeep, 0.72);
      if (point && T[point]) {
        G.helpT = 2.6;
        G.helpKey = point;
      }
      return false;
    }
    function act(key) {
      if (!G || G.phase !== 'play' || !T[key]) return false;
      if (!unlocked(key)) return nope(key, `Opens at level ${firstLevelOf(DISH_OF[key]) + 1}`);
      const r = doAct(key);
      if (r) G.idle = 0;
      return r;
    }
    function doAct(key) {
      if (key.startsWith('guest')) {
        const i = +key.slice(-1);
        return G.sel && itemAt(G.sel) ? serve(G.sel, i) : false;
      }
      if (key === 'trash') return tapTrash();
      if (key === 'bread') return layBread(-1);
      if (key === 'spit') return shave(-1);
      if (key === 'toum' || key === 'pickles') return addExtra('wrap', key);
      if (key.startsWith('board')) {
        const j = +key.slice(-1);
        const b = G.boards[j];
        return !b ? layBread(j) : !b.meat ? shave(j) : serve(key);
      }
      if (key.startsWith('grill')) return tapGrill(+key.slice(-1));
      if (key.startsWith('plate')) return tapPlate(+key.slice(-1));
      if (key === 'cheese' || key === 'salad') return addExtra('burger', key);
      if (key === 'fryer') return tapFryer();
      if (key === 'tray') return G.tray > 0 ? serve('tray') : G.fryer.st === 'done' ? tapFryer() : nope('tray', 'Fry some fries first', G.fryer.st === 'empty' ? 'fryer' : null);
      if (key === 'coffee') return tapCoffee();
      if (key === 'jar') return tapJar();
      if (key === 'pecan' || key === 'german') return G.cakes[key].n > 0 ? serve(key) : nope(key, 'A fresh cake is coming');
      if (key === 'pot') return tapPot();
      if (key === 'platter') return tapPlatter();
      return false;
    }
    const selIndex = (kind) => (G.sel?.startsWith(kind) ? +G.sel.slice(-1) : -1);

    function layBread(j) {
      if (j < 0) {
        const s = selIndex('board');
        j = s >= 0 && !G.boards[s] ? s : G.boards.indexOf(null);
      }
      if (j < 0) return nope('bread', 'Both boards are busy');
      G.boards[j] = { meat: false, toum: false, pickles: false };
      const bread = FD.flatbread();
      bread.scale.setScalar(1.3);
      slots.boards[j].hideFor = 0.26;
      fly(bread, anchorOf('bread').add(new THREE.Vector3(0, 0.1, 0)), KT.boards[j].position.clone(), { dur: 0.26, arc: 0.35, done: () => bread.removeFromParent() });
      chefAt(X.bread, BZ, 'hold');
      sfx('tap');
      return true;
    }
    function shave(j) {
      if (j < 0) {
        const s = selIndex('board');
        j = s >= 0 && G.boards[s] && !G.boards[s].meat ? s : G.boards.findIndex((b) => b && !b.meat);
      }
      if (j < 0) return G.boards.every(Boolean) ? nope('spit', 'The wraps have meat') : nope('spit', 'Lay the bread first', 'bread');
      if (G.spit.meat < 1) return nope('spit', 'The meat is roasting');
      G.spit.meat -= 1;
      G.boards[j].meat = true;
      const bits = FD.meatBits();
      bits.scale.setScalar(1.4);
      fly(bits, anchorOf('spit'), KT.boards[j].position.clone().add(new THREE.Vector3(0, 0.04, 0)), { dur: 0.28, arc: 0.3, done: () => bits.removeFromParent() });
      slots.boards[j].pop = 0.3;
      chefAt(X.spit, BZ, 'stir', 0.6);
      sizzle(0.025);
      sfx('swoosh');
      return true;
    }
    function addExtra(dish, e) {
      const list = dish === 'wrap' ? G.boards : G.plates;
      const ready = (x) => (dish === 'wrap' ? x && x.meat : x.patty);
      const cand = [0, 1].filter((j) => ready(list[j]) && !list[j][e]);
      if (!cand.length) {
        if (dish === 'wrap') return G.boards.some((b) => b && !b.meat) ? nope(e, 'Add the meat first', 'spit') : nope(e, 'Make a wrap first', 'bread');
        const free = G.grill.findIndex((p, i) => !p && i < G.S.grillSpots);
        return nope(e, 'Put a patty on a bun first', G.grill.some(Boolean) || free < 0 ? null : 'grill' + free);
      }
      const all = DISH[dish].extras;
      const have = (j) => all.filter((x) => list[j][x]);
      const s = selIndex(dish === 'wrap' ? 'board' : 'plate');
      let j = cand.includes(s) ? s : -1;
      if (j < 0 || !helps(dish, have(j), e)) {
        const h = cand.find((k) => helps(dish, have(k), e));
        if (h !== undefined) j = h;
      }
      if (j < 0) j = cand[0];
      list[j][e] = true;
      const to = (dish === 'wrap' ? KT.boards : KT.plates)[j].position.clone().add(new THREE.Vector3(0, 0.12, 0));
      const bit = FD.dollop(e === 'toum' ? FD.F.toum : e === 'pickles' ? FD.F.pickle : e === 'cheese' ? FD.F.cheese : FD.F.lettuce);
      fly(bit, anchorOf(e).add(new THREE.Vector3(0, 0.08, 0)), to, { dur: 0.22, arc: 0.25, done: () => bit.removeFromParent() });
      (dish === 'wrap' ? slots.boards : slots.plates)[j].pop = 0.4;
      chefAt(T[e].anchor.x, T[e].anchor.z, 'hold');
      sfx('tap');
      pop(900);
      return true;
    }
    let lidT = 0;
    function toTrash(obj, from) {
      fly(obj, from, new THREE.Vector3(TRASH.x, 0.75, TRASH.z), { dur: 0.5, arc: 0.7, spin: 7, done: () => obj.removeFromParent() });
      lidT = 0.9;
      sfx('swoosh');
      tone(220, 0.18, { type: 'triangle', gain: 0.04, slideTo: 110 }, 0.4);
    }
    function tapGrill(i) {
      const p = G.grill[i];
      if (!p) {
        G.grill[i] = { t: 0 };
        patties[i].pop = 0;
        chefAt(X.gx[i], BZ, 'hold');
        sizzle(0.035);
        sfx('tap');
        return true;
      }
      const st = pattyState(p);
      if (st === 'raw') return nope('grill' + i, 'Still cooking');
      const from = patties[i].m.position.clone();
      if (st === 'burnt') {
        G.grill[i] = null;
        const b = FD.burntPatty();
        b.scale.setScalar(1.3);
        toTrash(b, from);
        return true;
      }
      const s = selIndex('plate');
      const j = s >= 0 && !G.plates[s].patty ? s : G.plates.findIndex((pl) => !pl.patty);
      if (j < 0) return nope('plate0', 'Serve a burger first');
      G.grill[i] = null;
      G.plates[j].patty = true;
      const m = K.mesh(FD.pattyGeometry(), K.mat(FD.F.patty, { rough: 0.85 }), { cast: false });
      m.scale.setScalar(1.3);
      slots.plates[j].pop = 0.3;
      fly(m, from, KT.plates[j].position.clone().add(new THREE.Vector3(0, 0.1, 0)), { dur: 0.25, arc: 0.3, done: () => m.removeFromParent() });
      chefAt(X.gx[i], BZ, 'stir');
      sfx('swoosh');
      return true;
    }
    function tapPlate(j) {
      if (G.plates[j].patty) return serve('plate' + j);
      const i = G.grill.findIndex((p, k) => p && k < G.S.grillSpots && pattyState(p) === 'done');
      if (i >= 0) {
        G.sel = 'plate' + j;
        const r = tapGrill(i);
        G.sel = null;
        return r;
      }
      const free = G.grill.findIndex((p, k) => !p && k < G.S.grillSpots);
      return nope('plate' + j, G.grill.some(Boolean) ? 'The patty is cooking' : 'Grill a patty first', free >= 0 && !G.grill.some(Boolean) ? 'grill' + free : null);
    }
    const basketPos = () => KT.fryBasket.position.clone().add(new THREE.Vector3(0, 0.05, 0));
    function tapFryer() {
      const f = G.fryer;
      if (f.st === 'empty') {
        G.fryer = { st: 'cook', t: 0 };
        chefAt(X.fryer, BZ, 'hold');
        noise(0.7, { freq: 4500, type: 'highpass', gain: 0.035 });
        sfx('tap');
        return true;
      }
      if (f.st === 'cook') return nope('fryer', 'Frying...');
      if (f.st === 'burnt') {
        G.fryer = { st: 'empty', t: 0 };
        toTrash(FD.friesBasketLoad(FD.F.burnt), basketPos());
        return true;
      }
      if (G.tray >= G.S.trayCap) return nope('tray', 'The tray is full');
      G.tray = G.S.trayCap;
      G.fryer = { st: 'empty', t: 0 };
      const load = FD.friesBasketLoad(FD.F.fries);
      slots.tray.hideFor = 0.3;
      fly(load, basketPos(), KT.trayFries.position.clone(), { dur: 0.3, arc: 0.35, done: () => load.removeFromParent() });
      chefAt(X.fryer, BZ, 'stir');
      sfx('swoosh');
      return true;
    }
    function tapCoffee() {
      const n = G.S.coffeeSpouts;
      const full = fullCup();
      if (full >= 0 && wantedBy('latte') >= 0) return serve('coffee');
      const empty = G.coffee.findIndex((c, i) => i < n && c.st === 'empty');
      if (empty >= 0) {
        G.coffee[empty] = { st: 'fill', t: 0 };
        slots.cups[empty].pop = 0;
        chefAt(X.coffee, BZ, 'hold');
        sfx('tap');
        pour(G.S.coffeeFill);
        return true;
      }
      if (full >= 0) return serve('coffee');
      return nope('coffee', 'Pouring...');
    }
    function tapJar() {
      if (G.jar.st === 'full') return serve('jar');
      if (G.jar.st === 'fill') return nope('jar', 'Pouring...');
      G.jar = { st: 'fill', t: 0 };
      slots.jar.pop = 0;
      chefAt(X.jar, BZ, 'hold');
      sfx('tap');
      pour(G.S.jarFill);
      return true;
    }
    function tapPot() {
      const p = G.pot;
      if (p.st === 'empty') {
        G.pot = { st: 'cook', t: 0 };
        chefAt(X.pot, BZ, 'hold');
        sfx('tap');
        thud();
        return true;
      }
      if (p.st === 'cook') return nope('pot', 'The lamb is cooking');
      if (G.platter.step > 0 || G.platter.building) return nope('platter', 'Serve the mansaf first');
      G.pot = { st: 'empty', t: 0 };
      G.platter = { step: 0, t: 0, building: true };
      chefAt(X.pot, BZ, 'stir', 1.8);
      sfx('swoosh');
      return true;
    }
    function tapPlatter() {
      if (G.platter.building) return nope('platter', 'Almost ready');
      if (G.platter.step >= 4) return serve('platter');
      if (G.pot.st === 'ready') return tapPot();
      return nope('platter', G.pot.st === 'cook' ? 'The lamb is cooking' : 'Cook the lamb in the pot', G.pot.st === 'empty' ? 'pot' : null);
    }
    // The mansaf is plated in four steps: rice, lamb, jameed and pine nuts
    function platterStep(step) {
      const to = KT.platter.position.clone().add(new THREE.Vector3(0, 0.1, 0));
      const from = anchorOf('pot').add(new THREE.Vector3(0, 0.15, 0));
      const obj = step === 1 ? FD.riceScoop() : step === 2 ? FD.lambBits() : step === 3 ? FD.dollop(FD.F.jameed) : null;
      slots.platter.pop = 0.35;
      if (obj) {
        obj.scale.setScalar(1.4);
        fly(obj, from, to, { dur: 0.3, arc: 0.35, done: () => obj.removeFromParent() });
      }
      if (step === 3) pour(0.35);
      if (step === 4) {
        puffs.emit(to.x, to.y + 0.15, to.z, '#f2dcb4', { count: 6, spread: 0.3, up: 0.2, alpha: 0.9 });
        pop(1200);
      } else sfx('tap');
    }
    function tapTrash() {
      if (G.sel && itemAt(G.sel)) {
        const src = G.sel;
        const key = itemAt(src);
        const from = srcPos(src);
        consume(src);
        toTrash(servedModel(key), from);
        return true;
      }
      const i = G.grill.findIndex((p) => p && pattyState(p) === 'burnt');
      if (i >= 0) return tapGrill(i);
      if (G.fryer.st === 'burnt') return tapFryer();
      const wrong = ['board0', 'board1', 'plate0', 'plate1'].find((s) => itemAt(s) && wantedBy(itemAt(s)) < 0 && !missingExtra(itemAt(s)));
      if (wrong) {
        G.sel = wrong;
        return tapTrash();
      }
      G.sel = null;
      return nope('trash', 'Nothing to throw away');
    }

    // ---------------------------------------------------------------- serving and paying
    const bubbles = [0, 1, 2, 3].map(() => makeBubble(scene));
    const passPos = (i, k, n) => new THREE.Vector3(G.spots[i] + (k - (n - 1) / 2) * 0.44, PASS.y, PASS.z + 0.08);
    const seatHead = (i) => headPos(G.seats[i].kid).add(new THREE.Vector3(0, 0.1, 0.35));
    function serve(src, seat = -1, from = null) {
      const key = itemAt(src);
      if (!key) return false;
      let i = seat;
      if (i >= 0) {
        const c = G.seats[i];
        if (!c || c.st !== 'wait' || !c.order.some((o) => !o.done && o.key === key)) {
          sfx('bad');
          if (c) {
            c.kid.squash = 0.86;
            say('Not on my order', seatHead(i), '#e5484d', 0.8);
          }
          return false;
        }
      } else i = wantedBy(key);
      if (i < 0) {
        const miss = missingExtra(key);
        if (miss) return nope(src, `Add ${EXTRA[miss].name}`, miss);
        if (src.startsWith('board') || src.startsWith('plate')) {
          G.sel = src;
          sfx('bad');
          slotOf(src).shake = 0.4;
          say('No one ordered this', anchorOf(src).add(new THREE.Vector3(0, 0.45, 0.3)), PAL.inkDeep, 0.72);
          G.helpT = 2.6;
          G.helpKey = 'trash';
          return false;
        }
        return nope(src, `No one wants ${DISH[parseKey(key).dish].name.toLowerCase()} yet`);
      }
      const start = from ? from.clone() : srcPos(src);
      consume(src);
      deliver(i, key, start);
      return true;
    }
    function deliver(i, key, from) {
      const c = G.seats[i];
      const k = c.order.findIndex((o) => !o.done && o.key === key);
      const o = c.order[k];
      o.done = true;
      o.model = servedModel(key);
      const to = passPos(i, k, c.order.length);
      fly(o.model, from, to, {
        dur: 0.45,
        arc: 0.7,
        done: () => {
          pop(1100);
          puffs.emit(to.x, to.y + 0.12, to.z, '#ffffff', { count: 3, spread: 0.25, up: 0.35, alpha: 0.7 });
        },
      });
      c.pat = Math.min(c.max, c.pat + c.max * 0.1);
      c.kid.squash = 1.16;
      c.bubbleKey = '';
      chefAt(from.x, from.z, 'hold', 0.35);
      sfx('good');
      if (c.order.every((q) => q.done)) pay(i);
    }
    function pay(i) {
      const c = G.seats[i];
      const base = c.order.reduce((a, o) => a + itemPrice(o.key), 0);
      const frac = clamp(c.pat / c.max, 0, 1);
      const perfect = frac >= 0.75;
      const vip = c.who === 'vip';
      let tip = Math.round(base * 0.4 * frac * G.S.tips) + (perfect ? 2 : 0);
      if (vip) tip += 6 + Math.round(base * 0.6);
      G.combo = G.comboT > 0 ? G.combo + 1 : 1;
      G.comboT = COMBO_WINDOW;
      G.bestCombo = Math.max(G.bestCombo, G.combo);
      const bonus = Math.min(G.combo - 1, 4) * 2;
      const total = base + tip + bonus;
      G.coins += total;
      G.tips += tip + bonus;
      G.served++;
      c.st = 'pay';
      c.payT = 0.9;
      bubbles[i].s.visible = false;
      const head = headPos(c.kid);
      const combo = G.combo;
      say(`+${total}`, head.clone().add(new THREE.Vector3(0, 0.3, 0.4)), '#c98a12', 1.15);
      if (!simming) {
        if (perfect) setTimeout(() => alive && say('Perfect!', head.clone().add(new THREE.Vector3(0, 0.66, 0.4)), PAL.ink, 0.95), 170);
        if (combo >= 2) setTimeout(() => alive && say(`Combo x${combo}!`, head.clone().add(new THREE.Vector3(0, 1.0, 0.4)), '#ef6f8c', 1.05), 340);
        ui.flyCoins(toPx(head), Math.min(9, 3 + Math.round(total / 7)), (k) => {
          if (k === 0) ui.bumpCoins();
          tone(1800 + k * 70, 0.05, { type: 'triangle', gain: 0.02 });
        });
        fx.heartsAt(head, vip ? 7 : 3);
        c.kid.emote(vip ? 'heart' : 'cheer');
      }
      kaching();
      c.kid.mouth.rotation.z = Math.PI;
      if (vip) {
        G.vipServed = true;
        say(pick(LOVE[me]), head.clone().add(new THREE.Vector3(0, -0.25, 0.5)), '#ef6f8c', 0.75);
      }
      if (combo >= 3 || vip || perfect) chefCheer();
      checkGoals();
    }
    function checkGoals() {
      G.cfg.goal.forEach((g, k) => {
        if (G.goalHit[k] || G.coins < g) return;
        G.goalHit[k] = true;
        if (simming) return;
        setTimeout(() => {
          if (!alive || !G || mode !== 'play') return;
          hud.message(k === 0 ? 'Goal reached!' : k === 1 ? 'Two stars!' : 'Three stars!', 1300);
          sfx('win');
          fx.burst(new THREE.Vector3(0.3, 2.3, -1.7), [PAL.ink, PAL.gold, PAL.rose, '#ffffff', PAL.olive], 50 + k * 25);
          chefCheer();
          for (const [c] of waiting()) c.kid.emote('cheer');
        }, 450);
      });
    }

    // ---------------------------------------------------------------- guests
    const outgoing = [];
    const mkItem = (key) => ({ key, dish: parseKey(key).dish, done: false, model: null });
    const DISH_ORDER = ['wrap', 'burger', 'mansaf', 'fries', 'latte', 'lemonade', 'pecan', 'german'];
    function weighted(obj) {
      const e = Object.entries(obj);
      let r = Math.random() * e.reduce((a, [, w]) => a + w, 0);
      for (const [k, w] of e) if ((r -= w) <= 0) return k;
      return e[e.length - 1][0];
    }
    function makeOrder(vip) {
      const cfg = G.cfg;
      const ok = (key) => {
        const { dish, extras } = parseKey(key);
        return G.menu.has(dish) && extras.every((x) => G.extras.has(x));
      };
      if (vip) {
        const opts = VIP_ORDERS.filter((o) => o.every(ok));
        if (opts.length) return pick(opts).map(mkItem);
      }
      const r = Math.random();
      let n = r < cfg.sizes[0] ? 1 : r < cfg.sizes[0] + cfg.sizes[1] ? 2 : 3;
      const list = [];
      let guard = 0;
      while (list.length < n && guard++ < 60) {
        const dish = weighted(cfg.menu);
        if (list.some((k) => parseKey(k).dish === dish)) continue;
        if (dish === 'mansaf') n = Math.min(n, 2);
        const ex = DISH[dish].extras.filter((x) => G.extras.has(x) && Math.random() < 0.45);
        list.push(itemKey(dish, ex));
      }
      while (list.length > n) list.splice(list.findIndex((k) => !k.startsWith('mansaf')), 1);
      list.sort((a, b) => DISH_ORDER.indexOf(parseKey(a).dish) - DISH_ORDER.indexOf(parseKey(b).dish));
      return list.map(mkItem);
    }
    function spawn(i, vip) {
      const order = makeOrder(vip);
      const n = order.length;
      const max = (G.cfg.patience + 10 * (n - 1) + (order.some((o) => o.dish === 'mansaf') ? 8 : 0)) * G.S.patience * (vip ? 1.35 : 1);
      let kid;
      let ref = null;
      if (vip) {
        kid = partner.kid;
        partner.busy = true;
      } else {
        ref = guestKid();
        kid = ref.kid;
      }
      kid.carry(null);
      kid.hands = null;
      kid.cancelEmote();
      kid.mouth.rotation.z = Math.PI;
      const side = G.spots[i] < 0.3 ? -1 : 1;
      kid.root.position.set(side * (DOOR_X + 0.9), DF, LANE_Z);
      kid.root.rotation.set(0, -side * Math.PI / 2, 0);
      scene.add(kid.root);
      G.seats[i] = { who: vip ? 'vip' : 'guest', kid, ref, order, max, pat: max, st: 'in', yaw: -side * Math.PI / 2, speed: 0, path: [new THREE.Vector3(G.spots[i], 0, LANE_Z), new THREE.Vector3(G.spots[i], 0, SPOT_Z)], bubbleKey: '', payT: 0, tilt: 0 };
      bubbles[i].k = 0;
      if (vip) {
        G.vipDone = true;
        if (!simming) {
          hud.message(`${NAME[pid]} is here!`, 1300);
          chef.kid.emote('wave');
        }
      }
    }
    function leave(i, how) {
      const c = G.seats[i];
      G.seats[i] = null;
      bubbles[i].s.visible = false;
      c.st = 'out';
      const p = c.kid.root.position;
      const side = p.x < 0.3 ? -1 : 1;
      c.path = [new THREE.Vector3(p.x, 0, LANE_Z), new THREE.Vector3(side * (DOOR_X + 1.2), 0, LANE_Z)];
      c.walkSpeed = how === 'angry' ? 3.6 : 2.8;
      if (c.who === 'vip' && how === 'happy') {
        const tb = TABLES[1];
        c.path = [new THREE.Vector3(p.x, 0, LANE_Z), new THREE.Vector3(tb.x, 0, LANE_Z), new THREE.Vector3(tb.x, 0, tb.z - 0.55)];
        c.sitT = 7;
      }
      if (how === 'angry') for (let k = 0; k < 4; k++) puffs.emit(p.x, DF + 1.9, p.z, '#8d8290', { count: 1, spread: 0.4, up: 0.25, alpha: 0.75 });
      for (const o of c.order) o.model?.removeFromParent();
      if (how === 'angry') c.kid.mouth.rotation.z = 0;
      if (how === 'happy') {
        c.bag = getBag();
        c.kid.carry(c.bag);
      }
      if (G.sel?.startsWith('guest')) G.sel = null;
      outgoing.push(c);
    }
    function releaseGuest(c) {
      c.snack?.removeFromParent();
      c.kid.pose = 'stand';
      c.kid.root.position.y = DF;
      if (c.bag) {
        c.kid.carry(null);
        bags.push(c.bag);
        c.bag = null;
      }
      c.kid.root.removeFromParent();
      if (c.ref) c.ref.busy = false;
      if (c.who === 'vip') partner.busy = false;
    }
    // Guests walking in, waiting, paying and walking out
    function people(dt, t, anim) {
      if (G) {
        G.seats.forEach((c, i) => {
          if (!c) return;
          if (c.st === 'in') {
            if (walk(c, dt, 3.0, dampAngle)) {
              c.st = 'wait';
              c.bubbleKey = '';
              bubbles[i].k = 0;
              pop(620);
              c.kid.squash = 0.86;
            }
          } else if (c.st === 'wait') {
            c.speed = 0;
            c.yaw = dampAngle(c.yaw, 0, 8, dt);
            if (G.phase === 'play') c.pat -= dt;
            c.kid.mouth.rotation.z = c.pat / c.max < 0.3 ? 0 : Math.PI;
            if (c.pat <= 0) {
              G.lost++;
              G.combo = 0;
              G.comboT = 0;
              sfx('bad');
              say('Too slow', headPos(c.kid).add(new THREE.Vector3(0, 0.2, 0.35)), '#e5484d', 1);
              leave(i, 'angry');
              return;
            }
          } else if (c.st === 'pay') {
            c.speed = 0;
            c.payT -= dt;
            if (c.payT <= 0) leave(i, 'happy');
          }
          // Waiting guests lean back a little so their faces turn up to the camera
          c.tilt = damp(c.tilt || 0, c.st === 'in' ? 0 : -0.24, 6, dt);
          c.kid.root.rotation.set(c.tilt, c.yaw, 0);
          if (anim) animate(c.kid, dt, t, c.speed);
        });
      }
      for (let k = outgoing.length - 1; k >= 0; k--) {
        const c = outgoing[k];
        if (c.sitT > 0) {
          if (c.path.length) walk(c, dt, c.walkSpeed, dampAngle);
          else {
            // The VIP sits and eats, with hearts now and then
            if (c.kid.pose !== 'sit') {
              c.kid.carry(null);
              if (c.bag) bags.push(c.bag);
              c.bag = null;
              c.kid.pose = 'sit';
              const tb = TABLES[1];
              c.kid.root.position.set(tb.x, DF + SEAT_H - 0.33 * GUEST_SCALE + 0.05, tb.z - 0.5);
              c.yaw = 0;
              c.speed = 0;
              c.snack = servedModel(c.order[0].key);
              c.snack.position.set(tb.x - 0.05, DF + 0.765, tb.z - 0.12);
              scene.add(c.snack);
            }
            c.sitT -= dt;
            c.kid.hands = Math.sin(c.sitT * 3) > 0.2 ? 'hold' : null;
            if (Math.random() < dt * 0.4 && !simming) fx.heartsAt(headPos(c.kid), 1);
            if (c.sitT <= 0) {
              c.kid.pose = 'stand';
              c.kid.hands = null;
              c.snack?.removeFromParent();
              const p = c.kid.root.position;
              p.y = DF;
              c.path = [new THREE.Vector3(p.x, 0, LANE_Z), new THREE.Vector3(DOOR_X + 1.2, 0, LANE_Z)];
            }
          }
        } else if (walk(c, dt, c.walkSpeed, dampAngle)) {
          releaseGuest(c);
          outgoing.splice(k, 1);
          continue;
        }
        c.tilt = damp(c.tilt || 0, 0, 6, dt);
        c.kid.root.rotation.set(c.tilt, c.yaw, 0);
        if (anim) animate(c.kid, dt, t, c.speed);
      }
    }

    // ---------------------------------------------------------------- timers
    function tick(dt) {
      const S = G.S;
      if (G.phase === 'ready') {
        G.phaseT += dt;
        if (G.phaseT > 1.3) {
          G.phase = 'play';
          if (!simming) hud.message('Doors open!', 1000);
          sfx('good');
        }
        return;
      }
      if (G.phase === 'over') {
        G.phaseT += dt;
        if (G.phaseT > 2.2 && !G.finished) {
          G.finished = true;
          endLevel();
        }
        return;
      }
      G.time = Math.max(0, G.time - dt);
      G.idle += dt;
      G.helpT = Math.max(0, G.helpT - dt);
      const sec = Math.ceil(G.time);
      if (sec <= 10 && sec > 0 && sec !== G.lastTick) {
        G.lastTick = sec;
        if (sec === 10 && !simming) hud.message('Last 10 seconds!', 1100);
        tone(sec <= 3 ? 1046 : 880, 0.06, { type: 'triangle', gain: 0.04 });
      }
      G.comboT = Math.max(0, G.comboT - dt);
      if (G.comboT <= 0) G.combo = 0;
      if (G.spit.meat < S.spitMax) {
        G.spit.t += dt;
        if (G.spit.t >= S.spitRefill) {
          G.spit.t = 0;
          G.spit.meat++;
        }
      } else G.spit.t = 0;
      let sizzling = false;
      G.grill.forEach((p) => {
        if (!p) return;
        sizzling = true;
        const a = pattyState(p);
        p.t += dt;
        const b = pattyState(p);
        if (a === b) return;
        if (b === 'done') pop(760);
        else {
          G.burnt++;
          sfx('bad');
          chefOops();
        }
      });
      G.sizzleT -= dt;
      if (sizzling && G.sizzleT <= 0) {
        G.sizzleT = 0.3 + Math.random() * 0.3;
        sizzle(0.012);
      }
      const f = G.fryer;
      if (f.st === 'cook' || f.st === 'done') {
        f.t += dt;
        if (f.st === 'cook' && f.t >= S.fry) {
          f.st = 'done';
          pop(700);
        } else if (f.st === 'done' && f.t >= S.fry + S.fryBurn) {
          f.st = 'burnt';
          G.burnt++;
          sfx('bad');
          chefOops();
        }
      }
      G.coffee.forEach((c) => {
        if (c.st !== 'fill') return;
        c.t += dt;
        if (c.t >= S.coffeeFill) {
          c.st = 'full';
          pop(880);
        }
      });
      if (G.jar.st === 'fill') {
        G.jar.t += dt;
        if (G.jar.t >= S.jarFill) {
          G.jar.st = 'full';
          pop(980);
        }
      }
      for (const type of ['pecan', 'german']) {
        const c = G.cakes[type];
        if (c.n <= 0) {
          c.bake += dt;
          if (c.bake >= S.bake) {
            c.n = S.slices;
            c.bake = 0;
            c.drop = 0;
          }
        }
        if (c.drop < 1) {
          c.drop = Math.min(1, c.drop + dt * 2.2);
          if (c.drop >= 1) thud();
        }
      }
      if (G.pot.st === 'cook') {
        G.pot.t += dt;
        if (G.pot.t >= S.potCook) {
          G.pot.st = 'ready';
          pop(620);
        }
      }
      const pl = G.platter;
      if (pl.building) {
        pl.t += dt;
        while (pl.step < 4 && pl.t >= 0.4 * (pl.step + 1)) platterStep(++pl.step);
        if (pl.step >= 4 && pl.t > 1.9) {
          pl.building = false;
          sfx('pop');
        }
      }
      // New guests, and Homama (or Roji) once a shift as the VIP
      G.spawnT -= dt;
      if (G.spawnT <= 0) {
        const free = G.seats.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
        if (free.length && G.time > 8) {
          const vip = !G.vipDone && G.time <= G.vipAt && !partner.busy;
          spawn(pick(free), vip);
          G.spawnT = rnd(G.cfg.spawn[0], G.cfg.spawn[1]);
        } else G.spawnT = 0.5;
      }
      if (G.sel && !itemAt(G.sel)) G.sel = null;
      if (G.time <= 0) {
        G.phase = 'over';
        G.phaseT = 0;
        G.sel = null;
        if (!simming) hud.message("Time's up!", 1500);
        sfx('tick');
        G.seats.forEach((c, i) => c && c.st !== 'pay' && leave(i, 'closing'));
      }
    }

    // ---------------------------------------------------------------- what to do next (hints, keys, autoplay)
    function plan(onlyDish) {
      if (!G || G.phase !== 'play') return null;
      const N = needs(onlyDish);
      for (const { o } of N) {
        const s = sourceFor(o.key);
        if (s) return { key: s, text: `Tap to serve the ${itemName(o.key).replace(/^./, (c) => c.toLowerCase())}` };
      }
      if (!onlyDish || onlyDish === 'burger') {
        const i = G.grill.findIndex((p) => p && pattyState(p) === 'burnt');
        if (i >= 0) return { key: 'grill' + i, text: 'Burnt! Tap it to throw it away' };
      }
      if ((!onlyDish || onlyDish === 'fries') && G.fryer.st === 'burnt') return { key: 'fryer', text: 'Burnt fries! Tap the fryer to toss them' };
      if (!onlyDish) {
        for (const s of ['board0', 'board1', 'plate0', 'plate1']) {
          const k = itemAt(s);
          if (k && wantedBy(k) < 0 && !missingExtra(k)) return G.sel === s ? { key: 'trash', text: 'Tap the trash to throw it away' } : { key: s, text: 'No one ordered that. Tap it, then the trash' };
        }
      }
      for (const { o } of N) {
        const st = nextStep(o.key);
        if (st) return st;
      }
      return null;
    }
    function nextStep(key) {
      const { dish, extras } = parseKey(key);
      const S = G.S;
      if (dish === 'wrap') {
        const fits = (b) => b && ['toum', 'pickles'].every((e) => !b[e] || extras.includes(e));
        for (const b of G.boards) {
          if (b && b.meat && fits(b)) {
            const m = extras.find((e) => !b[e]);
            if (m) return { key: m, text: `Add ${EXTRA[m].name} to the wrap` };
          }
        }
        if (G.boards.some((b) => b && !b.meat)) return G.spit.meat >= 1 ? { key: 'spit', text: 'Tap the spit to shave the meat' } : null;
        if (G.boards.includes(null)) return { key: 'bread', text: 'Tap the bread to start a shawarma' };
        return null;
      }
      if (dish === 'burger') {
        for (const p of G.plates) {
          if (p.patty && ['cheese', 'salad'].every((e) => !p[e] || extras.includes(e))) {
            const m = extras.find((e) => !p[e]);
            if (m) return { key: m, text: `Add ${EXTRA[m].name} to the burger` };
          }
        }
        const done = G.grill.findIndex((p, i) => p && i < S.grillSpots && pattyState(p) === 'done');
        if (done >= 0 && G.plates.some((p) => !p.patty)) return { key: 'grill' + done, text: 'Tap the brown patty to put it on a bun' };
        const want = needs('burger').length;
        const have = G.grill.filter((p, i) => p && i < S.grillSpots && pattyState(p) !== 'burnt').length + G.plates.filter((p) => p.patty).length;
        const free = G.grill.findIndex((p, i) => !p && i < S.grillSpots);
        if (want > have && free >= 0) return { key: 'grill' + free, text: 'Tap the grill to cook a patty' };
        return null;
      }
      if (dish === 'fries') {
        if (G.fryer.st === 'done' && G.tray < S.trayCap) return { key: 'fryer', text: 'Golden fries! Tap the fryer to fill the tray' };
        if (G.fryer.st === 'empty' && G.tray === 0) return { key: 'fryer', text: 'Tap the fryer to cook fries' };
        return null;
      }
      if (dish === 'latte') {
        const want = needs('latte').length;
        const have = G.coffee.filter((c, i) => i < S.coffeeSpouts && c.st !== 'empty').length;
        if (want > have && G.coffee.some((c, i) => i < S.coffeeSpouts && c.st === 'empty')) return { key: 'coffee', text: 'Tap the coffee machine to pour a Spanish latte' };
        return null;
      }
      if (dish === 'lemonade') return G.jar.st === 'empty' ? { key: 'jar', text: 'Tap the jar to pour a mint lemonade' } : null;
      if (dish === 'mansaf' && G.platter.step === 0 && !G.platter.building) {
        if (G.pot.st === 'ready') return { key: 'pot', text: 'The lamb is ready! Tap the pot to plate the mansaf' };
        if (G.pot.st === 'empty') return { key: 'pot', text: 'Tap the pot to cook the lamb' };
      }
      return null;
    }
    const PREP = { wrap: 'bread', fries: 'fryer', latte: 'coffee', lemonade: 'jar', mansaf: 'pot', pecan: 'pecan', german: 'german' };
    function keyDish(dish) {
      if (dish === 'trash') return act('trash');
      if (!G.menu.has(dish)) return nope(PREP[dish] || 'grill0', `Opens at level ${firstLevelOf(dish) + 1}`);
      const p = plan(dish);
      if (p) return act(p.key);
      if (dish === 'burger') {
        const free = G.grill.findIndex((q, i) => !q && i < G.S.grillSpots);
        return free >= 0 ? act('grill' + free) : nope('grill0', 'The grill is full');
      }
      return act(PREP[dish]);
    }
    function serveAny() {
      for (const { o } of needs()) {
        const s = sourceFor(o.key);
        if (s) return act(s);
      }
      sfx('tick');
      return false;
    }

    // ---------------------------------------------------------------- input
    const ray = new THREE.Raycaster();
    const dragPlane = new THREE.Plane();
    const dragAt = new THREE.Vector3();
    function handleInput() {
      for (const [k, d] of Object.entries(KEYS)) if (input.pressed(k)) keyDish(d);
      if (input.pressed('jump') || input.pressed('action')) serveAny();
      const pt = input.pointer;
      if (pt.justDown) {
        const key = pickKey(pt.ndc);
        press = key && SOURCES.includes(key) && itemAt(key) ? { src: key, x: pt.x, y: pt.y, drag: null } : null;
      }
      if (press && pt.down && !press.drag && Math.hypot(pt.x - press.x, pt.y - press.y) > 14) {
        const k = itemAt(press.src);
        if (!k) press = null;
        else {
          press.drag = servedModel(k);
          scene.add(press.drag);
          dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(dragAt).negate(), new THREE.Vector3(0, WT + 0.5, -0.6));
          const s = slotOf(press.src);
          if (s) s.dim = true;
        }
      }
      if (press?.drag) {
        ray.setFromCamera(pt.ndc, camera);
        if (ray.ray.intersectPlane(dragPlane, dragAt)) press.drag.position.lerp(dragAt.setY(dragAt.y - 0.12), 0.75);
      }
      let dropped = false;
      if (pt.justUp && press) {
        if (press.drag) {
          dropped = true;
          const key = pickKey(pt.ndc);
          const ghost = press.drag;
          ghost.removeFromParent();
          const s = slotOf(press.src);
          if (s) s.dim = false;
          if (key?.startsWith('guest')) serve(press.src, +key.slice(-1), ghost.position);
          else if (key === 'trash') {
            G.sel = press.src;
            tapTrash();
          }
        }
        press = null;
      }
      if (dropped) return;
      for (const tp of input.taps()) {
        const key = pickKey(tp.ndc);
        if (key) act(key);
        else G.sel = null;
      }
    }

    // ---------------------------------------------------------------- camera
    // The closest fixed camera that shows the whole worktop, the chef and every order bubble.
    const DIR = new THREE.Vector3();
    const FIT = [[-4.98, WT - 0.5, 0.97], [4.98, WT - 0.5, 0.97], [-3.3, 3.3, SPOT_Z], [3.78, 3.3, SPOT_Z], [-5.98, CHEF.y + 1.9, CHEF.z], [-5.95, 0.5, CHEF.z + 0.3], [5.98, 1.0, TRASH.z + 0.3]].map((p) => new THREE.Vector3(...p));
    let fitFor = '';
    let camLock = false;
    function place(look, d) {
      camera.position.copy(look).addScaledVector(DIR, d);
      camera.lookAt(look);
      camera.updateMatrixWorld();
    }
    function fitCamera() {
      const key = `${innerWidth}x${innerHeight}${touch()}`;
      if (key === fitFor) return false;
      fitFor = key;
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      // Taller screens look down more steeply, so the worktop fills the extra height
      const pitch = clamp(0.82 - ((camera.aspect - 1.45) / 0.75) * 0.16, 0.66, 0.86);
      DIR.set(0, Math.sin(pitch), Math.cos(pitch));
      const top = 1 - (2 * (touch() ? 50 : 62)) / innerHeight;
      const bot = -1 + (2 * (touch() ? 4 : 36)) / innerHeight;
      const U = new THREE.Vector3(0, DIR.z, -DIR.y);
      const look = new THREE.Vector3();
      const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const p = new THREE.Vector3();
      const extent = () => {
        let y0 = Infinity;
        let y1 = -Infinity;
        for (const q of FIT) {
          p.copy(q).project(camera);
          y0 = Math.min(y0, p.y);
          y1 = Math.max(y1, p.y);
        }
        return [y0, y1];
      };
      // Sit the content on the bottom edge, then lift it by a third of any spare height
      const span = (d) => {
        look.set(0.1, 1.2, -0.9);
        for (let k = 0; k < 6; k++) {
          place(look, d);
          const [y0] = extent();
          look.addScaledVector(U, -((bot - y0) * d * tanV) / 1.25);
        }
        place(look, d);
        const [, y1] = extent();
        if (y1 < top) {
          look.addScaledVector(U, -((top - y1) * 0.3 * d * tanV) / 1.1);
          place(look, d);
        }
        for (const q of FIT) {
          p.copy(q).project(camera);
          if (Math.abs(p.x) > 0.99 || p.y > top + 0.002 || p.y < bot - 0.02) return false;
        }
        return true;
      };
      let lo = 3;
      let hi = 40;
      for (let i = 0; i < 22; i++) {
        const d = (lo + hi) / 2;
        if (span(d)) hi = d;
        else lo = d;
      }
      span(hi);
      return true;
    }
    const BADGES = [['spit', 0, 0.62], ['grill0', 1, 0.3], ['fryer', 2, 0.42], ['coffee', 3, 0.62], ['jar', 4, 0.6], ['pecan', 5, 0.3], ['german', 6, 0.3], ['pot', 7, 0.42], ['trash', 8, 0.36]];
    const LOCKS = [['wrap', 'spit', 0.75], ['toum', 'toum', 0.32], ['pickles', 'pickles', 0.3], ['burger', 'grill1', 0.4], ['cheese', 'cheese', 0.3], ['salad', 'salad', 0.32], ['fries', 'fryer', 0.55], ['latte', 'coffee', 0.75], ['lemonade', 'jar', 0.72], ['pecan', 'pecan', 0.42], ['german', 'german', 0.42], ['mansaf', 'pot', 0.55]];
    function buildTags() {
      keyBadges.build(BADGES.map(([k, cell, dy]) => ({ pos: anchorOf(k).add(new THREE.Vector3(-0.24, dy, 0.2)), w: 0.5, h: 0.2, cell })), camera);
      const locks = !G ? [] : LOCKS.filter(([d]) => !G.menu.has(d) && !G.extras.has(d)).map(([d, k, dy]) => ({ pos: anchorOf(k).add(new THREE.Vector3(0, dy, 0.25)), w: 0.52, h: 0.52 * (64 / 160), cell: tags.lockCell(firstLevelOf(d) + 1) }));
      lockTags.build(locks, camera);
    }

    // ---------------------------------------------------------------- frame visuals
    const cRaw = new THREE.Color(FD.F.raw);
    const cCooked = new THREE.Color(FD.F.patty);
    const cBurnt = new THREE.Color(FD.F.burnt);
    const RED = '#e5484d';
    const GOLD = '#f4b942';
    const GREEN = '#7cc95a';
    const flash = (t) => (Math.sin(t * 16) > 0 ? RED : GOLD);
    let steamT = 0;
    function slotAnim(s, rdt) {
      if (!s.obj) return;
      s.pop = Math.min(1, s.pop + rdt * 4);
      s.hideFor = Math.max(0, (s.hideFor || 0) - rdt);
      s.obj.visible = s.hideFor <= 0;
      s.shake = Math.max(0, s.shake - rdt);
      s.obj.position.x = s.shake > 0 ? Math.sin(s.shake * 55) * 0.035 : 0;
      s.obj.scale.setScalar(s.scale * (0.8 + 0.2 * easeOutBack(s.pop)) * (s.dim ? 0.82 : 1));
    }
    function visuals(rdt, t) {
      const R = view();
      const S = R.S;
      const live = !!G;
      // Shawarma
      spitMeat.rotation.y += rdt * 0.9;
      const mk = R.spit.meat / S.spitMax;
      spitMeat.scale.set(0.7 + 0.3 * mk, 0.92 + 0.08 * mk, 0.7 + 0.3 * mk);
      if (live && R.spit.meat < 1) rings.spit.set(R.spit.t / S.spitRefill, GOLD);
      else rings.spit.hide();
      R.boards.forEach((b, j) => setSlot(slots.boards[j], b ? `w${+b.meat}${+b.toum}${+b.pickles}` : null, () => FD.openWrap({ bread: true, ...b })));
      // Burgers
      R.plates.forEach((p, j) => setSlot(slots.plates[j], `b${+p.patty}${+p.cheese}${+p.salad}`, () => FD.openBurger(p)));
      X.gx.forEach((x, i) => {
        const p = R.grill[i];
        const pt = patties[i];
        pt.m.visible = !!p;
        const ring = rings.grill[i];
        if (!p) return ring.hide();
        pt.pop = Math.min(1, pt.pop + rdt * 4);
        pt.shake = Math.max(0, (pt.shake || 0) - rdt);
        const st = pattyState(p);
        if (st === 'raw') {
          pattyMats[i].color.copy(cRaw).lerp(cCooked, Math.min(1, p.t / S.cook));
          ring.set(p.t / S.cook, GREEN);
        } else if (st === 'done') {
          const k = (p.t - S.cook) / S.burn;
          pattyMats[i].color.copy(cCooked).lerp(cBurnt, Math.max(0, k - 0.55) * 1.4);
          ring.set(1 - k, k > 0.6 ? flash(t) : GOLD, k > 0.6 ? 0.5 : 0);
        } else {
          pattyMats[i].color.copy(cBurnt);
          ring.set(1, RED);
        }
        pt.m.position.set(x + (pt.shake > 0 ? Math.sin(pt.shake * 55) * 0.03 : 0), WT + 0.165 + (st === 'done' ? Math.abs(Math.sin(t * 9 + i)) * 0.008 : 0), BZ + 0.02);
        pt.m.scale.setScalar(1.3 * Math.max(0.01, easeOutBack(pt.pop)));
        ring.m.position.set(x + 0.22, WT + 0.42, BZ + 0.2);
      });
      // Fries
      const fst = R.fryer.st;
      const down = fst === 'cook';
      KT.fryBasket.position.y = damp(KT.fryBasket.position.y, WT + (down ? 0.37 : fst === 'empty' ? 0.55 : 0.5), 9, rdt);
      KT.fryBasket.position.x = X.fryer + (down ? Math.sin(t * 30) * 0.004 : 0);
      setSlot(slots.basket, fst === 'empty' ? null : fst, () => FD.friesBasketLoad(fst === 'burnt' ? FD.F.burnt : fst === 'done' ? FD.F.fries : '#f7e6b0'));
      if (fst === 'cook') rings.fryer.set(R.fryer.t / S.fry, GREEN);
      else if (fst === 'done') {
        const k = (R.fryer.t - S.fry) / S.fryBurn;
        rings.fryer.set(1 - k, k > 0.6 ? flash(t) : GOLD, k > 0.6 ? 0.5 : 0);
      } else if (fst === 'burnt') rings.fryer.set(1, RED);
      else rings.fryer.hide();
      rings.fryer.m.position.set(X.fryer + 0.38, WT + 0.78, BZ + 0.15);
      setSlot(slots.tray, R.tray ? `f${R.tray}/${S.trayCap}` : null, () => FD.friesPile(R.tray, S.trayCap));
      // Spanish latte
      for (let i = 0; i < 2; i++) {
        const c = R.coffee[i];
        const on = i < S.coffeeSpouts && c.st !== 'empty';
        const sl = slots.cups[i];
        setSlot(sl, on ? 'latte' : null, FD.latteGlass);
        KT.coffeeCups[i].position.set(cupX(i, S), WT + 0.05, BZ + 0.13);
        const k = c.st === 'full' ? 1 : c.st === 'fill' ? c.t / S.coffeeFill : 0;
        if (sl.obj) {
          const parts = sl.obj.userData.parts;
          parts.fill.scale.y = Math.max(0.02, k);
          parts.top.visible = c.st === 'full';
        }
        const st = KT.coffeeStreams[i];
        st.visible = c.st === 'fill' && i < S.coffeeSpouts;
        st.position.set(cupX(i, S), WT + 0.42, BZ + 0.13);
        st.scale.set(1 + Math.sin(t * 40) * 0.2, 0.36 - k * 0.2, 1);
        const ring = rings.coffee[i];
        if (c.st === 'fill' && i < S.coffeeSpouts) {
          ring.set(k, GREEN);
          ring.m.position.set(cupX(i, S) + (S.coffeeSpouts > 1 ? (i ? 0.2 : -0.2) : 0.22), WT + 0.36, BZ + 0.32);
        } else ring.hide();
      }
      // Mint lemonade
      {
        const c = R.jar;
        setSlot(slots.jar, c.st === 'empty' ? null : 'lemonade', FD.lemonadeGlass);
        const k = c.st === 'full' ? 1 : c.st === 'fill' ? c.t / S.jarFill : 0;
        if (slots.jar.obj) {
          slots.jar.obj.userData.parts.fill.scale.y = Math.max(0.02, k);
          slots.jar.obj.userData.parts.top.visible = c.st === 'full';
        }
        KT.jarStream.visible = c.st === 'fill';
        KT.jarStream.scale.set(1 + Math.sin(t * 40) * 0.2, 0.24 - k * 0.12, 1);
        if (c.st === 'fill') {
          rings.jar.set(k, GREEN);
          rings.jar.m.position.set(X.jar + 0.24, WT + 0.36, BZ + 0.32);
        } else rings.jar.hide();
      }
      // Cakes
      for (const type of ['pecan', 'german']) {
        const c = R.cakes[type];
        const sl = slots.cakes[type];
        setSlot(sl, c.n > 0 ? `c${c.n}/${S.slices}` : null, () => FD.cake(type, c.n, S.slices));
        const k = c.drop;
        sl.holder.position.y = WT + 0.172 + (k < 1 ? (1 - easeOutBack(k)) * 0.6 : 0);
        const ring = rings[type];
        if (c.n <= 0) {
          ring.set(c.bake / S.bake, GOLD);
          ring.m.position.set(X[type], WT + 0.42, FZ + 0.1);
        } else ring.hide();
      }
      // Mansaf
      const pst = R.pot.st;
      KT.lidHold.position.y = damp(KT.lidHold.position.y, WT + 0.63 + (pst === 'ready' ? 0.14 : 0), 8, rdt);
      KT.lidHold.rotation.z = pst === 'cook' ? Math.sin(t * 22) * 0.04 : pst === 'ready' ? 0.25 : 0;
      KT.jameedFill.visible = pst === 'ready';
      if (pst === 'cook') rings.pot.set(R.pot.t / S.potCook, GREEN);
      else if (pst === 'ready') rings.pot.set(1, GOLD, Math.sin(t * 6) * 0.5 + 0.5);
      else rings.pot.hide();
      rings.pot.m.position.set(X.pot + 0.36, WT + 0.72, BZ + 0.2);
      setSlot(slots.platter, R.platter.step ? `m${R.platter.step}` : null, () => FD.mansaf(R.platter.step));
      // Pops, shakes and the selection ring
      for (const s of [...slots.boards, ...slots.plates, slots.tray, slots.basket, slots.cakes.pecan, slots.cakes.german, slots.platter, ...slots.cups, slots.jar]) slotAnim(s, rdt);
      const sel = live && G.sel && itemAt(G.sel) ? G.sel : null;
      selRing.visible = !!sel;
      if (sel) {
        const a = anchorOf(sel);
        selRing.position.set(a.x, WT + 0.05, a.z);
        selRing.scale.setScalar(1 + Math.sin(t * 6) * 0.06);
      }
      lidT = Math.max(0, lidT - rdt);
      KT.lidPivot.rotation.x = -Math.sin(Math.min(1, lidT / 0.9) * Math.PI) * 1.2;
      KT.musicSpin.rotation.y += rdt * 2.2;
      for (const r of Object.values(rings).flat()) if (r.m.visible) r.m.quaternion.copy(camera.quaternion);
      // Steam and smoke
      steamT -= rdt;
      if (steamT <= 0) {
        steamT = 0.12;
        R.grill.forEach((p, i) => p && puffs.emit(X.gx[i], WT + 0.22, BZ + 0.05, pattyState(p) === 'burnt' ? '#6b5b60' : '#ffffff', { alpha: pattyState(p) === 'burnt' ? 0.7 : 0.45 }));
        if (fst !== 'empty' && Math.random() < 0.7) puffs.emit(X.fryer + (Math.random() - 0.5) * 0.4, WT + 0.45, BZ, fst === 'burnt' ? '#6b5b60' : '#ffffff', { alpha: 0.45 });
        if (pst !== 'empty' && Math.random() < 0.6) puffs.emit(X.pot, WT + 0.62, BZ, '#ffffff', { alpha: 0.5 });
        if (R.coffee.some((c) => c.st === 'full') && Math.random() < 0.3) puffs.emit(cupX(0, S), WT + 0.34, BZ + 0.13, '#ffffff', { alpha: 0.3, up: 0.3 });
      }
      puffs.update(rdt);
      words.update(rdt);
    }

    function chefFrame(rdt, t) {
      const k = chef.kid;
      chef.work = Math.max(0, chef.work - rdt);
      chef.cheer = Math.max(0, chef.cheer - rdt);
      chef.oops = Math.max(0, chef.oops - rdt);
      const want = chef.work > 0 ? chef.look : 0.75 + Math.sin(t * 0.5) * 0.15;
      chef.yaw = dampAngle(chef.yaw, want, 10, rdt);
      k.hands = chef.cheer > 0 ? 'wave2' : chef.work > 0 ? chef.hands : null;
      k.mouth.rotation.z = chef.oops > 0 ? 0 : Math.PI;
      k.root.rotation.y = chef.yaw;
      animate(k, rdt, t, 0);
    }

    function flightsFrame(dt) {
      for (let i = flights.length - 1; i >= 0; i--) {
        const f = flights[i];
        f.t += dt / f.dur;
        const k = Math.min(1, f.t);
        f.obj.position.lerpVectors(f.from, f.to, k);
        f.obj.position.y += Math.sin(k * Math.PI) * f.arc;
        if (f.spin) f.obj.rotation.z = k * f.spin;
        if (k >= 1) {
          flights.splice(i, 1);
          f.done?.();
        }
      }
    }

    // ---------------------------------------------------------------- screens
    const ui = createUI({ hud, sound });
    hud.buttons({ action: null, jump: null, stick: false });
    function clearRun() {
      if (!G) return;
      for (const c of G.seats) {
        if (!c) continue;
        for (const o of c.order) o.model?.removeFromParent();
        releaseGuest(c);
      }
      for (const c of outgoing) {
        for (const o of c.order) o.model?.removeFromParent();
        releaseGuest(c);
      }
      outgoing.length = 0;
      for (const f of flights) f.obj.removeFromParent();
      flights.length = 0;
      for (const b of bubbles) b.s.visible = false;
      press?.drag?.removeFromParent();
      press = null;
      G = null;
      idleRun = null;
      arrow.visible = false;
      hud.hint('');
      ui.setCombo(0);
      document.body.classList.remove('ck-play');
      buildTags();
    }
    const highestOpen = () => LEVELS.reduce((a, _, i) => (isOpen(P, i) ? i : a), 0);
    function showMapScreen() {
      clearRun();
      mode = 'map';
      ui.clearScore();
      ui.showMap({ levels: LEVELS, progress: P, chefName: NAME[me], onPlay: showIntro, onShop: () => openShop(showMapScreen), onExit: () => ctx.end({ win: true, coins: P.wallet, stars: P.stars.reduce((a, b) => a + b, 0) }) });
    }
    function freshFor(lv) {
      const out = [];
      const cfg = LEVELS[lv];
      for (const d of [...Object.keys(cfg.menu), ...cfg.extras]) if (firstLevelOf(d) === lv) out.push(d);
      return out;
    }
    const ICON_OF = { toum: 'wrap:toum', pickles: 'wrap:pickles', cheese: 'burger:cheese', salad: 'burger:salad' };
    function showIntro(lv) {
      if (!isOpen(P, lv)) return;
      clearRun();
      mode = 'intro';
      const cfg = LEVELS[lv];
      const ds = freshFor(lv);
      const fresh = ds.filter((d) => !(d === 'cheese' && ds.includes('burger'))).map((d) => ({ icon: ICON_OF[d] || d, text: INTRO[d] }));
      ui.showIntro({ lv, cfg, menu: Object.keys(cfg.menu), fresh: fresh.slice(0, 2), challenge: challengeText(cfg.challenge), onStart: () => startLevel(lv), onBack: showMapScreen });
    }
    function openShop(back) {
      clearRun();
      mode = 'shop';
      ui.clearScore();
      ui.showShop({
        upgrades: UPGRADES,
        progress: P,
        reached: highestOpen(),
        onBuy(id) {
          const u = UPGRADES.find((q) => q.id === id);
          const lvl = P.up[id] || 0;
          const st = u?.steps[lvl];
          if (!st || P.wallet < st.price) return false;
          P.wallet -= st.price;
          P.up[id] = lvl + 1;
          persist();
          KT.applyUpgrades(P.up);
          idleRun = null;
          kaching();
          sfx('good');
          const at = { spit: 'spit', coffee: 'coffee', vases: 'trash', grill: 'grill2', jar: 'jar', fries: 'tray', lanterns: 'spit', cakes: 'pecan', music: 'trash' }[id];
          fx.burst(anchorOf(at).add(new THREE.Vector3(0, 0.6, 0)), [PAL.gold, PAL.ink, '#ffffff', PAL.rose], 40);
          chefCheer();
          return true;
        },
        onClose: back,
      });
    }
    function startLevel(lv) {
      if (!isOpen(P, lv) && !simming) return;
      clearRun();
      ui.closeCard();
      G = newRun(lv);
      G.fresh = freshFor(lv);
      mode = 'play';
      if (!simming) {
        document.body.classList.add('ck-play');
        ui.scoreBar(G.cfg.goal);
        ui.setScore(0, G.time, false);
        hud.message(`Level ${lv + 1}: ${G.cfg.name}`, 1300);
        sfx('pop');
      }
      buildTags();
    }
    function endLevel() {
      const lv = G.lv;
      const cfg = G.cfg;
      const stars = starsFor(G.coins, cfg.goal);
      const ch = cfg.challenge;
      const chDone = !!ch && stars > 0 && (ch.type === 'noburn' ? G.burnt === 0 : ch.type === 'nolost' ? G.lost === 0 : G.bestCombo >= ch.n);
      const bonus = chDone ? CHALLENGE_BONUS : 0;
      lastResult = { lv, coins: G.coins, stars, served: G.served, lost: G.lost, burnt: G.burnt, tips: G.tips, bestCombo: G.bestCombo, chDone };
      if (simming) return;
      const prevBest = P.best[lv];
      const opened = stars > 0 && lv + 1 < LEVELS.length && !isOpen(P, lv + 1);
      P.wallet += G.coins + bonus;
      P.best[lv] = Math.max(prevBest, G.coins);
      P.stars[lv] = Math.max(P.stars[lv], stars);
      if (chDone) P.chall[lv] = true;
      persist();
      const parts = [`${NAME[me]} earned <b>${G.coins}</b> coins and served ${G.served} guest${G.served === 1 ? '' : 's'}.`];
      if (G.coins > prevBest && G.coins > 0) parts.push('New best!');
      if (opened) parts.push(`Level ${lv + 2} is open!`);
      if (!stars) parts.push(`Just ${cfg.goal[0] - G.coins} more coins for a star.`);
      if (G.vipServed) parts.push(`<br><b>${NAME[pid]}:</b> "${pick(LOVE[me])}"`);
      mode = 'result';
      document.body.classList.remove('ck-play');
      ui.setCombo(0);
      hud.hint('');
      arrow.visible = false;
      sfx(stars ? 'win' : 'lose');
      if (stars) fx.burst(new THREE.Vector3(0.3, 2.2, -1.2), [PAL.ink, PAL.gold, PAL.rose, '#ffffff'], 60 + stars * 30);
      ui.showResult({
        lv, name: cfg.name, stars, title: ['So close!', 'Shift complete!', 'Lovely shift!', 'Star chef!'][stars], text: parts.join(' '),
        served: G.served, lost: G.lost, tips: G.tips, bestCombo: G.bestCombo, wallet: P.wallet,
        challenge: ch ? { text: challengeText(ch), done: chDone } : null,
        canNext: lv + 1 < LEVELS.length && isOpen(P, lv + 1),
        onNext: () => showIntro(lv + 1),
        onRetry: () => startLevel(lv),
        onShop: () => openShop(showMapScreen),
        onMap: showMapScreen,
      });
    }

    // ---------------------------------------------------------------- test hooks
    function simulate(lv, every = 0.6) {
      const keep = JSON.stringify(P);
      simming = true;
      lastResult = null;
      try {
        startLevel(lv);
        G.phase = 'play';
        const dt = 1 / 30;
        let acc = 0;
        let guard = 0;
        while (G && !G.finished && guard++ < 30000) {
          acc += dt;
          if (acc >= every) {
            acc = 0;
            const p = plan();
            if (p) act(p.key);
          }
          tick(dt);
          people(dt, 0, false);
          flightsFrame(dt);
        }
      } finally {
        simming = false;
        Object.assign(P, JSON.parse(keep));
      }
      showMapScreen();
      return lastResult;
    }
    const debug = {
      speed: 1,
      auto: false,
      every: 0.55,
      autoT: 0,
      P,
      get G() {
        return G;
      },
      get mode() {
        return mode;
      },
      map: () => showMapScreen(),
      intro: (lv) => showIntro(lv),
      start: (lv) => startLevel(lv),
      shop: () => openShop(showMapScreen),
      act: (k) => act(k),
      plan: () => plan(),
      px: (k) => T[k] && toPx(T[k].anchor),
      next() {
        const p = plan();
        return p ? { ...p, ...toPx(T[p.key].anchor) } : null;
      },
      wallet(n) {
        P.wallet = n;
        persist();
      },
      unlockAll() {
        P.stars = P.stars.map((s) => s || 1);
        persist();
      },
      set time(v) {
        if (G) G.time = v;
      },
      sim: (lv, every) => simulate(lv, every),
      guest(i, keys) {
        if (!G) return null;
        if (G.seats[i]) leave(i, 'closing');
        spawn(i, false);
        const c = G.seats[i];
        c.order = keys.map(mkItem);
        c.st = 'wait';
        c.path = [];
        c.kid.root.position.set(G.spots[i], DF, SPOT_Z);
        c.bubbleKey = '';
        return c.order.map((o) => o.key);
      },
      cam(x, y, z, d = 2.5) {
        place(new THREE.Vector3(x, y, z), d);
        fitFor = 'debug';
        camLock = true;
      },
      uncam() {
        camLock = false;
        fitFor = '';
      },
      peek: () =>
        G && {
          phase: G.phase, lv: G.lv, time: +G.time.toFixed(1), coins: G.coins, served: G.served, lost: G.lost, burnt: G.burnt, combo: G.combo, sel: G.sel,
          boards: G.boards.map((b) => b && JSON.stringify(b)), grill: G.grill.map((p) => p && pattyState(p)), plates: G.plates.map((p) => JSON.stringify(p)),
          seats: G.seats.map((c) => c && { st: c.st, who: c.who, pat: +(c.pat / c.max).toFixed(2), order: c.order.map((o) => o.key + (o.done ? '*' : '')) }),
        },
    };
    window.__cook = debug;

    // ---------------------------------------------------------------- start
    fitCamera();
    buildTags();
    showMapScreen();
    let hintText = '';

    return {
      debug,
      update(rdt, t) {
        if (!alive) return;
        const dt = rdt * debug.speed;
        if (!camLock && fitCamera()) buildTags();
        if (G && mode === 'play' && !ui.open) {
          handleInput();
          tick(dt);
          if (debug.auto && G && G.phase === 'play') {
            debug.autoT += dt;
            if (debug.autoT >= debug.every) {
              debug.autoT = 0;
              const p = plan();
              if (p) act(p.key);
            }
          }
        }
        people(dt, t, true);
        chefFrame(rdt, t);
        flightsFrame(dt);
        visuals(rdt, t);
        // Order bubbles
        if (G) {
          G.seats.forEach((c, i) => {
            const b = bubbles[i];
            if (!c || c.st !== 'wait') return;
            const frac = clamp(c.pat / c.max, 0, 1);
            const key = `${c.order.map((o) => +o.done).join('')}|${Math.round(frac * 30)}`;
            if (key !== c.bubbleKey) {
              c.bubbleKey = key;
              drawBubble(b, { order: c.order, frac, vip: c.who === 'vip', name: NAME[pid] });
            }
            b.s.visible = true;
            b.k = Math.min(1, b.k + rdt * 4);
            const w = (G.cfg.spots === 4 ? 1.62 : 1.78) * (0.6 + 0.4 * easeOutBack(b.k));
            const wob = frac < 0.25 ? Math.sin(t * 22) * 0.025 : 0;
            b.s.scale.set(w, w * (BUB.h / BUB.w), 1);
            b.s.position.set(G.spots[i] + wob, DF + 1.8 + (w * (BUB.h / BUB.w)) / 2, SPOT_Z);
            const tg = T['guest' + i];
            tg.m.position.set(G.spots[i], DF + 1.6, SPOT_Z);
            tg.anchor.set(G.spots[i], DF + 1.4, SPOT_Z);
          });
          // Score bar, combo and the clock
          G.shown = damp(G.shown, G.coins, 5, rdt);
          if (Math.abs(G.coins - G.shown) < 0.5) G.shown = G.coins;
          ui.setScore(G.shown, G.time, G.phase === 'play' && G.time <= 10);
          ui.setCombo(G.combo, G.comboT / COMBO_WINDOW);
          const ch = G.cfg.challenge;
          const st = !ch ? '' : ch.type === 'noburn' ? (G.burnt ? 'fail' : 'ok') : ch.type === 'nolost' ? (G.lost ? 'fail' : 'ok') : G.bestCombo >= ch.n ? 'done' : `best x${G.bestCombo}`;
          ui.setLevel(mode === 'play' ? `<b>Level ${G.lv + 1}</b> ${G.cfg.name}` : '', challengeText(ch), st);
        } else ui.setLevel('');
        // Helper arrow and the keyboard hint
        let help = null;
        if (G && G.phase === 'play') {
          if (G.helpT > 0 && G.helpKey) help = { key: G.helpKey, text: '' };
          else {
            const p = plan();
            const early = G.cfg.time - G.time;
            const tutorial = G.lv === 0 ? early < 50 : G.fresh.length > 0 && early < 30;
            if (p && (tutorial || G.idle > 7)) help = p;
            if (!touch()) {
              const ht = `${p ? p.text : 'Keep the guests happy!'}  ·  keys 1-8 work the stations, Space serves`;
              if (ht !== hintText) hud.hint((hintText = ht));
            }
          }
        } else if (hintText) hud.hint((hintText = ''));
        arrow.visible = !!help && !!T[help.key];
        if (arrow.visible) {
          const a = T[help.key].anchor;
          arrow.position.set(a.x, a.y + 0.42 + Math.abs(Math.sin(t * 5)) * 0.09, a.z + 0.15);
        }
        keyBadges.m.visible = !touch() && mode === 'play';
        lockTags.m.visible = !!G;
        if (!touch()) {
          const over = G && mode === 'play' && !ui.open && pickKey(input.pointer.ndc);
          ctx.renderer.domElement.style.cursor = over ? 'pointer' : '';
        }
      },
      dispose() {
        alive = false;
        ui.dispose();
        ctx.renderer.domElement.style.cursor = '';
        if (window.__cook === debug) delete window.__cook;
      },
    };
  },
};
