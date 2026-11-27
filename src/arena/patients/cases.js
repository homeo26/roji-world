import { PATIENTS } from '../../places/hospital/roster.js';

// Dr. Roji's Shift: the people, the cases (exam and surgery), the unlocks and how a shift is put together.

const look = (o) => ({ gender: 'girl', skin: '#f8dccb', hair: '#4a2c1a', hairstyle: 'bob', outfit: 'tee-pants', top: '#c7a6ff', bottom: '#c7a6ff', shoes: '#ffffff', accent: '#ffd166', ...o });

// Patients from the hospital roster, plus a few who only come to the shift.
const EXTRA = [
  { id: 'karim', name: 'Karim', look: look({ name: 'Karim', gender: 'boy', skin: '#e3b08e', hair: '#2a1a13', hairstyle: 'spiky', outfit: 'tee-shorts', top: '#ffb02e', bottom: '#3f7bf0', fav: '#6fb8ff' }) },
  { id: 'dana', name: 'Dana', look: look({ name: 'Dana', skin: '#fbe6d8', hair: '#b5773d', hairstyle: 'pigtails', outfit: 'skirt', top: '#ff9eb5', bottom: '#7fd8bf', accent: '#ffffff' }) },
  { id: 'tala', name: 'Tala', small: true, look: look({ name: 'Tala', skin: '#c98f68', hair: '#141010', hairstyle: 'buns', outfit: 'dress', top: '#ffd166', bottom: '#ffd166', accent: '#ef5b6f' }) },
  { id: 'fadi', name: 'Uncle Fadi', grown: true, look: look({ name: 'Uncle Fadi', gender: 'boy', skin: '#e3b08e', hair: '#2a1a13', hairstyle: 'short', mustache: true, outfit: 'tee-pants', top: '#6fb8ff', bottom: '#3b2b3f' }) },
];

export const PEOPLE = Object.fromEntries([...PATIENTS, ...EXTRA].map((p) => [p.id, p]));
export const person = (id) => PEOPLE[id];

