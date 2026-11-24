import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Draw a character built from many meshes as one skinned mesh. Every original mesh becomes a bone,
// so the normal Kid animation (pivots, squash, poses) keeps moving its vertices. Transparent parts stay.

const _rel = new THREE.Matrix4();

function prep(o, inv) {
  const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
  for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n);
  g.morphAttributes = {};
  g.clearGroups();
  if (!g.attributes.normal) g.computeVertexNormals();
  _rel.multiplyMatrices(inv, o.matrixWorld);
  g.applyMatrix4(_rel);
  if (_rel.determinant() < 0) {
    for (const a of Object.values(g.attributes)) {
      const s = a.itemSize;
      for (let i = 0; i < a.count; i += 3) for (let k = 0; k < s; k++) {
        const t = a.array[(i + 1) * s + k];
        a.array[(i + 1) * s + k] = a.array[(i + 2) * s + k];
        a.array[(i + 2) * s + k] = t;
      }
    }
  }
  return g;
}

export function skinify(holder, rough = 0.6) {
  holder.updateMatrixWorld(true);
  const inv = holder.matrixWorld.clone().invert();
  const bones = [];
  const list = [];
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
    const col = new Float32Array(n * 3);
    const c = o.material.color;
    for (let i = 0; i < n; i++) {
      si[i * 4] = bi;
      sw[i * 4] = 1;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    list.push(g);
    o.visible = false;
  }
  const sk = new THREE.SkinnedMesh(mergeGeometries(list, false), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough }));
  sk.castShadow = true;
  sk.receiveShadow = true;
  sk.frustumCulled = false;
  holder.add(sk);
  sk.bind(new THREE.Skeleton(bones));
  return sk;
}
