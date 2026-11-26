// How each minigame is played together online (src/online/together.js) and how two results compare.
// kind: 'race' (lower time wins), 'duel' and 'board' (each plays the computer: a win beats a draw beats a
// loss), 'score' (higher score wins), 'coop' (the two scores add up), 'free' (no winner) and 'solo' (a game
// tied to one kid: the other player watches and cheers). unit names the score in the result card.
// A game's result is what it passes to ctx.finish() or ctx.end(): { win, title, score, opp, time, place,
// stars }, all optional; the more it gives, the better the two can be compared.
export const KINDS = {
  kartrace: { kind: 'race' },
  horserace: { kind: 'race' },
  skirace: { kind: 'race' },
  cyclerace: { kind: 'race' },
  swimrace: { kind: 'score', unit: 'stars' },
  bumpercars: { kind: 'score', unit: 'stars' },
  fencing: { kind: 'duel', unit: 'touches' },
  football: { kind: 'duel', unit: 'goals' },
  tictactoe: { kind: 'board' },
  connect4: { kind: 'board' },
  rps: { kind: 'board' },
  snakes: { kind: 'board' },
  memory: { kind: 'board' },
  cooking: { kind: 'coop', unit: 'coins' },
  parade: { kind: 'coop', unit: 'points' },
  fishing: { kind: 'coop', unit: 'stars' },
  logflume: { kind: 'coop', unit: 'points' },
  coaster: { kind: 'coop', unit: 'points' },
  ghosttrain: { kind: 'coop', unit: 'candy' },
  popcorn: { kind: 'score', unit: 'points' },
  pottery: { kind: 'score', unit: '%' },
  giraffes: { kind: 'score', unit: 'points' },
  parkgames: { kind: 'score', unit: 'points' },
  drawpad: { kind: 'free' },
  patients: { kind: 'solo', owner: 'roji', doing: 'is treating patients' },
  coding: { kind: 'solo', owner: 'homama', doing: 'is shipping code' },
  drivinglesson: { kind: 'solo', owner: 'roji', doing: 'is having a driving lesson' },
};

export const kindOf = (id) => ({ unit: 'points', ...(KINDS[id] || { kind: 'score' }) });

const ord = (n) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
export function fmtTime(s) {
  if (s >= 60) return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  return `${s.toFixed(1)} s`;
}
const unitText = (n, unit) => (unit === '%' ? `${n}%` : `${n} ${n === 1 ? unit.replace(/s$/, '') : unit}`);

// The few numbers worth sending from a result (JSON-safe, short)
export function cleanResult(r = {}) {
  const out = {};
  if (r.quit) out.quit = true;
  if (r.win === true || r.win === false || r.win === null) out.win = r.win;
  for (const k of ['score', 'opp', 'time', 'place', 'stars', 'of']) {
    const v = num(r[k]);
    if (v !== null) out[k] = Math.round(v * 100) / 100;
  }
  if (typeof r.title === 'string') out.title = r.title.replace(/<[^>]*>/g, '').slice(0, 60);
  return out;
}

// One player's result in a few words: "1st · 52.3 s", "Won 5 : 3", "12 points"
export function measure(res, K) {
  if (!res) return '';
  if (res.quit) return 'Left the game';
  const W = res.win === true ? 'Won' : res.win === false ? 'Lost' : res.win === null ? 'Draw' : '';
  const stars = res.stars != null ? unitText(res.stars, 'stars') : '';
  switch (K.kind) {
    case 'race':
      return [res.place ? ord(res.place) : '', res.time != null ? fmtTime(res.time) : ''].filter(Boolean).join(' · ') || W || res.title || 'Finished';
    case 'duel':
      return [W, res.score != null && res.opp != null ? `${res.score} : ${res.opp}` : ''].filter(Boolean).join(' ') || res.title || 'Finished';
    case 'board':
      return W || res.title || 'Finished';
    case 'free':
      return res.title || 'Finished';
    default:
      if (res.score != null) return K.unit === 'stars' ? unitText(res.score, 'stars') : unitText(res.score, K.unit);
      return stars || W || res.title || 'Finished';
  }
}

const rank = (w) => (w === true ? 2 : w === null ? 1 : w === false ? 0 : -1);
// -1: a is better, 1: b is better, 0: the same, null: cannot tell
function order(K, a, b) {
  const cmp = (x, y, lower) => (x === y ? 0 : (x < y) === lower ? -1 : 1);
  if (K.kind === 'race') {
    if (a.time != null && b.time != null) return cmp(a.time, b.time, true);
    if (a.place && b.place) return cmp(a.place, b.place, true);
  } else if (K.kind === 'duel' || K.kind === 'board') {
    if (rank(a.win) !== rank(b.win) && rank(a.win) >= 0 && rank(b.win) >= 0) return rank(a.win) > rank(b.win) ? -1 : 1;
    if (a.score != null && b.score != null && a.opp != null && b.opp != null) return cmp(a.score - a.opp, b.score - b.opp, false);
    if (rank(a.win) >= 0 && rank(b.win) >= 0) return 0;
  } else {
    if (a.score != null && b.score != null) return cmp(a.score, b.score, false);
    if (a.stars != null && b.stars != null) return cmp(a.stars, b.stars, false);
  }
  if (rank(a.win) >= 0 && rank(b.win) >= 0 && rank(a.win) !== rank(b.win)) return rank(a.win) > rank(b.win) ? -1 : 1;
  return null;
}

// The banner over both results. mine / theirs: results (or null while still playing); names: { me, them }.
// Returns { text, who: 'me' | 'them' | 'tie' | 'both' | null }
export function compare(K, mine, theirs, names) {
  if (!mine || !theirs) return { text: '', who: null };
  if (mine.quit && theirs.quit) return { text: '', who: null };
  if (theirs.quit) return { text: `${names.them} left the game`, who: 'me' };
  if (mine.quit) return { text: `${names.me} left the game`, who: 'them' };
  if (K.kind === 'coop') {
    const a = mine.score ?? mine.stars;
    const b = theirs.score ?? theirs.stars;
    const unit = mine.score != null && theirs.score != null ? K.unit : 'stars';
    if (a != null && b != null) return { text: `Together: ${unitText(Math.round((a + b) * 100) / 100, unit === '%' ? 'points' : unit)}`, who: 'both' };
    return { text: 'What a team!', who: 'both' };
  }
  if (K.kind === 'free') return { text: 'Lovely work, both of you!', who: 'both' };
  const o = order(K, mine, theirs);
  if (o === null) return { text: 'Well played, both of you!', who: 'both' };
  if (o === 0) return { text: mine.win === true && (K.kind === 'board' || K.kind === 'duel') ? 'You both won!' : "It's a tie!", who: 'tie' };
  // Each played the computer too, so the banner says what the two of them compare on
  const said = K.kind === 'race' ? 'was faster!' : K.kind === 'score' ? 'scored more!' : 'wins!';
  return o < 0 ? { text: `${names.me} ${said}`, who: 'me' } : { text: `${names.them} ${said}`, who: 'them' };
}
