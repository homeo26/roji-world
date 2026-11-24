import { PAL, drawFrame, frameLayout, artReady } from '../../interiors/yumyum/theme.js';
import { itemUrl } from './food.js';

// The cards and the score bar of Roji's YumYum Kitchen, drawn like Roji's logo card:
// cream paper, raspberry ink, the pointed arch and the rose corners.

const CSS = `
body.ck-on #arena .a-title { background: ${PAL.paper}; color: ${PAL.inkDeep}; box-shadow: 0 0 0 2px ${PAL.band}, 0 6px 18px rgba(120,40,60,.16); }
body.ck-on #arena .a-title span { color: ${PAL.frame}; }
body.ck-on #arena .a-close { background: ${PAL.paper}; color: ${PAL.inkDeep}; box-shadow: 0 0 0 2px ${PAL.band}, 0 6px 18px rgba(120,40,60,.18); }
body.ck-on #arena .a-score { background: ${PAL.paper}; color: ${PAL.inkDeep}; box-shadow: 0 0 0 2px ${PAL.band}, 0 6px 18px rgba(120,40,60,.16); padding: 6px 14px; }
body.ck-on #arena .a-msg { color: ${PAL.paper}; text-shadow: 0 3px 0 ${PAL.inkDeep}, 0 0 2px ${PAL.inkDeep}, 0 10px 28px rgba(120,30,60,.45); }
body.ck-on #arena .a-hint { background: ${PAL.paper}; color: ${PAL.inkDeep}; box-shadow: 0 0 0 2px ${PAL.band}; bottom: max(8px, env(safe-area-inset-bottom)); font-size: .8rem; padding: 4px 12px; }
body.ck-on.ck-play.touch #arena .a-title, body.ck-on.ck-play #arena .a-title { display: none; }
body.ck-on.ck-cardopen #arena .a-score { visibility: hidden; }
body.ck-on.ck-cardopen #arena { z-index: 46; }
@media (max-height: 520px) { body.ck-on.ck-cardopen #arena .a-title { display: none; } }
.ck-hud { display: flex; align-items: center; gap: 10px; font: 700 1.05rem var(--font, 'Fredoka', system-ui); white-space: nowrap; }
.ck-coinic { width: 24px; height: 24px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff3c4 0 18%, #f4c24f 20% 62%, #c9921e 64%); box-shadow: inset 0 0 0 2px #e0a82e; display: inline-block; flex: none; }
.ck-coins { min-width: 2.2em; text-align: right; display: inline-block; transition: transform .15s; }
.ck-coins.bump { transform: scale(1.25); }
.ck-prog { position: relative; width: 150px; height: 12px; border-radius: 99px; background: ${PAL.blush}; box-shadow: inset 0 0 0 2px ${PAL.band}; }
.ck-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 99px; background: linear-gradient(90deg, ${PAL.ink}, #ef6f8c); width: 0; transition: width .25s; }
.ck-st { position: absolute; top: 50%; width: 20px; height: 20px; transform: translate(-50%, -50%); }
.ck-st svg { width: 100%; height: 100%; display: block; }
.ck-st.on { animation: ck-pop .4s cubic-bezier(.2,1.6,.4,1); }
.ck-time { min-width: 2.6em; text-align: left; color: ${PAL.inkDeep}; }
.ck-time.late { color: #e5484d; animation: ck-blink .5s infinite alternate; }
.ck-combo { position: fixed; z-index: 41; right: max(14px, env(safe-area-inset-right)); top: calc(max(10px, env(safe-area-inset-top)) + 54px); background: ${PAL.ink}; color: ${PAL.paper}; font: 700 .95rem var(--font, 'Fredoka', system-ui); border-radius: 14px; padding: 4px 12px 7px; pointer-events: none; box-shadow: 0 6px 16px rgba(120,30,60,.3); transform-origin: 80% 0; opacity: 0; transition: opacity .2s; }
.ck-combo.on { opacity: 1; }
.ck-combo.bump { animation: ck-pop .35s cubic-bezier(.2,1.6,.4,1); }
.ck-combo i { display: block; height: 4px; border-radius: 4px; background: ${PAL.paper}; margin-top: 3px; transform-origin: 0 50%; }
.ck-lvl { position: fixed; z-index: 41; top: max(10px, env(safe-area-inset-top)); left: max(12px, env(safe-area-inset-left)); background: ${PAL.paper}; color: ${PAL.inkDeep}; border-radius: 16px; padding: 5px 13px 6px; font: 500 .82rem var(--font, 'Fredoka', system-ui); box-shadow: 0 0 0 2px ${PAL.band}, 0 6px 18px rgba(120,40,60,.14); pointer-events: none; display: none; line-height: 1.25; }
.ck-lvl.on { display: block; }
.ck-lvl b { color: ${PAL.ink}; font-weight: 700; }
.ck-lvl .ck-ch { display: block; font-size: .74rem; color: ${PAL.oliveDeep}; }
.ck-lvl .ck-ch[data-st="fail"] { color: #e5484d; text-decoration: line-through; }
.ck-lvl .ck-ch[data-st="done"] { color: #b98222; font-weight: 700; }
.ck-fly { position: fixed; inset: 0; z-index: 46; pointer-events: none; }
.ck-fly .ck-coinic { position: absolute; left: 0; top: 0; width: 20px; height: 20px; }
.ck-layer { position: fixed; inset: 0; z-index: 45; display: grid; place-items: center; background: rgba(90,30,50,.28); font-family: var(--font, 'Fredoka', system-ui, sans-serif); color: ${PAL.inkDeep}; }
.ck-card { position: relative; width: min(780px, 94vw); height: min(560px, 92vh); animation: ck-in .28s cubic-bezier(.2,1.3,.4,1); filter: drop-shadow(0 18px 40px rgba(90,20,40,.35)); }
.ck-frame { position: absolute; inset: 0; width: 100%; height: 100%; }
.ck-title { position: absolute; left: 0; right: 0; text-align: center; transform: translateY(-50%); pointer-events: none; }
.ck-title small { display: block; font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: ${PAL.frame}; font-weight: 600; }
.ck-title b { display: block; font-size: 1.45rem; line-height: 1.1; color: ${PAL.ink}; }
.ck-body { position: absolute; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
.ck-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; align-items: center; }
.ck-btn { border: 0; border-radius: 999px; padding: .55em 1.2em; font: 600 1rem var(--font, 'Fredoka', system-ui); cursor: pointer; background: ${PAL.blush}; color: ${PAL.inkDeep}; box-shadow: inset 0 0 0 2px ${PAL.band}; }
.ck-btn.go { background: ${PAL.ink}; color: ${PAL.paper}; box-shadow: 0 4px 0 ${PAL.inkDeep}; }
.ck-btn:hover, .ck-btn:focus-visible { filter: brightness(1.05); outline: none; transform: translateY(-1px); }
.ck-btn:disabled { opacity: .5; cursor: default; transform: none; }
.ck-wallet { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 1.05rem; background: ${PAL.paper}; border-radius: 99px; padding: 3px 12px 3px 6px; box-shadow: inset 0 0 0 2px ${PAL.band}; }
.ck-levels { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; width: 100%; }
.ck-lv { position: relative; border: 0; border-radius: 16px; padding: 6px 4px 5px; background: ${PAL.paper}; color: ${PAL.inkDeep}; font: 600 .78rem var(--font, system-ui); cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 1px; box-shadow: inset 0 0 0 2px ${PAL.band}; min-height: 84px; justify-content: center; }
.ck-lv b { font-size: 1.35rem; line-height: 1; color: ${PAL.ink}; }
.ck-lv span { font-size: .7rem; line-height: 1.1; color: ${PAL.inkDeep}; }
.ck-lv .ck-stars svg { width: 16px; height: 16px; }
.ck-lv.next { box-shadow: inset 0 0 0 3px ${PAL.ink}, 0 0 0 3px ${PAL.blush}; animation: ck-glow 1.2s infinite alternate; }
.ck-lv:disabled { opacity: .55; cursor: default; background: ${PAL.blush}; }
.ck-lv:hover:not(:disabled), .ck-lv:focus-visible { background: #fff3f2; outline: none; }
.ck-lv .ck-rib { position: absolute; top: 4px; right: 6px; width: 10px; height: 10px; border-radius: 50%; background: ${PAL.gold}; box-shadow: 0 0 0 2px ${PAL.paper}; }
.ck-stars { display: inline-flex; gap: 2px; }
.ck-big svg { width: 44px; height: 44px; }
.ck-big .s { opacity: 0; transform: scale(.3); }
.ck-big .s.on { animation: ck-star .5s cubic-bezier(.2,1.6,.4,1) forwards; }
.ck-big .s.off { animation: ck-fade .3s forwards; }
.ck-menu { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.ck-menu img { width: 42px; height: 42px; background: ${PAL.paper}; border-radius: 12px; box-shadow: inset 0 0 0 2px ${PAL.band}; }
.ck-new { display: flex; gap: 10px; align-items: center; text-align: left; background: ${PAL.paper}; border-radius: 16px; padding: 8px 12px; box-shadow: inset 0 0 0 2px ${PAL.band}; font-size: .86rem; line-height: 1.3; max-width: 560px; }
.ck-new img { width: 52px; height: 52px; flex: none; }
.ck-new b { color: ${PAL.ink}; }
.ck-goal { display: flex; gap: 14px; font-weight: 700; font-size: .98rem; }
.ck-goal span { display: inline-flex; align-items: center; gap: 2px; }
.ck-goal svg { width: 18px; height: 18px; }
.ck-line { font-size: .92rem; line-height: 1.35; }
.ck-small { font-size: .8rem; color: ${PAL.frame}; }
.ck-stats { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; font-size: .82rem; }
.ck-stats span { background: ${PAL.paper}; border-radius: 99px; padding: 2px 10px; box-shadow: inset 0 0 0 2px ${PAL.band}; }
.ck-chal { font-size: .86rem; padding: 3px 12px; border-radius: 99px; background: ${PAL.blush}; }
.ck-chal.done { background: #e9f3d6; color: ${PAL.oliveDeep}; }
.ck-shop { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 100%; }
.ck-up { display: grid; grid-template-columns: 46px 1fr; grid-template-rows: auto auto auto; column-gap: 8px; text-align: left; background: ${PAL.paper}; border-radius: 14px; padding: 6px 8px; box-shadow: inset 0 0 0 2px ${PAL.band}; font-size: .74rem; line-height: 1.2; align-items: center; }
.ck-up img { grid-row: 1 / 4; width: 46px; height: 46px; }
.ck-up b { font-size: .86rem; color: ${PAL.ink}; }
.ck-up .pips { display: inline-flex; gap: 3px; margin-left: 4px; vertical-align: middle; }
.ck-up .pips i { width: 8px; height: 8px; border-radius: 50%; background: ${PAL.blush}; box-shadow: inset 0 0 0 1.5px ${PAL.frame}; }
.ck-up .pips i.on { background: ${PAL.gold}; box-shadow: none; }
.ck-up .ck-btn { padding: .25em .7em; font-size: .78rem; justify-self: start; margin-top: 3px; display: inline-flex; align-items: center; gap: 4px; }
.ck-up .ck-btn .ck-coinic { width: 14px; height: 14px; }
.ck-up.fit { animation: ck-pop .45s cubic-bezier(.2,1.6,.4,1); }
.ck-up.locked { opacity: .55; }
.ck-keys { font-size: .74rem; color: ${PAL.frame}; }
body.touch .ck-keys { display: none; }
@keyframes ck-in { from { transform: scale(.9); opacity: 0; } }
@keyframes ck-pop { 0% { transform: scale(.6); } 60% { transform: scale(1.25); } 100% { transform: scale(1); } }
@keyframes ck-star { 0% { opacity: 0; transform: scale(.3) rotate(-30deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes ck-fade { to { opacity: .35; transform: scale(.85); } }
@keyframes ck-glow { from { filter: brightness(1); } to { filter: brightness(1.08); } }
@keyframes ck-blink { to { opacity: .55; } }
@media (max-height: 520px) {
  .ck-card { width: min(820px, 96vw); height: 94vh; }
  .ck-title b { font-size: 1.12rem; }
  .ck-title small { font-size: .62rem; }
  .ck-body { gap: 6px; }
  .ck-btn { font-size: .86rem; padding: .42em 1em; }
  .ck-levels { gap: 6px; }
  .ck-lv { min-height: 62px; padding: 3px 2px; border-radius: 12px; }
  .ck-lv b { font-size: 1.05rem; }
  .ck-lv span { font-size: .6rem; }
  .ck-lv .ck-stars svg { width: 12px; height: 12px; }
  .ck-big svg { width: 34px; height: 34px; }
  .ck-menu img { width: 32px; height: 32px; }
  .ck-new { font-size: .74rem; padding: 4px 10px; }
  .ck-new img { width: 38px; height: 38px; }
  .ck-line { font-size: .8rem; }
  .ck-stats { font-size: .72rem; gap: 5px; }
  .ck-goal { font-size: .86rem; }
  .ck-shop { grid-template-columns: repeat(5, 1fr); gap: 5px; }
  .ck-up { grid-template-columns: 1fr; text-align: center; justify-items: center; padding: 4px; font-size: .62rem; }
  .ck-up img { grid-row: auto; width: 30px; height: 30px; }
  .ck-up b { font-size: .7rem; }
  .ck-up .ck-btn { justify-self: center; font-size: .7rem; }
  .ck-up .what { display: none; }
  .ck-hud { font-size: .95rem; gap: 7px; }
  .ck-prog { width: 96px; height: 10px; }
  .ck-st { width: 17px; height: 17px; }
  .ck-coinic { width: 20px; height: 20px; }
  .ck-combo { top: calc(max(8px, env(safe-area-inset-top)) + 46px); font-size: .82rem; }
  .ck-lvl { font-size: .7rem; padding: 3px 10px 4px; }
  .ck-lvl .ck-ch { font-size: .64rem; }
}
`;

