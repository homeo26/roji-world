import * as THREE from 'three';
import * as util from '../util.js';
import { Kid } from '../kid.js';
import { Effects } from '../fx.js';
import { Car } from '../car.js';
import { ARENAS } from './manifest.js';
import { choose, closeChoices } from './choose.js';

// Runs a 3D minigame in its own scene, with the same renderer, characters and controls as the town.
// A game module (src/arena/<id>.js) default-exports:
//   { id, title, tagline, async start(ctx) -> { update(dt, t), dispose?() } }
// See ARENA-CONTRACT in the brief for every field of ctx.

const CSS = `
#arena { position: fixed; inset: 0; z-index: 40; pointer-events: none; font-family: var(--font, 'Fredoka', system-ui, sans-serif); color: #3b2b3f; }
#arena.hidden { display: none; }
#arena .a-top { position: absolute; top: max(10px, env(safe-area-inset-top)); left: max(12px, env(safe-area-inset-left)); right: max(12px, env(safe-area-inset-right)); display: flex; align-items: center; gap: 10px; }
#arena .a-title { background: rgba(255,250,244,.92); border-radius: 16px; padding: 6px 14px; box-shadow: 0 6px 18px rgba(60,30,40,.15); }
#arena .a-title b { display: block; font-size: 1.05rem; line-height: 1.1; }
#arena .a-title span { font-size: .78rem; color: #7a6470; }
#arena .a-score { margin-left: auto; background: rgba(255,250,244,.92); border-radius: 16px; padding: 8px 14px; font-weight: 700; box-shadow: 0 6px 18px rgba(60,30,40,.15); min-width: 40px; text-align: center; }
#arena .a-score:empty { display: none; }
#arena .a-close { pointer-events: auto; width: 42px; height: 42px; border-radius: 50%; border: 0; background: #fffaf4; box-shadow: 0 6px 18px rgba(60,30,40,.18); display: grid; place-items: center; cursor: pointer; color: #3b2b3f; }
#arena .a-msg { position: absolute; left: 50%; top: 38%; transform: translate(-50%, -50%) scale(.8); font-size: clamp(2rem, 7vw, 4.2rem); font-weight: 700; color: #fff; text-shadow: 0 4px 0 rgba(0,0,0,.18), 0 10px 30px rgba(0,0,0,.25); opacity: 0; transition: opacity .2s, transform .25s cubic-bezier(.2,1.4,.4,1); text-align: center; white-space: nowrap; }
#arena .a-msg.on { opacity: 1; transform: translate(-50%, -50%) scale(1); }
#arena .a-hint { position: absolute; left: 50%; bottom: max(16px, env(safe-area-inset-bottom)); transform: translateX(-50%); background: rgba(255,250,244,.9); border-radius: 999px; padding: 6px 14px; font-size: .85rem; box-shadow: 0 6px 18px rgba(60,30,40,.12); white-space: nowrap; }
#arena .a-hint:empty { display: none; }
body.touch #arena .a-hint { display: none; }
#arena .a-btns { position: absolute; right: max(18px, env(safe-area-inset-right)); bottom: max(18px, env(safe-area-inset-bottom)); display: none; gap: 10px; align-items: flex-end; pointer-events: auto; }
body.touch #arena .a-btns { display: flex; }
#arena .a-btn { border: 0; border-radius: 50%; width: 64px; height: 64px; background: #fffaf4; box-shadow: 0 6px 18px rgba(60,30,40,.2); font: 700 .78rem var(--font, system-ui); color: #3b2b3f; touch-action: none; }
#arena .a-btn.main { width: 88px; height: 88px; background: #ef5b6f; color: #fff; font-size: .9rem; }
#arena .a-btn.on { transform: scale(.94); filter: brightness(.95); }
#arena .a-btn:empty, #arena .a-btn.off { display: none; }
#arena .a-result { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(40,24,40,.35); pointer-events: auto; }
#arena .a-result.hidden { display: none; }
#arena .a-card { background: #fffaf4; border-radius: 26px; padding: 22px 26px; width: min(420px, 86vw); text-align: center; box-shadow: 0 20px 60px rgba(40,20,30,.35); }
#arena .a-card h2 { margin: 0 0 6px; font-size: 1.7rem; }
#arena .a-card p { margin: 0 0 16px; color: #6a5662; }
#arena .a-card .row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
#arena .a-card button { border: 0; border-radius: 999px; padding: .7em 1.3em; font: 600 1rem var(--font, system-ui); cursor: pointer; background: #f3e6dc; color: #3b2b3f; }
#arena .a-card button.primary { background: #ef5b6f; color: #fff; }
body.arena-nostick #stick, body.arena-nostick #joy { display: none !important; }
body.arena-on #hud, body.arena-on #minimap, body.arena-on #card, body.arena-on #prompt, body.arena-on #dock, body.arena-on #tbuttons, body.arena-on #toast { display: none !important; }
`;

