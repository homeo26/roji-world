// The practice course for Abu Sanad's driving lessons: one little town with every road the eight lessons use.
//   West loop: the start straight (slalom, cone gate, stop line, traffic light) curving into the roundabout.
//   Duck road: from the roundabout down past the duck crossing to the car park.
//   East loop: School Street (school zone, speed bumps, crossing), the hill road (hill start), the narrow bridge
//   over the stream, then Market Street (parallel parking, reverse bays, bus stop) back to the start.
// All coordinates are scene metres. Ground is y = 0 except the hill and the bridge (heightAt).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, umat, mesh, rng, roundRect, bakeStatic } from '../../util.js';
import { C, kit, colorBake, Atlas, signPost, makeTrafficLight, lightMats, setLight, makeCone, makeDuck, tree, addFlowers, paintText, drawWheelBadge, heartPath } from '../../places/driving/kit.js';

export const ROAD_W = 4.6;
export const RC = { x: 19, z: -10 }; // roundabout centre
export const R_IN = 4.2;
export const R_OUT = 9.2;
export const R_LANE = 6.7;
export const GATE_Z = 24;
export const STOP_Z = 12;
export const LIGHT_Z = 1;
export const ZEBRA = { x0: 16.7, x1: 21.3, z0: 7.0, z1: 9.2 }; // the duck crossing
export const DUCK_Z = 8.1;
export const POND = { x: 26.8, z: 8.6, r: 1.6 };
export const LOT = { x0: 10.5, x1: 28.5, z0: 20, z1: 33 };
export const BAY = { x: 22.5, z: 29.4 };
export const BAYS = [13.5, 16.5, 19.5, 22.5, 25.5];
export const SCHOOL = { z: -10, x0: 33, x1: 49.5, zeb: [38.6, 40.6], bumps: [34.8, 46.6], ballX: 44.6, finish: [49.0, 51.6] };
export const HILL = { x: 60, z0: 1, z1: 9, z2: 14, z3: 21, h: 1.8, stopZ: 5.2 };
export const BRIDGE = { x: 60, z0: 24.4, z1: 31.6, hw: 1.3, arch: 0.4, line: 21.6 };
export const STREAM = { z: 28, x0: 46, x1: 76, hw: 1.9 };
export const MARKET = { z: 46, laneZ: 42.75, lane: [19.6, 44.4], gapX: 29.9, parked: [22.0, 25.4, 34.4, 37.8, 41.2], bays: [15.5, 18.5, 21.5, 24.5], bayZ: 50.9, target: 18.5, bus: [32.5, 39.5] };
export const FENCE = { x0: -12, x1: 70, z0: -27, z1: 58 };
export const FARM = { barn: [67, 19.6], field: [66.5, 37] };
export const TRACTOR_PATH = [[67.5, 35.2], [63.5, 34.8], [60.4, 33.4], [60, 31.6], [60, 24.4], [60.5, 23.3], [63.5, 23.0], [66.6, 23.0]];

const sstep = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
export function heightAt(x, z) {
  const dx = Math.abs(x - HILL.x);
  let h = 0;
  if (z > HILL.z0 && z < HILL.z3 && dx < 12.5) {
    const prof = z < HILL.z1 ? sstep((z - HILL.z0) / (HILL.z1 - HILL.z0)) : z < HILL.z2 ? 1 : 1 - sstep((z - HILL.z2) / (HILL.z3 - HILL.z2));
    h = HILL.h * prof * (1 - sstep((dx - 3.8) / 8.5));
  }
  if (dx < BRIDGE.hw + 0.5 && z > BRIDGE.z0 && z < BRIDGE.z1) h = Math.max(h, BRIDGE.arch * Math.sin((Math.PI * (z - BRIDGE.z0)) / (BRIDGE.z1 - BRIDGE.z0)));
  return h;
}

