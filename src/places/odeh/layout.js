// Where everything sits on Odeh's hill (local metres: x right, z toward the street, y up).
// A golden sand hill rises from the street to the family home on top (3.24 m up). A stepped stone
// path winds up its front in three legs: west to the tent terrace, east past the resting bench (half
// way up) to Odeh's garden terrace, then west again to the gate steps of the courtyard. Each tread is
// a collider 0.09 m higher than the last, so kids, the partner and the family walk up for real.

export const TOP = 3.24; // the courtyard and the house floor
export const RISE = 0.09; // one tread of the path
export const TENT_Y = 1.26; // the tent terrace (west)
export const GARDEN_Y = 2.16; // Odeh's garden terrace (east)
export const HALF_Y = 1.62; // the resting bench, exactly half way up
export const STEP_Y = 3.06; // the gate step between the path and the courtyard

export const HOUSE = { x0: -6.2, x1: 6.2, z0: -12.8, z1: -6.8, h: 3.3 };
export const DOOR = { x: 0, z: HOUSE.z1 + 0.06 };
export const PLATEAU = { x0: -7.5, x1: 7.5, z0: -13.25, z1: 0.25 };
export const GATE = { x0: -1.25, x1: 1.25 };
export const TENT = { x0: -11, x1: -6, z0: 5, z1: 11 };
export const GARDEN = { x0: 6.5, x1: 10.75, z0: 0.75, z1: 7 };
export const NOOK = { x0: -1.9, x1: -0.1, z0: 4, z1: 5 }; // the bench's nook cut into the hill
export const LEG_A = { z0: 9.25, z1: 11.25, x0: -6, x1: 2.25, entry: 4.25 }; // rises west
export const LEG_B = { z0: 5, z1: 7, x0: -6, x1: 6.5 }; // rises east
export const LEG_C = { z0: 0.75, z1: 2.75, x0: -1.25, x1: 6.5 }; // rises west

// The sand domain (the hill spills a little past the footprint, where trees never grow)
export const DOMAIN = { x0: -13.0, x1: 13.0, z0: -16.0, z1: 15, round: 4.5 };

// Where the flat sandy yard at street level begins (toward the street)
export function yardZ(x) {
  if (x >= 4.5) return 10.5;
  if (x >= LEG_A.x1) return LEG_A.z1;
  if (x <= LEG_A.x0) return 12.6;
  return LEG_A.z1 + 0.35 + 1.2 * legAHeight(x);
}
function legAHeight(x) {
  const k = Math.ceil((LEG_A.x1 - x) / ((LEG_A.x1 - LEG_A.x0) / 13));
  return Math.max(0, Math.min(13, k)) * RISE;
}

// ---------------------------------------------------------------- the walkable pieces
// kind: 'pave' (a stone tread), 'apron' (paving at street level), 'sand' (a terrace), 'court' (tiles)
function buildWalk() {
  const w = [];
  const add = (x0, x1, z0, z1, h, kind, tag) => w.push({ x0, x1, z0, z1, h: +h.toFixed(3), kind, tag });
  // Leg A: 13 treads from the yard up to the tent terrace
  const nA = 13;
  const wa = (LEG_A.x1 - LEG_A.x0) / nA;
  add(LEG_A.x1, LEG_A.entry, LEG_A.z0, LEG_A.z1, 0, 'apron', 'entry');
  for (let k = 1; k <= nA; k++) add(LEG_A.x1 - wa * k, LEG_A.x1 - wa * (k - 1), LEG_A.z0, LEG_A.z1, RISE * k, 'pave', 'A');
  add(TENT.x0, TENT.x1, TENT.z0, TENT.z1, TENT_Y, 'sand', 'tent');
  // Leg B: 9 treads to the garden; the 4th is long, with the bench nook behind it
  const widths = [1, 1, 1, 2.1, 1, 1, 1, 1, 1];
  const unit = (LEG_B.x1 - LEG_B.x0 - 2.6) / 8;
  let x = LEG_B.x0;
  widths.forEach((f, i) => {
    const wd = f === 1 ? unit : 2.6;
    add(x, x + wd, LEG_B.z0, LEG_B.z1, TENT_Y + RISE * (i + 1), 'pave', 'B');
    x += wd;
  });
  add(NOOK.x0, NOOK.x1, NOOK.z0, NOOK.z1, HALF_Y, 'pave', 'nook');
  add(GARDEN.x0, GARDEN.x1, GARDEN.z0, GARDEN.z1, GARDEN_Y, 'sand', 'garden');
  // Leg C: 7 treads and the landing below the gate step
  const nC = 7;
  const wc = (LEG_C.x1 - GATE.x1) / nC;
  for (let k = 1; k <= nC; k++) add(LEG_C.x1 - wc * k, LEG_C.x1 - wc * (k - 1), LEG_C.z0, LEG_C.z1, GARDEN_Y + RISE * k, 'pave', 'C');
  add(GATE.x0, GATE.x1, LEG_C.z0, LEG_C.z1, GARDEN_Y + RISE * (nC + 1), 'pave', 'landing');
  add(GATE.x0, GATE.x1, PLATEAU.z1, LEG_C.z0, STEP_Y, 'pave', 'step');
  add(PLATEAU.x0, PLATEAU.x1, PLATEAU.z0, PLATEAU.z1, TOP, 'court', 'court');
  return w;
}
export const WALK = buildWalk();

