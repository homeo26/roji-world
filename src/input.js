// Keyboard, drag-to-steer (mouse or touch) and tap-to-walk.
export class Input {
  constructor(dom, { onTap, onAction, onJump, onZoom, onKey }) {
    this.keys = new Set();
    this.joy = { active: false, x: 0, y: 0 };
    this.dom = dom;
    this.enabled = false;
    const joyBase = document.getElementById('joy');
    const joyKnob = document.getElementById('joy-knob');

    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
      if (e.repeat) {
        this.keys.add(k);
        return;
      }
      this.keys.add(k);
      if (k === ' ') onJump();
      if (k === 'e' || (k === 'enter' && !(e.target instanceof HTMLButtonElement))) onAction();
      onKey?.(k, e);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    let down = null;
    this.pointerSteer = true; // false while a 3D minigame reads the pointer itself
    // Two-finger pinch zooms the map on phones
    const touches = new Map();
    let pinch = 0;
    dom.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
        down = null;
        this.joy.active = false;
        this.joy.x = this.joy.y = 0;
        joyBase.classList.remove('on');
        return;
      }
    });
    dom.addEventListener('pointermove', (e) => {
      if (!touches.has(e.pointerId)) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2 && pinch > 0 && this.enabled && this.pointerSteer) {
        const [a, b] = [...touches.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        onZoom((pinch - d) * 0.004);
        pinch = d;
      }
    });
    const lift = (e) => {
      touches.delete(e.pointerId);
      if (touches.size < 2) pinch = 0;
    };
    dom.addEventListener('pointerup', lift);
    dom.addEventListener('pointercancel', lift);
    dom.addEventListener('pointerdown', (e) => {
      if (!this.enabled || !this.pointerSteer || touches.size > 1) return;
      dom.setPointerCapture(e.pointerId);
      down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    });
    dom.addEventListener('pointermove', (e) => {
      if (!down || e.pointerId !== down.id || touches.size > 1) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      const len = Math.hypot(dx, dy);
      if (!down.moved && len > 14) {
        down.moved = true;
        this.joy.active = true;
        joyBase.style.left = down.x + 'px';
        joyBase.style.top = down.y + 'px';
        joyBase.classList.add('on');
      }
      if (down.moved) {
        const max = 60;
        const k = Math.min(1, len / max);
        this.joy.x = (dx / (len || 1)) * k;
        this.joy.y = (-dy / (len || 1)) * k;
        joyKnob.style.transform = `translate(${this.joy.x * max}px, ${-this.joy.y * max}px)`;
      }
    });
    const up = (e) => {
      if (!down || e.pointerId !== down.id) return;
      if (!down.moved && performance.now() - down.t < 400) onTap(e.clientX, e.clientY);
      down = null;
      this.joy.active = false;
      this.joy.x = this.joy.y = 0;
      joyBase.classList.remove('on');
      joyKnob.style.transform = '';
    };
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointercancel', up);
    dom.addEventListener(
      'wheel',
      (e) => {
        if (!this.enabled) return;
        e.preventDefault();
        onZoom(Math.sign(e.deltaY) * 0.08);
      },
      { passive: false },
    );
  }

  // Fixed on-screen thumbstick for phones.
  attachStick(base, knob) {
    this.stick = { active: false, x: 0, y: 0 };
    let id = null;
    const move = (e) => {
      const r = base.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const max = r.width * 0.38;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > max) {
        dx = (dx / len) * max;
        dy = (dy / len) * max;
      }
      this.stick.x = dx / max;
      this.stick.y = -dy / max;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    base.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      id = e.pointerId;
      base.setPointerCapture(id);
      this.stick.active = true;
      base.classList.add('on');
      move(e);
    });
    base.addEventListener('pointermove', (e) => {
      if (e.pointerId === id) move(e);
    });
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      this.stick.active = false;
      this.stick.x = this.stick.y = 0;
      knob.style.transform = '';
      base.classList.remove('on');
    };
    base.addEventListener('pointerup', end);
    base.addEventListener('pointercancel', end);
  }

  // Screen-space intent: x = right, y = up the screen.
  axis() {
    const k = this.keys;
    let x = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    let y = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    if (this.joy.active) {
      x = this.joy.x;
      y = this.joy.y;
    }
    if (this.stick?.active) {
      x = this.stick.x;
      y = this.stick.y;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y, keyboard: !this.joy.active && len > 0 };
  }

  get running() {
    return (
      this.keys.has('shift') ||
      (this.joy.active && Math.hypot(this.joy.x, this.joy.y) > 0.95) ||
      (this.stick?.active && Math.hypot(this.stick.x, this.stick.y) > 0.92)
    );
  }
}
