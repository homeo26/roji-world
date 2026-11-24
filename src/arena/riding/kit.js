import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, mesh, canvasTexture, roundRect, rng, FONT } from '../../util.js';
import { PALETTE, HAIRSTYLES } from '../../looks.js';

// Shared helpers for the horse race and the fencing duel: primitives, mesh baking,
// a cheering crowd in one draw call, nature scatter, HUD overlay and small synth sounds.

// ------------------------------------------------------------------ primitives
const M = (c, o) => (typeof c === 'string' ? mat(c, o) : c);
export const box = (w, h, d, c, o) => mesh(new THREE.BoxGeometry(w, h, d), M(c, o));
export const rbox = (w, h, d, c, r = 0.06, o) => mesh(new RoundedBoxGeometry(w, h, d, 2, r), M(c, o));
export const cyl = (rt, rb, h, c, seg = 14, o) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(c, o));
export const ball = (r, c, o, seg = 14) => mesh(new THREE.SphereGeometry(r, seg, Math.max(8, Math.round(seg * 0.7))), M(c, o));
export const cone = (r, h, c, seg = 10, o) => mesh(new THREE.ConeGeometry(r, h, seg), M(c, o));
export function at(o, x, y, z, ry = 0) {
  o.position.set(x, y, z);
  if (ry) o.rotation.y = ry;
  return o;
}
export const ord = (n) => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');

// A flat painted label (canvas) on a plane. draw(ctx, w, h) paints it.
export function painted(w, h, px, draw, { glow = 0 } = {}) {
  const tex = canvasTexture(Math.round(px * (w / h)), px, draw);
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 });
  if (glow) {
    m.emissive = new THREE.Color('#ffffff');
    m.emissiveMap = tex;
    m.emissiveIntensity = glow;
  }
  return mesh(new THREE.PlaneGeometry(w, h), m, { cast: false });
}

