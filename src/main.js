import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { STOPS } from './config.js';
import { World, islandSdf, PADS, FUTURE, CAR_SPOT } from './world.js';
import { Station, BUILDERS } from './stations.js';
import { buildYumYum, buildPlaza } from './places.js';
import { buildInterior } from './interior.js';
import { Kid } from './kid.js';
import { Car } from './car.js';
import { Effects } from './fx.js';
import { Sound } from './audio.js';
import { Input } from './input.js';
import { UI, Minimap } from './ui.js';
import { loadLooks, saveLooks } from './looks.js';
import { avatar } from './games/avatar.js';
import { openGame, isGameOpen } from './games/shell.js';
import { GAMES, gamesAt } from './games/registry.js';
import { damp, dampAngle, clamp, canvasTexture, easeInOut, Tweens, bakeStatic } from './util.js';

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
const INSIDE_DAY = new THREE.Color('#f7dcc8');
const INSIDE_NIGHT = new THREE.Color('#3b3560');
scene.background = SKY.clone();
scene.fog = new THREE.Fog(SKY.clone(), 42, 110);
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
const SUN_OFFSET = new THREE.Vector3(-11, 22, 12);
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

// ------------------------------------------------------------------ world
const world = new World(scene);
const builders = { ...BUILDERS, yumyum: buildYumYum, plaza: buildPlaza };
const stations = STOPS.map((stop) => new Station(world, scene, stop, builders[stop.id]));
const byId = Object.fromEntries(stations.map((s) => [s.stop.id, s]));
const plazaSign = world.sign(['Play Park'], { width: 2.2, height: 0.8, accent: '#21a99a', postHeight: 0.8 });
plazaSign.position.set(PADS.plaza[0] + 3.2, 0, PADS.plaza[1] - 1.8);
plazaSign.scale.setScalar(0.9);
world.statics.add(plazaSign);
world.addCollider({ type: 'box', x: PADS.plaza[0] + 3.2, z: PADS.plaza[1] - 1.86, hw: 0.9, hd: 0.15 });
const keepOut = [];
for (const s of stations) {
  const big = s.stop.kind === 'place' ? 6.6 : 5.4;
  keepOut.push({ x: s.origin.x, z: s.origin.z, r: big }, { x: s.pad.x, z: s.pad.z, r: 2.9 }, { x: s.pad.x - 3.3, z: s.pad.z - 2, r: 1.6 });
}
for (const [fx_, fz] of FUTURE) keepOut.push({ x: fx_, z: fz - 5.5, r: 3.2 }, { x: fx_, z: fz, r: 2.6 });
keepOut.push({ x: CAR_SPOT[0], z: CAR_SPOT[1], r: 3.4 }, { x: PADS.plaza[0] + 3.2, z: PADS.plaza[1] - 1.8, r: 1.6 });
world.scatterNature(keepOut);
bakeStatic(world.statics, [], mergeGeometries);
const interior = buildInterior(scene, world);
const fx = new Effects(scene);
fx.initExtras();
const tweens = new Tweens();
const sound = new Sound();

// ------------------------------------------------------------------ the two kids
const looks = loadLooks();
let playerId = params.get('as') || localStorage.getItem(PLAYER_KEY) || 'roji';
if (!looks[playerId]) playerId = 'roji';
const otherId = (id) => (id === 'roji' ? 'homama' : 'roji');
const headPos = (kid) => kid.head.localToWorld(new THREE.Vector3(0, 0.75, 0));
function makeActor(id, x, z, yaw) {
  const kid = new Kid(looks[id]);
  scene.add(kid.root);
  kid.onEmoteFx = (type, k) => fx.heartsAt(headPos(k), 4);
  const a = { id, kid, pos: new THREE.Vector3(x, 0, z), vel: new THREE.Vector3(), yaw, vy: 0, air: 0, idle: 0, stepSign: 1, speed: 0, turn: 0 };
  kid.root.position.copy(a.pos);
  return a;
}
const home = byId.home.pad;
const actors = {
  roji: makeActor('roji', home.x + 0.3, home.z + 0.3, Math.PI * 0.75),
  homama: makeActor('homama', home.x + 1.3, home.z + 0.6, Math.PI * 0.85),
};
const P = () => actors[playerId];
const C = () => actors[otherId(playerId)];
const RADIUS = 0.34;
let holding = false;
let mount = null; // { type: 'car' } or { type: 'pony', ctl, station }
let activity = null; // movie | sleep | table | dance
let inside = false;
let started = false;
let gameOpen = false;
let wardrobeTarget = null;

// ------------------------------------------------------------------ car
const car = new Car('#ff8fb1');
car.yaw = -0.5;
car.root.position.set(CAR_SPOT[0], 0, CAR_SPOT[1]);
car.root.rotation.y = car.yaw;
scene.add(car.root);
const carCollider = { type: 'circle', x: CAR_SPOT[0], z: CAR_SPOT[1], r: 1.1, isCar: true };
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

