import * as THREE from 'three';
import { kit, colorBake, fitText, roundRect, canvasTexture, FONT, heartPath, glowTexture, mergeGeometries } from '../../places/school/kit.js';
import { mat, mesh, rng } from '../../util.js';
import * as K from '../riding/kit.js';

// The bumper car tent: a sparky tiled floor with padded rails and rounded corners, the ceiling grid
// the car poles touch, a striped circus tent with bulb garlands, bleachers with a cheering crowd,
// a big scoreboard, two beach ball goals (shown in the ball round) and a floor glow layer that
// lights the tiles under the cars and can switch the outer tiles off.

export const HW = 10.5; // floor half width (x)
export const HD = 7; // floor half depth (z)
export const RC = 2.6; // corner radius of the floor
export const GRID_Y = 4.4; // the ceiling grid the poles touch
export const GOAL = { x: HW - 1.25, hz: 1.9 }; // a ball whose centre is past x scores
const RX = 17; // tent radius along x
const RZ = 13.6; // and along z
const WALL_H = 6.2;
const ROOF_H = 9;

// Push a circle of radius r at (x, z) back inside the rounded floor. Returns null or { pen, nx, nz } (inward normal).
export function wallHit(x, z, r) {
  const ax = HW - RC;
  const az = HD - RC;
  const qx = Math.abs(x) - ax;
  const qz = Math.abs(z) - az;
  if (qx > 0 && qz > 0) {
    const d = Math.hypot(qx, qz);
    const lim = RC - r;
    if (d <= lim) return null;
    return { pen: d - lim, nx: (-Math.sign(x) * qx) / d, nz: (-Math.sign(z) * qz) / d };
  }
  if (Math.abs(x) > HW - r) return { pen: Math.abs(x) - (HW - r), nx: -Math.sign(x), nz: 0 };
  if (Math.abs(z) > HD - r) return { pen: Math.abs(z) - (HD - r), nx: 0, nz: -Math.sign(z) };
  return null;
}

// How far a point is inside the floor edge (negative outside).
export function inset(x, z) {
  const ax = HW - RC;
  const az = HD - RC;
  const qx = Math.abs(x) - ax;
  const qz = Math.abs(z) - az;
  if (qx > 0 && qz > 0) return RC - Math.hypot(qx, qz);
  return Math.min(HW - Math.abs(x), HD - Math.abs(z));
}

// A dense loop of points round the rounded rectangle, grown by `off`, with arc lengths.
function rim(off = 0, step = 0.1) {
  const pts = [];
  const ax = HW - RC;
  const az = HD - RC;
  const r = RC + off;
  const corners = [
    [ax, az, 0],
    [-ax, az, Math.PI / 2],
    [-ax, -az, Math.PI],
    [ax, -az, Math.PI * 1.5],
  ];
  // anticlockwise seen from above: start on the right edge
  for (const [cx, cz, a0] of corners) {
    const n = Math.max(4, Math.round((r * Math.PI) / 2 / step));
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cz + Math.sin(a) * r));
    }
  }
  pts.push(pts[0].clone());
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const L = len[len.length - 1];
  const at = (s) => {
    s = ((s % L) + L) % L;
    let i = 1;
    while (i < len.length - 1 && len[i] < s) i++;
    const k = (s - len[i - 1]) / Math.max(1e-6, len[i] - len[i - 1]);
    const a = pts[i - 1];
    const b = pts[i];
    return { x: a.x + (b.x - a.x) * k, z: a.y + (b.y - a.y) * k, yaw: Math.atan2(b.x - a.x, b.y - a.y) };
  };
  return { pts, L, at };
}

function roundedShape(hw, hd, r) {
  const s = new THREE.Shape();
  s.moveTo(-hw + r, -hd);
  s.lineTo(hw - r, -hd);
  s.quadraticCurveTo(hw, -hd, hw, -hd + r);
  s.lineTo(hw, hd - r);
  s.quadraticCurveTo(hw, hd, hw - r, hd);
  s.lineTo(-hw + r, hd);
  s.quadraticCurveTo(-hw, hd, -hw, hd - r);
  s.lineTo(-hw, -hd + r);
  s.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
  return s;
}

