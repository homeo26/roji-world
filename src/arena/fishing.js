import { FISH, FISH_BY_ID, RARITY, makeFish, rollSize } from './fishing/fish.js';
import { buildScene, SEA, WEATHER } from './fishing/scene.js';
import { makeUI } from './fishing/ui.js';
import { heartGeo } from '../places/school/kit.js';
import { dotTexture } from '../places/harbour/models.js';

// Harbour Fishing: a day out on the end of the pier in three rounds. Each round has its own goal,
// weather and time of day (morning, then a breezy or rainy afternoon, then sunset or a starry night).
// Cast with power, wait for the float to dip, then reel: keep the fish inside the green bar.
// Everything caught goes into the fish book; stars from every trip unlock new tackle.

const GOALS = {
  sardines: { text: 'Catch 3 sardines', tip: 'Sardines swim close to the pier', short: 'Sardines', need: 3, ok: (c) => c.id === 'sardine', boost: { sardine: 3 } },
  any4: { text: 'Catch 4 fish', tip: 'Anything with fins counts', short: 'Fish', need: 4, ok: (c) => !c.info.junk },
  kinds: { text: 'Catch 3 different kinds', tip: 'Try close by and far out', short: 'Kinds', need: 3, kinds: true },
  big: { text: 'Catch a fish over 50 cm', tip: 'Big fish swim far out', short: 'Over 50 cm', need: 1, ok: (c) => !c.info.junk && c.size >= 50, boost: { seabass: 2, snapper: 1.6, tuna: 1.6 }, sizeBoost: 0.4 },
  rare: { text: 'Catch a rare fish', tip: 'Cast far out for rare fish', short: 'Rare fish', need: 1, ok: (c) => !c.info.junk && c.info.rarity >= 3, boost: { snapper: 2, tuna: 1.6, octopus: 2 } },
  letter: { text: "Fish out Homama's letter in a bottle", tip: 'Cast right next to the floating bottle', short: 'Letter', need: 1, ok: (c) => c.id === 'bottle', special: 'bottle' },
  golden: { text: 'Catch the golden fish before sunset', tip: 'Look for the golden glow far out', short: 'Golden fish', need: 1, ok: (c) => c.id === 'golden', special: 'golden', weather: 'sunset' },
  octopus: { text: 'Catch an octopus under the moon', tip: 'Octopus hide in deep water', short: 'Octopus', need: 1, ok: (c) => c.id === 'octopus', weather: 'night', boost: { octopus: 5 } },
};
const POOLS = [['sardines', 'any4', 'kinds'], ['big', 'rare', 'letter'], ['golden', 'octopus']];
const TIMES = [70, 85, 90];
const NOTES = [
  'Roji, if this bottle found you, the sea agrees with me: you are my favourite place. Homama',
  'Dear Roji, thank you for every patient you smile at, and every smile you save for me. Homama',
  'Roji, I am fishing for compliments. Tell me I was right to marry you. (I was.) Homama',
  'Roji, the tide always comes back. So do I, every evening, to you. Homama',
];
const UNLOCKS = [
  { at: 4, id: 'heart', name: 'Heart float' },
  { at: 10, id: 'lure', name: 'Sparkly lure (rare fish bite more)' },
  { at: 18, id: 'rod', name: 'Lucky rod (a bigger green bar)' },
  { at: 27, id: 'hat', name: "Captain's hat" },
];

