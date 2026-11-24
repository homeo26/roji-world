import { THREE, mat, mesh, box, rbox, at, texMat, makeSky, makeAtlas, colorBake, bakeMat, mergeGeometries } from './kit.js';
import { L, ROOMS, DOORS, roomOf, doorPath, clampInto, wallpaper, floorTex, buildWall, buildDoor, updateDoors, drawIcon, ROOM_LOOK } from './shell.js';
import { makeCat, catBrain } from './cat.js';
import { buildKitchen } from './kitchen.js';
import { buildLiving } from './living.js';
import { buildBedroom } from './bedroom.js';
import { buildBathroom } from './bathroom.js';
import { buildStudy } from './study.js';
import { buildHall } from './hall.js';
import { buildSunroom } from './sunroom.js';
import { setupTalk } from './talk.js';
import { stepWalker, faceTo, RADIUS } from '../../engine/movement.js';
import { dampAngle } from '../../util.js';

export { L };

// Inside the cottage: a real house plan seen like a dollhouse (no front wall). The porch and the
// front door in the middle, the front hall with the living room on one side and the kitchen on the
// other, a long hallway behind them, and the bedroom, bathroom, study and sunroom behind the hallway. Walls in front of a back room sink while the player
// is behind them (cutaway), every room has a painted door that swings open, and the partner and
// Mishmish find their way through the doors.

const P = Math.PI;
const GUIDE = 'home-door';

