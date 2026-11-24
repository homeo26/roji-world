import * as THREE from 'three';
import { Giraffe, JODI, JOURI } from '../places/zoo/giraffe.js';
import { makeCrown } from '../places/zoo/extras.js';
import { buildSet, PLAY, WALK, SQUIRREL, JUDGE, leafGeometry, carrotGeometry, goldGeometry, coneGeometry, makeSquirrel, makeBranch, makeCard, arrowMesh } from './giraffes/set.js';

// Leaf Catch: ride Jouri under the great acacia and catch the leaves that fall, the carrots your partner
// throws from the tree walk and the odd golden leaf. Every round adds something: wind, a squirrel with
// pine cones, a low swinging branch, and finally Jouri's own silliness. Jodi grades each round out of ten.

const ROUND_TIME = 20;
const ROUNDS = [
  { title: 'Breakfast time', hint: 'Catch the leaves and carrots', rate: 1.2, carrot: 3.2, cone: 0, wind: 0, gold: 0, branch: 0 },
  { title: 'A windy morning', hint: 'The wind blows the leaves about', rate: 1.3, carrot: 3.0, cone: 0, wind: 1.4, gold: 1, branch: 0 },
  { title: 'Pine cone trouble', hint: 'Dodge the squirrel\'s pine cones', rate: 1.4, carrot: 3.0, cone: 2.6, wind: 0.5, gold: 1, branch: 0 },
  { title: 'The low branch', hint: 'Duck under the branch', rate: 1.5, carrot: 2.8, cone: 3.4, wind: 0.4, gold: 1, branch: 5.2 },
  { title: 'Jouri\'s silly round', hint: '', rate: 1.65, carrot: 2.6, cone: 3.0, wind: 0.9, gold: 2, branch: 6.5, silly: true },
];
const POINTS = { leaf: 1, carrot: 2, gold: 5 };
const LINES = [
  [10, 'Ten. Jodi almost smiles.'],
  [8, 'Very neat.'],
  [6, 'Acceptable.'],
  [4, 'Jodi adjusts her bow tie.'],
  [0, 'Jodi sighs. Again, please.'],
];
const MIDI = (n) => 440 * Math.pow(2, (n - 69) / 12);

