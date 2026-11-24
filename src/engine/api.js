import * as THREE from 'three';
import { choose } from './choose.js';

// The object every place, interior and hotspot receives as `api`.
// Coordinates passed to api methods are LOCAL to the space the api belongs to
// (a place: its footprint centre; an interior: its own origin). api.world()/api.local() convert.
//
// g: the running game (src/main.js or the dev harness). It provides:
//   actors, playerId(), looks, toast(html, ms), sound, fx, activities, arena, spaces,
//   setNight(k), setFocus(spec|null), time(), emote(actor, type)

export function createApi(g, space) {
  const o = () => space.origin;
  const W = (x, z, y = 0) => new THREE.Vector3(o().x + x, y, o().z + z);
  const toWorldSpec = (s) => (s ? { ...s, x: o().x + (s.x ?? 0), z: o().z + (s.z ?? 0) } : s);
  const api = {
    // The shared game object (partnerBusy, physics, life events) for places that move the partner themselves
    get game() {
      return g;
    },
    THREE,
    space,
    get id() {
      return space.id;
    },
    get playerId() {
      return g.playerId();
    },
    get partnerId() {
      return g.playerId() === 'roji' ? 'homama' : 'roji';
    },
    get player() {
      return g.actors[g.playerId()];
    },
    get partner() {
      return g.actors[g.playerId() === 'roji' ? 'homama' : 'roji'];
    },
    actor: (id) => g.actors[id],
    get roji() {
      return g.actors.roji;
    },
    get homama() {
      return g.actors.homama;
    },
    looks: g.looks,
    sound: g.sound,
    fx: g.fx,
    time: () => g.time(),

    // Positions
    world: W, // local (x, z, y) -> world Vector3
    local: (v) => new THREE.Vector3(v.x - o().x, v.y, v.z - o().z),
    localPos: (actor) => new THREE.Vector3(actor.pos.x - o().x, actor.y, actor.pos.z - o().z),

    // Messages and reactions
    toast: (html, ms) => g.toast(html, ms),
    choose: (spec) => choose(spec), // { title, text, options: [{ id, label, sub }] } -> Promise<id | null>
    emote: (who, type) => g.emote(typeof who === 'string' ? g.actors[who] || api[who] : who, type),

    // Activities (see engine/activities.js for the spec). Coordinates local.
    activity(spec) {
      return g.activities.start({
        ...spec,
        seats: (spec.seats || []).map(toWorldSpec),
        focus: spec.focus ? { zoom: 0.62, y: 1, ...toWorldSpec(spec.focus) } : null,
        exit: spec.exit ? toWorldSpec(spec.exit) : null,
      });
    },
    endActivity: () => g.activities.end(),
    get activityRunning() {
      return g.activities.active;
    },
    seat: (who, s) => g.activities.seat(typeof who === 'string' ? g.activities.who(who) : who, toWorldSpec(s)),

    // Carry something in both hands (null to put it down). who: actor or 'player' | 'partner' | id
    carry(who, obj) {
      const a = typeof who === 'string' ? g.activities.who(who) : who;
      return a.kid.carry(obj);
    },

    // Interiors and minigames
    enter: (key) => g.spaces.enter(key || space.id),
    exit: () => g.spaces.exit(),
    get inside() {
      return !!g.spaces.inside;
    },
    playArena: (id, opts) => g.playArena(id, opts),
    hasArena: (id) => g.arena.has(id),

    // Opens the clothes and hair panel (a wardrobe in a bedroom, a locker)
    openWardrobe: () => (g.openWardrobe ? g.openWardrobe() : g.toast('The wardrobe opens here in the full game.')),

    // Look and light
    setNight: (k) => g.setNight(k),
    focus: (spec) => g.setFocus(spec ? { zoom: 0.62, y: 1, ...toWorldSpec(spec) } : null),

    // Small saved state for this space
    save(key, value) {
      try {
        localStorage.setItem(`roji-world-${space.id}-${key}`, JSON.stringify(value));
      } catch {
        /* storage full or blocked */
      }
    },
    load(key, fallback = null) {
      try {
        const v = localStorage.getItem(`roji-world-${space.id}-${key}`);
        return v === null ? fallback : JSON.parse(v);
      } catch {
        return fallback;
      }
    },
  };
  return api;
}
