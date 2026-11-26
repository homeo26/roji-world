import { HW, HD, GOAL, wallHit, inset } from './scene.js';

// Bumper car physics and the computer drivers.
// Cars slide a little (they are on a slippery metal floor), bounce off the padded rails and off each
// other. A bump counts when a car's front hits another car on its side or back: facing a car that
// comes at you blocks it with your front bumper, and two fronts meeting is a "clonk" for nobody.

export const CR = 0.86; // car radius
export const BR = 0.55; // beach ball radius
export const MAX = 5.2; // top speed
const GRIP = 2.5;
const BOOST = 1.75;

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function newBody(car, x, z, yaw) {
  Object.assign(car, {
    x,
    z,
    yaw,
    vx: 0,
    vz: 0,
    spin: 0,
    thr: 0,
    boost: 0,
    dizzy: 0,
    alive: true,
    lights: 3,
    score: 0,
    it: false,
    immune: 0,
    item: null,
    mass: 1,
    tiltX: 0,
    tiltZ: 0,
    tvx: 0,
    tvz: 0,
    sq: 1,
    sqv: 0,
    lastBy: null,
    lastByT: -9,
    speed: 0,
    slow: 1,
    ai: car.ai || {},
  });
  car.ai = { mode: 'roam', target: null, timer: 0, wx: 0, wz: 0, back: 0, block: 0, think: Math.random() * 0.3, revenge: null };
}

// Drive one car. ctl: { dx, dz, thr } (wanted direction in the world and throttle 0..1).
export function stepCar(c, ctl, dt, { turn = 3.4, top = MAX } = {}) {
  let thr = c.alive ? ctl.thr : 0;
  if (c.dizzy > 0) {
    c.dizzy -= dt;
    thr *= 0.25;
  }
  c.boost = Math.max(0, c.boost - dt);
  c.immune = Math.max(0, c.immune - dt);
  if (thr > 0.05 && (ctl.dx || ctl.dz)) {
    const want = Math.atan2(ctl.dx, ctl.dz);
    const d = wrap(want - c.yaw);
    const rate = turn * (c.dizzy > 0 ? 0.4 : 1);
    c.yaw += Math.max(-rate * dt, Math.min(rate * dt, d));
    // a car pointed the wrong way slows down while it turns round
    thr *= 0.55 + 0.45 * Math.max(0, Math.cos(d));
  }
  c.yaw = wrap(c.yaw + c.spin * dt);
  c.spin *= Math.exp(-3.2 * dt);
  c.thr += (thr - c.thr) * Math.min(1, dt * 6);
  const v = top * c.slow * c.thr * (c.boost > 0 ? BOOST : 1) * (c.it ? 1.14 : 1);
  const hx = Math.sin(c.yaw);
  const hz = Math.cos(c.yaw);
  const g = 1 - Math.exp(-(c.thr > 0.05 ? GRIP : 1.1) * dt);
  c.vx += (hx * v - c.vx) * g;
  c.vz += (hz * v - c.vz) * g;
  c.x += c.vx * dt;
  c.z += c.vz * dt;
  c.speed = Math.hypot(c.vx, c.vz);
  c.mass = c.boost > 0 ? 1.8 : c.alive ? 1 : 1.3;
}

// Keep a body inside the rails. Returns the speed it hit the rail with (0 if it did not).
export function wallBounce(b, r, e = 0.75) {
  const h = wallHit(b.x, b.z, r);
  if (!h) return 0;
  b.x += h.nx * h.pen;
  b.z += h.nz * h.pen;
  const vn = b.vx * h.nx + b.vz * h.nz;
  if (vn >= 0) return 0;
  b.vx -= (1 + e) * vn * h.nx;
  b.vz -= (1 + e) * vn * h.nz;
  if (b.spin !== undefined) b.spin += (b.vx * h.nz - b.vz * h.nx) * 0.35;
  return -vn;
}

