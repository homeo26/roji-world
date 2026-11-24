import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { STOPS } from './config.js';
import { World, islandSdf, PADS, FUTURE, CAR_SPOT } from './world.js';
import { Station, BUILDERS, makePony } from './stations.js';
import { buildYumYum, buildPlaza } from './places.js';
import { Kid } from './kid.js';
import { Car } from './car.js';
import { Effects } from './fx.js';
import { Sound } from './audio.js';
import { Input } from './input.js';
import { UI, Minimap } from './ui.js';
import { loadLooks, saveLooks } from './looks.js';
import { avatar } from './games/avatar.js';
import { openGame } from './games/shell.js';
import { GAMES, gamesAt } from './games/registry.js';
import { damp, dampAngle, clamp, canvasTexture, easeInOut, Tweens, bakeStatic } from './util.js';
import { ICONS } from './icons.js';
import { Daylight, TIME_CHOICES } from './engine/daylight.js';
import { choose } from './engine/choose.js';
import { Physics } from './engine/physics.js';
import { Spaces } from './engine/spaces.js';
import { Activities } from './engine/activities.js';
import { ArenaHost } from './engine/arena.js';
import { loadProps } from './engine/props.js';
import { ARENAS } from './engine/manifest.js';
import { makeActor, stepWalker, stepVertical, tryJump, faceTo, syncKid, airOf, RADIUS } from './engine/movement.js';

const STORE = 'roji-weekends-stamps-v1';
const PLAYER_KEY = 'roji-weekends-player';
const params = new URLSearchParams(location.search);

await Promise.race([document.fonts.load('600 40px Fredoka'), new Promise((r) => setTimeout(r, 1500))]);

// ------------------------------------------------------------------ renderer and scene
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('capture') });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const SKY = new THREE.Color('#a6dde2');
const INSIDE_NIGHT = new THREE.Color('#3b3560');
scene.background = SKY.clone();
scene.fog = new THREE.Fog(SKY.clone(), 42, 120);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.3;
const hemi = new THREE.HemisphereLight('#fff6ea', '#7fae74', 1.35);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0d8', 2.5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.04;
sun.shadow.radius = 2;
const DEFAULT_OFFSET = new THREE.Vector3(-11, 22, 12);
const SUN_OFFSET = DEFAULT_OFFSET.clone(); // follows the sun (or the moon) over the day
const setShadowBox = (half) => {
  const c = sun.shadow.camera;
  c.left = c.bottom = -half;
  c.right = c.top = half;
  c.near = 1;
  c.far = 70;
  c.updateProjectionMatrix();
};
setShadowBox(46);
scene.add(sun, sun.target);
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 260);

// ------------------------------------------------------------------ world, physics, the shared game object
const world = new World(scene);
const physics = new Physics(world.colliders);
const fx = new Effects(scene);
fx.initExtras();
const tweens = new Tweens();
const sound = new Sound();
const looks = loadLooks();
let playerId = params.get('as') || localStorage.getItem(PLAYER_KEY) || 'roji';
if (!looks[playerId]) playerId = 'roji';
const otherId = (id) => (id === 'roji' ? 'homama' : 'roji');
let started = false;
let gameOpen = false;
let wardrobeTarget = null;
let nightTarget = 0;
let focus = null;
let elapsed = 0;

const game = {
  scene,
  physics,
  ground: world.groundFx,
  looks,
  sound,
  fx,
  actors: {},
  props: loadProps(),
  playerId: () => playerId,
  toast: (html, ms) => ui.toast(html, ms),
  time: () => elapsed,
  emote: (a, type) => a?.kid.emote(type),
  setNight: (k) => (nightTarget = k),
  setFocus: (spec) => (focus = spec),
  fade: (fn) => fadeThen(fn),
  onEnterInterior: (space) => onEnterInterior(space),
  onExitInterior: (space) => onExitInterior(space),
  playArena: (id, opts) => playArena(id, opts),
  openWardrobe: () => openWardrobe(),
};
game.activities = new Activities(game);
const spaces = new Spaces(game);
game.spaces = spaces;

// Island edge, unless we are inside a building far away
const islandBounds = (p, r, v, bounce) => {
  const s = islandSdf(p.x, p.z);
  const margin = -0.9 - r;
  if (s <= margin) return;
  const e = 0.05;
  let gx = islandSdf(p.x + e, p.z) - islandSdf(p.x - e, p.z);
  let gz = islandSdf(p.x, p.z + e) - islandSdf(p.x, p.z - e);
  const gl = Math.hypot(gx, gz) || 1;
  gx /= gl;
  gz /= gl;
  p.x -= gx * (s - margin);
  p.z -= gz * (s - margin);
  const into = v.x * gx + v.z * gz;
  if (into > 0) {
    v.x -= gx * into * (1 + bounce);
    v.z -= gz * into * (1 + bounce);
  }
};
physics.bounds = (p, r, v, bounce) => {
  if (!spaces.inside && p.x < 300) islandBounds(p, r, v, bounce);
};

// Places and interiors from src/engine/manifest.js (modules that are missing are skipped)
await spaces.load();
const hasHome = !!spaces.byId.home;

// ------------------------------------------------------------------ stations: weekends, town places, city places
const builders = { ...BUILDERS, yumyum: buildYumYum, plaza: buildPlaza };
if (hasHome) builders.home = null;
const stations = STOPS.map((stop) => new Station(world, scene, stop, builders[stop.id], stop.id === 'home' && hasHome ? { badgeY: 7.6 } : {}));
for (const sp of spaces.places) {
  if (sp.id === 'home') continue;
  const stop = { id: sp.id, kind: 'place', title: sp.id, tag: 'Place', icon: 'star', color: '#21a99a', text: '', ...sp.stop, id: sp.id, kind: 'place' };
  if (!ICONS[stop.icon]) stop.icon = 'star';
  stations.push(new Station(world, scene, stop, null, { pad: [sp.pad.x, sp.pad.z], origin: [sp.origin.x, sp.origin.z], badgeY: sp.inst.badgeY ?? 6.5 }));
}
const byId = Object.fromEntries(stations.map((s) => [s.stop.id, s]));
const plazaSign = world.sign(['Play Park'], { width: 2.2, height: 0.8, accent: '#21a99a', postHeight: 0.8 });
plazaSign.position.set(PADS.plaza[0] + 3.2, 0, PADS.plaza[1] - 1.8);
plazaSign.scale.setScalar(0.9);
world.statics.add(plazaSign);
world.addCollider({ type: 'box', x: PADS.plaza[0] + 3.2, z: PADS.plaza[1] - 1.86, hw: 0.9, hd: 0.15 });
const keepOut = [];
for (const s of stations) {
  const big = s.stop.kind === 'place' ? 6.6 : 5.4;
  if (!spaces.byId[s.stop.id]) keepOut.push({ x: s.origin.x, z: s.origin.z, r: big });
  keepOut.push({ x: s.pad.x, z: s.pad.z, r: 2.9 }, { x: s.pad.x - 3.3, z: s.pad.z - 2, r: 1.6 });
}
for (const [fx_, fz] of FUTURE) keepOut.push({ x: fx_, z: fz - 5.5, r: 3.2 }, { x: fx_, z: fz, r: 2.6 });
keepOut.push({ x: CAR_SPOT[0], z: CAR_SPOT[1], r: 3.4 }, { x: PADS.plaza[0] + 3.2, z: PADS.plaza[1] - 1.8, r: 1.6 });
const rects = spaces.places.map((s) => ({ x: s.origin.x, z: s.origin.z, hw: s.size.w / 2 + 1.2, hd: s.size.d / 2 + 1.2 }));
world.scatterNature(keepOut, rects);
bakeStatic(world.statics, [], mergeGeometries);

