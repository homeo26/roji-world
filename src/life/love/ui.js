import * as THREE from 'three';

// Speech bubbles over the kids' heads and small paper notes (the lunch box note, the message in a bottle).
// Plain DOM on top of the canvas. The camera is borrowed from the town scene's onBeforeRender, so bubbles
// follow the same view the player sees.

const CSS = `
.love-bubble {
  position: fixed; left: 0; top: 0; z-index: 6; pointer-events: none;
  max-width: 230px; padding: 7px 13px 8px; border-radius: 16px;
  background: #fffaf3; color: #3b2b3f; border: 2px solid #ffb3c6;
  font: 600 14px/1.25 var(--font, sans-serif); text-align: center;
  box-shadow: 0 6px 16px rgba(52, 40, 70, 0.18);
  opacity: 0; transform: translate(-50%, -100%) scale(0.7); transform-origin: 50% 100%;
  transition: opacity 0.22s, transform 0.28s cubic-bezier(0.3, 1.6, 0.5, 1);
  will-change: left, top;
}
.love-bubble.on { opacity: 1; transform: translate(-50%, -100%) scale(1); }
.love-bubble::after {
  content: ''; position: absolute; left: 50%; bottom: -8px; width: 12px; height: 12px;
  background: #fffaf3; border-right: 2px solid #ffb3c6; border-bottom: 2px solid #ffb3c6;
  transform: translateX(-50%) rotate(45deg); border-bottom-right-radius: 3px;
}
.love-bubble .heart { color: #ef5b6f; }
.love-note {
  position: fixed; left: 50%; top: 22%; z-index: 7; width: min(320px, 78vw);
  padding: 16px 20px 14px; border-radius: 6px 6px 14px 6px;
  background: repeating-linear-gradient(#fffdf6 0 25px, #e9f0fb 25px 26px), #fffdf6;
  color: #4a3423; font: 500 17px/26px var(--font, sans-serif);
  box-shadow: 0 14px 34px rgba(52, 40, 70, 0.28);
  opacity: 0; transform: translate(-50%, 14px) rotate(-2.5deg) scale(0.9);
  transition: opacity 0.3s, transform 0.4s cubic-bezier(0.3, 1.5, 0.5, 1);
  pointer-events: none; cursor: pointer;
}
.love-note.on { opacity: 1; transform: translate(-50%, 0) rotate(-2.5deg) scale(1); pointer-events: auto; }
.love-note .tape {
  position: absolute; left: 50%; top: -11px; width: 86px; height: 22px; margin-left: -43px;
  background: rgba(255, 158, 181, 0.7); transform: rotate(3deg); border-radius: 3px;
}
.love-note .from { margin-top: 4px; text-align: right; font-weight: 700; color: #ef5b6f; }
.love-note .title { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #a08a7a; line-height: 20px; }
body.inside .love-note { top: 18%; }
@media (max-height: 520px) {
  .love-bubble { font-size: 12px; padding: 5px 10px 6px; max-width: 190px; border-radius: 13px; }
  .love-note { left: 14px; top: 96px; font-size: 14px; line-height: 21px; padding: 12px 16px 10px; width: min(270px, 40vw);
    transform: translate(0, 14px) rotate(-2.5deg) scale(0.9);
    background: repeating-linear-gradient(#fffdf6 0 20px, #e9f0fb 20px 21px), #fffdf6; }
  .love-note.on { transform: translate(0, 0) rotate(-2.5deg) scale(1); }
  body.inside .love-note { top: 96px; }
}
`;

const SMALL_HEART = '<svg width="13" height="12" viewBox="0 0 24 22" style="vertical-align:-1px"><path fill="#ef5b6f" d="M12 21s-9-5.6-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.4-9 12-9 12z"/></svg>';

export class LoveUI {
  constructor(scene) {
    this.camera = null;
    // Borrow the camera the town renders with (chain any existing hook)
    const prev = scene.onBeforeRender;
    this.prevHook = prev;
    this.scene = scene;
    scene.onBeforeRender = (renderer, sc, camera, ...rest) => {
      this.camera = camera;
      if (prev) prev.call(scene, renderer, sc, camera, ...rest);
    };
    this.style = document.createElement('style');
    this.style.id = 'love-style';
    this.style.textContent = CSS;
    document.head.appendChild(this.style);
    this.bubbles = [];
    this.note = null;
    this.noteTimer = 0;
    this.tmp = new THREE.Vector3();
  }

  // Say a line over a kid's head for `ms` milliseconds.
  say(kid, text, ms = 3600) {
    this.unsay(kid);
    const el = document.createElement('div');
    el.className = 'love-bubble';
    el.innerHTML = text.replace(/<3/g, SMALL_HEART);
    document.body.appendChild(el);
    const b = { kid, el, left: ms / 1000, shown: false };
    this.bubbles.push(b);
    this.place(b);
    requestAnimationFrame(() => el.classList.add('on'));
    return b;
  }

  unsay(kid) {
    for (const b of this.bubbles) if (!kid || b.kid === kid) b.left = Math.min(b.left, 0.01);
  }

  place(b) {
    const cam = this.camera;
    if (!cam || !b.kid.head) return false;
    const p = b.kid.head.localToWorld(this.tmp.set(0, 0.74, 0)).project(cam);
    if (p.z > 1 || Math.abs(p.x) > 1.15 || Math.abs(p.y) > 1.15) {
      b.el.style.visibility = 'hidden';
      return false;
    }
    b.el.style.visibility = '';
    b.el.style.left = `${((p.x + 1) / 2) * window.innerWidth}px`;
    b.el.style.top = `${((1 - p.y) / 2) * window.innerHeight - 6}px`;
    return true;
  }

  // A paper note in the middle of the screen. Tap it to close.
  showNote({ title = '', text, from = '' }, ms = 5600) {
    this.hideNote(true);
    const el = document.createElement('div');
    el.className = 'love-note';
    el.setAttribute('role', 'status');
    el.innerHTML = `<div class="tape"></div>${title ? `<div class="title">${title}</div>` : ''}<div>${text}</div>${from ? `<div class="from">${from} ${SMALL_HEART}</div>` : ''}`;
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.hideNote();
    });
    document.body.appendChild(el);
    this.note = el;
    this.noteTimer = ms / 1000;
    requestAnimationFrame(() => el.classList.add('on'));
  }

  hideNote(now = false) {
    const el = this.note;
    if (!el) return;
    this.note = null;
    el.classList.remove('on');
    if (now) el.remove();
    else setTimeout(() => el.remove(), 400);
  }

  hideAll() {
    for (const b of this.bubbles) b.el.remove();
    this.bubbles.length = 0;
    this.hideNote(true);
  }

  update(dt) {
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.left -= dt;
      this.place(b);
      if (b.left <= 0) {
        b.el.classList.remove('on');
        const el = b.el;
        setTimeout(() => el.remove(), 300);
        this.bubbles.splice(i, 1);
      }
    }
    if (this.note) {
      this.noteTimer -= dt;
      if (this.noteTimer <= 0) this.hideNote();
    }
  }

  dispose() {
    this.hideAll();
    this.style.remove();
    if (this.scene) this.scene.onBeforeRender = this.prevHook || (() => {});
  }
}