export default {
  id: 'fishing',
  title: 'Harbour Fishing',
  tagline: 'Cast, reel and fill your fish book',

  async start(ctx) {
    const { THREE, scene, camera, util, hud, input, sound, fx } = ctx;
    const { damp, clamp, lerp } = util;
    const PI = Math.PI;
    const env = ctx.env.outdoor({ sky: '#bfe6f7', fog: [45, 170], sun: [-9, 18, 12], shadow: 9 });
    const world = buildScene(ctx, env);
    const ui = makeUI(ctx);
    const meName = ctx.looks[ctx.me]?.name || (ctx.me === 'roji' ? 'Roji' : 'Homama');
    const palName = ctx.looks[ctx.partner]?.name || (ctx.partner === 'roji' ? 'Roji' : 'Homama');
    const palIsHomama = ctx.partner === 'homama';

    // ---------------------------------------------------------------- saved progress
    const book = ctx.load('book', {});
    const stats = ctx.load('stats', { trips: 0, best: 0, total: 0, note: 0 });
    const has = (id) => stats.total >= UNLOCKS.find((u) => u.id === id).at;
    const level = Math.min(5, Math.floor(stats.total / 6));
    const bookCount = () => FISH.filter((f) => book[f.id]).length;
    ui.bookCount(bookCount());

    // ---------------------------------------------------------------- the trip: three rounds
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const trip = POOLS.map((p) => pick(p));
    const weathers = [pick(['morning', 'morning', 'noon']), null, null];
    weathers[1] = pick(['breezy', 'drizzle', 'noon', 'breezy']);
    weathers[2] = GOALS[trip[2]].weather;
    const roundStars = [null, null, null];

    // ---------------------------------------------------------------- the two of them
    const me = ctx.makeKid(ctx.me);
    me.root.position.set(0.2, 0, -0.32);
    me.root.rotation.y = PI;
    me.hands = 'read';
    scene.add(me.root);
    if (has('hat')) {
      const hat = new THREE.Group();
      const white = util.mat('#ffffff', { rough: 0.6 });
      const navy = util.mat('#2c3e66', { rough: 0.6 });
      const crown = util.mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.16, 18), white);
      crown.position.y = 0.55;
      const band = util.mesh(new THREE.CylinderGeometry(0.305, 0.305, 0.06, 18), navy);
      band.position.y = 0.5;
      const peak = util.mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 14, 1, false, -PI / 2, PI), navy);
      peak.position.set(0, 0.47, 0.2);
      const badge = util.mesh(new THREE.SphereGeometry(0.04, 8, 6), util.mat('#ffd166', { metal: 0.5, rough: 0.3 }));
      badge.position.set(0, 0.52, 0.3);
      hat.add(crown, band, peak, badge);
      hat.rotation.x = -0.1;
      me.head.add(hat);
    }
    const pal = ctx.makeKid(ctx.partner);
    const PAL_SEAT = new THREE.Vector3(-1.0, 0.37, 0.35);
    pal.root.position.copy(PAL_SEAT);
    pal.root.rotation.y = PI - 0.45;
    pal.pose = 'sit';
    scene.add(pal.root);
    const juice = new THREE.Group();
    const jb = util.mesh(new THREE.BoxGeometry(0.1, 0.15, 0.07), util.mat(palIsHomama ? '#7fd8bf' : '#ff9eb5', { rough: 0.6 }));
    const straw = util.mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 5), util.mat('#ffffff'));
    straw.position.set(0.02, 0.11, 0);
    juice.add(jb, straw);
    pal.carry(juice);
    const palState = { stand: 0, next: 'sit', look: 0 };

    // ---------------------------------------------------------------- rod, line, float
    const rod = new THREE.Group();
    rod.position.set(0.03, 0.6, 0.3);
    const rodMat = util.mat(has('rod') ? '#f4c24f' : '#3f7bf0', { rough: 0.45, metal: has('rod') ? 0.4 : 0 });
    const segs = [];
    let parent = rod;
    [[0.8, 0.032, 0.026], [0.65, 0.026, 0.018], [0.55, 0.018, 0.01]].forEach(([len, r0, r1], i) => {
      const seg = new THREE.Group();
      seg.position.y = i === 0 ? 0 : parent.userData.len;
      const geo = new THREE.CylinderGeometry(r1, r0, len, 7);
      geo.translate(0, len / 2, 0);
      seg.add(util.mesh(geo, rodMat));
      seg.userData.len = len;
      parent.add(seg);
      segs.push(seg);
      parent = seg;
    });
    const tip = new THREE.Object3D();
    tip.position.y = 0.55;
    segs[2].add(tip);
    const reelM = util.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 12), util.mat('#3d4a52', { metal: 0.4, rough: 0.4 }));
    reelM.rotation.z = PI / 2;
    reelM.position.set(0.06, 0.18, 0.02);
    const crank = util.mesh(new THREE.BoxGeometry(0.02, 0.1, 0.02), util.mat('#ef5b6f'));
    crank.position.set(0.1, 0.18, 0.02);
    rod.add(reelM, crank);
    rod.rotation.x = 0.95;
    me.root.add(rod);

    const LINE_N = 24;
    const lineGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: LINE_N }, () => new THREE.Vector3()));
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#fbfaf5', transparent: true, opacity: 0.9 }));
    line.frustumCulled = false;
    scene.add(line);
    const float = new THREE.Group();
    const floatTop = util.umat('#ef5b6f', { rough: 0.35, emissive: '#ff5a6e', ei: 0 });
    if (has('heart')) {
      const h = util.mesh(heartGeo(0.22, 0.08), floatTop, { cast: false });
      h.position.y = 0.06;
      float.add(h);
    } else {
      const top = util.mesh(new THREE.SphereGeometry(0.09, 14, 10, 0, PI * 2, 0, PI / 2), floatTop, { cast: false });
      const bot = util.mesh(new THREE.SphereGeometry(0.09, 14, 10, 0, PI * 2, PI / 2, PI / 2), util.mat('#ffffff', { rough: 0.35 }), { cast: false });
      const stick = util.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 5), util.mat('#3b2b3f'));
      stick.position.y = 0.12;
      float.add(top, bot, stick);
    }
    float.visible = false;
    scene.add(float);
    const floatGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: '#ff9aa8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    floatGlow.scale.setScalar(0.8);
    float.add(floatGlow);
    const bang = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: util.canvasTexture(128, 128, (c, w, h) => {
          c.fillStyle = '#ffd166';
          c.beginPath();
          c.arc(w / 2, h / 2, w * 0.42, 0, PI * 2);
          c.fill();
          c.lineWidth = 8;
          c.strokeStyle = '#ffffff';
          c.stroke();
          c.fillStyle = '#3b2b3f';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.font = `700 84px ${util.FONT}`;
          c.fillText('!', w / 2, h / 2 + 4);
        }),
        transparent: true,
        depthTest: false,
      }),
    );
    bang.scale.setScalar(0.75);
    bang.visible = false;
    bang.renderOrder = 5;
    scene.add(bang);
    // Where the cast will land
    const aimRing = util.mesh(new THREE.RingGeometry(0.42, 0.56, 28), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, depthWrite: false }), { cast: false, receive: false });
    aimRing.rotation.x = -PI / 2;
    scene.add(aimRing);
    const dots = [];
    for (let i = 0; i < 7; i++) {
      const d = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: '#ffffff', transparent: true, opacity: 0.7, depthWrite: false }));
      d.scale.setScalar(0.22);
      scene.add(d);
      dots.push(d);
    }

    // ---------------------------------------------------------------- splashes
    const rings = [];
    const ringGeo = new THREE.RingGeometry(0.8, 1, 24);
    ringGeo.rotateX(-PI / 2);
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
      m.userData = { t: 1, s: 1 };
      m.visible = false;
      scene.add(m);
      rings.push(m);
    }
    let ringNext = 0;
    const ripple = (x, z, s = 1) => {
      const r = rings[ringNext];
      ringNext = (ringNext + 1) % rings.length;
      r.position.set(x, SEA + 0.03, z);
      r.userData = { t: 0, s };
      r.visible = true;
    };
    const DROPS = 48;
    const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 6, 4), util.umat('#e8fbff', { rough: 0.2 }), DROPS);
    drops.frustumCulled = false;
    const dropList = Array.from({ length: DROPS }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3() }));
    const M4 = new THREE.Matrix4();
    const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < DROPS; i++) drops.setMatrixAt(i, ZERO);
    scene.add(drops);
    let dropNext = 0;
    const splash = (x, z, n = 14, power = 1) => {
      for (let i = 0; i < n; i++) {
        const d = dropList[dropNext];
        dropNext = (dropNext + 1) % DROPS;
        d.life = 1;
        d.p.set(x, SEA + 0.05, z);
        const a = Math.random() * PI * 2;
        const sp = (0.6 + Math.random() * 1.4) * power;
        d.v.set(Math.cos(a) * sp, (2.2 + Math.random() * 2.2) * power, Math.sin(a) * sp);
      }
      ripple(x, z, 0.6 * power);
      sound.ctx && sound.tone(260 + Math.random() * 80, sound.ctx.currentTime, 0.18, { type: 'triangle', gain: 0.04, slideTo: 120 });
    };

    // ---------------------------------------------------------------- fish in the water (shadows)
    const shadowTex = util.canvasTexture(128, 64, (c, w, h) => {
      c.filter = 'blur(5px)';
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.ellipse(w * 0.56, h / 2, w * 0.3, h * 0.26, 0, 0, PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(w * 0.3, h / 2);
      c.lineTo(w * 0.1, h * 0.22);
      c.lineTo(w * 0.1, h * 0.78);
      c.fill();
    });
    const MAXF = 10;
    const shadowGeo = new THREE.PlaneGeometry(1, 0.5);
    shadowGeo.rotateX(-PI / 2);
    const shadows = new THREE.InstancedMesh(shadowGeo, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.62, depthWrite: false }), MAXF);
    shadows.frustumCulled = false;
    shadows.renderOrder = 1;
    for (let i = 0; i < MAXF; i++) {
      shadows.setMatrixAt(i, ZERO);
      shadows.setColorAt(i, new THREE.Color('#0f3b4a'));
    }
    scene.add(shadows);
    const goldGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: '#ffd35a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    goldGlow.scale.set(2.6, 2.6, 1);
    scene.add(goldGlow);
    const bottleFloat = makeFish('bottle', { fresh: true });
    bottleFloat.scale.setScalar(0.6);
    bottleFloat.visible = false;
    scene.add(bottleFloat);
    const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    glint.scale.setScalar(1.6);
    scene.add(glint);
    const nightTint = new THREE.Color('#7fe0f0');
    let goldenIn = 4;
    const swimmers = [];
    const PIER_END = new THREE.Vector3(0.2, 0, -0.6);
    const bandOf = (x, z) => {
      const d = Math.hypot(x - PIER_END.x, z - PIER_END.z);
      return d < 8.5 ? 'near' : d < 15 ? 'mid' : 'far';
    };
    const weatherName = () => weathers[round] || 'morning';
    const pickFish = (band) => {
      const night = weatherName() === 'night';
      const rainy = weatherName() === 'drizzle';
      const g = GOALS[trip[round]] || {};
      const list = FISH.filter((f) => !f.special && (f.band === band || (band === 'far' && f.band === 'mid' && Math.random() < 0.3)));
      const w = list.map((f) => f.weight * (g.boost?.[f.id] || 1) * (night && f.night ? f.night : 1) * (has('lure') && f.rarity >= 3 ? 1.4 : 1) * (rainy && f.id === 'tuna' ? 1.8 : 1));
      let r = Math.random() * w.reduce((a, b) => a + b, 0);
      for (let i = 0; i < list.length; i++) if ((r -= w[i]) <= 0) return list[i];
      return list[0];
    };
    const spawn = (opts = {}) => {
      if (swimmers.length >= MAXF) return null;
      let x;
      let z;
      if (opts.at) ({ x, z } = opts.at);
      else {
        do {
          x = (Math.random() - 0.5) * 26;
          z = -3 - Math.random() * 24;
        } while (Math.abs(x) < 3 && z > -5);
      }
      const info = opts.id ? FISH_BY_ID[opts.id] : pickFish(bandOf(x, z));
      const d = Math.hypot(x - PIER_END.x, z - PIER_END.z);
      const g = GOALS[trip[round]] || {};
      const size = rollSize(info, Math.min(0.85, d / 30 + (g.sizeBoost || 0)));
      const s = {
        id: info.id,
        info,
        size,
        x,
        z,
        h: Math.random() * PI * 2,
        speed: 0.5 + Math.random() * 0.5,
        state: 'roam',
        t: 0,
        turn: 0,
        wig: Math.random() * 6,
        scale: clamp((size / 100) * 2.4, 0.55, 2.8) * (info.junk ? 0.85 : 1),
      };
      swimmers.push(s);
      return s;
    };
    const resetWater = () => {
      swimmers.length = 0;
      for (let i = 0; i < 6; i++) spawn();
      const g = GOALS[trip[round]];
      if (g?.special === 'golden') spawn({ id: 'golden', at: { x: (Math.random() - 0.5) * 16, z: -17 - Math.random() * 6 } });
      bottleFloat.visible = g?.special === 'bottle';
      bottle.x = (Math.random() - 0.5) * 12;
      bottle.z = -9 - Math.random() * 6;
    };
    const bottle = { x: 0, z: -10, h: 0 };

    // ---------------------------------------------------------------- state
    let round = 0;
    let state = 'intro';
    let st = 0; // time in state
    let timeLeft = TIMES[0];
    let limit = TIMES[0];
    let aim = 0;
    let power = 0;
    let powerDir = 1;
    let target = null; // desired landing point from a tap
    const castFrom = new THREE.Vector3();
    const castTo = new THREE.Vector3();
    let castDur = 1;
    const hook = new THREE.Vector3(); // where the float or hooked fish is
    let biter = null;
    let waitFor = 5;
    let biteWindow = 0.9;
    let reel = null;
    let landing = null;
    let windup = 0;
    let snap = 0;
    const got = []; // catches this round
    let roundDone = false;
    const bucketFish = [];
    let lastSay = -10;
    let elapsed = 0;
    let paused = false;
    let pointerCast = false;

    const ACTION_LABELS = { aim: 'Cast', charge: 'Cast', cast: 'Wait', wait: 'Reel in', nibble: 'Wait', bite: 'Reel!', reel: 'Hold', landing: 'Nice!', retrieve: 'Wait' };
    let shownLabel = '';
    const setLabel = () => {
      const l = ACTION_LABELS[state] || '';
      if (l === shownLabel) return;
      shownLabel = l;
      const b = document.querySelector('#arena .a-btn[data-b="action"]');
      if (b) b.textContent = l;
    };
    hud.buttons({ action: 'Cast', jump: null, stick: false });
    hud.hint('Hold Space (or press on the water) to cast, Arrow keys to aim, B for the fish book');

    const go = (s) => {
      state = s;
      st = 0;
      setLabel();
    };

    const headScreen = new THREE.Vector3();
    const palSay = (text, force = false) => {
      if (!force && elapsed - lastSay < 5) return;
      lastSay = elapsed;
      pal.head.getWorldPosition(headScreen);
      headScreen.y += 0.55;
      headScreen.project(camera);
      ui.say(text, ((headScreen.x + 1) / 2) * innerWidth, ((1 - headScreen.y) / 2) * innerHeight);
    };
    const lines = {
      start: palIsHomama ? `I packed your favourite snacks, ${meName}.` : `I brought snacks for you, ${meName}.`,
      common: ['Nice one!', 'Look at you go!', 'That one is shiny!', 'Dinner is sorted.'],
      big: [`Wow, ${meName}!`, "That's a big one!", "I'm telling the whole island."],
      golden: 'The golden fish! Make a wish.',
      boot: palIsHomama ? 'Hey, that boot is my size!' : 'Homama, is that your boot?',
      duck: 'Quack! Somebody lost their bath duck.',
      lost: ['So close! The next one is yours.', 'It waved goodbye.', 'It was a strong one.'],
      early: ['Wait for the big dip!', 'It is only nibbling. Patience.'],
      sunset: palIsHomama ? 'The sky is pretty tonight. You are prettier.' : 'Look at that sky, Homama.',
      night: palIsHomama ? 'Even the stars came out to watch you fish.' : 'The moon is pretty tonight.',
      breezy: 'Hold on to your hat, it is windy!',
      drizzle: 'A little rain makes the big ones hungry.',
    };

    // The partner stands up to cheer, then sits back down
    const palCheer = (type = 'cheer') => {
      if (palState.stand > 0) return;
      palState.stand = 2.2;
      pal.carry(null);
      pal.pose = 'stand';
      pal.root.position.set(-0.95, 0, -0.05);
      pal.root.rotation.y = PI - 0.9;
      pal.emote(type);
    };

    const hudScore = () => {
      const g = GOALS[trip[round]];
      if (!g) return;
      const n = g.kinds ? new Set(got.map((c) => c.id).filter((id) => !FISH_BY_ID[id].junk)).size : got.filter((c) => g.ok(c)).length;
      const secs = Math.max(0, Math.ceil(timeLeft));
      const low = secs <= 10 && !roundDone;
      const starRow = roundStars.map((n) => [0, 1, 2].map((i) => (n !== null && i < n ? '<span style="color:#ffb81f">&#9733;</span>' : '<span style="color:#d9cfc8">&#9734;</span>')).join('')).join('<span style="color:#d9cfc8"> &middot; </span>');
      hud.score(`<div style="font-size:.72rem;font-weight:600;color:#7a6470">Round ${round + 1} of 3 &nbsp;${starRow}</div><div style="font-size:.95rem">${g.text}</div><div style="font-size:.7rem;font-weight:500;color:#7a6470">${g.tip}</div><div style="font-size:.85rem;color:#2f9fb8">${g.need > 1 ? `${Math.min(n, g.need)} / ${g.need} &middot; ` : ''}<span style="color:${low ? '#ef5b6f' : '#2f9fb8'}">${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</span></div>`);
      return n;
    };

    // ---------------------------------------------------------------- rounds
    const startRound = (i) => {
      if (reel?.model) reel.model.removeFromParent();
      reel = null;
      ui.reel(false);
      ui.power(null);
      float.visible = false;
      bang.visible = false;
      biter = null;
      me.hands = 'read';
      round = i;
      got.length = 0;
      roundDone = false;
      limit = Math.max(55, TIMES[i] - level * 4);
      timeLeft = limit;
      world.set(weathers[i], i === 0 ? 0.01 : 2.2);
      world.sinkSun = 0;
      resetWater();
      biteWindow = Math.max(0.55, 0.95 - level * 0.05 - i * 0.07);
      hudScore();
      hud.message(`Round ${i + 1}`, 1300);
      setTimeout(() => !disposed && hud.message(`<span style="font-size:.55em">${GOALS[trip[i]].text}</span><br><span style="font-size:.32em">${GOALS[trip[i]].tip}</span>`, 1900), 1350);
      go('roundIntro');
      const w = weathers[i];
      if (lines[w]) setTimeout(() => !disposed && palSay(lines[w], true), 3600);
      else if (i === 0) setTimeout(() => !disposed && palSay(lines.start, true), 3600);
    };

    const endRound = (success) => {
      roundDone = true;
      ui.power(null);
      ui.reel(false);
      const k = timeLeft / limit;
      const stars = success ? (k >= 0.45 ? 3 : k >= 0.2 ? 2 : 1) : 0;
      roundStars[round] = stars;
      hudScore();
      if (success) {
        hud.message(`<span style="font-size:.7em">Goal complete!</span><br><span style="color:#ffd166">${'&#9733;'.repeat(stars)}${'&#9734;'.repeat(3 - stars)}</span>`, 2300);
        sound.ui('win');
        fx.heartsAt(new THREE.Vector3(me.root.position.x, 1.6, me.root.position.z), 6);
        palCheer(stars === 3 ? 'heart' : 'cheer');
      } else {
        hud.message('<span style="font-size:.7em">Out of time!</span>', 2000);
        sound.ui('lose');
      }
      go('roundEnd');
    };

    const finishTrip = () => {
      go('done');
      const total = roundStars.reduce((a, b) => a + (b || 0), 0);
      const before = stats.total;
      stats.trips += 1;
      stats.total += total;
      stats.best = Math.max(stats.best, total);
      ctx.save('stats', stats);
      const fresh = UNLOCKS.filter((u) => before < u.at && stats.total >= u.at);
      const next = UNLOCKS.find((u) => stats.total < u.at);
      const allDone = roundStars.every((s) => s > 0);
      let text = `You earned <b>${total} of 9 stars</b> today (best ${stats.best}). Fish book: ${bookCount()} of ${FISH.length}.`;
      if (fresh.length) text += `<br>Unlocked: <b>${fresh.map((u) => u.name).join(', ')}</b>!`;
      else if (next) text += `<br>${next.at - stats.total} more stars for the ${next.name.replace(/ \(.*\)/, '')}.`;
      ctx.finish({ win: allDone, title: allDone ? (total >= 8 ? 'What a catch!' : 'A lovely day out!') : total > 0 ? 'So close!' : 'Back to the harbour', text });
    };

    // ---------------------------------------------------------------- catching
    const recordCatch = (id, size) => {
      const info = FISH_BY_ID[id];
      const prev = book[id];
      const isNew = !prev;
      book[id] = { n: (prev?.n || 0) + 1, best: Math.max(prev?.best || 0, size) };
      ctx.save('book', book);
      ui.bookCount(bookCount());
      const c = { id, info, size };
      got.push(c);
      const col = ['', '#7a9a8f', '#2f9fb8', '#c76fa8', '#e0a020'][info.rarity];
      ui.card(
        `<div class="r" style="color:${col}">${RARITY[info.rarity]}${'&#9733;'.repeat(info.rarity)}</div><h3>${info.name}${isNew ? '<span class="new">New!</span>' : ''}</h3>${info.junk ? '' : `<div class="sz">${size} cm${prev && size > prev.best ? ' &middot; a new best!' : ''}</div>`}<p>${info.line}</p>`,
        3000,
      );
      return { c, isNew };
    };

    const goalCount = () => hudScore();

    // ---------------------------------------------------------------- input
    const ray = new THREE.Raycaster();
    const waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -SEA);
    const hit = new THREE.Vector3();
    const pointerWater = () => {
      ray.setFromCamera(input.pointer.ndc, camera);
      return ray.ray.intersectPlane(waterPlane, hit) ? hit : null;
    };
    const mainHeld = () => input.held('action') || input.held('jump') || input.pointer.down;
    const mainPressed = () => input.pressed('action') || input.pressed('jump') || input.pointer.justDown;
    const onKey = (e) => {
      if (e.key === 'Escape' && ui.bookOpen) {
        e.stopImmediatePropagation();
        e.preventDefault();
        ui.closeBook();
      }
    };
    window.addEventListener('keydown', onKey, true);
    const openBook = () => {
      const next = UNLOCKS.find((u) => stats.total < u.at);
      ui.openBook(book, `${bookCount()} of ${FISH.length} found &middot; ${stats.total} stars in all${next ? ` &middot; ${next.at - stats.total} more for the ${next.name.replace(/ \(.*\)/, '')}` : ''}`);
    };
    ui.onBook = openBook;

    // Test hook: window.__fishingAuto = true plays by itself (used by the headless checks)
    const auto = () => window.__fishingAuto === true;
    window.__fishing = {
      get state() {
        return { state, round, timeLeft: +timeLeft.toFixed(1), got: got.map((c) => c.id), stars: roundStars, trip, weathers, swimmers: swimmers.length };
      },
      skip() {
        timeLeft = 0.5;
      },
      round: (i, id) => {
        if (id) {
          trip[i] = id;
          weathers[i] = GOALS[id].weather || weathers[i];
        }
        startRound(i);
      },
      weather: (name) => world.set(name, 0.01),
      castAt: (what) => {
        const spot = what === 'bottle' ? bottle : swimmers.find((q) => q.id === what);
        if (!spot) return false;
        hook.set(spot.x, SEA, spot.z);
        onLand();
        return state;
      },
      book: () => openBook(),
    };

    // ---------------------------------------------------------------- the camera
    const camPos = new THREE.Vector3(2.3, 3.7, 5.6);
    const camLook = new THREE.Vector3(-0.3, -0.6, -11);
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    const tipW = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const tmp2 = new THREE.Vector3();
    let disposed = false;

    // Intro card: the day's three goals
    setTimeout(async () => {
      if (disposed) return;
      const list = trip.map((id, i) => `<b>${i + 1}.</b> ${GOALS[id].text} <small style="color:#9a8890">(${WEATHER[weathers[i]].label.toLowerCase()})</small>`).join('<br>');
      await hud.choose({
        title: "Today's fishing trip",
        text: `${list}<br><span style="font-size:.85em">Hold to cast further. When the float dips, reel. Keep the fish inside the green bar.</span>`,
        options: [{ id: 'go', label: "Let's fish" }],
      });
      if (disposed) return;
      startRound(0);
    }, 450);
    world.set(weathers[0], 0.01);
    resetWater();
    hudScore();

    // ---------------------------------------------------------------- per-frame helpers
    const updateSwimmers = (dt, t) => {
      const c = new THREE.Color();
      swimmers.forEach((s, i) => {
        s.t += dt;
        s.wig += dt * (s.state === 'come' ? 9 : 5);
        if (s.state === 'roam') {
          s.turn = damp(s.turn, (Math.random() - 0.5) * 2.5, 2, dt);
          s.h += s.turn * dt;
          // Stay in the bay, away from the pier
          if (Math.abs(s.x) > 14 || s.z < -28 || s.z > -2.5 || (Math.abs(s.x) < 3.2 && s.z > -4.5)) {
            const back = Math.atan2(-s.x * 0.5, -15 - s.z);
            s.h = util.dampAngle(s.h, back, 3, dt);
          }
          s.x += Math.sin(s.h) * s.speed * dt;
          s.z += Math.cos(s.h) * s.speed * dt;
        } else if (s.state === 'come' || s.state === 'nibble' || s.state === 'bite') {
          const dx = hook.x - s.x;
          const dz = hook.z - s.z;
          const d = Math.hypot(dx, dz);
          s.h = util.dampAngle(s.h, Math.atan2(dx, dz), 6, dt);
          if (d > 0.45) {
            s.x += Math.sin(s.h) * Math.min(1.6, d * 2) * dt;
            s.z += Math.cos(s.h) * Math.min(1.6, d * 2) * dt;
          }
        } else if (s.state === 'flee') {
          s.x += Math.sin(s.h) * 3.2 * dt;
          s.z += Math.cos(s.h) * 3.2 * dt;
          if (s.t > 2.5) s.gone = true;
        }
      });
      for (let i = swimmers.length - 1; i >= 0; i--) if (swimmers[i].gone || swimmers[i].state === 'hooked') swimmers.splice(i, 1);
      // The golden fish comes back if it got away
      if (GOALS[trip[round]]?.special === 'golden' && !roundDone && !swimmers.some((q) => q.id === 'golden') && reel?.s.id !== 'golden' && landing?.id !== 'golden') {
        goldenIn -= dt;
        if (goldenIn <= 0) {
          spawn({ id: 'golden', at: { x: (Math.random() - 0.5) * 18, z: -17 - Math.random() * 6 } });
          goldenIn = 4;
        }
      } else goldenIn = 4;
      if (swimmers.length < 5 && Math.random() < dt * 0.4) {
        // A new one swims in from the side
        const s = spawn({ at: { x: (Math.random() < 0.5 ? -1 : 1) * 15, z: -6 - Math.random() * 20 } });
        if (s) s.h = s.x > 0 ? -PI / 2 : PI / 2;
      }
      let golden = null;
      for (let i = 0; i < MAXF; i++) {
        const s = swimmers[i];
        if (!s) {
          shadows.setMatrixAt(i, ZERO);
          continue;
        }
        const wig = 1 + Math.sin(s.wig) * 0.08;
        M4.compose(tmp.set(s.x, SEA + 0.03, s.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s.h - PI / 2, 0)), tmp2.set(s.scale * wig, 1, s.scale * (2 - wig)));
        shadows.setMatrixAt(i, M4);
        // Fish shadows by day; at night they shimmer faintly so you can still find them
        shadows.setColorAt(i, s.id === 'golden' ? c.set('#ffd24a') : c.set(s.info.junk ? '#1d4654' : '#08303d').lerp(nightTint, world.weather.night * 0.75));
        if (s.id === 'golden') golden = s;
      }
      shadows.instanceMatrix.needsUpdate = true;
      shadows.instanceColor.needsUpdate = true;
      goldGlow.visible = !!golden;
      if (golden) {
        goldGlow.position.set(golden.x, SEA + 0.25, golden.z);
        goldGlow.material.opacity = 0.65 + Math.sin(t * 5) * 0.25;
      }
      if (bottleFloat.visible) {
        bottle.h += dt * 0.2;
        bottle.x += Math.sin(bottle.h) * dt * 0.25;
        bottleFloat.position.set(bottle.x, world.waveY(bottle.x, bottle.z, t) + 0.03, bottle.z);
        bottleFloat.rotation.set(Math.sin(t * 1.4) * 0.2, bottle.h, 0.25 + Math.sin(t * 1.9) * 0.12);
        glint.position.set(bottle.x, bottleFloat.position.y + 0.25, bottle.z);
        glint.material.opacity = 0.35 + Math.max(0, Math.sin(t * 3)) * 0.6;
      }
      glint.visible = bottleFloat.visible;
    };

    // When the float lands, the closest fish nearby (or the bottle, or the golden fish) comes over
    const onLand = () => {
      float.visible = true;
      splash(hook.x, hook.z, 10, 0.7);
      const g = GOALS[trip[round]];
      if (g?.special === 'bottle' && bottleFloat.visible && Math.hypot(bottle.x - hook.x, bottle.z - hook.z) < 2.2) {
        biter = { id: 'bottle', info: FISH_BY_ID.bottle, size: rollSize(FISH_BY_ID.bottle), state: 'bite', bottle: true };
        bottleFloat.visible = false;
        go('bite');
        bang.visible = true;
        st = biteWindow * 0.3;
        return;
      }
      let best = null;
      let bd = Infinity;
      for (const s of swimmers) {
        if (s.state !== 'roam') continue;
        const d = Math.hypot(s.x - hook.x, s.z - hook.z);
        const reach = s.id === 'golden' ? 2.8 : 3.6 + s.scale * 0.6;
        if (d < reach && d < bd) {
          bd = d;
          best = s;
        }
      }
      if (best) {
        best.state = 'come';
        best.t = 0;
        biter = best;
      } else biter = null;
      waitFor = 3.5 + Math.random() * 3;
      go('wait');
    };

    const hookFish = () => {
      const s = biter;
      bang.visible = false;
      if (s.state) s.state = 'hooked';
      const f = s.info.fight * (1 + level * 0.06 + round * 0.1);
      const zh = clamp(0.38 - s.info.fight * 0.09, 0.2, 0.36) * (has('rod') ? 1.12 : 1);
      const model = makeFish(s.id, { fresh: true });
      const len = clamp(s.size / 100, 0.16, 1.15);
      model.scale.setScalar(len);
      model.visible = false;
      scene.add(model);
      reel = { s, f, zh, zp: 0.3, zv: 0, fp: 0.5, ft: 0.5, next: 0, prog: 0.35, model, len, jumpIn: 1.5 + Math.random() * 1.5, jump: -1, from: hook.clone() };
      ui.reel(true, s.id);
      me.hands = 'stir';
      sound.ui('pop');
      splash(hook.x, hook.z, 16, 1);
      go('reel');
    };

    const loseFish = (why) => {
      ui.reel(false);
      if (reel?.model) reel.model.removeFromParent();
      reel = null;
      me.hands = 'read';
      if (biter?.bottle) bottleFloat.visible = true;
      else if (biter) {
        biter.state = 'flee';
        biter.t = 0;
        biter.h = Math.atan2(biter.x - PIER_END.x, biter.z - PIER_END.z);
        if (!swimmers.includes(biter)) swimmers.push(biter);
      }
      biter = null;
      bang.visible = false;
      if (why === 'early') {
        hud.message('<span style="font-size:.55em">Too early!</span>', 1100);
        palSay(pick(lines.early));
        go('wait');
        waitFor = 3 + Math.random() * 3;
      } else {
        hud.message('<span style="font-size:.55em">It got away!</span>', 1200);
        palSay(pick(lines.lost));
        sound.ui('bad');
        go('retrieve');
      }
    };

    const startLanding = () => {
      ui.reel(false);
      const r = reel;
      reel = null;
      const id = r.s.id;
      const size = r.s.size;
      r.model.visible = true;
      landing = { model: r.model, from: hook.clone(), id, size, len: r.len, done: false };
      float.visible = false;
      splash(hook.x, hook.z, 20, 1.2);
      sound.ui('coin');
      go('landing');
    };

    // ---------------------------------------------------------------- update
    const update = (dt, t) => {
      dt *= window.__fishingSpeed || 1;
      elapsed += dt;
      if (ui.bookOpen || paused) {
        world.update(0, t, PIER_END);
        renderKids(0, t);
        updateCamera(dt);
        return;
      }
      if (input.pressed('b')) openBook();
      st += dt;
      const ax = input.axis();
      const held = mainHeld();
      const pressed = mainPressed() || (auto() && autoPress());
      const heldA = held || (auto() && autoHold());
      const playing = ['aim', 'charge', 'cast', 'wait', 'bite', 'retrieve'].includes(state);
      if (playing || state === 'reel' || state === 'landing') {
        timeLeft -= dt;
        if (GOALS[trip[round]]?.special === 'golden') world.sinkSun = clamp(1 - timeLeft / limit, 0, 1);
      }
      if (timeLeft <= 0 && playing && !roundDone) {
        float.visible = false;
        biter = null;
        bang.visible = false;
        endRound(false);
      }

      if (state === 'roundIntro') {
        if (st > 3.2) go('aim');
      } else if (state === 'aim' || state === 'charge') {
        aim = clamp(aim + ax.x * dt * 1.3, -0.7, 0.7);
        if (state === 'aim') {
          windup = damp(windup, 0, 8, dt);
          if (pressed) {
            if (input.pointer.justDown) {
              const p = pointerWater();
              if (p && p.z < PIER_END.z - 1) {
                aim = clamp(Math.atan2(p.x - PIER_END.x, -(p.z - PIER_END.z)), -0.7, 0.7);
                target = Math.hypot(p.x - PIER_END.x, p.z - PIER_END.z);
              }
              pointerCast = true;
            } else pointerCast = false;
            power = 0;
            powerDir = 1;
            go('charge');
            sound.ui('tick');
          }
        } else {
          power += powerDir * dt * 0.95;
          if (power > 1) {
            power = 1;
            powerDir = -1;
          } else if (power < 0) {
            power = 0;
            powerDir = 1;
          }
          windup = damp(windup, 0.4 + power * 0.6, 10, dt);
          const release = pointerCast ? !input.pointer.down && !input.held('action') && !input.held('jump') : !heldA;
          if (release && st > 0.08) {
            // Cast!
            const d = 3.5 + power * 19;
            castTo.set(PIER_END.x + Math.sin(aim) * d, SEA, PIER_END.z - Math.cos(aim) * d);
            castTo.x = clamp(castTo.x, -15, 15);
            me.root.updateMatrixWorld(true);
            tip.getWorldPosition(castFrom);
            castDur = 0.45 + d * 0.035;
            snap = 1;
            windup = 0;
            target = null;
            sound.ui('swoosh');
            go('cast');
          }
        }
        ui.power(state === 'charge' ? power : null);
      } else if (state === 'cast') {
        const k = Math.min(1, st / castDur);
        hook.lerpVectors(castFrom, castTo, k);
        hook.y += Math.sin(k * PI) * (1.2 + castTo.distanceTo(castFrom) * 0.12) - k * 0;
        float.visible = true;
        float.position.copy(hook);
        if (k >= 1) {
          hook.copy(castTo);
          onLand();
        }
      } else if (state === 'wait') {
        if (biter && biter.state === 'come' && Math.hypot(biter.x - hook.x, biter.z - hook.z) < 0.55) {
          biter.state = 'nibble';
          biter.nibbles = 1 + Math.floor(Math.random() * 3);
          biter.nt = 0.4;
        }
        if (biter && biter.state === 'nibble') {
          biter.nt -= dt;
          if (biter.nt <= 0) {
            if (biter.nibbles-- > 0) {
              biter.nt = 0.55 + Math.random() * 0.5;
              biter.dip = 1;
              ripple(hook.x, hook.z, 0.35);
              sound.ctx && sound.tone(700, sound.ctx.currentTime, 0.05, { gain: 0.03 });
            } else {
              go('bite');
              biter.state = 'bite';
              bang.visible = true;
              splash(hook.x, hook.z, 8, 0.6);
              sound.ctx && sound.tone(520, sound.ctx.currentTime, 0.16, { type: 'square', gain: 0.04, slideTo: 760 });
              navigator.vibrate?.(60);
            }
          }
        }
        if (!biter) {
          waitFor -= dt;
          if (waitFor <= 0) {
            // Nobody close: one swims over from further out
            const a = Math.random() * PI * 2;
            const s = spawn({ at: { x: clamp(hook.x + Math.cos(a) * 7, -14, 14), z: clamp(hook.z + Math.sin(a) * 7, -27, -3) } });
            if (s) {
              s.state = 'come';
              biter = s;
            }
            waitFor = 4;
          }
        }
        if (pressed && state === 'wait') {
          if (biter && biter.state === 'nibble') loseFish('early');
          else {
            if (biter) biter.state = 'roam';
            biter = null;
            go('retrieve');
          }
        }
      } else if (state === 'bite') {
        if (pressed) hookFish();
        else if (st > biteWindow) loseFish('missed');
      } else if (state === 'reel') {
        const r = reel;
        // The fish darts up and down; holding lifts the green bar, letting go lets it fall
        r.next -= dt;
        if (r.next <= 0) {
          r.ft = Math.random() < 0.25 ? (r.fp > 0.5 ? 0.05 : 0.95) : Math.random();
          r.next = (1.6 - r.s.info.fight * 0.7) * (0.5 + Math.random());
        }
        const fsp = (0.18 + r.f * 0.36) * dt;
        r.fp += clamp(r.ft - r.fp, -fsp, fsp);
        r.zv += (heldA ? 2.9 : -2.5) * dt;
        r.zv = clamp(r.zv, -1.5, 1.5);
        r.zp += r.zv * dt;
        if (r.zp < 0) {
          r.zp = 0;
          r.zv = Math.max(0, -r.zv * 0.3);
        }
        if (r.zp > 1 - r.zh) {
          r.zp = 1 - r.zh;
          r.zv = Math.min(0, -r.zv * 0.3);
        }
        const inside = r.fp >= r.zp && r.fp <= r.zp + r.zh;
        r.prog += dt * (inside ? 0.48 - r.s.info.fight * 0.1 : -(0.1 + r.s.info.fight * 0.05));
        ui.reelState(r.zp, r.zh, r.fp, r.prog, inside);
        // In the water: the hook comes closer as the progress fills, and swings with the fish
        const pull = clamp(r.prog, 0, 1);
        tmp.copy(r.from).lerp(PIER_END, pull * 0.7);
        hook.x = tmp.x + (r.fp - 0.5) * 2.6;
        hook.z = tmp.z + Math.sin(elapsed * 2) * 0.3;
        hook.y = world.waveY(hook.x, hook.z, t);
        if (Math.random() < dt * 4) ripple(hook.x, hook.z, 0.3 + r.len * 0.4);
        // Big ones jump
        r.jumpIn -= dt;
        if (r.len > 0.35 && !r.s.bottle && r.jumpIn <= 0 && r.jump < 0) {
          r.jump = 0;
          splash(hook.x, hook.z, 10, 0.8);
        }
        if (r.jump >= 0) {
          r.jump += dt / 0.65;
          r.model.visible = true;
          r.model.position.set(hook.x, SEA + Math.sin(r.jump * PI) * (0.8 + r.len * 0.6), hook.z);
          r.model.rotation.set(0, aim + PI / 2, Math.cos(r.jump * PI) * 0.9);
          if (r.jump >= 1) {
            r.jump = -1;
            r.model.visible = false;
            r.jumpIn = 2 + Math.random() * 2;
            splash(hook.x, hook.z, 12, 0.9);
          }
        }
        crank.rotation.x += dt * (heldA ? 18 : 4);
        if (r.prog >= 1) startLanding();
        else if (r.prog <= 0) loseFish('lost');
      } else if (state === 'landing') {
        const L = landing;
        const k = Math.min(1, st / 0.7);
        if (!L.done) {
          tmp.set(me.root.position.x, 1.0, me.root.position.z - 0.25);
          L.model.position.lerpVectors(L.from, tmp, k);
          L.model.position.y += Math.sin(k * PI) * 1.4;
          L.model.rotation.set(0, 0, k * PI * 2);
          if (k >= 1) {
            L.done = true;
            rod.visible = false;
            line.visible = false;
            L.model.position.set(0, 0.02, 0.05);
            L.model.rotation.set(0, 0, 0.15);
            me.carry(L.model);
            const { c, isNew } = recordCatch(L.id, L.size);
            const info = c.info;
            if (L.id === 'golden') {
              palCheer('spin');
              palSay(lines.golden, true);
              fx.heartsAt(new THREE.Vector3(me.root.position.x, 1.6, me.root.position.z), 8);
            } else if (L.id === 'boot') palSay(lines.boot, true);
            else if (L.id === 'duck') palSay(lines.duck, true);
            else if (L.id === 'bottle') {
              paused = true;
              const note = NOTES[stats.note % NOTES.length];
              stats.note += 1;
              ctx.save('stats', stats);
              const mine = ctx.me === 'homama';
              hud
                .choose({
                  title: mine ? 'Your letter came back!' : 'A letter from Homama',
                  text: mine ? `The one you wrote for Roji. You read it to her, and she keeps it.<br><br><i>${note}</i>` : `<i>${note}</i>`,
                  options: [{ id: 'keep', label: 'Keep it close' }],
                })
                .then(() => {
                  paused = false;
                  fx.heartsAt(pal.head.getWorldPosition(new THREE.Vector3()).setY(1.6), 6);
                  palCheer('heart');
                });
            } else if (info.rarity >= 3 || L.size >= 60) {
              palCheer(info.rarity >= 3 ? 'heart' : 'cheer');
              palSay(pick(lines.big), true);
            } else {
              if (Math.random() < 0.5) palCheer('cheer');
              palSay(pick(lines.common));
            }
            if (isNew) sound.ui('good');
          }
        } else if (st > 2.6) {
          // Into the bucket it goes
          me.carry(null);
          me.hands = 'read';
          rod.visible = true;
          line.visible = true;
          const mini = landing.model;
          mini.scale.setScalar(Math.min(0.3, landing.len * 0.6));
          mini.rotation.set(-PI / 2, 0, Math.random() * PI);
          mini.position.set((Math.random() - 0.5) * 0.12, 0.3 + bucketFish.length * 0.02, (Math.random() - 0.5) * 0.12);
          world.bucket.add(mini);
          bucketFish.push(mini);
          if (bucketFish.length > 6) bucketFish.shift().removeFromParent();
          landing = null;
          const n = goalCount();
          const g = GOALS[trip[round]];
          if (n >= g.need && !roundDone) endRound(true);
          else if (timeLeft <= 0 && !roundDone) endRound(false);
          else go('aim');
        }
      } else if (state === 'retrieve') {
        // Reel the float back in
        const k = Math.min(1, st / 0.6);
        tmp.copy(hook).lerp(tipW, k);
        float.position.copy(tmp);
        if (k >= 1) {
          float.visible = false;
          go('aim');
        }
      } else if (state === 'roundEnd') {
        if (st > 2.6) {
          if (round < 2) startRound(round + 1);
          else finishTrip();
        }
      }

      // Float bobbing, nibbles and the big dip
      if (float.visible && state !== 'cast' && state !== 'retrieve') {
        let y = world.waveY(hook.x, hook.z, t);
        if (biter?.dip) {
          biter.dip = Math.max(0, biter.dip - dt * 5);
          y -= Math.sin(biter.dip * PI) * 0.07;
        }
        if (state === 'bite') y -= 0.16 + Math.sin(st * 30) * 0.03;
        if (state === 'reel') y -= 0.1;
        float.position.set(hook.x, y, hook.z);
        float.visible = state !== 'reel';
        bang.position.set(hook.x, y + 0.75 + Math.sin(st * 12) * 0.05, hook.z);
      }
      floatTop.emissiveIntensity = world.weather.night * 0.8;
      floatGlow.material.opacity = world.weather.night * 0.7;
      if (timeLeft >= 0 && Math.floor(elapsed * 4) !== Math.floor((elapsed - dt) * 4)) hudScore();

      renderKids(dt, t);
      world.update(dt, t, PIER_END);
      updateSwimmers(dt, t);
      updateFx(dt);
      updateCamera(dt);
    };

    // ---------------------------------------------------------------- automatic play for tests
    let autoPressT = 0;
    let autoPower = 0.55;
    const autoPress = () => {
      autoPressT += 1;
      if (state === 'aim' && autoPressT % 20 === 0) {
        // Aim at the bottle or the golden fish when the goal asks for it
        const g = GOALS[trip[round]];
        const gold = swimmers.find((s) => s.id === 'golden');
        const spot = g?.special === 'bottle' && bottleFloat.visible ? bottle : g?.special === 'golden' && gold ? gold : null;
        if (spot) {
          aim = clamp(Math.atan2(spot.x - PIER_END.x, -(spot.z - PIER_END.z)), -0.7, 0.7);
          autoPower = clamp((Math.hypot(spot.x - PIER_END.x, spot.z - PIER_END.z) - 3.5) / 19, 0, 1);
        } else {
          aim = (Math.random() - 0.5) * 1.2;
          autoPower = Math.random() * 0.8;
        }
        return true;
      }
      if (state === 'bite') return st > 0.15;
      return false;
    };
    const autoHold = () => {
      if (state === 'charge') return power < autoPower && powerDir > 0;
      if (state === 'reel') return reel && reel.zp + reel.zh / 2 < reel.fp;
      return false;
    };

    // ---------------------------------------------------------------- kids, rod and line
    const renderKids = (dt, t) => {
      me.update(dt, t, 0, 0, 0);
      // Rod: wound back while charging, snaps forward on the cast, bends when a fish pulls
      snap = Math.max(0, snap - dt * 4);
      const bend = state === 'reel' ? 0.55 + (reel ? Math.abs(reel.fp - (reel.zp + reel.zh / 2)) * 0.8 : 0) : state === 'bite' ? 0.45 : 0;
      rod.rotation.x = damp(rod.rotation.x, 0.95 - windup * 1.4 + snap * 0.5, 14, dt);
      rod.rotation.z = damp(rod.rotation.z, -aim * 0.6, 8, dt);
      segs[1].rotation.x = damp(segs[1].rotation.x, bend * 0.35, 10, dt);
      segs[2].rotation.x = damp(segs[2].rotation.x, bend * 0.6, 10, dt);
      if (windup > 0.05 || snap > 0) {
        const a = -1.05 - windup * 1.3 + snap * 0.4;
        me.arms[0].rotation.set(a, 0, -0.3);
        me.arms[1].rotation.set(a, 0, 0.3);
      }
      me.root.rotation.y = damp(me.root.rotation.y, PI - aim * 0.5, 6, dt);
      // Partner: sitting with a juice box, or standing up to cheer
      if (palState.stand > 0) {
        palState.stand -= dt;
        if (palState.stand <= 0) {
          pal.pose = 'sit';
          pal.root.position.copy(PAL_SEAT);
          pal.root.rotation.y = PI - 0.45;
          pal.carry(juice);
        }
      }
      pal.update(dt, t, 0, 0, 0);
      if (pal.pose === 'sit') {
        // Watch the float
        const look = float.visible ? clamp(Math.atan2(hook.x - pal.root.position.x, -(hook.z - pal.root.position.z)) * 0.5 - 0.3, -0.6, 0.6) : -0.2;
        palState.look = damp(palState.look, look, 3, dt);
        pal.head.rotation.y = -palState.look;
      }
      me.root.updateMatrixWorld(true);
      tip.getWorldPosition(tipW);
      // Fishing line from the rod tip to the float (slack while waiting, tight while reeling)
      const p = lineGeo.attributes.position;
      const end = state === 'aim' || state === 'charge' || state === 'roundIntro' || state === 'roundEnd' || state === 'done' || state === 'intro' || state === 'landing' ? tmp2.copy(tipW).add(tmp.set(0, -0.35, 0)) : float.visible || state === 'reel' ? (state === 'reel' ? hook : float.position) : tmp2.copy(tipW).add(tmp.set(0, -0.35, 0));
      const slack = state === 'wait' ? 0.6 : state === 'cast' ? 0.25 : state === 'reel' ? 0.02 : 0.05;
      for (let i = 0; i < LINE_N; i++) {
        const u = i / (LINE_N - 1);
        p.setXYZ(i, lerp(tipW.x, end.x, u), lerp(tipW.y, end.y, u) - Math.sin(u * PI) * slack, lerp(tipW.z, end.z, u));
      }
      p.needsUpdate = true;
      // Aim marker on the water
      const showAim = state === 'aim' || state === 'charge';
      aimRing.visible = showAim;
      const d = state === 'charge' ? 3.5 + power * 19 : target ?? 9;
      tmp.set(PIER_END.x + Math.sin(aim) * d, 0, PIER_END.z - Math.cos(aim) * d);
      aimRing.position.set(clamp(tmp.x, -15, 15), world.waveY(tmp.x, tmp.z, t) + 0.04, tmp.z);
      aimRing.scale.setScalar(state === 'charge' ? 1 : 0.8 + Math.sin(t * 4) * 0.08);
      aimRing.material.color.set(target && state === 'charge' && Math.abs(d - target) < 1.2 ? '#7fd8bf' : '#ffffff');
      dots.forEach((dot, i) => {
        dot.visible = showAim;
        const u = (i + 1) / (dots.length + 1);
        dot.position.set(lerp(PIER_END.x, aimRing.position.x, u), lerp(SEA + 0.05, SEA + 0.05, u) + Math.sin(u * PI) * (0.6 + d * 0.05), lerp(PIER_END.z, aimRing.position.z, u));
      });
      if (target && state === 'charge' && !auto()) ui.power(power, Math.abs(3.5 + power * 19 - target) < 1.2 ? 'Let go now!' : 'Hold to cast further');
    };

    const updateFx = (dt) => {
      let any = false;
      dropList.forEach((d, i) => {
        if (d.life <= 0) return;
        any = true;
        d.v.y -= 9.8 * dt;
        d.p.addScaledVector(d.v, dt);
        if (d.p.y < SEA) {
          d.life = 0;
          drops.setMatrixAt(i, ZERO);
          return;
        }
        drops.setMatrixAt(i, M4.makeTranslation(d.p.x, d.p.y, d.p.z));
      });
      if (any || dropNext) drops.instanceMatrix.needsUpdate = true;
      for (const r of rings) {
        if (!r.visible) continue;
        r.userData.t += dt * 1.6;
        const k = r.userData.t;
        r.scale.setScalar((0.2 + k * 0.9) * r.userData.s);
        r.material.opacity = Math.max(0, 1 - k) * 0.7;
        if (k >= 1) r.visible = false;
      }
      // Speech bubble follows the partner's head
      pal.head.getWorldPosition(headScreen);
      headScreen.y += 0.55;
      headScreen.project(camera);
      ui.moveBubble(((headScreen.x + 1) / 2) * innerWidth, ((1 - headScreen.y) / 2) * innerHeight);
    };

    // The camera sits behind the kids looking out to sea; for a catch it swings round to the front
    let orbitK = 0;
    const updateCamera = (dt) => {
      const mp = me.root.position;
      const focusX = state === 'reel' || state === 'wait' || state === 'bite' ? hook.x * 0.35 : Math.sin(aim) * 3;
      const focusZ = state === 'reel' || state === 'wait' || state === 'bite' ? Math.max(-14, hook.z * 0.6) : -8;
      const portrait = innerWidth / innerHeight < 1.4;
      wantPos.set(2.3 + focusX * 0.2, 3.7 + (portrait ? 1.2 : 0), 5.6 + (portrait ? 2 : 0));
      wantLook.set(focusX - 0.3, -0.6, focusZ - 3);
      camPos.x = damp(camPos.x, wantPos.x, 2.2, dt);
      camPos.y = damp(camPos.y, wantPos.y, 2.2, dt);
      camPos.z = damp(camPos.z, wantPos.z, 2.2, dt);
      camLook.x = damp(camLook.x, wantLook.x, 2.2, dt);
      camLook.y = damp(camLook.y, wantLook.y, 2.2, dt);
      camLook.z = damp(camLook.z, wantLook.z, 2.2, dt);
      orbitK = damp(orbitK, state === 'landing' && landing?.done ? 1 : 0, 2.8, dt);
      const e = orbitK * orbitK * (3 - 2 * orbitK);
      const a0 = Math.atan2(camPos.x - mp.x, camPos.z - mp.z);
      const r0 = Math.hypot(camPos.x - mp.x, camPos.z - mp.z);
      const a = lerp(a0, PI - 0.32, e);
      const r = lerp(r0, portrait ? 3.6 : 3.0, e);
      camera.position.set(mp.x + Math.sin(a) * r, lerp(camPos.y, 1.45, e), mp.z + Math.cos(a) * r);
      tmp.set(mp.x - 0.15, 0.82, mp.z);
      camera.lookAt(tmp2.copy(camLook).lerp(tmp, e));
      env.follow(tmp.set(0, 0, -1.5));
    };

    renderKids(0, 0);
    updateCamera(10);
    return {
      update,
      dispose() {
        disposed = true;
        window.removeEventListener('keydown', onKey, true);
        ui.dispose();
        delete window.__fishing;
      },
    };
  },
};
