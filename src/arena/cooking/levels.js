// Roji's YumYum Kitchen: the menu, the twelve levels, the kitchen shop and the saved progress.

// Dishes. An order item is a dish plus some extras, written as a key: 'wrap', 'wrap:toum+pickles'.
export const DISH = {
  wrap: { name: 'Shawarma', price: 6, extras: ['toum', 'pickles'] },
  latte: { name: 'Spanish latte', price: 5, extras: [] },
  lemonade: { name: 'Mint lemonade', price: 4, extras: [] },
  burger: { name: 'Burger', price: 6, extras: ['cheese', 'salad'] },
  fries: { name: 'Fries', price: 3, extras: [] },
  pecan: { name: 'Pecan cake', price: 5, extras: [] },
  german: { name: 'German cake', price: 5, extras: [] },
  mansaf: { name: 'Mansaf', price: 16, extras: [] },
};
export const EXTRA = {
  toum: { name: 'toum', price: 1 },
  pickles: { name: 'pickles', price: 1 },
  cheese: { name: 'cheese', price: 1 },
  salad: { name: 'lettuce and tomato', price: 1 },
};
const EXTRA_ORDER = Object.keys(EXTRA);
export const sortExtras = (list) => [...new Set(list)].sort((a, b) => EXTRA_ORDER.indexOf(a) - EXTRA_ORDER.indexOf(b));
export const itemKey = (dish, extras = []) => (extras.length ? `${dish}:${sortExtras(extras).join('+')}` : dish);
export const parseKey = (key) => {
  const [dish, ex] = key.split(':');
  return { dish, extras: ex ? ex.split('+') : [] };
};
export const itemPrice = (key) => {
  const { dish, extras } = parseKey(key);
  return DISH[dish].price + extras.reduce((a, e) => a + EXTRA[e].price, 0);
};
export const itemName = (key) => {
  const { dish, extras } = parseKey(key);
  const n = DISH[dish].name;
  return extras.length ? `${n} with ${extras.map((e) => EXTRA[e].name).join(' and ')}` : n;
};

// What a new dish or extra looks like the first time it is on the menu.
export const INTRO = {
  wrap: 'Shawarma: tap the bread, then the spit to shave the meat. Tap the wrap to serve it.',
  latte: 'Spanish latte: tap the coffee machine, wait for the cup to fill, then tap it to serve.',
  lemonade: 'Mint lemonade: tap the jar to pour a glass, then tap the glass to serve.',
  toum: 'Toum: some guests want garlic sauce. Tap the toum bowl after the meat.',
  pickles: 'Pickles: tap the pickles after the meat for guests who ask.',
  burger: 'Burgers: tap the grill to cook a patty, tap it when it is brown, add cheese if asked, then tap the plate to serve. Do not let it burn!',
  cheese: 'Cheese: tap the cheese to add a slice to a burger.',
  fries: 'Fries: tap the fryer, tap it again when golden to fill the tray, then tap the tray to serve a box.',
  pecan: "Pecan cake: tap the cake to serve a slice. A fresh cake comes when it runs out.",
  salad: 'Lettuce and tomato: tap the salad bowl to add it to a burger.',
  german: 'German cake: chocolate and coconut, served by the slice like the pecan cake.',
  mansaf: 'Mansaf: tap the pot to cook the lamb, tap it again to plate rice, lamb, jameed and pine nuts, then serve it for a big tip.',
};

