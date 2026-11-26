import * as THREE from 'three';
import { kit, colorBake, glowTexture, fitText, roundRect, freeze, mergeGeometries } from '../../places/school/kit.js';
import { toGeo, vcMat, heartPath } from '../../places/park/parts.js';
import { canvasTexture, umat, rng } from '../../util.js';
import { buildChannel, CH } from './flume.js';
import { has } from './courses.js';

// Everything round the flume: the sky for the time of day, hills that follow the channel (so it winds
// along leafy ridges instead of standing on stilts everywhere), trees and flowers for each ride, the
// loading dock, the low branches, the waterfall, the castle, the glow-worm cave, the splash lagoon with
// its bridge of cheering people, and the ride camera at the big drop.

export const THEMES = {
  day: {
    top: '#6cc0ea', mid: '#b9e6f2', low: '#fff1d6', fog: '#fff1d6', fogR: [60, 170], hemi: 1, sun: 1,
    ground: '#7cc45a', ground2: '#5fae4a', berm: '#a7d36a', dirt: '#c9a06a',
    wallIn: '#e9c08e', wallOut: '#c58a55', trim: '#ffd166', under: '#9b6a43', post: '#a8774b', wall: 'wood', rib: '#6b5242',
    water: '#45c4d6', water2: '#5fd2df', foam: '#e9fbff', log: '#b0703f', bench: '#fff4e3',
    leaf: ['#6cc24a', '#4fae4f', '#86d05a', '#3f9a4f'], flower: ['#ff7fa3', '#ffd166', '#ff9eb5', '#ffffff', '#ff8a5c'],
  },
  sunset: {
    top: '#6a70c4', mid: '#f3a08e', low: '#ffd59a', fog: '#ffd59a', fogR: [60, 170], hemi: 0.9, sun: 0.9,
    ground: '#9cc463', ground2: '#86b257', berm: '#c8d27a', dirt: '#e2c28e',
    wallIn: '#f4e6d4', wallOut: '#e3cdb5', trim: '#f6907a', under: '#c9b49c', post: '#d9c6ae', wall: 'stone', rib: '#7a6058',
    water: '#5fb7d2', water2: '#7cc6dc', foam: '#fff2e8', log: '#a8693c', bench: '#ffd1dc',
    leaf: ['#7cbf5a', '#6aad52', '#93c86a', '#5a9a4a'], flower: ['#ef5b6f', '#ff9eb5', '#fff4e3', '#c7a6ff', '#ffd166'],
  },
  night: {
    top: '#0e1440', mid: '#27306e', low: '#3a3a7e', fog: '#3a3a7e', fogR: [35, 125], hemi: 0.5, sun: 0.38,
    ground: '#2f5a5e', ground2: '#284d58', berm: '#3c6a66', dirt: '#5a5a7a',
    wallIn: '#8a7aa8', wallOut: '#5e5286', trim: '#8fd3ff', under: '#463e66', post: '#4e4470', wall: 'wood', rib: '#2e2840',
    water: '#245f94', water2: '#3577ac', foam: '#a9d6f2', glow: 0.16, log: '#8a5a3a', bench: '#c7a6ff',
    leaf: ['#2f6a6a', '#3a5f8a', '#4a5a8a', '#2a5a5a'], flower: ['#8fd3ff', '#c7a6ff', '#7fffd4', '#ffd166'],
  },
};

const frame = () => ({ p: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3(), l: new THREE.Vector3() });
const Y = new THREE.Vector3(0, 1, 0);

// Pieces of track by their name tags: [{ d0, d1, tag }]
export function spans(track) {
  const out = [];
  let cur = null;
  for (let i = 0; i < track.N; i++) {
    const tg = track.tags[i];
    if (!cur || cur.tag !== tg) {
      if (cur) cur.d1 = track.s[i];
      cur = { d0: track.s[i], d1: track.length, tag: tg };
      out.push(cur);
    }
  }
  return out;
}

