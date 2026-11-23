// Rock Paper Scissors, best of five (first to three round wins), against the computer or a second player on this device.
const ID = 'rps';
const C = 'g-rps-';
const PLACE = '#8b5cf6';
const KINDS = ['rock', 'paper', 'scissors'];
const NAMES = { rock: 'Rock', paper: 'Paper', scissors: 'Scissors' };
const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const VERBS = { rock: 'Rock crushes scissors', paper: 'Paper wraps rock', scissors: 'Scissors cut paper' };
const TARGET = 3;

const CSS = `
.${C}root{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--gap,14px);padding:10px 14px;font-family:var(--font);color:var(--ink);user-select:none;-webkit-user-select:none;touch-action:manipulation;--hw:220px;--av:96px;--pb:96px}
.${C}choose{display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center}
.${C}compact .${C}choose{gap:8px}
.${C}faces{display:flex;align-items:center;gap:14px}
.${C}faces .avatar{width:var(--av);height:var(--av);filter:drop-shadow(0 6px 10px rgba(52,40,70,.18))}
.${C}vs{font-weight:700;color:${PLACE};background:#fff;border-radius:999px;padding:4px 12px;box-shadow:0 2px 8px rgba(52,40,70,.1)}
.${C}choose h2{margin:0;font-size:1.5rem}
.${C}compact .${C}choose h2{font-size:1.2rem}
.${C}modes{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.${C}modes .btn{--c:${PLACE};min-height:48px}
.${C}hint{font-size:.85rem;color:var(--ink-soft)}
.${C}arena{display:flex;align-items:center;justify-content:center;gap:var(--gap,14px)}
.${C}side{display:flex;flex-direction:column;align-items:center;gap:6px;width:calc(var(--av) * 1.45);text-align:center}
.${C}side .avatar{width:var(--av);height:var(--av);border-radius:50%;transition:box-shadow .25s,transform .25s}
.${C}side.${C}on .avatar{box-shadow:0 0 0 4px #fff,0 0 0 8px var(--pc);transform:scale(1.04)}
.${C}name{font-weight:700;font-size:1.15rem;line-height:1.1}
.${C}compact .${C}name{font-size:1rem}
.${C}pips{display:flex;gap:6px}
.${C}pip{width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:inset 0 0 0 2.5px var(--pc);transition:background .3s,transform .3s}
.${C}pip.${C}got{background:var(--pc);transform:scale(1.15)}
.${C}compact .${C}pip{width:11px;height:11px}
.${C}hands{display:flex;align-items:center;gap:6px}
.${C}hand{width:var(--hw);height:calc(var(--hw) * .77);position:relative;transition:opacity .3s,filter .3s}
.${C}hand svg{width:100%;height:100%;overflow:visible;display:block}
.${C}L{transform-origin:12% 55%;--rot:-12deg}
.${C}R{transform-origin:88% 55%;--rot:12deg}
.${C}idle{animation:${C}idle 2.4s ease-in-out infinite}
.${C}R.${C}idle{animation-delay:-1.2s}
@keyframes ${C}idle{50%{transform:translateY(-4%) rotate(calc(var(--rot) * .25))}}
.${C}shake{animation:${C}shake var(--step,.38s) ease-in-out 3}
@keyframes ${C}shake{0%,100%{transform:translateY(0) rotate(0)}45%{transform:translateY(-18%) rotate(var(--rot))}}
.${C}pop{animation:${C}pop .45s cubic-bezier(.3,1.7,.5,1)}
@keyframes ${C}pop{0%{transform:scale(.55)}100%{transform:scale(1)}}
.${C}won{animation:${C}won .7s cubic-bezier(.3,1.6,.5,1)}
@keyframes ${C}won{40%{transform:scale(1.14) rotate(calc(var(--rot) * -.4))}100%{transform:scale(1)}}
.${C}lost{opacity:.5;filter:saturate(.4)}
.${C}mid{width:calc(var(--hw) * .42);display:grid;place-items:center;min-height:2em}
.${C}word{display:inline-block;font-weight:700;font-size:max(1.1rem, calc(var(--hw) * .12));color:${PLACE};white-space:nowrap;background:#fff;padding:.15em .55em;border-radius:999px;box-shadow:0 3px 10px rgba(52,40,70,.12)}
.${C}bump{animation:${C}bump .3s cubic-bezier(.3,1.7,.5,1)}
@keyframes ${C}bump{0%{transform:scale(.6)}100%{transform:scale(1)}}
.${C}msg{font-weight:600;font-size:1.15rem;min-height:1.45em;line-height:1.45;text-align:center;white-space:nowrap}
.${C}compact .${C}msg{font-size:1rem}
.${C}picks{display:flex;gap:14px}
.${C}pick{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;width:calc(var(--pb) * 1.55);height:var(--pb);border:0;border-radius:22px;background:#fff;color:var(--ink);font:600 1rem var(--font);box-shadow:inset 0 -4px 0 rgba(59,43,63,.08),0 6px 16px rgba(52,40,70,.12);cursor:pointer;transition:transform .15s,opacity .2s,box-shadow .15s;padding:4px}
.${C}compact .${C}pick{border-radius:18px;font-size:.9rem}
.${C}pick svg{width:auto;height:62%;overflow:visible}
.${C}pick:hover:not(:disabled){transform:translateY(-3px);box-shadow:inset 0 -4px 0 rgba(59,43,63,.08),0 0 0 3px ${PLACE},0 8px 18px rgba(52,40,70,.14)}
.${C}pick:focus-visible{outline:3px solid ${PLACE};outline-offset:3px}
.${C}pick:disabled{opacity:.45;cursor:default}
.${C}pick.${C}chosen{box-shadow:inset 0 -4px 0 rgba(59,43,63,.08),0 0 0 4px ${PLACE};opacity:1}
.${C}pick kbd{position:absolute;top:6px;left:8px;font-size:.7em}
.${C}pass{position:absolute;inset:0;display:grid;place-items:center;background:rgba(255,247,238,.94);z-index:3}
.${C}passcard{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;background:var(--paper);padding:20px 30px;border-radius:26px;box-shadow:var(--shadow);animation:${C}pop .35s cubic-bezier(.3,1.5,.5,1)}
.${C}compact .${C}passcard{gap:6px;padding:14px 24px}
.${C}passcard .avatar{width:var(--av);height:var(--av)}
.${C}passcard h3{margin:0;font-size:1.5rem}
.${C}compact .${C}passcard h3{font-size:1.25rem}
.${C}passcard p{margin:0;color:var(--ink-soft)}
.${C}passcard .btn{--c:var(--pc);min-height:48px}
@media (prefers-reduced-motion: reduce){.${C}idle,.${C}shake,.${C}won,.${C}pop,.${C}bump,.${C}passcard{animation:none}}
`;