function stripeTex(a, b, n, w = 512, h = 64) {
  const t = canvasTexture(w, h, (c) => {
    for (let i = 0; i < n; i++) {
      c.fillStyle = i % 2 ? b : a;
      c.fillRect((i * w) / n, 0, w / n + 1, h);
    }
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

export function buildScene(ctx) {
  const { scene } = ctx;
  const k = kit();
  const world = new THREE.Group();
  scene.add(world);
  const statics = new THREE.Group();
  world.add(statics);
  const dynamic = [];

  // ------------------------------------------------------------ the ground round the floor (sawdust boards)
  const boards = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#e8c79a';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? '#e2bf90' : '#ecd0a6';
      c.fillRect(0, i * 32, w, 30);
      c.fillStyle = 'rgba(150,100,60,.25)';
      c.fillRect(((i * 97) % 200) + 20, i * 32 + 4, 3, 22);
    }
  });
  boards.wrapS = boards.wrapT = THREE.RepeatWrapping;
  boards.repeat.set(14, 14);
  const ground = mesh(new THREE.CircleGeometry(1, 56), new THREE.MeshStandardMaterial({ map: boards, roughness: 0.9 }), { cast: false });
  ground.scale.set(RX + 14, RZ + 14, 1);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  world.add(ground);

  // ------------------------------------------------------------ the sparky floor
  const floorTex = canvasTexture(512, 512, (c, w, h) => {
    const s = w / 2;
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        c.fillStyle = (i + j) % 2 ? '#6a7fb8' : '#5b6fa8';
        c.fillRect(i * s, j * s, s, s);
      }
    }
    c.strokeStyle = 'rgba(205,215,255,.55)';
    c.lineWidth = 5;
    for (let i = 0; i <= 2; i++) {
      c.beginPath();
      c.moveTo(i * s, 0);
      c.lineTo(i * s, h);
      c.moveTo(0, i * s);
      c.lineTo(w, i * s);
      c.stroke();
    }
    // little sparkles in the metal
    const r2 = rng(5);
    for (let i = 0; i < 26; i++) {
      const x = r2() * w;
      const y = r2() * h;
      const big = r2() < 0.25;
      c.fillStyle = big ? 'rgba(255,233,160,.95)' : 'rgba(255,255,255,.7)';
      c.beginPath();
      const R2 = big ? 7 : 3;
      for (let p = 0; p < 8; p++) {
        const a = (p / 8) * Math.PI * 2;
        const rr = p % 2 ? R2 * 0.35 : R2;
        c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      c.fill();
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(0.5, 0.5);
  floorTex.offset.set(0.25, 0);
  floorTex.anisotropy = 4;
  const floorGeo = new THREE.ShapeGeometry(roundedShape(HW + 0.05, HD + 0.05, RC + 0.05), 6);
  floorGeo.rotateX(-Math.PI / 2);
  const floor = mesh(floorGeo, new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.38, metalness: 0.35 }), { cast: false });
  floor.position.y = 0.004;
  world.add(floor);
  // the floor's edge plate under the rails
  const edgeGeo = new THREE.ShapeGeometry(roundedShape(HW + 0.9, HD + 0.9, RC + 0.9), 6);
  edgeGeo.rotateX(-Math.PI / 2);
  const edge = mesh(edgeGeo, mat('#3f4a7a', { rough: 0.6 }), { cast: false });
  edge.position.y = -0.005;
  statics.add(edge);
  // Easter egg: one tile near the back left corner has a tiny heart with R and H on it
  const eggTex = canvasTexture(128, 128, (c) => {
    c.fillStyle = 'rgba(255,170,200,.75)';
    heartPath(c, 64, 70, 60);
    c.fill();
    c.fillStyle = '#ffffff';
    c.font = `700 26px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('R+H', 64, 62);
  });
  const egg = mesh(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshBasicMaterial({ map: eggTex, transparent: true, depthWrite: false, opacity: 0.8 }), { cast: false, receive: false });
  egg.rotation.x = -Math.PI / 2;
  egg.position.set(-HW + 3.5, 0.009, -HD + 1.5);
  world.add(egg);

  // ------------------------------------------------------------ floor glow: tiles light up under the cars
  const NX = HW * 2;
  const NZ = HD * 2;
  const cells = new Uint8Array(NX * NZ * 4);
  const cellTex = new THREE.DataTexture(cells, NX, NZ, THREE.RGBAFormat);
  cellTex.magFilter = cellTex.minFilter = THREE.NearestFilter;
  cellTex.colorSpace = THREE.SRGBColorSpace;
  cellTex.needsUpdate = true;
  const maskTex = canvasTexture(64, 64, (c) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#fff';
    roundRect(c, 5, 5, 54, 54, 12);
    c.fill();
  });
  maskTex.colorSpace = THREE.NoColorSpace;
  maskTex.wrapS = maskTex.wrapT = THREE.RepeatWrapping;
  maskTex.repeat.set(NX, NZ);
  const glowMat = new THREE.MeshBasicMaterial({ map: cellTex, alphaMap: maskTex, transparent: true, depthWrite: false });
  const glowPlane = mesh(new THREE.PlaneGeometry(NX, NZ), glowMat, { cast: false, receive: false });
  glowPlane.rotation.x = -Math.PI / 2;
  glowPlane.position.y = 0.012;
  glowPlane.renderOrder = 1;
  world.add(glowPlane);
  const heat = new Float32Array(NX * NZ);
  const tint = new Float32Array(NX * NZ * 3);
  const dark = new Float32Array(NX * NZ); // 0 lit .. 1 switched off
  const cellInside = new Uint8Array(NX * NZ);
  for (let ix = 0; ix < NX; ix++) for (let iz = 0; iz < NZ; iz++) cellInside[iz * NX + ix] = inset(ix + 0.5 - HW, HD - iz - 0.5) > 0.35 ? 1 : 0;
  const tc = new THREE.Color();
  const floorFx = {
    // light the tile under a point with a colour
    mark(x, z, color, k = 1) {
      const ix = Math.floor(x + HW);
      const iz = Math.floor(HD - z);
      if (ix < 0 || iz < 0 || ix >= NX || iz >= NZ) return;
      const i = iz * NX + ix;
      if (heat[i] > k) return;
      tc.set(color);
      heat[i] = k;
      tint[i * 3] = tc.r;
      tint[i * 3 + 1] = tc.g;
      tint[i * 3 + 2] = tc.b;
    },
    // switch off every tile further out than `keep` metres from the floor edge inwards (0 = all lit)
    darkAt: 0,
    isDark(x, z) {
      return this.darkAt > 0 && inset(x, z) < this.darkAt;
    },
    flash(color) {
      tc.set(color);
      for (let i = 0; i < NX * NZ; i++) {
        if (!cellInside[i]) continue;
        heat[i] = Math.max(heat[i], 0.55 + Math.random() * 0.3);
        tint[i * 3] = tc.r;
        tint[i * 3 + 1] = tc.g;
        tint[i * 3 + 2] = tc.b;
      }
    },
    update(dt, t) {
      for (let ix = 0; ix < NX; ix++) {
        for (let iz = 0; iz < NZ; iz++) {
          const i = iz * NX + ix;
          heat[i] *= Math.exp(-1.7 * dt);
          const off = this.darkAt > 0 && inset(ix + 0.5 - HW, HD - iz - 0.5) < this.darkAt ? 1 : 0;
          dark[i] += (off - dark[i]) * Math.min(1, dt * 4);
          const h = cellInside[i] ? heat[i] : 0;
          const d = cellInside[i] ? dark[i] : 0;
          // a slow twinkle on a few tiles so the floor always sparkles a little
          const tw = cellInside[i] ? Math.max(0, Math.sin(t * 1.3 + ix * 2.1 + iz * 3.7) - 0.93) * 4 : 0;
          const o = i * 4;
          const lit = Math.min(1, h + tw * 0.5);
          const r = tint[i * 3] * h + tw * 1.0;
          const g = tint[i * 3 + 1] * h + tw * 0.9;
          const b = tint[i * 3 + 2] * h + tw * 0.6;
          const m = Math.max(1e-3, h + tw);
          cells[o] = Math.min(255, ((r / m) * (1 - d) + 0.07 * d) * 255);
          cells[o + 1] = Math.min(255, ((g / m) * (1 - d) + 0.08 * d) * 255);
          cells[o + 2] = Math.min(255, ((b / m) * (1 - d) + 0.2 * d) * 255);
          cells[o + 3] = Math.min(255, (lit * 0.6 * (1 - d) + d * 0.72) * 255);
        }
      }
      cellTex.needsUpdate = true;
    },
  };

  // ------------------------------------------------------------ padded rails, they squash when hit
  const railLoop = rim(0.32, 0.08);
  const SEG = 1.5;
  const nSeg = Math.floor(railLoop.L / SEG);
  const segLen = railLoop.L / nSeg;
  const railGeo = new THREE.CapsuleGeometry(0.3, segLen - 0.56, 3, 10);
  railGeo.rotateX(Math.PI / 2);
  const rails = new THREE.InstancedMesh(railGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55 }), nSeg);
  rails.castShadow = true;
  rails.receiveShadow = true;
  const railCols = ['#ff9eb5', '#8fd3ff', '#ffd166', '#c7a6ff'];
  const railAt = [];
  const squish = new Float32Array(nSeg);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const Y = new THREE.Vector3(0, 1, 0);
  const sv = new THREE.Vector3();
  const pv = new THREE.Vector3();
  const setRail = (i) => {
    const r = railAt[i];
    const s = squish[i];
    q.setFromAxisAngle(Y, r.yaw);
    rails.setMatrixAt(i, m4.compose(pv.set(r.x - r.nx * s * 0.12, 0.36 - s * 0.06, r.z - r.nz * s * 0.12), q, sv.set(1 + s * 0.3, 1 - s * 0.3, 1)));
  };
  for (let i = 0; i < nSeg; i++) {
    const p = railLoop.at((i + 0.5) * segLen);
    railAt.push({ ...p, nx: Math.cos(p.yaw), nz: -Math.sin(p.yaw) });
    rails.setColorAt(i, tc.set(railCols[i % railCols.length]));
    setRail(i);
  }
  // the outward normal of a segment points away from the floor: fix its sign
  for (const r of railAt) {
    if (r.nx * r.x + r.nz * r.z < 0) {
      r.nx = -r.nx;
      r.nz = -r.nz;
    }
  }
  world.add(rails);
  dynamic.push(rails);
  const railBase = rim(0.32, 0.25);
  for (let i = 0; i < nSeg; i++) {
    const p = railBase.at((i + 0.5) * segLen);
    const b = k.box(0.5, 0.12, segLen + 0.02, '#3f4a7a');
    b.position.set(p.x, 0.06, p.z);
    b.rotation.y = p.yaw;
    statics.add(b);
  }
  const rails$ = {
    hit(x, z, k2 = 1) {
      let best = -1;
      let bd = 1e9;
      for (let i = 0; i < nSeg; i++) {
        const d = (railAt[i].x - x) ** 2 + (railAt[i].z - z) ** 2;
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      if (best >= 0) {
        squish[best] = Math.max(squish[best], Math.min(1, k2));
        const n = (best + 1) % nSeg;
        const p = (best - 1 + nSeg) % nSeg;
        squish[n] = Math.max(squish[n], Math.min(1, k2) * 0.5);
        squish[p] = Math.max(squish[p], Math.min(1, k2) * 0.5);
      }
    },
    update(dt) {
      let any = false;
      for (let i = 0; i < nSeg; i++) {
        if (squish[i] <= 0) continue;
        squish[i] = Math.max(0, squish[i] - dt * 3);
        setRail(i);
        any = true;
      }
      if (any) rails.instanceMatrix.needsUpdate = true;
    },
  };

  // ------------------------------------------------------------ the ceiling grid
  const gridGeos = [];
  const bar = (w, d, x, z) => {
    const g = new THREE.BoxGeometry(w, 0.035, d);
    g.translate(x, GRID_Y + 0.05, z);
    gridGeos.push(g);
  };
  for (let x = -HW; x <= HW + 0.01; x += 1.5) bar(0.035, HD * 2 + 1.4, x, 0);
  for (let z = -HD; z <= HD + 0.01; z += 1.5) bar(HW * 2 + 1.4, 0.035, 0, z);
  const gridMesh = mesh(mergeGeometries(gridGeos, false), new THREE.MeshStandardMaterial({ color: '#dfe6ff', emissive: '#8fa3ff', emissiveIntensity: 0.25, roughness: 0.4, metalness: 0.5, transparent: true, opacity: 0.42, depthWrite: false }), { cast: false, receive: false });
  gridMesh.renderOrder = 3;
  world.add(gridMesh);
  // its frame: cream beams with lilac drapes, held up by navy posts
  const frameLoop = rim(1.0, 0.25);
  const nf = Math.floor(frameLoop.L / 1.2);
  // the frame runs round the back and the sides; the front stays open for the camera
  const front = (p) => p.z > HD - RC + 0.4;
  for (let i = 0; i < nf; i++) {
    const p = frameLoop.at((i + 0.5) * (frameLoop.L / nf));
    if (front(p)) continue;
    const b = k.box(0.24, 0.24, frameLoop.L / nf + 0.03, '#fff4e3');
    b.position.set(p.x, GRID_Y + 0.12, p.z);
    b.rotation.y = p.yaw;
    statics.add(b);
  }
  const postSpots = [];
  // posts at the back and the sides only, so nothing stands between the camera and the floor
  for (const sx of [-1, 1]) postSpots.push([sx * (HW + 0.95), HD - 1.6], [sx * (HW + 0.95), -HD + 1.6], [sx * (HW - 4.2), -HD - 0.95]);
  postSpots.push([0, -HD - 0.95]);
  for (const [x, z] of postSpots) {
    statics.add(k.at(k.cyl(0.13, 0.16, GRID_Y + 0.2, '#3f4a7a', 10), x, (GRID_Y + 0.2) / 2, z));
    statics.add(k.at(k.sph(0.19, '#f4c24f', undefined, 10), x, GRID_Y + 0.36, z));
  }

  // ------------------------------------------------------------ the tent
  const wallTex = stripeTex('#ff9eb5', '#fff4e3', 2, 128, 16);
  wallTex.repeat.set(30, 1);
  const wall = mesh(new THREE.CylinderGeometry(1, 1, WALL_H, 60, 1, true), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85, side: THREE.BackSide }), { cast: false });
  wall.scale.set(RX, 1, RZ);
  wall.position.y = WALL_H / 2;
  world.add(wall);
  const roofTex = stripeTex('#c7a6ff', '#fff4e3', 2, 128, 16);
  roofTex.repeat.set(30, 1);
  const roof = mesh(new THREE.ConeGeometry(1, ROOF_H, 60, 1, true), new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.85, side: THREE.BackSide }), { cast: false });
  roof.scale.set(RX + 0.3, 1, RZ + 0.3);
  roof.position.y = WALL_H + ROOF_H / 2;
  world.add(roof);
  // scalloped valance round the top of the wall
  const valTex = canvasTexture(256, 64, (c, w, h) => {
    for (let i = 0; i < 4; i++) {
      c.fillStyle = i % 2 ? '#ffd166' : '#ef5b6f';
      c.beginPath();
      c.moveTo((i * w) / 4, 0);
      c.lineTo(((i + 1) * w) / 4, 0);
      c.lineTo(((i + 1) * w) / 4, h * 0.45);
      c.arc(((i + 0.5) * w) / 4, h * 0.45, w / 8, 0, Math.PI);
      c.closePath();
      c.fill();
    }
  });
  valTex.wrapS = THREE.RepeatWrapping;
  valTex.repeat.set(40, 1);
  const valMat = new THREE.MeshStandardMaterial({ map: valTex, roughness: 0.8, side: THREE.BackSide, alphaTest: 0.5, transparent: false });
  valTex.format = THREE.RGBAFormat;
  const val = mesh(new THREE.CylinderGeometry(0.985, 0.985, 0.9, 60, 1, true), valMat, { cast: false });
  val.scale.set(RX, 1, RZ);
  val.position.y = WALL_H - 0.45;
  world.add(val);
  // bulb garlands from the crown down to the wall, and a ring along the grid frame
  const bulbPts = [];
  const bulbCols = [];
  const BC = ['#fff3c4', '#ffd1dc', '#c7e9ff', '#ffe08a'];
  // garlands only over the back half of the tent, so none hang between the camera and the floor
  for (let m = 0; m < 9; m++) {
    const a = Math.PI + 0.12 + (m / 8) * (Math.PI - 0.24);
    const line = [];
    for (let i = 0; i <= 11; i++) {
      const u = 0.04 + (i / 11) * 0.96;
      const sag = Math.sin(u * Math.PI) * 0.9;
      const p = new THREE.Vector3(Math.cos(a) * RX * 0.97 * u, WALL_H + ROOF_H * (1 - u) - 0.6 - sag, Math.sin(a) * RZ * 0.97 * u);
      line.push(p);
      if (i > 0 && i < 11) {
        bulbPts.push(p.clone().setY(p.y - 0.08));
        bulbCols.push(BC[(i + m) % BC.length]);
      }
    }
    statics.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(line), 22, 0.014, 3), mat('#5a4a52'), { cast: false, receive: false }));
  }
  const nfB = 64;
  for (let i = 0; i < nfB; i++) {
    const p = frameLoop.at((i / nfB) * frameLoop.L);
    if (front(p)) continue;
    bulbPts.push(new THREE.Vector3(p.x, GRID_Y + 0.3, p.z));
    bulbCols.push(BC[i % BC.length]);
  }
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), bulbPts.length);
  bulbPts.forEach((p, i) => {
    bulbs.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z));
    bulbs.setColorAt(i, tc.set(bulbCols[i]));
  });
  world.add(bulbs);
  dynamic.push(bulbs);
  const bulbBase = bulbCols.map((c) => new THREE.Color(c));
  // the crown at the top: a big star
  const crown = new THREE.Group();
  crown.add(k.at(k.cyl(0.9, 0.9, 0.5, '#f4c24f', 20), 0, 0, 0));
  const star = k.star(1.0, 0.45, 0.25, '#ffd166', { emissive: '#ffb347', ei: 0.5 });
  star.position.y = -1.0;
  crown.add(star);
  crown.traverse((o) => (o.castShadow = false));
  crown.position.set(0, WALL_H + ROOF_H - 1.6, 0);
  world.add(crown);
  dynamic.push(crown);

  // ------------------------------------------------------------ bleachers and the crowd at the back
  const fans = [];
  const kinds = ['cheer', 'wave', 'clap', 'flag', 'cheer', 'clap', 'wave'];
  const flagCols = ['#ffd166', '#ef5b6f', '#8fd3ff', '#7fd8bf', '#ff9eb5'];
  const rows = [
    { z: -HD - 2.0, top: 0.45 },
    { z: -HD - 3.0, top: 0.9 },
    { z: -HD - 4.0, top: 1.35 },
  ];
  rows.forEach((row, ri) => {
    statics.add(k.at(k.box(15, row.top, 1.0, ri % 2 ? '#d4a373' : '#e0b484'), 0, row.top / 2, row.z));
    statics.add(k.at(k.box(15.04, 0.06, 1.02, ri % 2 ? '#ff9eb5' : '#8fd3ff'), 0, row.top + 0.03, row.z + 0.02));
  });
  let fi = 0;
  const fanR = rng(31);
  rows.forEach((row, ri) => {
    for (let x = -6.6 + (ri % 2) * 0.9; x < 6.8; x += 1.7 + fanR() * 0.5) {
      if (ri === 0 && Math.abs(x) < 1.2) continue;
      const kid = ctx.makeKid(K.randomLook(fanR, fi + 40));
      kid.root.position.set(x, row.top + 0.03, row.z + 0.05);
      kid.root.rotation.y = (fanR() - 0.5) * 0.4;
      K.poseFan(kid, kinds[fi % kinds.length], flagCols[fi % flagCols.length]);
      kid.root.traverse((o) => {
        if (o.isMesh && o.material.map && o.material.color) o.material = mat('#' + o.material.color.getHexString(), { rough: 0.45 });
      });
      fans.push({ kid });
      fi++;
    }
  });
  const crowd = K.makeCrowd(fans);
  crowd.mesh.castShadow = false;
  world.add(crowd.mesh);
  dynamic.push(crowd.mesh);
  // side bleachers, empty and cosy with cushions and balloons
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const b = k.box(0.9, 0.45 + i * 0.45, 6, i % 2 ? '#d4a373' : '#e0b484');
      b.position.set(sx * (HW + 2.1 + i * 0.95), (0.45 + i * 0.45) / 2, 0);
      statics.add(b);
    }
    for (let j = 0; j < 5; j++) {
      const c = ['#ff9eb5', '#ffd166', '#8fd3ff', '#7fd8bf', '#c7a6ff'][(j + (sx > 0 ? 2 : 0)) % 5];
      const bl = k.sph(0.32, c, { rough: 0.35 }, 12);
      bl.scale.set(1, 1.18, 1);
      bl.position.set(sx * (HW + 3.6) + Math.sin(j * 2.1) * 0.4, 2.4 + (j % 3) * 0.45, -2.6 + j * 1.3);
      statics.add(bl);
      statics.add(k.at(k.cyl(0.006, 0.006, 1.6, '#7a6470', 4), bl.position.x, bl.position.y - 1.1, bl.position.z));
    }
  }

  // ------------------------------------------------------------ the scoreboard above the bleachers
  const SBW = 1024;
  const SBH = 384;
  const sbCanvas = document.createElement('canvas');
  sbCanvas.width = SBW;
  sbCanvas.height = SBH;
  const sbTex = new THREE.CanvasTexture(sbCanvas);
  sbTex.colorSpace = THREE.SRGBColorSpace;
  sbTex.anisotropy = 4;
  const board = mesh(new THREE.PlaneGeometry(7.2, 2.7), new THREE.MeshBasicMaterial({ map: sbTex, toneMapped: false }), { cast: false, receive: false });
  board.position.set(0, 3.6, -HD - 4.85);
  world.add(board);
  statics.add(k.at(k.rbox(7.6, 3.1, 0.25, '#9b7be0', 0.08), 0, 3.6, -HD - 5.02));
  for (const s of [-1, 1]) statics.add(k.at(k.cyl(0.12, 0.14, 3.6, '#3f4a7a', 10), s * 3.4, 1.8, -HD - 5.1));
  const sbBulbs = [];
  for (let i = 0; i < 26; i++) {
    const u = i / 25;
    sbBulbs.push(new THREE.Vector3(-3.75 + u * 7.5, 5.12, -HD - 4.88), new THREE.Vector3(-3.75 + u * 7.5, 2.08, -HD - 4.88));
  }
  const sbB = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff3c4' }), sbBulbs.length);
  sbBulbs.forEach((p, i) => sbB.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z)));
  world.add(sbB);
  const drawBoard = ({ title = 'Bumper Cars', sub = '', rows: list = [], time = '' } = {}) => {
    const c = sbCanvas.getContext('2d');
    c.fillStyle = '#2b2350';
    c.fillRect(0, 0, SBW, SBH);
    c.fillStyle = '#3a3068';
    roundRect(c, 16, 16, SBW - 32, SBH - 32, 28);
    c.fill();
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.fillStyle = '#ffd166';
    c.font = `700 58px ${FONT}`;
    fitText(c, title, 48, 70, 600, 58, 700);
    c.textAlign = 'right';
    c.fillStyle = '#ffffff';
    c.font = `700 64px ${FONT}`;
    c.fillText(time, SBW - 48, 72);
    c.textAlign = 'left';
    c.fillStyle = '#c7b8ff';
    c.font = `500 30px ${FONT}`;
    c.fillText(sub, 50, 124);
    const cols = list.length > 3 ? 2 : 1;
    list.slice(0, 6).forEach((r, i) => {
      const col = cols === 2 ? i % 2 : 0;
      const row = cols === 2 ? Math.floor(i / 2) : i;
      const x = 52 + col * 470;
      const y = 186 + row * 64;
      c.fillStyle = r.color;
      roundRect(c, x, y - 22, 44, 44, 12);
      c.fill();
      c.fillStyle = r.out ? '#8f86b8' : '#ffffff';
      c.font = `600 40px ${FONT}`;
      c.textAlign = 'left';
      c.fillText(r.name, x + 60, y + 2);
      c.textAlign = 'right';
      c.fillStyle = r.out ? '#8f86b8' : '#ffd166';
      c.fillText(String(r.score), x + 420, y + 2);
    });
    sbTex.needsUpdate = true;
  };
  drawBoard({ sub: 'Tonight in Roji Land' });

  // ------------------------------------------------------------ a big sign and the mascot banners on the back wall
  const signTex = canvasTexture(1024, 256, (c, w, h) => {
    c.fillStyle = '#ef5b6f';
    roundRect(c, 8, 8, w - 16, h - 16, 110);
    c.fill();
    c.lineWidth = 14;
    c.strokeStyle = '#ffd166';
    c.stroke();
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Roji Land Bumper Cars', w / 2, h / 2 + 6, w * 0.86, 120, 700);
  });
  const sign = mesh(new THREE.PlaneGeometry(6.4, 1.6), new THREE.MeshBasicMaterial({ map: signTex, transparent: true, toneMapped: false }), { cast: false, receive: false });
  sign.position.set(0, 6.7, -HD - 5.6);
  world.add(sign);
  const banner = (kind) =>
    canvasTexture(256, 384, (c, w, h) => {
      c.fillStyle = kind === 'bunny' ? '#ffd1dc' : '#cfe6ff';
      roundRect(c, 6, 6, w - 12, h - 12, 30);
      c.fill();
      c.fillStyle = kind === 'bunny' ? '#ffb3cc' : '#7fb8f0';
      if (kind === 'bunny') {
        for (const s of [-1, 1]) {
          c.beginPath();
          c.ellipse(w / 2 + s * 34, 110, 20, 62, s * 0.15, 0, Math.PI * 2);
          c.fill();
        }
      } else {
        for (const s of [-1, 1]) {
          c.beginPath();
          c.arc(w / 2 + s * 62, 160, 28, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.beginPath();
      c.arc(w / 2, 206, 74, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#2a1f2e';
      for (const s of [-1, 1]) {
        c.beginPath();
        c.arc(w / 2 + s * 26, 196, 9, 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = '#2a1f2e';
      c.lineWidth = 5;
      c.beginPath();
      c.arc(w / 2, 222, 16, 0.2, Math.PI - 0.2);
      c.stroke();
      if (kind === 'bear') {
        c.fillStyle = '#ef5b6f';
        c.beginPath();
        c.moveTo(w / 2, 292);
        c.lineTo(w / 2 - 30, 276);
        c.lineTo(w / 2 - 30, 308);
        c.moveTo(w / 2, 292);
        c.lineTo(w / 2 + 30, 276);
        c.lineTo(w / 2 + 30, 308);
        c.fill();
      }
      c.fillStyle = '#3b2b3f';
      c.font = `700 46px ${FONT}`;
      c.textAlign = 'center';
      c.fillText(kind === 'bunny' ? 'Mimi' : 'Bobo', w / 2, h - 40);
    });
  for (const [kind, x] of [['bunny', -6.4], ['bear', 6.4]]) {
    const b = mesh(new THREE.PlaneGeometry(1.7, 2.55), new THREE.MeshBasicMaterial({ map: banner(kind), transparent: true }), { cast: false, receive: false });
    b.position.set(x, 4.3, -HD - 5.1);
    world.add(b);
  }
  // bunting along the back
  K.bunting(statics, new THREE.Vector3(-HW - 1, GRID_Y + 0.05, -HD - 1), new THREE.Vector3(HW + 1, GRID_Y + 0.05, -HD - 1), { n: 22, sag: 0.5, size: 0.34 });

  // ------------------------------------------------------------ the two beach ball goals
  const goals = [];
  for (const side of [-1, 1]) {
    const g = new THREE.Group();
    const col = side < 0 ? '#ff9eb5' : '#7fd8bf';
    for (const s of [-1, 1]) g.add(k.at(k.cyl(0.11, 0.11, 2.1, '#fff4e3', 10), 0, 1.05, s * GOAL.hz));
    const arch = k.tor(GOAL.hz, 0.12, col, Math.PI, undefined, 22, 6);
    arch.rotation.y = Math.PI / 2;
    arch.position.y = 2.1;
    g.add(arch);
    const netTex = canvasTexture(128, 128, (c) => {
      c.strokeStyle = '#ffffff';
      c.lineWidth = 4;
      for (let i = 0; i <= 8; i++) {
        c.beginPath();
        c.moveTo(i * 16, 0);
        c.lineTo(i * 16, 128);
        c.moveTo(0, i * 16);
        c.lineTo(128, i * 16);
        c.stroke();
      }
    });
    netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping;
    netTex.repeat.set(3, 2);
    const net = mesh(new THREE.PlaneGeometry(GOAL.hz * 2, 2.1), new THREE.MeshBasicMaterial({ map: netTex, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }), { cast: false, receive: false });
    net.rotation.y = Math.PI / 2;
    net.position.set(side * 0.55, 1.05, 0);
    g.add(net);
    const lineTex = canvasTexture(64, 256, (c, w, h) => {
      c.fillStyle = col;
      c.globalAlpha = 0.55;
      c.fillRect(0, 0, w, h);
      c.globalAlpha = 1;
      c.fillStyle = '#ffffff';
      for (let i = 0; i < 8; i++) c.fillRect(0, i * 32 + 6, 10, 20);
    });
    const mouth = mesh(new THREE.PlaneGeometry(1.25, GOAL.hz * 2), new THREE.MeshBasicMaterial({ map: lineTex, transparent: true, depthWrite: false }), { cast: false, receive: false });
    mouth.rotation.x = -Math.PI / 2;
    if (side > 0) mouth.rotation.z = Math.PI;
    mouth.position.set(side * -0.15, 0.015, 0);
    mouth.renderOrder = 2;
    g.add(mouth);
    const gb = [];
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI;
      gb.push(new THREE.Vector3(0, 2.1 + Math.sin(a) * GOAL.hz, Math.cos(a) * GOAL.hz));
    }
    const glights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), gb.length);
    gb.forEach((p, i) => {
      glights.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z));
      glights.setColorAt(i, tc.set(i % 2 ? '#fff3c4' : col));
    });
    g.add(glights);
    colorBake(g);
    g.position.set(side * (HW - 0.55), 0, 0);
    g.visible = false;
    world.add(g);
    dynamic.push(g);
    goals.push({ side, group: g, color: col, flash: 0, lights: glights, arch });
  }

  colorBake(statics);

  // a soft glow texture shared by the effects
  const glow = glowTexture();
  let bulbT = 0;
  return {
    world,
    floor,
    floorFx,
    rails: rails$,
    crowd,
    goals,
    drawBoard,
    glow,
    board,
    update(dt, t) {
      floorFx.update(dt, t);
      rails$.update(dt);
      crowd.update(dt, t);
      crown.rotation.y = t * 0.3;
      bulbT += dt;
      if (bulbT > 0.12) {
        bulbT = 0;
        // chasing lights
        const n = bulbBase.length;
        for (let i = 0; i < n; i++) {
          const on = (Math.floor(t * 5) + i) % 4 !== 0;
          bulbs.setColorAt(i, tc.copy(bulbBase[i]).multiplyScalar(on ? 1 : 0.55));
        }
        bulbs.instanceColor.needsUpdate = true;
        for (let i = 0; i < sbBulbs.length; i++) sbB.setColorAt(i, tc.set((Math.floor(t * 6) + (i >> 1)) % 3 ? '#fff3c4' : '#ff9eb5'));
        sbB.instanceColor.needsUpdate = true;
      }
      for (const g of goals) {
        if (!g.group.visible) continue;
        g.flash = Math.max(0, g.flash - dt);
        const on = g.flash > 0 ? Math.floor(t * 14) % 2 : Math.floor(t * 3) % 2;
        for (let i = 0; i < 11; i++) g.lights.setColorAt(i, tc.set((i + on) % 2 ? '#fff3c4' : g.color));
        g.lights.instanceColor.needsUpdate = true;
      }
    },
  };
}
