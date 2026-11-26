import { THREE, kit, toGeo, vcMat, G } from './parts.js';

// The Ghost Train's moving models: the cute ghosts (one merged mesh each, the hem waves in the
// vertex shader), the little ride car with its candy bucket, the friendly spider, candies, the
// flashlight and its beam.

export const TIME = { value: 0 };

const at = (o, x, y, z) => (o.position.set(x, y, z), o);
const vc = (o, c) => ((o.userData.vc = c), o);

// ------------------------------------------------------------------ ghosts
// variant: 'boo' | 'pinky' (a bow) | 'chef' (a chef's hat) | 'gold' (a crown) | 'specs' (glasses) | 'big'
export function ghostGeo(variant) {
  const k = kit();
  const g = new THREE.Group();
  const body = { pinky: '#ffd0de', gold: '#ffe08a' }[variant] || '#ffffff';
  const pts = [
    [0.36, -0.3], [0.41, -0.26], [0.42, -0.12], [0.41, 0.02], [0.39, 0.14], [0.35, 0.28], [0.28, 0.41], [0.19, 0.5], [0.09, 0.56], [0, 0.58],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const lathe = new THREE.Mesh(new THREE.LatheGeometry(pts, 26), new THREE.MeshStandardMaterial({ color: body }));
  g.add(lathe);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.4, 20), new THREE.MeshStandardMaterial({ color: body }));
  cap.rotation.x = Math.PI / 2;
  cap.position.y = -0.24;
  g.add(cap);
  // face: big shiny eyes, rosy cheeks and a small smile
  for (const s of [-1, 1]) {
    const eye = vc(k.sph(0.075, G.night, undefined, 12), G.night);
    eye.scale.set(0.85, 1.2, 0.5);
    g.add(at(eye, s * 0.13, 0.2, 0.355));
    g.add(at(vc(k.sph(0.024, '#ffffff', undefined, 8), '#ffffff'), s * 0.13 + 0.025, 0.245, 0.39));
    g.add(at(vc(k.sph(0.012, '#ffffff', undefined, 6), '#ffffff'), s * 0.13 - 0.02, 0.17, 0.388));
    const ch = vc(k.sph(0.052, '#ffa6bf', undefined, 10), variant === 'gold' ? '#ffae7a' : '#ffa6bf');
    ch.scale.set(1, 0.6, 0.35);
    g.add(at(ch, s * 0.235, 0.09, 0.33));
    // little arms
    const arm = vc(k.sph(0.1, body, undefined, 10), body);
    arm.scale.set(1.3, 0.75, 0.8);
    arm.rotation.z = s * 0.5;
    g.add(at(arm, s * 0.42, -0.02, 0.06));
  }
  const mouth = vc(k.tor(0.04, 0.013, G.night, Math.PI, undefined, 12, 6), '#b23a48');
  mouth.rotation.z = Math.PI;
  g.add(at(mouth, 0, 0.1, 0.385));
  if (variant === 'pinky') {
    for (const s of [-1, 1]) {
      const c = vc(k.cone(0.08, 0.16, G.rose, 10), G.rose);
      c.rotation.z = (s * Math.PI) / 2;
      g.add(at(c, 0.17 + s * 0.08, 0.56, 0.05));
    }
    g.add(at(vc(k.sph(0.045, G.rose, undefined, 10), G.rose), 0.17, 0.56, 0.06));
  } else if (variant === 'chef') {
    g.add(at(vc(k.cyl(0.19, 0.2, 0.18, '#ffffff', 16), '#fffdf6'), 0, 0.63, 0));
    const puff = vc(k.sph(0.25, '#ffffff', undefined, 14), '#fffdf6');
    puff.scale.set(1, 0.62, 1);
    g.add(at(puff, 0, 0.78, 0));
  } else if (variant === 'gold') {
    g.add(at(vc(k.cyl(0.15, 0.16, 0.1, G.gold, 14), '#f4b73f'), 0, 0.6, 0));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.add(at(vc(k.cone(0.045, 0.12, G.gold, 6), '#f4b73f'), Math.sin(a) * 0.14, 0.7, Math.cos(a) * 0.14));
      g.add(at(vc(k.sph(0.025, G.rose, undefined, 6), i % 2 ? G.rose : G.sky), Math.sin(a) * 0.15, 0.6, Math.cos(a) * 0.15 + 0.01));
    }
  } else if (variant === 'specs') {
    for (const s of [-1, 1]) {
      const r = vc(k.tor(0.085, 0.014, G.ink, Math.PI * 2, undefined, 16, 6), '#6b4a8a');
      g.add(at(r, s * 0.13, 0.2, 0.39));
    }
    g.add(at(vc(k.box(0.06, 0.018, 0.018, G.ink), '#6b4a8a'), 0, 0.21, 0.4));
  } else if (variant === 'big') {
    // a bow tie for the friendly host of the house
    for (const s of [-1, 1]) {
      const c = vc(k.cone(0.07, 0.14, G.violet, 10), '#9b7be0');
      c.rotation.z = (s * Math.PI) / 2;
      g.add(at(c, s * 0.07, -0.02, 0.4));
    }
    g.add(at(vc(k.sph(0.035, G.violet, undefined, 8), '#9b7be0'), 0, -0.02, 0.41));
  }
  return toGeo(g);
}

