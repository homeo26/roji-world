import { CELL, CRATE } from './data.js';

// The kitchen grid. Every tile is a cell: floor, or a station (counter, crate, board, hob, ...).
// Cells belong to sections: 0 never moves; food trucks and sliding tiles are sections with an offset.
// A cell's logical place (lc, lr) is its map place plus its section's offset rounded to whole tiles,
// and path finding works on that logical grid. World positions use the smooth offset.

const TYPE = { '.': 'floor', '~': 'floor', '|': 'wall', '#': 'counter', X: 'board', F: 'hob', H: 'hob', S: 'spit', W: 'sink', Y: 'rack', P: 'pass', Q: 'bin', J: 'blender', V: 'counter', '=': 'belt' };
const smooth = (k) => k * k * (3 - 2 * k);

export class World {
  constructor(level) {
    this.level = level;
    const rows = level.map;
    this.H = rows.length;
    this.W = Math.max(...rows.map((r) => r.length));
    this.cells = [];
    this.sections = [{ id: 0, x: 0, z: 0, lx: 0, lz: 0, dx: 0, dz: 0 }];
    const tr = level.trucks;
    if (tr) this.sections.push({ id: 1, x: 0, z: 0, lx: 0, lz: 0, dx: 0, dz: 0 }, { id: 2, x: 0, z: 0, lx: 0, lz: 0, dx: 0, dz: 0 });
    const sl = level.slider;
    if (sl) this.sections.push({ id: 1, x: 0, z: 0, lx: 0, lz: 0, dx: 0, dz: 0, slider: true });
    for (let r = 0; r < this.H; r++) {
      for (let c = 0; c < this.W; c++) {
        const ch = rows[r][c] || ' ';
        if (ch === ' ') continue;
        const sec = tr ? (c >= tr.left[0] && c <= tr.left[1] ? 1 : c >= tr.right[0] && c <= tr.right[1] ? 2 : 0) : 0;
        this.add(ch, c, r, sec);
      }
    }
    if (sl) for (let k = 0; k < sl.cells.length; k++) this.add(sl.cells[k], sl.at[0] + k, sl.row, 1);
    if (level.belt) {
      const list = level.belt.map(([c, r]) => this.cells.find((q) => q.c === c && q.r === r && q.type === 'belt'));
      list.forEach((q, i) => {
        q.next = list[i + 1] || null;
        q.prev = list[i - 1] || null;
        q.beltIndex = i;
      });
      this.belt = list;
    }
    this.secGrid = this.sections.map(() => Array.from({ length: this.H }, () => Array(this.W).fill(null)));
    for (const q of this.cells) {
      const g = this.secGrid[q.sec];
      if (!g[q.r][q.c] || (g[q.r][q.c].type === 'floor' && q.type !== 'floor')) g[q.r][q.c] = q;
    }
    // Moving things: food trucks drift apart, sliding tiles slide, the hatch opens.
    this.t = 0;
    this.truckK = 0;
    this.slideK = 0;
    this.slideFrom = 0;
    this.hatchK = 0;
    this.hatchOpen = false;
    this.warn = null; // { kind, t } a few seconds before something moves
    this.rebuild();
  }

  add(ch, c, r, sec) {
    const type = CRATE[ch] ? 'crate' : TYPE[ch] || 'counter';
    const q = {
      i: this.cells.length, ch, type, c, r, sec, lc: c, lr: r,
      ing: CRATE[ch] || null, hatch: ch === '~', item: null, fire: 0, fireT: 0, work: 0,
      rack: 0, dirty: 0, spit: ch === 'S' ? { portions: 0, roast: 0, slice: 0 } : null,
      start: ch === 'F' ? 'pan' : ch === 'H' ? 'pot' : ch === 'J' ? 'jug' : ch === 'V' ? 'ext' : null,
    };
    this.cells.push(q);
    return q;
  }

