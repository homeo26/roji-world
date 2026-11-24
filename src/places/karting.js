import * as THREE from 'three';
import { mat, mesh, canvasTexture, FONT, rng, damp, clamp } from '../util.js';
import * as K from '../arena/riding/kit.js';
import { makeLoop, bends, ribbon, asphaltMaterial, kerbMaterial, checkerMaterial, tyreStacks, waveFlags, gantry, startSequence } from './karting/track.js';
import { makeKart, addHelmet } from './karting/kart.js';
import { C, box, rbox, cyl, ball, at, tree, cone, bush, grandstand, tower, helmetRack, podium, bannerBoard, billboard, heartBed } from './karting/scenery.js';

// Roji World Karting: a small winding track with kerbs and tyre walls, a start gantry with lights,
// a pit lane with everyone's karts (pink for Roji, blue for Homama), a grandstand of fans,
// a race control tower, a helmet rack and a podium. Two karts potter round the track.

const ICON_KART = 'M3 14h18 M8.5 14V9h2.5 M13.5 14l2-4 M6.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M17.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z';
const ICON_FLAG = 'M5 21V4 M5 4.5h12l-2.6 4 2.6 4H5';
const HW = 1.65;
const KART_Y = 0.17; // kid root height when sitting in a kart (local to the kart)

// Rounded-rectangle loop with a gentle dip on the back straight. Karts run clockwise seen from above.
function placeCtrl() {
  const x0 = -12.8;
  const x1 = 13.4;
  const z0 = -10.2;
  const z1 = 4.1;
  const r = 3.4;
  const dip = (x) => (Math.abs(x - 0.3) < 7 ? 2.9 * (Math.cos(((x - 0.3) / 7) * Math.PI) + 1) / 2 : 0);
  const pts = [];
  const arc = (cx, cz, a0, a1) => {
    for (let k = 1; k < 6; k++) {
      const a = a0 + ((a1 - a0) * k) / 6;
      pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
    }
  };
  for (let z = z1 - r; z >= z0 + r; z -= 1.2) pts.push([x0, z]);
  arc(x0 + r, z0 + r, Math.PI, Math.PI * 1.5);
  for (let x = x0 + r; x <= x1 - r; x += 1.0) pts.push([x, z0 + dip(x)]);
  arc(x1 - r, z0 + r, -Math.PI / 2, 0);
  for (let z = z0 + r; z <= z1 - r; z += 1.2) pts.push([x1, z]);
  arc(x1 - r, z1 - r, 0, Math.PI / 2);
  for (let x = x1 - r; x >= x0 + r; x -= 1.2) pts.push([x, z1]);
  arc(x0 + r, z1 - r, Math.PI / 2, Math.PI);
  return pts;
}

const NPC = [
  { name: 'Kai', color: '#3fbf7f', number: 3, helmet: '#2e9a63', look: { id: 'kai', name: 'Kai', gender: 'boy', skin: '#c98f68', hair: '#141010', hairstyle: 'curly', outfit: 'tee-pants', top: '#3fbf7f', bottom: '#2c3e66', shoes: '#3b2b3f', accent: '#ffd166' } },
  { name: 'Mina', color: '#a77bff', number: 4, helmet: '#8b5cf6', look: { id: 'mina', name: 'Mina', gender: 'girl', skin: '#fbe6d8', hair: '#b5773d', hairstyle: 'bob', outfit: 'skirt', top: '#8b5cf6', bottom: '#c7a6ff', shoes: '#7a2e3a', accent: '#c7a6ff' } },
];

