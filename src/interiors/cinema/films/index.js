import { P, hash, fade, text, heart, rr, star5, leader } from './common.js';
import twostars from './twostars.js';
import creaky from './creaky.js';
import penguin from './penguin.js';
import rocket from './rocket.js';
import mishmish from './mishmish.js';
import ourmovie from './ourmovie.js';

// The cinema programme: five short films plus a secret one that unlocks after watching three.
// Also draws the posters, the trailer reel between shows, the "Now showing" board, tickets and stubs.

export const FILMS = [twostars, creaky, penguin, rocket, mishmish, ourmovie];
export const byId = Object.fromEntries(FILMS.map((f) => [f.id, f]));
export const UNLOCK = 3; // films to watch before the secret one appears
export { leader };

const GENRE_COLOR = { Romance: '#ef5b6f', Horror: '#8b5cf6', Comedy: '#3f7bf0', Adventure: '#f08a2d', Cartoon: '#21a99a', 'Secret film': '#c2405a' };
export const genreColor = (f) => GENRE_COLOR[f.genre] || '#ef5b6f';
export const shortTitle = (f) => f.short || f.title;

// A film poster, w x h pixels (256 x 358 in the posters). locked: the secret film before it unlocks.
export function drawFilmPoster(ctx, w, h, film, { locked = false, watched = 0, S = {} } = {}) {
  const s = w / 256;
  if (locked) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3a2350');
    g.addColorStop(1, '#1d1230');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,214,230,0.5)';
    for (let i = 0; i < 16; i++) ctx.fillRect(hash(i) * w, hash(i * 3) * h, 2.5 * s, 2.5 * s);
    heart(ctx, w / 2, h * 0.4, 120 * s, '#ef5b6f', 0.9);
    text(ctx, '?', w / 2, h * 0.38, 80 * s, '#fff6e6');
    text(ctx, 'SECRET FILM', w / 2, h * 0.07, 18 * s, '#ffd1dc', { weight: 600 });
    text(ctx, 'Coming soon', w / 2, h * 0.73, 30 * s, '#fff6e6');
    text(ctx, `Watch ${UNLOCK} films to unlock`, w / 2, h * 0.82, 16 * s, '#ffd1dc', { weight: 600, maxW: w * 0.86 });
    for (let i = 0; i < UNLOCK; i++) {
      ctx.fillStyle = i < watched ? '#ffd166' : 'rgba(255,255,255,0.25)';
      star5(ctx, w / 2 + (i - 1) * 30 * s, h * 0.9, 10 * s, 4.5 * s);
      ctx.fill();
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, film.poster.bg[0]);
    g.addColorStop(1, film.poster.bg[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    film.poster.art(ctx, w, h, S);
    ctx.restore();
    const dark = film.poster.dark;
    text(ctx, film.tag.toUpperCase(), w / 2, h * 0.065, 17 * s, dark ? '#ffd166' : '#ffffff', { weight: 600, maxW: w * 0.86 });
    const words = film.title.split(' ');
    const two = film.title.length > 13;
    const cut = two ? Math.ceil(words.length / 2) : words.length;
    const lines = two ? [words.slice(0, cut).join(' '), words.slice(cut).join(' ')] : [film.title];
    ctx.fillStyle = dark ? 'rgba(20,12,36,0.55)' : 'rgba(255,250,243,0.78)';
    rr(ctx, w * 0.06, h * (two ? 0.74 : 0.78), w * 0.88, h * (two ? 0.2 : 0.14), 14 * s);
    ctx.fill();
    lines.forEach((l, i) => text(ctx, l, w / 2, h * (two ? 0.8 + i * 0.085 : 0.85), 30 * s, dark ? '#fff6dc' : genreColor(film), { maxW: w * 0.8 }));
  }
  ctx.strokeStyle = '#f4c24f';
  ctx.lineWidth = 8 * s;
  ctx.strokeRect(4 * s, 4 * s, w - 8 * s, h - 8 * s);
}

