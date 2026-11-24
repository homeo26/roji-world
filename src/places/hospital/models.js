import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, mesh, canvasTexture, roundRect, heartShape, FONT } from '../../util.js';

// Small 3D models for Sunny Hill Hospital, shared by the place, its rooms and Patient Rounds.

export const C = {
  wall: '#fff5ea',
  cream: '#fff1dc',
  mint: '#7fd8bf',
  mintDeep: '#3fbf9f',
  mintPale: '#d6f4ea',
  pink: '#ff9eb5',
  rose: '#ef5b6f',
  blush: '#ffd1dc',
  peach: '#ffc9a8',
  coral: '#f6907a',
  sun: '#ffd166',
  sky: '#8fd3ff',
  skyPale: '#dcf1ff',
  wood: '#d4a373',
  woodDark: '#9b6a43',
  white: '#fffaf4',
  steel: '#d3dbe5',
  ink: '#3b2b3f',
  lilac: '#c7a6ff',
  leaf: '#6cc24a',
  leafDark: '#3f9a4f',
  terracotta: '#e08a5c',
};

// Primitive helpers with a geometry cache local to one build (so nothing is shared across scenes).
export function kit() {
  const cache = new Map();
  const g = (key, make) => {
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
  };
  const M = (c, o) => (typeof c === 'string' ? mat(c, o) : c);
  const k = {
    geo: g,
    box: (w, h, d, c, o) => mesh(g(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), M(c, o)),
    rbox: (w, h, d, c, r = 0.08, o) => mesh(g(`r${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, r >= 0.05 ? 2 : 1, r)), M(c, o)),
    cyl: (a, b, h, c, seg = 16, o) => mesh(g(`c${a},${b},${h},${seg}`, () => new THREE.CylinderGeometry(a, b, h, seg)), M(c, o)),
    sph: (r, c, o, seg = 14) => mesh(g(`s${r},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7)))), M(c, o)),
    tor: (r, t, c, arc = Math.PI * 2, o, seg = 20) => mesh(g(`t${r},${t},${arc},${seg}`, () => new THREE.TorusGeometry(r, t, 8, seg, arc)), M(c, o)),
    cap: (r, len, c, o) => mesh(g(`p${r},${len}`, () => new THREE.CapsuleGeometry(r, len, 4, 10)), M(c, o)),
    heart: (size, depth, c, o) =>
      mesh(
        g(`h${size},${depth}`, () => {
          const geo = new THREE.ExtrudeGeometry(heartShape(size), { depth, bevelEnabled: true, bevelSize: depth * 0.4, bevelThickness: depth * 0.4, bevelSegments: 2, curveSegments: 6 });
          geo.translate(0, -size * 0.05, -depth / 2);
          return geo;
        }),
        M(c, o),
      ),
    at: (o, x, y, z) => (o.position.set(x, y, z), o),
    // A flat plane with painted canvas text or art, facing +Z.
    panel: (w, h, px, draw, opts = {}) => {
      const tex = canvasTexture(px, Math.round((px * h) / w), draw);
      const m = new THREE.MeshStandardMaterial({ map: tex, roughness: opts.rough ?? 0.75, transparent: !!opts.transparent });
      if (opts.glow) {
        m.emissive = new THREE.Color('#ffffff');
        m.emissiveMap = tex;
        m.emissiveIntensity = opts.glow;
      }
      return mesh(new THREE.PlaneGeometry(w, h), m, { cast: false });
    },
  };
  return k;
}