// ------------------------------------------------------------------ routes along the paths
let waypoints = [];
const nearestIn = (list, x, z) => {
  let best = 0;
  let bd = Infinity;
  list.forEach((s, i) => {
    const d = (s.x - x) ** 2 + (s.z - z) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return { i: best, d: Math.sqrt(bd) };
};
const walk = (list, from, to) => {
  const out = [];
  const dir = Math.sign(to - from) || 1;
  for (let i = from; dir > 0 ? i < to : i > to; i += dir * 5) out.push(list[i].clone());
  return out;
};
function travelTo(id) {
  const st = byId[id];
  if (!st || inside || activity) return;
  const p = P().pos;
  const main = world.samples;
  const town = world.townSamples;
  const isTown = st.stop.kind === 'place';
  const onMain = nearestIn(main, p.x, p.z);
  const onTown = nearestIn(town, p.x, p.z);
  const homeMain = 0;
  const turnMain = nearestIn(main, -24.5, -3.5).i;
  const townEnd = town.length - 1;
  if (isTown) {
    const target = nearestIn(town, st.pad.x, st.pad.z).i;
    if (onTown.d <= onMain.d + 0.5) waypoints = walk(town, onTown.i, target);
    else {
      const viaHome = Math.abs(onMain.i - homeMain) + target;
      const viaTurn = Math.abs(onMain.i - turnMain) + (townEnd - target);
      waypoints = viaHome <= viaTurn ? [...walk(main, onMain.i, homeMain), ...walk(town, 0, target)] : [...walk(main, onMain.i, turnMain), ...walk(town, townEnd, target)];
    }
  } else {
    const target = world.padIndex[id];
    if (onMain.d <= onTown.d + 0.5) waypoints = walk(main, onMain.i, target);
    else {
      const viaHome = onTown.i + Math.abs(target - homeMain);
      const viaTurn = townEnd - onTown.i + Math.abs(target - turnMain);
      waypoints = viaHome <= viaTurn ? [...walk(town, onTown.i, 0), ...walk(main, homeMain, target)] : [...walk(town, onTown.i, townEnd), ...walk(main, turnMain, target)];
    }
  }
  waypoints.push(st.pad.clone());
  fx.showMarker(st.pad);
}

// ------------------------------------------------------------------ UI
const ui = new UI({
  onAction: (act) => action(act),
  onTravel: (id) => {
    if (!started) return;
    if (mount) dismount();
    if (inside) {
      exitHome(() => travelTo(id));
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
  onFullscreen: () => goFullscreen(),
  journalData: () => ({ stations, stamps, gamesAt }),
});
ui.setSound(sound.muted);
ui.setPlayer(looks[playerId], looks[otherId(playerId)]);
const minimap = new Minimap(document.getElementById('minimap'), world, stations);

function toast(t, ms) {
  ui.toast(t, ms);
}

// ------------------------------------------------------------------ hotspots
const horse = byId.horse;
const gate = new THREE.Vector3(horse.origin.x, 0, horse.origin.z + 3.6);
const homeSt = byId.home;
const plaza = byId.plaza;
const kiosk = new THREE.Vector3(plaza.origin.x - 1.2, 0, plaza.origin.z - 2.6);
const hot = (pos, r, label, icon, act, when = () => true) => ({ pos, r, label, icon, act, when });
const outdoorHotspots = [
  hot(() => car.root.position, 2.6, 'Drive the car', 'car', () => enterCar()),
  hot(() => gate, 1.8, 'Ride the pony', 'horse', () => mountPony()),
  hot(() => homeSt.door, 1.5, 'Go inside', 'door', () => enterHome()),
  hot(() => plaza.fountain, 2.6, 'Make a wish', 'star', () => makeWish()),
  hot(() => kiosk, 1.6, 'Arcade games', 'game', () => ui.openGames('Arcade', GAMES)),
  {
    pos: () => new THREE.Vector3(plaza.danceFloor.x, 0, plaza.danceFloor.z),
    inside: (p) => Math.abs(p.x - plaza.danceFloor.x) < plaza.danceFloor.half && Math.abs(p.z - plaza.danceFloor.z) < plaza.danceFloor.half,
    label: 'Dance together',
    icon: 'music',
    act: () => startActivity('dance'),
    when: () => true,
  },
];
const H = interior.hotspots;
const indoorHotspots = [
  hot(() => H.door, 1.3, 'Go outside', 'door', () => exitHome()),
  hot(() => H.sofa, 1.5, 'Movie night', 'cinema', () => startActivity('movie')),
  hot(() => H.bed, 1.7, 'Go to sleep', 'moon', () => startActivity('sleep')),
  hot(() => H.closet, 1.2, 'Wardrobe', 'shirt', () => openWardrobe()),
  hot(() => H.stove, 1.3, 'Cook something', 'yum', () => playGame('cooking')),
  hot(() => H.fridge, 1.2, 'Grab a snack', 'heart', () => snack()),
  hot(() => H.table, 1.4, 'Sit at the table', 'smile', () => startActivity('table')),
];
function currentHotspot() {
  const p = P().pos;
  const list = inside ? indoorHotspots : outdoorHotspots;
  let best = null;
  let bd = Infinity;
  for (const h of list) {
    if (!h.when()) continue;
    const hp = h.pos();
    if (h.inside) {
      if (h.inside(p)) return h;
      continue;
    }
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
    if (activity) return endActivity();
    if (mount) return dismount();
    if (currentStation) {
      const s = currentStation.stop;
      if (s.kind === 'start') act = 'inside';
      else if (s.kind === 'place') act = gamesAt(s.id).length === 1 ? 'game:' + gamesAt(s.id)[0].id : 'games';
      else if (!currentStation.unlocked) act = 'locked';
      else act = stamps.has(s.id) ? 'travel-next' : 'stamp';
    } else if (currentHot) return currentHot.act();
    else return;
  }
  const st = currentStation;
  if (act.startsWith('game:')) return playGame(act.slice(5));
  if (act === 'games' && st) return ui.openGames(st.stop.title, gamesAt(st.stop.id));
  if (act === 'notes' && st) return ui.openNotes(st.stop.id);
  if (act === 'ride') return mountPony();
  if (act === 'inside') {
    waypoints = [homeSt.door.clone()];
    pendingEnter = true;
    return;
  }
  if (act === 'travel-next' && st) {
    const next = st.stop.kind === 'start' ? weeks.find((s) => s.unlocked && !stamps.has(s.stop.id))?.stop || weeks[0].stop : nextStopAfter(st.stop.id);
    if (next) travelTo(next.id);
    return;
  }
  if (!st) return;
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
let pendingEnter = false;

function showStationCard(st) {
  ui.showCard(st, { stamped: stamps.has(st.stop.id), nextStop: nextStopAfter(st.stop.id), games: st.unlocked ? gamesAt(st.stop.id) : [], ride: st.stop.id === 'horse' });
}

function playGame(id) {
  if (gameOpen) return;
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
      if (result?.win === true) {
        P().kid.emote('cheer');
        setTimeout(() => C().kid.emote('heart'), 300);
      } else if (result) P().kid.emote('wave');
      if (id === 'drawpad') refreshDrawings();
    },
  });
}

function refreshDrawings() {
  try {
    const g = JSON.parse(localStorage.getItem('roji-game-drawpad-gallery') || '[]');
    const urls = g.map((d) => (typeof d === 'string' ? d : d.url || d.dataUrl || d.src)).filter(Boolean);
    if (urls.length) interior.setDrawings(urls.slice(-2).reverse());
  } catch {
    /* no drawings yet */
  }
}
refreshDrawings();

const EMOTE_KEYS = ['wave', 'dance', 'spin', 'cheer', 'heart', 'bow'];
function emote(type) {
  if (!started || mount || activity) return;
  waypoints = [];
  P().kid.emote(type);
  const c = C();
  if (c.pos.distanceTo(P().pos) < 9) setTimeout(() => c.kid.emote(type), 350);
}

function toggleHands() {
  if (!started || mount || activity) return;
  holding = !holding;
  ui.setHands(holding);
  if (holding) toast(`${looks[playerId].name} and ${looks[otherId(playerId)].name} are holding hands`, 2200);
  else {
    P().kid.holdSide = 0;
    C().kid.holdSide = 0;
  }
}

function swapPlayer() {
  if (!started) return;
  if (mount || activity) {
    toast('Get out first, then switch.');
    return;
  }
  playerId = otherId(playerId);
  localStorage.setItem(PLAYER_KEY, playerId);
  waypoints = [];
  ui.setPlayer(looks[playerId], looks[otherId(playerId)]);
  P().kid.holdSide = 0;
  C().kid.holdSide = 0;
  P().kid.wave();
  toast(`Now playing as <b>${looks[playerId].name}</b>`, 2200);
}

function jump() {
  if (!started || gameOpen) return;
  if (mount?.type === 'car') {
    car.honk();
    sound.honk();
    return;
  }
  if (activity) return;
  const p = P();
  if (p.air > 0.02) return;
  p.vy = mount?.type === 'pony' ? 5.2 : 6.6;
  p.kid.squash = 1.2;
  sound.jump();
  // The partner hops too when holding hands or close by
  const c = C();
  if (!mount && c.pos.distanceTo(p.pos) < 3) {
    setTimeout(() => {
      if (c.air < 0.02) {
        c.vy = 6.2;
        c.kid.squash = 1.2;
      }
    }, holding ? 0 : 150);
  }
}

function snack() {
  interior.state.fridgeOpen = 2.2;
  const treats = ['strawberries', 'a cupcake', 'chocolate milk', 'a cookie', 'watermelon', 'ice cream'];
  const t = treats[Math.floor(Math.random() * treats.length)];
  setTimeout(() => {
    P().kid.emote('cheer');
    fx.heartsAt(headPos(P().kid), 3);
    toast(`Yum, ${t}!`, 2200);
  }, 600);
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
  resolve(a.pos, RADIUS, a.vel);
  a.yaw = yaw;
  a.air = 0;
  a.vy = 0;
  a.kid.pose = 'stand';
  a.kid.root.rotation.set(0, yaw, 0);
  a.kid.root.position.copy(a.pos);
}
function enterCar() {
  if (mount || inside) return;
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
  toast('Beep beep! Drive with the arrows or the stick. Space honks.', 3000);
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
  if (mount || inside) return;
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
  mount = { type: 'pony', ctl, speed: 0, yaw: p.yaw };
  seatKid(p, ctl.pony.root, new THREE.Vector3(0, 1.1, -0.02), 'ride');
  fx.poof(p.pos);
  sound.arrive();
  toast('Giddy up! Space to hop, E to get off.', 2600);
}
function dismountPony() {
  const ctl = mount.ctl;
  const pr = ctl.pony.root;
  const y = pr.rotation.y;
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

// ------------------------------------------------------------------ home
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
  p.pos.copy(pos);
  p.yaw = yaw;
  c.pos.copy(pos).add(leftOf(yaw, 0.9));
  c.yaw = yaw;
  for (const a of [p, c]) {
    a.vel.set(0, 0, 0);
    a.kid.root.position.copy(a.pos);
  }
  camLook.set(pos.x, 0.9, pos.z);
}
function enterHome() {
  if (inside || mount) return;
  waypoints = [];
  fadeThen(() => {
    inside = true;
    document.body.classList.add('inside');
    interior.setInside(true);
    world.water.visible = false;
    placePair(interior.spawn, 0);
    ui.hideCard();
    setShadowBox(16);
    toast(`Welcome home! The kitchen, the living room and the bedroom are all yours.`, 3400);
  });
}
function exitHome(after) {
  if (!inside) return;
  if (activity) endActivity(true);
  fadeThen(() => {
    inside = false;
    document.body.classList.remove('inside');
    interior.setInside(false);
    world.water.visible = true;
    placePair(homeSt.door.clone().add(new THREE.Vector3(0, 0, 1.4)), 0);
    setShadowBox(20);
    after?.();
  });
}

// ------------------------------------------------------------------ activities
let night = 0;
function sitKid(a, pos, yaw, pose, y) {
  a.kid.cancelEmote();
  a.kid.holdSide = 0;
  a.pos.set(pos.x, 0, pos.z);
  a.yaw = yaw;
  a.vel.set(0, 0, 0);
  a.kid.pose = pose;
  a.kid.root.position.set(pos.x, y, pos.z);
  a.kid.root.rotation.set(0, yaw, 0);
}
function startActivity(type) {
  if (activity || mount) return;
  waypoints = [];
  holding = false;
  ui.setHands(false);
  const p = P();
  const c = C();
  activity = type;
  for (const a of [p, c]) {
    a.vel.set(0, 0, 0);
    a.speed = 0;
  }
  if (type === 'movie') {
    sitKid(p, interior.sofaSeats[0], Math.PI, 'sit', 0.2);
    sitKid(c, interior.sofaSeats[1], Math.PI, 'sit', 0.2);
    interior.state.movie = true;
    sound.setMusicLevel(0.25);
    toast('Movie night! Cosy blanket, popcorn, and the big screen.', 3400);
    movieHearts = 3;
  } else if (type === 'sleep') {
    const [a, b] = interior.bedSpots;
    sitKid(p, a, 0, 'sleep', a.y);
    sitKid(c, b, 0, 'sleep', b.y);
    p.kid.root.rotation.set(-Math.PI / 2, 0.35, 0);
    c.kid.root.rotation.set(-Math.PI / 2, -0.35, 0);
    interior.state.sleep = true;
    interior.setNight(true);
    sound.setMusicLevel(0.35);
    toast('Sweet dreams...', 3000);
  } else if (type === 'table') {
    const [a, b] = interior.chairs;
    sitKid(p, a, Math.PI / 2, 'sit', 0.19);
    sitKid(c, b, -Math.PI / 2, 'sit', 0.19);
  } else if (type === 'dance') {
    plaza.dancing = true;
    sound.setParty(true);
    c.pos.copy(p.pos).add(leftOf(p.yaw, 1.0));
    for (const a of [p, c]) {
      a.kid.danceLoop = true;
      a.kid.emote('dance');
    }
    toast('Dance party! Move to stop.', 2400);
  }
}
let movieHearts = 0;
function endActivity(silent = false) {
  const type = activity;
  if (!type) return;
  activity = null;
  const p = P();
  const c = C();
  for (const a of [p, c]) {
    a.kid.pose = 'stand';
    a.kid.danceLoop = false;
    a.kid.cancelEmote();
  }
  if (type === 'movie') {
    interior.state.movie = false;
    sound.setMusicLevel(1);
    placePair(H.sofa.clone(), 0);
  } else if (type === 'sleep') {
    interior.state.sleep = false;
    interior.setNight(false);
    sound.setMusicLevel(1);
    placePair(H.bed.clone(), 0);
    if (!silent) {
      toast('Good morning!', 2400);
      setTimeout(() => p.kid.emote('cheer'), 300);
    }
  } else if (type === 'table') {
    placePair(H.table.clone(), 0);
  } else if (type === 'dance') {
    plaza.dancing = false;
    sound.setParty(false);
  }
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
    if (mount || activity || gameOpen) return;
    ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (!inside) {
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
    if (raycaster.ray.intersectPlane(groundPlane, hit) && (inside || islandSdf(hit.x, hit.z) < -0.8)) {
      waypoints = [hit.clone()];
      fx.showMarker(hit);
    }
  },
  onAction: () => action('auto'),
  onJump: () => jump(),
  onZoom: (d) => (zoom = clamp(zoom + d, 0.6, 1.6)),
  onKey: (k, e) => {
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
    if (k === 'h') toggleHands();
    if (k === 'tab') {
      e.preventDefault();
      swapPlayer();
    }
    if (k === 'c') openWardrobe();
    if (k === 'j') ui.toggleJournal();
    const n = Number(k);
    if (n >= 1 && n <= EMOTE_KEYS.length) emote(EMOTE_KEYS[n - 1]);
  },
});
input.attachStick(document.getElementById('stick'), document.getElementById('stick-knob'));

// ------------------------------------------------------------------ collisions
function resolve(p, r, v, bounce = 0, skipCar = false) {
  for (const c of world.colliders) {
    if (skipCar && c.isCar) continue;
    let dx;
    let dz;
    if (c.type === 'circle') {
      dx = p.x - c.x;
      dz = p.z - c.z;
      const min = c.r + r;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2) || 1e-4;
      dx /= d;
      dz /= d;
      p.x += dx * (min - d);
      p.z += dz * (min - d);
    } else {
      const qx = clamp(p.x, c.x - c.hw, c.x + c.hw);
      const qz = clamp(p.z, c.z - c.hd, c.z + c.hd);
      dx = p.x - qx;
      dz = p.z - qz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        dx /= d;
        dz /= d;
        p.x += dx * (r - d);
        p.z += dz * (r - d);
      } else {
        const px = c.hw - Math.abs(p.x - c.x) + r;
        const pz = c.hd - Math.abs(p.z - c.z) + r;
        if (px < pz) {
          dx = Math.sign(p.x - c.x) || 1;
          dz = 0;
          p.x += dx * px;
        } else {
          dx = 0;
          dz = Math.sign(p.z - c.z) || 1;
          p.z += dz * pz;
        }
      }
    }
    const into = v.x * dx + v.z * dz;
    if (into < 0) {
      v.x -= dx * into * (1 + bounce);
      v.z -= dz * into * (1 + bounce);
    }
  }
  if (p.x > 150) return; // inside the house: walls are colliders
  const s = islandSdf(p.x, p.z);
  const margin = -0.9 - r;
  if (s > margin) {
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
  }
}

