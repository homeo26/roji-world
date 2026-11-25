import { THREE, P, at, box, rbox, cyl, sph, mat, mesh, canvasTexture, roundRect, rng, FONT, fitText, heartPath } from './kit.js';
import { FLOOR, FLOOR_HALF, FOUNTAIN, CART, ARCH, PAVE } from './layout.js';

// The park around the attractions: paving with chalk games, hedges, flower beds, lamps, benches, the
// "Play Park" entrance arch, a blossom tree and the popcorn cart.

const S = 50; // paving texture pixels per metre
const WALK_END = 4.7; // the paving runs on under the pad as a short walkway

function drawPaving(c, w, h) {
  const X = (x) => (x - PAVE.x0) * S;
  const Z = (z) => (z - PAVE.z0) * S;
  const r = rng(41);
  // Outline: the park with round corners, and the walkway out to the pad
  c.beginPath();
  roundRect(c, X(PAVE.x0) + 1, Z(PAVE.z0) + 1, (PAVE.x1 - PAVE.x0) * S - 2, (PAVE.z1 - PAVE.z0) * S - 2, 40);
  c.rect(X(-1.35), Z(2.0), 2.7 * S, (WALK_END - 2.0) * S);
  c.fillStyle = '#e9dcc5';
  c.fill();
  c.save();
  c.clip();
  // Running-bond pavers, each a slightly different cream
  const rowH = 0.4 * S;
  const len = 0.62 * S;
  for (let y = 0, row = 0; y < h; y += rowH, row++) {
    for (let x = -(row % 2) * len * 0.5; x < w; x += len) {
      const k = r();
      c.fillStyle = `rgb(${236 + k * 10}, ${226 + k * 9}, ${206 + k * 10})`;
      roundRect(c, x + 1.5, y + 1.5, len - 3, rowH - 3, 3);
      c.fill();
    }
  }
  // Fountain rosette: rings of radial stones and a pink border
  const fx = X(FOUNTAIN.x);
  const fz = Z(FOUNTAIN.z);
  c.fillStyle = '#e4d4b9';
  c.beginPath();
  c.arc(fx, fz, 2.55 * S, 0, Math.PI * 2);
  c.fill();
  for (const [r0, r1, n, a, b] of [[1.6, 2.05, 28, '#f3eadb', '#e8dac2'], [2.05, 2.45, 36, '#eee2cd', '#f6eee1']]) {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      c.beginPath();
      c.arc(fx, fz, r1 * S - 1.5, a0 + 0.01, a1 - 0.01);
      c.arc(fx, fz, r0 * S + 1.5, a1 - 0.01, a0 + 0.01, true);
      c.closePath();
      c.fillStyle = i % 2 ? a : b;
      c.fill();
    }
  }
  c.strokeStyle = '#f2a7bf';
  c.lineWidth = 5;
  c.beginPath();
  c.arc(fx, fz, 2.5 * S, 0, Math.PI * 2);
  c.stroke();
  // A band of lilac and pink stones round the dance floor
  const dx = X(FLOOR.x);
  const dz = Z(FLOOR.z);
  const outer = (FLOOR_HALF + 0.55) * S;
  c.fillStyle = '#d8cdf0';
  roundRect(c, dx - outer, dz - outer, outer * 2, outer * 2, 18);
  c.fill();
  const step = 0.36 * S;
  for (let i = -outer; i < outer; i += step) {
    for (const [sx, sz] of [[i, -outer], [i, outer - step], [-outer, i], [outer - step, i]]) {
      c.fillStyle = Math.round((i + outer) / step) % 2 ? '#e7defa' : '#f6c3d5';
      roundRect(c, dx + sx + 2, dz + sz + 2, step - 4, step - 4, 4);
      c.fill();
    }
  }
  // The walkway from the pad: pink edging
  c.fillStyle = '#f2b6c9';
  c.fillRect(X(-1.35), Z(2.0), 0.12 * S, (WALK_END - 2.0) * S);
  c.fillRect(X(1.23), Z(2.0), 0.12 * S, (WALK_END - 2.0) * S);
  // Chalk hopscotch by the fountain
  const chalk = (col, wdt = 3) => {
    c.strokeStyle = col;
    c.lineWidth = wdt;
    c.lineJoin = 'round';
    c.lineCap = 'round';
  };
  const sq = 0.46 * S;
  const hx = X(-6.55);
  const hz = Z(0.86);
  const cells = [[0, 0, '1'], [1, 0, '2'], [2, 0, '3'], [3, -0.5, '4'], [3, 0.5, '5'], [4, 0, '6'], [5, -0.5, '7'], [5, 0.5, '8']];
  c.font = `700 ${Math.round(sq * 0.55)}px ${FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  cells.forEach(([i, j, n], k) => {
    const x = hx + i * sq;
    const y = hz + j * sq - sq / 2;
    chalk(['#ffffff', '#ffd6e4', '#fff3b8'][k % 3]);
    c.strokeRect(x, y, sq, sq);
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillText(n, x + sq / 2, y + sq / 2 + 1);
  });
  chalk('#ffd6e4');
  c.beginPath();
  c.arc(hx + 6 * sq + sq * 0.45, hz, sq * 0.45, -Math.PI / 2, Math.PI / 2);
  c.stroke();
  // Chalk drawing near the popcorn cart: the two of them holding hands under a heart
  const cx = X(9.1);
  const cy = Z(-0.85);
  chalk('#ff9fbf', 3.5);
  c.beginPath();
  c.arc(cx - 16, cy - 16, 6, 0, Math.PI * 2); // her head
  c.moveTo(cx - 16, cy - 10);
  c.lineTo(cx - 24, cy + 6);
  c.lineTo(cx - 8, cy + 6);
  c.closePath(); // her dress
  c.moveTo(cx - 13, cy + 6);
  c.lineTo(cx - 13, cy + 14);
  c.moveTo(cx - 19, cy + 6);
  c.lineTo(cx - 19, cy + 14);
  c.moveTo(cx - 22, cy - 20);
  c.lineTo(cx - 26, cy - 14); // pigtails
  c.moveTo(cx - 10, cy - 20);
  c.lineTo(cx - 6, cy - 14);
  c.stroke();
  chalk('#9fd0ff', 3.5);
  c.beginPath();
  c.arc(cx + 16, cy - 16, 6, 0, Math.PI * 2); // his head
  c.moveTo(cx + 16, cy - 10);
  c.lineTo(cx + 16, cy + 4);
  c.moveTo(cx + 16, cy + 4);
  c.lineTo(cx + 11, cy + 14);
  c.moveTo(cx + 16, cy + 4);
  c.lineTo(cx + 21, cy + 14);
  c.moveTo(cx + 16, cy - 6);
  c.lineTo(cx + 24, cy);
  c.stroke();
  chalk('#ffffff', 3);
  c.beginPath();
  c.moveTo(cx - 12, cy - 2);
  c.quadraticCurveTo(cx, cy + 4, cx + 16, cy - 6); // holding hands
  c.stroke();
  chalk('#ff6f9e', 3.5);
  heartPath(c, cx, cy - 26, 14);
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.font = `700 15px ${FONT}`;
  c.fillText('R + H', cx, cy + 26);
  // A tiny heart hidden among the pavers by the entrance
  c.fillStyle = '#f2b3c6';
  const HB = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  const pz = 0.07 * S;
  HB.forEach((row, j) => [...row].forEach((ch, i) => ch === '#' && c.fillRect(X(4.7) + i * pz, Z(0.85) + j * pz, pz - 1, pz - 1)));
  // Soft shade along the hedges
  const edge = c.createLinearGradient(0, 0, 0, 0.6 * S);
  edge.addColorStop(0, 'rgba(120,100,70,0.22)');
  edge.addColorStop(1, 'rgba(120,100,70,0)');
  c.fillStyle = edge;
  c.fillRect(0, 0, w, 0.6 * S);
  c.restore();
}

export function buildGarden(ctx) {
  const { g, col, atlas, blossoms, leaves, pools, glows, bulbs } = ctx;
  const wood = mat(P.wood, { rough: 0.8 });
  const iron = mat(P.iron, { rough: 0.5, metal: 0.3 });

  // ------------------------------------------------ paving
  const pw = 1024;
  const ph = Math.ceil(((WALK_END - PAVE.z0) * S) / 8) * 8;
  const pTex = canvasTexture(pw, ph, drawPaving);
  const paving = mesh(new THREE.PlaneGeometry(pw / S, ph / S), new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.92, alphaTest: 0.5 }), { cast: false });
  paving.rotation.x = -Math.PI / 2;
  at(paving, PAVE.x0 + pw / S / 2, 0.02, PAVE.z0 + ph / S / 2);
  g.add(paving);

  // ------------------------------------------------ hedges round the back and the sides
  const hedgeMat = mat('#5aa84f', { rough: 0.9 });
  const hedge = (x0, z0, x1, z1) => {
    const lx = Math.abs(x1 - x0) + 0.55;
    const lz = Math.abs(z1 - z0) + 0.55;
    const h = rbox(lx, 0.72, lz, hedgeMat, 0.22, 2);
    at(h, (x0 + x1) / 2, 0.36, (z0 + z1) / 2);
    g.add(h);
    col({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: lx / 2, hd: lz / 2, h: 0.72 });
    // Leafy bumps and little flowers on top
    const n = Math.round(Math.max(lx, lz) / 0.55);
    const r = rng(Math.round(x0 * 7 + z0 * 13));
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n;
      const x = x0 + (x1 - x0) * k + (r() - 0.5) * 0.12;
      const z = z0 + (z1 - z0) * k + (r() - 0.5) * 0.12;
      leaves.push({ x, y: 0.7, z, s: 0.2 + r() * 0.07, c: r() < 0.5 ? '#63b356' : '#579f4b' });
      if (r() < 0.7) blossoms.push({ x: x + (r() - 0.5) * 0.3, y: 0.78 + r() * 0.06, z: z + (r() - 0.5) * 0.3, s: 0.05, c: ['#ffffff', '#ffd3e0', '#fff3b8'][Math.floor(r() * 3)] });
    }
  };
  hedge(-7.12, -9.5, -7.12, 1.6);
  hedge(-6.6, -9.72, -0.75, -9.72);
  hedge(5.95, -9.72, 7.25, -9.72);
  hedge(12.62, -6.6, 12.62, 1.6);

  // ------------------------------------------------ flower beds along the front
  const rim = mat(P.stone, { rough: 0.85 });
  const soil = mat(P.soil, { rough: 1 });
  const bed = (x0, x1, z0, z1, seed) => {
    const w = x1 - x0;
    const d = z1 - z0;
    g.add(at(rbox(w, 0.24, d, rim, 0.06), (x0 + x1) / 2, 0.12, (z0 + z1) / 2));
    g.add(at(box(w - 0.16, 0.04, d - 0.16, soil), (x0 + x1) / 2, 0.235, (z0 + z1) / 2));
    col({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: w / 2, hd: d / 2 });
    const r = rng(seed);
    const cols = ['#ff8fb1', '#ffd166', '#ef5b6f', '#ffffff', '#b9a6ff', '#ffb36b'];
    for (let x = x0 + 0.22; x < x1 - 0.15; x += 0.28) {
      for (let z = z0 + 0.2; z < z1 - 0.1; z += 0.26) {
        const px = x + (r() - 0.5) * 0.1;
        const pz = z + (r() - 0.5) * 0.08;
        leaves.push({ x: px, y: 0.3, z: pz, s: 0.12 + r() * 0.04, c: r() < 0.5 ? '#6dbb58' : '#5aa84f' });
        blossoms.push({ x: px + (r() - 0.5) * 0.08, y: 0.4 + r() * 0.08, z: pz + (r() - 0.5) * 0.06, s: 0.055 + r() * 0.02, c: cols[Math.floor(r() * cols.length)] });
      }
    }
  };
  bed(-6.9, -1.95, 2.0, 2.8, 3);
  bed(1.95, 6.2, 2.0, 2.8, 5);
  bed(10.3, 12.0, 2.0, 2.8, 7);

  // ------------------------------------------------ lamps (warm lanterns, a pool of light at night)
  const glass = mat('#fff3c4', { emissive: '#ffcf73', ei: 0.85, rough: 0.4 });
  const lamp = (x, z) => {
    g.add(at(cyl(0.15, 0.2, 0.26, iron, 14), x, 0.13, z));
    g.add(at(cyl(0.045, 0.055, 2.5, iron, 10), x, 1.5, z));
    g.add(at(cyl(0.08, 0.08, 0.08, mat(P.gold, { rough: 0.4, metal: 0.5 }), 12), x, 1.0, z));
    g.add(at(box(0.32, 0.05, 0.32, iron), x, 2.74, z));
    g.add(at(rbox(0.26, 0.38, 0.26, glass, 0.05), x, 2.95, z));
    const cap = cyl(0.03, 0.25, 0.2, iron, 4);
    cap.rotation.y = Math.PI / 4;
    g.add(at(cap, x, 3.24, z));
    g.add(at(sph(0.05, mat(P.gold, { rough: 0.4, metal: 0.5 }), 10), x, 3.38, z));
    col({ type: 'circle', x, z, r: 0.2 });
    pools.push({ x, z, r: 2.6, color: '#ffc874', k: 0.5 });
    glows.push({ x, y: 2.95, z, color: '#ffd98a', k: 1 });
  };
  lamp(-7.0, 2.55);
  lamp(6.65, 2.5);
  lamp(12.35, 2.4);
  lamp(-1.45, -9.25);
  lamp(12.35, -6.55);

  // ------------------------------------------------ benches you can hop onto
  const bench = (x, z, yaw) => {
    const b = new THREE.Group();
    for (let i = 0; i < 3; i++) b.add(at(box(1.6, 0.05, 0.15, wood), 0, 0.45, -0.17 + i * 0.17));
    for (let i = 0; i < 2; i++) {
      const s = box(1.6, 0.13, 0.04, wood);
      at(s, 0, 0.64 + i * 0.17, -0.27 - i * 0.02);
      s.rotation.x = -0.12;
      b.add(s);
    }
    for (const sx of [-0.7, 0.7]) {
      b.add(at(box(0.06, 0.43, 0.46, iron), sx, 0.215, -0.02));
      const post = box(0.06, 0.52, 0.05, iron);
      at(post, sx, 0.7, -0.29);
      post.rotation.x = -0.12;
      b.add(post);
      b.add(at(box(0.08, 0.05, 0.44, iron), sx, 0.62, -0.06));
    }
    b.position.set(x, 0, z);
    b.rotation.y = yaw;
    g.add(b);
    const ax = Math.cos(yaw);
    const az = -Math.sin(yaw);
    for (const s of [-0.42, 0.42]) col({ type: 'circle', x: x + ax * s, z: z + az * s, r: 0.4, h: 0.5 });
  };
  bench(-4.55, -8.85, 0);
  bench(8.9, 0.95, -0.4);
  bench(11.75, -1.75, -Math.PI / 2);

  // ------------------------------------------------ the "Play Park" arch at the entrance
  const stripes = atlas.add(64, 128, (c, w, h) => {
    c.fillStyle = P.cream;
    c.fillRect(0, 0, w, h);
    c.fillStyle = P.teal;
    for (let i = -4; i < 8; i++) {
      c.beginPath();
      c.moveTo(0, i * 24);
      c.lineTo(w, i * 24 + 32);
      c.lineTo(w, i * 24 + 44);
      c.lineTo(0, i * 24 + 12);
      c.closePath();
      c.fill();
    }
  });
  const pillarMat = atlas.paint;
  for (const sx of [-ARCH.half, ARCH.half]) {
    const x = ARCH.x + sx;
    g.add(at(rbox(0.5, 0.3, 0.5, mat(P.stone, { rough: 0.8 }), 0.06), x, 0.15, ARCH.z));
    const pil = mesh(atlas.fit(new THREE.CylinderGeometry(0.15, 0.17, 2.55, 16, 1, true), stripes), pillarMat);
    at(pil, x, 1.57, ARCH.z);
    g.add(pil);
    g.add(at(cyl(0.21, 0.21, 0.1, mat(P.gold, { rough: 0.35, metal: 0.5 }), 16), x, 2.88, ARCH.z));
    g.add(at(sph(0.14, mat(P.pink, { rough: 0.4 }), 14), x, 3.05, ARCH.z));
    col({ type: 'circle', x, z: ARCH.z, r: 0.28 });
    // Balloons tied to the pillar
    ['#ff8fb1', '#ffd166', '#7fd3ff'].forEach((c, i) => ctx.balloons.push({ x: x + (i - 1) * 0.16 * Math.sign(sx), y: 2.1, z: ARCH.z + 0.05, len: 0.95 + i * 0.18, color: sx < 0 ? c : ['#b9a6ff', '#ef5b6f', '#9fe3cf'][i], ph: i * 1.7 + sx }));
  }
  // The curved top beam, with bulbs along it
  const beamPts = [];
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI - (i / 24) * Math.PI;
    beamPts.push(new THREE.Vector3(ARCH.x + Math.cos(a) * ARCH.half, 2.95 + Math.sin(a) * 0.95, ARCH.z));
  }
  const beam = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(beamPts), 32, 0.07, 8), mat(P.teal, { rough: 0.5 }));
  g.add(beam);
  beamPts.forEach((p, i) => {
    if (i % 2 || i === 0 || i === 24) return;
    bulbs.push({ p: p.clone().add(new THREE.Vector3(0, 0.03, 0.09)), base: new THREE.Color(i % 4 ? '#fff1c9' : '#ffb3cc'), set: 'sign', k: i / 24 });
  });
  const board = atlas.add(512, 170, (c, w, h) => {
    c.fillStyle = P.teal;
    roundRect(c, 4, 4, w - 8, h - 8, 60);
    c.fill();
    c.fillStyle = P.ivory;
    roundRect(c, 16, 16, w - 32, h - 32, 50);
    c.fill();
    c.fillStyle = P.rose;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Play Park', w / 2, h / 2 + 6, w - 150, 96);
    // A note on each side
    for (const [nx, col] of [[60, P.teal], [w - 60, P.violet]]) {
      c.fillStyle = col;
      c.beginPath();
      c.ellipse(nx - 6, h / 2 + 22, 15, 11, -0.4, 0, Math.PI * 2);
      c.fill();
      c.fillRect(nx + 6, h / 2 - 34, 6, 58);
      c.beginPath();
      c.moveTo(nx + 12, h / 2 - 34);
      c.quadraticCurveTo(nx + 34, h / 2 - 20, nx + 26, h / 2 - 2);
      c.lineTo(nx + 12, h / 2 - 16);
      c.fill();
    }
  });
  const sign = atlas.plane(board, 2.25, 0.75, true);
  at(sign, ARCH.x, 3.32, ARCH.z + 0.1);
  g.add(sign);
  const back = atlas.plane(board, 2.25, 0.75);
  back.rotation.y = Math.PI;
  at(back, ARCH.x, 3.32, ARCH.z + 0.06);
  g.add(back);
  for (const sx of [-0.7, 0.7]) {
    const rod = cyl(0.015, 0.015, 0.32, iron, 6);
    at(rod, ARCH.x + sx, 3.75, ARCH.z + 0.08);
    g.add(rod);
  }

  // ------------------------------------------------ the blossom tree, with initials carved in it
  const TX = -6.45;
  const TZ = -8.95;
  const trunk = cyl(0.16, 0.24, 1.6, mat('#8b5e3c', { rough: 0.95 }), 10);
  at(trunk, TX, 0.8, TZ);
  g.add(trunk);
  const branch = cyl(0.06, 0.1, 0.9, mat('#8b5e3c', { rough: 0.95 }), 8);
  branch.rotation.z = -0.8;
  at(branch, TX + 0.35, 1.65, TZ);
  g.add(branch);
  const crown = [[0, 2.15, 0, 0.95, '#f6a5c0'], [0.7, 1.95, 0.2, 0.7, '#f9bfd2'], [-0.55, 1.9, 0.25, 0.68, '#f28db0'], [0.15, 2.6, -0.25, 0.6, '#f9bfd2']];
  for (const [x, y, z, r, c] of crown) {
    const b = mesh(new THREE.IcosahedronGeometry(r, 1), mat(c, { rough: 0.85, flat: true }));
    at(b, TX + x, y, TZ + z);
    g.add(b);
  }
  col({ type: 'circle', x: TX, z: TZ, r: 0.3 });
  const carve = atlas.add(96, 96, (c, w, h) => {
    c.strokeStyle = '#5b3a22';
    c.lineWidth = 6;
    heartPath(c, w / 2, h / 2 + 10, 40);
    c.stroke();
    c.fillStyle = '#5b3a22';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 22px ${FONT}`;
    c.fillText('R+H', w / 2, h / 2 + 2);
  });
  const carving = atlas.plane(carve, 0.32, 0.32);
  at(carving, TX, 0.95, TZ + 0.212);
  carving.rotation.x = -0.03;
  g.add(carving);
  // Fallen petals under it
  const pr = rng(77);
  for (let i = 0; i < 26; i++) {
    const a = pr() * Math.PI * 2;
    const d = 0.4 + pr() * 1.3;
    blossoms.push({ x: TX + Math.cos(a) * d, y: 0.035, z: TZ + Math.sin(a) * d * 0.8, s: 0.035, c: pr() < 0.5 ? '#f9bfd2' : '#f6a5c0', flat: true });
  }

  buildCart(ctx);
}

