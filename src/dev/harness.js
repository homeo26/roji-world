import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Kid } from '../kid.js';
import { Effects } from '../fx.js';
import { Sound } from '../audio.js';
import { Input } from '../input.js';
import { loadLooks } from '../looks.js';
import { damp, clamp } from '../util.js';
import { ICONS } from '../icons.js';
import { makePony } from '../stations.js';
import { Physics } from '../engine/physics.js';
import { decorateGround } from '../engine/ground.js';
import { Spaces } from '../engine/spaces.js';
import { Activities } from '../engine/activities.js';
import { ArenaHost } from '../engine/arena.js';
import { PLACES, INTERIORS } from '../engine/manifest.js';
import { makeActor, stepWalker, stepVertical, tryJump, faceTo, syncKid, RADIUS } from '../engine/movement.js';
import { loadProps } from '../engine/props.js';

// Dev harness: one place (or one interior, or one 3D game) on a flat lawn, with the real kids,
// controls, hotspots, activities, interiors and minigame host. dev.html?place=zoo | ?interior=cinema | ?arena=kartrace
// Add &as=homama to play Homama, &enter to go straight inside the place's interior.

const params = new URLSearchParams(location.search);
await Promise.race([document.fonts.load('600 40px Fredoka'), new Promise((r) => setTimeout(r, 1200))]);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const SKY = new THREE.Color('#a6dde2');
scene.background = SKY.clone();
scene.fog = new THREE.Fog(SKY.clone(), 50, 140);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.3;
const hemi = new THREE.HemisphereLight('#fff6ea', '#7fae74', 1.35);
const sun = new THREE.DirectionalLight('#fff0d8', 2.5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.04;
const shadowBox = (half) => {
  const c = sun.shadow.camera;
  c.left = c.bottom = -half;
  c.right = c.top = half;
  c.near = 1;
  c.far = 80;
  c.updateProjectionMatrix();
};
shadowBox(24);
scene.add(hemi, sun, sun.target);
const SUN_OFFSET = new THREE.Vector3(-11, 22, 12);
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 400);

// Lawn
const groundMat = new THREE.MeshStandardMaterial({ color: '#9ad06a', roughness: 0.95 });
const ground = decorateGround([groundMat]);
const lawn = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), groundMat);
lawn.rotation.x = -Math.PI / 2;
lawn.receiveShadow = true;
scene.add(lawn);

const physics = new Physics();
physics.bounds = (p) => {
  if (game.spaces.inside) return;
  const d = Math.hypot(p.x, p.z);
  if (d > 140) p.multiplyScalar(140 / d);
};
const fx = new Effects(scene);
fx.initExtras();
const sound = new Sound();
const looks = loadLooks();
let playerId = params.get('as') === 'homama' ? 'homama' : 'roji';
const other = (id) => (id === 'roji' ? 'homama' : 'roji');

const toastEl = document.getElementById('toast');
let toastTimer = 0;
function toast(html, ms = 2600) {
  toastEl.innerHTML = html;
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms);
}
const fadeEl = document.getElementById('fade');
function fade(fn) {
  fadeEl.classList.add('on');
  setTimeout(() => {
    fn();
    setTimeout(() => fadeEl.classList.remove('on'), 60);
  }, 320);
}

// ------------------------------------------------------------------ game object shared with the engine
let night = 0;
let nightTarget = 0;
let focus = null;
let t = 0;
const game = {
  scene,
  physics,
  ground,
  looks,
  sound,
  fx,
  actors: {},
  playerId: () => playerId,
  toast,
  time: () => t,
  emote: (a, type) => a?.kid.emote(type),
  setNight: (k) => (nightTarget = k),
  setFocus: (spec) => (focus = spec),
  fade,
  props: loadProps(),
  onEnterInterior(space) {
    placePair(space.spawn, space.spawnYaw);
    document.body.classList.add('inside');
    shadowBox(14);
    toast(`Inside: <b>${space.title || space.id}</b>`, 1800);
  },
  onExitInterior(space) {
    placePair(space.returnTo, 0);
    document.body.classList.remove('inside');
    shadowBox(24);
  },
  playArena: (id, opts = {}) => openArena(id, opts),
};
game.activities = new Activities(game);
game.spaces = new Spaces(game);