export function bannerDraw(text, { bg = '#ef5b6f', fg = '#ffffff', sub = '', subFg = '#ffe6ee', border = '#ffffff' } = {}) {
  return (ctx, w, h) => {
    ctx.fillStyle = bg;
    roundRect(ctx, 0, 0, w, h, h * 0.22);
    ctx.fill();
    ctx.lineWidth = h * 0.06;
    ctx.strokeStyle = border;
    roundRect(ctx, h * 0.07, h * 0.07, w - h * 0.14, h - h * 0.14, h * 0.17);
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${h * (sub ? 0.42 : 0.52)}px ${FONT}`;
    ctx.fillText(text, w / 2, h * (sub ? 0.4 : 0.53));
    if (sub) {
      ctx.fillStyle = subFg;
      ctx.font = `600 ${h * 0.2}px ${FONT}`;
      ctx.fillText(sub, w / 2, h * 0.76);
    }
  };
}

// ------------------------------------------------------------------ baking
// Merge every static mesh under `root` into a few vertex-coloured meshes (one per
// shading kind). Meshes with textures, transparency or a glow stay as they are.
// keep: objects (and their subtrees) to leave alone. emissive: 'keep' | 'bake'.
const bakedMats = new Map();
function bakedMat(flat, side, rough, metal) {
  const key = `${flat}|${side}|${rough}|${metal}`;
  if (!bakedMats.has(key)) bakedMats.set(key, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: flat, side, roughness: rough, metalness: metal }));
  return bakedMats.get(key);
}

function eligible(o, skip, emissive) {
  if (!o.isMesh || o.isInstancedMesh || skip.has(o) || !o.visible) return false;
  const m = o.material;
  if (Array.isArray(m) || m.map || m.alphaTest > 0 || m.vertexColors) return false;
  if (m.transparent && !o.userData.bakeColor) return false;
  if (emissive === 'keep' && m.emissive && m.emissiveIntensity * Math.max(m.emissive.r, m.emissive.g, m.emissive.b) > 0.2) return false;
  return true;
}

// Textured static meshes that share one material can still merge, keeping their uvs.
function sameMatOk(o, skip) {
  if (!o.isMesh || o.isInstancedMesh || skip.has(o) || !o.visible) return false;
  const m = o.material;
  return !Array.isArray(m) && !!m.map && !m.transparent && !m.vertexColors && !!o.geometry.attributes.uv;
}

function prep(o, rel, color) {
  let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
  const keepUv = color === null;
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && !(keepUv && name === 'uv')) g.deleteAttribute(name);
  if (!g.attributes.normal) g.computeVertexNormals();
  g.morphAttributes = {};
  g.clearGroups();
  g.applyMatrix4(rel);
  const pos = g.attributes.position;
  const n = pos.count;
  if (rel.determinant() < 0) {
    // Mirrored: flip the winding so faces stay front-facing
    const nor = g.attributes.normal;
    const uv = g.attributes.uv;
    for (let i = 0; i < n; i += 3) {
      for (const a of [pos, nor]) {
        const x = a.getX(i + 1), y = a.getY(i + 1), z = a.getZ(i + 1);
        a.setXYZ(i + 1, a.getX(i + 2), a.getY(i + 2), a.getZ(i + 2));
        a.setXYZ(i + 2, x, y, z);
      }
      if (uv) {
        const u = uv.getX(i + 1), v = uv.getY(i + 1);
        uv.setXY(i + 1, uv.getX(i + 2), uv.getY(i + 2));
        uv.setXY(i + 2, u, v);
      }
    }
  }
  if (keepUv) return g;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = color.r;
    arr[i * 3 + 1] = color.g;
    arr[i * 3 + 2] = color.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function colorOf(o, out) {
  const m = o.material;
  if (o.userData.bakeColor) return out.set(o.userData.bakeColor);
  out.copy(m.color);
  if (m.emissive && m.emissiveIntensity) {
    out.r = Math.min(1, out.r + m.emissive.r * m.emissiveIntensity * 0.5);
    out.g = Math.min(1, out.g + m.emissive.g * m.emissiveIntensity * 0.5);
    out.b = Math.min(1, out.b + m.emissive.b * m.emissiveIntensity * 0.5);
  }
  return out;
}

// coarse: one roughness for everything; oneCast: ignore shadow flags (all parts cast and receive).
export function bakeVC(root, keep = [], { emissive = 'keep', coarse = false, oneCast = false } = {}) {
  root.updateMatrixWorld(true);
  const skip = new Set();
  for (const k of keep) k?.traverse((o) => skip.add(o));
  const ok = new Set();
  const textured = new Set();
  root.traverse((o) => o !== root && (eligible(o, skip, emissive) ? ok.add(o) : sameMatOk(o, skip) && textured.add(o)));
  // A mesh with children that are not baked must stay, or removing it would drop them
  const gone = (c) => ok.has(c) || textured.has(c);
  for (let again = true; again; ) {
    again = false;
    for (const set of [ok, textured]) {
      for (const o of [...set]) {
        let fine = true;
        o.traverse((c) => {
          if (c !== o && !gone(c)) fine = false;
        });
        if (!fine) {
          set.delete(o);
          again = true;
        }
      }
    }
  }
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const col = new THREE.Color();
  const buckets = new Map();
  for (const o of ok) {
    const m = o.material;
    const rough = coarse ? 0.6 : Math.round((m.roughness ?? 0.8) * 5) / 5;
    const metal = (m.metalness ?? 0) > 0.3 ? 0.5 : 0;
    const flat = !!m.flatShading;
    const side = m.side;
    const cast = oneCast || o.castShadow;
    const receive = oneCast || o.receiveShadow;
    const key = `${flat}|${side}|${rough}|${metal}|${cast}|${receive}`;
    if (!buckets.has(key)) buckets.set(key, { mat: bakedMat(flat, side, rough, metal), cast, receive, list: [] });
    rel.multiplyMatrices(inv, o.matrixWorld);
    buckets.get(key).list.push(prep(o, rel, colorOf(o, col)));
  }
  const texBuckets = new Map();
  for (const o of textured) {
    const key = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}`;
    if (!texBuckets.has(key)) texBuckets.set(key, { mat: o.material, cast: o.castShadow, receive: o.receiveShadow, list: [] });
    rel.multiplyMatrices(inv, o.matrixWorld);
    texBuckets.get(key).list.push(prep(o, rel, null));
  }
  for (const o of ok) o.removeFromParent();
  for (const o of textured) o.removeFromParent();
  const out = [];
  for (const b of texBuckets.values()) {
    // a lone textured mesh still moves into root, already baked to its place
    const g = mergeGeometries(b.list, false);
    for (const x of b.list) x.dispose();
    if (!g) continue;
    const m = new THREE.Mesh(g, b.mat);
    m.castShadow = b.cast;
    m.receiveShadow = b.receive;
    root.add(m);
    out.push(m);
  }
  for (const b of buckets.values()) {
    const g = mergeGeometries(b.list, false);
    for (const x of b.list) x.dispose();
    if (!g) continue;
    const m = new THREE.Mesh(g, b.mat);
    m.castShadow = b.cast;
    m.receiveShadow = b.receive;
    root.add(m);
    out.push(m);
  }
  return out;
}

