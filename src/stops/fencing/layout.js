// The club's floor plan (interior coordinates: origin at the middle, floor y = 0, the open front toward +Z).
//
//   x -13 .......... -5.5 | -5.5 ........................................ 13
//   z -8  changing room   | armoury | the stand (watchers)      | trophy wall
//         lockers, bench  |         piste A  (club fencers bouting)
//   z -1.5 ==cutaway wall=|         piste B  (practice bout, salute)
//         foyer:          |         piste C  (Fencing Duel)
//         reception, door |         lesson mat with the coach
//   z 8   (open front)    |

export const L = {
  W: 26,
  X0: -13,
  X1: 13,
  ZB: -8, // inner face of the back wall
  ZF: 8, // front edge of the floor
  LX: -5.5, // wall between the left rooms and the hall
  CZ: -1.5, // wall between the changing room (behind) and the foyer (in front)
  HL: 3.0, // wall height of the left rooms
  HH: 4.4, // wall height of the hall
  CH_DOOR: [-8.4, -7.0], // doorway in the changing-room wall (x)
  ARCH: [0.6, 2.6], // doorway from the foyer into the hall (z)
  PISTE: { x: 3.6, len: 8.4, w: 1.5, y: 0.04, z: { a: -3.9, b: -0.9, c: 2.1 } },
  GUARD: 0.95, // en garde lines either side of a piste's centre
  BOARD_X: -1.95, // scoreboards stand at the left end of each piste
  STAND: { x0: 0, x1: 7.2, front: -5.7, tiers: [0.27, 0.54, 0.81], depth: 0.6 },
  TROPHY: { x0: 8.2, x1: 12.7, cx: 10.45 },
  ARMOURY: { x0: -5.2, x1: -1.0 },
  MAT: { x: 3.8, z: 5.4, w: 6.0, d: 2.6 },
  LOCKERS: { x0: -12.6, n: 10, w: 0.6, z: -7.72, roji: 4, homama: 5 },
  DESK: { x: -10.4, z: 1.0 },
  EXIT: { x: -9.25, z: 7.45 },
};