export default {
  id: 'karting',
  stop: {
    title: 'Roji World Karting',
    tag: 'Go-kart track',
    icon: 'kart',
    color: '#ef5b6f',
    text: 'Helmets on! Roji and Homama race little karts here. Sit in your own kart for a photo, wave the start flag or race three laps.',
  },
  icons: { kart: ICON_KART, flag: ICON_FLAG },

  build(ctx) {
    const { size } = ctx;
    const g = new THREE.Group();
    const dynamic = [];
    const colliders = [];
    const add = (...o) => (g.add(...o), o[0]);
    const R = rng(21);
    const flowers = [];
    const FLOWER = ['#ff8fb1', '#ffffff', '#ffd75e', '#c7a6ff', '#ff6b6b', '#ffb36b'];

    // ---------------------------------------------------------------- track
    const T = makeLoop(placeCtrl(), 600);
    const START = T.project(-12.8, -2.4).s;
    const asphalt = asphaltMaterial();
    add(mesh(ribbon(T, 0, T.L, -HW, HW, 0.012, { step: 0.35, vLen: 3 }), asphalt, { cast: false }));
    const kerbM = kerbMaterial();
    const corners = bends(T, 0.06, 0.8);
    for (const [a, b] of corners) {
      add(mesh(ribbon(T, a, b, HW - 0.12, HW + 0.32, 0.02, { step: 0.3, vLen: 1.2 }), kerbM, { cast: false }));
      add(mesh(ribbon(T, a, b, -HW + 0.12, -HW - 0.32, 0.02, { step: 0.3, vLen: 1.2 }), kerbM, { cast: false }));
    }
    // Start line, grid boxes and the gantry over it
    const checker = checkerMaterial(10, 2);
    add(mesh(ribbon(T, START - 0.25, START + 0.25, -HW + 0.1, HW - 0.1, 0.018, { step: 0.5, vLen: 1 }), checker, { cast: false }));
    for (const [ds, d] of [[2.2, 0.8], [4.2, -0.8]]) {
      const p = T.at(START - ds, d);
      const yaw = T.yaw(START - ds);
      const line = box(1.1, 0.01, 0.08, C.cream);
      add(at(line, p.x, 0.02, p.z, yaw));
    }
    const sp = T.at(START, 0);
    const gan = gantry({ span: HW * 2 + 0.7, height: 3.3, text: 'START', lamps: 5 });
    gan.group.position.set(sp.x, 0, sp.z);
    add(gan.group);
    dynamic.push(gan.lamps);
    for (const s of [-1, 1]) colliders.push({ type: 'circle', x: sp.x + s * (HW + 0.35), z: sp.z, r: 0.25 });

    // Tyre walls round the outside of the corners, painted tops in party colours
    const tyres = [];
    const tops = [C.rose, C.cream, C.sky, C.sun, C.mint];
    let ti = 0;
    const tyreAt = (x, z, n = 2) => {
      if (Math.abs(x) > size.w / 2 - 0.45 || Math.abs(z) > size.d / 2 - 0.45) return;
      tyres.push({ x, z, n, top: tops[ti++ % tops.length] });
      colliders.push({ type: 'circle', x, z, r: 0.42, h: n * 0.23 });
    };
    for (const [a, b] of corners) {
      const sign = Math.sign(T.bend((a + b) / 2));
      if (b - a < 4) continue;
      for (let s = a + 0.6; s < b - 0.4; s += 0.85) {
        const p = T.at(s, -sign * (HW + 0.95));
        if (p.z > 5.0 && p.x > -9.6) continue; // keep the pit entry clear
        tyreAt(p.x, p.z, 2 + ((s * 7) % 2 > 1 ? 1 : 0));
      }
    }
    // A little tyre pyramid and stacks in the infield
    for (const [x, z, n] of [[-9.6, -6.4, 3], [-8.8, -6.4, 3], [-9.2, -5.7, 2], [9.7, 1.0, 2], [10.5, 1.0, 3], [4.9, 1.2, 2]]) tyreAt(x, z, n);
    add(tyreStacks(tyres));

    // ---------------------------------------------------------------- pit lane
    const PZ = 7.6; // kart centres
    add(at(box(20.2, 0.02, 3.2, '#b4aec3'), 0.4, 0.011, 7.85));
    for (let x = -9.2; x <= 10.1; x += 1.2) add(at(box(0.5, 0.012, 0.08, C.cream), x, 0.024, 9.6));
    // Pit wall: candy blocks along the track
    for (let x = -9.0, k = 0; x < 9.8; x += 1.2, k++) {
      add(at(rbox(1.16, 0.46, 0.3, k % 2 ? C.cream : C.rose, 0.05), x + 0.6, 0.23, 6.0));
      add(at(rbox(1.18, 0.06, 0.34, k % 2 ? C.rose : C.cream, 0.03), x + 0.6, 0.48, 6.0));
    }
    colliders.push({ type: 'box', x: 0.4, z: 6.0, hw: 9.4, hd: 0.17, h: 0.5 });
    const KARTS = [
      { x: -7.2, color: C.sun, number: 7, flag: C.rose },
      { x: -4.3, color: C.mint, number: 5, flag: C.sun },
      { x: -1.4, color: '#ff8fb1', number: 1, flag: '#ef5b6f', accent: C.cream, who: 'roji' },
      { x: 1.4, color: '#5b9cf5', number: 2, flag: C.sun, accent: C.cream, who: 'homama' },
      { x: 4.3, color: C.peach, number: 6, flag: C.sky },
      { x: 7.2, color: C.lilac, number: 8, flag: C.mint },
    ];
    const parked = {};
    for (const k of KARTS) {
      const kart = makeKart({ color: k.color, number: k.number, flag: k.flag, accent: k.accent || C.cream });
      kart.root.position.set(k.x, 0, PZ);
      add(kart.root);
      colliders.push({ type: 'box', x: k.x, z: PZ, hw: 0.76, hd: 1.05 });
      if (k.who) parked[k.who] = { ...k, kart };
    }
    // Bay lines and the painted names on Roji's and Homama's bays
    for (let i = 0; i <= KARTS.length; i++) {
      const x = i < KARTS.length ? KARTS[i].x - 1.45 : KARTS[KARTS.length - 1].x + 1.45;
      add(at(box(0.08, 0.012, 2.6, C.cream), x, 0.024, 7.9));
    }
    add(at(box(2.8, 0.012, 2.6, '#f7b6cb'), -1.4, 0.02, 7.9));
    add(at(box(2.8, 0.012, 2.6, '#a9ccfb'), 1.4, 0.02, 7.9));
    const names = canvasTexture(1024, 128, (c, w, h) => {
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `700 ${Math.round(h * 0.74)}px ${FONT}`;
      c.fillStyle = '#ffffff';
      c.fillText('Roji', w * 0.25, h * 0.56);
      c.fillText('Homama', w * 0.75, h * 0.56);
    });
    const nameMat = new THREE.MeshStandardMaterial({ map: names, roughness: 0.8, alphaTest: 0.5 });
    for (const [x, u] of [[-1.4, 0], [1.4, 0.5]]) {
      const geo = new THREE.PlaneGeometry(1.9, 0.48);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, u + uv.getX(i) * 0.5);
      const m = mesh(geo, nameMat, { cast: false });
      m.rotation.x = -Math.PI / 2;
      add(at(m, x, 0.034, 9.0));
    }

    // Helmet rack and the race desk
    const rack = helmetRack([C.rose, C.sky, C.sun, C.mint, C.lilac, C.peach]);
    add(at(rack, 11.7, 0, 7.5));
    colliders.push({ type: 'box', x: 11.7, z: 7.5, hw: 1.15, hd: 0.25 });
    add(at(cone(), 10.2, 0, 9.4));
    add(at(cone(), 13.3, 0, 9.4));

    // Marshal stand with the flag box
    const MS = { x: -11.5, z: 7.6 };
    add(at(rbox(1.5, 0.42, 1.3, C.cream, 0.06), MS.x, 0.21, MS.z));
    add(at(rbox(1.56, 0.08, 1.36, C.teal, 0.03), MS.x, 0.42, MS.z));
    for (const [x, z] of [[-0.7, -0.6], [0.7, -0.6], [-0.7, 0.6], [0.7, 0.6]]) add(at(cyl(0.035, 0.035, 0.9, C.cream, 6), MS.x + x, 0.88, MS.z + z));
    add(at(rbox(1.5, 0.06, 0.06, C.rose, 0.02), MS.x, 1.3, MS.z - 0.6));
    for (const s of [-1, 1]) {
      const rail = rbox(0.06, 0.06, 1.25, C.rose, 0.02);
      add(at(rail, MS.x + s * 0.7, 1.3, MS.z));
    }
    add(at(rbox(0.36, 0.36, 0.36, C.sky, 0.05), MS.x + 0.45, 0.62, MS.z - 0.35));
    for (const s of [-0.06, 0.06]) add(at(cyl(0.015, 0.015, 0.9, C.cream, 5), MS.x + 0.45 + s, 1.1, MS.z - 0.35));
    colliders.push({ type: 'box', x: MS.x, z: MS.z, hw: 0.75, hd: 0.65, h: 0.46 });
    const flagCloth = checkerMaterial(6, 4);
    flagCloth.side = THREE.DoubleSide;
    const boxFlags = [];
    for (const s of [-0.06, 0.06]) {
      const f = mesh(new THREE.PlaneGeometry(0.42, 0.3), flagCloth, { cast: false });
      f.geometry.translate(0.21, 0, 0);
      f.position.set(MS.x + 0.45 + s, 1.42, MS.z - 0.35 + s);
      add(f);
      boxFlags.push(f);
      dynamic.push(f);
    }

    // ---------------------------------------------------------------- infield
    const stand = grandstand({ w: 8, tiers: 3 });
    const STAND = { x: 0.5, z: -0.4 };
    add(at(stand.group, STAND.x, 0, STAND.z));
    // The big track sign on top of the stand
    const top = bannerBoard('Roji World Karting', 'Helmets on, have fun!', { w: 6.4, h: 1.25 });
    add(at(top, STAND.x, 4.15, STAND.z + stand.back - 0.1));
    for (const s of [-1, 1]) add(at(cyl(0.06, 0.06, 1.2, C.cream, 8), STAND.x + s * 2.4, 3.3, STAND.z + stand.back - 0.2));
    for (const c of stand.colliders) colliders.push({ ...c, x: c.x + STAND.x, z: c.z + STAND.z });
    for (const x of [-3.5, 4.5]) colliders.push({ type: 'circle', x: STAND.x + (x > 0 ? 4 : -4), z: STAND.z + stand.back - 0.1, r: 0.12 });
    // Fans: a cheering crowd in one draw call (gaps left on the front row for Roji and Homama)
    const fanR = rng(4);
    const kinds = ['cheer', 'wave', 'flag', 'clap', 'cheer', 'flag', 'wave'];
    const fanCols = [C.sun, C.rose, C.sky, C.mint, C.pink];
    const fans = [];
    const fanX = [[-3.3, -2.4, 2.4, 3.3], [-3.0, -1.6, -0.3, 1.2, 2.7], [-2.6, -1.0, 0.6, 2.1, 3.4]];
    let fi = 0;
    fanX.forEach((xs, row) => {
      for (const x of xs) {
        const kid = ctx.makeKid(K.randomLook(fanR, fi));
        kid.root.position.set(STAND.x + x + (fanR() - 0.5) * 0.2, stand.rows[row].top, STAND.z + stand.rows[row].z - 0.12);
        kid.root.rotation.y = (fanR() - 0.5) * 0.4;
        K.poseFan(kid, kinds[fi % kinds.length], fanCols[fi % fanCols.length]);
        // Plain hair colour, so the crowd bake keeps the hair
        kid.root.traverse((o) => {
          if (o.isMesh && o.material.map && o.material.color) o.material = mat('#' + o.material.color.getHexString(), { rough: 0.45 });
        });
        fans.push({ kid });
        fi++;
      }
    });
    const crowd = K.makeCrowd(fans);
    add(crowd.mesh);
    dynamic.push(crowd.mesh);

    // Race control tower, cones and a heart flower bed
    const tw = tower('Race Control');
    add(at(tw.group, -7.4, 0, -3.2));
    colliders.push({ type: 'box', x: -7.4, z: -3.2, hw: 1.2, hd: 1.2 });
    for (const [x, z] of [[-5.6, -1.2], [-5.0, -0.6], [-9.6, -1.4], [6.3, -0.4], [7.0, -1.0]]) add(at(cone(), x, 0, z));
    const heart = heartBed(2.4);
    add(at(heart, 8.4, 0, -2.2));
    colliders.push({ type: 'circle', x: 8.4, z: -3.3, r: 1.1, h: 0.26 });
    for (let i = 0; i < 70; i++) {
      const x = (R() - 0.5) * 2.2;
      const y = R() * 2.2;
      const inside = Math.abs(x) < 1.15 * Math.sin(Math.PI * Math.min(1, (y + 0.1) / 2.3)) + 0.1 * (y > 1.4 ? 1 : 0);
      if (!inside || y < 0.25) continue;
      flowers.push({ x: 8.4 + x, z: -2.2 - y, c: FLOWER[i % 2 ? 0 : Math.floor(R() * FLOWER.length)], h: 0.36 + R() * 0.08 });
    }
    add(at(tree(0.95), 10.0, 0, -6.2));
    colliders.push({ type: 'circle', x: 10.0, z: -6.2, r: 0.3 });
    add(at(bush(0.9), 5.2, 0, -5.6));
    add(at(bush(0.7, C.leafDark), -4.6, 0, -6.4));

    // ---------------------------------------------------------------- back and sides
    const goR = billboard('Go Roji!', C.rose);
    add(at(goR, -3.6, 0, -11.7));
    const goH = billboard('Go Homama!', C.blue);
    add(at(goH, 4.2, 0, -11.7));
    for (const x of [-3.6, 4.2]) for (const s of [-1, 1]) colliders.push({ type: 'circle', x: x + s * 1.0, z: -11.78, r: 0.1 });
    K.bunting(g, new THREE.Vector3(-2.2, 2.4, -11.7), new THREE.Vector3(2.8, 2.4, -11.7), { n: 9, sag: 0.35 });
    for (const [x, z, s, k] of [[-14.9, -12.0, 1.0, 'round'], [15.0, -11.9, 1.05, 'blossom'], [-0.4, -12.2, 0.75, 'blossom'], [15.1, 10.3, 0.85, 'round'], [-15.1, 11.4, 0.8, 'blossom']]) {
      add(at(tree(s, k), x, 0, z));
      colliders.push({ type: 'circle', x, z, r: 0.3 * s });
    }
    for (const [x, z, s] of [[-12.4, -12.4, 0.8], [12.0, -12.5, 0.9], [7.6, -12.5, 0.7], [-7.8, -12.4, 0.75]]) add(at(bush(s, s > 0.78 ? C.leaf : C.leafDark), x, 0, z));

    // ---------------------------------------------------------------- front: sign, podium, flags
    const wood = ctx.sign(['Welcome to', 'Roji World Karting'], { width: 3.3, height: 1.15, accent: C.rose, postHeight: 0.8 });
    add(at(wood, -6.2, 0, 11.6));
    colliders.push({ type: 'box', x: -6.2, z: 11.55, hw: 1.35, hd: 0.15 });
    const pod = podium(1);
    add(at(pod.group, 12.4, 0, 11.4));
    pod.xs.forEach((x, i) => colliders.push({ type: 'box', x: 12.4 + x, z: 11.4, hw: 0.5, hd: 0.5, h: pod.heights[i] + 0.03 }));
    // Flag poles along the street
    const poles = [-14.4, -11.6, -8.8, -4.0, 4.0, 7.0, 9.4];
    const flagList = [];
    const checkList = [];
    const flagCols = [C.rose, C.sun, C.sky, C.mint, C.lilac, C.pink, C.peach];
    poles.forEach((x, i) => {
      add(at(cyl(0.04, 0.05, 3.0, C.cream, 8), x, 1.5, 12.5));
      add(at(ball(0.08, C.sun, 10), x, 3.04, 12.5));
      colliders.push({ type: 'circle', x, z: 12.5, r: 0.1 });
      (i % 3 === 1 ? checkList : flagList).push({ x: x + 0.03, y: 2.62, z: 12.5, yaw: i % 2 ? Math.PI : 0, color: flagCols[i % flagCols.length], scale: 0.9 });
    });
    flagList.push({ x: tw.flagTop.x - 7.4 + 0.02, y: tw.flagTop.y - 0.3, z: tw.flagTop.z - 3.2, yaw: 0.6, color: C.rose, scale: 0.8 });
    const flagsA = waveFlags(flagList);
    const flagsB = waveFlags(checkList, { checker: true });
    add(flagsA.mesh, flagsB.mesh);
    dynamic.push(flagsA.mesh, flagsB.mesh);
    // Flower boxes along the front
    for (const [x0, x1] of [[-13.6, -12.4], [-10.6, -9.4], [-3.2, -2.6], [2.6, 3.2], [5.2, 6.4]]) {
      const w = x1 - x0 + 0.5;
      add(at(rbox(w, 0.3, 0.5, C.wood, 0.05), (x0 + x1) / 2, 0.15, 12.5));
      for (let x = x0 - 0.1; x <= x1 + 0.1; x += 0.22) flowers.push({ x: x + (R() - 0.5) * 0.06, z: 12.5 + (R() - 0.5) * 0.25, c: FLOWER[Math.floor(R() * FLOWER.length)], h: 0.38 + R() * 0.08 });
      colliders.push({ type: 'box', x: (x0 + x1) / 2, z: 12.5, hw: w / 2, hd: 0.25, h: 0.3 });
    }
    K.addFlowers(g, flowers);

    // ---------------------------------------------------------------- karts that drive round
    const runners = NPC.map((d, i) => {
      const kart = makeKart({ color: d.color, number: d.number, flag: C.sun, live: true });
      const kid = ctx.makeKid(d.look);
      kart.seatKid(kid);
      kid.root.position.y = KART_Y;
      addHelmet(kid, d.helmet);
      kid.update(0.016, 0, 0, 0, 0);
      kid.head.rotation.set(-0.08, 0, 0);
      K.bakeKid(kid);
      add(kart.root);
      dynamic.push(kart.root);
      // Two circles (nose and tail) follow the kart so nobody walks through it
      const s0 = START + 6 + i * (T.L / 2);
      const p0 = T.at(s0, 0, new THREE.Vector3());
      for (const end of ['nose', 'tail']) colliders.push({ type: 'circle', x: p0.x, z: p0.z, r: 0.6, tag: `kart-${i}-${end}` });
      return { kart, s: s0, d: 0, v: 0, base: 4.2 + i * 0.15, honk: 0, wait: 0, name: d.name, cols: null };
    });

    // ---------------------------------------------------------------- state and helpers
    let seqT = -1; // start light sequence clock
    let idleT = 4;
    let rushT = 0;
    let flagT = 0;
    const held = [];
    const NAME = { roji: 'Roji', homama: 'Homama' };
    const kidsLocal = (api) => [api.roji, api.homama].map((a) => api.localPos(a));

    function kartBeep(api, high = 1) {
      const ac = api.sound.ctx;
      if (!ac) return;
      api.sound.tone(660 * high, ac.currentTime, 0.09, { type: 'square', gain: 0.025 });
      api.sound.tone(880 * high, ac.currentTime + 0.11, 0.12, { type: 'square', gain: 0.025 });
    }

    function sitInKarts(api, which) {
      // The player takes the kart they chose; the partner hops into the other one
      const mine = parked[which];
      const other = parked[which === 'roji' ? 'homama' : 'roji'];
      const pinkWho = which === 'roji' ? api.playerId : api.partnerId;
      const helmets = ['roji', 'homama'].map((id) => addHelmet(api[id].kid, id === pinkWho ? '#ff7fa3' : '#3f7bf0'));
      const homamaX = (api.playerId === 'homama' ? mine : other).x;
      const seat = (k) => ({ x: k.x, z: PZ - 0.18, y: KART_Y, yaw: 0, pose: 'drive' });
      let t0 = 0;
      let flashed = false;
      api.sound.ui('pop');
      api.activity({
        label: 'Hop out',
        seats: [
          { who: 'player', ...seat(mine) },
          { who: 'partner', ...seat(other) },
        ],
        focus: { x: 0, z: PZ + 0.2, y: 0.9, zoom: 0.4 },
        exit: { x: -0.4, z: 9.9 },
        update(dt) {
          t0 += dt;
          if (!flashed && t0 > 1.3) {
            flashed = true;
            const ac = api.sound.ctx;
            if (ac) {
              api.sound.tone(2400, ac.currentTime, 0.04, { type: 'square', gain: 0.03 });
              api.sound.tone(1200, ac.currentTime + 0.05, 0.08, { type: 'triangle', gain: 0.04 });
            }
            api.fx.burst(api.world(0, PZ, 1.8), ['#ffffff', '#ffd166', '#ff8fb1', '#6fb8ff'], 40);
            api.roji.kid.hands = 'wave2';
            api.homama.kid.hands = 'wave2';
            api.fx.heartsAt(api.world(homamaX, PZ, 2.0), 3);
            api.toast(`Click! ${NAME[api.playerId]} and ${NAME[api.partnerId]}, ready to race.`, 2600);
          }
          if (flashed && t0 > 3.2 && api.roji.kid.hands === 'wave2') {
            api.roji.kid.hands = null;
            api.homama.kid.hands = null;
          }
        },
        onEnd: (silent) => {
          for (const h of helmets) h.remove();
          api.roji.kid.hands = null;
          api.homama.kid.hands = null;
          if (!silent) api.toast(api.hasArena('kartrace') ? 'Ready for a real race? Grab a helmet by the rack.' : 'Vroom vroom!', 2400);
        },
      });
    }

    function flagOn(kid, checkerFlag, color) {
      const arm = kid.arms[1];
      const grp = new THREE.Group();
      grp.add(at(cyl(0.014, 0.014, 0.62, C.cream, 6), 0, -0.52, 0));
      const cloth = checkerFlag ? mesh(new THREE.PlaneGeometry(0.4, 0.28), flagCloth, { cast: false }) : mesh(new THREE.PlaneGeometry(0.34, 0.24), mat(color, { rough: 0.7, side: THREE.DoubleSide }), { cast: false });
      cloth.rotation.y = Math.PI / 2;
      cloth.position.set(0, -0.68, 0.2);
      grp.add(cloth);
      arm.add(grp);
      held.push({ kid, grp, cloth });
    }

    function waveFlag(api) {
      if (flagT > 0) return;
      flagT = 3.6;
      flagOn(api.player.kid, true);
      flagOn(api.partner.kid, false, api.partnerId === 'roji' ? C.pink : C.sky);
      api.emote('player', 'cheer');
      api.emote('partner', 'cheer');
      seqT = 0;
      crowd.cheer(1);
      K.sfx.cheer(api.sound, 0.07, 1.8);
      api.fx.burst(api.world(MS.x, MS.z, 1.6), ['#3b2b3f', '#fffaf4', '#ff8fb1', '#ffd166'], 50);
      api.toast(`${NAME[api.playerId]} waves the flag. Go, go, go!`, 2600);
    }

    const hotspots = [
      {
        x: 11.7,
        z: 9.1,
        r: 1.4,
        icon: 'flag',
        label: 'Race the karts',
        act: (api) => {
          if (!api.hasArena('kartrace')) return api.toast('The race marshal is still painting the track.', 2400);
          api.sound.ui('tap');
          api.playArena('kartrace').then((r) => {
            if (r?.win) setTimeout(() => api.toast(`${NAME[api.playerId]} is the kart champion!`, 2800), 600);
          });
        },
      },
      { x: parked.roji.x, z: 9.65, r: 1.15, icon: 'kart', label: 'Sit in the pink kart', act: (api) => sitInKarts(api, 'roji') },
      { x: parked.homama.x, z: 9.65, r: 1.15, icon: 'kart', label: 'Sit in the blue kart', act: (api) => sitInKarts(api, 'homama') },
      { x: MS.x, z: 9.2, r: 1.4, icon: 'flag', label: 'Wave the flag', act: (api) => waveFlag(api) },
      {
        x: STAND.x + 0.1,
        z: STAND.z + 0.7,
        r: 1.3,
        icon: 'smile',
        label: 'Sit in the stands',
        act: (api) => {
          const y = stand.rows[0].top - 0.15;
          let cheer = 0;
          api.activity({
            label: 'Get up',
            seats: [
              { who: 'player', x: STAND.x - 0.45, z: STAND.z - 0.27, y, yaw: 0, pose: 'sit' },
              { who: 'partner', x: STAND.x + 0.45, z: STAND.z - 0.27, y, yaw: 0, pose: 'sit' },
            ],
            focus: { x: STAND.x, z: STAND.z + 1.2, y: 1.0, zoom: 0.5 },
            exit: { x: STAND.x - 0.4, z: STAND.z + 1.0 },
            update(dt) {
              cheer -= dt;
              const near = runners.some((r) => Math.abs(r.kart.root.position.x - STAND.x) < 3 && r.kart.root.position.z > 2);
              if (near && cheer <= 0) {
                cheer = 2.2;
                crowd.cheer(0.7);
              }
              const hands = cheer > 1.0 ? 'wave2' : null;
              api.roji.kid.hands = hands;
              api.homama.kid.hands = hands;
            },
            onEnd: () => {
              api.roji.kid.hands = null;
              api.homama.kid.hands = null;
            },
          });
        },
      },
    ];

    // ---------------------------------------------------------------- bake the static parts
    K.bakeVC(g, dynamic, { emissive: 'keep' });

    const tmp = new THREE.Vector3();
    return {
      group: g,
      dynamic,
      colliders,
      hotspots,
      pad: { x: 0, z: size.d / 2 + 1.2 },
      ground: [
        { x: 0, z: 12.6, hw: 1.7, hd: 1.4, color: '#f2e2c6', feather: 0.4 },
        { x: 12.4, z: 11.4, hw: 2.0, hd: 1.0, color: '#f2e2c6', feather: 0.4 },
      ],
      update(dt, t, api) {
        crowd.update(dt, t);
        flagsA.update(t);
        flagsB.update(t);
        for (const [i, f] of boxFlags.entries()) f.rotation.y = Math.sin(t * 2 + i) * 0.3;
        // Start lights: a sequence every so often, or when someone waves the flag
        if (seqT < 0) {
          idleT -= dt;
          if (idleT <= 0) {
            seqT = 0;
            idleT = 9;
          }
          gan.setLights(0, false);
        } else {
          seqT += dt;
          const [red, green] = startSequence(seqT - 0.3);
          gan.setLights(red, green);
          if (green && rushT <= 0 && seqT < 4.2) {
            rushT = 3.5;
            if (flagT > 0) kartBeep(api, 1.2);
          }
          if (seqT > 5) seqT = -1;
        }
        rushT -= dt;
        // Waving flags in the kids' hands
        if (flagT > 0) {
          flagT -= dt;
          for (const h of held) h.cloth.rotation.x = Math.sin(t * 14) * 0.4;
          for (const a of [api.player, api.partner]) if (!a.kid.emoteType && flagT > 1.0 && a.speed < 0.3) a.kid.emote('cheer');
          if (flagT <= 0) {
            for (const h of held) h.grp.removeFromParent();
            held.length = 0;
          }
        }
        // Karts potter round, stopping for anyone on the track
        const kids = kidsLocal(api);
        runners.forEach((r, i) => {
          const other = runners[1 - i];
          let gap = other.s - r.s;
          gap = ((gap % T.L) + T.L) % T.L;
          let block = false;
          for (const k of kids) {
            for (const ahead of [0.9, 1.7, 2.5]) {
              T.at(r.s + ahead, r.d, tmp);
              if (Math.hypot(tmp.x - k.x, tmp.z - k.z) < 0.85) block = true;
            }
          }
          let target = r.base * (rushT > 0 ? 1.9 : 1);
          target = Math.min(target, Math.max(0, (gap - 2.5) * 2.2));
          if (block) target = 0;
          r.v = damp(r.v, target, target < r.v ? 7 : 1.3, dt);
          if (block && r.v < 1 && r.honk <= 0) {
            r.honk = 4;
            kartBeep(api);
          }
          r.honk -= dt;
          r.s = T.mod(r.s + r.v * dt);
          const bend = T.bend(r.s + 0.8, 1.5);
          r.d = damp(r.d, clamp(-bend * 3, -0.6, 0.6), 2, dt);
          const p = T.at(r.s, r.d, tmp);
          r.kart.root.position.set(p.x, 0, p.z);
          r.kart.root.rotation.y = T.yaw(r.s);
          r.cols ??= ['nose', 'tail'].map((e) => api.space.colliders?.find((c) => c.tag === `kart-${i}-${e}`)).filter(Boolean);
          const yw = r.kart.root.rotation.y;
          r.cols.forEach((c, j) => {
            const off = j ? -0.42 : 0.42;
            c.x = api.space.origin.x + p.x + Math.sin(yw) * off;
            c.z = api.space.origin.z + p.z + Math.cos(yw) * off;
          });
          r.kart.body.rotation.z = damp(r.kart.body.rotation.z, clamp(-bend * r.v * 0.06, -0.12, 0.12), 6, dt);
          r.kart.animate(dt, t, r.v, bend * 4);
        });
      },
    };
  },
};
