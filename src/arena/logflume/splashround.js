import * as THREE from 'three';
import { buildPath } from '../coaster/track.js';
import { SPLASH, START } from './courses.js';
import { buildWorld, THEMES } from './world.js';
import { makeWater } from './water.js';
import { makeBlaster } from './models.js';
import { makeCrew, makeSfx, snapPhoto, flash } from './rig.js';
import { kit, heartPath, mergeGeometries } from '../../places/school/kit.js';
import { canvasTexture, umat, FONT } from '../../util.js';

// Splash Attack: the log floats slowly round a lazy river in a garden and targets pop up on the banks.
// Aim the water blaster (A/D turn it, W/S aim near or far, or tap a target) and splash them: frogs and
// buckets first, then wilted flowers that bloom when watered and pirates that pop up from the hedges,
// then ducks, a golden bell and a sleepy cat that would much rather stay dry. 75 seconds in three waves.

const WAVES = [
  { name: 'Splash the frogs and buckets!', kinds: ['frog', 'frog', 'bucket'], every: 1.25, max: 6, speed: 2.0 },
  { name: 'Water the flowers, splash the pirates!', kinds: ['flower', 'flower', 'pirate', 'frog'], every: 1.05, max: 7, speed: 2.4 },
  { name: 'Ducks and the golden bell. Let the cat sleep!', kinds: ['duck', 'pirate', 'flower', 'cat', 'duck', 'bell', 'cat'], every: 0.9, max: 8, speed: 2.8 },
];
const WAVE_T = 25;
const SIZE = 1.35; // targets are drawn a little larger than life so they read on a phone
const POINTS = { frog: 1, bucket: 1, flower: 2, pirate: 2, duck: 2, bell: 5, heart: 3, cat: -3 };
const damp = (a, b, r, dt) => a + (b - a) * (1 - Math.exp(-r * dt));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const name = (id) => (id === 'roji' ? 'Roji' : 'Homama');

