// Drawing Pad: brushes, colours, eraser, stamps, undo, and a small saved gallery.
import { ICONS } from '../icons.js';

const ID = 'drawpad';
const C = '#ec5f9e';
const PAPER = '#fffdf8';
const GALLERY_MAX = 12;
const SAVE_W = 800;
const OPS_MAX = 30; // ops kept for undo; older ones are flattened into the base layer

const COLORS = [
  ['Ink', '#3b2b3f'],
  ['Red', '#e5484d'],
  ['Pink', '#ec5f9e'],
  ['Orange', '#ff7a59'],
  ['Yellow', '#ffd166'],
  ['Lime', '#9bd65b'],
  ['Green', '#3fbf7f'],
  ['Teal', '#2cb5c0'],
  ['Blue', '#3f7bf0'],
  ['Purple', '#8b5cf6'],
  ['Brown', '#a0602e'],
  ['Peach', '#f8cdb4'],
];
const SIZES = [4, 10, 22]; // brush width per 1000 px of paper width
const STAMP_SIZES = [60, 100, 160];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function starPath() {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 4.4 : 10.2;
    d += (i ? 'L' : 'M') + (12 + r * Math.cos(a)).toFixed(2) + ' ' + (12.8 + r * Math.sin(a)).toFixed(2);
  }
  return d + 'Z';
}
const circ = (cx, cy, r) => `M${cx + r} ${cy}a${r} ${r} 0 1 0 ${-2 * r} 0a${r} ${r} 0 1 0 ${2 * r} 0`;
function petalsPath() {
  let d = '';
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
    d += circ(+(12 + 5.4 * Math.cos(a)).toFixed(2), +(12 + 5.4 * Math.sin(a)).toFixed(2), 4.3);
  }
  return d;
}
function raysPath() {
  let d = '';
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    d += `M${(12 + 7.6 * Math.cos(a)).toFixed(2)} ${(12 + 7.6 * Math.sin(a)).toFixed(2)}L${(12 + 10.6 * Math.cos(a)).toFixed(2)} ${(12 + 10.6 * Math.sin(a)).toFixed(2)}`;
  }
  return d;
}
const SHAPES = {
  heart: { fill: 'M12 21s-8.5-5.2-8.5-11.2A4.6 4.6 0 0 1 12 7.2a4.6 4.6 0 0 1 8.5 2.6C20.5 15.8 12 21 12 21z' },
  star: { fill: starPath() },
  flower: { fill: petalsPath(), center: circ(12, 12, 3.6) },
  sun: { fill: circ(12, 12, 5.6), rays: raysPath() },
};
const STAMPS = ['heart', 'star', 'flower', 'sun'];

function stampSvg(shape, color, px) {
  const s = SHAPES[shape];
  const center = color === '#ffd166' ? '#ff7a59' : '#ffd166';
  return `<svg width="${px}" height="${px}" viewBox="0 0 24 24" aria-hidden="true">
    ${s.rays ? `<path d="${s.rays}" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>` : ''}
    <path d="${s.fill}" fill="${color}"/>
    ${s.center ? `<path d="${s.center}" fill="${center}"/>` : ''}
  </svg>`;
}
const lineIcon = (d, px = 22) =>
  `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const ICON = {
  undo: 'M9 5 4 10l5 5 M4 10h10a5.5 5.5 0 0 1 0 11h-3',
  clear: 'M5 7h14 M10 7V4.5h4V7 M7 7l1 13h8l1-13 M10.5 11v5.5 M13.5 11v5.5',
  save: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z M4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 18 M15.5 8.5h.01',
  done: ICONS.check,
  grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
};
const ERASER = `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(-35 12 12)"><rect x="4" y="8" width="16" height="8.5" rx="2.6" fill="#ffb7cb" stroke="currentColor" stroke-width="2"/><path d="M10 8v8.5" stroke="currentColor" stroke-width="2"/></g></svg>`;

