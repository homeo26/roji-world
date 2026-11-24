import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, umat, mesh, canvasTexture, roundRect, heartShape, FONT } from '../../util.js';

// Building blocks shared by the school, the cinema interior and Popcorn Catch.

export { THREE, mergeGeometries, mat, umat, mesh, canvasTexture, roundRect, FONT };

export const C = {
  cream: '#fff4e3',
  paper: '#fffaf4',
  white: '#ffffff',
  peach: '#ffc9a8',
  coral: '#f6907a',
  rose: '#ef5b6f',
  pink: '#ff9eb5',
  blush: '#ffd1dc',
  red: '#e5484d',
  cherry: '#c73b45',
  wine: '#7a1f33',
  sun: '#ffd166',
  gold: '#f4c24f',
  mustard: '#ffc23d',
  mint: '#7fd8bf',
  teal: '#3fbf9f',
  sky: '#8fd3ff',
  blue: '#6fb8ff',
  lilac: '#c7a6ff',
  wood: '#d4a373',
  woodDark: '#9b6a43',
  leaf: '#6cc24a',
  leafDark: '#3f9a4f',
  ink: '#3b2b3f',
  steel: '#d3dbe5',
  sand: '#f2d59b',
};

// Primitive makers with a geometry cache local to one build.
export function kit() {
  const cache = new Map();
  const geo = (key, make) => {
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
  };
  const M = (c, o) => (typeof c === 'string' ? mat(c, o) : c);
  // Small things do not cast shadows (fewer shadow draw calls)
  const sm = (g, c, o, size) => mesh(g, M(c, o), { cast: size >= 0.3 });
  const k = {
    geo,
    box: (w, h, d, c, o) => sm(geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), c, o, Math.max(w, h, d)),
    rbox: (w, h, d, c, r = 0.06, o) =>
      sm(geo(`r${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, r >= 0.05 ? 2 : 1, Math.min(r, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002))), c, o, Math.max(w, h, d)),
    cyl: (a, b, h, c, seg = 16, o) => sm(geo(`c${a},${b},${h},${seg}`, () => new THREE.CylinderGeometry(a, b, h, seg)), c, o, Math.max(a * 2, b * 2, h)),
    sph: (r, c, o, seg = 14) => sm(geo(`s${r},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7)))), c, o, r * 2),
    tor: (r, t, c, arc = Math.PI * 2, o, seg = 20, rs = 8) => sm(geo(`t${r},${t},${arc},${seg},${rs}`, () => new THREE.TorusGeometry(r, t, rs, seg, arc)), c, o, r * 2),
    cone: (r, h, c, seg = 16, o) => sm(geo(`k${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)), c, o, Math.max(r * 2, h)),
    heart: (size, depth, c, o) => sm(geo(`h${size},${depth}`, () => heartGeo(size, depth)), c, o, size),
    star: (R, r, depth, c, o) => sm(geo(`st${R},${r},${depth}`, () => starGeo(R, r, depth)), c, o, R * 2),
    at: (o, x, y, z) => (o.position.set(x, y, z), o),
    rot: (o, x, y, z) => (o.rotation.set(x, y, z), o),
  };
  return k;
}

// One canvas for many flat decals (posters, signs, labels): one material, one draw call.
export function makeAtlas(W = 2048, H = 2048, { rough = 0.8, glow = 0 } = {}) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const material = umat('#ffffff', { rough, map: tex });
  if (glow) {
    material.emissive = new THREE.Color('#ffffff');
    material.emissiveMap = tex;
    material.emissiveIntensity = glow;
  }
  let x = 0;
  let y = 0;
  let row = 0;
  const PAD = 6;
  const cell = (w, h, draw, g) => {
    if (x + w > W) {
      x = 0;
      y += row + PAD;
      row = 0;
    }
    const cx = x;
    const cy = y;
    x += w + PAD;
    row = Math.max(row, h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    draw(ctx, w, h);
    ctx.restore();
    tex.needsUpdate = true;
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (cx + uv.getX(i) * w) / W, 1 - (cy + h) / H + (uv.getY(i) * h) / H);
    return g;
  };
  return {
    material,
    // A flat decal facing +Z, wm x hm metres, painted on pw x ph pixels
    panel: (wm, hm, pw, ph, draw) => mesh(cell(pw, ph, draw, new THREE.PlaneGeometry(wm, hm)), material, { cast: false }),
    wrap: (g, pw, ph, draw, cast = false) => mesh(cell(pw, ph, draw, g), material, { cast }),
  };
}

// A tiling canvas texture.
export function pattern(w, h, draw, rx = 1, ry = 1) {
  const t = canvasTexture(w, h, draw);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}

export function uvScale(g, sx, sy) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
  return g;
}

export function starShape(R = 0.12, r = 0.05, n = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 ? r : R;
    const a = (i / (n * 2)) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  return s;
}

export function starGeo(R, r, depth = 0.04) {
  const g = new THREE.ExtrudeGeometry(starShape(R, r), { depth, bevelEnabled: true, bevelSize: depth * 0.35, bevelThickness: depth * 0.35, bevelSegments: 1 });
  g.translate(0, 0, -depth / 2);
  return g;
}

// A heart centred on the origin, facing +Z, about `size` tall.
export function heartGeo(size, depth = 0.04) {
  const g = new THREE.ExtrudeGeometry(heartShape(size), { depth, bevelEnabled: true, bevelSize: depth * 0.35, bevelThickness: depth * 0.35, bevelSegments: 2, curveSegments: 6 });
  g.computeBoundingBox();
  const b = g.boundingBox;
  g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -depth / 2);
  return g;
}

// Draw a heart path centred at (x, y), `s` pixels tall.
export function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.45);
  ctx.bezierCurveTo(x - s * 0.75, y - s * 0.05, x - s * 0.45, y - s * 0.62, x, y - s * 0.28);
  ctx.bezierCurveTo(x + s * 0.45, y - s * 0.62, x + s * 0.75, y - s * 0.05, x, y + s * 0.45);
  ctx.closePath();
}

// Fill text, shrinking it until it fits maxW.
export function fitText(ctx, text, x, y, maxW, size, weight = 600) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  const w = ctx.measureText(text).width;
  if (w > maxW) ctx.font = `${weight} ${Math.floor((size * maxW) / w)}px ${FONT}`;
  ctx.fillText(text, x, y);
}

// A rounded label: cream board, coloured edge, one to three lines of Fredoka.
export function boardDraw(lines, { fill = '#fff7ea', edge = C.rose, ink = '#4a3423', small = C.rose, radius = 0.25, first = 0.24, rest = 0.3, under = null } = {}) {
  return (ctx, w, h) => {
    if (under) {
      ctx.fillStyle = under;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.fillStyle = fill;
    roundRect(ctx, 6, 6, w - 12, h - 12, Math.min(w, h) * radius);
    ctx.fill();
    ctx.lineWidth = Math.max(6, h * 0.045);
    ctx.strokeStyle = edge;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (lines.length === 1) {
      ctx.fillStyle = ink;
      fitText(ctx, lines[0], w / 2, h / 2 + h * 0.03, w * 0.86, Math.round(h * 0.46));
      return;
    }
    const n = lines.length;
    const step = (h * 0.78) / n;
    lines.forEach((t, i) => {
      const y = h * 0.11 + step * (i + 0.5) + h * 0.02;
      ctx.fillStyle = i === 0 ? small : ink;
      fitText(ctx, t, w / 2, y, w * 0.86, Math.round(h * (i === 0 ? first : rest)));
    });
  };
}

// Merge every plain-coloured static mesh under `group` into a few meshes with vertex colours
// (one per roughness and shadow setting). keep: objects to leave alone. Returns the merged meshes.
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
    if (Array.isArray(m) || !m.isMeshStandardMaterial || m.map || m.transparent || m.vertexColors || m.alphaTest > 0) return;
    if (m.emissiveIntensity > 0 && m.emissive.getHex() !== 0) return;
    if (!shown(o) || !o.geometry.attributes.normal) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n);
    g.clearGroups();
    g.morphAttributes = {};
    rel.multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(rel);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = m.color.r;
      col[i * 3 + 1] = m.color.g;
      col[i * 3 + 2] = m.color.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const rough = m.roughness < 0.45 ? 0.3 : m.roughness < 0.72 ? 0.6 : 0.85;
    const metal = m.metalness > 0.3 ? 0.5 : 0;
    const key = `${rough}|${metal}|${m.side}|${m.flatShading ? 1 : 0}|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}`;
    if (!buckets.has(key)) buckets.set(key, { rough, metal, side: m.side, flat: m.flatShading, cast: o.castShadow, receive: o.receiveShadow, list: [] });
    buckets.get(key).list.push(g);
    victims.push(o);
  });
  for (const o of victims) o.removeFromParent();
  const out = [];
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.list, false);
    if (!merged) continue;
    const mm = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: b.rough, metalness: b.metal, side: b.side, flatShading: !!b.flat }));
    mm.castShadow = b.cast;
    mm.receiveShadow = b.receive;
    group.add(mm);
    out.push(mm);
  }
  return out;
}

// Freeze a kid (staff, a passer-by) in a pose so it merges with the room.
// Curved parts get fewer segments, the blush becomes solid and the ground blob goes away.
export function freeze(kid, { pose = 'stand', hands = null, t = 0 } = {}) {
  kid.pose = pose;
  kid.hands = hands;
  kid.update(1 / 60, t, 0, 0, 0);
  kid.blob.visible = false;
  const half = (n, min) => Math.max(min, Math.round(n * 0.5));
  const skin = new THREE.Color(kid.look.skin);
  kid.root.traverse((o) => {
    if (!o.isMesh || o === kid.blob) return;
    if (o.material.isMeshBasicMaterial && o.parent === kid.head) {
      const c = skin.clone().lerp(o.material.color, o.material.opacity);
      o.material = mat('#' + c.getHexString(), { rough: 0.6 });
    }
    const g = o.geometry;
    const p = g.parameters;
    let next = null;
    if (g.type === 'SphereGeometry') next = new THREE.SphereGeometry(p.radius, half(p.widthSegments, 8), half(p.heightSegments, 6), p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
    else if (g.type === 'LatheGeometry') next = new THREE.LatheGeometry(p.points, half(p.segments, 10), p.phiStart, p.phiLength);
    else if (g.type === 'TorusGeometry') next = new THREE.TorusGeometry(p.radius, p.tube, half(p.radialSegments, 4), half(p.tubularSegments, 8), p.arc);
    else if (g.type === 'CapsuleGeometry') next = new THREE.CapsuleGeometry(p.radius, p.height, 2, half(p.radialSegments, 6));
    if (!next) return;
    g.dispose();
    o.geometry = next;
  });
  kid.blob.removeFromParent();
  return kid;
}

// Soft round glow for sprites.
export function glowTexture() {
  return canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
}

// Bell-like ding: a few decaying partials. s: api.sound or ctx.sound.
export function bellTone(s, time, base = 740, gain = 0.07) {
  if (!s?.ctx) return;
  s.tone(base, time, 1.6, { type: 'sine', gain, attack: 0.004 });
  s.tone(base * 2.01, time, 0.9, { type: 'sine', gain: gain * 0.45, attack: 0.004 });
  s.tone(base * 3.02, time, 0.5, { type: 'sine', gain: gain * 0.22, attack: 0.004 });
}
