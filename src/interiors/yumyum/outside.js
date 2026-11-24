import * as K from './kit.js';
import { heartShape } from '../../util.js';
import { PAL, frameLayout, drawPortal, drawFrame, drawFrieze, drawTile, archShape, archRing, shapeGeo, themedTexture } from './theme.js';

// Roji's YumYum on the town street, dressed like Roji's logo card: cream walls on a blush tiled base, the card
// itself as the portal around the door (rose corners, pink pointed arch, the logo above the door), arched windows,
// a frieze of little arches, brass lanterns, olive vines and roses, a giant cake and a brass coffee pot on the roof.
// Local coordinates: front faces +Z, the front wall at z 1.1, the door at x 0.

const { THREE, box, rbox, cyl, sph, tor, at, rot, mat, mesh } = K;

const C = {
  cream: '#fbf0dc',
  blush: '#f1cdc6',
  rasp: PAL.ink,
  raspDeep: PAL.inkDeep,
  band: PAL.band,
  rose: PAL.rose,
  roof: '#f2d8cd',
  door: '#b0405f',
  doorDeep: '#8e2f4c',
  leaf: '#6f7b4d',
  leafDeep: PAL.olive,
  plate: '#fffaf2',
};
const { BRASS } = K;
const brass = () => mat(PAL.gold, BRASS);
const lantern = (s) => K.makeLantern(s);
const glow = (c = '#ffe1a8', ei = 0.55) => mat('#fff0d0', { emissive: c, ei, rough: 0.25 });
const texMat = (tex, o = {}) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, ...o });

const FRONT = 1.1;
const W = 5.8;
const H = 3.0;
const D = 3.4;
const PORTAL = { w: 3.3, h: 4.66, z: FRONT + 0.3 };
const DOOR_H = 2.1;

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
function vine(r, pts, z) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, z)));
  g.add(mesh(new THREE.TubeGeometry(curve, 28, 0.016, 5), mat(C.leafDeep, { rough: 0.85 }), { cast: false }));
  const n = 20;
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
  const sl = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.075, 8, 1, false, 0, 0.9), mat('#f3dfb8'));
  g.add(at(sl, -0.03, 0.055, -0.03));
  const top = mesh(new THREE.CylinderGeometry(0.102, 0.102, 0.02, 8, 1, false, 0, 0.9), mat(C.rose));
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

