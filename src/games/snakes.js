// Snakes and Ladders on a 10 x 10 canvas board, against the computer or a second player on this device.
const ID = 'snakes';
const C = 'g-snakes-';
const PLACE = '#8b5cf6';
// [bottom, top] and [head, tail] squares.
const LADDERS = [[3, 24], [8, 30], [21, 41], [35, 56], [50, 70], [63, 83], [72, 93]];
const SNAKES = [[16, 6], [47, 27], [59, 38], [69, 49], [87, 57], [95, 75], [99, 80]];
const SNAKE_COLORS = ['#3fbf7f', '#ec5f9e', '#ff7a59', '#2bb3c0', '#8b5cf6', '#f2b824', '#3f7bf0'];
const CELL_COLORS = ['#fff1d0', '#ffe1e8', '#d9f3e4', '#e1e9ff'];
const PIPS = {
  1: [[50, 50]],
  2: [[30, 30], [70, 70]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[30, 27], [70, 27], [30, 50], [70, 50], [30, 73], [70, 73]],
};

const CSS = `
.${C}root{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--font);color:var(--ink);user-select:none;-webkit-user-select:none;touch-action:manipulation;--av:84px;--pav:56px;--ds:120px;--pw:340px}
.${C}compact{--av:52px}
.${C}choose{display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;padding:12px}
.${C}compact .${C}choose{gap:8px}
.${C}faces{display:flex;align-items:center;gap:14px}
.${C}faces .avatar{width:calc(var(--av) * 1.2);height:calc(var(--av) * 1.2);filter:drop-shadow(0 6px 10px rgba(52,40,70,.18))}
.${C}vs{font-weight:700;color:${PLACE};background:#fff;border-radius:999px;padding:4px 12px;box-shadow:0 2px 8px rgba(52,40,70,.1)}
.${C}choose h2{margin:0;font-size:1.5rem}
.${C}compact .${C}choose h2{font-size:1.2rem}
.${C}modes{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.${C}modes .btn{--c:${PLACE};min-height:48px}
.${C}hint{font-size:.85rem;color:var(--ink-soft)}
.${C}play{display:flex;align-items:center;justify-content:center;gap:var(--gap,36px);width:100%;height:100%;padding:var(--pad,16px)}
.${C}canvas{display:block;border-radius:22px;box-shadow:var(--shadow)}
.${C}panel{width:var(--pw);display:flex;flex-direction:column;gap:var(--pg,16px)}
.${C}players{display:flex;flex-direction:column;gap:8px}
.${C}prow{display:flex;align-items:center;gap:10px;padding:6px 16px 6px 6px;border-radius:999px;background:rgba(255,255,255,.65);box-shadow:0 2px 8px rgba(52,40,70,.08);transition:box-shadow .25s,background .25s,transform .25s}
.${C}prow.${C}on{background:#fff;box-shadow:0 0 0 3px var(--pc),0 6px 16px rgba(52,40,70,.14);transform:translateX(4px)}
.${C}prow .avatar{width:var(--pav);height:var(--pav);flex:none}
.${C}pname{font-weight:700;font-size:1.1rem}
.${C}compact .${C}pname{font-size:1rem}
.${C}psq{margin-left:auto;font-weight:700;color:var(--pc);font-size:1.05rem;white-space:nowrap}
.${C}dierow{display:flex;align-items:center;gap:16px}
.${C}die{flex:none;width:var(--ds);height:var(--ds);border:0;padding:0;background:transparent;cursor:pointer;border-radius:24%;filter:drop-shadow(0 8px 12px rgba(52,40,70,.22));transition:transform .15s,opacity .2s;-webkit-tap-highlight-color:transparent}
.${C}die svg{width:100%;height:100%;display:block;overflow:visible}
.${C}die:hover:not(:disabled){transform:translateY(-3px) rotate(-4deg)}
.${C}die:focus-visible{outline:3px solid ${PLACE};outline-offset:4px}
.${C}die:disabled{cursor:default}
.${C}die.${C}wait{opacity:.6}
.${C}die.${C}ready svg{animation:${C}nudge 1.6s ease-in-out infinite}
@keyframes ${C}nudge{0%,70%,100%{transform:rotate(0)}78%{transform:rotate(-8deg)}86%{transform:rotate(7deg)}94%{transform:rotate(-3deg)}}
.${C}die.${C}rolling svg{animation:${C}tumble var(--rt,.7s) cubic-bezier(.25,.7,.4,1)}
@keyframes ${C}tumble{0%{transform:translateY(0) rotate(0) scale(1)}25%{transform:translateY(-22%) rotate(150deg) scale(.88)}50%{transform:translateY(0) rotate(260deg) scale(1.02)}72%{transform:translateY(-9%) rotate(330deg) scale(.95)}100%{transform:translateY(0) rotate(360deg) scale(1)}}
.${C}dietext{display:flex;flex-direction:column;gap:2px}
.${C}dietext b{font-size:1.15rem}
.${C}compact .${C}dietext b{font-size:1.02rem}
.${C}dietext span{font-size:.85rem;color:var(--ink-soft)}
.${C}status{font-weight:600;font-size:1.05rem;line-height:1.35;min-height:2.7em}
.${C}compact .${C}status{font-size:.95rem}
@media (prefers-reduced-motion: reduce){.${C}die.${C}ready svg,.${C}die.${C}rolling svg{animation:none}.${C}prow{transition:none}}
`;

