// Four in a Row (connect four), 7 columns x 6 rows, against the computer or a second player on this device.
const ID = 'connect4';
const C = 'g-connect4-';
const PLACE = '#8b5cf6';
const COLS = 7;
const ROWS = 6;
const PAD = 12;
const TOP = 84;
const VW = COLS * 100 + PAD * 2;
const VH = TOP + ROWS * 100 + PAD * 2;
const cx = (c) => PAD + c * 100 + 50;
const cy = (r) => TOP + PAD + r * 100 + 50;

const CSS = `
.${C}root{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--font);color:var(--ink);user-select:none;-webkit-user-select:none;touch-action:manipulation;--av:84px;--cw:190px}
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
.${C}play{display:flex;align-items:center;justify-content:center;gap:var(--gap,32px);width:100%;height:100%;padding:var(--pad,16px)}
.${C}board{display:block;cursor:pointer;touch-action:manipulation;overflow:visible;filter:drop-shadow(0 12px 22px rgba(52,40,70,.22))}
.${C}board:focus{outline:none}
.${C}board:focus-visible .${C}front{stroke:#fff;stroke-width:6}
.${C}ghost{transition:transform .14s ease-out}
.${C}bob{animation:${C}bob 1.2s ease-in-out infinite}
@keyframes ${C}bob{50%{transform:translateY(-6px)}}
.${C}colhi{fill:#fff;opacity:0;transition:opacity .15s,transform .14s ease-out}
.${C}colhi.${C}show{opacity:.14}
.${C}winring{fill:none;stroke:#fff;stroke-width:7;animation:${C}pulse .9s ease-in-out infinite}
@keyframes ${C}pulse{50%{stroke-width:11;opacity:.75}}
.${C}winline{fill:none;stroke:#ffd166;stroke-width:14;stroke-linecap:round;stroke-dasharray:100 100;stroke-dashoffset:100;animation:${C}draw .5s ease-out .15s forwards;filter:drop-shadow(0 2px 3px rgba(120,80,0,.4))}
@keyframes ${C}draw{to{stroke-dashoffset:0}}
.${C}card{display:flex;flex-direction:column;align-items:center;gap:6px;width:var(--cw);padding:16px 10px;border-radius:26px;background:rgba(255,255,255,.65);box-shadow:0 4px 14px rgba(52,40,70,.1);transition:transform .25s,box-shadow .25s,background .25s;text-align:center}
.${C}compact .${C}card{padding:10px 8px;gap:3px;border-radius:20px}
.${C}card .avatar{width:var(--av);height:var(--av)}
.${C}card.${C}on{transform:scale(1.06);background:#fff;box-shadow:0 0 0 4px var(--pc),0 10px 26px rgba(52,40,70,.18)}
.${C}name{font-weight:700;font-size:1.15rem}
.${C}compact .${C}name{font-size:1rem}
.${C}chip{width:30px;height:30px}
.${C}compact .${C}chip{width:22px;height:22px}
.${C}turn{font-size:.9rem;font-weight:600;color:var(--pc);min-height:1.3em;display:flex;align-items:center;gap:6px}
.${C}compact .${C}turn{font-size:.8rem}
.${C}wins{font-size:.85rem;color:var(--ink-soft)}
.${C}dots{display:inline-flex;gap:4px}
.${C}dots i{width:6px;height:6px;border-radius:50%;background:var(--pc);animation:${C}dot 1s infinite ease-in-out}
.${C}dots i:nth-child(2){animation-delay:.15s}.${C}dots i:nth-child(3){animation-delay:.3s}
@keyframes ${C}dot{0%,80%,100%{transform:translateY(0);opacity:.5}40%{transform:translateY(-4px);opacity:1}}
@media (prefers-reduced-motion: reduce){.${C}bob,.${C}winring{animation:none}.${C}winline{animation-duration:.01s;animation-delay:0s}.${C}card,.${C}ghost{transition:none}}
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
const luma = (h) => {
  const [r, g, b] = rgb(h);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
const colorGap = (a, b) => {
  const x = rgb(a);
  const y = rgb(b);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c * k)));
  return '#' + ((1 << 24) | (f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
}
// Disc colours come from the players' tops, falling back to rose and blue when they clash with each other or the board.
function discColors(a, b) {
  const usable = (c) => /^#[0-9a-f]{6}$/i.test(c || '') && luma(c) < 0.88 && colorGap(c, PLACE) > 90;
  let x = usable(a) ? a : '#ef5b6f';
  let y = usable(b) ? b : '#3f7bf0';
  if (colorGap(x, y) < 120) {
    x = '#ef5b6f';
    y = '#3f7bf0';
  }
  return [x, y];
}
const winsText = (n) => `${n} ${n === 1 ? 'win' : 'wins'}`;

const emptyGrid = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));
const landingRow = (g, c) => {
  for (let r = ROWS - 1; r >= 0; r--) if (!g[r][c]) return r;
  return -1;
};
function lineThrough(g, r, c) {
  const p = g[r][c];
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cells = [[r, c]];
    for (const s of [1, -1]) {
      let rr = r + dr * s;
      let cc = c + dc * s;
      while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && g[rr][cc] === p) {
        cells.push([rr, cc]);
        rr += dr * s;
        cc += dc * s;
      }
    }
    if (cells.length >= 4) return cells.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  }
  return null;
}

// Wins if it can, usually blocks, else prefers the centre with some randomness and tries not to set up the opponent.
function computerColumn(g, self, other) {
  const valid = [...Array(COLS).keys()].filter((c) => !g[0][c]);
  const winsWith = (p, c) => {
    const r = landingRow(g, c);
    if (r < 0) return false;
    g[r][c] = p;
    const w = lineThrough(g, r, c);
    g[r][c] = null;
    return !!w;
  };
  for (const c of valid) if (winsWith(self, c)) return c;
  if (Math.random() < 0.85) for (const c of valid) if (winsWith(other, c)) return c;
  let best = valid[0];
  let bestScore = -Infinity;
  for (const c of valid) {
    let s = 3 - Math.abs(c - 3) + Math.random() * 2.6;
    const r = landingRow(g, c);
    if (r > 0 && Math.random() < 0.75) {
      g[r][c] = self;
      if (winsWith(other, c)) s -= 8;
      g[r][c] = null;
    }
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best;
}

const discSvg = (col) =>
  `<circle r="42" fill="${col}" stroke="${shade(col, 0.78)}" stroke-width="3"/><circle r="28" fill="none" stroke="${shade(col, 0.86)}" stroke-width="5"/><ellipse cx="-14" cy="-16" rx="11" ry="6" fill="#fff" opacity=".38" transform="rotate(-35 -14 -16)"/>`;

export default {
  id: ID,
  start(stage, api) {
    injectStyle();
    const me = api.me;
    const pa = api.partner;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const [colA, colB] = discColors(me.top, pa.top);
    const who = { A: me, B: pa };
    const colorOf = { A: colA, B: colB };
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

    const root = document.createElement('div');
    root.className = C + 'root';
    stage.appendChild(root);

    let state = 'choose';
    let mode = api.load('mode', 'cpu');
    let grid = emptyGrid();
    let turn = 'A';
    let busy = false;
    let hover = 3;
    let showHover = false;
    let els = null;
    const tally = api.load('tally', { me: 0, partner: 0, draw: 0 });
    const showTally = () => api.setScore(`${me.name} ${tally.me} - ${tally.partner} ${pa.name}`);
    showTally();

    const showChooser = () => {
      root.innerHTML = `<div class="${C}choose">
        <div class="${C}faces">${api.avatar(me, 84)}<span class="${C}vs">vs</span>${api.avatar(pa, 84)}</div>
        <h2>Who is playing ${esc(pa.name)}'s discs?</h2>
        <div class="${C}modes">
          <button class="btn primary big" data-mode="cpu">Play with ${esc(pa.name)} (computer)</button>
          <button class="btn big" data-mode="duo">Two players on this device</button>
        </div>
        ${api.isTouch ? '' : `<div class="${C}hint">Press <kbd>1</kbd> or <kbd>2</kbd></div>`}
      </div>`;
      root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.mode)));
      root.querySelector(`[data-mode="${mode}"]`)?.focus({ preventScroll: true });
    };

    const card = (p) => {
      const look = who[p];
      return `<div class="${C}card" data-p="${p}" style="--pc:${shade(colorOf[p], 0.85)}">
        ${api.avatar(look, 84)}
        <div class="${C}name">${esc(look.name)}</div>
        <svg class="${C}chip" viewBox="-50 -50 100 100" aria-hidden="true">${discSvg(colorOf[p])}</svg>
        <div class="${C}turn" data-turn></div>
        <div class="${C}wins" data-wins>${winsText(p === 'A' ? tally.me : tally.partner)}</div>
      </div>`;
    };

    const boardSvg = () => {
      const x0 = 0;
      const y0 = TOP;
      const w = VW;
      const h = VH - TOP;
      const rr = 34;
      let d = `M${x0 + rr} ${y0} H${x0 + w - rr} A${rr} ${rr} 0 0 1 ${x0 + w} ${y0 + rr} V${y0 + h - rr} A${rr} ${rr} 0 0 1 ${x0 + w - rr} ${y0 + h} H${x0 + rr} A${rr} ${rr} 0 0 1 ${x0} ${y0 + h - rr} V${y0 + rr} A${rr} ${rr} 0 0 1 ${x0 + rr} ${y0} Z`;
      let rims = '';
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          d += ` M${cx(c) - 38} ${cy(r)} a38 38 0 1 0 76 0 a38 38 0 1 0 -76 0 Z`;
          rims += `<circle cx="${cx(c)}" cy="${cy(r)}" r="39" fill="none" stroke="${shade(PLACE, 0.8)}" stroke-width="4"/>`;
        }
      return `<svg class="${C}board" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="Four in a row board" tabindex="0">
        <rect x="0" y="${TOP}" width="${VW}" height="${VH - TOP}" rx="34" fill="#e6dafc"/>
        <g data-discs></g>
        <path class="${C}front" d="${d}" fill="${PLACE}" fill-rule="evenodd"/>
        ${rims}
        <rect class="${C}colhi" data-colhi x="${PAD}" y="${TOP + 6}" width="100" height="${VH - TOP - 12}" rx="22"/>
        <g data-win></g>
        <g class="${C}ghost" data-ghost opacity="0"></g>
      </svg>`;
    };

    const choose = (m) => {
      if (state !== 'choose') return;
      mode = m;
      api.save('mode', m);
      api.sfx('tap');
      const games = api.load('games', 0);
      api.save('games', games + 1);
      turn = games % 2 === 0 ? 'A' : 'B';
      grid = emptyGrid();
      root.innerHTML = `<div class="${C}play">${card('A')}${boardSvg()}${card('B')}</div>`;
      const svg = root.querySelector(`.${C}board`);
      els = {
        play: root.querySelector(`.${C}play`),
        svg,
        discs: svg.querySelector('[data-discs]'),
        win: svg.querySelector('[data-win]'),
        ghost: svg.querySelector('[data-ghost]'),
        colhi: svg.querySelector('[data-colhi]'),
        cards: { A: root.querySelector('[data-p="A"]'), B: root.querySelector('[data-p="B"]') },
      };
      svg.addEventListener('pointermove', (e) => {
        hover = columnAt(e);
        showHover = true;
        drawHover();
      });
      svg.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'mouse') {
          showHover = false;
          drawHover();
        }
      });
      svg.addEventListener('click', (e) => {
        hover = columnAt(e);
        humanDrop(hover);
      });
      state = 'play';
      layout();
      nextTurn();
      if (!api.isTouch) svg.focus({ preventScroll: true });
    };

    const columnAt = (e) => {
      const r = els.svg.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * VW;
      return Math.max(0, Math.min(COLS - 1, Math.floor((x - PAD) / 100)));
    };

    const isComputer = (p) => mode === 'cpu' && p === 'B';
    const humanTurn = () => state === 'play' && !busy && !isComputer(turn);

    const drawHover = () => {
      if (!els) return;
      const on = showHover && humanTurn() && !grid[0][hover];
      els.colhi.style.transform = `translateX(${hover * 100}px)`;
      els.colhi.classList.toggle(C + 'show', on);
      els.ghost.style.transform = `translate(${cx(hover)}px, 40px)`;
      els.ghost.setAttribute('opacity', on ? '1' : '0');
      if (els.ghost.dataset.for !== turn) {
        els.ghost.dataset.for = turn;
        els.ghost.innerHTML = `<g class="${C}bob"><g transform="scale(.78)">${discSvg(colorOf[turn])}</g></g>`;
      }
    };

    const setTurnText = () => {
      for (const p of ['A', 'B']) {
        const el = els.cards[p];
        el.classList.toggle(C + 'on', p === turn && state === 'play');
        const t = el.querySelector('[data-turn]');
        if (p !== turn || state !== 'play') t.textContent = '';
        else if (isComputer(p)) t.innerHTML = `Thinking <span class="${C}dots"><i></i><i></i><i></i></span>`;
        else t.textContent = `${who[p].name}'s turn`;
      }
    };

    const nextTurn = () => {
      setTurnText();
      drawHover();
      if (isComputer(turn)) {
        after(600 + Math.random() * 450, () => drop(computerColumn(grid, 'B', 'A')));
      }
    };

    const humanDrop = (c) => {
      if (!humanTurn()) return;
      if (grid[0][c]) {
        api.sfx('bad');
        return;
      }
      drop(c);
    };

    const drop = (c) => {
      if (state !== 'play' || busy) return;
      const r = landingRow(grid, c);
      if (r < 0) return;
      busy = true;
      const p = turn;
      grid[r][c] = p;
      drawHover();
      api.sfx('swoosh');
      const disc = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      disc.innerHTML = discSvg(colorOf[p]);
      els.discs.appendChild(disc);
      const target = cy(r);
      let y = 40;
      let v = 0;
      let bounces = 0;
      const g = reduce ? 0.02 : 0.0042;
      disc.setAttribute('transform', `translate(${cx(c)} ${y})`);
      let last = performance.now();
      const step = (now) => {
        if (!alive) return;
        const dt = Math.min(50, now - last);
        last = now;
        v += g * dt;
        y += v * dt;
        if (y >= target) {
          y = target;
          if (!reduce && bounces < 2 && v > 0.3) {
            v = -v * 0.28;
            bounces++;
            if (bounces === 1) api.sfx('pop');
          } else {
            disc.setAttribute('transform', `translate(${cx(c)} ${target})`);
            if (reduce || bounces === 0) api.sfx('pop');
            raf = 0;
            landed(r, c, p, disc);
            return;
          }
        }
        disc.setAttribute('transform', `translate(${cx(c)} ${y})`);
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const landed = (r, c, p) => {
      busy = false;
      const line = lineThrough(grid, r, c);
      if (line) return end(p, line);
      if (grid[0].every(Boolean)) return end(null, null);
      turn = p === 'A' ? 'B' : 'A';
      nextTurn();
    };

    const end = (p, line) => {
      state = 'over';
      setTurnText();
      drawHover();
      if (p) {
        els.cards[p].classList.add(C + 'on');
        els.cards[p].querySelector('[data-turn]').textContent = `${who[p].name} wins!`;
        const [r1, c1] = line[0];
        const [r2, c2] = line[line.length - 1];
        els.win.innerHTML =
          line.map(([r, c]) => `<circle class="${C}winring" cx="${cx(c)}" cy="${cy(r)}" r="33"/>`).join('') +
          `<path class="${C}winline" pathLength="100" d="M${cx(c1)} ${cy(r1)} L${cx(c2)} ${cy(r2)}"/>`;
        if (p === 'A') tally.me++;
        else tally.partner++;
      } else tally.draw++;
      api.save('tally', tally);
      showTally();
      els.cards.A.querySelector('[data-wins]').textContent = winsText(tally.me);
      els.cards.B.querySelector('[data-wins]').textContent = winsText(tally.partner);
      const overall = `Overall: ${me.name} ${tally.me}, ${pa.name} ${tally.partner}, draws ${tally.draw}.`;
      after(p ? 1500 : 900, () => {
        state = 'done';
        if (!p) return api.finish({ win: null, title: "It's a draw", text: `The board is full. ${overall}` });
        const other = p === 'A' ? pa : me;
        api.finish({ win: p === 'A', title: `${who[p].name} wins!`, text: `Four in a row against ${other.name}. ${overall}` });
      });
    };

    const layout = () => {
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      if (!W || !H) return;
      const compact = H < 480 || W < 760;
      root.classList.toggle(C + 'compact', compact);
      if (!els) return;
      const cw = compact ? Math.max(96, Math.min(140, W * 0.17)) : 190;
      const gap = compact ? 16 : 40;
      const pad = compact ? 8 : 20;
      const bh = Math.floor(Math.max(160, Math.min(H - pad * 2, ((W - 2 * cw - 2 * gap - pad * 2) * VH) / VW, 700)));
      root.style.setProperty('--cw', cw + 'px');
      els.play.style.setProperty('--gap', gap + 'px');
      els.play.style.setProperty('--pad', pad + 'px');
      els.svg.style.height = bh + 'px';
      els.svg.style.width = Math.floor((bh * VW) / VH) + 'px';
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
      if (state !== 'play') return;
      if (/^[1-7]$/.test(e.key)) {
        e.preventDefault();
        hover = +e.key - 1;
        humanDrop(hover);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        hover = Math.max(0, Math.min(COLS - 1, hover + (e.key === 'ArrowLeft' ? -1 : 1)));
        showHover = true;
        drawHover();
        return;
      }
      if (e.key === 'ArrowDown' || ((e.key === 'Enter' || e.key === ' ') && !(document.activeElement instanceof HTMLButtonElement))) {
        e.preventDefault();
        showHover = true;
        humanDrop(hover);
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
