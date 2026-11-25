import * as THREE from 'three';
import { makeAtlas, makeSky, bakeMat } from '../places/home/kit.js';
import { colorBake } from './clay/models.js';
import { buildShell } from './clay/shell.js';
import { buildCafe } from './clay/cafe.js';
import { buildStudio } from './clay/studio.js';
import { buildKilnRoom } from './clay/kiln.js';
import { X1, X0, ZB, ZF, ENTRANCE } from './clay/layout.js';

// Inside the Clay Café, a dollhouse with no front wall and rooms behind rooms (see clay/layout.js):
// in front, the café (counter, barista, cakes, tables, the window seat) and the little shop with the
// guest book by the door; behind the cutaway walls, the pottery studio and the kiln room.

export default {
  title: 'Clay Café',
  build(ictx) {
    const { api } = ictx;
    const g = new THREE.Group();
    const dynamic = [];
    const colliders = [];
    const hotspots = [];
    const updates = [];
    const enters = [];
    const add = (...o) => (g.add(...o), o[0]);
    const R = {
      g,
      api,
      ictx,
      add,
      dyn: (o) => (dynamic.push(o), o),
      col: (x, z, hw, hd, h) => colliders.push(h === undefined ? { type: 'box', x, z, hw, hd } : { type: 'box', x, z, hw, hd, h }),
      circ: (x, z, r, h) => colliders.push(h === undefined ? { type: 'circle', x, z, r } : { type: 'circle', x, z, r, h }),
      hot: (...h) => hotspots.push(...h),
      upd: (fn) => updates.push(fn),
      onEnter: (fn) => enters.push(fn),
      atlas: makeAtlas(2048, 2048),
      sky: makeSky(),
      cutaway: [],
      tone: (f, d, o) => {
        const s = api.sound;
        if (s?.ctx) s.tone(f, s.ctx.currentTime, d, o);
      },
    };
    buildShell(R);
    buildCafe(R);
    buildStudio(R);
    buildKilnRoom(R);

    // Plain-coloured static furniture becomes a few vertex-coloured meshes; the cutaway walls each bake to one
    for (const c of R.cutaway) bakeMat(colorBake(c.object, [], { single: true, cast: true }) && c.object);
    dynamic.push(...colorBake(g, [...dynamic, ...R.cutaway.map((c) => c.object)]));

    const night = () => /night|dusk|dawn/i.test(api.game?.phase?.() || '');
    return {
      group: g,
      dynamic,
      colliders,
      hotspots,
      cutaway: R.cutaway,
      size: { w: X1 - X0, d: ZF - ZB + 0.6 },
      spawn: { x: ENTRANCE.x, z: ENTRANCE.z - 1.4, yaw: Math.PI },
      exit: ENTRANCE,
      background: '#f6d8c4',
      onEnter(a) {
        const n = night();
        R.sky.draw(n);
        R.bulbMat.emissiveIntensity = n ? 2.2 : 1.2;
        R.bulbPink.emissiveIntensity = n ? 1.9 : 1.0;
        for (const fn of enters) fn(a);
      },
      update(dt, t, a) {
        for (const fn of updates) fn(dt, t, a);
      },
    };
  },
};
