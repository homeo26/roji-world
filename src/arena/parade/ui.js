// The parade's own little HUD over the 3D scene: the judgement that pops up over the pad you hit
// (Perfect, Great, Good, Miss), the combo counter, the song's progress, a banner for each part of the
// song and speech bubbles for the partner. Removed again when the game closes.

const CSS = `
#pd-ui { position: fixed; inset: 0; z-index: 41; pointer-events: none; font-family: var(--font, 'Fredoka', system-ui, sans-serif); color: #3b2b3f; overflow: hidden; }
#pd-ui.off { display: none; }
#pd-ui .pd-j { position: absolute; transform: translate(-50%, -50%); font-weight: 700; font-size: 1.35rem; white-space: nowrap; text-shadow: 0 2px 0 rgba(255,255,255,.9), 0 4px 12px rgba(60,20,40,.25); animation: pd-pop .55s ease-out forwards; }
#pd-ui .pd-j.perfect { color: #ef5b6f; font-size: 1.5rem; }
#pd-ui .pd-j.great { color: #2fae84; }
#pd-ui .pd-j.good { color: #3f7bf0; }
#pd-ui .pd-j.miss { color: #9a8a94; font-size: 1.1rem; }
#pd-ui .pd-j.hold { color: #e0a020; font-size: 1.05rem; }
@keyframes pd-pop { 0% { opacity: 0; transform: translate(-50%, -20%) scale(.6); } 18% { opacity: 1; transform: translate(-50%, -60%) scale(1.12); } 70% { opacity: 1; transform: translate(-50%, -95%) scale(1); } 100% { opacity: 0; transform: translate(-50%, -130%) scale(.96); } }
#pd-ui .pd-combo { position: absolute; left: max(14px, env(safe-area-inset-left)); top: 44%; transform: translateY(-50%); text-align: center; min-width: 84px; opacity: 0; transition: opacity .2s; }
#pd-ui .pd-combo.on { opacity: 1; }
#pd-ui .pd-combo b { display: block; font-size: 2.6rem; line-height: 1; color: #fff; text-shadow: 0 3px 0 rgba(239,91,111,.9), 0 6px 18px rgba(60,20,40,.35); transition: transform .12s; }
#pd-ui .pd-combo b.bump { transform: scale(1.25); }
#pd-ui .pd-combo span { display: inline-block; margin-top: 2px; font-size: .8rem; font-weight: 700; background: rgba(255,250,244,.92); border-radius: 99px; padding: 2px 10px; box-shadow: 0 4px 12px rgba(60,30,40,.14); }
#pd-ui .pd-combo i { display: inline-block; font-style: normal; font-size: .76rem; font-weight: 700; color: #fff; margin-top: 4px; background: #ef5b6f; border-radius: 99px; padding: 1px 9px; }
#pd-ui .pd-combo i:empty { display: none; }
#pd-ui .pd-prog { position: absolute; left: 50%; top: max(14px, env(safe-area-inset-top)); transform: translateX(-50%); width: min(260px, 30vw); height: 10px; border-radius: 99px; background: rgba(255,250,244,.85); box-shadow: 0 4px 12px rgba(60,30,40,.14); overflow: hidden; }
#pd-ui .pd-prog div { height: 100%; width: 0; border-radius: 99px; background: linear-gradient(90deg, #ff9eb5, #ef5b6f); }
#pd-ui .pd-prog .duet { position: absolute; top: 0; bottom: 0; background: rgba(199,166,255,.55); }
#pd-ui .pd-banner { position: absolute; left: 50%; top: calc(max(14px, env(safe-area-inset-top)) + 22px); transform: translate(-50%, -8px); background: #3b2b3f; color: #fffaf4; font-weight: 700; font-size: 1rem; padding: 6px 16px 7px; border-radius: 99px; box-shadow: 0 6px 18px rgba(60,20,40,.3); opacity: 0; transition: opacity .25s, transform .35s cubic-bezier(.2,1.4,.4,1); white-space: nowrap; }
#pd-ui .pd-banner.on { opacity: 1; transform: translate(-50%, 0); }
#pd-ui .pd-bubble { position: absolute; transform: translate(-50%, -100%); background: #fffaf4; border-radius: 16px; padding: 5px 12px; font-weight: 600; font-size: .92rem; white-space: nowrap; box-shadow: 0 6px 16px rgba(60,30,40,.2); opacity: 0; transition: opacity .2s; }
#pd-ui .pd-bubble::after { content: ''; position: absolute; left: 50%; bottom: -7px; margin-left: -7px; border: 7px solid transparent; border-bottom: 0; border-top-color: #fffaf4; }
#pd-ui .pd-bubble.on { opacity: 1; }
#pd-ui .pd-flash { position: absolute; inset: 0; background: radial-gradient(circle at 50% 60%, rgba(255,240,250,.0), rgba(255,200,230,.45)); opacity: 0; transition: opacity .5s; }
#pd-ui .pd-flash.on { opacity: 1; transition: opacity .05s; }
@media (max-height: 520px) {
  #pd-ui .pd-j { font-size: 1.05rem; }
  #pd-ui .pd-j.perfect { font-size: 1.15rem; }
  #pd-ui .pd-combo { top: 50%; min-width: 64px; }
  #pd-ui .pd-combo b { font-size: 1.9rem; }
  #pd-ui .pd-combo span { font-size: .7rem; }
  #pd-ui .pd-prog { top: max(8px, env(safe-area-inset-top)); width: min(180px, 24vw); height: 8px; }
  #pd-ui .pd-banner { top: calc(max(8px, env(safe-area-inset-top)) + 16px); font-size: .86rem; padding: 4px 12px 5px; }
  #pd-ui .pd-bubble { font-size: .8rem; padding: 4px 10px; }
}
body.arena-result #pd-ui { display: none; }
`;