// Levels. menu: dish weights. extras: which extras guests may ask for. sizes: chance of 1, 2 or 3 items.
// patience: seconds for a one-item order. spawn: seconds between guests. goal: coins for 1, 2 and 3 stars.
// challenge: { type: 'noburn' | 'nolost' | 'combo', n } earns a bonus.
export const LEVELS = [
  { name: 'Soft opening', time: 70, spots: 3, menu: { wrap: 3, latte: 2 }, extras: [], sizes: [0.72, 0.28, 0], patience: 28, spawn: [3.4, 5.6], vip: false, goal: [65, 130, 175] },
  { name: 'Mint morning', time: 75, spots: 3, menu: { wrap: 3, latte: 2, lemonade: 2 }, extras: ['toum'], sizes: [0.55, 0.45, 0], patience: 27, spawn: [3.2, 5.2], vip: true, goal: [75, 155, 235] },
  { name: 'Burger lunch', time: 80, spots: 3, menu: { wrap: 2, burger: 3, latte: 1, lemonade: 2 }, extras: ['toum', 'pickles', 'cheese'], sizes: [0.5, 0.45, 0.05], patience: 26, spawn: [3, 5], vip: true, goal: [80, 160, 245], challenge: { type: 'nolost' } },
  { name: 'Fries please', time: 85, spots: 3, menu: { wrap: 2, burger: 2, fries: 3, latte: 1, lemonade: 1 }, extras: ['toum', 'pickles', 'cheese'], sizes: [0.4, 0.5, 0.1], patience: 26, spawn: [3, 4.8], vip: true, goal: [90, 170, 260], challenge: { type: 'noburn' } },
  { name: "Cake o'clock", time: 90, spots: 3, menu: { wrap: 2, burger: 2, fries: 2, latte: 2, lemonade: 1, pecan: 3 }, extras: ['toum', 'pickles', 'cheese', 'salad'], sizes: [0.35, 0.5, 0.15], patience: 26, spawn: [2.9, 4.6], vip: true, goal: [110, 210, 330], challenge: { type: 'combo', n: 3 } },
  { name: 'Sweet tooth', time: 90, spots: 4, menu: { wrap: 2, burger: 2, fries: 2, latte: 2, lemonade: 1, pecan: 2, german: 3 }, extras: ['toum', 'pickles', 'cheese', 'salad'], sizes: [0.35, 0.5, 0.15], patience: 27, spawn: [3, 4.8], vip: true, goal: [120, 215, 335] },
  { name: 'Busy bee', time: 95, spots: 4, menu: { wrap: 2, burger: 2, fries: 2, latte: 2, lemonade: 2, pecan: 1, german: 1 }, extras: ['toum', 'pickles', 'cheese', 'salad'], sizes: [0.3, 0.5, 0.2], patience: 25, spawn: [2.7, 4.4], vip: true, goal: [125, 220, 370], challenge: { type: 'nolost' } },
  { name: 'Mansaf Friday', time: 100, spots: 4, menu: { wrap: 2, burger: 2, fries: 2, latte: 2, lemonade: 1, pecan: 1, german: 1, mansaf: 2 }, extras: ['toum', 'pickles', 'cheese', 'salad'], sizes: [0.35, 0.5, 0.15], patience: 28, spawn: [2.8, 4.6], vip: true, goal: [140, 240, 385] },
  { name: 'Family table', time: 100, spots: 4, menu: { wrap: 2, burger: 2, fries: 2, latte: 2, lemonade: 2, pecan: 1, german: 1, mansaf: 1 }, extras: ['toum', 'pickles', 'cheese', 'salad'], sizes: [0.2, 0.5, 0.3], patience: 27, spawn: [2.8, 4.6], vip: true, goal: [140, 235, 395], challenge: { type: 'combo', n: 4 } },
  { name: 'Night market', time: 105, spots: 4, menu: { wrap: 3, burger: 2, fries: 2, latte: 2, lemonade: 2, pecan: 1, german: 1, mansaf: 1 }, extras: ['toum', 'pickles', 'cheese', 'salad'], sizes: [0.25, 0.5, 0.25], patience: 25, spawn: [2.5, 4.2], vip: true, goal: [150, 260, 425], challenge: { type: 'noburn' } },
  { name: 'Island festival', time: 110, spots: 4, menu: { wrap: 2, burger: 2, fries: 2, latte: 2, lemonade: 2, pecan: 2, german: 2, mansaf: 1 }, extras: ['toum', 'pickles', 'cheese', 'salad'], sizes: [0.2, 0.5, 0.3], patience: 25, spawn: [2.4, 4], vip: true, goal: [160, 285, 470], challenge: { type: 'nolost' } },
  { name: "Roji's big night", time: 120, spots: 4, menu: { wrap: 2, burger: 2, fries: 2, latte: 2, lemonade: 2, pecan: 1, german: 1, mansaf: 2 }, extras: ['toum', 'pickles', 'cheese', 'salad'], sizes: [0.15, 0.5, 0.35], patience: 26, spawn: [2.3, 3.9], vip: true, goal: [175, 300, 500], challenge: { type: 'combo', n: 5 } },
];
export const CHALLENGE_BONUS = 25;
export const challengeText = (c) => (!c ? '' : c.type === 'noburn' ? 'Burn nothing' : c.type === 'nolost' ? 'Keep every guest happy' : `Serve a combo of ${c.n}`);

// The first level that has a dish or extra on its menu.
export const firstLevelOf = (dish) => LEVELS.findIndex((l) => l.menu[dish] || l.extras.includes(dish));

