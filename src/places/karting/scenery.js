import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mesh, canvasTexture, roundRect, FONT, heartShape } from '../../util.js';
import { plate } from './kart.js';

// Karting scenery shared by the track place and the Kart Race: grandstand, race control tower,
// helmet rack, podium, banner boards, billboards, trees, cones and the trophy.

export const C = {
  ink: '#3b2b3f',
  cream: '#fffaf4',
  shell: '#fff1dc',
  pink: '#ff8fb1',
  rose: '#ef5b6f',
  sun: '#ffd166',
  mint: '#7fd3a7',
  teal: '#21a99a',
  sky: '#6fb8ff',
  blue: '#3f7bf0',
  lilac: '#c7a6ff',
  peach: '#f08a5d',
  wood: '#c98a5a',
  woodDark: '#8b5e3c',
  leaf: '#6dbb58',
  leafDark: '#4f9a45',
  steel: '#d8dde6',
};

const M = (c, o) => (typeof c === 'string' ? mat(c, o) : c);
export const box = (w, h, d, c, o) => mesh(new THREE.BoxGeometry(w, h, d), M(c, o));
export const rbox = (w, h, d, c, r = 0.06, o, seg = 1) => mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)), M(c, o));
export const cyl = (rt, rb, h, c, seg = 14, o) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(c, o));
export const ball = (r, c, seg = 14, o) => mesh(new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7))), M(c, o));
export const at = (o, x, y, z, ry = 0) => {
  o.position.set(x, y, z);
  if (ry) o.rotation.y = ry;
  return o;
};

// A label painted on a plane. draw(ctx, w, h).
export function painted(w, h, px, draw, { glow = 0, transparent = false } = {}) {
  const tex = canvasTexture(Math.round(px * (w / h)), px, draw);
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, transparent, alphaTest: transparent ? 0.5 : 0 });
  if (glow) {
    m.emissive = new THREE.Color('#ffffff');
    m.emissiveMap = tex;
    m.emissiveIntensity = glow;
  }
  return mesh(new THREE.PlaneGeometry(w, h), m, { cast: false });
}

export function tree(s = 1, kind = 'round') {
  const t = new THREE.Group();
  t.add(at(cyl(0.15, 0.22, 1.5, C.woodDark, 10, { rough: 0.9 }), 0, 0.75, 0));
  if (kind === 'blossom') {
    t.add(at(ball(0.95, '#f9bfd2', 16, { rough: 0.85 }), 0, 2.15, 0));
    t.add(at(ball(0.68, '#f6a5c0', 14, { rough: 0.85 }), 0.55, 1.8, 0.25));
    t.add(at(ball(0.6, '#ffd3e0', 14, { rough: 0.85 }), -0.5, 2.55, 0.1));
  } else {
    t.add(at(ball(0.95, '#7fd36b', 16, { rough: 0.85 }), 0, 2.15, 0));
    t.add(at(ball(0.7, C.leafDark, 14, { rough: 0.85 }), 0.55, 1.8, 0.25));
    t.add(at(ball(0.62, '#94dc76', 14, { rough: 0.85 }), -0.5, 2.55, 0.1));
  }
  t.scale.setScalar(s);
  return t;
}

export function cone() {
  const g = new THREE.Group();
  g.add(at(rbox(0.34, 0.04, 0.34, C.peach, 0.015), 0, 0.02, 0));
  g.add(at(cyl(0.03, 0.13, 0.42, C.peach, 12), 0, 0.25, 0));
  g.add(at(cyl(0.085, 0.1, 0.08, C.cream, 12), 0, 0.22, 0));
  return g;
}

export function bush(s = 1, color = C.leaf) {
  const b = ball(0.45, color, 12, { rough: 0.9 });
  b.scale.set(1.3 * s, 0.85 * s, 1.0 * s);
  b.position.y = 0.3 * s;
  return b;
}

