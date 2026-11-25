import { THREE, COL, SIDE, NAME, suitUp, Fencer, person, whites, deck, tone, bellTone, clamp, heartPath, roundRect, FONT, fitText } from './kit.js';
import { Bout } from './bout.js';
import { L } from './layout.js';

// The club's people and everything Roji and Homama can do inside: suit up, a practice bout, the salute, the coach's
// footwork lesson, a team photo by the trophy wall, watching a bout from the stand, the Fencing Duel and the bell.

const P = Math.PI;
const IDS = ['roji', 'homama'];

const COACH = { id: 'coach', name: 'Coach', gender: 'boy', skin: '#e3b08e', hair: '#a3a3ad', hairstyle: 'sidepart', mustache: '#6b5a50', outfit: 'tee-pants', top: '#ffffff', bottom: COL.navy, shoes: '#ffffff', accent: COL.gold };
const LINA = { id: 'lina', name: 'Lina', gender: 'girl', skin: '#f2cdb4', hair: '#7a4a26', hairstyle: 'bob', accent: COL.red };
const SAMI = { id: 'sami', name: 'Sami', gender: 'boy', skin: '#9c6a4a', hair: '#2a1a13', hairstyle: 'spiky', accent: COL.green };
const TALA = { id: 'tala', name: 'Tala', gender: 'girl', skin: '#c98f68', hair: '#141010', hairstyle: 'ponytail', accent: COL.blue };
const FANS = [
  { id: 'fan1', name: 'Watcher', gender: 'boy', skin: '#f8dccb', hair: '#4a2c1a', hairstyle: 'curly', outfit: 'tee-shorts', top: COL.green, bottom: '#2c3e66', shoes: '#ffffff', accent: COL.gold },
  { id: 'fan2', name: 'Watcher', gender: 'girl', skin: '#e3b08e', hair: '#2a1a13', hairstyle: 'pigtails', outfit: 'dress', top: '#c7a6ff', bottom: '#c7a6ff', shoes: '#3b2b3f', accent: '#ffd166' },
];

const LINES = {
  touch: [(A) => `${A} lunges and touches first!`, (A) => `Straight in. Point to ${A}.`, (A) => `${A} finds the shoulder. Touch!`, (A) => `Quick as a wink: a touch for ${A}.`],
  parry: [(A, D) => `${D} parries and ripostes. Lovely!`, (A, D) => `Clink, parry, touch. Point to ${D}.`, (A, D) => `${D} saw it coming: parry, riposte, point.`],
  double: [() => 'Both lamps at once: a double touch!', () => 'Double! Both lights, both laughing.'],
  short: [(A, D) => `Just short. ${D} steps back in time.`, (A) => `${A} falls short. So close!`],
};

