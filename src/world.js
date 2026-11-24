import * as THREE from 'three';
import { mat, umat, mesh, rng, canvasTexture, roundRect, FONT } from './util.js';
import { decorateGround } from './engine/ground.js';
import { PLACES } from './engine/manifest.js';

// Flat strips on the ground (path, roads, the golden trail) overlap at crossings. Instead of tiny height
// differences, which flicker, they skip the depth write and are drawn in a fixed order on top of the grass.
const LAYER = { border: 1, curb: 2, path: 3, road: 4, trail: 5 };
function groundLayer(m) {
  m.depthWrite = false;
  m.polygonOffset = true;
  m.polygonOffsetFactor = -2;
  m.polygonOffsetUnits = -2;
  return m;
}
function layered(m, order) {
  m.renderOrder = order;
  return m;
}

// World frame: y up, ground at y = 0, the camera looks toward -Z.
// The journey runs in three rows from the front (+Z) to the back (-Z).

export const ISLAND = { cx: -11, cz: -51, hx: 75, hz: 74, r: 16 };

// City streets, as straight polylines [x, z]. Places from src/engine/manifest.js sit along them.
export const CITY_ROADS = [
  [[-14, -11.5], [-14, -24], [-14, -27.8]], // from the journey's last stop up into the city
  [[-52, -24], [54, -24]], // first street
  [[-50, -62], [44, -62]], // second street
  [[-30, -24], [-30, -62]],
  [[2, -24], [2, -62]],
  [[-14, -62], [-14, -89.6]], // up to the snow
  [[-46.3, 8.5], [-58, 7.8], [-68, 7.2]], // town to the zoo
  [[-52, 8.2], [-52, -24]],
  [[25.5, 11], [31, 11]], // journey to the east side
  [[31, 19.2], [31, -24]],
  [[31, 19.2], [46, 19.2]],
  [[31, -3.8], [46, -3.8]],
];
export const SNOW_LINE = -88; // north of this (more negative z) the ground turns to snow

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
    let hi = 140;
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
    this.buildCityRoads();
    this.buildLamps();
    this.buildLampHalos();
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
    const all = [this.samples, this.townSamples, ...(includeFuture ? [this.futureSamples] : []), ...(this.cityRoads || [])];
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
    const borderMat = groundLayer(mat('#cfb27e', { rough: 1 }));
    const sandMat = groundLayer(mat('#f3dfb4', { rough: 1 }));
    const border = layered(mesh(this.ribbon(this.samples, 2.9, 0.02), borderMat, { cast: false }), LAYER.border);
    const path = layered(mesh(this.ribbon(this.samples, 2.35, 0.035), sandMat, { cast: false }), LAYER.path);
    this.scene.add(border, path);
    const townBorder = layered(mesh(this.ribbon(this.townSamples, 2.9, 0.02), borderMat, { cast: false }), LAYER.border);
    const townPath = layered(mesh(this.ribbon(this.townSamples, 2.35, 0.035), sandMat, { cast: false }), LAYER.path);
    this.scene.add(townBorder, townPath);

    // Golden trail that grows as weekends are stamped
    this.trailMat = new THREE.MeshStandardMaterial({ color: '#ffd166', emissive: '#ffb347', emissiveIntensity: 0.55, roughness: 0.5 });
    groundLayer(this.trailMat);
    this.trail = layered(mesh(this.ribbon(this.samples, 0.55, 0.05), this.trailMat, { cast: false }), LAYER.trail);
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
    const lipMat = umat('#86c35c', { rough: 0.95 });
    const lip = mesh(lipGeo, lipMat, { cast: false });
    this.scene.add(lip);

    // Painted top surface: mottled grass
    const X0 = ISLAND.cx - ISLAND.hx - 4;
    const Z0 = ISLAND.cz - ISLAND.hz - 4;
    const W = ISLAND.hx * 2 + 8;
    const H = ISLAND.hz * 2 + 8;
    const r = rng(3);
    const tex = canvasTexture(2048, 2048, (ctx, w, h) => {
      ctx.fillStyle = '#9ad06a';
      ctx.fillRect(0, 0, w, h);
      const blobs = [
        ['rgba(126,190,88,0.35)', 420, 40, 140],
        ['rgba(176,222,120,0.35)', 360, 28, 110],
        ['rgba(110,176,84,0.25)', 240, 14, 60],
        ['rgba(206,232,140,0.25)', 500, 8, 28],
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
      for (let i = 0; i < 16000; i++) {
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
    const topMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
    const topMesh = mesh(topGeo, topMat, { cast: false });
    this.scene.add(topMesh);
    this.ground = topMesh;
    // Places can cut holes (a sunken pool) and paint the ground (snow, a pitch)
    this.groundFx = decorateGround([topMat, lipMat, body.material]);
    this.groundFx.addTint(ISLAND.cx, SNOW_LINE - 30, ISLAND.hx + 10, 30, '#f2f6fb', 9);
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

  // Soft halos around every street lamp, shown from dusk to dawn (one draw call).
  buildLampHalos() {
    const n = this.lampHeads.length;
    const pos = new Float32Array(n * 3);
    this.lampHeads.forEach((p, i) => pos.set([p.x, p.y, p.z], i * 3));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const tex = canvasTexture(128, 128, (ctx) => {
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,236,180,1)');
      g.addColorStop(0.25, 'rgba(255,214,140,0.55)');
      g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    });
    this.haloMat = new THREE.PointsMaterial({ size: 3.2, map: tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false });
    this.halos = new THREE.Points(geo, this.haloMat);
    this.halos.visible = false;
    this.halos.frustumCulled = false;
    this.scene.add(this.halos);
  }

  // Night look for the island. k: 0 day .. 1 full night (lamps on).
  setGlow(k, water, cloud, cloudI) {
    this.nightGlow = k;
    this.lampGlowMat.emissiveIntensity = 1.4 + k * 1.6;
    if (this.haloMat) {
      this.haloMat.opacity = k * 0.9;
      this.halos.visible = k > 0.02;
    }
    this.water.material.color.copy(water);
    this.cloudMat.emissive.copy(cloud);
    this.cloudMat.emissiveIntensity = cloudI;
  }

  buildCityRoads() {
    const roadTex = canvasTexture(256, 64, (ctx, w, h) => {
      ctx.fillStyle = '#c9c2d4';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(80,70,100,0.06)';
        ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
      }
      ctx.fillStyle = '#fffaf0';
      ctx.fillRect(0, h / 2 - 3, w * 0.45, 6);
    });
    roadTex.wrapS = THREE.RepeatWrapping;
    roadTex.repeat.set(0.25, 1);
    const roadMat = groundLayer(new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.9 }));
    const curbMat = groundLayer(mat('#efe6da', { rough: 0.9 }));
    this.cityRoads = [];
    CITY_ROADS.forEach((line, i) => {
      const pts = [];
      for (let k = 0; k < line.length - 1; k++) {
        const a = new THREE.Vector3(line[k][0], 0, line[k][1]);
        const b = new THREE.Vector3(line[k + 1][0], 0, line[k + 1][1]);
        const n = Math.max(1, Math.ceil(a.distanceTo(b) * 3));
        for (let j = k === 0 ? 0 : 1; j <= n; j++) pts.push(a.clone().lerp(b, j / n));
      }
      this.cityRoads.push(pts);
      // All curbs go down first and all asphalt on top, so crossings join cleanly
      this.scene.add(layered(mesh(this.ribbon(pts, 3.9, 0.03), curbMat, { cast: false }), LAYER.curb));
      this.scene.add(layered(mesh(this.ribbon(pts, 3.1, 0.032), roadMat, { cast: false }), LAYER.road));
    });
  }

  buildLamps() {
    const postMat = mat('#40594d', { rough: 0.5, metal: 0.3 });
    const glow = mat('#fff1c7', { emissive: '#ffd27a', ei: 1.4, rough: 0.3 });
    this.lampGlowMat = glow;
    this.lampHeads = [];
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
      this.lampHeads.push(new THREE.Vector3(x, 2.32, z));
      this.addCollider({ type: 'circle', x, z, r: 0.2 });
    }
    // Street lamps along the city streets
    for (const pts of this.cityRoads) {
      for (let i = 20; i < pts.length - 10; i += 48) {
        const p = pts[i];
        const q = pts[i + 1];
        const tl = Math.hypot(q.x - p.x, q.z - p.z) || 1;
        const x = p.x + (-(q.z - p.z) / tl) * 2.4 * side;
        const z = p.z + ((q.x - p.x) / tl) * 2.4 * side;
        side *= -1;
        if (this.distanceToPath(x, z, false) < 2.2) continue;
        if (PLACES.some((pl) => !pl.dev && Math.abs(x - pl.slot[0]) < pl.size[0] / 2 + 0.8 && Math.abs(z - pl.slot[1]) < pl.size[1] / 2 + 0.8)) continue;
        const g = new THREE.Group();
        const post = mesh(postGeo, postMat);
        post.position.y = 1.1;
        const head = mesh(headGeo, glow, { cast: false });
        head.position.y = 2.32;
        const cap = mesh(capGeo, postMat);
        cap.position.y = 2.55;
        g.add(post, head, cap);
        g.position.set(x, 0, z);
        this.statics.add(g);
        this.lampHeads.push(new THREE.Vector3(x, 2.32, z));
        this.addCollider({ type: 'circle', x, z, r: 0.2 });
      }
    }
  }

  // ---------------------------------------------------------------- nature
  // keepOut: list of { x, z, r } areas reserved for buildings and stations.
  // rects: list of { x, z, hw, hd } footprints of places, kept clear too.
  scatterNature(keepOut, rects = []) {
    const r = rng(11);
    const free = (x, z, pathGap, edge = 1.6) => {
      if (islandSdf(x, z) > -edge) return false;
      for (const k of keepOut) if (Math.hypot(x - k.x, z - k.z) < k.r) return false;
      for (const k of rects) if (Math.abs(x - k.x) < k.hw && Math.abs(z - k.z) < k.hd) return false;
      if (this.distanceToPath(x, z) < pathGap) return false;
      return true;
    };
    const snowy = (z) => z < SNOW_LINE - 4;
    // Instanced meshes split into 32 m map tiles, so tiles off screen (and out of the shadow box) are skipped.
    const chunked = (geo, material, list, write, { cast = true, receive = true, cell = 32 } = {}) => {
      const cells = new Map();
      for (const it of list) {
        const key = Math.floor(it.x / cell) + ',' + Math.floor(it.z / cell);
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(it);
      }
      const out = [];
      for (const items of cells.values()) {
        const im = new THREE.InstancedMesh(geo, material, items.length);
        items.forEach((it, i) => write(im, i, it));
        im.castShadow = cast;
        im.receiveShadow = receive;
        im.computeBoundingSphere();
        this.scene.add(im);
        out.push(im);
      }
      return out;
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
    for (let tries = 0; tries < 16000 && trees.length < 330; tries++) {
      const [x, z] = randPoint();
      if (!free(x, z, 3.1, 2.2)) continue;
      if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 2.3)) continue;
      const roll = r();
      trees.push({ x, z, s: 0.8 + r() * 0.5, kind: snowy(z) ? 'pine' : roll < 0.55 ? 'round' : roll < 0.85 ? 'pine' : 'blossom', rot: r() * 6.28, snow: snowy(z) });
    }
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.3, 7);
    trunkGeo.translate(0, 0.65, 0);
    const ballGeo = new THREE.IcosahedronGeometry(1, 2);
    const coneGeo = new THREE.ConeGeometry(1, 1.4, 8);
    const balls = [];
    const cones = [];
    const greens = ['#6dbb58', '#5aa84f', '#84c95f', '#77c05a'];
    const pinks = ['#f6a5c0', '#f9bfd2', '#f28db0'];
    chunked(trunkGeo, mat('#8b5e3c', { rough: 0.9 }), trees, (im, i, t) => {
      m4.compose(v.set(t.x, 0, t.z), q.setFromEuler(e.set(0, t.rot, 0)), s.set(t.s, t.s * (t.kind === 'pine' ? 0.9 : 1), t.s));
      im.setMatrixAt(i, m4);
    });
    trees.forEach((t) => {
      if (t.kind === 'pine') {
        for (let k = 0; k < 3; k++) {
          cones.push({ x: t.x, y: (1.3 + k * 0.62) * t.s, z: t.z, sc: (0.95 - k * 0.22) * t.s, col: t.snow ? (k === 2 ? '#f7fbff' : k === 1 ? '#dfeef3' : '#5d9a78') : k === 2 ? '#4d9a5f' : '#3f8a55' });
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
    for (const b of balls) b.rot = [r(), r(), r()];
    chunked(ballGeo, mat('#ffffff', { rough: 0.85, flat: true }), balls, (im, i, b) => {
      m4.compose(v.set(b.x, b.y, b.z), q.setFromEuler(e.set(...b.rot)), s.set(b.sc, b.sc * 0.92, b.sc));
      im.setMatrixAt(i, m4);
      im.setColorAt(i, new THREE.Color(b.col));
    });
    chunked(coneGeo, mat('#ffffff', { rough: 0.85, flat: true }), cones, (im, i, c) => {
      m4.compose(v.set(c.x, c.y, c.z), q.identity(), s.set(c.sc, c.sc, c.sc));
      im.setMatrixAt(i, m4);
      im.setColorAt(i, new THREE.Color(c.col));
    });

    // Bushes
    const bushes = [];
    for (let tries = 0; tries < 12000 && bushes.length < 230; tries++) {
      const [x, z] = randPoint();
      if (!free(x, z, 2.1, 1.4) || snowy(z)) continue;
      bushes.push({ x, z, s: 0.35 + r() * 0.3 });
    }
    const bushParts = [];
    bushes.forEach((b, i) => {
      const col = greens[i % greens.length];
      bushParts.push({ x: b.x, z: b.z, y: b.s * 0.55, sc: [b.s, b.s * 0.8, b.s], col });
      bushParts.push({ x: b.x + b.s * 0.7, z: b.z + b.s * 0.2, y: b.s * 0.4, sc: [b.s * 0.7, b.s * 0.6, b.s * 0.7], col });
      this.addCollider({ type: 'circle', x: b.x + b.s * 0.3, z: b.z, r: b.s * 0.9, h: b.s * 1.1 });
    });
    chunked(ballGeo, mat('#ffffff', { rough: 0.9, flat: true }), bushParts, (im, i, b) => {
      m4.compose(v.set(b.x, b.y, b.z), q.identity(), s.set(...b.sc));
      im.setMatrixAt(i, m4);
      im.setColorAt(i, new THREE.Color(b.col));
    });

    // Flowers
    const flowerCols = ['#ff8fb1', '#ffffff', '#ffd75e', '#c7a6ff', '#ff6b6b', '#ffb36b'];
    const flowers = [];
    for (let tries = 0; tries < 36000 && flowers.length < 2200; tries++) {
      const [x, z] = randPoint();
      if (!free(x, z, 1.75, 0.9) || z < SNOW_LINE + 4) continue;
      // Cluster around a few patches
      const cluster = Math.sin(x * 0.35) * Math.cos(z * 0.4) + Math.sin(x * 0.11 + z * 0.17);
      if (cluster < 0.2 && r() > 0.25) continue;
      flowers.push({ x, z, col: flowerCols[Math.floor(r() * flowerCols.length)], h: 0.16 + r() * 0.14 });
    }
    const headGeo = new THREE.IcosahedronGeometry(0.085, 0);
    const stemGeo = new THREE.CylinderGeometry(0.012, 0.015, 1, 4);
    stemGeo.translate(0, 0.5, 0);
    chunked(headGeo, mat('#ffffff', { rough: 0.6, flat: true }), flowers, (im, i, f) => {
      m4.compose(v.set(f.x, f.h, f.z), q.identity(), s.set(1, 0.75, 1));
      im.setMatrixAt(i, m4);
      im.setColorAt(i, new THREE.Color(f.col));
    }, { cast: false });
    chunked(stemGeo, mat('#4f9a45'), flowers, (im, i, f) => {
      m4.compose(v.set(f.x, 0, f.z), q.identity(), s.set(1, f.h, 1));
      im.setMatrixAt(i, m4);
    }, { cast: false });
    this.flowerSpots = flowers;

    // Grass tufts
    const tuftGeo = new THREE.ConeGeometry(0.05, 0.36, 4);
    tuftGeo.translate(0, 0.18, 0);
    const tufts = [];
    for (let tries = 0; tries < 20000 && tufts.length < 2600; tries++) {
      const [x, z] = randPoint();
      if (!free(x, z, 1.5, 0.7) || z < SNOW_LINE + 2) continue;
      tufts.push([x, z]);
    }
    const blades = [];
    for (const [x, z] of tufts) {
      for (let k = 0; k < 3; k++) blades.push({ x: x + (r() - 0.5) * 0.18, z: z + (r() - 0.5) * 0.18, rx: (r() - 0.5) * 0.5, rz: (r() - 0.5) * 0.5, sc: 0.7 + r() * 0.6, col: r() < 0.5 ? '#6fb04f' : '#88c560' });
    }
    chunked(tuftGeo, mat('#ffffff', { rough: 1 }), blades, (im, i, b) => {
      m4.compose(v.set(b.x, 0, b.z), q.setFromEuler(e.set(b.rx, 0, b.rz)), s.setScalar(b.sc));
      im.setMatrixAt(i, m4);
      im.setColorAt(i, new THREE.Color(b.col));
    }, { cast: false });

    // Rocks
    const rockGeo = new THREE.DodecahedronGeometry(0.5, 0);
    const rocks = [];
    for (let tries = 0; tries < 8000 && rocks.length < 110; tries++) {
      const [x, z] = randPoint();
      if (!free(x, z, 2.2, 1.0)) continue;
      rocks.push({ x, z, s: 0.35 + r() * 0.7 });
    }
    for (const k of rocks) {
      k.rot = [r(), r(), r()];
      k.col = snowy(k.z) ? '#eef4f8' : r() < 0.5 ? '#c9c2b3' : '#b5ae9f';
      if (k.s > 0.5) this.addCollider({ type: 'circle', x: k.x, z: k.z, r: k.s * 0.45, h: k.s * 0.55 });
    }
    chunked(rockGeo, mat('#ffffff', { rough: 0.9, flat: true }), rocks, (im, i, k) => {
      m4.compose(v.set(k.x, k.s * 0.22, k.z), q.setFromEuler(e.set(...k.rot)), s.set(k.s, k.s * 0.65, k.s));
      im.setMatrixAt(i, m4);
      im.setColorAt(i, new THREE.Color(k.col));
    });

    this.buildClouds(r);
    this.buildButterflies(r);
    this.buildSparkles(r);
  }

  buildClouds(r) {
    const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.25, flatShading: true });
    this.cloudMat = cloudMat;
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const spots = [
      [-98, 2.5, 8], [-96, 4, -40], [76, 3, 16], [78, 4.5, -30], [-18, 3.5, 35], [14, 4, 34], [-40, 5, -138], [20, 5.5, -138], [40, 3.5, 34], [-62, 3.5, 32], [-98, 4, -100], [78, 4, -96],
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
    const n = 520;
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
    this.sparkleMat = m;
    this.sparkleTex = tex;
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
      // At night the sparkles turn into bigger, warmer fireflies
      const nk = this.nightGlow || 0;
      m.opacity = (0.55 + Math.sin(t * 1.7) * 0.2) * (1 + nk * 0.8);
      m.size = 0.22 + nk * 0.2;
    });
  }

  // A wooden sign board with painted text, facing +Z.
  sign(lines, opts) {
    return makeSign(lines, opts);
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

// A wooden sign board with painted text, facing +Z. lines: [title] or [small label, title].
export function makeSign(lines, { color = '#7b4f2f', width = 2.4, height = 1.1, accent = '#e5484d', postHeight = 1.25 } = {}) {
  {
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
}