// Between shows the screen plays trailers of every film that is open.
export const REEL = 6.5;
export function drawReel(ctx, W, H, t, films, S) {
  const n = films.length;
  const i = Math.floor(t / REEL) % n;
  const u = t % REEL;
  const f = films[i];
  f.draw(ctx, W, H, f.trailer + u, S);
  // The title band
  ctx.fillStyle = 'rgba(20,12,30,0.8)';
  rr(ctx, W * 0.16, H * 0.72, W * 0.68, H * 0.24, 16);
  ctx.fill();
  text(ctx, 'NOW SHOWING', W / 2, H * 0.765, H * 0.045, '#ffd166', { weight: 700 });
  text(ctx, f.title, W / 2, H * 0.835, H * 0.075, '#fff6e6', { maxW: W * 0.62 });
  text(ctx, `${f.genre}  ·  ${f.len} seconds`, W / 2, H * 0.905, H * 0.045, genreColor(f) === '#3f7bf0' ? '#9fc4ff' : '#ffc2d4', { weight: 600 });
  fade(ctx, W, H, Math.max(u < 0.4 ? 1 - u / 0.4 : 0, u > REEL - 0.4 ? (u - (REEL - 0.4)) / 0.4 : 0));
}

// The "Now showing" letter board on the easel in the lobby.
export function drawProgramme(ctx, w, h, { unlocked = false, watched = new Set() } = {}) {
  ctx.fillStyle = '#2a1a30';
  rr(ctx, 0, 0, w, h, 26);
  ctx.fill();
  ctx.strokeStyle = '#f4c24f';
  ctx.lineWidth = 10;
  rr(ctx, 10, 10, w - 20, h - 20, 20);
  ctx.stroke();
  text(ctx, 'NOW SHOWING', w / 2, h * 0.1, h * 0.065, '#ffd166');
  ctx.fillStyle = '#f4c24f';
  ctx.fillRect(w * 0.14, h * 0.15, w * 0.72, 3);
  const list = FILMS.filter((f) => !f.secret);
  const rows = [...list, ourmovie];
  rows.forEach((f, i) => {
    const y = h * (0.23 + i * 0.12);
    const secretLocked = f.secret && !unlocked;
    const c = secretLocked ? '#8a7a9a' : genreColor(f);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(w * 0.12, y, h * 0.022, 0, P * 2);
    ctx.fill();
    text(ctx, secretLocked ? 'A secret film' : shortTitle(f), w * 0.18, y - h * 0.012, h * 0.045, secretLocked ? '#b8a8c8' : '#fff6e6', { align: 'left', maxW: w * 0.62 });
    text(ctx, secretLocked ? `after ${UNLOCK} films` : f.genre, w * 0.18, y + h * 0.035, h * 0.03, secretLocked ? '#8a7a9a' : c, { align: 'left', weight: 600, maxW: w * 0.6 });
    if (watched.has(f.id)) {
      ctx.fillStyle = '#ffd166';
      star5(ctx, w * 0.88, y, h * 0.025, h * 0.011);
      ctx.fill();
    }
  });
  text(ctx, 'Seats for two in row three', w / 2, h * 0.94, h * 0.032, '#ffc2d4', { weight: 600 });
}

