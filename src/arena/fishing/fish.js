import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Everything that can bite at the harbour, and a small vertex-coloured model for each.
// Models are about 1 unit long along +X (head at +X), centred on the origin; scale them by size in metres.
// Shared by the harbour (the fish market, fishing off the pier) and the fishing game.

// rarity: 1 common, 2 uncommon, 3 rare, 4 legendary. band: where it swims (near the pier, mid, far out).
// fight: how hard it pulls when hooked (0.2 sleepy .. 1.4 wild). weight: how often it bites.
export const FISH = [
  { id: 'sardine', name: 'Sardine', rarity: 1, size: [12, 20], band: 'near', fight: 0.55, weight: 10, line: 'Small, quick and shiny. Sardines swim in big happy crowds.' },
  { id: 'mackerel', name: 'Mackerel', rarity: 1, size: [25, 40], band: 'mid', fight: 0.7, weight: 8, line: 'Stripy and speedy, with a tail like a little rocket.' },
  { id: 'starfish', name: 'Starfish', rarity: 1, size: [10, 20], band: 'near', fight: 0.22, weight: 4, junk: true, line: 'It was holding on to your hook like a hug. Back it goes, gently.' },
  { id: 'crab', name: 'Grumpy crab', rarity: 1, size: [8, 16], band: 'near', fight: 0.45, weight: 4, junk: true, line: 'It pinched the hook, then pretended nothing happened.' },
  { id: 'boot', name: 'Old boot', rarity: 1, size: [26, 30], band: 'near', fight: 0.2, weight: 3, junk: true, line: 'An old boot full of seaweed. Exactly Homama\'s size.' },
  { id: 'clownfish', name: 'Clownfish', rarity: 2, size: [8, 12], band: 'near', fight: 0.6, weight: 4, line: 'Orange, stripy and very far from home. Say hello, then let it go.' },
  { id: 'seabream', name: 'Sea bream', rarity: 2, size: [30, 50], band: 'mid', fight: 0.75, weight: 6, line: 'Pink and silver. The fishmonger says it is the best one for dinner.' },
  { id: 'puffer', name: 'Pufferfish', rarity: 2, size: [15, 30], band: 'mid', fight: 0.6, weight: 4, line: 'It puffed up when it saw you. Then it puffed down, a bit shy.' },
  { id: 'duck', name: 'Rubber duck', rarity: 2, size: [10, 14], band: 'mid', fight: 0.25, weight: 2, junk: true, line: 'Squeak. Somebody lost their bath duck. It looks very pleased to be found.' },
  { id: 'seabass', name: 'Sea bass', rarity: 2, size: [40, 70], band: 'mid', fight: 0.9, weight: 5, line: 'A strong silver fish that likes the rocks by the lighthouse.' },
  { id: 'snapper', name: 'Red snapper', rarity: 3, size: [50, 80], band: 'far', fight: 1.05, weight: 3, line: 'Bright red and proud of it. A real catch.' },
  { id: 'octopus', name: 'Octopus', rarity: 3, size: [40, 90], band: 'far', fight: 1.0, weight: 2, night: 4, line: 'Eight arms and every one of them waving at you.' },
  { id: 'tuna', name: 'Bluefin tuna', rarity: 3, size: [80, 150], band: 'far', fight: 1.3, weight: 2, line: 'Huge and strong. Even the seagulls clapped.' },
  { id: 'bottle', name: 'Letter in a bottle', rarity: 3, size: [24, 28], band: 'mid', fight: 0.3, weight: 0, junk: true, special: true, line: 'A bottle with a rolled-up letter inside, sealed with a heart.' },
  { id: 'golden', name: 'Golden fish', rarity: 4, size: [30, 40], band: 'far', fight: 1.25, weight: 0, special: true, line: 'It shines like the sunset. They say it grants one wish.' },
];
export const FISH_BY_ID = Object.fromEntries(FISH.map((f) => [f.id, f]));
export const RARITY = ['', 'Common', 'Uncommon', 'Rare', 'Legendary'];

// ---------------------------------------------------------------- geometry helpers
const V = new THREE.Vector3();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const S = new THREE.Vector3();
const M4 = new THREE.Matrix4();
const COL = new THREE.Color();

