// Kart Race: three laps of the Roji World circuit against your partner, Kai and Mina.
// Point the stick (or hold left / right) where you want to go; the kart drives itself forward.
// Up for full speed, E / Space / the Use button for an item. Tight turns make drift sparks and a mini boost.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, mesh, canvasTexture, roundRect, FONT, rng, damp, dampAngle, clamp, lerp, easeInOut } from '../util.js';
import * as K from './riding/kit.js';
import { makeLoop, bends, ribbon, asphaltMaterial, kerbMaterial, checkerMaterial, tyreStacks, waveFlags, gantry, startSequence } from '../places/karting/track.js';
import { makeKart, addHelmet } from '../places/karting/kart.js';
import { C, rbox, cyl, at, tree, grandstand, tower, podium, trophy, bannerBoard, billboard } from '../places/karting/scenery.js';

const LAPS = 3;
const HW = 5; // half width of the road
const LIM = HW - 0.45; // how far a kart's centre can go sideways before the soft bumpers
const MAX = 14; // top speed
const CRUISE = 0.86; // speed without holding up, as a share of the top speed
const BOOST = 1.45;
const TIME_CAP = 260;
const CTRL = smooth([[-40, 42], [0, 44], [34, 42], [56, 30], [61, 9], [52, -6], [33, -6], [20, -16], [21, -36], [7, -54], [-17, -52], [-27, -32], [-40, -20], [-60, -14], [-68, 10], [-60, 33]], 2);

// Round the corners of a closed control polygon (Chaikin), so no bend is too tight.
function smooth(pts, n) {
  for (let k = 0; k < n; k++) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    pts = out;
  }
  return pts;
}

const RIVALS = [
  { id: 'kai', name: 'Kai', color: '#3fbf7f', helmet: '#2e9a63', number: 3, base: 12.7, look: { id: 'kai', name: 'Kai', gender: 'boy', skin: '#c98f68', hair: '#141010', hairstyle: 'curly', outfit: 'tee-pants', top: '#3fbf7f', bottom: '#2c3e66', shoes: '#3b2b3f', accent: '#ffd166' } },
  { id: 'mina', name: 'Mina', color: '#a77bff', helmet: '#8b5cf6', number: 4, base: 12.4, look: { id: 'mina', name: 'Mina', gender: 'girl', skin: '#fbe6d8', hair: '#b5773d', hairstyle: 'bob', outfit: 'skirt', top: '#8b5cf6', bottom: '#c7a6ff', shoes: '#7a2e3a', accent: '#c7a6ff' } },
];

const ICONS = {
  banana: `<svg viewBox="0 0 48 48" width="40" height="40"><path d="M10 12c2 14 10 24 26 24 2 0 3 2 1 3-4 2-9 3-14 1C12 36 6 24 7 12c0-2 3-2 3 0z" fill="#ffd166" stroke="#c99a2e" stroke-width="2.2" stroke-linejoin="round"/><path d="M7 11l2-4 2 4" fill="#8b5e3c"/></svg>`,
  boost: `<svg viewBox="0 0 48 48" width="40" height="40"><path d="M27 4 11 27h11l-3 17 18-25H26z" fill="#ff9a3c" stroke="#e0602a" stroke-width="2.2" stroke-linejoin="round"/><path d="M24 12l-6 10h6" fill="none" stroke="#ffe3a8" stroke-width="2.4" stroke-linecap="round"/></svg>`,
};

const CSS = `${K.BASE_CSS}
.kr-item { position: absolute; top: max(10px, env(safe-area-inset-top)); left: 50%; transform: translateX(-50%); width: 58px; height: 58px; border-radius: 18px; background: rgba(255,250,244,.92); box-shadow: 0 6px 18px rgba(60,30,40,.15); display: grid; place-items: center; border: 3px dashed #e8d6cc; transition: transform .2s cubic-bezier(.2,1.5,.4,1); }
.kr-item.full { border: 3px solid #ffd166; animation: kr-glow .6s ease-in-out infinite alternate; }
.kr-item.pop { transform: translateX(-50%) scale(1.18); }
.kr-item span { position: absolute; bottom: -18px; font-size: .7rem; font-weight: 700; white-space: nowrap; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.35); }
@keyframes kr-glow { from { box-shadow: 0 0 0 0 rgba(255,209,102,.8), 0 6px 18px rgba(60,30,40,.15); } to { box-shadow: 0 0 0 8px rgba(255,209,102,0), 0 6px 18px rgba(60,30,40,.15); } }
.kr-tag { position: absolute; transform: translate(-50%, -100%); color: #fff; border-radius: 999px; padding: 1px 8px; font-weight: 700; font-size: .72rem; box-shadow: 0 3px 8px rgba(60,30,40,.2); white-space: nowrap; display: none; }
.kr-map { position: absolute; top: calc(max(10px, env(safe-area-inset-top)) + 54px); right: max(12px, env(safe-area-inset-right)); width: 150px; height: 118px; border-radius: 16px; background: rgba(255,250,244,.88); box-shadow: 0 6px 18px rgba(60,30,40,.15); }
@media (max-height: 430px) { .kr-map { width: 116px; height: 92px; } .kr-item { width: 50px; height: 50px; border-radius: 15px; } .kr-item svg { width: 34px; height: 34px; } }
`;

