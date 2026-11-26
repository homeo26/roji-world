import { THREE, P, inst, bulbs, garland, wire, stripes, drawLogo, drawStar, heartPath, fitText, roundRect, FONT, glassMat, toGeo, vcMat } from './parts.js';
import { canvasTexture, mat, umat, mesh, rng } from '../../util.js';

// The park grounds: cobbled paths with a hidden heart, the picket fence, the entrance gate with its
// "Roji Land" sign and turnstiles, the ticket booth, the map board, lamps, benches (one with a plaque),
// flower beds, trees, bins and garlands of lights along the avenue.

export const HALF = { w: 16.6, d: 26.6 };

// Paths: [x0, x1, z0, z1]
const PATHS = [
  [-2.8, 2.8, -17.6, 26.9], // the avenue, gate to castle
  [-9.4, 9.4, 20.4, 26.6], // entrance plaza
  [-16, -2.8, 7.0, 8.9], // west lane, in front of the games alley
  [2.8, 16, 9.1, 11.7], // east lane, between the bumper cars and the swings
  [2.8, 16, 0.5, 2.3], // in front of the coaster station
  [-16, -2.8, -8.3, -6.6], // west back lane, in front of the big wheel
  [-15, -2.8, -0.4, 1.6], // in front of the games alley
  [-9.6, 9.6, -17.6, -8.6], // castle plaza
];

