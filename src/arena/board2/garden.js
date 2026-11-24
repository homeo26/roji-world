import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, mesh, canvasTexture, roundRect, rng, FONT, clamp } from '../../util.js';
import { box, rbox, cyl, ball, at, shade, tint, bakeVC, garden, flowerPatch, clouds } from './kit.js';

// The Snakes and Ladders garden: a 10 x 10 board of painted stepping stones in a flower garden,
// wooden ladders that arch over the board, and cute snakes the kids slide down.

export const S = 1.15; // square size
export const Y = 0.16; // top of the squares
export const HALF = S * 5;
// Tuned so a round lasts a couple of minutes: the winner needs about 23 rolls on average.
export const LADDERS = [[3, 24], [8, 30], [14, 33], [21, 41], [35, 56], [50, 70], [63, 83], [72, 93], [76, 96]];
export const SNAKES = [[16, 6], [47, 27], [59, 38], [69, 49], [87, 57], [95, 75]];
const SNAKE_COLORS = [
  ['#3fbf7f', '#ffe28a'],
  ['#ec5f9e', '#ffd6ea'],
  ['#ff7a59', '#ffe3bf'],
  ['#2bb3c0', '#d4f7f2'],
  ['#8b5cf6', '#e6dcff'],
  ['#f2b824', '#fff4c9'],
  ['#3f7bf0', '#d9e7ff'],
];
const TILE = ['#fff1d0', '#ffe1e8', '#d9f3e4', '#e1e9ff'];
const INK = '#3b2b3f';
const UP = new THREE.Vector3(0, 1, 0);

export function cellRC(n) {
  const r = Math.floor((n - 1) / 10);
  let c = (n - 1) % 10;
  if (r % 2 === 1) c = 9 - c;
  return [r, c];
}
export function cellPos(n, out = new THREE.Vector3()) {
  const [r, c] = cellRC(n);
  return out.set((c - 4.5) * S, Y, (4.5 - r) * S);
}

function drawStar(g, x, y, r, fill, line) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r * 0.48 : r;
    g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  g.closePath();
  g.fillStyle = fill;
  g.strokeStyle = line;
  g.lineWidth = r * 0.16;
  g.lineJoin = 'round';
  g.fill();
  g.stroke();
}