// ------------------------------------------------------------------ camera
let zoom = 1;
let introBlend = 0;
const camLook = new THREE.Vector3(P().pos.x, 0.9, P().pos.z);
const camPos = new THREE.Vector3();
const followPos = new THREE.Vector3();
const introPos = new THREE.Vector3();
const introLook = new THREE.Vector3(-9, 0, 2);
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
  desiredLook.set(target.x + vel.x * 0.22, 0.9, target.z + vel.z * 0.22);
  let z = zoom * aspectZoom();
  offset.lerp(inside ? OFFSET_IN : OFFSET_OUT, 1 - Math.exp(-4 * dt));
  if (mount?.type === 'car') z *= 1.25;
  if (mount?.type === 'pony') z *= 1.1;
  if (currentStation && !mount) {
    const o = currentStation.origin;
    desiredLook.x += (o.x - desiredLook.x) * 0.32;
    desiredLook.z += (o.z + 1 - desiredLook.z) * 0.32;
    desiredLook.y = 1.4;
    z *= 1.2;
  }
  if (inside) {
    desiredLook.x = clamp(desiredLook.x, interior.bounds.x0, interior.bounds.x1);
    desiredLook.z = clamp(desiredLook.z, interior.bounds.z - 1, interior.bounds.z + 1.2);
    if (activity === 'movie') {
      desiredLook.set(interior.sofaSeats[0].x + 0.42, 1.2, interior.sofaSeats[0].z - 1.6);
      z = 0.62;
    } else if (activity === 'sleep') {
      desiredLook.set(interior.bedSpots[0].x + 0.5, 0.8, interior.bedSpots[0].z - 0.4);
      z = 0.62;
    }
  }
  if (wardrobeTarget) {
    const a = actors[wardrobeTarget];
    const wp = a.kid.root.getWorldPosition(lookTmp);
    desiredLook.set(wp.x, 0.95, wp.z);
    z = 0.36;
    const panel = document.getElementById('wardrobe');
    const pw = panel.classList.contains('hidden') ? 0 : panel.offsetWidth + 12;
    camera.setViewOffset(window.innerWidth, window.innerHeight, -pw / 2, 0, window.innerWidth, window.innerHeight);
  }
  else updateLift(target, dt);
  const rate = wardrobeTarget ? 6 : 4;
  camLook.x = damp(camLook.x, desiredLook.x, rate, dt);
  camLook.y = damp(camLook.y, desiredLook.y, rate, dt);
  camLook.z = damp(camLook.z, desiredLook.z, rate, dt);
  followPos.copy(camLook).addScaledVector(offset, z);
  const a = t * 0.05 + 0.4;
  introPos.set(introLook.x + Math.sin(a) * 52, 36, introLook.z + Math.cos(a) * 52);
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
    toast(`Hi ${looks[playerId].name}! Follow the path to <b>Weekend 1</b>. Press H to hold hands.`, 4400);
  }, 2000);
}
document.getElementById('start').addEventListener('click', start);
ui.updateJourney(stations, stamps, null);

