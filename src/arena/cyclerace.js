// Cycle Race: race your partner and two friends on bikes through the countryside, over rolling hills,
// through a forest with logs to hop, across a bridge over a stream and past the flower fields.
// The stick points the way (the bike follows the road on its own), pedalling is automatic, hold the
// action button to pedal hard while stamina lasts, Space hops over logs. Collect coins on the way.
import { makeBike, BIKE_SEAT } from '../places/parks/bike.js';
import { skinify } from '../places/parks/rig.js';
import { part, merge } from '../places/parks/kit.js';

const L = 700; // finish line, metres along the course
const HALF = 3.3; // half width of the lane
const SB = 352; // the stream and its bridge
const BRIDGE_HALF = 6.6;
const FOREST = [205, 332];
const FIELDS = [[48, 182], [392, 560]];
const V_CRUISE = 7.6;
const V_SPRINT = 11.2;
const V_OFF = 4.2;
const G = 15;
const LOGS = [
  { s: 226, u0: -HALF, u1: 0.9 },
  { s: 250, u0: -0.9, u1: HALF },
  { s: 274, u0: -HALF, u1: HALF },
  { s: 298, u0: -HALF, u1: 0.6 },
  { s: 318, u0: -HALF, u1: HALF },
];
const FIELD_COLS = ['#ff5d8f', '#ffd75e', '#ffffff', '#c7a6ff', '#ff9a5c', '#ff8fb1'];
const NPCS = [
  { id: 'lulu', name: 'Lulu', gender: 'girl', skin: '#e3b08e', hair: '#7a4a26', hairstyle: 'ponytail', outfit: 'overalls', top: '#fff3df', bottom: '#7fd3a7', shoes: '#ffffff', accent: '#ffd166' },
  { id: 'sami', name: 'Sami', gender: 'boy', skin: '#c98f68', hair: '#2a1a13', hairstyle: 'curly', outfit: 'tee-shorts', top: '#ffd166', bottom: '#3f7bf0', shoes: '#e5484d', accent: '#ef5b6f' },
];

const sstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const envOf = (s) => sstep(12, 60, s) * (1 - sstep(L - 45, L - 5, s));
const flatAt = (s) => sstep(9, 30, Math.abs(s - SB));
function cx(s) {
  const base = (q) => (13 * Math.sin(q * 0.0095) + 6 * Math.sin(q * 0.024 + 1.2)) * envOf(q);
  const c0 = base(SB);
  return c0 + (base(s) - c0) * flatAt(s);
}
function cxd(s) {
  return (cx(s + 0.5) - cx(s - 0.5)) / 1.0;
}
function y0(s) {
  return (2.4 * Math.sin(s * 0.021 - 0.6) + 1.2 * Math.sin(s * 0.051 + 1.0) + 0.5 * Math.sin(s * 0.11)) * envOf(s) * flatAt(s);
}
function terrainY(x, z) {
  const s = -z;
  const u = x - cx(s);
  const au = Math.abs(u);
  let y = y0(s);
  y += sstep(HALF + 1, HALF + 12, au) * 1.1 + Math.max(0, au - HALF - 12) * 0.1;
  y += sstep(HALF + 5, HALF + 22, au) * (1.2 * Math.sin(x * 0.07 + 1) * Math.sin(z * 0.05) + 0.6 * Math.sin(x * 0.17 - z * 0.11));
  const ds = Math.abs(s - SB);
  if (ds < 7.5) y -= 2.0 * (0.5 + 0.5 * Math.cos((Math.PI * ds) / 7.5));
  return y;
}
function onBridge(x, z) {
  const s = -z;
  return Math.abs(s - SB) < BRIDGE_HALF && Math.abs(x - cx(s)) < HALF + 0.35;
}
const DECK = 0.3;
function groundY(x, z) {
  const t = terrainY(x, z);
  if (!onBridge(x, z)) return t;
  const ds = Math.abs(-z - SB);
  return Math.max(t, y0(SB) + DECK * clamp((BRIDGE_HALF - ds) / 1.3, 0, 1));
}
const roadYaw = (s) => Math.atan2(cxd(s), -1);

