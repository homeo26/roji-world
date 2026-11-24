// A small choice card: choose({ title, text, options: [{ id, label, sub }] }) -> Promise<id | null>.
// Used by places (api.choose) and 3D minigames (ctx.hud.choose). Esc or the backdrop returns null.

const CSS = `
.choose { position: fixed; inset: 0; z-index: 70; display: grid; place-items: center; background: rgba(40,24,40,.32); font-family: var(--font, 'Fredoka', system-ui, sans-serif); }
.choose .c-card { background: #fffaf4; color: #3b2b3f; border-radius: 26px; padding: 20px 22px; width: min(440px, 90vw); max-height: 86vh; overflow: auto; box-shadow: 0 20px 60px rgba(40,20,30,.35); text-align: center; animation: c-in .25s cubic-bezier(.2,1.3,.4,1); }
.choose h3 { margin: 0 0 4px; font-size: 1.35rem; }
.choose p { margin: 0 0 14px; color: #6a5662; font-size: .95rem; }
.choose .c-opts { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.choose button { border: 0; border-radius: 18px; padding: 12px 14px; background: #f6ece4; color: #3b2b3f; font: 600 1rem var(--font, system-ui); cursor: pointer; }
.choose button:hover, .choose button:focus-visible { background: #ffe1e6; outline: none; }
.choose button small { display: block; font-weight: 400; font-size: .78rem; color: #7a6470; margin-top: 2px; }
@keyframes c-in { from { transform: scale(.9); opacity: 0; } }
@media (max-height: 520px) {
  .choose .c-card { padding: 14px 16px; width: min(660px, 92vw); max-height: 92vh; }
  .choose h3 { font-size: 1.1rem; }
  .choose p { margin-bottom: 10px; font-size: .88rem; }
  .choose .c-opts { gap: 8px; }
  .choose button { padding: 8px 10px; font-size: .92rem; }
}
`;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const open = new Set();

// Close every open choice card as if dismissed (a game that ends mid-question).
export function closeChoices() {
  for (const done of [...open]) done(null);
}

export function choose({ title = '', text = '', options = [] } = {}) {
  if (!document.getElementById('choose-style')) {
    const s = document.createElement('style');
    s.id = 'choose-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'choose';
    el.innerHTML = `<div class="c-card" role="dialog" aria-label="${esc(title)}"><h3>${esc(title)}</h3>${text ? `<p>${text}</p>` : ''}<div class="c-opts">${options
      .map((o) => `<button data-c="${esc(o.id)}">${esc(o.label)}${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</button>`)
      .join('')}</div></div>`;
    const done = (v) => {
      open.delete(done);
      el.remove();
      window.removeEventListener('keydown', key, true);
      resolve(v);
    };
    open.add(done);
    const key = (e) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        done(null);
      }
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-c]');
      if (b) done(b.dataset.c);
      else if (e.target === el) done(null);
    });
    window.addEventListener('keydown', key, true);
    document.body.appendChild(el);
    el.querySelector('button')?.focus();
  });
}
