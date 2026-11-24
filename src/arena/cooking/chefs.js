import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { dressChef } from '../../interiors/yumyum/kit.js';

// Roji and Homama as chefs: their own saved looks, a white apron and a chef hat. Every joint keeps
// moving, but the fixed parts of each joint merge into one vertex-coloured mesh to save draw calls.

const vcMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.64 });

export function bakeKid(kid) {
  const joints = new Set([kid.root, kid.body, ...kid.legs, ...kid.arms, kid.head, kid.carryAnchor].filter(Boolean));
  for (const e of kid.eyes) joints.add(e);
  for (const t of kid.tails) joints.add(t.pivot);
  const skip = new Set([kid.mouth, kid.blob]);
  const shown = (o) => {
    for (let p = o; p; p = p.parent) if (!p.visible) return false;
    return true;
  };
  kid.root.updateMatrixWorld(true);
  const buckets = new Map();
  const victims = [];
  const inv = new THREE.Matrix4();
  const rel = new THREE.Matrix4();
  kid.root.traverse((o) => {
    if (!o.isMesh || skip.has(o) || joints.has(o) || o.children.length || !shown(o)) return;
    let j = o.parent;
    while (j && !joints.has(j)) j = j.parent;
    if (!j) return;
    const m = o.material;
    if (Array.isArray(m)) return;
    const plain = m.isMeshStandardMaterial && !m.map && !m.transparent && !m.vertexColors;
    const key = plain ? 'vc' : m.uuid;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const n of Object.keys(g.attributes)) if (!(plain ? ['position', 'normal'] : ['position', 'normal', 'uv']).includes(n)) g.deleteAttribute(n);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!plain && !g.attributes.uv) return;
    g.clearGroups();
    g.morphAttributes = {};
    inv.copy(j.matrixWorld).invert();
    rel.multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(rel);
    if (plain) {
      const n = g.attributes.position.count;
      const col = new Float32Array(n * 3);
      const e = m.emissiveIntensity || 0;
      const rgb = [m.color.r + m.emissive.r * e, m.color.g + m.emissive.g * e, m.color.b + m.emissive.b * e].map((v) => Math.min(1, v));
      for (let i = 0; i < n; i++) col.set(rgb, i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    const bk = buckets.get(j) || new Map();
    buckets.set(j, bk);
    if (!bk.has(key)) bk.set(key, { material: plain ? vcMat : m, list: [] });
    bk.get(key).list.push(g);
    victims.push(o);
  });
  for (const o of victims) o.removeFromParent();
  for (const [j, bk] of buckets) {
    for (const b of bk.values()) {
      const geo = mergeGeometries(b.list, false);
      for (const g of b.list) g.dispose();
      if (!geo) continue;
      const me = new THREE.Mesh(geo, b.material);
      me.castShadow = b.material === vcMat && (j === kid.body || j === kid.head || kid.legs.includes(j));
      me.receiveShadow = true;
      j.add(me);
    }
  }
  kid.mouth.castShadow = false;
  return kid;
}

export function makeChef(ctx, who) {
  const kid = ctx.makeKid(who);
  dressChef(kid, { apron: '#ffffff', trim: who === 'roji' ? '#e0607e' : '#3f7bf0' });
  bakeKid(kid);
  return kid;
}
