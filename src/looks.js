// Character looks, shared by the 3D characters, the wardrobe and the 2D avatars.

export const HAIRSTYLES = {
  girl: ['pigtails', 'ponytail', 'bob', 'long', 'buns'],
  boy: ['short', 'curly', 'spiky', 'sidepart'],
};
export const ALL_HAIRSTYLES = ['pigtails', 'ponytail', 'bob', 'long', 'buns', 'short', 'curly', 'spiky', 'sidepart'];
export const HAIRSTYLE_NAMES = {
  pigtails: 'Pigtails',
  ponytail: 'Ponytail',
  bob: 'Bob',
  long: 'Long',
  buns: 'Space buns',
  short: 'Short',
  curly: 'Curly',
  spiky: 'Spiky',
  sidepart: 'Side part',
};

export const OUTFITS = ['dress', 'tee-shorts', 'tee-pants', 'overalls', 'hoodie', 'skirt'];
// Roji is a girl and Homama is a boy: each only sees clothes and haircuts for them.
export const OUTFITS_BY = { girl: ['dress', 'skirt', 'overalls'], boy: ['tee-shorts', 'tee-pants', 'hoodie'] };
export const OUTFIT_NAMES = {
  dress: 'Dress',
  'tee-shorts': 'T-shirt and shorts',
  'tee-pants': 'T-shirt and trousers',
  overalls: 'Overalls',
  hoodie: 'Hoodie',
  skirt: 'Top and skirt',
};

export const PALETTE = {
  clothes: ['#ef5b6f', '#ff9eb5', '#ffd166', '#7fd3a7', '#3fbf7f', '#6fb8ff', '#3f7bf0', '#8b5cf6', '#c7a6ff', '#f08a5d', '#ffffff', '#3b2b3f', '#2c3e66', '#a0602e'],
  hair: ['#141010', '#2a1a13', '#4a2c1a', '#7a4a26', '#b5773d', '#e3c07a', '#c94f3b', '#8b5cf6', '#ff8fb1'],
  skin: ['#fbe6d8', '#f8dccb', '#f2cdb4', '#e3b08e', '#c98f68', '#9c6a4a', '#6e4630'],
  shoes: ['#7a2e3a', '#ffffff', '#3b2b3f', '#e5484d', '#3f7bf0', '#ffd166'],
};

export const DEFAULT_LOOKS = {
  roji: {
    id: 'roji',
    name: 'Roji',
    gender: 'girl',
    skin: '#f8dccb',
    hair: '#2a1a13',
    hairstyle: 'pigtails',
    outfit: 'dress',
    top: '#ef5b6f',
    bottom: '#ef5b6f',
    shoes: '#7a2e3a',
    accent: '#ff7fa3',
  },
  homama: {
    id: 'homama',
    name: 'Homama',
    gender: 'boy',
    skin: '#f6d8c6',
    hair: '#141010',
    hairstyle: 'short',
    outfit: 'tee-shorts',
    top: '#3f7bf0',
    bottom: '#2c3e66',
    shoes: '#ffffff',
    accent: '#ffd166',
  },
};

const KEY = 'roji-weekends-looks-v1';

// Keep a saved look within its own girl or boy wardrobe.
function fit(look, base) {
  const L = { ...base, ...look, gender: base.gender, id: base.id, name: base.name };
  if (!OUTFITS_BY[L.gender].includes(L.outfit)) L.outfit = base.outfit;
  if (!HAIRSTYLES[L.gender].includes(L.hairstyle)) L.hairstyle = base.hairstyle;
  return L;
}

export function loadLooks() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      roji: fit(saved.roji || {}, DEFAULT_LOOKS.roji),
      homama: fit(saved.homama || {}, DEFAULT_LOOKS.homama),
    };
  } catch {
    return structuredClone(DEFAULT_LOOKS);
  }
}

export function saveLooks(looks) {
  localStorage.setItem(KEY, JSON.stringify(looks));
}

// Skirt-like outfits have no visible legs above the knee.
export const hasSkirt = (look) => look.outfit === 'dress' || look.outfit === 'skirt';
