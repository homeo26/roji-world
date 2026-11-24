// Horse Race: ride your pony round the Meadow Cup course against your partner, Kai and Mina.
// Steer like in town, hold forward to gallop, Shift or the Sprint button to sprint, Space to jump.
import * as THREE from 'three';
import { mat, damp, dampAngle, clamp, easeInOut, easeOutBack } from '../util.js';
import { makeTrack, placeObstacles, buildCourse, LIM } from './riding/course.js';
import * as K from './riding/kit.js';

const LAPS = 2;
const G = 22;
const JUMP_V = 6.0;
const T_AIR = (2 * JUMP_V) / G;
const TROT = 3.2;
const GALLOP = 9.2;
const SPRINT = 12.6;
const BOOST = 1.8;
const TURN = 1.75;
const TIME_CAP = 200;

const RIVALS = [
  {
    id: 'kai',
    name: 'Kai',
    coat: '#5b4a52',
    color: '#3fbf7f',
    base: 9.4,
    miss: 0.12,
    look: { id: 'kai', name: 'Kai', gender: 'boy', skin: '#c98f68', hair: '#141010', hairstyle: 'curly', outfit: 'tee-pants', top: '#3fbf7f', bottom: '#2c3e66', shoes: '#3b2b3f', accent: '#ffd166' },
  },
  {
    id: 'mina',
    name: 'Mina',
    coat: '#e6dfe8',
    color: '#8b5cf6',
    base: 9.25,
    miss: 0.14,
    look: { id: 'mina', name: 'Mina', gender: 'girl', skin: '#fbe6d8', hair: '#b5773d', hairstyle: 'bob', outfit: 'skirt', top: '#8b5cf6', bottom: '#c7a6ff', shoes: '#7a2e3a', accent: '#c7a6ff' },
  },
];

const CSS = `${K.BASE_CSS}
.rr-stam { position: absolute; top: max(14px, env(safe-area-inset-top)); left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; background: rgba(255,250,244,.92); border-radius: 999px; padding: 6px 12px; box-shadow: 0 6px 18px rgba(60,30,40,.15); font-weight: 700; font-size: .8rem; }
.rr-stam i { display: block; width: clamp(80px, 16vw, 150px); height: 10px; border-radius: 99px; background: #f0e2d8; overflow: hidden; }
.rr-stam b { display: block; height: 100%; width: 100%; border-radius: 99px; background: linear-gradient(90deg, #ffd166, #ef5b6f); transform-origin: left; transition: background .2s; }
.rr-stam.tired b { background: #c9bdb6; }
.rr-stam.go { box-shadow: 0 0 0 3px #ffd166, 0 6px 18px rgba(60,30,40,.15); }
.rr-tag { position: absolute; transform: translate(-50%, -100%); color: #fff; border-radius: 999px; padding: 1px 8px; font-weight: 700; font-size: .72rem; box-shadow: 0 3px 8px rgba(60,30,40,.2); white-space: nowrap; display: none; }
.rr-map { position: absolute; top: calc(max(10px, env(safe-area-inset-top)) + 54px); right: max(12px, env(safe-area-inset-right)); width: 150px; height: 104px; border-radius: 16px; background: rgba(255,250,244,.88); box-shadow: 0 6px 18px rgba(60,30,40,.15); }
@media (max-height: 430px) { .rr-map { width: 122px; height: 85px; } }
`;

