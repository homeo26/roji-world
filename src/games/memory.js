// Memory Match: flip two cards at a time and find every pair. Solo, with the computer partner, or two players.
import { ICONS } from '../icons.js';

const ID = 'memory';
const C = '#ef5b6f';
const AI_RECALL = 0.65; // chance the computer remembers a card it saw
const AI_FORGET = 0.1; // chance per turn it forgets each remembered card

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const STAR = 'M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z';
const FLOWER =
  'M12 7.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 1 0 0-4.8z M12 2.8a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 1 0 0-5.2z M16.6 6.1a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 1 0 0-5.2z M14.8 11.6a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 1 0 0-5.2z M9.2 11.6a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 1 0 0-5.2z M7.4 6.1a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 1 0 0-5.2z M12 16.8V21.5 M12 19.6c1.6-1.7 3.4-2 4.8-1.5';
// The pictures. fill: a soft white fill under the outline for closed shapes.
const PICS = [
  { key: 'cinema', name: 'clapper', d: ICONS.cinema, c: '#e5484d', fill: false },
  { key: 'horse', name: 'horse', d: ICONS.horse, c: '#c9772f', fill: false },
  { key: 'fencing', name: 'crossed foils', d: ICONS.fencing, c: '#3f7bf0', fill: false },
  { key: 'dice', name: 'dice', d: ICONS.dice, c: '#8b5cf6', fill: true },
  { key: 'vase', name: 'vase', d: ICONS.vase, c: '#ff8c42', fill: true },
  { key: 'palette', name: 'palette', d: ICONS.palette, c: '#2cb5c0', fill: true },
  { key: 'heart', name: 'heart', d: ICONS.heart, c: '#ec5f9e', fill: true },
  { key: 'star', name: 'star', d: STAR, c: '#f5b82e', fill: true },
  { key: 'flower', name: 'flower', d: FLOWER, c: '#3fbf7f', fill: false },
];

