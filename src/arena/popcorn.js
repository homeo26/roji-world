import { kit, makeAtlas, colorBake, roundRect, fitText, heartPath, uvScale } from '../places/school/kit.js';
import { popcornMachine, bucket, kernelGeo, drawPoster, wallpaper, KERNEL_COLORS, RED, DEEP, GOLD, WINE } from '../interiors/cinema/models.js';

// Popcorn Catch: in the cinema lobby the big popcorn machine pops kernels high into the air.
// Walk left and right with the striped bucket to catch them before the movie starts.
// Fluffy +1, golden +5, burnt -3. Catches in a row build a combo (x2 from 6, x3 from 15).
// Every play is a different show (Play again moves to the next one), each with its own goal and best.

const GAME_TIME = 45;
const SHOWS = [
  { id: 'matinee', name: 'Matinee', text: 'Fill the bucket!', gold: 0.1, burnt: 0, extra: 0, goal: 60, best: 'best' },
  { id: 'golden', name: 'Golden hour', text: 'Golden popcorn everywhere!', gold: 0.2, burnt: 0, extra: 0, goal: 85 },
  { id: 'burnt', name: 'Burnt batch', text: 'Dodge the burnt ones!', gold: 0.1, burnt: 0.12, extra: 0.1, goal: 55 },
  { id: 'double', name: 'Double feature', text: 'Twice the popcorn!', gold: 0.1, burnt: 0.02, extra: 0.35, goal: 80 },
];
const RANGE = 4.3; // how far left and right the kid can walk
const G = 6.5; // popcorn floats down slowly
const MAX = 40; // kernels in the air per kind
const PTS = { plain: 1, gold: 5, burnt: -3 };

