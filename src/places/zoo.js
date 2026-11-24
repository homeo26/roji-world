import * as THREE from 'three';
import { Giraffe, JODI, JOURI } from './zoo/giraffe.js';
import { Flamingo, Penguin, Tortoise, Butterfly } from './zoo/critters.js';
import { makeAtlas } from './zoo/labels.js';
import { skinify, bakeColors } from './zoo/rig.js';
import { buildScenery, DECK, POND, GARDEN, PHOTO, TREE, BENCHES, HOUSE, FEEDER, TROUGH, LOG } from './zoo/scenery.js';
import { buildExtras, ladderColliders, LADDER, SHOP, makeCrown, makePlush } from './zoo/extras.js';
import { makeActs } from './zoo/acts.js';

// The Island Zoo: Jodi (serious) and Jouri (silly) in a big giraffe enclosure with a raised feeding deck,
// plus flamingos, penguins, a tortoise, a zoo keeper and a little visitor. The activity corners along
// the fence (birthday, brushing, bath, height chart, newspaper, disco, treat stall) live in zoo/acts.js.

const GB = { x0: -10.4, x1: 4.3, z0: -8.7, z1: -3.55 };
const OBSTACLES = [
  { x: HOUSE.x, z: HOUSE.z, r: 2.5 },
  { x: TREE.x, z: TREE.z, r: 1.0 },
  { x: FEEDER.x, z: FEEDER.z, r: 0.9 },
  { x: TROUGH.x, z: TROUGH.z, r: 1.1 },
  { x: LOG.x, z: LOG.z, r: 1.15 },
];
const FENCE_Z = -2.6;
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const KEEPER_LOOK = { id: 'keeper', name: 'Keeper', gender: 'girl', skin: '#e3b08e', hair: '#4a2c1a', hairstyle: 'bob', outfit: 'overalls', top: '#fff3df', bottom: '#7a9a4f', shoes: '#7a4a26', accent: '#ffd166' };
const VISITOR_LOOK = { id: 'zoo-visitor', name: 'Little visitor', gender: 'girl', skin: '#c98f68', hair: '#2a1a13', hairstyle: 'buns', outfit: 'skirt', top: '#ffd166', bottom: '#6fb8ff', shoes: '#ef5b6f', accent: '#ff8fb1' };
const ROUTE = [
  { x: -9.6, z: 0.95, face: Math.PI, wait: 4 },
  { x: -6.2, z: -0.1 },
  { x: -5.6, z: 1.9 },
  { x: -0.2, z: 2.0, wait: 1.5 },
  { x: 3.4, z: 1.7 },
  { x: 5.2, z: 0.4 },
  { x: 7.4, z: -1.55, face: Math.PI, wait: 4 },
  { x: 5.2, z: 0.4 },
  { x: 3.4, z: 1.7 },
  { x: 0.4, z: 4.9, face: 0, wait: 2.5 },
  { x: -0.3, z: 2.1 },
  { x: -5.6, z: 1.9 },
  { x: -6.2, z: -0.1 },
];

const FACTS = [
  (p) => `Hello ${p}! Jodi likes things neat. Jouri likes things fun.`,
  () => 'Climb the Feeding Deck to meet them at head height. They love acacia leaves.',
  () => 'Jouri sneezes when the pollen is high. Jodi has never sneezed in public.',
  () => 'Every giraffe has its own spots. Jouri even has a little heart.',
  () => 'Jodi was voted the most polite giraffe three years in a row.',
  () => 'Flamingos stand on one leg to keep the other one warm.',
  () => 'The tortoise is our oldest friend here. Say hello slowly.',
  (p, q, id) => (id === 'roji' ? `${q} says you are the best doctor on the island, Roji.` : `Roji says you fixed our ticket machine, Homama. Thank you!`),
  () => 'Jodi reads the newspaper every morning. Jouri eats it every morning.',
  () => 'Jouri thinks she is very good at hide and seek. The tree is very thin.',
  () => 'Their birthdays are one day apart. Jodi is older, and she never lets Jouri forget it.',
  () => {
    let best = 0;
    try {
      best = JSON.parse(localStorage.getItem('roji-arena-giraffes-best') || '0') || 0;
    } catch {
      /* ignore */
    }
    return best ? `Your best at Leaf Catch is ${best}. Jodi still talks about it.` : 'Try Leaf Catch from the zoo card. Jouri catches, Jodi judges.';
  },
  () => 'Someone carved two letters in the acacia tree. I wonder who.',
];

