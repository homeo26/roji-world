import * as THREE from 'three';
import { kit, makeAtlas, colorBake, bellTone, heartPath, C } from './school/kit.js';
import { skinify } from './zoo/rig.js';
import * as M from './harbour/models.js';
import { Gulls } from './harbour/gulls.js';
import { makeFish, FISH_BY_ID } from '../arena/fishing/fish.js';

// Roji's Harbour on the south-east shore: a pier with a T-head and a jetty out over the sea, four boats
// (the rowing boat "Roji", the fishing boat "Homama", a sailboat and a swan), a lighthouse on a rock,
// a fish market with a fishmonger, a bait hut, nets, pots and a flock of seagulls.

const { SEA, DECK } = M;
const PI = Math.PI;
const DEV = typeof location !== 'undefined' && /dev\.html/.test(location.pathname);

// Walkways out over the sea (local metres). The island shore is at about z 15.
const PIER = { x: -3, z: 19.6, hw: 1.5, hd: 6.4 }; // z 13.2 .. 26
const HEAD = { x: -3, z: 28.25, hw: 7, hd: 2.25 }; // x -10 .. 4, z 26 .. 30.5
const JETTY = { x: 4.25, z: 20, hw: 5.75, hd: 1 }; // x -1.5 .. 10, z 19 .. 21
const RAILS = [
  { a: [-4.5, 13.2], b: [-4.5, 26] },
  { a: [-1.5, 13.2], b: [-1.5, 19] },
  { a: [-1.5, 21], b: [-1.5, 26] },
  { a: [-10, 26], b: [-4.5, 26] },
  { a: [-1.5, 26], b: [4, 26] },
  { a: [-10, 30.5], b: [4, 30.5], gap: [-4.7, -1.3] },
  { a: [-10, 26], b: [-10, 30.5] },
  { a: [4, 26], b: [4, 30.5] },
  { a: [-1.5, 19], b: [10, 19] },
  { a: [-1.5, 21], b: [10, 21], gap: [2.5, 4.7] },
  { a: [10, 19], b: [10, 21] },
];
const SPOT = {
  market: { x: -10.4, z: -2.2 },
  hut: { x: -3.0, z: -3.6 },
  nets: { x: 3.4, z: -4.0 },
  trestles: { x: 10.0, z: -1.4 },
  bell: { x: 3.2, z: 29.75 },
  bench: { x: -8.7, z: 27.85 },
  feed: { x: 0.6, z: 28.1 },
  row: { x: 3.6, z: 22.45 },
  homama: { x: -8.1, z: 21.2 },
  sail: { x: 6.6, z: 17.55 },
  swan: { x: -13.2, z: 23.9 },
  light: { x: 13.6, z: 27.2 },
  crabs: { x: -6.6, z: 16.75 },
  bottle: { x: -11.4, z: 29.0 },
};
// The rowing trip: out past the T-head, round the lighthouse and back to the jetty
const ROUTE = [[3.6, 22.45], [4.6, 23.9], [6.6, 25.4], [7.4, 28.4], [8.4, 31.6], [11.6, 33.4], [15.6, 32.8], [18.0, 29.6], [18.0, 25.4], [15.4, 22.4], [12.2, 22.0], [9.4, 23.9], [7.2, 24.4], [5.0, 23.8], [3.6, 22.45]];
const BUOYS = [[1.8, 33.6], [-8.4, 33.4], [-15.4, 26.4]];

const NOTES = [
  'Roji, I threw this bottle into the sea so it would find its way to you. It did. It always will. Love, Homama',
  'To the best doctor on the island: you looked after everyone today. Tonight, let me look after you. Homama',
  'Roji, I tried to count the reasons I love you, but the sea ran out of fish first. Homama',
  'If you are reading this, look up. I am the one smiling at you. Homama',
];

