// Roji's YumYum Kitchen: ingredients, recipes, the eight kitchens and the saved progress.

export const CELL = 1.2; // one counter or floor tile, in metres
export const TOP = 0.66; // counter top height

// Ingredients. chop: goes on a board. pan: cooks in a frying pan. spit: loads the shawarma spit.
export const ING = {
  tomato: { name: 'Tomato', chop: true },
  cucumber: { name: 'Cucumber', chop: true },
  lettuce: { name: 'Lettuce', chop: true },
  onion: { name: 'Onion', chop: true },
  lemon: { name: 'Lemon', chop: true },
  lamb: { name: 'Lamb', chop: true },
  chicken: { name: 'Chicken', spit: true },
  patty: { name: 'Burger patty', pan: true },
  bread: { name: 'Flatbread' },
  bun: { name: 'Burger bun' },
  rice: { name: 'Rice' },
  lentils: { name: 'Lentils' },
  mint: { name: 'Mint' },
  ice: { name: 'Ice' },
  jameed: { name: 'Jameed' },
  toum: { name: 'Garlic sauce' },
};

// A part is what goes on a plate or into a pot: 'tomato:chopped', 'bread', 'soup'.
export const partKey = (id, state = 'raw') => (state === 'raw' ? id : `${id}:${state}`);

// Pot and jug recipes: the pot cooks once it holds exactly these, and gives one part.
export const BREW = {
  soup: { vessel: 'pot', needs: ['onion:chopped', 'lentils'], time: 9, name: 'Lentil soup' },
  'rice:cooked': { vessel: 'pot', needs: ['rice'], time: 8, name: 'Cooked rice' },
  stew: { vessel: 'pot', needs: ['lamb:chopped', 'jameed'], time: 10, name: 'Lamb in jameed' },
  lemonade: { vessel: 'jug', needs: ['lemon:chopped', 'mint', 'ice'], time: 3, name: 'Mint lemonade' },
};
export const PAN_TIME = 6; // a patty cooks in this many seconds
export const PAN_BURN = 7; // then it burns after this many more
export const POT_BURN = 11;
export const FIRE_AFTER = 3.5; // burnt food catches fire after this
export const SPIT_ROAST = 6;
export const SPIT_PORTIONS = 3;
export const CHOP_TIME = 1.8;
export const WASH_TIME = 2;
export const SLICE_TIME = 1;

// Dishes on Roji's menu. parts: exactly what the plate must hold.
export const DISH = {
  fattoush: { name: 'Fattoush salad', parts: ['tomato:chopped', 'cucumber:chopped', 'lettuce:chopped'], points: 20, time: 70 },
  wrap: { name: 'Shawarma wrap', parts: ['bread', 'chicken:sliced', 'toum'], points: 28, time: 78 },
  burger: { name: 'Burger', parts: ['patty:cooked', 'bun', 'lettuce:chopped', 'tomato:chopped'], points: 36, time: 90 },
  soup: { name: 'Lentil soup', parts: ['soup'], points: 26, time: 80 },
  lemonade: { name: 'Mint lemonade', parts: ['lemonade'], points: 18, time: 62 },
  mansaf: { name: 'Mansaf', parts: ['rice:cooked', 'stew'], points: 60, time: 120 },
};

// How each part is made, for the recipe cards: [ingredient, step].
export const HOW = {
  'tomato:chopped': ['tomato', 'chop'],
  'cucumber:chopped': ['cucumber', 'chop'],
  'lettuce:chopped': ['lettuce', 'chop'],
  'onion:chopped': ['onion', 'chop'],
  'lemon:chopped': ['lemon', 'chop'],
  'lamb:chopped': ['lamb', 'chop'],
  'chicken:sliced': ['chicken', 'spit'],
  'patty:cooked': ['patty', 'pan'],
  soup: ['soup', 'pot'],
  'rice:cooked': ['rice', 'pot'],
  stew: ['stew', 'pot'],
  lemonade: ['lemonade', 'jug'],
};