// One material per ghost (its glow follows the flashlight), sharing one shader program:
// the hem waves, and the glow is tinted by the vertex colours so the eyes stay dark.
export function ghostMat({ decoy = false } = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, emissive: '#ffffff', emissiveIntensity: 0.35 });
  if (decoy) {
    m.transparent = true;
    m.opacity = 0.42;
    m.color.set('#cdd9ff');
    m.emissive.set('#b9c8ff');
    m.depthWrite = false;
  }
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = TIME;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float hem = smoothstep(-0.06, -0.3, position.y);
      float ang = atan(position.z, position.x);
      transformed.y += sin(ang * 7.0 + uTime * 6.0) * 0.05 * hem;
      transformed.xz *= 1.0 + sin(ang * 3.0 - uTime * 4.0) * 0.035 * hem;`,
    );
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb;');
  };
  m.customProgramCacheKey = () => (decoy ? 'gt-ghost-decoy' : 'gt-ghost');
  return m;
}

// ------------------------------------------------------------------ the ride car
// Car local frame: +Z forward. Roji sits at x = +0.3, Homama at x = -0.3; seat top at y = 0.62.
export const SEAT = { y: 0.27, x: 0.3, z: -0.12 };

export function buildCar() {
  const k = kit();
  const car = new THREE.Group();
  const purple = '#8a6fd1';
  const body = new THREE.Group();
  body.add(at(k.rbox(1.42, 0.42, 1.9, purple, 0.16), 0, 0.36, 0));
  body.add(at(k.rbox(1.5, 0.08, 2.0, G.gold, 0.04), 0, 0.17, 0));
  // sides up to the waist
  for (const s of [-1, 1]) body.add(at(k.rbox(0.12, 0.36, 1.6, purple, 0.05), s * 0.68, 0.72, -0.08));
  // the seat and its tall heart-shaped back
  body.add(at(k.rbox(1.18, 0.12, 0.62, G.pink, 0.05), 0, 0.58, -0.15));
  body.add(at(k.rbox(1.3, 0.5, 0.16, '#6a52b8', 0.07), 0, 0.82, -0.62));
  for (const s of [-1, 1]) body.add(at(k.sph(0.24, '#6a52b8', undefined, 14), s * 0.3, 1.05, -0.62));
  body.children.at(-1).scale.set(1, 1, 0.45);
  body.children.at(-2).scale.set(1, 1, 0.45);
  // the ghost-face front: a white rounded nose with eyes and a smile
  const nose = k.sph(0.62, '#ffffff', undefined, 18);
  nose.scale.set(1.08, 0.68, 0.5);
  body.add(at(nose, 0, 0.6, 0.82));
  for (const s of [-1, 1]) {
    const e = k.sph(0.09, G.night, undefined, 10);
    e.scale.set(0.8, 1.15, 0.5);
    body.add(at(e, s * 0.2, 0.72, 1.12));
    body.add(at(k.sph(0.03, '#ffffff', undefined, 6), s * 0.2 + 0.03, 0.77, 1.16));
    const ch = k.sph(0.07, '#ffa6bf', undefined, 8);
    ch.scale.set(1, 0.55, 0.4);
    body.add(at(ch, s * 0.4, 0.58, 1.06));
  }
  const smile = k.tor(0.08, 0.02, '#b23a48', Math.PI, undefined, 12, 6);
  smile.rotation.z = Math.PI;
  body.add(at(smile, 0, 0.58, 1.15));
  // wheels
  for (const s of [-1, 1]) for (const z of [-0.62, 0.62]) {
    const w = k.cyl(0.17, 0.17, 0.12, G.sun, 14);
    w.rotation.z = Math.PI / 2;
    body.add(at(w, s * 0.72, 0.17, z));
    const hub = k.cyl(0.07, 0.07, 0.14, '#ffffff', 10);
    hub.rotation.z = Math.PI / 2;
    body.add(at(hub, s * 0.73, 0.17, z));
  }
  // a little lantern on a curly pole at the back
  body.add(at(k.cyl(0.025, 0.025, 0.5, G.gold, 6), 0.64, 0.9, -0.8));
  body.add(at(k.box(0.16, 0.04, 0.16, G.gold), 0.64, 1.16, -0.8));
  const glass = k.box(0.12, 0.16, 0.12, '#fff3c4');
  glass.material = new THREE.MeshBasicMaterial({ color: '#ffe7a3' });
  body.add(at(glass, 0.64, 1.26, -0.8));
  body.add(at(k.cone(0.11, 0.1, '#6a52b8', 4), 0.64, 1.39, -0.8));
  const geoStd = toGeo(stdOnly(body));
  const mesh = new THREE.Mesh(geoStd, vcMat(0.5));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  car.add(mesh);
  const lamp = new THREE.Mesh(glass.geometry, glass.material);
  lamp.position.copy(glass.position);
  car.add(lamp);
  // the candy bucket on the front, between the two of them: a pink pail with a heart
  const bucket = new THREE.Group();
  const pail = new THREE.Group();
  pail.add(at(k.cyl(0.2, 0.15, 0.26, G.pink, 16), 0, 0.13, 0));
  pail.add(at(k.tor(0.2, 0.025, '#ffffff', Math.PI * 2, undefined, 18, 6), 0, 0.26, 0));
  pail.children.at(-1).rotation.x = Math.PI / 2;
  const hd = k.tor(0.17, 0.014, G.gold, Math.PI, undefined, 14, 5);
  pail.add(at(hd, 0, 0.26, 0));
  const ht = k.heart(0.12, 0.03, G.rose);
  pail.add(at(ht, 0, 0.13, 0.17));
  const pm = new THREE.Mesh(toGeo(pail), vcMat(0.6));
  pm.castShadow = true;
  bucket.add(pm);
  bucket.position.set(0, 0.74, 0.62);
  car.add(bucket);
  return { root: car, bucket };
}

// Keep only plain coloured meshes in a model, moving glows out (so it merges into one mesh)
function stdOnly(group) {
  const out = new THREE.Group();
  group.updateMatrixWorld(true);
  group.traverse((o) => {
    if (!o.isMesh || o.material.isMeshBasicMaterial) return;
    const c = o.clone();
    c.matrixAutoUpdate = false;
    c.matrix.copy(o.matrixWorld);
    out.add(c);
  });
  out.updateMatrixWorld(true);
  return out;
}

// ------------------------------------------------------------------ the spider
// A round, friendly spider with big eyes and a pink bow. Its origin is where the thread meets it.
export function buildSpider() {
  const k = kit();
  const g = new THREE.Group();
  const dark = '#5b3f86';
  g.add(at(k.sph(0.2, dark, undefined, 16), 0, -0.2, 0));
  g.add(at(k.sph(0.15, '#6c4f9a', undefined, 14), 0, -0.3, 0.17));
  for (const s of [-1, 1]) {
    g.add(at(k.sph(0.062, '#ffffff', undefined, 10), s * 0.065, -0.26, 0.29));
    g.add(at(k.sph(0.032, G.night, undefined, 8), s * 0.065, -0.265, 0.34));
    g.add(at(k.sph(0.012, '#ffffff', undefined, 5), s * 0.065 + 0.012, -0.25, 0.37));
    const ch = k.sph(0.035, '#ffa6bf', undefined, 8);
    ch.scale.set(1, 0.6, 0.4);
    g.add(at(ch, s * 0.12, -0.34, 0.27));
    const c = k.cone(0.05, 0.1, G.rose, 8);
    c.rotation.z = (s * Math.PI) / 2;
    g.add(at(c, s * 0.055, -0.03, 0.08));
  }
  g.add(at(k.sph(0.03, G.rose, undefined, 8), 0, -0.03, 0.09));
  const smile = k.tor(0.03, 0.01, '#ff8fab', Math.PI, undefined, 10, 5);
  smile.rotation.z = Math.PI;
  g.add(at(smile, 0, -0.35, 0.31));
  // eight bendy legs
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const a = -0.75 + i * 0.5;
      const up = k.cyl(0.022, 0.022, 0.24, dark, 5);
      const hip = new THREE.Vector3(s * 0.16, -0.18, Math.sin(a) * 0.12);
      const knee = new THREE.Vector3(s * 0.36, -0.06, Math.sin(a) * 0.26);
      const foot = new THREE.Vector3(s * 0.46, -0.34, Math.sin(a) * 0.34);
      for (const [p, q] of [[hip, knee], [knee, foot]]) {
        const seg = up.clone();
        const d = q.clone().sub(p);
        seg.scale.y = d.length() / 0.24;
        seg.position.copy(p).add(q).multiplyScalar(0.5);
        seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
        g.add(seg);
      }
      g.add(at(k.sph(0.03, dark, undefined, 6), foot.x, foot.y, foot.z));
    }
  }
  const mesh = new THREE.Mesh(toGeo(g), vcMat(0.55));
  mesh.castShadow = true;
  const root = new THREE.Group();
  root.add(mesh);
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 4), new THREE.MeshBasicMaterial({ color: '#efe8ff' }));
  thread.geometry.translate(0, 0.5, 0);
  root.add(thread);
  return { root, body: mesh, thread };
}

// ------------------------------------------------------------------ candy
export function candyGeo() {
  const k = kit();
  const g = new THREE.Group();
  const c = k.sph(0.085, '#ffffff', undefined, 12);
  c.scale.set(1.25, 1, 1);
  g.add(c);
  for (const s of [-1, 1]) {
    const w = k.cone(0.065, 0.1, '#ffffff', 8);
    w.rotation.z = (-s * Math.PI) / 2;
    g.add(at(w, s * 0.14, 0, 0));
  }
  return toGeo(g);
}

export const CANDY_COLORS = ['#ff7fa3', '#7fd8bf', '#ffd166', '#c7a6ff', '#8fd3ff', '#ffa36b'];

// ------------------------------------------------------------------ flashlight and beam
export function buildFlashlight() {
  const k = kit();
  const g = new THREE.Group();
  const body = k.cyl(0.035, 0.03, 0.17, G.pink, 10);
  body.position.y = -0.02;
  g.add(body);
  const head = k.cyl(0.055, 0.04, 0.07, G.sun, 12);
  head.position.y = -0.13;
  g.add(head);
  const mesh = new THREE.Mesh(toGeo(g), vcMat(0.45));
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.05, 14), new THREE.MeshBasicMaterial({ color: '#fff6d8' }));
  lens.rotation.x = Math.PI / 2;
  lens.position.y = -0.168;
  const root = new THREE.Group();
  root.add(mesh, lens);
  return { root, lens };
}

// A soft cone of light: apex at the origin, opening along +Z, length 1 and radius 1 (scale it)
export function buildBeam() {
  const geo = new THREE.ConeGeometry(1, 1, 28, 1, true);
  geo.translate(0, -0.5, 0);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const v = 0.85 - z * 0.65;
    col.set([v, v * 0.93, v * 0.75], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, m);
  mesh.renderOrder = 5;
  mesh.frustumCulled = false;
  return mesh;
}
