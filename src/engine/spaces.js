import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as util from '../util.js';
import { ICONS } from '../icons.js';
import { Kid } from '../kid.js';
import { makeSign } from '../world.js';
import { PLACES, INTERIORS, ARENAS } from './manifest.js';
import { createApi } from './api.js';

// Loads place and interior modules, puts them on the map and answers questions about them:
// which hotspots are near, where the water is, which ground is icy, and entering / leaving interiors.
// Interiors are built the first time they are entered, far away from the island at x >= 400.

const INTERIOR_X = 400;
const INTERIOR_STEP = 90;

export class Spaces {
  // g: the game ({ scene, physics, ground, actors, playerId, looks, sound, fx, fade(fn),
  //    onEnterInterior(space), onExitInterior(space), activities, props })
  constructor(g) {
    this.g = g;
    this.places = [];
    this.byId = {};
    this.interiors = {}; // key -> { def: { title, build }, door: Vector3, returnTo: Vector3, space? }
    this.town = { id: 'town', kind: 'town', origin: new THREE.Vector3(), hotspots: [], water: [], zones: [] };
    this.town.api = createApi(g, this.town);
    this.inside = null;
    this.count = 0;
    this.failed = [];
    this.npcs = [];
    this.walkAreas = []; // world rects outside the island shore that kids may walk on (a pier)
  }

  buildCtx(space, extra = {}) {
    const g = this.g;
    return {
      THREE,
      util,
      FONT: util.FONT,
      sign: makeSign,
      // Every extra person a place builds is listed in this.npcs ({ kid, space, look }), so town life
      // modules can add chats and actions to them (see src/engine/life.js)
      makeKid: (look) => {
        const kid = new Kid(look);
        this.npcs.push({ kid, space, look });
        return kid;
      },
      looks: g.looks,
      sound: g.sound,
      fx: g.fx,
      props: g.props,
      api: space.api,
      arenasHere: ARENAS.filter((a) => a.place === space.id).map((a) => a.id),
      ...extra,
    };
  }

  // Load every place module (or only some ids). slots: optional { id: [x, z] } overrides.
  // progress(i, n, title): called before each place is built (the loading screen); it may return a promise
  // to let the page repaint between places.
  // extra: [{ id, def, door: [x, z] }] interiors that weekend stops bring (they replace a manifest entry
  // with the same id).
  async load({ only = null, slots = {}, interiors = true, progress = null, extra = [] } = {}) {
    const defs = PLACES.filter((p) => (only ? only.includes(p.id) : !p.dev));
    const idefs = interiors ? INTERIORS.filter((p) => (!only || only.includes(p.id)) && !extra.some((e) => e.id === p.id)) : [];
    // Interiors download while the places are being built
    const iload = Promise.allSettled(idefs.map((d) => import(d.module)));
    const res = await Promise.allSettled(defs.map((d) => import(d.module)));
    for (let i = 0; i < res.length; i++) {
      const r = res[i];
      const def = { ...defs[i], slot: slots[defs[i].id] || defs[i].slot };
      if (r.status !== 'fulfilled') {
        this.failed.push(def.id);
        continue;
      }
      if (progress) await progress(i, res.length, r.value.default?.stop?.title || def.id);
      try {
        this.mountPlace(def, r.value.default);
      } catch (e) {
        console.error(`place ${def.id} failed to build`, e);
        this.failed.push(def.id);
      }
    }
    const ires = await iload;
    ires.forEach((r, i) => {
      if (r.status === 'fulfilled') this.addInterior(idefs[i].id, r.value.default, new THREE.Vector3(idefs[i].door[0], 0, idefs[i].door[1]));
      else this.failed.push(idefs[i].id);
    });
    if (interiors) for (const e of extra) this.addInterior(e.id, e.def, new THREE.Vector3(e.door[0], 0, e.door[1]));
    return this.places;
  }

  // ---------------------------------------------------------------- places
  mountPlace(def, mod) {
    const g = this.g;
    const [sx, sz] = def.slot;
    const [w, d] = def.size;
    const space = { id: def.id, kind: 'place', def, mod, stop: mod.stop || {}, origin: new THREE.Vector3(sx, 0, sz), size: { w, d }, hotspots: [], water: [], zones: [] };
    space.api = createApi(g, space);
    if (mod.icons) Object.assign(ICONS, mod.icons);
    const inst = mod.build(this.buildCtx(space, { size: { w, d } }));
    space.inst = inst;
    this.attach(space, inst);
    const pad = inst.pad || { x: 0, z: d / 2 + 1.2 };
    space.pad = new THREE.Vector3(sx + pad.x, 0, sz + pad.z);
    if (inst.interior) {
      const door = inst.door || { x: 0, z: d / 2 - 0.5 };
      this.addInterior(def.id, inst.interior, new THREE.Vector3(sx + door.x, 0, sz + door.z), space);
    }
    // Everything the place drew at build time, with room for what moves about in it (boats, gulls, rides)
    inst.group.updateMatrixWorld(true);
    space.bounds = new THREE.Box3().setFromObject(inst.group).expandByScalar(6);
    this.places.push(space);
    this.byId[def.id] = space;
    return space;
  }

