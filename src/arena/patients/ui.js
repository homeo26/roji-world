import * as THREE from 'three';

// The screens over Dr. Roji's Shift: speech bubbles and triage cards that follow the people, the buttons
// for each hands-on step (hold, choose, a dose slider, the drug buttons), floating words, the case card,
// the findings clipboard, banners and the soft fade between rooms.

const STAR = 'M12 2.6l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z';
export const starSvg = (on, size = 30) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="${STAR}" fill="${on ? '#ffd166' : '#eadfd6'}" stroke="${on ? '#e0a800' : '#cdbfb4'}" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
export const starsHtml = (n, size = 34) => `<span class="drs-stars">${[0, 1, 2].map((i) => starSvg(i < n, size)).join('')}</span>`;

// Line icons on a 24 grid (stroke paths).
export const ICON = {
  hot: 'M12 3v10M9 5a3 3 0 0 1 6 0v8a4 4 0 1 1-6 0zM12 17v.5',
  throat: 'M5 9c0-3 3-5 7-5s7 2 7 5-3 9-7 9-7-6-7-9zM9 10c1 2 5 2 6 0M12 12v3',
  cough: 'M6 15a4 4 0 0 1 1-8 5 5 0 0 1 9 1 3.5 3.5 0 0 1 1 7zM9 19h.1M13 20h.1M16 18h.1',
  tired: 'M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z',
  bone: 'M7 7l10 10M6 4a2 2 0 0 1 2 3 2 2 0 1 1-3-1 2 2 0 0 1 1-2zM18 20a2 2 0 0 1-2-3 2 2 0 1 1 3 1 2 2 0 0 1-1 2z',
  fall: 'M12 4v12M7 11l5 5 5-5M5 20h14',
  scrape: 'M4 14l6-6 6 6-6 6zM14 4l6 6M9 13h.1M11 15h.1',
  bike: 'M6 17a3 3 0 1 0 0-.1zM18 17a3 3 0 1 0 0-.1zM6 17l4-7h5l3 7M10 10l-1-3h-2',
  skate: 'M5 15h14M7 15v-6l4-2 4 2v6M8 19h.1M16 19h.1',
  cut: 'M5 19L19 5M8 13l2 2M11 10l2 2M14 7l2 2',
  fence: 'M5 20V8l2-3 2 3v12M15 20V8l2-3 2 3v12M3 11h18M3 16h18',
  bump: 'M5 17a7 7 0 0 1 14 0zM10 9a2 2 0 0 1 4 0',
  ear: 'M8 17a5 5 0 1 1 9-5c0 3-3 3-3 6a2 2 0 0 1-4 0M11 11a2 2 0 0 1 3 1',
  tummy: 'M8 4v4a5 5 0 0 0 0 9c2 2 6 2 8 0a5 5 0 0 0 0-9V4M11 12h.1',
  cake: 'M5 20h14v-7H5zM5 15c2 1 3-1 4 0s3 1 4 0 3-1 4 0 2 0 2 0M12 13V9M12 7v-.1',
  shot: 'M14 4l6 6M17 7L8 16l-3 3M10 10l4 4M12 8l4 4',
  scared: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM9 10h.1M15 10h.1M9 16c2-1.5 4-1.5 6 0',
  check: 'M8 4h8v3H8zM6 6H5v15h14V6h-1M9 14l2 2 4-4',
  toy: 'M6 14a6 4 0 0 0 12 0zM14 10a3 3 0 1 1 3 3M19 9h2',
  squeak: 'M9 18V6l10-2v12M9 18a2 2 0 1 1-2-2 2 2 0 0 1 2 2zM19 16a2 2 0 1 1-2-2 2 2 0 0 1 2 2z',
  splinter: 'M4 20L17 7M15 5l4 4M14 10l3 1',
  tree: 'M12 21v-6M7 15h10l-5-11z',
  stone: 'M6 15l3-6 6-1 4 5-2 6H8z',
  // Tools and treatments
  stethoscope: 'M6 3v6a4 4 0 0 0 8 0V3M10 13v3a4 4 0 0 0 8 0v-2M18 14a2 2 0 1 0 0-.1',
  light: 'M9 3h6v10H9zM10 13l-1 8h6l-1-8M12 6v.1',
  hammer: 'M5 19L15 9M13 5l6 6-3 1-4-4z',
  xray: 'M4 4h16v16H4zM12 7v10M9 9h6M9 12h6M9 15h6',
  cast: 'M4 9h16v6H4zM8 9v6M12 9v6M16 9v6',
  needle: 'M5 19c6-1 10-6 12-12M17 7a2 2 0 1 0 2-2M14 17c2 0 3 1 5 3',
  syringe: 'M14 4l6 6M17 7L8 16l-3 3M10 10l4 4M12 8l4 4',
  scalpel: 'M4 20l9-9M13 11l6-6c1 1 1 3-1 5l-3 3',
  tweezers: 'M5 20L14 5M9 20L18 5M14 5l4 0',
  thermometer: 'M12 3v10M9 5a3 3 0 0 1 6 0v8a4 4 0 1 1-6 0z',
  bandage: 'M4 14l10-10 6 6-10 10zM10 10h.1M13 13h.1M11 12h.1',
  stitches: 'M4 12h16M7 9l2 6M11 9l2 6M15 9l2 6',
  dose: 'M9 3h6v3H9zM8 6h8v14H8zM8 12h8',
  vaccine: 'M14 4l6 6M17 7L8 16l-3 3M10 10l4 4M12 8l4 4',
  surgery: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 8v8M8 12h8',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
};
export const icon = (name, size = 22, color = 'currentColor') => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[name] || ICON.heart}"/></svg>`;