const CSS = `
.g-drawpad-root { position: absolute; inset: 0; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 8px; padding: 8px max(8px, env(safe-area-inset-right)) 8px max(8px, env(safe-area-inset-left)); font-family: var(--font); color: var(--ink); --b: 48px; --g: 5px; }
.g-drawpad-side { display: grid; grid-template-columns: repeat(2, var(--b)); grid-auto-rows: var(--b); gap: var(--g); align-content: center; }
.g-drawpad-b { width: var(--b); height: var(--b); border: 0; border-radius: 14px; background: var(--paper); box-shadow: 0 2px 6px rgba(52, 40, 70, .12), inset 0 -3px 0 rgba(0, 0, 0, .06); display: grid; place-items: center; padding: 0; color: var(--ink); position: relative; transition: transform .12s; }
.g-drawpad-b:active { transform: scale(.94); }
.g-drawpad-b[aria-pressed="true"] { box-shadow: 0 0 0 3px ${C}, 0 4px 10px rgba(236, 95, 158, .3); }
.g-drawpad-b small { position: absolute; bottom: 2px; left: 0; right: 0; font-size: .62rem; font-weight: 600; color: var(--ink-soft); line-height: 1; }
.g-drawpad-b.cap svg { margin-bottom: 9px; }
.g-drawpad-b.primary { background: ${C}; color: #fff; }
.g-drawpad-b.primary small { color: #fff; }
.g-drawpad-sw { border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(52, 40, 70, .2), inset 0 -5px 7px rgba(0, 0, 0, .12), inset 0 5px 7px rgba(255, 255, 255, .35); }
.g-drawpad-sw[aria-pressed="true"] { box-shadow: 0 0 0 3px ${C}, inset 0 -5px 7px rgba(0, 0, 0, .12); transform: scale(1.05); }
.g-drawpad-mid { display: grid; grid-template-rows: minmax(0, 1fr) auto; gap: 6px; min-width: 0; min-height: 0; }
.g-drawpad-wrap { position: relative; min-height: 0; display: grid; place-items: center; }
.g-drawpad-cv { display: block; background: ${PAPER}; border-radius: 14px; box-shadow: 0 6px 20px rgba(52, 40, 70, .14), 0 0 0 1px rgba(59, 43, 63, .06); touch-action: none; cursor: crosshair; }
.g-drawpad-strip { display: flex; gap: 6px; align-items: center; height: 48px; min-width: 0; overflow: hidden; }
.g-drawpad-strip .g-drawpad-b { flex: none; height: 44px; width: 44px; }
.g-drawpad-thumb { flex: none; height: 44px; width: 62px; padding: 0; border: 0; border-radius: 10px; overflow: hidden; background: #fff; box-shadow: 0 2px 6px rgba(52, 40, 70, .15); }
.g-drawpad-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.g-drawpad-empty { font-size: .85rem; color: var(--ink-soft); padding-left: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.g-drawpad-modal { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(59, 43, 63, .35); z-index: 3; padding: 10px; }
.g-drawpad-modal.hidden { display: none; }
.g-drawpad-sheet { background: var(--paper); border-radius: 22px; padding: 14px 16px; box-shadow: var(--shadow); max-width: 100%; max-height: 100%; display: flex; flex-direction: column; gap: 10px; align-items: center; text-align: center; min-height: 0; }
.g-drawpad-sheet h3 { margin: 0; font-size: 1.2rem; }
.g-drawpad-sheet p { margin: 0; color: var(--ink-soft); font-size: .92rem; }
.g-drawpad-sheet .row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.g-drawpad-sheet .btn { min-height: 44px; }
.g-drawpad-big { max-width: 100%; min-height: 0; flex: 1 1 auto; object-fit: contain; border-radius: 12px; box-shadow: 0 2px 10px rgba(52, 40, 70, .15); background: #fff; }
.g-drawpad-grid { display: grid; gap: 8px; }
.g-drawpad-grid .g-drawpad-thumb { width: 100%; height: 100%; }
.g-drawpad-toast { position: absolute; left: 50%; top: 14px; transform: translate(-50%, -8px); background: rgba(59, 43, 63, .9); color: #fff; padding: 8px 16px; border-radius: 999px; font-size: .92rem; opacity: 0; pointer-events: none; transition: opacity .25s, transform .25s; z-index: 4; white-space: nowrap; }
.g-drawpad-toast.on { opacity: 1; transform: translate(-50%, 0); }
`;