// A ticket for two with the film name. stub: the torn half pinned on the board afterwards.
export function drawTicket(ctx, w, h, film, { date = '', stub = false, n = 0, bg = null } = {}) {
  const c = film ? genreColor(film) : '#ef5b6f';
  ctx.fillStyle = stub ? ['#ffe9b8', '#ffd1dc', '#d8f3e6', '#e3dcff'][n % 4] : '#ffd166';
  rr(ctx, 0, 0, w, h, h * 0.16);
  ctx.fill();
  // Notches (painted in the colour behind the ticket) and a dotted tear line
  if (bg) {
    ctx.fillStyle = bg;
    for (const y of [0, h]) {
      ctx.beginPath();
      ctx.arc(w * 0.74, y, h * 0.14, 0, P * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(107,31,51,0.45)';
  ctx.setLineDash([h * 0.06, h * 0.06]);
  ctx.lineWidth = Math.max(1.5, h * 0.03);
  ctx.beginPath();
  ctx.moveTo(w * 0.74, h * 0.16);
  ctx.lineTo(w * 0.74, h * 0.84);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = c;
  ctx.fillRect(0, 0, w * 0.05, h);
  text(ctx, 'ADMIT TWO', w * 0.4, h * 0.2, h * 0.13, '#6b1f33', { weight: 600, maxW: w * 0.6 });
  text(ctx, film ? shortTitle(film) : 'Movie night', w * 0.4, h * 0.48, h * 0.2, '#4a1a2a', { maxW: w * 0.62 });
  text(ctx, date || 'Row 3, the love seat', w * 0.4, h * 0.78, h * 0.12, '#7a4a5a', { weight: 600, maxW: w * 0.62 });
  heart(ctx, w * 0.87, h * 0.42, h * 0.32, c);
  text(ctx, 'R + H', w * 0.87, h * 0.78, h * 0.12, '#6b1f33', { maxW: w * 0.22 });
}

// Ticket stubs from their past dates, already pinned on the board before the first visit.
export const PAST_STUBS = [
  { title: 'Moon Bunny', date: 'Our first movie' },
  { title: 'Panda Picnic', date: 'Sat, rainy day' },
  { title: 'Kitty Detective', date: 'She guessed it' },
];

// The cork board of stubs. stubs: [{ id, date }] newest last.
export function drawStubBoard(ctx, w, h, stubs) {
  ctx.fillStyle = '#c98a5a';
  rr(ctx, 0, 0, w, h, 18);
  ctx.fill();
  ctx.fillStyle = '#e0b07a';
  rr(ctx, 14, 14, w - 28, h - 28, 10);
  ctx.fill();
  ctx.fillStyle = 'rgba(150,100,60,0.35)';
  for (let i = 0; i < 160; i++) ctx.fillRect(14 + hash(i) * (w - 28), 14 + hash(i * 3.3) * (h - 28), 3, 3);
  ctx.fillStyle = '#fff4e6';
  rr(ctx, w * 0.14, 24, w * 0.72, h * 0.1, 10);
  ctx.fill();
  text(ctx, 'Our date nights', w / 2, 24 + h * 0.05, h * 0.055, '#6b1f33', { maxW: w * 0.66 });
  const all = [...PAST_STUBS.map((p) => ({ film: { title: p.title, genre: '' }, date: p.date })), ...stubs.map((s) => ({ film: byId[s.id], date: s.date }))].slice(-8);
  const sw = w * 0.42;
  const sh = sw * 0.46;
  all.forEach((st, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = w * (0.06 + col * 0.47) + (hash(i) - 0.5) * 8;
    const y = h * 0.18 + row * h * 0.19;
    ctx.save();
    ctx.translate(x + sw / 2, y + sh / 2);
    ctx.rotate((hash(i * 7) - 0.5) * 0.16);
    ctx.translate(-sw / 2, -sh / 2);
    drawTicket(ctx, sw, sh, st.film, { date: st.date, stub: true, n: i, bg: '#e0b07a' });
    ctx.fillStyle = ['#ef5b6f', '#3f7bf0', '#ffd166', '#21a99a'][i % 4];
    ctx.beginPath();
    ctx.arc(sw * 0.4, 4, 5, 0, P * 2);
    ctx.fill();
    ctx.restore();
  });
  // A dotted space waiting for the next date's stub
  if (all.length < 8) {
    const i = all.length;
    const x = w * (0.06 + (i % 2) * 0.47);
    const y = h * 0.18 + Math.floor(i / 2) * h * 0.19;
    ctx.strokeStyle = 'rgba(107,31,51,0.4)';
    ctx.setLineDash([8, 7]);
    ctx.lineWidth = 3;
    rr(ctx, x, y, sw, sh, sh * 0.16);
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, 'Our next date', x + sw / 2, y + sh / 2, sh * 0.2, 'rgba(107,31,51,0.55)', { weight: 600, maxW: sw * 0.85 });
  }
  // A tiny doodle of the two of them in the corner
  ctx.fillStyle = '#fff4e6';
  ctx.beginPath();
  ctx.arc(w * 0.86, h * 0.92, 14, 0, P * 2);
  ctx.fill();
  heart(ctx, w * 0.86, h * 0.92, 12, '#ef5b6f');
}
