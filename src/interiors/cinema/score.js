import { hash } from './films/common.js';

// Plays a film's music and sound effects with Web Audio, scheduled a little ahead of the picture.
// Everything goes through one gain node, so leaving the movie silences it at once.
// Events: [time s, voice, midi, duration s, gain] for music, [time s, 'sfx', name, gain?] for effects.

const F = (n) => 440 * Math.pow(2, (n - 69) / 12);
const AHEAD = 0.35;

export class Score {
  constructor(sound) {
    this.sound = sound;
    this.bus = null;
    this.events = [];
    this.i = 0;
    this.last = -1;
  }

  start(film, info = {}) {
    this.stop();
    const fx = [...(film.sfx || []), ...(film.extraSfx?.(info) || [])];
    this.events = [...(film.music || []), ...fx.map(([t, name, g]) => [t, 'sfx', name, 0, g ?? 1])].sort((a, b) => a[0] - b[0]);
    this.i = 0;
    this.last = -1;
    const s = this.sound;
    if (!s?.ctx || !s.sfx) return;
    const ctx = s.ctx;
    this.bus = ctx.createGain();
    this.bus.gain.value = 1.0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    this.bus.connect(comp).connect(s.sfx);
    this.out = comp;
    // A soft room echo for the music
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.22;
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.27;
    const fb = ctx.createGain();
    fb.gain.value = 0.28;
    this.wet.connect(delay);
    delay.connect(fb).connect(delay);
    delay.connect(this.bus);
    this.nodes = [delay, fb, comp];
  }

  // t: film time now. quiet: advance without playing (seeking or a sped-up debug run)
  update(t, quiet = false) {
    if (t < this.last - 0.05) this.i = this.events.findIndex((e) => e[0] >= t) >>> 0;
    this.last = t;
    const ctx = this.sound?.ctx;
    while (this.i < this.events.length && this.events[this.i][0] < t + AHEAD) {
      const e = this.events[this.i++];
      if (quiet || !this.bus || e[0] < t - 0.15) continue;
      const when = ctx.currentTime + Math.max(0, e[0] - t);
      if (e[1] === 'sfx') this.sfx(e[2], when, e[4]);
      else this.note(e[1], F(e[2]), when, e[3], e[4]);
    }
  }

  stop() {
    if (!this.bus) return;
    const ctx = this.sound.ctx;
    const bus = this.bus;
    const nodes = this.nodes;
    const wet = this.wet;
    bus.gain.setTargetAtTime(0, ctx.currentTime, 0.06);
    setTimeout(() => {
      bus.disconnect();
      wet.disconnect();
      for (const n of nodes) n.disconnect();
    }, 700);
    this.bus = null;
  }

  // ---------------------------------------------------------------- building blocks
  osc(type, f, t, dur, gain, { attack = 0.005, slide = null, filter = null, q = 0.8, dest = null, detune = 0, vib = 0 } = {}) {
    const ctx = this.sound.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.detune.value = detune;
    if (slide) for (const [k, to] of Array.isArray(slide[0]) ? slide : [slide]) o.frequency.exponentialRampToValueAtTime(to, t + dur * k);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (filter) {
      const bq = ctx.createBiquadFilter();
      bq.type = filter[0];
      bq.frequency.value = filter[1];
      bq.Q.value = q;
      node.connect(bq);
      node = bq;
    }
    if (vib) {
      const l = ctx.createOscillator();
      const lg = ctx.createGain();
      l.frequency.value = vib;
      lg.gain.value = f * 0.02;
      l.connect(lg).connect(o.frequency);
      l.start(t);
      l.stop(t + dur + 0.05);
    }
    node.connect(g).connect(dest || this.bus);
    o.start(t);
    o.stop(t + dur + 0.05);
    return g;
  }

