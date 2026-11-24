import * as THREE from 'three';
import { Physics } from '../engine/physics.js';
import { buildScenery, PZ, PL, GOAL, SPOT, STAND, SEAT_Y } from './football/scenery.js';
import { PAL, makeBall, blobShadow, sfx } from './football/models.js';

// The football pitch: a striped little pitch with two goals, a stand, dugouts and a scoreboard.
// Kick the ball about (Roji and Homama push it like the beach balls; "Kick the ball" boots it),
// score in either goal for confetti and a point on the scoreboard, practise penalties against
// the partner in goal, sit in the stand, or start the 3D match.

const R = 0.2; // ball radius
const G = 15;
const NAME = { roji: 'Roji', homama: 'Homama' };
const AIMS = {
  left: { z: -1, label: 'Left corner', sub: 'Low and to the left' },
  right: { z: 1, label: 'Right corner', sub: 'Low and to the right' },
  middle: { z: 0, label: 'Down the middle', sub: 'Brave and strong' },
};
const LINES = {
  goal: {
    roji: ['<b>Homama:</b> Too good, Roji!', '<b>Homama:</b> I did not even see it.', '<b>Homama:</b> Best shot on the island.'],
    homama: ['<b>Roji:</b> Lovely shot, Homama!', '<b>Roji:</b> Right in the corner. Nice!', '<b>Roji:</b> You have been practising.'],
  },
  save: {
    roji: ['<b>Homama:</b> Sorry, Roji. I had to.', '<b>Homama:</b> Got it! Your next one goes in.'],
    homama: ['Saved! Doctor Roji has quick hands.', '<b>Roji:</b> Not today, Homama!'],
  },
  post: ['Off the post! So close.', 'Ping! The post says no.'],
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export default {
  id: 'football',
  stop: {
    title: 'Football Pitch',
    tag: 'Kick, pass and score',
    icon: 'fb-ball',
    color: '#3fbf7f',
    text: 'A little pitch with two goals, a stand and a scoreboard. Kick the ball about, practise penalties, or play a real match.',
  },
  icons: {
    'fb-ball': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7.6l3.5 2.5-1.3 4.1H9.8l-1.3-4.1z M12 3v4.6 M15.5 10.1l4.9-1.5 M14.2 14.2l2.9 4.2 M9.8 14.2l-2.9 4.2 M8.5 10.1 3.6 8.6',
    'fb-goal': 'M3 19V6h18v13 M3 6l3 4h12l3-4 M6 10v9 M18 10v9 M12 17.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z',
    'fb-seat': 'M4 18h16 M6 18v-4h12v4 M5 14V9h14v5 M8 9V6h8v3',
  },

  build(ctx) {
    const { api: api0 } = ctx;
    const S = buildScenery();
    const g = S.group;
    const dynamic = [...S.dynamic];
    const colliders = S.colliders;

    // ------------------------------------------------ the ball
    const ballM = makeBall(R);
    ballM.position.set(0, R, PZ);
    const shadow = blobShadow(R * 1.15);
    g.add(ballM, shadow);
    dynamic.push(ballM, shadow);
    const B = { p: ballM.position, v: new THREE.Vector3(), last: null, cd: 0, resetT: 0, bounceCd: 0, held: false };
    // The ball meets the same things as the kids, but the stand and the stairs are walls for it
    const ballPhys = new Physics(colliders.map((c) => (c.tag === 'stand' || c.tag === 'stairs' ? { ...c, h: undefined } : c)));
    const axis = new THREE.Vector3();
    const prev = new THREE.Vector3();

    // ------------------------------------------------ saved scores
    const score = api0.load('goals', { roji: 0, homama: 0 });
    const pens = api0.load('pens', { best: 0 });
    // One cup for every match won in the 3D game (it keeps its own count of wins)
    const arenaWins = () => {
      try {
        return Number(JSON.parse(localStorage.getItem('roji-arena-football-wins') || '0')) || 0;
      } catch {
        return 0;
      }
    };
    let cupsWon = Math.max(api0.load('cups', 0), arenaWins());
    S.cups.count = Math.min(8, cupsWon);
    const drawBoard = (sub) => S.board.set({ a: score.roji, b: score.homama, nameA: 'Roji', nameB: 'Homama', colorA: PAL.pink, colorB: PAL.blue, sub: sub ?? (pens.best ? `Penalty best: ${pens.best} of 5` : 'Kickabout goals') });
    drawBoard();

    // ------------------------------------------------ kick animation on a kid (runs after Kid.update)
    const kicks = new Map();
    function kickPose(kid, k) {
      const a = k < 0.1 ? 0.6 * (k / 0.1) : k < 0.2 ? 0.6 - 2.0 * ((k - 0.1) / 0.1) : -1.4 * Math.max(0, 1 - (k - 0.2) / 0.25);
      kid.legs[1].rotation.x = a;
      kid.legs[0].rotation.x = -a * 0.15;
      kid.arms[0].rotation.x = a * 0.5;
      kid.arms[1].rotation.x = -a * 0.3;
      kid.body.rotation.x = -a * 0.06;
    }
    function runPose(kid, ph, amt = 1) {
      const s = Math.sin(ph);
      kid.legs[0].rotation.x = s * 0.85 * amt;
      kid.legs[1].rotation.x = -s * 0.85 * amt;
      kid.arms[0].rotation.x = -s * 0.7 * amt;
      kid.arms[1].rotation.x = s * 0.7 * amt;
      kid.body.position.y = Math.abs(Math.cos(ph)) * 0.08 * amt;
      kid.body.rotation.x = 0.12 * amt;
    }

    // ------------------------------------------------ goals and resets
    function resetBall(api, at = { x: 0, z: PZ }) {
      api.fx.poof(api.world(B.p.x, B.p.z, 0));
      B.p.set(at.x, R, at.z);
      B.v.set(0, 0, 0);
      B.last = null;
      B.held = false;
      api.fx.puff(api.world(at.x, at.z, 0));
    }
    function scoreGoal(api, side) {
      const who = B.last;
      B.resetT = 2.8;
      const gl = S.goals.find((q) => q.side === side);
      gl.bulge(side * (B.p.z - PZ), B.p.y, Math.min(1, Math.hypot(B.v.x, B.v.z) / 10));
      sfx.net(api.sound);
      sfx.cheer(api.sound, 0.8);
      setTimeout(() => sfx.whistle(api.sound, 'short'), 250);
      api.fx.burst(api.world(side * (PL + 0.3), PZ, 1.0), [PAL.pink, PAL.yellow, '#ffffff', PAL.teal, PAL.sky], 110);
      if (!who) {
        api.toast('Goal!', 2000);
        return;
      }
      score[who]++;
      api.save('goals', score);
      drawBoard();
      const other = who === 'roji' ? 'homama' : 'roji';
      api.toast(`Goal! <b>${NAME[who]}</b> scores. ${who === 'roji' ? '<b>Homama:</b> That is my Roji!' : '<b>Roji:</b> Nice one, Homama!'}`, 2800);
      const a = api.actor(who);
      const b = api.actor(other);
      if (a && !a.seated) api.emote(a, 'cheer');
      if (b && !b.seated) setTimeout(() => !b.seated && api.emote(b, who === 'roji' ? 'heart' : 'dance'), 400);
    }

    function kickBall(api) {
      const a = api.player;
      const lp = api.localPos(a);
      const dx = B.p.x - lp.x;
      const dz = B.p.z - lp.z;
      const d = Math.hypot(dx, dz) || 1;
      let kx = Math.sin(a.yaw);
      let kz = Math.cos(a.yaw);
      if ((dx * kx + dz * kz) / d < 0.3) {
        kx = dx / d;
        kz = dz / d;
      }
      // A little help toward the goal they are facing
      const gx = kx > 0 ? PL : -PL;
      const tx = gx - B.p.x;
      const tz = PZ - B.p.z;
      const tl = Math.hypot(tx, tz);
      if (tl < 15 && (tx * kx + tz * kz) / tl > 0.8) {
        kx = kx * 0.5 + (tx / tl) * 0.5;
        kz = kz * 0.5 + (tz / tl) * 0.5;
        const l = Math.hypot(kx, kz);
        kx /= l;
        kz /= l;
      }
      a.yaw = Math.atan2(kx, kz);
      B.v.set(kx * 9.5, 2.4, kz * 9.5);
      B.last = a.id;
      B.cd = 0.25;
      kicks.set(a.kid, 0);
      sfx.kick(api.sound, 0.9);
    }

    // ------------------------------------------------ free ball: pushed by the kids, rolls and bounces
    function stepBall(dt, api) {
      B.cd -= dt;
      B.bounceCd -= dt;
      if (B.resetT > 0) {
        B.resetT -= dt;
        if (B.resetT <= 0) resetBall(api);
      }
      for (const a of [api.player, api.partner]) {
        if (!a || a.seated) continue;
        const lp = api.localPos(a);
        const air = a.y - (a.ground ?? 0);
        const dx = B.p.x - lp.x;
        const dz = B.p.z - lp.z;
        const d = Math.hypot(dx, dz);
        const min = R + 0.34;
        if (d < min && air < 0.5 && B.p.y < 0.9) {
          const nx = dx / (d || 1);
          const nz = dz / (d || 1);
          B.p.x += nx * (min - d);
          B.p.z += nz * (min - d);
          const push = Math.max(0, a.vel.x * nx + a.vel.z * nz);
          B.v.x += nx * (push * 1.35 + 0.6);
          B.v.z += nz * (push * 1.35 + 0.6);
          if (push > 3.4) B.v.y = Math.max(B.v.y, push * 0.32);
          if (push > 1.2 && B.cd <= 0) {
            sfx.kick(api.sound, Math.min(1, push / 7));
            B.cd = 0.22;
          }
          B.last = a.id;
        }
      }
      physics(dt, api, true);
    }

    function physics(dt, api, goals) {
      const start = B.p.clone();
      const sp0 = Math.hypot(B.v.x, B.v.z);
      const n = Math.min(8, Math.ceil(((sp0 + Math.abs(B.v.y)) * dt) / 0.1));
      for (let i = 0; i < n; i++) subStep(dt / n, api, goals);
      const ground = B.p.y <= R + 0.01;
      const fr = Math.exp(-(ground ? 0.9 : 0.1) * dt);
      B.v.x *= fr;
      B.v.z *= fr;
      const sp1 = Math.hypot(B.v.x, B.v.z);
      if (sp0 > 3 && sp1 < sp0 * 0.75 && B.bounceCd <= 0) {
        sfx.bounce(api.sound, Math.min(1, sp0 / 8));
        B.bounceCd = 0.12;
      }
      const ds = Math.hypot(B.p.x - start.x, B.p.z - start.z);
      if (ds > 1e-4) ballM.rotateOnWorldAxis(axis.set(B.p.z - start.z, 0, -(B.p.x - start.x)).normalize(), ds / R);
    }

    const inGoal = (p, side) => side * p.x > PL && side * p.x < PL + GOAL.dBot + 0.05 && Math.abs(p.z - PZ) < GOAL.w / 2 && p.y < GOAL.h;
    function subStep(dt, api, goals) {
      prev.copy(B.p);
      B.v.y -= G * dt;
      B.p.addScaledVector(B.v, dt);
      if (B.p.y < R) {
        B.p.y = R;
        if (B.v.y < -1.4) {
          if (B.bounceCd <= 0) sfx.bounce(api.sound, Math.min(1, -B.v.y / 6));
          B.bounceCd = 0.1;
          B.v.y *= -0.5;
        } else B.v.y = 0;
      }
      ballPhys.resolve(B.p, R, B.v, { bounce: 0.55, feet: B.p.y - R, bounds: false });
      for (const side of [-1, 1]) {
        // Once inside a goal the net keeps it there
        if (inGoal(prev, side)) {
          const xMax = PL + GOAL.dBot - R * 0.8;
          if (side * B.p.x > xMax) {
            B.p.x = side * xMax;
            B.v.x = -B.v.x * 0.05;
          }
          const zMax = GOAL.w / 2 - R * 0.8;
          if (Math.abs(B.p.z - PZ) > zMax) {
            B.p.z = PZ + Math.sign(B.p.z - PZ) * zMax;
            B.v.z = -B.v.z * 0.2;
          }
          if (B.p.y > GOAL.h - R) {
            B.p.y = GOAL.h - R;
            B.v.y = -Math.abs(B.v.y) * 0.3;
          }
          B.v.x *= 0.9;
          B.v.z *= 0.9;
        }
        const inX = side * B.p.x > PL && side * B.p.x < PL + GOAL.dBot;
        const inZ = Math.abs(B.p.z - PZ) < GOAL.w / 2;
        if (inX && inZ && prev.y >= GOAL.h + R - 0.02 && B.p.y < GOAL.h + R) {
          // lands on the top net
          B.p.y = GOAL.h + R;
          B.v.y = Math.abs(B.v.y) * 0.25;
        }
        if (inZ && Math.abs(side * B.p.x - PL) < R + 0.06 && Math.abs(B.p.y - GOAL.h) < R + 0.06) {
          const ex = B.p.x - side * PL;
          const ey = B.p.y - GOAL.h;
          const el = Math.hypot(ex, ey) || 1;
          B.p.x = side * PL + (ex / el) * (R + 0.06);
          B.p.y = GOAL.h + (ey / el) * (R + 0.06);
          const into = B.v.x * (ex / el) + B.v.y * (ey / el);
          if (into < 0) {
            B.v.x -= (ex / el) * into * 1.6;
            B.v.y -= (ey / el) * into * 1.6;
            sfx.post(api.sound);
          }
        }
        if (goals && B.resetT <= 0 && inZ && side * B.p.x > PL + R * 0.6 && side * prev.x <= PL + R * 0.6 && B.p.y < GOAL.h) scoreGoal(api, side);
      }
    }

    // ------------------------------------------------ penalties: the player shoots, the partner keeps goal
    let pen = null;
    const SPOT_X = PL - SPOT;
    const KEEP_X = PL - 0.32;
    function closeChoose() {
      const el = document.querySelector('.choose');
      if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    function startPens(api) {
      if (pen || api.activityRunning) return;
      B.resetT = 0;
      pen = { phase: 'intro', k: 0, n: 0, goals: 0, hist: [], start: { x: SPOT_X - 1.7, z: PZ - 0.5 }, asking: false };
      resetBall(api, { x: SPOT_X, z: PZ });
      api.activity({
        label: 'Stop',
        endOnMove: false,
        seats: [
          { who: 'player', x: pen.start.x, z: pen.start.z, y: 0, yaw: Math.PI / 2 - 0.3, pose: 'stand' },
          { who: 'partner', x: KEEP_X, z: PZ, y: 0, yaw: -Math.PI / 2, pose: 'stand', hands: 'wave2' },
        ],
        focus: { x: PL - 1.3, z: PZ + 0.3, y: 0.7, zoom: 0.44 },
        exit: { x: PL - 3.3, z: PZ + 1.5 },
        onEnd: () => endPens(api),
      });
      api.toast(`Penalties! <b>${NAME[api.playerId]}</b> shoots and <b>${NAME[api.partnerId]}</b> keeps goal. Five shots.`, 2800);
    }
    function ask(api) {
      pen.phase = 'aim';
      pen.k = 0;
      pen.asking = true;
      const n = pen.n;
      api.choose({ title: `Shot ${n + 1} of 5`, text: `${pen.goals} scored so far. Where will you aim?`, options: Object.entries(AIMS).map(([id, a]) => ({ id, label: a.label, sub: a.sub })) }).then((id) => {
        if (!pen || pen.n !== n || pen.phase !== 'aim') return;
        pen.asking = false;
        if (!id) return api.endActivity();
        pen.aim = id;
        pen.phase = 'run';
        pen.k = 0;
        api.sound.ui('tap');
      });
    }
    function decide() {
      const h = pen.hist;
      const w = { left: 1, middle: 0.6, right: 1 };
      if (h.length >= 2 && h[h.length - 1] === h[h.length - 2]) w[h[h.length - 1]] += 1.4; // the keeper spots a habit
      let roll = Math.random() * (w.left + w.middle + w.right);
      let dive = 'left';
      for (const k of ['left', 'middle', 'right']) {
        roll -= w[k];
        if (roll <= 0) {
          dive = k;
          break;
        }
      }
      const aim = pen.aim;
      let out;
      if (dive === aim) out = Math.random() < (aim === 'middle' ? 0.85 : 0.7) ? 'save' : 'goal';
      else out = Math.random() < 0.08 ? 'post' : 'goal';
      const zs = AIMS[aim].z;
      let tz = PZ + zs * 1.02;
      let ty = zs ? 0.34 : 0.72;
      if (out === 'goal' && dive === aim) ty = 1.0; // just past the fingertips
      if (out === 'post') {
        tz = PZ + zs * (GOAL.w / 2 + 0.02);
        ty = zs ? 0.5 : GOAL.h + 0.02;
        if (!zs) tz = PZ + 0.3;
      }
      pen.dive = dive;
      pen.out = out;
      pen.hist.push(aim);
      const T = 0.32;
      pen.from = B.p.clone();
      pen.to = new THREE.Vector3(PL + 0.02, ty, tz);
      pen.vel = new THREE.Vector3().subVectors(pen.to, pen.from).divideScalar(T);
      pen.vel.y += 0.5 * G * T;
      pen.T = T;
    }
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    function keeperPose(Q, t, api) {
      const k = Q.kid;
      const zd = pen.dive ? AIMS[pen.dive].z : 0;
      const diving = pen.phase === 'fly' || pen.phase === 'after';
      let e = 0;
      let up = 0;
      if (diving) {
        const tt = pen.phase === 'fly' ? pen.k : pen.T + pen.k;
        const d = Math.min(1, Math.max(0, (tt - 0.04) / 0.3));
        const rise = pen.phase === 'after' ? Math.min(1, Math.max(0, (pen.k - 1.0) / 0.45)) : 0;
        e = (1 - Math.pow(1 - d, 2)) * (1 - rise);
        up = Math.sin(Math.min(1, d * 1.15) * Math.PI) * (zd ? 0.32 : 0.45) * (1 - rise);
      }
      const sway = pen.phase === 'aim' || pen.phase === 'run' ? Math.sin(t * 3.2) * 0.35 : 0;
      const z = PZ + sway + zd * 0.8 * e;
      const y = zd ? up + 0.1 * e : up;
      euler.set(0, -Math.PI / 2, -zd * 1.32 * e);
      const w = api.world(KEEP_X, z);
      k.root.position.set(w.x, y, w.z);
      k.root.quaternion.setFromEuler(euler);
      Q.pos.set(w.x, 0, w.z);
      pen.kz = z;
      const [aL, aR] = k.arms;
      if (diving && e > 0.05) {
        aL.rotation.set(-0.2, 0, 0.2 + 2.6 * e);
        aR.rotation.set(-0.2, 0, -0.2 - 2.6 * e);
        k.legs[0].rotation.x = 0.25 * e;
        k.legs[1].rotation.x = -0.3 * e;
      } else if (pen.phase !== 'intro' && !k.emoteType) {
        // ready stance: arms out, a little bounce
        aL.rotation.set(-0.5, 0, 0.75);
        aR.rotation.set(-0.5, 0, -0.75);
        k.body.position.y = Math.abs(Math.sin(t * 6.4)) * 0.04;
      }
      if (pen.out === 'save' && pen.dive === 'middle' && pen.phase === 'after' && pen.k < 1.4) {
        // caught it: hug the ball
        aL.rotation.set(-1.25, 0, -0.32);
        aR.rotation.set(-1.25, 0, 0.32);
      }
    }
    function stepPen(dt, t, api) {
      const P = api.player;
      const Q = api.partner;
      pen.k += dt;
      const kid = P.kid;
      const base = api.world(0, 0);
      const setShooter = (x, z, yaw) => {
        kid.root.position.set(base.x + x, 0, base.z + z);
        kid.root.rotation.set(0, yaw, 0);
        P.pos.set(base.x + x, 0, base.z + z);
        P.yaw = yaw;
      };
      const kickFrom = { x: SPOT_X - 0.4, z: PZ - 0.16 };
      if (pen.phase === 'intro') {
        if (pen.k > 1.5) {
          Q.kid.hands = null;
          ask(api);
        }
      } else if (pen.phase === 'run') {
        const u = Math.min(1, pen.k / 0.6);
        const x = pen.start.x + (kickFrom.x - pen.start.x) * u;
        const z = pen.start.z + (kickFrom.z - pen.start.z) * u;
        setShooter(x, z, Math.atan2(kickFrom.x - pen.start.x, kickFrom.z - pen.start.z));
        runPose(kid, pen.k * 15, 1 - Math.max(0, u - 0.85) * 4);
        if (u >= 1) {
          decide();
          pen.phase = 'kick';
          pen.k = 0;
        }
      } else if (pen.phase === 'kick') {
        setShooter(kickFrom.x, kickFrom.z, Math.atan2(pen.to.x - kickFrom.x, pen.to.z - kickFrom.z));
        kickPose(kid, pen.k);
        if (pen.k >= 0.16) {
          sfx.kick(api.sound, 1);
          pen.phase = 'fly';
          pen.k = 0;
        }
      } else if (pen.phase === 'fly') {
        kickPose(kid, 0.16 + pen.k);
        const tt = Math.min(pen.k, pen.T);
        prev.copy(B.p);
        B.p.copy(pen.from).addScaledVector(pen.vel, tt);
        B.p.y -= 0.5 * G * tt * tt;
        const ds = Math.hypot(B.p.x - prev.x, B.p.z - prev.z);
        if (ds > 1e-4) ballM.rotateOnWorldAxis(axis.set(B.p.z - prev.z, 0, -(B.p.x - prev.x)).normalize(), ds / R);
        if (pen.k >= pen.T) {
          const zs = AIMS[pen.aim].z;
          B.v.copy(pen.vel);
          B.v.y -= G * pen.T;
          if (pen.out === 'goal') {
            pen.goals++;
            B.v.multiplyScalar(0.55);
            const gl = S.goals.find((q) => q.side === 1);
            gl.bulge(B.p.z - PZ, B.p.y, 0.9);
            sfx.net(api.sound);
            sfx.cheer(api.sound, 0.6);
            api.fx.burst(api.world(PL + 0.3, PZ, 1.0), [PAL.pink, PAL.yellow, '#ffffff', PAL.teal], 70);
            api.toast(`Goal! ${pick(LINES.goal[api.playerId])}`, 2200);
          } else if (pen.out === 'save') {
            sfx.kick(api.sound, 0.5);
            if (pen.dive === 'middle') B.held = true;
            else B.v.set(-3.2, 2.4, -zs * 1.6 + (Math.random() - 0.5));
            api.toast(pick(LINES.save[api.playerId]), 2200);
          } else {
            sfx.post(api.sound);
            B.v.set(-4.2, 1.6, -(zs || 1) * 2.2);
            api.toast(pick(LINES.post), 2000);
          }
          pen.phase = 'after';
          pen.k = 0;
        }
      } else if (pen.phase === 'after') {
        if (pen.k < 0.3) kickPose(kid, 0.5);
        if (B.held) {
          B.p.set(KEEP_X - 0.34, 0.62, pen.kz ?? PZ);
        } else physics(dt, api, false);
        if (pen.k > 0.35 && !pen.cheered) {
          pen.cheered = true;
          if (pen.out === 'goal') api.emote('player', 'cheer');
          else if (pen.out === 'save') api.emote('player', 'wave');
          else api.emote('player', 'spin');
        }
        if (pen.k > 1.5 && !pen.reacted) {
          pen.reacted = true;
          if (pen.out === 'save') api.emote('partner', 'cheer');
          else if (pen.out === 'goal') api.emote('partner', 'heart');
        }
        if (pen.k > 2.6) {
          pen.n++;
          pen.cheered = pen.reacted = false;
          pen.dive = null;
          pen.out = null;
          Q.kid.cancelEmote();
          kid.cancelEmote();
          setShooter(pen.start.x, pen.start.z, Math.PI / 2 - 0.3);
          resetBall(api, { x: SPOT_X, z: PZ });
          if (pen.n >= 5) {
            pen.phase = 'done';
            pen.k = 0;
            const n = pen.goals;
            const best = n > pens.best;
            pens.best = Math.max(pens.best, n);
            api.save('pens', pens);
            drawBoard(`Penalties: ${n} of 5`);
            const pn = NAME[api.playerId];
            const qn = NAME[api.partnerId];
            const line = n === 5 ? `Perfect! ${qn} will tell everyone.` : n >= 3 ? `${qn} gives ${pn} a big hug.` : n >= 1 ? `${qn} had a great day in goal.` : `${qn} saved them all. Rematch soon!`;
            api.toast(`<b>${pn}</b> scored <b>${n} of 5</b>. ${line}${best && n ? ' A new best!' : ''}`, 3600);
            if (n >= 3) api.emote('partner', 'cheer');
            api.emote('player', n >= 3 ? 'dance' : 'bow');
          } else ask(api);
        }
      } else if (pen.phase === 'done') {
        if (pen.k > 2.6) api.endActivity();
      }
      if (pen && pen.phase !== 'intro') keeperPose(Q, t, api);
    }
    function endPens(api) {
      if (!pen) return;
      if (pen.asking) closeChoose();
      pen = null;
      if (B.held) {
        B.held = false;
        resetBall(api, { x: SPOT_X, z: PZ });
      }
      B.v.set(0, 0, 0);
    }

    // ------------------------------------------------ hotspots
    const hotspots = [
      {
        x: 2.2,
        z: 6.6,
        r: 1.4,
        label: 'Play football',
        icon: 'fb-ball',
        when: (api) => api.hasArena('football'),
        act: (api) =>
          api.playArena('football').then(() => {
            const n = Math.max(cupsWon, arenaWins());
            if (n > cupsWon) api.toast(`${n - cupsWon > 1 ? 'New cups' : 'A new cup'} for the shelf! That makes <b>${n}</b>.`, 3000);
            cupsWon = n;
            api.save('cups', n);
            S.cups.count = Math.min(8, n);
          }),
      },
      { x: SPOT_X - 0.9, z: PZ + 0.1, r: 1.3, label: 'Practise penalties', icon: 'fb-goal', when: () => !pen, act: (api) => startPens(api) },
      {
        x: -3.2,
        z: STAND.front + 0.6,
        r: 1.3,
        label: 'Sit in the stand',
        icon: 'fb-seat',
        when: () => !pen,
        act: (api) =>
          api.activity({
            label: 'Get up',
            seats: [
              { who: 'player', x: -3.6, z: STAND.front - 0.26, y: SEAT_Y - 0.27, yaw: 0, pose: 'sit' },
              { who: 'partner', x: -2.82, z: STAND.front - 0.26, y: SEAT_Y - 0.27, yaw: 0, pose: 'sit', hands: 'wave2' },
            ],
            focus: { x: -3.2, z: STAND.front + 1.3, y: 0.9, zoom: 0.5 },
            exit: { x: -3.6, z: STAND.front + 0.7 },
          }),
      },
      {
        track: () => ({ x: B.p.x, z: B.p.z }),
        r: 1.15,
        label: 'Kick the ball',
        icon: 'fb-ball',
        when: () => !pen && B.resetT <= 0 && B.p.y < 0.8,
        act: (api) => kickBall(api),
      },
    ];

    return {
      group: g,
      dynamic,
      colliders,
      hotspots,
      debug: { ball: B, score, get pen() { return pen; } },
      ground: [{ x: 0, z: 7.6, hw: 1.3, hd: 2.4, color: '#efd9b0', feather: 0.5 }],
      update(dt, t, api) {
        for (const f of S.flags) f.pivot.rotation.y = f.base + Math.sin(t * 2.2 + f.ph) * 0.35 + Math.sin(t * 5.3 + f.ph) * 0.08;
        for (const gl of S.goals) gl.update(dt);
        if (pen) stepPen(dt, t, api);
        else stepBall(dt, api);
        for (const [kid, k0] of kicks) {
          const k = k0 + dt;
          if (k > 0.45) kicks.delete(kid);
          else {
            kicks.set(kid, k);
            kickPose(kid, k);
          }
        }
        const hgt = Math.max(0, B.p.y - R);
        shadow.position.set(B.p.x, 0.022, B.p.z);
        shadow.scale.setScalar(1 - Math.min(0.5, hgt * 0.3));
        shadow.material.opacity = 0.25 * (1 - Math.min(0.7, hgt * 0.4));
      },
    };
  },
};