// Cheeks are see-through circles; give them their blended colour so they can be baked.
function markCheeks(kid) {
  const skin = new THREE.Color(kid.look.skin);
  kid.root.traverse((o) => {
    if (o.isMesh && o !== kid.blob && o.material.isMeshBasicMaterial && o.material.transparent) {
      o.userData.bakeColor = skin.clone().lerp(o.material.color, o.material.opacity * 0.8);
    }
  });
}

// Turn a posed kid into one or two static meshes (for riders and people in the background).
export function bakeKid(kid, detail = 0.6) {
  kid.blob.removeFromParent();
  lowpoly(kid.root, detail);
  markCheeks(kid);
  bakeVC(kid.root, [], { emissive: 'bake', coarse: true, oneCast: true });
  return kid.root;
}

// Flatten the pony so it costs one draw call per moving part.
export function bakePony(pony) {
  const parts = [...pony.legs, pony.head, pony.tail];
  const o = { coarse: true };
  bakeVC(pony.root, parts, o);
  for (const p of parts) bakeVC(p, [], o);
  return pony;
}

// Merge a live kid's meshes per moving part (body, torso, head, each limb, eye and hair tail),
// so Kid.update still animates it but it costs far fewer draw calls. keep: attachments to leave alone.
export function bakeLiveKid(kid, keep = []) {
  markCheeks(kid);
  const o = { emissive: 'bake', coarse: true };
  const tails = kid.tails.map((t) => t.pivot);
  const parts = [...kid.legs, ...kid.arms, ...kid.eyes, ...tails];
  // the torso breathes (its scale animates), so it stays its own mesh
  bakeVC(kid.body, [kid.head, kid.carryAnchor, kid.torso, ...parts, ...keep], o);
  bakeVC(kid.head, [...kid.eyes, ...tails, ...keep], o);
  for (const p of parts) bakeVC(p, keep, o);
  return kid;
}

// Rebuild a background kid's curved parts with fewer segments (they are seen from afar).
export function lowpoly(root, k = 0.4) {
  const seg = (n, min) => Math.max(min, Math.round(n * k));
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry.parameters) return;
    const p = o.geometry.parameters;
    let g = null;
    switch (o.geometry.type) {
      case 'SphereGeometry':
        g = new THREE.SphereGeometry(p.radius, seg(p.widthSegments, 8), seg(p.heightSegments, 5), p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
        break;
      case 'CapsuleGeometry':
        g = new THREE.CapsuleGeometry(p.radius, p.height, 2, seg(p.radialSegments, 6));
        break;
      case 'CylinderGeometry':
        g = new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, seg(p.radialSegments, 6), 1, p.openEnded, p.thetaStart, p.thetaLength);
        break;
      case 'TorusGeometry':
        g = new THREE.TorusGeometry(p.radius, p.tube, seg(p.radialSegments, 4), seg(p.tubularSegments, 8), p.arc);
        break;
      case 'LatheGeometry':
        g = new THREE.LatheGeometry(p.points, seg(p.segments, 10), p.phiStart, p.phiLength);
        break;
      case 'CircleGeometry':
        g = new THREE.CircleGeometry(p.radius, seg(p.segments, 8), p.thetaStart, p.thetaLength);
        break;
    }
    if (g) o.geometry = g;
  });
  return root;
}

