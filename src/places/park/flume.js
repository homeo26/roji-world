import { THREE, P, inst, toGeo, vcMat, fitText, roundRect, drawStar, heartPath, Polyline } from './parts.js';
import { mat, umat, mesh, canvasTexture, rng } from '../../util.js';
import { sfx } from './music.js';

// Splash Falls, Roji Land's log flume, along the east fence by the sea: a sandstone mountain in the
// back corner with palms and a little waterfall, a lift that carries the logs up into a cave, the
// chute that drops back down toward the street into a splash pool, and a boarding dock with the
// ride's sign. Two log boats full of cheering visitors go round on their own.

export const FLUME = {
  lift: 14.4, // lane x of the lift (inner lane)
  chute: 15.62, // lane x of the chute (by the fence)
  water: 0.36, // the splash pool's water level
  pool: { x0: 13.75, x1: 16.35, z0: -9.4, z1: -2.9 },
  front: -16.25, // where the lanes go into the mountain
};
const TOP = 2.9; // trough floor at the mountain
const YB0 = 0.16; // trough floor at the pool
const DEEP = 0.2; // water depth in a trough
const IN = 0.43; // trough inner half width
const OUT = 0.53;
const WALL = 0.36;
const TAU = Math.PI * 2;
const ramp = (u) => u - Math.sin(TAU * u) / TAU; // 0..1 with flat ends
const clamp01 = (u) => Math.max(0, Math.min(1, u));
// Trough floor height along each lane
const liftY = (z) => {
  const u = clamp01((-9.3 - z) / (-9.3 - FLUME.front - 0.25));
  return YB0 + (TOP - YB0) * (0.5 * u + 0.5 * ramp(u));
};
const chuteY = (z) => YB0 + (TOP - YB0) * (1 - ramp(clamp01((z + 14.9) / 4.9)));

