import { svgIcon } from '../icons.js';
import { avatar } from '../games/avatar.js';
import { CODE_CHARS } from './codes.js';

// The Play together window (make a room or join one), the status chip while in a room and the small
// invitation cards ("Homama wants to hold your hand"). The window lives in #online (index.html) so the
// game treats it like its other panels; the chip and the cards are added here.

const $ = (id) => document.getElementById(id);
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
  // h: { looks, playerId(), onCreate(who), onJoin(code), onLeave(), onCopy(text) }
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

  // view: 'start' | 'busy' | 'room'; data: { code, link, role, other, here, busy }
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
    let body = '';
    if (this.view === 'busy') {
      body = `${head('Play together')}<div class="ol-busy"><span class="ol-spin"></span>${esc(d.busy || 'One moment')}</div><p class="ol-msg"></p>`;
    } else if (this.view === 'room') {
      const other = looks[d.other];
      const share = navigator.share ? `<button class="btn" data-o="share">${svgIcon('share', 18)} Share</button>` : '';
      const status = d.here ? `<i class="ol-dot live"></i> ${esc(other.name)} is here. Have fun!` : d.role === 'host' ? `<i class="ol-dot wait"></i> Waiting for ${esc(other.name)} to join` : `<i class="ol-dot wait"></i> Waiting for ${esc(other.name)}`;
      body = `${head(d.role === 'host' ? 'Your room' : `${other.name}'s room`)}
        ${d.role === 'host' ? `<p class="ol-lead">Send this code or link to ${esc(other.name)}. Keep this page open while you play.</p>` : ''}
        <div class="ol-room">
          <div class="ol-code-big" aria-label="Room code">${[...d.code].map((c) => `<b>${c}</b>`).join('')}</div>
          ${d.role === 'host' ? `<div class="ol-link"><input id="ol-link" readonly value="${esc(d.link)}" aria-label="Link to the room" /><button class="btn primary" data-o="copy">${svgIcon('copy', 18)} Copy</button>${share}</div>` : ''}
        </div>
        <p class="ol-status">${status}</p>
        <div class="ol-foot"><button class="btn ghost" data-o="leave">Leave the room</button><button class="btn primary" data-o="close">${d.here ? 'Play' : 'Back to the island'}</button></div>
        <p class="ol-msg"></p>`;
    } else {
      const pickBtn = (id) => `<button class="ol-pick ${this.pick === id ? 'on' : ''}" data-o="pick:${id}" role="radio" aria-checked="${this.pick === id}">${avatar(looks[id], 46)}<span>${esc(looks[id].name)}</span></button>`;
      body = `${head('Play together')}
        <p class="ol-lead">Two phones or laptops, one island: one of you plays Roji and the other plays Homama.</p>
        <div class="ol-two">
          <section class="ol-box"><h4>Make a room</h4><div class="ol-picks" role="radiogroup" aria-label="Who do you play">${pickBtn('roji')}${pickBtn('homama')}</div><button class="btn primary" data-o="create">${svgIcon('together', 18)} Make a room</button></section>
          <section class="ol-box"><h4>Join a room</h4><label class="ol-label" for="ol-code">The code you got</label><input id="ol-code" class="ol-code" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="6" placeholder="ABC234" value="${esc(d.code || '')}" /><button class="btn primary" data-o="join" style="--c:#21a99a">${svgIcon('door', 18)} Join</button></section>
        </div>
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
    if (act === 'close') this.close();
    else if (act === 'pick') {
      this.pick = arg;
      this.render();
    } else if (act === 'create') this.h.onCreate(this.pick);
    else if (act === 'join') this.h.onJoin($('ol-code').value);
    else if (act === 'leave') this.h.onLeave();
    else if (act === 'copy') this.copy();
    else if (act === 'share') navigator.share?.({ title: 'Roji World', text: `Come and play Roji World with me! Room ${this.data.code}`, url: this.data.link }).catch(() => {});
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
  // { key, who, html, yes, no, ms, onYes, onNo }: one card at a time, the newest wins
  invite(o) {
    if (this.inv) this.inv.onGone?.();
    clearTimeout(this.invTimer);
    this.inv = o;
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
