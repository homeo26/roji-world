import * as THREE from 'three';
import { mat, mesh, rng, canvasTexture, roundRect, FONT } from './util.js';

// World frame: y up, ground at y = 0, the camera looks toward -Z.
// The journey runs in three rows from the front (+Z) to the back (-Z).

export const ISLAND = { cx: -9.5, cz: 0, hx: 40, hz: 23, r: 9 };

export const PADS = {
  home: [-25, 17],
  cinema: [-12, 18.6],
  horse: [1.5, 16.8],
  fencing: [15, 18.3],
  boardgames: [18, 3],
  clay: [4, 1.3],
  drawing: [-10, 3],
  next: [-14, -11],
  yumyum: [-40, 16],
  plaza: [-40, 1],
};
export const CAR_SPOT = [-32.5, 20.2];
const TURN1 = [25.5, 11];
const TURN2 = [-24.5, -3.5];
export const FUTURE = [
  [0.5, -12.6],
  [14.5, -11.4],
];
const FUTURE_END = [24.5, -15];
export const DIORAMA_OFFSET = -6.2; // dioramas sit behind their pad (toward -Z)

export function islandSdf(x, z) {
  const { cx, cz, hx, hz, r } = ISLAND;
  const qx = Math.abs(x - cx) - (hx - r);
  const qz = Math.abs(z - cz) - (hz - r);
  const ox = Math.max(qx, 0);
  const oz = Math.max(qz, 0);
  return Math.hypot(ox, oz) + Math.min(Math.max(qx, qz), 0) - r;
}

function islandOutline(n = 220, wobble = true) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    let lo = 0;
    let hi = 60;
    for (let k = 0; k < 30; k++) {
      const mid = (lo + hi) / 2;
      if (islandSdf(ISLAND.cx + dx * mid, ISLAND.cz + dz * mid) < 0) lo = mid;
      else hi = mid;
    }
    const w = wobble ? Math.sin(a * 7) * 0.45 + Math.sin(a * 13 + 1.3) * 0.25 + Math.sin(a * 3 + 0.5) * 0.3 : 0;
    const rr = lo + w;
    pts.push(new THREE.Vector2(ISLAND.cx + dx * rr, ISLAND.cz + dz * rr));
  }
  return pts;
}