// Sweep a cross-section ([across, up] pairs, counter-clockwise) along a lane at x, through zs
// (going -Z). The section stays square to the slope. uv: add uvs (across 0..1, along in metres).
function sweep(x, zs, yAt, profile, { uv = false, vScale = 1 } = {}) {
  const pos = [];
  const uvs = [];
  const rings = [];
  let run = 0;
  zs.forEach((z, i) => {
    const za = zs[Math.max(0, i - 1)];
    const zb = zs[Math.min(zs.length - 1, i + 1)];
    let ty = yAt(zb) - yAt(za);
    let tz = zb - za;
    const l = Math.hypot(ty, tz) || 1;
    ty /= l;
    tz /= l;
    const ny = Math.abs(tz);
    const nz = -ty * Math.sign(tz);
    const y = yAt(z);
    if (i > 0) run += Math.hypot(y - yAt(zs[i - 1]), z - zs[i - 1]);
    rings.push({ v: run * vScale, pts: profile.map(([s, u]) => [x + s, y + u * ny, z + u * nz]) });
  });
  const n = profile.length;
  const closed = n > 2;
  for (let i = 0; i < rings.length - 1; i++) {
    const A = rings[i].pts;
    const B = rings[i + 1].pts;
    for (let j = 0; j < (closed ? n : n - 1); j++) {
      const j2 = (j + 1) % n;
      pos.push(...A[j], ...B[j], ...B[j2], ...A[j], ...B[j2], ...A[j2]);
      if (uv) {
        const u0 = j / (n - 1);
        const u1 = j2 / (n - 1);
        const v0 = rings[i].v;
        const v1 = rings[i + 1].v;
        uvs.push(u0, v0, u0, v1, u1, v1, u0, v0, u1, v1, u1, v0);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

// Flowing water: soft streaks on a turquoise base (tiles along v)
function flowTexture() {
  const t = canvasTexture(64, 128, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, '#5fc3d6');
    gr.addColorStop(0.5, '#7fd8e6');
    gr.addColorStop(1, '#5fc3d6');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    const r = rng(5);
    c.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      c.strokeStyle = `rgba(235,252,255,${0.3 + r() * 0.35})`;
      c.lineWidth = 2 + r() * 3;
      const x = 6 + r() * (w - 12);
      const y = r() * h;
      const L = 24 + r() * 46;
      for (const dy of [0, -h, h]) {
        c.beginPath();
        c.moveTo(x, y + dy);
        c.quadraticCurveTo(x + (r() - 0.5) * 6, y + dy + L / 2, x, y + dy + L);
        c.stroke();
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Calm pool water with little light rings
function poolTexture() {
  const t = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#74d2e2';
    c.fillRect(0, 0, w, h);
    const r = rng(9);
    c.lineWidth = 3;
    for (let i = 0; i < 22; i++) {
      c.strokeStyle = `rgba(230,252,255,${0.3 + r() * 0.4})`;
      const x = r() * w;
      const y = r() * h;
      const rr = 8 + r() * 22;
      for (const [dx, dy] of [[0, 0], [-w, 0], [0, -h], [-w, -h], [w, 0], [0, h]]) {
        c.beginPath();
        c.ellipse(x + dx, y + dy, rr, rr * 0.55, 0, 0.3, Math.PI * 1.4);
        c.stroke();
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// A log boat (along +Z, waterline at y 0) with two cheering visitors
function boatModel(k) {
  const g = new THREE.Group();
  const log = k.cyl(0.34, 0.34, 1.62, '#b97a4c', 12);
  log.rotation.x = Math.PI / 2;
  log.scale.set(1, 1, 0.82);
  log.position.y = 0.1;
  g.add(log);
  g.add(k.at(k.box(0.5, 0.04, 1.2, '#6b4429'), 0, 0.37, 0));
  for (const z of [-0.83, 0.83]) {
    const end = k.cyl(0.3, 0.3, 0.04, '#e9c49a', 14);
    end.rotation.x = Math.PI / 2;
    end.scale.set(1, 1, 0.82);
    end.position.set(0, 0.1, z);
    g.add(end);
    const ring = k.cyl(0.16, 0.16, 0.05, '#c99a6a', 12);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.1, z);
    g.add(ring);
  }
  // a little leaf sprout at the front and a band of stripes
  for (const s of [-1, 1]) {
    const leaf = k.sph(0.1, P.leaf, undefined, 8);
    leaf.scale.set(1.5, 0.35, 0.7);
    leaf.rotation.z = s * 0.5;
    leaf.position.set(s * 0.1, 0.5, 0.7);
    g.add(leaf);
  }
  g.add(k.at(k.cyl(0.025, 0.025, 0.14, P.leafDark, 5), 0, 0.44, 0.7));
  for (const z of [-0.45, 0.45]) {
    const band = k.cyl(0.345, 0.345, 0.07, P.pink, 14);
    band.rotation.x = Math.PI / 2;
    band.scale.set(1, 1, 0.82);
    band.position.set(0, 0.1, z);
    g.add(band);
  }
  for (const [z, shirt, hair] of [[0.28, '#ffd166', '#2a1a13'], [-0.3, '#7fd8bf', '#7a4a26']]) {
    g.add(k.at(k.cyl(0.13, 0.15, 0.32, shirt, 8), 0, 0.52, z));
    g.add(k.at(k.sph(0.15, '#f2cdb4', undefined, 9), 0, 0.82, z));
    g.add(k.at(k.sph(0.155, hair, undefined, 7), 0, 0.87, z - 0.03));
    for (const s of [-1, 1]) {
      const arm = k.cyl(0.035, 0.035, 0.34, '#f2cdb4', 5);
      arm.position.set(s * 0.15, 0.82, z);
      arm.rotation.z = -s * 0.4;
      g.add(arm);
    }
  }
  return g;
}

export function buildFlume(ctx, k, shared) {
  const { api } = ctx;
  const { atlas, pal, lights } = shared;
  const root = new THREE.Group();
  const dynamic = [];
  const colliders = [];
  const R = rng(21);
  const LX = FLUME.lift;
  const CX = FLUME.chute;
  const PL = FLUME.pool;
  const W = FLUME.water;
  const F = FLUME.front;
  const wood = mat('#c98a5a', { rough: 0.8 });
  const woodDark = mat('#9b6a43', { rough: 0.85 });

  // ------------------------------------------------ the two troughs on stilts
  const U = [[-OUT, WALL], [-OUT, -0.08], [OUT, -0.08], [OUT, WALL], [IN, WALL], [IN, 0], [-IN, 0], [-IN, WALL]];
  const zsOf = (z0, z1, n) => Array.from({ length: n + 1 }, (_, i) => z0 + ((z1 - z0) * i) / n);
  const liftZ = zsOf(PL.z0, F, 16);
  const chuteZ = zsOf(PL.z0, F, 26);
  root.add(mesh(sweep(LX, liftZ, liftY, U), wood));
  root.add(mesh(sweep(CX, chuteZ, chuteY, U), wood));
  // the lift's chain down the middle of its floor
  root.add(mesh(sweep(LX, liftZ, liftY, [[0.1, 0.012], [-0.1, 0.012]]), mat(P.ink, { rough: 0.6 }), { cast: false }));
  // rim boards along the top of the walls
  for (const [x, yAt, zs] of [[LX, liftY, liftZ], [CX, chuteY, chuteZ]]) {
    for (const s of [-1, 1]) root.add(mesh(sweep(x + s * 0.48, zs, yAt, [[-0.075, WALL + 0.05], [-0.075, WALL - 0.02], [0.075, WALL - 0.02], [0.075, WALL + 0.05]]), mat('#e9c49a', { rough: 0.8 }), { cast: false }));
  }
  // stilts with cross braces where the troughs are up in the air
  for (const [x, yAt] of [[LX, liftY], [CX, chuteY]]) {
    for (let z = PL.z0 - 0.7; z > F + 0.2; z -= 0.95) {
      const y = yAt(z) - 0.08;
      if (y < 0.3) continue;
      for (const s of [-1, 1]) root.add(k.at(k.box(0.1, y, 0.1, woodDark), x + s * 0.42, y / 2, z));
      if (y > 0.9) {
        const br = k.box(0.86, 0.07, 0.07, woodDark);
        br.position.set(x, y * 0.5, z);
        br.castShadow = false;
        root.add(br);
      }
    }
  }

  // ------------------------------------------------ water: the troughs and the waterfall share one flowing material
  const flowTex = flowTexture();
  const flowMat = umat('#ffffff', { map: flowTex, rough: 0.12, transparent: true, opacity: 0.88 });
  flowMat.depthWrite = false;
  const flows = [
    sweep(LX, liftZ, liftY, [[IN, DEEP], [-IN, DEEP]], { uv: true, vScale: 0.6 }),
    sweep(CX, chuteZ, chuteY, [[IN, DEEP], [-IN, DEEP]], { uv: true, vScale: 0.6 }),
  ];
  // flip v so the water in both troughs runs downhill
  {
    const uv = flows[0].attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, -uv.getY(i));
    const uv2 = flows[1].attributes.uv;
    for (let i = 0; i < uv2.count; i++) uv2.setY(i, -uv2.getY(i));
  }
  // the little waterfall pours off a rock lip on the mountain's west side
  const FALL = { x: 12.7, z: F - 0.05, top: 3.25, bottom: 0.3, w: 0.8 };
  const fallGeo = new THREE.PlaneGeometry(FALL.w, FALL.top - FALL.bottom, 2, 8);
  {
    const p = fallGeo.attributes.position;
    const uv = fallGeo.attributes.uv;
    const H = FALL.top - FALL.bottom;
    for (let i = 0; i < p.count; i++) {
      const yy = p.getY(i) + H / 2; // 0 at the bottom
      const k2 = yy / H;
      p.setZ(i, 0.28 * k2 * k2 - 0.04 * Math.abs(p.getX(i)) * 2);
      p.setX(i, p.getX(i) * (1 + (1 - k2) * 0.25));
      uv.setY(i, -(yy / H) * 1.6);
    }
    fallGeo.translate(FALL.x, FALL.bottom + H / 2, FALL.z);
    fallGeo.deleteAttribute('normal');
    fallGeo.computeVertexNormals();
  }
  const flowMesh = mesh(mergeFlow([...flows, fallGeo.toNonIndexed()]), flowMat, { cast: false });
  root.add(flowMesh);
  dynamic.push(flowMesh);

  // the splash pool and the waterfall's little pool share the calm water
  const poolTex = poolTexture();
  poolTex.repeat.set(0.8, 1.6);
  const poolMat = umat('#ffffff', { map: poolTex, rough: 0.1, transparent: true, opacity: 0.86 });
  poolMat.depthWrite = false;
  const pw = PL.x1 - PL.x0 - 0.24;
  const pd = PL.z1 - PL.z0 - 0.1;
  const poolA = new THREE.PlaneGeometry(pw, pd);
  poolA.rotateX(-Math.PI / 2);
  poolA.translate((PL.x0 + PL.x1) / 2, W, (PL.z0 + PL.z1) / 2);
  const SP = { x: FALL.x, z: F + 0.55, hw: 0.82, hd: 0.5 };
  const poolB = new THREE.PlaneGeometry(SP.hw * 2, SP.hd * 2);
  poolB.rotateX(-Math.PI / 2);
  poolB.translate(SP.x, 0.3, SP.z);
  const poolMesh = mesh(mergeFlow([poolA, poolB]), poolMat, { cast: false });
  root.add(poolMesh);
  dynamic.push(poolMesh);

  // ------------------------------------------------ the splash pool's basin, rim and rocks
  const stone = P.stone;
  root.add(k.at(k.box(PL.x1 - PL.x0, 0.06, PL.z1 - PL.z0, '#4fa9b4'), (PL.x0 + PL.x1) / 2, 0.03, (PL.z0 + PL.z1) / 2));
  const rim = (x0, x1, z0, z1) => root.add(k.at(k.rbox(x1 - x0, 0.5, z1 - z0, stone, 0.06), (x0 + x1) / 2, 0.25, (z0 + z1) / 2));
  rim(PL.x0 - 0.06, PL.x0 + 0.12, PL.z0, PL.z1);
  rim(PL.x1 - 0.12, PL.x1 + 0.04, PL.z0, PL.z1);
  rim(PL.x0 - 0.06, PL.x1 + 0.04, PL.z1 - 0.18, PL.z1 + 0.02);
  // the back: short pieces between the troughs
  rim(PL.x0 - 0.06, LX - OUT, PL.z0 - 0.1, PL.z0 + 0.1);
  rim(LX + OUT, CX - OUT, PL.z0 - 0.1, PL.z0 + 0.1);
  rim(CX + OUT, PL.x1 + 0.04, PL.z0 - 0.1, PL.z0 + 0.1);
  // round rocks on the corners and along the sides, and lily pads
  for (const [x, z, s, c] of [
    [PL.x0 + 0.05, PL.z0 + 0.2, 0.36, '#e3a77f'],
    [PL.x0 + 0.02, -6.8, 0.26, '#efd5b8'],
    [PL.x1 - 0.02, -6.1, 0.3, '#e6c4a0'],
    [PL.x1 - 0.06, PL.z0 + 0.25, 0.34, '#d99a73'],
    [PL.x0 + 0.04, PL.z1 - 0.45, 0.24, '#e6c4a0'],
  ]) {
    const r = new THREE.Mesh(k.geo('blob', () => new THREE.IcosahedronGeometry(1, 1)), mat(c, { rough: 0.9 }));
    r.scale.set(s * 1.25, s * 0.62, s);
    r.rotation.set(R() * 3, R() * 3, R() * 3);
    r.position.set(x, 0.45, z);
    r.castShadow = true;
    r.receiveShadow = true;
    root.add(r);
  }
  for (const [x, z, s] of [[14.2, -7.6, 1], [16.0, -5.4, 0.8], [14.1, -4.8, 0.7]]) {
    root.add(k.at(k.cyl(0.24 * s, 0.24 * s, 0.025, '#6cc24a', 12), x, W + 0.01, z));
    if (s > 0.9) root.add(k.at(k.sph(0.06, P.pink, undefined, 8), x + 0.07, W + 0.06, z));
  }

  // ------------------------------------------------ the dock and its sign
  const DZ = { z0: -3.95, z1: PL.z1 + 0.02 };
  root.add(k.at(k.box(PL.x1 - PL.x0 + 0.1, 0.1, DZ.z1 - DZ.z0, '#e2b383'), (PL.x0 + PL.x1) / 2, 0.47, (DZ.z0 + DZ.z1) / 2));
  for (let x = PL.x0 + 0.1; x < PL.x1; x += 0.27) {
    const plank = k.box(0.015, 0.012, DZ.z1 - DZ.z0 - 0.04, '#b97a4c');
    plank.castShadow = false;
    plank.position.set(x, 0.526, (DZ.z0 + DZ.z1) / 2);
    root.add(plank);
  }
  for (const x of [PL.x0 + 0.1, PL.x1 - 0.1]) {
    for (const z of [DZ.z0 + 0.06]) root.add(k.at(k.cyl(0.07, 0.07, 1.25, woodDark, 8), x, 0.62, z));
  }
  // a rope rail along the water side of the dock
  root.add(k.at(k.rot(k.cyl(0.025, 0.025, PL.x1 - PL.x0 - 0.2, '#e9c49a', 6), 0, 0, Math.PI / 2), (PL.x0 + PL.x1) / 2, 1.1, DZ.z0 + 0.06));
  // the sign, low on two posts at the front of the dock so it hides nothing behind it
  const SZ = PL.z1 + 0.32;
  for (const x of [PL.x0 + 0.25, PL.x1 - 0.25]) root.add(k.at(k.cyl(0.08, 0.09, 1.6, woodDark, 8), x, 0.8, SZ));
  root.add(k.at(k.rbox(2.5, 0.78, 0.1, '#2f8f8c', 0.05), (PL.x0 + PL.x1) / 2, 1.28, SZ - 0.02));
  const sign = atlas.panel(2.36, 0.66, 472, 132, (c, w, h) => {
    c.fillStyle = '#3fbfb4';
    roundRect(c, 4, 4, w - 8, h - 8, 34);
    c.fill();
    c.lineWidth = 7;
    c.strokeStyle = '#fff4e3';
    c.stroke();
    // waves along the bottom
    c.fillStyle = '#8fe3ec';
    c.beginPath();
    c.moveTo(14, h - 16);
    for (let x = 14; x <= w - 14; x += 6) c.lineTo(x, h - 30 + Math.sin(x / 14) * 6);
    c.lineTo(w - 14, h - 16);
    c.closePath();
    c.fill();
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Splash Falls', w / 2, h / 2 - 6, w * 0.74, 64, 700);
    c.fillStyle = '#ffd166';
    for (const [x, y, r] of [[40, 40, 14], [w - 40, 40, 14]]) {
      drawStar(c, x, y, r);
      c.fill();
    }
  });
  sign.position.set((PL.x0 + PL.x1) / 2, 1.28, SZ + 0.04);
  root.add(sign);
  // An easter egg on the right post: a carved heart with R + H
  const carve = atlas.panel(0.2, 0.2, 80, 80, (c, w, h) => {
    c.fillStyle = '#9b6a43';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#5a3a22';
    c.lineWidth = 4;
    heartPath(c, w / 2, h / 2 + 2, 62);
    c.stroke();
    c.fillStyle = '#5a3a22';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'R+H', w / 2, h / 2 + 1, w * 0.5, 18, 700);
  });
  carve.position.set(PL.x1 - 0.25, 0.55, SZ + 0.095);
  root.add(carve);
  const BC = ['#fff3c4', '#8fe3ec', '#ffd1dc'];
  for (let i = 0; i <= 10; i++) lights.push({ p: new THREE.Vector3(PL.x0 + 0.12 + (i * (PL.x1 - PL.x0 - 0.24)) / 10, 1.72 + Math.sin((i / 10) * Math.PI) * 0.05, SZ), c: BC[i % 3], r: 0.065 });
  for (const x of [PL.x0 + 0.25, PL.x1 - 0.25]) lights.push({ p: new THREE.Vector3(x, 1.66, SZ), c: BC[0], r: 0.065 });

  // ------------------------------------------------ the mountain: sandstone rocks, moss, palms and two caves
  const blobGeo = k.geo('blob', () => new THREE.IcosahedronGeometry(1, 1));
  const rock = (x, y, z, sx, sy, sz, c, ry = 0, geo = blobGeo) => {
    const r = new THREE.Mesh(geo, mat(c, { rough: 0.9 }));
    r.scale.set(sx, sy, sz);
    r.rotation.set(0, ry, 0);
    r.position.set(x, y, z);
    r.castShadow = true;
    r.receiveShadow = true;
    root.add(r);
    return r;
  };
  const SAND = ['#f0c9a0', '#e8b48a', '#e3a77f', '#f3d2ad'];
  // the body: a ridge rising to the right where the lanes go in
  rock(12.55, 1.2, -18.5, 1.25, 2.35, 2.0, SAND[0], 0.3);
  rock(14.15, 1.5, -18.95, 1.75, 2.95, 2.25, SAND[1], 0.8);
  rock(15.6, 1.3, -18.6, 0.95, 2.6, 2.0, SAND[2], 0.2);
  rock(13.4, 1.0, -20.4, 1.6, 1.9, 1.0, SAND[3], 1.1);
  // a peak behind the caves, with a palm on top
  rock(14.0, 3.7, -19.9, 1.15, 1.75, 1.05, SAND[0], 0.5);
  // the face round the caves
  rock(15.0, 1.4, F - 0.45, 1.25, 1.45, 0.42, SAND[0], 0);
  rock(15.0, 4.3, F - 0.55, 1.45, 0.5, 0.62, SAND[2], 0.4);
  rock(13.65, 2.9, F - 0.4, 0.42, 1.5, 0.45, SAND[1], 0.6);
  rock(16.2, 3.0, F - 0.45, 0.32, 1.3, 0.45, SAND[3], 0.2);
  // the waterfall's lip and the rock face behind it
  rock(FALL.x, 1.6, F - 0.55, 0.85, 1.75, 0.5, SAND[2], 0.2);
  rock(FALL.x, FALL.top + 0.05, F - 0.12, 0.62, 0.2, 0.42, SAND[0], 0.1);
  rock(11.75, 2.2, -17.0, 0.5, 1.6, 0.6, SAND[3], 0.9);
  // round the little pool at the foot of the waterfall
  for (const [x, z, s] of [[SP.x - SP.hw, SP.z + 0.1, 0.32], [SP.x + SP.hw, SP.z + 0.05, 0.34], [SP.x - 0.35, SP.z + SP.hd + 0.05, 0.26], [SP.x + 0.4, SP.z + SP.hd + 0.08, 0.3]]) rock(x, 0.18, z, s * 1.1, s * 0.9, s, SAND[Math.floor(R() * 4)], R() * 3);
  root.add(k.at(k.box(SP.hw * 2, 0.05, SP.hd * 2, '#4fa9b4'), SP.x, 0.12, SP.z));
  // dark caves the boats go into and come out of, with a lantern over each
  for (const x of [LX, CX]) {
    const cave = k.box(0.98, 1.1, 0.5, '#3b2b3f');
    cave.castShadow = false;
    cave.position.set(x, TOP + 0.5, F - 0.2);
    root.add(cave);
    const arch = k.cyl(0.49, 0.49, 0.5, '#3b2b3f', 14);
    arch.rotation.x = Math.PI / 2;
    arch.castShadow = false;
    arch.position.set(x, TOP + 1.05, F - 0.2);
    root.add(arch);
    root.add(k.at(k.box(0.06, 0.32, 0.06, woodDark), x, TOP + 1.72, F + 0.05));
    root.add(k.at(new THREE.Mesh(pal.paint(k.geo('lantern', () => new THREE.SphereGeometry(0.1, 10, 8)), 'warm'), pal.material), x, TOP + 1.5, F + 0.08));
  }
  // moss on top, ferns, flowers and two palms
  for (const [x, y, z, sx, sz] of [[12.6, 3.35, -18.3, 1.0, 1.4], [14.2, 4.3, -18.9, 1.25, 1.6], [15.6, 3.7, -18.6, 0.7, 1.3], [13.3, 2.75, -20.3, 1.1, 0.7], [14.0, 5.25, -19.9, 0.75, 0.7]]) {
    const m = rock(x, y, z, sx, 0.32, sz, R() > 0.5 ? '#7fcf6a' : '#6cc24a', R() * 3);
    m.castShadow = false;
  }
  const fern = (x, y, z, s = 1) => {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + s;
      const leaf = k.sph(0.2 * s, i % 2 ? P.leaf : P.leafDark, undefined, 6);
      leaf.scale.set(0.45, 0.25, 1.5);
      leaf.rotation.set(-0.5, a, 0);
      leaf.position.set(x + Math.sin(a) * 0.22 * s, y + 0.12, z + Math.cos(a) * 0.22 * s);
      root.add(leaf);
    }
  };
  fern(12.0, 2.95, -17.4, 1.1);
  fern(15.95, 3.75, -17.4, 0.9);
  fern(13.2, 0.35, F + 0.4, 0.8);
  fern(16.15, 0.2, -10.4, 1.0);
  fern(13.95, 0.2, -10.2, 0.9);
  for (let i = 0; i < 14; i++) {
    const a = R() * TAU;
    const rr = 0.4 + R() * 0.8;
    root.add(k.at(new THREE.Mesh(k.geo('fl', () => new THREE.IcosahedronGeometry(0.06, 0)), mat(['#ff9eb5', '#ffd166', '#ffffff', '#c7a6ff'][i % 4])), 14.2 + Math.sin(a) * rr * 1.2, 4.5 + R() * 0.12, -18.9 + Math.cos(a) * rr));
  }
  const palm = (x, y, z, h, lean) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    root.add(g);
    for (let i = 0; i < 5; i++) {
      const s = k.cyl(0.085 - i * 0.006, 0.1 - i * 0.006, h / 5 + 0.04, i % 2 ? '#b98a5c' : '#a8794d', 8);
      s.position.set(lean * (i / 5) ** 2 * h, (i + 0.5) * (h / 5), 0);
      s.rotation.z = -lean * (i / 5) * 0.8;
      g.add(s);
    }
    const tx = lean * h;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      const leaf = k.sph(0.5, i % 2 ? '#6cc24a' : '#5fb85a', undefined, 6);
      leaf.scale.set(0.3, 0.08, 1.0);
      leaf.position.set(tx + Math.sin(a) * 0.42, h + 0.02, Math.cos(a) * 0.42);
      leaf.rotation.set(0.4, a, 0, 'YXZ');
      g.add(leaf);
    }
    for (const [dx, dz] of [[0.08, 0.06], [-0.07, 0.05], [0, -0.08]]) g.add(k.at(k.sph(0.07, '#8b5a33', undefined, 8), tx + dx, h - 0.08, dz));
  };
  palm(14.2, 5.25, -19.9, 1.8, 0.35);
  palm(15.7, 3.85, -18.2, 1.3, 0.3);
  palm(12.3, 3.1, -18.9, 1.5, -0.4);
  // A wooden sign on the mountain, seen from far away
  for (const x of [12.35, 13.65]) root.add(k.at(k.box(0.08, 1.2, 0.08, woodDark), x, 3.65, -17.25));
  root.add(k.at(k.rbox(2.0, 0.6, 0.08, '#e9c49a', 0.04), 13.0, 4.15, -17.18));
  const msign = atlas.panel(1.9, 0.52, 380, 104, (c, w, h) => {
    c.fillStyle = '#fff4e3';
    roundRect(c, 3, 3, w - 6, h - 6, 18);
    c.fill();
    c.strokeStyle = '#3fbfb4';
    c.lineWidth = 6;
    c.stroke();
    c.fillStyle = '#2f8f8c';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Log Flume', w / 2, h / 2 + 2, w * 0.8, 58, 700);
  });
  msign.position.set(13.0, 4.15, -17.13);
  root.add(msign);

  // foam at the foot of the waterfall and where the chute meets the pool
  const foamGeo = k.geo('foam', () => new THREE.IcosahedronGeometry(0.12, 0));
  const foamAt = (x, y, z, s) => {
    const f = new THREE.Mesh(foamGeo, mat('#ffffff', { rough: 0.5 }));
    f.scale.set(s, s * 0.6, s);
    f.position.set(x, y, z);
    root.add(f);
  };
  for (let i = 0; i < 6; i++) foamAt(FALL.x + (i - 2.5) * 0.15, 0.32, F + 0.25 + (i % 2) * 0.12, 0.8 + (i % 3) * 0.3);
  for (let i = 0; i < 5; i++) foamAt(CX + (i - 2) * 0.17, W + 0.02, PL.z0 + 0.45 + (i % 2) * 0.15, 0.9 + (i % 2) * 0.4);

  // the splash: a crown of water that leaps up and fades when a log lands
  const crownGeo = new THREE.CylinderGeometry(0.85, 0.42, 0.75, 18, 1, true);
  crownGeo.translate(0, 0.375, 0);
  const crownMat = umat('#e9fbff', { rough: 0.2, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  crownMat.depthWrite = false;
  const crown = mesh(crownGeo, crownMat, { cast: false });
  crown.position.set(CX, W, PL.z0 + 0.8);
  crown.visible = false;
  root.add(crown);
  dynamic.push(crown);
  // and drops of water that fly up and rain back into the pool
  const NDROP = 30;
  const drops = inst(new THREE.IcosahedronGeometry(0.075, 0), mat('#e9fbff', { rough: 0.2 }), NDROP, { cast: false });
  drops.visible = false;
  root.add(drops);
  dynamic.push(drops);
  const DROPS = Array.from({ length: NDROP }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0 }));

  // ------------------------------------------------ the boats and their loop
  const pts = [];
  const tags = [];
  const add = (x, y, z, tag) => {
    pts.push(new THREE.Vector3(x, y, z));
    tags.push(tag);
  };
  const DOCK = { x: (LX + CX) / 2, z: -4.42 };
  const RAD = (CX - LX) / 2;
  const arc = (a0, a1, n, tag) => {
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      add(DOCK.x + Math.cos(a) * RAD, W, DOCK.z - RAD + Math.sin(a) * RAD, tag);
    }
  };
  arc(Math.PI / 2, Math.PI, 6, 'pool'); // from the dock round to the lift lane
  for (let z = DOCK.z - RAD; z > PL.z0 + 0.15; z -= 0.5) add(LX, W, z, 'pool');
  for (let z = PL.z0 + 0.1; z >= F - 0.05; z -= 0.3) add(LX, liftY(Math.max(F + 0.25, z)) + DEEP, z, 'lift');
  add(LX, TOP + DEEP, F - 0.6, 'hide');
  add(LX, TOP + DEEP, F - 1.4, 'hide');
  add(CX, TOP + DEEP, F - 1.4, 'hide');
  add(CX, TOP + DEEP, F - 0.6, 'hide');
  for (let z = F - 0.05; z < PL.z0 + 0.05; z += 0.25) add(CX, chuteY(Math.min(z, PL.z0)) + DEEP, z, z < -14.9 ? 'top' : z < -10.2 ? 'drop' : 'run');
  for (let z = PL.z0 + 0.3; z < DOCK.z - RAD; z += 0.5) add(CX, W, z, 'pool');
  arc(0, Math.PI / 2, 6, 'pool');
  add(pts[0].x, pts[0].y, pts[0].z, 'pool');
  const loop = new Polyline(pts, tags);
  const boatMesh = inst(toGeo(boatModel(k)), vcMat(0.7), 2, { cast: true });
  root.add(boatMesh);
  dynamic.push(boatMesh);
  const boats = [
    { d: 0, v: 0, wait: 2.5, docked: true, splashed: false },
    { d: loop.length * 0.5, v: 0.6, wait: 0, docked: false, splashed: true },
  ];
  const st = { boats, splash: -1, wetIn: 25, loop };
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler(0, 0, 0, 'YXZ');
  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const pC = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const zero = new THREE.Vector3(0, 0, 0);
  const placeBoat = (b, i, t) => {
    const tag = loop.at(b.d, pC);
    if (tag === 'hide' && loop.tag(b.d + 0.5) === 'hide' && loop.tag(b.d - 0.5) === 'hide') {
      boatMesh.setMatrixAt(i, m4.compose(pC, q.identity(), zero));
      return tag;
    }
    loop.at(b.d + 0.45, pB);
    loop.at(b.d - 0.45, pA);
    pB.sub(pA);
    const yaw = Math.atan2(pB.x, pB.z);
    const pitch = -Math.asin(Math.max(-1, Math.min(1, pB.y / (pB.length() || 1))));
    const calm = tag === 'pool' ? 1 : 0;
    e.set(pitch + Math.sin(t * 1.7 + i) * 0.03 * calm, yaw, Math.sin(t * 1.3 + i * 2) * 0.05 * calm);
    pC.y += Math.sin(t * 2.1 + i * 3) * 0.02 * calm;
    boatMesh.setMatrixAt(i, m4.compose(pC, q.setFromEuler(e), one));
    return tag;
  };
  boats.forEach((b, i) => placeBoat(b, i, 0));
  boatMesh.instanceMatrix.needsUpdate = true;

  // Colliders (park-local): the mountain, the troughs, the pools and the dock (you can hop up on it)
  colliders.push(
    { type: 'box', x: 13.95, z: -18.65, hw: 2.45, hd: 2.55 },
    { type: 'box', x: 15.0, z: (F + PL.z0) / 2, hw: 1.15, hd: (PL.z0 - F) / 2 + 0.05 },
    { type: 'box', x: SP.x, z: SP.z, hw: SP.hw + 0.25, hd: SP.hd + 0.2 },
    { type: 'box', x: (PL.x0 + PL.x1) / 2, z: (PL.z0 + DZ.z0) / 2, hw: (PL.x1 - PL.x0) / 2 + 0.05, hd: (DZ.z0 - PL.z0) / 2 },
    { type: 'box', x: (PL.x0 + PL.x1) / 2, z: (DZ.z0 + DZ.z1) / 2, hw: (PL.x1 - PL.x0) / 2 + 0.05, hd: (DZ.z1 - DZ.z0) / 2, h: 0.52 },
    { type: 'circle', x: PL.x0 + 0.25, z: SZ, r: 0.12 },
    { type: 'circle', x: PL.x1 - 0.25, z: SZ, r: 0.12 },
  );

  const splashAt = new THREE.Vector3();
  const me = new THREE.Vector3();
  return {
    debug: st,
    root,
    dynamic,
    colliders,
    hotspots: [
      {
        x: (PL.x0 + PL.x1) / 2,
        z: SZ + 1.25,
        r: 1.5,
        label: 'Ride the flume',
        icon: 'park-flume',
        act: (a) => (a.hasArena('logflume') ? a.playArena('logflume', { me: a.playerId }) : a.toast('The log flume is still filling up with water. Come back soon.', 2400)),
      },
    ],
    update(dt, t, people) {
      st.wetIn -= dt;
      flowTex.offset.y -= dt * 0.9;
      poolTex.offset.x += dt * 0.012;
      poolTex.offset.y += dt * 0.02;
      me.set(people[0].x, 0, people[0].z);
      const near = Math.max(0, 1 - Math.hypot(me.x - CX, me.z - PL.z0) / 22);
      boats.forEach((b, i) => {
        const other = boats[1 - i];
        const gap = loop.wrap(other.d - b.d);
        const tag = loop.tag(b.d);
        if (b.docked) {
          b.wait -= dt;
          b.v = 0;
          if (b.wait <= 0 && gap > 6) b.docked = false;
        } else {
          const want = tag === 'lift' ? 0.6 : tag === 'hide' ? 1.0 : tag === 'top' ? 0.8 : 0.85;
          if (tag === 'drop' || tag === 'run') b.v = Math.min(4.6, b.v + dt * (tag === 'drop' ? 7 : -1));
          else b.v += (want - b.v) * Math.min(1, dt * (tag === 'pool' ? 2.2 : 3));
          if (gap < 3.2 && tag !== 'drop' && tag !== 'run') b.v = Math.min(b.v, Math.max(0, gap - 2.2));
          const before = b.d;
          b.d = loop.wrap(b.d + b.v * dt);
          // into the pool after the drop: splash
          if (!b.splashed && (tag === 'run' || tag === 'drop') && loop.tag(b.d) === 'pool') {
            b.splashed = true;
            st.splash = 0;
            loop.at(b.d + 0.3, splashAt);
            crown.position.set(splashAt.x, W, splashAt.z);
            for (const dr of DROPS) {
              const a = Math.random() * Math.PI * 2;
              const sp = 0.8 + Math.random() * 1.8;
              dr.p.set(splashAt.x + Math.cos(a) * 0.3, W + 0.1, splashAt.z + Math.sin(a) * 0.3);
              dr.v.set(Math.cos(a) * sp * 0.7, 2.6 + Math.random() * 2.6, Math.sin(a) * sp + 0.9);
              dr.life = 1;
            }
            drops.visible = true;
            sfx.splash(api.sound, near);
            // a few drops reach the dock
            if (st.wetIn <= 0 && !api.activityRunning && me.x > PL.x0 - 0.5 && me.z > PL.z1 - 0.6 && me.z < PL.z1 + 3.2) {
              st.wetIn = 150;
              api.toast(api.playerId === 'roji' ? 'Splash! A few drops land on Roji\u2019s nose, and Homama wipes them off with his sleeve.' : 'Splash! Homama gets sprinkled. Roji laughs and shakes the drops out of his hair.', 3200);
              api.emote('partner', 'heart');
            }
          }
          if (tag === 'lift') b.splashed = false;
          // stop at the dock
          const toDock = loop.length - b.d;
          if (toDock < 1.6) b.v = Math.min(b.v, 0.25 + toDock * 0.6);
          if (b.d < before) {
            b.d = 0;
            b.docked = true;
            b.wait = 3 + Math.random() * 2;
          }
        }
        placeBoat(b, i, t);
      });
      boatMesh.instanceMatrix.needsUpdate = true;
      // the splash crown leaps and fades
      if (st.splash >= 0) {
        st.splash += dt;
        const u = st.splash / 1.1;
        if (u >= 1) {
          st.splash = -1;
          crown.visible = false;
        } else {
          crown.visible = true;
          const up = Math.sin(Math.min(1, u * 1.5) * Math.PI);
          crown.scale.set(0.6 + u * 0.75, 0.25 + up * 1.9, 0.7 + u * 1.3);
          crownMat.opacity = 0.9 * (1 - u * u);
        }
      }
      if (drops.visible) {
        let alive = 0;
        DROPS.forEach((dr, i) => {
          if (dr.life > 0) {
            dr.v.y -= 9.8 * dt;
            dr.p.addScaledVector(dr.v, dt);
            dr.life -= dt * 0.8;
            if (dr.p.y < W && dr.v.y < 0) dr.life = 0;
          }
          if (dr.life > 0) alive++;
          drops.setMatrixAt(i, m4.compose(dr.p, q.identity(), pA.setScalar(dr.life > 0 ? 0.6 + dr.life * 0.6 : 0)));
        });
        drops.instanceMatrix.needsUpdate = true;
        if (!alive) drops.visible = false;
      }
    },
  };
}

// Merge water pieces (some indexed, some not) into one geometry with position, normal and uv
function mergeFlow(list) {
  const pos = [];
  const nor = [];
  const uv = [];
  for (const g0 of list) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.push(...g.attributes.position.array);
    nor.push(...g.attributes.normal.array);
    if (g.attributes.uv) uv.push(...g.attributes.uv.array);
    else uv.push(...new Float32Array(g.attributes.position.count * 2));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return out;
}
