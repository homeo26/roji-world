import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, umat, mesh, canvasTexture, roundRect, rng, FONT, heartShape } from '../../util.js';
import { box, rbox, cyl, ball, cone, at, painted, bannerDraw, bakeVC, scatterNature, addFlowers, sky, bunting } from './kit.js';

// The Meadow Cup racecourse: a winding loop with white rails, hurdles, water jumps,
// a grandstand, the finish arch and a meadow around it.

export const HW = 4.8; // half width of the dirt
export const LIM = HW - 0.55; // how far from the centre line a pony can go
const RAIL = HW + 0.35;

// Centre line, counter-clockwise from above. s = 0 is the finish line in front of the grandstand.
const CTRL = [
  [0, 22], [24, 22], [44, 21.5], [60, 13], [65, -4], [56, -21], [36, -28], [14, -22],
  [-6, -30], [-28, -30], [-50, -22], [-63, -6], [-58, 12], [-42, 21.5], [-22, 22],
];

export function makeTrack() {
  const curve = new THREE.CatmullRomCurve3(CTRL.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
  const L = curve.getLength();
  const N = 900;
  const ds = L / N;
  const raw = curve.getSpacedPoints(N);
  const px = new Float32Array(N);
  const pz = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    px[i] = raw[i].x;
    pz[i] = raw[i].z;
  }
  const tx = new Float32Array(N);
  const tz = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = (i - 1 + N) % N;
    const b = (i + 1) % N;
    const dx = px[b] - px[a];
    const dz = pz[b] - pz[a];
    const l = Math.hypot(dx, dz) || 1;
    tx[i] = dx / l;
    tz[i] = dz / l;
  }
  const mod = (s) => ((s % L) + L) % L;
  const idx = (s) => {
    const u = mod(s) / ds;
    const i = Math.floor(u) % N;
    return [i, (i + 1) % N, u - Math.floor(u)];
  };
  const T = {
    L,
    N,
    ds,
    px,
    pz,
    tx,
    tz,
    mod,
    // World point at progress s and sideways offset d (d > 0 is the rider's left).
    at(s, d = 0, out = new THREE.Vector3()) {
      const [i, j, f] = idx(s);
      const cx = px[i] + (px[j] - px[i]) * f;
      const cz = pz[i] + (pz[j] - pz[i]) * f;
      const ux = tx[i] + (tx[j] - tx[i]) * f;
      const uz = tz[i] + (tz[j] - tz[i]) * f;
      const l = Math.hypot(ux, uz) || 1;
      return out.set(cx + (uz / l) * d, 0, cz - (ux / l) * d);
    },
    yaw(s) {
      const [i, j, f] = idx(s);
      return Math.atan2(tx[i] + (tx[j] - tx[i]) * f, tz[i] + (tz[j] - tz[i]) * f);
    },
    // Turn per metre at s (signed, + is a left turn).
    bend(s) {
      const a = T.yaw(s - 4);
      const b = T.yaw(s + 4);
      let d = b - a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return d / 8;
    },
    // Nearest centre point to (x, z). hint: last index, or -1 to search everything.
    project(x, z, hint = -1) {
      let best = Infinity;
      let bi = 0;
      const scan = (i) => {
        const dx = x - px[i];
        const dz = z - pz[i];
        const q = dx * dx + dz * dz;
        if (q < best) {
          best = q;
          bi = i;
        }
      };
      if (hint < 0) for (let i = 0; i < N; i++) scan(i);
      else for (let k = -14; k <= 14; k++) scan((hint + k + N) % N);
      const dx = x - px[bi];
      const dz = z - pz[bi];
      const along = dx * tx[bi] + dz * tz[bi];
      return { i: bi, s: mod(bi * ds + along), d: dx * tz[bi] - dz * tx[bi] };
    },
    // Distance from (x, z) to the centre line (coarse, for scattering).
    dist(x, z) {
      let best = Infinity;
      for (let i = 0; i < N; i += 3) {
        const dx = x - px[i];
        const dz = z - pz[i];
        const q = dx * dx + dz * dz;
        if (q < best) best = q;
      }
      return Math.sqrt(best);
    },
  };
  return T;
}

