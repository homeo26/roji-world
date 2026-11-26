import { ING, BREW, DISH, partKey } from './data.js';

// The kitchen played together online: the starter's copy runs the shift (orders, coins, food, the
// clock) and sends what the kitchen looks like a few times a second in a few short strings; the other
// copy shows it and moves only its own chef. These turn the kitchen into those strings and back.

// Every part a plate, a pan, a pot or a jug can hold, by a two-letter code
const PARTS = (() => {
  const out = new Set();
  for (const id of Object.keys(ING)) for (const st of ['raw', 'chopped', 'cooked', 'sliced', 'burnt']) out.add(partKey(id, st));
  for (const b of Object.keys(BREW)) out.add(b);
  out.add('burnt');
  return [...out];
})();
const CODE = new Map(PARTS.map((p, i) => [p, i.toString(36).padStart(2, '0')]));
const enc = (p) => CODE.get(p) || 'zz';
const dec = (c) => PARTS[parseInt(c, 36)] || null;
const pairs = (s) => (s ? s.match(/../g) || [] : []).map(dec).filter(Boolean);
const KIND = { ing: 'i', plate: 'p', pan: 'n', pot: 'o', jug: 'j', ext: 'e' };
const KIND_OF = Object.fromEntries(Object.entries(KIND).map(([k, v]) => [v, k]));
const DISHES = Object.keys(DISH);
const n36 = (v) => (v ? Math.round(v).toString(36) : '');
const r36 = (s) => (s ? parseInt(s, 36) || 0 : 0);
const trim = (a) => {
  while (a.length && (a[a.length - 1] === '' || a[a.length - 1] === undefined)) a.pop();
  return a.join(',');
};

// ------------------------------------------------------------------ food, plates and pans
// "uid,kind+parts,where,cook,over,chop,burn,belt,flags" per item (where: a cell index, or r / h in a
// chef's hands); fine: false leaves out the cooking progress when the string gets long
export function encodeItems(S, fine = true) {
  const out = [];
  for (const it of S.items) {
    const loc = it.cell ? String(it.cell.i) : it.holder ? (it.holder.id === 'roji' ? 'r' : 'h') : null;
    if (loc === null) continue;
    const body = it.kind === 'ing' ? enc(partKey(it.id, it.state)) : it.kind === 'plate' ? it.parts.map(enc).join('') : it.contents.map(enc).join('');
    const flags = (it.dirty ? 'd' : '') + (it.done ? `D${enc(it.done)}` : '');
    const f = [it.uid.toString(36), KIND[it.kind] + body, loc];
    if (fine) f.push(n36(it.cook * 10), n36(it.over * 10), n36(it.chop * 100), it.burnT ? Math.round(it.burnT * 10).toString(36) : '', n36(it.beltT * 100), flags);
    else f.push('', '', '', '', '', flags);
    out.push(trim(f));
  }
  return out.join(';');
}

export function decodeItems(str) {
  const out = [];
  for (const row of (str || '').split(';')) {
    if (!row) continue;
    const [u, kb, loc, cook, over, chop, burn, belt, flags = ''] = row.split(',');
    const kind = KIND_OF[kb?.[0]];
    if (!kind) continue;
    const parts = pairs(kb.slice(1));
    const d = { uid: r36(u), kind, id: null, state: 'raw', parts: [], contents: [], loc: /^\d+$/.test(loc) ? +loc : loc === 'r' ? 'roji' : loc === 'h' ? 'homama' : null, cook: r36(cook) / 10, over: r36(over) / 10, chop: r36(chop) / 100, burnT: burn ? parseInt(burn, 36) / 10 : 0, beltT: r36(belt) / 100, dirty: flags.includes('d'), done: null };
    if (d.loc === null) continue;
    const di = flags.indexOf('D');
    if (di >= 0) d.done = dec(flags.slice(di + 1, di + 3));
    if (kind === 'ing') {
      const [id, state = 'raw'] = (parts[0] || '').split(':');
      if (!ING[id]) continue;
      d.id = id;
      d.state = state;
    } else if (kind === 'plate') d.parts = parts;
    else d.contents = parts;
    out.push(d);
  }
  return out;
}

