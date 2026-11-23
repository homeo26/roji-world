// Horse Race: a side-view pony race. Gallop on the beat, jump the hurdles, reach the ribbon first.
const ID = 'horserace';
const P = 'g-horserace-';
const COLOR = '#c9772f';
const FONT = "Fredoka, ui-rounded, 'Nunito', system-ui, sans-serif";

const RACE_LEN = 420; // metres
const HURDLES = [55, 105, 152, 200, 248, 296, 342, 386];
const BEAT = 0.55; // seconds between gallop beats
const PERFECT = 0.08;
const GOOD = 0.155;
const MASH_GAP = 0.24; // taps closer than this count as mashing
const VMIN = 6.5;
const VMAX = 13.5;
const JUMP_DUR = 0.62;
const JUMP_UNITS = 58; // jump height in pony units
const CLEAR = 0.42; // share of the jump height needed over a hurdle
const STUMBLE = 0.85;
const COUNT_BEATS = 6; // 3, 2, 1 at two beats each

const LANE_Y = [0.6, 0.71, 0.82, 0.93];
const LANE_S = [0.74, 0.82, 0.91, 1];

const COATS = {
  chestnut: { coat: '#c8692e', dark: '#a6531f', mane: '#6e3519', muzzle: '#efbf98', hoof: '#4a2e22', line: '#7d3d18' },
  grey: { coat: '#ece7ef', dark: '#cbc2d1', mane: '#8f8596', muzzle: '#f8dcd3', hoof: '#5a5060', line: '#9c92a3' },
  palomino: { coat: '#ecc26f', dark: '#d1a14d', mane: '#fff4d8', muzzle: '#f8dfb4', hoof: '#6b4a2a', line: '#a87a33' },
  black: { coat: '#54444b', dark: '#3d3137', mane: '#211a1d', muzzle: '#806b73', hoof: '#1f171b', line: '#2a2024' },
};

const NPCS = [
  { id: 'kai', name: 'Kai', gender: 'boy', skin: '#c98f68', hair: '#141010', hairstyle: 'curly', top: '#3fbf7f', accent: '#ffd166' },
  { id: 'mina', name: 'Mina', gender: 'girl', skin: '#fbe6d8', hair: '#b5773d', hairstyle: 'bob', top: '#8b5cf6', accent: '#c7a6ff' },
];

const ROSETTE = ['#ffd166', '#6fb8ff', '#ff9eb5', '#7fd3a7'];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const mod = (a, n) => ((a % n) + n) % n;
const ord = (n) => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
const hash = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const ICON_GALLOP = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 19.5V13a5.5 5.5 0 0 1 11 0v6.5"/><path d="M4.8 19.5h3.4M15.8 19.5h3.4" stroke-linecap="round"/></svg>';
const ICON_JUMP = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V6M6 11.5 12 5.5l6 6"/></svg>';

const CSS = `
.${P}root { position: absolute; inset: 0; overflow: hidden; font-family: var(--font); color: var(--ink); user-select: none; -webkit-user-select: none; touch-action: none; }
.${P}cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.${P}pad { position: absolute; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 max(14px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left)); pointer-events: none; }
.${P}pad.${P}off { display: none; }
.${P}btn { pointer-events: auto; width: 86px; height: 86px; border-radius: 50%; border: 0; display: grid; place-items: center; align-content: center; gap: 0; font: 700 .95rem var(--font); color: #fff; background: var(--c); box-shadow: inset 0 -5px 0 rgba(0,0,0,.16), 0 8px 18px rgba(52,40,70,.25), 0 0 0 calc(var(--pulse, 0) * 8px) color-mix(in srgb, var(--c) 35%, transparent); touch-action: none; -webkit-tap-highlight-color: transparent; transition: transform .08s; }
.${P}btn.${P}gallop { --c: ${COLOR}; width: 100px; height: 100px; }
.${P}btn.${P}jump { --c: #3fbf7f; }
.${P}btn.${P}down { transform: translateY(2px) scale(.95); }
.${P}btn.${P}hot { animation: ${P}hot .5s ease-in-out infinite alternate; }
@keyframes ${P}hot { to { transform: scale(1.08); box-shadow: inset 0 -5px 0 rgba(0,0,0,.16), 0 0 0 8px rgba(63,191,127,.35); } }
.${P}hint { position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); font-size: .9rem; color: var(--ink-soft); background: rgba(255,250,243,.88); padding: 6px 14px; border-radius: 999px; white-space: nowrap; pointer-events: none; box-shadow: 0 2px 8px rgba(52,40,70,.1); }
.${P}hint.${P}off { display: none; }
.${P}hint span { margin: 0 8px; opacity: .4; }
.${P}intro { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(59,43,63,.16); z-index: 2; padding: 8px; }
.${P}intro.${P}off { display: none; }
.${P}card { background: var(--paper); border-radius: 24px; box-shadow: var(--shadow); padding: 14px 22px 16px; width: min(460px, 100%); text-align: center; max-height: 100%; overflow: hidden; }
.${P}card h3 { margin: 2px 0 6px; font-size: 1.35rem; }
.${P}card ul { list-style: none; padding: 0; margin: 0 0 12px; text-align: left; display: grid; gap: 4px; font-size: .93rem; color: var(--ink-soft); }
.${P}card li { display: flex; gap: 8px; align-items: baseline; }
.${P}card li i { flex: none; width: 9px; height: 9px; border-radius: 50%; background: ${COLOR}; transform: translateY(-1px); }
.${P}card li b { color: var(--ink); font-weight: 600; }
.${P}faces { display: flex; justify-content: center; gap: 4px; margin-bottom: 2px; }
.${P}faces svg { width: 46px; height: 46px; }
.${P}best { margin-top: 8px; font-size: .82rem; color: var(--ink-soft); }
.${P}best:empty { display: none; }
@media (max-height: 420px) {
  .${P}card { padding: 10px 18px 12px; }
  .${P}card h3 { font-size: 1.15rem; margin: 0 0 4px; }
  .${P}card ul { font-size: .84rem; gap: 2px; margin-bottom: 8px; }
  .${P}faces svg { width: 36px; height: 36px; }
  .${P}card .btn.big { font-size: 1.05rem; padding: .6em 1.5em; }
  .${P}best { margin-top: 4px; }
}
`;

