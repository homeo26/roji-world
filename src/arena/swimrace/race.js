import * as THREE from 'three';
import { clamp, damp, lerp } from '../../util.js';
import { HX, WY, DECK, BLOCK_TOP, laneZ } from './pool.js';
import { towelFolded, towelDrape } from './swimmer.js';

// The three racing events of the gala, sharing one engine:
//   sprint: one length against three swimmers, the partner waits at the finish with a towel;
//   race:   two lengths with a flip turn, head to head with the partner;
//   relay:  the player swims the first length, the partner dives in at the touch and swims it home.
// Swim by alternating Left and Right. A ring shrinks after each stroke: the next stroke is perfect
// when it meets the circle. Dive at the whistle, flip near the wall.

const PI = Math.PI;
const DRAG = 1.1;
const KICK = 0.7; // speed from kicking alone
const PULL = 0.22;
const FLIP_ZONE = [0.45, 2.4];
const FLIP_PERFECT = [0.85, 1.7];

const ORD = (n) => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');

export async function runRace(G, cfg) {
  const { ctx, pool, ui, sfx, me, pal, npcs } = G;
  const { hud, fx } = ctx;
  const kind = cfg.kind;
  const L = G.level;
  const P = cfg.cadence; // seconds between strokes for a perfect rhythm
  const J = 3.0 * P * DRAG; // impulse per perfect stroke (gives about 3 m/s at the perfect rhythm)
  const meLane = 1;

  // ---------------------------------------------------------------- lanes
  const lanes = [];
  const mk = (i, swimmers, o) => {
    const lane = { i, z: laneZ(i), swimmers, leg: 0, legs: swimmers.length, lengths: o.lengths, left: o.lengths, isPlayer: !!o.player, name: o.name, color: o.color, pace: o.pace || 2.6, state: 'block', v: 0, finishT: null, place: 0, react: 0.12 + Math.random() * 0.22, dir: 1, lastStroke: -9, nextSide: 0, streak: 0, flipCool: 0, dist: 0, entryT: 0, t0: 0, hand: null, kickT: 0, wob: Math.random() * 9, label: o.label };
    lanes.push(lane);
    return lane;
  };
  let partnerLane = null;
  const others = npcs.slice();
  if (kind === 'sprint') {
    mk(meLane, [me], { lengths: 1, player: true, name: G.names.me, color: me.color, label: G.names.me[0] });
    [2, 3, 0].forEach((li, k) => mk(li, [others[k]], { lengths: 1, name: others[k].name, color: others[k].color, pace: [2.32, 2.46, 2.2][k] + L * 0.14, label: others[k].name[0] }));
  } else if (kind === 'race') {
    mk(meLane, [me], { lengths: 2, player: true, name: G.names.me, color: me.color, label: G.names.me[0] });
    partnerLane = mk(2, [pal], { lengths: 2, name: G.names.pal, color: pal.color, pace: 2.72 + L * 0.1, label: G.names.pal[0] });
    [3, 0].forEach((li, k) => mk(li, [others[k]], { lengths: 2, name: others[k].name, color: others[k].color, pace: [2.42, 2.32][k] + L * 0.12, label: others[k].name[0] }));
  } else {
    mk(meLane, [me, pal], { lengths: 1, player: true, name: `${G.names.me} and ${G.names.pal}`, color: me.color, label: G.names.me[0] });
    mk(2, [others[0], others[1]], { lengths: 1, name: 'The Dolphins', color: others[0].color, pace: 2.52 + L * 0.12, label: 'D' });
    mk(3, [others[2], others[3]], { lengths: 1, name: 'The Seahorses', color: others[2].color, pace: 2.42 + L * 0.12, label: 'S' });
  }
  const player = lanes.find((l) => l.isPlayer);
  const totalLen = (l) => l.legs * l.lengths;

  // Everyone not racing: out of the way
  const racing = new Set(lanes.flatMap((l) => l.swimmers));
  for (const s of [me, pal, ...npcs]) if (!racing.has(s)) s.visible = false;

  const blockX = (end) => end * (HX + 0.5);
  const yawFor = (dir) => (dir > 0 ? PI / 2 : -PI / 2);
  for (const l of lanes) {
    const s = l.swimmers[0];
    s.visible = true;
    s.place('stand', blockX(-1) + 0.08, BLOCK_TOP, l.z, yawFor(1));
    s.walk = 0;
    s.speed = 0;
    s.autoRate = 0;
    s.pose2 = null;
    s.cheer = 0;
    // relay: the second swimmer waits on the far block, facing back
    if (l.legs > 1) {
      const s2 = l.swimmers[1];
      s2.visible = true;
      s2.place('stand', blockX(1) - 0.08, BLOCK_TOP, l.z, yawFor(-1));
      s2.pose2 = null;
      s2.cheer = 0;
    }
  }

  // The partner waits at the finish with a towel (sprint)
  let towelHeld = null;
  if (kind === 'sprint') {
    pal.visible = true;
    pal.place('stand', HX + 1.6, DECK, player.z + 1.2, -PI / 2 - 0.35);
    towelHeld = towelFolded(G.palIsHomama ? '#7fb8ff' : '#ff8fb1');
    // held in the hand on the camera side, waved over the head as the swimmer comes in
    pal.kid.arms[0].add(towelHeld);
    towelHeld.position.set(0, -0.36, 0.06);
    towelHeld.rotation.set(0, 0, PI / 2);
    let wave = 0;
    pal.pose2 = (kid, dt, t) => {
      wave = damp(wave, G.palWave, 5, dt);
      const w = wave;
      kid.arms[0].rotation.set(-0.9 * (1 - w) - 0.15 * w, 0, 0.15 + 2.55 * w + Math.sin(t * 9) * 0.35 * w);
      kid.arms[1].rotation.set(-0.3 * (1 - w), 0, -0.2 - 0.5 * w);
      kid.body.position.y += Math.abs(Math.sin(t * 7)) * 0.06 * w;
    };
    G.palWave = 0;
  }

  // ---------------------------------------------------------------- helpers
  const cur = (l) => l.swimmers[l.leg];
  const headX = (l) => cur(l).cen.x + l.dir * 0.85;
  const wallX = (l) => l.dir * HX;
  const toWall = (l) => (wallX(l) - headX(l)) * l.dir;
  let now = 0;
  let raceOn = false;
  let over = false;
  let raceT = 0;
  let falseStart = false;
  let whistleAt = -1;
  let finished = 0;
  const say = (html, color, ms) => ui.pop(html, color, ms);

  function dive(l, quality) {
    const s = cur(l);
    l.state = 'air';
    l.airT = 0;
    l.diveQ = quality;
    l.from = s.cen.clone();
    l.to = new THREE.Vector3(-wallX(l) + l.dir * 1.7, WY - 0.12, l.z);
    s.mode = 'air';
    s.pitch = 0;
  }

  function pushOff(l, v) {
    const s = cur(l);
    l.state = 'glide';
    l.glideT = 0;
    l.v = v;
    s.mode = 'glide';
    l.lastStroke = -9;
  }

  // ---------------------------------------------------------------- player input
  function strokeQuality(l, side) {
    const dtS = now - l.lastStroke;
    if (l.lastStroke < 0 || dtS > P + 0.9) return { q: 0.85, word: '', streak: false };
    if (side !== l.nextSide) return { q: 0, word: 'Other arm!', color: '#ffb3c0' };
    const d = dtS - P;
    if (Math.abs(d) <= 0.08) return { q: 1, word: 'Perfect!', color: '#ffd166', streak: true };
    if (d < -0.2) return { q: 0.3, word: 'Too fast!', color: '#ffb3c0' };
    if (d < 0) return { q: 0.62, word: 'Early', color: '#ffffff' };
    if (d <= 0.22) return { q: 0.85, word: 'Good', color: '#bff5d0' };
    return { q: 0.7, word: 'Late', color: '#ffffff' };
  }

  function playerStroke(l, side) {
    const s = cur(l);
    const r = strokeQuality(l, side);
    if (r.q === 0) {
      l.streak = 0;
      say(r.word, r.color, 600);
      sfx.oops();
      pool.spray(s.cen.x + l.dir * 0.7, WY + 0.05, s.cen.z, 4, 0.4);
      return;
    }
    if (!s.stroke(side)) {
      // that arm is still busy: a slip
      l.streak = 0;
      say('Too fast!', '#ffb3c0', 500);
      return;
    }
    if (r.streak) l.streak++;
    else l.streak = 0;
    const boost = l.streak >= 6 ? 1.14 : l.streak >= 3 ? 1.07 : 1;
    // a stroke after a longer gap pulls a little more, so speed comes from good timing, not from tapping fast
    const gap = l.lastStroke < 0 ? 1 : clamp((now - l.lastStroke) / P, 0.5, 1.5);
    l.push = (l.push || 0) + (J * r.q * boost * gap) / PULL;
    l.pushT = Math.max(l.pushT || 0, PULL);
    l.lastStroke = now;
    l.nextSide = 1 - side;
    G.stats.strokes++;
    if (r.streak) G.stats.perfect++;
    if (r.word) say(r.streak && l.streak >= 3 ? `${r.word} x${l.streak}` : r.word, r.color, 520);
    if (r.streak) sfx.perfect(l.streak);
    else sfx.good();
    sfx.stroke(1);
    pool.ripple(s.cen.x + l.dir * 1.0, s.cen.z + (side ? -0.15 : 0.15), 0.7);
    pool.spray(s.cen.x + l.dir * 1.0, WY + 0.05, s.cen.z + (side ? -0.15 : 0.15), r.streak ? 7 : 4, r.streak ? 0.7 : 0.5);
  }

  function input() {
    const I = ctx.input;
    const pads = ui.drain();
    const auto = G.auto;
    let left = I.pressed('arrowleft') || I.pressed('a') || pads.includes('left');
    let right = I.pressed('arrowright') || I.pressed('d') || pads.includes('right');
    let go = I.pressed('jump') || I.pressed('arrowup') || I.pressed('w') || I.pressed('action') || pads.includes('go');
    if (auto) {
      left = right = go = false;
      const l = player;
      if (!raceOn) {
        /* wait for the whistle */
      } else if (l.state === 'set' && now - whistleAt > 0.14) go = true;
      else if (l.state === 'swim') {
        const d = toWall(l);
        if (l.left > 1 && d > FLIP_PERFECT[0] + 0.1 && d < FLIP_PERFECT[1] - 0.2) go = true;
        else if (now - l.lastStroke >= P - 0.01 || l.lastStroke < 0) (l.nextSide ? (right = true) : (left = true));
      } else if (l.state === 'glide' && l.glideT > 0.45) left = l.nextSide === 0;
      if (l.handover && l.handover.state === 'wait' && toWall(l) < l.v * 0.12) go = true;
    }
    return { left, right, go };
  }

  // ---------------------------------------------------------------- simulation
  function stepLane(l, dt, inp) {
    const s = cur(l);
    const isP = l.isPlayer;
    if (l.state === 'done') return;
    if (l.state === 'block' || l.state === 'set') {
      if (raceOn && !isP && now - whistleAt >= l.react) dive(l, 0.9);
      if (raceOn && isP && l.state === 'set' && now - whistleAt > 1.6) {
        say('Off you go!', '#ffffff', 700);
        dive(l, 0.4);
      }
      return;
    }
    if (l.state === 'flop') {
      l.airT += dt;
      const u = Math.min(1, l.airT / 0.45);
      s.cen.x = lerp(l.from.x, l.from.x + l.dir * 1.0, u);
      s.cen.y = lerp(l.from.y, WY + 0.1, u) + Math.sin(u * PI) * 0.25;
      s.pitch = (PI / 2) * u;
      if (u >= 1 && !l.flopped) {
        l.flopped = true;
        pool.splash(s.cen.x + l.dir * 0.3, s.cen.z, 2.2);
        sfx.splash(1.6);
        s.mode = 'tread';
        s.pitch = 0;
        s.cen.y = WY;
        s.yaw = yawFor(l.dir);
      }
      if (l.flopped && raceOn) {
        s.kid.swimLean = 0.6;
        pushOff(l, 0.6);
        l.glideT = 0.5;
      }
      return;
    }
    if (l.state === 'air') {
      l.airT += dt;
      const u = Math.min(1, l.airT / 0.5);
      s.cen.x = lerp(l.from.x, l.to.x, u);
      s.cen.y = lerp(l.from.y, l.to.y, u) + Math.sin(u * PI) * 0.55;
      s.pitch = 0.25 + (PI / 2 + 0.1) * u * u;
      s.mode = 'air';
      if (u >= 1) {
        const v = l.diveQ >= 1 ? 4.6 : l.diveQ >= 0.8 ? 4.1 : l.diveQ >= 0.6 ? 3.7 : 3.2;
        pool.splash(s.cen.x + l.dir * 0.8, l.z, 1.6);
        if (isP || Math.abs(s.cen.x - G.focusX) < 12) sfx.splash(isP ? 1.2 : 0.6);
        pushOff(l, v + (isP ? 0 : (Math.random() - 0.5) * 0.3));
        s.pitch = PI / 2 + 0.35 - 1.25;
        if (isP) G.stats.dive = l.diveQ;
      }
      return;
    }
    if (l.state === 'flip') {
      l.flipT += dt;
      const u = Math.min(1, l.flipT / 0.55);
      s.cen.x = lerp(l.flipFrom, l.flipTo, u * (2 - u));
      s.cen.y = WY - Math.sin(u * PI) * 0.28;
      if (u > 0.35 && !l.flipSplash) {
        l.flipSplash = true;
        pool.splash(l.dir * (HX - 0.6), l.z, 1.1);
        if (isP) sfx.splash(0.8);
      }
      if (u >= 1 || s.mode !== 'flip') {
        l.dir = -l.dir;
        s.mode = 'glide';
        s.yaw = yawFor(l.dir);
        s.pitch = 0;
        pushOff(l, l.flipPush);
      }
      return;
    }
    if (l.state === 'open') {
      l.openT += dt;
      const u = Math.min(1, l.openT / 0.9);
      s.yaw = l.openYaw0 + PI * (u * u * (3 - 2 * u));
      s.cen.y = WY;
      if (u >= 1) {
        l.dir = -l.dir;
        s.cen.x = wallX(l) * -1 + l.dir * 0.75;
        s.yaw = yawFor(l.dir);
        s.kid.swimLean = 1;
        pushOff(l, 2.6);
      }
      return;
    }
    // glide and swim
    if (l.state === 'glide') {
      l.glideT += dt;
      const u = Math.min(1, l.glideT / 0.6);
      s.cen.y = WY - 0.08 - Math.sin(u * PI) * 0.42 * (l.v > 3 ? 1 : 0.6);
      s.pitch = damp(s.pitch, 0, 7, dt);
      if (u >= 1 || (isP && l.glideT > 0.3 && (inp.left || inp.right))) {
        l.state = 'swim';
        s.setMode('swim');
        s.pitch = 0;
        s.kid.swimLean = 1;
        if (!isP) s.autoRate = 1;
      }
      l.v -= l.v * 0.9 * dt;
    }
    if (l.state === 'swim') {
      s.cen.y = damp(s.cen.y, WY, 8, dt);
      s.pitch = damp(s.pitch, 0, 8, dt);
      if (isP) {
        if (inp.left) playerStroke(l, 0);
        if (inp.right) playerStroke(l, 1);
        if (l.pushT > 0) {
          const k = Math.min(dt, l.pushT);
          l.v += l.push * k;
          l.pushT -= dt;
          if (l.pushT <= 0) l.push = 0;
        }
        l.v -= l.v * DRAG * dt;
        if (l.v < KICK) l.v = damp(l.v, KICK, 2, dt);
        l.v = Math.min(l.v, 4.4);
      } else {
        let pace = l.pace * (1 + Math.sin(now * 0.9 + l.wob) * 0.035);
        if (l === partnerLane) {
          const gap = player.dist - l.dist;
          const toGo = totalLen(l) * 2 * HX - l.dist;
          if (toGo > 7) pace += clamp(gap * 0.07, -0.28, 0.3);
        }
        if (G.speedRival) pace *= G.speedRival;
        l.v = damp(l.v, pace, 1.6, dt);
        s.autoRate = clamp(l.v / 1.45, 1.2, 2.6);
      }
      s.speed = l.v;
      // the wall
      const d = toWall(l);
      if (l.left > 1 && isP) {
        l.flipCool -= dt;
        G.flipHint = d < FLIP_ZONE[1] + 2.2 && d > 0;
        if (inp.go && l.flipCool <= 0) {
          if (d > FLIP_ZONE[1]) {
            say('Closer to the wall!', '#ffffff', 700);
            l.flipCool = 0.45;
          } else if (d >= FLIP_ZONE[0]) {
            const perfect = d >= FLIP_PERFECT[0] && d <= FLIP_PERFECT[1];
            startFlip(l, perfect ? 4.3 : 3.6);
            say(perfect ? 'Perfect flip!' : 'Flip turn!', perfect ? '#ffd166' : '#bff5d0', 900);
            if (perfect) sfx.perfect(4);
            G.stats.flip = perfect ? 2 : 1;
            return;
          }
        }
      } else if (l.left > 1 && !isP && d <= 1.25) {
        startFlip(l, 3.5 + (Math.random() - 0.5) * 0.3);
        return;
      }
      if (d <= 0.02) {
        if (l.left > 1) {
          // reached the wall without flipping: a slow open turn
          l.state = 'open';
          l.openT = 0;
          l.openYaw0 = s.yaw;
          l.left--;
          l.v = 0;
          s.mode = 'tread';
          s.kid.swimLean = 0.5;
          if (isP) {
            say('Bonk! Flip a bit sooner', '#ffb3c0', 1100);
            sfx.boing();
            G.stats.flip = 0;
          }
          return;
        }
        touch(l);
        return;
      }
      l.kickT -= dt;
      if (l.kickT <= 0 && l.v > 1 && Math.abs(s.cen.x - G.focusX) < 14) {
        l.kickT = 0.16;
        pool.spray(s.cen.x - l.dir * 0.8, WY + 0.02, s.cen.z, 2, 0.35);
      }
    }
    s.cen.x += l.v * l.dir * dt;
    // keep the centre inside the pool
    s.cen.x = clamp(s.cen.x, -HX + 0.6, HX - 0.6);
  }

  function startFlip(l, push) {
    const s = cur(l);
    l.state = 'flip';
    l.flipT = 0;
    l.flipSplash = false;
    l.flipFrom = s.cen.x;
    l.flipTo = wallX(l) - l.dir * 0.75;
    l.flipPush = push;
    l.left--;
    s.startFlip(0.55);
  }

  function touch(l) {
    const s = cur(l);
    s.cen.x = wallX(l) - l.dir * 0.7;
    pool.splash(wallX(l) - l.dir * 0.2, l.z, 0.9);
    if (l.leg < l.legs - 1) {
      // relay: the next swimmer goes
      l.touchT = now;
      l.state = 'wait';
      s.mode = 'tread';
      s.speed = 0;
      s.autoRate = 0;
      s.cheer = 0;
      const h = l.handover || { state: 'wait', early: false };
      l.handover = h;
      if (!l.isPlayer) h.goAt = now + 0.1 + Math.random() * 0.28;
      else if (h.state === 'ready') h.goAt = Math.max(now, h.pressAt);
      return;
    }
    l.state = 'done';
    l.finishT = raceT;
    l.place = ++finished;
    s.mode = 'tread';
    s.speed = 0;
    s.autoRate = 0;
    if (l.isPlayer || l === partnerLane) sfx.buzzer();
    if (l.isPlayer) {
      G.cam.shake = 0.15;
      if (l.place === 1) {
        pool.crowd.cheer(1);
        sfx.cheer(0.08, 2);
      } else pool.crowd.cheer(0.5);
    }
  }

  // Relay: the next swimmer dives when the player presses Go near the touch
  function stepHandover(l, inp) {
    if (l.legs < 2 || l.leg !== 0) return;
    const next = l.swimmers[1];
    const incoming = cur(l);
    const d = l.state === 'wait' ? 0 : toWall(l);
    const h = l.handover || (l.handover = { state: 'wait' });
    if (next.mode === 'stand' && d < 9 && (l.state === 'swim' || l.state === 'glide')) next.mode = 'set';
    if (l.isPlayer) {
      G.goHint = next.mode === 'set' && h.state !== 'go';
      if (inp.go && h.state !== 'go') {
        const eta = l.state === 'wait' ? now - l.touchT : -d / Math.max(0.5, l.v);
        if (eta < -0.35) {
          h.state = 'early';
          h.earlyAt = now;
          say(`Wait for the touch!`, '#ffb3c0', 900);
          sfx.oops();
          next.kid.squash = 0.8;
        } else {
          h.state = 'ready';
          h.pressAt = now;
          h.q = eta <= 0.25 ? 1 : eta <= 0.55 ? 0.8 : 0.6;
          if (l.state === 'wait') h.goAt = now;
        }
      }
      if (l.state === 'wait' && h.state !== 'ready' && h.state !== 'go' && now - l.touchT > (h.state === 'early' ? 0.5 : 0.8)) {
        h.q = h.state === 'early' ? 0.45 : 0.5;
        h.state = 'ready';
        h.goAt = now;
      }
    }
    if (l.state === 'wait' && h.goAt !== undefined && now >= h.goAt && h.state !== 'go') {
      h.state = 'go';
      const q = l.isPlayer ? h.q || 0.5 : 0.9;
      // swap to the next swimmer
      incoming.cheer = 1;
      l.leg = 1;
      l.dir = -1;
      l.left = l.lengths;
      l.state = 'set';
      next.mode = 'set';
      dive(l, q);
      if (l.isPlayer) {
        say(q >= 1 ? 'Perfect take-over!' : q >= 0.8 ? 'Good take-over' : 'Go go go!', q >= 1 ? '#ffd166' : '#ffffff', 900);
        if (q >= 1) sfx.perfect(5);
        G.stats.handover = q;
        G.onLeg2?.();
      }
    }
  }

  // Distance covered, for the lane bar and the partner's pacing
  function progress(l) {
    const len = 2 * HX;
    if (l.state === 'done') return totalLen(l) * len;
    if (l.state === 'wait') return (l.leg + 1) * l.lengths * len;
    const lenDone = l.leg * l.lengths + (l.lengths - l.left);
    if (l.state === 'flip' || l.state === 'open') return lenDone * len;
    return lenDone * len + clamp(l.dir * headX(l) + HX, 0, len);
  }

  // ---------------------------------------------------------------- the stroke ring and HUD
  const v2 = new THREE.Vector3();
  function hudFrame() {
    if (over) return;
    const l = player;
    const s = cur(l);
    const W = window.innerWidth;
    const H = window.innerHeight;
    if (raceOn && l.state === 'swim') {
      v2.set(s.cen.x + l.dir * 0.2, WY + 1.25, s.cen.z).project(ctx.camera);
      const x = (v2.x * 0.5 + 0.5) * W;
      const y = (-v2.y * 0.5 + 0.5) * H;
      const dtS = now - l.lastStroke;
      if (l.lastStroke < 0 || dtS > P + 0.9) ui.ring(true, x, y, 1.6 + Math.sin(now * 8) * 0.12, l.nextSide ? 'R' : 'L', true);
      else {
        const k = dtS < P ? 1 + 1.5 * (1 - dtS / P) : Math.max(0.5, 1 - (dtS - P) * 1.8);
        ui.ring(true, x, y, k, l.nextSide ? 'R' : 'L', Math.abs(dtS - P) <= 0.08);
      }
    } else ui.ring(false);
    ui.padState('left', 'next', l.state === 'swim' && l.nextSide === 0);
    ui.padState('right', 'next', l.state === 'swim' && l.nextSide === 1);
    const flipNow = l.state === 'swim' && l.left > 1 && G.flipHint;
    const goNow = l.legs > 1 && l.leg === 0 && G.goHint;
    const diveNow = l.state === 'set' || l.state === 'block';
    const showGo = diveNow || goNow || (l.left > 1 && (l.state === 'swim' || l.state === 'glide'));
    ui.pads(showGo ? ['left', 'right', 'go'] : ['left', 'right'], { go: flipNow ? 'Flip' : goNow ? 'Go!' : diveNow ? 'Dive' : 'Flip' });
    ui.padState('go', 'hot', flipNow || goNow || (diveNow && raceOn));
    if (flipNow && toWall(l) < FLIP_PERFECT[1] + 0.4 && toWall(l) > FLIP_ZONE[0] && !G.flipSaid) {
      G.flipSaid = true;
      say(ctx.input && document.body.classList.contains('touch') ? 'Flip now!' : 'Flip now! (Space)', '#ffd166', 700);
    }
    ui.lane(
      true,
      lanes.map((ln) => ({ id: 'l' + ln.i, label: ln.label, color: ln.color, me: ln.isPlayer, p: ln.dist / (totalLen(ln) * 2 * HX) })),
    );
    const placeNow = 1 + lanes.filter((o) => o !== l && (o.finishT !== null ? l.finishT === null || o.finishT < l.finishT : o.dist > l.dist + 0.01)).length;
    hud.score(`${raceT.toFixed(1)} s &nbsp;&middot;&nbsp; ${ORD(placeNow)}`);
  }

  // ---------------------------------------------------------------- camera
  function camFrame(dt) {
    const l = player;
    const s = cur(l);
    G.focusX = s.cen.x;
    const lead = l.state === 'block' || l.state === 'set' ? 3.5 : l.state === 'done' ? 0 : l.dir * 2.4;
    if (!raceOn && (l.state === 'block' || l.state === 'set') && !falseStart) {
      G.cam.goal(-HX + 4.2, 3.0, l.z + 7.4, -HX - 0.2, 0.7, l.z - 0.6, 3);
    } else if (l.state === 'done') {
      G.cam.goal(wallX(l) - l.dir * 4.5, 3.2, l.z + 7.8, wallX(l) - l.dir * 0.8, -0.1, l.z - 0.5, 2.5);
    } else {
      const k = kind === 'relay' && l.leg === 0 && toWall(l) < 7 && l.state !== 'wait' ? 1 : 0;
      const cx = clamp(s.cen.x + lead * (1 - k * 0.4), -HX + 3.5, HX - 3.5);
      const lx = clamp(s.cen.x + lead * 1.1, -HX + 3, HX - 3);
      G.cam.goal(cx, 6.2 - k * 1.4, l.z + 11.2 - k * 2.5, lx, -0.45, l.z - 1.6, 3.2);
    }
  }

  // ---------------------------------------------------------------- run
  ctx.hud.title(G.title, cfg.sub);
  ui.pads(['left', 'right', 'go'], { go: 'Dive' });
  hud.buttons({ action: null, jump: null, stick: false });
  hud.hint(kind === 'race' ? 'Left / Right in turn to swim, Space to dive and to flip at the wall' : kind === 'relay' ? 'Left / Right in turn to swim, Space to dive and to send your partner off' : 'Left / Right in turn to swim with the ring, Space (or any key) to dive at the whistle');
  pool.drawBoard(cfg.title, lanes.map((l) => ({ left: `Lane ${l.i + 1}`, name: l.name, right: '', color: l.color, hi: l.isPlayer })), cfg.foot || '');
  G.stats = { strokes: 0, perfect: 0, dive: 0, flip: null, handover: null };
  G.flipSaid = false;
  G.kickT = 0;
  G.cam.cut(-HX + 6.5, 3.6, player.z + 9, -HX - 0.2, 0.6, player.z - 0.6);

  G.evState = () => ({ kind, raceOn, now: +G.now.toFixed(3), raceT: +raceT.toFixed(2), st: player.state, leg: player.leg, x: +headX(player).toFixed(2), v: +player.v.toFixed(2), place: player.place, since: player.lastStroke < 0 ? -1 : +(G.now - player.lastStroke).toFixed(3), P, next: player.nextSide, d: +toWall(player).toFixed(2), left: player.left, legs: player.legs, ho: player.handover?.state || null, streak: player.streak, stats: G.stats, lanes: lanes.map((l) => `${l.state}:${l.dist.toFixed(1)}`) });
  G.tick = (dt, t) => {
    now = G.now;
    const inp = input();
    if (raceOn) raceT += dt;
    // false start
    if (!raceOn && player.state === 'set' && (inp.go || inp.left || inp.right) && !falseStart) {
      falseStart = true;
      const s = cur(player);
      player.state = 'flop';
      player.airT = 0;
      player.from = s.cen.clone();
      s.mode = 'air';
      say('Too soon! Wait for the whistle', '#ffb3c0', 1300);
      sfx.oops();
      G.stats.dive = 0;
    }
    if (raceOn && player.state === 'set' && (inp.go || inp.left || inp.right)) {
      const r = now - whistleAt;
      const q = r < 0.3 ? 1 : r < 0.55 ? 0.8 : 0.6;
      dive(player, q);
      say(q >= 1 ? 'Great dive!' : q >= 0.8 ? 'Good dive' : 'Dive!', q >= 1 ? '#ffd166' : '#ffffff', 900);
      if (q >= 1) sfx.perfect(3);
    }
    for (const l of lanes) {
      stepHandover(l, l.isPlayer ? inp : {});
      stepLane(l, dt, l.isPlayer ? inp : {});
      l.dist = progress(l);
    }
    // the first relay swimmer and finished swimmers face the camera and cheer
    for (const l of lanes) {
      for (let k = 0; k < l.swimmers.length; k++) {
        const s = l.swimmers[k];
        const doneHere = l.state === 'done' ? k === l.leg : k < l.leg;
        if (doneHere && s.mode === 'tread') {
          s.yaw = damp(s.yaw, 0, 2.5, dt);
          if (k < l.leg) s.cen.z = damp(s.cen.z, l.z - 0.45, 2, dt); // out of the way of the next swimmer
          s.cen.y = damp(s.cen.y, WY, 6, dt);
          const won = l.place === 1 || (k < l.leg && l.isPlayer);
          s.cheer = damp(s.cheer, won ? 1 : l.isPlayer || l === partnerLane ? 0.6 : 0.25, 3, dt);
        }
      }
    }
    if (kind === 'sprint') G.palWave = raceOn && player.state !== 'done' && player.dist > 9 ? 1 : 0;
    for (const s of [me, pal, ...npcs]) if (s.visible) s.update(dt, t);
    const a = cur(player);
    const b = partnerLane ? cur(partnerLane) : kind === 'relay' ? (player.leg === 0 ? player.swimmers[1] : player.swimmers[0]) : null;
    const foam = (s, dir) => ({ x: s.cen.x, z: s.cen.z, speed: s.mode === 'swim' || s.mode === 'glide' ? s.speed + 0.5 : 0.4, dir: [dir, 0], on: s.cen.y < WY + 0.4 && s.cen.y > WY - 1 && s.mode !== 'stand' && s.mode !== 'set' });
    G.foam = [foam(a, player.dir), b ? foam(b, partnerLane ? partnerLane.dir : -1) : null].filter(Boolean);
    G.clockT = raceT;
    hudFrame();
    camFrame(dt);
  };

  // intro
  G.focusX = -HX;
  ui.big(`<div class="e">${cfg.eyebrow}</div><div class="n">${cfg.title}</div><div class="s">${cfg.tip}</div>`, 2600);
  if (kind === 'sprint') setTimeout(() => G.alive() && G.line(`${G.names.pal} waits at the finish with a towel`), 800);
  await G.wait(2.8);
  if (!G.alive()) return null;
  // take your marks
  say('Take your marks', '#ffffff', 1100);
  sfx.beep();
  for (const l of lanes) {
    l.state = 'set';
    cur(l).mode = 'set';
  }
  await G.wait(1.1 + Math.random() * 1.1);
  if (!G.alive()) return null;
  raceOn = true;
  whistleAt = G.now;
  sfx.whistle();
  say('Go!', '#ffd166', 700);
  // wait for everyone to finish (the player always does, kicking keeps you moving)
  await G.until(() => player.state === 'done');
  const grace = raceT + 7;
  await G.until(() => lanes.every((l) => l.state === 'done') || raceT > grace);
  if (!G.alive()) return null;
  raceOn = false;
  over = true;
  ui.ring(false);
  ui.pads([]);
  ui.lane(false);
  G.flipHint = G.goHint = false;

  // results
  for (const l of lanes) if (l.finishT === null) {
    l.finishT = raceT + 1;
    l.place = ++finished;
  }
  const place = player.place;
  const stars = place === 1 ? 3 : place === 2 ? 2 : 1;
  const sorted = lanes.slice().sort((a, b) => a.place - b.place);
  pool.drawBoard(cfg.title, sorted.map((l) => ({ left: ORD(l.place), name: l.name, right: `${l.finishT.toFixed(2)} s`, color: l.color, hi: l.isPlayer })), place === 1 ? 'New gala champion!' : 'Well swum!');
  hud.score(`${player.finishT.toFixed(2)} s &nbsp;&middot;&nbsp; ${ORD(place)}`);
  await G.wait(1.3);
  if (!G.alive()) return null;

  // the moment after the race
  if (kind === 'sprint') await towelMoment(G, player, towelHeld, place);
  else if (kind === 'race') await raceMoment(G, player, partnerLane, place);
  else await relayMoment(G, player, place);
  if (!G.alive()) return null;
  return { stars, time: player.finishT, place, text: `${ORD(place)} in ${player.finishT.toFixed(2)} s`, short: `${ORD(place)}, ${player.finishT.toFixed(2)} s` };
}