// ------------------------------------------------------------------ day and night
const daylight = new Daylight({ override: params.get('time') });
// Signs, lamps and lit windows glow brighter after dark
const glowMats = new Map();
const collectGlow = (root) =>
  root.traverse((o) => {
    if (!o.isMesh && !o.isInstancedMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m?.emissive || glowMats.has(m) || m === world.lampGlowMat) continue;
      if (m.emissiveIntensity > 0 && (m.emissive.r + m.emissive.g + m.emissive.b > 0.15 || m.emissiveMap)) glowMats.set(m, m.emissiveIntensity);
    }
  });
collectGlow(world.statics);
for (const st of stations) collectGlow(st.group);
for (const sp of spaces.places) collectGlow(sp.inst.group);
const clockEl = document.getElementById('clock');
const SUN_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>';
const MOON_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>';
let clockKey = '';
function updateClock() {
  const L = daylight.label();
  const key = L.time + L.phase + L.mode;
  if (key === clockKey) return;
  clockKey = key;
  const fixed = L.mode !== 'live';
  clockEl.innerHTML = `${L.night ? MOON_ICON : SUN_ICON}<span class="c-time">${L.time}</span><span class="c-phase">${L.phase}${fixed ? (L.mode === 'fast' ? ' · fast' : ' · set') : ''}</span>`;
  clockEl.classList.toggle('night', L.night);
  document.body.classList.toggle('night-time', L.night);
}
clockEl.addEventListener('click', async () => {
  sound.ui('tap');
  const L = daylight.label();
  const id = await choose({ title: 'Time of day', text: `Roji World follows your clock. It is ${L.time}, ${L.phase.toLowerCase()} here.`, options: TIME_CHOICES });
  if (!id) return;
  daylight.setMode(id);
  clockKey = '';
  const names = { live: 'Back to your own clock', fast: 'A whole day goes by in four minutes' };
  ui.toast(names[id] || `Now it is ${TIME_CHOICES.find((c) => c.id === id)?.label.toLowerCase()}`, 2400);
});
const skyTintEl = document.getElementById('skytint');
let skyTintKey = '';
function setSkyTint(day) {
  const a = day ? day.tintA : 0;
  const c = day ? day.tint : null;
  const key = c ? `${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}|${a.toFixed(2)}` : '|0';
  if (key === skyTintKey) return;
  skyTintKey = key;
  const [rgb, alpha] = key.split('|');
  if (rgb) skyTintEl.style.setProperty('--tint', rgb);
  skyTintEl.style.setProperty('--tint-a', alpha);
}
const greeting = () => {
  const h = daylight.state.hour;
  return h < 5 || h >= 22 ? 'Good night' : h < 12 ? 'Good morning' : h < 17.5 ? 'Good afternoon' : 'Good evening';
};

// ------------------------------------------------------------------ the two kids
const headPos = (kid) => kid.head.localToWorld(new THREE.Vector3(0, 0.75, 0));
function addActor(id, x, z, yaw) {
  const kid = new Kid(looks[id]);
  scene.add(kid.root);
  kid.onEmoteFx = (type, k) => fx.heartsAt(headPos(k), 4);
  return makeActor(id, kid, x, z, yaw);
}
const home = byId.home.pad;
const actors = game.actors;
actors.roji = addActor('roji', home.x + 0.3, home.z + 0.3, Math.PI * 0.75);
actors.homama = addActor('homama', home.x + 1.3, home.z + 0.6, Math.PI * 0.85);
const P = () => actors[playerId];
const C = () => actors[otherId(playerId)];
let holding = false;
// Hand holding: which side the partner walks on (1 left, -1 right, 0 not chosen yet), whether the hands
// are joined right now, and how long something has been in the partner's way
let holdSign = 0;
let holdGrip = false;
let holdBlocked = 0;
const HOLD_GAP = 0.64;
let mount = null; // { type: 'car' } or { type: 'pony', ctl, walker }

// ------------------------------------------------------------------ car
const car = new Car('#ff8fb1');
car.yaw = -0.5;
car.root.position.set(CAR_SPOT[0], 0, CAR_SPOT[1]);
car.root.rotation.y = car.yaw;
scene.add(car.root);
const carCollider = { type: 'circle', x: CAR_SPOT[0], z: CAR_SPOT[1], r: 1.1, isCar: true, h: 1.25 };
world.addCollider(carCollider);

// ------------------------------------------------------------------ beach balls
const ballTex = canvasTexture(256, 128, (ctx, w, h) => {
  const cols = ['#ef5b6f', '#ffffff', '#ffd166', '#ffffff', '#3f7bf0', '#ffffff'];
  cols.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect((i * w) / cols.length, 0, w / cols.length + 1, h);
  });
});
const balls = [
  [home.x + 3.2, home.z + 2.2],
  [PADS.boardgames[0] - 3.5, PADS.boardgames[1] + 1.6],
  [PADS.horse[0] + 4.2, PADS.horse[1] + 1.5],
  [PADS.plaza[0] - 3.5, PADS.plaza[1] + 1.2],
].map(([x, z]) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 16), new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.35 }));
  m.castShadow = true;
  m.position.set(x, 0.36, z);
  scene.add(m);
  return { m, v: new THREE.Vector3(), r: 0.36 };
});

// ------------------------------------------------------------------ progress
let stamps = new Set();
try {
  stamps = new Set(JSON.parse(localStorage.getItem(STORE) || '[]'));
} catch {
  stamps = new Set();
}
const weeks = stations.filter((s) => s.stop.week);
const save = () => localStorage.setItem(STORE, JSON.stringify([...stamps]));
const refreshTrail = () => {
  let last = null;
  for (const s of weeks) {
    if (!s.unlocked || !stamps.has(s.stop.id)) break;
    last = s.stop.id;
  }
  world.setTrailTo(last);
};
stations.forEach((s) => s.refresh(stamps.has(s.stop.id)));
refreshTrail();
const nextStopAfter = (id) => {
  const i = weeks.findIndex((s) => s.stop.id === id);
  const later = weeks.slice(i + 1);
  return (later.find((s) => s.unlocked && !stamps.has(s.stop.id)) || later[0])?.stop;
};

// ------------------------------------------------------------------ routes: a graph over every path and street
const graph = (() => {
  const nodes = [];
  const lists = [world.samples, world.townSamples, world.futureSamples, ...world.cityRoads];
  lists.forEach((list, li) => {
    let prev = null;
    for (let i = 0; i < list.length; i += 2) {
      const n = { x: list[i].x, z: list[i].z, li, adj: [] };
      nodes.push(n);
      if (prev) {
        const d = Math.hypot(n.x - prev.x, n.z - prev.z);
        n.adj.push([prev, d]);
        prev.adj.push([n, d]);
      }
      prev = n;
    }
  });
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (a.li === b.li) continue;
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      if (d < 1.9) {
        a.adj.push([b, d]);
        b.adj.push([a, d]);
      }
    }
  }
  return nodes;
})();
const nearestNode = (x, z) => {
  let best = null;
  let bd = Infinity;
  for (const n of graph) {
    const d = (n.x - x) ** 2 + (n.z - z) ** 2;
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  return best;
};
function route(from, to) {
  const a = nearestNode(from.x, from.z);
  const b = nearestNode(to.x, to.z);
  const dist = new Map([[a, 0]]);
  const prev = new Map();
  const open = [a];
  const done = new Set();
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (dist.get(open[i]) < dist.get(open[bi])) bi = i;
    const n = open.splice(bi, 1)[0];
    if (n === b) break;
    if (done.has(n)) continue;
    done.add(n);
    for (const [m, w] of n.adj) {
      const nd = dist.get(n) + w;
      if (nd < (dist.get(m) ?? Infinity)) {
        dist.set(m, nd);
        prev.set(m, n);
        open.push(m);
      }
    }
  }
  const out = [];
  for (let n = b; n; n = prev.get(n)) out.unshift(new THREE.Vector3(n.x, 0, n.z));
  return out.filter((_, i) => i % 3 === 0 || i === out.length - 1);
}
let waypoints = [];
let pendingEnter = null;
function travelTo(id) {
  const st = byId[id];
  if (!st || spaces.inside || game.activities.active) return;
  waypoints = [...route(P().pos, st.pad), st.pad.clone()];
  fx.showMarker(st.pad);
}

