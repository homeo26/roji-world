import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Kids for the kitchen with few draw calls: every joint keeps moving (legs, arms, head, mouth),
// but the fixed parts of each joint merge into one vertex-coloured mesh plus one per textured material.

const vcMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.64 });

export function bakeKid(kid, { keepEyes = false, keepTails = false, shadow = true } = {}) {
  const joints = new Set([kid.root, kid.body, ...kid.legs, ...kid.arms, kid.head, kid.carryAnchor].filter(Boolean));
  if (keepEyes) for (const e of kid.eyes) joints.add(e);
  if (keepTails) for (const t of kid.tails) joints.add(t.pivot);
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
    // Glowing bits without a texture (eye sparkles) bake in too, their glow added to the colour
    const plain = m.isMeshStandardMaterial && !m.map && !m.transparent && !m.vertexColors;
    const key = plain ? 'vc' : m.isMeshBasicMaterial ? `basic${m.color.getHex()}${m.opacity}${m.transparent}` : m.uuid;
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
      // Only the big plain parts cast shadows: eyes, cheeks and textured bits do not
      me.castShadow = shadow && b.material === vcMat && !kid.eyes.includes(j);
      me.receiveShadow = true;
      j.add(me);
    }
  }
  if (!shadow) kid.mouth.castShadow = false;
  return kid;
}

export const headPos = (kid, out = new THREE.Vector3()) => kid.head.localToWorld(out.set(0, 0.62, 0));

// Walk an actor along a path of points at a speed. Returns true when the path is done.
export function walk(a, dt, speed, dampAngle) {
  const p = a.kid.root.position;
  const w = a.path[0];
  a.speed = 0;
  if (!w) return true;
  const dx = w.x - p.x;
  const dz = w.z - p.z;
  const d = Math.hypot(dx, dz);
  const step = speed * dt;
  if (d <= step) {
    p.x = w.x;
    p.z = w.z;
    a.path.shift();
  } else {
    p.x += (dx / d) * step;
    p.z += (dz / d) * step;
    a.yaw = dampAngle(a.yaw, Math.atan2(dx, dz), 12, dt);
  }
  a.speed = speed;
  return a.path.length === 0;
}

// Kids tick in small steps so a slow frame does not skip their animation.
export function animate(kid, dt, t, speed = 0) {
  const n = Math.max(1, Math.ceil(dt / 0.05));
  for (let i = 0; i < n; i++) kid.update(dt / n, t, speed, 0, 0);
}
