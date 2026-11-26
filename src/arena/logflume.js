import * as THREE from 'three';
import { buildPath } from './coaster/track.js';
import { COURSES, SPLASH, START, has } from './logflume/courses.js';
import { buildWorld, THEMES, spans } from './logflume/world.js';
import { makeWater } from './logflume/water.js';
import { pickupGeos, makeFloat, makeShield } from './logflume/models.js';
import { makeCrew, makeSfx, snapPhoto, flash } from './logflume/rig.js';
import { runSplashRound } from './logflume/splashround.js';
import { kit } from '../places/school/kit.js';
import { Fireworks } from '../places/park/fireworks.js';
import { hostPlan, guestPlan, waitCard, waitForPartner, countTo, History, Follow, halves, nameOf, settleFinal } from './coop/kit.js';

// Roji Land's Log Flume: Roji and Homama ride a smiling log boat down a winding water channel.
// Lean left and right to catch stars and fruit, reach up for the ones on balloons, duck under low
// branches and gates, steer round a sleepy hippo, find the dry gap in the waterfall, then up the big
// hill and down the drop into the splash lagoon (Homama shields Roji, or they both get soaked), with a
// ride photo. Three rides open with stars (Jungle Falls, Castle Moat, Firefly Night) and a splash round
// where you aim water at targets on the banks. Debug hook: window.__logflume (auto, speed, finishNow).
// Played together online, both ride the same log: one steers, the other grabs the pickups as they pass
// and ducks under the branches. The starter's copy runs the log and decides what was caught.

const VALUE = { star: 1, fruit: 2, heart: 3, gold: 5 };
const LANE = 0.95;
const damp = (a, b, r, dt) => a + (b - a) * (1 - Math.exp(-r * dt));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const name = (id) => (id === 'roji' ? 'Roji' : 'Homama');
const MODES = [...COURSES, SPLASH];

export default {
  id: 'logflume',
  title: 'Log Flume',
  tagline: 'Lean, duck and make a splash',

  async start(ctx) {
    const { hud } = ctx;
    hud.title('Log Flume', 'Lean, duck and make a splash');
    const prog = ctx.load('progress', {});
    const total = () => MODES.reduce((s, m) => s + (prog[m.id]?.stars || 0), 0);
    const flow = { disposed: false, cur: null, preview: null, rider: ctx.opts.rider || ctx.me, say: null };
    const dbg = { auto: false, speed: 1, flow, prog, pick: null };
    window.__logflume = dbg;
    hud.buttons({ action: null, jump: null, stick: false });

    // A speech line from Roji or Homama at the top of the screen
    const say = document.createElement('div');
    say.style.cssText = "position:fixed;left:50%;top:max(64px,calc(env(safe-area-inset-top) + 58px));transform:translateX(-50%) translateY(-8px);z-index:41;pointer-events:none;background:rgba(255,250,244,.94);color:#3b2b3f;border-radius:18px;padding:7px 16px;font:600 .95rem 'Fredoka',system-ui,sans-serif;box-shadow:0 6px 18px rgba(60,30,40,.16);opacity:0;transition:opacity .25s,transform .25s;max-width:80vw;text-align:center";
    document.body.appendChild(say);
    let sayTimer = 0;
    flow.say = (html, ms = 2600) => {
      say.innerHTML = html;
      say.style.opacity = '1';
      say.style.transform = 'translateX(-50%) translateY(0)';
      clearTimeout(sayTimer);
      sayTimer = setTimeout(() => {
        say.style.opacity = '0';
        say.style.transform = 'translateX(-50%) translateY(-8px)';
      }, ms);
    };

    flow.preview = makePreview(ctx, flow);
    const menu = async () => {
      for (;;) {
        const rider = flow.rider;
        const other = rider === 'roji' ? 'homama' : 'roji';
        const stars = total();
        const pick =
          dbg.pick ||
          (await hud.choose({
            title: 'Log Flume',
            text: `${name(rider)} leans and steers, ${name(other)} holds on tight. Where to?`,
            options: [
              ...MODES.map((m) => {
                const p = prog[m.id];
                const open = stars >= m.need;
                return { id: m.id, label: open ? m.name : `${m.name} (locked)`, sub: open ? (p ? `${p.stars} of 3 stars, best ${p.best}` : m.sub) : `Needs ${m.need} stars (you have ${stars})` };
              }),
              { id: 'swap', label: `${name(other)} plays`, sub: `Swap: ${name(rider)} rides along` },
            ],
          }));
        dbg.pick = null;
        if (flow.disposed) return;
        if (!pick) {
          ctx.end({ quit: true });
          return;
        }
        if (pick === 'swap') {
          flow.rider = other;
          ctx.sound.ui('tap');
          flow.preview?.setRider(flow.rider);
          continue;
        }
        const mode = MODES.find((m) => m.id === pick);
        if (!mode) continue;
        if (stars < mode.need) {
          hud.message('Locked for now', 1100);
          ctx.sound.ui('bad');
          continue;
        }
        return mode;
      }
    };
    const go = (mode, coop = null) => {
      const keep = mode.id === 'jungle' ? flow.preview.take() : null;
      flow.preview?.remove();
      flow.preview = null;
      // together, the one who grabs and ducks is the crew's "me" (the steerer leans the log)
      const rider = coop ? (coop.steer === 'roji' ? 'homama' : 'roji') : flow.rider;
      flow.cur = mode.id === 'splash' ? runSplashRound(ctx, { prog, flow, dbg, rider: flow.rider }) : runRide(ctx, mode, { prog, flow, dbg, rider, keep, coop });
    };
    const on = ctx.online;
    const gone = () => flow.disposed;
    // Played together (the other copy): ride the starter's course in the same log, in the role they picked
    const asGuest = async () => {
      flow.plan?.off();
      flow.card = waitCard({ title: `${name(ctx.partner)} is picking a ride`, text: 'You ride together in the same log: one steers, one grabs and ducks.' });
      const plan = await guestPlan(ctx, 'plan', { isGone: gone });
      flow.card.close();
      if (flow.disposed) return true;
      const mode = plan && plan !== 'solo' && COURSES.find((m) => m.id === plan.mode);
      if (mode) return go(mode, { ...plan, owner: false }), true;
      return false;
    };
    (async () => {
      if (on.inRoom && !on.isHost && (await asGuest())) return;
      const mode = await menu();
      if (!mode || flow.disposed) return;
      // (both opened it at once and the other copy's session won: this one rides theirs)
      if (on.inRoom && !on.isHost && mode.id !== 'splash' && (await asGuest())) return;
      if (on.inRoom && on.isHost && mode.id !== 'splash') {
        flow.plan = hostPlan(ctx);
        const here = await waitForPartner(ctx, { what: `ride ${mode.name}`, isGone: gone });
        if (!on.isHost) {
          if (!(await asGuest())) go(mode);
          return;
        }
        if (here) {
          const role = await hud.choose({
            title: 'Who steers?',
            text: 'One of you steers the log, the other grabs the stars and fruit as they pass and ducks under the branches.',
            options: [
              { id: `steer-${ctx.me}`, label: `${name(ctx.me)} steers`, sub: `${name(ctx.partner)} grabs and ducks` },
              { id: `steer-${ctx.partner}`, label: `${name(ctx.partner)} steers`, sub: `${name(ctx.me)} grabs and ducks` },
            ],
          });
          if (flow.disposed) return;
          if (role && on.partnerHere) {
            const plan = { mode: mode.id, steer: role.slice(6), seed: on.seed % 100000, at: on.now() + 4600 };
            flow.plan.set(plan);
            return go(mode, { ...plan, owner: true });
          }
        }
        flow.plan.alone();
      } else if (on.inRoom && on.isHost) {
        flow.plan = hostPlan(ctx);
        flow.plan.alone(); // the splash round: each plays their own
      }
      go(mode);
    })();
    return {
      update(dt, t) {
        dt = Math.min(0.1, dt) * (dbg.speed || 1);
        if (flow.cur) flow.cur.update(dt, t);
        else flow.preview?.update(dt, t);
      },
      dispose() {
        flow.disposed = true;
        flow.card?.close();
        flow.plan?.off();
        flow.cur?.dispose?.();
        flow.preview?.dispose?.();
        clearTimeout(sayTimer);
        say.remove();
        if (window.__logflume === dbg) delete window.__logflume;
      },
    };
  },
};

