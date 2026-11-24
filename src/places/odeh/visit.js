// The family's shared state for one visit (outside and inside the house see the same family):
// whether Basem is here, coming, or away this time; whether Hanan has hugged Roji yet; and small
// helpers for little scenes that play out in game time.
import { clamp, pick } from './kit.js';
import { L, fill } from './lines.js';

export class Family {
  constructor() {
    this.visit = null;
    this.lastSeen = -999;
    this.nightOverride = typeof location !== 'undefined' && /[?&]time=night\b/.test(location.search) ? 1 : null;
    this.glass = null;
    this.glassBase = 1;
    this.waiters = [];
    this.clock = 0;
    this.scene = 0; // bumps when a scene is cancelled
    this.busy = null; // name of the scene that is playing
    this.listeners = [];
    this.api = null;
  }

  // 0 by day .. 1 at night, read from the lantern glass the game brightens after dark
  night() {
    if (this.nightOverride !== null) return this.nightOverride;
    if (!this.glass) return 0;
    return clamp((this.glass.emissiveIntensity / this.glassBase - 1) / 1.8, 0, 1);
  }
  get isNight() {
    return this.night() > 0.55;
  }

  // Called every frame from the place and from the interior. A fresh visit starts after being away.
  tick(dt, api) {
    this.api ||= api;
    const now = api.time();
    if (!this.visit || now - this.lastSeen > 15) this.startVisit(api);
    this.lastSeen = now;
    this.clock += dt;
    this.visit.t += dt;
    for (let i = this.waiters.length - 1; i >= 0; i--) {
      if (this.waiters[i].at <= this.clock) {
        const w = this.waiters[i];
        this.waiters.splice(i, 1);
        w.res(true);
      }
    }
  }

  startVisit(api) {
    // Anything still playing from the last visit stops here
    this.cancel();
    for (const w of this.waiters.splice(0)) w.res(false);
    const n = (api.load('visits', 0) || 0) + 1;
    api.save('visits', n);
    const r = Math.random();
    // The first time Basem drops by during the visit; after that it varies
    const basem = n === 1 ? 'arrive' : r < 0.34 ? 'here' : r < 0.7 ? 'arrive' : 'away';
    this.visit = { n, t: 0, basem, basemIn: basem === 'here', basemArriveAt: 30 + Math.random() * 40, hugged: false, said: new Set(), meals: 0, gifted: false };
    for (const f of this.listeners) f(this.visit);
  }

  onVisit(fn) {
    this.listeners.push(fn);
  }

  wait(sec) {
    return new Promise((res) => this.waiters.push({ at: this.clock + sec, res }));
  }

  // Start a scene: returns a token checker, or null if another scene is playing
  begin(name, { force = false } = {}) {
    if (this.busy && !force) return null;
    const id = ++this.scene;
    this.busy = name;
    const live = () => this.scene === id;
    live.done = () => {
      if (this.scene === id) this.busy = null;
    };
    return live;
  }

  cancel() {
    this.scene++;
    this.busy = null;
  }

  line(key, me) {
    const v = L[key];
    const list = Array.isArray(v) ? v : [...(v?.all || []), ...(v?.[me] || [])];
    return fill(pick(key, list), me);
  }
}
