import * as THREE from 'three';

// Time of day for the town, from the player's own clock: dawn, sunrise, morning, noon, afternoon,
// golden hour, sunset, dusk and night, with seasonal sunrise and sunset times.
// mode: 'live' (the clock), a fixed hour (0..24), or 'fast' (a whole day in four minutes).

const C = (hex) => new THREE.Color(hex);
// Keyframes by sun elevation in degrees.
// [el, fog/sky, sun, sunIntensity, hemiSky, hemiGround, hemiIntensity, water, cloudGlow, cloudGlowIntensity, lampGlow, exposure, screenTint, tintStrength]
const NIGHT = [-90, '#141a3e', '#8fa8ff', 0.5, '#5a6cc0', '#141a30', 0.5, '#16294e', '#303a78', 0.3, 1, 0.78, '#2a3a8a', 0.36];
const NIGHT2 = [-14, '#1a2046', '#8fa8ff', 0.52, '#5a6cc0', '#161c34', 0.52, '#1a2e56', '#343e7c', 0.3, 1, 0.8, '#2e3c8e', 0.36];
const DAY = [25, '#a6dde2', '#fff0d8', 2.5, '#fff6ea', '#7fae74', 1.35, '#6fc9d4', '#ffffff', 0.25, 0, 1, '#ffffff', 0];
const DAY2 = [90, '#a6dde2', '#fff0d8', 2.5, '#fff6ea', '#7fae74', 1.35, '#6fc9d4', '#ffffff', 0.25, 0, 1, '#ffffff', 0];
const EVENING = [
  NIGHT,
  NIGHT2,
  [-6, '#4a3f86', '#c77aa8', 0.6, '#8a72c4', '#2c2a4a', 0.55, '#3d4f8e', '#b07ac0', 0.45, 0.9, 0.84, '#7a4aa8', 0.5],
  [0, '#f07a62', '#ff6a3a', 1.7, '#ffa088', '#5e5a72', 0.8, '#d48a8e', '#ff9a70', 0.6, 0.45, 0.94, '#ff5a28', 0.6],
  [7, '#f8c08a', '#ffa860', 2.3, '#ffd8b0', '#8a9a6c', 1.05, '#9ac6c0', '#ffd0a0', 0.4, 0, 1, '#ff9a3a', 0.38],
  DAY,
  DAY2,
].map(parse);
const MORNING = [
  NIGHT,
  NIGHT2,
  [-6, '#6a5fa8', '#d898c4', 0.6, '#a48ed8', '#2e2e4e', 0.55, '#56689e', '#d0a0d8', 0.45, 0.9, 0.86, '#9a6ac8', 0.45],
  [0, '#f6a0b0', '#ff9470', 1.7, '#ffc0c0', '#626078', 0.85, '#cfa0c0', '#ffb0b0', 0.6, 0.45, 0.95, '#ff8a90', 0.5],
  [7, '#fcd8b4', '#ffcc98', 2.3, '#ffeedc', '#88a470', 1.1, '#98d2ce', '#ffe8d4', 0.35, 0, 1, '#ffc070', 0.25],
  DAY,
  DAY2,
].map(parse);
function parse([el, fog, sun, sunI, sky, ground, hemiI, water, cloud, cloudI, glow, exp, tint, tintA]) {
  return { el, fog: C(fog), sun: C(sun), sunI, sky: C(sky), ground: C(ground), hemiI, water: C(water), cloud: C(cloud), cloudI, glow, exp, tint: C(tint), tintA };
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const MODE_KEY = 'roji-world-time';

export class Daylight {
  constructor({ override = null } = {}) {
    // override: an hour from the URL (?time=18.2) or a named moment (?time=sunset)
    const saved = localStorage.getItem(MODE_KEY);
    const pick = override !== null && override !== '' ? override : saved || 'live';
    this.mode = !isNaN(+pick) ? +pick : NAMED[pick] || pick === 'live' || pick === 'fast' ? pick : 'live';
    this.fastStart = null;
    this.state = {
      hour: 12,
      el: 60,
      phase: 'Noon',
      morning: true,
      dark: 0,
      fog: new THREE.Color(),
      sun: new THREE.Color(),
      sunI: 2.5,
      sky: new THREE.Color(),
      ground: new THREE.Color(),
      hemiI: 1.35,
      water: new THREE.Color(),
      cloud: new THREE.Color(),
      cloudI: 0.25,
      glow: 0,
      exp: 1,
      tint: new THREE.Color(),
      tintA: 0,
      lightOffset: new THREE.Vector3(-11, 22, 12),
      sunrise: 6,
      sunset: 18,
    };
  }

  setMode(mode) {
    this.mode = mode;
    this.fastStart = null;
    if (mode === 'fast') localStorage.removeItem(MODE_KEY);
    else localStorage.setItem(MODE_KEY, String(mode));
  }

  // Seasonal sunrise and sunset (northern hemisphere, about 30 degrees north)
  sunTimes(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const doy = (date - start) / 86400000;
    const dayLen = 12 + 1.5 * Math.cos((2 * Math.PI * (doy - 172)) / 365);
    const noon = 12.2;
    return [noon - dayLen / 2, noon + dayLen / 2];
  }

  hourNow(now, realSeconds, SR, SS) {
    if (typeof this.mode === 'number') return this.mode;
    if (NAMED[this.mode]) return NAMED[this.mode](SR, SS);
    const h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    if (this.mode === 'fast') {
      if (this.fastStart === null) this.fastStart = { real: realSeconds, hour: h };
      return (this.fastStart.hour + ((realSeconds - this.fastStart.real) / 240) * 24) % 24;
    }
    return h;
  }

  update(realSeconds, now = new Date()) {
    const s = this.state;
    const [SR, SS] = this.sunTimes(now);
    const H = this.hourNow(now, realSeconds, SR, SS);
    s.hour = H;
    s.sunrise = SR;
    s.sunset = SS;
    // Sun elevation over the day, and below the horizon at night
    let el;
    let ha; // -1 east (rising) .. 1 west (setting)
    if (H >= SR && H <= SS) {
      const d = (H - SR) / (SS - SR);
      el = Math.sin(d * Math.PI) * 68;
      ha = d * 2 - 1;
    } else {
      const nightLen = 24 - (SS - SR);
      const n = (((H - SS) % 24) + 24) % 24 / nightLen;
      el = -Math.sin(n * Math.PI) * 42;
      ha = n * 2 - 1; // the moon's path
    }
    // Twilight stretches a little past the horizon so dawn and dusk last
    const nearRise = Math.abs(H - SR) < 1.2;
    const nearSet = Math.abs(H - SS) < 1.2;
    if (nearRise && H < SR) el = Math.max(el, -14 * ((SR - H) / 1.2));
    if (nearSet && H > SS) el = Math.max(el, -14 * ((H - SS) / 1.2));
    s.el = el;
    s.morning = H < 12.2 && H > 2;
    const keys = s.morning ? MORNING : EVENING;
    let i = 0;
    while (i < keys.length - 2 && el > keys[i + 1].el) i++;
    const a = keys[i];
    const b = keys[i + 1];
    const k = smooth(a.el, b.el, el);
    s.fog.copy(a.fog).lerp(b.fog, k);
    s.sun.copy(a.sun).lerp(b.sun, k);
    s.sky.copy(a.sky).lerp(b.sky, k);
    s.ground.copy(a.ground).lerp(b.ground, k);
    s.water.copy(a.water).lerp(b.water, k);
    s.cloud.copy(a.cloud).lerp(b.cloud, k);
    s.sunI = a.sunI + (b.sunI - a.sunI) * k;
    s.hemiI = a.hemiI + (b.hemiI - a.hemiI) * k;
    s.cloudI = a.cloudI + (b.cloudI - a.cloudI) * k;
    s.glow = a.glow + (b.glow - a.glow) * k;
    s.exp = a.exp + (b.exp - a.exp) * k;
    s.tint.copy(a.tint).lerp(b.tint, k);
    s.tintA = a.tintA + (b.tintA - a.tintA) * k;
    s.dark = smooth(4, -12, el);
    // Light direction: the sun by day, the moon at night, always a little in front so faces stay lit
    const day = H >= SR - 0.4 && H <= SS + 0.4;
    const up = day ? Math.max(0, el) : -el;
    s.lightOffset.set(-ha * 20, 6 + 24 * Math.sin((Math.min(up, 90) * Math.PI) / 180), 12);
    s.phase = phaseName(H, el, SR, SS);
    return s;
  }

  label() {
    const s = this.state;
    const h = Math.floor(s.hour);
    const m = Math.floor((s.hour - h) * 60);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return { time, phase: s.phase, night: s.dark > 0.5, mode: this.mode };
  }
}

function phaseName(H, el, SR, SS) {
  if (el < -11) return 'Night';
  if (el < -2) return H < 12 ? 'Dawn' : 'Dusk';
  if (el < 5) return H < 12 ? 'Sunrise' : 'Sunset';
  if (H > SS - 1.6) return 'Golden hour';
  if (H < 11) return 'Morning';
  if (H < 14) return 'Noon';
  return 'Afternoon';
}

// Named moments, relative to today's sunrise (SR) and sunset (SS).
const NAMED = {
  dawn: (SR) => SR - 0.55,
  sunrise: (SR) => SR + 0.12,
  morning: (SR) => SR + 2.6,
  noon: () => 12.6,
  afternoon: (SR, SS) => SS - 3,
  golden: (SR, SS) => SS - 0.9,
  sunset: (SR, SS) => SS + 0.02,
  dusk: (SR, SS) => SS + 0.6,
  night: () => 22.5,
};

// Choices for the clock button.
export const TIME_CHOICES = [
  { id: 'live', label: 'Live', sub: 'Follows your clock' },
  { id: 'fast', label: 'A whole day', sub: 'One day in four minutes' },
  { id: 'dawn', label: 'Dawn' },
  { id: 'sunrise', label: 'Sunrise' },
  { id: 'morning', label: 'Morning' },
  { id: 'noon', label: 'Noon' },
  { id: 'golden', label: 'Golden hour' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'dusk', label: 'Dusk' },
  { id: 'night', label: 'Night', sub: 'Lamps and moonlight' },
];