// A part of a model: geometry, colour (or paint(color, x, y, z) per vertex) and a transform.
function part(geo, color, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, paint = null, warp = null } = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  geo.dispose();
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  if (warp) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      V.fromBufferAttribute(p, i);
      warp(V);
      p.setXYZ(i, V.x, V.y, V.z);
    }
    g.computeVertexNormals();
  }
  M4.compose(V.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz));
  g.applyMatrix4(M4);
  const p = g.attributes.position;
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.count * 2), 2));
  const col = new Float32Array(p.count * 3);
  const base = new THREE.Color(color);
  for (let i = 0; i < p.count; i++) {
    COL.copy(base);
    if (paint) paint(COL, p.getX(i), p.getY(i), p.getZ(i));
    col[i * 3] = COL.r;
    col[i * 3 + 1] = COL.g;
    col[i * 3 + 2] = COL.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

let DET = 1; // detail: lower for fish that sit far from the camera (the market's ice)
const sphere = (r = 0.5, w = 16, h = 12) => new THREE.SphereGeometry(r, Math.max(5, Math.round(w * DET)), Math.max(4, Math.round(h * DET)));
const lerpC = (c, hex, k) => c.lerp(COL2.set(hex), k);
const COL2 = new THREE.Color();

function eyes(list, x, y, z, r = 0.055) {
  for (const s of [1, -1]) {
    list.push(part(sphere(r, 10, 8), '#ffffff', { x, y, z: z * s }));
    list.push(part(sphere(r * 0.62, 8, 6), '#23202a', { x: x + r * 0.28, y: y + r * 0.05, z: (z + r * 0.55) * s }));
    list.push(part(sphere(r * 0.2, 5, 4), '#ffffff', { x: x + r * 0.5, y: y + r * 0.32, z: (z + r * 0.85) * s }));
  }
}

// A classic fish: rounded body that thins to the tail, a forked tail, fins and big friendly eyes.
function fishBody(list, { back, belly, fin, h = 0.36, w = 0.2, stripes = null, spots = null, tailUp = 0.6 }) {
  list.push(
    part(sphere(0.5, 18, 12), back, {
      sy: h / 0.5 / 2,
      sz: w / 0.5 / 2,
      warp: (v) => {
        const xn = v.x / 0.5;
        const k = 1 - 0.5 * Math.pow(Math.max(0, -xn), 1.6);
        v.y *= k;
        v.z *= k;
      },
      paint: (c, x, y, z) => {
        const t = THREE.MathUtils.clamp(0.5 - y / h, 0, 1);
        lerpC(c, belly, THREE.MathUtils.smoothstep(t, 0.35, 0.75));
        if (stripes) stripes(c, x, y, z);
        if (spots) spots(c, x, y, z);
      },
    }),
  );
  for (const s of [1, -1]) list.push(part(sphere(0.1, 10, 8), fin, { x: -0.58, y: 0.07 * s, rz: tailUp * s, sx: 1.7, sy: 0.55, sz: 0.18 }));
  list.push(part(sphere(0.12, 10, 8), fin, { x: -0.04, y: h * 0.44, rz: -0.2, sx: 1.5, sy: 0.7, sz: 0.14 }));
  for (const s of [1, -1]) list.push(part(sphere(0.06, 8, 6), fin, { x: 0.12, y: -h * 0.12, z: w * 0.42 * s, ry: 0.5 * s, sx: 1.4, sy: 0.6, sz: 0.3 }));
  eyes(list, 0.3, h * 0.12, w * 0.32, 0.05);
}

function build(id) {
  const L = [];
  switch (id) {
    case 'sardine':
      fishBody(L, { back: '#4f86c6', belly: '#eef4f8', fin: '#9cc0e0', h: 0.28, w: 0.15, spots: (c, x, y) => y > 0.02 && Math.abs(((x * 9) % 1) - 0.5) < 0.12 && y < 0.07 && c.set('#2f5f99') });
      break;
    case 'mackerel':
      fishBody(L, { back: '#2f8c86', belly: '#f2f6f2', fin: '#6fb8a8', h: 0.3, w: 0.17, stripes: (c, x, y) => y > 0.0 && Math.sin(x * 34 + y * 40) > 0.55 && c.set('#1f4f5a') });
      break;
    case 'clownfish':
      fishBody(L, {
        back: '#ff8a3d',
        belly: '#ffa860',
        fin: '#ff7a2d',
        h: 0.44,
        w: 0.22,
        tailUp: 0.45,
        stripes: (c, x) => {
          for (const b of [0.18, -0.08, -0.36]) {
            const d = Math.abs(x - b);
            if (d < 0.05) c.set('#ffffff');
            else if (d < 0.07) c.set('#2a2228');
          }
        },
      });
      break;
    case 'seabream':
      fishBody(L, { back: '#e98f9a', belly: '#fff1ec', fin: '#f2b2b8', h: 0.5, w: 0.2, stripes: (c, x, y) => y > 0.06 && Math.sin(x * 30) > 0.7 && lerpC(c, '#c8667a', 0.5) });
      break;
    case 'seabass':
      fishBody(L, { back: '#6f8799', belly: '#f1f4f6', fin: '#9fb3c2', h: 0.34, w: 0.18, stripes: (c, x, y) => Math.abs(y - 0.02) < 0.012 && c.set('#4b6070') });
      break;
    case 'snapper':
      fishBody(L, { back: '#e5484d', belly: '#ffc2b8', fin: '#ff7a6e', h: 0.42, w: 0.2 });
      break;
    case 'tuna':
      fishBody(L, {
        back: '#2c4a86',
        belly: '#e7edf3',
        fin: '#ffd166',
        h: 0.34,
        w: 0.22,
        tailUp: 0.85,
        stripes: (c, x, y) => y < 0.04 && y > -0.02 && lerpC(c, '#8fa9c9', 0.6),
      });
      for (let i = 0; i < 4; i++) L.push(part(new THREE.ConeGeometry(0.02, 0.05, 4), '#ffd166', { x: -0.2 - i * 0.07, y: 0.11 - i * 0.012 }));
      break;
    case 'golden':
      fishBody(L, { back: '#f4b62f', belly: '#fff1b0', fin: '#ffcf5a', h: 0.42, w: 0.2, tailUp: 0.75, spots: (c, x, y) => Math.sin(x * 40) * Math.sin(y * 40) > 0.75 && lerpC(c, '#fff6d0', 0.6) });
      break;
    case 'puffer': {
      L.push(part(sphere(0.38, 18, 14), '#f2d27a', { sy: 0.9, paint: (c, x, y) => (y < -0.1 ? lerpC(c, '#fff6dc', 0.8) : Math.sin(x * 30) * Math.sin(y * 28) > 0.6 && c.set('#b07a3a')) }));
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const b = (i % 2 ? 0.45 : -0.15) + 0.2;
        const n = new THREE.Vector3(Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b));
        const g = new THREE.ConeGeometry(0.035, 0.12, 5);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
        const e = new THREE.Euler().setFromQuaternion(q);
        L.push(part(g, '#c99a4a', { x: n.x * 0.37, y: n.y * 0.34, z: n.z * 0.37, rx: e.x, ry: e.y, rz: e.z }));
      }
      for (const s of [1, -1]) L.push(part(sphere(0.1, 10, 8), '#e6b85a', { x: -0.42, y: 0.04 * s, rz: 0.5 * s, sx: 1.2, sy: 0.6, sz: 0.2 }));
      eyes(L, 0.22, 0.12, 0.18, 0.08);
      L.push(part(new THREE.TorusGeometry(0.04, 0.014, 6, 10), '#e2738a', { x: 0.37, y: -0.04, ry: Math.PI / 2 }));
      break;
    }
    case 'octopus': {
      L.push(part(sphere(0.3, 18, 14), '#c76fa8', { y: 0.22, sy: 1.15, paint: (c, x, y, z) => Math.sin(x * 26 + z * 10) * Math.sin(y * 24) > 0.6 && lerpC(c, '#ffc2e4', 0.5) }));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        L.push(part(new THREE.TorusGeometry(0.16, 0.055, 6, 12, Math.PI * 1.25), i % 2 ? '#c76fa8' : '#b85f99', { x: Math.cos(a) * 0.3, y: -0.06, z: Math.sin(a) * 0.3, ry: -a + Math.PI / 2, rx: 0, rz: 0.3 }));
      }
      eyes(L, 0.24, 0.24, 0.12, 0.07);
      break;
    }
    case 'starfish': {
      const s = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 0.2 : 0.5;
        const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
        if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 });
      L.push(part(g, '#ff8a6a', { rx: -Math.PI / 2, y: -0.04, paint: (c, x, y, z) => Math.sin(x * 40) * Math.sin(z * 40) > 0.7 && c.set('#ffe1c8') }));
      for (const s2 of [1, -1]) {
        L.push(part(sphere(0.06, 10, 8), '#ffffff', { x: 0.02, y: 0.1, z: 0.07 * s2 }));
        L.push(part(sphere(0.035, 8, 6), '#23202a', { x: 0.05, y: 0.13, z: 0.07 * s2 }));
      }
      break;
    }
    case 'crab': {
      L.push(part(sphere(0.3, 16, 12), '#ef6b5b', { sy: 0.55, sx: 0.8, paint: (c, x, y) => y < -0.05 && lerpC(c, '#ffc8a8', 0.7) }));
      for (const s of [1, -1]) {
        L.push(part(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 6), '#ef6b5b', { x: 0.14, y: 0.2, z: 0.08 * s }));
        L.push(part(sphere(0.05, 10, 8), '#ffffff', { x: 0.14, y: 0.3, z: 0.08 * s }));
        L.push(part(sphere(0.028, 8, 6), '#23202a', { x: 0.18, y: 0.31, z: 0.08 * s }));
        L.push(part(sphere(0.12, 10, 8), '#e5484d', { x: 0.3, y: 0.04, z: 0.26 * s, sx: 1.2, sy: 0.7, sz: 0.8 }));
        for (let i = 0; i < 3; i++) L.push(part(new THREE.CylinderGeometry(0.022, 0.016, 0.26, 5), '#e5484d', { x: -0.08 - i * 0.1, y: -0.08, z: 0.26 * s, rx: 1.1 * s }));
      }
      break;
    }
    case 'boot': {
      const brown = '#8a5a3c';
      L.push(part(new THREE.CylinderGeometry(0.17, 0.19, 0.6, 14), brown, { x: -0.22, y: 0.18 }));
      L.push(part(sphere(0.22, 14, 10), brown, { x: 0.08, y: -0.1, sx: 1.8, sy: 0.75, sz: 0.85 }));
      L.push(part(new THREE.BoxGeometry(0.86, 0.06, 0.36), '#4a3020', { x: -0.02, y: -0.24 }));
      L.push(part(new THREE.TorusGeometry(0.17, 0.03, 6, 14), '#5f3d27', { x: -0.22, y: 0.48, rx: Math.PI / 2 }));
      for (let i = 0; i < 3; i++) L.push(part(new THREE.BoxGeometry(0.03, 0.02, 0.2), '#f2e6d0', { x: -0.08 - i * 0.07, y: 0.05 + i * 0.09, rz: 0.4 }));
      for (let i = 0; i < 4; i++) L.push(part(sphere(0.06, 8, 6), '#5aa84f', { x: -0.2 + Math.sin(i) * 0.06, y: 0.52 + i * 0.05, z: Math.cos(i * 2) * 0.06, sy: 1.6 }));
      break;
    }
    case 'duck': {
      L.push(part(sphere(0.32, 16, 12), '#ffd43b', { sx: 1.25, sy: 0.85 }));
      L.push(part(sphere(0.22, 16, 12), '#ffd43b', { x: 0.22, y: 0.3 }));
      L.push(part(sphere(0.1, 10, 8), '#ff8a3d', { x: 0.44, y: 0.26, sx: 1.4, sy: 0.5 }));
      L.push(part(sphere(0.12, 10, 8), '#ffc21f', { x: -0.36, y: 0.12, rz: 0.7, sx: 1.2, sy: 0.6, sz: 0.5 }));
      for (const s of [1, -1]) {
        L.push(part(sphere(0.035, 8, 6), '#23202a', { x: 0.36, y: 0.36, z: 0.12 * s }));
        L.push(part(sphere(0.12, 10, 8), '#ffc21f', { x: -0.04, y: 0.05, z: 0.27 * s, sx: 1.3, sy: 0.6, sz: 0.4 }));
      }
      break;
    }
    case 'bottle': {
      L.push(part(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 10), '#b9814f', { x: 0.52, rz: Math.PI / 2 }));
      L.push(part(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 10), '#fff4dc', { x: -0.02, rz: Math.PI / 2 }));
      L.push(part(new THREE.TorusGeometry(0.065, 0.016, 6, 12), '#ef5b6f', { x: 0.0, rz: Math.PI / 2, ry: Math.PI / 2 }));
      L.push(part(sphere(0.04, 8, 6), '#ef5b6f', { x: 0.0, y: 0.07, sx: 0.6 }));
      break;
    }
  }
  return L;
}

