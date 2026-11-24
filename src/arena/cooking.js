import * as THREE from 'three';
import { TOP, LEVELS, DISH, PAN_BURN, POT_BURN, BREW, PAN_TIME, loadProgress, saveProgress, isOpen, starsFor, totalStars, NEED } from './cooking/data.js';
import { World } from './cooking/world.js';
import { Sim, R } from './cooking/sim.js';
import { Brain } from './cooking/ai.js';
import { buildKitchen, THEMES } from './cooking/kitchen.js';
import { Icons, Rings, Puffs, Flames, Words, makeMarkers, Sfx } from './cooking/fx.js';
import { createUI } from './cooking/ui.js';
import { makeChef } from './cooking/chefs.js';

// Roji's YumYum Kitchen, an Overcooked style co-op kitchen. Roji and Homama are both chefs: you play
// one, and the other is a helpful computer chef (or a second player on the same keyboard). Fetch from
// crates, chop on boards, cook in pans and pots, slice the shawarma spit, wash plates, plate up the
// orders and serve them at the pass before their timers run out. Eight kitchens, each with a twist.

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
      const first = sim.addChef(me, kids[me], lv.a, 'p1');
      const second = sim.addChef(pal, kids[pal], lv.b, mode === 'duo' ? 'p2' : 'ai');
      for (const c of sim.chefs) {
        c.kid.root.position.set(c.x, 0, c.z);
        c.kid.root.rotation.y = c.yaw;
        c.kid.pose = 'stand';
        c.kid.hands = null;
      }
      const brains = new Map();
      if (mode !== 'duo') brains.set(second, new Brain(sim, second, 'helper'));
      second.brain = brains.get(second) || null;
      first.brain = null;
      L = { i, lv, world, sim, view, chefs: sim.chefs, brains, mode, lastWarn: null, fireBanner: 0, chopT: new Map(), steamT: 0, loveI: 0 };
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
      const humans = S.chefs.filter((c) => c.ctrlKind !== 'ai');
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
      if (L.mode !== 'duo' && !auto && (hit.has('Tab') || input.pressed('swap')) && phase === 'play') swap();
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
          // now and then, a small loving moment between the two chefs
          if (S.served % 4 === 0) {
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
          words.add(lines[Math.floor(Math.random() * lines.length)], v3.set(ai.x, 2, ai.z), { kind: 'say', follow: ai, life: 1.3 });
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
      hud.buttons({ action: 'Pick up', jump: 'Chop', extra: [{ id: 'dash', label: 'Dash' }, { id: 'swap', label: 'Swap' }] });
      if (L.mode === 'duo') hud.hint(`${NAME[me]}: WASD, E, Space, L-Shift   ${NAME[pal]}: arrows, Enter, R-Shift, R-Ctrl`);
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
      if (!L || L.i !== show) build(show, progress.mode);
      ui.showMap({
        progress,
        chef: NAME[me],
        onPlay: (i) => showIntro(i),
        onMode: (m) => {
          progress.mode = m;
          saveProgress(ctx.save, progress);
        },
        onExit: () => ctx.end(lastResult || { quit: true }),
      });
    }
    function showIntro(i) {
      phase = 'intro';
      if (!L || L.i !== i || L.mode !== progress.mode || L.sim.clock > 0.5) build(i, progress.mode);
      ui.showIntro({ i, lv: LEVELS[i], best: progress.best[i], mode: progress.mode, chef: NAME[me], partner: NAME[pal], onStart: () => begin(i), onBack: () => showMap() });
    }
    let lastResult = null;
    async function begin(i, { skipCount = false } = {}) {
      ui.closeCard();
      if (!L || L.i !== i || L.sim.clock > 0.5 || L.mode !== progress.mode) build(i, progress.mode);
      if (auto) setAuto(true);
      phase = 'count';
      ui.setPlay(true);
      ui.setClock(L.lv.time, L.lv.time);
      ui.setScore(0, L.lv.stars);
      if (!skipCount) await hud.countdown(3);
      if (!alive || !L) return;
      phase = 'play';
      setButtons();
      L.sim.running = true;
    }
    function timeUp() {
      phase = 'over';
      L.sim.running = false;
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
      later(900, () => {
        for (const c of S.chefs) {
          c.kid.carry(null);
          if (stars > 0) c.kid.emote(stars === 3 ? 'cheer' : 'wave');
        }
        if (stars === 3) {
          ctx.fx.heartsAt(v3.set((S.chefs[0].x + S.chefs[1].x) / 2, 1.8, (S.chefs[0].z + S.chefs[1].z) / 2).clone(), 8);
          later(1700, () => hugIfClose(S));
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
          canNext: nextOpen,
          onNext: () => showIntro(i + 1),
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
        const rk = `${window.innerWidth}x${window.innerHeight}|${touch()}`;
        if (rk !== resizeKey) {
          resizeKey = rk;
          fitCamera();
        }
        const S = L.sim;
        if (phase === 'play' || phase === 'count' || phase === 'over' || phase === 'menu' || phase === 'intro') {
          if (phase === 'play') readControls();
          else hit.clear();
          const total = dt * speed;
          const n = Math.max(1, Math.ceil(total / 0.05));
          const sdt = total / n;
          for (let k = 0; k < n; k++) {
            for (const [c, b] of L.brains) if (c.ctrlKind === 'ai') b.update(sdt);
            S.update(sdt);
            if (phase === 'play' && S.time <= 0) {
              timeUp();
              break;
            }
          }
          L.view.update(total, t, S);
          drawChefs(total, t);
          drawIcons(t);
          effects(total, t);
          if (phase === 'play' || phase === 'count') {
            ui.setClock(S.time, L.lv.time);
            ui.setScore(S.score, L.lv.stars);
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
