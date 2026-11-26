import * as K from '../riding/kit.js';

// Synth sounds for the swim gala, all Web Audio: splashes, strokes, the whistle, the crowd,
// chimes for good timing, and a bouncy little tune for the synchronised swim.

export function makeSfx(sound) {
  const ok = () => sound?.ctx && !sound.muted;
  function noise({ freq = 900, q = 1, gain = 0.1, dur = 0.1, type = 'bandpass', when = 0, slide = 0 } = {}) {
    if (!ok() || !sound.noise) return;
    const c = sound.ctx;
    const src = c.createBufferSource();
    src.buffer = sound.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    const t = c.currentTime + when;
    f.frequency.setValueAtTime(freq, t);
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq * slide), t + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(sound.sfx);
    src.start(t, Math.random() * 0.4, dur + 0.05);
  }
  const tone = (f, when, dur, o) => ok() && sound.tone(f, sound.ctx.currentTime + when, dur, o);
  // a gentle melody in C major for the synchronised swim (one note per beat)
  const MEL = [523, 659, 784, 659, 698, 880, 784, 659, 587, 698, 880, 698, 659, 784, 1047, 784];
  const BASS = [131, 131, 175, 175, 147, 147, 196, 196];
  return {
    stroke(k = 1) {
      noise({ freq: 1300 + Math.random() * 500, q: 0.8, gain: 0.05 * k, dur: 0.09 });
      noise({ freq: 500, q: 0.6, gain: 0.03 * k, dur: 0.12, type: 'lowpass', when: 0.02 });
    },
    kick() {
      noise({ freq: 2200, q: 1.4, gain: 0.012, dur: 0.05 });
    },
    splash(power = 1) {
      noise({ freq: 900, q: 0.5, gain: Math.min(0.24, 0.08 + power * 0.08), dur: 0.3 + power * 0.18, type: 'lowpass', slide: 0.4 });
      noise({ freq: 2600, q: 0.8, gain: 0.04 + power * 0.02, dur: 0.22, when: 0.04 });
      if (power > 1.2) noise({ freq: 400, q: 0.5, gain: 0.08, dur: 0.6, type: 'lowpass', when: 0.1, slide: 0.5 });
    },
    perfect(n = 0) {
      const f = 1047 * Math.pow(1.0595, Math.min(7, n));
      tone(f, 0, 0.12, { type: 'triangle', gain: 0.045 });
      tone(f * 1.5, 0.05, 0.14, { type: 'sine', gain: 0.03 });
    },
    good() {
      tone(784, 0, 0.1, { type: 'triangle', gain: 0.035 });
    },
    oops() {
      tone(330, 0, 0.18, { type: 'square', gain: 0.025, slideTo: 200 });
    },
    boing() {
      tone(220, 0, 0.3, { type: 'sine', gain: 0.08, slideTo: 520 });
      tone(520, 0.12, 0.2, { type: 'sine', gain: 0.04, slideTo: 260 });
    },
    beep(high = false) {
      tone(high ? 1320 : 880, 0, high ? 0.35 : 0.14, { type: 'square', gain: 0.03 });
    },
    whistle: () => K.sfx.whistle(sound),
    cheer: (g = 0.06, d = 1.4) => K.sfx.cheer(sound, g, d),
    buzzer: () => K.sfx.buzzer(sound, true),
    bubble() {
      tone(500 + Math.random() * 400, 0, 0.08, { type: 'sine', gain: 0.025, slideTo: 1200 + Math.random() * 400 });
    },
    gasp() {
      noise({ freq: 1600, q: 0.7, gain: 0.05, dur: 0.25, slide: 1.6 });
    },
    ring(n = 0) {
      const f = 880 * Math.pow(1.122, n % 6);
      tone(f, 0, 0.1, { type: 'triangle', gain: 0.05 });
      tone(f * 1.26, 0.07, 0.1, { type: 'triangle', gain: 0.05 });
      tone(f * 1.5, 0.14, 0.18, { type: 'sine', gain: 0.04 });
    },
    sparkle() {
      for (let i = 0; i < 5; i++) tone(1400 + i * 260, i * 0.06, 0.16, { type: 'sine', gain: 0.03 });
    },
    // one beat of the synchronised swim tune; i counts beats
    beat(i, on = true) {
      if (!ok()) return;
      tone(i % 4 === 0 ? 70 : 60, 0, 0.14, { type: 'sine', gain: 0.12, slideTo: 40 });
      noise({ freq: 8000, q: 1, gain: 0.015, dur: 0.04, type: 'highpass', when: 0.0 });
      if (i % 2 === 0) tone(BASS[(i / 2) % BASS.length], 0, 0.3, { type: 'triangle', gain: 0.05 });
      if (on) tone(MEL[i % MEL.length], 0, 0.22, { type: 'triangle', gain: 0.035 });
    },
    move(m) {
      const f = { up: 1175, left: 880, right: 988, down: 659 }[m] || 880;
      tone(f, 0, 0.16, { type: 'sine', gain: 0.06 });
      tone(f * 2, 0.02, 0.1, { type: 'sine', gain: 0.02 });
    },
  };
}