// Pick straight-ish spots near the wanted fractions of the lap for the jumps.
export function placeObstacles(T) {
  const want = [
    [0.12, 'hurdle'],
    [0.27, 'water'],
    [0.43, 'hurdle'],
    [0.6, 'hurdle'],
    [0.79, 'water'],
  ];
  return want.map(([f, kind]) => {
    let best = f * T.L;
    let bestB = Infinity;
    for (let k = -0.05; k <= 0.05; k += 0.005) {
      const s = (f + k) * T.L;
      let b = 0;
      for (let q = -12; q <= 12; q += 3) b += Math.abs(T.bend(s + q));
      if (b < bestB) {
        bestB = b;
        best = s;
      }
    }
    return { s: best, kind, len: kind === 'water' ? 2.2 : 0 };
  });
}

// ------------------------------------------------------------------ textures
function dirtTexture() {
  const tex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e6c58f';
    ctx.fillRect(0, 0, w, h);
    const r = rng(9);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = r() < 0.5 ? 'rgba(170,120,70,0.18)' : 'rgba(255,245,225,0.28)';
      const s = 1 + r() * 3;
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, s, 0, Math.PI * 2);
      ctx.fill();
    }
    // Soft hoof prints
    ctx.strokeStyle = 'rgba(160,110,60,0.22)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 26; i++) {
      const x = r() * w;
      const y = r() * h;
      ctx.beginPath();
      ctx.arc(x, y, 6, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    // Faint raked lines along the track
    ctx.strokeStyle = 'rgba(200,150,95,0.18)';
    ctx.lineWidth = 2;
    for (let x = 10; x < w; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function chevronTexture() {
  const tex = canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e6c58f';
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,214,102,0.0)');
    g.addColorStop(0.5, 'rgba(255,214,102,0.75)');
    g.addColorStop(1, 'rgba(255,214,102,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,250,240,0.9)';
    for (let i = 0; i < 4; i++) {
      const cx = w * (0.125 + i * 0.25);
      ctx.beginPath();
      ctx.moveTo(cx - 22, h * 0.72);
      ctx.lineTo(cx, h * 0.3);
      ctx.lineTo(cx + 22, h * 0.72);
      ctx.lineTo(cx + 12, h * 0.72);
      ctx.lineTo(cx, h * 0.5);
      ctx.lineTo(cx - 12, h * 0.72);
      ctx.closePath();
      ctx.fill();
    }
  });
  return tex;
}

function checkerTexture() {
  return canvasTexture(256, 32, (ctx, w, h) => {
    const n = 16;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#3b2b3f' : '#fffaf4';
        ctx.fillRect((i * w) / n, (j * h) / 2, w / n, h / 2);
      }
    }
  });
}