// Car against car. Returns an event or null:
// { a: attacker, b: victim, kind: 'bump'|'mega'|'clonk'|'block'|'touch', power, x, z }
export function carHit(a, b, now, cool) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const d = Math.hypot(dx, dz);
  if (d >= CR * 2 || d < 1e-4) return null;
  const nx = dx / d;
  const nz = dz / d;
  const pen = CR * 2 - d;
  const wa = b.mass / (a.mass + b.mass);
  a.x -= nx * pen * wa;
  a.z -= nz * pen * wa;
  b.x += nx * pen * (1 - wa);
  b.z += nz * pen * (1 - wa);
  const closing = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
  if (closing <= 0) return null;
  // who hit whom, measured before the bounce
  const fa = Math.sin(a.yaw) * nx + Math.cos(a.yaw) * nz;
  const fb = -(Math.sin(b.yaw) * nx + Math.cos(b.yaw) * nz);
  const sa = a.vx * nx + a.vz * nz;
  const sb = -(b.vx * nx + b.vz * nz);
  const e = 0.95;
  const j = ((1 + e) * closing) / (1 / a.mass + 1 / b.mass);
  // bumper cars bounce more than real physics would: a little extra kick
  const kick = 1.18;
  a.vx -= ((nx * j) / a.mass) * kick;
  a.vz -= ((nz * j) / a.mass) * kick;
  b.vx += ((nx * j) / b.mass) * kick;
  b.vz += ((nz * j) / b.mass) * kick;
  // spins from glancing hits
  const twist = (c, sx, sz, k) => (c.spin += (Math.sin(c.yaw) * sz - Math.cos(c.yaw) * sx) * k);
  const key = a.i < b.i ? a.i * 16 + b.i : b.i * 16 + a.i;
  const last = cool.get(key) ?? -9;
  const x = (a.x + b.x) / 2;
  const z = (a.z + b.z) / 2;
  if (closing < 0.9 || now - last < 0.45) return closing > 0.4 ? { a, b, kind: 'touch', power: closing, x, z, quiet: now - last < 0.45 } : null;
  cool.set(key, now);
  const attA = fa > 0.35 && sa > 0.8;
  const attB = fb > 0.35 && sb > 0.8;
  let att = null;
  let vic = null;
  if (attA && attB && fa > 0.6 && fb > 0.6) {
    a.spin += (Math.random() - 0.5) * 3;
    b.spin += (Math.random() - 0.5) * 3;
    return { a, b, kind: 'clonk', power: closing, x, z };
  }
  if (attA && (!attB || sa >= sb)) {
    att = a;
    vic = b;
  } else if (attB) {
    att = b;
    vic = a;
  }
  if (!att) return { a, b, kind: 'touch', power: closing, x, z };
  const fv = vic === b ? fb : fa;
  const sv = vic === b ? sb : sa;
  // the victim was facing the attacker and not running away: the front bumper blocks it
  if (fv > 0.6 && sv > -0.3) {
    return { a: att, b: vic, kind: 'block', power: closing, x, z };
  }
  const n2x = vic === b ? nx : -nx;
  const n2z = vic === b ? nz : -nz;
  twist(vic, n2x, n2z, closing * 0.75);
  vic.dizzy = Math.max(vic.dizzy, 0.35 + Math.min(0.6, closing * 0.08));
  const mega = closing > 7.2 || att.boost > 0;
  return { a: att, b: vic, kind: mega ? 'mega' : 'bump', power: closing, x, z };
}

// Ball against car: the car pushes it, the ball barely slows the car.
export function ballHit(ball, c) {
  const dx = ball.x - c.x;
  const dz = ball.z - c.z;
  const d = Math.hypot(dx, dz);
  const R = CR + BR - 0.12;
  if (d >= R || d < 1e-4) return 0;
  const nx = dx / d;
  const nz = dz / d;
  ball.x += nx * (R - d) * 0.9;
  ball.z += nz * (R - d) * 0.9;
  c.x -= nx * (R - d) * 0.1;
  c.z -= nz * (R - d) * 0.1;
  const closing = (c.vx - ball.vx) * nx + (c.vz - ball.vz) * nz;
  if (closing <= 0) return 0;
  const j = closing * 1.55;
  ball.vx += nx * j;
  ball.vz += nz * j;
  c.vx -= nx * closing * 0.12;
  c.vz -= nz * closing * 0.12;
  if (closing > 2) ball.vy = Math.max(ball.vy, Math.min(4, closing * 0.55));
  return closing;
}

export function stepBall(b, dt) {
  b.vx *= Math.exp(-0.55 * dt);
  b.vz *= Math.exp(-0.55 * dt);
  b.x += b.vx * dt;
  b.z += b.vz * dt;
  b.vy -= 14 * dt;
  b.y += b.vy * dt;
  if (b.y < 0) {
    b.y = 0;
    b.vy = b.vy < -1.5 ? -b.vy * 0.45 : 0;
  }
}

// ------------------------------------------------------------------ computer drivers
// skill: { speed 0..1, turn, aim 0..1, block 0..1, aggro 0..1 }
const steer = (c, tx, tz) => {
  const dx = tx - c.x;
  const dz = tz - c.z;
  const d = Math.hypot(dx, dz) || 1;
  return { dx: dx / d, dz: dz / d, d };
};