// ------------------------------------------------------------------ games: 3D first, the old 2D ones only where no 3D version exists yet
const arena = new ArenaHost({
  renderer,
  sound,
  input: null, // set below once Input exists
  looks,
  models: { pony: (coat) => makePony(coat) },
});
game.arena = arena;
// On slow phones the games finish loading after the first card shows, so redraw it then
arena.preload().then(() => {
  if (currentStation && !spaces.inside) {
    ui.refreshCard();
    showStationCard(currentStation);
  }
});
const gamesFor = (placeId) => [
  ...ARENAS.filter((a) => !a.dev && a.place === placeId && arena.mods[a.id]).map((a) => arena.meta(a.id)),
  ...gamesAt(placeId).filter((g) => !arena.mods[g.id]),
];
const allGames = () => [...ARENAS.filter((a) => !a.dev && arena.mods[a.id]).map((a) => arena.meta(a.id)), ...GAMES.filter((g) => !arena.mods[g.id])];

// ------------------------------------------------------------------ UI
const ui = new UI({
  onAction: (act) => action(act),
  onTravel: (id) => {
    if (!started) return;
    if (mount) dismount();
    if (spaces.inside) {
      spaces.exit();
      setTimeout(() => travelTo(id), 500);
      return;
    }
    travelTo(id);
  },
  onToggleSound: () => {
    sound.setMuted(!sound.muted);
    ui.setSound(sound.muted);
  },
  onReset: () => {
    stamps.clear();
    save();
    stations.forEach((s) => s.refresh(false));
    refreshTrail();
    ui.hideCard();
    ui.toast('Progress cleared. The journey starts again.');
  },
  onWardrobe: () => openWardrobe(),
  onSwap: () => swapPlayer(),
  onEmote: (type) => emote(type),
  onHands: () => toggleHands(),
  onJump: () => jump(),
  onPlay: (id) => playGame(id),
  onFullscreen: () => toggleFullscreen(),
  journalData: () => ({ stations, stamps, gamesAt: gamesFor }),
});
ui.setSound(sound.muted);
ui.setPlayer(looks[playerId], looks[otherId(playerId)]);
const minimap = new Minimap(document.getElementById('minimap'), world, stations);
minimap.places = spaces.places.map((s) => ({ x: s.origin.x, z: s.origin.z, w: s.size.w, d: s.size.d, color: s.stop.color || '#21a99a' }));
const toast = (t, ms) => ui.toast(t, ms);

// ------------------------------------------------------------------ hotspots
const horse = byId.horse;
const gate = new THREE.Vector3(horse.origin.x, 0, horse.origin.z + 3.6);
const homeSt = byId.home;
const plaza = byId.plaza;
const kiosk = new THREE.Vector3(plaza.origin.x - 1.2, 0, plaza.origin.z - 2.6);
const homeDoor = () => spaces.interiors.home?.door || homeSt.door;
const hot = (pos, r, label, icon, act, when = () => true) => ({
  get pos() {
    return pos();
  },
  r,
  label,
  icon,
  act,
  when,
});
const danceFloor = new THREE.Vector3(plaza.danceFloor.x, 0, plaza.danceFloor.z);
const townHotspots = [
  hot(() => car.root.position, 2.6, 'Drive the car', 'car', () => enterCar()),
  hot(() => gate, 1.8, 'Ride the pony', 'horse', () => mountPony()),
  hot(() => homeDoor(), 1.5, 'Go inside', 'door', () => enterPlace('home'), () => !hasHome || !spaces.interiors.home),
  hot(() => plaza.fountain, 2.6, 'Make a wish', 'star', () => makeWish()),
  hot(() => kiosk, 1.6, 'Arcade games', 'game', () => ui.openGames('Arcade', allGames())),
  {
    pos: danceFloor,
    inside: (p) => Math.abs(p.x - plaza.danceFloor.x) < plaza.danceFloor.half && Math.abs(p.z - plaza.danceFloor.z) < plaza.danceFloor.half,
    label: 'Dance together',
    icon: 'music',
    act: () => startDance(),
    when: () => true,
  },
];
function currentHotspot() {
  const p = P().pos;
  const list = spaces.inside ? spaces.hotspots() : [...townHotspots, ...spaces.hotspots()];
  let best = null;
  let bd = Infinity;
  for (const h of list) {
    if (!h.when()) continue;
    if (h.inside) {
      if (h.inside(p)) return h;
      continue;
    }
    const hp = h.pos;
    const d = Math.hypot(p.x - hp.x, p.z - hp.z);
    if (d < h.r && d < bd) {
      bd = d;
      best = h;
    }
  }
  return best;
}

// ------------------------------------------------------------------ actions
let currentStation = null;
let currentHot = null;
function action(act = 'auto') {
  if (!started || gameOpen) return;
  if (act === 'auto' && ui.panelOpen) return;
  if (act === 'auto') {
    if (game.activities.active) return game.activities.end();
    if (mount) return dismount();
    if (currentHot) return currentHot.act();
    if (currentStation) {
      const s = currentStation.stop;
      if (s.kind === 'start') act = 'inside';
      else if (s.kind === 'place') {
        const gs = gamesFor(s.id);
        act = spaces.interiors[s.id] ? 'enter' : gs.length === 1 ? 'game:' + gs[0].id : gs.length ? 'games' : 'none';
      } else if (!currentStation.unlocked) act = 'locked';
      else act = stamps.has(s.id) ? 'travel-next' : 'stamp';
    } else return;
  }
  const st = currentStation;
  if (act === 'none') return;
  if (act.startsWith('game:')) return playGame(act.slice(5));
  if (act === 'games' && st) return ui.openGames(st.stop.title, gamesFor(st.stop.id));
  if (act === 'notes' && st) return ui.openNotes(st.stop.id);
  if (act === 'ride') return mountPony();
  if (act === 'inside') return enterPlace('home');
  if (act === 'enter' && st) return enterPlace(st.stop.id);
  if (act === 'travel-next' && st) {
    const next = st.stop.kind === 'start' ? weeks.find((s) => s.unlocked && !stamps.has(s.stop.id))?.stop || weeks[0].stop : nextStopAfter(st.stop.id);
    if (next) travelTo(next.id);
    return;
  }
  if (!st) return;
  if (act === 'unstamp' && stamps.has(st.stop.id)) {
    stamps.delete(st.stop.id);
    save();
    st.refresh(false);
    refreshTrail();
    sound.ui('swoosh');
    ui.refreshCard();
    showStationCard(st);
    ui.updateJourney(stations, stamps, st.stop.id);
    toast('Stamp taken off. You can collect it again any time.', 2600);
    return;
  }
  if (act === 'locked' || !st.unlocked) {
    sound.locked();
    ui.shakeCard();
    return;
  }
  if (act === 'stamp' && !stamps.has(st.stop.id)) {
    const stop = st.stop;
    stamps.add(stop.id);
    save();
    st.refresh(true);
    refreshTrail();
    sound.stamp();
    ui.stampCard();
    ui.popChip(stop.id);
    P().kid.emote('cheer');
    setTimeout(() => C().kid.emote('cheer'), 250);
    fx.burst(new THREE.Vector3(st.pad.x, 1.2, st.pad.z), [stop.color, '#ffd166', '#ffffff', '#ff8fb1', '#7fd3ff']);
    setTimeout(() => {
      ui.refreshCard();
      showStationCard(st);
    }, 700);
    const open = weeks.filter((s) => s.unlocked);
    if (open.every((s) => stamps.has(s.stop.id))) setTimeout(() => toast(`<b>All ${open.length} weekends collected!</b> A new adventure unlocks next week.`, 6000), 1200);
  }
}

// Walk to a building's door, then go in
function enterPlace(id) {
  const rec = spaces.interiors[id];
  if (!rec) {
    toast('This door opens soon.', 2000);
    return;
  }
  const d = rec.door;
  if (Math.hypot(P().pos.x - d.x, P().pos.z - d.z) < 1.8) {
    spaces.enter(id);
    return;
  }
  waypoints = [...route(P().pos, d), d.clone().add(new THREE.Vector3(0, 0, 0.6))];
  pendingEnter = id;
}

