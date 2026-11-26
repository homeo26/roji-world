import * as K from '../riding/kit.js';

// The swim gala's screen layer: the stroke ring that shows the perfect moment, a lane progress bar,
// big thumb pads for phones, an air meter, the move strip for the synchronised swim and a splash wipe.

const ARROW = {
  up: '<path d="M12 4l7 8h-4.5v8h-5v-8H5z"/>',
  down: '<path d="M12 20l7-8h-4.5V4h-5v8H5z"/>',
  left: '<path d="M4 12l8-7v4.5h8v5h-8V19z"/>',
  right: '<path d="M20 12l-8-7v4.5H4v5h8V19z"/>',
};
export const MOVE_ICON = (m, size = 26) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor">${ARROW[m]}</svg>`;
const ARM = (flip) => `<svg viewBox="0 0 48 48" width="40" height="40" style="${flip ? 'transform:scaleX(-1)' : ''}"><path d="M30 40c-8 0-14-5-16-12l-3-11c-.6-2 2-3 3-1l4 8 1-15c0-2.6 3.6-2.6 3.6 0l.4 12 1.6-14c.3-2.4 3.7-2.2 3.6.2l-.5 14 2.8-12c.6-2.3 3.9-1.6 3.5.7l-2 13 2.6-8c.8-2.2 3.8-1.3 3.3 1L37 31c-1.5 6-3.6 9-7 9z" fill="#fff" stroke="#3b2b3f" stroke-width="2.2" stroke-linejoin="round"/></svg>`;

