// Where everything sits on Odeh's hill (local metres: x right, z toward the street, y up).
// The hill rises in three levels: the sandy front yard at the street (y 0), the garden terrace
// (y 0.88) and the house plateau with its courtyard (y 1.98). Stone steps of 0.22 m join them.

export const STEP = 0.22;
export const L1 = 0.88; // garden terrace
export const L2 = 1.98; // house plateau
export const STEPS_A = 3; // steps cut into the terrace front (the 4th rise is the terrace itself)
export const STEPS_B = 4;

export const STAIR = { hw: 1.3 }; // the steps are 2.6 m wide, centred on x = 0
// Front yard z 6.4..15 | steps A z 4.6..6.4 | terrace z -1.0..4.6 | steps B z -3.4..-1.0 | plateau z -13.9..-3.4
export const Z = { yardFront: 15, t1Front: 6.4, t1Top: 4.6, t2Front: -1.0, t2Top: -3.4, back: -13.9 };
export const T1 = { x0: -10.2, x1: 10.2 };
export const T2 = { x0: -9.4, x1: 9.4 };

// The house on the plateau and its courtyard
export const HOUSE = { x0: -6.8, x1: 6.8, z0: -13.7, z1: -7.5, h: 3.3 };
export const DOOR = { x: 0, z: HOUSE.z1 + 0.06 };
export const LANDING = { x: 0, z: -6.2, hw: 1.3, hd: 1.35 }; // where Roji and Homama come out of the door

// Spots used by the outdoor scenes
export const SPOT = {
  pad: { x: -1, z: 16.4 },
  tent: { x: -8.1, z: 9.7 },
  fire: { x: -7.6, z: 12.9 },
  garden: { x: -6.2, z: 2.2 },
  well: { x: 5.6, z: 2.3 },
  olive: { x: 8.7, z: 0.4 },
  goatStake: { x: 6.8, z: 4.2 },
  camel: { x: 9.6, z: 12.4 },
  goal: { x: 6.4, z: 7.25 },
  kick: { x: 6.4, z: 11.2 },
  lemon: { x: -5.4, z: -4.8 },
  bench: { x: 4.6, z: -7.0 },
  photo: { x: 0, z: -5.0 },
  sign: { x: 3.2, z: 14.2 },
};

// The way up: from the street to the door (Basem's walk, Odeh's walk to the tent)
export const UP = [
  { x: -0.6, z: 14 },
  { x: 0, z: 7.4 },
  { x: 0, z: 4.4 },
  { x: 0, z: -0.4 },
  { x: 0, z: -4.0 },
  { x: 0, z: -6.9 },
];
export const DOWN = [...UP].reverse();

// Height of the hill's walkable top at (x, z), for placing things on it
export function levelAt(x, z) {
  if (z <= Z.t2Top && x >= T2.x0 && x <= T2.x1) return L2;
  if (z <= Z.t2Front && Math.abs(x) > STAIR.hw && x >= T2.x0 && x <= T2.x1) return L2;
  if (z <= Z.t2Front && z > Z.t2Top && Math.abs(x) <= STAIR.hw) return L1 + STEP * Math.min(STEPS_B, Math.floor((Z.t2Front - z) / 0.6) + 1);
  if (z <= Z.t1Top && x >= T1.x0 && x <= T1.x1) return L1;
  if (z <= Z.t1Front && Math.abs(x) > STAIR.hw && x >= T1.x0 && x <= T1.x1) return L1;
  if (z <= Z.t1Front && z > Z.t1Top && Math.abs(x) <= STAIR.hw) return STEP * Math.min(STEPS_A, Math.floor((Z.t1Front - z) / 0.6) + 1);
  return 0;
}

// The hill's colliders: each level is a box with a height, so kids walk up the steps and can
// jump between levels; the sand slopes at the sides are walls.
export function hillColliders() {
  const c = [];
  const boxC = (x0, x1, z0, z1, h, tag) => c.push({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: (x1 - x0) / 2, hd: (z1 - z0) / 2, ...(h === null ? {} : { h }), tag });
  const S = STAIR.hw;
  // Terrace 1, with the first steps cut into its front
  boxC(T1.x0, -S, Z.back, Z.t1Front, L1);
  boxC(S, T1.x1, Z.back, Z.t1Front, L1);
  boxC(-S, S, Z.back, Z.t1Top, L1);
  for (let i = 0; i < STEPS_A; i++) boxC(-S, S, Z.t1Front - 0.6 * (i + 1), Z.t1Front - 0.6 * i, STEP * (i + 1));
  // The plateau, with the second steps cut into its front
  boxC(T2.x0, -S, Z.back, Z.t2Front, L2);
  boxC(S, T2.x1, Z.back, Z.t2Front, L2);
  boxC(-S, S, Z.back, LANDING.z - LANDING.hd, L2);
  boxC(-S, S, LANDING.z + LANDING.hd, Z.t2Top, L2);
  for (let i = 0; i < STEPS_B; i++) boxC(-S, S, Z.t2Front - 0.6 * (i + 1), Z.t2Front - 0.6 * i, L1 + STEP * (i + 1));
  // The landing in front of the door is its own piece (see odeh.js: kids coming out of the house)
  boxC(LANDING.x - LANDING.hw, LANDING.x + LANDING.hw, LANDING.z - LANDING.hd, LANDING.z + LANDING.hd, L2, 'odeh-landing');
  // Sand slopes round the sides and the back: nobody walks into them. They cover the dunes in
  // hill.js out to where the sand is ankle high (the dunes reach a little past the footprint).
  boxC(-13.1, T1.x0, Z.back - 1.95, Z.t1Front + 0.84, null);
  boxC(T1.x1, 13.1, Z.back - 1.95, Z.t1Front + 2.04, null);
  boxC(-12.1, 12.1, Z.back - 1.95, Z.back, null);
  return c;
}
