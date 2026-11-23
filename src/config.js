// The journey. Edit titles, texts, colours and dates here.
//
// date (optional): 'YYYY-MM-DD'. When set, the stop stays locked until that
// day (local time), so each weekend can be revealed when it arrives.
// locked: true keeps a stop closed whatever the date (used for "coming soon").

export const PLAYER_NAME = 'Roji';

export const STOPS = [
  {
    id: 'home',
    kind: 'start',
    title: 'Home',
    tag: 'Start here',
    icon: 'home',
    color: '#f08a5d',
    text: 'Hi Roji! Follow the path. Every stop is one weekend, and every weekend is a new adventure.',
  },
  {
    id: 'cinema',
    week: 1,
    title: 'Cinema Night',
    tag: 'Date night',
    icon: 'cinema',
    color: '#e5484d',
    date: null,
    text: 'Popcorn, comfy seats and the big screen. The journey starts with a movie night date.',
  },
  {
    id: 'horse',
    week: 2,
    title: 'Horse Riding',
    tag: 'Outdoors',
    icon: 'horse',
    color: '#c9772f',
    date: null,
    text: 'Boots on, saddle up. A slow ride in the open air.',
  },
  {
    id: 'fencing',
    week: 3,
    title: 'Fencing',
    tag: 'En garde',
    icon: 'fencing',
    color: '#3f7bf0',
    date: null,
    text: 'Masks on, foils up. A first fencing lesson with plenty of laughs.',
  },
  {
    id: 'boardgames',
    week: 4,
    title: 'Board Games',
    tag: 'Game night',
    icon: 'dice',
    color: '#8b5cf6',
    date: null,
    text: 'Dice, cards and a little friendly rivalry. The winner picks dessert.',
  },
  {
    id: 'clay',
    week: 5,
    title: 'Clay at the Café',
    tag: 'Make something',
    icon: 'vase',
    color: '#d9734e',
    date: null,
    text: 'Coffee on the table and clay on our hands. Something handmade to keep.',
  },
  {
    id: 'drawing',
    week: 6,
    title: 'Drawing',
    tag: 'Creative day',
    icon: 'palette',
    color: '#ec5f9e',
    date: null,
    text: 'Pencils, paints and a slow afternoon of drawing.',
  },
  {
    id: 'yumyum',
    kind: 'place',
    title: "Roji's YumYum",
    tag: 'Restaurant',
    icon: 'yum',
    color: '#ff7a59',
    text: 'Burgers, fries and milkshakes. Put on the apron and run the kitchen.',
  },
  {
    id: 'plaza',
    kind: 'place',
    title: 'Play Park',
    tag: 'Dance and play',
    icon: 'music',
    color: '#21a99a',
    text: 'A fountain for wishes, a dance floor and a little arcade.',
  },
  {
    id: 'next',
    week: 7,
    title: 'Coming Soon',
    tag: 'Unlocks next week',
    icon: 'lock',
    color: '#8f8ab0',
    locked: true,
    text: 'A new adventure unlocks next weekend. Come back soon to see what it is!',
  },
];

// Is a stop open right now?
export function isUnlocked(stop, now = new Date()) {
  if (stop.locked) return false;
  if (!stop.date) return true;
  const [y, m, d] = stop.date.split('-').map(Number);
  return now >= new Date(y, m - 1, d);
}

export function unlockLabel(stop) {
  if (stop.locked || !stop.date) return stop.tag;
  const [y, m, d] = stop.date.split('-').map(Number);
  const when = new Date(y, m - 1, d);
  return 'Opens ' + when.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}
