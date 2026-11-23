// Full-screen overlay that hosts one minigame at a time.
//
// Minigame contract (default export of each module in registry.js):
//   export default {
//     id: 'tictactoe',
//     start(stage, api) { ...; return () => { /* stop timers, rAF, listeners */ } },
//   };
//
// stage: an empty <div> that fills the overlay under the top bar. Its size can be
//        anything from a phone in landscape (about 800 x 330) to a desktop (1440 x 840).
//        Watch it with a ResizeObserver. Never scroll.
// api:
//   me, partner      { id, name, gender, skin, hair, hairstyle, top, ... } from looks.js
//   avatar(look, px) SVG string of a character's face
//   sfx(name)        'tap' | 'good' | 'bad' | 'win' | 'lose' | 'coin' | 'pop' | 'swoosh' | 'tick'
//   setScore(text)   short text shown at the right of the top bar
//   finish({ win, title, text })  show the result screen (win: true, false or null for a draw)
//   save(key, value) / load(key, fallback)  per-game storage
//   isTouch          true on touch screens
import { gameById } from './registry.js';
import { avatar } from './avatar.js';

let open = null;

function ensureStyles() {
  if (document.getElementById('gshell-style')) return;
  const s = document.createElement('style');
  s.id = 'gshell-style';
  s.textContent = `
  .gshell { position: fixed; inset: 0; z-index: 50; display: grid; grid-template-rows: auto 1fr; background: linear-gradient(180deg, #fff7ee, #ffeef2); color: var(--ink); font-family: var(--font); animation: gshell-in .28s cubic-bezier(.2,1.2,.4,1); }
  @keyframes gshell-in { from { opacity: 0; transform: scale(.97); } }
  .gshell-top { display: flex; align-items: center; gap: 12px; padding: max(10px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) 10px max(14px, env(safe-area-inset-left)); }
  .gshell-title { font-weight: 700; font-size: 1.2rem; line-height: 1.1; }
  .gshell-tag { font-size: .82rem; color: var(--ink-soft); }
  .gshell-score { margin-left: auto; font-weight: 700; font-size: 1.05rem; padding: 6px 14px; border-radius: 999px; background: #fff; box-shadow: 0 2px 8px rgba(52,40,70,.1); }
  .gshell-score:empty { display: none; }
  .gshell-close { width: 40px; height: 40px; border-radius: 50%; border: 0; background: #fff; box-shadow: 0 2px 8px rgba(52,40,70,.12); display: grid; place-items: center; cursor: pointer; color: var(--ink); }
  .gshell-score:empty + .gshell-close { margin-left: auto; }
  .gshell-stage { position: relative; overflow: hidden; min-height: 0; }
  .gshell-result { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(59,43,63,.35); z-index: 5; }
  .gshell-result.hidden { display: none; }
  .gshell-card { background: var(--paper); border-radius: 26px; padding: 24px 28px; text-align: center; box-shadow: 0 20px 60px rgba(52,40,70,.3); width: min(380px, 90vw); animation: gshell-in .3s cubic-bezier(.2,1.4,.4,1); }
  .gshell-card h3 { margin: 6px 0 4px; font-size: 1.6rem; }
  .gshell-card p { margin: 0 0 16px; color: var(--ink-soft); }
  .gshell-card .row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .gshell-faces { display: flex; justify-content: center; gap: 6px; }
  `;
  document.head.appendChild(s);
}

// ctx: { me, partner, sound, onClose }
export async function openGame(id, ctx) {
  if (open) return;
  const entry = gameById(id);
  if (!entry) throw new Error('Unknown game ' + id);
  ensureStyles();
  const el = document.createElement('div');
  el.className = 'gshell';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', entry.title);
  el.innerHTML = `
    <div class="gshell-top">
      <div><div class="gshell-title">${entry.title}</div><div class="gshell-tag">${entry.tagline}</div></div>
      <div class="gshell-score"></div>
      <button class="gshell-close" aria-label="Back to town"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    </div>
    <div class="gshell-stage"></div>`;
  document.body.appendChild(el);
  const stage = el.querySelector('.gshell-stage');
  const scoreEl = el.querySelector('.gshell-score');
  const result = document.createElement('div');
  result.className = 'gshell-result hidden';
  el.appendChild(result);
  result.style.top = el.querySelector('.gshell-top').offsetHeight + 'px';

  let mod;
  try {
    mod = (await import(entry.module.startsWith('.') ? new URL(entry.module, import.meta.url).href : entry.module)).default;
  } catch (err) {
    stage.innerHTML = `<div style="display:grid;place-items:center;height:100%;color:var(--ink-soft)">This game is still being built.</div>`;
    console.warn('Game failed to load', id, err);
  }

  let cleanup = null;
  let resolveDone;
  const done = new Promise((r) => (resolveDone = r));
  let last = null;

  const api = {
    me: ctx.me,
    partner: ctx.partner,
    avatar,
    isTouch: matchMedia('(pointer: coarse)').matches,
    sfx: (name) => ctx.sound?.ui?.(name),
    setScore: (text) => (scoreEl.textContent = text ?? ''),
    save: (k, v) => localStorage.setItem(`roji-game-${id}-${k}`, JSON.stringify(v)),
    load: (k, fallback = null) => {
      try {
        const v = localStorage.getItem(`roji-game-${id}-${k}`);
        return v == null ? fallback : JSON.parse(v);
      } catch {
        return fallback;
      }
    },
    finish: ({ win = null, title, text = '' } = {}) => {
      last = { win, title, text };
      api.sfx(win === true ? 'win' : win === false ? 'lose' : 'good');
      const t = title || (win === true ? 'You win!' : win === false ? 'So close!' : "It's a draw");
      result.innerHTML = `<div class="gshell-card">
        <div class="gshell-faces">${avatar(ctx.me, 64)}${avatar(ctx.partner, 64)}</div>
        <h3>${t}</h3><p>${text}</p>
        <div class="row"><button class="btn primary" data-r="again">Play again</button><button class="btn" data-r="close">Back to town</button></div></div>`;
      result.classList.remove('hidden');
      result.querySelector('[data-r="again"]').focus();
    },
  };

  const run = () => {
    result.classList.add('hidden');
    scoreEl.textContent = '';
    stage.innerHTML = '';
    if (mod) cleanup = mod.start(stage, api) || null;
  };
  const close = () => {
    try {
      cleanup?.();
    } catch (e) {
      console.warn(e);
    }
    el.remove();
    window.removeEventListener('keydown', onKey, true);
    open = null;
    ctx.onClose?.(last);
    resolveDone(last);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  };
  window.addEventListener('keydown', onKey, true);
  el.querySelector('.gshell-close').addEventListener('click', close);
  result.addEventListener('click', (e) => {
    const b = e.target.closest('[data-r]');
    if (!b) return;
    if (b.dataset.r === 'again') {
      try {
        cleanup?.();
      } catch (err) {
        console.warn(err);
      }
      run();
    } else close();
  });
  open = { id, close };
  run();
  return done;
}

export const isGameOpen = () => !!open;
