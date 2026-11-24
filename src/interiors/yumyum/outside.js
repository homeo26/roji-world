import * as K from './kit.js';
import { heartShape } from '../../util.js';
import { oliveTree } from './decor.js';
import { PAL, frameLayout, drawPortal, drawFrame, drawFrieze, drawTile, archShape, archRing, shapeGeo, themedTexture } from './theme.js';

// Roji's YumYum on the town street, dressed like Roji's logo card: a cream two-storey restaurant on a blush tiled
// base. The card itself rises through both floors as the portal round the big arched door (rose corners, pink
// pointed arch, the logo above the door). Each wing has an arched window under a striped awning, and its roof is a
// terrace with tables under fairy lights. Brass lanterns stand either side of the door, olive trees and roses frame
// the path, tables with parasols sit out front and under a vine pergola, and a giant cake and a brass coffee pot
// crown the upper floor.
// Local coordinates: front faces +Z, the front wall at z 1.1, the door at x 0 (world (-40, 11.6) is just outside it).

const { THREE, box, rbox, cyl, sph, tor, at, rot, mat, mesh } = K;

const C = {
  cream: '#fbf0dc',
  blush: '#f1cdc6',
  rasp: PAL.ink,
  raspDeep: PAL.inkDeep,
  band: PAL.band,
  rose: PAL.rose,
  door: '#b0405f',
  doorDeep: '#8e2f4c',
  leaf: '#6f7b4d',
  leafDeep: PAL.olive,
  plate: '#fffaf2',
  wire: '#5a4638',
};
const { BRASS } = K;
const brass = () => mat(PAL.gold, BRASS);
const lantern = (s) => K.makeLantern(s);
const glow = (c = '#ffe1a8', ei = 0.55) => mat('#fff0d0', { emissive: c, ei, rough: 0.25 });
const texMat = (tex, o = {}) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, ...o });

const FRONT = 1.1; // front wall face
const BACK = -4.6;
const W = 8.6; // ground floor width
const D = FRONT - BACK;
const ZC = (FRONT + BACK) / 2;
const H = 3.3; // ground floor height (the roof terraces are on top)
const ROOF = H + 0.125; // the terrace floor
const UP = { w: 5.2, z0: -2.8, z1: 0.85, h: 2.5 }; // the upper floor, set back so the Play Park behind stays in view
const UPY = H + UP.h;
const PORTAL = { w: 3.8, h: 5.8, z: FRONT + 0.3, d: 0.55 };
const DOOR = { w: 1.7, h: 2.5 };
const WING = PORTAL.w / 2 + (W / 2 - PORTAL.w / 2) / 2; // x of each wing's window

// A rose bush: olive leaves with pink roses.
function roseBush(r, s = 1) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + r();
    g.add(at(sph((0.17 + r() * 0.06) * s, i % 2 ? C.leaf : C.leafDeep, { rough: 0.85 }, 8), Math.cos(a) * 0.14 * s, (0.17 + r() * 0.1) * s, Math.sin(a) * 0.1 * s));
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + r();
    g.add(at(sph(0.055 * s, i % 3 ? C.rose : C.rasp, { rough: 0.7 }, 6), Math.cos(a) * 0.2 * s, (0.26 + r() * 0.14) * s, Math.sin(a) * 0.16 * s + 0.05 * s));
  }
  return g;
}

// A climbing vine with leaves and little roses, along points [x, y] on a wall plane at depth z.
function vine(r, pts, z, n = 20) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, z)));
  g.add(mesh(new THREE.TubeGeometry(curve, 28, 0.016, 5), mat(C.leafDeep, { rough: 0.85 }), { cast: false }));
  for (let i = 1; i < n; i++) {
    const p = curve.getPoint(i / n);
    const side = i % 2 ? 1 : -1;
    const leaf = sph(0.06, i % 3 ? C.leaf : C.leafDeep, { rough: 0.85 }, 6);
    leaf.scale.set(1.5, 0.55, 0.8);
    leaf.rotation.z = side * 0.6;
    g.add(at(leaf, p.x + side * 0.07, p.y, z + 0.03));
    if (i % 5 === 2) g.add(at(sph(0.05, i % 10 === 2 ? C.rose : C.rasp, { rough: 0.7 }, 8), p.x - side * 0.05, p.y + 0.03, z + 0.05));
  }
  return g;
}

// A bistro chair facing +Z, seat at 0.46.
function chair() {
  const g = new THREE.Group();
  g.add(at(cyl(0.19, 0.19, 0.06, C.rasp, 16), 0, 0.46, 0));
  for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) g.add(at(cyl(0.014, 0.014, 0.44, brass(), 6), x, 0.22, z));
  g.add(at(tor(0.15, 0.022, C.rasp, undefined, Math.PI, 14), 0, 0.68, -0.17));
  for (const x of [-0.15, 0.15]) g.add(at(cyl(0.02, 0.02, 0.24, C.rasp, 6), x, 0.6, -0.17));
  return g;
}