// ------------------------------------------------------------------ the menu backdrop
// The jungle ride's loading dock with the log waiting, while a ride is chosen
function makePreview(ctx, flow) {
  const { scene, camera } = ctx;
  const course = COURSES[0];
  const track = buildPath({ ...START }, course.pieces, { step: 0.25 });
  const flowFn = flowSpeed(track, course);
  const env = ctx.env.outdoor({ sky: THEMES.day.fog, fog: THEMES.day.fogR, shadow: 16 });
  const world = buildWorld(ctx, track, course, { flow: flowFn });
  const k = kit();
  let crew = makeCrew(ctx, k, THEMES.day, flow.rider);
  scene.add(crew.log.root);
  const fr = track.at(4.5);
  const m4 = new THREE.Matrix4();
  const place = () => {
    m4.makeBasis(fr.l, fr.u, fr.f).setPosition(fr.p);
    crew.log.root.matrix.copy(m4);
    crew.log.root.matrixAutoUpdate = false;
    crew.log.root.matrixWorldNeedsUpdate = true;
  };
  place();
  let a = 0;
  let taken = false;
  const cam = new THREE.Vector3();
  return {
    update(dt, t) {
      a += dt * 0.12;
      cam.set(fr.p.x + Math.sin(a + 2.2) * 7, fr.p.y + 2.6, fr.p.z + Math.cos(a + 2.2) * 7);
      camera.position.copy(cam);
      camera.up.set(0, 1, 0);
      camera.lookAt(fr.p.x, fr.p.y + 2.3, fr.p.z);
      crew.log.body.position.y = Math.sin(t * 1.8) * 0.03;
      crew.st.hands = 0;
      crew.st.cheer = 0;
      crew.pose(dt, t);
      world.update(dt, t, cam);
      env.follow(fr.p);
    },
    setRider(r) {
      crew.log.root.removeFromParent();
      crew = makeCrew(ctx, k, THEMES.day, r);
      scene.add(crew.log.root);
      place();
    },
    // hand the world over to the jungle ride instead of building it again
    take() {
      taken = true;
      return { track, world, env };
    },
    remove() {
      crew.log.root.removeFromParent();
      if (taken) return;
      for (const o of [world.group, env.hemi, env.sun, env.sun.target]) o.removeFromParent();
      disposeTree(world.group);
    },
    dispose() {},
  };
}

export function disposeTree(root) {
  root.traverse((o) => {
    o.geometry?.dispose?.();
    for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
      for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
      m.dispose?.();
    }
  });
}

// How fast the water runs at d: slow on the lifts, fast down the drops, gentle on the flat
function flowSpeed(track, course) {
  const fr = { p: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3(), l: new THREE.Vector3() };
  return (d) => {
    track.at(d, fr);
    const tg = fr.tag || {};
    if (tg.lift) return 2.6;
    if (tg.station) return 1.4;
    return (course.speed || 3) + Math.max(0, -fr.f.y) * 22;
  };
}

// ------------------------------------------------------------------ a ride down the flume
// Together: how long a grab reaches out (ms), and how long the log's copy waits for the other player's
// steering, grab or duck before it decides what they took part in
const GRAB = 600;
const GRACE = 400;

