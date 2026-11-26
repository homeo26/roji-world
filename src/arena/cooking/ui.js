import { PAL, drawFrame, frameLayout, artReady } from '../../interiors/yumyum/theme.js';
import { url } from './art.js';
import { DISH, HOW, LEVELS, NEED, totalStars, isOpen } from './data.js';

// The YumYum Kitchen's screens in Roji's logo style (cream paper, raspberry ink, the pink arch):
// the order tickets, clock and score while cooking, and the framed cards for levels, recipes and results.

const STAR = 'M12 2.6l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z';
export const starSvg = (on, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24"><path d="${STAR}" fill="${on ? PAL.gold : PAL.blush}" stroke="${on ? '#b98222' : PAL.frame}" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
const LOCK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${PAL.inkDeep}" stroke-width="2.6" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`;
const coin = '<i class="ck2-coin"></i>';
const STEP_ICON = { chop: 'step:chop', pan: 'step:pan', pot: 'step:pot', jug: 'step:jug', spit: 'step:spit' };

const CSS = `
body.ck2-on #arena .a-title { background: ${PAL.paper}; color: ${PAL.inkDeep}; box-shadow: 0 0 0 2px ${PAL.band}, 0 6px 18px rgba(120,40,60,.16); }
body.ck2-on #arena .a-title span { color: ${PAL.frame}; }
body.ck2-on #arena .a-close { background: ${PAL.paper}; color: ${PAL.inkDeep}; box-shadow: 0 0 0 2px ${PAL.band}, 0 6px 18px rgba(120,40,60,.18); }
body.ck2-on #arena .a-msg { color: ${PAL.paper}; text-shadow: 0 3px 0 ${PAL.inkDeep}, 0 0 2px ${PAL.inkDeep}, 0 10px 28px rgba(120,30,60,.45); }
body.ck2-on #arena .a-hint { background: ${PAL.paper}; color: ${PAL.inkDeep}; box-shadow: 0 0 0 2px ${PAL.band}; bottom: max(8px, env(safe-area-inset-bottom)); font-size: .78rem; padding: 4px 12px; }
body.ck2-on.ck2-play #arena .a-title, body.ck2-on #arena .a-score { display: none; }
body.ck2-on.ck2-cardopen #arena { z-index: 46; }
body.ck2-on.ck2-cardopen #arena .a-hint, body.ck2-on.ck2-cardopen #arena .a-btns, body.ck2-on.ck2-cardopen #stick, body.ck2-on.ck2-cardopen #joy { display: none !important; }
@media (max-height: 520px) { body.ck2-on.ck2-cardopen #arena .a-title { display: none; } }
body.ck2-on.touch #arena .a-btns { display: grid; grid-template-columns: 62px 82px; grid-template-rows: 62px 82px; gap: 6px; align-items: center; justify-items: center; }
body.ck2-on.touch #arena .a-btn { width: 62px; height: 62px; font-size: .72rem; line-height: 1.05; padding: 0 4px; }
body.ck2-on.touch #arena .a-btn.main { width: 82px; height: 82px; font-size: .82rem; background: ${PAL.ink}; }
body.ck2-on.touch #arena .a-btn[data-b="swap"] { grid-area: 1 / 1; }
body.ck2-on.touch #arena .a-btn[data-b="jump"] { grid-area: 1 / 2; background: #7cc95a; color: #fff; }
body.ck2-on.touch #arena .a-btn[data-b="dash"] { grid-area: 2 / 1; }
body.ck2-on.touch #arena .a-btn[data-b="action"] { grid-area: 2 / 2; }
.ck2-hud { position: fixed; z-index: 41; left: 0; right: 0; top: max(8px, env(safe-area-inset-top)); pointer-events: none; font-family: var(--font, 'Fredoka', system-ui, sans-serif); color: ${PAL.inkDeep}; display: none; }
body.ck2-play .ck2-hud { display: block; }
.ck2-clock { position: absolute; left: max(10px, env(safe-area-inset-left)); top: 0; width: 64px; height: 64px; border-radius: 50%; background: ${PAL.paper}; box-shadow: 0 0 0 3px ${PAL.band}, 0 6px 16px rgba(120,40,60,.18); display: grid; place-items: center; font-weight: 700; font-size: 1.05rem; }
.ck2-clock svg { position: absolute; inset: 4px; width: 56px; height: 56px; transform: rotate(-90deg); }
.ck2-clock span { position: relative; }
.ck2-clock.late { color: #e5484d; animation: ck2-blink .5s infinite alternate; }
.ck2-score { position: absolute; right: calc(max(12px, env(safe-area-inset-right)) + 52px); top: 4px; background: ${PAL.paper}; border-radius: 18px; padding: 6px 12px 6px 8px; box-shadow: 0 0 0 3px ${PAL.band}, 0 6px 16px rgba(120,40,60,.16); display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 1.25rem; min-width: 70px; }
.ck2-score b { display: inline-block; transition: transform .15s; }
.ck2-score b.bump { transform: scale(1.3); }
.ck2-score small { position: absolute; left: 50%; top: 100%; transform: translateX(-50%); margin-top: 7px; white-space: nowrap; font-size: .72rem; color: ${PAL.inkDeep}; background: ${PAL.paper}; border-radius: 99px; padding: 1px 8px; box-shadow: 0 0 0 2px ${PAL.band}; }
.ck2-score .ck2-goal { display: flex; gap: 1px; }
.ck2-score .ck2-goal svg { width: 14px; height: 14px; }
.ck2-coin { width: 24px; height: 24px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff3c4 0 18%, #f4c24f 20% 62%, #c9921e 64%); box-shadow: inset 0 0 0 2px #e0a82e; display: inline-block; flex: none; }
.ck2-orders { position: absolute; left: calc(max(10px, env(safe-area-inset-left)) + 76px); right: calc(max(12px, env(safe-area-inset-right)) + 150px); top: 0; height: 104px; display: flex; gap: 8px; align-items: flex-start; }
.ck2-tk { position: relative; width: 116px; flex: none; background: ${PAL.paper}; border-radius: 14px; box-shadow: 0 0 0 2.5px ${PAL.band}, 0 6px 14px rgba(120,40,60,.16); padding: 9px 6px 6px; display: flex; flex-direction: column; align-items: center; gap: 2px; transition: transform .35s cubic-bezier(.2,1.3,.4,1), opacity .3s; animation: ck2-in .45s cubic-bezier(.2,1.3,.4,1); }
.ck2-tk .bar { position: absolute; left: 6px; right: 6px; top: 4px; height: 6px; border-radius: 6px; background: ${PAL.blush}; overflow: hidden; }
.ck2-tk .bar b { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 6px; background: #7cc95a; }
.ck2-tk .dish { width: 52px; height: 52px; }
.ck2-tk .nm { font-size: .64rem; font-weight: 600; color: ${PAL.inkDeep}; white-space: nowrap; line-height: 1; margin-top: -2px; }
.ck2-tk .ings { display: flex; gap: 2px; flex-wrap: wrap; justify-content: center; }
.ck2-tk .ing { position: relative; width: 24px; height: 24px; border-radius: 7px; background: #fff; box-shadow: inset 0 0 0 1.5px ${PAL.band}; }
.ck2-tk .ing img { width: 24px; height: 24px; display: block; }
.ck2-tk .ing .st { position: absolute; right: -4px; bottom: -4px; width: 14px; height: 14px; border-radius: 50%; background: ${PAL.paper}; box-shadow: 0 0 0 1px ${PAL.band}; }
.ck2-tk.late { animation: ck2-shake .35s infinite; }
.ck2-tk.done { transform: translateY(-14px) scale(1.06); opacity: 0; box-shadow: 0 0 0 3px #7cc95a; }
.ck2-tk.miss { transform: translateY(16px) rotate(-8deg); opacity: 0; box-shadow: 0 0 0 3px #e5484d; }
.ck2-tk.first { box-shadow: 0 0 0 3px ${PAL.ink}, 0 6px 14px rgba(120,40,60,.2); }
.ck2-banner { position: fixed; z-index: 42; left: 50%; top: calc(max(8px, env(safe-area-inset-top)) + 116px); transform: translate(-50%, -10px); background: ${PAL.ink}; color: ${PAL.paper}; font: 700 1.05rem var(--font, 'Fredoka', system-ui); padding: 6px 16px 7px; border-radius: 99px; box-shadow: 0 6px 18px rgba(120,30,60,.3); opacity: 0; transition: opacity .2s, transform .3s cubic-bezier(.2,1.4,.4,1); pointer-events: none; white-space: nowrap; }
.ck2-banner.on { opacity: 1; transform: translate(-50%, 0); }
.ck2-banner.bad { background: #e5484d; }
.ck2-banner.warn { background: #ffb02e; color: #4a2b3a; }
.ck2-banner.good { background: #4fae5a; }
.ck2-words { position: fixed; inset: 0; z-index: 40; pointer-events: none; font-family: var(--font, 'Fredoka', system-ui, sans-serif); }
.ck2-w { position: absolute; left: 0; top: 0; white-space: nowrap; font-weight: 700; will-change: transform; }
.ck2-pop { color: var(--c, #fff); font-size: 1.35rem; text-shadow: 0 2px 0 ${PAL.inkDeep}, 0 0 2px ${PAL.inkDeep}; }
.ck2-bad { color: #fff; font-size: 1.1rem; text-shadow: 0 2px 0 #b8202a, 0 0 2px #b8202a; }
.ck2-say { background: #fffdf8; color: ${PAL.inkDeep}; border-radius: 14px; padding: 4px 10px 5px; font-size: .88rem; box-shadow: 0 0 0 2px ${PAL.band}, 0 4px 10px rgba(80,30,40,.18); }
.ck2-say::after { content: ''; position: absolute; left: 50%; bottom: -7px; margin-left: -6px; border: 6px solid transparent; border-top-color: #fffdf8; border-bottom: 0; }
.ck2-tag { position: absolute; font: 700 .7rem var(--font, 'Fredoka', system-ui); color: #fff; padding: 1px 7px 2px; border-radius: 99px; white-space: nowrap; transform: translate(-50%, -100%); }
.ck2-layer { position: fixed; inset: 0; z-index: 45; display: grid; place-items: center; background: rgba(90,30,50,.28); font-family: var(--font, 'Fredoka', system-ui, sans-serif); color: ${PAL.inkDeep}; }
.ck2-card { position: relative; width: min(800px, 95vw); height: min(580px, 93vh); animation: ck2-pop .28s cubic-bezier(.2,1.3,.4,1); filter: drop-shadow(0 18px 40px rgba(90,20,40,.35)); }
.ck2-frame { position: absolute; inset: 0; width: 100%; height: 100%; }
.ck2-title { position: absolute; left: 0; right: 0; text-align: center; transform: translateY(-50%); pointer-events: none; }
.ck2-title small { display: block; font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: ${PAL.frame}; font-weight: 600; }
.ck2-title b { display: block; font-size: 1.5rem; line-height: 1.1; color: ${PAL.ink}; }
.ck2-body { position: absolute; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
.ck2-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; align-items: center; }
.ck2-btn { border: 0; border-radius: 999px; padding: .55em 1.2em; font: 600 1rem var(--font, 'Fredoka', system-ui); cursor: pointer; background: ${PAL.blush}; color: ${PAL.inkDeep}; box-shadow: inset 0 0 0 2px ${PAL.band}; }
.ck2-btn.go { background: ${PAL.ink}; color: ${PAL.paper}; box-shadow: 0 4px 0 ${PAL.inkDeep}; }
.ck2-btn:hover, .ck2-btn:focus-visible { filter: brightness(1.05); outline: none; transform: translateY(-1px); }
.ck2-pill { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; background: ${PAL.paper}; border-radius: 99px; padding: 3px 12px 3px 8px; box-shadow: inset 0 0 0 2px ${PAL.band}; }
.ck2-pill svg { width: 20px; height: 20px; }
.ck2-levels { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; width: 100%; }
.ck2-lv { position: relative; border: 0; border-radius: 16px; padding: 6px 4px; background: ${PAL.paper}; color: ${PAL.inkDeep}; font: 600 .8rem var(--font, system-ui); cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 2px; box-shadow: inset 0 0 0 2px ${PAL.band}; min-height: 92px; justify-content: center; }
.ck2-lv b { font-size: 1.3rem; line-height: 1; color: ${PAL.ink}; }
.ck2-lv span { font-size: .74rem; line-height: 1.1; }
.ck2-lv em { font-style: normal; font-size: .62rem; color: ${PAL.frame}; }
.ck2-lv .stars svg { width: 17px; height: 17px; }
.ck2-lv .menu { display: flex; gap: 1px; }
.ck2-lv .menu img { width: 20px; height: 20px; }
.ck2-lv.next { box-shadow: inset 0 0 0 3px ${PAL.ink}, 0 0 0 3px ${PAL.blush}; }
.ck2-lv:disabled { opacity: .6; cursor: default; background: ${PAL.blush}; }
.ck2-lv:hover:not(:disabled), .ck2-lv:focus-visible { background: #fff3f2; outline: none; }
.ck2-mode { display: inline-flex; border-radius: 99px; box-shadow: inset 0 0 0 2px ${PAL.band}; background: ${PAL.paper}; padding: 3px; gap: 2px; }
.ck2-mode button { border: 0; border-radius: 99px; padding: .3em .9em; font: 600 .86rem var(--font, system-ui); background: transparent; color: ${PAL.inkDeep}; cursor: pointer; }
.ck2-mode button.on { background: ${PAL.ink}; color: ${PAL.paper}; }
body.touch .ck2-mode, body.touch .ck2-keys { display: none; }
.ck2-recipes { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.ck2-rc { background: #fffdf8; border-radius: 16px; box-shadow: inset 0 0 0 2px ${PAL.band}; padding: 6px 10px 8px; display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 120px; }
.ck2-rc > img { width: 58px; height: 58px; }
.ck2-rc b { font-size: .84rem; color: ${PAL.ink}; }
.ck2-rc .chain { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; justify-content: center; }
.ck2-rc .chain span { display: inline-flex; align-items: center; gap: 0; background: ${PAL.paper}; border-radius: 9px; padding: 1px 3px; box-shadow: inset 0 0 0 1.5px ${PAL.band}; }
.ck2-rc .chain img { width: 24px; height: 24px; }
.ck2-rc .chain img.st { width: 18px; height: 18px; }
.ck2-rc .pts { font-size: .7rem; color: ${PAL.frame}; }
.ck2-twist { font-size: .9rem; line-height: 1.3; max-width: 560px; background: ${PAL.blush}; border-radius: 14px; padding: 6px 14px; }
.ck2-goal { display: flex; gap: 14px; font-weight: 700; font-size: .95rem; }
.ck2-goal span { display: inline-flex; align-items: center; gap: 1px; }
.ck2-goal svg { width: 17px; height: 17px; }
.ck2-keys { font-size: .74rem; color: ${PAL.frame}; line-height: 1.35; }
.ck2-small { font-size: .8rem; color: ${PAL.frame}; }
.ck2-big svg { width: 50px; height: 50px; }
.ck2-big .s { opacity: 0; transform: scale(.3); }
.ck2-big .s.on { animation: ck2-star .5s cubic-bezier(.2,1.6,.4,1) forwards; }
.ck2-big .s.off { animation: ck2-fade .3s forwards; }
.ck2-stats { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; font-size: .84rem; }
.ck2-stats span { background: ${PAL.paper}; border-radius: 99px; padding: 2px 10px; box-shadow: inset 0 0 0 2px ${PAL.band}; }
.ck2-new { background: #e9f3d6; color: ${PAL.oliveDeep}; border-radius: 99px; padding: 2px 12px; font-weight: 700; font-size: .86rem; }
.ck2-final { font-size: 2.1rem; font-weight: 700; color: ${PAL.ink}; display: flex; align-items: center; gap: 8px; line-height: 1; }
.ck2-final .ck2-coin { width: 30px; height: 30px; }
@keyframes ck2-in { from { transform: translateX(60px) scale(.8); opacity: 0; } }
@keyframes ck2-pop { from { transform: scale(.9); opacity: 0; } }
@keyframes ck2-star { 0% { opacity: 0; transform: scale(.3) rotate(-30deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes ck2-fade { to { opacity: .35; transform: scale(.85); } }
@keyframes ck2-blink { to { opacity: .55; } }
@keyframes ck2-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-2px) rotate(-1deg); } 75% { transform: translateX(2px) rotate(1deg); } }
@media (max-height: 520px) {
  .ck2-clock { width: 50px; height: 50px; font-size: .86rem; }
  .ck2-clock svg { inset: 3px; width: 44px; height: 44px; }
  .ck2-score { font-size: 1rem; padding: 4px 10px 4px 6px; min-width: 56px; }
  .ck2-score small { margin-top: 5px; font-size: .62rem; }
  .ck2-coin { width: 19px; height: 19px; }
  .ck2-orders { left: calc(max(10px, env(safe-area-inset-left)) + 60px); right: calc(max(12px, env(safe-area-inset-right)) + 128px); height: 70px; gap: 5px; }
  .ck2-tk { width: 80px; padding: 7px 3px 3px; border-radius: 11px; gap: 0; }
  .ck2-tk .dish { width: 32px; height: 32px; }
  .ck2-tk .nm { display: none; }
  .ck2-tk .ing { width: 17px; height: 17px; border-radius: 5px; }
  .ck2-tk .ing img { width: 17px; height: 17px; }
  .ck2-tk .ing .st { width: 10px; height: 10px; right: -3px; bottom: -3px; }
  .ck2-banner { top: calc(max(6px, env(safe-area-inset-top)) + 76px); font-size: .86rem; padding: 4px 12px 5px; }
  .ck2-say { font-size: .74rem; padding: 3px 8px 4px; }
  .ck2-pop { font-size: 1.05rem; }
  .ck2-card { width: min(840px, 97vw); height: 95vh; }
  .ck2-title b { font-size: 1.12rem; }
  .ck2-title small { font-size: .6rem; }
  .ck2-body { gap: 5px; }
  .ck2-btn { font-size: .84rem; padding: .4em 1em; }
  .ck2-levels { gap: 5px; }
  .ck2-lv { min-height: 58px; padding: 2px; border-radius: 12px; gap: 0; }
  .ck2-lv b { font-size: 1rem; }
  .ck2-lv span { font-size: .62rem; }
  .ck2-lv .stars svg { width: 12px; height: 12px; }
  .ck2-lv .menu img { width: 14px; height: 14px; }
  .ck2-lv em { font-size: .55rem; }
  .ck2-rc { min-width: 92px; padding: 3px 6px 4px; border-radius: 12px; }
  .ck2-rc > img { width: 34px; height: 34px; }
  .ck2-rc b { font-size: .68rem; }
  .ck2-rc .chain img { width: 17px; height: 17px; }
  .ck2-rc .chain img.st { width: 13px; height: 13px; }
  .ck2-rc .pts { display: none; }
  .ck2-twist { font-size: .72rem; padding: 3px 10px; }
  .ck2-goal { font-size: .8rem; }
  .ck2-goal svg { width: 13px; height: 13px; }
  .ck2-big svg { width: 34px; height: 34px; }
  .ck2-final { font-size: 1.4rem; }
  .ck2-stats { font-size: .7rem; gap: 4px; }
  .ck2-small { font-size: .68rem; }
}
`;

export function createUI({ sound }) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  document.body.classList.add('ck2-on');
  const hudEl = document.createElement('div');
  hudEl.className = 'ck2-hud';
  hudEl.innerHTML = `<div class="ck2-clock"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" fill="none" stroke="${PAL.blush}" stroke-width="4"/><circle class="arc" cx="18" cy="18" r="15.5" fill="none" stroke="${PAL.ink}" stroke-width="4" stroke-linecap="round" stroke-dasharray="97.4" stroke-dashoffset="0"/></svg><span>0:00</span></div>
    <div class="ck2-orders"></div>
    <div class="ck2-score">${coin}<b>0</b><small></small></div>`;
  document.body.appendChild(hudEl);
  const banner = document.createElement('div');
  banner.className = 'ck2-banner';
  document.body.appendChild(banner);
  const $ = (s) => hudEl.querySelector(s);
  const clock = $('.ck2-clock');
  const arc = $('.arc');
  const clockText = $('.ck2-clock span');
  const scoreB = $('.ck2-score b');
  const scoreGoal = $('.ck2-score small');
  const ordersEl = $('.ck2-orders');
  const tickets = new Map();
  let bannerT = 0;
  const tap = () => sound?.ui('tap');
  let layer = null;
  let ro = null;
  let redraw = null;

  function ingChain(dish) {
    return DISH[dish].parts
      .map((p) => {
        const how = HOW[p];
        if (!how) return `<span><img alt="" src="${url(p, 48)}"></span>`;
        const [base, step] = how;
        const img = how[1] === 'pot' || how[1] === 'jug' ? BREWIMG(p) : `<img alt="" src="${url(base, 48)}">`;
        return `<span>${img}<img class="st" alt="" src="${url(STEP_ICON[step], 36)}"></span>`;
      })
      .join('');
  }
  const BREWIMG = (p) => {
    const need = { soup: ['onion', 'lentils'], 'rice:cooked': ['rice'], stew: ['lamb', 'jameed'], lemonade: ['lemon', 'mint', 'ice'] }[p] || [p];
    return need.map((n) => `<img alt="" src="${url(n, 48)}">`).join('');
  };

  // ---------------------------------------------------------------- the play HUD
  function setPlay(on) {
    document.body.classList.toggle('ck2-play', on);
  }
  function setClock(t, total) {
    const s = Math.max(0, Math.ceil(t));
    const txt = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    if (clockText.textContent !== txt) clockText.textContent = txt;
    arc.setAttribute('stroke-dashoffset', String(97.4 * (1 - t / total)));
    clock.classList.toggle('late', t < 20);
  }
  let lastScore = -1;
  function setScore(v, goal) {
    if (v !== lastScore) {
      if (v > lastScore && lastScore >= 0) {
        scoreB.classList.add('bump');
        setTimeout(() => scoreB.classList.remove('bump'), 150);
      }
      lastScore = v;
      scoreB.textContent = String(v);
      const lit = goal.filter((g) => v >= g).length;
      const next = goal[lit];
      scoreGoal.innerHTML = next != null ? `${starSvg(true).replace('<svg', '<svg width="11" height="11"')} ${lit + 1} at ${next}` : 'Three stars!';
    }
  }
  function addOrder(o) {
    const el = document.createElement('div');
    el.className = 'ck2-tk';
    el.innerHTML = `<i class="bar"><b></b></i><img class="dish" alt="" src="${url(`dish:${o.dish}`, 104)}"><span class="nm">${DISH[o.dish].name}</span><div class="ings">${DISH[o.dish].parts
      .map((p) => {
        const how = HOW[p];
        const base = how ? (how[1] === 'pot' || how[1] === 'jug' ? p : how[0]) : p;
        const st = how ? `<img class="st" alt="" src="${url(STEP_ICON[how[1]], 28)}">` : '';
        return `<span class="ing"><img alt="" src="${url(base, 40)}">${st}</span>`;
      })
      .join('')}</div>`;
    ordersEl.appendChild(el);
    tickets.set(o.id, { el, bar: el.querySelector('.bar b') });
  }
  function tickOrders(orders) {
    orders.forEach((o, i) => {
      const t = tickets.get(o.id);
      if (!t) return;
      const k = Math.max(0, o.t / o.total);
      t.bar.style.width = `${k * 100}%`;
      t.bar.style.background = k > 0.5 ? '#7cc95a' : k > 0.25 ? '#f4b942' : '#e5484d';
      t.el.classList.toggle('late', k < 0.2);
      t.el.classList.toggle('first', i === 0 && orders.length > 1);
    });
  }
  function endOrder(o, kind) {
    const t = tickets.get(o.id);
    if (!t) return;
    tickets.delete(o.id);
    t.el.classList.remove('late');
    t.el.classList.add(kind);
    setTimeout(() => t.el.remove(), 380);
  }
  function clearOrders() {
    for (const t of tickets.values()) t.el.remove();
    tickets.clear();
    lastScore = -1;
  }
  function say(text, kind = '', ms = 1500) {
    banner.className = `ck2-banner on ${kind}`;
    banner.textContent = text;
    bannerT = ms;
  }
  function update(dt) {
    if (bannerT > 0) {
      bannerT -= dt * 1000;
      if (bannerT <= 0) banner.classList.remove('on');
    }
  }

  // ---------------------------------------------------------------- framed cards
  function card({ small, title, body, archRatio = 0.3, lift = 0.16, justify = 'center' }) {
    closeCard();
    document.body.classList.add('ck2-cardopen');
    layer = document.createElement('div');
    layer.className = 'ck2-layer';
    layer.innerHTML = `<div class="ck2-card" role="dialog" aria-label="${title.replace(/"/g, '')}"><canvas class="ck2-frame"></canvas><div class="ck2-title"><small>${small || ''}</small><b>${title}</b></div><div class="ck2-body">${body}</div></div>`;
    document.body.appendChild(layer);
    const el = layer.querySelector('.ck2-card');
    const cv = el.querySelector('.ck2-frame');
    const ttl = el.querySelector('.ck2-title');
    const bd = el.querySelector('.ck2-body');
    redraw = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      const c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawFrame(c, w, h, { archRatio });
      const L = frameLayout(w, h, { archRatio });
      ttl.style.top = `${L.spring - L.A * 0.5}px`;
      const side = L.x0 + (L.x1 - L.x0) * 0.03;
      bd.style.left = `${side}px`;
      bd.style.right = `${side}px`;
      bd.style.top = `${L.spring - L.A * lift}px`;
      bd.style.bottom = `${h - L.y1 + 8 * L.u + 4}px`;
      bd.style.justifyContent = justify;
    };
    redraw();
    artReady.then(() => redraw?.());
    ro = new ResizeObserver(() => redraw?.());
    ro.observe(el);
    return el;
  }
  function closeCard() {
    ro?.disconnect();
    ro = null;
    redraw = null;
    layer?.remove();
    layer = null;
    document.body.classList.remove('ck2-cardopen');
  }
  const on = (el, sel, fn) => el.querySelectorAll(sel).forEach((b) => b.addEventListener('click', (e) => (tap(), fn(b, e))));

  function showMap({ progress, chef, onPlay, onMode, onExit }) {
    const total = totalStars(progress);
    const next = LEVELS.findIndex((_, i) => isOpen(progress, i) && !progress.stars[i]);
    const btns = LEVELS.map((lv, i) => {
      const o = isOpen(progress, i);
      return `<button class="ck2-lv${i === next ? ' next' : ''}" data-lv="${i}" ${o ? '' : 'disabled'} aria-label="Kitchen ${i + 1}: ${lv.name}">
        <b>${o ? i + 1 : LOCK}</b><span>${lv.name}</span>
        ${o ? `<span class="menu">${lv.menu.map((d) => `<img alt="" src="${url(`dish:${d}`, 40)}">`).join('')}</span>` : `<em>${NEED[i]} stars to open</em>`}
        <span class="stars">${[0, 1, 2].map((k) => starSvg(k < progress.stars[i])).join('')}</span></button>`;
    }).join('');
    const el = card({
      small: `Chef ${chef}'s kitchens`,
      title: "Roji's YumYum Kitchen",
      archRatio: 0.28,
      body: `<div class="ck2-row"><span class="ck2-pill">${starSvg(true)} ${total} / ${LEVELS.length * 3}</span>
          <span class="ck2-mode" role="group" aria-label="Players"><button data-m="solo" class="${progress.mode !== 'duo' ? 'on' : ''}">Cook with a helper</button><button data-m="duo" class="${progress.mode === 'duo' ? 'on' : ''}">Two players</button></span></div>
        <div class="ck2-levels">${btns}</div>
        <div class="ck2-row"><button class="ck2-btn" data-a="exit">Back to town</button></div>`,
    });
    on(el, '[data-lv]', (b) => onPlay(Number(b.dataset.lv)));
    on(el, '[data-m]', (b) => {
      onMode(b.dataset.m);
      el.querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('on', x === b));
    });
    on(el, '[data-a="exit"]', () => onExit());
    el.querySelector('.next, .ck2-lv:not(:disabled)')?.focus({ preventScroll: true });
  }

  function showIntro({ i, lv, best, mode, chef, partner, onStart, onBack }) {
    const goals = lv.stars.map((g, k) => `<span>${starSvg(true).repeat(k + 1)}&nbsp;${g}</span>`).join('');
    const rcs = lv.menu.map((d) => `<div class="ck2-rc"><img alt="" src="${url(`dish:${d}`, 116)}"><b>${DISH[d].name}</b><div class="chain">${ingChain(d)}</div><span class="pts">${DISH[d].points} coins</span></div>`).join('');
    const keys =
      mode === 'duo'
        ? `${chef}: WASD, E to pick up and put down, Space to chop or wash, Left Shift to dash.<br>${partner}: arrows, Enter, Right Shift to chop or wash, Right Ctrl to dash.`
        : mode === 'online'
          ? `WASD or arrows to walk, E to pick up and put down, hold Space to chop or wash, Shift to dash.`
          : `WASD or arrows to walk, E to pick up and put down, hold Space to chop or wash, Shift to dash, Tab to swap chefs.`;
    const el = card({
      small: `Kitchen ${i + 1} of ${LEVELS.length} &middot; ${lv.place}`,
      title: lv.name,
      lift: 0.32,
      body: `<div class="ck2-twist">${lv.twist}</div>
        <div class="ck2-recipes">${rcs}</div>
        <div class="ck2-goal">${goals}</div>
        <div class="ck2-small">${Math.floor(lv.time / 60)}:${String(lv.time % 60).padStart(2, '0')} on the clock${best ? ` &middot; your best: ${best}` : ''}${mode === 'duo' ? ' &middot; two players' : mode === 'online' ? ` &middot; ${partner} cooks with you` : ` &middot; ${partner} helps you`}</div>
        <div class="ck2-row"><button class="ck2-btn go" data-a="go">Start cooking</button><button class="ck2-btn" data-a="back">Kitchens</button></div>
        <div class="ck2-keys">${keys}</div>`,
    });
    on(el, '[data-a="go"]', () => onStart());
    on(el, '[data-a="back"]', () => onBack());
    el.querySelector('[data-a="go"]')?.focus({ preventScroll: true });
  }

  function showResult(r) {
    const stars = [0, 1, 2].map((k) => starSvg(k < r.stars, `s ${k < r.stars ? 'on' : 'off'}`)).join('');
    const el = card({
      small: `Kitchen ${r.i + 1}: ${r.name}`,
      title: r.title,
      lift: 0.3,
      justify: 'flex-start',
      body: `<div class="ck2-stars ck2-big">${stars}</div>
        <div class="ck2-final">${coin}${r.score}</div>
        ${r.isBest ? '<div class="ck2-new">New best score!</div>' : `<div class="ck2-small">Best: ${r.best}</div>`}
        ${r.split ? `<div class="ck2-small">${r.split}</div>` : ''}
        <div class="ck2-stats"><span>${r.served} served</span><span>${r.tips} in tips</span><span>Best streak x${r.streak}</span>${r.missed ? `<span>${r.missed} missed</span>` : ''}</div>
        ${r.unlocked ? `<div class="ck2-new">New kitchen open: ${r.unlocked}</div>` : r.stars < 3 ? `<div class="ck2-small">${r.toNext}</div>` : ''}
        <div class="ck2-row">${r.canNext ? '<button class="ck2-btn go" data-a="next">Next kitchen</button>' : ''}<button class="ck2-btn${r.canNext ? '' : ' go'}" data-a="again">Play again</button><button class="ck2-btn" data-a="map">Kitchens</button><button class="ck2-btn" data-a="exit">Back to town</button></div>`,
    });
    el.querySelectorAll('.ck2-big .s').forEach((s, i) => (s.style.animationDelay = `${0.25 + i * 0.32}s`));
    on(el, '[data-a="next"]', () => r.onNext());
    on(el, '[data-a="again"]', () => r.onAgain());
    on(el, '[data-a="map"]', () => r.onMap());
    on(el, '[data-a="exit"]', () => r.onExit());
    el.querySelector('.go')?.focus({ preventScroll: true });
  }

  return {
    setPlay, setClock, setScore, addOrder, tickOrders, endOrder, clearOrders, say, update, showMap, showIntro, showResult, closeCard,
    get open() {
      return !!layer;
    },
    dispose() {
      closeCard();
      style.remove();
      hudEl.remove();
      banner.remove();
      document.body.classList.remove('ck2-on', 'ck2-play', 'ck2-cardopen');
    },
  };
}