// Merge every plain-coloured static mesh under `group` into a few meshes with vertex colours
// (one per roughness and shadow setting), so a busy room costs a handful of draw calls.
// Textured, transparent, metallic and glowing meshes are left for the engine's own merge.
// keep: objects (and their children) to leave alone. Returns the merged meshes: list them in `dynamic`
// so the engine's merge, which keeps only position, normal and uv, does not strip their colours.
export function colorBake(group, keep = []) {
  group.updateMatrixWorld(true);
  const skip = new Set();
  for (const d of keep) d.traverse((o) => skip.add(o));
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const buckets = new Map();
  const victims = [];
  const shown = (o) => {
    for (let p = o; p && p !== group; p = p.parent) if (!p.visible) return false;
    return true;
  };
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || skip.has(o) || o.children.length) return;
    const m = o.material;
    if (Array.isArray(m) || !m.isMeshStandardMaterial || m.map || m.transparent || m.metalness > 0 || m.vertexColors) return;
    if (m.emissiveIntensity > 0 && m.emissive.getHex() !== 0) return;
    if (!shown(o) || !o.geometry.attributes.normal) return;
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal') geo.deleteAttribute(name);
    geo.clearGroups();
    geo.morphAttributes = {};
    rel.multiplyMatrices(inv, o.matrixWorld);
    geo.applyMatrix4(rel);
    const n = geo.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([m.color.r, m.color.g, m.color.b], i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const rough = Math.round(m.roughness * 5) / 5;
    const key = `${rough}${o.castShadow ? 'c' : ''}${o.receiveShadow ? 'r' : ''}${m.side}${m.flatShading ? 'f' : ''}`;
    if (!buckets.has(key)) buckets.set(key, { rough, side: m.side, flat: m.flatShading, cast: o.castShadow, receive: o.receiveShadow, list: [] });
    buckets.get(key).list.push(geo);
    victims.push(o);
  });
  for (const o of victims) o.removeFromParent();
  const out = [];
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.list, false);
    if (!merged) continue;
    const mm = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: b.rough, side: b.side, flatShading: b.flat }));
    mm.castShadow = b.cast;
    mm.receiveShadow = b.receive;
    group.add(mm);
    out.push(mm);
  }
  return out;
}

// The hospital emblem: a mint heart with a white plus on a round white badge, facing +Z.
export function emblem(k, size = 1, { badge = true, heartColor = C.mintDeep } = {}) {
  const g = new THREE.Group();
  if (badge) {
    const disc = k.cyl(size * 0.66, size * 0.66, size * 0.08, C.white, 32);
    disc.rotation.x = Math.PI / 2;
    const rim = k.tor(size * 0.66, size * 0.045, C.mint, Math.PI * 2, undefined, 36);
    g.add(disc, rim);
  }
  const heart = k.heart(size, size * 0.12, heartColor, { rough: 0.5 });
  heart.position.z = size * 0.1;
  g.add(heart);
  const a = k.rbox(size * 0.38, size * 0.12, size * 0.06, C.white, size * 0.03);
  const b = k.rbox(size * 0.12, size * 0.38, size * 0.06, C.white, size * 0.03);
  k.at(a, 0, size * 0.02, size * 0.2);
  k.at(b, 0, size * 0.02, size * 0.2);
  g.add(a, b);
  return g;
}

// A label texture: cream board, coloured edge, one or two lines of Fredoka.
export function drawBoard(ctx, w, h, { lines, edge = C.mintDeep, fill = '#fffaf2', ink = C.ink, small = C.mintDeep, radius = 0.22, sizes = [0.26, 0.4] }) {
  ctx.fillStyle = fill;
  roundRect(ctx, 6, 6, w - 12, h - 12, Math.min(w, h) * radius);
  ctx.fill();
  ctx.lineWidth = Math.max(6, h * 0.05);
  ctx.strokeStyle = edge;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (lines.length === 1) {
    ctx.fillStyle = ink;
    ctx.font = `600 ${Math.round(h * sizes[1] * 1.2)}px ${FONT}`;
    ctx.fillText(lines[0], w / 2, h / 2 + h * 0.03, w * 0.88);
  } else {
    ctx.fillStyle = small;
    ctx.font = `600 ${Math.round(h * sizes[0])}px ${FONT}`;
    ctx.fillText(lines[0], w / 2, h * 0.31, w * 0.86);
    ctx.fillStyle = ink;
    ctx.font = `600 ${Math.round(h * sizes[1])}px ${FONT}`;
    ctx.fillText(lines[1], w / 2, h * 0.66, w * 0.88);
  }
}

// ------------------------------------------------------------------ the doctor's tools
// Each tool is a Group lying on a tray (base at y = 0, about 0.3 m across), at 1x scale.

function stethoscope(k) {
  const g = new THREE.Group();
  const tube = k.tor(0.11, 0.016, '#3fbf9f', Math.PI * 1.55, { rough: 0.45 });
  tube.rotation.set(-Math.PI / 2, 0, 0.6);
  k.at(tube, 0, 0.02, 0);
  const chest = k.cyl(0.05, 0.05, 0.03, C.steel, 18, { metal: 0.6, rough: 0.25 });
  k.at(chest, 0.1, 0.02, -0.07);
  const rim = k.cyl(0.054, 0.054, 0.012, '#ff8fb1', 18);
  k.at(rim, 0.1, 0.035, -0.07);
  const yoke = k.tor(0.055, 0.01, C.steel, Math.PI, { metal: 0.6, rough: 0.25 });
  yoke.rotation.set(-Math.PI / 2, 0, 2.6);
  k.at(yoke, -0.1, 0.02, 0.06);
  g.add(tube, chest, rim, yoke);
  for (const a of [2.6, 2.6 + Math.PI]) {
    const tip = k.sph(0.018, '#ff8fb1', undefined, 10);
    k.at(tip, -0.1 + Math.cos(a) * 0.055, 0.02, 0.06 - Math.sin(a) * 0.055);
    g.add(tip);
  }
  return g;
}