export function buildInterior(ictx) {
  const { api } = ictx;
  const g = new THREE.Group();
  const dynamic = [];
  const colliders = [];
  const hotspots = [];
  const updates = [];
  const enters = [];
  const exits = [];
  const cutaway = [];
  const walls = {};
  const doors = [];
  const state = { act: null, carrying: null, eating: false, night: 0 };
  const sky = makeSky();
  const atlas = makeAtlas(2048, 2048);
  const add = (...o) => (g.add(...o), o[0]);

  // ---------------------------------------------------------------- materials
  const papers = {
    kitchen: wallpaper('#dff4e8', '#c3e7d4', 0.5, { tiles: ['#e8f6f1', '#ffffff'] }),
    living: wallpaper('#ffe9dc', '#ffd8c4', 0.27, { band: '#f4c9b0', motif: 'stripes' }),
    bedroom: wallpaper('#efe4ff', '#dccbff', 0.27, { band: '#d8c4f3', motif: 'stars' }),
    bathroom: wallpaper('#e3f4fb', '#cbeaf6', 0.42, { tiles: ['#bfe3ee', '#f4fcff'] }),
    study: wallpaper('#fff4d6', '#ffe6a6', 0.27, { band: '#bfe0c9' }),
    hallway: wallpaper('#fff3e8', '#ffd6cc', 0.3, { band: '#f0c2a8', motif: 'hearts' }),
    hall: wallpaper('#eef6e6', '#d4e9c8', 0.3, { band: '#e9c9a3', motif: 'leaves' }),
    sunroom: wallpaper('#f7fbe8', '#dcefc4', 0.22, { band: '#ffffff', motif: 'leaves' }),
    porch: wallpaper('#ffdccf', '#f2c1b2', 0, { motif: 'boards' }),
  };
  const pm = {};
  for (const [k, t] of Object.entries(papers)) pm[k] = texMat(t, { rough: 0.9 });

  // ---------------------------------------------------------------- floors
  add(at(box(L.W + 0.6, 0.4, 19.2, '#d9b38c'), 0, -0.25, -0.1));
  add(at(box(L.W + 0.64, 0.12, 0.06, '#ef5b6f'), 0, -0.2, L.ZF + 0.31));
  const FLOORS = { bedroom: ['carpet', 1.6], bathroom: ['hex', 1.4], study: ['lightwood', 2.2], sunroom: ['terra', 1.2], hallway: ['wood', 2.2], hall: ['terra', 1.2], porch: ['deck', 1.6], living: ['wood', 2.2], kitchen: ['tiles', 1.2] };
  const floorMats = {};
  for (const [room, [kind, tile]] of Object.entries(FLOORS)) {
    const [x0, x1, z0r, z1r] = ROOMS[room];
    const z0 = Math.max(z0r, -9.3);
    const z1 = Math.min(z1r, L.ZF + 0.02);
    const fg = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    fg.rotateX(-P / 2);
    fg.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const p = fg.attributes.position;
    const uv = fg.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / tile, -p.getZ(i) / tile);
    floorMats[kind] ??= texMat(floorTex(kind), { rough: kind === 'deck' ? 0.85 : 0.82 });
    add(mesh(fg, floorMats[kind], { cast: false }));
  }

  // ---------------------------------------------------------------- fixed walls
  const W = (spec, parent = g) => buildWall(parent, { colliders, ...spec }, mergeGeometries);
  // Back wall, one wallpaper per room
  for (const [room, a0, a1] of [['bedroom', -12.1, L.X1], ['bathroom', L.X1, L.X2], ['study', L.X2, L.X3], ['sunroom', L.X3, 12.1]]) W({ axis: 'x', c: L.ZB - 0.1, a0, a1, faces: { 1: pm[room] }, colliders: null });
  colliders.push({ type: 'box', x: 0, z: L.ZB - 0.1, hw: 12.3, hd: 0.12 });
  // Outer side walls, stepping down to a low wall at the front
  for (const [room, z0, z1, h] of [['bedroom', -9.4, L.Z1], ['hallway', L.Z1, L.Z2], ['living', L.Z2, L.LOW], ['living', L.LOW, L.ZF, 1.1]]) W({ axis: 'z', c: -12.1, a0: z0, a1: z1, h, faces: { 1: pm[room] } });
  for (const [room, z0, z1, h] of [['sunroom', -9.4, L.Z1], ['hallway', L.Z1, L.Z2], ['kitchen', L.Z2, L.LOW], ['kitchen', L.LOW, L.ZF, 1.1]]) W({ axis: 'z', c: 12.1, a0: z0, a1: z1, h, faces: { [-1]: pm[room] } });
  // Dividers: the hall has a door to the living room and one to the kitchen; the porch sits between them
  W({ axis: 'z', c: L.XA, a0: L.Z2, a1: L.Z3, faces: { [-1]: pm.living, 1: pm.hall }, holes: [{ at: 2.8, w: L.DW }] });
  W({ axis: 'z', c: L.XA, a0: L.Z3, a1: L.LOW, faces: { [-1]: pm.living, 1: pm.porch } });
  W({ axis: 'z', c: L.XA, a0: L.LOW, a1: L.ZF, h: 1.1, faces: { [-1]: pm.living, 1: pm.porch } });
  W({ axis: 'z', c: L.XB, a0: L.Z2, a1: L.Z3, faces: { [-1]: pm.hall, 1: pm.kitchen }, holes: [{ at: 2.8, w: L.DW }] });
  W({ axis: 'z', c: L.XB, a0: L.Z3, a1: L.LOW, faces: { [-1]: pm.porch, 1: pm.kitchen } });
  W({ axis: 'z', c: L.XB, a0: L.LOW, a1: L.ZF, h: 1.1, faces: { [-1]: pm.porch, 1: pm.kitchen } });
  W({ axis: 'z', c: L.X1, a0: -9.4, a1: L.Z1, faces: { [-1]: pm.bedroom, 1: pm.bathroom } });
  W({ axis: 'z', c: L.X2, a0: -9.4, a1: L.Z1, faces: { [-1]: pm.bathroom, 1: pm.study } });
  W({ axis: 'z', c: L.X3, a0: -9.4, a1: L.Z1, faces: { [-1]: pm.study, 1: pm.sunroom } });
  // Front lip so nobody walks off the dollhouse
  add(at(rbox(L.W, 0.12, 0.16, '#e9c9a3', 0.04), 0, 0.06, L.ZF - 0.05));
  colliders.push({ type: 'box', x: 0, z: L.ZF + 0.08, hw: L.W / 2, hd: 0.14 });

  // ---------------------------------------------------------------- cutaway walls with doors
  // Each wall in front of a room sinks while the player is behind it. decor: things hung on its visible
  // face, hidden while the wall is low.
  const cut = (id, spec, cx, hw) => {
    const object = new THREE.Group();
    const decor = new THREE.Group();
    object.add(decor);
    add(object);
    dynamic.push(object);
    W(spec, object);
    walls[id] = { object, decor, pivots: [] };
    cutaway.push({ object, x: cx, z: spec.c, hw });
    return walls[id];
  };
  const doorById = Object.fromEntries(DOORS.map((d) => [d.id, d]));
  const centre = (r) => [(ROOMS[r][0] + ROOMS[r][1]) / 2, (ROOMS[r][2] + ROOMS[r][3]) / 2];
  for (const d of DOORS) {
    if (!d.into) continue;
    const [cx, cz] = centre(d.into);
    d.intoSign = d.axis === 'x' ? Math.sign(cz - d.z) : Math.sign(cx - d.x);
  }
  const hole = (id) => ({ at: doorById[id].axis === 'x' ? doorById[id].x : doorById[id].z, w: doorById[id].w ?? L.DW, top: doorById[id].top });
  for (const [room, a0, a1, door] of [['bedroom', -12, L.X1, 'bedroom'], ['bathroom', L.X1, L.X2, 'bathroom'], ['study', L.X2, L.X3, 'study'], ['sunroom', L.X3, 12, 'sunroom']]) {
    cut(`z1-${room}`, { axis: 'x', c: L.Z1, a0, a1, faces: { 1: pm.hallway }, holes: [hole(door)] }, (a0 + a1) / 2, (a1 - a0) / 2);
  }
  for (const [room, a0, a1, door] of [['living', -12, L.XA, null], ['hall', L.XA, L.XB, 'hall'], ['kitchen', L.XB, 12, 'kitchen']]) {
    cut(`z2-${room}`, { axis: 'x', c: L.Z2, a0, a1, faces: { 1: pm[room] }, holes: door ? [hole(door)] : [] }, (a0 + a1) / 2, (a1 - a0) / 2);
  }
  cut('z3', { axis: 'x', c: L.Z3, a0: L.XA, a1: L.XB, faces: { 1: pm.porch }, holes: [hole('front')], cap: '#fff4ec' }, (L.XA + L.XB) / 2, (L.XB - L.XA) / 2);

  const wallOf = { front: 'z3', hall: 'z2-hall', kitchen: 'z2-kitchen', bedroom: 'z1-bedroom', bathroom: 'z1-bathroom', study: 'z1-study', sunroom: 'z1-sunroom' };
  for (const d of DOORS) {
    const w = walls[wallOf[d.id]];
    const parent = w ? w.object : g;
    const back = d.z === L.Z1;
    const faces = d.axis === 'z' ? [-1, 1] : [1];
    // Side doors of the hall get their plaque on the hall side
    const plaqueFaces = d.id === 'front' ? [] : d.axis === 'z' ? [d.x < 0 ? 1 : -1] : [1];
    const o = buildDoor(parent, d, { faces, atlas, plaqueFaces, plaqueParent: w?.decor });
    if (o) {
      doors.push(o);
      if (w) w.pivots.push(o.pivot);
      else dynamic.push(o.pivot);
    }
    // Doormat on the hallway side (the porch has its own welcome mat)
    if (d.id === 'front') continue;
    const look = ROOM_LOOK[d.look];
    const mat2 = (ctx, cw, ch) => {
      ctx.fillStyle = look.frame;
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = look.leaf;
      ctx.fillRect(14, 14, cw - 28, ch - 28);
      ctx.strokeStyle = look.frame;
      ctx.lineWidth = 3;
      for (let x = 30; x < cw - 30; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, 24);
        ctx.lineTo(x, 30);
        ctx.moveTo(x, ch - 30);
        ctx.lineTo(x, ch - 24);
        ctx.stroke();
      }
      drawIcon(ctx, look.icon, cw / 2, ch / 2, 22, look.frame);
    };
    const dm = atlas.panel(1.1, 0.52, 256, 120, mat2);
    dm.rotation.x = -P / 2;
    if (d.axis === 'x') {
      const side = back ? 1 : -1;
      dm.position.set(d.x, 0.012, d.z + side * 0.5);
    } else {
      dm.rotation.z = P / 2;
      dm.position.set(d.x + (d.x < 0 ? 0.48 : -0.48), 0.012, d.z);
    }
    add(dm);
  }

  // Windows on the back wall share one sky (day or night)
  const windowAt = (x, y, w, h, curtain, { z = L.ZB, parent = g } = {}) => {
    const put = (o) => (parent.add(o), o);
    put(at(rbox(w + 0.18, h + 0.18, 0.08, '#ffffff', 0.04), x, y, z + 0.04));
    put(at(mesh(new THREE.PlaneGeometry(w, h), sky.material, { cast: false }), x, y, z + 0.085));
    put(at(box(0.05, h, 0.04, '#ffffff'), x, y, z + 0.1));
    put(at(box(w, 0.05, 0.04, '#ffffff'), x, y, z + 0.1));
    put(at(box(w + 0.3, 0.06, 0.16, '#ffffff'), x, y - h / 2 - 0.1, z + 0.1));
    if (curtain) {
      put(at(box(w + 0.8, 0.04, 0.04, '#c9a27a'), x, y + h / 2 + 0.22, z + 0.18));
      for (const s of [-1, 1]) {
        put(at(rbox(0.3, h + 0.45, 0.07, curtain, 0.035), x + s * (w / 2 + 0.17), y - 0.02, z + 0.2));
        put(at(box(0.34, 0.05, 0.09, '#ffffff'), x + s * (w / 2 + 0.17), y - h * 0.2, z + 0.22));
      }
    }
  };
  // A window in a side wall. side +1: the glass faces +X (on the left wall), -1 faces -X.
  const sideWindow = (x, z, y, w, h, side, curtain) => {
    const grp = new THREE.Group();
    windowAt(0, y, w, h, curtain, { z: 0, parent: grp });
    grp.position.set(x, 0, z);
    grp.rotation.y = side * P / 2;
    add(grp);
    return grp;
  };
  sideWindow(-11.98, -0.7, 1.75, 1.0, 0.8, 1, '#ffc4cf');
  sideWindow(11.98, -0.7, 1.75, 1.0, 0.8, -1, '#ffc4cf');

  // Warm light for night activities (bed, movie, story). Off by default.
  const light = new THREE.PointLight('#ffc98a', 0, 7, 1.6);
  light.position.set(0, 2, 0);
  add(light);

  // ---------------------------------------------------------------- the shared room toolkit
  const R = {
    atlas,
    ctx: ictx,
    api,
    THREE,
    L,
    g,
    add,
    dynamic,
    state,
    sky,
    light,
    windowAt,
    sideWindow,
    walls,
    papers: pm,
    hang: (...o) => (g.add(...o), o[0]),
    col: (...c) => colliders.push(...c),
    hot: (...h) => hotspots.push(...h),
    upd: (fn) => updates.push(fn),
    onEnter: (fn) => enters.push(fn),
    onExit: (fn) => exits.push(fn),
    dyn: (...o) => (dynamic.push(...o), o[0]),
    // World position just above a kid's head (for hearts)
    headPos: (actor) => actor.kid.head.localToWorld(new THREE.Vector3(0, 0.75, 0)),
    // Start an activity, keeping track of which one is running
    start(name, spec) {
      if (state.carrying) {
        api.toast('Open your gift first!', 1800);
        return null;
      }
      if (state.eating) {
        api.toast('Finish your snack first!', 1800);
        return null;
      }
      const token = { name };
      state.act = token;
      if (spec.night !== undefined) sky.draw(spec.night > 0.5);
      return api.activity({
        ...spec,
        onEnd: (silent) => {
          if (state.act === token) state.act = null;
          if (spec.night !== undefined) sky.draw(false);
          light.intensity = 0;
          spec.onEnd?.(silent);
        },
      });
    },
    is: (name) => state.act?.name === name,
    // Put a kid somewhere during an activity (they stay seated, so nothing else moves them)
    place(a, x, z, o = {}) {
      const w = api.world(x, z);
      a.pos.set(w.x, 0, w.z);
      if (o.y !== undefined) a.y = o.y;
      if (o.yaw !== undefined) a.yaw = o.yaw;
      a.speed = o.speed ?? 0;
      a.kid.root.position.set(w.x, a.y, w.z);
      if (!o.keepRot) a.kid.root.rotation.set(0, a.yaw, 0);
    },
    // Walk a seated kid toward (x, z) during an activity. Returns true on arrival.
    walkTo(a, x, z, dt, speed = 1.7) {
      const p = api.localPos(a);
      const dx = x - p.x;
      const dz = z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.04) {
        R.place(a, x, z, { y: 0, speed: 0 });
        return true;
      }
      const s = Math.min(d, speed * dt);
      a.yaw = dampAngle(a.yaw, Math.atan2(dx, dz), 10, dt);
      R.place(a, p.x + (dx / d) * s, p.z + (dz / d) * s, { y: 0, yaw: a.yaw, speed });
      return false;
    },
    // Tiny tween helper driven by the interior update
    tweens: [],
    tween(dur, fn, done) {
      R.tweens.push({ t: 0, dur, fn, done });
    },
    later(sec, fn) {
      R.tween(sec, () => {}, fn);
    },
    sound(fn) {
      const s = api.sound;
      if (s?.ctx) fn(s, s.ctx.currentTime + 0.02);
    },
    roomOf,
  };
  R.talk = setupTalk(R);
  // Roji is tired after a hospital shift or a long time playing; a foot rub or a night's sleep helps
  R.restedAt = 0;
  R.restedWall = 0;
  R.tired = (a) => {
    const shift = a.load('shiftAt', 0);
    if (shift && Date.now() - shift < 45 * 60 * 1000 && shift > R.restedWall) return true;
    return a.time() - R.restedAt > 20 * 60;
  };
  R.rest = () => {
    R.restedAt = api.time();
    R.restedWall = Date.now();
    api.save('shiftAt', 0);
  };

  // A room builder written in its own coordinates: everything it adds is moved by (dx, dz), and
  // its hotspots, colliders, activities and api calls are moved the same way.
  const shifted = (dx, dz, wall) => {
    const sp = (s) => (s ? { ...s, x: (s.x ?? 0) + dx, z: (s.z ?? 0) + dz } : s);
    const act = (spec) => ({ ...spec, seats: (spec.seats || []).map(sp), focus: spec.focus && sp(spec.focus), exit: spec.exit && sp(spec.exit) });
    const A = Object.create(api);
    A.world = (x, z, y) => api.world(x + dx, z + dz, y);
    A.local = (v) => {
      const q = api.local(v);
      q.x -= dx;
      q.z -= dz;
      return q;
    };
    A.localPos = (a) => {
      const q = api.localPos(a);
      q.x -= dx;
      q.z -= dz;
      return q;
    };
    A.activity = (spec) => api.activity(act(spec));
    A.seat = (who, s) => api.seat(who, sp(s));
    A.focus = (s) => api.focus(s && sp(s));
    const grp = new THREE.Group();
    grp.position.set(dx, 0, dz);
    g.add(grp);
    const r = Object.create(R);
    Object.assign(r, {
      api: A,
      L: { ...L, ZB: -4.6 },
      g: grp,
      add: (...o) => (grp.add(...o), o[0]),
      hang: wall
        ? (...o) => {
            for (const q of o) {
              q.position.x += dx;
              q.position.z += dz;
              wall.decor.add(q);
            }
            return o[0];
          }
        : (...o) => (grp.add(...o), o[0]),
      col: (...c) => R.col(...c.map(sp)),
      hot: (...hs) =>
        R.hot(
          ...hs.map((h) => ({
            ...h,
            x: (h.x ?? 0) + dx,
            z: (h.z ?? 0) + dz,
            act: (a) => h.act?.(A),
            when: h.when && (() => h.when(A)),
            label: typeof h.label === 'function' ? () => h.label(A) : h.label,
            track:
              h.track &&
              (() => {
                const p = h.track(A);
                return { x: p.x + dx, z: p.z + dz };
              }),
          })),
        ),
      upd: (fn) => R.upd((dt, t) => fn(dt, t, A)),
      onEnter: (fn) => R.onEnter(() => fn(A)),
      onExit: (fn) => R.onExit(() => fn(A)),
      start: (name, spec) => R.start(name, act(spec)),
      windowAt: (x, y, w, h, c) => R.windowAt(x + dx, y, w, h, c),
      place: (a, x, z, o) => R.place(a, x + dx, z + dz, o),
      walkTo: (a, x, z, dt, s) => R.walkTo(a, x + dx, z + dz, dt, s),
      dx,
      dz,
      light: {
        position: { set: (x, y, z) => light.position.set(x + dx, y, z + dz) },
        color: light.color,
        get intensity() {
          return light.intensity;
        },
        set intensity(v) {
          light.intensity = v;
        },
      },
      cat: {
        goTo: (id, stay) => R.cat.goTo(id, stay),
        hold: (fn, start) =>
          R.cat.hold((t, dt2) => {
            const o = fn(t, dt2);
            return { ...o, x: o.x + dx, z: o.z + dz };
          }, start && sp(start)),
        release: () => R.cat.release(),
        meow: (txt) => R.cat.meow(txt),
        get spot() {
          return R.cat.st.spot?.id;
        },
      },
      talk: {
        say: (actor, kind, o) => R.talk.say(actor, kind, o),
        clear: () => R.talk.clear(),
      },
    });
    return r;
  };

  buildKitchen(shifted(18.3, 5.3, walls['z2-kitchen']));
  buildLiving(shifted(-1.2, 5.3, walls['z2-living']));
  buildBedroom(shifted(-9.6, -4.7, null));
  buildBathroom(shifted(-8.6, -4.7, null));
  buildStudy(shifted(-8.6, -4.7, null));
  buildHall(R);
  buildSunroom(R);

  // ---------------------------------------------------------------- Mishmish
  const cat = makeCat();
  add(cat.root);
  dynamic.push(cat.root);
  const spots = [
    { id: 'catbed', x: -9.75, z: 6.05, y: 0.09, nap: true, yaw: 0.6 },
    { id: 'sofa', x: -7.2, z: 6.16, y: 0.52, nap: true, hop: { x: -7.2, z: 7.35 }, over: 0.6, yaw: P - 0.4 },
    { id: 'bowl', x: 10.85, z: 2.55, sit: true, yaw: P / 2 },
    { id: 'kitchen', x: 8.0, z: 7.6, sit: true, yaw: 0.3 },
    { id: 'rug', x: -6.7, z: -5.0, nap: true, yaw: -0.6 },
    { id: 'bedfoot', x: -8.2, z: -7.0, y: 0.7, nap: true, hop: { x: -8.2, z: -6.1 }, yaw: 1.3 },
    { id: 'mat', x: -1.3, z: -7.45, sit: true, yaw: 2.6 },
    { id: 'study', x: 4.5, z: -7.6, sit: true, yaw: 0.2 },
    { id: 'laptop', x: 2.43, z: -8.78, y: 0.79, nap: true, hop: { x: 2.1, z: -7.7 }, yaw: P / 2 + 0.3 },
    { id: 'hallway', x: 1.9, z: -0.7, nap: true, yaw: 1.2 },
    { id: 'shoes', x: 1.3, z: 4.25, sit: true, yaw: P / 2 },
    ...(R.catSpots || []),
  ];
  const route = (sx, sz, tx, tz) => doorPath(roomOf(sx, sz), roomOf(tx, tz), { avoid: ['porch'] }) || [];
  const brain = catBrain(cat, spots, { api, route });
  R.cat = brain;
  R.catSpot = (id) => spots.find((s) => s.id === id);
  hotspots.push({
    track: () => ({ x: brain.pos.x, z: brain.pos.z }),
    r: 1.3,
    label: 'Pet Mishmish',
    icon: 'paw',
    when: () => !brain.busy,
    act: (a) => {
      brain.pet();
      a.fx.heartsAt(a.world(brain.pos.x, brain.pos.z, brain.pos.y + 0.7), 4);
      const lines = ['Mishmish purrs happily.', 'Mishmish rubs her head on your hand.', 'Purrrr... Mishmish loves you.'];
      if (brain.st.spot?.id === 'laptop') lines.push("Mishmish is warm and cosy on Homama's laptop. She will not move.");
      a.toast(lines[Math.floor(Math.random() * lines.length)], 2200);
    },
  });

  // ---------------------------------------------------------------- the partner finds the way
  // In the town the partner walks straight toward the player. In here that would end at a wall, so when
  // the player is in another room the partner is walked through the doors instead.
  const gameRef = () => ictx.api?.game || (typeof window !== 'undefined' ? window.__roji?.game || window.__dev?.game : null) || null;
  const guide = { on: false, path: [], room: null, plan: 0, stuck: 0, best: Infinity, wait: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3() };
  const tmp = new THREE.Vector3();
  const release = () => {
    const G = gameRef();
    if (G && G.partnerBusy === GUIDE) G.partnerBusy = null;
    guide.on = false;
    guide.path = [];
    guide.wait = 0;
  };
  R.releaseGuide = release;
  function guideUpdate(dt, a) {
    const G = gameRef();
    const c = a.partner;
    const p = a.player;
    const busy = a.activityRunning || c.seated || (G?.partnerBusy && G.partnerBusy !== GUIDE) || !G?.physics;
    if (busy) {
      if (guide.on) release();
      return;
    }
    if (guide.on) {
      // A jump across the room means someone placed the partner on purpose: let go
      if (c.pos.distanceTo(guide.pos) > 1.5) {
        release();
        return;
      }
      // A small step means the dev harness follow nudged the partner since last frame: undo it
      c.pos.copy(guide.pos);
      c.vel.copy(guide.vel);
    }
    const P0 = a.localPos(p);
    const C0 = a.localPos(c);
    const rp = roomOf(P0.x, P0.z);
    const rc = roomOf(C0.x, C0.z);
    const dist = Math.hypot(P0.x - C0.x, P0.z - C0.z);
    if (!guide.on) {
      if (rc === rp) {
        guide.wait = 0;
        return;
      }
      // Different rooms: give the normal follow a moment (it often walks straight through the door)
      guide.wait += dt * (c.speed < 0.6 ? 2.5 : 1);
      if (dist < 2.4 && guide.wait < 0.6) return;
      guide.on = true;
      guide.plan = 0;
      guide.room = null;
      guide.pos.copy(c.pos);
      guide.vel.copy(c.vel);
      G.partnerBusy = GUIDE;
    }
    // Where the normal follow wants to be, kept inside the player's room. While that point is beyond a
    // wall (the player stands just inside a door) the partner is parked beside the player instead, so
    // the two never hand the partner back and forth.
    const fx = Math.sin(p.yaw);
    const fz = Math.cos(p.yaw);
    let tx = P0.x - fx * 1.0 + Math.cos(p.yaw) * 0.9;
    let tz = P0.z - fz * 1.0 - Math.sin(p.yaw) * 0.9;
    const outside = roomOf(tx, tz) !== rp;
    if (outside) {
      for (const side of [0.8, -0.8]) {
        const q = clampInto(rp, P0.x + Math.cos(p.yaw) * side - fx * 0.3, P0.z - Math.sin(p.yaw) * side - fz * 0.3);
        ({ x: tx, z: tz } = q);
        if (Math.hypot(q.x - P0.x, q.z - P0.z) > 0.6) break;
      }
    }
    if (rc === rp && !outside && (dist < 1.7 || Math.hypot(tx - C0.x, tz - C0.z) < 0.5)) {
      release();
      return;
    }
    guide.plan -= dt;
    if (guide.room !== rp || guide.plan <= 0 || !guide.path.length) {
      guide.room = rp;
      guide.plan = 0.6;
      guide.path = [...(doorPath(rc, rp) || []), { x: tx, z: tz, end: true }];
      // Skip a first door point that is already behind us
      while (guide.path.length > 1 && Math.hypot(guide.path[0].x - C0.x, guide.path[0].z - C0.z) < 0.35) guide.path.shift();
      guide.best = Infinity;
    } else guide.path[guide.path.length - 1] = { x: tx, z: tz, end: true };
    const wpt = guide.path[0];
    const dx = wpt.x - C0.x;
    const dz = wpt.z - C0.z;
    const d = Math.hypot(dx, dz);
    if (!wpt.end && d < 0.4) {
      guide.path.shift();
      guide.best = Infinity;
      guide.stuck = 0;
    }
    // Stuck behind furniture: hop to the waypoint with a little poof
    if (wpt.end && d < 0.35) guide.stuck = 0;
    else if (d < guide.best - 0.05) {
      guide.best = d;
      guide.stuck = 0;
    } else guide.stuck += dt;
    if (guide.stuck > 1.4) {
      a.fx.poof(c.pos.clone());
      const w = a.world(wpt.x, wpt.z);
      c.pos.set(w.x, 0, w.z);
      a.fx.poof(c.pos.clone());
      guide.stuck = 0;
      guide.best = Infinity;
      guide.path.shift();
    }
    const far = dist > 5;
    stepWalker(c, G.physics, dx, dz, wpt.end ? (d < 0.12 ? 0 : Math.min(1, d * 1.5)) : 1, far ? 6.4 : 4.6, 10, dt);
    if (c.speed > 0.25) faceTo(c, dt, Math.atan2(c.vel.x, c.vel.z));
    else if (wpt.end) faceTo(c, dt, Math.atan2(P0.x - C0.x, P0.z - C0.z), 4);
    c.y = 0;
    c.vy = 0;
    c.kid.root.position.set(c.pos.x, 0, c.pos.z);
    c.kid.root.rotation.set(0, c.yaw, 0);
    guide.pos.copy(c.pos);
    guide.vel.copy(c.vel);
  }

  // ---------------------------------------------------------------- bake and return
  // Merge each cutaway wall's fixed parts and its decor
  for (const w of Object.values(walls)) {
    // Keep animated things (dynamic) apart, but not the wall itself, which holds everything else
    const keep = dynamic.filter((o) => o !== w.object);
    colorBake(w.decor, keep, { single: true, cast: false });
    bakeMat(w.decor, keep);
    colorBake(w.object, [w.decor, ...w.pivots, ...keep], { single: true });
    bakeMat(w.object, [w.decor, ...w.pivots, ...keep]);
  }
  // Plain-coloured static furniture becomes a few vertex-coloured meshes
  dynamic.push(...colorBake(g, dynamic));

  const openers = [{}, {}, {}];
  return {
    group: g,
    dynamic,
    colliders,
    hotspots,
    cutaway,
    R, // for tests: the room toolkit (cat, state)
    size: { w: L.W, d: L.D },
    spawn: { x: -0.1, z: 7.3, yaw: P },
    exit: { x: -0.1, z: 8.65 },
    background: '#f6dccb',
    onEnter(a) {
      sky.draw(false);
      release();
      for (const o of doors) {
        o.k = 0;
        o.target = 0;
      }
      for (const fn of enters) fn(a);
      // Coming home tired: a little yawn and a hint
      if (R.tired(a)) {
        R.later(2.6, () => {
          if (!api.inside || api.activityRunning) return;
          R.talk.say(a.roji, 'text', { text: 'Yawn...', dur: 2.2 });
          a.toast(a.playerId === 'roji' ? 'What a long day. A foot rub in the bedroom would be nice...' : 'Roji looks tired. Maybe rub her feet in the bedroom?', 3600);
        });
      }
    },
    onExit(a) {
      light.intensity = 0;
      release();
      R.talk.clear();
      for (const fn of exits) fn(a);
    },
    update(dt, t, a) {
      for (let i = R.tweens.length - 1; i >= 0; i--) {
        const tw = R.tweens[i];
        tw.t += dt;
        const k = Math.min(1, tw.t / tw.dur);
        tw.fn(k);
        if (k >= 1) {
          R.tweens.splice(i, 1);
          tw.done?.();
        }
      }
      guideUpdate(dt, a);
      const pl = a.localPos(a.player);
      const pa = a.localPos(a.partner);
      openers[0].x = pl.x;
      openers[0].z = pl.z;
      openers[1].x = pa.x;
      openers[1].z = pa.z;
      openers[2].x = brain.pos.x;
      openers[2].z = brain.pos.z;
      openers[2].r = 1.3;
      updateDoors(doors, openers, dt, (o) => {
        if (Math.hypot(pl.x - o.wx, pl.z - o.wz) < 6) R.sound((s, t0) => s.tone(300, t0, 0.07, { type: 'triangle', gain: 0.02, slideTo: 240 }));
      });
      for (const w of Object.values(walls)) w.decor.visible = w.object.scale.y > 0.62;
      brain.update(dt, t, pl);
      R.talk.update(dt, t);
      for (const fn of updates) fn(dt, t, a);
    },
  };
}
