import { ING, DISH, BREW, partKey, PAN_BURN, POT_BURN } from './data.js';
import { SPEED } from './sim.js';

// The computer chef. It reads the orders, works out which parts are still missing (chopped tomato,
// a cooked patty, a pot of soup), counts what is already on its way, and does the most useful next job:
// put out a fire, rescue a pan before it burns, chop, fetch, cook, wash plates. As the helper it leaves
// plating and serving to you; in 'full' mode (two computer chefs, for tests) it plates and serves too.

const minus = (need, have) => {
  const left = [...need];
  for (const p of have) {
    const i = left.indexOf(p);
    if (i >= 0) left.splice(i, 1);
  }
  return left;
};
const subset = (have, need) => {
  const left = [...need];
  for (const p of have) {
    const i = left.indexOf(p);
    if (i < 0) return false;
    left.splice(i, 1);
  }
  return true;
};
const count = (list, p) => list.reduce((n, x) => n + (x === p ? 1 : 0), 0);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const P_done = (sim, plate) => sim.menu.some((d) => DISH[d].parts.length === plate.parts.length && minus(DISH[d].parts, plate.parts).length === 0);
const LINES = {
  fire: ['Fire! I have got it!', 'On it!', 'Leave the fire to me!'],
  serve: ['Order up!', 'Service!', 'Here it comes!'],
  wash: ['Clean plates coming!', 'Washing up!'],
  give: ['Here you go!', 'One more for you!', 'Ready for you!'],
};

