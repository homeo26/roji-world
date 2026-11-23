// Pottery Wheel: shape a spinning lump of clay to match a target vase, fire it, glaze it, keep it on a shelf.
const ID = 'pottery';
const C = '#d9734e';
const FONT = 'Fredoka, ui-rounded, system-ui, sans-serif';
const N = 32; // profile rows, bottom to top
const RMIN = 0.04;
const RMAX = 0.42;
const HMIN = 0.18;
const HMAX = 1;
const WIN_AT = 75;
const SHELF_MAX = 8;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Target profiles: radius (in clay units) at height fractions s, plus total height.
const TARGETS = [
  { name: 'Round vase', h: 0.82, pts: [[0, 0.16], [0.2, 0.27], [0.42, 0.29], [0.62, 0.22], [0.78, 0.1], [0.9, 0.09], [1, 0.14]] },
  { name: 'Tall bottle', h: 0.95, pts: [[0, 0.17], [0.15, 0.23], [0.38, 0.24], [0.55, 0.16], [0.68, 0.07], [0.88, 0.06], [1, 0.085]] },
  { name: 'Tulip cup', h: 0.7, pts: [[0, 0.11], [0.25, 0.16], [0.55, 0.22], [0.8, 0.27], [1, 0.3]] },
  { name: 'Honey jar', h: 0.6, pts: [[0, 0.2], [0.15, 0.27], [0.6, 0.28], [0.85, 0.22], [0.92, 0.17], [1, 0.18]] },
  { name: 'Fruit bowl', h: 0.4, pts: [[0, 0.14], [0.3, 0.25], [0.65, 0.33], [1, 0.37]] },
];
const GLAZES = [
  ['Terracotta', '#d9734e'],
  ['Sky', '#6fb8ff'],
  ['Mint', '#7fd3a7'],
  ['Rose', '#ff8fb1'],
  ['Butter', '#ffd166'],
  ['Lilac', '#b99af5'],
  ['Cream', '#fff1dc'],
  ['Cobalt', '#3f5fd0'],
];
const WET = '#c46b47';
const FIRED = '#e3906a';

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => clamp(Math.round(c * k), 0, 255);
  return '#' + ((1 << 24) | (f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
}
function mix(a, b, t) {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((na >> s) & 255) * (1 - t) + ((nb >> s) & 255) * t);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}

function sampleTarget(tg, s) {
  const p = tg.pts;
  for (let i = 1; i < p.length; i++) {
    if (s <= p[i][0]) {
      const [s0, r0] = p[i - 1];
      const [s1, r1] = p[i];
      const k = (1 - Math.cos(((s - s0) / (s1 - s0)) * Math.PI)) / 2;
      return r0 + (r1 - r0) * k;
    }
  }
  return p[p.length - 1][1];
}
function sampleRows(r, s) {
  const f = clamp(s, 0, 1) * (r.length - 1);
  const i = Math.floor(f);
  const j = Math.min(r.length - 1, i + 1);
  return r[i] + (r[j] - r[i]) * (f - i);
}
// Silhouette match in percent: 1 - 1.8 x (outline error / silhouette area), with a small tolerance for wobbles.
// The 1.8 keeps the untouched lump below the win line for every target, even at the right height.
function matchScore(r, h, tg) {
  const M = 120;
  const top = Math.max(h, tg.h);
  const tol = 0.012;
  let diff = 0;
  let uni = 0;
  for (let k = 0; k < M; k++) {
    const y = ((k + 0.5) / M) * top;
    const rc = y <= h ? sampleRows(r, y / h) : 0;
    const rt = y <= tg.h ? sampleTarget(tg, y / tg.h) : 0;
    uni += Math.max(rc, rt);
    diff += Math.max(0, Math.abs(rc - rt) - tol);
  }
  return Math.round(clamp(1 - 1.8 * (diff / uni), 0, 1) * 100);
}