// Is the multiset `parts` (plus `add`) still part of one of these recipes?
export function fits(parts, add, recipes) {
  const want = [...parts, add];
  return recipes.some((need) => {
    const left = [...need];
    for (const p of want) {
      const i = left.indexOf(p);
      if (i < 0) return false;
      left.splice(i, 1);
    }
    return true;
  });
}
export function same(parts, need) {
  if (parts.length !== need.length) return false;
  const left = [...need];
  for (const p of parts) {
    const i = left.indexOf(p);
    if (i < 0) return false;
    left.splice(i, 1);
  }
  return true;
}
export const dishOf = (parts, menu) => menu.find((d) => same(parts, DISH[d].parts)) || null;
export const brewOf = (contents, vessel) => Object.keys(BREW).find((k) => BREW[k].vessel === vessel && same(contents, BREW[k].needs)) || null;
export const brewFits = (contents, add, vessel, allowed) => fits(contents, add, Object.keys(BREW).filter((k) => BREW[k].vessel === vessel && allowed.includes(k)).map((k) => BREW[k].needs));

// Crate letters in the kitchen maps.
export const CRATE = { t: 'tomato', c: 'cucumber', l: 'lettuce', o: 'onion', k: 'chicken', m: 'lamb', b: 'bread', u: 'bun', p: 'patty', r: 'rice', n: 'lentils', e: 'lemon', i: 'mint', z: 'ice', j: 'jameed', g: 'toum' };

// ---------------------------------------------------------------- the eight kitchens
// Map letters: . floor, ~ floor hatch, space nothing, | a low wall (holds nothing), # counter, X chopping board, F hob with a pan,
// H hob with a pot, S shawarma spit, W sink, Y plate rack, P the pass (serve here), Q bin,
// J blender with its jug, V extinguisher, = conveyor belt, lower case: an ingredient crate (CRATE).
// a, b: where the player's chef and the partner start. stars: score for 1, 2 and 3 stars.
export const LEVELS = [
  {
    id: 'opening',
    name: 'Soft opening',
    place: "Roji's YumYum kitchen",
    twist: 'A cosy first shift. Chop the salad, blend the lemonade, keep the plates clean.',
    theme: 'yumyum',
    menu: ['fattoush', 'lemonade'],
    time: 150,
    maxOrders: 3,
    every: 17,
    plates: 3,
    stars: [40, 90, 140],
    a: [3, 2],
    b: [8, 4],
    map: [
      '#tcl##XX####',
      '#..........P',
      '#..........#',
      'Y...####...#',
      'W..........J',
      'Q..........#',
      '#V#e#i#z#XX#',
    ],
  },
  {
    id: 'split',
    name: 'Split shift',
    place: 'The back kitchen',
    twist: 'A long counter splits the kitchen in two. Pass food across it.',
    theme: 'mint',
    menu: ['wrap', 'fattoush'],
    time: 160,
    maxOrders: 3,
    every: 16,
    plates: 4,
    stars: [80, 180, 290],
    a: [10, 3],
    b: [4, 3],
    map: [
      '#kS#tcl######',
      '#......#....P',
      'X......#....#',
      'X......#....Y',
      '#......#....W',
      'b......#....g',
      '##V#######Q##',
    ],
  },
  {
    id: 'belt',
    name: 'Belt and buns',
    place: 'The bakery corner',
    twist: 'A wall between two rooms, and one conveyor belt over it. Send food along the belt, and watch the pans, or they catch fire!',
    theme: 'bakery',
    menu: ['burger', 'fattoush'],
    time: 170,
    maxOrders: 3,
    every: 18,
    plates: 4,
    stars: [80, 180, 290],
    a: [8, 3],
    b: [2, 3],
    belt: [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0]],
    map: [
      '#==========#',
      't....|.....P',
      'c....|.....#',
      'l....|.....F',
      'p....|.....F',
      'u....|.....V',
      '#XX#X|#YW#Q#',
    ],
  },
  {
    id: 'trucks',
    name: 'Food truck friends',
    place: 'Two trucks by the beach',
    twist: 'Two food trucks drift apart and back together. Cross over while they touch.',
    theme: 'trucks',
    menu: ['burger', 'lemonade'],
    time: 170,
    maxOrders: 3,
    every: 18,
    plates: 4,
    stars: [50, 110, 170],
    a: [9, 2],
    b: [3, 2],
    trucks: { left: [1, 6], right: [7, 12], together: 15, apart: 9, move: 1.8 },
    map: [
      ' #pult##FF### ',
      ' e....#.....P ',
      ' i....#.....# ',
      ' z..........Y ',
      ' #....#.....W ',
      ' #XXJ###V##Q# ',
    ],
  },
  {
    id: 'slide',
    name: 'Sliding tiles',
    place: 'The soup kitchen',
    twist: 'Every 20 seconds the middle floor slides across, counters and all.',
    theme: 'tiles',
    menu: ['soup', 'fattoush'],
    time: 170,
    maxOrders: 3,
    every: 17,
    plates: 4,
    stars: [100, 220, 340],
    a: [9, 2],
    b: [3, 5],
    slider: { row: 3, at: [2, 7], cells: 'XH#X', every: 20, move: 1.4 },
    map: [
      '#onH#tcl#H###',
      '#...........P',
      '#...........#',
      '#...........Y',
      '#...........W',
      '#...........Q',
      '##V##X##X####',
    ],
  },
  {
    id: 'freezer',
    name: 'Brain freeze',
    place: 'The ice cream freezer',
    twist: 'The floor is solid ice. Chefs slide, so start turning early!',
    theme: 'freezer',
    menu: ['soup', 'wrap', 'lemonade'],
    time: 180,
    maxOrders: 4,
    every: 16,
    plates: 4,
    ice: true,
    stars: [70, 160, 250],
    a: [9, 2],
    b: [2, 2],
    map: [
      '#onk#S#ezi##',
      '#..........P',
      'X..........#',
      'X...#HH#...Y',
      'b...#J##...W',
      'g..........Q',
      '##V#X#X#H###',
    ],
  },
  {
    id: 'rooftop',
    name: 'Rooftop sunset',
    place: 'The YumYum rooftop',
    twist: 'The stair hatch opens and closes. When it is open, the roof is cut in two.',
    theme: 'rooftop',
    menu: ['mansaf', 'burger', 'lemonade'],
    time: 180,
    maxOrders: 3,
    every: 19,
    plates: 4,
    stars: [110, 250, 400],
    a: [9, 3],
    b: [3, 3],
    hatch: { closed: 13, open: 9, move: 1 },
    map: [
      '#mjrHH##plut#',
      '#.....#.....P',
      'X.....#.....#',
      'X.....~.....Y',
      '#.....~.....W',
      '#.....~.....Q',
      '##V#ei#zJXFF#',
    ],
  },
  {
    id: 'night',
    name: 'Night service',
    place: "Roji's YumYum after dark",
    twist: 'Everything at once: every dish on the menu, sliding tiles and hungry night owls.',
    theme: 'night',
    menu: ['fattoush', 'wrap', 'burger', 'soup', 'lemonade', 'mansaf'],
    time: 200,
    maxOrders: 4,
    every: 14,
    plates: 5,
    fast: 1.25,
    stars: [90, 200, 320],
    a: [8, 2],
    b: [4, 5],
    slider: { row: 4, at: [2, 7], cells: 'X#H#', every: 22, move: 1.4 },
    map: [
      '#tclo#kS#bg#P#',
      'm............#',
      'j............Y',
      'r............W',
      'n............Q',
      'p............J',
      'u............#',
      '#VXX#HH#FFeiz#',
    ],
  },
];

