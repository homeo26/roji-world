// The three parade songs (original melodies) and the chart builder.
// A bar is "chords | eight steps": each step is an eighth note, a note name (C5, F#4), "." for a rest
// or "-" to hold the note before. Two chords in a bar split it in half. The chart takes its arrows
// from the melody: the lowest notes of a phrase go to the left lane, the highest to the right.

const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = (s) => {
  const m = /^([A-G])(#|b)?(\d)$/.exec(s);
  if (!m) throw new Error(`bad note ${s}`);
  return 12 * (+m[3] + 1) + NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
};
// Chord roots in the bass octave and their tones
const CHORDS = {
  C: [48, [0, 4, 7]],
  Dm: [50, [0, 3, 7]],
  D: [50, [0, 4, 7]],
  Em: [52, [0, 3, 7]],
  F: [53, [0, 4, 7]],
  G: [55, [0, 4, 7]],
  Am: [57, [0, 3, 7]],
  Bm: [59, [0, 3, 7]],
};

const bar = (s) => {
  const [c, m] = s.split('|');
  const steps = m.trim().split(/\s+/).map((x) => (x === '.' ? 0 : x === '-' ? -1 : midi(x)));
  if (steps.length !== 8) throw new Error(`bar needs 8 steps: ${s}`);
  return { chords: c.trim().split(/\s+/), steps };
};

export const SONGS = [
  {
    id: 'sunny',
    name: 'Sunny Parade',
    sub: 'A happy march, a duet and heart notes',
    time: 'day',
    approach: 1.75,
    lead: 0.95,
    sections: [
      { kind: 'intro', label: 'Sunny Parade', bpm: 100, level: 0, drums: 'soft', arp: true, bars: ['C | C5 . E5 . G5 - E5 .', 'G | D5 . B4 . G4 - - .', 'F | F5 . A5 . C6 - A5 .', 'G | G5 . E5 . D5 - - .'] },
      {
        kind: 'verse',
        label: 'Dance!',
        bpm: 100,
        level: 1,
        drums: 'march',
        bars: ['C | E5 E5 G5 - E5 - C5 -', 'G | D5 D5 E5 D5 B4 - G4 -', 'F | F5 F5 A5 - F5 - D5 -', 'G | E5 D5 C5 D5 G5 - - .', 'C | E5 E5 G5 - C6 - A5 G5', 'Am | A5 - G5 E5 C5 - E5 -', 'F G | F5 G5 A5 F5 G5 F5 D5 B4', 'C | C5 - - - . . G4 B4'],
      },
      { kind: 'duet', label: 'Duet!', bpm: 100, level: 1, drums: 'duet', bars: ['Am | A5 . G5 . E5 . G5 .', 'F | F5 . E5 . D5 - . .', 'C | C5 . E5 G5 C6 . G5 .', 'G | B5 . A5 . G5 - . .'] },
      { kind: 'together', label: 'Together!', bpm: 100, level: 1, drums: 'march', doubles: true, bars: ['F | F5 . A5 . G5 . E5 .', 'G | D5 . G5 . B5 - - .'] },
      {
        kind: 'chorus',
        label: 'Mimi and Bobo join in!',
        bpm: 100,
        level: 1,
        drums: 'pop',
        specials: true,
        arp: true,
        bars: ['C | G5 G5 E5 G5 C6 - G5 -', 'Am | A5 A5 G5 E5 C5 - E5 -', 'F | F5 F5 A5 F5 E5 - D5 -', 'G | D5 E5 F5 G5 D5 - B4 -', 'C | G5 G5 E5 G5 C6 - D6 -', 'Am | C6 B5 A5 G5 E5 - G5 -', 'F G | F5 . A5 . G5 . D5 .', 'C | C5 - E5 - G5 - C6 -'],
      },
      { kind: 'finale', label: 'Finale!', bpm: 100, level: 2, drums: 'finale', bars: ['F | F5 A5 C6 A5 F5 A5 C6 A5', 'G | G5 B5 D6 B5 G5 B5 D6 B5', 'C | C6 G5 E5 G5 C6 G5 E5 G5', 'G C | B5 - D6 - C6 - - -'] },
    ],
  },
  {
    id: 'candy',
    name: 'Candy Twirl',
    sub: 'Hold the long notes, two arrows at once',
    time: 'sunset',
    approach: 1.5,
    lead: 1,
    sections: [
      { kind: 'intro', label: 'Candy Twirl', bpm: 116, level: 1, drums: 'soft', arp: true, bars: ['G | G5 . D5 . B4 . D5 .', 'Em | E5 . B4 . G4 . B4 .', 'C | C5 . E5 . G5 . E5 .', 'D | D5 - - - F#5 - - -'] },
      {
        kind: 'verse',
        label: 'Hold the long notes!',
        bpm: 116,
        level: 2,
        drums: 'pop',
        holds: true,
        bars: ['G | B4 C5 D5 - - - G5 F#5', 'Em | E5 - - - B4 . D5 .', 'C | C5 D5 E5 - - - A5 G5', 'D | F#5 - - - D5 . . .', 'G | B4 C5 D5 - G5 - B5 -', 'Em | A5 - G5 - E5 - D5 -', 'C D | C5 E5 G5 E5 D5 F#5 A5 F#5', 'G | G5 - - - - - . .'],
      },
      { kind: 'duet', label: 'Duet!', bpm: 116, level: 2, drums: 'duet', bars: ['Am | E5 . C5 . A4 C5 E5 .', 'D | F#5 . D5 . A5 - - .', 'Bm | D5 . F#5 . A5 F#5 D5 .', 'C D | E5 . G5 . F#5 - - .'] },
      { kind: 'together', label: 'Together!', bpm: 116, level: 2, drums: 'pop', doubles: true, holds: true, bars: ['C | E5 - G5 - C6 - G5 -', 'D | F#5 - - - - - . .'] },
      {
        kind: 'chorus',
        label: 'Two at once!',
        bpm: 116,
        level: 2,
        drums: 'big',
        doubles: true,
        holds: true,
        specials: true,
        arp: true,
        bars: ['G | B5 - A5 G5 A5 - G5 E5', 'Em | G5 - E5 D5 E5 - B4 -', 'C | C5 E5 G5 A5 B5 - A5 -', 'D | F#5 - - - D5 - F#5 -', 'G | B5 - A5 G5 A5 - B5 D6', 'Em | E6 - D6 B5 G5 - E5 -', 'C D | G5 A5 B5 A5 F#5 G5 A5 F#5', 'G | G5 - - - . . . .'],
      },
      { kind: 'finale', label: 'Finale!', bpm: 120, level: 2, drums: 'finale', doubles: true, bars: ['C | C5 E5 G5 E5 C5 E5 G5 C6', 'D | D5 F#5 A5 F#5 D5 F#5 A5 D6', 'Em | E5 G5 B5 G5 E5 G5 B5 E6', 'G | D6 - B5 - G5 - - -'] },
    ],
  },
  {
    id: 'starlight',
    name: 'Starlight Finale',
    sub: 'Fast, golden notes and fireworks',
    time: 'night',
    approach: 1.3,
    lead: 1,
    sections: [
      { kind: 'intro', label: 'Starlight Finale', bpm: 132, level: 1, drums: 'soft', arp: true, bars: ['Am | A4 . C5 . E5 . C5 .', 'F | A4 . C5 . F5 . C5 .', 'C | G4 . C5 . E5 . G5 .', 'G | D5 . G5 . B5 - - -'] },
      {
        kind: 'verse',
        label: 'Dance under the stars!',
        bpm: 132,
        level: 2,
        drums: 'pop',
        holds: true,
        bars: ['Am | E5 E5 E5 D5 C5 - A4 -', 'F | C5 C5 C5 D5 E5 - - -', 'C | G5 G5 G5 F5 E5 - C5 -', 'G | D5 - B4 - G4 - - -', 'Am | E5 E5 E5 D5 C5 - E5 -', 'F | F5 - E5 - D5 - C5 -', 'C | E5 G5 C6 G5 E5 G5 C6 G5', 'G | B5 - - - G5 - - -'],
      },
      { kind: 'duet', label: 'Duet!', bpm: 132, level: 2, drums: 'duet', bars: ['F | A5 . F5 . C5 F5 A5 .', 'C | G5 . E5 . C5 - . .', 'Dm | F5 . D5 . A5 F5 D5 .', 'G | G5 . B5 . D6 - . .'] },
      { kind: 'together', label: 'Together!', bpm: 132, level: 2, drums: 'pop', doubles: true, holds: true, bars: ['F | F5 A5 C6 A5 F5 A5 C6 A5', 'G | B5 - - - - - . .'] },
      {
        kind: 'chorus',
        label: 'Golden notes!',
        bpm: 132,
        level: 2,
        drums: 'big',
        doubles: true,
        holds: true,
        specials: true,
        arp: true,
        bars: ['C | C6 - B5 C6 D6 - C6 -', 'G | B5 - G5 - D5 - G5 -', 'Am | A5 - G5 A5 C6 - A5 -', 'F | F5 - A5 - C6 - - -', 'C | C6 - B5 C6 D6 - E6 -', 'G | D6 - B5 - G5 - B5 -', 'F G | A5 C6 A5 F5 G5 B5 D6 B5', 'C | C6 - - - . . . .'],
      },
      { kind: 'finale', label: 'Grand finale!', bpm: 140, level: 2, drums: 'finale', doubles: true, specials: true, bars: ['Am | A5 C6 E6 C6 A5 C6 E6 C6', 'F | A5 C6 F6 C6 A5 C6 F6 C6', 'G | B5 D6 G6 D6 B5 D6 G6 D6', 'C | E6 - - - C6 - - -'] },
    ],
  },
];

// Drum patterns per style: steps (0..7) for kick, snare, hat, clap
const DRUMS = {
  soft: { kick: [0], snare: [], hat: [0, 2, 4, 6], clap: [] },
  march: { kick: [0, 4], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7], clap: [] },
  duet: { kick: [0, 4], snare: [6], hat: [0, 2, 4, 6], clap: [2] },
  pop: { kick: [0, 3, 4], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7], clap: [2, 6] },
  big: { kick: [0, 2, 4, 6], snare: [2, 6], hat: [1, 3, 5, 7], clap: [2, 6] },
  finale: { kick: [0, 2, 4, 6], snare: [2, 6], hat: [1, 3, 5, 7], clap: [2, 6] },
};