export default {
  id: 'horserace',
  title: 'Horse Race',
  tagline: 'Two laps of the Meadow Cup',

  async start(ctx) {
    const { scene, camera, hud, input, sound, fx, looks } = ctx;
    const env = ctx.env.outdoor({ fog: [90, 320], shadow: 26 });
    const T = makeTrack();
    const L = T.L;
    const obstacles = placeObstacles(T);
    const course = buildCourse(ctx, T, obstacles);
    const stations = ctx.models.pony?.() ? null : await import('../stations.js');
    const newPony = (coat) => ctx.models.pony?.(coat) || stations.makePony(coat);

    // ---------------------------------------------------------------- people
    const meId = ctx.me;
    const partnerId = ctx.partner;
    const meName = looks[meId].name;
    const partnerName = looks[partnerId].name;
    const defs = [
      { id: RIVALS[0].id, ...RIVALS[0], lane: 3.1 },
      { id: meId, name: meName, who: meId, real: true, me: true, coat: null, color: looks[meId].top || '#ef5b6f', lane: 1.05 },
      { id: partnerId, name: partnerName, who: partnerId, real: true, coat: '#e9bd6a', color: looks[partnerId].top || '#3f7bf0', base: 9.55, miss: 0.1, lane: -1.05 },
      { id: RIVALS[1].id, ...RIVALS[1], lane: -3.1 },
    ];
    const riders = defs.map((def, i) => makeRider(def, i));
    const me = riders.find((r) => r.me);
    const partner = riders.find((r) => r.real && !r.me);

    function helmet(kid, color) {
      // Hide the hair the helmet covers so nothing pokes through it
      const HC = new THREE.Vector3(0, 0.29, 0);
      const hairColor = new THREE.Color(kid.look.hair);
      for (const o of kid.head.children) {
        if (!o.isMesh || !o.material.map || !o.material.color?.equals(hairColor)) continue;
        const prm = o.geometry.parameters || {};
        const rel = o.position.clone().sub(HC);
        const isCap = rel.length() < 1e-3 && prm.thetaStart === 0;
        const onTop = rel.length() > 1e-3 && rel.y > 0.14 && (rel.z < 0.2 || rel.y > 0.21);
        if (isCap || onTop) o.visible = false;
      }
      const h = new THREE.Group();
      h.position.copy(HC);
      const R = 0.39;
      const th = Math.PI * 0.45;
      const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 10, 0, Math.PI * 2, 0, th), mat(color, { rough: 0.45 }));
      shell.scale.set(1, 0.92, 1.02);
      shell.position.y = 0.0;
      shell.castShadow = true;
      const rimR = R * Math.sin(th);
      const rimY = R * 0.92 * Math.cos(th);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(rimR, 0.024, 6, 28), mat('#fffaf4', { rough: 0.5 }));
      rim.rotation.x = Math.PI / 2;
      rim.scale.set(1, 1.02, 1);
      rim.position.y = rimY;
      // A short peak at the front: a ring sector from the rim outwards, drooping a little
      const peakGeo = new THREE.RingGeometry(rimR - 0.02, rimR + 0.11, 18, 1, -Math.PI / 2 - 0.75, 1.5);
      peakGeo.rotateX(-Math.PI / 2);
      const pp = peakGeo.attributes.position;
      for (let i = 0; i < pp.count; i++) {
        const r = Math.hypot(pp.getX(i), pp.getZ(i));
        pp.setY(i, -Math.max(0, r - (rimR - 0.02)) * 0.5);
      }
      peakGeo.computeVertexNormals();
      const brim = new THREE.Mesh(peakGeo, mat(color, { rough: 0.45, side: THREE.DoubleSide }));
      brim.position.set(0, rimY, 0);
      const pom = K.ball(0.065, '#fffaf4', {}, 10);
      pom.position.y = R * 0.92 + 0.03;
      h.add(shell, rim, brim, pom);
      h.rotation.x = -0.32;
      brim.castShadow = true;
      kid.head.add(h);
    }

    function makeRider(def, i) {
      const pony = newPony(def.coat);
      pony.root.traverse((o) => {
        if (o.isMesh && o.material.color?.getHexString() === 'c0392b') o.material = mat(def.color, { rough: 0.6 });
      });
      pony.root.rotation.order = 'YXZ';
      K.bakePony(pony);
      scene.add(pony.root);
      const kid = ctx.makeKid(def.real ? def.who : def.look);
      helmet(kid, def.color);
      kid.pose = 'ride';
      pony.root.add(kid.root);
      kid.root.position.set(0, 1.1, -0.02);
      if (!def.real) {
        kid.update(0.016, 0, 0, 0, 0);
        kid.head.rotation.set(-0.05, 0, 0);
        K.bakeKid(kid);
      } else K.bakeLiveKid(kid);
      const r = {
        def,
        i,
        name: def.name,
        color: def.color,
        me: !!def.me,
        real: !!def.real,
        ai: !def.me,
        pony,
        kid,
        p: -6,
        s: T.mod(-6),
        d: def.lane,
        laneT: def.lane,
        laneCd: 0,
        v: 0,
        x: 0,
        z: 0,
        yaw: T.yaw(-6),
        y: 0,
        vy: 0,
        turn: 0,
        pitch: 0,
        stamina: 1,
        tired: false,
        sprint: false,
        boost: 0,
        stumble: 0,
        nextOb: 0,
        water: null,
        plan: -1,
        takeoff: 0,
        finished: false,
        place: 0,
        time: 0,
        clean: 0,
        hits: 0,
        phase: i * 1.3,
        hint: -1,
        seed: i * 2.1,
        clop: 0,
      };
      const p = T.at(r.p, r.d);
      r.x = p.x;
      r.z = p.z;
      return r;
    }

    // Spectators on the grandstand and by the flower beds
    const fanR = (() => {
      let a = 99;
      return () => ((a = (a * 16807) % 2147483647) / 2147483647);
    })();
    const fans = [];
    const kinds = ['cheer', 'wave', 'flag', 'clap', 'cheer', 'flag'];
    const flagCols = ['#ffd166', '#ef5b6f', '#6fb8ff', '#7fd3a7', '#ff9eb5'];
    let fi = 0;
    for (let k = 0; k < 3; k++) {
      const n = 6 - (k === 2 ? 1 : 0);
      for (let j = 0; j < n; j++) {
        const kid = ctx.makeKid(K.randomLook(fanR, fi));
        const x = -16 + (32 / (n - 1)) * j + (fanR() - 0.5) * 2;
        kid.root.position.set(x, 0.45 * (k + 1) + 0.05, 29.4 + 0.65 + k * 1.6);
        kid.root.rotation.y = Math.PI + (fanR() - 0.5) * 0.4;
        K.poseFan(kid, kinds[fi % kinds.length], flagCols[fi % flagCols.length]);
        fans.push({ kid });
        fi++;
      }
    }
    for (const [x, z] of [[-22, 15.6], [-16, 15.9], [20, 15.7], [26, 15.9]]) {
      const kid = ctx.makeKid(K.randomLook(fanR, fi));
      kid.root.position.set(x, 0, z);
      kid.root.rotation.y = 0.1;
      K.poseFan(kid, kinds[fi % kinds.length], flagCols[fi % flagCols.length]);
      fans.push({ kid });
      fi++;
    }
    const crowd = K.makeCrowd(fans);
    scene.add(crowd.mesh);

    // ---------------------------------------------------------------- HUD
    const ui = K.overlay(
      CSS,
      `<div class="rr-stam"><span>Sprint</span><i><b></b></i></div>
       <canvas class="rr-map"></canvas>
       <div class="rr-pop"></div>
       <div class="rr-chip">Jump!</div>
       ${riders.filter((r) => !r.me).map((r) => `<div class="rr-tag" style="background:${r.color}">${r.name}</div>`).join('')}`,
    );
    const pop = K.popper(ui.$('.rr-pop'));
    const stamEl = ui.$('.rr-stam');
    const stamBar = ui.$('.rr-stam b');
    const chip = ui.$('.rr-chip');
    const mapCv = ui.$('.rr-map');
    const tags = [...ui.el.querySelectorAll('.rr-tag')];
    riders.filter((r) => !r.me).forEach((r, k) => (r.tag = tags[k]));
    hud.buttons({ action: 'Sprint', jump: 'Jump' });
    hud.hint('Arrows or WASD to ride, hold up to gallop, Shift to sprint, Space to jump');

    // Mini map of the track
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < T.N; i++) {
      x0 = Math.min(x0, T.px[i]);
      x1 = Math.max(x1, T.px[i]);
      z0 = Math.min(z0, T.pz[i]);
      z1 = Math.max(z1, T.pz[i]);
    }
    function drawMap() {
      const w = mapCv.clientWidth;
      const h = mapCv.clientHeight;
      if (!w) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (mapCv.width !== Math.round(w * dpr)) {
        mapCv.width = Math.round(w * dpr);
        mapCv.height = Math.round(h * dpr);
      }
      const c = mapCv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);
      const pad = 12;
      const k = Math.min((w - pad * 2) / (x1 - x0), (h - pad * 2) / (z1 - z0));
      const ox = (w - (x1 - x0) * k) / 2;
      const oz = (h - (z1 - z0) * k) / 2;
      const X = (x) => ox + (x - x0) * k;
      const Z = (z) => oz + (z - z0) * k;
      c.lineJoin = 'round';
      c.beginPath();
      for (let i = 0; i <= T.N; i += 6) {
        const j = i % T.N;
        if (i === 0) c.moveTo(X(T.px[j]), Z(T.pz[j]));
        else c.lineTo(X(T.px[j]), Z(T.pz[j]));
      }
      c.closePath();
      c.strokeStyle = '#e6c58f';
      c.lineWidth = 7;
      c.stroke();
      c.strokeStyle = '#fffaf4';
      c.lineWidth = 1.5;
      c.stroke();
      for (const o of course.obs) {
        const p = T.at(o.s, 0);
        c.fillStyle = o.kind === 'water' ? '#4fa8d8' : '#ef5b6f';
        c.fillRect(X(p.x) - 2, Z(p.z) - 2, 4, 4);
      }
      const f = T.at(0, 0);
      c.fillStyle = '#3b2b3f';
      c.fillRect(X(f.x) - 1, Z(f.z) - 5, 2, 10);
      for (const r of [...riders].sort((a, b) => a.me - b.me)) {
        c.beginPath();
        c.arc(X(r.x), Z(r.z), r.me ? 5 : 3.6, 0, Math.PI * 2);
        c.fillStyle = r.color;
        c.fill();
        c.lineWidth = r.me ? 2.2 : 1.2;
        c.strokeStyle = '#ffffff';
        c.stroke();
      }
    }

    // ---------------------------------------------------------------- race state
    const obsList = [];
    for (let lap = 0; lap < LAPS; lap++) for (const o of course.obs) obsList.push({ p: lap * L + o.s, o });
    let phase = 'intro'; // intro | race | done
    let raceT = 0;
    let introT = 0;
    let finishCount = 0;
    let endTimer = -1;
    let ribbon = 'hidden'; // hidden | up | broken
    let ribbonT = 0;
    let disposed = false;
    let cheerCd = 0;
    let lastScore = '';
    let wrongT = 0;
    const camPos = new THREE.Vector3();
    const camLook = new THREE.Vector3();
    let camYaw = me.yaw;
    let doneT = 0;
    const doneFrom = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const dbg = { fast: 1, auto: false, riders, T, obs: course.obs, get phase() { return phase; }, get raceT() { return raceT; }, L };
    window.__riding = dbg;

    const near = (r) => Math.hypot(r.x - me.x, r.z - me.z) < 26;
    const ideal = (o, v) => (o.kind === 'hurdle' ? v * 0.27 : Math.max(v * 0.08, (v * T_AIR - o.len) * 0.5));

    function clean(r) {
      r.boost = 1.1;
      r.clean++;
      if (r.me) {
        pop('Clean jump!', '#fff6c8');
        sound.ui('coin');
        fx.burst(tmp.set(r.x, 2.2, r.z), ['#ffd166', '#fff6c8'], 12);
      }
    }
    function hit(r, ob) {
      r.v *= 0.5;
      r.stumble = 0.7;
      r.hits++;
      ob.o.wobble = 1;
      if (near(r)) K.sfx.knock(sound);
      if (r.me) {
        pop('Oops! Bumped the pole', '#ffe1e6');
        r.kid.squash = 0.85;
      }
    }
    function splash(r) {
      r.v *= 0.55;
      r.stumble = 0.6;
      r.hits++;
      fx.burst(tmp.set(r.x, 0.35, r.z), ['#7fc8e8', '#ffffff', '#bfeaff'], 40);
      if (near(r)) K.sfx.splash(sound);
      if (r.me) pop('Splash!', '#dff6ff');
    }

    function finishRider(r) {
      r.finished = true;
      r.place = ++finishCount;
      r.time = raceT;
      if (r.place === 1) {
        ribbon = 'broken';
        ribbonT = 0;
        fx.burst(T.at(0, 0, new THREE.Vector3()).setY(1.6), ['#ff7fa3', '#ffd166', '#ffffff', '#7fd3a7', '#6fb8ff'], 90);
        crowd.cheer(1);
        K.sfx.cheer(sound, 0.08, 2);
      }
      if (r.me) {
        endTimer = 2.6;
        phase = 'done';
        doneT = 0;
        doneFrom.copy(camPos);
        if (r.place === 1) fx.heartsAt(tmp.set(r.x, 2.6, r.z), 6);
        sound.ui(r.place === 1 ? 'win' : 'good');
        pop(r.place === 1 ? 'You win!' : `${K.ord(r.place)} place`, '#fff6c8', 1800);
      }
    }

    function forceFinish() {
      const rest = riders.filter((r) => !r.finished).sort((a, b) => b.p - a.p);
      for (const r of rest) finishRider(r);
    }

    // ---------------------------------------------------------------- control
    function autopilot(r) {
      const ty = T.yaw(r.s);
      let diff = ty - r.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const sx = clamp(-diff * 3 - (0.6 - r.d) * 0.2, -1, 1);
      const nx = obsList[r.nextOb];
      const jump = !!nx && nx.p - r.p <= ideal(nx.o, r.v) && nx.p - r.p > 0;
      return { sx: Math.abs(sx) < 0.13 ? 0 : sx, fy: 1, sprint: r.stamina > 0.35, jump };
    }

    function controlPlayer(r, dt) {
      const ax = input.axis();
      let sx = ax.x;
      let fy = ax.y;
      let wantSprint = input.held('shift') || input.held('action');
      let jump = input.pressed('jump');
      if (dbg.auto) ({ sx, fy, sprint: wantSprint, jump } = autopilot(r));
      if (r.finished) {
        sx = 0;
        fy = 0;
        wantSprint = false;
        jump = false;
      }
      const ty = T.yaw(r.s);
      const steer = Math.abs(sx) > 0.12 ? sx : 0;
      if (steer) r.yaw -= steer * TURN * dt * (0.55 + 0.45 * Math.min(1, r.v / 6));
      else r.yaw = dampAngle(r.yaw, ty, 2.6, dt);
      r.turn = -steer * TURN;
      if (jump && r.y <= 0 && r.vy <= 0) {
        r.vy = JUMP_V;
        sound.jump();
        r.kid.squash = 1.15;
      }
      r.sprint = wantSprint && !r.tired && r.stamina > 0.01 && fy > -0.3;
      let target = r.sprint ? SPRINT : fy > 0.25 ? GALLOP : fy < -0.3 ? 0 : TROT;
      if (r.finished) target = raceT - r.time < 4 ? 2.4 : 0; // trot on past the line, then stop before the first hurdle
      if (r.boost > 0) target += BOOST;
      if (r.stumble > 0) target *= 0.45;
      r.v = damp(r.v, target, r.v < target ? 1.25 : 2.4, dt);
      r.x += Math.sin(r.yaw) * r.v * dt;
      r.z += Math.cos(r.yaw) * r.v * dt;
      const pr = T.project(r.x, r.z, r.hint);
      r.hint = pr.i;
      let delta = pr.s - r.s;
      if (delta < -L / 2) delta += L;
      if (delta > L / 2) delta -= L;
      r.p += delta;
      r.s = pr.s;
      r.d = pr.d;
      if (Math.abs(r.d) > LIM) {
        r.d = Math.sign(r.d) * LIM;
        r.v *= 1 - 1.6 * dt;
        r.yaw = dampAngle(r.yaw, ty, 5, dt);
        r.railCd = (r.railCd || 0) - dt;
        if (r.railCd <= 0 && r.v > 3) {
          K.sfx.knock(sound);
          fx.puff(tmp.set(r.x, 0.1, r.z));
          r.railCd = 0.7;
        }
      }
      if (r.finished) {
        // Ease over to the inner half of the track, so no one rides between the rider and the finish camera
        const prevD = r.d;
        r.d = damp(r.d, 1.6, 1.4, dt);
        r.yaw = ty + Math.atan2((r.d - prevD) / Math.max(dt, 1e-3), Math.max(2, r.v));
      }
      const p = T.at(r.s, r.d, tmp);
      r.x = p.x;
      r.z = p.z;
      // Wrong way
      const fwd = Math.sin(r.yaw) * Math.sin(ty) + Math.cos(r.yaw) * Math.cos(ty);
      wrongT = fwd < -0.2 && r.v > 1.5 ? wrongT + dt : 0;
      if (wrongT > 0.8) {
        pop('Wrong way! Turn around', '#ffe1e6', 1200);
        wrongT = -1.5;
      }
    }

    function controlAI(r, dt, t) {
      let target = r.def.base * (1 + 0.025 * Math.sin(t * 0.37 + r.seed));
      const gap = r.p - me.p;
      if (!me.finished) {
        if (gap > 8) target -= Math.min(1.4, (gap - 8) * 0.08);
        if (gap < -12) target += Math.min(1.1, (-gap - 12) * 0.05);
      }
      const straight = Math.abs(T.bend(r.s + 10)) < 0.012;
      const end = r.p > LAPS * L - 110;
      if (!r.tired && r.stamina > (end ? 0.05 : 0.6) && (straight || end)) r.sprint = true;
      else if (r.tired || (!straight && !end)) r.sprint = false;
      if (r.sprint) target += 2.0;
      if (r.finished) target = raceT - r.time < 2.5 ? 4 : 0; // stop before the first hurdle
      if (r.boost > 0) target += BOOST;
      if (r.stumble > 0) target *= 0.45;
      // Pass slower riders ahead
      r.laneCd -= dt;
      for (const o of riders) {
        if (o === r) continue;
        const dp = o.p - r.p;
        if (dp > 0 && dp < 5 && Math.abs(o.d - r.laneT) < 1.2 && o.v < target - 0.3 && r.laneCd <= 0) {
          const left = o.d + 1.7;
          const right = o.d - 1.7;
          const canL = left < LIM - 0.2;
          const canR = right > -LIM + 0.2;
          r.laneT = canL && (!canR || Math.random() < 0.5) ? left : canR ? right : r.laneT;
          r.laneCd = 1.6;
        }
      }
      if (r.finished) r.laneT = -(LIM - 0.6); // clear the inner half for the finish camera
      const prevD = r.d;
      r.d = clamp(damp(r.d, r.laneT, 1.3, dt), -LIM, LIM);
      r.v = damp(r.v, target, r.v < target ? 1.1 : 2.0, dt);
      r.p += r.v * dt;
      r.s = T.mod(r.p);
      const vd = (r.d - prevD) / Math.max(dt, 1e-3);
      r.yaw = T.yaw(r.s) + Math.atan2(vd, Math.max(2, r.v));
      r.turn = T.bend(r.s) * r.v;
      // Plan the next jump
      const nx = obsList[r.nextOb];
      if (nx && !r.finished) {
        const D = nx.p - r.p;
        if (r.plan !== r.nextOb && D < 14) {
          r.plan = r.nextOb;
          const best = ideal(nx.o, r.v);
          const miss = Math.random() < r.def.miss;
          r.takeoff = miss ? (Math.random() < 0.5 ? r.v * 0.01 : best + r.v * 0.6) : best * (0.85 + Math.random() * 0.3);
        }
        if (r.plan === r.nextOb && D <= r.takeoff && r.y <= 0 && r.vy <= 0) r.vy = JUMP_V;
      }
      const p = T.at(r.s, r.d, tmp);
      r.x = p.x;
      r.z = p.z;
    }

    // ---------------------------------------------------------------- simulation step
    function step(dt, t) {
      if (phase === 'race' || phase === 'done') raceT += dt;
      if (phase === 'intro') introT += dt;
      const live = phase !== 'intro';
      for (const r of riders) {
        if (live) {
          if (r.me) controlPlayer(r, dt);
          else controlAI(r, dt, t);
        }
        // Air
        if (r.y > 0 || r.vy > 0) {
          r.vy -= G * dt;
          r.y += r.vy * dt;
          if (r.y <= 0) {
            r.y = 0;
            r.vy = 0;
            if (near(r)) fx.puff(tmp.set(r.x, 0.05, r.z));
            if (r.me) sound.land();
          }
        }
        // Stamina
        if (r.sprint) {
          r.stamina -= dt * (r.me ? 0.29 : 0.3);
          if (r.stamina <= 0) {
            r.stamina = 0;
            r.tired = true;
            r.sprint = false;
          }
        } else r.stamina = Math.min(1, r.stamina + dt * (r.me ? (r.v < 6 ? 0.2 : 0.135) : 0.1));
        if (r.tired && r.stamina > 0.3) r.tired = false;
        r.boost -= dt;
        r.stumble -= dt;
        // Jumps
        const nx = obsList[r.nextOb];
        if (nx && r.p >= nx.p) {
          r.nextOb++;
          if (nx.o.kind === 'hurdle') {
            if (r.y >= 0.3) clean(r);
            else hit(r, nx);
          } else if (r.y >= 0.18) r.water = nx;
          else splash(r);
        }
        if (r.water) {
          if (r.p >= r.water.p + r.water.o.len + 0.3) {
            clean(r);
            r.water = null;
          } else if (r.y <= 0.001 && r.p > r.water.p + 0.4) {
            splash(r);
            r.water = null;
          }
        }
        if (!r.finished && r.p >= LAPS * L) finishRider(r);
      }
      // Keep ponies from overlapping
      for (let i = 0; i < riders.length; i++) {
        for (let j = i + 1; j < riders.length; j++) {
          const a = riders[i];
          const b = riders[j];
          const dp = b.p - a.p;
          if (Math.abs(dp) > 1.9) continue;
          const dd = b.d - a.d;
          if (Math.abs(dd) > 0.95) continue;
          const push = (0.95 - Math.abs(dd)) * 0.5 * (Math.sign(dd) || 1);
          a.d = clamp(a.d - push, -LIM, LIM);
          b.d = clamp(b.d + push, -LIM, LIM);
          if (Math.abs(dd) < 0.6) {
            const back = dp > 0 ? a : b;
            const front = dp > 0 ? b : a;
            back.v = Math.min(back.v, front.v + 0.2);
          }
          for (const r of [a, b]) {
            if (!r.me) continue;
            const p = T.at(r.s, r.d, tmp);
            r.x = p.x;
            r.z = p.z;
          }
        }
      }
      // Ribbon goes up when the leader starts the last lap
      const lead = Math.max(...riders.map((r) => r.p));
      if (ribbon === 'hidden' && lead > (LAPS - 1) * L + 25) {
        ribbon = 'up';
        ribbonT = 0;
      }
      ribbonT += dt;
      if (live && raceT > TIME_CAP && !me.finished) forceFinish();
      if (endTimer > 0) {
        endTimer -= dt;
        if (endTimer <= 0) showResult();
      }
      if (phase === 'done') doneT += dt;
      cheerCd -= dt;
    }

    function showResult() {
      const place = me.place;
      const total = me.clean + me.hits;
      const time = me.time.toFixed(1);
      const winner = riders.find((r) => r.place === 1);
      let text;
      if (place === 1) {
        const best = ctx.load('best', null);
        const isBest = !best || me.time < best;
        if (isBest) ctx.save('best', me.time);
        text = `First over the line in ${time} s${isBest ? ', a new best' : ''}. Clean jumps: ${me.clean} of ${total}.`;
        text += partner.place === 2 ? ` ${partnerName} came second and cheered for you.` : ` ${partnerName} waved from the saddle.`;
      } else {
        text = `${winner.me ? meName : winner.name} won this time. You came ${K.ord(place)} in ${time} s with ${me.clean} of ${total} clean jumps. Sprint on the straights and jump at the yellow arrows.`;
      }
      ctx.finish({ win: place === 1, title: place === 1 ? `${meName} wins the Meadow Cup!` : `${K.ord(place)} place`, text });
    }

    // ---------------------------------------------------------------- visuals
    function poseRider(r, dt, t) {
      const p = r.pony;
      const v = r.v;
      p.animate(dt, phase === 'intro' ? 0.35 : v);
      r.phase += dt * (3 + v * 1.6);
      const air = r.y > 0.02;
      if (air) {
        p.legs[0].rotation.x = p.legs[1].rotation.x = -1.05;
        p.legs[2].rotation.x = p.legs[3].rotation.x = 0.95;
      }
      const bob = air ? 0 : Math.abs(Math.sin(r.phase)) * 0.06 * Math.min(1, v / 7);
      const pitchT = air ? clamp(-r.vy * 0.06, -0.35, 0.3) : r.stumble > 0 ? Math.sin(r.stumble * 22) * 0.1 : 0;
      r.pitch = damp(r.pitch, pitchT, 12, dt);
      p.root.position.set(r.x, r.y + bob, r.z);
      p.root.rotation.set(r.pitch, r.yaw, clamp(-r.turn * 0.05, -0.18, 0.18));
      if (r.real) {
        r.kid.update(dt, t, v, 0, r.turn);
        r.kid.root.position.y = 1.1 + (air ? 0.05 : Math.abs(Math.sin(r.phase + 0.8)) * 0.05 * Math.min(1, v / 7));
        if (r.finished && r.place <= 3 && raceT - r.time < 6) {
          const [A, B] = r.kid.arms;
          A.rotation.set(-0.3, 0, 2.4 + Math.sin(t * 11) * 0.2);
          B.rotation.set(-0.3, 0, -2.4 - Math.sin(t * 11 + 1) * 0.2);
        }
      }
      if (r.me && !air && v > 1) {
        const beat = Math.floor(r.phase / Math.PI);
        if (beat !== r.clop) {
          r.clop = beat;
          K.sfx.hoof(sound, 0.03 + Math.min(0.03, v * 0.003));
        }
        if (v > 7 && Math.random() < dt * 5) fx.puff(tmp.set(r.x - Math.sin(r.yaw) * 0.8, 0.05, r.z - Math.cos(r.yaw) * 0.8));
      }
    }

    function updateScenery(dt, t) {
      crowd.update(dt, t);
      course.stand.flags.forEach((f, k) => (f.rotation.y = Math.sin(t * 2.4 + k) * 0.35 + Math.sin(t * 5.3 + k * 2) * 0.08));
      course.poleFlags.forEach((f, k) => (f.rotation.y = -0.6 + Math.sin(t * 2.1 + k * 1.7) * 0.3));
      course.stand.syncFlags();
      course.syncPoleFlags();
      for (const o of course.obs) {
        if (o.pole) {
          o.wobble = Math.max(0, o.wobble - dt * 1.4);
          o.pole.rotation.x = Math.sin(t * 28) * 0.22 * o.wobble;
          o.pole.position.y = 0.52 + Math.abs(Math.sin(t * 20)) * 0.08 * o.wobble;
        }
        if (o.ripples) o.ripples.forEach((rp, k) => rp.scale.setScalar(1 + 0.18 * Math.sin(t * 2 + k * 2)));
      }
      const w = course.water;
      for (const d of w.ducks) {
        d.a += dt * 0.22;
        const x = w.cx + Math.cos(d.a) * w.rx * d.r;
        const z = w.cz + Math.sin(d.a) * w.rz * d.r;
        d.g.position.set(x, 0.04 + Math.sin(t * 3 + d.a) * 0.015, z);
        d.g.rotation.y = Math.atan2(-Math.sin(d.a) * w.rx, Math.cos(d.a) * w.rz);
      }
      // Ribbon
      const halves = course.finish.halves;
      for (const h of halves) {
        h.pivot.visible = ribbon !== 'hidden';
        if (ribbon === 'up') {
          const k = easeOutBack(clamp(ribbonT / 0.6, 0, 1));
          h.pivot.scale.set(1, Math.max(0.01, k), 1);
          h.pivot.rotation.set(0, 0, 0);
        } else if (ribbon === 'broken') {
          const k = clamp(ribbonT / 0.7, 0, 1);
          h.pivot.rotation.y = -h.side * k * 1.35;
          h.pivot.rotation.z = h.side * k * 0.5;
        }
      }
      // Crowd cheers when the player rides past the stand
      if (me.x > -20 && me.x < 22 && me.z > 18 && cheerCd <= 0 && phase === 'race') {
        crowd.cheer(0.7);
        K.sfx.cheer(sound, 0.05, 1.3);
        cheerCd = 6;
      }
    }

    function updateCamera(dt) {
      const wide = camera.aspect > 1.9;
      const dist = wide ? 6.6 : 7.3;
      const high = wide ? 3.0 : 3.4;
      camYaw = dampAngle(camYaw, me.yaw, 3.2, dt);
      const chasePos = tmp.set(me.x - Math.sin(camYaw) * dist, high + me.y * 0.45, me.z - Math.cos(camYaw) * dist);
      const chaseLook = new THREE.Vector3(me.x + Math.sin(me.yaw) * 4, 1.25 + me.y * 0.4, me.z + Math.cos(me.yaw) * 4);
      if (phase === 'intro' || raceT < 1.4) {
        const sp = T.at(-6 + 13 - Math.min(introT, 6) * 0.3, 3.5 - Math.min(introT, 6) * 0.25);
        const ip = new THREE.Vector3(sp.x, 2.6, sp.z);
        const il = T.at(-6, 0).setY(1.3);
        const k = phase === 'intro' ? 0 : easeInOut(clamp(raceT / 1.4, 0, 1));
        camPos.lerpVectors(ip, chasePos, k);
        camPos.y += Math.sin(k * Math.PI) * 3.2; // swing up over the riders, not through them
        camLook.lerpVectors(il, chaseLook, k);
      } else if (phase === 'done') {
        // Swing past to the front of the rider, near the inner rail, to see their happy face
        const k = easeInOut(clamp(doneT / 2.2, 0, 1));
        // high enough that riders still crossing the line pass under the view
        const front = T.at(me.s + 5.8 + Math.min(doneT, 6) * 0.15, LIM + 0.15);
        camPos.lerpVectors(doneFrom, front.setY(3.3), k); // stays under the finish banner's bunting
        camLook.lerp(new THREE.Vector3(me.x, 2.0 + me.y, me.z), 1 - Math.exp(-4 * dt));
      } else {
        camPos.lerp(chasePos, 1 - Math.exp(-7 * dt));
        camLook.lerp(chaseLook, 1 - Math.exp(-9 * dt));
      }
      camera.position.copy(camPos);
      camera.lookAt(camLook);
      if (dbg.camAt) {
        camera.position.set(...dbg.camAt.p);
        camera.lookAt(...dbg.camAt.l);
      } else if (dbg.cam) {
        const r = riders[dbg.cam.rider ?? 1];
        const a = r.yaw + (dbg.cam.a ?? 0);
        camera.position.set(r.x + Math.sin(a) * (dbg.cam.d ?? 2.5), (dbg.cam.y ?? 2.2) + r.y, r.z + Math.cos(a) * (dbg.cam.d ?? 2.5));
        camera.lookAt(r.x, 1.9 + r.y, r.z);
      }
      camera.updateMatrixWorld();
      env.follow(tmp.set(me.x, 0, me.z));
    }

    function updateHud() {
      const order = [...riders].sort((a, b) => (a.finished && b.finished ? a.place - b.place : a.finished ? -1 : b.finished ? 1 : b.p - a.p));
      const place = order.indexOf(me) + 1;
      const lap = clamp(Math.floor(me.p / L) + 1, 1, LAPS);
      const s = phase === 'intro' ? `Lap 1 / ${LAPS}` : `Lap ${lap} / ${LAPS} &nbsp; <b style="color:${me.color}">${K.ord(me.finished ? me.place : place)}</b>`;
      if (s !== lastScore) {
        hud.score(s);
        lastScore = s;
      }
      stamBar.style.transform = `scaleX(${me.stamina.toFixed(3)})`;
      stamEl.classList.toggle('tired', me.tired);
      stamEl.classList.toggle('go', me.sprint);
      // Jump cue above the rider
      const nx = obsList[me.nextOb];
      let cue = false;
      if (nx && phase === 'race' && me.y <= 0) {
        const D = nx.p - me.p;
        const far = nx.o.kind === 'hurdle' ? 4.2 : 3.6;
        cue = D > 0.6 && D < far;
      }
      chip.classList.toggle('on', cue);
      K.hotButton('jump', cue);
      if (cue) {
        const hp = me.kid.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.0, 0)).project(camera);
        chip.style.left = `${((hp.x + 1) / 2) * 100}%`;
        chip.style.top = `${((1 - hp.y) / 2) * 100}%`;
      }
      // Name tags over the rivals
      const v = new THREE.Vector3();
      for (const r of riders) {
        if (!r.tag) continue;
        const dist = Math.hypot(r.x - camera.position.x, r.z - camera.position.z);
        r.kid.head.getWorldPosition(v).add(new THREE.Vector3(0, 0.95, 0)).project(camera);
        const show = phase === 'race' && v.z < 1 && dist < 38 && dist > 2.5 && Math.abs(v.x) < 1.1;
        r.tag.style.display = show ? 'block' : 'none';
        if (show) {
          r.tag.style.left = `${((v.x + 1) / 2) * 100}%`;
          r.tag.style.top = `${((1 - v.y) / 2) * 100}%`;
          r.tag.style.opacity = String(clamp((38 - dist) / 10, 0, 1));
        }
      }
      drawMap();
    }

    // ---------------------------------------------------------------- start
    for (const r of riders) poseRider(r, 0.016, 0);
    updateCamera(1);
    (async () => {
      await new Promise((res) => setTimeout(res, 700));
      if (disposed) return;
      hud.message('Meadow Cup', 1100);
      await new Promise((res) => setTimeout(res, 1300));
      if (disposed) return;
      await hud.countdown(3);
      if (disposed) return;
      phase = 'race';
      raceT = 0;
      crowd.cheer(0.8);
      K.sfx.cheer(sound, 0.06, 1.5);
    })();

    return {
      update(dt, t) {
        const n = clamp(Math.round(dbg.fast) || 1, 1, 24);
        for (let k = 0; k < n; k++) step(dt, t + k * dt);
        for (const r of riders) poseRider(r, dt, t);
        updateScenery(dt, t);
        updateCamera(dt);
        updateHud();
      },
      dispose() {
        disposed = true;
        ui.remove();
        if (window.__riding === dbg) delete window.__riding;
      },
    };
  },
};
