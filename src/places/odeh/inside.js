// Inside the family home: Odeh reads the paper in the majlis and pours Arabic coffee, Hanan cooks
// in the kitchen (maqluba flipped with a cheer, or grape leaves rolled tight), the whole family
// eats at the low table while Hanan keeps filling Homama's plate, Sultan bounces, hides badly and
// rides on Homama's shoulders, Basem knocks with a box of kunafa, and the album comes out.
import { THREE, P, at, sph, cyl, box, rbox, caps, mat, mesh, Talk, SOUNDS, pick, clamp, bakePart } from './kit.js';
import { makePerson, Walker, actorSpeaker, SCALE } from './family.js';
import { ROOMS, DOORS, roomOf, route, into, ZB, ZH, ZF, ZE, XA, XB, XC, X0, X1 } from './plan.js';
import { L, fill } from './lines.js';
import { PHOTOS, photoDataUrl, drawSchoolDrawing } from './photos.js';
import { stepWalker, faceTo, RADIUS } from '../../engine/movement.js';

const ODEH_SEAT = { x: -11.95, z: ZF + 0.62, y: 0.18, yaw: 0.25, pose: 'sit', hands: 'read' };
const BASEM_SEAT = { x: X0 + 0.62, z: 3.3, y: 0.18, yaw: P / 2, pose: 'sit' };
const HANAN_STOVE = { x: 8.35, z: -6.95, yaw: 0 };
const ENTRY = { x: -0.5, z: 7.6 };
const DOOR_IN = { x: -0.45, z: 9.5 };
const HIDES = [
  { x: -12.85, z: -5.0, room: 'play', where: 'in the little tent' },
  { x: -0.5, z: -7.95, room: 'court', where: 'behind the fountain' },
  { x: 12.2, z: -9.25, room: 'kitchen', where: 'by the fridge' },
  { x: -12.85, z: 8.6, room: 'majlis', where: 'behind the cushions' },
];