export default {
  id: 'zoo',
  stop: { title: 'Island Zoo', tag: 'Meet Jodi and Jouri', icon: 'zoo-giraffe', color: '#e38e3d', text: 'Feed, brush and bathe the giraffes, measure them, sing for their birthday and dance at the giraffe disco. Jodi is very serious. Jouri is very silly.' },
  icons: {
    'zoo-cake': 'M4 20h16 M5 20v-7h14v7 M5 15.5c2 1.5 3.5 1.5 5 0s3.5-1.5 5 0 3 1.5 4 0 M9 13V9.5 M15 13V9.5 M9 7.5c-.8-.9 0-2 0-2.5.9.8 1 1.7 0 2.5z M15 7.5c-.8-.9 0-2 0-2.5.9.8 1 1.7 0 2.5z',
    'zoo-brush': 'M4 20l7-7 M9.5 11.5l3 3 M12 9l5-5 3 3-5 5z M13.5 7.5l3 3',
    'zoo-drop': 'M12 3c3.5 4.5 6 7.6 6 10.5a6 6 0 0 1-12 0C6 10.6 8.5 7.5 12 3z M9.5 14a2.5 2.5 0 0 0 2.5 2.5',
    'zoo-ruler': 'M8 3h5v18H8z M13 6h-2.5 M13 9h-1.5 M13 12h-2.5 M13 15h-1.5 M13 18h-2.5 M17 5v14 M15.5 6.5 17 5l1.5 1.5 M15.5 17.5 17 19l1.5-1.5',
    'zoo-paper': 'M5 4h11v15a2 2 0 0 0 2 2H7a2 2 0 0 1-2-2z M16 8h3v11a2 2 0 0 1-2 2 M8 8h5 M8 11h5 M8 14h5 M8 17h3',
    'zoo-gift': 'M4 9h16v4H4z M5.5 13h13v7h-13z M12 9v11 M12 9c-1.5-3-5-3.5-5-1.2C7 9 9.5 9 12 9z M12 9c1.5-3 5-3.5 5-1.2C17 9 14.5 9 12 9z',
    'zoo-giraffe': 'M9.5 21 10 10 M14 21l-.5-9 M10 10c0-3 2-5 4.5-5H17a2 2 0 0 1 0 4h-3.5 M12.2 5.3 11.5 2.8 M14.8 5l.6-2.4 M10.8 15h.01 M12.6 18h.01 M15.6 6.9h.01',
    'zoo-leaf': 'M5 19c0-8 5-14 14-14 0 9-6 14-14 14z M5 19l7-7',
    'zoo-camera': 'M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    'zoo-paw': 'M12 20c-3 0-5-1.6-5-3.6 0-2.2 2.3-4.4 5-4.4s5 2.2 5 4.4c0 2-2 3.6-5 3.6z M6 10.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z M10 7.2a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z M14 7.2a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z M18 10.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z',
  },

  build(ctx) {
    const { util } = ctx;
    const { damp, clamp, mat, mesh } = util;
    const group = new THREE.Group();
    const dynamic = [];
    const atlas = makeAtlas();
    const scenery = buildScenery(atlas);
    const extras = buildExtras(atlas);
    scenery.group.add(extras.group);
    group.add(scenery.group);
    for (const im of scenery.instanced) {
      group.add(im);
      dynamic.push(im);
    }
    const colliders = [...scenery.colliders, ...extras.colliders, ...ladderColliders(LADDER.x, LADDER.z)];
    const obstacles = [...OBSTACLES, ...extras.obstacles];

    // ------------------------------------------------ animals
    const jodi = new Giraffe(JODI, { home: { x: -4.2, z: -5.6, yaw: 0.3 }, bounds: GB, obstacles });
    const jouri = new Giraffe(JOURI, { home: { x: 0.6, z: -5.0, yaw: -0.5 }, bounds: GB, obstacles });
    const giraffes = [jodi, jouri];
    const flamingos = [new Flamingo(POND.x - 0.95, POND.z - 0.1, 0.5, 1), new Flamingo(POND.x + 0.2, POND.z - 0.55, -0.3, 2), new Flamingo(POND.x + 1.1, POND.z + 0.45, 0.9, 3)];
    const poolSpec = { ice: { x0: 6.6, x1: 11.1, z0: -9.0, z1: -6.55, y: 0.52 }, water: { x0: 6.6, x1: 11.1, z0: -5.95, z1: -3.15, y: 0.33 }, avoid: { x: 10.4, z: -8.4, r: 0.95 } };
    const penguins = [0, 1, 2].map((i) => new Penguin(poolSpec, i + 1));
    const tortoise = new Tortoise({ x0: GARDEN.x0 + 0.55, x1: GARDEN.x1 - 0.55, z0: GARDEN.z0 + 0.5, z1: GARDEN.z1 - 0.5 });
    const butterflies = [
      new Butterfly('#ffb4d0', { x0: -8.5, x1: 3.5, z0: -8.0, z1: -4.2, y: 3.0 }, 1),
      new Butterfly('#b9a4ff', { x0: GARDEN.x0, x1: GARDEN.x1, z0: GARDEN.z0, z1: GARDEN.z1, y: 1.0 }, 2),
    ];
    for (const a of [...giraffes, ...flamingos, ...penguins, tortoise, ...butterflies]) {
      group.add(a.holder);
      dynamic.push(a.holder);
    }

    // The zoo keeper: a regular character, drawn as one skinned mesh
    const keeper = ctx.makeKid(KEEPER_LOOK);
    const hat = new THREE.Group();
    const khaki = mat('#e8d39a', { rough: 0.8 });
    const brim = mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.035, 20), khaki);
    brim.position.y = 0.5;
    const crown = mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.2, 18), khaki);
    crown.position.y = 0.6;
    const band = mesh(new THREE.CylinderGeometry(0.305, 0.305, 0.05, 18), mat('#7a9a4f'));
    band.position.y = 0.54;
    hat.add(brim, crown, band);
    hat.rotation.x = -0.12;
    keeper.head.add(hat);
    skinify(keeper.root, { rough: 0.6 });
    group.add(keeper.root);
    dynamic.push(keeper.root);
    const kp = { pos: new THREE.Vector3(ROUTE[0].x, 0, ROUTE[0].z), yaw: Math.PI, idx: 0, wait: 2, speed: 0, talk: 0, turn: 0, waved: 0 };
    colliders.push({ type: 'circle', x: kp.pos.x, z: kp.pos.z, r: 0.3, tag: 'zoo-keeper' });
    colliders.push({ type: 'circle', x: tortoise.pos.x, z: tortoise.pos.z, r: 0.36, h: 0.36, tag: 'zoo-tortoise' });

    // A little visitor with a giraffe balloon, watching from the end of the fence
    const visitor = ctx.makeKid(VISITOR_LOOK);
    visitor.root.scale.setScalar(0.8);
    const balloonPivot = new THREE.Group();
    balloonPivot.position.set(0, -0.27, 0);
    const str = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.8, 4), mat('#ffffff'));
    str.position.y = 0.4;
    const balloon = mesh(new THREE.SphereGeometry(0.17, 16, 12), mat('#ffc15e', { rough: 0.35 }));
    balloon.position.y = 0.95;
    balloon.scale.set(1, 1.15, 1);
    balloonPivot.add(str, balloon);
    for (const [bx, by, bz, r] of [[0.08, 1.02, 0.12, 0.05], [-0.1, 0.92, 0.11, 0.04], [0.02, 0.85, 0.15, 0.035], [-0.04, 1.1, 0.09, 0.03]]) {
      const sp = mesh(new THREE.SphereGeometry(r, 8, 6), mat('#c9772e'));
      sp.position.set(bx, by, bz);
      sp.scale.set(1, 1, 0.35);
      sp.lookAt(0, 0.95, 0.6);
      balloonPivot.add(sp);
    }
    visitor.arms[0].add(balloonPivot);
    // A plaster on her knee, hidden until Doctor Roji puts it on
    const plaster = mesh(new THREE.BoxGeometry(0.075, 0.035, 0.02), mat('#fff0c9'));
    plaster.position.set(0, -0.12, 0.054);
    const plasterDot = mesh(new THREE.SphereGeometry(0.008, 6, 4), mat('#e38e3d'));
    plasterDot.position.set(0.015, 0, 0.011);
    plaster.add(plasterDot);
    visitor.legs[0].add(plaster);
    // Her blob shadow is enough; no shadow-map pass for a small extra character
    for (const m of skinify(visitor.root, { rough: 0.6 })) m.castShadow = false;
    // Bound at full size; scaled to nothing until it is put on
    if (!ctx.api.load('plaster', false)) plaster.scale.setScalar(0.001);
    group.add(visitor.root);
    dynamic.push(visitor.root);
    const vs = { pos: new THREE.Vector3(5.55, 0, -1.15), yaw: -2.3, waved: -99, near: false };
    visitor.root.position.copy(vs.pos);
    colliders.push({ type: 'circle', x: vs.pos.x, z: vs.pos.z, r: 0.26 });

    // Jouri's golden leaf crown and the champions' rosette, once Leaf Catch earns three stars
    const leafCrown = makeCrown();
    leafCrown.position.set(0, 0.38, -0.03);
    leafCrown.visible = false;
    jouri.head.add(leafCrown);
    const rosette = atlas.plane('champion', 0.3, 0.3);
    rosette.position.set(2.06, 1.36, -2.39);
    rosette.visible = false;
    group.add(rosette);
    dynamic.push(rosette);
    const champion = () => {
      try {
        return JSON.parse(localStorage.getItem('roji-arena-giraffes-crown') || 'false') === true;
      } catch {
        return false;
      }
    };

    // Little puffs: sneezes, sighs and leaf crumbs. One instanced mesh, scaled to zero when idle.
    const PUFFS = 24;
    const puffMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), util.umat('#ffffff', { rough: 0.9 }), PUFFS);
    puffMesh.castShadow = false;
    puffMesh.frustumCulled = false;
    const puffs = Array.from({ length: PUFFS }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 0.1 }));
    const m4 = new THREE.Matrix4();
    const col = new THREE.Color();
    const q0 = new THREE.Quaternion();
    puffs.forEach((_, i) => {
      puffMesh.setMatrixAt(i, m4.makeScale(0, 0, 0));
      puffMesh.setColorAt(i, col.set('#ffffff'));
    });
    let puffNext = 0;
    const puff = (local, color, n, spread, size, up = 0.3) => {
      for (let i = 0; i < n; i++) {
        const k = puffNext;
        puffNext = (puffNext + 1) % PUFFS;
        const p = puffs[k];
        p.life = 1;
        p.p.copy(local);
        p.v.set((Math.random() - 0.5) * spread, up + Math.random() * 0.4, (Math.random() - 0.5) * spread + spread * 0.4);
        p.s = size * (0.7 + Math.random() * 0.6);
        puffMesh.setColorAt(k, col.set(color));
      }
      puffMesh.instanceColor.needsUpdate = true;
    };
    group.add(puffMesh);
    dynamic.push(puffMesh);

    // ------------------------------------------------ sound
    const api0 = ctx.api;
    const tone = (f, delay, dur, o) => {
      const S = api0.sound;
      const c = S?.ctx;
      if (!c || S.muted) return;
      S.tone(f, c.currentTime + delay, dur, o);
    };
    const SFX = {
      hum: () => {
        tone(196, 0, 0.55, { gain: 0.07, slideTo: 174 });
        tone(98, 0.02, 0.6, { type: 'triangle', gain: 0.04 });
      },
      giggle: () => [0, 0.09, 0.18].forEach((d, i) => tone(640 + i * 90, d, 0.08, { type: 'triangle', gain: 0.05, slideTo: 780 + i * 90 })),
      blep: () => tone(520, 0, 0.12, { gain: 0.07, slideTo: 900 }),
      boing: () => tone(280, 0, 0.18, { gain: 0.06, slideTo: 620 }),
      ahh: () => {
        tone(500, 0.0, 0.25, { type: 'triangle', gain: 0.035, slideTo: 640, attack: 0.05 });
        tone(560, 0.45, 0.3, { type: 'triangle', gain: 0.04, slideTo: 760, attack: 0.05 });
      },
      sneeze: () => {
        tone(1100, 0, 0.28, { type: 'sawtooth', gain: 0.045, slideTo: 160 });
        tone(700, 0.02, 0.22, { type: 'square', gain: 0.025, slideTo: 120 });
      },
      sigh: () => tone(330, 0, 1.0, { gain: 0.05, slideTo: 150, attack: 0.2 }),
      munch: () => [0, 0.12].forEach((d) => tone(190, d, 0.06, { type: 'square', gain: 0.025, slideTo: 120 })),
      gulp: () => tone(300, 0, 0.22, { gain: 0.08, slideTo: 90 }),
      lick: () => tone(950, 0, 0.16, { gain: 0.06, slideTo: 380 }),
      shutter: () => {
        tone(2400, 0, 0.04, { type: 'square', gain: 0.04 });
        tone(1500, 0.07, 0.05, { type: 'square', gain: 0.035 });
      },
      honk: () => [0, 0.18, 0.36].forEach((d) => tone(430, d, 0.13, { type: 'sawtooth', gain: 0.03, slideTo: 370 })),
      squeak: () => [0, 0.12, 0.24].forEach((d, i) => tone(1150 + i * 180, d, 0.07, { gain: 0.05, slideTo: 1450 + i * 180 })),
      pop: () => tone(480, 0, 0.12, { gain: 0.07, slideTo: 900 }),
    };
    const say = (kind) => SFX[kind]?.();

    // ------------------------------------------------ helpers
    const tmpV = new THREE.Vector3();
    let playerLocal = new THREE.Vector3(0, 0, 20);
    const name = (api, who) => (who === 'partner' ? api.partner : api.player).kid.name;
    const near = (g) => Math.hypot(g.pos.x - playerLocal.x, g.pos.z - playerLocal.z);
    const timers = [];
    const later = (sec, fn) => timers.push({ t: sec, fn });
    let scene = null;

    for (const g of giraffes) {
      g.hooks = {
        say: (gg, kind) => {
          if (gg.script || near(gg) < 13) say(kind);
        },
        fx: (gg, kind) => {
          const m = gg.localOf(gg.mouthAnchor, new THREE.Vector3());
          const fwd = new THREE.Vector3(Math.sin(gg.yaw), 0, Math.cos(gg.yaw));
          if (kind === 'sneeze') puff(m.addScaledVector(fwd, 0.15), '#ffffff', 9, 1.2, 0.09, 0.2);
          if (kind === 'breath') puff(m.addScaledVector(fwd, 0.1), '#f4fbff', 3, 0.3, 0.06, 0.1);
        },
      };
    }

    const randomSpot = (self) => () => {
      const other = self === jodi ? jouri : jodi;
      for (let k = 0; k < 40; k++) {
        const x = GB.x0 + Math.random() * (GB.x1 - GB.x0);
        const z = GB.z0 + Math.random() * (GB.z1 - GB.z0);
        if (OBSTACLES.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 0.4)) continue;
        if (Math.hypot(x - other.pos.x, z - other.pos.z) < (other.script ? 3.2 : 2)) continue;
        if (Math.hypot(x - self.pos.x, z - self.pos.z) < 2) continue;
        return { x, z };
      }
      return { x: self.pos.x, z: self.pos.z };
    };
    const envs = giraffes.map((g) => ({
      other: g === jodi ? jouri : jodi,
      playerHead: new THREE.Vector3(),
      playerNear: 99,
      atFence: false,
      randomSpot: randomSpot(g),
      tree: TREE,
      butterfly: butterflies[0].pos,
      fencePoint: () => ({ x: clamp(playerLocal.x, GB.x0 + 0.5, GB.x1 - 0.3), z: -3.8 }),
      onSilly: g === jouri ? () => {
        if (!jodi.script && ['stand', 'nod', 'stroll'].includes(jodi.beh?.name) && Math.hypot(jodi.pos.x - jouri.pos.x, jodi.pos.z - jouri.pos.z) < 9 && Math.random() < 0.6) jodi.trigger('sigh', 3);
        if (!scene && Math.hypot(vs.pos.x - jouri.pos.x, vs.pos.z - jouri.pos.z) < 11 && Math.random() < 0.55) visitor.emote('cheer');
      } : null,
    }));

    // Leaf bunch held during feeding: a twig and three clusters that disappear bite by bite
    function makeLeaves() {
      const root = new THREE.Group();
      const twig = mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.3, 5), mat('#8b5e3c'));
      twig.position.set(0, 0.0, 0);
      twig.rotation.x = 0.5;
      root.add(twig);
      const clusters = [];
      for (let c = 0; c < 3; c++) {
        const cl = new THREE.Group();
        for (let k = 0; k < 3; k++) {
          const leaf = mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(k % 2 ? '#6dbb58' : '#8bd16a'));
          leaf.scale.set(0.7, 0.3, 1.3);
          const a = (k / 3) * Math.PI * 2 + c;
          leaf.position.set(Math.cos(a) * 0.05, 0.02 * k, Math.sin(a) * 0.05);
          leaf.rotation.set(0.3 * k, a, 0.4);
          cl.add(leaf);
        }
        cl.position.set((c - 1) * 0.07, 0.12 + (c === 1 ? 0.05 : 0), 0.05 + Math.abs(c - 1) * -0.02);
        root.add(cl);
        clusters.push(cl);
      }
      return { root, clusters };
    }

    // Seat both kids (activity) and run a scene until it ends or the player walks away
    function begin(api, spec, sceneDef) {
      api.activity({ ...spec, onEnd: () => finish() });
      scene = { t: 0, api, ...sceneDef };
      return scene;
    }
    function finish() {
      if (!scene) return;
      const s = scene;
      scene = null;
      s.cleanup?.();
    }
    const kidsOnDeck = (api) => {
      for (const a of [api.player, api.partner]) {
        a.y = DECK.h;
        a.vy = 0;
      }
    };
    const freeGiraffe = (g) => {
      g.script = null;
      g.dest = null;
      g.faceYaw = null;
      g.beh = null;
    };
    const faceOf = (x, z, y, yaw, out = new THREE.Vector3()) => out.set(x + Math.sin(yaw) * 0.46, y + 1.08, z + Math.cos(yaw) * 0.46);

    // ------------------------------------------------ Feed Jodi / Feed Jouri
    function feed(api, G) {
      if (scene) return;
      const isJodi = G === jodi;
      const side = isJodi ? -1 : 1;
      const kx = isJodi ? -3.7 : -2.3;
      const kz = -2.05;
      const yaw = side < 0 ? -Math.PI / 2 - 0.2 : Math.PI / 2 + 0.2;
      const leavesAt = new THREE.Vector3(kx + Math.sin(yaw) * 0.47, DECK.h + 0.84, kz + Math.cos(yaw) * 0.47);
      const target = leavesAt.clone().add(new THREE.Vector3(0, 0.02, -0.1));
      const face = faceOf(kx, kz, DECK.h, yaw);
      const leaves = makeLeaves();
      const pn = name(api);
      const s = begin(
        api,
        {
          label: 'Step back',
          seats: [
            { who: 'player', x: kx, z: kz, y: DECK.h, yaw, pose: 'stand', hands: 'carry' },
            { who: 'partner', x: kx - side * 0.85, z: kz + 0.25, y: DECK.h, yaw: yaw - side * 0.3, pose: 'stand' },
          ],
          focus: { x: (leavesAt.x + kx) / 2, z: leavesAt.z - 0.55, y: 2.5, zoom: 0.44 },
        },
        { phase: 'walk', k: 0, done: {} },
      );
      const kid = api.player.kid;
      const prev = api.carry('player', leaves.root);
      kid.carryAnchor.position.set(0, 0.72, 0.42);
      s.kid = kid;
      s.cleanup = () => {
        kid.carryAnchor.position.set(0, 0.5, 0.3);
        api.carry('player', prev || null);
        kidsOnDeck(api);
        freeGiraffe(G);
      };
      s.arms = () => {
        if (!leaves.root.parent) return;
        kid.arms[0].rotation.set(-1.75, 0, -0.28);
        kid.arms[1].rotation.set(-1.75, 0, 0.28);
      };
      const once = (key, fn) => {
        if (!s.done[key]) {
          s.done[key] = true;
          fn();
        }
      };
      const bite = (i) => {
        leaves.clusters[i].visible = false;
        say('munch');
        puff(leavesAt, '#7fcf5c', 3, 0.5, 0.035, 0.6);
      };
      const dropLeaves = () => {
        if (leaves.root.parent) api.carry('player', prev || null);
        kid.carryAnchor.position.set(0, 0.5, 0.3);
      };
      G.beh = null;
      G.script = {
        step(g, dt) {
          s.k += dt;
          if (s.phase === 'walk') {
            if (!s.walking) {
              s.walking = true;
              const far = Math.hypot(g.pos.x - target.x, g.pos.z + 4.35) / 4;
              g.goTo(target.x, -4.35, g.cfg.walk * clamp(far, isJodi ? 1.5 : 1.9, 2.4));
            }
            g.lookAt = target;
            g.T.ear = -0.05;
            if (!isJodi) g.A.y = Math.abs(Math.sin(s.k * 7)) * 0.05;
            if (g.arrived || s.k > 12) {
              if (!g.arrived) g.pos.set(target.x, 0, -4.35);
              g.dest = null;
              s.sol = g.solve(target, { pitch: 0.32 });
              s.phase = 'reach';
              s.k = 0;
            }
            return;
          }
          g.faceYaw = 0;
          g.pos.x = damp(g.pos.x, s.sol.x, 3, dt);
          g.pos.z = damp(g.pos.z, s.z ?? s.sol.z, 3, dt);
          g.T.reach = s.reach ?? s.sol.r;
          g.T.pitch = s.pitch ?? s.sol.pitch;
          g.T.twist = 0;
          g.T.roll = 0;
          if (s.phase === 'reach') {
            g.T.lid = isJodi ? 0.45 : 0;
            g.R.reach = isJodi ? 2.4 : 4;
            if (s.k > (isJodi ? 1.7 : 1.1)) {
              s.phase = 'eat';
              s.k = 0;
            }
          } else if (s.phase === 'eat' && isJodi) {
            // Three neat little bites, eyes closed while chewing
            const bites = [0.3, 1.8, 3.3];
            let tg = 0;
            bites.forEach((b, i) => {
              tg = Math.max(tg, 0.7 * (s.k > b - 0.3 && s.k < b + 0.3 ? Math.sin(((s.k - b + 0.3) / 0.6) * Math.PI) : 0));
              if (s.k > b) once(`b${i}`, () => bite(i));
            });
            g.T.tongue = tg;
            g.T.chew = s.k > 0.5 ? 0.9 : 0;
            g.T.lid = tg > 0.1 ? 0.45 : 0.85;
            if (s.k > 4.3) {
              s.phase = 'thanks';
              s.k = 0;
            }
          } else if (s.phase === 'thanks' && isJodi) {
            s.reach = s.sol.r * 0.35;
            s.pitch = JODI.rest.pitch;
            g.lookAt = face;
            g.T.browL = 0.5;
            g.T.browR = 0.9;
            g.T.lid = 0.3;
            g.T.chew = 0.4;
            g.A.pitch += Math.sin(s.k * 6.5) * 0.22 * (s.k > 0.6 && s.k < 2.0 ? 1 : 0);
            once('thanks', () => {
              dropLeaves();
              say('hum');
              api.toast(`Jodi takes three neat little bites and nods. <b>Thank you, ${pn}.</b>`, 3200);
              api.fx.heartsAt(g.worldOf(g.head), 2);
              api.emote('partner', 'cheer');
            });
            if (s.k > 3.2) api.endActivity();
          } else if (s.phase === 'eat') {
            // Jouri gobbles everything at once
            g.T.tongue = 1.15;
            g.A.tWag = Math.sin(s.k * 16) * 0.35;
            g.T.chew = 1;
            g.T.lid = 0.2;
            g.A.ear = Math.sin(s.k * 14) * 0.3;
            [0.2, 0.45, 0.7].forEach((b, i) => s.k > b && once(`b${i}`, () => bite(i)));
            if (s.k > 0.95) {
              once('gulp', () => {
                say('gulp');
                dropLeaves();
                puff(leavesAt, '#7fcf5c', 6, 1, 0.04, 0.8);
                s.sol2 = g.solve(face, { pitch: 0.12, maxZ: -3.4 });
              });
              s.phase = 'lick';
              s.k = 0;
            }
          } else if (s.phase === 'lick') {
            s.reach = s.sol2.r;
            s.z = s.sol2.z;
            s.pitch = s.sol2.pitch;
            g.R.reach = 3.5;
            const licking = s.k > 0.8 && s.k < 2.0;
            g.T.tongue = licking ? 1.5 : 0.2;
            g.T.tCurl = licking ? 0.3 + Math.sin((s.k - 0.8) * 9) * 0.55 : 0;
            g.T.lid = 0.75;
            g.T.tail = 0.9;
            g.A.ear = Math.sin(s.k * 10) * 0.3;
            for (const [key, at] of [['l1', 1.0], ['l2', 1.55]]) {
              if (s.k > at)
                once(key, () => {
                  say('lick');
                  kid.squash = 0.82;
                  if (key === 'l1') {
                    api.toast(`Jouri gobbles every leaf, then gives ${pn} a big lick!`, 3200);
                    api.fx.heartsAt(kid.head.localToWorld(new THREE.Vector3(0, 0.55, 0)), 4);
                    later(0.25, () => say('giggle'));
                  }
                });
            }
            if (s.k > 2.3) {
              s.phase = 'happy';
              s.k = 0;
            }
          } else if (s.phase === 'happy') {
            s.reach = 0.15;
            s.z = s.sol.z - 0.3;
            s.pitch = 0;
            g.lookAt = face;
            const hopK = s.k < 2 ? Math.abs(Math.sin(s.k * 5)) : 0;
            g.A.y = hopK * 0.28;
            g.A.tuck = hopK;
            g.A.ear = hopK * 0.5;
            g.T.tail = 0.9;
            g.T.tongue = 0.6;
            g.T.wink = 1;
            once('emote', () => {
              api.emote('player', 'heart');
              api.emote('partner', 'cheer');
            });
            if (s.k > 2.6) api.endActivity();
          }
        },
      };
    }

    // ------------------------------------------------ Pet Jodi / Pet Jouri (at the fence, on the ground)
    function petSpot(G) {
      let x = clamp(G.pos.x, -10.4, 4.0);
      if (x > DECK.x0 - 0.55 && x < DECK.x1 + 0.55) x = x < (DECK.x0 + DECK.x1) / 2 ? DECK.x0 - 0.55 : DECK.x1 + 0.55;
      if (Math.abs(x - PHOTO.x) < 0.3) x = PHOTO.x - 0.3;
      return { x, z: -1.8 };
    }
    function pet(api, G) {
      if (scene) return;
      const isJodi = G === jodi;
      const spot = petSpot(G);
      const side = G.pos.x >= spot.x ? 1 : -1;
      const kx = spot.x;
      const kz = -2.08;
      const yaw = Math.PI - 1.0 * side;
      const face = faceOf(kx, kz, 0, yaw);
      const target = new THREE.Vector3(kx + Math.sin(yaw) * 0.5, 1.42, kz + Math.cos(yaw) * 0.5 - 0.05);
      const pn = name(api);
      const s = begin(
        api,
        {
          label: 'Step back',
          seats: [
            { who: 'player', x: kx, z: kz, y: 0, yaw, pose: 'stand', hands: 'hold' },
            { who: 'partner', x: kx - side * 0.8, z: kz + 0.35, y: 0, yaw: yaw + side * 0.35, pose: 'stand' },
          ],
          focus: { x: kx + side * 0.3, z: kz - 0.8, y: 1.6, zoom: 0.5 },
        },
        { phase: 'walk', k: 0, done: {} },
      );
      const kid = api.player.kid;
      const once = (key, fn) => !s.done[key] && ((s.done[key] = true), fn());
      s.cleanup = () => freeGiraffe(G);
      s.arms = (t) => {
        if (s.phase !== 'pet') return;
        kid.arms[1].rotation.set(-2.25 + Math.sin(t * 7) * 0.18, 0, 0.12 + Math.sin(t * 7) * 0.15);
      };
      G.beh = null;
      G.script = {
        step(g, dt) {
          s.k += dt;
          if (s.phase === 'walk') {
            if (!s.walking) {
              s.walking = true;
              const far = Math.hypot(g.pos.x - target.x, g.pos.z + 4.3) / 4;
              g.goTo(target.x, -4.3, g.cfg.walk * clamp(far, isJodi ? 1.5 : 1.9, 2.4));
            }
            g.lookAt = face;
            if (g.arrived || s.k > 12) {
              if (!g.arrived) g.pos.set(target.x, 0, -4.3);
              g.dest = null;
              s.sol = g.solve(target, { pitch: 0.18, maxZ: -3.45 });
              s.phase = 'reach';
              s.k = 0;
            }
            return;
          }
          g.faceYaw = 0;
          g.pos.x = damp(g.pos.x, s.sol.x, 3, dt);
          g.pos.z = damp(g.pos.z, s.sol.z, 3, dt);
          g.T.reach = s.phase === 'bye' ? s.sol.r * 0.3 : s.sol.r;
          g.T.pitch = s.sol.pitch;
          g.T.twist = 0;
          if (s.phase === 'reach') {
            if (s.k > 1.6) {
              s.phase = 'pet';
              s.k = 0;
            }
          } else if (s.phase === 'pet' && isJodi) {
            g.T.lid = 0.92;
            g.T.ear = 0.6;
            g.T.browL = g.T.browR = 0.2;
            g.A.pitch = Math.sin(s.k * 2.2) * 0.05;
            once('t', () => {
              say('hum');
              api.toast('Jodi allows exactly three pats. <b>Very dignified.</b>', 3000);
            });
            if (s.k > 3.2) {
              s.phase = 'bye';
              s.k = 0;
            }
          } else if (s.phase === 'pet') {
            // Jouri nuzzles: rubs her head side to side, happy eyes, a lick at the end
            g.A.yaw = Math.sin(s.k * 5) * 0.32;
            g.A.roll = Math.sin(s.k * 5 + 1) * 0.28;
            g.A.z = Math.sin(s.k * 5) * 0.04;
            g.T.lid = 0.85;
            g.A.ear = Math.sin(s.k * 10) * 0.4;
            g.T.tail = 0.9;
            g.T.tongue = s.k > 2.6 && s.k < 3.4 ? 1.2 : 0;
            if (Math.floor(s.k / 0.6) !== s.lastBump) {
              s.lastBump = Math.floor(s.k / 0.6);
              kid.squash = 0.9;
            }
            once('t', () => {
              say('giggle');
              api.toast(`Jouri nuzzles ${pn} and will not let go.`, 3000);
            });
            once('h', () => api.fx.heartsAt(g.worldOf(g.head), 3));
            if (s.k > 2.8) once('lick', () => {
              say('lick');
              api.fx.heartsAt(kid.head.localToWorld(new THREE.Vector3(0, 0.55, 0)), 3);
            });
            if (s.k > 3.8) {
              s.phase = 'bye';
              s.k = 0;
            }
          } else if (s.phase === 'bye') {
            g.lookAt = face;
            g.T.pitch = G.cfg.rest.pitch;
            if (isJodi) {
              g.T.browR = 1;
              g.A.pitch += Math.sin(s.k * 6.5) * 0.2 * (s.k > 0.3 && s.k < 1.7 ? 1 : 0);
            } else {
              g.T.wink = 1;
              g.T.tongue = 0.8;
            }
            once('emote', () => api.emote('player', isJodi ? 'bow' : 'heart'));
            if (s.k > 2.2) api.endActivity();
          }
        },
      };
    }

    // ------------------------------------------------ Take a photo (Jouri photobombs)
    function photo(api) {
      if (scene) return;
      const pn = name(api);
      const qn = name(api, 'partner');
      const s = begin(
        api,
        {
          label: 'Step away',
          seats: [
            { who: 'player', x: PHOTO.x - 0.5, z: PHOTO.z, y: 0, yaw: 0.15, pose: 'stand' },
            { who: 'partner', x: PHOTO.x + 0.5, z: PHOTO.z + 0.05, y: 0, yaw: -0.15, pose: 'stand', hands: 'wave2' },
          ],
          focus: { x: PHOTO.x, z: PHOTO.z - 1.25, y: 2.1, zoom: 0.62 },
        },
        { phase: 'gather', k: 0, done: {}, placed: new Set() },
      );
      const once = (key, fn) => !s.done[key] && ((s.done[key] = true), fn());
      const cam = new THREE.Vector3(PHOTO.x, 3, 8);
      const bombAt = new THREE.Vector3(PHOTO.x, 1.6, PHOTO.z - 0.02);
      s.cleanup = () => {
        freeGiraffe(jouri);
        freeGiraffe(jodi);
        if (s.done.flash) jodi.trigger('sigh', 3);
      };
      for (const g of giraffes) g.beh = null;
      const stand = { jodi: { x: PHOTO.x - 1.35, z: -4.0 }, jouri: { x: PHOTO.x + 0.02, z: -4.7 } };
      const control = (g, dt) => {
        const isJodi = g === jodi;
        const st = isJodi ? stand.jodi : stand.jouri;
        if (s.phase === 'gather') {
          if (!s.placed.has(g)) {
            s.placed.add(g);
            g.goTo(st.x, st.z, g.cfg.walk * (isJodi ? 2.0 : 2.1));
          }
          g.lookAt = cam;
          return;
        }
        g.faceYaw = 0;
        g.pos.x = damp(g.pos.x, s.bomb && !isJodi && s.phase === 'bomb' ? s.bomb.x : st.x, 3, dt);
        if (isJodi) {
          g.T.lean = 0.1;
          g.T.pitch = -0.26;
          g.T.lid = 0.55;
          g.T.browR = 1;
          g.T.browL = 0.3;
          if (s.phase === 'after') {
            g.lookAt = g.localOf(jouri.head, tmpV.clone());
            g.T.lid = s.k > 0.6 ? 0.95 : 0.6;
            once('sigh', () => later(0.6, () => say('sigh')));
          }
        } else if (s.phase === 'pose') {
          g.T.pitch = -0.12;
          g.T.roll = 0.22;
          g.T.twist = 0.55;
          g.T.lid = 0.1;
          g.T.tail = 0.6;
        } else if (s.phase === 'bomb') {
          g.R.reach = 7;
          g.T.reach = s.bomb.r;
          g.pos.z = damp(g.pos.z, s.bomb.z, 6, dt);
          g.T.pitch = s.bomb.pitch;
          g.T.twist = 0;
          g.T.tongue = 1.15;
          g.T.wink = 1;
          g.T.roll = 0.32;
          g.T.ear = -0.12;
          g.A.tWag = Math.sin(s.t * 12) * 0.3;
        } else if (s.phase === 'after') {
          g.T.reach = 0;
          g.pos.z = damp(g.pos.z, st.z, 2, dt);
          g.T.twist = -0.7;
          g.T.pitch = -0.3;
          g.T.lid = 0.3;
          g.T.tail = 0.8;
        }
      };
      jodi.script = { step: control };
      jouri.script = { step: control };
      s.step = (dt) => {
        s.k += dt;
        s.t += dt;
        if (s.phase === 'gather' && ((jodi.arrived && jouri.arrived && s.placed.size === 2) || s.k > 4.5)) {
          s.phase = 'pose';
          s.k = 0;
        } else if (s.phase === 'pose') {
          once('3', () => {
            api.toast('Say cheese! <b>3</b>', 900);
            api.sound?.ui?.('tick');
          });
          if (s.k > 0.9) once('2', () => (api.toast('Say cheese! <b>2</b>', 900), api.sound?.ui?.('tick')));
          if (s.k > 1.8) {
            once('1', () => (api.toast('Say cheese! <b>1</b>', 900), api.sound?.ui?.('tick')));
            jodi.dest = null;
            jouri.dest = null;
            s.bomb = jouri.solve(bombAt, { pitch: -0.32, maxZ: -3.35 });
            s.phase = 'bomb';
            s.k = 0;
            api.emote('player', 'cheer');
          }
        } else if (s.phase === 'bomb') {
          if (s.k > 0.75)
            once('flash', () => {
              flash();
              say('shutter');
              say('giggle');
            });
          if (s.k > 1.1) {
            const n = (api.load('photos', 0) || 0) + 1;
            api.save('photos', n);
            api.toast(`Click! Jodi posed perfectly. <b>Jouri photobombed again.</b> Photo ${n} of ${pn} and ${qn}.`, 3600);
            s.phase = 'after';
            s.k = 0;
          }
        } else if (s.phase === 'after' && s.k > 2.8) api.endActivity();
      };
    }

    function flash() {
      if (typeof document === 'undefined') return;
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0.92;pointer-events:none;z-index:60;transition:opacity 0.7s ease-out';
      document.body.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => (el.style.opacity = '0')));
      setTimeout(() => el.remove(), 900);
    }

    // ------------------------------------------------ the small friends
    function talk(api) {
      const pn = name(api);
      const qn = name(api, 'partner');
      const i = (api.load('fact', 0) || 0) % FACTS.length;
      api.save('fact', i + 1);
      kp.talk = 4.5;
      keeper.emote('wave');
      api.toast(`<b>Keeper:</b> ${FACTS[i](pn, qn, api.playerId)}`, 4200);
      say('pop');
    }

    function sitBench(api) {
      const B = BENCHES[0];
      api.activity({
        label: 'Get up',
        seats: [
          { who: 'player', x: B.x - 0.38, z: B.z + 0.02, y: 0.14, yaw: 0, pose: 'sit' },
          { who: 'partner', x: B.x + 0.38, z: B.z + 0.02, y: 0.14, yaw: 0, pose: 'sit' },
        ],
        focus: { x: B.x, z: B.z - 0.6, y: 1.0, zoom: 0.5 },
        exit: { x: B.x - 0.4, z: B.z + 0.85 },
      });
      later(0.6, () => api.toast(`${name(api)} and ${name(api, 'partner')} rest on the bench and listen to the zoo.`, 2600));
    }

    // ------------------------------------------------ NPCs watching the scenes
    let watchAt = null;
    let party = false;
    const npcNear = (p) => Math.hypot(p.x - playerLocal.x, p.z - playerLocal.z) < 12;
    function watch(kind, at) {
      if (kind === 'look') watchAt = at ? at.clone() : null;
      else if (kind === 'done') {
        watchAt = null;
        if (party) {
          party = false;
          for (const k of [keeper, visitor]) {
            k.danceLoop = false;
            k.cancelEmote();
          }
        }
      } else if (kind === 'dance') {
        party = true;
        for (const [k, p] of [[keeper, kp.pos], [visitor, vs.pos]]) {
          if (!npcNear(p)) continue;
          k.danceLoop = true;
          k.emote('dance');
        }
      } else {
        // cheer or laugh
        if (npcNear(kp.pos) && kp.speed < 0.3) later(0.3, () => keeper.emote(kind === 'laugh' ? 'spin' : 'cheer'));
        if (npcNear(vs.pos)) later(0.15, () => visitor.emote('cheer'));
      }
    }

    // ------------------------------------------------ the new activities (zoo/acts.js)
    const Z = {
      atlas,
      group,
      dynamic,
      jodi,
      jouri,
      giraffes,
      puff,
      say,
      tone,
      later,
      begin,
      get scene() {
        return scene;
      },
      name,
      freeGiraffe,
      watch,
      kidsOnDeck,
      api0,
    };
    const acts = makeActs(Z);
    let choosing = false;
    async function chooseTreat(api, G) {
      if (scene || choosing) return;
      choosing = true;
      const jo = G === jodi;
      const id = await api.choose({
        title: `A treat for ${G.name}`,
        text: jo ? 'Jodi likes her food neat.' : 'Jouri likes everything, very fast.',
        options: [
          { id: 'leaves', label: 'Acacia leaves', sub: 'Their favourite' },
          { id: 'carrot', label: 'A carrot', sub: 'Crunchy' },
          { id: 'lettuce', label: 'Lettuce', sub: 'Fresh and leafy' },
        ],
      });
      choosing = false;
      if (!id || scene) return;
      if (id === 'leaves') feed(api, G);
      else acts.feedTreat(api, G, id);
    }

    // The gift shop: Homama buys Roji the baby giraffe (and other small kindnesses on later visits)
    function giftShop(api) {
      if (scene) return;
      const n = (api.load('shop', 0) || 0) + 1;
      api.save('shop', n);
      const kx = SHOP.x;
      const kz = SHOP.z + 0.95;
      const homamaIsPlayer = api.playerId === 'homama';
      const s = begin(
        api,
        {
          label: 'Leave the shop',
          seats: [
            { who: 'homama', x: kx + (homamaIsPlayer ? -0.4 : 0.4), z: kz, y: 0, yaw: Math.PI, pose: 'stand' },
            { who: 'roji', x: kx + (homamaIsPlayer ? 0.4 : -0.4), z: kz + 0.1, y: 0, yaw: Math.PI, pose: 'stand' },
          ],
          focus: { x: kx, z: kz - 0.5, y: 1.3, zoom: 0.5 },
        },
        { k: 0, done: {} },
      );
      const H = api.homama;
      const R = api.roji;
      const plush = makePlush();
      bakeColors(plush);
      plush.scale.setScalar(1.3);
      const v = n % 2 === 1 ? 'plush' : 'keyring';
      s.step = (dt) => {
        s.k += dt;
        const once = (key, fn) => !s.done[key] && ((s.done[key] = true), fn());
        if (v === 'plush') {
          if (s.k > 0.8) once('buy', () => {
            say('pop');
            api.sound?.ui?.('coin');
            api.carry(H, plush);
            plush.position.set(0, 0.02, 0);
          });
          if (s.k > 1.5) {
            const hp = api.localPos(H);
            const rp = api.localPos(R);
            H.yaw = util.dampAngle(H.yaw, Math.atan2(rp.x - hp.x, rp.z - hp.z), 8, dt);
            R.yaw = util.dampAngle(R.yaw, Math.atan2(hp.x - rp.x, hp.z - rp.z), 8, dt);
            H.kid.root.rotation.y = H.yaw;
            R.kid.root.rotation.y = R.yaw;
          }
          if (s.k > 2.4) once('give', () => {
            H.kid.carry(null);
            api.carry(R, plush);
            api.emote(R, 'heart');
            api.fx.heartsAt(R.kid.root.localToWorld(new THREE.Vector3(0, 1.6, 0)), 4);
            api.toast(n === 1 ? 'Homama buys Roji the baby giraffe from the gift shop. <b>She hugs it straight away.</b>' : 'Homama buys Roji another baby giraffe, so the first one is not lonely.', 3600);
          });
        } else {
          if (s.k > 0.8) once('buy', () => {
            api.sound?.ui?.('coin');
            api.emote(R, 'wave');
          });
          if (s.k > 1.8) once('give', () => {
            api.emote(H, 'heart');
            api.toast('Roji buys Homama a little giraffe keyring. <b>He clips it on straight away.</b>', 3400);
          });
        }
        if (s.k > 5) api.endActivity();
      };
    }

    // Say hello to the little visitor: Doctor Roji has plasters, Homama has jokes
    function hello(api) {
      if (scene) return;
      const n = (api.load('hello', 0) || 0) + 1;
      api.save('hello', n);
      const yaw = Math.atan2(vs.pos.x - (vs.pos.x - 0.6), vs.pos.z - (vs.pos.z + 0.35));
      const s = begin(
        api,
        {
          label: 'Say goodbye',
          seats: [
            { who: 'player', x: vs.pos.x - 0.6, z: vs.pos.z + 0.35, y: 0, yaw, pose: 'stand' },
            { who: 'partner', x: vs.pos.x - 1.3, z: vs.pos.z + 0.75, y: 0, yaw: yaw - 0.2, pose: 'stand' },
          ],
          focus: { x: vs.pos.x - 0.5, z: vs.pos.z, y: 1.0, zoom: 0.45 },
        },
        { k: 0, done: {} },
      );
      vs.talk = 4.5;
      const roji = api.playerId === 'roji';
      const fixed = api.load('plaster', false);
      s.step = (dt) => {
        s.k += dt;
        const once = (key, fn) => !s.done[key] && ((s.done[key] = true), fn());
        once('hi', () => visitor.emote('wave'));
        if (roji && !fixed) {
          if (s.k > 0.6 && s.k < 2.2) api.player.kid.squash = 0.86;
          if (s.k > 1.6) once('fix', () => {
            plaster.scale.setScalar(1);
            api.save('plaster', true);
            api.sound?.ui?.('good');
            api.toast('The little visitor scraped her knee. <b>Doctor Roji puts on a plaster with giraffes on it.</b>', 3600);
          });
          if (s.k > 2.4) once('yay', () => visitor.emote('cheer'));
        } else if (roji) {
          once('t', () => api.toast(pick(['She shows Roji her giraffe plaster. It is still her favourite.', 'She says she wants to be a doctor too, just like Roji.', 'She asks Roji if giraffes ever catch a cold. Roji says Jouri sneezes a lot.']), 3400));
          if (s.k > 1.2) once('yay', () => visitor.emote(n % 2 ? 'bow' : 'cheer'));
        } else {
          if (s.k > 0.6) once('t', () => {
            const i = n % 3;
            if (i === 0) {
              api.player.kid.squash = 0.75;
              puff(api.localPos(api.player).add(new THREE.Vector3(0, 1.2, 0.3)), '#ffffff', 6, 1, 0.06, 0.2);
              say('sneeze');
            }
            api.toast(['Homama does his best Jouri sneeze. She laughs so hard her balloon bobs.', 'Homama tells her that Roji is a real doctor. Her eyes go very wide.', 'Homama asks who her favourite giraffe is. "Jouri!" she says, of course.'][i], 3400);
          });
          if (s.k > 1.4) once('yay', () => visitor.emote('cheer'));
        }
        if (s.k > 3.6) api.endActivity();
      };
    }

    const hotspots = [
      { x: -3.85, z: -1.6, r: 1.05, label: 'Feed Jodi', icon: 'zoo-leaf', when: () => !scene, act: (api) => chooseTreat(api, jodi) },
      { x: -2.15, z: -1.6, r: 1.05, label: 'Feed Jouri', icon: 'zoo-leaf', when: () => !scene, act: (api) => chooseTreat(api, jouri) },
      { r: 1.25, label: 'Pet Jodi', icon: 'hand', track: () => petSpot(jodi), when: () => !scene, act: (api) => pet(api, jodi) },
      { r: 1.25, label: 'Pet Jouri', icon: 'hand', track: () => petSpot(jouri), when: () => !scene, act: (api) => pet(api, jouri) },
      { x: PHOTO.x, z: PHOTO.z, r: 1.3, label: 'Take a photo', icon: 'zoo-camera', act: photo },
      { r: 1.4, label: 'Talk to the keeper', icon: 'smile', track: () => ({ x: kp.pos.x, z: kp.pos.z }), act: talk },
      {
        x: POND.x + 0.4,
        z: POND.z + 2.15,
        r: 1.5,
        label: 'Wave to the flamingos',
        icon: 'hand',
        act: (api) => {
          api.emote('player', 'wave');
          for (const f of flamingos) f.dance = 3.2;
          say('honk');
          api.toast(`The flamingos do a little march for ${name(api)}.`, 2600);
        },
      },
      {
        r: 1.2,
        label: 'Pat the tortoise',
        icon: 'heart',
        track: () => ({ x: tortoise.pos.x, z: tortoise.pos.z + 0.25 }),
        act: (api) => {
          api.emote('player', 'bow');
          tortoise.shy();
          say('pop');
          later(1.7, () => {
            api.fx.heartsAt(tortoise.holder.localToWorld(new THREE.Vector3(0, 0.6, 0.3)), 3);
            api.toast('The tortoise peeks out and smiles. <b>Slow and happy.</b>', 2800);
          });
        },
      },
      {
        x: 8.85,
        z: -1.85,
        r: 1.5,
        label: 'Wave to the penguins',
        icon: 'hand',
        act: (api) => {
          api.emote('player', 'wave');
          for (const p of penguins) p.flap = 2.4;
          say('squeak');
          api.toast('The penguins flap hello.', 2200);
        },
      },
      { x: BENCHES[0].x, z: BENCHES[0].z + 0.8, r: 1.0, label: 'Sit on the bench', icon: 'smile', act: sitBench },
      { x: SHOP.x, z: SHOP.z + 0.95, r: 1.1, label: 'Visit the gift shop', icon: 'zoo-gift', when: () => !scene, act: giftShop },
      { r: 1.15, label: 'Say hello', icon: 'smile', track: () => ({ x: vs.pos.x - 0.45, z: vs.pos.z + 0.5 }), when: () => !scene, act: hello },
      ...acts.hotspots,
    ];

    // Everything static becomes a few vertex-coloured meshes
    dynamic.push(...bakeColors(scenery.group));
    // Handles for headless checks (dev.html)
    group.userData.zoo = { jodi, jouri, flamingos, penguins, tortoise, butterflies, keeper: kp, visitor: vs, acts, get scene() { return scene; } };

    // ------------------------------------------------ per frame
    let keeperCol = null;
    let tortoiseCol = null;
    function moveKeeper(dt, t, api) {
      const target = ROUTE[kp.idx];
      const P = playerLocal;
      const dP = Math.hypot(P.x - kp.pos.x, P.z - kp.pos.z);
      let want = 0;
      let face = null;
      if (kp.talk > 0) {
        kp.talk -= dt;
        face = Math.atan2(P.x - kp.pos.x, P.z - kp.pos.z);
      } else if ((watchAt || party) && dP < 12) {
        // Stop and watch whatever Roji and Homama are doing with the giraffes
        const w = watchAt || P;
        face = Math.atan2(w.x - kp.pos.x, w.z - kp.pos.z);
      } else if (kp.wait > 0) {
        kp.wait -= dt;
        face = dP < 2.6 ? Math.atan2(P.x - kp.pos.x, P.z - kp.pos.z) : (target.face ?? null);
        if (dP < 2.6 && t - kp.waved > 9) {
          kp.waved = t;
          keeper.emote('wave');
        }
      } else {
        const dx = target.x - kp.pos.x;
        const dz = target.z - kp.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.15) {
          kp.wait = target.wait ?? 0;
          kp.idx = (kp.idx + 1) % ROUTE.length;
        } else {
          face = Math.atan2(dx, dz);
          const ahead = (P.x - kp.pos.x) * Math.sin(kp.yaw) + (P.z - kp.pos.z) * Math.cos(kp.yaw);
          want = dP < 1.1 && ahead > 0 ? 0 : 1.25;
        }
      }
      const prev = kp.yaw;
      if (party && dP < 12 && kp.speed < 0.3 && !keeper.emoteType) {
        keeper.danceLoop = true;
        keeper.emote('dance');
      }
      if (face !== null) kp.yaw = util.dampAngle(kp.yaw, face, 6, dt);
      kp.speed = damp(kp.speed, want, 6, dt);
      kp.pos.x += Math.sin(kp.yaw) * kp.speed * dt;
      kp.pos.z += Math.cos(kp.yaw) * kp.speed * dt;
      let turn = kp.yaw - prev;
      if (turn > Math.PI) turn -= Math.PI * 2;
      if (turn < -Math.PI) turn += Math.PI * 2;
      keeper.root.position.set(kp.pos.x, 0, kp.pos.z);
      keeper.root.rotation.set(0, kp.yaw, 0);
      keeper.update(dt, t, kp.speed, 0, turn / Math.max(dt, 1e-3));
      const O = api.space?.origin;
      if (O && api.space.colliders) {
        keeperCol ??= api.space.colliders.find((c) => c.tag === 'zoo-keeper') || false;
        tortoiseCol ??= api.space.colliders.find((c) => c.tag === 'zoo-tortoise') || false;
        if (keeperCol) {
          keeperCol.x = O.x + kp.pos.x;
          keeperCol.z = O.z + kp.pos.z;
        }
        if (tortoiseCol) {
          tortoiseCol.x = O.x + tortoise.pos.x;
          tortoiseCol.z = O.z + tortoise.pos.z;
        }
      }
    }

    const vq = new THREE.Quaternion();
    const vq2 = new THREE.Quaternion();
    let champT = 0;
    function moveVisitor(dt, t) {
      const P = playerLocal;
      const dP = Math.hypot(P.x - vs.pos.x, P.z - vs.pos.z);
      let face = -2.3;
      if (vs.talk > 0) vs.talk -= dt;
      if (vs.talk > 0 || dP < 3.2) face = Math.atan2(P.x - vs.pos.x, P.z - vs.pos.z);
      else if (watchAt) face = Math.atan2(watchAt.x - vs.pos.x, watchAt.z - vs.pos.z);
      else face = Math.atan2(jouri.pos.x - vs.pos.x, jouri.pos.z - vs.pos.z);
      const near = dP < 3.2;
      if (near && !vs.near && t - vs.waved > 12 && !scene) {
        vs.waved = t;
        visitor.emote('wave');
      }
      vs.near = near;
      const prev = vs.yaw;
      vs.yaw = util.dampAngle(vs.yaw, face, 4, dt);
      visitor.root.position.copy(vs.pos);
      visitor.root.rotation.set(0, vs.yaw, 0);
      visitor.update(dt, t, 0, 0, (vs.yaw - prev) / Math.max(dt, 1e-3));
      // The balloon stays upright whatever her arm does, bobbing on its string
      visitor.root.updateMatrixWorld(true);
      visitor.arms[0].getWorldQuaternion(vq).invert();
      visitor.root.getWorldQuaternion(vq2);
      balloonPivot.quaternion.copy(vq.multiply(vq2));
      balloonPivot.rotateZ(Math.sin(t * 1.3) * 0.08);
      balloonPivot.rotateX(Math.sin(t * 1.1 + 1) * 0.06);
    }

    function update(dt, t, api) {
      playerLocal = api.localPos(api.player);
      for (let i = timers.length - 1; i >= 0; i--) {
        timers[i].t -= dt;
        if (timers[i].t <= 0) timers.splice(i, 1)[0].fn();
      }
      if (scene) scene.step?.(dt, t);
      champT -= dt;
      if (champT <= 0) {
        champT = 2;
        const c = champion();
        leafCrown.visible = c;
        rosette.visible = c;
      }
      const atFence = !scene && playerLocal.z > -2.7 && playerLocal.z < 1.0 && playerLocal.x > -11 && playerLocal.x < 5.3 && playerLocal.y < 0.5;
      giraffes.forEach((g, i) => {
        const e = envs[i];
        e.playerHead.set(playerLocal.x, playerLocal.y + 1.2, playerLocal.z);
        e.playerNear = near(g);
        e.atFence = atFence;
        g.update(dt, t, e);
      });
      if (scene) scene.arms?.(t);
      for (const b of butterflies) b.update(dt, t);
      for (const f of flamingos) f.update(dt, t);
      for (const p of penguins) p.update(dt, t);
      const kids = [api.localPos(api.player), api.localPos(api.partner), kp.pos];
      tortoise.update(dt, t, kids);
      moveKeeper(dt, t, api);
      moveVisitor(dt, t);
      acts.update(dt, t);
      for (let i = 0; i < PUFFS; i++) {
        const p = puffs[i];
        if (p.life <= 0) continue;
        p.life -= dt * 1.4;
        p.v.multiplyScalar(Math.exp(-2.5 * dt));
        p.p.addScaledVector(p.v, dt);
        const k = Math.max(0, p.life);
        const sc = p.s * Math.sin(Math.min(1, (1 - k) * 4) * Math.PI * 0.5) * Math.min(1, k * 3);
        puffMesh.setMatrixAt(i, m4.compose(p.p, q0, tmpV.set(sc, sc, sc)));
      }
      puffMesh.instanceMatrix.needsUpdate = true;
    }

    return {
      group,
      dynamic,
      colliders,
      hotspots,
      pad: { x: 0, z: ctx.size.d / 2 + 1.2 },
      update,
    };
  },
};