function potSvg(p, h, color, px) {
  const S = 46;
  const base = 48;
  const n = p.length;
  const L = [];
  const R = [];
  const hl = [];
  for (let i = 0; i < n; i++) {
    const y = (base - (i / (n - 1)) * h * S).toFixed(1);
    L.push(`${(20 - p[i] * S).toFixed(1)} ${y}`);
    R.unshift(`${(20 + p[i] * S).toFixed(1)} ${y}`);
    hl.push(`${(20 - p[i] * S * 0.45).toFixed(1)} ${y}`);
  }
  const top = base - h * S;
  const rx = p[n - 1] * S;
  return `<svg width="${(px * 40) / 50}" height="${px}" viewBox="0 0 40 50" aria-hidden="true">
    <path d="M${L.join(' L')} L${R.join(' L')} Z" fill="${color}" stroke="${shade(color, 0.7)}" stroke-width="1"/>
    <polyline points="${hl.slice(1, -1).join(' ')}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="20" cy="${top.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${Math.max(0.8, rx * 0.22).toFixed(1)}" fill="${shade(color, 0.55)}" stroke="${shade(color, 1.1)}" stroke-width=".8"/>
  </svg>`;
}

const CSS = `
.g-pottery-root { position: absolute; inset: 0; display: grid; grid-template-columns: minmax(0, 1fr) clamp(230px, 30%, 330px); font-family: var(--font); color: var(--ink); }
.g-pottery-wheel { position: relative; min-width: 0; min-height: 0; }
.g-pottery-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; }
.g-pottery-shelf { position: absolute; left: 12px; top: 10px; display: grid; gap: 6px; pointer-events: none; }
.g-pottery-shelf-label { font-size: .75rem; font-weight: 600; color: #a0705a; letter-spacing: .04em; text-transform: uppercase; }
.g-pottery-plank { display: flex; align-items: flex-end; gap: 2px; min-height: calc(var(--pot) + 8px); padding: 0 8px 7px; position: relative; min-width: calc(var(--pot) * 3.6); }
.g-pottery-plank::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 7px; border-radius: 4px; background: linear-gradient(#c58a5a, #9d6640); box-shadow: 0 3px 6px rgba(90, 50, 30, .25); }
.g-pottery-plank svg { display: block; filter: drop-shadow(0 2px 1px rgba(90, 50, 30, .25)); }
.g-pottery-panel { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px 10px 4px; min-height: 0; overflow: hidden; }
.g-pottery-box { background: var(--paper); border-radius: 18px; box-shadow: 0 4px 14px rgba(52, 40, 70, .12); padding: 10px 14px; }
.g-pottery-eyebrow { font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: ${C}; }
.g-pottery-target { display: flex; align-items: center; gap: 10px; }
.g-pottery-target b { font-size: 1.2rem; display: block; line-height: 1.15; }
.g-pottery-hint { font-size: .85rem; color: var(--ink-soft); line-height: 1.3; margin-top: 4px; }
.g-pottery-row { display: flex; gap: 8px; }
.g-pottery-row .btn { flex: 1; justify-content: center; min-height: 44px; padding: .55em .8em; font-size: .92rem; }
.g-pottery-fire { justify-content: center; min-height: 48px; }
.g-pottery-pct { font-size: 2.3rem; font-weight: 700; line-height: 1; }
.g-pottery-pct small { font-size: 1rem; font-weight: 600; color: var(--ink-soft); margin-left: 4px; }
.g-pottery-msg { font-size: .9rem; color: var(--ink-soft); margin-top: 2px; }
.g-pottery-swatches { display: grid; grid-template-columns: repeat(4, 44px); gap: 6px; justify-content: center; }
.g-pottery-sw { width: 44px; height: 44px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(52, 40, 70, .2), inset 0 -6px 8px rgba(0, 0, 0, .12), inset 0 6px 8px rgba(255, 255, 255, .35); padding: 0; }
.g-pottery-sw[aria-pressed="true"] { box-shadow: 0 0 0 3px ${C}, inset 0 -6px 8px rgba(0, 0, 0, .12), inset 0 6px 8px rgba(255, 255, 255, .35); transform: scale(1.06); }
.g-pottery-hidden { display: none !important; }
.g-pottery-short .g-pottery-panel { gap: 6px; padding-top: 6px; padding-bottom: 6px; }
.g-pottery-short .g-pottery-box { padding: 8px 12px; }
.g-pottery-short .g-pottery-pct { font-size: 1.9rem; }
`;