// Painted stepping stones with their numbers (one texture, cut out between the stones).
function boardDecal() {
  const W = 2048;
  const cs = W / 10;
  const tex = canvasTexture(W, W, (g) => {
    g.clearRect(0, 0, W, W);
    const r = rng(11);
    const inset = (0.055 / S) * cs;
    for (let n = 1; n <= 100; n++) {
      const [row, c] = cellRC(n);
      const x = c * cs + inset;
      const y = (9 - row) * cs + inset;
      const w = cs - inset * 2;
      const col = n === 100 ? '#ffd166' : TILE[(row + c) % 4];
      g.fillStyle = col;
      roundRect(g, x, y, w, w, w * 0.16);
      g.fill();
      // Soft speckles and a lighter top edge, like painted stone
      g.save();
      roundRect(g, x, y, w, w, w * 0.16);
      g.clip();
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.fillRect(x, y, w, w * 0.08);
      for (let i = 0; i < 14; i++) {
        g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.28)' : 'rgba(120,80,60,.06)';
        g.beginPath();
        g.arc(x + r() * w, y + r() * w, 2 + r() * 5, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
      g.lineWidth = 5;
      g.strokeStyle = 'rgba(255,255,255,.75)';
      roundRect(g, x + 6, y + 6, w - 12, w - 12, w * 0.13);
      g.stroke();
      g.textBaseline = 'top';
      g.textAlign = 'left';
      g.font = `700 ${n === 100 ? 0 : 50}px ${FONT}`;
      g.fillStyle = 'rgba(59,43,63,.55)';
      if (n !== 100) g.fillText(String(n), x + 16, y + 12);
      if (n === 1) {
        g.textAlign = 'center';
        g.font = `700 40px ${FONT}`;
        g.fillStyle = '#3fa36d';
        g.fillText('START', x + w / 2, y + w * 0.64);
      }
      if (n === 100) {
        drawStar(g, x + w / 2, y + w * 0.4, w * 0.24, '#fff8e1', '#e0a100');
        g.textAlign = 'center';
        g.font = `700 54px ${FONT}`;
        g.fillStyle = '#8a5a00';
        g.fillText('100', x + w / 2, y + w * 0.66);
      }
    }
  });
  const m = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const plane = mesh(new THREE.PlaneGeometry(S * 10, S * 10), m, { cast: false });
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = Y + 0.002;
  return plane;
}

// A tube along a curve with a radius that changes along it, vertex-coloured.
function taperTube(curve, segs, radial, radius, color) {
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [];
  const nor = [];
  const col = [];
  const idx = [];
  const P = new THREE.Vector3();
  const d = new THREE.Vector3();
  const c = new THREE.Color();
  const L = curve.getLength();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    curve.getPointAt(u, P);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    const r = radius(u);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      d.copy(N).multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
      pos.push(P.x + d.x * r, P.y + d.y * r, P.z + d.z * r);
      nor.push(d.x, d.y, d.z);
      color(u, u * L, d, frames.tangents[i], c);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

// Up on the flat parts, behind the neck where it stands up: where a sliding kid sits.
function rideNormal(T, F, out = new THREE.Vector3()) {
  const R = new THREE.Vector3().copy(UP).addScaledVector(F, -0.8 * clamp(Math.abs(T.y) * 1.6, 0, 1)).normalize();
  return out.copy(R).addScaledVector(T, -T.dot(R)).normalize();
}

function buildSnake(head, tail, i, scene) {
  const [main, stripe] = SNAKE_COLORS[i % SNAKE_COLORS.length];
  const H = cellPos(head);
  const T = cellPos(tail);
  const F = new THREE.Vector3().subVectors(T, H).setY(0).normalize();
  const side = new THREE.Vector3(F.z, 0, -F.x);
  // Curl the neck toward the middle of the board, away from any ladder foot
  const ends = LADDERS.flat().map((n) => cellPos(n));
  const cost = (sg) => {
    const q = new THREE.Vector3().copy(H).addScaledVector(side, 0.6 * sg).setY(0);
    return q.length() + (ends.some((e) => Math.hypot(e.x - q.x, e.z - q.z) < 1.0) ? 20 : 0);
  };
  if (cost(1) > cost(-1)) side.negate();
  const P = (s, l, y) => new THREE.Vector3().copy(H).addScaledVector(F, s).addScaledVector(side, l).add(new THREE.Vector3(0, y, 0));
  const pts = [P(0.1, 0, 0.9), P(-0.08, 0, 0.95), P(-0.24, 0.02, 0.76), P(-0.34, 0.05, 0.44), P(-0.36, 0.14, 0.17), P(-0.3, 0.42, 0.16), P(-0.1, 0.62, 0.16), P(0.18, 0.68, 0.16)];
  const E = pts[pts.length - 1].clone();
  const run = new THREE.Vector3().subVectors(T, E).setY(0);
  const len = run.length();
  const rs = new THREE.Vector3(run.z, 0, -run.x).normalize();
  const waves = Math.max(2, Math.round(len / 1.05));
  const steps = Math.max(5, Math.round(len / 0.32));
  for (let k = 1; k <= steps; k++) {
    const f = k / steps;
    const p = new THREE.Vector3().copy(E).addScaledVector(run, f);
    p.addScaledVector(rs, Math.sin(f * Math.PI * waves) * 0.3 * (1 - f * 0.45));
    p.y = Y + 0.16 * (1 - 0.7 * f) + 0.07 * Math.max(0, Math.sin(f * Math.PI * waves));
    pts.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const radius = (u) => (u < 0.05 ? THREE.MathUtils.lerp(0.13, 0.17, u / 0.05) : 0.17 * (1 - 0.75 * THREE.MathUtils.smoothstep(u, 0.12, 1)));
  const cMain = new THREE.Color(main);
  const cStripe = new THREE.Color(stripe);
  const cBelly = new THREE.Color(tint(stripe, '#ffffff', 0.35));
  const nr = new THREE.Vector3();
  const geo = taperTube(curve, 96, 10, radius, (u, s, d, Tn, out) => {
    const k = 0.5 + 0.5 * Math.cos((s / 0.3) * Math.PI * 2);
    out.copy(cMain).lerp(cStripe, THREE.MathUtils.smoothstep(k, 0.7, 0.85));
    rideNormal(Tn, F, nr);
    if (d.dot(nr) < -0.45) out.lerp(cBelly, 0.85);
  });
  // Tail tip
  const tip = new THREE.SphereGeometry(radius(1) * 1.02, 10, 8);
  tip.translate(...curve.getPointAt(1).toArray());
  const tc = new Float32Array(tip.attributes.position.count * 3).map((_, j) => [cMain.r, cMain.g, cMain.b][j % 3]);
  tip.setAttribute('color', new THREE.BufferAttribute(tc, 3));
  tip.deleteAttribute('uv');

  // Head
  const headPos = curve.getPointAt(0);
  const hg = new THREE.Group();
  const skull = ball(0.21, main, { rough: 0.55 }, 20);
  skull.scale.set(1.05, 0.8, 1.2);
  hg.add(skull);
  const snout = ball(0.15, main, { rough: 0.55 }, 18);
  snout.scale.set(1.05, 0.62, 0.95);
  hg.add(at(snout, 0, -0.04, 0.17));
  const chin = ball(0.13, tint(stripe, '#ffffff', 0.3), { rough: 0.6 }, 16);
  chin.scale.set(1, 0.45, 1);
  hg.add(at(chin, 0, -0.1, 0.12));
  for (const sx of [-1, 1]) {
    const eye = ball(0.078, '#ffffff', { rough: 0.25 }, 16);
    hg.add(at(eye, 0.1 * sx, 0.11, 0.1));
    const pupil = ball(0.046, '#1d130f', { rough: 0.2 }, 12);
    hg.add(at(pupil, 0.105 * sx, 0.12, 0.165));
    const shine = ball(0.015, '#ffffff', { emissive: '#ffffff', ei: 0.6 }, 8);
    hg.add(at(shine, 0.115 * sx, 0.14, 0.205));
    const lid = ball(0.08, shade(main, 0.85), { rough: 0.55 }, 14, );
    lid.scale.set(1.05, 0.45, 1.05);
    hg.add(at(lid, 0.1 * sx, 0.17, 0.09));
    const cheek = ball(0.04, '#ff8fa0', { rough: 0.7 }, 10);
    cheek.scale.set(1.2, 0.7, 0.4);
    hg.add(at(cheek, 0.155 * sx, -0.03, 0.2));
    const nost = ball(0.014, shade(main, 0.55), {}, 6);
    hg.add(at(nost, 0.04 * sx, 0.02, 0.315));
  }
  const smile = mesh(new THREE.TorusGeometry(0.06, 0.011, 6, 14, Math.PI), mat('#7a2e3a', { rough: 0.5 }), { cast: false });
  smile.rotation.set(-0.35, 0, Math.PI);
  hg.add(at(smile, 0, -0.035, 0.305));
  // A little flower behind the eyes on some snakes
  if (i % 2 === 0) {
    const fl = new THREE.Group();
    for (let p = 0; p < 5; p++) {
      const pet = ball(0.04, i % 4 ? '#ffffff' : '#ffd166', { rough: 0.6 }, 8);
      pet.scale.set(1, 0.5, 1);
      pet.position.set(Math.cos((p / 5) * Math.PI * 2) * 0.045, 0, Math.sin((p / 5) * Math.PI * 2) * 0.045);
      fl.add(pet);
    }
    fl.add(at(ball(0.03, '#ff8fb1', {}, 8), 0, 0.01, 0));
    fl.rotation.set(-0.4, 0, 0.5);
    hg.add(at(fl, -0.12, 0.2, -0.05));
  }
  const tongue = new THREE.Group();
  const tm = mat('#e5484d', { rough: 0.5 });
  tongue.add(at(box(0.03, 0.012, 0.13, tm), 0, 0, 0.065));
  for (const sx of [-1, 1]) {
    const f = box(0.018, 0.012, 0.06, tm);
    f.rotation.y = 0.45 * sx;
    tongue.add(at(f, 0.014 * sx, 0, 0.145));
  }
  tongue.position.set(0, -0.07, 0.3);
  hg.add(tongue);
  const pivot = new THREE.Group();
  pivot.position.copy(headPos).add(new THREE.Vector3(0, 0.05, 0)).addScaledVector(F, 0.02);
  pivot.rotation.order = 'YXZ';
  pivot.rotation.y = Math.atan2(F.x, F.z);
  pivot.rotation.x = 0.22;
  pivot.scale.setScalar(1.3);
  pivot.add(hg);
  scene.add(pivot);
  bakeVC(tongue);
  tongue.traverse((o) => (o.castShadow = false));
  bakeVC(hg, [tongue]);
  const ph = i * 1.7;
  return {
    head,
    tail,
    color: main,
    top: headPos.y + 0.28,
    curve,
    length: curve.getLength(),
    radius,
    F,
    geo: [geo, tip],
    pivot,
    hg,
    tongue,
    gulp: 0,
    ride: (u, out) => rideNormal(curve.getTangentAt(u), F, out),
    update(dt, t) {
      this.gulp = Math.max(0, this.gulp - dt * 1.6);
      const g = this.gulp;
      hg.rotation.y = Math.sin(t * 1.1 + ph) * 0.14;
      hg.rotation.z = Math.sin(t * 0.8 + ph) * 0.06;
      hg.position.y = Math.sin(t * 2 + ph) * 0.02 - Math.sin(g * Math.PI) * 0.12;
      hg.rotation.x = Math.sin(g * Math.PI) * 0.4;
      const s = 1 + Math.sin(g * Math.PI * 2) * 0.12;
      hg.scale.set(s, 2 - s, s);
      const flick = (t * 0.7 + ph * 0.3) % 2.2;
      const k = flick < 0.5 ? Math.sin((flick / 0.5) * Math.PI) : 0;
      tongue.scale.set(1, 1, Math.max(0.02, k));
      tongue.rotation.y = Math.sin(t * 30) * 0.2 * k;
      tongue.visible = k > 0.03;
    },
  };
}

function buildLadder(bottom, top) {
  const A = cellPos(bottom);
  const B = cellPos(top);
  const dir = new THREE.Vector3().subVectors(B, A).setY(0);
  const span = dir.length();
  dir.normalize();
  const sideV = new THREE.Vector3(dir.z, 0, -dir.x);
  const h = clamp(span * 0.52, 1.15, 1.65);
  const c1 = A.clone().addScaledVector(UP, h * 1.3).addScaledVector(dir, span * 0.1);
  const c2 = B.clone().addScaledVector(UP, h * 1.3).addScaledVector(dir, -span * 0.1);
  const curve = new THREE.CubicBezierCurve3(A, c1, c2, B);
  const g = new THREE.Group();
  const W = 0.31;
  const rail = mat('#c9874f', { rough: 0.8 });
  const rungM = mat('#f2c58a', { rough: 0.75 });
  for (const s of [-1, 1]) {
    const off = sideV.clone().multiplyScalar(W * s);
    const pts = curve.getSpacedPoints(30).map((p) => p.clone().add(off));
    pts[0].y -= 0.05;
    pts[pts.length - 1].y -= 0.05;
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.048, 6), rail));
    for (const e of [pts[0], pts[pts.length - 1]]) g.add(at(cyl(0.07, 0.08, 0.06, '#8b5e3c', 10), e.x, Y + 0.03, e.z));
  }
  const L = curve.getLength();
  const n = Math.floor((L - 0.3) / 0.3);
  const rungGeo = new THREE.CylinderGeometry(0.035, 0.035, W * 2, 8);
  rungGeo.rotateZ(Math.PI / 2);
  const yaw = Math.atan2(sideV.x, sideV.z) - Math.PI / 2;
  const r = rng(bottom * 7 + 3);
  const leaf = mat('#5aa84f', { rough: 0.8 });
  const petals = ['#ff8fb1', '#ffffff', '#ffd75e', '#c7a6ff'];
  for (let i = 0; i <= n; i++) {
    const u = (0.15 + i * ((L - 0.3) / n)) / L;
    const p = curve.getPointAt(u);
    const rg = mesh(rungGeo, rungM);
    rg.position.copy(p);
    rg.rotation.y = yaw;
    g.add(rg);
    // Little vines on the rails
    if (r() < 0.55) {
      const s = r() < 0.5 ? -1 : 1;
      const q = p.clone().addScaledVector(sideV, W * s).add(new THREE.Vector3(0, 0.04, 0));
      const lf = ball(0.05, leaf, undefined, 8);
      lf.scale.set(1.3, 0.5, 0.8);
      lf.rotation.set(r(), r() * 3, r());
      g.add(at(lf, q.x, q.y, q.z));
      if (r() < 0.45) g.add(at(ball(0.04, petals[Math.floor(r() * petals.length)], { rough: 0.6 }, 8), q.x + 0.03, q.y + 0.05, q.z));
    }
  }
  return { bottom, top, curve, length: L, dir, height: h, group: g };
}