// ------------------------------------------------------------------ kids
let zoom = 1;
const camLook = new THREE.Vector3(0, 0.9, 6);
function addKid(id, x, z) {
  const kid = new Kid(looks[id]);
  scene.add(kid.root);
  kid.onEmoteFx = () => fx.heartsAt(kid.head.localToWorld(new THREE.Vector3(0, 0.75, 0)), 4);
  return makeActor(id, kid, x, z, 0);
}
game.actors.roji = addKid('roji', 0, 6);
game.actors.homama = addKid('homama', 1, 6.4);
const P = () => game.actors[playerId];
const C = () => game.actors[other(playerId)];
const leftOf = (yaw, d) => new THREE.Vector3(Math.cos(yaw) * d, 0, -Math.sin(yaw) * d);
function placePair(pos, yaw) {
  P().pos.set(pos.x, 0, pos.z);
  C().pos.copy(P().pos).add(leftOf(yaw, 0.9));
  for (const a of [P(), C()]) {
    a.yaw = yaw;
    a.y = 0;
    a.vy = 0;
    a.vel.set(0, 0, 0);
  }
  camLook.set(pos.x, 0.9, pos.z);
}

// ------------------------------------------------------------------ arena
const input = new Input(renderer.domElement, {
  onTap: (x, y) => tapWalk(x, y),
  onAction: () => action(),
  onJump: () => jump(),
  onZoom: (d) => (zoom = clamp(zoom + d, 0.5, 1.8)),
  onKey: (k, e) => {
    if (k === 'tab') {
      e.preventDefault();
      playerId = other(playerId);
      toast(`Now playing as <b>${looks[playerId].name}</b>`, 1500);
    }
    const n = Number(k);
    const EM = ['wave', 'dance', 'spin', 'cheer', 'heart', 'bow'];
    if (n >= 1 && n <= 6 && !game.activities.active) P().kid.emote(EM[n - 1]);
  },
});
input.attachStick(document.getElementById('stick'), document.getElementById('stick-knob'));
input.enabled = true;
if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
document.body.classList.add('playing');
const arena = new ArenaHost({ renderer, sound, input, looks, models: { pony: (coat) => makePony(coat) }, onOpen: () => {}, onClose: () => {} });
game.arena = arena;
function openArena(id, opts = {}) {
  return arena.open(id, { me: playerId, ...opts });
}
document.getElementById('t-action').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  action();
});
document.getElementById('t-jump').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  jump();
});

// ------------------------------------------------------------------ load what we are testing
const only = params.get('place');
const interiorOnly = params.get('interior');
if (only) {
  const def = PLACES.find((p) => p.id === only);
  if (!def) toast(`Unknown place "${only}". Add it to src/engine/manifest.js.`, 6000);
  else {
    await game.spaces.load({ only: [only], slots: { [only]: [0, 0] }, interiors: false });
    const s = game.spaces.byId[only];
    if (s) placePair(s.pad, 0);
    else toast(`Place "${only}" failed to load. See the console.`, 6000);
  }
} else if (interiorOnly) {
  const def = INTERIORS.find((p) => p.id === interiorOnly);
  if (!def) toast(`Unknown interior "${interiorOnly}".`, 6000);
  else {
    try {
      const mod = (await import('../engine/' + def.module)).default;
      game.spaces.addInterior(interiorOnly, mod, new THREE.Vector3(0, 0, 0));
      placePair(new THREE.Vector3(0, 0, 2), 0);
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.3), new THREE.MeshStandardMaterial({ color: '#c98a5a' }));
      door.position.set(0, 1.1, -0.3);
      scene.add(door);
    } catch (e) {
      console.error(e);
      toast(`Interior "${interiorOnly}" failed to load.`, 6000);
    }
  }
}
const enterKey = only || interiorOnly;
if (params.has('enter') && game.spaces.interiors[enterKey]) setTimeout(() => game.spaces.enter(enterKey, { force: true }), 300);
if (params.get('arena')) setTimeout(() => openArena(params.get('arena')), 300);
sound.start({ music: !params.has('nomusic') });