const TAG = { 3: ['#ef5b6f', 'Now'], 2: ['#ffa93a', 'Soon'], 1: ['#6cc24a', 'Can wait'] };

const CSS = `
body.drs-on #arena .a-title { max-width: min(46vw, 440px); }
body.drs-on #arena .a-title b { font-size: 1.15rem; }
body.drs-on #arena .a-title span { display: block; white-space: normal; line-height: 1.2; font-size: .9rem; color: #5a4652; }
@media (max-height: 520px) { body.drs-on #arena .a-title b { font-size: 1rem; } body.drs-on #arena .a-title span { font-size: .78rem; } }
.drs { position: fixed; inset: 0; z-index: 41; pointer-events: none; font-family: var(--font, 'Fredoka', system-ui, sans-serif); color: #3b2b3f; }
.drs * { box-sizing: border-box; }
.drs-hold, .drs-btn, .drs-card, .drs-slider, .drs-tri, .drs-dock button { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
.drs-bub { position: absolute; left: 0; top: 0; transform: translate(-50%, -100%); background: #fffdf8; border-radius: 18px; padding: 8px 14px 9px; box-shadow: 0 0 0 3px var(--c, #3fbf9f), 0 8px 20px rgba(60,30,40,.18); max-width: 260px; font-size: .95rem; line-height: 1.25; opacity: 0; transition: opacity .2s; will-change: transform; }
.drs-bub.on { opacity: 1; }
.drs-bub b { display: block; color: var(--c, #3fbf9f); font-size: .9rem; }
.drs-bub::after { content: ''; position: absolute; left: 50%; bottom: -11px; margin-left: -9px; border: 9px solid transparent; border-top-color: var(--c, #3fbf9f); border-bottom: 0; }
.drs-tri { position: absolute; left: 0; top: 0; transform: translate(-50%, -100%); background: #fffdf8; border-radius: 16px; padding: 7px 11px 9px; box-shadow: 0 0 0 3px var(--c, #d9c8be), 0 8px 18px rgba(60,30,40,.16); width: 184px; pointer-events: auto; cursor: pointer; transition: transform .2s, box-shadow .2s, opacity .3s; touch-action: manipulation; }
.drs-tri:hover { box-shadow: 0 0 0 3px #3fbf9f, 0 10px 22px rgba(60,30,40,.22); }
.drs-tri b { display: block; font-size: 1.02rem; line-height: 1.1; margin-bottom: 3px; }
.drs-tri .ch { display: flex; align-items: center; gap: 5px; font-size: .86rem; line-height: 1.1; margin-top: 3px; color: #5a4652; }
.drs-tri .ch svg { flex: none; color: #ef5b6f; }
.drs-tri .tag { position: absolute; right: -6px; top: -12px; color: #fff; font-weight: 700; font-size: .72rem; border-radius: 99px; padding: 2px 9px; background: var(--c); box-shadow: 0 3px 8px rgba(60,30,40,.2); opacity: 0; transform: scale(.4); transition: opacity .2s, transform .3s cubic-bezier(.2,1.6,.4,1); }
.drs-tri.tagged .tag { opacity: 1; transform: scale(1); }
.drs-tri.picked { box-shadow: 0 0 0 4px var(--c), 0 0 0 9px rgba(255,255,255,.8), 0 12px 26px rgba(60,30,40,.25); }
.drs-tri::after { content: ''; position: absolute; left: 50%; bottom: -10px; margin-left: -8px; border: 8px solid transparent; border-top-color: #fffdf8; border-bottom: 0; }
.drs-tri.gone { opacity: 0; pointer-events: none; }
.drs-tri .pair { display: inline-block; font-size: .66rem; background: #c7a6ff; color: #fff; border-radius: 99px; padding: 0 6px; margin-left: 4px; vertical-align: 2px; }
.drs-dock { position: absolute; left: 0; right: 0; bottom: max(14px, env(safe-area-inset-bottom)); display: flex; justify-content: center; align-items: flex-end; gap: 12px; padding: 0 max(14px, env(safe-area-inset-right)) 0 max(14px, env(safe-area-inset-left)); }
.drs-dock.right { justify-content: flex-end; }
.drs-hold { pointer-events: auto; touch-action: none; border: 0; border-radius: 50%; width: 104px; height: 104px; background: #ef5b6f; color: #fff; font: 700 1rem var(--font, system-ui); box-shadow: 0 6px 0 #c43a52, 0 12px 24px rgba(60,30,40,.25); display: grid; place-items: center; text-align: center; line-height: 1.05; padding: 8px; position: relative; cursor: pointer; transition: transform .08s; }
.drs-hold.on { transform: translateY(4px) scale(.96); box-shadow: 0 2px 0 #c43a52, 0 8px 18px rgba(60,30,40,.25); }
.drs-hold.mint { background: #3fbf9f; box-shadow: 0 6px 0 #2a9479, 0 12px 24px rgba(60,30,40,.25); }
.drs-hold.mint.on { box-shadow: 0 2px 0 #2a9479, 0 8px 18px rgba(60,30,40,.25); }
.drs-hold svg.ring { position: absolute; inset: -8px; width: calc(100% + 16px); height: calc(100% + 16px); transform: rotate(-90deg); pointer-events: none; }
.drs-btn { pointer-events: auto; touch-action: none; border: 0; border-radius: 22px; min-width: 96px; min-height: 64px; padding: 8px 16px; background: #fffaf4; color: #3b2b3f; font: 700 1rem var(--font, system-ui); box-shadow: 0 0 0 3px var(--c, #3fbf9f), 0 6px 0 rgba(0,0,0,.08), 0 10px 20px rgba(60,30,40,.18); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; cursor: pointer; transition: transform .1s; }
.drs-btn small { font-size: .7rem; font-weight: 500; color: #7a6470; }
.drs-btn.on, .drs-btn:active { transform: scale(.95); }
.drs-btn.big { min-width: 120px; min-height: 76px; font-size: 1.05rem; }
.drs-btn.go { background: #ef5b6f; color: #fff; box-shadow: 0 5px 0 #c43a52, 0 10px 20px rgba(60,30,40,.22); }
.drs-btn.go small { color: #ffe3e8; }
.drs-btn .k { position: absolute; margin: -44px 0 0 -70px; font-size: .62rem; color: #a08f98; }
body.touch .drs-btn .k { display: none; }
.drs-cards { display: flex; gap: 10px; pointer-events: none; }
.drs-card { pointer-events: auto; touch-action: manipulation; border: 0; border-radius: 20px; width: 128px; min-height: 92px; padding: 8px 8px 9px; background: #fffaf4; font: 600 .92rem var(--font, system-ui); color: #3b2b3f; box-shadow: 0 0 0 3px #d9c8be, 0 10px 20px rgba(60,30,40,.18); display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; position: relative; animation: drs-in .35s cubic-bezier(.2,1.4,.4,1) both; }
.drs-card:nth-child(2) { animation-delay: .06s; } .drs-card:nth-child(3) { animation-delay: .12s; } .drs-card:nth-child(4) { animation-delay: .18s; }
.drs-card svg { color: #3fbf9f; }
.drs-card small { font-size: .68rem; font-weight: 500; color: #7a6470; line-height: 1.1; }
.drs-card:hover { box-shadow: 0 0 0 3px #3fbf9f, 0 12px 24px rgba(60,30,40,.22); }
.drs-card.no { animation: drs-shake .4s; box-shadow: 0 0 0 3px #ef5b6f, 0 10px 20px rgba(60,30,40,.18); }
.drs-card.yes { box-shadow: 0 0 0 4px #3fbf9f, 0 12px 24px rgba(60,30,40,.25); transform: translateY(-6px); }
.drs-card.hint { box-shadow: 0 0 0 3px #ffd166, 0 10px 20px rgba(60,30,40,.18); }
.drs-card .k { position: absolute; left: 8px; top: 5px; font-size: .66rem; color: #a08f98; }
body.touch .drs-card .k { display: none; }
.drs-slider { pointer-events: auto; touch-action: none; position: relative; width: min(420px, 52vw); height: 64px; background: #fffaf4; border-radius: 99px; box-shadow: 0 0 0 3px #d9c8be, 0 8px 18px rgba(60,30,40,.15); cursor: pointer; }
.drs-slider .tr { position: absolute; left: 34px; right: 34px; top: 29px; height: 8px; border-radius: 8px; background: #eadfd6; }
.drs-slider .fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 8px; background: var(--c, #ff8fb1); }
.drs-slider .ticks { position: absolute; left: 34px; right: 34px; top: 40px; display: flex; justify-content: space-between; font-size: .62rem; color: #9a8790; }
.drs-slider .th { position: absolute; top: 10px; width: 44px; height: 44px; margin-left: -22px; border-radius: 50%; background: var(--c, #ff8fb1); box-shadow: 0 0 0 4px #fff, 0 4px 10px rgba(60,30,40,.25); display: grid; place-items: center; color: #fff; font-weight: 700; font-size: .8rem; }
.drs-meter { position: absolute; left: 50%; bottom: calc(max(14px, env(safe-area-inset-bottom)) + 4px); transform: translateX(-50%); width: min(300px, 42vw); background: #fffaf4; border-radius: 99px; padding: 5px 12px 6px; box-shadow: 0 0 0 3px #d9c8be, 0 6px 16px rgba(60,30,40,.14); font-size: .78rem; font-weight: 600; text-align: center; opacity: 0; transition: opacity .2s; }
.drs-meter.on { opacity: 1; }
.drs-meter.up { bottom: calc(max(14px, env(safe-area-inset-bottom)) + 120px); }
.drs-meter .bar { height: 10px; border-radius: 10px; background: #eadfd6; overflow: hidden; margin-top: 3px; }
.drs-meter .bar i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #7fd8bf, #3fbf9f); border-radius: 10px; transition: width .1s; }
.drs-word { position: absolute; left: 0; top: 0; transform: translate(-50%, -50%); font-weight: 700; font-size: 1.5rem; color: #fff; white-space: nowrap; text-shadow: 0 2px 0 var(--c, #2a9479), 0 0 3px var(--c, #2a9479), 0 6px 16px rgba(40,20,30,.3); animation: drs-word 1.2s ease-out forwards; }
.drs-word.small { font-size: 1.05rem; }
.drs-banner { position: absolute; left: 50%; top: calc(max(10px, env(safe-area-inset-top)) + 58px); transform: translate(-50%, -12px); background: #3fbf9f; color: #fff; font-weight: 700; font-size: 1.05rem; border-radius: 99px; padding: 6px 18px 7px; box-shadow: 0 6px 18px rgba(30,80,60,.3); opacity: 0; transition: opacity .25s, transform .3s cubic-bezier(.2,1.4,.4,1); white-space: nowrap; display: flex; align-items: center; gap: 8px; }
.drs-banner.on { opacity: 1; transform: translate(-50%, 0); }
.drs-banner.red { background: #ef5b6f; animation: drs-flash .6s infinite alternate; }
.drs-banner.love { background: #ff8fb1; }
.drs-banner.gold { background: #f4b63f; color: #4a2b1a; }
.drs-fade { position: absolute; inset: 0; background: #fff5ea; opacity: 0; transition: opacity .3s; display: grid; place-items: center; pointer-events: none; }
.drs-fade.on { opacity: 1; pointer-events: auto; }
.drs-fade b { font-size: 1.8rem; color: #3fbf9f; display: flex; gap: 10px; align-items: center; }
.drs-case { position: absolute; right: max(18px, env(safe-area-inset-right)); top: 54%; transform: translateY(-50%) scale(.85); background: #fffaf4; border-radius: 26px; padding: 14px 22px 16px; width: min(330px, 36vw); text-align: center; box-shadow: 0 0 0 3px #3fbf9f, 0 20px 50px rgba(40,20,30,.3); opacity: 0; transition: opacity .25s, transform .35s cubic-bezier(.2,1.4,.4,1); pointer-events: none; }
.drs-case.on { opacity: 1; transform: translateY(-50%) scale(1); pointer-events: auto; }
.drs-case.on button { pointer-events: auto; }
.drs-case h3 { margin: 0 0 2px; font-size: 1.25rem; }
.drs-case p { margin: 4px 0 10px; font-size: .86rem; color: #6a5662; line-height: 1.3; }
.drs-case .drs-stars svg { animation: drs-star .5s cubic-bezier(.2,1.6,.4,1) both; }
.drs-case .drs-stars svg:nth-child(2) { animation-delay: .15s; } .drs-case .drs-stars svg:nth-child(3) { animation-delay: .3s; }
.drs-case button { pointer-events: none; border: 0; border-radius: 99px; min-height: 46px; padding: .55em 1.4em; font: 700 1rem var(--font, system-ui); background: #ef5b6f; color: #fff; cursor: pointer; box-shadow: 0 4px 0 #c43a52; }
.drs-notes { position: absolute; left: max(12px, env(safe-area-inset-left)); top: calc(max(10px, env(safe-area-inset-top)) + 70px); width: 190px; background: #fffdf8; border-radius: 16px; padding: 22px 12px 10px; box-shadow: 0 0 0 3px #d9c8be, 0 8px 18px rgba(60,30,40,.15); font-size: .8rem; opacity: 0; transform: translateX(-20px); transition: opacity .25s, transform .3s; }
.drs-notes.on { opacity: 1; transform: none; }
.drs-notes::before { content: ''; position: absolute; left: 50%; top: -7px; width: 60px; height: 16px; margin-left: -30px; border-radius: 6px; background: #c8ccd6; }
.drs-notes h4 { margin: 0 0 4px; font-size: .86rem; color: #3fbf9f; }
.drs-notes div { display: flex; gap: 6px; align-items: flex-start; margin: 3px 0; line-height: 1.2; }
.drs-notes div svg { flex: none; color: #3fbf9f; margin-top: 1px; }
.drs-stars { display: inline-flex; gap: 4px; }
@keyframes drs-word { 0% { opacity: 0; margin-top: 10px; } 15% { opacity: 1; margin-top: 0; } 75% { opacity: 1; } 100% { opacity: 0; margin-top: -36px; } }
@keyframes drs-in { from { opacity: 0; transform: translateY(24px) scale(.8); } to { opacity: 1; transform: none; } }
@keyframes drs-shake { 0%,100% { transform: none; } 25% { transform: translateX(-7px); } 75% { transform: translateX(7px); } }
@keyframes drs-star { from { transform: scale(.2) rotate(-30deg); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes drs-flash { from { filter: brightness(1); } to { filter: brightness(1.18); } }
@media (max-height: 520px) {
  .drs-bub { font-size: .8rem; max-width: 210px; padding: 5px 10px 6px; border-radius: 14px; }
  .drs-bub b { font-size: .76rem; }
  .drs-tri { width: 134px; padding: 5px 8px 6px; }
  .drs-tri b { font-size: .8rem; }
  .drs-tri .ch { font-size: .68rem; margin-top: 2px; }
  .drs-tri .ch svg { width: 15px; height: 15px; }
  .drs-dock { bottom: max(8px, env(safe-area-inset-bottom)); gap: 8px; }
  .drs-hold { width: 88px; height: 88px; font-size: .9rem; }
  .drs-btn { min-width: 84px; min-height: 56px; font-size: .92rem; border-radius: 18px; }
  .drs-btn.big { min-width: 100px; min-height: 64px; }
  .drs-card { width: 104px; min-height: 76px; font-size: .8rem; padding: 5px 6px 6px; }
  .drs-card svg { width: 20px; height: 20px; }
  .drs-slider { height: 56px; }
  .drs-slider .tr { top: 25px; }
  .drs-slider .ticks { top: 35px; }
  .drs-slider .th { top: 6px; }
  .drs-meter { width: min(240px, 36vw); font-size: .7rem; bottom: max(8px, env(safe-area-inset-bottom)); }
  .drs-meter.up { bottom: calc(max(8px, env(safe-area-inset-bottom)) + 100px); }
  .drs-banner { top: calc(max(10px, env(safe-area-inset-top)) + 50px); font-size: .9rem; padding: 4px 14px 5px; }
  .drs-word { font-size: 1.2rem; }
  .drs-case { padding: 10px 16px 12px; width: min(290px, 38vw); top: 56%; }
  .drs-case h3 { font-size: 1.05rem; }
  .drs-case p { font-size: .76rem; margin: 2px 0 8px; }
  .drs-notes { width: 168px; font-size: .72rem; top: calc(max(10px, env(safe-area-inset-top)) + 62px); padding: 18px 10px 8px; }
}
`;

