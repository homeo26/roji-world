import * as K from './kit.js';

// Like kit.colorBake, with fewer buckets (plain or brass, casting a shadow or not; every mesh receives shadows), so
// each room of the big YumYum costs only a few draw calls. keep: objects (and their children) to leave alone.

const { THREE, mergeGeometries } = K;
const mats = new Map();

export function bakeZone(group, keep = []) {
  group.updateMatrixWorld(true);
  const skip = new Set();
  for (const d of keep) d?.traverse((o) => skip.add(o));
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const buckets = new Map();
  const victims = [];
  const shown = (o) => {
    for (let p = o; p && p !== group; p = p.parent) if (!p.visible) return false;
    return true;
  };
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || skip.has(o) || o.children.length) return;
    const m = o.material;
    if (Array.isArray(m) || !m.isMeshStandardMaterial || m.map || m.transparent || m.vertexColors || m.side !== THREE.FrontSide) return;
    if (m.emissiveIntensity > 0 && m.emissive.r + m.emissive.g + m.emissive.b > 0) return;
    if (!shown(o)) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.clearGroups();
    g.morphAttributes = {};
    rel.multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(rel);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([m.color.r, m.color.g, m.color.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const metal = m.metalness > 0.3 ? 0.55 : 0;
    const rough = metal ? 0.35 : 0.72;
    const key = `${rough}|${metal}|${o.castShadow ? 1 : 0}`;
    if (!buckets.has(key)) buckets.set(key, { rough, metal, cast: o.castShadow, list: [] });
    buckets.get(key).list.push(g);
    victims.push(o);
  });
  for (const o of victims) o.removeFromParent();
  for (const b of buckets.values()) {
    const geo = mergeGeometries(b.list, false);
    if (!geo) continue;
    const mk = `${b.rough}|${b.metal}`;
    if (!mats.has(mk)) mats.set(mk, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: b.rough, metalness: b.metal }));
    const me = new THREE.Mesh(geo, mats.get(mk));
    me.castShadow = b.cast;
    me.receiveShadow = true;
    group.add(me);
  }
}
