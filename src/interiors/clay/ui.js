// Shared look for the side panels of the pottery wheel and the drawing pad (cream cards, round buttons).

const CSS = `
.clay-ui { position: absolute; font-family: var(--font, 'Fredoka', system-ui, sans-serif); color: #3b2b3f; pointer-events: none; }
.clay-ui * { box-sizing: border-box; }
.clay-ui button { pointer-events: auto; font-family: inherit; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
.clay-box { pointer-events: auto; background: rgba(255,250,243,.95); border-radius: 18px; box-shadow: 0 6px 18px rgba(60,30,40,.15); padding: 10px 12px; }
.clay-eyebrow { font-size: .72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: #d9734e; }
.clay-btn { border: 0; border-radius: 999px; padding: .5em .9em; font-weight: 600; font-size: .92rem; background: #fff3e4; color: #3b2b3f; box-shadow: inset 0 -3px 0 rgba(0,0,0,.08), 0 3px 10px rgba(60,30,40,.12); cursor: pointer; min-height: 42px; transition: transform .12s, filter .12s; }
.clay-btn:hover { filter: brightness(1.04); }
.clay-btn:active { transform: scale(.96); }
.clay-btn.primary { background: var(--c, #d9734e); color: #fff; box-shadow: inset 0 -4px 0 rgba(0,0,0,.16), 0 6px 16px rgba(217,115,78,.35); }
.clay-btn.big { font-size: 1.08rem; min-height: 50px; }
.clay-hidden { display: none !important; }
.clay-toast { position: fixed; left: 50%; top: max(64px, calc(env(safe-area-inset-top) + 58px)); transform: translate(-50%, -8px); background: rgba(59,43,63,.9); color: #fff; padding: 8px 16px; border-radius: 999px; font-size: .92rem; opacity: 0; pointer-events: none; transition: opacity .25s, transform .25s; white-space: nowrap; font-family: var(--font, system-ui); }
.clay-toast.on { opacity: 1; transform: translate(-50%, 0); }
`;

export function injectClayStyle(id, extra = '') {
  if (!document.getElementById('clay-ui-style')) {
    const s = document.createElement('style');
    s.id = 'clay-ui-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  if (id && !document.getElementById(`clay-ui-${id}`)) {
    const s = document.createElement('style');
    s.id = `clay-ui-${id}`;
    s.textContent = extra;
    document.head.appendChild(s);
  }
}

// Put a panel in the arena overlay, under the result card.
export function mountInArena(el) {
  const layer = document.getElementById('arena') || document.body;
  layer.insertBefore(el, layer.querySelector('.a-result'));
  return el;
}

// A small toast inside the game. Returns show(text, ms) and remove().
export function makeToast() {
  const el = document.createElement('div');
  el.className = 'clay-toast';
  el.setAttribute('role', 'status');
  mountInArena(el);
  let timer = 0;
  return {
    show(text, ms = 1800) {
      el.textContent = text;
      el.classList.add('on');
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove('on'), ms);
    },
    remove() {
      clearTimeout(timer);
      el.remove();
    },
  };
}

// Buttons must not keep focus, or Enter and Space would press them again.
export function onTap(el, fn) {
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !el.contains(b)) return;
    b.blur();
    fn(b, e);
  });
}