export function setupInside(ictx, F, R) {
  const api = ictx.api;
  const g = R.g;
  const talk = new Talk(g);
  const people = {};
  for (const [id, r, speed] of [['odeh', 0.34, 1.5], ['hanan', 0.32, 1.9], ['basem', 0.34, 2.1], ['sultan', 0.24, 2.4]]) {
    const w = new Walker(api, makePerson(ictx.makeKid, id), id, { r, speed });
    w.levelAt = () => 0;
    g.add(w.kid.root);
    R.dynamic.push(w.kid.root);
    people[id] = w;
  }
  const { odeh, hanan, basem, sultan } = people;
  const spk = { roji: actorSpeaker(api, 'roji'), homama: actorSpeaker(api, 'homama') };
  const me = () => api.playerId;
  const who = (id) => people[id] || spk[id === 'player' ? api.playerId : id === 'partner' ? api.partnerId : id];
  const say = (id, keyOrText, ms = 2800) => {
    const w = who(id);
    if (!w) return '';
    const text = L[keyOrText] ? F.line(keyOrText, me()) : fill(keyOrText, me());
    const isRoji = id === 'roji' || (id === 'player' && me() === 'roji') || (id === 'partner' && me() === 'homama');
    talk.say(w, text, ms, w.accent || (isRoji ? '#ef5b6f' : '#3f7bf0'));
    return text;
  };
  const lp = (a) => api.localPos(a);
  const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  // Walk a person to a spot in any room, through the openings (and round the kitchen island)
  const behindIsland = (p) => p.x > 6.9 && p.z < -6.45 && p.z > ZB && p.x < X1;
  const goTo = (w, p, opts) => {
    const pts = [];
    const from = { x: w.pos.x, z: w.pos.z };
    if (behindIsland(from) && !behindIsland(p)) pts.push({ x: 6.7, z: -6.95 });
    pts.push(...(route(roomOf(from.x, from.z), roomOf(p.x, p.z)) || []));
    if (behindIsland(p) && !behindIsland(from)) pts.push({ x: 6.7, z: -6.95 });
    pts.push(p);
    return w.go(pts, opts);
  };

  const newspaper = R.newspaper;
  const seatOdeh = () => {
    odeh.sit(ODEH_SEAT);
    odeh.kid.arms[0].add(at(newspaper, 0.06, -0.32, 0.12, -0.4, 0, 0));
  };
  const homeAll = () => {
    seatOdeh();
    hanan.place(HANAN_STOVE.x, HANAN_STOVE.z, HANAN_STOVE.yaw);
    hanan.kid.hands = 'stir';
    sultan.place(-9.0, -6.0, 0.6);
    basem.place(BASEM_SEAT.x + 0.6, BASEM_SEAT.z, P / 2);
    if (F.visit?.basemIn) {
      basem.setHidden(false);
      basem.sit(BASEM_SEAT);
    } else basem.setHidden(true);
  };
  homeAll();
  const brain = { sultan: 'wander', sultanT: 3, odehT: 70, hananT: 50, said: 0, ball: new THREE.Vector3(), game: null };
  const ballV = new THREE.Vector3();

  // ---------------------------------------------------------------- staging
  async function stage(name, spec, body) {
    let ended = false;
    const cleanups = [];
    let live = () => false;
    // Start the activity first: it ends any other one (and its scene) before this scene begins
    const act = api.activity({
      endOnMove: true,
      ...spec,
      onEnd: () => {
        ended = true;
        F.cancel();
        talk.clear();
        for (const c of cleanups.splice(0)) c();
      },
    });
    live = F.begin(name, { force: true });
    const ctl = {
      live: () => live() && !ended,
      wait: async (s) => {
        await F.wait(s);
        return live() && !ended;
      },
      cleanup: (f) => cleanups.push(f),
    };
    try {
      await body(ctl);
    } catch (e) {
      console.error('odeh: scene failed', e);
    } finally {
      // End it only if it is still this scene's activity (another one may have taken over)
      if (!ended && api.game?.activities?.current === act) api.endActivity();
      live.done();
    }
  }
  const seat = (whoId, s) => ({ who: whoId, ...s });

  // ---------------------------------------------------------------- Hanan runs to the door
  async function welcome() {
    const live = F.begin('welcome');
    if (!live) return;
    F.visit.hugged = true;
    const roji = api.roji;
    hanan.kid.hands = null;
    say('hanan', 'hananHug', 2600);
    const rp = lp(roji);
    const hp0 = lp(api.homama);
    // Hanan comes to Roji's other side, so the hug is seen side-on
    const side = rp.x >= hp0.x ? 1 : -1;
    const target = { x: rp.x + side * 0.64, z: rp.z };
    await Promise.race([goTo(hanan, target, { run: true, speed: 2.3 }), F.wait(7)]);
    if (!live()) return live.done();
    if (dist(hanan.pos, target) > 0.4) hanan.place(target.x, target.z, -side * P / 2);
    const homAt = lp(api.homama);
    const rojiAt = lp(roji);
    let ended = false;
    const act = api.activity({
      label: 'Ahlan!',
      seats: [
        { who: 'roji', x: rojiAt.x, z: rojiAt.z, y: 0, yaw: yawTo(rojiAt, hanan.pos), pose: 'stand' },
        { who: 'homama', x: homAt.x, z: homAt.z, y: 0, yaw: yawTo(homAt, hanan.pos), pose: 'stand' },
      ],
      focus: { x: rojiAt.x + side * 0.2, z: rojiAt.z, y: 1.1, zoom: 0.5 },
      onEnd: () => (ended = true),
    });
    hanan.face({ x: rojiAt.x, z: rojiAt.z });
    await F.wait(0.3);
    hanan.emote('hug');
    roji.kid.emote('hug');
    api.fx.heartsAt(api.world(rojiAt.x + side * 0.32, rojiAt.z, 1.5), 6);
    // Sultan comes running too
    if (!sultan.hidden) goTo(sultan, { x: homAt.x + 0.8, z: homAt.z - 0.5 }, { run: true });
    await F.wait(1.8);
    if (live() && !ended) say('hanan', 'hananBless', 2800);
    await F.wait(2.6);
    if (live() && !ended) {
      // Round the front of Roji to Homama's cheeks
      await hanan.go([{ x: rojiAt.x + side * 0.4, z: rojiAt.z + 0.75 }, { x: homAt.x - side * 0.7, z: homAt.z + 0.62 }, { x: homAt.x - side * 0.64, z: homAt.z }]);
      hanan.face({ x: homAt.x, z: homAt.z });
      say('hanan', 'hananPinch', 2400);
      await F.wait(1.0);
      if (!ended) {
        api.homama.kid.emote('nod');
        say('homama', 'homamaPinched', 2000);
      }
      await F.wait(1.8);
    }
    if (!ended && api.game?.activities?.current === act) api.endActivity();
    if (live()) {
      if (F.visit.basem === 'away') say('hanan', 'basemAway', 3200);
      else say('hanan', 'hananComeIn', 2400);
      await F.wait(1);
      backToStove();
    } else backToStove(true);
    live.done();
  }
  // Back to their usual seats in the majlis, on foot
  function walkHome(w) {
    const S = w === odeh ? ODEH_SEAT : BASEM_SEAT;
    const near = w === odeh ? { x: S.x + 0.4, z: S.z + 0.8 } : { x: S.x + 0.7, z: S.z };
    goTo(w, near).then((ok) => {
      if (!ok || w.seat) return;
      if (w === odeh) seatOdeh();
      else w.sit(BASEM_SEAT);
    });
  }
  function backToStove(snap = false) {
    if (snap) {
      hanan.place(HANAN_STOVE.x, HANAN_STOVE.z, HANAN_STOVE.yaw);
      hanan.kid.hands = 'stir';
      return;
    }
    goTo(hanan, HANAN_STOVE).then((ok) => {
      if (!ok) return;
      hanan.face(HANAN_STOVE.yaw);
      hanan.kid.hands = 'stir';
    });
  }

  // ---------------------------------------------------------------- Basem knocks
  async function basemKnocks() {
    const live = F.begin('basem');
    if (!live) return;
    SOUNDS.knock(api.sound);
    basem.place(DOOR_IN.x, DOOR_IN.z, P);
    basem.setHidden(false);
    basem.kid.carry(sweetsBox());
    say('basem', 'basemKnock', 2400);
    await F.wait(0.8);
    say('hanan', 'Basem! Ahlan, ya habibi!', 2400);
    // Sultan runs to the door
    if (!sultan.hidden && !brain.game) goTo(sultan, { x: ENTRY.x + 0.9, z: ENTRY.z - 0.4 }, { run: true });
    await basem.go([{ x: ENTRY.x, z: ENTRY.z - 0.3 }]);
    if (!live()) return finish();
    say('basem', 'basemArrive', 2800);
    basem.emote('wave');
    api.fx.burst(api.world(ENTRY.x, ENTRY.z, 1.8), ['#ffd166', '#ffffff', '#ff8fb1'], 14);
    await F.wait(2.2);
    if (!live()) return finish();
    // He leaves the kunafa on the majlis chest and sits with Odeh
    await goTo(basem, { x: -6.0, z: 1.4 });
    basem.kid.carry(null);
    R.kunafa.visible = true;
    await goTo(basem, { x: BASEM_SEAT.x + 0.7, z: BASEM_SEAT.z });
    if (live()) basem.sit(BASEM_SEAT);
    finish();
    function finish() {
      F.visit.basemIn = true;
      basem.kid.carry(null);
      R.kunafa.visible = true;
      if (!basem.seat) basem.sit(BASEM_SEAT);
      live.done();
    }
  }
  const sweetsBox = () => {
    const b = new THREE.Group();
    b.add(at(rbox(0.36, 0.1, 0.28, '#ffffff', 0.02), 0, 0, 0));
    b.add(at(box(0.37, 0.02, 0.29, '#e7b54a'), 0, 0.05, 0));
    b.add(at(box(0.04, 0.11, 0.29, '#ef5b6f'), 0, 0.005, 0));
    bakePart(b);
    return b;
  };

  // ---------------------------------------------------------------- coffee with Odeh
  async function coffee() {
    const pid = me();
    const cups = [cup(), cup()];
    await stage(
      'coffee',
      {
        label: 'Get up',
        seats: [seat('roji', { x: -10.55, z: ZF + 0.62, y: 0.18, yaw: 0, pose: 'sit', hands: 'hold' }), seat('homama', { x: -9.65, z: ZF + 0.62, y: 0.18, yaw: -0.1, pose: 'sit', hands: 'hold' })],
        focus: { x: -10.6, z: 1.6, y: 0.7, zoom: 0.48 },
      },
      async (c) => {
        api.roji.kid.arms[1].add(at(cups[0], 0, -0.33, 0.06));
        api.homama.kid.arms[1].add(at(cups[1], 0, -0.33, 0.06));
        c.cleanup(() => {
          cups.forEach((q) => q.removeFromParent());
          putDallahBack();
          seatOdeh();
        });
        newspaper.removeFromParent();
        odeh.sit({ ...ODEH_SEAT, hands: null, yaw: 0.35 });
        say('odeh', pid === 'roji' ? 'My Roji! Sit, sit. Coffee?' : 'Homama! Sit. You will have coffee.', 2600);
        if (!(await c.wait(2.2))) return;
        let poured = 0;
        for (;;) {
          await pour(c, poured);
          if (!c.live()) return;
          poured++;
          say('odeh', poured === 1 ? 'odehPour' : 'odehMore', 2600);
          if (!(await c.wait(1.4))) return;
          const choice = await api.choose({
            title: 'Arabic coffee',
            text: poured >= 3 ? 'Cup number ' + poured + '. Odeh is very pleased.' : 'Odeh fills your little cup with cardamom coffee.',
            options: [
              { id: 'shake', label: 'Shake the cup', sub: 'That means: enough, thank you' },
              { id: 'more', label: 'One more, please', sub: 'It is delicious' },
            ],
          });
          if (!c.live()) return;
          if (choice !== 'more' || poured >= 4) {
            if (poured >= 4 && choice === 'more') say('odeh', 'Four cups! You will not sleep until Friday!', 3000);
            else {
              const k = api.player.kid;
              let t = 0;
              post.push((dt) => {
                t += dt;
                k.arms[1].rotation.z += Math.sin(t * 30) * 0.25;
                return t < 0.7;
              });
              say('odeh', 'odehEnough', 2600);
            }
            break;
          }
        }
        if (!(await c.wait(2.6))) return;
        // Dates from the palms outside
        say('odeh', 'dates', 2800);
        api.emote('roji', 'heart');
        if (!(await c.wait(3.0))) return;
        say('odeh', pid === 'homama' || Math.random() < 0.5 ? 'odehTease' : 'odehStories', 4200);
        if (!(await c.wait(4.4))) return;
        say('partner', pid === 'roji' ? 'Your father is the funniest man I know.' : 'Baba, tell him about the goat!', 2800);
        if (!(await c.wait(3))) return;
        say('odeh', 'odehStories', 4200);
        await c.wait(4.6);
      },
    );
  }
  const cup = () => {
    const q = new THREE.Group();
    q.add(at(cyl(0.04, 0.03, 0.05, '#fffaf4', 10), 0, 0, 0));
    q.add(at(cyl(0.035, 0.035, 0.01, '#8a5a2a', 10), 0, 0.02, 0));
    bakePart(q);
    return q;
  };
  const stream = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 5), mat('#8a5a2a', { rough: 0.3 }), { cast: false });
  stream.visible = false;
  g.add(stream);
  R.dynamic.push(stream);
  async function pour(c, n) {
    // Odeh lifts the dallah from the tray and pours into the cup of whoever is closer
    const D = R.dallah;
    const target = n % 2 === 0 ? (me() === 'roji' ? api.roji : api.homama) : me() === 'roji' ? api.homama : api.roji;
    odeh.kid.hands = 'hold';
    odeh.kid.arms[1].add(D);
    D.position.set(0, -0.32, 0.1);
    D.rotation.set(0, P / 2, 0);
    SOUNDS.pour(api.sound);
    const t0 = F.clock;
    while (F.clock - t0 < 1.4 && c.live()) {
      const k = (F.clock - t0) / 1.4;
      D.rotation.z = -Math.sin(k * P) * 0.9;
      stream.visible = k > 0.25 && k < 0.8;
      const tp = lp(target);
      stream.position.set(tp.x, target.y + 0.82, tp.z + 0.2);
      await F.wait(0.016);
    }
    stream.visible = false;
    putDallahBack();
    odeh.kid.hands = null;
  }
  function putDallahBack() {
    const D = R.dallah;
    g.add(D);
    D.position.copy(R.dallahHome);
    D.rotation.set(0, 0, 0);
    stream.visible = false;
  }
  const post = []; // small per-frame pose tweaks applied after the kids are animated

  // ---------------------------------------------------------------- cooking with Hanan
  async function cook() {
    const pid = me();
    const dish = await api.choose({
      title: 'Cook with Hanan',
      text: '"What shall we make, habibti?"',
      options: [
        { id: 'maqluba', label: 'Maqluba', sub: 'Rice, aubergine, and the big flip' },
        { id: 'leaves', label: 'Stuffed grape leaves', sub: 'Roll them tight' },
      ],
    });
    if (!dish) return;
    await stage(
      'cook',
      {
        label: 'Stop cooking',
        seats: [seat('player', { x: 7.95, z: -6.95, y: 0, yaw: 0, pose: 'stand', hands: 'stir' }), seat('partner', { x: 6.8, z: -6.95, y: 0, yaw: 0.25, pose: 'stand' })],
        focus: { x: 8.4, z: -6.2, y: 1.1, zoom: 0.5 },
      },
      async (c) => {
        await Promise.race([goTo(hanan, { x: 9.25, z: -6.95 }), F.wait(5)]);
        if (!c.live()) return;
        hanan.place(9.25, -6.95, -0.35);
        hanan.kid.hands = null;
        c.cleanup(() => backToStove(true));
        say('hanan', 'hananCook', 2600);
        if (!(await c.wait(2.6))) return;
        if (dish === 'maqluba') {
          SOUNDS.sizzle(api.sound);
          say('hanan', 'hananStir', 2400);
          if (!(await c.wait(3))) return;
          api.player.kid.hands = null;
          say('hanan', 'flip', 2400);
          if (!(await c.wait(1.2))) return;
          await flipPot(c);
          if (!c.live()) return;
          F.visit.maqluba = true;
          SOUNDS.clap(api.sound);
          api.fx.burst(api.world(R.island.x - 0.55, R.island.z - 0.1, 1.4), ['#ffd166', '#ffffff', '#ff8fb1', '#7fd3a7'], 30);
          hanan.emote('cheer');
          api.emote('player', 'cheer');
          api.emote('partner', 'cheer');
          say('hanan', 'flipCheer', 2600);
          if (!sultan.hidden && !brain.game) goTo(sultan, { x: 7.4, z: -4.9 }, { run: true }).then(() => sultan.emote('cheer'));
          await c.wait(3);
          say('partner', pid === 'roji' ? 'I married into the best family.' : 'Mama, teach me everything.', 2600);
          await c.wait(2.8);
        } else {
          api.player.kid.hands = 'stir';
          api.partner.kid.hands = 'stir';
          let n = 0;
          for (let i = 0; i < 12 && c.live(); i++) {
            if (!(await c.wait(1.1))) break;
            addLeaf(n++, i === 5 && pid === 'homama');
            if (i % 3 === 0) say(i === 6 ? 'hanan' : i % 2 ? 'partner' : 'hanan', i === 6 ? 'That one is fat. That is for Homama.' : i % 2 ? (pid === 'roji' ? 'Yours are perfect, habibti.' : 'Look, mine looks like a cigar!') : 'leaves', 2400);
          }
          if (!c.live()) return;
          F.visit.leaves = true;
          hanan.emote('cheer');
          say('hanan', 'Yalla, into the pot! Dinner will be magic.', 2800);
          await c.wait(3);
        }
      },
    );
  }
  async function flipPot(c) {
    const { pivot } = R.pot;
    const M = R.maqluba;
    const base = pivot.position.clone();
    const t0 = F.clock;
    // Up, over, down
    while (F.clock - t0 < 1.5 && c.live()) {
      const k = (F.clock - t0) / 1.5;
      pivot.position.y = base.y + Math.sin(Math.min(1, k * 1.4) * P) * 0.35 + (k > 0.7 ? 0 : 0);
      pivot.rotation.z = Math.min(1, k * 1.3) * P;
      if (k > 0.72) pivot.position.y = base.y + 0.36;
      await F.wait(0.016);
    }
    pivot.rotation.z = P;
    pivot.position.y = base.y + 0.36;
    api.sound.ui?.('pop');
    await F.wait(0.5);
    // Lift the pot off: there it is
    M.position.set(base.x, base.y, base.z);
    M.visible = true;
    const t1 = F.clock;
    while (F.clock - t1 < 0.7) {
      const k = (F.clock - t1) / 0.7;
      pivot.position.y = base.y + 0.36 + k * 0.5;
      pivot.position.x = base.x + k * 0.6;
      await F.wait(0.016);
    }
    pivot.rotation.z = 0;
    pivot.position.set(base.x + 0.9, base.y, base.z);
    R.potMoved = { base };
  }
  const leafGeo = new THREE.CapsuleGeometry(0.022, 0.07, 2, 6);
  const leafMat = mat('#6b8f3a', { rough: 0.7 });
  function addLeaf(n, fat) {
    const m = mesh(leafGeo, leafMat, { cast: false });
    m.rotation.z = P / 2;
    m.position.set(-0.22 + (n % 5) * 0.1, 0.04, -0.15 + Math.floor(n / 5) * 0.09);
    if (fat) m.scale.set(1.8, 1.2, 1.8);
    R.leaves.add(m);
  }

  // ---------------------------------------------------------------- the family meal
  async function meal() {
    const pid = me();
    const S = R.diningSeats;
    const list = [odeh, hanan, sultan, ...(F.visit?.basemIn ? [basem] : [])];
    const pile = new THREE.Group();
    const dishOn = R.maqlubaOnTable;
    await stage(
      'meal',
      {
        label: 'Get up',
        seats: [seat('roji', { ...S.roji, y: 0.14, pose: 'sit', hands: 'hold' }), seat('homama', { ...S.homama, y: 0.14, pose: 'sit', hands: 'hold' })],
        focus: { x: 8.0, z: 4.6, y: 0.8, zoom: 0.58 },
      },
      async (c) => {
        c.cleanup(() => {
          pile.removeFromParent();
          for (const w of list) w.stand();
          walkHome(odeh);
          backToStove();
          if (F.visit?.basemIn) walkHome(basem);
          F.wait(6).then(() => (dishOn.visible = false));
          brain.sultan = 'wander';
        });
        // The main dish: the maqluba if you made it, else Hanan's mansaf
        dishOn.visible = true;
        dishOn.userData.kind = F.visit?.maqluba ? 'maqluba' : 'mansaf';
        R.setDish(dishOn.userData.kind);
        newspaper.removeFromParent();
        brain.sultan = 'meal';
        for (const w of list) {
          if (w.seat) w.stand();
          goTo(w, { x: S[w.id].x + Math.sin(S[w.id].yaw) * -0.6, z: S[w.id].z + Math.cos(S[w.id].yaw) * -0.6 }, { speed: 2.4 });
        }
        say('hanan', 'Yalla, everyone to the table!', 2400);
        const t0 = F.clock;
        while (c.live() && list.some((w) => w.moving) && F.clock - t0 < 9) await F.wait(0.1);
        if (!c.live()) return;
        for (const w of list) w.sit({ ...S[w.id], y: 0.14, pose: 'sit', hands: w === sultan ? 'wave2' : 'hold' });
        say('odeh', 'odehMeal', 2600);
        if (!(await c.wait(2.6))) return;
        sultan.kid.hands = 'hold';
        // Homama's plate, and Hanan who keeps filling it
        const H = api.homama;
        const plateAt = lp(H);
        pile.position.set(plateAt.x, 0.47, plateAt.z + 0.72);
        pile.add(at(cyl(0.2, 0.16, 0.03, '#ffffff', 16), 0, -0.01, 0));
        g.add(pile);
        const lines = ['hananFeed', 'hananFeed', 'hananFeed', 'hananFeed', 'hananFeed'];
        for (let i = 0; i < lines.length && c.live(); i++) {
          say('hanan', lines[i], 2400);
          await spoon(pile, i, c);
          if (!c.live()) return;
          if (!(await c.wait(0.6))) return;
          say('homama', i === lines.length - 1 ? 'This is my fourth plate!' : 'homamaFull', 2200);
          if (i === 1) say('roji', 'rojiMeal', 2400);
          if (i === 2) say('odeh', 'Hanan, let the boy breathe!', 2400);
          if (!(await c.wait(2.0))) return;
        }
        if (F.visit?.basemIn) {
          say('basem', 'Now, the kunafa I brought!', 2600);
          R.kunafa.visible = false;
          R.kunafaTable.visible = true;
          c.cleanup(() => (R.kunafaTable.visible = false));
          api.fx.burst(api.world(8.0, 4.7, 1.0), ['#ffb347', '#ffd166', '#ffffff'], 18);
          if (!(await c.wait(2.6))) return;
        }
        say('hanan', 'Sahtein, my darlings.', 2600);
        api.fx.heartsAt(api.world(8.0, 4.7, 1.3), 6);
        F.visit.meals++;
        await c.wait(3);
      },
    );
  }
  const riceGeo = new THREE.SphereGeometry(0.1, 10, 6);
  const riceMat = mat('#f2d28a');
  async function spoon(pile, i, c) {
    const S = R.diningSeats;
    const from = new THREE.Vector3(R.table.x, R.table.y + 0.15, R.table.z);
    const to = pile.position.clone().add(new THREE.Vector3(0, 0.05 + i * 0.05, 0));
    const blob = mesh(riceGeo, riceMat, { cast: false });
    g.add(blob);
    const t0 = F.clock;
    while (F.clock - t0 < 0.6 && c.live()) {
      const k = (F.clock - t0) / 0.6;
      blob.position.lerpVectors(from, to, k);
      blob.position.y += Math.sin(k * P) * 0.5;
      await F.wait(0.016);
    }
    blob.removeFromParent();
    const add_ = mesh(riceGeo, riceMat, { cast: false });
    add_.position.set((Math.random() - 0.5) * 0.08, 0.04 + i * 0.075, (Math.random() - 0.5) * 0.08);
    add_.scale.set(1.3 - i * 0.12, 0.8, 1.3 - i * 0.12);
    pile.add(add_);
    api.sound.ui?.('pop');
  }

  // ---------------------------------------------------------------- arm-wrestling Basem
  async function armWrestle() {
    if (!F.visit?.basemIn) return;
    const pid = me();
    const how = await api.choose({
      title: 'Arm-wrestle Basem',
      text: '"Right hands. Ready?"',
      options: [
        { id: 'win', label: 'Give it everything', sub: 'For glory' },
        { id: 'easy', label: 'Let him win', sub: 'He is family' },
      ],
    });
    if (!how) return;
    const A = { x: 10.95, z: 7.3 };
    const B = { x: 11.6, z: 7.3 };
    await stage(
      'arm',
      {
        label: 'Stop',
        seats: [seat('player', { x: A.x, z: A.z, y: 0, yaw: P / 2, pose: 'stand' }), seat('partner', { x: 10.25, z: 6.55, y: 0, yaw: 1.5, pose: 'stand' })],
        focus: { x: (A.x + B.x) / 2, z: A.z, y: 1.0, zoom: 0.45 },
      },
      async (c) => {
        c.cleanup(() => {
          post.length = 0;
          walkHome(basem);
        });
        basem.stand();
        await Promise.race([goTo(basem, { x: B.x + 0.3, z: B.z - 0.3 }), F.wait(8)]);
        if (!c.live()) return;
        basem.place(B.x, B.z, -P / 2);
        basem.face(-P / 2);
        say('basem', 'Standing up, like champions. No cheating!', 2600);
        if (!(await c.wait(2.2))) return;
        // Right hands clasped between them, pushing back and forth
        let t = 0;
        let lean = 0;
        let want = 0;
        const K = api.player.kid;
        const BK = basem.kid;
        post.push((dt) => {
          t += dt;
          lean += (want - lean) * (1 - Math.exp(-3 * dt));
          const wob = Math.sin(t * 9) * 0.04;
          K.arms[1].rotation.set(-1.35 - lean * 0.35 + wob, 0, 0.6);
          BK.arms[1].rotation.set(-1.3 + lean * 0.35 - wob, 0, 0.62);
          K.body.rotation.x = 0.12 + lean * 0.12;
          BK.body.rotation.x = 0.1 - lean * 0.12;
          K.squash = 1 + Math.abs(Math.sin(t * 6)) * 0.02;
          return true;
        });
        say('partner', pid === 'roji' ? 'Yalla, Roji! Show him!' : 'Come on, Homama!', 2200);
        api.emote('partner', 'cheer');
        for (const [w, d] of [[-0.5, 1.3], [0.4, 1.2], [-0.25, 1.0], [0.2, 0.8]]) {
          want = w;
          if (!(await c.wait(d))) return;
        }
        const win = how === 'win' ? Math.random() < 0.65 : false;
        want = win ? 1 : -1;
        if (!(await c.wait(0.9))) return;
        if (win) {
          SOUNDS.boing(api.sound);
          say('basem', pid === 'roji' ? 'My little sister beat me!' : 'basemLose', 2800);
          api.emote('partner', 'cheer');
          api.sound.ui?.('win');
          basem.kid.squash = 0.8;
        } else {
          say('basem', how === 'easy' ? 'Ha! I win! Wait... did you let me win?' : 'basemWin', 3000);
          if (how === 'easy') F.wait(2.6).then(() => c.live() && say('odeh', pid === 'roji' ? 'That is my kind daughter.' : 'I saw that, Homama. Good man.', 2600));
        }
        const wins = api.load('armWins', 0) + (win ? 1 : 0);
        api.save('armWins', wins);
        await c.wait(3);
        if (wins) api.toast(`Arm-wrestling wins against Basem: <b>${wins}</b>`, 2400);
      },
    );
    post.length = 0;
  }

  // ---------------------------------------------------------------- Sultan
  async function playWithSultan() {
    if (brain.game) return;
    const pid = me();
    const choice = await api.choose({
      title: 'Play with Sultan',
      text: '"Play! Play! Play!"',
      options: [
        { id: 'chase', label: 'Chase', sub: 'Catch him if you can' },
        { id: 'ball', label: 'Ball', sub: 'Pass it back and forth' },
        { id: 'ride', label: 'Piggyback', sub: 'On Homama\'s shoulders' },
        { id: 'hide', label: 'Hide and seek', sub: 'He hides, you look' },
      ],
    });
    if (!choice) return;
    say('sultan', 'sultan', 1800);
    SOUNDS.giggle(api.sound);
    if (choice === 'chase') startGame('chase', 24);
    if (choice === 'ball') startGame('ball', 28);
    if (choice === 'ride') startGame('ride', 26);
    if (choice === 'hide') startGame('hide', 75);
  }
  function startGame(kind, sec) {
    sultan.cancel();
    sultan.script = null;
    brain.game = { kind, t: 0, sec, score: 0, cool: 0, round: 0, spot: null };
    brain.sultan = 'game';
    if (kind === 'ride') {
      say('sultan', 'sultanRide', 2000);
      api.toast(api.playerId === 'homama' ? 'Sultan is on your shoulders! Walk around with him.' : 'Sultan climbs onto Homama\'s shoulders!', 2600);
    }
    if (kind === 'chase') api.toast('Catch Sultan! He is fast.', 2000);
    if (kind === 'ball') {
      api.toast('Kick the ball to Sultan! Walk into it to pass.', 2400);
      const b = R.ball.position;
      const P0 = lp(api.player);
      b.set(P0.x + 0.8, 0.16, P0.z - 0.4);
      ballV.set(0, 0, 0);
    }
    if (kind === 'hide') nextHide();
  }
  function nextHide() {
    const gm = brain.game;
    const prev = gm.spot;
    const opts = HIDES.filter((h) => h !== prev);
    gm.spot = opts[Math.floor(Math.random() * opts.length)];
    gm.found = false;
    gm.hidden = false;
    say('sultan', 'Close your eyes! Count to ten!', 2400);
    goTo(sultan, gm.spot, { run: true }).then((ok) => {
      if (brain.game !== gm) return;
      if (!ok) sultan.place(gm.spot.x, gm.spot.z, 0);
      gm.hidden = true;
      api.toast(`Sultan is hiding. Find him! <small>(Round ${gm.round + 1} of 3)</small>`, 2200);
    });
  }
  function endGame(msg) {
    const gm = brain.game;
    if (!gm) return;
    brain.game = null;
    brain.sultan = 'wander';
    sultan.script = null;
    sultan.kid.squash = 1;
    if (gm.kind === 'ride') {
      sultan.setHidden(false);
      const H = lp(api.homama);
      sultan.place(H.x + 0.6, H.z + 0.3, 0);
      api.fx.puff(api.world(H.x + 0.6, H.z + 0.3));
    }
    if (game.partnerBusy === 'odeh-sultan') game.partnerBusy = null;
    if (msg) api.toast(msg, 2600);
  }
  const game = api.game;

  function updateGame(dt, t) {
    const gm = brain.game;
    if (!gm) return;
    gm.t += dt;
    gm.cool = Math.max(0, gm.cool - dt);
    const P0 = lp(api.player);
    const sp = sultan.pos;
    if (api.activityRunning && gm.kind !== 'ride') return endGame();
    if (gm.kind === 'chase') {
      const d = dist(P0, sp);
      if (d < 0.85 && gm.cool <= 0) {
        gm.score++;
        gm.cool = 1.6;
        SOUNDS.giggle(api.sound);
        sultan.emote('cheer');
        say('sultan', gm.score === 1 ? 'You got me!' : pick('sultanCaught', ['Again!', 'Hehehe!', 'No fair!', 'Catch me again!']), 1600);
        api.fx.heartsAt(api.world(sp.x, sp.z, 1.0), 3);
      }
      // Run away from the player, inside the house
      if (!sultan.moving || Math.random() < dt * 1.2) {
        const away = Math.atan2(sp.x - P0.x, sp.z - P0.z) + (Math.random() - 0.5) * 1.6;
        const room = roomOf(sp.x, sp.z);
        let tgt = into(room, sp.x + Math.sin(away) * 3, sp.z + Math.cos(away) * 3, 0.8);
        if (dist(tgt, P0) < 1.6) {
          const rooms = ['play', 'hallway', 'court'].filter((r) => r !== room);
          const r2 = rooms[Math.floor(Math.random() * rooms.length)];
          const [x0, x1, z0, z1] = ROOMS[r2];
          tgt = into(r2, (x0 + x1) / 2 + (Math.random() - 0.5) * 3, (z0 + z1) / 2 + (Math.random() - 0.5) * 2, 0.8);
        }
        goTo(sultan, tgt, { speed: 3.0 });
      }
      if (Math.random() < dt * 1.5) sultan.hop(3.4);
      if (gm.t > gm.sec) {
        const best = Math.max(api.load('chase', 0), gm.score);
        api.save('chase', best);
        endGame(`You caught Sultan <b>${gm.score}</b> times${gm.score >= best && gm.score ? ', a new best!' : ` (best ${best})`}`);
        say('sultan', 'Again! Again!', 2200);
      }
    } else if (gm.kind === 'ball') {
      updateBall(dt, gm, P0);
      if (gm.t > gm.sec) {
        const best = Math.max(api.load('passes', 0), gm.score);
        api.save('passes', best);
        endGame(`<b>${gm.score}</b> passes with Sultan${gm.score >= best && gm.score ? ', a new best!' : ` (best ${best})`}`);
      }
    } else if (gm.kind === 'ride') {
      // Sultan on Homama's shoulders, wherever he goes
      const H = api.homama;
      const hk = H.kid;
      sultan.script = (dt2, tt, w) => {
        const hp = hk.head.getWorldPosition(new THREE.Vector3());
        const O = api.space.origin;
        w.pos.set(hp.x - O.x, 0, hp.z - O.z);
        w.y = hp.y + 0.12;
        w.yaw = H.yaw;
        w.kid.pose = 'ride';
        w.kid.hands = Math.sin(tt * 2) > 0.3 ? 'wave2' : null;
        w.y = hp.y + 0.27;
        w.kid.root.position.set(w.pos.x - Math.sin(H.yaw) * 0.1, w.y, w.pos.z - Math.cos(H.yaw) * 0.1);
        w.kid.root.rotation.set(0, H.yaw, 0);
        return true;
      };
      if (sultan.collider) {
        api.game.physics.remove(sultan.collider);
        sultan.collider = null;
      }
      hk.hands = H.seated ? hk.hands : 'wave2';
      if (Math.random() < dt * 0.25) say('sultan', 'sultanRide', 1800);
      if (gm.t > gm.sec || api.activityRunning) {
        hk.hands = null;
        sultan.kid.pose = 'stand';
        endGame('Sultan hops down. "Again tomorrow!"');
      }
    } else if (gm.kind === 'hide') {
      if (gm.hidden && !gm.found) {
        // Hiding badly: crouched, wiggling, giggling now and then
        sultan.kid.squash = 0.72 + Math.sin(t * 6) * 0.03;
        if (Math.random() < dt * 0.35) {
          SOUNDS.giggle(api.sound);
          if (Math.random() < 0.5) say('sultan', 'sultanHide', 1600);
        }
        if (dist(P0, gm.spot) < 1.4) {
          gm.found = true;
          gm.round++;
          gm.score++;
          sultan.kid.squash = 1.25;
          sultan.hop(4.2);
          sultan.emote('cheer');
          say('sultan', 'sultanFound', 2000);
          api.sound.ui?.('good');
          api.fx.burst(api.world(sp.x, sp.z, 1.0), ['#ffd166', '#ff8fb1', '#7fd3ff'], 18);
          F.wait(2.4).then(() => {
            if (brain.game !== gm) return;
            if (gm.round >= 3) endGame(`You found Sultan 3 times! He was ${gm.spot.where}.`);
            else nextHide();
          });
        }
      }
      if (gm.t > gm.sec) endGame('Sultan comes out by himself. "I win!"');
    }
  }

  // The ball rolls, bounces off walls and furniture; kids and Sultan kick it
  const ballPos = new THREE.Vector3();
  function updateBall(dt, gm, P0) {
    const b = R.ball.position;
    const O = api.space.origin;
    const ph = api.game.physics;
    for (const a of [api.player, api.partner]) {
      const k = lp(a);
      const dx = b.x - k.x;
      const dz = b.z - k.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.5 && d > 1e-3) {
        const sp = Math.hypot(a.vel.x, a.vel.z);
        b.x = k.x + (dx / d) * 0.52;
        b.z = k.z + (dz / d) * 0.52;
        if (sp < 0.4) {
          ballV.multiplyScalar(0.2);
          continue;
        }
        const push = sp * 1.4;
        // Aim a little toward Sultan when it is the player
        const sx = sultan.pos.x - b.x;
        const sz = sultan.pos.z - b.z;
        const sd = Math.hypot(sx, sz) || 1;
        ballV.set((dx / d) * 0.5 + (sx / sd) * 0.5, 0, (dz / d) * 0.5 + (sz / sd) * 0.5).normalize().multiplyScalar(push + 2);
        b.x = k.x + (dx / d) * 0.52;
        b.z = k.z + (dz / d) * 0.52;
        if (a === api.player && gm.cool <= 0) {
          gm.passTo = 'sultan';
          api.sound.kick?.();
        }
      }
    }
    // Sultan runs to the ball and kicks it back; when it is at your feet he waits for a pass
    const atFeet = dist(b, P0) < 1.1;
    if (!atFeet && (!sultan.moving || Math.random() < dt * 2)) {
      if (Math.hypot(ballV.x, ballV.z) < 2.5) goTo(sultan, { x: b.x + (b.x - P0.x) * 0.12, z: b.z + (b.z - P0.z) * 0.12 }, { speed: 2.8 });
    }
    if (atFeet && !sultan.moving && Math.random() < dt * 0.4) {
      say('sultan', pick('kick', ['Kick it!', 'To me! To me!', 'Ball! Ball!']), 1400);
      sultan.hop(3.4);
    }
    if (!atFeet && dist(sultan.pos, b) < 0.5 && gm.cool <= 0) {
      const dx = P0.x - b.x;
      const dz = P0.z - b.z;
      const d = Math.hypot(dx, dz) || 1;
      ballV.set((dx / d) * 3.6, 0, (dz / d) * 3.6);
      gm.cool = 0.8;
      if (gm.passTo === 'sultan') {
        gm.score++;
        gm.passTo = null;
        SOUNDS.giggle(api.sound);
        if (gm.score % 3 === 0) say('sultan', 'Ball! Ball!', 1400);
      }
      sultan.hop(3);
      api.sound.kick?.();
    }
    ballV.multiplyScalar(Math.exp(-1.2 * dt));
    b.x += ballV.x * dt;
    b.z += ballV.z * dt;
    ballPos.set(O.x + b.x, 0, O.z + b.z);
    ph.resolve(ballPos, 0.16, ballV, { bounce: 0.6, feet: 0, skip: (c) => c === sultan.collider, bounds: false });
    b.x = ballPos.x - O.x;
    b.z = ballPos.z - O.z;
    b.y = 0.16;
    const bs = Math.hypot(ballV.x, ballV.z);
    if (bs > 0.01) R.ball.rotateOnWorldAxis(new THREE.Vector3(ballV.z / bs, 0, -ballV.x / bs), (bs * dt) / 0.16);
  }

  // Sultan on his own: hops about, runs in circles, chases the ball, bounces on the sofa
  function sultanBrain(dt, t) {
    if (brain.sultan !== 'wander' && brain.sultan !== 'sofa' && brain.sultan !== 'circle') return;
    brain.sultanT -= dt;
    if (brain.sultan === 'wander') {
      if (sultan.moving && Math.random() < dt * 1.4) sultan.hop(3.2);
      if (!sultan.moving && brain.sultanT <= 0) {
        const r = Math.random();
        brain.sultanT = 3 + Math.random() * 5;
        if (r < 0.22) {
          brain.sultan = 'sofa';
          bounceOnSofa();
        } else if (r < 0.38) {
          brain.sultan = 'circle';
          circle(sultan.pos.x, sultan.pos.z, 3.5);
        } else {
          const rooms = ['play', 'play', 'hallway', 'court', 'play'];
          const rm = rooms[Math.floor(Math.random() * rooms.length)];
          const [x0, x1, z0, z1] = ROOMS[rm];
          const p = into(rm, x0 + Math.random() * (x1 - x0), z0 + Math.random() * (z1 - z0), 0.9);
          goTo(sultan, p, { speed: 2.4 });
          if (Math.random() < 0.4) F.wait(1).then(() => brain.sultan === 'wander' && Math.random() < 0.5 && say('sultan', 'sultan', 1500));
        }
      }
    }
  }
  function circle(cx, cz, sec) {
    let tt = 0;
    let a = 0;
    const room = roomOf(cx, cz);
    const c = into(room, cx, cz, 1.4);
    sultan.script = (dt, t2, w) => {
      tt += dt;
      if (tt > sec || brain.sultan !== 'circle') {
        w.script = null;
        brain.sultan = 'wander';
        return false;
      }
      a += dt * 3.2;
      const nx = c.x + Math.sin(a) * 0.9;
      const nz = c.z + Math.cos(a) * 0.9;
      // Stop if the circle would go through something
      const ph = api.game.physics;
      const O = api.space.origin;
      const test = new THREE.Vector3(O.x + nx, 0, O.z + nz);
      ph.resolve(test, 0.24, new THREE.Vector3(), { feet: 0, skip: (q) => q === w.collider, bounds: false });
      w.pos.set(test.x - O.x, 0, test.z - O.z);
      w.yaw = a + P / 2;
      w.y = Math.abs(Math.sin(tt * 8)) * 0.1;
      w.kid.root.position.set(w.pos.x, w.y, w.pos.z);
      w.kid.root.rotation.set(0, w.yaw, 0);
      w.scriptSpeed = 3;
      if (Math.random() < dt * 0.6) SOUNDS.giggle(api.sound);
      return true;
    };
  }
  async function bounceOnSofa() {
    const S = R.sofa;
    const spot = { x: S.x + (Math.random() - 0.5) * 1.4, z: S.z + 0.9 };
    const ok = await goTo(sultan, spot, { speed: 2.4 });
    if (!ok || brain.sultan !== 'sofa') return;
    let tt = 0;
    const from = { x: sultan.pos.x, z: sultan.pos.z };
    const on = { x: spot.x, z: S.z };
    say('sultan', 'Wheee!', 1600);
    sultan.script = (dt, t2, w) => {
      tt += dt;
      const up = Math.min(1, tt / 0.4);
      const down = clamp((tt - 5.0) / 0.4, 0, 1);
      const k = up * (1 - down);
      w.pos.set(from.x + (on.x - from.x) * k, 0, from.z + (on.z - from.z) * k);
      const bounce = tt > 0.4 && tt < 5 ? Math.abs(Math.sin((tt - 0.4) * 5.2)) * 0.32 : 0;
      w.y = S.y * k + Math.sin(up * P) * 0.25 * (1 - down) + Math.sin(down * P) * 0.25 + bounce;
      if (bounce < 0.02 && tt > 0.5 && tt < 5) w.kid.squash = 0.82;
      w.yaw = 0;
      w.kid.root.position.set(w.pos.x, w.y, w.pos.z);
      w.kid.root.rotation.set(0, 0, 0);
      w.scriptSpeed = 0;
      if (Math.random() < dt * 0.6) SOUNDS.boing(api.sound);
      if (tt > 5.4 || brain.sultan !== 'sofa') {
        w.script = null;
        w.y = 0;
        if (brain.sultan === 'sofa') brain.sultan = 'wander';
        return false;
      }
      return true;
    };
  }

  // ---------------------------------------------------------------- the sofa, the album, the photos, the eggs
  async function sofa() {
    const S = R.sofa;
    await stage(
      'sofa',
      {
        label: 'Get up',
        seats: [seat('roji', { x: S.x - 0.75, z: S.z + 0.05, y: S.y, yaw: 0, pose: 'sit' }), seat('homama', { x: S.x + 0.35, z: S.z + 0.05, y: S.y, yaw: 0, pose: 'sit' })],
        focus: { x: S.x, z: S.z + 1.0, y: 1.25, zoom: 0.6 },
      },
      async (c) => {
        if (brain.game) endGame();
        brain.sultan = 'sofa-kids';
        sultan.script = null;
        c.cleanup(() => {
          sultan.script = null;
          sultan.kid.pose = 'stand';
          sultan.place(S.x + 1.0, S.z + 1.1, 0);
          brain.sultan = 'wander';
        });
        await Promise.race([goTo(sultan, { x: S.x + 1.0, z: S.z + 1.0 }, { run: true }), F.wait(6)]);
        if (!c.live()) return;
        say('sultan', 'Me too! Me too!', 1800);
        // Up onto the sofa, a few bounces, then onto Homama's shoulders
        let tt = 0;
        const H = api.homama;
        sultan.script = (dt, t2, w) => {
          tt += dt;
          if (tt < 3.2) {
            const k = Math.min(1, tt / 0.4);
            w.pos.set(S.x + 1.0, 0, S.z + 1.0 - k * 0.95);
            w.y = S.y * k + Math.abs(Math.sin(tt * 5.5)) * 0.3 * (tt > 0.4 ? 1 : 0);
            w.kid.pose = 'stand';
            w.kid.root.position.set(w.pos.x, w.y, w.pos.z);
            w.kid.root.rotation.set(0, -0.4, 0);
          } else {
            const hp = H.kid.head.getWorldPosition(new THREE.Vector3());
            const O = api.space.origin;
            w.kid.pose = 'ride';
            w.kid.hands = Math.sin(t2 * 2) > 0 ? 'wave2' : null;
            w.kid.root.position.set(hp.x - O.x, hp.y + 0.27, hp.z - O.z - 0.1);
            w.kid.root.rotation.set(0, 0, 0);
          }
          return true;
        };
        if (!(await c.wait(3.4))) return;
        say('sultan', 'sultanRide', 2000);
        SOUNDS.giggle(api.sound);
        if (!(await c.wait(1.6))) return;
        say('homama', 'Oof! You are getting heavy, champ!', 2400);
        if (!(await c.wait(2.8))) return;
        say('roji', 'He loves you so much.', 2400);
        api.emote('roji', 'heart');
        await c.wait(30);
      },
    );
  }

  async function album() {
    const pid = me();
    const B = R.bench;
    await stage(
      'album',
      {
        label: 'Close the album',
        seats: [seat('roji', { x: B.x - 0.45, z: B.z, y: B.y, yaw: 0.15, pose: 'sit' }), seat('homama', { x: B.x + 0.4, z: B.z, y: B.y, yaw: -0.2, pose: 'sit' })],
        focus: { x: B.x, z: B.z + 0.9, y: 0.9, zoom: 0.5 },
      },
      async (c) => {
        R.album.visible = false;
        const open = openAlbum();
        api.carry('roji', open);
        c.cleanup(() => {
          if (api.roji.kid.carried === open) api.carry('roji', null);
          R.album.visible = true;
        });
        if (!F.busyHanan) {
          const spot = { x: B.x - 1.2, z: B.z + 0.85 };
          Promise.race([goTo(hanan, spot), F.wait(8)]).then(() => {
            if (!c.live()) return;
            hanan.place(spot.x, spot.z, 0.6);
            hanan.face({ x: B.x, z: B.z });
          });
          c.cleanup(() => backToStove(true));
        }
        say('roji', 'Mama, look! The old album!', 2400);
        if (!(await c.wait(1.4))) return;
        const pages = Object.keys(PHOTOS);
        const order = [pages[0], pages[1], pages[2], pages[3], pages[4], pages[5]];
        for (let i = 0; i < order.length && c.live(); i++) {
          const k = order[i];
          const res = await api.choose({
            title: `The family album, page ${i + 1}`,
            text: `<img src="${photoDataUrl(k, api.looks)}" alt="" style="width:min(260px,62vw);border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,.16)"><br>${PHOTOS[k]}`,
            options: i < order.length - 1 ? [{ id: 'next', label: 'Next page' }, { id: 'close', label: 'Close' }] : [{ id: 'close', label: 'Close the album' }],
          });
          if (!c.live()) return;
          if (k === 'wedding') {
            say('hanan', 'The most beautiful bride. And look at Homama, so nervous!', 3000);
            api.emote('roji', 'heart');
          } else if (k === 'baby') say('hanan', 'You never slept, habibti. Not once!', 2600);
          else if (k === 'graduation') say('hanan', 'Your Baba told the whole street.', 2600);
          else if (k === 'sultan') say('homama', 'Straight into the cake! Classic Sultan.', 2400);
          if (res !== 'next') break;
        }
        await c.wait(2.5);
      },
    );
  }

  function openAlbum() {
    const o = new THREE.Group();
    for (const s2 of [1, -1]) {
      o.add(at(box(0.2, 0.012, 0.26, '#7a2e3a'), s2 * 0.1, 0, 0, 0, 0, -s2 * 0.18));
      o.add(at(box(0.18, 0.014, 0.24, '#fffaf4'), s2 * 0.095, 0.01, 0, 0, 0, -s2 * 0.18));
      o.add(at(box(0.1, 0.016, 0.08, s2 > 0 ? '#ffe4ec' : '#cdeffa'), s2 * 0.1, 0.02, 0.02, 0, 0, -s2 * 0.18));
    }
    bakePart(o);
    o.rotation.x = -0.9;
    o.position.set(0, 0.02, 0.06);
    return o;
  }

  async function photos() {
    const spots = R.photoSpots.filter((p) => ['baby', 'graduation', 'wedding'].includes(p.k));
    await stage(
      'photos',
      {
        label: 'Done',
        seats: [seat('player', { x: -0.5, z: -1.6, y: 0, yaw: P, pose: 'stand' }), seat('partner', { x: 0.4, z: -1.5, y: 0, yaw: P, pose: 'stand' })],
        focus: { x: -0.5, z: -2.2, y: 1.4, zoom: 0.55 },
      },
      async (c) => {
        const lines = {
          baby: me() === 'roji' ? 'Look how tiny I was!' : 'Baby Roji! Look at those cheeks!',
          graduation: me() === 'roji' ? 'Baba cried at my graduation. Twice.' : 'Dr. Roji. I am so proud of you.',
          wedding: 'Our wedding. Best day ever.',
        };
        for (const p of spots) {
          api.focus({ x: p.x, z: p.z + 0.4, y: p.y, zoom: 0.32 });
          say(p.k === 'wedding' ? 'partner' : 'player', lines[p.k], 2800);
          if (!(await c.wait(3.2))) return;
        }
        api.emote('player', 'heart');
        api.emote('partner', 'heart');
        await c.wait(2);
      },
    );
  }

  function readMarks() {
    const pid = me();
    say('roji', pid === 'roji' ? 'Roji 3, Roji 5... I was so small!' : 'Roji, age 3! And Basem cheated, he stood on his toes.', 3200);
    api.emote('player', 'heart');
  }
  async function fridge() {
    const cv = document.createElement('canvas');
    cv.width = 360;
    cv.height = 270;
    drawSchoolDrawing(cv.getContext('2d'), 360, 270);
    await api.choose({ title: "On Hanan's fridge", text: `<img src="${cv.toDataURL()}" alt="" style="width:min(280px,64vw);border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.16)"><br>Roji's drawing from first grade. Hanan never takes it down.`, options: [{ id: 'ok', label: 'So cute' }] });
    say('partner', me() === 'roji' ? 'A doktor! You knew even then.' : 'I spelled it better, I promise.', 2600);
  }
  function canary() {
    R.birdHop = 1.2;
    SOUNDS.giggle(api.sound);
    say('player', pick('canary', ['Hello, little bird!', 'He sings for Hanan every morning.', 'Tweet tweet!']), 2200);
  }

  // ---------------------------------------------------------------- hotspots
  const free = () => !F.busy && !brain.game;
  const hotspots = [
    { x: -9.7, z: 3.3, r: 1.35, label: 'Coffee with Odeh', icon: 'o-cup', when: () => free() && !odeh.hidden, act: () => coffee() },
    { x: 8.6, z: -4.75, r: 1.35, label: 'Cook with Hanan', icon: 'o-pot', when: () => free(), act: () => cook() },
    { x: 8.0, z: 7.0, r: 1.3, label: 'Family meal', icon: 'o-plate', when: () => free(), act: () => meal() },
    { x: 11.2, z: 7.6, r: 0.95, label: 'Arm-wrestle Basem', icon: 'hand', when: () => free() && F.visit?.basemIn && !basem.hidden, act: () => armWrestle() },
    { track: () => ({ x: sultan.pos.x, z: sultan.pos.z }), r: 1.3, label: 'Play with Sultan', icon: 'star', when: () => free() && !sultan.hidden && brain.sultan !== 'sofa-kids', act: () => playWithSultan() },
    { x: R.sofa.x, z: R.sofa.z + 1.35, r: 1.1, label: 'Sit on the sofa', icon: 'smile', when: () => free(), act: () => sofa() },
    { x: R.bench.x, z: R.bench.z + 1.0, r: 1.05, label: 'Look at the album', icon: 'o-album', when: () => free(), act: () => album() },
    { x: -0.4, z: -1.6, r: 0.95, label: 'Look at the photos', icon: 'o-camera', when: () => free(), act: () => photos() },
    { x: R.marks.x, z: R.marks.z + 0.15, r: 0.75, label: 'Read the marks', icon: 'heart', when: () => free(), act: () => readMarks() },
    { x: R.fridge.x - 0.2, z: R.fridge.z, r: 0.9, label: 'Look at the fridge', icon: 'heart', when: () => free(), act: () => fridge() },
    { x: 0.9, z: ZB + 1.25, r: 0.75, label: 'Say hi to the canary', icon: 'smile', when: () => free(), act: () => canary() },
  ];

  // ---------------------------------------------------------------- the partner finds the way through the rooms
  const guide = { on: false, path: [], t: 0, stuck: 0 };
  function guidePartner(dt) {
    const G = api.game;
    if (!G?.physics) return;
    const c = api.partner;
    const p = api.player;
    const busyOther = G.partnerBusy && G.partnerBusy !== 'odeh-guide';
    if (api.activityRunning || c.seated || busyOther) {
      if (guide.on) stopGuide();
      return;
    }
    const cp = lp(c);
    const pp = lp(p);
    const rc = roomOf(cp.x, cp.z);
    const rp = roomOf(pp.x, pp.z);
    if (!guide.on) {
      if (rc === rp || dist(cp, pp) < 1.8) return;
      guide.t += dt;
      if (guide.t < 0.5) return;
      guide.on = true;
      guide.path = route(rc, rp) || [];
      guide.stuck = 0;
      G.partnerBusy = 'odeh-guide';
    }
    if (!guide.path.length) {
      if (roomOf(cp.x, cp.z) === rp || dist(cp, pp) < 1.6) return stopGuide();
      guide.path = route(roomOf(cp.x, cp.z), rp) || [];
      if (!guide.path.length) return stopGuide();
    }
    const wpt = guide.path[0];
    const dx = wpt.x - cp.x;
    const dz = wpt.z - cp.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.3) {
      guide.path.shift();
      return;
    }
    const before = c.pos.clone();
    stepWalker(c, G.physics, dx, dz, 1, d > 3 ? 6.0 : 4.6, 10, dt);
    if (c.speed > 0.25) faceTo(c, dt, Math.atan2(c.vel.x, c.vel.z));
    guide.stuck = before.distanceTo(c.pos) < 0.5 * dt ? guide.stuck + dt : 0;
    if (guide.stuck > 1.5) {
      c.pos.set(api.space.origin.x + wpt.x, 0, api.space.origin.z + wpt.z);
      guide.path.shift();
      guide.stuck = 0;
    }
  }
  function stopGuide() {
    guide.on = false;
    guide.t = 0;
    guide.path = [];
    if (api.game?.partnerBusy === 'odeh-guide') api.game.partnerBusy = null;
  }

  // ---------------------------------------------------------------- every frame
  function update(dt, t) {
    const v = F.visit;
    // Hanan runs to the door the first time Roji comes in
    if (v && !v.hugged && !F.busy && !api.activityRunning && entered > 0.8) welcome();
    entered += dt;
    // Basem knocks during the visit
    if (v && v.basem === 'arrive' && !v.basemIn && v.t > v.basemArriveAt && !F.busy && !api.activityRunning) basemKnocks();
    if (v && v.basemIn && basem.hidden && !F.busy) {
      basem.setHidden(false);
      basem.sit(BASEM_SEAT);
      R.kunafa.visible = true;
    }
    // Little routines while nobody is busy
    if (!F.busy) {
      brain.odehT -= dt;
      if (brain.odehT <= 0 && odeh.seat) {
        brain.odehT = 80 + Math.random() * 40;
        // Odeh goes to taste the food, then comes back
        newspaper.removeFromParent();
        odeh.stand({ x: ODEH_SEAT.x + 0.4, z: ODEH_SEAT.z + 0.8 });
        goTo(odeh, { x: 7.4, z: -5.0 }).then((ok) => {
          if (!ok || F.busy) return;
          odeh.face({ x: hanan.pos.x, z: hanan.pos.z });
          say('odeh', pick('taste', ['Hanan, is it ready? I am starving.', 'Just one taste. For science.', 'Smells like heaven in here.']), 2600);
          F.wait(2.4).then(() => !F.busy && say('hanan', pick('shoo', ['Yalla, out of my kitchen!', 'Ten more minutes, ya Odeh!', 'Not until the guests eat!']), 2400));
          F.wait(5).then(() => !F.busy && goTo(odeh, { x: ODEH_SEAT.x + 0.4, z: ODEH_SEAT.z + 0.8 }).then((ok2) => ok2 && !F.busy && seatOdeh()));
        });
      }
      brain.hananT -= dt;
      if (brain.hananT <= 0 && !hanan.moving && dist(hanan.pos, HANAN_STOVE) < 0.4) {
        brain.hananT = 60 + Math.random() * 40;
        hanan.kid.hands = null;
        goTo(hanan, { x: 9.6, z: 6.9 }).then((ok) => {
          if (!ok || F.busy) return;
          hanan.face({ x: 8.0, z: 4.7 });
          F.wait(3).then(() => !F.busy && backToStove());
        });
      }
    }
    sultanBrain(dt, t);
    updateGame(dt, t);
    for (const w of Object.values(people)) w.update(dt, t);
    // People look at the player when they come close
    const P0 = lp(api.player);
    for (const w of [odeh, hanan, basem]) {
      if (w.hidden || w.moving || F.busy) continue;
      if (dist(w.pos, P0) < 2.6) w.face({ x: P0.x, z: P0.z });
      else if (w === hanan && dist(w.pos, HANAN_STOVE) < 0.4) w.face(HANAN_STOVE.yaw);
    }
    for (let i = post.length - 1; i >= 0; i--) if (!post[i](dt)) post.splice(i, 1);
    guidePartner(dt);
    talk.update(dt);
  }
  let entered = 0;

  function onEnter() {
    entered = 0;
    if (!F.visit) F.startVisit(api);
    if (brain.game) endGame();
    stopGuide();
    homeAll();
    brain.sultan = 'wander';
    sultan.script = null;
    const v = F.visit;
    if (v && v.hugged && !v.said.has('inside-hello')) {
      v.said.add('inside-hello');
      F.wait(1.2).then(() => say('hanan', v.basem === 'away' && !v.basemIn ? 'basemAway' : 'hananComeIn', 2800));
    }
  }
  function onExit() {
    if (brain.game) endGame();
    stopGuide();
    talk.clear();
    post.length = 0;
  }

  return { people, hotspots, update, onEnter, onExit, brain, debug: { welcome, basemKnocks, coffee, cook, meal, armWrestle, playWithSultan, startGame, sofa, album, photos } };
}