function thermometer(k) {
  const g = new THREE.Group();
  const body = k.cap(0.028, 0.22, C.white, { rough: 0.4 });
  body.rotation.z = Math.PI / 2;
  k.at(body, 0, 0.03, 0);
  const tip = k.sph(0.024, C.rose, { rough: 0.35 }, 12);
  k.at(tip, -0.15, 0.03, 0);
  const screen = k.rbox(0.08, 0.012, 0.034, '#bff0e2', 0.005);
  k.at(screen, 0.04, 0.058, 0);
  const line = k.box(0.05, 0.004, 0.008, C.rose);
  k.at(line, 0.04, 0.066, 0);
  const btn = k.sph(0.012, C.mintDeep, undefined, 8);
  k.at(btn, 0.1, 0.058, 0);
  g.add(body, tip, screen, line, btn);
  return g;
}

function bandage(k) {
  const g = new THREE.Group();
  for (const [a, y] of [[0.35, 0.012], [-0.4, 0.03]]) {
    const strip = k.rbox(0.24, 0.016, 0.075, '#f4c7a1', 0.008);
    strip.rotation.y = a;
    k.at(strip, 0, y, 0);
    const pad = k.rbox(0.075, 0.02, 0.06, C.white, 0.008);
    pad.rotation.y = a;
    k.at(pad, 0, y + 0.006, 0);
    g.add(strip, pad);
  }
  const heart = k.heart(0.035, 0.008, C.rose);
  heart.rotation.x = -Math.PI / 2;
  heart.rotation.z = 0.4;
  k.at(heart, 0, 0.05, 0);
  g.add(heart);
  return g;
}

function medicine(k) {
  const g = new THREE.Group();
  const bottle = k.cyl(0.055, 0.06, 0.15, '#ff8fb1', 18, { rough: 0.35 });
  k.at(bottle, -0.03, 0.075, 0);
  const neck = k.cyl(0.03, 0.045, 0.03, '#ff8fb1', 14, { rough: 0.35 });
  k.at(neck, -0.03, 0.165, 0);
  const cap = k.cyl(0.035, 0.035, 0.04, C.white, 14);
  k.at(cap, -0.03, 0.2, 0);
  const label = k.cyl(0.062, 0.062, 0.06, C.white, 18);
  k.at(label, -0.03, 0.07, 0);
  const heart = k.heart(0.04, 0.01, C.rose);
  k.at(heart, -0.03, 0.07, 0.063);
  const spoon = k.sph(0.03, C.steel, { metal: 0.6, rough: 0.25 }, 12);
  spoon.scale.set(1, 0.3, 0.75);
  k.at(spoon, 0.08, 0.012, 0.04);
  const handle = k.box(0.11, 0.008, 0.014, C.steel, { metal: 0.6, rough: 0.25 });
  handle.rotation.y = -0.5;
  k.at(handle, 0.14, 0.012, 0.0);
  g.add(bottle, neck, cap, label, heart, spoon, handle);
  return g;
}

function icepack(k) {
  const g = new THREE.Group();
  const pack = k.rbox(0.22, 0.065, 0.17, '#9edcff', 0.03, { rough: 0.35 });
  k.at(pack, 0, 0.033, 0);
  const cap = k.cyl(0.03, 0.03, 0.04, C.white, 12);
  cap.rotation.z = Math.PI / 2;
  k.at(cap, 0.125, 0.035, 0);
  g.add(pack, cap);
  for (let i = 0; i < 3; i++) {
    const arm = k.box(0.09, 0.006, 0.012, C.white);
    arm.rotation.y = (i * Math.PI) / 3;
    k.at(arm, -0.02, 0.068, 0);
    g.add(arm);
  }
  return g;
}