function injectStyle() {
  if (document.getElementById('style-g-' + ID)) return;
  const s = document.createElement('style');
  s.id = 'style-g-' + ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const rgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
const colorGap = (a, b) => {
  const x = rgb(a);
  const y = rgb(b);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};
const luma = (h) => {
  const [r, g, b] = rgb(h);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c * k)));
  return '#' + ((1 << 24) | (f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
}
function lighten(hex, t) {
  const [r, g, b] = rgb(hex);
  const f = (c) => Math.round(c + (255 - c) * t);
  return '#' + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1);
}
function playerColors(a, b) {
  const usable = (c) => /^#[0-9a-f]{6}$/i.test(c || '') && luma(c) < 0.8;
  let x = usable(a) ? a : '#ef5b6f';
  let y = usable(b) ? b : '#3f7bf0';
  if (colorGap(x, y) < 120) {
    x = '#ef5b6f';
    y = '#3f7bf0';
  }
  return [x, y];
}
const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);

// Centre of a square in cell units (0..10, y down), numbered 1..100 from the bottom left, alternating direction per row.
function cellXY(n) {
  const r = Math.floor((n - 1) / 10);
  let c = (n - 1) % 10;
  if (r % 2 === 1) c = 9 - c;
  return [c + 0.5, 9 - r + 0.5];
}

// Wavy body from head to tail, in cell units.
function snakePath(head, tail) {
  const [hx, hy] = cellXY(head);
  const [tx, ty] = cellXY(tail);
  const len = Math.hypot(tx - hx, ty - hy);
  const nx = -(ty - hy) / len;
  const ny = (tx - hx) / len;
  const waves = Math.max(2, Math.round(len / 1.25));
  const amp = 0.3;
  const pts = [];
  const N = 90;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const env = Math.min(1, t * 5, (1 - t) * 3);
    const o = Math.sin(t * Math.PI * waves) * amp * env;
    pts.push([hx + (tx - hx) * t + nx * o, hy + (ty - hy) * t + ny * o]);
  }
  return pts;
}
const along = (pts, u) => {
  const f = Math.max(0, Math.min(1, u)) * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(f));
  const k = f - i;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
};

const dieSvg = (n, col) =>
  `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="6" y="9" width="88" height="88" rx="24" fill="${shade(col, 0.8)}"/><rect x="6" y="5" width="88" height="88" rx="24" fill="#fff" stroke="${col}" stroke-width="5"/>${PIPS[n]
    .map(([x, y]) => `<circle cx="${x}" cy="${y - 1}" r="9.5" fill="${col}"/>`)
    .join('')}</svg>`;

