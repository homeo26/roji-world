import { FISH, RARITY } from './fish.js';

// The fishing game's own overlay: power bar, reel bar, catch card, speech bubble and the fish book.
// Everything lives in one element that dispose() removes.

const CSS = `
#fishing-ui { position: fixed; inset: 0; z-index: 41; pointer-events: none; font-family: var(--font, 'Fredoka', system-ui, sans-serif); color: #3b2b3f; }
#fishing-ui .fg-book-btn { position: absolute; bottom: max(16px, env(safe-area-inset-bottom)); left: max(12px, env(safe-area-inset-left)); pointer-events: auto; border: 0; border-radius: 999px; padding: 7px 14px 7px 10px; background: rgba(255,250,244,.94); box-shadow: 0 6px 18px rgba(60,30,40,.15); font: 600 .85rem var(--font, system-ui); color: #3b2b3f; display: flex; align-items: center; gap: 6px; cursor: pointer; }
#fishing-ui .fg-book-btn.off { display: none; }
#fishing-ui .fg-book-btn b { background: #2f9fb8; color: #fff; border-radius: 999px; padding: 1px 7px; font-size: .75rem; }
#fishing-ui .fg-power { position: absolute; left: 50%; bottom: calc(max(16px, env(safe-area-inset-bottom)) + 44px); transform: translateX(-50%); width: min(360px, 46vw); height: 18px; border-radius: 999px; background: rgba(255,250,244,.92); box-shadow: 0 6px 18px rgba(60,30,40,.18); overflow: hidden; opacity: 0; transition: opacity .15s; }
#fishing-ui .fg-power.on { opacity: 1; }
#fishing-ui .fg-power i { position: absolute; left: 3px; top: 3px; bottom: 3px; border-radius: 999px; background: linear-gradient(90deg, #7fd8bf, #ffd166 60%, #ef5b6f); width: 0; }
#fishing-ui .fg-power span { position: absolute; inset: 0; display: grid; place-items: center; font-size: .72rem; font-weight: 700; color: #3b2b3f; }
#fishing-ui .fg-reel { position: absolute; left: max(6vw, 40px); top: 50%; transform: translateY(-50%); display: none; gap: 10px; align-items: stretch; height: min(58vh, 320px); }
#fishing-ui .fg-reel.on { display: flex; }
#fishing-ui .fg-track { position: relative; width: 52px; border-radius: 26px; background: linear-gradient(#1f6f8c, #3fa7c4); box-shadow: inset 0 0 0 4px rgba(255,255,255,.7), 0 8px 22px rgba(20,40,60,.3); overflow: hidden; }
#fishing-ui .fg-zone { position: absolute; left: 5px; right: 5px; border-radius: 20px; background: rgba(127,216,191,.9); box-shadow: 0 0 0 3px rgba(255,255,255,.85) inset; transition: background .1s; }
#fishing-ui .fg-zone.hot { background: rgba(160,240,190,1); }
#fishing-ui .fg-fish { position: absolute; left: 50%; width: 38px; height: 26px; margin: -13px 0 0 -19px; }
#fishing-ui .fg-prog { position: relative; width: 14px; border-radius: 8px; background: rgba(255,250,244,.85); box-shadow: 0 6px 16px rgba(20,40,60,.25); overflow: hidden; }
#fishing-ui .fg-prog i { position: absolute; left: 2px; right: 2px; bottom: 2px; border-radius: 6px; background: linear-gradient(#ffd166, #7fd8bf); }
#fishing-ui .fg-reel-tip { position: absolute; left: 0; bottom: -30px; white-space: nowrap; font-size: .8rem; font-weight: 600; background: rgba(255,250,244,.9); padding: 3px 10px; border-radius: 999px; }
#fishing-ui .fg-card { position: absolute; left: 50%; bottom: calc(max(16px, env(safe-area-inset-bottom)) + 12px); transform: translate(-50%, 30px) scale(.9); opacity: 0; transition: opacity .2s, transform .3s cubic-bezier(.2,1.4,.4,1); background: #fffaf4; border-radius: 22px; padding: 10px 18px 12px; min-width: min(300px, 70vw); max-width: min(420px, 86vw); box-shadow: 0 16px 40px rgba(40,20,30,.3); text-align: center; }
#fishing-ui .fg-card.on { opacity: 1; transform: translate(-50%, 0) scale(1); }
#fishing-ui .fg-card .r { font-size: .72rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
#fishing-ui .fg-card h3 { margin: 2px 0 0; font-size: 1.35rem; }
#fishing-ui .fg-card .sz { font-weight: 700; color: #2f9fb8; }
#fishing-ui .fg-card p { margin: 4px 0 0; font-size: .85rem; color: #6a5662; }
#fishing-ui .fg-card .new { display: inline-block; margin-left: 6px; background: #ef5b6f; color: #fff; font-size: .7rem; padding: 2px 8px; border-radius: 999px; vertical-align: middle; }
#fishing-ui .fg-bubble { position: absolute; transform: translate(-50%, -100%); background: #fffaf4; border-radius: 16px; padding: 6px 12px; font-size: .88rem; font-weight: 500; box-shadow: 0 8px 20px rgba(40,20,30,.2); opacity: 0; transition: opacity .25s; white-space: nowrap; max-width: 60vw; }
#fishing-ui .fg-bubble:after { content: ''; position: absolute; left: 50%; bottom: -7px; margin-left: -7px; border: 7px solid transparent; border-top-color: #fffaf4; border-bottom: 0; }
#fishing-ui .fg-bubble.on { opacity: 1; }
#fishing-ui .fg-book { position: absolute; inset: 0; display: none; place-items: center; background: rgba(40,24,40,.38); pointer-events: auto; }
#fishing-ui .fg-book.on { display: grid; }
#fishing-ui .fg-book .pg { background: #fffaf4; border-radius: 24px; padding: 14px 16px; width: min(640px, 92vw); max-height: 86vh; overflow: auto; box-shadow: 0 20px 60px rgba(40,20,30,.35); }
#fishing-ui .fg-book .hd { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
#fishing-ui .fg-book .hd h3 { margin: 0; font-size: 1.25rem; flex: 1; }
#fishing-ui .fg-book .hd button { border: 0; border-radius: 999px; padding: 6px 14px; background: #ef5b6f; color: #fff; font: 600 .9rem var(--font, system-ui); cursor: pointer; }
#fishing-ui .fg-book .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 8px; }
#fishing-ui .fg-book .it { border-radius: 16px; padding: 6px 6px 8px; background: #f6ece4; text-align: center; font-size: .78rem; }
#fishing-ui .fg-book .it.got { background: #e9f7f3; }
#fishing-ui .fg-book .it svg { display: block; margin: 0 auto 2px; }
#fishing-ui .fg-book .it b { display: block; font-size: .86rem; }
#fishing-ui .fg-book .it small { color: #7a6470; }
#fishing-ui .fg-book .foot { margin-top: 8px; font-size: .8rem; color: #7a6470; text-align: center; }
@media (max-height: 520px) {
  #fishing-ui .fg-book-btn { bottom: max(10px, env(safe-area-inset-bottom)); padding: 5px 12px 5px 8px; font-size: .78rem; }
    #fishing-ui .fg-card { bottom: 10px; padding: 6px 14px 8px; }
  #fishing-ui .fg-card h3 { font-size: 1.1rem; }
  #fishing-ui .fg-card p { font-size: .78rem; }
  #fishing-ui .fg-reel { height: 62vh; left: max(5vw, 28px); }
  #fishing-ui .fg-book .grid { grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); }
}
`;

