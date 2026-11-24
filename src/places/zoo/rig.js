import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Draw-call savers for the zoo.
// skinify: an animal built from many small meshes on pivots is drawn as one or two skinned meshes.
//   Every original mesh becomes a bone, so animating the original pivots still moves its vertices.
// bakeColors: static meshes merged into a few vertex-coloured meshes (one per roughness class).

const KEEP = ['position', 'normal', 'uv'];
const rel = new THREE.Matrix4();

function prep(o, inv) {
  const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
  for (const name of Object.keys(g.attributes)) if (!KEEP.includes(name)) g.deleteAttribute(name);
  g.morphAttributes = {};
  g.clearGroups();
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  rel.multiplyMatrices(inv, o.matrixWorld);
  g.applyMatrix4(rel);
  // A mirrored transform flips the winding: swap two corners of every triangle back
  if (rel.determinant() < 0) {
    for (const a of Object.values(g.attributes)) {
      const s = a.itemSize;
      for (let i = 0; i < a.count; i += 3) {
        for (let k = 0; k < s; k++) {
          const t = a.array[(i + 1) * s + k];
          a.array[(i + 1) * s + k] = a.array[(i + 2) * s + k];
          a.array[(i + 2) * s + k] = t;
        }
      }
    }
  }
  return g;
}

function paint(g, color) {
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 3] = color.r;
    a[i * 3 + 1] = color.g;
    a[i * 3 + 2] = color.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
}

// Meshes tagged userData.coat = [repeatU, repeatV] use coatMaterial with tiled UVs; the rest take
// their material colour as vertex colours. Returns the skinned meshes (added to holder).
export function skinify(holder, { coatMaterial = null, rough = 0.62 } = {}) {
  holder.updateMatrixWorld(true);
  const inv = holder.matrixWorld.clone().invert();
  const bones = [];
  const lists = { color: [], coat: [] };
  const found = [];
  holder.traverse((o) => {
    if (o.isMesh && !o.isSkinnedMesh && !Array.isArray(o.material) && !o.material.transparent) found.push(o);
  });
  for (const o of found) {
    const g = prep(o, inv);
    const n = g.attributes.position.count;
    const bi = bones.length;
    bones.push(o);
    const si = new Uint16Array(n * 4);
    const sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      si[i * 4] = bi;
      sw[i * 4] = 1;
    }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    const tile = coatMaterial && o.userData.coat;
    if (tile) {
      const uv = g.attributes.uv;
      for (let i = 0; i < n; i++) uv.setXY(i, uv.getX(i) * tile[0], uv.getY(i) * tile[1]);
      lists.coat.push(g);
    } else {
      paint(g, o.material.color);
      lists.color.push(g);
    }
    o.visible = false;
  }
  const skeleton = new THREE.Skeleton(bones);
  const out = [];
  const make = (list, material) => {
    if (!list.length) return;
    const sk = new THREE.SkinnedMesh(mergeGeometries(list, false), material);
    sk.castShadow = true;
    sk.receiveShadow = true;
    sk.frustumCulled = false;
    holder.add(sk);
    sk.bind(skeleton);
    out.push(sk);
  };
  make(lists.color, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough }));
  make(lists.coat, coatMaterial);
  return out;
}

// Merge the static meshes under `group` into vertex-coloured meshes. Textured meshes merge per texture.
// Returns the merged meshes (already in the group); list them in `dynamic` so nothing re-merges them.
export function bakeColors(group, skip = new Set()) {
  group.updateMatrixWorld(true);
  const inv = group.matrixWorld.clone().invert();
  const buckets = new Map();
  const victims = [];
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || skip.has(o) || o.children.length) return;
    const m = o.material;
    if (Array.isArray(m) || m.transparent) return;
    for (let p = o.parent; p && p !== group; p = p.parent) if (skip.has(p)) return;
    const flags = (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '');
    const key = m.map
      ? `map${m.uuid}${flags}`
      : `${m.roughness?.toFixed(2)}|${m.metalness?.toFixed(1)}|${m.flatShading}|${m.emissive?.getHexString()}|${m.emissiveIntensity}|${m.side}|${flags}`;
    if (!buckets.has(key)) buckets.set(key, { m, cast: o.castShadow, receive: o.receiveShadow, list: [] });
    const g = prep(o, inv);
    if (!m.map) paint(g, m.color);
    buckets.get(key).list.push(g);
    victims.push(o);
  });
  for (const o of victims) o.removeFromParent();
  const out = [];
  for (const b of buckets.values()) {
    const m = b.m;
    const material = m.map
      ? m
      : new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: m.roughness ?? 0.8,
          metalness: m.metalness ?? 0,
          flatShading: m.flatShading,
          emissive: m.emissive ?? 0x000000,
          emissiveIntensity: m.emissiveIntensity ?? 1,
          side: m.side,
        });
    const merged = new THREE.Mesh(mergeGeometries(b.list, false), material);
    merged.castShadow = b.cast;
    merged.receiveShadow = b.receive;
    group.add(merged);
    out.push(merged);
  }
  return out;
}