function injectStyle() {
  if (document.getElementById('style-g-' + ID)) return;
  const s = document.createElement('style');
  s.id = 'style-g-' + ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

export default {
  id: ID,
  start(stage, api) {
    injectStyle();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.createElement('div');
    root.className = 'g-pottery-root';
    root.innerHTML = `
      <div class="g-pottery-wheel">
        <canvas class="g-pottery-cv" aria-label="Pottery wheel. Drag the edges of the clay to shape it."></canvas>
        <div class="g-pottery-shelf" aria-label="Your shelf"></div>
      </div>
      <div class="g-pottery-panel">
        <div class="g-pottery-shape">
          <div class="g-pottery-box">
            <div class="g-pottery-eyebrow">Shape a</div>
            <div class="g-pottery-target"><span class="g-pottery-tsvg"></span><div><b class="g-pottery-tname"></b><div class="g-pottery-hint">Drag the clay's edge in or out. Drag the top up or down.</div></div></div>
          </div>
        </div>
        <div class="g-pottery-shape g-pottery-row"><button class="btn g-pottery-reset">New lump</button><button class="btn g-pottery-next">Other shape</button></div>
        <button class="btn primary big g-pottery-fire g-pottery-shape" style="--c:${C}">Fire it</button>
        <div class="g-pottery-glaze g-pottery-hidden g-pottery-box">
          <div class="g-pottery-pct"></div>
          <div class="g-pottery-msg"></div>
        </div>
        <div class="g-pottery-glaze g-pottery-hidden g-pottery-box">
          <div class="g-pottery-eyebrow" style="margin-bottom:6px">Pick a glaze</div>
          <div class="g-pottery-swatches">${GLAZES.map(([n, c], i) => `<button class="g-pottery-sw" data-i="${i}" style="background:${c}" aria-label="${n} glaze" aria-pressed="${i === 0}"></button>`).join('')}</div>
        </div>
        <button class="btn primary g-pottery-glaze g-pottery-hidden g-pottery-fire g-pottery-keep" style="--c:${C}">Put it on the shelf</button>
      </div>`;
    stage.appendChild(root);
    const $ = (s) => root.querySelector(s);
    const cv = $('.g-pottery-cv');
    const ctx = cv.getContext('2d');
    const wheelEl = $('.g-pottery-wheel');
    const shelfEl = $('.g-pottery-shelf');

    let shelf = api.load('shelf', []);
    if (!Array.isArray(shelf)) shelf = [];
    let best = api.load('best', 0) || 0;

    // Clay state.
    let r = [];
    let h = 0.4;
    let targetIdx = Math.floor(Math.random() * TARGETS.length);
    let target = TARGETS[targetIdx];
    let phase = 'shape'; // shape | firing | glaze | done
    let fireT = 0;
    let pct = 0;
    let glaze = 0;
    let touched = false;
    let spin = 0;
    let t = 0;
    let drag = null;

    function newLump() {
      r = [];
      for (let i = 0; i < N; i++) {
        const s = i / (N - 1);
        r.push(0.21 * (1 - 0.45 * Math.pow(s, 1.6)));
      }
      h = 0.4;
    }
    newLump();

    function showTarget() {
      target = TARGETS[targetIdx];
      $('.g-pottery-tname').textContent = target.name;
      const pts = [];
      for (let i = 0; i < 16; i++) pts.push(sampleTarget(target, i / 15));
      $('.g-pottery-tsvg').innerHTML = potSvg(pts, target.h, '#f2d4c4', 44);
    }
    showTarget();
    api.setScore(best ? `Best ${best}%` : '');

    function renderShelf() {
      const pot = parseFloat(getComputedStyle(root).getPropertyValue('--pot')) || 34;
      const items = shelf.slice(-SHELF_MAX);
      const rows = [items.slice(0, 4), items.slice(4, 8)];
      shelfEl.innerHTML =
        `<div class="g-pottery-shelf-label">Your shelf</div>` +
        rows
          .map((row, k) => (k === 1 && !row.length ? '' : `<div class="g-pottery-plank">${row.map((p) => potSvg(p.p, p.h, p.g, pot)).join('')}</div>`))
          .join('');
    }

    // Layout.
    let W = 1, H = 1;
    let cx = 0, base = 0, U = 1;
    function resize() {
      const rect = wheelEl.getBoundingClientRect();
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      U = Math.min((H - 22) / 1.16, (W * 0.96) / 1.3);
      cx = W / 2 + Math.min(W * 0.08, Math.max(0, (W - 2 * RMAX * U) / 2 - 150) * 0.5);
      base = H - 0.15 * U - 8;
      const short = stage.getBoundingClientRect().height < 440;
      root.classList.toggle('g-pottery-short', short);
      root.style.setProperty('--pot', clamp(Math.round(H * 0.11), 28, 52) + 'px');
      renderShelf();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();

    const R = (s) => sampleRows(r, s);
    const TR = (s) => sampleTarget(target, s);

    // ------------------------------------------------------------------ drawing
    function potPath(rf, hh) {
      ctx.beginPath();
      const steps = 48;
      for (let k = 0; k <= steps; k++) {
        const s = k / steps;
        ctx.lineTo(cx - rf(s) * U, base - s * hh * U);
      }
      for (let k = steps; k >= 0; k--) {
        const s = k / steps;
        ctx.lineTo(cx + rf(s) * U, base - s * hh * U);
      }
      ctx.closePath();
    }

    function drawPot(rf, hh, color, opts) {
      let maxR = 0;
      for (let k = 0; k <= 20; k++) maxR = Math.max(maxR, rf(k / 20));
      const g = ctx.createLinearGradient(cx - maxR * U, 0, cx + maxR * U, 0);
      g.addColorStop(0, shade(color, 0.74));
      g.addColorStop(0.32, shade(color, 1.12));
      g.addColorStop(0.55, color);
      g.addColorStop(1, shade(color, 0.66));
      potPath(rf, hh);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.save();
      potPath(rf, hh);
      ctx.clip();
      // darker edges follow the outline
      ctx.strokeStyle = 'rgba(70,25,10,.16)';
      ctx.lineWidth = 0.06 * U;
      potPath(rf, hh);
      ctx.stroke();
      if (opts.rings) {
        ctx.strokeStyle = 'rgba(90,35,15,.2)';
        ctx.lineWidth = 1.5;
        for (let s = 0.1; s < 0.95; s += 0.11) {
          const rx = rf(s) * U;
          ctx.beginPath();
          ctx.ellipse(cx, base - s * hh * U, rx, rx * 0.12, 0, 0.05, Math.PI - 0.05);
          ctx.stroke();
        }
      }
      if (opts.spin != null) {
        for (let k = 0; k < 3; k++) {
          const ph = opts.spin + (k * Math.PI * 2) / 3;
          const c = Math.cos(ph);
          if (c <= 0) continue;
          ctx.strokeStyle = `rgba(255,236,220,${0.3 * c})`;
          ctx.lineWidth = 0.025 * U;
          ctx.beginPath();
          for (let q = 0; q <= 24; q++) {
            const s = q / 24;
            ctx.lineTo(cx + Math.sin(ph) * rf(s) * U * 0.9, base - s * hh * U);
          }
          ctx.stroke();
        }
      }
      if (opts.gloss) {
        ctx.strokeStyle = 'rgba(255,255,255,.5)';
        ctx.lineCap = 'round';
        ctx.lineWidth = 0.035 * U;
        ctx.beginPath();
        for (let q = 2; q <= 21; q++) {
          const s = q / 24;
          ctx.lineTo(cx - rf(s) * U * 0.5, base - s * hh * U);
        }
        ctx.stroke();
        ctx.lineWidth = 0.014 * U;
        ctx.strokeStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath();
        for (let q = 4; q <= 18; q++) {
          const s = q / 24;
          ctx.lineTo(cx + rf(s) * U * 0.55, base - s * hh * U);
        }
        ctx.stroke();
      }
      ctx.restore();
      // rim and opening
      const top = base - hh * U;
      const rx = rf(1) * U;
      ctx.fillStyle = shade(color, 1.08);
      ctx.beginPath();
      ctx.ellipse(cx, top, rx, Math.max(2, rx * 0.2), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(color, 0.5);
      ctx.beginPath();
      ctx.ellipse(cx, top + 1, Math.max(0, rx - 0.018 * U), Math.max(1, rx * 0.2 - 0.008 * U), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade(color, 0.62);
      ctx.lineWidth = 1.5;
      potPath(rf, hh);
      ctx.stroke();
    }

    function drawScene() {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#fdeee3');
      g.addColorStop(1, '#f7d9c6');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(217,115,78,.08)';
      const step = 34;
      for (let y = 18, row = 0; y < base; y += step, row++) {
        for (let x = (row % 2) * step * 0.5 + 10; x < W; x += step) {
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // floor
      ctx.fillStyle = '#ecc7a6';
      ctx.fillRect(0, base + 0.07 * U, W, H);
      ctx.fillStyle = 'rgba(150,90,50,.12)';
      ctx.fillRect(0, base + 0.07 * U, W, 3);
      // wheel stand and splash pan
      const panW = 1.18 * U;
      ctx.fillStyle = '#7b6f86';
      ctx.fillRect(cx - 0.05 * U, base + 0.08 * U, 0.1 * U, H);
      ctx.fillStyle = '#e8d7c4';
      ctx.beginPath();
      ctx.ellipse(cx, base + 0.03 * U, panW / 2, 0.09 * U, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // wheel head
      const rx = 0.48 * U;
      const ry = 0.07 * U;
      ctx.fillStyle = '#8c8599';
      ctx.beginPath();
      ctx.ellipse(cx, base + 0.028 * U, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cfc9d8';
      ctx.beginPath();
      ctx.ellipse(cx, base, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (let k = 0; k < 6; k++) {
        const a = spin + (k * Math.PI) / 3;
        const s = Math.sin(a);
        if (s < 0) continue;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * rx * 0.82, base + s * ry * 0.82, 4 + s * 2, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawPanFront() {
      const panW = 1.18 * U;
      const y = base + 0.03 * U;
      const g = ctx.createLinearGradient(0, y, 0, y + 0.1 * U);
      g.addColorStop(0, '#f4e6d6');
      g.addColorStop(1, '#d9c3ad');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, y, panW / 2, 0.09 * U, 0, 0, Math.PI);
      ctx.lineTo(cx - panW / 2, y);
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,100,70,.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, y, panW / 2, 0.09 * U, 0, 0, Math.PI);
      ctx.stroke();
    }

    function drawHints() {
      const a = 0.55 + 0.35 * Math.sin(t * 4);
      const s = 0.45;
      const y = base - s * h * U;
      const off = R(s) * U + 0.07 * U;
      const sz = clamp(0.045 * U, 10, 20);
      ctx.strokeStyle = `rgba(160,80,50,${a})`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const side of [-1, 1]) {
        const x = cx + side * off;
        ctx.beginPath();
        ctx.moveTo(x - sz, y);
        ctx.lineTo(x + sz, y);
        ctx.moveTo(x - sz * 0.5, y - sz * 0.5);
        ctx.lineTo(x - sz, y);
        ctx.lineTo(x - sz * 0.5, y + sz * 0.5);
        ctx.moveTo(x + sz * 0.5, y - sz * 0.5);
        ctx.lineTo(x + sz, y);
        ctx.lineTo(x + sz * 0.5, y + sz * 0.5);
        ctx.stroke();
      }
      const ty = base - h * U - 0.09 * U;
      ctx.beginPath();
      ctx.moveTo(cx, ty - sz);
      ctx.lineTo(cx, ty + sz);
      ctx.moveTo(cx - sz * 0.5, ty - sz * 0.5);
      ctx.lineTo(cx, ty - sz);
      ctx.lineTo(cx + sz * 0.5, ty - sz * 0.5);
      ctx.moveTo(cx - sz * 0.5, ty + sz * 0.5);
      ctx.lineTo(cx, ty + sz);
      ctx.lineTo(cx + sz * 0.5, ty + sz * 0.5);
      ctx.stroke();
    }

    function draw() {
      drawScene();
      // target silhouette
      if (phase === 'shape' || phase === 'firing') {
        potPath(TR, target.h);
        ctx.fillStyle = 'rgba(255,255,255,.4)';
        ctx.fill();
        ctx.setLineDash([7, 6]);
        ctx.strokeStyle = 'rgba(160,90,60,.55)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      let color = WET;
      if (phase === 'firing') color = mix(WET, FIRED, clamp(fireT / 0.9, 0, 1));
      else if (phase === 'glaze' || phase === 'done') color = GLAZES[glaze][1];
      const glazed = phase === 'glaze' || phase === 'done';
      drawPot(R, h, color, { rings: phase === 'shape', spin: phase === 'shape' || phase === 'glaze' ? spin : null, gloss: glazed });
      if (phase === 'firing') {
        const k = Math.sin(clamp(fireT / FIRE_T, 0, 1) * Math.PI);
        const gy = base - h * U * 0.5;
        const gl = ctx.createRadialGradient(cx, gy, 10, cx, gy, U * 0.8);
        gl.addColorStop(0, `rgba(255,170,70,${0.55 * k})`);
        gl.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = gl;
        ctx.fillRect(0, 0, W, H);
      }
      drawPanFront();
      if (phase === 'shape' && !touched) drawHints();
      if (drag && phase === 'shape') {
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.strokeStyle = 'rgba(160,80,50,.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(drag.x, drag.y, clamp(0.03 * U, 8, 16), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // ------------------------------------------------------------------ shaping
    function hitMode(x, y, touch) {
      const tol = touch ? clamp(0.1 * U, 26, 40) : clamp(0.07 * U, 16, 30);
      const top = base - h * U;
      const rTop = r[N - 1] * U;
      const dx = Math.abs(x - cx);
      if (y > top - tol * 1.6 && y < top + tol * 0.7 && dx < Math.max(rTop, 0.08 * U) + tol) return 'top';
      if (y >= top && y <= base + tol * 0.3) {
        const s = clamp((base - y) / (h * U), 0, 1);
        if (Math.abs(dx - R(s) * U) < tol) return 'side';
      }
      return null;
    }

    function shapeStep(dt) {
      if (!drag) return;
      const k = 1 - Math.exp(-dt * 14);
      if (drag.mode === 'side') {
        const s = clamp((base - drag.y) / (h * U), 0, 1);
        const tr = clamp(Math.abs(drag.x - cx) / U, RMIN, RMAX);
        const sig = 0.065;
        for (let i = 0; i < N; i++) {
          const d = i / (N - 1) - s;
          const w = Math.exp(-(d * d) / (2 * sig * sig));
          r[i] += (tr - r[i]) * w * k;
        }
        const prev = r.slice();
        for (let i = 1; i < N - 1; i++) r[i] = prev[i] + 0.08 * (prev[i - 1] + prev[i + 1] - 2 * prev[i]);
        r[0] = Math.max(r[0], 0.07);
      } else if (drag.mode === 'top') {
        const th = clamp((base - (drag.y - drag.off)) / U, HMIN, HMAX);
        h += (th - h) * (1 - Math.exp(-dt * 16));
      }
    }

    function local(e) {
      const rect = cv.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function onDown(e) {
      if (phase !== 'shape') return;
      const p = local(e);
      const mode = hitMode(p.x, p.y, e.pointerType !== 'mouse');
      if (!mode) return;
      e.preventDefault();
      cv.setPointerCapture?.(e.pointerId);
      drag = { id: e.pointerId, mode, x: p.x, y: p.y, off: p.y - (base - h * U) };
      if (!touched) touched = true;
      api.sfx('tap');
    }
    function onMove(e) {
      const p = local(e);
      if (drag && e.pointerId === drag.id) {
        drag.x = p.x;
        drag.y = p.y;
        return;
      }
      if (e.pointerType === 'mouse' && phase === 'shape') {
        const m = hitMode(p.x, p.y, false);
        cv.style.cursor = m === 'side' ? 'ew-resize' : m === 'top' ? 'ns-resize' : 'default';
      }
    }
    function onUp(e) {
      if (drag && e.pointerId === drag.id) drag = null;
    }
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);

    // ------------------------------------------------------------------ flow
    const FIRE_T = reduce ? 0.4 : 1.3;
    const show = (sel, on) => root.querySelectorAll(sel).forEach((el) => el.classList.toggle('g-pottery-hidden', !on));

    function fire() {
      if (phase !== 'shape') return;
      drag = null;
      phase = 'firing';
      fireT = 0;
      pct = matchScore(r, h, target);
      api.sfx('swoosh');
      show('.g-pottery-shape', false);
    }
    function revealGlaze() {
      phase = 'glaze';
      const win = pct >= WIN_AT;
      $('.g-pottery-pct').innerHTML = `${pct}%<small>match</small>`;
      $('.g-pottery-pct').style.color = win ? '#2f9e6b' : '#d9734e';
      $('.g-pottery-msg').textContent =
        pct >= 90 ? 'Wow, nearly perfect!' : win ? 'Lovely, it matches!' : pct >= 60 ? `Close! ${WIN_AT}% wins.` : `One of a kind! ${WIN_AT}% wins.`;
      api.sfx(win ? 'coin' : 'tap');
      show('.g-pottery-glaze', true);
      root.querySelector('.g-pottery-sw[aria-pressed="true"]')?.focus();
    }
    function pickGlaze(i) {
      glaze = i;
      root.querySelectorAll('.g-pottery-sw').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.i === i)));
      api.sfx('pop');
    }
    function keep() {
      if (phase !== 'glaze') return;
      phase = 'done';
      const p = [];
      for (let i = 0; i < 16; i++) p.push(Math.round(R(i / 15) * 1000) / 1000);
      shelf.push({ p, h: Math.round(h * 1000) / 1000, g: GLAZES[glaze][1], s: pct, n: target.name });
      shelf = shelf.slice(-SHELF_MAX);
      api.save('shelf', shelf);
      renderShelf();
      const win = pct >= WIN_AT;
      const isBest = pct > best;
      if (isBest) {
        best = pct;
        api.save('best', best);
      }
      show('.g-pottery-glaze', false);
      finishTimer = setTimeout(() => {
        api.finish({
          win,
          title: win ? 'Beautiful pot!' : 'A wobbly treasure',
          text: `${pct}% match with the ${target.name.toLowerCase()}. Your ${GLAZES[glaze][0].toLowerCase()} pot is on the shelf.${win ? '' : ` ${WIN_AT}% wins.`}${isBest ? ' New best!' : ''}`,
        });
      }, reduce ? 200 : 900);
    }
    let finishTimer = 0;

    $('.g-pottery-fire').addEventListener('click', fire);
    $('.g-pottery-keep').addEventListener('click', keep);
    $('.g-pottery-reset').addEventListener('click', () => {
      newLump();
      api.sfx('swoosh');
    });
    $('.g-pottery-next').addEventListener('click', () => {
      targetIdx = (targetIdx + 1) % TARGETS.length;
      showTarget();
      api.sfx('tap');
    });
    root.querySelectorAll('.g-pottery-sw').forEach((b) => b.addEventListener('click', () => pickGlaze(+b.dataset.i)));

    function onKey(e) {
      if (e.target.closest?.('button') && (e.key === 'Enter' || e.key === ' ')) return;
      if (phase === 'shape') {
        if (e.key === 'Enter') {
          e.preventDefault();
          fire();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          h = clamp(h + (e.key === 'ArrowUp' ? 0.03 : -0.03), HMIN, HMAX);
          touched = true;
        }
      } else if (phase === 'glaze') {
        if (e.key === 'Enter') {
          e.preventDefault();
          keep();
        } else if (/^[1-8]$/.test(e.key)) pickGlaze(+e.key - 1);
      }
    }
    window.addEventListener('keydown', onKey);

    // Test hook for the headless check (only with ?gdebug in the URL).
    if (location.search.includes('gdebug')) {
      window.__potDbg = () => ({ cx, base, U, h, r: r.slice(), target: { h: target.h, r: Array.from({ length: 41 }, (_, i) => TR(i / 40)) } });
    }

    // ------------------------------------------------------------------ loop
    let raf = 0;
    let last = performance.now();
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      t += dt;
      const speed = phase === 'shape' ? (reduce ? 2.5 : 7) : phase === 'glaze' ? 1.2 : 0;
      spin = (spin + dt * speed) % (Math.PI * 2);
      if (phase === 'shape') shapeStep(dt);
      else if (phase === 'firing') {
        fireT += dt;
        if (fireT >= FIRE_T) revealGlaze();
      }
      draw();
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(finishTimer);
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
      delete window.__potDbg;
      root.remove();
    };
  },
};
