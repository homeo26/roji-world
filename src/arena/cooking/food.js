import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Builder, instantiate, G, finishMat } from '../../props/food.js';
import { parseKey } from './levels.js';

// Food for Roji's YumYum Kitchen: 3D models built once from primitives (one or two draw calls each,
// sharing the props palette) and the 2D drawings used in order bubbles and on the cards.

const TAU = Math.PI * 2;
const PI = Math.PI;

export const F = {
  bread: '#f2d6a2',
  breadSpot: '#d9a860',
  meat: '#b8743a',
  meatDark: '#8f4f26',
  meatLight: '#d9944f',
  toum: '#fffbf0',
  pickle: '#8bc34a',
  pickleDark: '#5f8f2a',
  bun: '#e9a548',
  bunLight: '#f6cd8c',
  seed: '#fff4d6',
  patty: '#7a3f22',
  raw: '#f19aa0',
  burnt: '#3b2a22',
  cheese: '#ffcd3c',
  lettuce: '#7cc95a',
  tomato: '#ef5b4f',
  fries: '#ffcf4a',
  coffee: '#8d5532',
  milk: '#fffaf0',
  condensed: '#f3d9a0',
  lemonade: '#eef2a0',
  mint: '#4caf50',
  lemon: '#ffe066',
  rice: '#f4d77e',
  lamb: '#9c6440',
  lambDark: '#7d4d30',
  jameed: '#fff1d2',
  pine: '#f2dcb4',
  sponge: '#efbd78',
  caramel: '#d4893a',
  pecan: '#8b4a2b',
  pecanDark: '#6e3820',
  choc: '#6b3a26',
  chocDark: '#43231a',
  coconut: '#e2c08a',
  cream: '#fff6e6',
  ink: '#cf4569',
  paper: '#fffbee',
  blush: '#f6dcd6',
  gold: '#d9a441',
};

// All opaque finishes share the palette texture: merge them into one mesh, one draw call per model.
function oneMesh(tpl) {
  const opaque = tpl.meshes.filter((m) => !m.material.transparent && m.material.map === finishMat('soft').map);
  if (opaque.length > 1) {
    const geo = mergeGeometries(opaque.map((m) => m.geo), false);
    if (geo) {
      geo.computeBoundingSphere();
      tpl.meshes = [{ geo, material: finishMat('soft'), cast: true }, ...tpl.meshes.filter((m) => !opaque.includes(m))];
    }
  }
  for (const s of tpl.subs) oneMesh(s.tpl);
  return tpl;
}
const tpls = new Map();
function model(key, build, { shadow = false } = {}) {
  if (!tpls.has(key)) {
    const b = new Builder();
    build(b);
    tpls.set(key, oneMesh(b.bake()));
  }
  const o = instantiate(tpls.get(key), key);
  o.traverse((m) => {
    if (m.isMesh) m.castShadow = shadow;
  });
  return o;
}

// A pie slice of a cylinder as a closed solid, lying in XZ with its base at y = 0.
function sector(r, h, a0, len, seg = 6) {
  return G.custom(`sector${r},${h},${a0.toFixed(3)},${len.toFixed(3)},${seg}`, () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
    s.absarc(0, 0, r, a0, a0 + len, false);
    s.lineTo(0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: seg });
    g.rotateX(-PI / 2);
    return g;
  });
}