const picSvg = (p) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${p.d}" fill="${p.fill ? 'rgba(255,255,255,.35)' : 'none'}" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const CSS = `
.g-memory-root { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 18px; padding: 8px 12px; font-family: var(--font); color: var(--ink); }
.g-memory-board { display: grid; gap: var(--gap, 8px); }
.g-memory-card { position: relative; border: 0; padding: 0; background: none; perspective: 700px; border-radius: 14px; cursor: pointer; }
.g-memory-card:focus-visible { outline: 3px solid ${C}; outline-offset: 3px; }
.g-memory-inner { position: absolute; inset: 0; transform-style: preserve-3d; transition: transform .46s cubic-bezier(.3, 1.35, .5, 1); }
.g-memory-card.up .g-memory-inner { transform: rotateY(180deg); }
.g-memory-face { position: absolute; inset: 0; border-radius: 14px; backface-visibility: hidden; -webkit-backface-visibility: hidden; display: grid; place-items: center; overflow: hidden; }
.g-memory-back { background: radial-gradient(rgba(239,91,111,.2) 1.6px, transparent 2.2px) 0 0 / 13px 13px, linear-gradient(160deg, #fffaf3, #ffe2d6); border: 3px solid #fff; box-shadow: 0 4px 10px rgba(52, 40, 70, .16), inset 0 0 0 2px rgba(239,91,111,.22), inset 0 -4px 0 rgba(150,60,60,.08); }
.g-memory-emblem { width: 42%; aspect-ratio: 1; border-radius: 26%; background: linear-gradient(160deg, #ff8fa3, ${C}); transform: rotate(45deg); display: grid; place-items: center; box-shadow: 0 2px 6px rgba(150, 30, 60, .25); }
.g-memory-emblem svg { width: 62%; height: 62%; transform: rotate(-45deg); color: #fff; }
.g-memory-front { transform: rotateY(180deg); background: radial-gradient(circle at 30% 22%, rgba(255,255,255,.5), transparent 58%), var(--pc); border: 3px solid #fff; box-shadow: 0 4px 10px rgba(52, 40, 70, .18), inset 0 -5px 0 rgba(0,0,0,.12); }
.g-memory-plate { width: 78%; aspect-ratio: 1; max-height: 78%; border-radius: 50%; background: rgba(255,255,255,.2); display: grid; place-items: center; }
.g-memory-plate svg { width: 74%; height: 74%; filter: drop-shadow(0 2px 0 rgba(0,0,0,.16)); }
.g-memory-card.done .g-memory-front { box-shadow: 0 0 0 3px #ffd166, 0 6px 14px rgba(255, 180, 60, .45), inset 0 -5px 0 rgba(0,0,0,.12); }
.g-memory-card.done .g-memory-inner { animation: g-memory-pop .5s cubic-bezier(.3, 1.6, .5, 1) .25s; }
.g-memory-check { position: absolute; right: 6%; top: 6%; width: 22%; aspect-ratio: 1; border-radius: 50%; background: #ffd166; color: #6b4a00; display: none; place-items: center; }
.g-memory-check svg { width: 70%; height: 70%; }
.g-memory-card.done .g-memory-check { display: grid; }
@keyframes g-memory-pop { 40% { transform: rotateY(180deg) scale(1.1); } 100% { transform: rotateY(180deg) scale(1); } }
.g-memory-side { flex: none; display: flex; flex-direction: column; justify-content: center; gap: 8px; width: clamp(150px, 17vw, 220px); }
.g-memory-player { display: flex; align-items: center; gap: 8px; background: var(--paper); border-radius: 18px; padding: 6px 10px 6px 6px; box-shadow: 0 3px 10px rgba(52, 40, 70, .1); transition: box-shadow .2s, transform .2s; }
.g-memory-player.on { box-shadow: 0 0 0 3px ${C}, 0 6px 16px rgba(239, 91, 111, .25); transform: scale(1.03); }
.g-memory-player .avatar { flex: none; }
.g-memory-pname { font-weight: 600; font-size: .95rem; line-height: 1.1; }
.g-memory-pscore { font-size: .8rem; color: var(--ink-soft); }
.g-memory-pscore b { font-size: 1.15rem; color: var(--ink); }
.g-memory-turn { text-align: center; font-weight: 600; color: ${C}; font-size: .95rem; min-height: 1.2em; }
.g-memory-stats { background: var(--paper); border-radius: 18px; padding: 8px 12px; box-shadow: 0 3px 10px rgba(52, 40, 70, .1); display: grid; gap: 2px; font-size: .9rem; color: var(--ink-soft); }
.g-memory-stats b { color: var(--ink); font-size: 1.05rem; }
.g-memory-intro { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(59, 43, 63, .3); padding: 10px; z-index: 2; }
.g-memory-intro.hidden { display: none; }
.g-memory-ic { background: var(--paper); border-radius: 24px; padding: 16px 22px; box-shadow: var(--shadow); text-align: center; width: min(620px, 100%); }
.g-memory-ic h3 { margin: 4px 0 2px; font-size: 1.4rem; }
.g-memory-ic p { margin: 0 0 12px; color: var(--ink-soft); font-size: .95rem; }
.g-memory-faces { display: flex; justify-content: center; gap: 4px; }
.g-memory-modes { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.g-memory-modes .btn { min-height: 48px; }
.g-memory-best { margin-top: 10px; font-size: .85rem; color: var(--ink-soft); }
`;

function injectStyle() {
  if (document.getElementById('style-g-' + ID)) return;
  const s = document.createElement('style');
  s.id = 'style-g-' + ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default {
  id: ID,
  start(stage, api) {
    injectStyle();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.createElement('div');
    root.className = 'g-memory-root';
    root.innerHTML = `
      <div class="g-memory-board" role="grid" aria-label="Cards"></div>
      <div class="g-memory-side"></div>
      <div class="g-memory-intro">
        <div class="g-memory-ic">
          <div class="g-memory-faces">${api.avatar(api.me, 48)}${api.avatar(api.partner, 48)}</div>
          <h3>Memory Match</h3>
          <p>Flip two cards. Same picture? Keep them. Find every pair.</p>
          <div class="g-memory-modes">
            <button class="btn primary" style="--c:${C}" data-mode="solo">Just me</button>
            <button class="btn" data-mode="cpu">Play with ${api.partner.name} (computer)</button>
            <button class="btn" data-mode="duo">Two players on this device</button>
          </div>
          <div class="g-memory-best"></div>
        </div>
      </div>`;
    stage.appendChild(root);
    const $ = (s) => root.querySelector(s);
    const board = $('.g-memory-board');
    const side = $('.g-memory-side');
    const intro = $('.g-memory-intro');

    const timers = new Set();
    const later = (fn, ms) => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };
    let clock = 0;

    // Room for the cards: the stage minus padding, the side panel and the gap.
    function boardRoom() {
      const r = stage.getBoundingClientRect();
      return { width: Math.max(0, r.width - 24 - 18 - side.offsetWidth), height: Math.max(0, r.height - 16) };
    }
    // Deck size depends on the shape of that room: 6x3 on a wide, short phone, 4x4 elsewhere.
    const a0 = boardRoom();
    const pairs = a0.width / Math.max(1, a0.height) >= 1.7 ? 9 : 8;
    const bestKey = `best-${pairs * 2}`;
    let best = api.load(bestKey, null);
    $('.g-memory-best').textContent = best ? `Best solo: ${best.moves} moves in ${fmt(best.time)}` : `${pairs} pairs to find`;

    let mode = null;
    let players = [];
    let turn = 0;
    let scores = [0, 0];
    let deck = [];
    let cards = [];
    let first = -1;
    let lock = false;
    let moves = 0;
    let found = 0;
    let t0 = 0;
    let elapsed = 0;
    let over = false;
    let cols = 4;
    const memory = new Map(); // computer's memory: card index -> picture index

    function buildDeck() {
      deck = shuffle([...Array(pairs).keys(), ...Array(pairs).keys()]);
      board.innerHTML = deck
        .map((p, i) => {
          const pic = PICS[p];
          return `<button class="g-memory-card" data-i="${i}" role="gridcell" aria-label="Card ${i + 1}, face down">
            <span class="g-memory-inner">
              <span class="g-memory-face g-memory-back"><span class="g-memory-emblem"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS.heart}" fill="currentColor"/></svg></span></span>
              <span class="g-memory-face g-memory-front" style="--pc:${pic.c}"><span class="g-memory-plate">${picSvg(pic)}</span>
                <span class="g-memory-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS.check}"/></svg></span></span>
            </span></button>`;
        })
        .join('');
      cards = [...board.children];
    }

    function layout() {
      const r = boardRoom();
      if (!r.width || !r.height) return;
      const n = pairs * 2;
      const gap = clamp(Math.round(Math.min(r.width, r.height) * 0.02), 6, 12);
      const ASPECT = 0.8;
      let bestW = 0;
      let bestCols = 4;
      for (let c = 2; c <= n; c++) {
        if (n % c) continue;
        const rows = n / c;
        const w = Math.min((r.width - gap * (c - 1)) / c, ((r.height - gap * (rows - 1)) / rows) * ASPECT);
        if (w > bestW) {
          bestW = w;
          bestCols = c;
        }
      }
      cols = bestCols;
      const w = Math.floor(Math.min(bestW, 170));
      board.style.setProperty('--gap', gap + 'px');
      board.style.gridTemplateColumns = `repeat(${cols}, ${w}px)`;
      board.style.gridAutoRows = Math.floor(w / ASPECT) + 'px';
    }

    function renderSide() {
      const av = clamp(Math.round(boardRoom().height * 0.13), 36, 56);
      if (mode === 'solo') {
        side.innerHTML = `
          <div class="g-memory-player on">${api.avatar(api.me, av)}<div><div class="g-memory-pname">${api.me.name}</div><div class="g-memory-pscore"><b>${found}</b> of ${pairs} pairs</div></div></div>
          <div class="g-memory-stats"><span>Moves <b>${moves}</b></span><span>Time <b>${fmt(elapsed)}</b></span>${best ? `<span>Best ${best.moves} moves</span>` : ''}</div>`;
        api.setScore(`${moves} moves  ${fmt(elapsed)}`);
      } else {
        const who = players[turn];
        side.innerHTML =
          players
            .map(
              (p, k) =>
                `<div class="g-memory-player ${k === turn && !over ? 'on' : ''}">${api.avatar(p, av)}<div><div class="g-memory-pname">${p.name}${mode === 'cpu' && k === 1 ? ' <small style="color:var(--ink-soft);font-weight:500">(computer)</small>' : ''}</div><div class="g-memory-pscore"><b>${scores[k]}</b> pair${scores[k] === 1 ? '' : 's'}</div></div></div>`,
            )
            .join('') + `<div class="g-memory-turn">${over ? '' : `${who.name}'s turn`}</div>`;
        api.setScore(`${players[0].name} ${scores[0]} : ${scores[1]} ${players[1].name}`);
      }
    }

    function begin(m) {
      mode = m;
      players = m === 'solo' ? [api.me] : [api.me, api.partner];
      intro.classList.add('hidden');
      api.sfx('tap');
      buildDeck();
      layout();
      renderSide();
      cards[0]?.focus();
    }
    intro.addEventListener('click', (e) => {
      const b = e.target.closest('[data-mode]');
      if (b) begin(b.dataset.mode);
    });
    intro.querySelector('[data-mode]').focus();

    const cpuTurn = () => mode === 'cpu' && turn === 1;

    function reveal(i) {
      const el = cards[i];
      el.classList.add('up');
      el.setAttribute('aria-label', `Card ${i + 1}, ${PICS[deck[i]].name}`);
      if (mode === 'cpu' && Math.random() < AI_RECALL) memory.set(i, deck[i]);
    }
    function hide(i) {
      const el = cards[i];
      el.classList.remove('up');
      el.setAttribute('aria-label', `Card ${i + 1}, face down`);
    }
    const isOpen = (i) => cards[i].classList.contains('up') || cards[i].classList.contains('done');

    function flip(i) {
      if (lock || over || isOpen(i)) return;
      if (!t0) {
        t0 = performance.now();
        clock = setInterval(() => {
          elapsed = (performance.now() - t0) / 1000;
          if (mode === 'solo') renderSideStats();
        }, 250);
      }
      reveal(i);
      api.sfx('swoosh');
      if (first < 0) {
        first = i;
        return;
      }
      const a = first;
      const b = i;
      first = -1;
      moves++;
      lock = true;
      if (mode === 'solo') renderSideStats();
      const flipMs = reduce ? 80 : 480;
      if (deck[a] === deck[b]) {
        later(() => {
          cards[a].classList.add('done');
          cards[b].classList.add('done');
          cards[a].setAttribute('aria-label', `Card ${a + 1}, ${PICS[deck[a]].name}, matched`);
          cards[b].setAttribute('aria-label', `Card ${b + 1}, ${PICS[deck[b]].name}, matched`);
          memory.delete(a);
          memory.delete(b);
          found++;
          scores[turn]++;
          api.sfx('good');
          lock = false;
          renderSide();
          if (found === pairs) later(end, reduce ? 200 : 900);
          else if (cpuTurn()) later(cpuMove, 700);
        }, flipMs);
      } else {
        later(() => {
          api.sfx('tap');
          later(() => {
            hide(a);
            hide(b);
            lock = false;
            if (mode !== 'solo') {
              turn = 1 - turn;
              if (mode === 'cpu') for (const k of [...memory.keys()]) if (Math.random() < AI_FORGET) memory.delete(k);
            }
            renderSide();
            if (cpuTurn()) later(cpuMove, 650);
          }, reduce ? 500 : 650);
        }, flipMs);
      }
    }
    function renderSideStats() {
      const st = side.querySelector('.g-memory-stats');
      if (!st) return;
      st.children[0].innerHTML = `Moves <b>${moves}</b>`;
      st.children[1].innerHTML = `Time <b>${fmt(elapsed)}</b>`;
      api.setScore(`${moves} moves  ${fmt(elapsed)}`);
    }

    // The computer: uses what it remembers, otherwise guesses.
    function cpuMove() {
      if (over || !cpuTurn() || lock) return;
      const closed = cards.map((_, i) => i).filter((i) => !isOpen(i));
      if (!closed.length) return;
      const known = [...memory.entries()].filter(([i]) => !isOpen(i));
      let pair = null;
      for (let x = 0; x < known.length && !pair; x++)
        for (let y = x + 1; y < known.length; y++)
          if (known[x][1] === known[y][1]) {
            pair = [known[x][0], known[y][0]];
            break;
          }
      const unknown = closed.filter((i) => !memory.has(i));
      const pick = (list) => list[Math.floor(Math.random() * list.length)];
      let a;
      let b = null;
      if (pair && Math.random() < 0.85) [a, b] = pair;
      else a = pick(unknown.length ? unknown : closed);
      flip(a);
      later(() => {
        if (over) return;
        if (b == null) {
          const mate = [...memory.entries()].find(([i, p]) => i !== a && p === deck[a] && !isOpen(i));
          if (mate && Math.random() < 0.8) b = mate[0];
          else {
            const rest = cards.map((_, i) => i).filter((i) => !isOpen(i));
            const fresh = rest.filter((i) => !memory.has(i));
            b = pick(fresh.length ? fresh : rest);
          }
        }
        if (b != null) flip(b);
      }, 750);
    }

    function end() {
      over = true;
      clearInterval(clock);
      elapsed = (performance.now() - t0) / 1000;
      renderSide();
      if (mode === 'solo') {
        const isBest = !best || moves < best.moves || (moves === best.moves && elapsed < best.time);
        if (isBest) {
          best = { moves, time: Math.round(elapsed) };
          api.save(bestKey, best);
        }
        api.finish({
          win: true,
          title: 'All pairs found!',
          text: `${moves} moves in ${fmt(elapsed)}. ${isBest ? 'New best!' : `Best: ${best.moves} moves in ${fmt(best.time)}.`}`,
        });
        return;
      }
      const [s0, s1] = scores;
      const tie = s0 === s1;
      const winner = s0 > s1 ? players[0] : players[1];
      const text = `${players[0].name} ${s0} pairs, ${players[1].name} ${s1} pairs. ${moves} moves in ${fmt(elapsed)}.`;
      if (tie) api.finish({ win: null, title: "It's a tie", text });
      else if (mode === 'cpu') api.finish({ win: s0 > s1, title: `${winner.name} wins!`, text });
      else api.finish({ win: true, title: `${winner.name} wins!`, text });
    }

    board.addEventListener('click', (e) => {
      const b = e.target.closest('.g-memory-card');
      if (!b || cpuTurn()) return;
      flip(+b.dataset.i);
    });
    board.addEventListener('keydown', (e) => {
      const b = e.target.closest('.g-memory-card');
      if (!b) return;
      const i = +b.dataset.i;
      const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key];
      if (d == null) return;
      e.preventDefault();
      const j = i + d;
      if (j >= 0 && j < cards.length) cards[j].focus();
    });

    const ro = new ResizeObserver(() => {
      layout();
      if (mode) renderSide();
    });
    ro.observe(stage);

    return () => {
      ro.disconnect();
      clearInterval(clock);
      for (const id of timers) clearTimeout(id);
      timers.clear();
      root.remove();
    };
  },
};