// Stars needed to open each kitchen.
export const NEED = [0, 1, 3, 5, 8, 11, 14, 17];

// ---------------------------------------------------------------- saved progress
// Old saves of the earlier YumYum game used other keys ('v3', 'best', 'unlocked'); they are left alone.
export function loadProgress(load) {
  const n = LEVELS.length;
  const p = { v: 1, stars: Array(n).fill(0), best: Array(n).fill(0), mode: 'solo' };
  try {
    const s = load('oc1', null);
    if (s && typeof s === 'object') {
      for (let i = 0; i < n; i++) {
        const st = Math.round(Number(s.stars?.[i]));
        const b = Math.round(Number(s.best?.[i]));
        p.stars[i] = Number.isFinite(st) ? Math.max(0, Math.min(3, st)) : 0;
        p.best[i] = Number.isFinite(b) ? Math.max(0, b) : 0;
      }
      if (s.mode === 'duo') p.mode = 'duo';
    }
  } catch {
    /* a broken save starts fresh */
  }
  return p;
}
export function saveProgress(save, p) {
  save('oc1', { v: 1, stars: p.stars, best: p.best, mode: p.mode });
}
export const totalStars = (p) => p.stars.reduce((a, b) => a + b, 0);
export const isOpen = (p, i) => totalStars(p) >= NEED[i];
export const starsFor = (lv, score) => LEVELS[lv].stars.filter((s) => score >= s).length;