function showStationCard(st) {
  const id = st.stop.id;
  const rec = spaces.interiors[id];
  ui.showCard(st, { stamped: stamps.has(id), nextStop: nextStopAfter(id), games: st.unlocked ? gamesFor(id) : [], ride: id === 'horse', inside: !!rec, insideLocked: rec?.locked() ? rec.lockedLabel : null });
}

function playGame(id) {
  if (gameOpen) return;
  // Wait for a 3D game that is still loading; the 2D version is only a fallback if it fails
  if (arena.has(id)) return playArena(id).then((r) => (r === null && !arena.has(id) && GAMES.some((g) => g.id === id) ? playGame(id) : r));
  gameOpen = true;
  input.enabled = false;
  input.keys.clear();
  waypoints = [];
  ui.closePanels();
  sound.setMusicLevel(0.2);
  openGame(id, {
    me: looks[playerId],
    partner: looks[otherId(playerId)],
    sound,
    onClose: (result) => {
      gameOpen = false;
      input.enabled = true;
      sound.setMusicLevel(1);
      celebrate(result);
    },
  });
}

async function playArena(id, opts = {}) {
  if (gameOpen || arena.active) return null;
  gameOpen = true;
  waypoints = [];
  input.keys.clear();
  ui.closePanels();
  ui.hideCard();
  currentStation = null;
  sound.setMusicLevel(0.25);
  const result = await arena.open(id, { me: playerId, ...opts });
  gameOpen = false;
  sound.setMusicLevel(1);
  celebrate(result);
  return result;
}

function celebrate(result) {
  if (result?.win === true) {
    P().kid.emote('cheer');
    setTimeout(() => C().kid.emote('heart'), 300);
  } else if (result && !result.quit) P().kid.emote('wave');
}

const EMOTE_KEYS = ['wave', 'dance', 'spin', 'cheer', 'heart', 'bow'];
function emote(type) {
  if (!started || mount || game.activities.active) return;
  waypoints = [];
  P().kid.emote(type);
  const c = C();
  if (c.pos.distanceTo(P().pos) < 9) setTimeout(() => c.kid.emote(type), 350);
}

function toggleHands() {
  if (!started || mount || game.activities.active) return;
  holding = !holding;
  holdSign = 0;
  holdGrip = false;
  ui.setHands(holding);
  if (holding) toast(`${looks[playerId].name} and ${looks[otherId(playerId)].name} are holding hands`, 2200);
  else {
    P().kid.holdSide = 0;
    C().kid.holdSide = 0;
  }
}

function swapPlayer() {
  if (!started) return;
  if (mount || game.activities.active) {
    toast('Get out first, then switch.');
    return;
  }
  const carried = P().kid.carried;
  playerId = otherId(playerId);
  holdSign = 0;
  holdGrip = false;
  localStorage.setItem(PLAYER_KEY, playerId);
  waypoints = [];
  ui.setPlayer(looks[playerId], looks[otherId(playerId)]);
  P().kid.holdSide = 0;
  C().kid.holdSide = 0;
  P().kid.wave();
  if (carried) void carried;
  toast(`Now playing as <b>${looks[playerId].name}</b>`, 2200);
}

function jump() {
  if (!started || gameOpen) return;
  if (mount?.type === 'car') {
    car.honk();
    sound.honk();
    return;
  }
  if (game.activities.active) return;
  if (mount?.type === 'pony') {
    if (tryJump(mount.walker, { power: 6, allowDouble: false })) sound.jump();
    return;
  }
  const p = P();
  const r = tryJump(p);
  if (!r) return;
  hop(p, r);
  // The partner hops too when holding hands or close by
  const c = C();
  if (c.pos.distanceTo(p.pos) < 3.2 && !c.seated) {
    setTimeout(() => {
      const rc = tryJump(c);
      if (rc) hop(c, rc, true);
    }, holding ? 40 : 160);
  }
}
// A cute hop: stretch up, a little sparkle, and a sparkly flip on the double jump
function hop(a, kind, quiet = false) {
  a.kid.squash = kind === 'double' ? 1.18 : 1.3;
  if (!quiet) {
    if (kind === 'double') {
      if (sound.ctx) sound.tone(660, sound.ctx.currentTime, 0.18, { slideTo: 1320, gain: 0.06, type: 'triangle' });
      sound.ui('pop');
    } else sound.jump();
  }
  if (kind === 'double') fx.burst(new THREE.Vector3(a.pos.x, a.y + 0.8, a.pos.z), ['#ffd166', '#ffffff', '#ff8fb1', '#b9a6ff'], 18);
  else fx.puff(a.pos);
}

const WISHES = [
  'I wish for a hundred more weekends together.',
  'I wish for warm cocoa and a movie tonight.',
  'I wish for a sunny day and a long walk.',
  'I wish we always laugh this much.',
  'I wish for pancakes for breakfast.',
  'I wish the next weekend comes quickly.',
];
function makeWish() {
  const p = P();
  p.kid.emote('heart');
  fx.tossCoin(headPos(p.kid), plaza.fountain.clone().setY(0.6), () => {
    sound.wish();
    fx.burst(plaza.fountain.clone().setY(1.2), ['#ffd166', '#ffffff', '#7fd3ff', '#ff8fb1'], 60);
    toast(WISHES[Math.floor(Math.random() * WISHES.length)], 4200);
  });
}

function startDance() {
  const p = P();
  const c = C();
  const side = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
  game.activities.start({
    label: 'Stop dancing',
    seats: [
      { who: 'player', x: p.pos.x, z: p.pos.z, yaw: p.yaw, pose: 'stand' },
      { who: 'partner', x: p.pos.x + side.x, z: p.pos.z + side.z, yaw: p.yaw, pose: 'stand' },
    ],
    onEnd: () => {
      plaza.dancing = false;
      sound.setParty(false);
    },
  });
  plaza.dancing = true;
  sound.setParty(true);
  for (const a of [p, c]) {
    a.kid.danceLoop = true;
    a.kid.emote('dance');
  }
  toast('Dance party! Move to stop.', 2400);
}

// ------------------------------------------------------------------ car and pony
const leftOf = (yaw, d) => new THREE.Vector3(Math.cos(yaw) * d, 0, -Math.sin(yaw) * d);
function seatKid(a, parent, pos, pose) {
  parent.add(a.kid.root);
  a.kid.root.position.copy(pos);
  a.kid.root.rotation.set(0, 0, 0);
  a.kid.pose = pose;
  a.kid.cancelEmote();
  a.kid.holdSide = 0;
  a.vel.set(0, 0, 0);
}
function unseatKid(a, worldPos, yaw) {
  scene.add(a.kid.root);
  a.pos.copy(worldPos).setY(0);
  physics.resolve(a.pos, RADIUS, a.vel);
  a.yaw = yaw;
  a.y = 0;
  a.vy = 0;
  a.kid.pose = 'stand';
  a.kid.root.rotation.set(0, yaw, 0);
  a.kid.root.position.copy(a.pos);
}
function enterCar() {
  if (mount || spaces.inside) return;
  holding = false;
  ui.setHands(false);
  waypoints = [];
  mount = { type: 'car' };
  const c = C();
  if (c.pos.distanceTo(car.root.position) > 6) fx.poof(c.pos);
  seatKid(P(), car.body, new THREE.Vector3(0.33, 0.66, -0.25), 'drive');
  seatKid(c, car.body, new THREE.Vector3(-0.33, 0.66, -0.25), 'sit');
  sound.engine(true);
  sound.honk();
  toast('Beep beep! Point the stick or the arrows where you want to go. Space honks.', 3200);
}
function exitCar() {
  const y = car.yaw;
  const cp = car.root.position;
  unseatKid(P(), cp.clone().add(leftOf(y, 1.6)), y);
  unseatKid(C(), cp.clone().add(leftOf(y, -1.6)), y);
  car.speed = 0;
  mount = null;
  sound.engine(false);
}
function mountPony() {
  if (mount || spaces.inside) return;
  const ctl = horse.pony;
  holding = false;
  ui.setHands(false);
  waypoints = [];
  const p = P();
  fx.poof(ctl.pony.root.getWorldPosition(new THREE.Vector3()));
  scene.attach(ctl.pony.root);
  ctl.pony.root.position.set(p.pos.x, 0, p.pos.z);
  ctl.pony.root.rotation.set(0, p.yaw, 0);
  ctl.ridden = true;
  const walker = { pos: ctl.pony.root.position, vel: new THREE.Vector3(), y: 0, ground: 0, vy: 0, jumps: 0, flipT: -1, mode: 'walk', surface: null, speed: 0 };
  mount = { type: 'pony', ctl, walker };
  seatKid(p, ctl.pony.root, new THREE.Vector3(0, 1.1, -0.02), 'ride');
  fx.poof(p.pos);
  sound.arrive();
  toast('Giddy up! Space to hop, E to get off.', 2600);
}
function dismountPony() {
  const ctl = mount.ctl;
  const pr = ctl.pony.root;
  const y = pr.rotation.y;
  pr.position.y = 0;
  unseatKid(P(), pr.position.clone().add(leftOf(y, 1.1)), y);
  fx.poof(pr.position);
  horse.group.attach(pr);
  ctl.ridden = false;
  ctl.home();
  pr.rotation.set(0, 0, 0);
  mount = null;
}
function dismount() {
  if (!mount) return;
  if (mount.type === 'car') exitCar();
  else dismountPony();
}

