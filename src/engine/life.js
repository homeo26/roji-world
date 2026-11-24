// Town life: small modules that add moments on top of the game (Homama's little gestures, NPC chats)
// without touching main.js. Each module in LIFE (src/engine/manifest.js) default-exports
// { id, init(ctx) } and listens to the events below.
//
// ctx: { THREE, util, game, api, life, props, state() }
//   game: the shared game object (actors, spaces, activities, fx, sound, toast, emote, scene, physics)
//   api: the town api (src/engine/api.js) for toasts, choices, emotes, carrying and positions
//   state(): { playerId, holding, mount, inside, activity, free } where `free` means the player is
//     walking around in the town or a building with no game, card, activity or mount in the way
//
// Events (life.on(name, fn)):
//   'tick'    (dt, t)                every frame while no 3D game is open
//   'enter'   (space)                after walking into a building (space.id is the interior key)
//   'exit'    (space)                after walking back out
//   'activity'(spec)                 an activity started (spec.label, e.g. 'Sleep', 'Movie night')
//   'activity-end' (spec)            it ended
//   'arena'   (id)                   a 3D game is opening
//   'arena-end' (id, result)         it closed
//   'stamp'   (stopId)               a weekend stamp was collected
//
// game.partnerBusy: set to a truthy value while a module moves the partner itself (a hug, bringing a
// rose); the normal follow logic waits until it is cleared. Always clear it, even when interrupted.

export class Life {
  constructor() {
    this.handlers = new Map();
  }

  on(name, fn) {
    if (!this.handlers.has(name)) this.handlers.set(name, new Set());
    this.handlers.get(name).add(fn);
    return () => this.handlers.get(name)?.delete(fn);
  }

  emit(name, ...args) {
    const set = this.handlers.get(name);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(...args);
      } catch (e) {
        console.error(`life ${name} handler failed`, e);
        set.delete(fn);
      }
    }
  }
}