// How the hurt shows on the patient while they wait (see cues in the main game).
// steps: exam steps in the exam room; treat: the right treatment; surgery: the theatre case.
// urg: 3 now (red), 2 soon (orange), 1 can wait (green). chips: what the triage bubble shows.
export const CASES = [
  {
    id: 'fever', kind: 'exam', who: ['salma', 'lina'], urg: 2, cue: 'fever',
    chips: [['hot', 'Very hot'], ['throat', 'Sore throat']],
    line: 'I feel hot and my throat is scratchy.',
    steps: [{ type: 'thermo', temp: 38.7 }, { type: 'light', view: 'throat' }],
    treat: 'dose', med: { name: 'Fever syrup', color: '#ff8fb1', taste: 'strawberry' },
    thanks: 'I feel cool again!',
  },
  {
    id: 'cough', kind: 'exam', who: ['omar', 'sami'], urg: 2, cue: 'cough',
    chips: [['cough', 'Rumbly cough'], ['tired', 'Very tired']],
    line: 'Cough, cough! My chest is rumbly.',
    steps: [{ type: 'steth', spot: 'rumble' }, { type: 'thermo', temp: 37.4 }],
    treat: 'dose', med: { name: 'Cough syrup', color: '#c7a6ff', taste: 'grape' },
    thanks: 'My chest feels happy now!',
  },
  {
    id: 'arm', kind: 'exam', who: ['yousef', 'rana'], urg: 3, cue: 'arm',
    chips: [['bone', 'Arm hurts a lot'], ['fall', 'Fell off a slide']],
    line: 'I fell off the slide. My arm really hurts.',
    steps: [{ type: 'xray', view: 'arm' }],
    treat: 'cast', limb: 'arm',
    thanks: 'My arm feels safe now. Look at my cast!',
  },
  {
    id: 'leg', kind: 'exam', who: ['karim'], urg: 3, cue: 'leg',
    chips: [['bone', 'Leg hurts a lot'], ['fall', 'Fell from a swing']],
    line: 'I jumped off the swing. My leg hurts so much.',
    steps: [{ type: 'reflex', knee: true }, { type: 'xray', view: 'leg' }],
    treat: 'cast', limb: 'leg',
    thanks: 'Everyone can sign my cast!',
  },
  {
    id: 'knee', kind: 'exam', who: ['nour'], urg: 1, cue: 'knee',
    chips: [['scrape', 'Scraped knee'], ['bike', 'Fell off her bike']],
    line: 'I fell off my bike. My knee stings.',
    steps: [{ type: 'clean', part: 'knee' }, { type: 'reflex' }],
    treat: 'bandage', part: 'knee',
    thanks: 'It does not sting anymore!',
  },
  {
    id: 'elbow', kind: 'exam', who: ['dana'], urg: 1, cue: 'elbow',
    chips: [['scrape', 'Scraped elbow'], ['skate', 'Fell skating']],
    line: 'I fell when I was skating. My elbow stings.',
    steps: [{ type: 'clean', part: 'arm' }],
    treat: 'bandage', part: 'arm',
    thanks: 'I can skate again tomorrow!',
  },
  {
    id: 'cut', kind: 'exam', who: ['adam'], urg: 2, cue: 'cut',
    chips: [['cut', 'Cut on his arm'], ['fence', 'Climbed a fence']],
    line: 'I climbed the garden fence and cut my arm.',
    steps: [{ type: 'clean', part: 'arm' }],
    treat: 'stitches', part: 'arm',
    thanks: 'Wow, neat stitches. Thank you!',
  },
  {
    id: 'head', kind: 'exam', who: ['zaid', 'omar', 'rana'], urg: 2, cue: 'head',
    chips: [['bump', 'Bumped his head'], ['cut', 'Small cut']],
    line: 'I bumped my head on the climbing frame.',
    steps: [{ type: 'light', view: 'eyes' }],
    treat: 'stitches', part: 'head',
    thanks: 'My head feels much better!',
  },
  {
    id: 'ear', kind: 'exam', who: ['mira'], urg: 1, cue: 'ear',
    chips: [['ear', 'Ear hurts'], ['hot', 'A bit warm']],
    line: 'My ear hurts and everything sounds funny.',
    steps: [{ type: 'light', view: 'ear' }, { type: 'thermo', temp: 37.9 }],
    treat: 'dose', med: { name: 'Ear medicine', color: '#8fd3ff', taste: 'banana' },
    thanks: 'I can hear the birds again!',
  },
  {
    id: 'tummy', kind: 'exam', who: ['huda'], urg: 1, cue: 'tummy',
    chips: [['tummy', 'Tummy ache'], ['cake', 'Ate a lot of cake']],
    line: 'My tummy hurts. I ate too much cake.',
    steps: [{ type: 'steth', spot: 'gurgle' }],
    treat: 'dose', med: { name: 'Tummy medicine', color: '#7fd8bf', taste: 'mint' },
    thanks: 'My tummy feels calm now!',
  },
  {
    id: 'vaccine', kind: 'exam', who: ['leo', 'tala'], urg: 1, cue: 'nervous', nervous: true,
    chips: [['shot', 'Vaccine day'], ['scared', 'A bit scared']],
    line: 'Is it going to hurt? I am a bit scared.',
    steps: [{ type: 'steth', spot: 'heart' }],
    treat: 'vaccine',
    thanks: 'That was nothing! I was so brave!',
  },
  {
    id: 'checkup', kind: 'exam', who: ['salma', 'nour', 'karim'], urg: 1, cue: 'none',
    chips: [['check', 'School check-up'], ['shot', 'Needs a booster']],
    line: 'Hello, Dr. Roji! It is my school check-up.',
    steps: [{ type: 'steth', spot: 'heart' }, { type: 'reflex' }],
    treat: 'vaccine',
    thanks: 'All done! Can I have a sticker?',
  },
  {
    id: 'wheeze', kind: 'exam', who: ['fadi'], urg: 2, cue: 'cough',
    chips: [['cough', 'Wheezy chest'], ['hot', 'Feels warm']],
    line: 'My chest wheezes when I climb the stairs.',
    steps: [{ type: 'thermo', temp: 38.1 }, { type: 'steth', spot: 'rumble' }],
    treat: 'dose', med: { name: 'Chest syrup', color: '#ffd166', taste: 'honey' },
    thanks: 'I can breathe easy again. Thank you, doctor!',
  },
  // Surgeries
  {
    id: 'appendix', kind: 'surgery', who: ['huda', 'mira', 'omar'], urg: 3, cue: 'tummy',
    chips: [['tummy', 'Tummy hurts a lot'], ['hot', 'Very hot']],
    line: 'Ow! The right side of my tummy hurts so much.',
    steps: [{ type: 'thermo', temp: 38.9 }, { type: 'steth', spot: 'gurgle' }],
    treat: 'surgery', item: 'appendix', what: 'a poorly appendix',
    thanks: 'My tummy does not hurt anymore!',
  },
  {
    id: 'toy', kind: 'surgery', who: ['leo', 'tala'], urg: 3, cue: 'squeak', emergency: true,
    chips: [['toy', 'Swallowed a toy'], ['squeak', 'Tummy squeaks']],
    line: 'I swallowed my toy duck! Squeak!',
    steps: [{ type: 'xray', view: 'toy' }],
    treat: 'surgery', item: 'duck', what: 'the toy duck',
    thanks: 'My duck! Can I keep him?',
  },
  {
    id: 'splinter', kind: 'surgery', who: ['adam', 'karim'], urg: 2, cue: 'leg',
    chips: [['splinter', 'Huge splinter'], ['tree', 'From the treehouse']],
    line: 'A huge splinter went deep in my leg.',
    steps: [{ type: 'xray', view: 'splinter' }],
    treat: 'surgery', item: 'splinter', what: 'the big splinter',
    thanks: 'It is out! I can climb again!',
  },
  {
    id: 'stones', kind: 'surgery', who: ['sami', 'fadi'], urg: 2, cue: 'tummy',
    chips: [['tummy', 'Sharp tummy pain'], ['stone', 'Tummy stones']],
    line: 'Little stones in my tummy. Ouch, ouch!',
    steps: [{ type: 'xray', view: 'stones' }],
    treat: 'surgery', item: 'stones', what: 'three tummy stones',
    thanks: 'No more stones. I feel young again!',
  },
  {
    id: 'whistle', kind: 'surgery', who: ['zaid', 'dana'], urg: 3, cue: 'whistle', unlock: 'whistle', emergency: true,
    chips: [['toy', 'Swallowed a whistle'], ['squeak', 'Whistles when breathing']],
    line: 'I swallowed my whistle! Wheee-oo!',
    steps: [{ type: 'steth', spot: 'whistle' }],
    treat: 'surgery', item: 'whistle', what: 'the little whistle',
    thanks: 'My whistle! I will keep it in my pocket.',
  },
];
export const caseById = (id) => CASES.find((c) => c.id === id);