// A strip that follows the track between s0 and s1 at sideways offsets d0..d1.
function stripGeometry(T, s0, s1, d0, d1, y, step = 0.5, vScale = 1) {
  const n = Math.max(2, Math.ceil((s1 - s0) / step));
  const pos = [];
  const uv = [];
  const ind = [];
  const p = new THREE.Vector3();
  for (let k = 0; k <= n; k++) {
    const s = s0 + ((s1 - s0) * k) / n;
    T.at(s, d0, p);
    pos.push(p.x, y, p.z);
    T.at(s, d1, p);
    pos.push(p.x, y, p.z);
    const v = vScale === 0 ? k / n : (s - s0) / vScale;
    uv.push(0, v, 1, v);
    if (k < n) {
      const a = k * 2;
      if (d0 > d1) ind.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      else ind.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(ind);
  return g;
}

// ------------------------------------------------------------------ pieces
function hurdle(T, s) {
  const g = new THREE.Group();
  T.at(s, 0, g.position);
  g.rotation.y = T.yaw(s);
  const red = '#ef5b6f';
  const white = '#fffaf4';
  const span = HW * 2 - 0.4;
  // Wings
  for (const side of [1, -1]) {
    const x = side * (HW - 0.12);
    for (const z of [-0.22, 0.22]) g.add(at(cyl(0.05, 0.055, 1.05, white, 8), x, 0.52, z));
    const wing = rbox(0.12, 0.7, 0.62, white, 0.04);
    at(wing, x + side * 0.02, 0.62, 0);
    const cap = rbox(0.16, 0.08, 0.7, red, 0.03);
    at(cap, x, 1.06, 0);
    g.add(wing, cap);
    for (const z of [-0.22, 0.22]) g.add(at(ball(0.065, '#ffd166', { rough: 0.5 }, 10), x, 1.1, z));
    const pot = cyl(0.17, 0.13, 0.26, '#f08a5d', 12);
    at(pot, x + side * 0.38, 0.13, 0.55);
    const leaves = ball(0.2, '#5aa84f', { flat: true }, 8);
    at(leaves, x + side * 0.38, 0.36, 0.55);
    g.add(pot, leaves);
    for (let k = 0; k < 3; k++) g.add(at(ball(0.05, ['#ff8fb1', '#ffffff', '#ffd75e'][k], {}, 8), x + side * 0.38 + (k - 1) * 0.09, 0.5, 0.55 + (k % 2) * 0.06));
  }
  // Low brush under the pole
  const brush = rbox(span, 0.26, 0.36, '#5fae52', 0.1, { flat: true });
  at(brush, 0, 0.13, 0);
  g.add(brush);
  const r = rng(Math.round(s));
  for (let k = 0; k < 18; k++) g.add(at(ball(0.055, ['#ff8fb1', '#ffffff', '#ffd75e', '#c7a6ff'][k % 4], {}, 8), (r() - 0.5) * (span - 0.3), 0.27, (r() - 0.5) * 0.25));
  // The striped pole wobbles when knocked, so it is its own group
  const pole = new THREE.Group();
  pole.position.set(0, 0.52, 0);
  const segs = 9;
  for (let k = 0; k < segs; k++) {
    const c = cyl(0.06, 0.06, span / segs, k % 2 ? white : red, 10);
    c.rotation.z = Math.PI / 2;
    c.position.x = -span / 2 + (span / segs) * (k + 0.5);
    pole.add(c);
  }
  bakeVC(pole);
  g.add(pole);
  return { group: g, pole };
}

function waterJump(T, s, len) {
  const g = new THREE.Group();
  T.at(s, 0, g.position);
  g.rotation.y = T.yaw(s);
  const span = HW * 2 - 0.2;
  // Hedge at the front
  const hedge = rbox(span, 0.34, 0.5, '#5aa84f', 0.12, { flat: true });
  at(hedge, 0, 0.17, 0);
  g.add(hedge);
  const r = rng(Math.round(s) + 3);
  for (let k = 0; k < 22; k++) g.add(at(ball(0.055, ['#ff8fb1', '#ffffff', '#ffd75e'][k % 3], {}, 8), (r() - 0.5) * (span - 0.3), 0.35, (r() - 0.5) * 0.3));
  // The pool behind it
  const pool = box(span, 0.04, len, umat('#62bfe6', { rough: 0.15, emissive: '#9be3ff', ei: 0.18 }));
  at(pool, 0, 0.018, 0.3 + len / 2);
  pool.castShadow = false;
  g.add(pool);
  for (const z of [0.3, 0.3 + len]) {
    const edge = box(span + 0.1, 0.08, 0.12, '#fffaf4');
    at(edge, 0, 0.04, z);
    g.add(edge);
  }
  for (const side of [1, -1]) {
    const edge = box(0.12, 0.08, len, '#fffaf4');
    at(edge, side * span / 2, 0.04, 0.3 + len / 2);
    g.add(edge);
    // Little reed tufts and a duck sign at the side
    for (let k = 0; k < 4; k++) g.add(at(cone(0.04, 0.5, '#4f9a45', 5), side * (span / 2 + 0.35), 0.25, 0.4 + k * 0.5));
  }
  const ripples = [];
  for (let k = 0; k < 3; k++) {
    const ring = mesh(new THREE.TorusGeometry(0.4 + k * 0.15, 0.025, 4, 20), mat('#e6f8ff', { emissive: '#ffffff', ei: 0.3 }), { cast: false });
    ring.rotation.x = Math.PI / 2;
    ring.scale.set(1, 1, 1);
    at(ring, (k - 1) * 2.6, 0.045, 0.3 + len * (0.35 + k * 0.15));
    g.add(ring);
    ripples.push(ring);
  }
  return { group: g, pool, ripples };
}

function finishArch(T) {
  const g = new THREE.Group();
  T.at(0, 0, g.position);
  g.rotation.y = T.yaw(0);
  const X = RAIL + 0.9;
  for (const side of [1, -1]) {
    for (let k = 0; k < 11; k++) g.add(at(cyl(0.17, 0.17, 0.46, k % 2 ? '#fffaf4' : '#ef5b6f', 14), side * X, 0.23 + k * 0.46, 0));
    g.add(at(ball(0.26, '#ffd166', { rough: 0.4, metal: 0.3 }, 14), side * X, 5.3, 0));
    g.add(at(cyl(0.3, 0.36, 0.2, '#fffaf4', 14), side * X, 0.1, 0));
  }
  const beam = rbox(X * 2 + 0.2, 0.22, 0.3, '#fffaf4', 0.08);
  at(beam, 0, 5.12, 0);
  g.add(beam);
  const W = X * 2 - 0.5;
  const front = painted(W, 0.95, 120, bannerDraw('FINISH', { bg: '#ef5b6f' }));
  at(front, 0, 4.55, -0.17);
  front.rotation.y = Math.PI;
  const back = painted(W, 0.95, 120, bannerDraw('MEADOW CUP', { bg: '#3fb6a8' }));
  at(back, 0, 4.55, 0.17);
  const board = rbox(W + 0.1, 1.0, 0.3, '#fffaf4', 0.06);
  at(board, 0, 4.55, 0);
  g.add(board, front, back);
  bunting(g, new THREE.Vector3(-X, 4.0, 0), new THREE.Vector3(X, 4.0, 0), { n: 16, sag: 0.25 });
  // Ribbon: two halves that swing open when the winner bursts through
  const halves = [];
  for (const side of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * (X - 0.18), 1.3, 0);
    const tape = box(X - 0.18, 0.12, 0.02, umat('#ff7fa3', { rough: 0.5 }));
    tape.position.x = -side * (X - 0.18) / 2;
    pivot.add(tape);
    const bow = ball(0.12, '#ff7fa3', {}, 10);
    bow.scale.set(1, 0.7, 0.4);
    bow.position.x = -side * (X - 0.24);
    pivot.add(bow);
    pivot.visible = false;
    g.add(pivot);
    halves.push({ pivot, side });
  }
  // Checkered line on the ground
  const line = mesh(new THREE.PlaneGeometry(HW * 2, 0.9), new THREE.MeshStandardMaterial({ map: checkerTexture(), roughness: 0.8 }), { cast: false });
  line.rotation.x = -Math.PI / 2;
  line.position.y = 0.03;
  g.add(line);
  return { group: g, halves, dynamic: [front, back, line, ...halves.map((h) => h.pivot)] };
}

function grandstand(group) {
  const g = new THREE.Group();
  g.position.set(0, 0, 29.4);
  const cream = '#fff3df';
  const tops = ['#f9c6cf', '#bfe6dc', '#ffe1a8'];
  const tiers = 3;
  for (let k = 0; k < tiers; k++) {
    const h = 0.45 * (k + 1);
    const t = rbox(36, h, 1.6, cream, 0.06);
    at(t, 0, h / 2, 0.8 + k * 1.6);
    const top = rbox(36.05, 0.08, 1.62, tops[k], 0.03);
    at(top, 0, h + 0.02, 0.8 + k * 1.6);
    g.add(t, top);
    // Bench along the back of the tier
    const bench = rbox(35, 0.22, 0.4, '#c98a5a', 0.05);
    at(bench, 0, h + 0.2, 1.35 + k * 1.6);
    g.add(bench);
  }
  // Steps up the middle and the sides
  for (const x of [-18.3, 0, 18.3]) {
    for (let k = 0; k < tiers; k++) g.add(at(rbox(1.3, 0.45 * (k + 1) + 0.04, 0.8, '#f3e6dc', 0.04), x, (0.45 * (k + 1)) / 2, 0.4 + k * 1.6));
  }
  const back = rbox(37.4, 3.6, 0.35, '#fde2c8', 0.08);
  at(back, 0, 1.8, 5.1);
  g.add(back);
  for (const side of [1, -1]) {
    const wall = rbox(0.35, 3.6, 5.2, '#fde2c8', 0.08);
    at(wall, side * 18.7, 1.8, 2.6);
    g.add(wall);
  }
  // Roof canopy with stripes and a scalloped edge
  const roof = new THREE.Group();
  roof.position.set(0, 4.25, 2.4);
  roof.rotation.x = 0.12;
  const stripes = 12;
  for (let k = 0; k < stripes; k++) {
    const s = box(38.4 / stripes, 0.14, 6.4, k % 2 ? '#fffaf4' : '#ef5b6f');
    s.position.x = -19.2 + (38.4 / stripes) * (k + 0.5);
    roof.add(s);
  }
  for (let k = 0; k < 32; k++) {
    const sc = ball(0.62, k % 2 ? '#fffaf4' : '#ef5b6f', {}, 12);
    sc.scale.set(1, 0.55, 0.12);
    sc.position.set(-19.2 + 1.2 * (k + 0.5), -0.08, -3.18);
    roof.add(sc);
  }
  g.add(roof);
  for (let x = -18; x <= 18; x += 6) {
    g.add(at(cyl(0.11, 0.13, 4.5, '#fffaf4', 10), x, 2.25, -0.65));
  }
  // Name board on the roof
  const sign = painted(7.5, 1.25, 150, bannerDraw('Meadow Cup', { bg: '#3fb6a8', sub: 'Pony race of Roji World' }));
  at(sign, 0, 5.15, -0.75);
  sign.rotation.y = Math.PI;
  sign.rotation.x = 0.05;
  const signBack = rbox(7.7, 1.4, 0.18, '#fffaf4', 0.06);
  at(signBack, 0, 5.15, -0.58);
  g.add(signBack, sign);
  // Heart balloons tied to the front posts
  const heartGeo = new THREE.ExtrudeGeometry(heartShape(0.7), { depth: 0.18, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 });
  heartGeo.center();
  for (const [x, c] of [[-18, '#ef5b6f'], [-12, '#ff9eb5'], [12, '#ff9eb5'], [18, '#ef5b6f']]) {
    const h = mesh(heartGeo, mat(c, { rough: 0.35 }));
    h.rotation.y = Math.PI;
    at(h, x + 0.3, 5.6, -0.9);
    g.add(h);
    const str = cyl(0.008, 0.008, 1.3, '#fffaf4', 4);
    at(str, x + 0.15, 4.95, -0.8);
    g.add(str);
  }
  group.add(g);
  // Flags on the roof (they wave, so they stay separate)
  const flags = [];
  const flagGeo = new THREE.PlaneGeometry(0.9, 0.55);
  flagGeo.translate(0.45, 0, 0);
  const cols = ['#ffd166', '#6fb8ff', '#ff9eb5', '#7fd3a7', '#c7a6ff', '#ffb36b', '#ffd166'];
  for (let k = 0; k < 7; k++) {
    const x = -18 + k * 6;
    const pole = cyl(0.04, 0.04, 2.0, '#fffaf4', 6);
    at(pole, x, 5.2, 32.2);
    group.add(pole);
    flags.push(at(new THREE.Object3D(), x, 5.95, 32.2));
  }
  const set = flagSet(flagGeo, flags, cols);
  group.add(set.mesh);
  return { flags, flagMesh: set.mesh, syncFlags: set.sync };
}

// Waving flags drawn as one instanced mesh. dummies: Object3Ds whose transforms the game animates; call sync() after.
function flagSet(geo, dummies, colors) {
  const im = new THREE.InstancedMesh(geo, mat('#ffffff', { side: THREE.DoubleSide, rough: 0.7 }), dummies.length);
  im.frustumCulled = false;
  const c = new THREE.Color();
  dummies.forEach((d, k) => im.setColorAt(k, c.set(colors[k % colors.length])));
  const sync = () => {
    dummies.forEach((d, k) => {
      d.updateMatrix();
      im.setMatrixAt(k, d.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
  };
  sync();
  return { mesh: im, sync };
}

function judgesBooth(group) {
  const g = new THREE.Group();
  g.position.set(9, 0, 12.4);
  g.rotation.y = 0.1;
  for (const [x, z] of [[-1, -0.7], [1, -0.7], [-1, 0.7], [1, 0.7]]) g.add(at(cyl(0.09, 0.1, 2.2, '#c98a5a', 8), x, 1.1, z));
  const floor = rbox(2.6, 0.2, 1.9, '#c98a5a', 0.04);
  at(floor, 0, 2.25, 0);
  const cabin = rbox(2.4, 1.6, 1.7, '#fffaf4', 0.08);
  at(cabin, 0, 3.1, 0);
  const win = rbox(1.8, 0.7, 0.05, '#7fc8e8', 0.03, { rough: 0.2, emissive: '#bfeaff', ei: 0.2 });
  at(win, 0, 3.3, 0.86);
  const roof = cone(1.95, 1.0, '#ef5b6f', 4);
  roof.rotation.y = Math.PI / 4;
  at(roof, 0, 4.4, 0);
  const tip = ball(0.13, '#ffd166', { rough: 0.4 }, 10);
  at(tip, 0, 4.95, 0);
  const rail = rbox(2.7, 0.08, 0.08, '#c98a5a', 0.02);
  at(rail, 0, 2.75, 1.0);
  const ladder = new THREE.Group();
  for (const x of [-0.25, 0.25]) ladder.add(at(cyl(0.035, 0.035, 2.4, '#a8764a', 6), x, 1.15, 0));
  for (let k = 0; k < 6; k++) {
    const rung = cyl(0.025, 0.025, 0.5, '#a8764a', 6);
    rung.rotation.z = Math.PI / 2;
    ladder.add(at(rung, 0, 0.3 + k * 0.36, 0));
  }
  ladder.position.set(1.45, 0, 0.3);
  ladder.rotation.z = -0.2;
  g.add(floor, cabin, win, roof, tip, rail, ladder);
  const clock = painted(0.9, 0.9, 128, (ctx, w, h) => {
    ctx.fillStyle = '#fffaf4';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ef5b6f';
    ctx.stroke();
    ctx.strokeStyle = '#3b2b3f';
    ctx.lineCap = 'round';
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w / 2 + Math.cos(a) * 46, h / 2 + Math.sin(a) * 46);
      ctx.lineTo(w / 2 + Math.cos(a) * 54, h / 2 + Math.sin(a) * 54);
      ctx.stroke();
    }
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2);
    ctx.lineTo(w / 2, h / 2 - 36);
    ctx.moveTo(w / 2, h / 2);
    ctx.lineTo(w / 2 + 26, h / 2 + 8);
    ctx.stroke();
  });
  at(clock, 0, 4.0, 0.87);
  clock.scale.setScalar(0.75);
  g.add(clock);
  group.add(g);
  return clock;
}

function pond(group, cx, cz, rx, rz) {
  const water = mesh(new THREE.CircleGeometry(1, 40), umat('#7fc8e8', { rough: 0.15, emissive: '#bfeaff', ei: 0.15 }), { cast: false });
  water.rotation.x = -Math.PI / 2;
  water.scale.set(rx, rz, 1);
  water.position.set(cx, 0.03, cz);
  group.add(water);
  const shore = mesh(new THREE.CircleGeometry(1, 40), mat('#e8d6a8', { rough: 1 }), { cast: false });
  shore.rotation.x = -Math.PI / 2;
  shore.scale.set(rx + 0.6, rz + 0.6, 1);
  shore.position.set(cx, 0.02, cz);
  group.add(shore);
  const r = rng(21);
  const stoneGeo = new THREE.DodecahedronGeometry(0.3, 0);
  for (let k = 0; k < 34; k++) {
    const a = (k / 34) * Math.PI * 2 + r() * 0.1;
    const s = mesh(stoneGeo, mat(r() < 0.5 ? '#d9d2c3' : '#c4bcab', { flat: true, rough: 0.9 }));
    s.position.set(cx + Math.cos(a) * (rx + 0.35), 0.08, cz + Math.sin(a) * (rz + 0.35));
    s.scale.set(0.8 + r() * 0.6, 0.5 + r() * 0.3, 0.8 + r() * 0.6);
    s.rotation.set(r(), r(), r());
    group.add(s);
  }
  for (let k = 0; k < 9; k++) {
    const a = r() * Math.PI * 2;
    const d = 0.3 + r() * 0.55;
    const pad = mesh(new THREE.CircleGeometry(0.42, 12, 0.3, Math.PI * 2 - 0.6), mat('#6dbb58', { rough: 0.7, side: THREE.DoubleSide }), { cast: false });
    pad.rotation.x = -Math.PI / 2;
    pad.rotation.z = r() * 6;
    pad.position.set(cx + Math.cos(a) * rx * d, 0.045, cz + Math.sin(a) * rz * d);
    group.add(pad);
    if (k % 2 === 0) group.add(at(ball(0.11, '#ff9eb5', { flat: true }, 8), pad.position.x, 0.1, pad.position.z));
  }
  // Two ducks paddling around
  const ducks = [];
  for (let k = 0; k < 2; k++) {
    const d = new THREE.Group();
    const body = ball(0.22, '#ffe066', { rough: 0.5 }, 12);
    body.scale.set(1, 0.75, 1.3);
    const head = ball(0.14, '#ffe066', { rough: 0.5 }, 12);
    head.position.set(0, 0.22, 0.2);
    const beak = cone(0.05, 0.14, '#ff9f43', 8);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.2, 0.36);
    const tail = cone(0.08, 0.16, '#ffe066', 6);
    tail.rotation.x = -0.9;
    tail.position.set(0, 0.1, -0.28);
    d.add(body, head, beak, tail);
    for (const sd of [1, -1]) d.add(at(ball(0.025, '#2b1d16', {}, 6), sd * 0.08, 0.26, 0.31));
    bakeVC(d);
    group.add(d);
    ducks.push({ g: d, a: k * Math.PI, r: 0.45 + k * 0.2 });
  }
  return { ducks, cx, cz, rx, rz, water };
}

