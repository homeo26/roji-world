// The Ghost Train's screen layer: the flashlight reticle, speech bubbles over heads, little
// "+2" score pops and the fade between rounds. Everything is removed again by dispose().

const CSS = `
#gt-ui { position: fixed; inset: 0; pointer-events: none; z-index: 39; font-family: var(--font, 'Fredoka', system-ui, sans-serif); overflow: hidden; }
#gt-ui .gt-ret { position: absolute; left: 0; top: 0; width: 66px; height: 66px; margin: -33px 0 0 -33px; border-radius: 50%; border: 3px solid rgba(255,246,210,.95); box-shadow: 0 0 18px rgba(255,226,140,.75), inset 0 0 14px rgba(255,226,140,.5); opacity: 0; transition: opacity .25s, transform .12s; }
#gt-ui .gt-ret.on { opacity: 1; }
#gt-ui .gt-ret.lock { border-color: #ff9eb5; box-shadow: 0 0 22px rgba(255,158,181,.9), inset 0 0 14px rgba(255,158,181,.6); }
#gt-ui .gt-ret.zap { transform: scale(1.35); }
#gt-ui .gt-ret i { position: absolute; left: 50%; top: 50%; width: 8px; height: 8px; margin: -4px 0 0 -4px; border-radius: 50%; background: rgba(255,246,210,.95); }
#gt-ui .gt-bub { position: absolute; left: 0; top: 0; transform: translate(-50%, -100%); background: #fffaf4; color: #3b2b3f; padding: 6px 12px; border-radius: 16px; font-weight: 600; font-size: 1rem; white-space: nowrap; box-shadow: 0 6px 16px rgba(30,10,40,.3); opacity: 0; transition: opacity .2s; }
#gt-ui .gt-bub.on { opacity: 1; }
#gt-ui .gt-bub::after { content: ''; position: absolute; left: 50%; bottom: -8px; margin-left: -8px; border: 8px solid transparent; border-bottom: 0; border-top-color: #fffaf4; }
#gt-ui .gt-bub.big { font-size: 2.2rem; padding: 8px 22px; color: #7d5fc4; border-radius: 26px; }
#gt-ui .gt-bub.love { color: #ef5b6f; }
#gt-ui .gt-pop { position: absolute; left: 0; top: 0; transform: translate(-50%, -50%); font-weight: 700; font-size: 1.5rem; color: #fff6d8; text-shadow: 0 2px 0 rgba(120,60,140,.6), 0 0 12px rgba(255,200,120,.8); animation: gt-pop .9s ease-out forwards; white-space: nowrap; }
#gt-ui .gt-pop.bad { color: #ffd1dc; text-shadow: 0 2px 0 rgba(140,40,70,.6); }
@keyframes gt-pop { 0% { opacity: 0; margin-top: 10px; } 15% { opacity: 1; } 100% { opacity: 0; margin-top: -46px; } }
#gt-ui .gt-fade { position: absolute; inset: 0; background: #fff8ec; opacity: 0; }
#gt-ui .gt-meter { position: absolute; left: 50%; bottom: max(56px, calc(env(safe-area-inset-bottom) + 50px)); transform: translateX(-50%); background: rgba(255,250,244,.92); border-radius: 999px; padding: 6px 14px; font-weight: 700; color: #7d5fc4; box-shadow: 0 6px 18px rgba(60,30,40,.15); display: none; align-items: center; gap: 8px; }
#gt-ui .gt-meter.on { display: flex; }
#gt-ui .gt-meter b { display: block; width: 120px; height: 10px; border-radius: 6px; background: #eadff7; overflow: hidden; }
#gt-ui .gt-meter b i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #ff9eb5, #c7a6ff); }
#arena .a-btn.gt-hot { animation: gt-hot .5s ease-in-out infinite alternate; }
@keyframes gt-hot { to { transform: scale(1.12); box-shadow: 0 0 0 6px rgba(255,209,102,.8), 0 6px 18px rgba(60,30,40,.2); } }
@media (max-height: 520px) { #gt-ui .gt-bub { font-size: .85rem; padding: 4px 10px; } #gt-ui .gt-bub.big { font-size: 1.6rem; } #gt-ui .gt-pop { font-size: 1.2rem; } #gt-ui .gt-ret { width: 56px; height: 56px; margin: -28px 0 0 -28px; } #gt-ui .gt-meter { bottom: 14px; padding: 4px 12px; } }
`;

export function overlay() {
  const style = document.createElement('style');
  style.id = 'gt-style';
  style.textContent = CSS;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'gt-ui';
  root.innerHTML = '<div class="gt-fade"></div><div class="gt-ret"><i></i></div><div class="gt-meter"><span></span><b><i></i></b></div>';
  document.body.appendChild(root);
  const ret = root.querySelector('.gt-ret');
  const fade = root.querySelector('.gt-fade');
  const meter = root.querySelector('.gt-meter');
  const bubbles = [];
  let zapTimer = 0;
  return {
    reticle(x, y, on, lock) {
      ret.style.left = `${x}px`;
      ret.style.top = `${y}px`;
      ret.classList.toggle('on', !!on);
      ret.classList.toggle('lock', !!lock);
    },
    zap() {
      ret.classList.add('zap');
      clearTimeout(zapTimer);
      zapTimer = setTimeout(() => ret.classList.remove('zap'), 120);
    },
    // A bubble that follows a point on screen (call place each frame); life in game seconds
    bubble(text, { cls = '', life = 1.6 } = {}) {
      const el = document.createElement('div');
      el.className = `gt-bub ${cls}`;
      el.textContent = text;
      root.appendChild(el);
      requestAnimationFrame(() => el.classList.add('on'));
      const b = { el, life, place(x, y) { el.style.left = `${x}px`; el.style.top = `${y}px`; } };
      bubbles.push(b);
      return b;
    },
    tick(dt) {
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.life -= dt;
        if (b.life < 0.2) b.el.classList.remove('on');
        if (b.life <= 0) {
          b.el.remove();
          bubbles.splice(i, 1);
        }
      }
    },
    pop(text, x, y, bad = false) {
      const el = document.createElement('div');
      el.className = `gt-pop${bad ? ' bad' : ''}`;
      el.textContent = text;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      root.appendChild(el);
      setTimeout(() => el.remove(), 950);
    },
    fade(v, color) {
      if (color) fade.style.background = color;
      fade.style.opacity = String(v);
    },
    meter(on, label = '', k = 0) {
      meter.classList.toggle('on', !!on);
      if (!on) return;
      meter.querySelector('span').textContent = label;
      meter.querySelector('b i').style.width = `${Math.round(Math.max(0, Math.min(1, k)) * 100)}%`;
    },
    hot(id, on) {
      document.querySelector(`#arena .a-btn[data-b="${id}"]`)?.classList.toggle('gt-hot', !!on);
    },
    dispose() {
      clearTimeout(zapTimer);
      root.remove();
      style.remove();
      document.querySelectorAll('#arena .a-btn.gt-hot').forEach((b) => b.classList.remove('gt-hot'));
    },
  };
}