// ------------------------------------------------------------------ interiors
const fadeEl = document.getElementById('fade');
function fadeThen(fn) {
  fadeEl.classList.add('on');
  setTimeout(() => {
    fn();
    setTimeout(() => fadeEl.classList.remove('on'), 60);
  }, 360);
}
function placePair(pos, yaw) {
  const p = P();
  const c = C();
  p.pos.set(pos.x, 0, pos.z);
  c.pos.copy(p.pos).add(leftOf(yaw, 0.9));
  for (const a of [p, c]) {
    a.yaw = yaw;
    a.y = 0;
    a.vy = 0;
    a.vel.set(0, 0, 0);
    a.kid.root.position.copy(a.pos);
  }
  camLook.set(pos.x, 0.9, pos.z);
}
function onEnterInterior(space) {
  if (mount) dismount();
  // Hands stay joined through the door; the partner takes the hand again on the other side
  holdSign = 0;
  holdGrip = false;
  waypoints = [];
  placePair(space.spawn, space.spawnYaw);
  document.body.classList.add('inside');
  world.water.visible = false;
  ui.hideCard();
  currentStation = null;
  setShadowBox(16);
}
function onExitInterior(space) {
  placePair(space.returnTo, 0);
  holdSign = 0;
  holdGrip = false;
  document.body.classList.remove('inside');
  world.water.visible = true;
  nightTarget = 0;
  setShadowBox(20);
}

// ------------------------------------------------------------------ wardrobe
function openWardrobe() {
  if (!started) return;
  ui.closePanels();
  wardrobeTarget = playerId;
  ui.openWardrobe(
    looks,
    playerId,
    (id, look) => {
      wardrobeTarget = id;
      if (look) {
        actors[id].kid.setLook(look);
        saveLooks(looks);
        ui.setPlayer(looks[playerId], looks[otherId(playerId)]);
      }
    },
    () => {
      wardrobeTarget = null;
      camera.clearViewOffset();
    },
  );
}

// ------------------------------------------------------------------ input
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();
const input = new Input(renderer.domElement, {
  onTap: (x, y) => {
    if (mount || game.activities.active || gameOpen) return;
    ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (!spaces.inside) {
      for (const st of stations) {
        if (raycaster.intersectObjects([st.group, st.badge], true).length) {
          travelTo(st.stop.id);
          return;
        }
      }
      if (raycaster.intersectObject(car.root, true).length) {
        waypoints = [car.root.position.clone().add(leftOf(car.yaw, 1.6))];
        return;
      }
    }
    if (raycaster.ray.intersectPlane(groundPlane, hit) && (spaces.inside || islandSdf(hit.x, hit.z) < -0.8)) {
      waypoints = [hit.clone()];
      fx.showMarker(hit);
    }
  },
  onAction: () => action('auto'),
  onJump: () => jump(),
  onZoom: (d) => (zoom = clamp(zoom + d, 0.55, 1.8)),
  onKey: (k, e) => {
    if (gameOpen) return;
    if (k === 'escape') {
      if (ui.closeWardrobe()) return;
      ui.closePanels();
      return;
    }
    if (ui.panelOpen) return;
    if (k === 'm') {
      sound.setMuted(!sound.muted);
      ui.setSound(sound.muted);
    }
    if (k === 'f') toggleFullscreen();
    if (k === 'h') toggleHands();
    if (k === 'tab') {
      e.preventDefault();
      swapPlayer();
    }
    if (k === 'c') openWardrobe();
    if (k === 'j') ui.toggleJournal();
    if (k === '=' || k === '+') zoom = clamp(zoom - 0.1, 0.55, 1.8);
    if (k === '-') zoom = clamp(zoom + 0.1, 0.55, 1.8);
    const n = Number(k);
    if (n >= 1 && n <= EMOTE_KEYS.length) emote(EMOTE_KEYS[n - 1]);
  },
});
input.attachStick(document.getElementById('stick'), document.getElementById('stick-knob'));
arena.input = input;

// ------------------------------------------------------------------ camera
let zoom = 1;
let introBlend = 0;
const camLook = new THREE.Vector3(P().pos.x, 0.9, P().pos.z);
const camPos = new THREE.Vector3();
const followPos = new THREE.Vector3();
const introPos = new THREE.Vector3();
const introLook = new THREE.Vector3(-9, 0, -2);
const desiredLook = new THREE.Vector3();
const lookTmp = new THREE.Vector3();
const offset = new THREE.Vector3(0, 12, 13.5);
const OFFSET_OUT = new THREE.Vector3(0, 12, 13.5);
const OFFSET_IN = new THREE.Vector3(0, 8.2, 10.5);
const camFwd = new THREE.Vector3();
const camRight = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const rollAxis = new THREE.Vector3();
const aspectZoom = () => (camera.aspect < 0.8 ? 1.55 : camera.aspect < 1.2 ? 1.25 : camera.aspect > 2 && window.innerHeight < 520 ? 0.95 : 1);

// Short screens: shift the view up so the player stays above the station card.
const cardEl = document.getElementById('card');
const liftTmp = new THREE.Vector3();
let lift = 0;
function updateLift(target, dt) {
  const h = window.innerHeight;
  let want = 0;
  if (h < 620 && !cardEl.classList.contains('hidden') && introBlend > 0.98) {
    const top = cardEl.getBoundingClientRect().top;
    liftTmp.copy(target).project(camera);
    const feetFull = ((1 - liftTmp.y) / 2) * h + lift;
    want = clamp(feetFull - (top - 14), 0, h * 0.3);
  }
  lift = damp(lift, want, 5, dt);
  if (lift > 0.5) camera.setViewOffset(window.innerWidth, h, 0, lift, window.innerWidth, h);
  else if (camera.view?.enabled) {
    lift = 0;
    camera.clearViewOffset();
  }
}

