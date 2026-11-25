// The hill's sand: a smooth surface through every walkable piece (the treads, the two terraces and the
// courtyard) that falls softly to the street and the sides in between, with dunes on the flanks.
// It is solved once on a 0.25 m grid (a relaxed membrane, coarse to fine). The same grid gives the
// walls that keep kids off the slopes, and heightAt() for standing things on the sand.
import * as THREE from 'three';
import { WALK, DOMAIN, yardZ, walkAt, HOUSE } from './layout.js';

const G = 0.25;
const X0 = -14;
const Z0 = -17.25;
const NX = 113; // x -14 .. 14
const NZ = 137; // z -17.25 .. 16.75
const idx = (i, j) => j * NX + i;

const smooth = (a, b, v) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function inDomain(x, z, grow = 0) {
  const D = DOMAIN;
  const cx = (D.x0 + D.x1) / 2;
  const cz = (D.z0 + D.z1) / 2;
  const r = D.round;
  const qx = Math.abs(x - cx) - ((D.x1 - D.x0) / 2 - r + grow);
  const qz = Math.abs(z - cz) - ((D.z1 - D.z0) / 2 - r + grow);
  let out = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r;
  // A wavy, natural outline (the street side stays straight)
  const a = Math.atan2(z - cz, x - cx);
  if (z < 11) out += 0.55 + 0.4 * Math.sin(a * 3 + 1.1) + 0.25 * Math.sin(a * 7 + 0.4);
  return out <= 0;
}

// The value a grid node is held at, or NaN where the sand is free
function constraint(x, z) {
  let v = NaN;
  for (const r of WALK) {
    if (x < r.x0 - 1e-6 || x > r.x1 + 1e-6 || z < r.z0 - 1e-6 || z > r.z1 + 1e-6) continue;
    // Under stone treads the sand stays a little lower, so it never shows through them
    const h = r.kind === 'pave' || r.kind === 'apron' ? r.h - 0.06 : r.h;
    v = Number.isNaN(v) ? h : Math.min(v, h);
  }
  if (!Number.isNaN(v)) return v;
  if (!inDomain(x, z) || z >= yardZ(x)) return -0.05;
  return NaN;
}

// Big soft dunes on the flanks and the back, and a few small ones (x, z, height, radius)
const DUNES = [
  [-11.0, -7.5, 1.1, 2.6],
  [-11.4, -1.0, 0.7, 2.0],
  [-11.8, 3.6, 0.45, 1.6],
  [11.0, -8.5, 1.2, 2.6],
  [11.4, -2.6, 0.8, 2.0],
  [11.9, 4.0, 0.5, 1.7],
  [-6.0, -15.0, 0.9, 2.4],
  [0.5, -15.2, 0.8, 2.2],
  [6.5, -15.0, 0.95, 2.4],
  [-9.8, -13.6, 0.9, 1.8],
  [9.9, -13.4, 0.9, 1.8],
  [-3.6, 2.6, 0.22, 1.4],
  [3.6, 8.1, 0.18, 1.1],
  [-2.2, 8.0, 0.16, 1.0],
];

function dunes(x, z) {
  let d = 0;
  for (const [dx, dz, h, r] of DUNES) d += h * Math.exp(-((x - dx) ** 2 + (z - dz) ** 2) / (r * r));
  // Wind ripples and a slow swell
  d += 0.09 * Math.sin(x * 0.9 + z * 0.35 + 1.3) * Math.sin(z * 0.6 - x * 0.25);
  return d;
}

// Relax the free nodes of a grid (SOR) toward the average of their four neighbours
function relax(h, fixed, nx, nz, iters) {
  const w = 1.85;
  for (let it = 0; it < iters; it++) {
    for (let j = 1; j < nz - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const k = j * nx + i;
        if (fixed[k]) continue;
        const v = (h[k - 1] + h[k + 1] + h[k - nx] + h[k + nx]) * 0.25;
        h[k] += w * (v - h[k]);
      }
    }
  }
}

let cache = null;

