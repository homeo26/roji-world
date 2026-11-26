import { svgIcon, ICONS } from './icons.js';
import { STOPS } from './config.js';
import { avatar } from './games/avatar.js';
import { EMOTES } from './kid.js';
import { HAIRSTYLES, HAIRSTYLE_NAMES, OUTFITS_BY, OUTFIT_NAMES, PALETTE, DEFAULT_LOOKS } from './looks.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ------------------------------------------------------------------ notes
const NOTES_KEY = 'roji-weekends-notes-v1';
export function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}');
  } catch {
    return {};
  }
}
function saveNote(id, text) {
  const all = loadNotes();
  if (text.trim()) all[id] = { text, updated: Date.now() };
  else delete all[id];
  localStorage.setItem(NOTES_KEY, JSON.stringify(all));
}

// Dance icons on the 24x24 grid (registered into ICONS below so svgIcon can draw them)
const ring = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const DANCE_ICONS = {
  dabke: `${ring(5, 5.5, 2)} ${ring(12, 5.5, 2)} ${ring(19, 5.5, 2)} M5 8.5v5.5 M12 8.5v5.5 M19 8.5v5.5 M5 11h14 M5 14l-1.8 5.5 M5 14l2 3 M12 14l-2 3 M12 14l1.8 5.5 M19 14l-2 3 M19 14l1.8 5.5`,
  slow: `${ring(8, 11, 2.6)} ${ring(16, 11, 2.6)} M3.5 21c0-3 2-4.6 4.5-4.6s4 1 4 1 1.5-1 4-1 4.5 1.6 4.5 4.6 M12 6.6s-2.6-1.6-2.6-3.3a1.4 1.4 0 0 1 2.6-.7 1.4 1.4 0 0 1 2.6.7c0 1.7-2.6 3.3-2.6 3.3z`,
  twirl: 'M12 12a1.2 1.2 0 1 1 1.2 1.2 3.4 3.4 0 1 1 2.2-3 5.6 5.6 0 1 1-8.6-1.2 7.8 7.8 0 1 1 1.6 10.6',
  robot: 'M6.5 8h11A1.5 1.5 0 0 1 19 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5v-8A1.5 1.5 0 0 1 6.5 8z M12 8V5 M12 3.5h.01 M9.5 12.2h.01 M14.5 12.2h.01 M9.5 15.6h5 M2.5 12v3 M21.5 12v3',
  salsa: `${ring(8, 7.5, 3.6)} M10.3 10.3 16 20.5 ${ring(17, 6.2, 3)} M15.2 8.7 12.4 13 M4 15.5l-1.5 1 M5.5 18.5l-1 1.5 M21 12.5l1 1.2`,
  moonwalk: 'M2.5 16.5c3.5 2.2 15.5 2.2 19 0 M6.5 16l1-6.5C7.8 7.4 9.5 6 12 6s4.2 1.4 4.5 3.5l1 6.5 M7.3 12.5c2.8.8 6.6.8 9.4 0',
  hop: `M10.2 9.6 7.7 4.3a1.5 1.5 0 0 1 2.7-1.2l1.6 5.6 M14.4 8.8l1.7-5.7a1.5 1.5 0 0 1 2.7 1.2l-2.5 5.4 ${ring(12.5, 14.6, 5.4)} M10.6 13.9h.01 M14.4 13.9h.01 M11.5 16.6c.7.5 1.3.5 2 0`,
  shimmy: 'M3 8l3-2.2 3 2.2 3-2.2 3 2.2 3-2.2 3 2.2 M3 13l3-2.2 3 2.2 3-2.2 3 2.2 3-2.2 3 2.2 M7 19h10',
  ballet: `${ring(12, 3.8, 2)} M12 6v5.5 M12 8.2 7.5 5 M12 8.2l4.5-3.2 M5.5 13.5c2.4-2.2 10.6-2.2 13 0-2.4 1.6-10.6 1.6-13 0z M11 14.5 10 21 M13.2 14.5l3.3 5.6`,
  jazz: 'M8 13V7.5a1.5 1.5 0 0 1 3 0V11 M11 10V6a1.5 1.5 0 0 1 3 0v4 M14 10.5V7.5a1.5 1.5 0 0 1 3 0V13 M17 11.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-4.8-2.4L4.6 15.6a1.5 1.5 0 0 1 2.3-1.9L8 15 M4 3.5l1.3 1.6 M2.5 8.5h2 M9.5 2v1.8 M20.5 4.5l-1.4 1.3',
  'dance-more': 'M5 5h4v4H5z M15 5h4v4h-4z M5 15h4v4H5z M15 15h4v4h-4z',
};
Object.assign(ICONS, DANCE_ICONS);
// Play together: two phones and a heart, sharing and copying the room link
Object.assign(ICONS, {
  together: 'M4 4.5h4.5A1.5 1.5 0 0 1 10 6v12a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 18V6A1.5 1.5 0 0 1 4 4.5z M15.5 4.5H20A1.5 1.5 0 0 1 21.5 6v12a1.5 1.5 0 0 1-1.5 1.5h-4.5A1.5 1.5 0 0 1 14 18V6a1.5 1.5 0 0 1 1.5-1.5z M5.6 16.5h1.3 M17.1 16.5h1.3 M12 13.6s-1.7-1.1-1.7-2.3a.85.85 0 0 1 1.7-.4.85.85 0 0 1 1.7.4c0 1.2-1.7 2.3-1.7 2.3z',
  share: 'M12 3.5v11 M8 7.5l4-4 4 4 M5.5 12v6.5A1.5 1.5 0 0 0 7 20h10a1.5 1.5 0 0 0 1.5-1.5V12',
  copy: 'M9 8.5h9a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H9A1.5 1.5 0 0 1 7.5 19v-9A1.5 1.5 0 0 1 9 8.5z M15.5 8.5V5A1.5 1.5 0 0 0 14 3.5H5A1.5 1.5 0 0 0 3.5 5v9A1.5 1.5 0 0 0 5 15.5h2.5',
});
const EMOTE_ICONS = { wave: 'hand', dance: 'music', spin: 'spin', cheer: 'star', heart: 'heart', bow: 'smile', ...Object.fromEntries(Object.keys(DANCE_ICONS).map((k) => [k, k])) };
const EMOTE_KEY = (i) => (i < 9 ? String(i + 1) : i === 9 ? '0' : '');
const DOCK_MOVES = 6; // the first moves sit on the dock; the More button opens every move

