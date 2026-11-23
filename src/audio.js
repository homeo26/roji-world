// All sounds are synthesised with Web Audio, so there are no audio files.
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('roji-muted') === '1';
  }

  start({ music = true } = {}) {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    this.wantMusic = music;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.7;
    this.sfx.connect(this.master);
    this.music = ctx.createGain();
    this.music.gain.value = 0.32;
    // Soft echo for the music box
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.33;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.music.connect(this.master);
    this.music.connect(delay);
    delay.connect(fb).connect(delay);
    delay.connect(wet).connect(this.master);
    this.noise = this.makeNoise();
    if (this.wantMusic) this.startMusic();
  }

  // Music volume: lowered while a minigame or the TV is playing.
  setMusicLevel(level) {
    if (this.music) this.music.gain.setTargetAtTime(0.32 * level, this.ctx.currentTime, 0.3);
  }

  // Short UI sounds for minigames.
  ui(name) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const seq = {
      tap: [[84, 0, 0.08, 0.05]],
      tick: [[96, 0, 0.04, 0.03]],
      pop: [[79, 0, 0.12, 0.08], [91, 0.04, 0.1, 0.05]],
      good: [[76, 0, 0.18, 0.08], [83, 0.08, 0.25, 0.08]],
      bad: [[60, 0, 0.25, 0.08, 'triangle'], [55, 0.12, 0.3, 0.08, 'triangle']],
      coin: [[88, 0, 0.08, 0.07], [95, 0.06, 0.3, 0.07]],
      swoosh: [[70, 0, 0.18, 0.05, 'triangle', 90]],
      win: [[72, 0, 0.3, 0.09], [76, 0.1, 0.3, 0.09], [79, 0.2, 0.3, 0.09], [84, 0.32, 0.8, 0.1]],
      lose: [[67, 0, 0.3, 0.08, 'triangle'], [63, 0.16, 0.3, 0.08, 'triangle'], [60, 0.32, 0.7, 0.08, 'triangle']],
    }[name];
    if (!seq) return;
    for (const [n, dt, dur, gain, type = 'sine', slide] of seq) {
      this.tone(NOTE(n), t + dt, dur, { gain, type, slideTo: slide ? NOTE(slide) : null });
    }
  }

  setMuted(m) {
    this.muted = m;
    localStorage.setItem('roji-muted', m ? '1' : '0');
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }

  makeNoise() {
    const len = this.ctx.sampleRate * 0.5;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  tone(freq, time, dur, { type = 'sine', gain = 0.2, dest = this.sfx, attack = 0.005, slideTo = null } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, time);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, time + dur);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g).connect(dest);
    o.start(time);
    o.stop(time + dur + 0.05);
  }

  // Music box loop: a gentle C major progression in eighth notes.
  startMusic() {
    const ctx = this.ctx;
    this.bpm = 84;
    const chords = [
      [60, 64, 67, 72],
      [57, 60, 64, 69],
      [53, 57, 60, 65],
      [55, 59, 62, 67],
    ];
    const melody = [
      76, null, 79, 76, 74, null, 72, null,
      72, null, 76, 72, 69, null, 72, null,
      69, null, 72, 77, 76, null, 72, null,
      74, 76, 74, 71, 67, null, null, null,
    ];
    let i = 0;
    let next = ctx.currentTime + 0.2;
    const tick = () => {
      while (next < ctx.currentTime + 0.25) {
        const bar = Math.floor(i / 8) % 4;
        const beat = i % 8;
        const chord = chords[bar];
        const m = melody[i % melody.length];
        if (m) {
          this.tone(NOTE(m), next, 1.4, { gain: 0.07, dest: this.music, attack: 0.004 });
          this.tone(NOTE(m + 12), next, 0.5, { gain: 0.015, dest: this.music, type: 'triangle' });
        }
        // Arpeggio underneath
        this.tone(NOTE(chord[beat % 4] - 12), next, 0.9, { gain: 0.03, dest: this.music, type: 'triangle' });
        if (beat === 0) this.tone(NOTE(chord[0] - 24), next, 2.2, { gain: 0.05, dest: this.music });
        if (this.party) {
          if (beat % 2 === 0) this.tone(150, next, 0.18, { gain: 0.22, dest: this.music, slideTo: 45 });
          else this.hat(next);
          if (beat === 4) this.tone(NOTE(chord[2]), next, 0.3, { gain: 0.05, dest: this.music, type: 'square' });
        }
        next += 60 / this.bpm / 2;
        i++;
      }
    };
    this.musicTimer = setInterval(tick, 60);
  }

  setParty(on) {
    this.party = on;
    this.bpm = on ? 116 : 84;
  }

  hat(time) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.05, time + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    src.connect(f).connect(g).connect(this.music);
    src.start(time, Math.random() * 0.3, 0.06);
  }

  honk() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const dt of [0, 0.2]) {
      this.tone(NOTE(69), t + dt, 0.16, { gain: 0.06, type: 'square' });
      this.tone(NOTE(73), t + dt, 0.16, { gain: 0.05, type: 'square' });
    }
  }

  wish() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [84, 88, 91, 96, 100].forEach((n, i) => this.tone(NOTE(n), t + 0.4 + i * 0.08, 1.2, { gain: 0.05 }));
    this.tone(NOTE(76), t + 0.35, 0.2, { gain: 0.06, type: 'triangle' });
  }

  engine(on) {
    if (!this.ctx) return;
    if (on && !this.engineOsc) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = 50;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 320;
      g.gain.value = 0.025;
      o.connect(f).connect(g).connect(this.sfx);
      o.start();
      this.engineOsc = o;
      this.engineGain = g;
    } else if (!on && this.engineOsc) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      this.engineOsc.stop(this.ctx.currentTime + 0.4);
      this.engineOsc = null;
    }
  }

  engineSpeed(v) {
    if (this.engineOsc) this.engineOsc.frequency.setTargetAtTime(50 + Math.abs(v) * 9, this.ctx.currentTime, 0.1);
  }

  step(alt) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = alt ? 900 : 1150;
    f.Q.value = 1.2;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t, Math.random() * 0.3, 0.1);
  }

  jump() {
    if (!this.ctx) return;
    this.tone(330, this.ctx.currentTime, 0.22, { slideTo: 660, gain: 0.08, type: 'triangle' });
  }

  land() {
    if (!this.ctx) return;
    this.tone(160, this.ctx.currentTime, 0.12, { slideTo: 90, gain: 0.12 });
  }

  arrive() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [72, 76, 79, 84].forEach((n, i) => this.tone(NOTE(n), t + i * 0.07, 0.7, { gain: 0.09 }));
  }

  stamp() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(180, t, 0.25, { slideTo: 60, gain: 0.3 });
    [79, 83, 86, 91].forEach((n, i) => this.tone(NOTE(n), t + 0.12 + i * 0.06, 0.9, { gain: 0.07 }));
    for (let i = 0; i < 10; i++) this.tone(NOTE(88 + Math.floor(Math.random() * 12)), t + 0.3 + Math.random() * 0.6, 0.25, { gain: 0.025 });
  }

  locked() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(NOTE(67), t, 0.25, { gain: 0.08, type: 'triangle' });
    this.tone(NOTE(64), t + 0.14, 0.35, { gain: 0.08, type: 'triangle' });
  }

  kick() {
    if (!this.ctx) return;
    this.tone(220, this.ctx.currentTime, 0.12, { slideTo: 120, gain: 0.12 });
  }
}