  // ---------------------------------------------------------------- positions
  baseX(c) {
    return (c - (this.W - 1) / 2) * CELL;
  }
  baseZ(r) {
    return (r - (this.H - 1) / 2) * CELL;
  }
  pos(q, out = { x: 0, z: 0 }) {
    const s = this.sections[q.sec];
    out.x = this.baseX(q.c) + s.x;
    out.z = this.baseZ(q.r) + s.z;
    return out;
  }
  // The top cell at a world point (moving sections first: a sliding counter covers the floor below).
  at(x, z) {
    for (let k = this.sections.length - 1; k >= 0; k--) {
      const s = this.sections[k];
      const c = Math.round((x - s.x) / CELL + (this.W - 1) / 2);
      const r = Math.round((z - s.z) / CELL + (this.H - 1) / 2);
      if (c < 0 || r < 0 || c >= this.W || r >= this.H) continue;
      const q = this.secGrid[k][r][c];
      if (q) return q;
    }
    return null;
  }
  walkCell(q) {
    return !!q && q.type === 'floor' && !(q.hatch && this.hatchK > 0.02);
  }
  walkable(x, z) {
    return this.walkCell(this.at(x, z));
  }
  // A chef of radius r fits here.
  fits(x, z, r) {
    if (!this.walkable(x, z)) return false;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      if (!this.walkable(x + Math.cos(a) * r, z + Math.sin(a) * r)) return false;
    }
    return true;
  }
  // Nearest spot where a chef fits, for chefs pushed by a sliding counter or an opening hatch.
  nearestFit(x, z, r, prefer = null) {
    if (this.fits(x, z, r)) return { x, z };
    for (let d = 0.15; d < 3.2; d += 0.15) {
      const n = Math.max(8, Math.round(d * 14));
      let best = null;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const px = x + Math.cos(a) * d;
        const pz = z + Math.sin(a) * d;
        if (!this.fits(px, pz, r)) continue;
        const score = prefer ? -(Math.cos(a) * prefer.x + Math.sin(a) * prefer.z) : 0;
        if (!best || score < best.s) best = { x: px, z: pz, s: score };
      }
      if (best) return best;
    }
    return { x, z };
  }

  // ---------------------------------------------------------------- the logical grid
  rebuild() {
    this.grid = Array.from({ length: this.H }, () => Array(this.W).fill(null));
    for (const q of this.cells) {
      const s = this.sections[q.sec];
      q.lc = q.c + s.lx;
      q.lr = q.r + s.lz;
      if (q.lc < 0 || q.lr < 0 || q.lc >= this.W || q.lr >= this.H) continue;
      const cur = this.grid[q.lr][q.lc];
      if (!cur || (cur.type === 'floor' && q.type !== 'floor') || (cur.type === q.type && q.sec > cur.sec)) this.grid[q.lr][q.lc] = q;
    }
    this.version = (this.version || 0) + 1;
  }
  cellAt(lc, lr) {
    return lr >= 0 && lc >= 0 && lr < this.H && lc < this.W ? this.grid[lr][lc] : null;
  }
  // Walkable floor tiles next to a station (4 sides), where a chef can stand to use it.
  standFor(q) {
    const out = [];
    for (const [dc, dr] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
      const n = this.cellAt(q.lc + dc, q.lr + dr);
      if (this.walkCell(n)) out.push(n);
    }
    return out;
  }
  // Which way a station faces: toward its first open floor side (for signs, taps and plaques).
  facing(q) {
    for (const [dc, dr] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
      const n = this.secGrid[q.sec][q.r + dr]?.[q.c + dc] || this.grid[q.lr + dr]?.[q.lc + dc];
      if (n && n.type === 'floor') return [dc, dr];
    }
    return [0, 1];
  }

  // Shortest path over the logical grid from one floor tile to any goal tile (8 ways, no corner cutting).
  path(from, goals, blocked = null) {
    if (!from || !goals.length) return null;
    const W = this.W;
    const key = (q) => q.lr * W + q.lc;
    const goal = new Set(goals.map(key));
    const dist = new Map([[key(from), 0]]);
    const prev = new Map();
    const open = [from];
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (dist.get(key(open[i])) < dist.get(key(open[bi]))) bi = i;
      const q = open.splice(bi, 1)[0];
      const kq = key(q);
      if (goal.has(kq)) {
        const out = [q];
        let k = kq;
        while (prev.has(k)) {
          const p = prev.get(k);
          out.unshift(p);
          k = key(p);
        }
        return out;
      }
      const d0 = dist.get(kq);
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const n = this.cellAt(q.lc + dc, q.lr + dr);
        if (!this.walkCell(n) || (blocked && blocked.has(key(n)) && !goal.has(key(n)))) continue;
        if (dc && dr && (!this.walkCell(this.cellAt(q.lc + dc, q.lr)) || !this.walkCell(this.cellAt(q.lc, q.lr + dr)))) continue;
        const nd = d0 + (dc && dr ? 1.41 : 1);
        const kn = key(n);
        if (nd < (dist.get(kn) ?? Infinity)) {
          if (!dist.has(kn)) open.push(n);
          dist.set(kn, nd);
          prev.set(kn, q);
        }
      }
    }
    return null;
  }
  // Floor tiles reachable from a tile (used to know which side of a split kitchen a chef is on).
  reach(from) {
    const seen = new Set();
    if (!this.walkCell(from)) return seen;
    const stack = [from];
    seen.add(from);
    while (stack.length) {
      const q = stack.pop();
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = this.cellAt(q.lc + dc, q.lr + dr);
        if (this.walkCell(n) && !seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
      }
    }
    return seen;
  }

  // ---------------------------------------------------------------- moving parts
  // Advances trucks, sliding tiles and the hatch. Returns true when the logical grid changed.
  update(dt) {
    this.t += dt;
    const L = this.level;
    for (const s of this.sections) {
      s.dx = 0;
      s.dz = 0;
    }
    this.warn = null;
    if (L.trucks) {
      const T = L.trucks;
      const cyc = T.together + T.apart + 2 * T.move;
      const u = this.t % cyc;
      let k;
      if (u < T.together) {
        k = 0;
        if (T.together - u < 3) this.warn = { kind: 'apart', t: T.together - u };
      } else if (u < T.together + T.move) k = smooth((u - T.together) / T.move);
      else if (u < T.together + T.move + T.apart) {
        k = 1;
        if (T.together + T.move + T.apart - u < 3) this.warn = { kind: 'together', t: T.together + T.move + T.apart - u };
      } else k = 1 - smooth((u - T.together - T.move - T.apart) / T.move);
      this.truckK = k;
      this.setOffset(1, -CELL * k, 0);
      this.setOffset(2, CELL * k, 0);
    }
    if (L.slider) {
      const S = L.slider;
      const span = (S.at[1] - S.at[0]) * CELL;
      const cyc = S.every;
      const n = Math.floor(this.t / cyc);
      const u = this.t - n * cyc;
      // even legs rest on the left, odd on the right; the slide happens at the start of each leg
      const from = n % 2 === 0 ? 1 : 0;
      const to = 1 - from;
      let k = n === 0 ? 0 : u < S.move ? smooth(u / S.move) : 1;
      const pos = n === 0 ? 0 : from + (to - from) * k;
      if (cyc - u < 3) this.warn = { kind: 'slide', t: cyc - u };
      this.slideK = pos;
      this.setOffset(1, span * pos, 0);
    }
    if (L.hatch) {
      const Hh = L.hatch;
      const cyc = Hh.closed + Hh.open + 2 * Hh.move;
      const u = (this.t + 4) % cyc;
      let k;
      if (u < Hh.closed) {
        k = 0;
        if (Hh.closed - u < 3) this.warn = { kind: 'hatch', t: Hh.closed - u };
      } else if (u < Hh.closed + Hh.move) k = (u - Hh.closed) / Hh.move;
      else if (u < Hh.closed + Hh.move + Hh.open) {
        k = 1;
        if (Hh.closed + Hh.move + Hh.open - u < 2.5) this.warn = { kind: 'hatchclose', t: Hh.closed + Hh.move + Hh.open - u };
      } else k = 1 - (u - Hh.closed - Hh.move - Hh.open) / Hh.move;
      const was = this.hatchK > 0.02;
      this.hatchK = k;
      if (was !== k > 0.02) {
        this.rebuildNeeded = true;
        this.version = (this.version || 0) + 1;
      }
    }
    let changed = false;
    for (const s of this.sections) {
      const lx = Math.round(s.x / CELL);
      const lz = Math.round(s.z / CELL);
      if (lx !== s.lx || lz !== s.lz) {
        s.lx = lx;
        s.lz = lz;
        changed = true;
      }
    }
    if (changed) this.rebuild();
    const hatchChanged = this.rebuildNeeded;
    this.rebuildNeeded = false;
    return changed || hatchChanged;
  }
  setOffset(i, x, z) {
    const s = this.sections[i];
    s.dx = x - s.x;
    s.dz = z - s.z;
    s.x = x;
    s.z = z;
  }

  // Bounds of everything that can ever be shown (for the camera), in world metres.
  bounds() {
    const L = this.level;
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    const grow = L.trucks ? CELL : 0;
    for (const q of this.cells) {
      const x = this.baseX(q.c);
      const z = this.baseZ(q.r);
      const g = q.sec === 1 && L.trucks ? -grow : q.sec === 2 ? grow : 0;
      x0 = Math.min(x0, x + Math.min(0, g) - CELL / 2);
      x1 = Math.max(x1, x + Math.max(0, g) + CELL / 2);
      z0 = Math.min(z0, z - CELL / 2);
      z1 = Math.max(z1, z + CELL / 2);
    }
    return { x0, x1, z0, z1 };
  }
}