// Sprint: the partner wraps the champion in the towel
async function towelMoment(G, player, towelHeld, place) {
  const { me, pal, pool, ui, sfx, ctx } = G;
  ui.wipe(true);
  await G.wait(0.45);
  if (!G.alive()) return;
  G.tick = (dt, t) => {
    me.update(dt, t);
    pal.update(dt, t);
    G.foam = [];
  };
  const tx = HX + 2.7;
  const tz = player.z + 0.6;
  me.place('stand', tx - 0.3, DECK, tz, PI / 2 - 0.55);
  pal.place('stand', tx + 0.3, DECK, tz, -PI / 2 + 0.55);
  me.walk = pal.walk = 0;
  pal.pose2 = null;
  towelHeld?.removeFromParent();
  const drape = towelDrape(G.palIsHomama ? '#7fb8ff' : '#ff8fb1');
  me.kid.body.add(drape);
  G.drape = drape;
  G.cam.cut(tx + 0.5, 1.7, tz + 3.7, tx, 0.82, tz);
  pool.spray(me.cen.x, DECK + 0.6, me.cen.z, 14, 0.6);
  ui.wipe(false);
  await G.wait(0.5);
  pal.kid.emote(G.palIsHomama || place === 1 ? 'heart' : 'cheer');
  me.kid.emote(place === 1 ? 'cheer' : 'wave');
  sfx.sparkle();
  const lines = G.palIsHomama
    ? [place === 1 ? 'Wrapped up warm, my champion.' : 'Wrapped up warm. You were lovely out there.', 'Fastest doctor in the pool.']
    : [place === 1 ? 'My speedy engineer! Towel time.' : 'Towel time, you did great!'];
  G.line(`${G.names.pal}: ${lines[Math.floor(Math.random() * lines.length)]}`);
  await G.wait(2.6);
}

