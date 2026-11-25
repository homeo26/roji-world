import { THREE, kit, colorBake, makeAtlas } from './kit.js';
import { buildShell, bakeCutWalls } from './interior/shell.js';
import { buildRooms } from './interior/rooms.js';
import { buildPeople } from './interior/people.js';
import { buildActs } from './interior/acts.js';
import { X0, X1, ZB, ZF, EXIT } from './interior/layout.js';

// Inside The Dice House, a dollhouse with no front wall (see interior/layout.js for the plan):
// the game library, the counter and the cosy corner at the back; the game tables, the entrance and the
// card room in front.

export default {
  title: 'The Dice House',
  build(ictx) {
    const { api } = ictx;
    const g = new THREE.Group();
    const dynamic = [];
    const colliders = [];
    const hotspots = [];
    const updates = [];
    const enters = [];
    const cutaway = [];
    const R = {
      K: kit(),
      api,
      ictx,
      g,
      cutaway,
      atlas: makeAtlas(2048, 1024, { rough: 0.8 }),
      add: (...o) => (g.add(...o), o[0]),
      dyn: (o) => (dynamic.push(o), o),
      col: (c) => colliders.push(c),
      // A collider that moves (the game master): its physics copy is looked up once the room is mounted
      movingCol(c) {
        const i = colliders.push(c) - 1;
        return {
          set(x, z) {
            const pc = api.space.colliders?.[i];
            if (!pc) return;
            pc.x = api.space.origin.x + x;
            pc.z = api.space.origin.z + z;
          },
        };
      },
      hot: (h) => hotspots.push(h),
      upd: (fn) => updates.push(fn),
      onEnter: (fn) => enters.push(fn),
    };
    buildShell(R);
    buildRooms(R);
    buildPeople(R);
    buildActs(R);
    bakeCutWalls(R);
    // Plain-coloured static furniture becomes a few vertex-coloured meshes
    dynamic.push(...colorBake(g, [...dynamic, ...cutaway.map((c) => c.object)]));

    return {
      group: g,
      dynamic,
      colliders,
      hotspots,
      cutaway,
      size: { w: X1 - X0, d: ZF - ZB + 0.6 },
      spawn: { x: EXIT.x, z: EXIT.z - 1.2, yaw: Math.PI },
      exit: EXIT,
      background: '#e9ddff',
      onEnter(a) {
        for (const fn of enters) fn(a);
      },
      update(dt, t, a) {
        for (const fn of updates) fn(dt, t, a);
      },
    };
  },
};