export function makeUI() {
  if (!document.getElementById('pd-style')) {
    const s = document.createElement('style');
    s.id = 'pd-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  const el = document.createElement('div');
  el.id = 'pd-ui';
  el.className = 'off';
  el.innerHTML = `<div class="pd-flash"></div><div class="pd-prog"><div></div></div><div class="pd-banner"></div><div class="pd-combo"><b>0</b><span>combo</span><br><i></i></div><div class="pd-bubble"></div>`;
  document.body.appendChild(el);
  const $ = (s) => el.querySelector(s);
  const combo = $('.pd-combo');
  const comboN = $('.pd-combo b');
  const comboX = $('.pd-combo i');
  const bar = $('.pd-prog div');
  const banner = $('.pd-banner');
  const bubble = $('.pd-bubble');
  const flash = $('.pd-flash');
  let bannerT = 0;
  let bubbleT = 0;
  let lastCombo = 0;
  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };
  return {
    el,
    show(on = true) {
      el.classList.toggle('off', !on);
    },
    // mark the duet on the progress bar (fractions 0..1)
    marks(list) {
      for (const [a, b] of list) {
        const d = document.createElement('div');
        d.className = 'duet';
        d.style.left = `${a * 100}%`;
        d.style.width = `${(b - a) * 100}%`;
        $('.pd-prog').appendChild(d);
      }
    },
    judge(x, y, grade, text) {
      const d = document.createElement('div');
      d.className = `pd-j ${grade}`;
      d.textContent = text;
      d.style.left = `${x}px`;
      d.style.top = `${y}px`;
      el.appendChild(d);
      later(() => d.remove(), 600);
    },
    combo(n, mult) {
      combo.classList.toggle('on', n >= 4);
      comboN.textContent = String(n);
      comboX.textContent = mult > 1 ? `x${mult} points` : '';
      if (n > lastCombo && n % 10 === 0) {
        comboN.classList.add('bump');
        later(() => comboN.classList.remove('bump'), 140);
      }
      lastCombo = n;
    },
    progress(k) {
      bar.style.width = `${Math.max(0, Math.min(1, k)) * 100}%`;
    },
    banner(text, ms = 1800) {
      banner.textContent = text;
      banner.classList.add('on');
      bannerT = ms / 1000;
    },
    bubble(text, sec = 1.8) {
      bubble.textContent = text;
      bubble.classList.add('on');
      bubbleT = sec;
    },
    flash() {
      flash.classList.add('on');
      later(() => flash.classList.remove('on'), 90);
    },
    // per frame: place the bubble over the partner's head (screen px)
    update(dt, bubbleAt) {
      if (bannerT > 0) {
        bannerT -= dt;
        if (bannerT <= 0) banner.classList.remove('on');
      }
      if (bubbleT > 0) {
        bubbleT -= dt;
        if (bubbleT <= 0) bubble.classList.remove('on');
      }
      if (bubbleAt) {
        bubble.style.left = `${bubbleAt.x}px`;
        bubble.style.top = `${bubbleAt.y}px`;
      }
    },
    remove() {
      for (const id of timers) clearTimeout(id);
      timers.clear();
      el.remove();
    },
  };
}