  noise(t, dur, gain, { type = 'bandpass', f = 1000, q = 1, attack = 0.005, sweep = null, dest = null } = {}) {
    const ctx = this.sound.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.sound.noise;
    src.loop = true;
    const bq = ctx.createBiquadFilter();
    bq.type = type;
    bq.frequency.setValueAtTime(f, t);
    if (sweep) bq.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    bq.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bq).connect(g).connect(dest || this.bus);
    src.start(t, Math.random() * 0.4);
    src.stop(t + dur + 0.05);
  }

  // ---------------------------------------------------------------- instruments
  note(voice, f, t, dur, gain) {
    const wet = { dest: this.wet };
    switch (voice) {
      case 'bell':
        this.osc('sine', f, t, dur, gain, { attack: 0.004 });
        this.osc('sine', f * 2.01, t, dur * 0.5, gain * 0.35, { attack: 0.004 });
        this.osc('sine', f, t, dur, gain * 0.5, { attack: 0.004, ...wet });
        break;
      case 'xylo':
        this.osc('sine', f, t, Math.min(dur, 0.6), gain, { attack: 0.003 });
        this.osc('sine', f * 3.98, t, 0.12, gain * 0.3, { attack: 0.002 });
        break;
      case 'pad':
        this.osc('triangle', f, t, dur, gain, { attack: Math.min(0.5, dur * 0.3), filter: ['lowpass', 1500], detune: -6 });
        this.osc('triangle', f, t, dur, gain * 0.8, { attack: Math.min(0.5, dur * 0.3), filter: ['lowpass', 1500], detune: 7, ...wet });
        break;
      case 'strings':
        this.osc('sawtooth', f, t, dur, gain, { attack: Math.min(0.35, dur * 0.3), filter: ['lowpass', 1300], detune: -5, vib: 5 });
        this.osc('sawtooth', f, t, dur, gain * 0.7, { attack: Math.min(0.35, dur * 0.3), filter: ['lowpass', 1100], detune: 6, ...wet });
        break;
      case 'pluck':
        this.osc('triangle', f, t, Math.min(dur, 0.5), gain, { attack: 0.003 });
        break;
      case 'pizz':
        this.osc('triangle', f, t, 0.18, gain, { attack: 0.002, filter: ['lowpass', 2400] });
        break;
      case 'bass':
        this.osc('sine', f, t, dur, gain, { attack: 0.01 });
        this.osc('triangle', f, t, dur * 0.6, gain * 0.35, { attack: 0.01 });
        break;
      case 'lead':
        this.osc('square', f, t, dur, gain, { attack: 0.02, filter: ['lowpass', 2000] });
        this.osc('square', f, t, dur, gain * 0.4, { attack: 0.02, filter: ['lowpass', 1600], ...wet });
        break;
      case 'brass':
        this.osc('sawtooth', f, t, dur, gain, { attack: 0.045, filter: ['lowpass', 1500], q: 1.4 });
        this.osc('sawtooth', f * 0.5, t, dur, gain * 0.5, { attack: 0.06, filter: ['lowpass', 900] });
        break;
      case 'whistle':
        this.osc('sine', f, t, dur, gain, { attack: 0.06, vib: 6 });
        break;
      case 'organ':
        this.osc('sine', f, t, dur, gain, { attack: 0.08, detune: -9 });
        this.osc('sine', f, t, dur, gain, { attack: 0.08, detune: 9, ...wet });
        this.osc('sine', f * 2, t, dur, gain * 0.3, { attack: 0.08 });
        break;
      case 'musicbox':
        this.osc('sine', f, t, dur, gain, { attack: 0.003, detune: -18 });
        this.osc('sine', f * 3, t, dur * 0.3, gain * 0.2, { attack: 0.003, ...wet });
        break;
      case 'kick':
        this.osc('sine', 150, t, 0.3, gain, { attack: 0.002, slide: [1, 42] });
        break;
      case 'snare':
        this.noise(t, 0.16, gain, { f: 1900, q: 0.7, attack: 0.002 });
        this.osc('triangle', 190, t, 0.1, gain * 0.6, { attack: 0.002 });
        break;
      case 'hat':
        this.noise(t, 0.05, gain, { type: 'highpass', f: 7000, attack: 0.002 });
        break;
      case 'tom':
        this.osc('sine', 150, t, 0.35, gain, { attack: 0.003, slide: [1, 80] });
        break;
      default:
        this.osc('sine', f, t, dur, gain);
    }
  }

  sfx(name, t, g = 1) {
    switch (name) {
      case 'click':
        this.noise(t, 0.03, 0.12 * g, { type: 'highpass', f: 3000, attack: 0.001 });
        break;
      case 'thunder':
        this.noise(t, 2.6, 0.34 * g, { type: 'lowpass', f: 380, attack: 0.03 });
        this.noise(t + 0.05, 0.5, 0.3 * g, { type: 'lowpass', f: 1400, attack: 0.005 });
        this.osc('sine', 70, t, 1.4, 0.25 * g, { attack: 0.02, slide: [1, 32] });
        break;
      case 'rain':
        this.noise(t, 2.2, 0.05 * g, { type: 'highpass', f: 2600, attack: 0.4 });
        break;
      case 'wind':
        this.noise(t, 3, 0.07 * g, { f: 500, q: 2, attack: 1, sweep: 900 });
        break;
      case 'creak':
        this.osc('sawtooth', 160, t, 0.9, 0.05 * g, { attack: 0.08, slide: [[0.4, 240], [1, 150]], filter: ['bandpass', 900], q: 3 });
        break;
      case 'door':
        this.osc('sawtooth', 120, t, 1.5, 0.06 * g, { attack: 0.1, slide: [[0.3, 210], [0.7, 140], [1, 260]], filter: ['bandpass', 800], q: 4 });
        break;
      case 'step':
        this.noise(t, 0.09, 0.12 * g, { f: 500, q: 1.5 });
        break;
      case 'sting':
        for (const n of [61, 62, 67, 68, 73]) this.osc('sawtooth', F(n), t, 0.9, 0.035 * g, { attack: 0.004, filter: ['lowpass', 2600] });
        this.noise(t, 0.4, 0.18 * g, { f: 2200, q: 0.6, attack: 0.002 });
        this.osc('sine', 90, t, 0.6, 0.18 * g, { attack: 0.002, slide: [1, 40] });
        break;
      case 'boo':
        this.osc('sine', 330, t, 0.9, 0.12 * g, { attack: 0.05, slide: [[0.3, 380], [1, 140]], vib: 7 });
        break;
      case 'flap':
        for (let i = 0; i < 5; i++) this.noise(t + i * 0.09, 0.07, 0.1 * g, { f: 900, q: 1.2 });
        break;
      case 'meow':
        this.osc('triangle', 620, t, 0.55, 0.09 * g, { attack: 0.04, slide: [[0.35, 980], [1, 560]], filter: ['bandpass', 1300], q: 1.5 });
        break;
      case 'purr':
        for (let i = 0; i < 8; i++) this.noise(t + i * 0.16, 0.13, 0.06 * g, { type: 'lowpass', f: 260, attack: 0.04 });
        break;
      case 'squeak':
        this.osc('sine', 2500, t, 0.09, 0.05 * g, { slide: [1, 3400] });
        this.osc('sine', 2700, t + 0.13, 0.08, 0.04 * g, { slide: [1, 3500] });
        break;
      case 'crack':
        this.noise(t, 0.06, 0.25 * g, { type: 'highpass', f: 2500, attack: 0.001 });
        this.osc('sine', 900, t, 0.05, 0.06 * g, { slide: [1, 300] });
        break;
      case 'sizzle':
        this.noise(t, 1.6, 0.06 * g, { f: 5200, q: 0.6, attack: 0.1 });
        break;
      case 'whisk':
        for (let i = 0; i < 6; i++) this.noise(t + i * 0.11, 0.08, 0.06 * g, { f: 3000, q: 2 });
        break;
      case 'boing':
        this.osc('sine', 200, t, 0.55, 0.1 * g, { attack: 0.005, slide: [[0.2, 520], [1, 380]], vib: 14 });
        break;
      case 'splat':
        this.noise(t, 0.28, 0.25 * g, { type: 'lowpass', f: 700, attack: 0.002 });
        this.osc('sine', 140, t, 0.2, 0.15 * g, { slide: [1, 60] });
        break;
      case 'beep':
        for (let i = 0; i < 4; i++) this.osc('square', 2100, t + i * 0.22, 0.12, 0.03 * g, { attack: 0.002 });
        break;
      case 'whoosh':
        this.noise(t, 0.7, 0.14 * g, { f: 400, q: 1.2, attack: 0.15, sweep: 2600 });
        break;
      case 'fall':
        this.osc('sine', 1800, t, 0.9, 0.05 * g, { attack: 0.02, slide: [1, 500] });
        break;
      case 'launch':
        this.noise(t, 3.0, 0.3 * g, { type: 'lowpass', f: 180, attack: 0.3, sweep: 900 });
        this.noise(t, 2.4, 0.08 * g, { f: 1200, q: 0.5, attack: 0.5, sweep: 3000 });
        break;
      case 'rumble':
        this.noise(t, 1.6, 0.18 * g, { type: 'lowpass', f: 300, attack: 0.2 });
        break;
      case 'boom':
        this.osc('sine', 90, t, 0.9, 0.3 * g, { attack: 0.003, slide: [1, 30] });
        this.noise(t, 0.7, 0.2 * g, { type: 'lowpass', f: 900, attack: 0.003 });
        break;
      case 'twinkle':
        for (let i = 0; i < 5; i++) this.osc('sine', F(88 + [0, 4, 7, 12, 16][i]), t + i * 0.07, 0.5, 0.035 * g, { attack: 0.003, dest: this.wet });
        for (let i = 0; i < 5; i++) this.osc('sine', F(88 + [0, 4, 7, 12, 16][i]), t + i * 0.07, 0.5, 0.03 * g, { attack: 0.003 });
        break;
      case 'chime':
        for (const [i, n] of [[0, 84], [1, 88], [2, 91]]) this.osc('sine', F(n), t + i * 0.12, 1.2, 0.05 * g, { attack: 0.003 });
        break;
      case 'kiss':
        this.osc('sine', 700, t, 0.09, 0.1 * g, { attack: 0.003, slide: [1, 1700] });
        this.noise(t + 0.06, 0.03, 0.08 * g, { type: 'highpass', f: 3000, attack: 0.001 });
        break;
      case 'pop':
        this.osc('sine', 500, t, 0.08, 0.08 * g, { attack: 0.002, slide: [1, 1100] });
        break;
      case 'heartbeat':
        this.osc('sine', 62, t, 0.18, 0.3 * g, { attack: 0.004, slide: [1, 40] });
        this.osc('sine', 58, t + 0.24, 0.2, 0.22 * g, { attack: 0.004, slide: [1, 38] });
        break;
      case 'thump':
        this.osc('sine', 170, t, 0.25, 0.25 * g, { attack: 0.002, slide: [1, 55] });
        this.noise(t, 0.08, 0.12 * g, { type: 'lowpass', f: 1500, attack: 0.001 });
        break;
      case 'tweet':
        this.osc('sine', 2600, t, 0.1, 0.04 * g, { slide: [1, 3600] });
        this.osc('sine', 2900, t + 0.14, 0.12, 0.04 * g, { slide: [1, 3900] });
        break;
      case 'splash':
        this.noise(t, 0.9, 0.22 * g, { type: 'lowpass', f: 1500, attack: 0.005, sweep: 400 });
        break;
      case 'swish':
        this.noise(t, 0.2, 0.1 * g, { f: 1600, q: 1, attack: 0.03 });
        break;
      case 'tada':
        for (const [i, n] of [[0, 72], [0.1, 76], [0.2, 79], [0.34, 84]]) this.osc('triangle', F(n), t + i, 0.6, 0.06 * g, { attack: 0.004 });
        break;
      case 'yawn':
        this.osc('triangle', 420, t, 0.9, 0.04 * g, { attack: 0.15, slide: [[0.5, 520], [1, 260]], filter: ['lowpass', 1200] });
        break;
      case 'clock':
        for (let i = 0; i < 4; i++) this.noise(t + i * 0.5, 0.04, 0.12 * g, { f: 2500 + (i % 2) * 600, q: 6, attack: 0.001 });
        break;
      default:
        this.osc('sine', 600 + hash(name.length) * 400, t, 0.2, 0.05 * g);
    }
  }
}