function light(k) {
  const g = new THREE.Group();
  const stick = k.rbox(0.22, 0.01, 0.04, '#e8c58f', 0.005);
  stick.rotation.y = 0.25;
  k.at(stick, 0, 0.006, 0.04);
  const pen = k.cyl(0.018, 0.018, 0.17, C.mintDeep, 12, { rough: 0.4 });
  pen.rotation.z = Math.PI / 2;
  k.at(pen, 0, 0.02, -0.04);
  const head = k.cyl(0.022, 0.018, 0.03, C.steel, 12, { metal: 0.6, rough: 0.25 });
  head.rotation.z = Math.PI / 2;
  k.at(head, -0.1, 0.02, -0.04);
  const bulb = k.sph(0.016, '#fff3b0', { emissive: '#ffe680', ei: 0.9 }, 10);
  k.at(bulb, -0.118, 0.02, -0.04);
  const clip = k.box(0.06, 0.006, 0.01, C.steel, { metal: 0.6, rough: 0.25 });
  k.at(clip, 0.03, 0.04, -0.04);
  g.add(stick, pen, head, bulb, clip);
  return g;
}

function splint(k) {
  const g = new THREE.Group();
  const board = k.rbox(0.26, 0.03, 0.075, '#9fe0c8', 0.012, { rough: 0.6 });
  k.at(board, 0, 0.015, 0);
  const pad = k.rbox(0.22, 0.012, 0.06, C.white, 0.006);
  k.at(pad, 0, 0.034, 0);
  g.add(board, pad);
  for (const x of [-0.07, 0.07]) {
    const strap = k.rbox(0.03, 0.045, 0.09, C.rose, 0.01);
    k.at(strap, x, 0.022, 0);
    g.add(strap);
  }
  return g;
}

function tweezers(k) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const arm = k.box(0.19, 0.01, 0.018, C.steel, { metal: 0.7, rough: 0.2 });
    arm.rotation.y = s * 0.09;
    k.at(arm, 0, 0.01, s * 0.009);
    g.add(arm);
  }
  const grip = k.rbox(0.06, 0.016, 0.05, '#ff8fb1', 0.007);
  k.at(grip, 0.06, 0.012, 0);
  const end = k.sph(0.016, C.steel, { metal: 0.7, rough: 0.2 }, 10);
  k.at(end, 0.095, 0.01, 0);
  g.add(grip, end);
  return g;
}

export const TOOL_MODELS = { stethoscope, thermometer, bandage, medicine, icepack, light, splint, tweezers };

export function makeTool(k, id) {
  return TOOL_MODELS[id](k);
}

// ------------------------------------------------------------------ furniture and little things

// Flowers in a vase. palette: bloom colours.
export function bouquet(k, { scale = 1, vase = C.skyPale, blooms = [C.rose, C.pink, '#ffffff', '#ff7fa3', C.sun], count = 7 } = {}) {
  const g = new THREE.Group();
  const v = mesh(new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.09, 0.05], [0.085, 0.13], [0.055, 0.19], [0.065, 0.22]].map(([x, y]) => new THREE.Vector2(x, y)), 18), mat(vase, { rough: 0.35 }));
  g.add(v);
  const stems = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const r = i === 0 ? 0 : 0.06 + (i % 2) * 0.03;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = 0.34 + ((i * 37) % 9) * 0.012;
    const stem = k.cyl(0.006, 0.006, h - 0.15, C.leafDark, 5);
    k.at(stem, x * 0.6, 0.15 + (h - 0.15) / 2, z * 0.6);
    stem.rotation.set(z * 1.4, 0, -x * 1.4);
    const bloom = new THREE.Group();
    const col = blooms[i % blooms.length];
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * Math.PI * 2;
      const petal = k.sph(0.03, col, { rough: 0.6 }, 8);
      petal.scale.set(1, 0.6, 1);
      k.at(petal, Math.cos(pa) * 0.026, 0, Math.sin(pa) * 0.026);
      bloom.add(petal);
    }
    const mid = k.sph(0.018, C.sun, undefined, 8);
    k.at(mid, 0, 0.012, 0);
    bloom.add(mid);
    k.at(bloom, x * 1.4, h, z * 1.4);
    bloom.rotation.set(z * 2, 0, -x * 2);
    g.add(stem, bloom);
    stems.push(bloom);
  }
  for (const s of [-1, 1]) {
    const leaf = k.sph(0.05, C.leaf, undefined, 8);
    leaf.scale.set(1.4, 0.25, 0.6);
    leaf.rotation.z = s * 0.5;
    k.at(leaf, s * 0.07, 0.24, 0);
    g.add(leaf);
  }
  g.scale.setScalar(scale);
  g.userData.blooms = stems;
  return g;
}