// Garden decor around the board.
function decor(g, ctx) {
  const lawn = mesh(new THREE.CircleGeometry(60, 48), mat('#9ad06a', { rough: 0.95 }), { cast: false });
  lawn.rotation.x = -Math.PI / 2;
  g.add(lawn);
  // Stepping stones from the front up to the board
  const stoneM = mat('#efe0c6', { rough: 0.95 });
  [[-0.6, 9.6], [0.4, 8.7], [-0.3, 7.8], [0.5, 6.95]].forEach(([x, z], k) => {
    const st = mesh(new THREE.CylinderGeometry(0.42 - k * 0.02, 0.45, 0.06, 18), stoneM, { cast: false });
    st.scale.set(1.2, 1, 0.85);
    g.add(at(st, x, 0.03, z));
  });
  // Soil bed under the stones and the wooden frame
  g.add(at(rbox(S * 10 + 0.3, 0.08, S * 10 + 0.3, '#78b956', 0.03, { rough: 0.95 }), 0, 0.035, 0));
  const E = HALF + 0.27;
  const wood = '#c98a55';
  for (const [x, z, w, d] of [[0, E, S * 10 + 0.8, 0.24], [0, -E, S * 10 + 0.8, 0.24], [E, 0, 0.24, S * 10 + 0.3], [-E, 0, 0.24, S * 10 + 0.3]]) {
    g.add(at(rbox(w, 0.26, d, wood, 0.05), x, 0.13, z));
    g.add(at(rbox(w + 0.04, 0.05, d + 0.04, '#e0a46c', 0.02), x, 0.27, z));
  }
  const caps = ['#ff8fb1', '#ffd166', '#7fd3a7', '#6fb8ff'];
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz], i) => {
    g.add(at(cyl(0.2, 0.22, 0.46, shade(wood, 0.9), 12), sx * E, 0.23, sz * E));
    g.add(at(ball(0.2, caps[i], { rough: 0.5 }, 14), sx * E, 0.52, sz * E));
  });
  // Hedges on three sides with flowers on top
  const hedge = mat('#5aa84f', { rough: 0.9 });
  const F = [];
  const r = rng(21);
  const hedgeAt = (x, z, w, d) => {
    g.add(at(rbox(w, 0.8, d, hedge, 0.25), x, 0.4, z));
    for (let k = 0; k < Math.round((w * d) / 0.12); k++) F.push({ x: x + (r() - 0.5) * (w - 0.25), z: z + (r() - 0.5) * (d - 0.2), c: ['#ff8fb1', '#ffffff', '#ffd75e', '#c7a6ff', '#ff6b6b'][Math.floor(r() * 5)], h: 0.06, y: 0.78 });
  };
  const HZ = HALF + 1.45;
  for (let k = -3; k <= 3; k++) hedgeAt(k * 1.9, -HZ, 1.75, 0.85);
  for (const sx of [-1, 1]) for (let k = -3; k <= 2; k++) hedgeAt(sx * HZ, k * 1.9 + 0.3, 0.85, 1.75);
  // Mushrooms
  const mush = (x, z, s, c) => {
    g.add(at(cyl(0.06 * s, 0.08 * s, 0.22 * s, '#fff4e0', 8), x, 0.11 * s, z));
    const capM = ball(0.16 * s, c, { rough: 0.5 }, 12);
    capM.scale.set(1, 0.62, 1);
    g.add(at(capM, x, 0.24 * s, z));
    for (let k = 0; k < 4; k++) g.add(at(ball(0.03 * s, '#ffffff', {}, 6), x + Math.cos(k * 1.6) * 0.09 * s, 0.31 * s, z + Math.sin(k * 1.6) * 0.09 * s));
  };
  mush(-7.4, 4.2, 1.6, '#e5484d');
  mush(-7.0, 4.8, 1.1, '#ff8fb1');
  mush(7.3, -2.2, 1.4, '#e5484d');
  mush(7.6, 5.6, 1.2, '#ffd166');
  // Watering can
  const can = new THREE.Group();
  can.add(at(cyl(0.18, 0.2, 0.32, '#6fb8ff', 14), 0, 0.16, 0));
  const spout = cyl(0.025, 0.04, 0.36, '#6fb8ff', 8);
  spout.rotation.z = -0.9;
  can.add(at(spout, 0.28, 0.26, 0));
  can.add(at(cyl(0.06, 0.03, 0.06, '#6fb8ff', 8), 0.43, 0.37, 0));
  const handle = mesh(new THREE.TorusGeometry(0.13, 0.02, 6, 14, Math.PI), mat('#6fb8ff'));
  handle.rotation.z = Math.PI / 2;
  can.add(at(handle, -0.12, 0.3, 0));
  can.position.set(7.1, 0, 3.4);
  can.rotation.y = 2.4;
  g.add(can);
  // Wooden sign at the front
  const sign = ctx.signTex;
  g.add(at(cyl(0.06, 0.06, 1.2, '#8b5e3c', 8), 1.5, 0.6, E + 0.9));
  g.add(at(cyl(0.06, 0.06, 1.2, '#8b5e3c', 8), 4.1, 0.6, E + 0.9));
  g.add(at(rbox(3.0, 0.8, 0.12, '#c98a55', 0.05), 2.8, 1.15, E + 0.92));
  const board = mesh(new THREE.PlaneGeometry(2.8, 0.7), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.8 }), { cast: false });
  g.add(at(board, 2.8, 1.15, E + 0.99));
  // Flower arch over the start square
  const S1 = cellPos(1);
  const arch = new THREE.Group();
  const archCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.75, 0, 0), new THREE.Vector3(-0.75, 1.9, 0), new THREE.Vector3(0, 2.55, 0), new THREE.Vector3(0.75, 1.9, 0), new THREE.Vector3(0.75, 0, 0)]);
  arch.add(mesh(new THREE.TubeGeometry(archCurve, 40, 0.06, 7), mat('#ffffff', { rough: 0.6 })));
  for (let k = 0; k <= 24; k++) {
    const p = archCurve.getPointAt(k / 24);
    const lf = ball(0.12, k % 3 ? '#6dbb58' : '#84c95f', { rough: 0.85, flat: true }, 8);
    arch.add(at(lf, p.x + (r() - 0.5) * 0.08, p.y, p.z + (r() - 0.5) * 0.12));
    if (k % 2 === 0) arch.add(at(ball(0.07, ['#ff8fb1', '#ffd75e', '#ffffff', '#c7a6ff'][k % 4], { rough: 0.6 }, 8), p.x, p.y + 0.06, p.z + 0.11));
  }
  arch.position.set(-E - 0.55, 0, S1.z);
  arch.rotation.y = Math.PI / 2;
  g.add(arch);
  // Trophy behind square 100
  const S100 = cellPos(100);
  const gold = mat('#f4c24f', { metal: 0.6, rough: 0.3 });
  const tro = new THREE.Group();
  tro.add(at(rbox(0.9, 0.5, 0.9, '#fffaf4', 0.06), 0, 0.25, 0));
  tro.add(at(rbox(0.96, 0.06, 0.96, '#ff8fb1', 0.03), 0, 0.5, 0));
  tro.add(at(cyl(0.22, 0.28, 0.12, gold, 16), 0, 0.59, 0));
  tro.add(at(cyl(0.06, 0.1, 0.3, gold, 12), 0, 0.8, 0));
  const cup = mesh(new THREE.LatheGeometry([[0.08, 0], [0.26, 0.05], [0.36, 0.25], [0.38, 0.5], [0.34, 0.52]].map(([x, y]) => new THREE.Vector2(x, y)), 24), gold);
  tro.add(at(cup, 0, 0.94, 0));
  for (const sx of [-1, 1]) {
    const ear = mesh(new THREE.TorusGeometry(0.13, 0.03, 6, 14), gold);
    ear.rotation.y = Math.PI / 2;
    tro.add(at(ear, sx * 0.38, 1.24, 0));
  }
  tro.add(at(ball(0.11, '#ef5b6f', { rough: 0.4 }, 12), 0, 1.5, 0));
  tro.position.set(S100.x, 0, -HZ + 0.05);
  g.add(tro);
  flowerPatch(g, F);
  // Garden all around (keeping the board, the hedges and the front path clear)
  garden(g, {
    seed: 5,
    bounds: [-26, 26, -24, 20],
    free: (x, z, kind) => {
      const ax = Math.abs(x);
      if (ax < HZ + 0.8 && z < HZ + 0.8 && z > -HZ - 0.8) return false;
      if (z > HZ - 1 && ax < 6 && kind !== 'flower' && kind !== 'tuft') return false;
      if (z > HZ + 0.5 && z < 10 && ax < 5) return kind === 'tuft' && Math.abs(x + 2) > 3.5;
      if (kind === 'tree') return Math.hypot(x, z) > 10;
      return true;
    },
    trees: 24,
    bushes: 30,
    flowers: 320,
    tufts: 260,
  });
  clouds(g, { radius: 80 });
}