// ------------------------------------------------------------------ per-frame movement
function stepWalker(a, dirX, dirZ, intent, maxSpeed, accel, dt, radius) {
  const len = Math.hypot(dirX, dirZ) || 1;
  const k = Math.min(1, intent);
  a.vel.x = damp(a.vel.x, (dirX / len) * maxSpeed * k, intent > 0.05 ? accel : 9, dt);
  a.vel.z = damp(a.vel.z, (dirZ / len) * maxSpeed * k, intent > 0.05 ? accel : 9, dt);
  a.pos.x += a.vel.x * dt;
  a.pos.z += a.vel.z * dt;
  resolve(a.pos, radius, a.vel);
  a.speed = Math.hypot(a.vel.x, a.vel.z);
}
function stepJump(a, dt, onLand) {
  if (a.air > 0 || a.vy > 0) {
    a.vy -= 20 * dt;
    a.air += a.vy * dt;
    if (a.air <= 0) {
      a.air = 0;
      if (a.vy < -3) onLand?.();
      a.vy = 0;
    }
  }
}
function faceTo(a, dt, targetYaw, rate = 12) {
  const prev = a.yaw;
  a.yaw = dampAngle(a.yaw, targetYaw, rate, dt);
  let turn = a.yaw - prev;
  if (turn > Math.PI) turn -= Math.PI * 2;
  if (turn < -Math.PI) turn += Math.PI * 2;
  a.turn = turn / Math.max(dt, 1e-3);
}