function injectStyle() {
  if (document.getElementById('style-g-' + ID)) return;
  const s = document.createElement('style');
  s.id = 'style-g-' + ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

const PATHS = {};
const path2d = (d) => (PATHS[d] ||= new Path2D(d));

function drawStamp(ctx, shape, x, y, d, color) {
  const s = SHAPES[shape];
  ctx.save();
  ctx.translate(x - d / 2, y - d / 2);
  ctx.scale(d / 24, d / 24);
  if (s.rays) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.stroke(path2d(s.rays));
  }
  ctx.fillStyle = color;
  ctx.fill(path2d(s.fill));
  if (s.center) {
    ctx.fillStyle = color === '#ffd166' ? '#ff7a59' : '#ffd166';
    ctx.fill(path2d(s.center));
  }
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.beginPath();
  ctx.ellipse(shape === 'heart' ? 8 : 9.5, shape === 'heart' ? 9.6 : 9, 1.6, 1.1, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export default {
  id: ID,
  start(stage, api) {
    injectStyle();
    const root = document.createElement('div');
    root.className = 'g-drawpad-root';
    const sizeBtns = SIZES.map((s, i) => `<button class="g-drawpad-b" data-size="${i}" aria-label="${['Thin', 'Medium', 'Thick'][i]} brush" title="${['Thin', 'Medium', 'Thick'][i]} brush (${i + 1})"><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="${[2.4, 4.6, 8][i]}" fill="currentColor"/></svg></button>`).join('');
    root.innerHTML = `
      <div class="g-drawpad-side g-drawpad-colors" role="group" aria-label="Colours">
        ${COLORS.map(([n, c], i) => `<button class="g-drawpad-b g-drawpad-sw" data-color="${i}" style="background:${c}" aria-label="${n}" title="${n}"></button>`).join('')}
      </div>
      <div class="g-drawpad-mid">
        <div class="g-drawpad-wrap"><canvas class="g-drawpad-cv" aria-label="Drawing paper"></canvas></div>
        <div class="g-drawpad-strip" aria-label="Your gallery"></div>
      </div>
      <div class="g-drawpad-side g-drawpad-tools" role="group" aria-label="Tools">
        ${sizeBtns}
        <button class="g-drawpad-b" data-tool="eraser" aria-label="Eraser" title="Eraser (E)">${ERASER}</button>
        ${STAMPS.map((s) => `<button class="g-drawpad-b g-drawpad-stampbtn" data-tool="${s}" aria-label="${s} stamp" title="${s[0].toUpperCase() + s.slice(1)} stamp"></button>`).join('')}
        <button class="g-drawpad-b cap" data-act="undo" aria-label="Undo" title="Undo (Ctrl+Z)">${lineIcon(ICON.undo, 20)}<small>Undo</small></button>
        <button class="g-drawpad-b cap" data-act="clear" aria-label="Clear the paper" title="Clear">${lineIcon(ICON.clear, 20)}<small>Clear</small></button>
        <button class="g-drawpad-b cap" data-act="save" aria-label="Save to gallery" title="Save to gallery">${lineIcon(ICON.save, 20)}<small>Save</small></button>
        <button class="g-drawpad-b cap primary" data-act="done" aria-label="Done" title="Done">${lineIcon(ICON.done, 20)}<small>Done</small></button>
      </div>
      <div class="g-drawpad-modal hidden"><div class="g-drawpad-sheet"></div></div>
      <div class="g-drawpad-toast" role="status"></div>`;
    stage.appendChild(root);
    const $ = (s) => root.querySelector(s);
    const cv = $('.g-drawpad-cv');
    const ctx = cv.getContext('2d');
    const wrap = $('.g-drawpad-wrap');
    const strip = $('.g-drawpad-strip');
    const modal = $('.g-drawpad-modal');
    const sheet = $('.g-drawpad-sheet');
    const toastEl = $('.g-drawpad-toast');

    // Tool state.
    let color = 0;
    let size = 1;
    let tool = 'brush'; // brush | eraser | heart | star | flower | sun
    let dirty = false;
    let toastTimer = 0;

    let gallery = api.load('gallery', []);
    if (!Array.isArray(gallery)) gallery = [];

    // Paper: fixed backing resolution chosen once, shown scaled to fit.
    let PW = 0, PH = 0;
    const baseCv = document.createElement('canvas');
    const bctx = baseCv.getContext('2d');
    let ops = [];
    let cur = null; // stroke in progress

    function initPaper() {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      let w = Math.max(200, r.width) * dpr;
      let h = Math.max(140, r.height) * dpr;
      const k = Math.min(1, 1600 / Math.max(w, h));
      PW = Math.round(w * k);
      PH = Math.round(h * k);
      cv.width = baseCv.width = PW;
      cv.height = baseCv.height = PH;
      bctx.fillStyle = PAPER;
      bctx.fillRect(0, 0, PW, PH);
      redraw();
    }
    function fitPaper() {
      const r = wrap.getBoundingClientRect();
      if (!PW) return;
      const k = Math.min(r.width / PW, r.height / PH);
      cv.style.width = Math.floor(PW * k) + 'px';
      cv.style.height = Math.floor(PH * k) + 'px';
    }

    const unit = () => PW / 1000;
    function paintOp(c, op) {
      if (op.type === 'clear') {
        c.fillStyle = PAPER;
        c.fillRect(0, 0, PW, PH);
      } else if (op.type === 'stamp') {
        drawStamp(c, op.shape, op.x, op.y, op.d, op.color);
      } else if (op.type === 'image') {
        c.fillStyle = PAPER;
        c.fillRect(0, 0, PW, PH);
        const k = Math.min(PW / op.img.naturalWidth, PH / op.img.naturalHeight);
        const w = op.img.naturalWidth * k;
        const h = op.img.naturalHeight * k;
        c.drawImage(op.img, (PW - w) / 2, (PH - h) / 2, w, h);
      } else if (op.type === 'stroke') {
        for (let i = 0; i < op.pts.length; i++) paintSeg(c, op, i, i === op.pts.length - 1);
      }
    }
    // Draw the piece of a stroke that point i completes (quadratic curves through midpoints).
    function paintSeg(c, op, i, end) {
      const p = op.pts;
      c.strokeStyle = op.color;
      c.fillStyle = op.color;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      if (p.length === 1) {
        c.beginPath();
        c.arc(p[0].x, p[0].y, (op.w * p[0].p) / 2, 0, Math.PI * 2);
        c.fill();
        return;
      }
      if (i === 0) return;
      const a = p[i - 1];
      const b = p[i];
      const mid = (u, v) => ({ x: (u.x + v.x) / 2, y: (u.y + v.y) / 2 });
      c.lineWidth = op.w * (a.p + b.p) / 2;
      c.beginPath();
      if (i === 1) {
        c.moveTo(a.x, a.y);
        c.lineTo(mid(a, b).x, mid(a, b).y);
      } else {
        const m0 = mid(p[i - 2], a);
        const m1 = mid(a, b);
        c.moveTo(m0.x, m0.y);
        c.quadraticCurveTo(a.x, a.y, m1.x, m1.y);
      }
      if (end) c.lineTo(b.x, b.y);
      c.stroke();
    }
    function redraw() {
      ctx.drawImage(baseCv, 0, 0);
      for (const op of ops) paintOp(ctx, op);
      if (cur) paintOp(ctx, cur);
    }
    function pushOp(op) {
      ops.push(op);
      while (ops.length > OPS_MAX) paintOp(bctx, ops.shift());
      dirty = true;
    }
    const isBlank = () => !dirty && !ops.length;

    // ------------------------------------------------------------------ input
    function paperPt(e) {
      const r = cv.getBoundingClientRect();
      const pressure = e.pointerType === 'pen' ? 0.35 + 1.1 * (e.pressure || 0.5) : 1;
      return { x: ((e.clientX - r.left) * PW) / r.width, y: ((e.clientY - r.top) * PH) / r.height, p: pressure };
    }
    function onDown(e) {
      if (e.button > 0) return;
      e.preventDefault();
      const p = paperPt(e);
      if (STAMPS.includes(tool)) {
        pushOp({ type: 'stamp', shape: tool, x: p.x, y: p.y, d: STAMP_SIZES[size] * unit(), color: COLORS[color][1] });
        paintOp(ctx, ops[ops.length - 1]);
        api.sfx('pop');
        return;
      }
      if (cur) return;
      cv.setPointerCapture?.(e.pointerId);
      const eraser = tool === 'eraser';
      cur = { type: 'stroke', id: e.pointerId, color: eraser ? PAPER : COLORS[color][1], w: SIZES[size] * unit() * (eraser ? 2.2 : 1), pts: [p] };
      paintSeg(ctx, cur, 0, false);
    }
    function onMove(e) {
      if (!cur || e.pointerId !== cur.id) return;
      const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of list.length ? list : [e]) {
        const p = paperPt(ev);
        const last = cur.pts[cur.pts.length - 1];
        if (Math.hypot(p.x - last.x, p.y - last.y) < 1.5) continue;
        cur.pts.push(p);
        paintSeg(ctx, cur, cur.pts.length - 1, false);
      }
    }
    function onUp(e) {
      if (!cur || e.pointerId !== cur.id) return;
      const op = cur;
      cur = null;
      delete op.id;
      pushOp(op);
      redraw();
    }
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);

    // ------------------------------------------------------------------ toolbar
    function syncTools() {
      root.querySelectorAll('[data-color]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.color === color)));
      root.querySelectorAll('[data-size]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.size === size)));
      root.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
      root.querySelectorAll('.g-drawpad-stampbtn').forEach((b) => (b.innerHTML = stampSvg(b.dataset.tool, COLORS[color][1], 26)));
      root.querySelectorAll('[data-size] svg').forEach((s) => (s.style.color = tool === 'eraser' ? '#c9b8c4' : COLORS[color][1]));
    }
    function toast(text) {
      toastEl.textContent = text;
      toastEl.classList.add('on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('on'), 1800);
    }
    function undo() {
      if (!ops.length) {
        toast('Nothing to undo');
        return;
      }
      ops.pop();
      dirty = true;
      redraw();
      api.sfx('swoosh');
    }
    function clearPaper() {
      if (isBlank()) return;
      pushOp({ type: 'clear' });
      redraw();
      api.sfx('swoosh');
    }
    function persist() {
      for (;;) {
        try {
          api.save('gallery', gallery);
          return true;
        } catch {
          if (gallery.length <= 1) return false;
          gallery.shift();
        }
      }
    }
    function saveDrawing() {
      if (isBlank()) {
        toast('Draw something first');
        return false;
      }
      const w = Math.min(SAVE_W, PW);
      const h = Math.round((PH * w) / PW);
      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      const o = out.getContext('2d');
      o.fillStyle = PAPER;
      o.fillRect(0, 0, w, h);
      o.drawImage(cv, 0, 0, w, h);
      gallery.push({ src: out.toDataURL('image/jpeg', 0.85), t: Date.now() });
      let dropped = false;
      while (gallery.length > GALLERY_MAX) {
        gallery.shift();
        dropped = true;
      }
      if (!persist()) {
        gallery.pop();
        toast('No room left to save');
        return false;
      }
      dirty = false;
      renderStrip();
      api.sfx('coin');
      toast(dropped ? `Saved. The gallery keeps ${GALLERY_MAX}, so the oldest left.` : 'Saved to your gallery');
      return true;
    }

    root.querySelector('.g-drawpad-colors').addEventListener('click', (e) => {
      const b = e.target.closest('[data-color]');
      if (!b) return;
      color = +b.dataset.color;
      if (tool === 'eraser') tool = 'brush';
      api.sfx('tap');
      syncTools();
    });
    root.querySelector('.g-drawpad-tools').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.size != null) {
        size = +b.dataset.size;
        api.sfx('tap');
      } else if (b.dataset.tool) {
        tool = tool === b.dataset.tool ? 'brush' : b.dataset.tool;
        api.sfx('tap');
      } else if (b.dataset.act === 'undo') undo();
      else if (b.dataset.act === 'clear') clearPaper();
      else if (b.dataset.act === 'save') saveDrawing();
      else if (b.dataset.act === 'done') done();
      syncTools();
    });

    // ------------------------------------------------------------------ gallery
    function stripFit() {
      const w = strip.getBoundingClientRect().width;
      return Math.max(0, Math.floor((w - 50) / 68));
    }
    function renderStrip() {
      const items = gallery.map((g, i) => ({ ...g, i })).reverse();
      if (!items.length) {
        strip.innerHTML = `<span class="g-drawpad-empty">Saved drawings show up here.</span>`;
        return;
      }
      const fit = stripFit();
      const shown = items.length > fit ? items.slice(0, Math.max(0, fit)) : items;
      strip.innerHTML =
        `<button class="g-drawpad-b" data-gal="all" aria-label="Open the gallery" title="Gallery">${lineIcon(ICON.grid, 20)}</button>` +
        shown.map((g) => `<button class="g-drawpad-thumb" data-open="${g.i}" aria-label="Saved drawing ${g.i + 1}"><img src="${g.src}" alt=""></button>`).join('');
    }
    strip.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      api.sfx('tap');
      if (b.dataset.gal) openGrid();
      else if (b.dataset.open != null) openPreview(+b.dataset.open);
    });

    function showModal(html) {
      sheet.innerHTML = html;
      modal.classList.remove('hidden');
      sheet.querySelector('button')?.focus();
    }
    function hideModal() {
      modal.classList.add('hidden');
      sheet.innerHTML = '';
    }
    function openGrid() {
      const r = root.getBoundingClientRect();
      const n = gallery.length;
      const cols = Math.min(n, r.width > 700 ? 4 : 4);
      const rows = Math.ceil(n / cols);
      const cellH = clamp(Math.floor((r.height - 150) / rows), 44, 110);
      const cellW = Math.round(cellH * 1.4);
      const items = gallery.map((g, i) => `<button class="g-drawpad-thumb" data-open="${i}" aria-label="Saved drawing ${i + 1}"><img src="${g.src}" alt=""></button>`).reverse();
      showModal(`<h3>Your gallery</h3>
        <div class="g-drawpad-grid" style="grid-template-columns:repeat(${cols}, ${cellW}px);grid-auto-rows:${cellH}px">${items.join('')}</div>
        <div class="row"><button class="btn" data-m="close">Close</button></div>`);
    }
    function openPreview(i) {
      const g = gallery[i];
      if (!g) return;
      showModal(`<img class="g-drawpad-big" src="${g.src}" alt="Saved drawing ${i + 1}">
        <div class="row">
          <button class="btn primary" style="--c:${C}" data-m="use" data-i="${i}">Draw on it</button>
          <button class="btn" data-m="del" data-i="${i}">Delete</button>
          <button class="btn ghost" data-m="close">Close</button>
        </div>`);
      const img = sheet.querySelector('.g-drawpad-big');
      const r = root.getBoundingClientRect();
      img.style.maxHeight = Math.max(80, r.height - 110) + 'px';
    }
    sheet.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.open != null) {
        api.sfx('tap');
        openPreview(+b.dataset.open);
        return;
      }
      const m = b.dataset.m;
      if (m === 'close') {
        api.sfx('tap');
        hideModal();
      } else if (m === 'use') {
        const g = gallery[+b.dataset.i];
        hideModal();
        if (!g) return;
        const img = new Image();
        img.onload = () => {
          pushOp({ type: 'image', img });
          dirty = false;
          redraw();
          api.sfx('pop');
        };
        img.src = g.src;
      } else if (m === 'del') {
        if (b.dataset.sure !== '1') {
          b.dataset.sure = '1';
          b.textContent = 'Really delete?';
          api.sfx('tap');
          return;
        }
        gallery.splice(+b.dataset.i, 1);
        persist();
        renderStrip();
        hideModal();
        api.sfx('swoosh');
        toast('Drawing deleted');
      } else if (m === 'savefin') {
        hideModal();
        if (saveDrawing()) finishUp(true);
      } else if (m === 'fin') {
        hideModal();
        finishUp(false);
      }
    });
    modal.addEventListener('pointerdown', (e) => {
      if (e.target === modal) hideModal();
    });

    function done() {
      if (!isBlank() && dirty) {
        showModal(`<h3>Keep this drawing?</h3><p>It is not in your gallery yet.</p>
          <div class="row">
            <button class="btn primary" style="--c:${C}" data-m="savefin">Save and finish</button>
            <button class="btn" data-m="fin">Finish without saving</button>
            <button class="btn ghost" data-m="close">Keep drawing</button>
          </div>`);
        return;
      }
      finishUp(false);
    }
    function finishUp(saved) {
      const n = gallery.length;
      api.finish({
        win: null,
        title: 'Lovely drawing!',
        text: `${saved ? 'Saved. ' : ''}Your gallery has ${n} drawing${n === 1 ? '' : 's'}${n ? ` for ${api.partner.name} to admire` : ''}.`,
      });
    }

    function onKey(e) {
      if (!modal.classList.contains('hidden')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      } else if (e.key === 'e' || e.key === 'E') {
        tool = tool === 'eraser' ? 'brush' : 'eraser';
        syncTools();
      } else if (e.key === 'b' || e.key === 'B') {
        tool = 'brush';
        syncTools();
      } else if (/^[1-3]$/.test(e.key)) {
        size = +e.key - 1;
        syncTools();
      }
    }
    window.addEventListener('keydown', onKey);

    // ------------------------------------------------------------------ sizing
    function layout() {
      const r = stage.getBoundingClientRect();
      const b = clamp(Math.floor((r.height - 16 - 5 * 5) / 6), 44, 56);
      root.style.setProperty('--b', b + 'px');
      if (!PW) initPaper();
      fitPaper();
      renderStrip();
    }
    const ro = new ResizeObserver(layout);
    ro.observe(stage);
    layout();
    syncTools();
    api.setScore('');

    // Test hook for the headless check (only with ?gdebug in the URL).
    if (location.search.includes('gdebug')) window.__drawDbg = () => ({ PW, PH, ops: ops.length, gallery: gallery.length, dirty });

    return () => {
      ro.disconnect();
      clearTimeout(toastTimer);
      window.removeEventListener('keydown', onKey);
      delete window.__drawDbg;
      root.remove();
    };
  },
};
