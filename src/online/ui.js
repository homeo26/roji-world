import { svgIcon } from '../icons.js';
import { avatar } from '../games/avatar.js';
import { CODE_CHARS } from './codes.js';

// The Play together window (continue in our room, make a room or join one; in a room: the code, who is in
// it, keeping the seat with Google, freeing a seat, deleting the room), the status chip while in a room and
// the small invitation cards ("Homama wants to hold your hand"). The window lives in #online (index.html)
// so the game treats it like its other panels; the chip and the cards are added here.

const $ = (id) => document.getElementById(id);
// The Google "G" for the sign-in button
const GOOGLE_G = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let cssReady = null;
export function loadCss() {
  cssReady ||= new Promise((resolve) => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = new URL('./online.css', import.meta.url).href;
    l.onload = l.onerror = () => resolve();
    document.head.appendChild(l);
    setTimeout(resolve, 2500);
  });
  return cssReady;
}

export class OnlineUI {
  // h: { looks, playerId(), onCreate(who), onJoin(code), onContinue(), onLeave(), onChip(), onDelete(), onFree(), onGoogle(), onSolo(), onForget() }
  constructor(h) {
    this.h = h;
    this.el = $('online');
    this.pick = h.playerId();
    this.view = 'start';
    this.el.addEventListener('click', (e) => this.click(e));
    this.el.addEventListener('input', (e) => {
      if (e.target.id !== 'ol-code') return;
      e.target.value = [...e.target.value.toUpperCase()].filter((c) => CODE_CHARS.includes(c)).join('').slice(0, 6);
      this.msg('');
    });
    this.el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.id === 'ol-code') this.h.onJoin($('ol-code').value);
      if (e.key === 'Escape') this.close();
    });
    this.chipEl = document.createElement('div');
    this.chipEl.id = 'ol-chip';
    this.chipEl.className = 'ol-chip hidden';
    this.chipEl.innerHTML = `<button class="ol-chip-main" aria-label="Online room"><i class="ol-dot"></i><span class="ol-av"></span><span class="ol-chip-t"></span></button><button class="ol-chip-x" aria-label="Leave the room" title="Leave the room">${svgIcon('close', 16, 2.8)}</button>`;
    this.chipEl.querySelector('.ol-chip-main').addEventListener('click', () => this.h.onChip());
    this.chipEl.querySelector('.ol-chip-x').addEventListener('click', () => this.h.onLeave());
    document.body.appendChild(this.chipEl);
    this.inviteEl = document.createElement('div');
    this.inviteEl.id = 'ol-invite';
    this.inviteEl.className = 'ol-invite hidden';
    this.inviteEl.setAttribute('role', 'alertdialog');
    document.body.appendChild(this.inviteEl);
    this.inviteEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]');
      if (b) this.answer(b.dataset.i === 'yes');
    });
    window.addEventListener('keydown', (e) => {
      if (!this.inv || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (k === 'y') this.answer(true);
      else if (k === 'n') this.answer(false);
    });
  }

  get isOpen() {
    return !this.el.classList.contains('hidden');
  }

  open() {
    this.el.classList.remove('hidden');
    this.render();
  }

  close() {
    this.el.classList.add('hidden');
  }

  // view: 'start' | 'busy' | 'room' | 'confirm'. start: { saved, loaded, google, code, msg, failed };
  // room: { code, link, seat, other, otherState, here, google, msg }; confirm: { act, title, text, yes }
  show(view, data = {}) {
    this.view = view;
    this.data = data;
    if (this.isOpen) this.render();
  }

  msg(text, kind = 'bad') {
    const m = this.el.querySelector('.ol-msg');
    if (!m) return;
    m.innerHTML = text;
    m.className = `ol-msg ${kind}`;
  }

  render() {
    const { looks } = this.h;
    const d = this.data || {};
    const head = (title) => `<div class="sheet-head"><h3>${svgIcon('together', 22)} ${esc(title)}</h3><button class="round small" data-o="close" aria-label="Close">${svgIcon('close', 16)}</button></div>`;
    const herHis = (id) => (looks[id]?.gender === 'boy' ? 'his' : 'her');
    const googleBtn = (label) => `<button class="btn ol-google" data-o="google">${GOOGLE_G}<span>${esc(label)}</span></button>`;
    let body = '';
    if (this.view === 'busy') {
      body = `${head('Play together')}<div class="ol-busy"><span class="ol-spin"></span>${esc(d.busy || 'One moment')}</div><p class="ol-msg"></p>`;
    } else if (this.view === 'confirm') {
      body = `${head(d.title)}<p class="ol-lead ol-confirm">${d.text}</p>
        <div class="ol-foot"><button class="btn ghost" data-o="back">${esc(d.no || 'Keep it')}</button><button class="btn primary ol-danger" data-o="do-${d.act}">${esc(d.yes)}</button></div>`;
    } else if (this.view === 'room') {
      const me = d.seat;
      const other = d.other;
      const share = navigator.share ? `<button class="btn" data-o="share">${svgIcon('share', 18)} Share</button>` : '';
      const st = { here: ['live', 'Here now'], away: ['wait', 'Away for a moment'], out: ['off', 'Not here right now'], free: ['wait', 'Free seat: send the code'] }[d.otherState] || ['off', ''];
      const seat = (id, dot, text, extra = '') => `<div class="ol-seat${d.otherState === 'free' && id === other ? ' free' : ''}"><span class="ol-av">${avatar(looks[id], 34)}</span><span class="ol-seat-t"><b>${esc(looks[id].name)}</b><span><i class="ol-dot ${dot}"></i>${esc(text)}</span></span>${extra}</div>`;
      const free = d.otherState !== 'free' ? `<button class="ol-mini" data-o="ask-free">${esc(looks[other].name)} has a new phone? Free ${herHis(other)} seat</button>` : '';
      const keep = d.google ? `<p class="ol-kept">${svgIcon('check', 18, 2.8)} Your seat is kept with your Google account.</p>` : googleBtn('Keep my seat on any device: sign in with Google');
      body = `${head(`Room ${d.code}`)}
        <div class="ol-roomgrid">
          <div class="ol-room">
            <div class="ol-code-big" aria-label="Room code">${[...d.code].map((c) => `<b>${c}</b>`).join('')}</div>
            <div class="ol-link"><input id="ol-link" readonly value="${esc(d.link)}" aria-label="Link to the room" /><button class="btn primary" data-o="copy">${svgIcon('copy', 18)} Copy</button>${share}</div>
            <p class="ol-note">The room stays saved. Come back with this code any time and carry on.</p>
          </div>
          <div class="ol-side">
            <div class="ol-seats" aria-label="Who is in the room">${seat(me, 'live', 'You')}${seat(other, st[0], st[1], free)}</div>
            ${keep}
          </div>
        </div>
        <div class="ol-foot"><button class="btn ghost ol-del" data-o="ask-delete">Delete this room</button><span class="ol-gap"></span><button class="btn ghost" data-o="leave">Leave the room</button><button class="btn primary" data-o="close">${d.here ? 'Play' : 'Back to the island'}</button></div>
        <p class="ol-msg"></p>`;
    } else {
      const pickBtn = (id) => `<button class="ol-pick ${this.pick === id ? 'on' : ''}" data-o="pick:${id}" role="radio" aria-checked="${this.pick === id}">${avatar(looks[id], 46)}<span>${esc(looks[id].name)}</span></button>`;
      const room = d.loaded || d.saved?.code;
      const seatId = room && d.saved?.code === room ? d.saved.seat : null;
      let ours = '';
      if (room) {
        const lost = d.failed === 'full';
        const solo = d.loaded ? `<button class="btn ghost" data-o="solo">Play on my own</button>` : `<button class="ol-mini" data-o="forget">Forget this room</button>`;
        ours = `<section class="ol-ours">
          <button class="btn primary big ol-continue" data-o="continue">${svgIcon('together', 22)} <span>Continue in our room <b>${esc(room)}</b></span></button>
          <div class="ol-ours-row">${seatId ? `<span class="ol-av">${avatar(looks[seatId], 26)}</span><span>You play ${esc(looks[seatId].name)} there. What you two did is saved in the room.</span>` : '<span>What you two did is saved in the room.</span>'}${solo}</div>
          ${lost ? `<div class="ol-ours-row">${d.google ? '' : googleBtn('My seat is with Google: sign in')}<button class="ol-mini" data-o="forget">Forget this room</button></div>` : ''}
        </section>`;
      }
      body = `${head('Play together')}
        ${ours || '<p class="ol-lead">Two phones or laptops, one island: one of you plays Roji and the other plays Homama. A room keeps your progress, so you can come back to it any time.</p>'}
        ${ours ? '<p class="ol-or">Or start another room</p>' : ''}
        <div class="ol-two">
          <section class="ol-box"><h4>Make a room</h4><div class="ol-picks" role="radiogroup" aria-label="Who do you play">${pickBtn('roji')}${pickBtn('homama')}</div><button class="btn primary" data-o="create">${svgIcon('together', 18)} Make a room</button></section>
          <section class="ol-box"><h4>Join a room</h4><label class="ol-label" for="ol-code">The code you got</label><input id="ol-code" class="ol-code" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="6" placeholder="ABC234" value="${esc(d.code || '')}" /><button class="btn primary" data-o="join" style="--c:#21a99a">${svgIcon('door', 18)} Join</button></section>
        </div>
        ${!d.google && !(room && d.failed === 'full') ? `<p class="ol-small">Your seat is on another phone? <button class="ol-mini" data-o="google">Sign in with Google</button> first, then join.</p>` : ''}
        <p class="ol-msg"></p>`;
    }
    this.el.innerHTML = `<div class="modal-card ol-card">${body}</div>`;
    if (d.msg) this.msg(d.msg, d.msgKind);
  }

  click(e) {
    if (e.target === this.el) return this.close();
    const b = e.target.closest('[data-o]');
    if (!b) return;
    const [act, arg] = b.dataset.o.split(':');
    const d = this.data || {};
    const looks = this.h.looks;
    if (act === 'close') this.close();
    else if (act === 'pick') {
      this.pick = arg;
      this.render();
    } else if (act === 'create') this.h.onCreate(this.pick);
    else if (act === 'join') this.h.onJoin($('ol-code').value);
    else if (act === 'continue') this.h.onContinue();
    else if (act === 'leave') this.h.onLeave();
    else if (act === 'copy') this.copy();
    else if (act === 'google') this.h.onGoogle();
    else if (act === 'solo') this.h.onSolo();
    else if (act === 'forget') this.h.onForget();
    else if (act === 'ask-delete') {
      this.back = d;
      this.show('confirm', { act: 'delete', title: `Delete room ${d.code}?`, text: `Everything you two saved in room <b>${esc(d.code)}</b> goes with it, for both of you, and the code stops working. This cannot be undone.`, yes: 'Delete the room' });
    } else if (act === 'ask-free') {
      const n = esc(looks[d.other].name);
      const her = looks[d.other].gender === 'boy' ? 'his' : 'her';
      this.back = d;
      this.show('confirm', { act: 'free', title: `Free ${looks[d.other].name}'s seat?`, text: `Do this when ${n} has a new phone or lost ${her} seat. ${n}'s old phone will not get back in; on the new phone ${n} joins again with the code <b>${esc(d.code)}</b> and finds everything you saved.`, yes: 'Free the seat', no: 'Cancel' });
    } else if (act === 'back') this.show('room', { ...this.back, msg: '' });
    else if (act === 'do-delete') this.h.onDelete();
    else if (act === 'do-free') this.h.onFree();
    else if (act === 'share') navigator.share?.({ title: 'Roji World', text: `Come and play Roji World with me! Room ${d.code}`, url: d.link }).catch(() => {});
  }

  async copy() {
    const input = $('ol-link');
    const text = this.data.link;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      input?.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
    }
    this.msg(ok ? 'Link copied. Paste it in a message to send it.' : 'Select the link and copy it.', ok ? 'good' : 'bad');
  }

  // ---------------------------------------------------------------- the chip
  // state: 'live' | 'wait' | 'away' | 'off'
  chip(on, state = 'wait', text = '', who = null) {
    this.chipEl.classList.toggle('hidden', !on);
    document.body.classList.toggle('ol-in-room', on);
    if (!on) return;
    const key = `${state}|${text}|${who}`;
    if (key === this.chipKey) return;
    this.chipKey = key;
    this.chipEl.querySelector('.ol-dot').className = `ol-dot ${state}`;
    this.chipEl.querySelector('.ol-chip-t').textContent = text;
    this.chipEl.querySelector('.ol-av').innerHTML = who ? avatar(this.h.looks[who], 26) : svgIcon('together', 18);
  }

  // ---------------------------------------------------------------- invitations
  // { key, who, html, yes, no, ms, onYes, onNo, game }: one card at a time, the newest wins
  invite(o) {
    if (this.inv) this.inv.onGone?.();
    clearTimeout(this.invTimer);
    this.inv = o;
    this.inviteEl.classList.toggle('in-game', !!o.game); // a game invitation shows over a game too
    this.inviteEl.innerHTML = `${o.who ? `<span class="ol-av">${avatar(this.h.looks[o.who], 38)}</span>` : ''}<p>${o.html}</p><div class="ol-i-btns"><button class="btn primary" data-i="yes">${esc(o.yes || 'Yes')} <kbd>Y</kbd></button><button class="btn ghost" data-i="no">${esc(o.no || 'Not now')}</button></div>`;
    this.inviteEl.classList.remove('hidden');
    this.inviteEl.animate([{ translate: '0 -14px', opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,1.3,.4,1)' });
    this.invTimer = setTimeout(() => this.clearInvite(o.key, true), o.ms || 20000);
  }

  answer(yes) {
    const o = this.inv;
    if (!o) return;
    this.clearInvite(o.key);
    if (yes) o.onYes?.();
    else o.onNo?.();
  }

  // Take a card away (the moment has passed). expired: nobody answered.
  clearInvite(key = null, expired = false) {
    const o = this.inv;
    if (!o || (key && o.key !== key)) return;
    this.inv = null;
    clearTimeout(this.invTimer);
    this.inviteEl.classList.add('hidden');
    if (expired) o.onNo?.(true);
  }

  inviteKey() {
    return this.inv?.key || null;
  }
}