// Butterflies flapping over the garden (one draw call).
function butterflies(scene) {
  const n = 6;
  const wing = new THREE.CircleGeometry(0.1, 10);
  wing.translate(0.1, 0, 0);
  const im = new THREE.InstancedMesh(wing, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), n * 2);
  im.frustumCulled = false;
  const cols = ['#ff8fb1', '#ffd166', '#c7a6ff', '#7fd3ff', '#ffffff', '#ffb36b'];
  const r = rng(4);
  const list = [];
  for (let i = 0; i < n; i++) {
    list.push({ cx: (r() - 0.5) * 16, cz: (r() - 0.5) * 16, rad: 1.5 + r() * 2.5, sp: 0.25 + r() * 0.3, ph: r() * 6, y: 1.2 + r() * 1.5 });
    im.setColorAt(i * 2, new THREE.Color(cols[i]));
    im.setColorAt(i * 2 + 1, new THREE.Color(cols[i]));
  }
  scene.add(im);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  return (t) => {
    list.forEach((b, i) => {
      const a = t * b.sp + b.ph;
      v.set(b.cx + Math.cos(a) * b.rad, b.y + Math.sin(t * 1.7 + b.ph) * 0.3, b.cz + Math.sin(a * 1.3) * b.rad);
      const yaw = a + Math.PI;
      const flap = Math.sin(t * 16 + b.ph) * 0.9;
      for (const s of [0, 1]) {
        e.set(Math.PI / 2 - 0.4, yaw, (s ? Math.PI - flap : flap), 'YXZ');
        q.setFromEuler(e);
        im.setMatrixAt(i * 2 + s, m4.compose(v, q, one));
      }
    });
    im.instanceMatrix.needsUpdate = true;
  };
}

