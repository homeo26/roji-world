// Where things stand in the Play Park, in the stop's local metres (origin 6.2 m behind the pad, +Z toward
// the pad and the camera). The footprint is x -7.5 .. 13, z -10 .. 3.
export const FLOOR = { x: 2.6, z: -3.4, n: 8, tile: 0.8 }; // 6.4 m square of light-up tiles
export const FLOOR_HALF = (FLOOR.n * FLOOR.tile) / 2;
export const PILLAR = FLOOR_HALF + 0.18; // the arch pillars stand just off the floor's corners
export const FOUNTAIN = { x: -4.2, z: -2.6, r: 1.65 };
export const STAGE = { x: 2.6, z0: -9.75, z1: -7.4, hw: 2.8, h: 0.45 };
export const ARCADE = { x0: 7.6, x1: 12.3, z0: -9.75, z1: -7.1 };
export const CART = { x: 9.8, z: -3.3 };
export const ARCH = { x: 0, z: 2.3, half: 1.55 };
export const PAVE = { x0: -7.4, x1: 12.9, z0: -9.95, z1: 2.95 };
