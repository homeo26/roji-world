// Bumper Cars: a night under Roji Land's striped tent. Drive your little car round the sparky
// floor, bump the others with your front (sides and backs count, a car facing you blocks), grab a
// horn that blasts everyone away or a boost, and play five rounds: a bump party, bumper tag, beach
// ball goals, last car moving (the outer tiles switch off) and Roji and Homama as a team against
// the mascots Mimi and Bobo. Stars for every round, a saved best night.
// Controls: stick or WASD / arrows point where to drive; Space, E or the Honk button honks or uses the power-up.
import * as THREE from 'three';
import { canvasTexture } from '../util.js';
import * as K from './riding/kit.js';
import { buildScene, HW, HD, GOAL, GRID_Y, inset } from './bumpercars/scene.js';
import { makeCar } from './bumpercars/cars.js';
import { CR, BR, MAX, newBody, stepCar, wallBounce, carHit, ballHit, stepBall, backOff } from './bumpercars/sim.js';
import { BumperFx } from './bumpercars/fx.js';
import { ROUNDS } from './bumpercars/rounds.js';
import { closeChoices } from '../engine/choose.js';

const ICONS = {
  horn: `<svg viewBox="0 0 48 48" width="38" height="38"><path d="M8 20h7l17-10v28L15 28H8z" fill="#ffd166" stroke="#c99a2e" stroke-width="2.4" stroke-linejoin="round"/><path d="M36 16c3 2 4 5 4 8s-1 6-4 8M40 11c5 3 7 8 7 13s-2 10-7 13" fill="none" stroke="#ef5b6f" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  boost: `<svg viewBox="0 0 48 48" width="38" height="38"><path d="M27 4 11 27h11l-3 17 18-25H26z" fill="#ff9a3c" stroke="#e0602a" stroke-width="2.2" stroke-linejoin="round"/><path d="M24 12l-6 10h6" fill="none" stroke="#ffe3a8" stroke-width="2.4" stroke-linecap="round"/></svg>`,
};
const STAR = '&#9733;';
const NOSTAR = '&#9734;';
const stars = (n, of = 3) => `<span class="bc-st">${STAR.repeat(n)}</span><span class="bc-st off">${NOSTAR.repeat(of - n)}</span>`;

const CSS = `${K.BASE_CSS}
body.arena-result #arena .a-top { z-index: 51; } /* keep the X above the result card's backdrop */
.bc-item { position: absolute; top: max(10px, env(safe-area-inset-top)); left: 50%; transform: translateX(-50%); width: 56px; height: 56px; border-radius: 18px; background: rgba(255,250,244,.92); box-shadow: 0 6px 18px rgba(60,30,40,.15); display: grid; place-items: center; border: 3px dashed #e8d6cc; transition: transform .2s cubic-bezier(.2,1.5,.4,1); }
.bc-item.full { border: 3px solid #ffd166; animation: bc-glow .6s ease-in-out infinite alternate; }
.bc-item.pop { transform: translateX(-50%) scale(1.2); }
.bc-item span { position: absolute; bottom: -17px; font-size: .68rem; font-weight: 700; white-space: nowrap; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.45); }
body.touch .bc-item span { display: none; }
@keyframes bc-glow { from { box-shadow: 0 0 0 0 rgba(255,209,102,.8), 0 6px 18px rgba(60,30,40,.15); } to { box-shadow: 0 0 0 8px rgba(255,209,102,0), 0 6px 18px rgba(60,30,40,.15); } }
.bc-board { position: absolute; top: calc(max(10px, env(safe-area-inset-top)) + 58px); left: max(12px, env(safe-area-inset-left)); background: rgba(255,250,244,.88); border-radius: 14px; padding: 6px 10px; box-shadow: 0 6px 18px rgba(60,30,40,.13); font-size: .8rem; min-width: 118px; }
.bc-board:empty { display: none; }
.bc-board div { display: flex; align-items: center; gap: 6px; line-height: 1.45; white-space: nowrap; }
.bc-board i { width: 10px; height: 10px; border-radius: 4px; display: inline-block; }
.bc-board b { margin-left: auto; padding-left: 10px; }
.bc-board .me { font-weight: 700; }
.bc-board .out { opacity: .45; }
.bc-board .glow b { color: #e0a400; }
.bc-pop { position: absolute; transform: translate(-50%, -100%); font-weight: 700; font-size: .95rem; color: #fff; text-shadow: 0 2px 0 rgba(0,0,0,.25), 0 4px 12px rgba(0,0,0,.3); white-space: nowrap; opacity: 0; }
.bc-pop.big { font-size: 1.35rem; }
.bc-tag { position: absolute; transform: translate(-50%, -100%); color: #fff; border-radius: 999px; padding: 1px 8px; font-weight: 700; font-size: .72rem; box-shadow: 0 3px 8px rgba(60,30,40,.25); white-space: nowrap; display: none; }
.bc-tag.it { background: #ffb300 !important; font-size: .8rem; }
.bc-toast { position: absolute; left: 50%; bottom: calc(max(16px, env(safe-area-inset-bottom)) + 40px); transform: translateX(-50%) translateY(10px); background: rgba(255,250,244,.95); border-radius: 999px; padding: 7px 16px; font-size: .9rem; box-shadow: 0 6px 18px rgba(60,30,40,.18); white-space: nowrap; opacity: 0; transition: opacity .25s, transform .25s; max-width: 70vw; text-overflow: ellipsis; overflow: hidden; }
.bc-toast.on { opacity: 1; transform: translateX(-50%); }
body.touch .bc-toast { bottom: max(14px, env(safe-area-inset-bottom)); max-width: 52vw; white-space: normal; text-align: center; border-radius: 16px; font-size: .8rem; }
.bc-res { position: absolute; left: 50%; top: 34%; transform: translate(-50%, -50%) scale(.85); background: rgba(255,250,244,.95); border-radius: 22px; padding: 12px 22px 14px; text-align: center; box-shadow: 0 14px 40px rgba(40,20,30,.3); opacity: 0; transition: opacity .25s, transform .3s cubic-bezier(.2,1.4,.4,1); max-width: min(440px, 80vw); }
.bc-res.on { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.bc-res h3 { margin: 0; font-size: 1.15rem; }
.bc-res .bc-big { font-size: 2.2rem; line-height: 1.1; }
.bc-res p { margin: 4px 0 0; color: #6a5662; font-size: .9rem; }
.bc-st { color: #ffb300; }
.bc-st.off { color: #e3d4c8; }
@media (max-height: 430px) { .bc-board { font-size: .68rem; padding: 4px 8px; min-width: 96px; top: calc(max(8px, env(safe-area-inset-top)) + 50px); } .bc-item { width: 48px; height: 48px; border-radius: 15px; } .bc-item svg { width: 32px; height: 32px; } .bc-res { top: 30%; padding: 8px 16px 10px; } .bc-res .bc-big { font-size: 1.7rem; } .bc-res p { font-size: .8rem; } }
`;

export default {
  id: 'bumpercars',
  title: 'Bumper Cars',
  tagline: 'Bump, dodge and honk under the big top',

  async start(ctx) {
    const { scene, camera, hud, input, looks } = ctx;
    const env = ctx.env.outdoor({ sky: '#35264d', fog: null, sun: [-6, 24, 9], shadow: 15, intensity: 0.95 });
    env.hemi.groundColor.set('#c9a0c4');
    const S = buildScene(ctx);
    const fx = new BumperFx(ctx, S.glow);
    const sfx = fx;
    let disposed = false;
    const nameOf = (id) => looks[id]?.name || (id === 'roji' ? 'Roji' : 'Homama');

    // ---------------------------------------------------------------- cars
    const IDS = ['roji', 'homama', 'mimi', 'bobo', 'nina', 'sam'];
    const cars = IDS.map((id, i) => {
      const c = makeCar(ctx, id);
      if (id === 'roji' || id === 'homama') c.name = nameOf(id);
      c.i = i;
      c.active = false;
      newBody(c, 0, 0, 0);
      scene.add(c.root);
      c.gest = null;
      c.headPos = new THREE.Vector3();
      c.sparkAcc = 0;
      c.hatY = 0;
      c.hatV = 0;
      return c;
    });
    const byId = Object.fromEntries(cars.map((c) => [c.id, c]));
    const parkCars = () => {
      // parked in a little arc in front, facing the camera, so they show below the opening card
      cars.forEach((c, i) => {
        const x = -6.25 + i * 2.5;
        newBody(c, x, 3.6 - Math.abs(x) * 0.12, -x * 0.04);
        c.active = true;
        c.root.visible = true;
      });
    };
    parkCars();

    // floor rings under the cars: you, team colours, the glowing "it" car
    const ringMesh = new THREE.InstancedMesh(new THREE.RingGeometry(0.98, 1.16, 36), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }), cars.length);
    ringMesh.frustumCulled = false;
    ringMesh.renderOrder = 2;
    scene.add(ringMesh);
    // the three power lights on each car (last car moving)
    const lightMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), cars.length * 3);
    lightMesh.frustumCulled = false;
    scene.add(lightMesh);

    // ---------------------------------------------------------------- power-up tokens
    const tokenTex = (type) => {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d');
      g.fillStyle = '#fffaf4';
      g.beginPath();
      g.arc(64, 64, 58, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = 8;
      g.strokeStyle = type === 'horn' ? '#ffd166' : '#ff9a3c';
      g.stroke();
      const img = new Image();
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      img.onload = () => {
        g.drawImage(img, 22, 22, 84, 84);
        t.needsUpdate = true;
      };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ICONS[type].replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
      return t;
    };
    const TOK = { horn: tokenTex('horn'), boost: tokenTex('boost') };
    const tokens = [0, 1, 2].map(() => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TOK.horn, depthWrite: false }));
      sp.scale.setScalar(0.95);
      sp.visible = false;
      sp.renderOrder = 6;
      scene.add(sp);
      return { on: false, type: 'horn', x: 0, z: 0, t: 0, sp };
    });
    let tokenT = 3;

    // ---------------------------------------------------------------- beach balls
    const ballTex = (gold) =>
      canvasTexture(256, 128, (c, w, h) => {
        const cols = gold ? ['#ffd166', '#fff3c4', '#f4c24f', '#fff3c4', '#ffd166', '#fff3c4'] : ['#ef5b6f', '#fffaf4', '#6fb8ff', '#fffaf4', '#ffd166', '#fffaf4'];
        for (let i = 0; i < 6; i++) {
          c.fillStyle = cols[i];
          c.fillRect((i * w) / 6, 0, w / 6 + 1, h);
        }
        c.fillStyle = '#fffaf4';
        c.fillRect(0, 0, w, h * 0.08);
        c.fillRect(0, h * 0.92, w, h * 0.08);
      });
    const ballMats = { plain: new THREE.MeshStandardMaterial({ map: ballTex(false), roughness: 0.45 }), gold: new THREE.MeshStandardMaterial({ map: ballTex(true), roughness: 0.3, metalness: 0.3, emissive: '#5a4000', emissiveIntensity: 0.4 }) };
    const ballGeo = new THREE.SphereGeometry(BR, 20, 14);
    const balls = [0, 1, 2, 3].map(() => {
      const m = new THREE.Mesh(ballGeo, ballMats.plain);
      m.castShadow = true;
      m.visible = false;
      scene.add(m);
      return { on: false, x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, last: null, gold: false, mesh: m, wait: 0 };
    });

    // ---------------------------------------------------------------- HUD layer
    const ui = K.overlay(CSS, `<div class="bc-item"><span>Space</span></div><div class="bc-board"></div>${'<div class="bc-pop"></div>'.repeat(6)}${'<div class="bc-tag"></div>'.repeat(6)}<div class="bc-toast"></div><div class="bc-res"></div>`);
    const itemEl = ui.$('.bc-item');
    const boardEl = ui.$('.bc-board');
    const toastEl = ui.$('.bc-toast');
    const resEl = ui.$('.bc-res');
    const popEls = [...ui.el.querySelectorAll('.bc-pop')].map((el) => ({ el, life: 0, x: 0, y: 0, z: 0 }));
    const tagEls = [...ui.el.querySelectorAll('.bc-tag')];
    itemEl.style.display = 'none';
    let popI = 0;
    let toastTimer = 0;
    const toast = (html, ms = 2600) => {
      toastEl.innerHTML = html;
      toastEl.classList.add('on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms);
    };
    let lastPop = -9;
    const pop = (text, at, color = '#fff', big = false) => {
      // small words do not pile up on top of each other
      const now = performance.now() / 1000;
      if (!big && now - lastPop < 0.35) return;
      lastPop = now;
      const p = popEls[popI];
      popI = (popI + 1) % popEls.length;
      p.el.textContent = text;
      p.el.style.color = color;
      p.el.classList.toggle('big', !!big);
      p.life = big ? 1.3 : 0.95;
      p.max = p.life;
      p.x = at.x;
      p.z = at.z;
      p.y = 1.9;
    };
    // the round result banner, hidden again in game time (so the test speed-up keeps it in step)
    let resId = 0;
    const showRes = (html, ms = 2600) => {
      resEl.innerHTML = html;
      resEl.classList.add('on');
      const id = ++resId;
      after(ms / 1000, () => id === resId && resEl.classList.remove('on'));
    };
    hud.buttons({ action: 'Honk', jump: null });
    hud.hint('Arrows or WASD to drive, Space to honk or use a power-up');
    const setItem = (type) => {
      const me = G.me;
      if (me) me.item = type;
      itemEl.classList.toggle('full', !!type);
      itemEl.innerHTML = (type ? ICONS[type] : '') + `<span>${type ? 'Space to use' : 'Space'}</span>`;
      itemEl.classList.add('pop');
      setTimeout(() => itemEl.classList.remove('pop'), 200);
      const b = document.querySelector('#arena .a-btn[data-b="action"]');
      if (b) b.textContent = type === 'horn' ? 'Horn!' : type === 'boost' ? 'Boost!' : 'Honk';
      K.hotButton('action', !!type);
    };

    // ---------------------------------------------------------------- shared game state
    const progress = ctx.load('progress', { best: {}, bestNight: 0, nights: 0 });
    const later = [];
    const after = (sec, fn) => later.push({ t: sec, fn });
    let phase = 'menu';
    let plan = [0, 1, 2, 3, 4];
    const results = [];
    let shake = 0;
    const G = {
      cars,
      byId,
      S,
      sfx,
      me: null,
      partner: null,
      active: [],
      tokens,
      balls,
      time: 0,
      elapsed: 0,
      now: 0,
      dt: 0,
      ri: 0,
      round: null,
      need: [0, 0, 0],
      playerBias: 0.7,
      teamScore: [0, 0],
      pop,
      toast,
      skill(c) {
        const r = G.ri + (plan.length === 1 ? plan[0] : 0) * 0.6;
        const base = { speed: Math.min(0.98, 0.8 + r * 0.045), aim: 0.35 + r * 0.13, block: 0.1 + r * 0.16, turn: 2.7 + r * 0.18 };
        if (c === G.me) return dbg.autoSkill || { speed: 1, aim: 0.9, block: 0.5, turn: 3.6 };
        if (c.d.mascot) base.speed = Math.min(0.99, base.speed + 0.02);
        return base;
      },
      weight: (c, o) => (G.round.weight ? G.round.weight(G, c, o) : 1),
      friend: (c, o) => !!G.round?.friend?.(c, o),
      get margin() {
        return G.round?.margin ? G.round.margin(G) : 1.1;
      },
      flashCar(c, color) {
        fx.flash({ x: c.x, y: 1.2, z: c.z }, 3.2, color, 0.5);
      },
      fxHearts(c) {
        ctx.fx.heartsAt(new THREE.Vector3(c.x, 1.9, c.z), 4);
      },
      addBall(gold = false) {
        const b = balls.find((x) => !x.on);
        if (!b) return;
        Object.assign(b, { on: true, gold, x: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 4, y: 3.2, vx: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 2, vy: 0, last: null, wait: 0 });
        b.mesh.material = gold ? ballMats.gold : ballMats.plain;
        b.mesh.visible = true;
        b.mesh.scale.setScalar(gold ? 1.12 : 1);
      },
      hitLight(v, by, at) {
        // after losing a light a car is safe for a moment (its lights blink)
        if (!v.alive || !v.active || (v.safeT || 0) > G.now) return;
        v.safeT = G.now + 2.6;
        v.lights = Math.max(0, v.lights - 1);
        fx.spark({ x: v.x, y: 0.8, z: v.z }, 14, { color: ['#ff9eb5', '#fff3c4'], speed: 2.4, up: 1.2, life: 0.5 });
        if (v === G.me && v.lights > 0) pop(v.lights === 1 ? 'Last light! Careful!' : 'A light went out', v, '#ffd1dc', true);
        if (v.lights > 0) return;
        v.alive = false;
        v.outT = 0;
        G.outOrder.push(v);
        sfx.powerDown();
        S.crowd.cheer(0.8);
        K.sfx.cheer(ctx.sound, 0.035, 0.9);
        gesture(v, 'shrug', 2.2);
        const tip = tipOf(v);
        fx.spark(tip, 24, { color: ['#c7e9ff', '#ffffff'], speed: 2, up: 0.4, life: 0.8 });
        if (v === G.me) {
          ctx.hud.message('Out!', 1200);
        } else pop(`${v.name} is out!`, v, '#ffffff', by === G.me);
        if (by === G.me) G.me.score++;
        // Homama keeps Roji company once her car stops
        const h = byId.homama;
        if (v.id === 'roji' && h.alive && h.active && h !== G.me) {
          h.keepCompany = true;
          after(0.8, () => toast(`${G.me === v ? 'You are out.' : 'Roji is out.'} Homama drives over to keep her company.`, 3200));
        } else if (v.id === 'roji' && G.me === byId.homama && h.alive) {
          after(0.6, () => {
            gesture(v, 'cheer', 2.5);
            toast('Roji waves from her car: "Go, Homama!"', 2800);
          });
        }
      },
      love(kind, ev) {
        const h = byId.homama;
        const r = byId.roji;
        if (!h.active || !r.active) return;
        G.loved = G.loved || {};
        if (kind === 'tap') {
          if (G.now - (G.loved.tap || -9) < 5) return;
          G.loved.tap = G.now;
          G.fxHearts({ x: (h.x + r.x) / 2, z: (h.z + r.z) / 2 });
          pop('Love tap!', ev, '#ffd1dc', true);
          return;
        }
        if (G.loved[kind]) return;
        G.loved[kind] = true;
        if (kind === 'kiss') {
          gesture(h, 'kiss', 1.6);
          after(0.5, () => G.fxHearts(h));
          after(1.0, () => G.fxHearts(r));
          after(0.4, () => toast('Homama blows Roji a kiss across the floor.', 2800));
        } else if (kind === 'sorry') {
          gesture(h, 'kiss', 1.6);
          pop('Sorry, love!', h, '#ffd1dc', true);
          after(0.5, () => G.fxHearts(h));
        } else if (kind === 'rescue') {
          pop('Homama to the rescue!', h, '#8fd3ff', true);
          gesture(h, 'cheer', 1.2);
          after(0.4, () => toast(`${ev.name} bumped Roji. Homama is coming for ${ev.name === 'Mimi' ? 'her' : 'him'}!`, 2600));
        }
      },
    };

    // ---------------------------------------------------------------- driver gestures
    const gesture = (c, type, dur = 1.2) => {
      c.gest = { type, t: 0, dur };
    };
    const tipOf = (c) => ({ x: c.x - Math.sin(c.yaw) * 0.8, y: GRID_Y, z: c.z - Math.cos(c.yaw) * 0.8 });
    const local = (c, lx, ly, lz, out) => out.set(c.x + Math.cos(c.yaw) * lx + Math.sin(c.yaw) * lz, ly, c.z - Math.sin(c.yaw) * lx + Math.cos(c.yaw) * lz);
    const tmp = new THREE.Vector3();
    const m4 = new THREE.Matrix4();
    const q4 = new THREE.Quaternion();
    const v3 = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    const col = new THREE.Color();

    function animateDriver(c, dt, t) {
      if (c.kid) c.kid.update(dt, t, 0, 0, 0);
      const arms = c.arms;
      const steerK = Math.max(-1, Math.min(1, (c.steerRate || 0) * 0.4));
      if (c.mascot && arms) {
        arms[0].rotation.set(-1.15, 0, 0.12);
        arms[1].rotation.set(-1.15, 0, -0.12);
      }
      if (arms) {
        arms[0].rotation.x += steerK * 0.22;
        arms[1].rotation.x -= steerK * 0.22;
      }
      const head = c.head;
      const g = c.gest;
      let hx = 0;
      let hy = -steerK * 0.25;
      let hz = 0;
      if (c.dizzy > 0) {
        hz = Math.sin(t * 11) * 0.22 * Math.min(1, c.dizzy * 2);
        hx = Math.cos(t * 11) * 0.12 * Math.min(1, c.dizzy * 2);
      }
      let mouth = 0;
      if (g) {
        g.t += dt;
        const u = g.t / g.dur;
        const env2 = Math.min(1, g.t * 5, (g.dur - g.t) * 5);
        if (arms) {
          const [L, R] = arms;
          if (g.type === 'cheer') {
            L.rotation.set(-0.3, 0, 0.6 + env2 * (1.9 + Math.sin(t * 14) * 0.3));
            R.rotation.set(-0.3, 0, -0.6 - env2 * (1.9 + Math.sin(t * 14 + 1) * 0.3));
            mouth = env2;
          } else if (g.type === 'wave') {
            R.rotation.set(-0.2, 0, -0.4 - env2 * (2.1 + Math.sin(t * 12) * 0.4));
          } else if (g.type === 'kiss') {
            if (u < 0.45) R.rotation.set(-2.5 * env2, 0, 0.45 * env2);
            else R.rotation.set(-1.6, 0, -0.9 * env2);
            hy = 0;
          } else if (g.type === 'shrug') {
            L.rotation.set(-0.5, 0, 0.9 * env2);
            R.rotation.set(-0.5, 0, -0.9 * env2);
            hz = Math.sin(t * 2) * 0.15 * env2;
          } else if (g.type === 'hold') {
            const side = c.holdSide || 1;
            const arm = side > 0 ? L : R;
            arm.rotation.set(-0.25 * env2, 0, side * 1.5 * env2);
          }
        }
        if (g.type === 'laugh') {
          mouth = env2;
          hx = -0.18 * env2 + Math.sin(t * 18) * 0.05 * env2;
        }
        if (g.t >= g.dur && g.type !== 'hold') c.gest = null;
      }
      if (head) {
        head.rotation.x += (hx - head.rotation.x) * Math.min(1, dt * 10);
        head.rotation.y += (hy - head.rotation.y) * Math.min(1, dt * 6);
        head.rotation.z += (hz - head.rotation.z) * Math.min(1, dt * 10);
      }
      if (c.mouth) c.mouth.scale.set(1 + mouth * 0.3, 1 + mouth * 1.1, 1);
      // Bobo's top hat pops up on a big bump and lands again
      if (c.hat) {
        c.hatV -= 22 * dt;
        c.hatY = Math.max(0, c.hatY + c.hatV * dt);
        if (c.hatY === 0) c.hatV = 0;
        c.hat.position.y = 0.3 + c.hatY;
        c.hat.rotation.z = -0.12 + c.hatY * 1.4;
      }
      if (!c.kid && !c.mascot) {
        // a baked visitor: the whole body sways
        c.seat.rotation.z = hz * 0.6 - steerK * 0.08;
      }
      // where the head is, for the dizzy stars
      local(c, 0, 1.38, -0.22, c.headPos);
    }

    function updateCarVisual(c, dt, t) {
      c.root.position.set(c.x, 0, c.z);
      c.root.rotation.y = c.yaw;
      c.tvx += (-c.tiltX * 70 - c.tvx * 8) * dt;
      c.tvz += (-c.tiltZ * 70 - c.tvz * 8) * dt;
      c.tiltX += c.tvx * dt;
      c.tiltZ += c.tvz * dt;
      const accel = (c.thr - (c.prevThr || 0)) / Math.max(dt, 1e-3);
      c.prevThr = c.thr;
      c.tilt.rotation.set(c.tiltX - Math.max(-0.06, Math.min(0.06, accel * 0.01)), 0, c.tiltZ + Math.max(-0.08, Math.min(0.08, (c.steerRate || 0) * c.speed * 0.012)));
      c.sqv += ((1 - c.sq) * 160 - c.sqv * 11) * dt;
      c.sq += c.sqv * dt;
      const w = 1 + (1 - c.sq) * 0.55;
      c.tilt.scale.set(w, c.sq, w);
      c.seat.position.y = 0.3 + Math.abs(Math.sin(t * 9 + c.i)) * 0.012 * Math.min(1, c.speed / 2);
      c.tilt.position.y = 0;
    }

    const impact = (c, nx, nz, power) => {
      // tip the car away from the hit and squash it
      const fx2 = Math.sin(c.yaw);
      const fz2 = Math.cos(c.yaw);
      const along = nx * fx2 + nz * fz2;
      const side = nx * fz2 - nz * fx2;
      const k = Math.min(1.6, power * 0.32);
      c.tvx += -along * k * 2.2;
      c.tvz += side * k * 2.2;
      c.sqv -= k * 2.2;
    };

    // ---------------------------------------------------------------- collisions and their effects
    const cool = new Map();
    function onEvent(ev) {
      if (!ev || ev.quiet) return;
      const { a, b, kind, power } = ev;
      const R = G.round;
      const playing = phase === 'play';
      const nx0 = b.x - a.x;
      const nz0 = b.z - a.z;
      const nl = Math.hypot(nx0, nz0) || 1;
      if (kind === 'touch') {
        if (power > 1.2) {
          sfx.thump(power / 3);
          impact(a, -nx0 / nl, -nz0 / nl, power * 0.5);
          impact(b, nx0 / nl, nz0 / nl, power * 0.5);
        }
        if (playing) R.onContact?.(G, ev);
        // computer drivers that just lean on each other give up and come round again
        if (power > 0.6) for (const [c, o] of [[a, b], [b, a]]) if ((c !== G.me || dbg.auto) && Math.random() < 0.2) backOff(c, o, 0.5);
        return;
      }
      sfx.bonk(power / 4);
      impact(a, -nx0 / nl, -nz0 / nl, power);
      impact(b, nx0 / nl, nz0 / nl, power);
      const at = { x: ev.x, y: 0.55, z: ev.z };
      fx.spark(at, 8 + Math.min(14, power * 3), { color: ['#fff3c4', '#ffd166', '#ffffff'], speed: 2.4 + power * 0.4, up: 1.0, life: 0.5, size: 0.14 });
      fx.flash(at, 1.1 + Math.min(1.2, power * 0.18), '#a89060', 0.22);
      // the ceiling grid crackles above the bump
      fx.spark({ x: ev.x, y: GRID_Y, z: ev.z }, 6 + Math.min(14, power * 2.5), { color: ['#c7e9ff', '#ffffff', '#ffd166'], speed: 2, up: 0.3, life: 0.7, size: 0.15 });
      fx.flash({ x: ev.x, y: GRID_Y, z: ev.z }, 1.2, '#7f93c0', 0.3);
      sfx.crackle(0.8);
      if (G.me === a || G.me === b) shake = Math.max(shake, Math.min(0.45, power * 0.06));
      if (kind === 'clonk' || kind === 'block') {
        for (const [c, o] of [[a, b], [b, a]]) if ((c !== G.me || dbg.auto) && Math.random() < 0.7) backOff(c, o, 0.5 + Math.random() * 0.4);
      }
      if (kind === 'clonk') {
        sfx.clonk();
        if (playing && (a === G.me || b === G.me)) pop('Clonk!', ev, '#c7e9ff');
      } else if (kind === 'block') {
        if (playing && b === G.me) pop('Blocked!', ev, '#c7e9ff', true);
        else if (playing && a === G.me) pop('Blocked!', ev, '#c7e9ff');
      } else {
        // a real bump
        S.crowd.cheer(kind === 'mega' ? 1 : 0.6);
        if (Math.random() < 0.6) sfx.giggle(b.d.laugh);
        gesture(b, b.d.mascot && Math.random() < 0.5 ? 'cheer' : 'laugh', 0.9);
        if (Math.random() < 0.45) gesture(a, 'cheer', 0.8);
        if (b.hat && (kind === 'mega' || power > 3.5)) {
          b.hatV = 5.5;
          sfx.boing(380);
        }
        if (b.d.mascot && Math.random() < 0.4) sfx.boing(b.d.laugh * 0.5);
        if (a !== G.me || dbg.auto) backOff(a, b, 0.6 + Math.random() * 0.4);
        if (b !== G.me && Math.random() < 0.45) {
          b.ai.revenge = a;
          b.ai.timer = 2.5;
        }
        if (playing && b.id === 'roji' && a.id !== 'homama' && !R.team && G.ri >= 0) G.love('kiss');
      }
      if (playing) {
        R.onContact?.(G, ev);
        R.onBump?.(G, ev);
      }
      if (kind === 'bump' || kind === 'mega') {
        b.lastBy = a;
        b.lastByT = G.now;
      }
    }

    function horn(c) {
      sfx.megaHorn();
      fx.ring(c, 4.6, '#ffe08a');
      fx.flash({ x: c.x, y: 1, z: c.z }, 3.5, '#ffe08a', 0.4);
      if (c === G.me) shake = 0.35;
      gesture(c, 'cheer', 0.9);
      const hit = [];
      for (const o of G.active) {
        if (o === c || G.friend(c, o)) continue;
        const dx = o.x - c.x;
        const dz = o.z - c.z;
        const d = Math.hypot(dx, dz);
        if (d > 4.8 || d < 1e-3) continue;
        const push = 6.5 * (1 - d / 5.4) + 2.6;
        o.vx += (dx / d) * push;
        o.vz += (dz / d) * push;
        o.spin += (Math.random() - 0.5) * 7;
        o.dizzy = Math.max(o.dizzy, 0.7);
        impact(o, dx / d, dz / d, push);
        gesture(o, 'laugh', 0.8);
        if (o.alive) hit.push(o);
        o.lastBy = c;
        o.lastByT = G.now;
      }
      for (const b of balls) {
        if (!b.on) continue;
        const dx = b.x - c.x;
        const dz = b.z - c.z;
        const d = Math.hypot(dx, dz);
        if (d > 5 || d < 1e-3) continue;
        const push = 9 * (1 - d / 5.6) + 3;
        b.vx += (dx / d) * push;
        b.vz += (dz / d) * push;
        b.vy = 3.5;
        b.last = c;
      }
      if (hit.length) S.crowd.cheer(1);
      if (phase === 'play') G.round.onHorn?.(G, c, hit);
    }

    function useItem(c) {
      const it = c.item;
      if (!it) return false;
      c.item = null;
      if (c === G.me) setItem(null);
      if (it === 'horn') horn(c);
      else {
        c.boost = 2.2;
        sfx.whoosh();
        fx.flash({ x: c.x, y: 0.8, z: c.z }, 2.4, '#ffb347', 0.35);
        if (c === G.me) pop('Boost!', c, '#ffb347', true);
      }
      return true;
    }

    // ---------------------------------------------------------------- rounds
    function formation(R) {
      const spots = R.start(G);
      const order = [G.me, G.partner, ...R.cars.map((id) => byId[id]).filter((c) => c !== G.me && c !== G.partner)];
      return order.map((c, i) => ({ c, ...spots[i] }));
    }

    function beginRound(ri) {
      if (disposed) return;
      G.ri = ri;
      const R = ROUNDS[plan[ri]];
      G.round = R;
      G.need = R.need || [0, 0, 0];
      G.playerBias = Math.min(1, 0.65 + ri * 0.1);
      for (const c of cars) {
        c.active = false;
        c.root.visible = false;
        c.keepCompany = false;
        c.safeT = 0;
        c.it = false;
        c.team = null;
        c.itTime = 0;
        c.outT = 0;
        c.gest = null;
      }
      for (const { c, x, z, yaw } of formation(R)) {
        newBody(c, x, z, yaw);
        c.active = true;
        c.root.visible = true;
      }
      G.active = cars.filter((c) => c.active);
      cool.clear();
      for (const t of tokens) {
        t.on = false;
        t.sp.visible = false;
      }
      tokenT = 4;
      setItem(null);
      for (const b of balls) {
        b.on = false;
        b.mesh.visible = false;
      }
      for (const g of S.goals) g.group.visible = !!R.balls;
      for (let i = 0; i < (R.balls || 0); i++) {
        G.addBall(false);
        const b = balls[i];
        b.x = -2.6 + i * 2.6;
        b.z = 0;
        b.y = 0;
        b.vx = b.vz = 0;
      }
      S.floorFx.darkAt = 0;
      G.time = R.time;
      G.elapsed = 0;
      G.goldDone = false;
      G.meOutT = 0;
      G.rescued = false;
      G.teamScore = [0, 0];
      G.outOrder = [];
      R.setup?.(G);
      boardDirty = true;
      phase = 'intro';
      hud.score('');
      boardEl.innerHTML = '';
      S.drawBoard({ title: `Round ${ri + 1}: ${R.name}`, sub: R.team ? 'Roji and Homama vs Mimi and Bobo' : 'Get ready to bump', rows: rowsFor(), time: fmt(R.time) });
      for (const c of G.active) if (Math.random() < 0.6) gesture(c, 'wave', 1.4 + Math.random());
      const go = () => {
        if (disposed || G.round !== R || phase !== 'intro') return;
        countdown();
      };
      if (dbg.auto) after(0.3, go);
      else {
        hud
          .choose({
            title: `Round ${ri + 1} of ${plan.length}: ${R.name}`,
            text: R.goal(G),
            options: [{ id: 'go', label: ri === 0 ? "Let's bump!" : 'Go!' }],
          })
          .then(go);
      }
    }

    function countdown() {
      phase = 'count';
      const n = dbg.auto ? 1 : 3;
      for (let i = 0; i < n; i++) {
        after(i * 0.8, () => {
          hud.message(String(n - i), 700);
          sfx.tick();
          for (const c of G.active) fx.spark(tipOf(c), 4, { color: ['#fff3c4', '#c7e9ff'], speed: 1.5, life: 0.5 });
        });
      }
      after(n * 0.8, () => {
        if (phase !== 'count') return;
        hud.message('Go!', 700);
        ctx.sound?.ui('good');
        sfx.honkAll?.();
        phase = 'play';
        sfx.startMusic(1 + G.ri * 0.04);
        S.floorFx.flash(G.me.color);
        tagTime = 2.6;
      });
    }

    const fmt = (s) => {
      s = Math.max(0, Math.ceil(s));
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };
    function rowsFor() {
      const R = G.round;
      if (!R?.board) return [];
      return R.board(G).map((r) => ({ name: r.c.name, color: r.c.color, score: String(r.score).replace(/&#9679;/g, 'o'), out: r.out }));
    }
    let boardDirty = true;
    let boardT = 0;
    let lastBoardHtml = '';
    function updateBoard(dt) {
      boardT -= dt;
      const R = G.round;
      if (!R || (phase !== 'play' && phase !== 'post')) return;
      hud.score(`${R.hud(G)} &nbsp;<span style="color:#9a8890">${fmt(G.time)}</span>`);
      const rows = R.board(G);
      const html = rows
        .slice()
        .sort((x, y) => (typeof y.score === 'number' && typeof x.score === 'number' ? y.score - x.score : 0))
        .map((r) => `<div class="${r.c === G.me ? 'me' : ''} ${r.out ? 'out' : ''} ${r.glow ? 'glow' : ''}"><i style="background:${r.c.color}"></i>${r.c.name}<b>${r.score}</b></div>`)
        .join('');
      if (html !== lastBoardHtml) {
        boardEl.innerHTML = html;
        lastBoardHtml = html;
      }
      if (boardT <= 0 || boardDirty) {
        boardT = 1;
        boardDirty = false;
        const sub = R.id === 'team' ? `Us ${G.teamScore[0]} : ${G.teamScore[1]} Mimi and Bobo` : R.name;
        S.drawBoard({ title: `Round ${G.ri + 1} of ${plan.length}`, sub, rows: rowsFor(), time: fmt(G.time) });
      }
    }

    function endRound() {
      if (phase !== 'play') return;
      phase = 'post';
      const R = G.round;
      sfx.stopMusic();
      const res = R.result(G);
      results[G.ri] = { id: R.id, name: R.name, stars: res.stars };
      dbg.log.push({ round: R.id, stars: res.stars, me: G.me.id, took: +G.elapsed.toFixed(1), scores: G.active.map((c) => `${c.id}:${R.id === 'tag' ? c.itTime.toFixed(1) : R.id === 'last' ? (c.alive ? c.lights : 'out') : c.score}`).join(' '), team: R.team ? G.teamScore.join(':') : undefined });
      progress.best[R.id] = Math.max(progress.best[R.id] || 0, res.stars);
      ctx.save('progress', progress);
      hud.message(R.id === 'last' && G.active.filter((c) => c.alive).length <= 1 ? 'Done!' : 'Time!', 1000);
      sfx.tick();
      S.drawBoard({ title: `Round ${G.ri + 1} of ${plan.length}`, sub: `${R.name}: ${res.stars} of 3 stars`, rows: rowsFor(), time: '0:00' });
      after(1.1, () => {
        showRes(`<h3>${R.name}</h3><div class="bc-big">${stars(res.stars)}</div><p>${res.text}</p>`, 2900);
        ctx.sound?.ui(res.stars > 0 ? 'win' : 'lose');
        if (res.stars > 0) ctx.fx.burst(new THREE.Vector3(G.me.x, 1.6, G.me.z), ['#ffd166', '#ff9eb5', '#8fd3ff', '#ffffff'], 40 + res.stars * 20);
        gesture(G.me, res.stars > 0 ? 'cheer' : 'shrug', 1.8);
        gesture(G.partner, 'cheer', 1.8);
        S.crowd.cheer(1);
        K.sfx.cheer(ctx.sound, 0.05, 1.4);
      });
      after(4.3, () => (G.ri + 1 < plan.length ? beginRound(G.ri + 1) : finale()));
    }

    function finale() {
      if (disposed) return;
      phase = 'final';
      hud.score('');
      boardEl.innerHTML = '';
      for (const t of tokens) {
        t.on = false;
        t.sp.visible = false;
      }
      for (const b of balls) {
        b.on = false;
        b.mesh.visible = false;
      }
      for (const g of S.goals) g.group.visible = false;
      S.floorFx.darkAt = 0;
      const r = byId.roji;
      const h = byId.homama;
      for (const c of cars) {
        c.active = c === r || c === h;
        c.root.visible = c.active;
        c.it = false;
        c.team = null;
      }
      G.active = [r, h];
      for (const c of G.active) {
        c.alive = true;
        c.dizzy = 0;
        c.boost = 0;
        c.gest = null;
      }
      G.final = { t: 0, from: G.active.map((c) => ({ x: c.x, z: c.z, yaw: c.yaw })) };
      const total = results.reduce((s, x) => s + (x?.stars || 0), 0);
      const of = plan.length * 3;
      const whole = plan.length === 5;
      if (whole) {
        progress.nights = (progress.nights || 0) + 1;
        progress.bestNight = Math.max(progress.bestNight || 0, total);
      }
      ctx.save('progress', progress);
      const lines = [
        'Homama says Roji is the best driver in Roji Land. Roji says he only says that because she bumped him the most.',
        'Roji and Homama park side by side and hold hands across the cars.',
        'Homama wins Roji a little Mimi plush at the stall on the way out.',
      ];
      const line = lines[(progress.nights || 0) % lines.length];
      after(1.6, () => {
        r.holdSide = 1;
        h.holdSide = -1;
        gesture(r, 'hold', 99);
        gesture(h, 'hold', 99);
        G.fxHearts({ x: 0, z: 1.3 });
        S.crowd.cheer(1);
        sfx.goal();
        ctx.fx.burst(new THREE.Vector3(0, 2.2, 1.2), ['#ff9eb5', '#ffd166', '#8fd3ff', '#c7a6ff', '#ffffff'], 120);
      });
      after(2.8, () => {
        if (disposed) return;
        phase = 'done';
        const rows = results.map((x) => `${x.name} ${stars(x.stars)}`).join('<br>');
        const best = whole ? progress.bestNight : progress.best[results[0].id] * 1;
        const title = whole ? (total >= 13 ? 'Bumper champions!' : total >= 9 ? 'What a night!' : total >= 5 ? 'So much fun!' : 'Bonk, bonk!') : results[0].stars === 3 ? 'Three stars!' : results[0].stars ? 'Well bumped!' : 'Bonk, bonk!';
        ctx.finish({
          win: total >= Math.ceil(of / 3),
          title,
          text: `<b>${total} of ${of} stars</b>${whole ? ` tonight (best ${best} of 15)` : ` (best ${best} of 3)`}.<br><span style="font-size:.9em">${rows}</span><br>${line}`,
        });
      });
    }

    function startNight(who, pick) {
      G.me = byId[who];
      G.partner = byId[who === 'roji' ? 'homama' : 'roji'];
      ctx.hud.title('Bumper Cars', `${nameOf(who)} drives`);
      plan = pick === 'all' || pick == null ? [0, 1, 2, 3, 4] : [+pick];
      results.length = 0;
      beginRound(0);
    }

    // ---------------------------------------------------------------- the opening cards
    setTimeout(async () => {
      if (disposed) return;
      if (dbg.auto) {
        startNight(dbg.who || ctx.me, dbg.pick || 'all');
        return;
      }
      const first = ctx.me;
      const other = first === 'roji' ? 'homama' : 'roji';
      const who = await hud.choose({
        title: 'Who drives tonight?',
        text: 'Five rounds under the big top: a bump party, bumper tag, beach ball goals, last car moving and a team round against Mimi and Bobo.',
        options: [
          { id: first, label: `${nameOf(first)} drives`, sub: `${nameOf(other)} drives the ${other === 'roji' ? 'pink' : 'blue'} car` },
          { id: other, label: `${nameOf(other)} drives`, sub: `${nameOf(first)} drives the ${first === 'roji' ? 'pink' : 'blue'} car` },
        ],
      });
      if (disposed) return;
      let pick = 'all';
      const played = ROUNDS.some((r) => progress.best[r.id] != null);
      if (played) {
        pick = await hud.choose({
          title: 'What shall we play?',
          text: '',
          options: [
            { id: 'all', label: 'The whole night', sub: progress.nights ? `5 rounds, best ${progress.bestNight} of 15 stars` : '5 rounds in a row' },
            ...ROUNDS.map((r, i) => ({ id: String(i), label: r.name, sub: progress.best[r.id] != null ? `Best ${progress.best[r.id]} of 3 stars` : 'Not played yet' })),
          ],
        });
        if (disposed) return;
      }
      startNight(who || first, pick || 'all');
    }, 350);

    // ---------------------------------------------------------------- debug and test hook
    const dbg = {
      auto: !!window.__bumpercarsAuto,
      speed: window.__bumpercarsSpeed || 1,
      who: window.__bumpercarsWho || null,
      pick: window.__bumpercarsPick ?? null,
      log: [],
      autoSkill: window.__bumpercarsSkill || null,
      state: () => ({
        phase,
        round: G.round?.id,
        ri: G.ri,
        plan,
        time: +G.time.toFixed(1),
        me: G.me && { id: G.me.id, score: G.me.score, lights: G.me.lights, alive: G.me.alive, it: G.me.it, itTime: +(G.me.itTime || 0).toFixed(1), item: G.me.item, x: +G.me.x.toFixed(2), z: +G.me.z.toFixed(2) },
        team: G.teamScore,
        cars: G.active.map((c) => ({ id: c.id, score: c.score, alive: c.alive, lights: c.lights, it: c.it })),
        results: results.map((r) => r && r.stars),
        balls: balls.filter((b) => b.on).length,
        tokens: tokens.filter((t) => t.on).map((t) => t.type),
        loved: G.loved,
      }),
      endRound: () => {
        G.time = 0.01;
      },
      give: (type) => setItem(type),
      gesture: (id, type, dur) => gesture(byId[id], type, dur),
      love: (kind) => G.love(kind, byId.mimi),
      tp: (x, z) => {
        G.me.x = x;
        G.me.z = z;
      },
    };
    window.__bumpercars = dbg;

    // ---------------------------------------------------------------- camera
    const camPos = new THREE.Vector3(0, 8, 18);
    const camLook = new THREE.Vector3(0, 1.4, -4);
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    let tagTime = 0;
    let honkCd = 0;
    let crackleT = 0;

    function updateCamera(dt, t) {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const wide = W / H > 1.85;
      if (phase === 'play' || phase === 'count' || phase === 'post') {
        const me = G.me;
        const px = me.x + me.vx * 0.3;
        const pz = me.z + me.vz * 0.3;
        const tx = Math.max(-3.2, Math.min(3.2, px * 0.5));
        const tz = Math.max(-2.2, Math.min(2.4, 0.4 + pz * 0.45));
        wantLook.set(tx, 0, tz - 0.6);
        if (wide) wantPos.set(tx, 13.2, tz + 9.4);
        else wantPos.set(tx, 13.5, tz + 11.2);
      } else if (phase === 'final' || phase === 'done') {
        // the two cars sit low in the frame, below the result card
        wantLook.set(0, wide ? 1.1 : 2.3, 0.6);
        wantPos.set(0, wide ? 3.0 : 2.9, wide ? 7.2 : 8.2);
      } else {
        wantLook.set(Math.sin(t * 0.15) * 1.2, 1.4, -3.5);
        wantPos.set(Math.sin(t * 0.15) * 3, 7.2, wide ? 15.5 : 17.5);
      }
      const k = 1 - Math.exp(-(phase === 'play' ? 4 : 1.6) * dt);
      camPos.lerp(wantPos, k);
      camLook.lerp(wantLook, k);
      shake = Math.max(0, shake - dt * 1.4);
      camera.position.copy(camPos);
      if (shake > 0) camera.position.add(v3.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake));
      camera.lookAt(camLook);
      env.follow(tmp.set(0, 0, -1));
    }

    // ---------------------------------------------------------------- per-frame work
    function readPlayer() {
      const ax = input.axis();
      const mag = Math.min(1, Math.hypot(ax.x, ax.y));
      if (mag < 0.15) return { dx: 0, dz: 0, thr: 0 };
      return { dx: ax.x / mag, dz: -ax.y / mag, thr: mag };
    }

    function spawnToken() {
      const free = tokens.find((t) => !t.on);
      if (!free || tokens.filter((t) => t.on).length >= 2) return;
      for (let tries = 0; tries < 20; tries++) {
        const x = (Math.random() - 0.5) * (HW * 2 - 4);
        const z = (Math.random() - 0.5) * (HD * 2 - 4);
        if (inset(x, z) < 2) continue;
        if (G.active.some((c) => Math.hypot(c.x - x, c.z - z) < 2.5)) continue;
        if (G.round.balls && Math.abs(x) > GOAL.x - 1.5) continue;
        const type = Math.random() < (G.round.balls ? 0.6 : 0.5) ? 'horn' : 'boost';
        Object.assign(free, { on: true, type, x, z, t: 0 });
        free.sp.material.map = TOK[type];
        free.sp.material.needsUpdate = true;
        free.sp.visible = true;
        fx.spark({ x, y: 0.8, z }, 12, { color: ['#ffd166', '#ffffff'], speed: 2, up: 1.4, life: 0.6 });
        return;
      }
    }

    function stepPlay(dt, t) {
      const R = G.round;
      const playing = phase === 'play';
      G.dt = dt;
      if (playing) {
        G.time -= dt;
        G.elapsed += dt;
        G.now += dt;
        R.update?.(G, dt);
        tokenT -= dt;
        if (R.tokens && tokenT <= 0) {
          tokenT = 4.5 + Math.random() * 3;
          spawnToken();
        }
        if (G.time <= 0 || R.over?.(G)) endRound();
      }
      // drive every car
      for (const c of G.active) {
        let ctl;
        if (!playing) ctl = { dx: 0, dz: 0, thr: 0 };
        else if (c === G.me && !dbg.auto) ctl = readPlayer();
        else ctl = R.brain(c, G, dt);
        const sk = G.skill(c);
        const prevYaw = c.yaw;
        c.slow = S.floorFx.isDark(c.x, c.z) ? 0.5 : 1;
        stepCar(c, ctl, dt, { turn: c === G.me ? 3.7 : sk.turn });
        c.steerRate = (((c.yaw - prevYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI) / Math.max(dt, 1e-3);
        // computer drivers use their power-ups when it pays
        if (playing && c.item && (c !== G.me || dbg.auto)) {
          const near = G.active.filter((o) => o !== c && o.alive && !G.friend(c, o) && Math.hypot(o.x - c.x, o.z - c.z) < 3.2).length;
          const tgt = c.ai.target;
          const ahead = tgt && Math.hypot(tgt.x - c.x, tgt.z - c.z) < 6 && (Math.sin(c.yaw) * (tgt.x - c.x) + Math.cos(c.yaw) * (tgt.z - c.z)) / Math.hypot(tgt.x - c.x, tgt.z - c.z) > 0.9;
          if ((c.item === 'horn' && (near >= 2 || (near >= 1 && Math.random() < dt * 0.8))) || (c.item === 'boost' && (ahead || c.it === false && G.round.id === 'tag' && Math.random() < dt))) useItem(c);
        }
        if (!c.alive) c.outT = (c.outT || 0) + dt;
        // a computer car pressed against a rail or a pile of cars for a second backs out
        if (playing && c.alive && (c !== G.me || dbg.auto) && !c.keepCompany) {
          c.stuckT = ctl.thr > 0.4 && c.speed < 0.7 ? (c.stuckT || 0) + dt : 0;
          if (c.stuckT > 0.9) {
            c.stuckT = 0;
            backOff(c, { x: c.x * 1.3 + Math.sin(c.yaw), z: c.z * 1.3 + Math.cos(c.yaw) }, 0.7);
          }
        }
      }
      // the player's honk or power-up
      honkCd -= dt;
      if (playing && !dbg.auto && (input.pressed('action') || input.pressed('jump'))) {
        if (!useItem(G.me) && honkCd <= 0) {
          honkCd = 0.4;
          sfx.beep(G.me.id === 'roji' ? 1.2 : 1);
          pop('Meep meep!', G.me, '#ffffff');
          for (const o of G.active) if (o !== G.me && Math.hypot(o.x - G.me.x, o.z - G.me.z) < 4 && Math.random() < 0.5) gesture(o, 'laugh', 0.6);
        }
      }
      // collisions
      for (let i = 0; i < G.active.length; i++) {
        for (let j = i + 1; j < G.active.length; j++) onEvent(carHit(G.active[i], G.active[j], G.now, cool));
      }
      for (const c of G.active) {
        const hit = wallBounce(c, CR, 0.72);
        if (hit > 1.5) {
          S.rails.hit(c.x * 1.04, c.z * 1.04, hit / 4);
          sfx.thump(hit / 4);
          impact(c, c.x > 0 ? 1 : -1, 0, hit * 0.6);
          if (hit > 3) fx.spark({ x: c.x, y: 0.5, z: c.z }, 6, { color: ['#fff3c4', '#ffd166'], speed: 2, life: 0.4 });
        }
      }
      // balls
      for (const b of balls) {
        if (!b.on) continue;
        if (b.wait > 0) {
          b.wait -= dt;
          continue;
        }
        stepBall(b, dt);
        for (const c of G.active) {
          const k = ballHit(b, c);
          if (k > 0.3) {
            b.last = c;
            if (k > 2) sfx.boing(240 + Math.random() * 60);
          }
        }
        for (const o of balls) {
          if (o === b || !o.on) continue;
          const dx = o.x - b.x;
          const dz = o.z - b.z;
          const d = Math.hypot(dx, dz);
          if (d < BR * 2 && d > 1e-4) {
            const nx = dx / d;
            const nz = dz / d;
            const pen = (BR * 2 - d) / 2;
            b.x -= nx * pen;
            b.z -= nz * pen;
            o.x += nx * pen;
            o.z += nz * pen;
            const rel = (b.vx - o.vx) * nx + (b.vz - o.vz) * nz;
            if (rel > 0) {
              b.vx -= nx * rel;
              b.vz -= nz * rel;
              o.vx += nx * rel;
              o.vz += nz * rel;
            }
          }
        }
        // a goal?
        if (Math.abs(b.x) > GOAL.x && Math.abs(b.z) < GOAL.hz) {
          const g = S.goals.find((x) => x.side === Math.sign(b.x));
          g.flash = 1.4;
          sfx.goal();
          S.crowd.cheer(1);
          K.sfx.cheer(ctx.sound, 0.05, 1.2);
          ctx.fx.burst(new THREE.Vector3(g.side * (HW - 0.6), 2.4, 0), [g.color, '#ffd166', '#ffffff'], 60);
          fx.flash({ x: b.x, y: 1, z: b.z }, 3, '#a08a40', 0.5);
          S.floorFx.flash(g.color);
          if (phase === 'play') G.round.onGoal?.(G, b, b.last);
          if (b.last) gesture(b.last, 'cheer', 1.4);
          b.on = false;
          b.mesh.visible = false;
          const gold = b.gold;
          if (!gold) {
            after(1.4, () => {
              if (phase === 'play' && G.round.balls) {
                G.addBall(false);
                pop('A new ball!', { x: 0, z: 0 }, '#ffffff');
              }
            });
          }
          continue;
        }
        const hw = wallBounce(b, BR, 0.82);
        if (hw > 2) S.rails.hit(b.x * 1.04, b.z * 1.04, hw / 6);
        b.mesh.position.set(b.x, BR + b.y, b.z);
        const sp = Math.hypot(b.vx, b.vz);
        if (sp > 0.01) {
          v3.set(b.vz, 0, -b.vx).normalize();
          q4.setFromAxisAngle(v3, (sp * dt) / BR);
          b.mesh.quaternion.premultiply(q4);
        }
      }
      // power-up tokens
      for (const tk of tokens) {
        if (!tk.on) continue;
        tk.t += dt;
        tk.sp.position.set(tk.x, 0.95 + Math.sin(tk.t * 3) * 0.12, tk.z);
        tk.sp.scale.setScalar(Math.min(1, tk.t * 4) * 0.95);
        fx.glow({ x: tk.x, y: 0.95, z: tk.z }, 1.9, tk.type === 'horn' ? '#ffd166' : '#ff9a3c', 0.55 + Math.sin(tk.t * 6) * 0.15);
        for (const c of G.active) {
          if (!c.alive || c.item || Math.hypot(c.x - tk.x, c.z - tk.z) > CR + 0.45) continue;
          tk.on = false;
          tk.sp.visible = false;
          c.item = tk.type;
          sfx.pickup();
          fx.spark({ x: tk.x, y: 0.9, z: tk.z }, 16, { color: ['#ffd166', '#ffffff'], speed: 2.4, up: 1.2, life: 0.6 });
          if (c === G.me) {
            setItem(tk.type);
            pop(tk.type === 'horn' ? 'A big horn!' : 'A boost!', c, '#ffd166', true);
          }
          break;
        }
      }
      // sparks, glows and floor lights for every car
      crackleT -= dt;
      for (const c of G.active) {
        const tip = tipOf(c);
        if (c.alive) {
          c.sparkAcc += dt * (1.2 + c.speed * 3.2 + (c.boost > 0 ? 14 : 0));
          while (c.sparkAcc >= 1) {
            c.sparkAcc -= 1;
            fx.spark(tip, 1, { color: ['#fff3c4', '#ffd166', '#c7e9ff'], speed: 1.5, up: 0.15, life: 0.6, size: 0.13 });
          }
          fx.glow(tip, 0.42 + Math.random() * 0.25 + c.speed * 0.035, c.boost > 0 ? '#ffb347' : '#fff1b8', 0.7);
          if (c.speed > 0.5) S.floorFx.mark(c.x, c.z, c.boost > 0 ? '#ffb347' : c.color, 0.35 + (c.speed / MAX) * 0.6);
          if (c.boost > 0) fx.spark({ x: c.x - Math.sin(c.yaw) * 1.0, y: 0.3, z: c.z - Math.cos(c.yaw) * 1.0 }, 1, { color: ['#ffb347', '#ffd166'], speed: 1, up: 0.5, life: 0.4, size: 0.18 });
        }
        if (c === G.me && c.speed > 3 && crackleT <= 0) {
          crackleT = 0.25 + Math.random() * 0.3;
          sfx.crackle(0.5);
        }
      }
    }

    function stepFinal(dt) {
      const F = G.final;
      F.t += dt;
      const k = Math.min(1, F.t / 1.4);
      const e = k * k * (3 - 2 * k);
      const spots = [
        { x: -0.79, z: 1.3, yaw: 0.1 },
        { x: 0.79, z: 1.3, yaw: -0.1 },
      ];
      G.active.forEach((c, i) => {
        const f = F.from[i];
        const s = spots[i];
        c.x = f.x + (s.x - f.x) * e;
        c.z = f.z + (s.z - f.z) * e;
        let d = s.yaw - f.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        c.yaw = f.yaw + d * e;
        c.vx = c.vz = 0;
        c.speed = k < 1 ? 2 : 0;
        const tip = tipOf(c);
        fx.glow(tip, 0.5 + Math.random() * 0.2, '#fff1b8', 0.8);
        if (Math.random() < 0.3) fx.spark(tip, 1, { color: ['#fff3c4', '#ffd166'], speed: 1.2, life: 0.5 });
        // lean toward each other for the hand hold
        if (c.kid && c.gest?.type === 'hold') {
          c.lean = (c.lean || 0) + ((c === byId.roji ? -0.3 : 0.3) - (c.lean || 0)) * Math.min(1, dt * 3);
          c.seat.rotation.z = c.lean;
        }
      });
      if (F.t > 1.6 && Math.floor(F.t * 1.2) !== Math.floor((F.t - dt) * 1.2)) G.fxHearts({ x: 0, z: 1.25 });
    }

    function updateRings(t) {
      for (let i = 0; i < cars.length; i++) {
        const c = cars[i];
        let color = null;
        let s = 1;
        if (c.active && phase !== 'menu' && phase !== 'final' && phase !== 'done') {
          if (c.it) {
            color = '#ffb300';
            s = 1.15 + Math.sin(t * 10) * 0.08;
          } else if (c.team != null) color = c.team === 0 ? '#ff6f91' : '#7fd8bf';
          else if (c === G.me) {
            color = '#ffffff';
            s = 1 + Math.sin(t * 4) * 0.04;
          }
          if (!c.alive) color = null;
        }
        if (!color) ringMesh.setMatrixAt(i, m4.makeScale(0, 0, 0));
        else {
          q4.setFromAxisAngle(v3.set(1, 0, 0), -Math.PI / 2);
          ringMesh.setMatrixAt(i, m4.compose(tmp.set(c.x, 0.03, c.z), q4, v3.set(s, s, s)));
          ringMesh.setColorAt(i, col.set(color));
        }
        // the "it" car glows from inside too
        if (c.active && c.it && phase === 'play') {
          fx.glow({ x: c.x, y: 0.9, z: c.z }, 3.2 + Math.sin(t * 8) * 0.3, '#ffcc33', 0.5);
          if (Math.random() < 0.5) fx.spark({ x: c.x, y: 1.3, z: c.z }, 1, { color: ['#ffd166', '#ffffff'], speed: 1.2, up: 1.5, life: 0.6 });
        }
        // power lights on the rear deck (last car moving)
        const showL = c.active && G.round?.id === 'last' && phase !== 'final' && phase !== 'done';
        for (let j = 0; j < 3; j++) {
          const idx = i * 3 + j;
          if (!showL) {
            lightMesh.setMatrixAt(idx, m4.makeScale(0, 0, 0));
            continue;
          }
          local(c, (j - 1) * 0.36, 0.78, -0.74, tmp);
          const on = c.alive && j < c.lights && !((c.safeT || 0) > G.now && Math.floor(t * 8) % 2);
          lightMesh.setMatrixAt(idx, m4.compose(tmp, q4.identity(), one));
          lightMesh.setColorAt(idx, col.set(on ? (c.lights === 1 ? (Math.floor(t * 6) % 2 ? '#ff5d7a' : '#ffd1dc') : '#7dff9a') : '#4a3f55'));
        }
      }
      ringMesh.instanceMatrix.needsUpdate = true;
      if (ringMesh.instanceColor) ringMesh.instanceColor.needsUpdate = true;
      lightMesh.instanceMatrix.needsUpdate = true;
      if (lightMesh.instanceColor) lightMesh.instanceColor.needsUpdate = true;
    }

    function updateDom(dt) {
      const W = window.innerWidth;
      const H = window.innerHeight;
      for (const p of popEls) {
        if (p.life <= 0) {
          p.el.style.opacity = 0;
          continue;
        }
        p.life -= dt;
        const k = 1 - p.life / p.max;
        tmp.set(p.x, p.y + k * 1.1, p.z).project(camera);
        p.el.style.left = `${((tmp.x + 1) / 2) * W}px`;
        p.el.style.top = `${((1 - tmp.y) / 2) * H}px`;
        p.el.style.opacity = Math.min(1, p.life * 4, k * 8);
        p.el.style.transform = `translate(-50%, -100%) scale(${0.8 + Math.min(1, k * 6) * 0.25})`;
      }
      tagTime -= dt;
      const showNames = phase === 'intro' || phase === 'count' || (phase === 'play' && tagTime > 0);
      cars.forEach((c, i) => {
        const el = tagEls[i];
        const it = phase === 'play' && c.active && c.it;
        const out = phase === 'play' && c.active && !c.alive;
        if (!c.active || !(showNames || it || out) || phase === 'menu') {
          el.style.display = 'none';
          return;
        }
        tmp.set(c.x, 2.0, c.z).project(camera);
        if (tmp.z > 1) {
          el.style.display = 'none';
          return;
        }
        el.style.display = 'block';
        el.style.left = `${((tmp.x + 1) / 2) * W}px`;
        el.style.top = `${((1 - tmp.y) / 2) * H}px`;
        el.style.background = c === G.me ? '#ef5b6f' : '#7a6470';
        el.classList.toggle('it', it);
        el.textContent = it ? (c === G.me ? 'You are it!' : `${c.name} is it`) : out ? `${c.name}: out` : c === G.me ? `${c.name} (you)` : c.name;
      });
    }

    // ---------------------------------------------------------------- the loop
    return {
      update(dt0, t) {
        if (disposed) return;
        const sp = dbg.speed || 1;
        // the auto player and the speed-up are for tests: run several small steps
        const steps = Math.min(16, Math.ceil(sp));
        const dt = Math.min(0.05, dt0) * (sp / steps);
        for (let s = 0; s < steps; s++) {
          for (let i = later.length - 1; i >= 0; i--) {
            later[i].t -= dt;
            if (later[i].t <= 0) {
              const f = later[i].fn;
              later.splice(i, 1);
              f();
            }
          }
          if (phase === 'final' || phase === 'done') stepFinal(dt);
          else if (G.round) stepPlay(dt, t);
          for (const c of cars) {
            if (!c.root.visible) continue;
            updateCarVisual(c, dt, t);
            animateDriver(c, dt, t);
          }
        }
        if (phase === 'menu') {
          for (const c of cars) {
            fx.glow(tipOf(c), 0.45 + Math.random() * 0.2, '#fff1b8', 0.8);
            if (Math.random() < 0.08) fx.spark(tipOf(c), 1, { color: ['#fff3c4', '#c7e9ff'], speed: 1.2, life: 0.5 });
            if (!c.gest && Math.random() < dt * 0.2) gesture(c, 'wave', 1.5);
          }
        }
        if (G.round) updateBoard(dt);
        updateRings(t);
        S.update(dt, t);
        fx.update(dt, cars, t);
        updateCamera(dt, t);
        updateDom(dt);
      },
      dispose() {
        disposed = true;
        later.length = 0;
        clearTimeout(toastTimer);
        fx.dispose();
        // shared textures and materials that may not be on anything in the scene right now
        TOK.horn.dispose();
        TOK.boost.dispose();
        for (const m of Object.values(ballMats)) {
          m.map?.dispose();
          m.dispose();
        }
        closeChoices();
        ui.remove();
        K.hotButton('action', false);
        if (window.__bumpercars === dbg) delete window.__bumpercars;
      },
    };
  },
};