// A mug with a heart on the side facing +Z, with coffee inside.
export function heartMug(k, { color = C.white, heart = C.rose } = {}) {
  const g = new THREE.Group();
  const cup = k.cyl(0.05, 0.045, 0.11, color, 18, { rough: 0.4 });
  k.at(cup, 0, 0.055, 0);
  const coffee = k.cyl(0.044, 0.044, 0.01, '#7a4a2a', 16, { rough: 0.3 });
  k.at(coffee, 0, 0.105, 0);
  const handle = k.tor(0.028, 0.009, color, Math.PI * 1.2, { rough: 0.4 });
  k.at(handle, 0.05, 0.06, 0);
  handle.rotation.set(0, 0, -Math.PI * 0.6);
  const h = k.heart(0.045, 0.006, heart);
  k.at(h, 0, 0.06, 0.05);
  g.add(cup, coffee, handle, h);
  return g;
}

// A potted plant with round leafy clumps.
export function plant(k, { scale = 1, pot = C.terracotta } = {}) {
  const g = new THREE.Group();
  const p = k.cyl(0.22, 0.17, 0.36, pot, 16);
  k.at(p, 0, 0.18, 0);
  const rim = k.cyl(0.24, 0.24, 0.06, pot, 16);
  k.at(rim, 0, 0.36, 0);
  const soil = k.cyl(0.21, 0.21, 0.02, '#7a5236', 14);
  k.at(soil, 0, 0.385, 0);
  g.add(p, rim, soil);
  const spots = [[0, 0.75, 0, 0.26], [0.16, 0.6, 0.05, 0.2], [-0.15, 0.62, -0.03, 0.21], [0.03, 0.98, -0.02, 0.18], [-0.05, 0.55, 0.15, 0.17]];
  spots.forEach(([x, y, z, r], i) => {
    const leaf = k.sph(r, i % 2 ? C.leafDark : C.leaf, { rough: 0.8 }, 12);
    k.at(leaf, x, y, z);
    g.add(leaf);
  });
  g.scale.setScalar(scale);
  return g;
}

// A simple chair facing +Z (seat 0.46 m high).
export function chair(k, { color = C.mint, legs = C.steel, seat = 0.46 } = {}) {
  const g = new THREE.Group();
  const s = k.rbox(0.5, 0.08, 0.48, color, 0.035);
  k.at(s, 0, seat, 0);
  const b = k.rbox(0.5, 0.5, 0.08, color, 0.035);
  k.at(b, 0, seat + 0.3, -0.22);
  b.rotation.x = -0.08;
  g.add(s, b);
  for (const [x, z] of [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]]) {
    const l = k.cyl(0.022, 0.022, seat, legs, 6);
    k.at(l, x, seat / 2, z);
    g.add(l);
  }
  return g;
}

// A hospital bed, head against -Z, 2.1 m long and 1.15 m wide. Mattress top at about 0.62 m.
export function hospitalBed(k, { blanket = C.pink, frame = C.white, rail = C.steel } = {}) {
  const g = new THREE.Group();
  const L = 2.1;
  const W = 1.15;
  const base = k.rbox(W, 0.16, L - 0.1, frame, 0.05);
  k.at(base, 0, 0.38, 0);
  const mattress = k.rbox(W - 0.08, 0.18, L - 0.2, '#f3f7fb', 0.07);
  k.at(mattress, 0, 0.53, 0.02);
  const head = k.rbox(W + 0.06, 1.05, 0.1, C.mint, 0.05);
  k.at(head, 0, 0.7, -L / 2 + 0.03);
  const headTrim = k.rbox(W + 0.1, 0.1, 0.14, frame, 0.05);
  k.at(headTrim, 0, 1.24, -L / 2 + 0.03);
  const foot = k.rbox(W + 0.06, 0.55, 0.08, C.mint, 0.04);
  k.at(foot, 0, 0.5, L / 2 - 0.02);
  const footTrim = k.rbox(W + 0.1, 0.08, 0.12, frame, 0.04);
  k.at(footTrim, 0, 0.8, L / 2 - 0.02);
  g.add(base, mattress, head, headTrim, foot, footTrim);
  // Raised backrest with a pillow
  const back = k.rbox(W - 0.12, 0.08, 0.7, '#f3f7fb', 0.04);
  back.rotation.x = 0.85;
  k.at(back, 0, 0.78, -L / 2 + 0.36);
  const pillow = k.rbox(0.78, 0.16, 0.42, C.white, 0.08);
  pillow.rotation.x = 0.85;
  k.at(pillow, 0, 0.88, -L / 2 + 0.3);
  g.add(back, pillow);
  // Blanket over the legs, with a folded edge
  const quilt = k.rbox(W + 0.02, 0.2, 1.25, blanket, 0.07, { rough: 0.85 });
  k.at(quilt, 0, 0.69, 0.36);
  const fold = k.rbox(W + 0.04, 0.09, 0.16, C.white, 0.04);
  k.at(fold, 0, 0.76, -0.26);
  g.add(quilt, fold);
  // Side rails and wheels
  for (const s of [-1, 1]) {
    const r = k.rbox(0.04, 0.04, 0.9, rail, 0.02, { metal: 0.4, rough: 0.35 });
    k.at(r, s * (W / 2 + 0.03), 0.74, -0.25);
    g.add(r);
    for (const z of [-0.45, -0.05]) {
      const p = k.cyl(0.015, 0.015, 0.26, rail, 6, { metal: 0.4, rough: 0.35 });
      k.at(p, s * (W / 2 + 0.03), 0.61, z - 0.25 + 0.25);
      g.add(p);
    }
    for (const z of [-L / 2 + 0.18, L / 2 - 0.18]) {
      const leg = k.cyl(0.03, 0.03, 0.26, rail, 8, { metal: 0.4, rough: 0.35 });
      k.at(leg, s * (W / 2 - 0.12), 0.17, z);
      const wheel = k.cyl(0.06, 0.06, 0.04, '#6b6f86', 12);
      wheel.rotation.z = Math.PI / 2;
      k.at(wheel, s * (W / 2 - 0.12), 0.06, z);
      g.add(leg, wheel);
    }
  }
  return g;
}