function updateCamera(dt, t) {
  const p = P();
  const target = mount?.type === 'car' ? car.root.position : mount?.type === 'pony' ? mount.ctl.pony.root.position : p.pos;
  const vel = mount?.type === 'car' ? new THREE.Vector3(Math.sin(car.yaw) * car.speed, 0, Math.cos(car.yaw) * car.speed) : p.vel;
  const lead = mount?.type === 'car' ? 0.45 : 0.22;
  desiredLook.set(target.x + vel.x * lead, 0.9 + (mount ? 0 : p.y * 0.5), target.z + vel.z * lead);
  let z = zoom * aspectZoom();
  const inside = spaces.inside;
  offset.lerp(inside ? OFFSET_IN : OFFSET_OUT, 1 - Math.exp(-4 * dt));
  if (mount?.type === 'car') z *= 1.3;
  if (mount?.type === 'pony') z *= 1.1;
  if (currentStation && !mount && !spaces.byId[currentStation.stop.id]) {
    const o = currentStation.origin;
    desiredLook.x += (o.x - desiredLook.x) * 0.32;
    desiredLook.z += (o.z + 1 - desiredLook.z) * 0.32;
    desiredLook.y = 1.4;
    z *= 1.2;
  }
  if (inside) {
    const b = inside.bounds;
    desiredLook.x = clamp(desiredLook.x, Math.min(b.x0 + 3, (b.x0 + b.x1) / 2), Math.max(b.x1 - 3, (b.x0 + b.x1) / 2));
    desiredLook.z = clamp(desiredLook.z, Math.min(b.z0 + 2, (b.z0 + b.z1) / 2), Math.max(b.z1 - 1.5, (b.z0 + b.z1) / 2));
  }
  if (focus) {
    desiredLook.set(focus.x, focus.y ?? 1, focus.z);
    z = focus.zoom ?? 0.62;
  }
  if (wardrobeTarget) {
    const a = actors[wardrobeTarget];
    const wp = a.kid.root.getWorldPosition(lookTmp);
    desiredLook.set(wp.x, 0.95, wp.z);
    z = 0.36;
    const panel = document.getElementById('wardrobe');
    const pw = panel.classList.contains('hidden') ? 0 : panel.offsetWidth + 12;
    camera.setViewOffset(window.innerWidth, window.innerHeight, -pw / 2, 0, window.innerWidth, window.innerHeight);
  } else updateLift(target, dt);
  const rate = wardrobeTarget ? 6 : 4;
  camLook.x = damp(camLook.x, desiredLook.x, rate, dt);
  camLook.y = damp(camLook.y, desiredLook.y, rate, dt);
  camLook.z = damp(camLook.z, desiredLook.z, rate, dt);
  followPos.copy(camLook).addScaledVector(offset, z);
  const a = t * 0.05 + 0.4;
  introPos.set(introLook.x + Math.sin(a) * 60, 40, introLook.z + Math.cos(a) * 60);
  const k = easeInOut(introBlend);
  camPos.lerpVectors(introPos, followPos, k);
  camera.position.copy(camPos);
  lookTmp.lerpVectors(introLook, camLook, k);
  camera.lookAt(lookTmp);
  const center = k > 0.5 ? camLook : introLook;
  sun.position.copy(center).add(SUN_OFFSET);
  sun.target.position.copy(center);
}

// ------------------------------------------------------------------ start screen
const introEl = document.getElementById('intro');
const pickBtns = [...document.querySelectorAll('.pick-btn')];
const renderPick = () => {
  for (const b of pickBtns) {
    const id = b.dataset.pick;
    b.innerHTML = `${avatar(looks[id], 64)}<span>${looks[id].name}</span><small>${id === playerId ? 'Playing' : 'Tap to play'}</small>`;
    b.setAttribute('aria-checked', String(id === playerId));
  }
};
pickBtns.forEach((b) =>
  b.addEventListener('click', () => {
    playerId = b.dataset.pick;
    localStorage.setItem(PLAYER_KEY, playerId);
    ui.setPlayer(looks[playerId], looks[otherId(playerId)]);
    renderPick();
  }),
);
renderPick();

async function goFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
    await screen.orientation?.lock?.('landscape');
  } catch {
    /* not supported (iOS): the rotate hint covers it */
  }
}
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await goFullscreen();
  } catch {
    /* not supported */
  }
}
document.addEventListener('fullscreenchange', () => document.body.classList.toggle('is-full', !!document.fullscreenElement));

function start() {
  if (started) return;
  started = true;
  sound.start();
  if (ui.touch) goFullscreen();
  introEl.classList.add('gone');
  document.body.classList.add('playing');
  input.enabled = true;
  tweens.add(2.4, (k) => (introBlend = k), (x) => x, () => setShadowBox(20));
  setTimeout(() => {
    P().kid.wave();
    setTimeout(() => C().kid.wave(), 300);
    toast(`${greeting()}, ${looks[playerId].name}! Follow the path to <b>Weekend 1</b>. Press H to hold hands.`, 4400);
  }, 2000);
}
document.getElementById('start').addEventListener('click', start);
ui.updateJourney(stations, stamps, null);

// ------------------------------------------------------------------ per-frame movement
function updatePlayer(dt, ax) {
  const p = P();
  let dirX = camRight.x * ax.x + camFwd.x * ax.y;
  let dirZ = camRight.z * ax.x + camFwd.z * ax.y;
  let intent = Math.hypot(ax.x, ax.y);
  if (intent > 0.05) {
    waypoints = [];
    pendingEnter = null;
  } else if (waypoints.length) {
    const w = waypoints[0];
    const dx = w.x - p.pos.x;
    const dz = w.z - p.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < (waypoints.length > 1 ? 1.2 : 0.3)) {
      waypoints.shift();
      if (!waypoints.length) {
        fx.hideMarker();
        if (pendingEnter) {
          const id = pendingEnter;
          pendingEnter = null;
          spaces.enter(id);
        }
      }
    } else {
      dirX = dx / d;
      dirZ = dz / d;
      intent = waypoints.length > 1 ? 1 : Math.min(1, d / 1.2 + 0.3);
    }
  }

  if (game.activities.active) {
    game.activities.update(dt, elapsed, waypoints.length ? 0 : intent);
    return;
  }

  if (mount?.type === 'car') {
    const want = intent > 0.05 ? Math.atan2(dirX, dirZ) : null;
    car.steerToward(dt, want, intent, input.running);
    const cp = car.root.position;
    const before = car.speed;
    const v = new THREE.Vector3(Math.sin(car.yaw) * car.speed, 0, Math.cos(car.yaw) * car.speed);
    cp.x += v.x * dt;
    cp.z += v.z * dt;
    physics.resolve(cp, car.radius, v, { skip: (c) => c.isCar, feet: 0 });
    const fwd = v.x * Math.sin(car.yaw) + v.z * Math.cos(car.yaw);
    if (Math.abs(fwd) < Math.abs(before) - 2.5) {
      car.speed = fwd * 0.7;
      sound.kick();
    } else car.speed = fwd;
    carCollider.x = cp.x;
    carCollider.z = cp.z;
    car.update(dt, elapsed);
    sound.engineSpeed(car.speed);
    p.pos.copy(cp);
    p.speed = Math.abs(car.speed);
    return;
  }

  if (mount?.type === 'pony') {
    const w = mount.walker;
    const pr = mount.ctl.pony.root;
    const run = input.running || waypoints.length > 6;
    stepWalker(w, physics, dirX, dirZ, intent, run ? 11 : 8, 5, dt, 0.75);
    p.speed = w.speed;
    if (w.speed > 0.3) faceTo(p, dt, Math.atan2(w.vel.x, w.vel.z), 6);
    pr.rotation.y = p.yaw;
    if (stepVertical(w, physics, dt, null, 0.75) === 'land') {
      sound.land();
      fx.puff(pr.position);
    }
    pr.position.y = w.y;
    mount.ctl.legs(dt, w.speed);
    p.pos.set(pr.position.x, 0, pr.position.z);
    if (w.speed > 6 && Math.random() < dt * 6) fx.puff(pr.position);
    return;
  }

  const run = input.running || waypoints.length > 6;
  p.surface = spaces.zoneAt(p.pos.x, p.pos.z);
  stepWalker(p, physics, dirX, dirZ, intent, run ? 7.2 : 4.6, 12, dt);
  const water = spaces.waterAt(p.pos.x, p.pos.z);
  const wasSwim = p.mode === 'swim';
  if (stepVertical(p, physics, dt, water) === 'land') {
    p.kid.squash = 0.72;
    sound.land();
    if (p.mode === 'swim') fx.burst(new THREE.Vector3(p.pos.x, p.y + 0.1, p.pos.z), ['#ffffff', '#bdefff', '#7fd3ff'], 26);
    else fx.puff(p.pos);
  }
  if (!wasSwim && p.mode === 'swim') fx.burst(new THREE.Vector3(p.pos.x, p.y + 0.1, p.pos.z), ['#ffffff', '#bdefff'], 16);
  p.idle = p.speed > 0.25 ? 0 : p.idle + dt;
  if (p.speed > 0.25) faceTo(p, dt, Math.atan2(p.vel.x, p.vel.z));
  else if (p.idle > 1.2) faceTo(p, dt, spaces.inside ? 0.2 : 0.3, 3);
  else p.turn = 0;
}