export default {
  id: 'popcorn',
  title: 'Popcorn Catch',
  tagline: 'Fill the bucket before the movie starts',

  async start(ctx) {
    const { THREE, scene, camera, util, hud, input, sound, fx, FONT } = ctx;
    const showN = (ctx.load('show', 0) || 0) % SHOWS.length;
    ctx.save('show', showN + 1);
    const show = SHOWS[showN];
    const GOAL = show.goal;
    const bestKey = show.best || 'best-' + show.id;
    const { damp, clamp, lerp } = util;
    const P = Math.PI;
    const k = kit();
    const { box, rbox, cyl, sph, at, rot } = k;
    const env = ctx.env.indoor({ color: '#f0cfc6', warm: 1.05 });
    env.sun.position.set(-3, 10, 7);
    const set = new THREE.Group();
    scene.add(set);
    const add = (...o) => (set.add(...o), o[0]);
    const atlas = makeAtlas(1024, 1024);
    const meName = ctx.looks[ctx.me]?.name || 'Roji';
    const partnerName = ctx.looks[ctx.partner]?.name || 'Homama';

    // ---------------------------------------------------------------- the lobby set
    const carpetTex = util.canvasTexture(128, 128, (c, w, h) => {
      c.fillStyle = '#b8323a';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#d9a640';
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        c.beginPath();
        c.arc((i + 0.5 + (j % 2) * 0.5) * (w / 4), (j + 0.5) * (h / 4), 3.5, 0, P * 2);
        c.fill();
      }
    });
    carpetTex.wrapS = carpetTex.wrapT = THREE.RepeatWrapping;
    const fg = new THREE.PlaneGeometry(20, 14);
    uvScale(fg, 20 / 1.2, 14 / 1.2);
    add(rot(at(util.mesh(fg, util.umat('#ffffff', { rough: 0.95, map: carpetTex }), { cast: false }), 0, 0, -0.5), -P / 2, 0, 0));
    const paper = wallpaper('#ffe1d6', '#ffd0c2', 0.25, '#c2404c');
    const wg = new THREE.BoxGeometry(20, 7.2, 0.2);
    uvScale(wg, 20, 1.35);
    add(at(util.mesh(wg, util.umat('#ffffff', { rough: 0.9, map: paper })), 0, 3.6, -4.3));
    // Posters
    [['panda', -4.6], ['moonbunny', -2.7], ['kitty', 2.7], ['cupcake', 4.6]].forEach(([id, x]) => {
      add(at(rbox(1.14, 1.54, 0.08, GOLD, 0.04, { metal: 0.3, rough: 0.4 }), x, 2.3, -4.15));
      add(at(atlas.panel(1.0, 1.4, 256, 358, (c, w, h) => drawPoster(c, w, h, id)), x, 2.3, -4.1));
    });
    // Curtains on both sides
    for (const s of [-1, 1]) {
      for (let i = 0; i < 6; i++) add(at(cyl(0.2, 0.23, 7.2, i % 2 ? DEEP : RED, 12, { rough: 0.9 }), s * (6.0 + i * 0.26), 3.6, -3.6 + (i % 2) * 0.1 + i * 0.25));
      const tie = rot(k.tor(0.55, 0.06, GOLD, P * 2, undefined, 20, 6), P / 2, 0, 0);
      tie.scale.set(1, 0.4, 1);
      add(at(tie, s * 6.5, 1.8, -2.9));
    }
    add(at(rbox(14, 2.2, 0.4, RED, 0.08, { rough: 0.9 }), 0, 5.9, -3.9));
    add(at(box(14, 0.08, 0.42, GOLD), 0, 4.98, -3.9));
    for (let i = 0; i < 22; i++) {
      const x = -6.8 + (13.6 / 22) * (i + 0.5);
      add(at(rot(cyl(0.31, 0.31, 0.12, i % 2 ? DEEP : RED, 14, { rough: 0.9 }), P / 2, 0, 0), x, 4.8, -3.68));
      add(at(sph(0.05, GOLD, undefined, 8), x, 4.45, -3.62));
    }
    // Rope barriers and plants at the front corners
    for (const s of [-1, 1]) {
      for (const z of [1.8, 3.2]) {
        add(at(cyl(0.05, 0.08, 0.9, GOLD, 10), s * 5.4, 0.45, z));
        add(at(sph(0.08, GOLD, undefined, 10), s * 5.4, 0.92, z));
      }
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(s * 5.4, 0.84, 1.8), new THREE.Vector3(s * 5.4, 0.58, 2.5), new THREE.Vector3(s * 5.4, 0.84, 3.2));
      add(util.mesh(new THREE.TubeGeometry(curve, 12, 0.035, 6), util.mat('#9e1b32', { rough: 0.6 })));
      add(at(cyl(0.26, 0.2, 0.5, GOLD, 14), s * 5.9, 0.25, -2.4));
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * P * 2;
        const leaf = sph(0.26, i % 2 ? '#4f9a45' : '#5aa84f', { rough: 0.8 }, 10);
        leaf.scale.set(0.9, 0.24, 0.5);
        leaf.rotation.set(0.3 * Math.sin(a), -a, 0.6 * Math.cos(a));
        add(at(leaf, s * 5.9 + Math.cos(a) * 0.26, 0.85 + (i % 3) * 0.18, -2.4 + Math.sin(a) * 0.2));
      }
    }
    // Stacks of spare buckets by the machine
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) add(at(bucket(k, { r: 0.18, h: 0.28, heap: i === 2 ? 8 : 0, badge: i === 2 }), s * 1.75, i * 0.16, -2.9));
    // The big popcorn machine
    const MS = 1.9;
    const machine = popcornMachine(k, { cart: true });
    machine.root.scale.setScalar(MS);
    machine.root.position.set(0, 0, -2.8);
    add(machine.root);
    machine.bake();
    const mouth = new THREE.Vector3(0, 3.7, -2.75);
    // Countdown board above the machine
    const boardCanvas = document.createElement('canvas');
    boardCanvas.width = 640;
    boardCanvas.height = 150;
    const bctx = boardCanvas.getContext('2d');
    const boardTex = new THREE.CanvasTexture(boardCanvas);
    boardTex.colorSpace = THREE.SRGBColorSpace;
    const drawBoard = (sec) => {
      const w = 640;
      const h = 150;
      bctx.clearRect(0, 0, w, h);
      bctx.fillStyle = WINE;
      roundRect(bctx, 0, 0, w, h, 34);
      bctx.fill();
      bctx.strokeStyle = GOLD;
      bctx.lineWidth = 10;
      roundRect(bctx, 8, 8, w - 16, h - 16, 28);
      bctx.stroke();
      bctx.textAlign = 'center';
      bctx.textBaseline = 'middle';
      bctx.fillStyle = '#ffd166';
      fitText(bctx, 'The film starts in', w / 2, h * 0.34, w * 0.8, h * 0.24, 600);
      bctx.fillStyle = sec <= 10 ? '#ff9eb5' : '#fff6d8';
      fitText(bctx, `0:${String(Math.max(0, sec)).padStart(2, '0')}`, w / 2, h * 0.7, w * 0.6, h * 0.38, 700);
      boardTex.needsUpdate = true;
    };
    drawBoard(GAME_TIME);
    add(at(rbox(3.1, 0.82, 0.1, GOLD, 0.05), 0, 4.08, -4.14));
    add(at(util.mesh(new THREE.PlaneGeometry(2.95, 0.7), new THREE.MeshBasicMaterial({ map: boardTex }), { cast: false }), 0, 4.08, -4.08));
    // Marquee bulbs along the top of the wall
    const bulbPos = [];
    for (let x = -5.6; x <= 5.61; x += 0.32) if (Math.abs(x) > 1.75) bulbPos.push([x, 3.42, -4.15]);
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), bulbPos.length);
    const m4 = new THREE.Matrix4();
    bulbPos.forEach(([x, y, z], i) => bulbs.setMatrixAt(i, m4.makeTranslation(x, y, z)));
    const bulbOn = new THREE.Color('#fff2c2');
    const bulbOff = new THREE.Color('#c98a5e');
    for (let i = 0; i < bulbPos.length; i++) bulbs.setColorAt(i, bulbOn);
    add(bulbs);
    colorBake(set, [machine.kettle, machine.heap, machine.pops, machine.glass, bulbs]);

    // ---------------------------------------------------------------- the kids
    const kid = ctx.makeKid(ctx.me);
    scene.add(kid.root);
    const BR = 0.3;
    const BH = 0.42;
    const pail = bucket(k, { r: BR, h: BH, heap: 0 });
    const heapGeo = kernelGeo(0.075, 6);
    const heapMesh = new THREE.InstancedMesh(heapGeo, new THREE.MeshStandardMaterial({ roughness: 0.85 }), 44);
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    const sv = new THREE.Vector3();
    const col = new THREE.Color();
    for (let i = 0; i < 44; i++) {
      const lv = i / 44;
      const spread = (BR - 0.06) * (1 - lv * 0.85);
      const a = i * 2.39996;
      const d = Math.sqrt(((i * 0.618) % 1)) * spread;
      heapMesh.setMatrixAt(i, m4.compose(v.set(Math.cos(a) * d, BH - 0.12 + lv * 0.32, Math.sin(a) * d), q.setFromEuler(e.set(i, i * 1.3, 0)), one));
      heapMesh.setColorAt(i, col.set(i % 9 === 4 ? KERNEL_COLORS.gold : i % 4 ? KERNEL_COLORS.plain : KERNEL_COLORS.butter));
    }
    heapMesh.count = 0;
    pail.add(heapMesh);
    const holder = new THREE.Group();
    holder.position.set(0, -0.2, 0.08);
    holder.add(pail);
    kid.carry(holder);
    const pal = ctx.makeKid(ctx.partner);
    pal.root.position.set(4.95, 0, -1.4);
    pal.root.rotation.y = -0.85;
    scene.add(pal.root);
    const cheer = new THREE.Group();
    cheer.add(rbox(0.56, 0.36, 0.03, GOLD, 0.02));
    cheer.add(at(atlas.panel(0.52, 0.32, 260, 160, (c, w, h) => {
      c.fillStyle = '#fff4e6';
      roundRect(c, 0, 0, w, h, 24);
      c.fill();
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = RED;
      fitText(c, `Go ${meName}!`, w / 2, h * 0.42, w * 0.86, h * 0.36, 700);
      c.fillStyle = '#ff7f9d';
      heartPath(c, w / 2, h * 0.78, h * 0.2);
      c.fill();
    }), 0, 0, 0.02));
    cheer.position.set(0, 0.15, 0.05);
    pal.carry(cheer);

    // ---------------------------------------------------------------- kernels in flight
    const kGeo = kernelGeo(0.14, 7);
    const kinds = {
      plain: new THREE.InstancedMesh(kGeo, util.umat(KERNEL_COLORS.plain, { rough: 0.8 }), MAX),
      gold: new THREE.InstancedMesh(kGeo, util.umat(KERNEL_COLORS.gold, { rough: 0.35, emissive: '#ffb200', ei: 0.55 }), 14),
      burnt: new THREE.InstancedMesh(kGeo, util.umat(KERNEL_COLORS.burnt, { rough: 0.9 }), 20),
    };
    for (const im of Object.values(kinds)) {
      im.castShadow = true;
      im.frustumCulled = false;
      im.count = 0;
      scene.add(im);
    }
    const shadowMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(0.16, 16).rotateX(-P / 2), new THREE.MeshBasicMaterial({ color: '#4a1020', transparent: true, opacity: 0.28, depthWrite: false }), MAX + 34);
    shadowMesh.frustumCulled = false;
    shadowMesh.renderOrder = 1;
    scene.add(shadowMesh);
    const glowTex = util.canvasTexture(64, 64, (c) => {
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,240,170,1)');
      g.addColorStop(1, 'rgba(255,200,80,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
    });
    const glows = Array.from({ length: 14 }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
      s.scale.setScalar(0.75);
      s.visible = false;
      scene.add(s);
      return s;
    });
    const smokeTex = util.canvasTexture(64, 64, (c) => {
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(120,110,110,0.8)');
      g.addColorStop(1, 'rgba(120,110,110,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
    });
    const smokes = Array.from({ length: 24 }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false;
      scene.add(s);
      return { s, t: 1 };
    });
    let smokeNext = 0;
    const puffSmoke = (p) => {
      const sm = smokes[smokeNext];
      smokeNext = (smokeNext + 1) % smokes.length;
      sm.t = 0;
      sm.s.position.copy(p);
      sm.s.visible = true;
    };
    // Floating "+5" labels
    const labelTex = {};
    const label = (text, color) =>
      (labelTex[text] ??= util.canvasTexture(text.length > 3 ? 320 : 160, 96, (c, w, h) => {
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = `700 ${text.length > 3 ? h * 0.46 : h * 0.7}px ${FONT}`;
        c.lineWidth = 10;
        c.strokeStyle = 'rgba(80,20,40,0.75)';
        c.strokeText(text, w / 2, h / 2 + 4);
        c.fillStyle = color;
        c.fillText(text, w / 2, h / 2 + 4);
      }));
    const floats = Array.from({ length: 10 }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false }));
      s.scale.set(0.8, 0.48, 1);
      s.renderOrder = 5;
      s.visible = false;
      scene.add(s);
      return { s, t: 1 };
    });
    let floatNext = 0;
    const floatAt = (text, color, p) => {
      const f = floats[floatNext];
      floatNext = (floatNext + 1) % floats.length;
      f.s.material.map = label(text, color);
      f.s.material.needsUpdate = true;
      f.s.scale.set(text.length > 3 ? 1.6 : 0.8, 0.48, 1);
      f.s.position.copy(p);
      f.t = 0;
      f.s.visible = true;
    };

    // ---------------------------------------------------------------- game state
    const flying = []; // { kind, p, v, rot, spin, landed, rest }
    let phase = 'intro';
    let timeLeft = GAME_TIME;
    let spawnT = 0.5;
    let score = 0;
    let combo = 0;
    let maxCombo = 0;
    let full = false;
    let shake = 0;
    let lastSec = GAME_TIME;
    let endT = 0;
    let best = ctx.load(bestKey, 0) || 0;
    let x = 0;
    let vx = 0;
    let yaw = 0;
    let bulbStep = -1;
    const bucketPos = new THREE.Vector3();
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const hit = new THREE.Vector3();
    const camPos = new THREE.Vector3(0, 3.3, 8.4);
    const look = new THREE.Vector3(0, 1.75, -0.6);

    // Headless test hook (only with ?gdebug in the URL): walk under the next good kernel
    const debug = location.search.includes('gdebug');
    const autopilot = () => {
      let pick = null;
      for (const f of flying) if (!f.landed && f.kind !== 'burnt' && f.v.y < 0 && (!pick || f.p.y < pick.p.y)) pick = f;
      return pick ? clamp((pick.p.x + pick.v.x * Math.max(0, (pick.p.y - 0.8) / Math.max(0.5, -pick.v.y)) - x) * 2, -1, 1) : 0;
    };
    if (debug) window.__popcorn = { state: () => ({ phase, score, timeLeft: +timeLeft.toFixed(1), flying: flying.length, combo }), end: () => (timeLeft = Math.min(timeLeft, 0.3)) };

    const showScore = () => {
      const mult = combo >= 15 ? 3 : combo >= 6 ? 2 : 1;
      const comboText = combo >= 2 ? ` &nbsp;<span style="color:${mult > 1 ? '#c2404c' : '#7a6470'}">Combo ${combo}${mult > 1 ? ` x${mult}` : ''}</span>` : '';
      hud.score(`<b>${score}</b> / ${GOAL} &nbsp; 0:${String(Math.max(0, Math.ceil(timeLeft))).padStart(2, '0')}${comboText}`);
    };

    function spawn() {
      const prog = 1 - timeLeft / GAME_TIME;
      const roll = Math.random();
      const kind = roll < show.gold ? 'gold' : roll < show.gold + 0.12 + show.burnt + prog * 0.1 ? 'burnt' : 'plain';
      const live = flying.filter((f) => f.kind === kind).length;
      if (live >= kinds[kind].instanceMatrix.count) return;
      const p = mouth.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0, 0));
      const tx = clamp((Math.random() * 2 - 1) * RANGE * (0.35 + Math.random() * 0.65), -RANGE, RANGE);
      const T = lerp(1.85, 1.35, prog) * (0.9 + Math.random() * 0.2);
      const ty = bucketPos.y || 0.75;
      const tz = bucketPos.z || 0.4;
      const vel = new THREE.Vector3((tx - p.x) / T, (ty - p.y + 0.5 * G * T * T) / T, (tz - p.z) / T);
      flying.push({ kind, p, v: vel, rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0), spin: (Math.random() - 0.5) * 8, landed: false, rest: 0 });
      machine.pop(2);
      const ac = sound.ctx;
      if (ac) sound.tone(600 + Math.random() * 500, ac.currentTime, 0.06, { type: 'triangle', gain: 0.025 });
    }

    function onCatch(f) {
      const at3 = bucketPos.clone().add(new THREE.Vector3(0, 0.35, 0));
      if (f.kind === 'burnt') {
        score = Math.max(0, score - 3);
        combo = 0;
        shake = 0.4;
        sound.ui('bad');
        floatAt('-3', '#ffb4b4', at3);
        for (let i = 0; i < 3; i++) puffSmoke(bucketPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.3 + i * 0.1, 0)));
      } else {
        combo++;
        maxCombo = Math.max(maxCombo, combo);
        const mult = combo >= 15 ? 3 : combo >= 6 ? 2 : 1;
        const pts = PTS[f.kind] * mult;
        score += pts;
        sound.ui(f.kind === 'gold' ? 'coin' : 'pop');
        floatAt('+' + pts, f.kind === 'gold' ? '#ffd166' : '#ffffff', at3);
        kid.squash = 0.92;
        if (f.kind === 'gold') {
          fx.burst(at3, ['#ffd166', '#fff6c8', '#ffb347'], 18);
          if (!pal.emoteType) pal.emote('cheer');
        }
        if (combo === 6 || combo === 15) hud.message(`Combo x${combo === 6 ? 2 : 3}!`, 900);
        if (!full && score >= GOAL) {
          full = true;
          hud.message('Bucket full!', 1400);
          sound.ui('good');
          fx.heartsAt(bucketPos.clone().add(new THREE.Vector3(0, 0.8, 0)), 5);
          pal.emote('heart');
        }
      }
      showScore();
    }

    function finishGame() {
      phase = 'done';
      const win = score >= GOAL;
      const isBest = score > best;
      if (isBest) {
        best = score;
        ctx.save(bestKey, best);
      }
      if (win) kid.emote('cheer');
      const comboText = maxCombo >= 3 ? ` Longest combo: ${maxCombo}.` : '';
      const bestText = isBest ? ' New best score!' : ` Best: ${best}.`;
      ctx.finish({
        win,
        title: win ? 'Bucket full!' : 'Not quite full',
        text: `${show.name}: ` + (win ? `${score} points. ${meName} and ${partnerName} have popcorn for the whole movie.${comboText}${bestText}` : `${score} of ${GOAL} points. One more try before the movie?${comboText}${bestText}`) + `<br>Next show: ${SHOWS[(showN + 1) % SHOWS.length].name}`,
      });
    }

    // ---------------------------------------------------------------- start
    hud.buttons({ action: null, jump: null });
    hud.hint('A / D or arrows to walk, or drag. Fluffy +1, golden +5, burnt -3');
    showScore();
    camera.position.copy(camPos);
    camera.lookAt(look);
    hud.title('Popcorn Catch', show.name);
    hud.message(show.text, 1500);
    setTimeout(async () => {
      if (phase !== 'intro') return;
      await hud.countdown(3);
      if (phase === 'intro') phase = 'play';
    }, 1300);

    return {
      update(dt, t) {
        // Walk
        let ax = input.axis().x;
        if (debug && phase !== 'done') ax = autopilot();
        const ptr = input.pointer;
        if (ptr.down && phase !== 'done') {
          ray.setFromCamera(ptr.ndc, camera);
          if (ray.ray.intersectPlane(plane, hit)) ax = clamp((hit.x - x) * 1.6, -1, 1);
        }
        const moving = phase === 'play' || phase === 'ending';
        vx = damp(vx, moving ? ax * 6.2 : 0, 14, dt);
        x = clamp(x + vx * dt, -RANGE, RANGE);
        if (Math.abs(x) >= RANGE) vx = 0;
        yaw = damp(yaw, clamp(vx * 0.09, -0.55, 0.55), 10, dt);
        kid.root.position.set(x, 0, 0);
        kid.root.rotation.y = yaw;
        kid.update(dt, t, Math.abs(vx), 0, 0);
        pal.update(dt, t, 0, 0, 0);
        if (!pal.emoteType && Math.random() < dt * 0.15) pal.emote('wave');
        shake = Math.max(0, shake - dt);
        pail.rotation.z = shake > 0 ? Math.sin(t * 50) * shake * 0.5 : 0;
        kid.root.updateMatrixWorld(true);
        pail.getWorldPosition(bucketPos);
        const rimY = bucketPos.y + BH;

        // Clock and spawning
        if (phase === 'play') {
          timeLeft -= dt;
          const sec = Math.ceil(timeLeft);
          if (sec !== lastSec) {
            lastSec = sec;
            drawBoard(sec);
            showScore();
            if (sec <= 5 && sec > 0) sound.ui('tick');
          }
          if (timeLeft <= 0) {
            timeLeft = 0;
            phase = 'ending';
            endT = 1.8;
            drawBoard(0);
            hud.message("Time's up!", 1500);
            sound.ui('swoosh');
          } else {
            spawnT -= dt;
            if (spawnT <= 0) {
              const prog = 1 - timeLeft / GAME_TIME;
              spawn();
              if (Math.random() < 0.1 + show.extra + prog * 0.15) spawn();
              spawnT = lerp(0.8, 0.45, prog) * (0.75 + Math.random() * 0.5);
            }
          }
        } else if (phase === 'ending') {
          endT -= dt;
          if (endT <= 0) finishGame();
        }

        // Kernels
        for (let i = flying.length - 1; i >= 0; i--) {
          const f = flying[i];
          if (f.landed) {
            f.rest += dt;
            if (f.rest > 1.3) flying.splice(i, 1);
            continue;
          }
          const py = f.p.y;
          f.v.y -= G * dt;
          f.p.addScaledVector(f.v, dt);
          f.rot.x += f.spin * dt;
          f.rot.y += f.spin * 0.7 * dt;
          const live = phase === 'play' || phase === 'ending';
          if (live && f.v.y < 0 && py >= rimY && f.p.y < rimY && Math.abs(f.p.x - bucketPos.x) < BR + 0.1 && Math.abs(f.p.z - bucketPos.z) < 0.5) {
            flying.splice(i, 1);
            onCatch(f);
            continue;
          }
          if (f.p.y <= 0.12) {
            f.p.y = 0.12;
            if (Math.abs(f.v.y) > 1.2) {
              f.v.set(f.v.x * 0.4, -f.v.y * 0.25, f.v.z * 0.3);
            } else {
              f.landed = true;
              if (f.kind !== 'burnt' && live && combo >= 3) floatAt('combo lost', '#ffd0d6', f.p.clone().add(new THREE.Vector3(0, 0.5, 0)));
              if (f.kind !== 'burnt' && live) {
                combo = 0;
                showScore();
              }
            }
          }
          if (f.p.z > 2.2) f.p.z = 2.2;
        }
        // Draw kernels, their shadows, glows and smoke
        const counts = { plain: 0, gold: 0, burnt: 0 };
        let si = 0;
        let gi = 0;
        for (const f of flying) {
          const im = kinds[f.kind];
          const n = counts[f.kind];
          if (n >= im.instanceMatrix.count) continue;
          const s = f.landed ? Math.max(0, 1 - Math.max(0, f.rest - 0.8) * 2) : 1;
          im.setMatrixAt(n, m4.compose(f.p, q.setFromEuler(f.rot), v.set(s, s, s)));
          counts[f.kind] = n + 1;
          if (si < shadowMesh.instanceMatrix.count) {
            const h = Math.max(0, f.p.y - 0.12);
            const ss = Math.max(0.35, 1 - h * 0.15) * s;
            shadowMesh.setMatrixAt(si++, m4.compose(v.set(f.p.x, 0.012, f.p.z), q.identity(), sv.set(ss, ss, ss)));
          }
          if (f.kind === 'gold' && gi < glows.length && !f.landed) {
            glows[gi].position.copy(f.p);
            glows[gi].scale.setScalar(0.7 + Math.sin(t * 10 + gi) * 0.1);
            glows[gi++].visible = true;
          }
          if (f.kind === 'burnt' && !f.landed && Math.random() < dt * 6) puffSmoke(f.p.clone().add(new THREE.Vector3(0, 0.12, 0)));
        }
        for (const [kname, im] of Object.entries(kinds)) {
          im.count = counts[kname];
          im.instanceMatrix.needsUpdate = true;
        }
        shadowMesh.count = si;
        shadowMesh.instanceMatrix.needsUpdate = true;
        for (; gi < glows.length; gi++) glows[gi].visible = false;
        for (const sm of smokes) {
          if (sm.t >= 1) continue;
          sm.t += dt * 1.2;
          sm.s.position.y += dt * 0.5;
          sm.s.scale.setScalar(0.25 + sm.t * 0.45);
          sm.s.material.opacity = 0.7 * (1 - sm.t);
          if (sm.t >= 1) sm.s.visible = false;
        }
        for (const fl of floats) {
          if (fl.t >= 1) continue;
          fl.t += dt / 0.9;
          fl.s.position.y += dt * 0.9;
          fl.s.material.opacity = Math.min(1, (1 - fl.t) * 2);
          if (fl.t >= 1) fl.s.visible = false;
        }
        // Bucket heap grows with the score
        heapMesh.count = Math.round(clamp(score / GOAL, 0, 1) * 44);

        machine.update(dt, t);
        const bs = Math.floor(t * 4);
        if (bs !== bulbStep) {
          bulbStep = bs;
          for (let i = 0; i < bulbPos.length; i++) bulbs.setColorAt(i, (i + bs) % 3 ? bulbOn : bulbOff);
          bulbs.instanceColor.needsUpdate = true;
        }
        // Camera follows a little
        camera.position.set(camPos.x + x * 0.28, camPos.y, camPos.z);
        camera.lookAt(look.x + x * 0.3, look.y, look.z);
      },
      dispose() {
        phase = 'done';
        if (debug) delete window.__popcorn;
      },
    };
  },
};
