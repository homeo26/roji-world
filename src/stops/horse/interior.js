import { THREE, P, COL, kit, umat, mesh, makeAtlas, colorBake, canvasTexture, roundRect, uvScale, boardsTexture, strawTexture, glowSprite, makeLantern } from './kit.js';
import { buildBackRow, buildFrontRow, buildAisle } from './rooms.js';
import { buildActs } from './acts.js';

// Inside Roji's Riding Stable, a dollhouse with no front wall, laid out like a real barn:
//   back row:  feed room | Biscuit's stall | Rosie's stall | Clover's stall | the hall to the riding ring
//   the long aisle with lanterns
//   front row: office | entrance | tack room | grooming corner (Rosie on the cross ties)
// The office and tack room walls sink while you are behind them (cutaway).

export const L = {
  W: 24,
  X0: -12,
  X1: 12,
  ZB: -6.8, // inner face of the back wall
  ZS: -2.4, // stall fronts
  ZW: 1.6, // front-row walls
  ZF: 6.8, // front edge of the floor
  H: 4.0, // back wall
  HW: 2.6, // front-row walls
  FEED: [-12, -7.2],
  STALLS: [
    { id: 'biscuit', x0: -7.2, x1: -3.6 },
    { id: 'rosie', x0: -3.6, x1: 0 },
    { id: 'clover', x0: 0, x1: 3.6 },
  ],
  HALL: [3.6, 12],
  OFFICE: [-12, -6.6],
  ENTRY: [-6.6, -2.2],
  TACK: [-2.2, 3.8],
  GROOM: [3.8, 12],
  OFFICE_DOOR: [-8.3, -6.9],
  GAP: [3.6, 5.0], // gaps in the low dividers between front rooms (z)
  ROSIE: { x: 8.0, z: 4.1 },
};