function updatePlayer(dt, ax) {
  const p = P();
  let dirX = camRight.x * ax.x + camFwd.x * ax.y;
  let dirZ = camRight.z * ax.x + camFwd.z * ax.y;
  let intent = Math.hypot(ax.x, ax.y);
  if (intent > 0.05) {
    waypoints = [];
    pendingEnter = false;
  } else if (waypoints.length) {
    const w = waypoints[0];
    const dx = w.x - p.pos.x;
    const dz = w.z - p.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < (waypoints.length > 1 ? 1.0 : 0.3)) {
      waypoints.shift();
      if (!waypoints.length) {
        fx.hideMarker();
        if (pendingEnter) {
          pendingEnter = false;
          enterHome();
        }
      }
    } else {
      dirX = dx / d;
      dirZ = dz / d;
      intent = waypoints.length > 1 ? 1 : Math.min(1, d / 1.2 + 0.3);
    }
  }

  if (activity) {
    if (intent > 0.3 && !waypoints.length) endActivity();
    return;
  }

  if (mount?.type === 'car') {
    // Arcade steering: point the stick or keys where you want to go
    let steer = 0;
    let throttle = 0;
    if (intent > 0.05) {
      const want = Math.atan2(dirX, dirZ);
      let d = want - car.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      steer = -clamp(d * 2.2, -1, 1);
      throttle = Math.abs(d) > 2.4 && car.speed < 2 ? -0.6 : Math.min(1, intent) * (Math.abs(d) > 1.6 ? 0.45 : 1);
    }
    car.drive(dt, { x: steer, y: throttle }, input.running);
    const cp = car.root.position;
    const before = car.speed;
    const v = new THREE.Vector3(Math.sin(car.yaw) * car.speed, 0, Math.cos(car.yaw) * car.speed);
    cp.x += v.x * dt;
    cp.z += v.z * dt;
    resolve(cp, car.radius, v, 0, true);
    const fwd = v.x * Math.sin(car.yaw) + v.z * Math.cos(car.yaw);
    if (Math.abs(fwd) < Math.abs(before) - 2) {
      car.speed = fwd * 0.5;
      sound.kick();
    } else car.speed = fwd;
    carCollider.x = cp.x;
    carCollider.z = cp.z;
    car.update(dt, timer.getElapsed());
    sound.engineSpeed(car.speed);
    p.pos.copy(cp);
    p.speed = Math.abs(car.speed);
    return;
  }

  if (mount?.type === 'pony') {
    const pr = mount.ctl.pony.root;
    const a = { pos: pr.position, vel: p.vel, speed: 0 };
    const run = input.running || waypoints.length > 6;
    stepWalker(a, dirX, dirZ, intent, run ? 11 : 8, 5, dt, 0.75);
    p.speed = a.speed;
    if (a.speed > 0.3) faceTo(p, dt, Math.atan2(p.vel.x, p.vel.z), 6);
    pr.rotation.y = p.yaw;
    stepJump(p, dt, () => {
      sound.land();
      fx.puff(pr.position);
    });
    pr.position.y = p.air;
    mount.ctl.legs(dt, a.speed);
    p.pos.copy(pr.position).setY(0);
    if (a.speed > 6 && Math.random() < dt * 6) fx.puff(pr.position);
    return;
  }

  const run = input.running || waypoints.length > 6;
  stepWalker(p, dirX, dirZ, intent, run ? 7.2 : 4.6, 12, dt, RADIUS);
  p.idle = p.speed > 0.25 ? 0 : p.idle + dt;
  if (p.speed > 0.25) faceTo(p, dt, Math.atan2(p.vel.x, p.vel.z));
  else if (p.idle > 1.2 && !inside) faceTo(p, dt, 0.3, 3);
  else if (p.idle > 1.2 && inside) faceTo(p, dt, 0.2, 3);
  else p.turn = 0;
  stepJump(p, dt, () => {
    p.kid.squash = 0.8;
    sound.land();
    fx.puff(p.pos);
  });
}

