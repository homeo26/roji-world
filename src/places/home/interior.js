import { THREE, mat, mesh, canvasTexture, box, rbox, cyl, sph, at, uvScale, texMat, makeSky, makeAtlas, colorBake } from './kit.js';
import { makeCat, catBrain } from './cat.js';
import { buildKitchen } from './kitchen.js';
import { buildLiving } from './living.js';
import { buildBedroom } from './bedroom.js';
import { buildBathroom } from './bathroom.js';
import { buildStudy } from './study.js';

// Inside the cottage, built like a dollhouse with no front wall:
// kitchen | living room | bedroom | bathroom | study, side by side along X.

export const L = {
  W: 32,
  D: 9.6,
  ZB: -4.6, // inner face of the back wall
  ZF: 4.8, // front edge of the floor
  H: 3.2, // wall height
  rooms: {
    kitchen: [-16, -9.6],
    living: [-9.6, -2.4],
    bedroom: [-2.4, 5.6],
    bathroom: [5.6, 10.2],
    study: [10.2, 16],
  },
  dividers: [-9.6, -2.4, 5.6, 10.2],
  door: [-1.4, 0.2], // doorway gap in the dividers (z)
};

// Wallpaper: one canvas per room covering 1 m of width and the full wall height,
// with the wainscot or tiles painted at the bottom.
function wallpaper(base, dot, wains, { tiles = null, band = '#ffffff', motif = 'dots' } = {}) {
  const t = canvasTexture(128, 410, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = dot;
    if (motif === 'stripes') for (let i = 0; i < 4; i++) ctx.fillRect(i * 32 + 8, 0, 12, h);
    else if (motif === 'stars') {
      for (let j = 0; j < 10; j++) {
        for (let i = 0; i < 2; i++) {
          const cx = (i + 0.5 + (j % 2) * 0.5) * 64;
          const cy = j * 30 + 14;
          ctx.beginPath();
          if ((i + j) % 2) {
            for (let k = 0; k < 10; k++) {
              const rr = k % 2 ? 3 : 7;
              const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
              ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
            }
          } else {
            ctx.moveTo(cx, cy + 5);
            ctx.bezierCurveTo(cx - 8, cy - 1, cx - 5, cy - 7, cx, cy - 3);
            ctx.bezierCurveTo(cx + 5, cy - 7, cx + 8, cy - 1, cx, cy + 5);
          }
          ctx.fill();
        }
      }
    } else {
      for (let j = 0; j < 12; j++) {
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.arc((i + 0.5 + (j % 2) * 0.5) * 64, j * 26 + 12, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    const wy = h * (1 - wains);
    if (tiles) {
      ctx.fillStyle = tiles[0];
      ctx.fillRect(0, wy, w, h - wy);
      ctx.fillStyle = tiles[1];
      const s = 21;
      for (let y = wy + 2; y < h; y += s) for (let x = ((y - wy) / s) % 2 ? s / 2 : 0; x < w; x += s) ctx.fillRect(x + 1.5, y + 1.5, s - 3, s - 3);
    } else {
      ctx.fillStyle = band;
      ctx.fillRect(0, wy, w, h - wy);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      for (let x = 0; x < w; x += 32) ctx.fillRect(x, wy, 3, h - wy);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, wy - 5, w, 7);
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function floorTex(kind) {
  const t = canvasTexture(256, 256, (ctx, w, h) => {
    if (kind === 'tiles') {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#bfe6d4' : '#fff8ec';
        ctx.fillRect((i * w) / 4, (j * h) / 4, w / 4, h / 4);
      }
      ctx.strokeStyle = 'rgba(120,150,140,0.35)';
      ctx.lineWidth = 2;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo((i * w) / 4, 0);
        ctx.lineTo((i * w) / 4, h);
        ctx.moveTo(0, (i * h) / 4);
        ctx.lineTo(w, (i * h) / 4);
        ctx.stroke();
      }
    } else if (kind === 'wood' || kind === 'lightwood') {
      const [a, b] = kind === 'wood' ? ['#e2b685', '#d8a873'] : ['#f0d2ac', '#e7c497'];
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? a : b;
        ctx.fillRect(0, (i * h) / 8, w, h / 8);
        ctx.fillStyle = 'rgba(140,90,50,0.22)';
        ctx.fillRect(0, (i * h) / 8, w, 2);
        ctx.fillRect(((i * 97) % w), (i * h) / 8, 3, h / 8);
        ctx.fillRect(((i * 97 + 128) % w), (i * h) / 8, 3, h / 8);
      }
    } else if (kind === 'carpet') {
      ctx.fillStyle = '#f3e6fb';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e6d2f5';
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
        ctx.beginPath();
        ctx.arc((i + 0.5 + (j % 2) * 0.5) * (w / 8), (j + 0.5) * (h / 8), 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === 'hex') {
      ctx.fillStyle = '#d5eef3';
      ctx.fillRect(0, 0, w, h);
      const r = 16;
      for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) {
        const cx = i * r * 1.732 + (j % 2) * r * 0.866;
        const cy = j * r * 1.5;
        ctx.fillStyle = (i * 7 + j * 3) % 5 === 0 ? '#9fd6e3' : '#ffffff';
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
          ctx.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
        }
        ctx.fill();
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function buildInterior(ictx) {
  const { api } = ictx;
  const g = new THREE.Group();
  const dynamic = [];
  const colliders = [];
  const hotspots = [];
  const updates = [];
  const enters = [];
  const exits = [];
  const state = { act: null, carrying: null, eating: false, night: 0 };
  const sky = makeSky();
  const add = (...o) => (g.add(...o), o[0]);
  const { ZB, ZF, H } = L;

  // ---------------------------------------------------------------- shell
  add(at(box(L.W + 0.6, 0.4, ZF - ZB + 0.5, '#d9b38c'), 0, -0.25, (ZF + ZB) / 2 + 0.05));
  add(at(box(L.W + 0.64, 0.12, 0.06, '#ef5b6f'), 0, -0.2, ZF + 0.31));
  const floors = { kitchen: ['tiles', 1.2], living: ['wood', 2.2], bedroom: ['carpet', 1.6], bathroom: ['hex', 1.4], study: ['lightwood', 2.2] };
  const papers = {
    kitchen: wallpaper('#dff4e8', '#c3e7d4', 0.5, { tiles: ['#e8f6f1', '#ffffff'] }),
    living: wallpaper('#ffe9dc', '#ffd8c4', 0.27, { band: '#f4c9b0', motif: 'stripes' }),
    bedroom: wallpaper('#efe4ff', '#dccbff', 0.27, { band: '#d8c4f3', motif: 'stars' }),
    bathroom: wallpaper('#e3f4fb', '#cbeaf6', 0.42, { tiles: ['#bfe3ee', '#f4fcff'] }),
    study: wallpaper('#fff4d6', '#ffe6a6', 0.27, { band: '#bfe0c9' }),
  };
  for (const [room, [x0, x1]] of Object.entries(L.rooms)) {
    const [kind, tile] = floors[room];
    const fg = new THREE.PlaneGeometry(x1 - x0, ZF - ZB);
    uvScale(fg, (x1 - x0) / tile, (ZF - ZB) / tile);
    const f = add(at(mesh(fg, texMat(floorTex(kind), { rough: 0.85 }), { cast: false }), (x0 + x1) / 2, 0, (ZF + ZB) / 2));
    f.rotation.x = -Math.PI / 2;
    const wg = new THREE.BoxGeometry(x1 - x0, H, 0.2);
    uvScale(wg, x1 - x0, 1);
    add(at(mesh(wg, texMat(papers[room], { rough: 0.9 })), (x0 + x1) / 2, H / 2, ZB - 0.1));
    add(at(box(x1 - x0, 0.14, 0.05, '#ffffff'), (x0 + x1) / 2, 0.07, ZB + 0.025));
    add(at(box(x1 - x0, 0.1, 0.08, '#ffffff'), (x0 + x1) / 2, H - 0.05, ZB + 0.04));
  }
  // Side walls: full height at the back, stepping down toward the front
  const sideMat = mat('#f6ead7', { rough: 0.9 });
  for (const s of [-1, 1]) {
    const x = s * (L.W / 2 + 0.1);
    add(at(box(0.2, H, 4.8, sideMat), x, H / 2, ZB + 2.4));
    add(at(box(0.2, 1.2, ZF - ZB - 4.8, sideMat), x, 0.6, ZB + 4.8 + (ZF - ZB - 4.8) / 2));
    add(at(box(0.24, 0.08, ZF - ZB - 4.8, '#ffffff'), x, 1.22, ZB + 4.8 + (ZF - ZB - 4.8) / 2));
    colliders.push({ type: 'box', x, z: (ZB + ZF) / 2, hw: 0.12, hd: (ZF - ZB) / 2 + 0.2 });
  }
  colliders.push({ type: 'box', x: 0, z: ZB - 0.1, hw: L.W / 2 + 0.2, hd: 0.12 });
  // Front lip so nobody walks off the dollhouse
  add(at(rbox(L.W, 0.12, 0.16, '#e9c9a3', 0.04), 0, 0.06, ZF - 0.05));
  colliders.push({ type: 'box', x: 0, z: ZF + 0.08, hw: L.W / 2, hd: 0.14 });
  // Dividers with a doorway, a cut-away stub at the front with a little plant on top
  const [g0, g1] = L.door;
  for (const x of L.dividers) {
    add(at(box(0.18, H - 0.3, g0 - ZB, sideMat), x, (H - 0.3) / 2, (ZB + g0) / 2));
    add(at(box(0.24, 0.08, g0 - ZB, '#ffffff'), x, H - 0.3, (ZB + g0) / 2));
    add(at(box(0.18, 1.1, 1.0, sideMat), x, 0.55, g1 + 0.5));
    add(at(box(0.24, 0.08, 1.06, '#ffffff'), x, 1.12, g1 + 0.5));
    add(at(cyl(0.11, 0.08, 0.16, '#e07a55', 10), x, 1.24, g1 + 0.85));
    for (let k = 0; k < 3; k++) {
      const leaf = add(at(sph(0.09, '#5aa84f', { rough: 0.8 }, 8), x + (k - 1) * 0.05, 1.38 + (k % 2) * 0.05, g1 + 0.85));
      leaf.scale.set(0.7, 1.3, 0.7);
    }
    // Door frame around the doorway
    add(at(box(0.26, 0.12, g1 - g0 + 0.2, '#ffffff'), x, 2.2, (g0 + g1) / 2));
    add(at(box(0.18, 0.7, g1 - g0, sideMat), x, 2.55, (g0 + g1) / 2));
    colliders.push({ type: 'box', x, z: (ZB + g0) / 2, hw: 0.11, hd: (g0 - ZB) / 2 });
    colliders.push({ type: 'box', x, z: g1 + 0.5, hw: 0.11, hd: 0.5 });
  }

  // Windows on the back wall share one sky (day or night)
  const windowAt = (x, y, w, h, curtain) => {
    add(at(rbox(w + 0.18, h + 0.18, 0.08, '#ffffff', 0.04), x, y, ZB + 0.04));
    add(at(mesh(new THREE.PlaneGeometry(w, h), sky.material, { cast: false }), x, y, ZB + 0.085));
    add(at(box(0.05, h, 0.04, '#ffffff'), x, y, ZB + 0.1));
    add(at(box(w, 0.05, 0.04, '#ffffff'), x, y, ZB + 0.1));
    add(at(box(w + 0.3, 0.06, 0.16, '#ffffff'), x, y - h / 2 - 0.1, ZB + 0.1));
    if (curtain) {
      add(at(cyl(0.02, 0.02, w + 0.8, '#c9a27a', 6), x, y + h / 2 + 0.22, ZB + 0.18)).rotation.z = Math.PI / 2;
      for (const s of [-1, 1]) {
        const c = add(at(rbox(0.3, h + 0.45, 0.07, curtain, 0.035), x + s * (w / 2 + 0.17), y - 0.02, ZB + 0.2));
        c.scale.x = 1;
        add(at(box(0.34, 0.05, 0.09, '#ffffff'), x + s * (w / 2 + 0.17), y - h * 0.2, ZB + 0.22));
      }
    }
  };

  // Warm light for night activities (bed, movie, story). Off by default.
  const light = new THREE.PointLight('#ffc98a', 0, 7, 1.6);
  light.position.set(0, 2, 0);
  add(light);

  const R = {
    atlas: makeAtlas(1024, 1024),
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
  };

  buildKitchen(R);
  buildLiving(R);
  buildBedroom(R);
  buildBathroom(R);
  buildStudy(R);

  // ---------------------------------------------------------------- Mishmish
  const cat = makeCat();
  add(cat.root);
  dynamic.push(cat.root);
  const P = Math.PI;
  const spots = [
    { id: 'catbed', x: -8.55, z: 0.75, y: 0.09, nap: true, yaw: 0.6 },
    { id: 'sofa', x: -6.0, z: 0.86, y: 0.52, nap: true, hop: { x: -6.0, z: 2.05 }, over: 0.6, yaw: P - 0.4 },
    { id: 'bowl', x: -9.9, z: -2.85, sit: true, yaw: P },
    { id: 'kitchen', x: -11.4, z: 2.6, sit: true, yaw: 0.3 },
    { id: 'rug', x: 2.9, z: -0.3, nap: true, yaw: -0.6 },
    { id: 'bedfoot', x: 1.4, z: -2.3, y: 0.7, nap: true, hop: { x: 1.4, z: -1.4 }, yaw: 1.3 },
    { id: 'mat', x: 7.3, z: -2.75, sit: true, yaw: 2.6 },
    { id: 'study', x: 13.1, z: -3.3, sit: true, yaw: 0.2 },
  ];
  const brain = catBrain(cat, spots, { api });
  R.cat = brain;
  R.catSpot = (id) => spots.find((s) => s.id === id);
  hotspots.push(
    {
      track: () => ({ x: brain.pos.x, z: brain.pos.z }),
      r: 1.3,
      label: 'Pet Mishmish',
      icon: 'paw',
      when: () => !brain.busy,
      act: (a) => {
        brain.pet();
        a.fx.heartsAt(a.world(brain.pos.x, brain.pos.z, brain.pos.y + 0.7), 4);
        a.toast(['Mishmish purrs happily.', 'Mishmish rubs her head on your hand.', 'Purrrr... Mishmish loves you.'][Math.floor(Math.random() * 3)], 2000);
      },
    },
  );
  updates.push((dt, t) => {
    const p = api.localPos(api.player);
    brain.update(dt, t, p);
  });

  // Plain-coloured static furniture becomes a few vertex-coloured meshes
  dynamic.push(...colorBake(g, dynamic));

  return {
    group: g,
    dynamic,
    colliders,
    hotspots,
    size: { w: L.W, d: L.D },
    spawn: { x: -4.6, z: 3.2, yaw: Math.PI },
    exit: { x: -6.0, z: 4.15 },
    background: '#f6dccb',
    onEnter(a) {
      sky.draw(false);
      for (const fn of enters) fn(a);
    },
    onExit(a) {
      light.intensity = 0;
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
      for (const fn of updates) fn(dt, t, a);
    },
  };
}