// The treatments a doctor can pick from (and the tool Nurse Homama hands over for each).
export const TREATS = {
  cast: { name: 'Plaster cast', sub: 'Holds a broken bone still' },
  stitches: { name: 'Stitches', sub: 'Closes a cut neatly' },
  bandage: { name: 'Plaster', sub: 'Covers a scrape' },
  dose: { name: 'Medicine', sub: 'The right dose' },
  vaccine: { name: 'Vaccine', sub: 'Keeps germs away' },
  surgery: { name: 'Surgery', sub: 'To the theatre' },
};

// What Nurse Homama hands Dr. Roji for each doctor step (the right one and some others).
export const HANDOFF = {
  steth: 'stethoscope', light: 'light', reflex: 'hammer', xray: 'xray', cast: 'cast', stitches: 'needle', shot: 'syringe', incise: 'scalpel', remove: 'tweezers', close: 'needle',
};
export const TOOL_NAMES = { stethoscope: 'Stethoscope', light: 'Little light', hammer: 'Reflex hammer', xray: 'X-ray film', cast: 'Plaster roll', needle: 'Stitch needle', syringe: 'Vaccine', scalpel: 'Scalpel', tweezers: 'Tweezers', thermometer: 'Thermometer', bandage: 'Plaster' };

// Unlocks, by the stars collected in all shifts.
export const UNLOCKS = [
  { id: 'gold', at: 8, name: 'Golden tweezers', text: 'Shiny golden tweezers for the theatre.' },
  { id: 'whistle', at: 15, name: 'A new surgery: the whistle', text: 'Someone swallowed a whistle. Wheee-oo!' },
  { id: 'rainbow', at: 24, name: 'Rainbow casts', text: 'Plaster casts in rainbow stripes.' },
  { id: 'heartlamp', at: 35, name: 'Heart theatre lamp', text: 'A heart-shaped lamp over the operating table.' },
];
export const unlocked = (stars) => new Set(UNLOCKS.filter((u) => stars >= u.at).map((u) => u.id));