  // Shared by places and interiors: add the group, colliders, hotspots, water, zones, holes and tints.
  attach(space, inst) {
    const g = this.g;
    const O = space.origin;
    inst.group.position.add(O);
    g.scene.add(inst.group);
    if (inst.bake !== false) util.bakeStatic(inst.group, inst.dynamic || [], mergeGeometries);
    space.colliders = (inst.colliders || []).map((c) => g.physics.add({ ...c, x: c.x + O.x, z: c.z + O.z }));
    for (const h of inst.holes || []) g.ground?.addHole(O.x + h.x, O.z + h.z, h.hw, h.hd);
    for (const t of inst.ground || []) g.ground?.addTint(O.x + t.x, O.z + t.z, t.hw, t.hd, t.color, t.feather ?? 2);
    for (const w of inst.water || []) space.water.push({ ...w, x: O.x + w.x, z: O.z + w.z });
    for (const z of inst.zones || []) space.zones.push({ ...z, x: O.x + z.x, z: O.z + z.z });
    for (const h of inst.hotspots || []) space.hotspots.push(this.hot(space, h));
    if (space.kind === 'place') for (const w of inst.walk || []) this.walkAreas.push({ x: O.x + w.x, z: O.z + w.z, hw: w.hw, hd: w.hd });
  }

  // Add a hotspot to a space at run time (town life modules). Returns a function that removes it.
  addHotspot(space, h) {
    const hs = this.hot(space, h);
    space.hotspots.push(hs);
    return () => {
      const i = space.hotspots.indexOf(hs);
      if (i >= 0) space.hotspots.splice(i, 1);
    };
  }

  onWalkway(x, z, pad = 0) {
    return this.walkAreas.some((w) => Math.abs(x - w.x) <= w.hw + pad && Math.abs(z - w.z) <= w.hd + pad);
  }

  hot(space, h) {
    const O = space.origin;
    const pos = new THREE.Vector3(O.x + (h.x ?? 0), 0, O.z + (h.z ?? 0));
    return {
      space,
      get pos() {
        if (h.track) {
          const p = h.track(space.api);
          pos.set(O.x + p.x, 0, O.z + p.z);
        }
        return pos;
      },
      r: h.r ?? 1.4,
      get label() {
        return typeof h.label === 'function' ? h.label(space.api) : h.label;
      },
      get icon() {
        return ICONS[h.icon] ? h.icon : 'star';
      },
      act: () => h.act?.(space.api),
      when: () => !h.when || h.when(space.api),
    };
  }

  // ---------------------------------------------------------------- interiors
  addInterior(key, def, door, owner = null) {
    const returnTo = door.clone().add(new THREE.Vector3(0, 0, 1.3));
    const host = owner || this.town;
    const locked = () => !!def.locked?.(host.api);
    this.interiors[key] = { key, def, door, returnTo, owner, space: null, locked, lockedLabel: def.lockedLabel || 'Locked', onLocked: () => def.onLocked?.(host.api) };
    host.hotspots.push(
      this.hot(
        { ...host, origin: new THREE.Vector3(), api: host.api },
        {
          x: door.x,
          z: door.z,
          r: 1.5,
          icon: 'door',
          label: () => (locked() ? def.lockedLabel || 'Locked' : `Go inside`),
          act: () => (locked() ? def.onLocked?.(host.api) : this.enter(key)),
        },
      ),
    );
  }

  buildInterior(rec) {
    const origin = new THREE.Vector3(INTERIOR_X + this.count++ * INTERIOR_STEP, 0, 0);
    const space = { id: rec.key, kind: 'interior', origin, title: rec.def.title, hotspots: [], water: [], zones: [], returnTo: rec.returnTo };
    space.api = createApi(this.g, space);
    const inst = rec.def.build(this.buildCtx(space));
    space.inst = inst;
    for (const c of inst.cutaway || []) if (!inst.dynamic?.includes(c.object)) (inst.dynamic ||= []).push(c.object);
    this.attach(space, inst);
    const ex = inst.exit || { x: 0, z: (inst.size?.d ?? 10) / 2 - 0.6 };
    space.hotspots.push(this.hot(space, { x: ex.x, z: ex.z, r: 1.3, icon: 'door', label: 'Go outside', act: () => this.exit() }));
    const sp = inst.spawn || { x: ex.x, z: ex.z - 1.2, yaw: Math.PI };
    space.spawn = new THREE.Vector3(origin.x + sp.x, 0, origin.z + sp.z);
    space.spawnYaw = sp.yaw ?? Math.PI;
    const w = inst.size?.w ?? 12;
    const d = inst.size?.d ?? 10;
    space.bounds = { x0: origin.x - w / 2, x1: origin.x + w / 2, z0: origin.z - d / 2, z1: origin.z + d / 2 };
    rec.space = space;
    return space;
  }