// Tiny dishes for the bistro tables, base at y = 0.
function plate() {
  return cyl(0.12, 0.1, 0.016, C.plate, 16, { rough: 0.3 });
}
function shawarma() {
  const g = new THREE.Group();
  g.add(at(plate(), 0, 0.008, 0));
  const wrap = rot(cyl(0.035, 0.04, 0.17, '#eccb8e', 10), 0, 0, Math.PI / 2);
  g.add(at(wrap, 0, 0.05, 0));
  g.add(at(rot(cyl(0.042, 0.042, 0.07, '#ffffff', 10), 0, 0, Math.PI / 2), 0.055, 0.05, 0));
  g.add(at(rot(cyl(0.043, 0.043, 0.02, C.rasp, 10), 0, 0, Math.PI / 2), 0.055, 0.05, 0));
  g.add(at(sph(0.03, '#b66b39', undefined, 8), -0.085, 0.055, 0));
  return g;
}
function cakeSlice() {
  const g = new THREE.Group();
  g.add(at(plate(), 0, 0.008, 0));
  const sl = mesh(K.cg('yumSlice', () => new THREE.CylinderGeometry(0.1, 0.1, 0.075, 8, 1, false, 0, 0.9)), mat('#f3dfb8'));
  g.add(at(sl, -0.03, 0.055, -0.03));
  const top = mesh(K.cg('yumSliceTop', () => new THREE.CylinderGeometry(0.102, 0.102, 0.02, 8, 1, false, 0, 0.9)), mat(C.rose));
  g.add(at(top, -0.03, 0.1, -0.03));
  g.add(at(sph(0.018, C.raspDeep, undefined, 8), 0.02, 0.12, 0.02));
  return g;
}
function latte() {
  const g = new THREE.Group();
  g.add(at(cyl(0.07, 0.06, 0.012, C.plate, 14, { rough: 0.3 }), 0, 0.006, 0));
  g.add(at(cyl(0.04, 0.034, 0.05, '#7a4a2e', 12), 0, 0.037, 0));
  g.add(at(cyl(0.042, 0.04, 0.05, '#e9d3b4', 12), 0, 0.085, 0));
  g.add(at(cyl(0.036, 0.036, 0.006, '#f7eee0', 12), 0, 0.111, 0));
  return g;
}
function roseVase() {
  const g = new THREE.Group();
  g.add(at(cyl(0.035, 0.045, 0.12, brass(), 10), 0, 0.06, 0));
  for (const [x, z, c] of [[0, 0, C.rasp], [0.035, 0.02, C.rose], [-0.03, 0.015, '#ffffff']]) g.add(at(sph(0.03, c, undefined, 8), x, 0.16, z));
  return g;
}

// A big tiered cake on a brass stand (the rooftop sign), base at y = 0.
function bigCake() {
  const g = new THREE.Group();
  g.add(at(cyl(0.3, 0.36, 0.06, brass(), 20), 0, 0.03, 0));
  g.add(at(cyl(0.06, 0.08, 0.4, brass(), 12), 0, 0.26, 0));
  g.add(at(cyl(0.62, 0.6, 0.05, brass(), 24), 0, 0.48, 0));
  let y = 0.5;
  const tiers = [[0.52, 0.34, C.rose], [0.39, 0.3, '#fff3e0'], [0.27, 0.26, '#e88aa0']];
  for (const [r, h, c] of tiers) {
    g.add(at(cyl(r, r, h, c, 22), 0, y + h / 2, 0));
    g.add(at(rot(tor(r, 0.035, '#fffaf2', undefined, Math.PI * 2, 24), Math.PI / 2, 0, 0), 0, y + h, 0));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const drip = sph(0.04, '#fffaf2', undefined, 6);
      drip.scale.set(0.7, 1.4 + (i % 3) * 0.3, 0.7);
      g.add(at(drip, Math.cos(a) * r, y + h - 0.05, Math.sin(a) * r));
    }
    y += h;
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(at(sph(0.05, C.raspDeep, { rough: 0.6 }, 8), Math.cos(a) * 0.19, y + 0.04, Math.sin(a) * 0.19));
  }
  const heart = new THREE.ExtrudeGeometry(heartShape(0.34), { depth: 0.07, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 14 });
  heart.center();
  g.add(at(mesh(heart, mat(C.rasp, { rough: 0.4 })), 0, y + 0.24, 0));
  return g;
}

// Raspberry and cream stripes with a row of round scallops hanging from the bottom edge (alpha cut).
function stripeMaterial(key, n, aspect = 4) {
  return K.cg(key, () => {
    const W2 = 512;
    const H2 = Math.round(W2 / aspect);
    const tex = K.canvasTexture(W2, H2, (c, w, h) => {
      for (let i = 0; i < n; i++) {
        c.fillStyle = i % 2 ? C.cream : C.rasp;
        c.fillRect((i * w) / n, 0, w / n + 1, h);
      }
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.fillRect(0, 0, w, h * 0.08);
      const rr = Math.min(w / (n * 4), h * 0.22);
      c.globalCompositeOperation = 'destination-in';
      c.fillStyle = '#000000';
      c.beginPath();
      c.rect(0, 0, w, h - rr);
      for (let i = 0; i < n * 2; i++) {
        c.moveTo(((i + 0.5) * w) / (n * 2) + rr, h - rr);
        c.arc(((i + 0.5) * w) / (n * 2), h - rr, rr, 0, Math.PI);
      }
      c.fill();
    });
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, alphaTest: 0.5, side: THREE.DoubleSide });
  });
}