// Bend a wanted direction away from the rails (and from switched-off tiles).
function avoidWalls(c, dir, margin = 1.1) {
  const lx = c.x + dir.dx * 2.2 + c.vx * 0.25;
  const lz = c.z + dir.dz * 2.2 + c.vz * 0.25;
  const ins = inset(lx, lz);
  if (ins < margin) {
    const w = Math.min(1, (margin - ins) / 2.2);
    const cx = -c.x * 0.6;
    const cz = -c.z;
    const cl = Math.hypot(cx, cz) || 1;
    dir.dx = dir.dx * (1 - w) + (cx / cl) * w;
    dir.dz = dir.dz * (1 - w) + (cz / cl) * w;
    const l = Math.hypot(dir.dx, dir.dz) || 1;
    dir.dx /= l;
    dir.dz /= l;
  }
  return dir;
}

// Aim a little ahead of a moving car, at its side if we can.
function chase(c, t, skill) {
  const d = Math.hypot(t.x - c.x, t.z - c.z);
  const lead = Math.min(1.2, d / (c.speed + 2)) * (0.4 + skill.aim * 0.6);
  return steer(c, t.x + t.vx * lead, t.z + t.vz * lead);
}

// Pick someone to chase. weight(car) -> 0 skips them.
export function pickTarget(c, cars, weight) {
  let best = null;
  let bs = -1;
  for (const o of cars) {
    if (o === c || !o.active || !o.alive) continue;
    const w = weight(o);
    if (w <= 0) continue;
    const d = Math.hypot(o.x - c.x, o.z - c.z);
    const s = (w * (0.6 + Math.random() * 0.8)) / (1.5 + d);
    if (s > bs) {
      bs = s;
      best = o;
    }
  }
  return best;
}

// The general bumping brain. G: { cars, time, skill, weight(c, o), tokens, darkAt }
export function brainBump(c, G, dt) {
  const A = c.ai;
  const sk = G.skill(c);
  A.timer -= dt;
  A.back -= dt;
  A.block -= dt;
  A.think -= dt;
  if (A.think <= 0) {
    A.think = 0.25 + Math.random() * 0.2;
    // a car closing in on our side? turn our front to it
    if (A.block <= 0 && Math.random() < sk.block * 0.35) {
      for (const o of G.cars) {
        if (o === c || !o.active || !o.alive || G.friend?.(c, o)) continue;
        const dx = c.x - o.x;
        const dz = c.z - o.z;
        const d = Math.hypot(dx, dz);
        const closing = (o.vx * dx + o.vz * dz) / (d || 1);
        if (d < 3.2 && closing > 2.2) {
          A.block = 0.45;
          A.threat = o;
          break;
        }
      }
    }
  }
  if (A.block > 0 && A.threat) {
    const dir = steer(c, A.threat.x, A.threat.z);
    return { dx: dir.dx, dz: dir.dz, thr: 0.35 };
  }
  // after a bump, back off for a moment, then come round again
  if (A.back > 0) {
    const dir = avoidWalls(c, { dx: A.bx, dz: A.bz }, G.margin || 1.1);
    return { dx: dir.dx, dz: dir.dz, thr: 0.8 * sk.speed };
  }
  // power-ups nearby
  if (!c.item && G.tokens) {
    for (const t of G.tokens) {
      if (!t.on) continue;
      const d = Math.hypot(t.x - c.x, t.z - c.z);
      if (d < 3.8) {
        const dir = avoidWalls(c, steer(c, t.x, t.z), G.margin || 1.1);
        return { dx: dir.dx, dz: dir.dz, thr: sk.speed };
      }
    }
  }
  if (A.revenge && A.revenge.alive && A.revenge.active && A.timer > 0) A.target = A.revenge;
  if (!A.target || A.timer <= 0 || !A.target.alive || !A.target.active) {
    A.revenge = null;
    A.target = pickTarget(c, G.cars, (o) => G.weight(c, o));
    A.timer = 2.4 + Math.random() * 2.2;
  }
  if (!A.target) {
    // nobody to chase: cruise round
    if (Math.hypot(A.wx - c.x, A.wz - c.z) < 1.5 || A.timer <= 0) {
      A.wx = (Math.random() - 0.5) * (HW * 1.4);
      A.wz = (Math.random() - 0.5) * (HD * 1.3);
      A.timer = 3;
    }
    const dir = avoidWalls(c, steer(c, A.wx, A.wz), G.margin || 1.1);
    return { dx: dir.dx, dz: dir.dz, thr: 0.6 * sk.speed };
  }
  const dir = avoidWalls(c, chase(c, A.target, sk), (G.margin || 1.1) * 0.6);
  return { dx: dir.dx, dz: dir.dz, thr: sk.speed };
}

