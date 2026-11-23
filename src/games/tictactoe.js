// X O (tic-tac-toe). api.me plays X, api.partner plays O, against the computer or a second player on this device.
const ID = 'tictactoe';
const C = 'g-tictactoe-';
const PLACE = '#8b5cf6';
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

const CSS = `
.${C}root{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--font);color:var(--ink);user-select:none;-webkit-user-select:none;touch-action:manipulation;--av:84px;--cw:180px}
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
.${C}play{display:flex;align-items:center;justify-content:center;gap:var(--gap,28px);width:100%;height:100%;padding:var(--pad,16px)}
.${C}mid{display:flex;flex-direction:column;align-items:center;gap:6px}
.${C}status{font-weight:700;font-size:1.2rem;line-height:1.5;text-align:center;white-space:nowrap;display:flex;align-items:center;gap:8px}
.${C}compact .${C}status{font-size:1.02rem;line-height:1.4}
.${C}board{position:relative;background:var(--paper);border-radius:24px;box-shadow:var(--shadow)}
.${C}grid{position:absolute;inset:5%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr)}
.${C}line{position:absolute;background:#eadcff;border-radius:99px;pointer-events:none}
.${C}cell{position:relative;border:0;background:transparent;padding:0;margin:0;border-radius:18px;cursor:pointer;display:grid;place-items:center;transition:background .15s;-webkit-tap-highlight-color:transparent}
.${C}cell:hover:not([aria-disabled="true"]){background:rgba(139,92,246,.09)}
.${C}cell:focus-visible{outline:3px solid ${PLACE};outline-offset:-5px}
.${C}cell[aria-disabled="true"]{cursor:default}
.${C}cell svg{width:74%;height:74%;overflow:visible}
.${C}mark{fill:none;stroke-linecap:round;stroke-width:14}
.${C}ink{stroke-dasharray:100 100;stroke-dashoffset:100;animation:${C}draw .26s ease-out forwards}
.${C}ink.${C}d2{animation-delay:.16s}
@keyframes ${C}draw{to{stroke-dashoffset:0}}
.${C}win svg{animation:${C}bounce .7s cubic-bezier(.3,1.6,.5,1) .25s both}
@keyframes ${C}bounce{40%{transform:scale(1.2)}100%{transform:scale(1)}}
.${C}winsvg{position:absolute;inset:5%;width:90%;height:90%;pointer-events:none;overflow:visible}
.${C}winline{fill:none;stroke:#ffd166;stroke-width:12;stroke-linecap:round;stroke-dasharray:100 100;stroke-dashoffset:100;animation:${C}draw .45s ease-out .1s forwards;filter:drop-shadow(0 2px 3px rgba(150,100,0,.35))}
.${C}card{display:flex;flex-direction:column;align-items:center;gap:6px;width:var(--cw);padding:16px 10px;border-radius:26px;background:rgba(255,255,255,.65);box-shadow:0 4px 14px rgba(52,40,70,.1);transition:transform .25s,box-shadow .25s,background .25s;text-align:center}
.${C}compact .${C}card{padding:10px 8px;gap:3px;border-radius:20px}
.${C}card .avatar{width:var(--av);height:var(--av)}
.${C}card.${C}on{transform:scale(1.06);background:#fff;box-shadow:0 0 0 4px var(--pc),0 10px 26px rgba(52,40,70,.18)}
.${C}name{font-weight:700;font-size:1.15rem}
.${C}compact .${C}name{font-size:1rem}
.${C}badge{width:34px;height:34px}
.${C}compact .${C}badge{width:24px;height:24px}
.${C}wins{font-size:.85rem;color:var(--ink-soft)}
.${C}dots{display:inline-flex;gap:4px}
.${C}dots i{width:7px;height:7px;border-radius:50%;background:var(--pc,${PLACE});animation:${C}dot 1s infinite ease-in-out}
.${C}dots i:nth-child(2){animation-delay:.15s}.${C}dots i:nth-child(3){animation-delay:.3s}
@keyframes ${C}dot{0%,80%,100%{transform:translateY(0);opacity:.5}40%{transform:translateY(-5px);opacity:1}}
@media (prefers-reduced-motion: reduce){.${C}ink,.${C}winline{animation-duration:.01s;animation-delay:0s}.${C}win svg{animation:none}.${C}card{transition:none}}
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
// Marks use the players' top colours unless they are too light to read or too close to each other.
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

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const winsText = (n) => `${n} ${n === 1 ? 'win' : 'wins'}`;

function findWinner(b) {
  for (const line of LINES) {
    const [a, c, d] = line;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { p: b[a], line };
  }
  return null;
}

// Takes a win, else usually blocks, else prefers the centre and corners. About 30% of moves are random.
function computerMove(b, self, other) {
  const empty = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  const winningCell = (p) => {
    for (const i of empty) {
      b[i] = p;
      const w = findWinner(b);
      b[i] = null;
      if (w) return i;
    }
    return -1;
  };
  const win = winningCell(self);
  if (win >= 0) return win;
  if (Math.random() < 0.3) return pick(empty);
  const block = winningCell(other);
  if (block >= 0) return block;
  if (!b[4]) return 4;
  const corners = [0, 2, 6, 8].filter((i) => !b[i]);
  return corners.length ? pick(corners) : pick(empty);
}

const markSvg = (p, color, animate) => {
  const ink = animate ? ` ${C}ink` : '';
  if (p === 'X')
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><path class="${C}mark${ink}" pathLength="100" stroke="${color}" d="M24 24 L76 76"/><path class="${C}mark${ink} ${C}d2" pathLength="100" stroke="${color}" d="M76 24 L24 76"/></svg>`;
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="${C}mark${ink}" pathLength="100" stroke="${color}" cx="50" cy="50" r="28" transform="rotate(-90 50 50)"/></svg>`;
};

export default {
  id: ID,
  start(stage, api) {
    injectStyle();
    const me = api.me;
    const pa = api.partner;
    const [colX, colO] = playerColors(me.top, pa.top);
    const who = { X: me, O: pa };
    const colorOf = { X: colX, O: colO };
    let alive = true;
    const timers = new Set();
    const after = (ms, fn) => {
      const t = setTimeout(() => {
        timers.delete(t);
        if (alive) fn();
      }, ms);
      timers.add(t);
    };

    const root = document.createElement('div');
    root.className = C + 'root';
    stage.appendChild(root);

    let state = 'choose';
    let mode = api.load('mode', 'cpu');
    let board = Array(9).fill(null);
    let turn = 'X';
    let cells = [];
    let els = null;
    const tally = api.load('tally', { me: 0, partner: 0, draw: 0 });
    const showTally = () => api.setScore(`${me.name} ${tally.me} - ${tally.partner} ${pa.name}`);
    showTally();

    const showChooser = () => {
      root.innerHTML = `<div class="${C}choose">
        <div class="${C}faces">${api.avatar(me, 84)}<span class="${C}vs">vs</span>${api.avatar(pa, 84)}</div>
        <h2>Who is playing O?</h2>
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
      return `<div class="${C}card" data-p="${p}" style="--pc:${colorOf[p]}">
        ${api.avatar(look, 84)}
        <div class="${C}name">${esc(look.name)}</div>
        <div class="${C}badge">${markSvg(p, colorOf[p], false)}</div>
        <div class="${C}wins" data-wins>${winsText(p === 'X' ? tally.me : tally.partner)}</div>
      </div>`;
    };

    const choose = (m) => {
      if (state !== 'choose') return;
      mode = m;
      api.save('mode', m);
      api.sfx('tap');
      const games = api.load('games', 0);
      api.save('games', games + 1);
      turn = games % 2 === 0 ? 'X' : 'O';
      board = Array(9).fill(null);
      root.innerHTML = `<div class="${C}play">
        ${card('X')}
        <div class="${C}mid">
          <div class="${C}status" aria-live="polite"></div>
          <div class="${C}board">
            <div class="${C}grid">
              <div class="${C}line" style="left:32.1%;top:3%;width:2.4%;height:94%"></div>
              <div class="${C}line" style="left:65.5%;top:3%;width:2.4%;height:94%"></div>
              <div class="${C}line" style="top:32.1%;left:3%;height:2.4%;width:94%"></div>
              <div class="${C}line" style="top:65.5%;left:3%;height:2.4%;width:94%"></div>
              ${board.map((_, i) => `<button class="${C}cell" data-i="${i}" aria-label="Square ${i + 1}, empty"></button>`).join('')}
            </div>
          </div>
        </div>
        ${card('O')}
      </div>`;
      els = {
        play: root.querySelector(`.${C}play`),
        status: root.querySelector(`.${C}status`),
        board: root.querySelector(`.${C}board`),
        cards: { X: root.querySelector(`[data-p="X"]`), O: root.querySelector(`[data-p="O"]`) },
      };
      cells = [...root.querySelectorAll(`.${C}cell`)];
      cells.forEach((b) => b.addEventListener('click', () => humanMove(+b.dataset.i)));
      state = 'play';
      layout();
      nextTurn();
    };

    const isComputer = (p) => mode === 'cpu' && p === 'O';

    const nextTurn = () => {
      const look = who[turn];
      for (const p of ['X', 'O']) els.cards[p].classList.toggle(C + 'on', p === turn);
      if (isComputer(turn)) {
        els.status.innerHTML = `${esc(look.name)} is thinking <span class="${C}dots" style="--pc:${colorOf[turn]}"><i></i><i></i><i></i></span>`;
        after(550 + Math.random() * 450, () => place(computerMove(board, 'O', 'X'), 'O'));
      } else {
        els.status.textContent = `${look.name}'s turn`;
      }
      cells.forEach((c, i) => c.setAttribute('aria-disabled', board[i] || isComputer(turn) ? 'true' : 'false'));
    };

    const humanMove = (i) => {
      if (state !== 'play' || board[i] || isComputer(turn)) return;
      place(i, turn);
    };

    const place = (i, p) => {
      if (state !== 'play' || board[i]) return;
      board[i] = p;
      cells[i].innerHTML = markSvg(p, colorOf[p], true);
      cells[i].setAttribute('aria-label', `Square ${i + 1}, ${p}`);
      api.sfx('pop');
      const w = findWinner(board);
      if (w) return end(w);
      if (board.every(Boolean)) return end(null);
      turn = p === 'X' ? 'O' : 'X';
      nextTurn();
    };

    const end = (w) => {
      state = 'over';
      cells.forEach((c) => c.setAttribute('aria-disabled', 'true'));
      for (const p of ['X', 'O']) els.cards[p].classList.toggle(C + 'on', !!w && p === w.p);
      if (w) {
        const look = who[w.p];
        w.line.forEach((i) => cells[i].classList.add(C + 'win'));
        const at = (i) => [(i % 3) * 100 + 50, Math.floor(i / 3) * 100 + 50];
        const [x1, y1] = at(w.line[0]);
        const [x2, y2] = at(w.line[2]);
        const dx = (x2 - x1) * 0.18;
        const dy = (y2 - y1) * 0.18;
        els.board.insertAdjacentHTML(
          'beforeend',
          `<svg class="${C}winsvg" viewBox="0 0 300 300" aria-hidden="true"><path class="${C}winline" pathLength="100" d="M${x1 - dx} ${y1 - dy} L${x2 + dx} ${y2 + dy}"/></svg>`
        );
        els.status.textContent = `${look.name} wins!`;
        if (w.p === 'X') tally.me++;
        else tally.partner++;
      } else {
        els.status.textContent = "It's a draw";
        tally.draw++;
      }
      api.save('tally', tally);
      showTally();
      els.cards.X.querySelector('[data-wins]').textContent = winsText(tally.me);
      els.cards.O.querySelector('[data-wins]').textContent = winsText(tally.partner);
      const overall = `Overall: ${me.name} ${tally.me}, ${pa.name} ${tally.partner}, draws ${tally.draw}.`;
      after(w ? 1300 : 900, () => {
        state = 'done';
        if (!w) return api.finish({ win: null, title: "It's a draw", text: `Nobody got three in a row. ${overall}` });
        const look = who[w.p];
        const vs = w.p === 'X' ? pa : me;
        api.finish({ win: w.p === 'X', title: `${look.name} wins!`, text: `Three in a row against ${vs.name}. ${overall}` });
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
      const pad = compact ? 10 : 20;
      const statusH = compact ? 30 : 42;
      const bs = Math.floor(Math.max(140, Math.min(H - pad * 2 - statusH - 8, W - 2 * cw - 2 * gap - pad * 2, 560)));
      root.style.setProperty('--cw', cw + 'px');
      els.play.style.setProperty('--gap', gap + 'px');
      els.play.style.setProperty('--pad', pad + 'px');
      els.board.style.width = bs + 'px';
      els.board.style.height = bs + 'px';
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
      if (/^[1-9]$/.test(e.key)) {
        e.preventDefault();
        humanMove(+e.key - 1);
        return;
      }
      const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[e.key];
      if (d === undefined) return;
      e.preventDefault();
      const cur = cells.indexOf(document.activeElement);
      if (cur < 0) return cells[4].focus();
      let n = cur;
      if (d === -1 && cur % 3 > 0) n = cur - 1;
      if (d === 1 && cur % 3 < 2) n = cur + 1;
      if (d === -3 && cur > 2) n = cur - 3;
      if (d === 3 && cur < 6) n = cur + 3;
      cells[n].focus();
    };
    window.addEventListener('keydown', onKey);

    showChooser();
    layout();

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      timers.clear();
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
      root.remove();
    };
  },
};