export function buildGarden(ctx) {
  const { scene } = ctx;
  const g = new THREE.Group();
  scene.add(g);
  const signTex = canvasTexture(800, 200, (c, w, h) => {
    c.fillStyle = '#f7e2c4';
    roundRect(c, 0, 0, w, h, 34);
    c.fill();
    c.strokeStyle = '#c98a55';
    c.lineWidth = 10;
    roundRect(c, 12, 12, w - 24, h - 24, 26);
    c.stroke();
    c.fillStyle = '#7a4a26';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 74px ${FONT}`;
    c.fillText('Snakes and Ladders', w / 2, h / 2 + 4);
  });
  decor(g, { signTex });
  // Stepping stones: thick bodies (instanced) and their painted tops
  const tileGeo = new THREE.BoxGeometry(S - 0.11, 0.09, S - 0.11);
  const tiles = new THREE.InstancedMesh(tileGeo, mat('#ffffff', { rough: 0.8 }), 100);
  const m4 = new THREE.Matrix4();
  for (let n = 1; n <= 100; n++) {
    const [r, c] = cellRC(n);
    const p = cellPos(n);
    tiles.setMatrixAt(n - 1, m4.makeTranslation(p.x, Y - 0.045, p.z));
    tiles.setColorAt(n - 1, new THREE.Color(shade(n === 100 ? '#ffd166' : TILE[(r + c) % 4], 0.9)));
  }
  tiles.receiveShadow = true;
  g.add(tiles);
  g.add(boardDecal());
  // Tiny flowers between the stones
  const fr = rng(8);
  const bits = [];
  for (let i = 1; i < 10; i++) {
    for (let j = 1; j < 10; j++) {
      if (fr() < 0.4) bits.push({ x: (i - 5) * S + (fr() - 0.5) * 0.04, z: (j - 5) * S + (fr() - 0.5) * 0.04, c: ['#ff8fb1', '#ffffff', '#ffd75e', '#c7a6ff'][Math.floor(fr() * 4)], h: 0.05, y: 0.07 });
    }
  }
  flowerPatch(g, bits);
  // Ladders
  const ladders = LADDERS.map(([a, b]) => {
    const l = buildLadder(a, b);
    g.add(l.group);
    return l;
  });
  bakeVC(g, [tiles]);
  // Snakes: all bodies in one mesh; heads move on their own
  const snakes = SNAKES.map(([h, t], i) => buildSnake(h, t, i, scene));
  const body = mesh(mergeGeometries(snakes.flatMap((s) => s.geo), false), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }));
  scene.add(body);
  const flutter = butterflies(scene);
  return {
    group: g,
    ladders,
    snakes,
    ladderAt: new Map(ladders.map((l) => [l.bottom, l])),
    snakeAt: new Map(snakes.map((s) => [s.head, s])),
    update(dt, t) {
      for (const s of snakes) s.update(dt, t);
      flutter(t);
    },
  };
}