// A little fish picture for the book and the reel bar (tinted per species).
const COLORS = { sardine: '#4f86c6', mackerel: '#2f8c86', starfish: '#ff8a6a', crab: '#ef6b5b', boot: '#8a5a3c', clownfish: '#ff8a3d', seabream: '#e98f9a', puffer: '#e8c35a', duck: '#ffd43b', seabass: '#6f8799', snapper: '#e5484d', octopus: '#c76fa8', tuna: '#2c4a86', bottle: '#7fcfc0', golden: '#f4b62f' };
export function fishIcon(id, size = 40, color = COLORS[id] || '#4f86c6') {
  const shapes = {
    starfish: `<path d="M20 4l4 10 10 1-8 6 3 10-9-6-9 6 3-10-8-6 10-1z" fill="${color}"/>`,
    crab: `<ellipse cx="20" cy="22" rx="10" ry="6" fill="${color}"/><circle cx="7" cy="14" r="4" fill="${color}"/><circle cx="33" cy="14" r="4" fill="${color}"/><circle cx="16" cy="17" r="1.6" fill="#23202a"/><circle cx="24" cy="17" r="1.6" fill="#23202a"/>`,
    boot: `<path d="M12 6h10v16h8a4 4 0 0 1 4 4v4H10V6z" fill="${color}"/><rect x="10" y="28" width="24" height="3" fill="#4a3020"/>`,
    duck: `<ellipse cx="18" cy="25" rx="12" ry="7" fill="${color}"/><circle cx="25" cy="15" r="6" fill="${color}"/><path d="M30 15l6 1-6 2z" fill="#ff8a3d"/><circle cx="26" cy="13.5" r="1.2" fill="#23202a"/>`,
    octopus: `<ellipse cx="20" cy="15" rx="9" ry="9" fill="${color}"/><path d="M11 20c-3 6-6 8-6 8M15 22c-1 5-3 9-3 9M20 23v9M25 22c1 5 3 9 3 9M29 20c3 6 6 8 6 8" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="17" cy="14" r="1.6" fill="#23202a"/><circle cx="23" cy="14" r="1.6" fill="#23202a"/>`,
    bottle: `<rect x="8" y="14" width="20" height="12" rx="5" fill="${color}"/><rect x="28" y="17" width="6" height="6" rx="2" fill="${color}"/><rect x="34" y="17.5" width="3" height="5" fill="#b9814f"/><rect x="12" y="17" width="12" height="6" rx="2" fill="#fff4dc"/>`,
    puffer: `<circle cx="20" cy="20" r="10" fill="${color}"/><path d="M8 12l3 3M32 12l-3 3M20 6v4M8 28l3-3M32 28l-3-3" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/><circle cx="25" cy="17" r="2" fill="#23202a"/>`,
  };
  const body = shapes[id] || `<path d="M4 12l7 8-7 8z" fill="${color}"/><ellipse cx="22" cy="20" rx="14" ry="${id === 'seabream' || id === 'golden' || id === 'snapper' ? 9 : 7}" fill="${color}"/><circle cx="29" cy="18" r="2" fill="#fff"/><circle cx="29.6" cy="18" r="1.1" fill="#23202a"/>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">${body}</svg>`;
}

