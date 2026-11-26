// The parade band, synthesised with Web Audio through the game's Sound: the melody (your part, on a
// bus that drops out while you miss), the partner's part in the duet, bass, chords, a music box
// arpeggio and drums made from the shared noise buffer. Events are scheduled a moment ahead from the
// song clock, so they stay in time when frames are slow. Also the hit, miss and crowd sounds.

const F = (n) => 440 * Math.pow(2, (n - 69) / 12);
const LOOK = 0.3;

// Instruments for the two dancers: Roji a bright music box flute, Homama a warm clarinet
const VOICES = {
  roji: [
    { type: 'triangle', gain: 0.075, attack: 0.006 },
    { type: 'sine', gain: 0.03, attack: 0.004, oct: 12 },
  ],
  homama: [
    { type: 'square', gain: 0.022, attack: 0.012 },
    { type: 'sine', gain: 0.06, attack: 0.01 },
  ],
};

export class Band {
  constructor(sound, { me, partner }) {
    this.sound = sound;
    this.me = me;
    this.partner = partner;
    this.events = [];
    this.i = 0;
    this.on = !!sound?.ctx;
    if (!this.on) return;
    const ctx = sound.ctx;
    this.ctx = ctx;
    const dest = sound.sfx || sound.master || ctx.destination;
    this.out = ctx.createGain();
    this.out.gain.value = 1;
    this.out.connect(dest);
    this.lead = ctx.createGain();
    this.lead.gain.value = 1;
    this.lead.connect(this.out);
    this.band = ctx.createGain();
    this.band.gain.value = 0.9;
    this.band.connect(this.out);
    this.fxBus = ctx.createGain();
    this.fxBus.gain.value = 1;
    this.fxBus.connect(this.out);
    this.latency = Math.min(0.12, Math.max(0, ctx.outputLatency || ctx.baseLatency || 0));
  }

  load(events) {
    this.events = events;
    this.i = 0;
  }

  // Schedule everything due before songT + LOOK (song seconds); speed > 1 in the test hook
  update(songT, speed = 1) {
    if (!this.on || this.sound.muted) {
      while (this.i < this.events.length && this.events[this.i].t < songT) this.i++;
      return;
    }
    const now = this.ctx.currentTime;
    while (this.i < this.events.length && this.events[this.i].t < songT + LOOK * speed) {
      const e = this.events[this.i++];
      const at = now + Math.max(0, (e.t - songT) / speed - this.latency);
      if (e.t < songT - 0.1) continue; // long gone (a hitch): skip it
      this.play(e, at, speed);
    }
  }

  tone(f, at, dur, o, bus) {
    this.sound.tone(f, at, dur, { ...o, dest: bus });
  }

  voice(who, m, at, dur, bus, k = 1) {
    for (const v of VOICES[who] || VOICES.roji) this.tone(F(m + (v.oct || 0)), at, Math.max(0.16, Math.min(1.3, dur * 0.95)), { type: v.type, gain: v.gain * k, attack: v.attack }, bus);
  }

  noise(at, { type = 'highpass', f = 7000, q = 0.7, gain = 0.05, dur = 0.05, bus = this.band } = {}) {
    const ctx = this.ctx;
    const buf = this.sound.noise;
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const fl = ctx.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = f;
    fl.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(fl).connect(g).connect(bus);
    // the shared buffer is half a second long: long hits (a cymbal) loop it
    src.loop = dur > 0.3;
    src.start(at, Math.random() * (src.loop ? 0.4 : Math.max(0, 0.45 - dur)));
    src.stop(at + dur + 0.05);
  }