function barn(group, x, z, ry) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  const shed = rbox(5, 3.2, 4.2, '#c95a4a', 0.08);
  at(shed, 0, 1.6, 0);
  const roofL = rbox(5.6, 0.2, 2.7, '#f6ead7', 0.05);
  roofL.rotation.x = 0.6;
  at(roofL, 0, 3.75, -1.05);
  const roofR = roofL.clone();
  roofR.rotation.x = -0.6;
  roofR.position.z = 1.05;
  const gable = cone(2.3, 1.2, '#c95a4a', 3);
  gable.rotation.set(0, 0, 0);
  const door = rbox(1.8, 2.1, 0.08, '#f6ead7', 0.04);
  at(door, 0, 1.05, 2.12);
  g.add(shed, roofL, roofR, door);
  for (const s of [1, -1]) {
    const x1 = box(0.12, 2.3, 0.06, '#c95a4a');
    x1.rotation.z = 0.68 * s;
    at(x1, 0, 1.05, 2.18);
    g.add(x1);
  }
  const shoe = mesh(new THREE.TorusGeometry(0.4, 0.09, 8, 20, Math.PI * 1.4), mat('#f4c24f', { metal: 0.6, rough: 0.35 }));
  shoe.rotation.z = Math.PI * 0.8;
  at(shoe, 0, 2.75, 2.15);
  g.add(shoe);
  // Hay bales
  for (const [hx, hz, hy] of [[-3.4, 1.4, 0.3], [-3.5, 0.2, 0.3], [-3.45, 0.8, 0.85], [3.3, 1.6, 0.3]]) {
    const b = rbox(1.0, 0.6, 0.62, '#e9c560', 0.08, { rough: 1 });
    b.rotation.y = Math.PI / 2;
    at(b, hx, hy, hz);
    const band = box(0.64, 0.62, 0.04, '#c99a3a');
    at(band, hx, hy, hz);
    g.add(b, band);
  }
  group.add(g);
}

