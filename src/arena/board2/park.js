import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, umat, mesh, canvasTexture, roundRect, rng, FONT } from '../../util.js';
import { box, rbox, cyl, ball, cone, at, shade, bakeVC, garden, flowerPatch, clouds } from './kit.js';

// The Play Park for Memory Match: the round plaza with the wishing fountain, the light-up
// dance floor and the arcade, and a picnic table with a gingham cloth in the middle.

const TEAL = '#21a99a';

export function buildPark(ctx, { tableW, tableD }) {
  const { scene } = ctx;
  const g = new THREE.Group();
  scene.add(g);
  const dynamic = [];

  const lawn = mesh(new THREE.CircleGeometry(60, 48), mat('#9ad06a', { rough: 0.95 }), { cast: false });
  lawn.rotation.x = -Math.PI / 2;
  g.add(lawn);
  g.add(at(mesh(new THREE.CylinderGeometry(7.6, 7.75, 0.08, 56), mat('#efe6d6', { rough: 0.95 }), { cast: false }), 0, 0.04, 0));
  const ringTex = canvasTexture(1024, 1024, (c, w) => {
    // Inner rosette of soft paving stones around the table
    const ring = (r0, r1, n, cols) => {
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2 + 0.012;
        const a1 = ((i + 1) / n) * Math.PI * 2 - 0.012;
        c.beginPath();
        c.arc(w / 2, w / 2, w * r1, a0, a1);
        c.arc(w / 2, w / 2, w * r0, a1, a0, true);
        c.closePath();
        c.fillStyle = cols[i % cols.length];
        c.fill();
      }
    };
    ring(0.205, 0.255, 28, ['rgba(239,91,111,.16)', 'rgba(255,209,102,.22)', 'rgba(127,211,167,.2)', 'rgba(111,184,255,.18)']);
    ring(0.27, 0.3, 36, ['rgba(221,207,184,.55)', 'rgba(221,207,184,.3)']);
    c.strokeStyle = '#ddcfb8';
    c.lineWidth = 14;
    for (const r of [0.485, 0.39]) {
      c.beginPath();
      c.arc(w / 2, w / 2, w * r, 0, Math.PI * 2);
      c.stroke();
    }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      c.beginPath();
      c.moveTo(w / 2 + Math.cos(a) * w * 0.39, w / 2 + Math.sin(a) * w * 0.39);
      c.lineTo(w / 2 + Math.cos(a) * w * 0.485, w / 2 + Math.sin(a) * w * 0.485);
      c.stroke();
    }
    c.fillStyle = 'rgba(239,91,111,.12)';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.beginPath();
      c.arc(w / 2 + Math.cos(a) * w * 0.437, w / 2 + Math.sin(a) * w * 0.437, 16, 0, Math.PI * 2);
      c.fill();
    }
  });
  const decal = new THREE.Mesh(new THREE.CircleGeometry(7.6, 56), new THREE.MeshStandardMaterial({ map: ringTex, transparent: true, roughness: 1, depthWrite: false }));
  decal.rotation.x = -Math.PI / 2;
  decal.position.y = 0.083;
  decal.receiveShadow = true;
  scene.add(decal);

  // ---------------------------------------------------------------- picnic table
  const wood = '#c98a55';
  const top = 0.68; // a kid-sized table
  g.add(at(rbox(tableW, 0.09, tableD, wood, 0.04), 0, top - 0.1, 0));
  const cloth = canvasTexture(512, 512, (c, w) => {
    c.fillStyle = '#fffaf4';
    c.fillRect(0, 0, w, w);
    const n = 8;
    const s = w / n;
    c.fillStyle = 'rgba(239,91,111,.28)';
    for (let i = 0; i < n; i++) {
      c.fillRect(i * s, 0, s / 2, w);
      c.fillRect(0, i * s, w, s / 2);
    }
    c.fillStyle = 'rgba(239,91,111,.2)';
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) c.fillRect(i * s, j * s, s / 2, s / 2);
  });
  cloth.wrapS = cloth.wrapT = THREE.RepeatWrapping;
  cloth.repeat.set(tableW / 0.9, tableD / 0.9);
  const clothMesh = mesh(new THREE.BoxGeometry(tableW + 0.16, 0.05, tableD + 0.16), new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.9 }), { cast: false });
  g.add(at(clothMesh, 0, top - 0.025, 0));
  // Scalloped trim along the front and sides
  const trim = mat('#ef5b6f', { rough: 0.7 });
  const scallop = new THREE.SphereGeometry(0.06, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const nx = Math.round((tableW + 0.16) / 0.13);
  for (let i = 0; i <= nx; i++) {
    const x = -(tableW + 0.16) / 2 + (i * (tableW + 0.16)) / nx;
    g.add(at(mesh(scallop, trim, { cast: false }), x, top - 0.05, tableD / 2 + 0.08));
  }
  const nz = Math.round((tableD + 0.16) / 0.13);
  for (const sx of [-1, 1]) {
    for (let i = 0; i <= nz; i++) {
      const z = -(tableD + 0.16) / 2 + (i * (tableD + 0.16)) / nz;
      g.add(at(mesh(scallop, trim, { cast: false }), sx * (tableW / 2 + 0.08), top - 0.05, z));
    }
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = sx * (tableW / 2 - 0.25);
    const z = sz * (tableD / 2 - 0.25);
    g.add(at(cyl(0.07, 0.09, top - 0.15, shade(wood, 0.9), 12), x, (top - 0.15) / 2, z));
    g.add(at(ball(0.11, shade(wood, 0.8), {}, 12), x, 0.08, z));
  }
  for (const sx of [-1, 1]) g.add(at(rbox(0.09, 0.08, tableD - 0.5, shade(wood, 0.85), 0.03), sx * (tableW / 2 - 0.25), 0.3, 0));
  g.add(at(rbox(tableW - 0.5, 0.08, 0.09, shade(wood, 0.85), 0.03), 0, 0.3, 0));
  // A jar of flowers and a cup on the table corners would cover cards: keep them on the ground
  const jar = new THREE.Group();
  jar.add(at(cyl(0.12, 0.1, 0.24, '#bfe9f2', 14, { rough: 0.2 }), 0, 0.12, 0));
  const fr = rng(3);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    jar.add(at(cyl(0.008, 0.008, 0.28, '#4f9a45', 4), Math.cos(a) * 0.04, 0.36, Math.sin(a) * 0.04));
    jar.add(at(ball(0.05, ['#ff8fb1', '#ffd75e', '#ffffff', '#c7a6ff'][i % 4], { rough: 0.6 }, 8), Math.cos(a) * 0.07, 0.5 + fr() * 0.05, Math.sin(a) * 0.07));
  }
  jar.position.set(tableW / 2 + 0.55, 0, tableD / 2 - 0.2);
  g.add(jar);
  // Picnic basket with a checked napkin
  const basket = new THREE.Group();
  basket.add(at(rbox(0.62, 0.34, 0.42, '#d39a5c', 0.06), 0, 0.17, 0));
  for (let i = 0; i < 4; i++) basket.add(at(box(0.64, 0.025, 0.44, '#b97c41'), 0, 0.06 + i * 0.08, 0));
  basket.add(at(rbox(0.66, 0.05, 0.46, '#ef5b6f', 0.02), 0, 0.36, 0));
  const handle = mesh(new THREE.TorusGeometry(0.24, 0.025, 6, 18, Math.PI), mat('#b97c41'));
  basket.add(at(handle, 0, 0.36, 0));
  basket.add(at(ball(0.08, '#e5484d', { rough: 0.4 }, 10), 0.16, 0.42, 0.08));
  basket.add(at(cyl(0.01, 0.01, 0.06, '#5a8f3c', 4), 0.16, 0.52, 0.08));
  basket.position.set(-tableW / 2 - 0.2, 0, -tableD / 2 - 0.75);
  basket.rotation.y = -0.3;
  g.add(basket);

  // ---------------------------------------------------------------- fountain
  const stone = mat('#dfe7ea', { rough: 0.6 });
  const FX = -4.6;
  const FZ = -4.4;
  g.add(at(cyl(1.6, 1.75, 0.55, stone, 32), FX, 0.3, FZ));
  const waterMat = new THREE.MeshStandardMaterial({ color: '#7fd6e6', roughness: 0.15, emissive: '#3fb8d0', emissiveIntensity: 0.15 });
  g.add(at(mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.05, 32), waterMat, { cast: false }), FX, 0.56, FZ));
  g.add(at(cyl(0.22, 0.3, 1.2, stone, 16), FX, 1.0, FZ));
  g.add(at(cyl(0.75, 0.4, 0.25, stone, 24), FX, 1.6, FZ));
  g.add(at(ball(0.22, TEAL, { rough: 0.4 }), FX, 1.95, FZ));
  const coinR = rng(9);
  for (let i = 0; i < 8; i++) {
    const a = coinR() * Math.PI * 2;
    const rr = 0.5 + coinR() * 0.8;
    g.add(at(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 12), mat('#f4c24f', { metal: 0.7, rough: 0.3 }), { cast: false }), FX + Math.cos(a) * rr, 0.59, FZ + Math.sin(a) * rr));
  }
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: '#c9f3ff' }), 26);
  drops.frustumCulled = false;
  scene.add(drops);

  // ---------------------------------------------------------------- dance floor and speakers
  const DX = 4.2;
  const DZ = -4.6;
  const N = 4;
  const T = 0.75;
  const tileCols = ['#ff8fb1', '#ffd166', '#7fd3ff', '#b9a6ff', '#7fe0b0'].map((c) => new THREE.Color(c));
  const tiles = new THREE.InstancedMesh(new RoundedBoxGeometry(T - 0.05, 0.1, T - 0.05, 2, 0.03), umat('#ffffff', { rough: 0.3, emissive: '#ffffff', ei: 0.12 }), N * N);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) tiles.setMatrixAt(i * N + j, m4.makeTranslation(DX + (i - 1.5) * T, 0.1, DZ + (j - 1.5) * T));
  tiles.receiveShadow = true;
  scene.add(tiles);
  for (const sx of [DX - 1.95, DX + 1.95]) {
    g.add(at(rbox(0.6, 1.1, 0.5, '#3b2b3f', 0.06), sx, 0.6, DZ - 1.1));
    for (const [y, r] of [[0.8, 0.18], [0.38, 0.11]]) {
      const c = cyl(r, r, 0.04, '#8b8199', 16);
      c.rotation.x = Math.PI / 2;
      g.add(at(c, sx, y, DZ - 0.84));
    }
  }

  // ---------------------------------------------------------------- arcade kiosk
  const kiosk = new THREE.Group();
  kiosk.add(at(rbox(1.6, 2.0, 1.1, TEAL, 0.08), 0, 1.0, 0));
  const screenTex = canvasTexture(256, 192, (c, w, h) => {
    c.fillStyle = '#20203a';
    c.fillRect(0, 0, w, h);
    const cs = ['#ff8fb1', '#ffd166', '#7fd3ff', '#b9a6ff'];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      c.fillStyle = cs[(i + j) % 4];
      roundRect(c, 22 + i * 54, 22 + j * 52, 44, 42, 8);
      c.fill();
    }
  });
  kiosk.add(at(mesh(new THREE.PlaneGeometry(1.1, 0.8), new THREE.MeshStandardMaterial({ map: screenTex, emissive: '#ffffff', emissiveMap: screenTex, emissiveIntensity: 0.6 }), { cast: false }), 0, 1.35, 0.56));
  const label = canvasTexture(512, 128, (c, w, h) => {
    c.fillStyle = '#ffd166';
    roundRect(c, 4, 4, w - 8, h - 8, 40);
    c.fill();
    c.fillStyle = '#3b2b3f';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 ${h * 0.55}px ${FONT}`;
    c.fillText('ARCADE', w / 2, h / 2 + 4);
  });
  kiosk.add(at(mesh(new THREE.PlaneGeometry(1.4, 0.35), new THREE.MeshStandardMaterial({ map: label, roughness: 0.6 }), { cast: false }), 0, 2.25, 0.56));
  for (const [x, c] of [[-0.25, '#e5484d'], [0, '#ffd166'], [0.25, '#3f7bf0']]) kiosk.add(at(ball(0.06, c, { emissive: c, ei: 0.4 }, 10), x, 0.85, 0.6));
  kiosk.position.set(-0.4, 0, -6.6);
  kiosk.rotation.y = 0.12;
  g.add(kiosk);

  // ---------------------------------------------------------------- benches, balloons, lamps
  const bench = (x, z, ry) => {
    const b = new THREE.Group();
    b.add(at(rbox(1.8, 0.1, 0.5, '#b0703f', 0.04), 0, 0.45, 0));
    b.add(at(rbox(1.8, 0.4, 0.08, '#b0703f', 0.04), 0, 0.78, -0.22));
    for (const sx of [-0.75, 0.75]) b.add(at(rbox(0.1, 0.45, 0.45, '#5b4a66', 0.03), sx, 0.22, 0));
    b.position.set(x, 0, z);
    b.rotation.y = ry;
    g.add(b);
  };
  bench(-6.3, 1.2, Math.PI / 2 - 0.25);
  bench(6.3, 1.2, -Math.PI / 2 + 0.25);
  const balloons = new THREE.Group();
  const bcols = ['#ef5b6f', '#ffd166', '#7fd3ff', '#b9a6ff', '#ff9eb5'];
  bcols.forEach((c, i) => {
    const a = (i / bcols.length) * Math.PI * 2;
    const bx = Math.cos(a) * 0.26;
    const bz = Math.sin(a) * 0.2;
    const by = 1.9 + (i % 2) * 0.22;
    const bl = ball(0.24, c, { rough: 0.35 }, 16);
    bl.scale.set(1, 1.18, 1);
    balloons.add(at(bl, bx, by, bz));
    const len = Math.hypot(bx, by - 0.2, bz);
    const str = cyl(0.006, 0.006, len, '#ffffff', 4);
    str.position.set(bx / 2, (by + 0.2) / 2 - 0.12, bz / 2);
    str.lookAt(bx, by, bz);
    str.rotateX(Math.PI / 2);
    balloons.add(str);
  });
  balloons.position.set(6.2, 0.6, -0.2);
  scene.add(balloons);
  dynamic.push(balloons);
  bakeVC(balloons);
  // Beach ball on the grass
  const bb = new THREE.Group();
  ['#ef5b6f', '#ffffff', '#ffd166', '#ffffff', '#3f7bf0', '#ffffff'].forEach((c, i) => {
    const m = mesh(new THREE.SphereGeometry(0.35, 16, 12, (i / 6) * Math.PI * 2, Math.PI / 3), mat(c, { rough: 0.4 }));
    bb.add(m);
  });
  bb.position.set(tableW / 2 + 1.1, 0.35, tableD / 2 + 0.9);
  bb.rotation.set(0.4, 0.3, 0.2);
  g.add(bb);
  // Lamp posts with bunting between them
  const lamps = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = Math.cos(a) * 7.9;
    const z = Math.sin(a) * 7.9;
    if (z > 3) continue; // keep the front open for the camera
    g.add(at(cyl(0.06, 0.09, 2.6, '#5b4a66', 10), x, 1.3, z));
    g.add(at(ball(0.2, '#fff6d8', { emissive: '#ffe9a8', ei: 0.6 }, 14), x, 2.75, z));
    g.add(at(cone(0.24, 0.16, '#5b4a66', 12), x, 2.98, z));
    lamps.push(new THREE.Vector3(x, 2.5, z));
  }
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.15, 0, 0, 0.15, 0, 0, 0, -0.34, 0], 3));
  tri.computeVertexNormals();
  const flagCols = ['#ef5b6f', '#ffd166', '#7fd3a7', '#6fb8ff', '#ff9eb5', '#fffaf4'];
  for (let i = 0; i + 1 < lamps.length; i++) {
    const a = lamps[i];
    const b = lamps[i + 1];
    if (a.distanceTo(b) > 7) continue;
    const pt = (k) => new THREE.Vector3().lerpVectors(a, b, k).add(new THREE.Vector3(0, -Math.sin(k * Math.PI) * 0.45, 0));
    const pts = [];
    for (let k = 0; k <= 12; k++) pts.push(pt(k / 12));
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.015, 4), mat('#fffaf4'), { cast: false }));
    const dir = new THREE.Vector3().subVectors(b, a);
    const yaw = Math.atan2(dir.x, dir.z) - Math.PI / 2;
    for (let k = 0; k < 9; k++) {
      const f = mesh(tri, mat(flagCols[(k + i) % flagCols.length], { side: THREE.DoubleSide }), { cast: false });
      f.position.copy(pt((k + 0.5) / 9));
      f.rotation.y = yaw;
      g.add(f);
    }
  }
  // Play Park sign
  const signTex = canvasTexture(512, 160, (c, w, h) => {
    c.fillStyle = '#f7e2c4';
    roundRect(c, 0, 0, w, h, 30);
    c.fill();
    c.strokeStyle = '#c98a55';
    c.lineWidth = 9;
    roundRect(c, 10, 10, w - 20, h - 20, 22);
    c.stroke();
    c.fillStyle = '#7a4a26';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 70px ${FONT}`;
    c.fillText('Play Park', w / 2, h / 2 + 4);
  });
  const sign = new THREE.Group();
  for (const sx of [-0.85, 0.85]) sign.add(at(cyl(0.05, 0.05, 1.3, '#8b5e3c', 8), sx, 0.65, 0));
  sign.add(at(rbox(1.95, 0.62, 0.1, '#c98a55', 0.04), 0, 1.2, 0));
  sign.add(at(mesh(new THREE.PlaneGeometry(1.85, 0.56), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.8 }), { cast: false }), 0, 1.2, 0.055));
  sign.position.set(-6.6, 0, -2.4);
  sign.rotation.y = 0.9;
  g.add(sign);
  // Flower beds at the plaza edge
  const F = [];
  const r = rng(13);
  for (let i = 0; i < 260; i++) {
    const a = r() * Math.PI * 2;
    const d = 8.2 + r() * 1.4;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (z > 4) continue;
    F.push({ x, z, c: ['#ff8fb1', '#ffffff', '#ffd75e', '#c7a6ff', '#ff6b6b', '#ffb36b'][Math.floor(r() * 6)], h: 0.14 + r() * 0.12 });
  }
  flowerPatch(g, F);
  garden(g, {
    seed: 9,
    bounds: [-24, 24, -22, 16],
    free: (x, z, kind) => {
      const d = Math.hypot(x, z);
      if (d < 8.1) return false;
      if (kind === 'tree') return d > 10.5 && !(z > 2 && Math.abs(x) < 9);
      if (kind === 'bush') return d > 9.2 && z < 6;
      return true;
    },
    trees: 30,
    bushes: 26,
    flowers: 260,
    tufts: 320,
  });
  clouds(g, { radius: 70 });
  bakeVC(g);

  const dv = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const q = new THREE.Quaternion();
  const c = new THREE.Color();
  let beat = -1;
  return {
    top,
    update(dt, t) {
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        const k = (t * 0.7 + (i * 0.37) % 1) % 1;
        const rr = 0.25 + k * 0.6;
        dv.set(FX + Math.cos(a) * rr, 1.75 + Math.sin(k * Math.PI) * 0.35 - k * 1.05, FZ + Math.sin(a) * rr);
        drops.setMatrixAt(i, m4.compose(dv, q, one));
      }
      drops.instanceMatrix.needsUpdate = true;
      const b = Math.floor(t * 2.2);
      if (b !== beat) {
        beat = b;
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) tiles.setColorAt(i * N + j, c.copy(tileCols[(i + j + b) % tileCols.length]));
        tiles.instanceColor.needsUpdate = true;
      }
      balloons.rotation.z = Math.sin(t * 0.9) * 0.05;
      balloons.rotation.x = Math.sin(t * 0.7 + 1) * 0.04;
    },
  };
}