const MATS = {};
const matFor = (id) => {
  const key = id === 'golden' ? 'gold' : 'plain';
  if (!MATS[key]) {
    MATS[key] =
      key === 'gold'
        ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.55, emissive: new THREE.Color('#7a4a00'), emissiveIntensity: 0.35 })
        : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 });
  }
  return MATS[key];
};

// fresh: new materials (the fishing game disposes everything it made when it closes).
// lite: fewer segments, for small fish seen from afar.
export function makeFish(id, { fresh = false, cast = true, lite = false } = {}) {
  const g = new THREE.Group();
  DET = lite ? 0.55 : 1;
  const parts = build(id);
  DET = 1;
  const material = fresh ? matFor(id).clone() : matFor(id);
  const m = new THREE.Mesh(mergeGeometries(parts, false), material);
  for (const p of parts) p.dispose();
  m.castShadow = cast;
  m.receiveShadow = true;
  g.add(m);
  if (id === 'bottle') {
    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.62, 16),
      new THREE.MeshStandardMaterial({ color: '#9fe3d6', transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false }),
    );
    glass.rotation.z = Math.PI / 2;
    glass.position.x = -0.02;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.15, 0.2, 14), glass.material);
    neck.rotation.z = -Math.PI / 2;
    neck.position.x = 0.38;
    glass.renderOrder = neck.renderOrder = 2;
    g.add(glass, neck);
  }
  g.userData.fishId = id;
  return g;
}

// Pick a size in cm, biased toward the small end (big ones are a treat).
export function rollSize(f, boost = 0, rand = Math.random) {
  const k = Math.min(1, Math.pow(rand(), 1.6 - Math.min(0.9, boost)));
  return Math.round(f.size[0] + (f.size[1] - f.size[0]) * k);
}