function injectStyle() {
  if (document.getElementById('style-g-' + ID)) return;
  const s = document.createElement('style');
  s.id = 'style-g-' + ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function mix(a, b, t) {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}
function shade(hex, k) {
  const n = parseInt((hex || '#f8dccb').slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c * k)));
  return '#' + ((1 << 24) | (f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
}

// A cartoon hand pointing right (wrist on the left) in a 130 x 100 box. mirror flips it to point left.
function handSvg(kind, look, mirror = false) {
  const skin = look.skin || '#f8dccb';
  const line = mix(shade(skin, 0.7), '#a5543f', 0.35);
  const top = look.top || '#ef5b6f';
  const sk = `fill="${skin}" stroke="${line}" stroke-width="3.2" stroke-linejoin="round"`;
  const r = (x, y, w, h, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2}" ${sk} ${extra}/>`;
  const sleeve = `<rect x="-6" y="27" width="38" height="46" rx="12" fill="${top}"/><rect x="22" y="24" width="13" height="52" rx="6.5" fill="${shade(top, 0.82)}"/>`;
  let body = '';
  if (kind === 'rock') {
    body =
      `<rect x="30" y="20" width="54" height="60" rx="24" ${sk}/>` +
      [19, 34, 49, 64].map((y) => r(64, y, 30, 16)).join('') +
      r(42, 27, 44, 15) +
      `<ellipse cx="46" cy="62" rx="6" ry="4" fill="#ff8fa0" opacity=".35"/>`;
  } else if (kind === 'paper') {
    const fingers = [
      [25, 54, -9],
      [38, 58, -3],
      [51, 55, 3],
      [64, 46, 9],
    ];
    body =
      fingers.map(([y, w, a]) => r(60, y, w, 13, `transform="rotate(${a} 62 ${y + 6.5})"`)).join('') +
      r(42, 4, 14, 36, 'transform="rotate(40 49 38)"') +
      `<rect x="30" y="24" width="50" height="54" rx="21" ${sk}/>` +
      `<ellipse cx="48" cy="60" rx="6" ry="4" fill="#ff8fa0" opacity=".35"/>`;
  } else {
    body =
      r(58, 19, 60, 13, 'transform="rotate(-15 62 25.5)"') +
      r(58, 34, 58, 13, 'transform="rotate(6 62 40.5)"') +
      `<rect x="30" y="21" width="52" height="59" rx="23" ${sk}/>` +
      r(62, 49, 28, 16) +
      r(62, 64, 26, 16) +
      r(42, 50, 38, 14) +
      `<ellipse cx="46" cy="34" rx="6" ry="4" fill="#ff8fa0" opacity=".35"/>`;
  }
  const g = mirror ? `<g transform="translate(130 0) scale(-1 1)">${sleeve}${body}</g>` : sleeve + body;
  return `<svg viewBox="0 0 130 100" aria-hidden="true">${g}</svg>`;
}

export default {
  id: ID,
  start(stage, api) {
    injectStyle();
    const me = api.me;
    const pa = api.partner;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    let picker = 'me';
    let choice = { me: null, pa: null };
    const score = { me: 0, pa: 0 };
    let round = 0;
    let els = null;
    const tally = api.load('tally', { me: 0, partner: 0 });
    const look = { me, pa };
    const color = { me: me.top || '#ef5b6f', pa: pa.top || '#3f7bf0' };
    const showScore = () => api.setScore(`${me.name} ${score.me} - ${score.pa} ${pa.name}`);

    const showChooser = () => {
      root.innerHTML = `<div class="${C}choose">
        <div class="${C}faces">${api.avatar(me, 96)}<span class="${C}vs">vs</span>${api.avatar(pa, 96)}</div>
        <h2>Best of five. Who is playing ${esc(pa.name)}?</h2>
        <div class="${C}modes">
          <button class="btn primary big" data-mode="cpu">Play with ${esc(pa.name)} (computer)</button>
          <button class="btn big" data-mode="duo">Two players on this device</button>
        </div>
        ${api.isTouch ? '' : `<div class="${C}hint">Press <kbd>1</kbd> or <kbd>2</kbd></div>`}
      </div>`;
      root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.mode)));
      root.querySelector(`[data-mode="${mode}"]`)?.focus({ preventScroll: true });
    };

    const side = (who) => `<div class="${C}side" data-side="${who}" style="--pc:${color[who]}">
        ${api.avatar(look[who], 96)}
        <div class="${C}name">${esc(look[who].name)}</div>
        <div class="${C}pips">${Array.from({ length: TARGET }, () => `<i class="${C}pip"></i>`).join('')}</div>
      </div>`;

    const choose = (m) => {
      if (state !== 'choose') return;
      mode = m;
      api.save('mode', m);
      api.sfx('tap');
      const keys = !api.isTouch;
      root.innerHTML = `
        <div class="${C}arena">
          ${side('me')}
          <div class="${C}hands">
            <div class="${C}hand ${C}L" data-hand="me"></div>
            <div class="${C}mid"><span class="${C}word">vs</span></div>
            <div class="${C}hand ${C}R" data-hand="pa"></div>
          </div>
          ${side('pa')}
        </div>
        <div class="${C}msg" aria-live="polite"></div>
        <div class="${C}picks">${KINDS.map(
          (k, i) => `<button class="${C}pick" data-k="${k}" aria-label="${NAMES[k]}">${handSvg(k, me)}<span>${NAMES[k]}</span>${keys ? `<kbd>${i + 1}</kbd>` : ''}</button>`
        ).join('')}</div>`;
      els = {
        arena: root.querySelector(`.${C}arena`),
        msg: root.querySelector(`.${C}msg`),
        word: root.querySelector(`.${C}word`),
        hands: { me: root.querySelector('[data-hand="me"]'), pa: root.querySelector('[data-hand="pa"]') },
        sides: { me: root.querySelector('[data-side="me"]'), pa: root.querySelector('[data-side="pa"]') },
        picks: [...root.querySelectorAll(`.${C}pick`)],
      };
      els.picks.forEach((b) => b.addEventListener('click', () => onPick(b.dataset.k)));
      layout();
      showScore();
      startRound();
    };

    const setHand = (who, kind, cls = '') => {
      const h = els.hands[who];
      h.className = `${C}hand ${who === 'me' ? C + 'L' : C + 'R'} ${cls}`;
      h.innerHTML = handSvg(kind, look[who], who === 'pa');
    };

    const setWord = (text) => {
      els.word.textContent = text;
      els.word.classList.remove(C + 'bump');
      void els.word.offsetWidth;
      els.word.classList.add(C + 'bump');
    };

    const setPicks = (enabled, forWho = 'me') => {
      els.picks.forEach((b) => {
        b.disabled = !enabled;
        b.classList.remove(C + 'chosen');
        b.querySelector('svg').outerHTML = handSvg(b.dataset.k, look[forWho]);
      });
      if (enabled && !api.isTouch) els.picks[0].focus({ preventScroll: true });
    };

    const highlight = (who) => {
      for (const s of ['me', 'pa']) els.sides[s].classList.toggle(C + 'on', s === who);
    };

    const startRound = () => {
      round++;
      choice = { me: null, pa: null };
      setHand('me', 'rock', C + 'idle');
      setHand('pa', 'rock', C + 'idle');
      els.word.textContent = 'vs';
      picker = 'me';
      state = 'pick';
      highlight('me');
      setPicks(true, 'me');
      els.msg.textContent = mode === 'cpu' ? `Round ${round}. Pick your hand, ${me.name}!` : `${me.name}, pick in secret. ${pa.name}, no peeking!`;
    };

    const onPick = (k) => {
      if (state !== 'pick' || !KINDS.includes(k)) return;
      api.sfx('tap');
      choice[picker] = k;
      if (mode === 'cpu') {
        choice.pa = pick(KINDS);
        els.picks.find((b) => b.dataset.k === k)?.classList.add(C + 'chosen');
        shoot();
      } else if (picker === 'me') {
        showPass();
      } else {
        shoot();
      }
    };

    const showPass = () => {
      state = 'pass';
      setPicks(false);
      const pass = document.createElement('div');
      pass.className = C + 'pass';
      pass.innerHTML = `<div class="${C}passcard" style="--pc:${color.pa}">
          ${api.avatar(pa, 96)}
          <h3>Pass to ${esc(pa.name)}</h3>
          <p>${esc(me.name)} has picked. ${esc(pa.name)}, your turn to pick in secret.</p>
          <button class="btn primary big">I'm ${esc(pa.name)}, ready</button>
        </div>`;
      root.appendChild(pass);
      const btn = pass.querySelector('button');
      btn.focus({ preventScroll: true });
      btn.addEventListener('click', () => {
        if (state !== 'pass') return;
        api.sfx('tap');
        pass.remove();
        picker = 'pa';
        state = 'pick';
        highlight('pa');
        setPicks(true, 'pa');
        els.msg.textContent = `${pa.name}, pick in secret. ${me.name}, no peeking!`;
      });
    };

    const shoot = () => {
      state = 'shoot';
      setPicks(false);
      if (mode === 'cpu') els.picks.find((b) => b.dataset.k === choice.me)?.classList.add(C + 'chosen');
      highlight(null);
      els.msg.textContent = 'Get ready...';
      const step = reduce ? 240 : 400;
      const words = ['Rock', 'Paper', 'Scissors', 'Shoot!'];
      const shakeCls = reduce ? '' : C + 'shake';
      setHand('me', 'rock', shakeCls);
      setHand('pa', 'rock', shakeCls);
      els.hands.me.style.setProperty('--step', step + 'ms');
      els.hands.pa.style.setProperty('--step', step + 'ms');
      words.forEach((w, i) =>
        after(i * step, () => {
          setWord(w);
          api.sfx(i === 3 ? 'swoosh' : 'tick');
          if (i === 3) reveal();
        })
      );
    };

    const reveal = () => {
      setHand('me', choice.me, C + 'pop');
      setHand('pa', choice.pa, C + 'pop');
      after(reduce ? 250 : 550, resolve);
    };

    const resolve = () => {
      const a = choice.me;
      const b = choice.pa;
      if (a === b) {
        els.msg.textContent = `Both picked ${NAMES[a].toLowerCase()}. Go again!`;
        setWord('Tie');
        api.sfx('tick');
        after(1500, startRound);
        return;
      }
      const winner = BEATS[a] === b ? 'me' : 'pa';
      const loser = winner === 'me' ? 'pa' : 'me';
      score[winner]++;
      showScore();
      els.sides[winner].querySelectorAll(`.${C}pip`)[score[winner] - 1]?.classList.add(C + 'got');
      setHand(winner, choice[winner], reduce ? '' : C + 'won');
      els.hands[loser].classList.add(C + 'lost');
      highlight(winner);
      setWord(winner === 'me' ? `${me.name}!` : `${pa.name}!`);
      els.msg.textContent = `${VERBS[choice[winner]]}. ${look[winner].name} wins the round!`;
      api.sfx(mode === 'cpu' && winner === 'pa' ? 'bad' : 'good');
      if (score[winner] >= TARGET) {
        state = 'over';
        if (winner === 'me') tally.me++;
        else tally.partner++;
        api.save('tally', tally);
        after(1400, () => {
          state = 'done';
          const w = look[winner];
          const l = look[loser];
          api.finish({
            win: winner === 'me',
            title: `${w.name} wins!`,
            text: `${w.name} beat ${l.name} ${score[winner]} - ${score[loser]}. Matches so far: ${me.name} ${tally.me}, ${pa.name} ${tally.partner}.`,
          });
        });
      } else {
        after(1700, startRound);
      }
    };

    const layout = () => {
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      if (!W || !H) return;
      const compact = H < 480 || W < 760;
      root.classList.toggle(C + 'compact', compact);
      const av = compact ? Math.round(Math.max(44, Math.min(66, H * 0.2))) : Math.round(Math.min(110, H * 0.15));
      const pb = compact ? Math.round(Math.max(52, Math.min(66, H * 0.19))) : Math.round(Math.min(116, H * 0.15));
      const gap = compact ? 8 : 18;
      const msgH = compact ? 24 : 34;
      const sideW = av * 1.45;
      const availH = H - 20 - pb - msgH - gap * 2;
      const byH = (availH / 0.77) * 0.86;
      const byW = (W - 28 - sideW * 2 - gap * 2 - 12) / 2.5;
      const hw = Math.floor(Math.max(90, Math.min(byH, byW, 330)));
      root.style.setProperty('--av', av + 'px');
      root.style.setProperty('--pb', pb + 'px');
      root.style.setProperty('--gap', gap + 'px');
      root.style.setProperty('--hw', hw + 'px');
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
      if (state !== 'pick') return;
      const k = { 1: 'rock', 2: 'paper', 3: 'scissors', r: 'rock', p: 'paper', s: 'scissors' }[e.key.toLowerCase()];
      if (k) {
        e.preventDefault();
        onPick(k);
        return;
      }
      const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (d) {
        e.preventDefault();
        const i = els.picks.indexOf(document.activeElement);
        els.picks[Math.max(0, Math.min(2, i < 0 ? 0 : i + d))].focus();
      }
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