export class Brain {
  constructor(sim, chef, profile = 'helper') {
    this.sim = sim;
    this.chef = chef;
    this.profile = profile;
    this.job = null;
    this.thinkT = 0.3 + Math.random() * 0.3;
    this.intent = null;
    this.lineI = 0;
  }
  get W() {
    return this.sim.world;
  }
  other() {
    return this.sim.chefs.find((c) => c !== this.chef);
  }
  say(kind, chance = 1) {
    const c = this.chef;
    if (c.sayT > 0 || Math.random() > chance) return;
    c.sayT = 6;
    const l = LINES[kind];
    this.sim.emit('say', { chef: c, text: l[this.lineI++ % l.length] });
  }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    const c = this.chef;
    const k = c.ctrl;
    k.ax = k.az = 0;
    k.use = false;
    k.work = false;
    k.face = null;
    if (!this.sim.running) {
      this.job = null;
      k.target = null;
      return;
    }
    if (this.detour) {
      if (this.step(this.detour, dt) !== 'run') this.detour = null;
      return;
    }
    if (this.yieldCheck(dt)) return;
    if (!this.job) {
      this.thinkT -= dt;
      if (this.thinkT > 0) {
        this.idle(dt);
        return;
      }
      this.thinkT = 0.15;
      this.job = this.think();
      if (this.sim.log && this.job) this.sim.log.push(`${this.sim.clock.toFixed(1)} ${this.chef.id} ${this.job.name}`);
      if (!this.job) {
        this.intent = null;
        this.idle(dt);
        return;
      }
      this.job.i = 0;
    }
    const j = this.job;
    const s = j.steps[j.i];
    if (!s) return this.endJob();
    const r = this.step(s, dt);
    if (r === 'done') {
      if (this.sim.log && this.sim.logSteps) this.sim.log.push(`${this.sim.clock.toFixed(1)} ${this.chef.id}   ${j.name} step ${j.i} ${Object.keys(s).find((k) => ['go', 'use', 'work', 'wait'].includes(k))} done t=${s.t.toFixed(2)}`);
      j.i++;
      if (j.i >= j.steps.length) this.endJob();
    } else if (r === 'fail') {
      if (this.sim.log) this.sim.log.push(`${this.sim.clock.toFixed(1)} ${this.chef.id} FAIL ${j.name} step ${j.i} t=${s.t.toFixed(2)} held=${this.chef.held?.kind || '-'} tgt=${this.sim.target(this.chef)?.type} item=${(s.work || s.use || s.go)?.item?.kind}:${(s.work || s.use || s.go)?.item?.state}:${(s.work || s.use || s.go)?.item?.chop?.toFixed(2)} working=${this.chef.working}`);
      this.endJob();
    }
  }
  endJob() {
    if (this.job?.claim) for (const x of this.job.claim) if (x.claim === this.chef.id) x.claim = null;
    this.job = null;
    this.intent = null;
    this.chef.ctrl.target = null;
  }
  // A person walking into the computer chef: it steps aside.
  yieldCheck(dt) {
    const o = this.other();
    if (!o || o.ctrlKind === 'ai') return false;
    const c = this.chef;
    const d = Math.hypot(o.x - c.x, o.z - c.z);
    const toward = (o.vx * (c.x - o.x) + o.vz * (c.z - o.z)) / Math.max(d, 0.01);
    this.crowd = d < 0.75 && toward > 1.2 ? (this.crowd || 0) + dt : 0;
    if (this.crowd < 0.35) return false;
    this.crowd = 0;
    const here = this.W.at(c.x, c.z);
    if (!here) return false;
    let best = null;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const n = this.W.cellAt(here.lc + dc, here.lr + dr);
      if (!this.W.walkCell(n)) continue;
      const p = this.W.pos(n);
      const away = Math.hypot(p.x - o.x, p.z - o.z);
      const side = Math.abs((p.x - o.x) * o.vz - (p.z - o.z) * o.vx) / Math.max(0.1, Math.hypot(o.vx, o.vz));
      const score = away + side * 0.8;
      if (!best || score > best.s) best = { n, s: score };
    }
    if (!best) return false;
    this.detour = { go: best.n, floor: true };
    if (Math.random() < 0.5) this.sim.emit('say', { chef: c, text: 'Behind!' });
    return true;
  }
  idle(dt) {
    // stand clear of the other chef and of the pass
    const c = this.chef;
    const o = this.other();
    this.idleT = (this.idleT || 0) + dt;
    if (!o || this.idleT < 0.8) return;
    if (Math.hypot(o.x - c.x, o.z - c.z) > 1.3) return;
    this.idleT = 0;
    const here = this.W.at(c.x, c.z);
    const reach = this.W.reach(here);
    let best = null;
    for (const n of reach) {
      const p = this.W.pos(n);
      const d = Math.hypot(p.x - o.x, p.z - o.z);
      const m = Math.hypot(p.x - c.x, p.z - c.z);
      if (d < 2) continue;
      const s = m;
      if (!best || s < best.s) best = { n, s };
    }
    if (best) this.detour = { go: best.n, floor: true };
  }

  // ---------------------------------------------------------------- steps
  // { go: cell } walk next to a station (or onto a floor tile when floor: true), then face it.
  // { use: cell } press pick up / put down. { work: cell, until(), max } hold the work button.
  step(s, dt) {
    const c = this.chef;
    const k = c.ctrl;
    s.t = (s.t || 0) + dt;
    if (s.ok && !s.ok()) return 'fail';
    if (s.go) return this.walk(s, dt);
    if (s.use) {
      k.target = s.use;
      this.face(s.use);
      if (!this.facing(s.use)) return s.t > 0.8 ? 'fail' : 'run';
      k.use = true;
      return 'done';
    }
    if (s.work) {
      k.target = s.work;
      this.face(s.work);
      // pushed off the spot (by the other chef): step back to the station while working
      const st = this.standNear(s.work);
      if (st) {
        const p = this.W.pos(st);
        const d = Math.hypot(p.x - c.x, p.z - c.z);
        if (d > 0.22) {
          k.ax = ((p.x - c.x) / d) * Math.min(1, d / 0.4);
          k.az = ((p.z - c.z) / d) * Math.min(1, d / 0.4);
        }
      }
      k.work = this.facing(s.work, 0.6);
      if (s.until?.()) return 'done';
      return s.t > (s.max || 6) ? 'fail' : 'run';
    }
    if (s.wait) return s.until?.() || s.t > s.wait ? 'done' : 'run';
    return 'done';
  }
  standNear(q) {
    let best = null;
    for (const f of this.W.standFor(q)) {
      const p = this.W.pos(f);
      const d = Math.hypot(p.x - this.chef.x, p.z - this.chef.z);
      if (!best || d < best.d) best = { f, d };
    }
    return best?.f || null;
  }
  face(q) {
    const p = this.W.pos(q);
    this.chef.ctrl.face = Math.atan2(p.x - this.chef.x, p.z - this.chef.z);
  }
  facing(q, tol = 0.4) {
    const p = this.W.pos(q);
    return Math.abs(wrap(Math.atan2(p.x - this.chef.x, p.z - this.chef.z) - this.chef.yaw)) < tol;
  }
  walk(s, dt) {
    const W = this.W;
    const c = this.chef;
    const k = c.ctrl;
    const here = W.at(c.x, c.z);
    if (!here || here.type !== 'floor') return s.t > 1 ? 'fail' : 'run';
    if (!s.path || s.ver !== W.version || s.repath) {
      const goals = s.floor ? [s.go] : W.standFor(s.go);
      if (!goals.length) return 'fail';
      let blocked = null;
      if (s.repath) {
        blocked = new Set();
        const o = this.other();
        const oc = o && W.at(o.x, o.z);
        if (oc) blocked.add(oc.lr * W.W + oc.lc);
      }
      s.path = W.path(here, goals, blocked) || (blocked ? W.path(here, goals) : null);
      s.ver = W.version;
      s.repath = false;
      s.wi = 1;
      if (!s.path) return s.t > 1.2 ? 'fail' : 'run';
    }
    const path = s.path;
    const last = path.length - 1;
    if (s.wi > last) s.wi = last;
    const wp = path[s.wi] || path[last];
    const p = W.pos(wp);
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const d = Math.hypot(dx, dz);
    const final = s.wi >= last;
    if (!final && d < 0.32) {
      s.wi++;
      return 'run';
    }
    if (final && d < (s.floor ? 0.3 : 0.14)) {
      if (s.floor) return 'done';
      this.face(s.go);
      k.target = s.go;
      return this.facing(s.go) ? 'done' : 'run';
    }
    // steer: full speed between tiles, ease into the last one; on ice, brake against the slide
    const f = final ? Math.min(1, 0.3 + d / 0.5) : 1;
    let ax = (dx / d) * f;
    let az = (dz / d) * f;
    if (this.sim.level.ice) {
      ax += (ax - c.vx / SPEED) * 0.9;
      az += (az - c.vz / SPEED) * 0.9;
    }
    const m = Math.hypot(ax, az);
    if (m > 1) {
      ax /= m;
      az /= m;
    }
    k.ax = ax;
    k.az = az;
    // stuck behind someone: try another way, then give up
    s.best = Math.min(s.best ?? Infinity, d + (last - s.wi) * 2);
    const prog = d + (last - s.wi) * 2;
    if (prog < (s.mark ?? Infinity) - 0.06) {
      s.mark = prog;
      s.stuck = 0;
    } else s.stuck = (s.stuck || 0) + dt;
    if (s.stuck > 0.7 && !s.tried) {
      s.tried = true;
      s.repath = true;
      s.stuck = 0;
    }
    // two chefs blocking each other: the one without a finished dish steps aside
    const o = this.other();
    if (s.stuck > 1 && o && Math.hypot(o.x - c.x, o.z - c.z) < 1.4 && !s.sidestepped) {
      const mineDone = c.held?.kind === 'plate' && P_done(this.sim, c.held);
      const theirsDone = o.held?.kind === 'plate' && P_done(this.sim, o.held);
      const yieldNow = theirsDone || (!mineDone && (o.ctrlKind !== 'ai' || c.id === 'homama'));
      if (yieldNow) {
        s.sidestepped = true;
        let best = null;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          const n = W.cellAt(here.lc + dc, here.lr + dr);
          if (!W.walkCell(n)) continue;
          const p2 = W.pos(n);
          const away = Math.hypot(p2.x - o.x, p2.z - o.z);
          if (!best || away > best.a) best = { n, a: away };
        }
        if (best) {
          this.detour = { go: best.n, floor: true };
          s.path = null;
          s.stuck = 0;
          s.mark = Infinity;
          if (Math.random() < 0.5) this.sim.emit('say', { chef: c, text: 'After you!' });
          return 'run';
        }
      }
    }
    if (s.stuck > 2.6) {
      if (Math.random() < 0.6) this.sim.emit('say', { chef: c, text: 'Behind!' });
      return 'fail';
    }
    return 'run';
  }

  // ---------------------------------------------------------------- planning
  plan() {
    const S = this.sim;
    const W = this.W;
    const me = this.chef;
    const here = W.at(me.x, me.z);
    const reach = W.reach(here);
    const can = (q) => !!q && W.standFor(q).some((f) => reach.has(f));
    const mine = (x) => !x.claim || x.claim === me.id;
    const items = [...S.items];
    const plates = items.filter((it) => it.kind === 'plate' && !it.dirty && (it.cell || it.holder));
    // match plates to orders, oldest order first
    const used = new Set();
    const slots = S.orders.map((o) => {
      const need = DISH[o.dish].parts;
      let best = null;
      for (const p of plates) {
        if (used.has(p) || !subset(p.parts, need)) continue;
        if (!best || p.parts.length > best.parts.length || (p.parts.length === best.parts.length && p.cell && can(p.cell) && !(best.cell && can(best.cell)))) best = p;
      }
      if (best) used.add(best);
      return { o, plate: best, missing: minus(need, best ? best.parts : []) };
    });
    const demand = [];
    for (const s of slots) demand.push(...s.missing);
    // pots and jugs: what each one is making
    const vessels = items.filter((it) => it.kind === 'pot' || it.kind === 'jug');
    const brewOfVessel = (v) => {
      if (v.done) return v.contents[0] === v.done ? v.done : null;
      if (!v.contents.length || v.contents[0] === 'burnt') return null;
      return Object.keys(BREW).find((b) => BREW[b].vessel === v.kind && S.brews.includes(b) && minus(v.contents, BREW[b].needs).length === 0) || null;
    };
    const supply = [];
    const fills = [];
    for (const v of vessels) {
      const b = brewOfVessel(v);
      if (b) {
        supply.push(b);
        if (!v.done) fills.push({ v, brew: b, missing: minus(BREW[b].needs, v.contents) });
      }
    }
    for (const b of S.brews) {
      let def = count(demand, b) - count(supply, b);
      for (const v of vessels) {
        if (def <= 0) break;
        if (v.contents.length || v.holder || fills.some((f) => f.v === v)) continue;
        if (!(v.cell && (v.cell.type === 'hob' || v.cell.type === 'blender'))) continue;
        if (BREW[b].vessel !== v.kind) continue;
        fills.push({ v, brew: b, missing: [...BREW[b].needs], fresh: true });
        supply.push(b);
        def--;
      }
    }
    for (const f of fills) demand.push(...f.missing);
    // what is already on its way, for every part
    const others = S.chefs.filter((c) => c !== me);
    for (const it of items) {
      if (it.kind === 'ing') {
        const p = partKey(it.id, it.state);
        if (it.state === 'burnt') continue;
        supply.push(p);
        if (it.state === 'raw' && ING[it.id].chop) supply.push(`${it.id}:chopped`);
        if (it.id === 'patty' && it.state === 'raw') supply.push('patty:cooked');
        if (it.id === 'chicken' && it.state === 'raw') supply.push('chicken:sliced', 'chicken:sliced', 'chicken:sliced');
      }
      if (it.kind === 'pan' && (it.contents[0] === 'patty' || it.contents[0] === 'patty:cooked')) supply.push('patty:cooked');
    }
    for (const q of W.cells) if (q.spit) for (let i = 0; i < q.spit.portions; i++) supply.push('chicken:sliced');
    for (const o of others) if (o.brain?.intent) supply.push(o.brain.intent);
    const deficit = (p) => count(demand, p) - count(supply, p);
    return { S, W, me, here, reach, can, mine, items, plates, slots, demand, supply, fills, deficit, others };
  }

  freeCounter(P, near = null, types = ['counter']) {
    let best = null;
    for (const q of P.W.cells) {
      if (!types.includes(q.type) || q.item || q.fire > 0 || !P.can(q)) continue;
      if (q.claim && q.claim !== P.me.id) continue;
      const p = P.W.pos(q);
      const ref = near ? P.W.pos(near) : { x: P.me.x, z: P.me.z };
      const d = Math.hypot(p.x - ref.x, p.z - ref.z);
      if (!best || d < best.d) best = { q, d };
    }
    return best?.q || null;
  }
  // A counter (or belt tile) both I and the far side can reach, to hand food across.
  handoff(P, dest) {
    const W = P.W;
    const stand = W.standFor(dest);
    if (!stand.length) return null;
    const far = W.reach(stand[0]);
    let best = null;
    for (const q of W.cells) {
      if (q.type !== 'counter' || q.item || q.fire > 0) continue;
      const st = W.standFor(q);
      if (!st.some((f) => P.reach.has(f)) || !st.some((f) => far.has(f))) continue;
      const p = W.pos(q);
      const d = Math.hypot(p.x - P.me.x, p.z - P.me.z);
      if (!best || d < best.d) best = { q, d };
    }
    if (best) return best.q;
    for (const q of W.belt || []) {
      if (q.item || !P.can(q)) continue;
      for (let n = q.next; n; n = n.next) if (W.standFor(n).some((f) => far.has(f))) return q;
    }
    return null;
  }
  assembly(P) {
    const pass = P.S.pass;
    return this.freeCounter(P, pass && P.can(pass) ? pass : null) || this.freeCounter(P, null, ['counter', 'board']);
  }
  mk(name, steps, claim = []) {
    for (const x of claim) x.claim = this.chef.id;
    return { name, steps, claim };
  }
  goUse(name, q, extra = [], claim = []) {
    return this.mk(name, [{ go: q }, { use: q }, ...extra], claim);
  }

  think() {
    const P = this.plan();
    if (this.chef.held) return this.thinkHeld(P);
    return this.thinkFree(P);
  }

  // Where should this part go? A plate waiting for it, a pot or jug, a board, the pan or the spit.
  destFor(P, part) {
    const { S, W, can } = P;
    for (const s of P.slots) {
      if (!s.plate?.cell || !s.missing.includes(part)) continue;
      if (can(s.plate.cell)) return { q: s.plate.cell, kind: 'plate' };
      const h = this.handoff(P, s.plate.cell);
      if (h) return { q: h, kind: 'handoff' };
    }
    for (const f of P.fills) {
      if (!f.missing.includes(part) || !f.v.cell) continue;
      if (can(f.v.cell)) return { q: f.v.cell, kind: 'vessel' };
      const h = this.handoff(P, f.v.cell);
      if (h) return { q: h, kind: 'handoff' };
    }
    const [id, state = 'raw'] = part.split(':');
    if (state === 'raw' && ING[id]?.chop && count(P.demand, `${id}:chopped`) > 0) {
      const b = this.freeCounter(P, null, ['board']);
      if (b) return { q: b, kind: 'board' };
      const far = W.cells.find((q) => q.type === 'board' && !q.item && !can(q));
      if (far) {
        const h = this.handoff(P, far);
        if (h) return { q: h, kind: 'handoff' };
      }
    }
    if (part === 'patty' && count(P.demand, 'patty:cooked') > 0) {
      const pan = [...S.items].find((it) => it.kind === 'pan' && !it.contents.length && it.cell?.type === 'hob' && it.cell.fire <= 0);
      if (pan && can(pan.cell)) return { q: pan.cell, kind: 'vessel' };
      if (pan) {
        const h = this.handoff(P, pan.cell);
        if (h) return { q: h, kind: 'handoff' };
      }
    }
    if (part === 'chicken') {
      const sp = W.cells.find((q) => q.spit && !q.spit.portions);
      if (sp && can(sp)) return { q: sp, kind: 'spit' };
    }
    // nowhere useful yet: food that is ready waits near the pass, the rest near me
    if (count(P.demand, part) > 0 && S.pass) {
      const q = can(S.pass) ? this.freeCounter(P, S.pass) : this.handoff(P, S.pass);
      if (q) return { q, kind: 'stash' };
    }
    return null;
  }

  thinkHeld(P) {
    const { S, W, me, can } = P;
    const H = me.held;
    const bin = W.cells.find((q) => q.type === 'bin' && can(q));
    const fire = W.cells.find((q) => q.fire > 0 && can(q));
    if (H.kind === 'ext') {
      if (fire) return this.mk('spray', [{ go: fire }, { work: fire, until: () => fire.fire <= 0, max: 8 }]);
      const home = W.cells.find((q) => q.start === 'ext' && !q.item && can(q)) || this.freeCounter(P);
      return home ? this.goUse('put ext', home) : null;
    }
    if (fire && W.cells.some((q) => q.item?.kind === 'ext' && can(q))) {
      const q = this.freeCounter(P);
      if (q) return this.goUse('drop for fire', q);
    }
    if (H.kind === 'plate') {
      const slot = P.slots.find((s) => s.plate === H);
      if (slot && !slot.missing.length && S.pass) {
        if (can(S.pass)) return this.goUse('serve', S.pass, [{ wait: 0.05 }]);
        const h = this.handoff(P, S.pass);
        if (h) return this.goUse('hand plate', h);
      }
      if (slot && this.profile === 'full') {
        const src = this.sourceFor(P, slot.missing);
        if (src) return src;
      }
      if (!slot && H.parts.length && this.profile === 'full' && bin) return this.goUse('bin plate', bin);
      const q = this.assembly(P);
      return q ? this.goUse('set plate', q) : null;
    }
    if (H.kind === 'ing') {
      const part = partKey(H.id, H.state);
      if (H.state === 'burnt') return bin ? this.goUse('bin', bin) : null;
      const d = this.destFor(P, part);
      if (d) {
        if (d.kind === 'board') return this.goUse('to board', d.q, [{ work: d.q, until: () => d.q.item?.state !== 'raw', max: 5 }], [d.q]);
        if (d.kind === 'plate' && d.q.item?.holder == null && this.profile === 'helper') this.say('give', 0.25);
        return this.goUse(`deliver ${part}`, d.q);
      }
      // needed on the far side, but the trucks are apart or the hatch is open: hold on to it and wait
      if (count(P.demand, part) > 0 && (S.level.trucks || S.level.hatch)) return this.mk('wait', [{ wait: 0.8 }]);
      const q = this.freeCounter(P);
      return q ? this.goUse('put down', q) : bin ? this.goUse('bin', bin) : null;
    }
    // a pan, pot or jug
    if (H.contents[0] === 'burnt') return bin ? this.goUse('bin burnt', bin) : null;
    const rp = S.readyPart(H);
    if (rp) {
      for (const s of P.slots) {
        if (!s.plate?.cell || !s.missing.includes(rp)) continue;
        if (can(s.plate.cell)) return this.goUse('pour', s.plate.cell);
        const h = this.handoff(P, s.plate.cell);
        if (h) return this.goUse('hand pot', h);
      }
      if (this.profile === 'full' && S.rack?.rack > 0 && can(S.rack)) {
        const q = this.assembly(P);
        if (q) return this.goUse('put pot down', q);
      }
      const q = this.freeCounter(P, S.pass && can(S.pass) ? S.pass : null);
      return q ? this.goUse('put pot down', q) : null;
    }
    const homeType = H.kind === 'jug' ? 'blender' : 'hob';
    let home = null;
    for (const q of W.cells) if (q.type === homeType && !q.item && q.fire <= 0 && can(q)) home = home || q;
    if (H.kind !== 'pan' && H.contents.length && !Object.keys(BREW).some((b) => BREW[b].vessel === H.kind && S.brews.includes(b) && minus(H.contents, BREW[b].needs).length === 0)) {
      if (bin) return this.goUse('bin leftovers', bin);
    }
    if (home) return this.goUse('back to heat', home);
    const q = this.freeCounter(P);
    return q ? this.goUse('put down', q) : null;
  }

  // Something on a counter, in a pan or on the spit that is one of the missing parts.
  sourceFor(P, parts, only = null) {
    const { S, W, can, mine } = P;
    for (const part of parts) {
      for (const it of P.items) {
        if (!it.cell || !can(it.cell) || !mine(it) || it.cell.fire > 0) continue;
        if (only && !only(it.cell)) continue;
        if (it.kind === 'ing' && partKey(it.id, it.state) === part) return this.goUse(`fetch ${part}`, it.cell, [], [it]);
        if ((it.kind === 'pan' || it.kind === 'pot' || it.kind === 'jug') && S.readyPart(it) === part) return this.goUse(`take ${part}`, it.cell, [], [it]);
      }
      if (part === 'chicken:sliced') {
        const sp = W.cells.find((q) => q.spit && q.spit.portions > 0 && q.spit.roast >= 1 && can(q) && (!only || only(q)));
        if (sp) {
          const had = this.chef.held;
          return this.mk('slice', [{ go: sp }, { work: sp, until: () => this.chef.held !== had || (had && had.parts.includes('chicken:sliced')), max: 3 }]);
        }
      }
    }
    return null;
  }

  thinkFree(P) {
    const { S, W, can, mine } = P;
    const full = this.profile === 'full';
    // 1. fire
    const fire = W.cells.find((q) => q.fire > 0);
    if (fire) {
      const ext = W.cells.find((q) => q.item?.kind === 'ext' && can(q) && q.fire <= 0);
      const otherHas = P.others.some((o) => o.held?.kind === 'ext');
      if (ext && !otherHas && W.cells.some((q) => q.fire > 0 && can(q))) {
        this.say('fire');
        return this.goUse('get extinguisher', ext);
      }
    }
    // 2. a pan or pot about to burn, or already burnt
    for (const it of P.items) {
      if (!it.cell || it.cell.type !== 'hob' || !can(it.cell) || !mine(it) || it.cell.fire > 0) continue;
      if (it.contents[0] === 'burnt') return this.goUse('rescue burnt', it.cell, [], [it]);
      const rp = S.readyPart(it);
      if (!rp) continue;
      const burn = it.kind === 'pan' ? PAN_BURN : POT_BURN;
      const wanted = P.slots.some((s) => s.plate && s.missing.includes(rp));
      if (wanted || it.over > burn * 0.45) return this.goUse('take off heat', it.cell, [], [it]);
    }
    // 3. serve a finished plate
    if (full && S.pass)
      for (const s of P.slots) if (s.plate?.cell && !s.missing.length && can(s.plate.cell) && mine(s.plate)) return this.goUse('pick finished', s.plate.cell, [], [s.plate]);
    // 4. bring ready parts to plates, pots and jugs; across a split kitchen, only food not yet within the far side's reach
    const farOf = (q) => {
      const st = W.standFor(q);
      return st.length ? W.reach(st[0]) : new Set();
    };
    const targets = [...P.slots.filter((s) => s.plate?.cell && s.missing.length).map((s) => ({ q: s.plate.cell, missing: s.missing })), ...P.fills.filter((f) => f.v.cell && f.missing.length).map((f) => ({ q: f.v.cell, missing: f.missing }))];
    for (const tg of targets) {
      if (can(tg.q)) {
        const src = this.sourceFor(P, tg.missing);
        if (src) return src;
      } else if (this.handoff(P, tg.q)) {
        const far = farOf(tg.q);
        const src = this.sourceFor(P, tg.missing, (cell) => cell.type !== 'belt' && !W.standFor(cell).some((f) => far.has(f)));
        if (src) return src;
      }
    }
    // 5. chop what is waiting on a board
    for (const q of W.cells) {
      const it = q.item;
      if (q.type !== 'board' || it?.kind !== 'ing' || it.state !== 'raw' || !ING[it.id].chop || !can(q) || !mine(it)) continue;
      if (P.others.some((o) => o.workCell === q && o.working === 'chop')) continue;
      if (count(P.demand, `${it.id}:chopped`) > 0) return this.mk('chop', [{ go: q }, { work: q, until: () => q.item !== it || it.state !== 'raw', max: 5 }], [it, q]);
    }
    // chopped food left on a board: move it toward the pass so the board is free again
    const freeBoards = W.cells.filter((q) => q.type === 'board' && !q.item && can(q)).length;
    const waiting = P.items.some((it) => it.kind === 'ing' && it.state === 'raw' && ING[it.id].chop && it.cell && it.cell.type !== 'board' && can(it.cell));
    for (const q of W.cells) {
      const it = q.item;
      if (q.type !== 'board' || it?.kind !== 'ing' || it.state === 'raw' || !can(q) || !mine(it)) continue;
      if (freeBoards > 0 && !waiting && count(P.demand, partKey(it.id, it.state)) === 0) continue;
      if (this.freeCounter(P, S.pass && can(S.pass) ? S.pass : null)) return this.goUse('clear board', q, [], [it]);
    }
    // loose raw food that should be chopped or cooked: move it
    for (const it of P.items) {
      if (it.kind !== 'ing' || !it.cell || it.cell.type === 'board' || !can(it.cell) || !mine(it)) continue;
      const part = partKey(it.id, it.state);
      const useful = (it.state === 'raw' && ING[it.id].chop && count(P.demand, `${it.id}:chopped`) > 0) || P.fills.some((f) => f.missing.includes(part)) || (part === 'patty' && count(P.demand, 'patty:cooked') > 0) || (part === 'chicken' && count(P.demand, 'chicken:sliced') > 0);
      const d = useful ? this.destFor(P, part) : null;
      if (d && d.kind !== 'stash' && d.kind !== 'handoff' && d.q !== it.cell) return this.goUse(`move ${part}`, it.cell, [], [it]);
    }
    // cookware left off the heat: back onto a free hob or blender
    for (const it of P.items) {
      if (!it.cell || !can(it.cell) || !mine(it)) continue;
      if (!(it.kind === 'pan' || it.kind === 'pot' || it.kind === 'jug')) continue;
      const home = it.kind === 'jug' ? 'blender' : 'hob';
      if (it.cell.type === home || S.readyPart(it) || it.contents[0] === 'burnt') continue;
      if (!it.contents.length && !P.fills.length && !P.demand.includes('patty:cooked')) continue;
      if (W.cells.some((q) => q.type === home && !q.item && q.fire <= 0 && can(q))) return this.goUse('pick cookware', it.cell, [], [it]);
    }
    // 6. wash when plates run short
    const sink = S.sink;
    const cleanFree = (S.rack?.rack || 0) + P.plates.filter((p) => !p.parts.length).length;
    const want = P.slots.filter((s) => !s.plate).length;
    if (sink && sink.dirty > 0 && can(sink) && cleanFree < Math.max(1, want) && !P.others.some((o) => o.working === 'wash')) {
      this.say('wash', 0.3);
      return this.mk('wash', [{ go: sink }, { work: sink, until: () => sink.dirty === 0 || (S.rack?.rack || 0) > want + 1, max: 12 }]);
    }
    // 7. set out a plate for an order that has none
    if (full && S.rack?.rack > 0 && can(S.rack) && P.slots.some((s) => !s.plate) && this.assembly(P)) return this.goUse('take plate', S.rack);
    // 8. make a missing part
    const prod = this.produce(P);
    if (prod) return prod;
    // 9. wash anyway
    if (sink && sink.dirty > 0 && can(sink) && !P.others.some((o) => o.working === 'wash')) return this.mk('wash', [{ go: sink }, { work: sink, until: () => sink.dirty === 0, max: 12 }]);
    return null;
  }

  produce(P) {
    const { S, W, can } = P;
    const crate = (id) => W.cells.find((q) => q.type === 'crate' && q.ing === id && can(q) && !q.item);
    const tries = [];
    const seen = new Set();
    for (const part of P.demand) {
      if (seen.has(part)) continue;
      seen.add(part);
      if (P.deficit(part) <= 0) continue;
      const [id, state = 'raw'] = part.split(':');
      if (BREW[part]) continue;
      if (state === 'chopped') {
        const c = crate(id);
        if (c) tries.push({ part: id, q: c, why: part });
      } else if (state === 'raw') {
        const c = crate(id);
        if (c) tries.push({ part: id, q: c, why: part });
      } else if (part === 'patty:cooked') {
        const pan = [...S.items].find((it) => it.kind === 'pan' && !it.contents.length && it.cell?.type === 'hob');
        const c = crate('patty');
        if (pan && c) tries.push({ part: 'patty', q: c, why: part });
      } else if (part === 'chicken:sliced') {
        const sp = W.cells.find((q) => q.spit && can(q));
        if (sp && sp.spit.portions === 0) {
          const c = crate('chicken');
          if (c) tries.push({ part: 'chicken', q: c, why: part });
        }
      }
    }
    if (!tries.length) return null;
    const me = this.chef;
    tries.sort((a, b) => {
      const pa = W.pos(a.q);
      const pb = W.pos(b.q);
      return P.demand.indexOf(a.why) - P.demand.indexOf(b.why) + (Math.hypot(pa.x - me.x, pa.z - me.z) - Math.hypot(pb.x - me.x, pb.z - me.z)) * 0.15;
    });
    const t = tries[0];
    this.intent = t.why;
    return this.goUse(`fetch ${t.part}`, t.q);
  }
}
