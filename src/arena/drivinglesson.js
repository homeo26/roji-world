// Driving Lesson: Abu Sanad's course of eight short lessons at Little Wheels Driving School.
// Roji works through them one by one (each unlocks the next) and earns her licence in the driving test.
// Playing as Homama, he takes the same course as a refresher, with Roji cheering at the roadside.
// Point the stick, the arrows or the mouse where to go, hold the brake (E or Brake), Space honks,
// R switches to Reverse in the parking and hill lessons, L switches on the headlights at night.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { damp, dampAngle, clamp, umat, mesh, roundRect, bakeStatic } from '../util.js';
import { Physics } from '../engine/physics.js';
import { C, kit, colorBake, bakeLiveKid, learnerize, setLight, makeAbuSanad, paintText, heartPath } from '../places/driving/kit.js';
import { buildWorld, heightAt, RC, R_OUT, R_IN, ZEBRA, POND, DUCK_Z, SCHOOL } from './drivinglesson/world.js';
import { RingTraffic, Crossing, Fox, Tractor, Ducks, makeUmbrella } from './drivinglesson/people.js';
import { LESSONS } from './drivinglesson/lessons.js';
import { makeUI, STAR } from './drivinglesson/ui.js';

const MAX_SPEED = 6.4;
const MAX_REVERSE = 2.6;
const WHEELBASE = 1.75;
const FRONT = 1.35; // car centre to bumper
const N = LESSONS.length;
const PAINTS = [
  { id: 'sun', color: C.sun, need: 0, name: 'Sunshine' },
  { id: 'pink', color: C.pink, need: 6, name: 'Bubblegum' },
  { id: 'mint', color: C.mint, need: 12, name: 'Mint' },
  { id: 'sky', color: C.sky, need: 18, name: 'Sky' },
  { id: 'lilac', color: C.lilac, need: 24, name: 'Lilac' },
];
const GOOD = {
  first: 'Your very first drive, and every cone is still standing!',
  roundabout: 'You gave way like a pro. The ducks are impressed too.',
  school: 'Slow, careful and kind. The children waved at you!',
  parking: 'Parked like you have done it for years.',
  rain: 'Not one slide in the rain. Lovely, gentle driving.',
  night: 'Lights on, eyes open. The fox will tell all his friends.',
  hill: 'No rolling back, not a scratch on the bridge. Wonderful.',
};
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const toward = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));

// ---------------------------------------------------------------- progress (old one-lesson saves keep loading)
function loadCourse(ctx, who) {
  const key = who === 'roji' ? 'course' : 'hcourse';
  const c = ctx.load(key, null);
  const fresh = { v: 2, stars: Array(N).fill(0), best: Array(N).fill(null), done: Array(N).fill(false), paint: 'sun' };
  if (c && Array.isArray(c.stars)) {
    for (const k of ['stars', 'best', 'done']) fresh[k] = fresh[k].map((v, i) => (c[k]?.[i] ?? v));
    fresh.paint = PAINTS.some((p) => p.id === c.paint) ? c.paint : 'sun';
    return fresh;
  }
  if (who === 'roji') {
    const oldLic = +ctx.load('licence', 0) || 0;
    const oldLessons = +ctx.load('lessons', 0) || 0;
    const oldBest = clamp(+ctx.load('best', 0) || 0, 1, 3);
    const k = oldLic >= 100 ? N : Math.min(N - 1, oldLessons);
    for (let i = 0; i < k; i++) {
      fresh.done[i] = true;
      fresh.stars[i] = oldBest;
    }
  }
  return fresh;
}
const licenceOf = (c, old = 0) => (c.done[N - 1] ? 100 : Math.max(Math.min(95, +old || 0), Math.round((c.done.slice(0, N - 1).filter(Boolean).length / (N - 1)) * 90)));
const totalStars = (c) => c.stars.reduce((a, b) => a + b, 0);
const isOpen = (c, i, who) => who === 'homama' || i === 0 || c.done[i - 1] || c.done[i];

