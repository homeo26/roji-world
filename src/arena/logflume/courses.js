// The three rides of the Log Flume and the splash round.
// Paths are drawn with the coaster's turtle (src/arena/coaster/track.js): yaw 0 faces +Z and a positive
// turn goes left. Turns are not banked (bank: 0): water stays level. Tags on a piece:
//   station: the loading dock; lift: a conveyor up a hill; drop: a drop (photo: the ride photo here);
//   tunnel: a covered part; name: what happens on this piece, several joined with '+':
//     branch (low branches to duck under), float (things floating in a lane to steer round),
//     falls (a waterfall, one lane stays dry), jets (water jets from the bank), gate (a low gate),
//     dip (a little drop with a splash), pool (the splash lagoon), top (the view at the top),
//     castle (along the castle walls), cave (the glow-worm cave), still (no pickups).
// Stars on each ride open the next ones (need: stars in total over every ride and the splash round).

export const START = { x: 0, y: 0.4, z: 0, yaw: 0 };

const T = (turn, r, rise = 0, name) => ({ turn, r, rise, bank: 0, ...(name ? { name } : {}) });
const S = (s, rise = 0, name) => ({ s, rise, ...(name ? { name } : {}) });

export const COURSES = [
  {
    id: 'jungle',
    name: 'Jungle Falls',
    sub: 'Leafy bends and a waterfall',
    need: 0,
    time: 'day',
    speed: 4.6,
    every: 5.2,
    mix: { fruit: 0.34, heart: 0.08, gold: 0.04, high: 0.2, moving: 0 },
    floats: 'hippo',
    pieces: [
      { s: 14, station: true, name: 'still' },
      T(70, 10, 0, 'still'),
      { s: 20, rise: 6.5, lift: true, name: 'still' },
      S(4, 0, 'top'),
      T(-100, 9, -0.3),
      S(16, -0.4, 'branch'),
      T(120, 8, -0.4),
      S(12, -0.2, 'float'),
      T(-80, 10, -0.3, 'branch'),
      S(16, -0.3, 'falls'),
      T(60, 12, -0.3),
      S(10, -3.3, 'dip'),
      S(12, 0, 'float'),
      T(-110, 9, -0.2, 'branch'),
      S(12, -0.2),
      T(90, 10, 0, 'still'),
      { s: 26, rise: 10.4, lift: true, name: 'still' },
      S(5, 0, 'top+still'),
      { s: 21, rise: -11.0, drop: true, photo: true, name: 'still' },
      S(34, 0, 'pool+still'),
    ],
  },
  {
    id: 'castle',
    name: 'Castle Moat',
    sub: 'Water jets and a drawbridge',
    need: 2,
    time: 'sunset',
    speed: 5.2,
    every: 4.9,
    mix: { fruit: 0.3, heart: 0.1, gold: 0.07, high: 0.24, moving: 0.18 },
    floats: 'barrel',
    pieces: [
      { s: 14, station: true, name: 'still' },
      T(-60, 11, 0, 'still'),
      { s: 18, rise: 6, lift: true, name: 'still' },
      S(4, 0, 'top'),
      T(90, 9, -0.3),
      S(22, -0.4, 'castle+jets'),
      T(-90, 9, -0.3, 'castle'),
      S(10, -0.2, 'gate'),
      S(12, -0.2, 'castle+float'),
      T(-100, 10, -0.3, 'jets'),
      S(10, -3.0, 'dip'),
      S(14, 0, 'castle+jets+float'),
      T(110, 9, -0.2, 'castle'),
      S(10, -0.2, 'gate'),
      T(-70, 11, 0, 'still'),
      { s: 26, rise: 11, lift: true, name: 'still+keep' },
      S(5, 0, 'top+still'),
      { s: 22, rise: -11.9, drop: true, photo: true, name: 'still' },
      S(34, 0, 'pool+still'),
    ],
  },
  {
    id: 'night',
    name: 'Firefly Night',
    sub: 'Fireflies, lanterns and a glowing cave',
    need: 4,
    time: 'night',
    speed: 5.6,
    every: 4.6,
    mix: { fruit: 0.22, heart: 0.1, gold: 0.06, high: 0.22, moving: 0.4 },
    floats: 'frog',
    pieces: [
      { s: 14, station: true, name: 'still' },
      T(80, 9, 0, 'still'),
      { s: 20, rise: 7, lift: true, name: 'still' },
      S(4, 0, 'top'),
      T(-110, 8, -0.3, 'branch'),
      S(12, -0.3, 'float'),
      T(100, 8, -0.3, 'branch'),
      { s: 22, rise: -0.4, tunnel: true, name: 'cave' },
      T(-90, 9, -0.3, 'float+branch'),
      S(10, -3.4, 'dip'),
      S(10, 0, 'branch'),
      T(120, 8, -0.2, 'float'),
      S(12, -0.2, 'branch'),
      T(-80, 10, 0, 'still'),
      { s: 26, rise: 10.6, lift: true, name: 'still' },
      S(5, 0, 'top+still'),
      { s: 21, rise: -12.2, drop: true, photo: true, name: 'still' },
      S(34, 0, 'pool+still'),
    ],
  },
];

// The splash round: a slow lazy river loop through a garden, with targets on the banks
export const SPLASH = {
  id: 'splash',
  name: 'Splash Attack',
  sub: 'Aim the water at targets on the banks',
  need: 0,
  time: 'day',
  pieces: [S(10, 0), T(90, 13), S(12), T(90, 13), S(10), T(-60, 12), T(60, 12), T(90, 13), S(14), T(90, 13), { to: { x: 0, y: 0.4, z: 0, yaw: 0 } }],
};

export const has = (name, word) => !!name && name.split('+').includes(word);