// coop (played together): { steer: the kid who steers, seed, at: the shared start, owner: true on the
// copy that runs the log and decides what was caught }
function runRide(ctx, course, { prog, flow, dbg, rider, keep, coop = null }) {
  const { scene, camera, hud, input, sound, fx } = ctx;
  const k = kit();
  const TH = THEMES[course.time];
  const night = course.time === 'night';
  hud.title('Log Flume', course.name);
  let track;
  let world;
  let env;
  const flowFn = (d) => flowFn2(d);
  let flowFn2 = null;
  if (keep) {
    ({ track, world, env } = keep);
    flowFn2 = flowSpeed(track, course);
  } else {
    track = buildPath({ ...START }, course.pieces, { step: 0.25 });
    flowFn2 = flowSpeed(track, course);
    env = ctx.env.outdoor({ sky: TH.fog, fog: TH.fogR, sun: course.time === 'sunset' ? [-30, 14, -24] : [-11, 22, 12], shadow: 16, intensity: night ? 0.62 : course.time === 'sunset' ? 0.92 : 1 });
    world = buildWorld(ctx, track, course, { flow: flowFn });
  }
  if (night) {
    env.hemi.color.set('#9aa8e8');
    env.hemi.groundColor.set('#1a2040');
    env.sun.color.set('#b8c4ff');
  } else if (course.time === 'sunset') {
    env.sun.color.set('#ffb27a');
    env.hemi.color.set('#ffd6c0');
  }
  const hemiBase = env.hemi.intensity;
  const water = makeWater(scene);
  const sfx = makeSfx(sound);
  const crew = makeCrew(ctx, k, TH, rider);
  const { log, roji, homama } = crew;
  scene.add(log.root);
  log.root.matrixAutoUpdate = false;
  log.lantern.visible = night;
  if (night) {
    // the lantern on the log's nose lights the two of them (and the glow-worm cave) warmly
    const glow = new THREE.PointLight('#ffd89a', 5, 10, 1.6);
    glow.position.set(0, 0.55, 0.05);
    log.lantern.add(glow);
  }
  const shieldKind = course.id === 'jungle' ? 'leaf' : course.id === 'castle' ? 'jacket' : 'umbrella';
  const shield = makeShield(k, shieldKind);
  shield.visible = false;
  log.body.add(shield);
  const fireworks = night ? new Fireworks(scene, { area: { x: 0, z: 0, w: 26, h0: 12, h1: 19, depth: 8, ground: 1 }, size: 0.8, sound, listener: () => 0.7 }) : null;
  const R = (() => {
    let a = 7 + (coop ? coop.seed : Math.floor(Math.random() * 100000));
    return () => ((a = (a * 16807) % 2147483647) / 2147483647);
  })();
  const parts = spans(track);
  const fr = { p: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3(), l: new THREE.Vector3() };
  const v = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);

  // ---------------------------------------------------------------- obstacles
  const obstacles = [];
  for (const b of world.branches) obstacles.push({ type: 'duck', what: 'branch', d: b.d });
  for (const g of world.gates) obstacles.push({ type: 'duck', what: 'gate', d: g.d });
  for (const f of world.falls) obstacles.push({ type: 'falls', d: f.d, dry: f.dry });
  const jets = world.jets.map((j) => ({ ...j, target: 0, state: 'idle', t: 0, mesh: null }));
  for (const j of jets) obstacles.push({ type: 'jet', d: j.d, jet: j });
  const floats = [];
  for (const p of parts.filter((pp) => has(pp.tag.name, 'float'))) {
    const n = Math.max(1, Math.round((p.d1 - p.d0) / 8));
    for (let i = 0; i < n; i++) {
      const d = p.d0 + ((i + 0.5) * (p.d1 - p.d0)) / n;
      const lane = [-1, 0, 1][Math.floor(R() * 3)];
      const f = makeFloat(k, course.floats);
      scene.add(f.root);
      const o = { type: 'float', d, lane, f, ph: R() * 6 };
      floats.push(o);
      obstacles.push(o);
    }
  }
  obstacles.sort((a, b) => a.d - b.d);
  // the jets' water: a tube along an arc, made when it fires
  const jetMat = new THREE.MeshStandardMaterial({ color: '#d8f6ff', transparent: true, opacity: 0.78, roughness: 0.15, emissive: '#bfefff', emissiveIntensity: 0.3, depthWrite: false });
  const jetArc = (j) => {
    track.at(j.d, fr);
    const to = fr.p.clone().addScaledVector(fr.l, -j.target * LANE);
    const from = j.from.clone();
    const mid = from.clone().lerp(to, 0.5);
    mid.y += 1.4;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.12, 6, false), jetMat);
    m.userData.curve = curve;
    return m;
  };
  // a soft warning ring on the water where a jet will land
  const warnMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
  const warn = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 24), warnMat);
  warn.rotation.x = -Math.PI / 2;
  warn.renderOrder = 3;
  scene.add(warn);

  // ---------------------------------------------------------------- pickups
  const geos = pickupGeos(k);
  const fruitKinds = night ? ['firefly'] : ['mango', 'berry', 'banana'];
  const items = [];
  {
    // keep clear of the waterfall and right under a branch; next to a float only the other lanes
    const blockedAt = (d) => obstacles.some((o) => Math.abs(o.d - d) < (o.type === 'falls' ? 3 : o.type === 'float' ? 0 : 1.3));
    const floatLane = (d) => obstacles.find((o) => o.type === 'float' && Math.abs(o.d - d) < 3)?.lane;
    let lane = 0;
    let run = 0;
    const first = parts.find((p) => !has(p.tag.name, 'still') && !p.tag.station && !p.tag.lift)?.d0 || 20;
    const tut = course.id === 'jungle' ? [-1, 1, 0] : [];
    for (let d = first + 3; d < track.length - 4; ) {
      track.at(d, fr);
      const tg = fr.tag || {};
      if (has(tg.name, 'still') || tg.lift || tg.drop || tg.station) {
        d += 2;
        continue;
      }
      if (blockedAt(d)) {
        d += 1.2;
        continue;
      }
      const mix = course.mix;
      const r = R();
      let kind = 'star';
      if (r < mix.gold) kind = 'gold';
      else if (r < mix.gold + mix.heart) kind = 'heart';
      else if (r < mix.gold + mix.heart + mix.fruit) kind = 'fruit';
      let L;
      if (tut.length) L = tut.shift();
      else {
        if (run <= 0) {
          const opts = [-1, 0, 1].filter((x) => x !== lane);
          lane = opts[Math.floor(R() * opts.length)];
          run = 2 + Math.floor(R() * 3);
        }
        L = lane;
        run--;
      }
      const fl = floatLane(d);
      if (fl !== undefined && fl === L) L = fl === 0 ? (R() < 0.5 ? -1 : 1) : 0;
      const it = { d, kind, lane: L, cur: L, high: false, moving: false, ph: R() * 6, got: false, missed: false, model: kind };
      if (kind === 'fruit') it.model = fruitKinds[Math.floor(R() * fruitKinds.length)];
      if (kind === 'gold' && course.id === 'castle') it.model = 'crown';
      if (items.length > 3 && kind !== 'star' && R() < mix.high * 2.2) it.high = true;
      else if (items.length > 3 && R() < mix.moving) it.moving = true;
      items.push(it);
      d += course.every * (0.8 + R() * 0.4);
    }
  }
  const counts = {};
  for (const it of items) it.slot = (counts[it.model] = (counts[it.model] || 0) + 1) - 1;
  const inst = {};
  for (const [kd, n] of Object.entries(counts)) {
    const glow = kd === 'firefly' ? 0.9 : kd === 'star' || kd === 'gold' || kd === 'crown' ? 0.35 : 0.08;
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: kd === 'crown' || kd === 'gold' ? 0.3 : 0.05, emissive: kd === 'heart' ? '#ff3d6e' : kd === 'firefly' ? '#e8ff7a' : '#ffb347', emissiveIntensity: night ? glow * 2 : glow });
    const m = new THREE.InstancedMesh(geos[kd], mat, n);
    m.frustumCulled = false;
    m.castShadow = false;
    scene.add(m);
    inst[kd] = m;
  }
  // the high ones float on balloons: a string up to a balloon above each
  const highCount = Math.max(1, items.filter((i) => i.high).length);
  const strGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 4);
  strGeo.translate(0, 0.5, 0);
  const strings = new THREE.InstancedMesh(strGeo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), highCount);
  strings.frustumCulled = false;
  scene.add(strings);
  const balloonGeo = new THREE.SphereGeometry(0.3, 12, 9);
  balloonGeo.scale(1, 1.18, 1);
  const balloons = new THREE.InstancedMesh(balloonGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, emissive: '#ffffff', emissiveIntensity: night ? 0.25 : 0.05 }), highCount);
  balloons.frustumCulled = false;
  const bcol = new THREE.Color();
  for (let i = 0; i < highCount; i++) balloons.setColorAt(i, bcol.set(['#ff9eb5', '#8fd3ff', '#ffd166', '#c7a6ff', '#7fd8bf'][i % 5]));
  scene.add(balloons);
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const MAX = items.reduce((s, it) => s + VALUE[it.kind], 0) + obstacles.reduce((s, o) => s + (o.type === 'duck' || o.type === 'float' ? 1 : 2), 0);
  // the reach marker: a ring that shows where the lean points
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 6, 24), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false }));
  scene.add(ring);

  // ---------------------------------------------------------------- state
  const pool = parts.find((p) => has(p.tag.name, 'pool'));
  const top = parts.filter((p) => has(p.tag.name, 'top')).pop();
  const dropPart = parts.find((p) => p.tag.photo);
  const endD = world.unload ? pool.d1 - 4 : track.length - 3;
  const st = { d: 4.5, v: 0, x: 0, xv: 0, phase: 'ready', t: 0, score: 0, got: 0, gotPts: 0, hits: 0, wet: 0, combo: 0, bestCombo: 0, photo: null, photoDone: false, splashDone: false, shieldMode: R() < 0.55 ? 'shield' : 'soak', wetT: 0, leafT: 0, shake: 0, told: {}, saidTop: false, dipDone: new Set(), whee: 0, clack: 0, afterSplash: -1, cave: 0 };
  dbg.st = st;
  dbg.crew = crew;
  dbg.items = items;
  dbg.obstacles = obstacles;
  dbg.track = track;
  dbg.finishNow = () => {
    st.d = endD - 0.5;
  };
  const comboMul = () => (st.combo >= 12 ? 3 : st.combo >= 5 ? 2 : 1);
  let shownScore = '';
  const showScore = () => {
    const html = `${st.score} <span style="font-weight:400;font-size:.8em">${st.score === 1 ? 'point' : 'points'}</span>${comboMul() > 1 ? ` <span style="color:#ef5b6f">x${comboMul()}</span>` : ''}`;
    if (html === shownScore) return;
    shownScore = html;
    hud.score(html);
  };
  showScore();
  // Played together: who steers, who grabs and ducks, their inputs over time, and what was decided
  const C = coop && {
    owner: !!coop.owner,
    steerer: coop.steer,
    catcher: coop.steer === 'roji' ? 'homama' : 'roji',
    mine: coop.steer === ctx.me ? 'steer' : 'catch',
    here: true,
    xH: new History(5000), // the log's place across the channel
    duckH: new History(5000),
    follow: new Follow({ delay: 120 }),
    grabs: [],
    grabAt: -1e9,
    duckOn: false,
    duckLog: [], // [when, 0 | 1] the catcher's duck going down and up
    pts: { roji: 0, homama: 0 },
    pend: [], // things passed that wait for a decision
    res: [], // [key, 1 | 0, when]: 'i<n>' an item, 'o<n>' an obstacle
    seen: new Set(),
    ownerSt: null,
  };
  dbg.C = C;
  items.forEach((it, i) => (it.i = i));
  obstacles.forEach((o, i) => (o.i = i));
  const now = () => ctx.online.now();
  if (!C) {
    hud.hint('A and D (or arrows) lean, S or Space ducks, W reaches up');
    hud.buttons({ action: 'Duck', jump: null, extra: [{ id: 'reach', label: 'Reach' }] });
  } else if (C.mine === 'steer') {
    hud.hint(`A and D (or the arrows) steer. ${name(C.catcher)} grabs and ducks.`);
    hud.buttons({ action: null, jump: null });
  } else {
    hud.hint(`Space (or a tap) grabs each one as it reaches you, S ducks. ${name(C.steerer)} steers.`);
    hud.buttons({ action: 'Grab', jump: null, extra: [{ id: 'duck', label: 'Duck' }], stick: false });
  }
  const me = crew.me;
  const pal = crew.pal;
  const meName = name(rider);
  const palName = name(rider === 'roji' ? 'homama' : 'roji');

  // ---------------------------------------------------------------- helpers
  const logPos = (out) => {
    track.at(st.d, fr);
    return out.copy(fr.p).addScaledVector(fr.l, -st.x * LANE);
  };
  const headPos = (kid, out) => kid.head.getWorldPosition(out);
  const lose = (text) => {
    if (st.combo >= 5) hud.message('Combo lost', 700);
    st.combo = 0;
    st.hits++;
    if (text) hud.message(text, 900);
    showScore();
  };
  const award = (pts, text) => {
    st.score += pts;
    st.gotPts += pts;
    if (text) hud.message(text, 800);
    showScore();
  };
  const soak = (text) => {
    st.wet++;
    st.wetT = 3.5;
    lose(text);
    sfx.splash(0.7);
    headPos(me, v);
    water.spray(v.add(v2.set(0, 0.6, 0)), v2.set(0, -1, 0), 26, { spread: 2.2, size: 0.9 });
    crew.st.shake = 1;
  };
  const tell = (key, text) => {
    if (st.told[key]) return;
    st.told[key] = true;
    hud.message(text, 1300);
  };
  // a pickup caught (score: false on the other copy, which takes the score from the log's copy)
  const gotItem = (it, score = true) => {
    it.got = true;
    if (score) {
      st.combo++;
      st.bestCombo = Math.max(st.bestCombo, st.combo);
      const pts = VALUE[it.kind] * comboMul();
      st.score += pts;
      st.got++;
      st.gotPts += VALUE[it.kind];
      if (C) {
        const [a, b] = halves(pts, false);
        C.pts[C.steerer] += a;
        C.pts[C.catcher] += b;
      }
    }
    itemPos(it, tmpI, frameT);
    const cols = it.kind === 'heart' ? ['#ff5d7a', '#ffd1dc', '#ffffff'] : it.kind === 'fruit' ? (night ? ['#f4ff9a', '#d8ff7a', '#ffffff'] : ['#ffb347', '#ef3b4f', '#ffe066', '#ffffff']) : ['#ffd166', '#fff3c4', '#ffffff'];
    fx.burst(tmpI, cols, it.kind === 'gold' ? 26 : 14);
    if (it.kind === 'heart') {
      fx.heartsAt(tmpI, 3);
      crew.st.heart = 1;
      sfx.sweet();
    } else sound.ui(it.kind === 'star' ? 'coin' : 'good');
    if (st.combo === 5 || st.combo === 12) {
      hud.message(`Combo x${comboMul()}!`, 900);
      crew.st.cheer = 1;
    }
    showScore();
  };
  const missItem = (it, score = true) => {
    it.missed = true;
    if (st.combo >= 5) hud.message('Combo lost', 700);
    if (score) st.combo = 0;
    showScore();
  };
  const tmpI = new THREE.Vector3();
  let frameT = 0;
  // Did the log get past an obstacle? x: where it was across the channel, ducked: the duck was down
  const passed = (o, x, ducked, jetFire) => {
    const lane = Math.round(clamp(x, -1, 1));
    if (o.type === 'duck') return ducked;
    if (o.type === 'falls') return lane === o.dry;
    if (o.type === 'jet') return !(jetFire && Math.abs(x - o.jet.target) < 0.6);
    if (o.type === 'float') return Math.abs(x - o.lane) < 0.62 ? false : true;
    return true;
  };
  // What happens for it. score: change the score (the log's copy), push: bounce the log (where it is steered)
  const outcome = (o, ok, x, { score = true, push = true } = {}) => {
    o.decided = true;
    const give = (pts, text) => {
      if (score) {
        award(pts, text);
        if (C) C.pts[o.type === 'duck' ? C.catcher : C.steerer] += pts;
      } else if (text) hud.message(text, 800);
    };
    const hurt = (text, wet = false) => {
      if (!score) {
        if (wet) {
          st.wetT = 3.5;
          sfx.splash(0.7);
          headPos(me, v);
          water.spray(v.add(v2.set(0, 0.6, 0)), v2.set(0, -1, 0), 26, { spread: 2.2, size: 0.9 });
          crew.st.shake = 1;
        }
        hud.message(text, 900);
        return;
      }
      if (wet) soak(text);
      else lose(text);
    };
    if (o.type === 'duck') {
      if (ok) {
        give(1, null);
        sfx.plop();
      } else {
        hurt('Bonk!');
        sfx.bonk();
        if (score) st.v *= 0.7;
        st.leafT = 4;
        headPos(me, v);
        fx.burst(v.add(v2.set(0, 0.4, 0)), [TH.leaf[0], TH.leaf[1], '#ffffff'], 18);
        crew.st.shake = 0.8;
      }
    } else if (o.type === 'falls') {
      if (ok) {
        give(2, 'Stayed dry!');
        sound.ui('good');
      } else hurt('Soaked!', true);
    } else if (o.type === 'jet') {
      if (!ok) hurt('Splash!', true);
      else {
        give(2, null);
        sfx.plop();
      }
    } else if (o.type === 'float') {
      if (!ok) {
        hurt('Boing!');
        o.f.hit();
        if (course.floats === 'frog') sfx.croak();
        else if (course.floats === 'hippo') sfx.honk();
        else sfx.boing();
        if (push) st.xv += (x >= o.lane ? 1 : -1) * 6;
        if (score) st.v *= 0.8;
      } else {
        give(1, null);
        if (course.floats === 'frog') sfx.croak();
      }
    }
  };
  // The log's copy decides what was caught and passed once it has both players' inputs of that moment
  const judge = (force = false) => {
    const T0 = now();
    const remoteSteer = C.mine !== 'steer' && C.here;
    const remoteCatch = C.mine !== 'catch' && C.here;
    for (let j = C.pend.length - 1; j >= 0; j--) {
      const e = C.pend[j];
      const T = e.at;
      const late = force || T0 > T + GRACE;
      if (e.it) {
        if (remoteSteer && C.xH.lastAt() < T && !late) continue;
        const x = C.xH.num(T) ?? st.x;
        const lane = Math.abs(x - e.it.passCur) < 0.52;
        const grabbed = C.grabs.some((g) => g >= T - GRAB && g <= T + 120);
        if (lane && grabbed) {
          gotItem(e.it);
          C.res.push([`i${e.it.i}`, 1, T0]);
        } else if (!lane || late || (!remoteCatch && T0 > T + 120)) {
          missItem(e.it);
          C.res.push([`i${e.it.i}`, 0, T0]);
        } else continue;
      } else {
        const o = e.o;
        const byCatcher = o.type === 'duck';
        if ((byCatcher ? remoteCatch && C.duckH.lastAt() < T : remoteSteer && C.xH.lastAt() < T) && !late) continue;
        const x = C.xH.num(T) ?? st.x;
        const ok = passed(o, x, !!C.duckH.at(T - 50), e.fire);
        outcome(o, ok, x, { push: !remoteSteer });
        C.res.push([`o${o.i}`, ok ? 1 : 0, T0]);
      }
      C.pend.splice(j, 1);
    }
  };
  // The other copy shows what the log's copy decided and keeps its log with it
  const followOwner = (s) => {
    for (const [key, ok] of s.res || []) {
      if (C.seen.has(key)) continue;
      C.seen.add(key);
      const n = +key.slice(1);
      if (key[0] === 'i' && items[n] && !items[n].got && !items[n].missed) (ok ? gotItem : missItem)(items[n], false);
      if (key[0] === 'o' && obstacles[n] && !obstacles[n].decided) outcome(obstacles[n], !!ok, st.x, { score: false, push: C.mine === 'steer' });
    }
    const combo = st.combo;
    st.score = s.sc | 0;
    st.got = s.g | 0;
    st.gotPts = s.gp | 0;
    st.combo = s.c | 0;
    st.wet = s.w | 0;
    st.hits = s.hi | 0;
    st.bestCombo = Math.max(st.bestCombo, st.combo);
    C.pts = { roji: s.r | 0, homama: s.h | 0 };
    if (combo >= 5 && st.combo === 0) hud.message('Combo lost', 700);
    if (combo !== st.combo && (st.combo === 5 || st.combo === 12)) hud.message(`Combo x${comboMul()}!`, 900);
    // the jets as the log's copy runs them
    for (const [n, target, state] of s.jt || []) {
      const j = jets[n];
      if (!j || j.state === state || j.state === 'done') continue;
      j.target = target;
      if (state === 'warn') {
        track.at(j.d, fr);
        warn.position.copy(fr.p).addScaledVector(fr.l, -j.target * LANE).add(v.set(0, 0.04, 0));
        j.t = 0;
      }
      if (state === 'fire' && !j.mesh) {
        j.mesh = jetArc(j);
        scene.add(j.mesh);
        sfx.squirt();
        warnMat.opacity = 0;
        j.t = 0;
      }
      if (state === 'done' && j.mesh) {
        j.mesh.removeFromParent();
        j.mesh.geometry.dispose();
        j.mesh = null;
      }
      j.state = state;
    }
    showScore();
  };
  if (C) {
    ctx.online.on('state', (s) => {
      if (!s || typeof s !== 'object' || !Number.isFinite(s.at)) return;
      if (C.mine !== 'steer' && typeof s.x === 'number') {
        C.xH.push(s.at, s.x);
        C.follow.push({ at: s.at, x: s.x, xv: s.xv || 0 });
      }
      if (C.mine !== 'catch') {
        if (Array.isArray(s.gr)) for (const g of s.gr) if (typeof g === 'number' && !C.grabs.includes(g)) C.grabs.push(g);
        for (const [at, dk] of Array.isArray(s.du) ? s.du : []) C.duckH.push(at, dk);
        if (typeof s.dk === 'number') C.duckH.push(s.at, s.dk);
      }
      if (!C.owner && s.o) {
        C.ownerSt = s;
        followOwner(s);
      }
    });
    ctx.online.on('fin', (d) => {
      if (!d || typeof d !== 'object') return;
      C.fin = d;
      C.finWait?.();
    });
    ctx.online.on('leave', () => {
      C.finWait?.();
      if (!C.here) return;
      C.here = false;
      C.owner = true; // the computer takes the other seat and this copy runs the log now
      C.pend = [...items.filter((it) => it.passAt && !it.got && !it.missed).map((it) => ({ it, at: it.passAt })), ...obstacles.filter((o) => o.passAt && !o.decided).map((o) => ({ o, at: o.passAt, fire: o.jet?.state === 'fire' }))];
      hud.message(`<span style="font-size:.5em">${name(ctx.partner)} left the ride. The computer ${C.mine === 'steer' ? 'grabs and ducks' : 'steers'} now.</span>`, 2200);
    });
  }
  const shareNow = () => {
    const t0 = now();
    C.grabs = C.grabs.filter((g) => t0 - g < 4000);
    C.duckLog = C.duckLog.filter((x) => t0 - x[0] < 2000);
    const s = { at: t0 };
    if (C.mine === 'steer') Object.assign(s, { x: +st.x.toFixed(3), xv: +st.xv.toFixed(2) });
    else Object.assign(s, { gr: C.grabs.filter((g) => t0 - g < 2200), dk: C.duckOn ? 1 : 0, du: C.duckLog });
    if (C.owner) {
      C.res = C.res.filter((x) => t0 - x[2] < 3000);
      const jt = jets.map((j, n) => [n, j.target, j.state]).filter((x) => x[2] === 'warn' || x[2] === 'fire' || (x[2] === 'done' && jets[x[0]].d > st.d - 12));
      Object.assign(s, { o: 1, d: +st.d.toFixed(2), v: +st.v.toFixed(2), sc: st.score, r: C.pts.roji, h: C.pts.homama, gp: st.gotPts, g: st.got, c: st.combo, w: st.wet, hi: st.hits, res: C.res.map((x) => [x[0], x[1]]), jt });
    }
    ctx.online.share(s);
  };

  // ---------------------------------------------------------------- the countdown
  const begin = (async () => {
    await new Promise((r) => setTimeout(r, 350));
    if (flow.disposed) return;
    if (C) {
      flow.say(C.mine === 'steer' ? `You steer, ${name(C.catcher)} grabs and ducks.` : `${name(C.steerer)} steers, you grab and duck.`, 2600);
      if (!(await countTo(ctx, coop.at, { isGone: () => flow.disposed }))) return;
    } else {
      flow.say(`${palName}: ${rider === 'roji' ? 'I will hold on to you, Roji.' : 'Steer us well, my love.'}`, 2200);
      await hud.countdown(3);
    }
    if (flow.disposed) return;
    sfx.whistle();
    st.phase = 'ride';
    st.v = 1.4;
  })();
  void begin;

  // ---------------------------------------------------------------- the end
  const finish = async () => {
    if (st.phase === 'done') return;
    st.phase = 'done';
    sfx.stream(0, 0);
    if (C) {
      // together: the final numbers from the log's copy
      const f = await settleFinal(ctx, C, { flush: () => judge(true), numbers: () => ({ sc: st.score, r: C.pts.roji, h: C.pts.homama, gp: st.gotPts, g: st.got, w: st.wet }) });
      if (flow.disposed) return;
      if (f) {
        Object.assign(st, { score: f.sc | 0, gotPts: f.gp | 0, got: f.g | 0, wet: f.w | 0 });
        C.pts = { roji: f.r | 0, homama: f.h | 0 };
      }
      showScore();
    }
    const pct = MAX ? st.gotPts / MAX : 0;
    const stars = pct >= 0.78 ? 3 : pct >= 0.52 ? 2 : pct >= 0.28 ? 1 : 0;
    const old = prog[course.id] || { best: 0, stars: 0 };
    const rec = { best: Math.max(old.best, st.score), stars: Math.max(old.stars, stars) };
    const before = MODES.filter((m) => m.need > 0 && MODES.reduce((s, mm) => s + (prog[mm.id]?.stars || 0), 0) < m.need);
    prog[course.id] = rec;
    ctx.save('progress', prog);
    const nowTotal = MODES.reduce((s, m) => s + (prog[m.id]?.stars || 0), 0);
    const opened = before.filter((m) => nowTotal >= m.need).map((m) => m.name);
    const newBest = st.score > old.best && old.best > 0;
    const photo = st.photo ? `<img src="${st.photo}" alt="Ride photo of Roji and Homama" style="display:block;max-width:100%;max-height:${C ? 19 : 36}vh;border-radius:12px;margin:0 auto ${C ? 8 : 10}px">` : '';
    const dry = st.wet === 0 ? ' Dry until the big splash.' : st.wet === 1 ? ' Soaked once on the way.' : ` Soaked ${st.wet} times on the way.`;
    const line =
      st.shieldMode === 'shield'
        ? 'Roji stayed dry under Homama\'s ' + (shieldKind === 'leaf' ? 'giant leaf' : shieldKind === 'jacket' ? 'jacket' : 'umbrella') + '. Homama did not, and he loves it.'
        : 'They came out dripping and laughing. Homama says that is the best way to end a ride.';
    if (fireworks) fireworks.show(true);
    await new Promise((r) => setTimeout(r, fireworks ? 1600 : 500));
    if (flow.disposed) return;
    hud.score('');
    const opens = opened.length ? `<br><b>${opened.join(' and ')}</b> ${opened.length > 1 ? 'are' : 'is'} open now.` : '';
    const title = stars ? `${stars === 1 ? 'One star' : stars === 2 ? 'Two stars' : 'Three stars'}!` : 'What a splash!';
    if (C) {
      // each one's share of the points; the two shares add up to the score both saw
      ctx.finish({
        win: stars > 0,
        score: C.here ? C.pts[ctx.me] : st.score,
        stars,
        title,
        // (short screens: the card also holds both results, so it keeps to the numbers)
        text: `${photo}${st.score} ${st.score === 1 ? 'point' : 'points'} together${newBest ? ' (a new best!)' : ''}. ${st.got} of ${items.length} caught. ${name(C.steerer)} steered and ${name(C.catcher)} grabbed.${innerHeight > 520 ? `${dry}<br>${line}` : ''}${opens}`,
      });
      return;
    }
    ctx.finish({
      win: stars > 0,
      score: st.score,
      stars,
      title,
      text: `${photo}${st.score} ${st.score === 1 ? 'point' : 'points'}${newBest ? ' (a new best!)' : `, best ${rec.best}`}. ${st.got} of ${items.length} caught.${dry}<br>${line}${opens}`,
    });
  };

  // ---------------------------------------------------------------- the ride photo
  const takePhoto = () => {
    const cam = new THREE.PerspectiveCamera(42, 480 / 300, 0.1, 300);
    const lp = logPos(new THREE.Vector3());
    // put the log where it is this frame before the picture is taken
    log.root.matrix.copy(m4.makeBasis(fr.l, fr.u, fr.f).setPosition(lp));
    log.root.updateMatrixWorld(true);
    cam.position.copy(lp).addScaledVector(fr.f, 3.7).addScaledVector(Y, 2.4).addScaledVector(fr.l, 0.9);
    cam.lookAt(v.copy(lp).addScaledVector(Y, 0.85).addScaledVector(fr.f, -0.35));
    st.photo = snapPhoto(ctx, env, cam, `${course.name}: Roji and Homama`, [ring, warn]);
    flash(sfx);
    hud.message('Ride photo!', 900);
    if (world.flashBulb) world.flashBulb.material.color.set('#ffffff');
  };

  // ---------------------------------------------------------------- the big splash
  const bigSplash = () => {
    st.splashDone = true;
    st.afterSplash = 0;
    track.at(st.d, fr);
    const lp = logPos(new THREE.Vector3());
    water.curtains(lp, fr.f, fr.l, 1.3);
    water.splash(lp.clone().addScaledVector(fr.f, 0.8), 90, { speed: 4.5, up: 6.5, size: 1.1 });
    for (const s of [-1, 1]) water.spray(lp.clone().addScaledVector(fr.l, s * 1.2), v2.copy(fr.l).multiplyScalar(s * 3).add(Y.clone().multiplyScalar(6)), 50, { spread: 2.5, size: 1.0, floor: lp.y - 0.1 });
    for (let i = 0; i < 3; i++) water.mist(lp.clone().add(v2.set((Math.random() - 0.5) * 4, 0.8 + Math.random(), (Math.random() - 0.5) * 4)), 4.2, 1.8, 0.8);
    water.ring(lp, 5, 1.6);
    sfx.splash(1.6);
    st.shake = 1;
    st.v *= 0.55;
    crew.st.hands = 0;
    if (st.shieldMode === 'soak') {
      st.wetT = 5;
      crew.st.laugh = 1;
      crew.st.shake = 1;
      flow.say('Soaked! Roji and Homama cannot stop laughing.', 2600);
    } else {
      flow.say(`Homama kept Roji dry. Homama is dripping.`, 2600);
    }
    // the people on the bridge cheer, and at night the fireworks start
    if (world.crowd.length) sound.ui('good');
    if (fireworks) fireworks.show(true);
  };

  // ---------------------------------------------------------------- auto-play for the tests
  const autoplay = () => {
    const out = { want: 0, duck: false, reach: false };
    const next = items.find((it) => !it.got && !it.missed && it.d > st.d - 0.3);
    if (next && next.d - st.d < 16) {
      out.want = next.cur;
      out.reach = next.high && next.d - st.d < 3.5;
    }
    for (const o of obstacles) {
      if (o.done || o.d < st.d - 0.3) continue;
      const ahead = o.d - st.d;
      if (ahead > 12) break;
      if (o.type === 'duck' && ahead < 3.2) out.duck = true;
      if (o.type === 'falls') out.want = o.dry;
      if (o.type === 'float' && Math.abs(out.want - o.lane) < 0.7) out.want = o.lane === 0 ? (next && next.cur ? next.cur : 1) : 0;
      if (o.type === 'jet' && o.jet.state !== 'idle' && Math.abs(out.want - o.jet.target) < 0.7) out.want = o.jet.target === 0 ? 1 : 0;
    }
    return out;
  };

  // ---------------------------------------------------------------- the frame
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  track.at(st.d, fr);
  camPos.copy(fr.p).addScaledVector(fr.f, -6).add(v.set(0, 3, 0));
  camLook.copy(fr.p).addScaledVector(fr.f, 6);
  const lp = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  let pointerWant = 0;
  const update = (dt, t) => {
    st.t += dt;
    frameT = t;
    const running = st.phase === 'ride';
    // ---------------------------------------- input
    let want = 0;
    const ax = input.axis().x;
    if (Math.abs(ax) > 0.2) want = clamp(ax * 1.25, -1, 1);
    const pt = input.pointer;
    if (pt.down && running) {
      if (pt.x < innerWidth * 0.34) pointerWant = -1;
      else if (pt.x > innerWidth * 0.66) pointerWant = 1;
      else pointerWant = 0;
      if (pointerWant) want = pointerWant;
    }
    let duckHeld = input.held('action') || input.held('jump') || input.held('s') || input.held('arrowdown');
    let reachHeld = input.held('reach') || input.held('w') || input.held('arrowup');
    if (dbg.auto && running && !C) {
      const a = autoplay();
      want = a.want;
      duckHeld = a.duck;
      reachHeld = a.reach;
    }
    // together: our part (steering, or grabbing and ducking), the other player's from their device, or
    // the computer's once they left
    let steerHere = true;
    if (C) {
      const t0 = now();
      const a = running && (dbg.auto || !C.here) ? autoplay() : null;
      const nxt = items.find((it) => !it.got && !it.missed && !it.passAt && it.d > st.d - 0.3);
      const soon = running && nxt && nxt.d - st.d < Math.max(0.5, st.v * (dt + 0.08));
      if (C.mine === 'steer') {
        if (a && dbg.auto) want = a.want;
      } else if (!C.here) want = a ? a.want : 0;
      else steerHere = false;
      if (C.mine === 'catch') {
        duckHeld = input.held('duck') || input.held('s') || input.held('arrowdown') || !!(a && dbg.auto && a.duck);
        const tap = input.pressed('action') || input.pressed('jump') || input.pressed('w') || input.pressed('arrowup') || input.pointer.justDown || (dbg.auto && soon);
        if (running && tap && t0 - C.grabAt > GRAB * 0.55) {
          C.grabAt = t0;
          C.grabs.push(t0);
        }
      } else if (!C.here) {
        duckHeld = !!a?.duck;
        if (soon && t0 - C.grabAt > GRAB * 0.55) {
          C.grabAt = t0;
          C.grabs.push(t0);
        }
      } else duckHeld = !!C.duckH.at(t0 - C.follow.delay);
      if (C.mine === 'catch' || !C.here) {
        if (duckHeld !== C.duckOn) {
          C.duckOn = duckHeld;
          C.duckLog.push([t0, duckHeld ? 1 : 0]);
        }
        C.duckH.push(t0, duckHeld ? 1 : 0);
      }
      const last = C.grabs.length ? Math.max(...C.grabs) : -1e9;
      reachHeld = t0 - last < GRAB;
    }
    if (!running) {
      want = 0;
      duckHeld = false;
      reachHeld = false;
    }
    if (steerHere) {
      // the log swings across the channel on a soft spring and bumps the walls
      st.xv += ((want - st.x) * 46 - st.xv * 10) * dt;
      st.x += st.xv * dt;
    } else {
      // the other player steers: their log, a moment behind
      const s = C.follow.sample(now());
      if (s) {
        st.x = s.x;
        st.xv = s.xv;
      }
    }
    if (C && steerHere) C.xH.push(now(), st.x);
    if (Math.abs(st.x) > 1.08 && steerHere) {
      if (Math.abs(st.xv) > 1.5) {
        sfx.bonk();
        logPos(lp);
        water.spray(lp.clone().addScaledVector(fr.l, -Math.sign(st.x) * 1.1).add(v.set(0, 0.3, 0)), v2.set(0, 2, 0), 8, { spread: 1.5 });
      }
      st.x = Math.sign(st.x) * 1.08;
      st.xv *= -0.3;
    }
    crew.st.duck = damp(crew.st.duck, duckHeld ? 1 : 0, 16, dt);
    crew.st.palDuck = damp(crew.st.palDuck, duckHeld ? 1 : 0, 10, dt);
    crew.st.reach = damp(crew.st.reach, reachHeld && crew.st.duck < 0.4 ? 1 : 0, 14, dt);
    crew.st.lean = damp(crew.st.lean, st.xv * 0.18 + st.x * 0.25, 8, dt);

    // ---------------------------------------- the water carries the log
    track.at(st.d, fr);
    let tag = fr.tag || {};
    const before = st.d;
    const inPool = pool && st.d > pool.d0;
    if (running) {
      if (tag.lift) st.v = damp(st.v, 2.6, 3, dt);
      else {
        st.v += -9.8 * fr.f.y * dt;
        const target = inPool ? (st.d > endD - 10 ? 0.9 : 2.2) : tag.station ? 2 : course.speed;
        st.v = damp(st.v, target, inPool ? 1.1 : st.v > target ? 0.55 : 1.4, dt);
      }
      // teeter at the very top of the big drop
      if (top && st.d > top.d1 - 2.5 && st.d < top.d1 + 0.5) st.v = Math.min(st.v, 1.3);
      st.v = Math.max(0.4, st.v);
      st.d = Math.min(endD, st.d + st.v * dt);
      // the other copy keeps its log where the log's copy has it (a little ahead for the delay)
      if (C && !C.owner && C.ownerSt) {
        const s = C.ownerSt;
        const want = Math.min(endD, s.d + (s.v * Math.max(0, now() - s.at)) / 1000);
        const gap = want - st.d;
        st.d = Math.min(endD, st.d + gap * (Math.abs(gap) > 4 ? 1 : 1 - Math.exp(-5 * dt)));
        st.v = damp(st.v, s.v, 6, dt);
      }
      if (st.d >= endD - 0.05) finish();
    }
    track.at(st.d, fr);
    tag = fr.tag || {};
    sfx.stream(running ? flowFn(st.d) : 1.5, 1);

    // ---------------------------------------- moments along the way
    if (running) {
      if (tag.lift) {
        st.clack -= dt;
        if (st.clack <= 0) {
          st.clack = 0.28;
          sfx.clack();
        }
      }
      // the last lift: Homama's hands on Roji's shoulders and a sweet word at the top
      const lastLift = top && st.d > top.d0 - 26 && st.d < top.d1;
      crew.st.shoulders = damp(crew.st.shoulders, lastLift && crew.st.duck < 0.3 ? 1 : 0, 3, dt);
      if (top && st.d > top.d0 - 12 && !st.saidTop) {
        st.saidTop = true;
        const lines = [
          'Homama: Whatever happens down there, I have got you, Roji.',
          'Homama: Look, Roji, you can see all of Roji Land from up here.',
          'Homama: Hands up with me, Doctor Roji. Here we go!',
        ];
        flow.say(lines[Math.floor(R() * lines.length)], 2800);
        sfx.sweet();
      }
      crew.st.look = damp(crew.st.look, top && st.d > top.d0 - 6 && st.d < top.d1 ? Math.sin(st.t * 0.8) : 0, 2, dt);
      // the drops: hands up and a scream
      const dropping = (tag.drop || has(tag.name, 'dip')) && fr.f.y < -0.15;
      crew.st.hands = damp(crew.st.hands, dropping && crew.st.shield < 0.1 ? 1 : 0, 6, dt);
      crew.st.scream = damp(crew.st.scream, dropping ? 1 : 0, 8, dt);
      if (dropping && st.whee <= 0) {
        st.whee = 4;
        sfx.whee(tag.drop ? 1 : 0.6);
      }
      st.whee -= dt;
      if (dropPart && !st.photoDone && st.d > dropPart.d0 + (dropPart.d1 - dropPart.d0) * 0.62 && st.d < dropPart.d1) {
        st.photoDone = true;
        crew.pose(0, t);
        takePhoto();
      }
      // the shield comes up just before the bottom
      const shieldOn = st.shieldMode === 'shield' && dropPart && st.d > dropPart.d0 + (dropPart.d1 - dropPart.d0) * 0.7 && st.afterSplash < 2.4;
      crew.st.shield = damp(crew.st.shield, shieldOn ? 1 : 0, 7, dt);
      shield.visible = crew.st.shield > 0.05;
      if (shield.visible) {
        shield.position.set(0, log.front.y + 1.55 + crew.st.shield * 0.12, log.front.z + 0.05);
        shield.rotation.set(-0.2, 0, 0);
        shield.scale.setScalar(0.3 + crew.st.shield * 0.7);
      }
      // the little dip: a splash at the bottom
      for (const p of parts) {
        if (!has(p.tag.name, 'dip') || st.dipDone.has(p)) continue;
        if (st.d > p.d1 - 0.2) {
          st.dipDone.add(p);
          logPos(lp);
          water.splash(lp.clone().addScaledVector(fr.f, 0.6), 36, { speed: 3, up: 4, size: 1 });
          for (const s of [-1, 1]) water.spray(lp.clone().addScaledVector(fr.l, s * 1.0), v2.copy(fr.l).multiplyScalar(s * 2).add(v.set(0, 3.5, 0)), 14, { spread: 1.5 });
          sfx.splash(0.8);
          st.shake = 0.5;
        }
      }
      if (pool && st.d > pool.d0 && !st.splashDone) bigSplash();
      if (st.afterSplash >= 0) {
        st.afterSplash += dt;
        if (st.shieldMode === 'shield' && st.afterSplash > 1.3 && st.afterSplash - dt <= 1.3) {
          // Roji turns round to thank him
          headPos(homama, v);
          fx.heartsAt(v.add(v2.set(0, 0.5, 0)), 6);
          sound.ui('good');
          flow.say('Roji: My hero. A very wet hero.', 2400);
        }
        crew.st.look = st.shieldMode === 'shield' && st.afterSplash > 1.1 && st.afterSplash < 3.6 ? -1 : crew.st.look;
        if (st.afterSplash > 2.2) {
          crew.st.laugh = damp(crew.st.laugh, 0, 1.5, dt);
          crew.st.shake = damp(crew.st.shake, 0, 2, dt);
        }
      }
      // the night cave dims the light so the glow-worms shine
      const inCave = world.caves.some((c) => st.d > c.d0 - 1 && st.d < c.d1 + 1);
      st.cave = damp(st.cave, inCave ? 1 : 0, 2.5, dt);
      const nearCave = world.caves.some((c) => st.d > c.d0 - 12 && st.d < c.d1 + 9);
      st.caveCam = damp(st.caveCam || 0, nearCave ? 1 : 0, 2.5, dt);
      env.hemi.intensity = hemiBase * (1 - st.cave * 0.3);
      if (inCave) tell('cave', 'The glow-worm cave');
    }

    // ---------------------------------------- catching
    logPos(lp);
    if (running) {
      for (const it of items) {
        if (it.got || it.missed) continue;
        if (it.d > st.d + 0.2) break;
        if (it.d < before - 1) continue;
        if (C) {
          // together: the log's copy decides it once it has the steering and the grab of that moment
          if (!it.passAt) {
            it.passAt = now();
            it.passCur = it.cur;
            if (C.owner) C.pend.push({ it, at: it.passAt });
          }
          continue;
        }
        const ok = Math.abs(st.x - it.cur) < 0.52 && (!it.high || crew.st.reach > 0.5);
        if (ok) gotItem(it);
        else missItem(it);
      }
      // tips for the first ones on the first ride
      for (const it of items.slice(0, 4)) {
        if (it.told || it.got || it.missed || course.id !== 'jungle') continue;
        if (it.d - st.d < 18 && it.d > st.d) {
          it.told = true;
          hud.message(C?.mine === 'catch' ? 'Grab it as it reaches you!' : it.high && !C ? 'Reach up!' : it.lane < 0 ? 'Lean left!' : it.lane > 0 ? 'Lean right!' : 'Stay in the middle!', 1200);
        }
      }
      if (C?.mine !== 'steer' && items.some((it) => it.high && !it.got && !it.missed && it.d - st.d < 16 && it.d > st.d)) tell('reach', C ? 'Grab the balloons as they pass!' : 'Reach up for the balloons!');
    }
    crew.st.cheer = damp(crew.st.cheer, 0, 1.4, dt);
    crew.st.heart = damp(crew.st.heart, 0, 1.2, dt);

    // ---------------------------------------- obstacles
    if (running) {
      for (const o of obstacles) {
        if (o.done) continue;
        const ahead = o.d - st.d;
        if (ahead > 40) break;
        // warnings the first time
        if (ahead < 15 && ahead > 0) {
          if (o.type === 'duck') tell(o.what, o.what === 'gate' ? 'Duck under the gate!' : 'Duck!');
          if (o.type === 'falls') tell('falls', 'Find the dry gap!');
          if (o.type === 'float') tell('float' + course.floats, course.floats === 'hippo' ? 'Steer round the hippo!' : course.floats === 'barrel' ? 'Mind the barrels!' : 'Mind the frogs!');
          if (o.type === 'jet') tell('jet', 'Watch the jets!');
        }
        if (o.d > st.d) continue;
        o.done = true;
        if (C) {
          // together: the log's copy decides it once it has the steering or the duck of that moment
          o.passAt = now();
          if (C.owner) C.pend.push({ o, at: o.passAt, fire: o.jet?.state === 'fire' });
          continue;
        }
        outcome(o, passed(o, st.x, crew.st.duck > 0.55, o.jet?.state === 'fire'), st.x);
      }
      if (C?.owner) judge();
      // the jets: aim at the lane the log is in, glow, then fire while it passes (the other copy
      // shows the jets as the log's copy runs them)
      for (const j of C && !C.owner ? [] : jets) {
        const ahead = j.d - st.d;
        if (j.state === 'idle' && ahead < 15 && ahead > 4) {
          j.state = 'warn';
          j.t = 0;
          j.target = Math.round(clamp(st.x, -1, 1));
          track.at(j.d, fr);
          warn.position.copy(fr.p).addScaledVector(fr.l, -j.target * LANE).add(v.set(0, 0.04, 0));
        }
        if (j.state === 'warn') {
          j.t += dt;
          warnMat.opacity = 0.4 + Math.sin(st.t * 14) * 0.3;
          warn.scale.setScalar(1 + Math.sin(st.t * 10) * 0.12);
          if (j.t > 0.9 || ahead < 3) {
            j.state = 'fire';
            j.t = 0;
            j.mesh = jetArc(j);
            scene.add(j.mesh);
            sfx.squirt();
            warnMat.opacity = 0;
          }
        }
        if (j.state === 'fire') {
          j.t += dt;
          const end = j.mesh.userData.curve.v2;
          if (Math.random() < 0.5) water.spray(end, v.set(0, 2.2, 0), 2, { spread: 1.4, floor: end.y - 0.05 });
          if (j.t > 2.4 || ahead < -6) {
            j.state = 'done';
            j.mesh.removeFromParent();
            j.mesh.geometry.dispose();
            j.mesh = null;
          }
        }
      }
      if (C && !C.owner) {
        for (const j of jets) {
          if (j.state === 'warn') {
            warnMat.opacity = 0.4 + Math.sin(st.t * 14) * 0.3;
            warn.scale.setScalar(1 + Math.sin(st.t * 10) * 0.12);
          }
          if (j.state === 'fire' && j.mesh && Math.random() < 0.5) {
            const end = j.mesh.userData.curve.v2;
            water.spray(end, v.set(0, 2.2, 0), 2, { spread: 1.4, floor: end.y - 0.05 });
          }
        }
      }
    }
    if (C) shareNow();
    for (const o of floats) {
      track.at(o.d, fr);
      o.f.root.position.copy(fr.p).addScaledVector(fr.l, -o.lane * LANE);
      o.f.root.rotation.y = Math.atan2(-fr.f.x, -fr.f.z);
      o.f.update(dt, t, o.ph);
    }

    // ---------------------------------------- pickups spin and bob
    for (const it of items) {
      const m = inst[it.model];
      if (it.got || it.d < st.d - 4 || it.d > st.d + 80) {
        m.setMatrixAt(it.slot, zero);
        continue;
      }
      itemPos(it, v, t);
      q.setFromAxisAngle(Y, t * 2.2 + it.ph);
      const s = it.missed ? 0.6 : 1 + Math.sin(t * 5 + it.ph) * 0.06;
      m.setMatrixAt(it.slot, m4.compose(v, q, sc.setScalar(s)));
    }
    for (const m of Object.values(inst)) m.instanceMatrix.needsUpdate = true;
    let vi = 0;
    for (const it of items) {
      if (!it.high || it.got || it.d < st.d - 4 || it.d > st.d + 80) continue;
      itemPos(it, v, t);
      v.y += 0.22;
      strings.setMatrixAt(vi, m4.compose(v, q.identity(), sc.set(1, 0.85, 1)));
      v.y += 0.85 + 0.3;
      v.x += Math.sin(t * 1.3 + it.ph) * 0.05;
      balloons.setMatrixAt(vi, m4.compose(v, q.setFromAxisAngle(fr.f, Math.sin(t * 1.1 + it.ph) * 0.12), sc.setScalar(1)));
      vi++;
    }
    strings.count = balloons.count = vi;
    strings.instanceMatrix.needsUpdate = true;
    balloons.instanceMatrix.needsUpdate = true;

    // ---------------------------------------- the log, the kids, the reach ring
    track.at(st.d, fr);
    const bob = Math.sin(t * 2.1) * 0.03 + Math.sin(t * 3.3) * 0.015;
    m4.makeBasis(fr.l, fr.u, fr.f).setPosition(lp);
    log.root.matrix.copy(m4);
    log.root.matrixWorldNeedsUpdate = true;
    log.body.position.set(0, bob, 0);
    log.body.rotation.set(Math.sin(t * 1.7) * 0.02, -st.xv * 0.05, st.xv * 0.035 + Math.sin(t * 1.3) * 0.02);
    crew.pose(dt, t);
    // a leaf stuck in the hair after a bonk
    if (st.leafT > 0) st.leafT -= dt;
    ring.position.copy(lp).addScaledVector(fr.f, 2.4).addScaledVector(fr.u, 0.75);
    ring.quaternion.setFromUnitVectors(v.set(0, 0, 1), fr.f);
    ring.visible = running && !(pool && st.d > pool.d0 - 20);
    // drips while wet
    if (st.wetT > 0) {
      st.wetT -= dt;
      if (Math.random() < 0.5) {
        headPos(Math.random() < 0.5 || st.shieldMode === 'soak' || !st.splashDone ? me : homama, v);
        if (st.splashDone && st.shieldMode === 'shield') headPos(homama, v);
        water.spray(v.add(v2.set((Math.random() - 0.5) * 0.3, -0.1, (Math.random() - 0.5) * 0.3)), v2.set(0, -0.5, 0), 1, { spread: 0.2, size: 0.5 });
      }
    }
    if (st.splashDone && st.shieldMode === 'shield' && st.afterSplash < 4 && Math.random() < 0.6) {
      headPos(homama, v);
      water.spray(v.add(v2.set((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4)), v2.set(0, -0.4, 0), 1, { spread: 0.2, size: 0.55 });
    }

    // ---------------------------------------- camera
    const dropping = fr.f.y < -0.2;
    // low and close inside the cave, so the camera stays under its roof
    const back = (st.phase === 'ready' ? 6.4 : dropping ? 5.2 : 5.9) * (1 - (st.caveCam || 0) * 0.25);
    const up = (st.phase === 'ready' ? 3.9 : 3.7) * (1 - (st.caveCam || 0) * 0.5);
    // stay behind the log along the slope (up the lifts and down the drops), but not too steeply
    const fwd = v2.copy(fr.f);
    fwd.y = clamp(fwd.y, -0.55, 0.22);
    fwd.normalize();
    const wantPos = v.copy(lp).addScaledVector(fwd, -back).addScaledVector(Y, up + (dropping ? 0.8 : 0));
    const rate = dropping ? 5 : 3.2;
    camPos.x = damp(camPos.x, wantPos.x, rate, dt);
    camPos.y = damp(camPos.y, wantPos.y, rate, dt);
    camPos.z = damp(camPos.z, wantPos.z, rate, dt);
    const wantLook = tmp.copy(lp).addScaledVector(fr.f, dropping ? 7 : 5.5).addScaledVector(Y, 0.7);
    camLook.x = damp(camLook.x, wantLook.x, 6, dt);
    camLook.y = damp(camLook.y, wantLook.y, 6, dt);
    camLook.z = damp(camLook.z, wantLook.z, 6, dt);
    st.shake = Math.max(0, st.shake - dt * 1.6);
    camera.position.copy(camPos);
    if (st.shake > 0) camera.position.add(v.set((Math.random() - 0.5) * st.shake * 0.25, (Math.random() - 0.5) * st.shake * 0.25, 0));
    camera.up.set(0, 1, 0);
    camera.lookAt(camLook);
    env.follow(lp);
    world.update(dt, t, camPos);
    water.update(dt);
    if (fireworks) {
      // the fireworks go up ahead of the log, where the camera looks
      fireworks.area.x = lp.x + fwd.x * 34;
      fireworks.area.z = lp.z + fwd.z * 34;
      fireworks.update(dt);
    }
    if (world.flashBulb) world.flashBulb.material.color.lerp(new THREE.Color('#fff6d8'), 1 - Math.exp(-3 * dt));
  };

  // where an item floats or hangs
  function itemPos(it, out, t) {
    track.at(it.d, fr);
    let lv = it.lane;
    if (it.moving) lv = it.lane === 0 ? Math.sin(t * 1.1 + it.ph) : it.lane * (0.55 + 0.45 * Math.sin(t * 1.3 + it.ph));
    it.cur = lv;
    out.copy(fr.p).addScaledVector(fr.l, -lv * LANE).addScaledVector(Y, (it.high ? 1.9 : 0.72) + Math.sin(t * 3 + it.ph) * 0.06);
    return out;
  }

  return {
    update,
    dispose() {
      sfx.stop();
      for (const j of jets) j.mesh?.geometry.dispose();
    },
  };
}
