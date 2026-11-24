// Little tunes for the rides, synthesised with the game's Sound (Web Audio): a carousel waltz,
// a parade march and a gentle wheel melody. A Tune schedules its notes a moment ahead of time,
// so it keeps time even when frames are slow. Notes are MIDI numbers; 0 is a rest.

const F = (n) => 440 * Math.pow(2, (n - 69) / 12);

export const TUNES = {
  // An original waltz in 3/4: melody over oom-pah-pah
  waltz: {
    bpm: 168,
    melody: [72, 0, 76, 79, 0, 76, 74, 0, 77, 81, 0, 77, 76, 0, 79, 84, 0, 79, 77, 76, 74, 72, 0, 0, 72, 0, 76, 79, 0, 76, 74, 0, 77, 81, 0, 79, 77, 76, 74, 76, 74, 71, 72, 0, 0, 0, 0, 0],
    bass: [48, 64, 64, 50, 65, 65, 53, 65, 65, 48, 64, 64, 48, 64, 64, 53, 65, 65, 55, 67, 67, 48, 64, 64, 48, 64, 64, 50, 65, 65, 53, 65, 65, 48, 64, 64, 55, 67, 67, 55, 67, 67, 48, 64, 64, 48, 0, 0],
    lead: 'square',
    gain: 0.035,
  },
  // A bright march for the parade
  march: {
    bpm: 220,
    melody: [67, 0, 72, 0, 76, 0, 79, 79, 77, 0, 76, 0, 74, 0, 72, 0, 69, 0, 72, 0, 77, 0, 81, 81, 79, 0, 77, 0, 76, 0, 74, 0, 67, 0, 72, 0, 76, 0, 79, 79, 81, 0, 79, 0, 77, 76, 74, 0, 72, 0, 76, 0, 74, 0, 71, 0, 72, 0, 0, 0, 0, 0, 0, 0],
    bass: [48, 0, 55, 0, 48, 0, 55, 0, 53, 0, 60, 0, 55, 0, 62, 0, 53, 0, 60, 0, 53, 0, 60, 0, 48, 0, 55, 0, 55, 0, 59, 0, 48, 0, 55, 0, 48, 0, 55, 0, 53, 0, 60, 0, 55, 0, 62, 0, 48, 0, 55, 0, 55, 0, 59, 0, 48, 0, 55, 0, 48, 0, 0, 0],
    lead: 'triangle',
    gain: 0.05,
  },
  // A slow music box melody for the big wheel
  wheel: {
    bpm: 112,
    melody: [76, 79, 84, 83, 79, 76, 77, 81, 79, 76, 74, 72, 74, 76, 79, 77, 76, 74, 72, 0],
    bass: [48, 0, 55, 0, 53, 0, 57, 0, 48, 0, 55, 0, 50, 0, 55, 0, 48, 0, 48, 0],
    lead: 'sine',
    gain: 0.06,
  },
};

export class Tune {
  // sound: the game's Sound; spec: a TUNES entry; loop: repeat until stop()
  constructor(sound, spec, { loop = true, volume = 1 } = {}) {
    this.sound = sound;
    this.spec = spec;
    this.loop = loop;
    this.volume = volume;
    this.i = 0;
    this.next = null;
    this.on = true;
  }

  stop() {
    this.on = false;
  }

  update() {
    const s = this.sound;
    if (!this.on || !s?.ctx || s.muted) return;
    const ctx = s.ctx;
    const beat = 60 / this.spec.bpm;
    if (this.next === null || this.next < ctx.currentTime - 0.5) this.next = ctx.currentTime + 0.05;
    const { melody, bass, lead, gain } = this.spec;
    const v = gain * this.volume;
    while (this.next < ctx.currentTime + 0.4) {
      const m = melody[this.i % melody.length];
      const b = bass[this.i % bass.length];
      if (m) {
        s.tone(F(m), this.next, beat * 1.6, { type: lead, gain: v, attack: 0.008 });
        s.tone(F(m + 12), this.next, beat * 0.8, { type: 'sine', gain: v * 0.35, attack: 0.004 });
      }
      if (b) s.tone(F(b), this.next, beat * 0.9, { type: 'triangle', gain: v * 0.8, attack: 0.01 });
      this.next += beat;
      this.i++;
      if (!this.loop && this.i >= melody.length) {
        this.on = false;
        break;
      }
    }
  }
}

// One-off sounds for the park
export const sfx = {
  // A soft camera shutter
  shutter(s) {
    if (!s?.ctx) return;
    const t = s.ctx.currentTime;
    s.tone(2400, t, 0.05, { type: 'square', gain: 0.025 });
    s.tone(1600, t + 0.06, 0.06, { type: 'square', gain: 0.02 });
  },
  // A bumper car bonk
  bonk(s, k = 1) {
    if (!s?.ctx) return;
    const t = s.ctx.currentTime;
    s.tone(140, t, 0.18, { type: 'sine', gain: 0.12 * k, slideTo: 70 });
    s.tone(420, t, 0.08, { type: 'triangle', gain: 0.04 * k, slideTo: 260 });
  },
  // A giggle: quick bright bounces
  giggle(s, base = 880) {
    if (!s?.ctx) return;
    const t = s.ctx.currentTime;
    for (let i = 0; i < 5; i++) s.tone(base * (1 + (i % 2) * 0.12), t + i * 0.09, 0.08, { type: 'sine', gain: 0.03 });
  },
  // A dizzy wobble going down
  dizzy(s) {
    if (!s?.ctx) return;
    const t = s.ctx.currentTime;
    s.tone(660, t, 0.9, { type: 'sine', gain: 0.04, slideTo: 330 });
    s.tone(670, t + 0.05, 0.9, { type: 'sine', gain: 0.03, slideTo: 300 });
  },
  // A sparkly chime
  chime(s) {
    if (!s?.ctx) return;
    const t = s.ctx.currentTime;
    [1568, 1976, 2349, 3136].forEach((f, i) => s.tone(f, t + i * 0.07, 0.6, { type: 'sine', gain: 0.025 }));
  },
  // Firework whistle and boom; k: 0..1 by distance
  whistle(s, k = 1) {
    if (!s?.ctx || k < 0.05) return;
    const t = s.ctx.currentTime;
    s.tone(900, t, 1.0, { type: 'sine', gain: 0.012 * k, slideTo: 2200 });
  },
  boom(s, k = 1) {
    if (!s?.ctx || k < 0.05) return;
    const t = s.ctx.currentTime;
    s.tone(90, t, 0.9, { type: 'sine', gain: 0.16 * k, slideTo: 38 });
    s.tone(180, t, 0.25, { type: 'triangle', gain: 0.05 * k, slideTo: 60 });
    for (let i = 0; i < 6; i++) s.tone(2000 + Math.random() * 2400, t + 0.15 + i * 0.07 + Math.random() * 0.05, 0.05, { type: 'square', gain: 0.006 * k });
  },
};