export function createUI({ camera, sound }) {
  if (!document.getElementById('drs-style')) {
    const s = document.createElement('style');
    s.id = 'drs-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  document.body.classList.add('drs-on');
  const root = document.createElement('div');
  root.className = 'drs';
  document.body.appendChild(root);
  const el = (tag, cls, html = '') => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    e.innerHTML = html;
    return e;
  };
  const anchored = new Set(); // { el, pos (Vector3), dy (px), on }
  const v = new THREE.Vector3();
  const timers = [];
  const later = (ms, fn) => {
    const t = setTimeout(fn, ms);
    timers.push(t);
    return t;
  };

  // Where a world point is on screen, in CSS px (null when behind the camera)
  const screen = (p, out = { x: 0, y: 0 }) => {
    v.copy(p).project(camera);
    if (v.z > 1) return null;
    out.x = (v.x * 0.5 + 0.5) * window.innerWidth;
    out.y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    return out;
  };

  const ui = {
    root,
    screen,
    // A speech bubble that follows pos (a Vector3 you keep updating). color: the name colour.
    bubble() {
      const e = el('div', 'drs-bub');
      root.appendChild(e);
      const a = { el: e, pos: new THREE.Vector3(), on: false, dy: 0 };
      anchored.add(a);
      return {
        a,
        say(name, text, color = '#3fbf9f') {
          e.innerHTML = `${name ? `<b>${name}</b>` : ''}${text}`;
          e.style.setProperty('--c', color);
          a.on = true;
          e.classList.add('on');
        },
        hide() {
          a.on = false;
          e.classList.remove('on');
        },
        at(p) {
          a.pos.copy(p);
        },
        remove() {
          anchored.delete(a);
          e.remove();
        },
      };
    },
    // A triage card over a waiting patient. info: { name, chips: [[icon, text]], urg, pair }
    triCard(info, onTap) {
      const [col, word] = TAG[info.urg];
      const e = el('div', 'drs-tri', `<span class="tag">${word}</span><b>${info.name}${info.pair ? '<span class="pair">Together</span>' : ''}</b>${info.chips.map(([ic, t]) => `<div class="ch">${icon(ic, 17)}<span>${t}</span></div>`).join('')}`);
      e.style.setProperty('--c', '#d9c8be');
      root.appendChild(e);
      const a = { el: e, pos: new THREE.Vector3(), on: true, dy: 0 };
      anchored.add(a);
      e.addEventListener('pointerdown', (ev) => {
        ev.stopPropagation();
        onTap?.();
      });
      return {
        a,
        el: e,
        tag() {
          e.style.setProperty('--c', col);
          e.querySelector('.tag').style.setProperty('--c', col);
          e.classList.add('tagged');
        },
        pick() {
          e.classList.add('picked');
        },
        gone() {
          e.classList.add('gone');
        },
        at(p) {
          a.pos.copy(p);
        },
        remove() {
          anchored.delete(a);
          e.remove();
        },
      };
    },
    // The bottom dock for a step's controls. Returns the element; clear() empties it.
    dock: (() => {
      const d = el('div', 'drs-dock');
      root.appendChild(d);
      return d;
    })(),
    clearDock() {
      ui.dock.innerHTML = '';
      ui.dock.className = 'drs-dock';
    },
    // A big round button you hold. Returns { held, pressed (one frame, read it with take()), progress(k), el }.
    hold(label, { color = '', right = true } = {}) {
      const b = el('button', `drs-hold ${color}`, `<span>${label}</span><svg class="ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="none" stroke="rgba(255,255,255,.0)" stroke-width="7"/><circle class="p" cx="60" cy="60" r="56" fill="none" stroke="#ffd166" stroke-width="7" stroke-linecap="round" stroke-dasharray="352" stroke-dashoffset="352"/></svg>`);
      b.setAttribute('data-hold', '');
      const st = { held: false, down: false, up: false, el: b };
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        b.setPointerCapture?.(e.pointerId);
        st.held = true;
        st.down = true;
        b.classList.add('on');
      });
      const up = () => {
        if (st.held) st.up = true;
        st.held = false;
        b.classList.remove('on');
      };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      st.take = () => {
        const r = { down: st.down, up: st.up };
        st.down = st.up = false;
        return r;
      };
      st.progress = (k) => (b.querySelector('.p').style.strokeDashoffset = String(352 * (1 - Math.max(0, Math.min(1, k)))));
      st.label = (t) => (b.querySelector('span').innerHTML = t);
      if (right) ui.dock.classList.add('right');
      ui.dock.appendChild(b);
      return st;
    },
    // Buttons you tap (or hold). list: [{ id, label, sub, color, key }]. Returns { pressed(id) one-shot, held(id), el(id) }.
    buttons(list, { big = false } = {}) {
      const st = { pressed: new Set(), held: new Set(), els: {} };
      for (const it of list) {
        const b = el('button', `drs-btn ${big ? 'big' : ''} ${it.go ? 'go' : ''}`, `${it.key ? `<span class="k">${it.key}</span>` : ''}${it.icon ? icon(it.icon, 22) : ''}<span>${it.label}</span>${it.sub ? `<small>${it.sub}</small>` : ''}`);
        b.style.setProperty('--c', it.color || '#3fbf9f');
        b.setAttribute('data-hold', '');
        b.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          b.setPointerCapture?.(e.pointerId);
          st.pressed.add(it.id);
          st.held.add(it.id);
          b.classList.add('on');
          sound?.ui('tap');
        });
        const up = () => {
          st.held.delete(it.id);
          b.classList.remove('on');
        };
        b.addEventListener('pointerup', up);
        b.addEventListener('pointercancel', up);
        b.addEventListener('contextmenu', (e) => e.preventDefault());
        st.els[it.id] = b;
        ui.dock.appendChild(b);
      }
      st.take = (id) => {
        const r = st.pressed.has(id);
        st.pressed.delete(id);
        return r;
      };
      return st;
    },
    // Cards to choose from: [{ id, label, sub, icon }]. onPick(id, cardEl) is called on a tap.
    cards(list, onPick) {
      const row = el('div', 'drs-cards');
      list.forEach((it, i) => {
        const b = el('button', 'drs-card', `<span class="k">${i + 1}</span>${icon(it.icon, 26)}<span>${it.label}</span>${it.sub ? `<small>${it.sub}</small>` : ''}`);
        b.addEventListener('click', () => onPick(it.id, b, i));
        b.dataset.id = it.id;
        row.appendChild(b);
      });
      ui.dock.appendChild(row);
      return row;
    },
    // A dose slider: { min, max, step, value, unit, color }. Returns { value, el, set(v) }.
    slider({ min = 0, max = 10, step = 0.5, value = 0, unit = 'ml', color = '#ff8fb1', ticks = [0, 2.5, 5, 7.5, 10] } = {}) {
      const s = el('div', 'drs-slider', `<div class="tr"><div class="fill"></div></div><div class="ticks">${ticks.map((t) => `<span>${t}</span>`).join('')}</div><div class="th"></div>`);
      s.style.setProperty('--c', color);
      s.setAttribute('data-hold', '');
      const st = { value, el: s, moved: false };
      const fill = s.querySelector('.fill');
      const th = s.querySelector('.th');
      const show = () => {
        const k = (st.value - min) / (max - min);
        fill.style.width = `${k * 100}%`;
        th.style.left = `calc(34px + (100% - 68px) * ${k})`;
        th.textContent = `${st.value}`;
      };
      st.set = (val) => {
        const q = Math.round(Math.max(min, Math.min(max, val)) / step) * step;
        if (q !== st.value) sound?.ui('tick');
        st.value = q;
        show();
      };
      const at = (e) => {
        const r = s.getBoundingClientRect();
        const k = (e.clientX - r.left - 34) / (r.width - 68);
        st.set(min + k * (max - min));
        st.moved = true;
      };
      let drag = false;
      s.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        s.setPointerCapture?.(e.pointerId);
        drag = true;
        at(e);
      });
      s.addEventListener('pointermove', (e) => drag && at(e));
      const up = () => (drag = false);
      s.addEventListener('pointerup', up);
      s.addEventListener('pointercancel', up);
      show();
      ui.dock.appendChild(s);
      return st;
    },
    meter(label, { up = false } = {}) {
      const m = el('div', `drs-meter ${up ? 'up' : ''}`, `<span>${label}</span><div class="bar"><i></i></div>`);
      root.appendChild(m);
      requestAnimationFrame(() => m.classList.add('on'));
      return {
        set(k) {
          m.querySelector('i').style.width = `${Math.max(0, Math.min(1, k)) * 100}%`;
        },
        label(t) {
          m.querySelector('span').innerHTML = t;
        },
        remove() {
          m.remove();
        },
      };
    },
    // A floating word at a world point (or screen {x, y}).
    word(text, at, color = '#2a9479', small = false) {
      const p = at?.isVector3 ? screen(at) : at || { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };
      if (!p) return;
      const w = el('div', `drs-word ${small ? 'small' : ''}`, text);
      w.style.setProperty('--c', color);
      w.style.left = `${Math.max(70, Math.min(window.innerWidth - 70, p.x))}px`;
      w.style.top = `${Math.max(80, Math.min(window.innerHeight - 40, p.y))}px`;
      root.appendChild(w);
      later(1300, () => w.remove());
    },
    banner: (() => {
      const b = el('div', 'drs-banner');
      root.appendChild(b);
      let t = null;
      return (html, kind = '', ms = 2600) => {
        b.innerHTML = html;
        b.className = `drs-banner on ${kind}`;
        clearTimeout(t);
        if (ms > 0) t = later(ms, () => b.classList.remove('on'));
        if (!html) b.classList.remove('on');
      };
    })(),
    fadeEl: (() => {
      const f = el('div', 'drs-fade', '<b></b>');
      root.appendChild(f);
      return f;
    })(),
    fade(on, html = '') {
      if (html) ui.fadeEl.querySelector('b').innerHTML = html;
      ui.fadeEl.classList.toggle('on', on);
    },
    caseEl: (() => {
      const c = el('div', 'drs-case');
      root.appendChild(c);
      return c;
    })(),
    // The card after a case: { title, stars, text, button } -> Promise that resolves on the button (or after ms)
    caseCard({ title, stars, text, button = 'Next patient', ms = 5200 }) {
      const c = ui.caseEl;
      c.innerHTML = `<h3>${title}</h3>${starsHtml(stars, 36)}<p>${text}</p><button>${button}</button>`;
      c.classList.add('on');
      return new Promise((resolve) => {
        let done = false;
        const go = () => {
          if (done) return;
          done = true;
          c.classList.remove('on');
          resolve();
        };
        c.querySelector('button').addEventListener('click', () => {
          sound?.ui('tap');
          go();
        });
        ui.closeCase = go;
        if (ms > 0) later(ms, go);
      });
    },
    notesEl: (() => {
      const n = el('div', 'drs-notes');
      root.appendChild(n);
      return n;
    })(),
    notes(title, lines) {
      if (!lines) {
        ui.notesEl.classList.remove('on');
        return;
      }
      ui.notesEl.innerHTML = `<h4>${title}</h4>${lines.map((l) => `<div>${icon('check', 15)}<span>${l}</span></div>`).join('')}`;
      ui.notesEl.classList.add('on');
    },
    update() {
      const p = { x: 0, y: 0 };
      for (const a of anchored) {
        if (!screen(a.pos, p)) {
          a.el.style.visibility = 'hidden';
          continue;
        }
        a.el.style.visibility = '';
        const w = a.el.offsetWidth;
        const h = a.el.offsetHeight;
        let x = Math.max(w / 2 + 8, Math.min(window.innerWidth - w / 2 - 8, p.x));
        let y = Math.max(h + 58, p.y);
        // A head far above the view (a close-up): the bubble waits in a corner instead
        if (a.side && p.y < h + 40) {
          const short = window.innerHeight < 520;
          x = a.side === 'right' ? window.innerWidth - w / 2 - 14 : w / 2 + 14;
          y = h + (a.side === 'right' ? 66 : short ? 76 : 86) + 10;
        }
        a.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      }
    },
    dispose() {
      for (const t of timers) clearTimeout(t);
      root.remove();
      document.body.classList.remove('drs-on');
    },
  };
  return ui;
}