  play(e, at, speed) {
    const b = this.band;
    const d = (x) => x / speed;
    switch (e.kind) {
      case 'mel':
        this.voice(this.me, e.m, at, d(e.dur), this.lead);
        break;
      case 'pmel':
        this.voice(this.partner, e.m, at, d(e.dur), this.band, 1.05);
        break;
      case 'bass':
        this.tone(F(e.m), at, d(e.dur), { type: 'triangle', gain: 0.11, attack: 0.008 }, b);
        this.tone(F(e.m + 12), at, d(e.dur) * 0.6, { type: 'sine', gain: 0.03, attack: 0.008 }, b);
        break;
      case 'chord':
        for (const m of e.ms) this.tone(F(m), at, d(e.dur), { type: 'sine', gain: 0.022, attack: 0.006 }, b);
        break;
      case 'pad':
        for (const m of e.ms) this.tone(F(m), at, d(e.dur), { type: 'triangle', gain: 0.016, attack: 0.08 }, b);
        break;
      case 'arp':
        this.tone(F(e.m), at, d(e.dur), { type: 'sine', gain: 0.014, attack: 0.003 }, b);
        break;
      case 'kick':
        this.tone(150, at, 0.2, { type: 'sine', gain: 0.2, slideTo: 42, attack: 0.002 }, b);
        break;
      case 'snare':
        this.noise(at, { type: 'bandpass', f: 1900, q: 0.8, gain: 0.09, dur: 0.14 });
        this.tone(190, at, 0.08, { type: 'triangle', gain: 0.05, slideTo: 120 }, b);
        break;
      case 'clap':
        for (let i = 0; i < 3; i++) this.noise(at + i * 0.012, { type: 'bandpass', f: 1200, q: 1.2, gain: 0.05, dur: 0.06 });
        break;
      case 'hat':
        this.noise(at, { f: 7500, gain: e.open ? 0.035 : 0.026, dur: e.open ? 0.12 : 0.04 });
        break;
      case 'crash':
        this.noise(at, { f: 5200, gain: 0.05, dur: 1.1 });
        break;
      case 'tom':
        this.tone(F(e.m), at, 0.22, { type: 'sine', gain: 0.13, slideTo: F(e.m - 7), attack: 0.002 }, b);
        break;
      case 'click':
        this.tone(e.accent ? 1760 : 1320, at, 0.05, { type: 'square', gain: 0.025 }, b);
        this.noise(at, { f: 4000, gain: 0.03, dur: 0.03 });
        break;
    }
  }

  // Your part drops out while you miss and comes back on the next hit
  setLead(on) {
    if (!this.on) return;
    this.lead.gain.setTargetAtTime(on ? 1 : 0.18, this.ctx.currentTime, on ? 0.02 : 0.06);
  }

  // A sparkle on each hit: a bright little note in the lane's pitch
  hit(lane, grade) {
    if (!this.on || this.sound.muted) return;
    const at = this.ctx.currentTime;
    const m = [84, 86, 88, 91][lane] || 88;
    if (grade === 'perfect') this.tone(F(m + 12), at, 0.12, { type: 'sine', gain: 0.018 }, this.fxBus);
    this.noise(at, { f: 9000, gain: grade === 'perfect' ? 0.03 : 0.02, dur: 0.06, bus: this.fxBus });
  }

  miss() {
    if (!this.on || this.sound.muted) return;
    const at = this.ctx.currentTime;
    this.tone(220, at, 0.22, { type: 'triangle', gain: 0.05, slideTo: 150 }, this.fxBus);
  }

  // The crowd: a cheer (noise and a few "woo"s), an aww, and clapping along
  cheer(k = 1) {
    if (!this.on || this.sound.muted) return;
    const at = this.ctx.currentTime;
    this.noise(at, { type: 'bandpass', f: 1100, q: 0.6, gain: 0.05 * k, dur: 0.9, bus: this.fxBus });
    for (let i = 0; i < 4; i++) {
      const f = 520 + Math.random() * 380;
      this.tone(f, at + i * 0.07 + Math.random() * 0.05, 0.45, { type: 'sine', gain: 0.012 * k, slideTo: f * 1.5, attack: 0.04 }, this.fxBus);
    }
  }

  aww() {
    if (!this.on || this.sound.muted) return;
    const at = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) this.tone(560 + i * 70, at + i * 0.04, 0.7, { type: 'sine', gain: 0.012, slideTo: 380 + i * 50, attack: 0.08 }, this.fxBus);
  }

  claps(songT, beats, speed = 1) {
    if (!this.on || this.sound.muted) return;
    // clapping along on beats two and four, scheduled from the beat list
    const now = this.ctx.currentTime;
    for (const b of beats) {
      const at = now + (b - songT) / speed - this.latency;
      if (at < now) continue;
      for (let i = 0; i < 4; i++) this.noise(at + Math.random() * 0.03, { type: 'bandpass', f: 1300 + Math.random() * 600, q: 1, gain: 0.018, dur: 0.05, bus: this.fxBus });
    }
  }

  // Fade out and let go of the buses
  stop() {
    if (!this.on) return;
    this.on = false;
    const now = this.ctx.currentTime;
    for (const g of [this.out]) {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0, now + 0.15);
    }
    const out = this.out;
    setTimeout(() => {
      try {
        out.disconnect();
      } catch {
        /* already gone */
      }
    }, 2500);
  }
}
