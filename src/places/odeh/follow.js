// The partner finds the way up and down the winding path: the hill is a chain of pieces (the yard,
// the three legs of the path, the two terraces, the bench nook, the courtyard), joined at known
// spots. When Roji and Homama are on different pieces, the partner walks there through the joins
// with the game's own movement (steps, gravity and walls), then the normal follow takes over again.
import { stepWalker, stepVertical, faceTo } from '../../engine/movement.js';
import { walkAt, levelAt } from './layout.js';

const PIECE = { A: 'A', B: 'B', C: 'C', entry: 'entry', tent: 'tent', nook: 'nook', garden: 'garden', landing: 'landing', step: 'landing', court: 'court' };
// Joins between pieces: a point on each side
const JOINS = [
  ['yard', 'entry', { x: 3.25, z: 11.85 }, { x: 3.25, z: 10.7 }],
  ['entry', 'A', { x: 2.7, z: 10.25 }, { x: 1.8, z: 10.25 }],
  ['A', 'tent', { x: -5.5, z: 10.25 }, { x: -6.55, z: 10.25 }],
  ['tent', 'B', { x: -6.55, z: 6.0 }, { x: -5.5, z: 6.0 }],
  ['B', 'nook', { x: -1.0, z: 5.6 }, { x: -1.0, z: 4.75 }],
  ['B', 'garden', { x: 6.0, z: 6.0 }, { x: 6.95, z: 6.0 }],
  ['garden', 'C', { x: 6.95, z: 1.75 }, { x: 6.0, z: 1.75 }],
  ['C', 'landing', { x: 1.7, z: 1.75 }, { x: 0.6, z: 1.75 }],
  ['landing', 'court', { x: 0, z: 1.1 }, { x: 0, z: -0.45 }],
];

export function pieceAt(x, z) {
  const w = walkAt(x, z);
  if (w) return PIECE[w.tag] || null;
  return levelAt(x, z) === 0 ? 'yard' : null;
}

function route(from, to) {
  if (from === to) return [];
  const prev = { [from]: null };
  const q = [from];
  while (q.length) {
    const r = q.shift();
    if (r === to) break;
    for (const j of JOINS) {
      const n = j[0] === r ? j[1] : j[1] === r ? j[0] : null;
      if (n && !(n in prev)) {
        prev[n] = { r, j };
        q.push(n);
      }
    }
  }
  if (!(to in prev)) return null;
  const pts = [];
  for (let r = to; prev[r]; r = prev[r].r) {
    const { r: from_, j } = prev[r];
    const fwd = j[0] === from_;
    pts.unshift(fwd ? j[2] : j[3], fwd ? j[3] : j[2]);
  }
  return pts;
}

export function pathGuide(api, size) {
  const g = { on: false, path: [], t: 0, stuck: 0, to: null };
  const stop = () => {
    g.on = false;
    g.t = 0;
    g.path = [];
    if (api.game?.partnerBusy === 'odeh-path') api.game.partnerBusy = null;
  };
  const local = (a) => ({ x: a.pos.x - api.space.origin.x, z: a.pos.z - api.space.origin.z });
  const onHill = (q) => Math.abs(q.x) < size.w / 2 + 1.5 && q.z > -size.d / 2 - 1.5 && q.z < size.d / 2 + 2.5;
  function update(dt) {
    const G = api.game;
    if (!G?.physics) return;
    const c = api.partner;
    const p = api.player;
    const busyOther = G.partnerBusy && G.partnerBusy !== 'odeh-path';
    if (api.activityRunning || c.seated || busyOther || api.inside) {
      if (g.on) stop();
      return;
    }
    const cp = local(c);
    const pp = local(p);
    if (!onHill(cp) || !onHill(pp)) {
      if (g.on) stop();
      return;
    }
    const rc = pieceAt(cp.x, cp.z);
    const rp = pieceAt(pp.x, pp.z);
    const d = Math.hypot(cp.x - pp.x, cp.z - pp.z);
    // Behind on the same stretch of steps: keep walking up to them (the game would hop instead)
    const behind = () => ({ x: pp.x - Math.sin(p.yaw) * 0.9, z: pp.z - Math.cos(p.yaw) * 0.9 });
    const same = rc && rc === rp && d > 2.2 && Math.abs(c.y - p.y) > 0.2;
    if (!g.on) {
      if (!rc || !rp || (rc === rp && !same) || (d < 1.7 && Math.abs(c.y - p.y) < 0.3)) {
        g.t = 0;
        return;
      }
      g.t += dt;
      if (g.t < 0.25) return;
      const path = rc === rp ? [behind()] : route(rc, rp);
      if (!path) return;
      g.on = true;
      g.path = path;
      g.to = rp;
      g.stuck = 0;
      G.partnerBusy = 'odeh-path';
      c.kid.holdSide = 0;
      p.kid.holdSide = 0;
    }
    // The player moved on to another piece: plan again from here
    if (rp && rp !== g.to && rc) {
      g.path = rc === rp ? [behind()] : route(rc, rp) || [];
      g.to = rp;
    }
    // On the player's piece: follow them until close
    if (rc === rp) {
      if (d < 1.4 && Math.abs(c.y - p.y) < 0.15) return stop();
      g.path = [behind()];
    }
    if (!g.path.length) {
      stop();
      return;
    }
    const w = g.path[0];
    const dx = w.x - cp.x;
    const dz = w.z - cp.z;
    const dw = Math.hypot(dx, dz);
    if (dw < 0.3) {
      g.path.shift();
      if (!g.path.length && rc !== rp) g.path = [behind()];
      if (!g.path.length) stop();
      return;
    }
    const bx = c.pos.x;
    const bz = c.pos.z;
    stepWalker(c, G.physics, dx, dz, 1, d > 4 ? 6.4 : 4.8, 12, dt);
    stepVertical(c, G.physics, dt, null);
    if (c.speed > 0.25) faceTo(c, dt, Math.atan2(c.vel.x, c.vel.z));
    g.stuck = Math.hypot(c.pos.x - bx, c.pos.z - bz) < 0.4 * dt ? g.stuck + dt : 0;
    if (g.stuck > 1.4) {
      // Caught on something: hop to the next join with a puff
      api.fx?.poof?.(c.pos);
      c.pos.set(api.space.origin.x + w.x, 0, api.space.origin.z + w.z);
      c.y = levelAt(w.x, w.z);
      c.vy = 0;
      g.path.shift();
      g.stuck = 0;
    }
  }
  return { update, stop, debug: g };
}