const CSS = `${K.BASE_CSS}
.sw-lane { position: absolute; top: calc(max(10px, env(safe-area-inset-top)) + 50px); left: 50%; transform: translateX(-50%); width: min(460px, 52vw); height: 26px; border-radius: 999px; background: rgba(255,250,244,.9); box-shadow: 0 6px 18px rgba(60,30,40,.15); display: none; }
.sw-lane.on { display: block; }
.sw-lane .tr { position: absolute; left: 14px; right: 14px; top: 11px; height: 4px; border-radius: 4px; background: linear-gradient(90deg, #8ad9ec, #3fbde0); }
.sw-lane .wall { position: absolute; top: 5px; width: 4px; height: 16px; border-radius: 3px; background: #3b4a7a; }
.sw-lane .dot { position: absolute; top: 4px; width: 18px; height: 18px; margin-left: -9px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,.2); font: 700 10px/14px var(--font, system-ui); color: #fff; text-align: center; transition: left .1s linear; }
.sw-lane .dot.me { width: 24px; height: 24px; margin-left: -12px; top: 1px; line-height: 20px; font-size: 12px; z-index: 2; }
.sw-ring { position: absolute; width: 0; height: 0; display: none; }
.sw-ring.on { display: block; }
.sw-ring .t, .sw-ring .o { position: absolute; left: -30px; top: -30px; width: 60px; height: 60px; border-radius: 50%; box-sizing: border-box; }
.sw-ring .t { border: 4px solid rgba(255,255,255,.85); box-shadow: 0 0 0 2px rgba(59,43,63,.18), inset 0 0 0 2px rgba(59,43,63,.12); }
.sw-ring .o { border: 5px solid #ffd166; box-shadow: 0 0 10px rgba(255,209,102,.6); }
.sw-ring.hot .t { border-color: #7fe3a7; box-shadow: 0 0 16px rgba(127,227,167,.9); }
.sw-ring .k { position: absolute; left: -16px; top: -16px; width: 32px; height: 32px; border-radius: 50%; background: rgba(59,43,63,.55); color: #fff; font: 700 15px/32px var(--font, system-ui); text-align: center; }
.sw-pads { position: absolute; inset: 0; display: none; pointer-events: none; }
body.touch .sw-pads.on { display: block; }
.sw-pad { position: absolute; pointer-events: auto; touch-action: none; border: 0; border-radius: 28px; background: rgba(255,250,244,.32); box-shadow: inset 0 0 0 3px rgba(255,255,255,.75), 0 6px 18px rgba(60,30,40,.18); color: #3b2b3f; font: 700 .95rem var(--font, system-ui); display: none; place-items: center; -webkit-tap-highlight-color: transparent; user-select: none; }
.sw-pad.on { display: grid; }
.sw-pad span { position: absolute; bottom: 8px; left: 0; right: 0; text-align: center; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,.45); }
.sw-pad.next { background: rgba(255,209,102,.45); box-shadow: inset 0 0 0 4px #ffd166, 0 6px 18px rgba(60,30,40,.18); }
.sw-pad.down { transform: scale(.95); filter: brightness(1.08); }
.sw-pad.bl { left: max(14px, env(safe-area-inset-left)); bottom: max(14px, env(safe-area-inset-bottom)); width: 132px; height: 132px; }
.sw-pad.br { right: max(14px, env(safe-area-inset-right)); bottom: max(14px, env(safe-area-inset-bottom)); width: 132px; height: 132px; }
.sw-pad.bc { left: 50%; transform: translateX(-50%); bottom: max(14px, env(safe-area-inset-bottom)); width: 120px; height: 64px; border-radius: 999px; background: rgba(239,91,111,.88); color: #fff; box-shadow: 0 6px 18px rgba(60,30,40,.22); }
.sw-pad.bc.down { transform: translateX(-50%) scale(.95); }
.sw-pad.bc.hot { animation: sw-hot .4s ease-in-out infinite alternate; }
@keyframes sw-hot { from { box-shadow: 0 0 0 0 rgba(255,209,102,.95); } to { box-shadow: 0 0 0 12px rgba(255,209,102,0); } }
.sw-pad.m4 { bottom: max(14px, env(safe-area-inset-bottom)); width: 78px; height: 78px; border-radius: 24px; background: rgba(255,250,244,.85); }
.sw-pad.m4 svg { color: #3b2b3f; }
.sw-pad.m4.lt { left: max(14px, env(safe-area-inset-left)); }
.sw-pad.m4.dn { left: calc(max(14px, env(safe-area-inset-left)) + 88px); }
.sw-pad.m4.up { right: calc(max(14px, env(safe-area-inset-right)) + 88px); }
.sw-pad.m4.rt { right: max(14px, env(safe-area-inset-right)); }
.sw-air { position: absolute; left: 50%; top: calc(max(10px, env(safe-area-inset-top)) + 52px); transform: translateX(-50%); display: none; gap: 5px; background: rgba(255,250,244,.9); border-radius: 999px; padding: 6px 12px; box-shadow: 0 6px 18px rgba(60,30,40,.15); align-items: center; font-weight: 700; font-size: .8rem; }
.sw-air.on { display: flex; }
.sw-air i { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #3fbde0; background: #bfefff; transition: transform .15s, opacity .15s; }
.sw-air i.gone { opacity: .2; transform: scale(.6); }
.sw-air.low { animation: sw-low .35s ease-in-out infinite alternate; }
@keyframes sw-low { to { background: #ffe0e6; } }
.sw-moves { position: absolute; left: 50%; top: calc(max(10px, env(safe-area-inset-top)) + 52px); transform: translateX(-50%); display: none; gap: 6px; background: rgba(255,250,244,.92); border-radius: 18px; padding: 6px 10px; box-shadow: 0 6px 18px rgba(60,30,40,.15); }
.sw-moves.on { display: flex; }
.sw-moves b { width: 34px; height: 34px; border-radius: 10px; background: #f3e6dc; color: #b9a6ae; display: grid; place-items: center; transition: transform .15s, background .15s; }
.sw-moves b.show { background: #ffe0a3; color: #3b2b3f; transform: scale(1.12); }
.sw-moves b.seen { background: #f6ece4; color: #3b2b3f; }
.sw-moves b.hide { color: transparent; }
.sw-moves b.now { box-shadow: 0 0 0 3px #ffd166; }
.sw-moves b.good { background: #7fe3a7; color: #fff; }
.sw-moves b.bad { background: #ff9aa8; color: #fff; }
.sw-say { position: absolute; transform: translate(-50%, -100%); background: #fffaf4; border-radius: 14px; padding: 4px 8px; box-shadow: 0 4px 12px rgba(60,30,40,.2); display: none; color: #3b2b3f; font-weight: 700; font-size: .85rem; white-space: nowrap; }
.sw-say.on { display: flex; align-items: center; gap: 4px; }
.sw-say:after { content: ''; position: absolute; left: 50%; bottom: -6px; margin-left: -6px; border: 6px solid transparent; border-bottom: 0; border-top-color: #fffaf4; }
.sw-wipe { position: absolute; inset: 0; background: radial-gradient(circle at 50% 60%, #bff0ff 0, #6fd3ea 55%, #3fb5dc 100%); opacity: 0; transition: opacity .35s; pointer-events: none; }
.sw-wipe.on { opacity: 1; }
.sw-wipe i { position: absolute; bottom: -40px; border-radius: 50%; border: 3px solid rgba(255,255,255,.85); background: rgba(255,255,255,.25); }
.sw-wipe.on i { animation: sw-rise 1s ease-in forwards; }
@keyframes sw-rise { to { transform: translateY(-120vh); } }
.sw-big { position: absolute; left: 50%; top: 30%; transform: translate(-50%, -50%); text-align: center; color: #fff; font-weight: 700; text-shadow: 0 3px 0 rgba(0,0,0,.16), 0 8px 24px rgba(0,0,0,.25); opacity: 0; transition: opacity .25s; white-space: nowrap; }
.sw-big.on { opacity: 1; }
.sw-big .e { font-size: clamp(.9rem, 2.4vw, 1.2rem); color: #ffe6a8; }
.sw-big .n { font-size: clamp(1.6rem, 5.2vw, 3rem); }
.sw-big .s { font-size: clamp(.85rem, 2.2vw, 1.1rem); font-weight: 600; }
.sw-big .st { font-size: clamp(1.6rem, 5vw, 2.8rem); color: #ffd166; letter-spacing: 4px; }
.sw-line { position: absolute; left: 50%; bottom: calc(max(16px, env(safe-area-inset-bottom)) + 44px); transform: translateX(-50%) translateY(8px); max-width: min(560px, 62vw); background: rgba(255,250,244,.95); border-radius: 18px; padding: 8px 16px; box-shadow: 0 6px 18px rgba(60,30,40,.18); font-weight: 600; font-size: .95rem; text-align: center; opacity: 0; transition: opacity .25s, transform .25s; }
.sw-line.on { opacity: 1; transform: translateX(-50%); }
body.touch .sw-line { bottom: auto; top: calc(max(10px, env(safe-area-inset-top)) + 84px); font-size: .85rem; }
@media (max-height: 430px) {
  .sw-pad.bl, .sw-pad.br { width: 116px; height: 116px; }
  .sw-lane { width: min(360px, 42vw); }
}
`;

