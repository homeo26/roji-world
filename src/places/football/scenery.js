// The football pitch in town: layout, the striped pitch, goals, stand, dugouts, scoreboard, fence and little props.
// Local coordinates: origin at the footprint centre (28 x 18 m), the street and the camera on +Z.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, mesh, canvasTexture, roundRect, FONT, rng, heartShape } from '../../util.js';
import { PAL, box, rbox, cyl, at, tube, pitchTexture, makeBall, makeGoal, makeCornerFlag, makeScoreboard, makeBunting, bakeColors } from './models.js';

export const PZ = 0.3; // pitch centre z
export const PL = 10; // goal lines at x = +-PL
export const PW = 4.5; // touchlines at z = PZ +- PW
export const GOAL = { w: 3, h: 1.3, dTop: 0.45, dBot: 0.85 };
export const SPOT = 2.1; // penalty spot distance from the goal line
export const GRASS = { hw: 11.0, hd: 5.3 };
export const STAND = { x: 6.2, front: -5.4, step: 0.9, rise: 0.45, tiers: 3 };
export const FENCE = { x: 13.7, front: 8.6, back: -8.8, gate: 1.9 };
export const SEAT_Y = 0.45 + 0.06; // top of the front bench
export const TROPHY = { x: 12.35, z: -5.7 };

// Painted banner text on a plane. draw(ctx, w, h).
function painted(w, h, px, draw, glow = 0) {
  const tex = canvasTexture(Math.round((px * w) / h), px, draw);
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
  if (glow) {
    m.emissive = new THREE.Color('#ffffff');
    m.emissiveMap = tex;
    m.emissiveIntensity = glow;
  }
  return mesh(new THREE.PlaneGeometry(w, h), m, { cast: false });
}

function drawHeart(c, x, y, s, color) {
  c.save();
  c.translate(x, y);
  c.scale(s, -s);
  c.fillStyle = color;
  c.beginPath();
  for (const p of heartShape(1).getPoints(24)) c.lineTo(p.x, p.y);
  c.fill();
  c.restore();
}

