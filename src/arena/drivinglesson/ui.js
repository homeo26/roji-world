// Cards and HUD for Abu Sanad's driving course: the course map, a lesson's intro card, the result card,
// the task list, Abu Sanad's speech bubble, the speedometer and the test marking sheet.
import { roundRect } from '../../util.js';
import { C, drawChibi, drawWheelBadge, paintText, heartPath, ABU_SANAD_PHOTO, ROJI_PHOTO, HOMAMA_PHOTO } from '../../places/driving/kit.js';

export const STAR = (on, s = 16, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" width="${s}" height="${s}" style="vertical-align:-2px"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z" fill="${on ? '#ffd166' : '#eadfd8'}" stroke="${on ? '#e0a83a' : '#d8cbc2'}" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
const LOCK = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#b9a69c" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const CLIP = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM8.5 12l2 2 4-4"/></svg>';
export const fmtTime = (s) => (s == null ? '-' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const CSS = `
#arena .a-top { z-index: 6; }
#arena .dl-layer { position: absolute; inset: 0; pointer-events: none; font-family: var(--font, 'Fredoka', system-ui, sans-serif); color: #3b2b3f; z-index: 2; }
#arena .dl-list { position: absolute; top: calc(max(10px, env(safe-area-inset-top)) + 58px); left: max(12px, env(safe-area-inset-left)); background: rgba(255,250,244,.93); border-radius: 18px; padding: 10px 14px 10px 12px; box-shadow: 0 6px 18px rgba(60,30,40,.15); font-size: .84rem; min-width: 210px; max-width: 280px; transition: opacity .4s; }
#arena .dl-list h4 { margin: 0 0 6px; font-size: .88rem; color: #21a99a; display: flex; align-items: center; gap: 6px; }
#arena .dl-list ol { list-style: none; margin: 0; padding: 0; }
#arena .dl-list li { display: flex; align-items: center; gap: 8px; padding: 2px 6px; border-radius: 10px; color: #a8969f; transition: background .25s, color .25s; line-height: 1.2; }
#arena .dl-list li i { flex: none; width: 16px; height: 16px; border-radius: 50%; border: 2px solid #e2d4cc; display: grid; place-items: center; font-style: normal; font-size: 11px; font-weight: 700; color: #fff; }
#arena .dl-list li.now { background: #fff1c2; color: #3b2b3f; font-weight: 700; }
#arena .dl-list li.now i { border-color: #f4a742; background: #ffd166; }
#arena .dl-list li.done { color: #3b2b3f; }
#arena .dl-list li.done i { border-color: #3fbf9f; background: #3fbf9f; }
#arena .dl-list li.miss i { border-color: #f6907a; background: #f6907a; }
#arena .dl-smooth { margin-top: 6px; padding-top: 6px; border-top: 1px dashed #ead9cf; display: flex; align-items: center; gap: 4px; font-size: .78rem; color: #7a6470; }
#arena .dl-smooth span { margin-left: auto; }
#arena .dl-list [hidden] { display: none !important; }
#arena .dl-marks { margin-top: 5px; display: flex; gap: 6px; font-size: .76rem; }
#arena .dl-marks span { border-radius: 99px; padding: 1px 8px; background: #f3ebe4; }
#arena .dl-marks span.bad { background: #ffe1e6; color: #c7404f; font-weight: 700; }
#arena .dl-say { position: absolute; left: 50%; bottom: calc(max(16px, env(safe-area-inset-bottom)) + 44px); transform: translateX(-50%); background: #fffaf4; border-radius: 20px; padding: 9px 16px; box-shadow: 0 8px 22px rgba(60,30,40,.18); font-size: 1rem; max-width: min(560px, 80vw); text-align: center; transition: opacity .25s, transform .25s; }
#arena .dl-say b { color: #21a99a; margin-right: 6px; }
#arena .dl-say.who-homama b { color: #3f7bf0; }
#arena .dl-say.who-roji b { color: #ef5b6f; }
#arena .dl-say.hide { opacity: 0; transform: translateX(-50%) translateY(8px); }
#arena .dl-pop { position: absolute; left: 50%; top: 27%; transform: translate(-50%, -50%) scale(.6); font-weight: 700; font-size: clamp(1.3rem, 4vw, 2.3rem); color: #fff; text-shadow: 0 3px 0 rgba(0,0,0,.16), 0 8px 20px rgba(0,0,0,.22); opacity: 0; transition: opacity .18s, transform .25s cubic-bezier(.2,1.5,.4,1); white-space: nowrap; }
#arena .dl-pop.on { opacity: 1; transform: translate(-50%, -50%) scale(1); }
#arena .dl-speed { position: absolute; top: calc(max(10px, env(safe-area-inset-top)) + 58px); right: max(12px, env(safe-area-inset-right)); display: flex; align-items: center; gap: 6px; transition: opacity .3s; }
#arena .dl-speed .dial { background: rgba(255,250,244,.93); border-radius: 16px; padding: 4px 12px; box-shadow: 0 6px 18px rgba(60,30,40,.15); font-weight: 700; font-size: 1.15rem; min-width: 62px; text-align: center; line-height: 1.05; transition: background .2s, color .2s; }
#arena .dl-speed .dial small { display: block; font-size: .6rem; font-weight: 600; color: #8a7480; }
#arena .dl-speed .dial.over { background: #ffe1e6; color: #c7404f; animation: dl-blink .5s infinite alternate; }
#arena .dl-speed .lim { width: 40px; height: 40px; border-radius: 50%; background: #fff; box-shadow: inset 0 0 0 5px #e5484d, 0 4px 12px rgba(60,30,40,.18); display: none; place-items: center; font-weight: 700; font-size: .95rem; }
#arena .dl-speed.limit .lim { display: grid; }
#arena .dl-speed .gear { width: 34px; height: 34px; border-radius: 10px; background: #3b2b3f; color: #fff; display: grid; place-items: center; font-weight: 700; box-shadow: 0 4px 12px rgba(60,30,40,.18); }
#arena .dl-speed .gear.r { background: #ef5b6f; }
#arena .dl-speed .gear.lit { background: #ffd166; color: #3b2b3f; }
#arena .dl-speed .lights { display: none; }
#arena .dl-speed.night .lights { display: grid; }
#arena .dl-lic { display: inline-flex; align-items: center; gap: 7px; font-size: .85rem; }
#arena .dl-lic i { display: block; width: clamp(60px, 11vw, 110px); height: 10px; border-radius: 99px; background: #f0e2d8; overflow: hidden; }
#arena .dl-lic i b { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #ffd166, #ef5b6f); transition: width .8s cubic-bezier(.2,1,.3,1); }
#arena .dl-card { position: absolute; left: 50%; top: 33%; transform: translate(-50%, -50%) scale(.4) rotate(-8deg); opacity: 0; transition: transform .6s cubic-bezier(.2,1.5,.4,1), opacity .3s; background: #fffaf4; border-radius: 22px; padding: 10px; box-shadow: 0 20px 50px rgba(40,20,30,.35); }
#arena .dl-card.on { transform: translate(-50%, -50%) scale(1) rotate(-3deg); opacity: 1; }
#arena .dl-card canvas { display: block; width: min(340px, 40vw); height: auto; border-radius: 14px; }
#arena .a-btn.dl-hot { animation: dl-hot .5s ease-in-out infinite alternate; }
#arena .a-btn.dl-on { background: #ffd166; }
@keyframes dl-hot { from { box-shadow: 0 0 0 0 rgba(255,209,102,.95), 0 6px 18px rgba(60,30,40,.2); } to { box-shadow: 0 0 0 12px rgba(255,209,102,0), 0 6px 18px rgba(60,30,40,.2); transform: scale(1.08); } }
@keyframes dl-blink { to { filter: brightness(.94); transform: scale(1.06); } }
#arena .dl-layer.party .dl-list, #arena .dl-layer.party .dl-speed { opacity: 0; }
#arena .dl-layer.menu .dl-list, #arena .dl-layer.menu .dl-speed, #arena .dl-layer.menu .dl-say { opacity: 0; }
body.touch #arena .dl-say { bottom: max(12px, env(safe-area-inset-bottom)); max-width: 42vw; font-size: .82rem; padding: 7px 12px; }

#arena .dl-wrap { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(60,34,40,.26); pointer-events: auto; z-index: 4; }
#arena .dl-sheet { width: min(760px, 94vw); max-height: calc(100vh - 92px); overflow: auto; margin-top: 52px; background: #fffaf4; border-radius: 26px; padding: 16px 20px 16px; box-shadow: 0 20px 60px rgba(40,20,30,.35); text-align: center; animation: dl-in .3s cubic-bezier(.2,1.3,.4,1); position: relative; }
#arena .dl-sheet::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 8px; border-radius: 26px 26px 0 0; background: repeating-linear-gradient(90deg, #ffd166 0 26px, #21a99a 26px 52px, #ef5b6f 52px 78px); opacity: .9; }
#arena .dl-head { display: flex; align-items: center; gap: 12px; text-align: left; margin: 2px 0 10px; }
#arena .dl-head img { width: 62px; height: 62px; border-radius: 50%; background: #d6f4ea; box-shadow: 0 0 0 3px #fff, 0 4px 12px rgba(60,30,40,.18); flex: none; }
#arena .dl-head small { display: block; font-size: .7rem; letter-spacing: .08em; text-transform: uppercase; color: #21a99a; font-weight: 700; }
#arena .dl-head b { display: block; font-size: 1.4rem; line-height: 1.1; }
#arena .dl-head span { font-size: .82rem; color: #7a6470; }
#arena .dl-head .bar { display: inline-block; vertical-align: middle; width: 120px; height: 10px; border-radius: 99px; background: #f0e2d8; overflow: hidden; margin-left: 6px; }
#arena .dl-head .bar i { display: block; height: 100%; background: linear-gradient(90deg, #ffd166, #ef5b6f); border-radius: 99px; }
#arena .dl-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
#arena .dl-lv { position: relative; border: 0; border-radius: 18px; padding: 8px 6px 7px; background: #f6ece4; color: #3b2b3f; font: 600 .8rem var(--font, system-ui); cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 88px; justify-content: center; box-shadow: inset 0 -3px 0 rgba(60,30,40,.06); }
#arena .dl-lv b { font-size: 1.3rem; line-height: 1; color: #21a99a; }
#arena .dl-lv span { font-size: .76rem; line-height: 1.1; }
#arena .dl-lv em { font-style: normal; font-size: .66rem; color: #8a7480; }
#arena .dl-lv.test b { color: #ef5b6f; }
#arena .dl-lv.next { background: #fff1c2; box-shadow: inset 0 0 0 3px #ffd166; animation: dl-glow 1.1s infinite alternate; }
#arena .dl-lv:disabled { opacity: .6; cursor: default; }
#arena .dl-lv:hover:not(:disabled), #arena .dl-lv:focus-visible { background: #ffe9ef; outline: none; }
#arena .dl-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; align-items: center; margin-top: 12px; }
#arena .dl-btn { border: 0; border-radius: 999px; padding: .6em 1.3em; font: 600 1rem var(--font, system-ui); cursor: pointer; background: #f3e6dc; color: #3b2b3f; }
#arena .dl-btn.go { background: #ef5b6f; color: #fff; box-shadow: 0 4px 0 #c7404f; }
#arena .dl-btn.teal { background: #21a99a; color: #fff; box-shadow: 0 4px 0 #17867a; }
#arena .dl-btn:hover, #arena .dl-btn:focus-visible { filter: brightness(1.05); outline: none; transform: translateY(-1px); }
#arena .dl-paints { display: flex; gap: 6px; align-items: center; font-size: .78rem; color: #7a6470; }
#arena .dl-paint { width: 26px; height: 26px; border-radius: 50%; border: 0; cursor: pointer; box-shadow: inset 0 0 0 2px rgba(0,0,0,.08); position: relative; }
#arena .dl-paint.on { box-shadow: 0 0 0 3px #fffaf4, 0 0 0 5px #3b2b3f; }
#arena .dl-paint:disabled { cursor: default; opacity: .35; }
#arena .dl-paint small { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: .6rem; font-weight: 700; color: #3b2b3f; }
#arena .dl-total { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; background: #f6ece4; border-radius: 99px; padding: 3px 10px; }
#arena .dl-tip { display: flex; gap: 12px; align-items: center; text-align: left; background: #e9f8f2; border-radius: 18px; padding: 10px 14px; margin: 4px 0 10px; }
#arena .dl-tip img { width: 54px; height: 54px; border-radius: 50%; background: #d6f4ea; flex: none; box-shadow: 0 0 0 3px #fff; }
#arena .dl-tip p { margin: 0; font-size: .92rem; line-height: 1.35; }
#arena .dl-tip p b { color: #21a99a; }
#arena .dl-steps { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; list-style: none; margin: 0; padding: 0; counter-reset: s; }
#arena .dl-steps li { background: #f6ece4; border-radius: 99px; padding: 3px 10px 3px 4px; font-size: .8rem; display: flex; align-items: center; gap: 5px; counter-increment: s; }
#arena .dl-steps li::before { content: counter(s); width: 18px; height: 18px; border-radius: 50%; background: #ffd166; display: grid; place-items: center; font-size: .7rem; font-weight: 700; }
#arena .dl-goal { margin-top: 9px; font-size: .8rem; color: #7a6470; }
#arena .dl-big { display: flex; justify-content: center; gap: 8px; margin: 4px 0 6px; }
#arena .dl-big svg { width: 44px; height: 44px; opacity: 0; transform: scale(.3); animation: dl-star .5s cubic-bezier(.2,1.6,.4,1) forwards; }
#arena .dl-line { font-size: .94rem; line-height: 1.4; margin: 2px auto; max-width: 560px; }
#arena .dl-line b { color: #21a99a; }
#arena .dl-line.h b { color: #3f7bf0; }
#arena .dl-line.r b { color: #ef5b6f; }
#arena .dl-stats { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-top: 8px; font-size: .8rem; }
#arena .dl-stats span { background: #f6ece4; border-radius: 99px; padding: 2px 10px; }
#arena .dl-stats span.new { background: #fff1c2; font-weight: 700; }
#arena .dl-unlock { margin-top: 8px; display: inline-block; background: #e9f8f2; color: #17867a; border-radius: 99px; padding: 4px 14px; font-size: .84rem; font-weight: 600; }
#arena .dl-sheetlist { text-align: left; display: inline-block; margin: 6px auto 0; padding: 8px 14px; background: #fff6ea; border-radius: 14px; font-size: .8rem; line-height: 1.45; box-shadow: inset 0 0 0 2px #f3e2cc; }
#arena .dl-sheetlist b.s { color: #c7404f; }
#arena .dl-sheetlist .ok { color: #17867a; font-weight: 700; }
#arena .dl-licbar { display: block; width: 70%; margin: 8px auto 0; height: 12px; border-radius: 99px; background: #f0e2d8; overflow: hidden; }
#arena .dl-licbar b { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #ffd166, #ef5b6f); }
#arena .dl-keys { margin-top: 8px; font-size: .72rem; color: #9a8790; }
body.touch #arena .dl-keys { display: none; }
@keyframes dl-in { from { transform: scale(.92); opacity: 0; } }
@keyframes dl-star { 0% { opacity: 0; transform: scale(.3) rotate(-30deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes dl-glow { to { filter: brightness(1.05); } }
@media (max-height: 520px) {
  #arena .dl-list { top: calc(max(8px, env(safe-area-inset-top)) + 50px); padding: 6px 10px 7px 8px; font-size: .68rem; min-width: 0; max-width: 200px; border-radius: 14px; }
  #arena .dl-list h4 { font-size: .72rem; margin-bottom: 3px; }
  #arena .dl-list li { padding: 1px 5px; gap: 6px; }
  #arena .dl-list li i { width: 12px; height: 12px; font-size: 9px; }
  #arena .dl-smooth { margin-top: 3px; padding-top: 3px; font-size: .66rem; }
  #arena .dl-marks { font-size: .64rem; }
  #arena .dl-speed { top: calc(max(8px, env(safe-area-inset-top)) + 50px); gap: 4px; }
  #arena .dl-speed .dial { font-size: .95rem; padding: 3px 9px; min-width: 50px; border-radius: 12px; }
  #arena .dl-speed .lim { width: 32px; height: 32px; font-size: .8rem; box-shadow: inset 0 0 0 4px #e5484d; }
  #arena .dl-speed .gear { width: 28px; height: 28px; font-size: .8rem; }
  #arena .dl-pop { top: 30%; }
  #arena .dl-card { top: 30%; padding: 6px; border-radius: 16px; }
  #arena .dl-card canvas { width: min(250px, 30vw); border-radius: 11px; }
  #arena .dl-sheet { padding: 10px 14px 10px; margin-top: 0; max-height: 94vh; border-radius: 20px; width: min(800px, 92vw); }
  #arena .dl-head { margin: 0 0 6px; gap: 8px; }
  #arena .dl-head img { width: 40px; height: 40px; }
  #arena .dl-head b { font-size: 1.05rem; }
  #arena .dl-head small { font-size: .6rem; }
  #arena .dl-head span { font-size: .7rem; }
  #arena .dl-grid { gap: 5px; }
  #arena .dl-lv { min-height: 58px; padding: 4px 4px 3px; border-radius: 13px; gap: 0; }
  #arena .dl-lv b { font-size: .95rem; }
  #arena .dl-lv span { font-size: .64rem; }
  #arena .dl-lv em { font-size: .56rem; }
  #arena .dl-lv svg { width: 11px; height: 11px; }
  #arena .dl-row { margin-top: 6px; gap: 6px; }
  #arena .dl-btn { font-size: .84rem; padding: .42em 1em; }
  #arena .dl-paint { width: 20px; height: 20px; }
  #arena .dl-tip { padding: 5px 10px; margin: 2px 0 6px; gap: 8px; }
  #arena .dl-tip img { width: 36px; height: 36px; }
  #arena .dl-tip p { font-size: .74rem; }
  #arena .dl-steps li { font-size: .66rem; padding: 1px 8px 1px 3px; }
  #arena .dl-steps li::before { width: 14px; height: 14px; font-size: .58rem; }
  #arena .dl-goal { margin-top: 5px; font-size: .68rem; }
  #arena .dl-big svg { width: 30px; height: 30px; }
  #arena .dl-line { font-size: .74rem; line-height: 1.3; }
  #arena .dl-stats { font-size: .66rem; margin-top: 4px; }
  #arena .dl-unlock { font-size: .7rem; margin-top: 4px; padding: 2px 10px; }
  #arena .dl-sheetlist { font-size: .64rem; padding: 4px 10px; line-height: 1.3; }
  #arena .dl-licbar { height: 8px; margin-top: 4px; }
  body.dl-cardopen #arena .a-title, body.dl-cardopen #arena .a-score { display: none; }
}
`;

function portrait(L, bg) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.fillStyle = bg;
  c.beginPath();
  c.arc(64, 64, 64, 0, Math.PI * 2);
  c.fill();
  c.save();
  c.beginPath();
  c.arc(64, 64, 64, 0, Math.PI * 2);
  c.clip();
  drawChibi(c, 64, 60, 52, L);
  c.restore();
  return cv.toDataURL();
}

export function makeUI(ctx) {
  const { hud } = ctx;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const host = document.getElementById('arena') || document.body;
  const layer = document.createElement('div');
  layer.className = 'dl-layer menu';
  layer.innerHTML = `
    <div class="dl-list"><h4></h4><ol></ol><div class="dl-smooth">Smooth driving<span></span></div><div class="dl-marks" hidden></div></div>
    <div class="dl-speed"><div class="lim">20</div><div class="dial"><span>0</span><small>km/h</small></div><div class="gear">D</div><div class="gear lights" title="Headlights">L</div></div>
    <div class="dl-say hide"><b>Abu Sanad</b><span></span></div>
    <div class="dl-pop"></div>
    <div class="dl-card"><canvas width="760" height="460"></canvas></div>`;
  host.appendChild(layer);
  const $ = (s) => layer.querySelector(s);
  const pics = { abu: portrait(ABU_SANAD_PHOTO, '#d6f4ea'), roji: portrait(ROJI_PHOTO, '#ffe1ea'), homama: portrait(HOMAMA_PHOTO, '#dbe8ff') };
  let wrap = null;
  const timers = new Set();
  const later = (ms, fn) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  };

  // ------------------------------------------------------------ speech, pops and the task list
  const sayEl = $('.dl-say');
  let sayTimer = 0;
  let sayBack = null;
  const say = (text, who = 'Abu Sanad', ms = 0, back = null) => {
    sayEl.querySelector('b').textContent = who;
    sayEl.querySelector('span').textContent = text;
    sayEl.className = `dl-say${who === 'Homama' ? ' who-homama' : who === 'Roji' ? ' who-roji' : ''}`;
    clearTimeout(sayTimer);
    timers.delete(sayTimer);
    if (ms) {
      sayBack = back;
      sayTimer = later(ms, () => sayBack?.());
    } else sayBack = null;
  };
  const hideSay = () => sayEl.classList.add('hide');
  const popEl = $('.dl-pop');
  let popTimer = 0;
  const pop = (html, color = '#fff', ms = 1100) => {
    popEl.innerHTML = html;
    popEl.style.color = color;
    popEl.classList.remove('on');
    void popEl.offsetWidth;
    popEl.classList.add('on');
    clearTimeout(popTimer);
    timers.delete(popTimer);
    popTimer = later(ms, () => popEl.classList.remove('on'));
  };
  let items = [];
  const setList = (title, labels) => {
    $('.dl-list h4').innerHTML = esc(title);
    $('.dl-list ol').innerHTML = labels.map((l) => `<li><i></i><span>${esc(l)}</span></li>`).join('');
    items = [...layer.querySelectorAll('.dl-list li')];
  };
  const setTask = (i, missed = []) => {
    items.forEach((li, k) => {
      li.className = k < i ? (missed[k] ? 'done miss' : 'done') : k === i ? 'now' : '';
      li.querySelector('i').textContent = k < i ? (missed[k] ? '!' : '\u2713') : '';
    });
  };
  const setStars = (n) => ($('.dl-smooth span').innerHTML = [1, 2, 3].map((k) => STAR(k <= n, 15)).join(''));
  const setMarks = (on, minor = 0, serious = 0) => {
    const m = $('.dl-marks');
    m.hidden = !on;
    $('.dl-smooth').hidden = on;
    if (on) m.innerHTML = `<span class="${minor > 3 ? 'bad' : ''}">${CLIP} Small faults ${minor}</span><span class="${serious ? 'bad' : ''}">Serious ${serious}</span>`;
  };
  const speedEl = $('.dl-speed');
  const dial = $('.dl-speed .dial');
  const gearEl = $('.dl-speed .gear');
  const lightEl = $('.dl-speed .lights');
  let lastKmh = -1;
  const setSpeed = (kmh, { limit = null, over = false, gear = 'D', night = false, lights = false } = {}) => {
    if (kmh !== lastKmh) {
      lastKmh = kmh;
      dial.querySelector('span').textContent = kmh;
    }
    speedEl.classList.toggle('limit', !!limit);
    speedEl.classList.toggle('night', night);
    dial.classList.toggle('over', over);
    gearEl.textContent = gear;
    gearEl.classList.toggle('r', gear === 'R');
    lightEl.classList.toggle('lit', lights);
  };
  const mode = (m) => {
    layer.classList.toggle('menu', m === 'menu');
    layer.classList.toggle('party', m === 'party');
  };

  // ------------------------------------------------------------ cards
  const closeCard = () => {
    wrap?.remove();
    wrap = null;
    document.body.classList.remove('dl-cardopen');
  };
  const card = (html, on = {}) => {
    closeCard();
    wrap = document.createElement('div');
    wrap.className = 'dl-wrap';
    wrap.innerHTML = `<div class="dl-sheet" role="dialog">${html}</div>`;
    host.appendChild(wrap);
    document.body.classList.add('dl-cardopen');
    // Only a press that starts on the card counts (a touch that opened it must not also click a button)
    let armed = false;
    wrap.addEventListener('pointerdown', () => (armed = true));
    wrap.addEventListener('click', (e) => {
      if (!armed && e.detail !== 0) return;
      const b = e.target.closest('[data-a]');
      if (!b || b.disabled) return;
      ctx.sound?.ui('tap');
      on[b.dataset.a]?.(b.dataset.v);
    });
    wrap.addEventListener('keydown', (e) => e.stopPropagation());
    later(30, () => wrap?.querySelector('.go, .next')?.focus({ preventScroll: true }));
    return wrap;
  };

  // data: { who: 'roji' | 'homama', stars[], best[], done[], open(i), next, total, licence, paints: [{ id, color, need, name }], paint }
  function course(d, on) {
    const roji = d.who === 'roji';
    const tiles = d.lessons
      .map((L, i) => {
        const open = d.open(i);
        const best = d.best[i];
        return `<button class="dl-lv${i === d.next ? ' next' : ''}${L.test ? ' test' : ''}" data-a="pick" data-v="${i}" ${open ? '' : 'disabled'} aria-label="Lesson ${i + 1}: ${esc(L.title)}">
          <b>${open ? (L.test ? 'Test' : i + 1) : LOCK}</b><span>${esc(L.title)}</span>
          <span>${[1, 2, 3].map((k) => STAR(k <= d.stars[i], 13)).join('')}</span>
          <em>${d.done[i] ? (best != null ? `Best ${fmtTime(best)}` : 'Done') : open ? 'New' : 'Locked'}</em></button>`;
      })
      .join('');
    const paints = d.paints
      .map((p) => `<button class="dl-paint${p.id === d.paint ? ' on' : ''}" data-a="paint" data-v="${p.id}" style="background:${p.color}" ${d.total >= p.need ? '' : 'disabled'} title="${esc(p.name)}${d.total >= p.need ? '' : `: ${p.need} stars`}" aria-label="${esc(p.name)} car">${d.total >= p.need ? '' : `<small>${p.need}</small>`}</button>`)
      .join('');
    const lic = roji
      ? d.licence >= 100
        ? '<span>Roji has her licence! Practise any lesson.</span>'
        : `<span>Roji's licence ${Math.round(d.licence)}%<i class="bar"><i style="width:${Math.max(4, d.licence)}%"></i></i></span>`
      : '<span>Homama already has his licence. A refresher keeps him sharp, with Roji cheering.</span>';
    card(
      `<div class="dl-head"><img alt="" src="${pics.abu}"><div><small>Little Wheels Driving School</small><b>${roji ? "Abu Sanad's driving course" : "Homama's refresher course"}</b>${lic}</div></div>
      <div class="dl-grid">${tiles}</div>
      <div class="dl-row"><span class="dl-paints">Car colour ${paints}</span><span class="dl-total">${STAR(true, 16)} ${d.total} / ${d.lessons.length * 3}</span><button class="dl-btn" data-a="exit">Back to town</button></div>`,
      on,
    );
  }

  function intro(L, i, d, on) {
    const steps = L.tasks().map((t) => `<li>${esc(t.label)}</li>`).join('');
    const best = d.best[i];
    const rule = L.test ? 'Pass: no serious faults and 3 small faults at most.' : '3 stars: no bumps and no slips. Every lesson unlocks the next one.';
    card(
      `<div class="dl-head"><img alt="" src="${pics[d.who]}"><div><small>${L.test ? 'Final lesson' : `Lesson ${i + 1} of ${d.lessons.length}`}</small><b>${esc(L.title)}</b><span>${esc(L.sub)}</span></div></div>
      <div class="dl-tip"><img alt="" src="${pics.abu}"><p><b>Abu Sanad's tip:</b> ${esc(L.tip)}</p></div>
      <ol class="dl-steps">${steps}</ol>
      <div class="dl-goal">${rule}${best != null ? ` Best time ${fmtTime(best)}.` : ''}</div>
      <div class="dl-row"><button class="dl-btn go" data-a="start">${L.test ? 'Start the test' : 'Start the lesson'}</button><button class="dl-btn" data-a="back">Course</button></div>
      <div class="dl-keys">Steer with the arrows, WASD or the mouse. Hold E to brake. ${L.reverse ? 'R switches to Reverse. ' : ''}${L.lights ? 'L for the headlights. ' : ''}Space honks.</div>`,
      on,
    );
  }

  // r: { lesson, i, stars, title, abu, fan, fanWho, time, best, newBest, unlocked, test, pass, faults[], licence, gained, canNext }
  function result(r, on) {
    const stars = [1, 2, 3].map((k) => STAR(k <= r.stars, 44)).join('');
    const faults = r.test
      ? `<div class="dl-sheetlist">${r.faults.length ? r.faults.map((f) => `${f.serious ? '<b class="s">Serious:</b>' : 'Small:'} ${esc(f.text)}`).join('<br>') : '<span class="ok">A clean sheet. Not one fault!</span>'}</div>`
      : '';
    const lic = r.who === 'roji' && r.licence != null ? (r.licence >= 100 ? '' : `<span class="dl-line">Licence progress <b>${Math.round(r.licence)}%</b>${r.gained ? ` (+${r.gained})` : ''}</span><span class="dl-licbar"><b style="width:${r.licence}%"></b></span>`) : '';
    const w = card(
      `<div class="dl-head" style="justify-content:center;text-align:center"><div><small>${r.test ? 'The driving test' : `Lesson ${r.i + 1}: ${esc(r.lesson.title)}`}</small><b>${esc(r.title)}</b></div></div>
      <div class="dl-big">${stars}</div>
      <div class="dl-line"><b>Abu Sanad:</b> "${esc(r.abu)}"</div>
      <div class="dl-line ${r.fanWho === 'Homama' ? 'h' : 'r'}"><b>${r.fanWho}:</b> "${esc(r.fan)}"</div>
      ${faults}
      <div class="dl-stats"><span>Time ${fmtTime(r.time)}</span>${r.newBest ? '<span class="new">New best!</span>' : r.best != null ? `<span>Best ${fmtTime(r.best)}</span>` : ''}</div>
      ${r.unlocked ? `<span class="dl-unlock">${esc(r.unlocked)}</span>` : ''}
      ${lic}
      <div class="dl-row">${r.canNext ? `<button class="dl-btn go" data-a="next">${r.nextIsTest ? 'On to the test' : 'Next lesson'}</button>` : ''}<button class="dl-btn${r.canNext ? '' : ' go'}" data-a="again">Try again</button><button class="dl-btn" data-a="course">Course</button><button class="dl-btn" data-a="exit">Back to town</button></div>`,
      on,
    );
    w.querySelectorAll('.dl-big svg').forEach((s, k) => {
      s.style.animationDelay = `${0.2 + k * 0.3}s`;
      if (k >= r.stars) s.style.filter = 'grayscale(.2)';
    });
    for (let k = 0; k < r.stars; k++) later(200 + k * 300, () => ctx.sound?.ctx && !ctx.sound.muted && ctx.sound.tone(660 * Math.pow(1.26, k), ctx.sound.ctx.currentTime, 0.25, { type: 'triangle', gain: 0.06 }));
  }

  // ------------------------------------------------------------ the licence card
  const cardCv = $('.dl-card canvas');
  function licenceCard(name, show) {
    if (!show) return $('.dl-card').classList.remove('on');
    const c = cardCv.getContext('2d');
    const w = cardCv.width;
    const h = cardCv.height;
    c.clearRect(0, 0, w, h);
    const gr = c.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#fff6dc');
    gr.addColorStop(1, '#ffe1ea');
    c.fillStyle = gr;
    roundRect(c, 0, 0, w, h, 34);
    c.fill();
    c.fillStyle = C.teal;
    roundRect(c, 0, 0, w, 96, 34);
    c.fill();
    c.fillRect(0, 60, w, 36);
    drawWheelBadge(c, 62, 48, 32);
    paintText(c, 'DRIVING LICENCE', w / 2 + 24, 50, 46, '#ffffff');
    c.fillStyle = '#ffffff';
    roundRect(c, 40, 130, 220, 260, 20);
    c.fill();
    c.save();
    c.beginPath();
    c.rect(40, 130, 220, 260);
    c.clip();
    c.fillStyle = '#cfe9ff';
    c.fillRect(40, 130, 220, 260);
    drawChibi(c, 150, 250, 88, name === 'Roji' ? ROJI_PHOTO : HOMAMA_PHOTO);
    c.restore();
    paintText(c, 'Name', 300, 160, 26, '#8a7480', 600, 'left');
    paintText(c, name, 300, 205, 58, C.ink, 700, 'left');
    paintText(c, 'Certified driver', 300, 262, 34, C.rose, 700, 'left');
    paintText(c, 'Little Wheels Driving School', 300, 306, 24, '#6a5662', 600, 'left');
    paintText(c, 'Signed: Abu Sanad', 300, 344, 24, C.teal, 600, 'left');
    paintText(c, name === 'Roji' ? 'Cheered on by Homama' : 'Cheered on by Roji', 300, 380, 22, C.blue, 600, 'left');
    c.fillStyle = C.rose;
    heartPath(c, w - 70, h - 70, 40);
    c.fill();
    $('.dl-card').classList.add('on');
  }

  return {
    layer,
    say,
    hideSay,
    pop,
    setList,
    setTask,
    setStars,
    setMarks,
    setSpeed,
    mode,
    course,
    intro,
    result,
    closeCard,
    licenceCard,
    get cardOpen() {
      return !!wrap;
    },
    meter(html) {
      hud.score(html);
    },
    dispose() {
      for (const id of timers) clearTimeout(id);
      timers.clear();
      closeCard();
      layer.remove();
      style.remove();
    },
  };
}
