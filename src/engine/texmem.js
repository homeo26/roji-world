import * as THREE from 'three';

// Keeps memory low enough for phones. iOS Safari closes a tab that uses too much memory (the page reloads,
// then "A problem repeatedly occurred") and refuses new 2D canvases past a total, and the island paints a
// few hundred canvas textures while it loads. Two parts:
// 1. On touch devices textures go to the GPU at most `maxSize` px on a side (three.js scales them down
//    when it uploads them; shadows keep their size).
// 3. releaseGeometry: the merged static meshes of the town places keep their vertex arrays only until
//    they are on the GPU (their bounds are worked out first, so culling and Box3 still work). Not for
//    anything that is raycast (the weekend stops, the car, the ski hill).
// 2. Once a canvas texture is on the GPU its 2D canvas is let go: the texture keeps only a weak link to
//    it. Code that still draws into the canvas holds it, so it comes back when that texture is next
//    updated; a canvas nobody holds is freed. If code asks for a freed canvas (tex.image.getContext), it
//    gets a blank one of the same size to repaint.

class Released {
  constructor(canvas) {
    this.width = canvas.width;
    this.height = canvas.height;
    this.ref = new WeakRef(canvas);
  }
}

const SLOTS = ['map', 'alphaMap', 'emissiveMap', 'aoMap', 'lightMap', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'displacementMap', 'specularMap', 'gradientMap', 'matcap'];
let renderer = null;

export function installTextureMemory(r, { maxSize = 0 } = {}) {
  renderer = r;
  if (maxSize && r.capabilities.maxTextureSize > maxSize) {
    r.capabilities.maxTextureSize = maxSize;
    // three.js notes every texture it scales down; that is the plan here, so those notes stay quiet
    const prev = THREE.getConsoleFunction();
    THREE.setConsoleFunction((type, msg, ...rest) => {
      if (type === 'warn' && typeof msg === 'string' && msg.includes('Texture has been resized')) return;
      if (prev) prev(type, msg, ...rest);
      else console[type](msg, ...rest);
    });
  }
  if (Object.getOwnPropertyDescriptor(THREE.Texture.prototype, 'image')?.get?.released) return;
  const get = function () {
    const d = this.source.data;
    if (!(d instanceof Released)) return d;
    let c = d.ref.deref();
    if (!c) {
      c = document.createElement('canvas');
      c.width = d.width;
      c.height = d.height;
    }
    this.source.data = c;
    return c;
  };
  get.released = true;
  Object.defineProperty(THREE.Texture.prototype, 'image', {
    configurable: true,
    get,
    set(v) {
      this.source.data = v;
    },
  });
}

function eachTexture(root, fn) {
  const seen = new Set();
  const visit = (t) => {
    if (t && t.isTexture && !seen.has(t)) {
      seen.add(t);
      fn(t);
    }
  };
  root.traverse((o) => {
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : null;
    if (!ms) return;
    for (const m of ms) {
      for (const k of SLOTS) visit(m[k]);
      if (m.uniforms) for (const u of Object.values(m.uniforms)) visit(u?.value);
    }
  });
}

// Upload the canvas textures under root (at the capped size) and let their canvases go.
// Returns how many canvases were let go.
export function releaseCanvases(root) {
  if (!renderer || !root) return 0;
  let n = 0;
  eachTexture(root, (t) => {
    const c = t.source?.data;
    if (!(c instanceof HTMLCanvasElement) || t.userData.keepCanvas || t.isVideoTexture || t.isRenderTargetTexture) return;
    if (!c.width || !c.height) return;
    renderer.initTexture(t); // uploads only if it changed since the last upload
    t.source.data = new Released(c);
    n++;
  });
  return n;
}

function freeArray() {
  this.array = null;
}

// Free the vertex arrays of the merged static meshes under root once the GPU has them. Returns how many
// geometries will be freed.
export function releaseGeometry(root) {
  let n = 0;
  root.traverse((o) => {
    const g = o.geometry;
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !g?.userData.baked || g.userData.freed) return;
    if (!g.boundingBox) g.computeBoundingBox();
    if (!g.boundingSphere) g.computeBoundingSphere();
    for (const a of Object.values(g.attributes)) a.onUpload(freeArray);
    g.index?.onUpload(freeArray);
    g.userData.freed = true;
    n++;
  });
  return n;
}

