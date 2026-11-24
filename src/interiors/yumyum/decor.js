import * as K from './kit.js';
import * as T from './theme.js';

// Props for the big YumYum: the garden fountain, the oud stage, the cake case, the host stand, majlis cushions,
// the restroom door, the birthday cake, the candle, a dessert for two and painted signs. Each returns a Group
// (base at y = 0, facing +Z) and, where something moves, the parts to animate.

const { THREE, COL, box, rbox, cyl, sph, tor, at, rot, mat, umat, mesh, FONT } = K;
const B = () => mat(COL.brass, K.BRASS);

// A leaf cluster or a rose: a low-poly ball (20 triangles), like the town's trees.
export function bud(r, color, rough = 0.85) {
  const m = mesh(K.cg('yumBud', () => new THREE.IcosahedronGeometry(1, 0)), mat(color, { rough }));
  m.scale.setScalar(r);
  m.rotation.set(r * 31, r * 17, 0);
  return m;
}

// Lighter versions of the kit's olive tree, round table and stool (same look, fewer triangles), base at y = 0.
export function oliveTree(h = 1.2, pot = COL.rasp, seed = 3) {
  const r = K.rng(seed);
  const g = new THREE.Group();
  g.add(at(cyl(0.24, 0.18, 0.36, pot, 10), 0, 0.18, 0));
  g.add(at(cyl(0.25, 0.25, 0.05, COL.cream, 10), 0, 0.36, 0));
  g.add(at(cyl(0.21, 0.21, 0.03, '#7a5a3e', 8), 0, 0.37, 0));
  g.add(at(rot(cyl(0.035, 0.05, h * 0.5, '#8a6a4c', 5), 0, 0, 0.12), 0.03, 0.36 + h * 0.25, 0));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r();
    const y = 0.36 + h * (0.5 + r() * 0.38);
    const b = bud(0.16 + r() * 0.07, i % 2 ? '#8b9466' : '#76804f', 0.9);
    b.scale.y *= 0.85;
    g.add(at(b, Math.cos(a) * 0.2, y, Math.sin(a) * 0.18));
  }
  for (let i = 0; i < 5; i++) g.add(at(bud(0.025, '#4b4a3a', 0.6), (r() - 0.5) * 0.4, 0.36 + h * (0.55 + r() * 0.3), 0.19 + r() * 0.05));
  return g;
}
export function roundTable(rr = 0.45, top = COL.cream) {
  const g = new THREE.Group();
  g.add(at(cyl(rr, rr, 0.05, top, 18, { rough: 0.35 }), 0, 0.75, 0));
  g.add(at(rot(tor(rr, 0.02, COL.brass, K.BRASS, Math.PI * 2, 18), Math.PI / 2, 0, 0), 0, 0.75, 0));
  g.add(at(cyl(0.045, 0.045, 0.7, COL.brass, 8, K.BRASS), 0, 0.37, 0));
  g.add(at(cyl(0.24, 0.27, 0.04, COL.brass, 12, K.BRASS), 0, 0.02, 0));
  return g;
}
export function stool(seat = COL.rasp) {
  const g = new THREE.Group();
  g.add(at(cyl(0.2, 0.22, 0.04, COL.brass, 12, K.BRASS), 0, 0.02, 0));
  g.add(at(cyl(0.035, 0.035, 0.6, COL.brass, 8, K.BRASS), 0, 0.32, 0));
  g.add(at(rot(tor(0.13, 0.012, COL.brass, K.BRASS, Math.PI * 2, 12), Math.PI / 2, 0, 0), 0, 0.26, 0));
  g.add(at(cyl(0.2, 0.19, 0.1, seat, 14, { rough: 0.45 }), 0, 0.66, 0));
  g.add(at(cyl(0.205, 0.205, 0.025, COL.brass, 14, K.BRASS), 0, 0.6, 0));
  return g;
}