// Turn a song into timed notes (what you play), music events (what the band plays) and sections.
// The duet section is a call and response: the partner dances two bars, then you copy them.
export function buildChart(song) {
  const notes = [];
  const music = [];
  const sections = [];
  const beats = [];
  let t = 0;
  let first = null;
  for (const sec of song.sections) {
    const step = 30 / sec.bpm;
    if (first === null) first = step;
    // expand the bars: the duet repeats each two-bar call as the response
    const raw = sec.bars.map(bar);
    const plan = [];
    if (sec.kind === 'duet') {
      for (let i = 0; i < raw.length; i += 2) {
        plan.push({ b: raw[i], owner: 'partner' }, { b: raw[i + 1], owner: 'partner' }, { b: raw[i], owner: 'me' }, { b: raw[i + 1], owner: 'me' });
      }
    } else for (const b of raw) plan.push({ b, owner: sec.kind === 'together' ? 'both' : 'me' });
    const t0 = t;
    sections.push({ kind: sec.kind, label: sec.label, t0, t1: t0 + plan.length * 8 * step, bpm: sec.bpm, step, owners: plan.map((p) => p.owner) });
    // phrases of two bars decide the lanes
    for (let pi = 0; pi < plan.length; pi += 2) {
      const phrase = plan.slice(pi, pi + 2);
      const cands = [];
      phrase.forEach((p, bi) => {
        p.b.steps.forEach((m, si) => {
          if (m <= 0) return;
          let dur = 1;
          for (let j = si + 1; j < 8 && p.b.steps[j] === -1; j++) dur++;
          const keep = sec.level === 0 ? si % 4 === 0 : sec.level === 1 ? si % 2 === 0 : true;
          cands.push({ m, si, bi, dur, keep });
        });
      });
      const kept = cands.filter((c) => c.keep);
      const uniq = [...new Set(kept.map((c) => c.m))].sort((a, b) => a - b);
      const laneOf = (m) => (uniq.length < 2 ? 1 + (m % 2) : Math.round((uniq.indexOf(m) * 3) / (uniq.length - 1)));
      for (const c of cands) {
        const p = phrase[c.bi];
        const bt = t + (pi + c.bi) * 8 * step + c.si * step;
        // the whole melody is heard; the partner's turn plays on the partner's instrument
        music.push({ t: bt, kind: p.owner === 'partner' ? 'pmel' : 'mel', m: c.m, dur: c.dur * step });
        if (!c.keep) continue;
        const hold = sec.holds && c.dur >= 3 && p.owner !== 'partner';
        const n = { t: bt, lane: laneOf(c.m), end: hold ? bt + (c.dur - 1) * step : 0, owner: p.owner, special: false, double: false, m: c.m, sec: sections.length - 1 };
        if (sec.specials && c.si === 0 && p.owner !== 'partner') n.special = true;
        notes.push(n);
        if (sec.doubles && c.si === 0 && !hold && p.owner !== 'partner') {
          n.double = true;
          notes.push({ ...n, lane: 3 - n.lane, special: false, double: true });
        }
      }
    }
    // the band: bass, chord stabs, a music box arpeggio and drums
    plan.forEach((p, bi) => {
      const bt = t + bi * 8 * step;
      const D = DRUMS[sec.drums] || DRUMS.march;
      for (let s = 0; s < 8; s++) {
        const st = bt + s * step;
        const ch = CHORDS[p.b.chords[s < 4 || p.b.chords.length < 2 ? 0 : 1]] || CHORDS.C;
        const [root, tones] = ch;
        if (s % 2 === 0) beats.push({ t: st, bar: s === 0 });
        if (s === 0 || s === 4) music.push({ t: st, kind: 'bass', m: root - 12, dur: step * 1.8 });
        if ((s === 2 || s === 6) && sec.drums !== 'soft') music.push({ t: st, kind: 'bass', m: root - 12 + 7, dur: step * 1.2 });
        if (s === 2 || s === 6) music.push({ t: st, kind: 'chord', ms: tones.map((x) => root + 12 + x), dur: step * 1.1 });
        if (s === 0 && (sec.kind === 'intro' || sec.kind === 'duet')) music.push({ t: st, kind: 'pad', ms: tones.map((x) => root + x), dur: step * 7.5 });
        if (sec.arp) music.push({ t: st, kind: 'arp', m: root + 24 + tones[s % 3] + (s >= 6 ? 12 : 0), dur: step * 2 });
        if (D.kick.includes(s)) music.push({ t: st, kind: 'kick' });
        if (D.snare.includes(s)) music.push({ t: st, kind: 'snare' });
        if (D.hat.includes(s)) music.push({ t: st, kind: 'hat', open: sec.drums === 'big' || sec.drums === 'finale' });
        if (D.clap.includes(s)) music.push({ t: st, kind: 'clap' });
      }
      if (bi === 0 && (sec.kind === 'chorus' || sec.kind === 'finale' || sec.kind === 'together')) music.push({ t: bt, kind: 'crash' });
      if (sec.drums === 'finale' && bi % 2 === 0) music.push({ t: bt, kind: 'crash' });
      // a little drum fill at the end of each section
      if (bi === plan.length - 1 && sec.kind !== 'intro') for (let s = 4; s < 8; s++) music.push({ t: bt + s * step, kind: 'tom', m: 50 - (s - 4) * 3 });
    });
    t = sections[sections.length - 1].t1;
  }
  // the count-in: four clicks, then the last chord rings out
  const beat0 = first * 2;
  for (let i = 4; i >= 1; i--) music.push({ t: -i * beat0, kind: 'click', accent: i === 4 });
  const lastSec = song.sections[song.sections.length - 1];
  const last = CHORDS[bar(lastSec.bars[lastSec.bars.length - 1]).chords.slice(-1)[0]] || CHORDS.C;
  music.push({ t, kind: 'crash' }, { t, kind: 'kick' }, { t, kind: 'pad', ms: last[1].map((x) => last[0] + 12 + x), dur: 2.6 }, { t, kind: 'bass', m: last[0] - 12, dur: 2.4 });
  notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
  music.sort((a, b) => a.t - b.t);
  notes.forEach((n, i) => (n.id = i));
  return { notes, music, sections, beats, end: t, countIn: beat0 * 4 };
}
