import { svgIcon } from './icons.js';
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

const EMOTE_ICONS = { wave: 'hand', dance: 'music', spin: 'spin', cheer: 'star', heart: 'heart', bow: 'smile' };

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

    // Dance and hand-holding dock (desktop) and the touch buttons
    const dock = $('dock');
    const emoteHtml = Object.entries(EMOTES)
      .map(([k, v], i) => `<button class="dock-btn" data-emote="${k}" title="${v.name} (${i + 1})" aria-label="${v.name}">${svgIcon(EMOTE_ICONS[k], 20)}<kbd>${i + 1}</kbd></button>`)
      .join('');
    dock.innerHTML = `${emoteHtml}<span class="dock-sep"></span><button class="dock-btn" id="btn-hands" title="Hold hands (H)" aria-label="Hold hands">${svgIcon('hands', 20)}<kbd>H</kbd></button>`;
    $('emote-wheel').innerHTML = Object.entries(EMOTES)
      .map(([k, v]) => `<button class="wheel-btn" data-emote="${k}">${svgIcon(EMOTE_ICONS[k], 22)}<span>${v.name}</span></button>`)
      .join('');
    for (const el of [dock, $('emote-wheel')]) {
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-emote]');
        if (b) {
          h.onEmote(b.dataset.emote);
          $('emote-wheel').classList.add('hidden');
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
    $('t-hands').innerHTML = svgIcon('hands', 26);
    $('t-hands').addEventListener('pointerdown', press(() => h.onHands()));
    $('t-emote').innerHTML = svgIcon('music', 26);
    $('t-emote').addEventListener('pointerdown', press(() => $('emote-wheel').classList.toggle('hidden')));
    $('t-jump').addEventListener('pointerdown', press(() => h.onJump()));
    $('t-action').addEventListener('pointerdown', press(() => h.onAction('auto')));

    // Panels
    $('journal').addEventListener('click', (e) => {
      const b = e.target.closest('[data-j]');
      if (!b) return;
      const [act, id] = b.dataset.j.split(':');
      if (act === 'go') {
        this.toggleJournal(false);
        h.onTravel(id);
      } else if (act === 'notes') this.openNotes(id);
      else if (act === 'close') this.toggleJournal(false);
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
    return ['journal', 'wardrobe', 'notes', 'games-menu', 'help'].some((id) => !$(id).classList.contains('hidden'));
  }

  closePanels() {
    this.toggleJournal(false);
    this.closeNotes();
    this.closeGames();
    this.toggleHelp(false);
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

  // ---------------------------------------------------------------- journal
  toggleJournal(force) {
    const el = $('journal');
    const show = force ?? el.classList.contains('hidden');
    if (show) this.renderJournal();
    el.classList.toggle('hidden', !show);
    document.body.classList.toggle('journal-open', show);
  }

  renderJournal() {
    const { stations, stamps, gamesAt } = this.h.journalData();
    const notes = loadNotes();
    const rows = stations
      .map((st) => {
        const s = st.stop;
        const stamped = stamps.has(s.id);
        const state = !st.unlocked ? 'locked' : s.week ? (stamped ? 'done' : 'open') : 'place';
        const status = { locked: st.label, done: 'Stamp collected', open: 'Stand on the pad to collect the stamp', place: s.tag }[state];
        const games = gamesAt(s.id);
        const note = notes[s.id]?.text;
        return `<li class="j-row ${state}" style="--c:${st.unlocked ? s.color : '#a9a6bf'}">
          <span class="j-icon">${svgIcon(state === 'done' ? 'check' : !st.unlocked ? 'lock' : s.icon, 20)}</span>
          <div class="j-text">
            <div class="j-kicker">${s.week ? 'Weekend ' + s.week : esc(s.tag)}</div>
            <b>${esc(s.title)}</b>
            <span class="j-status">${esc(status)}${games.length ? ` - ${games.map((g) => esc(g.title)).join(', ')}` : ''}</span>
            ${note ? `<span class="j-note">${esc(note.length > 120 ? note.slice(0, 120) + '...' : note)}</span>` : ''}
          </div>
          <div class="j-actions">
            <button class="btn small" data-j="go:${s.id}">Go</button>
            <button class="btn small icon ${note ? 'has' : ''}" data-j="notes:${s.id}" aria-label="Notes">${svgIcon('note', 16)}</button>
          </div>
        </li>`;
      })
      .join('');
    $('journal').innerHTML = `
      <div class="sheet-head"><h3>${svgIcon('book', 22)} Journey</h3><button class="round small" data-j="close:" aria-label="Close">${svgIcon('close', 16)}</button></div>
      <p class="sheet-intro">Each numbered pad on the path is a weekend checkpoint. Stand on it to open its card and collect the stamp. Places have games, and every spot has its own notes.</p>
      <ol class="j-list">${rows}</ol>`;
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

  draw(me, yaw, stamps, t, other, car) {
    const ctx = this.canvas.getContext('2d');
    this.cx = me.x;
    this.cz = me.z;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect?.(0, 0, this.w, this.h, 18);
    ctx.clip();
    ctx.fillStyle = '#7fcad3';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.fillStyle = '#9ad06a';
    ctx.strokeStyle = '#d9a066';
    ctx.lineWidth = 3;
    ctx.beginPath();
    this.world.outline.forEach((p, i) => {
      const [x, y] = this.P(p.x, p.y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    // Snow at the north end
    const [, snowY] = this.P(0, -88);
    if (snowY > 0) {
      const g = ctx.createLinearGradient(0, snowY, 0, snowY - 10);
      g.addColorStop(0, 'rgba(242,246,251,0)');
      g.addColorStop(1, 'rgba(242,246,251,0.95)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.w, snowY);
    }
    for (const pl of this.places) {
      const [x, y] = this.P(pl.x - pl.w / 2, pl.z - pl.d / 2);
      ctx.fillStyle = pl.color + '55';
      ctx.beginPath();
      ctx.roundRect?.(x, y, pl.w * this.s, pl.d * this.s, 4);
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
        const [x, y] = this.P(p.x, p.z);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };
    for (const road of this.world.cityRoads || []) line(road, '#d8d2e2', 5);
    line(this.world.samples, '#f6e4bd', 5);
    line(this.world.townSamples, '#f6e4bd', 5);
    line(this.world.futureSamples, 'rgba(255,255,255,0.8)', 2, [3, 5]);
    if (this.world.trailShown > 0) line(this.world.samples.slice(0, Math.floor(this.world.trailShown) + 1), '#ffb347', 3);
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