const tmpV = new THREE.Vector3();
function updateCompanion(dt) {
  const p = P();
  const c = C();
  if (activity && activity !== 'dance') return;
  if (mount?.type === 'car') return;
  if (activity === 'dance') {
    c.speed = 0;
    return;
  }
  const leader = mount?.type === 'pony' ? mount.ctl.pony.root.position : p.pos;
  if (holding && !mount) {
    // Walk side by side at the player's left, hand in hand
    const target = tmpV.copy(p.pos).add(leftOf(p.yaw, 0.64));
    const before = c.pos.clone();
    const d0 = c.pos.distanceTo(target);
    const pull = d0 > 1.2 ? Math.min(1, (9 * dt) / d0) : 1 - Math.exp(-20 * dt);
    c.pos.lerp(target, pull);
    resolve(c.pos, RADIUS, c.vel);
    const stuck = c.pos.distanceTo(target);
    if (stuck > 0.25 && d0 < 1.2) {
      // Push the player too so the pair moves as one
      p.pos.addScaledVector(tmpV.subVectors(c.pos, target), 0.85);
      resolve(p.pos, RADIUS, p.vel);
    }
    c.vel.subVectors(c.pos, before).divideScalar(Math.max(dt, 1e-3));
    c.speed = Math.min(p.speed + 0.01, Math.hypot(c.vel.x, c.vel.z));
    faceTo(c, dt, p.yaw, 14);
    if (d0 < 0.5) {
      p.kid.holdSide = 1;
      c.kid.holdSide = -1;
    }
    if (stuck > 2.2) {
      holding = false;
      ui.setHands(false);
      p.kid.holdSide = 0;
      c.kid.holdSide = 0;
    }
  } else {
    p.kid.holdSide = 0;
    c.kid.holdSide = 0;
    const leadYaw = mount?.type === 'pony' ? p.yaw : p.yaw;
    const fwd = new THREE.Vector3(Math.sin(leadYaw), 0, Math.cos(leadYaw));
    const target = tmpV.copy(leader).addScaledVector(fwd, mount ? -2.2 : -1.0).add(leftOf(leadYaw, 0.9));
    const dx = target.x - c.pos.x;
    const dz = target.z - c.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > 30) {
      fx.poof(c.pos);
      c.pos.copy(target);
      fx.poof(c.pos);
    }
    const near = d < 0.5;
    const maxS = mount ? 9 : d > 4 ? 7.2 : 4.6;
    stepWalker(c, dx, dz, near ? 0 : clamp((d - 0.4) * 1.5, 0, 1), maxS, 10, dt, RADIUS);
    c.idle = c.speed > 0.25 ? 0 : c.idle + dt;
    if (c.speed > 0.25) faceTo(c, dt, Math.atan2(c.vel.x, c.vel.z));
    else if (c.idle > 1.4) {
      // Turn toward the player, then to the camera
      const toP = Math.atan2(p.pos.x - c.pos.x, p.pos.z - c.pos.z);
      faceTo(c, dt, c.idle > 4 ? 0.3 : toP, 3);
    } else c.turn = 0;
  }
  stepJump(c, dt, () => {
    c.kid.squash = 0.82;
    fx.puff(c.pos);
  });
}

