// Collisions on the ground plane, with optional heights so kids can jump onto things.
//
// Collider: { type: 'box', x, z, hw, hd, h? } or { type: 'circle', x, z, r, h? }, in world metres.
// h is the height of the top. Without h the collider is a wall nobody can stand on.
// With h (up to about 2.4) a kid whose feet are above it walks over it and can stand on top.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const STEP_UP = 0.28; // ledges lower than this are stepped onto without jumping

export class Physics {
  constructor(colliders = []) {
    this.colliders = colliders;
    this.bounds = null; // optional (p, r, v, bounce) => void, keeps things on the island
    this.gridOn = false;
  }

  add(c) {
    this.colliders.push(c);
    this.dirty = true;
    return c;
  }

  remove(c) {
    const i = this.colliders.indexOf(c);
    if (i >= 0) this.colliders.splice(i, 1);
    this.dirty = true;
  }

  // Optional spatial grid, for a world with thousands of colliders: each query only looks at the colliders
  // near the point, in their usual order, so the results are the same as scanning them all. Call tick(dt)
  // once a frame: the grid is rebuilt every 0.1 s (and whenever colliders are added or removed), which picks
  // up colliders that move (a kart, the pony). Anything moving under 15 m/s stays within the 2 m margin
  // the queries use in between.
  useGrid(cell = 8) {
    this.gridOn = true;
    this.cell = cell;
    this.grid = new Map();
    this.big = [];
    this.seen = new Uint32Array(0);
    this.query = 0;
    this.out = [];
    this.dirty = true;
    return this;
  }

  tick(dt = 1 / 60) {
    this.age = (this.age || 0) + dt;
    if (this.age >= 0.1) this.dirty = true;
  }

  buildGrid() {
    const cell = this.cell;
    const grid = this.grid;
    grid.clear();
    this.big.length = 0;
    const list = this.colliders;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      const ex = c.type === 'circle' ? c.r : c.hw;
      const ez = c.type === 'circle' ? c.r : c.hd;
      const x0 = Math.floor((c.x - ex) / cell);
      const x1 = Math.floor((c.x + ex) / cell);
      const z0 = Math.floor((c.z - ez) / cell);
      const z1 = Math.floor((c.z + ez) / cell);
      if (!Number.isFinite(x0 + x1 + z0 + z1) || (x1 - x0 + 1) * (z1 - z0 + 1) > 64) {
        this.big.push(i);
        continue;
      }
      for (let x = x0; x <= x1; x++)
        for (let z = z0; z <= z1; z++) {
          const k = x * 65536 + z;
          let a = grid.get(k);
          if (!a) grid.set(k, (a = []));
          a.push(i);
        }
    }
    if (this.seen.length < list.length) this.seen = new Uint32Array(list.length * 2 + 64);
    this.builtLen = list.length;
    this.dirty = false;
    this.age = 0;
  }

  // The colliders that can touch a circle of radius rad around (x, z), in list order
  near(x, z, rad) {
    if (!this.gridOn) return this.colliders;
    if (this.dirty || this.builtLen !== this.colliders.length) this.buildGrid();
    const cell = this.cell;
    const q = ++this.query;
    const seen = this.seen;
    const idx = this.out;
    idx.length = 0;
    for (const i of this.big) {
      seen[i] = q;
      idx.push(i);
    }
    const x0 = Math.floor((x - rad) / cell);
    const x1 = Math.floor((x + rad) / cell);
    const z0 = Math.floor((z - rad) / cell);
    const z1 = Math.floor((z + rad) / cell);
    for (let gx = x0; gx <= x1; gx++)
      for (let gz = z0; gz <= z1; gz++) {
        const a = this.grid.get(gx * 65536 + gz);
        if (!a) continue;
        for (const i of a)
          if (seen[i] !== q) {
            seen[i] = q;
            idx.push(i);
          }
      }
    idx.sort((a, b) => a - b);
    const list = this.colliders;
    return idx.map((i) => list[i]);
  }

  // Push point p (Vector3, uses x/z) out of every collider it overlaps. v is its velocity, also corrected.
  // feet: height of the feet. skip: (collider) => true to ignore one (for example the car you are in).
  resolve(p, r, v, { bounce = 0, feet = 0, skip = null, bounds = true } = {}) {
    // A second pass settles inside corners, where leaving one collider pushes into the next (no jitter)
    if (this.pass(p, r, v, bounce, feet, skip)) this.pass(p, r, v, bounce, feet, skip);
    if (bounds && this.bounds) this.bounds(p, r, v, bounce);
  }

  pass(p, r, v, bounce, feet, skip) {
    let pushed = false;
    // Pushes move the point a little within a pass; the 2 m margin keeps the colliders it may reach in the list
    for (const c of this.near(p.x, p.z, r + 2)) {
      if (skip && skip(c)) continue;
      if (c.h !== undefined && c.h <= feet + STEP_UP) continue;
      let dx;
      let dz;
      if (c.type === 'circle') {
        dx = p.x - c.x;
        dz = p.z - c.z;
        const min = c.r + r;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2);
        // Exactly on the centre: push out along +x instead of not at all
        if (d < 1e-6) {
          dx = 1;
          dz = 0;
        } else {
          dx /= d;
          dz /= d;
        }
        p.x += dx * (min - d);
        p.z += dz * (min - d);
      } else {
        const qx = clamp(p.x, c.x - c.hw, c.x + c.hw);
        const qz = clamp(p.z, c.z - c.hd, c.z + c.hd);
        dx = p.x - qx;
        dz = p.z - qz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          dx /= d;
          dz /= d;
          p.x += dx * (r - d);
          p.z += dz * (r - d);
        } else {
          const px = c.hw - Math.abs(p.x - c.x) + r;
          const pz = c.hd - Math.abs(p.z - c.z) + r;
          if (px < pz) {
            dx = Math.sign(p.x - c.x) || 1;
            dz = 0;
            p.x += dx * px;
          } else {
            dx = 0;
            dz = Math.sign(p.z - c.z) || 1;
            p.z += dz * pz;
          }
        }
      }
      pushed = true;
      const into = v.x * dx + v.z * dz;
      if (into < 0) {
        v.x -= dx * into * (1 + bounce);
        v.z -= dz * into * (1 + bounce);
      }
    }
    return pushed;
  }

  // Height of the highest top under (x, z) that a kid with its feet at `feet` can stand on.
  // base: height when nothing is underneath (0 = the ground; a pool floor over water).
  support(x, z, r = 0.2, feet = 0, base = 0) {
    let best = base;
    for (const c of this.near(x, z, r + 0.5)) {
      if (c.h === undefined || c.h > feet + STEP_UP + 0.02 || c.h <= best) continue;
      if (c.type === 'circle') {
        if ((x - c.x) ** 2 + (z - c.z) ** 2 > (c.r + r * 0.4) ** 2) continue;
      } else if (Math.abs(x - c.x) > c.hw + r * 0.4 || Math.abs(z - c.z) > c.hd + r * 0.4) continue;
      best = c.h;
    }
    return best;
  }
}