// Raspberry and cream striped parasol with a scalloped edge (alpha cut), r wide, base of the canopy at y = 0.
function parasolMaterial() {
  return K.cg('yumParasol', () => {
    const tex = K.canvasTexture(512, 128, (c, w, h) => {
      const n = 12;
      for (let i = 0; i < n; i++) {
        c.fillStyle = i % 2 ? C.cream : C.rasp;
        c.fillRect((i * w) / n, 0, w / n + 1, h);
      }
      // Keep the canopy and a row of round scallops hanging from its edge
      const rr = w / (n * 4);
      c.globalCompositeOperation = 'destination-in';
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

  // ---------------------------------------------------------------- the building
  add(at(box(W, H, D, C.cream), 0, H / 2, -0.6));
  add(at(box(W + 0.06, 0.58, D + 0.06, C.blush), 0, 0.29, -0.6));
  add(at(box(W + 0.1, 0.06, D + 0.1, C.raspDeep), 0, 0.6, -0.6));
  // Floral tiles on the base, along the front
  const tileTex = themedTexture(512, 512, (c, w) => drawTile(c, 0, 0, w, { ground: '#fbefe2' }));
  tileTex.wrapS = THREE.RepeatWrapping;
  tileTex.repeat.set(W / 0.52, 1);
  add(at(mesh(new THREE.PlaneGeometry(W, 0.52), texMat(tileTex), { cast: false }), 0, 0.29, FRONT + 0.036));
  // Cornice, frieze of little arches, roof terrace and a low parapet with stepped merlons at the front
  add(at(box(W + 0.2, 0.16, D + 0.2, C.cream), 0, H + 0.03, -0.6));
  add(at(box(W + 0.22, 0.05, D + 0.22, C.raspDeep), 0, H - 0.07, -0.6));
  add(at(box(W - 0.1, 0.03, D - 0.1, C.roof), 0, H + 0.12, -0.6));
  const friezeTex = themedTexture(2048, 120, (c, w, h) => drawFrieze(c, w, h, { tile: 150 }));
  const friezeMat = texMat(friezeTex, { roughness: 0.75 });
  add(at(mesh(new THREE.PlaneGeometry(W, 0.34), friezeMat, { cast: false }), 0, H - 0.27, FRONT + 0.006));
  for (const s of [-1, 1]) {
    const side = mesh(new THREE.PlaneGeometry(D, 0.34), friezeMat, { cast: false });
    side.rotation.y = s * Math.PI / 2;
    add(at(side, s * (W / 2 + 0.006), H - 0.27, -0.6));
  }
  for (const s of [-1, 1]) {
    add(at(box(0.12, 0.22, D + 0.2, C.cream), s * (W / 2 + 0.04), H + 0.22, -0.6));
    add(at(box((W - PORTAL.w) / 2 + 0.1, 0.22, 0.12, C.cream), s * (W / 2 - (W - PORTAL.w) / 4 + 0.02), H + 0.22, FRONT + 0.04));
    for (let i = 0; i < 3; i++) {
      const x = s * (PORTAL.w / 2 + 0.28 + i * 0.44);
      add(at(box(0.3, 0.14, 0.14, C.cream), x, H + 0.4, FRONT + 0.04));
      add(at(box(0.16, 0.12, 0.14, C.band), x, H + 0.53, FRONT + 0.04));
    }
  }
  add(at(box(W + 0.2, 0.22, 0.12, C.cream), 0, H + 0.22, -2.36));

  // ---------------------------------------------------------------- the portal: Roji's logo card around the door
  const PW = 768;
  const PH = Math.round((PW * PORTAL.h) / PORTAL.w);
  const k = PORTAL.w / PW;
  const doorTopPx = PH - (DOOR_H + 0.14) / k;
  const portalTex = themedTexture(PW, PH, (c, w, h) => drawPortal(c, w, h, { doorTop: doorTopPx }));
  const pz = PORTAL.z;
  add(at(box(PORTAL.w, PORTAL.h, 0.34, C.cream), 0, PORTAL.h / 2, pz - 0.17));
  add(at(mesh(new THREE.PlaneGeometry(PORTAL.w, PORTAL.h), texMat(portalTex, { roughness: 0.7, emissive: '#ffffff', emissiveMap: portalTex, emissiveIntensity: 0.08 }), { cast: false }), 0, PORTAL.h / 2, pz + 0.003));
  add(at(box(PORTAL.w + 0.14, 0.12, 0.46, C.cream), 0, PORTAL.h + 0.06, pz - 0.17));
  add(at(box(PORTAL.w + 0.16, 0.04, 0.48, C.raspDeep), 0, PORTAL.h - 0.01, pz - 0.17));
  for (let i = -2; i <= 2; i++) {
    add(at(box(0.32, 0.14, 0.16, C.cream), i * 0.62, PORTAL.h + 0.19, pz - 0.02));
    add(at(box(0.18, 0.12, 0.16, C.band), i * 0.62, PORTAL.h + 0.32, pz - 0.02));
  }
  const crown = new THREE.ExtrudeGeometry(heartShape(0.42), { depth: 0.08, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2, curveSegments: 14 });
  crown.center();
  add(at(mesh(crown, brass()), 0, PORTAL.h + 0.66, pz - 0.02));
  add(at(cyl(0.04, 0.06, 0.18, brass(), 8), 0, PORTAL.h + 0.4, pz - 0.02));
  // Raised raspberry line and pink band along the painted arch, open at the ground
  const L = frameLayout(PW, PH);
  const archW = (L.x1 - L.x0) * k;
  const spring = (PH - L.spring) * k;
  const rise = L.A * k;
  const ring = (d, t, color) => {
    const geo = shapeGeo(archRing(archW + 2 * d, spring, rise + d * 1.3, t, { open: true }), 0.045, 12);
    add(at(mesh(geo, mat(color, { rough: 0.6 })), 0, 0, pz));
  };
  ring(0.085, 0.085, C.band);
  ring(0.14, 0.055, C.raspDeep);
  for (const s of [-1, 1]) add(at(box(0.04, PORTAL.h - 0.04, 0.05, PAL.frame), s * (PORTAL.w / 2 - 0.02), PORTAL.h / 2, pz + 0.02));

  // Door: deep raspberry double door with glowing arched lights and brass handles
  const DW = 1.34;
  const dSpring = 1.5;
  const dRise = DOOR_H - dSpring;
  add(at(mesh(shapeGeo(archShape(DW, dSpring, dRise), 0.06), mat(C.door, { rough: 0.6 })), 0, 0, pz));
  add(at(mesh(shapeGeo(archRing(DW + 0.14, dSpring, dRise + 0.09, 0.07, { open: true }), 0.08), brass()), 0, 0, pz));
  add(at(box(0.03, DOOR_H - 0.12, 0.02, C.doorDeep), 0, (DOOR_H - 0.12) / 2, pz + 0.07));
  const lightGeo = shapeGeo(archShape(0.4, 0.42, 0.2), 0.01);
  for (const s of [-1, 1]) {
    add(at(mesh(lightGeo, glow('#ffc978', 0.6)), s * 0.32, 1.02, pz + 0.062));
    add(at(rbox(0.44, 0.5, 0.02, C.doorDeep), s * 0.32, 0.55, pz + 0.065));
    add(at(sph(0.04, brass(), undefined, 10), s * 0.08, 1.0, pz + 0.1));
    for (const y of [0.25, 0.85]) add(at(sph(0.025, brass(), undefined, 8), s * 0.55, y, pz + 0.07));
  }
  add(at(box(1.9, 0.08, 0.4, C.cream), 0, 0.04, pz + 0.2));
  add(at(box(1.92, 0.025, 0.42, C.raspDeep), 0, 0.075, pz + 0.2));
  // Brass lanterns on brackets either side of the door, inside the arch
  for (const s of [-1, 1]) {
    add(at(box(0.04, 0.04, 0.3, brass()), s * 1.08, 2.05, pz + 0.15));
    add(at(cyl(0.008, 0.008, 0.16, brass(), 4), s * 1.08, 1.97, pz + 0.28));
    add(at(lantern(0.95), s * 1.08, 1.38, pz + 0.28));
  }

  // ---------------------------------------------------------------- arched windows in small logo-card panels
  const WP = { w: 0.95, h: 1.36, y: 0.86 };
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
  for (const s of [-1, 1]) {
    const x = s * 2.3;
    add(at(mesh(new THREE.PlaneGeometry(WP.w, WP.h), texMat(panelTex), { cast: false }), x, WP.y + WP.h / 2, FRONT + 0.008));
    add(at(mesh(glassGeo, glow('#ffd59a', 0.45)), x, WP.y + gb, FRONT + 0.01));
    add(at(mesh(winRing, mat(C.band)), x, WP.y + gb - 0.05, FRONT + 0.01));
    add(at(mesh(winRing2, mat(C.raspDeep)), x, WP.y + gb - 0.08, FRONT + 0.01));
    add(at(box(0.03, gs + gr - 0.04, 0.03, C.cream), x, WP.y + gb + (gs + gr) / 2, FRONT + 0.04));
    add(at(box(gw, 0.03, 0.03, C.cream), x, WP.y + gb + gs, FRONT + 0.04));
    add(at(box(gw + 0.24, 0.06, 0.2, C.cream), x, WP.y + gb - 0.06, FRONT + 0.1));
    add(at(rbox(gw + 0.1, 0.2, 0.24, C.rasp), x, WP.y + gb - 0.2, FRONT + 0.14));
    for (let i = 0; i < 7; i++) {
      const lx = x - gw / 2 + 0.06 + (i * (gw - 0.12)) / 6;
      add(at(sph(0.07, i % 2 ? C.leaf : C.leafDeep, { rough: 0.85 }, 6), lx, WP.y + gb - 0.06, FRONT + 0.16));
      if (i % 2 === 0) add(at(sph(0.05, i % 4 ? C.rose : C.rasp, { rough: 0.7 }, 6), lx + 0.03, WP.y + gb - 0.01, FRONT + 0.21));
    }
  }

  // ---------------------------------------------------------------- greenery: vines up the corners, roses, olives
  for (const s of [-1, 1]) {
    const x = s * (W / 2 - 0.12);
    add(vine(r, [[x, 0.62], [x - s * 0.05, 1.1], [x + s * 0.03, 1.6], [x - s * 0.04, 2.1], [x - s * 0.18, 2.5], [x - s * 0.55, 2.62]], FRONT + 0.02));
    add(at(roseBush(r, 1.05), s * (W / 2 - 0.2), 0, FRONT + 0.32));
    add(at(roseBush(r, 0.8), s * (PORTAL.w / 2 + 0.12), 0, FRONT + 0.36));
    add(at(K.makeOliveTree(1.0, C.cream, s > 0 ? 5 : 6), s * 1.32, 0, pz + 0.42));
    st.addCollider({ type: 'circle', x: s * 1.32, z: pz + 0.42, r: 0.26 });
  }
  st.addCollider({ type: 'box', x: 0, z: -0.6, hw: 3.0, hd: 1.8 });
  st.addCollider({ type: 'box', x: 0, z: pz - 0.1, hw: PORTAL.w / 2, hd: 0.2 });

  // ---------------------------------------------------------------- outdoor seating: bistro tables under parasols
  const pMat = parasolMaterial();
  const dishes = [[shawarma, latte], [cakeSlice, latte]];
  [-3.4, 3.4].forEach((x, i) => {
    const z = 2.5;
    add(at(cyl(0.42, 0.42, 0.045, C.cream, 22, { rough: 0.5 }), x, 0.75, z));
    add(at(rot(tor(0.42, 0.02, brass(), undefined, Math.PI * 2, 24), Math.PI / 2, 0, 0), x, 0.75, z));
    add(at(cyl(0.035, 0.035, 0.72, brass(), 8), x, 0.38, z));
    add(at(cyl(0.2, 0.24, 0.04, brass(), 16), x, 0.02, z));
    add(at(rot(chair(), 0, Math.PI / 2, 0), x - 0.62, 0, z));
    add(at(rot(chair(), 0, -Math.PI / 2, 0), x + 0.62, 0, z));
    const [a, b] = dishes[i];
    add(at(a(), x - 0.14, 0.775, z + 0.04));
    add(at(b(), x + 0.17, 0.775, z - 0.08));
    add(at(cyl(0.025, 0.025, 1.65, brass(), 8), x, 1.6, z));
    add(at(mesh(new THREE.ConeGeometry(0.9, 0.42, 24, 1, true), pMat), x, 2.4, z));
    add(at(sph(0.05, brass(), undefined, 8), x, 2.64, z));
    st.addCollider({ type: 'circle', x, z, r: 1.0 });
  });

  // ---------------------------------------------------------------- landmarks: a giant brass lantern, a cake and a dallah
  add(at(rbox(0.56, 0.5, 0.56, C.cream, 0.04), -3.8, 0.25, -1.3));
  const plinthTile = texMat(themedTexture(256, 256, (c, w) => drawTile(c, 0, 0, w, { ground: '#fbefe2' })));
  add(at(mesh(new THREE.PlaneGeometry(0.46, 0.4), plinthTile, { cast: false }), -3.8, 0.25, -1.015));
  add(at(lantern(2.5), -3.8, 0.5, -1.3));
  st.addCollider({ type: 'circle', x: -3.8, z: -1.3, r: 0.42 });
  add(at(K.makeOliveTree(1.7, C.rasp, 8), 3.8, 0, -1.3));
  st.addCollider({ type: 'circle', x: 3.8, z: -1.3, r: 0.34 });

  const cake = bigCake();
  K.colorBake(cake);
  cake.position.set(-1.95, H + 0.13, -1.05);
  add(cake);
  const pot = K.makeDallah(1.15);
  pot.rotation.y = -0.5;
  pot.position.set(2.0, H + 0.13, -1.1);
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
    badgeY: 6.1,
    dynamic: [cake],
    update(dt, t, near) {
      cake.rotation.y = t * 0.4;
      cake.position.y = H + 0.13 + Math.sin(t * 1.6) * 0.04;
      steam.forEach((s, i) => {
        const q = (t * 0.4 + i / steam.length) % 1;
        s.position.set(spout.x + q * 0.25 + Math.sin(q * 5 + i) * 0.08, spout.y + q * 1.0, spout.z + q * 0.1);
        s.scale.setScalar(0.25 + q * 0.5);
        s.material.opacity = 0.55 * (1 - q) * (0.5 + near * 0.5);
      });
    },
  };
}