export function terrain() {
  if (cache) return cache;
  const N = NX * NZ;
  const hF = new Float32Array(N);
  const fixF = new Uint8Array(N);
  const feat = new Uint8Array(N); // held by a walkable piece (not the street or the edge)
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const x = X0 + i * G;
      const z = Z0 + j * G;
      const edge = i === 0 || j === 0 || i === NX - 1 || j === NZ - 1;
      const c = edge ? -0.05 : constraint(x, z);
      const k = idx(i, j);
      if (!Number.isNaN(c)) {
        hF[k] = c;
        fixF[k] = 1;
        if (c > -0.05 || walkAt(x, z)) feat[k] = 1;
      }
    }
  }
  // Coarse to fine: 2 m, 1 m, 0.5 m, 0.25 m
  const levels = [];
  for (let s = 8; s >= 1; s /= 2) {
    const nx = (NX - 1) / s + 1;
    const nz = (NZ - 1) / s + 1;
    const h = new Float32Array(nx * nz);
    const fx = new Uint8Array(nx * nz);
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const k = idx(i * s, j * s);
        if (fixF[k]) {
          h[j * nx + i] = hF[k];
          fx[j * nx + i] = 1;
        }
      }
    }
    levels.push({ s, nx, nz, h, fx });
  }
  let prev = null;
  const iters = [900, 320, 140, 70];
  levels.forEach((L, li) => {
    if (prev) {
      // Start the free nodes from the coarser answer (bilinear)
      for (let j = 0; j < L.nz; j++) {
        for (let i = 0; i < L.nx; i++) {
          const k = j * L.nx + i;
          if (L.fx[k]) continue;
          const u = i / 2;
          const v = j / 2;
          const i0 = Math.floor(u);
          const j0 = Math.floor(v);
          const i1 = Math.min(prev.nx - 1, i0 + 1);
          const j1 = Math.min(prev.nz - 1, j0 + 1);
          const fu = u - i0;
          const fv = v - j0;
          const p = prev.h;
          const a = p[j0 * prev.nx + i0] * (1 - fu) + p[j0 * prev.nx + i1] * fu;
          const b = p[j1 * prev.nx + i0] * (1 - fu) + p[j1 * prev.nx + i1] * fu;
          L.h[k] = a * (1 - fv) + b * fv;
        }
      }
    } else {
      for (let k = 0; k < L.h.length; k++) if (!L.fx[k]) L.h[k] = 1.5;
    }
    relax(L.h, L.fx, L.nx, L.nz, iters[li]);
    prev = L;
  });
  const H = prev.h;
  // Distance (m) from every held node, so the dunes fade in away from the path and the street
  const dist = new Float32Array(N).fill(1e9);
  for (let k = 0; k < N; k++) if (fixF[k]) dist[k] = 0;
  const D1 = G;
  const D2 = G * Math.SQRT2;
  for (let pass = 0; pass < 2; pass++) {
    const fwd = pass === 0;
    for (let jj = 0; jj < NZ; jj++) {
      const j = fwd ? jj : NZ - 1 - jj;
      for (let ii = 0; ii < NX; ii++) {
        const i = fwd ? ii : NX - 1 - ii;
        const k = idx(i, j);
        let d = dist[k];
        const s = fwd ? -1 : 1;
        if (i + s >= 0 && i + s < NX) d = Math.min(d, dist[idx(i + s, j)] + D1);
        if (j + s >= 0 && j + s < NZ) {
          d = Math.min(d, dist[idx(i, j + s)] + D1);
          if (i - 1 >= 0) d = Math.min(d, dist[idx(i - 1, j + s)] + D2);
          if (i + 1 < NX) d = Math.min(d, dist[idx(i + 1, j + s)] + D2);
        }
        dist[k] = d;
      }
    }
  }
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const k = idx(i, j);
      if (fixF[k]) continue;
      const x = X0 + i * G;
      const z = Z0 + j * G;
      const w = smooth(0.15, 1.7, dist[k]);
      let v = H[k];
      // A soft, concave foot where the hill meets the street
      v *= 1 - w * 0.38 * (1 - smooth(0, 1.4, v));
      v += dunes(x, z) * w;
      H[k] = Math.max(-0.05, v);
    }
  }
  const heightAt = (x, z) => {
    const u = Math.max(0, Math.min(NX - 1.001, (x - X0) / G));
    const v = Math.max(0, Math.min(NZ - 1.001, (z - Z0) / G));
    const i = Math.floor(u);
    const j = Math.floor(v);
    const fu = u - i;
    const fv = v - j;
    const a = H[idx(i, j)] * (1 - fu) + H[idx(i + 1, j)] * fu;
    const b = H[idx(i, j + 1)] * (1 - fu) + H[idx(i + 1, j + 1)] * fu;
    return a * (1 - fv) + b * fv;
  };
  cache = { H, fixF, feat, dist, heightAt, NX, NZ, X0, Z0, G };
  return cache;
}

export const heightAt = (x, z) => terrain().heightAt(x, z);

// ---------------------------------------------------------------- walls
// Every sand cell above ankle height that is not walkable becomes part of a wall (merged into boxes)
export function slopeWalls() {
  const T = terrain();
  const CX = NX - 1;
  const CZ = NZ - 1;
  const wall = new Uint8Array(CX * CZ);
  for (let j = 0; j < CZ; j++) {
    for (let i = 0; i < CX; i++) {
      const x = X0 + (i + 0.5) * G;
      const z = Z0 + (j + 0.5) * G;
      if (walkAt(x, z)) continue;
      if (!inDomain(x, z, 0.15)) continue;
      const avg = (T.H[idx(i, j)] + T.H[idx(i + 1, j)] + T.H[idx(i, j + 1)] + T.H[idx(i + 1, j + 1)]) / 4;
      if (avg > 0.08) wall[j * CX + i] = 1;
    }
  }
  const out = [];
  for (let j = 0; j < CZ; j++) {
    for (let i = 0; i < CX; i++) {
      if (!wall[j * CX + i]) continue;
      let i1 = i;
      while (i1 + 1 < CX && wall[j * CX + i1 + 1]) i1++;
      let j1 = j;
      for (;;) {
        if (j1 + 1 >= CZ) break;
        let full = true;
        for (let q = i; q <= i1; q++) if (!wall[(j1 + 1) * CX + q]) full = false;
        if (!full) break;
        j1++;
      }
      for (let jj = j; jj <= j1; jj++) for (let q = i; q <= i1; q++) wall[jj * CX + q] = 0;
      const x0 = X0 + i * G;
      const x1 = X0 + (i1 + 1) * G;
      const z0 = Z0 + j * G;
      const z1 = Z0 + (j1 + 1) * G;
      out.push({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: (x1 - x0) / 2, hd: (z1 - z0) / 2, tag: 'odeh-slope' });
    }
  }
  return out;
}

