// Life on Odeh's hill: Odeh pottering in his garden and sitting by the fire, Hanan running out to
// hug Roji, Basem walking up with a box of sweets and playing penalties with Homama, the family photo
// in the courtyard, the camel, the goat, the well, the benches, and everyone waving goodbye at night.
import { THREE, P, at, sph, cyl, box, rbox, tor, mat, mesh, Talk, SOUNDS, pick, clamp, easeOutCubic, canvasTexture, FONT, bakePart } from './kit.js';
import { makePerson, Walker, actorSpeaker } from './family.js';
import { TOP, TENT_Y, GARDEN_Y, HALF_Y, PLATEAU, SPOT, UP, DOWN, DOOR, GARDEN_TO_FIRE, FIRE_TO_GARDEN, levelAt } from './layout.js';
import { L, fill } from './lines.js';
import { wateringCan } from './hill.js';
import { drawFamilyPhoto, flash } from './photos.js';

const GARDEN_SPOT = { x: 7.7, z: 3.15, yaw: P / 2 };
const FIRE_SEAT = { x: -10.35, z: 9.55, y: TENT_Y + 0.12 };
const FIRE_KIDS = [
  { x: -9.65, z: 8.55, y: TENT_Y + 0.12, yaw: 0.2 },
  { x: -8.5, z: 8.55, y: TENT_Y + 0.12, yaw: -0.2 },
];
const TO_FIRE = [...GARDEN_TO_FIRE, { x: FIRE_SEAT.x, z: FIRE_SEAT.z + 0.1 }];
const TO_GARDEN = [...FIRE_TO_GARDEN, { x: GARDEN_SPOT.x, z: GARDEN_SPOT.z }];
const DOOR_OUT = { x: DOOR.x, z: DOOR.z + 0.45 };