const tmpV = new THREE.Vector3();
function updateCompanion(dt) {
  const p = P();
  const c = C();
  if (game.activities.active || mount?.type === 'car' || c.seated) return;
  const leader = mount?.type === 'pony' ? mount.ctl.pony.root.position : p.pos;
  c.surface = spaces.zoneAt(c.pos.x, c.pos.z);
  if (holding && !mount && p.mode !== 'swim' && c.mode !== 'swim') {
    // Hand in hand: the partner keeps to one side of the player and swings around them on an arc
    // when the player turns, so they never pass through each other. If a wall, a door frame or a
    // bench gets in the way the hands let go for a moment and grab again once there is room.
    const ox = c.pos.x - p.pos.x;
    const oz = c.pos.z - p.pos.z;
    const r0 = Math.hypot(ox, oz);
    if (!holdSign) {
      const l = leftOf(p.yaw, 1);
      holdSign = ox * l.x + oz * l.z >= 0 ? 1 : -1;
    }
    const side = leftOf(p.yaw, holdSign);
    if (holdGrip && r0 < 1.6) {
      const before = c.pos.clone();
      const ang = dampAngle(Math.atan2(ox, oz), Math.atan2(side.x, side.z), 14, dt);
      const r = damp(r0, HOLD_GAP, 14, dt);
      c.pos.set(p.pos.x + Math.sin(ang) * r, 0, p.pos.z + Math.cos(ang) * r);
      const want = c.pos.clone();
      physics.resolve(c.pos, RADIUS, c.vel, { feet: c.y });
      holdBlocked = c.pos.distanceTo(want) > 0.18 ? holdBlocked + dt : 0;
      c.vel.subVectors(c.pos, before).divideScalar(Math.max(dt, 1e-3));
      c.vel.y = 0;
      c.speed = Math.min(p.speed + 0.01, Math.hypot(c.vel.x, c.vel.z));
      faceTo(c, dt, p.yaw, 14);
      const linked = Math.abs(r - HOLD_GAP) < 0.2;
      p.kid.holdSide = linked ? holdSign : 0;
      c.kid.holdSide = linked ? -holdSign : 0;
      if (holdBlocked > 0.25 || r0 > 1.5) holdGrip = false;
    } else {
      // Walk back to the player's side, then take their hand again
      p.kid.holdSide = 0;
      c.kid.holdSide = 0;
      const target = tmpV.copy(p.pos).addScaledVector(side, HOLD_GAP);
      const dx = target.x - c.pos.x;
      const dz = target.z - c.pos.z;
      const d = Math.hypot(dx, dz);
      stepWalker(c, physics, dx, dz, clamp(d * 2, 0, 1), d > 3 ? 7.2 : 5.4, 14, dt);
      if (c.speed > 0.25) faceTo(c, dt, Math.atan2(c.vel.x, c.vel.z));
      else faceTo(c, dt, p.yaw, 8);
      if (d > 30) {
        fx.poof(c.pos);
        c.pos.set(target.x, 0, target.z);
        c.y = p.y;
      }
      if (d < 0.35 && Math.abs(c.y - p.y) < 0.2) {
        holdGrip = true;
        holdBlocked = 0;
      }
    }
    // Hop up onto a step or a bench together
    if (p.y > c.y + 0.25 && airOf(c) < 0.02 && airOf(p) < 0.02) {
      tryJump(c);
      holdGrip = false;
    }
  } else {
    p.kid.holdSide = 0;
    c.kid.holdSide = 0;
    const leadYaw = p.yaw;
    const fwd = new THREE.Vector3(Math.sin(leadYaw), 0, Math.cos(leadYaw));
    const target = tmpV.copy(leader).addScaledVector(fwd, mount ? -2.2 : -1.0).add(leftOf(leadYaw, 0.9));
    const dx = target.x - c.pos.x;
    const dz = target.z - c.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > 30) {
      fx.poof(c.pos);
      c.pos.set(target.x, 0, target.z);
      c.y = p.y;
      fx.poof(c.pos);
    }
    const near = d < 0.5;
    const maxS = mount ? 9 : d > 4 ? 7.2 : 4.6;
    stepWalker(c, physics, dx, dz, near ? 0 : clamp((d - 0.4) * 1.5, 0, 1), maxS, 10, dt);
    c.idle = c.speed > 0.25 ? 0 : c.idle + dt;
    if (c.speed > 0.25) faceTo(c, dt, Math.atan2(c.vel.x, c.vel.z));
    else if (c.idle > 1.4) {
      const toP = Math.atan2(p.pos.x - c.pos.x, p.pos.z - c.pos.z);
      faceTo(c, dt, c.idle > 4 ? 0.3 : toP, 3);
    } else c.turn = 0;
  }
  // Follow the player up onto ledges they jumped to
  if (p.y > c.y + 0.3 && c.speed < 0.5 && airOf(c) < 0.02 && c.pos.distanceTo(p.pos) < 2.4 && Math.random() < dt * 2) tryJump(c);
  if (stepVertical(c, physics, dt, spaces.waterAt(c.pos.x, c.pos.z)) === 'land') {
    c.kid.squash = 0.78;
    fx.puff(c.pos);
  }
}

function footsteps(a) {
  const k = a.kid;
  if (k.pose !== 'stand') return;
  const s = Math.sign(Math.sin(k.walkPhase));
  if (s !== a.stepSign && a.speed > 1 && airOf(a) < 0.02) {
    if (a === P()) sound.step(s > 0);
    if (a.speed > 3) fx.puff(a.pos);
  }
  a.stepSign = s;
}

// ------------------------------------------------------------------ loop
const timer = new THREE.Timer();
timer.connect(document);
let frameCount = 0;
let fpsFrames = 0;
let fpsTime = performance.now();
let night = 0;
const insideColor = new THREE.Color();
// Test hooks for headless checks
window.__roji = {
  renderer,
  scene,
  camera,
  stations,
  actors,
  spaces,
  arena,
  game,
  get pos() {
    return P().pos;
  },
  info: () => renderer.info.render,
  fps: 0,
  travelTo,
  start,
  action,
  stamps,
  emote,
  toggleHands,
  enterCar,
  mountPony,
  enterPlace,
  enter: (id) => spaces.enter(id),
  exit: () => spaces.exit(),
  startDance,
  openWardrobe,
  playGame,
  swapPlayer,
  jump,
  setZoom: (z) => (zoom = z),
  hotspots: () => (spaces.inside ? spaces.hotspots() : [...townHotspots, ...spaces.hotspots()]).map((h) => ({ label: h.label, x: +h.pos.x.toFixed(1), z: +h.pos.z.toFixed(1) })),
  state: () => ({ playerId, holding, mount: mount?.type, activity: game.activities.active, inside: spaces.inside?.id || null, speed: P().speed, yaw: P().yaw, y: P().y, mode: P().mode }),
  teleport: (id) => {
    const p = byId[id]?.pad;
    if (!p) return false;
    return window.__roji.goto(p.x, p.z);
  },
  goto: (x, z) => {
    P().pos.set(x, 0, z);
    C().pos.set(x + 1, 0, z + 0.6);
    camLook.set(x, 0.9, z);
    return true;
  },
  // Stand next to the hotspot whose label contains `text` and press it
  act(text) {
    const list = spaces.inside ? spaces.hotspots() : [...townHotspots, ...spaces.hotspots()];
    const h = list.find((q) => q.when() && q.label && q.label.toLowerCase().includes(text.toLowerCase()));
    if (!h) return false;
    const hp = h.pos;
    P().pos.set(hp.x, 0, hp.z + 0.3);
    h.act();
    return h.label;
  },
  goto: (x, z) => {
    P().pos.set(x, 0, z);
    C().pos.set(x + 1, 0, z + 0.6);
    camLook.set(x, 0.9, z);
  },
};

