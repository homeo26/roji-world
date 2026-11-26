import * as THREE from 'three';
import { CELL, ING, DISH, BREW, partKey, fits, dishOf, brewOf, brewFits, PAN_TIME, PAN_BURN, POT_BURN, FIRE_AFTER, SPIT_ROAST, SPIT_PORTIONS, CHOP_TIME, WASH_TIME, SLICE_TIME } from './data.js';
import { partMesh, plateGeo, panGeo, potGeo, jugGeo, extGeo, fillMesh, VC, VC_SHINY } from './models.js';

// The game state of one shift: food and plates, stations, both chefs, orders, fire and the score.
// The view (kitchen.js) shows stations; this file owns the items and moves the chefs.
// Played together online: a chef with `net` is moved by the other player's device (only its actions
// run here), and a Sim with `mirror` (the other copy) moves only its own chef and passes its actions to
// onUse, while the starter's copy sends what the kitchen looks like.

export const R = 0.3; // a chef's radius
export const SPEED = 4.3;
const DASH = 10;
const ITEM_Y = { counter: 0, crate: 0.04, board: 0.05, hob: 0.05, blender: 0.12, belt: 0.03, pass: 0.02, rack: 0, sink: 0, bin: 0, spit: 0 };
const PATTY = [new THREE.Color('#f0a3a3'), new THREE.Color('#7a3f22'), new THREE.Color('#2e211b')];
const LIQ = { soup: '#e8973a', 'rice:cooked': '#fffaf0', stew: '#f7f1e1', lemonade: '#e4ef9a', burnt: '#3b2a22' };
const MIXCOL = { 'onion:chopped': '#d9a3c9', lentils: '#e8b06a', rice: '#f2ead8', 'lamb:chopped': '#e8a0a0', jameed: '#f7f3e6', 'lemon:chopped': '#fff4b0', mint: '#a8dcae', ice: '#e8f6ff' };
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class Sim {
  constructor({ world, level, view, emit, fast = 1 }) {
    this.world = world;
    this.level = level;
    this.view = view;
    this.emit = emit || (() => {});
    this.fast = fast;
    this.menu = level.menu;
    this.recipes = this.menu.map((d) => DISH[d].parts);
    this.brews = Object.keys(BREW).filter((k) => this.recipes.some((r) => r.includes(k)));
    this.items = new Set();
    this.uid = 0;
    this.chefs = [];
    this.orders = [];
    this.orderId = 0;
    this.nextOrder = 0.6;
    this.score = 0;
    this.tips = 0;
    this.served = 0;
    this.missed = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.time = level.time;
    this.clock = 0;
    this.running = false;
    this.returns = [];
    this.sink = world.cells.find((q) => q.type === 'sink');
    this.rack = world.cells.find((q) => q.type === 'rack');
    this.pass = world.cells.find((q) => q.type === 'pass');
    if (this.rack) this.rack.rack = level.plates;
    for (const q of world.cells) {
      if (q.start === 'pan') this.place(this.make('pan'), q);
      if (q.start === 'pot') this.place(this.make('pot'), q);
      if (q.start === 'jug') this.place(this.make('jug'), q);
      if (q.start === 'ext') this.place(this.make('ext'), q);
    }
  }

  // ---------------------------------------------------------------- items
  make(kind, id = null, state = 'raw') {
    const it = { uid: ++this.uid, kind, id, state, chop: 0, parts: [], dirty: false, contents: [], cook: 0, over: 0, burnT: 0, done: null, cell: null, holder: null, beltT: 0, obj: new THREE.Group(), mesh: null, fill: null, claim: null, born: this.clock };
    it.obj.userData.item = it;
    if (kind === 'pan' || kind === 'pot' || kind === 'jug' || kind === 'ext') {
      const geo = kind === 'pan' ? panGeo() : kind === 'pot' ? potGeo() : kind === 'jug' ? jugGeo() : extGeo();
      it.mesh = new THREE.Mesh(geo, kind === 'pot' || kind === 'pan' ? VC_SHINY : VC);
      it.mesh.castShadow = kind !== 'pan';
      it.mesh.receiveShadow = true;
      it.obj.add(it.mesh);
      if (kind !== 'ext') {
        it.fill = kind === 'pan' ? fillMesh(0.12, 0.045) : kind === 'pot' ? fillMesh(0.19, 0.02) : fillMesh(0.095, 1, 14);
        it.fill.visible = false;
        it.obj.add(it.fill);
      }
    } else {
      it.mesh = new THREE.Mesh(new THREE.BufferGeometry(), VC);
      it.mesh.castShadow = false;
      it.mesh.receiveShadow = true;
      it.obj.add(it.mesh);
    }
    this.items.add(it);
    this.refresh(it);
    return it;
  }
  refresh(it) {
    if (it.kind === 'ing') it.mesh.geometry = partMesh(partKey(it.id, it.state)).geometry;
    else if (it.kind === 'plate') it.mesh.geometry = plateGeo(it.parts, it.dirty, dishOf(it.parts, this.menu));
    else if (it.kind === 'pan') {
      const has = it.contents.length > 0;
      it.fill.visible = has;
      if (has) {
        const p = it.contents[0];
        const k = p === 'patty' ? Math.min(1, it.cook / PAN_TIME) : p === 'burnt' ? 2 : 1 + Math.min(1, it.over / PAN_BURN) * 0.25;
        const col = it.fill.material.color;
        if (k <= 1) col.copy(PATTY[0]).lerp(PATTY[1], k);
        else col.copy(PATTY[1]).lerp(PATTY[2], Math.min(1, k - 1));
        it.fill.position.y = 0.08;
      }
    } else if (it.kind === 'pot' || it.kind === 'jug') {
      const n = it.contents.length;
      it.fill.visible = n > 0;
      if (n) {
        const want = it.done || brewOf(it.contents, it.kind) || null;
        const final = LIQ[it.contents[0] === 'burnt' ? 'burnt' : want] || null;
        const col = it.fill.material.color;
        const mix = new THREE.Color(0, 0, 0);
        for (const p of it.contents) mix.add(new THREE.Color(MIXCOL[p] || LIQ[p] || '#dddddd'));
        mix.multiplyScalar(1 / n);
        if (it.contents[0] === 'burnt') col.set(LIQ.burnt);
        else if (it.done) col.set(final);
        else if (final && want) col.copy(mix).lerp(new THREE.Color(final), Math.min(1, it.cook / BREW[want].time));
        else col.copy(mix);
        if (it.kind === 'pot') it.fill.position.y = 0.1 + Math.min(1, n / 2) * 0.1;
        else {
          const h = 0.06 + (it.done ? 0.2 : n * 0.065);
          it.fill.scale.y = h;
          it.fill.position.y = 0.035 + h / 2;
        }
      }
    }
  }
  remove(it) {
    this.detach(it);
    it.obj.removeFromParent();
    this.items.delete(it);
  }
  detach(it) {
    if (it.cell) {
      if (it.cell.item === it) it.cell.item = null;
      it.cell = null;
    }
    if (it.holder) {
      if (it.holder.held === it) {
        it.holder.held = null;
        it.holder.kid.carry(null);
      }
      it.holder = null;
    }
  }
  place(it, q) {
    this.detach(it);
    q.item = it;
    it.cell = q;
    it.beltT = 0;
    const a = this.view.anchor(q);
    a.add(it.obj);
    it.obj.position.set(0, ITEM_Y[q.type] ?? 0, 0);
    it.obj.rotation.set(0, it.kind === 'pan' ? -Math.PI / 2 + (q.c % 2) * 0.3 : (it.uid % 5) * 0.3 - 0.6, 0);
    if (it.kind === 'ext') it.obj.rotation.y = 0.4;
  }
  hold(chef, it) {
    this.detach(it);
    chef.held = it;
    it.holder = chef;
    it.obj.position.set(0, it.kind === 'ext' ? -0.2 : it.kind === 'pot' ? -0.06 : 0, it.kind === 'ext' ? 0.02 : 0.04);
    it.obj.rotation.set(0, it.kind === 'pan' ? -Math.PI / 2 : 0, 0);
    chef.kid.carry(it.obj);
  }
  partOf(it) {
    return it?.kind === 'ing' ? partKey(it.id, it.state) : null;
  }
  plateFits(plate, part) {
    return !plate.dirty && fits(plate.parts, part, this.recipes);
  }
  // What a container would hand to a plate now (a cooked patty, a finished soup), or null.
  readyPart(it) {
    if (it.kind === 'pan') return it.contents[0] === 'patty:cooked' ? 'patty:cooked' : null;
    if (it.kind === 'pot' || it.kind === 'jug') return it.done && it.contents[0] === it.done ? it.done : null;
    return null;
  }
  // Can this ingredient part go into this container?
  containerTakes(c, part) {
    if (!part || c.contents[0] === 'burnt' || c.done) return false;
    if (c.kind === 'pan') return c.contents.length === 0 && part === 'patty';
    return brewFits(c.contents, part, c.kind, this.brews);
  }

  // ---------------------------------------------------------------- what a chef faces
  target(chef) {
    const f = chef.ctrl.target;
    if (f) {
      const p = this.world.pos(f);
      if (Math.hypot(p.x - chef.x, p.z - chef.z) < CELL * 1.25) return f;
    }
    const sy = Math.sin(chef.yaw);
    const cy = Math.cos(chef.yaw);
    for (const d of [0.72, 0.95]) {
      for (const a of [0, 0.42, -0.42]) {
        const x = chef.x + (sy * Math.cos(a) + cy * Math.sin(a)) * d;
        const z = chef.z + (cy * Math.cos(a) - sy * Math.sin(a)) * d;
        const q = this.world.at(x, z);
        if (q && q.type !== 'floor' && q.type !== 'wall') return q;
      }
    }
    return null;
  }

  // ---------------------------------------------------------------- pick up / put down
  use(chef) {
    const q = this.target(chef);
    if (!q) {
      if (chef.held) this.emit('nohere', { chef });
      return false;
    }
    if (q.fire > 0) {
      this.emit('say', { chef, text: 'It is on fire!' });
      return false;
    }
    const H = chef.held;
    const C = q.item;
    if (!H) {
      if (C) {
        this.hold(chef, C);
        this.emit('pick', { chef, item: C, cell: q });
        return true;
      }
      if (q.type === 'crate') {
        const it = this.make('ing', q.ing);
        this.hold(chef, it);
        this.emit('crate', { chef, item: it, cell: q });
        return true;
      }
      if (q.type === 'rack' && q.rack > 0) {
        q.rack--;
        const it = this.make('plate');
        this.hold(chef, it);
        this.emit('pick', { chef, item: it, cell: q });
        return true;
      }
      if (q.type === 'sink' && q.dirty) this.emit('hint', { chef, kind: 'wash', cell: q });
      if (q.type === 'spit') this.emit('hint', { chef, kind: q.spit.portions ? 'slice' : 'chicken', cell: q });
      if (q.type === 'rack' && !q.rack) this.emit('say', { chef, text: 'No clean plates!' });
      return false;
    }
    if (C) return this.combine(chef, H, C, q);
    return this.put(chef, H, q);
  }
  put(chef, H, q) {
    const t = q.type;
    if (t === 'pass') {
      if (H.kind === 'plate') return this.serve(chef, H, q);
      this.emit('reject', { chef, cell: q, text: 'Put it on a plate first' });
      return false;
    }
    if (t === 'bin') return this.trash(chef, H, q);
    if (t === 'rack') {
      if (H.kind === 'plate' && !H.dirty && !H.parts.length) {
        this.remove(H);
        q.rack++;
        this.emit('drop', { chef, cell: q });
        return true;
      }
      return this.reject(chef, q);
    }
    if (t === 'sink') {
      if (H.kind === 'plate' && !H.parts.length) {
        this.remove(H);
        q.dirty++;
        this.emit('drop', { chef, cell: q });
        return true;
      }
      return this.reject(chef, q);
    }
    if (t === 'spit') {
      if (H.kind === 'ing' && H.id === 'chicken' && H.state === 'raw' && q.spit.portions === 0) {
        this.remove(H);
        q.spit.portions = SPIT_PORTIONS;
        q.spit.roast = 0;
        q.spit.slice = 0;
        this.emit('spit', { chef, cell: q });
        return true;
      }
      return this.reject(chef, q, q.spit.portions ? 'The spit is still full' : 'Only chicken goes on the spit');
    }
    if (t === 'hob' && H.kind !== 'pan' && H.kind !== 'pot') return this.reject(chef, q, 'Needs a pan or a pot');
    if (t === 'blender' && H.kind !== 'jug') return this.reject(chef, q, 'Only the jug fits here');
    if (H.kind === 'jug' && t === 'hob') return this.reject(chef, q);
    this.place(H, q);
    this.emit('drop', { chef, item: H, cell: q });
    return true;
  }
  reject(chef, q, text) {
    this.emit('reject', { chef, cell: q, text });
    return false;
  }
  trash(chef, H, q) {
    if (H.kind === 'ing') {
      this.remove(H);
      this.emit('trash', { chef, cell: q });
      return true;
    }
    if (H.kind === 'plate' && H.parts.length) {
      H.parts = [];
      this.refresh(H);
      this.emit('trash', { chef, cell: q });
      return true;
    }
    if ((H.kind === 'pan' || H.kind === 'pot' || H.kind === 'jug') && H.contents.length) {
      H.contents = [];
      H.cook = H.over = H.burnT = 0;
      H.done = null;
      this.refresh(H);
      this.emit('trash', { chef, cell: q });
      return true;
    }
    return this.reject(chef, q, H.kind === 'ext' ? 'We still need that!' : null);
  }
  combine(chef, H, C, q) {
    const hp = this.partOf(H);
    const cp = this.partOf(C);
    const ok = () => {
      this.refresh(H);
      this.refresh(C);
      this.emit('combine', { chef, cell: q, item: C });
      return true;
    };
    // an ingredient onto a plate, or into a pan, pot or jug
    if (hp && C.kind === 'plate' && this.plateFits(C, hp)) {
      C.parts.push(hp);
      this.remove(H);
      return ok();
    }
    if (hp && (C.kind === 'pan' || C.kind === 'pot' || C.kind === 'jug') && this.containerTakes(C, hp)) {
      C.contents.push(hp);
      C.cook = 0;
      this.remove(H);
      this.emit('add', { chef, cell: q, item: C });
      return ok();
    }
    // a plate picks up an ingredient, or the food from a pan, pot or jug
    if (H.kind === 'plate' && cp && this.plateFits(H, cp)) {
      H.parts.push(cp);
      this.remove(C);
      return ok();
    }
    if (H.kind === 'plate') {
      const rp = this.readyPart(C);
      if (rp && this.plateFits(H, rp)) {
        H.parts.push(rp);
        this.emptyContainer(C);
        return ok();
      }
    }
    // a pan, pot or jug pours onto a plate
    const rp = this.readyPart(H);
    if (rp && C.kind === 'plate' && this.plateFits(C, rp)) {
      C.parts.push(rp);
      this.emptyContainer(H);
      return ok();
    }
    // a container picks up an ingredient lying on a counter
    if ((H.kind === 'pan' || H.kind === 'pot' || H.kind === 'jug') && cp && this.containerTakes(H, cp)) {
      H.contents.push(cp);
      H.cook = 0;
      this.remove(C);
      this.emit('add', { chef, cell: q, item: H });
      return ok();
    }
    if (H.kind === 'plate' && C.kind === 'plate' && !H.parts.length && C.parts.length && !C.dirty && !H.dirty) {
      // swap: take the full plate, leave the empty one
      this.place(H, q);
      this.hold(chef, C);
      this.emit('pick', { chef, item: C, cell: q });
      return true;
    }
    return this.reject(chef, q, hp && C.kind === 'plate' ? 'That is not on the menu' : null);
  }
  emptyContainer(c) {
    c.contents = [];
    c.cook = c.over = c.burnT = 0;
    c.done = null;
    this.refresh(c);
  }

  // ---------------------------------------------------------------- hold to chop, wash, slice, spray
  work(chef, dt) {
    chef.working = null;
    const H = chef.held;
    if (H?.kind === 'ext') {
      chef.working = 'spray';
      this.spray(chef, dt);
      return;
    }
    const q = this.target(chef);
    if (!q || q.fire > 0) return;
    const C = q.item;
    if (!H && q.type === 'board' && C?.kind === 'ing' && C.state === 'raw' && ING[C.id].chop) {
      chef.working = 'chop';
      chef.workCell = q;
      C.chop += dt / CHOP_TIME;
      if (C.chop >= 1) {
        C.state = 'chopped';
        C.chop = 0;
        this.refresh(C);
        this.emit('chopped', { chef, cell: q, item: C });
      }
      return;
    }
    if (!H && q.type === 'sink' && q.dirty > 0) {
      chef.working = 'wash';
      chef.workCell = q;
      q.work += dt / WASH_TIME;
      if (q.work >= 1) {
        q.work = 0;
        q.dirty--;
        if (this.rack) this.rack.rack++;
        this.emit('washed', { chef, cell: q });
      }
      return;
    }
    if (q.type === 'spit' && q.spit.portions > 0 && q.spit.roast >= 1) {
      const canTake = !H || (H.kind === 'plate' && this.plateFits(H, 'chicken:sliced'));
      if (!canTake) return;
      chef.working = 'slice';
      chef.workCell = q;
      q.spit.slice += dt / SLICE_TIME;
      if (q.spit.slice >= 1) {
        q.spit.slice = 0;
        q.spit.portions--;
        if (!q.spit.portions) q.spit.roast = 0;
        if (H) {
          H.parts.push('chicken:sliced');
          this.refresh(H);
        } else this.hold(chef, this.make('ing', 'chicken', 'sliced'));
        this.emit('sliced', { chef, cell: q });
      }
    }
  }
  spray(chef, dt) {
    const sy = Math.sin(chef.yaw);
    const cy = Math.cos(chef.yaw);
    chef.sprayT = (chef.sprayT || 0) + dt;
    for (const q of this.world.cells) {
      if (q.fire <= 0) continue;
      const p = this.world.pos(q);
      const dx = p.x - chef.x;
      const dz = p.z - chef.z;
      const d = Math.hypot(dx, dz);
      if (d > 2.6 || d < 0.01) continue;
      const cos = (dx * sy + dz * cy) / d;
      if (cos < 0.72) continue;
      q.fire -= dt * 1.3;
      if (q.fire <= 0) {
        q.fire = 0;
        q.fireT = 0;
        this.emit('fireout', { chef, cell: q });
      }
    }
  }

  // ---------------------------------------------------------------- serving and orders
  serve(chef, plate, q) {
    const dish = dishOf(plate.parts, this.menu);
    const oi = dish ? this.orders.findIndex((o) => o.dish === dish) : -1;
    if (oi < 0) {
      this.emit('reject', { chef, cell: q, text: dish ? 'Nobody ordered that yet' : plate.parts.length ? 'That dish is not finished' : 'The plate is empty' });
      return false;
    }
    const o = this.orders[oi];
    const first = oi === 0;
    this.streak = first ? Math.min(4, this.streak + 1) : 1;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    const frac = Math.max(0, o.t / o.total);
    const tip = Math.round(8 * frac) * this.streak;
    const pts = DISH[dish].points;
    this.score += pts + tip;
    this.tips += tip;
    this.served++;
    this.orders.splice(oi, 1);
    this.remove(plate);
    if (this.sink) this.returns.push(6.5);
    else if (this.rack) this.rack.rack++;
    this.emit('served', { chef, cell: q, dish, pts, tip, streak: this.streak, order: o });
    return true;
  }
  spawnOrder() {
    const counts = {};
    for (const o of this.orders) counts[o.dish] = (counts[o.dish] || 0) + 1;
    const pool = [];
    for (const d of this.menu) {
      const w = d === 'mansaf' ? 0.7 : 1;
      pool.push([d, w / (1 + 2 * (counts[d] || 0))]);
    }
    let r = Math.random() * pool.reduce((a, p) => a + p[1], 0);
    let dish = pool[0][0];
    for (const [d, w] of pool) {
      r -= w;
      if (r <= 0) {
        dish = d;
        break;
      }
    }
    // the very first order of the first kitchen is always the easy one
    if (this.orderId === 0) dish = this.menu[0];
    const total = Math.round(DISH[dish].time * (this.level.orderTime || 1) * (this.orders.length ? 1 : 1.1));
    const o = { id: ++this.orderId, dish, t: total, total };
    this.orders.push(o);
    this.emit('order', { order: o });
  }

  // ---------------------------------------------------------------- the clock
  update(dt) {
    this.clock += dt;
    const W = this.world;
    const moved = W.update(dt);
    if (moved) this.emit('grid', {});
    if (this.mirror) {
      // the other copy: the starter's copy runs the kitchen; here only our own chef moves
      if (this.running) {
        this.time = Math.max(0, this.time - dt);
        for (const o of this.orders) o.t = Math.max(0, o.t - dt);
      }
      this.beltView();
      for (const c of this.chefs) if (!c.net) this.moveChef(c, dt);
      this.pushApart(dt);
      for (const c of this.chefs) if (!c.net) this.unstick(c);
      return;
    }
    if (this.running) {
      this.time = Math.max(0, this.time - dt);
      // orders
      const late = this.level.time - this.time;
      this.nextOrder -= dt;
      const rush = late > this.level.time * 0.55;
      if (rush && !this.rushed) {
        this.rushed = true;
        this.emit('rush', {});
      }
      const every = this.level.every * (rush ? 0.8 : 1);
      if ((this.nextOrder <= 0 && this.orders.length < this.level.maxOrders) || (!this.orders.length && this.nextOrder < every - 2.5)) {
        this.spawnOrder();
        this.nextOrder = this.orders.length === 1 && this.served === 0 ? Math.min(every, 9) : every;
      }
      for (let i = this.orders.length - 1; i >= 0; i--) {
        const o = this.orders[i];
        o.t -= dt;
        if (o.t <= 0) {
          this.orders.splice(i, 1);
          this.missed++;
          this.streak = 0;
          const lost = Math.min(this.score, 10);
          this.score -= lost;
          this.emit('missed', { order: o, lost });
        }
      }
    }
    // plates come back dirty
    for (let i = this.returns.length - 1; i >= 0; i--) {
      this.returns[i] -= dt;
      if (this.returns[i] <= 0) {
        this.returns.splice(i, 1);
        this.sink.dirty++;
        this.emit('dirty', { cell: this.sink });
      }
    }
    this.cook(dt);
    this.fires(dt);
    this.belt(dt);
    for (const c of this.chefs) this.moveChef(c, dt);
    this.pushApart(dt);
    for (const c of this.chefs) this.unstick(c);
  }

  cook(dt) {
    const f = this.fast;
    for (const it of this.items) {
      const q = it.cell;
      const onHeat = q && q.fire <= 0 && ((q.type === 'hob' && (it.kind === 'pan' || it.kind === 'pot')) || (q.type === 'blender' && it.kind === 'jug'));
      it.heat = onHeat && it.contents.length > 0;
      if (!onHeat || !it.contents.length) continue;
      const before = it.contents[0];
      if (it.kind === 'pan') {
        const p = it.contents[0];
        if (p === 'patty') {
          it.cook += dt;
          if (it.cook >= PAN_TIME) {
            it.contents[0] = 'patty:cooked';
            it.over = 0;
            this.emit('cooked', { cell: q, item: it });
          }
        } else if (p === 'patty:cooked') {
          it.over += dt * f;
          if (it.over >= PAN_BURN) {
            it.contents[0] = 'burnt';
            it.burnT = 0;
            this.emit('burnt', { cell: q, item: it });
          }
        } else if (p === 'burnt') {
          it.burnT += dt * f;
          if (it.burnT >= FIRE_AFTER && q.fire <= 0) this.ignite(q);
        }
      } else {
        const want = brewOf(it.contents, it.kind);
        if (!it.done && want) {
          it.cook += dt;
          if (it.cook >= BREW[want].time) {
            it.done = want;
            it.contents = [want];
            it.over = 0;
            this.emit('cooked', { cell: q, item: it });
          }
        } else if (it.done && it.kind === 'pot' && it.contents[0] === it.done) {
          it.over += dt * f;
          if (it.over >= POT_BURN) {
            it.contents = ['burnt'];
            it.done = null;
            it.burnT = 0;
            this.emit('burnt', { cell: q, item: it });
          }
        } else if (it.contents[0] === 'burnt') {
          it.burnT += dt * f;
          if (it.burnT >= FIRE_AFTER && q.fire <= 0) this.ignite(q);
        }
      }
      if (before !== it.contents[0] || it.kind === 'pan' || !it.done) this.refresh(it);
    }
    for (const q of this.world.cells) {
      if (q.spit && q.spit.portions > 0 && q.spit.roast < 1) {
        q.spit.roast = Math.min(1, q.spit.roast + dt / SPIT_ROAST);
        if (q.spit.roast >= 1) this.emit('roasted', { cell: q });
      }
    }
  }
  ignite(q) {
    if (q.fire > 0 || q.type === 'sink' || q.type === 'floor' || q.type === 'wall') return;
    q.fire = 0.7;
    q.fireT = 0;
    if (q.item && q.item.kind !== 'ext') {
      const it = q.item;
      if (it.kind === 'ing') {
        it.state = 'burnt';
        this.refresh(it);
      } else if (it.contents?.length) {
        it.contents = ['burnt'];
        it.done = null;
        this.refresh(it);
      }
      // once the fire is out, a burnt pan smokes for a while before it could catch again
      it.burnT = -8;
    }
    this.emit('fire', { cell: q });
  }
  fires(dt) {
    const W = this.world;
    let any = false;
    for (const q of W.cells) {
      if (q.fire <= 0) continue;
      any = true;
      q.fire = Math.min(1, q.fire + dt * 0.08);
      q.fireT += dt * this.fast;
      if (q.fireT > 6.5) {
        q.fireT = 0;
        const ns = [];
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = W.cellAt(q.lc + dc, q.lr + dr);
          if (n && n.type !== 'floor' && n.type !== 'wall' && n.type !== 'sink' && n.type !== 'pass' && n.fire <= 0 && n.item?.kind !== 'ext') ns.push(n);
        }
        if (ns.length) this.ignite(ns[Math.floor(Math.random() * ns.length)]);
      }
    }
    this.onFire = any;
  }
  // the other copy: items ride the belt where the starter's copy says they are
  beltView() {
    const B = this.world.belt;
    if (!B) return;
    for (const q of B) {
      const it = q.item;
      if (!it || it.cell !== q) continue;
      const a = this.world.pos(q);
      const b = q.next ? this.world.pos(q.next) : a;
      const k = q.next ? Math.min(it.beltT, 1) : 0;
      it.obj.position.set((b.x - a.x) * k, ITEM_Y.belt, (b.z - a.z) * k);
    }
  }
  belt(dt) {
    const B = this.world.belt;
    if (!B) return;
    for (let i = B.length - 1; i >= 0; i--) {
      const q = B[i];
      const it = q.item;
      if (!it) continue;
      if (!q.next) {
        it.beltT = 0;
      } else if (it.beltT < 1) {
        it.beltT = Math.min(1, it.beltT + dt / 1.05);
      } else if (!q.next.item) {
        q.item = null;
        q.next.item = it;
        it.cell = q.next;
        it.beltT = 0;
        this.view.anchor(q.next).add(it.obj);
      }
      const a = this.world.pos(q);
      const b = q.next ? this.world.pos(q.next) : a;
      const k = q.next ? Math.min(it.beltT, 1) : 0;
      // the item rides from this tile's centre toward the next one
      it.obj.position.set((b.x - a.x) * k, ITEM_Y.belt, (b.z - a.z) * k);
      if (it.cell !== q) it.obj.position.set(0, ITEM_Y.belt, 0);
    }
  }

  // ---------------------------------------------------------------- chefs
  addChef(id, kid, at, ctrlKind) {
    const p = this.world.pos(this.world.cells.find((q) => q.c === at[0] && q.r === at[1] && q.type === 'floor') || this.world.cells.find((q) => q.type === 'floor'));
    const chef = { id, kid, x: p.x, z: p.z, vx: 0, vz: 0, yaw: Math.PI, held: null, ctrl: { ax: 0, az: 0, use: false, work: false, dash: false, target: null, face: null }, ctrlKind, dashT: 0, dashCd: 0, hop: 0, hopV: 0, working: null, workCell: null, bumpT: 0, sayT: 0, speed: 0, turn: 0 };
    kid.root.position.set(p.x, 0, p.z);
    this.chefs.push(chef);
    return chef;
  }
  moveChef(c, dt) {
    const W = this.world;
    const k = c.ctrl;
    c.dashCd -= dt;
    c.bumpT -= dt;
    c.sayT -= dt;
    if (c.net) {
      // moved by the other player's device: only what they pick up, put down, chop or wash happens here
      if (k.use && this.running) this.use(c);
      k.use = false;
      if (k.work && this.running) this.work(c, dt);
      else c.working = null;
      return;
    }
    // ride a moving truck or tile
    const under = W.at(c.x, c.z);
    if (under) {
      const s = W.sections[under.sec];
      if (s.dx || s.dz) {
        if (W.fits(c.x + s.dx, c.z + s.dz, R)) {
          c.x += s.dx;
          c.z += s.dz;
        }
      }
    }
    if (k.dash && c.dashCd <= 0 && this.running) {
      c.dashT = 0.17;
      c.dashCd = 0.6;
      this.emit('dash', { chef: c });
    }
    k.dash = false;
    const ax = this.running ? k.ax : 0;
    const az = this.running ? k.az : 0;
    const mag = Math.min(1, Math.hypot(ax, az));
    const ice = this.level.ice;
    let tvx = ax * SPEED;
    let tvz = az * SPEED;
    if (c.dashT > 0) {
      c.dashT -= dt;
      tvx = Math.sin(c.yaw) * DASH;
      tvz = Math.cos(c.yaw) * DASH;
    }
    const rate = c.dashT > 0 ? 30 : ice ? (mag > 0.1 ? 3.2 : 1.1) : 18;
    const kk = 1 - Math.exp(-rate * dt);
    c.vx += (tvx - c.vx) * kk;
    c.vz += (tvz - c.vz) * kk;
    // turn toward the stick, or toward a forced face direction (the computer chef at a station)
    const prevYaw = c.yaw;
    if (mag > 0.12) c.yaw = dampAngleFast(c.yaw, Math.atan2(ax, az), 16, dt);
    else if (k.face != null) c.yaw = dampAngleFast(c.yaw, k.face, 14, dt);
    c.turn = wrapA(c.yaw - prevYaw) / Math.max(dt, 1e-4);
    // move with collisions: whole step, else slide along one axis
    const nx = c.x + c.vx * dt;
    const nz = c.z + c.vz * dt;
    if (W.fits(nx, nz, R)) {
      c.x = nx;
      c.z = nz;
    } else if (W.fits(nx, c.z, R)) {
      c.x = nx;
      c.vz *= ice ? -0.3 : 0;
    } else if (W.fits(c.x, nz, R)) {
      c.z = nz;
      c.vx *= ice ? -0.3 : 0;
    } else {
      c.vx *= ice ? -0.3 : 0;
      c.vz *= ice ? -0.3 : 0;
    }
    c.speed = Math.hypot(c.vx, c.vz);
    // actions (the other copy hands them to the starter's copy)
    if (this.mirror) {
      if (k.use && this.running) this.onUse?.(c);
      k.use = false;
    } else {
      if (k.use && this.running) this.use(c);
      k.use = false;
      if (k.work && this.running) this.work(c, dt);
      else c.working = null;
    }
    // hop (happy jumps)
    if (c.hop > 0 || c.hopV) {
      c.hopV -= 20 * dt;
      c.hop = Math.max(0, c.hop + c.hopV * dt);
      if (c.hop === 0) c.hopV = 0;
    }
  }
  jump(c, v = 4.2) {
    if (c.hop > 0.02) return;
    c.hopV = v;
    c.hop = 0.001;
  }
  pushApart() {
    const [a, b] = this.chefs;
    if (!a || !b) return;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const d = Math.hypot(dx, dz);
    const min = R * 2;
    if (d >= min || d < 1e-5) return;
    const push = (min - d) / 2;
    const ux = dx / d;
    const uz = dz / d;
    const rel = (a.vx - b.vx) * ux + (a.vz - b.vz) * uz;
    // the computer chef gives way to a person; a chef moved by the other device is moved there only
    const wa = a.net ? 0 : b.net ? 2 : a.ctrlKind === 'ai' && b.ctrlKind !== 'ai' ? 1.6 : b.ctrlKind === 'ai' && a.ctrlKind !== 'ai' ? 0.4 : 1;
    const wb = 2 - wa;
    if (this.world.fits(a.x - ux * push * wa, a.z - uz * push * wa, R)) {
      a.x -= ux * push * wa;
      a.z -= uz * push * wa;
    }
    if (this.world.fits(b.x + ux * push * wb, b.z + uz * push * wb, R)) {
      b.x += ux * push * wb;
      b.z += uz * push * wb;
    }
    if (rel > 2.2 && a.bumpT <= 0 && b.bumpT <= 0 && !this.mirror) {
      a.bumpT = b.bumpT = 1.6;
      this.emit('bump', { a, b });
    }
  }
  // A sliding counter or an opening hatch nudges any chef standing in its way.
  unstick(c) {
    if (c.net || this.world.fits(c.x, c.z, R)) return;
    const s = this.world.at(c.x, c.z);
    const dir = s && s.sec ? { x: Math.sign(this.world.sections[s.sec].dx) || 0, z: 0 } : null;
    const p = this.world.nearestFit(c.x, c.z, R, dir);
    if (Math.hypot(p.x - c.x, p.z - c.z) > 0.05) {
      c.x = p.x;
      c.z = p.z;
      this.jump(c, 3.2);
      this.emit('nudged', { chef: c });
    }
  }
}

function dampAngleFast(a, b, rate, dt) {
  const d = wrapA(b - a);
  return a + d * (1 - Math.exp(-rate * dt));
}