function bricks() {
  const t = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#e9c7a4';
    c.fillRect(0, 0, w, h);
    const bw = w / 4;
    const bh = h / 8;
    for (let j = 0; j < 8; j++) {
      for (let i = -1; i < 5; i++) {
        const x = i * bw + (j % 2) * (bw / 2);
        const shade = ['#d99a74', '#cf8f6a', '#dfa47d', '#d4946f'][(i + j * 3 + 8) % 4];
        c.fillStyle = shade;
        roundRect(c, x + 3, j * bh + 3, bw - 6, bh - 6, 5);
        c.fill();
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function planks(base = '#e8c497', alt = '#dfb586') {
  const t = canvasTexture(256, 256, (c, w, h) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? base : alt;
      c.fillRect(0, (i * h) / 8, w, h / 8);
      c.fillStyle = 'rgba(140,90,50,0.22)';
      c.fillRect(0, (i * h) / 8, w, 2);
      c.fillRect((i * 97) % w, (i * h) / 8, 3, h / 8);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function rubber() {
  const t = canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = '#5d6f7a';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#687c88';
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      roundRect(c, i * 64 + 3, j * 64 + 3, 58, 58, 8);
      c.fill();
    }
    c.fillStyle = 'rgba(0,0,0,0.16)';
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      c.beginPath();
      c.arc(i * 16 + 8, j * 16 + 8, 2.2, 0, P * 2);
      c.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function flags() {
  const t = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#e8e0d2';
    c.fillRect(0, 0, w, h);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      c.fillStyle = (i + j) % 2 ? '#d8cfc0' : '#e2dacd';
      roundRect(c, i * 64 + (j % 2) * 20 + 4, j * 64 + 4, 56, 56, 10);
      c.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// Office wallpaper: mint with little horseshoes over a wooden wainscot
function wallpaper() {
  const t = canvasTexture(128, 330, (c, w, h) => {
    c.fillStyle = '#e4f3ea';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#b9dcc8';
    c.lineWidth = 4;
    for (let j = 0; j < 6; j++) for (let i = 0; i < 2; i++) {
      c.beginPath();
      c.arc((i + 0.5 + (j % 2) * 0.5) * 64, j * 34 + 18, 8, P * 0.15, P * 0.85, true);
      c.stroke();
    }
    const wy = h * 0.62;
    c.fillStyle = '#c99a6b';
    c.fillRect(0, wy, w, h - wy);
    c.fillStyle = 'rgba(0,0,0,0.08)';
    for (let x = 0; x < w; x += 32) c.fillRect(x, wy, 3, h - wy);
    c.fillStyle = '#fff6ea';
    c.fillRect(0, wy - 6, w, 8);
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
// The view through a window: day sky over the meadow, or a starry night
export function skyTexture(night) {
  return canvasTexture(256, 220, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, night ? '#1f2a52' : '#8fd3ff');
    gr.addColorStop(1, night ? '#4a4f86' : '#dff4ff');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    if (night) {
      c.fillStyle = '#fff6d0';
      for (let i = 0; i < 26; i++) {
        c.beginPath();
        c.arc((i * 89) % w, (i * 37) % (h * 0.6), 1.2 + (i % 3) * 0.6, 0, P * 2);
        c.fill();
      }
      c.beginPath();
      c.arc(w * 0.75, h * 0.25, 18, 0, P * 2);
      c.fill();
      c.fillStyle = '#2a3566';
      c.beginPath();
      c.arc(w * 0.75 + 8, h * 0.25 - 5, 15, 0, P * 2);
      c.fill();
    } else {
      c.fillStyle = '#ffffff';
      for (const [x, y, r] of [[60, 50, 18], [82, 44, 22], [104, 52, 16], [190, 80, 14], [206, 74, 18]]) {
        c.beginPath();
        c.arc(x, y, r, 0, P * 2);
        c.fill();
      }
    }
    c.fillStyle = night ? '#2f5a46' : '#8fd46a';
    c.beginPath();
    c.moveTo(0, h * 0.72);
    c.quadraticCurveTo(w * 0.3, h * 0.6, w * 0.6, h * 0.7);
    c.quadraticCurveTo(w * 0.85, h * 0.76, w, h * 0.66);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.fill();
    c.fillStyle = night ? '#24493a' : '#6cc24a';
    c.fillRect(0, h * 0.84, w, h * 0.16);
  });
}

export default {
  title: "Roji's Riding Stable",
  build(ctx) {
    const { api } = ctx;
    const k = kit();
    const { box, rbox, at } = k;
    const g = new THREE.Group();
    const dynamic = [];
    const colliders = [];
    const hotspots = [];
    const updates = [];
    const enters = [];
    const exits = [];
    const cutaway = [];
    const add = (o) => (g.add(o), o);
    const R = {
      k,
      L,
      g,
      api,
      ctx,
      add,
      atlas: makeAtlas(2048, 2048),
      dyn: (o) => (dynamic.push(o), o),
      col: (x, z, hw, hd, h) => colliders.push(h === undefined ? { type: 'box', x, z, hw, hd } : { type: 'box', x, z, hw, hd, h }),
      circle: (x, z, r, h) => colliders.push(h === undefined ? { type: 'circle', x, z, r } : { type: 'circle', x, z, r, h }),
      hot: (...h) => hotspots.push(...h),
      upd: (fn) => updates.push(fn),
      onEnter: (fn) => enters.push(fn),
      onExit: (fn) => exits.push(fn),
      cut: (object, x, z, hw) => cutaway.push({ object, x, z, hw }),
      glowM: umat('#fff0c2', { emissive: '#ffb347', ei: 0.9, rough: 0.4 }),
      halos: [],
      bake: [],
      windows: [],
      ponies: {},
      state: {},
    };
    const { ZB, ZS, ZW, ZF, H, X0, X1, W } = L;
    const D = ZF - ZB;

    // ---------------------------------------------------------------- floors
    add(at(box(W + 0.6, 0.4, D + 0.5, '#7a5236'), 0, -0.21, (ZF + ZB) / 2 + 0.05));
    add(at(box(W + 0.64, 0.12, 0.06, COL.gold), 0, -0.15, ZF + 0.31));
    const floor = (x0, x1, z0, z1, tex, tile, y = 0, o = {}) => {
      const fg = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
      uvScale(fg, (x1 - x0) / tile, (z1 - z0) / tile);
      const m = o.material || new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
      const f = add(at(mesh(fg, m, { cast: false }), (x0 + x1) / 2, y, (z0 + z1) / 2));
      f.rotation.x = -P / 2;
      return f;
    };
    const brickM = new THREE.MeshStandardMaterial({ map: bricks(), roughness: 0.9 });
    floor(X0, X1, ZS, ZW, null, 2.0, 0, { material: brickM });
    floor(...L.ENTRY, ZW, ZF, null, 2.0, 0, { material: brickM });
    floor(...L.HALL, ZB, ZS, null, 2.0, 0, { material: brickM });
    floor(...L.GROOM, ZW, ZF, rubber(), 1.1);
    const plankM = new THREE.MeshStandardMaterial({ map: planks(), roughness: 0.85 });
    floor(...L.OFFICE, ZW, ZF, null, 1.6, 0, { material: plankM });
    floor(...L.TACK, ZW, ZF, null, 1.6, 0, { material: plankM });
    floor(...L.FEED, ZB, ZS, flags(), 1.6);
    const strawM = new THREE.MeshStandardMaterial({ map: strawTexture(), roughness: 1 });
    floor(L.STALLS[0].x0, L.STALLS[0].x1, ZB, ZS, null, 1.4, 0.004, { material: strawM });
    floor(L.STALLS[2].x0, L.STALLS[2].x1, ZB, ZS, null, 1.4, 0.004, { material: strawM });
    // Rosie's stall has its own straw, which gets fresher when it is mucked out
    R.rosieStraw = new THREE.MeshStandardMaterial({ map: strawTexture('#e3c47a', false), roughness: 1, color: '#d9c39a' });
    R.dyn(floor(L.STALLS[1].x0, L.STALLS[1].x1, ZB, ZS, null, 1.4, 0.004, { material: R.rosieStraw }));

    // ---------------------------------------------------------------- walls
    const woodWall = new THREE.MeshStandardMaterial({ map: boardsTexture(COL.plank, '#c99466'), roughness: 0.9 });
    const bw = new THREE.BoxGeometry(W, H, 0.2);
    uvScale(bw, W, H);
    add(at(mesh(bw, woodWall), 0, H / 2, ZB - 0.1));
    add(at(box(W + 0.2, 0.2, 0.16, COL.woodDark), 0, H - 0.1, ZB + 0.02));
    add(at(box(W + 0.2, 0.14, 0.12, COL.woodDark), 0, 0.07, ZB + 0.04));
    for (const x of [-7.2, -3.6, 0, 3.6]) add(at(box(0.2, H, 0.12, COL.woodDark), x, H / 2, ZB + 0.06));
    colliders.push({ type: 'box', x: 0, z: ZB - 0.1, hw: W / 2 + 0.2, hd: 0.12 });
    // Side walls: tall at the back, lower along the aisle, low by the front rooms
    for (const x of [X0 - 0.1, X1 + 0.1]) {
      const seg = (z0, z1, h) => {
        const gg = new THREE.BoxGeometry(0.2, h, z1 - z0);
        uvScale(gg, z1 - z0, h);
        add(at(mesh(gg, woodWall), x, h / 2, (z0 + z1) / 2));
        add(at(box(0.26, 0.08, z1 - z0, COL.woodDark), x, h, (z0 + z1) / 2));
      };
      seg(ZB, ZS, H);
      seg(ZS, ZW, 2.8);
      seg(ZW, ZF, 1.3);
      colliders.push({ type: 'box', x, z: (ZB + ZF) / 2, hw: 0.12, hd: D / 2 + 0.2 });
    }
    // Front lip, so nobody walks off the dollhouse
    add(at(rbox(W, 0.12, 0.16, COL.woodDark, 0.04), 0, 0.06, ZF - 0.05));
    colliders.push({ type: 'box', x: 0, z: ZF + 0.08, hw: W / 2, hd: 0.14 });

    // Cutaway wall: a Group at floor level holding the wall boxes (with a doorway gap) and what hangs on it
    R.wall = (x0, x1, h, material, gaps = []) => {
      const cx = (x0 + x1) / 2;
      const grp = new THREE.Group();
      grp.position.set(cx, 0, ZW);
      let x = x0;
      const parts = [];
      for (const [a, b] of [...gaps, [x1, x1]]) {
        if (a > x) parts.push([x, a]);
        x = b;
      }
      for (const [a, b] of parts) {
        const gg = new THREE.BoxGeometry(b - a, h, 0.16);
        uvScale(gg, (b - a) / 1.2, 1);
        grp.add(at(mesh(gg, material), (a + b) / 2 - cx, h / 2, 0));
        grp.add(at(box(b - a + 0.02, 0.08, 0.2, COL.woodDark), (a + b) / 2 - cx, h - 0.04, 0));
        colliders.push({ type: 'box', x: (a + b) / 2, z: ZW, hw: (b - a) / 2, hd: 0.1 });
      }
      for (const [a, b] of gaps) {
        grp.add(at(box(b - a, h - 2.15, 0.16, COL.woodDark), (a + b) / 2 - cx, 2.15 + (h - 2.15) / 2, 0));
        for (const e of [a, b]) grp.add(at(box(0.1, 2.15, 0.2, COL.woodDark), e - cx, 1.075, 0));
      }
      add(grp);
      R.cut(grp, cx, ZW, (x1 - x0) / 2);
      return grp;
    };
    R.paper = new THREE.MeshStandardMaterial({ map: wallpaper(), roughness: 0.9 });
    R.woodWall = woodWall;
    // Low dividers between the front rooms, each with a gap to walk through
    R.lowWall = (x, z0, z1, gap) => {
      for (const [a, b] of [[z0, gap[0]], [gap[1], z1]]) {
        add(at(box(0.14, 1.05, b - a, COL.wood), x, 0.525, (a + b) / 2));
        add(at(box(0.2, 0.07, b - a + 0.04, COL.woodDark), x, 1.08, (a + b) / 2));
        colliders.push({ type: 'box', x, z: (a + b) / 2, hw: 0.08, hd: (b - a) / 2 });
      }
      for (const e of gap) add(at(box(0.16, 1.2, 0.16, COL.woodDark), x, 0.6, e));
    };

    // Windows in the back wall, with a view that follows the time of day
    R.skyDay = skyTexture(false);
    R.skyNight = skyTexture(true);
    R.skyM = new THREE.MeshStandardMaterial({ map: R.skyDay, roughness: 0.6, emissive: '#ffffff', emissiveMap: R.skyDay, emissiveIntensity: 0.35 });
    R.window = (x, y, w = 0.9, h = 0.75, z = ZB + 0.01) => {
      add(at(mesh(new THREE.PlaneGeometry(w, h), R.skyM, { cast: false }), x, y, z));
      for (const [dx, dy, ww, hh] of [[0, h / 2 + 0.04, w + 0.16, 0.08], [0, -h / 2 - 0.04, w + 0.2, 0.08], [-w / 2 - 0.04, 0, 0.08, h + 0.12], [w / 2 + 0.04, 0, 0.08, h + 0.12], [0, 0, 0.04, h], [0, 0, w, 0.04]]) add(at(box(ww, hh, 0.06, COL.trim), x + dx, y + dy, z + 0.03));
      add(at(box(w + 0.3, 0.06, 0.18, COL.trim), x, y - h / 2 - 0.08, z + 0.09));
    };
    R.lantern = (x, y, z, bracket = 'back') => {
      if (bracket === 'back') add(at(box(0.05, 0.05, 0.24, '#3b2b3f'), x, y + 0.3, z + 0.12));
      const ln = add(makeLantern(k, R.glowM));
      ln.position.set(x, y, z + (bracket === 'back' ? 0.22 : 0));
      const s = glowSprite('#ffc46b', 1.2);
      s.position.set(x, y + 0.12, z + (bracket === 'back' ? 0.24 : 0));
      R.halos.push(add(R.dyn(s)));
    };

    buildBackRow(R);
    buildAisle(R);
    buildFrontRow(R);
    buildActs(R);

    // Plain-coloured static parts become a few vertex-coloured meshes (the cutaway walls and the props that
    // move or hide each on their own)
    for (const o of R.bake) if (Array.isArray(o)) colorBake(o[0], o[1]);
    else colorBake(o);
    for (const c of cutaway) dynamic.push(...colorBake(c.object, dynamic));
    dynamic.push(...colorBake(g, [...dynamic, ...cutaway.map((c) => c.object)]));

    const night = () => document.body.classList.contains('night-time');
    return {
      group: g,
      dynamic,
      colliders,
      hotspots,
      cutaway,
      size: { w: W, d: D + 0.4 },
      spawn: { x: -4.4, z: 5.2, yaw: P },
      exit: { x: -4.4, z: 6.3 },
      background: '#f3d9bd',
      onEnter(a) {
        const n = night();
        R.skyM.map = R.skyM.emissiveMap = n ? R.skyNight : R.skyDay;
        R.skyM.emissiveIntensity = n ? 0.7 : 0.35;
        R.skyM.needsUpdate = true;
        R.glowM.emissiveIntensity = n ? 2.2 : 0.9;
        R.night = n;
        // Through the big doors: the meadow by day, a blue moonlit meadow at night, and no sunbeam
        const mv = R.state.meadow.material;
        mv.color.set(n ? '#5a6aa6' : '#ffffff');
        mv.emissiveIntensity = n ? 0.1 : 0.45;
        R.state.beam.visible = !n;
        for (const fn of enters) fn(a);
      },
      onExit(a) {
        for (const fn of exits) fn(a);
      },
      update(dt, t, a) {
        for (const h of R.halos) h.material.opacity = R.night ? 0.7 : 0.18;
        for (const fn of updates) fn(dt, t, a);
      },
    };
  },
};
