import { THREE, P, COL, mat, mesh, tone, noise, nicker, whinny, crunch, meow, ponyIdle, glowTexture } from './kit.js';
import { makeCarrot, makeApple, makeSugar, makeBrush, makeFork, makeHelmet, wearHelmet } from './kit.js';

// Everything Roji and Homama can do inside the stable. Each activity is a short scene on a timeline:
// steps [[time, fn], ...]; it ends by itself after the last step (or when the player walks away).

const ease = (t) => 1 - Math.pow(1 - t, 3);
const back = (t) => {
  const c1 = 1.70158;
  return 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const pick = (list, n) => list[((n % list.length) + list.length) % list.length];

export function buildActs(R) {
  const { L, api, k } = R;
  const { ZS, ZW } = L;
  const v = new THREE.Vector3();
  const tweens = [];
  R.t = 0;
  const tween = (dur, fn, done) => tweens.push({ t: 0, dur, fn, done });
  const local = (wv) => wv.sub(R.g.position);

  // Small soft particles (sparkles, dust, water, straw, oats): short-lived dots, in local coordinates
  const SN = 160;
  const sp = new Float32Array(SN * 3);
  const sc = new Float32Array(SN * 3);
  const sv = new Float32Array(SN * 3);
  const sl = new Float32Array(SN);
  const sg = new Float32Array(SN);
  let sNext = 0;
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sGeo.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const sparks = new THREE.Points(sGeo, new THREE.PointsMaterial({ map: glowTexture(), vertexColors: true, size: 0.13, transparent: true, depthWrite: false }));
  sparks.frustumCulled = false;
  sp.fill(-50);
  R.add(R.dyn(sparks));
  const col3 = new THREE.Color();
  // wp: a world position (as the fx helpers take). opts: { spread, up, fall, life }
  const emit = (wp, colors, n = 10, { spread = 0.35, up = 1.0, fall = 2.5, life = 0.9 } = {}) => {
    const lp = local(wp.clone());
    for (let i = 0; i < n; i++) {
      const k2 = sNext;
      sNext = (sNext + 1) % SN;
      sp[k2 * 3] = lp.x + (Math.random() - 0.5) * spread;
      sp[k2 * 3 + 1] = lp.y + (Math.random() - 0.5) * spread * 0.5;
      sp[k2 * 3 + 2] = lp.z + (Math.random() - 0.5) * spread;
      const a = Math.random() * P * 2;
      const h = Math.random() * spread * 2;
      sv[k2 * 3] = Math.cos(a) * h;
      sv[k2 * 3 + 1] = up * (0.5 + Math.random());
      sv[k2 * 3 + 2] = Math.sin(a) * h;
      sl[k2] = life * (0.6 + Math.random() * 0.6);
      sg[k2] = fall;
      col3.set(colors[i % colors.length]);
      sc[k2 * 3] = col3.r;
      sc[k2 * 3 + 1] = col3.g;
      sc[k2 * 3 + 2] = col3.b;
    }
  };
  R.upd((dt) => {
    for (let i = 0; i < SN; i++) {
      if (sl[i] <= 0) continue;
      sl[i] -= dt;
      if (sl[i] <= 0) {
        sp[i * 3 + 1] = -50;
        continue;
      }
      sv[i * 3 + 1] -= sg[i] * dt;
      sp[i * 3] += sv[i * 3] * dt;
      sp[i * 3 + 1] = Math.max(0.02, sp[i * 3 + 1] + sv[i * 3 + 1] * dt);
      sp[i * 3 + 2] += sv[i * 3 + 2] * dt;
    }
    sGeo.attributes.position.needsUpdate = true;
    sGeo.attributes.color.needsUpdate = true;
  });
  R.bestTime = () => {
    try {
      const b = JSON.parse(localStorage.getItem('roji-arena-horserace-best'));
      return typeof b === 'number' ? b : null;
    } catch {
      return null;
    }
  };

  // ---------------------------------------------------------------- ponies: idle life plus "look here for a while"
  R.pose = (id, want, secs) => {
    const s = R.ponies[id];
    s.want = want;
    s.until = R.t + secs;
  };
  R.munch = (id, secs) => (R.ponies[id].munch = secs);
  R.shake = (id, secs) => (R.ponies[id].shake = secs);
  R.upd((dt, t) => {
    R.t = t;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt;
      const kk = Math.min(1, tw.t / tw.dur);
      tw.fn(kk);
      if (kk >= 1) {
        tweens.splice(i, 1);
        tw.done?.();
      }
    }
    for (const s of Object.values(R.ponies)) {
      const p = s.p;
      ponyIdle(p, t, s.base.seed ?? s.id.length);
      const sleepy = s.id === 'clover';
      const sd = s.id.length * 1.3;
      const idle = { nx: s.base.nx + Math.sin(t * 0.8 + sd) * 0.05 + (sleepy ? 0.18 + Math.max(0, Math.sin(t * 0.21)) * 0.12 : 0), ny: s.base.ny + Math.sin(t * 0.43 + sd * 2) * 0.28, hx: 0.55, hz: Math.sin(t * 0.6 + sd) * 0.06 };
      const w = s.want && t < s.until ? { ...idle, ...s.want } : idle;
      const r = 1 - Math.exp(-5 * dt);
      for (const key of ['nx', 'ny', 'hx', 'hz']) s.cur[key] += (w[key] - s.cur[key]) * r;
      p.neck.rotation.x = s.cur.nx;
      p.neck.rotation.y = s.cur.ny;
      p.head.rotation.x = s.cur.hx;
      p.head.rotation.z = s.cur.hz;
      if (s.munch > 0) {
        s.munch -= dt;
        p.head.rotation.x += Math.sin(t * 15) * 0.07;
      }
      if (s.shake > 0) {
        s.shake -= dt;
        const k2 = Math.min(1, s.shake);
        p.head.rotation.z += Math.sin(t * 28) * 0.3 * k2;
        if (s.whole) p.root.rotation.z = Math.sin(t * 24) * 0.09 * k2;
      } else if (s.whole) p.root.rotation.z = 0;
    }
  });
  const ponyHead = (id, out = new THREE.Vector3()) => R.ponies[id].p.head.localToWorld(out.set(0, -0.05, 0.3));
  const headOf = (actor, out = new THREE.Vector3()) => actor.kid.head.localToWorld(out.set(0, 0.7, 0));

  // ---------------------------------------------------------------- the timeline runner
  const play = (a, spec, steps, { every = null, cleanup = null } = {}) => {
    let T = 0;
    let i = 0;
    let done = false;
    a.activity({
      label: 'Done',
      ...spec,
      update: (dt, t) => {
        T += dt;
        while (i < steps.length && T >= steps[i][0]) steps[i++][1](T);
        every?.(dt, t, T);
        if (!done && i >= steps.length) {
          done = true;
          a.endActivity();
        }
      },
      onEnd: (silent) => cleanup?.(silent, done),
    });
  };
  // Put a thing in a kid's right hand (the arm the 'hold' and 'stir' poses raise). Returns a remover.
  const inHand = (actor, obj, at = [0, -0.33, 0.05], rot = [0, 0, 0]) => {
    obj.position.set(...at);
    obj.rotation.set(...rot);
    actor.kid.arms[1].add(obj);
    return () => obj.removeFromParent();
  };
  const sparkle = (a, wp, cols = ['#ffffff', '#fff2c0', '#ffd1dc'], n = 10) => emit(wp, cols, n, { spread: 0.3, up: 0.8, fall: 0.6, life: 0.9 });
  const pop = (a, f = 700) => tone(a.sound, f, 0.12, { type: 'triangle', gain: 0.05, slideTo: f * 1.5 });

  // ---------------------------------------------------------------- feeding Biscuit and Clover over their doors
  const FEED_LINES = {
    biscuit: ["Biscuit crunched the carrot in two bites. Homama says that is his pony's party trick.", 'Biscuit ate the apple, then checked Homama\'s pockets for more.', 'Two treats for Biscuit. He nickers a thank you and nods at Roji.'],
    clover: ['Clover woke up just long enough for an apple. Then she smiled and dozed off again.', 'Clover nibbles the carrot very slowly, like a little lady.', 'Clover ate both treats and went straight back to her nap.'],
  };
  const feed = (id) => (a) => {
    const cx = R.state.stall[id].cx;
    const n = a.load(`fed-${id}`, 0);
    a.save(`fed-${id}`, n + 1);
    const [k1, k2] = pick([['carrot', 'apple'], ['apple', 'carrot'], ['carrot', 'carrot']], n);
    const make = (kind) => (kind === 'carrot' ? makeCarrot() : makeApple(n % 2 ? '#7fd36a' : '#e5484d'));
    const t1 = make(k1);
    const t2 = make(k2);
    let rm1 = null;
    let rm2 = null;
    play(
      a,
      {
        seats: [
          { who: 'player', x: cx - 0.36, z: ZS + 0.62, yaw: P, pose: 'stand' },
          { who: 'partner', x: cx + 0.42, z: ZS + 0.72, yaw: P - 0.25, pose: 'stand' },
        ],
        focus: { x: cx, z: ZS + 0.3, y: 1.3, zoom: 0.42 },
        exit: { x: cx - 0.4, z: ZS + 1.35 },
      },
      [
        [0.2, () => ((rm1 = inHand(a.player, t1, [0, -0.33, 0.05], k1 === 'carrot' ? [P / 2, 0, 0] : [0, 0, 0])), (a.player.kid.hands = 'hold'), pop(a))],
        [0.6, () => R.pose(id, { nx: 0.62, ny: -0.32 }, 1.8)],
        [1.4, () => ((t1.visible = false), crunch(a.sound), R.munch(id, 1.3))],
        [1.75, () => crunch(a.sound)],
        [2.1, () => (crunch(a.sound), a.fx.heartsAt(ponyHead(id), 3))],
        [2.4, () => ((a.player.kid.hands = null), rm1?.(), (rm2 = inHand(a.partner, t2, [0, -0.33, 0.05], k2 === 'carrot' ? [P / 2, 0, 0] : [0, 0, 0])), (a.partner.kid.hands = 'hold'), pop(a, 820))],
        [2.8, () => R.pose(id, { nx: 0.62, ny: 0.34 }, 1.8)],
        [3.6, () => ((t2.visible = false), crunch(a.sound), R.munch(id, 1.3))],
        [3.95, () => crunch(a.sound)],
        [4.5, () => ((a.partner.kid.hands = null), rm2?.(), nicker(a.sound, id === 'clover' ? 1.15 : 1), a.fx.heartsAt(ponyHead(id), 4), R.pose(id, { nx: 0.05, hx: 0.3 }, 0.5))],
        [4.8, () => a.emote('player', 'cheer')],
        [5.0, () => a.toast(pick(FEED_LINES[id], n), 3400)],
        [5.8, () => {}],
      ],
      { cleanup: () => (rm1?.(), rm2?.()) },
    );
  };

  // ---------------------------------------------------------------- mucking out Rosie's stall (a silly job)
  const MUCK_LINES = ['All clean. Homama says it smelled like roses. It did not.', 'Fresh straw for Rosie. Homama held his breath the whole time and turned a little pink.', 'Roji cheered, Homama mucked out, and the flies went off to find a new hobby.'];
  const barrowHome = R.state.barrow.position.clone();
  const barrowYaw = R.state.barrow.rotation.y;
  const barrowIn = () => {
    const b = R.state.barrow;
    b.position.set(R.state.stall.rosie.cx + 0.95, 0, -3.5);
    b.rotation.y = P + 0.3;
  };
  const barrowOut = () => {
    R.state.barrow.position.copy(barrowHome);
    R.state.barrow.rotation.y = barrowYaw;
  };
  const muck = (a) => {
    const RS = R.state.stall.rosie;
    const piles = R.state.piles.filter((p) => p.visible);
    const n = a.load('mucked', 0);
    if (!piles.length) return fluff(a);
    a.save('mucked', n + 1);
    const fork = makeFork();
    fork.scale.setScalar(0.85);
    let rmF = null;
    const steps = [
      [0.1, () => ((rmF = inHand(a.homama, fork, [0, -0.32, 0.06], [P / 2 + 0.3, 0, 0])), (a.homama.kid.hands = 'stir'), (R.state.fork.visible = false), barrowIn())],
    ];
    piles.forEach((pile, i) => {
      const t0 = 0.5 + i * 1.6;
      const hx = pile.position.x - 0.5;
      const hz = pile.position.z + 0.2;
      steps.push([t0, () => (a.seat('homama', { x: hx, z: hz, yaw: Math.atan2(0.5, -0.2), pose: 'stand', hands: 'stir' }), (a.homama.kid.squash = 0.82), (R.state.flyTarget = new THREE.Vector3(hx, 1.75, hz)))]);
      steps.push([
        t0 + 0.6,
        () => {
          tween(0.35, (kk) => pile.scale.setScalar(Math.max(0.001, 1 - kk)), () => (pile.visible = false));
          tone(a.sound, 220, 0.18, { type: 'sine', gain: 0.07, slideTo: 140 });
          a.fx.puff(a.world(pile.position.x, pile.position.z, 0.1));
          const lo = R.state.barrowLoad;
          tween(0.4, (kk) => (lo.scale.y = Math.max(lo.scale.y, ((i + kk) / piles.length) * 0.7)));
        },
      ]);
    });
    const tEnd = 0.5 + piles.length * 1.6;
    steps.push([1.3, () => a.emote('roji', 'cheer')]);
    steps.push([2.6, () => a.emote('homama', 'spin')]);
    steps.push([tEnd, () => ((R.state.flyTarget = new THREE.Vector3(RS.cx + 2.6, 2.6, ZS + 1.5)), rmF?.(), (a.homama.kid.hands = null), (R.state.fork.visible = true))]);
    steps.push([tEnd + 0.3, () => ((R.rosieStraw.color.set('#ffffff')), emit(a.world(RS.cx, -4.6, 0.3), [COL.straw, '#ffe9a8', '#ffffff'], 40, { spread: 1.2, up: 2.2, fall: 5, life: 1.1 }), a.sound.ui('good'))]);
    steps.push([tEnd + 0.6, () => (a.emote('roji', 'cheer'), a.emote('homama', 'bow'))]);
    steps.push([tEnd + 0.9, () => a.toast(pick(MUCK_LINES, n), 3600)]);
    steps.push([tEnd + 2.4, () => {}]);
    play(
      a,
      {
        seats: [
          { who: 'roji', x: RS.cx + 0.25, z: ZS - 0.45, yaw: P + 0.4, pose: 'stand' },
          { who: 'homama', x: RS.cx - 0.2, z: -3.4, yaw: P, pose: 'stand' },
        ],
        focus: { x: RS.cx, z: -4.5, y: 0.6, zoom: 0.8 },
        exit: { x: RS.cx - 0.4, z: ZS + 1.4 },
      },
      steps,
      { cleanup: () => (rmF?.(), (R.state.fork.visible = true), (R.state.flyTarget = null), barrowOut()) },
    );
  };
  const fluff = (a) => {
    const RS = R.state.stall.rosie;
    play(
      a,
      {
        seats: [
          { who: 'roji', x: RS.cx - 0.5, z: -4.3, yaw: 0.3, pose: 'stand' },
          { who: 'homama', x: RS.cx + 0.6, z: -4.5, yaw: -0.3, pose: 'stand' },
        ],
        focus: { x: RS.cx, z: -4.7, y: 0.5, zoom: 0.8 },
        exit: { x: RS.cx - 0.4, z: ZS + 1.4 },
      },
      [
        [0.3, () => (emit(a.world(RS.cx - 0.5, -4.3, 0.3), [COL.straw, '#ffe9a8'], 30, { spread: 0.8, up: 2.6, fall: 5, life: 1.2 }), a.emote('roji', 'cheer'))],
        [1.1, () => (emit(a.world(RS.cx + 0.6, -4.5, 0.3), [COL.straw, '#ffe9a8'], 30, { spread: 0.8, up: 2.6, fall: 5, life: 1.2 }), a.emote('homama', 'spin'))],
        [1.9, () => emit(a.world(RS.cx, -4.4, 1.0), [COL.straw, '#ffe9a8', '#ffffff'], 50, { spread: 1.4, up: 2.0, fall: 4, life: 1.4 })],
        [2.2, () => a.toast("Fluffy straw for Rosie's nap tonight. Some of it is in Homama's hair.", 3200)],
        [3.6, () => {}],
      ],
    );
  };

  // ---------------------------------------------------------------- Rosie on the cross ties
  const RO = L.ROSIE;
  const GROOM_LINES = ['Rosie shines like a new penny. Then she nuzzles Roji, the way she always does.', "Brush, brush, brush. Rosie leans into Roji's hand and nuzzles her cheek.", 'Homama combs the tail, Roji brushes the coat, and Rosie gives Roji a soft nose kiss.'];
  const groom = (a) => {
    const n = a.load('groomed', 0);
    a.save('groomed', n + 1);
    const brush = makeBrush(COL.pink);
    brush.scale.setScalar(1.5);
    const comb = makeBrush(COL.blue);
    comb.scale.setScalar(1.5);
    let rmB = null;
    let rmC = null;
    let swish = 0;
    let spark = 0;
    play(
      a,
      {
        seats: [
          { who: 'roji', x: RO.x + 0.15, z: RO.z - 0.8, yaw: 0, pose: 'stand' },
          { who: 'homama', x: RO.x - 0.85, z: RO.z - 0.8, yaw: 0.35, pose: 'stand' },
        ],
        focus: { x: RO.x, z: RO.z, y: 1.05, zoom: 0.56 },
        exit: { x: RO.x - 0.3, z: RO.z + 1.6 },
      },
      [
        [0.1, () => ((rmB = inHand(a.roji, brush, [0, -0.34, 0.07], [P / 2, 0, 0])), (a.roji.kid.hands = 'stir'), (rmC = inHand(a.homama, comb, [0, -0.34, 0.07], [P / 2, 0, 0])), (a.homama.kid.hands = 'stir'))],
        [3.5, () => R.pose('rosie', { nx: 0.4, ny: 1.05, hz: 0.2 }, 3.0)],
        [4.2, () => ((a.roji.kid.hands = null), (a.roji.kid.squash = 0.85), a.fx.heartsAt(headOf(a.roji), 5), nicker(a.sound, 1.1), a.emote('roji', 'heart'))],
        [4.6, () => R.munch('rosie', 0.6)],
        [5.2, () => ((a.homama.kid.hands = null), a.emote('homama', 'cheer'))],
        [5.6, () => a.toast(pick(GROOM_LINES, n), 3400)],
        [6.6, () => {}],
      ],
      {
        every: (dt, t, T) => {
          if (T > 3.5) return;
          swish -= dt;
          spark -= dt;
          if (swish <= 0) {
            swish = 0.45;
            noise(a.sound, { dur: 0.16, freq: 3200, q: 0.7, gain: 0.04 });
          }
          if (spark <= 0) {
            spark = 0.35;
            sparkle(a, a.world(RO.x - 0.4 + Math.random() * 1.0, RO.z - 0.3, 1.0 + Math.random() * 0.3), [COL.trim, '#fff2c0', '#ffd1dc'], 8);
          }
        },
        cleanup: () => (rmB?.(), rmC?.()),
      },
    );
  };

  // Braids and ribbons in Roji's colour; the style changes every time and stays on Rosie
  const rosie = R.ponies.rosie.p;
  let styleObjs = [];
  const ribbonMat = () => mat(api.looks?.roji?.top || COL.rose, { rough: 0.45 });
  const bow = (m, s = 1) => {
    const b = new THREE.Group();
    for (const sg of [1, -1]) {
      const lobe = mesh(new THREE.SphereGeometry(0.05 * s, 8, 6), m);
      lobe.position.set(0, 0, 0.055 * sg * s);
      lobe.scale.set(0.6, 0.8, 1.2);
      b.add(lobe);
      const tail = mesh(new THREE.BoxGeometry(0.012 * s, 0.08 * s, 0.025 * s), m);
      tail.position.set(0, -0.055 * s, 0.03 * sg * s);
      tail.rotation.x = 0.3 * sg;
      b.add(tail);
    }
    b.add(mesh(new THREE.SphereGeometry(0.03 * s, 8, 6), m));
    return b;
  };
  const makeStyle = (style) => {
    const m = ribbonMat();
    const out = [];
    if (style === 0) {
      for (let i = 0; i < 5; i++) {
        const b = bow(m, 1.25);
        b.position.set(-0.07, 0.22 + i * 0.1, -0.08 + i * 0.075);
        rosie.neck.add(b);
        out.push(b);
      }
    } else if (style === 1) {
      for (let i = 0; i < 3; i++) {
        const knot = mesh(new THREE.SphereGeometry(0.075, 10, 8), mat('#6b3326', { rough: 0.7 }));
        knot.position.set(0, -0.14 - i * 0.15, -0.14 - i * 0.045);
        knot.scale.set(1, 0.8, 1);
        rosie.tail.add(knot);
        out.push(knot);
      }
      const b = bow(m, 1.6);
      b.position.set(0, -0.06, -0.02);
      rosie.tail.add(b);
      out.push(b);
    } else {
      const petals = ['#ffffff', m.color.getStyle(), '#ffffff', '#ffd166', '#ffffff', m.color.getStyle(), '#ffffff'];
      petals.forEach((c, i) => {
        const a = -1.2 + (i / (petals.length - 1)) * 2.4;
        const f = new THREE.Group();
        const petal = mesh(new THREE.SphereGeometry(0.045, 8, 6), mat(c, { rough: 0.5 }));
        petal.scale.set(1, 0.45, 1);
        const mid = mesh(new THREE.SphereGeometry(0.02, 6, 4), mat('#ffb627'));
        mid.position.y = 0.02;
        f.add(petal, mid);
        f.position.set(Math.sin(a) * 0.17, 0.2 + Math.cos(a) * 0.03, -0.02 + Math.cos(a) * 0.05);
        f.rotation.z = -a * 0.5;
        rosie.head.add(f);
        out.push(f);
      });
    }
    return out;
  };
  const setStyle = (style, shown = true) => {
    for (const o of styleObjs) o.removeFromParent();
    styleObjs = style >= 0 ? makeStyle(style) : [];
    if (!shown) for (const o of styleObjs) o.scale.setScalar(0.001);
    return styleObjs;
  };
  setStyle(api.load('style', -1));
  const BRAID_LINES = ["Five little bows in Roji's colour, all down Rosie's mane. Rosie looks very proud.", 'A braided tail with a big bow. Rosie swishes it to show it off.', 'A flower crown for Rosie. Homama says she looks like a princess pony. Roji agrees.'];
  const braid = (a) => {
    const n = a.load('braids', 0);
    a.save('braids', n + 1);
    const style = n % 3;
    a.save('style', style);
    const objs = setStyle(style, false);
    const roll = new THREE.Group();
    roll.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.07, 12), ribbonMat()));
    let rmR = null;
    const steps = [
      [0.1, () => ((a.roji.kid.hands = 'stir'), (rmR = inHand(a.homama, roll, [0, -0.33, 0.06], [0, 0, P / 2])), (a.homama.kid.hands = 'hold'), R.pose('rosie', { nx: 0.25, ny: 0.3 }, 6))],
    ];
    objs.forEach((o, i) => {
      steps.push([
        0.7 + i * 0.6,
        () => {
          tween(0.35, (kk) => o.scale.setScalar(Math.max(0.001, back(kk))));
          pop(a, 600 + i * 90);
          sparkle(a, o.getWorldPosition(new THREE.Vector3()), ['#ffffff', ribbonMat().color.getStyle(), '#fff2c0'], 8);
        },
      ]);
    });
    const tEnd = 0.9 + objs.length * 0.6;
    steps.push([tEnd, () => (R.shake('rosie', 0.9), whinny(a.sound, 1.1), a.fx.heartsAt(ponyHead('rosie'), 4), rmR?.(), (a.homama.kid.hands = null), (a.roji.kid.hands = null))]);
    steps.push([tEnd + 0.4, () => (a.emote('roji', 'cheer'), a.emote('homama', 'heart'))]);
    steps.push([tEnd + 0.7, () => a.toast(BRAID_LINES[style], 3400)]);
    steps.push([tEnd + 2.0, () => {}]);
    play(
      a,
      {
        seats: [
          { who: 'roji', x: RO.x + (style === 1 ? -1.05 : 0.55), z: RO.z - 0.78, yaw: style === 1 ? 0.5 : 0, pose: 'stand' },
          { who: 'homama', x: RO.x + (style === 1 ? -0.2 : 1.25), z: RO.z - 1.1, yaw: style === 1 ? -0.3 : -0.4, pose: 'stand' },
        ],
        focus: { x: RO.x + (style === 1 ? -0.5 : 0.6), z: RO.z, y: 1.25, zoom: 0.48 },
        exit: { x: RO.x + 0.3, z: RO.z + 1.6 },
      },
      steps,
      { cleanup: () => (rmR?.(), objs.forEach((o) => o.scale.setScalar(1))) },
    );
  };

  // A bath with the hose: water, bubbles, then Rosie shakes and everyone gets wet
  const N = 70;
  const drops = new Float32Array(N * 3);
  const dropV = new Float32Array(N * 3);
  const dropAge = new Float32Array(N).fill(9);
  const dropGeo = new THREE.BufferGeometry();
  dropGeo.setAttribute('position', new THREE.BufferAttribute(drops, 3));
  const water = new THREE.Points(dropGeo, new THREE.PointsMaterial({ map: glowTexture(), color: '#bfe8ff', size: 0.09, transparent: true, depthWrite: false, opacity: 0.9 }));
  water.frustumCulled = false;
  water.visible = false;
  R.add(R.dyn(water));
  const bubbleGrp = new THREE.Group();
  rosie.root.add(bubbleGrp);
  const bubbles = [];
  for (let i = 0; i < 16; i++) {
    const b = mesh(new THREE.SphereGeometry(0.07 + (i % 3) * 0.025, 10, 8), mat('#ffffff', { rough: 0.25 }), { cast: false });
    const side = i % 2 ? 1 : -1;
    const z = -0.6 + ((i * 0.37) % 1) * 1.2;
    b.position.set(side * (0.18 + (i % 4) * 0.04), 1.22 + ((i * 0.53) % 1) * 0.12, z);
    b.scale.setScalar(0.001);
    bubbleGrp.add(b);
    bubbles.push(b);
  }
  let spraying = false;
  let nozzle = null;
  R.upd((dt) => {
    if (!water.visible) return;
    let alive = 0;
    const src = nozzle ? local(nozzle.getWorldPosition(v)) : null;
    for (let i = 0; i < N; i++) {
      dropAge[i] += dt;
      if (dropAge[i] > 0.7 && spraying && src) {
        dropAge[i] = Math.random() * 0.1;
        drops[i * 3] = src.x;
        drops[i * 3 + 1] = src.y;
        drops[i * 3 + 2] = src.z;
        const tx = RO.x + (Math.random() - 0.5) * 1.2 - src.x;
        const tz = RO.z - src.z;
        dropV[i * 3] = tx * 1.6 + (Math.random() - 0.5) * 0.4;
        dropV[i * 3 + 1] = 2.2 + Math.random() * 0.6;
        dropV[i * 3 + 2] = tz * 1.6 + (Math.random() - 0.5) * 0.4;
      }
      if (dropAge[i] > 0.7) {
        drops[i * 3 + 1] = -5;
        continue;
      }
      alive++;
      dropV[i * 3 + 1] -= 9 * dt;
      drops[i * 3] += dropV[i * 3] * dt;
      drops[i * 3 + 1] = Math.max(0.02, drops[i * 3 + 1] + dropV[i * 3 + 1] * dt);
      drops[i * 3 + 2] += dropV[i * 3 + 2] * dt;
    }
    dropGeo.attributes.position.needsUpdate = true;
    if (!alive && !spraying) water.visible = false;
  });
  const BATH_LINES = ['Bubbles everywhere. Then Rosie shook, and Roji and Homama got a bath too.', 'Rosie loves the warm water. Homama does not love being splashed. Roji laughs.', 'Squeaky clean Rosie. Homama is the wettest one in the stable.'];
  const BUBBLE = [['#ffffff', '#ffffff'], ['#ffd1dc', '#ffffff'], ['#e5dcff', '#ffffff']];
  const bath = (a) => {
    const n = a.load('baths', 0);
    a.save('baths', n + 1);
    const [c1, c2] = pick(BUBBLE, n);
    bubbles.forEach((b, i) => (b.material = mat(i % 2 ? c1 : c2, { rough: 0.25 })));
    const hose = new THREE.Group();
    hose.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 8), mat('#3fbf7f')));
    const tip = mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.1, 8), mat(COL.sun));
    tip.position.y = -0.13;
    hose.add(tip);
    const sponge = new THREE.Group();
    sponge.add(mesh(new THREE.BoxGeometry(0.14, 0.07, 0.1), mat('#ffe066', { rough: 0.9 })));
    let rmH = null;
    let rmS = null;
    let hiss = 0;
    const shown = [];
    play(
      a,
      {
        seats: [
          { who: 'homama', x: RO.x - 1.55, z: RO.z + 0.95, yaw: P - 0.75, pose: 'stand' },
          { who: 'roji', x: RO.x + 0.35, z: RO.z - 0.8, yaw: 0, pose: 'stand' },
        ],
        focus: { x: RO.x - 0.4, z: RO.z + 0.2, y: 1.1, zoom: 0.58 },
        exit: { x: RO.x - 0.4, z: RO.z + 1.7 },
      },
      [
        [0.1, () => ((rmH = inHand(a.homama, hose, [0, -0.33, 0.06], [P / 2 + 0.5, 0, 0])), (a.homama.kid.hands = 'hold'), (nozzle = tip), (rmS = inHand(a.roji, sponge, [0, -0.34, 0.06])), (a.roji.kid.hands = 'stir'))],
        [0.4, () => ((spraying = true), (water.visible = true), dropAge.fill(9))],
        ...bubbles.map((b, i) => [0.7 + i * 0.17, () => (tween(0.25, (kk) => b.scale.setScalar(Math.max(0.001, back(kk)))), shown.push(b), i % 4 === 0 && pop(a, 900 + i * 20))]),
        [3.6, () => bubbles.forEach((b) => tween(0.5, (kk) => b.scale.setScalar(Math.max(0.001, 1 - kk))))],
        [4.4, () => ((spraying = false), (nozzle = null), rmH?.(), (a.homama.kid.hands = null))],
        [4.7, () => ((R.ponies.rosie.whole = true), R.shake('rosie', 1.3), whinny(a.sound, 1.05), noise(a.sound, { dur: 0.7, freq: 1500, q: 0.5, gain: 0.07 }))],
        [5.0, () => (emit(a.world(RO.x, RO.z, 1.2), ['#bfe8ff', '#ffffff', '#8fd3ff'], 70, { spread: 1.6, up: 2.4, fall: 6, life: 1.0 }), emit(headOf(a.homama), ['#bfe8ff', '#ffffff'], 20, { spread: 0.5, up: 1.2, fall: 5 }), emit(headOf(a.roji), ['#bfe8ff', '#ffffff'], 20, { spread: 0.5, up: 1.2, fall: 5 }))],
        [5.3, () => (a.emote('homama', 'spin'), a.emote('roji', 'cheer'), rmS?.(), (a.roji.kid.hands = null))],
        [6.2, () => ((R.ponies.rosie.whole = false), sparkle(a, a.world(RO.x, RO.z, 1.4), ['#ffffff', '#fff2c0', '#ffd1dc'], 30), a.sound.ui('good'))],
        [6.5, () => a.toast(pick(BATH_LINES, n), 3400)],
        [7.6, () => {}],
      ],
      {
        every: (dt, t, T) => {
          if (!spraying) return;
          hiss -= dt;
          if (hiss <= 0) {
            hiss = 0.5;
            noise(a.sound, { dur: 0.55, freq: 5200, q: 0.4, gain: 0.025, type: 'highpass' });
          }
        },
        cleanup: () => {
          spraying = false;
          nozzle = null;
          rmH?.();
          rmS?.();
          R.ponies.rosie.whole = false;
          rosie.root.rotation.z = 0;
          for (const b of bubbles) b.scale.setScalar(0.001);
        },
      },
    );
  };

  // A sugar cube from Homama's pocket tin, for Roji to give Rosie
  const SUGAR_LINES = ['One sugar cube a day, says Homama. Then he gives Roji another one for Rosie.', "Rosie knows the sound of Homama's sugar tin. Her ears go straight up.", "Crunch. Rosie nuzzles Roji's hand for the last crumbs."];
  const sugar = (a) => {
    const n = a.load('sugar', 0);
    a.save('sugar', n + 1);
    const tin = new THREE.Group();
    tin.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 14), mat(COL.pink)));
    const cube = makeSugar();
    let rmT = null;
    let rmC = null;
    play(
      a,
      {
        seats: [
          { who: 'roji', x: RO.x + 2.35, z: RO.z + 0.05, yaw: -P / 2, pose: 'stand' },
          { who: 'homama', x: RO.x + 2.55, z: RO.z - 0.62, yaw: -0.85, pose: 'stand' },
        ],
        focus: { x: RO.x + 1.7, z: RO.z + 0.2, y: 1.2, zoom: 0.4 },
        exit: { x: RO.x + 2.6, z: RO.z + 1.3 },
      },
      [
        [0.2, () => ((rmT = inHand(a.homama, tin, [0, -0.33, 0.05])), (a.homama.kid.hands = 'hold'), tone(a.sound, 1300, 0.06, { type: 'square', gain: 0.02 }), tone(a.sound, 1500, 0.06, { type: 'square', gain: 0.02 }, 0.08))],
        [1.0, () => ((rmC = inHand(a.roji, cube, [0, -0.33, 0.05])), (a.roji.kid.hands = 'hold'), rmT?.(), (a.homama.kid.hands = null), pop(a, 900))],
        [1.5, () => R.pose('rosie', { nx: 0.6, ny: 0.0 }, 1.8)],
        [2.3, () => ((cube.visible = false), crunch(a.sound), R.munch('rosie', 0.9))],
        [2.6, () => crunch(a.sound)],
        [3.0, () => ((a.roji.kid.hands = null), rmC?.(), a.fx.heartsAt(headOf(a.roji), 4), a.emote('roji', 'heart'), nicker(a.sound, 1.12))],
        [3.6, () => a.emote('homama', 'nod')],
        [3.9, () => a.toast(n === 0 ? "Homama always keeps sugar cubes in his pocket for Rosie, because Rosie is Roji's favourite." : pick(SUGAR_LINES, n), 3600)],
        [5.0, () => {}],
      ],
      { cleanup: () => (rmT?.(), rmC?.()) },
    );
  };

  // ---------------------------------------------------------------- helmets: Homama straps Roji's on, carefully
  let wornR = null;
  let wornH = null;
  const takeOff = () => {
    wornR?.();
    wornH?.();
    wornR = wornH = null;
    for (const h of R.state.helmets) h.shelf.visible = true;
    R.state.blueHelmet.visible = true;
  };
  R.onExit(takeOff);
  const helmets = async (a) => {
    const id = await a.choose({ title: "Roji's riding helmet", text: 'Pick one. Homama will strap it on for her.', options: R.state.helmets.map((h) => ({ id: h.id, label: h.label })) });
    if (!id) return;
    const h = R.state.helmets.find((q) => q.id === id);
    takeOff();
    a.save('helmet', id);
    const helm = makeHelmet(h.color, h.deco, h.kind);
    const HS = R.state.shelf;
    h.shelf.visible = false;
    let attached = false;
    const from = new THREE.Vector3();
    play(
      a,
      {
        seats: [
          { who: 'roji', x: HS.x - 1.05, z: ZW + 1.3, yaw: P / 2, pose: 'stand' },
          { who: 'homama', x: HS.x - 0.5, z: ZW + 1.3, yaw: -P / 2, pose: 'stand' },
        ],
        focus: { x: HS.x - 0.78, z: ZW + 1.3, y: 1.3, zoom: 0.36 },
        exit: { x: HS.x - 1.3, z: ZW + 2.2 },
      },
      [
        [0.2, () => (a.carry('homama', helm), pop(a, 760))],
        [1.0, () => {
          helm.getWorldPosition(from);
          a.carry('homama', null);
          R.g.add(helm);
          local(from);
          helm.position.copy(from);
          helm.rotation.set(0, -P / 2, 0);
          const to = local(a.roji.kid.head.localToWorld(new THREE.Vector3(0, 0.29, 0)));
          const mid = to.clone().add(new THREE.Vector3(0, 0.55, 0));
          tween(0.9, (kk) => helm.position.lerpVectors(from, mid, ease(kk)), () => tween(0.55, (kk) => helm.position.lerpVectors(mid, to, ease(kk))));
          a.homama.kid.hands = 'wave2';
        }],
        [2.55, () => {
          wornR = wearHelmet(a.roji.kid, helm);
          attached = true;
          a.homama.kid.hands = null;
          tone(a.sound, 1800, 0.05, { type: 'square', gain: 0.03 });
        }],
        [2.85, () => (tone(a.sound, 2000, 0.05, { type: 'square', gain: 0.03 }), a.emote('homama', 'nod'))],
        [3.5, () => (a.emote('roji', 'kiss'), a.emote('homama', 'kiss'))],
        [4.7, () => {
          const blue = makeHelmet(COL.navy, COL.sun, 'stripe');
          R.state.blueHelmet.visible = false;
          wornH = wearHelmet(a.homama.kid, blue);
          a.fx.poof(headOf(a.homama));
          a.emote('homama', 'cheer');
        }],
        [5.2, () => a.toast(`${h.label} for Roji, strapped on carefully by Homama. Safety first, then ponies.`, 3600)],
        [6.0, () => {}],
      ],
      {
        cleanup: () => {
          if (!attached) {
            a.carry('homama', null);
            helm.removeFromParent();
            h.shelf.visible = true;
          }
        },
      },
    );
  };

  // ---------------------------------------------------------------- the office: certificate and photo
  const CERT_LINES = ['Certificate of Riding: awarded to Roji for gentle hands, brave trotting and the kindest heart in the stable.', 'Homama had it framed the day Roji got it. He tells everyone about it.', 'Look closely at the signatures: three hoof prints, from Biscuit, Rosie and Clover.'];
  const cert = (a) => {
    const n = a.load('cert', 0);
    a.save('cert', n + 1);
    play(
      a,
      {
        seats: [
          { who: 'player', x: -11.3, z: ZW + 1.15, yaw: P, pose: 'stand' },
          { who: 'partner', x: -9.75, z: ZW + 1.2, yaw: P - 0.45, pose: 'stand' },
        ],
        focus: { x: -11.0, z: ZW + 0.4, y: 1.5, zoom: 0.34 },
        exit: { x: -10.6, z: ZW + 2.2 },
      },
      [
        [0.5, () => a.toast(pick(CERT_LINES, n), 3800)],
        [1.4, () => a.emote('partner', 'heart')],
        [4.4, () => {}],
      ],
    );
  };
  const PHOTO_LINES = ['Their first ride together. Homama held on to the saddle the whole time. Roji held on to Homama.', 'Roji on Rosie, Homama on Biscuit, and a heart drawn over them.', 'Roji says this is her favourite photo. Homama says that about every photo of Roji.'];
  const photo = (a) => {
    const n = a.load('photo', 0);
    a.save('photo', n + 1);
    const X = -9.55;
    play(
      a,
      {
        seats: [
          { who: 'player', x: X - 0.4, z: ZW + 1.15, yaw: P, pose: 'stand' },
          { who: 'partner', x: X + 0.4, z: ZW + 1.15, yaw: P, pose: 'stand' },
        ],
        focus: { x: X, z: ZW + 0.5, y: 1.45, zoom: 0.34 },
        exit: { x: X, z: ZW + 2.2 },
      },
      [
        [0.5, () => a.toast(pick(PHOTO_LINES, n), 3600)],
        [2.8, () => (a.seat('player', { x: X - 0.28, z: ZW + 1.15, yaw: P / 2, pose: 'stand' }), a.seat('partner', { x: X + 0.28, z: ZW + 1.15, yaw: -P / 2, pose: 'stand' }))],
        [3.0, () => (a.emote('player', 'hug'), a.emote('partner', 'hug'), a.fx.heartsAt(a.world(X, ZW + 1.15, 1.9), 5))],
        [5.4, () => {}],
      ],
    );
  };
  const pet = (a) => {
    const cat = R.state.cat;
    const s = a.sound;
    if (s?.ctx && !s.muted) for (let i = 0; i < 6; i++) s.tone(62 + (i % 2) * 6, s.ctx.currentTime + i * 0.18, 0.2, { type: 'triangle', gain: 0.05 });
    meow(s);
    a.fx.heartsAt(cat.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.4, 0)), 4);
    tween(1.6, (kk) => (cat.head.rotation.z = Math.sin(kk * P) * 0.5));
    a.emote('player', 'heart');
    a.toast(pick(['Marmalade the barn cat purrs. She thinks the armchair is hers. It is.', 'Marmalade opens one eye, purrs, and goes back to sleep.', 'A happy purr. Marmalade has been the boss of this stable for years.'], a.load('pets', 0)), 3200);
    a.save('pets', a.load('pets', 0) + 1);
  };

  // ---------------------------------------------------------------- the hall: lessons, rosettes, the race
  const showRosettes = () => {
    const wins = api.load('wins', 0);
    R.state.rosettes.forEach((r, i) => (r.visible = i < wins));
    R.state.cupText.userData.redraw();
  };
  showRosettes();
  R.onEnter(showRosettes);
  const EZ = R.state.easel;
  const lesson = (a) => {
    const n = a.load('lesson', 0);
    a.save('lesson', n + 1);
    const best = R.bestTime();
    const lines = [
      'Monday: Roji trots on Rosie. Wednesday: Homama learns to steer. Friday: a picnic ride for two.',
      best ? `Fastest Meadow Cup so far: ${best.toFixed(1)} seconds. Through the big doors to beat it.` : 'The Meadow Cup is waiting through the big doors. Win it for a rosette.',
      'Sunday: the ponies get a day off. So do Roji and Homama.',
    ];
    play(
      a,
      {
        seats: [
          { who: 'player', x: EZ.x - 0.35, z: EZ.z + 1.0, yaw: P + 0.25, pose: 'stand' },
          { who: 'partner', x: EZ.x + 0.45, z: EZ.z + 1.05, yaw: P + 0.1, pose: 'stand' },
        ],
        focus: { x: EZ.x, z: EZ.z, y: 1.2, zoom: 0.36 },
        exit: { x: EZ.x, z: EZ.z + 1.6 },
      },
      [
        [0.5, () => a.toast(pick(lines, n), 3600)],
        [1.6, () => a.emote('partner', 'nod')],
        [4.2, () => {}],
      ],
    );
  };
  const MB = R.state.cupBoard;
  const rosettes = (a) => {
    showRosettes();
    const wins = a.load('wins', 0);
    const best = R.bestTime();
    play(
      a,
      {
        seats: [
          { who: 'player', x: MB.x - 0.3, z: MB.z + 1.2, yaw: P, pose: 'stand' },
          { who: 'partner', x: MB.x + 0.45, z: MB.z + 1.3, yaw: P - 0.3, pose: 'stand' },
        ],
        focus: { x: MB.x, z: MB.z + 0.3, y: 1.55, zoom: 0.36 },
        exit: { x: MB.x, z: MB.z + 1.9 },
      },
      [
        [0.4, () => a.toast(wins ? `${wins} Meadow Cup ${wins === 1 ? 'rosette' : 'rosettes'} on the board${best ? `, and a best time of ${best.toFixed(1)} s` : ''}. Homama polishes them every Sunday.` : 'An empty board, waiting. Win the Meadow Cup to pin your first rosette here.', 3600)],
        [1.2, () => a.emote('partner', wins ? 'cheer' : 'nod')],
        [4.0, () => {}],
      ],
    );
  };
  const race = async (a) => {
    if (!a.hasArena('horserace')) return a.toast('The riding ring is being raked. Come back soon.');
    const before = a.load('wins', 0);
    const r = await a.playArena('horserace');
    if (r?.win) {
      a.save('wins', before + 1);
      showRosettes();
      const ro = R.state.rosettes[Math.min(before, R.state.rosettes.length - 1)];
      if (ro) {
        ro.visible = true;
        ro.scale.setScalar(0.001);
        tween(0.6, (kk) => ro.scale.setScalar(Math.max(0.001, back(kk))));
      }
      setTimeout(() => a.toast('A new rosette for the Meadow Cup board!', 2600), 700);
    } else showRosettes();
  };
  const hello = (a) => {
    const girl = R.state.girl;
    girl.emote('wave');
    const n = a.load('hello', 0);
    a.save('hello', n + 1);
    a.toast(`Stable girl: "${pick(['Hello! Rosie is on the cross ties, all ready for you.', 'Biscuit tried to eat my hat again this morning.', 'Clover sleeps more than any pony I know.', 'Homama asked me to save the best carrots for Roji. I did.'], n)}"`, 3200);
    a.sound.ui('pop');
  };

  // ---------------------------------------------------------------- the feed room: scoop breakfast, and the little tin
  const scoop = (a) => {
    const lid = R.state.binLid;
    const buckets = R.state.buckets;
    play(
      a,
      {
        seats: [
          { who: 'player', x: -11.2, z: -5.5, yaw: P, pose: 'stand', hands: 'stir' },
          { who: 'partner', x: -10.25, z: -5.5, yaw: P - 0.3, pose: 'stand', hands: 'stir' },
        ],
        focus: { x: -10.4, z: -5.4, y: 1.0, zoom: 0.46 },
        exit: { x: -9.5, z: -4.2 },
      },
      [
        [0.2, () => (tween(0.4, (kk) => (lid.rotation.x = -1.25 * ease(kk))), tone(a.sound, 300, 0.2, { type: 'triangle', gain: 0.05, slideTo: 200 }))],
        [0.9, () => emit(a.world(-11.2, -6.3, 0.95), ['#e8cf8f', '#f6e3b0'], 24, { spread: 0.4, up: 1.6, fall: 5 })],
        ...buckets.map((b, i) => [1.4 + i * 0.7, () => (tween(0.35, (kk) => b.scale.set(1, Math.max(0.001, ease(kk) * 0.55), 1)), emit(b.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.25, 0)), ['#e8cf8f', '#f6e3b0'], 12, { spread: 0.2, up: 0.8, fall: 4 }), noise(a.sound, { dur: 0.25, freq: 2400, q: 0.6, gain: 0.05 }))]),
        [3.6, () => (R.pose('biscuit', { nx: 0.0, hx: 0.25 }, 1.4), R.pose('clover', { nx: 0.0, hx: 0.3 }, 1.4), whinny(a.sound, 1.0))],
        [3.9, () => tween(0.4, (kk) => (lid.rotation.x = -1.25 * (1 - ease(kk))))],
        [4.2, () => a.toast('Breakfast for Biscuit, Rosie and Clover. Clover heard the oats and woke right up.', 3400)],
        [4.6, () => a.emote('player', 'cheer')],
        [5.4, () => {}],
      ],
      { cleanup: () => (lid.rotation.x = 0) },
    );
  };
  R.onEnter(() => {
    for (const b of R.state.buckets) b.scale.set(1, 0.001, 1);
    for (const p of R.state.piles) {
      p.visible = true;
      p.scale.setScalar(1);
    }
    R.state.barrowLoad.scale.y = 0.001;
    R.rosieStraw.color.set('#d9c39a');
    R.state.flyTarget = null;
    for (const s of Object.values(R.ponies)) s.want = null;
  });
  const TIN = R.state.tin;
  const tinNote = (a) => {
    const lidT = R.state.tinLid;
    play(
      a,
      {
        seats: [
          { who: 'player', x: TIN.x, z: -5.5, yaw: P, pose: 'stand' },
          { who: 'partner', x: TIN.x + 0.75, z: -5.3, yaw: P + 0.45, pose: 'stand' },
        ],
        focus: { x: TIN.x, z: TIN.z + 0.3, y: 1.6, zoom: 0.3 },
        exit: { x: TIN.x + 0.2, z: -4.3 },
      },
      [
        [0.4, () => (tween(0.4, (kk) => (lidT.rotation.x = -1.7 * ease(kk))), tone(a.sound, 1250, 0.08, { type: 'square', gain: 0.02 }))],
        [0.9, () => (sparkle(a, a.world(TIN.x, TIN.z, TIN.y + 0.3), ['#ffffff', COL.pink], 12), a.toast("A note in the tin, in Homama's writing: For Rosie, because she is Roji's favourite. One a day. Maybe two.", 4200))],
        [2.0, () => a.emote(a.playerId === 'roji' ? 'player' : 'partner', 'heart')],
        [3.8, () => tween(0.4, (kk) => (lidT.rotation.x = -1.7 * (1 - ease(kk))))],
        [4.5, () => {}],
      ],
      { cleanup: () => (lidT.rotation.x = 0) },
    );
  };

  // ---------------------------------------------------------------- hotspots
  const RS = R.state.stall;
  R.hot(
    { x: RS.biscuit.cx, z: ZS + 0.75, r: 1.15, label: 'Feed Biscuit', icon: 'yum', act: feed('biscuit') },
    { x: RS.clover.cx, z: ZS + 0.75, r: 1.15, label: 'Feed Clover', icon: 'yum', act: feed('clover') },
    { x: RS.rosie.cx, z: ZS + 0.7, r: 1.1, label: () => (R.state.piles.some((p) => p.visible) ? 'Muck out the stall' : 'Fluff the straw'), icon: 'home', act: muck },
    { x: RO.x - 0.35, z: RO.z + 0.95, r: 1.0, label: 'Groom Rosie', icon: 'heart', act: groom },
    { x: RO.x + 0.9, z: RO.z + 0.95, r: 0.9, label: "Braid Rosie's mane", icon: 'star', act: braid },
    { x: RO.x - 1.7, z: RO.z - 1.05, r: 1.1, label: 'Give Rosie a bath', icon: 'star', act: bath },
    { x: RO.x + 2.45, z: RO.z, r: 1.0, label: 'Give Rosie a sugar cube', icon: 'heart', act: sugar },
    { x: R.state.shelf.x - 0.8, z: ZW + 0.95, r: 1.2, label: 'Pick riding helmets', icon: 'star', act: helmets },
    { x: -11.0, z: ZW + 1.3, r: 0.95, label: 'Read the certificate', icon: 'book', act: cert },
    { x: -9.55, z: ZW + 1.3, r: 0.85, label: 'Look at the photo', icon: 'heart', act: photo },
    { x: -7.6, z: 6.2, r: 0.9, label: 'Pet the cat', icon: 'heart', act: pet },
    { x: EZ.x + 0.1, z: EZ.z + 0.95, r: 1.1, label: 'Read the lesson board', icon: 'book', act: lesson },
    { x: MB.x, z: MB.z + 1.25, r: 1.0, label: 'Look at the rosettes', icon: 'star', act: rosettes },
    { x: 8.4, z: L.ZB + 1.5, r: 1.4, label: 'Horse race', icon: 'horse', act: race },
    { x: 10.6, z: -4.2, r: 1.1, label: 'Say hello', icon: 'smile', act: hello },
    { x: -11.2, z: -5.45, r: 0.9, label: 'Scoop the oats', icon: 'yum', act: scoop },
    { x: TIN.x, z: -5.45, r: 0.85, label: 'Open the little tin', icon: 'heart', act: tinNote },
  );
}