export function buildYumYumOutside(st) {
  const g = st.group;
  const r = K.rng(26);
  const add = (...o) => (g.add(...o), o[0]);
  const colBox = (x, z, hw, hd, h) => st.addCollider(h === undefined ? { type: 'box', x, z, hw, hd } : { type: 'box', x, z, hw, hd, h });
  const colCirc = (x, z, rr) => st.addCollider({ type: 'circle', x, z, r: rr });
  const tileTex = (rx, ry = 1) => {
    const t = themedTexture(512, 512, (c, w) => drawTile(c, 0, 0, w, { ground: '#fbefe2' }));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    return t;
  };
  const friezeMat = texMat(themedTexture(2048, 120, (c, w, h) => drawFrieze(c, w, h, { tile: 150 })), { roughness: 0.75 });
  const friezeTex2 = themedTexture(2048, 120, (c, w, h) => drawFrieze(c, w, h, { tile: 150 }));
  const frieze = (w, h, y, x, z, ry = 0, m = friezeMat) => {
    const p = mesh(new THREE.PlaneGeometry(w, h), m, { cast: false });
    p.rotation.y = ry;
    return add(at(p, x, y, z));
  };

  // ---------------------------------------------------------------- the ground floor
  add(at(box(W, H, D, C.cream), 0, H / 2, ZC));
  add(at(box(W + 0.06, 0.62, D + 0.06, C.blush), 0, 0.31, ZC));
  add(at(box(W + 0.1, 0.06, D + 0.1, C.raspDeep), 0, 0.64, ZC));
  add(at(mesh(new THREE.PlaneGeometry(W, 0.56), texMat(tileTex(W / 0.56)), { cast: false }), 0, 0.31, FRONT + 0.036));
  // Cornice with a frieze of little arches under it, all the way round
  add(at(box(W + 0.2, 0.16, D + 0.2, C.cream), 0, H + 0.03, ZC));
  add(at(box(W + 0.22, 0.05, D + 0.22, C.raspDeep), 0, H - 0.07, ZC));
  frieze(W, 0.36, H - 0.29, 0, FRONT + 0.006);
  for (const s of [-1, 1]) frieze(D, 0.36, H - 0.29, s * (W / 2 + 0.006), ZC, (s * Math.PI) / 2);
  // Roof terraces: rose-tiled floor, a low cream parapet with stepped merlons and brass posts for the lights
  const terraceTex = K.pattern(128, 128, '#f6dcd2', (c, w) => {
    c.fillStyle = '#efc9bd';
    c.fillRect(0, 0, w / 2, w / 2);
    c.fillRect(w / 2, w / 2, w / 2, w / 2);
    c.fillStyle = '#fbefe8';
    for (const [x, y] of [[w / 4, w / 4], [(3 * w) / 4, (3 * w) / 4]]) {
      c.beginPath();
      c.arc(x, y, 7, 0, Math.PI * 2);
      c.fill();
    }
  }, W / 0.9, D / 0.9);
  add(at(rot(mesh(new THREE.PlaneGeometry(W - 0.1, D - 0.1), texMat(terraceTex, { roughness: 0.85 }), { cast: false }), -Math.PI / 2, 0, 0), 0, ROOF, ZC));
  const PH_ = 0.34;
  for (const s of [-1, 1]) {
    // Front parapet of each wing, side parapet, and merlons
    const len = W / 2 - PORTAL.w / 2;
    add(at(box(len + 0.06, PH_, 0.14, C.cream), s * (PORTAL.w / 2 + len / 2), ROOF + PH_ / 2, FRONT + 0.03));
    add(at(box(len + 0.08, 0.04, 0.17, C.raspDeep), s * (PORTAL.w / 2 + len / 2), ROOF + PH_ + 0.02, FRONT + 0.03));
    add(at(box(0.14, PH_, D + 0.2, C.cream), s * (W / 2 + 0.03), ROOF + PH_ / 2, ZC));
    add(at(box(0.17, 0.04, D + 0.22, C.raspDeep), s * (W / 2 + 0.03), ROOF + PH_ + 0.02, ZC));
    for (let i = 0; i < 4; i++) {
      const x = s * (PORTAL.w / 2 + 0.3 + i * 0.6);
      add(at(box(0.3, 0.14, 0.15, C.cream), x, ROOF + PH_ + 0.11, FRONT + 0.03));
      add(at(box(0.16, 0.12, 0.15, C.band), x, ROOF + PH_ + 0.24, FRONT + 0.03));
    }
  }
  add(at(box(W + 0.2, PH_, 0.14, C.cream), 0, ROOF + PH_ / 2, BACK - 0.03));

  // ---------------------------------------------------------------- the upper floor
  const UD = UP.z1 - UP.z0;
  const UZ = (UP.z0 + UP.z1) / 2;
  add(at(box(UP.w, UP.h, UD, C.cream), 0, H + UP.h / 2, UZ));
  add(at(box(UP.w + 0.04, 0.3, UD + 0.04, C.blush), 0, H + 0.15, UZ));
  add(at(box(UP.w + 0.2, 0.16, UD + 0.2, C.cream), 0, UPY + 0.03, UZ));
  add(at(box(UP.w + 0.22, 0.05, UD + 0.22, C.raspDeep), 0, UPY - 0.07, UZ));
  for (const s of [-1, 1]) {
    frieze(UD, 0.32, UPY - 0.27, s * (UP.w / 2 + 0.006), UZ, (s * Math.PI) / 2, texMat(friezeTex2, { roughness: 0.75 }));
    // Low parapet and merlons on the upper roof, either side of the portal's crown
    add(at(box(UP.w / 2 - PORTAL.w / 2 + 0.06, 0.26, 0.12, C.cream), s * (UP.w / 4 + PORTAL.w / 4), UPY + 0.24, UP.z1 + 0.04));
    add(at(box(0.12, 0.26, UD + 0.16, C.cream), s * (UP.w / 2 + 0.04), UPY + 0.24, UZ));
    add(at(box(0.22, 0.14, 0.13, C.band), s * (UP.w / 2 - 0.12), UPY + 0.44, UP.z1 + 0.04));
  }
  add(at(box(UP.w + 0.2, 0.26, 0.12, C.cream), 0, UPY + 0.24, UP.z0 - 0.04));
  add(at(box(UP.w - 0.1, 0.03, UD - 0.1, '#f2d8cd'), 0, UPY + 0.12, UZ));
  // Slim arched windows either side of the portal, and arched French doors onto each terrace
  const slimGlass = shapeGeo(archShape(0.42, 0.86, 0.3), 0.02);
  const slimRing = shapeGeo(archRing(0.52, 0.9, 0.36, 0.05), 0.03);
  const doorGlass = shapeGeo(archShape(0.9, 1.25, 0.42), 0.02);
  const doorRing = shapeGeo(archRing(1.04, 1.3, 0.5, 0.06, { open: true }), 0.04);
  for (const s of [-1, 1]) {
    const x = s * (PORTAL.w / 2 + (UP.w - PORTAL.w) / 4);
    add(at(mesh(slimGlass, glow('#ffd59a', 0.45)), x, H + 0.55, UP.z1 + 0.005));
    add(at(mesh(slimRing, mat(C.raspDeep)), x, H + 0.52, UP.z1 + 0.01));
    add(at(box(0.62, 0.06, 0.14, C.cream), x, H + 0.5, UP.z1 + 0.06));
    for (let i = 0; i < 3; i++) add(at(sph(0.05, i % 2 ? C.leaf : C.rose, { rough: 0.8 }, 6), x - 0.16 + i * 0.16, H + 0.56, UP.z1 + 0.1));
    const dg = at(new THREE.Group(), s * (UP.w / 2 + 0.01), ROOF, -0.9);
    dg.rotation.y = (s * Math.PI) / 2;
    dg.add(mesh(doorGlass, glow('#ffd59a', 0.42)));
    dg.add(at(mesh(doorRing, mat(C.raspDeep)), 0, 0, 0.01));
    dg.add(at(box(0.03, 1.6, 0.03, C.cream), 0, 0.8, 0.04));
    add(dg);
    // A wall lantern by each French door
    add(at(box(0.3, 0.04, 0.04, brass()), s * (UP.w / 2 + 0.15), ROOF + 1.95, 0.05));
    add(at(lantern(0.7), s * (UP.w / 2 + 0.28), ROOF + 1.4, 0.05));
    add(at(cyl(0.006, 0.006, 0.12, brass(), 4), s * (UP.w / 2 + 0.28), ROOF + 1.86, 0.05));
  }

  // ---------------------------------------------------------------- the portal: Roji's logo card round the door
  const PW = 768;
  const PH = Math.round((PW * PORTAL.h) / PORTAL.w);
  const k = PORTAL.w / PW;
  const doorTopPx = PH - (DOOR.h + 0.16) / k;
  const portalTex = themedTexture(PW, PH, (c, w, h) => drawPortal(c, w, h, { doorTop: doorTopPx }));
  const pz = PORTAL.z;
  add(at(box(PORTAL.w, PORTAL.h, PORTAL.d, C.cream), 0, PORTAL.h / 2, pz - PORTAL.d / 2));
  add(at(mesh(new THREE.PlaneGeometry(PORTAL.w, PORTAL.h), texMat(portalTex, { roughness: 0.7, emissive: '#ffffff', emissiveMap: portalTex, emissiveIntensity: 0.08 }), { cast: false }), 0, PORTAL.h / 2, pz + 0.003));
  add(at(box(PORTAL.w + 0.16, 0.14, PORTAL.d + 0.14, C.cream), 0, PORTAL.h + 0.07, pz - PORTAL.d / 2));
  add(at(box(PORTAL.w + 0.18, 0.045, PORTAL.d + 0.16, C.raspDeep), 0, PORTAL.h - 0.01, pz - PORTAL.d / 2));
  for (let i = -2; i <= 2; i++) {
    add(at(box(0.36, 0.16, 0.18, C.cream), i * 0.72, PORTAL.h + 0.22, pz - 0.04));
    add(at(box(0.2, 0.14, 0.18, C.band), i * 0.72, PORTAL.h + 0.37, pz - 0.04));
  }
  const crown = new THREE.ExtrudeGeometry(heartShape(0.5), { depth: 0.09, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 14 });
  crown.center();
  add(at(mesh(crown, brass()), 0, PORTAL.h + 0.78, pz - 0.04));
  add(at(cyl(0.05, 0.07, 0.22, brass(), 8), 0, PORTAL.h + 0.46, pz - 0.04));
  // Raised raspberry line and pink band along the painted arch, open at the ground
  const L = frameLayout(PW, PH);
  const archW = (L.x1 - L.x0) * k;
  const spring = (PH - L.spring) * k;
  const rise = L.A * k;
  const ring = (d, t, color) => {
    const geo = shapeGeo(archRing(archW + 2 * d, spring, rise + d * 1.3, t, { open: true }), 0.045, 12);
    add(at(mesh(geo, mat(color, { rough: 0.6 })), 0, 0, pz));
  };
  ring(0.09, 0.09, C.band);
  ring(0.15, 0.06, C.raspDeep);
  for (const s of [-1, 1]) add(at(box(0.045, PORTAL.h - 0.04, 0.05, PAL.frame), s * (PORTAL.w / 2 - 0.022), PORTAL.h / 2, pz + 0.02));

  // The big arched door: deep raspberry double door with glowing arched lights and brass handles
  const DW = DOOR.w;
  const dSpring = 1.82;
  const dRise = DOOR.h - dSpring;
  add(at(mesh(shapeGeo(archShape(DW, dSpring, dRise), 0.06), mat(C.door, { rough: 0.6 })), 0, 0, pz));
  add(at(mesh(shapeGeo(archRing(DW + 0.18, dSpring, dRise + 0.11, 0.09, { open: true }), 0.09), brass()), 0, 0, pz));
  add(at(box(0.035, DOOR.h - 0.14, 0.02, C.doorDeep), 0, (DOOR.h - 0.14) / 2, pz + 0.07));
  const lightGeo = shapeGeo(archShape(0.5, 0.5, 0.24), 0.01);
  for (const s of [-1, 1]) {
    add(at(mesh(lightGeo, glow('#ffc978', 0.6)), s * 0.41, 1.25, pz + 0.062));
    add(at(rbox(0.56, 0.62, 0.02, C.doorDeep), s * 0.41, 0.66, pz + 0.065));
    add(at(rbox(0.3, 0.3, 0.025, C.door), s * 0.41, 0.66, pz + 0.075));
    add(at(sph(0.05, brass(), undefined, 10), s * 0.1, 1.2, pz + 0.1));
    for (const y of [0.3, 1.05, 1.7]) add(at(sph(0.028, brass(), undefined, 8), s * 0.7, y, pz + 0.07));
  }
  // A heart knocker in the middle and a step with a raspberry edge
  const knock = new THREE.ExtrudeGeometry(heartShape(0.12), { depth: 0.02, bevelEnabled: false, curveSegments: 8 });
  knock.center();
  add(at(mesh(knock, brass()), 0, 1.55, pz + 0.1));
  add(at(box(2.4, 0.08, 0.46, C.cream), 0, 0.04, pz + 0.23));
  add(at(box(2.42, 0.025, 0.48, C.raspDeep), 0, 0.075, pz + 0.23));
  // Brass lanterns on brackets inside the arch
  for (const s of [-1, 1]) {
    add(at(box(0.04, 0.04, 0.3, brass()), s * 1.32, 2.5, pz + 0.15));
    add(at(cyl(0.008, 0.008, 0.16, brass(), 4), s * 1.32, 2.42, pz + 0.28));
    add(at(lantern(1.05), s * 1.32, 1.78, pz + 0.28));
  }

  // ---------------------------------------------------------------- wing windows under striped awnings
  const WP = { w: 1.3, h: 1.82, y: 0.8 };
  const wpx = 336;
  const wph = Math.round((wpx * WP.h) / WP.w);
  const panelTex = themedTexture(wpx, wph, (c, w, h) => drawFrame(c, w, h));
  const WL = frameLayout(wpx, wph);
  const wk = WP.w / wpx;
  const gw = (WL.x1 - WL.x0) * wk;
  const gb = (wph - WL.y1) * wk;
  const gs = (WL.y1 - WL.spring) * wk;
  const gr = WL.A * wk;
  const glassGeo = shapeGeo(archShape(gw, gs, gr), 0.02);
  const winRing = shapeGeo(archRing(gw + 0.1, gs + 0.05, gr + 0.065, 0.05), 0.04);
  const winRing2 = shapeGeo(archRing(gw + 0.16, gs + 0.08, gr + 0.104, 0.03), 0.04);
  const awnW = W / 2 - PORTAL.w / 2 - 0.3;
  const awnMat = stripeMaterial('yumAwning', 10, awnW / 0.95);
  const valMat = stripeMaterial('yumValance', 10, awnW / 0.2);
  for (const s of [-1, 1]) {
    const x = s * WING;
    add(at(mesh(new THREE.PlaneGeometry(WP.w, WP.h), texMat(panelTex), { cast: false }), x, WP.y + WP.h / 2, FRONT + 0.008));
    add(at(mesh(glassGeo, glow('#ffd59a', 0.45)), x, WP.y + gb, FRONT + 0.01));
    add(at(mesh(winRing, mat(C.band)), x, WP.y + gb - 0.05, FRONT + 0.01));
    add(at(mesh(winRing2, mat(C.raspDeep)), x, WP.y + gb - 0.08, FRONT + 0.01));
    add(at(box(0.03, gs + gr - 0.04, 0.03, C.cream), x, WP.y + gb + (gs + gr) / 2, FRONT + 0.04));
    add(at(box(gw, 0.03, 0.03, C.cream), x, WP.y + gb + gs, FRONT + 0.04));
    add(at(box(gw + 0.28, 0.06, 0.22, C.cream), x, WP.y + gb - 0.06, FRONT + 0.11));
    add(at(rbox(gw + 0.14, 0.22, 0.26, C.rasp), x, WP.y + gb - 0.21, FRONT + 0.15));
    for (let i = 0; i < 8; i++) {
      const lx = x - gw / 2 + 0.05 + (i * (gw - 0.1)) / 7;
      add(at(sph(0.075, i % 2 ? C.leaf : C.leafDeep, { rough: 0.85 }, 6), lx, WP.y + gb - 0.06, FRONT + 0.17));
      if (i % 2 === 0) add(at(sph(0.052, i % 4 ? C.rose : C.rasp, { rough: 0.7 }, 6), lx + 0.03, WP.y + gb - 0.0, FRONT + 0.23));
    }
    // Awning: a striped canopy sloping out from the wall, a scalloped valance and brass arms
    const awn = mesh(new THREE.PlaneGeometry(awnW, 0.95), awnMat, { cast: true });
    awn.rotation.x = -1.0;
    add(at(awn, x, 2.97 - 0.95 * 0.5 * Math.cos(1.0), FRONT + 0.02 + 0.95 * 0.5 * Math.sin(1.0)));
    const az = FRONT + 0.02 + 0.95 * Math.sin(1.0);
    const ay = 2.97 - 0.95 * Math.cos(1.0);
    add(at(mesh(new THREE.PlaneGeometry(awnW, 0.2), valMat, { cast: false }), x, ay - 0.09, az + 0.005));
    add(at(rot(cyl(0.018, 0.018, awnW + 0.06, brass(), 8), 0, 0, Math.PI / 2), x, ay + 0.005, az));
    for (const sx of [-1, 1]) {
      const arm = cyl(0.014, 0.014, 0.85, brass(), 6);
      arm.rotation.x = 0.9;
      add(at(arm, x + sx * (awnW / 2 + 0.02), ay - 0.25, FRONT + 0.4));
    }
    add(at(box(awnW + 0.1, 0.06, 0.06, C.raspDeep), x, 2.99, FRONT + 0.04));
  }
  colBox(0, ZC, W / 2, D / 2);
  colBox(0, pz - PORTAL.d / 2 + 0.06, PORTAL.w / 2, PORTAL.d / 2 + 0.06);
  for (const s of [-1, 1]) colBox(s * WING, FRONT + 0.16, gw / 2 + 0.14, 0.16);

  // ---------------------------------------------------------------- greenery: vines, roses, olive trees
  for (const s of [-1, 1]) {
    const x = s * (W / 2 - 0.12);
    add(vine(r, [[x, 0.66], [x - s * 0.05, 1.2], [x + s * 0.03, 1.8], [x - s * 0.04, 2.4], [x - s * 0.2, 2.85], [x - s * 0.5, 3.0]], FRONT + 0.02));
    add(vine(r, [[s * (UP.w / 2 - 0.1), ROOF + 0.3], [s * (UP.w / 2 - 0.14), ROOF + 0.9], [s * (UP.w / 2 - 0.1), ROOF + 1.5], [s * (UP.w / 2 - 0.3), UPY - 0.35], [s * (UP.w / 2 - 0.6), UPY - 0.4]], UP.z1 + 0.02, 16));
    add(at(roseBush(r, 1.15), s * (W / 2 - 0.15), 0, FRONT + 0.38));
    colCirc(s * (W / 2 - 0.15), FRONT + 0.38, 0.3);
    add(at(roseBush(r, 0.85), s * (PORTAL.w / 2 + 0.18), 0, FRONT + 0.42));
    // Olive trees in big planters framing the path to the door
    add(at(oliveTree(1.35, C.rasp, s > 0 ? 5 : 6), s * 1.5, 0, pz + 0.95));
    add(at(rbox(0.66, 0.12, 0.66, C.cream, 0.03), s * 1.5, 0.06, pz + 0.95));
    colCirc(s * 1.5, pz + 0.95, 0.34);
    // Rose planters on the terrace parapet corners
    add(at(rbox(0.34, 0.2, 0.34, C.rasp, 0.03), s * (W / 2 - 0.2), ROOF + PH_ + 0.1, FRONT - 0.15));
    add(at(roseBush(r, 0.6), s * (W / 2 - 0.2), ROOF + PH_ + 0.18, FRONT - 0.15));
  }

  // ---------------------------------------------------------------- tall brass lanterns either side of the door
  for (const s of [-1, 1]) {
    const x = s * 2.35;
    const z = FRONT + 0.85;
    add(at(cyl(0.2, 0.24, 0.14, C.cream, 16), x, 0.07, z));
    add(at(cyl(0.12, 0.16, 0.22, brass(), 12), x, 0.25, z));
    add(at(cyl(0.045, 0.06, 2.0, brass(), 8), x, 1.3, z));
    add(at(tor(0.08, 0.016, brass(), undefined, Math.PI * 2, 12), x, 1.0, z)).rotation.x = Math.PI / 2;
    add(at(cyl(0.1, 0.06, 0.08, brass(), 8), x, 2.32, z));
    add(at(lantern(1.35), x, 2.36, z));
    colCirc(x, z, 0.24);
  }

  // ---------------------------------------------------------------- outdoor seating: bistro tables under parasols
  const pMat = stripeMaterial('yumParasol', 12, 4);
  const dishes = [[shawarma, latte], [cakeSlice, latte], [cakeSlice, roseVase], [shawarma, cakeSlice], [latte, roseVase], [cakeSlice, latte]];
  let di = 0;
  const bistro = (x, y, z, { parasol = true, along = 'x' } = {}) => {
    add(at(cyl(0.42, 0.42, 0.045, C.cream, 22, { rough: 0.5 }), x, y + 0.75, z));
    add(at(rot(tor(0.42, 0.02, brass(), undefined, Math.PI * 2, 24), Math.PI / 2, 0, 0), x, y + 0.75, z));
    add(at(cyl(0.035, 0.035, 0.72, brass(), 8), x, y + 0.38, z));
    add(at(cyl(0.2, 0.24, 0.04, brass(), 16), x, y + 0.02, z));
    if (along === 'x') {
      add(at(rot(chair(), 0, Math.PI / 2, 0), x - 0.62, y, z));
      add(at(rot(chair(), 0, -Math.PI / 2, 0), x + 0.62, y, z));
    } else {
      add(at(chair(), x, y, z - 0.62));
      add(at(rot(chair(), 0, Math.PI, 0), x, y, z + 0.62));
    }
    const [a, b] = dishes[di++ % dishes.length];
    add(at(a(), x - 0.14, y + 0.775, z + 0.04));
    add(at(b(), x + 0.17, y + 0.775, z - 0.08));
    if (parasol) {
      add(at(cyl(0.025, 0.025, 1.65, brass(), 8), x, y + 1.6, z));
      add(at(mesh(K.cg('yumParasolCone', () => new THREE.ConeGeometry(0.95, 0.44, 24, 1, true)), pMat), x, y + 2.4, z));
      add(at(sph(0.05, brass(), undefined, 8), x, y + 2.64, z));
    }
  };
  bistro(-3.0, 0, 2.95);
  bistro(3.15, 0, 2.95);
  colCirc(-3.0, 2.95, 1.0);
  colCirc(3.15, 2.95, 1.0);
  // Up on the roof terraces: a table for two each side, with a lantern on the parapet
  for (const s of [-1, 1]) {
    bistro(s * 3.45, ROOF, -0.35, { parasol: false, along: 'z' });
    bistro(s * 3.45, ROOF, -3.0, { parasol: false, along: 'z' });
    add(at(oliveTree(0.9, C.cream, s > 0 ? 9 : 11), s * 3.55, ROOF, -4.15));
    add(at(lantern(0.6), s * (W / 2 - 0.2), ROOF + PH_ + 0.02, -1.7));
  }

  // ---------------------------------------------------------------- the vine pergola on the east lawn
  const PG = { x0: 4.85, x1: 6.75, z0: -2.7, z1: 1.55, h: 2.55 };
  const pgx = (PG.x0 + PG.x1) / 2;
  for (const [x, z] of [[PG.x0, PG.z0], [PG.x1, PG.z0], [PG.x0, PG.z1], [PG.x1, PG.z1]]) {
    add(at(rbox(0.16, PG.h, 0.16, C.cream, 0.03), x, PG.h / 2, z));
    add(at(rbox(0.24, 0.12, 0.24, C.raspDeep, 0.02), x, 0.06, z));
    add(at(rbox(0.22, 0.08, 0.22, C.cream, 0.02), x, PG.h - 0.02, z));
    colCirc(x, z, 0.14);
  }
  for (const x of [PG.x0, PG.x1]) add(at(box(0.12, 0.16, PG.z1 - PG.z0 + 0.5, C.cream), x, PG.h + 0.06, (PG.z0 + PG.z1) / 2));
  for (let i = 0; i <= 5; i++) add(at(box(PG.x1 - PG.x0 + 0.36, 0.07, 0.07, C.cream), pgx, PG.h + 0.17, PG.z0 - 0.1 + (i * (PG.z1 - PG.z0 + 0.2)) / 5));
  for (const x of [PG.x0, PG.x1]) add(at(box(0.13, 0.03, PG.z1 - PG.z0 + 0.52, C.raspDeep), x, PG.h + 0.15, (PG.z0 + PG.z1) / 2));
  for (const x of [PG.x0, PG.x1]) {
    add(vine(r, [[x - 0.05, 0.1], [x + 0.05, 0.8], [x - 0.04, 1.5], [x + 0.05, 2.1], [x, PG.h + 0.1]], PG.z1 + 0.1, 14));
    add(at(roseBush(r, 0.9), x, 0, PG.z1 + 0.32));
  }
  // Leaves and roses climbing along the top beams
  for (let i = 0; i < 16; i++) {
    const x = i % 2 ? PG.x0 : PG.x1;
    const z = PG.z0 + ((i >> 1) / 7) * (PG.z1 - PG.z0);
    add(at(sph(0.13 + r() * 0.06, i % 3 ? C.leaf : C.leafDeep, { rough: 0.85 }, 7), x + (r() - 0.5) * 0.2, PG.h + 0.24, z));
    if (i % 3 === 0) add(at(sph(0.055, i % 2 ? C.rose : C.rasp, { rough: 0.7 }, 6), x + (r() - 0.5) * 0.2, PG.h + 0.36, z + 0.06));
  }
  bistro(pgx, 0, -1.55, { parasol: false });
  bistro(pgx, 0, 0.45, { parasol: false });
  colCirc(pgx, -1.55, 0.95);
  colCirc(pgx, 0.45, 0.95);

  // ---------------------------------------------------------------- fairy lights over the terraces and the pergola
  const bulbs = [[], []];
  const string = (a, b, sag, n) => {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - 4 * sag * t * (1 - t), a.z + (b.z - a.z) * t));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    add(mesh(new THREE.TubeGeometry(curve, 14, 0.008, 3), mat(C.wire, { rough: 0.8 }), { cast: false }));
    for (let i = 1; i < n; i++) bulbs[i % 3 === 0 ? 1 : 0].push(curve.getPoint(i / n));
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const POST_Y = ROOF + 1.3;
  for (const s of [-1, 1]) {
    const xo = s * (W / 2 + 0.03);
    for (const z of [FRONT - 0.05, -1.6, -3.1, BACK + 0.1]) {
      add(at(cyl(0.025, 0.03, 1.3, brass(), 6), xo, ROOF + 0.65, z));
      add(at(sph(0.045, brass(), undefined, 8), xo, POST_Y + 0.02, z));
    }
    const xi = s * (UP.w / 2 + 0.01);
    const zs = [FRONT - 0.05, -1.6, -3.1, BACK + 0.1];
    zs.forEach((z, i) => string(V(xi, UPY - 0.45, Math.min(UP.z1, Math.max(UP.z0, z * 0.85))), V(xo, POST_Y, z), 0.18, 11));
    for (let i = 0; i < zs.length - 1; i++) string(V(xo, POST_Y, zs[i]), V(xo, POST_Y, zs[i + 1]), 0.12, 8);
    string(V(xo, POST_Y, FRONT - 0.05), V(s * (PORTAL.w / 2 + 0.05), ROOF + 1.0, FRONT - 0.02), 0.1, 8);
  }
  for (let i = 0; i < 5; i++) {
    const z = PG.z0 + ((i + 0.5) * (PG.z1 - PG.z0)) / 5;
    string(V(PG.x0, PG.h + 0.1, z), V(PG.x1, PG.h + 0.1, z), 0.16, 7);
  }
  const bulbGeo = new THREE.SphereGeometry(0.042, 8, 6);
  const bulbMats = [umatGlow('#fff3cf', '#ffd98a'), umatGlow('#ffd3df', '#ff9fbb')];
  const m4 = new THREE.Matrix4();
  bulbs.forEach((list, j) => {
    const im = new THREE.InstancedMesh(bulbGeo, bulbMats[j], list.length);
    list.forEach((p, i) => im.setMatrixAt(i, m4.makeTranslation(p.x, p.y - 0.03, p.z)));
    im.castShadow = false;
    im.computeBoundingSphere();
    add(im);
  });

  // ---------------------------------------------------------------- the crown: a giant cake and a brass coffee pot
  const cake = bigCake();
  K.colorBake(cake);
  const CAKE = { x: -1.5, z: -1.05, y: UPY + 0.13 };
  cake.position.set(CAKE.x, CAKE.y, CAKE.z);
  add(cake);
  const pot = K.makeDallah(1.2);
  pot.rotation.y = -0.5;
  pot.position.set(1.55, UPY + 0.13, -1.1);
  add(pot);
  pot.updateMatrixWorld(true);
  const spout = pot.userData.spout.clone().applyMatrix4(new THREE.Matrix4().compose(pot.position, pot.quaternion, pot.scale));

  // Leaves, roses and dishes cast no shadow; plain-coloured parts merge into a few vertex-coloured meshes
  K.trimShadows(g, [cake], { size: 0.16 });
  K.colorBake(g, [cake]);
  const steam = [];
  for (let i = 0; i < 4; i++) {
    const s = K.glowSprite('#ffffff', 0);
    add(s);
    steam.push(s);
  }
  return {
    badgeY: 8.0, // low enough to stay under the camera's view of the Play Park pad behind
    dynamic: [cake],
    update(dt, t, near) {
      cake.rotation.y = t * 0.4;
      cake.position.y = CAKE.y + Math.sin(t * 1.6) * 0.04;
      steam.forEach((s, i) => {
        const q = (t * 0.4 + i / steam.length) % 1;
        s.position.set(spout.x + q * 0.25 + Math.sin(q * 5 + i) * 0.08, spout.y + q * 1.0, spout.z + q * 0.1);
        s.scale.setScalar(0.25 + q * 0.5);
        s.material.opacity = 0.55 * (1 - q) * (0.5 + near * 0.5);
      });
    },
  };
}

function umatGlow(color, emissive) {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.9, roughness: 0.3 });
}
