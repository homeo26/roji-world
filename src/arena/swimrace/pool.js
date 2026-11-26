import * as THREE from 'three';
import { mat, umat, mesh, canvasTexture, roundRect, FONT, rng } from '../../util.js';
import { makeWaterMaterial, makeBasinMaterial, rippleHeight, MAX_RIPPLES } from '../../places/pool/water.js';
import * as PM from '../../places/pool/models.js';
import * as K from '../riding/kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// The gala pool: a bright 25 m pool with six lanes along X, lane ropes that bob on the waves,
// starting blocks at both ends, backstroke flags, a cheering crowd on the stands, a big scoreboard,
// a pace clock and the deck life around it. The water reacts: ripples, splashes, droplets, bubbles.

export const HX = 12.5; // half length (x)
export const HZ = 6; // half width (z)
export const WY = -0.12; // water surface
export const FLOOR = -1.9;
export const DECK = 0.1;
export const LW = 2;
export const LANES = 6;
export const BLOCK_TOP = 0.62;
export const laneZ = (i) => HZ - LW * (i + 0.5);

const TAU = Math.PI * 2;

function planarUV(geo, su, sv = su) {
  const p = geo.attributes.position;
  const n = geo.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i));
    const ay = Math.abs(n.getY(i));
    const az = Math.abs(n.getZ(i));
    let u;
    let v;
    if (ay >= ax && ay >= az) [u, v] = [p.getX(i) / su, p.getZ(i) / su];
    else if (ax >= az) [u, v] = [p.getZ(i) / su, p.getY(i) / sv];
    else [u, v] = [p.getX(i) / su, p.getY(i) / sv];
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

function slab(w, h, d, x, y, z, material, su) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(x, y, z);
  planarUV(geo, su);
  return mesh(geo, material);
}

