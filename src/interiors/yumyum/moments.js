import * as K from './kit.js';
import * as D from './decor.js';
import { OUD_SONGS } from './music.js';
import { GRILL, MIX, MENU, BOOTHS, SEAT_Y, CHAIR_Y, STOOL_Y, STOOL_Z, PARTY, FOUNTAIN, RUG, RESERVED, LATTE_STOOLS, LATTE_Z, BAR, RESTROOM } from './layout.js';

// Everything Roji and Homama can do in the big YumYum. C: the room's shared parts (see interior.js).

const { THREE, COL, cyl, at } = K;
const NAME = { roji: 'Roji', homama: 'Homama' };
const other = (id) => (id === 'roji' ? 'homama' : 'roji');
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

const SHAKES = [
  { id: 'strawberry', label: 'Strawberry', sub: 'Pink and dreamy' },
  { id: 'chocolate', label: 'Chocolate', sub: 'Rich and creamy' },
  { id: 'vanilla', label: 'Vanilla', sub: 'Sweet and simple' },
  { id: 'mint', label: 'Mint', sub: 'Cool and fresh' },
];
const MEALS = [
  { id: 'burger', label: 'Burger and fries', sub: 'The YumYum classic', food: ['burger', 'burger'], middle: 'fries' },
  { id: 'shawarma', label: 'Shawarma', sub: 'Wrapped warm', food: ['shawarma', 'shawarma'], middle: 'juice' },
  { id: 'mansaf', label: 'Mansaf', sub: 'A big plate to share', food: [], middle: 'mansaf' },
  { id: 'cake', label: 'Cake and Spanish latte', sub: "Roji's sweet favourite", food: ['pecan-cake', 'german-cake'], middle: 'spanish-latte' },
];
const LINES = {
  burger: ['This is the best burger on the island!', 'Extra cheese, just how you like it.'],
  shawarma: ['Warm, garlicky and perfect.', 'One more bite, then I share!'],
  mansaf: ['Mansaf, just like a family feast.', 'We should come here every Friday.'],
  cake: ['Cake tastes better with you.', 'A Spanish latte and a sweet date.'],
};
const WISHES = {
  roji: ['I wished for a thousand more dinners like this one.', 'I wished that Homama always smiles like that.', 'I cannot tell you, or it will not come true!'],
  homama: ["I wished for a lifetime of Roji's pecan cake.", "I wished for all of Roji's patients to get well soon.", 'I cannot tell you. But it is about you.'],
};

// A Spanish latte in a glass on a saucer, base at y = 0.
function latteCup() {
  const g = new THREE.Group();
  g.add(at(cyl(0.075, 0.065, 0.012, COL.paper, 14, { rough: 0.3 }), 0, 0.006, 0));
  g.add(at(cyl(0.042, 0.036, 0.055, '#7a4a2e', 12), 0, 0.04, 0));
  const milk = at(cyl(0.044, 0.042, 0.055, '#e9d3b4', 12), 0, 0.095, 0);
  g.add(milk);
  g.add(at(cyl(0.038, 0.038, 0.006, '#f7eee0', 12), 0, 0.124, 0));
  g.userData.milk = milk;
  return g;
}