export class ArenaHost {
  // o: { renderer, sound, input, looks, onOpen(), onClose(result) }
  constructor(o) {
    Object.assign(this, o);
    this.current = null;
    this.mods = {};
    this.pressedSet = new Set();
    this.heldSet = new Set();
    this.taps = [];
    this.pointer = { down: false, x: 0, y: 0, ndc: new THREE.Vector2(), justDown: false, justUp: false };
    this.buildDom();
    this.bindPointer();
    window.addEventListener('keydown', (e) => {
      if (!this.current) return;
      const k = e.key.toLowerCase();
      if (!e.repeat) this.pressedSet.add(k);
      if (k === ' ') this.pressedSet.add('jump');
      if (k === 'e' || k === 'enter') this.pressedSet.add('action');
      if (k === 'escape') this.end({ quit: true });
    });
  }

  get active() {
    return !!this.current;
  }

  has(id) {
    return ARENAS.some((a) => a.id === id) && this.mods[id] !== false;
  }

  // Try loading every arena module once, so cards only list the games that exist.
  async preload(ids = ARENAS.filter((a) => !a.dev).map((a) => a.id)) {
    await Promise.allSettled(
      ids.map(async (id) => {
        if (this.mods[id]) return;
        const def = ARENAS.find((a) => a.id === id);
        try {
          this.mods[id] = (await import(def.module)).default;
        } catch {
          this.mods[id] = false;
        }
      }),
    );
    return ids.filter((id) => this.mods[id]);
  }

  meta(id) {
    const m = this.mods[id];
    return m ? { id, title: m.title, tagline: m.tagline || '', place: ARENAS.find((a) => a.id === id)?.place } : null;
  }