export function walkAt(x, z, pad = 0) {
  let best = null;
  for (const r of WALK) {
    if (x < r.x0 - pad || x > r.x1 + pad || z < r.z0 - pad || z > r.z1 + pad) continue;
    if (!best || r.h > best.h) best = r;
  }
  return best;
}

// Height of the hill's walkable top at (x, z), for placing people and things on it
export function levelAt(x, z) {
  return walkAt(x, z)?.h ?? 0;
}

// The walkable pieces as colliders with a height (the slopes in between are walls, see terrain.js)
export function walkColliders() {
  return WALK.filter((r) => r.h > 0).map((r) => ({ type: 'box', x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2, hw: (r.x1 - r.x0) / 2, hd: (r.z1 - r.z0) / 2, h: r.h, tag: `odeh-${r.tag}` }));
}

// Spots used by the outdoor scenes
export const SPOT = {
  pad: { x: -1, z: 16.4 },
  sign: { x: -4.3, z: 13.9 },
  camel: { x: -8.7, z: 13.75 },
  goal: { x: 6.7, z: 11.0 },
  kick: { x: 6.7, z: 14.2 },
  tent: { x: -9.1, z: 6.5 },
  fire: { x: -9.0, z: 9.45 },
  garden: { x: 9.25, z: 5.0 },
  well: { x: 9.3, z: 1.85 },
  can: { x: 8.25, z: 2.75 },
  bench2: { x: -1.0, z: 4.35 }, // the resting bench half way up
  lemon: { x: -4.6, z: -4.2 },
  goatStake: { x: -5.6, z: -1.6 },
  olive: { x: 7.0, z: -2.6 },
  bench: { x: 4.4, z: -6.3 },
  photo: { x: 0, z: -4.3 },
};

// The way up: from the street to the door (Basem's walk); DOWN is the way back
export const UP = [
  { x: 0.2, z: 13.9 },
  { x: 3.25, z: 11.6 },
  { x: 3.0, z: 10.25 },
  { x: -6.55, z: 10.25 },
  { x: -6.55, z: 6.0 },
  { x: 6.95, z: 6.0 },
  { x: 6.95, z: 1.75 },
  { x: 0, z: 1.75 },
  { x: 0, z: -0.6 },
  { x: 0, z: -6.3 },
];
export const DOWN = [...UP].reverse();
// Odeh's walk between his garden and the fire
export const GARDEN_TO_FIRE = [{ x: 6.95, z: 6.0 }, { x: -6.55, z: 6.0 }, { x: -6.55, z: 10.35 }, { x: -10.3, z: 10.4 }];
export const FIRE_TO_GARDEN = [{ x: -10.3, z: 10.4 }, { x: -6.55, z: 10.35 }, { x: -6.55, z: 6.0 }, { x: 6.95, z: 6.0 }];