export function buildScenery(ctx, k, atlas, spots) {
  const root = new THREE.Group();
  const dynamic = [];
  const colliders = [];
  const R = rng(7);

  // ------------------------------------------------ cobbled paths (one textured material)
  const cobble = canvasTexture(512, 512, (c, w, h) => {
    c.fillStyle = '#e9cdb0';
    c.fillRect(0, 0, w, h);
    const rr = rng(3);
    const n = 8;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const off = j % 2 ? w / n / 2 : 0;
        const x = i * (w / n) + off;
        const y = j * (h / n);
        const tones = ['#f6e2cb', '#f3dcc0', '#f8e8d6', '#efd5b8', '#f5dfc6'];
        c.fillStyle = tones[Math.floor(rr() * tones.length)];
        for (const dx of [0, -w]) {
          roundRect(c, x + dx + 3, y + 3, w / n - 6, h / n - 6, 14);
          c.fill();
        }
      }
    }
  });
  cobble.wrapS = cobble.wrapT = THREE.RepeatWrapping;
  const pathMat = umat('#ffffff', { map: cobble, rough: 0.9 });
  const slab = (x0, x1, z0, z1, y = 0.018) => {
    const w = x1 - x0;
    const d = z1 - z0;
    const g = new THREE.BoxGeometry(w, 0.03, d);
    const uv = g.attributes.uv;
    // top face uv scaled to metres (one texture tile = 3.2 m)
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / 3.2), uv.getY(i) * (d / 3.2));
    const m = mesh(g, pathMat, { cast: false });
    m.position.set((x0 + x1) / 2, y - 0.015, (z0 + z1) / 2);
    root.add(m);
  };
  PATHS.forEach((p, i) => slab(...p, 0.012 + i * 0.002));
  // The hub round the carousel: rings of cobbles, and (an easter egg) a heart of pink stones in front
  const HUB_R = 6.7;
  const hubTex = canvasTexture(1024, 1024, (c, w, h) => {
    const rr = rng(11);
    c.fillStyle = '#e6c8aa';
    c.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const tones = ['#f6e2cb', '#f3dcc0', '#f8e8d6', '#efd5b8', '#f5dfc6'];
    for (let ring = 0; ring < 14; ring++) {
      const r0 = 40 + ring * 34;
      const n = Math.max(8, Math.round((2 * Math.PI * r0) / 40));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ring * 0.3;
        c.save();
        c.translate(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        c.rotate(a);
        c.fillStyle = ring % 5 === 4 ? '#ffd1dc' : tones[Math.floor(rr() * tones.length)];
        roundRect(c, -14, -17, 28, 34, 9);
        c.fill();
        c.restore();
      }
    }
    // the heart: about 1.2 m across, 2.2 m right of and 5.4 m in front of the centre
    const hx = cx + (2.2 / (HUB_R * 2)) * w;
    const hy = cy + (5.4 / (HUB_R * 2)) * h;
    const cells = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
    const s = 17;
    cells.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (ch !== '#') return;
        c.fillStyle = (i + j) % 2 ? '#ffb7c8' : '#ff9eb5';
        roundRect(c, hx + (i - 3.5) * s + 1.5, hy + (j - 3) * s + 1.5, s - 3, s - 3, 5);
        c.fill();
      }),
    );
  });
  const hubGeo = new THREE.CylinderGeometry(HUB_R, HUB_R, 0.03, 56);
  {
    const uv = hubGeo.attributes.uv;
    const pos = hubGeo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / (HUB_R * 2) + 0.5, 0.5 - pos.getZ(i) / (HUB_R * 2));
  }
  const hub = mesh(hubGeo, umat('#ffffff', { map: hubTex, rough: 0.9 }), { cast: false });
  hub.position.set(spots.carousel.x, 0.026, spots.carousel.z);
  root.add(hub);

  // ------------------------------------------------ the picket fence round the park
  const posts = [];
  const rails = [];
  const fenceRun = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / 1.1));
    for (let i = 0; i <= n; i++) posts.push([ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n]);
    rails.push({ ax, az, bx, bz, len });
    const alongX = Math.abs(bz - az) < 0.01;
    colliders.push(alongX ? { type: 'box', x: (ax + bx) / 2, z: az, hw: len / 2, hd: 0.1 } : { type: 'box', x: ax, z: (az + bz) / 2, hw: 0.1, hd: len / 2 });
  };
  const W = HALF.w;
  const D = HALF.d;
  fenceRun(-W, D, -4.8, D);
  fenceRun(4.8, D, W, D);
  fenceRun(-W, -D, -W, D);
  fenceRun(W, -D, W, D);
  fenceRun(-W, -D, W, -D);
  const pGeo = new THREE.BoxGeometry(0.12, 1.05, 0.12);
  pGeo.translate(0, 0.525, 0);
  const cGeo = new THREE.IcosahedronGeometry(0.085, 0);
  cGeo.translate(0, 1.1, 0);
  const postMesh = inst(pGeo, mat(P.cream, { rough: 0.7 }), posts.length, { cast: true });
  const capMesh = inst(cGeo, mat(P.pink, { rough: 0.6 }), posts.length, { cast: false });
  const m4 = new THREE.Matrix4();
  posts.forEach(([x, z], i) => {
    m4.makeTranslation(x, 0, z);
    postMesh.setMatrixAt(i, m4);
    capMesh.setMatrixAt(i, m4);
  });
  root.add(postMesh, capMesh);
  dynamic.push(postMesh, capMesh);
  // Pickets between posts (one instanced mesh)
  const pickets = [];
  for (const r of rails) {
    const n = Math.round(r.len / 0.22);
    for (let i = 1; i < n; i++) pickets.push([r.ax + ((r.bx - r.ax) * i) / n, r.az + ((r.bz - r.az) * i) / n, Math.abs(r.bz - r.az) < 0.01 ? 0 : Math.PI / 2]);
  }
  const pkGeo = new THREE.BoxGeometry(0.08, 0.8, 0.035);
  pkGeo.translate(0, 0.42, 0);
  const pkMesh = inst(pkGeo, mat(P.white, { rough: 0.7 }), pickets.length, { cast: false });
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const v = new THREE.Vector3();
  pickets.forEach(([x, z, ry], i) => pkMesh.setMatrixAt(i, m4.compose(v.set(x, 0, z), q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, ry), one)));
  root.add(pkMesh);
  dynamic.push(pkMesh);
  for (const r of rails) {
    const alongX = Math.abs(r.bz - r.az) < 0.01;
    for (const y of [0.32, 0.72]) {
      const rail = k.box(alongX ? r.len : 0.05, 0.07, alongX ? 0.05 : r.len, P.cream);
      rail.position.set((r.ax + r.bx) / 2, y, (r.az + r.bz) / 2 - (alongX ? 0.03 : 0));
      rail.castShadow = false;
      root.add(rail);
    }
  }

  // ------------------------------------------------ the entrance gate
  const gate = new THREE.Group();
  gate.position.set(0, 0, 25.2);
  root.add(gate);
  for (const s of [-1, 1]) {
    const px = s * 4.3;
    gate.add(k.at(k.rbox(1.1, 0.4, 1.1, P.stoneDark, 0.06), px, 0.2, 0));
    gate.add(k.at(k.rbox(0.9, 4.2, 0.9, P.stone, 0.08), px, 2.3, 0));
    for (const y of [1.2, 2.4, 3.6]) gate.add(k.at(k.box(0.94, 0.08, 0.94, P.pink), px, y, 0));
    gate.add(k.at(k.cyl(0.62, 0.62, 0.5, P.cream, 16), px, 4.65, 0));
    gate.add(k.at(k.cone(0.78, 1.5, P.rose, 16), px, 5.65, 0));
    gate.add(k.at(k.sph(0.12, P.gold), px, 6.45, 0));
    gate.add(k.at(k.cyl(0.025, 0.025, 0.9, P.ink, 6), px, 6.9, 0));
    // little arched windows on the turrets
    for (const a of [0, Math.PI / 2, -Math.PI / 2]) {
      const w = k.box(0.18, 0.28, 0.04, '#6b4a5a');
      w.position.set(px + Math.sin(a) * 0.62, 4.66, Math.cos(a) * 0.62);
      w.rotation.y = a;
      gate.add(w);
    }
    colliders.push({ type: 'box', x: px, z: 25.2, hw: 0.55, hd: 0.55 });
  }
  // The arch over the gate: a pink band curving up
  const archShape = new THREE.Shape();
  const AW = 3.9;
  archShape.moveTo(-AW, 0);
  archShape.quadraticCurveTo(0, 1.5, AW, 0);
  archShape.lineTo(AW, 0.55);
  archShape.quadraticCurveTo(0, 2.05, -AW, 0.55);
  archShape.closePath();
  const archGeo = new THREE.ExtrudeGeometry(archShape, { depth: 0.5, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 18 });
  archGeo.translate(0, 0, -0.25);
  gate.add(k.at(mesh(archGeo, mat(P.pink, { rough: 0.6 })), 0, 3.9, 0));
  // Scallop bulbs along the arch
  const archPts = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const x = -AW + t * AW * 2;
    const y = 3.9 + 0.55 + 2 * t * (1 - t) * 1.5 + 0.04;
    archPts.push(new THREE.Vector3(x, y, 0.3));
  }
  const archBulbs = bulbs(archPts, { r: 0.075, colors: ['#fff3c4', '#ffd1dc'] });
  gate.add(archBulbs);
  dynamic.push(archBulbs);
  // The name sign: one letter is a heart
  const logo = atlas.panel(6.6, 1.65, 1024, 256, (c, w, h) => {
    c.fillStyle = '#fff7ea';
    roundRect(c, 8, 8, w - 16, h - 16, 70);
    c.fill();
    c.lineWidth = 14;
    c.strokeStyle = '#ef5b6f';
    c.stroke();
    c.lineWidth = 4;
    c.strokeStyle = '#ffd166';
    roundRect(c, 26, 26, w - 52, h - 52, 56);
    c.stroke();
    drawLogo(c, w / 2, h / 2 + 6, 150, { ink: '#ef5b6f', heart: '#ff5d7a', line: 10 });
    c.fillStyle = '#ffd166';
    for (const [x, y, r] of [[70, 70, 22], [w - 70, 70, 22], [70, h - 70, 16], [w - 70, h - 70, 16]]) {
      drawStar(c, x, y, r);
      c.fill();
    }
  });
  logo.position.set(0, 5.35, 0.36);
  gate.add(logo);
  // A board backing so the sign has depth
  gate.add(k.at(k.rbox(6.8, 1.85, 0.16, P.cream, 0.06), 0, 5.35, 0.22));

  // Turnstiles: three posts, an arm on each side of every lane that swings open as you walk through
  const arms = [];
  const ARM_Z = 24.6;
  for (const x of [-2.05, 0, 2.05]) {
    root.add(k.at(k.rbox(0.32, 0.95, 0.7, P.steel, 0.05, { rough: 0.4, metal: 0.3 }), x, 0.475, ARM_Z));
    root.add(k.at(k.box(0.34, 0.06, 0.72, P.rose), x, 0.97, ARM_Z));
    root.add(k.at(k.sph(0.07, P.mint), x, 1.04, ARM_Z + 0.2));
    colliders.push({ type: 'box', x, z: ARM_Z, hw: 0.17, hd: 0.36 });
    for (const s of [-1, 1]) {
      if ((x === -2.05 && s < 0) || (x === 2.05 && s > 0)) {
        // outer lanes: the gate pillar is the other side
      }
      const pivot = new THREE.Group();
      pivot.position.set(x + s * 0.17, 0.78, ARM_Z);
      const bar = k.cyl(0.035, 0.035, 0.62, '#ffd166', 8);
      bar.rotation.z = Math.PI / 2;
      bar.position.x = s * 0.31;
      pivot.add(bar);
      root.add(pivot);
      dynamic.push(pivot);
      arms.push({ pivot, s, lane: x + s * 1.0, open: 0 });
    }
  }

  // ------------------------------------------------ ticket booth
  const TB = spots.tickets;
  const booth = new THREE.Group();
  booth.position.set(TB.x, 0, TB.z);
  root.add(booth);
  booth.add(k.at(k.cyl(1.15, 1.2, 0.25, P.stoneDark, 24), 0, 0.125, 0));
  const stripeTex = stripes('#ff9eb5', '#fff4e3', 12, { w: 512, h: 64 });
  stripeTex.repeat.set(1, 1);
  const wallGeo = new THREE.CylinderGeometry(1.0, 1.0, 1.9, 24, 1, true, 0.55, Math.PI * 2 - 1.1);
  const wall = mesh(wallGeo, umat('#ffffff', { map: stripeTex, rough: 0.7, side: THREE.DoubleSide }));
  wall.position.y = 1.2;
  booth.add(wall);
  booth.add(k.at(k.cyl(1.02, 1.02, 0.7, P.cream, 24), 0, 0.6, 0));
  booth.add(k.at(k.box(1.1, 0.08, 0.45, P.wood), 0, 1.0, 0.9));
  booth.add(k.at(k.cyl(1.25, 1.25, 0.14, P.rose, 24), 0, 2.2, 0));
  const roofTex = stripes('#ef5b6f', '#fff4e3', 16, { w: 512, h: 128 });
  booth.add(k.at(mesh(new THREE.ConeGeometry(1.45, 1.2, 24), umat('#ffffff', { map: roofTex, rough: 0.7 })), 0, 2.87, 0));
  booth.add(k.at(k.sph(0.13, P.gold), 0, 3.52, 0));
  const tSign = atlas.panel(1.3, 0.42, 320, 104, (c, w, h) => {
    c.fillStyle = '#ffd166';
    roundRect(c, 4, 4, w - 8, h - 8, 30);
    c.fill();
    c.fillStyle = '#7a2e3a';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Tickets', w / 2, h / 2 + 3, w * 0.8, 62);
  });
  tSign.position.set(0, 1.92, 1.07);
  booth.add(tSign);
  colliders.push({ type: 'circle', x: TB.x, z: TB.z, r: 1.22 });

  // ------------------------------------------------ the park map
  const MP = spots.map;
  const mapG = new THREE.Group();
  mapG.position.set(MP.x, 0, MP.z);
  root.add(mapG);
  for (const s of [-1, 1]) mapG.add(k.at(k.box(0.12, 2.3, 0.12, P.woodDark), s * 1.05, 1.15, -0.05));
  mapG.add(k.at(k.rbox(2.35, 1.6, 0.1, P.woodDark, 0.04), 0, 1.65, -0.02));
  const mapPanel = atlas.panel(2.2, 1.45, 440, 290, (c, w, h) => drawParkMap(c, w, h));
  mapPanel.position.set(0, 1.65, 0.04);
  mapG.add(mapPanel);
  mapG.add(k.at(k.rbox(2.5, 0.16, 0.24, P.rose, 0.05), 0, 2.5, 0));
  colliders.push({ type: 'box', x: MP.x, z: MP.z, hw: 1.15, hd: 0.15 });

  // ------------------------------------------------ lamps along the paths
  const LAMPS = [
    [-3.4, 22.5], [3.4, 22.5], [-3.4, 17.6], [3.4, 17.6], [-3.4, 3.6], [3.4, 3.6], [-3.4, -2.2], [3.4, -2.2],
    [-3.4, -8.2], [3.4, -8.2], [-9.8, -16.4], [9.8, -16.4], [-14.8, 9.6], [-7.6, 9.6], [8.2, 10.4], [14.8, 10.4], [-8.0, -6.0], [14.8, 1.4], [-5.6, 1.9],
  ];
  const lampPost = new THREE.Group();
  lampPost.add(k.at(k.cyl(0.16, 0.2, 0.18, '#3f4a7a', 10), 0, 0.09, 0));
  lampPost.add(k.at(k.cyl(0.055, 0.075, 2.7, '#3f4a7a', 8), 0, 1.45, 0));
  lampPost.add(k.at(k.cyl(0.14, 0.09, 0.12, '#3f4a7a', 10), 0, 2.84, 0));
  lampPost.add(k.at(k.cone(0.2, 0.22, '#3f4a7a', 10), 0, 3.36, 0));
  lampPost.add(k.at(k.sph(0.05, P.gold, undefined, 8), 0, 3.5, 0));
  const lpGeo = toLocalGeo(lampPost);
  const lpMesh = inst(lpGeo, vcMat(0.5), LAMPS.length);
  const globeGeo = new THREE.SphereGeometry(0.21, 14, 10);
  globeGeo.translate(0, 3.08, 0);
  const globeMat = glassMat('#fff6dc', '#ffd27a', 0.55);
  const globes = inst(globeGeo, globeMat, LAMPS.length, { cast: false });
  LAMPS.forEach(([x, z], i) => {
    m4.makeTranslation(x, 0, z);
    lpMesh.setMatrixAt(i, m4);
    globes.setMatrixAt(i, m4);
    colliders.push({ type: 'circle', x, z, r: 0.2 });
  });
  root.add(lpMesh, globes);
  dynamic.push(lpMesh, globes);

  // Garlands of bulbs between the avenue lamps
  const gPts = [];
  const pairs = [[[-3.4, 22.5], [-3.4, 17.6]], [[3.4, 22.5], [3.4, 17.6]], [[-3.4, 3.6], [-3.4, -2.2]], [[3.4, 3.6], [3.4, -2.2]], [[-3.4, -2.2], [-3.4, -8.2]], [[3.4, -2.2], [3.4, -8.2]], [[-3.4, 22.5], [3.4, 22.5]], [[-3.4, -8.2], [3.4, -8.2]]];
  const cords = [];
  for (const [a, b] of pairs) {
    const A = new THREE.Vector3(a[0], 2.95, a[1]);
    const B = new THREE.Vector3(b[0], 2.95, b[1]);
    const pts = garland(A, B, 12, 0.45);
    gPts.push(...pts.slice(1, -1));
    cords.push(pts);
  }
  const garBulbs = bulbs(gPts, { r: 0.06, colors: ['#ffd166', '#ff9eb5', '#8fd3ff', '#7fd8bf', '#c7a6ff'] });
  root.add(garBulbs);
  dynamic.push(garBulbs);
  for (const pts of cords) root.add(wire(pts, 0.012, '#5a4a52', 14));

  // ------------------------------------------------ benches (one carries a plaque)
  const bench = new THREE.Group();
  for (const s of [-1, 1]) {
    bench.add(k.at(k.box(0.08, 0.42, 0.42, '#3f4a7a'), s * 0.7, 0.21, 0));
    bench.add(k.at(k.box(0.08, 0.5, 0.06, '#3f4a7a'), s * 0.7, 0.66, -0.2));
  }
  for (let i = 0; i < 3; i++) bench.add(k.at(k.box(1.6, 0.05, 0.12, P.wood), 0, 0.45, -0.15 + i * 0.14));
  for (let i = 0; i < 2; i++) bench.add(k.at(k.box(1.6, 0.1, 0.04, P.wood), 0, 0.64 + i * 0.16, -0.22));
  const bGeo = toLocalGeo(bench);
  const bMesh = inst(bGeo, vcMat(0.75), spots.benches.length);
  spots.benches.forEach((b, i) => {
    bMesh.setMatrixAt(i, m4.compose(v.set(b.x, 0, b.z), q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, b.yaw), one));
    const c = Math.cos(b.yaw);
    const s = Math.sin(b.yaw);
    colliders.push({ type: 'box', x: b.x, z: b.z, hw: Math.abs(c) * 0.82 + Math.abs(s) * 0.26, hd: Math.abs(s) * 0.82 + Math.abs(c) * 0.26, h: 0.5 });
  });
  root.add(bMesh);
  dynamic.push(bMesh);
  // The plaque on the bench facing the castle
  const pb = spots.benches[spots.plaqueBench];
  const plaque = atlas.panel(0.46, 0.13, 230, 64, (c, w, h) => {
    c.fillStyle = '#e8c56a';
    roundRect(c, 2, 2, w - 4, h - 4, 10);
    c.fill();
    c.strokeStyle = '#9b7430';
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = '#5a3c12';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'For Roji, my favourite ride. H', w / 2, h / 2 + 1, w * 0.9, 22);
  });
  // on the back rest, facing the path behind the bench (the side the camera sees)
  plaque.position.set(pb.x - Math.sin(pb.yaw) * 0.245, 0.72, pb.z - Math.cos(pb.yaw) * 0.245);
  plaque.rotation.y = pb.yaw + Math.PI;
  root.add(plaque);

  // ------------------------------------------------ flower beds
  const beds = spots.beds;
  const fl = [];
  for (const b of beds) {
    root.add(k.at(k.box(b.w + 0.2, 0.22, b.d + 0.2, P.stone), b.x, 0.11, b.z));
    root.add(k.at(k.box(b.w, 0.06, b.d, '#7a5236'), b.x, 0.23, b.z));
    const n = Math.round(b.w * b.d * 4.5);
    for (let i = 0; i < n; i++) fl.push([b.x + (R() - 0.5) * (b.w - 0.15), b.z + (R() - 0.5) * (b.d - 0.15), R()]);
    colliders.push({ type: 'box', x: b.x, z: b.z, hw: b.w / 2 + 0.1, hd: b.d / 2 + 0.1, h: 0.25 });
  }
  const flowerG = new THREE.Group();
  flowerG.add(k.at(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 3, 1, true), mat(P.leafDark)), 0, 0.11, 0));
  const petals = new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 0), mat('#ffffff'));
  petals.scale.set(1, 0.7, 1);
  flowerG.add(k.at(petals, 0, 0.24, 0));
  flowerG.add(k.at(new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), mat('#ffe08a')), 0, 0.29, 0.03));
  const fGeo = toLocalGeo(flowerG, (o) => (o.geometry.type === 'CylinderGeometry' ? '#3f9a4f' : null));
  const fColors = ['#ff9eb5', '#ef5b6f', '#ffd166', '#c7a6ff', '#ffffff', '#ff7fa3', '#8fd3ff'];
  const fMesh = inst(fGeo, vcMat(0.8), fl.length, { cast: false, colors: fColors });
  // Instance colour multiplies the stem too, so stems are painted white-ish green and stay green enough
  fl.forEach(([x, z, r], i) => fMesh.setMatrixAt(i, m4.compose(v.set(x, 0.24, z), q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, r * 6), one.clone().setScalar(0.8 + r * 0.5))));
  root.add(fMesh);
  dynamic.push(fMesh);

  // ------------------------------------------------ trees and hedges near the fence
  for (const [x, z, s] of spots.trees) {
    const t = new THREE.Group();
    t.add(k.at(k.cyl(0.13 * s, 0.18 * s, 1.4 * s, '#9b6a43', 8), 0, 0.7 * s, 0));
    t.add(k.at(k.sph(0.95 * s, R() > 0.5 ? '#6cc24a' : '#5fb85a', undefined, 10), 0, 1.9 * s, 0));
    t.add(k.at(k.sph(0.6 * s, '#7fd06a', undefined, 8), 0.45 * s, 2.35 * s, 0.25 * s));
    if (R() > 0.55) t.add(k.at(k.sph(0.55 * s, '#ffb7c8', undefined, 8), -0.4 * s, 2.3 * s, 0.3 * s));
    t.position.set(x, 0, z);
    root.add(t);
    colliders.push({ type: 'circle', x, z, r: 0.25 * s });
    // The big crown hangs low enough to reach a kid: block its widest part below 1.3 m
    const q = 1 - ((Math.min(1.3, 1.9 * s) - 1.9 * s) / (0.95 * s)) ** 2;
    if (q > 0) colliders.push({ type: 'circle', x, z, r: 0.95 * s * Math.sqrt(q) - 0.18 });
  }
  for (const [x, z, w, d] of spots.hedges) {
    root.add(k.at(k.rbox(w, 0.75, d, '#5fb85a', 0.25), x, 0.375, z));
    colliders.push({ type: 'box', x, z, hw: w / 2, hd: d / 2, h: 0.75 });
  }

  // Bins (pink, with a heart)
  for (const [x, z] of spots.bins) {
    root.add(k.at(k.cyl(0.24, 0.2, 0.75, P.rose, 12), x, 0.375, z));
    root.add(k.at(k.cyl(0.27, 0.27, 0.08, P.cream, 12), x, 0.78, z));
    colliders.push({ type: 'circle', x, z, r: 0.28, h: 0.82 });
  }

  const tmp = new THREE.Vector3();
  return {
    root,
    dynamic,
    colliders,
    bulbs: [archBulbs, garBulbs],
    globeMat,
    update(dt, t, people) {
      // Turnstile arms swing open while somebody walks through their lane
      for (const a of arms) {
        let want = 0;
        for (const p of people) {
          tmp.copy(p);
          if (Math.abs(tmp.z - ARM_Z) < 1.3 && Math.abs(tmp.x - a.lane) < 0.85) want = 1;
        }
        a.open += (want - a.open) * Math.min(1, dt * (want ? 6 : 2.5));
        a.pivot.rotation.y = -a.s * a.open * 1.45;
      }
    },
  };
}