function syncKid(a, dt, t) {
  const k = a.kid;
  if (k.pose === 'stand') {
    k.root.position.set(a.pos.x, a.air, a.pos.z);
    k.root.rotation.set(0, a.yaw, 0);
  }
  k.update(dt, t, k.pose === 'stand' ? a.speed : 0, a.air, a.turn || 0);
  if (k.pose === 'stand') {
    const s = Math.sign(Math.sin(k.walkPhase));
    if (s !== a.stepSign && a.speed > 1 && a.air === 0) {
      if (a === P()) sound.step(s > 0);
      if (a.speed > 3) fx.puff(a.pos);
    }
    a.stepSign = s;
  }
}

// ------------------------------------------------------------------ loop
const timer = new THREE.Timer();
timer.connect(document);
let frameCount = 0;
let fpsFrames = 0;
let fpsTime = performance.now();
// Test hooks for headless checks
window.__roji = {
  renderer,
  scene,
  camera,
  stations,
  actors,
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
  enterHome,
  exitHome,
  startActivity,
  endActivity,
  openWardrobe,
  playGame,
  swapPlayer,
  setZoom: (z) => (zoom = z),
  state: () => ({ playerId, holding, mount: mount?.type, activity, inside, speed: P().speed, yaw: P().yaw }),
  teleport: (id) => {
    const p = byId[id].pad;
    P().pos.set(p.x, 0, p.z);
    C().pos.set(p.x + 1, 0, p.z + 0.6);
    camLook.set(p.x, 0.9, p.z);
  },
};

