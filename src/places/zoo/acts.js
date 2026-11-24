import * as THREE from 'three';
import { damp, dampAngle, clamp, lerp } from '../../util.js';
import { DECK } from './scenery.js';
import { CAKE, LADDER, HOSE, CHART, PAPER, RADIO, makeLadder, makeBrush, makeNozzle, makeBar, makePaper, makeGlasses, makeFlames, makeCarrot, makeLettuce, makeLeafHat, makeRainbow, makeSwarm, noteGeometry } from './extras.js';

// The v4 giraffe activities: a birthday song, neck brushing from the rolling ladder, bath time with the
// hose, the height chart, the morning paper, the giraffe disco and two new treats at the deck stall.
// Every scene seats both kids (an activity) and scripts Jodi and Jouri, who always react differently.
//
// Z (from zoo.js): { group, dynamic, jodi, jouri, giraffes, puff, say, tone, later, begin, scene, name,
//   freeGiraffe, watch(kind, at), kidsOnDeck }

const MIDI = (n) => 440 * Math.pow(2, (n - 69) / 12);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function makeActs(Z) {
  const { jodi, jouri, giraffes } = Z;
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();

  // ------------------------------------------------ props
  const addDyn = (o) => {
    Z.group.add(o);
    Z.dynamic.push(o);
    return o;
  };
  const ladder = addDyn(makeLadder(Z.atlas));
  ladder.position.set(LADDER.x, 0, LADDER.z);
  const nozzle = addDyn(makeNozzle());
  const nozzleRest = () => {
    if (nozzle.parent !== Z.group) Z.group.add(nozzle);
    nozzle.position.set(HOSE.x + 0.3, 0.42, HOSE.z + 0.12);
    nozzle.rotation.set(0.9, 0, 0);
  };
  nozzleRest();
  const bar = makeBar();
  addDyn(bar.root);
  bar.root.position.set(CHART.x, 4.95, CHART.z);
  bar.root.visible = false;
  const paper = makePaper();
  addDyn(paper.root);
  paper.root.visible = false;
  const glasses = makeGlasses();
  glasses.position.set(0, 0.17, 0.31);
  glasses.visible = false;
  jodi.head.add(glasses);
  const leafHat = makeLeafHat();
  leafHat.position.set(0, 0.36, 0.02);
  leafHat.rotation.set(0.15, 0, -0.25);
  leafHat.visible = false;
  jouri.head.add(leafHat);
  let leafHatT = 0;
  const flames = makeFlames();
  for (const f of flames) {
    addDyn(f);
    f.visible = false;
  }
  const rainbow = addDyn(makeRainbow());
  rainbow.visible = false;
  // Water drops and music notes: one instanced mesh each
  const DROPS = 140;
  const drops = addDyn(makeSwarm(DROPS, new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#a8e6ff', roughness: 0.15 })));
  const dropList = Array.from({ length: DROPS }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 0.03 }));
  let dropNext = 0;
  const NOTES = 10;
  const notes = addDyn(makeSwarm(NOTES, noteGeometry(), new THREE.MeshStandardMaterial({ roughness: 0.5 })));
  const noteCols = ['#ef5b6f', '#8b5cf6', '#21a99a', '#ffb347', '#ff8fb1'].map((c) => new THREE.Color(c));
  for (let i = 0; i < NOTES; i++) notes.setColorAt(i, noteCols[i % noteCols.length]);
  const noteList = Array.from({ length: NOTES }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: 0 }));
  let noteNext = 0;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const sc = new THREE.Vector3();

  function spray(from, vel, n = 1, spread = 0.25, size = 0.03) {
    for (let i = 0; i < n; i++) {
      const d = dropList[dropNext];
      dropNext = (dropNext + 1) % DROPS;
      d.life = 1;
      d.p.copy(from);
      d.v.copy(vel).add(tmp2.set((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread));
      d.s = size * (0.7 + Math.random() * 0.6);
    }
    drops.visible = true;
  }
  // Velocity that throws a drop from a to b in time T under gravity
  const lob = (a, b, T, out = new THREE.Vector3()) => out.set((b.x - a.x) / T, (b.y - a.y) / T + 4.9 * T, (b.z - a.z) / T);
  function note(at) {
    const n = noteList[noteNext];
    noteNext = (noteNext + 1) % NOTES;
    n.life = 1;
    n.p.copy(at);
    n.v.set((Math.random() - 0.5) * 0.5, 0.7 + Math.random() * 0.3, 0.1);
    n.r = (Math.random() - 0.5) * 0.6;
    notes.visible = true;
  }

  // ------------------------------------------------ sound
  const S = () => Z.api0.sound;
  const T = (f, d, dur, o) => Z.tone(f, d, dur, o);
  const sfx = {
    hiss(dur = 0.5) {
      const s = S();
      const c = s?.ctx;
      if (!c || s.muted || !s.noise || !s.sfx) return;
      const src = c.createBufferSource();
      src.buffer = s.noise;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 3200;
      f.Q.value = 0.8;
      const g = c.createGain();
      const t0 = c.currentTime;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f).connect(g).connect(s.sfx);
      src.start(t0);
      src.stop(t0 + dur + 0.05);
    },
    creak: () => [0, 0.14].forEach((d, i) => T(420 - i * 60, d, 0.1, { type: 'triangle', gain: 0.035, slideTo: 300 - i * 40 })),
    blow: () => T(900, 0, 0.45, { type: 'sawtooth', gain: 0.018, slideTo: 300, attack: 0.04 }),
    crunch: () => [0, 0.07, 0.15].forEach((d) => T(140 + Math.random() * 60, d, 0.05, { type: 'square', gain: 0.03, slideTo: 80 })),
    ding: () => [0, 0.09].forEach((d, i) => T(MIDI(84 + i * 4), d, 0.5, { gain: 0.06 })),
    tada: () => [72, 76, 79, 84].forEach((n, i) => T(MIDI(n), i * 0.08, 0.45, { type: 'triangle', gain: 0.05 })),
    whistle: () => T(MIDI(88), 0, 0.3, { gain: 0.04, slideTo: MIDI(95) }),
    paper: () => [0, 0.06, 0.12].forEach((d) => T(2400 + Math.random() * 800, d, 0.04, { type: 'square', gain: 0.012 })),
  };

  // Plays [time, midi, dur, opts] notes relative to the scene clock, a little ahead, so it stops with the scene
  function sequencer(list) {
    let i = 0;
    return (s) => {
      const c = S()?.ctx;
      while (i < list.length && list[i][0] <= s.t + 0.15) {
        const [at, n, dur, o] = list[i++];
        if (c && !S().muted) S().tone(MIDI(n), c.currentTime + Math.max(0, at - s.t), dur, { gain: 0.05, type: 'triangle', ...o });
      }
    };
  }

  // ------------------------------------------------ scene helpers
  const cues = (s, clock = s.t) => {
    let i = 0;
    return (time, fn) => {
      const k = i++;
      if (clock >= time && !s.done[k]) {
        s.done[k] = true;
        fn();
      }
    };
  };
  const actor = (api, who) => (who === 'player' ? api.player : who === 'partner' ? api.partner : api[who]);
  function put(api, who, x, z, y, yaw, speed = 0) {
    const a = actor(api, who);
    const w = api.world(x, z, y);
    a.pos.set(w.x, 0, w.z);
    a.y = y;
    a.vy = 0;
    a.yaw = yaw;
    a.speed = speed;
    a.kid.root.position.set(w.x, y, w.z);
    a.kid.root.rotation.set(0, yaw, 0);
  }
  // Walk a kid from a to b as k goes 0..1, then turn to yawEnd
  function glide(api, who, a, b, k, yawEnd, dt) {
    const ac = actor(api, who);
    const kk = clamp(k, 0, 1);
    const moving = kk > 0 && kk < 1 && Math.hypot(b.x - a.x, b.z - a.z) > 0.05;
    const want = moving ? Math.atan2(b.x - a.x, b.z - a.z) : yawEnd;
    const yaw = dampAngle(ac.yaw, want, 10, dt);
    put(api, who, lerp(a.x, b.x, kk), lerp(a.z, b.z, kk), lerp(a.y ?? 0, b.y ?? 0, kk), yaw, moving ? 1.8 : 0);
  }
  const localOf = (api, who) => api.localPos(actor(api, who));
  const headOf = (api, who, out = new THREE.Vector3()) => out.copy(localOf(api, who)).add(tmp2.set(0, 1.15, 0));
  const worldToLocal = (v) => Z.group.worldToLocal(v);

  // Giraffe driving: st.m = 'walk' (to x, z, then face yaw) | 'reach' (mouth to a target, facing +Z) | 'free'
  const newSt = () => ({ m: 'free', p: {}, k: 0, here: false, going: false, sol: null, hk: 0 });
  function mode(st, m, p = {}) {
    Object.assign(st, { m, p, k: 0, here: false, going: false, sol: null, hk: 0 });
  }
  function drive(g, st, dt) {
    st.k += dt;
    const p = st.p;
    if (st.m === 'walk') {
      if (!st.going) {
        st.going = true;
        g.goTo(p.x, p.z, g.cfg.walk * (p.mul ?? 2));
      }
      if (!st.here && (g.arrived || st.k > 9)) {
        st.here = true;
        g.dest = null;
      }
      if (st.here) {
        g.faceYaw = p.yaw ?? 0;
        st.hk += dt;
      }
      if (p.look) g.lookAt = p.look;
      return st.here;
    }
    if (st.m === 'reach') {
      if (!st.sol) st.sol = g.solve(p.target, p.opts || {});
      if (!st.going) {
        st.going = true;
        g.goTo(st.sol.x, st.sol.z, g.cfg.walk * (p.mul ?? 2));
      }
      if (!st.here) {
        g.lookAt = p.target;
        if (g.arrived || st.k > 9) {
          st.here = true;
          g.dest = null;
        }
        return false;
      }
      st.hk += dt;
      g.faceYaw = 0;
      g.pos.x = damp(g.pos.x, st.sol.x, 3, dt);
      g.pos.z = damp(g.pos.z, st.sol.z, 3, dt);
      g.T.reach = st.sol.r * (p.reachK ?? 1);
      g.T.pitch = p.pitch ?? st.sol.pitch;
      g.T.twist = 0;
      g.T.roll = 0;
      g.R.reach = p.rate ?? 2.4;
      return st.hk > (p.settle ?? 1.1);
    }
    return false;
  }
  const mouthOf = (g, out = new THREE.Vector3()) => g.localOf(g.mouthAnchor, out);
  const neckOf = (g, i = 3, out = new THREE.Vector3()) => g.localOf(g.segs[i], out);
  // only: script just this giraffe and let the other one wander (and step aside) as usual
  function startScene(api, spec, extra = {}, only = null) {
    const s = Z.begin(api, spec, { t: 0, done: {}, ...extra });
    for (const g of giraffes) {
      if (only && g !== only) continue;
      g.beh = null;
      g.dest = null;
    }
    s.js = newSt();
    s.ju = newSt();
    if (!only || only === jodi) jodi.script = { step: (g, dt) => s.jodiStep?.(g, dt) };
    if (!only || only === jouri) jouri.script = { step: (g, dt) => s.jouriStep?.(g, dt) };
    s.cleanup = () => {
      Z.freeGiraffe(jodi);
      Z.freeGiraffe(jouri);
      s.onClean?.();
      Z.watch('done');
    };
    return s;
  }
  const count = (api, key) => {
    const n = (api.load(key, 0) || 0) + 1;
    api.save(key, n);
    return n;
  };
  // Jodi's long sigh, as a pose (for scenes where she is scripted)
  function sighPose(g, k, out) {
    g.T.browL = g.T.browR = 0.8;
    g.T.tiltL = g.T.tiltR = -0.2;
    if (k < 0.7) g.T.lid = 0.45;
    else if (k < 1.8) {
      g.T.lid = 0.96;
      g.T.pitch += 0.25;
      g.T.ear = 0.75;
      if (!out.sighed) {
        out.sighed = true;
        Z.say('sigh');
        const m = mouthOf(g);
        Z.puff(m, '#f4fbff', 4, 0.3, 0.07, 0.1);
      }
    } else g.T.lid = 0.6;
  }

  // ================================================= 1. Birthday corner
  const BDAY = {
    lines: [
      ['Happy birthday, Jodi and Jouri!', 'Jodi wished for a quiet day. Jouri wished for more cake.'],
      ['Happy birthday, Jodi and Jouri!', 'Jodi bows to say thank you. Jouri bows too, then falls over a little.'],
      ['Happy birthday, Jodi and Jouri!', 'Two candles, two wishes, one very sticky giraffe.'],
    ],
  };
  // The tune, in two lines: "Happy birthday to you" twice, the second line ending home
  const SONG = (() => {
    const a = [[67, 0.36], [67, 0.14], [69, 0.5], [67, 0.5], [72, 0.5], [71, 0.95]];
    const b = [[67, 0.36], [67, 0.14], [69, 0.5], [67, 0.5], [74, 0.5], [72, 1.0]];
    const out = [];
    let t = 1.0;
    for (const [n, d] of [...a, ...b]) {
      out.push([t, n, d * 0.95, { gain: 0.06 }], [t, n - 12, d * 0.9, { gain: 0.025, type: 'sine' }]);
      t += d;
    }
    return { notes: out, end: t };
  })();

  function birthday(api) {
    if (Z.scene) return;
    const n = count(api, 'birthdays');
    const v = pick(['sneeze', 'lick', 'hard']);
    const hug = n % 3 === 2;
    const P = { x: -10.85, z: -1.95 };
    const Q = { x: -10.12, z: -1.85 };
    const s = startScene(
      api,
      {
        label: 'Stop singing',
        seats: [
          { who: 'player', x: P.x, z: P.z, y: 0, yaw: Math.PI, pose: 'stand' },
          { who: 'partner', x: Q.x, z: Q.z, y: 0, yaw: Math.PI - 0.15, pose: 'stand' },
        ],
        focus: { x: -9.9, z: -2.6, y: 2.4, zoom: 0.6 },
      },
      { song: sequencer(SONG.notes) },
    );
    const cake = new THREE.Vector3(CAKE.x, CAKE.top + 0.1, CAKE.z);
    const jodiT = new THREE.Vector3(Math.max(-10.4, CAKE.x - 0.08), CAKE.top + 0.34, CAKE.z - 0.42);
    const j0 = SONG.end + 3.6;
    const tEnd = j0 + (hug ? 5.8 : 4.4);
    s.onClean = () => {
      for (const f of flames) f.visible = false;
      noseDab.visible = false;
    };
    mode(s.js, 'reach', { target: jodiT, opts: { pitch: 0.42, maxZ: -3.6 }, mul: 2.6 });
    mode(s.ju, 'walk', { x: -8.75, z: -4.5, yaw: -0.5, mul: 2.6, look: cake });
    const blowOut = (i, big) => {
      const f = flames[i];
      Z.puff(tmp.copy(f.position).add(tmp2.set(0, 0.05, 0.05)), big ? '#ffffff' : '#f4fbff', big ? 8 : 4, big ? 1 : 0.35, big ? 0.06 : 0.04, 0.25);
      f.visible = false;
      sfx.blow();
    };
    s.jodiStep = (g, dt) => {
      drive(g, s.js, dt);
      const singing = s.t > SONG.notes[0][0] && s.t < SONG.end;
      if (s.js.m === 'reach' && s.js.here) {
        g.T.lid = singing ? 0.55 : 0.4;
        g.T.browR = 0.9;
        if (singing) g.A.pitch += Math.sin(s.t * Math.PI * 2) * 0.05;
        if (s.t > SONG.end + 0.1 && s.t < SONG.end + 0.8) g.T.lid = 1; // a quiet wish
        if (s.t > SONG.end + 0.8 && s.t < SONG.end + 1.3) {
          g.T.jaw = 0.12;
          g.A.z = 0.04;
        }
      }
      if (s.js.m === 'walk') {
        g.T.lid = 0.35;
        g.T.browL = 0.5;
        if (s.t > tEnd - 2.2) g.A.pitch += Math.sin((s.t - (tEnd - 2.2)) * 6) * 0.2 * (s.t < tEnd - 0.8 ? 1 : 0);
      }
    };
    const jouriT = new THREE.Vector3(-10.4 + 0.15, CAKE.top + 0.32, CAKE.z - 0.4);
    s.jouriStep = (g, dt) => {
      drive(g, s.ju, dt);
      const singing = s.t > SONG.notes[0][0] && s.t < SONG.end;
      g.T.tail = 0.8;
      if (s.ju.m === 'walk') {
        if (singing) {
          g.A.y = Math.abs(Math.sin(s.t * Math.PI * 2)) * 0.12;
          g.A.ear = Math.sin(s.t * 12) * 0.3;
          g.T.tongue = 0.5;
        }
        if (s.t > tEnd - 2.4) {
          const hop = Math.abs(Math.sin((s.t - tEnd) * 5));
          g.A.y = hop * 0.25;
          g.A.tuck = hop;
          g.T.wink = 1;
        }
        return;
      }
      if (!s.ju.here) return;
      const k = s.ju.hk;
      if (v === 'sneeze') {
        if (k < 1.0) {
          g.T.lid = 0.6 + k * 0.3;
          g.T.browL = g.T.browR = 0.9;
          g.A.pitch = Math.sin(k * 40) * 0.02 * k;
        } else {
          const t2 = k - 1.0;
          g.A.pitch = Math.exp(-t2 * 5) * 0.6;
          g.T.lid = t2 < 0.4 ? 1 : 0.1;
          g.A.yaw = Math.sin(t2 * 22) * 0.2 * Math.exp(-t2 * 2);
        }
      } else if (v === 'lick') {
        const lick = k > 0.3 && k < 1.6;
        g.T.tongue = lick ? 1.5 : 0.3;
        g.T.tCurl = lick ? 0.5 + Math.sin(k * 9) * 0.4 : 0;
        g.T.lid = lick ? 0.8 : 0.1;
        if (k > 1.9 && k < 2.4) {
          g.T.jaw = 0.1;
          g.T.tongue = 0;
        }
      } else {
        g.A.z = k > 0.8 && k < 1.4 ? -0.08 : k > 1.4 && k < 1.9 ? 0.12 : 0;
        g.T.lid = k > 1.4 && k < 1.9 ? 1 : 0;
        g.T.jaw = k > 1.4 && k < 1.9 ? 0.3 : 0;
        g.T.browL = g.T.browR = k < 1.4 ? 0.9 : 0.3;
      }
    };
    const noseDabParent = jouri.head;
    s.step = (dt) => {
      s.t += dt;
      s.song(s);
      const at = cues(s);
      at(0.25, () => {
        flames.forEach((f) => (f.visible = true));
        Z.say('pop');
        Z.watch('look', cake);
      });
      at(SONG.end + 1.15, () => blowOut(0, false));
      at(SONG.end + 1.7, () => {
        Z.say('hum');
        mode(s.js, 'walk', { x: -9.4, z: -6.0, yaw: 0.3, mul: 1.6, look: cake });
      });
      at(SONG.end + 2.0, () => mode(s.ju, 'reach', { target: jouriT, opts: { pitch: 0.35, maxZ: -3.6 }, mul: 2.6, settle: 0.5 }));
      // Jouri's turn, once her reach has settled
      if (v === 'sneeze') {
        at(j0, () => Z.say('ahh'));
        at(j0 + 1.0, () => {
          Z.say('sneeze');
          blowOut(1, true);
          api.fx.burst(api.world(CAKE.x, CAKE.z + 0.2, CAKE.top + 0.2), ['#ffd166', '#ff8fb1', '#21a99a', '#ffffff'], 26);
        });
      } else if (v === 'lick') {
        at(j0 + 0.4, () => Z.say('lick'));
        at(j0 + 1.0, () => {
          Z.say('lick');
          noseDab.visible = true;
          if (noseDab.parent !== noseDabParent) noseDabParent.add(noseDab);
        });
        at(j0 + 2.0, () => blowOut(1, false));
      } else {
        at(j0 + 0.8, () => Z.say('ahh'));
        at(j0 + 1.45, () => {
          blowOut(1, true);
          for (const who of ['player', 'partner']) {
            actor(api, who).kid.squash = 0.8;
            Z.puff(headOf(api, who, tmp), '#f4fbff', 5, 0.8, 0.06, 0.2);
          }
        });
      }
      at(j0 + 2.4, () => {
        mode(s.ju, 'walk', { x: -8.6, z: -4.9, yaw: -0.3, mul: 2.2, look: headOf(api, 'player', new THREE.Vector3()) });
        const L = BDAY.lines[(n - 1) % BDAY.lines.length];
        const extra = v === 'sneeze' ? 'Jouri sneezed her candle out. That counts.' : v === 'lick' ? 'Jouri licked the frosting first. Then she blew.' : 'Jouri blew so hard the kids felt the breeze.';
        api.toast(`<b>${L[0]}</b> ${n === 1 ? L[1] : pick([L[1], extra])}`, 3800);
        api.fx.heartsAt(jodi.worldOf(jodi.head, new THREE.Vector3()), 2);
        api.fx.heartsAt(jouri.worldOf(jouri.head, new THREE.Vector3()), 3);
        Z.say('giggle');
        sfx.tada();
        api.emote('player', 'cheer');
        api.emote('partner', 'cheer');
        Z.watch('cheer');
      });
      // Now and then a little hug once the candles are out
      if (hug) {
        at(j0 + 3.6, () => {
          const mx = (P.x + Q.x) / 2;
          put(api, 'player', mx - 0.28, -1.9, 0, Math.PI / 2);
          put(api, 'partner', mx + 0.28, -1.9, 0, -Math.PI / 2);
          api.emote('roji', 'hug');
          api.emote('homama', 'hug');
        });
        at(j0 + 4.6, () => api.fx.heartsAt(api.world((P.x + Q.x) / 2, -1.9, 1.7), 3));
      }
      if (s.t > tEnd) api.endActivity();
    };
    s.arms = (t) => {
      if (s.t < 0.8 || s.t > SONG.end + 0.3) return;
      // Clap along with the song
      for (const who of ['player', 'partner']) {
        const k = actor(api, who).kid;
        const c = Math.sin(t * 13) * 0.22;
        k.arms[0].rotation.set(-1.15, 0, -0.55 + c);
        k.arms[1].rotation.set(-1.15, 0, 0.55 - c);
      }
    };
  }
  const noseDab = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }));
  noseDab.position.set(0, 0.03, 0.42);
  noseDab.scale.set(1.2, 0.8, 0.8);
  noseDab.visible = false;
  jouri.head.add(noseDab);

  // ================================================= 2. Neck brushing from the rolling ladder
  function brush(api) {
    if (Z.scene) return;
    const n = count(api, 'brushes');
    const first = n % 2 ? jodi : jouri;
    const second = first === jodi ? jouri : jodi;
    const L = LADDER;
    const topZ = L.z - 1.08;
    const bottom = { x: L.x, z: L.z + 0.3, y: 0 };
    const top = { x: L.x, z: topZ, y: L.top };
    const helper = { x: L.x - 0.68, z: L.z - 0.2 };
    const s = startScene(api, {
      label: 'Climb down',
      seats: [
        { who: 'player', x: bottom.x, z: bottom.z, y: 0, yaw: Math.PI, pose: 'stand' },
        { who: 'partner', x: helper.x, z: helper.z, y: 0, yaw: Math.PI / 2 + 0.25, pose: 'stand', hands: 'hold' },
      ],
      focus: { x: L.x + 0.45, z: -2.6, y: 2.5, zoom: 0.5 },
    });
    const kid = api.player.kid;
    const tool = makeBrush();
    tool.position.set(0, -0.2, 0.02);
    tool.rotation.set(-0.4, 0, 0);
    kid.arms[1].add(tool);
    s.onClean = () => {
      tool.removeFromParent();
      ladder.position.set(L.x, 0, L.z);
      for (const a of [api.player, api.partner]) {
        a.y = 0;
        a.vy = 0;
      }
      put(api, 'player', bottom.x + 0.2, bottom.z + 0.4, 0, Math.PI);
    };
    // The giraffe stands right at the fence so her neck rises just in front of the ladder
    const stance = { x: L.x + 0.34, z: -3.55, yaw: 0 };
    const target = new THREE.Vector3(L.x, 2.7, topZ);
    const wait = { jodi: { x: -6.9, z: -4.9, yaw: -0.4 }, jouri: { x: -6.6, z: -4.4, yaw: -0.6 } };
    const stOf = (g) => (g === jodi ? s.js : s.ju);
    mode(stOf(first), 'walk', { ...stance, mul: 2.2, look: target });
    mode(stOf(second), 'walk', { ...wait[second.cfg.id], mul: 1.8, look: target });
    s.phase = 'climb';
    s.pk = 0;
    s.brushing = null;
    s.roll = 0;
    const express = (g, dt) => {
      const st = stOf(g);
      drive(g, st, dt);
      const isJodi = g === jodi;
      if (s.brushing === g && st.here) {
        const k = s.pk;
        g.T.lean = 0.12;
        g.T.twist = 0;
        if (isJodi) {
          // Perfectly still, chin up, eyes closed with pride
          g.lookAt = null;
          g.T.lid = 0.88;
          g.T.ear = 0.7;
          g.T.browL = g.T.browR = 0.7;
          g.T.chew = 0;
          g.T.pitch = -0.32;
        } else {
          // Wiggles and giggles the whole time
          g.A.yaw = Math.sin(k * 9) * 0.25;
          g.A.roll = Math.sin(k * 9 + 1) * 0.25;
          g.T.sway = 0.12;
          g.T.swayF = 1.8;
          g.T.lid = 0.85;
          g.A.ear = Math.sin(k * 14) * 0.45;
          g.T.tail = 1;
          g.T.tongue = k > 2.8 ? 1.3 : 0.4;
          g.A.y = Math.abs(Math.sin(k * 6)) * 0.05;
        }
      } else if (st.m === 'walk' && st.here) {
        if (isJodi) {
          g.T.lid = 0.4;
          g.T.browR = 1;
          if (s.sighAt && s.t > s.sighAt) sighPose(g, s.t - s.sighAt, s);
        } else {
          g.A.y = Math.abs(Math.sin(s.t * 5)) * 0.1;
          g.A.ear = Math.sin(s.t * 10) * 0.3;
          g.T.tongue = 0.8;
          g.T.tail = 0.9;
        }
      }
    };
    s.jodiStep = express;
    s.jouriStep = express;
    const linesJodi = ['Jodi holds perfectly still. A very proud neck.', 'Jodi closes her eyes and lifts her chin. She has waited all week for this.', 'Jodi does not move a hair. Every spot is brushed in order.'];
    const linesJouri = ['Jouri wiggles and giggles so much the ladder rolls.', 'Jouri cannot keep still. She giggles at every stroke.', 'Jouri wiggles, giggles and licks the brush.'];
    let sparkleT = 0;
    s.step = (dt) => {
      s.t += dt;
      s.pk += dt;
      const at = cues(s);
      if (s.phase === 'climb') {
        const k = clamp(s.pk / 1.4, 0, 1);
        const z = lerp(bottom.z, top.z, k);
        // Climb step by step: the height follows the treads under the feet
        const dz = L.z - z;
        const y = clamp(Math.ceil((dz + 0.01) / 0.2) * 0.25, 0, L.top);
        put(api, 'player', L.x, z, k >= 1 ? L.top : Math.min(L.top, y), Math.PI, k < 1 ? 1.4 : 0);
        at(0.15, () => sfx.creak());
        at(0.8, () => sfx.creak());
        if (k >= 1 && stOf(first).here && stOf(first).hk > 0.9) {
          s.phase = 'one';
          s.pk = 0;
          s.brushing = first;
          Z.say(first === jodi ? 'hum' : 'giggle');
          Z.watch('look', target);
        }
      } else if (s.phase === 'one' || s.phase === 'two') {
        const g = s.brushing;
        const isJodi = g === jodi;
        const dur = isJodi ? 3.4 : 3.8;
        if (!isJodi) {
          // The rolling ladder rolls with the wiggles
          s.roll = Math.sin(s.pk * 4.5) * 0.18 * Math.min(1, s.pk);
          if (Math.floor(s.pk / 0.7) !== s.gig) {
            s.gig = Math.floor(s.pk / 0.7);
            Z.say('giggle');
            if (s.gig % 2) sfx.creak();
          }
          kid.squash = 1 + Math.sin(s.pk * 9) * 0.04;
        } else s.roll = damp(s.roll, 0, 4, dt);
        ladder.position.x = L.x + s.roll;
        put(api, 'player', L.x + s.roll, topZ, L.top, Math.PI - 0.3 + (isJodi ? 0 : Math.sin(s.pk * 4.5) * 0.1));
        sparkleT -= dt;
        if (sparkleT <= 0) {
          sparkleT = 0.3;
          const at2 = neckOf(g, 1 + Math.floor(Math.random() * 2), tmp2);
          Z.puff(at2.add(tmp.set(0, 0, 0.22)), isJodi ? '#fff6d6' : '#ffd9e3', 2, 0.25, 0.04, 0.3);
        }
        if (s.pk > dur * 0.5 && !s[`said${s.phase}`]) {
          s[`said${s.phase}`] = true;
          api.toast(isJodi ? pick(linesJodi) : pick(linesJouri), 2800);
          if (!isJodi) {
            api.emote('partner', 'cheer');
            Z.watch('laugh');
          }
        }
        if (s.pk > dur) {
          if (s.phase === 'one') {
            s.phase = 'swap';
            s.pk = 0;
            s.brushing = null;
            mode(stOf(first), 'walk', { ...wait[first.cfg.id], mul: 1.6 });
            mode(stOf(second), 'walk', { ...stance, mul: 2.4, look: target });
            if (second === jouri) Z.say('boing');
          } else {
            s.phase = 'down';
            s.pk = 0;
            s.brushing = null;
            mode(stOf(second), 'walk', { ...wait[second.cfg.id], mul: 1.6 });
            if (second === jouri || first === jouri) s.sighAt = s.t + 0.6;
          }
        }
      } else if (s.phase === 'swap') {
        ladder.position.x = L.x + (s.roll = damp(s.roll, 0, 4, dt));
        put(api, 'player', L.x + s.roll, topZ, L.top, Math.PI - 0.3);
        if (stOf(second).here && stOf(second).hk > 0.9) {
          s.phase = 'two';
          s.pk = 0;
          s.brushing = second;
          Z.say(second === jodi ? 'hum' : 'giggle');
        }
        if (s.pk > 9) api.endActivity();
      } else if (s.phase === 'down') {
        ladder.position.x = L.x + (s.roll = damp(s.roll, 0, 4, dt));
        const k = clamp(s.pk / 1.2, 0, 1);
        const z = lerp(top.z, bottom.z, k);
        const y = clamp(Math.ceil((L.z - z - 0.01) / 0.2) * 0.25, 0, L.top);
        put(api, 'player', L.x, z, Math.min(L.top, y), k < 1 ? Math.PI : 0.3, k < 1 ? 1.4 : 0);
        if (k >= 1 && !s.cheered) {
          s.cheered = true;
          api.emote('player', 'cheer');
          api.fx.heartsAt(first.worldOf(first.head, new THREE.Vector3()), 2);
          if (api.partner.id === 'homama') Z.later(0.6, () => api.toast('Homama held the ladder steady the whole time.', 2400));
        }
        if (s.pk > 2.6) api.endActivity();
      }
    };
    s.arms = (t) => {
      if (s.phase !== 'one' && s.phase !== 'two') return;
      const k = kid.arms[1];
      const st = Math.sin(t * 7);
      k.rotation.set(-2.05 + st * 0.28, 0, 0.45 + st * 0.12);
      kid.arms[0].rotation.set(-0.9, 0, -0.2);
    };
  }

  // ================================================= 3. Bath time with the hose
  let hose = null;
  function bath(api) {
    if (Z.scene) return;
    const n = count(api, 'baths');
    const variants = ['kids', 'jodi', 'rainbow'];
    const v = n === 1 ? 'kids' : pick(variants);
    const P = { x: HOSE.x + 0.35, z: -1.72 };
    const Q = { x: HOSE.x - 0.45, z: -1.42 };
    const s = startScene(api, {
      label: 'Turn off the hose',
      seats: [
        { who: 'player', x: P.x, z: P.z, y: 0, yaw: Math.PI, pose: 'stand' },
        { who: 'partner', x: Q.x, z: Q.z, y: 0, yaw: Math.PI + 0.25, pose: 'stand' },
      ],
      focus: { x: HOSE.x + 0.5, z: -2.8, y: 2.0, zoom: 0.5 },
    });
    const kid = api.player.kid;
    kid.arms[1].add(nozzle);
    nozzle.position.set(0, -0.3, 0.06);
    nozzle.rotation.set(-1.4, 0, 0);
    // The hose itself, from the reel to the kid's hand
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(HOSE.x + 0.05, 0.4, HOSE.z + 0.1), new THREE.Vector3(HOSE.x + 0.2, 0.04, HOSE.z + 0.45), new THREE.Vector3(P.x - 0.05, 0.04, P.z - 0.05), new THREE.Vector3(P.x + 0.16, 0.6, P.z - 0.05)]);
    hose = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.025, 6), new THREE.MeshStandardMaterial({ color: '#5ccf7e', roughness: 0.6 }));
    hose.castShadow = true;
    Z.group.add(hose);
    s.onClean = () => {
      nozzleRest();
      if (hose) {
        hose.removeFromParent();
        hose.geometry.dispose();
        hose.material.dispose();
        hose = null;
      }
      rainbow.visible = false;
    };
    const jodiAt = { x: HOSE.x - 0.35, z: -4.3 };
    const jouriAt = { x: HOSE.x + 1.6, z: -4.05 };
    mode(s.js, 'walk', { ...jodiAt, yaw: 0.15, mul: 1.6 });
    mode(s.ju, 'walk', { ...jouriAt, yaw: -0.25, mul: 2.2 });
    s.aim = null; // giraffe being sprayed
    s.jodiStep = (g, dt) => {
      drive(g, s.js, dt);
      if (!s.js.here) return;
      g.lookAt = headOf(api, 'player', tmp);
      if (s.aim === g) {
        g.T.lid = 1;
        g.T.ear = 0.8;
        g.T.browL = g.T.browR = 0.85;
        g.T.tiltL = g.T.tiltR = -0.2;
        g.lookAt = null;
        g.T.pitch = -0.05;
      }
      const sk = s.t - (s.shakeAt ?? 1e9);
      if (sk > 0 && sk < 1.0) {
        const f = Math.sin(sk * 32) * (1 - sk);
        g.A.bodyRoll = f * 0.1;
        g.A.yaw = f * 0.4;
        g.A.roll = f * 0.3;
        g.T.lid = 1;
        if (Math.random() < 0.6) {
          const m = neckOf(g, 2 + Math.floor(Math.random() * 3), tmp2);
          spray(m, tmp.set((Math.random() - 0.5) * 4, 1.5 + Math.random(), (Math.random() - 0.5) * 4), 3, 0.5, 0.055);
        }
      }
      if (v === 'jodi' && s.t > (s.revengeAt ?? 1e9) + 0.6) {
        sighPose(g, s.t - s.revengeAt - 0.6, s);
        g.lookAt = mouthOf(jouri, tmp);
      }
    };
    s.jouriStep = (g, dt) => {
      drive(g, s.ju, dt);
      if (!s.ju.here) return;
      g.lookAt = headOf(api, 'player', tmp);
      g.T.tail = 0.9;
      if (s.aim === g) {
        g.T.jaw = 0.35;
        g.T.tongue = 1.1;
        g.T.lid = 0;
        g.T.browL = g.T.browR = 0.6;
        g.T.pitch = 0.1;
        g.A.ear = Math.sin(s.t * 12) * 0.3;
      }
      const r0 = s.revengeAt ?? 1e9;
      if (s.t > r0 - 0.6 && s.t < r0) {
        // Cheeks full of water, a cheeky look
        g.T.jaw = 0;
        g.T.lid = 0.3;
        g.T.wink = 1;
        g.A.squash = 0.02;
      }
      if (s.t > r0 && s.t < r0 + 1.4) {
        g.T.jaw = 0.18;
        if (v === 'rainbow') {
          g.lookAt = null;
          g.T.pitch = -0.7;
        } else if (v === 'jodi') g.lookAt = mouthOf(jodi, tmp);
      }
    };
    const shield = v === 'kids';
    const roji = api.roji;
    const homama = api.homama;
    s.step = (dt) => {
      s.t += dt;
      // The clock u starts once Jodi has arrived at the fence (or after 3.5 s)
      if (s.base === undefined && (s.js.here || s.t > 3.5)) s.base = s.t - 1.4;
      const u = s.base === undefined ? -1 : s.t - s.base;
      const at = cues(s, u);
      at(0.3, () => {
        Z.say('pop');
        Z.watch('look', new THREE.Vector3(HOSE.x, 2, -3.5));
      });
      const tip = () => worldToLocal(nozzle.localToWorld(tmp.set(0, 0, 0.22)));
      const sprayAt = (g, i) => {
        if (Math.random() < 0.5) return;
        const from = tip().clone();
        const to = neckOf(g, i, tmp2).clone();
        spray(from, lob(from, to, 0.45, new THREE.Vector3()), 3, 0.3, 0.06);
      };
      // Spray Jodi, then Jouri
      if (u > 1.6 && u < 4.2 && s.js.here) {
        s.aim = jodi;
        sprayAt(jodi, 3);
        if (!s.hiss1) {
          s.hiss1 = true;
          sfx.hiss(2.6);
        }
      } else if (s.aim === jodi) s.aim = null;
      at(3.3, () => Z.say('sigh'));
      at(4.4, () => {
        s.shakeAt = s.t;
        sfx.creak();
      });
      if (u > 5.6 && u < 7.6 && s.ju.here) {
        s.aim = jouri;
        const from = tip().clone();
        const to = mouthOf(jouri, tmp2).clone();
        if (Math.random() < 0.6) spray(from, lob(from, to, 0.45, new THREE.Vector3()), 3, 0.2, 0.06);
        if (!s.hiss2) {
          s.hiss2 = true;
          sfx.hiss(2.0);
        }
      } else if (s.aim === jouri) s.aim = null;
      at(7.8, () => {
        Z.say('gulp');
        s.revengeAt = s.t + 0.7;
        s.revengeU = u + 0.7;
      });
      // Homama steps in front of Roji just before the splash
      if (shield && u > 7.9 && u < 8.4) {
        const rp = localOf(api, 'roji');
        const hp = localOf(api, 'homama');
        const want = { x: rp.x + 0.25, z: rp.z - 0.55 };
        const k = clamp((u - 7.9) / 0.4, 0, 1);
        if (!s.hFrom) s.hFrom = { x: hp.x, z: hp.z };
        glide(api, 'homama', s.hFrom, want, k, Math.PI - 0.5, dt);
      }
      const r0 = s.revengeAt ?? 1e9;
      const ru = s.revengeU ?? 1e9;
      if (s.t > r0 && s.t < r0 + 1.3) {
        const m = mouthOf(jouri, tmp).clone();
        let to;
        if (v === 'kids') to = headOf(api, shield ? 'homama' : 'player', tmp2).clone();
        else if (v === 'jodi') to = neckOf(jodi, 4, tmp2).clone();
        else to = tmp2.set(m.x - 1.6, m.y + 0.6, m.z + 0.6).clone();
        spray(m, lob(m, to, v === 'rainbow' ? 0.9 : 0.5, new THREE.Vector3()), 4, 0.35, 0.065);
        if (!s.hiss3) {
          s.hiss3 = true;
          sfx.hiss(1.3);
        }
      }
      at(ru + 0.45, () => {
        if (v === 'kids') {
          const who = shield ? homama : api.player;
          who.kid.squash = 0.78;
          Z.say('giggle');
        }
        if (v === 'rainbow') {
          rainbow.visible = true;
          const m = mouthOf(jouri, tmp);
          rainbow.position.set(m.x - 0.8, 1.6, m.z + 0.4);
          rainbow.rotation.set(0, 0.25, 0);
          s.rainbowAt = s.t;
        }
      });
      if (s.rainbowAt) {
        const k = s.t - s.rainbowAt;
        rainbow.material.opacity = clamp(k * 1.5, 0, 0.75) * clamp((4 - k) * 1.5, 0, 1);
        rainbow.scale.setScalar(0.6 + Math.min(1, k * 2) * 0.4);
      }
      at(ru + 1.6, () => {
        const text =
          v === 'kids'
            ? shield
              ? 'Jouri sprays back! Homama steps in front of Roji and takes the splash.'
              : `Jouri sprays the water right back at ${Z.name(api)}!`
            : v === 'jodi'
              ? 'Jouri sprays Jodi instead. Jodi lets out a very long sigh.'
              : 'Jouri sprays straight up and makes a tiny rainbow.';
        api.toast(text, 3600);
        Z.watch('laugh');
        if (v === 'kids' && shield) {
          api.emote('roji', 'heart');
          api.fx.heartsAt(homama.kid.root.localToWorld(tmp.set(0, 1.7, 0)), 3);
        } else api.emote('partner', 'cheer');
      });
      if (s.t > r0 + 4.3) api.endActivity();
    };
    s.arms = () => {
      const a = kid.arms[1];
      a.rotation.set(-1.55, 0, 0.12);
      kid.arms[0].rotation.set(-1.2, 0, -0.35);
    };
  }

  // ================================================= 4. The height chart
  function measure(api) {
    if (Z.scene) return;
    const n = count(api, 'measures');
    const jv = n === 1 ? 'tiptoe' : pick(['tiptoe', 'duck']);
    const kv = n === 1 ? 'match' : pick(['match', 'tiptoe', 'pat']);
    const P = { x: 1.75, z: -1.4 };
    const Q = { x: 2.35, z: -1.15 };
    const s = startScene(api, {
      label: 'Step away',
      seats: [
        { who: 'player', x: P.x, z: P.z, y: 0, yaw: Math.PI + 0.5, pose: 'stand' },
        { who: 'partner', x: Q.x, z: Q.z, y: 0, yaw: Math.PI + 0.55, pose: 'stand' },
      ],
      focus: { x: 0.55, z: -2.9, y: 2.7, zoom: 0.62 },
    });
    bar.root.visible = true;
    bar.draw('?');
    s.barY = 4.95;
    s.barWant = 4.95;
    s.onClean = () => (bar.root.visible = false);
    const spot = { x: 0.5, z: -4.25 };
    mode(s.js, 'walk', { ...spot, yaw: 0, mul: 1.6 });
    mode(s.ju, 'walk', { x: 2.4, z: -5.4, yaw: -0.5, mul: 2 });
    const crown = (g) => g.localOf(g.crownAnchor, tmp).y;
    s.jodiStep = (g, dt) => {
      drive(g, s.js, dt);
      if (s.js.m === 'walk' && s.js.here && s.phase === 'jodi') {
        // Standing as tall and neat as she can
        g.T.lean = 0.08;
        g.T.curve = -0.02;
        g.T.pitch = -0.12;
        g.T.lid = 0.5;
        g.T.browR = 1;
        g.T.browL = 0.6;
        g.T.twist = 0;
        g.T.roll = 0;
        g.T.chew = 0;
      } else if (s.phase !== 'jodi') {
        g.T.lid = 0.4;
        g.lookAt = mouthOf(jouri, tmp2);
        if (s.sighAt && s.t > s.sighAt) sighPose(g, s.t - s.sighAt, s);
      }
    };
    s.jouriStep = (g, dt) => {
      drive(g, s.ju, dt);
      if (s.phase === 'jouri' && s.ju.here) {
        const k = s.pk;
        g.T.twist = 0;
        g.T.roll = 0;
        if (jv === 'tiptoe') {
          if (k < 2.2) {
            g.T.lean = 0.7; // a slouch
            g.T.curve = 0.06;
            g.T.lid = 0.3;
          } else {
            g.T.lean = 0.02;
            g.T.pitch = -0.3;
            g.R.lean = 9;
            const up = clamp((k - 2.2) * 5, 0, 1);
            g.A.y = 0.32 * up;
            g.A.tuck = -0.15 * up;
            g.T.lid = 0;
            g.T.wink = 1;
            g.T.tongue = 0.7;
          }
        } else {
          // Ducks out from under the bar twice, giggling
          const dip = k > 0.6 && k < 3.2 ? Math.max(0, Math.sin((k - 0.6) * 2.4)) : 0;
          g.T.lean = 0.34 + dip * 0.6;
          g.R.lean = 8;
          g.T.lid = dip > 0.3 ? 0.85 : 0;
          g.T.tongue = dip > 0.3 ? 1 : 0.2;
          g.A.ear = Math.sin(k * 12) * 0.3;
        }
      } else if (s.ju.m === 'walk' && s.ju.here && s.phase !== 'jouri') {
        g.A.y = Math.abs(Math.sin(s.t * 4)) * 0.06;
        g.T.tongue = 0.4;
        g.lookAt = headOf(api, 'player', tmp2);
      }
    };
    s.phase = 'jodi';
    s.pk = 0;
    const show = (y, extra = '') => bar.draw(`${y.toFixed(1)} m${extra}`);
    const kidSpots = [{ x: 0.12, z: -2.05 }, { x: 0.67, z: -2.05 }];
    s.step = (dt) => {
      s.t += dt;
      s.pk += dt;
      const at = cues(s);
      at(0.2, () => sfx.ding());
      if (s.phase === 'jodi') {
        if (s.js.here && s.js.hk > 0.9) {
          s.barWant = crown(jodi);
          if (!s.read1 && Math.abs(s.barY - s.barWant) < 0.02) {
            s.read1 = true;
            s.readAt = s.t;
            show(s.barWant);
            Z.say('hum');
            sfx.ding();
            api.fx.burst(api.world(CHART.x + 0.6, CHART.z, s.barWant + 0.25), ['#ffd166', '#ffffff'], 14);
          }
        }
        if (s.read1 && s.t > s.readAt + 1.6) {
          s.phase = 'jouri';
          s.pk = 0;
          s.barWant = 4.95;
          bar.draw('?');
          mode(s.js, 'walk', { x: -1.4, z: -4.8, yaw: 0.35, mul: 1.6 });
          mode(s.ju, 'walk', { x: spot.x + 0.1, z: spot.z, yaw: 0, mul: 2.2 });
          s.pk = -10;
        }
        if (s.t > 11) {
          s.phase = 'kids';
          s.pk = 0;
          s.from = [localOf(api, 'roji').clone(), localOf(api, 'homama').clone()];
        }
      } else if (s.phase === 'jouri') {
        if (s.pk < 0 && s.ju.here && s.ju.hk > 0.6) s.pk = 0;
        if (s.pk >= 0) {
          if (jv === 'tiptoe') {
            if (s.pk > 0.4 && s.pk < 2.2) s.barWant = crown(jouri);
            if (s.pk > 1.6 && !s.r2) {
              s.r2 = true;
              show(crown(jouri));
            }
            if (s.pk > 2.2) {
              s.barWant = Math.max(s.barWant, crown(jouri));
              s.barY = Math.max(s.barY, s.barWant);
            }
            if (s.pk > 2.6 && !s.r3) {
              s.r3 = true;
              show(crown(jouri), '?');
              Z.say('boing');
              s.sighAt = s.t + 0.5;
            }
          } else {
            s.barWant = Math.min(4.95, crown(jouri) + 0.02);
            if (s.pk > 3.4 && !s.r3) {
              s.r3 = true;
              show(crown(jouri));
              Z.say('giggle');
            }
            if (Math.floor(s.pk / 0.9) !== s.gg && s.pk < 3.2) {
              s.gg = Math.floor(s.pk / 0.9);
              Z.say('giggle');
            }
          }
          if (s.pk > 4.2) {
            s.phase = 'kids';
            s.pk = 0;
            s.barWant = 4.95;
            bar.draw('?');
            mode(s.ju, 'walk', { x: 2.3, z: -4.7, yaw: -0.3, mul: 2 });
            mode(s.js, 'walk', { x: -1.2, z: -4.3, yaw: 0.25, mul: 1.6 });
            s.from = [localOf(api, 'roji').clone(), localOf(api, 'homama').clone()];
          }
        }
      } else if (s.phase === 'kids') {
        // Roji and Homama stand side by side under the bar
        const ids = ['roji', 'homama'];
        const k = clamp(s.pk / 1.2, 0, 1);
        ids.forEach((id, i) => {
          const from = s.from?.[i] || kidSpots[i];
          const tip = kv === 'tiptoe' && id === 'roji' && s.pk > 1.6 ? 0.07 : 0;
          glide(api, id, { x: from.x, z: from.z, y: 0 }, { ...kidSpots[i], y: tip }, k, 0, dt);
        });
        if (s.pk > 1.4) {
          const tipped = kv === 'tiptoe' && s.pk > 1.6;
          s.barWant = 1.43 + (tipped ? 0.07 : 0);
        }
        if (s.pk > 2.8 && !s.r4) {
          s.r4 = true;
          show(s.barWant);
          sfx.ding();
          const jn = jodi.localOf(jodi.crownAnchor, new THREE.Vector3()).y;
          const text =
            kv === 'tiptoe'
              ? 'Roji is on tiptoe. Homama pretends not to notice.'
              : kv === 'pat'
                ? 'Same height, again. Homama gives Roji a little pat on the head.'
                : 'Roji and Homama: exactly the same height. A perfect match.';
          api.toast(`Jodi ${jn.toFixed(1)} m, Jouri ${jv === 'tiptoe' ? 'on tiptoes' : 'finally still'}. ${text}`, 4200);
          Z.watch('cheer');
        }
        if (kv === 'pat' && s.pk > 3.3 && !s.patted) {
          s.patted = true;
          s.patAt = s.t;
          api.emote('roji', 'heart');
        }
        if (s.pk > 3.2) s.barWant = 4.95;
        if (s.pk > 5.0) api.endActivity();
      }
      // The bar slides toward its target
      s.barY = damp(s.barY, s.barWant, 3.2, dt);
      bar.root.position.y = s.barY;
    };
    s.arms = () => {
      if (s.patAt && s.t < s.patAt + 1.4) {
        const k = api.homama.kid;
        k.arms[1].rotation.set(-2.5, 0, -0.9 + Math.sin(s.t * 12) * 0.08);
      }
    };
  }

  // ================================================= 5. The morning paper
  const HEADLINES = [
    ['Doctor Roji saves', 'the day again'],
    ['Homama fixes the', 'ticket machine'],
    ['Giraffe sneezes,', 'whole island amazed'],
    ['Tortoise wins', 'the slow race'],
    ['Penguins learn', 'a brand new dance'],
    ['Flamingo stands on', 'one leg all week'],
  ];
  function newspaper(api) {
    if (Z.scene) return;
    const n = count(api, 'papers');
    const v = n === 1 ? 'all' : pick(['all', 'sports', 'upside']);
    const head = HEADLINES[(n - 1 + Math.floor(Math.random() * 2)) % HEADLINES.length];
    paper.setHeadline(head, pick(['#ffd9e3', '#cfe6e2', '#fff1c9']));
    paper.bite(0);
    const box = { x: PAPER.x - 0.46, z: -1.82 };
    const P = { x: PAPER.x - 0.05, z: -1.58 };
    const Q = { x: PAPER.x + 0.85, z: -1.15 };
    const back = { x: PAPER.x - 0.8, z: -1.3 };
    const s = startScene(api, {
      label: 'Step away',
      seats: [
        { who: 'player', x: box.x, z: box.z, y: 0, yaw: Math.PI, pose: 'stand' },
        { who: 'partner', x: Q.x, z: Q.z, y: 0, yaw: Math.PI + 0.6, pose: 'stand' },
      ],
      focus: { x: PAPER.x, z: -2.6, y: 1.9, zoom: 0.5 },
    });
    const kid = api.player.kid;
    paper.root.visible = true;
    const prev = api.carry('player', paper.root);
    paper.root.position.set(0, 0.02, 0.1);
    paper.root.rotation.set(-0.5, 0, 0);
    s.onClean = () => {
      if (paper.root.parent !== Z.group) {
        api.carry('player', prev || null);
        Z.group.add(paper.root);
      } else if (prev) api.carry('player', prev);
      paper.root.visible = false;
      glasses.visible = false;
      glasses.position.set(0, 0.17, 0.31);
    };
    const onStand = () => {
      api.carry('player', prev || null);
      Z.group.add(paper.root);
      paper.root.position.set(PAPER.x, 1.215, PAPER.z);
      paper.root.rotation.set(0.3, 0, 0);
      sfx.paper();
    };
    const readT = new THREE.Vector3(PAPER.x, 1.95, PAPER.z - 0.3);
    const eatT = new THREE.Vector3(PAPER.x + 0.16, 1.4, PAPER.z - 0.06);
    mode(s.js, 'walk', { x: PAPER.x - 0.5, z: -5.0, yaw: 0.2, mul: 2.6 });
    mode(s.ju, 'walk', { x: 4.2, z: -6.2, yaw: -0.3, mul: 1.8 });
    s.phase = 'bring';
    s.pk = 0;
    s.jodiStep = (g, dt) => {
      drive(g, s.js, dt);
      if (s.phase === 'read' || s.phase === 'eat' || s.phase === 'after') {
        if (s.js.m === 'reach' && s.js.here) {
          // Reading line by line, one brow up
          g.T.lid = 0.45;
          g.T.browR = 1;
          g.T.browL = 0.3;
          g.A.yaw = Math.sin(s.t * 1.6) * 0.12;
          g.T.chew = 0.3;
        }
        if (s.phase === 'after') {
          g.lookAt = mouthOf(jouri, tmp2);
          sighPose(g, s.pk, s);
        }
      }
    };
    s.jouriStep = (g, dt) => {
      drive(g, s.ju, dt);
      if (s.phase === 'eat' && s.ju.m === 'reach') {
        g.T.tail = 1;
        if (!s.ju.here) return;
        const k = s.ju.hk;
        if (v === 'upside' && k < 2.2) {
          g.T.roll = 1.3;
          g.T.lid = 0.3;
          g.T.browL = g.T.browR = 0.9;
          g.A.yaw = Math.sin(k * 2) * 0.1;
          return;
        }
        g.T.chew = 1;
        g.T.tongue = 0.6;
        g.T.lid = 0.6;
        g.A.ear = Math.sin(k * 12) * 0.3;
      } else if (s.ju.here) {
        g.T.tongue = 0.5;
        g.A.y = Math.abs(Math.sin(s.t * 4)) * 0.05;
      }
    };
    s.step = (dt) => {
      s.t += dt;
      s.pk += dt;
      const at = cues(s);
      if (s.phase === 'bring') {
        at(0.1, () => sfx.paper());
        const k = clamp((s.pk - 0.5) / 0.8, 0, 1);
        glide(api, 'player', { x: box.x, z: box.z }, P, k, Math.PI, dt);
        if (s.pk > 1.5) {
          onStand();
          s.phase = 'call';
          s.pk = 0;
          mode(s.js, 'reach', { target: readT, opts: { pitch: 0.55, maxZ: -3.45 }, mul: 1.8, settle: 1.0 });
          Z.watch('look', readT);
        }
      } else if (s.phase === 'call') {
        if (s.pk < 1.4) glide(api, 'player', P, back, s.pk / 1.0, Math.PI - 0.75, dt);
        if (s.js.here && s.js.hk > 0.3) {
          glasses.visible = true;
          Z.say('hum');
          s.phase = 'read';
          s.pk = 0;
        }
        if (s.pk > 9) api.endActivity();
      } else if (s.phase === 'read') {
        if (s.pk > 1.2 && !s.r1) {
          s.r1 = true;
          sfx.paper();
          api.toast(`Jodi puts on her reading glasses. <b>"${head[0]} ${head[1]}."</b> She nods. Very interesting.`, 3600);
        }
        if (s.pk > 3.2) {
          s.phase = 'eat';
          s.pk = 0;
          // Jodi lifts her head to think; Jouri arrives from the other side
          mode(s.js, 'walk', { x: PAPER.x - 0.8, z: -4.6, yaw: 0.35, mul: 1.2 });
          mode(s.ju, 'reach', { target: eatT, opts: { pitch: 0.4, maxZ: -3.45 }, mul: 2.4, settle: 0.6 });
        }
      } else if (s.phase === 'eat') {
        const k0 = v === 'upside' ? 2.2 : 0.4;
        const bites = v === 'sports' ? [k0 + 0.3, k0 + 0.9] : [k0 + 0.3, k0 + 0.9, k0 + 1.5];
        if (s.ju.here) {
          bites.forEach((b, i) => {
            if (s.ju.hk > b && !s[`b${i}`]) {
              s[`b${i}`] = true;
              Z.say('munch');
              sfx.paper();
              paper.bite(v === 'sports' ? (i + 1) * 0.25 : (i + 1) / 3);
              Z.puff(tmp.set(PAPER.x + 0.2 - i * 0.12, 1.3, PAPER.z), '#ffffff', 3, 0.4, 0.03, 0.4);
            }
          });
          if (v === 'upside' && s.ju.hk > 0.4 && !s.up) {
            s.up = true;
            Z.say('giggle');
          }
          if (s.ju.hk > bites[bites.length - 1] + 0.6) {
            if (v !== 'sports') paper.root.visible = false;
            s.phase = 'after';
            s.pk = 0;
            Z.say('gulp');
            mode(s.ju, 'walk', { x: 4.1, z: -5.2, yaw: -0.4, mul: 2 });
            s.sighed = false;
          }
        }
        if (s.pk > 10) api.endActivity();
      } else if (s.phase === 'after') {
        // Jodi's glasses slide down her nose
        glasses.position.y = lerp(0.17, 0.1, clamp(s.pk / 1.2, 0, 1));
        glasses.position.z = lerp(0.31, 0.36, clamp(s.pk / 1.2, 0, 1));
        if (!s.r2 && s.pk > 0.6) {
          s.r2 = true;
          const text = v === 'sports' ? 'Jouri eats only the sports page. Jodi did not want it anyway.' : v === 'upside' ? 'Jouri tries to read it upside down, then eats it.' : 'Jouri eats the whole newspaper. Jodi was not finished.';
          api.toast(text, 3400);
          Z.watch('laugh');
          api.emote('partner', 'cheer');
        }
        if (s.pk > 3.2) api.endActivity();
      }
    };
  }

  // ================================================= 6. The giraffe disco
  const BEAT = 60 / 124;
  const DISCO = (() => {
    const out = [];
    const mel = [72, 76, 79, 76, 81, 79, 76, 74, 72, 74, 76, 79, 76, 74, 72, 67];
    const chords = [48, 53, 55, 53];
    const bars = 6;
    for (let b = 0; b < bars; b++) {
      for (let i = 0; i < 8; i++) {
        const t = 1.0 + (b * 8 + i) * (BEAT / 2);
        const nn = mel[(b % 2) * 8 + i];
        if (i % 2 === 0 || b >= 2) out.push([t, nn, BEAT * 0.45, { gain: 0.045 }]);
      }
      for (let i = 0; i < 4; i++) {
        const t = 1.0 + (b * 4 + i) * BEAT;
        out.push([t, chords[b % 4], BEAT * 0.8, { gain: 0.06, type: 'sine' }]);
        if (i % 2 === 1) out.push([t, chords[b % 4] + 19, BEAT * 0.3, { gain: 0.02, type: 'square' }]);
      }
    }
    const end = 1.0 + bars * 4 * BEAT;
    out.push([end, 84, 0.6, { gain: 0.06 }], [end, 79, 0.6, { gain: 0.04 }], [end, 76, 0.6, { gain: 0.04 }]);
    return { notes: out, end };
  })();
  function disco(api) {
    if (Z.scene) return;
    const n = count(api, 'discos');
    const secret = n % 3 === 0;
    const P = { x: -0.15, z: 0.5 };
    const Q = { x: 0.65, z: 0.35 };
    const s = startScene(
      api,
      {
        label: 'Stop the music',
        seats: [
          { who: 'player', x: P.x, z: P.z, y: 0, yaw: 0.35, pose: 'stand' },
          { who: 'partner', x: Q.x, z: Q.z, y: 0, yaw: -0.35, pose: 'stand' },
        ],
        focus: { x: 0.9, z: -1.6, y: 2.3, zoom: 0.68 },
        music: 0.15,
      },
      { song: sequencer(DISCO.notes) },
    );
    mode(s.js, 'walk', { x: 0.3, z: -4.1, yaw: 0.1, mul: 2.4 });
    mode(s.ju, 'walk', { x: 2.55, z: -4.25, yaw: -0.15, mul: 2.4 });
    const beat = () => (s.t - 1.0) / BEAT;
    const on = () => s.t > 1.0 && s.t < DISCO.end;
    const kids = [api.player.kid, api.partner.kid];
    s.onClean = () => {
      for (const k of kids) k.danceLoop = false;
    };
    s.jodiStep = (g, dt) => {
      drive(g, s.js, dt);
      if (!s.js.here) return;
      const b = beat();
      g.T.lid = 0.5;
      g.T.browR = 1;
      g.T.pitch = -0.1;
      if (on()) {
        // One dignified step on bar two, a bow, then a tiny nod on every beat
        if (b > 4 && b < 5) g.A.step = Math.sin((b - 4) * Math.PI);
        if (b > 5 && b < 6.5) {
          g.A.pitch += Math.sin(((b - 5) / 1.5) * Math.PI) * 0.35;
          g.T.lean += 0.15 * Math.sin(((b - 5) / 1.5) * Math.PI);
        }
        if (b > 6.5) g.A.pitch += Math.max(0, Math.sin(b * Math.PI * 2)) * 0.05;
        if (secret && b > 17 && b < 19) {
          g.A.step = -Math.sin((b - 17) * Math.PI);
          g.A.bodyRoll = Math.sin((b - 17) * Math.PI) * 0.05;
        }
        if (secret && b > 19 && b < 22) {
          g.A.yaw = Math.sin((b - 19) * 2.2) * 0.5;
          g.T.lid = 0.2;
        }
      } else if (s.t > DISCO.end) {
        g.A.pitch += Math.sin(clamp((s.t - DISCO.end) / 1.2, 0, 1) * Math.PI) * 0.3;
      }
    };
    s.jouriStep = (g, dt) => {
      drive(g, s.ju, dt);
      if (!s.ju.here) return;
      const b = beat();
      if (on()) {
        const bar = Math.floor(b / 4);
        g.T.tail = 1;
        g.T.lid = 0.3;
        g.T.tongue = 0.9;
        g.A.tWag = Math.sin(s.t * 14) * 0.4;
        g.T.sway = 0.2;
        g.T.swayF = 1 / (BEAT * 2);
        g.A.ear = Math.sin(b * Math.PI) * 0.5;
        if (bar % 3 === 0) {
          g.A.step = Math.sin(b * Math.PI);
          g.A.bodyRoll = Math.sin(b * Math.PI) * 0.08;
        } else if (bar % 3 === 1) {
          const hop = Math.abs(Math.sin(b * Math.PI));
          g.A.y = hop * 0.3;
          g.A.tuck = hop;
          g.A.squash = hop < 0.15 ? -0.06 : 0.03;
        } else {
          // A full spin
          const k = (b % 4) / 4;
          g.A.spin = k * Math.PI * 2;
          g.A.y = Math.sin(k * Math.PI) * 0.15;
        }
      } else if (s.t > DISCO.end && s.t < DISCO.end + 1.6) {
        // Ta-da
        const k = s.t - DISCO.end;
        g.A.y = Math.sin(clamp(k / 0.5, 0, 1) * Math.PI) * 0.35;
        g.T.wink = 1;
        g.T.tongue = 1.2;
        g.T.roll = 0.35;
      }
    };
    s.step = (dt) => {
      s.t += dt;
      s.song(s);
      const at = cues(s);
      at(0.4, () => {
        Z.say('pop');
        Z.watch('dance');
      });
      at(1.0, () => {
        for (const k of kids) {
          k.danceLoop = true;
          k.emote('dance');
        }
      });
      if (on() && Math.random() < dt * 3) note(tmp.set(RADIO.x - 0.08 + Math.random() * 0.1, 1.35, RADIO.z + 0.25));
      at(DISCO.end, () => {
        for (const k of kids) {
          k.danceLoop = false;
          k.cancelEmote();
        }
        sfx.tada();
        api.emote('player', 'spin');
        api.emote('partner', 'cheer');
        Z.watch('cheer');
      });
      at(DISCO.end + 0.8, () => {
        const text = secret ? 'Jodi did one dignified step. Then, when she thought nobody was looking, one more.' : pick(['Jodi does one dignified step. Jouri goes completely wild.', 'One elegant step from Jodi. Jouri dances, hops and spins.', 'Jodi bows. Jouri spins so fast her ears flap.']);
        api.toast(text, 3600);
      });
      if (s.t > DISCO.end + 2.6) api.endActivity();
    };
  }

  // ================================================= 7. Carrots and lettuce from the treat stall
  // feedTreat runs the deck feeding with a carrot or lettuce; the acacia leaves stay in zoo.js.
  function feedTreat(api, G, treat) {
    if (Z.scene) return;
    const isJodi = G === jodi;
    const side = isJodi ? -1 : 1;
    const kx = isJodi ? -3.7 : -2.3;
    const kz = -2.05;
    const yaw = side < 0 ? -Math.PI / 2 - 0.2 : Math.PI / 2 + 0.2;
    const holdAt = new THREE.Vector3(kx + Math.sin(yaw) * 0.47, DECK.h + 0.84, kz + Math.cos(yaw) * 0.47);
    const target = holdAt.clone().add(new THREE.Vector3(0, 0.02, -0.1));
    const food = treat === 'carrot' ? makeCarrot() : makeLettuce();
    const s = startScene(api, {
      label: 'Step back',
      seats: [
        { who: 'player', x: kx, z: kz, y: DECK.h, yaw, pose: 'stand', hands: 'carry' },
        { who: 'partner', x: kx - side * 0.85, z: kz + 0.25, y: DECK.h, yaw: yaw - side * 0.3, pose: 'stand' },
      ],
      focus: { x: (holdAt.x + kx) / 2, z: holdAt.z - 0.55, y: 2.5, zoom: 0.44 },
    }, {}, G);
    const kid = api.player.kid;
    const prev = api.carry('player', food);
    kid.carryAnchor.position.set(0, 0.72, 0.42);
    food.rotation.set(0, 0, 0);
    s.onClean = () => {
      kid.carryAnchor.position.set(0, 0.5, 0.3);
      food.removeFromParent();
      bitePivot.removeFromParent();
      api.carry('player', prev || null);
      Z.kidsOnDeck(api);
    };
    const me = isJodi ? s.js : s.ju;
    mode(me, 'reach', { target, opts: { pitch: 0.32 }, mul: isJodi ? 1.8 : 2.2, settle: isJodi ? 1.5 : 0.9 });
    s.phase = 'reach';
    s.pk = 0;
    // In the mouth the treat sits on a pivot at the lips, so bites shorten it toward the mouth
    const bitePivot = new THREE.Group();
    const take = (rotY, centred) => {
      // From the kid's hands into the giraffe's mouth
      if (kid.carried === food) {
        kid.carry(null);
        kid.hands = null;
      }
      s.eatAt = s.t;
      G.head.add(bitePivot);
      bitePivot.position.set(0, -0.09, 0.44);
      bitePivot.rotation.set(0, rotY, 0);
      bitePivot.scale.setScalar(1 / G.cfg.scale);
      bitePivot.add(food);
      food.position.set(0, 0, centred ? 0 : 0.14);
      food.rotation.set(0, 0, 0);
      Z.say('blep');
    };
    const face = new THREE.Vector3(kx, DECK.h + 1.1, kz);
    const step = (g, dt) => {
      if (g !== G) {
        g.lookAt = mouthOf(G, tmp2);
        return;
      }
      drive(g, me, dt);
      if (s.phase === 'eat') {
        const k = s.pk;
        if (isJodi && treat === 'carrot') {
          // Four slow, neat crunches, one brow up
          g.T.chew = 0.9;
          g.T.lid = 0.6;
          g.T.browR = 1;
          g.T.browL = 0.1;
          g.T.reach = me.sol.r * 0.55;
          g.lookAt = face;
        } else if (isJodi) {
          // Lettuce: nibbles and chews for a very long time, eyes closed
          g.T.chew = 1;
          g.T.lid = 0.95;
          g.T.reach = me.sol.r * 0.5;
        } else if (treat === 'carrot') {
          // A carrot moustache, eyebrows wiggling
          g.T.reach = me.sol.r * 0.4;
          g.lookAt = face;
          g.T.browL = 0.5 + Math.sin(k * 9) * 0.5;
          g.T.browR = 0.5 - Math.sin(k * 9) * 0.5;
          g.T.wink = k > 1.2 && k < 2.2 ? 1 : 0;
          g.A.roll = Math.sin(k * 4) * 0.15;
          g.T.tail = 1;
        } else {
          g.T.chew = 1;
          g.T.lid = 0.3;
          g.A.pitch += Math.sin(k * 10) * 0.05;
          g.T.reach = me.sol.r * 0.45;
          g.lookAt = face;
          g.T.tail = 1;
        }
      }
      if (s.phase === 'done') {
        g.T.reach = me.sol ? me.sol.r * 0.3 : 0;
        g.lookAt = face;
        if (isJodi) {
          g.A.pitch += Math.sin(s.pk * 6.5) * 0.2 * (s.pk > 0.3 && s.pk < 1.6 ? 1 : 0);
          g.T.lid = 0.3;
        } else {
          g.T.tongue = 0.8;
          g.T.wink = 1;
          const hop = s.pk < 1.6 ? Math.abs(Math.sin(s.pk * 5)) : 0;
          g.A.y = hop * 0.25;
          g.A.tuck = hop;
        }
      }
    };
    s.jodiStep = step;
    s.jouriStep = step;
    s.step = (dt) => {
      s.t += dt;
      s.pk += dt;
      if (s.phase === 'reach') {
        if (me.here && me.hk > (isJodi ? 1.5 : 0.9)) {
          if (treat === 'lettuce') take(0, false);
          else take(isJodi ? 0.75 : Math.PI / 2, !isJodi);
          s.phase = 'eat';
          s.pk = 0;
        }
        if (s.pk > 12) api.endActivity();
        return;
      }
      if (s.phase === 'eat') {
        const at = cues(s);
        if (isJodi && treat === 'carrot') {
          [0.6, 1.5, 2.4, 3.3].forEach((b, i) =>
            at(s.eatAt + b, () => {
              sfx.crunch();
              bitePivot.scale.z = (1 / G.cfg.scale) * (1 - (i + 1) * 0.23);
            }),
          );
          if (s.pk > 4.0) end(`Crunch, crunch, crunch, crunch. <b>Jodi approves of the carrot.</b>`);
        } else if (isJodi) {
          if (Math.floor(s.pk / 0.45) !== s.ch && s.pk < 4.2) {
            s.ch = Math.floor(s.pk / 0.45);
            Z.say('munch');
            bitePivot.scale.setScalar((1 / G.cfg.scale) * Math.max(0.15, 1 - s.pk / 4.4));
          }
          if (s.pk > 4.4) end('Jodi chews the lettuce very slowly. <b>Twenty-two chews, exactly.</b>');
        } else if (treat === 'carrot') {
          if (s.pk > 0.5 && !s.gg) {
            s.gg = true;
            Z.say('giggle');
            api.emote('partner', 'cheer');
            Z.watch('laugh');
          }
          if (s.pk > 2.5 && !s.gulp) {
            s.gulp = true;
            sfx.crunch();
            Z.say('gulp');
            food.visible = false;
          }
          if (s.pk > 2.9) end(`Jouri wears the carrot like a moustache. <b>Then it is gone.</b>`);
        } else {
          if (Math.floor(s.pk / 0.28) !== s.ch && s.pk < 1.6) {
            s.ch = Math.floor(s.pk / 0.28);
            sfx.crunch();
            bitePivot.scale.setScalar((1 / G.cfg.scale) * Math.max(0.1, 1 - s.pk / 1.6));
            Z.puff(mouthOf(G, tmp), '#b8e986', 2, 0.6, 0.035, 0.6);
          }
          if (s.pk > 1.7 && !s.hat) {
            s.hat = true;
            food.visible = false;
            leafHat.visible = true;
            leafHatT = 45;
            Z.say('boing');
            api.emote('partner', 'cheer');
            Z.watch('laugh');
          }
          if (s.pk > 2.6) end(`Jouri crunches the lettuce. <b>She keeps one leaf as a hat.</b>`);
        }
        return;
      }
      if (s.phase === 'done' && s.pk > 2.4) api.endActivity();
    };
    function end(text) {
      if (s.phase !== 'eat') return;
      s.phase = 'done';
      s.pk = 0;
      food.visible = false;
      Z.say(isJodi ? 'hum' : 'giggle');
      api.toast(text, 3200);
      api.fx.heartsAt(G.worldOf(G.head, new THREE.Vector3()), isJodi ? 2 : 4);
      api.emote('player', isJodi ? 'bow' : 'heart');
    }
  }

  // ------------------------------------------------ hotspots
  const free = () => !Z.scene;
  const hotspots = [
    { x: -10.4, z: -1.5, r: 1.25, label: 'Sing happy birthday', icon: 'zoo-cake', when: free, act: birthday },
    { x: LADDER.x, z: LADDER.z + 0.55, r: 1.1, label: 'Brush their necks', icon: 'zoo-brush', when: free, act: brush },
    { x: HOSE.x + 0.4, z: -1.4, r: 1.1, label: 'Bath time', icon: 'zoo-drop', when: free, act: bath },
    { x: CHART.x + 0.7, z: -1.5, r: 1.0, label: 'Measure them', icon: 'zoo-ruler', when: free, act: measure },
    { x: PAPER.x - 0.1, z: -1.35, r: 1.0, label: 'Bring the newspaper', icon: 'zoo-paper', when: free, act: newspaper },
    { x: RADIO.x, z: RADIO.z + 0.85, r: 1.1, label: 'Play some music', icon: 'music', when: free, act: disco },
  ];

  // ------------------------------------------------ per frame (props)
  function update(dt, t) {
    // Water drops
    if (drops.visible) {
      let alive = 0;
      for (let i = 0; i < DROPS; i++) {
        const d = dropList[i];
        if (d.life <= 0) {
          drops.setMatrixAt(i, m4.makeScale(0, 0, 0));
          continue;
        }
        alive++;
        d.v.y -= 9.8 * dt;
        d.p.addScaledVector(d.v, dt);
        d.life -= dt * 1.1;
        if (d.p.y < 0.03) {
          d.life = Math.min(d.life, 0.15);
          d.p.y = 0.03;
          d.v.multiplyScalar(0.2);
        }
        const k = d.s * Math.min(1, d.life * 4);
        drops.setMatrixAt(i, m4.compose(d.p, q.identity(), sc.set(k, k * 1.3, k)));
      }
      drops.instanceMatrix.needsUpdate = true;
      if (!alive) drops.visible = false;
    }
    // Music notes
    if (notes.visible) {
      let alive = 0;
      for (let i = 0; i < NOTES; i++) {
        const n = noteList[i];
        if (n.life <= 0) {
          notes.setMatrixAt(i, m4.makeScale(0, 0, 0));
          continue;
        }
        alive++;
        n.life -= dt * 0.55;
        n.p.addScaledVector(n.v, dt);
        n.p.x += Math.sin(t * 3 + i) * dt * 0.2;
        const k = Math.min(1, n.life * 3, (1 - n.life) * 6) * 1.1;
        q.setFromEuler(e.set(0, 0, n.r + Math.sin(t * 4 + i) * 0.3));
        notes.setMatrixAt(i, m4.compose(n.p, q, sc.set(k, k, k)));
      }
      notes.instanceMatrix.needsUpdate = true;
      if (!alive) notes.visible = false;
    }
    // Flames flicker
    for (const f of flames) if (f.visible) f.scale.set(1, 1 + Math.sin(t * 23 + f.position.x * 40) * 0.12, 1);
    // The lettuce hat falls off after a while, with a little shake
    if (leafHatT > 0) {
      leafHatT -= dt;
      if (leafHatT <= 0) {
        leafHat.visible = false;
        if (!Z.scene) jouri.trigger('wiggle', 2);
      }
    }
  }

  return { hotspots, update, feedTreat, ladder };
}