export default {
  id: 'drivinglesson',
  title: 'Driving Lesson',
  tagline: "Abu Sanad's course of eight lessons",

  async start(ctx) {
    const { scene, camera, hud, input, sound, fx } = ctx;
    const env = ctx.env.outdoor({ fog: [70, 190], shadow: 22 });
    const k = kit();
    const { cyl, rbox, at } = k;
    const meIsRoji = ctx.me === 'roji';
    const who = meIsRoji ? 'roji' : 'homama';
    const NAME = meIsRoji ? 'Roji' : 'Homama';
    const FAN = meIsRoji ? 'Homama' : 'Roji';
    const timers = [];
    const later = (ms, fn) => timers.push(setTimeout(() => !disposed && fn(), ms));
    let disposed = false;

    // ---------------------------------------------------------------- the world and everyone in it
    const physics = new Physics();
    const W = buildWorld(ctx);
    for (const c of W.colliders) physics.add(c);
    const rails = W.colliders.filter((c) => c.rail);
    const traffic = new RingTraffic(ctx, k, physics);
    const crossing = new Crossing(ctx, k, physics);
    const fox = new Fox(ctx, k);
    const tractor = new Tractor(ctx, k, physics);
    const ducks = new Ducks(W.ducks, { zebra: ZEBRA, pond: POND, duckZ: DUCK_Z });

    let course = loadCourse(ctx, who);
    const paintColor = () => (PAINTS.find((p) => p.id === course.paint) || PAINTS[0]).color;
    const car = ctx.models.car(paintColor());
    learnerize(car, W.atlas, W.cells);
    car.root.rotation.order = 'YXZ';
    scene.add(car.root);
    const brakeMat = umat('#e5484d', { emissive: '#ff3b3b', ei: 0.4 });
    car.root.traverse((o) => {
      if (o.isMesh && o.material?.emissive && o.material.color.getHexString() === 'e5484d') o.material = brakeMat;
    });
    // Merge the car body (paint, brake lights and headlights keep their own materials, so they still change)
    colorBake(car.body, [car.wheelSteer]);
    bakeStatic(car.body, [car.wheelSteer], mergeGeometries);
    for (const w of car.wheels) colorBake(w.spin);
    // Wipers (rain lesson)
    const wipers = new THREE.Group();
    wipers.position.set(0, 0.99, 0.46);
    wipers.rotation.x = -0.35;
    const blades = [];
    for (const x of [0.32, -0.28]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0, 0.02);
      const blade = mesh(new THREE.BoxGeometry(0.03, 0.42, 0.02), umat(C.ink, { rough: 0.5 }), { cast: false });
      blade.position.y = 0.2;
      pivot.add(blade);
      wipers.add(pivot);
      blades.push(pivot);
    }
    wipers.visible = false;
    car.body.add(wipers);
    // Headlights (night lesson): a spot light and two soft beams
    const head = new THREE.SpotLight('#fff1c8', 0, 26, 0.62, 0.65, 1.2);
    head.position.set(0, 0.7, 1.2);
    head.target.position.set(0, 0, 9);
    car.root.add(head, head.target);
    const beamTex = (() => {
      const cv = document.createElement('canvas');
      cv.width = 4;
      cv.height = 64;
      const c = cv.getContext('2d');
      const g = c.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, 'rgba(255,240,200,0)');
      g.addColorStop(1, 'rgba(255,240,200,0.55)');
      c.fillStyle = g;
      c.fillRect(0, 0, 4, 64);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const beamMat = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.32 });
    const beamGeo = new THREE.CylinderGeometry(0.1, 1.5, 6.5, 14, 1, true);
    beamGeo.rotateX(Math.PI / 2);
    beamGeo.translate(0, 0, 3.3);
    const beams = new THREE.Group();
    for (const x of [0.5, -0.5]) {
      const b = mesh(beamGeo, beamMat, { cast: false, receive: false });
      b.position.set(x, 0.62, 1.32);
      b.rotation.x = 0.1;
      b.renderOrder = 3;
      beams.add(b);
    }
    beams.visible = false;
    car.root.add(beams);
    // The people: the driver, Abu Sanad beside them and the other one cheering at the roadside
    const driver = ctx.makeKid(ctx.me);
    const abu = makeAbuSanad(ctx.makeKid, { scale: 1.04 });
    const fanKid = ctx.makeKid(ctx.partner);
    W.cells.banner = W.atlas.add((c, w, h) => {
      c.fillStyle = C.rose;
      roundRect(c, 4, 20, w - 8, h - 40, 40);
      c.fill();
      c.lineWidth = 8;
      c.strokeStyle = '#ffffff';
      c.setLineDash([16, 12]);
      roundRect(c, 18, 34, w - 36, h - 68, 30);
      c.stroke();
      c.setLineDash([]);
      paintText(c, `GO ${NAME.toUpperCase()}!`, w / 2, h / 2 + 6, h * (meIsRoji ? 0.42 : 0.3), '#ffffff');
      c.fillStyle = C.sun;
      heartPath(c, 46, h / 2 + 10, 26);
      c.fill();
      heartPath(c, w - 46, h / 2 + 10, 26);
      c.fill();
    }, 2);
    const banner = new THREE.Group();
    banner.add(at(W.atlas.plane(0.96, 0.48, W.cells.banner, { cast: true }), 0, 1.78, 0.06));
    banner.add(at(rbox(1.0, 0.52, 0.03, C.white, 0.02), 0, 1.78, 0.04));
    for (const s of [-1, 1]) banner.add(at(cyl(0.018, 0.018, 1.08, C.woodDark, 6), s * 0.34, 1.48, 0.02));
    fanKid.body.add(banner);
    colorBake(banner);
    const umbrella = makeUmbrella(k, meIsRoji ? C.sky : C.rose);
    colorBake(umbrella);
    bakeLiveKid(driver);
    bakeLiveKid(abu);
    bakeLiveKid(fanKid, [banner]);
    scene.add(fanKid.root);
    const fan = { pos: new THREE.Vector3(-4.6, 0, 34), yaw: Math.PI / 2, target: new THREE.Vector3(-4.6, 0, 34), speed: 0 };
    const fanCol = physics.add({ type: 'circle', x: fan.pos.x, z: fan.pos.z, r: 0.45 });
    function seatKids() {
      car.body.add(driver.root);
      driver.pose = 'drive';
      driver.root.rotation.set(0, 0, 0);
      driver.root.position.set(0.33, 0.66, -0.25);
      car.body.add(abu.root);
      abu.pose = 'sit';
      abu.root.rotation.set(0, 0, 0);
      abu.root.position.set(-0.33, 0.66, -0.25);
      out = false;
    }
    let out = false;
    seatKids();

    // Rain and night extras
    const RAIN_N = 1400;
    const rainPos = new Float32Array(RAIN_N * 6);
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#d8e8f4', transparent: true, opacity: 0.55 }));
    rain.frustumCulled = false;
    rain.visible = false;
    scene.add(rain);
    const drops = Array.from({ length: RAIN_N }, () => [Math.random() * 40 - 20, Math.random() * 14, Math.random() * 32 - 16]);
    const fliesGeo = new THREE.BufferGeometry();
    const flyBase = [];
    for (let i = 0; i < 90; i++) {
      const x = -8 + Math.random() * 40;
      const z = -18 + Math.random() * 60;
      if (W.onRoad(x, z, 0.4)) continue;
      flyBase.push([x, 0.4 + Math.random() * 1.2, z, Math.random() * 6]);
    }
    const flyPos = new Float32Array(flyBase.length * 3);
    fliesGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
    const flies = new THREE.Points(fliesGeo, new THREE.PointsMaterial({ color: '#fff3a0', size: 0.16, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    flies.frustumCulled = false;
    flies.visible = false;
    scene.add(flies);

    // ---------------------------------------------------------------- guide arrow and target beacon
    const chev = new THREE.Shape();
    chev.moveTo(0, 0.55);
    chev.lineTo(0.42, 0.05);
    chev.lineTo(0.2, 0.05);
    chev.lineTo(0.2, -0.45);
    chev.lineTo(-0.2, -0.45);
    chev.lineTo(-0.2, 0.05);
    chev.lineTo(-0.42, 0.05);
    chev.closePath();
    const arrowGeo = new THREE.ExtrudeGeometry(chev, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 });
    arrowGeo.rotateX(-Math.PI / 2);
    const arrowMat = umat('#ffd166', { emissive: '#ffb020', ei: 0.55, rough: 0.4 });
    const guide = mesh(arrowGeo, arrowMat, { cast: false });
    scene.add(guide);
    const beacon = new THREE.Group();
    const bcone = mesh(new THREE.ConeGeometry(0.45, 0.7, 4), arrowMat);
    bcone.rotation.x = Math.PI;
    beacon.add(bcone);
    beacon.add(at(mesh(new THREE.BoxGeometry(0.3, 0.6, 0.3), arrowMat), 0, 0.6, 0));
    scene.add(beacon);

    // ---------------------------------------------------------------- HUD
    const ui = makeUI(ctx);
    const meter = () => {
      if (meIsRoji) {
        const p = licenceOf(course, ctx.load('licence', 0));
        ui.meter(`<span class="dl-lic">${p >= 100 ? 'Licence!' : 'Licence'} <i><b style="width:${Math.max(4, p)}%"></b></i></span>`);
      } else ui.meter(`<span class="dl-lic">Refresher ${STAR(true, 15)} ${totalStars(course)}</span>`);
    };
    meter();

    // ---------------------------------------------------------------- state
    let phase = 'menu'; // menu | intro | count | drive | done | licence | result
    let phaseT = 0;
    let L = null;
    let li = 0;
    let tasks = [];
    let ti = 0;
    let wps = [];
    let wpI = 0;
    let task = null;
    let advance = null;
    let oops = 0;
    let faults = [];
    let missed = [];
    let lessonT = 0;
    let coneHits = 0;
    let gear = 'D';
    let lights = false;
    let envNow = 'day';
    let limit = null;
    let overT = 0;
    let overCd = 0;
    let bumpCd = 0;
    let offT = 0;
    let offCd = 0;
    let stuckT = 0;
    let honkCd = 0;
    let beepT = 0;
    let cheerCd = 0;
    let kissCd = 0;
    let passengerCheer = 0;
    let writeT = 0;
    let slipping = false;
    let hotBrake = false;
    let lastResult = null;
    let lapAcc = 0;
    let lapPrev = null;
    let lapEgg = false;
    let lightState = 'red';
    let brakeHeld = false;
    const vel = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const tmp2 = new THREE.Vector3();
    const q = new THREE.Vector3();
    const cones = [];
    const m4 = new THREE.Matrix4();
    const cq = new THREE.Quaternion();
    const ce = new THREE.Euler();
    const one = new THREE.Vector3(1, 1, 1);
    const splashCd = new Map();

    const front = () => tmp.set(car.root.position.x + Math.sin(car.yaw) * FRONT, 0, car.root.position.z + Math.cos(car.yaw) * FRONT);
    const sfx = {
      tone: (f, d, o) => sound?.ctx && !sound.muted && sound.tone(f, sound.ctx.currentTime, d, o),
      quack(n = 2) {
        for (let i = 0; i < n; i++) later(i * 170, () => sfx.tone(560 + Math.random() * 140, 0.12, { type: 'square', gain: 0.04, slideTo: 370 }));
      },
      bonk: () => sfx.tone(180, 0.12, { type: 'triangle', gain: 0.08, slideTo: 120 }),
      thump: () => sfx.tone(110, 0.1, { type: 'sine', gain: 0.1, slideTo: 70 }),
      chime() {
        [72, 76, 79].forEach((n, i) => later(i * 90, () => sfx.tone(440 * Math.pow(2, (n - 69) / 12), 0.25, { type: 'triangle', gain: 0.05 })));
      },
      beep: () => sfx.tone(1180, 0.08, { type: 'square', gain: 0.025 }),
      tick: () => sfx.tone(1500, 0.05, { type: 'triangle', gain: 0.04 }),
      splash() {
        for (let i = 0; i < 4; i++) later(i * 40, () => sfx.tone(900 - i * 150 + Math.random() * 200, 0.12, { type: 'triangle', gain: 0.03, slideTo: 300 }));
      },
    };
    const sayTask = () => !disposed && phase === 'drive' && task && ui.say(task.say);
    const say = (text, whoSays = 'Abu Sanad', ms = 0) => ui.say(text, whoSays, ms, sayTask);
    const starsNow = () => {
      if (L?.test) {
        const serious = faults.filter((f) => f.serious).length;
        const minor = faults.length - serious;
        return serious || minor > 3 ? 0 : minor <= 1 ? 3 : minor === 2 ? 2 : 1;
      }
      return oops <= 0.5 ? 3 : oops <= 2 ? 2 : 1;
    };
    const refreshStars = () => {
      if (L?.test) {
        const serious = faults.filter((f) => f.serious).length;
        ui.setMarks(true, faults.length - serious, serious);
      } else {
        ui.setMarks(false);
        ui.setStars(starsNow());
      }
    };
    const OOPS = ['Oops! Gentle, gentle.', 'Bump! Everyone okay? Good.', `Easy does it, ${NAME}.`];
    let oopsI = 0;
    function addOops(n, line, fault) {
      if (phase !== 'drive') return;
      oops += n;
      dbg.log.push(`${lessonT.toFixed(1)} ${n} ${fault || line || 'bump'}`);
      sfx.bonk();
      say(line || OOPS[oopsI++ % OOPS.length], 'Abu Sanad', 2800);
      if (L.test) {
        faults.push({ text: fault || line || 'Bump', serious: n >= 1 });
        later(350, () => sfx.tick());
        writeT = 1.2;
      }
      refreshStars();
    }
    function setEnv(kind) {
      envNow = kind;
      const night = kind === 'night';
      const wet = kind === 'rain';
      const sky = night ? '#22305a' : wet ? '#9fb4c2' : '#a6dde2';
      scene.background.set(sky);
      scene.fog.color.set(sky);
      scene.fog.near = night ? 30 : wet ? 40 : 70;
      scene.fog.far = night ? 110 : wet ? 140 : 190;
      env.hemi.intensity = night ? 0.42 : wet ? 1.05 : 1.35;
      env.hemi.color.set(night ? '#9fb2f0' : '#fff6ea');
      env.hemi.groundColor.set(night ? '#2f3e48' : '#7fae74');
      env.sun.intensity = night ? 0.5 : wet ? 1.0 : 2.5;
      env.sun.color.set(night ? '#a9bcff' : wet ? '#e8eef5' : '#fff0d8');
      W.bulbMat.emissiveIntensity = night ? 3.2 : 0.25;
      W.pools.visible = night;
      W.fairy.visible = night;
      W.winMat.emissive.set(night ? '#ffcf7a' : '#bfe6ff');
      W.winMat.emissiveIntensity = night ? 1.3 : 0.25;
      W.puddleGroup.visible = wet;
      for (const m of W.wetMats) {
        m.roughness = wet ? 0.38 : 0.9;
        m.color.setScalar(wet ? 0.8 : 1);
      }
      rain.visible = wet;
      wipers.visible = wet;
      flies.visible = night;
      car.headMat.emissiveIntensity = night ? (lights ? 3 : 0.3) : 0.6;
      setLights(lights);
      fanKid.carry(wet ? umbrella : null);
      banner.visible = !wet;
    }
    function setLights(on) {
      lights = on;
      const night = envNow === 'night';
      head.intensity = on && night ? 60 : 0;
      beams.visible = on && night;
      car.headMat.emissiveIntensity = on ? 3 : night ? 0.3 : 0.6;
      document.querySelector('#arena .a-btn[data-b="lights"]')?.classList.toggle('dl-on', on);
    }
    function setLightState(s) {
      lightState = s;
      setLight(W.lampMats, s);
    }
    function setCones(list) {
      cones.length = 0;
      for (const [x, z] of list) cones.push({ x, z, vx: 0, vz: 0, vy: 0, y: 0, tip: 0, tipDir: 0, ry: Math.random() * 6, hit: false });
      W.cones.count = cones.length;
      drawCones();
    }
    function drawCones() {
      cones.forEach((c, i) => {
        ce.set(c.tip * Math.cos(c.tipDir), c.ry, c.tip * Math.sin(c.tipDir), 'YXZ');
        m4.compose(q.set(c.x, 0.04 + c.y + Math.sin(c.tip) * 0.18, c.z), cq.setFromEuler(ce), one);
        W.cones.setMatrixAt(i, m4);
      });
      W.cones.instanceMatrix.needsUpdate = true;
    }
    function placeCar(x, z, yaw) {
      car.root.position.set(x, heightAt(x, z), z);
      car.yaw = yaw;
      car.speed = 0;
      car.steer = 0;
      vel.set(0, 0, 0);
      car.update(0, 0);
    }

    // ---------------------------------------------------------------- the game API the lessons use
    const G = {
      get p() {
        return car.root.position;
      },
      get yaw() {
        return car.yaw;
      },
      get spd() {
        return car.speed;
      },
      get sp() {
        return Math.abs(car.speed);
      },
      front: () => front().clone(),
      get wp() {
        return wps[Math.min(wpI, wps.length - 1)];
      },
      get wpI() {
        return wpI;
      },
      set wpI(v) {
        wpI = Math.min(v, wps.length - 1);
      },
      get light() {
        return lightState;
      },
      get lights() {
        return lights;
      },
      get gear() {
        return gear;
      },
      get coneHits() {
        return coneHits;
      },
      get slipping() {
        return slipping;
      },
      get strict() {
        return !!L?.test;
      },
      get brakeHeld() {
        return brakeHeld;
      },
      name: NAME,
      traffic,
      crossing,
      fox,
      tractor,
      ducks,
      onSplash: null,
      onRail: null,
      setLight: setLightState,
      setLights,
      setLimit: (v) => (limit = v),
      say,
      pop: (html, color) => ui.pop(html, color),
      chime: () => sfx.chime(),
      quack: (n) => sfx.quack(n),
      oops: addOops,
      zone: (x0, z0, x1, z1) => W.showZone(x0, z0, x1, z1),
      hideZone: () => W.hideZone(),
      bay: (x, z, w, d, nose = null) => W.showBay(x, z, w, d, nose),
      hideBay: () => W.hideBay(),
      done(text, praise = true) {
        if (advance) return;
        advance = { text, praise };
      },
    };

    // ---------------------------------------------------------------- lesson flow
    function setTaskI(i) {
      ti = i;
      W.hideZone();
      W.hideBay();
      G.onSplash = null;
      G.onRail = null;
      ui.setTask(i, missed);
      task = tasks[i] || null;
      if (!task) return;
      wps = task.wps || [];
      wpI = 0;
      task.begin?.(G);
      say(task.say);
      const f = task.fan;
      if (f) later(i === 0 ? 0 : 900, () => phase === 'drive' && ti === i && fan.target.set(f[0], 0, f[1]));
    }
    function completeTask({ text, praise }) {
      missed[ti] = !praise;
      if (praise) {
        ui.pop(text, '#fff6c8');
        sound.ui('good');
        fx.burst(car.root.position.clone().setY(car.root.position.y + 2.2), ['#ffd166', '#ffffff', '#7fd8bf', '#ff9eb5'], 22);
        driver.squash = 1.18;
        if (!L.test) passengerCheer = 1.4;
        cheer();
      } else ui.pop(text, '#ffe1e6');
      setTaskI(ti + 1);
      if (ti >= tasks.length) finishLesson();
    }
    const CHEERS = meIsRoji
      ? ['Yay, Roji!', 'Woo! That was perfect!', 'You are amazing, Roji!', 'That is my Roji!', 'Smooth! I could not do it better.']
      : ['Go Homama!', 'So smooth, Homama!', 'Show-off! I love it.', 'That is my Homama!', 'Look at you go, Homama!'];
    function cheer(force = false) {
      if (!force && (cheerCd > 0 || Math.random() < 0.45)) return;
      cheerCd = 11;
      if (fanKid.pose === 'stand' && fan.speed < 0.5) fanKid.emote('cheer');
      later(350, () => phase === 'drive' && say(CHEERS[(Math.random() * CHEERS.length) | 0], FAN, 1700));
    }
    function beginLesson(i) {
      ui.closeCard();
      ui.licenceCard(NAME, false);
      li = i;
      L = LESSONS[i];
      tasks = L.tasks();
      oops = 0;
      faults = [];
      missed = [];
      lessonT = 0;
      coneHits = 0;
      gear = 'D';
      limit = null;
      overT = offT = stuckT = 0;
      slipping = false;
      lapAcc = 0;
      lapPrev = null;
      seatKids();
      setLights(false);
      setEnv(L.env);
      setLightState(L.light || 'red');
      traffic.setup(L.traffic || 0, { night: L.env === 'night' });
      crossing.reset();
      fox.hide();
      tractor.park();
      if (L.id === 'roundabout') ducks.home();
      else ducks.pond();
      setCones(tasks.flatMap((t) => t.cones || []));
      placeCar(...L.start);
      const f0 = tasks[0].fan || [L.start[0] - 4, L.start[1]];
      fan.pos.set(f0[0], heightAt(f0[0], f0[1]), f0[1]);
      fan.target.copy(fan.pos);
      ui.setList(L.test ? 'Test with Abu Sanad' : `Lesson ${i + 1}: ${L.title}`, tasks.map((t) => t.label));
      refreshStars();
      ui.mode('drive');
      hud.buttons({ action: 'Brake', jump: 'Honk', extra: [L.reverse ? { id: 'gear', label: 'Reverse' } : null, L.lights ? { id: 'lights', label: 'Lights' } : null].filter(Boolean) });
      hud.hint(`Arrows, WASD or hold the mouse to steer. Hold E to brake.${L.reverse ? ' R: reverse.' : ''}${L.lights ? ' L: lights.' : ''} Space honks.`);
      phase = 'count';
      phaseT = 0;
      advance = null;
      setTaskI(0);
      say(L.test ? `This is your test, ${NAME}. I will be quiet and mark my sheet. Good luck!` : `Hi ${NAME}! Seatbelt on? ${L.tip}`);
      hud.message(L.test ? 'Driving test' : `Lesson ${i + 1}`, 1400);
      sound.ui('swoosh');
      meter();
    }
    function finishLesson() {
      phase = 'done';
      phaseT = 0;
      W.hideZone();
      W.hideBay();
      limit = null;
      const stars = starsNow();
      const pass = !L.test || stars > 0;
      const wasOpen = li + 1 < N && isOpen(course, li + 1, who);
      const before = totalStars(course);
      const licBefore = licenceOf(course, ctx.load('licence', 0));
      const hadLicence = course.done[N - 1];
      const prevBest = course.best[li];
      const t = Math.round(lessonT * 10) / 10;
      let newBest = false;
      if (pass) {
        course.done[li] = true;
        course.stars[li] = Math.max(course.stars[li], stars);
        if (prevBest == null || t < prevBest) {
          newBest = prevBest != null;
          course.best[li] = t;
        }
      }
      const after = totalStars(course);
      const paint = PAINTS.find((p) => p.need > before && p.need <= after);
      ctx.save(who === 'roji' ? 'course' : 'hcourse', course);
      let lic = null;
      if (meIsRoji) {
        lic = licenceOf(course, ctx.load('licence', 0));
        ctx.save('licence', lic);
        ctx.save('lessons', course.done.filter(Boolean).length);
        ctx.save('best', Math.max(...course.stars));
      }
      const firstLicence = meIsRoji && L.test && pass && !hadLicence;
      const unlocked = firstLicence ? 'Licence: done! Roji is a certified driver.' : pass && li + 1 < N && !wasOpen ? `Unlocked: ${LESSONS[li + 1].title}` : paint ? `New car colour: ${paint.name}!` : '';
      const abuLine = L.test
        ? pass
          ? meIsRoji
            ? hadLicence
              ? 'Passed again! Still safe, kind and careful.'
              : 'You passed! Safe, kind and careful. I am signing your licence now.'
            : 'Refresher passed. Still a safe, kind and careful driver, Homama.'
          : 'Not this time. Look at my sheet, practise those, and try again. You are so close.'
        : stars === 3
          ? GOOD[L.id] || `Not a single wobble. You are a natural, ${NAME}.`
          : stars === 2
            ? 'Very good! A tiny bit gentler next time.'
            : 'Every driver starts somewhere. You are getting better!';
      const fanLine = meIsRoji
        ? L.test
          ? pass
            ? 'You did it, Roji! I knew you would!'
            : 'You were so close. We will practise together, Roji.'
          : ['', 'Every lesson makes you better, Roji.', 'So proud of you, Roji!', 'You are amazing, Roji! Smooth as butter.'][stars]
        : L.test
          ? pass
            ? 'Refresher passed! Will you drive me to the beach?'
            : 'Tough marks! Again, Homama?'
          : ['', 'Still my favourite driver, Homama.', 'Smooth! I am taking notes, Homama.', 'Show-off! That was perfect, Homama.'][stars];
      lastResult = {
        lesson: L,
        i: li,
        who,
        stars,
        pass,
        test: !!L.test,
        title: L.test ? (pass ? (meIsRoji ? 'You passed!' : 'Refresher passed!') : 'Not this time') : ['', 'Lesson done!', 'Lovely driving!', 'Super smooth!'][stars],
        abu: abuLine,
        fan: fanLine,
        fanWho: FAN,
        time: t,
        best: course.best[li],
        newBest,
        unlocked,
        faults: faults.slice(),
        licence: lic,
        gained: lic != null ? lic - licBefore : 0,
        canNext: pass && li + 1 < N,
        nextIsTest: li + 1 === N - 1,
        firstLicence,
      };
      sfx.chime();
      fx.heartsAt(car.root.position.clone().setY(car.root.position.y + 2.4), 5);
      say(L.test ? (pass ? 'That is the end of the test. Pull up... and let me add up my marks.' : 'That is the end of the test. Let me add up my marks.') : stars === 3 ? 'Lesson complete! Smooth as butter.' : `Lesson complete. Well done, ${NAME}!`);
      // A small loving moment at the roadside
      later(700, () => {
        if (disposed || phase !== 'done') return;
        if (fanKid.pose === 'stand') fanKid.emote(pass ? 'heart' : 'wave');
        if (pass) say(fanLine, FAN, 0);
      });
      meter();
      hud.hint('');
      document.querySelector('#arena .a-btn[data-b="action"]')?.classList.remove('dl-hot');
      hotBrake = false;
    }
    function showResult() {
      phase = 'result';
      ui.mode('menu');
      hud.buttons({ action: null, jump: null, stick: false });
      hud.hint('');
      const r = lastResult;
      ui.result(r, {
        next: () => showIntro(r.i + 1),
        again: () => beginLesson(r.i),
        course: () => showCourse(),
        exit: () => ctx.end({ win: r.pass, stars: r.stars, licence: !!r.firstLicence || (r.test && r.pass && meIsRoji), lesson: r.lesson.id }),
      });
    }
    function nextLesson() {
      const i = course.done.findIndex((d, k) => !d && isOpen(course, k, who));
      return i < 0 ? -1 : i;
    }
    function showCourse() {
      phase = 'menu';
      phaseT = 0;
      ui.mode('menu');
      ui.licenceCard(NAME, false);
      hud.buttons({ action: null, jump: null, stick: false });
      hud.hint('');
      seatKids();
      setEnv('day');
      traffic.setup(0);
      setCones([]);
      W.hideZone();
      W.hideBay();
      const nx = nextLesson();
      const s = LESSONS[Math.max(0, nx)].start;
      placeCar(s[0], s[1], s[2]);
      fan.pos.set(s[0] - 3.6, heightAt(s[0] - 3.6, s[1] + 1), s[1] + 1);
      fan.target.copy(fan.pos);
      meter();
      ui.course(
        {
          who,
          lessons: LESSONS,
          stars: course.stars,
          best: course.best,
          done: course.done,
          open: (i) => isOpen(course, i, who),
          next: nx,
          total: totalStars(course),
          licence: licenceOf(course, ctx.load('licence', 0)),
          paints: PAINTS,
          paint: course.paint,
        },
        {
          pick: (v) => showIntro(+v),
          paint: (id) => {
            course.paint = id;
            ctx.save(who === 'roji' ? 'course' : 'hcourse', course);
            car.setColor(paintColor());
            showCourse();
          },
          exit: () => ctx.end(lastResult ? { win: lastResult.pass, stars: lastResult.stars, licence: !!lastResult.firstLicence } : { quit: true }),
        },
      );
    }
    function showIntro(i) {
      phase = 'intro';
      phaseT = 0;
      ui.mode('menu');
      const Ls = LESSONS[i];
      seatKids();
      setLights(false);
      setEnv(Ls.env);
      setCones([]);
      placeCar(...Ls.start);
      const f0 = Ls.tasks()[0].fan || [Ls.start[0] - 4, Ls.start[1]];
      fan.pos.set(f0[0], heightAt(f0[0], f0[1]), f0[1]);
      fan.target.copy(fan.pos);
      ui.intro(Ls, i, { who, lessons: LESSONS, best: course.best }, { start: () => beginLesson(i), back: () => showCourse() });
    }

    // ---------------------------------------------------------------- the licence moment (Roji passes the test)
    let licT = 0;
    function startLicence() {
      phase = 'licence';
      licT = 0;
      ui.mode('party');
      say('Roji, you passed! Here is your driving licence!');
      sound.ui('win');
      sound.wish?.();
    }
    function getOut() {
      out = true;
      const base = car.root.position;
      fx.poof(base.clone().setY(base.y + 1));
      scene.attach(driver.root);
      driver.pose = 'stand';
      driver.root.rotation.set(0, 0, 0);
      driver.root.scale.setScalar(1);
      const rx = base.x + 0.4;
      const rz = base.z + 2.7;
      driver.root.position.set(rx, heightAt(rx, rz), rz);
      scene.attach(abu.root);
      abu.pose = 'stand';
      abu.root.rotation.set(0, 0.35, 0);
      abu.root.position.set(rx - 1.7, heightAt(rx - 1.7, rz), rz - 0.3);
      fx.poof(fan.pos.clone().setY(fan.pos.y + 0.8));
      fan.pos.set(rx + 0.55, heightAt(rx + 0.55, rz), rz);
      fan.target.copy(fan.pos);
      fan.yaw = -Math.PI / 2;
      fx.poof(fan.pos.clone().setY(fan.pos.y + 0.8));
      later(300, () => driver.emote('cheer'));
    }

    // ---------------------------------------------------------------- driving
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ray = new THREE.Raycaster();
    const hit = new THREE.Vector3();
    const dbg = {
      fast: 1,
      auto: false,
      log: [],
      car,
      G,
      get phase() {
        return phase;
      },
      get lesson() {
        return L?.id;
      },
      get task() {
        return task?.label || 'end';
      },
      get ti() {
        return ti;
      },
      get oops() {
        return oops;
      },
      get faults() {
        return faults;
      },
      get stars() {
        return starsNow();
      },
      get result() {
        return lastResult;
      },
      get course() {
        return course;
      },
      get info() {
        const p = car.root.position;
        return { phase, lesson: L?.id, task: task?.label, ti, wpI, x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: +p.y.toFixed(2), yaw: +car.yaw.toFixed(2), spd: +car.speed.toFixed(2), gear, oops, light: lightState, t: +lessonT.toFixed(1) };
      },
      lessonAt(i, { auto = false, fast = 1, rush = false } = {}) {
        dbg.log = [];
        dbg.rush = rush;
        dbg.auto = auto;
        dbg.fast = fast;
        beginLesson(i);
      },
      intro: (i) => showIntro(i),
      courseCard: () => showCourse(),
      teleport(x, z, yaw = car.yaw) {
        placeCar(x, z, yaw);
      },
      reset: () => {
        course = loadCourse(ctx, who);
      },
    };
    window.__drive = dbg;

    function autopilot() {
      const wp = wps[Math.min(wpI, wps.length - 1)] || [car.root.position.x, car.root.position.z];
      const p = car.root.position;
      const a = task?.auto?.(G) || {};
      const want = a.gear || (wp[2] === 'r' ? 'R' : 'D');
      let brake = !!a.brake;
      if (want !== gear) {
        if (Math.abs(car.speed) < 0.3) gear = want;
        else brake = true;
      }
      if (task?.hold?.(G) && wpI === 0 && Math.hypot(wp[0] - p.x, wp[1] - p.z) < 3) brake = true;
      if (traffic.blocking(p.x, p.z, car.yaw)) brake = true;
      // rush: a careless test driver who never brakes (to check that faults are marked)
      if (dbg.rush && gear === 'D') return { want: Math.atan2(wp[0] - p.x, wp[1] - p.z), intent: 1, brake: false };
      return { want: a.want ?? Math.atan2(wp[0] - p.x, wp[1] - p.z), intent: a.intent ?? 1, brake };
    }
    function controls(first) {
      if (first && (input.pressed('gear') || input.pressed('r') || input.pressed('q'))) toggleGear();
      if (first && (input.pressed('lights') || input.pressed('l')) && L?.lights) {
        setLights(!lights);
        sfx.tick();
      }
      if (first && input.pressed('jump') && honkCd <= 0) honk();
      if (dbg.auto) return autopilot();
      const ax = input.axis();
      let dirX = ax.x;
      let dirZ = -ax.y;
      let intent = Math.min(1, Math.hypot(dirX, dirZ));
      const ptr = input.pointer;
      if (intent < 0.05 && ptr.down) {
        ray.setFromCamera(ptr.ndc, camera);
        plane.constant = -car.root.position.y;
        if (ray.ray.intersectPlane(plane, hit)) {
          dirX = hit.x - car.root.position.x;
          dirZ = hit.z - car.root.position.z;
          const d = Math.hypot(dirX, dirZ);
          intent = d < 1.4 ? 0 : clamp(d / 5, 0.35, 1);
        }
      }
      const brake = input.held('action') || input.held('b');
      return { want: intent > 0.05 ? Math.atan2(dirX, dirZ) : null, intent, brake };
    }
    function toggleGear() {
      if (!L?.reverse || phase !== 'drive') return;
      if (Math.abs(car.speed) > 1.2) return say('Stop first, then change gear.', 'Abu Sanad', 1800);
      gear = gear === 'D' ? 'R' : 'D';
      sfx.tick();
      const b = document.querySelector('#arena .a-btn[data-b="gear"]');
      if (b) {
        b.textContent = gear === 'R' ? 'Drive' : 'Reverse';
        b.classList.toggle('dl-on', gear === 'R');
      }
    }
    function honk() {
      honkCd = 0.6;
      sound.honk();
      car.honk();
      const p = car.root.position;
      if (ducks.list.some((d) => Math.hypot(d.g.position.x - p.x, d.g.position.z - p.z) < 9)) {
        sfx.quack(3);
        ducks.quackHop();
      }
      // A little secret: honk near the one cheering and they blow a kiss back
      if (kissCd <= 0 && Math.hypot(fan.pos.x - p.x, fan.pos.z - p.z) < 8 && fanKid.pose === 'stand' && fan.speed < 0.4) {
        kissCd = 14;
        later(250, () => {
          fanKid.emote('kiss');
          fx.heartsAt(fan.pos.clone().setY(fan.pos.y + 1.6), 3);
          if (phase === 'drive' || phase === 'menu') say(meIsRoji ? 'Beep beep to you too, Roji!' : 'Beep beep, my favourite driver!', FAN, 1800);
        });
      }
    }
    function nearestRoute() {
      const p = car.root.position;
      const pts = [L.start, ...tasks.slice(0, ti + 1).flatMap((t) => t.wps || [])];
      let best = null;
      let bd = Infinity;
      for (let i = 1; i < pts.length; i++) {
        const [ax, az] = pts[i - 1];
        const [bx, bz] = pts[i];
        const dx = bx - ax;
        const dz = bz - az;
        const l2 = dx * dx + dz * dz || 1;
        const f = clamp(((p.x - ax) * dx + (p.z - az) * dz) / l2, 0, 1);
        const x = ax + dx * f;
        const z = az + dz * f;
        const d = Math.hypot(p.x - x, p.z - z);
        if (d < bd) {
          bd = d;
          best = { x, z, yaw: Math.atan2(dx, dz) };
        }
      }
      return best;
    }
    function rescue(line) {
      const r = nearestRoute();
      if (!r) return;
      fx.poof(car.root.position.clone().setY(car.root.position.y + 0.8));
      placeCar(r.x, r.z, r.yaw);
      fx.poof(car.root.position.clone().setY(car.root.position.y + 0.8));
      gear = 'D';
      say(line, 'Abu Sanad', 2600);
      offT = stuckT = 0;
    }

    function stepDrive(dt, t, first) {
      const p = car.root.position;
      const driving = phase === 'drive';
      const c = driving ? controls(first) : { want: null, intent: 0, brake: true };
      brakeHeld = c.brake;
      const wet = envNow === 'rain';
      const fx0 = Math.sin(car.yaw);
      const fz0 = Math.cos(car.yaw);
      let spd = vel.x * fx0 + vel.z * fz0;
      let lat = vel.x * fz0 - vel.z * fx0;
      const onRoad = W.onRoad(p.x, p.z, 0.2);
      // Slope along the car (front higher: positive)
      const hf = heightAt(p.x + fx0 * 1.2, p.z + fz0 * 1.2);
      const hb = heightAt(p.x - fx0 * 1.2, p.z - fz0 * 1.2);
      const slope = (hf - hb) / 2.4;
      // Steering toward where the stick points (in Reverse, where the back should go)
      const rev = gear === 'R';
      const vmax = (rev ? MAX_REVERSE : MAX_SPEED) * (onRoad ? 1 : 0.55);
      let target = 0;
      if (c.want !== null && c.intent > 0.05) {
        const d = wrap(c.want - (rev ? car.yaw + Math.PI : car.yaw));
        const maxSteer = 0.68 / (1 + Math.abs(spd) * 0.13);
        car.steer = damp(car.steer, clamp((rev ? -d : d) * 1.7, -maxSteer, maxSteer), 9, dt);
        target = (rev ? -1 : 1) * vmax * Math.min(1, c.intent) * clamp(Math.cos(d) * 1.15, 0.28, 1);
      } else car.steer = damp(car.steer, 0, 6, dt);
      // Gas, brake and coasting
      if (c.brake) spd = toward(spd, 0, (wet ? 6 : 10) * dt);
      else if (c.intent > 0.05) {
        if (spd * target < -0.01) spd = toward(spd, 0, 7 * dt);
        else if (Math.abs(spd) < Math.abs(target)) spd += Math.sign(target) * (rev ? 2.4 : 3.1) * dt;
        else spd = toward(spd, target, 4 * dt);
      } else spd = toward(spd, 0, 1.9 * Math.max(0, 1 - Math.abs(slope) * 4) * dt);
      // Hills pull the car back; the brake holds it still
      if (c.brake && Math.abs(spd) < 0.3) spd = 0;
      else spd -= 9.8 * 0.55 * slope * dt;
      // Turn like a car: the tighter the wheels, the faster it turns, and only while moving
      const yawRate = (spd * Math.tan(car.steer)) / WHEELBASE;
      car.yaw += yawRate * dt;
      car.turnRate = yawRate;
      const fx1 = Math.sin(car.yaw);
      const fz1 = Math.cos(car.yaw);
      // Grip: on a wet road the car keeps sliding sideways for a moment
      let inPuddle = false;
      if (wet)
        for (const [x, z, rx, rz] of W.puddles) {
          if (((p.x - x) / (rx + 0.5)) ** 2 + ((p.z - z) / (rz + 0.5)) ** 2 < 1) inPuddle = true;
        }
      const grip = wet ? (inPuddle ? 1.3 : 2.6) : 30;
      lat *= Math.exp(-grip * dt);
      if (wet) lat += -yawRate * Math.abs(spd) * 0.06 * dt * 6;
      slipping = wet && Math.abs(lat) > 0.75;
      vel.set(fx1 * spd + fz1 * lat, 0, fz1 * spd - fx1 * lat);
      const before = spd;
      p.x += vel.x * dt;
      p.z += vel.z * dt;
      // Collisions: a circle at the front and one at the back
      let railHit = false;
      for (const off of [0.62, -0.62]) {
        q.set(p.x + fx1 * off, 0, p.z + fz1 * off);
        const bx = q.x;
        const bz = q.z;
        for (const r of rails) {
          const dx = q.x - clamp(q.x, r.x - (r.hw ?? 0), r.x + (r.hw ?? 0));
          const dz = q.z - clamp(q.z, r.z - (r.hd ?? 0), r.z + (r.hd ?? 0));
          const rr = r.type === 'circle' ? r.r + 0.82 : 0.82;
          if (r.type === 'circle' ? Math.hypot(q.x - r.x, q.z - r.z) < rr : dx * dx + dz * dz < rr * rr) railHit = true;
        }
        physics.resolve(q, 0.82, vel, { skip: (cc) => cc === fanCol && fan.speed > 0.3 });
        p.x += q.x - bx;
        p.z += q.z - bz;
      }
      if (railHit && driving) G.onRail?.();
      const after = vel.x * fx1 + vel.z * fz1;
      if (Math.abs(after) < Math.abs(before) - 1.2) {
        car.speed = after * 0.6;
        vel.multiplyScalar(0.6);
        if (bumpCd <= 0 && Math.abs(before) > 1.6 && driving) {
          bumpCd = 1.6;
          addOops(0.5, null, 'Bumped into something');
        }
      } else car.speed = after;
      // Height and tilt on the hill and the bridge
      const hc = (heightAt(p.x + fx1 * 1.2, p.z + fz1 * 1.2) + heightAt(p.x - fx1 * 1.2, p.z - fz1 * 1.2)) / 2;
      p.y = damp(p.y, hc, 20, dt);
      // Speed bumps on School Street
      const f = front();
      for (const bxp of SCHOOL.bumps) {
        if (Math.abs(p.z - SCHOOL.z) < 2.6 && Math.abs(f.x - bxp) < 0.22 && Math.abs(car.speed) > 0.3 && bumpCd < 1.2) {
          car.hopV = clamp(Math.abs(car.speed) * 0.55, 0.6, 3.4);
          bumpCd = 1.5;
          sfx.thump();
          if (Math.abs(car.speed) > 3.3) abu.squash = 1.25;
        }
      }
      // Cones
      for (const cn of cones) {
        const dx = cn.x - p.x;
        const dz = cn.z - p.z;
        const d = Math.hypot(dx, dz);
        const lx = dx * Math.cos(car.yaw) - dz * Math.sin(car.yaw);
        const lz = dx * Math.sin(car.yaw) + dz * Math.cos(car.yaw);
        if (Math.abs(lx) < 0.98 && Math.abs(lz) < 1.55 && Math.abs(car.speed) > 0.4) {
          const push = Math.max(1.5, Math.abs(car.speed) * 0.9);
          cn.vx = (dx / (d || 1)) * push + vel.x * 0.4;
          cn.vz = (dz / (d || 1)) * push + vel.z * 0.4;
          cn.vy = 2.2;
          cn.tipDir = Math.atan2(cn.vz, cn.vx);
          if (!cn.hit && driving) {
            cn.hit = true;
            coneHits++;
            addOops(0.5, 'Whoops, a cone! They are tougher than they look.', 'Knocked a cone');
            fx.puff?.(tmp2.set(cn.x, 0.4, cn.z));
          }
        }
        if (cn.vx || cn.vz || cn.vy || cn.y > 0) {
          cn.x += cn.vx * dt;
          cn.z += cn.vz * dt;
          cn.vy -= 14 * dt;
          cn.y = Math.max(0, cn.y + cn.vy * dt);
          if (cn.y === 0) cn.vy = 0;
          cn.vx = damp(cn.vx, 0, 3, dt);
          cn.vz = damp(cn.vz, 0, 3, dt);
          if (Math.abs(cn.vx) + Math.abs(cn.vz) < 0.02) cn.vx = cn.vz = 0;
          cn.ry += (Math.abs(cn.vx) + Math.abs(cn.vz)) * dt;
        }
        if (cn.hit) cn.tip = damp(cn.tip, Math.PI / 2, 9, dt);
      }
      if (!driving) return;
      // Puddle splashes in the rain
      if (wet && Math.abs(car.speed) > 2.4) {
        W.puddles.forEach(([x, z, rx, rz], i) => {
          if (((p.x - x) / (rx + 0.9)) ** 2 + ((p.z - z) / (rz + 0.9)) ** 2 > 1) return;
          if ((splashCd.get(i) || 0) > t) return;
          splashCd.set(i, t + 1.5);
          sfx.splash();
          fx.burst(tmp2.set(x, 0.4, z), ['#bfe6ff', '#ffffff', '#9fc4dc'], 40);
          const near = Math.hypot(fan.pos.x - x, fan.pos.z - z) < 4.2;
          if (near) {
            fanKid.squash = 0.8;
            later(400, () => say(meIsRoji ? 'Ha! I needed a shower anyway!' : 'Homama! My dress! ... I am laughing, it is fine.', FAN, 2400));
          }
          G.onSplash?.(near);
        });
      }
      // Speed limit zones (the school)
      overCd -= dt;
      const inZone = limit && p.x > SCHOOL.x0 && p.x < SCHOOL.x1 && Math.abs(p.z - SCHOOL.z) < 4;
      if (inZone && Math.abs(car.speed) > limit * 1.12) overT += dt;
      else overT = Math.max(0, overT - dt * 2);
      if (overT > 1.1 && overCd <= 0) {
        overCd = 4;
        overT = 0;
        addOops(0.5, 'Slower, please! Under 20 near the school.', 'Too fast in the school zone');
      }
      if (limit && p.x > SCHOOL.x1 + 1) limit = null;
      // Off the road for too long, or stuck: Abu Sanad helps
      offCd -= dt;
      if (!onRoad) {
        offT += dt;
        if (Math.abs(car.speed) > 1 && offCd <= 0) {
          offCd = 6;
          say('Back onto the road, please! The grass is for the ducks.', 'Abu Sanad', 2400);
        }
        if (offT > 4.5) {
          addOops(0.5, null, 'Drove off the road');
          rescue('Let me help. I will steer us back onto the road.');
        }
      } else offT = Math.max(0, offT - dt);
      if (c.intent > 0.5 && !c.brake && Math.abs(car.speed) < 0.25) {
        stuckT += dt;
        if (stuckT > 3.5) rescue('Stuck? No problem, I will pop us back on the road.');
      } else stuckT = 0;
      // Reverse beeps
      if (car.speed < -0.2) {
        beepT -= dt;
        if (beepT <= 0) {
          beepT = 0.55;
          sfx.beep();
        }
      }
    }

    function stepTasks(dt) {
      if (phase !== 'drive' || !task) return;
      const p = car.root.position;
      const wp = wps[wpI];
      const reach = task.reach || 3.2;
      const hold = task.hold?.(G) && wpI === 0;
      if (wp && !hold && wpI < wps.length - 1 && Math.hypot(wp[0] - p.x, wp[1] - p.z) < reach) wpI++;
      task.step(G, dt);
      if (advance) {
        const a = advance;
        advance = null;
        completeTask(a);
      }
      // A secret: three laps of the roundabout in a row
      const dx = p.x - RC.x;
      const dz = p.z - RC.z;
      const d = Math.hypot(dx, dz);
      if (d > R_IN - 0.5 && d < R_OUT + 1) {
        const th = Math.atan2(dz, dx);
        if (lapPrev !== null) lapAcc -= wrap(th - lapPrev);
        lapPrev = th;
        if (!lapEgg && lapAcc > Math.PI * 6.3) {
          lapEgg = true;
          say(`Three times round! Are we lost, ${NAME}, or just having fun?`, 'Abu Sanad', 3000);
          fx.heartsAt(car.root.position.clone().setY(2.6), 6);
        }
      } else {
        lapPrev = null;
        lapAcc = 0;
      }
    }

    function stepFan(dt, t) {
      const dx = fan.target.x - fan.pos.x;
      const dz = fan.target.z - fan.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 30) {
        fx.poof(fan.pos.clone().setY(fan.pos.y + 0.8));
        fan.pos.copy(fan.target);
        fx.poof(fan.pos.clone().setY(heightAt(fan.pos.x, fan.pos.z) + 0.8));
        fan.speed = 0;
      } else if (d > 0.2) {
        fan.speed = damp(fan.speed, Math.min(5.2, d * 2.5), 6, dt);
        fan.pos.x += (dx / d) * fan.speed * dt;
        fan.pos.z += (dz / d) * fan.speed * dt;
        fan.yaw = dampAngle(fan.yaw, Math.atan2(dx, dz), 10, dt);
      } else {
        fan.speed = damp(fan.speed, 0, 10, dt);
        const p = out ? driver.root.position : car.root.position;
        const look = Math.atan2(p.x - fan.pos.x, p.z - fan.pos.z);
        if (!(phase === 'licence' && licT > 2.4)) fan.yaw = dampAngle(fan.yaw, look, 4, dt);
      }
      fan.pos.y = heightAt(fan.pos.x, fan.pos.z);
      fanCol.x = fan.pos.x;
      fanCol.z = fan.pos.z;
      fanKid.root.position.copy(fan.pos);
      fanKid.root.rotation.y = fan.yaw;
      fanKid.update(dt, t, fan.speed, 0, 0);
      if (phase === 'licence' && licT > 1.6) banner.visible = false;
      if (banner.visible && !fanKid.emoteType && !fanKid.carried) {
        const [aL, aR] = fanKid.arms;
        const wig = Math.sin(t * 6) * 0.08;
        aL.rotation.set(0, 0, 2.55 + wig);
        aR.rotation.set(0, 0, -2.55 + wig);
        banner.rotation.z = wig * 0.5;
      }
    }

    // ---------------------------------------------------------------- camera
    const camLook = new THREE.Vector3(0, 0.8, 36);
    const camOff = new THREE.Vector3(0, 12.2, 9.6);
    const CLOSE = new THREE.Vector3(0, 4.4, 7.4);
    const camOffNow = camOff.clone();
    const want = new THREE.Vector3();
    let zoomNow = 1;
    let orbit = 0;
    function stepCamera(dt) {
      const p = car.root.position;
      const aspect = camera.aspect;
      let zoom = aspect < 1 ? 1.45 : aspect > 1.9 ? 0.95 : 1;
      if (phase === 'menu') {
        orbit += dt * 0.05;
        const cx = 26;
        const cz = 14;
        camera.position.set(cx + Math.sin(orbit) * 46, 46, cz + Math.cos(orbit) * 46);
        camera.lookAt(cx, 0, cz);
        camLook.set(p.x, p.y + 0.8, p.z - 4);
        env.follow(tmp2.set(cx, 0, cz));
        return;
      }
      if (phase === 'licence' && out) {
        want.set(driver.root.position.x, driver.root.position.y + 1.4, driver.root.position.z - 1.3);
        camOffNow.lerp(CLOSE, 1 - Math.exp(-2.5 * dt));
        zoom = aspect < 1 ? 1.5 : 1;
      } else {
        camOffNow.lerp(camOff, 1 - Math.exp(-3 * dt));
        if (phase === 'intro' || phase === 'count') {
          want.set(p.x, p.y + 0.8, p.z - 2);
          zoom *= phase === 'count' ? 0.9 + Math.max(0, 1.4 - phaseT) * 0.2 : 0.85;
        } else {
          // Look ahead of where the car is going (behind it when reversing), more when it comes toward the camera
          const dir = car.speed < -0.1 || (gear === 'R' && car.speed < 0.1) ? -1 : 1;
          const tx = Math.sin(car.yaw) * dir;
          const tz = Math.cos(car.yaw) * dir;
          const ahead = (dir < 0 ? 1.4 : 2.2) + clamp(Math.abs(car.speed), 0, MAX_SPEED) * 0.45 + Math.max(0, tz) * 1.6;
          want.set(p.x + tx * ahead, p.y + 0.8, p.z + tz * ahead);
        }
        zoom *= task?.zoom || 1;
      }
      zoomNow = damp(zoomNow, zoom, 3, dt);
      const rate = 1 - Math.exp(-3.2 * dt);
      camLook.lerp(want, rate);
      camera.position.copy(camLook).addScaledVector(camOffNow, zoomNow);
      camera.lookAt(camLook);
      env.follow(camLook);
    }

    // ---------------------------------------------------------------- frame
    const engineWasOn = !!sound.engineOsc;
    if (!engineWasOn) sound.engine(true);
    if (ctx.opts?.lesson != null) showIntro(clamp(+ctx.opts.lesson, 0, N - 1));
    else showCourse();

    function step(dt, t, first) {
      phaseT += dt;
      bumpCd -= dt;
      honkCd -= dt;
      cheerCd -= dt;
      kissCd -= dt;
      passengerCheer = Math.max(0, passengerCheer - dt);
      writeT = Math.max(0, writeT - dt);
      if (phase === 'count' && phaseT > 1.4) {
        phase = 'drive';
        phaseT = 0;
        hud.message('Go!', 700);
        sound.ui('good');
      }
      if (phase === 'drive') lessonT += dt;
      stepDrive(dt, t, first);
      stepTasks(dt);
      ducks.update(dt, t);
      traffic.update(dt, t, car.root.position, sound);
      crossing.update(dt, t);
      fox.update(dt, t, car.root.position, lights);
      const p = car.root.position;
      tractor.update(dt, t, p.z > 24.0 && p.z < 32.2 && Math.abs(p.x - 60) < 2.4, sound);
      if (phase === 'done' && phaseT > 2.4 && !dbg.resultShown) {
        dbg.resultShown = true;
        if (lastResult.firstLicence) startLicence();
        else showResult();
      }
      if (phase !== 'done') dbg.resultShown = false;
      if (phase === 'licence') {
        licT += dt;
        if (licT > 0.6 && !out) getOut();
        if (licT > 1.8 && !dbg.cardShown) {
          dbg.cardShown = true;
          ui.licenceCard('Roji', true);
          fx.burst(driver.root.position.clone().setY(driver.root.position.y + 1.6), ['#ffd166', '#ff9eb5', '#7fd8bf', '#6fb8ff', '#ffffff'], 90);
          say('I knew you could do it, Roji! I am so proud of you!', 'Homama', 0);
          fanKid.emote('cheer');
        }
        // Homama and Roji share a hug, facing each other
        if (licT > 3.2 && !dbg.hugged) {
          dbg.hugged = true;
          const r = driver.root.position;
          fan.pos.set(r.x + 0.55, r.y, r.z);
          fan.target.copy(fan.pos);
          fan.yaw = -Math.PI / 2;
          driver.root.rotation.y = Math.PI / 2;
          driver.emote('hug');
          fanKid.emote('hug');
          fx.heartsAt(r.clone().setY(r.y + 1.8), 6);
        }
        if (licT > 2 && Math.floor(licT * 1.4) !== Math.floor((licT - dt) * 1.4)) fx.burst(driver.root.position.clone().setY(driver.root.position.y + 2.4 + Math.random()), ['#ffd166', '#ff9eb5', '#7fd8bf', '#ffffff'], 30);
        if (licT > 6.6 && !dbg.licDone) {
          dbg.licDone = true;
          ui.licenceCard('Roji', false);
          showResult();
        }
      } else dbg.cardShown = dbg.hugged = dbg.licDone = false;
    }

    return {
      update(dt, t) {
        const n = Math.max(1, dbg.fast | 0);
        for (let i = 0; i < n; i++) step(dt, t + i * dt, i === 0);
        car.update(dt, t);
        car.root.rotation.x = -Math.atan2(heightAt(car.root.position.x + Math.sin(car.yaw) * 1.2, car.root.position.z + Math.cos(car.yaw) * 1.2) - heightAt(car.root.position.x - Math.sin(car.yaw) * 1.2, car.root.position.z - Math.cos(car.yaw) * 1.2), 2.4);
        brakeMat.emissiveIntensity = brakeHeld && Math.abs(car.speed) > 0.05 ? 2.4 : brakeHeld ? 1.2 : car.speed < -0.1 ? 1.4 : 0.35;
        sound.engineSpeed(car.speed);
        driver.update(dt, t, 0, 0, out ? 0 : car.turnRate || 0);
        if (abu.root.parent === car.body) abu.hands = passengerCheer > 0 ? 'wave2' : writeT > 0 ? 'read' : 'carry';
        else abu.hands = 'carry';
        abu.update(dt, t, 0, 0, 0);
        stepFan(dt, t);
        drawCones();
        // Wipers swish in the rain
        if (wipers.visible) {
          const a = Math.sin(t * 4.2);
          blades[0].rotation.z = 0.2 + a * 0.95;
          blades[1].rotation.z = 0.2 + a * 0.95;
        }
        // Rain falls round the camera
        if (rain.visible) {
          const cx = camLook.x;
          const cz = camLook.z;
          for (let i = 0; i < RAIN_N; i++) {
            const d = drops[i];
            d[1] -= dt * 16;
            if (d[1] < 0) {
              d[1] += 14;
              d[0] = Math.random() * 40 - 20;
              d[2] = Math.random() * 32 - 16;
            }
            const x = cx + d[0];
            const z = cz + d[2];
            rainPos.set([x, d[1], z, x + 0.06, d[1] + 0.5, z + 0.03], i * 6);
          }
          rainGeo.attributes.position.needsUpdate = true;
        }
        if (flies.visible) {
          flyBase.forEach(([x, y, z, ph], i) => flyPos.set([x + Math.sin(t * 0.7 + ph) * 0.5, y + Math.sin(t * 1.3 + ph) * 0.25, z + Math.cos(t * 0.6 + ph) * 0.5], i * 3));
          fliesGeo.attributes.position.needsUpdate = true;
          flies.material.opacity = 0.55 + Math.sin(t * 3) * 0.3;
        }
        // Guide arrow ahead of the car and the beacon over the target
        const p = car.root.position;
        const wp = wps[wpI];
        const holdNow = task?.hold?.(G) && wpI === 0 && wp && Math.hypot(wp[0] - p.x, wp[1] - p.z) < 3;
        const showGuide = phase === 'drive' && wp && !holdNow;
        guide.visible = !!showGuide;
        if (showGuide) {
          const a = Math.atan2(wp[0] - p.x, wp[1] - p.z);
          const gx = p.x + Math.sin(a) * 3.0;
          const gz = p.z + Math.cos(a) * 3.0;
          guide.position.set(gx, heightAt(gx, gz) + 0.14 + Math.sin(t * 4) * 0.04, gz);
          guide.rotation.set(0, a + Math.PI, 0);
          const s = 1.15 + Math.sin(t * 6) * 0.08;
          guide.scale.set(s, 0.6, s);
        }
        arrowMat.color.set(gear === 'R' && phase === 'drive' ? '#ff9eb5' : '#ffd166');
        const b = task?.beacon;
        beacon.visible = phase === 'drive' && !!b;
        if (beacon.visible) {
          beacon.position.set(b[0], heightAt(b[0], b[1]) + b[2] + 0.2 + Math.abs(Math.sin(t * 3)) * 0.4, b[1]);
          beacon.rotation.y = t * 1.5;
        }
        arrowMat.emissiveIntensity = 0.45 + Math.sin(t * 6) * 0.2;
        // The Brake button pulses when it is time to stop
        const needBrake = phase === 'drive' && Math.abs(car.speed) > 0.3 && !!task?.needBrake?.(G);
        if (needBrake !== hotBrake) {
          hotBrake = needBrake;
          document.querySelector('#arena .a-btn[data-b="action"]')?.classList.toggle('dl-hot', needBrake);
        }
        W.zoneMat.opacity = 0.65 + 0.25 + Math.sin(t * 5) * 0.12;
        W.glowMat.opacity = 0.55 + Math.sin(t * 5) * 0.3;
        W.fairyMat.emissiveIntensity = 1.6 + Math.sin(t * 3) * 0.8;
        if (phase === 'drive' || phase === 'count') {
          const kmh = Math.round(Math.abs(car.speed) * 5);
          const inZone = limit && p.x > SCHOOL.x0 - 4 && p.x < SCHOOL.x1;
          ui.setSpeed(kmh, { limit: inZone ? 20 : null, over: inZone && kmh > 22, gear, night: envNow === 'night', lights });
        }
        stepCamera(dt);
      },
      dispose() {
        disposed = true;
        for (const id of timers) clearTimeout(id);
        ui.dispose();
        if (!engineWasOn) sound.engine(false);
        if (window.__drive === dbg) delete window.__drive;
      },
    };
  },
};