  // A locked door (the school) only opens with { force: true }, which the dev harness uses.
  enter(key, { force = false } = {}) {
    const rec = this.interiors[key];
    if (!rec || this.inside || this.entering) return;
    if (!force && rec.locked()) {
      rec.onLocked();
      return;
    }
    this.entering = true;
    // The screen fades first; the room is built and its shaders made ready while it is dark, so walking in
    // never freezes on the town view
    this.g.fade(async () => {
      try {
        if (!rec.space) {
          try {
            this.buildInterior(rec);
          } catch (e) {
            console.error(`interior ${key} failed to build`, e);
            this.g.toast('This door is stuck for now.');
            return;
          }
        }
        const s = rec.space;
        if (!s.compiled) {
          s.compiled = true;
          await this.g.precompile?.(s.inst.group);
        }
        this.inside = s;
        this.g.onEnterInterior(s);
        s.inst.onEnter?.(s.api);
      } finally {
        this.entering = false;
      }
    });
  }

  exit() {
    const s = this.inside;
    if (!s) return;
    if (this.g.activities.active) this.g.activities.end(true);
    this.g.fade(() => {
      s.inst.onExit?.(s.api);
      this.inside = null;
      this.g.onExitInterior(s);
    });
  }

  // ---------------------------------------------------------------- queries
  activeSpaces() {
    return this.inside ? [this.inside] : [this.town, ...this.places];
  }

  hotspots() {
    const out = [];
    for (const s of this.activeSpaces()) out.push(...s.hotspots);
    return out;
  }

  waterAt(x, z) {
    for (const s of this.activeSpaces()) {
      for (const w of s.water) if (Math.abs(x - w.x) < w.hw && Math.abs(z - w.z) < w.hd) return w;
    }
    return null;
  }

  zoneAt(x, z) {
    for (const s of this.activeSpaces()) {
      for (const q of s.zones) if (Math.abs(x - q.x) < q.hw && Math.abs(z - q.z) < q.hd) return q.ground || q.type || null;
    }
    return null;
  }

  placeNear(x, z, extra = 0) {
    for (const s of this.places) {
      if (Math.abs(x - s.origin.x) < s.size.w / 2 + extra && Math.abs(z - s.origin.z) < s.size.d / 2 + extra) return s;
    }
    return null;
  }

  // Interiors with rooms behind rooms: a wall listed in `cutaway` ({ object, x, z, hw, low }) sinks to a
  // low stub while the player is behind it (further from the camera), so the room stays in view.
  cutaway(space, playerPos, dt) {
    const list = space.inst.cutaway;
    if (!list?.length) return;
    const O = space.origin;
    const px = playerPos.x - O.x;
    const pz = playerPos.z - O.z;
    for (const c of list) {
      const behind = pz < c.z - 0.2 && Math.abs(px - c.x) < (c.hw ?? 3) + 2.5;
      const want = behind ? c.low ?? 0.16 : 1;
      const s = c.object.scale;
      s.y += (want - s.y) * (1 - Math.exp(-10 * dt));
      c.object.visible = s.y > 0.02;
    }
  }

  // Called just before each frame is drawn (after the camera moved). A place stays drawn only while its
  // bounds touch the camera's view or the sun's shadow view, so places out of sight cost nothing, and
  // the picture is the same: anything that could show up, or cast a shadow into view, is still drawn.
  // Inside a building the town is far behind the camera, so its places are skipped altogether.
  cull(view, shadow) {
    for (const s of this.places) {
      const g = s.inst.group;
      if (!g.visible) continue;
      if (this.inside || !(view.intersectsBox(s.bounds) || (shadow && shadow.intersectsBox(s.bounds)))) g.visible = false;
    }
  }

  update(dt, t, playerPos) {
    for (const rec of Object.values(this.interiors)) if (rec.space) rec.space.inst.group.visible = rec.space === this.inside;
    if (this.inside) {
      this.cutaway(this.inside, playerPos, dt);
      this.inside.inst.update?.(dt, t, this.inside.api);
      return;
    }
    for (const s of this.places) {
      const dx = Math.abs(playerPos.x - s.origin.x) - s.size.w / 2;
      const dz = Math.abs(playerPos.z - s.origin.z) - s.size.d / 2;
      // Far away (beyond the fog and the camera's reach): skip drawing it at all
      s.inst.group.visible = dx < 58 && dz < 52;
      if (!s.inst.update) continue;
      const near = dx < 45 && dz < 40;
      if (near || s.inst.alwaysUpdate) s.inst.update(dt, t, s.api);
    }
  }
}