// Make the other copy's food match the starter's (chefs: { roji, homama } chef objects)
export function applyItems(S, list, chefs) {
  const byUid = new Map([...S.items].map((it) => [it.uid, it]));
  const keep = new Set();
  for (const d of list) {
    let it = byUid.get(d.uid);
    if (!it || it.kind !== d.kind) {
      if (it) S.remove(it);
      it = S.make(d.kind, d.id, d.state);
      it.uid = d.uid;
      byUid.set(d.uid, it);
    }
    keep.add(it);
    const changed = it.id !== d.id || it.state !== d.state || it.dirty !== d.dirty || it.done !== d.done || it.parts.join() !== d.parts.join() || it.contents.join() !== d.contents.join();
    if (it.kind === 'ing') {
      it.id = d.id;
      it.state = d.state;
    }
    it.parts = d.parts;
    it.contents = d.contents;
    it.dirty = d.dirty;
    it.done = d.done;
    it.cook = d.cook;
    it.over = d.over;
    it.chop = d.chop;
    it.burnT = d.burnT;
    if (changed || ((it.kind === 'pan' || it.kind === 'pot' || it.kind === 'jug') && it.contents.length)) S.refresh(it);
    if (typeof d.loc === 'number') {
      const q = S.world.cells[d.loc];
      if (q && (it.cell !== q || q.item !== it)) S.place(it, q);
      if (q?.type === 'belt') it.beltT = d.beltT;
    } else {
      const c = chefs[d.loc];
      if (c && (it.holder !== c || c.held !== it)) S.hold(c, it);
    }
    // on the heat (for the steam, the sizzle and the burner glow)
    const q = it.cell;
    it.heat = !!q && q.fire <= 0 && ((q.type === 'hob' && (it.kind === 'pan' || it.kind === 'pot')) || (q.type === 'blender' && it.kind === 'jug')) && it.contents.length > 0;
  }
  for (const it of [...S.items]) if (!keep.has(it)) S.remove(it);
  // whatever a chef still holds that is not theirs any more
  for (const c of S.chefs) if (c.held && !keep.has(c.held)) c.held = null;
}

// ------------------------------------------------------------------ stations: fire, the spit, the sink, the rack
export function encodeCells(S) {
  const out = [];
  for (const q of S.world.cells) {
    const sp = q.spit;
    const busy = q.fire > 0 || q.work > 0 || q.dirty || q.type === 'rack' || (sp && (sp.portions || sp.roast || sp.slice));
    if (!busy) continue;
    out.push(trim([q.i, n36(q.fire * 100), n36(q.fireT * 10), n36(q.work * 100), n36(q.dirty), n36(q.rack), sp ? n36(sp.portions) : '', sp ? n36(sp.roast * 100) : '', sp ? n36(sp.slice * 100) : ''].map(String)));
  }
  return out.join(';');
}

export function applyCells(S, str) {
  const seen = new Set();
  for (const row of (str || '').split(';')) {
    if (!row) continue;
    const [i, fire, fireT, work, dirty, rack, por, roast, slice] = row.split(',');
    const q = S.world.cells[+i];
    if (!q) continue;
    seen.add(q);
    q.fire = r36(fire) / 100;
    q.fireT = r36(fireT) / 10;
    q.work = r36(work) / 100;
    q.dirty = r36(dirty);
    q.rack = r36(rack);
    if (q.spit) Object.assign(q.spit, { portions: r36(por), roast: r36(roast) / 100, slice: r36(slice) / 100 });
  }
  for (const q of S.world.cells) {
    if (seen.has(q)) continue;
    q.fire = 0;
    q.work = 0;
    q.dirty = 0;
    if (q.type === 'rack') q.rack = 0;
    if (q.spit) Object.assign(q.spit, { portions: 0, roast: 0, slice: 0 });
  }
}

// ------------------------------------------------------------------ the order tickets
export const encodeOrders = (S) => S.orders.map((o) => `${o.id.toString(36)}.${DISHES.indexOf(o.dish)}.${Math.max(0, Math.round(o.t * 10)).toString(36)}.${o.total.toString(36)}`).join(';');
export const decodeOrders = (str) =>
  (str || '')
    .split(';')
    .filter(Boolean)
    .map((r) => {
      const [id, d, t, total] = r.split('.');
      return { id: r36(id), dish: DISHES[+d], t: r36(t) / 10, total: r36(total) || 1 };
    })
    .filter((o) => o.dish);
export const dishIndex = (d) => DISHES.indexOf(d);
export const dishAt = (i) => DISHES[i] || null;