export function makeUI(ctx) {
  if (!document.getElementById('fishing-style')) {
    const s = document.createElement('style');
    s.id = 'fishing-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  const el = document.createElement('div');
  el.id = 'fishing-ui';
  el.innerHTML = `
    <button class="fg-book-btn" aria-label="Fish book">${fishIcon('sardine', 18, '#2f9fb8')} Fish book <b>0</b></button>
    <div class="fg-power"><i></i><span>Hold to cast further</span></div>
    <div class="fg-reel"><div class="fg-track"><div class="fg-zone"></div><div class="fg-fish"></div></div><div class="fg-prog"><i></i></div><div class="fg-reel-tip">Hold to lift the green bar</div></div>
    <div class="fg-card"></div>
    <div class="fg-bubble"></div>
    <div class="fg-book"><div class="pg"><div class="hd"><h3>Fish book</h3><button data-x>Close</button></div><div class="grid"></div><div class="foot"></div></div></div>`;
  document.body.appendChild(el);
  const $ = (s) => el.querySelector(s);
  const power = $('.fg-power');
  const powerBar = $('.fg-power i');
  const reel = $('.fg-reel');
  const zone = $('.fg-zone');
  const fishEl = $('.fg-fish');
  const prog = $('.fg-prog i');
  const card = $('.fg-card');
  const bubble = $('.fg-bubble');
  const book = $('.fg-book');
  let cardTimer = 0;
  let bubbleTimer = 0;
  const ui = {
    el,
    onBook: null,
    bookOpen: false,
    power(k, label) {
      power.classList.toggle('on', k !== null);
      if (k !== null) powerBar.style.width = `calc(${Math.round(k * 100)}% - 6px)`;
      if (label) $('.fg-power span').textContent = label;
    },
    reel(on, id) {
      reel.classList.toggle('on', on);
      $('.fg-book-btn').classList.toggle('off', on);
      if (on && id) fishEl.innerHTML = fishIcon(id, 38);
    },
    reelState(zp, zh, fp, p, inside) {
      zone.style.bottom = `${zp * 100}%`;
      zone.style.height = `${zh * 100}%`;
      zone.classList.toggle('hot', inside);
      fishEl.style.top = `${(1 - fp) * 100}%`;
      prog.style.height = `calc(${Math.max(0, Math.min(1, p)) * 100}% - 4px)`;
    },
    card(html, ms = 2800) {
      card.innerHTML = html;
      card.classList.add('on');
      clearTimeout(cardTimer);
      cardTimer = setTimeout(() => card.classList.remove('on'), ms);
    },
    hideCard() {
      card.classList.remove('on');
    },
    say(text, x, y, ms = 2600) {
      bubble.textContent = text;
      bubble.style.left = `${x}px`;
      bubble.style.top = `${y}px`;
      bubble.classList.add('on');
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(() => bubble.classList.remove('on'), ms);
    },
    moveBubble(x, y) {
      bubble.style.left = `${x}px`;
      bubble.style.top = `${y}px`;
    },
    bookCount(n) {
      $('.fg-book-btn b').textContent = `${n}/${FISH.length}`;
    },
    openBook(data, footer) {
      ui.bookOpen = true;
      $('.fg-book .grid').innerHTML = FISH.map((f) => {
        const d = data[f.id];
        if (!d) return `<div class="it">${fishIcon(f.id, 40, '#cdbfb6')}<b>???</b><small>${RARITY[f.rarity]}</small></div>`;
        return `<div class="it got">${fishIcon(f.id, 40)}<b>${f.name}</b><small>${f.junk ? `Found ${d.n}` : `Best ${d.best} cm`} &middot; x${d.n}</small></div>`;
      }).join('');
      $('.fg-book .foot').innerHTML = footer || '';
      book.classList.add('on');
    },
    closeBook() {
      ui.bookOpen = false;
      book.classList.remove('on');
    },
    dispose() {
      clearTimeout(cardTimer);
      clearTimeout(bubbleTimer);
      el.remove();
    },
  };
  $('.fg-book-btn').addEventListener('click', () => {
    ctx.sound?.ui('tap');
    ui.onBook?.();
  });
  book.addEventListener('click', (e) => {
    if (e.target === book || e.target.closest('[data-x]')) {
      ctx.sound?.ui('tap');
      ui.closeBook();
    }
  });
  return ui;
}