// A painted window texture (soft sky with clouds) and a framed window mesh facing +Z.
export function skyTexture() {
  return canvasTexture(256, 192, (ctx, w, h) => {
    const gr = ctx.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#8fd3ff');
    gr.addColorStop(1, '#e9f8ff');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    for (const [x, y, s] of [[60, 60, 1], [180, 40, 0.8], [150, 120, 0.6]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, 34 * s, 14 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 20 * s, y - 8 * s, 22 * s, 14 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 18 * s, y - 4 * s, 18 * s, 11 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#9ad06a';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.quadraticCurveTo(w * 0.3, h * 0.72, w * 0.6, h * 0.86);
    ctx.quadraticCurveTo(w * 0.85, h * 0.76, w, h * 0.82);
    ctx.lineTo(w, h);
    ctx.fill();
  });
}

export function windowMesh(k, skyMat, { w = 1.2, h = 1.0, curtain = C.pink, frame = C.white } = {}) {
  const g = new THREE.Group();
  const f = k.rbox(w + 0.18, h + 0.18, 0.1, frame, 0.04);
  const pane = new THREE.Mesh(k.geo(`pane${w},${h}`, () => new THREE.PlaneGeometry(w, h)), skyMat);
  k.at(pane, 0, 0, 0.056);
  const bar = k.box(0.05, h, 0.03, frame);
  k.at(bar, 0, 0, 0.07);
  const sill = k.rbox(w + 0.34, 0.06, 0.2, frame, 0.02);
  k.at(sill, 0, -h / 2 - 0.1, 0.08);
  g.add(f, pane, bar, sill);
  for (const s of [-1, 1]) {
    const c = k.rbox(0.28, h + 0.36, 0.07, curtain, 0.035, { rough: 0.9 });
    k.at(c, s * (w / 2 + 0.1), -0.04, 0.12);
    const tie = k.rbox(0.3, 0.05, 0.09, C.white, 0.02);
    k.at(tie, s * (w / 2 + 0.1), -0.12, 0.13);
    g.add(c, tie);
  }
  const rod = k.cyl(0.02, 0.02, w + 0.8, C.woodDark, 8);
  rod.rotation.z = Math.PI / 2;
  k.at(rod, 0, h / 2 + 0.16, 0.14);
  g.add(rod);
  return g;
}

// A drawn sparkle (four-point star) for twinkles.
export function sparkleTexture() {
  return canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,240,1)');
    g.addColorStop(0.25, 'rgba(255,230,150,0.9)');
    g.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(32, 2);
    ctx.quadraticCurveTo(36, 28, 62, 32);
    ctx.quadraticCurveTo(36, 36, 32, 62);
    ctx.quadraticCurveTo(28, 36, 2, 32);
    ctx.quadraticCurveTo(28, 28, 32, 2);
    ctx.fill();
  });
}