export class UI {
  constructor(h) {
    this.h = h; // handlers from main.js
    this.card = $('card');
    this.toastEl = $('toast');
    this.journey = $('journey');
    this.count = $('count');
    this.help = $('help');
    this.prompt = $('prompt');
    this.current = null;
    this.touch = matchMedia('(pointer: coarse)').matches;
    document.body.classList.toggle('touch', this.touch);

    // Journey strip
    this.chips = {};
    STOPS.filter((s) => s.week).forEach((stop, i, all) => {
      const li = document.createElement('li');
      li.innerHTML = `<button class="chip" style="--c:${stop.color}" title="Weekend ${stop.week}: ${esc(stop.title)}" aria-label="Weekend ${stop.week}: ${esc(stop.title)}">
        <span class="chip-icon">${svgIcon(stop.icon, 18)}</span><span class="chip-check">${svgIcon('check', 14, 3)}</span><span class="chip-n">${stop.week}</span></button>`;
      li.querySelector('button').addEventListener('click', () => h.onTravel(stop.id));
      this.journey.appendChild(li);
      if (i < all.length - 1) {
        const dash = document.createElement('li');
        dash.className = 'dash';
        dash.setAttribute('aria-hidden', 'true');
        this.journey.appendChild(dash);
      }
      this.chips[stop.id] = li.querySelector('button');
    });

    // HUD buttons
    this.soundBtn = $('btn-sound');
    this.soundBtn.addEventListener('click', () => h.onToggleSound());
    $('btn-help').innerHTML = svgIcon('help', 20);
    $('btn-help').addEventListener('click', () => this.toggleHelp());
    $('btn-wardrobe').innerHTML = svgIcon('shirt', 20);
    $('btn-wardrobe').addEventListener('click', () => h.onWardrobe());
    $('btn-full').innerHTML = svgIcon('expand', 20);
    $('btn-full').addEventListener('click', () => h.onFullscreen());
    if (!(document.fullscreenEnabled || document.webkitFullscreenEnabled)) $('btn-full').hidden = true;
    $('btn-journal').innerHTML = svgIcon('book', 20);
    $('btn-journal').addEventListener('click', () => this.toggleJournal());
    $('btn-swap').addEventListener('click', () => h.onSwap());
    $('btn-online').innerHTML = svgIcon('together', 22);
    $('btn-online').addEventListener('click', () => h.onOnline());
    $('help-close').addEventListener('click', () => this.toggleHelp(false));
    $('btn-reset').addEventListener('click', () => {
      h.onReset();
      this.toggleHelp(false);
    });
    $('btn-fullscreen')?.addEventListener('click', () => h.onFullscreen());
    this.card.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (b) h.onAction(b.dataset.act);
    });
    this.prompt.addEventListener('click', () => h.onAction('auto'));

    // Dance and hand-holding dock (desktop) and the touch buttons.
    // Desktop: the first moves on the dock and a More button that opens every move in a grid.
    // Phones: the dance button opens the wheel, a two-row grid of every move.
    const dock = $('dock');
    const wheel = Object.entries(EMOTES).filter(([, v]) => v.wheel !== false);
    const tile = ([k, v], i, size) =>
      `<button class="wheel-btn${v.duo ? ' duo' : ''}" data-emote="${k}" title="${esc(v.name)}${v.duo ? ' (for two)' : ''}${EMOTE_KEY(i) ? ` (${EMOTE_KEY(i)})` : ''}">${svgIcon(EMOTE_ICONS[k] || 'music', size)}<span>${esc(v.name)}</span>${v.duo ? `<i>${svgIcon('heart', 10, 3)}</i>` : ''}${EMOTE_KEY(i) ? `<kbd>${EMOTE_KEY(i)}</kbd>` : ''}</button>`;
    const emoteHtml = wheel
      .slice(0, DOCK_MOVES)
      .map(([k, v], i) => `<button class="dock-btn" data-emote="${k}" title="${v.name} (${i + 1})" aria-label="${v.name}">${svgIcon(EMOTE_ICONS[k], 20)}<kbd>${i + 1}</kbd></button>`)
      .join('');
    dock.innerHTML = `${emoteHtml}<button class="dock-btn" id="btn-dances" title="More dances" aria-label="More dances" aria-expanded="false">${svgIcon('dance-more', 20)}<em>+${wheel.length - DOCK_MOVES}</em></button><span class="dock-sep"></span><button class="dock-btn" id="btn-hands" title="Hold hands (H)" aria-label="Hold hands">${svgIcon('hands', 20)}<kbd>H</kbd></button><button class="dock-btn" id="btn-scooter" title="Scooters (K)" aria-label="Scooters">${svgIcon('scooter', 20)}<kbd>K</kbd></button>
      <div class="dock-more hidden" role="menu" aria-label="Dances"><div class="dock-more-head"><b>Dances</b><span>${svgIcon('heart', 12, 3)} for two</span></div><div class="dock-grid">${wheel.map((e, i) => tile(e, i, 20)).join('')}</div></div>`;
    $('emote-wheel').innerHTML = wheel.map((e, i) => tile(e, i, 20)).join('');
    const more = dock.querySelector('.dock-more');
    const showMore = (on) => {
      more.classList.toggle('hidden', !on);
      $('btn-dances').classList.toggle('on', on);
      $('btn-dances').setAttribute('aria-expanded', String(on));
    };
    $('btn-dances').addEventListener('click', () => showMore(more.classList.contains('hidden')));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') showMore(false);
    });
    window.addEventListener('pointerdown', (e) => {
      if (!more.classList.contains('hidden') && !e.target.closest?.('#dock')) showMore(false);
    });
    for (const el of [dock, $('emote-wheel')]) {
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-emote]');
        if (b) {
          h.onEmote(b.dataset.emote);
          $('emote-wheel').classList.add('hidden');
          showMore(false);
        }
      });
    }
    // Touch buttons act on touch-down. The click the browser sends when the finger lifts would land on
    // whatever that press just opened (a choice card, a panel), so it is swallowed.
    const press = (fn) => (e) => {
      e.preventDefault();
      const t = performance.now();
      const eat = (ev) => {
        window.removeEventListener('click', eat, true);
        if (performance.now() - t < 800) {
          ev.stopPropagation();
          ev.preventDefault();
        }
      };
      window.addEventListener('click', eat, true);
      setTimeout(() => window.removeEventListener('click', eat, true), 900);
      fn();
    };
    $('btn-hands').addEventListener('click', () => h.onHands());
    $('btn-scooter').addEventListener('click', () => h.onScooter?.());
    $('t-scooter').innerHTML = svgIcon('scooter', 26);
    $('t-scooter').addEventListener('pointerdown', press(() => h.onScooter?.()));
    $('t-hands').innerHTML = svgIcon('hands', 26);
    $('t-hands').addEventListener('pointerdown', press(() => h.onHands()));
    $('t-emote').innerHTML = svgIcon('music', 26);
    $('t-emote').addEventListener('pointerdown', press(() => $('emote-wheel').classList.toggle('hidden')));
    $('t-jump').addEventListener('pointerdown', press(() => h.onJump()));
    $('t-action').addEventListener('pointerdown', press(() => h.onAction('auto')));

    // Panels
    $('journal').addEventListener('click', (e) => {
      if (e.target.id === 'journal') return this.toggleJournal(false); // a tap beside the book closes it
      const b = e.target.closest('[data-j]');
      if (!b) return;
      const [act, id] = b.dataset.j.split(':');
      if (act === 'go') {
        this.toggleJournal(false);
        h.onTravel(id);
      } else if (act === 'notes') this.openNotes(id);
      else if (act === 'close') this.toggleJournal(false);
      else if (act === 'next') this.turnTo(this.spread + 1);
      else if (act === 'prev') this.turnTo(this.spread - 1);
      else if (act === 'page') this.turnTo(Math.floor(Number(id) / 2));
    });
    // Arrow keys and swipes turn the pages
    window.addEventListener('keydown', (e) => {
      if ($('journal').classList.contains('hidden') || !$('notes').classList.contains('hidden')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') this.turnTo(this.spread + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') this.turnTo(this.spread - 1);
      else if (e.key === 'Home') this.turnTo(1);
      else return;
      e.preventDefault();
    });
    let swipe = null;
    $('journal').addEventListener('pointerdown', (e) => (swipe = e.target.closest('button') ? null : { x: e.clientX, y: e.clientY }));
    $('journal').addEventListener('pointerup', (e) => {
      if (!swipe) return;
      const dx = e.clientX - swipe.x;
      const dy = e.clientY - swipe.y;
      swipe = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) this.turnTo(this.spread + (dx < 0 ? 1 : -1));
    });
    $('notes').addEventListener('click', (e) => {
      if (e.target.id === 'notes' || e.target.closest('[data-n="close"]')) this.closeNotes();
    });
    $('games-menu').addEventListener('click', (e) => {
      const b = e.target.closest('[data-g]');
      if (e.target.id === 'games-menu' || b?.dataset.g === 'close') return this.closeGames();
      if (b) {
        this.closeGames();
        h.onPlay(b.dataset.g);
      }
    });
  }

  get panelOpen() {
    return ['journal', 'wardrobe', 'notes', 'games-menu', 'help', 'online'].some((id) => !$(id).classList.contains('hidden'));
  }

  closePanels() {
    this.toggleJournal(false);
    this.closeNotes();
    this.closeGames();
    this.toggleHelp(false);
    $('online').classList.add('hidden');
    $('emote-wheel').classList.add('hidden');
  }

  setSound(muted) {
    this.soundBtn.innerHTML = svgIcon(muted ? 'mute' : 'sound', 20);
    this.soundBtn.setAttribute('aria-label', muted ? 'Turn sound on' : 'Turn sound off');
  }

  setPlayer(me, other) {
    $('btn-swap').innerHTML = avatar(other, 34);
    $('btn-swap').title = `Play as ${other.name}`;
    $('btn-swap').setAttribute('aria-label', `Play as ${other.name}`);
    $('brand-me').innerHTML = avatar(me, 34);
  }

  setHands(on) {
    $('btn-hands').classList.toggle('on', on);
    $('t-hands').classList.toggle('on', on);
  }

  setScooter(on) {
    $('btn-scooter').classList.toggle('on', on);
    $('t-scooter').classList.toggle('on', on);
    document.body.classList.toggle('scooting', on);
  }

  toggleHelp(force) {
    const show = force ?? this.help.classList.contains('hidden');
    this.help.classList.toggle('hidden', !show);
  }

  // ---------------------------------------------------------------- journey
  updateJourney(stations, stamps, nearId) {
    let n = 0;
    let total = 0;
    for (const st of stations) {
      const chip = this.chips[st.stop.id];
      if (!chip) continue;
      if (st.unlocked) total++;
      const stamped = stamps.has(st.stop.id);
      if (stamped) n++;
      chip.classList.toggle('stamped', stamped);
      chip.classList.toggle('locked', !st.unlocked);
      chip.classList.toggle('here', nearId === st.stop.id);
      if (!st.unlocked) chip.querySelector('.chip-icon').innerHTML = svgIcon('lock', 18);
    }
    this.count.textContent = `${n} of ${total} stamps`;
  }

  popChip(id) {
    this.chips[id]?.animate([{ transform: 'scale(1.5)' }, { transform: 'scale(0.9)' }, { transform: 'scale(1)' }], { duration: 520, easing: 'cubic-bezier(.2,1.6,.4,1)' });
  }

  // ---------------------------------------------------------------- station card
  // o: { stamped, nextStop, games: [{id,title}], ride, inside }
  showCard(station, o) {
    const stop = station.stop;
    const notes = loadNotes();
    const key = [stop.id, o.stamped, station.unlocked, !!notes[stop.id]].join(':');
    if (this.current === key && !this.card.classList.contains('hidden')) return;
    this.current = key;
    const eyebrow = stop.week ? `Weekend ${stop.week}` : stop.tag;
    const btns = [];
    if (stop.kind === 'start') {
      btns.push(`<button class="btn primary" data-act="inside">${svgIcon('door', 18)} Go inside</button>`);
      btns.push(`<button class="btn" data-act="travel-next">Show me the way ${svgIcon('arrow', 18)}</button>`);
    } else if (stop.week && !station.unlocked) {
      btns.push(`<div class="soon">${svgIcon('lock', 18)} ${esc(station.label)}</div>`);
    } else if (stop.week && !o.stamped) {
      btns.push(`<button class="btn primary" data-act="stamp">Collect the stamp <kbd>E</kbd></button>`);
    } else if (stop.week && o.nextStop) {
      btns.push(`<button class="btn" data-act="travel-next">Walk to ${o.nextStop.week ? 'Weekend ' + o.nextStop.week : esc(o.nextStop.title)} ${svgIcon('arrow', 18)}</button>`);
    }
    if (stop.week && o.stamped) btns.push(`<button class="btn ghost" data-act="unstamp" title="Take the stamp off">Unstamp</button>`);
    if (o.inside && stop.kind !== 'start') btns.push(`<button class="btn ${o.insideLocked ? '' : 'primary'}" data-act="enter">${svgIcon(o.insideLocked ? 'lock' : 'door', 18)} ${esc(o.insideLocked || 'Go inside')}</button>`);
    if (o.ride) btns.push(`<button class="btn primary" data-act="ride">${svgIcon('horse', 18)} Ride the pony</button>`);
    if (station.unlocked || stop.kind) {
      if (o.games.length === 1) btns.push(`<button class="btn game" data-act="game:${o.games[0].id}">${svgIcon('game', 18)} ${esc(o.games[0].title)}</button>`);
      else if (o.games.length > 1) btns.push(`<button class="btn game" data-act="games">${svgIcon('game', 18)} Play games <span class="pill">${o.games.length}</span></button>`);
    }
    btns.push(`<button class="btn icon ${notes[stop.id] ? 'has' : ''}" data-act="notes" title="Notes" aria-label="Notes">${svgIcon('note', 18)}</button>`);
    this.card.style.setProperty('--c', station.unlocked ? stop.color : '#8f8ab0');
    const note = notes[stop.id]?.text;
    this.card.innerHTML = `
      <div class="card-band">${svgIcon(stop.icon, 26)}</div>
      <div class="card-body">
        <div class="eyebrow">${esc(eyebrow)}<span class="tag">${stop.week ? esc(station.label) : ''}</span></div>
        <h2>${esc(stop.title)}</h2>
        <p>${esc(stop.text)}</p>
        ${note ? `<p class="note-preview">${svgIcon('note', 14)} ${esc(note.length > 90 ? note.slice(0, 90) + '...' : note)}</p>` : ''}
        <div class="card-actions">${btns.join('')}</div>
      </div>
      <div class="stamp-mark ${o.stamped ? 'on' : ''}"><span>${svgIcon('heart', 22)}</span><b>Stamped</b></div>`;
    this.card.classList.remove('hidden');
    document.body.classList.add('card-open');
    this.card.animate([{ translate: '0 24px', opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,1.3,.4,1)' });
  }

  refreshCard() {
    this.current = null;
  }

  stampCard() {
    const mark = this.card.querySelector('.stamp-mark');
    if (!mark) return;
    mark.classList.add('on');
    mark.animate([{ transform: 'rotate(-14deg) scale(2.4)', opacity: 0 }, { transform: 'rotate(-14deg) scale(0.92)', opacity: 1, offset: 0.7 }, { transform: 'rotate(-14deg) scale(1)', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.3,1.4,.5,1)' });
  }

  shakeCard() {
    this.card.animate([{ marginLeft: '0' }, { marginLeft: '-8px' }, { marginLeft: '8px' }, { marginLeft: '-5px' }, { marginLeft: '0' }], { duration: 320 });
  }

  hideCard() {
    if (this.card.classList.contains('hidden')) return;
    this.current = null;
    this.card.classList.add('hidden');
    document.body.classList.remove('card-open');
  }

  // Context prompt for hotspots (car, pony, door, sofa...)
  setPrompt(label, icon = 'arrow') {
    if (!label) {
      this.prompt.classList.add('hidden');
      this.promptLabel = null;
    } else if (label !== this.promptLabel) {
      this.promptLabel = label;
      this.prompt.innerHTML = `<kbd>E</kbd>${svgIcon(icon, 18)}<span>${esc(label)}</span>`;
      this.prompt.classList.remove('hidden');
    }
  }

  // The big touch button shows what it will do
  setActionLabel(label) {
    const b = $('t-action');
    if (b.dataset.label === (label || '')) return;
    b.dataset.label = label || '';
    b.innerHTML = `<b>A</b><span>${esc(label || '')}</span>`;
    b.classList.toggle('idle', !label);
  }

  toast(html, ms = 3600) {
    this.toastEl.innerHTML = html;
    this.toastEl.classList.add('on');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('on'), ms);
  }

  // ---------------------------------------------------------------- journey book
  // A book that opens from its cover and turns its pages: the title page and contents, one page per weekend
  // (its photo, its stamp, its story, its games and your note), the places you visit, and an ending.
  // Pages come in spreads: spread n shows pages 2n (left) and 2n + 1 (right); spread 0 is the closed cover.
  toggleJournal(force) {
    const el = $('journal');
    const show = force ?? el.classList.contains('hidden');
    if (show === !el.classList.contains('hidden')) return;
    document.body.classList.toggle('journal-open', show);
    if (show) {
      el.classList.remove('hidden', 'closing');
      this.pages = this.bookPages();
      this.spread = 0;
      this.showSpread();
      requestAnimationFrame(() => this.turnTo(this.lastSpread || 1));
    } else {
      this.lastSpread = Math.max(1, this.spread || 1);
      clearTimeout(this.flipTimer);
      this.flipping = false;
      el.classList.add('closing');
      setTimeout(() => el.classList.contains('closing') && el.classList.add('hidden'), 220);
    }
  }

  // Called when something in the book changed (a note, a stamp): redraw the open spread
  renderJournal() {
    if ($('journal').classList.contains('hidden') || this.flipping) return;
    this.pages = this.bookPages();
    this.showSpread();
  }

  get spreads() {
    return Math.ceil(this.pages.length / 2);
  }

  bookPages() {
    const { stations, stamps, gamesAt, looks } = this.h.journalData();
    const notes = loadNotes();
    const weeks = stations.filter((st) => st.stop.week).sort((a, b) => a.stop.week - b.stop.week);
    const places = stations.filter((st) => !st.stop.week);
    const got = weeks.filter((st) => stamps.has(st.stop.id)).length;
    const total = weeks.filter((st) => !st.stop.locked).length;
    const pages = [{ kind: 'empty' }, { kind: 'cover', got, total }];
    pages.push({ kind: 'titlepage', got, total, looks, weeks, stamps });
    const contentsAt = pages.push({ kind: 'contents' }) - 1;
    for (const st of weeks) pages.push({ kind: 'week', st, stamped: stamps.has(st.stop.id), games: gamesAt(st.stop.id), note: notes[st.stop.id]?.text });
    const firstPlace = pages.length;
    for (let i = 0; i < places.length; i += 4) pages.push({ kind: 'places', list: places.slice(i, i + 4).map((st) => ({ st, games: gamesAt(st.stop.id), note: notes[st.stop.id]?.text })), first: i === 0 });
    const endAt = pages.push({ kind: 'end', looks }) - 1;
    if (pages.length % 2) pages.push({ kind: 'blank' });
    const contents = pages[contentsAt];
    contents.weeks = weeks.map((st, i) => ({ st, page: contentsAt + 1 + i, stamped: stamps.has(st.stop.id) }));
    contents.places = firstPlace;
    contents.end = endAt;
    return pages;
  }

  pageHtml(i) {
    const pg = this.pages[i];
    if (!pg || pg.kind === 'empty') return '';
    const num = i >= 3 && pg.kind !== 'blank' && pg.kind !== 'cover' ? `<span class="pg-num">${i - 2}</span>` : '';
    const side = i % 2 ? 'right' : 'left';
    const last = Math.floor(i / 2) >= this.spreads - 1;
    const turn =
      pg.kind === 'cover'
        ? ''
        : side === 'right' && !last
          ? `<button class="pg-turn next" data-j="next:" aria-label="Next page">${svgIcon('arrow', 18)}</button>`
          : side === 'left' && i > 2
            ? `<button class="pg-turn prev" data-j="prev:" aria-label="Previous page">${svgIcon('arrow', 18)}</button>`
            : '';
    return `<div class="pg-in pg-${pg.kind}">${this.pageBody(pg)}</div>${num}${turn}`;
  }

  pageBody(pg) {
    const stampSvg = (st, stamped) => {
      const s = st.stop;
      const id = `ring-${s.id}`;
      if (s.locked) return `<div class="seal locked">${svgIcon('lock', 30)}<small>Coming soon</small></div>`;
      if (!stamped) return `<div class="seal empty"><small>Stamp<br />here</small></div>`;
      const ring = `WEEKEND ${s.week} \u2022 ${s.title.toUpperCase()} \u2022 `;
      return `<svg class="seal stamped" viewBox="0 0 120 120" style="--c:${s.color}" aria-label="Stamp collected">
        <defs><path id="${id}" d="M60 60 m-41 0 a41 41 0 1 1 82 0 a41 41 0 1 1 -82 0" /></defs>
        <circle cx="60" cy="60" r="55" fill="none" stroke="currentColor" stroke-width="4" />
        <circle cx="60" cy="60" r="31" fill="none" stroke="currentColor" stroke-width="2.5" />
        <text font-size="11.5" font-weight="700" letter-spacing="1.2" fill="currentColor"><textPath href="#${id}" textLength="252">${esc(ring)}</textPath></text>
        <g transform="translate(46 44) scale(1.15)" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[s.icon] || ICONS.star}" /></g>
      </svg>`;
    };
    switch (pg.kind) {
      case 'cover':
        return `<div class="cv-frame"><div class="cv-corner a"></div><div class="cv-corner b"></div><div class="cv-corner c"></div><div class="cv-corner d"></div>
          <div class="cv-heart">${svgIcon('heart', 34)}</div><div class="cv-title">Our Journey</div><div class="cv-sub">Roji &amp; Homama</div>
          <div class="cv-stamps">${pg.got} of ${pg.total} stamps</div></div>`;
      case 'titlepage':
        return `<div class="tt-kicker">This book belongs to</div>
          <div class="tt-pair">${avatar(pg.looks.roji, 64)}<span class="tt-amp">${svgIcon('heart', 22)}</span>${avatar(pg.looks.homama, 64)}</div>
          <div class="tt-names">Roji &amp; Homama</div>
          <p class="tt-line">One weekend at a time. Every stop on the island path is a little adventure, and every adventure gets a stamp in this book.</p>
          <div class="tt-row">${pg.weeks.filter((st) => !st.stop.locked).map((st) => `<span class="tt-dot ${pg.stamps.has(st.stop.id) ? 'on' : ''}" style="--c:${st.stop.color}">${svgIcon(pg.stamps.has(st.stop.id) ? 'check' : st.stop.icon, 14)}</span>`).join('')}</div>
          <div class="tt-count">${pg.got} of ${pg.total} weekends stamped</div>`;
      case 'contents':
        return `<h4 class="pg-h">Contents</h4><ol class="toc">${pg.weeks
          .map(({ st, page, stamped }) => `<li><button data-j="page:${page}" style="--c:${st.stop.color}"><span class="toc-ic ${stamped ? 'on' : st.stop.locked ? 'lock' : ''}">${svgIcon(stamped ? 'check' : st.stop.locked ? 'lock' : st.stop.icon, 13)}</span><span class="toc-t"><small>Weekend ${st.stop.week}</small>${esc(st.stop.locked ? 'Coming soon' : st.stop.title)}</span><span class="toc-dots"></span><span class="toc-n">${page - 2}</span></button></li>`)
          .join('')}
          <li><button data-j="page:${pg.places}"><span class="toc-ic">${svgIcon('home', 13)}</span><span class="toc-t"><small>And more</small>Places we love</span><span class="toc-dots"></span><span class="toc-n">${pg.places - 2}</span></button></li>
          <li><button data-j="page:${pg.end}"><span class="toc-ic">${svgIcon('heart', 13)}</span><span class="toc-t"><small>The end?</small>To be continued</span><span class="toc-dots"></span><span class="toc-n">${pg.end - 2}</span></button></li></ol>`;
      case 'week': {
        const s = pg.st.stop;
        const locked = s.locked;
        return `<div class="pg-kicker" style="--c:${s.color}">Weekend ${s.week}${pg.stamped ? ' \u2022 stamped' : ''}</div>
          <h4 class="pg-title">${esc(locked ? 'Coming soon' : s.title)}</h4>
          <div class="pg-art">
            <figure class="polaroid ${locked ? 'locked' : ''}" style="--c:${locked ? '#a9a6bf' : s.color}"><span class="tape"></span><div class="ph">${svgIcon(locked ? 'lock' : s.icon, 54)}</div><figcaption>${esc(locked ? 'A secret for now' : s.tag || s.title)}</figcaption></figure>
            ${stampSvg(pg.st, pg.stamped)}
          </div>
          <p class="pg-text">${esc(s.text || '')}</p>
          ${pg.games.length ? `<p class="pg-games">${svgIcon('game', 14)} ${pg.games.map((g) => esc(g.title)).join(', ')}</p>` : ''}
          ${pg.note ? `<div class="pg-note">${esc(pg.note.length > 110 ? pg.note.slice(0, 110) + '...' : pg.note)}</div>` : ''}
          <div class="pg-actions"><button class="bk-btn go" data-j="go:${s.id}" style="--c:${locked ? '#a9a6bf' : s.color}">Go there</button><button class="bk-btn" data-j="notes:${s.id}">${svgIcon('note', 15)} ${pg.note ? 'Edit note' : 'Write a note'}</button></div>`;
      }
      case 'places':
        return `${pg.first ? '<h4 class="pg-h">Places we love</h4>' : '<h4 class="pg-h small">More places</h4>'}<ul class="pl-list">${pg.list
          .map(({ st, games, note }) => {
            const s = st.stop;
            return `<li style="--c:${s.color}"><span class="pl-ic">${svgIcon(s.icon, 18)}</span><div class="pl-t"><b>${esc(s.title)}</b><small>${esc(games.length ? games.map((g) => g.title).join(', ') : s.tag || '')}</small>${note ? `<span class="pl-note">${esc(note.length > 50 ? note.slice(0, 50) + '...' : note)}</span>` : ''}</div><button class="bk-btn mini go" data-j="go:${s.id}" aria-label="Go to ${esc(s.title)}">Go</button><button class="bk-btn mini" data-j="notes:${s.id}" aria-label="Notes">${svgIcon('note', 15)}</button></li>`;
          })
          .join('')}</ul>`;
      case 'end':
        return `<h4 class="pg-h">To be continued</h4><div class="end-hearts">${svgIcon('heart', 26)}${svgIcon('heart', 18)}${svgIcon('heart', 22)}</div>
          <p class="pg-text center">More weekends are on their way. Keep the empty pages for the adventures still to come.</p>
          <div class="tt-pair small">${avatar(pg.looks.roji, 44)}<span class="tt-amp">${svgIcon('heart', 16)}</span>${avatar(pg.looks.homama, 44)}</div><div class="end-sign">Love, R &amp; H</div>`;
      default:
        return '';
    }
  }

  // Draw the spread as it rests (no page turning)
  showSpread() {
    const el = $('journal');
    const s = this.spread;
    el.innerHTML = `<div class="book ${s === 0 ? 'closed' : ''}">
      <div class="bk-board"></div>
      <div class="bk-page left ${this.paperCls(2 * s)}">${this.pageHtml(2 * s)}</div>
      <div class="bk-page right ${this.paperCls(2 * s + 1)}">${this.pageHtml(2 * s + 1)}</div>
      <div class="bk-ribbon"></div>
      <button class="round small bk-close" data-j="close:" aria-label="Close the book">${svgIcon('close', 16)}</button>
    </div>`;
  }

  paperCls(i) {
    const k = this.pages[i]?.kind;
    return k === 'cover' ? 'is-cover' : !k || k === 'empty' ? 'is-empty' : 'is-paper';
  }

  // Turn to spread t: the page lifts at the spine and turns over to the other side
  turnTo(t) {
    t = Math.max(1, Math.min(this.spreads - 1, t));
    if (t === this.spread || this.flipping || $('journal').classList.contains('hidden')) return;
    const from = this.spread;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      this.spread = t;
      this.showSpread();
      return;
    }
    const fwd = t > from;
    const book = $('journal').querySelector('.book');
    const L = book.querySelector('.bk-page.left');
    const R = book.querySelector('.bk-page.right');
    // Underneath: the page that stays, and the page that will be revealed
    if (fwd) {
      R.className = `bk-page right ${this.paperCls(2 * t + 1)}`;
      R.innerHTML = this.pageHtml(2 * t + 1);
    } else {
      L.className = `bk-page left ${this.paperCls(2 * t)}`;
      L.innerHTML = this.pageHtml(2 * t);
    }
    const leaf = document.createElement('div');
    leaf.className = `bk-leaf ${fwd ? 'fwd' : 'back'}`;
    const front = fwd ? 2 * from + 1 : 2 * from;
    const back = fwd ? 2 * t : 2 * t + 1;
    leaf.innerHTML = `<div class="bk-face front bk-page ${fwd ? 'right' : 'left'} ${this.paperCls(front)}">${this.pageHtml(front)}</div><div class="bk-face back bk-page ${fwd ? 'left' : 'right'} ${this.paperCls(back)}">${this.pageHtml(back)}</div>`;
    book.appendChild(leaf);
    if (from === 0) book.classList.remove('closed');
    this.flipping = true;
    this.spread = t;
    requestAnimationFrame(() => requestAnimationFrame(() => leaf.classList.add('turn')));
    this.flipTimer = setTimeout(() => {
      this.flipping = false;
      this.showSpread();
    }, from === 0 ? 760 : 620);
  }

  // ---------------------------------------------------------------- notes
  openNotes(id) {
    const stop = STOPS.find((s) => s.id === id);
    const n = loadNotes()[id];
    const el = $('notes');
    el.innerHTML = `<div class="modal-card" style="--c:${stop.color}">
      <div class="sheet-head"><h3>${svgIcon('note', 22)} ${esc(stop.week ? 'Weekend ' + stop.week + ': ' : '')}${esc(stop.title)}</h3><button class="round small" data-n="close" aria-label="Close">${svgIcon('close', 16)}</button></div>
      <textarea id="note-text" rows="7" placeholder="Write a memory, a plan, or what to bring...">${esc(n?.text || '')}</textarea>
      <div class="note-foot"><span id="note-saved">${n ? 'Saved ' + new Date(n.updated).toLocaleString() : 'Notes save on this device'}</span><button class="btn primary" data-n="close">Done</button></div>
    </div>`;
    el.classList.remove('hidden');
    const ta = $('note-text');
    ta.focus();
    let timer;
    ta.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        saveNote(id, ta.value);
        $('note-saved').textContent = 'Saved';
        this.refreshCard();
      }, 300);
    });
    this.noteId = id;
  }

  closeNotes() {
    const el = $('notes');
    if (el.classList.contains('hidden')) return;
    const ta = $('note-text');
    if (ta && this.noteId) saveNote(this.noteId, ta.value);
    el.classList.add('hidden');
    this.refreshCard();
    if (!$('journal').classList.contains('hidden')) this.renderJournal();
  }

  // ---------------------------------------------------------------- games menu
  openGames(title, games) {
    const el = $('games-menu');
    el.innerHTML = `<div class="modal-card">
      <div class="sheet-head"><h3>${svgIcon('game', 22)} ${esc(title)}</h3><button class="round small" data-g="close" aria-label="Close">${svgIcon('close', 16)}</button></div>
      <div class="g-list">${games.map((g) => `<button class="g-tile" data-g="${g.id}"><b>${esc(g.title)}</b><span>${esc(g.tagline)}</span></button>`).join('')}</div>
    </div>`;
    el.classList.remove('hidden');
    el.querySelector('.g-tile')?.focus();
  }

  closeGames() {
    $('games-menu').classList.add('hidden');
  }

  // ---------------------------------------------------------------- wardrobe
  openWardrobe(looks, editing, onChange, onClose) {
    const el = $('wardrobe');
    this.wardrobeState = { looks, editing, onChange, onClose };
    this.renderWardrobe();
    el.classList.remove('hidden');
    document.body.classList.add('wardrobe-open');
  }

  renderWardrobe() {
    const { looks, editing, onChange, onClose } = this.wardrobeState;
    const L = looks[editing];
    const el = $('wardrobe');
    const sw = (field, colors) =>
      `<div class="swatches">${colors.map((c) => `<button class="sw ${L[field] === c ? 'on' : ''}" style="--sw:${c}" data-w="${field}:${c}" aria-label="${field} ${c}"></button>`).join('')}</div>`;
    const chips = (field, items, names) =>
      `<div class="chips">${items.map((v) => `<button class="wchip ${L[field] === v ? 'on' : ''}" data-w="${field}:${v}">${esc(names[v])}</button>`).join('')}</div>`;
    const styles = HAIRSTYLES[L.gender];
    el.innerHTML = `
      <div class="sheet-head"><h3>${svgIcon('shirt', 22)} Wardrobe</h3><button class="round small" data-w="close:" aria-label="Close">${svgIcon('close', 16)}</button></div>
      <div class="w-tabs">${['roji', 'homama'].map((id) => `<button class="w-tab ${id === editing ? 'on' : ''}" data-w="tab:${id}">${avatar(looks[id], 40)}<span>${esc(looks[id].name)}</span></button>`).join('')}</div>
      <div class="w-scroll">
        <h4>Haircut</h4>${chips('hairstyle', styles, HAIRSTYLE_NAMES)}
        <h4>Hair colour</h4>${sw('hair', PALETTE.hair)}
        <h4>Outfit</h4>${chips('outfit', OUTFITS_BY[L.gender], OUTFIT_NAMES)}
        <h4>${L.outfit === 'dress' ? 'Dress colour' : 'Top colour'}</h4>${sw('top', PALETTE.clothes)}
        ${L.outfit === 'dress' ? '' : `<h4>${L.outfit === 'skirt' ? 'Skirt colour' : 'Trousers colour'}</h4>${sw('bottom', PALETTE.clothes)}`}
        <h4>Shoes</h4>${sw('shoes', PALETTE.shoes)}
        <h4>Bow and ties</h4>${sw('accent', ['#ff7fa3', '#ffd166', '#7fd3ff', '#b9a6ff', '#ffffff', '#e5484d', '#3fbf7f'])}
        <h4>Skin</h4>${sw('skin', PALETTE.skin)}
        <button class="btn ghost" data-w="reset:">Back to ${esc(L.name)}'s usual look</button>
      </div>`;
    el.onclick = (e) => {
      const b = e.target.closest('[data-w]');
      if (!b) return;
      const [field, value] = b.dataset.w.split(/:(.*)/s);
      if (field === 'close') {
        el.classList.add('hidden');
        document.body.classList.remove('wardrobe-open');
        onClose();
        return;
      }
      if (field === 'tab') {
        this.wardrobeState.editing = value;
        onChange(value, null);
      } else if (field === 'reset') {
        looks[editing] = { ...DEFAULT_LOOKS[editing] };
        onChange(editing, looks[editing]);
      } else {
        looks[editing] = { ...looks[editing], [field]: value };
        if (field === 'outfit' && value === 'dress') looks[editing].bottom = looks[editing].top;
        onChange(editing, looks[editing]);
      }
      this.renderWardrobe();
    };
  }

  closeWardrobe() {
    const el = $('wardrobe');
    if (el.classList.contains('hidden')) return false;
    el.classList.add('hidden');
    document.body.classList.remove('wardrobe-open');
    this.wardrobeState?.onClose();
    return true;
  }
}

