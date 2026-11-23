// Fencing Duel: a side-view duel on the piste. Lunge to touch, parry to block, riposte after a parry. First to five touches.
import { ICONS } from '../icons.js';

const ID = 'fencing';
const P = 'g-fencing-';
const BLUE = '#3f7bf0';
const RED = '#e5484d';
const FONT = "Fredoka, ui-rounded, 'Nunito', system-ui, sans-serif";

const HALF = 7; // piste half length in metres
const GUARD = 2; // en garde lines at -2 and +2
const MIN_GAP = 1.05;
const REACH = 2.3; // body-to-body distance a lunge can touch
const SPEED = 1.9;
const EXT = 0.17; // lunge extension
const HOLD = 0.12;
const REC = 0.34;
const RIP_EXT = 0.1; // riposte extension
const PARRY_ON = 0.4;
const PARRY_CD = 0.34;
const PARRIED = 0.6;
const RIPOSTE_WIN = 0.8;
const TOUCHES = 5;
const UNIT = 0.0195; // metres per drawing unit
const POINT_DUR = 1.6;
const READY_DUR = 0.9;

// Pose angles are in radians from the forward axis, positive is downward.
const POSES = {
  idle: { fx: 20, rx: -19, hx: 0, hy: -40, lean: 0.06, aU: 0.85, aF: 0.1, aB: -0.22, bU: -2.2, bF: -1.2, lift: 0 },
  windup: { fx: 18, rx: -21, hx: -4, hy: -36, lean: -0.04, aU: 1.3, aF: -0.45, aB: -0.75, bU: -2.4, bF: -1.5, lift: 0 },
  lunge: { fx: 54, rx: -22, hx: 16, hy: -30, lean: 0.25, aU: 0.02, aF: 0, aB: 0.03, bU: 2.5, bF: 2.8, lift: 0 },
  parry: { fx: 18, rx: -21, hx: -4, hy: -39, lean: -0.06, aU: 0.75, aF: -0.75, aB: -1.3, bU: -2.2, bF: -1.2, lift: 0 },
  parried: { fx: 50, rx: -22, hx: 12, hy: -31, lean: 0.12, aU: 0.1, aF: -0.25, aB: -0.85, bU: 2.4, bF: 2.6, lift: 0 },
  hit: { fx: 16, rx: -24, hx: -7, hy: -41, lean: -0.35, aU: 0.5, aF: -0.3, aB: -0.9, bU: -2.0, bF: -0.9, lift: 0 },
  salute: { fx: 14, rx: -14, hx: 0, hy: -45, lean: 0, aU: 0.35, aF: -1.25, aB: -1.5, bU: 1.9, bF: 1.7, lift: 0 },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - (1 - t) * (1 - t);
function lerpPose(a, b, t) {
  const o = {};
  for (const key in a) o[key] = a[key] + (b[key] - a[key]) * t;
  return o;
}

const ICON_ARROW = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS.arrow}"/></svg>`;
const ICON_SWORD = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18 19.5 4.5"/><path d="M4.5 13.5l6 6"/><path d="M6 18l-2.5 2.5"/></svg>';
const ICON_SHIELD = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5 19 6v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6z"/></svg>';

const CSS = `
.${P}root { position: absolute; inset: 0; display: grid; grid-template-rows: auto 1fr; font-family: var(--font); color: var(--ink); user-select: none; -webkit-user-select: none; touch-action: none; overflow: hidden; }
.${P}board { margin: 4px max(12px, env(safe-area-inset-right)) 0 max(12px, env(safe-area-inset-left)); display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; background: #3b2b3f; color: #fff; border-radius: 20px; padding: 6px 12px; box-shadow: 0 6px 18px rgba(52,40,70,.22); }
.${P}side { display: flex; align-items: center; gap: 10px; min-width: 0; }
.${P}side.${P}r { flex-direction: row-reverse; text-align: right; }
.${P}face { width: 48px; height: 48px; border-radius: 50%; background: #fffaf3; flex: none; overflow: hidden; box-shadow: 0 0 0 3px var(--sc); }
.${P}face svg { width: 48px; height: 48px; display: block; }
.${P}who { min-width: 0; }
.${P}name { font-weight: 700; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.${P}pips { display: flex; gap: 4px; margin-top: 4px; }
.${P}side.${P}r .${P}pips { justify-content: flex-end; }
.${P}pips i { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,.16); transition: background .2s; }
.${P}pips i.${P}on { background: var(--sc); box-shadow: 0 0 6px var(--sc); }
.${P}lamp { width: 30px; height: 30px; border-radius: 50%; flex: none; margin-left: auto; background: color-mix(in srgb, var(--sc) 20%, #2a1f2d); box-shadow: inset 0 2px 5px rgba(0,0,0,.45); transition: background .15s, box-shadow .15s; }
.${P}side.${P}r .${P}lamp { margin-left: 0; margin-right: auto; }
.${P}lamp.${P}on { background: var(--sc); box-shadow: 0 0 18px 5px var(--sc), inset 0 -3px 6px rgba(0,0,0,.2); }
.${P}mid { text-align: center; }
.${P}score { font-size: 1.7rem; font-weight: 700; line-height: 1.05; letter-spacing: .04em; }
.${P}score b { color: #9cc0ff; font-weight: 700; }
.${P}score em { color: #ff9a9d; font-style: normal; }
.${P}score span { opacity: .5; margin: 0 6px; }
.${P}msg { font-size: .78rem; opacity: .8; white-space: nowrap; }
.${P}play { position: relative; min-height: 0; }
.${P}cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.${P}pad { position: absolute; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 max(12px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); pointer-events: none; }
.${P}pad.${P}off, .${P}hint.${P}off, .${P}intro.${P}off { display: none; }
.${P}grp { display: flex; gap: 10px; align-items: flex-end; }
.${P}btn { pointer-events: auto; width: 62px; height: 62px; border-radius: 50%; border: 0; background: #fffaf3; color: var(--ink); display: grid; place-items: center; align-content: center; font: 700 .78rem var(--font); box-shadow: inset 0 -4px 0 rgba(0,0,0,.08), 0 6px 14px rgba(52,40,70,.22); touch-action: none; -webkit-tap-highlight-color: transparent; transition: transform .08s; }
.${P}btn.${P}back svg { transform: scaleX(-1); }
.${P}btn.${P}lunge { width: 82px; height: 82px; background: ${BLUE}; color: #fff; font-size: .9rem; box-shadow: inset 0 -5px 0 rgba(0,0,0,.16), 0 8px 18px rgba(63,123,240,.35); }
.${P}btn.${P}parry { width: 72px; height: 72px; background: #ffd166; color: #3b2b3f; font-size: .85rem; box-shadow: inset 0 -5px 0 rgba(0,0,0,.1), 0 8px 18px rgba(52,40,70,.22); }
.${P}btn.${P}down { transform: translateY(2px) scale(.94); }
.${P}btn.${P}hot { animation: ${P}hot .32s ease-in-out infinite alternate; }
@keyframes ${P}hot { to { transform: scale(1.1); box-shadow: 0 0 0 7px rgba(255,209,102,.45), 0 8px 18px rgba(52,40,70,.22); } }
.${P}hint { position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); font-size: .88rem; color: var(--ink-soft); background: rgba(255,250,243,.9); padding: 6px 14px; border-radius: 999px; white-space: nowrap; pointer-events: none; box-shadow: 0 2px 8px rgba(52,40,70,.1); }
.${P}hint span { margin: 0 8px; opacity: .4; }
.${P}hint b { font-weight: 600; transition: color .1s; }
.${P}hint b.${P}hot { color: ${RED}; }
.${P}intro { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(59,43,63,.16); z-index: 2; padding: 8px; }
.${P}card { background: var(--paper); border-radius: 24px; box-shadow: var(--shadow); padding: 14px 22px 16px; width: min(470px, 100%); text-align: center; max-height: 100%; overflow: hidden; }
.${P}card h3 { margin: 0 0 6px; font-size: 1.3rem; }
.${P}card ul { list-style: none; padding: 0; margin: 0 0 12px; text-align: left; display: grid; gap: 4px; font-size: .92rem; color: var(--ink-soft); }
.${P}card li { display: flex; gap: 8px; align-items: baseline; }
.${P}card li i { flex: none; width: 9px; height: 9px; border-radius: 50%; background: ${BLUE}; transform: translateY(-1px); }
.${P}card li b { color: var(--ink); font-weight: 600; }
.${P}rec { margin-top: 8px; font-size: .82rem; color: var(--ink-soft); }
.${P}rec:empty { display: none; }
@media (max-height: 420px) {
  .${P}board { padding: 4px 10px; border-radius: 16px; }
  .${P}face, .${P}face svg { width: 38px; height: 38px; }
  .${P}name { font-size: .9rem; }
  .${P}pips { margin-top: 2px; }
  .${P}pips i { width: 8px; height: 8px; }
  .${P}lamp { width: 24px; height: 24px; }
  .${P}score { font-size: 1.35rem; }
  .${P}msg { font-size: .7rem; }
  .${P}card { padding: 8px 16px 10px; }
  .${P}card h3 { font-size: 1.1rem; margin-bottom: 4px; }
  .${P}card ul { font-size: .8rem; gap: 2px; margin-bottom: 8px; }
  .${P}card .btn.big { font-size: 1.05rem; padding: .55em 1.5em; }
  .${P}rec { margin-top: 4px; }
}
`;