// ---------------------------------------------------------------- the sand mesh
const COL = {
  low: new THREE.Color('#e09f57'), // deep gold at the foot
  high: new THREE.Color('#fbe6bb'), // pale where the sun bakes the top
  steep: new THREE.Color('#cf8a4a'),
  toe: new THREE.Color('#e9bd80'),
  ripple: new THREE.Color('#fdebc6'),
  tent: new THREE.Color('#efcf98'),
  garden: new THREE.Color('#d9a86e'),
};
const SUN = new THREE.Vector3(-11, 22, 12).normalize();

export function sandMesh() {
  const T = terrain();
  const { H } = T;
  const pos = new Float32Array(NX * NZ * 3);
  const nor = new Float32Array(NX * NZ * 3);
  const col = new Float32Array(NX * NZ * 3);
  const uv = new Float32Array(NX * NZ * 2);
  const c = new THREE.Color();
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const k = idx(i, j);
      const x = X0 + i * G;
      const z = Z0 + j * G;
      const y = H[k];
      pos.set([x, y, z], k * 3);
      uv.set([x / 4, z / 4], k * 2);
      const hl = H[idx(Math.max(0, i - 1), j)];
      const hr = H[idx(Math.min(NX - 1, i + 1), j)];
      const hd = H[idx(i, Math.max(0, j - 1))];
      const hu = H[idx(i, Math.min(NZ - 1, j + 1))];
      const gx = (hr - hl) / (2 * G);
      const gz = (hu - hd) / (2 * G);
      const n = new THREE.Vector3(-gx, 1, -gz).normalize();
      nor.set([n.x, n.y, n.z], k * 3);
      const slope = Math.hypot(gx, gz);
      // Height ramp, deeper gold on the steep parts, and a little baked sun on the slopes
      c.copy(COL.low).lerp(COL.high, Math.min(1, Math.max(0, y / 3.3)) ** 0.8);
      c.lerp(COL.steep, smooth(0.5, 1.7, slope) * 0.55);
      c.multiplyScalar(0.72 + 0.36 * Math.max(0, n.dot(SUN)));
      const r = walkAt(x, z);
      if (r?.tag === 'tent') c.lerp(COL.tent, 0.7);
      if (r?.tag === 'garden') c.lerp(COL.garden, 0.55);
      if (!r && T.dist[k] > 0.6 && Math.sin(x * 2.4 + z * 1.15 + Math.sin(z * 0.7) * 1.6) > 0.82) c.lerp(COL.ripple, 0.35);
      // Concave spots catch a little shade
      const lap = (hl + hr + hd + hu - 4 * y) / (G * G);
      c.multiplyScalar(1 - Math.max(0, Math.min(0.14, lap * 0.02)));
      if (y < 0.3) c.lerp(COL.toe, smooth(0.3, 0, y));
      col.set([c.r, c.g, c.b], k * 3);
    }
  }
  // Triangles: skip the flat street (at or under the ground), under the treads and under the house
  const hidden = (x, z) => {
    if (x > HOUSE.x0 + 0.3 && x < HOUSE.x1 - 0.3 && z > HOUSE.z0 + 0.3 && z < HOUSE.z1 - 0.3) return true;
    const r = walkAt(x, z);
    return !!r && (r.kind === 'pave' || r.kind === 'court') && x > r.x0 + 0.01 && x < r.x1 - 0.01 && z > r.z0 + 0.01 && z < r.z1 - 0.01;
  };
  const index = [];
  for (let j = 0; j < NZ - 1; j++) {
    for (let i = 0; i < NX - 1; i++) {
      const a = idx(i, j);
      const b = idx(i + 1, j);
      const d = idx(i, j + 1);
      const e = idx(i + 1, j + 1);
      if (H[a] <= 0.001 && H[b] <= 0.001 && H[d] <= 0.001 && H[e] <= 0.001) continue;
      const cx = X0 + (i + 0.5) * G;
      const cz = Z0 + (j + 0.5) * G;
      if (hidden(cx, cz)) continue;
      // Split along the shorter diagonal
      if (Math.abs(H[a] - H[e]) < Math.abs(H[b] - H[d])) index.push(a, d, e, a, e, b);
      else index.push(a, d, b, b, d, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(index);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