function frame() {
  timer.update();
  const dt = Math.min(timer.getDelta(), 1 / 20);
  const t = timer.getElapsed();
  tweens.update(dt);
  if (gameOpen) return; // the minigame owns the screen

  camera.getWorldDirection(camFwd);
  camFwd.y = 0;
  camFwd.normalize();
  camRight.crossVectors(camFwd, UP);
  const ax = started && !ui.panelOpen ? input.axis() : { x: 0, y: 0 };
  updatePlayer(dt, ax);
  updateCompanion(dt);
  for (const a of Object.values(actors)) syncKid(a, dt, t);

  // Beach balls
  const pushers = [{ p: P().pos, v: P().vel, r: RADIUS, air: P().air }, { p: C().pos, v: C().vel, r: RADIUS, air: C().air }];
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
    resolve(b.m.position, b.r, b.v, 0.6);
    const bs = Math.hypot(b.v.x, b.v.z);
    if (bs > 0.01) b.m.rotateOnWorldAxis(rollAxis.set(b.v.z / bs, 0, -b.v.x / bs), (bs * dt) / b.r);
  }
  if (!mount) car.update(dt, t);

  // Stations, cards and prompts
  let onPad = null;
  if (!inside) {
    for (const st of stations) {
      st.update(dt, t, P().pos);
      if (st.onPad && started && !mount && !activity) onPad = st;
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

  currentHot = started && !activity && !mount && !currentStation ? currentHotspot() : null;
  let label = null;
  let icon = 'arrow';
  if (activity) [label, icon] = [activity === 'sleep' ? 'Wake up' : activity === 'dance' ? 'Stop dancing' : 'Get up', 'arrow'];
  else if (mount) [label, icon] = [mount.type === 'car' ? 'Get out' : 'Get off', mount.type === 'car' ? 'car' : 'horse'];
  else if (currentHot) [label, icon] = [currentHot.label, currentHot.icon];
  ui.setPrompt(started && !gameOpen ? label : null, icon);
  let aLabel = label;
  if (!aLabel && currentStation) {
    const s = currentStation.stop;
    aLabel = s.kind === 'start' ? 'Go inside' : s.kind === 'place' ? 'Play' : !currentStation.unlocked ? 'Locked' : stamps.has(s.id) ? 'Next' : 'Stamp';
  }
  ui.setActionLabel(aLabel);

  // Movie night hearts, night lighting
  if (activity === 'movie' && Math.random() < dt * 0.4) fx.heartsAt(headPos(C().kid), 1);
  night = damp(night, activity === 'sleep' ? 1 : 0, 2, dt);
  hemi.intensity = 1.35 - night * 1.0;
  sun.intensity = 2.5 - night * 2.1;
  const bg = inside ? INSIDE_DAY.clone().lerp(INSIDE_NIGHT, night) : SKY;
  scene.background.lerp(bg, 1 - Math.exp(-6 * dt));
  scene.fog.color.copy(scene.background);

  world.update(dt, t);
  interior.update(dt, t, inside);
  fx.update(dt, t);
  updateCamera(dt, t);
  if (started && !inside && frameCount % 2 === 0) minimap.draw(mount?.type === 'car' ? car.root.position : P().pos, mount?.type === 'car' ? car.yaw : P().yaw, stamps, t, C().pos, car.root.position);
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
});

document.body.classList.add('ready');
if (params.has('play')) {
  start();
  introBlend = 1;
  tweens.list.length = 0;
  setShadowBox(20);
}
void isGameOpen;
