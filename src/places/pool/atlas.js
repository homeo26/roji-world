import * as THREE from 'three';

// One canvas holds every flat colour (a small swatch each) and every painted texture of the pool's
// static props, so the whole place bakes into a handful of draw calls. atlasify(root) rewrites the
// UVs and materials of the meshes under root: solid colours point at their swatch, painted
// canvases are copied into the atlas and their UVs remapped.

const S = 1024;
const SW = 8; // swatch size in pixels

export function makeAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  const swatches = new Map();
  const regions = new Map();
  let sx = 0;
  let sy = 0; // swatch cursor (top rows)
  const SWATCH_ROWS = 4;
  let rx = 0;
  let ry = SWATCH_ROWS * SW + 4; // region shelf cursor
  let shelfH = 0;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const base = { map: tex };
  const mats = {
    matte: new THREE.MeshStandardMaterial({ ...base, roughness: 0.75 }),
    shiny: new THREE.MeshStandardMaterial({ ...base, roughness: 0.3, metalness: 0.25 }),
    double: new THREE.MeshStandardMaterial({ ...base, roughness: 0.75, side: THREE.DoubleSide }),
    flat: new THREE.MeshStandardMaterial({ ...base, roughness: 0.8, flatShading: true, side: THREE.DoubleSide }),
  };

  function swatch(hex) {
    if (swatches.has(hex)) return swatches.get(hex);
    if (sx + SW > S) {
      sx = 0;
      sy += SW;
    }
    ctx.fillStyle = hex;
    ctx.fillRect(sx, sy, SW, SW);
    const uv = [(sx + SW / 2) / S, 1 - (sy + SW / 2) / S];
    sx += SW;
    swatches.set(hex, uv);
    return uv;
  }

  // Copy an image (canvas) into the atlas, scaled to fit maxW x maxH. Returns { u0, v0, u1, v1 }.
  function region(key, img, maxW = 256, maxH = 256) {
    if (regions.has(key)) return regions.get(key);
    const k = Math.min(1, maxW / img.width, maxH / img.height);
    const w = Math.max(4, Math.round(img.width * k));
    const h = Math.max(4, Math.round(img.height * k));
    const pad = 3;
    if (rx + w + pad * 2 > S) {
      rx = 0;
      ry += shelfH;
      shelfH = 0;
    }
    if (ry + h + pad * 2 > S) {
      console.warn('pool atlas full');
      return null;
    }
    const x = rx + pad;
    const y = ry + pad;
    // edge bleed so mipmaps do not pick up neighbours
    ctx.drawImage(img, x - pad, y - pad, w + pad * 2, h + pad * 2);
    ctx.drawImage(img, x, y, w, h);
    rx += w + pad * 2;
    shelfH = Math.max(shelfH, h + pad * 2);
    const r = { u0: x / S, u1: (x + w) / S, v0: 1 - (y + h) / S, v1: 1 - y / S };
    regions.set(key, r);
    return r;
  }

  const kindOf = (m) => {
    if (m.flatShading) return 'flat';
    if (m.side === THREE.DoubleSide) return 'double';
    if (m.metalness > 0.3 || m.roughness < 0.42) return 'shiny';
    return 'matte';
  };

  function remap(geo, verts, fn) {
    const uv = geo.attributes.uv;
    for (const i of verts) {
      const [u, v] = fn(uv.getX(i), uv.getY(i));
      uv.setXY(i, u, v);
    }
  }

  // Convert one material (or one group of a multi-material mesh) for the vertices `verts`.
  function convert(geo, verts, m) {
    if (m.map && m.map.image && m.map.image.width) {
      const r = region(m.map.uuid, m.map.image, m.userData.atlasMax?.[0] ?? 96, m.userData.atlasMax?.[1] ?? 96);
      if (!r) return false;
      remap(geo, verts, (u, v) => [r.u0 + THREE.MathUtils.clamp(u, 0, 1) * (r.u1 - r.u0), r.v0 + THREE.MathUtils.clamp(v, 0, 1) * (r.v1 - r.v0)]);
    } else {
      const c = m.userData.atlasColor || '#' + m.color.getHexString();
      const [u, v] = swatch(c);
      remap(geo, verts, () => [u, v]);
    }
    return true;
  }

  const skippable = (m) => m.transparent || m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile || m.userData.noAtlas || (m.map && m.map.wrapS === THREE.RepeatWrapping) || !m.isMeshStandardMaterial;

  // Rewrite every eligible mesh under root. skip: Set of objects to leave alone (with their children).
  function atlasify(root, skip = new Set()) {
    const list = [];
    root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh) return;
      for (let p = o; p; p = p.parent) if (skip.has(p)) return;
      list.push(o);
    });
    for (const o of list) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      if (ms.some(skippable)) continue;
      const geo = o.geometry.clone();
      if (!geo.attributes.uv) continue;
      const kind = kindOf(ms[0]);
      if (Array.isArray(o.material)) {
        if (!geo.index || !geo.groups.length) continue;
        const idx = geo.index.array;
        let ok = true;
        for (const gr of geo.groups) {
          const verts = new Set();
          for (let i = gr.start; i < gr.start + gr.count; i++) verts.add(idx[i]);
          ok = convert(geo, verts, o.material[gr.materialIndex]) && ok;
        }
        if (!ok) continue;
        geo.clearGroups();
      } else {
        const verts = Array.from({ length: geo.attributes.uv.count }, (_, i) => i);
        if (!convert(geo, verts, o.material)) continue;
      }
      geo.attributes.uv.needsUpdate = true;
      o.geometry = geo;
      o.material = mats[kind];
    }
    tex.needsUpdate = true;
  }

  return { atlasify, swatch, mats, texture: tex };
}