// Race: whoever wins, they meet at the lane rope
async function raceMoment(G, player, palLane, place) {
  const { me, pal, sfx } = G;
  const meWon = place < palLane.place;
  const lines = G.palIsHomama
    ? meWon
      ? ['That is my doctor! You were flying.', 'I tried my best and you still flew past me.']
      : ['I only won because I was swimming toward you.', 'Rematch? I like losing to you too.']
    : meWon
      ? ['You won! Now carry me to the snack kiosk.', 'Show off! I love it.']
      : ['I won! You can buy the ice cream.', 'Next time I will let you win. Maybe.'];
  G.line(`${G.names.pal}: ${lines[Math.floor(Math.random() * lines.length)]}`);
  sfx.cheer(0.06, 1.6);
  G.ctx.fx.heartsAt(new THREE.Vector3((me.cen.x + pal.cen.x) / 2, 1.3, (me.cen.z + pal.cen.z) / 2), 5);
  await G.wait(2.6);
}

// Relay: the team hug on the deck
async function relayMoment(G, player, place) {
  const { me, pal, pool, ui, sfx } = G;
  ui.wipe(true);
  await G.wait(0.45);
  if (!G.alive()) return;
  G.tick = (dt, t) => {
    me.update(dt, t);
    pal.update(dt, t);
    G.foam = [];
  };
  const x = -HX - 1.9;
  const z = player.z + 0.6;
  me.place('stand', x - 0.27, DECK, z, PI / 2 - 0.55);
  pal.place('stand', x + 0.27, DECK, z, -PI / 2 + 0.55);
  me.pose2 = pal.pose2 = null;
  G.cam.cut(x - 0.3, 1.75, z + 3.9, x, 0.82, z);
  ui.wipe(false);
  await G.wait(0.4);
  me.kid.emote('hug');
  pal.kid.emote('hug');
  pool.spray(x, DECK + 0.9, z, 10, 0.5);
  sfx.sparkle();
  G.ctx.fx.heartsAt(new THREE.Vector3(x, 1.5, z), 6);
  G.line(place === 1 ? `Team ${G.names.me} and ${G.names.pal} wins the relay!` : 'The best team hug in the pool.');
  await G.wait(2.6);
}