// Shape points are (x, -z) so that a -90 degree X rotation lays them on the ground.
function shapeFrom(points, scaleOut = 0) {
  const s = new THREE.Shape();
  points.forEach((p, i) => {
    const dx = p.x - ISLAND.cx;
    const dz = p.y - ISLAND.cz;
    const len = Math.hypot(dx, dz) || 1;
    const x = p.x + (dx / len) * scaleOut;
    const z = p.y + (dz / len) * scaleOut;
    if (i === 0) s.moveTo(x, -z);
    else s.lineTo(x, -z);
  });
  s.closePath();
  return s;
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // { type: 'circle', x, z, r } or { type: 'box', x, z, hw, hd }
    this.animated = [];
    this.statics = new THREE.Group(); // static props, merged once everything is placed
    scene.add(this.statics);
    this.outline = islandOutline();
    this.buildPath();
    this.buildIsland();
    this.buildWater();
    this.buildPathMeshes();
    this.buildLamps();
  }

  addCollider(c) {
    this.colliders.push(c);
  }

  // ---------------------------------------------------------------- path
  buildPath() {
    const P = (p) => new THREE.Vector3(p[0], 0, p[1]);
    const main = [PADS.home, PADS.cinema, PADS.horse, PADS.fencing, TURN1, PADS.boardgames, PADS.clay, PADS.drawing, TURN2, PADS.next].map(P);
    this.curve = new THREE.CatmullRomCurve3(main, false, 'centripetal');
    this.futureCurve = new THREE.CatmullRomCurve3([P(PADS.next), P(FUTURE[0]), P(FUTURE[1]), P(FUTURE_END)], false, 'centripetal');
    // Town road: home -> Roji's YumYum -> Play Park -> back onto the journey path
    this.townCurve = new THREE.CatmullRomCurve3(
      [P(PADS.home), P([-32, 17.6]), P(PADS.yumyum), P([-46.3, 12.5]), P([-46.3, 4.5]), P(PADS.plaza), P([-32, -1.5]), P(TURN2)],
      false,
      'centripetal',
    );
    this.townSamples = this.townCurve.getSpacedPoints(Math.ceil(this.townCurve.getLength() * 3));
    const len = this.curve.getLength();
    this.samples = this.curve.getSpacedPoints(Math.ceil(len * 3));
    this.futureSamples = this.futureCurve.getSpacedPoints(Math.ceil(this.futureCurve.getLength() * 3));
    // Sample index nearest each pad, for the progress trail
    this.padIndex = {};
    for (const [id, [x, z]] of Object.entries(PADS)) {
      if (id === 'yumyum' || id === 'plaza') continue;
      let best = 0;
      let bd = Infinity;
      this.samples.forEach((s, i) => {
        const d = (s.x - x) ** 2 + (s.z - z) ** 2;
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      this.padIndex[id] = best;
    }
  }

  distanceToPath(x, z, includeFuture = true) {
    let best = Infinity;
    const all = includeFuture ? [this.samples, this.futureSamples, this.townSamples] : [this.samples, this.townSamples];
    for (const list of all) {
      for (let i = 0; i < list.length; i += 2) {
        const s = list[i];
        const d = (s.x - x) ** 2 + (s.z - z) ** 2;
        if (d < best) best = d;
      }
    }
    return Math.sqrt(best);
  }

  // Triangle strip along a list of points, lying on the ground.
  ribbon(points, width, y) {
    const pos = [];
    const uv = [];
    const idx = [];
    let dist = 0;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const a = points[Math.max(0, i - 1)];
      const b = points[Math.min(points.length - 1, i + 1)];
      const tx = b.x - a.x;
      const tz = b.z - a.z;
      const tl = Math.hypot(tx, tz) || 1;
      const nx = -tz / tl;
      const nz = tx / tl;
      if (i > 0) dist += p.distanceTo(points[i - 1]);
      pos.push(p.x + nx * width * 0.5, y, p.z + nz * width * 0.5, p.x - nx * width * 0.5, y, p.z - nz * width * 0.5);
      uv.push(dist, 0, dist, 1);
      if (i < points.length - 1) {
        const k = i * 2;
        idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  buildPathMeshes() {
    // Soft darker border, then the sand path on top
    const border = mesh(this.ribbon(this.samples, 2.9, 0.02), mat('#cfb27e', { rough: 1 }), { cast: false });
    const path = mesh(this.ribbon(this.samples, 2.35, 0.035), mat('#f3dfb4', { rough: 1 }), { cast: false });
    this.scene.add(border, path);
    const townBorder = mesh(this.ribbon(this.townSamples, 2.9, 0.021), mat('#cfb27e', { rough: 1 }), { cast: false });
    const townPath = mesh(this.ribbon(this.townSamples, 2.35, 0.036), mat('#f3dfb4', { rough: 1 }), { cast: false });
    this.scene.add(townBorder, townPath);

    // Golden trail that grows as weekends are stamped
    this.trailMat = new THREE.MeshStandardMaterial({ color: '#ffd166', emissive: '#ffb347', emissiveIntensity: 0.55, roughness: 0.5 });
    this.trail = mesh(this.ribbon(this.samples, 0.55, 0.05), this.trailMat, { cast: false });
    this.trail.geometry.setDrawRange(0, 0);
    this.trailShown = 0;
    this.trailTarget = 0;
    this.scene.add(this.trail);

    // Pebble edging
    const r = rng(7);
    const pebbleGeo = new THREE.SphereGeometry(0.16, 8, 6);
    const pebbles = [];
    for (let i = 4; i < this.samples.length - 2; i += 3) {
      const p = this.samples[i];
      const q = this.samples[i + 1];
      const tx = q.x - p.x;
      const tz = q.z - p.z;
      const tl = Math.hypot(tx, tz) || 1;
      for (const side of [1, -1]) {
        if (r() < 0.25) continue;
        pebbles.push([p.x + (-tz / tl) * 1.42 * side, p.z + (tx / tl) * 1.42 * side, 0.7 + r() * 0.6]);
      }
    }
    const pim = new THREE.InstancedMesh(pebbleGeo, mat('#e6dccb', { rough: 0.9 }), pebbles.length);
    const m4 = new THREE.Matrix4();
    const q4 = new THREE.Quaternion();
    pebbles.forEach(([x, z, s], i) => {
      m4.compose(new THREE.Vector3(x, 0.03, z), q4, new THREE.Vector3(s, s * 0.45, s));
      pim.setMatrixAt(i, m4);
    });
    pim.receiveShadow = true;
    this.scene.add(pim);

    // The unbuilt road: stepping stones toward future weekends
    const stoneGeo = new THREE.CylinderGeometry(0.42, 0.46, 0.08, 14);
    const stoneMat = mat('#e9dcc3', { rough: 1 });
    const stones = [];
    for (let i = 8; i < this.futureSamples.length; i += 4) stones.push(this.futureSamples[i]);
    const sim = new THREE.InstancedMesh(stoneGeo, stoneMat, stones.length);
    stones.forEach((p, i) => {
      const s = 0.8 + r() * 0.4;
      m4.compose(new THREE.Vector3(p.x + (r() - 0.5) * 0.4, 0.04, p.z + (r() - 0.5) * 0.4), q4, new THREE.Vector3(s, 1, s));
      sim.setMatrixAt(i, m4);
    });
    sim.receiveShadow = true;
    this.scene.add(sim);
  }

  // Grow the golden trail to the given pad (null = none).
  setTrailTo(padId) {
    this.trailTarget = padId ? this.padIndex[padId] : 0;
  }

  // ---------------------------------------------------------------- island
  buildIsland() {
    const shape = shapeFrom(this.outline);

    // Cliff body with a vertical colour fade
    const depth = 3.4;
    const bodyGeo = new THREE.ExtrudeGeometry(shapeFrom(this.outline, -0.2), {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.5,
      bevelSize: 0.7,
      bevelSegments: 4,
      curveSegments: 1,
    });
    bodyGeo.rotateX(-Math.PI / 2);
    bodyGeo.translate(0, -depth - 0.6, 0);
    const colors = [];
    const top = new THREE.Color('#d9a066');
    const bottom = new THREE.Color('#9a6442');
    const c = new THREE.Color();
    const pos = bodyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const k = THREE.MathUtils.clamp((pos.getY(i) + depth + 1) / (depth + 0.6), 0, 1);
      c.copy(bottom).lerp(top, k);
      const band = Math.sin(pos.getY(i) * 5.5) * 0.03;
      colors.push(c.r + band, c.g + band, c.b + band);
    }
    bodyGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const body = mesh(bodyGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), { cast: false });
    this.scene.add(body);

    // Grass lip with a rounded edge
    const lipGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.25,
      bevelEnabled: true,
      bevelThickness: 0.22,
      bevelSize: 0.35,
      bevelSegments: 4,
      curveSegments: 1,
    });
    lipGeo.rotateX(-Math.PI / 2);
    lipGeo.translate(0, -0.5, 0);
    const lip = mesh(lipGeo, mat('#86c35c', { rough: 0.95 }), { cast: false });
    this.scene.add(lip);

    // Painted top surface: mottled grass
    const X0 = -52;
    const Z0 = -27;
    const W = 86;
    const H = 54;
    const r = rng(3);
    const tex = canvasTexture(2048, 1536, (ctx, w, h) => {
      ctx.fillStyle = '#9ad06a';
      ctx.fillRect(0, 0, w, h);
      const blobs = [
        ['rgba(126,190,88,0.35)', 260, 60, 200],
        ['rgba(176,222,120,0.35)', 220, 40, 160],
        ['rgba(110,176,84,0.25)', 140, 20, 90],
        ['rgba(206,232,140,0.25)', 300, 12, 40],
      ];
      for (const [col, n, rmin, rr] of blobs) {
        ctx.fillStyle = col;
        for (let i = 0; i < n; i++) {
          ctx.beginPath();
          ctx.ellipse(r() * w, r() * h, rmin + r() * rr, (rmin + r() * rr) * (0.5 + r() * 0.5), r() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Speckles
      for (let i = 0; i < 9000; i++) {
        ctx.fillStyle = r() < 0.5 ? 'rgba(90,150,70,0.22)' : 'rgba(230,245,170,0.25)';
        ctx.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3);
      }
    });
    const topGeo = new THREE.ShapeGeometry(shape, 1);
    const uv = topGeo.attributes.uv;
    const tp = topGeo.attributes.position;
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i);
      const z = -tp.getY(i);
      uv.setXY(i, (x - X0) / W, 1 - (z - Z0) / H);
    }
    topGeo.rotateX(-Math.PI / 2);
    const topMesh = mesh(topGeo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), { cast: false });
    this.scene.add(topMesh);
    this.ground = topMesh;
  }

  buildWater() {
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshStandardMaterial({ color: '#6fc9d4', roughness: 0.35, metalness: 0 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -1.25;
    water.receiveShadow = true;
    this.scene.add(water);
    this.water = water;

    // Foam rings that breathe around the shore
    const foamMat = new THREE.MeshBasicMaterial({ color: '#f2fbfb', transparent: true, opacity: 0.6, depthWrite: false });
    const ringShape = (inner, outer) => {
      const s = shapeFrom(this.outline, outer);
      const hole = shapeFrom(this.outline, inner);
      s.holes.push(new THREE.Path(hole.getPoints()));
      return s;
    };
    const foam = new THREE.Mesh(new THREE.ShapeGeometry(ringShape(0.2, 1.3)), foamMat);
    foam.rotation.x = -Math.PI / 2;
    foam.position.y = -1.22;
    this.scene.add(foam);
    const waveMat = foamMat.clone();
    const wave = new THREE.Mesh(new THREE.ShapeGeometry(ringShape(2.4, 2.9)), waveMat);
    wave.rotation.x = -Math.PI / 2;
    wave.position.y = -1.23;
    this.scene.add(wave);
    this.animated.push((dt, t) => {
      foamMat.opacity = 0.5 + Math.sin(t * 1.3) * 0.15;
      const k = (t * 0.25) % 1;
      wave.scale.setScalar(1 + k * 0.06);
      wave.position.x = -ISLAND.cx * k * 0.06;
      wave.position.z = -ISLAND.cz * k * 0.06;
      waveMat.opacity = 0.55 * (1 - k);
    });
  }

  buildLamps() {
    const postMat = mat('#40594d', { rough: 0.5, metal: 0.3 });
    const glow = mat('#fff1c7', { emissive: '#ffd27a', ei: 1.4, rough: 0.3 });
    const postGeo = new THREE.CylinderGeometry(0.06, 0.09, 2.2, 8);
    const headGeo = new THREE.SphereGeometry(0.2, 14, 10);
    const capGeo = new THREE.ConeGeometry(0.24, 0.22, 10);
    let side = 1;
    const step = 27; // samples between lamps (about 9 units)
    for (let i = 14; i < this.samples.length - 6; i += step) {
      const p = this.samples[i];
      const nearPad = Object.values(PADS).some(([x, z]) => Math.hypot(p.x - x, p.z - z) < 3.6);
      if (nearPad) continue;
      const q = this.samples[i + 1];
      const tx = q.x - p.x;
      const tz = q.z - p.z;
      const tl = Math.hypot(tx, tz) || 1;
      const x = p.x + (-tz / tl) * 1.85 * side;
      const z = p.z + (tx / tl) * 1.85 * side;
      side *= -1;
      const g = new THREE.Group();
      const post = mesh(postGeo, postMat);
      post.position.y = 1.1;
      const head = mesh(headGeo, glow, { cast: false });
      head.position.y = 2.32;
      const cap = mesh(capGeo, postMat);
      cap.position.y = 2.55;
      const base = mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.18, 10), postMat);
      base.position.y = 0.09;
      g.add(post, head, cap, base);
      g.position.set(x, 0, z);
      this.statics.add(g);
      this.addCollider({ type: 'circle', x, z, r: 0.2 });
    }
  }

  // ---------------------------------------------------------------- nature
  // keepOut: list of { x, z, r } areas reserved for buildings and stations.
  scatterNature(keepOut) {
    const r = rng(11);
    const free = (x, z, pathGap, edge = 1.6) => {
      if (islandSdf(x, z) > -edge) return false;
      if (this.distanceToPath(x, z) < pathGap) return false;
      for (const k of keepOut) if (Math.hypot(x - k.x, z - k.z) < k.r) return false;
      return true;
    };
    const B = ISLAND;
    const randPoint = () => [B.cx + (r() * 2 - 1) * B.hx, B.cz + (r() * 2 - 1) * B.hz];
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    const e = new THREE.Euler();

    // Trees
    const trees = [];
    for (let tries = 0; tries < 4000 && trees.length < 78; tries++) {
      const [x, z] = randPoint();
      if (!free(x, z, 3.1, 2.2)) continue;
      if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 2.3)) continue;
      const roll = r();
      trees.push({ x, z, s: 0.8 + r() * 0.5, kind: roll < 0.55 ? 'round' : roll < 0.85 ? 'pine' : 'blossom', rot: r() * 6.28 });
    }
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.3, 7);
    trunkGeo.translate(0, 0.65, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, mat('#8b5e3c', { rough: 0.9 }), trees.length);
    const ballGeo = new THREE.IcosahedronGeometry(1, 2);
    const coneGeo = new THREE.ConeGeometry(1, 1.4, 8);
    const balls = [];
    const cones = [];
    const greens = ['#6dbb58', '#5aa84f', '#84c95f', '#77c05a'];
    const pinks = ['#f6a5c0', '#f9bfd2', '#f28db0'];
    trees.forEach((t, i) => {
      m4.compose(v.set(t.x, 0, t.z), q.setFromEuler(e.set(0, t.rot, 0)), s.set(t.s, t.s * (t.kind === 'pine' ? 0.9 : 1), t.s));
      trunks.setMatrixAt(i, m4);
      if (t.kind === 'pine') {
        for (let k = 0; k < 3; k++) {
          cones.push({ x: t.x, y: (1.3 + k * 0.62) * t.s, z: t.z, sc: (0.95 - k * 0.22) * t.s, col: k === 2 ? '#4d9a5f' : '#3f8a55' });
        }
      } else {
        const palette = t.kind === 'blossom' ? pinks : greens;
        const col = palette[Math.floor(r() * palette.length)];
        balls.push({ x: t.x, y: 1.85 * t.s, z: t.z, sc: 0.92 * t.s, col });
        balls.push({ x: t.x + 0.5 * t.s, y: 1.55 * t.s, z: t.z + 0.25 * t.s, sc: 0.6 * t.s, col });
        balls.push({ x: t.x - 0.45 * t.s, y: 1.6 * t.s, z: t.z - 0.2 * t.s, sc: 0.62 * t.s, col });
      }
      this.addCollider({ type: 'circle', x: t.x, z: t.z, r: 0.35 * t.s });
    });
    trunks.castShadow = true;
    trunks.receiveShadow = true;
    const ballIM = new THREE.InstancedMesh(ballGeo, mat('#ffffff', { rough: 0.85, flat: true }), balls.length);
    balls.forEach((b, i) => {
      m4.compose(v.set(b.x, b.y, b.z), q.setFromEuler(e.set(r(), r(), r())), s.set(b.sc, b.sc * 0.92, b.sc));
      ballIM.setMatrixAt(i, m4);
      ballIM.setColorAt(i, new THREE.Color(b.col));
    });
    const coneIM = new THREE.InstancedMesh(coneGeo, mat('#ffffff', { rough: 0.85, flat: true }), cones.length);
    cones.forEach((c, i) => {
      m4.compose(v.set(c.x, c.y, c.z), q.identity(), s.set(c.sc, c.sc, c.sc));
      coneIM.setMatrixAt(i, m4);
      coneIM.setColorAt(i, new THREE.Color(c.col));
    });
    for (const im of [ballIM, coneIM]) {
      im.castShadow = true;
      im.receiveShadow = true;
    }
    this.scene.add(trunks, ballIM, coneIM);
    this.treeCanopy = ballIM;

    // Bushes
    const bushes = [];
    for (let tries = 0; tries < 3000 && bushes.length < 60; tries++) {
      const [x, z] = randPoint();
      if (!free(x, z, 2.1, 1.4)) continue;
      bushes.push({ x, z, s: 0.35 + r() * 0.3 });
    }
    const bushIM = new THREE.InstancedMesh(ballGeo, mat('#ffffff', { rough: 0.9, flat: true }), bushes.length * 2);
    bushes.forEach((b, i) => {
      const col = new THREE.Color(greens[i % greens.length]);
      m4.compose(v.set(b.x, b.s * 0.55, b.z), q.identity(), s.set(b.s, b.s * 0.8, b.s));
      bushIM.setMatrixAt(i * 2, m4);
      bushIM.setColorAt(i * 2, col);
      m4.compose(v.set(b.x + b.s * 0.7, b.s * 0.4, b.z + b.s * 0.2), q.identity(), s.set(b.s * 0.7, b.s * 0.6, b.s * 0.7));
      bushIM.setMatrixAt(i * 2 + 1, m4);
      bushIM.setColorAt(i * 2 + 1, col);
      this.addCollider({ type: 'circle', x: b.x + b.s * 0.3, z: b.z, r: b.s * 0.9 });
    });
    bushIM.castShadow = true;
    bushIM.receiveShadow = true;
    this.scene.add(bushIM);

    // Flowers
    const flowerCols = ['#ff8fb1', '#ffffff', '#ffd75e', '#c7a6ff', '#ff6b6b', '#ffb36b'];
    const flowers = [];
    for (let tries = 0; tries < 9000 && flowers.length < 650; tries++) {
      const [x, z] = randPoint();
      if (!free(x, z, 1.75, 0.9)) continue;
      // Cluster around a few patches
      const cluster = Math.sin(x * 0.35) * Math.cos(z * 0.4) + Math.sin(x * 0.11 + z * 0.17);
      if (cluster < 0.2 && r() > 0.25) continue;
      flowers.push({ x, z, col: flowerCols[Math.floor(r() * flowerCols.length)], h: 0.16 + r() * 0.14 });
    }
    const headGeo = new THREE.IcosahedronGeometry(0.085, 1);
    const stemGeo = new THREE.CylinderGeometry(0.012, 0.015, 1, 4);
    stemGeo.translate(0, 0.5, 0);
    const headIM = new THREE.InstancedMesh(headGeo, mat('#ffffff', { rough: 0.6, flat: true }), flowers.length);
    const stemIM = new THREE.InstancedMesh(stemGeo, mat('#4f9a45'), flowers.length);
    flowers.forEach((f, i) => {
      m4.compose(v.set(f.x, f.h, f.z), q.identity(), s.set(1, 0.75, 1));
      headIM.setMatrixAt(i, m4);
      headIM.setColorAt(i, new THREE.Color(f.col));
      m4.compose(v.set(f.x, 0, f.z), q.identity(), s.set(1, f.h, 1));
      stemIM.setMatrixAt(i, m4);
    });
    headIM.castShadow = false;
    stemIM.castShadow = false;
    this.scene.add(headIM, stemIM);
    this.flowerSpots = flowers;

    // Grass tufts
    const tuftGeo = new THREE.ConeGeometry(0.05, 0.36, 4);
    tuftGeo.translate(0, 0.18, 0);
    const tufts = [];
    for (let tries = 0; tries < 6000 && tufts.length < 900; tries++) {
      const [x, z] = randPoint();
      if (!free(x, z, 1.5, 0.7)) continue;
      tufts.push([x, z]);
    }
    const tuftIM = new THREE.InstancedMesh(tuftGeo, mat('#ffffff', { rough: 1 }), tufts.length * 3);
    let n = 0;
    for (const [x, z] of tufts) {
      for (let k = 0; k < 3; k++) {
        m4.compose(
          v.set(x + (r() - 0.5) * 0.18, 0, z + (r() - 0.5) * 0.18),
          q.setFromEuler(e.set((r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5)),
          s.setScalar(0.7 + r() * 0.6),
        );
        tuftIM.setMatrixAt(n, m4);
        tuftIM.setColorAt(n, new THREE.Color(r() < 0.5 ? '#6fb04f' : '#88c560'));
        n++;
      }
    }
    this.scene.add(tuftIM);

    // Rocks
    const rockGeo = new THREE.DodecahedronGeometry(0.5, 0);
    const rocks = [];
    for (let tries = 0; tries < 2000 && rocks.length < 34; tries++) {
      const [x, z] = randPoint();
      if (!free(x, z, 2.2, 1.0)) continue;
      rocks.push({ x, z, s: 0.35 + r() * 0.7 });
    }
    const rockIM = new THREE.InstancedMesh(rockGeo, mat('#ffffff', { rough: 0.9, flat: true }), rocks.length);
    rocks.forEach((k, i) => {
      m4.compose(v.set(k.x, k.s * 0.22, k.z), q.setFromEuler(e.set(r(), r(), r())), s.set(k.s, k.s * 0.65, k.s));
      rockIM.setMatrixAt(i, m4);
      rockIM.setColorAt(i, new THREE.Color(r() < 0.5 ? '#c9c2b3' : '#b5ae9f'));
      if (k.s > 0.5) this.addCollider({ type: 'circle', x: k.x, z: k.z, r: k.s * 0.45 });
    });
    rockIM.castShadow = true;
    rockIM.receiveShadow = true;
    this.scene.add(rockIM);

    this.buildClouds(r);
    this.buildButterflies(r);
    this.buildSparkles(r);
  }

  buildClouds(r) {
    const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.25, flatShading: true });
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const spots = [
      [-62, 2.5, 8], [-58, 4, -22], [42, 3, 16], [46, 4.5, -10], [-18, 3.5, 35], [14, 4, 34], [-36, 5, -35], [8, 5.5, -36], [36, 3.5, 34], [-56, 3.5, 30],
    ];
    for (const [x, y, z] of spots) {
      const g = new THREE.Group();
      const n = 4 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(geo, cloudMat);
        const sc = 1 + r() * 1.3;
        m.scale.set(sc * 1.2, sc * 0.8, sc);
        m.position.set((i - n / 2) * 1.5 + r(), r() * 0.8, (r() - 0.5) * 1.5);
        g.add(m);
      }
      g.position.set(x, y, z);
      this.scene.add(g);
      const speed = 0.3 + r() * 0.3;
      const phase = r() * 10;
      this.animated.push((dt, t) => {
        g.position.x = x + Math.sin(t * 0.05 * speed + phase) * 4;
        g.position.y = y + Math.sin(t * 0.4 + phase) * 0.3;
      });
    }
  }

  buildButterflies(r) {
    const cols = ['#ffb4d0', '#ffe37a', '#b9a4ff', '#8fd8ff', '#ffffff'];
    const wingGeo = new THREE.CircleGeometry(0.16, 10);
    wingGeo.translate(0.15, 0, 0);
    for (let i = 0; i < 10; i++) {
      const g = new THREE.Group();
      const m = new THREE.MeshStandardMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide, roughness: 0.6 });
      const left = new THREE.Mesh(wingGeo, m);
      const right = new THREE.Mesh(wingGeo, m);
      right.scale.x = -1;
      left.rotation.x = right.rotation.x = -Math.PI / 2;
      const wl = new THREE.Group();
      const wr = new THREE.Group();
      wl.add(left);
      wr.add(right);
      g.add(wl, wr);
      const spot = this.flowerSpots[Math.floor(r() * this.flowerSpots.length)];
      const home = new THREE.Vector3(spot.x, 0.8, spot.z);
      const ph = r() * 10;
      const rad = 1.2 + r() * 2;
      this.scene.add(g);
      this.animated.push((dt, t) => {
        const a = t * 0.5 + ph;
        g.position.set(home.x + Math.cos(a) * rad, home.y + Math.sin(t * 2.1 + ph) * 0.35 + 0.3, home.z + Math.sin(a * 1.3) * rad);
        g.rotation.y = -a + Math.PI;
        const f = Math.sin(t * 18 + ph) * 0.9;
        wl.rotation.z = f;
        wr.rotation.z = -f;
      });
    }
  }

  buildSparkles(r) {
    const n = 260;
    const pos = new Float32Array(n * 3);
    const base = [];
    for (let i = 0; i < n; i++) {
      let x;
      let z;
      do {
        x = ISLAND.cx + (r() * 2 - 1) * ISLAND.hx;
        z = ISLAND.cz + (r() * 2 - 1) * ISLAND.hz;
      } while (islandSdf(x, z) > -1);
      base.push([x, r() * 3, z, r() * 10]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const tex = canvasTexture(64, 64, (ctx) => {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,240,1)');
      g.addColorStop(0.3, 'rgba(255,230,160,0.8)');
      g.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
    });
    const m = new THREE.PointsMaterial({ size: 0.22, map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    const pts = new THREE.Points(geo, m);
    pts.frustumCulled = false;
    this.scene.add(pts);
    this.animated.push((dt, t) => {
      for (let i = 0; i < n; i++) {
        const [x, y, z, ph] = base[i];
        const k = (y + t * 0.18) % 3.2;
        pos[i * 3] = x + Math.sin(t * 0.7 + ph) * 0.4;
        pos[i * 3 + 1] = 0.2 + k;
        pos[i * 3 + 2] = z + Math.cos(t * 0.6 + ph) * 0.4;
      }
      geo.attributes.position.needsUpdate = true;
      m.opacity = 0.55 + Math.sin(t * 1.7) * 0.2;
    });
  }

  // A wooden sign board with painted text, facing +Z.
  sign(lines, { color = '#7b4f2f', width = 2.4, height = 1.1, accent = '#e5484d', postHeight = 1.25 } = {}) {
    const g = new THREE.Group();
    const wood = mat('#9b6a43', { rough: 0.85 });
    for (const sx of [-width * 0.38, width * 0.38]) {
      const post = mesh(new THREE.BoxGeometry(0.12, postHeight + height, 0.12), wood);
      post.position.set(sx, (postHeight + height) / 2, -0.06);
      g.add(post);
    }
    const tex = canvasTexture(512, Math.round((512 * height) / width), (ctx, w, h) => {
      ctx.fillStyle = '#f7ead2';
      roundRect(ctx, 6, 6, w - 12, h - 12, 26);
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (lines.length === 1) {
        ctx.font = `600 ${Math.round(h * 0.42)}px ${FONT}`;
        ctx.fillStyle = '#4a3423';
        ctx.fillText(lines[0], w / 2, h / 2 + 4);
      } else {
        ctx.font = `600 ${Math.round(h * 0.2)}px ${FONT}`;
        ctx.fillText(lines[0].toUpperCase(), w / 2, h * 0.32);
        ctx.font = `600 ${Math.round(h * 0.3)}px ${FONT}`;
        ctx.fillStyle = '#4a3423';
        ctx.fillText(lines[1], w / 2, h * 0.66);
      }
    });
    const board = mesh(new THREE.BoxGeometry(width, height, 0.1), [wood, wood, wood, wood, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), wood]);
    board.position.y = postHeight + height / 2;
    g.add(board);
    return g;
  }

  update(dt, t) {
    for (const fn of this.animated) fn(dt, t);
    // Ease the golden trail toward its target
    if (this.trailShown !== this.trailTarget) {
      const dir = Math.sign(this.trailTarget - this.trailShown);
      this.trailShown += dir * Math.max(1, Math.abs(this.trailTarget - this.trailShown) * dt * 2.5);
      if ((dir > 0 && this.trailShown > this.trailTarget) || (dir < 0 && this.trailShown < this.trailTarget)) this.trailShown = this.trailTarget;
      this.trail.geometry.setDrawRange(0, Math.max(0, Math.floor(this.trailShown)) * 6);
    }
    this.trailMat.emissiveIntensity = 0.45 + Math.sin(t * 2.4) * 0.15;
  }
}