function frame() {
  timer.update();
  const dt = Math.min(timer.getDelta(), 1 / 20);
  const t = timer.getElapsed();
  elapsed = t;
  tweens.update(dt);
  if (arena.active) {
    renderer.toneMappingExposure = 1;
    setSkyTint(null);
    arena.frame(dt, t);
    return;
  }
  if (gameOpen) return; // a 2D minigame owns the screen

  camera.getWorldDirection(camFwd);
  camFwd.y = 0;
  camFwd.normalize();
  camRight.crossVectors(camFwd, UP);
  const ax = started && !ui.panelOpen ? input.axis() : { x: 0, y: 0 };
  updatePlayer(dt, ax);
  updateCompanion(dt);
  for (const a of Object.values(actors)) {
    syncKid(a, dt, t);
    footsteps(a);
  }

  // Beach balls
  if (!spaces.inside) {
    const pushers = [{ p: P().pos, v: P().vel, r: RADIUS, air: airOf(P()) }, { p: C().pos, v: C().vel, r: RADIUS, air: airOf(C()) }];
    if (mount?.type === 'car') pushers.push({ p: car.root.position, v: new THREE.Vector3(Math.sin(car.yaw) * car.speed, 0, Math.cos(car.yaw) * car.speed), r: 1.1, air: 0 });
    for (const b of balls) {
      for (const k of pushers) {
        if (mount?.type === 'car' && k.r === RADIUS) continue;
        const dx = b.m.position.x - k.p.x;
        const dz = b.m.position.z - k.p.z;
        const d = Math.hypot(dx, dz);
        const min = b.r + k.r;
        if (d < min && k.air < 0.5) {
          const nx = dx / (d || 1);
          const nz = dz / (d || 1);
          b.m.position.x += nx * (min - d);
          b.m.position.z += nz * (min - d);
          const push = Math.max(0, k.v.x * nx + k.v.z * nz);
          b.v.x += nx * (push * 1.3 + 0.8);
          b.v.z += nz * (push * 1.3 + 0.8);
          if (push > 1.5) sound.kick();
        }
      }
      b.v.multiplyScalar(Math.exp(-1.1 * dt));
      b.m.position.x += b.v.x * dt;
      b.m.position.z += b.v.z * dt;
      physics.resolve(b.m.position, b.r, b.v, { bounce: 0.6 });
      b.m.position.y = b.r;
      const bs = Math.hypot(b.v.x, b.v.z);
      if (bs > 0.01) b.m.rotateOnWorldAxis(rollAxis.set(b.v.z / bs, 0, -b.v.x / bs), (bs * dt) / b.r);
    }
  }
  if (!mount) car.update(dt, t);

  // Stations, cards and prompts
  let onPad = null;
  if (!spaces.inside) {
    for (const st of stations) {
      st.update(dt, t, P().pos);
      if (st.onPad && started && !mount && !game.activities.active) onPad = st;
    }
  }
  if (onPad !== currentStation) {
    currentStation = onPad;
    if (onPad) {
      showStationCard(onPad);
      if (onPad.unlocked) {
        sound.arrive();
        if (waypoints.length <= 1) P().kid.wave();
      } else sound.locked();
    } else ui.hideCard();
    ui.updateJourney(stations, stamps, onPad?.stop.id);
  } else if (onPad && frameCount % 30 === 0) showStationCard(onPad);
  if (frameCount % 20 === 0) ui.updateJourney(stations, stamps, onPad?.stop.id);

  currentHot = started && !game.activities.active && !mount ? currentHotspot() : null;
  let label = null;
  let icon = 'arrow';
  if (game.activities.active) label = game.activities.label;
  else if (mount) [label, icon] = [mount.type === 'car' ? 'Get out' : 'Get off', mount.type === 'car' ? 'car' : 'horse'];
  else if (currentHot) [label, icon] = [currentHot.label, currentHot.icon];
  ui.setPrompt(started && !gameOpen ? label : null, icon);
  let aLabel = label;
  if (!aLabel && currentStation) {
    const s = currentStation.stop;
    const rec = s.kind === 'place' ? spaces.interiors[s.id] : null;
    aLabel = s.kind === 'start' ? 'Go inside' : s.kind === 'place' ? (rec ? (rec.locked() ? rec.lockedLabel : 'Go inside') : 'Play') : !currentStation.unlocked ? 'Locked' : stamps.has(s.id) ? 'Next' : 'Stamp';
  }
  ui.setActionLabel(aLabel);

  // Time of day outside, cosy light inside; activities (sleep, movie night) can dim either
  const day = daylight.update(t);
  night = damp(night, nightTarget, 2, dt);
  let bg;
  if (spaces.inside) {
    const dim = Math.max(night, day.dark * 0.22);
    hemi.color.set('#fff6ea');
    hemi.groundColor.set('#7fae74');
    hemi.intensity = 1.35 - dim * 1.0;
    sun.color.set('#fff0d8');
    sun.intensity = 2.5 - dim * 2.1;
    SUN_OFFSET.copy(DEFAULT_OFFSET);
    bg = insideColor.set(spaces.inside.inst.background || '#f7dcc8').lerp(INSIDE_NIGHT, Math.max(night, day.dark * 0.55));
  } else {
    hemi.color.copy(day.sky);
    hemi.groundColor.copy(day.ground);
    hemi.intensity = day.hemiI * (1 - night * 0.6);
    sun.color.copy(day.sun);
    sun.intensity = day.sunI * (1 - night * 0.8);
    if (frameCount === 0) SUN_OFFSET.copy(day.lightOffset);
    else SUN_OFFSET.lerp(day.lightOffset, 1 - Math.exp(-2.5 * dt));
    bg = insideColor.copy(day.fog).lerp(INSIDE_NIGHT, night * 0.8);
    const glow = Math.max(day.glow, night * 0.6);
    world.setGlow(glow, day.water, day.cloud, day.cloudI);
    for (const [m, base] of glowMats) m.emissiveIntensity = base * (1 + glow * 1.8);
  }
  renderer.toneMappingExposure = spaces.inside ? 1 - day.dark * 0.06 : day.exp;
  setSkyTint(spaces.inside ? null : day);
  scene.environmentIntensity = 0.3 * (1 - day.dark * (spaces.inside ? 0.3 : 0.75));
  if (frameCount === 0) scene.background.copy(bg);
  else scene.background.lerp(bg, 1 - Math.exp(-6 * dt));
  scene.fog.color.copy(scene.background);
  if (frameCount % 30 === 0) updateClock();

  world.update(dt, t);
  spaces.update(dt, t, P().pos);
  fx.update(dt, t);
  updateCamera(dt, t);
  if (started && !spaces.inside && frameCount % 2 === 0) minimap.draw(mount?.type === 'car' ? car.root.position : P().pos, mount?.type === 'car' ? car.yaw : P().yaw, stamps, t, C().pos, car.root.position);
  renderer.render(scene, camera);

  frameCount++;
  fpsFrames++;
  const now = performance.now();
  if (now - fpsTime > 1000) {
    window.__roji.fps = (fpsFrames * 1000) / (now - fpsTime);
    fpsFrames = 0;
    fpsTime = now;
  }
}
renderer.setAnimationLoop(frame);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  arena.resize();
});

document.body.classList.add('ready');
if (params.has('play')) {
  start();
  introBlend = 1;
  tweens.list.length = 0;
  setShadowBox(20);
}