export function buildScenery() {
  const g = new THREE.Group();
  const dynamic = [];
  const colliders = [];
  const add = (o, x = 0, y = 0, z = 0, ry = 0) => {
    at(o, x, y, z, ry);
    g.add(o);
    return o;
  };
  const r = rng(11);

  // ------------------------------------------------ pitch
  const tex = pitchTexture({ gw: GRASS.hw, gd: GRASS.hd, hl: PL, hw: PW, box: { d: 2.8, hw: 2.9 }, small: { d: 1.0, hw: 2.0 }, spot: SPOT, circle: 1.6, band: 1.84 });
  const pitch = mesh(new THREE.PlaneGeometry(GRASS.hw * 2, GRASS.hd * 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), { cast: false });
  pitch.rotation.x = -Math.PI / 2;
  add(pitch, 0, 0.012, PZ);
  // A cream kerb round the grass
  const kerb = mat('#f3e4cc', { rough: 0.85 });
  const kz0 = PZ - GRASS.hd;
  const kz1 = PZ + GRASS.hd;
  for (const k of [
    add(box(GRASS.hw * 2 + 0.24, 0.06, 0.12, kerb), 0, 0.03, kz0 - 0.06),
    add(box(GRASS.hw * 2 + 0.24, 0.06, 0.12, kerb), 0, 0.03, kz1 + 0.06),
    add(box(0.12, 0.06, GRASS.hd * 2, kerb), -GRASS.hw - 0.06, 0.03, PZ),
    add(box(0.12, 0.06, GRASS.hd * 2, kerb), GRASS.hw + 0.06, 0.03, PZ),
  ])
    k.castShadow = false;

  // ------------------------------------------------ goals
  const goals = [];
  for (const side of [-1, 1]) {
    const goal = makeGoal(GOAL);
    goal.group.position.set(side * PL, 0, PZ);
    goal.group.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    g.add(goal.group);
    dynamic.push(...goal.nets);
    goals.push({ side, ...goal });
    const bx = side * (PL + GOAL.dBot / 2);
    for (const zs of [-1, 1]) {
      colliders.push({ type: 'circle', x: side * PL, z: PZ + zs * (GOAL.w / 2), r: 0.07, tag: 'post' });
      colliders.push({ type: 'box', x: bx, z: PZ + zs * (GOAL.w / 2 + 0.02), hw: GOAL.dBot / 2, hd: 0.04, h: GOAL.h, tag: 'net' });
    }
    colliders.push({ type: 'box', x: side * (PL + GOAL.dBot), z: PZ, hw: 0.04, hd: GOAL.w / 2, h: GOAL.h, tag: 'net' });
    // Kids only: the back net slopes in, so their heads stop before it (the ball ignores this one)
    colliders.push({ type: 'box', x: side * (PL + 0.75), z: PZ, hw: 0.11, hd: GOAL.w / 2, h: GOAL.h, tag: 'kidnet' });
  }

  // ------------------------------------------------ corner flags
  const flags = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const f = makeCornerFlag(sz > 0 ? PAL.pink : PAL.teal);
      add(f.group, sx * PL, 0, PZ + sz * PW);
      f.flag.rotation.y = sx > 0 ? Math.PI : 0;
      flags.push({ pivot: f.flag, base: f.flag.rotation.y, ph: r() * 6 });
      dynamic.push(f.flag);
      colliders.push({ type: 'circle', x: sx * PL, z: PZ + sz * PW, r: 0.1, tag: 'post' });
    }
  }

  // ------------------------------------------------ the stand: three tiers of benches, stairs at both ends
  const tierCols = ['#fbe6d2', '#f8dcc4', '#f5d2b6'];
  const riserCols = [PAL.rose, PAL.yellow, PAL.mint];
  const plankCols = [PAL.pink, '#f4b13d', PAL.teal];
  const SW = STAND.x * 2;
  for (let k = 0; k < STAND.tiers; k++) {
    const z1 = STAND.front - k * STAND.step;
    const z0 = z1 - STAND.step;
    const top = (k + 1) * STAND.rise;
    add(box(SW, top, STAND.step, tierCols[k], { rough: 0.85 }), 0, top / 2, (z0 + z1) / 2);
    add(box(SW, STAND.rise - 0.04, 0.03, riserCols[k], { rough: 0.7 }), 0, top - STAND.rise / 2, z1 + 0.012);
    // Bench plank along the front edge, on little feet
    add(rbox(SW - 0.3, 0.06, 0.36, plankCols[k], 0.025, { rough: 0.6 }), 0, top + 0.06, z1 - 0.24);
    for (let i = 0; i < 9; i++) add(box(0.08, 0.04, 0.26, PAL.woodDk), -SW / 2 + 0.5 + (i * (SW - 1)) / 8, top + 0.02, z1 - 0.24);
    colliders.push({ type: 'box', x: 0, z: (z0 + z1) / 2, hw: STAND.x, hd: STAND.step / 2, h: top, tag: 'stand' });
  }
  const backZ = STAND.front - STAND.tiers * STAND.step; // -8.1
  const topH = STAND.tiers * STAND.rise;
  add(box(SW + 0.3, topH + 0.62, 0.3, '#fff1dc', { rough: 0.8 }), 0, (topH + 0.62) / 2, backZ - 0.15);
  add(rbox(SW + 0.42, 0.1, 0.4, PAL.pink, 0.04), 0, topH + 0.66, backZ - 0.15);
  colliders.push({ type: 'box', x: 0, z: backZ - 0.15, hw: STAND.x + 0.15, hd: 0.15 });
  // Banner on the back wall
  const banner = painted(9.2, 0.5, 96, (c, w, h) => {
    c.fillStyle = '#fffaf4';
    roundRect(c, 2, 2, w - 4, h - 4, h * 0.3);
    c.fill();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 ${h * 0.6}px ${FONT}`;
    c.fillStyle = PAL.pink;
    c.fillText('GO ROJI', w * 0.27, h * 0.56);
    c.fillStyle = PAL.blue;
    c.fillText('GO HOMAMA', w * 0.73, h * 0.56);
    for (const x of [0.06, 0.5, 0.94]) drawHeart(c, w * x, h * 0.52, h * 0.55, x === 0.5 ? PAL.pink : '#ff9eb5');
  });
  add(banner, 0, topH + 0.3, backZ + 0.005);
  // Stairs: 0.225 m steps at both ends, so the top is reachable on foot
  const stepMat = mat('#f8e6d2', { rough: 0.85 });
  for (const s of [-1, 1]) {
    const x = s * (STAND.x + 0.42);
    for (let i = 0; i < STAND.tiers * 2; i++) {
      const h = (i + 1) * (STAND.rise / 2);
      const z1 = STAND.front - (i * STAND.step) / 2;
      const z0 = z1 - STAND.step / 2;
      add(box(0.84, h, STAND.step / 2, stepMat), x, h / 2, (z0 + z1) / 2);
      add(box(0.84, 0.03, 0.05, '#f2c9a6'), x, h, z1 - 0.025);
      colliders.push({ type: 'box', x, z: (z0 + z1) / 2, hw: 0.42, hd: STAND.step / 4, h, tag: 'stairs' });
    }
    // hand rail on the outside
    const rx = s * (STAND.x + 0.86);
    const a = new THREE.Vector3(rx, 0.75, STAND.front);
    const b = new THREE.Vector3(rx, topH + 0.75, backZ + 0.2);
    g.add(tube(a, b, 0.03, PAL.teal, 8));
    for (const p of [a, b, a.clone().lerp(b, 0.5)]) g.add(tube(new THREE.Vector3(p.x, p.y - 0.75, p.z), p, 0.022, '#fffaf4', 6));
    colliders.push({ type: 'box', x: rx, z: (STAND.front + backZ) / 2, hw: 0.04, hd: (STAND.front - backZ) / 2 });
  }
  // Cushions and a forgotten scarf on the benches
  const cushion = (x, k, c) => add(rbox(0.34, 0.07, 0.3, c, 0.03), x, (k + 1) * STAND.rise + 0.12, STAND.front - k * STAND.step - 0.24);
  cushion(-4.6, 0, PAL.sky);
  cushion(2.1, 0, PAL.yellow);
  cushion(-1.3, 1, PAL.lilac);
  cushion(4.4, 2, PAL.pink);
  const scarf = new THREE.Group();
  for (let i = 0; i < 7; i++) scarf.add(at(box(0.1, 0.03, 0.12, i % 2 ? '#fffaf4' : PAL.teal), -0.3 + i * 0.1, 0, 0));
  scarf.rotation.y = 0.3;
  add(scarf, 0.6, 2 * STAND.rise + 0.105, STAND.front - STAND.step - 0.22);

  // ------------------------------------------------ scoreboard behind the stand
  const board = makeScoreboard({ w: 4.2, h: 1.5, post: 2.35, title: 'SUNNY KICKS FC' });
  add(board.group, 0, 0, -8.6);
  for (const s of [-1, 1]) colliders.push({ type: 'circle', x: s * 1.51, z: -8.65, r: 0.12 });

  // ------------------------------------------------ dugouts at the back corners
  for (const s of [-1, 1]) {
    const dx = s * 9.2;
    const dz = -7.15;
    const col = s < 0 ? PAL.pink : PAL.teal;
    add(box(2.5, 1.55, 0.1, '#fff1dc'), dx, 0.78, dz - 0.75);
    for (const e of [-1, 1]) add(box(0.1, 1.55, 1.5, '#fff1dc'), dx + e * 1.2, 0.78, dz);
    const roofGeo = new THREE.CylinderGeometry(1.3, 1.3, 1.7, 18, 1, true, -Math.PI / 2, Math.PI);
    roofGeo.rotateX(-Math.PI / 2);
    roofGeo.scale(1, 0.32, 1);
    const roof = mesh(roofGeo, mat(col, { side: THREE.DoubleSide, rough: 0.6 }));
    add(roof, dx, 1.55, dz + 0.05);
    add(rbox(2.2, 0.07, 0.4, PAL.wood, 0.02), dx, 0.45, dz - 0.45);
    for (const e of [-1, 1]) add(box(0.07, 0.42, 0.3, PAL.woodDk), dx + e * 0.9, 0.21, dz - 0.45);
    // name board on the back wall and a water bottle
    const label = painted(1.5, 0.34, 64, (c, w, h) => {
      c.fillStyle = col;
      roundRect(c, 2, 2, w - 4, h - 4, h * 0.35);
      c.fill();
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `600 ${h * 0.58}px ${FONT}`;
      c.fillText(s < 0 ? 'Home' : 'Away', w / 2, h * 0.55);
    });
    add(label, dx, 1.15, dz - 0.69);
    add(cyl(0.05, 0.05, 0.2, s < 0 ? PAL.sky : PAL.yellow, 10), dx - 0.5 * s, 0.58, dz - 0.4);
    add(cyl(0.025, 0.025, 0.05, '#fffaf4', 8), dx - 0.5 * s, 0.7, dz - 0.4);
    colliders.push({ type: 'box', x: dx, z: dz - 0.75, hw: 1.25, hd: 0.06 });
    for (const e of [-1, 1]) colliders.push({ type: 'box', x: dx + e * 1.2, z: dz, hw: 0.06, hd: 0.75 });
    colliders.push({ type: 'box', x: dx, z: dz - 0.45, hw: 1.1, hd: 0.2, h: 0.48 });
  }

  // ------------------------------------------------ bunting from the dugouts over the stand to the scoreboard
  const bun = makeBunting([new THREE.Vector3(-10.4, 1.75, -7.9), new THREE.Vector3(-STAND.x - 0.1, 2.55, backZ - 0.1), new THREE.Vector3(-2.2, 3.4, -8.45)], { sag: 0.3 });
  const bun2 = makeBunting([new THREE.Vector3(2.2, 3.4, -8.45), new THREE.Vector3(STAND.x + 0.1, 2.55, backZ - 0.1), new THREE.Vector3(10.4, 1.75, -7.9)], { sag: 0.3 });
  g.add(bun, bun2);
  for (const s of [-1, 1]) add(cyl(0.035, 0.035, 2.6, '#fffaf4', 8), s * (STAND.x + 0.1), 1.3, backZ - 0.1);

  // ------------------------------------------------ picket fence with an entrance at the front
  const segs = [
    [-FENCE.x, FENCE.front, -FENCE.gate, FENCE.front],
    [FENCE.gate, FENCE.front, FENCE.x, FENCE.front],
    [-FENCE.x, FENCE.back, FENCE.x, FENCE.back],
    [-FENCE.x, FENCE.back, -FENCE.x, FENCE.front],
    [FENCE.x, FENCE.back, FENCE.x, FENCE.front],
  ];
  const picketGeo = mergeGeometries([new THREE.BoxGeometry(0.08, 0.56, 0.035).translate(0, 0.28, 0), new THREE.ConeGeometry(0.058, 0.09, 4).rotateY(Math.PI / 4).scale(1, 1, 0.45).translate(0, 0.6, 0)].map((q) => q.toNonIndexed()));
  const pickets = [];
  const railMat = mat('#fffaf4', { rough: 0.7 });
  for (const [x0, z0, x1, z1] of segs) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.floor(len / 0.3);
    const yaw = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2;
    for (let i = 0; i <= n; i++) pickets.push({ x: x0 + ((x1 - x0) * i) / n, z: z0 + ((z1 - z0) * i) / n, yaw });
    for (const y of [0.18, 0.42]) {
      const rail = box(len, 0.05, 0.03, railMat);
      rail.rotation.y = yaw;
      add(rail, (x0 + x1) / 2, y, (z0 + z1) / 2, yaw);
    }
    colliders.push({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: Math.abs(x1 - x0) / 2 + 0.05, hd: Math.abs(z1 - z0) / 2 + 0.05, tag: 'fence' });
  }
  const pim = new THREE.InstancedMesh(picketGeo, mat('#fffaf4', { rough: 0.7 }), pickets.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const one = new THREE.Vector3(1, 1, 1);
  const v = new THREE.Vector3();
  pickets.forEach((p, i) => pim.setMatrixAt(i, m4.compose(v.set(p.x, 0, p.z), q.setFromEuler(e.set(0, p.yaw, 0)), one)));
  pim.castShadow = true;
  pim.receiveShadow = true;
  g.add(pim);
  dynamic.push(pim);
  // Gate pillars with a ball on top
  for (const s of [-1, 1]) {
    const x = s * (FENCE.gate + 0.2);
    add(rbox(0.5, 1.05, 0.5, '#fff1dc', 0.06), x, 0.525, FENCE.front);
    add(rbox(0.6, 0.12, 0.6, s < 0 ? PAL.pink : PAL.teal, 0.04), x, 1.1, FENCE.front);
    add(makeBall(0.22, 1), x, 1.38, FENCE.front);
    colliders.push({ type: 'box', x, z: FENCE.front, hw: 0.3, hd: 0.3 });
  }

  // ------------------------------------------------ trees, bushes and flowers
  const trunk = mat('#8b5e3c', { rough: 0.9 });
  const leafCols = ['#6dbb58', '#5aa84f', '#84c95f', '#f6a5c0'];
  const tree = (x, z, s, c) => {
    add(cyl(0.12 * s, 0.18 * s, 1.4 * s, trunk, 8), x, 0.7 * s, z);
    const lm = mat(c, { rough: 0.85, flat: true });
    add(mesh(new THREE.IcosahedronGeometry(0.95 * s, 1), lm), x, 1.95 * s, z);
    add(mesh(new THREE.IcosahedronGeometry(0.6 * s, 1), lm), x + 0.5 * s, 1.6 * s, z + 0.25 * s);
    add(mesh(new THREE.IcosahedronGeometry(0.62 * s, 1), lm), x - 0.45 * s, 1.65 * s, z - 0.2 * s);
    colliders.push({ type: 'circle', x, z, r: 0.25 * s });
    crown(x, 1.95 * s, z, 0.95 * s);
    crown(x + 0.5 * s, 1.6 * s, z + 0.25 * s, 0.6 * s);
    crown(x - 0.45 * s, 1.65 * s, z - 0.2 * s, 0.62 * s);
  };
  // A crown low enough to reach a kid's head or body blocks the way too (its widest part below 1.3 m)
  const crown = (x, y, z, rr) => {
    const k = 1 - ((Math.min(1.3, Math.max(0.6, y)) - y) / rr) ** 2;
    if (k > 0 && rr * Math.sqrt(k) > 0.3) colliders.push({ type: 'circle', x, z, r: rr * Math.sqrt(k) - 0.18 });
  };
  tree(-12.5, -7.6, 1.1, leafCols[0]);
  tree(12.6, -7.7, 1.05, leafCols[3]);
  tree(-12.7, -0.9, 0.95, leafCols[2]);
  tree(12.75, 0.2, 0.9, leafCols[1]);
  const bush = (x, z, s, c) => {
    const bm = mat(c, { rough: 0.85, flat: true });
    add(mesh(new THREE.IcosahedronGeometry(0.55 * s, 1), bm), x, 0.42 * s, z);
    add(mesh(new THREE.IcosahedronGeometry(0.4 * s, 1), bm), x + 0.5 * s, 0.3 * s, z + 0.15);
    colliders.push({ type: 'circle', x: x + 0.2 * s, z: z + 0.05, r: 0.72 * s, h: 0.75 * s });
  };
  bush(-12.7, 7.6, 1, '#5aa84f');
  bush(12.6, 7.5, 1, '#6dbb58');
  bush(-6.9, -8.35, 0.8, '#84c95f');
  bush(6.9, -8.35, 0.8, '#77c05a');
  // Flower beds inside the front fence
  const F = [];
  const bed = (x0, x1, z, n) => {
    for (let i = 0; i < n; i++) F.push({ x: x0 + ((x1 - x0) * (i + r() * 0.8)) / n, z: z + (r() - 0.5) * 0.35, c: ['#ff8fb1', '#ffffff', '#ffd75e', '#c7a6ff', '#ff6b6b', '#ffb36b'][Math.floor(r() * 6)], h: 0.16 + r() * 0.14 });
  };
  bed(-13.3, -4.8, 8.25, 34);
  bed(4.8, 11.9, 8.25, 26);
  for (const [x0, x1] of [[-13.3, -4.8], [4.8, 11.9]]) add(box(x1 - x0 + 0.3, 0.1, 0.5, '#c98a5a', { rough: 0.9 }), (x0 + x1) / 2, 0.05, 8.25);
  const headGeo = new THREE.IcosahedronGeometry(0.075, 0);
  const stemGeo = new THREE.CylinderGeometry(0.012, 0.015, 1, 4).translate(0, 0.5, 0);
  const heads = new THREE.InstancedMesh(headGeo, mat('#ffffff', { rough: 0.6, flat: true }), F.length);
  const stems = new THREE.InstancedMesh(stemGeo, mat('#4f9a45'), F.length);
  const c3 = new THREE.Color();
  F.forEach((f, i) => {
    heads.setMatrixAt(i, m4.compose(v.set(f.x, f.h + 0.1, f.z), q.identity(), new THREE.Vector3(1, 0.75, 1)));
    heads.setColorAt(i, c3.set(f.c));
    stems.setMatrixAt(i, m4.compose(v.set(f.x, 0.1, f.z), q.identity(), new THREE.Vector3(1, f.h, 1)));
  });
  g.add(heads, stems);
  dynamic.push(heads, stems);

  // ------------------------------------------------ side props: cones, ball bag, water cooler, trophy shelf
  const coneGeo = new THREE.ConeGeometry(0.15, 0.34, 12);
  for (let i = 0; i < 5; i++) {
    const cz = -4.4 + i * 1.05;
    const cx = -12.0 + (i % 2) * 0.55;
    add(mesh(coneGeo, mat('#ff8a5c', { rough: 0.6 })), cx, 0.19, cz);
    add(box(0.34, 0.03, 0.34, '#ff8a5c'), cx, 0.015, cz);
    add(cyl(0.11, 0.12, 0.04, '#fffaf4', 12), cx, 0.2, cz);
    colliders.push({ type: 'circle', x: cx, z: cz, r: 0.17, h: 0.36 });
  }
  // Ball bag: a little net sack with three balls
  const bag = new THREE.Group();
  for (const [x, y, z] of [[-0.16, 0.2, 0], [0.16, 0.2, 0.05], [0, 0.48, 0.02]]) bag.add(at(makeBall(0.19, 1), x, y, z));
  bag.add(at(cyl(0.2, 0.32, 0.12, PAL.teal, 14), 0, 0.06, 0));
  bag.add(at(mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 14), mat(PAL.yellow)), 0, 0.7, 0));
  add(bag, -12.3, 0, 3.4);
  colliders.push({ type: 'circle', x: -12.3, z: 3.4, r: 0.38, h: 0.7 });
  // Water cooler on a table
  const tb = (x, z) => {
    add(rbox(0.9, 0.06, 0.6, PAL.wood, 0.02), x, 0.72, z);
    for (const a of [-1, 1]) for (const b of [-1, 1]) add(box(0.05, 0.7, 0.05, PAL.woodDk), x + a * 0.38, 0.35, z + b * 0.24);
  };
  tb(12.4, 3.1);
  add(cyl(0.19, 0.19, 0.42, '#6fb8ff', 16, { rough: 0.35 }), 12.5, 0.96, 3.0);
  add(cyl(0.2, 0.2, 0.06, '#fffaf4', 16), 12.5, 1.2, 3.0);
  add(cyl(0.2, 0.2, 0.06, '#fffaf4', 16), 12.5, 0.76, 3.0);
  add(box(0.06, 0.05, 0.06, PAL.pink), 12.3, 0.82, 3.0);
  for (let i = 0; i < 3; i++) add(cyl(0.045, 0.035, 0.09, [PAL.pink, PAL.yellow, PAL.mint][i], 10), 12.2 + i * 0.03, 0.8, 3.3 - i * 0.1);
  colliders.push({ type: 'box', x: 12.4, z: 3.1, hw: 0.45, hd: 0.3, h: 0.75 });
  // Trophy shelf: one gold cup for every match won
  const shelf = new THREE.Group();
  shelf.add(at(rbox(1.5, 1.25, 0.42, '#fff1dc', 0.05), 0, 0.625, 0));
  shelf.add(at(box(1.36, 1.0, 0.04, '#f3d9c0'), 0, 0.66, 0.0));
  for (const y of [0.18, 0.66]) shelf.add(at(box(1.36, 0.05, 0.4, PAL.wood), 0, y, 0.02));
  shelf.add(at(rbox(1.62, 0.1, 0.5, PAL.yellow, 0.04), 0, 1.3, 0));
  const shelfSign = painted(1.2, 0.3, 64, (c, w, h) => {
    c.fillStyle = PAL.plum;
    roundRect(c, 2, 2, w - 4, h - 4, h * 0.35);
    c.fill();
    c.fillStyle = PAL.yellow;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 ${h * 0.58}px ${FONT}`;
    c.fillText('Cups we won', w / 2, h * 0.55);
  });
  shelf.add(at(shelfSign, 0, 1.55, 0.05));
  shelf.add(at(box(0.05, 0.4, 0.05, PAL.woodDk), -0.45, 1.4, 0.0));
  shelf.add(at(box(0.05, 0.4, 0.05, PAL.woodDk), 0.45, 1.4, 0.0));
  add(shelf, TROPHY.x, 0, TROPHY.z, -0.25);
  colliders.push({ type: 'box', x: TROPHY.x, z: TROPHY.z, hw: 0.8, hd: 0.3 });
  const cupGeo = mergeGeometries(
    [
      new THREE.LatheGeometry([[0, 0], [0.09, 0], [0.09, 0.025], [0.03, 0.04], [0.025, 0.11], [0.05, 0.13], [0.1, 0.2], [0.11, 0.29], [0.0, 0.29]].map(([x, y]) => new THREE.Vector2(x, y)), 14),
      new THREE.TorusGeometry(0.055, 0.012, 6, 12).translate(0.11, 0.22, 0),
      new THREE.TorusGeometry(0.055, 0.012, 6, 12).translate(-0.11, 0.22, 0),
    ].map((q) => q.toNonIndexed()),
  );
  const cups = new THREE.InstancedMesh(cupGeo, mat('#f4c24f', { metal: 0.6, rough: 0.3 }), 8);
  const cupSpots = [];
  for (const y of [0.205, 0.685]) for (let i = 0; i < 4; i++) cupSpots.push([-0.48 + i * 0.32, y]);
  cupSpots.forEach(([x, y], i) => cups.setMatrixAt(i, m4.compose(v.set(x, y, 0.05), q.identity(), one)));
  cups.count = 0;
  cups.frustumCulled = false; // starts empty, so bounds taken then would hide it for good
  cups.castShadow = true;
  shelf.add(cups);
  dynamic.push(cups);

  // ------------------------------------------------ chalkboard by the entrance
  const chalk = new THREE.Group();
  const chalkTex = canvasTexture(256, 300, (c, w, h) => {
    c.fillStyle = '#3d5a4a';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#fffaf4';
    c.textAlign = 'center';
    c.font = `600 34px ${FONT}`;
    c.fillText('Match today', w / 2, 52);
    c.font = `500 30px ${FONT}`;
    c.fillStyle = '#ffb8c6';
    c.fillText('Roji and', w / 2, 120);
    c.fillText('Homama', w / 2, 156);
    c.fillStyle = '#fffaf4';
    c.font = `500 24px ${FONT}`;
    c.fillText('vs', w / 2, 194);
    c.fillStyle = '#9fe6d2';
    c.font = `500 30px ${FONT}`;
    c.fillText('Sunny Stars', w / 2, 236);
    drawHeart(c, w / 2, 274, 22, '#ffb8c6');
  });
  const chalkFace = mesh(new THREE.PlaneGeometry(0.62, 0.74), new THREE.MeshStandardMaterial({ map: chalkTex, roughness: 0.9 }), { cast: false });
  const frame = rbox(0.72, 0.86, 0.05, PAL.wood, 0.02);
  const front = new THREE.Group();
  front.add(at(frame, 0, 0, 0), at(chalkFace, 0, 0, 0.027));
  front.position.set(0, 0.5, 0.14);
  front.rotation.x = -0.28;
  const backLeg = box(0.7, 0.86, 0.04, PAL.woodDk);
  backLeg.position.set(0, 0.5, -0.14);
  backLeg.rotation.x = 0.28;
  chalk.add(front, backLeg);
  add(chalk, 3.4, 0, 7.35, -0.25);
  colliders.push({ type: 'box', x: 3.4, z: 7.35, hw: 0.38, hd: 0.22, h: 0.95 });

  bakeColors(g, dynamic);
  return { group: g, dynamic, colliders, goals, flags, board, cups };
}