// A red and white popcorn cart with a striped canopy and popcorn popping in the glass case.
function buildCart(ctx) {
  const { g, col, atlas, dyn, updaters } = ctx;
  const cart = new THREE.Group();
  cart.position.set(CART.x, 0, CART.z);
  g.add(cart);
  const red = mat('#e5484d', { rough: 0.55 });
  const gold = mat(P.gold, { rough: 0.35, metal: 0.55 });
  const white = mat(P.ivory, { rough: 0.6 });
  const stripe = atlas.add(128, 64, (c, w, h) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? P.ivory : '#e5484d';
      c.fillRect(i * 16, 0, 16, h);
    }
  });
  const body = rbox(1.3, 0.78, 0.7, red, 0.07);
  at(body, 0, 0.72, 0);
  cart.add(body);
  const front = atlas.plane(stripe, 1.14, 0.6);
  at(front, 0, 0.72, 0.356);
  cart.add(front);
  cart.add(at(box(1.36, 0.06, 0.76, gold), 0, 1.13, 0));
  for (const sx of [-0.58, 0.58]) {
    const wheel = cyl(0.3, 0.3, 0.07, mat(P.ink, { rough: 0.6 }), 18);
    wheel.rotation.z = Math.PI / 2;
    at(wheel, sx * 1.12, 0.3, 0.08);
    cart.add(wheel);
    const hub = cyl(0.08, 0.08, 0.09, gold, 10);
    hub.rotation.z = Math.PI / 2;
    at(hub, sx * 1.12, 0.3, 0.08);
    cart.add(hub);
    for (let k = 0; k < 3; k++) {
      const sp = box(0.02, 0.52, 0.03, gold);
      sp.rotation.x = (k / 3) * Math.PI;
      at(sp, sx * 1.12, 0.3, 0.08);
      cart.add(sp);
    }
  }
  cart.add(at(cyl(0.035, 0.035, 0.36, gold, 8), -0.45, 0.17, -0.25));
  // Glass case with a heap of popcorn
  const frameH = 0.62;
  for (const [x, z] of [[-0.55, -0.27], [0.55, -0.27], [-0.55, 0.27], [0.55, 0.27]]) cart.add(at(box(0.04, frameH, 0.04, gold), x, 1.16 + frameH / 2, z));
  cart.add(at(box(1.16, 0.04, 0.6, gold), 0, 1.16 + frameH, 0));
  ctx.glass.push(new THREE.BoxGeometry(1.1, frameH, 0.54).translate(CART.x, 1.16 + frameH / 2, CART.z));
  const kernelGeo = new THREE.IcosahedronGeometry(0.035, 0);
  const pop = mat('#fff6d8', { rough: 0.9, flat: true });
  const r = rng(12);
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.42;
    const k = mesh(kernelGeo, pop, { cast: false });
    at(k, Math.cos(a) * d * 1.15, 1.2 + (0.42 - d) * 0.35 + r() * 0.04, Math.sin(a) * d * 0.5);
    k.rotation.set(r() * 3, r() * 3, 0);
    cart.add(k);
  }
  // Canopy on four striped poles
  for (const [x, z] of [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]]) cart.add(at(cyl(0.022, 0.022, 0.62, white, 6), x, 2.09, z));
  const canopy = mesh(atlas.fit(new THREE.ConeGeometry(0.62, 0.3, 4, 1, true), stripe).rotateY(Math.PI / 4), atlas.paint);
  canopy.scale.set(1.5, 1, 0.85);
  at(canopy, 0, 2.55, 0);
  cart.add(canopy);
  cart.add(at(sph(0.06, red, 10), 0, 2.72, 0));
  const flagPole = cyl(0.012, 0.012, 0.35, white, 5);
  at(flagPole, 0, 2.88, 0);
  cart.add(flagPole);
  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 0);
  flagShape.lineTo(0.22, -0.06);
  flagShape.lineTo(0, -0.13);
  const flag = mesh(new THREE.ShapeGeometry(flagShape), mat(P.sun, { side: THREE.DoubleSide }), { cast: false });
  at(flag, 0.012, 3.05, 0);
  cart.add(flag);
  const label = atlas.add(320, 96, (c, w, h) => {
    c.fillStyle = P.sun;
    roundRect(c, 4, 4, w - 8, h - 8, 40);
    c.fill();
    c.fillStyle = '#a3262b';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Popcorn', w / 2, h / 2 + 3, w - 50, 60);
  });
  const lab = atlas.plane(label, 0.86, 0.26, true);
  at(lab, 0, 1.92, 0.31);
  lab.rotation.x = -0.35;
  cart.add(lab);
  const free = atlas.add(256, 64, (c, w, h) => {
    c.fillStyle = P.ivory;
    roundRect(c, 3, 3, w - 6, h - 6, 18);
    c.fill();
    c.fillStyle = '#a3262b';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Free for dancers', w / 2, h / 2 + 2, w - 24, 30, 600);
  });
  const fr = atlas.plane(free, 0.62, 0.16);
  at(fr, 0, 0.52, 0.358);
  cart.add(fr);
  col({ type: 'box', x: CART.x, z: CART.z + 0.05, hw: 0.75, hd: 0.45 });

  // Popping kernels: each jumps up from the heap and tumbles back
  const pops = new THREE.InstancedMesh(kernelGeo, mat('#fffbe8', { rough: 0.9, flat: true }), 12);
  pops.frustumCulled = false;
  cart.add(pops);
  dyn.push(pops);
  const state = [];
  for (let i = 0; i < 12; i++) state.push({ x: (r() - 0.5) * 0.8, z: (r() - 0.5) * 0.32, y: 0, vy: 0, vx: 0, wait: r() * 2, rot: r() * 6 });
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const one = new THREE.Vector3(1, 1, 1);
  const v = new THREE.Vector3();
  updaters.push((dt) => {
    state.forEach((s, i) => {
      if (s.wait > 0) {
        s.wait -= dt;
        if (s.wait <= 0) {
          s.y = 1.28;
          s.vy = 1.4 + r() * 0.9;
          s.vx = (r() - 0.5) * 0.6;
        }
      } else {
        s.vy -= 6 * dt;
        s.y += s.vy * dt;
        s.x = Math.max(-0.5, Math.min(0.5, s.x + s.vx * dt));
        s.rot += dt * 8;
        if (s.y < 1.26) {
          s.wait = 0.3 + r() * 1.6;
          s.x = (r() - 0.5) * 0.8;
        }
      }
      m4.compose(v.set(s.x, s.wait > 0 ? -5 : s.y, s.z), q.setFromEuler(e.set(s.rot, s.rot * 0.7, 0)), one);
      pops.setMatrixAt(i, m4);
    });
    pops.instanceMatrix.needsUpdate = true;
  });
}
