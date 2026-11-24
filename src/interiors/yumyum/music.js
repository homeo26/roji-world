// Music for Roji's YumYum, all Web Audio tones: three oud tunes with a darbuka, and the staff's birthday song.
// Tunes.update(sound) schedules a little ahead every frame and returns how many notes started (for the visuals).

const N = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Oud tunes: melody in eighth notes (MIDI, null = rest), a drone note and the darbuka pattern over eight steps
// (D = dum, T = tek, . = rest). dance: the move Roji and Homama dance to it.
export const OUD_SONGS = [
  {
    name: 'Moonlight Hijaz',
    bpm: 100,
    drone: 50,
    drum: 'DT.TD.T.',
    dance: 'dance',
    melody: [74, null, 72, 70, 69, null, 70, 69, 67, 66, 67, null, 69, null, null, null, 62, 63, 66, 67, 69, null, 70, 69, 67, 66, 63, 66, 62, null, null, null],
  },
  {
    name: 'Rose Garden',
    bpm: 108,
    drone: 55,
    drum: 'D.T.D.TT',
    dance: 'slow',
    melody: [79, 78, 76, null, 74, null, 76, 74, 72, 71, 72, null, 74, null, null, null, 71, 72, 74, 76, 74, 72, 71, 69, 67, null, 71, null, 67, null, null, null],
  },
  {
    name: 'Dabke Time',
    bpm: 132,
    drone: 50,
    drum: 'D.TTD.T.',
    dance: 'dabke',
    melody: [62, 62, 65, 67, 69, null, 69, 67, 69, 70, 69, 67, 65, null, 62, null, 62, 62, 65, 67, 69, null, 72, 70, 69, 67, 65, 64, 62, null, null, null],
  },
];

// Happy birthday in F, as [midi, beats] in 3/4; the name goes in the third line.
const BIRTHDAY = [
  [[60, 0.75], [60, 0.25], [62, 1], [60, 1], [65, 1], [64, 2]],
  [[60, 0.75], [60, 0.25], [62, 1], [60, 1], [67, 1], [65, 2]],
  [[60, 0.75], [60, 0.25], [72, 1], [69, 1], [65, 1], [64, 1], [62, 2]],
  [[70, 0.75], [70, 0.25], [69, 1], [65, 1], [67, 1], [65, 2]],
];
const BIRTHDAY_CHORDS = [[53, 57, 60], [48, 52, 55], [53, 57, 60], [46, 50, 53]];

function pluck(s, f, t, dur, gain) {
  s.tone(f, t, dur, { type: 'triangle', gain: gain * 0.9, attack: 0.004 });
  s.tone(f * 2, t, dur * 0.45, { type: 'sawtooth', gain: gain * 0.12, attack: 0.002 });
  s.tone(f * 3.01, t, dur * 0.2, { type: 'sine', gain: gain * 0.18, attack: 0.002 });
}

export class Tunes {
  constructor() {
    this.cur = null;
  }

  get playing() {
    return !!this.cur;
  }

  // Loop an oud tune. gain scales everything (a quiet tune on its own in the evening, a full one to dance to).
  oud(song, { gain = 1 } = {}) {
    this.cur = { kind: 'oud', song, gain, next: 0, i: 0 };
  }

  // The staff sing happy birthday once; onLine(i) fires as each line starts, onDone when it ends.
  birthday({ onLine, onDone } = {}) {
    const notes = [];
    let beat = 0;
    BIRTHDAY.forEach((line, li) => {
      line.forEach(([n, b], i) => {
        notes.push({ n, at: beat, b, line: i === 0 ? li : -1, chord: i === 0 ? BIRTHDAY_CHORDS[li] : null });
        beat += b;
      });
    });
    this.cur = { kind: 'birthday', notes, i: 0, spb: 60 / 112, onLine, onDone, end: beat };
  }

  stop() {
    this.cur = null;
  }

  // dt: game seconds since the last call (the birthday song runs on game time, so it ends even without sound)
  update(sound, dt = 0) {
    const c = this.cur;
    if (!c) return 0;
    const ac = sound?.ctx;
    const audio = !!ac && !sound.muted;
    let started = 0;
    if (c.kind === 'oud') {
      if (!audio) return 0;
      const s = c.song;
      const step = 60 / s.bpm / 2;
      if (c.next < ac.currentTime) c.next = ac.currentTime + 0.06;
      const g = c.gain;
      while (c.next < ac.currentTime + 0.25) {
        const k = c.i % s.melody.length;
        const m = s.melody[k];
        if (m) {
          pluck(sound, N(m), c.next, step * 2.2, 0.07 * g);
          started++;
        }
        if (k % 8 === 0) sound.tone(N(s.drone), c.next, step * 7, { type: 'triangle', gain: 0.035 * g, attack: 0.05 });
        const d = s.drum[k % 8];
        if (d === 'D') sound.tone(120, c.next, 0.2, { type: 'sine', gain: 0.16 * g, slideTo: 58 });
        if (d === 'T') sound.tone(1650, c.next, 0.035, { type: 'square', gain: 0.012 * g });
        c.next += step;
        c.i++;
      }
      return started;
    }
    // Birthday: one pass on game time; notes are scheduled a little ahead on the audio clock
    c.time = (c.time ?? -0.1) + dt;
    while (c.i < c.notes.length && c.notes[c.i].at * c.spb < c.time + 0.2) {
      const q = c.notes[c.i];
      if (audio) {
        const t = ac.currentTime + Math.max(0, q.at * c.spb - c.time);
        sound.tone(N(q.n), t, q.b * c.spb * 0.95, { type: 'triangle', gain: 0.09, attack: 0.02 });
        sound.tone(N(q.n + 12), t, q.b * c.spb * 0.7, { type: 'sine', gain: 0.03, attack: 0.02 });
        if (q.chord) for (const n of q.chord) sound.tone(N(n), t, c.spb * 2.6, { type: 'triangle', gain: 0.025, attack: 0.04 });
      }
      if (q.line >= 0) (c.lines ||= []).push({ at: q.at * c.spb, li: q.line });
      c.i++;
      started++;
    }
    while (c.lines?.length && c.lines[0].at <= c.time) c.onLine?.(c.lines.shift().li);
    if (c.i >= c.notes.length && c.time > c.end * c.spb + 0.3) {
      this.cur = null;
      c.onDone?.();
    }
    return started;
  }
}