// ------------------------------------------------------------------ the whole course
export function buildCourse(ctx, T, obstacles) {
  const { scene } = ctx;
  const group = new THREE.Group();
  scene.add(group);
  const dynamic = [];

  // Meadow
  const lawn = mesh(new THREE.PlaneGeometry(800, 800), mat('#9ad06a', { rough: 0.95 }), { cast: false });
  lawn.rotation.x = -Math.PI / 2;
  scene.add(lawn);
  // Lighter mown infield
  const infield = mesh(new THREE.ShapeGeometry(new THREE.Shape(Array.from({ length: 120 }, (_, k) => {
    const p = T.at((k / 120) * T.L, HW + 0.2);
    return new THREE.Vector2(p.x, -p.z);
  }))), mat('#a6d873', { rough: 0.95 }), { cast: false });
  infield.rotation.x = -Math.PI / 2;
  infield.position.y = 0.006;
  scene.add(infield);

  // Dirt track
  const dirt = dirtTexture();
  const track = mesh(stripGeometry(T, 0, T.L, HW, -HW, 0.02, 0.5, 7), new THREE.MeshStandardMaterial({ map: dirt, roughness: 0.95 }), { cast: false });
  scene.add(track);
  // Soft sandy verges
  for (const side of [1, -1]) {
    const verge = mesh(stripGeometry(T, 0, T.L, side * HW, side * (HW + 0.7), 0.014, 1, 7), mat('#d9c08a', { rough: 1 }), { cast: false });
    group.add(verge);
  }

  // Rails: white posts and two rails on each side
  const posts = [];
  for (const side of [1, -1]) for (let s = 0; s < T.L; s += 2.6) posts.push(T.at(s, side * RAIL));
  const postGeo = new THREE.CylinderGeometry(0.06, 0.07, 1.06, 6);
  postGeo.translate(0, 0.53, 0);
  const postIM = new THREE.InstancedMesh(postGeo, mat('#fffaf4', { rough: 0.6 }), posts.length);
  const m4 = new THREE.Matrix4();
  posts.forEach((p, i) => postIM.setMatrixAt(i, m4.makeTranslation(p.x, 0, p.z)));
  postIM.castShadow = true;
  postIM.receiveShadow = true;
  scene.add(postIM);
  for (const side of [1, -1]) {
    for (const [y, r] of [[1.02, 0.06], [0.58, 0.04]]) {
      const pts = [];
      for (let s = 0; s < T.L; s += 3) {
        const p = T.at(s, side * RAIL);
        p.y = y;
        pts.push(p);
      }
      const tube = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), pts.length * 2, r, 6, true), mat('#fffaf4', { rough: 0.55 }));
      group.add(tube);
    }
  }

  // Jumps and their take-off markers
  const chevron = chevronTexture();
  const bandGeos = [];
  const obs = [];
  for (const o of obstacles) {
    const piece = o.kind === 'hurdle' ? hurdle(T, o.s) : waterJump(T, o.s, o.len);
    group.add(piece.group);
    if (piece.pole) dynamic.push(piece.pole);
    if (piece.ripples) dynamic.push(...piece.ripples);
    const far = o.kind === 'hurdle' ? 4.2 : 3.6;
    const near = o.kind === 'hurdle' ? 0.9 : 1.0;
    bandGeos.push(stripGeometry(T, o.s - far, o.s - near, HW - 0.1, -HW + 0.1, 0.026, 0.5, 0));
    obs.push({ ...o, ...piece, wobble: 0 });
  }
  const bands = mesh(mergeGeometries(bandGeos, false), new THREE.MeshStandardMaterial({ map: chevron, roughness: 0.9 }), { cast: false });
  scene.add(bands);

  // Finish arch and ribbon
  const finish = finishArch(T);
  group.add(finish.group);
  dynamic.push(...finish.dynamic);

  // Grandstand, booth, pond, barn
  const stand = grandstand(group);
  dynamic.push(stand.flagMesh);
  const clock = judgesBooth(group);
  dynamic.push(clock);
  const water = pond(group, -6, -3, 10, 5.5);
  dynamic.push(water.water, ...water.ducks.map((d) => d.g));
  barn(group, 80, 2, -Math.PI / 2);

  // Flower beds along the inside of the home straight
  const F = [];
  const fr = rng(31);
  const cols = ['#ff8fb1', '#ffffff', '#ffd75e', '#c7a6ff', '#ff6b6b'];
  for (let k = 0; k < 260; k++) F.push({ x: -36 + fr() * 70, z: 14.2 + fr() * 1.6, c: cols[k % cols.length], h: 0.2 + fr() * 0.16 });
  addFlowers(group, F);
  const bed = rbox(72, 0.16, 2.2, '#b07a4f', 0.06, { rough: 1 });
  at(bed, -1, 0.06, 15);
  group.add(bed);

  // Flagpoles round the course
  const poleFlags = [];
  const flagGeo = new THREE.PlaneGeometry(1.1, 0.7);
  flagGeo.translate(0.55, 0, 0);
  const fcols = ['#ef5b6f', '#ffd166', '#6fb8ff', '#7fd3a7', '#c7a6ff', '#ff9eb5'];
  for (let k = 0; k < 8; k++) {
    const s = ((k + 0.5) / 8) * T.L;
    const p = T.at(s, -(RAIL + 1.6));
    group.add(at(cyl(0.06, 0.07, 4.2, '#fffaf4', 8), p.x, 2.1, p.z));
    group.add(at(ball(0.11, '#ffd166', { rough: 0.4 }, 8), p.x, 4.25, p.z));
    poleFlags.push(at(new THREE.Object3D(), p.x, 3.75, p.z));
  }
  const poleSet = flagSet(flagGeo, poleFlags, fcols);
  group.add(poleSet.mesh);
  dynamic.push(poleSet.mesh);
  // Bunting along the outer rail of the home straight
  for (let x = -40; x < 40; x += 10) {
    bunting(group, new THREE.Vector3(x, 1.25, 22 + RAIL), new THREE.Vector3(x + 10, 1.25, 22 + RAIL), { n: 10, sag: 0.28, size: 0.26 });
  }

  // Meadow all round
  const free = (x, z, kind) => {
    const td = T.dist(x, z);
    if (td < HW + (kind === 'tree' ? 4.5 : kind === 'bush' ? 2.6 : 1.4)) return false;
    if (x > -21 && x < 21 && z > 27 && z < 38) return false; // grandstand
    if ((x - 9) ** 2 + (z - 12.4) ** 2 < 9) return false; // booth
    if (((x + 6) / 11.5) ** 2 + ((z + 3) / 7) ** 2 < 1) return false; // pond
    if (Math.abs(x - 80) < 7 && Math.abs(z - 2) < 6) return false; // barn
    if (z > 13.5 && z < 17 && x > -38 && x < 36) return false; // flower bed
    if (kind === 'tree' && z > 24 && z < 48 && x > -30 && x < 30) return false; // keep the stand visible
    return true;
  };
  scatterNature(group, { seed: 4, bounds: [-120, 120, -95, 80], free, trees: 85, bushes: 40, flowers: 600, tufts: 650, rocks: 24 });
  sky(group, { radius: 175, center: [0, -4], count: 16 });

  bakeVC(group, dynamic);
  return { group, obs, finish, stand, water, poleFlags, syncPoleFlags: poleSet.sync, clock };
}
