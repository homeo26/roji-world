import { THREE, kit, makeAtlas, colorBake, mesh, umat, canvasTexture, uvScale } from '../places/school/kit.js';
import { buildLobby } from './cinema/lobby.js';
import { buildHall } from './cinema/hall.js';
import { GOLD, WINE, wallpaper } from './cinema/models.js';
import { FILMS, byId, UNLOCK, shortTitle } from './cinema/films/index.js';

// Inside the cinema, built like a dollhouse with no front wall:
// the lobby (tickets, popcorn counter, candy, posters) | the screening room (velvet seats on steps and the big screen).

export const L = {
  W: 30,
  ZB: -4.6, // inner face of the back wall
  ZF: 4.8, // front edge of the floor
  LOBBY: [-15, -3],
  HALL: [-3, 15],
  HL: 3.4, // lobby wall height
  HH: 4.9, // screening room wall height
  DOOR: [-2.5, -0.5], // doorway in the divider (z)
};

export default {
  title: 'Cinema',
  build(ictx) {
    const { api } = ictx;
    const k = kit();
    const { box, rbox, at } = k;
    const g = new THREE.Group();
    const dynamic = [];
    const colliders = [];
    const hotspots = [];
    const updates = [];
    const enters = [];
    const exits = [];
    const add = (...o) => (g.add(...o), o[0]);
    const { ZB, ZF, HL, HH } = L;
    const D = ZF - ZB;
    const R = {
      k,
      L,
      g,
      api,
      ictx,
      add,
      atlas: makeAtlas(2048, 2048),
      dyn: (o) => (dynamic.push(o), o),
      col: (...c) => colliders.push(...c),
      hot: (...h) => hotspots.push(...h),
      upd: (fn) => updates.push(fn),
      onEnter: (fn) => enters.push(fn),
      onExit: (fn) => exits.push(fn),
      state: { movie: false },
      bulbs: [],
      boards: [], // live canvas panels redrawn after a film (stubs, programme, secret poster)
      ticket: null, // the film on the tickets bought at the booth
    };

    // ---------------------------------------------------------------- the programme and what they have seen
    const watched = () => new Set(api.load('watched', []).filter((id) => byId[id] && !byId[id].secret));
    const unlocked = () => watched().size >= UNLOCK;
    R.prog = {
      watched,
      unlocked,
      open: () => FILMS.filter((f) => !f.secret || unlocked()),
      stubs: () => api.load('stubs', []).filter((s) => byId[s.id]),
      // A film watched to the end: pin its stub; returns true when this one unlocked the secret film
      finished(id) {
        const before = unlocked();
        const w = watched();
        if (!byId[id].secret) w.add(id);
        api.save('watched', [...w]);
        const date = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
        api.save('stubs', [...R.prog.stubs(), { id, date }].slice(-5));
        return !before && unlocked();
      },
      menu(title, text) {
        const w = watched();
        return {
          title,
          text,
          options: FILMS.map((f) =>
            f.secret && !unlocked()
              ? { id: 'locked', label: 'A secret film', sub: `Opens after ${UNLOCK} films (${w.size} of ${UNLOCK})` }
              : { id: f.id, label: f.secret ? shortTitle(f) : f.title, sub: `${f.genre}${w.has(f.id) ? ', seen it' : ''}` },
          ),
        };
      },
    };

    // ---------------------------------------------------------------- shell
    add(at(box(L.W + 0.6, 0.4, D + 0.5, '#7a3a3a'), 0, -0.21, (ZF + ZB) / 2 + 0.05));
    add(at(box(L.W + 0.64, 0.12, 0.06, GOLD), 0, -0.14, ZF + 0.31));
    // Lobby floor: cream and rose tiles
    const tiles = canvasTexture(256, 256, (ctx, w, h) => {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#f6c9c0' : '#fff4e6';
        ctx.fillRect((i * w) / 2, (j * h) / 2, w / 2, h / 2);
      }
      ctx.fillStyle = 'rgba(244,194,79,0.8)';
      for (const [x, y] of [[0, 0], [w / 2, h / 2], [w, 0], [0, h], [w, h]]) {
        ctx.beginPath();
        ctx.moveTo(x, y - 14);
        ctx.lineTo(x + 14, y);
        ctx.lineTo(x, y + 14);
        ctx.lineTo(x - 14, y);
        ctx.fill();
      }
    });
    tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
    const [lx0, lx1] = L.LOBBY;
    const lf = new THREE.PlaneGeometry(lx1 - lx0, D);
    uvScale(lf, (lx1 - lx0) / 1.6, D / 1.6);
    add(at(mesh(lf, umat('#ffffff', { rough: 0.6, map: tiles }), { cast: false }), (lx0 + lx1) / 2, 0, (ZF + ZB) / 2)).rotation.x = -Math.PI / 2;
    // Screening room floor: deep red carpet with little gold dots
    const carpet = canvasTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#a8303e';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#c9a040';
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        ctx.beginPath();
        ctx.arc((i + 0.5 + (j % 2) * 0.5) * (w / 4), (j + 0.5) * (h / 4), 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    carpet.wrapS = carpet.wrapT = THREE.RepeatWrapping;
    R.carpet = umat('#ffffff', { rough: 0.95, map: carpet });
    const [hx0, hx1] = L.HALL;
    const hf = new THREE.PlaneGeometry(hx1 - hx0, D);
    uvScale(hf, (hx1 - hx0) / 1.2, D / 1.2);
    add(at(mesh(hf, R.carpet, { cast: false }), (hx0 + hx1) / 2, 0, (ZF + ZB) / 2)).rotation.x = -Math.PI / 2;

    // Back walls
    const lobbyPaper = wallpaper('#ffe1d6', '#ffd0c2', 0.3, '#c2404c');
    const lw = new THREE.BoxGeometry(lx1 - lx0, HL, 0.2);
    uvScale(lw, lx1 - lx0, 1);
    add(at(mesh(lw, umat('#ffffff', { rough: 0.9, map: lobbyPaper })), (lx0 + lx1) / 2, HL / 2, ZB - 0.1));
    const hallPaper = wallpaper('#4b2552', null, 0.25, '#8a2436', { stars: '#7a4a86' });
    const hw = new THREE.BoxGeometry(hx1 - hx0, HH, 0.2);
    uvScale(hw, (hx1 - hx0) / 1.4, 1);
    R.hallWall = umat('#ffffff', { rough: 0.9, map: hallPaper });
    add(at(mesh(hw, R.hallWall), (hx0 + hx1) / 2, HH / 2, ZB - 0.1));
    add(at(box(lx1 - lx0, 0.12, 0.08, GOLD), (lx0 + lx1) / 2, HL - 0.06, ZB + 0.04));
    add(at(box(hx1 - hx0, 0.12, 0.08, GOLD), (hx0 + hx1) / 2, HH - 0.06, ZB + 0.04));
    colliders.push({ type: 'box', x: 0, z: ZB - 0.1, hw: L.W / 2 + 0.2, hd: 0.12 });
    // Side walls: full height at the back, stepping down toward the front
    for (const [x, h, c] of [[-L.W / 2 - 0.1, HL, '#f2c3b8'], [L.W / 2 + 0.1, HH, '#6b2f5a']]) {
      add(at(box(0.2, h, 4.4, c), x, h / 2, ZB + 2.2));
      add(at(box(0.2, 1.3, D - 4.4, c), x, 0.65, ZB + 4.4 + (D - 4.4) / 2));
      add(at(box(0.24, 0.08, D - 4.4, GOLD), x, 1.32, ZB + 4.4 + (D - 4.4) / 2));
      colliders.push({ type: 'box', x, z: (ZB + ZF) / 2, hw: 0.12, hd: D / 2 + 0.2 });
    }
    // Front lip so nobody walks off the dollhouse
    add(at(rbox(L.W, 0.12, 0.16, WINE, 0.04), 0, 0.06, ZF - 0.05));
    colliders.push({ type: 'box', x: 0, z: ZF + 0.08, hw: L.W / 2, hd: 0.14 });
    // Divider between the lobby and the screening room, with a doorway and a low front part
    const [d0, d1] = L.DOOR;
    const dx = L.LOBBY[1];
    const divMat = '#f2c3b8';
    add(at(box(0.2, HL, d0 - ZB, divMat), dx, HL / 2, (ZB + d0) / 2));
    add(at(box(0.2, HL - 2.3, d1 - d0, divMat), dx, 2.3 + (HL - 2.3) / 2, (d0 + d1) / 2));
    add(at(box(0.26, 0.12, d1 - d0 + 0.2, GOLD), dx, 2.3, (d0 + d1) / 2));
    add(at(box(0.2, 1.3, 3.2 - d1, divMat), dx, 0.65, (d1 + 3.2) / 2));
    add(at(box(0.26, 0.08, 3.2 - d1, GOLD), dx, 1.32, (d1 + 3.2) / 2));
    colliders.push({ type: 'box', x: dx, z: (ZB + d0) / 2, hw: 0.12, hd: (d0 - ZB) / 2 });
    colliders.push({ type: 'box', x: dx, z: (d1 + 3.2) / 2, hw: 0.12, hd: (3.2 - d1) / 2 });

    buildLobby(R);
    buildHall(R);

    // Marquee bulbs (lobby wall and around the screen) chase in two colours
    const bulbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), R.bulbs.length);
    const m4 = new THREE.Matrix4();
    R.bulbs.forEach(([x, y, z], i) => bulbMesh.setMatrixAt(i, m4.makeTranslation(x, y, z)));
    const on = new THREE.Color('#fff2c2');
    const off = new THREE.Color('#c98a5e');
    for (let i = 0; i < R.bulbs.length; i++) bulbMesh.setColorAt(i, on);
    add(bulbMesh);
    let step = -1;
    updates.push((dt, t) => {
      const s = Math.floor(t * 4);
      if (s === step) return;
      step = s;
      for (let i = 0; i < R.bulbs.length; i++) bulbMesh.setColorAt(i, (i + s) % 3 ? on : off);
      bulbMesh.instanceColor.needsUpdate = true;
    });

    // Plain-coloured static parts become a few vertex-coloured meshes
    dynamic.push(...colorBake(g, dynamic));

    return {
      group: g,
      dynamic,
      colliders,
      hotspots,
      size: { w: L.W, d: 9.6 },
      spawn: { x: -12.2, z: 3.3, yaw: Math.PI },
      exit: { x: -12.2, z: 4.25 },
      background: '#f0cfc6',
      onEnter(a) {
        for (const fn of enters) fn(a);
      },
      onExit(a) {
        for (const fn of exits) fn(a);
      },
      update(dt, t, a) {
        for (const fn of updates) fn(dt, t, a);
      },
    };
  },
};
