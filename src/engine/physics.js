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
  }

  add(c) {
    this.colliders.push(c);
    return c;
  }

  remove(c) {
    const i = this.colliders.indexOf(c);
    if (i >= 0) this.colliders.splice(i, 1);
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
    for (const c of this.colliders) {
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
    for (const c of this.colliders) {
      if (c.h === undefined || c.h > feet + STEP_UP + 0.02 || c.h <= best) continue;
      if (c.type === 'circle') {
        if ((x - c.x) ** 2 + (z - c.z) ** 2 > (c.r + r * 0.4) ** 2) continue;
      } else if (Math.abs(x - c.x) > c.hw + r * 0.4 || Math.abs(z - c.z) > c.hd + r * 0.4) continue;
      best = c.h;
    }
    return best;
  }
}