export default {
  id: 'giraffes',
  title: 'Leaf Catch',
  tagline: 'Ride Jouri, catch the treats, impress Jodi',

  async start(ctx) {
    const { scene, camera, util, hud, input, sound, fx } = ctx;
    const { damp, dampAngle, clamp, lerp } = util;
    const env = ctx.env.outdoor({ sky: '#bfe8ee', fog: [34, 110], sun: [-9, 22, 13], shadow: 16 });
    buildSet(scene);
    const meName = ctx.looks[ctx.me]?.name || 'Roji';
    const partnerName = ctx.looks[ctx.partner]?.name || 'Homama';

    // ---------------------------------------------------------------- sound
    const tone = (f, d, dur, o) => {
      const c = sound?.ctx;
      if (!c || sound.muted) return;
      sound.tone(f, c.currentTime + d, dur, o);
    };
    const sfx = {
      munch: () => [0, 0.1].forEach((d) => tone(200 + Math.random() * 40, d, 0.06, { type: 'square', gain: 0.03, slideTo: 120 })),
      carrot: () => [0, 0.07, 0.14].forEach((d) => tone(160, d, 0.05, { type: 'square', gain: 0.035, slideTo: 90 })),
      gold: () => [76, 79, 84, 88].forEach((n, i) => tone(MIDI(n), i * 0.06, 0.4, { type: 'triangle', gain: 0.05 })),
      bonk: () => {
        tone(220, 0, 0.18, { type: 'square', gain: 0.05, slideTo: 90 });
        tone(880, 0.05, 0.3, { gain: 0.03, slideTo: 660 });
      },
      miss: () => tone(300, 0, 0.12, { type: 'triangle', gain: 0.025, slideTo: 200 }),
      hop: () => tone(280, 0, 0.18, { gain: 0.05, slideTo: 620 }),
      hic: () => tone(700, 0, 0.09, { type: 'triangle', gain: 0.05, slideTo: 1100 }),
      chitter: () => [0, 0.06, 0.12].forEach((d) => tone(1400 + Math.random() * 300, d, 0.04, { type: 'square', gain: 0.015 })),
      whoosh: () => tone(500, 0, 0.6, { type: 'sawtooth', gain: 0.012, slideTo: 200, attack: 0.15 }),
      hum: () => {
        tone(196, 0, 0.55, { gain: 0.07, slideTo: 174 });
        tone(98, 0.02, 0.6, { type: 'triangle', gain: 0.04 });
      },
      giggle: () => [0, 0.09, 0.18].forEach((d, i) => tone(640 + i * 90, d, 0.08, { type: 'triangle', gain: 0.05, slideTo: 780 + i * 90 })),
    };

    // ---------------------------------------------------------------- the giraffes and the kids
    const bounds = { x0: -20, x1: 20, z0: -20, z1: 20 };
    const jouri = new Giraffe(JOURI, { home: { x: 0, z: PLAY.z, yaw: 0 }, bounds, obstacles: [] });
    const jodi = new Giraffe(JODI, { home: { x: JUDGE.x, z: JUDGE.z, yaw: -0.55 }, bounds, obstacles: [] });
    scene.add(jouri.holder, jodi.holder);
    jouri.manual = { speed: 0 };
    jodi.manual = { speed: 0 };
    if (ctx.load('crown', false)) {
      const crown = makeCrown();
      crown.position.set(0, 0.38, -0.03);
      jouri.head.add(crown);
    }
    const rider = ctx.makeKid(ctx.me);
    rider.pose = 'ride';
    rider.root.position.set(0, 0.4, -0.22);
    jouri.body.add(rider.root);
    const mate = ctx.makeKid(ctx.partner);
    scene.add(mate.root);
    const mp = { x: 0, want: 0, speed: 0, yaw: 0, throwT: 0 };
    mate.root.position.set(0, WALK.y, WALK.z);
    const squirrel = makeSquirrel();
    squirrel.root.position.set(SQUIRREL.x, SQUIRREL.y, SQUIRREL.z);
    squirrel.root.rotation.y = -0.6;
    squirrel.root.visible = false;
    scene.add(squirrel.root);
    const card = makeCard();
    card.root.position.set(0, -0.12, 0.47);
    card.root.scale.setScalar(0);
    jodi.head.add(card.root);
    const branch = makeBranch();
    branch.visible = false;
    scene.add(branch);
    const arrow = arrowMesh();
    arrow.visible = false;
    scene.add(arrow);
    // Dizzy stars and the cone landing ring
    const starGeo = new THREE.OctahedronGeometry(0.09);
    const stars = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(starGeo, new THREE.MeshBasicMaterial({ color: '#ffd166' }));
      m.visible = false;
      scene.add(m);
      return m;
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.45, 24), new THREE.MeshBasicMaterial({ color: '#ef5b6f', transparent: true, opacity: 0.7, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    scene.add(ring);

    // ---------------------------------------------------------------- falling things
    const KINDS = {
      leaf: { geo: leafGeometry(), max: 40 },
      carrot: { geo: carrotGeometry(), max: 8 },
      gold: { geo: goldGeometry(), max: 3, emissive: '#ffb000' },
      cone: { geo: coneGeometry(), max: 8 },
    };
    const pools = {};
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const sc = new THREE.Vector3();
    for (const [k, def] of Object.entries(KINDS)) {
      const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: k === 'gold' ? 0.35 : 0.75, metalness: k === 'gold' ? 0.3 : 0, emissive: def.emissive || '#000000', emissiveIntensity: def.emissive ? 0.45 : 1 });
      const im = new THREE.InstancedMesh(def.geo, material, def.max);
      im.castShadow = true;
      im.frustumCulled = false;
      for (let i = 0; i < def.max; i++) im.setMatrixAt(i, m4.makeScale(0, 0, 0));
      scene.add(im);
      pools[k] = { im, list: Array.from({ length: def.max }, () => ({ alive: false, p: new THREE.Vector3(), v: new THREE.Vector3(), z0: 0, age: 0, spin: 0, ph: 0 })) };
    }
    function spawn(kind, x, y, z, vx = 0, vy = 0) {
      const pool = pools[kind];
      const it = pool.list.find((o) => !o.alive);
      if (!it) return null;
      it.alive = true;
      it.p.set(x, y, z);
      it.v.set(vx, vy, 0);
      it.z0 = z;
      it.age = 0;
      it.spin = (Math.random() - 0.5) * 4;
      it.ph = Math.random() * 6;
      it.hit = false;
      if (kind !== 'cone') round.possible += POINTS[kind];
      return it;
    }

    // Wind streaks
    const streakGeo = new THREE.CapsuleGeometry(0.02, 0.9, 2, 4);
    streakGeo.rotateZ(Math.PI / 2);
    const streaks = new THREE.InstancedMesh(streakGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }), 10);
    streaks.frustumCulled = false;
    const streakList = Array.from({ length: 10 }, () => ({ x: (Math.random() - 0.5) * 20, y: 1.5 + Math.random() * 5.5, z: -1 + Math.random() * 3 }));
    scene.add(streaks);

    // ---------------------------------------------------------------- state
    const silly = Math.random() < 0.5 ? 'hiccups' : 'spin';
    ROUNDS[4].hint = silly === 'hiccups' ? 'Jouri has the hiccups!' : 'Jouri cannot stop dancing!';
    const best = ctx.load('best', 0) || 0;
    const bestStars = ctx.load('stars', 0) || 0;
    const S = { phase: 'intro', k: 0, r: 0, time: ROUND_TIME, score: 0, combo: 0, grades: [], hopY: 0, hopV: 0, duck: 0, dizzy: 0, chew: 0, spin: 0, nextHic: 3, nextSpin: 4, upWas: false };
    const round = { pts: 0, possible: 0, leafT: 0.4, carrotT: 1.5, coneT: 2, branchT: 3, goldAt: [], branch: null, cone: null };
    // Handles for headless checks
    scene.userData.leaf = { S, round, jouri, pools };
    const R = () => ROUNDS[S.r];
    const restMouth = (() => {
      jouri.update(0, 0);
      jouri.holder.updateMatrixWorld(true);
      return jouri.localOf(jouri.mouthAnchor, new THREE.Vector3());
    })();
    const BRANCH_Y = restMouth.y - 0.02;
    const GOLD_Y = restMouth.y + 0.62;
    const mouth = new THREE.Vector3();
    const head = new THREE.Vector3();
    const tmp = new THREE.Vector3();

    function startRound() {
      Object.assign(round, { pts: 0, possible: 0, leafT: 0.3, carrotT: 1.6, coneT: 2.2, branchT: 2.5, branch: null, cone: null });
      const g = R().gold;
      round.goldAt = Array.from({ length: g }, (_, i) => 4 + ((i + 0.3 + Math.random() * 0.4) * (ROUND_TIME - 9)) / g);
      S.time = ROUND_TIME;
      S.phase = 'play';
      S.k = 0;
      squirrel.root.visible = R().cone > 0;
    }
    function showIntro() {
      S.phase = 'intro';
      S.k = 0;
      const r = R();
      hud.message(`Round ${S.r + 1}<br><span style="font-size:.42em">${r.title}${r.hint ? ' &middot; ' + r.hint : ''}</span>`, 1900);
      sound?.ui?.('swoosh');
    }
    hud.buttons({ action: 'Hop', jump: null, extra: [{ id: 'duck', label: 'Duck' }] });
    hud.hint('A and D or the arrows to walk, Space to hop, S to duck');
    showIntro();

    function bonk(what) {
      if (S.dizzy > 0) return;
      S.dizzy = 1.2;
      S.combo = 0;
      round.pts = Math.max(0, round.pts - 2);
      S.score = Math.max(0, S.score - 2);
      sfx.bonk();
      rider.squash = 0.75;
      fx.burst(head.clone(), ['#ffd166', '#ffffff'], 16);
      if (what === 'branch') hud.message('<span style="font-size:.6em">Bonk! Duck next time</span>', 900);
      mate.emote('wave');
    }
    function caught(kind, it) {
      const pts = POINTS[kind] * (S.combo >= 8 ? 2 : 1);
      S.combo += 1;
      round.pts += pts;
      S.score += pts;
      S.chew = 0.6;
      it.alive = false;
      if (kind === 'gold') {
        sfx.gold();
        fx.burst(it.p.clone(), ['#ffd166', '#fff3c0', '#ffffff'], 30);
        hud.message('<span style="font-size:.6em">Golden leaf! +5</span>', 900);
        mate.emote('cheer');
      } else {
        if (kind === 'carrot') sfx.carrot();
        else sfx.munch();
        fx.burst(it.p.clone(), kind === 'carrot' ? ['#ff9a3c', '#4f9a45'] : ['#7fcf5c', '#b8e986'], 8);
      }
      if (S.combo === 8) hud.message('<span style="font-size:.6em">Combo! Double points</span>', 900);
    }

    // ---------------------------------------------------------------- Jouri and Jodi, frame by frame
    let vx = 0;
    jouri.script = {
      step(g) {
        g.T.roll = 0;
        g.T.twist = 0;
        g.T.lid = 0;
        g.T.tail = 0.8;
        g.T.lean = lerp(JOURI.rest.lean, 0.95, S.duck);
        g.T.curve = lerp(0, 0.1, S.duck);
        g.T.pitch = lerp(0, 0.35, S.duck) - (S.hopY > 0.05 ? 0.2 : 0);
        g.R.lean = 8;
        g.R.pitch = 8;
        g.A.y = S.hopY;
        g.A.tuck = clamp(S.hopY * 2.5, 0, 1);
        g.A.spin = S.spin;
        // Tongue out when something tasty is close
        if (S.near < 1.2) {
          g.T.tongue = 1.1;
          g.T.lid = 0;
        }
        if (S.chew > 0) {
          g.T.chew = 1;
          g.T.lid = 0.6;
          g.T.tongue = 0;
        }
        if (S.dizzy > 0) {
          g.T.lid = 1;
          g.A.yaw = Math.sin(S.k * 14) * 0.3;
          g.A.roll = Math.sin(S.k * 9) * 0.2;
          g.T.tongue = 0.6;
        }
        if (S.phase === 'grade') {
          g.T.lid = 0.3;
          g.T.tongue = 0.6;
          g.T.wink = 1;
        }
      },
    };
    let gradeShown = 0;
    jodi.script = {
      step(g) {
        g.T.lid = 0.45;
        g.T.browR = 1;
        g.T.chew = 0.4;
        if (S.phase === 'grade') {
          // Holds up her score card, very seriously
          g.lookAt = camera.position;
          g.T.lid = 0.55;
          g.T.chew = 0;
          g.T.pitch = 0.1;
        } else g.lookAt = jouri.localOf(jouri.head, tmp);
      },
    };

    // ---------------------------------------------------------------- per frame
    let camX = 0;
    let firstCount = 3;
    let lastBeep = -1;
    return {
      update(dt, t) {
        S.k += dt;
        const r = R();
        // Phases
        if (S.phase === 'intro') {
          if (S.r === 0) {
            const left = Math.ceil(3 - (S.k - 1.9) / 0.7);
            if (S.k > 1.9 && left !== lastBeep && left > 0 && left <= firstCount) {
              lastBeep = left;
              hud.message(String(left), 650);
              sound?.ui?.('tick');
            }
            if (S.k > 1.9 + 2.1) {
              hud.message('Go!', 600);
              sound?.ui?.('good');
              startRound();
            }
          } else if (S.k > 2.0) {
            hud.message('Go!', 600);
            sound?.ui?.('good');
            startRound();
          }
        } else if (S.phase === 'play') {
          S.time -= dt;
          playStep(dt, t, r);
          if (S.time <= 0) {
            S.phase = 'grade';
            S.k = 0;
            // About seven in ten of everything that fell earns a ten from Jodi
            const grade = clamp(Math.round((round.pts / Math.max(1, round.possible)) * 14), 0, 10);
            S.grades.push(grade);
            card.draw(grade);
            gradeShown = grade;
            for (const pool of Object.values(pools)) for (const it of pool.list) if (it.alive && it.p.y > 0.5) it.fall = true;
            branch.visible = false;
            arrow.visible = false;
            ring.visible = false;
            round.branch = null;
            const line = LINES.find(([n]) => grade >= n)[1];
            const extra = r.silly && silly === 'spin' ? ' She did not approve of the dancing.' : '';
            hud.message(`<span style="font-size:.55em">Jodi gives ${grade} out of 10</span><br><span style="font-size:.38em">${line}${extra}</span>`, 2600);
            sfx.hum();
          }
        } else if (S.phase === 'grade') {
          playStep(dt, t, r, true);
          card.root.scale.setScalar(damp(card.root.scale.x, S.k < 2.6 ? 1 / JODI.scale : 0, 8, dt));
          if (S.k > 3.0) {
            card.root.scale.setScalar(0);
            if (S.r < ROUNDS.length - 1) {
              S.r += 1;
              showIntro();
            } else finishGame();
          }
        }

        // Jouri's hop, duck and walk (frozen while the result card is up)
        if (S.phase !== 'done') {
          const ax = S.phase === 'play' ? input.axis() : { x: 0, y: 0 };
          const slow = S.dizzy > 0 ? 0.35 : 1;
          vx = damp(vx, ax.x * 5.2 * slow, 10, dt);
          jouri.pos.x = clamp(jouri.pos.x + vx * dt, PLAY.x0, PLAY.x1);
          if (jouri.pos.x <= PLAY.x0 || jouri.pos.x >= PLAY.x1) vx *= 0.5;
          jouri.yaw = dampAngle(jouri.yaw, clamp(vx * 0.07, -0.4, 0.4), 6, dt);
          jouri.manual.speed = Math.abs(vx) * 0.55;
          const wantDuck = S.phase === 'play' && (ax.y < -0.45 || input.held('duck') || input.held('s') || input.held('arrowdown'));
          S.duck = damp(S.duck, wantDuck ? 1 : 0, 9, dt);
          const up = ax.y > 0.6;
          const hopPressed = S.phase === 'play' && (input.pressed('action') || input.pressed('jump') || (up && !S.upWas));
          S.upWas = up;
          if (hopPressed && S.hopY <= 0.001 && S.duck < 0.5) {
            S.hopV = 4.3;
            sfx.hop();
          }
          // The silly round: hiccups or sudden spins
          if (S.phase === 'play' && r.silly) {
            if (silly === 'hiccups') {
              S.nextHic -= dt;
              if (S.nextHic <= 0) {
                S.nextHic = 2.2 + Math.random() * 1.6;
                if (S.hopY <= 0.001) S.hopV = 2.6;
                sfx.hic();
              }
            } else {
              S.nextSpin -= dt;
              if (S.nextSpin <= 0) {
                S.nextSpin = 4 + Math.random() * 1.5;
                S.spinT = 0.9;
                sfx.giggle();
              }
            }
          }
          if (S.spinT > 0) {
            S.spinT -= dt;
            S.spin = (1 - Math.max(0, S.spinT) / 0.9) * Math.PI * 2;
            if (S.spinT <= 0) S.spin = 0;
          }
          if (S.hopV !== 0 || S.hopY > 0) {
            S.hopV -= 14 * dt;
            S.hopY += S.hopV * dt;
            if (S.hopY <= 0) {
              S.hopY = 0;
              S.hopV = 0;
            }
          }
          if (S.dizzy > 0) S.dizzy -= dt;
          if (S.chew > 0) S.chew -= dt;
        }
        jouri.update(dt, t);
        jodi.update(dt, t);
        jouri.localOf(jouri.mouthAnchor, mouth);
        jouri.localOf(jouri.head, head);
        rider.update(dt, t, 0, 0, 0);
        if (S.phase === 'grade' && S.k > 0.4 && S.k < 1.0) rider.emote('cheer');

        // Dizzy stars
        stars.forEach((m, i) => {
          m.visible = S.dizzy > 0;
          if (!m.visible) return;
          const a = t * 6 + (i * Math.PI * 2) / 3;
          m.position.set(head.x + Math.cos(a) * 0.35, head.y + 0.45 + Math.sin(t * 8 + i) * 0.04, head.z + Math.sin(a) * 0.35);
          m.rotation.y = t * 5;
        });

        // The partner on the tree walk
        mp.speed = damp(mp.speed, clamp((mp.want - mp.x) * 3, -3.2, 3.2), 8, dt);
        mp.x += mp.speed * dt;
        const moving = Math.abs(mp.speed) > 0.3;
        mp.yaw = dampAngle(mp.yaw, moving ? (mp.speed > 0 ? Math.PI / 2 : -Math.PI / 2) : 0.15 * Math.sign(jouri.pos.x - mp.x), 10, dt);
        mate.root.position.set(mp.x, WALK.y, WALK.z);
        mate.root.rotation.y = mp.yaw;
        mp.throwT -= dt;
        mate.hands = mp.throwT > 0 ? 'wave2' : null;
        mate.update(dt, t, Math.abs(mp.speed), 0, 0);

        // Squirrel bounce, tail flick
        if (squirrel.root.visible) {
          const wind = round.cone ? round.cone.wind : 0;
          squirrel.root.position.y = SQUIRREL.y + Math.abs(Math.sin(t * (wind > 0 ? 16 : 3))) * (wind > 0 ? 0.08 : 0.02);
          squirrel.tail.rotation.x = Math.sin(t * 4) * 0.15;
        }

        // Wind streaks
        const w = windAt(t, r);
        const showStreaks = Math.abs(w) > 0.35 && S.phase !== 'intro';
        streaks.visible = showStreaks;
        if (showStreaks) {
          streakList.forEach((s, i) => {
            s.x += w * 4 * dt;
            if (s.x > 11) s.x = -11;
            if (s.x < -11) s.x = 11;
            const k = clamp(Math.abs(w) / 1.4, 0.3, 1);
            streaks.setMatrixAt(i, m4.compose(tmp.set(s.x, s.y + Math.sin(t * 2 + i) * 0.1, s.z), q.identity(), sc.set(k, 1, 1)));
          });
          streaks.instanceMatrix.needsUpdate = true;
        }

        // Camera: wide enough on a phone to see the judge, high enough to see the canopy
        const aspect = camera.aspect || 1.6;
        const dist = Math.max(10, 7.2 / (0.414 * aspect));
        camX = damp(camX, jouri.pos.x * 0.2, 3, dt);
        camera.position.set(camX, 4.1, PLAY.z + dist);
        camera.lookAt(camX * 0.9, 3.95, 0);
        env.follow(tmp.set(jouri.pos.x * 0.5, 0, 0));
        drawItems(dt, t);
        if (S.phase !== 'done') hud.score(`Round ${S.r + 1}/5 &nbsp; ${Math.max(0, Math.ceil(S.time))}s &nbsp; <b>${S.score}</b>${S.combo >= 3 ? ` &nbsp; x${S.combo}` : ''}`);
      },
      dispose() {},
    };

    function windAt(t, r) {
      if (!r.wind) return 0;
      return r.wind * (Math.sin(t * 0.55) * 0.8 + Math.sin(t * 1.7 + 1) * 0.35);
    }

    function playStep(dt, t, r, winding = false) {
      const w = windAt(t, r);
      if (!winding) {
        // Leaves shaken loose from the canopy
        round.leafT -= dt;
        if (round.leafT <= 0) {
          round.leafT = (0.6 + Math.random() * 0.8) / r.rate;
          const x = (Math.random() - 0.5) * 9.2 - w * 1.2;
          spawn('leaf', clamp(x, -5.4, 5.4), 7.7, -1.8, 0, -0.4);
        }
        // Carrots from the partner: walk there first, then a little throw
        round.carrotT -= dt;
        if (round.carrotT <= 1.0 && mp.target === undefined) {
          mp.target = clamp((Math.random() - 0.5) * 8.4, WALK.x0, WALK.x1);
          mp.want = mp.target;
        }
        if (round.carrotT <= 0 && mp.target !== undefined && Math.abs(mp.x - mp.target) < 0.4) {
          round.carrotT = r.carrot * (0.8 + Math.random() * 0.4);
          spawn('carrot', mp.x, WALK.y + 1.0, WALK.z + 0.3, 0, 1.6);
          mp.throwT = 0.45;
          mp.target = undefined;
        }
        // The squirrel's pine cones: a wind-up, a landing ring, then the toss
        if (r.cone) {
          round.coneT -= dt;
          if (!round.cone && round.coneT <= 0) {
            const tx = clamp(jouri.pos.x + (Math.random() - 0.5) * 2.4, PLAY.x0, PLAY.x1);
            round.cone = { tx, wind: 0.7 };
            sfx.chitter();
          }
          if (round.cone) {
            const c = round.cone;
            if (c.wind > 0) {
              c.wind -= dt;
              ring.visible = true;
              ring.position.set(c.tx, 0.03, 1.2);
              ring.material.opacity = 0.4 + Math.sin(t * 16) * 0.3;
              if (c.wind <= 0) {
                const T = 1.5;
                spawn('cone', SQUIRREL.x, SQUIRREL.y + 0.3, SQUIRREL.z, (c.tx - SQUIRREL.x) / T, 1.5);
                c.flying = 1.6;
              }
            } else {
              c.flying -= dt;
              ring.material.opacity = 0.5;
              if (c.flying <= 0) {
                round.cone = null;
                ring.visible = false;
                round.coneT = r.cone * (0.75 + Math.random() * 0.5);
              }
            }
          }
        }
        // Golden leaves glide across high up
        while (round.goldAt.length && ROUND_TIME - S.time >= round.goldAt[0]) {
          round.goldAt.shift();
          const side = Math.random() < 0.5 ? -1 : 1;
          const g = spawn('gold', side * 6.2, GOLD_Y, 0.8, -side * 1.25, 0);
          if (g) g.glide = true;
          sfx.whoosh();
        }
        // The low branch
        if (r.branch) {
          if (!round.branch) {
            round.branchT -= dt;
            if (round.branchT <= 0) {
              const side = Math.random() < 0.5 ? -1 : 1;
              round.branch = { side, warn: 1.3, x: side * 10, hit: false };
              sfx.whoosh();
            }
          } else {
            const b = round.branch;
            if (b.warn > 0) {
              b.warn -= dt;
              arrow.visible = Math.sin(t * 18) > -0.3;
              const sx = b.side * 6.4;
              arrow.position.set(sx, BRANCH_Y, 1.4);
              arrow.rotation.set(0, 0, b.side > 0 ? Math.PI : 0);
              if (b.warn <= 0) arrow.visible = false;
            } else {
              b.x -= b.side * 5.2 * dt;
              branch.visible = true;
              branch.position.set(b.x, BRANCH_Y + 0.12, 1.3);
              branch.rotation.set(0, 0, Math.sin(t * 3) * 0.05);
              if (!b.hit && Math.abs(b.x - head.x) < 1.6 && mouth.y > BRANCH_Y - 0.5) {
                b.hit = true;
                bonk('branch');
              }
              if (Math.abs(b.x) > 10.5) {
                round.branch = null;
                branch.visible = false;
                round.branchT = r.branch * (0.8 + Math.random() * 0.4);
              }
            }
          }
        }
      }

      // Move everything that is falling and check the catches
      S.near = 99;
      for (const [kind, pool] of Object.entries(pools)) {
        for (const it of pool.list) {
          if (!it.alive) continue;
          it.age += dt;
          if (kind === 'gold' && it.glide && !it.fall) {
            it.p.x += it.v.x * dt;
            it.p.y = GOLD_Y + Math.sin(it.age * 3 + it.ph) * 0.14;
            if (Math.abs(it.p.x) > 6.6 && it.age > 1) it.alive = false;
          } else if (kind === 'leaf') {
            it.v.x = damp(it.v.x, w * 1.1 + Math.sin(it.age * 2.4 + it.ph) * 0.6, 2, dt);
            it.v.y = damp(it.v.y, -1.75 - S.r * 0.08, 2, dt);
            it.p.addScaledVector(it.v, dt);
          } else {
            const g = kind === 'cone' ? 8 : 9;
            it.v.y -= g * dt;
            if (kind === 'carrot') it.v.x = damp(it.v.x, w * 0.4, 1, dt);
            it.p.addScaledVector(it.v, dt);
          }
          it.p.z = lerp(it.z0, mouth.z, clamp(it.age / 0.7, 0, 1));
          if (winding || it.fall) {
            if (it.p.y < 0.12) it.alive = false;
            continue;
          }
          const dx = it.p.x - mouth.x;
          const dy = it.p.y - mouth.y;
          const d2 = dx * dx + dy * dy;
          if (kind === 'cone') {
            const hx = it.p.x - head.x;
            const hy = it.p.y - (head.y + 0.1);
            if (!it.hit && hx * hx + hy * hy < 0.36) {
              it.hit = true;
              it.v.set(Math.sign(hx || 1) * 2.5, 2, 0);
              bonk('cone');
            }
          } else {
            S.near = Math.min(S.near, Math.sqrt(d2));
            const rad = kind === 'gold' ? 0.72 : 0.64;
            if (d2 < rad * rad) {
              caught(kind, it);
              continue;
            }
          }
          if (it.p.y < 0.12) {
            it.alive = false;
            if (kind !== 'cone') {
              S.combo = 0;
              sfx.miss();
            }
            fx.puff?.(it.p.clone());
          }
        }
      }
    }

    function drawItems(dt, t) {
      for (const [kind, pool] of Object.entries(pools)) {
        const { im, list } = pool;
        list.forEach((it, i) => {
          if (!it.alive) {
            im.setMatrixAt(i, m4.makeScale(0, 0, 0));
            return;
          }
          if (kind === 'leaf') q.setFromEuler(e.set(Math.sin(it.age * 3 + it.ph) * 0.6, it.age * it.spin, Math.cos(it.age * 2.5 + it.ph) * 0.5));
          else if (kind === 'gold') q.setFromEuler(e.set(Math.sin(it.age * 4) * 0.4, it.age * 3, 0.3));
          else q.setFromEuler(e.set(it.age * it.spin, 0, it.age * it.spin * 0.7));
          const s = Math.min(1, it.age * 5) * (kind === 'gold' ? 1 + Math.sin(t * 8) * 0.08 : 1);
          im.setMatrixAt(i, m4.compose(it.p, q, sc.set(s, s, s)));
        });
        im.instanceMatrix.needsUpdate = true;
      }
    }

    function finishGame() {
      S.phase = 'done';
      const total = S.grades.reduce((a, b) => a + b, 0);
      const starsWon = total >= 38 ? 3 : total >= 26 ? 2 : total >= 14 ? 1 : 0;
      const newBest = S.score > best;
      if (newBest) ctx.save('best', S.score);
      if (starsWon > bestStars) ctx.save('stars', starsWon);
      let unlock = '';
      if (starsWon === 3 && !ctx.load('crown', false)) {
        ctx.save('crown', true);
        unlock = '<br><b>Jouri earned the golden leaf crown.</b> She will wear it at the zoo.';
      }
      const starText = starsWon ? `${starsWon} of 3 stars` : 'No stars yet';
      const title = starsWon === 3 ? 'Jodi is impressed!' : starsWon === 2 ? 'Very neat!' : starsWon === 1 ? 'A good start!' : 'Jouri is still hungry!';
      ctx.finish({
        win: starsWon >= 2 ? true : starsWon === 1 ? null : false,
        title,
        text: `${meName} and Jouri caught <b>${S.score}</b> points${newBest ? ' (a new best)' : best ? ` (best ${best})` : ''}.<br>Jodi's marks: ${S.grades.join(', ')}. That is ${total} out of 50: <b>${starText}</b>.<br>${partnerName} threw every carrot with love.${unlock}`,
      });
    }
  },
};