function ensureStyle() {
  if (document.getElementById('style-g-' + ID)) return;
  const s = document.createElement('style');
  s.id = 'style-g-' + ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

export default {
  id: ID,
  start(stage, api) {
    ensureStyle();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const touch = !!api.isTouch;
    const meLook = api.me;
    const themLook = api.partner;
    const wins = api.load('wins', 0) || 0;

    const pips = '<i></i>'.repeat(TOUCHES);
    const root = document.createElement('div');
    root.className = P + 'root';
    root.innerHTML = `
      <div class="${P}board">
        <div class="${P}side" style="--sc:${BLUE}">
          <div class="${P}face">${api.avatar(meLook, 48)}</div>
          <div class="${P}who"><div class="${P}name">${meLook.name}</div><div class="${P}pips">${pips}</div></div>
          <div class="${P}lamp" aria-hidden="true"></div>
        </div>
        <div class="${P}mid"><div class="${P}score" aria-live="polite"><b>0</b><span>:</span><em>0</em></div><div class="${P}msg">First to ${TOUCHES}</div></div>
        <div class="${P}side ${P}r" style="--sc:${RED}">
          <div class="${P}face">${api.avatar(themLook, 48)}</div>
          <div class="${P}who"><div class="${P}name">${themLook.name}</div><div class="${P}pips">${pips}</div></div>
          <div class="${P}lamp" aria-hidden="true"></div>
        </div>
      </div>
      <div class="${P}play">
        <canvas class="${P}cv" role="img" aria-label="Fencing piste"></canvas>
        <div class="${P}hint ${P}off"><kbd>A</kbd><kbd>D</kbd> move<span>|</span><kbd>J</kbd> <b class="${P}hl">lunge</b><span>|</span><kbd>K</kbd> <b class="${P}hp">parry</b></div>
        <div class="${P}pad ${P}off">
          <div class="${P}grp">
            <button class="${P}btn ${P}back" aria-label="Step back">${ICON_ARROW}</button>
            <button class="${P}btn ${P}fwd" aria-label="Step forward">${ICON_ARROW}</button>
          </div>
          <div class="${P}grp">
            <button class="${P}btn ${P}parry" aria-label="Parry">${ICON_SHIELD}Parry</button>
            <button class="${P}btn ${P}lunge" aria-label="Lunge">${ICON_SWORD}Lunge</button>
          </div>
        </div>
        <div class="${P}intro">
          <div class="${P}card">
            <h3>En garde, ${meLook.name}!</h3>
            <ul>
              <li><i></i><span><b>Step in</b> with ${touch ? 'the arrows' : '<kbd>D</kbd> or <kbd>Right</kbd>'} and <b>lunge</b> ${touch ? 'with Lunge' : 'with <kbd>J</kbd> or <kbd>Space</kbd>'} when the gold mark reaches ${themLook.name}.</span></li>
              <li><i></i><span>When ${themLook.name}'s blade <b>flashes</b>, <b>parry</b> ${touch ? 'with Parry' : 'with <kbd>K</kbd> or <kbd>Shift</kbd>'} just before the lunge lands.</span></li>
              <li><i></i><span>After a parry, lunge straight away for a <b>riposte</b>. First to ${TOUCHES} touches wins.</span></li>
            </ul>
            <button class="btn primary big ${P}go" style="--c:${BLUE}">En garde!</button>
            <div class="${P}rec">${wins ? `Duels won: ${wins}` : ''}</div>
          </div>
        </div>
      </div>`;
    stage.appendChild(root);

    const $ = (c) => root.querySelector('.' + P + c);
    const play = $('play');
    const cv = $('cv');
    const ctx = cv.getContext('2d');
    const hint = $('hint');
    const pad = $('pad');
    const intro = $('intro');
    const goBtn = $('go');
    const lungeBtn = $('lunge');
    const parryBtn = $('parry');
    const sides = root.querySelectorAll('.' + P + 'side');
    const lamps = [sides[0].querySelector('.' + P + 'lamp'), sides[1].querySelector('.' + P + 'lamp')];
    const pipEls = [sides[0].querySelectorAll('.' + P + 'pips i'), sides[1].querySelectorAll('.' + P + 'pips i')];
    const scoreEl = $('score');
    const msgEl = $('msg');
    const hintParry = $('hp');

    // ---------------------------------------------------------------- layout
    let W = 1;
    let H = 1;
    let dpr = 1;
    let ppm = 80;
    let GY = 200;
    function resize() {
      const r = play.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ppm = Math.min(W / 8.5, (H * 0.62) / 1.9);
      GY = H * 0.82;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    ro.observe(play);

    // ---------------------------------------------------------------- state
    const mkF = (look, sash, x, dir) => ({
      look,
      sash,
      x,
      dir,
      state: 'idle',
      t: 0,
      ext: EXT,
      checked: true,
      parryCd: 0,
      riposte: 0,
      move: 0,
      stepPh: 0,
      score: 0,
      pose: { ...POSES.idle },
      queue: null,
      queueT: 0,
      wind: 0,
      windExt: EXT,
      windRip: false,
      isRiposte: false,
      tipW: { x, y: -1 },
      head: { x: 0, y: 0 },
      dodge: 0,
    });
    const me = mkF(meLook, BLUE, -GUARD, 1);
    const them = mkF(themLook, RED, GUARD, -1);
    const other = (f) => (f === me ? them : me);

    let phase = 'intro'; // intro | ready | play | point | over
    let phaseT = 0;
    let clock = 0;
    let camX = 0;
    let scorer = null;
    let banner = { text: '', sub: '', color: '#3b2b3f', t: 0 };
    let over = false;
    let raf = 0;
    let lastTs = 0;
    const timers = [];
    const sparks = [];
    const pops = [];
    const keys = { fwd: false, back: false };
    const pads = { fwd: false, back: false };
    const ai = { want: 3, think: 0.4, cd: 1.6, plan: null };

    root.__state = {
      me,
      them,
      get phase() {
        return phase;
      },
      REACH,
    };

    const say = (text) => (msgEl.textContent = text);
    const showBanner = (text, color = '#3b2b3f', sub = '') => (banner = { text, sub, color, t: 0 });
    const pop = (f, text, color) => {
      pops.push({ x: f.x, text, color, t: 0 });
      if (pops.length > 4) pops.shift();
    };
    function updateBoard() {
      scoreEl.innerHTML = `<b>${me.score}</b><span>:</span><em>${them.score}</em>`;
      pipEls[0].forEach((el, i) => el.classList.toggle(P + 'on', i < me.score));
      pipEls[1].forEach((el, i) => el.classList.toggle(P + 'on', i < them.score));
      api.setScore(`${me.score} - ${them.score}`);
    }

    function resetPositions() {
      for (const f of [me, them]) {
        f.x = f === me ? -GUARD : GUARD;
        f.state = 'idle';
        f.t = 0;
        f.checked = true;
        f.parryCd = 0;
        f.riposte = 0;
        f.move = 0;
        f.queue = null;
        f.dodge = 0;
      }
      ai.plan = null;
      ai.cd = 1.2 + Math.random() * 0.9;
      ai.think = 0.3;
      lamps.forEach((l) => l.classList.remove(P + 'on'));
      scorer = null;
      phase = 'ready';
      phaseT = 0;
      showBanner('En garde!', '#3b2b3f');
      say(`First to ${TOUCHES}`);
    }

    function begin() {
      if (phase !== 'intro') return;
      intro.classList.add(P + 'off');
      if (touch) pad.classList.remove(P + 'off');
      else hint.classList.remove(P + 'off');
      api.sfx('tap');
      updateBoard();
      resetPositions();
    }

    // ---------------------------------------------------------------- actions
    function startLunge(f, ext, rip) {
      f.state = 'lunge';
      f.t = 0;
      f.ext = ext;
      f.checked = false;
      f.isRiposte = rip;
      f.riposte = 0;
      f.move = 0;
      api.sfx('swoosh');
      if (f === me) aiOnPlayerLunge();
    }
    function startParry(f) {
      f.state = 'parry';
      f.t = 0;
      f.parryCd = PARRY_ON + PARRY_CD;
      f.move = 0;
    }
    function startWindup(f, wind, ext, rip) {
      f.state = 'windup';
      f.t = 0;
      f.wind = wind;
      f.windExt = ext;
      f.windRip = rip;
      f.move = 0;
    }
    function canLunge(f) {
      return f.state === 'idle' || (f.state === 'parry' && f.riposte > 0);
    }
    function lungeInput() {
      if (phase !== 'play') return;
      if (canLunge(me)) startLunge(me, me.riposte > 0 ? RIP_EXT : EXT, me.riposte > 0);
      else {
        me.queue = 'lunge';
        me.queueT = 0.2;
      }
    }
    function parryInput() {
      if (phase !== 'play') return;
      if (me.state === 'idle' && me.parryCd <= 0) startParry(me);
      else if (me.state !== 'parry') {
        me.queue = 'parry';
        me.queueT = 0.15;
      }
    }

    function resolve(att, def) {
      att.checked = true;
      const dist = Math.abs(att.x - def.x);
      const reach = REACH + 0.12;
      if (dist > reach) {
        pop(att, 'Too far', '#6f5f73');
        if (att === me) aiOnPlayerMiss();
        else say(`${themLook.name} fell short. Counter now!`);
        return;
      }
      if (def.state === 'parry' && def.t <= PARRY_ON + 0.02) {
        att.state = 'parried';
        att.t = 0;
        def.t = Math.min(def.t, PARRY_ON * 0.5);
        def.riposte = RIPOSTE_WIN;
        def.parryCd = 0;
        clash(att);
        api.sfx('tap');
        pop(def, 'Parry!', '#c08a00');
        if (def === me) say('Parry! Riposte now!');
        else {
          say(`${themLook.name} parries!`);
          aiOnParry();
        }
        return;
      }
      if (def.state === 'lunge' && !def.checked && def.ext - def.t <= 0.07) {
        def.checked = true;
        doubleTouch(att);
        return;
      }
      touchScored(att, def);
    }

    function clash(att) {
      for (let i = 0; i < (reduced ? 6 : 12); i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 0.6 + Math.random() * 1.4;
        sparks.push({ x: att.tipW.x, y: att.tipW.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.6, life: 0, max: 0.35 + Math.random() * 0.2, c: Math.random() < 0.5 ? '#ffd166' : '#ffffff' });
      }
    }

    function touchScored(att, def) {
      att.score++;
      def.state = 'hit';
      def.t = 0;
      phase = 'point';
      phaseT = 0;
      scorer = att;
      const i = att === me ? 0 : 1;
      lamps[i].classList.add(P + 'on');
      for (let n = 0; n < (reduced ? 8 : 18); n++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 0.8 + Math.random() * 1.8;
        sparks.push({ x: att.tipW.x, y: att.tipW.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.5, life: 0, max: 0.4 + Math.random() * 0.3, c: att.sash });
      }
      updateBoard();
      const word = att.isRiposte ? 'Riposte!' : 'Touch!';
      showBanner(word, att.sash, `${att.look.name} scores`);
      say(`${att.look.name} scores${att.isRiposte ? ' with a riposte' : ''}`);
      api.sfx(att === me ? 'good' : 'bad');
    }

    function doubleTouch() {
      phase = 'point';
      phaseT = 0;
      scorer = null;
      lamps.forEach((l) => l.classList.add(P + 'on'));
      showBanner('Double touch', '#6f5f73', 'No point');
      say('Both hit at once. No point.');
      api.sfx('tick');
    }

    // ---------------------------------------------------------------- computer
    const parryChance = () => (them.score - me.score >= 2 ? 0.22 : me.score - them.score >= 2 ? 0.42 : 0.32);
    const windDur = () => (me.score + them.score >= 4 ? 0.48 : 0.55);
    function aiOnPlayerLunge() {
      const dist = them.x - me.x;
      if (dist > REACH + 0.2) return;
      if (them.state === 'windup') {
        if (Math.random() < 0.5) ai.plan = { kind: 'parry', at: clock + 0.03 };
        return;
      }
      if (them.state !== 'idle') return;
      const r = Math.random();
      if (r < parryChance()) ai.plan = { kind: 'parry', at: clock + 0.02 + Math.random() * 0.07 };
      else if (r < parryChance() + 0.14) ai.plan = { kind: 'dodge', at: clock + 0.02 };
    }
    function aiOnPlayerMiss() {
      if (them.state === 'idle' && Math.random() < 0.5) ai.plan = { kind: 'attack', at: clock + 0.06 + Math.random() * 0.12, wind: 0.3, ext: EXT, rip: false };
    }
    function aiOnParry() {
      if (Math.random() < 0.55) ai.plan = { kind: 'attack', at: clock + 0.1 + Math.random() * 0.28, wind: 0.14, ext: RIP_EXT, rip: true };
    }
    function updateAI(dt) {
      const dist = them.x - me.x;
      if (ai.plan && clock >= ai.plan.at) {
        const pl = ai.plan;
        ai.plan = null;
        if (pl.kind === 'parry' && (them.state === 'idle' || them.state === 'windup')) startParry(them);
        else if (pl.kind === 'dodge' && them.state === 'idle') them.dodge = 0.35;
        else if (pl.kind === 'attack' && (them.state === 'idle' || (them.state === 'parry' && them.riposte > 0)) && me.state !== 'hit') startWindup(them, pl.wind, pl.ext, pl.rip);
      }
      if (them.state !== 'idle') return;
      if (them.dodge > 0) {
        them.dodge -= dt;
        them.move = -1.4;
        return;
      }
      ai.think -= dt;
      if (ai.think <= 0) {
        ai.think = 0.45 + Math.random() * 0.9;
        ai.want = Math.random() < 0.15 ? 4.2 : 2.1 + Math.random() * 1.7;
        if (them.x > HALF - 1.2) ai.want = Math.min(ai.want, 2.4);
      }
      them.move = dist > ai.want + 0.15 ? 1 : dist < ai.want - 0.15 ? -1 : 0;
      ai.cd -= dt;
      if (ai.cd <= 0 && !ai.plan && me.state !== 'hit') {
        const inRange = dist <= REACH + 0.05;
        const sloppy = dist <= REACH + 0.9 && Math.random() < 0.22;
        if (inRange || sloppy) {
          startWindup(them, windDur(), EXT, false);
          ai.cd = 1.1 + Math.random() * 1.5;
        } else ai.cd = 0.2;
      }
    }

    // ---------------------------------------------------------------- update
    function stepFencer(f, dt, live) {
      f.t += dt;
      f.parryCd -= dt;
      f.riposte = Math.max(0, f.riposte - dt);
      if (f.queue) {
        f.queueT -= dt;
        if (f.queueT <= 0) f.queue = null;
      }
      if (f.state === 'idle' && live && f.move) {
        f.x += f.move * f.dir * SPEED * dt;
        f.stepPh += dt * 2.6 * Math.sign(f.move);
      }
      if (f.state === 'windup') {
        if (live && Math.abs(f.x - other(f).x) > REACH - 0.3) f.x += f.dir * 1.5 * dt;
        if (f.t >= f.wind) startLunge(f, f.windExt, f.windRip);
      } else if (f.state === 'lunge') {
        if (live && !f.checked && f.t >= f.ext) resolve(f, other(f));
        if (f.state === 'lunge' && f.t >= f.ext + HOLD + REC) {
          f.state = 'idle';
          f.t = 0;
        }
      } else if (f.state === 'parry') {
        if (f.t >= PARRY_ON) {
          f.state = 'idle';
          f.t = 0;
        }
      } else if (f.state === 'parried') {
        if (f.t >= PARRIED) {
          f.state = 'idle';
          f.t = 0;
        }
      }
      if (live && f === me && f.queue && f.state === 'idle') {
        const q = f.queue;
        f.queue = null;
        if (q === 'lunge') startLunge(me, me.riposte > 0 ? RIP_EXT : EXT, me.riposte > 0);
        else if (q === 'parry' && me.parryCd <= 0) startParry(me);
      }
      if (live && f === me && f.queue === 'lunge' && f.state === 'parry' && f.riposte > 0) {
        f.queue = null;
        startLunge(me, RIP_EXT, true);
      }
    }

    function keepApart() {
      const lo = -HALF + 0.35;
      const hi = HALF - 0.35;
      me.x = clamp(me.x, lo, hi);
      them.x = clamp(them.x, lo, hi);
      const overlap = me.x - (them.x - MIN_GAP);
      if (overlap > 0) {
        me.x -= overlap / 2;
        them.x += overlap / 2;
        if (them.x > hi) {
          me.x -= them.x - hi;
          them.x = hi;
        }
        if (me.x < lo) {
          them.x += lo - me.x;
          me.x = lo;
        }
      }
    }

    function targetPose(f) {
      switch (f.state) {
        case 'windup':
          return lerpPose(POSES.idle, POSES.windup, ease(clamp(f.t / (f.wind * 0.6), 0, 1)));
        case 'lunge':
          if (f.t < f.ext) return lerpPose(POSES.idle, POSES.lunge, easeOut(f.t / f.ext));
          if (f.t < f.ext + HOLD) return POSES.lunge;
          return lerpPose(POSES.lunge, POSES.idle, ease(clamp((f.t - f.ext - HOLD) / REC, 0, 1)));
        case 'parry':
          return POSES.parry;
        case 'parried':
          return f.t < 0.25 ? POSES.parried : lerpPose(POSES.parried, POSES.idle, ease(clamp((f.t - 0.25) / (PARRIED - 0.25), 0, 1)));
        case 'hit':
          return POSES.hit;
        default: {
          const base = phase === 'point' && scorer === f && f.t > 0.2 ? POSES.salute : POSES.idle;
          if (!f.move || phase !== 'play') return base;
          const s = Math.sin(f.stepPh * Math.PI * 2);
          const fwd = f.move > 0 ? 1 : -1;
          return {
            ...base,
            fx: base.fx + 5 * s * fwd,
            rx: base.rx + 5 * Math.sin(f.stepPh * Math.PI * 2 - 1.4) * fwd,
            lift: Math.max(0, s) * 5,
            hy: base.hy - Math.abs(Math.sin(f.stepPh * Math.PI * 2)) * 1.5,
          };
        }
      }
    }

    function update(dt) {
      clock += dt;
      phaseT += dt;
      banner.t += dt;
      const live = phase === 'play';
      if (phase === 'ready' && phaseT >= READY_DUR) {
        phase = 'play';
        phaseT = 0;
        showBanner('Allez!', BLUE);
        api.sfx('pop');
      }
      if (phase === 'play') {
        const mv = (keys.fwd || pads.fwd ? 1 : 0) - (keys.back || pads.back ? 1 : 0);
        me.move = me.state === 'idle' ? mv : 0;
        updateAI(dt);
      } else {
        me.move = 0;
        them.move = 0;
      }
      if (phase !== 'intro') {
        stepFencer(me, dt, live);
        stepFencer(them, dt, live);
        keepApart();
      }
      if (phase === 'point' && phaseT >= POINT_DUR) {
        if (me.score >= TOUCHES || them.score >= TOUCHES) {
          phase = 'over';
          phaseT = 0;
        } else resetPositions();
      }
      if (phase === 'over' && phaseT >= 0.2 && !over) endDuel();
      // poses
      for (const f of [me, them]) {
        const tp = targetPose(f);
        const rate = f.state === 'lunge' && f.t < f.ext + HOLD ? 45 : 16;
        const a = 1 - Math.exp(-dt * rate);
        for (const key in tp) f.pose[key] += (tp[key] - f.pose[key]) * a;
      }
      // camera follows the middle of the two fencers
      const viewHalf = W / 2 / ppm;
      const mid = clamp((me.x + them.x) / 2, -HALF - 0.8 + viewHalf, HALF + 0.8 - viewHalf);
      camX += (mid - camX) * (1 - Math.exp(-dt * 3));
      for (const s of sparks) {
        s.life += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 3 * dt;
      }
      while (sparks.length && sparks[0].life > sparks[0].max) sparks.shift();
      for (const p of pops) p.t += dt;
      while (pops.length && pops[0].t > 1) pops.shift();
      const warn = phase === 'play' && them.state === 'windup' && !them.windRip;
      const ripWarn = phase === 'play' && them.state === 'windup' && them.windRip;
      parryBtn.classList.toggle(P + 'hot', warn || ripWarn);
      lungeBtn.classList.toggle(P + 'hot', phase === 'play' && me.riposte > 0 && them.state === 'parried');
      hintParry.classList.toggle(P + 'hot', warn || ripWarn);
    }

    function endDuel() {
      over = true;
      const win = me.score >= TOUCHES;
      let n = wins;
      if (win) {
        n = wins + 1;
        api.save('wins', n);
      }
      api.finish({
        win,
        title: win ? `${meLook.name} wins the duel!` : `${themLook.name} wins the duel`,
        text: win
          ? `Final score ${me.score} to ${them.score}. Duels won: ${n}.`
          : `Final score ${me.score} to ${them.score}. Parry when ${themLook.name}'s blade flashes, then riposte.`,
      });
    }

    // ---------------------------------------------------------------- input
    const onDown = (e) => {
      if (over) return;
      const key = e.key;
      if (phase === 'intro') {
        if (key === 'Enter' || key === ' ') {
          e.preventDefault();
          begin();
        }
        return;
      }
      if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        keys.fwd = true;
        e.preventDefault();
      } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        keys.back = true;
        e.preventDefault();
      } else if (key === ' ' || key === 'j' || key === 'J') {
        e.preventDefault();
        if (!e.repeat) lungeInput();
      } else if (key === 'Shift' || key === 'k' || key === 'K') {
        e.preventDefault();
        if (!e.repeat) parryInput();
      }
    };
    const onUp = (e) => {
      const key = e.key;
      if (key === 'ArrowRight' || key === 'd' || key === 'D') keys.fwd = false;
      else if (key === 'ArrowLeft' || key === 'a' || key === 'A') keys.back = false;
    };
    const onBlur = () => {
      keys.fwd = keys.back = false;
      pads.fwd = pads.back = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    goBtn.addEventListener('click', begin);

    const hold = (btn, name) => {
      const on = (e) => {
        e.preventDefault();
        btn.classList.add(P + 'down');
        pads[name] = true;
        try {
          btn.setPointerCapture(e.pointerId);
        } catch {
          /* capture is optional */
        }
      };
      const off = () => {
        btn.classList.remove(P + 'down');
        pads[name] = false;
      };
      btn.addEventListener('pointerdown', on);
      btn.addEventListener('pointerup', off);
      btn.addEventListener('pointercancel', off);
      btn.addEventListener('lostpointercapture', off);
    };
    hold($('fwd'), 'fwd');
    hold($('back'), 'back');
    const tapBtn = (btn, fn) => {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btn.classList.add(P + 'down');
        fn();
      });
      const off = () => btn.classList.remove(P + 'down');
      btn.addEventListener('pointerup', off);
      btn.addEventListener('pointercancel', off);
      btn.addEventListener('pointerleave', off);
    };
    tapBtn(lungeBtn, lungeInput);
    tapBtn(parryBtn, parryInput);

    // ---------------------------------------------------------------- drawing
    const SX = (x) => W / 2 + (x - camX) * ppm;
    const swords = new Path2D(ICONS.fencing);

    function rr(x, y, w, h, r) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    }

    function drawHall() {
      const wallB = H * 0.6;
      const g = ctx.createLinearGradient(0, 0, 0, wallB);
      g.addColorStop(0, '#fff1e2');
      g.addColorStop(1, '#ffe6d3');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, wallB);
      // windows and banners move a little slower than the piste
      const pf = 0.45;
      const u = ppm * 0.9;
      const off = camX * ppm * pf;
      const step = 3.4 * u;
      const i0 = Math.floor((off - W / 2 - step) / step);
      const i1 = Math.ceil((off + W / 2 + step) / step);
      const winTop = H * 0.08;
      const winH = Math.min(H * 0.32, wallB - H * 0.22);
      for (let i = i0; i <= i1; i++) {
        const x = W / 2 + i * step - off;
        const ww = 1.25 * u;
        ctx.fillStyle = '#fffaf3';
        rr(x - ww / 2 - 6, winTop - 6, ww + 12, winH + 12, [ww / 2 + 6, ww / 2 + 6, 8, 8]);
        ctx.fill();
        const sg = ctx.createLinearGradient(0, winTop, 0, winTop + winH);
        sg.addColorStop(0, '#a9dcff');
        sg.addColorStop(1, '#dff3ff');
        ctx.fillStyle = sg;
        rr(x - ww / 2, winTop, ww, winH, [ww / 2, ww / 2, 4, 4]);
        ctx.fill();
        ctx.strokeStyle = '#fffaf3';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, winTop);
        ctx.lineTo(x, winTop + winH);
        ctx.moveTo(x - ww / 2, winTop + winH * 0.55);
        ctx.lineTo(x + ww / 2, winTop + winH * 0.55);
        ctx.stroke();
        // banner between windows
        const bx = x + step / 2;
        const bw = 0.7 * u;
        const bh = Math.min(winH * 0.9, 1.3 * u);
        const col = i % 2 ? RED : BLUE;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(bx - bw / 2, winTop);
        ctx.lineTo(bx + bw / 2, winTop);
        ctx.lineTo(bx + bw / 2, winTop + bh);
        ctx.lineTo(bx, winTop + bh - bw * 0.35);
        ctx.lineTo(bx - bw / 2, winTop + bh);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#c99a5b';
        rr(bx - bw / 2 - 5, winTop - 5, bw + 10, 6, 3);
        ctx.fill();
        ctx.save();
        const is = bw * 0.7;
        ctx.translate(bx - is / 2, winTop + bh * 0.42 - is / 2);
        ctx.scale(is / 24, is / 24);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.stroke(swords);
        ctx.restore();
      }
      // bunting
      const bOff = mod(off * 1.1, 0.55 * u);
      ctx.strokeStyle = 'rgba(160,120,90,.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.04);
      ctx.quadraticCurveTo(W / 2, H * 0.1, W, H * 0.04);
      ctx.stroke();
      const flagCols = ['#ffd166', '#ff9eb5', '#7fd3a7', '#6fb8ff', '#c7a6ff'];
      for (let x = -bOff; x < W + 20; x += 0.55 * u) {
        const t = x / W;
        const y = H * 0.04 + (1 - (2 * t - 1) * (2 * t - 1)) * H * 0.03;
        const idx = Math.abs(Math.round((x + off * 1.1) / (0.55 * u))) % flagCols.length;
        ctx.fillStyle = flagCols[idx];
        ctx.beginPath();
        ctx.moveTo(x - 0.16 * u, y);
        ctx.lineTo(x + 0.16 * u, y);
        ctx.lineTo(x, y + 0.3 * u);
        ctx.closePath();
        ctx.fill();
      }
      // wainscot
      ctx.fillStyle = '#f6d7bd';
      ctx.fillRect(0, wallB - H * 0.1, W, H * 0.1);
      ctx.fillStyle = '#ecc5a5';
      ctx.fillRect(0, wallB - H * 0.1, W, 4);
      ctx.strokeStyle = 'rgba(180,120,80,.18)';
      ctx.lineWidth = 2;
      const pstep = 1.2 * u;
      for (let x = -mod(off, pstep); x < W; x += pstep) {
        ctx.beginPath();
        ctx.moveTo(x, wallB - H * 0.085);
        ctx.lineTo(x, wallB - 4);
        ctx.stroke();
      }
      // floor
      const fg = ctx.createLinearGradient(0, wallB, 0, H);
      fg.addColorStop(0, '#e4bb8c');
      fg.addColorStop(1, '#d7a777');
      ctx.fillStyle = fg;
      ctx.fillRect(0, wallB, W, H - wallB);
      ctx.strokeStyle = 'rgba(150,95,55,.18)';
      ctx.lineWidth = 1.5;
      for (let i = 1; i < 6; i++) {
        const y = wallB + (H - wallB) * Math.pow(i / 6, 1.3);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      const seam = 1.6 * ppm;
      for (let x = -mod(camX * ppm, seam); x < W; x += seam) {
        ctx.beginPath();
        ctx.moveTo(x, wallB);
        ctx.lineTo(x + (x - W / 2) * 0.25, H);
        ctx.stroke();
      }
    }

    function drawPiste() {
      const top = GY - 0.3 * ppm;
      const bot = GY + 0.32 * ppm;
      const x0 = SX(-HALF);
      const x1 = SX(HALF);
      ctx.fillStyle = 'rgba(90,60,40,.18)';
      rr(x0 - 4, bot - 2, x1 - x0 + 8, 10, 5);
      ctx.fill();
      ctx.fillStyle = '#a9b8cf';
      rr(x0, top + 4, x1 - x0, bot - top, 6);
      ctx.fill();
      const g = ctx.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, '#e9eff8');
      g.addColorStop(1, '#cfdaea');
      ctx.fillStyle = g;
      rr(x0, top, x1 - x0, bot - top, 6);
      ctx.fill();
      // warning zones near the ends
      ctx.fillStyle = 'rgba(229,72,77,.18)';
      ctx.fillRect(x0, top, SX(-HALF + 2) - x0, bot - top);
      ctx.fillRect(SX(HALF - 2), top, x1 - SX(HALF - 2), bot - top);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, ppm * 0.035);
      for (const m of [-HALF, -HALF + 2, -GUARD, 0, GUARD, HALF - 2, HALF]) {
        const x = SX(m);
        ctx.beginPath();
        ctx.moveTo(x, top + 2);
        ctx.lineTo(x, bot - 2);
        ctx.stroke();
      }
    }

    function drawRange() {
      if (phase !== 'play') return;
      const inRange = them.x - me.x <= REACH + 0.12;
      const mx = SX(me.x + REACH);
      const y = GY + 0.12 * ppm;
      ctx.strokeStyle = inRange ? 'rgba(255,193,61,.95)' : 'rgba(255,255,255,.75)';
      ctx.lineWidth = Math.max(2, ppm * 0.03);
      ctx.setLineDash([ppm * 0.08, ppm * 0.08]);
      ctx.beginPath();
      ctx.moveTo(SX(me.x + 0.55), y);
      ctx.lineTo(mx, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = inRange ? '#ffc13d' : 'rgba(255,255,255,.9)';
      ctx.beginPath();
      const r = ppm * 0.09;
      ctx.moveTo(mx + r, y);
      ctx.lineTo(mx - r * 0.6, y - r);
      ctx.lineTo(mx - r * 0.6, y + r);
      ctx.closePath();
      ctx.fill();
    }

    function ik(hx, hy, fx, fy, L) {
      const dx = fx - hx;
      const dy = fy - hy;
      const d = Math.min(Math.hypot(dx, dy), 2 * L - 0.01);
      const a = Math.atan2(dy, dx);
      const off = Math.acos(clamp(d / (2 * L), -1, 1));
      const ka = a - off;
      return { kx: hx + Math.cos(ka) * L, ky: hy + Math.sin(ka) * L, fx: hx + Math.cos(a) * d, fy: hy + Math.sin(a) * d };
    }

    function limb(pts, w, col, line) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
      ctx.strokeStyle = line;
      ctx.lineWidth = w + 2.6;
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.stroke();
    }

    function drawHair(look, hx, hy) {
      const c = look.hair || '#2a1a13';
      const acc = look.accent || '#ff7fa3';
      ctx.fillStyle = c;
      const st = look.hairstyle || 'short';
      ctx.beginPath();
      if (st === 'pigtails') {
        ctx.ellipse(hx - 15, hy + 4, 6.5, 7.5, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(hx - 19, hy + 12, 5, 6, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = acc;
        ctx.beginPath();
        ctx.arc(hx - 12.5, hy + 1, 2.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (st === 'ponytail') {
        ctx.ellipse(hx - 18, hy + 4, 5, 10, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = acc;
        ctx.beginPath();
        ctx.arc(hx - 14, hy - 2, 2.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (st === 'buns') {
        ctx.arc(hx - 9, hy - 13, 6.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (st === 'long') {
        ctx.roundRect(hx - 17, hy - 4, 10, 28, 5);
        ctx.fill();
      } else if (st === 'bob') {
        ctx.ellipse(hx - 12, hy + 9, 6.5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.ellipse(hx - 12, hy + 10, 4.5, 3.4, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawMask(f, hx, hy) {
      drawHair(f.look, hx, hy);
      ctx.fillStyle = '#fbf9fd';
      ctx.strokeStyle = '#bdb5c8';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(hx, hy, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // mesh front
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(hx + 4.5, hy - 0.5, 11.5, 14, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#4a4352';
      ctx.fill();
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,.22)';
      ctx.lineWidth = 0.8;
      for (let i = -16; i <= 16; i += 3.2) {
        ctx.beginPath();
        ctx.moveTo(hx + i - 6, hy - 16);
        ctx.lineTo(hx + i + 6, hy + 16);
        ctx.moveTo(hx + i + 6, hy - 16);
        ctx.lineTo(hx + i - 6, hy + 16);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = '#d9d3e2';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(hx + 4.5, hy - 0.5, 11.5, 14, 0, 0, Math.PI * 2);
      ctx.stroke();
      // bib
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#bdb5c8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(hx + 5, hy + 14, 9, 4.5, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (f.look.gender === 'girl') {
        const acc = f.look.accent || '#ff7fa3';
        ctx.fillStyle = acc;
        ctx.beginPath();
        ctx.ellipse(hx - 10, hy - 11, 4.2, 3, -0.6, 0, Math.PI * 2);
        ctx.ellipse(hx - 4, hy - 15, 4.2, 3, -0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hx - 7, hy - 13, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawFencer(f) {
      const o = other(f);
      const s = ppm * UNIT;
      const sx = SX(f.x);
      const p = f.pose;
      const line = '#b9b1c4';
      const white = '#fdfbf8';
      ctx.save();
      ctx.translate(sx, GY);
      ctx.fillStyle = 'rgba(40,50,90,.16)';
      ctx.beginPath();
      ctx.ellipse(f.dir * (p.hx + (p.fx + p.rx) / 2) * s * 0.5, 2, (Math.abs(p.fx - p.rx) / 2 + 12) * s, 5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.scale(f.dir * s, s);
      const hx = p.hx;
      const hy = p.hy;
      const nx = hx + Math.sin(p.lean) * 28;
      const ny = hy - Math.cos(p.lean) * 28;
      const shx = nx - 0.7;
      const shy = ny + 3;
      const hdx = nx + 3 * Math.cos(p.lean) + 17 * Math.sin(p.lean);
      const hdy = ny + 3 * Math.sin(p.lean) - 17 * Math.cos(p.lean);
      // back arm
      const e2x = shx + Math.cos(p.bU) * 15;
      const e2y = shy + Math.sin(p.bU) * 15;
      const h2x = e2x + Math.cos(p.bF) * 13;
      const h2y = e2y + Math.sin(p.bF) * 13;
      limb([shx, shy, e2x, e2y, h2x, h2y], 8, white, line);
      ctx.fillStyle = f.look.skin || '#f8dccb';
      ctx.beginPath();
      ctx.arc(h2x, h2y, 3.6, 0, Math.PI * 2);
      ctx.fill();
      // rear leg
      const rl = ik(hx - 3, hy, p.rx, 0, 24);
      limb([hx - 3, hy, rl.kx, rl.ky, rl.fx, rl.fy], 9, white, line);
      shoe(rl.fx, rl.fy, 9);
      // torso and sash
      limb([hx, hy + 2, nx, ny], 21, white, line);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(hx - 11, hy + 6);
      ctx.lineTo(nx - 11, ny - 4);
      ctx.lineTo(nx + 11, ny - 4);
      ctx.lineTo(hx + 11, hy + 6);
      ctx.closePath();
      ctx.clip();
      ctx.strokeStyle = f.sash;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(nx - 13, ny - 1);
      ctx.lineTo(hx + 13, hy - 2);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = f.sash;
      ctx.beginPath();
      ctx.ellipse(hx + 8, hy - 1, 3.2, 4.2, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // front leg
      const fl = ik(hx + 3, hy, p.fx, -p.lift, 24);
      limb([hx + 3, hy, fl.kx, fl.ky, fl.fx, fl.fy], 9.5, white, line);
      shoe(fl.fx, fl.fy, 13);
      // head
      drawMask(f, hdx, hdy);
      // sword arm, blade, guard
      const ex = shx + Math.cos(p.aU) * 17;
      const ey = shy + Math.sin(p.aU) * 17;
      const hdX = ex + Math.cos(p.aF) * 16;
      const hdY = ey + Math.sin(p.aF) * 16;
      limb([shx, shy, ex, ey, hdX, hdY], 8.5, white, line);
      const dx = Math.cos(p.aB);
      const dy = Math.sin(p.aB);
      const gx = hdX + dx * 2;
      const gy = hdY + dy * 2;
      let tx = gx + dx * 54;
      let ty = gy + dy * 54;
      const surf = Math.abs(o.x - f.x) / UNIT - 11 - o.pose.hx;
      let bent = false;
      if (tx > surf && ty > -82 && ty < -28 && o.state !== 'parry') {
        ty = ty - (tx - surf) * 0.9;
        tx = surf;
        bent = true;
      }
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#7f889a';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      if (bent) ctx.quadraticCurveTo(gx + dx * 30, gy + dy * 30, tx, ty);
      else ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.strokeStyle = '#eef2f8';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = '#7f889a';
      ctx.beginPath();
      ctx.arc(tx, ty, 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = white;
      ctx.strokeStyle = line;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(hdX, hdY, 4.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.save();
      ctx.translate(gx + dx * 2, gy + dy * 2);
      ctx.rotate(p.aB);
      ctx.fillStyle = '#dfe5ee';
      ctx.strokeStyle = '#8f98aa';
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.6, 8.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      ctx.restore();
      f.tipW = { x: f.x + f.dir * tx * UNIT, y: ty * UNIT };
      f.head = { x: sx + f.dir * hdx * s, y: GY + hdy * s };
      f.tipS = { x: sx + f.dir * tx * s, y: GY + ty * s };
    }

    function shoe(x, y, len) {
      ctx.fillStyle = '#f1eef6';
      ctx.strokeStyle = '#a49cb2';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(x - 4, y - 5, len, 6, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#8f86a0';
      ctx.fillRect(x - 4, y, len, 1.6);
    }

    function star(x, y, r, col) {
      ctx.fillStyle = col;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 ? r * 0.42 : r;
        ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
    }

    function drawTelegraph() {
      if (them.state !== 'windup' || !them.tipS) return;
      const k = clamp(them.t / them.wind, 0, 1);
      const late = k > 0.45;
      const blink = reduced ? 1 : late ? (Math.floor(clock * 16) % 2 ? 1 : 0.55) : 0.7 + 0.3 * Math.sin(clock * 10);
      const r = ppm * (0.08 + 0.12 * k) * blink;
      const g = ctx.createRadialGradient(them.tipS.x, them.tipS.y, 0, them.tipS.x, them.tipS.y, r * 2.4);
      g.addColorStop(0, 'rgba(255,240,170,.95)');
      g.addColorStop(1, 'rgba(255,209,102,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(them.tipS.x, them.tipS.y, r * 2.4, 0, Math.PI * 2);
      ctx.fill();
      star(them.tipS.x, them.tipS.y, r, late ? '#ffffff' : '#ffd166');
      // warning bubble over the mask
      const bx = them.head.x;
      const by = them.head.y - ppm * 0.52;
      const br = ppm * 0.17;
      ctx.fillStyle = '#fffaf3';
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = RED;
      ctx.lineWidth = Math.max(2, ppm * 0.03);
      ctx.stroke();
      ctx.fillStyle = RED;
      rr(bx - br * 0.14, by - br * 0.6, br * 0.28, br * 0.75, br * 0.14);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx, by + br * 0.45, br * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawFx() {
      for (const sp of sparks) {
        const a = clamp(1 - sp.life / sp.max, 0, 1);
        ctx.globalAlpha = a;
        star(SX(sp.x), GY + sp.y * ppm, ppm * 0.06 * (0.6 + a), sp.c);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fs = Math.round(clamp(ppm * 0.2, 14, 24));
      for (const p of pops) {
        const a = clamp(1.3 - p.t, 0, 1);
        const y = GY - 2.15 * ppm - (reduced ? 0 : p.t * 22);
        ctx.globalAlpha = a;
        ctx.font = `700 ${fs}px ${FONT}`;
        ctx.lineWidth = 5;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#fffaf3';
        ctx.strokeText(p.text, SX(p.x), y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, SX(p.x), y);
      }
      ctx.globalAlpha = 1;
      if (phase === 'play' && me.riposte > 0 && them.state === 'parried') {
        const pulse = reduced ? 1 : 0.85 + 0.15 * Math.sin(clock * 18);
        ctx.font = `700 ${fs}px ${FONT}`;
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#fffaf3';
        const label = touch ? 'Lunge now!' : 'Lunge now! J';
        ctx.globalAlpha = pulse;
        ctx.strokeText(label, SX(me.x), GY - 2.5 * ppm);
        ctx.fillStyle = BLUE;
        ctx.fillText(label, SX(me.x), GY - 2.5 * ppm);
        ctx.globalAlpha = 1;
      }
    }

    function drawBanner() {
      if (!banner.text) return;
      const life = banner.text === 'Allez!' ? 0.75 : banner.text === 'En garde!' ? READY_DUR : POINT_DUR;
      if (banner.t > life) return;
      const k = banner.t / life;
      const a = clamp(Math.min(banner.t * 8, (1 - k) * 5), 0, 1);
      const sc = reduced ? 1 : 1 + 0.2 * Math.max(0, 1 - banner.t * 6);
      const size = Math.round(clamp(Math.min(W * 0.07, H * 0.14), 26, 60));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(W / 2, H * 0.2);
      ctx.scale(sc, sc);
      ctx.font = `700 ${size}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = size * 0.16;
      ctx.strokeStyle = '#fffaf3';
      ctx.strokeText(banner.text, 0, 0);
      ctx.fillStyle = banner.color;
      ctx.fillText(banner.text, 0, 0);
      if (banner.sub) {
        ctx.font = `600 ${Math.round(size * 0.38)}px ${FONT}`;
        ctx.lineWidth = size * 0.1;
        ctx.strokeText(banner.sub, 0, size * 0.72);
        ctx.fillStyle = '#3b2b3f';
        ctx.fillText(banner.sub, 0, size * 0.72);
      }
      ctx.restore();
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawHall();
      drawPiste();
      drawRange();
      drawFencer(them);
      drawFencer(me);
      drawTelegraph();
      drawFx();
      drawBanner();
    }

    function mod(a, n) {
      return ((a % n) + n) % n;
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
      for (const t of timers) clearTimeout(t);
      ro.disconnect();
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
      root.__state = null;
      root.remove();
    };
  },
};
