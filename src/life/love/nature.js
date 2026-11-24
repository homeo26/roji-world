import * as THREE from 'three';
import { islandSdf } from '../../world.js';
import { PLACES } from '../../engine/manifest.js';
import { RADIUS } from '../../engine/movement.js';
import { STEP_UP } from '../../engine/physics.js';

// What grows where: the town's trees, flowers, bushes, rocks and grass tufts are instanced meshes that
// move a little whenever a place is added to the map, so the love module reads them from the scene once
// instead of guessing. Used to find clear spots for the secrets and a flower bed for Homama's rose.

const CELL = 4;

export class Nature {
  constructor(scene, physics) {
    this.physics = physics;
    this.grid = new Map(); // "cx,cz" -> [{ x, z, r, kind }]
    this.flowers = [];
    this.trees = []; // { x, z, s, rot, kind: 'round' | 'pine' }
    const m4 = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const e = new THREE.Euler();
    for (const o of scene.children) {
      if (!o.isInstancedMesh) continue;
      const g = o.geometry;
      const pr = g.parameters || {};
      let kind = null;
      if (g.type === 'IcosahedronGeometry' && pr.radius === 0.085) kind = 'flower';
      else if (g.type === 'ConeGeometry' && pr.radius === 0.05 && pr.height === 0.36) kind = 'tuft';
      else if (g.type === 'CylinderGeometry' && pr.radiusTop === 0.12 && pr.radiusBottom === 0.18) kind = 'trunk';
      else if (g.type === 'IcosahedronGeometry' && pr.radius === 1) kind = 'ball';
      else if (g.type === 'DodecahedronGeometry' && pr.radius === 0.5) kind = 'rock';
      else if (g.type === 'SphereGeometry' && pr.radius === 0.16) kind = 'pebble';
      else if (g.type === 'CylinderGeometry' && pr.radiusTop === 0.42) kind = 'stone';
      if (!kind) continue;
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m4);
        m4.decompose(p, q, s);
        if (kind === 'ball' && p.y > 1.0) continue; // tree crowns, not bushes
        const r = kind === 'flower' ? 0.12 : kind === 'tuft' ? 0.16 : kind === 'trunk' ? 0.5 * s.x : kind === 'ball' ? s.x : kind === 'rock' ? 0.5 * s.x : kind === 'stone' ? 0.5 : 0.18;
        this.put({ x: p.x, z: p.z, r, kind });
        if (kind === 'flower') this.flowers.push({ x: p.x, z: p.z });
        if (kind === 'trunk') {
          e.setFromQuaternion(q, 'YXZ');
          this.trees.push({ x: p.x, z: p.z, s: s.x, rot: e.y, kind: s.y / s.x < 0.95 ? 'pine' : 'round' });
        }
      }
    }
  }

  put(it) {
    const k = `${Math.floor(it.x / CELL)},${Math.floor(it.z / CELL)}`;
    if (!this.grid.has(k)) this.grid.set(k, []);
    this.grid.get(k).push(it);
  }

  near(x, z, r) {
    const out = [];
    const c0 = Math.floor((x - r) / CELL);
    const c1 = Math.floor((x + r) / CELL);
    const d0 = Math.floor((z - r) / CELL);
    const d1 = Math.floor((z + r) / CELL);
    for (let i = c0; i <= c1; i++) for (let j = d0; j <= d1; j++) for (const it of this.grid.get(`${i},${j}`) || []) out.push(it);
    return out;
  }

  // Is a round spot of radius r at (x, z) free of plants, rocks and walls?
  clear(x, z, r, { plants = true, colliders = true } = {}) {
    if (plants) for (const it of this.near(x, z, r + 1.2)) if (Math.hypot(it.x - x, it.z - z) < r + it.r) return false;
    if (colliders) for (const c of this.physics.colliders) if (hitsCollider(c, x, z, r + 0.15)) return false;
    return true;
  }

  // Inside a place's footprint (from the manifest), with a margin?
  inPlace(x, z, margin = 0.5) {
    return PLACES.some((p) => !p.dev && Math.abs(x - p.slot[0]) < p.size[0] / 2 + margin && Math.abs(z - p.slot[1]) < p.size[1] / 2 + margin);
  }

  // The nearest clear spot to (x, z) within `reach` metres, on the island and outside every place.
  findSpot(x, z, r, { reach = 6, edge = 1.6, plants = true, inPlaces = false } = {}) {
    for (let d = 0; d <= reach; d += 0.35) {
      const n = d === 0 ? 1 : Math.ceil((d * Math.PI * 2) / 0.5);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const px = x + Math.cos(a) * d;
        const pz = z + Math.sin(a) * d;
        if (islandSdf(px, pz) > -edge - r) continue;
        if (!inPlaces && this.inPlace(px, pz)) continue;
        if (this.clear(px, pz, r, { plants })) return { x: px, z: pz };
      }
    }
    return null;
  }

  // The nearest round tree (not a pine) to (x, z) whose trunk the town camera can see.
  treeNear(x, z, reach = 14) {
    let best = null;
    let bd = reach;
    for (const t of this.trees) {
      if (t.kind !== 'round' || this.inPlace(t.x, t.z, 1)) continue;
      const d = Math.hypot(t.x - x, t.z - z);
      if (d >= bd) continue;
      // Nothing tall right in front of the trunk (toward the camera)
      const block = this.near(t.x, t.z + 1.2, 1.4).some((it) => (it.kind === 'trunk' || it.kind === 'ball') && it.z > t.z + 0.3 && Math.abs(it.x - t.x) < 1.2 && it.z < t.z + 2.6);
      if (block) continue;
      bd = d;
      best = t;
    }
    return best;
  }

  // The nearest flower to (x, z) within reach.
  flowerNear(x, z, reach = 6) {
    let best = null;
    let bd = reach;
    for (const it of this.near(x, z, reach)) {
      if (it.kind !== 'flower') continue;
      const d = Math.hypot(it.x - x, it.z - z);
      if (d < bd) {
        bd = d;
        best = it;
      }
    }
    return best;
  }

  // Can a kid walk in a straight line from a to b without bumping into a wall?
  lineClear(ax, az, bx, bz, feet = 0) {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.ceil(len / 0.3));
    const cols = this.physics.colliders.filter((c) => (c.h === undefined || c.h > feet + STEP_UP) && nearSeg(c, ax, az, bx, bz));
    for (let i = 1; i <= n; i++) {
      const x = ax + ((bx - ax) * i) / n;
      const z = az + ((bz - az) * i) / n;
      for (const c of cols) if (hitsCollider(c, x, z, RADIUS)) return false;
    }
    return true;
  }
}

function hitsCollider(c, x, z, r) {
  if (c.type === 'circle') return Math.hypot(x - c.x, z - c.z) < c.r + r;
  return Math.abs(x - c.x) < c.hw + r && Math.abs(z - c.z) < c.hd + r;
}

function nearSeg(c, ax, az, bx, bz) {
  const ext = (c.type === 'circle' ? c.r : Math.max(c.hw, c.hd)) + 1;
  return c.x > Math.min(ax, bx) - ext && c.x < Math.max(ax, bx) + ext && c.z > Math.min(az, bz) - ext && c.z < Math.max(az, bz) + ext;
}