const STAR = 'M12 2.6l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z';
export const starSvg = (on, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24"><path d="${STAR}" fill="${on ? PAL.gold : PAL.blush}" stroke="${on ? '#b98222' : PAL.frame}" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
const LOCK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${PAL.inkDeep}" stroke-width="2.6" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`;
const coin = () => '<i class="ck-coinic"></i>';

// Little drawings for the upgrades that are not food.
function upIcon(id) {
  const food = { spit: 'wrap', coffee: 'latte', grill: 'burger:cheese', jar: 'lemonade', fries: 'fries', cakes: 'pecan' }[id];
  if (food) return itemUrl(food, 92);
  const c = document.createElement('canvas');
  c.width = c.height = 92;
  const g = c.getContext('2d');
  g.lineWidth = 4;
  g.strokeStyle = '#5a3a3f';
  if (id === 'vases') {
    g.fillStyle = PAL.ink;
    g.beginPath();
    g.moveTo(32, 50);
    g.lineTo(60, 50);
    g.lineTo(56, 84);
    g.lineTo(36, 84);
    g.closePath();
    g.fill();
    g.stroke();
    for (const [x, y, col] of [[46, 30, PAL.rose], [30, 38, '#f6b9bd'], [62, 38, PAL.ink], [46, 44, '#f6b9bd']]) {
      g.fillStyle = col;
      g.beginPath();
      g.arc(x, y, 11, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    g.fillStyle = PAL.olive;
    g.beginPath();
    g.ellipse(24, 52, 10, 4, -0.5, 0, Math.PI * 2);
    g.fill();
  } else if (id === 'lanterns') {
    g.fillStyle = PAL.gold;
    g.beginPath();
    g.moveTo(46, 8);
    g.lineTo(62, 26);
    g.lineTo(30, 26);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#ffd98a';
    g.fillRect(32, 28, 28, 40);
    g.strokeRect(32, 28, 28, 40);
    g.fillStyle = PAL.gold;
    g.fillRect(30, 68, 32, 8);
    g.strokeRect(30, 68, 32, 8);
    g.fillStyle = 'rgba(255,190,90,.5)';
    g.beginPath();
    g.arc(46, 48, 10, 0, Math.PI * 2);
    g.fill();
  } else {
    g.fillStyle = '#b8743a';
    g.fillRect(16, 44, 60, 36);
    g.strokeRect(16, 44, 60, 36);
    g.fillStyle = PAL.gold;
    g.fillRect(14, 38, 64, 8);
    g.strokeRect(14, 38, 64, 8);
    g.fillStyle = PAL.ink;
    g.beginPath();
    g.moveTo(46, 30);
    g.bezierCurveTo(30, 18, 36, 6, 46, 16);
    g.bezierCurveTo(56, 6, 62, 18, 46, 30);
    g.fill();
    g.fillStyle = PAL.blush;
    g.fillRect(28, 54, 36, 16);
  }
  return c.toDataURL();
}

export function createUI({ hud, sound }) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  document.body.classList.add('ck-on');
  const fly = document.createElement('div');
  fly.className = 'ck-fly';
  document.body.appendChild(fly);
  const combo = document.createElement('div');
  combo.className = 'ck-combo';
  combo.innerHTML = '<span></span><i></i>';
  document.body.appendChild(combo);
  const lvl = document.createElement('div');
  lvl.className = 'ck-lvl';
  document.body.appendChild(lvl);
  let lvlKey = '';
  function setLevel(name, ch, st) {
    const key = `${name}|${ch}|${st}`;
    if (key === lvlKey) return;
    lvlKey = key;
    lvl.classList.toggle('on', !!name);
    if (!name) return;
    const mark = st === 'fail' ? 'missed' : st === 'done' ? 'done!' : st && st !== 'ok' ? st : '';
    lvl.innerHTML = `${name}${ch ? `<span class="ck-ch" data-st="${st === 'fail' || st === 'done' ? st : 'ok'}">Challenge: ${ch}${mark ? ` (${mark})` : ''}</span>` : ''}`;
  }
  const tap = () => sound?.ui('tap');
  let layer = null;
  let ro = null;
  let redraw = null;

  // ---------------------------------------------------------------- framed card
  function card({ small, title, body, archRatio = 0.3, lift = 0.16, justify = 'center' }) {
    closeCard();
    document.body.classList.add('ck-cardopen');
    layer = document.createElement('div');
    layer.className = 'ck-layer';
    layer.innerHTML = `<div class="ck-card" role="dialog" aria-label="${title.replace(/"/g, '')}"><canvas class="ck-frame"></canvas><div class="ck-title"><small>${small || ''}</small><b>${title}</b></div><div class="ck-body">${body}</div></div>`;
    document.body.appendChild(layer);
    const el = layer.querySelector('.ck-card');
    const cv = el.querySelector('.ck-frame');
    const ttl = el.querySelector('.ck-title');
    const bd = el.querySelector('.ck-body');
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
      const side = L.x0 + (L.x1 - L.x0) * 0.04;
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
    document.body.classList.remove('ck-cardopen');
  }
  const on = (el, sel, fn) => el.querySelectorAll(sel).forEach((b) => b.addEventListener('click', (e) => (tap(), fn(b, e))));

  // ---------------------------------------------------------------- screens
  function showMap({ levels, progress, chefName, onPlay, onShop, onExit }) {
    const open = (i) => i === 0 || progress.stars[i - 1] > 0;
    const next = levels.findIndex((_, i) => open(i) && !progress.stars[i]);
    const total = progress.stars.reduce((a, b) => a + b, 0);
    const btns = levels
      .map((lv, i) => {
        const o = open(i);
        return `<button class="ck-lv${i === next ? ' next' : ''}" data-lv="${i}" ${o ? '' : 'disabled'} aria-label="Level ${i + 1}: ${lv.name}">
          ${progress.chall[i] ? '<i class="ck-rib" title="Challenge done"></i>' : ''}<b>${o ? i + 1 : LOCK}</b><span>${lv.name}</span>
          <span class="ck-stars">${[0, 1, 2].map((k) => starSvg(k < progress.stars[i])).join('')}</span></button>`;
      })
      .join('');
    const el = card({
      small: `Chef ${chefName}'s kitchen`,
      title: 'Pick a shift',
      body: `<div class="ck-row"><span class="ck-wallet">${coin()} ${progress.wallet}</span><span class="ck-wallet">${starSvg(true).replace('<svg', '<svg width="20" height="20"')} ${total} / ${levels.length * 3}</span></div>
        <div class="ck-levels">${btns}</div>
        <div class="ck-row"><button class="ck-btn go" data-a="shop">Kitchen shop</button><button class="ck-btn" data-a="exit">Back to town</button></div>`,
    });
    on(el, '[data-lv]', (b) => onPlay(Number(b.dataset.lv)));
    on(el, '[data-a="shop"]', () => onShop());
    on(el, '[data-a="exit"]', () => onExit());
    el.querySelector('.next')?.focus({ preventScroll: true });
  }

  function showIntro({ lv, cfg, menu, fresh, challenge, onStart, onBack }) {
    const goals = cfg.goal.map((g, k) => `<span>${starSvg(true).repeat(k + 1)}&nbsp;${g}</span>`).join('');
    const tips = fresh.map((f) => `<div class="ck-new"><img alt="" src="${itemUrl(f.icon, 104)}"><span><b>New!</b> ${f.text}</span></div>`).join('');
    const el = card({
      small: `Level ${lv + 1}`,
      title: cfg.name,
      lift: 0.3,
      body: `<div class="ck-goal">${goals}</div>
        <div class="ck-menu">${menu.map((k) => `<img alt="" src="${itemUrl(k, 84)}">`).join('')}</div>
        ${tips}
        ${challenge ? `<div class="ck-chal">Challenge: ${challenge} (+25 coins)</div>` : ''}
        <div class="ck-line ck-small">${cfg.time} seconds &middot; ${cfg.spots} guests at a time</div>
        <div class="ck-row"><button class="ck-btn go" data-a="go">Open the doors</button><button class="ck-btn" data-a="back">Map</button></div>
        <div class="ck-keys">Tap or click a station. Tap finished food to serve it, or drag it to a guest. Keys 1 to 8 work the stations, Space serves.</div>`,
    });
    on(el, '[data-a="go"]', () => onStart());
    on(el, '[data-a="back"]', () => onBack());
    el.querySelector('[data-a="go"]')?.focus({ preventScroll: true });
  }

  function showResult(r) {
    const stars = [0, 1, 2].map((k) => starSvg(k < r.stars, `s ${k < r.stars ? 'on' : 'off'}`)).join('');
    const el = card({
      small: `Level ${r.lv + 1}: ${r.name}`,
      title: r.title,
      lift: 0.3,
      justify: 'flex-start',
      body: `<div class="ck-stars ck-big">${stars}</div>
        <div class="ck-line">${r.text}</div>
        <div class="ck-stats"><span>${r.served} served</span><span>${r.tips} in tips</span><span>Best combo x${r.bestCombo}</span>${r.lost ? `<span>${r.lost} left hungry</span>` : ''}</div>
        ${r.challenge ? `<div class="ck-chal${r.challenge.done ? ' done' : ''}">${r.challenge.done ? `Challenge done: ${r.challenge.text}, +25 coins` : `Challenge missed: ${r.challenge.text}`}</div>` : ''}
        <div class="ck-row"><span class="ck-wallet">${coin()} ${r.wallet}</span></div>
        <div class="ck-row">${r.canNext ? '<button class="ck-btn go" data-a="next">Next level</button>' : ''}<button class="ck-btn${r.canNext ? '' : ' go'}" data-a="again">Play again</button><button class="ck-btn" data-a="shop">Kitchen shop</button><button class="ck-btn" data-a="map">Map</button></div>`,
    });
    el.querySelectorAll('.ck-big .s').forEach((s, i) => (s.style.animationDelay = `${0.25 + i * 0.32}s`));
    if (r.stars > 0) for (let i = 0; i < r.stars; i++) setTimeout(() => layer && sound?.tone && sound.ctx && !sound.muted && sound.tone(660 * Math.pow(1.26, i), sound.ctx.currentTime, 0.25, { type: 'triangle', gain: 0.06 }), 250 + i * 320);
    on(el, '[data-a="next"]', () => r.onNext());
    on(el, '[data-a="again"]', () => r.onRetry());
    on(el, '[data-a="shop"]', () => r.onShop());
    on(el, '[data-a="map"]', () => r.onMap());
    el.querySelector('.go')?.focus({ preventScroll: true });
  }

  function showShop({ upgrades, progress, reached, onBuy, onClose }) {
    const render = (flash) => {
      const items = upgrades
        .map((u) => {
          const lvl = progress.up[u.id] || 0;
          const max = lvl >= u.steps.length;
          const locked = reached < u.from;
          const st = u.steps[Math.min(lvl, u.steps.length - 1)];
          const pips = u.steps.map((_, k) => `<i class="${k < lvl ? 'on' : ''}"></i>`).join('');
          const btn = locked
            ? `<button class="ck-btn" disabled>Level ${u.from + 1}</button>`
            : max
              ? '<button class="ck-btn" disabled>Fitted</button>'
              : `<button class="ck-btn${progress.wallet >= st.price ? ' go' : ''}" data-buy="${u.id}" ${progress.wallet >= st.price ? '' : 'disabled'}>${coin()} ${st.price}</button>`;
          return `<div class="ck-up${locked ? ' locked' : ''}${flash === u.id ? ' fit' : ''}"><img alt="" src="${upIcon(u.id)}"><span><b>${u.name}</b><span class="pips">${pips}</span></span><span class="what">${max ? 'All done' : st.text}</span>${btn}</div>`;
        })
        .join('');
      const el = card({
        small: 'Spend your coins',
        title: 'Kitchen shop',
        archRatio: 0.26,
        body: `<div class="ck-row"><span class="ck-wallet">${coin()} ${progress.wallet}</span></div><div class="ck-shop">${items}</div>
          <div class="ck-row"><button class="ck-btn go" data-a="close">Done</button></div>`,
      });
      on(el, '[data-buy]', (b) => {
        if (onBuy(b.dataset.buy)) render(b.dataset.buy);
      });
      on(el, '[data-a="close"]', () => onClose());
    };
    render(null);
  }

  // ---------------------------------------------------------------- score bar
  let hudRefs = null;
  function scoreBar(goal) {
    const max = goal[2];
    hud.score(`<span class="ck-hud">${coin()}<b class="ck-coins">0</b><span class="ck-prog"><span class="ck-fill"></span>${goal.map((g, k) => `<i class="ck-st" style="left:${(g / max) * 100}%">${starSvg(false)}</i>`.replace('<svg', `<svg data-k="${k}"`)).join('')}</span><span class="ck-time">0:00</span></span>`);
    const root = document.querySelector('#arena .a-score');
    hudRefs = { root, coins: root.querySelector('.ck-coins'), fill: root.querySelector('.ck-fill'), stars: [...root.querySelectorAll('.ck-st')], time: root.querySelector('.ck-time'), goal, lit: 0, last: '', lastT: '' };
  }
  function setScore(coins, time, late) {
    const h = hudRefs;
    if (!h) return;
    const c = String(Math.round(coins));
    if (c !== h.last) {
      h.last = c;
      h.coins.textContent = c;
      h.fill.style.width = `${Math.min(100, (coins / h.goal[2]) * 100)}%`;
      const lit = h.goal.filter((g) => coins >= g).length;
      while (h.lit < lit) {
        const s = h.stars[h.lit];
        s.innerHTML = starSvg(true);
        s.classList.add('on');
        h.lit++;
      }
    }
    const sec = Math.max(0, Math.ceil(time));
    const tt = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    if (tt !== h.lastT) {
      h.lastT = tt;
      h.time.textContent = tt;
      h.time.classList.toggle('late', late);
    }
  }
  function bumpCoins() {
    const el = hudRefs?.coins;
    if (!el) return;
    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 140);
  }
  function clearScore() {
    hud.score('');
    hudRefs = null;
  }
  // Coins that fly from a point on screen to the coin in the score bar.
  function flyCoins(from, n, onEach) {
    const target = hudRefs?.root.querySelector('.ck-coinic');
    if (!target) return;
    const r = target.getBoundingClientRect();
    const tx = r.left + r.width / 2 - 10;
    const ty = r.top + r.height / 2 - 10;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('i');
      el.className = 'ck-coinic';
      fly.appendChild(el);
      const sx = from.x - 10 + (Math.random() - 0.5) * 40;
      const sy = from.y - 10 + (Math.random() - 0.5) * 20;
      const mx = sx + (Math.random() - 0.5) * 80;
      const my = sy - 50 - Math.random() * 40;
      const a = el.animate(
        [
          { transform: `translate(${sx}px, ${sy}px) scale(.4)`, opacity: 0 },
          { transform: `translate(${mx}px, ${my}px) scale(1.1)`, opacity: 1, offset: 0.3 },
          { transform: `translate(${tx}px, ${ty}px) scale(.8)`, opacity: 1 },
        ],
        { duration: 650 + i * 60, delay: i * 55, easing: 'cubic-bezier(.4,.1,.6,1)', fill: 'both' },
      );
      a.onfinish = () => {
        el.remove();
        onEach?.(i);
      };
    }
  }
  function setCombo(n, k) {
    if (n < 2) {
      combo.classList.remove('on');
      return;
    }
    combo.classList.add('on');
    const t = `Combo x${n}`;
    const span = combo.querySelector('span');
    if (span.textContent !== t) {
      span.textContent = t;
      combo.classList.remove('bump');
      void combo.offsetWidth;
      combo.classList.add('bump');
    }
    combo.querySelector('i').style.transform = `scaleX(${Math.max(0, Math.min(1, k))})`;
  }

  return {
    showMap, showIntro, showResult, showShop, closeCard, scoreBar, setScore, bumpCoins, clearScore, flyCoins, setCombo, setLevel,
    get open() {
      return !!layer;
    },
    dispose() {
      closeCard();
      style.remove();
      fly.remove();
      combo.remove();
      lvl.remove();
      document.body.classList.remove('ck-on', 'ck-play', 'ck-cardopen');
    },
  };
}
