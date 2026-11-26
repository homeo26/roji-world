import * as THREE from 'three';
import { TOP, LEVELS, DISH, PAN_BURN, POT_BURN, BREW, PAN_TIME, loadProgress, saveProgress, isOpen, starsFor, totalStars, NEED } from './cooking/data.js';
import { World } from './cooking/world.js';
import { Sim, R } from './cooking/sim.js';
import { Brain } from './cooking/ai.js';
import { buildKitchen, THEMES } from './cooking/kitchen.js';
import { Icons, Rings, Puffs, Flames, Words, makeMarkers, Sfx } from './cooking/fx.js';
import { createUI } from './cooking/ui.js';
import { makeChef } from './cooking/chefs.js';
import { encodeItems, decodeItems, applyItems, encodeCells, applyCells, encodeOrders, decodeOrders, dishIndex, dishAt } from './cooking/online.js';
import { Follow, countTo, nameOf } from './coop/kit.js';

// Roji's YumYum Kitchen, an Overcooked style co-op kitchen. Roji and Homama are both chefs: you play
// one, and the other is a helpful computer chef (or a second player on the same keyboard). Fetch from
// crates, chop on boards, cook in pans and pots, slice the shawarma spit, wash plates, plate up the
// orders and serve them at the pass before their timers run out. Eight kitchens, each with a twist.
// Played together online, the other chef is the other player, moved by their own device: the starter's
// copy runs the shift (the orders, the coins, the food and the clock) and the other copy sends its
// chef's moves and what it picks up, puts down, chops and washes. A helper chef steps in if they go.

const NAME = { roji: 'Roji', homama: 'Homama' };
const PART_COL = { tomato: '#ec4b4b', cucumber: '#4f9e45', lettuce: '#7ccc5a', onion: '#c873b2', lemon: '#ffd23f', lamb: '#d9616b' };
const LOVE = [
  ['roji', 'You are the best sous-chef, Homama!'],
  ['homama', 'Chef Roji, you are amazing!'],
  ['homama', 'Best kitchen team on the island.'],
  ['roji', 'Look at us go!'],
];