// ------------------------------------------------------------------ grandstand
// Tiered seats facing +Z with a striped canopy. Origin at the front centre on the ground.
// Returns { group, colliders, rows: [{ top, z }] } (top = seat cushion height, z = front edge of the step).
export function grandstand({ w = 8, tiers = 3, step = 0.42, depth = 0.62, roof = 3.1, colors = [C.pink, C.sun, C.mint, C.sky] } = {}) {
  const g = new THREE.Group();
  const colliders = [];
  const rows = [];
  for (let i = 0; i < tiers; i++) {
    const h = step * (i + 1);
    const z0 = -i * depth;
    g.add(at(box(w, h, depth, C.shell), 0, h / 2, z0 - depth / 2));
    // Riser stripe and seats
    g.add(at(box(w + 0.02, 0.08, 0.02, i % 2 ? C.mint : C.pink), 0, h - 0.12, z0 + 0.005));
    const n = Math.round(w / 0.62);
    for (let k = 0; k < n; k++) {
      const x = -w / 2 + (k + 0.5) * (w / n);
      g.add(at(rbox(0.46, 0.08, 0.36, colors[(k + i) % colors.length], 0.03), x, h + 0.04, z0 - 0.24));
      g.add(at(box(0.46, 0.3, 0.06, colors[(k + i) % colors.length]), x, h + 0.2, z0 - 0.44));
    }
    colliders.push({ type: 'box', x: 0, z: z0 - depth / 2, hw: w / 2, hd: depth / 2, h });
    rows.push({ top: h + 0.08, z: z0 });
  }
  const back = -tiers * depth;
  g.add(at(box(w + 0.2, step * tiers + 0.8, 0.14, C.cream), 0, (step * tiers + 0.8) / 2, back - 0.07));
  for (const s of [-1, 1]) g.add(at(box(0.14, step * tiers + 0.5, tiers * depth, C.cream), (s * (w + 0.14)) / 2, (step * tiers + 0.5) / 2, back / 2));
  // Canopy on posts at the back, tilted up at the front
  for (const x of [-w / 2, 0, w / 2]) g.add(at(cyl(0.07, 0.07, roof, C.cream, 10), x, roof / 2, back - 0.1));
  const canopy = new THREE.Group();
  const cw = w + 0.6;
  const nStripe = 10;
  for (let k = 0; k < nStripe; k++) canopy.add(at(box(cw / nStripe, 0.1, 1.5, k % 2 ? C.cream : C.rose), -cw / 2 + (k + 0.5) * (cw / nStripe), 0, 0));
  for (let k = 0; k < 18; k++) {
    const b = ball(0.12, k % 2 ? C.rose : C.cream, 10);
    canopy.add(at(b, -cw / 2 + (k + 0.5) * (cw / 18), -0.08, 0.75));
  }
  canopy.position.set(0, roof, back + 0.55);
  canopy.rotation.x = -0.14;
  g.add(canopy);
  colliders.push({ type: 'box', x: 0, z: back - 0.07, hw: w / 2 + 0.1, hd: 0.1 });
  return { group: g, colliders, rows, back };
}