export function makeMoments(C) {
  const { S, CR, WR, staff, tunes, notes, propAt, carried, after } = C;
  const { g } = S;
  const easeOutBack = S.ctx.util.easeOutBack;
  const tone = (api, f, d, o, delay = 0) => {
    const s = api.sound;
    if (s?.ctx && !s.muted) s.tone(f, s.ctx.currentTime + delay, d, o);
  };
  const st = { music: null, meal: null, dance: null, dinner: null, party: null, latte: null, wish: null };

  const dropShakes = (api) => {
    for (const id of ['roji', 'homama']) {
      if (!carried[id]) continue;
      if (api.actor(id).kid.carried === carried[id].group) api.carry(id, null);
      carried[id] = null;
    }
  };
  // Walk a standing kid toward (x, z) during an activity; returns true once there.
  const walkTo = (a, x, z, dt, speed = 1.4) => {
    const dx = x - (a.pos.x - S.O.x);
    const dz = z - (a.pos.z - S.O.z);
    const d = Math.hypot(dx, dz);
    if (d < 0.03) {
      a.speed = 0;
      return true;
    }
    const step = Math.min(d, speed * dt);
    a.pos.x += (dx / d) * step;
    a.pos.z += (dz / d) * step;
    a.speed = speed;
    a.yaw += wrap(Math.atan2(dx, dz) - a.yaw) * (1 - Math.exp(-12 * dt));
    return false;
  };
  const turnTo = (a, yaw, dt) => (a.yaw += wrap(yaw - a.yaw) * (1 - Math.exp(-8 * dt)));
  const mouth = (a, out) => {
    a.kid.head.getWorldPosition(out);
    out.y -= 0.02;
    out.x += Math.sin(a.yaw) * 0.22;
    out.z += Math.cos(a.yaw) * 0.22;
    return out;
  };

  // ---------------------------------------------------------------- run the kitchen
  function runKitchen(api) {
    if (!api.hasArena('cooking')) return api.toast('The kitchen opens soon.');
    dropShakes(api);
    let tt = 0;
    let started = false;
    const me = api.playerId;
    api.activity({
      label: 'Stop',
      seats: [
        { who: 'player', x: GRILL.x, z: -8.75, yaw: Math.PI, pose: 'stand', hands: 'stir' },
        { who: 'partner', x: GRILL.x - 1.15, z: -8.1, yaw: Math.PI * 0.8, pose: 'stand' },
      ],
      focus: { x: GRILL.x + 0.2, z: -8.9, y: 1.1, zoom: 0.5 },
      exit: { x: GRILL.x - 0.6, z: -7.9 },
      update(dt) {
        tt += dt;
        if (started || tt < 1.3) return;
        started = true;
        api.playArena('cooking').then((res) => {
          if (api.activityRunning) api.endActivity();
          if (!res || res.quit || res.error) return;
          const coins = res.coins ?? 0;
          if (res.win) {
            api.emote('player', 'cheer');
            setTimeout(() => api.emote('partner', 'heart'), 400);
            api.fx.heartsAt(api.world(GRILL.x, -8.2, 1.6), 6);
            api.toast(`<b>${NAME[me]}</b> earned <b>${coins} coins</b> in the kitchen. ${NAME[api.partnerId]}: "Chef of the year!"`, 3600);
          } else api.toast(`<b>${coins} coins</b> this shift. ${NAME[api.partnerId]}: "Next shift is yours, I can feel it."`, 3400);
          api.save('lastShift', coins);
        });
      },
    });
    api.toast(`${NAME[me]} puts on the chef hat...`, 1600);
    api.sound.ui('pop');
  }

  // ---------------------------------------------------------------- eat at a booth
  async function eatAtBooth(api) {
    const choice = await api.choose({ title: "Roji's YumYum", text: 'What would you like today?', options: MEALS.map(({ id, label, sub }) => ({ id, label, sub })) });
    if (!choice) return;
    const m = MEALS.find((q) => q.id === choice);
    const B = BOOTHS[0];
    const [sw, se] = WR.booths[0];
    const xb = B.x;
    const objs = [];
    const onTable = [];
    for (const [id, dx] of [[api.playerId, -0.28], [api.partnerId, 0.28]]) {
      const c = carried[id];
      if (!c) continue;
      if (api.actor(id).kid.carried === c.group) api.carry(id, null);
      c.group.scale.setScalar(0.85);
      c.group.position.set(xb + dx, 0.775, B.z - 0.42);
      g.add(c.group);
      onTable.push(c.group);
      carried[id] = null;
    }
    let tt = 0;
    let step = 0;
    const meal = (st.meal = { m, objs });
    api.activity({
      label: 'Get up',
      seats: [
        { who: 'player', x: sw.x, z: sw.z, y: SEAT_Y, yaw: sw.yaw, pose: 'sit' },
        { who: 'partner', x: se.x, z: se.z, y: SEAT_Y, yaw: se.yaw, pose: 'sit' },
      ],
      focus: { x: xb, z: B.z + 0.2, y: 0.85, zoom: 0.48 },
      exit: { x: xb - 0.3, z: B.z + 1.5 },
      update(dt, t) {
        tt += dt;
        if (step === 0 && tt > 1.2) {
          step = 1;
          const spots = [[m.food[0], xb - 0.2, B.z + 0.12, 0.26], [m.food[1], xb + 0.2, B.z + 0.12, 0.26], [m.middle, xb, B.z - 0.25, m.middle === 'mansaf' ? 0.42 : 0.24]];
          for (const [id, x, z, size] of spots) {
            if (!id) continue;
            propAt(id, size, x, 0.775, z, x < xb ? Math.PI / 2 : x > xb ? -Math.PI / 2 : 0)?.then((f) => {
              if (!f) return;
              if (st.meal !== meal) return f.removeFromParent();
              f.userData.k = 0;
              f.scale.setScalar(0.01);
              objs.push(f);
            });
          }
          api.sound.ui('pop');
          api.toast('Here you go! Fresh from the YumYum kitchen.', 2200);
        }
        for (const f of objs) {
          f.userData.k = Math.min(1, f.userData.k + dt * 2.5);
          const bite = step >= 3 ? Math.max(0.55, 1 - (tt - 4.6) * 0.06) : 1;
          f.scale.setScalar(Math.max(0.01, easeOutBack(f.userData.k) * bite));
        }
        if (step >= 1 && step < 4) for (const a of [api.player, api.partner]) a.kid.hands = Math.sin(t * 3 + (a === api.partner ? 1.4 : 0)) > 0.3 ? 'hold' : null;
        if (step === 1 && tt > 2.6) {
          step = 2;
          C.steamAt(new THREE.Vector3(xb, 0.95, B.z), 3);
        }
        if (step === 2 && tt > 4.4) {
          step = 3;
          api.fx.heartsAt(api.world(xb, B.z, 1.5), 6);
          api.sound.ui('good');
          const [a, b] = LINES[m.id];
          api.toast(`<b>${NAME[api.playerId]}:</b> ${a}<br><b>${NAME[api.partnerId]}:</b> ${b}`, 3600);
        }
        if (step === 3 && tt > 9) {
          step = 4;
          for (const a of [api.player, api.partner]) a.kid.hands = null;
          api.fx.heartsAt(api.world(xb, B.z, 1.4), 4);
          C.steamAt(null);
        }
      },
      onEnd() {
        for (const f of objs) f.removeFromParent();
        for (const o of onTable) o.removeFromParent();
        C.steamAt(null);
        st.meal = null;
      },
    });
    api.toast(`${NAME[api.playerId]} and ${NAME[api.partnerId]} slide into the cosy booth.`, 2200);
  }

  // ---------------------------------------------------------------- dance to the oud
  let songIndex = 0;
  function playOud(api) {
    dropShakes(api);
    const song = OUD_SONGS[songIndex++ % OUD_SONGS.length];
    const dance = song.dance;
    const X = RUG.x;
    const Z = RUG.z;
    const seats =
      dance === 'slow'
        ? [{ who: 'player', x: X - 0.28, z: Z, yaw: Math.PI / 2 }, { who: 'partner', x: X + 0.28, z: Z, yaw: -Math.PI / 2 }]
        : dance === 'dabke'
          ? [{ who: 'player', x: X - 0.33, z: Z, yaw: 0 }, { who: 'partner', x: X + 0.33, z: Z, yaw: 0 }]
          : [{ who: 'player', x: X - 0.45, z: Z + 0.2, yaw: 0.35 }, { who: 'partner', x: X + 0.45, z: Z - 0.1, yaw: -0.4 }];
    const run = (st.dance = { song });
    tunes.oud(song, { gain: 1 });
    C.musicOwner = run;
    api.activity({
      label: 'Stop dancing',
      seats: seats.map((s) => ({ ...s, pose: 'stand' })),
      focus: { x: X - 0.2, z: Z - 1.1, y: 1.0, zoom: 0.62 },
      night: 0.35,
      music: 0.12,
      exit: { x: X - 0.4, z: Z + 1.0 },
      update() {
        for (const a of [api.player, api.partner]) {
          a.kid.danceLoop = true;
          if (a.kid.emoteType !== dance) a.kid.emote(dance);
        }
      },
      onEnd() {
        if (C.musicOwner === run) {
          tunes.stop();
          C.musicOwner = null;
        }
        st.dance = null;
        for (const a of [api.roji, api.homama]) a.kid.danceLoop = false;
      },
    });
    api.toast(`Karim plays <b>${song.name}</b> on the oud`, 2600);
    api.sound.ui('coin');
  }

  // ---------------------------------------------------------------- order a milkshake
  function orderShake(api) {
    if (carried[api.playerId]) return api.toast('Finish this milkshake first!', 1800);
    api.choose({ title: 'Milkshake bar', text: `Pick a flavour. ${NAME[api.partnerId]} gets one too.`, options: SHAKES }).then((flavour) => {
      if (!flavour) return;
      let tt = 0;
      let done = false;
      const mixer = CR.mixer;
      api.activity({
        label: 'Done',
        seats: [
          { who: 'player', x: MIX.x - 0.4, z: STOOL_Z, yaw: Math.PI, pose: 'stand' },
          { who: 'partner', x: MIX.x + 0.45, z: STOOL_Z + 0.05, yaw: Math.PI - 0.3, pose: 'stand' },
        ],
        focus: { x: MIX.x, z: -3.6, y: 1.2, zoom: 0.5 },
        update(dt, t) {
          tt += dt;
          if (!done) {
            mixer.spin.rotation.y += dt * 40;
            mixer.cup.position.x = Math.sin(t * 50) * 0.006;
            if (Math.random() < dt * 12) tone(api, 120 + Math.random() * 40, 0.08, { type: 'sawtooth', gain: 0.012 });
          }
          if (!done && tt > 1.8) {
            done = true;
            mixer.cup.position.x = 0;
            for (const who of [api.playerId, api.partnerId]) {
              const sh = K.makeShake(flavour);
              sh.group.scale.setScalar(1.15);
              sh.group.position.set(0, -0.12, 0.02);
              carried[who] = { group: sh.group, shake: sh, sips: 0, t: 1.5 + (who === api.partnerId ? 1.2 : 0) };
              api.carry(who, sh.group);
            }
            api.sound.ui('pop');
            api.fx.heartsAt(api.world(MIX.x, STOOL_Z, 1.6), 4);
            api.toast(`Two ${flavour} milkshakes with whipped cream and a cherry on top.`, 2600);
          }
          if (done && tt > 2.6) api.endActivity();
        },
      });
      api.toast('The mixer whirs...', 1500);
    });
  }

  // ---------------------------------------------------------------- read the menu
  function readMenu(api) {
    api.focus({ x: MENU.x, z: -9.6, y: 2.25, zoom: 0.42 });
    api.toast("Shawarma, burgers, fries, Spanish latte, mint lemonade, pecan cake, German cake and mansaf. <b>Roji's favourite:</b> the pecan cake.", 4200);
    after(4.3, () => api.focus(null));
  }

  // ---------------------------------------------------------------- a Spanish latte at the dessert bar
  async function orderLatte(api) {
    const choice = await api.choose({
      title: 'Dessert and coffee bar',
      text: 'Two Spanish lattes coming up. Anything sweet with them?',
      options: [
        { id: 'none', label: 'Just the lattes', sub: 'Sweet and creamy' },
        { id: 'pecan-cake', label: 'With pecan cake', sub: "Roji's favourite" },
        { id: 'german-cake', label: 'With German cake', sub: 'Chocolate and coconut' },
        { id: 'macarons', label: 'With macarons', sub: 'Pink and pretty' },
      ],
    });
    if (!choice) return;
    dropShakes(api);
    const barista = staff.barista;
    const objs = [];
    let tt = 0;
    let step = 0;
    const run = (st.latte = { objs });
    const [s1, s2] = [LATTE_STOOLS[1], LATTE_STOOLS[2]];
    api.activity({
      label: 'Get up',
      seats: [
        { who: 'player', x: s1, z: LATTE_Z, y: STOOL_Y, yaw: Math.PI, pose: 'sit' },
        { who: 'partner', x: s2, z: LATTE_Z, y: STOOL_Y, yaw: Math.PI, pose: 'sit' },
      ],
      focus: { x: (s1 + s2) / 2, z: -7.3, y: 1.15, zoom: 0.5 },
      exit: { x: s1 - 0.2, z: LATTE_Z + 1.1 },
      update(dt, t) {
        tt += dt;
        C.baristaYaw = step >= 1 && step < 3 ? Math.PI : 0;
        if (step === 0 && tt > 0.4) {
          step = 1;
          api.toast('The barista pulls two shots...', 1800);
        }
        if (step === 1 && tt > 1.0) {
          step = 2;
          C.steamAt(WR.espresso, 6);
          for (let i = 0; i < 6; i++) tone(api, 2400 + Math.random() * 1600, 0.12, { type: 'sawtooth', gain: 0.004 }, i * 0.12);
        }
        if (step === 2 && tt > 2.4) {
          step = 3;
          C.steamAt(null);
        }
        if (step === 3 && tt > 2.9) {
          step = 4;
          for (const [x, dz] of [[s1 - 0.3, 0], [s2 + 0.3, 0]]) {
            const cup = latteCup();
            cup.position.set(x, 1.01, BAR.z + 0.2 + dz);
            cup.userData.k = 0;
            cup.scale.setScalar(0.01);
            g.add(cup);
            objs.push(cup);
          }
          if (choice !== 'none') {
            for (const x of [(s1 + s2) / 2]) {
              propAt(choice, 0.2, x, 1.01, BAR.z + 0.12)?.then((f) => {
                if (!f) return;
                if (st.latte !== run) return f.removeFromParent();
                f.userData.k = 0;
                f.scale.setScalar(0.01);
                objs.push(f);
              });
            }
          }
          api.sound.ui('pop');
        }
        for (const f of objs) {
          f.userData.k = Math.min(1, (f.userData.k ?? 1) + dt * 2.5);
          f.scale.setScalar(Math.max(0.01, easeOutBack(f.userData.k)));
        }
        if (step >= 4 && step < 6) {
          for (const a of [api.player, api.partner]) a.kid.hands = Math.sin(t * 1.6 + (a === api.partner ? 2.2 : 0)) > 0.6 ? 'hold' : null;
          for (const cup of objs) if (cup.userData.milk) cup.userData.milk.scale.y = Math.max(0.3, 1 - Math.max(0, tt - 4) * 0.06);
        }
        if (step === 4 && tt > 4.4) {
          step = 5;
          api.fx.heartsAt(api.world((s1 + s2) / 2, LATTE_Z, 1.5), 5);
          api.sound.ui('good');
          api.toast('<b>Roji:</b> Spanish latte, my favourite.<br><b>Homama:</b> I know. I asked them for extra love in yours.', 4200);
        }
        if (step === 5 && tt > 12) {
          step = 6;
          for (const a of [api.player, api.partner]) a.kid.hands = null;
        }
      },
      onEnd() {
        for (const f of objs) f.removeFromParent();
        C.baristaYaw = 0;
        C.steamAt(null);
        st.latte = null;
      },
    });
    api.toast(`${NAME[api.playerId]} and ${NAME[api.partnerId]} hop up onto the bar stools.`, 2000);
  }

  // ---------------------------------------------------------------- the candle-lit dinner at the reserved table
  function dinner(api) {
    dropShakes(api);
    const RX = RESERVED.x;
    const RZ = RESERVED.z;
    const chair = WR.rojiChair;
    const CX = RX - 0.62;
    const ro = api.roji;
    const ho = api.homama;
    const dessert = D.makeDessertForTwo();
    const v = new THREE.Vector3();
    let tt = 0;
    let step = 0;
    let bites = 0;
    let biteT = 0;
    let waiterDone = false;
    const run = (st.dinner = { dessert });
    tunes.oud(OUD_SONGS[1], { gain: 0.45 });
    C.musicOwner = run;
    const waiter = staff.waiterA;
    const way = [{ x: -6.8, z: -2.4 }, { x: -7.25, z: -4.3 }, { x: RX + 0.1, z: RZ + 1.02, face: Math.PI }];
    api.activity({
      label: 'Get up',
      seats: [
        { who: 'roji', x: RX - 1.0, z: RZ + 1.15, yaw: Math.PI, pose: 'stand' },
        { who: 'homama', x: RX - 0.4, z: RZ + 1.2, yaw: Math.PI, pose: 'stand' },
      ],
      focus: { x: RX - 0.15, z: RZ + 0.35, y: 0.95, zoom: 0.52 },
      night: 0.5,
      music: 0.25,
      exit: { x: RX - 0.4, z: RZ + 1.45 },
      update(dt, t) {
        tt += dt;
        // Homama steps behind Roji's chair, pulls it out, Roji sits, he pushes it in and goes round to his seat
        if (step === 0) {
          if (walkTo(ho, RX - 1.42, RZ + 0.02, dt)) step = 1;
        } else if (step === 1) {
          turnTo(ho, Math.PI / 2, dt);
          ho.kid.hands = 'hold';
          if (tt > 1.3) step = 2;
        } else if (step === 2) {
          chair.position.x = Math.max(CX - 0.34, chair.position.x - dt * 0.6);
          walkTo(ho, RX - 1.72, RZ + 0.02, dt, 0.6);
          if (chair.position.x <= CX - 0.33) step = 3;
        } else if (step === 3) {
          turnTo(ho, Math.PI / 2, dt);
          if (walkTo(ro, RX - 0.93, RZ + 0.55, dt)) step = 4;
        } else if (step === 4) {
          if (walkTo(ro, chair.position.x + 0.06, RZ, dt, 0.9)) {
            api.seat('roji', { x: chair.position.x, z: RZ, y: CHAIR_Y, yaw: Math.PI / 2, pose: 'sit' });
            step = 5;
          }
        } else if (step === 5) {
          // Push the chair in with Roji on it
          chair.position.x = Math.min(CX, chair.position.x + dt * 0.5);
          ro.kid.root.position.x = S.O.x + chair.position.x;
          ro.pos.x = ro.kid.root.position.x;
          walkTo(ho, RX - 1.36, RZ + 0.02, dt, 0.5);
          if (chair.position.x >= CX - 0.001) {
            step = 6;
            ho.kid.hands = null;
            ho.kid.emote('heart');
            api.fx.heartsAt(api.world(CX, RZ, 1.45), 3);
            api.toast('Homama pulls out the chair for Roji.', 2200);
          }
        } else if (step === 6) {
          if (tt > 5.0 && walkTo(ho, RX - 1.3, RZ + 0.9, dt)) step = 7;
        } else if (step === 7) {
          if (walkTo(ho, RX + 0.62, RZ + 0.9, dt)) step = 8;
        } else if (step === 8) {
          if (walkTo(ho, RX + 0.62, RZ + 0.25, dt, 0.8)) {
            api.seat('homama', { x: RX + 0.62, z: RZ, y: CHAIR_Y, yaw: -Math.PI / 2, pose: 'sit' });
            step = 9;
            api.toast('<b>Homama:</b> I saved the best table for you.', 2600);
          }
        }
        // The waiter brings a heart cake with two spoons
        if (!waiterDone && step >= 9 && !run.sent) {
          run.sent = true;
          WR.reservedCard.visible = false;
          waiter.jump(way, (w) => {
            w.kid.carry(null);
            dessert.group.position.set(RX, 0.778, RZ + 0.02);
            g.add(dessert.group);
            for (const [i, sp] of dessert.spoons.entries()) {
              sp.position.set(i ? 0.12 : -0.12, 0.05, 0.08);
              sp.rotation.set(0, i ? 0.6 : -0.6, 0);
              dessert.group.add(sp);
            }
            w.kid.emote('bow');
            api.sound.ui('pop');
            run.served = tt;
            after(1.6, () => w.goHome());
          }, 1);
          waiter.kid.carry(run.tray = (() => {
            const tr = new THREE.Group();
            tr.add(at(cyl(0.2, 0.2, 0.02, COL.brass, 16, K.BRASS), 0, 0, 0));
            const d2 = D.makeDessertForTwo().group;
            tr.add(at(d2, 0, 0.012, 0));
            return tr;
          })());
        }
        // Dessert: bites in turn, then Homama gives Roji the last one
        if (run.served && step >= 9 && tt > run.served + 1.2) {
          biteT += dt;
          const me = bites % 2 === 0 ? ro : ho;
          const sp = dessert.spoons[me === ro ? 0 : 1];
          const last = bites >= 6;
          const eater = last ? ro : me;
          const spoon = last ? dessert.spoons[1] : sp;
          const k = biteT < 0.6 ? ease(biteT / 0.6) : biteT < 1.0 ? 1 : 1 - ease((biteT - 1.0) / 0.5);
          const rest = spoon === dessert.spoons[0] ? new THREE.Vector3(-0.12, 0.05, 0.08) : new THREE.Vector3(0.12, 0.05, 0.08);
          dessert.group.worldToLocal(mouth(eater, v));
          spoon.position.lerpVectors(rest, v, k);
          if (k > 0.05) spoon.lookAt(dessert.group.localToWorld(v.clone()));
          (last ? ho : me).kid.hands = k > 0.1 ? 'hold' : null;
          if (biteT > 1.5) {
            biteT = 0;
            spoon.position.copy(rest);
            spoon.rotation.set(0, spoon === dessert.spoons[1] ? 0.6 : -0.6, 0);
            bites++;
            dessert.cake.scale.setScalar(Math.max(0.15, 1 - bites * 0.13));
            tone(api, 880 + bites * 40, 0.08, { type: 'triangle', gain: 0.03 });
            if (bites === 3) api.toast('<b>Roji:</b> This is the sweetest dinner.', 2400);
            if (bites === 7) {
              api.fx.heartsAt(api.world(RX, RZ, 1.4), 10);
              api.sound.ui('win');
              api.toast('<b>Homama:</b> The last bite is yours. It always is.', 3200);
              dessert.cake.visible = false;
            }
            if (bites >= 7) run.served = Infinity;
          }
        }
      },
      onEnd() {
        chair.position.x = CX;
        WR.reservedCard.visible = true;
        dessert.group.removeFromParent();
        if (run.tray && waiter.kid.carried === run.tray) waiter.kid.carry(null);
        waiter.goHome();
        for (const a of [ro, ho]) a.kid.hands = null;
        if (C.musicOwner === run) {
          tunes.stop();
          C.musicOwner = null;
        }
        st.dinner = null;
      },
    });
    api.toast('A candle-lit dinner for two...', 1800);
  }

  // ---------------------------------------------------------------- a birthday: the staff sing and bring a cake
  async function birthday(api) {
    const who = await api.choose({
      title: 'Happy birthday!',
      text: 'Whose birthday is it today?',
      options: [
        { id: 'roji', label: 'Roji', sub: 'The YumYum boss' },
        { id: 'homama', label: 'Homama', sub: 'The YumYum taster' },
      ],
    });
    if (!who) return;
    dropShakes(api);
    const mate = other(who);
    const P = PARTY;
    const d = P.r + 0.17;
    const cake = D.makeBirthdayCake();
    const run = (st.party = { cake, sparks: true });
    const A = staff.waiterA;
    const B = staff.waiterB;
    let arrived = 0;
    let sang = false;
    const lyrics = ['Happy birthday to you', 'Happy birthday to you', `Happy birthday, dear ${NAME[who]}`, 'Happy birthday to you'];
    const ready = () => {
      if (++arrived < 2 || sang || st.party !== run) return;
      sang = true;
      run.singing = true;
      C.musicOwner = run;
      tunes.birthday({
        onLine: (i) => api.toast(`<b>${lyrics[i]}</b>`, 1900),
        onDone: () => {
          if (st.party !== run) return;
          run.singing = false;
          after(0.6, () => {
            if (st.party !== run) return;
            api.toast(`Make a wish, ${NAME[who]}!`, 1600);
          });
          after(2.0, () => {
            if (st.party !== run) return;
            run.sparks = false;
            for (const f of cake.flames) f.visible = false;
            const w = api.world(P.x, P.z, 1.15);
            api.fx.puff(w);
            api.fx.burst(w, [COL.rasp, COL.sun, '#ffffff', '#aab78a', COL.pink], 40);
            api.fx.heartsAt(api.world(P.x, P.z, 1.5), 8);
            api.sound.ui('win');
            for (const wk of [A, B]) wk.kid.emote('cheer');
            api.toast(
              who === 'roji'
                ? '<b>Homama:</b> Happy birthday, my love. Every year with you is my favourite year.'
                : '<b>Roji:</b> Happy birthday, Homama. Thank you for every single day.',
              4200,
            );
            const n = api.load('birthdays', 0) + 1;
            api.save('birthdays', n);
          });
          after(5.0, () => {
            if (st.party !== run) return;
            A.goHome();
            B.goHome();
          });
        },
      });
    };
    const face = (x, z) => Math.atan2(P.x - x, P.z - z);
    A.errand(
      [
        {
          x: 4.4,
          z: -3.3,
          wait: 0.9,
          face: Math.PI,
          do: (w) => {
            w.kid.carry(cake.group);
            cake.group.position.set(0, -0.05, 0.05);
          },
        },
        { x: 1.3, z: -1.7 },
        { x: -1.4, z: 1.6 },
        { x: -3.4, z: 1.6 },
        { x: -4.35, z: 2.4, face: face(-4.35, 2.4) },
      ],
      (w) => {
        w.kid.carry(null);
        cake.group.position.set(P.x, 0.778, P.z);
        cake.group.rotation.set(0, 0, 0);
        g.add(cake.group);
        api.sound.ui('pop');
        ready();
      },
    );
    B.errand([{ x: 1.6, z: -1.9 }, { x: 1.0, z: 1.9 }, { x: -2.45, z: 2.25, face: face(-2.45, 2.25) }], () => ready());
    for (const wk of [A, B]) wk.speed = 1.7;
    api.activity({
      label: 'Get up',
      seats: [
        { who, x: P.x, z: P.z - d, y: CHAIR_Y, yaw: 0, pose: 'sit' },
        { who: mate, x: P.x + d, z: P.z, y: CHAIR_Y, yaw: -Math.PI / 2, pose: 'sit' },
      ],
      focus: { x: P.x + 0.2, z: P.z - 0.15, y: 1.0, zoom: 0.56 },
      night: 0.25,
      music: 0.1,
      exit: { x: P.x + 0.4, z: P.z + 1.2 },
      update(dt, t) {
        if (run.singing) {
          for (const wk of [A, B]) if (!wk.path.length && wk.kid.emoteType !== 'jazz') wk.kid.emote('jazz');
          if (Math.random() < dt * 3) C.noteAt(api, [A.pos, B.pos, staff.host.root.position][Math.floor(Math.random() * 3)]);
        }
        if (run.sparks && cake.group.parent) C.sparkle(cake.group, cake.tip, dt, t);
        for (const [i, f] of cake.flames.entries()) f.scale.set(1, 1.6 + Math.sin(t * 17 + i) * 0.3, 1);
      },
      onEnd() {
        cake.group.removeFromParent();
        if (A.kid.carried === cake.group) A.kid.carry(null);
        for (const wk of [A, B]) {
          wk.goHome();
          wk.speed = 1.25;
        }
        if (C.musicOwner === run) {
          tunes.stop();
          C.musicOwner = null;
        }
        C.sparkle(null);
        st.party = null;
      },
    });
    api.toast('Psst... the staff are up to something.', 2400);
  }

  // ---------------------------------------------------------------- make a wish at the fountain
  function wish(api) {
    dropShakes(api);
    const F = FOUNTAIN;
    const me = api.playerId;
    const coin = at(cyl(0.05, 0.05, 0.012, COL.brass, 12, K.BRASS), 0, 0, 0);
    coin.visible = false;
    g.add(coin);
    const from = new THREE.Vector3();
    const to = new THREE.Vector3(F.x + (Math.random() - 0.5) * 0.8, 0.47, F.z + 0.3 + Math.random() * 0.3);
    let tt = 0;
    let step = 0;
    const hug = Math.random() < 0.5;
    const run = (st.wish = { coin });
    api.activity({
      label: 'Done',
      seats: [
        { who: 'player', x: F.x - 0.35, z: F.z + F.r + 0.45, yaw: Math.PI, pose: 'stand' },
        { who: 'partner', x: F.x + 0.45, z: F.z + F.r + 0.4, yaw: Math.PI, pose: 'stand' },
      ],
      focus: { x: F.x, z: F.z + 0.7, y: 1.0, zoom: 0.55 },
      update(dt) {
        tt += dt;
        const p = api.player;
        const q = api.partner;
        if (step === 0 && tt > 0.4) {
          step = 1;
          p.kid.hands = 'hold';
          from.set(F.x - 0.35, 1.05, F.z + F.r + 0.2);
          coin.visible = true;
          api.sound.ui('tick');
        }
        if (step === 1) {
          const k = Math.min(1, (tt - 0.4) / 0.9);
          coin.position.lerpVectors(from, to, k);
          coin.position.y = from.y + (to.y - from.y) * k + Math.sin(k * Math.PI) * 0.7;
          coin.rotation.x += dt * 14;
          if (k > 0.3) p.kid.hands = null;
          if (k >= 1) {
            step = 2;
            coin.rotation.set(0, 0, 0);
            api.fx.burst(api.world(to.x, to.z, 0.5), ['#ffffff', '#bdefff', '#7fd3ff'], 18);
            tone(api, 700, 0.25, { type: 'sine', gain: 0.05, slideTo: 220 });
          }
        }
        if (step === 2 && tt > 1.9) {
          step = 3;
          api.fx.heartsAt(api.world(F.x, F.z + 0.8, 1.6), 5);
          api.sound.wish?.();
          const lines = WISHES[me];
          api.toast(`<b>${NAME[me]}:</b> ${lines[Math.floor(Math.random() * lines.length)]}`, 3400);
        }
        if (step === 3 && tt > 2.8) {
          step = 4;
          if (hug) {
            const mx = (p.pos.x + q.pos.x) / 2;
            const mz = (p.pos.z + q.pos.z) / 2;
            p.pos.set(mx - 0.28, 0, mz);
            q.pos.set(mx + 0.28, 0, mz);
            p.yaw = Math.PI / 2;
            q.yaw = -Math.PI / 2;
            p.kid.emote('hug');
            q.kid.emote('hug');
          }
        }
        if (step === 4 && tt > (hug ? 5.4 : 4.0)) api.endActivity();
      },
      onEnd() {
        st.wish = null;
        if (coin.position.y > 0.6 || !coin.visible) coin.removeFromParent();
        else C.keepCoin(coin);
      },
    });
  }

  // ---------------------------------------------------------------- the restrooms
  function washHands(api) {
    api.sound.ui('swoosh');
    api.fx.burst(api.world(RESTROOM.x - 0.6, RESTROOM.z, 1.2), ['#ffffff', '#bdefff', '#c7f0ff'], 20);
    api.toast('Squeaky clean hands. Ready to eat!', 2200);
  }

  const hotspots = [
    { x: GRILL.x, z: -8.35, r: 1.5, label: 'Run the kitchen', icon: 'chef', act: runKitchen },
    { x: BOOTHS[0].x, z: BOOTHS[0].z + 1.6, r: 1.5, label: 'Eat at a booth', icon: 'yum', act: eatAtBooth },
    { x: RUG.x, z: RUG.z + 0.4, r: 1.6, label: (api) => (C.evening(api) ? 'Dance to the oud' : 'Ask for a song'), icon: 'music', act: playOud },
    { x: MIX.x, z: STOOL_Z + 0.3, r: 1.2, label: 'Order a milkshake', icon: 'shake', act: orderShake },
    { x: 4.75, z: -3.05, r: 1.0, label: 'Read the menu', icon: 'note', act: readMenu },
    { x: (LATTE_STOOLS[1] + LATTE_STOOLS[2]) / 2, z: LATTE_Z + 0.85, r: 1.4, label: 'Order a Spanish latte', icon: 'cup', act: orderLatte },
    { x: RESERVED.x, z: RESERVED.z + 1.35, r: 1.3, label: 'Candle-lit dinner', icon: 'candle', act: dinner },
    { x: PARTY.x + 1.3, z: PARTY.z + 0.9, r: 1.3, label: 'Celebrate a birthday', icon: 'cake', act: birthday },
    { x: FOUNTAIN.x, z: FOUNTAIN.z + FOUNTAIN.r + 0.55, r: 1.3, label: 'Make a wish', icon: 'star', act: wish },
    { x: RESTROOM.x - 0.75, z: RESTROOM.z, r: 1.0, label: 'Wash your hands', icon: 'drop', act: washHands },
  ];

  return {
    hotspots,
    state: st,
    get dancing() {
      return !!st.dance;
    },
    onExit(api) {
      dropShakes(api);
    },
  };
}