// ---------------------------------------------------------------- shawarma
const strips = (b, n, r, y, seed = 1) => {
  let k = seed * 9301;
  const rnd = () => ((k = (k * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU;
    const d = Math.sqrt(rnd()) * r;
    const c = [F.meat, F.meatLight, F.meatDark][i % 3];
    b.rbox(0.085, 0.022, 0.034, 0.008, c, { x: Math.cos(a) * d, y: y + rnd() * 0.012, z: Math.sin(a) * d * 0.8, ry: rnd() * PI, rz: (rnd() - 0.5) * 0.3 }, 'soft');
  }
};
// An open wrap on its board: bread, meat, toum and pickles as they are added. Base at y = 0.
export function openWrap(s) {
  const key = `wrapOpen${+!!s.bread}${+!!s.meat}${+!!s.toum}${+!!s.pickles}`;
  return model(key, (b) => {
    if (!s.bread) return;
    b.cyl(0.2, 0.2, 0.014, F.bread, { y: 0.007, s: [1, 1, 0.78] }, 'soft', 24);
    for (const [x, z] of [[-0.11, 0.05], [0.08, -0.07], [0.13, 0.06], [-0.04, -0.1], [-0.15, -0.03], [0.02, 0.1]]) b.sph(1, F.breadSpot, { x, y: 0.014, z, s: [0.018, 0.003, 0.014] }, 'soft', 8);
    if (s.meat) strips(b, 14, 0.13, 0.02, 3);
    if (s.toum) for (const [x, z] of [[-0.07, 0.02], [0.03, -0.04], [0.08, 0.05], [-0.02, 0.07]]) b.sph(1, F.toum, { x, y: 0.045, z, s: [0.034, 0.018, 0.028] }, 'gloss', 12);
    if (s.pickles)
      for (const [x, z] of [[-0.1, -0.04], [0.05, 0.02], [0.11, -0.03], [-0.03, -0.06], [0.0, 0.06]]) {
        b.cyl(0.026, 0.026, 0.01, F.pickleDark, { x, y: 0.052, z, rx: 0.15 }, 'gloss', 12);
        b.cyl(0.019, 0.019, 0.011, F.pickle, { x, y: 0.053, z, rx: 0.15 }, 'gloss', 10);
      }
  });
}
// A rolled wrap in a paper sleeve, lying on its side. Extras peek out of the open end.
export function rolledWrap(extras = []) {
  const key = 'wrapRoll' + extras.join('+');
  return model(key, (b) => {
    b.at({ y: 0.065, rz: PI / 2 }, () => {
      b.cyl(0.062, 0.062, 0.3, F.bread, {}, 'soft', 18);
      b.cyl(0.066, 0.066, 0.17, F.paper, { y: -0.07 }, 'matte', 18);
      b.cyl(0.067, 0.067, 0.03, F.ink, { y: -0.02 }, 'matte', 18);
      b.cyl(0.05, 0.05, 0.01, F.meat, { y: 0.15 }, 'soft', 14);
      strips(b, 5, 0.035, 0.145, 7);
      if (extras.includes('toum')) b.sph(1, F.toum, { x: 0.02, y: 0.158, z: 0.02, s: [0.022, 0.014, 0.022] }, 'gloss', 10);
      if (extras.includes('pickles')) b.cyl(0.02, 0.02, 0.012, F.pickle, { x: -0.02, y: 0.16, z: -0.015 }, 'gloss', 10);
    });
    // A little heart sticker on the sleeve
    b.heart(0.05, F.ink, { x: -0.07, y: 0.07, z: 0.068, rx: 0 }, 'gloss', 0.15, 0.04);
  });
}
// The meat cone on the spit: base at y = 0, about 0.62 m tall.
export function spitMeat() {
  return model(
    'spitMeat3',
    (b) => {
      const prof = [[0, 0], [0.11, 0], [0.15, 0.06], [0.19, 0.22], [0.225, 0.46], [0.235, 0.62], [0.2, 0.7], [0.1, 0.74], [0, 0.74]];
      b.lathe('spitcone3', prof, F.meat, null, 'soft', 22);
      const rAt = (y) => {
        for (let i = 1; i < prof.length; i++) if (prof[i][1] >= y) {
          const [r0, y0] = prof[i - 1];
          const [r1, y1] = prof[i];
          return r0 + ((r1 - r0) * (y - y0)) / Math.max(1e-6, y1 - y0);
        }
        return 0.1;
      };
      // Roasted flakes in a loose spiral, darker towards the heater
      for (let i = 0; i < 40; i++) {
        const y = 0.06 + (i / 40) * 0.6;
        const a = i * 2.2;
        const r = rAt(y) + 0.003;
        const c = [F.meatDark, '#6b3519', F.meatLight, F.meatDark][i % 4];
        b.rbox(0.07, 0.045, 0.02, 0.008, c, { x: Math.sin(a) * r, y, z: Math.cos(a) * r, ry: a, rz: (i % 3 - 1) * 0.3 }, 'soft');
      }
      b.sph(0.065, '#ef5b4f', { y: 0.77, s: [1, 0.8, 1] }, 'gloss', 14);
      b.cyl(0.012, 0.012, 0.03, '#4caf50', { y: 0.83 }, 'soft', 6);
    },
    { shadow: true },
  );
}
export function flatbread() {
  return model('flatbread', (b) => b.cyl(0.2, 0.2, 0.014, F.bread, { y: 0.007, s: [1, 1, 0.78] }, 'soft', 20));
}
export function meatBits() {
  return model('meatBits', (b) => strips(b, 6, 0.06, 0, 5));
}
export function dollop(color) {
  return model('dollop' + color, (b) => b.sph(1, color, { s: [0.05, 0.03, 0.045] }, 'gloss', 10));
}

// ---------------------------------------------------------------- burger
export function openBurger(s) {
  const key = `burger${+!!s.patty}${+!!s.cheese}${+!!s.salad}`;
  return model(key, (b) => {
    b.lathe('bunlowK', [[0, 0], [0.12, 0], [0.138, 0.012], [0.142, 0.034], [0.136, 0.044], [0, 0.044]], F.bun, null, 'soft', 22);
    b.cyl(0.13, 0.13, 0.004, F.bunLight, { y: 0.045 }, 'soft', 22);
    if (!s.patty) return;
    let y = 0.046;
    b.cyl(0.142, 0.142, 0.03, F.patty, { y: y + 0.015 }, 'matte', 22);
    b.tor(0.14, 0.014, '#5e3220', { y: y + 0.015, rx: PI / 2 }, 'matte', TAU, 22, 6);
    y += 0.03;
    if (s.cheese) {
      b.box(0.24, 0.01, 0.24, F.cheese, { y: y + 0.005, ry: PI / 4 }, 'gloss');
      y += 0.01;
    }
    if (s.salad) {
      for (const [x, z] of [[-0.06, 0.05], [0.06, 0.03], [0, -0.06]]) b.cyl(0.06, 0.06, 0.014, F.tomato, { x, y: y + 0.007, z }, 'gloss', 16);
      y += 0.014;
      b.cyl(0.148, 0.148, 0.01, F.lettuce, { y: y + 0.005 }, 'soft', 22);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU;
        b.sph(1, i % 2 ? F.lettuce : '#94d872', { x: Math.sin(a) * 0.148, y: y + 0.003, z: Math.cos(a) * 0.148, ry: a, s: [0.028, 0.01, 0.02] }, 'soft', 8);
      }
      y += 0.01;
    }
    b.dome(0.145, F.bun, { y, s: [1, 0.62, 1] }, 'gloss', 22);
    for (let i = 0; i < 14; i++) {
      const a = i * 2.39;
      const phi = 0.3 + (i % 4) * 0.22;
      b.sph(1, F.seed, { x: Math.sin(phi) * Math.cos(a) * 0.142, y: y + Math.cos(phi) * 0.088, z: Math.sin(phi) * Math.sin(a) * 0.142, ry: -a, rz: phi * 0.8, s: [0.009, 0.004, 0.006], order: 'YXZ' }, 'soft', 6);
    }
  });
}
export const pattyGeometry = () => G.custom('ckPatty', () => new THREE.CylinderGeometry(0.135, 0.14, 0.038, 18));
export const rawStackGeometry = () => G.custom('ckRawStack', () => new THREE.CylinderGeometry(0.13, 0.13, 0.03, 16));

// ---------------------------------------------------------------- fries
const friesSticks = (b, n, r, y, h, seed) => {
  let k = seed * 7919;
  const rnd = () => ((k = (k * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU;
    const d = Math.sqrt(rnd()) * r;
    b.box(0.022, h * (0.7 + rnd() * 0.5), 0.022, i % 4 ? F.fries : '#f5b93a', { x: Math.cos(a) * d, y: y + h * 0.4, z: Math.sin(a) * d * 0.6, rx: (rnd() - 0.5) * 0.5, rz: (rnd() - 0.5) * 0.6 }, 'soft');
  }
};
// Fries waiting in the tray: n portions as golden piles.
export function friesPile(n, cap) {
  return model(`friesPile${n}/${cap}`, (b) => {
    for (let i = 0; i < n; i++) {
      const x = (i - (cap - 1) / 2) * (0.6 / cap);
      b.at({ x }, () => {
        b.sph(1, F.fries, { y: 0.01, s: [0.06, 0.035, 0.1] }, 'soft', 10);
        for (let j = 0; j < 7; j++) b.box(0.02, 0.11, 0.02, j % 3 ? F.fries : '#f5b93a', { x: (j - 3) * 0.012, y: 0.04, z: ((j * 5) % 7) * 0.02 - 0.06, rz: (j - 3) * 0.2, rx: 1.2 + (j % 3) * 0.15 }, 'soft');
      });
    }
  });
}
export function friesBox() {
  return model('friesBoxK', (b) => {
    b.at({ s: [1, 1, 0.7] }, () => b.lathe('friesbox', [[0, 0], [0.075, 0], [0.1, 0.15], [0, 0.15]], F.ink, { ry: PI / 4 }, 'soft', 4));
    b.heart(0.05, F.paper, { y: 0.085, z: 0.046, rx: -0.1 }, 'gloss', 0.12, 0.03);
    friesSticks(b, 16, 0.06, 0.13, 0.12, 2);
  });
}
export function friesBasketLoad(color) {
  return model('basketFries' + color, (b) => {
    for (let j = 0; j < 22; j++) b.box(0.02, 0.1, 0.02, color, { x: ((j * 7) % 11) * 0.035 - 0.18, y: 0.02, z: ((j * 5) % 7) * 0.035 - 0.1, rz: 1.4, ry: j * 0.7 }, 'soft');
  });
}

// ---------------------------------------------------------------- drinks
// A tall glass with layers. parts.fill scales 0..1 while it pours; parts.top shows when it is full.
export function latteGlass() {
  return model('latteGlass', (b) => {
    b.part('fill', {}, (p) => {
      let y = 0.01;
      for (const [h, c] of [[0.04, F.condensed], [0.075, F.milk], [0.03, '#e7c49d'], [0.055, F.coffee]]) {
        p.cyl(0.066, 0.064, h, c, { y: y + h / 2 }, 'gloss', 18);
        y += h;
      }
    });
    b.part('top', {}, (p) => {
      p.rbox(0.04, 0.036, 0.04, 0.008, '#e9f8ff', { x: -0.022, y: 0.2, z: 0.012, ry: 0.5, rz: 0.2 }, 'gloss');
      p.rbox(0.036, 0.034, 0.036, 0.008, '#e9f8ff', { x: 0.024, y: 0.196, z: -0.014, ry: 1.1, rx: 0.3 }, 'gloss');
      p.cyl(0.008, 0.008, 0.3, F.ink, { x: 0.02, y: 0.2, z: 0.01, rz: -0.18 }, 'gloss', 8);
    });
    b.add(G.cyl(0.074, 0.068, 0.23, 20, true), '#ffffff', { y: 0.115 }, 'glass');
    b.cyl(0.068, 0.068, 0.012, '#ffffff', { y: 0.006 }, 'glass', 20);
    b.tor(0.074, 0.005, '#ffffff', { y: 0.23, rx: PI / 2 }, 'gloss', TAU, 24, 4);
  });
}
export function lemonadeGlass() {
  return model('lemonadeGlass', (b) => {
    b.part('fill', {}, (p) => {
      p.cyl(0.064, 0.058, 0.19, F.lemonade, { y: 0.105 }, 'gloss', 18);
      for (const [x, z] of [[0.02, 0.02], [-0.025, -0.01], [0.01, -0.03]]) p.sph(1, '#d8f0b0', { x, y: 0.14 + x, z, s: [0.016, 0.006, 0.012] }, 'gloss', 6);
    });
    b.part('top', {}, (p) => {
      p.cyl(0.05, 0.05, 0.01, F.lemon, { x: 0.05, y: 0.215, z: 0.02, rx: PI / 2, ry: 0.4 }, 'gloss', 16);
      p.cyl(0.042, 0.042, 0.011, '#fff6b0', { x: 0.05, y: 0.215, z: 0.02, rx: PI / 2, ry: 0.4 }, 'gloss', 12);
      for (const [x, ry] of [[-0.02, 0.3], [0.0, -0.6], [0.018, 1.2]]) p.sph(1, F.mint, { x, y: 0.225, z: -0.01, ry, rz: 0.5, s: [0.026, 0.008, 0.016] }, 'soft', 8);
      p.cyl(0.008, 0.008, 0.3, '#7fd3a7', { x: -0.02, y: 0.2, z: 0.01, rz: 0.18 }, 'gloss', 8);
    });
    b.add(G.cyl(0.072, 0.062, 0.22, 20, true), '#ffffff', { y: 0.11 }, 'glass');
    b.cyl(0.062, 0.062, 0.012, '#ffffff', { y: 0.006 }, 'glass', 20);
    b.tor(0.072, 0.005, '#ffffff', { y: 0.22, rx: PI / 2 }, 'gloss', TAU, 24, 4);
  });
}

// ---------------------------------------------------------------- cakes
const CAKE = {
  pecan: { body: F.sponge, side: F.cream, top: F.caramel, bits: [F.pecan, F.pecanDark] },
  german: { body: F.choc, side: F.coconut, top: F.chocDark, bits: [F.coconut, '#c8924e'] },
};
const wedge = (b, type, a0, len, R, H) => {
  const c = CAKE[type];
  b.add(sector(R, H, a0, len), c.body, {}, 'soft');
  b.add(sector(R + 0.004, 0.012, a0, len), c.top, { y: H - 0.004 }, 'gloss');
  for (const yy of [H * 0.34, H * 0.66]) b.add(sector(R + 0.002, 0.012, a0, len), type === 'pecan' ? F.cream : '#c8924e', { y: yy }, 'soft');
  const mid = a0 + len / 2;
  const x = Math.cos(mid) * R * 0.62;
  const z = -Math.sin(mid) * R * 0.62;
  b.at({ x, y: H + 0.012, z, ry: mid }, () => {
    b.sph(1, c.bits[0], { x: -0.007, s: [0.01, 0.009, 0.024] }, 'gloss', 8);
    b.sph(1, c.bits[1], { x: 0.007, s: [0.01, 0.009, 0.024] }, 'gloss', 8);
  });
  b.sph(0.024, type === 'pecan' ? F.cream : '#d9a865', { x: Math.cos(mid) * R * 0.86, y: H + 0.012, z: -Math.sin(mid) * R * 0.86 }, 'gloss', 10);
};
// A whole cake with n of `total` slices left, the gap at the front. Base at y = 0.
export function cake(type, n, total) {
  return model(`cake${type}${n}/${total}`, (b) => {
    // Shape angle a points along (cos a, 0, -sin a): -PI/2 is the front, where the gap is.
    const len = TAU / total;
    const gap = (total - n) * len;
    for (let i = 0; i < n; i++) wedge(b, type, -PI / 2 + gap / 2 + i * len + 0.01, len - 0.02, 0.2, 0.14);
  });
}
export function cakeSlice(type) {
  return model('slice' + type, (b) => {
    b.cyl(0.13, 0.11, 0.014, '#ffffff', { y: 0.007 }, 'gloss', 20);
    b.tor(0.12, 0.006, F.ink, { y: 0.014, rx: PI / 2 }, 'gloss', TAU, 20, 4);
    b.at({ y: 0.014, z: 0.09 }, () => wedge(b, type, PI / 2 - 0.5, 1.0, 0.18, 0.13));
  });
}

// ---------------------------------------------------------------- mansaf
// The platter as it is built: 0 empty tray, 1 rice, 2 lamb, 3 jameed, 4 pine nuts and parsley.
export function mansaf(step) {
  return model('mansafK' + step, (b) => {
    if (step < 1) return;
    b.cyl(0.25, 0.25, 0.008, '#e8c48d', { y: 0.004, ry: 0.2 }, 'flat', 11);
    const RR = 0.22;
    const HH = 0.09;
    b.dome(RR, F.rice, { y: 0.006, s: [1, HH / RR, 1] }, 'soft', 22);
    for (let i = 0; i < 16; i++) {
      const a = i * 2.39;
      const d = 0.04 + (i % 5) * 0.035;
      b.sph(1, i % 2 ? '#fbe6a6' : '#efc65e', { x: Math.cos(a) * d, y: 0.006 + HH * Math.sqrt(Math.max(0, 1 - (d / RR) ** 2)), z: Math.sin(a) * d, ry: a, s: [0.009, 0.004, 0.005] }, 'soft', 5);
    }
    if (step >= 3) {
      b.dome(RR * 0.8, F.jameed, { y: 0.03, s: [1, (HH * 0.92) / (RR * 0.8), 1] }, 'gloss', 20);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.3;
        b.cap(0.012, 0.03, F.jameed, { x: Math.cos(a) * RR * 0.8, y: 0.03, z: Math.sin(a) * RR * 0.8 }, 'gloss');
      }
    }
    if (step >= 2) {
      const lamb = [[0, 0.09, 0, 0], [0.08, 0.07, 0.05, 1], [-0.08, 0.07, 0.04, 2], [0.04, 0.065, -0.09, 3], [-0.06, 0.065, -0.08, 4], [0.1, 0.05, -0.05, 5], [-0.02, 0.065, 0.1, 6]];
      for (const [x, y, z, i] of lamb) {
        b.rbox(0.075, 0.05, 0.06, 0.018, i % 2 ? F.lamb : F.lambDark, { x, y: y + 0.01, z, ry: i * 0.9, rz: ((i % 3) - 1) * 0.25 }, 'soft');
        if (i % 3 === 0) {
          b.cyl(0.008, 0.008, 0.06, '#fff6e6', { x: x + 0.024, y: y + 0.035, z: z + 0.01, rz: 1.1, ry: i }, 'soft', 8);
          b.sph(0.013, '#fff6e6', { x: x + 0.05, y: y + 0.05, z: z + 0.01 }, 'soft', 8);
        }
      }
    }
    if (step >= 4) {
      for (let i = 0; i < 22; i++) {
        const a = i * 2.39 + 0.5;
        const d = 0.03 + (i % 6) * 0.028;
        b.sph(1, i % 3 ? F.pine : '#e8c896', { x: Math.cos(a) * d, y: 0.012 + HH * Math.sqrt(Math.max(0, 1 - (d / RR) ** 2)) + 0.012, z: Math.sin(a) * d, ry: a, s: [0.012, 0.006, 0.007] }, 'soft', 6);
      }
      for (let i = 0; i < 12; i++) {
        const a = i * 1.9;
        const d = 0.05 + (i % 4) * 0.035;
        b.ico(0.009, '#4caf50', { x: Math.cos(a) * d, y: 0.02 + HH * Math.sqrt(Math.max(0, 1 - (d / RR) ** 2)), z: Math.sin(a) * d, rx: i });
      }
    }
  });
}
export function riceScoop() {
  return model('riceScoop', (b) => b.dome(0.08, F.rice, { s: [1, 0.6, 1] }, 'soft', 12));
}
export function lambBits() {
  return model('lambBits', (b) => {
    for (let i = 0; i < 3; i++) b.rbox(0.07, 0.05, 0.06, 0.018, i % 2 ? F.lamb : F.lambDark, { x: (i - 1) * 0.06, ry: i }, 'soft');
  });
}

// ---------------------------------------------------------------- odds and ends
export function paperBag() {
  return model('paperBag', (b) => {
    b.box(0.26, 0.28, 0.16, F.paper, { y: 0.14 }, 'matte');
    b.box(0.262, 0.05, 0.162, F.ink, { y: 0.255 }, 'matte');
    b.heart(0.08, F.ink, { y: 0.13, z: 0.082 }, 'gloss', 0.12, 0.03);
    b.tor(0.05, 0.008, F.ink, { y: 0.29, ry: 0 }, 'gloss', PI, 12, 4);
  });
}
export function burntPatty() {
  return model('burntPatty', (b) => b.cyl(0.135, 0.14, 0.036, F.burnt, {}, 'matte', 16));
}

// ---------------------------------------------------------------- 2D drawings (bubbles and cards)
function ell(c, x, y, rx, ry, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
function rr(c, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function heart(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y + s * 0.35);
  c.bezierCurveTo(x - s * 0.62, y - s * 0.05, x - s * 0.36, y - s * 0.62, x, y - s * 0.24);
  c.bezierCurveTo(x + s * 0.36, y - s * 0.62, x + s * 0.62, y - s * 0.05, x, y + s * 0.35);
  c.closePath();
}
const OUT = '#5a3a3f';

const DRAW = {
  wrap(c, x, y, s, ex) {
    c.save();
    c.translate(x, y + s * 0.04);
    c.rotate(-0.28);
    const w = s * 0.42;
    const h = s * 0.8;
    const top = -h / 2;
    c.lineWidth = s * 0.03;
    c.strokeStyle = OUT;
    // Filling bursting out of the top
    const blob = (dx, dy, r, col) => {
      c.fillStyle = col;
      ell(c, dx * w, top + dy * w, r * w, r * w * 0.8);
      c.fill();
    };
    blob(-0.28, 0.12, 0.26, F.lettuce);
    blob(0.26, 0.1, 0.24, F.tomato);
    blob(0, 0.02, 0.3, F.meat);
    blob(-0.12, -0.06, 0.18, F.meatDark);
    blob(0.18, -0.04, 0.17, F.meatLight);
    if (ex.includes('toum')) blob(0.06, -0.14, 0.17, '#ffffff');
    if (ex.includes('pickles')) blob(-0.3, -0.04, 0.15, F.pickleDark);
    // The rolled bread
    c.fillStyle = F.bread;
    c.beginPath();
    c.moveTo(-w / 2, top + w * 0.22);
    c.quadraticCurveTo(0, top + w * 0.42, w / 2, top + w * 0.22);
    c.lineTo(w * 0.42, h / 2 - w * 0.12);
    c.quadraticCurveTo(0, h / 2 + w * 0.12, -w * 0.42, h / 2 - w * 0.12);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = F.breadSpot;
    for (const [dx, dy] of [[-0.2, 0.3], [0.15, 0.42], [-0.05, 0.55]]) {
      ell(c, dx * w, top + dy * h, w * 0.06, w * 0.04);
      c.fill();
    }
    // Paper sleeve with a heart
    c.fillStyle = F.paper;
    c.beginPath();
    c.moveTo(-w * 0.5, top + h * 0.5);
    c.quadraticCurveTo(0, top + h * 0.6, w * 0.5, top + h * 0.5);
    c.lineTo(w * 0.42, h / 2 - w * 0.12);
    c.quadraticCurveTo(0, h / 2 + w * 0.12, -w * 0.42, h / 2 - w * 0.12);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = F.ink;
    heart(c, 0, top + h * 0.75, w * 0.36);
    c.fill();
    c.restore();
  },
  burger(c, x, y, s, ex) {
    const w = s * 0.86;
    const u = w / 10;
    let by = y + s * 0.3;
    c.lineWidth = s * 0.025;
    c.strokeStyle = OUT;
    c.fillStyle = F.bun;
    rr(c, x - w / 2, by - 1.8 * u, w, 1.8 * u, u);
    c.fill();
    c.stroke();
    by -= 1.7 * u;
    c.fillStyle = F.patty;
    rr(c, x - w * 0.53, by - 1.6 * u, w * 1.06, 1.6 * u, 0.8 * u);
    c.fill();
    c.stroke();
    by -= 1.4 * u;
    if (ex.includes('cheese')) {
      c.fillStyle = F.cheese;
      c.beginPath();
      c.moveTo(x - w * 0.55, by);
      c.lineTo(x + w * 0.55, by);
      c.lineTo(x + w * 0.42, by + 1.2 * u);
      c.lineTo(x + w * 0.2, by + 0.4 * u);
      c.lineTo(x - w * 0.1, by + 1.4 * u);
      c.lineTo(x - w * 0.4, by + 0.4 * u);
      c.closePath();
      c.fill();
      by -= 0.5 * u;
    }
    if (ex.includes('salad')) {
      c.fillStyle = F.tomato;
      rr(c, x - w * 0.46, by - 0.9 * u, w * 0.92, 0.9 * u, 0.4 * u);
      c.fill();
      by -= 0.8 * u;
      c.fillStyle = F.lettuce;
      c.beginPath();
      c.moveTo(x - w * 0.56, by);
      for (let i = 0; i <= 8; i++) c.quadraticCurveTo(x - w * 0.56 + (i - 0.5) * w * 0.14, by + (i % 2 ? 1.1 : -0.6) * u, x - w * 0.56 + i * w * 0.14, by);
      c.lineTo(x + w * 0.56, by - 0.6 * u);
      c.lineTo(x - w * 0.56, by - 0.6 * u);
      c.closePath();
      c.fill();
      by -= 0.5 * u;
    }
    c.fillStyle = F.bun;
    c.beginPath();
    c.moveTo(x - w / 2, by);
    c.bezierCurveTo(x - w / 2, by - 4.6 * u, x + w / 2, by - 4.6 * u, x + w / 2, by);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = F.seed;
    for (const [dx, dy] of [[-0.22, 2.2], [0.05, 3], [0.25, 2.1], [-0.05, 1.6], [0.15, 1.2]]) {
      ell(c, x + dx * w, by - dy * u, u * 0.35, u * 0.2, dx);
      c.fill();
    }
  },
  fries(c, x, y, s) {
    const w = s * 0.6;
    c.fillStyle = F.fries;
    c.strokeStyle = OUT;
    c.lineWidth = s * 0.025;
    for (let i = 0; i < 7; i++) {
      c.save();
      c.translate(x + (i - 3) * w * 0.13, y - s * 0.05);
      c.rotate((i - 3) * 0.07);
      rr(c, -s * 0.04, -s * 0.38, s * 0.08, s * 0.5, s * 0.02);
      c.fill();
      c.stroke();
      c.restore();
    }
    c.fillStyle = F.ink;
    c.beginPath();
    c.moveTo(x - w / 2, y - s * 0.08);
    c.lineTo(x + w / 2, y - s * 0.08);
    c.lineTo(x + w * 0.38, y + s * 0.42);
    c.lineTo(x - w * 0.38, y + s * 0.42);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = '#ffffff';
    heart(c, x, y + s * 0.17, s * 0.22);
    c.fill();
  },
  latte(c, x, y, s) {
    const w = s * 0.46;
    const h = s * 0.8;
    const top = y - h / 2;
    const layers = [[0.3, F.coffee], [0.14, '#e7c49d'], [0.34, F.milk], [0.22, F.condensed]];
    let yy = top + h * 0.06;
    for (const [f, col] of layers) {
      c.fillStyle = col;
      c.fillRect(x - w / 2 + s * 0.02, yy, w - s * 0.04, h * f * 0.92);
      yy += h * f * 0.92;
    }
    c.fillStyle = '#e9f8ff';
    rr(c, x - w * 0.3, top + h * 0.02, w * 0.26, w * 0.24, s * 0.02);
    c.fill();
    c.strokeStyle = F.ink;
    c.lineWidth = s * 0.05;
    c.beginPath();
    c.moveTo(x + w * 0.12, y + h * 0.2);
    c.lineTo(x + w * 0.32, top - s * 0.12);
    c.stroke();
    c.strokeStyle = OUT;
    c.lineWidth = s * 0.03;
    rr(c, x - w / 2, top, w, h, s * 0.05);
    c.stroke();
  },
  lemonade(c, x, y, s) {
    const w = s * 0.48;
    const h = s * 0.76;
    const top = y - h / 2 + s * 0.06;
    c.fillStyle = F.lemonade;
    c.beginPath();
    c.moveTo(x - w / 2, top);
    c.lineTo(x + w / 2, top);
    c.lineTo(x + w * 0.4, top + h);
    c.lineTo(x - w * 0.4, top + h);
    c.closePath();
    c.fill();
    c.strokeStyle = OUT;
    c.lineWidth = s * 0.03;
    c.stroke();
    c.fillStyle = F.lemon;
    c.beginPath();
    c.arc(x + w * 0.42, top + s * 0.02, s * 0.15, 0, TAU);
    c.fill();
    c.stroke();
    c.fillStyle = '#fff6b0';
    c.beginPath();
    c.arc(x + w * 0.42, top + s * 0.02, s * 0.1, 0, TAU);
    c.fill();
    c.fillStyle = F.mint;
    for (const [dx, r] of [[-0.18, -0.6], [0.0, 0.2]]) {
      ell(c, x + dx * s, top - s * 0.06, s * 0.1, s * 0.05, r);
      c.fill();
    }
    c.strokeStyle = '#7fd3a7';
    c.lineWidth = s * 0.05;
    c.beginPath();
    c.moveTo(x - w * 0.1, top + h * 0.5);
    c.lineTo(x - w * 0.3, top - s * 0.16);
    c.stroke();
  },
  pecan(c, x, y, s) {
    DRAW.slice(c, x, y, s, F.sponge, F.cream, F.caramel, F.pecan);
  },
  german(c, x, y, s) {
    DRAW.slice(c, x, y, s, F.choc, F.coconut, F.coconut, F.chocDark);
  },
  slice(c, x, y, s, body, layer, top, bit) {
    const w = s * 0.8;
    const h = s * 0.42;
    const bx = x - w / 2;
    const by = y + h / 2 + s * 0.05;
    c.fillStyle = '#ffffff';
    ell(c, x, by + s * 0.04, w * 0.6, s * 0.1);
    c.fill();
    c.strokeStyle = F.ink;
    c.lineWidth = s * 0.025;
    c.stroke();
    const poly = () => {
      c.beginPath();
      c.moveTo(bx, by);
      c.lineTo(bx + w, by);
      c.lineTo(bx + w, by - h);
      c.lineTo(bx + w * 0.12, by - h * 0.55);
      c.lineTo(bx, by - h * 0.5);
      c.closePath();
    };
    c.fillStyle = body;
    poly();
    c.fill();
    c.fillStyle = layer;
    c.fillRect(bx + w * 0.05, by - h * 0.32, w * 0.95, h * 0.08);
    c.fillRect(bx + w * 0.03, by - h * 0.62, w * 0.97, h * 0.08);
    c.fillStyle = top;
    c.beginPath();
    c.moveTo(bx - s * 0.01, by - h * 0.5);
    c.lineTo(bx + w * 0.12, by - h * 0.58);
    c.lineTo(bx + w + s * 0.01, by - h - s * 0.02);
    c.lineTo(bx + w + s * 0.01, by - h + s * 0.06);
    c.lineTo(bx - s * 0.01, by - h * 0.42);
    c.closePath();
    c.fill();
    c.strokeStyle = OUT;
    c.lineWidth = s * 0.03;
    poly();
    c.stroke();
    c.fillStyle = bit;
    ell(c, bx + w * 0.72, by - h * 0.92 - s * 0.05, s * 0.08, s * 0.05, -0.3);
    c.fill();
  },
  mansaf(c, x, y, s) {
    c.fillStyle = '#f3ece0';
    ell(c, x, y + s * 0.22, s * 0.48, s * 0.17);
    c.fill();
    c.strokeStyle = F.ink;
    c.lineWidth = s * 0.04;
    c.stroke();
    c.fillStyle = F.rice;
    c.beginPath();
    c.ellipse(x, y + s * 0.17, s * 0.38, s * 0.38, 0, PI, TAU);
    c.fill();
    c.fillStyle = F.jameed;
    c.beginPath();
    c.ellipse(x, y + s * 0.15, s * 0.26, s * 0.3, 0, PI, TAU);
    c.fill();
    c.fillStyle = F.lamb;
    for (const [dx, dy] of [[-0.14, -0.04], [0.12, -0.02], [0, -0.16], [-0.02, 0.02]]) {
      rr(c, x + dx * s - s * 0.08, y + dy * s - s * 0.05, s * 0.16, s * 0.11, s * 0.04);
      c.fill();
    }
    c.fillStyle = F.pine;
    for (const [dx, dy] of [[-0.25, 0.06], [0.24, 0.07], [0.07, -0.08], [-0.08, -0.12], [0.18, -0.12]]) {
      ell(c, x + dx * s, y + dy * s, s * 0.03, s * 0.018);
      c.fill();
    }
    c.fillStyle = '#4caf50';
    for (const [dx, dy] of [[-0.18, -0.08], [0.06, -0.22], [0.2, 0.0]]) {
      ell(c, x + dx * s, y + dy * s, s * 0.025, s * 0.025);
      c.fill();
    }
  },
};
// Little round badges for the extras on an order.
const EXTRA_DRAW = {
  toum(c, x, y, r) {
    c.fillStyle = '#ffffff';
    ell(c, x, y + r * 0.1, r * 0.62, r * 0.42);
    c.fill();
    c.beginPath();
    c.moveTo(x - r * 0.12, y - r * 0.25);
    c.quadraticCurveTo(x, y - r * 0.75, x + r * 0.12, y - r * 0.25);
    c.fill();
  },
  pickles(c, x, y, r) {
    c.fillStyle = F.pickleDark;
    ell(c, x, y, r * 0.62, r * 0.62);
    c.fill();
    c.fillStyle = F.pickle;
    ell(c, x, y, r * 0.44, r * 0.44);
    c.fill();
    c.fillStyle = '#d7efb0';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ell(c, x + Math.cos(a) * r * 0.22, y + Math.sin(a) * r * 0.22, r * 0.07, r * 0.07);
      c.fill();
    }
  },
  cheese(c, x, y, r) {
    c.fillStyle = F.cheese;
    c.beginPath();
    c.moveTo(x - r * 0.6, y + r * 0.45);
    c.lineTo(x + r * 0.6, y + r * 0.45);
    c.lineTo(x + r * 0.6, y - r * 0.2);
    c.lineTo(x - r * 0.3, y - r * 0.55);
    c.closePath();
    c.fill();
    c.fillStyle = '#e8a91f';
    ell(c, x + r * 0.15, y + r * 0.1, r * 0.12, r * 0.1);
    c.fill();
  },
  salad(c, x, y, r) {
    c.fillStyle = F.lettuce;
    ell(c, x - r * 0.18, y, r * 0.48, r * 0.38, -0.4);
    c.fill();
    c.fillStyle = F.tomato;
    ell(c, x + r * 0.22, y + r * 0.08, r * 0.36, r * 0.36);
    c.fill();
    c.fillStyle = '#ffb3a8';
    ell(c, x + r * 0.22, y + r * 0.08, r * 0.18, r * 0.18);
    c.fill();
  },
};
// An order item drawn centred on (x, y), about s pixels. Extras show as badges along the bottom right.
export function drawItem(c, key, x, y, s) {
  const { dish, extras } = parseKey(key);
  DRAW[dish]?.(c, x, y, s, extras);
  extras.forEach((e, i) => {
    const r = s * 0.2;
    const bx = x + s * 0.34 - i * r * 2.05;
    const by = y + s * 0.38;
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(bx, by, r * 1.08, 0, TAU);
    c.fill();
    c.strokeStyle = F.ink;
    c.lineWidth = Math.max(2, s * 0.03);
    c.stroke();
    EXTRA_DRAW[e](c, bx, by, r);
  });
}
const urls = new Map();
export function itemUrl(key, px = 96) {
  const k = key + px;
  if (!urls.has(k)) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = px;
    drawItem(cv.getContext('2d'), key, px / 2, px / 2, px * 0.86);
    urls.set(k, cv.toDataURL());
  }
  return urls.get(k);
}