const toLocalGeo = (group, tint) => toGeo(group, tint);

// The painted map on the board by the gate
function drawParkMap(c, w, h) {
  c.fillStyle = '#bfe6a8';
  roundRect(c, 0, 0, w, h, 18);
  c.fill();
  c.fillStyle = '#f3dcc0';
  c.fillRect(w * 0.45, h * 0.12, w * 0.1, h * 0.88);
  c.beginPath();
  c.arc(w * 0.5, h * 0.62, w * 0.1, 0, Math.PI * 2);
  c.fill();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#ef5b6f';
  c.font = `600 26px ${FONT}`;
  c.fillText('Welcome to Roji Land', w / 2, 20);
  const spot = (x, y, color, label) => {
    c.fillStyle = color;
    c.beginPath();
    c.arc(x * w, y * h, 12, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#3b2b3f';
    c.font = `600 15px ${FONT}`;
    c.fillText(label, x * w, y * h + 22);
  };
  // castle
  c.fillStyle = '#ffd1dc';
  c.fillRect(w * 0.36, h * 0.1, w * 0.28, h * 0.12);
  c.fillStyle = '#c7a6ff';
  for (const x of [0.38, 0.5, 0.62]) {
    c.beginPath();
    c.moveTo(w * x - 12, h * 0.1);
    c.lineTo(w * x, h * 0.02 + 10);
    c.lineTo(w * x + 12, h * 0.1);
    c.fill();
  }
  c.fillStyle = '#3b2b3f';
  c.font = `600 15px ${FONT}`;
  c.fillText('Castle', w * 0.5, h * 0.27);
  spot(0.5, 0.62, '#ff9eb5', 'Carousel');
  spot(0.2, 0.25, '#8fd3ff', 'Big wheel');
  spot(0.2, 0.5, '#ffd166', 'Games');
  spot(0.2, 0.75, '#7fd8bf', 'Teacups');
  spot(0.8, 0.25, '#ef5b6f', 'Comet');
  spot(0.8, 0.52, '#c7a6ff', 'Bumper cars');
  spot(0.8, 0.77, '#6fb8ff', 'Sky swings');
  spot(0.64, 0.34, '#9b7be0', 'Ghost Train');
  spot(0.94, 0.36, '#3fbfb4', 'Flume');
  spot(0.07, 0.62, '#ff7fa3', 'Parade');
  c.fillStyle = '#ef5b6f';
  heartPath(c, w * 0.5, h * 0.92, 22);
  c.fill();
  c.fillStyle = '#3b2b3f';
  c.font = `600 14px ${FONT}`;
  c.fillText('You are here', w * 0.5 + 62, h * 0.92);
}