export default {
  id: ID,
  start(stage, api) {
    injectStyle();
    const me = api.me;
    const pa = api.partner;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const [colA, colB] = playerColors(me.top, pa.top);
    let alive = true;
    const timers = new Set();
    const after = (ms, fn) => {
      const t = setTimeout(() => {
        timers.delete(t);
        if (alive) fn();
      }, ms);
      timers.add(t);
    };
    let raf = 0;

    const tokenImage = (look) => {
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(api.avatar(look, 128).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
      return img;
    };
    const P = {
      A: { look: me, color: colA, pos: 1, rolls: 0, img: tokenImage(me) },
      B: { look: pa, color: colB, pos: 1, rolls: 0, img: tokenImage(pa) },
    };
    const ladderAt = new Map(LADDERS.map(([a, b]) => [a, b]));
    const snakeAt = new Map(SNAKES.map(([h, t], i) => [h, { tail: t, pts: snakePath(h, t), color: SNAKE_COLORS[i % SNAKE_COLORS.length] }]));

    const root = document.createElement('div');
    root.className = C + 'root';
    stage.appendChild(root);

    let state = 'choose';
    let mode = api.load('mode', 'cpu');
    let turn = 'A';
    let els = null;
    let ctx = null;
    let bs = 300;
    let dpr = 1;
    let pad = 8;
    let cs = 28;
    const boardCanvas = document.createElement('canvas');
    let boardDirty = true;
    let anim = null;
    let dieFace = 1;
    let rollT = 0;
    let rollLeft = 0;
    let clock = 0;

    const showScore = () => api.setScore(`${me.name} on ${P.A.pos} · ${pa.name} on ${P.B.pos}`);

    const showChooser = () => {
      root.innerHTML = `<div class="${C}choose">
        <div class="${C}faces">${api.avatar(me, 84)}<span class="${C}vs">vs</span>${api.avatar(pa, 84)}</div>
        <h2>Race to square 100. Who is rolling for ${esc(pa.name)}?</h2>
        <div class="${C}modes">
          <button class="btn primary big" data-mode="cpu">Play with ${esc(pa.name)} (computer)</button>
          <button class="btn big" data-mode="duo">Two players on this device</button>
        </div>
        ${api.isTouch ? '' : `<div class="${C}hint">Press <kbd>1</kbd> or <kbd>2</kbd></div>`}
      </div>`;
      root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.mode)));
      root.querySelector(`[data-mode="${mode}"]`)?.focus({ preventScroll: true });
    };

    const prow = (k) => `<div class="${C}prow" data-p="${k}" style="--pc:${P[k].color}">
        ${api.avatar(P[k].look, 56)}<span class="${C}pname">${esc(P[k].look.name)}</span><span class="${C}psq" data-sq>Square 1</span>
      </div>`;

    const choose = (m) => {
      if (state !== 'choose') return;
      mode = m;
      api.save('mode', m);
      api.sfx('tap');
      const games = api.load('games', 0);
      api.save('games', games + 1);
      turn = games % 2 === 0 ? 'A' : 'B';
      root.innerHTML = `<div class="${C}play">
        <canvas class="${C}canvas" aria-label="Snakes and ladders board" role="img"></canvas>
        <div class="${C}panel">
          <div class="${C}players">${prow('A')}${prow('B')}</div>
          <div class="${C}dierow">
            <button class="${C}die" aria-label="Roll the die">${dieSvg(1, P[turn].color)}</button>
            <div class="${C}dietext"><b data-dt></b><span data-ds></span></div>
          </div>
          <div class="${C}status" aria-live="polite"></div>
        </div>
      </div>`;
      els = {
        play: root.querySelector(`.${C}play`),
        canvas: root.querySelector('canvas'),
        die: root.querySelector(`.${C}die`),
        dt: root.querySelector('[data-dt]'),
        ds: root.querySelector('[data-ds]'),
        status: root.querySelector(`.${C}status`),
        rows: { A: root.querySelector('[data-p="A"]'), B: root.querySelector('[data-p="B"]') },
      };
      ctx = els.canvas.getContext('2d');
      els.die.addEventListener('click', () => humanRoll());
      for (const k of ['A', 'B']) {
        const [x, y] = cellXY(1);
        Object.assign(P[k], { x, y, lift: 0 });
      }
      layout();
      document.fonts?.load?.('600 16px Fredoka').then(() => (boardDirty = true), () => {});
      showScore();
      els.status.textContent = `Everyone starts on square 1. Exact roll needed for 100.`;
      awaitRoll();
      let last = performance.now();
      const loop = (now) => {
        if (!alive) return;
        const dt = Math.min(50, now - last);
        last = now;
        tick(dt);
        draw();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };

    const isComputer = (k) => mode === 'cpu' && k === 'B';

    const awaitRoll = () => {
      state = 'await';
      const p = P[turn];
      for (const k of ['A', 'B']) els.rows[k].classList.toggle(C + 'on', k === turn);
      els.die.innerHTML = dieSvg(dieFace, p.color);
      if (isComputer(turn)) {
        els.die.disabled = true;
        els.die.className = `${C}die ${C}wait`;
        els.dt.textContent = `${p.look.name} is rolling`;
        els.ds.textContent = '';
        after(reduce ? 500 : 850, roll);
      } else {
        els.die.disabled = false;
        els.die.className = `${C}die ${C}ready`;
        els.dt.textContent = `${p.look.name}'s turn`;
        els.ds.textContent = api.isTouch ? 'Tap the die to roll' : 'Click the die or press Space';
      }
    };

    const humanRoll = () => {
      if (state !== 'await' || isComputer(turn)) return;
      roll();
    };

    const roll = () => {
      if (state !== 'await') return;
      state = 'rolling';
      els.die.disabled = true;
      els.die.className = `${C}die`;
      void els.die.offsetWidth;
      const dur = reduce ? 250 : 700;
      els.die.style.setProperty('--rt', dur + 'ms');
      els.die.classList.add(C + 'rolling');
      els.dt.textContent = 'Rolling...';
      els.ds.textContent = '';
      api.sfx('swoosh');
      rollLeft = dur;
      rollT = 0;
    };

    const rolled = () => {
      const v = 1 + Math.floor(Math.random() * 6);
      dieFace = v;
      const p = P[turn];
      els.die.innerHTML = dieSvg(v, p.color);
      els.die.classList.remove(C + 'rolling');
      els.dt.textContent = `${p.look.name} rolled ${v}`;
      api.sfx('pop');
      p.rolls++;
      move(turn, v);
    };

    const hopStep = (k, from, to) => {
      const [x0, y0] = cellXY(from);
      const [x1, y1] = cellXY(to);
      return {
        dur: reduce ? 110 : 230,
        at: (u) => [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, reduce ? 0 : Math.sin(Math.PI * u) * 0.38],
        end: () => {
          P[k].pos = to;
          els.rows[k].querySelector('[data-sq]').textContent = `Square ${to}`;
          showScore();
          api.sfx('tick');
        },
      };
    };

    const move = (k, v) => {
      state = 'moving';
      const p = P[k];
      const steps = [];
      const start = p.pos;
      let target = start + v;
      let cur = start;
      let bounced = false;
      if (target > 100) {
        bounced = true;
        while (cur < 100) steps.push(hopStep(k, cur, ++cur));
        target = 200 - target;
        while (cur > target) steps.push(hopStep(k, cur, --cur));
      } else {
        while (cur < target) steps.push(hopStep(k, cur, ++cur));
      }
      const name = p.look.name;
      els.status.textContent = bounced ? `${name} needs exactly ${100 - start}. Too far, bounce back!` : `${name} moves ${v}.`;
      const landed = target;
      const ladder = ladderAt.get(landed);
      const snake = snakeAt.get(landed);
      if (ladder || snake) steps.push({ dur: reduce ? 120 : 260, at: () => [...cellXY(landed), 0] });
      if (ladder) {
        const [x0, y0] = cellXY(landed);
        const [x1, y1] = cellXY(ladder);
        const len = Math.hypot(x1 - x0, y1 - y0);
        steps.push({
          dur: reduce ? 300 : 380 + len * 150,
          begin: () => {
            api.sfx('good');
            els.status.textContent = `Ladder! ${name} climbs up to ${ladder}.`;
          },
          at: (u) => {
            const e = ease(u);
            return [x0 + (x1 - x0) * e, y0 + (y1 - y0) * e, reduce ? 0 : Math.abs(Math.sin(e * len * Math.PI * 1.3)) * 0.12];
          },
          end: () => {
            p.pos = ladder;
            els.rows[k].querySelector('[data-sq]').textContent = `Square ${ladder}`;
            showScore();
          },
        });
      }
      if (snake) {
        const len = snake.pts.reduce((s, q, i, a) => (i ? s + Math.hypot(q[0] - a[i - 1][0], q[1] - a[i - 1][1]) : 0), 0);
        steps.push({
          dur: reduce ? 350 : 450 + len * 170,
          begin: () => {
            api.sfx('bad');
            els.status.textContent = `Oh no, a snake! ${name} slides down to ${snake.tail}.`;
          },
          at: (u) => [...along(snake.pts, ease(u)), 0],
          end: () => {
            p.pos = snake.tail;
            els.rows[k].querySelector('[data-sq]').textContent = `Square ${snake.tail}`;
            showScore();
          },
        });
      }
      anim = { k, steps, i: 0, t: 0, done: () => moved(k) };
    };

    const moved = (k) => {
      showScore();
      const p = P[k];
      if (p.pos === 100) return win(k);
      turn = k === 'A' ? 'B' : 'A';
      after(reduce ? 200 : 450, awaitRoll);
    };

    const win = (k) => {
      state = 'over';
      const p = P[k];
      els.status.textContent = `${p.look.name} reached square 100!`;
      els.dt.textContent = `${p.look.name} wins!`;
      els.ds.textContent = '';
      els.die.disabled = true;
      els.die.className = `${C}die`;
      let bestText = '';
      if (k === 'A') {
        const prev = api.load('best', null);
        if (prev == null || p.rolls < prev) {
          api.save('best', p.rolls);
          bestText = prev == null ? ' Your first win!' : ' New best!';
        } else bestText = ` Best: ${prev} rolls.`;
      }
      api.sfx('coin');
      after(1300, () => {
        state = 'done';
        const other = k === 'A' ? P.B : P.A;
        api.finish({
          win: k === 'A',
          title: `${p.look.name} wins!`,
          text: `${p.look.name} reached 100 in ${p.rolls} rolls, ${other.look.name} was on ${other.pos}.${bestText}`,
        });
      });
    };

    const tick = (dt) => {
      clock += dt;
      if (state === 'rolling') {
        rollT += dt;
        rollLeft -= dt;
        if (rollT > 75) {
          rollT = 0;
          let f = 1 + Math.floor(Math.random() * 6);
          if (f === dieFace) f = (f % 6) + 1;
          dieFace = f;
          els.die.innerHTML = dieSvg(f, P[turn].color);
        }
        if (rollLeft <= 0) rolled();
      }
      if (anim) {
        const s = anim.steps[anim.i];
        if (!s) {
          const d = anim.done;
          anim = null;
          d();
          return;
        }
        if (anim.t === 0) s.begin?.();
        anim.t += dt;
        const u = Math.min(1, anim.t / s.dur);
        const [x, y, lift] = s.at(u);
        Object.assign(P[anim.k], { x, y, lift });
        if (u >= 1) {
          s.end?.();
          anim.i++;
          anim.t = 0;
        }
      }
    };

    const renderBoard = () => {
      boardDirty = false;
      boardCanvas.width = Math.round(bs * dpr);
      boardCanvas.height = Math.round(bs * dpr);
      const g = boardCanvas.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, bs, bs);
      const rr = (x, y, w, h, r) => {
        g.beginPath();
        g.roundRect(x, y, w, h, r);
      };
      rr(0, 0, bs, bs, bs * 0.04);
      g.fillStyle = PLACE;
      g.fill();
      g.save();
      rr(pad, pad, cs * 10, cs * 10, cs * 0.35);
      g.clip();
      for (let n = 1; n <= 100; n++) {
        const [x, y] = cellXY(n);
        const r = Math.floor((n - 1) / 10);
        const c = (n - 1) % 10;
        g.fillStyle = n === 100 ? '#ffd166' : CELL_COLORS[(r + c) % 4];
        g.fillRect(pad + (x - 0.5) * cs, pad + (y - 0.5) * cs, cs + 0.5, cs + 0.5);
      }
      g.restore();
      g.textBaseline = 'top';
      g.textAlign = 'left';
      g.font = `600 ${Math.max(8, Math.round(cs * 0.26))}px Fredoka, ui-rounded, sans-serif`;
      for (let n = 1; n <= 100; n++) {
        const [x, y] = cellXY(n);
        g.fillStyle = n === 100 ? '#8a5a00' : 'rgba(59,43,63,.5)';
        g.fillText(String(n), pad + (x - 0.5) * cs + cs * 0.08, pad + (y - 0.5) * cs + cs * 0.07);
      }
      // Start and finish marks.
      {
        const [x, y] = cellXY(100);
        drawStar(g, pad + x * cs, pad + y * cs + cs * 0.1, cs * 0.26, '#fff8e1', '#e0a100');
        const [sx, sy] = cellXY(1);
        g.font = `700 ${Math.max(7, Math.round(cs * 0.2))}px Fredoka, ui-rounded, sans-serif`;
        g.textAlign = 'center';
        g.fillStyle = '#3fa36d';
        g.fillText('START', pad + sx * cs, pad + sy * cs + cs * 0.22);
      }
      for (const [a, b] of LADDERS) drawLadder(g, a, b);
      for (const [h] of SNAKES) drawSnake(g, snakeAt.get(h));
    };

    function drawStar(g, x, y, r, fill, line) {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 ? r * 0.48 : r;
        g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      }
      g.closePath();
      g.fillStyle = fill;
      g.strokeStyle = line;
      g.lineWidth = Math.max(1.5, r * 0.16);
      g.lineJoin = 'round';
      g.fill();
      g.stroke();
    }

    function drawLadder(g, a, b) {
      const [x0, y0] = cellXY(a);
      const [x1, y1] = cellXY(b);
      const len = Math.hypot(x1 - x0, y1 - y0);
      const ux = (x1 - x0) / len;
      const uy = (y1 - y0) / len;
      const nx = -uy * 0.2;
      const ny = ux * 0.2;
      const P0 = (t, s) => [pad + (x0 + ux * t + nx * s) * cs, pad + (y0 + uy * t + ny * s) * cs];
      const ext = 0.18;
      g.lineCap = 'round';
      const line = (p, q, w, col) => {
        g.strokeStyle = col;
        g.lineWidth = w;
        g.beginPath();
        g.moveTo(p[0], p[1]);
        g.lineTo(q[0], q[1]);
        g.stroke();
      };
      // Shadow.
      g.save();
      g.translate(cs * 0.04, cs * 0.06);
      for (const s of [-1, 1]) line(P0(-ext, s), P0(len + ext, s), cs * 0.13, 'rgba(52,40,70,.18)');
      g.restore();
      for (let t = 0.22; t < len - 0.05; t += 0.36) {
        line(P0(t, -1), P0(t, 1), cs * 0.1, '#7a4a26');
        line(P0(t, -1), P0(t, 1), cs * 0.055, '#e0a563');
      }
      for (const s of [-1, 1]) {
        line(P0(-ext, s), P0(len + ext, s), cs * 0.13, '#7a4a26');
        line(P0(-ext, s), P0(len + ext, s), cs * 0.075, '#c9772f');
      }
      for (const s of [-1, 1]) {
        g.globalAlpha = 0.45;
        line(P0(-ext + 0.05, s * 1.08), P0(len + ext - 0.05, s * 1.08), cs * 0.02, '#ffd9a8');
        g.globalAlpha = 1;
      }
    }

    function drawSnake(g, sn) {
      const pts = sn.pts.map(([x, y]) => [pad + x * cs, pad + y * cs]);
      const col = sn.color;
      const dark = shade(col, 0.68);
      const belly = lighten(col, 0.45);
      const N = pts.length - 1;
      const width = (t) => cs * (0.21 - 0.13 * t);
      const dense = [];
      for (let i = 0; i < N; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[i + 1];
        const segs = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 1.5));
        for (let j = 0; j < segs; j++) {
          const k = j / segs;
          dense.push([ax + (bx - ax) * k, ay + (by - ay) * k, (i + k) / N]);
        }
      }
      dense.push([...pts[N], 1]);
      g.save();
      g.translate(cs * 0.04, cs * 0.07);
      g.fillStyle = 'rgba(52,40,70,.16)';
      for (const [x, y, t] of dense) {
        g.beginPath();
        g.arc(x, y, width(t), 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
      const pass = (color, grow, scale) => {
        g.fillStyle = color;
        for (let i = dense.length - 1; i >= 0; i--) {
          const [x, y, t] = dense[i];
          g.beginPath();
          g.arc(x, y, width(t) * scale + grow, 0, Math.PI * 2);
          g.fill();
        }
      };
      pass(dark, cs * 0.025, 1);
      pass(col, 0, 1);
      pass(belly, 0, 0.42);
      // Spots.
      g.fillStyle = dark;
      g.globalAlpha = 0.5;
      for (let i = 8, side = 1; i < N - 4; i += 7, side = -side) {
        const [x, y] = pts[i];
        const [x2, y2] = pts[i + 1];
        const l = Math.hypot(x2 - x, y2 - y) || 1;
        const w = width(i / N) * 0.62;
        g.beginPath();
        g.arc(x + (-(y2 - y) / l) * w * side, y + ((x2 - x) / l) * w * side, width(i / N) * 0.2, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      // Head, facing away from the body.
      const [hx, hy] = pts[0];
      const [bx, by] = pts[3];
      let dx = hx - bx;
      let dy = hy - by;
      const dl = Math.hypot(dx, dy) || 1;
      dx /= dl;
      dy /= dl;
      const ang = Math.atan2(dy, dx);
      const cx = hx + dx * cs * 0.06;
      const cy = hy + dy * cs * 0.06;
      g.save();
      g.translate(cx, cy);
      g.rotate(ang);
      g.strokeStyle = '#e5484d';
      g.lineWidth = Math.max(1.2, cs * 0.035);
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(cs * 0.22, 0);
      g.lineTo(cs * 0.36, 0);
      g.lineTo(cs * 0.42, -cs * 0.05);
      g.moveTo(cs * 0.36, 0);
      g.lineTo(cs * 0.42, cs * 0.05);
      g.stroke();
      g.fillStyle = dark;
      g.beginPath();
      g.ellipse(0, 0, cs * 0.3, cs * 0.25, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = col;
      g.beginPath();
      g.ellipse(0, 0, cs * 0.27, cs * 0.22, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ff8fa0';
      g.globalAlpha = 0.6;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.ellipse(cs * 0.07, s * cs * 0.15, cs * 0.05, cs * 0.035, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      for (const s of [-1, 1]) {
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(cs * 0.02, s * cs * 0.1, cs * 0.075, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#1d130f';
        g.beginPath();
        g.arc(cs * 0.045, s * cs * 0.1, cs * 0.043, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(cs * 0.055, s * cs * 0.1 - cs * 0.015, cs * 0.014, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }

    const drawToken = (k, ox, scale) => {
      const p = P[k];
      const X = pad + (p.x + ox) * cs;
      const Y = pad + p.y * cs;
      const R = cs * 0.34 * scale;
      const lift = (p.lift || 0) * cs;
      ctx.fillStyle = 'rgba(52,40,70,.25)';
      ctx.beginPath();
      ctx.ellipse(X, Y + R * 0.78, R * 0.78 * (1 - (p.lift || 0) * 0.5), R * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
      const ty = Y - lift;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(X, ty, R + Math.max(2, cs * 0.05), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(X, ty, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(X, ty, R * 0.88, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = lighten(p.color, 0.75);
      ctx.fillRect(X - R, ty - R, R * 2, R * 2);
      if (p.img.complete && p.img.naturalWidth) {
        const s = R * 2.25;
        ctx.drawImage(p.img, X - s / 2, ty - s * 0.52, s, s);
      }
      ctx.restore();
    };

    const draw = () => {
      if (!ctx) return;
      if (boardDirty) renderBoard();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
      ctx.drawImage(boardCanvas, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const moving = anim ? anim.k : null;
      const same = !moving && P.A.pos === P.B.pos;
      const order = turn === 'A' ? ['B', 'A'] : ['A', 'B'];
      for (const k of order) {
        const p = P[k];
        if (k !== moving) {
          const [x, y] = cellXY(p.pos);
          p.x = x;
          p.y = y;
          p.lift = state === 'await' && k === turn && !reduce ? Math.abs(Math.sin(clock / 260)) * 0.1 : 0;
        }
        const ox = same ? (k === 'A' ? -0.17 : 0.17) : 0;
        drawToken(k, ox, same ? 0.85 : 1);
      }
    };

    const layout = () => {
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      if (!W || !H) return;
      const compact = H < 480 || W < 760;
      root.classList.toggle(C + 'compact', compact);
      if (!els) return;
      const pw = compact ? Math.max(220, Math.min(280, W * 0.32)) : 340;
      const gap = compact ? 18 : 40;
      const padOut = compact ? 8 : 20;
      bs = Math.floor(Math.max(200, Math.min(H - padOut * 2, W - pw - gap - padOut * 2, 760)));
      root.style.setProperty('--pw', pw + 'px');
      root.style.setProperty('--pav', (compact ? 40 : 56) + 'px');
      root.style.setProperty('--ds', (compact ? Math.min(84, Math.max(64, H * 0.26)) : 124) + 'px');
      root.style.setProperty('--pg', (compact ? 10 : 22) + 'px');
      els.play.style.setProperty('--gap', gap + 'px');
      els.play.style.setProperty('--pad', padOut + 'px');
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      els.canvas.style.width = bs + 'px';
      els.canvas.style.height = bs + 'px';
      els.canvas.width = Math.round(bs * dpr);
      els.canvas.height = Math.round(bs * dpr);
      pad = Math.round(bs * 0.025);
      cs = (bs - pad * 2) / 10;
      boardDirty = true;
      draw();
    };
    const ro = new ResizeObserver(layout);
    ro.observe(stage);

    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (state === 'choose') {
        if (e.key === '1') choose('cpu');
        else if (e.key === '2') choose('duo');
        return;
      }
      if ((e.key === ' ' || e.key === 'Enter') && !(document.activeElement instanceof HTMLButtonElement)) {
        e.preventDefault();
        humanRoll();
      }
    };
    window.addEventListener('keydown', onKey);

    showChooser();
    layout();

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      timers.clear();
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
      root.remove();
    };
  },
};