// After a bump the attacker backs away from the victim.
export function backOff(c, from, time = 0.7) {
  const dx = c.x - from.x;
  const dz = c.z - from.z;
  const d = Math.hypot(dx, dz) || 1;
  const side = Math.random() < 0.5 ? 1 : -1;
  c.ai.bx = dx / d + (-dz / d) * side * 0.8;
  c.ai.bz = dz / d + (dx / d) * side * 0.8;
  const l = Math.hypot(c.ai.bx, c.ai.bz) || 1;
  c.ai.bx /= l;
  c.ai.bz /= l;
  c.ai.back = time;
  c.ai.timer = 0;
}

// Tag: the "it" car chases, everybody else runs and circles away.
export function brainTag(c, G, dt) {
  const sk = G.skill(c);
  const it = G.cars.find((o) => o.it && o.active);
  if (c.it) {
    const A = c.ai;
    A.timer -= dt;
    if (!A.target || A.timer <= 0 || A.target.it || A.target.immune > 0) {
      A.target = pickTarget(c, G.cars, (o) => (o.immune > 0 ? 0 : G.weight(c, o)));
      A.timer = 2 + Math.random() * 2;
    }
    if (!A.target) return { dx: 0, dz: 0, thr: 0 };
    const dir = avoidWalls(c, chase(c, A.target, sk), 0.5);
    return { dx: dir.dx, dz: dir.dz, thr: sk.speed };
  }
  if (!it) return { dx: 0, dz: 0, thr: 0 };
  const dx = c.x - it.x;
  const dz = c.z - it.z;
  const d = Math.hypot(dx, dz) || 1;
  if (d > 6.5) {
    const A = c.ai;
    A.timer -= dt;
    if (Math.hypot(A.wx - c.x, A.wz - c.z) < 1.5 || A.timer <= 0) {
      A.wx = (Math.random() - 0.5) * HW * 1.3;
      A.wz = (Math.random() - 0.5) * HD * 1.2;
      A.timer = 2.5;
    }
    const dir = avoidWalls(c, steer(c, A.wx, A.wz), 1.4);
    return { dx: dir.dx, dz: dir.dz, thr: 0.55 * sk.speed };
  }
  // run away, and slide round the side instead of into a corner
  const side = c.ai.side || (c.ai.side = Math.random() < 0.5 ? 1 : -1);
  let fx = dx / d + (-dz / d) * side * 0.9;
  let fz = dz / d + (dx / d) * side * 0.9;
  const l = Math.hypot(fx, fz) || 1;
  fx /= l;
  fz /= l;
  if (inset(c.x + fx * 2, c.z + fz * 2) < 1.2) c.ai.side = -side;
  const dir = avoidWalls(c, { dx: fx, dz: fz }, 1.6);
  return { dx: dir.dx, dz: dir.dz, thr: sk.speed * (d < 3 ? 0.95 : 0.78) };
}

// Beach balls: get behind a ball and push it into the nearer goal.
export function brainBall(c, G, dt) {
  const sk = G.skill(c);
  const A = c.ai;
  A.timer -= dt;
  if (!A.ball || A.timer <= 0 || !A.ball.on) {
    let best = null;
    let bs = 1e9;
    for (const b of G.balls) {
      if (!b.on) continue;
      const s = Math.hypot(b.x - c.x, b.z - c.z) + Math.random() * 3 - (b.gold ? 4 : 0);
      if (s < bs) {
        bs = s;
        best = b;
      }
    }
    A.ball = best;
    A.timer = 2 + Math.random() * 1.5;
  }
  const b = A.ball;
  if (!b) return brainBump(c, G, dt);
  const gx = (b.x >= 0 ? 1 : -1) * (HW + 0.5);
  const gz = 0;
  let ux = gx - b.x;
  let uz = gz - b.z;
  const ul = Math.hypot(ux, uz) || 1;
  ux /= ul;
  uz /= ul;
  const tx = b.x - c.x;
  const tz = b.z - c.z;
  const td = Math.hypot(tx, tz) || 1;
  const lined = (tx * ux + tz * uz) / td;
  let dir;
  if (lined > 0.55 && td < 4.5) {
    dir = steer(c, b.x + ux * 0.6, b.z + uz * 0.6);
  } else {
    // go round to the far side of the ball
    const bx = b.x - ux * 1.7;
    const bz = b.z - uz * 1.7;
    const px = -uz;
    const pz = ux;
    const s = tx * px + tz * pz > 0 ? -1 : 1;
    const crossing = Math.abs(tx * px + tz * pz) < 1.4 && lined < 0;
    dir = crossing ? steer(c, b.x + px * s * 1.9 - ux * 0.4, b.z + pz * s * 1.9 - uz * 0.4) : steer(c, bx, bz);
  }
  dir = avoidWalls(c, dir, 0.4);
  return { dx: dir.dx, dz: dir.dz, thr: sk.speed * (td < 2 ? 0.85 : 1) };
}

export { wrap, steer, avoidWalls, GOAL };