// ------------------------------------------------------------------ crowd
// Many posed kids merged into one mesh. They hop and sway in the vertex shader.
// list: [{ kid }] already placed in world space (kid.root not parented).
export function makeCrowd(list) {
  const geos = [];
  const col = new THREE.Color();
  const r = rng(7);
  for (const { kid } of list) {
    kid.blob.removeFromParent();
    markCheeks(kid);
    lowpoly(kid.root, 0.3);
    kid.root.updateMatrixWorld(true);
    const base = kid.root.position;
    const phase = r() * 40;
    kid.root.traverse((o) => {
      if (!eligible(o, new Set(), 'bake')) return;
      const g = prep(o, o.matrixWorld, colorOf(o, col));
      const n = g.attributes.position.count;
      const b = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        b[i * 4] = base.x;
        b[i * 4 + 1] = base.y;
        b[i * 4 + 2] = base.z;
        b[i * 4 + 3] = phase;
      }
      g.setAttribute('aBase', new THREE.BufferAttribute(b, 4));
      geos.push(g);
    });
  }
  const geo = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  const uniforms = { uTime: { value: 0 }, uHop: { value: 0.06 } };
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide });
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aBase;\nuniform float uTime;\nuniform float uHop;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float cyc = uTime * (5.5 + fract(aBase.w * 0.37) * 3.0) + aBase.w;
        vec3 rel = transformed - aBase.xyz;
        transformed.x += rel.y * sin(uTime * 2.1 + aBase.w) * 0.09;
        transformed.y += abs(sin(cyc)) * uHop;`,
      );
  };
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  geo.computeBoundingSphere();
  geo.boundingSphere.radius += 1;
  let hype = 0;
  return {
    mesh: m,
    cheer(k = 1) {
      hype = Math.max(hype, k);
    },
    update(dt, t) {
      hype = Math.max(0, hype - dt * 0.35);
      uniforms.uTime.value = t;
      uniforms.uHop.value = 0.05 + hype * 0.28;
    },
  };
}

// A random spectator look (never Roji or Homama).
export function randomLook(r, i) {
  const girl = i % 2 === 0;
  const pick = (a) => a[Math.floor(r() * a.length)];
  const hairs = ['#141010', '#2a1a13', '#4a2c1a', '#7a4a26', '#b5773d', '#e3c07a', '#c94f3b'];
  const outfits = girl ? ['dress', 'skirt', 'overalls', 'tee-pants'] : ['tee-shorts', 'tee-pants', 'hoodie', 'overalls'];
  const top = pick(PALETTE.clothes.filter((c) => c !== '#3b2b3f'));
  return {
    id: 'fan' + i,
    name: 'Fan',
    gender: girl ? 'girl' : 'boy',
    skin: pick(PALETTE.skin),
    hair: pick(hairs),
    hairstyle: pick(HAIRSTYLES[girl ? 'girl' : 'boy']),
    outfit: pick(outfits),
    top,
    bottom: pick(['#2c3e66', '#3f7bf0', '#ffffff', '#7fd3a7', top, '#a0602e']),
    shoes: pick(PALETTE.shoes),
    accent: pick(['#ff7fa3', '#ffd166', '#7fd3a7', '#c7a6ff', '#6fb8ff']),
  };
}

// Pose a background kid: 'cheer' | 'wave' | 'clap' | 'flag' | 'sit'.
export function poseFan(kid, kind, flagColor = '#ffd166') {
  kid.update(0.016, 0, 0, 0, 0);
  const [L, R] = kid.arms;
  if (kind === 'cheer') {
    L.rotation.set(-0.2, 0, 2.5);
    R.rotation.set(-0.2, 0, -2.5);
  } else if (kind === 'wave') {
    R.rotation.set(0, 0, -2.6);
    L.rotation.set(0, 0, 0.25);
  } else if (kind === 'clap') {
    L.rotation.set(-1.3, 0, -0.35);
    R.rotation.set(-1.3, 0, 0.35);
  } else if (kind === 'flag') {
    R.rotation.set(-0.3, 0, -2.7);
    const stick = cyl(0.012, 0.012, 0.5, '#fffaf4', 5);
    stick.position.set(0, -0.5, 0);
    const f = box(0.26, 0.17, 0.01, flagColor);
    f.position.set(0, -0.62, 0.13);
    f.rotation.y = Math.PI / 2;
    R.add(stick, f);
  }
  kid.head.rotation.set(-0.12, 0, 0);
  return kid;
}

// ------------------------------------------------------------------ nature
const GREENS = ['#6dbb58', '#5aa84f', '#84c95f', '#77c05a'];
const PINKS = ['#f6a5c0', '#f9bfd2', '#f28db0'];
const FLOWERS = ['#ff8fb1', '#ffffff', '#ffd75e', '#c7a6ff', '#ff6b6b', '#ffb36b'];

// Trees, bushes, flowers, grass tufts and rocks in the town's style, all instanced.
// free(x, z, kind) -> true where something may grow. bounds: [x0, x1, z0, z1].
export function scatterNature(group, { seed = 3, bounds, free, trees = 60, bushes = 40, flowers = 500, tufts = 700, rocks = 20 }) {
  const r = rng(seed);
  const [x0, x1, z0, z1] = bounds;
  const rp = () => [x0 + r() * (x1 - x0), z0 + r() * (z1 - z0)];
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const e = new THREE.Euler();
  const add = (im, cast = true) => {
    im.castShadow = cast;
    im.receiveShadow = true;
    group.add(im);
    return im;
  };
  const T = [];
  for (let i = 0; i < trees * 40 && T.length < trees; i++) {
    const [x, z] = rp();
    if (!free(x, z, 'tree') || T.some((t) => Math.hypot(t.x - x, t.z - z) < 2.6)) continue;
    const roll = r();
    T.push({ x, z, s: 0.9 + r() * 0.7, kind: roll < 0.5 ? 'round' : roll < 0.82 ? 'pine' : 'blossom', rot: r() * 6.28 });
  }
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.3, 7);
  trunkGeo.translate(0, 0.65, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, mat('#8b5e3c', { rough: 0.9 }), Math.max(1, T.length));
  const balls = [];
  const cones = [];
  T.forEach((t, i) => {
    m4.compose(v.set(t.x, 0, t.z), q.setFromEuler(e.set(0, t.rot, 0)), s.set(t.s, t.s, t.s));
    trunks.setMatrixAt(i, m4);
    if (t.kind === 'pine') {
      for (let k = 0; k < 3; k++) cones.push({ x: t.x, y: (1.3 + k * 0.62) * t.s, z: t.z, sc: (0.95 - k * 0.22) * t.s, col: k === 2 ? '#4d9a5f' : '#3f8a55' });
    } else {
      const pal = t.kind === 'blossom' ? PINKS : GREENS;
      const c = pal[Math.floor(r() * pal.length)];
      balls.push({ x: t.x, y: 1.85 * t.s, z: t.z, sc: 0.92 * t.s, c });
      balls.push({ x: t.x + 0.5 * t.s, y: 1.55 * t.s, z: t.z + 0.25 * t.s, sc: 0.6 * t.s, c });
      balls.push({ x: t.x - 0.45 * t.s, y: 1.6 * t.s, z: t.z - 0.2 * t.s, sc: 0.62 * t.s, c });
    }
  });
  add(trunks);
  const ballGeo = new THREE.IcosahedronGeometry(1, 2);
  const B = [];
  for (let i = 0; i < bushes * 40 && B.length < bushes; i++) {
    const [x, z] = rp();
    if (free(x, z, 'bush')) B.push({ x, z, s: 0.4 + r() * 0.35 });
  }
  const leafIM = new THREE.InstancedMesh(ballGeo, mat('#ffffff', { rough: 0.85, flat: true }), Math.max(1, balls.length));
  balls.forEach((b, i) => {
    m4.compose(v.set(b.x, b.y, b.z), q.setFromEuler(e.set(r(), r(), r())), s.set(b.sc, b.sc * 0.92, b.sc));
    leafIM.setMatrixAt(i, m4);
    leafIM.setColorAt(i, new THREE.Color(b.c));
  });
  add(leafIM);
  const bushIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat('#ffffff', { rough: 0.85, flat: true }), Math.max(1, B.length * 2));
  B.forEach((b, i) => {
    const c = new THREE.Color(GREENS[i % GREENS.length]);
    m4.compose(v.set(b.x, b.s * 0.55, b.z), q.identity(), s.set(b.s, b.s * 0.8, b.s));
    bushIM.setMatrixAt(i * 2, m4);
    bushIM.setColorAt(i * 2, c);
    m4.compose(v.set(b.x + b.s * 0.7, b.s * 0.4, b.z + b.s * 0.2), q.identity(), s.set(b.s * 0.7, b.s * 0.6, b.s * 0.7));
    bushIM.setMatrixAt(i * 2 + 1, m4);
    bushIM.setColorAt(i * 2 + 1, c);
  });
  add(bushIM);
  if (cones.length) {
    const coneIM = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1.4, 8), mat('#ffffff', { rough: 0.85, flat: true }), cones.length);
    cones.forEach((c, i) => {
      m4.compose(v.set(c.x, c.y, c.z), q.identity(), s.set(c.sc, c.sc, c.sc));
      coneIM.setMatrixAt(i, m4);
      coneIM.setColorAt(i, new THREE.Color(c.col));
    });
    add(coneIM);
  }
  // Flowers in soft clusters
  const F = [];
  for (let i = 0; i < flowers * 12 && F.length < flowers; i++) {
    const [x, z] = rp();
    if (!free(x, z, 'flower')) continue;
    const cluster = Math.sin(x * 0.35) * Math.cos(z * 0.4) + Math.sin(x * 0.11 + z * 0.17);
    if (cluster < 0.2 && r() > 0.25) continue;
    F.push({ x, z, c: FLOWERS[Math.floor(r() * FLOWERS.length)], h: 0.16 + r() * 0.16 });
  }
  addFlowers(group, F);
  // Grass tufts
  const G = [];
  for (let i = 0; i < tufts * 8 && G.length < tufts; i++) {
    const [x, z] = rp();
    if (free(x, z, 'tuft')) G.push([x, z]);
  }
  const tuftGeo = new THREE.ConeGeometry(0.05, 0.36, 4);
  tuftGeo.translate(0, 0.18, 0);
  const tuftIM = new THREE.InstancedMesh(tuftGeo, mat('#ffffff', { rough: 1 }), Math.max(1, G.length * 3));
  let n = 0;
  for (const [x, z] of G) {
    for (let k = 0; k < 3; k++) {
      m4.compose(v.set(x + (r() - 0.5) * 0.18, 0, z + (r() - 0.5) * 0.18), q.setFromEuler(e.set((r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5)), s.setScalar(0.7 + r() * 0.6));
      tuftIM.setMatrixAt(n, m4);
      tuftIM.setColorAt(n++, new THREE.Color(r() < 0.5 ? '#6fb04f' : '#88c560'));
    }
  }
  add(tuftIM, false);
  // Rocks
  const R = [];
  for (let i = 0; i < rocks * 40 && R.length < rocks; i++) {
    const [x, z] = rp();
    if (free(x, z, 'rock')) R.push({ x, z, s: 0.3 + r() * 0.6 });
  }
  if (R.length) {
    const rockIM = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.5, 0), mat('#ffffff', { rough: 0.9, flat: true }), R.length);
    R.forEach((k, i) => {
      m4.compose(v.set(k.x, k.s * 0.22, k.z), q.setFromEuler(e.set(r(), r(), r())), s.set(k.s, k.s * 0.65, k.s));
      rockIM.setMatrixAt(i, m4);
      rockIM.setColorAt(i, new THREE.Color(r() < 0.5 ? '#c9c2b3' : '#b5ae9f'));
    });
    add(rockIM);
  }
  return T;
}

// Instanced flowers: [{ x, z, c, h }]
export function addFlowers(group, F) {
  if (!F.length) return;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const headGeo = new THREE.IcosahedronGeometry(0.09, 0);
  const stemGeo = new THREE.CylinderGeometry(0.012, 0.015, 1, 4);
  stemGeo.translate(0, 0.5, 0);
  const heads = new THREE.InstancedMesh(headGeo, mat('#ffffff', { rough: 0.6, flat: true }), F.length);
  const stems = new THREE.InstancedMesh(stemGeo, mat('#4f9a45'), F.length);
  F.forEach((f, i) => {
    m4.compose(v.set(f.x, f.h, f.z), q.identity(), s.set(1, 0.75, 1));
    heads.setMatrixAt(i, m4);
    heads.setColorAt(i, new THREE.Color(f.c));
    m4.compose(v.set(f.x, 0, f.z), q.identity(), s.set(1, f.h, 1));
    stems.setMatrixAt(i, m4);
  });
  heads.castShadow = stems.castShadow = false;
  group.add(heads, stems);
}

// Puffy clouds and soft distant hills.
export function sky(group, { seed = 5, radius = 160, count = 14, hills = true, center = [0, 0] } = {}) {
  const r = rng(seed);
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const cm = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.3, flatShading: true });
  const parts = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + r() * 0.4;
    const d = radius * (0.45 + r() * 0.55);
    const cx = center[0] + Math.cos(a) * d;
    const cz = center[1] + Math.sin(a) * d;
    const cy = 22 + r() * 18;
    const k = 4 + Math.floor(r() * 3);
    for (let j = 0; j < k; j++) {
      const sc = 2 + r() * 2.6;
      parts.push([cx + (j - k / 2) * 3 + r() * 2, cy + r() * 1.6, cz + (r() - 0.5) * 3, sc]);
    }
  }
  const im = new THREE.InstancedMesh(geo, cm, parts.length);
  const m4 = new THREE.Matrix4();
  parts.forEach(([x, y, z, sc], i) => im.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sc * 1.2, sc * 0.75, sc))));
  group.add(im);
  if (hills) {
    const hg = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const cols = ['#8fca6a', '#7fbf63', '#a3d579', '#86c46a'];
    const n = 18;
    const him = new THREE.InstancedMesh(hg, mat('#ffffff', { rough: 1 }), n);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.2;
      const d = radius * 1.05 + r() * 40;
      const w = 30 + r() * 35;
      him.setMatrixAt(i, m4.compose(new THREE.Vector3(center[0] + Math.cos(a) * d, -2, center[1] + Math.sin(a) * d), new THREE.Quaternion(), new THREE.Vector3(w, 10 + r() * 14, w * 0.8)));
      him.setColorAt(i, new THREE.Color(cols[i % cols.length]));
    }
    him.receiveShadow = true;
    group.add(him);
  }
}

// String of little triangle flags between a and b (Vector3), sagging in the middle.
export function bunting(group, a, b, { n = 12, sag = 0.4, size = 0.32, colors = ['#ef5b6f', '#ffd166', '#7fd3a7', '#6fb8ff', '#ff9eb5', '#fffaf4'] } = {}) {
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-size / 2, 0, 0, size / 2, 0, 0, 0, -size * 1.15, 0], 3));
  tri.computeVertexNormals();
  const dir = new THREE.Vector3().subVectors(b, a);
  const yaw = Math.atan2(dir.x, dir.z) - Math.PI / 2;
  const pt = (k) => new THREE.Vector3().lerpVectors(a, b, k).add(new THREE.Vector3(0, -Math.sin(k * Math.PI) * sag, 0));
  const pts = [];
  for (let i = 0; i <= 16; i++) pts.push(pt(i / 16));
  const line = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.015, 4), mat('#fffaf4'), { cast: false });
  group.add(line);
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n;
    const f = mesh(tri, mat(colors[i % colors.length], { side: THREE.DoubleSide }), { cast: false });
    f.position.copy(pt(k));
    f.rotation.y = yaw;
    group.add(f);
  }
}

// ------------------------------------------------------------------ HUD overlay
// A layer above the arena HUD for bars, pop words and a mini map. remove() on dispose.
export function overlay(css, html) {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  const el = document.createElement('div');
  el.className = 'rr-layer';
  el.innerHTML = html;
  (document.getElementById('arena') || document.body).appendChild(el);
  return {
    el,
    $: (s) => el.querySelector(s),
    remove() {
      el.remove();
      style.remove();
    },
  };
}

export const BASE_CSS = `
.rr-layer { position: absolute; inset: 0; pointer-events: none; font-family: var(--font, 'Fredoka', system-ui, sans-serif); color: #3b2b3f; }
.rr-pop { position: absolute; left: 50%; top: 24%; transform: translate(-50%, -50%) scale(.6); font-weight: 700; font-size: clamp(1.2rem, 3.6vw, 2rem); color: #fff; text-shadow: 0 3px 0 rgba(0,0,0,.16), 0 8px 20px rgba(0,0,0,.22); opacity: 0; transition: opacity .18s, transform .25s cubic-bezier(.2,1.5,.4,1); white-space: nowrap; }
.rr-pop.on { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.rr-chip { position: absolute; transform: translate(-50%, -100%); background: #fffaf4; color: #3b2b3f; border-radius: 999px; padding: 3px 10px; font-weight: 700; font-size: .85rem; box-shadow: 0 4px 12px rgba(60,30,40,.2); white-space: nowrap; opacity: 0; transition: opacity .15s; }
.rr-chip.on { opacity: 1; }
#arena .a-btn.rr-hot { animation: rr-hot .45s ease-in-out infinite alternate; }
@keyframes rr-hot { from { box-shadow: 0 0 0 0 rgba(255,209,102,.9), 0 6px 18px rgba(60,30,40,.2); } to { box-shadow: 0 0 0 10px rgba(255,209,102,.0), 0 6px 18px rgba(60,30,40,.2); transform: scale(1.08); } }
`;

export function popper(el) {
  let timer = 0;
  return (html, color = '#fff', ms = 900) => {
    el.innerHTML = html;
    el.style.color = color;
    el.classList.remove('on');
    void el.offsetWidth;
    el.classList.add('on');
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('on'), ms);
  };
}

// Make one of the host's touch buttons pulse.
export function hotButton(id, on) {
  document.querySelector(`#arena .a-btn[data-b="${id}"]`)?.classList.toggle('rr-hot', !!on);
}

// ------------------------------------------------------------------ sounds
function noiseHit(sound, { freq = 900, q = 1.2, gain = 0.1, dur = 0.08, type = 'bandpass', when = 0 } = {}) {
  const ctx = sound?.ctx;
  if (!ctx || sound.muted || !sound.noise) return;
  const src = ctx.createBufferSource();
  src.buffer = sound.noise;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  const t = ctx.currentTime + when;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.02, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(sound.sfx);
  src.start(t, Math.random() * 0.3, dur + 0.05);
}

export const sfx = {
  hoof(sound, gain = 0.05) {
    if (!sound?.ctx || sound.muted) return;
    sound.tone(150 + Math.random() * 30, sound.ctx.currentTime, 0.07, { slideTo: 80, gain });
    noiseHit(sound, { freq: 1400, gain: gain * 0.9, dur: 0.05 });
  },
  cheer(sound, gain = 0.06, dur = 1.4) {
    noiseHit(sound, { freq: 1100, q: 0.6, gain, dur });
    noiseHit(sound, { freq: 2300, q: 0.9, gain: gain * 0.6, dur: dur * 0.8, when: 0.1 });
    if (!sound?.ctx || sound.muted) return;
    const t = sound.ctx.currentTime;
    for (let i = 0; i < 4; i++) sound.tone(500 + Math.random() * 500, t + Math.random() * 0.5, 0.3, { slideTo: 900 + Math.random() * 500, gain: 0.012, type: 'triangle' });
  },
  splash(sound) {
    noiseHit(sound, { freq: 700, q: 0.5, gain: 0.16, dur: 0.4, type: 'lowpass' });
    noiseHit(sound, { freq: 2500, q: 0.8, gain: 0.05, dur: 0.25, when: 0.05 });
  },
  knock(sound) {
    if (!sound?.ctx || sound.muted) return;
    const t = sound.ctx.currentTime;
    sound.tone(260, t, 0.12, { type: 'square', gain: 0.04, slideTo: 140 });
    sound.tone(200, t + 0.09, 0.14, { type: 'square', gain: 0.035, slideTo: 110 });
  },
  clash(sound, gain = 0.05) {
    if (!sound?.ctx || sound.muted) return;
    const t = sound.ctx.currentTime;
    sound.tone(2400 + Math.random() * 300, t, 0.18, { type: 'triangle', gain });
    sound.tone(3300 + Math.random() * 300, t + 0.01, 0.12, { type: 'sine', gain: gain * 0.6 });
    noiseHit(sound, { freq: 5000, gain: gain * 0.6, dur: 0.05 });
  },
  stomp(sound) {
    if (!sound?.ctx || sound.muted) return;
    sound.tone(120, sound.ctx.currentTime, 0.09, { slideTo: 70, gain: 0.12 });
  },
  buzzer(sound, high = true) {
    if (!sound?.ctx || sound.muted) return;
    const t = sound.ctx.currentTime;
    sound.tone(high ? 880 : 660, t, 0.35, { type: 'square', gain: 0.03 });
    sound.tone(high ? 1320 : 990, t, 0.35, { type: 'sine', gain: 0.03 });
  },
  whistle(sound) {
    if (!sound?.ctx || sound.muted) return;
    const t = sound.ctx.currentTime;
    sound.tone(2100, t, 0.18, { gain: 0.05, slideTo: 2300 });
    sound.tone(2300, t + 0.2, 0.35, { gain: 0.05, slideTo: 2150 });
  },
};