// ------------------------------------------------------------------ minimap
export class Minimap {
  // Shows the area around the player (the island is too big to show whole at this size).
  constructor(canvas, world, stations) {
    this.canvas = canvas;
    this.world = world;
    this.stations = stations;
    this.places = []; // [{ x, z, w, d, color }] footprints of city places
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = 220;
    this.h = 140;
    canvas.width = this.w * dpr;
    canvas.height = this.h * dpr;
    canvas.style.width = this.w + 'px';
    canvas.style.height = this.h + 'px';
    this.dpr = dpr;
    this.span = 96; // metres across
    this.s = this.w / this.span;
    this.cx = 0;
    this.cz = 0;
  }

  P(x, z) {
    return [this.w / 2 + (x - this.cx) * this.s, this.h / 2 + (z - this.cz) * this.s];
  }

  // The island, the snow, the places, the roads and the paths never move: they are drawn once into a big
  // canvas at the map's own scale and copied in each frame (redrawn when the golden trail grows).
  staticLayer() {
    const trail = Math.floor(this.world.trailShown || 0);
    const key = `${trail}|${this.places.length}`;
    if (this.layer && this.layerKey === key) return this.layer;
    const s = this.s;
    const dpr = this.dpr;
    const ol = this.world.outline;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of ol) {
      x0 = Math.min(x0, p.x);
      x1 = Math.max(x1, p.x);
      z0 = Math.min(z0, p.y);
      z1 = Math.max(z1, p.y);
    }
    // Room for the widest view past every edge
    const padX = this.w / s / 2 + 4;
    const padZ = this.h / s / 2 + 4;
    x0 -= padX;
    x1 += padX;
    z0 -= padZ;
    z1 += padZ;
    const c = this.layer || document.createElement('canvas');
    c.width = Math.ceil((x1 - x0) * s * dpr);
    c.height = Math.ceil((z1 - z0) * s * dpr);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    const P = (x, z) => [(x - x0) * s, (z - z0) * s];
    ctx.fillStyle = '#9ad06a';
    ctx.strokeStyle = '#d9a066';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ol.forEach((p, i) => {
      const [x, y] = P(p.x, p.y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    // Snow at the north end: the ski hill's snow field (world.snow, world metres)
    const sn = this.world.snow;
    if (sn) {
      const [sx0, sy0] = P(sn.x0, sn.z0);
      const [sx1, sy1] = P(sn.x1, sn.z1);
      const g = ctx.createLinearGradient(0, sy1, 0, sy1 - 10);
      g.addColorStop(0, 'rgba(242,246,251,0)');
      g.addColorStop(1, 'rgba(242,246,251,0.95)');
      ctx.save();
      ctx.clip(); // inside the island outline drawn just above
      ctx.fillStyle = g;
      ctx.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
      ctx.restore();
    }
    for (const pl of this.places) {
      const [x, y] = P(pl.x - pl.w / 2, pl.z - pl.d / 2);
      ctx.fillStyle = pl.color + '55';
      ctx.beginPath();
      ctx.roundRect?.(x, y, pl.w * s, pl.d * s, 4);
      ctx.fill();
    }
    const line = (pts, style, width, dash = []) => {
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash(dash);
      ctx.beginPath();
      pts.forEach((p, i) => {
        const [x, y] = P(p.x, p.z);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };
    for (const road of this.world.cityRoads || []) line(road, '#d8d2e2', 8);
    line(this.world.samples, '#f6e4bd', 6);
    line(this.world.townSamples, '#f6e4bd', 6);
    line(this.world.futureSamples, 'rgba(255,255,255,0.8)', 2, [3, 5]);
    if (trail > 0) line(this.world.samples.slice(0, trail + 1), '#ffb347', 3);
    this.layer = c;
    this.layerKey = key;
    this.layerOrigin = [x0, z0];
    return c;
  }

  draw(me, yaw, stamps, t, other, car) {
    const ctx = this.canvas.getContext('2d');
    this.cx = me.x;
    this.cz = me.z;
    const layer = this.staticLayer();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect?.(0, 0, this.w, this.h, 18);
    ctx.clip();
    ctx.fillStyle = '#7fcad3';
    ctx.fillRect(0, 0, this.w, this.h);
    // Copy the fixed map in at whole device pixels, so it stays as crisp as drawing it fresh
    const [ox, oz] = this.P(this.layerOrigin[0], this.layerOrigin[1]);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, Math.round(ox * this.dpr), Math.round(oz * this.dpr));
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const st of this.stations) {
      const [x, y] = this.P(st.pad.x, st.pad.z);
      if (x < -8 || y < -8 || x > this.w + 8 || y > this.h + 8) continue;
      ctx.fillStyle = st.unlocked ? st.stop.color : '#a9a6bf';
      ctx.beginPath();
      ctx.arc(x, y, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = stamps.has(st.stop.id) ? '#ffd166' : '#ffffff';
      ctx.stroke();
    }
    if (car) {
      const [cx, cy] = this.P(car.x, car.z);
      ctx.fillStyle = '#ff8fb1';
      ctx.fillRect(cx - 4, cy - 3, 8, 6);
    }
    if (other) {
      const [ox, oy] = this.P(other.x, other.z);
      ctx.fillStyle = '#3f7bf0';
      ctx.beginPath();
      ctx.arc(ox, oy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    const [rx, ry] = this.P(me.x, me.z);
    ctx.translate(rx, ry);
    ctx.rotate(-yaw + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5.5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-5.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(239,91,111,' + (0.5 + Math.sin(t * 4) * 0.3) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rx, ry, 10 + Math.sin(t * 4) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}