export function runSplashRound(ctx, { prog, flow, dbg, rider }) {
  const { scene, camera, hud, input, sound, fx } = ctx;
  const k = kit();
  const TH = THEMES.day;
  hud.title('Log Flume', SPLASH.name);
  const track = buildPath({ ...START, closed: true }, SPLASH.pieces, { step: 0.25 });
  const env = ctx.env.outdoor({ sky: TH.fog, fog: TH.fogR, shadow: 16 });
  const world = buildWorld(ctx, track, { id: 'splash', name: 'Splash Attack', time: 'day', pieces: SPLASH.pieces }, { flow: () => 2.4, clearBand: 8 });
  const water = makeWater(scene);
  const sfx = makeSfx(sound);
  const crew = makeCrew(ctx, k, TH, rider, { playerBack: true });
  const { log } = crew;
  scene.add(log.root);
  log.root.matrixAutoUpdate = false;
  const blaster = makeBlaster(k);
  crew.me.carry(blaster.root);
  const L = track.length;
  const fr = { p: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3(), l: new THREE.Vector3() };
  const v = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  const Y = new THREE.Vector3(0, 1, 0);
  const meName = name(rider);

  // ---------------------------------------------------------------- targets
  const pirateTex = canvasTexture(256, 384, (c, w, h) => {
    c.fillStyle = '#e8c99a';
    c.beginPath();
    c.ellipse(w / 2, h * 0.56, w * 0.42, h * 0.4, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#9b6a43';
    c.lineWidth = 8;
    c.stroke();
    // a friendly cardboard pirate: hat, eye patch, big smile, striped shirt
    c.fillStyle = '#fbe0c8';
    c.beginPath();
    c.arc(w / 2, h * 0.42, 70, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#3b2b3f';
    c.beginPath();
    c.moveTo(w / 2 - 100, h * 0.32);
    c.quadraticCurveTo(w / 2, h * 0.06, w / 2 + 100, h * 0.32);
    c.closePath();
    c.fill();
    c.fillStyle = '#ffffff';
    c.font = `700 44px ${FONT}`;
    c.textAlign = 'center';
    c.fillText('x', w / 2, h * 0.27);
    c.fillStyle = '#3b2b3f';
    c.beginPath();
    c.arc(w / 2 + 26, h * 0.41, 13, 0, Math.PI * 2);
    c.fill();
    c.fillRect(w / 2 - 60, h * 0.39, 120, 5);
    c.beginPath();
    c.arc(w / 2 - 26, h * 0.41, 8, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#b23a48';
    c.lineWidth = 7;
    c.beginPath();
    c.arc(w / 2, h * 0.46, 30, 0.2, Math.PI - 0.2);
    c.stroke();
    for (let i = 0; i < 5; i++) {
      c.fillStyle = i % 2 ? '#ffffff' : '#ef5b6f';
      c.fillRect(w / 2 - 80, h * 0.6 + i * 22, 160, 22);
    }
  });
  const pirateMat = umat('#ffffff', { map: pirateTex, rough: 0.8, transparent: true });
  pirateMat.alphaTest = 0.5;
  const heartTex = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#ff7f9a';
    heartPath(c, w / 2, h / 2 + 10, 220);
    c.fill();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 10;
    c.stroke();
    c.fillStyle = '#ffffff';
    c.font = `700 64px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('R + H', w / 2, h / 2 - 4);
  });
  const heartMat = umat('#ffffff', { map: heartTex, rough: 0.7, transparent: true });
  heartMat.alphaTest = 0.5;
  heartMat.side = THREE.DoubleSide;

  function makeTarget(kind) {
    const root = new THREE.Group();
    const part = new THREE.Group();
    root.add(part);
    let r = 0.8;
    let y = 0.5;
    if (kind === 'frog') {
      part.add(k.at(k.cyl(0.55, 0.65, 0.3, '#b8a690', 10), 0, 0.15, 0));
      const fg = new THREE.Group();
      const body = k.sph(0.32, '#7fd06a', undefined, 12);
      body.scale.set(1.1, 0.8, 1);
      fg.add(body);
      for (const s of [-1, 1]) {
        fg.add(k.at(k.sph(0.12, '#7fd06a', undefined, 8), s * 0.17, 0.25, 0.1));
        fg.add(k.at(k.sph(0.07, '#ffffff', undefined, 8), s * 0.17, 0.29, 0.17));
        fg.add(k.at(k.sph(0.04, '#3b2b3f', undefined, 6), s * 0.17, 0.3, 0.23));
      }
      fg.position.y = 0.55;
      part.add(fg);
      root.userData.jumper = fg;
      y = 0.7;
    } else if (kind === 'bucket') {
      part.add(k.at(k.box(0.7, 0.5, 0.7, '#c98a55'), 0, 0.25, 0));
      const b = new THREE.Group();
      b.add(k.at(k.cyl(0.32, 0.25, 0.5, '#6fb8ff', 14), 0, 0.25, 0));
      b.add(k.at(k.tor(0.3, 0.025, '#3f5fb0'), 0, 0.5, 0)).rotation.x = Math.PI / 2;
      b.add(k.at(k.heart(0.2, 0.04, '#ffffff'), 0, 0.28, 0.29));
      b.position.y = 0.5;
      part.add(b);
      root.userData.tipper = b;
      y = 0.85;
    } else if (kind === 'flower') {
      part.add(k.at(k.cyl(0.35, 0.4, 0.3, '#d97a5a', 10), 0, 0.15, 0));
      const stem = new THREE.Group();
      stem.position.y = 0.3;
      stem.add(k.at(k.cyl(0.03, 0.03, 0.9, '#6aa84a', 5), 0, 0.45, 0));
      const head = new THREE.Group();
      head.position.y = 0.9;
      const petalMat = umat('#b9a890', { rough: 0.7 });
      petalMat.userData.recolour = true;
      for (let i = 0; i < 6; i++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), petalMat);
        const a = (i / 6) * Math.PI * 2;
        p.scale.set(1, 0.35, 1.5);
        p.position.set(Math.sin(a) * 0.16, 0, Math.cos(a) * 0.16);
        p.rotation.y = a;
        head.add(p);
      }
      head.add(k.at(k.sph(0.1, '#ffd166', undefined, 8), 0, 0.03, 0));
      stem.add(head);
      stem.rotation.z = 1.1; // drooping
      part.add(stem);
      root.userData.stem = stem;
      root.userData.petals = petalMat;
      y = 1.0;
    } else if (kind === 'pirate') {
      // a hedge with the cut-out pirate hiding behind it
      const hedge = k.rbox(1.5, 0.6, 0.5, '#4fae4f', 0.2);
      hedge.position.set(0, 0.3, 0.3);
      part.add(hedge);
      const board = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.5), pirateMat);
      board.position.y = 0.75;
      const hinge = new THREE.Group();
      hinge.add(board);
      part.add(hinge);
      root.userData.hinge = hinge;
      hinge.position.y = -1.4;
      y = 1.1;
    } else if (kind === 'duck') {
      const d = new THREE.Group();
      d.add(k.at(k.sph(0.3, '#ffe066', undefined, 12), 0, 0.3, 0));
      d.add(k.at(k.sph(0.2, '#ffe066', undefined, 12), 0, 0.62, 0.18));
      d.add(k.at(k.cone(0.08, 0.2, '#ff9a3c', 6), 0, 0.58, 0.42)).rotation.x = Math.PI / 2;
      for (const s of [-1, 1]) d.add(k.at(k.sph(0.04, '#3b2b3f', undefined, 6), s * 0.1, 0.68, 0.33));
      part.add(d);
      y = 0.5;
    } else if (kind === 'bell') {
      part.add(k.at(k.cyl(0.07, 0.09, 2.2, '#9b6a43', 8), 0, 1.1, 0));
      part.add(k.at(k.box(1.0, 0.1, 0.1, '#9b6a43'), 0.35, 2.2, 0));
      const bell = new THREE.Group();
      bell.position.set(0.7, 2.15, 0);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.36, 0.5, 16, 1, true), umat('#ffd166', { metal: 0.55, rough: 0.3, emissive: '#ffb347', ei: 0.35, side: THREE.DoubleSide }));
      b.position.y = -0.3;
      bell.add(b);
      bell.add(k.at(k.sph(0.16, '#ffd166', undefined, 10), 0, -0.07, 0));
      bell.add(k.at(k.sph(0.08, '#c98a3a', undefined, 8), 0, -0.55, 0));
      part.add(bell);
      root.userData.bell = bell;
      r = 1.0;
      y = 1.85;
    } else if (kind === 'cat') {
      part.add(k.at(k.rbox(0.9, 0.18, 0.9, '#c7a6ff', 0.08), 0, 0.09, 0));
      const cat = new THREE.Group();
      const body = k.sph(0.3, '#ffb36b', undefined, 12);
      body.scale.set(1.25, 0.7, 1);
      cat.add(body);
      const head = k.sph(0.19, '#ffb36b', undefined, 12);
      head.position.set(0.3, 0.05, 0.12);
      cat.add(head);
      for (const s of [-1, 1]) cat.add(k.at(k.cone(0.06, 0.12, '#ffb36b', 5), 0.3 + s * 0.09, 0.22, 0.12));
      // closed sleepy eyes
      for (const s of [-1, 1]) cat.add(k.at(k.box(0.06, 0.012, 0.01, '#3b2b3f'), 0.3 + s * 0.07, 0.07, 0.3));
      const tail = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 6, 14, Math.PI), umat('#ffb36b'));
      tail.rotation.x = -Math.PI / 2;
      tail.position.set(-0.05, -0.08, 0.05);
      cat.add(tail);
      cat.position.y = 0.36;
      part.add(cat);
      root.userData.cat = cat;
      // a little Zzz sign so it reads as asleep
      const z = new THREE.Sprite(
        new THREE.SpriteMaterial({
          transparent: true,
          depthWrite: false,
          map: canvasTexture(128, 64, (c, w, h) => {
            c.fillStyle = '#ffffff';
            c.font = `700 40px ${FONT}`;
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.strokeStyle = '#6a5aa8';
            c.lineWidth = 6;
            c.strokeText('z z z', w / 2, h / 2);
            c.fillText('z z z', w / 2, h / 2);
          }),
        }),
      );
      z.scale.set(0.8, 0.4, 1);
      z.position.set(0.35, 0.95, 0);
      part.add(z);
      root.userData.z = z;
      y = 0.6;
    } else if (kind === 'heart') {
      part.add(k.at(k.cyl(0.05, 0.06, 1.3, '#9b6a43', 6), 0, 0.65, 0));
      const spin = new THREE.Group();
      spin.position.y = 1.6;
      spin.add(new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), heartMat));
      part.add(spin);
      root.userData.spin = spin;
      y = 1.6;
      r = 0.95;
    }
    compact(root);
    root.traverse((o) => {
      if (o.isMesh) o.castShadow = false;
    });
    return { kind, root, part, r: r * SIZE, y: y * SIZE, alive: true, t: 0, hitT: -1, up: 0, life: kind === 'pirate' ? 2.8 : 99 };
  }

  const targets = [];
  const spawn = (kind, aheadMin = 9, aheadMax = 22) => {
    for (let tries = 0; tries < 12; tries++) {
      const d = (st.d + aheadMin + Math.random() * (aheadMax - aheadMin)) % L;
      const side = Math.random() < 0.5 ? -1 : 1;
      if (side === -1 && (d < 14 || d > L - 2)) continue; // the loading dock
      const off = 3.4 + Math.random() * 2.4;
      track.at(d, fr);
      const x = fr.p.x + fr.l.x * side * off;
      const z = fr.p.z + fr.l.z * side * off;
      if (targets.some((t) => t.alive && Math.hypot(t.root.position.x - x, t.root.position.z - z) < 2.6)) continue;
      const t = makeTarget(kind);
      t.root.position.set(x, 0, z);
      t.root.rotation.y = Math.atan2(-fr.l.x * side, -fr.l.z * side);
      t.d = d;
      t.side = side;
      t.base = t.root.position.clone();
      t.dir = fr.f.clone();
      scene.add(t.root);
      targets.push(t);
      return t;
    }
    return null;
  };
  // finished targets rest out of sight in here (their parts share geometry, freed when the game closes)
  const spent = new THREE.Group();
  spent.visible = false;
  scene.add(spent);
  const removeTarget = (t) => spent.add(t.root);

  // ---------------------------------------------------------------- aim
  const reticle = new THREE.Group();
  const retMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false, depthTest: false });
  const ret1 = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.72, 32), retMat);
  ret1.rotation.x = -Math.PI / 2;
  reticle.add(ret1);
  const ret2 = new THREE.Mesh(new THREE.CircleGeometry(0.13, 14), retMat);
  ret2.rotation.x = -Math.PI / 2;
  reticle.add(ret2);
  reticle.renderOrder = 6;
  ret1.renderOrder = ret2.renderOrder = 6;
  scene.add(reticle);
  const heads = [];
  for (let i = 0; i < 6; i++) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshStandardMaterial({ color: '#bff0ff', roughness: 0.1, emissive: '#9fdcf0', emissiveIntensity: 0.4, transparent: true, opacity: 0.9 }));
    h.visible = false;
    scene.add(h);
    heads.push({ m: h, t: -1 });
  }
  const shots = [];

  // ---------------------------------------------------------------- state
  const st = { d: 4, v: 0, phase: 'ready', t: 0, time: WAVES.length * WAVE_T, wave: -1, spawnT: 0, score: 0, hits: 0, shotsN: 0, combo: 0, aimA: -0.7, aimR: 6.5, cd: 0, cats: 0, heartDone: false, heartAt: 6 + Math.random() * 10, photo: null, endT: 0, autoT: 0, lock: null };
  dbg.st = st;
  dbg.targets = targets;
  dbg.finishNow = () => (st.time = Math.min(st.time, 0.2));
  const comboMul = () => (st.combo >= 10 ? 3 : st.combo >= 4 ? 2 : 1);
  const showScore = () => hud.score(`${st.score} <span style="font-weight:400;font-size:.8em">${st.score === 1 ? 'point' : 'points'}</span>${comboMul() > 1 ? ` <span style="color:#ef5b6f">x${comboMul()}</span>` : ''} <span style="font-weight:400;font-size:.8em;color:#7a6470">${Math.max(0, Math.ceil(st.time))}s</span>`);
  showScore();
  hud.hint('A and D turn the blaster, W and S aim near or far, Space splashes. Or click a target');
  hud.buttons({ action: 'Splash', jump: null });

  const begin = (async () => {
    await new Promise((r) => setTimeout(r, 350));
    if (flow.disposed) return;
    flow.say(rider === 'roji' ? 'Homama: Go on, Doctor Roji, show them your aim!' : 'Roji: Splash them all, Homama!', 2200);
    await hud.countdown(3);
    if (flow.disposed) return;
    sfx.whistle();
    st.phase = 'play';
  })();
  void begin;

  const finish = async () => {
    st.phase = 'done';
    sfx.stream(0, 0);
    const stars = st.score >= 120 ? 3 : st.score >= 70 ? 2 : st.score >= 30 ? 1 : 0;
    const old = prog.splash || { best: 0, stars: 0 };
    const rec = { best: Math.max(old.best, st.score), stars: Math.max(old.stars, stars) };
    prog.splash = rec;
    ctx.save('progress', prog);
    const newBest = st.score > old.best && old.best > 0;
    const photo = st.photo ? `<img src="${st.photo}" alt="Photo of Roji and Homama in the log" style="display:block;max-width:100%;max-height:36vh;border-radius:12px;margin:0 auto 10px">` : '';
    const acc = st.shotsN ? Math.round((st.hits / st.shotsN) * 100) : 0;
    const line = st.cats ? `The cat is awake now and not very pleased. ${name(rider === 'roji' ? 'homama' : 'roji')} promised it a treat.` : stars === 3 ? `${meName} never missed a beat. The garden has never been so wet.` : 'Every flower in the garden says thank you.';
    await new Promise((r) => setTimeout(r, 400));
    if (flow.disposed) return;
    hud.score('');
    ctx.finish({
      win: stars > 0,
      title: stars ? `${stars === 1 ? 'One star' : stars === 2 ? 'Two stars' : 'Three stars'}!` : 'Nice splashing!',
      text: `${photo}${st.score} ${st.score === 1 ? 'point' : 'points'}${newBest ? ' (a new best!)' : `, best ${rec.best}`}. ${st.hits} splashed, ${acc}% on target.<br>${line}`,
    });
  };

  const logPos = (out) => {
    track.at(st.d, fr);
    return out.copy(fr.p);
  };
  const aimPoint = (out) => {
    track.at(st.d, fr);
    const c = Math.cos(st.aimA);
    const s = Math.sin(st.aimA);
    // aimA > 0 turns toward the left (+l)
    v2.copy(fr.f).setY(0).normalize().multiplyScalar(c).addScaledVector(v.copy(fr.l).setY(0).normalize(), s);
    return out.copy(fr.p).addScaledVector(v2, st.aimR).setY(0.05);
  };
  const shoot = (to) => {
    if (st.cd > 0) return;
    st.cd = 0.24;
    st.shotsN++;
    const from = blaster.tip.getWorldPosition(new THREE.Vector3());
    const dist = from.distanceTo(to);
    const T = 0.28 + dist * 0.035;
    const head = heads.find((h) => h.t < 0) || heads[0];
    shots.push({ from, to: to.clone(), T, t: 0, head, peak: 0.8 + dist * 0.12 });
    head.t = 0;
    head.m.visible = true;
    sfx.squirt();
    crew.st.recoil = 1;
  };
  const land = (s) => {
    water.splash(s.to, 16, { speed: 2, up: 3, size: 0.8 });
    let hit = null;
    let bestD = 1e9;
    for (const t of targets) {
      if (!t.alive || t.hitT >= 0) continue;
      if (t.kind === 'pirate' && t.up < 0.6) continue;
      const tp = v.copy(t.root.position);
      const dd = Math.hypot(tp.x - s.to.x, tp.z - s.to.z);
      if (dd < t.r + 0.25 && dd < bestD) {
        bestD = dd;
        hit = t;
      }
    }
    if (!hit) {
      if (st.combo >= 4) hud.message('Combo lost', 600);
      st.combo = 0;
      showScore();
      return;
    }
    hit.hitT = 0;
    hit.alive = false;
    const tp = v.copy(hit.root.position).setY(hit.y);
    if (hit.kind === 'cat') {
      st.cats++;
      st.combo = 0;
      st.score = Math.max(0, st.score + POINTS.cat);
      hud.message('Let the cat sleep!', 1100);
      sfx.hiss();
      sound.ui('bad');
      fx.poof(tp);
      showScore();
      return;
    }
    st.hits++;
    st.combo++;
    const pts = POINTS[hit.kind] * comboMul();
    st.score += pts;
    if (st.combo === 4 || st.combo === 10) {
      hud.message(`Combo x${comboMul()}!`, 900);
      crew.st.cheer = 1;
    } else if (Math.random() < 0.35) crew.st.cheer = 0.8;
    const cols = hit.kind === 'flower' ? ['#ff7fa3', '#ffd166', '#ffffff'] : hit.kind === 'bell' ? ['#ffd166', '#fff3c4', '#ffffff'] : ['#bff0ff', '#ffffff', '#8fd3ff'];
    fx.burst(tp, cols, hit.kind === 'bell' ? 30 : 14);
    if (hit.kind === 'frog') sfx.croak();
    else if (hit.kind === 'bucket') sfx.clang();
    else if (hit.kind === 'duck') sfx.quack();
    else if (hit.kind === 'bell') sfx.ding();
    else if (hit.kind === 'heart') {
      sfx.sweet();
      fx.heartsAt(tp, 8);
      crew.st.heart = 1;
      flow.say(rider === 'roji' ? 'Homama painted that heart for Roji this morning.' : 'Homama painted that heart for Roji. She saw it and smiled.', 2800);
    } else sound.ui('good');
    if (hit.kind === 'flower') sfx.sweet();
    showScore();
  };

  // ---------------------------------------------------------------- auto-play for the tests
  const autoplay = (dt) => {
    st.autoT -= dt;
    if (st.autoT > 0) return null;
    st.autoT = 0.3;
    logPos(v);
    let best = null;
    let bd = 1e9;
    for (const t of targets) {
      if (!t.alive || t.hitT >= 0 || t.kind === 'cat') continue;
      if (t.kind === 'pirate' && t.up < 0.7) continue;
      if (shots.some((sh) => sh.to.distanceTo(t.root.position.clone().setY(0.05)) < 1.2)) continue;
      const dd = t.root.position.distanceTo(v);
      if (dd < 11.5 && dd < bd) {
        bd = dd;
        best = t;
      }
    }
    return best ? best.root.position.clone().setY(0.05) : null;
  };

  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  track.at(st.d, fr);
  camPos.copy(fr.p).addScaledVector(fr.f, -6).add(v.set(0, 4.6, 0));
  camLook.copy(fr.p);
  const lp = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.05);
  const ray = new THREE.Raycaster();

  return {
    update(dt, t) {
      st.t += dt;
      const playing = st.phase === 'play';
      // ---------------------------------------- the lazy river
      const wave = WAVES[Math.max(0, st.wave)];
      st.v = damp(st.v, playing ? wave.speed : st.phase === 'end' ? 0.6 : 0, 1.5, dt);
      st.d = (st.d + st.v * dt) % L;
      logPos(lp);
      sfx.stream(1.2 + st.v * 0.5, 1);
      if (playing) {
        st.time -= dt;
        const w = Math.min(WAVES.length - 1, Math.floor((WAVES.length * WAVE_T - st.time) / WAVE_T));
        if (w !== st.wave) {
          st.wave = w;
          hud.message(`Wave ${w + 1}`, 1100);
          setTimeout(() => !flow.disposed && st.phase === 'play' && flow.say(WAVES[w].name, 2600), 900);
          st.spawnT = 0.2;
        }
        // spawn
        st.spawnT -= dt;
        const alive = targets.filter((tt) => tt.alive && tt.kind !== 'cat').length;
        if (st.spawnT <= 0 && alive < WAVES[st.wave].max) {
          st.spawnT = WAVES[st.wave].every * (0.7 + Math.random() * 0.6);
          const kinds = WAVES[st.wave].kinds;
          spawn(kinds[Math.floor(Math.random() * kinds.length)]);
        }
        if (!st.heartDone && st.wave === 1 && WAVES.length * WAVE_T - st.time > WAVE_T + st.heartAt) {
          st.heartDone = !!spawn('heart', 12, 16);
        }
        if (st.time <= 0) {
          st.phase = 'end';
          st.endT = 0;
          hud.message('Time!', 1200);
          sound.ui('good');
        }
        showScore();
      }
      if (st.phase === 'end') {
        st.endT += dt;
        if (st.endT > 1.4 && !st.photo) {
          // a photo of the two of them with the blaster
          const cam = new THREE.PerspectiveCamera(42, 480 / 300, 0.1, 300);
          track.at(st.d, fr);
          cam.position.copy(lp).addScaledVector(fr.f, 3.2).addScaledVector(Y, 1.3).addScaledVector(fr.l, -0.6);
          cam.lookAt(v.copy(lp).addScaledVector(Y, 0.85));
          st.photo = snapPhoto(ctx, env, cam, `Splash Attack: Roji and Homama, ${st.score} points`, [reticle]);
          flash(sfx);
        }
        if (st.endT > 2.2) finish();
      }

      // ---------------------------------------- aim and shoot
      st.cd -= dt;
      if (playing) {
        const ax = input.axis();
        st.aimA = clamp(st.aimA - ax.x * 1.9 * dt, -1.55, 1.55);
        st.aimR = clamp(st.aimR + ax.y * 6 * dt, 3, 11);
        let target = null;
        for (const tap of input.taps()) {
          const hits = input.pick(targets.filter((tt) => tt.alive).map((tt) => tt.root), tap.ndc);
          let to = null;
          if (hits.length) {
            let o = hits[0].object;
            const tg = targets.find((tt) => {
              let found = false;
              tt.root.traverse((x) => (found = found || x === o));
              return found;
            });
            to = tg ? tg.root.position.clone().setY(0.05) : hits[0].point.clone().setY(0.05);
          } else {
            ray.setFromCamera(tap.ndc, camera);
            to = ray.ray.intersectPlane(ground, new THREE.Vector3());
          }
          if (to) target = to;
        }
        if (dbg.auto) target = autoplay(dt) || target;
        if (target) {
          // turn the blaster there too, so the keys carry on from it
          track.at(st.d, fr);
          tmp.copy(target).sub(lp).setY(0);
          const fw = v.copy(fr.f).setY(0).normalize();
          const lf = v2.copy(fr.l).setY(0).normalize();
          st.aimA = clamp(Math.atan2(tmp.dot(lf), tmp.dot(fw)), -1.55, 1.55);
          st.aimR = clamp(tmp.length(), 3, 11);
          shoot(target);
        } else if (input.pressed('action') || input.pressed('jump')) {
          // keys and the button: the locked target, or else the target nearest the blaster's direction
          let to = st.lock ? st.lock.root.position.clone().setY(0.05) : null;
          if (!to) {
            track.at(st.d, fr);
            const fw = v.copy(fr.f).setY(0).normalize();
            const lf = v2.copy(fr.l).setY(0).normalize();
            let best = 0.5;
            for (const tt of targets) {
              if (!tt.alive || tt.kind === 'cat' || (tt.kind === 'pirate' && tt.up < 0.5)) continue;
              tmp.copy(tt.root.position).sub(lp).setY(0);
              const dist = tmp.length();
              if (dist > 12) continue;
              const da = Math.abs(Math.atan2(tmp.dot(lf), tmp.dot(fw)) - st.aimA);
              if (da < best) {
                best = da;
                to = tt.root.position.clone().setY(0.05);
              }
            }
          }
          shoot(to || aimPoint(aim).clone());
        }
      }
      // the reticle locks on to a target near it
      aimPoint(aim);
      st.lock = null;
      let ld = 1.7;
      for (const tt of targets) {
        if (!tt.alive || (tt.kind === 'pirate' && tt.up < 0.5)) continue;
        const dd = Math.hypot(tt.root.position.x - aim.x, tt.root.position.z - aim.z);
        if (dd < ld) {
          ld = dd;
          st.lock = tt;
        }
      }
      const rp = st.lock ? tmp.copy(st.lock.root.position).setY(0.06) : aim;
      reticle.position.x = damp(reticle.position.x, rp.x, 18, dt);
      reticle.position.z = damp(reticle.position.z, rp.z, 18, dt);
      reticle.position.y = 0.06;
      reticle.scale.setScalar(st.lock ? 1.2 + Math.sin(t * 8) * 0.06 : 1);
      retMat.color.set(st.lock ? (st.lock.kind === 'cat' ? '#ff9aa8' : '#ffd166') : '#ffffff');
      reticle.visible = playing;

      // ---------------------------------------- shots in the air
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.t += dt;
        const u = Math.min(1, s.t / s.T);
        v.copy(s.from).lerp(s.to, u);
        v.y += Math.sin(u * Math.PI) * s.peak;
        s.head.m.position.copy(v);
        if (Math.random() < 0.8) water.spray(v, v2.set(0, -0.5, 0), 2, { spread: 0.5, size: 0.7, floor: 0 });
        if (u >= 1) {
          s.head.t = -1;
          s.head.m.visible = false;
          shots.splice(i, 1);
          land(s);
        }
      }

      // ---------------------------------------- targets come to life
      for (let i = targets.length - 1; i >= 0; i--) {
        const tt = targets[i];
        tt.t += dt;
        const ud = tt.root.userData;
        // gone past, or the pirate ducks back down: remove
        const behind = ((st.d - tt.d + L) % L) < L / 2 && ((st.d - tt.d + L) % L) > 7;
        if (tt.kind === 'pirate') {
          const want = tt.alive && tt.t < tt.life ? 1 : 0;
          tt.up = damp(tt.up, want, tt.alive ? 7 : 12, dt);
          ud.hinge.position.y = -1.4 + tt.up * 1.4;
          if (tt.hitT >= 0) ud.hinge.rotation.x = -Math.min(1, tt.hitT * 3) * 1.5;
          if (tt.alive && tt.t > tt.life + 0.4) tt.alive = false;
        }
        if (tt.kind === 'frog') {
          ud.jumper.position.y = 0.55 + (tt.hitT >= 0 ? Math.sin(Math.min(1, tt.hitT / 0.8) * Math.PI) * 1.5 : Math.abs(Math.sin(t * 2 + i)) * 0.05);
          if (tt.hitT >= 0) ud.jumper.rotation.y = tt.hitT * 9;
        }
        if (tt.kind === 'bucket' && tt.hitT >= 0) ud.tipper.rotation.z = Math.min(1, tt.hitT * 3) * 1.6;
        if (tt.kind === 'flower') {
          const bloom = tt.hitT >= 0 ? Math.min(1, tt.hitT * 1.5) : 0;
          ud.stem.rotation.z = 1.1 * (1 - bloom) + Math.sin(t * 2 + i) * 0.05;
          ud.petals.color.set('#b9a890').lerp(new THREE.Color(['#ff7fa3', '#ffd166', '#c7a6ff', '#ff8a5c'][i % 4]), bloom);
          ud.stem.scale.setScalar(1 + bloom * 0.35);
        }
        if (tt.kind === 'duck') {
          tt.root.position.copy(tt.base).addScaledVector(tt.dir, Math.sin(tt.t * 0.6) * 1.6);
          tt.part.rotation.z = Math.sin(t * 8 + i) * 0.12;
          if (tt.hitT >= 0) tt.part.rotation.y = tt.hitT * 10;
        }
        if (tt.kind === 'bell') {
          ud.bell.rotation.z = Math.sin(t * 2.2) * 0.35 + (tt.hitT >= 0 ? Math.sin(tt.hitT * 18) * 0.6 * Math.max(0, 1 - tt.hitT) : 0);
        }
        if (tt.kind === 'cat') {
          tt.part.position.y = tt.hitT >= 0 ? Math.sin(Math.min(1, tt.hitT / 0.6) * Math.PI) * 0.7 : 0;
          ud.cat.scale.y = 1 + Math.sin(t * 1.4 + i) * 0.04;
          ud.z.position.y = 0.95 + Math.sin(t * 1.5) * 0.08;
          ud.z.visible = tt.hitT < 0;
        }
        if (tt.kind === 'heart' && tt.hitT >= 0) ud.spin.rotation.y = Math.min(1, tt.hitT * 0.7) * Math.PI * 4;
        if (tt.hitT >= 0) tt.hitT += dt;
        // a little pop when a target first shows
        const pop = Math.min(1, tt.t * 4);
        tt.root.scale.setScalar(SIZE * (tt.kind === 'pirate' ? 1 : 0.4 + 0.6 * pop + Math.sin(Math.min(1, tt.t * 4) * Math.PI) * 0.15));
        if (behind || (tt.hitT > 2.6 && tt.kind !== 'flower' && tt.kind !== 'heart') || (!tt.alive && tt.kind === 'pirate' && tt.up < 0.02)) {
          removeTarget(tt);
          targets.splice(i, 1);
        }
      }

      // ---------------------------------------- the log and the kids
      track.at(st.d, fr);
      const bob = Math.sin(t * 2.1) * 0.03;
      m4.makeBasis(fr.l, fr.u, fr.f).setPosition(lp);
      log.root.matrix.copy(m4);
      log.root.matrixWorldNeedsUpdate = true;
      log.body.position.set(0, bob, 0);
      log.body.rotation.set(Math.sin(t * 1.7) * 0.02, 0, Math.sin(t * 1.3) * 0.025);
      crew.st.cheer = damp(crew.st.cheer, 0, 1.4, dt);
      crew.st.heart = damp(crew.st.heart, 0, 1.0, dt);
      crew.st.aim = st.aimA;
      crew.st.recoil = damp(crew.st.recoil || 0, 0, 10, dt);
      crew.pose(dt, t);

      // ---------------------------------------- camera
      const fw = v.copy(fr.f).setY(0).normalize();
      const want = tmp.copy(lp).addScaledVector(fw, -6.6).add(v2.set(0, 5.6, 0));
      camPos.x = damp(camPos.x, want.x, 2.5, dt);
      camPos.y = damp(camPos.y, want.y, 2.5, dt);
      camPos.z = damp(camPos.z, want.z, 2.5, dt);
      const lk = tmp.copy(lp).addScaledVector(fw, 4.5).add(v2.set(0, 0.2, 0));
      camLook.x = damp(camLook.x, lk.x, 4, dt);
      camLook.y = damp(camLook.y, lk.y, 4, dt);
      camLook.z = damp(camLook.z, lk.z, 4, dt);
      camera.position.copy(camPos);
      camera.up.set(0, 1, 0);
      camera.lookAt(camLook);
      env.follow(lp);
      world.update(dt, t, camPos);
      water.update(dt);
    },
    dispose() {
      sfx.stop();
    },
  };
}

// Fewer draw calls for a target: in every group, the direct mesh children with plain colours merge into
// one vertex-coloured mesh, and those that share a material (the petals) into one mesh with it
const vcm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
function compact(obj) {
  for (const c of [...obj.children]) if (!c.isMesh && c.children.length) compact(c);
  const plain = [];
  const same = new Map();
  for (const o of obj.children) {
    if (!o.isMesh || o.children.length || Array.isArray(o.material)) continue;
    const m = o.material;
    if (m.isMeshStandardMaterial && !m.map && !m.transparent && m.metalness === 0 && !(m.emissiveIntensity > 0 && m.emissive.getHex() !== 0) && m.side === THREE.FrontSide && !m.vertexColors && !m.userData.recolour) plain.push(o);
    else {
      if (!same.has(m.uuid)) same.set(m.uuid, []);
      same.get(m.uuid).push(o);
    }
  }
  const merge = (list, colour) => {
    if (list.length < 2) return;
    const geos = list.map((o) => {
      o.updateMatrix();
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const n of Object.keys(g.attributes)) if (!['position', 'normal', ...(colour ? [] : ['uv'])].includes(n)) g.deleteAttribute(n);
      g.clearGroups();
      g.applyMatrix4(o.matrix);
      if (colour) {
        const c = o.material.color;
        const a = new Float32Array(g.attributes.position.count * 3);
        for (let i = 0; i < a.length; i += 3) a.set([c.r, c.g, c.b], i);
        g.setAttribute('color', new THREE.BufferAttribute(a, 3));
      }
      return g;
    });
    const merged = mergeGeometries(geos, false);
    if (!merged) return;
    const mm = new THREE.Mesh(merged, colour ? vcm : list[0].material);
    for (const o of list) o.removeFromParent();
    obj.add(mm);
  };
  merge(plain, true);
  for (const list of same.values()) merge(list, false);
}