function samplePath(segs, step = 0.5) {
  const pts = [];
  for (const s of segs) {
    if (s.arc) {
      const { cx, cz, r, a0, a1 } = s;
      const n = Math.ceil((Math.abs(a1 - a0) * r) / step);
      for (let i = pts.length ? 1 : 0; i <= n; i++) {
        const a = a0 + ((a1 - a0) * i) / n;
        pts.push(new THREE.Vector3(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r));
      }
    } else {
      const [ax, az, bx, bz] = s;
      const n = Math.ceil(Math.hypot(bx - ax, bz - az) / step);
      for (let i = pts.length ? 1 : 0; i <= n; i++) pts.push(new THREE.Vector3(ax + ((bx - ax) * i) / n, 0, az + ((bz - az) * i) / n));
    }
  }
  return pts;
}
// A flat strip along a path. y: height function of (x, z).
function ribbon(pts, width, y, uvLen = 4) {
  const pos = [];
  const uv = [];
  const nrm = [];
  const idx = [];
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b.x - a.x;
    let tz = b.z - a.z;
    const l = Math.hypot(tx, tz) || 1;
    tx /= l;
    tz /= l;
    if (i) s += p.distanceTo(pts[i - 1]);
    const lx = p.x - tz * width * 0.5;
    const lz = p.z + tx * width * 0.5;
    const rx = p.x + tz * width * 0.5;
    const rz = p.z - tx * width * 0.5;
    pos.push(lx, y(lx, lz), lz, rx, y(rx, rz), rz);
    uv.push(s / uvLen, 1, s / uvLen, 0);
    nrm.push(0, 1, 0, 0, 1, 0);
    if (i) {
      const q = (i - 1) * 2;
      idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const speckle = (c, R, W, H, n) => {
  for (let i = 0; i < n; i++) {
    c.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(70,60,95,0.07)';
    c.fillRect(R() * W, R() * H, 3, 3);
  }
};
const tex = (w, h, draw, o = {}) => {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (o.wrap) t.wrapS = THREE.RepeatWrapping;
  return t;
};

export function buildWorld(ctx) {
  const k = kit();
  const { box, rbox, cyl, cone, sph, at } = k;
  const world = new THREE.Group();
  ctx.scene.add(world);
  const keep = [];
  const R = rng(21);
  const atlas = new Atlas(8, 4, 256);
  const atlas2 = new Atlas(8, 4, 256);
  const cells = {};
  const flowers = [];
  const colliders = [];
  const col = (c) => (colliders.push(c), c);
  const add = (o, x, y, z, ry = 0) => (at(o, x, y, z, ry), world.add(o), o);
  // Put on the ground (follows the hill)
  const put = (o, x, z, ry = 0, dy = 0) => add(o, x, heightAt(x, z) + dy, z, ry);
  const m4 = new THREE.Matrix4();
  const tmpC = new THREE.Color();
  // Windows share one material, so they can glow warm in the night lesson
  const winMat = umat('#cfeeff', { rough: 0.15, emissive: '#bfe6ff', ei: 0.25 });

  // ---------------------------------------------------------------- ground
  const grass = mesh(new THREE.PlaneGeometry(220, 220), mat('#9ad06a', { rough: 0.95 }), { cast: false });
  grass.rotation.x = -Math.PI / 2;
  add(grass, 29, 0, 15);
  // The hill: a ridge across the east road, shaded a little lighter on top
  {
    const W = 27;
    const D = 26;
    const g = new THREE.PlaneGeometry(W, D, 54, 52);
    g.rotateX(-Math.PI / 2);
    g.translate(HILL.x, 0, (HILL.z0 + HILL.z3) / 2);
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    const lo = new THREE.Color('#9ad06a');
    const hi = new THREE.Color('#c6ec8e');
    for (let i = 0; i < p.count; i++) {
      const h = heightAt(p.getX(i), p.getZ(i));
      p.setY(i, h > 0.012 ? h : -0.04);
      tmpC.copy(lo).lerp(hi, Math.min(1, h / HILL.h));
      cols.set([tmpC.r, tmpC.g, tmpC.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    world.add(mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), { cast: false }));
  }

  // Low stone walls along the hill road: their tops follow the slope, so the hill reads from above
  {
    const stone = ['#d9cfc6', '#cfc4ba', '#e3dad2'];
    for (const s of [-1, 1]) {
      const x = HILL.x + s * 3.25;
      for (let z = HILL.z0 + 0.6, i = 0; z < HILL.z3 - 0.6; z += 1.0, i++) {
        const h0 = heightAt(x, z - 0.5);
        const h1 = heightAt(x, z + 0.5);
        const w = rbox(0.42, 0.5, 1.04, stone[i % 3], 0.08);
        w.rotation.x = -Math.atan2(h1 - h0, 1);
        add(w, x, (h0 + h1) / 2 + 0.2, z);
        if (i % 3 === 1) flowers.push([x - s * 0.1, (h0 + h1) / 2 + 0.45, z, i % 7, 1.1]);
      }
      col({ type: 'box', x, z: (HILL.z0 + HILL.z3) / 2, hw: 0.21, hd: (HILL.z3 - HILL.z0) / 2 - 0.6 });
    }
  }

  // ---------------------------------------------------------------- roads
  const roadW = samplePath([{ arc: true, cx: 8, cz: 38, r: 8, a0: Math.PI / 2, a1: Math.PI }, [0, 38, 0, -2], { arc: true, cx: 8, cz: -2, r: 8, a0: Math.PI, a1: Math.PI * 1.5 }, [8, -10, 10.4, -10]]);
  const roadB = samplePath([[19, -1.2, 19, 21]]);
  const roadE1 = samplePath([[27.6, -10, 52, -10], { arc: true, cx: 52, cz: -2, r: 8, a0: -Math.PI / 2, a1: 0 }, [60, -2, 60, BRIDGE.z0 + 0.2]]);
  const roadE2 = samplePath([[60, BRIDGE.z1 - 0.2, 60, 38], { arc: true, cx: 52, cz: 38, r: 8, a0: 0, a1: Math.PI / 2 }, [52, 46, 6.5, 46]]);
  const ROADS = [roadW, roadB, roadE1, roadE2];
  const roadTex = tex(256, 128, (c, w, h) => {
    c.fillStyle = '#bcb3ca';
    c.fillRect(0, 0, w, h);
    speckle(c, R, w, h, 500);
    c.fillStyle = '#fffaf0';
    c.fillRect(0, 4, w, 5);
    c.fillRect(0, 119, w, 5);
    c.fillRect(0, 61, 128, 6);
  }, { wrap: true });
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.9 });
  const curbMat = mat('#efe6da', { rough: 0.9 });
  const hY = (o) => (x, z) => heightAt(x, z) + o;
  for (const pts of ROADS) {
    world.add(mesh(ribbon(pts, ROAD_W + 0.8, hY(0.02)), curbMat, { cast: false }));
    world.add(mesh(ribbon(pts, ROAD_W, hY(0.03)), roadMat, { cast: false }));
  }
  // Farm tracks: soft tan dirt
  const dirt = mat('#dcc39a', { rough: 0.95 });
  world.add(mesh(ribbon(samplePath([[61.8, 23.2, 66.4, 23.0], [66.4, 23.0, 67, 21.4]]), 2.2, hY(0.018)), dirt, { cast: false }));
  world.add(mesh(ribbon(samplePath([[61.8, 34.6, 67.6, 35.3]]), 2.2, hY(0.018)), dirt, { cast: false }));
  // Roundabout: painted ring, lane dashes and arrows
  const ringTex = tex(1024, 1024, (c, S) => {
    const px = S / (R_OUT * 2);
    const X = (x) => S / 2 + x * px;
    c.fillStyle = '#efe6da';
    c.beginPath();
    c.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#bcb3ca';
    c.beginPath();
    c.arc(S / 2, S / 2, (R_OUT - 0.4) * px, 0, Math.PI * 2);
    c.fill();
    speckle(c, R, S, S, 2600);
    c.strokeStyle = '#fffaf0';
    c.lineWidth = 0.12 * px;
    c.beginPath();
    c.arc(S / 2, S / 2, (R_OUT - 0.6) * px, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([0.9 * px, 0.7 * px]);
    c.beginPath();
    c.arc(S / 2, S / 2, R_LANE * px, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
    for (let i = 0; i < 6; i++) {
      const th = (i / 6) * Math.PI * 2 + 0.5;
      const r = (R_LANE + R_IN) / 2 + 0.3;
      c.save();
      c.translate(X(Math.cos(th) * r), X(Math.sin(th) * r));
      c.rotate(Math.atan2(-Math.cos(th), Math.sin(th)));
      c.fillStyle = '#fffaf0';
      c.fillRect(-0.7 * px, -0.12 * px, 0.8 * px, 0.24 * px);
      c.beginPath();
      c.moveTo(0.6 * px, 0);
      c.lineTo(0.05 * px, -0.42 * px);
      c.lineTo(0.05 * px, 0.42 * px);
      c.fill();
      c.restore();
    }
  });
  const ringMat = new THREE.MeshStandardMaterial({ map: ringTex, roughness: 0.9 });
  const ringDisc = mesh(new THREE.CircleGeometry(R_OUT, 64), ringMat, { cast: false });
  ringDisc.rotation.x = -Math.PI / 2;
  add(ringDisc, RC.x, 0.04, RC.z);
  add(cyl(R_IN, R_IN + 0.1, 0.34, C.cream, 40), RC.x, 0.17, RC.z);
  add(cyl(R_IN - 0.25, R_IN - 0.25, 0.04, C.leaf, 40), RC.x, 0.35, RC.z);
  add(tree(k, 1.0, 0), RC.x - 0.4, 0.34, RC.z - 0.3);
  add(tree(k, 0.7, 2), RC.x + 1.6, 0.34, RC.z + 1.1);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    flowers.push([RC.x + Math.cos(a) * (R_IN - 0.55), 0.35, RC.z + Math.sin(a) * (R_IN - 0.55), i % 6, 1.1]);
    if (i % 2) flowers.push([RC.x + Math.cos(a + 0.05) * (R_IN - 1.1), 0.35, RC.z + Math.sin(a + 0.05) * (R_IN - 1.1), (i + 3) % 6, 1]);
  }
  col({ type: 'circle', x: RC.x, z: RC.z, r: R_IN + 0.05 });

  // A flat painted plane (car park, lanes, bays). draw(c, sx, X, Z) in metres.
  const paintPlane = (x0, z0, x1, z1, draw, y = 0.035, px = 1024) => {
    const W = x1 - x0;
    const D = z1 - z0;
    const tw = W >= D ? px : Math.round((px * W) / D);
    const th = W >= D ? Math.round((px * D) / W) : px;
    const t = tex(tw, th, (c, w, h) => draw(c, w / W, (x) => (x - x0) * (w / W), (z) => (z - z0) * (h / D), w, h));
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
    const p = mesh(new THREE.PlaneGeometry(W, D), m, { cast: false });
    p.rotation.x = -Math.PI / 2;
    add(p, (x0 + x1) / 2, y, (z0 + z1) / 2);
    return m;
  };
  const arrowPaint = (c, sx, X, Z, x, z, ang) => {
    c.save();
    c.translate(X(x), Z(z));
    c.rotate(ang);
    c.fillRect(-0.7 * sx, -0.12 * sx, 0.8 * sx, 0.24 * sx);
    c.beginPath();
    c.moveTo(0.6 * sx, 0);
    c.lineTo(0.05 * sx, -0.42 * sx);
    c.lineTo(0.05 * sx, 0.42 * sx);
    c.fill();
    c.restore();
  };
  // Car park
  const lotMat = paintPlane(LOT.x0, LOT.z0, LOT.x1, LOT.z1, (c, sx, X, Z, W, H) => {
    c.fillStyle = '#efe6da';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#bcb3ca';
    roundRect(c, 0.4 * sx, 0.4 * sx, W - 0.8 * sx, H - 0.8 * sx, 1.2 * sx);
    c.fill();
    speckle(c, R, W, H, 2400);
    c.fillStyle = '#fffaf0';
    for (let i = 0; i <= BAYS.length; i++) c.fillRect(X(12 + i * 3) - 0.06 * sx, Z(27), 0.12 * sx, 4.8 * sx);
    c.fillRect(X(12), Z(27) - 0.06 * sx, 15 * sx, 0.12 * sx);
    paintText(c, 'P', X(15), Z(23.4), 2.6 * sx, 'rgba(255,250,240,0.9)');
    c.fillStyle = 'rgba(255,250,240,0.9)';
    arrowPaint(c, sx, X, Z, 21.5, 23.5, 0);
    arrowPaint(c, sx, X, Z, 24.5, 23.5, 0);
    c.fillStyle = 'rgba(239,91,111,0.85)';
    heartPath(c, X(BAY.x), Z(31.2), 0.4 * sx);
    c.fill();
  });
  // Market Street: the parking lane on the north side and reverse bays on the south side
  const laneMat = paintPlane(MARKET.lane[0], 41.75, MARKET.lane[1], 43.8, (c, sx, X, Z, W, H) => {
    c.fillStyle = '#b7aec6';
    c.fillRect(0, 0, W, H);
    speckle(c, R, W, H, 900);
    c.fillStyle = '#fffaf0';
    c.fillRect(0, H - 0.1 * sx, W, 0.1 * sx);
    for (let x = MARKET.lane[0] + 0.6; x < MARKET.lane[1]; x += 3.4) c.fillRect(X(x) - 0.05 * sx, H - 0.5 * sx, 0.1 * sx, 0.42 * sx);
    c.fillStyle = 'rgba(255,209,102,0.9)';
    c.fillRect(X(MARKET.gapX - 3.1), 0.12 * sx, 0.12 * sx, H - 0.24 * sx);
    c.fillRect(X(MARKET.gapX + 3.0), 0.12 * sx, 0.12 * sx, H - 0.24 * sx);
  }, 0.036, 2048);
  const baysMat = paintPlane(13.5, 48.4, 26.5, 53.8, (c, sx, X, Z, W, H) => {
    c.fillStyle = '#efe6da';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#bcb3ca';
    c.fillRect(0.2 * sx, 0, W - 0.4 * sx, H - 0.3 * sx);
    speckle(c, R, W, H, 900);
    c.fillStyle = '#fffaf0';
    for (let i = 0; i <= 4; i++) c.fillRect(X(14 + i * 3) - 0.06 * sx, Z(48.6), 0.12 * sx, 4.7 * sx);
    c.fillStyle = 'rgba(239,91,111,0.8)';
    heartPath(c, X(MARKET.target), Z(52.8), 0.35 * sx);
    c.fill();
  }, 0.036);
  const wetMats = [roadMat, ringMat, lotMat, laneMat, baysMat];

  // ---------------------------------------------------------------- road paint
  const white = mat('#fffaf0', { rough: 0.8 });
  const paintBox = (w, d, x, z, ry = 0) => {
    const b = mesh(k.geo(`pb${w},${d}`, () => new THREE.BoxGeometry(w, 0.012, d)), white, { cast: false });
    return put(b, x, z, ry, 0.04);
  };
  paintBox(ROAD_W, 0.36, 0, STOP_Z);
  paintBox(ROAD_W, 0.36, 0, LIGHT_Z);
  for (let i = 0; i < 6; i++) paintBox(0.46, ZEBRA.z1 - ZEBRA.z0, ZEBRA.x0 + 0.2 + i * 0.84, (ZEBRA.z0 + ZEBRA.z1) / 2);
  for (let i = 0; i < 6; i++) paintBox(0.45, 0.2, 17.0 + i * 0.8, 6.3);
  // Give way dashes at the roundabout's west entry
  for (let i = 0; i < 6; i++) paintBox(0.2, 0.45, RC.x - R_OUT - 0.25, -12.0 + i * 0.8);
  // School crossing: stripes along the road, one hiding a tiny pink heart
  const [zb0, zb1] = SCHOOL.zeb;
  for (let i = 0; i < 6; i++) paintBox(zb1 - zb0, 0.46, (zb0 + zb1) / 2, -12.0 + i * 0.84);
  const tinyHeart = k.heart(0.12, 0.01, C.pink);
  tinyHeart.rotation.x = -Math.PI / 2;
  add(tinyHeart, zb1 - 0.3, 0.05, -12.0 + 3 * 0.84);
  // Hill start line on the slope, and the bridge give way line
  {
    const z = HILL.stopZ;
    const slope = Math.atan2(heightAt(HILL.x, z + 0.2) - heightAt(HILL.x, z - 0.2), 0.4);
    const b = paintBox(ROAD_W, 0.36, HILL.x, z);
    b.rotation.x = -slope;
  }
  for (let i = 0; i < 6; i++) paintBox(0.45, 0.2, 58.0 + i * 0.8, BRIDGE.line);
  // Painted words
  cells.stopWord = atlas.add((c, w, h) => paintText(c, 'STOP', w / 2, h / 2 + 4, h * 0.5, '#fffaf0'), 2);
  cells.slowWord = atlas.add((c, w, h) => paintText(c, 'SLOW', w / 2, h / 2 + 4, h * 0.5, '#fffaf0'), 2);
  cells.schoolWord = atlas.add((c, w, h) => paintText(c, 'SCHOOL', w / 2, h / 2 + 4, h * 0.42, '#ffd166'), 2);
  const word = (cell, x, z, ry = 0, s = 1) => {
    const p = atlas.plane(2.6 * s, 1.3 * s, cell);
    p.rotation.set(-Math.PI / 2, 0, ry);
    put(p, x, z, 0, 0.045);
  };
  word(cells.stopWord, 0, 13.6);
  word(cells.slowWord, 19, 3.6);
  word(cells.schoolWord, 31.8, -10, -Math.PI / 2, 1.1);
  word(cells.slowWord, 60, 23.0, 0, 0.8);
  // Speed bumps on School Street: soft yellow and white humps
  const bumpMat = mat(C.sun, { rough: 0.7 });
  for (const x of SCHOOL.bumps) {
    const hump = mesh(k.geo('hump', () => {
      const g = new THREE.CylinderGeometry(0.5, 0.5, ROAD_W - 0.2, 16, 1, false, 0, Math.PI);
      g.rotateX(Math.PI / 2);
      g.rotateZ(Math.PI / 2);
      g.scale(1, 0.18, 1);
      return g;
    }), bumpMat, { cast: false });
    add(hump, x, 0.02, SCHOOL.z);
    for (let i = 0; i < 4; i++) add(box(0.5, 0.012, 0.34, C.white), x, 0.112, SCHOOL.z - 1.6 + i * 1.07);
  }

  // ---------------------------------------------------------------- traffic light and signs
  const lampMats = lightMats(umat);
  setLight(lampMats, 'red');
  add(makeTrafficLight(k, lampMats, { pole: 2.3 }), 3.1, 0, LIGHT_Z + 0.2);
  col({ type: 'circle', x: 3.1, z: LIGHT_Z + 0.2, r: 0.2 });
  const signs = [
    ['stop', 3.0, STOP_Z + 0.4, 0.78, 1.5],
    ['roundabout', -3.1, 1.4, 0.68, 1.5],
    ['lights', -3.0, 7.0, 0.66, 1.5],
    ['speed20', -3.1, 28.6, 0.6, 1.5],
    ['animal', 3.3, 26.6, 0.6, 1.4],
    ['giveway', 8.0, -13.4, 0.7, 1.4],
    ['duck', 15.6, 4.6, 0.72, 1.5],
    ['zebra', 22.5, 5.4, 0.6, 1.5],
    ['parking', 11.6, 19.0, 0.62, 1.6],
    ['school', 31.4, -13.6, 0.72, 1.5],
    ['speed20', 31.4, -6.4, 0.6, 1.5],
    ['bump', 33.4, -6.4, 0.6, 1.4],
    ['zebra', 37.6, -13.6, 0.58, 1.5],
    ['hill', 62.9, 0.2, 0.66, 1.4],
    ['narrow', 62.9, 18.0, 0.66, 1.4],
    ['oncoming', 57.1, 19.4, 0.62, 1.4],
    ['parking', 18.6, 40.9, 0.56, 1.5],
  ];
  for (const [kind, x, z, s, p] of signs) {
    put(signPost(k, atlas, cells, kind, { size: s, post: p }), x, z);
    col({ type: 'circle', x, z, r: 0.15 });
  }
  // Balloon arch over the cone gate
  const arch = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 14, 10), new THREE.MeshStandardMaterial({ roughness: 0.35 }), 25);
  const archCols = [C.rose, C.sun, C.sky, C.mint, C.pink, C.white];
  for (let i = 0; i < 25; i++) {
    const a = (i / 24) * Math.PI;
    arch.setMatrixAt(i, m4.makeTranslation(Math.cos(a) * 3.3, 0.25 + Math.sin(a) * 3.4, GATE_Z));
    arch.setColorAt(i, tmpC.set(archCols[i % archCols.length]));
  }
  arch.castShadow = true;
  world.add(arch);
  col({ type: 'circle', x: -3.3, z: GATE_Z, r: 0.3 });
  col({ type: 'circle', x: 3.3, z: GATE_Z, r: 0.3 });
  cells.gateWord = atlas.add((c, w, h) => {
    c.fillStyle = '#ffffff';
    roundRect(c, 4, 50, w - 8, h - 100, 50);
    c.fill();
    paintText(c, 'Cone gate', w / 2, h / 2 + 4, h * 0.24, C.rose);
  }, 2);
  add(atlas.plane(1.6, 0.8, cells.gateWord, { cast: true }), 0, 3.75, GATE_Z + 0.32);
  // The start board
  cells.startBoard = atlas.add((c, w, h) => {
    c.fillStyle = '#ffffff';
    roundRect(c, 4, 4, w - 8, h - 8, 40);
    c.fill();
    c.lineWidth = 10;
    c.strokeStyle = C.sunDeep;
    c.stroke();
    drawWheelBadge(c, 90, h / 2, 54);
    paintText(c, "Abu Sanad's", w * 0.6, h * 0.3, h * 0.2, C.teal);
    paintText(c, 'DRIVING COURSE', w * 0.6, h * 0.58, h * 0.15, C.ink, 700);
    paintText(c, 'Little Wheels', w * 0.6, h * 0.8, h * 0.12, C.rose, 600);
  }, 3);
  {
    const board = new THREE.Group();
    board.add(at(rbox(3.2, 1.2, 0.12, C.woodDark, 0.05), 0, 1.6, -0.07));
    board.add(at(atlas.plane(3.0, 1.0, cells.startBoard), 0, 1.6, 0.0));
    for (const s of [-1, 1]) board.add(at(box(0.14, 1.6, 0.14, C.woodDark), s * 1.2, 0.8, -0.1));
    add(board, -5.2, 0, 41.2, 0.3);
    col({ type: 'box', x: -5.2, z: 41.1, hw: 1.5, hd: 0.3 });
  }

  // ---------------------------------------------------------------- the duck hut and pond
  {
    const hut = new THREE.Group();
    hut.add(at(rbox(1.3, 0.9, 1.0, C.peach, 0.06), 0, 0.45, 0));
    for (const s of [-1, 1]) {
      const r = rbox(0.9, 0.08, 1.2, C.rose, 0.03);
      r.rotation.z = s * -0.6;
      hut.add(at(r, s * 0.34, 1.08, 0));
    }
    const hole = at(cyl(0.24, 0.24, 0.04, C.ink, 16), 0, 0.42, 0.5);
    hole.rotation.x = Math.PI / 2;
    hut.add(hole);
    hut.add(at(k.heart(0.18, 0.03, C.white), 0, 0.72, 0.52));
    add(hut, 13.4, 0, 9.6, 0.4);
    col({ type: 'circle', x: 13.4, z: 9.6, r: 0.8 });
    add(cyl(POND.r + 0.25, POND.r + 0.3, 0.2, C.cream, 28), POND.x, 0.1, POND.z);
    add(cyl(POND.r, POND.r, 0.04, '#7fcfe0', 28, { rough: 0.15 }), POND.x, 0.19, POND.z);
    for (const [a, rr] of [[0.5, 1.0], [2.6, 0.8], [4.4, 1.1]]) add(cyl(0.22, 0.22, 0.02, C.leaf, 12), POND.x + Math.cos(a) * rr, 0.215, POND.z + Math.sin(a) * rr);
    col({ type: 'circle', x: POND.x, z: POND.z, r: POND.r + 0.25 });
    // A tree by the pond with a carved heart: "R + H"
    const t = tree(k, 0.9, 1);
    add(t, 29.6, 0, 6.6);
    col({ type: 'circle', x: 29.6, z: 6.6, r: 0.25 });
    cells.carved = atlas2.add((c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.fillStyle = '#7a4a2a';
      heartPath(c, w / 2, h * 0.52, w * 0.42);
      c.fill();
      c.fillStyle = '#c99a6a';
      heartPath(c, w / 2, h * 0.52, w * 0.34);
      c.fill();
      paintText(c, 'R + H', w / 2, h * 0.42, h * 0.2, '#7a4a2a', 700);
    });
    const carve = atlas2.plane(0.28, 0.28, cells.carved);
    add(carve, 29.6, 0.95, 6.6 + 0.19);
  }

  // ---------------------------------------------------------------- car park
  const PARKED = [[13.5, C.lilac], [19.5, C.pink], [25.5, C.mint]];
  const parkedCar = (x, z, yaw, colr) => {
    const pc = ctx.models.car(colr);
    pc.root.position.set(x, 0, z);
    pc.yaw = yaw;
    pc.update(0, 0);
    world.add(pc.root);
    const along = Math.abs(Math.sin(yaw)) > 0.7;
    col({ type: 'box', x, z, hw: along ? 1.42 : 0.86, hd: along ? 0.86 : 1.42 });
    return pc;
  };
  for (const [x, colr] of PARKED) parkedCar(x, BAY.z, 0, colr);
  add(rbox(LOT.x1 - LOT.x0 - 0.4, 0.22, 0.7, C.cream, 0.06), (LOT.x0 + LOT.x1) / 2, 0.11, LOT.z1 + 0.45);
  add(box(LOT.x1 - LOT.x0 - 0.7, 0.04, 0.5, '#9a6a45'), (LOT.x0 + LOT.x1) / 2, 0.23, LOT.z1 + 0.45);
  for (let x = LOT.x0 + 0.5; x < LOT.x1 - 0.4; x += 0.28) flowers.push([x, 0.24, LOT.z1 + 0.45 + (R() - 0.5) * 0.3, Math.floor(R() * 7), 1.1]);
  for (const x of [LOT.x0 - 0.6, LOT.x1 + 0.6]) {
    const b = sph(0.7, C.leaf, { rough: 0.9 }, 12);
    b.scale.set(1.1, 0.85, 1);
    add(b, x, 0.5, LOT.z1 + 0.4);
    col({ type: 'circle', x, z: LOT.z1 + 0.4, r: 0.7 });
  }
  col({ type: 'box', x: (LOT.x0 + LOT.x1) / 2, z: LOT.z1 + 0.45, hw: (LOT.x1 - LOT.x0) / 2, hd: 0.35 });

  // ---------------------------------------------------------------- School Street
  const pave = mat('#f3e4cf', { rough: 0.9 });
  const paveEdge = mat('#e6d2b8', { rough: 0.9 });
  const pavement = (x0, z0, x1, z1) => {
    add(box(x1 - x0, 0.14, z1 - z0, pave), (x0 + x1) / 2, 0.07, (z0 + z1) / 2);
    add(box(x1 - x0, 0.03, 0.1, paveEdge), (x0 + x1) / 2, 0.15, z1 - 0.05);
    add(box(x1 - x0, 0.03, 0.1, paveEdge), (x0 + x1) / 2, 0.15, z0 + 0.05);
    col({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: (x1 - x0) / 2, hd: (z1 - z0) / 2 });
  };
  pavement(29.6, -15.4, 51.4, -12.75);
  pavement(29.6, -7.25, 51.4, -5.0);
  // The school: peach walls, a teal roof, a bell tower and crayon drawings in the windows
  {
    const SX = 40;
    const SZ = -22;
    const BW = 12;
    const BD = 6.6;
    const H = 3.4;
    add(rbox(BW, H, BD, C.peach, 0.1), SX, H / 2, SZ);
    add(box(BW + 0.06, 0.4, BD + 0.06, C.white), SX, 0.2, SZ);
    add(box(BW + 0.06, 0.12, BD + 0.06, C.sun), SX, 2.5, SZ);
    for (const s of [-1, 1]) {
      const slab = rbox(BW + 0.6, 0.18, BD / 2 + 0.9, C.teal, 0.06);
      slab.rotation.x = s * 0.5;
      add(slab, SX, H + 0.6, SZ + s * (BD / 4 + 0.05));
    }
    add(rbox(1.6, 1.9, 1.6, C.cream, 0.08), SX, H + 1.5, SZ);
    const bellRoof = cone(1.25, 1.0, C.rose, 4);
    bellRoof.rotation.y = Math.PI / 4;
    add(bellRoof, SX, H + 2.95, SZ);
    const clock = cyl(0.42, 0.42, 0.06, C.white, 20);
    clock.rotation.x = Math.PI / 2;
    add(clock, SX, H + 1.6, SZ + 0.82);
    add(box(0.04, 0.26, 0.03, C.ink), SX, H + 1.68, SZ + 0.86);
    add(box(0.2, 0.04, 0.03, C.ink), SX + 0.08, H + 1.6, SZ + 0.86);
    col({ type: 'box', x: SX, z: SZ, hw: BW / 2, hd: BD / 2 });
    // Door and sign
    const FZ = SZ + BD / 2;
    add(rbox(1.6, 2.2, 0.14, C.white, 0.05), SX, 1.1, FZ + 0.02);
    add(rbox(1.3, 1.95, 0.1, C.sky, 0.05), SX, 1.0, FZ + 0.08);
    cells.schoolSign = atlas2.add((c, w, h) => {
      c.fillStyle = '#ffffff';
      roundRect(c, 6, 30, w - 12, h - 60, 50);
      c.fill();
      c.lineWidth = 10;
      c.strokeStyle = C.sun;
      c.stroke();
      paintText(c, 'Sunny Lane School', w / 2, h * 0.44, h * 0.24, C.teal);
      paintText(c, 'Little minds, big hearts', w / 2, h * 0.7, h * 0.13, C.rose, 600);
    }, 3);
    add(atlas2.plane(3.6, 1.2, cells.schoolSign), SX, 2.95, FZ + 0.06);
    // Windows with drawings. One shows Roji and Homama holding hands.
    const drawing = (kind) => (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      c.lineCap = 'round';
      c.lineJoin = 'round';
      if (kind === 0) {
        c.fillStyle = '#ffd166';
        c.beginPath();
        c.arc(w * 0.74, h * 0.28, w * 0.13, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#9ad06a';
        c.fillRect(0, h * 0.78, w, h * 0.22);
        c.fillStyle = '#ff9eb5';
        c.fillRect(w * 0.2, h * 0.46, w * 0.34, h * 0.32);
        c.fillStyle = '#ef5b6f';
        c.beginPath();
        c.moveTo(w * 0.14, h * 0.48);
        c.lineTo(w * 0.37, h * 0.26);
        c.lineTo(w * 0.6, h * 0.48);
        c.fill();
      } else if (kind === 1) {
        // Roji and Homama, crayon style, holding hands under a heart
        c.fillStyle = '#9ad06a';
        c.fillRect(0, h * 0.84, w, h * 0.16);
        const fig = (x, top, hair, girl) => {
          c.fillStyle = '#f8dccb';
          c.beginPath();
          c.arc(x, h * 0.36, w * 0.1, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = hair;
          c.beginPath();
          c.arc(x, h * 0.33, w * 0.105, Math.PI, 0);
          c.fill();
          if (girl) {
            c.beginPath();
            c.arc(x - w * 0.1, h * 0.38, w * 0.04, 0, Math.PI * 2);
            c.arc(x + w * 0.1, h * 0.38, w * 0.04, 0, Math.PI * 2);
            c.fill();
          }
          c.fillStyle = top;
          c.beginPath();
          c.moveTo(x - w * (girl ? 0.12 : 0.08), h * 0.72);
          c.lineTo(x - w * 0.06, h * 0.47);
          c.lineTo(x + w * 0.06, h * 0.47);
          c.lineTo(x + w * (girl ? 0.12 : 0.08), h * 0.72);
          c.fill();
          c.strokeStyle = '#3b2b3f';
          c.lineWidth = w * 0.025;
          c.beginPath();
          c.moveTo(x - w * 0.04, h * 0.72);
          c.lineTo(x - w * 0.05, h * 0.84);
          c.moveTo(x + w * 0.04, h * 0.72);
          c.lineTo(x + w * 0.05, h * 0.84);
          c.stroke();
        };
        fig(w * 0.34, '#ef5b6f', '#2a1a13', true);
        fig(w * 0.66, '#3f7bf0', '#141010', false);
        c.strokeStyle = '#f8c9a8';
        c.lineWidth = w * 0.03;
        c.beginPath();
        c.moveTo(w * 0.42, h * 0.56);
        c.lineTo(w * 0.58, h * 0.56);
        c.stroke();
        c.fillStyle = '#ef5b6f';
        heartPath(c, w * 0.5, h * 0.17, w * 0.12);
        c.fill();
      } else {
        c.strokeStyle = '#3f7bf0';
        c.lineWidth = w * 0.04;
        c.beginPath();
        c.moveTo(0, h * 0.7);
        c.bezierCurveTo(w * 0.3, h * 0.5, w * 0.6, h * 0.9, w, h * 0.6);
        c.stroke();
        c.fillStyle = '#ffd166';
        for (let i = 0; i < 4; i++) {
          c.beginPath();
          c.arc(w * (0.2 + i * 0.2), h * (0.3 + (i % 2) * 0.1), w * 0.05, 0, Math.PI * 2);
          c.fill();
        }
      }
    };
    cells.draw0 = atlas2.add(drawing(0));
    cells.draw1 = atlas2.add(drawing(1));
    cells.draw2 = atlas2.add(drawing(2));
    const glass = winMat;
    [[-4.4, 'draw0'], [-2.4, 'draw2'], [2.4, null], [4.4, 'draw1']].forEach(([dx, cell]) => {
      add(rbox(1.3, 1.1, 0.12, C.white, 0.05), SX + dx, 1.6, FZ + 0.02);
      add(box(1.1, 0.92, 0.06, glass), SX + dx, 1.6, FZ + 0.06);
      add(box(0.05, 0.92, 0.04, C.white), SX + dx, 1.6, FZ + 0.1);
      if (cell) {
        const p = atlas2.plane(0.42, 0.42, cells[cell]);
        p.rotation.z = (dx % 3) * 0.05;
        add(p, SX + dx + 0.26, 1.5, FZ + 0.11);
      }
      const aw = cyl(0.3, 0.3, 1.4, dx > 0 ? C.sun : C.rose, 12);
      aw.rotation.z = Math.PI / 2;
      aw.scale.set(1, 1, 0.6);
      add(aw, SX + dx, 2.25, FZ + 0.14);
    });
    // The yard: a picket fence with a gate at the crossing, hopscotch and a bench
    const pick = [];
    for (let x = 30.2; x < 50.9; x += 0.42) if (x < zb0 - 0.1 || x > zb1 + 0.1) pick.push(x);
    const pickGeo = new THREE.BoxGeometry(0.1, 0.72, 0.06);
    pickGeo.translate(0, 0.36, 0);
    const picks = new THREE.InstancedMesh(pickGeo, mat(C.white), pick.length);
    pick.forEach((x, i) => picks.setMatrixAt(i, m4.makeTranslation(x, 0.14, -15.25)));
    picks.castShadow = true;
    world.add(picks);
    for (const [x0, x1] of [[30.1, zb0 - 0.1], [zb1 + 0.1, 51]]) add(box(x1 - x0, 0.06, 0.05, C.white), (x0 + x1) / 2, 0.6, -15.25);
    for (const x of [zb0 - 0.1, zb1 + 0.1]) {
      add(cyl(0.08, 0.08, 1.0, C.sun, 10), x, 0.5, -15.25);
      add(sph(0.11, C.rose, undefined, 10), x, 1.05, -15.25);
    }
    const hop = paintPlane(34.2, -18.3, 36.6, -15.6, (c, sx, X, Z, W, H) => {
      c.fillStyle = '#e9dccb';
      c.fillRect(0, 0, W, H);
      c.strokeStyle = '#ff9eb5';
      c.lineWidth = 0.06 * sx;
      for (let i = 0; i < 4; i++) c.strokeRect(W * 0.3, i * H * 0.24 + 0.1 * sx, W * 0.4, H * 0.22);
      paintText(c, '1 2 3', W / 2, H * 0.9, 0.3 * sx, '#ef5b6f');
    }, 0.015, 256);
    void hop;
    add(tree(k, 0.75, 0), 47.6, 0, -17.2);
    col({ type: 'circle', x: 47.6, z: -17.2, r: 0.25 });
  }
  // The little park south of School Street: a see-saw, a bench and flower beds
  {
    const saw = new THREE.Group();
    saw.add(at(box(0.3, 0.4, 0.3, C.teal), 0, 0.2, 0));
    const plank = rbox(2.6, 0.08, 0.3, C.sun, 0.03);
    plank.rotation.z = 0.12;
    saw.add(at(plank, 0, 0.44, 0));
    for (const s of [-1, 1]) saw.add(at(cyl(0.03, 0.03, 0.3, C.rose, 6), s * 1.1, 0.6 - s * 0.13, 0));
    add(saw, 36.0, 0, -2.6);
    col({ type: 'box', x: 36.0, z: -2.6, hw: 1.3, hd: 0.2, h: 0.5 });
    const bench = new THREE.Group();
    for (const dz of [-0.14, 0, 0.14]) bench.add(at(rbox(1.6, 0.06, 0.12, C.wood, 0.02), 0, 0.45, dz));
    for (const y of [0.68, 0.86]) bench.add(at(rbox(1.6, 0.11, 0.05, C.wood, 0.02), 0, y, -0.23));
    for (const s of [-1, 1]) bench.add(at(rbox(0.08, 0.45, 0.44, C.teal, 0.03), s * 0.66, 0.225, 0));
    add(bench, 41.0, 0, -2.2);
    col({ type: 'box', x: 41.0, z: -2.2, hw: 0.82, hd: 0.27, h: 0.48 });
    for (let i = 0; i < 40; i++) flowers.push([31 + R() * 18, 0, -4.4 + R() * 0.5, Math.floor(R() * 7), 1]);
  }

  // ---------------------------------------------------------------- Market Street
  pavement(MARKET.lane[0] - 0.2, 39.4, MARKET.lane[1] + 0.2, 41.75);
  pavement(MARKET.bus[0] - 1.5, 48.7, MARKET.bus[1] + 1.5, 50.6);
  {
    // Three shops facing the street
    const shop = (x, wall, roof, cell) => {
      add(rbox(7.2, 3.0, 2.8, wall, 0.08), x, 1.5, 37.9);
      add(box(7.26, 0.32, 2.86, C.white), x, 0.16, 37.9);
      add(rbox(7.6, 0.3, 3.2, roof, 0.08), x, 3.12, 37.9);
      add(rbox(2.6, 1.3, 0.1, C.white, 0.04), x - 1.6, 1.35, 39.32);
      add(box(2.36, 1.1, 0.06, winMat), x - 1.6, 1.35, 39.36);
      add(rbox(1.2, 2.0, 0.1, C.white, 0.04), x + 1.7, 1.0, 39.32);
      add(rbox(1.0, 1.85, 0.08, roof, 0.04), x + 1.7, 0.95, 39.37);
      const aw = cyl(0.36, 0.36, 3.0, roof, 14);
      aw.rotation.z = Math.PI / 2;
      aw.scale.set(1, 1, 0.65);
      add(aw, x - 1.6, 2.2, 39.45);
      add(atlas2.plane(3.4, 0.85, cells[cell]), x + 0.6, 2.7, 39.36);
      col({ type: 'box', x, z: 37.9, hw: 3.6, hd: 1.4 });
    };
    const shopSign = (title, color) => (c, w, h) => {
      c.fillStyle = '#ffffff';
      roundRect(c, 6, 24, w - 12, h - 48, 40);
      c.fill();
      c.lineWidth = 8;
      c.strokeStyle = color;
      c.stroke();
      paintText(c, title, w / 2, h / 2 + 4, h * 0.36, color);
    };
    cells.bakery = atlas2.add(shopSign('Little Bakery', C.sunDeep), 3);
    cells.flowers = atlas2.add(shopSign('Flowers', C.rose), 3);
    cells.cafe = atlas2.add(shopSign('Corner Cafe', C.teal), 3);
    shop(23.6, C.cream, C.sunDeep, 'bakery');
    shop(32.0, C.blush, C.rose, 'flowers');
    shop(40.4, C.mintPale, C.teal, 'cafe');
    // Bread loaves in the bakery window, buckets of flowers, a cafe chalkboard
    for (let i = 0; i < 4; i++) {
      const loaf = sph(0.16, C.wood, undefined, 10);
      loaf.scale.set(1.5, 0.7, 0.8);
      add(loaf, 21.4 + i * 0.45, 0.95, 39.2);
    }
    for (let i = 0; i < 4; i++) {
      add(cyl(0.2, 0.16, 0.36, [C.sky, C.sun, C.mint, C.lilac][i], 12), 28.0 + i * 0.6, 0.32, 40.0);
      for (let j = 0; j < 6; j++) flowers.push([28.0 + i * 0.6 + (R() - 0.5) * 0.22, 0.3, 40.0 + (R() - 0.5) * 0.2, Math.floor(R() * 7), 1.6]);
    }
    cells.chalk = atlas2.add((c, w, h) => {
      c.fillStyle = '#3d4a46';
      roundRect(c, 10, 6, w - 20, h - 12, 18);
      c.fill();
      c.lineWidth = 10;
      c.strokeStyle = C.wood;
      c.stroke();
      paintText(c, 'Today', w / 2, h * 0.17, h * 0.1, '#ffd166');
      paintText(c, 'Spanish latte', w / 2, h * 0.36, h * 0.085, '#ffffff', 600);
      paintText(c, 'for Roji,', w / 2, h * 0.5, h * 0.085, '#ffffff', 600);
      paintText(c, 'on Homama', w / 2, h * 0.64, h * 0.085, '#ffffff', 600);
      c.fillStyle = '#ff9eb5';
      heartPath(c, w / 2, h * 0.82, h * 0.09);
      c.fill();
    });
    const chalk = new THREE.Group();
    const cp = atlas2.plane(0.62, 0.82, cells.chalk);
    cp.rotation.x = -0.18;
    chalk.add(at(cp, 0, 0.55, 0.06));
    for (const s of [-1, 1]) {
      const leg = box(0.04, 1.0, 0.04, C.woodDark);
      leg.rotation.x = s * 0.2;
      chalk.add(at(leg, s * 0.27, 0.48, s * -0.05));
    }
    add(chalk, 43.0, 0.14, 40.3, -0.2);
    col({ type: 'circle', x: 43.0, z: 40.3, r: 0.3 });
    // Parked cars along the lane, with the gap for Roji
    const laneCols = [C.mint, C.lilac, C.pink, C.sky, C.peach];
    MARKET.parked.forEach((x, i) => parkedCar(x, MARKET.laneZ, i % 2 ? Math.PI / 2 : -Math.PI / 2, laneCols[i]));
    // Reverse bays on the south side: a car either side of the target bay
    parkedCar(15.5, MARKET.bayZ, 0, C.sky);
    parkedCar(21.5, MARKET.bayZ, Math.PI, C.coral);
    add(rbox(13.4, 0.5, 0.6, C.leafDark, 0.12), 20, 0.25, 54.2);
    for (let x = 13.6; x < 26.4; x += 0.3) flowers.push([x, 0.5, 54.1 + (R() - 0.5) * 0.2, Math.floor(R() * 7), 1]);
    col({ type: 'box', x: 20, z: 54.2, hw: 6.7, hd: 0.3 });
    // Bike stand in the last bay
    for (let i = 0; i < 3; i++) {
      const hoop = k.tor(0.3, 0.03, C.teal, Math.PI, undefined, 10);
      add(hoop, 23.9 + i * 0.6, 0.02, 51.6);
    }
    col({ type: 'box', x: 24.5, z: 51.6, hw: 1.0, hd: 0.25 });
    // Bus stop with a little shelter
    const BX = (MARKET.bus[0] + MARKET.bus[1]) / 2;
    add(rbox(4.0, 0.12, 1.3, C.teal, 0.05), BX, 2.45, 49.9);
    for (const s of [-1, 1]) add(cyl(0.05, 0.05, 2.3, C.white, 8), BX + s * 1.85, 1.29, 49.4);
    add(rbox(3.6, 1.6, 0.06, mat('#d9f2ff', { rough: 0.2 }), 0.03), BX, 1.3, 50.45);
    add(rbox(2.6, 0.08, 0.4, C.wood, 0.03), BX, 0.58, 50.15);
    cells.bus = atlas2.add((c, w, h) => {
      c.fillStyle = C.sun;
      c.beginPath();
      c.arc(w / 2, h / 2, w * 0.46, 0, Math.PI * 2);
      c.fill();
      paintText(c, 'BUS', w / 2, h / 2 + 4, h * 0.3, C.ink);
    });
    add(cyl(0.04, 0.04, 2.4, C.steel, 8), BX + 2.4, 1.34, 49.2);
    add(atlas2.plane(0.5, 0.5, cells.bus), BX + 2.4, 2.4, 49.25);
    col({ type: 'circle', x: BX + 2.4, z: 49.2, r: 0.1 });
  }

  // ---------------------------------------------------------------- the stream, the bridge and the farm
  {
    const pts = [];
    for (let x = STREAM.x0; x <= STREAM.x1; x += 0.5) pts.push(new THREE.Vector3(x, 0, STREAM.z + (Math.abs(x - 60) < 4 ? 0 : Math.sin(x * 0.35) * 0.35)));
    world.add(mesh(ribbon(pts, STREAM.hw * 2 + 1.0, () => 0.012), mat('#e8d6b0', { rough: 0.95 }), { cast: false }));
    const water = new THREE.MeshStandardMaterial({ color: '#7fcfe0', roughness: 0.12, metalness: 0.05 });
    world.add(mesh(ribbon(pts, STREAM.hw * 2, () => 0.02), water, { cast: false }));
    // A round pond at the west end
    add(cyl(3.2, 3.3, 0.04, mat('#e8d6b0', { rough: 0.95 }), 28), STREAM.x0, 0.01, STREAM.z);
    add(cyl(2.7, 2.7, 0.04, water, 28), STREAM.x0, 0.025, STREAM.z);
    col({ type: 'circle', x: STREAM.x0, z: STREAM.z, r: 3.1 });
    col({ type: 'box', x: (STREAM.x0 + BRIDGE.x - BRIDGE.hw - 0.2) / 2, z: STREAM.z, hw: (BRIDGE.x - BRIDGE.hw - 0.2 - STREAM.x0) / 2, hd: STREAM.hw + 0.2 });
    col({ type: 'box', x: (STREAM.x1 + BRIDGE.x + BRIDGE.hw + 0.2) / 2, z: STREAM.z, hw: (STREAM.x1 - BRIDGE.x - BRIDGE.hw - 0.2) / 2, hd: STREAM.hw + 0.2 });
    for (let i = 0; i < 26; i++) {
      const x = STREAM.x0 + 2 + R() * (STREAM.x1 - STREAM.x0 - 4);
      if (Math.abs(x - 60) < 3) continue;
      const s = sph(0.16 + R() * 0.14, R() < 0.5 ? '#cfc6c0' : '#bdb4ae', undefined, 8);
      s.scale.y = 0.6;
      add(s, x, 0.06, STREAM.z + (R() < 0.5 ? -1 : 1) * (STREAM.hw + 0.2));
    }
    for (const [x, z] of [[52, 27.2], [55, 28.8], [66, 27.4], [70, 28.6]]) {
      add(cyl(0.24, 0.24, 0.02, C.leaf, 12), x, 0.035, z);
      add(sph(0.06, C.pink, undefined, 8), x + 0.05, 0.07, z);
    }
    // The bridge: a little hump of wooden planks with white rails
    const n = 14;
    const L = BRIDGE.z1 - BRIDGE.z0;
    for (let i = 0; i < n; i++) {
      const z0 = BRIDGE.z0 + (i / n) * L;
      const z1 = BRIDGE.z0 + ((i + 1) / n) * L;
      const h0 = heightAt(BRIDGE.x, z0 + 0.001);
      const h1 = heightAt(BRIDGE.x, z1 - 0.001);
      const plank = box(BRIDGE.hw * 2 + 0.2, 0.14, Math.hypot(z1 - z0, h1 - h0) + 0.02, i % 2 ? C.wood : '#c99863');
      plank.rotation.x = -Math.atan2(h1 - h0, z1 - z0);
      add(plank, BRIDGE.x, (h0 + h1) / 2 - 0.04, (z0 + z1) / 2);
    }
    for (const s of [-1, 1]) {
      const x = BRIDGE.x + s * (BRIDGE.hw + 0.12);
      for (let i = 0; i <= 8; i++) {
        const z = BRIDGE.z0 + 0.25 + (i / 8) * (L - 0.5);
        add(box(0.12, 0.62, 0.12, C.white), x, heightAt(BRIDGE.x, z) + 0.31, z);
      }
      for (let i = 0; i < 8; i++) {
        const z0 = BRIDGE.z0 + 0.25 + (i / 8) * (L - 0.5);
        const z1 = BRIDGE.z0 + 0.25 + ((i + 1) / 8) * (L - 0.5);
        const h0 = heightAt(BRIDGE.x, z0);
        const h1 = heightAt(BRIDGE.x, z1);
        const rail = box(0.1, 0.08, Math.hypot(z1 - z0, h1 - h0) + 0.04, C.rose);
        rail.rotation.x = -Math.atan2(h1 - h0, z1 - z0);
        add(rail, x, (h0 + h1) / 2 + 0.62, (z0 + z1) / 2);
      }
      col({ type: 'box', x: BRIDGE.x + s * (BRIDGE.hw + 0.12), z: (BRIDGE.z0 + BRIDGE.z1) / 2, hw: 0.08, hd: L / 2, rail: true });
      for (const z of [BRIDGE.z0 - 0.15, BRIDGE.z1 + 0.15]) {
        add(rbox(0.5, 0.8, 0.5, '#d9cfc6', 0.08), BRIDGE.x + s * (BRIDGE.hw + 0.4), 0.4, z);
        add(sph(0.18, C.sun, undefined, 10), BRIDGE.x + s * (BRIDGE.hw + 0.4), 0.92, z);
        col({ type: 'circle', x: BRIDGE.x + s * (BRIDGE.hw + 0.4), z, r: 0.32, rail: true });
      }
    }
    // Chevrons narrowing toward the bridge
    for (const z of [BRIDGE.z0 - 2.2, BRIDGE.z1 + 2.2]) for (const s of [-1, 1]) paintBox(0.14, 1.6, BRIDGE.x + s * 1.6, z, s * (z < BRIDGE.z0 ? 0.35 : -0.35));
    // The farm: a red barn north of the stream, a field with two scarecrows south of it
    const [bx, bz] = FARM.barn;
    add(rbox(4.6, 2.8, 3.6, C.rose, 0.08), bx, 1.4, bz - 1.6);
    for (const s of [-1, 1]) {
      const r = rbox(2.9, 0.16, 4.0, C.cream, 0.05);
      r.rotation.z = s * -0.62;
      add(r, bx + s * 1.15, 3.35, bz - 1.6);
    }
    add(rbox(2.0, 2.1, 0.1, C.white, 0.05), bx, 1.05, bz + 0.22);
    for (const s of [-1, 1]) {
      const x = box(0.08, 2.6, 0.04, C.white);
      x.rotation.z = s * 0.72;
      add(x, bx, 1.05, bz + 0.28);
    }
    col({ type: 'box', x: bx, z: bz - 1.6, hw: 2.4, hd: 1.9 });
    for (const [x, z] of [[63.8, 19.0], [64.6, 18.4], [69.8, 21.5]]) {
      const hay = cyl(0.5, 0.5, 0.9, '#f2d27a', 16);
      hay.rotation.z = Math.PI / 2;
      add(hay, x, 0.5, z);
      col({ type: 'circle', x, z, r: 0.55, h: 1.0 });
    }
    for (let r = 0; r < 5; r++) {
      const row = rbox(6.2, 0.2, 0.42, '#8fb35a', 0.08);
      add(row, FARM.field[0], 0.1, FARM.field[1] + r * 0.9 - 0.2);
      for (let i = 0; i < 10; i++) add(sph(0.16, i % 3 ? C.leaf : C.leafDark, undefined, 8), FARM.field[0] - 2.8 + i * 0.62, 0.3, FARM.field[1] + r * 0.9 - 0.2);
    }
    col({ type: 'box', x: FARM.field[0], z: FARM.field[1] + 1.6, hw: 3.2, hd: 2.2 });
    // Two scarecrows holding hands: one with a pink bow, one in a blue shirt
    const crow = (x, z, shirt, bow) => {
      const g = new THREE.Group();
      g.add(at(cyl(0.04, 0.04, 1.6, C.woodDark, 6), 0, 0.8, 0));
      const arm = cyl(0.03, 0.03, 1.0, C.woodDark, 6);
      arm.rotation.z = Math.PI / 2;
      g.add(at(arm, 0, 1.2, 0));
      g.add(at(rbox(0.5, 0.55, 0.3, shirt, 0.08), 0, 1.15, 0));
      g.add(at(sph(0.2, '#f2d27a', undefined, 12), 0, 1.62, 0));
      const hat = cyl(0.3, 0.3, 0.04, '#e0b45a', 14);
      g.add(at(hat, 0, 1.78, 0));
      g.add(at(cyl(0.14, 0.17, 0.18, '#e0b45a', 12), 0, 1.88, 0));
      if (bow) g.add(at(k.heart(0.14, 0.04, C.pink), 0.14, 1.84, 0.06));
      add(g, x, 0, z);
    };
    crow(65.2, FARM.field[1] + 4.2, C.rose, true);
    crow(66.2, FARM.field[1] + 4.2, C.blue, false);
    add(k.heart(0.16, 0.03, C.rose), 65.7, 1.55, FARM.field[1] + 4.25);
  }

  // ---------------------------------------------------------------- fence
  const posts = [];
  const fenceLine = (x0, z0, x1, z1) => {
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 1.2);
    for (let i = 0; i <= n; i++) posts.push([x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n]);
    const len = Math.hypot(x1 - x0, z1 - z0);
    for (const y of [0.32, 0.62]) {
      const rail = box(len, 0.08, 0.06, C.white);
      rail.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      add(rail, (x0 + x1) / 2, y, (z0 + z1) / 2);
    }
  };
  fenceLine(FENCE.x0, FENCE.z0, FENCE.x1, FENCE.z0);
  fenceLine(FENCE.x1, FENCE.z0, FENCE.x1, FENCE.z1);
  fenceLine(FENCE.x0, FENCE.z1, FENCE.x1, FENCE.z1);
  fenceLine(FENCE.x0, FENCE.z0, FENCE.x0, FENCE.z1);
  const postGeo = new THREE.BoxGeometry(0.12, 0.85, 0.08);
  postGeo.translate(0, 0.42, 0);
  const postMesh = new THREE.InstancedMesh(postGeo, mat(C.white), posts.length);
  posts.forEach(([x, z], i) => postMesh.setMatrixAt(i, m4.makeTranslation(x, 0, z)));
  postMesh.castShadow = true;
  world.add(postMesh);
  const FW = (FENCE.x1 - FENCE.x0) / 2;
  const FD = (FENCE.z1 - FENCE.z0) / 2;
  for (const [x, z, hw, hd] of [[FENCE.x0 + FW, FENCE.z0, FW, 0.2], [FENCE.x0 + FW, FENCE.z1, FW, 0.2], [FENCE.x0, FENCE.z0 + FD, 0.2, FD], [FENCE.x1, FENCE.z0 + FD, 0.2, FD]]) col({ type: 'box', x, z, hw, hd });

  // ---------------------------------------------------------------- road test and scenery placement
  const distTo = (pts, x, z) => {
    let best = Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      const dx = pts[i].x - x;
      const dz = pts[i].z - z;
      const d = dx * dx + dz * dz;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  };
  const inRect = (x, z, x0, z0, x1, z1, pad = 0) => x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad;
  const onRoad = (x, z, pad = 0) => {
    if (Math.hypot(x - RC.x, z - RC.z) < R_OUT + 0.3 + pad) return true;
    if (inRect(x, z, LOT.x0, LOT.z0, LOT.x1, LOT.z1, pad)) return true;
    if (inRect(x, z, MARKET.lane[0], 41.7, MARKET.lane[1], 44, pad)) return true;
    if (inRect(x, z, 13.5, 48, 26.5, 53.8, pad)) return true;
    if (inRect(x, z, BRIDGE.x - BRIDGE.hw, BRIDGE.z0 - 0.5, BRIDGE.x + BRIDGE.hw, BRIDGE.z1 + 0.5, pad)) return true;
    for (const pts of ROADS) if (distTo(pts, x, z) < ROAD_W / 2 + 0.5 + pad) return true;
    return false;
  };
  const blocked = (x, z) =>
    onRoad(x, z, 3.0) ||
    Math.hypot(x - POND.x, z - POND.z) < POND.r + 1.5 ||
    Math.hypot(x - 13.4, z - 9.6) < 2.2 ||
    Math.hypot(x - 29.6, z - 6.6) < 2.4 ||
    inRect(x, z, -8, 38, -2.5, 44) ||
    inRect(x, z, 29, -27, 52, 0.5) ||
    inRect(x, z, 18.5, 35.5, 46, 41.8) ||
    inRect(x, z, 12, 46, 42, 56) ||
    inRect(x, z, 44, 24.5, 76, 31.5) ||
    inRect(x, z, 61.5, 15, 72, 25) ||
    inRect(x, z, 61.5, 32.5, 71, 44) ||
    Math.abs(x - FENCE.x0) < 1.6 ||
    Math.abs(x - FENCE.x1) < 1.6 ||
    Math.abs(z - FENCE.z0) < 1.6 ||
    Math.abs(z - FENCE.z1) < 1.6;
  let placed = 0;
  for (let i = 0; i < 1600 && placed < 78; i++) {
    const x = FENCE.x0 - 8 + R() * (FENCE.x1 - FENCE.x0 + 16);
    const z = FENCE.z0 - 8 + R() * (FENCE.z1 - FENCE.z0 + 16);
    if (blocked(x, z)) continue;
    const inside = x > FENCE.x0 && x < FENCE.x1 && z > FENCE.z0 && z < FENCE.z1;
    const s = 0.65 + R() * 0.4;
    put(tree(k, s, placed % 3, inside ? 10 : 8), x, z);
    if (inside) col({ type: 'circle', x, z, r: 0.3 * s });
    placed++;
  }
  for (let i = 0; i < 110; i++) {
    const x = FENCE.x0 + 1 + R() * (FENCE.x1 - FENCE.x0 - 2);
    const z = FENCE.z0 + 1 + R() * (FENCE.z1 - FENCE.z0 - 2);
    if (onRoad(x, z, 0.6) || inRect(x, z, 44, 25, 76, 31)) continue;
    flowers.push([x, heightAt(x, z), z, Math.floor(R() * 7), 0.9 + R() * 0.4]);
  }
  for (let i = 0; i < 50; i++) {
    const x = FENCE.x0 + 2 + R() * (FENCE.x1 - FENCE.x0 - 4);
    const z = FENCE.z0 + 2 + R() * (FENCE.z1 - FENCE.z0 - 4);
    if (blocked(x, z)) continue;
    const b = sph(0.5, i % 2 ? C.leaf : C.leafDark, { rough: 0.9 }, 12);
    b.scale.set(1.3, 0.8, 1);
    put(b, x, z, 0, 0.32);
    col({ type: 'circle', x, z, r: 0.6 });
    for (let j = 0; j < 4; j++) flowers.push([x + (R() - 0.5) * 1.6, heightAt(x, z), z + 0.5 + R() * 0.4, Math.floor(R() * 7), 0.9]);
  }
  // Bunting along the start straight and beside the duck road
  const flagGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.17, 0, 0), new THREE.Vector3(0.17, 0, 0), new THREE.Vector3(0, -0.32, 0)]);
  flagGeo.setIndex([0, 2, 1]);
  flagGeo.computeVertexNormals();
  const flagCols = [C.rose, C.sun, C.mint, C.sky, C.pink, C.white];
  const bunting = (x0, z0, x1, z1) => {
    for (const [x, z] of [[x0, z0], [x1, z1]]) {
      add(cyl(0.05, 0.06, 2.8, C.white, 8), x, 1.4, z);
      add(sph(0.08, C.sun, undefined, 8), x, 2.84, z);
      col({ type: 'circle', x, z, r: 0.12 });
    }
    const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.55);
    const ry = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2;
    for (let i = 1; i < n; i++) {
      const f = i / n;
      const pivot = new THREE.Group();
      pivot.rotation.y = ry;
      const fl = mesh(flagGeo, mat(flagCols[i % flagCols.length], { rough: 0.7, side: THREE.DoubleSide }), { cast: false });
      fl.rotation.x = -0.95;
      pivot.add(fl);
      add(pivot, x0 + (x1 - x0) * f, 2.7 - Math.sin(f * Math.PI) * 0.4, z0 + (z1 - z0) * f);
    }
  };
  bunting(-3.4, 36.5, -3.4, 31.0);
  bunting(-3.4, 20.5, -3.4, 14.5);
  bunting(3.4, 36, 3.4, 29.5);
  bunting(22.6, 11.5, 22.6, 17.5);
  bunting(15.4, 11.5, 15.4, 17.5);

  // ---------------------------------------------------------------- street lamps (they glow in the night lesson)
  const LAMPS = [
    [3.4, 38.6], [-3.5, 25.6], [3.5, 18.5], [-3.5, 4.2], [0.2, -10.6], [12.6, -18.4], [25.4, -18.4], [15.8, 2.2], [22.2, 2.6],
    [9.6, 21.0], [29.4, 21.0], [29.4, 31.4], [12.4, 49.0], [29.2, 49.2], [45.0, 49.2], [33.6, -14.2], [47.4, -14.2], [44.0, -6.2],
    [56.0, 2.4], [63.9, 12.0], [57.0, 34.0], [2.2, 47.6],
  ];
  const bulbMat = umat('#fff6d8', { emissive: '#ffd98a', ei: 0.25, rough: 0.3 });
  for (const [x, z] of LAMPS) {
    put(cyl(0.06, 0.08, 2.6, C.teal, 10), x, z, 0, 1.3);
    put(cyl(0.18, 0.22, 0.08, C.teal, 12), x, z, 0, 2.62);
    put(mesh(k.geo('bulb', () => new THREE.SphereGeometry(0.22, 14, 10)), bulbMat, { cast: false }), x, z, 0, 2.8);
    put(cone(0.27, 0.2, C.teal, 12), x, z, 0, 3.05);
    col({ type: 'circle', x, z, r: 0.12 });
  }
  // Warm pools of light on the ground (night only)
  const poolTex = tex(128, 128, (c, w) => {
    const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,214,150,0.5)');
    g.addColorStop(0.5, 'rgba(255,200,130,0.17)');
    g.addColorStop(1, 'rgba(255,214,140,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, w);
  });
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const poolGeo = new THREE.PlaneGeometry(6.4, 6.4);
  poolGeo.rotateX(-Math.PI / 2);
  const pools = new THREE.InstancedMesh(poolGeo, poolMat, LAMPS.length);
  LAMPS.forEach(([x, z], i) => pools.setMatrixAt(i, m4.makeTranslation(x, heightAt(x, z) + 0.06, z)));
  pools.visible = false;
  pools.renderOrder = 2;
  world.add(pools);
  keep.push(pools);
  // Fairy lights in a heart round the night parking bay (Homama put them there)
  const fairyMat = umat('#ffd1dc', { emissive: '#ff7fa3', ei: 2.2, rough: 0.3 });
  const fairy = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), fairyMat, 30);
  for (let i = 0; i < 30; i++) {
    const t = (i / 30) * Math.PI * 2;
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hz = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    fairy.setMatrixAt(i, m4.makeTranslation(BAY.x + hx * 0.075, 0.1, BAY.z + 2.05 - hz * 0.05));
  }
  fairy.visible = false;
  world.add(fairy);
  keep.push(fairy);

  // ---------------------------------------------------------------- dynamic markers
  // Stop box: dashed sun-yellow outline, pale fill
  const zoneTex = tex(256, 256, (c) => {
    c.fillStyle = 'rgba(255,244,190,0.55)';
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = '#ffd166';
    c.lineWidth = 18;
    c.setLineDash([34, 22]);
    c.strokeRect(9, 9, 238, 238);
  });
  const zoneMat = new THREE.MeshBasicMaterial({ map: zoneTex, transparent: true, opacity: 0.9, depthWrite: false });
  const zone = mesh(new THREE.PlaneGeometry(1, 1), zoneMat, { cast: false });
  zone.rotation.x = -Math.PI / 2;
  zone.visible = false;
  zone.renderOrder = 1;
  world.add(zone);
  keep.push(zone);
  const showZone = (x0, z0, x1, z1) => {
    zone.visible = true;
    const x = (x0 + x1) / 2;
    const z = (z0 + z1) / 2;
    zone.position.set(x, heightAt(x, z) + 0.055, z);
    zone.rotation.set(-Math.PI / 2 - Math.atan2(heightAt(x, z1) - heightAt(x, z0), z1 - z0), 0, 0);
    zone.scale.set(Math.abs(x1 - x0), Math.hypot(z1 - z0, heightAt(x, z1) - heightAt(x, z0)), 1);
  };
  // Glowing bay outline (parking targets)
  const glowMat = new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.8, depthWrite: false });
  const bayGlow = new THREE.Group();
  const bayParts = [];
  for (let i = 0; i < 4; i++) {
    const b = mesh(new THREE.BoxGeometry(1, 0.02, 1), glowMat, { cast: false });
    bayGlow.add(b);
    bayParts.push(b);
  }
  const bayFill = mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0.25, depthWrite: false }), { cast: false });
  bayFill.rotation.x = -Math.PI / 2;
  bayGlow.add(bayFill);
  // A small arrow painted in the bay showing which way the nose should point
  const noseGeo = new THREE.ShapeGeometry((() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.5);
    s.lineTo(0.4, 0);
    s.lineTo(0.16, 0);
    s.lineTo(0.16, -0.5);
    s.lineTo(-0.16, -0.5);
    s.lineTo(-0.16, 0);
    s.lineTo(-0.4, 0);
    s.closePath();
    return s;
  })());
  noseGeo.rotateX(-Math.PI / 2);
  const nose = mesh(noseGeo, glowMat, { cast: false });
  bayGlow.add(nose);
  bayGlow.visible = false;
  world.add(bayGlow);
  keep.push(bayGlow);
  const showBay = (x, z, w, d, noseDir = null) => {
    bayGlow.visible = true;
    bayGlow.position.set(x, 0.06, z);
    const [a, b, c2, d2] = bayParts;
    a.scale.set(w, 1, 0.16);
    a.position.set(0, 0, -d / 2);
    b.scale.set(w, 1, 0.16);
    b.position.set(0, 0, d / 2);
    c2.scale.set(0.16, 1, d);
    c2.position.set(-w / 2, 0, 0);
    d2.scale.set(0.16, 1, d);
    d2.position.set(w / 2, 0, 0);
    bayFill.scale.set(w - 0.1, d - 0.1, 1);
    nose.visible = noseDir !== null;
    if (noseDir !== null) {
      nose.rotation.y = noseDir;
      nose.position.set(0, 0.005, 0);
    }
  };

  // ---------------------------------------------------------------- puddles (rain lesson)
  const puddleMat = new THREE.MeshStandardMaterial({ color: '#9fc4dc', roughness: 0.04, metalness: 0.3, transparent: true, opacity: 0.85 });
  const PUDDLES = [[33.6, 47.3, 1.1, 0.6], [35.8, 47.0, 0.9, 0.55], [38.2, 47.4, 1.2, 0.7], [2.7, 43.2, 0.9, 0.6], [0.4, 30.0, 0.8, 0.5]];
  const puddles = new THREE.Group();
  for (const [x, z, rx, rz] of PUDDLES) {
    const p = mesh(k.geo('puddle', () => new THREE.CircleGeometry(1, 20)), puddleMat, { cast: false });
    p.rotation.x = -Math.PI / 2;
    p.scale.set(rx, rz, 1);
    p.position.set(x, 0.05, z);
    puddles.add(p);
  }
  puddles.visible = false;
  world.add(puddles);
  keep.push(puddles);

  // ---------------------------------------------------------------- cones (one instanced mesh, set per lesson)
  const coneBaked = colorBake(makeCone(k))[0];
  const cones = new THREE.InstancedMesh(coneBaked.geometry, coneBaked.material, 24);
  cones.castShadow = true;
  cones.receiveShadow = true;
  cones.count = 0;
  cones.frustumCulled = false;
  world.add(cones);
  keep.push(cones);

  // ---------------------------------------------------------------- ducks
  const ducks = [];
  for (let i = 0; i < 4; i++) {
    const d = makeDuck(k, i === 0 ? { color: C.white, size: 1.3 } : { color: C.sun, size: 0.75 });
    colorBake(d);
    world.add(d);
    keep.push(d);
    ducks.push({ g: d, x: 0, z: DUCK_Z, hop: 0, swimA: i * 1.6, done: true });
  }

  addFlowers(world, flowers, R);

  // Merge the static scenery
  colorBake(world, keep);
  bakeStatic(world, keep, mergeGeometries);

  return {
    world,
    keep,
    colliders,
    onRoad,
    heightAt,
    atlas,
    cells,
    lampMats,
    bulbMat,
    winMat,
    pools,
    fairy,
    fairyMat,
    zone,
    zoneMat,
    showZone,
    hideZone: () => (zone.visible = false),
    bayGlow,
    glowMat,
    showBay,
    hideBay: () => (bayGlow.visible = false),
    puddles: PUDDLES,
    puddleGroup: puddles,
    wetMats,
    roadMat,
    cones,
    ducks,
    ROADS,
    LAMPS,
  };
}