// Pad marker and card for the place
const card = document.getElementById('card');
const space = only ? game.spaces.byId[only] : null;
if (space) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.95, 40), new THREE.MeshBasicMaterial({ color: space.stop.color || '#ef5b6f', transparent: true, opacity: 0.7 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(space.pad.x, 0.03, space.pad.z);
  scene.add(ring);
}
let cardFor = null;
function showCard(s) {
  const st = s.stop;
  const games = s.def ? game.spaces.buildCtx(s).arenasHere : [];
  card.innerHTML = `<div class="card-band" style="background:${st.color || '#ef5b6f'}"></div><div class="card-body"><div class="eyebrow">${st.tag || 'Place'}</div><h2>${st.title || s.id}</h2><p>${st.text || ''}</p><div class="card-actions">${games.map((id) => `<button class="btn game" data-arena="${id}">Play ${id}</button>`).join('')}</div></div>`;
  card.classList.remove('hidden');
  for (const b of card.querySelectorAll('[data-arena]')) b.addEventListener('click', () => openArena(b.dataset.arena));
}

// ------------------------------------------------------------------ actions
let currentHot = null;
function action() {
  if (arena.active) return;
  if (game.activities.active) return game.activities.end();
  if (currentHot) return currentHot.act();
}
function jump() {
  if (arena.active || game.activities.active) return;
  const r = tryJump(P());
  if (!r) return;
  P().kid.squash = r === 'double' ? 1.15 : 1.25;
  sound.jump();
  if (r === 'double') fx.burst(P().kid.root.position.clone().setY(P().y + 0.6), ['#ffd166', '#ffffff', '#ff8fb1'], 16);
}
const ray = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let waypoint = null;
function tapWalk(x, y) {
  if (arena.active || game.activities.active) return;
  ray.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), camera);
  const hit = new THREE.Vector3();
  if (ray.ray.intersectPlane(groundPlane, hit)) {
    waypoint = hit;
    fx.showMarker(hit);
  }
}

// ------------------------------------------------------------------ camera
const camFwd = new THREE.Vector3();
const camRight = new THREE.Vector3();
const OUT = new THREE.Vector3(0, 12, 13.5);
const IN = new THREE.Vector3(0, 8.2, 10.5);
const offset = OUT.clone();
function updateCamera(dt) {
  const p = P();
  const want = new THREE.Vector3(p.pos.x + p.vel.x * 0.2, 0.9 + p.y * 0.5, p.pos.z + p.vel.z * 0.2);
  let z = zoom * (camera.aspect < 1 ? 1.4 : 1);
  const inside = game.spaces.inside;
  offset.lerp(inside ? IN : OUT, 1 - Math.exp(-4 * dt));
  if (inside) {
    const b = inside.bounds;
    want.x = clamp(want.x, b.x0 + 2, b.x1 - 2);
    want.z = clamp(want.z, b.z0 + 1, b.z1 - 1);
  }
  if (focus) {
    want.set(focus.x, focus.y ?? 1, focus.z);
    z = focus.zoom ?? 0.62;
  }
  camLook.x = damp(camLook.x, want.x, 4, dt);
  camLook.y = damp(camLook.y, want.y, 4, dt);
  camLook.z = damp(camLook.z, want.z, 4, dt);
  camera.position.copy(camLook).addScaledVector(offset, z);
  camera.lookAt(camLook);
  sun.position.copy(camLook).add(SUN_OFFSET);
  sun.target.position.copy(camLook);
}

// ------------------------------------------------------------------ loop
const promptEl = document.getElementById('prompt');
const actionEl = document.getElementById('t-action');
const timer = new THREE.Timer();
timer.connect(document);
const tmp = new THREE.Vector3();
window.__dev = {
  game,
  renderer,
  scene,
  camera,
  arena,
  get player() {
    return P();
  },
  teleport: (x, z) => placePair(new THREE.Vector3(x, 0, z), 0),
  hotspots: () => game.spaces.hotspots().map((h) => ({ label: h.label, x: +h.pos.x.toFixed(2), z: +h.pos.z.toFixed(2) })),
  // Walk next to the hotspot whose label contains `text`, then press it
  act(text) {
    const h = game.spaces.hotspots().find((q) => q.label && q.label.toLowerCase().includes(text.toLowerCase()));
    if (!h) return false;
    placePair(h.pos.clone().add(new THREE.Vector3(0, 0, 0.3)), 0);
    h.act();
    return true;
  },
  openArena,
  setZoom: (z) => (zoom = z),
  info: () => renderer.info.render,
};