export function makeUI(ctx) {
  const holes = Array.from({ length: 9 }, (_, i) => `<i style="left:${6 + i * 11}%;width:${18 + (i % 3) * 10}px;height:${18 + (i % 3) * 10}px;animation-delay:${(i % 4) * 0.07}s"></i>`).join('');
  const lay = K.overlay(
    CSS,
    `<div class="sw-lane"><div class="tr"></div><div class="wall" style="left:12px"></div><div class="wall" style="right:12px"></div></div>
     <div class="sw-ring"><div class="t"></div><div class="o"></div><div class="k"></div></div>
     <div class="rr-pop"></div>
     <div class="sw-big"></div>
     <div class="sw-air"><span>Air</span>${'<i></i>'.repeat(6)}</div>
     <div class="sw-moves"></div>
     <div class="sw-say"></div>
     <div class="sw-line"></div>
     <div class="sw-pads on">
       <button class="sw-pad bl" data-p="left">${ARM(false)}<span>Left</span></button>
       <button class="sw-pad br" data-p="right">${ARM(true)}<span>Right</span></button>
       <button class="sw-pad bc" data-p="go">Dive</button>
       <button class="sw-pad m4 lt" data-p="m-left">${MOVE_ICON('left', 34)}</button>
       <button class="sw-pad m4 dn" data-p="m-down">${MOVE_ICON('down', 34)}</button>
       <button class="sw-pad m4 up" data-p="m-up">${MOVE_ICON('up', 34)}</button>
       <button class="sw-pad m4 rt" data-p="m-right">${MOVE_ICON('right', 34)}</button>
     </div>
     <div class="sw-wipe">${holes}</div>`,
  );
  const $ = lay.$;
  const el = lay.el;
  const queue = [];
  const pads = {};
  for (const b of el.querySelectorAll('[data-p]')) {
    pads[b.dataset.p] = b;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try {
        b.setPointerCapture(e.pointerId);
      } catch {
        /* synthetic pointers */
      }
      b.classList.add('down');
      queue.push(b.dataset.p);
    });
    const up = () => b.classList.remove('down');
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  const pop = K.popper($('.rr-pop'));
  const ring = $('.sw-ring');
  const ringO = $('.sw-ring .o');
  const ringK = $('.sw-ring .k');
  const lane = $('.sw-lane');
  const dots = new Map();
  let bigTimer = 0;
  let lineTimer = 0;

  return {
    el,
    // pad presses since the last call: ['left', 'right', 'go', 'm-up', ...]
    drain() {
      const out = queue.slice();
      queue.length = 0;
      return out;
    },
    pads(ids, labels = {}) {
      for (const [id, b] of Object.entries(pads)) {
        b.classList.toggle('on', ids.includes(id));
        if (labels[id] && id === 'go') b.textContent = labels[id];
      }
    },
    padState(id, cls, on) {
      pads[id]?.classList.toggle(cls, !!on);
    },
    pop,
    big(html, ms = 1600) {
      const b = $('.sw-big');
      b.innerHTML = html;
      b.classList.add('on');
      clearTimeout(bigTimer);
      if (ms > 0) bigTimer = setTimeout(() => b.classList.remove('on'), ms);
    },
    line(html, ms = 2800) {
      const l = $('.sw-line');
      l.innerHTML = html;
      l.classList.add('on');
      clearTimeout(lineTimer);
      lineTimer = setTimeout(() => l.classList.remove('on'), ms);
    },
    bigOff() {
      $('.sw-big').classList.remove('on');
    },
    // the stroke ring: x, y screen px; k: outer ring scale (1 = on the target); key: 'L' | 'R'
    ring(on, x = 0, y = 0, k = 1, key = '', hot = false) {
      ring.classList.toggle('on', on);
      if (!on) return;
      ring.style.left = `${x}px`;
      ring.style.top = `${y}px`;
      ringO.style.transform = `scale(${k.toFixed(3)})`;
      ringO.style.opacity = k < 0.62 ? '0' : '1';
      ring.classList.toggle('hot', hot);
      if (ringK.textContent !== key) ringK.textContent = key;
    },
    // swimmers: [{ id, label, color, me, p (0..1 along the race) }]
    lane(on, swimmers = []) {
      lane.classList.toggle('on', on);
      if (!on) return;
      for (const s of swimmers) {
        let d = dots.get(s.id);
        if (!d) {
          d = document.createElement('div');
          d.className = 'dot' + (s.me ? ' me' : '');
          d.style.background = s.color;
          d.textContent = s.label;
          lane.appendChild(d);
          dots.set(s.id, d);
        }
        d.style.display = s.hide ? 'none' : '';
        d.style.left = `calc(14px + (100% - 28px) * ${Math.max(0, Math.min(1, s.p)).toFixed(4)})`;
      }
      for (const [id, d] of dots) if (!swimmers.some((s) => s.id === id)) d.style.display = 'none';
    },
    air(on, k = 1) {
      const a = $('.sw-air');
      a.classList.toggle('on', on);
      if (!on) return;
      const n = Math.ceil(k * 6 - 0.01);
      a.querySelectorAll('i').forEach((b, i) => b.classList.toggle('gone', i >= n));
      a.classList.toggle('low', k < 0.34);
    },
    moves(on, list = [], states = []) {
      const m = $('.sw-moves');
      m.classList.toggle('on', on);
      if (!on) return;
      if (m.children.length !== list.length || m.dataset.key !== list.join()) {
        m.innerHTML = list.map((mv) => `<b>${MOVE_ICON(mv)}</b>`).join('');
        m.dataset.key = list.join();
      }
      [...m.children].forEach((b, i) => (b.className = states[i] || ''));
    },
    say(on, x = 0, y = 0, html = '') {
      const s = $('.sw-say');
      s.classList.toggle('on', on);
      if (!on) return;
      s.style.left = `${x}px`;
      s.style.top = `${y}px`;
      if (s.dataset.h !== html) {
        s.innerHTML = html;
        s.dataset.h = html;
      }
    },
    wipe(on) {
      $('.sw-wipe').classList.toggle('on', on);
    },
    remove() {
      clearTimeout(bigTimer);
      clearTimeout(lineTimer);
      lay.remove();
    },
  };
}