export default {
  id: 'cyclerace',
  title: 'Cycle Race',
  tagline: 'Race through the countryside',

  async start(ctx) {
    const { THREE, util, scene, camera, hud, input, sound, fx } = ctx;
    const { mat, mesh, canvasTexture, FONT, rng, damp } = util;
    const env = ctx.env.outdoor({ sky: '#a6dde2', fog: [55, 190], sun: [-14, 26, 14], shadow: 24 });
    const vc = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 });
    const vcFlat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true });
    const r = rng(77);
    const look = ctx.looks;
    const me = ctx.me;
    const them = ctx.partner;
    const m4 = new THREE.Matrix4();
    const q4 = new THREE.Quaternion();
    const e4 = new THREE.Euler();
    const v4 = new THREE.Vector3();
    const s4 = new THREE.Vector3();
    const col = new THREE.Color();
    const instances = (geo, material, items, { cast = true, receive = true } = {}) => {
      const im = new THREE.InstancedMesh(geo, material, Math.max(1, items.length));
      items.forEach((it, i) => {
        const s = it.s ?? 1;
        m4.compose(v4.set(it.x, it.y ?? 0, it.z), it.q || q4.setFromEuler(e4.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0)), s4.set(it.sx ?? s, it.sy ?? s, it.sz ?? s));
        im.setMatrixAt(i, m4);
        if (it.color) im.setColorAt(i, col.set(it.color));
      });
      if (!items.length) im.count = 0;
      im.castShadow = cast;
      im.receiveShadow = receive;
      im.computeBoundingSphere();
      scene.add(im);
      return im;
    };
    const anim = {};

    // ---------------------------------------------------------- terrain: road, verges, meadows, fields, the stream
    {
      const US = [0, 1.5, 2.6, 3.0, 3.3, 3.6, 4.4, 5.5, 7.5, 10, 14, 20, 28, 38, 52, 72];
      const cols = [...US.slice(1).reverse().map((u) => -u), ...US];
      const rows = [];
      for (let s = -60; s <= L + 150; s += 1.25) rows.push(s);
      const nC = cols.length;
      const pos = new Float32Array(rows.length * nC * 3);
      const cc = new Float32Array(rows.length * nC * 3);
      const road = new THREE.Color('#efd8ab');
      const roadEdge = new THREE.Color('#e0c08c');
      const grass = new THREE.Color('#9ad06a');
      const forest = new THREE.Color('#7fbf55');
      const bank = new THREE.Color('#d9c49a');
      const bed = new THREE.Color('#7fc0cf');
      const c = new THREE.Color();
      const fc = FIELD_COLS.map((h) => new THREE.Color(h));
      rows.forEach((s, i) => {
        const x0 = cx(s);
        const inForest = sstep(FOREST[0] - 8, FOREST[0] + 4, s) * (1 - sstep(FOREST[1] - 4, FOREST[1] + 8, s));
        const field = Math.max(...FIELDS.map(([a, b]) => sstep(a - 6, a + 6, s) * (1 - sstep(b - 6, b + 6, s))));
        cols.forEach((u, j) => {
          const k = i * nC + j;
          const x = x0 + u;
          const au = Math.abs(u);
          pos.set([x, au <= HALF ? y0(s) + (Math.abs(s - SB) < 7.5 ? terrainY(x, -s) - y0(s) : 0) : terrainY(x, -s), -s], k * 3);
          if (au <= HALF - 0.4) c.copy(road);
          else if (au <= HALF) c.copy(roadEdge);
          else {
            c.copy(grass).lerp(forest, inForest);
            if (field > 0 && au > 5 && au < 40) c.lerp(fc[Math.floor((au + (u < 0 ? 0.6 : 0)) / 2.2) % fc.length], field * 0.85);
          }
          const ds = Math.abs(s - SB);
          if (ds < 8) {
            const k2 = 1 - sstep(4.5, 8, ds);
            c.lerp(bank, k2 * 0.85);
            if (ds < 3.6) c.lerp(bed, 1 - sstep(2, 3.6, ds));
          }
          cc.set([c.r, c.g, c.b], k * 3);
        });
      });
      const idx = [];
      for (let i = 0; i < rows.length - 1; i++)
        for (let j = 0; j < nC - 1; j++) {
          const a = i * nC + j;
          idx.push(a, a + 1, a + nC, a + 1, a + nC + 1, a + nC);
        }
      const tg = new THREE.BufferGeometry();
      tg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      tg.setAttribute('color', new THREE.BufferAttribute(cc, 3));
      tg.setIndex(idx);
      tg.computeVertexNormals();
      const nrm = tg.attributes.normal;
      const sun = new THREE.Vector3(-14, 26, 14).normalize();
      for (let k = 0; k < nrm.count; k++) {
        const lam = 1 + (nrm.getX(k) * sun.x + nrm.getY(k) * sun.y + nrm.getZ(k) * sun.z - sun.y) * 0.8;
        cc[k * 3] *= lam;
        cc[k * 3 + 1] *= lam;
        cc[k * 3 + 2] *= lam;
      }
      tg.attributes.color.needsUpdate = true;
      const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
      terrain.receiveShadow = true;
      scene.add(terrain);
    }

    // ---------------------------------------------------------- stream water, rocks and the bridge
    {
      const waterTex = canvasTexture(256, 64, (g2, w, h) => {
        g2.fillStyle = '#7fd3e6';
        g2.fillRect(0, 0, w, h);
        g2.strokeStyle = 'rgba(255,255,255,0.6)';
        g2.lineWidth = 3;
        for (let i = 0; i < 14; i++) {
          const x = (i * 53) % w;
          const y = (i * 23) % h;
          g2.beginPath();
          g2.moveTo(x, y);
          g2.quadraticCurveTo(x + 10, y - 4, x + 22, y);
          g2.stroke();
        }
      });
      waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping;
      waterTex.repeat.set(14, 1.2);
      const water = mesh(new THREE.PlaneGeometry(160, 7.6), new THREE.MeshStandardMaterial({ map: waterTex, roughness: 0.15 }), { cast: false });
      water.rotation.x = -Math.PI / 2;
      water.position.set(cx(SB), y0(SB) - 1.35, -SB);
      scene.add(water);
      anim.water = waterTex;
      const parts = [];
      const deckY = y0(SB) + DECK;
      const x0 = cx(SB);
      // Deck planks across the stream
      for (let k = -BRIDGE_HALF; k < BRIDGE_HALF; k += 0.55) {
        const ds = Math.abs(k + 0.27);
        const y = deckY * clamp((BRIDGE_HALF - ds) / 1.3, 0, 1);
        parts.push(part(new THREE.BoxGeometry((HALF + 0.35) * 2, 0.12, 0.5), k % 1.1 < 0.55 ? '#d39a62' : '#c98f5f', x0, y - 0.04, -(SB + k + 0.27)));
      }
      // Railings with pink caps, and two beams under the deck
      for (const su of [-1, 1]) {
        const x = x0 + su * (HALF + 0.3);
        for (let k = -BRIDGE_HALF + 0.6; k <= BRIDGE_HALF - 0.6; k += 1.4) {
          parts.push(part(new THREE.BoxGeometry(0.12, 0.9, 0.12), '#fffaf4', x, deckY + 0.45, -(SB + k)));
          parts.push(part(new THREE.SphereGeometry(0.1, 8, 6), '#ff9eb5', x, deckY + 0.95, -(SB + k)));
        }
        parts.push(part(new THREE.BoxGeometry(0.1, 0.1, BRIDGE_HALF * 2 - 1.0), '#fffaf4', x, deckY + 0.82, -SB));
        parts.push(part(new THREE.BoxGeometry(0.08, 0.08, BRIDGE_HALF * 2 - 1.0), '#fffaf4', x, deckY + 0.45, -SB));
        parts.push(part(new THREE.BoxGeometry(0.3, 0.4, BRIDGE_HALF * 2), '#b97d48', x0 + su * (HALF - 0.4), deckY - 0.3, -SB));
      }
      // Rocks along the banks
      for (let i = 0; i < 40; i++) {
        const u = (r() - 0.5) * 70;
        if (Math.abs(u) < HALF + 1) continue;
        const ds = (r() < 0.5 ? -1 : 1) * (3.2 + r() * 1.4);
        const x = x0 + u;
        const z = -(SB + ds);
        parts.push(part(new THREE.IcosahedronGeometry(0.35 + r() * 0.3, 0), r() < 0.5 ? '#d9d2c4' : '#c9c0b0', x, terrainY(x, z) + 0.1, z, { sy: 0.6, ry: r() * 6 }));
      }
      // Reeds
      for (let i = 0; i < 50; i++) {
        const u = (r() - 0.5) * 60;
        if (Math.abs(u) < HALF + 1.5) continue;
        const ds = (r() < 0.5 ? -1 : 1) * (3.6 + r() * 0.8);
        const x = x0 + u;
        const z = -(SB + ds);
        const h = 0.8 + r() * 0.6;
        parts.push(part(new THREE.CylinderGeometry(0.02, 0.03, h, 4), '#5aa84f', x, terrainY(x, z) + h / 2, z, { rz: (r() - 0.5) * 0.3 }));
        if (i % 2) parts.push(part(new THREE.CapsuleGeometry(0.04, 0.12, 2, 6), '#9b6a43', x, terrainY(x, z) + h + 0.05, z));
      }
      const bm = new THREE.Mesh(merge(parts), vc);
      bm.castShadow = bm.receiveShadow = true;
      scene.add(bm);
    }

    // ---------------------------------------------------------- trees, mushrooms, fences, flowers, farm
    {
      const near = [];
      const far = [];
      const pines = [];
      const shroom = [];
      const greens = ['#6dbb58', '#5aa84f', '#84c95f', '#77c05a', '#4f9a45'];
      const addTree = (list, x, z, s) => {
        const y = terrainY(x, z);
        list.push({ x, y, z, s, c: greens[Math.floor(r() * greens.length)], c2: greens[Math.floor(r() * greens.length)], rot: r() * 6 });
      };
      // Forest on both sides of the road
      for (let s = FOREST[0]; s < FOREST[1]; s += 3.4) {
        if (Math.abs(s - SB) < 12) continue;
        for (const su of [-1, 1]) {
          [2.6, 5.8, 9.6, 15.0].forEach((d, li) => {
            const u = su * (HALF + d + r() * 1.6);
            const ss = s + (r() - 0.5) * 2.2;
            const x = cx(ss) + u;
            if (li === 2 && r() < 0.35) pines.push({ x, y: terrainY(x, -ss), z: -ss, s: 0.9 + r() * 0.5 });
            else addTree(li < 2 ? near : far, x, -ss, 0.85 + r() * 0.5);
          });
        }
        for (let k = 0; k < 2; k++) {
          const su = r() < 0.5 ? -1 : 1;
          const u = su * (HALF + 1.0 + r() * 2.5);
          const ss = s + r() * 3;
          const x = cx(ss) + u;
          shroom.push({ x, y: terrainY(x, -ss), z: -ss, s: 0.6 + r() * 0.7, color: r() < 0.7 ? '#ef3b4d' : '#ffb347' });
        }
      }
      // Scattered trees elsewhere
      for (let s = -40; s < L + 120; s += 9) {
        if (s > FOREST[0] - 10 && s < FOREST[1] + 10) continue;
        if (Math.abs(s - SB) < 10) continue;
        const su = r() < 0.5 ? -1 : 1;
        const inField = FIELDS.some(([a, b]) => s > a && s < b);
        const u = su * (HALF + (inField ? 22 : 9) + r() * 30);
        addTree(r() < 0.5 ? near : far, cx(s) + u, -s, 0.9 + r() * 0.6);
      }
      const trunkGeo = new THREE.CylinderGeometry(0.14, 0.22, 1.6, 7).translate(0, 0.8, 0);
      const trunkMat = mat('#9b6a43', { rough: 0.9 });
      const all = [...near, ...far];
      instances(trunkGeo, trunkMat, all.map((t) => ({ x: t.x, y: t.y - 0.1, z: t.z, s: t.s })));
      const crown = (geo, list, cast) => {
        const items = [];
        for (const t of list) {
          items.push({ x: t.x, y: t.y + 2.05 * t.s, z: t.z, s: 1.0 * t.s, sy: 0.92 * t.s, color: t.c, ry: t.rot });
          items.push({ x: t.x + 0.5 * t.s * Math.cos(t.rot), y: t.y + 1.7 * t.s, z: t.z + 0.5 * t.s * Math.sin(t.rot), s: 0.68 * t.s, color: t.c2, ry: t.rot });
        }
        instances(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, flatShading: true }), items, { cast });
      };
      crown(new THREE.IcosahedronGeometry(1, 1), near, true);
      crown(new THREE.IcosahedronGeometry(1, 0), far, false);
      // Pines: three cones
      const pineParts = [part(new THREE.CylinderGeometry(0.1, 0.16, 0.8, 6), '#8b5e3c', 0, 0.4, 0)];
      [[1.1, 1.3, 0.6], [0.85, 1.15, 1.3], [0.6, 1.0, 2.0]].forEach(([rr, h, y], i) => pineParts.push(part(new THREE.ConeGeometry(rr, h, 8), i === 1 ? '#3f8a55' : '#4d9a5f', 0, y + h / 2, 0)));
      instances(merge(pineParts), vcFlat, pines);
      // Mushrooms: red caps with white dots
      const mParts = [part(new THREE.CylinderGeometry(0.07, 0.09, 0.22, 8), '#fff6ea', 0, 0.11, 0)];
      mParts.push(part(new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#ffffff', 0, 0.2, 0, { sy: 0.75 }));
      const mi = instances(merge(mParts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), shroom);
      mi.castShadow = false;
      // Fence posts and rails along the meadows
      const posts = [];
      const rails = [];
      for (let s = 8; s < L + 60; s += 3.2) {
        if (s > FOREST[0] - 6 && s < FOREST[1] + 6) continue;
        if (Math.abs(s - SB) < BRIDGE_HALF + 2) continue;
        for (const su of [-1, 1]) {
          const u = su * (HALF + 1.0);
          const x = cx(s) + u;
          const y = terrainY(x, -s);
          posts.push({ x, y: y + 0.42, z: -s });
          const s2 = s + 3.2;
          const x2 = cx(s2) + u;
          const y2 = terrainY(x2, -s2);
          const len = Math.hypot(x2 - x, 3.2);
          if (!(s2 > FOREST[0] - 6 && s2 < FOREST[1] + 6) && Math.abs(s2 - SB) >= BRIDGE_HALF + 2) {
            const dir = new THREE.Vector3(x2 - x, y2 - y, -3.2).normalize();
            const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
            for (const hy of [0.32, 0.62]) rails.push({ x: (x + x2) / 2, y: (y + y2) / 2 + hy, z: -(s + 1.6), q, sz: len });
          }
        }
      }
      instances(new THREE.BoxGeometry(0.12, 0.84, 0.12), mat('#fffaf4', { rough: 0.7 }), posts);
      instances(new THREE.BoxGeometry(0.06, 0.08, 1), mat('#fffaf4', { rough: 0.7 }), rails, { cast: false });
      // Flower fields: rows of coloured blooms beside the road
      const heads = [];
      const stems = [];
      for (const [a, b] of FIELDS) {
        for (let s = a; s < b; s += 1.0) {
          for (const su of [-1, 1]) {
            for (const d of [5.3, 6.6, 7.9]) {
              const u = su * (d + (r() - 0.5) * 0.4);
              const ss = s + (r() - 0.5) * 0.6;
              const x = cx(ss) + u;
              const y = terrainY(x, -ss);
              const h = 0.35 + r() * 0.2;
              const ci = Math.floor((Math.abs(u) + (u < 0 ? 0.6 : 0)) / 2.2) % FIELD_COLS.length;
              stems.push({ x, y, z: -ss, sy: h, color: '#4f9a45' });
              heads.push({ x, y: y + h, z: -ss, s: 1 + r() * 0.4, color: FIELD_COLS[ci], ry: r() * 6 });
            }
          }
        }
      }
      instances(new THREE.CylinderGeometry(0.018, 0.022, 1, 4, 1, true).translate(0, 0.5, 0), mat('#ffffff', { rough: 0.8 }), stems, { cast: false });
      instances(new THREE.IcosahedronGeometry(0.11, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, flatShading: true }), heads, { cast: false });
      // Farm: a red barn, hay bales and a windmill with turning sails
      const farm = [];
      const place = (s, u) => {
        const x = cx(s) + u;
        return { x, y: terrainY(x, -s), z: -s };
      };
      const barn = place(118, 24);
      farm.push(part(new THREE.BoxGeometry(6, 4, 5), '#e5484d', barn.x, barn.y + 2, barn.z, { ry: 0.3 }));
      farm.push(part(new THREE.ConeGeometry(4.6, 2.4, 4), '#fff2e1', barn.x, barn.y + 5.2, barn.z, { ry: 0.3 + Math.PI / 4, sz: 0.85 }));
      farm.push(part(new THREE.BoxGeometry(2, 2.6, 0.1), '#fffaf4', barn.x - Math.sin(0.3) * 0.0 + Math.sin(0.3) * 2.55, barn.y + 1.3, barn.z + Math.cos(0.3) * 2.55, { ry: 0.3 }));
      for (let i = 0; i < 9; i++) {
        const h = place(96 + i * 7, (i % 2 ? -1 : 1) * (11 + (i % 3) * 3));
        farm.push(part(new THREE.CylinderGeometry(0.7, 0.7, 1.1, 14), '#f2cf74', h.x, h.y + 0.7, h.z, { rz: Math.PI / 2, ry: i }));
      }
      const mill = place(470, -26);
      farm.push(part(new THREE.CylinderGeometry(1.2, 2.0, 7, 10), '#fff2e1', mill.x, mill.y + 3.5, mill.z));
      farm.push(part(new THREE.ConeGeometry(1.6, 1.8, 10), '#ef7d8f', mill.x, mill.y + 7.9, mill.z));
      const cot = place(530, 23);
      farm.push(part(new THREE.BoxGeometry(4, 2.6, 3.4), '#fff2e1', cot.x, cot.y + 1.3, cot.z, { ry: -0.4 }));
      farm.push(part(new THREE.ConeGeometry(3.4, 1.8, 4), '#63c7ba', cot.x, cot.y + 3.5, cot.z, { ry: -0.4 + Math.PI / 4, sz: 0.85 }));
      const fm = new THREE.Mesh(merge(farm), vc);
      fm.castShadow = fm.receiveShadow = true;
      scene.add(fm);
      const sails = new THREE.Group();
      const sp = [];
      for (let k = 0; k < 4; k++) sp.push(part(new THREE.BoxGeometry(0.6, 3.6, 0.06), k % 2 ? '#ffffff' : '#ffd6e2', 0, 1.9, 0, {}).applyMatrix4(new THREE.Matrix4().makeRotationZ((k * Math.PI) / 2)));
      sp.push(part(new THREE.SphereGeometry(0.3, 10, 8), '#ef7d8f', 0, 0, 0));
      sails.add(new THREE.Mesh(merge(sp), vc));
      sails.position.set(mill.x + 0.2, mill.y + 6.2, mill.z + 1.9);
      sails.rotation.y = 0.25;
      scene.add(sails);
      anim.sails = sails;
    }

    // ---------------------------------------------------------- logs, start and finish arches
    const logParts = [];
    for (const lg of LOGS) {
      const um = (lg.u0 + lg.u1) / 2;
      const len = lg.u1 - lg.u0 + 0.2;
      const x = cx(lg.s) + um;
      const y = terrainY(x, -lg.s);
      const yaw = Math.atan2(cxd(lg.s), 1);
      logParts.push(part(new THREE.CylinderGeometry(0.22, 0.22, len, 12), '#9b6a43', x, y + 0.2, -lg.s, { rz: Math.PI / 2, ry: -yaw * 0 }));
      for (const su of [-1, 1]) logParts.push(part(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 12), '#e8c79a', x + su * (len / 2 + 0.005), y + 0.2, -lg.s, { rz: Math.PI / 2 }));
      for (let k = 0; k < 3; k++) logParts.push(part(new THREE.SphereGeometry(0.06, 6, 4), '#6dbb58', x - len / 2 + 0.4 + k * (len / 3), y + 0.42, -lg.s, { sy: 0.5 }));
      lg.y = y;
    }
    const logs = new THREE.Mesh(merge(logParts), vc);
    logs.castShadow = logs.receiveShadow = true;
    scene.add(logs);

    const banner = (text, fg) =>
      canvasTexture(768, 192, (g2, w, h) => {
        g2.fillStyle = '#fffaf4';
        g2.fillRect(0, 0, w, h);
        const sq = 24;
        for (let i = 0; i < w / sq; i++)
          for (const row of [0, 1]) {
            g2.fillStyle = (i + row) % 2 ? '#3b2b3f' : '#ffffff';
            g2.fillRect(i * sq, row * sq, sq, sq);
            g2.fillRect(i * sq, h - (2 - row) * sq, sq, sq);
          }
        g2.fillStyle = fg;
        g2.textAlign = 'center';
        g2.textBaseline = 'middle';
        g2.font = `700 ${h * 0.42}px ${FONT}`;
        g2.fillText(text, w / 2, h / 2 + 4);
      });
    const arch = (s, text, color) => {
      const grp = new THREE.Group();
      const x0 = cx(s);
      const y = y0(s);
      const w = HALF * 2 + 1.4;
      const ap = [];
      for (const su of [-1, 1]) {
        for (let i = 0; i < 6; i++) ap.push(part(new THREE.CylinderGeometry(0.38, 0.38, 0.75, 14), i % 2 ? '#ffffff' : color, su * (w / 2), 0.375 + i * 0.75, 0));
        ap.push(part(new THREE.SphereGeometry(0.46, 14, 10), '#ffd166', su * (w / 2), 4.75, 0));
      }
      ap.push(part(new THREE.BoxGeometry(w, 1.2, 0.3), color, 0, 4.3, 0));
      const am = new THREE.Mesh(merge(ap), vc);
      am.castShadow = true;
      grp.add(am);
      const face = mesh(new THREE.PlaneGeometry(w * 0.62, 1.05), new THREE.MeshStandardMaterial({ map: banner(text, color), roughness: 0.7 }), { cast: false });
      face.position.set(0, 4.3, 0.16);
      const face2 = face.clone();
      face2.rotation.y = Math.PI;
      face2.position.z = -0.16;
      grp.add(face, face2);
      grp.position.set(x0, y, -s);
      grp.rotation.y = -Math.atan(cxd(s));
      scene.add(grp);
      const line = mesh(
        new THREE.PlaneGeometry(HALF * 2, 0.9),
        new THREE.MeshStandardMaterial({
          map: canvasTexture(512, 32, (g2, ww, hh) => {
            for (let i = 0; i < 32; i++) for (let j = 0; j < 2; j++) {
              g2.fillStyle = (i + j) % 2 ? '#3b2b3f' : '#ffffff';
              g2.fillRect((i * ww) / 32, (j * hh) / 2, ww / 32, hh / 2);
            }
          }),
          roughness: 0.9,
        }),
        { cast: false },
      );
      line.rotation.set(-Math.PI / 2, 0, -Math.atan(cxd(s)));
      line.position.set(x0, y + 0.03, -s);
      scene.add(line);
      // Balloons tied to the posts
      const bal = [];
      for (const su of [-1, 1]) for (let k = 0; k < 3; k++) {
        const bx = x0 + su * (w / 2 + 0.5 + k * 0.35);
        const by = y + 3.0 + k * 0.5;
        bal.push(part(new THREE.SphereGeometry(0.32, 12, 10), ['#ff8fb1', '#ffd166', '#7fb0ff'][k], bx, by, -s, { sy: 1.15 }));
        bal.push(part(new THREE.CylinderGeometry(0.008, 0.008, by - y - 0.3, 3), '#ffffff', bx - su * 0.2, (by + y) / 2, -s, { rz: su * 0.12 }));
      }
      scene.add(new THREE.Mesh(merge(bal), vc));
      return grp;
    };
    arch(4, 'Start', '#4aa3df');
    arch(L, 'Finish', '#ef5b6f');

    // Distant hills and clouds that stay on the horizon
    const far = new THREE.Group();
    {
      const hp = [];
      for (let i = 0; i < 14; i++) {
        const x = -420 + i * 65 + (i % 3) * 12;
        const rr = 60 + (i % 4) * 22;
        hp.push(part(new THREE.SphereGeometry(rr, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), i % 2 ? '#8cc96a' : '#7fbf62', x, -rr * 0.35, (i % 2) * 40, { sy: 0.55 }));
      }
      const cp = [];
      for (const [x, y, z] of [[-200, 90, 30], [-40, 110, 0], [120, 95, 40], [280, 105, 10], [-330, 100, 20]]) {
        for (let i = 0; i < 4; i++) cp.push(part(new THREE.IcosahedronGeometry(10 + (i % 2) * 5, 2), '#ffffff', x + i * 13, y + (i % 2) * 5, z, { sy: 0.6 }));
      }
      const hm = new THREE.Mesh(merge(hp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, fog: false, emissive: '#9ed08a', emissiveIntensity: 0.25 }));
      const cm = new THREE.Mesh(merge(cp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, fog: false, emissive: '#ffffff', emissiveIntensity: 0.7 }));
      far.add(hm, cm);
      scene.add(far);
    }

    // ---------------------------------------------------------- coins
    const coins = [];
    const line = (s0, u, n = 6, gap = 2.6, du = 0) => {
      for (let i = 0; i < n; i++) {
        const s = s0 + i * gap;
        const uu = u + du * i;
        const x = cx(s) + uu;
        coins.push({ x, z: -s, y: groundY(x, -s) + 0.85, s, alive: true });
      }
    };
    line(30, 0, 6);
    line(70, -1.8, 6, 2.6, 0.5);
    line(120, 1.8, 6);
    line(165, 0, 5, 3);
    for (const lg of LOGS) {
      const um = lg.u0 < -HALF + 0.1 && lg.u1 > HALF - 0.1 ? 0 : (lg.u0 + lg.u1) / 2;
      for (let k = 0; k < 3; k++) {
        const s = lg.s - 1.2 + k * 1.2;
        const x = cx(s) + um;
        coins.push({ x, z: -s, y: terrainY(x, -s) + 1.25 + (k === 1 ? 0.3 : 0), s, alive: true });
      }
    }
    line(SB - 5, 0, 5, 2.5);
    line(400, -2, 6, 2.6, 0.7);
    line(450, 2, 6);
    line(505, 0, 6, 2.4);
    line(560, -1.5, 6, 2.6, 0.5);
    line(615, 1.6, 6);
    line(660, 0, 5, 3);
    const coinMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.28, 0.07, 12).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#f4c24f', metalness: 0.6, roughness: 0.3, emissive: '#f4a020', emissiveIntensity: 0.3 }), coins.length);
    coinMesh.castShadow = true;
    coinMesh.frustumCulled = false;
    scene.add(coinMesh);

    // ---------------------------------------------------------- racers
    const bikeCol = (id) => (id === 'roji' ? '#ff8fb1' : id === 'homama' ? '#6fb8ff' : id === 'lulu' ? '#7fd3a7' : '#ffd166');
    const makeRacer = (id, lane, ai, skill) => {
      const lk = look[id] || NPCS.find((n) => n.id === id);
      const kid = ctx.makeKid(lk);
      kid.pose = 'bike';
      const bike = makeBike(bikeCol(id), { accent: id === 'roji' ? '#ffffff' : '#ffd166', item: id === 'roji' ? 'flowers' : id === 'homama' ? 'laptop' : null });
      const rig = new THREE.Group();
      const tilt = new THREE.Group();
      rig.add(tilt);
      tilt.add(bike.root);
      bike.root.add(kid.root);
      kid.root.position.set(0, BIKE_SEAT.y, BIKE_SEAT.z);
      skinify(kid.root);
      scene.add(rig);
      const x = cx(1) + lane;
      return {
        id, name: lk.name, kid, bike, rig, tilt, ai, lane, skill,
        x, z: -1, y: groundY(x, -1), vy: 0, yaw: roadYaw(1), v: 0, turn: 0, air: false, airT: 0,
        stamina: 1, tired: false, sprint: false, stumble: 0, coins: 0, finish: null, logDone: new Set(), hopPlan: new Map(),
        prefU: lane, coinPlan: null, sprintT: 1 + r() * 4, pitch: 0, roll: 0,
      };
    };
    const lanes = [-2.3, -0.75, 0.75, 2.3];
    const Pl = makeRacer(me, lanes[1], false, 1);
    const Cp = makeRacer(them, lanes[2], true, 0.965);
    const N1 = makeRacer('lulu', lanes[0], true, 0.975);
    const N2 = makeRacer('sami', lanes[3], true, 0.955);
    const racers = [Pl, Cp, N1, N2];

    // ---------------------------------------------------------- race state and helpers
    let running = false;
    let finished = false;
    let disposed = false;
    let raceT = 0;
    let doneT = -1;
    let auto = false;
    let hudT = 0;
    let order = racers.slice();
    const msg = (t, ms = 900) => hud.message(t, ms);
    const tone = (f, d, dur, o) => sound?.ctx && !sound.muted && sound.tone(f, sound.ctx.currentTime + d, dur, o);
    const bell = () => [0, 0.16].forEach((d) => tone(2350, d, 0.45, { gain: 0.05 }));
    hud.buttons({ action: 'Pedal', jump: 'Hop' });
    hud.hint('Stick or arrows point the way, hold E to pedal hard, Space to hop over logs');

    const nextLog = (rc) => {
      const s = -rc.z;
      for (const lg of LOGS) if (lg.s > s - 0.3 && !rc.logDone.has(lg)) return lg;
      return null;
    };

    // Computer rider: keep a lane, slip round logs that leave a gap, hop the rest, chase a few coins.
    const driver = (rc, dt) => {
      const s = -rc.z;
      const u = rc.x - cx(s);
      let tu = rc.prefU;
      let hop = false;
      const lg = nextLog(rc);
      if (lg && lg.s - s < 24) {
        if (!rc.hopPlan.has(lg)) {
          const full = lg.u0 <= -HALF + 0.05 && lg.u1 >= HALF - 0.05;
          const gapLeft = lg.u0 + HALF;
          const gapRight = HALF - lg.u1;
          let plan;
          if (full || Math.random() < 0.5) plan = { hop: Math.random() < rc.skill * 0.92 + (rc.ai ? 0 : 1), u: tu };
          else plan = { hop: false, u: gapLeft > gapRight ? -HALF + gapLeft / 2 : HALF - gapRight / 2 };
          rc.hopPlan.set(lg, plan);
        }
        const plan = rc.hopPlan.get(lg);
        tu = plan.u;
        if (plan.hop && !rc.air && lg.s - s < rc.v * 0.2 + 0.7 && lg.s - s > 0.2) hop = true;
      }
      const ds = Math.min(40, Math.max(6, rc.v * 1.4));
      const ahead = s + ds;
      const want = roadYaw(ahead) - Math.atan2((tu - u) * 0.9, ds);
      let sprint = false;
      rc.sprintT -= dt;
      if (!rc.tired && rc.stamina > 0.55 && (s > L - 140 || rc.sprintT < 0)) sprint = true;
      if (rc.sprint && rc.stamina > 0.12 && !rc.tired) sprint = true;
      if (!sprint && rc.sprint) rc.sprintT = 3 + Math.random() * 5;
      return { yaw: want, sprint, hop, brake: 0 };
    };

    const stepRacer = (rc, dt, ctrl) => {
      const s = -rc.z;
      const u = rc.x - cx(s);
      const off = Math.abs(u) > HALF + 0.3;
      if (rc.stumble > 0) rc.stumble -= dt;
      // Steering toward the wanted heading
      let d = ctrl.yaw - rc.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const prev = rc.yaw;
      const rate = rc.air ? 0.8 : 2.4;
      rc.yaw += clamp(d, -rate * dt, rate * dt);
      rc.turn = (rc.yaw - prev) / Math.max(dt, 1e-3);
      // Stamina and speed
      rc.sprint = ctrl.sprint && !rc.tired && rc.stamina > 0 && rc.stumble <= 0 && rc.finish === null;
      if (rc.sprint) rc.stamina = Math.max(0, rc.stamina - dt / 3.6);
      else rc.stamina = Math.min(1, rc.stamina + dt / 5.5);
      if (rc.stamina <= 0) rc.tired = true;
      if (rc.tired && rc.stamina > 0.3) rc.tired = false;
      const band = rc.ai ? clamp((-Pl.z - s) / 90, -0.07, 0.06) : 0;
      let target = (rc.sprint ? V_SPRINT : V_CRUISE) * rc.skill * (1 + band);
      if (off) target = Math.min(target, V_OFF);
      if (rc.stumble > 0) target *= 0.35;
      if (rc.finish !== null) target = 0;
      target *= 1 - (ctrl.brake || 0) * 0.6;
      const fx2 = Math.sin(rc.yaw);
      const fz2 = Math.cos(rc.yaw);
      if (!rc.air) {
        const grad = (groundY(rc.x + fx2 * 0.6, rc.z + fz2 * 0.6) - groundY(rc.x - fx2 * 0.6, rc.z - fz2 * 0.6)) / 1.2;
        target -= grad * 9;
      }
      const rateV = target > rc.v ? 1.6 : rc.finish !== null ? 1.8 : 2.4;
      rc.v += (target - rc.v) * (1 - Math.exp(-rateV * dt));
      rc.v = Math.max(0, rc.v);
      rc.x += fx2 * rc.v * dt;
      rc.z += fz2 * rc.v * dt;
      // Stay on the bridge and inside the valley
      const s2 = -rc.z;
      const u2 = rc.x - cx(s2);
      if (Math.abs(s2 - SB) < BRIDGE_HALF + 0.2 && Math.abs(u2) > HALF - 0.05) rc.x = cx(s2) + Math.sign(u2) * (HALF - 0.05);
      const lim = s2 > FOREST[0] && s2 < FOREST[1] ? HALF + 1.9 : HALF + 0.62;
      if (Math.abs(u2) > lim) rc.x = cx(s2) + Math.sign(u2) * lim;
      // Hop
      if (ctrl.hop && !rc.air && rc.stumble <= 0) {
        rc.air = true;
        rc.airT = 0;
        rc.vy = 4.8;
        rc.kid.squash = 1.2;
        if (!rc.ai) sound.jump();
      }
      const g = groundY(rc.x, rc.z);
      if (rc.air) {
        rc.vy -= G * dt;
        rc.y += rc.vy * dt;
        rc.airT += dt;
        if (rc.y <= g) {
          rc.y = g;
          rc.air = false;
          rc.vy = 0;
          rc.kid.squash = 0.82;
          if (!rc.ai) sound.land();
        }
      } else {
        const pred = rc.y + rc.vy * dt - 0.5 * G * dt * dt;
        if (pred > g + 0.12 && rc.v > 6) {
          rc.air = true;
          rc.airT = 0;
          rc.y = pred;
        } else {
          rc.vy = (g - rc.y) / Math.max(dt, 1e-3);
          rc.vy = Math.min(rc.vy, 3);
          rc.y = g;
        }
      }
      // Logs: hop over them or wobble
      const sNow = -rc.z;
      const uNow = rc.x - cx(sNow);
      for (const lg of LOGS) {
        if (rc.logDone.has(lg)) continue;
        if (sNow < lg.s - 0.35) continue;
        rc.logDone.add(lg);
        const hit = uNow > lg.u0 - 0.25 && uNow < lg.u1 + 0.25 && rc.y - lg.y < 0.45;
        if (hit) {
          rc.stumble = 0.9;
          rc.v *= 0.45;
          rc.kid.squash = 0.75;
          if (!rc.ai) {
            msg('Bump!', 800);
            sound.ui('bad');
          }
        } else if (!rc.ai && rc.air && uNow > lg.u0 - 0.25 && uNow < lg.u1 + 0.25) {
          msg('Nice hop!', 700);
          sound.ui('good');
        }
      }
      // Coins (the player collects them)
      if (!rc.ai) {
        for (const c of coins) {
          if (!c.alive || Math.abs(c.s - sNow) > 1.2) continue;
          if (Math.hypot(c.x - rc.x, c.z - rc.z) < 0.85 && Math.abs(c.y - (rc.y + 0.9)) < 0.75) {
            c.alive = false;
            rc.coins++;
            sound.ui('coin');
            fx.burst(new THREE.Vector3(c.x, c.y, c.z), ['#ffd166', '#ffffff'], 8);
          }
        }
      }
      // Riders bump gently
      for (const o of racers) {
        if (o === rc) continue;
        const bx = rc.x - o.x;
        const bz = rc.z - o.z;
        const bd = Math.hypot(bx, bz);
        if (bd < 0.7 && bd > 1e-3) {
          rc.x += (bx / bd) * (0.7 - bd) * 0.5;
          rc.z += (bz / bd) * (0.7 - bd) * 0.2;
        }
      }
      // Finish line
      if (rc.finish === null && -rc.z >= L) {
        rc.finish = raceT;
        if (!rc.ai) {
          const place = racers.filter((o) => o.finish !== null).length;
          msg(place === 1 ? 'First place!' : 'Finish!', 1600);
          sound.ui('win');
        }
      }
    };

    // Pose one rider: rig on the ground, pitch with the slope, lean into turns
    const poseRacer = (rc, dt, t) => {
      const fx2 = Math.sin(rc.yaw);
      const fz2 = Math.cos(rc.yaw);
      const a = groundY(rc.x + fx2 * 0.55, rc.z + fz2 * 0.55);
      const b = groundY(rc.x - fx2 * 0.55, rc.z - fz2 * 0.55);
      const pitchT = rc.air ? -0.12 : -Math.atan2(a - b, 1.1);
      rc.pitch = damp(rc.pitch, pitchT, 10, dt);
      rc.roll = damp(rc.roll, clamp(-rc.turn * 0.18, -0.4, 0.4) + (rc.stumble > 0 ? Math.sin(t * 22) * 0.22 : 0), 8, dt);
      rc.rig.position.set(rc.x, rc.y, rc.z);
      rc.rig.rotation.set(0, rc.yaw, 0);
      rc.tilt.rotation.set(rc.pitch, 0, rc.roll);
      const k = rc.kid;
      if (k.pose === 'bike') {
        k.update(dt, t, rc.v, 0, rc.turn);
        rc.bike.pedal(k.pedal || 0);
        rc.bike.roll(rc.v * dt);
        rc.bike.steer(clamp(rc.turn * 0.2, -0.4, 0.4));
      } else k.update(dt, t, 0, 0, 0);
      rc.bike.update(dt);
    };

    // ---------------------------------------------------------- camera
    const camPos = new THREE.Vector3();
    const camLook = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    let camYaw = roadYaw(0);
    const placeCam = (dt, snap = false) => {
      if (finished) {
        const mx = order.slice(0, 4).reduce((a, o) => a + o.x, 0) / 4;
        const mz = Math.max(...racers.map((o) => o.z));
        const my = groundY(mx, mz);
        tmp.set(mx + 1.5, my + 2.6, mz - 7.5);
        if (snap) camPos.copy(tmp);
        else camPos.lerp(tmp, 1 - Math.exp(-3 * dt));
        tmp.set(mx, my + 1.0, mz + 0.5);
        if (snap) camLook.copy(tmp);
        else camLook.lerp(tmp, 1 - Math.exp(-4 * dt));
      } else {
        const s = -Pl.z;
        const ry = roadYaw(s + 4);
        let d = ry - camYaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        camYaw += d * (snap ? 1 : 1 - Math.exp(-2.5 * dt));
        const back = 6.6;
        tmp.set(Pl.x - Math.sin(camYaw) * back, 0, Pl.z - Math.cos(camYaw) * back);
        tmp.y = Math.max(Pl.y + 3.3, groundY(tmp.x, tmp.z) + 2.0);
        if (snap) camPos.copy(tmp);
        else camPos.lerp(tmp, 1 - Math.exp(-7 * dt));
        tmp.set(Pl.x + Math.sin(camYaw) * 5.5, 0, Pl.z + Math.cos(camYaw) * 5.5);
        tmp.y = Math.max(Pl.y, groundY(tmp.x, tmp.z)) + 0.9;
        if (snap) camLook.copy(tmp);
        else camLook.lerp(tmp, 1 - Math.exp(-8 * dt));
      }
      camera.position.copy(camPos);
      camera.lookAt(camLook);
      const fov = 52 + (Pl.sprint ? 6 : 0) + Math.min(6, Pl.v * 0.3);
      if (Math.abs(camera.fov - fov) > 0.1) {
        camera.fov = damp(camera.fov, fov, 3, dt);
        camera.updateProjectionMatrix();
      }
      far.position.set(camera.position.x * 0.9, camera.position.y - 30, camera.position.z - 360);
      env.follow(tmp.set(Pl.x, Pl.y, Pl.z - 5));
    };

    // ---------------------------------------------------------- HUD
    const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
    const ord = (n) => ['1st', '2nd', '3rd', '4th'][n - 1];
    const colorOf = (id) => (id === 'roji' ? '#ef5b6f' : id === 'homama' ? '#3f7bf0' : id === 'lulu' ? '#3fbf7f' : '#f0a020');
    const drawHud = () => {
      order = racers.slice().sort((a, b) => (a.finish ?? 1e9) - (b.finish ?? 1e9) || a.z - b.z);
      const place = order.indexOf(Pl) + 1;
      const dot = (k, c) => `<i style="position:absolute;top:-4px;left:calc(${(k * 100).toFixed(1)}% - 6px);width:12px;height:12px;border-radius:50%;background:${c};box-shadow:0 0 0 2px #fff"></i>`;
      const bar = `<span style="display:inline-block;width:64px;height:9px;border-radius:5px;background:#eadfe6;overflow:hidden;vertical-align:middle"><b style="display:block;height:100%;width:${Math.round(Pl.stamina * 100)}%;background:${Pl.tired ? '#c9b8c2' : Pl.sprint ? '#ef5b6f' : '#3fbf7f'}"></b></span>`;
      const track = `<span style="position:relative;display:inline-block;width:86px;height:5px;border-radius:3px;background:#e6dce3;vertical-align:middle">${racers.filter((o) => o !== Pl).map((o) => dot(clamp(-o.z / L, 0, 1), colorOf(o.id))).join('')}${dot(clamp(-Pl.z / L, 0, 1), colorOf(Pl.id))}</span>`;
      hud.score(`<span style="display:inline-flex;align-items:center;gap:10px;white-space:nowrap">${ord(place)}<span style="font-weight:600;font-size:.82em;color:#a07a1a">${Pl.coins} ${Pl.coins === 1 ? 'coin' : 'coins'}</span>${bar}${track}</span>`);
    };
    drawHud();

    // Medal over the winner
    const medal = new THREE.Group();
    {
      const disc = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 24), mat('#f4c24f', { metal: 0.6, rough: 0.3, emissive: '#f4a020', ei: 0.25 }));
      disc.rotation.x = Math.PI / 2;
      const ribbon = mesh(new THREE.BoxGeometry(0.12, 0.34, 0.02), mat('#ef5b6f'));
      ribbon.position.y = 0.32;
      medal.add(disc, ribbon);
      medal.visible = false;
      scene.add(medal);
    }

    const results = () => {
      if (disposed) return;
      const times = racers.map((o) => ({ o, t: o.finish ?? raceT + Math.max(0, (L + o.z) / Math.max(5, o.v || V_CRUISE)) }));
      times.sort((a, b) => a.t - b.t);
      const place = times.findIndex((x) => x.o === Pl) + 1;
      const myT = times.find((x) => x.o === Pl).t;
      const prev = ctx.load('best', null);
      const newBest = prev === null || myT < prev;
      if (newBest) ctx.save('best', myT);
      const coinBest = Math.max(ctx.load('coins', 0) || 0, Pl.coins);
      ctx.save('coins', coinBest);
      const partnerName = look[them].name;
      const lines = times.map((x, i) => `${ord(i + 1)} ${x.o.name} ${fmt(x.t)}`);
      const sweet = place === 1 ? `${partnerName} rings the bell for you.` : Cp.finish !== null && times[0].o === Cp ? `${partnerName} waits for you at the finish with a hug.` : `${partnerName} says you rode brilliantly.`;
      ctx.finish({
        win: place === 1,
        place,
        time: myT,
        title: place === 1 ? 'You win the race!' : place === 2 ? 'Second place!' : place === 3 ? 'Third place!' : 'Well ridden!',
        text: `${lines.join('<br>')}<br>${Pl.coins} of ${coins.length} coins &middot; ${newBest ? 'New best time!' : `Best ${fmt(prev)}`}<br>${sweet}`,
      });
    };

    const endRace = () => {
      drawHud();
      finished = true;
      running = false;
      order = racers.slice().sort((a, b) => (a.finish ?? 1e9) - (b.finish ?? 1e9) || a.z - b.z);
      // Everyone hops off and stands beside their bike, facing the camera
      const mz = Math.max(...racers.map((o) => o.z)) - 3;
      order.forEach((o, i) => {
        o.x = cx(-mz) + (i - 1.5) * 1.6;
        o.z = mz;
        o.y = groundY(o.x, o.z);
        o.yaw = roadYaw(-mz) + Math.PI * 0.5;
        o.v = 0;
        o.air = false;
        o.kid.pose = 'stand';
        o.kid.root.position.set(-0.6, 0, 0.15);
        o.kid.root.rotation.set(0, -Math.PI / 2, 0);
      });
      const winner = order[0];
      winner.kid.emote('cheer');
      setTimeout(() => !disposed && Pl.kid.emote(Pl === winner ? 'cheer' : 'heart'), 400);
      setTimeout(() => !disposed && Cp.kid.emote(Cp === winner ? 'cheer' : 'heart'), 700);
      medal.visible = true;
      medal.userData.who = winner;
      fx.burst(new THREE.Vector3(winner.x, winner.y + 1.6, winner.z), ['#ffd166', '#ffffff', '#ff8fb1', '#8fd8ff'], 60);
      placeCam(0.016, true);
      setTimeout(results, 2200);
    };

    // ---------------------------------------------------------- update
    const tick = (dt) => {
      if (running) raceT += dt;
      if (!running) return;
      const ax = input.axis();
      let pc;
      if (auto) pc = driver(Pl, dt);
      else {
        const s = -Pl.z;
        const ry = roadYaw(s + 3);
        const mag = Math.hypot(ax.x, ax.y);
        let rel = 0;
        if (mag > 0.2) rel = clamp(Math.atan2(ax.x, Math.max(0.25, Math.abs(ax.y))), -1.05, 1.05);
        const u = Pl.x - cx(s);
        if (mag < 0.2 && Math.abs(u) > HALF - 0.4) rel = -Math.sign(u) * 0.25;
        pc = { yaw: ry - rel, sprint: input.held('action') || input.held('run'), hop: input.pressed('jump'), brake: ax.y < -0.5 ? 0.6 : 0 };
      }
      stepRacer(Pl, dt, pc);
      for (const rc of racers) if (rc.ai) stepRacer(rc, dt, rc.finish !== null ? { yaw: roadYaw(-rc.z + 4), sprint: false, hop: false } : driver(rc, dt));
      if (Pl.finish !== null && doneT < 0) doneT = 0;
      if (doneT >= 0 && !finished) {
        doneT += dt;
        if ((racers.every((o) => o.finish !== null) && doneT > 1.5) || doneT > 6) endRace();
      }
    };

    const update = (dt, t) => {
      tick(dt);
      for (const rc of racers) poseRacer(rc, dt, t);
      coins.forEach((c, i) => {
        if (!c.alive) {
          coinMesh.setMatrixAt(i, m4.makeScale(0, 0, 0));
          return;
        }
        m4.compose(v4.set(c.x, c.y + Math.sin(t * 3 + i) * 0.06, c.z), q4.setFromAxisAngle(tmp.set(0, 1, 0), t * 2.5 + i * 0.3), s4.set(1, 1, 1));
        coinMesh.setMatrixAt(i, m4);
      });
      coinMesh.instanceMatrix.needsUpdate = true;
      if (anim.water) anim.water.offset.x = t * 0.08;
      if (anim.sails) anim.sails.rotation.z = t * 0.6;
      if (medal.visible) {
        const w = medal.userData.who;
        w.rig.updateMatrixWorld(true);
        w.kid.root.getWorldPosition(medal.position);
        medal.position.y += 1.95 + Math.sin(t * 3) * 0.06;
        medal.rotation.y = t * 2.2;
      }
      hudT -= dt;
      if (hudT <= 0 && !finished) {
        hudT = 0.1;
        drawHud();
      }
      placeCam(dt);
    };

    // Dev hooks for headless checks (only in the dev harness)
    if (window.__dev) {
      window.__cyclerace = {
        P: Pl,
        racers,
        coins,
        get raceT() {
          return raceT;
        },
        auto: (on = true) => (auto = on),
        warp(s) {
          for (const rc of racers) {
            rc.z = -s;
            rc.x = cx(s) + rc.lane;
            rc.y = groundY(rc.x, rc.z);
            rc.yaw = roadYaw(s);
            rc.v = Math.max(rc.v, 7);
            for (const lg of LOGS) if (lg.s < s) rc.logDone.add(lg);
          }
        },
        sim(sec) {
          for (let i = 0; i < sec * 30 && !finished; i++) tick(1 / 30);
          return racers.map((o) => [o.name, +(-o.z).toFixed(1), +o.v.toFixed(2), o.finish && +o.finish.toFixed(1), o.coins]);
        },
      };
    }

    // Start: riders at the line, the partner rings the bell, count down, go
    for (const rc of racers) poseRacer(rc, 0.016, 0);
    placeCam(0.016, true);
    msg('Get ready!', 900);
    setTimeout(() => !disposed && bell(), 500);
    setTimeout(async () => {
      if (disposed) return;
      await hud.countdown(3);
      if (disposed) return;
      running = true;
    }, 900);

    return {
      update,
      dispose() {
        disposed = true;
        if (window.__cyclerace) delete window.__cyclerace;
      },
    };
  },
};