function frame() {
  timer.update();
  const dt = Math.min(timer.getDelta(), 1 / 20);
  t = timer.getElapsed();
  if (arena.active) {
    arena.frame(dt, t);
    return;
  }
  camera.getWorldDirection(camFwd);
  camFwd.y = 0;
  camFwd.normalize();
  camRight.crossVectors(camFwd, new THREE.Vector3(0, 1, 0));
  const ax = input.axis();
  let dirX = camRight.x * ax.x + camFwd.x * ax.y;
  let dirZ = camRight.z * ax.x + camFwd.z * ax.y;
  let intent = Math.hypot(ax.x, ax.y);
  const p = P();
  if (intent > 0.05) waypoint = null;
  else if (waypoint) {
    const dx = waypoint.x - p.pos.x;
    const dz = waypoint.z - p.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.3) {
      waypoint = null;
      fx.hideMarker();
    } else {
      dirX = dx;
      dirZ = dz;
      intent = Math.min(1, d / 1.2 + 0.3);
    }
  }

  if (game.activities.active) game.activities.update(dt, t, intent);
  else {
    p.surface = game.spaces.zoneAt(p.pos.x, p.pos.z);
    stepWalker(p, physics, dirX, dirZ, intent, input.running ? 7.2 : 4.6, 12, dt);
    if (stepVertical(p, physics, dt, game.spaces.waterAt(p.pos.x, p.pos.z)) === 'land') {
      p.kid.squash = 0.72;
      sound.land();
      fx.puff(p.pos);
    }
    if (p.speed > 0.25) faceTo(p, dt, Math.atan2(p.vel.x, p.vel.z));
    else p.turn = 0;
    // Partner follows
    const c = C();
    c.surface = game.spaces.zoneAt(c.pos.x, c.pos.z);
    const target = tmp.copy(p.pos).addScaledVector(new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw)), -1).add(leftOf(p.yaw, 0.9));
    const dx = target.x - c.pos.x;
    const dz = target.z - c.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > 25) c.pos.copy(target);
    stepWalker(c, physics, dx, dz, d < 0.5 ? 0 : clamp((d - 0.4) * 1.5, 0, 1), d > 4 ? 7.2 : 4.6, 10, dt);
    stepVertical(c, physics, dt, game.spaces.waterAt(c.pos.x, c.pos.z));
    if (c.speed > 0.25) faceTo(c, dt, Math.atan2(c.vel.x, c.vel.z));
    else c.turn = 0;
    if (p.y - p.ground < 0.02 && c.y - c.ground < 0.02 && p.vy === 0 && p.jumps === 0 && Math.random() < 0) tryJump(c);
  }
  for (const a of Object.values(game.actors)) {
    if (a.seated) a.kid.update(dt, t, 0, 0, 0);
    else syncKid(a, dt, t);
  }

  // Hotspots and card
  const hs = game.spaces.hotspots();
  currentHot = null;
  let best = Infinity;
  if (!game.activities.active) {
    for (const h of hs) {
      if (!h.when()) continue;
      const dd = Math.hypot(p.pos.x - h.pos.x, p.pos.z - h.pos.z);
      if (dd < h.r && dd < best) {
        best = dd;
        currentHot = h;
      }
    }
  }
  const label = game.activities.active ? game.activities.label : currentHot?.label;
  if (label) {
    const icon = currentHot && !game.activities.active ? currentHot.icon : 'arrow';
    promptEl.innerHTML = `<kbd>E</kbd><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[icon] || ICONS.star}"/></svg> ${label}`;
    promptEl.classList.remove('hidden');
    actionEl.classList.remove('idle');
    actionEl.querySelector('span').textContent = label;
  } else {
    promptEl.classList.add('hidden');
    actionEl.classList.add('idle');
    actionEl.querySelector('span').textContent = '';
  }
  const onPad = space && !game.spaces.inside && Math.hypot(p.pos.x - space.pad.x, p.pos.z - space.pad.z) < 2.1;
  if (onPad && cardFor !== space) {
    cardFor = space;
    showCard(space);
  } else if (!onPad && cardFor) {
    cardFor = null;
    card.classList.add('hidden');
  }

  night = damp(night, nightTarget, 2, dt);
  hemi.intensity = 1.35 - night * 1.0;
  sun.intensity = 2.5 - night * 2.1;
  scene.background.copy(SKY).lerp(new THREE.Color('#2a2850'), night * 0.9);
  if (game.spaces.inside) scene.background.copy(new THREE.Color(game.spaces.inside.inst.background || '#f7dcc8')).lerp(new THREE.Color('#3b3560'), night);
  scene.fog.color.copy(scene.background);
  game.spaces.update(dt, t, p.pos);
  fx.update(dt, t);
  updateCamera(dt);
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(frame);
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