export default {
  id: 'kartrace',
  title: 'Kart Race',
  tagline: 'Three laps of the Roji World circuit',

  async start(ctx) {
    const { scene, camera, hud, input, sound, fx, looks } = ctx;
    const env = ctx.env.outdoor({ fog: [80, 260], shadow: 24 });
    const T = makeLoop(CTRL, 900);
    const L = T.L;
    const START = T.project(-14, 43.5).s;
    const S = (p) => T.mod(START + p);
    const world = new THREE.Group();
    scene.add(world);
    const keep = [];
    const add = (...o) => (world.add(...o), o[0]);
    const tmp = new THREE.Vector3();
    const tmp2 = new THREE.Vector3();

    // ---------------------------------------------------------------- ground and road
    const ground = mesh(new THREE.CircleGeometry(280, 48), mat('#a9dc6b', { rough: 1 }), { cast: false });
    ground.rotation.x = -Math.PI / 2;
    add(ground);
    add(mesh(ribbon(T, 0, L, -HW, HW, 0.02, { step: 0.6, vLen: 6 }), asphaltMaterial(), { cast: false }));
    const kerbM = kerbMaterial();
    const corners = bends(T, 0.035, 2);
    for (const [a, b] of corners) {
      add(mesh(ribbon(T, a, b, HW - 0.15, HW + 0.25, 0.03, { step: 0.5, vLen: 2 }), kerbM, { cast: false }));
      add(mesh(ribbon(T, a, b, -HW + 0.15, -HW - 0.25, 0.03, { step: 0.5, vLen: 2 }), kerbM, { cast: false }));
    }
    const checker = checkerMaterial(20, 2);
    add(mesh(ribbon(T, START - 0.5, START + 0.5, -HW + 0.2, HW - 0.2, 0.028, { step: 1, vLen: 1 }), checker, { cast: false }));
    // Grid boxes
    const GRID = [
      { p: -5, d: 2.2 },
      { p: -5, d: -2.2 },
      { p: -10.5, d: 2.2 },
      { p: -10.5, d: -2.2 },
    ];
    for (const gp of GRID) {
      const p = T.at(S(gp.p + 1.2), gp.d);
      const bar = rbox(1.6, 0.012, 0.12, C.cream, 0.01);
      add(at(bar, p.x, 0.03, p.z, T.yaw(S(gp.p))));
    }

    // Soft bumpers along both edges, in one draw call. They squash when a kart bumps them.
    const SEG = 2.5;
    const nSeg = Math.floor(L / SEG);
    const bumperGeo = new THREE.CapsuleGeometry(0.28, SEG - 0.62, 2, 8);
    bumperGeo.rotateX(Math.PI / 2);
    const bumpers = new THREE.InstancedMesh(bumperGeo, mat('#ffffff', { rough: 0.6 }), nSeg * 2);
    bumpers.castShadow = true;
    bumpers.receiveShadow = true;
    const bumpCols = [[C.rose, C.cream], [C.sky, C.cream]];
    const squish = new Float32Array(nSeg * 2);
    const bumpMat = (i, k = 0) => {
      const side = i < nSeg ? 1 : -1;
      const j = i % nSeg;
      const s = (j + 0.5) * SEG;
      const p = T.at(s, side * (HW + 0.55), tmp);
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), T.yaw(s));
      const sc = new THREE.Vector3(1 + k * 0.35, 1 - k * 0.35, 1);
      return new THREE.Matrix4().compose(new THREE.Vector3(p.x, 0.3 - k * 0.08, p.z), q, sc);
    };
    for (let i = 0; i < nSeg * 2; i++) {
      bumpers.setMatrixAt(i, bumpMat(i));
      const side = i < nSeg ? 0 : 1;
      bumpers.setColorAt(i, new THREE.Color(bumpCols[side][(i % nSeg) % 2]));
    }
    add(bumpers);
    keep.push(bumpers);
    const squishing = new Set();
    function bumpAt(s, side) {
      const j = Math.floor(T.mod(s) / SEG) % nSeg;
      const i = side > 0 ? j : nSeg + j;
      squish[i] = 1;
      squishing.add(i);
    }

    // Tyre walls behind the bumpers on the outside of the corners
    const tyres = [];
    const tops = [C.rose, C.cream, C.sky, C.sun, C.mint];
    let ti = 0;
    for (const [a, b, sg] of corners) {
      if (b - a < 8) continue;
      for (let s = a + 1; s < b - 1; s += 1.15) {
        if (Math.abs(T.bend(s)) < 0.05) continue;
        const p = T.at(s, -sg * (HW + 1.5));
        if (T.dist(p.x, p.z) < HW + 1.2) continue;
        tyres.push({ x: p.x, z: p.z, n: 2, top: tops[ti++ % tops.length] });
      }
    }
    add(tyreStacks(tyres, { segs: [5, 10] }));

    // ---------------------------------------------------------------- start area
    const sp = T.at(START, 0);
    const syaw = T.yaw(START);
    const gan = gantry({ span: HW * 2 + 1.6, height: 4.6, text: 'Roji World Karting', lamps: 5 });
    gan.group.scale.setScalar(1.15);
    gan.group.position.set(sp.x, 0, sp.z);
    gan.group.rotation.y = syaw + Math.PI;
    add(gan.group);
    keep.push(gan.lamps);
    // Grandstand on the outside of the main straight, facing the road
    const right = (s, d) => T.at(s, -d);
    const standS = S(24);
    const stand = grandstand({ w: 14, tiers: 4, roof: 3.6 });
    const stp = right(standS, HW + 3.2);
    stand.group.position.set(stp.x, 0, stp.z);
    stand.group.rotation.y = T.yaw(standS) + Math.PI / 2;
    add(stand.group);
    const standTop = bannerBoard('Roji World Karting', 'Kart Race', { w: 8, h: 1.4 });
    stand.group.add(at(standTop, 0, 4.6, stand.back - 0.1));
    // Fans
    const fanR = rng(12);
    const fans = [];
    const kinds = ['cheer', 'wave', 'flag', 'clap', 'cheer', 'flag', 'wave'];
    const flagCols = [C.sun, C.rose, C.sky, C.mint, C.pink];
    stand.group.updateMatrixWorld(true);
    let fi = 0;
    stand.rows.forEach((row, ri) => {
      for (let x = -6.2 + (ri % 2) * 1.1; x < 6.4; x += 2.1 + fanR() * 0.5) {
        const kid = ctx.makeKid(K.randomLook(fanR, fi));
        const lp = new THREE.Vector3(x, row.top, row.z - 0.12).applyMatrix4(stand.group.matrixWorld);
        kid.root.position.copy(lp);
        kid.root.rotation.y = stand.group.rotation.y + (fanR() - 0.5) * 0.4;
        K.poseFan(kid, kinds[fi % kinds.length], flagCols[fi % flagCols.length]);
        kid.root.traverse((o) => {
          if (o.isMesh && o.material.map && o.material.color) o.material = mat('#' + o.material.color.getHexString(), { rough: 0.45 });
        });
        fans.push({ kid });
        fi++;
      }
    });
    const crowd = K.makeCrowd(fans);
    add(crowd.mesh);
    keep.push(crowd.mesh);
    // Race control and the podium in the infield by the line
    const left = (s, d) => T.at(s, d);
    const twp = left(S(-14), HW + 6);
    const tw = tower('Race Control');
    tw.group.position.set(twp.x, 0, twp.z);
    tw.group.rotation.y = syaw - Math.PI / 2;
    add(tw.group);
    const PODIUM_S = S(48);
    const pdp = left(PODIUM_S, HW + 9);
    const pod = podium(1.2);
    const podYaw = T.yaw(PODIUM_S) - Math.PI / 2;
    pod.group.position.set(pdp.x, 0, pdp.z);
    pod.group.rotation.y = podYaw;
    add(pod.group);
    const winBoard = bannerBoard('Winners', 'Roji World Karting', { w: 4.2, h: 1.1 });
    winBoard.position.set(0, 2.6, -1.0);
    pod.group.add(winBoard);
    for (const s of [-1, 1]) pod.group.add(at(cyl(0.06, 0.06, 2.4, C.cream, 8), s * 1.6, 1.2, -1.05));
    // Flags along the straight and bunting
    const flagList = [];
    const checkList = [];
    for (let k = 0; k < 9; k++) {
      const s = S(-30 + k * 8);
      const p = left(s, HW + 1.8);
      add(at(cyl(0.05, 0.06, 3.4, C.cream, 8), p.x, 1.7, p.z));
      (k % 3 === 1 ? checkList : flagList).push({ x: p.x, y: 3.0, z: p.z, yaw: T.yaw(s) + Math.PI, color: [C.rose, C.sun, C.sky, C.mint, C.lilac][k % 5] });
    }
    const flagsA = waveFlags(flagList);
    const flagsB = waveFlags(checkList, { checker: true });
    add(flagsA.mesh, flagsB.mesh);
    keep.push(flagsA.mesh, flagsB.mesh);
    // Cheering boards round the lap
    for (const [p, txt, col, side] of [[95, 'Go Roji!', C.rose, -1], [150, 'Go Homama!', C.blue, -1], [230, 'Vroom!', C.teal, -1], [300, 'Go Roji!', C.pink, 1]]) {
      const s = S(p);
      const q = side > 0 ? left(s, HW + 3.4) : right(s, HW + 3.4);
      const bb = billboard(txt, col, { w: 3.6, h: 1.5, y: 1.4 });
      bb.position.set(q.x, 0, q.z);
      bb.rotation.y = T.yaw(s) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      add(bb);
    }

    // ---------------------------------------------------------------- boost pads and item boxes
    const PADS = [
      { p: 18, d: 2.2 },
      { p: 120, d: -2.0 },
      { p: 210, d: 1.8 },
      { p: 300, d: -2.2 },
    ].map((q) => {
      let best = q.p;
      let bb = Infinity;
      for (let k = -14; k <= 14; k += 2) {
        let b = 0;
        for (let o = -6; o <= 8; o += 2) b += Math.abs(T.bend(S(q.p + k + o)));
        if (b < bb) {
          bb = b;
          best = q.p + k;
        }
      }
      return { s: S(best), d: q.d, len: 3.4 };
    });
    const padTex = canvasTexture(128, 128, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, '#ff9a3c');
      gr.addColorStop(0.5, '#ffd166');
      gr.addColorStop(1, '#ff9a3c');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#fffaf4';
      for (const y of [h * 0.12, h * 0.62]) {
        c.beginPath();
        c.moveTo(w * 0.16, y + h * 0.3);
        c.lineTo(w * 0.5, y);
        c.lineTo(w * 0.84, y + h * 0.3);
        c.lineTo(w * 0.68, y + h * 0.3);
        c.lineTo(w * 0.5, y + h * 0.14);
        c.lineTo(w * 0.32, y + h * 0.3);
        c.closePath();
        c.fill();
      }
    });
    padTex.wrapS = padTex.wrapT = THREE.RepeatWrapping;
    const padMat = new THREE.MeshBasicMaterial({ map: padTex });
    const padGeo = mergeGeometries(PADS.map((q) => ribbon(T, q.s, q.s + q.len, q.d - 1.4, q.d + 1.4, 0.035, { step: 0.4, vLen: 1.7 })));
    const pads = mesh(padGeo, padMat, { cast: false });
    add(pads);
    keep.push(pads);

    const ROWS = [62, 168, 262];
    const boxes = [];
    for (const pr of ROWS) for (const d of [-3.3, -1.1, 1.1, 3.3]) {
      const s = S(pr);
      const p = T.at(s, d);
      boxes.push({ s, d, x: p.x, z: p.z, off: 0, ph: boxes.length * 0.7 });
    }
    const boxTex = canvasTexture(128, 128, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, '#ff8fb1');
      gr.addColorStop(0.35, '#ffd166');
      gr.addColorStop(0.7, '#7fd3a7');
      gr.addColorStop(1, '#6fb8ff');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#fffaf4';
      c.lineWidth = 10;
      roundRect(c, 8, 8, w - 16, h - 16, 20);
      c.stroke();
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `700 ${h * 0.62}px ${FONT}`;
      c.fillText('?', w / 2, h / 2 + 6);
    });
    const boxMat = new THREE.MeshStandardMaterial({ map: boxTex, roughness: 0.4, emissive: '#ffffff', emissiveMap: boxTex, emissiveIntensity: 0.35 });
    const boxIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), boxMat, boxes.length);
    boxIM.castShadow = true;
    add(boxIM);
    keep.push(boxIM);

    // Bananas, merged into one coloured mesh and instanced
    const bananaGeo = (() => {
      const parts = [];
      const paint = (g, hex) => {
        g = g.index ? g.toNonIndexed() : g;
        const c = new THREE.Color(hex);
        const n = g.attributes.position.count;
        const arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
        g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
        g.deleteAttribute('uv');
        return g;
      };
      const body = new THREE.TorusGeometry(0.26, 0.09, 8, 14, 2.3);
      body.rotateZ(0.42);
      parts.push(paint(body, '#ffd166'));
      for (const a of [0.42, 0.42 + 2.3]) {
        const tip = new THREE.SphereGeometry(0.05, 8, 6);
        tip.translate(Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0);
        parts.push(paint(tip, '#8b5e3c'));
      }
      const g = mergeGeometries(parts);
      g.rotateX(-Math.PI / 2 + 0.25);
      g.translate(0, 0.12, 0);
      return g;
    })();
    const MAXB = 10;
    const bananaIM = new THREE.InstancedMesh(bananaGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }), MAXB);
    bananaIM.castShadow = true;
    bananaIM.count = 0;
    add(bananaIM);
    keep.push(bananaIM);
    const bananas = [];

    // Sparks and boost flames: one pool of tiny glowing bits
    const MAXS = 160;
    const sparkIM = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), MAXS);
    sparkIM.frustumCulled = false;
    add(sparkIM);
    keep.push(sparkIM);
    const sparks = Array.from({ length: MAXS }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 1 }));
    let sparkNext = 0;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < MAXS; i++) {
      sparkIM.setMatrixAt(i, zero);
      sparkIM.setColorAt(i, new THREE.Color('#ffffff'));
    }
    const sc = new THREE.Color();
    function spark(pos, vel, color, life = 0.35, size = 1) {
      const k = sparkNext;
      sparkNext = (sparkNext + 1) % MAXS;
      const s = sparks[k];
      s.life = life;
      s.max = life;
      s.p.copy(pos);
      s.v.copy(vel);
      s.s = size;
      sparkIM.setColorAt(k, sc.set(color));
      sparkIM.instanceColor.needsUpdate = true;
    }

    // ---------------------------------------------------------------- nature and sky
    const keepOut = [
      [stp.x, stp.z, 10],
      [twp.x, twp.z, 4],
      [pdp.x, pdp.z, 5],
    ];
    K.scatterNature(world, {
      seed: 8,
      bounds: [-110, 100, -95, 90],
      trees: 50,
      bushes: 40,
      flowers: 480,
      tufts: 600,
      rocks: 16,
      free: (x, z, kind) => {
        const dd = T.dist(x, z);
        if (dd < HW + (kind === 'tree' ? 6 : kind === 'flower' || kind === 'tuft' ? 2.2 : 3.5)) return false;
        for (const [kx, kz, r] of keepOut) if (Math.hypot(x - kx, z - kz) < r) return false;
        return true;
      },
    });
    K.sky(world, { radius: 170, center: [-4, -4] });
    for (const [x, z, s, k] of [[-20, 25, 1.2, 'blossom'], [8, 20, 1.1, 'round'], [36, 14, 1.3, 'blossom'], [-40, -2, 1.2, 'round'], [0, -28, 1.2, 'blossom']]) if (T.dist(x, z) > HW + 4) add(at(tree(s, k), x, 0, z));

    // ---------------------------------------------------------------- racers
    const meId = ctx.me;
    const partnerId = ctx.partner;
    const meName = looks[meId].name;
    const partnerName = looks[partnerId].name;
    const kartOf = { roji: { color: '#ff8fb1', helmet: '#ff7fa3', number: 1, tag: '#ef5b6f' }, homama: { color: '#5b9cf5', helmet: '#3f7bf0', number: 2, tag: '#3f7bf0' } };
    const defs = [
      { id: meId, name: meName, real: true, me: true, ...kartOf[meId], base: MAX * CRUISE, grid: GRID[0] },
      { ...RIVALS[0], tag: RIVALS[0].color, grid: GRID[1] },
      { id: partnerId, name: partnerName, real: true, ...kartOf[partnerId], base: 12.7, grid: GRID[2] },
      { ...RIVALS[1], tag: RIVALS[1].color, grid: GRID[3] },
    ];
    const racers = defs.map((def, i) => {
      const kart = makeKart({ color: def.color, number: def.number, flag: def.real ? C.sun : C.cream, live: true, shadowBlob: false });
      const kid = ctx.makeKid(def.real ? def.id : def.look);
      kart.seatKid(kid);
      addHelmet(kid, def.helmet);
      if (def.real) K.bakeLiveKid(kid);
      else {
        kid.update(0.016, 0, 0, 0, 0);
        kid.head.rotation.set(-0.08, 0, 0);
        K.bakeKid(kid);
      }
      add(kart.root);
      keep.push(kart.root);
      const p0 = def.grid.p;
      const pos = T.at(S(p0), def.grid.d);
      return {
        i,
        def,
        name: def.name,
        me: !!def.me,
        real: !!def.real,
        kart,
        kid,
        p: p0,
        s: S(p0),
        d: def.grid.d,
        laneT: def.grid.d,
        laneCd: 0,
        v: 0,
        yaw: T.yaw(S(p0)),
        x: pos.x,
        z: pos.z,
        turn: 0,
        steer: 0,
        boost: 0,
        spin: 0,
        spinA: 0,
        item: null,
        itemT: 0,
        driftT: 0,
        charge: 0,
        drifting: false,
        slip: 0,
        onWall: false,
        bumpCd: 0,
        finished: false,
        place: 0,
        time: 0,
        hint: -1,
        seed: i * 1.7 + 0.3,
        sparkT: 0,
        lastLap: 1,
        wrongT: 0,
        aiAim: 0,
      };
    });
    const me = racers.find((r) => r.me);
    const partner = racers.find((r) => r.real && !r.me);

    // ---------------------------------------------------------------- HUD
    const ui = K.overlay(
      CSS,
      `<div class="kr-item"><span></span></div>
       <canvas class="kr-map"></canvas>
       <div class="rr-pop"></div>
       ${racers.filter((r) => !r.me).map((r) => `<div class="kr-tag" style="background:${r.def.tag}">${r.name}</div>`).join('')}`,
    );
    const pop = K.popper(ui.$('.rr-pop'));
    const itemEl = ui.$('.kr-item');
    const mapCv = ui.$('.kr-map');
    const tags = [...ui.el.querySelectorAll('.kr-tag')];
    racers.filter((r) => !r.me).forEach((r, k) => (r.tag = tags[k]));
    hud.buttons({ action: 'Use', jump: null });
    hud.hint('Arrows or WASD to steer, up for full speed, E or Space to use an item');
    let shownItem = 'none';
    function showItem() {
      const it = me.item || 'none';
      if (it === shownItem) return;
      shownItem = it;
      itemEl.innerHTML = (me.item ? ICONS[me.item] : '') + '<span></span>';
      itemEl.querySelector('span').textContent = me.item ? (document.body.classList.contains('touch') ? 'Tap Use' : 'Press E') : '';
      itemEl.classList.toggle('full', !!me.item);
      K.hotButton('action', !!me.item);
      if (me.item) {
        itemEl.classList.add('pop');
        setTimeout(() => itemEl.classList.remove('pop'), 220);
      }
    }

    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < T.N; i++) {
      x0 = Math.min(x0, T.px[i]);
      x1 = Math.max(x1, T.px[i]);
      z0 = Math.min(z0, T.pz[i]);
      z1 = Math.max(z1, T.pz[i]);
    }
    function drawMap() {
      const w = mapCv.clientWidth;
      const h = mapCv.clientHeight;
      if (!w) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (mapCv.width !== Math.round(w * dpr)) {
        mapCv.width = Math.round(w * dpr);
        mapCv.height = Math.round(h * dpr);
      }
      const c = mapCv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);
      const pad = 12;
      const k = Math.min((w - pad * 2) / (x1 - x0), (h - pad * 2) / (z1 - z0));
      const ox = (w - (x1 - x0) * k) / 2;
      const oz = (h - (z1 - z0) * k) / 2;
      // Seen from above with the start at the bottom
      const X = (x) => ox + (x - x0) * k;
      const Z = (z) => oz + (z - z0) * k;
      c.lineJoin = 'round';
      c.beginPath();
      for (let i = 0; i <= T.N; i += 6) {
        const j = i % T.N;
        if (i === 0) c.moveTo(X(T.px[j]), Z(T.pz[j]));
        else c.lineTo(X(T.px[j]), Z(T.pz[j]));
      }
      c.closePath();
      c.strokeStyle = '#b4aec3';
      c.lineWidth = 7;
      c.stroke();
      c.strokeStyle = '#fffaf4';
      c.lineWidth = 1.5;
      c.stroke();
      const f = T.at(START, 0);
      c.fillStyle = '#3b2b3f';
      c.fillRect(X(f.x) - 1, Z(f.z) - 5, 2, 10);
      for (const r of [...racers].sort((a, b) => a.me - b.me)) {
        c.beginPath();
        c.arc(X(r.x), Z(r.z), r.me ? 5 : 3.6, 0, Math.PI * 2);
        c.fillStyle = r.def.tag || r.def.color;
        c.fill();
        c.lineWidth = r.me ? 2.2 : 1.2;
        c.strokeStyle = '#ffffff';
        c.stroke();
      }
    }

    // ---------------------------------------------------------------- engine sound
    let engine = null;
    function engineTick(v, on) {
      const ac = sound?.ctx;
      if (!ac || sound.muted || !sound.sfx) return;
      if (!engine && on) {
        const o = ac.createOscillator();
        const o2 = ac.createOscillator();
        o.type = 'sawtooth';
        o2.type = 'square';
        const f = ac.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 520;
        const g = ac.createGain();
        g.gain.value = 0;
        o.connect(f);
        o2.connect(f);
        f.connect(g).connect(sound.sfx);
        o.start();
        o2.start();
        engine = { o, o2, f, g };
      }
      if (!engine) return;
      const t = ac.currentTime;
      const hz = 62 + v * 7.5 + (me.boost > 0 ? 25 : 0);
      engine.o.frequency.setTargetAtTime(hz, t, 0.08);
      engine.o2.frequency.setTargetAtTime(hz * 0.5, t, 0.08);
      engine.g.gain.setTargetAtTime(on ? 0.018 + Math.min(0.012, v * 0.0008) : 0, t, 0.15);
    }
    function engineStop() {
      if (!engine) return;
      const t = sound.ctx.currentTime;
      engine.g.gain.setTargetAtTime(0, t, 0.08);
      engine.o.stop(t + 0.4);
      engine.o2.stop(t + 0.4);
      engine = null;
    }
    const sfx = {
      boing() {
        const ac = sound?.ctx;
        if (!ac || sound.muted) return;
        sound.tone(240, ac.currentTime, 0.2, { type: 'sine', gain: 0.07, slideTo: 520 });
        sound.tone(160, ac.currentTime, 0.12, { type: 'triangle', gain: 0.04, slideTo: 90 });
      },
      bonk() {
        const ac = sound?.ctx;
        if (!ac || sound.muted) return;
        sound.tone(300, ac.currentTime, 0.08, { type: 'square', gain: 0.03, slideTo: 200 });
      },
      spin() {
        const ac = sound?.ctx;
        if (!ac || sound.muted) return;
        for (let i = 0; i < 4; i++) sound.tone(700 - i * 120, ac.currentTime + i * 0.09, 0.1, { type: 'triangle', gain: 0.05 });
      },
      beep(hi) {
        const ac = sound?.ctx;
        if (!ac || sound.muted) return;
        sound.tone(hi ? 880 : 520, ac.currentTime, hi ? 0.45 : 0.22, { type: 'square', gain: 0.035 });
      },
    };

    // ---------------------------------------------------------------- race state
    let phase = 'intro'; // intro | race | done | podium
    let introT = 0;
    let raceT = 0;
    let finishCount = 0;
    let doneT = 0;
    let podT = 0;
    let lastRed = 0;
    let lastScore = '';
    let cheerCd = 0;
    const camPos = new THREE.Vector3();
    const camLook = new THREE.Vector3();
    let camYaw = me.yaw;
    let fov = 50;
    const dbg = {
      fast: 1,
      auto: false,
      racers,
      bananas: () => bananas.map((b) => [b.s.toFixed(1), b.d.toFixed(2), b.owner.name]),
      T,
      START,
      get phase() {
        return phase;
      },
      get raceT() {
        return raceT;
      },
      L,
      give: (item) => (me.item = item),
      finishNow: () => forceFinish(),
      podiumNow: () => {
        forceFinish();
        startPodium();
      },
    };
    window.__kart = dbg;

    const near = (r) => Math.hypot(r.x - me.x, r.z - me.z) < 30;
    const wrapDiff = (a, b) => {
      let d = a - b;
      while (d > L / 2) d -= L;
      while (d < -L / 2) d += L;
      return d;
    };

    function finishRider(r) {
      r.finished = true;
      r.place = ++finishCount;
      r.time = raceT;
      if (r.place === 1) {
        fx.burst(T.at(START, 0, new THREE.Vector3()).setY(2.5), ['#ff7fa3', '#ffd166', '#ffffff', '#7fd3a7', '#6fb8ff'], 90);
        crowd.cheer(1);
        K.sfx.cheer(sound, 0.08, 2);
      }
      if (r.me) {
        phase = 'done';
        doneT = 0;
        sound.ui(r.place === 1 ? 'win' : 'good');
        pop(r.place === 1 ? 'You win!' : `${K.ord(r.place)} place`, '#fff6c8', 1800);
        if (r.place === 1) fx.heartsAt(tmp.set(r.x, 2.4, r.z), 6);
      }
    }
    function forceFinish() {
      const rest = racers.filter((r) => !r.finished).sort((a, b) => b.p - a.p);
      for (const r of rest) finishRider(r);
    }

    // ---------------------------------------------------------------- items
    function giveItem(r) {
      if (r.item) return;
      const order = [...racers].sort((a, b) => b.p - a.p);
      const rank = order.indexOf(r);
      const boostChance = rank >= 2 ? 0.68 : 0.5;
      r.item = Math.random() < boostChance ? 'boost' : 'banana';
      r.itemT = 0.8 + Math.random() * 2.6;
      if (r.me) {
        sound.ui('coin');
        pop(r.item === 'boost' ? 'Got a boost!' : 'Got a banana!', '#fff6c8', 900);
      }
    }
    function useItem(r) {
      if (!r.item) return;
      if (r.item === 'boost') {
        r.boost = Math.max(r.boost, 1.6);
        if (r.me) {
          sound.ui('swoosh');
          pop('Boost!', '#ffe3a8', 700);
        }
      } else {
        const p = T.at(r.s - 1.9, r.d);
        if (bananas.length >= MAXB) bananas.shift();
        bananas.push({ x: p.x, z: p.z, s: T.mod(r.s - 1.9), d: r.d, owner: r, t: 0, yaw: Math.random() * 6 });
        if (near(r)) sound.ui('pop');
        if (r.me) pop('Banana dropped!', '#fff6c8', 700);
      }
      r.item = null;
    }
    function spinOut(r) {
      if (r.spin > 0) return;
      r.spin = 0.95;
      r.spinA = 0;
      r.v *= 0.45;
      r.boost = 0;
      r.drifting = false;
      r.charge = 0;
      r.kid.squash = 0.85;
      if (near(r)) sfx.spin();
      if (r.me) pop('Whoops! A banana', '#ffe1e6', 1000);
    }

    // ---------------------------------------------------------------- control
    function autopilot(r) {
      // Aim at a point a little ahead on the racing line
      const ahead = T.at(r.s + 8 + r.v * 0.25, clamp(T.bend(r.s + 10) * 22, -2.6, 2.6), tmp2);
      const want = Math.atan2(ahead.x - r.x, ahead.z - r.z);
      return { want, gas: true, brake: false, steering: true };
    }

    function readPlayer(r) {
      if (dbg.auto || r.finished) return { ...autopilot(r), gas: !r.finished };
      const ax = input.axis();
      const mag = Math.hypot(ax.x, ax.y);
      const gas = ax.y > 0.55 || input.held('arrowup') || input.held('w');
      if (mag < 0.2 || Math.abs(ax.x) < 0.15) return { want: null, gas, brake: ax.y < -0.5 && Math.abs(ax.x) < 0.5, steering: false };
      if (ax.y < -0.5 && Math.abs(ax.x) < 0.5) return { want: null, gas: false, brake: true, steering: false };
      // Point-and-go: the stick direction relative to the camera is where the kart turns
      const fx = Math.sin(camYaw);
      const fz = Math.cos(camYaw);
      const dx = -fz * ax.x + fx * ax.y;
      const dz = fx * ax.x + fz * ax.y;
      return { want: Math.atan2(dx, dz), gas, brake: false, steering: true };
    }

    function controlPlayer(r, dt) {
      const c = readPlayer(r);
      const vk = clamp(r.v / MAX, 0, 1.4);
      let rate = 2.4 - 0.8 * Math.min(1, vk);
      if (r.drifting) rate += 0.45;
      const grip = clamp(0.25 + r.v / 4, 0, 1);
      let turn = 0;
      let off = 0;
      if (c.want !== null && r.spin <= 0) {
        off = Math.atan2(Math.sin(c.want - r.yaw), Math.cos(c.want - r.yaw));
        turn = clamp(off * 3.2, -rate, rate) * grip;
      } else if (r.spin <= 0) {
        // Gentle help: follow the road when nobody is steering
        const ahead = T.at(r.s + 7, clamp(r.d, -2.4, 2.4) * 0.85, tmp2);
        const aim = Math.atan2(ahead.x - r.x, ahead.z - r.z);
        const d = Math.atan2(Math.sin(aim - r.yaw), Math.cos(aim - r.yaw));
        turn = clamp(d * 1.5, -1.2, 1.2) * grip;
      }
      r.yaw += turn * dt;
      r.turn = damp(r.turn, turn, 10, dt);
      let target = MAX * (c.gas ? 1 : CRUISE);
      if (c.want !== null) target *= lerp(1, 0.72, clamp((Math.abs(off) - 0.9) / 1.3, 0, 1));
      if (c.brake) target = MAX * 0.3;
      if (r.finished) target = Math.max(0, MAX * 0.55 - doneT * 2.2);
      if (phase === 'intro') target = 0;
      applySpeed(r, target, dt);
      r.x += Math.sin(r.yaw) * r.v * dt;
      r.z += Math.cos(r.yaw) * r.v * dt;
      const pr = T.project(r.x, r.z, r.hint);
      r.hint = pr.i;
      r.p += wrapDiff(pr.s, r.s);
      r.s = pr.s;
      r.d = pr.d;
      wall(r, dt);
      // Wrong way
      const ty = T.yaw(r.s);
      const fwd = Math.cos(r.yaw - ty);
      r.wrongT = fwd < -0.3 && r.v > 2 ? r.wrongT + dt : 0;
      if (r.wrongT > 0.9) {
        pop('Wrong way! Turn around', '#ffe1e6', 1200);
        r.wrongT = -1.5;
      }
      if (r.item && !r.finished && (input.pressed('action') || input.pressed('jump') || (dbg.auto && Math.random() < dt * 0.6))) useItem(r);
      drift(r, dt);
    }

    function applySpeed(r, target, dt) {
      if (r.boost > 0) target = Math.max(target, MAX * BOOST);
      if (r.spin > 0) target *= 0.35;
      const up = r.boost > 0 ? 16 : 6.5;
      r.v += clamp(target - r.v, -13 * dt, up * dt);
      r.v = Math.max(0, r.v);
    }

    // Soft bumpers: slow down and slide along instead of stopping
    function wall(r, dt) {
      r.bumpCd -= dt;
      if (Math.abs(r.d) > LIM) {
        const side = Math.sign(r.d);
        r.d = side * LIM;
        const ty = T.yaw(r.s);
        if (!r.onWall && r.bumpCd <= 0) {
          r.v = Math.max(Math.min(r.v, 4.5), r.v * 0.7);
          r.bumpCd = 0.45;
          bumpAt(r.s, side);
          if (near(r)) {
            sfx.boing();
            fx.puff(tmp.set(r.x, 0.2, r.z));
          }
          r.kid.squash = 0.86;
          r.charge = 0;
          r.drifting = false;
        }
        r.onWall = true;
        r.yaw = dampAngle(r.yaw, ty - side * 0.12, 5, dt);
        const p = T.at(r.s, r.d, tmp);
        r.x = p.x;
        r.z = p.z;
      } else r.onWall = Math.abs(r.d) > LIM - 0.15;
    }

    // Drift: hold a tight turn at speed to charge sparks, straighten for a mini boost
    function drift(r, dt) {
      const tight = Math.abs(r.turn) > 1.05 && r.v > 8.5 && !r.onWall && r.spin <= 0;
      r.driftT = tight ? r.driftT + dt : Math.max(0, r.driftT - dt * 3);
      if (!r.drifting && r.driftT > 0.22) {
        r.drifting = true;
        r.charge = 0;
        r.driftSide = Math.sign(r.turn);
      }
      if (r.drifting) {
        r.charge += dt;
        if (!tight && r.driftT < 0.12) {
          r.drifting = false;
          if (r.charge > 0.6) {
            const lvl = r.charge > 1.8 ? 2 : r.charge > 1.1 ? 1 : 0;
            r.boost = Math.max(r.boost, [0.55, 0.85, 1.2][lvl]);
            if (r.me) {
              pop(['Mini boost!', 'Super boost!', 'Mega boost!'][lvl], ['#cfe6ff', '#ffe3a8', '#ffd0e6'][lvl], 800);
              sound.ui('swoosh');
            }
          }
          r.charge = 0;
        }
      }
      r.slip = damp(r.slip, r.drifting ? r.driftSide * 0.32 : 0, 7, dt);
    }

    function controlAI(r, dt, t) {
      let target = r.def.base * (1 + 0.025 * Math.sin(t * 0.31 + r.seed));
      const bendAhead = Math.max(Math.abs(T.bend(r.s + 4)), Math.abs(T.bend(r.s + 12)));
      target *= 1 - clamp((bendAhead - 0.045) * 3.2, 0, 0.26);
      const gap = r.p - me.p;
      if (!me.finished) {
        if (gap > 9) target -= Math.min(2.6, (gap - 9) * 0.12);
        if (gap < -14) target += Math.min(1.2, (-gap - 14) * 0.05);
      }
      target = Math.min(target, MAX * 0.97);
      if (r.finished) target = Math.max(0, 6 - (raceT - r.time) * 2.2);
      if (phase === 'intro') target = 0;
      // Lanes: the inside of the next bend, passing slower karts, dodging bananas
      r.laneCd -= dt;
      const line = clamp(T.bend(r.s + 12) * 24, -2.8, 2.8);
      let laneWant = clamp(r.def.grid.d * 0.4 + line, -LIM + 0.6, LIM - 0.6);
      for (const o of racers) {
        if (o === r) continue;
        const dp = wrapDiff(o.s, r.s);
        if (dp > 0 && dp < 6 && Math.abs(o.d - r.laneT) < 1.3 && o.v < target - 0.4 && r.laneCd <= 0) {
          const l = o.d + 1.9;
          const rr = o.d - 1.9;
          r.laneT = l < LIM - 0.4 && (rr < -LIM + 0.4 || Math.random() < 0.5) ? l : rr;
          r.laneCd = 1.4;
        }
      }
      for (const b of bananas) {
        const dp = wrapDiff(b.s, r.s);
        if (dp > 1 && dp < 14 && Math.abs(b.d - r.laneT) < 1.2 && r.laneCd <= 0 && b.owner !== r) {
          if (Math.random() < 0.72) r.laneT = clamp(b.d + (b.d > 0 ? -2.0 : 2.0), -LIM + 0.4, LIM - 0.4);
          r.laneCd = 1.0;
        }
      }
      if (r.laneCd <= 0) r.laneT = damp(r.laneT, laneWant, 0.8, dt);
      const prevD = r.d;
      r.d = clamp(damp(r.d, r.laneT, 1.6, dt), -LIM, LIM);
      applySpeed(r, target, dt);
      r.p += r.v * dt;
      r.s = S(r.p);
      const vd = (r.d - prevD) / Math.max(dt, 1e-3);
      const ty = T.yaw(r.s);
      r.yaw = ty + Math.atan2(vd, Math.max(2, r.v));
      r.turn = T.bend(r.s) * r.v;
      const p = T.at(r.s, r.d, tmp);
      r.x = p.x;
      r.z = p.z;
      // Items
      if (r.item && !r.finished) {
        r.itemT -= dt;
        const straight = Math.abs(T.bend(r.s + 15)) < 0.02;
        const behindMe = me.p < r.p && r.p - me.p < 18;
        if (r.itemT <= 0 && (r.item === 'boost' ? straight : behindMe || r.itemT < -4)) useItem(r);
      }
      // Cosmetic drift sparks in tight bends
      r.drifting = Math.abs(r.turn) > 1.15 && r.v > 8.5;
      if (r.drifting && !r.driftSide) r.driftSide = Math.sign(r.turn);
      if (!r.drifting) r.driftSide = 0;
      r.charge = r.drifting ? r.charge + dt : 0;
      r.slip = damp(r.slip, r.drifting ? Math.sign(r.turn) * 0.25 : 0, 6, dt);
    }

    // ---------------------------------------------------------------- simulation step
    function step(dt, t) {
      if (phase === 'intro') introT += dt;
      else raceT += dt;
      for (const r of racers) {
        if (phase === 'intro') continue;
        if (r.me) controlPlayer(r, dt);
        else controlAI(r, dt, t);
        r.boost -= dt;
        if (r.spin > 0) {
          r.spin -= dt;
          r.spinA = (1 - Math.pow(Math.max(0, r.spin) / 0.95, 2)) * Math.PI * 2;
          if (r.spin <= 0) r.spinA = 0;
        }
        if (r.finished) continue;
        // Boost pads
        for (const q of PADS) {
          const ds = wrapDiff(r.s, q.s);
          if (ds > 0 && ds < q.len && Math.abs(r.d - q.d) < 1.6 && r.boost < 0.9) {
            r.boost = 1.15;
            if (r.me) {
              sound.ui('swoosh');
              pop('Zoom!', '#ffe3a8', 600);
            }
          }
        }
        // Item boxes
        for (const b of boxes) {
          if (b.off > 0) continue;
          if (Math.hypot(r.x - b.x, r.z - b.z) < 1.35) {
            b.off = 3;
            if (near(r)) fx.burst(tmp.set(b.x, 0.9, b.z), ['#ff8fb1', '#ffd166', '#7fd3a7', '#6fb8ff'], r.me ? 26 : 10);
            giveItem(r);
          }
        }
        // Bananas
        for (let k = bananas.length - 1; k >= 0; k--) {
          const b = bananas[k];
          if (b.owner === r && b.t < 1.2) continue;
          if (Math.hypot(r.x - b.x, r.z - b.z) < 1.0) {
            bananas.splice(k, 1);
            spinOut(r);
          }
        }
        // Laps
        if (!r.finished) {
          const lap = Math.floor(r.p / L) + 1;
          if (r.me && lap > r.lastLap && lap <= LAPS) {
            pop(lap === LAPS ? 'Final lap!' : `Lap ${lap}`, '#ffffff', 1200);
            sound.ui('good');
          }
          r.lastLap = Math.max(r.lastLap, lap);
          if (r.p >= LAPS * L) {
            r.crossed = true;
            finishRider(r);
          }
        }
      }
      for (const b of bananas) b.t += dt;
      for (const b of boxes) b.off -= dt;
      // Karts bump softly into each other
      for (let i = 0; i < racers.length; i++) {
        for (let j = i + 1; j < racers.length; j++) {
          const a = racers[i];
          const b = racers[j];
          const dp = wrapDiff(b.s, a.s);
          if (Math.abs(dp) > 1.95) continue;
          const dd = b.d - a.d;
          if (Math.abs(dd) > 1.3) continue;
          const push = (1.3 - Math.abs(dd)) * 0.5 * (Math.sign(dd) || 1);
          a.d = clamp(a.d - push, -LIM, LIM);
          b.d = clamp(b.d + push, -LIM, LIM);
          if (Math.abs(dd) < 0.9) {
            const back = dp > 0 ? a : b;
            const front = dp > 0 ? b : a;
            back.v = Math.min(back.v, front.v * 0.97);
          }
          if ((a.me || b.me) && me.bumpCd <= 0) {
            me.bumpCd = 0.5;
            sfx.bonk();
            me.kid.squash = 0.9;
          }
          for (const r of [a, b]) {
            if (!r.me) continue;
            const p = T.at(r.s, r.d, tmp);
            r.x = p.x;
            r.z = p.z;
          }
        }
      }
      if (phase === 'race' && raceT > TIME_CAP && !me.finished) forceFinish();
      if (phase === 'done') {
        doneT += dt;
        const top3 = racers.filter((r) => r.finished).length;
        if (doneT > 2.6 && top3 < racers.length && (top3 >= 3 || doneT > 5)) forceFinish();
        if (doneT > 3.2 && racers.every((r) => r.finished)) startPodium();
      }
      if (phase === 'podium') podT += dt;
      cheerCd -= dt;
    }

    // ---------------------------------------------------------------- podium
    const podKids = [];
    function startPodium() {
      phase = 'podium';
      podT = 0;
      engineTick(0, false);
      const order = [...racers].sort((a, b) => a.place - b.place);
      pod.group.updateMatrixWorld(true);
      order.slice(0, 3).forEach((r, k) => {
        const kid = ctx.makeKid(r.real ? r.def.id : r.def.look);
        const spot = pod.spots[k];
        const wp = new THREE.Vector3(spot.x / 1.2, spot.y / 1.2, 0).applyMatrix4(pod.group.matrixWorld);
        kid.root.position.copy(wp);
        kid.root.rotation.y = podYaw;
        K.bakeLiveKid(kid);
        scene.add(kid.root);
        if (k === 0) {
          const cup = trophy(1.4);
          cup.rotation.x = Math.PI;
          cup.position.set(0, -0.3, 0.02);
          kid.arms[1].add(cup);
        }
        podKids.push({ kid, k, r });
      });
      // Fourth place waves from beside the podium
      const fourth = order[3];
      if (fourth) {
        const kid = ctx.makeKid(fourth.real ? fourth.def.id : fourth.def.look);
        const wp = new THREE.Vector3(2.4, 0, 0.6).applyMatrix4(pod.group.matrixWorld);
        kid.root.position.copy(wp);
        kid.root.rotation.y = podYaw - 0.4;
        K.bakeLiveKid(kid);
        scene.add(kid.root);
        podKids.push({ kid, k: 3, r: fourth });
      }
      // Hide the karts' drivers near the podium so nobody is in two places
      for (const r of racers) r.kart.root.visible = false;
      fx.burst(new THREE.Vector3(pdp.x, 3, pdp.z), ['#ff7fa3', '#ffd166', '#ffffff', '#7fd3a7', '#6fb8ff'], 120);
      crowd.cheer(1);
      K.sfx.cheer(sound, 0.08, 2.2);
      sound.ui('win');
    }
    let resultShown = false;
    function showResult() {
      resultShown = true;
      const place = me.place;
      const time = me.time.toFixed(1);
      const winner = racers.find((r) => r.place === 1);
      let text;
      if (place === 1 && me.crossed) {
        const best = ctx.load('best', null);
        const isBest = !best || me.time < best;
        if (isBest) ctx.save('best', me.time);
        text = `${meName} crossed the line first in ${time} s${isBest ? ', a new best' : ''}.`;
        text += partner.place === 2 ? ` ${partnerName} came second and cheered the loudest.` : partner.place === 3 ? ` ${partnerName} took third and cheered the loudest.` : ` ${partnerName} cheered from beside the podium.`;
      } else if (place === 1) {
        text = `${meName} was in front when the race ended. ${partnerName} cheered the loudest.`;
      } else if (winner === partner) {
        text = `${partnerName} won this time and shared the trophy with you. You came ${K.ord(place)}. Drift round the bends for mini boosts and grab the item boxes.`;
      } else {
        text = `${winner.name} won this time. You came ${K.ord(place)} in ${time} s. Drift round the bends for mini boosts and grab the item boxes.`;
      }
      ctx.finish({ win: place === 1, title: place === 1 ? `${meName} wins the Kart Race!` : `${K.ord(place)} place`, text, place, time: me.time });
    }

    // ---------------------------------------------------------------- visuals
    const E = new THREE.Euler();
    function poseRacer(r, dt, t) {
      const k = r.kart;
      k.root.position.set(r.x, 0, r.z);
      k.root.rotation.set(0, r.yaw + r.slip + r.spinA, 0);
      k.body.rotation.z = damp(k.body.rotation.z, clamp(-r.turn * r.v * 0.012, -0.12, 0.12), 6, dt);
      k.body.rotation.x = damp(k.body.rotation.x, r.boost > 0 ? -0.05 : 0, 6, dt);
      const steerVis = clamp(r.turn / 1.6, -1, 1) - r.slip * 1.2;
      k.animate(dt, t, r.v, steerVis);
      if (r.real) {
        const kid = r.kid;
        kid.update(dt, t, 0, 0, 0);
        const [aL, aR] = kid.arms;
        aL.rotation.x = -1.15 - steerVis * 0.22;
        aR.rotation.x = -1.15 + steerVis * 0.22;
        kid.body.rotation.z = clamp(-r.turn * 0.05, -0.12, 0.12);
        kid.head.rotation.y = steerVis * 0.3;
        if (r.finished && r.place <= 3 && raceT - r.time < 5) {
          aL.rotation.set(0, 0, 2.4 + Math.sin(t * 11) * 0.25);
          aR.rotation.set(0, 0, -2.4 - Math.sin(t * 11 + 1) * 0.25);
        }
      }
      // Sparks and flames
      if (!near(r)) return;
      r.sparkT -= dt;
      if (r.sparkT > 0) return;
      r.sparkT = 0.03;
      const fwdX = Math.sin(r.yaw);
      const fwdZ = Math.cos(r.yaw);
      const lx = fwdZ;
      const lz = -fwdX;
      if (r.drifting && r.v > 6) {
        const col = r.charge > 1.8 ? '#ff6bb5' : r.charge > 1.1 ? '#ffb36b' : '#8fd0ff';
        for (const s of [1, -1]) {
          tmp.set(r.x - fwdX * 0.75 + lx * 0.66 * s, 0.08, r.z - fwdZ * 0.75 + lz * 0.66 * s);
          tmp2.set(-fwdX * 2 + lx * s * (Math.random() * 2) + (Math.random() - 0.5), 1.5 + Math.random() * 2, -fwdZ * 2 + lz * s * (Math.random() * 2) + (Math.random() - 0.5));
          spark(tmp, tmp2, col, 0.3, 1);
        }
      }
      if (r.boost > 0) {
        tmp.set(r.x - fwdX * 1.2 - lx * 0.48, 0.33, r.z - fwdZ * 1.2 - lz * 0.48);
        tmp2.set(-fwdX * 3 + (Math.random() - 0.5), 0.6 + Math.random(), -fwdZ * 3 + (Math.random() - 0.5));
        spark(tmp, tmp2, Math.random() < 0.5 ? '#ffd166' : '#ff8a3c', 0.25, 1.6);
      }
      if ((r.v > 11 && (r.drifting || r.boost > 0) && Math.random() < 0.3) || (r.onWall && r.v > 3 && Math.random() < 0.3)) fx.puff(tmp.set(r.x - fwdX, 0.1, r.z - fwdZ));
    }

    const m4 = new THREE.Matrix4();
    const q4 = new THREE.Quaternion();
    const s4 = new THREE.Vector3();
    const p4 = new THREE.Vector3();
    function updateScenery(dt, t) {
      crowd.update(dt, t);
      flagsA.update(t);
      flagsB.update(t);
      padTex.offset.y -= dt * 1.6;
      // Bumpers spring back
      for (const i of squishing) {
        squish[i] = Math.max(0, squish[i] - dt * 2.4);
        const k = squish[i] * (0.6 + 0.4 * Math.cos((1 - squish[i]) * 14));
        bumpers.setMatrixAt(i, bumpMat(i, k));
        if (squish[i] <= 0) squishing.delete(i);
      }
      bumpers.instanceMatrix.needsUpdate = true;
      // Item boxes spin and bob, and grow back
      boxes.forEach((b, i) => {
        const on = b.off <= 0;
        const grow = on ? Math.min(1, -b.off * 3 + 0.0001) : 0;
        const k = on ? clamp(grow, 0, 1) : 0;
        q4.setFromEuler(E.set(0.5, t * 1.6 + b.ph, 0.6));
        s4.setScalar(Math.max(0.0001, k));
        p4.set(b.x, 1.0 + Math.sin(t * 2.4 + b.ph) * 0.12, b.z);
        boxIM.setMatrixAt(i, m4.compose(p4, q4, s4));
      });
      boxIM.instanceMatrix.needsUpdate = true;
      // Bananas
      bananaIM.count = bananas.length;
      bananas.forEach((b, i) => {
        q4.setFromEuler(E.set(0, b.yaw, 0));
        s4.setScalar(Math.min(1, b.t * 5 + 0.2) * 1.3);
        p4.set(b.x, Math.abs(Math.sin(t * 3 + i)) * 0.05, b.z);
        bananaIM.setMatrixAt(i, m4.compose(p4, q4, s4));
      });
      bananaIM.instanceMatrix.needsUpdate = true;
      // Sparks
      for (let i = 0; i < MAXS; i++) {
        const s = sparks[i];
        if (s.life <= 0) continue;
        s.life -= dt;
        if (s.life <= 0) {
          sparkIM.setMatrixAt(i, zero);
          continue;
        }
        s.v.y -= 9 * dt;
        s.p.addScaledVector(s.v, dt);
        if (s.p.y < 0.03) {
          s.p.y = 0.03;
          s.v.y *= -0.4;
        }
        const k = (s.life / s.max) * s.s;
        q4.setFromEuler(E.set(t * 9 + i, t * 7, 0));
        sparkIM.setMatrixAt(i, m4.compose(s.p, q4, s4.setScalar(k)));
      }
      sparkIM.instanceMatrix.needsUpdate = true;
      // Start lights
      if (phase === 'intro') {
        const [red, green] = startSequence(introT - 3.0);
        gan.setLights(red, green);
      } else if (raceT < 2) gan.setLights(0, true);
      else gan.setLights(0, false);
      // Crowd cheers as you pass the stand
      if (phase === 'race' && Math.abs(wrapDiff(me.s, standS)) < 10 && cheerCd <= 0) {
        crowd.cheer(0.8);
        K.sfx.cheer(sound, 0.05, 1.3);
        cheerCd = 8;
      }
    }

    function updateIntro() {
      // Lights: tick for each red, beep for green, then race
      const [red, green] = startSequence(introT - 3.0);
      if (red > lastRed) {
        sfx.beep(false);
        if (red >= 3) hud.message(String(6 - red), 500);
      }
      lastRed = red;
      if (green) {
        phase = 'race';
        raceT = 0;
        sfx.beep(true);
        hud.message('Go!', 800);
        crowd.cheer(0.9);
        K.sfx.cheer(sound, 0.06, 1.5);
      }
    }

    function updateCamera(dt) {
      const wide = camera.aspect > 1.9;
      const boosting = me.boost > 0;
      const dist = (wide ? 5.3 : 6.8) + (boosting ? 0.6 : 0);
      const high = wide ? 2.5 : 3.1;
      camYaw = dampAngle(camYaw, me.yaw + me.slip * 0.4, 3.2, dt);
      const chasePos = tmp.set(me.x - Math.sin(camYaw) * dist, high, me.z - Math.cos(camYaw) * dist);
      const chaseLook = tmp2.set(me.x + Math.sin(camYaw) * 5, 1.0, me.z + Math.cos(camYaw) * 5);
      let fovT = boosting ? 60 : 50;
      if (phase === 'intro') {
        // Sweep in front of the grid, then settle behind the player before the lights
        const k = easeInOut(clamp((introT - 1.6) / 1.4, 0, 1));
        const a = T.at(S(4 - Math.min(introT, 3) * 0.6), -2.5 + Math.min(introT, 3) * 0.5).setY(2.3);
        const al = T.at(S(-7), 0).setY(0.9);
        camPos.lerpVectors(a, chasePos, k);
        camPos.y += Math.sin(k * Math.PI) * 2.5;
        camLook.lerpVectors(al, chaseLook, k);
      } else if (phase === 'podium') {
        pod.group.updateMatrixWorld(true);
        const near = camera.aspect > 1.9 ? 4.9 : 6.2;
        const cp = new THREE.Vector3(Math.sin(podT * 0.25) * 1.2, 2.1, near).applyMatrix4(pod.group.matrixWorld);
        const cl = new THREE.Vector3(0, 1.5, 0).applyMatrix4(pod.group.matrixWorld);
        const k = 1 - Math.exp(-4 * dt);
        if (podT < 0.05) {
          camPos.copy(cp);
          camLook.copy(cl);
        }
        camPos.lerp(cp, k);
        camLook.lerp(cl, k);
        fovT = 50;
      } else if (phase === 'done') {
        // Swing round to the front of the kart to see the happy driver
        const k = easeInOut(clamp(doneT / 2.4, 0, 1));
        const a = me.yaw + Math.PI * 0.85 * k;
        const fp = new THREE.Vector3(me.x - Math.sin(a) * 5.2, 2.2, me.z - Math.cos(a) * 5.2);
        camPos.lerp(fp, 1 - Math.exp(-5 * dt));
        camLook.lerp(new THREE.Vector3(me.x, 1.0, me.z), 1 - Math.exp(-6 * dt));
      } else {
        camPos.lerp(chasePos, 1 - Math.exp(-9 * dt));
        camLook.lerp(chaseLook, 1 - Math.exp(-11 * dt));
      }
      fov = damp(fov, fovT, 4, dt);
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      camera.position.copy(camPos);
      camera.lookAt(camLook);
      camera.updateMatrixWorld();
      env.follow(tmp.set(phase === 'podium' ? pdp.x : me.x, 0, phase === 'podium' ? pdp.z : me.z));
    }

    function updateHud() {
      const order = [...racers].sort((a, b) => (a.finished && b.finished ? a.place - b.place : a.finished ? -1 : b.finished ? 1 : b.p - a.p));
      const place = order.indexOf(me) + 1;
      const lap = clamp(Math.floor(me.p / L) + 1, 1, LAPS);
      const s = phase === 'intro' ? `Lap 1 / ${LAPS}` : phase === 'podium' ? `<b style="color:${me.def.tag}">${K.ord(me.place)}</b> place` : `Lap ${lap} / ${LAPS} &nbsp; <b style="color:${me.def.tag}">${K.ord(me.finished ? me.place : place)}</b>`;
      if (s !== lastScore) {
        hud.score(s);
        lastScore = s;
        const racing = phase === 'race' || phase === 'intro';
        itemEl.style.display = racing ? '' : 'none';
        mapCv.style.display = phase === 'podium' ? 'none' : '';
        if (!racing) {
          hud.hint('');
          hud.buttons({ action: null, jump: null, stick: false });
        }
      }
      showItem();
      const v = new THREE.Vector3();
      for (const r of racers) {
        if (!r.tag) continue;
        const dist = Math.hypot(r.x - camera.position.x, r.z - camera.position.z);
        r.kid.head.getWorldPosition(v).add(new THREE.Vector3(0, 0.95, 0)).project(camera);
        const show = (phase === 'race' || phase === 'intro') && v.z < 1 && dist < 40 && dist > 2.5 && Math.abs(v.x) < 1.1 && r.kart.root.visible;
        r.tag.style.display = show ? 'block' : 'none';
        if (show) {
          r.tag.style.left = `${((v.x + 1) / 2) * 100}%`;
          r.tag.style.top = `${((1 - v.y) / 2) * 100}%`;
          r.tag.style.opacity = String(clamp((40 - dist) / 10, 0, 1));
        }
      }
      drawMap();
    }

    // Static scenery becomes a few vertex-coloured meshes
    K.bakeVC(world, keep, { emissive: 'keep' });

    for (const r of racers) poseRacer(r, 0.016, 0);
    updateCamera(1);
    hud.message('Kart Race', 1300);

    return {
      update(dt, t) {
        const n = clamp(Math.round(dbg.fast) || 1, 1, 24);
        for (let k = 0; k < n; k++) {
          step(dt, t + k * dt);
          if (phase === 'intro') updateIntro();
        }
        for (const r of racers) poseRacer(r, dt, t);
        for (const pk of podKids) {
          const kid = pk.kid;
          if (pk.k < 3 && !kid.emoteType && pk.k > 0) kid.emote('cheer');
          if (pk.k === 3 && !kid.emoteType) kid.emote('wave');
          kid.update(dt, t, 0, 0, 0);
          if (pk.k === 0) {
            const [aL, aR] = kid.arms;
            aR.rotation.set(0, 0, -2.6 + Math.sin(t * 6) * 0.15);
            aL.rotation.set(0, 0, 2.2 + Math.sin(t * 9) * 0.3);
            kid.body.position.y = Math.abs(Math.sin(t * 5)) * 0.08;
          }
        }
        if (phase === 'podium' && podT > 1.2 && Math.random() < dt * 2) fx.burst(new THREE.Vector3(pdp.x, 3.4, pdp.z), ['#ff7fa3', '#ffd166', '#ffffff', '#7fd3a7', '#6fb8ff'], 24);
        if (phase === 'podium' && podT > 5.2 && !resultShown) showResult();
        engineTick(me.v, phase === 'race' || phase === 'done');
        updateScenery(dt, t);
        updateCamera(dt * n);
        updateHud();
      },
      dispose() {
        engineStop();
        ui.remove();
        K.hotButton('action', false);
        if (window.__kart === dbg) delete window.__kart;
      },
    };
  },
};