function ensureStyle() {
  if (document.getElementById('style-g-' + ID)) return;
  const s = document.createElement('style');
  s.id = 'style-g-' + ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

function faceImage(api, look) {
  const img = new Image();
  const svg = api.avatar(look, 128).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  return img;
}

export default {
  id: ID,
  start(stage, api) {
    ensureStyle();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const touch = !!api.isTouch;
    const me = api.me;
    const partner = api.partner;

    const root = document.createElement('div');
    root.className = P + 'root';
    const best = api.load('best', null);
    root.innerHTML = `
      <canvas class="${P}cv" role="img" aria-label="Pony race track"></canvas>
      <div class="${P}hint ${P}off"><kbd>Space</kbd> gallop on the beat<span>|</span><kbd>Up</kbd> jump</div>
      <div class="${P}pad ${P}off">
        <button class="${P}btn ${P}jump" aria-label="Jump">${ICON_JUMP}Jump</button>
        <button class="${P}btn ${P}gallop" aria-label="Gallop">${ICON_GALLOP}Gallop</button>
      </div>
      <div class="${P}intro">
        <div class="${P}card">
          <div class="${P}faces">${api.avatar(me, 46)}${api.avatar(partner, 46)}</div>
          <h3>Ready to race, ${me.name}?</h3>
          <ul>
            <li><i></i><span><b>Gallop on the beat.</b> ${touch ? 'Tap Gallop' : 'Press <kbd>Space</kbd>'} when the ring closes. Mashing tires your pony.</span></li>
            <li><i></i><span><b>Jump the hurdles</b> with ${touch ? 'the Jump button or a swipe up' : '<kbd>Up</kbd>'}. A hit makes your pony stumble.</span></li>
            <li><i></i><span>Beat ${partner.name}, Mina and Kai to the ribbon.</span></li>
          </ul>
          <button class="btn primary big ${P}go" style="--c:${COLOR}">Start race</button>
          <div class="${P}best">${best ? `Best winning time: ${Number(best).toFixed(1)} s` : ''}</div>
        </div>
      </div>`;
    stage.appendChild(root);
    root.__state = null;

    const cv = root.querySelector('canvas');
    const ctx = cv.getContext('2d');
    const hint = root.querySelector('.' + P + 'hint');
    const pad = root.querySelector('.' + P + 'pad');
    const intro = root.querySelector('.' + P + 'intro');
    const goBtn = root.querySelector('.' + P + 'go');
    const jumpBtn = root.querySelector('.' + P + 'jump');
    const gallopBtn = root.querySelector('.' + P + 'gallop');

    // ---------------------------------------------------------------- layout
    let W = 1;
    let H = 1;
    let dpr = 1;
    let k = 1; // px per pony unit in the front lane
    let ppm = 50; // px per metre
    let px0 = 200; // screen x of the player's pony
    let hs = 1; // HUD scale
    function resize() {
      const r = stage.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      k = Math.min(H / 340, W / 700);
      ppm = k * 50;
      px0 = W * 0.27;
      hs = clamp(Math.min(H / 400, W / 800), 0.86, 1.3);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    // ---------------------------------------------------------------- state
    const mk = (o) => ({
      ...o,
      d: 0,
      v: 0,
      p: 0,
      jumpT: -1,
      stumble: 0,
      phase: Math.random() * 6,
      nh: 0,
      plan: null,
      knocked: [],
      finished: false,
      finishT: 0,
      img: faceImage(api, o.look),
      wob: Math.random() * 6,
      wf: 0.45 + Math.random() * 0.5,
      dustT: 0,
    });
    const runners = [
      mk({ look: NPCS[0], coat: COATS.black, cloth: '#3fbf7f', lane: 0, base: 10.0, miss: 0.2 }),
      mk({ look: NPCS[1], coat: COATS.palomino, cloth: '#8b5cf6', lane: 1, base: 10.3, miss: 0.18 }),
      mk({ look: partner, coat: COATS.grey, cloth: partner.top || '#3f7bf0', lane: 2, base: 10.6, miss: 0.14 }),
      mk({ look: me, coat: COATS.chestnut, cloth: me.top || '#ef5b6f', lane: 3, player: true }),
    ];
    const pl = runners[3];
    const order = [];
    const dust = [];
    const pops = [];
    const clouds = Array.from({ length: 7 }, (_, i) => ({ x: hash(i + 3), y: 0.06 + hash(i + 11) * 0.26, s: 0.7 + hash(i + 19) * 0.6 }));

    let phase = 'intro'; // intro | count | race | done
    let raceT = -COUNT_BEATS * BEAT;
    let clock = 0;
    let stam = 1;
    let tired = 0;
    let lastTap = -99;
    let lastBeatHit = -999;
    let lastTick = null;
    let quality = { t: -9, kind: '' };
    let ribbonT = -1;
    let doneT = 0;
    let finishedCalled = false;
    let place = 0;
    let shake = 0;
    let scoreText = '';
    let raf = 0;
    let lastTs = 0;
    const timers = [];

    const state = { runners, get phase() { return phase; }, get raceT() { return raceT; }, get stam() { return stam; }, BEAT, HURDLES, JUMP_DUR };
    root.__state = state;

    const pop = (text, color = '#3b2b3f') => {
      pops.push({ text, color, t: 0 });
      if (pops.length > 3) pops.shift();
    };

    // ---------------------------------------------------------------- input
    function begin() {
      if (phase !== 'intro') return;
      phase = 'count';
      raceT = -COUNT_BEATS * BEAT;
      intro.classList.add(P + 'off');
      if (touch) pad.classList.remove(P + 'off');
      else hint.classList.remove(P + 'off');
      api.sfx('tap');
    }

    function gallop() {
      if (phase !== 'race' || pl.finished) return;
      if (tired > 0) {
        pop('Tired!', '#e5484d');
        return;
      }
      const ph = mod(raceT, BEAT);
      const err = Math.min(ph, BEAT - ph);
      const beatIdx = Math.round(raceT / BEAT);
      const since = raceT - lastTap;
      lastTap = raceT;
      if (since < MASH_GAP) {
        stam -= 0.11;
        pop('Too fast!', '#e5484d');
        quality = { t: clock, kind: 'bad' };
      } else if (err <= PERFECT && beatIdx !== lastBeatHit) {
        pl.p = Math.min(1, pl.p + 0.17);
        stam -= 0.01;
        lastBeatHit = beatIdx;
        pop('Perfect!', '#c9772f');
        quality = { t: clock, kind: 'perfect' };
        api.sfx('pop');
      } else if (err <= GOOD && beatIdx !== lastBeatHit) {
        pl.p = Math.min(1, pl.p + 0.11);
        stam -= 0.025;
        lastBeatHit = beatIdx;
        pop('Good', '#3fbf7f');
        quality = { t: clock, kind: 'good' };
        api.sfx('tap');
      } else {
        pl.p = Math.min(1, pl.p + 0.05);
        stam -= 0.06;
        pop('Off beat', '#6f5f73');
        quality = { t: clock, kind: 'off' };
      }
      if (stam <= 0) {
        stam = 0;
        tired = 1.6;
        pop('Tired!', '#e5484d');
        api.sfx('bad');
      }
    }

    function jump() {
      if (phase !== 'race' || pl.finished) return;
      if (pl.jumpT >= 0 || pl.stumble > 0) return;
      pl.jumpT = 0;
      api.sfx('swoosh');
    }

    const onKey = (e) => {
      if (finishedCalled) return;
      const key = e.key;
      const isGallop = key === ' ' || key === 'ArrowRight' || key === 'd' || key === 'D';
      const isJump = key === 'ArrowUp' || key === 'w' || key === 'W';
      if (phase === 'intro') {
        if (key === 'Enter' || key === ' ') {
          e.preventDefault();
          begin();
        }
        return;
      }
      if (isGallop || isJump) e.preventDefault();
      if (e.repeat) return;
      if (isGallop) gallop();
      else if (isJump) jump();
    };
    window.addEventListener('keydown', onKey);

    goBtn.addEventListener('click', begin);
    const press = (btn, fn) => {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btn.classList.add(P + 'down');
        fn();
      });
      const up = () => btn.classList.remove(P + 'down');
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    };
    press(gallopBtn, gallop);
    press(jumpBtn, jump);

    // Tap the track to gallop, swipe up to jump.
    let swipe = null;
    cv.addEventListener('pointerdown', (e) => {
      if (phase !== 'race') return;
      swipe = { id: e.pointerId, y: e.clientY, t: performance.now(), done: false };
      gallop();
    });
    cv.addEventListener('pointermove', (e) => {
      if (!swipe || swipe.id !== e.pointerId || swipe.done) return;
      if (swipe.y - e.clientY > 30 && performance.now() - swipe.t < 450) {
        swipe.done = true;
        jump();
      }
    });
    const endSwipe = () => (swipe = null);
    cv.addEventListener('pointerup', endSwipe);
    cv.addEventListener('pointercancel', endSwipe);

    // ---------------------------------------------------------------- simulation
    function stepRunner(r, dt) {
      let target;
      if (r.finished) target = r.player ? 0.5 : 5;
      else if (r.player) {
        r.p = clamp(r.p - dt * (0.1 + 0.15 * r.p) * (tired > 0 ? 3 : 1), 0, 1);
        target = VMIN + (VMAX - VMIN) * r.p;
      } else {
        const gap = r.d - pl.d;
        const fade = pl.d > RACE_LEN * 0.82 ? 0.65 : 1;
        const rb = clamp(-gap * 0.09, -1.8, 2.4) * fade;
        target = r.base + Math.sin(raceT * r.wf + r.wob) * 0.6 + rb;
      }
      if (r.stumble > 0) {
        r.stumble -= dt;
        target = 3;
      }
      r.v += (target - r.v) * Math.min(1, dt * (r.stumble > 0 ? 8 : 2.2));
      const prev = r.d;
      r.d += r.v * dt;
      if (r.jumpT >= 0) {
        r.jumpT += dt;
        if (r.jumpT >= JUMP_DUR) r.jumpT = -1;
      }
      // Rivals time their jumps, and sometimes get it wrong.
      if (!r.player && !r.finished && r.jumpT < 0 && r.stumble <= 0 && r.nh < HURDLES.length) {
        if (r.plan == null) r.plan = Math.random() < r.miss ? (Math.random() < 0.5 ? 0.05 : 0.96) : 0.42 + Math.random() * 0.16;
        if (HURDLES[r.nh] - r.d <= r.v * JUMP_DUR * r.plan) r.jumpT = 0;
      }
      while (r.nh < HURDLES.length && HURDLES[r.nh] <= r.d) {
        const h = r.jumpT >= 0 ? Math.sin((Math.PI * r.jumpT) / JUMP_DUR) : 0;
        if (h < CLEAR) {
          r.stumble = STUMBLE;
          r.v = Math.min(r.v, 3.2);
          r.jumpT = -1;
          r.knocked[r.nh] = true;
          if (r.player) {
            r.p *= 0.45;
            pop('Oops!', '#e5484d');
            api.sfx('bad');
            shake = 0.35;
          }
        } else if (r.player) {
          pop('Clear!', '#3fbf7f');
          api.sfx('coin');
        }
        r.nh++;
        r.plan = null;
      }
      if (!r.finished && r.d >= RACE_LEN) {
        r.finished = true;
        r.finishT = raceT - (r.d - RACE_LEN) / Math.max(1, r.v);
        order.push(r);
        if (ribbonT < 0) ribbonT = clock;
        if (r.player) endRace();
      }
      // legs and dust
      r.phase += dt * (r.v * 0.95 + (r.v > 0.2 ? 1.5 : 0));
      if (r.jumpT < 0 && r.v > 6 && prev !== r.d) {
        r.dustT -= dt;
        if (r.dustT <= 0) {
          r.dustT = 0.07 + Math.random() * 0.04;
          dust.push({ d: r.d - 0.5, lane: r.lane, life: 0, max: 0.5 + Math.random() * 0.25, r0: 2 + Math.random() * 2.5, dy: Math.random() * 3 });
          if (dust.length > 140) dust.shift();
        }
      }
    }

    function endRace() {
      phase = 'done';
      doneT = 0;
      place = order.indexOf(pl) + 1;
      scoreText = ord(place);
      api.setScore(scoreText);
      api.sfx(place === 1 ? 'coin' : 'tap');
    }

    function callFinish() {
      finishedCalled = true;
      const rest = runners.filter((r) => !r.finished).sort((a, b) => b.d - a.d);
      const ranking = [...order, ...rest];
      const pPlace = ranking.indexOf(runners[2]) + 1;
      const time = pl.finishT;
      const t = time.toFixed(1) + ' s';
      if (place === 1) {
        const prevBest = api.load('best', null);
        const newBest = prevBest == null || time < prevBest;
        if (newBest) api.save('best', Math.round(time * 100) / 100);
        api.finish({
          win: true,
          title: `${me.name} wins the race!`,
          text: `First to the ribbon in ${t}. ${partner.name} came ${ord(pPlace)}.${newBest ? ' New best time!' : ''}`,
        });
      } else {
        const winner = ranking[0];
        api.finish({
          win: false,
          title: `${ord(place)} place`,
          text: `${me.name} finished ${ord(place)} in ${t}. ${winner.look.name} won${winner === runners[2] ? ' this one' : ''}. Tap on the beat and jump a little early.`,
        });
      }
    }

    function update(dt) {
      clock += dt;
      if (phase === 'intro') {
        for (const r of runners) r.phase += dt * 0.6;
        return;
      }
      raceT += dt;
      if (phase === 'count' || phase === 'race') {
        const bi = Math.floor(raceT / BEAT + 1e-6);
        if (bi !== lastTick) {
          lastTick = bi;
          if (phase === 'race' || bi < 0) api.sfx('tick');
        }
      }
      if (phase === 'count') {
        for (const r of runners) r.phase += dt * 0.6;
        if (raceT >= 0) {
          phase = 'race';
          api.sfx('good');
        }
        return;
      }
      for (const r of runners) stepRunner(r, dt);
      if (tired > 0) {
        tired -= dt;
        if (tired <= 0) stam = 0.4;
      } else if (!pl.finished) stam = Math.min(1, stam + dt * 0.11);
      for (const d of dust) d.life += dt;
      while (dust.length && dust[0].life > dust[0].max) dust.shift();
      for (const p of pops) p.t += dt;
      while (pops.length && pops[0].t > 0.9) pops.shift();
      shake = Math.max(0, shake - dt);

      if (phase === 'race') {
        const ahead = runners.filter((r) => !r.player && (r.finished || r.d > pl.d)).length;
        const txt = ord(ahead + 1) + ' place';
        if (txt !== scoreText) {
          scoreText = txt;
          api.setScore(txt);
        }
        const near = pl.nh < HURDLES.length && (HURDLES[pl.nh] - pl.d) / Math.max(pl.v, 1) < 0.9 && pl.jumpT < 0;
        jumpBtn.classList.toggle(P + 'hot', near);
        const ph = mod(raceT, BEAT) / BEAT;
        gallopBtn.style.setProperty('--pulse', String(Math.max(0, 1 - Math.min(ph, 1 - ph) * 6).toFixed(2)));
      } else if (phase === 'done') {
        jumpBtn.classList.remove(P + 'hot');
        gallopBtn.style.setProperty('--pulse', '0');
        doneT += dt;
        if (doneT > 2 && !finishedCalled) callFinish();
      }
    }

    // ---------------------------------------------------------------- drawing
    const camM = () => Math.min(pl.d, RACE_LEN + 2.5) - px0 / ppm;
    const X = (d, cm) => (d - cm) * ppm;

    function drawSky() {
      const horizon = H * 0.52;
      const g = ctx.createLinearGradient(0, 0, 0, horizon);
      g.addColorStop(0, '#9fd6ff');
      g.addColorStop(1, '#ffeedd');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, horizon + 2);
      const sx = W * 0.84;
      const sy = H * 0.2;
      const sr = H * 0.07;
      const sg = ctx.createRadialGradient(sx, sy, sr * 0.4, sx, sy, sr * 2.4);
      sg.addColorStop(0, 'rgba(255,244,190,.9)');
      sg.addColorStop(1, 'rgba(255,244,190,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(sx - sr * 2.5, sy - sr * 2.5, sr * 5, sr * 5);
      ctx.fillStyle = '#fff3b8';
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawClouds(cm) {
      const span = W + 300 * k;
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      for (const c of clouds) {
        const x = mod(c.x * span - cm * ppm * 0.06 - clock * 8 * k, span) - 150 * k;
        const y = c.y * H + 48 * hs;
        const s = c.s * k * 1.1;
        ctx.beginPath();
        ctx.ellipse(x, y, 34 * s, 12 * s, 0, 0, Math.PI * 2);
        ctx.ellipse(x - 16 * s, y - 6 * s, 16 * s, 12 * s, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 10 * s, y - 11 * s, 19 * s, 15 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawHills(cm) {
      const layer = (f, base, a1, a2, f1, f2, ph, col) => {
        const off = cm * ppm * f;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W + 8; x += 8) {
          const wx = (x + off) / k;
          ctx.lineTo(x, base - H * (a1 * (0.6 + 0.4 * Math.sin(wx * f1 + ph)) + a2 * Math.sin(wx * f2 + ph * 2)));
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
      };
      layer(0.12, H * 0.505, 0.11, 0.025, 0.004, 0.013, 1, '#c8e8c4');
      layer(0.28, H * 0.52, 0.06, 0.02, 0.007, 0.019, 2.5, '#a6dca0');
    }

    function drawTrees(cm) {
      const f = 0.55;
      const off = cm * ppm * f;
      const sp = 70 * k;
      const base = H * 0.52;
      const i0 = Math.floor((off - 60 * k) / sp);
      const i1 = Math.ceil((off + W + 60 * k) / sp);
      for (let i = i0; i <= i1; i++) {
        if (hash(i * 3.1) < 0.38) continue;
        const x = i * sp - off + (hash(i + 0.5) - 0.5) * 30 * k;
        const r = (12 + hash(i * 7.7) * 10) * k;
        ctx.fillStyle = '#9a6b4a';
        ctx.fillRect(x - 2.5 * k, base - r * 1.2, 5 * k, r * 1.2);
        ctx.fillStyle = hash(i * 1.9) < 0.5 ? '#6cc47a' : '#7fcf86';
        ctx.beginPath();
        for (const [cx, cy, cr] of [[x, base - r * 1.6, r], [x - r * 0.6, base - r * 1.2, r * 0.7], [x + r * 0.6, base - r * 1.25, r * 0.72]]) {
          ctx.moveTo(cx + cr, cy);
          ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        ctx.beginPath();
        ctx.arc(x - r * 0.3, base - r * 1.9, r * 0.38, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawTrack(cm) {
      const top = H * 0.535;
      ctx.fillStyle = '#a8dc8c';
      ctx.fillRect(0, H * 0.51, W, top - H * 0.51 + 2);
      const g = ctx.createLinearGradient(0, top, 0, H);
      g.addColorStop(0, '#f0d3a4');
      g.addColorStop(1, '#e4b67f');
      ctx.fillStyle = g;
      ctx.fillRect(0, top, W, H - top);
      // lane lines
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.lineWidth = Math.max(1.5, 2 * k);
      for (let i = 0; i < 3; i++) {
        const y = ((LANE_Y[i] + LANE_Y[i + 1]) / 2) * H + 6 * k;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      // dirt specks for a sense of speed
      ctx.fillStyle = 'rgba(160,110,60,.22)';
      const m0 = Math.floor(cm / 1.3) - 1;
      const m1 = Math.ceil((cm + W / ppm) / 1.3) + 1;
      for (let m = m0; m <= m1; m++) {
        for (let l = 0; l < 4; l++) {
          const hv = hash(m * 4 + l);
          const x = X(m * 1.3 + hv * 1.2, cm);
          const y = (LANE_Y[l] + (hash(m * 4 + l + 0.3) - 0.3) * 0.06) * H;
          ctx.beginPath();
          ctx.ellipse(x, y, 3 * k, 1.4 * k, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // start line
      const sx = X(0, cm);
      if (sx > -20 && sx < W + 20) {
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.fillRect(sx - 3 * k, top, 6 * k, H - top);
      }
      // finish checks
      const fx = X(RACE_LEN, cm);
      if (fx > -40 && fx < W + 40) {
        const sq = 8 * k;
        for (let y = top, row = 0; y < H; y += sq, row++) {
          for (let c = 0; c < 2; c++) {
            ctx.fillStyle = (row + c) % 2 ? '#3b2b3f' : '#ffffff';
            ctx.fillRect(fx - sq + c * sq, y, sq, sq);
          }
        }
      }
      // back fence
      const railY = H * 0.5;
      ctx.strokeStyle = '#fffaf3';
      ctx.lineWidth = 3 * k;
      ctx.beginPath();
      ctx.moveTo(0, railY);
      ctx.lineTo(W, railY);
      ctx.moveTo(0, railY + 11 * k);
      ctx.lineTo(W, railY + 11 * k);
      ctx.stroke();
      const p0 = Math.floor(cm / 3) - 1;
      const p1 = Math.ceil((cm + W / ppm) / 3) + 1;
      for (let i = p0; i <= p1; i++) {
        const x = X(i * 3, cm);
        ctx.fillStyle = 'rgba(80,60,60,.12)';
        ctx.fillRect(x - 1.5 * k, railY - 6 * k, 5 * k, 30 * k);
        ctx.fillStyle = '#fffaf3';
        rr(x - 2.5 * k, railY - 8 * k, 5 * k, 30 * k, 2 * k);
        ctx.fill();
      }
      // distance boards on the rail
      for (let m = 100; m < RACE_LEN; m += 100) {
        const x = X(m, cm);
        if (x < -40 * k || x > W + 40 * k) continue;
        ctx.fillStyle = '#fffaf3';
        rr(x - 3 * k, railY - 24 * k, 6 * k, 24 * k, 2 * k);
        ctx.fill();
        rr(x - 22 * k, railY - 40 * k, 44 * k, 19 * k, 9 * k);
        ctx.fill();
        ctx.fillStyle = COLOR;
        ctx.font = `700 ${Math.round(11 * k)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(m + ' m', x, railY - 30.5 * k);
      }
      // finish post and banner
      if (fx > -80 * k && fx < W + 80 * k) {
        ctx.fillStyle = '#fffaf3';
        rr(fx - 3 * k, railY - 64 * k, 6 * k, 64 * k + 14 * k, 3 * k);
        ctx.fill();
        ctx.fillStyle = '#ef5b6f';
        rr(fx - 34 * k, railY - 86 * k, 68 * k, 26 * k, 10 * k);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `700 ${Math.round(13 * k)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FINISH', fx, railY - 73 * k);
      }
    }

    function rr(x, y, w, h, r) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    }

    function drawHurdle(x, gy, s, knocked) {
      ctx.save();
      ctx.translate(x, gy);
      ctx.scale(s * 1.45, s * 1.45);
      const postA = [-7, 4];
      const postB = [7, -9];
      if (knocked) {
        ctx.fillStyle = 'rgba(80,50,40,.15)';
        ctx.beginPath();
        ctx.ellipse(6, 2, 22, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.rotate(0.08);
        for (let i = 0; i < 2; i++) {
          stripedBar(-6 + i * 4, -2 - i * 4, 30, 5);
        }
        ctx.restore();
        ctx.fillStyle = '#fffaf3';
        ctx.save();
        ctx.translate(postB[0], postB[1]);
        ctx.rotate(0.6);
        rr(-2.5, -26, 5, 26, 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = 'rgba(80,50,40,.15)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 16, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fffaf3';
        rr(postB[0] - 2.5, postB[1] - 30, 5, 30, 2);
        ctx.fill();
        for (const h of [26, 14]) {
          ctx.save();
          ctx.translate(postA[0], postA[1] - h);
          ctx.rotate(Math.atan2(postB[1] - postA[1], postB[0] - postA[0]));
          stripedBar(0, -2.5, Math.hypot(postB[0] - postA[0], postB[1] - postA[1]) + 4, 5);
          ctx.restore();
        }
        ctx.fillStyle = '#fffaf3';
        rr(postA[0] - 2.5, postA[1] - 30, 5, 30, 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,90,80,.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    }

    function stripedBar(x, y, w, h) {
      ctx.save();
      rr(x, y, w, h, h / 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.clip();
      ctx.fillStyle = '#ef5b6f';
      for (let i = 0; i < w; i += 8) ctx.fillRect(x + i, y, 4, h);
      ctx.restore();
    }

    function drawDust(lane, cm) {
      for (const p of dust) {
        if (p.lane !== lane) continue;
        const t = p.life / p.max;
        const x = X(p.d, cm) - t * 10 * k;
        const y = LANE_Y[lane] * H - p.dy * k - t * 8 * k;
        const s = LANE_S[lane] * k;
        ctx.fillStyle = `rgba(214,176,128,${(0.55 * (1 - t)).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, (p.r0 + t * 7) * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function leg(hx, hy, a1, a2, col, hoof, w, line) {
      const L = 22;
      const kx = hx + Math.sin(a1) * L;
      const ky = hy + Math.cos(a1) * L;
      const fx = kx + Math.sin(a2) * L;
      const fy = ky + Math.cos(a2) * L;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = line;
      ctx.lineWidth = w + 2.4;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(kx, ky);
      ctx.lineTo(fx, fy);
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.stroke();
      ctx.strokeStyle = hoof;
      ctx.lineWidth = w + 1;
      ctx.beginPath();
      ctx.moveTo(fx - Math.sin(a2) * 4, fy - Math.cos(a2) * 4);
      ctx.lineTo(fx, fy);
      ctx.stroke();
    }

    function drawPony(r) {
      const c = r.coat;
      const spd = clamp(r.v / VMAX, 0, 1);
      const amp = r.v > 0.3 ? 0.3 + 0.7 * spd : 0;
      const jp = r.jumpT >= 0 ? r.jumpT / JUMP_DUR : -1;
      const tuck = jp >= 0 ? clamp(Math.sin(Math.PI * jp) * 1.8, 0, 1) : 0;
      const st = r.stumble > 0 ? clamp(r.stumble / STUMBLE, 0, 1) : 0;
      let pitch = jp >= 0 ? -0.2 * Math.cos(Math.PI * jp) : 0;
      if (st > 0) pitch += 0.2 * Math.sin(st * Math.PI);
      const bob = reduced || jp >= 0 ? 0 : -Math.abs(Math.sin(r.phase)) * 3.2 * amp;
      const breathe = r.v < 0.3 ? Math.sin(clock * 2.2 + r.wob) * 0.8 : 0;
      ctx.translate(0, bob + breathe);
      ctx.translate(0, -50);
      ctx.rotate(pitch);
      ctx.translate(0, 50);

      const legA = (front, off) => {
        const ph = r.phase + off;
        const s1 = Math.sin(ph);
        const c1 = Math.cos(ph);
        let a1;
        let a2;
        if (front) {
          a1 = 0.05 + 0.6 * s1 * amp;
          a2 = a1 - 1.4 * Math.max(0, c1) * amp;
          a1 = lerp(a1, 1.25, tuck);
          a2 = lerp(a2, -0.7, tuck);
          a1 = lerp(a1, -0.45, st);
          a2 = lerp(a2, -0.15, st);
        } else {
          a1 = -0.3 + 0.5 * s1 * amp;
          a2 = a1 + 0.55 + 0.6 * Math.max(0, c1) * amp;
          a1 = lerp(a1, -0.95, tuck);
          a2 = lerp(a2, -0.55, tuck);
          a1 = lerp(a1, -0.1, st);
          a2 = lerp(a2, 0.5, st);
        }
        return [a1, a2];
      };
      // far legs
      let a = legA(false, 0);
      leg(-25, -46, a[0], a[1], c.dark, c.hoof, 8.5, c.line);
      a = legA(true, 2.4);
      leg(19, -46, a[0], a[1], c.dark, c.hoof, 8.5, c.line);
      // tail
      const wave = Math.sin(clock * 11 + r.wob) * 3 * (0.3 + spd);
      ctx.strokeStyle = c.mane;
      ctx.lineCap = 'round';
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(-33, -64);
      ctx.quadraticCurveTo(-50 - 6 * spd, -66 + wave, -54 - 16 * spd, -38 - 16 * spd + wave);
      ctx.stroke();
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-34, -62);
      ctx.quadraticCurveTo(-44 - 6 * spd, -58 + wave, -46 - 12 * spd, -32 - 12 * spd + wave * 1.4);
      ctx.stroke();
      // body
      ctx.fillStyle = c.coat;
      ctx.strokeStyle = c.line;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, -56, 36, 19, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // neck
      ctx.beginPath();
      ctx.moveTo(14, -70);
      ctx.quadraticCurveTo(30, -84, 40, -102);
      ctx.lineTo(57, -90);
      ctx.quadraticCurveTo(44, -70, 34, -46);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -56, 35, 18, 0, -1.2, 0.6);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.16)';
      ctx.beginPath();
      ctx.ellipse(-6, -66, 22, 5, -0.05, 0, Math.PI * 2);
      ctx.fill();
      // near legs
      a = legA(false, 0.6);
      leg(-21, -46, a[0], a[1], c.coat, c.hoof, 9.5, c.line);
      a = legA(true, 3.0);
      leg(23, -46, a[0], a[1], c.coat, c.hoof, 9.5, c.line);
      // head
      ctx.fillStyle = c.coat;
      ctx.strokeStyle = c.line;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(53, -96, 16, 12.5, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.muzzle;
      ctx.beginPath();
      ctx.ellipse(63.5, -88, 9, 8, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // ear
      ctx.fillStyle = c.coat;
      ctx.beginPath();
      ctx.moveTo(41, -103);
      ctx.quadraticCurveTo(39, -119, 46, -116);
      ctx.quadraticCurveTo(50, -110, 49, -104);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffb3c1';
      ctx.beginPath();
      ctx.moveTo(43, -105);
      ctx.quadraticCurveTo(42, -114, 45.5, -113);
      ctx.quadraticCurveTo(47.5, -109, 47, -105);
      ctx.closePath();
      ctx.fill();
      // mane
      ctx.fillStyle = c.mane;
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        const fl = reduced ? 0 : Math.sin(clock * 12 + i + r.wob) * 1.6 * spd;
        ctx.beginPath();
        ctx.arc(lerp(42, 16, t) - fl - 3 * spd * t, lerp(-106, -71, t), 7.2 - 2 * t, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.ellipse(51, -108, 6, 4.5, -0.4, 0, Math.PI * 2);
      ctx.fill();
      // face
      ctx.fillStyle = '#2a1a1f';
      ctx.beginPath();
      ctx.ellipse(51, -98, 3.4, 4.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(52.3, -99.6, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,128,150,.45)';
      ctx.beginPath();
      ctx.ellipse(58, -92, 3.6, 2.3, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a3a3a';
      ctx.beginPath();
      ctx.arc(68.5, -88, 1.3, 0, Math.PI * 2);
      ctx.fill();
      // saddle cloth, saddle, girth
      ctx.fillStyle = r.cloth;
      rr(-17, -76, 30, 20, 6);
      ctx.fill();
      ctx.strokeStyle = '#fffaf3';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#6b3f22';
      ctx.fillRect(-4, -58, 5, 18);
      ctx.fillStyle = '#8a5530';
      ctx.beginPath();
      ctx.moveTo(-16, -74);
      ctx.quadraticCurveTo(-19, -84, -12, -81);
      ctx.lineTo(8, -78);
      ctx.quadraticCurveTo(15, -84, 15, -74);
      ctx.quadraticCurveTo(0, -71, -16, -74);
      ctx.closePath();
      ctx.fill();
      // rider
      const lean = 4 * spd + (tuck > 0 ? 3 : 0);
      ctx.strokeStyle = r.look.top || '#ef5b6f';
      ctx.lineWidth = 13;
      ctx.beginPath();
      ctx.moveTo(-3, -81);
      ctx.lineTo(5 + lean, -99);
      ctx.stroke();
      if (r.img.complete && r.img.naturalWidth) ctx.drawImage(r.img, -15 + lean, -137, 46, 46);
      else {
        ctx.fillStyle = r.look.skin || '#f8dccb';
        ctx.beginPath();
        ctx.arc(8 + lean, -112, 14, 0, Math.PI * 2);
        ctx.fill();
      }
      // leg and boot
      ctx.strokeStyle = '#f6efe2';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-3, -80);
      ctx.lineTo(11, -70);
      ctx.stroke();
      ctx.strokeStyle = '#3b2b3f';
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.moveTo(11, -70);
      ctx.lineTo(4, -53);
      ctx.lineTo(9, -52);
      ctx.stroke();
      // arm and reins
      ctx.strokeStyle = r.look.top || '#ef5b6f';
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(6 + lean, -96);
      ctx.lineTo(25, -83);
      ctx.stroke();
      ctx.fillStyle = r.look.skin || '#f8dccb';
      ctx.beginPath();
      ctx.arc(26, -82, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5a3420';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(26, -82);
      ctx.quadraticCurveTo(46, -80, 63, -86);
      ctx.stroke();
      // dizzy stars after a stumble
      if (st > 0) {
        for (let i = 0; i < 3; i++) {
          const an = clock * 6 + (i * Math.PI * 2) / 3;
          star(50 + Math.cos(an) * 14, -126 + Math.sin(an) * 4, 4, '#ffd166');
        }
      }
    }

    function star(x, y, r, col) {
      ctx.fillStyle = col;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 ? r * 0.45 : r;
        ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
    }

    function drawRunner(r, cm) {
      const s = LANE_S[r.lane] * k;
      const x = X(r.d, cm);
      if (x < -120 * s || x > W + 120 * s) return;
      const gy = LANE_Y[r.lane] * H;
      const h = r.jumpT >= 0 ? Math.sin((Math.PI * r.jumpT) / JUMP_DUR) * JUMP_UNITS : 0;
      ctx.fillStyle = 'rgba(90,60,40,.18)';
      ctx.beginPath();
      ctx.ellipse(x + 2 * s, gy, 38 * s * (1 - h / 140), 5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(x, gy - h * s);
      ctx.scale(s, s);
      drawPony(r);
      ctx.restore();
    }

    function drawRibbon(cm) {
      const fx = X(RACE_LEN, cm);
      if (fx < -100 * k || fx > W + 100 * k) return;
      const top = H * 0.535;
      const bot = H + 4;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#ef5b6f';
      ctx.lineWidth = 5 * k;
      if (ribbonT < 0) {
        ctx.beginPath();
        ctx.moveTo(fx, top);
        ctx.bezierCurveTo(fx - 10 * k, top + (bot - top) * 0.35, fx - 10 * k, top + (bot - top) * 0.65, fx, bot);
        ctx.stroke();
      } else {
        const t = clock - ribbonT;
        const fl = reduced ? 0 : Math.sin(t * 14) * 6 * k * Math.exp(-t * 0.6);
        const len = (bot - top) * 0.32;
        ctx.beginPath();
        ctx.moveTo(fx, top);
        ctx.quadraticCurveTo(fx + 14 * k + fl, top + len * 0.5, fx + 6 * k + fl, top + len);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(fx, bot);
        ctx.quadraticCurveTo(fx + 14 * k - fl, bot - len * 0.5, fx + 6 * k - fl, bot - len);
        ctx.stroke();
      }
      ctx.fillStyle = '#fffaf3';
      ctx.beginPath();
      ctx.arc(fx, top, 4 * k, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawRosette(x, y, r, n, grow) {
      const col = ROSETTE[n - 1] || ROSETTE[3];
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(grow, grow);
      ctx.fillStyle = '#ef5b6f';
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sgn * r * 0.2, r * 0.3);
        ctx.lineTo(sgn * r * 0.75, r * 1.9);
        ctx.lineTo(sgn * r * 0.42, r * 1.7);
        ctx.lineTo(sgn * r * 0.2, r * 2.0);
        ctx.lineTo(-sgn * r * 0.15, r * 0.4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = col;
      ctx.beginPath();
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        const rad = i % 2 ? r * 0.86 : r;
        ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fffaf3';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = r * 0.08;
      ctx.stroke();
      ctx.fillStyle = '#3b2b3f';
      ctx.font = `700 ${Math.round(r * 0.56)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ord(n), 0, r * 0.03);
      ctx.restore();
    }

    function drawHUD() {
      // progress bar with every rider's face
      const x0 = 22 * hs;
      const x1 = W - 34 * hs;
      const y = 18 * hs;
      ctx.fillStyle = 'rgba(255,250,243,.9)';
      rr(x0 - 8 * hs, y - 6 * hs, x1 - x0 + 16 * hs, 12 * hs, 6 * hs);
      ctx.fill();
      ctx.fillStyle = 'rgba(201,119,47,.35)';
      rr(x0, y - 2 * hs, (x1 - x0) * clamp(pl.d / RACE_LEN, 0, 1), 4 * hs, 2 * hs);
      ctx.fill();
      ctx.fillStyle = 'rgba(239,91,111,.55)';
      for (const h of HURDLES) ctx.fillRect(x0 + ((x1 - x0) * h) / RACE_LEN - 1, y - 5 * hs, 2, 10 * hs);
      // flag at the end
      ctx.fillStyle = '#3b2b3f';
      ctx.fillRect(x1 + 10 * hs, y - 12 * hs, 2 * hs, 22 * hs);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 2; j++) {
          ctx.fillStyle = (i + j) % 2 ? '#3b2b3f' : '#fff';
          ctx.fillRect(x1 + 12 * hs + i * 4 * hs, y - 12 * hs + j * 4 * hs, 4 * hs, 4 * hs);
        }
      }
      const fr = 12 * hs;
      for (const r of [runners[0], runners[1], runners[2], pl]) {
        const mx = x0 + (x1 - x0) * clamp(r.d / RACE_LEN, 0, 1);
        const rad = r.player ? fr * 1.15 : fr;
        ctx.fillStyle = r.player ? COLOR : r.coat.coat;
        ctx.beginPath();
        ctx.arc(mx, y, rad + 2.5 * hs, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fffaf3';
        ctx.beginPath();
        ctx.arc(mx, y, rad, 0, Math.PI * 2);
        ctx.fill();
        if (r.img.complete && r.img.naturalWidth) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(mx, y, rad, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(r.img, mx - rad * 1.12, y - rad * 1.2, rad * 2.24, rad * 2.24);
          ctx.restore();
        }
      }
      // stamina
      const sy = y + 24 * hs;
      const sw = Math.min(170 * hs, W * 0.26);
      ctx.fillStyle = 'rgba(255,250,243,.9)';
      rr(x0 - 8 * hs, sy - 4 * hs, sw + 76 * hs, 20 * hs, 10 * hs);
      ctx.fill();
      ctx.fillStyle = '#6f5f73';
      ctx.font = `600 ${Math.round(12 * hs)}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(tired > 0 ? 'Tired' : 'Stamina', x0, sy + 6 * hs);
      const bx = x0 + 60 * hs;
      ctx.fillStyle = 'rgba(59,43,63,.12)';
      rr(bx, sy + 1 * hs, sw, 10 * hs, 5 * hs);
      ctx.fill();
      const col = tired > 0 ? (Math.floor(clock * 6) % 2 ? '#e5484d' : '#ff9eb5') : stam > 0.55 ? '#3fbf7f' : stam > 0.28 ? '#ffc23d' : '#e5484d';
      ctx.fillStyle = col;
      rr(bx, sy + 1 * hs, Math.max(10 * hs, sw * (tired > 0 ? 1 - tired / 1.6 : stam) * 1), 10 * hs, 5 * hs);
      ctx.fill();
      // race clock
      if (phase !== 'intro') {
        const t = Math.max(0, pl.finished ? pl.finishT : raceT);
        const tx = W - 22 * hs;
        ctx.fillStyle = 'rgba(255,250,243,.9)';
        rr(tx - 62 * hs, sy - 4 * hs, 62 * hs, 20 * hs, 10 * hs);
        ctx.fill();
        ctx.fillStyle = '#3b2b3f';
        ctx.font = `600 ${Math.round(13 * hs)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(t.toFixed(1) + ' s', tx - 31 * hs, sy + 6 * hs);
      }
    }

    function drawBeat() {
      if (phase !== 'race' && phase !== 'count') return;
      const cx = px0;
      const cy = 92 * hs;
      const R = 17 * hs;
      const ph = mod(raceT, BEAT) / BEAT;
      const flash = Math.max(0, 1 - ph * 5);
      const q = clock - quality.t < 0.25 ? quality.kind : '';
      ctx.fillStyle = q === 'perfect' ? 'rgba(255,209,102,.95)' : q === 'good' ? 'rgba(127,211,167,.95)' : q === 'bad' ? 'rgba(229,72,77,.5)' : `rgba(255,250,243,${(0.78 + flash * 0.2).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLOR;
      ctx.lineWidth = 3 * hs;
      ctx.stroke();
      // shrinking ring: lands on the circle at the beat
      ctx.strokeStyle = `rgba(201,119,47,${(0.35 + 0.6 * ph).toFixed(3)})`;
      ctx.lineWidth = 2.5 * hs;
      ctx.beginPath();
      ctx.arc(cx, cy, R * (1 + 1.3 * (1 - ph)), 0, Math.PI * 2);
      ctx.stroke();
      if (flash > 0) {
        ctx.strokeStyle = `rgba(255,209,102,${flash.toFixed(3)})`;
        ctx.lineWidth = 5 * hs;
        ctx.beginPath();
        ctx.arc(cx, cy, R + 3 * hs, 0, Math.PI * 2);
        ctx.stroke();
      }
      // horseshoe, open side down
      ctx.strokeStyle = COLOR;
      ctx.lineWidth = 4.2 * hs;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.arc(cx, cy + 1 * hs, R * 0.48, Math.PI * 0.78, Math.PI * 0.22);
      ctx.stroke();
      ctx.fillStyle = '#fffaf3';
      for (const a of [0.95, 1.25, 1.75, 2.05]) {
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a * Math.PI) * R * 0.48, cy + 1 * hs + Math.sin(a * Math.PI) * R * 0.48, 0.9 * hs, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawPops() {
      const cx = px0 + 28 * hs;
      const cy = 92 * hs;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      pops.forEach((p, i) => {
        if (i < pops.length - 1) return;
        const a = clamp(1 - p.t / 0.9, 0, 1);
        ctx.font = `700 ${Math.round(17 * hs)}px ${FONT}`;
        ctx.lineWidth = 4 * hs;
        ctx.strokeStyle = `rgba(255,250,243,${a.toFixed(3)})`;
        ctx.globalAlpha = a;
        const y = cy - (reduced ? 0 : p.t * 14 * hs);
        ctx.strokeText(p.text, cx, y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, cx, y);
        ctx.globalAlpha = 1;
      });
    }

    function drawHurdleHint(cm) {
      if (phase !== 'race' || pl.nh >= HURDLES.length) return;
      const hd = HURDLES[pl.nh];
      const secs = (hd - pl.d) / Math.max(pl.v, 1);
      const sx = X(hd, cm);
      const gy = LANE_Y[3] * H;
      if (sx > W - 10) {
        if (secs > 2.2) return;
        const pulse = reduced ? 1 : 0.85 + 0.15 * Math.sin(clock * 12);
        const bx = W - 34 * hs;
        const by = gy - 118 * k;
        ctx.save();
        ctx.translate(bx, by);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = 'rgba(255,250,243,.95)';
        ctx.beginPath();
        ctx.arc(0, 0, 20 * hs, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ef5b6f';
        ctx.lineWidth = 3 * hs;
        ctx.stroke();
        ctx.fillStyle = '#ef5b6f';
        ctx.fillRect(-10 * hs, -5 * hs, 20 * hs, 3.5 * hs);
        ctx.fillRect(-10 * hs, 2 * hs, 20 * hs, 3.5 * hs);
        ctx.fillRect(-11 * hs, -9 * hs, 3 * hs, 18 * hs);
        ctx.fillRect(8 * hs, -9 * hs, 3 * hs, 18 * hs);
        ctx.restore();
      } else if (pl.nh < 2 && secs < 1.3 && secs > 0 && sx > px0) {
        ctx.font = `700 ${Math.round(15 * hs)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 4 * hs;
        ctx.strokeStyle = '#fffaf3';
        const label = touch ? 'Jump!' : 'Up to jump!';
        ctx.strokeText(label, sx, gy - 46 * k);
        ctx.fillStyle = '#ef5b6f';
        ctx.fillText(label, sx, gy - 46 * k);
      }
    }

    function drawCountdown() {
      let text = '';
      let t = 0;
      if (phase === 'count') {
        const n = Math.ceil(-raceT / (2 * BEAT));
        text = String(clamp(n, 1, 3));
        t = 1 - mod(-raceT, 2 * BEAT) / (2 * BEAT);
      } else if (phase === 'race' && raceT < 0.7) {
        text = 'Go!';
        t = raceT / 0.7;
      }
      if (!text) return;
      const sc = reduced ? 1 : 1 + 0.25 * (1 - Math.min(1, t * 4));
      ctx.save();
      ctx.translate(W / 2, H * 0.36);
      ctx.scale(sc, sc);
      ctx.font = `700 ${Math.round(64 * hs)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 10 * hs;
      ctx.strokeStyle = '#fffaf3';
      ctx.lineJoin = 'round';
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = text === 'Go!' ? '#3fbf7f' : COLOR;
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cm = camM();
      ctx.save();
      if (shake > 0 && !reduced) ctx.translate((Math.random() - 0.5) * 10 * shake, (Math.random() - 0.5) * 8 * shake);
      drawSky();
      drawClouds(cm);
      drawHills(cm);
      drawTrees(cm);
      drawTrack(cm);
      for (let lane = 0; lane < 4; lane++) {
        const r = runners.find((q) => q.lane === lane);
        const s = LANE_S[lane] * k;
        const gy = LANE_Y[lane] * H;
        for (let i = 0; i < HURDLES.length; i++) {
          const x = X(HURDLES[i], cm);
          if (x < -60 * s || x > W + 60 * s) continue;
          drawHurdle(x, gy, s, !!r.knocked[i]);
        }
        drawDust(lane, cm);
        drawRunner(r, cm);
      }
      drawRibbon(cm);
      ctx.restore();
      drawHurdleHint(cm);
      drawHUD();
      drawBeat();
      drawPops();
      drawCountdown();
      if (phase === 'done' && place) {
        const g = reduced ? 1 : clamp(doneT * 3, 0, 1);
        const e = reduced ? 1 : 1 + Math.sin(g * Math.PI) * 0.25;
        drawRosette(X(pl.d, cm) + 8 * k, LANE_Y[3] * H - 172 * k, 26 * k, place, g * e);
      }
    }

    function frame(ts) {
      raf = requestAnimationFrame(frame);
      const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
      lastTs = ts;
      update(dt);
      draw();
    }
    raf = requestAnimationFrame(frame);
    timers.push(setTimeout(() => goBtn.focus({ preventScroll: true }), 30));

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      for (const t of timers) clearTimeout(t);
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
      root.__state = null;
      root.remove();
    };
  },
};