// ------------------------------------------------------------------ race control tower
export function tower(text = 'Race Control') {
  const g = new THREE.Group();
  g.add(at(rbox(2.3, 2.2, 2.3, C.cream, 0.08), 0, 1.1, 0));
  g.add(at(box(2.34, 0.4, 2.34, C.teal), 0, 0.2, 0));
  g.add(at(rbox(2.7, 0.18, 2.7, C.rose, 0.06), 0, 2.28, 0));
  // Glass cabin on top with a balcony rail
  g.add(at(rbox(2.0, 1.2, 2.0, C.cream, 0.08), 0, 3.0, 0));
  const glass = mat('#cfeeff', { rough: 0.15, emissive: '#bfe6ff', ei: 0.2 });
  g.add(at(box(1.7, 0.75, 0.04, glass), 0, 3.05, 1.01));
  for (const s of [-1, 1]) {
    const side = box(1.7, 0.75, 0.04, glass);
    side.rotation.y = Math.PI / 2;
    g.add(at(side, s * 1.01, 3.05, 0));
  }
  g.add(at(rbox(2.4, 0.2, 2.4, C.sky, 0.08), 0, 3.7, 0));
  const roofCap = cyl(0.0, 1.25, 0.6, C.rose, 4);
  roofCap.rotation.y = Math.PI / 4;
  g.add(at(roofCap, 0, 4.1, 0));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    g.add(at(cyl(0.025, 0.025, 0.5, C.cream, 5), Math.cos(a) * 1.28, 2.6, Math.sin(a) * 1.28));
  }
  g.add(at(mesh(new THREE.TorusGeometry(1.28, 0.03, 6, 24).rotateX(Math.PI / 2), mat(C.cream)), 0, 2.85, 0));
  // Door and a window on the front
  g.add(at(rbox(0.8, 1.4, 0.06, C.wood, 0.04), 0.45, 0.85, 1.16));
  g.add(at(ball(0.04, C.sun, 8), 0.72, 0.85, 1.2));
  g.add(at(box(0.5, 0.5, 0.04, glass), -0.55, 1.3, 1.16));
  const sign = painted(1.7, 0.36, 128, (c, w, h) => {
    c.fillStyle = C.teal;
    roundRect(c, 2, 2, w - 4, h - 4, h * 0.3);
    c.fill();
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 ${Math.round(h * 0.56)}px ${FONT}`;
    c.fillText(text, w / 2, h / 2 + 3);
  });
  g.add(at(sign, 0, 1.9, 1.17));
  // Flag pole on the roof
  g.add(at(cyl(0.03, 0.03, 1.2, C.cream, 6), 0, 4.9, 0));
  return { group: g, flagTop: new THREE.Vector3(0, 5.35, 0) };
}

// ------------------------------------------------------------------ helmets on a rack
export function smallHelmet(color, stripe = C.cream, r = 0.2) {
  const g = new THREE.Group();
  const shell = mesh(new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(color, { rough: 0.32 }));
  shell.scale.set(1, 0.95, 1.05);
  const st = mesh(new THREE.TorusGeometry(r + 0.003, r * 0.09, 5, 16, Math.PI), mat(stripe, { rough: 0.4 }));
  st.rotation.y = Math.PI / 2;
  const visor = mesh(new THREE.SphereGeometry(r + 0.012, 14, 3, Math.PI / 2 - 0.9, 1.8, Math.PI * 0.32, Math.PI * 0.18), mat('#bfe6ff', { rough: 0.15, side: THREE.DoubleSide }));
  g.add(shell, st, visor);
  return g;
}

export function helmetRack(colors) {
  const g = new THREE.Group();
  const W = 2.0;
  for (const s of [-1, 1]) g.add(at(rbox(0.1, 1.7, 0.1, C.wood, 0.03), s * (W / 2), 0.85, 0));
  for (const y of [0.75, 1.4]) g.add(at(rbox(W + 0.2, 0.08, 0.3, C.wood, 0.03), 0, y, 0));
  g.add(at(rbox(W + 0.3, 0.12, 0.4, C.rose, 0.04), 0, 1.76, 0));
  colors.forEach((c, i) => {
    const row = i < 3 ? 1 : 0;
    const k = i % 3;
    const h = smallHelmet(c);
    h.rotation.y = (k - 1) * 0.25;
    g.add(at(h, (k - 1) * 0.66, row ? 1.44 + 0.04 : 0.79 + 0.04, 0));
  });
  // A little stand-up board
  const board = painted(1.1, 0.42, 128, (c, w, h) => {
    c.fillStyle = C.cream;
    roundRect(c, 3, 3, w - 6, h - 6, h * 0.3);
    c.fill();
    c.lineWidth = 6;
    c.strokeStyle = C.rose;
    c.stroke();
    c.fillStyle = C.ink;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 ${Math.round(h * 0.46)}px ${FONT}`;
    c.fillText('Helmets', w / 2, h / 2 + 3);
  });
  g.add(at(board, 0, 2.1, 0.02));
  g.add(at(box(1.16, 0.46, 0.04, C.woodDark), 0, 2.1, -0.01));
  return g;
}

// ------------------------------------------------------------------ podium
// Three blocks, first in the middle. Returns { group, spots: [{ x, y, z }] for places 1, 2, 3 }.
export function podium(s = 1) {
  const g = new THREE.Group();
  const defs = [
    { n: 1, x: 0, h: 0.9, c: C.sun },
    { n: 2, x: -1.05, h: 0.62, c: C.mint },
    { n: 3, x: 1.05, h: 0.42, c: C.pink },
  ];
  const spots = [];
  for (const d of defs) {
    g.add(at(rbox(1.0, d.h, 1.0, d.c, 0.06), d.x, d.h / 2, 0));
    g.add(at(rbox(1.04, 0.06, 1.04, C.cream, 0.03), d.x, d.h, 0));
    const p = plate(d.n, 0.26);
    g.add(at(p, d.x, d.h / 2, 0.505));
    spots.push({ x: d.x * s, y: (d.h + 0.03) * s, z: 0 });
  }
  g.scale.setScalar(s);
  return { group: g, spots, heights: defs.map((d) => d.h * s), xs: defs.map((d) => d.x * s) };
}

export function trophy(s = 1) {
  const g = new THREE.Group();
  const gold = mat('#f4c24f', { rough: 0.25, metal: 0.6 });
  g.add(at(rbox(0.16, 0.06, 0.16, C.woodDark, 0.02), 0, 0.03, 0));
  g.add(at(cyl(0.025, 0.04, 0.1, gold, 10), 0, 0.11, 0));
  const cup = mesh(new THREE.LatheGeometry([[0, 0], [0.05, 0.01], [0.1, 0.08], [0.11, 0.18], [0.1, 0.19]].map(([x, y]) => new THREE.Vector2(x, y)), 16), gold);
  g.add(at(cup, 0, 0.16, 0));
  for (const sd of [1, -1]) {
    const h = mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), gold);
    h.rotation.z = (-Math.PI / 2) * sd;
    g.add(at(h, 0.105 * sd, 0.27, 0));
  }
  g.scale.setScalar(s);
  return g;
}