export default {
  id: 'harbour',
  stop: {
    title: "Roji's Harbour",
    tag: 'Boats and fishing',
    icon: 'harbour-anchor',
    color: '#2f9fb8',
    text: 'Fish off the pier together, row out in the little boat Roji, feed the seagulls, buy fresh fish and watch the sunset from the bench.',
  },
  icons: {
    'harbour-anchor': 'M12 7.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z M12 7.5V21 M8 10.5h8 M4.5 14c0 3.9 3.4 7 7.5 7s7.5-3.1 7.5-7 M4.5 14 3 16 M19.5 14l1.5 2',
    'harbour-fish': 'M2.5 8.5 5.5 12l-3 3.5 M5.5 12c2.5-4 7-6 11-4.5 2 .8 3.6 2.4 5 4.5-1.4 2.1-3 3.7-5 4.5-4 1.5-8.5-.5-11-4.5z M16.5 11h.01',
    'harbour-boat': 'M3 15h18l-2.5 4.5h-13z M12 15V3 M12 4l6 9h-6 M12 6l-4.5 7H12',
    'harbour-bell': 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z M10 20.5a2 2 0 0 0 4 0 M12 3v2',
    'harbour-gull': 'M2.5 11c2.5-2.5 5.5-2.5 9.5 1 4-3.5 7-3.5 9.5-1 M12 12v2',
    'harbour-sun': 'M5 16a7 7 0 0 1 14 0 M2.5 16h19 M5 19.5h14 M12 4.5v2 M5.6 7.6 7 9 M18.4 7.6 17 9',
    'harbour-bottle': 'M10 3h4 M10.5 3v3.5L8.5 9v11a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V9l-2-2.5V3 M10.5 13.5h3',
  },

  build(ctx) {
    const { util, api } = ctx;
    const { damp, clamp, lerp } = util;
    const k = kit();
    const g = new THREE.Group();
    const dynamic = [];
    const colliders = [];
    const add = (o, x = 0, y = 0, z = 0, ry = 0) => {
      o.position.set(x, y, z);
      if (ry) o.rotation.y = ry;
      g.add(o);
      return o;
    };
    const dyn = (o) => (dynamic.push(o), o);
    const atlas = makeAtlas(2048, 1024, { rough: 0.8 });
    atlas.material.alphaTest = 0.5;
    atlas.material.side = THREE.DoubleSide;
    // Lantern glass: lit a little by day, brightly at night. The game raises its glow at night,
    // so reading it back tells us how dark it is.
    const GLASS_I = 0.9;
    const glassMat = util.umat('#fff1c4', { emissive: '#ffc35a', ei: GLASS_I, rough: 0.3 });
    const glow = () => clamp((glassMat.emissiveIntensity / GLASS_I - 1) / 1.8, 0, 1);
    const netMat = util.umat('#ffffff', { map: M.netTexture(), side: THREE.DoubleSide, rough: 0.9 });
    netMat.alphaTest = 0.5;
    const people = [];
    const tmp = new THREE.Vector3();
    const tmp2 = new THREE.Vector3();
    const say = (html, ms = 2600) => api.toast(html, ms);
    const nameOf = (id) => (id === 'roji' ? 'Roji' : 'Homama');

    // ------------------------------------------------ the yard: a sandy quay with a cobbled edge
    const ground = [
      { x: 0, z: 0.2, hw: 15, hd: 5.9, color: '#ead6ad', feather: 1.4 },
      { x: -3, z: 7.6, hw: 2.6, hd: 1.8, color: '#e3cda2', feather: 0.8 },
    ];

    // ------------------------------------------------ pier, T-head and jetty
    const plankTex = util.canvasTexture(256, 256, (c, w, h) => {
      const n = 8;
      for (let i = 0; i < n; i++) {
        const tone = ['#c99566', '#c28e5e', '#cf9c6c', '#bf8a5a'][i % 4];
        c.fillStyle = tone;
        c.fillRect(0, (i * h) / n, w, h / n);
        c.fillStyle = 'rgba(90,55,30,0.55)';
        c.fillRect(0, (i * h) / n, w, 3);
        c.fillStyle = 'rgba(255,240,215,0.18)';
        for (let j = 0; j < 7; j++) c.fillRect((j * 37 + i * 53) % w, (i * h) / n + 8 + (j % 3) * 7, 26 + (j % 4) * 9, 2);
        c.fillStyle = 'rgba(60,40,30,0.6)';
        for (const x of [20, w / 2 + 20]) {
          c.beginPath();
          c.arc(x + (i % 2) * 40, (i * h) / n + h / n / 2, 2.6, 0, PI * 2);
          c.fill();
        }
      }
    });
    plankTex.wrapS = plankTex.wrapT = THREE.RepeatWrapping;
    const deckMat = util.umat('#ffffff', { map: plankTex, rough: 0.85 });
    const deck = (cx, cz, w, d, across) => {
      // across: planks run along X (for a walkway that is long in Z)
      const geo = across ? new THREE.BoxGeometry(w, 0.16, d) : new THREE.BoxGeometry(d, 0.16, w);
      const uv = geo.attributes.uv;
      const su = (across ? w : d) / 1.8;
      const sv = (across ? d : w) / 1.76;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
      const m = util.mesh(geo, deckMat, { cast: false });
      m.position.set(cx, DECK - 0.08, cz);
      if (!across) m.rotation.y = PI / 2;
      g.add(m);
      colliders.push({ type: 'box', x: cx, z: cz, hw: w / 2, hd: d / 2, h: DECK });
    };
    deck(PIER.x, PIER.z, PIER.hw * 2, PIER.hd * 2, true);
    deck(HEAD.x, HEAD.z, HEAD.hw * 2, HEAD.hd * 2, false);
    deck(JETTY.x, JETTY.z, JETTY.hw * 2, JETTY.hd * 2, false);
    const walk = [PIER, HEAD, JETTY].map((w) => ({ x: w.x, z: w.z, hw: w.hw, hd: w.hd }));
    // Beams under the deck edges
    for (const w of [PIER, HEAD, JETTY]) {
      for (const s of [1, -1]) {
        g.add(k.at(k.box(w.hw * 2, 0.14, 0.14, '#8a5a3c'), w.x, DECK - 0.23, w.z + s * (w.hd - 0.07)));
        g.add(k.at(k.box(0.14, 0.14, w.hd * 2, '#8a5a3c'), w.x + s * (w.hw - 0.07), DECK - 0.23, w.z));
      }
    }

    // Rails: posts, rope swags and pilings under every post. Every rail is also a wall.
    const posts = [];
    const pileGeo = new THREE.CylinderGeometry(0.13, 0.15, 2.6, 10);
    const algaeGeo = new THREE.CylinderGeometry(0.165, 0.175, 0.26, 10);
    const pileMat = util.mat('#7a5236', { rough: 0.9 });
    const algaeMat = util.mat('#5f9a6a', { rough: 0.9 });
    const ropeMat = util.mat('#ead6ad', { rough: 0.8 });
    const pile = (x, z) => {
      g.add(k.at(util.mesh(pileGeo, pileMat), x, DECK - 0.16 - 1.3, z));
      g.add(k.at(util.mesh(algaeGeo, algaeMat, { cast: false }), x, SEA + 0.02, z));
    };
    for (const r of RAILS) {
      const [ax, az] = r.a;
      const [bx, bz] = r.b;
      const len = Math.hypot(bx - ax, bz - az);
      const alongX = Math.abs(bz - az) < 1e-3;
      colliders.push(alongX ? { type: 'box', x: (ax + bx) / 2, z: az, hw: len / 2, hd: 0.08 } : { type: 'box', x: ax, z: (az + bz) / 2, hw: 0.08, hd: len / 2 });
      const n = Math.max(1, Math.ceil(len / 1.7));
      const pts = [];
      for (let i = 0; i <= n; i++) pts.push([ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n]);
      pts.forEach(([x, z], i) => {
        const at = alongX ? x : z;
        pile(x, z);
        if (!r.gap || at <= r.gap[0] || at >= r.gap[1]) {
          g.add(k.at(k.box(0.12, 0.9, 0.12, '#9b6a43'), x, DECK + 0.45, z));
          g.add(k.at(k.sph(0.08, '#fff4e3', undefined, 8), x, DECK + 0.93, z));
          posts.push({ x, z });
        }
        if (i === 0) return;
        const [px, pz] = pts[i - 1];
        const mid = alongX ? (x + px) / 2 : (z + pz) / 2;
        if (r.gap && mid > r.gap[0] && mid < r.gap[1]) return;
        const a = new THREE.Vector3(px, DECK + 0.78, pz);
        const b = new THREE.Vector3(x, DECK + 0.78, z);
        const c = a.clone().lerp(b, 0.5);
        c.y -= 0.14;
        g.add(util.mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, c, b), 6, 0.032, 5), ropeMat, { cast: false }));
      });
    }
    // Middle pilings under the wide T-head
    for (let x = -9; x <= 3; x += 2.4) pile(x, HEAD.z);
    // Car tyres as fenders on the jetty's south side, and a little ladder down to the water
    for (const x of [1.5, 5.6, 7.6]) g.add(k.at(k.rot(k.tor(0.2, 0.08, '#2f2a33', PI * 2, undefined, 14, 6), 0, 0, 0), x, DECK - 0.3, 21.12));
    for (let i = 0; i < 5; i++) g.add(k.at(k.box(0.7, 0.05, 0.06, '#9b6a43'), 3.6, DECK - 0.3 - i * 0.28, 21.08));
    for (const s of [1, -1]) g.add(k.at(k.box(0.06, 1.5, 0.06, '#9b6a43'), 3.6 + s * 0.35, DECK - 0.7, 21.08));

    // Lantern posts, leaning their lamps over the deck
    const lanterns = [];
    for (const [x, z, ry] of [[-4.5, 16.6, 0], [-1.5, 23.6, PI], [-10, 30.5, PI / 2], [4, 30.5, PI / 2], [-10, 26, -PI / 2], [10, 21, PI / 2], [-4.5, 13.2, 0]]) {
      const lp = M.lanternPost(k, glassMat);
      add(lp.root, x, DECK, z, ry);
      lp.root.updateMatrixWorld(true);
      lanterns.push(lp.root.localToWorld(lp.light.clone()));
    }

    // Entrance arch with the harbour's name on both faces
    for (const s of [-1, 1]) {
      g.add(k.at(k.cyl(0.11, 0.13, 3.0, '#9b6a43', 10), -3 + s * 1.85, 1.5, 13.45));
      for (let i = 0; i < 4; i++) g.add(k.at(k.rot(k.tor(0.22, 0.06, i % 2 ? '#ffffff' : '#ff7a4d', PI / 2, undefined, 6, 6), 0, 0, (i * PI) / 2), -3 + s * 1.85, 1.35, 13.6));
      colliders.push({ type: 'circle', x: -3 + s * 1.85, z: 13.45, r: 0.16 });
    }
    const archDraw = (ctx, w, h) => {
      ctx.fillStyle = '#fff4e3';
      util.roundRect(ctx, 6, 6, w - 12, h - 12, h * 0.4);
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#2f9fb8';
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#2f6f8f';
      ctx.font = `700 ${Math.round(h * 0.5)}px ${util.FONT}`;
      ctx.fillText("Roji's Harbour", w / 2, h * 0.54);
      ctx.fillStyle = '#ff6b8a';
      for (const x of [w * 0.07, w * 0.93]) {
        heartPath(ctx, x, h * 0.52, h * 0.36);
        ctx.fill();
      }
    };
    for (const ry of [0, PI]) {
      const p = atlas.panel(3.5, 0.62, 840, 150, archDraw);
      add(p, -3, 2.62, 13.45 + (ry ? -0.07 : 0.07), ry);
    }
    g.add(k.at(k.box(3.9, 0.7, 0.1, '#9b6a43'), -3, 2.62, 13.45));
    for (const s of [-1, 1]) g.add(k.at(k.cone(0.12, 0.3, C.rose, 4), -3 + s * 1.85, 3.12, 13.45));

    // Bollards with ropes to the boats
    const bollards = [[2.0, 20.75], [5.2, 20.75], [5.6, 19.25], [9.2, 19.25], [-4.3, 19.8], [-4.3, 21.9], [-9.7, 26.6]];
    for (const [x, z] of bollards) add(M.bollard(k), x, DECK, z);
    const rope = (a, b, sag = 0.25) => {
      const c = a.clone().lerp(b, 0.5);
      c.y -= sag;
      return util.mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, c, b), 10, 0.025, 5), ropeMat, { cast: false });
    };

    // ------------------------------------------------ boats
    const boats = [];
    // lift: how far the rim rides above the water
    const boat = (model, x, z, yaw, amp, lift) => {
      const root = model.root;
      root.rotation.order = 'YXZ';
      root.position.set(x, SEA + lift, z);
      root.rotation.y = yaw;
      g.add(root);
      dyn(root);
      const b = { root, x, z, yaw, amp, lift, phase: boats.length * 1.7, model };
      boats.push(b);
      return b;
    };
    const row = M.rowBoat(k, atlas, glassMat);
    for (const o of row.oars) {
      o.pivot.rotation.y = o.side * 1.28;
      o.arm.rotation.z = -o.side * 0.12;
    }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: M.dotTexture(), color: '#ffd27a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    halo.scale.setScalar(1.3);
    row.lantern.add(halo);
    M.bakeGroup(row.root, [...row.oars.map((o) => o.pivot), row.lantern]);
    const rowB = boat(row, SPOT.row.x, SPOT.row.z, PI / 2, 0.8, 0.3);
    const rowRopes = new THREE.Group();
    rowRopes.add(rope(new THREE.Vector3(2.0, DECK + 0.3, 20.75), new THREE.Vector3(2.3, SEA + 0.34, 22.25), 0.15));
    rowRopes.add(rope(new THREE.Vector3(5.2, DECK + 0.3, 20.75), new THREE.Vector3(4.95, SEA + 0.36, 22.25), 0.15));
    g.add(rowRopes);
    dyn(rowRopes);

    const fb = M.fishingBoat(k, atlas);
    M.bakeGroup(fb.root, [fb.flag]);
    boat(fb, SPOT.homama.x, SPOT.homama.z, PI / 2, 1, 0.4);
    g.add(rope(new THREE.Vector3(-4.3, DECK + 0.3, 21.9), new THREE.Vector3(-6.2, SEA + 0.66, 21.5), 0.3));
    g.add(rope(new THREE.Vector3(-4.3, DECK + 0.3, 19.8), new THREE.Vector3(-7.0, SEA + 0.66, 20.35), 0.3));

    const sb = M.sailBoat(k);
    M.bakeGroup(sb.root);
    boat(sb, SPOT.sail.x, SPOT.sail.z, PI / 2 + 0.06, 1.2, 0.34);
    g.add(rope(new THREE.Vector3(5.6, DECK + 0.3, 19.25), new THREE.Vector3(5.2, SEA + 0.55, 17.95), 0.2));
    g.add(rope(new THREE.Vector3(9.2, DECK + 0.3, 19.25), new THREE.Vector3(8.4, SEA + 0.55, 18.05), 0.2));

    const swan = M.swanBoat(k);
    M.bakeGroup(swan.root);
    boat(swan, SPOT.swan.x, SPOT.swan.z, 0.9, 1.3, 0.3);
    g.add(rope(new THREE.Vector3(-9.7, DECK + 0.3, 26.6), new THREE.Vector3(-12.4, SEA + 0.5, 24.6), 0.5));

    // Buoys (one instanced mesh)
    const buoyMesh = new THREE.InstancedMesh(M.buoyGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), BUOYS.length);
    buoyMesh.castShadow = true;
    buoyMesh.frustumCulled = false;
    g.add(dyn(buoyMesh));

    // ------------------------------------------------ the lighthouse
    const lh = M.lighthouse(k, atlas);
    add(lh.root, SPOT.light.x, SEA, SPOT.light.z, -0.2);
    dyn(lh.beam);

    // ------------------------------------------------ land: market, hut, nets, pots, crates
    const mk = M.market(k, atlas);
    add(mk.root, SPOT.market.x, 0, SPOT.market.z);
    dyn(mk.needle);
    dyn(mk.pan);
    colliders.push({ type: 'box', x: SPOT.market.x, z: SPOT.market.z - 0.5, hw: mk.W / 2 + 0.1, hd: 1.05 });
    colliders.push({ type: 'circle', x: SPOT.market.x - mk.W / 2 - 0.9, z: SPOT.market.z + 0.6, r: 0.45 });
    // A ginger harbour cat asleep on the crates by the market
    const cat = new THREE.Group();
    const catC = '#f2a25c';
    cat.add(k.at(k.sph(0.2, catC, undefined, 12), 0, 0.13, 0));
    cat.children[0].scale.set(1.3, 0.7, 1);
    cat.add(k.at(k.sph(0.12, catC, undefined, 12), 0.22, 0.16, 0.06));
    for (const s of [1, -1]) cat.add(k.at(k.cone(0.045, 0.09, catC, 5), 0.24, 0.27, 0.06 + s * 0.06));
    cat.add(k.at(k.rot(k.tor(0.16, 0.035, '#e88a40', PI, undefined, 10, 5), PI / 2, 0, 0.3), -0.05, 0.05, 0.12));
    for (const s of [1, -1]) cat.add(k.at(k.box(0.04, 0.01, 0.005, '#3b2b3f'), 0.3, 0.17, 0.06 + s * 0.04));
    add(cat, -13.4, 0.92, -3.8, 0.6);

    const fm = ctx.makeKid(M.FISHMONGER_LOOK);
    M.dressFishmonger(fm, k);
    fm.root.scale.setScalar(1.18);
    // He stands at the end of his stall, by the hanging scale, out from under the awning
    const FM = { x: SPOT.market.x + mk.W / 2 + 0.55, z: SPOT.market.z - 0.3 };
    fm.root.position.set(FM.x, 0, FM.z);
    skinify(fm.root, { rough: 0.62 });
    g.add(dyn(fm.root));
    colliders.push({ type: 'circle', x: FM.x, z: FM.z, r: 0.36 });
    const monger = { yaw: 0, waveIn: 2, busy: 0, stir: 4, weigh: null };

    const hut = M.tackleHut(k, atlas);
    add(hut.root, SPOT.hut.x, 0, SPOT.hut.z);
    colliders.push({ type: 'box', x: SPOT.hut.x, z: SPOT.hut.z, hw: hut.W / 2 + 0.05, hd: hut.D / 2 + 0.05 });
    colliders.push({ type: 'circle', x: SPOT.hut.x - hut.W / 2 - 0.45, z: SPOT.hut.z + 0.7, r: 0.34, h: 0.8 });
    // The window at night: warm light inside
    const winGlow = util.mesh(new THREE.PlaneGeometry(1.1, 0.8), util.umat('#ffe7b0', { emissive: '#ffc96b', ei: 0.12, rough: 0.6 }), { cast: false });
    add(winGlow, SPOT.hut.x - 0.95, 1.25, SPOT.hut.z + hut.D / 2 + 0.07);

    add(M.netRack(k, netMat), SPOT.nets.x, 0, SPOT.nets.z);
    for (const x of [-2, 0, 2]) colliders.push({ type: 'circle', x: SPOT.nets.x + x, z: SPOT.nets.z, r: 0.12 });
    colliders.push({ type: 'box', x: SPOT.nets.x, z: SPOT.nets.z, hw: 2, hd: 0.06 });

    const pots = [[6.6, -1.0, 0], [6.6, -1.0, 1], [7.5, -1.6, 0], [-6.6, 0.6, 0]];
    for (const [x, z, lvl] of pots) add(M.lobsterPot(k, netMat), x, lvl * 0.34, z, lvl ? 0.3 : -0.2);
    colliders.push({ type: 'box', x: 6.6, z: -1.0, hw: 0.44, hd: 0.3, h: 0.66 });
    colliders.push({ type: 'box', x: 7.5, z: -1.6, hw: 0.44, hd: 0.3, h: 0.33 });
    colliders.push({ type: 'box', x: -6.6, z: 0.6, hw: 0.44, hd: 0.3, h: 0.33 });
    for (const [x, z, s, h] of [[-13.6, -3.4, 0.6, 0], [-13.0, -4.2, 0.6, 0], [-13.4, -3.8, 0.55, 0.48], [1.0, -1.6, 0.6, 0], [1.6, -2.4, 0.5, 0]]) {
      add(M.crate(k, '#d6a06a', s), x, h, z, x * 0.3);
    }
    colliders.push({ type: 'box', x: -13.3, z: -3.8, hw: 0.65, hd: 0.75, h: 0.98 });
    colliders.push({ type: 'box', x: 1.3, z: -2.0, hw: 0.6, hd: 0.7, h: 0.48 });
    add(M.boatOnTrestles(k), SPOT.trestles.x, 0, SPOT.trestles.z);
    colliders.push({ type: 'box', x: SPOT.trestles.x, z: SPOT.trestles.z, hw: 0.66, hd: 1.42, h: 1.38 });
    // A stack of spare buoys and a coil of rope by the hut
    for (const [x, z, c] of [[-0.6, -1.6, C.sun], [-0.25, -1.75, C.rose], [-0.45, -1.3, C.teal]]) g.add(k.at(k.sph(0.22, c, undefined, 12), x, 0.22, z));
    g.add(k.at(k.rot(k.tor(0.28, 0.07, '#ead6ad', PI * 2, undefined, 18, 6), PI / 2, 0, 0), 4.7, 0.07, -1.2));
    g.add(k.at(k.rot(k.tor(0.2, 0.07, '#ead6ad', PI * 2, undefined, 16, 6), PI / 2, 0, 0), 4.7, 0.2, -1.2));
    colliders.push({ type: 'circle', x: 4.7, z: -1.2, r: 0.32, h: 0.26 });

    // The town sign by the pad
    const sign = ctx.sign(['Boats and fishing', "Roji's Harbour"], { width: 2.6, accent: '#2f9fb8' });
    add(sign, -4.6, 0, 6.2, 0.15);
    colliders.push({ type: 'box', x: -4.6, z: 6.15, hw: 1.1, hd: 0.12 });

    // ------------------------------------------------ out on the T-head: bench, bell, bucket, pots
    // The bench looks out west over the water, turned a little toward the harbour mouth
    const BY = -0.95;
    const benchAt = (l, f = 0) => ({ x: SPOT.bench.x + l * Math.cos(BY) + f * Math.sin(BY), z: SPOT.bench.z - l * Math.sin(BY) + f * Math.cos(BY) });
    const bench = M.bench(k, atlas);
    add(bench, SPOT.bench.x, DECK, SPOT.bench.z, BY);
    for (const l of [-0.45, 0.45]) colliders.push({ type: 'circle', ...benchAt(l, -0.05), r: 0.42, h: DECK + 0.47 });
    const bl = M.bellFrame(k);
    add(bl.root, SPOT.bell.x, DECK, SPOT.bell.z);
    dyn(bl.pivot);
    for (const s of [-1, 1]) colliders.push({ type: 'circle', x: SPOT.bell.x + s * 0.45, z: SPOT.bell.z, r: 0.12 });
    add(M.lobsterPot(k, netMat), 2.6, DECK, 26.55, 0);
    add(M.crate(k, '#d6a06a', 0.55), 1.4, DECK, 26.5, 0.2);
    colliders.push({ type: 'box', x: 2.0, z: 26.55, hw: 1.0, hd: 0.32, h: DECK + 0.42 });
    // Tackle box and a coiled rope by the fishing spot
    g.add(k.at(k.rbox(0.42, 0.22, 0.26, C.teal, 0.03), -5.0, DECK + 0.11, 30.0));
    g.add(k.at(k.rbox(0.44, 0.04, 0.28, '#2f8f7a', 0.015), -5.0, DECK + 0.23, 30.0));
    colliders.push({ type: 'box', x: -5.0, z: 30.0, hw: 0.22, hd: 0.14, h: DECK + 0.24 });
    // Life ring on the T-head rail
    for (let i = 0; i < 4; i++) g.add(k.at(k.rot(k.tor(0.24, 0.07, i % 2 ? '#ffffff' : '#ff7a4d', PI / 2, undefined, 6, 6), 0, PI / 2, (i * PI) / 2), -10.08, DECK + 0.55, 28.2));

    // ------------------------------------------------ crab couple on a rock below the pier
    const crabs = new THREE.Group();
    for (const [x, y, z, r, c, sy] of [[0, 0.0, 0, 0.62, '#a8998b', 0.62], [-0.7, -0.1, 0.25, 0.42, '#b8aa9c', 0.8], [0.65, -0.15, 0.3, 0.36, '#9c8d80', 0.9], [0.2, -0.2, -0.55, 0.5, '#b8aa9c', 0.7]]) {
      const rock = util.mesh(new THREE.IcosahedronGeometry(r, 1), util.mat(c, { flat: true, rough: 0.95 }));
      rock.scale.set(1.15, sy, 1);
      rock.position.set(x, y, z);
      crabs.add(rock);
    }
    const pair = new THREE.Group();
    pair.position.y = 0.36;
    const crabA = makeFish('crab');
    const crabB = makeFish('crab');
    crabA.scale.setScalar(0.2);
    crabB.scale.setScalar(0.17);
    crabA.position.set(-0.13, 0.03, 0);
    crabB.position.set(0.13, 0.03, 0);
    crabA.rotation.y = -PI / 2;
    crabB.rotation.y = -PI / 2;
    pair.add(crabA, crabB);
    crabs.add(pair);
    const crabHeart = new THREE.Sprite(new THREE.SpriteMaterial({ map: M.heartTexture(), transparent: true, opacity: 0, depthWrite: false }));
    crabHeart.scale.setScalar(0.16);
    crabHeart.position.set(0, 0.5, 0);
    crabs.add(crabHeart);
    add(crabs, SPOT.crabs.x, SEA + 0.05, SPOT.crabs.z);
    dyn(crabs);
    const crabState = { t: 0, heart: 0, next: 3 };

    // ------------------------------------------------ the message in a bottle
    const bottle = makeFish('bottle');
    bottle.scale.setScalar(0.34);
    const bottleHolder = new THREE.Group();
    bottleHolder.add(bottle);
    add(bottleHolder, SPOT.bottle.x, SEA, SPOT.bottle.z);
    dyn(bottleHolder);
    const bottleState = { here: true, back: 0, note: api.load('note', 0) % NOTES.length };

    // ------------------------------------------------ gulls
    const perches = [];
    posts.forEach((p, i) => i % 4 === 1 && perches.push({ x: p.x, y: DECK + 1.01, z: p.z }));
    perches.push({ x: SPOT.hut.x - 0.9, y: 3.22, z: SPOT.hut.z }, { x: SPOT.hut.x + 0.8, y: 3.22, z: SPOT.hut.z, yaw: 1 });
    perches.push({ x: SPOT.market.x + 0.7, y: 3.06, z: SPOT.market.z + 0.93 }, { x: -3.8, y: 2.98, z: 13.45 }, { x: -1.9, y: 2.98, z: 13.45, yaw: -1 });
    perches.push({ x: SPOT.trestles.x, y: 1.43, z: SPOT.trestles.z + 0.6, yaw: 0.5 }, { x: SPOT.bell.x - 0.3, y: DECK + 1.97, z: SPOT.bell.z });
    for (const a of [0.4, 2.2, 4.0]) perches.push({ x: SPOT.light.x + Math.cos(a) * 0.95, y: SEA + lh.lampTop - 0.02, z: SPOT.light.z + Math.sin(a) * 0.95, yaw: a });
    perches.push({ x: SPOT.homama.x - 0.65, y: SEA + 1.4, z: SPOT.homama.z, yaw: 1.6 });
    const gulls = new Gulls(perches, { count: 7, bounds: { x0: -14, x1: 16, z0: -2, z1: 30 } });
    g.add(dyn(gulls.group));
    const crumbs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.025, 0.04), util.mat('#f2d39a', { rough: 0.9 }), 16);
    crumbs.frustumCulled = false;
    crumbs.castShadow = false;
    const crumbList = [];
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < 16; i++) crumbs.setMatrixAt(i, zero);
    g.add(dyn(crumbs));

    // ------------------------------------------------ water sparkle: foam rings round the posts and boats
    const ringSpots = [];
    for (const p of posts) if (p.z > 15.5 && (Math.abs(p.z - 30.5) < 0.1 || Math.abs(p.x - 10) < 0.1 || (p.z > 24 && Math.abs(p.x + 10) < 0.1))) ringSpots.push({ x: p.x, z: p.z, r: 0.42 });
    ringSpots.push({ x: SPOT.light.x, z: SPOT.light.z, r: 3.1 });
    for (const [x, z] of BUOYS) ringSpots.push({ x, z, r: 0.75 });
    boats.forEach((b, i) => ringSpots.push({ x: b.x, z: b.z, r: [1.75, 2.6, 2.3, 1.55][i], boat: b }));
    const ringMat = new THREE.MeshBasicMaterial({ color: '#f2fbfb', transparent: true, opacity: 0.32, depthWrite: false });
    const ringGeo = new THREE.RingGeometry(0.86, 1, 28);
    ringGeo.rotateX(-PI / 2);
    const rings = new THREE.InstancedMesh(ringGeo, ringMat, ringSpots.length);
    rings.frustumCulled = false;
    g.add(dyn(rings));

    // Soft halos round the lanterns at night (one draw call)
    const haloGeo = new THREE.BufferGeometry().setFromPoints(lanterns);
    const haloMat = new THREE.PointsMaterial({ size: 1.6, map: M.dotTexture(), color: '#ffd9a0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const halos = new THREE.Points(haloGeo, haloMat);
    halos.frustumCulled = false;
    g.add(dyn(halos));

    // ------------------------------------------------ sunset props: the sun on the water and its glitter path
    const sunTex = util.canvasTexture(128, 128, (c, w, h) => {
      const halo = c.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w / 2);
      halo.addColorStop(0, 'rgba(255,170,120,0.55)');
      halo.addColorStop(1, 'rgba(255,140,140,0)');
      c.fillStyle = halo;
      c.fillRect(0, 0, w, h);
      const disc = c.createLinearGradient(0, h * 0.25, 0, h * 0.75);
      disc.addColorStop(0, '#fff1b0');
      disc.addColorStop(0.5, '#ffb35c');
      disc.addColorStop(1, '#ff7a6b');
      c.fillStyle = disc;
      c.beginPath();
      c.arc(w / 2, h / 2, w * 0.22, 0, PI * 2);
      c.fill();
    });
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    sun.scale.setScalar(3.0);
    sun.position.set(-15.4, SEA + 0.3, 27.6);
    // Sparkles on the water between the sun and the bench (they twinkle by colour, so one draw call)
    const SPARK = 34;
    const sparkPos = [];
    const sparkPh = [];
    for (let i = 0; i < SPARK; i++) {
      const u = Math.random();
      sparkPos.push(new THREE.Vector3(lerp(-14.2, -10.6, u) + (Math.random() - 0.5) * 0.4, SEA + 0.04, lerp(27.6, 28.3, u) + (Math.random() - 0.5) * (0.4 + u * 1.2)));
      sparkPh.push([Math.random() * 6.28, 2 + Math.random() * 4]);
    }
    const sparkGeo = new THREE.BufferGeometry().setFromPoints(sparkPos);
    sparkGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(SPARK * 3), 3));
    const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size: 0.42, map: M.dotTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sparks.frustumCulled = false;
    const moonTex = util.canvasTexture(128, 128, (c, w, h) => {
      const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,252,236,1)');
      gr.addColorStop(0.3, 'rgba(250,244,220,1)');
      gr.addColorStop(0.36, 'rgba(210,220,255,0.35)');
      gr.addColorStop(1, 'rgba(180,200,255,0)');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(220,214,190,0.8)';
      for (const [x, y, r] of [[54, 56, 6], [72, 70, 4], [62, 78, 3]]) {
        c.beginPath();
        c.arc(x, y, r, 0, PI * 2);
        c.fill();
      }
    });
    g.add(dyn(sun), dyn(sparks));
    const sunset = { on: 0, want: 0, night: false };

    // ------------------------------------------------ relaxed fishing off the T-head
    const rodMat = util.mat('#3f7bf0', { rough: 0.5 });
    const rodMat2 = util.mat('#ef5b6f', { rough: 0.5 });
    const makeRod = (m) => {
      const pivot = new THREE.Group();
      const r = util.mesh(new THREE.CylinderGeometry(0.016, 0.032, 1.9, 6), m);
      r.position.y = 0.95;
      const reel = util.mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 10), util.mat('#3d4a52', { metal: 0.4, rough: 0.4 }));
      reel.rotation.z = PI / 2;
      reel.position.set(0.04, 0.22, 0);
      const tip = new THREE.Object3D();
      tip.position.y = 1.9;
      pivot.add(r, reel, tip);
      pivot.visible = false;
      g.add(dyn(pivot));
      return { pivot, tip };
    };
    const floatGeo = new THREE.SphereGeometry(0.07, 12, 8);
    const makeFloat = () => {
      const f = new THREE.Group();
      const top = util.mesh(floatGeo, util.mat('#ef5b6f', { rough: 0.4 }), { cast: false });
      const bot = util.mesh(floatGeo, util.mat('#ffffff', { rough: 0.4 }), { cast: false });
      top.scale.set(1, 0.8, 1);
      bot.scale.set(1, 0.8, 1);
      top.position.y = 0.04;
      bot.position.y = -0.04;
      f.add(top, bot);
      f.visible = false;
      g.add(dyn(f));
      return f;
    };
    const lineMat = new THREE.LineBasicMaterial({ color: '#f4f1ea', transparent: true, opacity: 0.85 });
    const makeLine = () => {
      const geo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 10 }, () => new THREE.Vector3()));
      const l = new THREE.Line(geo, lineMat);
      l.frustumCulled = false;
      l.visible = false;
      g.add(dyn(l));
      return l;
    };
    const setLine = (line, a, b, sag) => {
      const p = line.geometry.attributes.position;
      for (let i = 0; i < 10; i++) {
        const u = i / 9;
        p.setXYZ(i, lerp(a.x, b.x, u), lerp(a.y, b.y, u) - Math.sin(u * PI) * sag, lerp(a.z, b.z, u));
      }
      p.needsUpdate = true;
    };
    const bucket = new THREE.Group();
    bucket.add(k.at(k.cyl(0.19, 0.15, 0.3, '#8fd3ff', 14), 0, 0.15, 0));
    bucket.add(k.at(k.rot(k.tor(0.19, 0.015, '#3d4a52', PI, undefined, 12, 4), 0, 0, 0), 0, 0.3, 0));
    bucket.add(k.at(k.cyl(0.17, 0.17, 0.02, '#5fb8e0', 14), 0, 0.27, 0));
    bucket.visible = false;
    add(bucket, -1.75, DECK, 30.05);
    dyn(bucket);
    const fishers = ['roji', 'homama'].map((who, i) => ({
      who,
      x: -3.55 + i * 1.1,
      rod: makeRod(i ? rodMat : rodMat2),
      float: makeFloat(),
      line: makeLine(),
      state: 'wait',
      t: 0,
      next: 3 + i * 2.5 + Math.random() * 3,
      cheer: 0,
      catchObj: null,
      from: new THREE.Vector3(),
    }));
    const relax = { on: false, caught: 0, inBucket: [] };
    const POOL = ['sardine', 'sardine', 'mackerel', 'mackerel', 'seabream', 'clownfish', 'puffer', 'starfish', 'crab', 'boot', 'duck', 'seabass'];

    // ------------------------------------------------ the rowing trip
    const route = new THREE.CatmullRomCurve3(ROUTE.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
    const routeLen = route.getLength();
    const trip = { on: false, s: 0, speed: 0, rest: 0, rested: false, back: false, phase: 0, oarOut: 0, hearts: 0 };

    // ------------------------------------------------ shared bits
    let bellSwing = { t: 99, amp: 0 };
    const bellRings = [];
    let flash = 0;
    let parcel = null;
    let parcelTimer = null;
    const lerpAngle = (a, b, kk) => {
      let d = ((b - a + PI) % (PI * 2)) - PI;
      if (d < -PI) d += PI * 2;
      return a + d * kk;
    };

    // ---------------------------------------------------------------- activities
    function startRelax() {
      relax.on = true;
      relax.caught = 0;
      for (const f of fishers) {
        f.state = 'wait';
        f.t = 0;
        f.next = 3 + Math.random() * 4 + (f.who === 'homama' ? 1.5 : 0);
        f.rod.pivot.visible = f.float.visible = f.line.visible = true;
        f.rod.pivot.position.set(f.x + 0.02, DECK + 0.4, 30.5);
        f.rod.pivot.rotation.set(0.6, 0, f.who === 'roji' ? 0.38 : -0.38);
        f.float.position.set(f.x + (f.who === 'roji' ? -0.75 : 0.75), SEA + 0.02, 32.4 + (f.who === 'roji' ? 0 : 0.35));
      }
      bucket.visible = true;
      api.activity({
        label: 'Stop fishing',
        seats: fishers.map((f) => ({ who: f.who, x: f.x, z: 30.22, y: DECK - 0.13, yaw: 0, pose: 'sit', hands: 'read' })),
        focus: { x: -2.9, z: 30.6, y: 0.1, zoom: 0.55 },
        exit: { x: -3.4, z: 29.1 },
        onEnd: () => {
          relax.on = false;
          for (const f of fishers) {
            f.rod.pivot.visible = f.float.visible = f.line.visible = false;
            if (f.catchObj) f.catchObj.removeFromParent();
            f.catchObj = null;
          }
          for (const o of relax.inBucket) o.removeFromParent();
          relax.inBucket.length = 0;
          bucket.visible = false;
          if (relax.caught) say(relax.caught === 1 ? 'One catch together. The fish went back home with a story.' : `${relax.caught} catches together. They let the fish go home.`, 3000);
        },
      });
    }

    function updateRelax(dt, t) {
      for (const f of fishers) {
        const a = api[f.who];
        f.t += dt;
        const fx = f.float.position;
        const bobY = SEA + 0.02 + Math.sin(t * 2.1 + f.x) * 0.02;
        if (f.state === 'wait') {
          fx.y = bobY;
          if (f.t > f.next) {
            f.state = 'nibble';
            f.t = 0;
          }
        } else if (f.state === 'nibble') {
          fx.y = bobY - (Math.sin(f.t * 22) > 0.6 ? 0.04 : 0);
          if (f.t > 1.1) {
            f.state = 'bite';
            f.t = 0;
            api.sound.ctx && api.sound.tone(520, api.sound.ctx.currentTime, 0.12, { type: 'sine', gain: 0.04, slideTo: 300 });
          }
        } else if (f.state === 'bite') {
          fx.y = bobY - 0.12;
          if (f.t > 0.45) {
            f.state = 'reel';
            f.t = 0;
            a.kid.hands = 'stir';
          }
        } else if (f.state === 'reel') {
          const kk = Math.min(1, f.t / 1.3);
          fx.z = lerp(fx.z, 31.2, dt * 2.5);
          fx.y = bobY - 0.08 + Math.sin(f.t * 30) * 0.02;
          if (kk >= 1) {
            // Out it comes: a fish flies up into the bucket
            const id = POOL[Math.floor(Math.random() * POOL.length)];
            const fish = makeFish(id);
            const sz = FISH_BY_ID[id].size;
            fish.scale.setScalar(Math.min(0.42, ((sz[0] + sz[1]) / 200) * 0.9));
            fish.position.copy(fx);
            g.add(fish);
            f.catchObj = fish;
            f.from.copy(fx);
            f.state = 'catch';
            f.t = 0;
            f.fishId = id;
            fx.y = -10;
            api.sound.ui('pop');
          }
        } else if (f.state === 'catch') {
          const kk = Math.min(1, f.t / 0.9);
          const o = f.catchObj;
          tmp.set(-1.75, DECK + 0.32, 30.05);
          o.position.lerpVectors(f.from, tmp, kk);
          o.position.y += Math.sin(kk * PI) * 1.6;
          o.rotation.z = kk * PI * 2;
          if (kk >= 1) {
            relax.caught++;
            a.kid.hands = 'wave2';
            f.cheer = 1.3;
            const info = FISH_BY_ID[f.fishId];
            const n = info.name.toLowerCase();
            const art = /^[aeiou]/.test(n) ? 'an' : 'a';
            const other = api[f.who === 'roji' ? 'homama' : 'roji'];
            if (f.fishId === 'boot') say(`${nameOf(f.who)} caught an old boot! ${f.who === 'homama' ? 'He says it is exactly his size.' : 'Homama says it is exactly his size.'}`);
            else say(`${nameOf(f.who)} caught ${art} ${n}!`, 2000);
            if (f.who === 'homama' && relax.caught % 3 === 0) {
              // He saves the best one for her
              api.fx.heartsAt(other.kid.root.position.clone().setY(DECK + 1.4), 4);
            }
            api.sound.ui(info.junk ? 'tap' : 'coin');
            o.rotation.set(-PI / 2, 0, Math.random() * PI);
            o.scale.multiplyScalar(0.55);
            o.position.set(-1.75 + (Math.random() - 0.5) * 0.12, DECK + 0.3 + relax.inBucket.length * 0.015, 30.05 + (Math.random() - 0.5) * 0.12);
            relax.inBucket.push(o);
            if (relax.inBucket.length > 4) relax.inBucket.shift().removeFromParent();
            f.catchObj = null;
            f.state = 'wait';
            f.t = 0;
            f.next = 5 + Math.random() * 6;
            fx.set(f.x + (f.who === 'roji' ? -0.75 : 0.75) + (Math.random() - 0.5) * 0.3, SEA + 0.02, 32.2 + Math.random() * 0.6);
          }
        }
        if (f.cheer > 0) {
          f.cheer -= dt;
          if (f.cheer <= 0) a.kid.hands = 'read';
        }
        // Rod: tilts toward the float, dips on a bite
        const bend = f.state === 'bite' ? 0.32 : f.state === 'reel' ? 0.22 + Math.sin(f.t * 18) * 0.05 : f.state === 'nibble' ? 0.06 : 0;
        f.rod.pivot.rotation.x = damp(f.rod.pivot.rotation.x, 0.6 + bend * 1.3 - (f.state === 'catch' ? 0.35 : 0), 10, dt);
        f.rod.pivot.updateMatrixWorld(true);
        f.rod.tip.getWorldPosition(tmp);
        g.worldToLocal(tmp);
        tmp2.copy(fx);
        f.line.visible = fx.y > -5;
        setLine(f.line, tmp, tmp2, f.state === 'wait' || f.state === 'nibble' ? 0.25 : 0.02);
      }
    }

    function startTrip() {
      trip.on = true;
      trip.s = 0;
      trip.speed = 0;
      trip.rest = 0;
      trip.rested = false;
      trip.hearts = 0;
      trip.back = false;
      rowRopes.visible = false;
      const seatSpec = (who) => {
        const p = seatWorld(who);
        return { who, x: p.x, z: p.z, y: p.y, yaw: p.yaw, pose: 'sit' };
      };
      api.activity({
        label: 'Back to the jetty',
        endOnMove: false,
        seats: [seatSpec('homama'), seatSpec('roji')],
        focus: { x: SPOT.row.x, z: SPOT.row.z, y: SEA + 0.6, zoom: 0.72 },
        exit: { x: 3.2, z: 20.2 },
        music: 0.75,
        onEnd: () => {
          trip.on = false;
          trip.back = trip.s < routeLen - 0.05;
          api.homama.kid.body.rotation.x = 0;
        },
      });
      say(api.playerId === 'homama' ? 'Homama rows the little boat Roji out to sea.' : 'Homama rows you out in the little boat named after you.', 2800);
    }

    // Seat in the rowing boat, in local place coordinates: Homama rows facing the stern, Roji faces him.
    function seatWorld(who) {
      const b = rowB.root;
      b.updateMatrixWorld(true);
      tmp.set(0, M.ROW.seatY - 0.13 + 0.03, who === 'homama' ? M.ROW.rowZ + 0.05 : M.ROW.sternZ + 0.05);
      b.localToWorld(tmp);
      g.worldToLocal(tmp);
      return { x: tmp.x, y: tmp.y, z: tmp.z, yaw: b.rotation.y + (who === 'homama' ? PI : 0) };
    }

    function updateTrip(dt, t) {
      // Speed: ease out of the mooring, a little rest far out, ease back in
      const left = routeLen - trip.s;
      let want = 1.15;
      if (trip.s < 1.5) want = 0.5 + trip.s * 0.45;
      if (left < 3) want = Math.max(0.18, left * 0.38);
      if (!trip.rested && trip.s > routeLen * 0.47) {
        trip.rested = true;
        trip.rest = 3.4;
      }
      if (trip.rest > 0) {
        trip.rest -= dt;
        want = 0.25;
        trip.hearts -= dt;
        if (trip.hearts <= 0) {
          trip.hearts = 1.1;
          const r = api.roji.kid.root.position;
          const h = api.homama.kid.root.position;
          api.fx.heartsAt(tmp.lerpVectors(r, h, 0.5).setY(r.y + 1.3), 3);
        }
      }
      trip.speed = damp(trip.speed, want, 2, dt);
      trip.s = Math.min(routeLen, trip.s + trip.speed * dt);
      const rowing = trip.rest <= 0 && trip.s > 0.8 && left > 1.6;
      trip.oarOut = damp(trip.oarOut, rowing ? 1 : 0, 3, dt);
      trip.phase += dt * (rowing ? 2.6 : 0.6);
      placeBoat(trip.s, dt);
      if (trip.s >= routeLen - 0.12) api.endActivity();
    }

    function placeBoat(s, dt, fast = false) {
      const u = clamp(s / routeLen, 0, 1);
      const p = route.getPointAt(u);
      const tan = route.getTangentAt(u);
      let yaw = Math.atan2(tan.x, tan.z);
      // Turn alongside the jetty at both ends
      const ends = Math.min(s, routeLen - s);
      if (ends < 2.4) yaw = lerpAngle(PI / 2, yaw, ends / 2.4);
      rowB.x = p.x;
      rowB.z = p.z;
      rowB.yaw = util.dampAngle(rowB.yaw, yaw, fast ? 6 : 4, dt);
    }

    // ---------------------------------------------------------------- bottle scene
    function startBottle() {
      if (!bottleState.here) return;
      const H = { x: -9.4, z: 29.15 };
      const R = { x: -8.72, z: 28.95 };
      const st = { t: 0, step: 0 };
      api.activity({
        label: 'Walk on',
        endOnMove: false,
        seats: [
          { who: 'homama', x: H.x, z: H.z, y: DECK, yaw: -PI / 2, pose: 'stand', hands: null },
          { who: 'roji', x: R.x, z: R.z, y: DECK, yaw: -PI / 2 + 0.35, pose: 'stand', hands: null },
        ],
        focus: { x: -9.5, z: 28.9, y: 0.7, zoom: 0.5 },
        exit: { x: -8.2, z: 29.4 }, // clear deck, away from the sunset bench (which you could end up standing on)
        update: (dt) => {
          st.t += dt;
          const ho = api.homama;
          const ro = api.roji;
          if (st.step === 0) {
            // Homama leans over the rail and fishes the bottle out
            ho.kid.hands = st.t > 0.3 ? 'hold' : null;
            const kk = Math.min(1, st.t / 1.5);
            bottleHolder.position.x = lerp(SPOT.bottle.x, -10.25, kk);
            bottleHolder.position.z = lerp(SPOT.bottle.z, H.z, kk);
            bottleHolder.position.y = SEA + Math.max(0, (kk - 0.55) / 0.45) * (DECK + 0.6 - SEA);
            if (kk >= 1) {
              st.step = 1;
              st.t = 0;
              bottleHolder.position.set(0, 0, 0);
              bottleHolder.rotation.set(0, 0, 0);
              api.carry('homama', bottleHolder);
              bottle.rotation.set(0, PI / 2, 0.4);
              api.sound.ui('pop');
              say('Homama finds a bottle. He looks very surprised. A little too surprised.', 3000);
            }
          } else if (st.step === 1) {
            ho.yaw = util.dampAngle(ho.yaw, PI / 2, 5, dt);
            ro.yaw = util.dampAngle(ro.yaw, -PI / 2, 5, dt);
            if (st.t > 1.6) {
              st.step = 2;
              st.t = 0;
              api.carry('homama', null);
              api.carry('roji', bottleHolder);
              ro.kid.hands = 'read';
            }
          } else if (st.step === 2 && st.t > 0.8) {
            st.step = 3;
            const note = NOTES[bottleState.note];
            api.choose({ title: 'A letter in a bottle', text: note, options: [{ id: 'keep', label: 'Keep it close' }] }).then(() => {
              if (!api.activityRunning) return;
              st.step = 4;
              st.t = 0;
              api.carry('roji', null);
              ro.kid.hands = null;
              ho.kid.hands = null;
              const hp = api.world(H.x + 0.55, H.z);
              ro.pos.set(hp.x, 0, hp.z);
              ho.yaw = PI / 2;
              ro.yaw = -PI / 2;
              api.emote('roji', 'hug');
              api.emote('homama', 'hug');
              api.fx.heartsAt(ro.kid.root.position.clone().setY(DECK + 1.5), 6);
            });
          } else if (st.step === 4 && st.t > 2.6) {
            st.step = 5;
            api.endActivity();
          }
        },
        onEnd: () => {
          for (const w of ['roji', 'homama']) if (api[w].kid.carried === bottleHolder) api.carry(w, null);
          bottleHolder.removeFromParent();
          g.add(bottleHolder);
          bottleHolder.visible = false;
          bottleState.here = false;
          bottleState.back = 90;
          bottleState.note = (bottleState.note + 1) % NOTES.length;
          api.save('note', bottleState.note);
        },
      });
    }

    // ---------------------------------------------------------------- sunset on the bench
    function startSunset() {
      const night = glow() > 0.55;
      sunset.night = night;
      sun.material.map = night ? moonTex : sunTex;
      sun.material.needsUpdate = true;
      const st = { t: 0, leaned: 0 };
      sunset.want = 1;
      api.activity({
        label: 'Get up',
        seats: [
          { who: 'roji', ...benchAt(0.42, 0.03), y: DECK + 0.345, yaw: BY, pose: 'sit' },
          { who: 'homama', ...benchAt(-0.42, 0.03), y: DECK + 0.345, yaw: BY, pose: 'sit' },
        ],
        focus: { x: -10.4, z: 28.2, y: 0.4, zoom: 0.6 },
        exit: { x: -7.6, z: 27.3 },
        night: night ? undefined : 0.32,
        music: 0.7,
        update: (dt) => {
          st.t += dt;
          sunset.lean = st.t > 3.5 ? Math.min(1, (st.t - 3.5) * 1.5) : 0;
          if (st.t > 6.5 && !st.hearts) {
            st.hearts = true;
            const r = api.roji.kid.root.position;
            api.fx.heartsAt(tmp.copy(r).lerp(api.homama.kid.root.position, 0.5).setY(r.y + 1.35), 5);
          }
          if (st.t > 10 && !st.gulls) {
            st.gulls = true;
            gulls.scatter(-6, 26, 30);
          }
        },
        onEnd: () => {
          sunset.want = 0;
          sunset.lean = 0;
          for (const w of ['roji', 'homama']) api[w].kid.body.rotation.z = 0;
        },
      });
      say(night ? 'The moon comes up over the water.' : 'The sun sinks into the sea, all orange and pink.', 2600);
    }

    // ---------------------------------------------------------------- feed the gulls
    function feedGulls() {
      if (gulls.feeding) return;
      const me = api.localPos(api.player);
      crumbList.length = 0;
      const spots = [];
      for (let i = 0; i < 14; i++) {
        let x;
        let z;
        do {
          x = SPOT.feed.x + (Math.random() - 0.5) * 3.2;
          z = SPOT.feed.z + (Math.random() - 0.5) * 3.0;
        } while (Math.hypot(x - me.x, z - me.z) < 0.9 || z > 30.1 || z < 26.4 || x > 3.6 || x < -2.0);
        crumbList.push({ x, z, life: 6 + Math.random() * 3 });
        crumbs.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, DECK + 0.012, z).multiply(new THREE.Matrix4().makeRotationY(Math.random() * 3)));
        if (i % 2 === 0) spots.push({ x, z });
      }
      crumbs.instanceMatrix.needsUpdate = true;
      gulls.feed(spots, DECK, 9);
      api.emote('player', 'wave');
      setTimeout(() => api.emote('partner', 'cheer'), 1600);
      api.sound.ui('swoosh');
    }

    // ---------------------------------------------------------------- the fishmonger
    async function buyFish() {
      const payer = 'homama';
      const id = await api.choose({
        title: 'Fresh from the sea',
        text: 'What would you like today?',
        options: [
          { id: 'sardine', label: 'A bag of sardines', sub: 'For the grill tonight' },
          { id: 'seabream', label: 'A sea bream', sub: "The fishmonger's favourite" },
          { id: 'octopus', label: 'An octopus', sub: 'Something new to cook together' },
          { id: 'none', label: 'Just looking', sub: 'Say hello and wave' },
        ],
      });
      if (!id) return;
      if (id === 'none') {
        fm.emote('wave');
        say('The fishmonger waves. "Come back in the morning, it is all fresh then!"');
        return;
      }
      monger.weigh = { id, t: 0, payer };
      const f = makeFish(id);
      f.scale.setScalar(id === 'sardine' ? 0.2 : 0.4);
      if (id !== 'octopus') f.rotation.set(-PI / 2, 0, 0.3);
      f.position.y = id === 'octopus' ? 0.03 : 0.05;
      mk.pan.add(f);
      monger.weigh.fish = f;
      api.sound.ui('tap');
    }

    function wrapParcel(id) {
      const p = new THREE.Group();
      p.add(k.at(k.rbox(0.34, 0.14, 0.2, '#f6ecd8', 0.04), 0, 0, 0));
      p.add(k.at(k.box(0.35, 0.02, 0.025, C.rose), 0, 0.0, 0), k.at(k.box(0.025, 0.15, 0.205, C.rose), 0, 0, 0));
      p.add(k.at(k.sph(0.035, C.rose, undefined, 8), 0, 0.08, 0));
      const mini = makeFish(id);
      mini.scale.setScalar(0.08);
      mini.position.set(0.1, 0.075, 0.07);
      p.add(mini);
      return p;
    }

    function updateMonger(dt, t) {
      const me = api.localPos(api.player);
      const dx = me.x - FM.x;
      const dz = me.z - FM.z;
      const d = Math.hypot(dx, dz);
      let want = 0;
      if (monger.weigh) want = -PI / 2 + 0.35;
      else if (d < 7) want = clamp(Math.atan2(dx, dz), -0.8, 0.8);
      monger.yaw = util.dampAngle(monger.yaw, want, 4, dt);
      fm.root.rotation.y = monger.yaw;
      monger.waveIn -= dt;
      if (d < 4.5 && monger.waveIn <= 0 && !monger.weigh) {
        fm.emote('wave');
        monger.waveIn = 30;
      }
      monger.stir -= dt;
      if (!monger.weigh) fm.hands = monger.stir < 0 && monger.stir > -2.2 ? 'stir' : null;
      if (monger.stir < -2.2) monger.stir = 5 + Math.random() * 6;
      // Weighing: the needle swings, then the parcel goes to Homama
      const w = monger.weigh;
      let needle = 0;
      if (w) {
        w.t += dt;
        fm.hands = 'hold';
        const target = w.id === 'sardine' ? 0.6 : w.id === 'seabream' ? 1.4 : 2.0;
        needle = target * (1 - Math.exp(-w.t * 3)) * (1 + Math.sin(w.t * 12) * Math.exp(-w.t * 2) * 0.3);
        if (w.t > 2.0 && !w.done) {
          w.done = true;
          w.fish.removeFromParent();
          if (parcel) api.carry(api.homama.kid.carried === parcel ? 'homama' : 'roji', null);
          parcel = wrapParcel(w.id);
          api.carry('homama', parcel);
          api.sound.ui('good');
          fm.hands = null;
          fm.emote('wave');
          say(api.playerId === 'homama' ? 'Wrapped and ready. You carry it home for Roji.' : 'Wrapped and ready. Homama insists on carrying it home.', 2800);
          clearTimeout(parcelTimer);
          const mine = parcel;
          parcelTimer = setTimeout(() => {
            if (api.homama.kid.carried === mine) api.carry('homama', null);
            if (parcel === mine) parcel = null;
          }, 45000);
        }
        if (w.t > 2.6) monger.weigh = null;
      }
      mk.needle.rotation.z = damp(mk.needle.rotation.z, -needle, 8, dt);
      mk.pan.position.y = mk.scale.y - needle * 0.02;
      fm.update(dt, t, 0, 0, 0);
    }

    // ---------------------------------------------------------------- the bell
    function ringBell() {
      bellSwing = { t: 0, amp: 0.55 };
      const s = api.sound;
      if (s.ctx) {
        const now = s.ctx.currentTime;
        bellTone(s, now, 660, 0.09);
        bellTone(s, now + 0.42, 660, 0.07);
        s.tone(147, now + 1.1, 0.5, { type: 'square', gain: 0.03 });
        s.tone(196, now + 1.1, 0.5, { type: 'square', gain: 0.03 });
      }
      gulls.scatter(SPOT.bell.x, SPOT.bell.z, 12);
      const now = performance.now();
      bellRings.push(now);
      while (bellRings.length && now - bellRings[0] > 5000) bellRings.shift();
      if (bellRings.length >= 3) {
        bellRings.length = 0;
        flash = 2.4;
        setTimeout(() => say('The lighthouse blinks back at you. Twice.', 2400), 600);
      }
    }

    // ---------------------------------------------------------------- dev lawn: show the sea
    let devWater = null;
    const holes = [];
    if (DEV) {
      devWater = util.mesh(new THREE.PlaneGeometry(40, 22), new THREE.MeshStandardMaterial({ color: '#6fc9d4', roughness: 0.35 }), { cast: false });
      devWater.rotation.x = -PI / 2;
      devWater.position.set(0, SEA, 24.6);
      g.add(devWater);
      holes.push({ x: 0, z: 24.4, hw: 20, hd: 10.6 });
    }

    // ---------------------------------------------------------------- hotspots
    const hotspots = [
      { x: SPOT.market.x + 1.6, z: SPOT.market.z + 1.45, r: 1.6, label: 'Buy fish', icon: 'harbour-fish', act: () => buyFish(), when: () => !monger.weigh },
      { x: -3, z: 29.35, r: 1.3, label: 'Go fishing', icon: 'harbour-fish', act: async () => {
          let pick = 'relax';
          if (api.hasArena('fishing')) {
            pick = await api.choose({
              title: 'Go fishing',
              text: 'Sit on the end of the pier together, or play the fishing game.',
              options: [
                { id: 'relax', label: 'Fish together', sub: 'Sit on the edge and see what bites' },
                { id: 'game', label: 'Harbour Fishing', sub: 'Cast, reel and fill your fish book' },
              ],
            });
          }
          if (pick === 'game') api.playArena('fishing');
          else if (pick === 'relax') startRelax();
        } },
      { x: SPOT.row.x, z: 20.45, r: 1.3, label: 'Take the rowing boat', icon: 'harbour-boat', act: () => startTrip(), when: () => !trip.on && !trip.back },
      { x: SPOT.feed.x, z: SPOT.feed.z - 0.6, r: 1.3, label: 'Feed the seagulls', icon: 'harbour-gull', act: () => feedGulls(), when: () => !gulls.feeding },
      { x: SPOT.bell.x, z: SPOT.bell.z - 0.85, r: 1.2, label: 'Ring the bell', icon: 'harbour-bell', act: () => ringBell() },
      { ...benchAt(0, -1.0), r: 1.2, label: () => (glow() > 0.55 ? 'Watch the moon rise' : 'Watch the sunset'), icon: 'harbour-sun', act: () => startSunset() },
      { x: -9.25, z: 29.75, r: 1.1, label: 'Fish out the bottle', icon: 'harbour-bottle', act: () => startBottle(), when: () => bottleState.here },
    ];

    if (DEV || /capture/.test(location.search)) window.__harbour = { trip, fishers, relax, gulls, bottleState, monger, sunset, glow, startTrip, routeLen };

    // Anything that is not moving stays merged: a few vertex-coloured meshes for the whole harbour
    colorBake(g, dynamic);

    return {
      group: g,
      dynamic,
      colliders,
      walk,
      ground,
      holes,
      hotspots,
      update(dt, t) {
        people.length = 0;
        const pp = api.localPos(api.player);
        const cp = api.localPos(api.partner);
        people.push(pp, cp);
        const night = glow();

        // Boats bob; the rowing boat follows its trip
        for (const b of boats) {
          const y = Math.sin(t * 1.1 + b.phase) * 0.045 * b.amp;
          b.root.position.set(b.x, SEA + b.lift + y, b.z);
          b.root.rotation.set(Math.sin(t * 0.8 + b.phase) * 0.02 * b.amp, b.yaw, Math.sin(t * 1.3 + b.phase) * 0.035 * b.amp);
        }
        if (trip.on) updateTrip(dt, t);
        else if (trip.back) {
          // Nobody aboard: it glides home along the route
          trip.s = Math.min(routeLen, trip.s + dt * 3.2);
          trip.oarOut = damp(trip.oarOut, 0, 3, dt);
          placeBoat(trip.s, dt, true);
          if (trip.s >= routeLen) {
            trip.back = false;
            rowB.x = SPOT.row.x;
            rowB.z = SPOT.row.z;
          }
        } else {
          rowB.yaw = util.dampAngle(rowB.yaw, PI / 2, 2, dt);
          rowRopes.visible = Math.abs(rowB.x - SPOT.row.x) < 0.05;
          if (!rowRopes.visible) {
            rowB.x = damp(rowB.x, SPOT.row.x, 3, dt);
            rowB.z = damp(rowB.z, SPOT.row.z, 3, dt);
          }
        }
        // Oars: stowed along the hull, or rowing in long slow strokes
        const ph = trip.phase;
        for (const o of row.oars) {
          const out = trip.oarOut;
          o.pivot.rotation.y = lerp(o.side * 1.28, o.side * Math.sin(ph) * 0.5, out);
          o.arm.rotation.z = lerp(-o.side * 0.12, -o.side * (0.32 + Math.cos(ph) * 0.16), out);
        }
        if (trip.on) {
          rowB.root.updateMatrixWorld(true);
          for (const who of ['homama', 'roji']) {
            const s = seatWorld(who);
            const a = api[who];
            const wp = api.world(s.x, s.z, s.y);
            a.kid.root.position.copy(wp);
            a.kid.root.rotation.set(0, s.yaw, 0);
            a.pos.set(wp.x, 0, wp.z);
            a.yaw = s.yaw;
          }
          // Homama pulls the oars: arms and body in time with the strokes
          const hk = api.homama.kid;
          const k2 = trip.oarOut;
          hk.arms[0].rotation.set(-1.25 + Math.sin(ph + PI / 2) * 0.5 * k2, 0, 0.25);
          hk.arms[1].rotation.set(-1.25 + Math.sin(ph + PI / 2) * 0.5 * k2, 0, -0.25);
          hk.body.rotation.x = Math.sin(ph + PI / 2) * 0.16 * k2;
          api.focus({ x: rowB.x, z: rowB.z, y: SEA + 0.6, zoom: 0.72 });
        }

        // Buoys
        const m4 = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const e = new THREE.Euler();
        const one = new THREE.Vector3(1, 1, 1);
        BUOYS.forEach(([x, z], i) => {
          q.setFromEuler(e.set(Math.sin(t * 1.4 + i) * 0.08, i, Math.cos(t * 1.1 + i * 2) * 0.08));
          m4.compose(tmp.set(x, SEA + Math.sin(t * 1.6 + i * 1.3) * 0.06, z), q, one);
          buoyMesh.setMatrixAt(i, m4);
        });
        buoyMesh.instanceMatrix.needsUpdate = true;

        // Foam rings breathe; the ones round boats follow them
        ringSpots.forEach((r, i) => {
          const x = r.boat ? r.boat.x : r.x;
          const z = r.boat ? r.boat.z : r.z;
          const s = r.r * (1 + Math.sin(t * 1.7 + i * 0.9) * 0.08);
          m4.compose(tmp.set(x, SEA + 0.02, z), q.identity(), tmp2.set(s, 1, s * (r.boat ? 1.0 : 1)));
          rings.setMatrixAt(i, m4);
        });
        rings.instanceMatrix.needsUpdate = true;
        ringMat.opacity = 0.32 * (1 - night * 0.7);

        // Lighthouse: beams at dusk and night (and when you ring the bell three times)
        flash = Math.max(0, flash - dt);
        lh.beam.rotation.y = t * 0.6;
        const fl = flash > 0 ? (Math.sin(flash * 7) > 0 ? 0.45 : 0.05) : 0;
        lh.beamMat.opacity = Math.max(fl, THREE.MathUtils.smoothstep(night, 0.15, 0.6) * 0.13 + sunset.on * 0.1);
        lh.beam.visible = lh.beamMat.opacity > 0.01;
        haloMat.opacity = THREE.MathUtils.smoothstep(night, 0.1, 0.6) * 0.75;
        halos.visible = haloMat.opacity > 0.01;
        halo.material.opacity = THREE.MathUtils.smoothstep(night, 0.1, 0.6) * 0.9;

        // Fishing boat flag flutters
        fb.flag.rotation.y = Math.sin(t * 3) * 0.25;

        // Bell
        bellSwing.t += dt;
        bl.pivot.rotation.z = Math.sin(bellSwing.t * 7) * bellSwing.amp * Math.exp(-bellSwing.t * 0.9);

        // Gulls and crumbs
        gulls.update(dt, t, people);
        if (crumbList.length) {
          let any = false;
          crumbList.forEach((c, i) => {
            if (c.life <= 0) return;
            c.life -= dt * (gulls.feeding ? 1 : 3);
            if (c.life <= 0) crumbs.setMatrixAt(i, zero);
            else any = true;
          });
          crumbs.instanceMatrix.needsUpdate = true;
          if (!any) crumbList.length = 0;
        }

        // Crab couple: they walk sideways together, and a heart pops when you are close
        crabState.t += dt;
        pair.position.x = Math.sin(crabState.t * 0.5) * 0.22;
        crabA.position.y = crabB.position.y = 0.03 + Math.abs(Math.sin(crabState.t * 9)) * 0.012;
        const near = Math.hypot(pp.x - SPOT.crabs.x, pp.z - SPOT.crabs.z) < 6;
        crabState.next -= dt;
        if (near && crabState.next <= 0) {
          crabState.heart = 1;
          crabState.next = 7;
        }
        crabState.heart = Math.max(0, crabState.heart - dt * 0.5);
        crabHeart.material.opacity = Math.sin(crabState.heart * PI) * 0.95;
        crabHeart.position.set(pair.position.x, 0.62 + (1 - crabState.heart) * 0.3, 0);

        // Bottle: bobs and drifts in a little circle until someone fishes it out
        if (bottleState.here && !api.activityRunning) {
          bottleHolder.position.set(SPOT.bottle.x + Math.sin(t * 0.3) * 0.35, SEA + 0.04 + Math.sin(t * 1.9) * 0.03, SPOT.bottle.z + Math.cos(t * 0.3) * 0.25);
          bottleHolder.rotation.set(Math.sin(t * 1.3) * 0.15, t * 0.2, 0.2 + Math.sin(t * 1.7) * 0.1);
        } else if (!bottleState.here) {
          bottleState.back -= dt;
          if (bottleState.back <= 0) {
            bottleState.here = true;
            bottleHolder.visible = true;
            bottle.rotation.set(0, 0, 0);
          }
        }

        // Sunset: the sun (or moon) on the water and its glitter path
        sunset.on = damp(sunset.on, sunset.want, 1.5, dt);
        sun.material.opacity = sunset.on;
        sun.visible = sparks.visible = sunset.on > 0.01;
        sun.position.y = sunset.night ? SEA + 1.7 : SEA + 0.45 - sunset.on * 0.2;
        if (sparks.visible) {
          const col = sparkGeo.attributes.color;
          const tint = sunset.night ? [0.75, 0.8, 1] : [1, 0.72, 0.45];
          for (let i = 0; i < SPARK; i++) {
            const b = Math.pow(Math.max(0, Math.sin(t * sparkPh[i][1] + sparkPh[i][0])), 3) * sunset.on;
            col.setXYZ(i, b * tint[0], b * tint[1], b * tint[2]);
          }
          col.needsUpdate = true;
        }
        if (sunset.lean) {
          // Homama rests his head toward Roji; she leans back in
          api.homama.kid.body.rotation.z = -0.12 * sunset.lean;
          api.roji.kid.body.rotation.z = 0.08 * sunset.lean;
        }

        if (relax.on) updateRelax(dt, t);
        updateMonger(dt, t);
      },
    };
  },
};