export function buildActs(R) {
  const { api, add } = R;
  const make = (look) => R.ictx.makeKid(look);
  const { PISTE, GUARD, TROPHY, MAT, DESK, STAND } = L;
  const toast = (html, ms = 2400) => api.toast(html, ms);
  const sound = () => api.sound;
  const ding = (f = 880) => bellTone(sound(), sound()?.ctx?.currentTime ?? 0, f, 0.05);
  const v = new THREE.Vector3();

  // ---------------------------------------------------------------- the coach
  const coach = person(make, COACH, {
    mode: 'live',
    scale: 1.2,
    kit: COL.gold,
    jacket: true,
    mask: 'none',
    dress: (kid) => {
      // a whistle on a cord
      const cord = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.008, 4, 16), new THREE.MeshStandardMaterial({ color: COL.navy, roughness: 0.6 }));
      cord.rotation.x = P / 2 + 0.5;
      cord.position.set(0, 0.7, 0.06);
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.06, 8), new THREE.MeshStandardMaterial({ color: COL.gold, roughness: 0.3, metalness: 0.6 }));
      w.rotation.z = P / 2;
      w.position.set(0, 0.6, 0.2);
      kid.body.add(cord, w);
    },
  });
  const CH = { x: 7.9, z: 4.0, yaw: -0.75 };
  const ck = coach.kid;
  ck.root.position.set(CH.x, 0, CH.z);
  ck.root.rotation.y = CH.yaw;
  add(R.dyn(ck.root));
  const coachState = { spot: { ...CH }, clap: -1, cheerT: 6 };
  const coachTo = (s) => {
    coachState.spot = { ...s };
    ck.root.position.set(s.x, s.y ?? 0, s.z);
    ck.root.rotation.y = s.yaw;
  };
  R.upd((dt, t) => {
    ck.update(dt, t, 0, 0, 0);
    if (coachState.clap >= 0) {
      coachState.clap += dt;
      const c = Math.max(0, Math.sin(Math.min(1, coachState.clap / 0.28) * P));
      ck.arms[0].rotation.set(-1.25, 0, 0.55 - c * 0.75);
      ck.arms[1].rotation.set(-1.25, 0, -0.55 + c * 0.75);
      if (coachState.clap > 0.28) coachState.clap = -1;
    }
    // a wave now and then when Roji and Homama come close (not during an activity)
    coachState.cheerT -= dt;
    if (coachState.cheerT < 0 && !show && !api.activityRunning) {
      coachState.cheerT = 7 + Math.random() * 5;
      const p = api.localPos(api.player);
      if (Math.hypot(p.x - ck.root.position.x, p.z - ck.root.position.z) < 3.4) ck.emote(Math.random() < 0.6 ? 'wave' : 'nod');
    }
  });

  // ---------------------------------------------------------------- Lina and Sami bouting on piste A
  const npcF = [LINA, SAMI].map((look, i) => {
    const p = person(make, whites(look), { mode: 'live', kit: i ? COL.green : COL.red, mask: 'head', cast: true });
    add(R.dyn(p.kid.root));
    const f = new Fencer(p.kid, p.gear, i ? -1 : 1);
    f.to('idle');
    return f;
  });
  const boutA = new Bout(npcF[0], npcF[1], { x: PISTE.x, z: PISTE.z.a, y: PISTE.y, guard: GUARD });
  const boardA = R.boards.a;
  boardA.set(['Lina', 'Sami'], ['#ff8a8f', '#8af0b6'], [0, 0]);
  const pickA = deck(['touch', 'parry', 'touch', 'double', 'touch', 'parry', 'short']);
  boutA.onTouch = (who, out, att) => {
    boardA.touch(who);
    R.onWatchTouch?.(who, out, att);
  };
  R.upd((dt, t) => {
    if (boutA.idle) {
      if (Math.max(...boardA.score) >= 5) {
        boutA.push(...boutA.salute(1.5), { d: 0.3, go: () => (boardA.reset(), npcF.forEach((f) => f.to('idle', 6))) });
      } else boutA.push(...boutA.exchange(Math.random() < 0.5 ? 0 : 1, pickA()));
    }
    boutA.update(dt);
    for (const f of npcF) f.kid.update(dt, t, 0, 0, 0);
    boutA.apply(dt);
  });

  // ---------------------------------------------------------------- Tala practising lunges at the target
  {
    const p = person(make, whites(TALA), { mode: 'live', kit: COL.blue, mask: 'head', cast: true });
    add(R.dyn(p.kid.root));
    const f = new Fencer(p.kid, p.gear, 1);
    f.to('idle');
    const x = R.target.x - 1.22;
    const z = R.target.z;
    const loop = [
      [1.3, () => f.to('idle', 8)],
      [0.35, () => f.stepBy(0.14)],
      [0.35, () => f.stepBy(-0.14)],
      [0.22, () => f.to('windup', 14)],
      [0.7, () => (f.to('lunge', 16), (wob = 0.4))],
      [0.6, () => f.to('idle', 7)],
    ];
    let i = 0;
    let tt = 0;
    let wob = 0;
    loop[0][1]();
    R.upd((dt, t) => {
      tt += dt;
      if (tt >= loop[i][0]) {
        tt = 0;
        i = (i + 1) % loop.length;
        loop[i][1]();
      }
      p.kid.update(dt, t, 0, 0, 0);
      f.apply(dt, x, 0, z);
      wob = Math.max(0, wob - dt);
      R.target.pad.rotation.x = Math.sin(wob * 30) * wob * 0.3;
    });
  }

  // ---------------------------------------------------------------- watchers on the stand
  FANS.forEach((look, i) => {
    const p = person(make, look, { pose: 'sit', hands: i ? null : 'wave2', mode: 'still', cast: false });
    const h = STAND.tiers[1];
    p.kid.root.position.set(i ? 6.15 : 1.05, h - 0.25, STAND.front - STAND.depth - 0.15);
    add(p.kid.root);
  });

  // ---------------------------------------------------------------- suits on and off
  const suit = { on: false, gear: {} };
  const attached = (gear, kid) => {
    for (let o = gear?.wrist; o; o = o.parent) if (o === kid.root) return true;
    return false;
  };
  const dress = (on) => {
    for (const id of IDS) {
      const kid = api[id].kid;
      const g = suit.gear[id];
      if (on) {
        if (!attached(g, kid)) suit.gear[id] = suitUp(kid, SIDE[id]);
      } else if (g) {
        g.remove();
        suit.gear[id] = null;
      }
    }
    suit.on = on;
  };
  const poof = () => IDS.forEach((id) => api.fx.poof(api[id].kid.root.position.clone().add(v.set(0, 0.7, 0))));
  const ensureSuit = () => {
    const was = suit.on && IDS.every((id) => attached(suit.gear[id], api[id].kid));
    if (was) return false;
    dress(true);
    poof();
    return true;
  };
  const masks = (mode) => IDS.forEach((id) => suit.gear[id]?.setMask(mode));
  R.suit = suit;

  // The running show: an activity's moves, applied after the kids' own animation every frame
  let show = null;
  R.upd((dt, t) => show?.update(dt, t));
  const endShow = () => {
    show?.cleanup?.();
    show = null;
  };

  // ---------------------------------------------------------------- the lockers
  const suitLines = {
    on: deck(['White jackets on, masks under the arm. En garde soon!', 'Jackets zipped, gloves on. Homama checks that Roji\u2019s collar is just right.', 'Whites on! Roji and Homama look like real champions.']),
    off: deck(['Whites back in the lockers. What a session!', 'Jackets off, masks away. Same time next weekend?']),
  };
  R.hot({
    x: (R.lockers.spot('roji').x + R.lockers.spot('homama').x) / 2,
    z: R.lockers.spot('roji').z + 0.35,
    r: 1.4,
    label: () => (suit.on ? 'Change back' : 'Suit up'),
    icon: 'shirt',
    act: (a) => {
      const on = !suit.on;
      const rs = R.lockers.spot('roji');
      const hs = R.lockers.spot('homama');
      let t = 0;
      let done = false;
      const apply = () => {
        if (done) return;
        done = true;
        dress(on);
        poof();
        a.sound.ui('pop');
        toast(on ? suitLines.on() : suitLines.off(), 2600);
      };
      endShow();
      a.activity({
        label: 'Done',
        seats: [
          { who: 'roji', x: rs.x, z: rs.z, yaw: P, pose: 'stand' },
          { who: 'homama', x: hs.x, z: hs.z, yaw: P, pose: 'stand' },
        ],
        focus: { x: (rs.x + hs.x) / 2, z: rs.z - 0.55, y: 1.0, zoom: 0.45 },
        exit: { x: rs.x - 0.2, z: rs.z + 0.55 },
        onEnd: () => {
          apply();
          R.lockers.open(0);
          if (show?.id === 'lockers') show = null;
        },
      });
      show = {
        id: 'lockers',
        update(dt) {
          t += dt;
          const open = t < 2.5 ? clamp(t / 0.45, 0, 1) : clamp(1 - (t - 2.5) / 0.4, 0, 1);
          R.lockers.open(open);
          if (t > 0.9) apply();
          if (t > 1.05) for (const id of IDS) a[id].yaw = 0;
          if (t > 1.5 && on && !this.heart) {
            this.heart = true;
            a.emote('homama', 'heart');
          }
          if (t > 3.1) a.endActivity();
        },
      };
    },
  });

  // ---------------------------------------------------------------- a practice bout and the salute on piste B
  const boardB = R.boards.b;
  boardB.set(['Roji', 'Homama'], [SIDE.roji, SIDE.homama], [0, 0]);
  const zb = PISTE.z.b;
  const pickLine = Object.fromEntries(Object.entries(LINES).map(([k, list]) => [k, deck(list)]));
  const pisteSeats = () => [
    { who: 'roji', x: PISTE.x - GUARD, z: zb, y: PISTE.y, yaw: P / 2, pose: 'stand' },
    { who: 'homama', x: PISTE.x + GUARD, z: zb, y: PISTE.y, yaw: -P / 2, pose: 'stand' },
  ];
  const fencersOfKids = () => {
    const FR = new Fencer(api.roji.kid, suit.gear.roji, 1, { actor: api.roji, origin: api.space.origin });
    const FH = new Fencer(api.homama.kid, suit.gear.homama, -1, { actor: api.homama, origin: api.space.origin });
    return [FR, FH];
  };
  const blowKiss = (k, t) => {
    // Homama's free hand to his lips, then out toward Roji, with hearts floating over
    const arm = k.arms[0];
    if (t < 0.45) arm.rotation.set(-2.35, 0, -0.62);
    else arm.rotation.set(-1.55 + Math.min(1, (t - 0.45) * 3) * 0.2, 0, -0.2 + Math.min(1, (t - 0.45) * 3) * 0.75);
  };
  const heartsBetween = (u) => {
    const a = api.homama.kid.head.getWorldPosition(new THREE.Vector3());
    const b = api.roji.kid.head.getWorldPosition(new THREE.Vector3());
    api.fx.heartsAt(a.lerp(b, u).add(v.set(0, 0.55, 0)), 2);
  };

  // Plan a bout to 3: who scores each touch, with now and then a double or a near miss
  const planBout = () => {
    const win = Math.random() < 0.5 ? 0 : 1;
    const lose = Math.floor(Math.random() * 3);
    const pts = [win, win];
    for (let i = 0; i < lose; i++) pts.push(1 - win);
    pts.sort(() => Math.random() - 0.5);
    pts.push(win); // the winning touch comes last
    const plan = pts.map((s) => {
      const self = Math.random() < 0.6;
      return { att: self ? s : 1 - s, out: self ? 'touch' : 'parry' };
    });
    if (Math.random() < 0.5) plan.splice(Math.floor(Math.random() * plan.length), 0, { att: Math.random() < 0.5 ? 0 : 1, out: 'short' });
    // a double touch adds a point each, so it replaces one point of each fencer when the loser has one
    if (lose > 0 && Math.random() < 0.4) {
      const iw = plan.findIndex((p, j) => j < plan.length - 1 && p.out !== 'short' && (p.out === 'touch' ? p.att : 1 - p.att) === win);
      const il = plan.findIndex((p) => p.out !== 'short' && (p.out === 'touch' ? p.att : 1 - p.att) === 1 - win);
      if (iw >= 0 && il >= 0) {
        plan[Math.min(iw, il)] = { att: win, out: 'double' };
        plan.splice(Math.max(iw, il), 1);
      }
    }
    return { win, lose, plan };
  };

  R.hot({
    x: PISTE.x - 1.7,
    z: zb + 1.3,
    r: 1.3,
    label: 'Practice bout',
    icon: 'fencing',
    act: (a) => {
      endShow();
      const fresh = ensureSuit();
      const [FR, FH] = fencersOfKids();
      const bout = new Bout(FR, FH, { x: PISTE.x, z: zb, y: PISTE.y, guard: GUARD });
      boardB.reset();
      const { win, lose, plan } = planBout();
      const names = [NAME.roji, NAME.homama];
      bout.onTouch = (who, out, att) => {
        boardB.touch(who);
        ding(who.length > 1 ? 660 : who[0] ? 784 : 988);
        toast(pickLine[out]()(names[att], names[1 - att]), 1700);
      };
      bout.push({ d: fresh ? 0.6 : 0.2, go: () => masks('hand') }, ...bout.salute(1.4));
      bout.push({ d: 0.9, go: () => (masks('head'), FR.to('idle', 8), FH.to('idle', 8), toast('En garde. Ready? Allez!', 1400)) });
      for (const p of plan) bout.push(...bout.exchange(p.att, p.out));
      let kiss = -1;
      bout.push(
        { d: 0.7, go: () => (FR.to('stand', 6), FH.to('stand', 6)) },
        { d: 1.1, go: () => (suit.gear.homama?.setMask('up'), toast(`${names[win]} wins, 3 to ${lose}!`, 2200), a.sound.ui('win')) },
        { d: 1.5, go: () => (kiss = 0) },
        { d: 2.0, go: () => ((kiss = -1), suit.gear.roji?.setMask('up'), (FR.free = true), a.emote('roji', 'heart')) },
        { d: 0.2, go: () => a.endActivity() },
      );
      a.activity({
        label: 'Stop',
        seats: pisteSeats(),
        focus: { x: PISTE.x, z: zb, y: 0.9, zoom: 0.5 },
        exit: { x: PISTE.x - 1.0, z: zb + 1.25 },
        onEnd: () => {
          masks('hand');
          FR.reset();
          FH.reset();
          if (show?.id === 'bout') show = null;
        },
      });
      show = {
        id: 'bout',
        update(dt, t) {
          bout.update(dt);
          bout.apply(dt);
          if (kiss >= 0) {
            const before = kiss;
            kiss += dt;
            blowKiss(api.homama.kid, kiss);
            for (const u of [0.5, 0.8, 1.1]) if (before < u && kiss >= u) heartsBetween((u - 0.4) / 0.8);
          }
        },
      };
    },
  });

  const saluteLines = deck(['A perfect salute. The coach nods, very proud.', 'Foils up, foils down, and a little bow.', 'Homama bows a little lower than he needs to. Roji giggles.']);
  R.hot({
    x: PISTE.x + 2.1,
    z: zb + 1.3,
    r: 1.3,
    label: 'Salute',
    icon: 'star',
    act: (a) => {
      endShow();
      const fresh = ensureSuit();
      masks('hand');
      const [FR, FH] = fencersOfKids();
      const bout = new Bout(FR, FH, { x: PISTE.x, z: zb, y: PISTE.y, guard: GUARD });
      bout.push(
        { d: fresh ? 0.6 : 0.3, go: () => toast('Salute your partner first. Always.', 1600) },
        ...bout.salute(1.5),
        {
          d: 1.7,
          go: () => {
            FR.free = FH.free = true;
            a.emote('roji', 'bow');
            a.emote('homama', 'bow');
            ck.emote('nod');
            toast(saluteLines(), 2200);
          },
        },
        { d: 0.2, go: () => a.endActivity() },
      );
      a.activity({
        label: 'Done',
        seats: pisteSeats(),
        focus: { x: PISTE.x, z: zb, y: 0.9, zoom: 0.5 },
        exit: { x: PISTE.x + 1.5, z: zb + 1.25 },
        onEnd: () => {
          FR.reset();
          FH.reset();
          if (show?.id === 'salute') show = null;
        },
      });
      show = { id: 'salute', update: (dt) => (bout.update(dt), bout.apply(dt)) };
    },
  });

  // ---------------------------------------------------------------- the coach's footwork lesson
  const lessonEnd = deck(['Lovely footwork, Roji and Homama!', 'Light feet! The coach gives you both a gold star.', 'Bravo! That is how champions move.']);
  R.hot({
    x: CH.x - 0.7,
    z: CH.z + 1.25,
    r: 1.3,
    label: 'Footwork lesson',
    icon: 'music',
    act: (a) => {
      endShow();
      ensureSuit();
      masks('hand');
      const lanes = { roji: MAT.z - 0.72, homama: MAT.z + 0.72 };
      const x0 = MAT.x - 1.7;
      const lx = { roji: x0 + 0.55, homama: x0 };
      const FR = new Fencer(api.roji.kid, suit.gear.roji, 1, { actor: api.roji, origin: api.space.origin });
      const FH = new Fencer(api.homama.kid, suit.gear.homama, 1, { actor: api.homama, origin: api.space.origin });
      const F = { roji: FR, homama: FH };
      coachTo({ x: MAT.x + 2.75, z: MAT.z, yaw: -P / 2 });
      const partner = a.partnerId;
      const sets = [0.78, 0.64, 0.52];
      const cmds = ['Advance', 'Advance', 'Retreat', 'Advance', 'Lunge', 'Recover', 'Retreat', 'Retreat'];
      const oops = 1 + Math.floor(Math.random() * 3); // the beat in the second set where the partner goes the wrong way
      const steps = [{ d: 1.2, go: () => (FR.to('idle', 7), FH.to('idle', 7), toast('Coach: En garde, both of you. Follow my claps!', 2000)) }];
      sets.forEach((beat, si) => {
        if (si) steps.push({ d: 1.1, go: () => toast(si === 1 ? 'Faster now!' : 'Once more, the fastest!', 1000) });
        cmds.forEach((cmd, ci) => {
          steps.push({
            d: beat,
            go: () => {
              coachState.clap = 0;
              tone(a.sound, ci === 4 ? 1320 : 990, 0.06, { type: 'square', gain: 0.03 });
              toast(cmd, Math.max(450, beat * 900));
              for (const id of IDS) {
                const f = F[id];
                const wrong = si === 1 && ci === oops && id === partner;
                if (cmd === 'Advance') f.stepBy(wrong ? -0.3 : 0.3, beat * 0.6);
                else if (cmd === 'Retreat') f.stepBy(-0.3, beat * 0.6);
                else if (cmd === 'Lunge') f.to('lunge', 16);
                else f.to('idle', 9);
              }
              if (si === 1 && ci === oops) setTimeout(() => toast(`Oops, ${NAME[partner]} steps the wrong way. The coach laughs.`, 1600), 300);
            },
          });
        });
        steps.push({ d: 0.4, go: () => IDS.forEach((id) => (F[id].offT = 0)) });
      });
      steps.push(
        { d: 0.6, go: () => (FR.to('stand', 6), FH.to('stand', 6)) },
        { d: 2.2, go: () => ((FR.free = FH.free = true), a.emote('roji', 'cheer'), a.emote('homama', 'cheer'), ck.emote('cheer'), a.sound.ui('win'), toast(lessonEnd(), 2400)) },
        { d: 0.2, go: () => a.endActivity() },
      );
      let i = -1;
      let tt = 0;
      a.activity({
        label: 'Stop',
        seats: IDS.map((id) => ({ who: id, x: lx[id], z: lanes[id], y: 0.03, yaw: P / 2, pose: 'stand' })),
        focus: { x: MAT.x + 0.4, z: MAT.z, y: 0.9, zoom: 0.55 },
        exit: { x: MAT.x - 0.4, z: MAT.z - 1.7 },
        onEnd: () => {
          FR.reset();
          FH.reset();
          coachTo(CH);
          if (show?.id === 'lesson') show = null;
        },
      });
      show = {
        id: 'lesson',
        update(dt) {
          tt -= dt;
          while (tt <= 0 && i < steps.length - 1) {
            i++;
            tt += steps[i].d;
            steps[i].go();
          }
          FR.apply(dt, lx.roji, 0.03, lanes.roji);
          FH.apply(dt, lx.homama, 0.03, lanes.homama);
        },
      };
    },
  });

  // ---------------------------------------------------------------- a team photo by the trophy wall
  const photoCount = () => api.load('photos', 0);
  const drawPhoto = (slot, n, whites) => {
    const c = R.photos.canvas.getContext('2d');
    const ox = slot * 256;
    c.save();
    c.translate(ox, 0);
    const g = c.createLinearGradient(0, 0, 0, 192);
    g.addColorStop(0, '#a87650');
    g.addColorStop(1, '#7a5236');
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 192);
    c.fillStyle = '#f4c24f';
    c.fillRect(118, 70, 20, 40);
    c.beginPath();
    c.arc(128, 66, 22, 0, P);
    c.fill();
    c.fillStyle = COL.navy;
    c.fillRect(112, 110, 32, 60);
    const kidAt = (x, top, hair, girl) => {
      c.fillStyle = top;
      roundRect(c, x - 22, 100, 44, 60, 16);
      c.fill();
      c.fillStyle = '#f8dccb';
      c.beginPath();
      c.arc(x, 84, 22, 0, P * 2);
      c.fill();
      c.fillStyle = hair;
      c.beginPath();
      c.arc(x, 78, 23, P, P * 2);
      c.fill();
      if (girl) for (const s of [-1, 1]) {
        c.beginPath();
        c.arc(x + s * 25, 90, 8, 0, P * 2);
        c.fill();
      }
      c.fillStyle = '#3b2b3f';
      for (const s of [-1, 1]) c.fillRect(x + s * 8 - 2, 84, 4, 5);
    };
    kidAt(72, whites ? '#ffffff' : '#ef5b6f', '#2a1a13', true);
    kidAt(184, whites ? '#ffffff' : '#3f7bf0', '#141010', false);
    if (whites) {
      c.fillStyle = COL.pink;
      heartPath(c, 80, 118, 12);
      c.fill();
      c.fillStyle = COL.blue;
      heartPath(c, 192, 118, 12);
      c.fill();
    }
    // the coach, tall at the side, with his moustache
    c.fillStyle = '#ffffff';
    roundRect(c, 214, 70, 34, 90, 12);
    c.fill();
    c.fillStyle = '#e3b08e';
    c.beginPath();
    c.arc(231, 56, 16, 0, P * 2);
    c.fill();
    c.fillStyle = '#6b5a50';
    roundRect(c, 222, 60, 18, 5, 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.font = `600 15px ${FONT}`;
    c.textAlign = 'left';
    c.fillText(`Photo ${n}`, 10, 22);
    c.fillStyle = COL.pink;
    heartPath(c, 236, 20, 16);
    c.fill();
    c.restore();
    R.photos.tex.needsUpdate = true;
  };
  const refreshPhotos = () => {
    const n = photoCount();
    const saved = api.load('photoLooks', []);
    R.photos.frames.forEach((f, i) => (f.visible = i < n));
    for (let i = 0; i < Math.min(3, n); i++) drawPhoto(i, n > 3 ? n - Math.min(3, n) + i + 1 : i + 1, saved[i] ?? false);
  };
  refreshPhotos();
  R.hot({
    x: TROPHY.cx,
    z: -6.2,
    r: 1.3,
    label: 'Take a team photo',
    icon: 'heart',
    act: (a) => {
      endShow();
      const z = -6.75;
      const seats = [
        { who: 'roji', x: TROPHY.cx - 0.68, z, yaw: 0.12, pose: 'stand' },
        { who: 'homama', x: TROPHY.cx + 0.68, z, yaw: -0.12, pose: 'stand' },
      ];
      coachTo({ x: TROPHY.cx + 1.55, z: -6.95, yaw: -0.35 });
      const cupCopy = R.bigCup.clone();
      cupCopy.scale.setScalar(0.55);
      cupCopy.position.set(0, -0.05, 0.02);
      let t = 0;
      let snapped = false;
      a.activity({
        label: 'Done',
        seats,
        focus: { x: TROPHY.cx, z: -6.5, y: 1.25, zoom: 0.46 },
        exit: { x: TROPHY.cx - 0.6, z: -5.8 },
        onEnd: () => {
          a.carry('roji', null);
          suit.gear.roji?.setMask('hand');
          R.bigCup.visible = true;
          R.flash.material.opacity = 0;
          coachTo(CH);
          if (show?.id === 'photo') show = null;
        },
      });
      suit.gear.roji?.setMask('none');
      a.carry('roji', cupCopy);
      R.bigCup.visible = false;
      toast('Roji holds up the Best partner cup. Say cheese!', 1500);
      const count = ['3', '2', '1'];
      show = {
        id: 'photo',
        update(dt) {
          const before = t;
          t += dt;
          count.forEach((c, i) => {
            const at = 1.4 + i * 0.6;
            if (before < at && t >= at) {
              toast(c, 500);
              tone(a.sound, 660, 0.08, { gain: 0.04 });
            }
          });
          if (!snapped && t >= 3.2) {
            snapped = true;
            R.flash.material.opacity = 1;
            tone(a.sound, 2200, 0.05, { type: 'square', gain: 0.03 });
            tone(a.sound, 1400, 0.08, { type: 'square', gain: 0.025 }, 0.05);
            a.emote('homama', 'heart');
            const n = photoCount() + 1;
            a.save('photos', n);
            const looks = api.load('photoLooks', []);
            looks.push(suit.on);
            a.save('photoLooks', looks.slice(-3));
            refreshPhotos();
            setTimeout(() => toast(n === 1 ? 'Click! The first photo goes up on the Hall of Fame.' : `Click! Photo ${n} goes up on the Hall of Fame.`, 2600), 400);
          }
          R.flash.material.opacity = Math.max(0, R.flash.material.opacity - dt * 2.5);
          if (t > 5.6) a.endActivity();
        },
      };
    },
  });

  // ---------------------------------------------------------------- watch a bout from the stand
  const watchLines = deck([
    'Ooh, what a lunge!',
    'Roji whispers: I would have parried that one.',
    'Homama whispers: you are faster than both of them.',
    'The whole stand cheers!',
    'Clink! Lina and Sami salute each other.',
  ]);
  R.hot({
    x: 3.6,
    z: STAND.front + 0.5,
    r: 1.3,
    label: 'Sit in the stand',
    icon: 'smile',
    act: (a) => {
      endShow();
      const h = STAND.tiers[1];
      const z = STAND.front - STAND.depth - 0.15;
      let cheers = 0;
      let wave = 0;
      a.activity({
        label: 'Get up',
        seats: [
          { who: 'roji', x: 3.22, z, y: h - 0.25, yaw: 0, pose: 'sit' },
          { who: 'homama', x: 3.98, z, y: h - 0.25, yaw: 0, pose: 'sit' },
        ],
        focus: { x: 3.6, z: -5.2, y: 0.9, zoom: 0.56 },
        exit: { x: 3.2, z: STAND.front + 0.6 },
        onEnd: () => {
          R.onWatchTouch = null;
          if (show?.id === 'stand') show = null;
        },
      });
      toast('Lina and Sami are bouting. Who will win?', 2200);
      R.onWatchTouch = () => {
        cheers++;
        wave = 0.9;
        for (const id of IDS) api[id].kid.hands = 'wave2';
        if (cheers % 2 === 1) toast(watchLines(), 2000);
        if (cheers % 3 === 0) setTimeout(() => IDS.forEach((id) => api.fx.heartsAt(api[id].kid.head.localToWorld(new THREE.Vector3(0, 0.6, 0)), 2)), 500);
      };
      show = {
        id: 'stand',
        update(dt) {
          if (wave > 0) {
            wave -= dt;
            if (wave <= 0) for (const id of IDS) api[id].kid.hands = null;
          }
        },
      };
    },
  });

  // ---------------------------------------------------------------- the Fencing Duel on piste C
  R.hot({
    x: PISTE.x,
    z: PISTE.z.c + 1.35,
    r: 1.3,
    label: 'Fencing Duel',
    icon: 'game',
    act: async (a) => {
      if (!a.hasArena('fencing')) return toast('The duel piste is being polished. Come back soon.');
      endShow();
      await a.playArena('fencing');
    },
  });
  R.boards.c.set(['Roji', 'Homama'], [SIDE.roji, SIDE.homama], [0, 0]);

  // ---------------------------------------------------------------- the bell at reception
  const bellLines = deck([
    'Welcome back! Your lockers are ready.',
    'Homama booked a lesson for two. Again.',
    'The coach says Roji has the quickest lunge in the club.',
    'No running on the pistes, please. Unless you are lunging.',
    'Have you seen your photo on the Hall of Fame?',
  ]);
  let waveT = -1;
  R.hot({
    x: DESK.x + 0.85,
    z: DESK.z + 0.85,
    r: 1.1,
    label: 'Ring the bell',
    icon: 'note',
    act: (a) => {
      ding(1320);
      waveT = 0;
      setTimeout(() => toast(bellLines(), 2600), 350);
    },
  });
  R.upd((dt, t) => {
    const arm = R.receptionist.arms[1];
    if (waveT >= 0) {
      waveT += dt;
      const k = Math.min(1, waveT * 5, (1.4 - waveT) * 5);
      arm.rotation.set(0, 0, -0.18 - k * (2.3 + Math.sin(waveT * 14) * 0.3));
      if (waveT > 1.4) waveT = -1;
    } else arm.rotation.set(0, 0, -0.18 + Math.sin(t * 0.8) * 0.02);
  });

  // ---------------------------------------------------------------- coming and going
  R.onEnter((a) => {
    coachTo(CH);
    refreshPhotos();
    if (!a.load('visited', false)) {
      a.save('visited', true);
      setTimeout(() => toast('Welcome to the Roji & Homama Fencing Club! The lockers are in the changing room.', 3200), 600);
    }
  });
  R.onExit(() => {
    endShow();
    dress(false);
    R.lockers.open(0);
  });
}