const shuffle = (a, r) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Starting case for a ward patient sent from the hospital rooms.
const WARD_CASE = { lina: 'fever', yousef: 'arm', sami: 'cough' };

// One shift: { n, cases: [{ c, who, emergency, pair, nervous }], twists: [], room }.
// n: the shift number (1, 2, ...). r: random 0..1. first: a patient id to treat first.
export function makeShift(n, r, { first = null, have = new Set() } = {}) {
  const count = n <= 1 ? 3 : n <= 3 ? 4 : 5;
  const surgeries = n <= 2 ? 1 : 2;
  const pool = CASES.filter((c) => !c.unlock || have.has(c.unlock));
  const exams = shuffle(pool.filter((c) => c.kind === 'exam'), r);
  const ops = shuffle(pool.filter((c) => c.kind === 'surgery'), r);
  // Each case needs a patient nobody else is this shift; treatments vary where there is a choice
  const used = new Set();
  const firstWho = first && WARD_CASE[first] ? first : null;
  const forced = firstWho ? CASES.find((c) => c.id === WARD_CASE[first]) : null;
  if (firstWho) used.add(firstWho);
  const take = (list, n, varied) => {
    const out = [];
    for (const pass of varied ? [0, 1] : [1]) {
      for (const c of list) {
        if (out.length >= n) break;
        if (out.some((o) => o.c === c) || c === forced) continue;
        if (pass === 0 && out.some((o) => o.c.treat === c.treat)) continue;
        const free = c.who.filter((w) => !used.has(w));
        if (!free.length) continue;
        const who = free[Math.floor(r() * free.length)];
        used.add(who);
        out.push({ c, who });
      }
    }
    return out;
  };
  const nOps = forced?.kind === 'surgery' ? surgeries - 1 : surgeries;
  const nEx = count - surgeries - (forced && forced.kind === 'exam' ? 1 : 0);
  let list = [...take(exams, nEx, true), ...take(ops, nOps, false)];
  shuffle(list, r);
  if (forced) list = [{ c: forced, who: firstWho }, ...list];
  const cases = list.map(({ c, who }) => ({ c, who, emergency: false, pair: false, nervous: !!c.nervous }));
  // Twists from the second shift on
  const twists = [];
  if (n >= 2) {
    const kinds = shuffle(['siren', 'pair', 'nervous'], r).slice(0, n >= 4 ? 2 : 1);
    for (const kd of kinds) {
      if (kd === 'siren') {
        const op = cases.find((x, i) => x.c.kind === 'surgery' && i > 0);
        if (op) {
          op.emergency = true;
          twists.push('siren');
        }
      } else if (kd === 'pair') {
        // Two exam patients who come in together: put them next to each other in the queue
        const ex = cases.map((x, j) => (j > 0 && x.c.kind === 'exam' && !x.emergency ? j : -1)).filter((j) => j > 0);
        if (ex.length >= 2) {
          const [i, j] = ex;
          const [b] = cases.splice(j, 1);
          cases.splice(i + 1, 0, b);
          cases[i].pair = true;
          b.pairWith = true;
          twists.push('pair');
        }
      } else if (kd === 'nervous') {
        const x = cases.find((y) => y.c.kind === 'exam' && !y.nervous && person(y.who) && !person(y.who).grown);
        if (x) {
          x.nervous = true;
          twists.push('nervous');
        }
      }
    }
  }
  return { n, cases, twists, room: Math.min(4, 1 + n) };
}

// Stars for one case from the average step quality (0..1).
export const caseStars = (q) => (q >= 0.85 ? 3 : q >= 0.6 ? 2 : 1);
export const shiftStars = (avg) => (avg >= 2.6 ? 3 : avg >= 1.8 ? 2 : 1);