// A painted sign: cream paper, raspberry text, a little heart either side. Returns a plane mesh on the atlas.
export function paperSign(atlas, w, h, text, { size = 0.5, sub = '', ink = COL.rasp } = {}) {
  const pw = Math.round(w * 220);
  const ph = Math.round(h * 220);
  return atlas.plane(w, h, pw, ph, (c, W, H) => {
    c.fillStyle = COL.paper;
    K.roundRect(c, 3, 3, W - 6, H - 6, Math.min(H * 0.3, 24));
    c.fill();
    c.strokeStyle = COL.band;
    c.lineWidth = Math.max(3, H * 0.05);
    c.stroke();
    c.fillStyle = ink;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 ${H * size}px ${FONT}`;
    c.fillText(text, W / 2, sub ? H * 0.4 : H / 2 + 2);
    const tw = c.measureText(text).width;
    if (sub) {
      c.font = `500 ${H * size * 0.5}px ${FONT}`;
      c.fillText(sub, W / 2, H * 0.74);
    }
    if (tw < W - H * 1.4) {
      for (const s of [-1, 1]) {
        K.heartPath(c, W / 2 + s * (tw / 2 + H * 0.32), H * (sub ? 0.4 : 0.5), H * 0.26);
        c.fill();
      }
    }
  });
}

// ------------------------------------------------------------------ the garden fountain
// A round basin with a band of floral tiles, a pillar, a bowl and a heart on top. drops: an InstancedMesh of
// water drops, moved by update(t).
export function makeFountain(tileMat, r = 1.3) {
  const g = new THREE.Group();
  const stone = '#f3ebe0';
  g.add(at(cyl(r, r + 0.08, 0.5, stone, 28), 0, 0.25, 0));
  g.add(at(rot(tor(r + 0.02, 0.07, COL.cream, undefined, Math.PI * 2, 32), Math.PI / 2, 0, 0), 0, 0.52, 0));
  g.add(at(cyl(r + 0.1, r + 0.12, 0.06, COL.raspDeep, 28), 0, 0.03, 0));
  // Floral tile band round the basin (the same tiles as the kitchen splashback: tileMat)
  if (tileMat) {
    const bg = new THREE.CylinderGeometry(r + 0.085, r + 0.095, 0.2, 28, 1, true);
    const uv = bg.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 24, uv.getY(i) * 0.62);
    g.add(at(mesh(bg, tileMat, { cast: false }), 0, 0.27, 0));
  }
  const water = mesh(new THREE.CylinderGeometry(r - 0.06, r - 0.06, 0.04, 28), mat('#8fd8e6', { rough: 0.15, emissive: '#4fc0d6', ei: 0.22 }), { cast: false });
  g.add(at(water, 0, 0.46, 0));
  g.add(at(cyl(0.16, 0.24, 0.9, stone, 14), 0, 0.85, 0));
  g.add(at(cyl(0.58, 0.28, 0.2, stone, 20), 0, 1.36, 0));
  g.add(at(rot(tor(0.58, 0.04, COL.cream, undefined, Math.PI * 2, 24), Math.PI / 2, 0, 0), 0, 1.46, 0));
  g.add(at(cyl(0.53, 0.53, 0.03, mat('#8fd8e6', { rough: 0.15, emissive: '#4fc0d6', ei: 0.22 }), 20), 0, 1.44, 0));
  g.add(at(cyl(0.06, 0.1, 0.3, stone, 10), 0, 1.6, 0));
  const heart = new THREE.ExtrudeGeometry(heartGeo(0.3), { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 12 });
  heart.center();
  g.add(at(mesh(heart, mat(COL.rasp, { rough: 0.4 })), 0, 1.92, 0));
  // Coins on the bottom (one of them heart-shaped)
  const cr = K.rng(4);
  for (let i = 0; i < 9; i++) {
    const a = cr() * Math.PI * 2;
    const d = 0.45 + cr() * (r - 0.6);
    g.add(at(cyl(0.05, 0.05, 0.012, COL.brass, 10, K.BRASS), Math.cos(a) * d, 0.475, Math.sin(a) * d));
  }
  // Water drops falling from the bowl into the basin
  const N = 28;
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: '#d8f6ff' }), N);
  drops.castShadow = false;
  drops.frustumCulled = false;
  g.add(drops);
  const m4 = new THREE.Matrix4();
  const update = (t) => {
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const q = (t * 0.9 + (i * 0.37) % 1) % 1;
      const rr = 0.56 + q * 0.42;
      const y = 1.42 + 0.1 * Math.sin(q * Math.PI) - q * q * 0.95;
      m4.makeTranslation(Math.cos(a) * rr, y, Math.sin(a) * rr);
      drops.setMatrixAt(i, m4);
    }
    drops.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return { group: g, drops, update };
}

function heartGeo(s) {
  const sh = new THREE.Shape();
  const n = 32;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    if (i === 0) sh.moveTo((x / 34) * s, ((y + 4) / 30) * s);
    else sh.lineTo((x / 34) * s, ((y + 4) / 30) * s);
  }
  return sh;
}
export const heartShape = heartGeo;

// ------------------------------------------------------------------ the stage and the oud
// An oud held across the lap: a round-backed body, a short neck and a bent-back pegbox. Base at its centre.
export function makeOud() {
  const g = new THREE.Group();
  const wood = mat('#9a5a34', { rough: 0.5 });
  const body = sph(0.2, wood, undefined, 14);
  body.scale.set(1, 1.25, 0.6);
  g.add(body);
  g.add(at(cyl(0.17, 0.17, 0.01, mat('#e9c99a', { rough: 0.6 }), 16), 0, 0, 0.1)).rotation.x = Math.PI / 2;
  g.add(at(rot(cyl(0.05, 0.05, 0.012, '#5a3220', 10), Math.PI / 2, 0, 0), 0, 0.04, 0.108));
  g.add(at(rbox(0.07, 0.3, 0.04, '#6e3d22', 0.015), 0, 0.36, 0.06));
  const peg = at(rbox(0.06, 0.16, 0.035, '#6e3d22', 0.012), 0, 0.53, 0.02);
  peg.rotation.x = -0.9;
  g.add(peg);
  for (let i = 0; i < 4; i++) g.add(at(box(0.004, 0.42, 0.004, '#f5ecd8'), -0.018 + i * 0.012, 0.25, 0.115));
  return g;
}

// A fez: a raspberry cap with a black tassel. Sits on a kid's head (y 0.6 above the head group).
export function makeFez() {
  const g = new THREE.Group();
  g.add(at(cyl(0.15, 0.18, 0.2, COL.raspDeep, 16), 0, 0, 0));
  g.add(at(cyl(0.155, 0.155, 0.01, COL.rasp, 16), 0, 0.1, 0));
  g.add(at(cyl(0.008, 0.008, 0.12, '#2b2026', 4), 0.08, 0.06, 0.1)).rotation.z = 0.5;
  g.add(at(sph(0.025, '#2b2026', undefined, 6), 0.12, 0.0, 0.12));
  return g;
}

// The stage: a low platform with a raspberry skirt, brass edge, a scalloped valance and two lanterns on stands.
export function makeStage(w, d, h = 0.32, glass) {
  const g = new THREE.Group();
  g.add(at(rbox(w, h, d, '#9a5a3e', 0.03), 0, h / 2, 0));
  g.add(at(rbox(w + 0.04, 0.04, d + 0.04, COL.brass, 0.015, K.BRASS), 0, h, 0));
  g.add(at(box(w - 0.1, h - 0.1, 0.02, COL.rasp), 0, h / 2 - 0.02, d / 2 + 0.005));
  for (let i = 0; i < Math.round(w / 0.4); i++) {
    const x = -w / 2 + 0.2 + i * 0.4;
    g.add(at(bud(0.06, COL.brass, 0.35), x, h - 0.07, d / 2 + 0.02));
  }
  // A patterned rug on the stage
  g.add(at(rbox(w * 0.7, 0.02, d * 0.6, COL.rasp, 0.01), 0, h + 0.01, 0.1));
  g.add(at(rbox(w * 0.62, 0.025, d * 0.5, COL.blush, 0.01), 0, h + 0.012, 0.1));
  for (const s of [-1, 1]) {
    const x = s * (w / 2 - 0.25);
    g.add(at(cyl(0.12, 0.16, 0.06, COL.brass, 12, K.BRASS), x, h + 0.03, d / 2 - 0.25));
    g.add(at(cyl(0.025, 0.025, 1.3, COL.brass, 8, K.BRASS), x, h + 0.68, d / 2 - 0.25));
    g.add(at(K.makeLantern(1.1, glass), x, h + 1.33, d / 2 - 0.25));
  }
  return g;
}

// ------------------------------------------------------------------ the cake case
// A long glass case on legs with two shelves; fills come in as props (slots: [{ x, y, z }] in case space).
export function makeCakeCase(w = 2.4, d = 0.62, h = 0.62) {
  const g = new THREE.Group();
  g.add(at(rbox(w, 0.06, d, '#ffffff', 0.02, { rough: 0.3 }), 0, 0.03, 0));
  g.add(at(box(w + 0.02, 0.025, d + 0.02, COL.brass, K.BRASS), 0, 0.012, 0));
  g.add(at(box(w - 0.08, 0.02, d - 0.1, '#f6efe9', { rough: 0.2 }), 0, h * 0.5, 0));
  for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) g.add(at(box(0.03, h, 0.03, COL.brass, K.BRASS), x, h / 2, z));
  g.add(at(box(w + 0.03, 0.03, d + 0.03, COL.brass, K.BRASS), 0, h, 0));
  const glass = new THREE.MeshStandardMaterial({ color: '#eef9ff', roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false });
  const pane = mesh(new THREE.BoxGeometry(w, h - 0.06, d), glass, { cast: false, receive: false });
  g.add(at(pane, 0, h / 2 + 0.03, 0));
  const slots = [];
  const n = Math.round(w / 0.6);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (w / n) * (i + 0.5);
    slots.push({ x, y: 0.06, z: 0 }, { x, y: h * 0.5 + 0.01, z: 0 });
  }
  return { group: g, glass: pane, slots };
}

// ------------------------------------------------------------------ the host stand
export function makeHostStand(atlas) {
  const g = new THREE.Group();
  g.add(at(rbox(0.8, 1.0, 0.5, COL.cream, 0.04), 0, 0.5, 0));
  g.add(at(box(0.7, 0.6, 0.02, COL.rasp), 0, 0.5, 0.255));
  g.add(at(rot(rbox(0.9, 0.05, 0.6, COL.woodDark, 0.02), -0.18, 0, 0), 0, 1.04, 0));
  g.add(at(box(0.82, 0.04, 0.52, COL.brass, K.BRASS), 0, 0.02, 0));
  const plate = atlas.plane(0.56, 0.42, 168, 126, (c, w, h) => {
    T.drawPoster(c, w, h, { logoWidth: 0.7 });
  });
  g.add(at(plate, 0, 0.52, 0.27));
  // The reservations book, a pen and a little brass bell
  g.add(at(rot(box(0.36, 0.03, 0.26, '#fffaf2'), -0.18, 0, 0), -0.08, 1.08, 0.02));
  g.add(at(rot(box(0.18, 0.035, 0.27, COL.raspDeep), -0.18, 0, 0), -0.17, 1.075, 0.02));
  g.add(at(rot(cyl(0.008, 0.008, 0.16, COL.ink, 6), 0, 0.4, Math.PI / 2), 0.06, 1.1, 0.04));
  g.add(at(cyl(0.05, 0.06, 0.012, COL.brass, 12, K.BRASS), 0.3, 1.1, -0.03));
  const bell = sph(0.045, COL.brass, K.BRASS, 10);
  bell.scale.y = 0.75;
  g.add(at(bell, 0.3, 1.13, -0.03));
  g.add(at(sph(0.01, COL.brass, K.BRASS, 6), 0.3, 1.17, -0.03));
  // A tiny vase with a rose
  g.add(at(cyl(0.025, 0.03, 0.09, COL.cream, 8), -0.32, 1.11, -0.06));
  g.add(at(sph(0.03, COL.rasp, undefined, 8), -0.32, 1.19, -0.06));
  return g;
}

// ------------------------------------------------------------------ majlis cushions along a wall
// A low floor seat len long (along X) with a backrest and plump cushions, front toward +Z. Seat top at 0.34.
export function makeMajlis(len = 3) {
  const g = new THREE.Group();
  g.add(at(rbox(len, 0.24, 0.7, COL.raspDeep, 0.05), 0, 0.12, 0));
  g.add(at(rbox(len - 0.04, 0.1, 0.66, COL.cream, 0.04, { rough: 0.9 }), 0, 0.29, 0.01));
  g.add(at(rbox(len, 0.5, 0.18, COL.rasp, 0.06, { rough: 0.9 }), 0, 0.52, -0.27));
  const n = Math.max(2, Math.round(len / 0.55));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (len / n) * (i + 0.5);
    const c = rbox(0.42, 0.36, 0.12, i % 2 ? COL.band : COL.sun, 0.06, { rough: 0.9 });
    c.rotation.x = -0.2;
    g.add(at(c, x, 0.58, -0.15));
  }
  for (let i = 0; i < Math.round(len / 0.3); i++) g.add(at(sph(0.025, COL.brass, K.BRASS, 6), -len / 2 + 0.15 + i * 0.3, 0.06, 0.36));
  return g;
}

// A round brass tray table with tea glasses, base at y = 0, about 0.45 tall.
export function makeTeaTable() {
  const g = new THREE.Group();
  g.add(at(cyl(0.42, 0.42, 0.03, COL.brass, 24, K.BRASS), 0, 0.42, 0));
  g.add(at(rot(tor(0.42, 0.02, COL.brass, K.BRASS, Math.PI * 2, 24), Math.PI / 2, 0, 0), 0, 0.44, 0));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const leg = cyl(0.02, 0.02, 0.46, COL.woodDark, 6);
    leg.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
    g.add(at(leg, Math.cos(a) * 0.22, 0.21, Math.sin(a) * 0.22));
  }
  for (const [x, z] of [[-0.15, 0.08], [0.12, 0.14], [0.05, -0.16]]) {
    g.add(at(cyl(0.035, 0.03, 0.08, mat('#f4e2c8', { rough: 0.2 }), 10), x, 0.475, z));
    g.add(at(cyl(0.03, 0.028, 0.05, '#b5502e', 10), x, 0.47, z));
  }
  g.add(at(K.makeDallah(0.2), 0.18, 0.435, -0.05));
  return g;
}

// ------------------------------------------------------------------ the restroom door, on a wall facing +Z
export function makeRestroomDoor(atlas) {
  const g = new THREE.Group();
  g.add(at(rbox(1.2, 2.25, 0.08, COL.cream, 0.03), 0, 1.125, 0));
  g.add(at(rbox(1.0, 2.1, 0.06, '#e7b9b4', 0.03), 0, 1.05, 0.04));
  for (const y of [0.6, 1.45]) g.add(at(rbox(0.8, 0.6, 0.02, '#f0cbc6', 0.02), 0, y, 0.075));
  g.add(at(sph(0.045, COL.brass, K.BRASS, 10), 0.38, 1.0, 0.1));
  const sign = atlas.plane(0.62, 0.3, 186, 90, (c, w, h) => {
    c.fillStyle = COL.paper;
    K.roundRect(c, 3, 3, w - 6, h - 6, 16);
    c.fill();
    c.strokeStyle = COL.band;
    c.lineWidth = 4;
    c.stroke();
    // A little girl and a little boy
    const person = (x, girl) => {
      c.fillStyle = COL.rasp;
      c.beginPath();
      c.arc(x, h * 0.3, h * 0.1, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      if (girl) {
        c.moveTo(x, h * 0.42);
        c.lineTo(x - h * 0.16, h * 0.8);
        c.lineTo(x + h * 0.16, h * 0.8);
      } else {
        c.rect(x - h * 0.1, h * 0.43, h * 0.2, h * 0.37);
      }
      c.fill();
    };
    person(w * 0.2, true);
    person(w * 0.34, false);
    c.fillStyle = COL.rasp;
    c.font = `600 ${h * 0.3}px ${FONT}`;
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillText('Restrooms', w * 0.43, h * 0.54);
  });
  g.add(at(sign, 0, 2.48, 0.05));
  return g;
}

// ------------------------------------------------------------------ little cakes for the cake case and the domes
// Cheap ones (a few hundred triangles each), base at y = 0, about 0.2 m across.
export function miniCake(kind) {
  const g = new THREE.Group();
  const plate = () => g.add(at(cyl(0.11, 0.1, 0.012, '#ffffff', 12, { rough: 0.3 }), 0, 0.006, 0));
  if (kind === 'pecan-cake' || kind === 'german-cake') {
    plate();
    const [a, b, top] = kind === 'pecan-cake' ? ['#d9a86a', '#fff3dc', '#a8693c'] : ['#5e3424', '#e9d3b4', '#4a2a1d'];
    g.add(at(cyl(0.09, 0.09, 0.05, a, 12), 0, 0.037, 0));
    g.add(at(cyl(0.092, 0.092, 0.015, b, 12), 0, 0.07, 0));
    g.add(at(cyl(0.09, 0.09, 0.04, a, 12), 0, 0.097, 0));
    g.add(at(cyl(0.093, 0.093, 0.018, top, 12), 0, 0.125, 0));
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      g.add(at(sph(0.014, kind === 'pecan-cake' ? '#7a4a2a' : '#fff3dc', undefined, 6), Math.cos(ang) * 0.06, 0.137, Math.sin(ang) * 0.06));
    }
  } else if (kind === 'cupcake') {
    for (const [x, z, c] of [[-0.05, 0, COL.pink], [0.05, 0.02, '#fff3dc'], [0, -0.06, COL.rasp]]) {
      g.add(at(cyl(0.035, 0.026, 0.045, '#e9b07a', 8), x, 0.022, z));
      g.add(at(sph(0.04, c, undefined, 8), x, 0.06, z));
      g.add(at(sph(0.01, '#d23c5b', undefined, 6), x, 0.1, z));
    }
  } else if (kind === 'donut') {
    for (const [x, z, c] of [[-0.05, 0, COL.pink], [0.05, 0.02, '#9b5e3c']]) {
      g.add(at(rot(tor(0.035, 0.018, '#e2a865', undefined, Math.PI * 2, 10), Math.PI / 2, 0, 0), x, 0.018, z));
      g.add(at(rot(tor(0.035, 0.019, c, undefined, Math.PI * 2, 10), Math.PI / 2, 0, 0), x, 0.026, z));
    }
  } else if (kind === 'macarons') {
    [COL.pink, '#aab78a', COL.sun, '#c7a6ff', COL.band].forEach((c, i) => {
      const x = -0.08 + i * 0.04;
      g.add(at(cyl(0.022, 0.022, 0.012, c, 10), x, 0.015, 0));
      g.add(at(cyl(0.019, 0.019, 0.008, '#fffaf2', 10), x, 0.025, 0));
      g.add(at(cyl(0.022, 0.022, 0.012, c, 10), x, 0.035, 0));
    });
  } else {
    // cookies
    for (let i = 0; i < 4; i++) {
      const c = cyl(0.04, 0.04, 0.012, '#d9a86a', 10);
      c.rotation.z = (i % 2 ? 0.1 : -0.1);
      g.add(at(c, -0.06 + i * 0.04, 0.008 + i * 0.012, 0));
    }
  }
  return g;
}

// ------------------------------------------------------------------ the birthday cake with a sparkler
// Two tiers, little candles, and a sparkler whose tip is `tip` (local). flame: the candle flames' material.
export function makeBirthdayCake() {
  const g = new THREE.Group();
  g.add(at(cyl(0.22, 0.2, 0.02, '#ffffff', 20, { rough: 0.3 }), 0, 0.01, 0));
  g.add(at(cyl(0.17, 0.17, 0.13, COL.pink, 20), 0, 0.085, 0));
  g.add(at(rot(tor(0.17, 0.018, '#fffaf2', undefined, Math.PI * 2, 20), Math.PI / 2, 0, 0), 0, 0.15, 0));
  g.add(at(cyl(0.11, 0.11, 0.1, '#fff3e0', 18), 0, 0.2, 0));
  g.add(at(rot(tor(0.11, 0.014, COL.rasp, undefined, Math.PI * 2, 18), Math.PI / 2, 0, 0), 0, 0.25, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(at(sph(0.022, i % 2 ? COL.raspDeep : '#ffffff', undefined, 6), Math.cos(a) * 0.13, 0.16, Math.sin(a) * 0.13));
  }
  const flame = umat('#ffe9a8', { emissive: '#ffb347', ei: 1.4, rough: 0.3 });
  const flames = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const x = Math.cos(a) * 0.07;
    const z = Math.sin(a) * 0.07;
    g.add(at(cyl(0.008, 0.008, 0.07, [COL.sun, COL.pink, '#aab78a', '#6fb8ff'][i], 6), x, 0.285, z));
    const f = sph(0.012, flame, undefined, 6);
    f.scale.y = 1.6;
    g.add(at(f, x, 0.335, z));
    flames.push(f);
  }
  g.add(at(cyl(0.004, 0.004, 0.22, '#c9cfd6', 4, { metal: 0.6, rough: 0.3 }), 0, 0.36, 0));
  return { group: g, flame, flames, tip: new THREE.Vector3(0, 0.47, 0) };
}

// ------------------------------------------------------------------ a candle in a brass holder
export function makeCandle() {
  const g = new THREE.Group();
  g.add(at(cyl(0.06, 0.07, 0.015, COL.brass, 14, K.BRASS), 0, 0.008, 0));
  g.add(at(cyl(0.02, 0.025, 0.05, COL.brass, 10, K.BRASS), 0, 0.04, 0));
  g.add(at(cyl(0.025, 0.025, 0.12, '#fff6e6', 12), 0, 0.125, 0));
  const flameMat = umat('#fff2c4', { emissive: '#ffb347', ei: 1.5, rough: 0.3 });
  const flame = sph(0.018, flameMat, undefined, 8);
  flame.scale.y = 1.8;
  at(flame, 0, 0.21, 0);
  g.add(flame);
  return { group: g, flame, flameMat };
}

// ------------------------------------------------------------------ a dessert for two
// A heart-shaped cake on a plate with two spoons resting on it. bites(k): k 0..1 how much is eaten.
export function makeDessertForTwo() {
  const g = new THREE.Group();
  g.add(at(cyl(0.16, 0.14, 0.018, '#fffaf2', 22, { rough: 0.3 }), 0, 0.009, 0));
  g.add(at(rot(tor(0.155, 0.006, COL.band, undefined, Math.PI * 2, 22), Math.PI / 2, 0, 0), 0, 0.02, 0));
  const cake = new THREE.Group();
  const hg = new THREE.ExtrudeGeometry(heartGeo(0.2), { depth: 0.06, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 10 });
  hg.center();
  const body = mesh(hg, mat('#f1c7cf', { rough: 0.6 }));
  body.rotation.x = -Math.PI / 2;
  cake.add(at(body, 0, 0.05, 0));
  const top = mesh(hg, mat(COL.rasp, { rough: 0.4 }));
  top.rotation.x = -Math.PI / 2;
  top.scale.set(0.85, 0.85, 0.35);
  cake.add(at(top, 0, 0.09, 0.005));
  cake.add(at(sph(0.022, '#d23c5b', undefined, 8), 0, 0.115, -0.01));
  g.add(cake);
  const spoon = () => {
    const s = new THREE.Group();
    s.add(at(rot(cyl(0.006, 0.006, 0.15, '#d9dde3', 6, { metal: 0.6, rough: 0.25 }), Math.PI / 2, 0, 0), 0, 0, -0.07));
    const bowl = sph(0.022, mat('#d9dde3', { metal: 0.6, rough: 0.25 }), undefined, 8);
    bowl.scale.set(0.8, 0.35, 1.1);
    s.add(at(bowl, 0, 0, 0.015));
    return s;
  };
  const spoons = [spoon(), spoon()];
  return { group: g, cake, spoons };
}

// ------------------------------------------------------------------ fairy lights
// Strings between pairs of points with a little sag. Returns { wires (a Group of tubes), bulbs: [Vector3] }.
export function fairyStrings(pairs, { sag = 0.3, every = 0.42 } = {}) {
  const wires = new THREE.Group();
  const bulbs = [];
  for (const [a, b, s = sag] of pairs) {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - 4 * s * t * (1 - t), a.z + (b.z - a.z) * t));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    wires.add(mesh(new THREE.TubeGeometry(curve, 16, 0.008, 3), mat('#5a4638', { rough: 0.8 }), { cast: false }));
    const n = Math.max(3, Math.round(curve.getLength() / every));
    for (let i = 1; i < n; i++) bulbs.push(curve.getPoint(i / n));
  }
  return { wires, bulbs };
}

// One InstancedMesh of glowing bulbs at the given points, warm white with every third one pink.
export function fairyBulbs(points) {
  const geo = new THREE.IcosahedronGeometry(0.042, 0);
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffcf8a', emissiveIntensity: 0.75, roughness: 0.3 });
  const im = new THREE.InstancedMesh(geo, material, Math.max(1, points.length));
  const m4 = new THREE.Matrix4();
  const warm = new THREE.Color('#fff3cf');
  const pink = new THREE.Color('#ff9fbb');
  points.forEach((p, i) => {
    im.setMatrixAt(i, m4.makeTranslation(p.x, p.y - 0.03, p.z));
    im.setColorAt(i, i % 3 === 0 ? pink : warm);
  });
  im.count = points.length;
  im.castShadow = false;
  im.computeBoundingSphere();
  return [im];
}

// A trellis lattice with an alpha cut, w x h, for garden walls.
export function trellisMaterial() {
  return K.cg('yumTrellis', () => {
    const tex = K.canvasTexture(256, 256, (c, w) => {
      c.strokeStyle = '#fbf0dc';
      c.lineWidth = 14;
      for (let i = -2; i <= 4; i++) {
        c.beginPath();
        c.moveTo(i * (w / 2), 0);
        c.lineTo(i * (w / 2) + w, w);
        c.stroke();
        c.beginPath();
        c.moveTo(i * (w / 2) + w, 0);
        c.lineTo(i * (w / 2), w);
        c.stroke();
      }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, alphaTest: 0.5, transparent: false });
  });
}