function tiles(n, base, grout, shades, seed, px = 256) {
  const tex = canvasTexture(px, px, (c, w, h) => {
    const r = rng(seed);
    const s = w / n;
    c.fillStyle = grout;
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        c.fillStyle = shades[Math.floor(r() * shades.length)] || base;
        roundRect(c, i * s + 1.5, j * s + 1.5, s - 3, s - 3, 3);
        c.fill();
      }
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function starPath(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
}

function heartPath(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y + s * 0.35);
  c.bezierCurveTo(x - s * 0.55, y - s * 0.05, x - s * 0.3, y - s * 0.55, x, y - s * 0.22);
  c.bezierCurveTo(x + s * 0.3, y - s * 0.55, x + s * 0.55, y - s * 0.05, x, y + s * 0.35);
  c.closePath();
}

// The cheering crowd in one mesh (hair included), hopping and swaying in the vertex shader.
function makeCrowd(list) {
  const geos = [];
  const col = new THREE.Color();
  const r = rng(7);
  for (const { kid } of list) {
    kid.blob.removeFromParent();
    K.lowpoly(kid.root, 0.25);
    kid.root.updateMatrixWorld(true);
    const base = kid.root.position;
    const phase = r() * 40;
    const skin = new THREE.Color(kid.look.skin);
    kid.root.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      let p = o.parent;
      while (p) {
        if (!p.visible) return;
        p = p.parent;
      }
      const m = o.material;
      if (Array.isArray(m)) return;
      if (m.transparent) col.copy(skin).lerp(m.color, m.opacity * 0.8);
      else col.copy(m.color);
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
      if (!g.attributes.normal) g.computeVertexNormals();
      g.morphAttributes = {};
      g.clearGroups();
      g.applyMatrix4(o.matrixWorld);
      const n = g.attributes.position.count;
      const c = new Float32Array(n * 3);
      const b = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        c[i * 3] = col.r;
        c[i * 3 + 1] = col.g;
        c[i * 3 + 2] = col.b;
        b[i * 4] = base.x;
        b[i * 4 + 1] = base.y;
        b[i * 4 + 2] = base.z;
        b[i * 4 + 3] = phase;
      }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      g.setAttribute('aBase', new THREE.BufferAttribute(b, 4));
      geos.push(g);
    });
    kid.root.traverse((o) => o.geometry?.dispose());
  }
  const geo = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  const uniforms = { uTime: { value: 0 }, uHop: { value: 0.06 } };
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide });
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aBase;\nuniform float uTime;\nuniform float uHop;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float cyc = uTime * (5.5 + fract(aBase.w * 0.37) * 3.0) + aBase.w;
        vec3 rel = transformed - aBase.xyz;
        transformed.x += rel.y * sin(uTime * 2.1 + aBase.w) * 0.09;
        transformed.y += abs(sin(cyc)) * uHop;`,
      );
  };
  material.customProgramCacheKey = () => 'swim-crowd';
  const m = new THREE.Mesh(geo, material);
  m.receiveShadow = true;
  geo.computeBoundingSphere();
  geo.boundingSphere.radius += 1;
  let hype = 0;
  return {
    mesh: m,
    cheer(k = 1) {
      hype = Math.max(hype, k);
    },
    update(dt, t) {
      hype = Math.max(0, hype - dt * 0.35);
      uniforms.uTime.value = t;
      uniforms.uHop.value = 0.05 + hype * 0.28;
    },
  };
}

export function buildPool(ctx) {
  const { scene } = ctx;
  const g = new THREE.Group();
  scene.add(g);
  const live = new THREE.Group(); // never baked
  scene.add(live);
  const add = (o, x = 0, y = 0, z = 0, ry = 0) => {
    o.position.set(x, y, z);
    if (ry) o.rotation.y = ry;
    g.add(o);
    return o;
  };
  const time = { value: 0 };

  // ---------------------------------------------------------------- grass, deck, curb
  const DX0 = -19;
  const DX1 = 19;
  const DZ0 = -9;
  const DZ1 = 10.5;
  const grassShape = new THREE.Shape();
  grassShape.absarc(0, 0, 130, 0, TAU, false);
  const hole = new THREE.Path();
  hole.moveTo(DX0, -DZ1);
  hole.lineTo(DX1, -DZ1);
  hole.lineTo(DX1, -DZ0);
  hole.lineTo(DX0, -DZ0);
  hole.closePath();
  grassShape.holes.push(hole);
  const grassGeo = new THREE.ShapeGeometry(grassShape, 32);
  grassGeo.rotateX(-Math.PI / 2);
  const grass = mesh(grassGeo, mat('#a6d96a', { rough: 1 }), { cast: false });
  grass.position.y = 0;
  g.add(grass);

  const deckMat = new THREE.MeshStandardMaterial({ map: tiles(4, '#fde3cf', '#f3cdb3', ['#fde3cf', '#fbd9c2', '#fde8d8', '#fcdcc7'], 11), roughness: 0.85 });
  const CX = HX + 0.35;
  const CZ = HZ + 0.35;
  for (const [x0, x1, z0, z1] of [
    [DX0, DX1, CZ, DZ1],
    [DX0, DX1, DZ0, -CZ],
    [DX0, -CX, -CZ, CZ],
    [CX, DX1, -CZ, CZ],
  ])
    g.add(slab(x1 - x0, 0.15, z1 - z0, (x0 + x1) / 2, DECK - 0.075, (z0 + z1) / 2, deckMat, 2.4));
  // Rounded white coping round the pool with a teal tile band
  const coping = mat('#ffffff', { rough: 0.45 });
  const teal = mat('#5cc9c0', { rough: 0.55 });
  for (const s of [-1, 1]) {
    add(K.rbox(2 * CX, 0.09, 0.36, coping, 0.04), 0, DECK + 0.02, s * (HZ + 0.18));
    add(K.rbox(0.36, 0.09, 2 * HZ, coping, 0.04), s * (HX + 0.18), DECK + 0.02, 0);
    add(K.box(2 * CX + 1.2, 0.03, 0.22, teal), 0, DECK + 0.005, s * (CZ + 0.42));
    add(K.box(0.22, 0.03, 2 * CZ + 1.06, teal), s * (CX + 0.42), DECK + 0.005, 0);
  }
  // Teal curb round the deck
  const curb = mat('#4fbdb4', { rough: 0.6 });
  const cream = mat('#fff6ea', { rough: 0.7 });
  add(K.box(DX1 - DX0 + 0.4, 0.22, 0.3, curb), 0, 0.06, DZ1 + 0.15);
  add(K.box(0.3, 0.22, DZ1 - DZ0 + 0.3, curb), DX0 - 0.15, 0.06, (DZ1 + DZ0) / 2);
  add(K.box(0.3, 0.22, DZ1 - DZ0 + 0.3, curb), DX1 + 0.15, 0.06, (DZ1 + DZ0) / 2);

  // ---------------------------------------------------------------- basin
  const wallMap = tiles(4, '#8ad9ec', '#d8f4fa', ['#7fd3ea', '#8ad9ec', '#94dcef', '#86d6eb'], 21);
  const wallMat = makeBasinMaterial(wallMap, time, WY, 0.04);
  const depth = DECK - FLOOR;
  for (const s of [-1, 1]) {
    const side = new THREE.PlaneGeometry(2 * HX, depth);
    side.rotateY(s > 0 ? Math.PI : 0);
    side.translate(0, (DECK + FLOOR) / 2, s * HZ);
    planarUV(side, 1);
    g.add(mesh(side, wallMat, { cast: false }));
    const end = new THREE.PlaneGeometry(2 * HZ, depth);
    end.rotateY(s > 0 ? -Math.PI / 2 : Math.PI / 2);
    end.translate(s * HX, (DECK + FLOOR) / 2, 0);
    planarUV(end, 1);
    g.add(mesh(end, wallMat, { cast: false }));
  }
  // Floor: tiles, lane lines with T ends, and a little heart at the end of lane 2 (an easter egg)
  const FW = 2048;
  const FH = 1024;
  const floorTex = canvasTexture(FW, FH, (c, w, h) => {
    const px = w / (2 * HX);
    const pz = h / (2 * HZ);
    c.fillStyle = '#9fe2f0';
    c.fillRect(0, 0, w, h);
    const r = rng(5);
    for (let i = 0; i < 100; i++) {
      for (let j = 0; j < 48; j++) {
        const k = r();
        c.fillStyle = k < 0.25 ? '#97def0' : k < 0.5 ? '#a6e5f2' : k < 0.75 ? '#9fe2f0' : '#a2e3f1';
        c.fillRect(i * px * 0.25 + 1, j * pz * 0.25 + 1, px * 0.25 - 2, pz * 0.25 - 2);
      }
    }
    const X = (x) => (x + HX) * px;
    const Z = (z) => (z + HZ) * pz;
    c.fillStyle = '#2f6fb3';
    for (let i = 0; i < LANES; i++) {
      const z = laneZ(i);
      c.fillRect(X(-HX + 2), Z(z) - 0.13 * pz, 2 * (HX - 2) * px, 0.26 * pz);
      for (const s of [-1, 1]) {
        if (i === 1 && s > 0) continue;
        c.fillRect(X(s * (HX - 2)) - 0.13 * px, Z(z) - 0.5 * pz, 0.26 * px, pz);
      }
    }
    c.fillStyle = '#ff7fa3';
    heartPath(c, X(HX - 2), Z(laneZ(1)), 0.95 * px);
    c.fill();
    // a darker band in the middle of the pool (the 12.5 m mark)
    c.fillStyle = 'rgba(47,111,179,.35)';
    c.fillRect(X(0) - 0.06 * px, 0, 0.12 * px, h);
  });
  floorTex.anisotropy = 8;
  const floorGeo = new THREE.PlaneGeometry(2 * HX, 2 * HZ);
  floorGeo.rotateX(-Math.PI / 2);
  floorGeo.translate(0, FLOOR, 0);
  g.add(mesh(floorGeo, makeBasinMaterial(floorTex, time, WY, 0.05), { cast: false }));
  // Wall targets and touch pads at both ends
  const navy = mat('#2f6fb3', { rough: 0.6 });
  const padM = mat('#ffe08a', { rough: 0.5 });
  for (const s of [-1, 1]) {
    for (let i = 0; i < LANES; i++) {
      const z = laneZ(i);
      add(K.box(0.03, 0.85, 0.2, navy), s * (HX - 0.015), FLOOR + 0.75, z);
      add(K.box(0.03, 0.18, 0.7, navy), s * (HX - 0.015), FLOOR + 1.15, z);
      add(K.box(0.04, 0.55, 1.6, padM), s * (HX - 0.02), WY - 0.12, z);
    }
  }
  // Ladders on the near side
  for (const lx of [-9.6, 9.6]) {
    for (const dx of [-0.26, 0.26]) {
      g.add(PM.rail([[lx + dx, DECK, -HZ - 0.42], [lx + dx, DECK + 0.72, -HZ - 0.42], [lx + dx, DECK + 0.82, -HZ - 0.1], [lx + dx, 0.3, -HZ + 0.12], [lx + dx, -1.0, -HZ + 0.12]], 0.035));
    }
    for (let k = 0; k < 3; k++) {
      const rung = PM.cyl(0.025, 0.025, 0.52, '#e9f1f4', 8, { rough: 0.25, metal: 0.55 });
      rung.rotation.z = Math.PI / 2;
      add(rung, lx, -0.25 - k * 0.27, -HZ + 0.12);
    }
  }

  // ---------------------------------------------------------------- water
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * HX, 2 * HZ, 92, 44).rotateX(-Math.PI / 2),
    makeWaterMaterial({ half: { x: HX, z: HZ }, colors: { shallow: '#6fd8ea', mid: '#45c4e2', deep: '#2f9fd6' }, zones: { kids: -100, slope0: 100, slope1: 101 } }),
  );
  water.position.set(0, WY, 0);
  water.receiveShadow = true;
  water.renderOrder = 1;
  live.add(water);
  const U = water.material.userData.uniforms;
  U.uTime = time;
  const rips = U.uRip.value;
  let ripNext = 0;
  let now = 0;
  const ripple = (x, z, amp = 1, delay = 0) => {
    rips[ripNext].set(x, z, now + delay, amp);
    ripNext = (ripNext + 1) % MAX_RIPPLES;
  };

  // ---------------------------------------------------------------- lane ropes
  const ropeZ = [];
  for (let i = 1; i < LANES; i++) ropeZ.push(HZ - LW * i);
  const STEP = 0.31;
  const perRope = Math.floor((2 * HX - 0.3) / STEP);
  const floatGeo = new THREE.SphereGeometry(0.08, 6, 3);
  floatGeo.scale(1.35, 0.9, 0.9);
  const ropes = new THREE.InstancedMesh(floatGeo, new THREE.MeshStandardMaterial({ roughness: 0.45 }), perRope * ropeZ.length);
  ropes.castShadow = false;
  ropes.receiveShadow = false;
  const floats = [];
  const fcol = new THREE.Color();
  ropeZ.forEach((z, ri) => {
    for (let k = 0; k < perRope; k++) {
      const x = -HX + 0.15 + (k + 0.5) * STEP;
      const nearWall = Math.abs(x) > HX - 5;
      const c = nearWall ? (k % 2 ? '#ef5b6f' : '#ffffff') : ['#ffd166', '#3f7bf0', '#ffffff', '#3f7bf0'][k % 4];
      ropes.setColorAt(floats.length, fcol.set(c));
      floats.push({ x, z, ph: ri * 1.7 + k * 0.4 });
    }
  });
  ropes.frustumCulled = false;
  live.add(ropes);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const v3 = new THREE.Vector3();
  const zAxis = new THREE.Vector3(0, 0, 1);
  // Rope anchors on the end walls
  for (const z of ropeZ) for (const s of [-1, 1]) add(K.cyl(0.05, 0.05, 0.16, '#e9f1f4', 8, { rough: 0.3, metal: 0.5 }), s * (HX - 0.05), DECK - 0.12, z);

  // ---------------------------------------------------------------- starting blocks
  const digits = canvasTexture(128 * LANES, 128, (c, w, h) => {
    for (let i = 0; i < LANES; i++) {
      c.fillStyle = i % 2 ? '#5cc9c0' : '#ff7fa3';
      roundRect(c, i * 128, 0, 128, 128, 0);
      c.fill();
      c.fillStyle = '#ffffff';
      roundRect(c, i * 128 + 14, 14, 100, 100, 26);
      c.fill();
      c.fillStyle = '#3b2b3f';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `700 80px ${FONT}`;
      c.fillText(String(i + 1), i * 128 + 64, 70);
    }
  });
  const digitMat = new THREE.MeshStandardMaterial({ map: digits, roughness: 0.6 });
  const blocks = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i < LANES; i++) {
      const z = laneZ(i);
      const x = s * (HX + 0.55);
      const ph = BLOCK_TOP - DECK - 0.1;
      add(K.rbox(0.44, ph, 0.48, cream, 0.05), x, DECK + ph / 2, z);
      const top = add(K.rbox(0.66, 0.1, 0.62, i % 2 ? '#5cc9c0' : '#ff7fa3', 0.04), x - s * 0.04, BLOCK_TOP - 0.05, z);
      top.rotation.z = s * 0.07;
      const plate = new THREE.PlaneGeometry(0.3, 0.3);
      const uv = plate.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / LANES);
      add(mesh(plate, digitMat, { cast: false }), x, DECK + ph * 0.55, z + 0.245);
      blocks.push({ x, z, lane: i, end: s });
    }
  }

  // ---------------------------------------------------------------- backstroke flags
  const flagCols = ['#ef5b6f', '#fffaf4', '#3f7bf0', '#fffaf4', '#ffd166', '#fffaf4'];
  // flag poles on the far deck with a string of flags between them (kept off the pool so nothing hides the swimmers)
  for (const fx of [-HX + 5, HX - 5]) {
    add(K.cyl(0.04, 0.04, 2.1, '#ffffff', 8, { rough: 0.4 }), fx, DECK + 1.05, -HZ - 0.75);
    add(K.cyl(0.14, 0.17, 0.1, '#5cc9c0', 12), fx, DECK + 0.05, -HZ - 0.75);
    add(K.ball(0.07, '#ffd166', {}, 10), fx, DECK + 2.14, -HZ - 0.75);
  }
  K.bunting(g, new THREE.Vector3(-HX + 5, DECK + 2.0, -HZ - 0.75), new THREE.Vector3(HX - 5, DECK + 2.0, -HZ - 0.75), { n: 36, sag: 0.35, size: 0.26, colors: flagCols });

  // ---------------------------------------------------------------- stands, crowd, scoreboard
  const TIERS = 4;
  const TD = 1.05;
  const TH = 0.42;
  const SZ0 = DZ0 + 0.1; // front of the stands
  const tierCol = ['#7fd3c8', '#fff6ea'];
  for (let i = 0; i < TIERS; i++) {
    const z1 = SZ0 - i * TD;
    const top = DECK + TH * (i + 1);
    add(K.box(32, top - DECK + 0.1, TD, tierCol[i % 2]), 0, (top + DECK - 0.1) / 2, z1 - TD / 2);
    add(K.box(32, 0.07, 0.36, i % 2 ? '#ff9eb5' : '#ffd166'), 0, top + 0.035, z1 - 0.25);
  }
  const backZ = SZ0 - TIERS * TD - 0.15;
  add(K.box(32.4, DECK + TH * TIERS + 1.0, 0.3, curb), 0, (DECK + TH * TIERS + 1.0) / 2, backZ);
  add(K.box(32.6, 0.1, 0.4, cream), 0, DECK + TH * TIERS + 1.05, backZ);
  for (const s of [-1, 1]) {
    add(K.box(0.3, DECK + TH * TIERS + 1.0, TIERS * TD + 0.3, curb), s * 16.15, (DECK + TH * TIERS + 1.0) / 2, SZ0 - (TIERS * TD) / 2);
  }
  K.bunting(g, new THREE.Vector3(-16, DECK + TH * TIERS + 1.0, backZ + 0.2), new THREE.Vector3(16, DECK + TH * TIERS + 1.0, backZ + 0.2), { n: 40, sag: 0.3, size: 0.3 });
  const banner = K.painted(4.6, 0.9, 128, K.bannerDraw('Splash Gala', { bg: '#ef5b6f' }));
  add(banner, 0, DECK + TH * TIERS + 0.45, backZ + 0.16);
  // a small hand-painted sign on the stand front, cheering for both of them
  const cheer = K.painted(2.6, 0.5, 96, K.bannerDraw('Go Roji, go Homama', { bg: '#5cc9c0' }));
  add(cheer, -9, DECK + TH * 0.5, SZ0 + 0.01);

  const r = rng(17);
  const fans = [];
  for (let i = 0; i < TIERS; i++) {
    const n = 8 - (i % 2);
    for (let k = 0; k < n; k++) {
      if (r() < 0.12) continue;
      const kid = ctx.makeKid(K.randomLook(r, i * 10 + k));
      const x = -14 + ((k + 0.5) / n) * 28 + (r() - 0.5) * 0.9;
      kid.root.position.set(x, DECK + TH * (i + 1), SZ0 - i * TD - 0.62);
      kid.root.rotation.y = (r() - 0.5) * 0.5;
      K.poseFan(kid, ['cheer', 'wave', 'clap', 'flag', 'cheer'][Math.floor(r() * 5)], ['#ff7fa3', '#3f7bf0', '#ffd166'][k % 3]);
      fans.push({ kid });
    }
  }
  const crowd = makeCrowd(fans);
  crowd.mesh.castShadow = false;
  live.add(crowd.mesh);

  // Scoreboard
  const SB = { x: 0, y: 5.4, z: backZ - 0.6, w: 10, h: 3.6 };
  for (const s of [-1, 1]) add(K.cyl(0.14, 0.17, SB.y, '#4fbdb4', 10), s * (SB.w / 2 - 0.6), SB.y / 2, SB.z - 0.15);
  add(K.rbox(SB.w + 0.5, SB.h + 0.5, 0.3, '#3b4a7a', 0.12), SB.x, SB.y, SB.z - 0.1);
  add(K.rbox(SB.w + 0.7, 0.3, 0.42, '#ff7fa3', 0.1), SB.x, SB.y + SB.h / 2 + 0.3, SB.z - 0.1);
  const BW = 1024;
  const BH = Math.round((BW * SB.h) / SB.w);
  const boardCanvas = document.createElement('canvas');
  boardCanvas.width = BW;
  boardCanvas.height = BH;
  const boardTex = new THREE.CanvasTexture(boardCanvas);
  boardTex.colorSpace = THREE.SRGBColorSpace;
  boardTex.anisotropy = 4;
  const boardMat = new THREE.MeshBasicMaterial({ map: boardTex });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SB.w, SB.h), boardMat);
  screen.position.set(SB.x, SB.y, SB.z + 0.06);
  live.add(screen);
  function drawBoard(title, rows = [], foot = '') {
    const c = boardCanvas.getContext('2d');
    c.fillStyle = '#1f2a52';
    c.fillRect(0, 0, BW, BH);
    c.fillStyle = '#26335f';
    for (let y = 0; y < BH; y += 8) c.fillRect(0, y, BW, 3);
    c.textBaseline = 'middle';
    c.fillStyle = '#ffd166';
    c.textAlign = 'center';
    c.font = `700 54px ${FONT}`;
    c.fillText(title, BW / 2, 50);
    const rowH = Math.min(52, (BH - 130) / Math.max(1, rows.length));
    rows.forEach((row, i) => {
      const y = 112 + i * rowH;
      c.fillStyle = row.hi ? 'rgba(255,127,163,.28)' : 'rgba(255,255,255,.05)';
      roundRect(c, 40, y - rowH / 2 + 3, BW - 80, rowH - 6, 12);
      c.fill();
      c.font = `700 ${Math.round(rowH * 0.62)}px ${FONT}`;
      c.textAlign = 'left';
      c.fillStyle = row.color || '#ffffff';
      if (row.stars !== undefined) {
        for (let k = 0; k < 3; k++) {
          c.fillStyle = k < row.stars ? '#ffd166' : 'rgba(255,255,255,.25)';
          starPath(c, 74 + k * 30, y + 1, 12);
          c.fill();
        }
      } else c.fillText(row.left || '', 64, y + 2);
      c.fillStyle = '#ffffff';
      c.fillText(row.name || '', row.stars !== undefined ? 190 : 170, y + 2);
      c.textAlign = 'right';
      c.fillStyle = row.hi ? '#ffd166' : '#bfe6ff';
      c.fillText(row.right || '', BW - 64, y + 2);
    });
    if (foot) {
      c.textAlign = 'center';
      c.fillStyle = '#bfe6ff';
      c.font = `600 34px ${FONT}`;
      c.fillText(foot, BW / 2, BH - 34);
    }
    // the little heart in the corner, always lit
    c.fillStyle = '#ff7fa3';
    heartPath(c, BW - 46, 40, 40);
    c.fill();
    c.fillStyle = '#ffffff';
    c.font = `700 14px ${FONT}`;
    c.textAlign = 'center';
    c.fillText('R+H', BW - 46, 40);
    boardTex.needsUpdate = true;
  }
  drawBoard('Splash Gala', [], 'Welcome, swimmers!');

  // ---------------------------------------------------------------- pace clock at the far end
  const clockFace = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#fffaf4';
    c.beginPath();
    c.arc(w / 2, h / 2, w / 2 - 4, 0, TAU);
    c.fill();
    c.lineWidth = 10;
    c.strokeStyle = '#ff7fa3';
    c.stroke();
    c.fillStyle = '#3b2b3f';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 30px ${FONT}`;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU - Math.PI / 2;
      c.fillText(String(i * 5 || 60), w / 2 + Math.cos(a) * 92, h / 2 + Math.sin(a) * 92);
    }
  });
  const CLK = { x: 15.4, y: 2.0, z: -7.4 };
  add(K.cyl(0.07, 0.07, CLK.y, '#ffffff', 8), CLK.x, CLK.y / 2, CLK.z - 0.12);
  add(K.cyl(0.62, 0.62, 0.12, '#4fbdb4', 24), CLK.x, CLK.y, CLK.z - 0.08).rotation.x = Math.PI / 2;
  const faceM = mesh(new THREE.CircleGeometry(0.56, 32), new THREE.MeshStandardMaterial({ map: clockFace, roughness: 0.6 }), { cast: false });
  add(faceM, CLK.x, CLK.y, CLK.z);
  const hand = new THREE.Group();
  const handBar = K.box(0.04, 0.42, 0.02, '#ef5b6f');
  handBar.position.y = 0.17;
  hand.add(handBar, K.cyl(0.05, 0.05, 0.03, '#ef5b6f', 10));
  hand.children[1].rotation.x = Math.PI / 2;
  hand.position.set(CLK.x, CLK.y, CLK.z + 0.03);
  live.add(hand);

  // ---------------------------------------------------------------- deck life
  const lg = PM.lifeguardChair();
  add(lg, -16.8, DECK, 7.6, Math.PI * 0.85);
  for (const [x, z, a, b] of [[-17.2, 3.5, '#ffb59e', '#fff6ea'], [-17.2, 1.2, '#7fd3e0', '#fff6ea'], [17.4, -2.5, '#ff9eb5', '#fff6ea'], [17.4, -4.8, '#ffd166', '#fff6ea']]) {
    add(PM.lounger(a, b), x, DECK, z, x < 0 ? -Math.PI / 2 : Math.PI / 2);
  }
  add(PM.umbrella('#ef5b6f', '#fff6ea', 2.4, 1.3), -17.3, DECK, -1.1);
  add(PM.umbrella('#5cc9c0', '#fff6ea', 2.4, 1.3), 17.5, DECK, -0.4);
  add(PM.pottedPalm(3, 1.05), -17.6, DECK, -6.8);
  add(PM.pottedPalm(5, 1.05), 17.6, DECK, -7.1);
  add(PM.pottedPalm(7, 0.9), 17.8, DECK, 9.4);
  add(PM.pottedPalm(9, 0.9), -17.8, DECK, 9.6);
  add(PM.towelStack(), 14.6, DECK, 7.2, 0.3);
  add(PM.towelStack(['#7fd3e0', '#ffd166', '#ff8fb1']), -14.8, DECK, 7.4, -0.2);
  add(PM.swimRing('donut'), -13.6, DECK + 0.08, 8.9).rotation.x = -Math.PI / 2;
  add(PM.duckFloat(), 13.2, DECK, 9.2, -0.6);
  // kickboards leaning on the far end
  for (let i = 0; i < 4; i++) {
    const kb = K.rbox(0.42, 0.62, 0.05, ['#ff7fa3', '#ffd166', '#5cc9c0', '#c7a6ff'][i], 0.04);
    kb.rotation.x = -0.25;
    add(kb, 16.4 + i * 0.48, DECK + 0.3, -8.6);
  }
  // A low hedge and trees round the outside
  K.sky(g, { seed: 9, radius: 150, count: 12, hills: false });
  {
    const hr = rng(12);
    const hg = new THREE.SphereGeometry(1, 14, 6, 0, TAU, 0, Math.PI / 2);
    const hills = new THREE.InstancedMesh(hg, mat('#ffffff', { rough: 1 }), 16);
    const hc = ['#8fca6a', '#7fbf63', '#a3d579', '#86c46a'];
    const hm = new THREE.Matrix4();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + hr() * 0.2;
      const d = 150 + hr() * 40;
      const w = 30 + hr() * 35;
      hills.setMatrixAt(i, hm.compose(new THREE.Vector3(Math.cos(a) * d, -2, Math.sin(a) * d), new THREE.Quaternion(), new THREE.Vector3(w, 10 + hr() * 14, w * 0.8)));
      hills.setColorAt(i, new THREE.Color(hc[i % hc.length]));
    }
    hills.receiveShadow = true;
    g.add(hills);
  }
  K.scatterNature(g, { seed: 4, bounds: [-70, 70, -60, 60], free: (x, z) => !(x > DX0 - 2 && x < DX1 + 2 && z > DZ0 - 7 && z < DZ1 + 2) && Math.hypot(x, z) < 68, trees: 30, bushes: 26, flowers: 150, tufts: 160, rocks: 8 });

  // ---------------------------------------------------------------- droplets and bubbles
  const DROPS = 180;
  const drops = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.045, 0), new THREE.MeshStandardMaterial({ color: '#e9fbff', emissive: '#bfefff', emissiveIntensity: 0.45, roughness: 0.2 }), DROPS);
  drops.castShadow = false;
  drops.frustumCulled = false;
  const dropList = Array.from({ length: DROPS }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 1 }));
  let dropNext = 0;
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < DROPS; i++) drops.setMatrixAt(i, zero);
  live.add(drops);
  function spray(x, y, z, n = 10, power = 1, dir = null) {
    for (let i = 0; i < n; i++) {
      const d = dropList[dropNext];
      dropNext = (dropNext + 1) % DROPS;
      d.life = 1.4;
      d.p.set(x + (Math.random() - 0.5) * 0.3 * power, y, z + (Math.random() - 0.5) * 0.3 * power);
      const a = Math.random() * TAU;
      const sp = (0.6 + Math.random() * 1.6) * power;
      d.v.set(Math.cos(a) * sp, (2 + Math.random() * 2.6) * Math.sqrt(power), Math.sin(a) * sp);
      if (dir) d.v.addScaledVector(dir, 1.5 * power);
      d.s = 0.55 + Math.random() * (0.5 + 0.25 * Math.min(1.6, power));
    }
  }
  function splash(x, z, power = 1) {
    ripple(x, z, 0.8 + power * 1.1);
    if (power > 1.2) ripple(x, z, power * 0.8, 0.18);
    spray(x, WY + 0.05, z, Math.round(6 + power * 14), power);
  }

  const BUB = 140;
  const bubPos = new Float32Array(BUB * 3);
  const bubList = Array.from({ length: BUB }, () => ({ life: 0, x: 0, y: -99, z: 0, ph: Math.random() * 9 }));
  const bubGeo = new THREE.BufferGeometry();
  bubGeo.setAttribute('position', new THREE.BufferAttribute(bubPos, 3));
  const bubTex = canvasTexture(64, 64, (c) => {
    c.strokeStyle = 'rgba(255,255,255,.95)';
    c.lineWidth = 6;
    c.beginPath();
    c.arc(32, 32, 24, 0, TAU);
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,.35)';
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.95)';
    c.beginPath();
    c.arc(23, 23, 6, 0, TAU);
    c.fill();
  });
  const bubbles = new THREE.Points(bubGeo, new THREE.PointsMaterial({ map: bubTex, size: 0.13, transparent: true, depthWrite: false, sizeAttenuation: true }));
  bubbles.frustumCulled = false;
  bubbles.renderOrder = 2;
  live.add(bubbles);
  let bubNext = 0;
  function bubble(x, y, z, n = 3, spread = 0.15) {
    for (let i = 0; i < n; i++) {
      const b = bubList[bubNext];
      bubNext = (bubNext + 1) % BUB;
      b.life = 3;
      b.x = x + (Math.random() - 0.5) * spread;
      b.y = y + (Math.random() - 0.5) * spread;
      b.z = z + (Math.random() - 0.5) * spread;
      b.sp = 0.5 + Math.random() * 0.5;
    }
  }

  const SPK = 60;
  const spkPos = new Float32Array(SPK * 3);
  const spkCol = new Float32Array(SPK * 3);
  const spkList = Array.from({ length: SPK }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), c: new THREE.Color() }));
  const spkGeo = new THREE.BufferGeometry();
  spkGeo.setAttribute('position', new THREE.BufferAttribute(spkPos, 3));
  spkGeo.setAttribute('color', new THREE.BufferAttribute(spkCol, 3));
  const spkTex = canvasTexture(64, 64, (c) => {
    const gr = c.createRadialGradient(32, 32, 0, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(255,255,255,.85)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr;
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(32, 2);
    c.lineTo(36, 28);
    c.lineTo(62, 32);
    c.lineTo(36, 36);
    c.lineTo(32, 62);
    c.lineTo(28, 36);
    c.lineTo(2, 32);
    c.lineTo(28, 28);
    c.closePath();
    c.fill();
  });
  const sparkles = new THREE.Points(spkGeo, new THREE.PointsMaterial({ map: spkTex, size: 0.32, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparkles.frustumCulled = false;
  sparkles.renderOrder = 3;
  live.add(sparkles);
  let spkNext = 0;
  function sparkle(x, y, z, n = 10, color = '#ffe08a') {
    for (let i = 0; i < n; i++) {
      const s = spkList[spkNext];
      spkNext = (spkNext + 1) % SPK;
      s.life = 0.7 + Math.random() * 0.4;
      s.p.set(x, y, z);
      const a = Math.random() * TAU;
      const b = Math.random() * Math.PI - Math.PI / 2;
      const sp = 0.8 + Math.random() * 1.4;
      s.v.set(Math.cos(a) * Math.cos(b) * sp, Math.sin(b) * sp + 0.6, Math.sin(a) * Math.cos(b) * sp);
      s.c.set(color);
    }
  }

  // Bake the static scene into a few draw calls
  K.bakeVC(g, [], { emissive: 'keep' });

  // ---------------------------------------------------------------- per frame
  // swimmers: [{ x, z, speed, dir: [dx, dz], on }] up to two get foam and a wake in the shader
  function update(dt, t, swimmers = [], clockT = 0) {
    now = t;
    time.value = t;
    for (let i = 0; i < 2; i++) {
      const s = swimmers[i];
      const kd = U.uKid.value[i];
      if (s) kd.set(s.x, s.z, s.speed, s.on ? 1 : 0);
      else kd.w = 0;
    }
    const d0 = swimmers[0]?.dir || [1, 0];
    const d1 = swimmers[1]?.dir || [1, 0];
    U.uKidDir.value.set(d0[0], d0[1], d1[0], d1[1]);
    // lane ropes bob on the same waves the shader draws
    for (let i = 0; i < floats.length; i++) {
      const f = floats[i];
      const h = rippleHeight(rips, f.x, f.z, t);
      v3.set(f.x, WY + 0.035 + h * 0.9, f.z);
      q.setFromAxisAngle(zAxis, Math.sin(t * 1.4 + f.ph) * 0.08);
      ropes.setMatrixAt(i, m4.compose(v3, q, one));
    }
    ropes.instanceMatrix.needsUpdate = true;
    crowd.update(dt, t);
    hand.rotation.z = -(clockT / 60) * TAU;
    // droplets
    let anyDrop = false;
    for (let i = 0; i < DROPS; i++) {
      const d = dropList[i];
      if (d.life <= 0) continue;
      anyDrop = true;
      d.life -= dt;
      d.v.y -= 9.8 * dt;
      d.p.addScaledVector(d.v, dt);
      const inPool = Math.abs(d.p.x) < HX && Math.abs(d.p.z) < HZ;
      const floorY = inPool ? WY : DECK;
      if (d.p.y < floorY) d.life = 0;
      if (d.life <= 0) {
        drops.setMatrixAt(i, zero);
        continue;
      }
      v3.setScalar(d.s);
      drops.setMatrixAt(i, m4.compose(d.p, q.identity(), v3));
    }
    if (anyDrop || drops.userData.was) drops.instanceMatrix.needsUpdate = true;
    drops.userData.was = anyDrop;
    drops.visible = anyDrop;
    // bubbles rise and pop at the surface
    for (let i = 0; i < BUB; i++) {
      const b = bubList[i];
      if (b.life > 0) {
        b.life -= dt;
        b.y += b.sp * dt;
        b.x += Math.sin(t * 6 + b.ph) * 0.12 * dt;
        if (b.y > WY - 0.03) {
          b.life = 0;
          b.y = -99;
        }
      } else b.y = -99;
      bubPos[i * 3] = b.x;
      bubPos[i * 3 + 1] = b.y;
      bubPos[i * 3 + 2] = b.z;
    }
    bubGeo.attributes.position.needsUpdate = true;
    let anySpk = false;
    for (let i = 0; i < SPK; i++) {
      const s = spkList[i];
      if (s.life > 0) {
        anySpk = true;
        s.life -= dt;
        s.v.multiplyScalar(1 - 2.5 * dt);
        s.p.addScaledVector(s.v, dt);
      }
      const k = Math.max(0, Math.min(1, s.life * 2));
      spkPos[i * 3] = s.p.x;
      spkPos[i * 3 + 1] = s.life > 0 ? s.p.y : -99;
      spkPos[i * 3 + 2] = s.p.z;
      spkCol[i * 3] = s.c.r * k;
      spkCol[i * 3 + 1] = s.c.g * k;
      spkCol[i * 3 + 2] = s.c.b * k;
    }
    if (anySpk || sparkles.userData.was) {
      spkGeo.attributes.position.needsUpdate = true;
      spkGeo.attributes.color.needsUpdate = true;
    }
    sparkles.userData.was = anySpk;
    sparkles.visible = anySpk;
  }

  return { group: g, live, water, U, time, ropes, ripple, splash, spray, bubble, sparkle, drawBoard, crowd, blocks, update, board: SB, clock: CLK, rippleAt: (x, z, t) => rippleHeight(rips, x, z, t) };
}