export default {
  id: 'cooking',
  title: "Roji's YumYum Kitchen",
  tagline: 'Cook together, serve fast',

  async start(ctx) {
    const { scene, camera, hud, input, sound } = ctx;
    const me = ctx.me;
    const pal = ctx.partner;
    const touch = () => document.body.classList.contains('touch');
    const sfx = new Sfx(sound);
    const ui = createUI({ sound });
    let progress = loadProgress(ctx.load);
    if (touch()) progress.mode = 'solo';
    let alive = true;
    const timers = [];
    const later = (ms, fn) => timers.push(setTimeout(() => alive && fn(), ms));
    // ---------------------------------------------------------------- played together
    const ol = ctx.online;
    const NET = {
      on: ol.inRoom && !ol.isHost, // the other player cooks in this kitchen with us
      owner: !ol.inRoom || ol.isHost, // this copy runs the shift
      follow: new Follow({ delay: 120, angles: ['y'] }),
      uses: [], // the other chef's pick-ups and put-downs for the next step (owner)
      events: [], // what happened, for the other copy's sounds and words (owner)
      seq: 0,
      lastSeq: 0,
      coins: { roji: 0, homama: 0 }, // each chef's share of the coins
      snap: null, // the latest kitchen from the owner (the other copy)
      fresh: false,
      snapAt: 0,
      goAt: 0,
    };
    const modeNow = () => (NET.on ? 'solo' : progress.mode);

    // ---------------------------------------------------------------- the two chefs (built once)
    const kids = { roji: makeChef(ctx, 'roji'), homama: makeChef(ctx, 'homama') };
    for (const k of Object.values(kids)) scene.add(k.root);
    const markers = makeMarkers(scene);
    const icons = new Icons(scene);
    const rings = new Rings(scene);
    const puffs = new Puffs(scene);
    const flames = new Flames(scene);
    const words = new Words(camera);
    const sizzle = sfx.loop({ freq: 5200, q: 0.7, type: 'highpass' });
    const bubble = sfx.loop({ freq: 380, q: 6, type: 'bandpass' });

    // ---------------------------------------------------------------- light per theme
    let env = null;
    let lights = [];
    let skyTex = null;
    function setEnv(theme) {
      for (const l of lights) l.removeFromParent();
      lights = [];
      const T = THEMES[theme];
      const night = !!T.night;
      const sunset = !!T.sunset;
      const before = new Set(scene.children);
      env = ctx.env.outdoor({ sky: T.bg, fog: null, sun: sunset ? [-14, 9, 8] : night ? [-5, 14, 8] : [-7, 16, 10], shadow: 13, intensity: night ? 0.62 : sunset ? 0.92 : 1 });
      for (const o of scene.children) if (!before.has(o)) lights.push(o);
      if (sunset) {
        env.sun.color.set('#ffc49a');
        env.hemi.color.set('#ffe0cc');
      }
      if (night) {
        env.hemi.color.set('#d8c8ff');
        env.hemi.groundColor.set('#5a4a6e');
        env.sun.color.set('#ffd9a8');
      }
      env.sun.shadow.mapSize.set(1536, 1536);
      skyTex?.dispose();
      skyTex = null;
      if (T.outdoor) {
        const c = document.createElement('canvas');
        c.width = 4;
        c.height = 256;
        const g = c.getContext('2d');
        const gr = g.createLinearGradient(0, 0, 0, 256);
        if (sunset) {
          gr.addColorStop(0, '#6a5a9a');
          gr.addColorStop(0.45, '#f08a8a');
          gr.addColorStop(0.75, '#ffc27a');
          gr.addColorStop(1, '#ffe3b0');
        } else {
          gr.addColorStop(0, '#7cc8e8');
          gr.addColorStop(1, '#d8f2f6');
        }
        g.fillStyle = gr;
        g.fillRect(0, 0, 4, 256);
        skyTex = new THREE.CanvasTexture(c);
        skyTex.colorSpace = THREE.SRGBColorSpace;
        scene.background = skyTex;
      }
    }

    // ---------------------------------------------------------------- one kitchen
    let L = null; // { i, lv, world, sim, view, chefs, brains, mode }
    let phase = 'menu';
    let speed = 1;
    let auto = false;
    const v3 = new THREE.Vector3();
    const v3b = new THREE.Vector3();

    function teardown() {
      if (!L) return;
      for (const c of L.sim.chefs) {
        c.kid.carry(null);
        c.kid.hands = null;
      }
      words.clear();
      ui.clearOrders();
      // free the old kitchen's GPU buffers; shared geometry and materials simply upload again when reused
      L.view.root.removeFromParent();
      L.view.root.traverse((o) => {
        if (!o.isMesh && !o.isInstancedMesh) return;
        o.geometry?.dispose();
        const m = o.material;
        if (!m) return;
        m.map?.dispose();
        m.emissiveMap?.dispose();
        m.dispose();
      });
      L = null;
    }
    function build(i, mode) {
      teardown();
      const lv = LEVELS[i];
      setEnv(lv.theme);
      const world = new World(lv);
      const view = buildKitchen(world, lv.theme, { scene });
      const sim = new Sim({ world, level: lv, view, emit: onEvent, fast: lv.fast || 1 });
      // together, the starter's chef starts on the first spot on both copies; the other copy moves only its own
      const mirror = NET.on && !NET.owner;
      const first = mirror ? sim.addChef(pal, kids[pal], lv.a, 'net') : sim.addChef(me, kids[me], lv.a, 'p1');
      const second = mirror ? sim.addChef(me, kids[me], lv.b, 'p1') : sim.addChef(pal, kids[pal], lv.b, mode === 'duo' ? 'p2' : 'ai');
      if (mirror) {
        first.net = true;
        sim.mirror = true;
        sim.onUse = (c) => sendUse(c);
      }
      for (const c of sim.chefs) {
        c.kid.root.position.set(c.x, 0, c.z);
        c.kid.root.rotation.y = c.yaw;
        c.kid.pose = 'stand';
        c.kid.hands = null;
      }
      const brains = new Map();
      if (mode !== 'duo' && !mirror) brains.set(second, new Brain(sim, second, 'helper'));
      second.brain = brains.get(second) || null;
      first.brain = null;
      L = { i, lv, world, sim, view, chefs: sim.chefs, brains, mode, lastWarn: null, fireBanner: 0, chopT: new Map(), steamT: 0, loveI: 0 };
      if (NET.on && NET.owner) netOn();
      fitCamera();
      sim.update(0.001);
      return L;
    }
    // auto: true makes both chefs computer chefs that plate and serve; 'p1' does it for your chef only
    function setAuto(on) {
      auto = on;
      if (!L) return;
      for (const c of L.sim.chefs) {
        if (on === true || (on === 'p1' && c.ctrlKind === 'p1')) {
          c.ctrlKind = 'ai';
          const b = new Brain(L.sim, c, 'full');
          L.brains.set(c, b);
          c.brain = b;
        }
      }
    }

    // The other player's chef: moved by their device (net), or by a helper (the computer) when they go
    const chefOf = (id) => L?.sim.chefs.find((c) => c.id === id) || null;
    const calm = (c) => Object.assign(c.ctrl, { ax: 0, az: 0, use: false, work: false, dash: false, target: null, face: null });
    function netOn() {
      const c = chefOf(pal);
      if (!c || c.net) return;
      c.net = true;
      c.ctrlKind = 'net';
      L.brains.delete(c);
      c.brain = null;
      calm(c);
    }
    function netOff() {
      const c = chefOf(pal);
      if (!c || !c.net) return;
      c.net = false;
      c.ctrlKind = 'ai';
      c.vx = c.vz = 0;
      calm(c);
      const b = new Brain(L.sim, c, 'helper');
      L.brains.set(c, b);
      c.brain = b;
      if (auto === true) setAuto(true);
    }
    // owner: their chef where their device has it, and their next pick-up or put-down
    function applyRemoteChef() {
      const c = chefOf(pal);
      if (!c?.net) return;
      const s = NET.follow.sample(ol.now());
      if (s && s.lv === L.i) {
        c.x = s.x;
        c.z = s.z;
        c.yaw = s.y;
        c.speed = s.sp || 0;
        c.turn = s.tu || 0;
        c.hop = s.hp || 0;
        c.ctrl.work = !!s.w && phase === 'play';
        c.ctrl.target = s.wt >= 0 ? L.world.cells[s.wt] || null : null;
      }
      const u = NET.uses.shift();
      if (u && phase === 'play') {
        if (Number.isFinite(u.x) && Number.isFinite(u.z)) {
          c.x = u.x;
          c.z = u.z;
          c.yaw = Number.isFinite(u.y) ? u.y : c.yaw;
        }
        c.ctrl.target = u.i >= 0 ? L.world.cells[u.i] || null : null;
        c.ctrl.use = true;
      }
    }
    // owner: what the kitchen looks like, for the other copy (a few times a second)
    const RELAY = new Set(['say', 'reject', 'hint', 'crate', 'pick', 'drop', 'combine', 'add', 'spit', 'trash', 'chopped', 'sliced', 'washed', 'cooked', 'burnt', 'fire', 'fireout', 'served', 'missed', 'bump', 'rush', 'nudged']);
    function relay(type, d) {
      if (!RELAY.has(type)) return;
      const who = d.chef?.id || d.a?.id || '';
      const e = [++NET.seq, type, who ? who[0] : '', d.cell ? d.cell.i : -1];
      if (type === 'say' || type === 'reject') e.push(String(d.text || '').slice(0, 40));
      else if (type === 'hint') e.push(d.kind || '');
      else if (type === 'chopped') e.push(d.item?.id || '');
      else if (type === 'served') e.push(dishIndex(d.dish), d.pts, d.tip, d.streak, d.order.id);
      else if (type === 'missed') e.push(d.order.id, d.lost || 0);
      NET.events.push({ at: ol.now(), e });
    }
    function sendKitchen() {
      const t0 = ol.now();
      if (t0 - NET.snapAt < 85) return;
      NET.snapAt = t0;
      const S = L.sim;
      const hc = chefOf(me);
      const nc = chefOf(pal);
      NET.events = NET.events.filter((x) => t0 - x.at < 1600);
      const s = {
        at: t0,
        lv: L.i,
        ph: phase,
        t: +S.time.toFixed(2),
        wt: +L.world.t.toFixed(3),
        sc: S.score,
        sv: S.served,
        ms: S.missed,
        tp: S.tips,
        sk: S.streak,
        bs: S.bestStreak,
        no: +S.nextOrder.toFixed(2),
        ru: S.rushed ? 1 : 0,
        oi: S.orderId,
        u: S.uid,
        rt: S.returns.map((x) => +x.toFixed(1)),
        o: encodeOrders(S),
        q: encodeCells(S),
        it: encodeItems(S),
        c: { x: +hc.x.toFixed(3), z: +hc.z.toFixed(3), y: +hc.yaw.toFixed(3), sp: +hc.speed.toFixed(2), tu: +Math.max(-30, Math.min(30, hc.turn)).toFixed(1), hp: +hc.hop.toFixed(3), wk: hc.working || 0, wc: hc.workCell?.i ?? -1 },
        n: { wk: nc?.working || 0, wc: nc?.workCell?.i ?? -1 },
        e: NET.events.map((x) => x.e),
        cn: [NET.coins.roji, NET.coins.homama],
      };
      let len = JSON.stringify(s).length;
      if (len > 1470) {
        s.it = encodeItems(S, false);
        len = JSON.stringify(s).length;
      }
      if (len > 1470) {
        s.e = s.e.slice(-3);
        len = JSON.stringify(s).length;
      }
      if (len <= 1490) ol.share(s);
    }
    // the other copy: our chef for the starter's copy, and what we pick up or put down
    function sendChef() {
      const c = chefOf(me);
      if (!c) return;
      const q = L.sim.target(c);
      ol.share({ at: ol.now(), lv: L.i, x: +c.x.toFixed(3), z: +c.z.toFixed(3), y: +c.yaw.toFixed(3), sp: +c.speed.toFixed(2), tu: +Math.max(-30, Math.min(30, c.turn)).toFixed(1), hp: +c.hop.toFixed(3), w: c.ctrl.work ? 1 : 0, wt: q ? q.i : -1 });
    }
    function sendUse(c) {
      const q = L.sim.target(c);
      ol.send('u', { i: q ? q.i : -1, x: +c.x.toFixed(3), z: +c.z.toFixed(3), y: +c.yaw.toFixed(3) });
    }
    // the other copy: the kitchen as the starter's copy has it
    function applySnap(s) {
      if (!L || s.lv !== L.i) return;
      const S = L.sim;
      const W = L.world;
      const lag = Math.max(0, ol.now() - s.at) / 1000;
      const play = s.ph === 'play';
      const tw = Math.max(0, s.t - (play ? lag : 0));
      S.time = Math.abs(S.time - tw) > 0.6 ? tw : S.time + (tw - S.time) * 0.3;
      const wt = s.wt + lag;
      W.t = Math.abs(W.t - wt) > 0.3 ? wt : W.t + (wt - W.t) * 0.3;
      Object.assign(S, { score: s.sc | 0, served: s.sv | 0, missed: s.ms | 0, tips: s.tp | 0, streak: s.sk | 0, bestStreak: s.bs | 0, nextOrder: +s.no || 0, rushed: !!s.ru, orderId: s.oi | 0, uid: Math.max(S.uid, s.u | 0), returns: Array.isArray(s.rt) ? s.rt.filter(Number.isFinite) : [] });
      if (Array.isArray(s.cn)) NET.coins = { roji: s.cn[0] | 0, homama: s.cn[1] | 0 };
      applyCells(S, s.q);
      applyItems(S, decodeItems(s.it), { roji: chefOf('roji'), homama: chefOf('homama') });
      const hc = chefOf(pal);
      const mc = chefOf(me);
      if (s.c) {
        hc.working = s.c.wk || null;
        hc.workCell = W.cells[s.c.wc] || null;
        NET.follow.push({ at: s.at, x: s.c.x, z: s.c.z, y: s.c.y, sp: s.c.sp, tu: s.c.tu, hp: s.c.hp });
      }
      if (s.n) {
        mc.working = s.n.wk || null;
        mc.workCell = W.cells[s.n.wc] || null;
      }
      for (const e of Array.isArray(s.e) ? s.e : []) {
        if (!Array.isArray(e) || !(e[0] > NET.lastSeq)) continue;
        NET.lastSeq = e[0];
        replay(e);
      }
      // the order tickets
      const list = decodeOrders(s.o);
      const ids = new Set(list.map((o) => o.id));
      for (const o of S.orders) if (!ids.has(o.id)) ui.endOrder(o, 'done');
      const old = new Map(S.orders.map((o) => [o.id, o]));
      S.orders = list.map((o) => {
        const p = old.get(o.id);
        if (p) {
          p.t = Math.max(0, o.t - (play ? lag : 0));
          return p;
        }
        ui.addOrder(o);
        sfx.pop();
        later(120, () => sfx.ding());
        return o;
      });
    }
    function replay(e) {
      const [, type, cid, ci, ...x] = e;
      const chef = cid ? chefOf(cid === 'r' ? 'roji' : 'homama') : null;
      const d = { chef, cell: ci >= 0 ? L.world.cells[ci] || null : null };
      if ((type === 'say' || type === 'reject' || type === 'hint' || type === 'nudged' || type === 'dash') && !chef) return;
      if (type === 'say' || type === 'reject') d.text = x[0];
      else if (type === 'hint') d.kind = x[0];
      else if (type === 'chopped') d.item = { id: x[0] };
      else if (type === 'served') {
        Object.assign(d, { dish: dishAt(x[0]), pts: x[1] | 0, tip: x[2] | 0, streak: x[3] | 0, order: { id: x[4] } });
        if (!d.dish || !d.cell) return;
      } else if (type === 'missed') {
        d.order = L.sim.orders.find((o) => o.id === x[0]);
        d.lost = x[1] | 0;
        if (!d.order) return;
      } else if (type === 'bump') {
        d.a = chefOf('roji');
        d.b = chefOf('homama');
      }
      if ((type === 'add' || type === 'chopped' || type === 'burnt' || type === 'served') && !d.cell) return;
      onEvent(type, d);
    }
    // the chefs' shares of the coins: a served order to whoever served it, a missed one off both
    function coinsServed(id, n) {
      if (id in NET.coins) NET.coins[id] += n;
    }
    function coinsLost(n) {
      for (let k = 0; k < n; k++) {
        const who = NET.coins.roji >= NET.coins.homama ? 'roji' : 'homama';
        if (NET.coins[who] > 0) NET.coins[who]--;
      }
    }
    // the other copy: the starter started a shift (or we joined theirs): cook it with them
    async function joinShift(d) {
      if (!Number.isInteger(d?.i) || !LEVELS[d.i]) return;
      ui.closeCard();
      const i = d.i;
      if (!L || L.i !== i || L.sim.clock > 0.5 || !L.sim.mirror || phase === 'over') build(i, 'solo');
      ctx.online.next();
      ctx.online.progress(LEVELS[i].name);
      NET.lastSeq = 0;
      const c = chefOf(me);
      if (Number.isFinite(d.x) && Number.isFinite(d.z) && L.world.fits(d.x, d.z, R)) {
        c.x = d.x;
        c.z = d.z;
        c.yaw = Number.isFinite(d.y) ? d.y : c.yaw;
      }
      phase = 'count';
      ui.setPlay(true);
      ui.setClock(L.lv.time, L.lv.time);
      ui.setScore(0, L.lv.stars);
      setButtons();
      const at = d.at || 0;
      if (at > ol.now() + 200) {
        const goOn = await countTo(ctx, at, { isGone: () => !alive || !L || L.i !== i });
        if (!goOn) return;
      }
      if (!alive || !L || L.i !== i || phase !== 'count') return;
      phase = 'play';
      setButtons();
      L.sim.running = true;
    }

    // ---------------------------------------------------------------- camera that fits the kitchen
    function fitCamera() {
      if (!L) return;
      const b = L.world.bounds();
      const W = window.innerWidth;
      const H = window.innerHeight;
      const small = H < 520;
      const topPx = small ? 82 : 124;
      const sidePx = touch() ? (small ? 168 : 180) : 14;
      const botPx = touch() ? 8 : 30;
      camera.fov = 40;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      const pitch = THREE.MathUtils.degToRad(57);
      const dir = new THREE.Vector3(0, -Math.sin(pitch), -Math.cos(pitch));
      // front corners must clear the thumbstick and the buttons on phones; the back corners only the edges
      const pts = [
        [b.x0, 0, b.z1 + 0.1, 1],
        [b.x1, 0, b.z1 + 0.1, 1],
        [b.x0, 1.55, b.z0 + 0.6, 0],
        [b.x1, 1.55, b.z0 + 0.6, 0],
        [b.x0, 0.7, b.z1, 1],
        [b.x1, 0.7, b.z1, 1],
      ].map(([x, y, z, f]) => Object.assign(new THREE.Vector3(x, y, z), { front: f }));
      const cx = (b.x0 + b.x1) / 2;
      let tz = (b.z0 + b.z1) / 2;
      const lim = { x: 1 - (2 * sidePx) / W, xb: 1 - (2 * (touch() ? 40 : 14)) / W, top: 1 - (2 * topPx) / H, bot: -1 + (2 * botPx) / H };
      let D = 20;
      const place = () => {
        const tgt = new THREE.Vector3(cx, 0.4, tz);
        camera.position.copy(tgt).addScaledVector(dir, -D);
        camera.lookAt(tgt);
        camera.updateMatrixWorld(true);
      };
      const ext = () => {
        let x = 0;
        let y0 = Infinity;
        let y1 = -Infinity;
        for (const p of pts) {
          v3.copy(p).project(camera);
          x = Math.max(x, Math.abs(v3.x) / (p.front ? lim.x : lim.xb));
          y0 = Math.min(y0, v3.y);
          y1 = Math.max(y1, v3.y);
        }
        return { x, y0, y1 };
      };
      for (let it = 0; it < 6; it++) {
        let lo = 4;
        let hi = 60;
        for (let k = 0; k < 22; k++) {
          D = (lo + hi) / 2;
          place();
          const e = ext();
          const fitX = e.x <= 1;
          const fitY = e.y1 - e.y0 <= lim.top - lim.bot;
          if (fitX && fitY) hi = D;
          else lo = D;
        }
        D = hi;
        // move the view so the kitchen sits centred between the order bar and the bottom
        const want = (lim.top + lim.bot) / 2;
        let zlo = b.z0 - 12;
        let zhi = b.z1 + 12;
        for (let k = 0; k < 24; k++) {
          tz = (zlo + zhi) / 2;
          place();
          const e = ext();
          if ((e.y0 + e.y1) / 2 > want) zhi = tz;
          else zlo = tz;
        }
      }
      place();
      L.cam = { pos: camera.position.clone(), D };
    }

    // ---------------------------------------------------------------- keys (both players on one keyboard)
    const keys = new Set();
    const hit = new Set();
    const onDown = (e) => {
      if (!alive) return;
      if (!keys.has(e.code)) hit.add(e.code);
      keys.add(e.code);
      if (e.code === 'Tab' && phase === 'play') e.preventDefault();
      if (phase === 'play' && (e.code === 'Space' || e.code === 'Enter') && document.activeElement?.tagName === 'BUTTON') document.activeElement.blur();
    };
    const onUp = (e) => keys.delete(e.code);
    const onBlur = () => keys.clear();
    window.addEventListener('keydown', onDown, true);
    window.addEventListener('keyup', onUp, true);
    window.addEventListener('blur', onBlur);
    const axisOf = (u, d, l, r) => ({ x: (keys.has(r) ? 1 : 0) - (keys.has(l) ? 1 : 0), y: (keys.has(u) ? 1 : 0) - (keys.has(d) ? 1 : 0) });
    function readControls() {
      const S = L.sim;
      const humans = S.chefs.filter((c) => c.ctrlKind !== 'ai' && !c.net); // (the other player's chef is theirs)
      for (const c of humans) {
        const k = c.ctrl;
        let a;
        let use;
        let work;
        let dash;
        if (L.mode === 'duo') {
          if (c.ctrlKind === 'p1') {
            a = axisOf('KeyW', 'KeyS', 'KeyA', 'KeyD');
            use = hit.has('KeyE');
            work = keys.has('Space');
            dash = hit.has('ShiftLeft');
          } else {
            a = axisOf('ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight');
            use = hit.has('Enter') || hit.has('NumpadEnter');
            work = keys.has('ShiftRight') || keys.has('Slash');
            dash = hit.has('ControlRight') || hit.has('Period');
          }
        } else {
          a = input.axis();
          use = input.pressed('action');
          work = input.held('jump') || keys.has('Space');
          dash = hit.has('ShiftLeft') || hit.has('ShiftRight') || input.pressed('dash');
        }
        const m = Math.hypot(a.x, a.y);
        k.ax = m > 1 ? a.x / m : a.x;
        k.az = m > 1 ? -a.y / m : -a.y;
        k.use = k.use || use;
        k.work = work;
        k.dash = k.dash || dash;
        k.target = null;
        k.face = null;
      }
      if (L.mode !== 'duo' && !auto && !NET.on && (hit.has('Tab') || input.pressed('swap')) && phase === 'play') swap();
      hit.clear();
    }
    function swap() {
      const S = L.sim;
      const p = S.chefs.find((c) => c.ctrlKind === 'p1');
      const a = S.chefs.find((c) => c.ctrlKind === 'ai');
      if (!p || !a) return;
      p.ctrlKind = 'ai';
      a.ctrlKind = 'p1';
      L.brains.delete(a);
      a.brain = null;
      Object.assign(a.ctrl, { ax: 0, az: 0, use: false, work: false, dash: false, target: null, face: null });
      const b = new Brain(S, p, 'helper');
      L.brains.set(p, b);
      p.brain = b;
      sfx.whoosh();
      words.add(`Chef ${NAME[a.id]}`, v3.set(a.x, 2, a.z), { kind: 'say', follow: a, life: 1.1 });
      setButtons();
    }

    // ---------------------------------------------------------------- what happens in the kitchen
    const at = (q, y = TOP + 0.5) => {
      const p = L.world.pos(q);
      return v3b.set(p.x, y, p.z).clone();
    };
    const human = (c) => c && c.ctrlKind !== 'ai';
    function onEvent(type, d) {
      if (!L || !alive) return;
      const S = L.sim;
      if (NET.owner) {
        if (type === 'served') coinsServed(d.chef?.id, d.pts + d.tip);
        if (type === 'missed') coinsLost(d.lost || 0);
        if (NET.on) relay(type, d);
      }
      switch (type) {
        case 'say':
          words.add(d.text, v3.set(d.chef.x, 2, d.chef.z), { kind: 'say', follow: d.chef, life: 1.7 });
          break;
        case 'reject':
          sfx.tone(240, 0.12, { type: 'triangle', gain: 0.05, slideTo: 180 });
          if (d.text && (human(d.chef) || Math.random() < 0.3)) words.add(d.text, v3.set(d.chef.x, 2, d.chef.z), { kind: 'say', follow: d.chef, life: 1.6 });
          break;
        case 'hint':
          if (human(d.chef)) words.add(d.kind === 'wash' ? (touch() ? 'Hold Wash to wash' : 'Hold Space to wash') : d.kind === 'slice' ? (touch() ? 'Hold Slice when it is roasted' : 'Hold Space to slice') : 'Bring raw chicken', v3.set(d.chef.x, 2, d.chef.z), { kind: 'say', follow: d.chef, life: 1.6 });
          break;
        case 'crate':
        case 'pick':
          sfx.pick();
          break;
        case 'drop':
        case 'combine':
          sfx.put();
          break;
        case 'add':
          sfx.tone(420, 0.1, { type: 'sine', gain: 0.05, slideTo: 300 });
          puffs.spawn(at(d.cell, TOP + 0.3), { v: [0, 0.6, 0], life: 0.6, s0: 0.12, s1: 0.32, color: '#ffffff', a: 0.6 });
          break;
        case 'spit':
          sfx.tone(300, 0.2, { type: 'triangle', gain: 0.05, slideTo: 420 });
          break;
        case 'trash':
          sfx.tone(180, 0.18, { type: 'triangle', gain: 0.06, slideTo: 90 });
          break;
        case 'chopped':
          sfx.pop();
          for (let k = 0; k < 6; k++) puffs.spawn(at(d.cell, TOP + 0.12), { v: [(Math.random() - 0.5) * 1.4, 1.4 + Math.random(), (Math.random() - 0.5) * 1.4], g: 5, life: 0.5, s0: 0.07, s1: 0.04, color: PART_COL[d.item.id] || '#7ccc5a', a: 1, drag: 1 });
          break;
        case 'sliced':
          sfx.chop();
          sfx.pop();
          break;
        case 'washed':
          sfx.splash();
          sfx.ding();
          break;
        case 'cooked':
          sfx.ding();
          break;
        case 'burnt':
          sfx.warn();
          words.add('Burnt!', at(d.cell, TOP + 0.9), { kind: 'bad', life: 1.3 });
          break;
        case 'fire':
          if (L.fireBanner <= 0) ui.say('Fire! Grab the extinguisher!', 'bad', 2600);
          L.fireBanner = 6;
          break;
        case 'fireout':
          sfx.ding();
          if (!S.world.cells.some((q) => q.fire > 0)) {
            ui.say('The fire is out. Phew!', 'good', 1600);
            words.add('Phew!', v3.set(d.chef.x, 2, d.chef.z), { kind: 'say', follow: d.chef, life: 1.3 });
          }
          break;
        case 'order':
          ui.addOrder(d.order);
          sfx.pop();
          later(120, () => sfx.ding());
          break;
        case 'served': {
          ui.endOrder(d.order, 'done');
          sfx.bell();
          sfx.coin(Math.min(4, 1 + Math.floor((d.pts + d.tip) / 15)));
          L.view.ring(d.cell);
          const p = at(d.cell, TOP + 0.9);
          words.add(`+${d.pts + d.tip}`, p, { kind: 'pop', life: 1.4, color: '#ffd166' });
          ctx.fx.burst(p.clone(), ['#cf4569', '#ffd166', '#fffaf0', '#7cc95a'], 40);
          ui.say(d.tip && d.streak > 1 ? `${DISH[d.dish].name}! Tip x${d.streak}` : `${DISH[d.dish].name} served!`, 'good', 1500);
          for (const c of S.chefs) S.jump(c, 4);
          // now and then, a small loving moment between the two chefs (not when the other one is a person)
          if (S.served % 4 === 0 && !NET.on) {
            const [who, text] = LOVE[L.loveI++ % LOVE.length];
            const c = S.chefs.find((x) => x.id === who);
            if (c) later(500, () => {
              words.add(text, v3.set(c.x, 2, c.z), { kind: 'say', follow: c, life: 2.2 });
              ctx.fx.heartsAt(v3b.set(c.x, 1.9, c.z).clone(), 3);
            });
          }
          break;
        }
        case 'missed':
          ui.endOrder(d.order, 'miss');
          ui.say(`${DISH[d.order.dish].name} order missed`, 'bad', 1500);
          sfx.ui('bad');
          break;
        case 'bump': {
          sfx.bump();
          d.a.kid.squash = 0.8;
          d.b.kid.squash = 0.8;
          const ai = d.a.ctrlKind === 'ai' ? d.a : d.b.ctrlKind === 'ai' ? d.b : d.a;
          const lines = ['Behind!', 'Oops!', 'Sorry, love!', 'Coming through!'];
          if (!NET.on) words.add(lines[Math.floor(Math.random() * lines.length)], v3.set(ai.x, 2, ai.z), { kind: 'say', follow: ai, life: 1.3 });
          break;
        }
        case 'dash':
          sfx.whoosh();
          puffs.spawn(v3.set(d.chef.x, 0.15, d.chef.z), { v: [-Math.sin(d.chef.yaw), 0.4, -Math.cos(d.chef.yaw)], life: 0.5, s0: 0.25, s1: 0.5, color: '#fffaf0', a: 0.55 });
          break;
        case 'rush':
          ui.say('Rush hour! Orders come faster', 'warn', 2400);
          sfx.ding();
          later(160, () => sfx.ding());
          break;
        case 'nudged':
          words.add('Whoa!', v3.set(d.chef.x, 2, d.chef.z), { kind: 'say', follow: d.chef, life: 1 });
          break;
        default:
      }
    }

    // ---------------------------------------------------------------- flow: kitchens, recipes, cooking, results
    function setButtons() {
      if (phase !== 'play') {
        hud.buttons({ action: null, jump: null, stick: false });
        hud.hint('');
        return;
      }
      hud.buttons({ action: 'Pick up', jump: 'Chop', extra: NET.on ? [{ id: 'dash', label: 'Dash' }] : [{ id: 'dash', label: 'Dash' }, { id: 'swap', label: 'Swap' }] });
      if (L.mode === 'duo') hud.hint(`${NAME[me]}: WASD, E, Space, L-Shift   ${NAME[pal]}: arrows, Enter, R-Shift, R-Ctrl`);
      else if (NET.on) hud.hint(`E pick up or put down, hold Space to chop or wash, Shift dash. ${NAME[pal]} cooks with you.`);
      else hud.hint('E pick up or put down, hold Space to chop or wash, Shift dash, Tab swap chefs');
      lastLabels = '';
    }
    let lastLabels = '';
    function labels() {
      if (phase !== 'play' || !touch() || !L) return;
      const c = L.sim.chefs.find((x) => x.ctrlKind === 'p1');
      if (!c) return;
      const q = L.sim.target(c);
      const H = c.held;
      let a = H ? 'Put down' : 'Pick up';
      if (H && q?.type === 'pass') a = 'Serve';
      if (H && q?.item) a = 'Add';
      if (H && q?.type === 'bin') a = 'Bin it';
      let w = 'Chop';
      if (H?.kind === 'ext') w = 'Spray';
      else if (q?.type === 'sink') w = 'Wash';
      else if (q?.type === 'spit') w = 'Slice';
      const key = a + w;
      if (key === lastLabels) return;
      lastLabels = key;
      const A = document.querySelector('#arena .a-btn[data-b="action"]');
      const J = document.querySelector('#arena .a-btn[data-b="jump"]');
      if (A) A.textContent = a;
      if (J) J.textContent = w;
    }
    function showMap() {
      phase = 'menu';
      ui.setPlay(false);
      setButtons();
      const nx = LEVELS.findIndex((_, i) => isOpen(progress, i) && !progress.stars[i]);
      const show = nx < 0 ? 0 : nx;
      if (!L || L.i !== show) build(show, modeNow());
      ui.showMap({
        progress,
        chef: NAME[me],
        // together, the starter's copy picks the kitchen (the other copy asks it to)
        onPlay: (i) => {
          if (NET.on && !NET.owner) ol.send('pick', { i });
          showIntro(i);
        },
        onMode: (m) => {
          progress.mode = m;
          saveProgress(ctx.save, progress);
        },
        onExit: () => ctx.end(lastResult || { quit: true }),
      });
    }
    function showIntro(i) {
      phase = 'intro';
      if (!L || L.i !== i || L.mode !== modeNow() || L.sim.clock > 0.5) build(i, modeNow());
      if (NET.owner && ol.inRoom) ol.setting('level', i); // the other copy shows the same kitchen
      const start = () => (NET.on && !NET.owner ? (ol.send('start', { i }), ui.say(`Starting with ${NAME[pal]}...`, 'good', 1400)) : begin(i));
      ui.showIntro({ i, lv: LEVELS[i], best: progress.best[i], mode: NET.on ? 'online' : progress.mode, chef: NAME[me], partner: NAME[pal], onStart: start, onBack: () => showMap() });
    }
    let lastResult = null;
    async function begin(i, { skipCount = false } = {}) {
      if (NET.on && !NET.owner) return ol.send('start', { i }); // the starter's copy starts the shift
      ui.closeCard();
      ctx.online.setting('level', i); // online: the other player cooks the same kitchen
      ctx.online.next();
      ctx.online.progress(LEVELS[i].name);
      if (!L || L.i !== i || L.sim.clock > 0.5 || L.mode !== modeNow()) build(i, modeNow());
      if (auto) setAuto(true);
      NET.coins = { roji: 0, homama: 0 };
      NET.uses.length = 0;
      phase = 'count';
      ui.setPlay(true);
      ui.setClock(L.lv.time, L.lv.time);
      ui.setScore(0, L.lv.stars);
      const myL = L;
      if (NET.on) {
        // together: both count down to the same moment
        NET.goAt = ol.now() + (skipCount ? 300 : 3200);
        ol.send('go', { i, at: NET.goAt });
        if (!(await countTo(ctx, NET.goAt, { isGone: () => !alive || L !== myL }))) return;
      } else if (!skipCount) await hud.countdown(3);
      if (!alive || !L || L !== myL) return;
      phase = 'play';
      setButtons();
      L.sim.running = true;
    }
    // given: the end of the shift as the starter's copy had it (together, on the other copy)
    function timeUp(given = null) {
      phase = 'over';
      L.sim.running = false;
      if (given) {
        const S = L.sim;
        Object.assign(S, { score: given.score | 0, served: given.served | 0, missed: given.missed | 0, tips: given.tips | 0, bestStreak: given.streak | 0, time: 0 });
        if (Array.isArray(given.cn)) NET.coins = { roji: given.cn[0] | 0, homama: given.cn[1] | 0 };
      }
      sfx.whistle();
      hud.message("Time's up!", 1800);
      setButtons();
      for (const c of L.sim.chefs) {
        c.ctrl.ax = c.ctrl.az = 0;
        c.ctrl.work = false;
      }
      const S = L.sim;
      const i = L.i;
      const score = S.score;
      const stars = starsFor(i, score);
      const wasOpen = LEVELS.map((_, k) => isOpen(progress, k));
      const isBest = score > progress.best[i];
      progress.stars[i] = Math.max(progress.stars[i], stars);
      progress.best[i] = Math.max(progress.best[i], score);
      saveProgress(ctx.save, progress);
      const newly = LEVELS.findIndex((_, k) => !wasOpen[k] && isOpen(progress, k));
      lastResult = { win: stars > 0, coins: score, stars, level: LEVELS[i].id };
      // online: the result for the other player (cooking together, each chef's share of the coins)
      const shared = NET.on || given;
      if (NET.on && NET.owner) ol.send('end', { i, score, served: S.served, missed: S.missed, tips: S.tips, streak: S.bestStreak, cn: [NET.coins.roji, NET.coins.homama] });
      ctx.online.finished({ win: stars > 0, score: shared ? NET.coins[me] : score, stars, title: LEVELS[i].name });
      later(900, () => {
        for (const c of S.chefs) {
          c.kid.carry(null);
          if (stars > 0) c.kid.emote(stars === 3 ? 'cheer' : 'wave');
        }
        if (stars === 3) {
          ctx.fx.heartsAt(v3.set((S.chefs[0].x + S.chefs[1].x) / 2, 1.8, (S.chefs[0].z + S.chefs[1].z) / 2).clone(), 8);
          if (!shared) later(1700, () => hugIfClose(S));
        }
      });
      later(1900, () => {
        if (!alive) return;
        ui.setPlay(false);
        const nextOpen = i + 1 < LEVELS.length && isOpen(progress, i + 1);
        const need = NEED[i + 1];
        const more = need - totalStars(progress);
        const toNext = i + 1 < LEVELS.length && !nextOpen ? `${more} more ${more === 1 ? 'star opens' : 'stars open'} the next kitchen` : stars < 3 ? `${LEVELS[i].stars[stars]} coins for ${stars + 1} ${stars ? 'stars' : 'star'}` : '';
        ui.showResult({
          i,
          name: LEVELS[i].name,
          title: stars === 3 ? 'A perfect shift!' : stars === 2 ? 'Lovely service!' : stars === 1 ? 'Nice teamwork!' : 'The kitchen is a mess!',
          stars,
          score,
          best: progress.best[i],
          isBest: isBest && score > 0,
          served: S.served,
          missed: S.missed,
          tips: S.tips,
          streak: S.bestStreak,
          unlocked: newly >= 0 ? LEVELS[newly].name : null,
          toNext,
          split: shared ? `${NAME[me]} ${NET.coins[me]} &middot; ${NAME[pal]} ${NET.coins[pal]} coins` : '',
          canNext: nextOpen,
          onNext: () => {
            if (NET.on && !NET.owner) ol.send('pick', { i: i + 1 });
            showIntro(i + 1);
          },
          onAgain: () => begin(i),
          onMap: () => showMap(),
          onExit: () => ctx.end(lastResult),
        });
        for (let k = 0; k < stars; k++) later(250 + k * 320, () => sfx.tone(660 * Math.pow(1.26, k), 0.25, { type: 'triangle', gain: 0.06 }));
      });
    }
    function hugIfClose(S) {
      const [a, b] = S.chefs;
      const mx = (a.x + b.x) / 2;
      const mz = (a.z + b.z) / 2;
      if (!S.world.fits(mx - 0.28, mz, R) || !S.world.fits(mx + 0.28, mz, R)) return;
      a.x = mx - 0.28;
      b.x = mx + 0.28;
      a.z = b.z = mz;
      a.yaw = Math.PI / 2;
      b.yaw = -Math.PI / 2;
      a.kid.emote('hug');
      b.kid.emote('hug');
    }

    // ---------------------------------------------------------------- the debug hook for tests
    const dbg = {
      get L() {
        return L;
      },
      get speed() {
        return speed;
      },
      set speed(v) {
        speed = Math.max(0.1, Math.min(16, +v || 1));
      },
      get auto() {
        return auto;
      },
      set auto(v) {
        setAuto(v === 'p1' ? 'p1' : !!v);
      },
      start(i = 0, { mode = 'solo', auto: au = false, speed: sp = 1, count = false } = {}) {
        progress.mode = mode;
        speed = sp;
        auto = au;
        build(i, mode);
        return begin(i, { skipCount: !count });
      },
      unlockAll() {
        for (let k = 0; k < LEVELS.length; k++) progress.stars[k] = Math.max(progress.stars[k], 3);
        saveProgress(ctx.save, progress);
        if (phase === 'menu') showMap();
      },
      reset() {
        progress = { v: 1, stars: Array(LEVELS.length).fill(0), best: Array(LEVELS.length).fill(0), mode: 'solo' };
        saveProgress(ctx.save, progress);
      },
      finish() {
        if (L) L.sim.time = 0.05;
      },
      trace() {
        if (L) L.sim.log = [];
      },
      log() {
        return L?.sim.log || [];
      },
      fire() {
        const q = L?.world.cells.find((x) => x.type === 'hob') || L?.world.cells.find((x) => x.type === 'counter');
        if (q) L.sim.ignite(q);
        return !!q;
      },
      intro: (i) => showIntro(i),
      map: () => showMap(),
      state() {
        if (!L) return { phase };
        const S = L.sim;
        return {
          phase,
          level: L.i,
          mode: L.mode,
          net: { on: NET.on, owner: NET.owner, mirror: !!S.mirror, coins: { ...NET.coins }, items: S.items.size },
          time: +S.time.toFixed(1),
          score: S.score,
          served: S.served,
          missed: S.missed,
          orders: S.orders.map((o) => `${o.dish}:${Math.round(o.t)}`),
          chefs: S.chefs.map((c) => ({ id: c.id, ctrl: c.ctrlKind, x: +c.x.toFixed(2), z: +c.z.toFixed(2), held: c.held ? `${c.held.kind}:${c.held.id || ''}${c.held.state && c.held.kind === 'ing' ? ':' + c.held.state : ''}${c.held.parts?.length ? '[' + c.held.parts.join(',') + ']' : ''}` : null, job: c.brain?.job?.name || null, target: S.target(c)?.type || null })),
          fire: S.world.cells.filter((q) => q.fire > 0).length,
          dirty: S.sink?.dirty ?? 0,
          clean: S.rack?.rack ?? 0,
          items: [...S.items].filter((it) => it.cell).map((it) => `${it.cell.type}@${it.cell.c},${it.cell.r}:${it.kind}${it.id ? ':' + it.id : ''}${it.kind === 'ing' ? ':' + it.state : ''}${it.contents?.length ? '[' + it.contents.join(',') + ']' : ''}${it.parts?.length ? '[' + it.parts.join(',') + ']' : ''}`),
          warn: S.world.warn?.kind || null,
        };
      },
      // A snapshot for the key-pressing test bot: chefs, stations and items by logical tile.
      bot() {
        const S = L.sim;
        const W = L.world;
        const it = (x) => x && { kind: x.kind, id: x.id, state: x.state, parts: x.parts, contents: x.contents, ready: S.readyPart(x), dirty: x.dirty };
        return {
          phase,
          time: S.time,
          score: S.score,
          served: S.served,
          orders: S.orders.map((o) => o.dish),
          chefs: S.chefs.map((c) => {
            const q = W.at(c.x, c.z);
            return { id: c.id, ctrl: c.ctrlKind, x: c.x, z: c.z, yaw: c.yaw, c: q?.lc, r: q?.lr, held: it(c.held), target: S.target(c) && [S.target(c).lc, S.target(c).lr, S.target(c).type] };
          }),
          cells: W.cells.filter((q) => q.type !== 'floor').map((q) => ({ c: q.lc, r: q.lr, type: q.type, ing: q.ing, fire: q.fire, rack: q.rack, dirty: q.dirty, item: it(q.item), spit: q.spit })),
          trucks: W.truckK,
          hatch: W.hatchK,
        };
      },
      // Floor tiles to walk from a chef to stand next to the station at logical (c, r), with world positions.
      route(id, c, r) {
        const W = L.world;
        const ch = L.sim.chefs.find((x) => x.id === id);
        const from = W.at(ch.x, ch.z);
        const q = W.cellAt(c, r);
        if (!from || !q) return null;
        const p = W.path(from, q.type === 'floor' ? [q] : W.standFor(q));
        return p && p.map((f) => ({ c: f.lc, r: f.lr, ...W.pos(f) }));
      },
      posOf(c, r) {
        const q = L.world.cellAt(c, r);
        return q && L.world.pos(q);
      },
      // Where a station is on screen, for tapping it in tests.
      screen(c, r) {
        const q = L.world.cells.find((x) => x.c === c && x.r === r);
        const p = L.world.pos(q);
        v3.set(p.x, TOP, p.z).project(camera);
        return { x: Math.round((v3.x * 0.5 + 0.5) * window.innerWidth), y: Math.round((-v3.y * 0.5 + 0.5) * window.innerHeight) };
      },
      chefCell(id) {
        const c = L.sim.chefs.find((x) => x.id === id);
        const q = L.world.at(c.x, c.z);
        return q ? { c: q.lc, r: q.lr, x: c.x, z: c.z, yaw: c.yaw } : null;
      },
      cellPos(c, r) {
        const q = L.world.cells.find((x) => x.c === c && x.r === r && x.type !== 'floor') || L.world.cells.find((x) => x.c === c && x.r === r);
        return L.world.pos(q);
      },
    };
    window.__cook = dbg;

    // ---------------------------------------------------------------- start on the kitchen map
    showMap();
    // Online: joining the other player's game opens the kitchen they are cooking in
    const follow = (lv) => (phase === 'menu' || phase === 'over' || (phase === 'intro' && L?.i !== lv)) && !NET.owner && Number.isInteger(lv) && lv >= 0 && lv < LEVELS.length && showIntro(lv);
    if (!ctx.online.isHost) follow(ctx.online.setting('level'));
    ctx.online.on('setting', (k, v) => k === 'level' && !ctx.online.isHost && follow(v));
    // Cooking together: the starter's copy runs the shift, the other copy shows it and sends its chef
    const sendGo = () => {
      const c = chefOf(pal);
      ol.send('go', { i: L.i, at: NET.goAt, x: c ? +c.x.toFixed(3) : null, z: c ? +c.z.toFixed(3) : null, y: c ? +c.yaw.toFixed(3) : null });
    };
    ol.on('state', (st) => {
      if (!st || typeof st !== 'object' || !Number.isFinite(st.at)) return;
      if (NET.owner) NET.follow.push(st);
      else {
        NET.snap = st;
        NET.fresh = true;
      }
    });
    ol.on('u', (d) => NET.owner && NET.on && d && typeof d === 'object' && phase === 'play' && NET.uses.length < 6 && NET.uses.push(d));
    ol.on('start', (d) => NET.owner && NET.on && Number.isInteger(d?.i) && LEVELS[d.i] && (phase === 'menu' || phase === 'intro' || phase === 'over') && begin(d.i));
    ol.on('pick', (d) => NET.owner && NET.on && Number.isInteger(d?.i) && LEVELS[d.i] && (phase === 'menu' || phase === 'intro' || phase === 'over') && showIntro(d.i));
    ol.on('go', (d) => !NET.owner && joinShift(d));
    ol.on('end', (d) => !NET.owner && L && d?.i === L.i && phase !== 'over' && timeUp(d));
    ol.on('join', () => {
      if (!NET.owner || NET.on) return;
      NET.on = true;
      if (L) netOn();
      if (phase === 'play' || phase === 'count') sendGo();
      setButtons();
    });
    ol.on('want', () => NET.owner && NET.on && L && (phase === 'play' || phase === 'count') && sendGo());
    ol.on('leave', () => {
      if (!NET.on) return;
      NET.on = false;
      if (!NET.owner) {
        // the starter left: this copy runs the shift now
        NET.owner = true;
        if (L) {
          L.sim.mirror = false;
          L.sim.onUse = null;
        }
      }
      if (L) netOff();
      ui.say(`${NAME[pal]} left the kitchen. A helper steps in.`, 'warn', 2600);
      setButtons();
    });
    if (NET.on) ol.send('want', null);
    // both opened the kitchen at once and the other copy's session won: this one cooks in theirs
    function becomeGuest() {
      NET.owner = false;
      NET.on = true;
      NET.flipped = true;
      ui.closeCard();
      build(L?.i ?? 0, 'solo');
      const lv = ol.setting('level');
      if (Number.isInteger(lv) && LEVELS[lv]) showIntro(lv);
      else showMap();
      ol.send('want', null);
    }
    // the other copy: the starter's chef, a moment behind
    const followHost = () => {
      const c = chefOf(pal);
      const st = NET.follow.sample(ol.now());
      if (!c || !st) return;
      c.x = st.x;
      c.z = st.z;
      c.yaw = st.y;
      c.speed = st.sp || 0;
      c.turn = st.tu || 0;
      c.hop = st.hp || 0;
    };

    // ---------------------------------------------------------------- per frame
    const chopBeat = new Map();
    function drawIcons(t) {
      const S = L.sim;
      icons.begin();
      rings.begin();
      const W = L.world;
      const flash = Math.sin(t * 10) > 0;
      for (const it of S.items) {
        if (!it.cell && !it.holder) continue;
        it.obj.getWorldPosition(v3);
        if (it.kind === 'plate' && it.parts.length) {
          const dish = S.menu.find((d) => DISH[d].parts.length === it.parts.length && DISH[d].parts.every((p) => it.parts.includes(p)) && it.parts.every((p) => DISH[d].parts.includes(p)));
          const list = dish ? ['step:check'] : it.parts;
          const n = list.length;
          const s = n > 3 ? 0.27 : 0.32;
          list.forEach((p, k) => icons.add(v3b.set(v3.x + (k - (n - 1) / 2) * s * 0.95, v3.y + 0.62, v3.z), p, s));
        } else if (it.kind === 'pan' || it.kind === 'pot' || it.kind === 'jug') {
          const n = it.contents.length;
          if (!n) continue;
          const top = v3.y + (it.kind === 'pan' ? 0.55 : 0.7);
          if (it.contents[0] === 'burnt') {
            icons.add(v3b.set(v3.x, top, v3.z), flash ? 'step:warn' : 'burnt', 0.36);
            continue;
          }
          const ready = S.readyPart(it);
          if (ready) {
            const burn = it.kind === 'pan' ? PAN_BURN : POT_BURN;
            const k = it.kind === 'jug' ? 0 : it.over / burn;
            if (k > 0.35 && it.heat) {
              rings.add(v3b.set(v3.x + 0.32, top, v3.z), 1 - k, '#e5484d', 0.28);
              icons.add(v3b.set(v3.x - 0.12, top, v3.z), flash ? 'step:warn' : ready, 0.34);
            } else icons.add(v3b.set(v3.x, top, v3.z), ready, 0.36);
            continue;
          }
          it.contents.forEach((p, k) => icons.add(v3b.set(v3.x + (k - (n - 1) / 2) * 0.3, top, v3.z), p, 0.3));
          if (it.heat) {
            const want = it.kind === 'pan' ? PAN_TIME : BREW[it.done || Object.keys(BREW).find((b) => BREW[b].vessel === it.kind && BREW[b].needs.length === it.contents.length && BREW[b].needs.every((p) => it.contents.includes(p)))]?.time;
            if (want) rings.add(v3b.set(v3.x, top + 0.34, v3.z), it.cook / want, '#7cc95a', 0.26);
          }
        } else if (it.kind === 'ing' && it.chop > 0 && it.state === 'raw') {
          rings.add(v3b.set(v3.x, v3.y + 0.5, v3.z), it.chop, '#7cc95a', 0.3);
        }
      }
      for (const q of W.cells) {
        if (q.spit && q.spit.portions > 0) {
          const p = W.pos(q);
          if (q.spit.roast < 1) rings.add(v3b.set(p.x, TOP + 1.45, p.z), q.spit.roast, '#f4b942', 0.3);
          else {
            icons.add(v3b.set(p.x - 0.1, TOP + 1.45, p.z), 'chicken:sliced', 0.34);
            if (q.spit.slice > 0) rings.add(v3b.set(p.x + 0.28, TOP + 1.45, p.z), q.spit.slice, '#7cc95a', 0.26);
          }
        }
        if (q.type === 'sink' && q.work > 0 && q.dirty > 0) {
          const p = W.pos(q);
          rings.add(v3b.set(p.x, TOP + 0.75, p.z), q.work, '#6fb8ff', 0.3);
        }
      }
      icons.end();
      rings.end();
    }
    function effects(dt, t) {
      const S = L.sim;
      const W = L.world;
      L.steamT -= dt;
      const puff = L.steamT <= 0;
      if (puff) L.steamT = 0.22;
      let pans = 0;
      let pots = 0;
      for (const it of S.items) {
        if (!it.cell || !it.heat) continue;
        const burnt = it.contents[0] === 'burnt';
        if (it.kind === 'pan') pans++;
        if (it.kind === 'pot') pots++;
        if (!puff) continue;
        it.obj.getWorldPosition(v3);
        const over = (it.kind === 'pan' ? it.over / PAN_BURN : it.over / POT_BURN) || 0;
        if (burnt || over > 0.5) puffs.spawn(v3b.set(v3.x + (Math.random() - 0.5) * 0.2, v3.y + 0.2, v3.z), { v: [0, 1.1, 0], life: 1.6, s0: 0.2, s1: 0.75, color: burnt ? '#4a4048' : '#8a8088', a: 0.55 });
        else if (it.kind !== 'jug' && Math.random() < 0.7) puffs.spawn(v3b.set(v3.x + (Math.random() - 0.5) * 0.2, v3.y + 0.25, v3.z), { v: [0, 0.8, 0], life: 1.2, s0: 0.12, s1: 0.45, color: '#ffffff', a: 0.4 });
      }
      sizzle.set(phase === 'play' ? Math.min(0.03, pans * 0.012) : 0);
      bubble.set(phase === 'play' ? Math.min(0.03, pots * 0.012) : 0);
      // fire, smoke and the alarm
      const fires = [];
      for (const q of W.cells) {
        if (q.fire <= 0) continue;
        const p = W.pos(q);
        fires.push({ x: p.x, y: TOP + 0.02, z: p.z, k: q.fire, i: q.i });
        if (puff && Math.random() < 0.8) puffs.spawn(v3b.set(p.x, TOP + 0.9, p.z), { v: [(Math.random() - 0.5) * 0.3, 1.3, 0], life: 1.8, s0: 0.3, s1: 0.95, color: '#3b3438', a: 0.5 });
      }
      flames.draw(fires, t);
      sfx.alarm(dt, fires.length > 0 && phase === 'play');
      L.fireBanner -= dt;
      for (const c of S.chefs) {
        if (c.working === 'spray' && puff) {
          const sy = Math.sin(c.yaw);
          const cy = Math.cos(c.yaw);
          for (let k = 0; k < 3; k++) puffs.spawn(v3b.set(c.x + sy * 0.4, 0.75, c.z + cy * 0.4), { v: [sy * 3 + (Math.random() - 0.5), 0.3, cy * 3 + (Math.random() - 0.5)], life: 0.6, s0: 0.12, s1: 0.5, color: '#ffffff', a: 0.8, drag: 2 });
          if (Math.random() < 0.5) sfx.spray();
        }
        if (c.working === 'wash' && puff) {
          const p = W.pos(c.workCell);
          puffs.spawn(v3b.set(p.x + (Math.random() - 0.5) * 0.4, TOP + 0.1, p.z + (Math.random() - 0.5) * 0.3), { v: [0, 0.6, 0], life: 0.8, s0: 0.06, s1: 0.16, color: '#cfeaff', a: 0.85 });
          if (Math.random() < 0.3) sfx.splash();
        }
        if (c.working === 'chop' || c.working === 'slice') {
          const n = (chopBeat.get(c) || 0) + dt;
          if (n > 0.22) {
            chopBeat.set(c, 0);
            sfx.chop();
          } else chopBeat.set(c, n);
        }
      }
      puffs.update(dt);
    }
    function drawChefs(dt, t) {
      const S = L.sim;
      for (const c of S.chefs) {
        const kid = c.kid;
        kid.root.position.set(c.x, c.hop, c.z);
        kid.root.rotation.y = c.yaw;
        if (!c.held && kid.carried) kid.carry(null);
        kid.hands = c.held ? 'carry' : c.working === 'chop' || c.working === 'wash' || c.working === 'slice' ? 'stir' : null;
        const n = Math.max(1, Math.ceil(dt / 0.05));
        for (let k = 0; k < n; k++) kid.update(dt / n, t, c.speed, c.hop > 0.01 ? c.hop : 0, c.turn);
      }
      // markers under the chefs people play, and on what each one faces
      const show = (m, c) => {
        m.ring.visible = !!c;
        m.sel.visible = false;
        if (!c) return;
        m.ring.position.set(c.x, 0.03, c.z);
        const q = phase === 'play' ? S.target(c) : null;
        if (q) {
          const p = L.world.pos(q);
          m.sel.visible = true;
          m.sel.position.set(p.x, TOP + 0.015 + (q.type === 'board' ? 0.06 : 0), p.z);
          const k = 1.12 + Math.sin(t * 6) * 0.03;
          m.sel.scale.set(k, k, 1);
        }
      };
      const p1 = S.chefs.find((c) => c.ctrlKind === 'p1');
      const p2 = S.chefs.find((c) => c.ctrlKind === 'p2');
      show(markers.p1, auto ? null : p1);
      show(markers.p2, auto ? null : p2);
      markers.p1.ring.material.color.set(p1?.id === 'homama' ? '#3f7bf0' : '#e0607e');
      markers.p1.sel.material.color.copy(markers.p1.ring.material.color);
      if (p2) {
        markers.p2.ring.material.color.set(p2.id === 'homama' ? '#3f7bf0' : '#e0607e');
        markers.p2.sel.material.color.copy(markers.p2.ring.material.color);
      }
    }
    function warnings() {
      const w = L.world.warn;
      const k = w?.kind || null;
      if (k && k !== L.lastWarn && phase === 'play') {
        const text = { apart: 'The trucks are drifting apart!', together: 'The trucks are coming back together', slide: 'The floor slides in 3 seconds!', hatch: 'The stair hatch is opening!', hatchclose: 'The hatch is closing' }[k];
        if (text) ui.say(text, 'warn', 2200);
        if (k === 'slide' || k === 'apart') later(2600, () => sfx.rumble());
      }
      L.lastWarn = k;
    }
    let resizeKey = '';
    return {
      update(dt, t) {
        if (!L) return;
        if (ol.inRoom && NET.owner && !ol.isHost && !NET.flipped) becomeGuest();
        const rk = `${window.innerWidth}x${window.innerHeight}|${touch()}`;
        if (rk !== resizeKey) {
          resizeKey = rk;
          fitCamera();
        }
        const S = L.sim;
        if (phase === 'play' || phase === 'count' || phase === 'over' || phase === 'menu' || phase === 'intro') {
          if (phase === 'play') readControls();
          else hit.clear();
          // together: the other chef from their device (the starter's copy), or the kitchen from the starter
          if (NET.on && NET.owner) applyRemoteChef();
          if (S.mirror) {
            if (NET.fresh) {
              NET.fresh = false;
              applySnap(NET.snap);
            }
            followHost();
            if (NET.snap?.ph === 'play' && NET.snap.lv >= 0 && (phase === 'menu' || phase === 'intro')) joinShift({ i: NET.snap.lv, at: 0 });
          }
          const total = dt * speed;
          const n = Math.max(1, Math.ceil(total / 0.05));
          const sdt = total / n;
          for (let k = 0; k < n; k++) {
            for (const [c, b] of L.brains) if (c.ctrlKind === 'ai') b.update(sdt);
            S.update(sdt);
            if (phase === 'play' && S.time <= 0 && !S.mirror) {
              timeUp();
              break;
            }
          }
          if (NET.on && NET.owner) sendKitchen();
          else if (S.mirror && NET.on) sendChef();
          L.view.update(total, t, S);
          drawChefs(total, t);
          drawIcons(t);
          effects(total, t);
          if (phase === 'play' || phase === 'count') {
            ui.setClock(S.time, L.lv.time);
            ui.setScore(S.score, L.lv.stars);
            ctx.online.score(S.score);
            ui.tickOrders(S.orders);
            warnings();
            labels();
          }
        }
        words.update(dt * Math.min(speed, 2));
        ui.update(dt);
        env?.follow?.(v3.set(L.cam ? camera.position.x : 0, 0, (L.world.bounds().z0 + L.world.bounds().z1) / 2));
      },
      dispose() {
        alive = false;
        for (const id of timers) clearTimeout(id);
        window.removeEventListener('keydown', onDown, true);
        window.removeEventListener('keyup', onUp, true);
        window.removeEventListener('blur', onBlur);
        sfx.stopLoops();
        sfx.on = false;
        words.dispose();
        ui.dispose();
        skyTex?.dispose();
        if (window.__cook === dbg) delete window.__cook;
      },
    };
  },
};