export function setupOutside(ctx, F, H) {
  const api = ctx.api;
  const g = H.g;
  const talk = new Talk(g);
  const people = {};
  for (const [id, r, speed] of [['odeh', 0.34, 1.5], ['hanan', 0.32, 1.8], ['basem', 0.34, 2.1], ['sultan', 0.24, 2.6]]) {
    const w = new Walker(api, makePerson(ctx.makeKid, id), id, { r, speed });
    w.levelAt = levelAt;
    g.add(w.kid.root);
    H.dynamic.push(w.kid.root);
    people[id] = w;
  }
  const { odeh, hanan, basem, sultan } = people;
  const spk = { roji: actorSpeaker(api, 'roji'), homama: actorSpeaker(api, 'homama') };
  const me = () => api.playerId;
  const who = (id) => people[id] || spk[id === 'player' ? api.playerId : id === 'partner' ? api.partnerId : id];
  const say = (id, keyOrText, ms = 2800) => {
    const w = who(id);
    const text = L[keyOrText] ? F.line(keyOrText, me()) : fill(keyOrText, me());
    talk.say(w, text, ms, w.accent || (id === 'roji' || (id === 'player' && me() === 'roji') ? '#ef5b6f' : '#3f7bf0'));
    return text;
  };
  const kidPos = (a) => api.localPos(a);
  const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
  const onPlateau = (a) => a.y > TOP - 0.15;

  // Starting places
  odeh.place(GARDEN_SPOT.x, GARDEN_SPOT.z, GARDEN_SPOT.yaw);
  for (const w of [hanan, basem, sultan]) {
    w.place(DOOR_OUT.x, DOOR_OUT.z, 0);
    w.setHidden(true);
  }
  const brain = { odeh: 'garden', odehT: 40 + Math.random() * 30, basemOut: false, juggle: 0 };
  // A new visit: everyone back in their usual places
  F.onVisit(() => {
    for (const w of [hanan, basem, sultan]) {
      w.script = null;
      w.kid.carry(null);
      w.place(DOOR_OUT.x, DOOR_OUT.z, 0);
      w.setHidden(true);
    }
    odeh.script = null;
    odeh.place(GARDEN_SPOT.x, GARDEN_SPOT.z, GARDEN_SPOT.yaw);
    odeh.setHidden(false);
    brain.odeh = 'garden';
    brain.basemOut = false;
    farewell = null;
    talk?.clear();
  });

  // A watering can for the player, a tea glass for each, Basem's box of kunafa, a leftovers plate
  const can = wateringCan();
  const teaGlass = () => {
    const t = new THREE.Group();
    t.add(at(cyl(0.035, 0.028, 0.08, '#ffffff', 10), 0, 0, 0));
    t.add(at(cyl(0.031, 0.026, 0.05, '#b8572c', 10), 0, -0.01, 0));
    bakePart(t);
    return t;
  };
  const sweets = () => {
    const b = new THREE.Group();
    b.add(at(rbox(0.36, 0.1, 0.28, '#ffffff', 0.02), 0, 0, 0));
    b.add(at(box(0.37, 0.02, 0.29, '#e7b54a'), 0, 0.05, 0));
    b.add(at(box(0.04, 0.11, 0.29, '#ef5b6f'), 0, 0.005, 0));
    bakePart(b);
    return b;
  };
  const plate = () => {
    const p = new THREE.Group();
    p.add(at(cyl(0.16, 0.13, 0.04, '#ffffff', 16), 0, 0, 0));
    p.add(at(sph(0.13, '#d9d9e0', 12, 6), 0, 0.03, 0));
    p.children[1].scale.y = 0.35;
    bakePart(p);
    return p;
  };

  // ---------------------------------------------------------------- staging helpers
  // An activity with both kids seated; body(ctl) plays the scene, the player can leave any time
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
        for (const c of cleanups) c();
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

  const here = (a) => ({ who: a === api.player ? 'player' : 'partner', x: kidPos(a).x, z: kidPos(a).z, y: a.y, yaw: a.yaw, pose: 'stand' });

  // Show a hidden person at the door (they come out of the house)
  const fromDoor = (w, dx = 0) => {
    w.place(DOOR_OUT.x + dx, DOOR_OUT.z, 0);
    w.setHidden(false);
    api.sound.ui?.('tick');
  };
  const backInside = async (w, live) => {
    const ok = await w.go([{ x: DOOR_OUT.x, z: DOOR_OUT.z }]);
    if (ok && (!live || live())) w.setHidden(true);
    else if (ok) w.setHidden(true);
  };

  // ---------------------------------------------------------------- Hanan runs out to hug Roji
  async function arrival() {
    const live = F.begin('arrival');
    if (!live) return;
    F.visit.hugged = true;
    const roji = api.roji;
    const homama = api.homama;
    fromDoor(hanan);
    hanan.runSpeed = 3.2;
    say('hanan', 'hananHug', 2600);
    const rp = kidPos(roji);
    const hp0 = kidPos(homama);
    const side = rp.x >= hp0.x ? 1 : -1;
    const meet = { x: rp.x + side * 0.64, z: rp.z };
    // Sultan zooms out after her
    F.wait(0.7).then(() => live() && fromDoor(sultan, 0.4));
    const arrived = await Promise.race([hanan.go([meet], { run: true }), F.wait(4).then(() => false)]);
    if (!live()) return live.done();
    // Stand both kids still for the hug (the player can walk off any time)
    const rojiAt = kidPos(roji);
    const homAt = kidPos(homama);
    let ended = false;
    const act = api.activity({
      label: 'Ahlan!',
      seats: [
        { who: 'roji', x: rojiAt.x, z: rojiAt.z, y: roji.y, yaw: yawTo(rojiAt, hanan.pos), pose: 'stand' },
        { who: 'homama', x: homAt.x, z: homAt.z, y: homama.y, yaw: yawTo(homAt, hanan.pos), pose: 'stand' },
      ],
      focus: { x: (rojiAt.x + hanan.pos.x) / 2, z: (rojiAt.z + hanan.pos.z) / 2, y: TOP + 1.0, zoom: 0.52 },
      onEnd: () => (ended = true),
    });
    hanan.face({ x: rojiAt.x, z: rojiAt.z });
    await F.wait(0.3);
    hanan.emote('hug');
    roji.kid.emote('hug');
    api.fx.heartsAt(api.world((rojiAt.x + hanan.pos.x) / 2, (rojiAt.z + hanan.pos.z) / 2, TOP + 1.4), 6);
    await F.wait(1.6);
    if (live() && !ended) say('hanan', 'hananBless', 2800);
    // Sultan runs a happy circle round Homama
    if (live()) runCircle(sultan, { x: clamp(homAt.x, PLATEAU.x0 + 1.3, PLATEAU.x1 - 1.3), z: clamp(homAt.z, -5.6, PLATEAU.z1 - 1.25) }, 0.95, 2.4);
    await F.wait(2.4);
    if (live() && !ended) {
      await hanan.go([{ x: rojiAt.x + side * 0.4, z: rojiAt.z + 0.75 }, { x: homAt.x - side * 0.7, z: homAt.z + 0.62 }, { x: homAt.x - side * 0.64, z: homAt.z }]);
      hanan.face({ x: homAt.x, z: homAt.z });
      say('hanan', 'hananPinch', 2400);
      hanan.emote('wave');
      await F.wait(1.0);
      if (!ended) {
        homama.kid.emote('nod');
        say('homama', 'homamaPinched', 2000);
      }
      await F.wait(1.6);
    }
    if (!ended && api.game?.activities?.current === act) api.endActivity();
    if (live()) {
      say('hanan', 'hananComeIn', 2400);
      await F.wait(0.6);
      backInside(hanan);
      sultan.script = null;
      backInside(sultan);
    } else {
      hanan.setHidden(true);
      sultan.script = null;
      sultan.setHidden(true);
    }
    live.done();
  }

  // Sultan runs round a point a few times, giggling
  function runCircle(w, c, r, sec) {
    let t = 0;
    let a = Math.atan2(w.pos.x - c.x, w.pos.z - c.z);
    w.script = (dt, tt, ww) => {
      t += dt;
      if (t > sec) {
        ww.script = null;
        return false;
      }
      a += dt * 3.4;
      ww.pos.set(c.x + Math.sin(a) * r, 0, c.z + Math.cos(a) * r);
      ww.yaw = a + P / 2;
      const hopY = Math.abs(Math.sin(t * 9)) * 0.12;
      ww.y = (ww.ground ?? ww.y) + hopY;
      ww.kid.root.position.set(ww.pos.x, ww.y, ww.pos.z);
      ww.kid.root.rotation.set(0, ww.yaw, 0);
      ww.scriptSpeed = 3;
      if (Math.random() < dt * 0.8) SOUNDS.giggle(api.sound);
      return true;
    };
    w.ground = w.y;
  }

  // ---------------------------------------------------------------- Basem walks up from the street
  async function basemArrives() {
    const live = F.begin('basem');
    if (!live) return;
    basem.place(-1.6, 18.6, P);
    basem.setHidden(false);
    basem.kid.carry(sweets());
    const ok = await basem.go(UP.slice(0, 2));
    if (!live() || !ok) return finish();
    say('basem', 'basemKnock', 2600);
    basem.emote('wave');
    await F.wait(1.4);
    if (!live()) return finish();
    await basem.go(UP.slice(2));
    if (!live()) return finish();
    F.visit.basemIn = true;
    basem.kid.carry(null);
    basem.setHidden(true);
    api.sound.ui?.('tick');
    await F.wait(6);
    if (live() && !F.isNight) {
      fromDoor(basem);
      await basem.go(DOWN.slice(1, 9).concat([{ x: SPOT.goal.x - 1.2, z: SPOT.goal.z + 1.6 }]));
      brain.basemOut = true;
      say('basem', 'basemFootball', 3000);
    }
    finish();
    function finish() {
      if (!F.visit.basemIn) {
        basem.kid.carry(null);
        basem.setHidden(true);
        F.visit.basemIn = true;
      }
      live.done();
    }
  }

  // ---------------------------------------------------------------- goodbye at the door
  let farewell = null;
  function goodbye() {
    const night = F.isNight;
    const list = night ? [odeh, hanan, sultan, ...(F.visit?.basemIn ? [basem] : [])] : [hanan];
    const xs = night ? [-2.7, -1.45, 1.55, 2.8] : [-1.5];
    F.cancel();
    list.forEach((w, i) => {
      w.place(xs[i], DOOR_OUT.z + (i % 2) * 0.25, 0);
      w.setHidden(false);
    });
    farewell = { list, t: 0, night, said: 0 };
    say('hanan', night ? 'byeNight' : 'byeDay', 3000);
    if (!night && F.visit && !F.visit.gifted) {
      F.visit.gifted = true;
      const pl = plate();
      const holder = api.player;
      api.carry(holder, pl);
      api.toast('Hanan packed you some leftovers.', 2400);
      // Real seconds: the plate goes home with them even if they walk far away
      setTimeout(() => holder.kid.carried === pl && api.carry(holder, null), 26000);
    }
  }
  function updateFarewell(dt) {
    const f = farewell;
    if (!f) return;
    f.t += dt;
    const P0 = kidPos(api.player);
    for (const w of f.list) {
      if (!w.moving) w.face({ x: P0.x, z: P0.z });
      if (Math.random() < dt * 0.5 && w.kid.pose === 'stand' && !w.kid.emoteType) w.emote(w === sultan ? 'cheer' : 'wave');
    }
    if (f.night && f.said < 3 && f.t > 3.0 + f.said * 2.4) {
      const id = ['odeh', 'sultan', 'basem'][f.said];
      if (people[id] && f.list.includes(people[id])) say(id, ['byeOdeh', 'byeSultan', 'byeBasem'][f.said], 2600);
      f.said++;
    }
    const dist = Math.hypot(P0.x - DOOR.x, P0.z - DOOR.z);
    if ((dist > 9 || f.t > 40) && !f.leaving) {
      f.leaving = true;
      for (const w of f.list) backInside(w);
    }
    if (f.leaving && f.list.every((w) => w.hidden)) {
      if (!F.isNight) odeh.setHidden(false);
      farewell = null;
    }
  }

  // ---------------------------------------------------------------- activities
  async function teaByTheFire() {
    const night = F.isNight;
    const withOdeh = !night && !odeh.hidden;
    const pid = me();
    const seats = FIRE_KIDS.map((s, i) => ({ who: i === 0 ? 'roji' : 'homama', ...s, pose: 'sit', hands: 'hold' }));
    const glasses = [teaGlass(), teaGlass()];
    await stage('tea', { label: 'Get up', seats, focus: { x: -9.1, z: 9.1, y: TENT_Y + 0.7, zoom: 0.5 }, night: night ? undefined : 0.1 }, async (c) => {
      api.roji.kid.arms[1].add(at(glasses[0], 0, -0.33, 0.06));
      api.homama.kid.arms[1].add(at(glasses[1], 0, -0.33, 0.06));
      c.cleanup(() => glasses.forEach((g2) => g2.removeFromParent()));
      if (withOdeh) {
        c.cleanup(() => (brain.odeh = 'fire'));
        if (Math.hypot(odeh.pos.x - FIRE_SEAT.x, odeh.pos.z - FIRE_SEAT.z) > 0.5) {
          if (Math.hypot(odeh.pos.x - FIRE_SEAT.x, odeh.pos.z - FIRE_SEAT.z) > 4) say(pid === 'roji' ? 'homama' : 'roji', pid === 'roji' ? 'Here comes your Baba!' : 'Baba is coming!', 2400);
          // From wherever he is on the way: the garden, leg B of the path, or the tent terrace
          const from = odeh.pos.x < -6 ? 2 : odeh.pos.x < 6.3 && Math.abs(odeh.pos.z - 6) < 1.2 ? 1 : 0;
          await odeh.go(TO_FIRE.slice(from), { speed: 2.5, run: true });
        }
        if (!c.live()) return;
        odeh.sit({ ...FIRE_SEAT, yaw: yawTo(FIRE_SEAT, SPOT.fire) + 0.4, hands: 'hold' });
        say('odeh', pid === 'roji' ? 'My Roji by my fire. Life is good.' : 'Sit, sit, Homama. Tea is ready.', 2600);
        if (!(await c.wait(2.8))) return;
        for (let i = 0; i < 3 && c.live(); i++) {
          const story = i === 1 ? 'odehTease' : 'odehStories';
          say('odeh', story, 4200);
          if (!(await c.wait(4.4))) return;
          const k = i % 2 ? 'roji' : 'homama';
          say(k, L.kidsTea[k][i % L.kidsTea[k].length], 2400);
          api[k].kid.emote?.('nod');
          if (!(await c.wait(2.6))) return;
        }
        say('odeh', 'Yalla, one more glass and then the garden.', 2600);
        await c.wait(3);
      } else {
        // At night it is just the two of them, under the stars
        say('roji', pick('fireNight', L.fireNight), 2800);
        if (!(await c.wait(3))) return;
        say('homama', pick('fireNightLove', L.fireNightLove), 3000);
        api.fx.heartsAt(api.world(-9.05, 8.55, TENT_Y + 1.2), 4);
        if (!(await c.wait(30))) return;
      }
    });
  }

  async function waterGarden() {
    const pid = me();
    const st = H.garden;
    const plants = st.plants;
    const drops = [];
    await stage(
      'water',
      {
        label: 'Done',
        seats: [
          { who: 'player', x: 7.6, z: 5.6, y: GARDEN_Y, yaw: P / 2, pose: 'stand', hands: 'hold' },
          { who: 'partner', x: 7.5, z: 4.4, y: GARDEN_Y, yaw: P / 2 - 0.2, pose: 'stand', hands: 'stir' },
        ],
        focus: { x: 8.5, z: 5.0, y: GARDEN_Y + 0.6, zoom: 0.55 },
      },
      async (c) => {
        st.can.visible = false;
        api.player.kid.arms[1].add(at(can, 0.0, -0.3, 0.12, 0, -P / 2, 0));
        c.cleanup(() => {
          can.removeFromParent();
          st.can.visible = true;
          for (const d of drops) d.removeFromParent();
          watering.on = false;
        });
        if (!odeh.hidden && !F.isNight) {
          odeh.go([{ x: GARDEN_SPOT.x, z: GARDEN_SPOT.z }], { speed: 1.8 }).then(() => odeh.face({ x: 7.6, z: 5.6 }));
        }
        watering.on = true;
        watering.drops = drops;
        say(!odeh.hidden ? 'odeh' : 'partner', !odeh.hidden ? 'odehWater' : 'They look thirsty!', 2800);
        for (let i = 0; i < 4 && c.live(); i++) {
          if (!(await c.wait(2.2))) return;
          // A bed of plants bounces as the water reaches it
          plants[[1, 0, 2, 1][i]].userData.bounce = 1;
          SOUNDS.splash(api.sound);
          if (i === 1 && !odeh.hidden) say('odeh', pid === 'homama' ? 'odehWaterHomama' : 'odehWater', 2600);
          if (i === 2) say('partner', pid === 'roji' ? 'Habibti, you have mud on your nose.' : 'You are a natural, Homama!', 2600);
        }
        const grown = Math.min(5, api.load('garden', 0) + 1);
        api.save('garden', grown);
        growGarden(grown);
        api.fx.burst(api.world(9.25, 5.0, GARDEN_Y + 0.6), ['#7fd38a', '#ffd166', '#ffffff'], 30);
        api.sound.ui?.('good');
        if (!odeh.hidden) say('odeh', 'Look how happy they are. Shukran, habibi.', 3000);
        await c.wait(2.6);
      },
    );
  }
  const watering = { on: false, drops: null, t: 0 };
  const dropGeo = new THREE.SphereGeometry(0.045, 6, 4);
  const dropMat = mat('#9fe0f5', { rough: 0.2 });
  const spout = new THREE.Vector3();
  function updateWatering(dt) {
    if (!watering.on) return;
    watering.t += dt;
    const ds = watering.drops;
    if (watering.t > 0.04 && ds.length < 36) {
      watering.t = 0;
      const d = mesh(dropGeo, dropMat, { cast: false });
      can.updateWorldMatrix(true, false);
      spout.set(0.31, 0.29, 0).applyMatrix4(can.matrixWorld);
      d.position.copy(api.local(spout));
      d.position.y = spout.y;
      const fy = api.player.yaw;
      const fw = 0.8 + Math.random() * 0.4;
      const sd = (Math.random() - 0.5) * 0.4;
      d.userData.v = new THREE.Vector3(Math.sin(fy) * fw + Math.cos(fy) * sd, 0.4, Math.cos(fy) * fw - Math.sin(fy) * sd);
      g.add(d);
      ds.push(d);
    }
    for (let i = ds.length - 1; i >= 0; i--) {
      const d = ds[i];
      d.userData.v.y -= 9 * dt;
      d.position.addScaledVector(d.userData.v, dt);
      if (d.position.y < GARDEN_Y + 0.3) {
        d.removeFromParent();
        ds.splice(i, 1);
      }
    }
  }
  function growGarden(stage_) {
    const k = 1 + stage_ * 0.07;
    for (const p of H.garden.plants) p.userData.size = k;
  }
  growGarden(api.load('garden', 0));

  async function football() {
    if (basem.hidden) return;
    const pid = me();
    const ball = H.ball;
    const spot = { x: SPOT.kick.x, z: SPOT.kick.z };
    const best = api.load('penalties', 0);
    let goals = 0;
    await stage(
      'football',
      {
        label: 'Stop playing',
        endOnMove: false,
        seats: [
          { who: 'player', x: spot.x, z: spot.z + 0.45, y: 0, yaw: P, pose: 'stand' },
          { who: 'partner', x: spot.x - 2.3, z: spot.z - 0.3, y: 0, yaw: 2.4, pose: 'stand' },
        ],
        focus: { x: spot.x, z: (spot.z + SPOT.goal.z) / 2 + 0.6, y: 0.8, zoom: 0.62 },
      },
      async (c) => {
        brain.basemOut = 'goal';
        c.cleanup(() => {
          brain.basemOut = true;
          basem.script = null;
          ball.position.set(SPOT.kick.x, 0.15, SPOT.kick.z - 0.4);
        });
        await Promise.race([basem.go([{ x: SPOT.goal.x, z: SPOT.goal.z + 0.5 }], { speed: 3 }), F.wait(3)]);
        if (!c.live()) return;
        basem.place(SPOT.goal.x, SPOT.goal.z + 0.5, 0);
        say('basem', 'basemFootball', 2800);
        if (!(await c.wait(2))) return;
        for (let round = 0; round < 3 && c.live(); round++) {
          ball.position.set(spot.x, 0.15, spot.z - 0.25);
          const pickSide = await api.choose({
            title: `Penalty ${round + 1} of 3`,
            text: `Goals: ${goals}${best ? ` &middot; best ${best} of 3` : ''}. Where do you shoot?`,
            options: [
              { id: '-1', label: 'Left', sub: 'Low and hard' },
              { id: '0', label: 'Middle', sub: 'Bold!' },
              { id: '1', label: 'Right', sub: 'Curl it in' },
            ],
          });
          if (!c.live() || pickSide === null) return;
          const aim = +pickSide;
          // Basem guesses; he gets sharper each round
          const smart = 0.08 + round * 0.12;
          const guess = Math.random() < smart ? aim : [-1, 0, 1][Math.floor(Math.random() * 3)];
          const saved = guess === aim;
          // Kick
          const k = api.player.kid;
          let kt = 0;
          kickAnim = (dt) => {
            kt += dt;
            k.legs[1].rotation.x = -Math.sin(Math.min(1, kt / 0.35) * P) * 1.2;
            return kt < 0.35;
          };
          api.sound.kick?.();
          diveAnim(basem, guess);
          await flyBall(ball, { x: spot.x, z: spot.z - 0.25 }, { x: SPOT.goal.x - aim * 0.95, z: SPOT.goal.z + (saved ? 0.55 : -0.05), y: aim === 0 ? 0.55 : 0.35 }, 0.55);
          if (!c.live()) return;
          if (saved) {
            say('basem', 'basemSave', 2000);
            SOUNDS.boing(api.sound);
            await flyBall(ball, { x: ball.position.x, z: ball.position.z }, { x: spot.x - 1.2, z: spot.z - 1.0, y: 0.15 }, 0.6);
            api.emote('partner', 'bow');
          } else {
            goals++;
            api.sound.ui?.('coin');
            api.fx.burst(api.world(ball.position.x, ball.position.z, 0.6), ['#ffd166', '#ffffff', '#3fbf7f'], 24);
            say('partner', pid === 'roji' ? 'Goal! That is my wife!' : 'Goal! Yes, Homama!', 2200);
            api.emote('partner', 'cheer');
            await c.wait(0.8);
            say('basem', 'basemGoal', 2000);
          }
          if (!(await c.wait(2.2))) return;
        }
        const nb = Math.max(best, goals);
        api.save('penalties', nb);
        const won = goals >= 2;
        say('basem', won ? 'basemLose' : 'basemWin', 3000);
        if (won) {
          api.emote('player', 'cheer');
          api.sound.ui?.('win');
        }
        api.toast(`Penalties: <b>${goals} of 3</b>${goals > best ? ' &middot; a new best!' : ''}`, 2600);
        await c.wait(2.8);
      },
    );
  }
  let kickAnim = null;
  async function flyBall(ball, from, to, dur) {
    const t0 = F.clock;
    while (F.clock - t0 < dur) {
      const k = (F.clock - t0) / dur;
      ball.position.set(from.x + (to.x - from.x) * k, 0.15 + Math.sin(k * P) * 0.5 + (to.y - 0.15) * k, from.z + (to.z - from.z) * k);
      ball.rotation.x -= 0.3;
      await F.wait(0.016);
    }
    ball.position.set(to.x, to.y, to.z);
  }
  function diveAnim(w, side) {
    let t = 0;
    const bx = w.pos.x;
    w.script = (dt, tt, ww) => {
      t += dt;
      const k = Math.min(1, t / 0.35);
      const back = clamp((t - 1.0) / 0.4, 0, 1);
      const s = side === 0 ? 0 : -side;
      const dive = k * (1 - back);
      ww.kid.root.position.set(bx + s * 0.9 * dive, ww.y + (side === 0 ? Math.sin(k * P) * 0.45 * (1 - back) : Math.sin(k * P) * 0.25), ww.pos.z);
      ww.kid.root.rotation.set(0, 0, -s * 1.25 * dive);
      ww.kid.hands = side === 0 ? 'wave2' : 'carry';
      if (t > 1.45) {
        ww.script = null;
        ww.kid.hands = null;
        ww.kid.root.rotation.set(0, ww.yaw, 0);
        return false;
      }
      return true;
    };
  }

  async function familyPhoto() {
    const pid = me();
    const night = F.isNight;
    const list = [odeh, hanan, sultan, ...(F.visit?.basemIn ? [basem] : [])];
    const lineup = { odeh: { x: -1.25, z: -5.15 }, hanan: { x: 1.2, z: -5.15 }, basem: { x: 2.2, z: -5.35 }, sultan: { x: 0.0, z: -4.25 } };
    await stage(
      'photo',
      {
        label: 'Get up',
        seats: [
          { who: 'roji', x: -0.4, z: -4.95, y: TOP, yaw: 0, pose: 'stand' },
          { who: 'homama', x: 0.4, z: -4.95, y: TOP, yaw: 0, pose: 'stand' },
        ],
        focus: { x: 0.3, z: -4.6, y: TOP + 1.1, zoom: 0.6 },
      },
      async (c) => {
        c.cleanup(() => {
          for (const w of list) {
            w.script = null;
            if (w !== odeh || night) backInside(w);
            else w.go([{ x: 0, z: -0.6 }, { x: 0, z: 1.75 }, { x: 6.95, z: 1.75 }, { x: 6.95, z: 3.15 }, { x: GARDEN_SPOT.x, z: GARDEN_SPOT.z }]);
          }
        });
        for (const w of list) {
          if (w.hidden) fromDoor(w, w === sultan ? 0.4 : 0);
          w.go([lineup[w.id]], { speed: 2.6 });
        }
        say('player', 'photo', 2200);
        const t0 = F.clock;
        while (c.live() && list.some((w) => w.moving) && F.clock - t0 < 6) await F.wait(0.1);
        if (!c.live()) return;
        for (const w of list) {
          w.place(lineup[w.id].x, lineup[w.id].z, 0);
          w.face(0);
        }
        say('hanan', 'Squeeze in, squeeze in!', 2000);
        if (!(await c.wait(1.6))) return;
        for (const n of ['3', '2', '1']) {
          say('odeh', n, 800);
          api.sound.ui?.('tick');
          if (!(await c.wait(0.9))) return;
        }
        // Sultan jumps at the last second, of course
        sultan.hop(5);
        odeh.emote('heart');
        hanan.emote('wave');
        if (list.includes(basem)) basem.emote('cheer');
        api.emote('roji', 'heart');
        api.emote('homama', 'cheer');
        await c.wait(0.35);
        flash();
        SOUNDS.shutter(api.sound);
        const n = api.load('photos', 0) + 1;
        api.save('photos', n);
        if (!(await c.wait(1.2))) return;
        const img = drawFamilyPhoto(api.looks, list.map((w) => w.id), { night, n });
        await api.choose({ title: 'Family photo', text: `<img src="${img}" alt="The family on Odeh's hill" style="width:min(300px,70vw);border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.18)"><br>Sultan jumped. Of course he did. Photo ${n} for Hanan's album.`, options: [{ id: 'ok', label: 'Lovely!' }] });
        if (!c.live()) return;
        say('hanan', 'This one goes on the fridge!', 2400);
        await c.wait(2);
      },
    );
  }

  async function bench() {
    const pid = me();
    let flower = null;
    await stage(
      'bench',
      {
        label: 'Get up',
        seats: [
          { who: 'roji', x: SPOT.bench.x - 0.42, z: SPOT.bench.z + 0.08, y: TOP + 0.47, yaw: 0, pose: 'sit' },
          { who: 'homama', x: SPOT.bench.x + 0.42, z: SPOT.bench.z + 0.08, y: TOP + 0.47, yaw: 0, pose: 'sit' },
        ],
        focus: { x: SPOT.bench.x, z: SPOT.bench.z + 0.4, y: TOP + 0.9, zoom: 0.5 },
      },
      async (c) => {
        say('roji', 'bench', 2600);
        if (!(await c.wait(3.6))) return;
        // Homama tucks a jasmine flower behind Roji's ear
        api.homama.kid.hands = 'hold';
        say('homama', 'benchLove', 2800);
        if (!(await c.wait(0.8))) return;
        api.homama.kid.hands = null;
        flower = new THREE.Group();
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * P * 2;
          flower.add(at(sph(0.03, '#ffffff', 6, 4), Math.sin(a) * 0.035, Math.cos(a) * 0.035, 0));
        }
        flower.add(at(sph(0.018, '#ffd166', 6, 4), 0, 0, 0.01));
        flower.position.set(0.27, 0.42, 0.06);
        flower.rotation.y = P / 2;
        api.roji.kid.head.add(flower);
        api.emote('roji', 'heart');
        api.fx.heartsAt(api.world(SPOT.bench.x, SPOT.bench.z, TOP + 1.5), 5);
        await c.wait(40);
      },
    );
    // The flower stays for the rest of the visit
    if (flower) jasmine.push(flower);
  }
  const jasmine = [];

  // The bench half way up: a breather, the view over the town, and Homama's little sign
  async function rest() {
    const pid = me();
    const B = SPOT.bench2;
    await stage(
      'rest',
      {
        label: 'Get up',
        seats: [
          { who: 'roji', x: B.x - 0.37, z: B.z + 0.08, y: HALF_Y + 0.47, yaw: 0, pose: 'sit' },
          { who: 'homama', x: B.x + 0.37, z: B.z + 0.08, y: HALF_Y + 0.47, yaw: 0, pose: 'sit' },
        ],
        focus: { x: B.x, z: B.z + 0.9, y: HALF_Y + 0.9, zoom: 0.5 },
      },
      async (c) => {
        say('roji', 'restPuff', 2600);
        if (!(await c.wait(2.8))) return;
        say('homama', 'restView', 2800);
        if (!(await c.wait(3.0))) return;
        say(pid === 'roji' ? 'roji' : 'homama', pid === 'roji' ? 'restSignRoji' : 'restSignHomama', 3000);
        if (!(await c.wait(3.2))) return;
        say(pid === 'roji' ? 'homama' : 'roji', pid === 'roji' ? 'restSignReply' : 'restSignSmile', 2800);
        api.emote('roji', 'heart');
        api.fx.heartsAt(api.world(B.x, B.z, HALF_Y + 1.5), 4);
        await c.wait(40);
      },
    );
  }

  function patCamel() {
    H.camel.awake(3.4);
    SOUNDS.camel(api.sound);
    api.emote('player', 'heart');
    say('partner', 'camel', 2600);
  }
  function petGoat() {
    H.goat.react();
    SOUNDS.goat(api.sound);
    api.emote('player', 'cheer');
    say('player', 'goat', 2400);
  }
  async function drawWater() {
    if (F.busy === 'well') return;
    const live = F.begin('well', { force: true });
    H.well.depth = 1.5;
    H.well.water.visible = false;
    api.sound.ui?.('swoosh');
    await F.wait(1.6);
    SOUNDS.splash(api.sound);
    H.well.water.visible = true;
    H.well.depth = 0.55;
    await F.wait(1.6);
    say('player', 'well', 2400);
    api.fx.burst(api.world(SPOT.well.x, SPOT.well.z, GARDEN_Y + 1.3), ['#bfe9ff', '#ffffff'], 14);
    await F.wait(2.4);
    H.well.water.visible = false;
    live.done();
  }

  // ---------------------------------------------------------------- hotspots
  const atTent = (api_) => Math.abs(api_.player.y - TENT_Y) < 0.3;
  const atGarden = (api_) => Math.abs(api_.player.y - GARDEN_Y) < 0.3;
  const atHalf = (api_) => Math.abs(api_.player.y - HALF_Y) < 0.2;
  const at2 = (api_) => api_.player.y > TOP - 0.3;
  const at0 = (api_) => api_.player.y < 0.4;
  const free = () => !F.busy || ['well'].includes(F.busy);
  const hotspots = [
    { x: -7.7, z: 9.3, r: 1.4, label: () => (F.isNight || odeh.hidden ? 'Sit by the fire' : 'Tea with Odeh'), icon: 'o-tea', when: (a) => atTent(a) && free(), act: () => teaByTheFire() },
    { x: 7.35, z: 5.3, r: 1.2, label: 'Water the garden', icon: 'o-drop', when: (a) => atGarden(a) && free(), act: () => waterGarden() },
    { x: SPOT.camel.x + 2.05, z: SPOT.camel.z + 0.35, r: 1.3, label: 'Pat the camel', icon: 'heart', when: (a) => at0(a), act: () => patCamel() },
    { track: () => ({ x: H.goat.pos.x, z: H.goat.pos.z + 0.55 }), r: 1.1, label: 'Pet the goat', icon: 'heart', when: (a) => at2(a), act: () => petGoat() },
    { x: SPOT.well.x - 1.15, z: SPOT.well.z + 0.2, r: 1.0, label: 'Draw water', icon: 'o-drop', when: (a) => atGarden(a) && free(), act: () => drawWater() },
    { x: SPOT.bench2.x, z: SPOT.bench2.z + 0.95, r: 1.1, label: 'Rest on the bench', icon: 'smile', when: (a) => atHalf(a) && free(), act: () => rest() },
    { track: () => ({ x: basem.pos.x, z: basem.pos.z + 0.75 }), r: 1.3, label: 'Penalties with Basem', icon: 'o-ball', when: (a) => at0(a) && !basem.hidden && brain.basemOut === true && free(), act: () => football() },
    { x: -2.4, z: -3.6, r: 1.2, label: 'Family photo', icon: 'o-camera', when: (a) => at2(a) && free(), act: () => familyPhoto() },
    { x: SPOT.bench.x, z: SPOT.bench.z + 0.95, r: 1.1, label: 'Sit on the bench', icon: 'smile', when: (a) => at2(a) && free(), act: () => bench() },
  ];

  // ---------------------------------------------------------------- every frame
  const tmp = new THREE.Vector3();
  function update(dt, t) {
    const night = F.isNight;
    const v = F.visit;
    // Odeh: garden by day, inside at night
    if (!F.busy && !farewell) {
      if (night && !odeh.hidden && !odeh.moving) odeh.setHidden(true);
      if (!night && odeh.hidden) {
        odeh.place(GARDEN_SPOT.x, GARDEN_SPOT.z, GARDEN_SPOT.yaw);
        odeh.setHidden(false);
        brain.odeh = 'garden';
      }
      if (!odeh.hidden && !odeh.moving) {
        brain.odehT -= dt;
        if (brain.odehT <= 0) {
          brain.odehT = 45 + Math.random() * 35;
          if (brain.odeh === 'garden') {
            brain.odeh = 'fire';
            odeh.go(TO_FIRE).then((ok) => ok && !F.busy && odeh.sit({ ...FIRE_SEAT, yaw: yawTo(FIRE_SEAT, SPOT.fire) + 0.4, hands: 'hold' }));
          } else {
            brain.odeh = 'garden';
            odeh.go(TO_GARDEN).then((ok) => ok && odeh.face(GARDEN_SPOT.yaw));
          }
        }
      }
      // Odeh's gardening: now and then he bends to his plants
      if (brain.odeh === 'garden' && !odeh.moving && !odeh.seat && !odeh.hidden) {
        odeh.kid.hands = Math.sin(t * 0.4) > 0.2 ? 'stir' : null;
        const P0 = kidPos(api.player);
        const d = Math.hypot(P0.x - odeh.pos.x, P0.z - odeh.pos.z);
        if (d < 3.2 && Math.abs(api.player.y - GARDEN_Y) < 0.4) {
          odeh.face({ x: P0.x, z: P0.z });
          if (!v.said.has('odehHello')) {
            v.said.add('odehHello');
            say('odeh', 'odehHello', 3000);
            odeh.emote('wave');
          }
        } else odeh.face(GARDEN_SPOT.yaw);
      }
    }
    // Hanan runs out the first time Roji and Homama come up to the courtyard
    if (v && !v.hugged && !F.busy && !farewell && !api.activityRunning) {
      const P0 = kidPos(api.player);
      if (onPlateau(api.player) && P0.z < PLATEAU.z1 - 0.3) arrival();
    }
    // Basem arrives during the visit
    if (v && v.basem === 'arrive' && !v.basemIn && v.t > v.basemArriveAt && !F.busy && !farewell && !api.activityRunning) basemArrives();
    // Basem in the yard by day when he is here
    if (v && v.basemIn && !F.busy && !farewell && v.basem === 'here' && !brain.basemOut && !night) {
      basem.place(SPOT.goal.x - 1.2, SPOT.goal.z + 1.6, 0.6);
      basem.setHidden(false);
      brain.basemOut = true;
    }
    if (brain.basemOut && night && !F.busy) {
      basem.setHidden(true);
      brain.basemOut = false;
    }
    // Basem juggles the ball while he waits
    if (brain.basemOut === true && !basem.hidden && !basem.moving && F.busy !== 'football') {
      brain.juggle += dt;
      const k = Math.abs(Math.sin(brain.juggle * 3.2));
      H.ball.position.set(basem.pos.x + Math.sin(basem.yaw) * 0.32, 0.3 + k * 0.7, basem.pos.z + Math.cos(basem.yaw) * 0.32);
      basem.kid.legs[1].rotation.x = -0.6 * (1 - k);
      const P0 = kidPos(api.player);
      if (Math.hypot(P0.x - basem.pos.x, P0.z - basem.pos.z) < 4) basem.face({ x: P0.x, z: P0.z });
    }
    for (const w of Object.values(people)) w.update(dt, t);
    if (brain.basemOut === true && !basem.hidden && !basem.moving && F.busy !== 'football') basem.kid.legs[1].rotation.x = -0.6 * (1 - Math.abs(Math.sin(brain.juggle * 3.2)));
    if (kickAnim && !kickAnim(dt)) kickAnim = null;
    updateFarewell(dt);
    updateWatering(dt);
    // Plants bounce when watered and keep their grown size
    for (const p of H.garden.plants) {
      const b = (p.userData.bounce = Math.max(0, (p.userData.bounce || 0) - dt * 1.6));
      const s = (p.userData.size || 1) * (1 + Math.sin(b * P * 3) * 0.14 * b);
      p.scale.set(1, s, 1);
    }
    talk.update(dt);
  }

  // Going into the house: whoever was out here goes in too (scenes outside stop)
  function enterHouse() {
    F.cancel();
    talk.clear();
    farewell = null;
    for (const w of [hanan, sultan]) {
      w.script = null;
      w.setHidden(true);
    }
    if (brain.basemOut !== true) {
      basem.kid.carry(null);
      basem.setHidden(true);
      brain.basemOut = false;
    }
  }

  // Leaving the hill: the jasmine flower and the leftovers stay behind
  function away() {
    for (const f of jasmine.splice(0)) f.removeFromParent();
    talk.clear();
  }

  return { people, hotspots, update, goodbye, enterHouse, away, talk, brain, debug: { arrival, basemArrives, football, familyPhoto, rest } };
}