  // ---------------------------------------------------------------- DOM
  buildDom() {
    if (!document.getElementById('arena-style')) {
      const s = document.createElement('style');
      s.id = 'arena-style';
      s.textContent = CSS;
      document.head.appendChild(s);
    }
    const el = document.createElement('div');
    el.id = 'arena';
    el.className = 'hidden';
    el.innerHTML = `
      <div class="a-top"><div class="a-title"><b></b><span></span></div><div class="a-score"></div>
        <button class="a-close" aria-label="Back to town"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
      <div class="a-msg"></div>
      <div class="a-hint"></div>
      <div class="a-btns"></div>
      <div class="a-result hidden"><div class="a-card"><h2></h2><p></p><div class="row"><button data-r="again" class="primary">Play again</button><button data-r="exit">Back to town</button></div></div></div>`;
    document.body.appendChild(el);
    this.el = el;
    this.$ = (s) => el.querySelector(s);
    this.$('.a-close').addEventListener('click', () => this.end({ quit: true }));
    this.$('.a-result').addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      this.sound?.ui('tap');
      if (b.dataset.r === 'again') this.restart();
      else this.end(this.lastResult || {});
    });
  }

  // spec: { action: label | null, jump: label | null, extra: [{ id, label }], stick: false to hide the thumbstick }
  setButtons(spec = {}) {
    document.body.classList.toggle('arena-nostick', spec.stick === false);
    const box = this.$('.a-btns');
    const list = [...(spec.extra || []).map((b) => ({ ...b, cls: '' })), spec.jump !== null ? { id: 'jump', label: spec.jump || 'Jump', cls: '' } : null, spec.action !== null ? { id: 'action', label: spec.action || 'A', cls: 'main' } : null].filter(Boolean);
    box.innerHTML = list.map((b) => `<button class="a-btn ${b.cls}" data-b="${b.id}">${b.label}</button>`).join('');
    for (const btn of box.querySelectorAll('[data-b]')) {
      const id = btn.dataset.b;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btn.setPointerCapture(e.pointerId);
        btn.classList.add('on');
        this.pressedSet.add(id);
        this.heldSet.add(id);
      });
      const up = () => {
        btn.classList.remove('on');
        this.heldSet.delete(id);
      };
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
    }
  }

  bindPointer() {
    const dom = this.renderer.domElement;
    const set = (e) => {
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      this.pointer.ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    };
    let downAt = null;
    dom.addEventListener('pointerdown', (e) => {
      if (!this.current) return;
      set(e);
      this.pointer.down = true;
      this.pointer.justDown = true;
      downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    dom.addEventListener('pointermove', (e) => {
      if (this.current) set(e);
    });
    const up = (e) => {
      if (!this.current || !this.pointer.down) return;
      set(e);
      this.pointer.down = false;
      this.pointer.justUp = true;
      if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 16 && performance.now() - downAt.t < 500) this.taps.push({ x: e.clientX, y: e.clientY, ndc: this.pointer.ndc.clone() });
      downAt = null;
    };
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointercancel', up);
  }

  message(html, ms = 1400) {
    const m = this.$('.a-msg');
    m.innerHTML = html;
    m.classList.add('on');
    clearTimeout(this.msgTimer);
    if (ms > 0) this.msgTimer = setTimeout(() => m.classList.remove('on'), ms);
  }

  // ---------------------------------------------------------------- lifecycle
  async open(id, opts = {}) {
    if (this.current) return null;
    await this.preload([id]);
    const mod = this.mods[id];
    if (!mod) return null;
    this.current = { id, mod, opts, starting: true };
    document.body.classList.add('arena-on');
    this.el.classList.remove('hidden');
    this.$('.a-title b').textContent = mod.title || id;
    this.$('.a-title span').textContent = mod.tagline || '';
    this.input.pointerSteer = false;
    this.onOpen?.(id);
    const done = new Promise((resolve) => (this.current.resolve = resolve));
    await this.boot();
    return done;
  }

  async boot() {
    const c = this.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 600);
    const fx = new Effects(scene);
    fx.initExtras();
    c.scene = scene;
    c.camera = camera;
    c.fx = fx;
    this.$('.a-score').innerHTML = '';
    this.$('.a-hint').textContent = '';
    this.$('.a-result').classList.add('hidden');
    this.setButtons({});
    this.pressedSet.clear();
    this.taps.length = 0;
    const ctx = this.makeCtx(c);
    c.ctx = ctx;
    try {
      c.game = (await c.mod.start(ctx)) || {};
    } catch (e) {
      console.error(`arena ${c.id} failed to start`, e);
      this.end({ error: true });
      return;
    }
    c.starting = false;
  }

  makeCtx(c) {
    const host = this;
    const looks = this.looks;
    const me = c.opts.me || 'roji';
    const partner = me === 'roji' ? 'homama' : 'roji';
    return {
      THREE,
      util,
      FONT: util.FONT,
      scene: c.scene,
      camera: c.camera,
      renderer: this.renderer,
      fx: c.fx,
      sound: this.sound,
      me,
      partner,
      looks,
      opts: c.opts,
      makeKid: (who) => new Kid(typeof who === 'string' ? looks[who] : who),
      models: {
        pony: (coat) => this.models?.pony?.(coat),
        car: (color) => new Car(color),
      },
      env: {
        // Daylight like the town: sky colour, fog, hemisphere light and a shadow-casting sun.
        outdoor({ sky = '#a6dde2', fog = [40, 160], sun = [-11, 22, 12], shadow = 30, intensity = 1 } = {}) {
          const s = c.scene;
          s.background = new THREE.Color(sky);
          if (fog) s.fog = new THREE.Fog(sky, fog[0], fog[1]);
          const hemi = new THREE.HemisphereLight('#fff6ea', '#7fae74', 1.35 * intensity);
          const light = new THREE.DirectionalLight('#fff0d8', 2.5 * intensity);
          light.position.set(...sun);
          light.castShadow = true;
          light.shadow.mapSize.set(2048, 2048);
          light.shadow.bias = -0.0004;
          light.shadow.normalBias = 0.04;
          const cam = light.shadow.camera;
          cam.left = cam.bottom = -shadow;
          cam.right = cam.top = shadow;
          cam.near = 1;
          cam.far = 120;
          s.add(hemi, light, light.target);
          return { hemi, sun: light, follow: (v) => (light.position.set(v.x + sun[0], v.y + sun[1], v.z + sun[2]), light.target.position.copy(v)) };
        },
        indoor({ color = '#f7dcc8', warm = 1 } = {}) {
          const s = c.scene;
          s.background = new THREE.Color(color);
          const hemi = new THREE.HemisphereLight('#fff4e6', '#d8b9a0', 1.5 * warm);
          const light = new THREE.DirectionalLight('#fff0d8', 1.8 * warm);
          light.position.set(-4, 9, 6);
          light.castShadow = true;
          light.shadow.mapSize.set(1024, 1024);
          const cam = light.shadow.camera;
          cam.left = cam.bottom = -10;
          cam.right = cam.top = 10;
          s.add(hemi, light, light.target);
          return { hemi, sun: light };
        },
      },
      input: {
        axis: () => host.input.axis(),
        pressed: (name) => host.pressedSet.has(name),
        held: (name) => host.heldSet.has(name) || host.input.keys.has(name) || (name === 'jump' && host.input.keys.has(' ')) || (name === 'action' && (host.input.keys.has('e') || host.input.keys.has('enter'))) || (name === 'run' && host.input.running),
        pointer: host.pointer,
        taps: () => host.taps,
        // Objects hit by the last tap (or the pointer when held). Returns three.js intersections.
        pick(objects, at = host.taps[host.taps.length - 1]?.ndc || host.pointer.ndc) {
          host.ray = host.ray || new THREE.Raycaster();
          host.ray.setFromCamera(at, c.camera);
          return host.ray.intersectObjects(objects, true);
        },
      },
      hud: {
        title: (t, sub = '') => {
          host.$('.a-title b').textContent = t;
          host.$('.a-title span').textContent = sub;
        },
        score: (html) => (host.$('.a-score').innerHTML = html),
        message: (html, ms) => host.message(html, ms),
        hint: (text) => (host.$('.a-hint').textContent = text || ''),
        buttons: (spec) => host.setButtons(spec),
        choose: (spec) => choose(spec), // { title, text, options: [{ id, label, sub }] } -> Promise<id | null>
        async countdown(n = 3) {
          for (let i = n; i > 0; i--) {
            host.message(String(i), 700);
            host.sound?.ui('tick');
            await new Promise((r) => setTimeout(r, 800));
          }
          host.message('Go!', 700);
          host.sound?.ui('good');
        },
      },
      // Show the result card. { win: true|false|null, title, text }. "Play again" restarts the game.
      finish(result = {}) {
        host.lastResult = result;
        host.$('.a-card h2').textContent = result.title || (result.win ? 'You win!' : result.win === false ? 'So close!' : 'Well played!');
        host.$('.a-card p').innerHTML = result.text || '';
        host.$('.a-result').classList.remove('hidden');
        host.sound?.ui(result.win === false ? 'lose' : 'win');
      },
      end: (result) => host.end(result || {}),
      save(key, value) {
        try {
          localStorage.setItem(`roji-arena-${c.id}-${key}`, JSON.stringify(value));
        } catch {
          /* storage full */
        }
      },
      load(key, fallback = null) {
        try {
          const v = localStorage.getItem(`roji-arena-${c.id}-${key}`);
          return v === null ? fallback : JSON.parse(v);
        } catch {
          return fallback;
        }
      },
    };
  }

  dispose(c) {
    try {
      c.game?.dispose?.();
    } catch (e) {
      console.error(e);
    }
    c.scene?.traverse((o) => {
      o.geometry?.dispose?.();
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of ms) {
        for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
        m.dispose?.();
      }
    });
    c.scene = null;
    c.game = null;
  }

  async restart() {
    const c = this.current;
    if (!c) return;
    c.starting = true;
    this.dispose(c);
    await this.boot();
  }

  end(result = {}) {
    const c = this.current;
    if (!c) return;
    this.dispose(c);
    this.current = null;
    closeChoices();
    clearTimeout(this.msgTimer);
    this.$('.a-msg').classList.remove('on');
    this.el.classList.add('hidden');
    document.body.classList.remove('arena-on', 'arena-nostick');
    this.input.pointerSteer = true;
    this.heldSet.clear();
    this.onClose?.(c.id, result);
    c.resolve?.(result);
  }

  resize() {
    const c = this.current;
    if (!c?.camera) return;
    c.camera.aspect = window.innerWidth / window.innerHeight;
    c.camera.updateProjectionMatrix();
  }

  // Called by the host loop every frame while a game is open.
  frame(dt, t) {
    const c = this.current;
    if (!c || c.starting || !c.game) return;
    if (c.camera.aspect !== window.innerWidth / window.innerHeight) this.resize();
    try {
      c.game.update?.(dt, t);
    } catch (e) {
      console.error(`arena ${c.id} update failed`, e);
      this.end({ error: true });
      return;
    }
    if (!this.current) return;
    c.fx.update(dt, t);
    this.renderer.render(c.scene, c.camera);
    this.pressedSet.clear();
    this.taps.length = 0;
    this.pointer.justDown = this.pointer.justUp = false;
  }
}