export function buildWorld(ctx, track, course, opts) {
  const { flow } = opts;
  const { scene } = ctx;
  const time = course.time;
  const TH = THEMES[time];
  const k = kit();
  const g = new THREE.Group();
  scene.add(g);
  const dyn = []; // kept out of the static merge
  const R = rng(course.id === 'jungle' ? 11 : course.id === 'castle' ? 23 : course.id === 'night' ? 37 : 51);
  const fr = frame();
  const night = time === 'night';
  const parts = spans(track);
  const partsWith = (w) => parts.filter((p) => has(p.tag.name, w));

  // ---------------------------------------------------------------- where the channel is
  const plan = [];
  for (let d = 0; d < track.length; d += 2) {
    track.at(d, fr);
    const tg = fr.tag || {};
    plan.push({ x: fr.p.x, z: fr.p.z, y: fr.p.y, d, hill: !(tg.lift || tg.drop || tg.station || has(tg.name, 'top') || has(tg.name, 'pool')) });
  }
  const nearChannel = (x, z, r) => plan.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < r * r);
  let minX = 1e9;
  let maxX = -1e9;
  let minZ = 1e9;
  let maxZ = -1e9;
  for (const p of plan) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  const centre = new THREE.Vector3((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
  // each ridge point sits under the lowest water close by along the ride, so the ground never rises
  // above the channel where it dips
  plan.forEach((p, i) => {
    let m = p.y;
    for (let j = Math.max(0, i - 3); j <= Math.min(plan.length - 1, i + 3); j++) m = Math.min(m, plan[j].y);
    p.ymin = m;
  });
  const hillPts = plan.filter((p) => p.hill && p.ymin > 1.2);
  // Ground height: ridges under the channel's flat parts, falling away gently on both sides
  const SLOPE = 0.55;
  const heightAt = (x, z) => {
    let h = 0;
    for (const p of hillPts) {
      const dd = Math.hypot(p.x - x, p.z - z);
      const v = p.ymin - 0.4 - Math.max(0, dd - 2.3) * SLOPE;
      if (v > h) h = v;
    }
    return h;
  };

  // ---------------------------------------------------------------- sky
  const skyTex = canvasTexture(16, 256, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, TH.top);
    gr.addColorStop(0.5, TH.top);
    gr.addColorStop(0.74, TH.mid);
    gr.addColorStop(0.86, TH.low);
    gr.addColorStop(1, TH.low);
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(260, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -2;
  g.add(sky);
  dyn.push(sky);
  const skyBits = new THREE.Group();
  sky.add(skyBits);
  if (night) {
    const n = 600;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2;
      const e = 0.15 + R() * 1.25;
      pos.set([Math.cos(a) * Math.cos(e) * 240, Math.sin(e) * 240, Math.sin(a) * Math.cos(e) * 240], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    skyBits.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#fff6d8', size: 1.7, fog: false, map: glowTexture(), transparent: true, depthWrite: false })));
    const moon = new THREE.Mesh(new THREE.CircleGeometry(11, 28), new THREE.MeshBasicMaterial({ color: '#fff4d6', fog: false }));
    moon.position.set(60, 110, -200);
    moon.lookAt(0, 0, 0);
    skyBits.add(moon);
    const mh = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#c7d2ff', transparent: true, opacity: 0.5, fog: false, depthWrite: false }));
    mh.scale.setScalar(64);
    mh.position.copy(moon.position);
    skyBits.add(mh);
  } else {
    const sunPos = time === 'sunset' ? new THREE.Vector3(-30, 22, -230) : new THREE.Vector3(-90, 150, -150);
    const sun = new THREE.Mesh(new THREE.CircleGeometry(time === 'sunset' ? 24 : 12, 28), new THREE.MeshBasicMaterial({ color: time === 'sunset' ? '#ffcf7a' : '#fff6d0', fog: false }));
    sun.position.copy(sunPos);
    sun.lookAt(0, 0, 0);
    skyBits.add(sun);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: time === 'sunset' ? '#ffb36b' : '#fff2c0', transparent: true, opacity: 0.6, fog: false, depthWrite: false }));
    halo.scale.setScalar(time === 'sunset' ? 140 : 70);
    halo.position.copy(sunPos);
    skyBits.add(halo);
    // soft clouds: a few puffs on one instanced mesh
    const puffGeo = new THREE.IcosahedronGeometry(1, 1);
    const clouds = new THREE.InstancedMesh(puffGeo, new THREE.MeshBasicMaterial({ color: time === 'sunset' ? '#ffd7c4' : '#ffffff', fog: false }), 36);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const v = new THREE.Vector3();
    for (let c = 0; c < 9; c++) {
      const a = R() * Math.PI * 2;
      const cx = Math.cos(a) * 200;
      const cz = Math.sin(a) * 200;
      const cy = 50 + R() * 40;
      for (let i = 0; i < 4; i++) clouds.setMatrixAt(c * 4 + i, m4.compose(v.set(cx + (i - 1.5) * 9, cy + (i % 2) * 3, cz), q, s.set(9 + R() * 5, 5 + R() * 3, 7)));
    }
    clouds.instanceMatrix.needsUpdate = true;
    skyBits.add(clouds);
  }

  // ---------------------------------------------------------------- ground
  const GW = Math.ceil(maxX - minX + 120);
  const GD = Math.ceil(maxZ - minZ + 120);
  const segX = Math.min(96, Math.round(GW / 2.6));
  const segZ = Math.min(96, Math.round(GD / 2.6));
  const gg = new THREE.PlaneGeometry(GW, GD, segX, segZ);
  gg.rotateX(-Math.PI / 2);
  const gp = gg.attributes.position;
  const gcol = new Float32Array(gp.count * 3);
  const cA = new THREE.Color(TH.ground);
  const cB = new THREE.Color(TH.ground2);
  const cBerm = new THREE.Color(TH.berm);
  const cc = new THREE.Color();
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i) + centre.x;
    const z = gp.getZ(i) + centre.z;
    const h = heightAt(x, z);
    gp.setY(i, h);
    let near = 99;
    for (const p of plan) near = Math.min(near, (p.x - x) ** 2 + (p.z - z) ** 2);
    near = Math.sqrt(near);
    const noise = (Math.sin(x * 0.21) * Math.cos(z * 0.17) + Math.sin(x * 0.07 + z * 0.11)) * 0.5;
    cc.copy(cA).lerp(cB, 0.5 + noise * 0.5);
    if (near < 4.5) cc.lerp(cBerm, (1 - near / 4.5) * 0.8);
    gcol.set([cc.r, cc.g, cc.b], i * 3);
  }
  gg.setAttribute('color', new THREE.BufferAttribute(gcol, 3));
  gg.computeVertexNormals();
  const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  ground.position.set(centre.x, 0, centre.z);
  ground.receiveShadow = true;
  g.add(ground);
  dyn.push(ground);

  // ---------------------------------------------------------------- the channel
  const pools = partsWith('pool').map((p) => ({ d0: p.d0 - 2, d1: p.d1 + 8 }));
  const channel = buildChannel(track, TH, { flow, pools });
  g.add(channel.group);
  dyn.push(channel.group);

  // ---------------------------------------------------------------- things to scatter
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const v = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  // Instanced copies in chunks along the ride, so far chunks can be hidden (fewer triangles and draw
  // calls for the camera and the shadows)
  const chunks = [];
  const instanced = (geo, material, list, { cast = true, colors = null, chunk = 70 } = {}) => {
    if (!list.length) return null;
    const groups = new Map();
    for (const it of list) {
      const key = Math.floor((it.d ?? 0) / chunk);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(it);
    }
    let first = null;
    for (const sub of groups.values()) {
      const m = new THREE.InstancedMesh(geo, material, sub.length);
      m.castShadow = cast;
      m.receiveShadow = true;
      const c = new THREE.Vector3();
      sub.forEach((it, i) => {
        q.setFromAxisAngle(Y, it.yaw ?? 0);
        m.setMatrixAt(i, m4.compose(v.set(it.x, it.y, it.z), q, sc.set(it.s, it.sy ?? it.s, it.s)));
        if (colors) m.setColorAt(i, cc.set(colors[(it.ci ?? i) % colors.length]));
        c.add(v);
      });
      c.divideScalar(sub.length);
      let r = 0;
      for (const it of sub) r = Math.max(r, Math.hypot(it.x - c.x, it.z - c.z) + 6);
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
      g.add(m);
      dyn.push(m);
      chunks.push({ m, c, r, cast });
      first = first || m;
    }
    return first;
  };
  // A vertex-colour material whose instance tint only colours the light parts (leaves), not the trunks
  const tintMat = (rough = 0.85) => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <color_vertex>', ['#include <color_vertex>', '#ifdef USE_INSTANCING_COLOR', 'vColor.rgb = color.rgb * mix(vec3(1.0), instanceColor.rgb, step(0.6, color.b));', '#endif'].join('\n'));
    };
    m.customProgramCacheKey = () => 'flume-tint-top';
    return m;
  };
  // spots off the channel, near enough to be seen from the log
  const scatter = (n, { min = 3.2, max = 26, tries = 6 } = {}) => {
    const out = [];
    if (opts.clearBand) min = Math.max(min, opts.clearBand);
    max = Math.max(max, min + 8);
    for (let i = 0; i < n * tries && out.length < n; i++) {
      const p = plan[Math.floor(R() * plan.length)];
      const a = R() * Math.PI * 2;
      const r = min + R() * (max - min);
      const x = p.x + Math.cos(a) * r;
      const z = p.z + Math.sin(a) * r;
      if (nearChannel(x, z, min)) continue;
      out.push({ x, z, y: heightAt(x, z), yaw: R() * Math.PI * 2, s: 1, d: p.d });
    }
    return out;
  };

  // ---------------------------------------------------------------- trees for each ride
  // Canopies are baked white and trunks brown: tintMat colours only the canopies per tree
  const ball = (r, c, x, y, z, seg = 8) => k.at(k.sph(r, c, undefined, seg), x, y, z);
  const treeGeoBroad = (() => {
    const t = new THREE.Group();
    t.add(k.at(k.cyl(0.26, 0.4, 3.4, '#8a5a36', 7), 0, 1.7, 0));
    t.add(ball(1.9, '#ffffff', 0, 4.2, 0, 9));
    t.add(ball(1.4, '#eefff0', 1.3, 3.7, 0.4));
    t.add(ball(1.3, '#f6fff2', -1.1, 3.8, -0.5));
    t.add(ball(1.1, '#ffffff', 0.2, 5.4, -0.2, 7));
    return toGeo(t);
  })();
  const palmGeo = (() => {
    const t = new THREE.Group();
    let x = 0;
    for (let i = 0; i < 6; i++) {
      const seg = k.cyl(0.17 - i * 0.012, 0.2 - i * 0.012, 0.9, '#b07f4c', 6);
      x += i * 0.06;
      seg.position.set(x, 0.45 + i * 0.85, 0);
      seg.rotation.z = -0.05 - i * 0.02;
      t.add(seg);
    }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const fr2 = k.sph(0.5, '#eaffe0', undefined, 6);
      fr2.scale.set(0.5, 0.12, 2.3);
      fr2.position.set(x + Math.sin(a) * 1.1, 5.2 - 0.25, Math.cos(a) * 1.1);
      fr2.rotation.set(0.35, a, 0, 'YXZ');
      t.add(fr2);
    }
    for (let i = 0; i < 3; i++) t.add(k.at(k.sph(0.15, '#7a4a26', undefined, 5), x + Math.cos(i * 2.1) * 0.2, 5.0, Math.sin(i * 2.1) * 0.2));
    return toGeo(t);
  })();
  const bushGeo = (() => {
    const t = new THREE.Group();
    t.add(ball(0.8, '#ffffff', 0, 0.45, 0, 7));
    t.add(ball(0.6, '#eaffea', 0.7, 0.35, 0.2, 6));
    t.add(ball(0.55, '#f2fff2', -0.6, 0.32, -0.2, 6));
    return toGeo(t);
  })();
  const flowerGeo = (() => {
    // a flowering shrub: a green mound with blossoms on top (the blossoms take the tint)
    const t = new THREE.Group();
    const leaf = ball(0.42, '#5fae4a', 0, 0.3, 0, 7);
    leaf.scale.set(1.2, 0.75, 1.1);
    t.add(leaf);
    const bloom = new THREE.IcosahedronGeometry(1, 0);
    const mid = new THREE.OctahedronGeometry(1, 0);
    for (const [x, y, z, r] of [[0, 0.62, 0.05, 0.13], [0.3, 0.5, 0.12, 0.11], [-0.28, 0.48, 0.1, 0.12], [0.1, 0.5, -0.3, 0.11], [-0.12, 0.52, 0.33, 0.1]]) {
      const b = new THREE.Mesh(bloom, new THREE.MeshStandardMaterial({ color: '#ffffff' }));
      b.position.set(x, y, z);
      b.scale.set(r, r * 0.7, r);
      t.add(b);
      const c = new THREE.Mesh(mid, new THREE.MeshStandardMaterial({ color: '#ffd166' }));
      c.position.set(x, y + r * 0.55, z + r * 0.45);
      c.scale.setScalar(r * 0.4);
      t.add(c);
    }
    return toGeo(t);
  })();
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true });
  const pineGeo = (() => {
    const t = new THREE.Group();
    t.add(k.at(k.cyl(0.16, 0.22, 1.2, '#6a4a3a', 6), 0, 0.6, 0));
    for (let i = 0; i < 3; i++) t.add(k.at(k.cone(1.5 - i * 0.35, 2.0, '#ffffff', 8), 0, 1.6 + i * 1.1, 0));
    return toGeo(t);
  })();
  const roundTreeGeo = (() => {
    const t = new THREE.Group();
    t.add(k.at(k.cyl(0.14, 0.2, 2.0, '#8a6a4a', 6), 0, 1.0, 0));
    t.add(ball(1.25, '#ffffff', 0, 2.8, 0, 10));
    t.add(ball(0.7, '#f2fff0', 0.75, 2.4, 0.3, 7));
    return toGeo(t);
  })();
  const leafCols = TH.leaf;
  const tint = tintMat(0.85);
  const big = (p) => ({ ...p, ci: Math.floor(R() * 8) });
  if (time === 'day') {
    instanced(treeGeoBroad, tint, scatter(50, { min: 4.5, max: 28 }).map((p) => ({ ...big(p), s: 0.8 + R() * 0.6 })), { colors: leafCols });
    instanced(palmGeo, tint, scatter(26, { min: 3.6, max: 20 }).map((p) => ({ ...big(p), s: 0.8 + R() * 0.5 })), { colors: ['#6cc24a', '#5fb84a', '#7fd06a'] });
    instanced(bushGeo, tint, scatter(90, { min: 2.9, max: 16 }).map((p) => ({ ...big(p), s: 0.6 + R() * 0.8 })), { colors: leafCols, cast: false });
  } else if (time === 'sunset') {
    instanced(roundTreeGeo, tint, scatter(50, { min: 5, max: 28 }).map((p) => ({ ...big(p), s: 0.9 + R() * 0.5 })), { colors: leafCols });
    instanced(pineGeo, tint, scatter(34, { min: 5, max: 24 }).map((p) => ({ ...big(p), s: 0.7 + R() * 0.4, sy: 1.1 + R() * 0.5 })), { colors: ['#5a9a5a', '#4f8a52', '#6aa860'] });
    instanced(bushGeo, tint, scatter(80, { min: 2.9, max: 16 }).map((p) => ({ ...big(p), s: 0.6 + R() * 0.6 })), { colors: leafCols, cast: false });
  } else {
    instanced(roundTreeGeo, tint, scatter(50, { min: 4.5, max: 24 }).map((p) => ({ ...big(p), s: 0.9 + R() * 0.6 })), { colors: leafCols });
    instanced(pineGeo, tint, scatter(44, { min: 4.5, max: 24 }).map((p) => ({ ...big(p), s: 0.8 + R() * 0.5, sy: 1.1 + R() * 0.6 })), { colors: ['#2c5a66', '#33507a', '#2a4a5a'] });
    instanced(bushGeo, tint, scatter(60, { min: 2.9, max: 14 }).map((p) => ({ ...big(p), s: 0.6 + R() * 0.6 })), { colors: leafCols, cast: false });
  }
  instanced(flowerGeo, tint, scatter(night ? 50 : 100, { min: 2.6, max: 12 }).map((p) => ({ ...big(p), s: 1 + R() * 0.7 })), { colors: TH.flower, cast: false });
  instanced(rockGeo, rockMat, scatter(40, { min: 3, max: 20 }).map((p) => ({ ...big(p), s: 0.3 + R() * 0.6, sy: 0.25 + R() * 0.3 })), { colors: night ? ['#7a7a9a', '#6a6a8a'] : ['#c9b9a6', '#b8a690', '#d8c8b4'], cast: false });

  // ---------------------------------------------------------------- glowing things at night
  const fireflyPts = [];
  if (night) {
    // glowing mushrooms
    const shroom = new THREE.Group();
    shroom.add(k.at(k.cyl(0.05, 0.07, 0.25, '#e8e0ff', 6), 0, 0.12, 0));
    const cap = k.sph(0.16, '#ffffff', undefined, 10);
    cap.scale.y = 0.6;
    cap.position.y = 0.27;
    shroom.add(cap);
    instanced(toGeo(shroom), new THREE.MeshBasicMaterial({ vertexColors: true }), scatter(90, { min: 2.6, max: 10 }).map((p) => ({ ...p, s: 0.8 + R() * 1.2 })), { colors: ['#7fffd4', '#8fd3ff', '#c7a6ff', '#ff9eb5'], cast: false });
    // lanterns along the channel on little posts
    const posts = [];
    const bulbs = [];
    for (let d = 8; d < track.length; d += 9) {
      track.at(d, fr);
      if ((fr.tag || {}).tunnel || fr.f.y < -0.2) continue;
      const side = Math.round(d / 9) % 2 ? 1 : -1;
      v.copy(fr.p).addScaledVector(fr.l, side * (CH.W + CH.T + 0.45));
      const base = Math.max(heightAt(v.x, v.z), fr.p.y - 1.0);
      posts.push({ x: v.x, y: base, z: v.z, s: 1, sy: fr.p.y + 1.6 - base });
      bulbs.push(new THREE.Vector3(v.x, fr.p.y + 1.7, v.z));
    }
    const pg = new THREE.CylinderGeometry(0.05, 0.06, 1, 6);
    pg.translate(0, 0.5, 0);
    instanced(pg, new THREE.MeshStandardMaterial({ color: '#3b2b4f', roughness: 0.8 }), posts, { cast: false });
    const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe7a0' }), Math.max(1, bulbs.length));
    bulbs.forEach((b, i) => bm.setMatrixAt(i, m4.makeTranslation(b.x, b.y, b.z)));
    bm.count = bulbs.length;
    g.add(bm);
    dyn.push(bm);
    // a soft glow round each lantern: one Points mesh
    const lg = new THREE.BufferGeometry().setFromPoints(bulbs);
    const lp = new THREE.Points(lg, new THREE.PointsMaterial({ color: '#ffcf7a', size: 2.2, map: glowTexture(), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.add(lp);
    dyn.push(lp);
    for (let i = 0; i < 160; i++) {
      const p = plan[Math.floor(R() * plan.length)];
      const a = R() * Math.PI * 2;
      const r = 2.5 + R() * 14;
      fireflyPts.push({ x: p.x + Math.cos(a) * r, y: Math.max(heightAt(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r), 0) + 0.6 + R() * 2.4, z: p.z + Math.sin(a) * r, ph: R() * 6.28, sp: 0.4 + R() * 0.8 });
    }
  }
  let fireflies = null;
  if (fireflyPts.length) {
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(fireflyPts.length * 3), 3));
    fireflies = new THREE.Points(fg, new THREE.PointsMaterial({ color: '#d8ff7a', size: 0.42, map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    fireflies.frustumCulled = false;
    g.add(fireflies);
    dyn.push(fireflies);
  }

  // ---------------------------------------------------------------- the loading dock and the sign
  const dockAt = (d, side, title, small) => {
    track.at(d, fr);
    const dock = new THREE.Group();
    dock.position.copy(fr.p).setY(0);
    dock.rotation.y = Math.atan2(fr.f.x, fr.f.z);
    const top = fr.p.y + 0.05;
    const x = side * (CH.W + CH.T + 1.45);
    dock.add(k.at(k.box(2.4, top, 12, TH.wallOut), x, top / 2, 0));
    dock.add(k.at(k.box(2.5, 0.08, 12.1, TH.trim), x, top + 0.04, 0));
    // posts and a roof (thatch, stripes or stars)
    for (const z of [-5.4, 5.4]) for (const xx of [x - 1.05, x + 1.05]) dock.add(k.at(k.cyl(0.1, 0.1, 2.9, TH.post, 8), xx, top + 1.45, z));
    const roof = k.box(2.9, 0.25, 12.4, time === 'day' ? '#e6c27a' : time === 'sunset' ? '#ef5b6f' : '#6a5aa8');
    roof.position.set(x + side * 0.15, top + 3.0, 0);
    dock.add(roof);
    const roof2 = k.box(2.3, 0.5, 11.6, time === 'day' ? '#d4a95e' : time === 'sunset' ? '#fff4e3' : '#8a7ad0');
    roof2.position.set(x + side * 0.15, top + 3.35, 0);
    dock.add(roof2);
    // a rail on the far side
    dock.add(k.at(k.box(0.08, 0.08, 11.6, TH.post), x + side * 1.15, top + 0.9, 0));
    for (let z = -5.5; z <= 5.5; z += 1.1) dock.add(k.at(k.box(0.06, 0.9, 0.06, TH.post), x + side * 1.15, top + 0.45, z));
    // the sign
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 0.95),
      umat('#ffffff', {
        rough: 0.7,
        map: canvasTexture(512, 160, (c, w, h) => {
          c.fillStyle = time === 'night' ? '#2c2f6e' : time === 'sunset' ? '#7a3f6a' : '#2f7a4a';
          roundRect(c, 4, 4, w - 8, h - 8, 46);
          c.fill();
          c.strokeStyle = '#ffd166';
          c.lineWidth = 8;
          c.stroke();
          c.fillStyle = '#ffe9a8';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.font = `600 30px 'Fredoka', system-ui, sans-serif`;
          c.fillText(small, w / 2, 40);
          c.fillStyle = '#ffffff';
          fitText(c, title, w / 2, 102, w * 0.82, 64);
        }),
      }),
    );
    sign.position.set(x + side * 0.15, top + 3.95, 5.4);
    sign.rotation.y = Math.PI;
    dock.add(sign);
    g.add(dock);
    return { dock, top, x };
  };
  const station = dockAt(6, -1, course.name, "Roji Land's log flume");

  // ---------------------------------------------------------------- low branches
  const branches = [];
  const fairy = [];
  const leafGeo = new THREE.SphereGeometry(0.32, 7, 5);
  for (const p of partsWith('branch')) {
    const len = p.d1 - p.d0;
    const n = Math.max(1, Math.round(len / 11));
    for (let i = 0; i < n; i++) {
      const d = p.d0 + ((i + 0.5) * len) / n;
      track.at(d, fr);
      const b = new THREE.Group();
      const H0 = fr.p.y + 1.05;
      const side = R() < 0.5 ? -1 : 1;
      // the tree it grows from, beside the channel
      v.copy(fr.p).addScaledVector(fr.l, side * (CH.W + CH.T + 1.0));
      const base = Math.min(fr.p.y - 0.4, heightAt(v.x, v.z) + 0.01);
      const trunkH = H0 + 2.6 - base;
      const trunk = k.cyl(0.28, 0.38, trunkH, '#8a5a36', 8);
      trunk.position.set(v.x, base + trunkH / 2, v.z);
      b.add(trunk);
      const top = k.sph(1.8, night ? '#2f5a6a' : time === 'sunset' ? '#7cb85a' : '#5fb84a', undefined, 10);
      top.position.set(v.x, base + trunkH + 0.8, v.z);
      b.add(top);
      // the bough across the channel
      const a = v.clone().setY(H0 + 0.25);
      const bEnd = fr.p.clone().addScaledVector(fr.l, -side * (CH.W + 0.9)).setY(H0 + 0.05);
      const curve = new THREE.QuadraticBezierCurve3(a, a.clone().lerp(bEnd, 0.5).setY(H0 - 0.05), bEnd);
      const bough = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.16, 7, false), new THREE.MeshStandardMaterial({ color: '#946238', roughness: 0.9 }));
      bough.castShadow = true;
      b.add(bough);
      for (let j = 0; j < 7; j++) {
        const pt = curve.getPoint(0.15 + (j / 6) * 0.85);
        const lf = new THREE.Mesh(leafGeo, new THREE.MeshStandardMaterial({ color: TH.leaf[j % TH.leaf.length], roughness: 0.85 }));
        lf.position.copy(pt).add(v2.set((R() - 0.5) * 0.3, 0.15 + R() * 0.15, (R() - 0.5) * 0.3));
        lf.scale.set(1.1, 0.6, 1.1);
        b.add(lf);
      }
      // fairy lights along the bough so it shows in the dark
      if (night) for (let j = 0; j <= 8; j++) fairy.push(curve.getPoint(j / 8).add(v2.set(0, -0.14, 0)));
      g.add(b);
      branches.push({ d, y: H0 - 0.12 });
    }
  }

  if (fairy.length) {
    const lb = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffe7a0' }), fairy.length);
    fairy.forEach((pp, j) => lb.setMatrixAt(j, m4.makeTranslation(pp.x, pp.y, pp.z)));
    g.add(lb);
    dyn.push(lb);
  }

  // ---------------------------------------------------------------- the waterfall
  const falls = [];
  const fallMats = [];
  for (const p of partsWith('falls')) {
    const d = (p.d0 + p.d1) / 2;
    track.at(d, fr);
    const side = 1;
    const dry = R() < 0.5 ? -1 : 1; // the lane a rock keeps dry
    const cliff = new THREE.Group();
    const yaw = Math.atan2(fr.f.x, fr.f.z);
    cliff.position.copy(fr.p);
    cliff.rotation.y = yaw;
    // rocks behind (left side) and an overhang across the top
    for (let i = 0; i < 9; i++) {
      const rk = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({ color: i % 2 ? '#b9a48e' : '#a8927c', roughness: 0.95, flatShading: true }));
      rk.position.set(side * (CH.W + 2.2 + R() * 1.5), -1 + i * 0.8, (R() - 0.5) * 6);
      rk.scale.set(2.2 + R(), 1.6 + R(), 2.4 + R());
      rk.castShadow = true;
      cliff.add(rk);
    }
    const over = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({ color: '#b09a84', roughness: 0.95, flatShading: true }));
    over.position.set(side * 0.6, 4.6, 0);
    over.scale.set(3.6, 0.9, 2.2);
    over.castShadow = true;
    cliff.add(over);
    const rk2 = new THREE.Mesh(rockGeo, over.material);
    rk2.position.set(-side * (CH.W + 1.8), 2.4, 0);
    rk2.scale.set(1.6, 3.4, 2.0);
    cliff.add(rk2);
    // greenery on the cliff
    for (let i = 0; i < 6; i++) cliff.add(k.at(k.sph(0.7, TH.leaf[i % 4], undefined, 8), side * 1.2 - i * 0.5 + R(), 5.3 + R() * 0.4, (R() - 0.5) * 3));
    // the water curtain: one panel per wet lane
    const fallTex = canvasTexture(64, 256, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      for (let i = 0; i < 22; i++) {
        c.fillStyle = `rgba(255,255,255,${0.35 + (i % 3) * 0.2})`;
        c.fillRect((i * 13) % w, (i * 41) % h, 3 + (i % 3) * 2, 60 + (i % 4) * 30);
      }
      const gr = c.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, 'rgba(160,230,255,.0)');
      gr.addColorStop(0.15, 'rgba(160,230,255,.55)');
      gr.addColorStop(0.85, 'rgba(160,230,255,.55)');
      gr.addColorStop(1, 'rgba(160,230,255,.0)');
      c.globalCompositeOperation = 'destination-over';
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
    });
    fallTex.wrapT = THREE.RepeatWrapping;
    const fallMat = new THREE.MeshStandardMaterial({ map: fallTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.2, emissive: '#bfefff', emissiveIntensity: 0.25, emissiveMap: fallTex });
    fallMats.push(fallTex);
    for (const lane of [-1, 0, 1]) {
      if (lane === dry) continue;
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 4.4, 1, 1), fallMat);
      pane.position.set(-lane * 0.95, 2.2, 0);
      cliff.add(pane);
      dyn.push(pane);
    }
    // the rock that splits the falls over the dry lane
    const lip = new THREE.Mesh(rockGeo, over.material);
    lip.position.set(-dry * 0.95, 4.1, 0.2);
    lip.scale.set(0.8, 0.5, 1.1);
    cliff.add(lip);
    // a little rainbow in the mist
    const rb = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.3, 6, 28, Math.PI),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        map: canvasTexture(64, 8, (c, w, h) => {
          const cols = ['#ff6f6f', '#ffb36b', '#ffe56b', '#7fdc7f', '#6fb8ff', '#b48aff'];
          cols.forEach((col, i) => {
            c.fillStyle = col;
            c.fillRect(0, (i * h) / cols.length, w, h / cols.length + 1);
          });
        }),
      }),
    );
    rb.position.set(0, 0.6, 3.5);
    rb.rotation.y = 0.2;
    cliff.add(rb);
    dyn.push(rb);
    g.add(cliff);
    falls.push({ d, dry, at: fr.p.clone() });
  }

  // ---------------------------------------------------------------- the castle walls
  const gates = [];
  const jets = [];
  if (time === 'sunset') {
    const blocks = [];
    const merlons = [];
    const towers = [];
    const windows = [];
    const banners = [];
    for (const p of partsWith('castle')) {
      for (let d = p.d0; d < p.d1; d += 3) {
        track.at(d, fr);
        const side = -1;
        v.copy(fr.p).addScaledVector(fr.l, side * (CH.W + CH.T + 3.0));
        const base = heightAt(v.x, v.z) - 0.3;
        const yaw = Math.atan2(fr.f.x, fr.f.z);
        const hgt = fr.p.y + 2.9 - base;
        blocks.push({ x: v.x, y: base, z: v.z, yaw, s: 1, sy: hgt });
        for (const o of [-1, 0, 1]) merlons.push({ x: v.x + fr.f.x * o * 1.05, y: base + hgt, z: v.z + fr.f.z * o * 1.05, yaw, s: 1 });
        const face = { yaw: yaw + (Math.PI / 2) * -side, s: 1 };
        const k2 = Math.round(d / 3);
        if (k2 % 3 === 0) windows.push({ ...face, x: v.x - side * fr.l.x * 0.52, y: fr.p.y + 1.6, z: v.z - side * fr.l.z * 0.52 });
        else if (k2 % 3 === 1) banners.push({ ...face, x: v.x - side * fr.l.x * 0.53, y: fr.p.y + 1.55, z: v.z - side * fr.l.z * 0.53, ci: k2 });
      }
      for (let d = p.d0 + 2; d < p.d1; d += 14) {
        track.at(d, fr);
        v.copy(fr.p).addScaledVector(fr.l, -(CH.W + CH.T + 3.3));
        towers.push({ x: v.x, z: v.z, base: heightAt(v.x, v.z) - 0.3, top: fr.p.y + 5.2 });
      }
    }
    const bg = new THREE.BoxGeometry(1.0, 1, 3.5);
    bg.translate(0, 0.5, 0);
    instanced(bg, new THREE.MeshStandardMaterial({ color: '#fbe3d2', roughness: 0.85, map: (() => {
      const t = canvasTexture(128, 128, (c, w, h) => {
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, w, h);
        c.fillStyle = 'rgba(170,120,110,.28)';
        for (let r = 0; r < 4; r++) {
          c.fillRect(0, r * 32, w, 3);
          for (let i = 0; i < 2; i++) c.fillRect(((i + (r % 2) * 0.5) * w) / 2, r * 32, 3, 32);
        }
      });
      return t;
    })() }), blocks);
    const bannerTex = canvasTexture(64, 128, (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(w, 0);
      c.lineTo(w, h);
      c.lineTo(w / 2, h - 22);
      c.lineTo(0, h);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(255,255,255,.9)';
      heartPath(c, w / 2, h * 0.42, 34);
      c.fillStyle = '#ffd166';
      c.fill();
      c.fillRect(0, 0, w, 8);
    });
    const bm2 = new THREE.MeshStandardMaterial({ map: bannerTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
    instanced(new THREE.PlaneGeometry(0.8, 1.6), bm2, banners, { cast: false, colors: ['#ef5b6f', '#c7a6ff', '#ff9eb5', '#7fd8bf'] });
    const mg = new THREE.BoxGeometry(1.15, 0.6, 0.55);
    mg.translate(0, 0.3, 0);
    instanced(mg, new THREE.MeshStandardMaterial({ color: '#fff1e4', roughness: 0.85 }), merlons, { cast: false });
    const wg = new THREE.PlaneGeometry(0.6, 0.9);
    instanced(wg, new THREE.MeshBasicMaterial({ color: '#ffd98a' }), windows, { cast: false });
    for (const t of towers) {
      const h = t.top - t.base;
      const tw = new THREE.Group();
      tw.position.set(t.x, t.base, t.z);
      tw.add(k.at(k.cyl(1.5, 1.6, h, '#fff1e4', 14), 0, h / 2, 0));
      tw.add(k.at(k.cyl(1.75, 1.75, 0.5, '#f6e3d0', 14), 0, h + 0.25, 0));
      tw.add(k.at(k.cone(1.9, 3.2, R() < 0.5 ? '#ef5b6f' : '#c7a6ff', 14), 0, h + 2.1, 0));
      tw.add(k.at(k.cyl(0.03, 0.03, 1.2, '#7a5a4a', 5), 0, h + 4.2, 0));
      const flag = k.box(0.7, 0.42, 0.03, R() < 0.5 ? '#ffd166' : '#ff9eb5');
      flag.position.set(0.37, h + 4.55, 0);
      tw.add(flag);
      tw.add(k.at(k.heart(0.7, 0.12, '#ef5b6f'), 0, h * 0.62, 1.55));
      g.add(tw);
    }
    // the castle keep beside the big lift, so the ride climbs up past its towers
    for (const p of partsWith('keep')) {
      track.at((p.d0 + p.d1) / 2, fr);
      let best = null;
      for (const side of [1, -1]) {
        v.copy(fr.p).addScaledVector(fr.l, side * 12);
        if (!nearChannel(v.x, v.z, 9)) best = { side, at: v.clone() };
        if (best) break;
      }
      if (!best) best = { side: 1, at: fr.p.clone().addScaledVector(fr.l, 12) };
      const c = new THREE.Group();
      c.position.set(best.at.x, heightAt(best.at.x, best.at.z) - 0.2, best.at.z);
      c.rotation.y = Math.atan2(-fr.l.x * best.side, -fr.l.z * best.side);
      const wall = '#fff1e4';
      c.add(k.at(k.box(12, 7, 6, wall), 0, 3.5, 0));
      c.add(k.at(k.box(6, 14, 5, wall), 0, 7, -0.5));
      for (const [x, z, r, h, roof] of [[-6.5, 2.6, 1.7, 10, '#ef5b6f'], [6.5, 2.6, 1.7, 10, '#ef5b6f'], [-6.5, -2.6, 1.5, 9, '#c7a6ff'], [6.5, -2.6, 1.5, 9, '#c7a6ff'], [0, -0.5, 1.8, 17, '#ef5b6f']]) {
        c.add(k.at(k.cyl(r, r, h, wall, 14), x, h / 2, z));
        c.add(k.at(k.cone(r + 0.4, r * 2.6, roof, 14), x, h + r * 1.3, z));
        c.add(k.at(k.cyl(0.04, 0.04, 1.4, '#7a5a4a', 5), x, h + r * 2.6 + 0.6, z));
        c.add(k.at(k.box(0.8, 0.45, 0.04, roof === '#ef5b6f' ? '#ffd166' : '#ff9eb5'), x + 0.42, h + r * 2.6 + 1.0, z));
      }
      for (let i = -5; i <= 5; i++) c.add(k.at(k.box(0.6, 0.7, 6.2, wall), i * 1.1, 7.35, 0));
      c.add(k.at(k.heart(2.2, 0.3, '#ef5b6f'), 0, 10.5, 2.1));
      c.add(k.at(k.box(2.4, 3.2, 0.2, '#9b6a43'), 0, 1.6, 3.02));
      const winMat = umat('#ffe9b8', { emissive: '#ffc56b', ei: 0.6 });
      for (const x of [-4.5, -2, 2, 4.5]) c.add(k.at(new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.4), winMat), x, 4.4, 3.02));
      for (const y of [9, 12]) c.add(k.at(new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.2), winMat), 0, y, 2.02));
      g.add(c);
    }
    // the gates: an arch over the channel with the portcullis half down
    for (const p of partsWith('gate')) {
      const d = (p.d0 + p.d1) / 2;
      track.at(d, fr);
      const gt = new THREE.Group();
      gt.position.copy(fr.p);
      gt.rotation.y = Math.atan2(fr.f.x, fr.f.z);
      const W2 = CH.W + CH.T + 0.5;
      for (const s of [-1, 1]) gt.add(k.at(k.box(0.9, 5.4, 1.4, '#f6e9da'), s * W2, 1.6, 0));
      gt.add(k.at(k.box(W2 * 2 + 0.9, 1.4, 1.4, '#f6e9da'), 0, 3.6, 0));
      for (let i = -3; i <= 3; i++) gt.add(k.at(k.box(0.5, 0.5, 1.5, '#fff1e4'), i * 0.75, 4.55, 0));
      // portcullis bars down to just above the kids' heads when they duck
      const bottom = 1.05;
      for (let i = -4; i <= 4; i++) gt.add(k.at(k.box(0.08, 2.9 - bottom, 0.08, '#6a5a6a'), i * 0.38, bottom + (2.9 - bottom) / 2, 0.3));
      for (let j = 0; j < 4; j++) gt.add(k.at(k.box(3.4, 0.08, 0.08, '#6a5a6a'), 0, bottom + 0.1 + j * 0.55, 0.3));
      for (let i = -4; i <= 4; i++) gt.add(k.at(k.cone(0.07, 0.18, '#6a5a6a', 5), i * 0.38, bottom - 0.05, 0.3)).rotation.x = Math.PI;
      gt.add(k.at(k.heart(0.6, 0.1, '#ef5b6f'), 0, 3.6, 0.72));
      g.add(gt);
      gates.push({ d, y: bottom - 0.08 });
    }
    // water jets from lion spouts on the bank: they fire into a lane in turns
    for (const p of partsWith('jets')) {
      const n = Math.max(1, Math.round((p.d1 - p.d0) / 9));
      for (let i = 0; i < n; i++) {
        const d = p.d0 + ((i + 0.5) * (p.d1 - p.d0)) / n;
        track.at(d, fr);
        const side = i % 2 ? 1 : -1;
        const spout = new THREE.Group();
        v.copy(fr.p).addScaledVector(fr.l, side * (CH.W + CH.T + 0.5));
        spout.position.copy(v);
        spout.rotation.y = Math.atan2(fr.l.x * -side, fr.l.z * -side);
        spout.add(k.at(k.box(0.7, 1.4, 0.7, '#f6e3d0'), 0, 0.2, 0));
        const head = k.sph(0.34, '#ffd166', undefined, 10);
        head.position.set(0, 1.1, 0.1);
        spout.add(head);
        // a curly mane and two little ears: a friendly lion
        for (let m = 0; m < 9; m++) {
          const a = (m / 9) * Math.PI * 2;
          spout.add(k.at(k.sph(0.13, '#f08a3c', undefined, 7), Math.cos(a) * 0.36, 1.1 + Math.sin(a) * 0.36, 0.02));
        }
        for (const s2 of [-1, 1]) spout.add(k.at(k.sph(0.08, '#ffd166', undefined, 6), s2 * 0.22, 1.4, 0.2));
        for (const s of [-1, 1]) spout.add(k.at(k.sph(0.06, '#3b2b3f', undefined, 6), s * 0.13, 1.2, 0.4));
        spout.add(k.at(k.tor(0.09, 0.03, '#c98a3a'), 0, 1.0, 0.42));
        g.add(spout);
        jets.push({ d, side, from: v.clone().setY(fr.p.y + 1.0 + 0.1), l: fr.l.clone(), p: fr.p.clone(), f: fr.f.clone() });
      }
    }
  }

  // ---------------------------------------------------------------- the glow-worm cave
  const caves = [];
  for (const p of parts.filter((pp) => pp.tag.tunnel)) {
    const pts = [];
    const glow = [];
    for (let d = p.d0 - 1; d <= p.d1 + 1; d += 1) {
      track.at(d, fr);
      pts.push(fr.p.clone().addScaledVector(fr.u, 0.6));
      for (let i = 0; i < 6; i++) {
        const a = (R() - 0.5) * 2.4;
        glow.push(fr.p.clone().addScaledVector(fr.u, 0.6 + Math.cos(a) * 2.75).addScaledVector(fr.l, Math.sin(a) * 2.75));
      }
    }
    const rockTex = canvasTexture(64, 64, (c, w, h) => {
      c.fillStyle = '#4a4466';
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 30; i++) {
        c.fillStyle = `rgba(${30 + (i % 4) * 10},${30 + (i % 3) * 8},${60 + (i % 5) * 8},.5)`;
        c.beginPath();
        c.arc((i * 23) % w, (i * 37) % h, 4 + (i % 5) * 2, 0, Math.PI * 2);
        c.fill();
      }
    });
    rockTex.wrapS = rockTex.wrapT = THREE.RepeatWrapping;
    rockTex.repeat.set(p.d1 - p.d0, 3);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 2.9, 12, false), new THREE.MeshStandardMaterial({ map: rockTex, roughness: 0.95, side: THREE.DoubleSide }));
    tube.castShadow = true;
    g.add(tube);
    dyn.push(tube);
    // the hill it runs through
    const mid = track.at((p.d0 + p.d1) / 2);
    const mound = k.sph((p.d1 - p.d0) / 2 + 2.5, TH.ground2, { rough: 1 }, 14);
    mound.scale.set(1, 0.45, 1);
    mound.position.copy(mid.p).setY(mid.p.y - 2.2);
    g.add(mound);
    for (const s of [-1, 1]) {
      const a = track.at(s < 0 ? p.d0 - 0.5 : p.d1 + 0.5);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.35, 8, 20, Math.PI), new THREE.MeshStandardMaterial({ color: '#6a6488', roughness: 0.95 }));
      arch.position.copy(a.p).addScaledVector(a.u, 0.6);
      arch.rotation.y = Math.atan2(a.f.x, a.f.z);
      g.add(arch);
    }
    const gg2 = new THREE.BufferGeometry().setFromPoints(glow);
    const gp2 = new THREE.Points(gg2, new THREE.PointsMaterial({ color: '#7fffe0', size: 0.28, map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.add(gp2);
    dyn.push(gp2);
    caves.push({ d0: p.d0, d1: p.d1 });
  }

  // ---------------------------------------------------------------- the splash lagoon
  const pool = partsWith('pool')[0];
  let lagoon = null;
  let unload = null;
  const crowd = [];
  if (pool) {
    const a = track.at(pool.d0 + 3);
    const b = track.at(pool.d1 - 2);
    const mid = a.p.clone().lerp(b.p, 0.5);
    const len = a.p.distanceTo(b.p) + 10;
    const yaw = Math.atan2(b.p.x - a.p.x, b.p.z - a.p.z);
    const shape = new THREE.Shape();
    const hw = 5.5;
    const hl = len / 2;
    shape.moveTo(-hw, -hl + hw);
    shape.absarc(0, -hl + hw, hw, Math.PI, Math.PI * 2, false);
    shape.lineTo(hw, hl - hw);
    shape.absarc(0, hl - hw, hw, 0, Math.PI, false);
    shape.closePath();
    const lg = new THREE.ShapeGeometry(shape, 20);
    lg.rotateX(-Math.PI / 2);
    // flip so +y in the shape runs along the pool
    const lagoonTex = (() => {
      const t = canvasTexture(256, 256, (c, w, h) => {
        c.fillStyle = TH.water;
        c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(255,255,255,.35)';
        c.lineWidth = 3;
        for (let i = 0; i < 18; i++) {
          c.beginPath();
          const x = (i * 53) % w;
          const y = (i * 97) % h;
          c.moveTo(x, y);
          c.quadraticCurveTo(x + 14, y - 6, x + 28, y);
          c.stroke();
        }
      });
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(0.15, 0.15);
      return t;
    })();
    lagoon = new THREE.Mesh(lg, new THREE.MeshStandardMaterial({ color: '#ffffff', map: lagoonTex, roughness: 0.1, metalness: 0.05, emissive: night ? TH.water : '#000000', emissiveIntensity: night ? 0.12 : 0, emissiveMap: night ? lagoonTex : null }));
    lagoon.position.set(mid.x, a.p.y - 0.015, mid.z);
    lagoon.rotation.y = yaw;
    lagoon.receiveShadow = true;
    g.add(lagoon);
    dyn.push(lagoon);
    // the ground dips under the lagoon: a sandy rim and rocks round it
    const rim = [];
    for (let i = 0; i < 34; i++) {
      const t = i / 34;
      const ang = t * Math.PI * 2;
      const lx = Math.cos(ang) * (hw + 0.3);
      const lz = Math.sin(ang) * (hl + 0.3);
      const wx = mid.x + lx * Math.cos(yaw) + lz * Math.sin(yaw);
      const wz = mid.z - lx * Math.sin(yaw) + lz * Math.cos(yaw);
      rim.push({ x: wx, y: a.p.y - 0.1, z: wz, s: 0.5 + R() * 0.45, sy: 0.35 + R() * 0.25, yaw: R() * 6 });
    }
    instanced(rockGeo, rockMat, rim, { colors: night ? ['#6a6a8a', '#5a5a7a'] : ['#d8c8b4', '#c9b9a6', '#e8d8c0'], cast: false });
    // sink the ground round the lagoon a little so no grass pokes through the water
    for (let i = 0; i < gp.count; i++) {
      const x = gp.getX(i) + centre.x - mid.x;
      const z = gp.getZ(i) + centre.z - mid.z;
      const lx = x * Math.cos(yaw) - z * Math.sin(yaw);
      const lz = x * Math.sin(yaw) + z * Math.cos(yaw);
      const e = (lx / (hw + 0.8)) ** 2 + (lz / (hl + 0.8)) ** 2;
      if (e < 1) gp.setY(i, Math.min(gp.getY(i), a.p.y - 0.6));
    }
    gp.needsUpdate = true;
    gg.computeVertexNormals();
    // a bridge over the far end of the lagoon, with people waiting to get splashed
    const br = new THREE.Group();
    const bp = track.at(pool.d0 + 9);
    br.position.copy(bp.p);
    br.rotation.y = Math.atan2(bp.f.x, bp.f.z);
    const deckY = 5.3;
    br.add(k.at(k.box(9.5, 0.22, 1.8, TH.wallOut), 0, deckY, 0));
    for (const s of [-1, 1]) {
      br.add(k.at(k.box(9.5, 0.08, 0.08, TH.trim), 0, deckY + 0.95, s * 0.85));
      for (let x = -4.5; x <= 4.5; x += 0.75) br.add(k.at(k.box(0.06, 0.9, 0.06, TH.post), x, deckY + 0.5, s * 0.85));
      for (const x of [-4.4, 4.4]) br.add(k.at(k.cyl(0.14, 0.14, deckY + 0.6, TH.post, 8), x, (deckY + 0.6) / 2 - 0.6, s * 0.75));
    }
    g.add(br);
    const looksList = [
      { gender: 'girl', skin: '#f3c9a8', hair: '#2a1a12', top: '#ffd166', bottom: '#5a7ad0', shoes: '#ffffff', hairstyle: 'ponytail', outfit: 'skirt', accent: '#ef5b6f' },
      { gender: 'boy', skin: '#c99a76', hair: '#1a1410', top: '#7fd8bf', bottom: '#3f4a7a', shoes: '#3b2b3f', hairstyle: 'short', outfit: 'tee-pants' },
      { gender: 'girl', skin: '#e8b48f', hair: '#6a3a1a', top: '#c7a6ff', bottom: '#ffffff', shoes: '#ef5b6f', hairstyle: 'bob', outfit: 'dress' },
      { gender: 'boy', skin: '#f0d0b4', hair: '#c98a3a', top: '#ff9eb5', bottom: '#5a5a7a', shoes: '#ffffff', hairstyle: 'curly', outfit: 'tee-shorts' },
    ];
    looksList.forEach((lk, i) => {
      const kid = ctx.makeKid({ ...ctx.looks.roji, ...lk, name: 'Guest' });
      freeze(kid, { pose: 'stand', hands: i % 2 ? 'wave2' : null, t: i });
      kid.root.position.set(-2.6 + i * 1.7, deckY + 0.11, -0.2);
      kid.root.rotation.y = Math.PI;
      br.add(kid.root);
      crowd.push(kid);
    });
    // the unloading dock at the end
    unload = dockAt(pool.d1 - 4, 1, 'Splash Lagoon', 'All ashore!');
  }

  // ---------------------------------------------------------------- the ride camera at the big drop
  const drop = parts.find((p) => p.tag.photo);
  let flashBulb = null;
  if (drop) {
    const d = drop.d0 + (drop.d1 - drop.d0) * 0.78;
    track.at(d, fr);
    const cam = new THREE.Group();
    v.copy(fr.p).addScaledVector(fr.l, CH.W + CH.T + 1.4);
    const base = Math.max(0, heightAt(v.x, v.z));
    cam.position.set(v.x, base, v.z);
    cam.rotation.y = Math.atan2(-fr.f.x, -fr.f.z);
    cam.add(k.at(k.cyl(0.08, 0.1, fr.p.y + 1.2 - base, '#3b2b3f', 8), 0, (fr.p.y + 1.2 - base) / 2, 0));
    cam.add(k.at(k.rbox(0.6, 0.42, 0.42, '#ef5b6f', 0.08), 0, fr.p.y + 1.4 - base, 0));
    cam.add(k.at(k.cyl(0.12, 0.12, 0.2, '#3b2b3f', 12), 0, fr.p.y + 1.4 - base, 0.28)).rotation.x = Math.PI / 2;
    flashBulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff6d8' }));
    flashBulb.position.set(0.2, fr.p.y + 1.68 - base, 0.12);
    cam.add(flashBulb);
    dyn.push(flashBulb);
    g.add(cam);
  }

  // ---------------------------------------------------------------- jungle and castle friends
  const critters = [];
  const butterflies = [];
  if (time === 'day') {
    // a monkey or two hanging from the branches
    for (const br2 of branches.filter((_, i) => i % 2 === 0)) {
      track.at(br2.d, fr);
      const m = new THREE.Group();
      const fur = '#9a6a42';
      m.add(k.at(k.sph(0.24, fur, undefined, 10), 0, 0, 0));
      const face = k.sph(0.16, '#f2cfa8', undefined, 10);
      face.scale.z = 0.6;
      face.position.set(0, 0.04, 0.17);
      m.add(face);
      for (const s of [-1, 1]) {
        m.add(k.at(k.sph(0.08, '#f2cfa8', undefined, 8), s * 0.24, 0.12, 0));
        m.add(k.at(k.sph(0.03, '#3b2b3f', undefined, 6), s * 0.06, 0.09, 0.27));
      }
      const arm = k.cyl(0.04, 0.04, 0.5, fur, 6);
      arm.position.set(0.12, 0.38, 0);
      arm.rotation.z = -0.2;
      m.add(arm);
      const tail = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 6, 12, Math.PI * 1.4), new THREE.MeshStandardMaterial({ color: fur, roughness: 0.9 }));
      tail.position.set(0, -0.25, -0.18);
      m.add(tail);
      const side = R() < 0.5 ? -1 : 1;
      m.position.copy(fr.p).addScaledVector(fr.l, side * (CH.W + 0.3)).add(v2.set(0, 1.0 + 0.16 - 0.55 + 0.4, 0));
      m.rotation.y = Math.atan2(-fr.f.x, -fr.f.z);
      const mm = new THREE.Mesh(toGeo(m), vcMat(0.85));
      mm.position.copy(m.position);
      mm.rotation.copy(m.rotation);
      mm.castShadow = true;
      g.add(mm);
      dyn.push(mm);
      critters.push({ o: mm, base: mm.position.clone(), ph: R() * 6, kind: 'monkey' });
    }
    // butterflies: every wing is one instance of one mesh
    const n = 14;
    const wings = new THREE.InstancedMesh(new THREE.CircleGeometry(0.12, 8), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), n * 2);
    wings.frustumCulled = false;
    for (let i = 0; i < n; i++) {
      const p = plan[Math.floor(R() * plan.length)];
      const col = ['#ff9eb5', '#ffd166', '#8fd3ff', '#c7a6ff'][i % 4];
      wings.setColorAt(i * 2, cc.set(col));
      wings.setColorAt(i * 2 + 1, cc.set(col));
      const x = p.x + (R() - 0.5) * 8;
      const z = p.z + (R() - 0.5) * 8;
      butterflies.push({ base: new THREE.Vector3(x, Math.max(p.y - 0.4, heightAt(x, z)) + 1.2 + R(), z), ph: R() * 6 });
    }
    wings.instanceColor.needsUpdate = true;
    g.add(wings);
    dyn.push(wings);
    butterflies.wings = wings;
  }
  if (night) {
    // owls on a few branch tops
    for (const br2 of branches.filter((_, i) => i % 2 === 1)) {
      track.at(br2.d, fr);
      const o = new THREE.Group();
      o.add(k.at(k.sph(0.26, '#8a7a9a', undefined, 10), 0, 0, 0));
      for (const s of [-1, 1]) {
        o.add(k.at(k.sph(0.09, '#fff6d8', undefined, 8), s * 0.1, 0.08, 0.2));
        o.add(k.at(k.sph(0.045, '#3b2b3f', undefined, 6), s * 0.1, 0.08, 0.28));
        const ear = k.cone(0.06, 0.14, '#8a7a9a', 5);
        ear.position.set(s * 0.14, 0.27, 0);
        o.add(ear);
      }
      o.add(k.at(k.cone(0.04, 0.08, '#ffd166', 5), 0, 0.0, 0.26)).rotation.x = Math.PI / 2 + 0.4;
      o.position.copy(fr.p).add(v2.set(0, 1.05 + 0.35, 0));
      o.rotation.y = Math.atan2(-fr.f.x, -fr.f.z);
      g.add(o);
      dyn.push(o);
      critters.push({ o, base: o.position.clone(), ph: R() * 6, kind: 'owl' });
    }
  }
  if (time === 'sunset') {
    // ducks in the moat lagoon
    if (lagoon) {
      for (let i = 0; i < 4; i++) {
        const dk = new THREE.Group();
        dk.add(k.at(k.sph(0.22, '#ffffff', undefined, 10), 0, 0.1, 0));
        dk.add(k.at(k.sph(0.13, '#ffffff', undefined, 10), 0, 0.32, 0.16));
        dk.add(k.at(k.cone(0.05, 0.12, '#ffb347', 6), 0, 0.3, 0.32)).rotation.x = Math.PI / 2;
        g.add(dk);
        dyn.push(dk);
        critters.push({ o: dk, base: lagoon.position.clone(), ph: (i / 4) * 6.28, kind: 'duck', r: 3.5 + i * 0.4 });
      }
    }
  }

  // Merge the static parts (everything not in dyn), then what is left with the same material
  colorBake(g, dyn);
  mergeSame(g, dyn);

  const tmp = new THREE.Vector3();
  const VIS = night ? 100 : 150;
  return {
    group: g,
    centre,
    heightAt,
    channel,
    branches,
    falls,
    gates,
    jets,
    caves,
    lagoon,
    crowd,
    station,
    unload,
    flashBulb,
    sky,
    update(dt, t, camPos) {
      sky.position.set(camPos.x, 0, camPos.z);
      for (const ch of chunks) {
        const far = Math.hypot(ch.c.x - camPos.x, ch.c.z - camPos.z) - ch.r;
        ch.m.visible = far < VIS;
        // only the chunks round the log cast shadows (the shadow map covers a few metres round it)
        ch.m.castShadow = ch.cast && far < 24;
      }
      channel.update(dt, t);
      for (const ft of fallMats) ft.offset.y = t * 1.6;
      if (lagoon) lagoon.material.map.offset.set(t * 0.01, t * 0.015);
      if (fireflies) {
        const a = fireflies.geometry.attributes.position;
        fireflyPts.forEach((f, i) => a.setXYZ(i, f.x + Math.sin(t * f.sp + f.ph) * 0.6, f.y + Math.sin(t * f.sp * 1.3 + f.ph * 2) * 0.35, f.z + Math.cos(t * f.sp * 0.8 + f.ph) * 0.6));
        a.needsUpdate = true;
        fireflies.material.opacity = 0.75 + Math.sin(t * 3) * 0.2;
      }
      if (butterflies.wings) {
        const W = butterflies.wings;
        butterflies.forEach((b, i) => {
          v.set(b.base.x + Math.sin(t * 0.7 + b.ph) * 2, b.base.y + Math.sin(t * 1.9 + b.ph) * 0.4, b.base.z + Math.cos(t * 0.6 + b.ph) * 2);
          const yaw = t * 0.7 + b.ph;
          const flap = 0.3 + Math.abs(Math.sin(t * 14 + b.ph)) * 1.0;
          for (const sd of [-1, 1]) {
            q.setFromEuler(new THREE.Euler(-Math.PI / 2, yaw + sd * flap, 0, 'YXZ'));
            v2.set(Math.cos(yaw) * sd * 0.1, 0, -Math.sin(yaw) * sd * 0.1).add(v);
            W.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), m4.compose(v2, q, sc.set(1, 1, 1)));
          }
        });
        W.instanceMatrix.needsUpdate = true;
      }
      for (const c of critters) {
        if (c.kind === 'monkey') {
          c.o.position.y = c.base.y + Math.sin(t * 2 + c.ph) * 0.06;
          c.o.rotation.z = Math.sin(t * 1.6 + c.ph) * 0.25;
        } else if (c.kind === 'fly') {
          c.o.position.set(c.base.x + Math.sin(t * 0.7 + c.ph) * 2, c.base.y + Math.sin(t * 1.9 + c.ph) * 0.4, c.base.z + Math.cos(t * 0.6 + c.ph) * 2);
          c.o.rotation.y = t * 0.7 + c.ph;
          for (const w of c.o.children) w.rotation.y = w.userData.s * (0.3 + Math.abs(Math.sin(t * 14 + c.ph)) * 1.0);
        } else if (c.kind === 'owl') {
          c.o.rotation.z = Math.sin(t * 0.8 + c.ph) * 0.2;
          tmp.copy(camPos).sub(c.o.position);
          c.o.rotation.y = Math.atan2(tmp.x, tmp.z);
        } else if (c.kind === 'duck') {
          const a = t * 0.25 + c.ph;
          c.o.position.set(c.base.x + Math.cos(a) * c.r, c.base.y, c.base.z + Math.sin(a) * c.r * 0.6);
          c.o.rotation.y = -a;
        }
      }
    },
  };
}

// Merge static meshes that share one material (textured hair of the people on the bridge, eye shines)
function mergeSame(group, keep) {
  group.updateMatrixWorld(true);
  const skip = new Set();
  for (const d of keep) d.traverse((o) => skip.add(o));
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const buckets = new Map();
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || skip.has(o) || o.children.length || Array.isArray(o.material)) return;
    const key = `${o.material.uuid}|${o.castShadow}|${o.renderOrder}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(o);
  });
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const names = Object.keys(list[0].geometry.attributes).filter((n) => list.every((o) => o.geometry.attributes[n]) && ['position', 'normal', 'uv', 'color'].includes(n));
    const geos = list.map((o) => {
      const gg = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const n of Object.keys(gg.attributes)) if (!names.includes(n)) gg.deleteAttribute(n);
      gg.clearGroups();
      gg.morphAttributes = {};
      rel.multiplyMatrices(inv, o.matrixWorld);
      gg.applyMatrix4(rel);
      return gg;
    });
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const m = new THREE.Mesh(merged, list[0].material);
    m.castShadow = list[0].castShadow;
    m.receiveShadow = list[0].receiveShadow;
    m.renderOrder = list[0].renderOrder;
    for (const o of list) o.removeFromParent();
    group.add(m);
  }
}