// ------------------------------------------------------------------ banner boards and billboards
// A chequered banner board (both faces painted), centred at the origin.
export function bannerBoard(text, sub, { w = 5, h = 1.05, glow = 0.12 } = {}) {
  const g = new THREE.Group();
  g.add(rbox(w, h, 0.18, C.ink, 0.1));
  const tex = canvasTexture(1024, Math.round((1024 * (h - 0.1)) / (w - 0.1)), (c, cw, ch) => {
    const sq = ch / 6;
    for (let i = 0; i < cw / sq; i++) for (let j = 0; j < 6; j++) {
      if (j > 0 && j < 5) continue;
      c.fillStyle = (i + j) % 2 ? C.ink : C.cream;
      c.fillRect(i * sq, j * sq, sq, sq);
    }
    c.fillStyle = C.rose;
    roundRect(c, sq * 0.3, sq * 1.1, cw - sq * 0.6, ch - sq * 2.2, sq * 1.2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 ${Math.round(ch * 0.34)}px ${FONT}`;
    c.fillText(text, cw / 2, ch * (sub ? 0.43 : 0.52));
    if (sub) {
      c.fillStyle = '#ffe6ee';
      c.font = `600 ${Math.round(ch * 0.13)}px ${FONT}`;
      c.fillText(sub, cw / 2, ch * 0.68);
    }
  });
  const bannerMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: glow });
  for (const s of [1, -1]) {
    const b = mesh(new THREE.PlaneGeometry(w - 0.1, h - 0.1), bannerMat, { cast: false });
    b.position.set(0, 0, 0.095 * s);
    if (s < 0) b.rotation.y = Math.PI;
    g.add(b);
  }
  return g;
}

export function billboard(text, color, { w = 2.8, h = 1.2, y = 1.3, hearts = true } = {}) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) g.add(at(rbox(0.12, y + h, 0.12, C.wood, 0.03), s * w * 0.36, (y + h) / 2, -0.08));
  g.add(at(rbox(w + 0.14, h + 0.14, 0.1, C.cream, 0.05), 0, y + h / 2, 0));
  const face = painted(w, h, 256, (c, cw, ch) => {
    c.fillStyle = color;
    roundRect(c, 4, 4, cw - 8, ch - 8, ch * 0.22);
    c.fill();
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    let fs = Math.round(ch * 0.42);
    c.font = `700 ${fs}px ${FONT}`;
    const tw = c.measureText(text).width;
    if (tw > cw * 0.8) fs = Math.floor((fs * cw * 0.8) / tw);
    c.font = `700 ${fs}px ${FONT}`;
    c.fillText(text, cw / 2, ch / 2 + 6);
    if (hearts) {
      for (const [x, y, s] of [[0.08, 0.25, 0.12], [0.92, 0.72, 0.14], [0.9, 0.22, 0.08]]) {
        const hx = cw * x;
        const hy = ch * y;
        const r = ch * s;
        c.beginPath();
        c.moveTo(hx, hy + r * 0.9);
        c.bezierCurveTo(hx - r * 1.4, hy - r * 0.1, hx - r * 0.5, hy - r * 1.1, hx, hy - r * 0.35);
        c.bezierCurveTo(hx + r * 0.5, hy - r * 1.1, hx + r * 1.4, hy - r * 0.1, hx, hy + r * 0.9);
        c.fillStyle = 'rgba(255,255,255,0.85)';
        c.fill();
      }
    }
  });
  g.add(at(face, 0, y + h / 2, 0.056));
  return g;
}

// A flat heart of flowers in a cream rim. Returns { group, flowerSpots } (local).
export function heartBed(size = 2.2) {
  const g = new THREE.Group();
  const outer = heartShape(size);
  outer.holes.push(heartShape(size * 0.9));
  const rimGeo = new THREE.ExtrudeGeometry(outer, { depth: 0.26, bevelEnabled: false, curveSegments: 6 });
  const rim = mesh(rimGeo, mat(C.shell));
  rim.rotation.x = -Math.PI / 2;
  g.add(rim);
  const soil = mesh(new THREE.ExtrudeGeometry(heartShape(size * 0.92), { depth: 0.2, bevelEnabled: false, curveSegments: 6 }), mat('#9a6a45', { rough: 0.95 }));
  soil.rotation.x = -Math.PI / 2;
  g.add(soil);
  return g;
}