// Kitchen shop. Each upgrade has one or two steps; `from` is the first level it can be bought.
export const UPGRADES = [
  { id: 'spit', name: 'Golden spit', from: 0, steps: [{ price: 90, text: 'Meat roasts faster' }, { price: 260, text: 'A brass crown and even faster meat' }] },
  { id: 'coffee', name: 'Coffee machine', from: 0, steps: [{ price: 110, text: 'Coffee pours faster' }, { price: 300, text: 'A second cup spout' }] },
  { id: 'vases', name: 'Flower vases', from: 1, steps: [{ price: 110, text: 'Roses on the counter: guests wait longer' }] },
  { id: 'grill', name: 'Bigger grill', from: 2, steps: [{ price: 150, text: 'A third patty spot' }, { price: 330, text: 'Patties cook faster' }] },
  { id: 'jar', name: 'Lemonade jar', from: 1, steps: [{ price: 100, text: 'A big jar that pours faster' }] },
  { id: 'fries', name: 'Fries station', from: 3, steps: [{ price: 140, text: 'A bigger fries tray' }, { price: 300, text: 'Fries cook faster' }] },
  { id: 'lanterns', name: 'Brass lanterns', from: 2, steps: [{ price: 190, text: 'Warm light: bigger tips' }] },
  { id: 'cakes', name: 'Cake stands', from: 4, steps: [{ price: 170, text: 'Eight slices in every cake' }, { price: 330, text: 'Fresh cakes come faster' }] },
  { id: 'music', name: 'Music box', from: 5, steps: [{ price: 240, text: 'A sweet tune: guests wait longer' }] },
];

// ---------------------------------------------------------------- saved progress
const N = LEVELS.length;
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
export function loadProgress(load) {
  let s = null;
  try {
    s = load('v3', null);
  } catch {
    s = null;
  }
  const out = { stars: Array(N).fill(0), best: Array(N).fill(0), chall: Array(N).fill(false), wallet: 0, up: {}, seen: [] };
  if (s && typeof s === 'object') {
    for (let i = 0; i < N; i++) {
      out.stars[i] = Math.max(0, Math.min(3, Math.round(num(s.stars?.[i]))));
      out.best[i] = Math.max(0, Math.round(num(s.best?.[i])));
      out.chall[i] = !!s.chall?.[i];
    }
    out.wallet = Math.max(0, Math.round(num(s.wallet)));
    for (const u of UPGRADES) out.up[u.id] = Math.max(0, Math.min(u.steps.length, Math.round(num(s.up?.[u.id]))));
    out.seen = Array.isArray(s.seen) ? s.seen.filter((x) => typeof x === 'string') : [];
    return out;
  }
  // Progress from the first version of the game (three levels, 'unlocked' and 'best')
  try {
    const unlocked = Math.max(1, Math.min(4, Math.round(num(load('unlocked', 1), 1))));
    for (let i = 0; i < unlocked - 1 && i < N; i++) out.stars[i] = 1;
    const best = load('best', null);
    if (Array.isArray(best)) for (let i = 0; i < 3; i++) out.best[i] = Math.max(0, Math.round(num(best[i])));
  } catch {
    /* nothing saved */
  }
  for (const u of UPGRADES) out.up[u.id] = 0;
  return out;
}
export function saveProgress(save, p) {
  save('v3', { stars: p.stars, best: p.best, chall: p.chall, wallet: p.wallet, up: p.up, seen: p.seen });
}
export const isOpen = (p, lv) => lv === 0 || p.stars[lv - 1] > 0;
export const starsFor = (coins, goal) => (coins >= goal[2] ? 3 : coins >= goal[1] ? 2 : coins >= goal[0] ? 1 : 0);

// The kitchen as the upgrades make it: speeds, sizes and guest bonuses.
export function kitchenStats(up) {
  const u = (id) => up[id] || 0;
  return {
    spitMax: u('spit') >= 2 ? 8 : 6,
    spitRefill: [2.4, 1.7, 1.2][u('spit')],
    grillSpots: u('grill') >= 1 ? 3 : 2,
    cook: u('grill') >= 2 ? 3.6 : 4.8,
    burn: 7,
    coffeeSpouts: u('coffee') >= 2 ? 2 : 1,
    coffeeFill: u('coffee') >= 1 ? 2.4 : 3.3,
    jarFill: u('jar') >= 1 ? 1.4 : 2.1,
    trayCap: u('fries') >= 1 ? 5 : 3,
    fry: u('fries') >= 2 ? 3 : 4.2,
    fryBurn: 8,
    slices: u('cakes') >= 1 ? 8 : 6,
    bake: u('cakes') >= 2 ? 2.2 : 3.8,
    potCook: 6.5,
    patience: 1 + (u('vases') ? 0.12 : 0) + (u('music') ? 0.12 : 0),
    tips: 1 + (u('lanterns') ? 0.3 : 0),
  };
}
