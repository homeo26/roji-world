import * as THREE from 'three';
import { box, rbox, cyl, sph, tor, at, rot, mat, umat, mesh, canvasTexture, roundRect, FONT, glowTex, pattern, colorBake } from '../../places/home/kit.js';

// Models shared by the Clay Café, the pottery wheel and the drawing pad: wheels, stools, the kiln,
// shelves, aprons, plants, cups, the easel and speech bubbles. Everything faces +Z, base at y = 0.

export { box, rbox, cyl, sph, tor, at, rot, mat, umat, mesh, canvasTexture, roundRect, FONT, glowTex, pattern, colorBake };

export const COL = {
  terra: '#d9734e',
  terraDark: '#b85a39',
  clay: '#c46b47',
  cream: '#fdf0df',
  cream2: '#fff7ee',
  peach: '#ffd9c4',
  wood: '#c98f5f',
  woodDark: '#8d5a3a',
  woodLight: '#e2b685',
  mint: '#8fd6c6',
  mintDark: '#5fb7a6',
  rose: '#ff8fb1',
  pink: '#ef5b6f',
  sun: '#ffd166',
  sky: '#6fb8ff',
  lilac: '#b99af5',
  steel: '#c4cad3',
  steelDark: '#8d96a3',
  ink: '#4a3423',
  leaf: '#5aa84f',
  leaf2: '#7cc46a',
};

// A pottery wheel: chunky body, splash pan and a spinning head. head: the group to spin; the clay sits on it at y = 0.
export function makeWheel(body = COL.mint) {
  const root = new THREE.Group();
  for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) root.add(at(cyl(0.035, 0.045, 0.07, '#6b5a6e', 8), x, 0.035, z));
  root.add(at(rbox(0.64, 0.34, 0.64, body, 0.09), 0, 0.24, 0));
  root.add(at(box(0.5, 0.035, 0.02, '#ffffff'), 0, 0.3, 0.325));
  root.add(at(sph(0.035, COL.sun, undefined, 10), 0.22, 0.18, 0.32));
  root.add(at(cyl(0.35, 0.31, 0.08, '#f3e6dc', 22), 0, 0.445, 0));
  root.add(at(cyl(0.31, 0.31, 0.012, '#c98a6a', 22), 0, 0.488, 0));
  root.add(rot(at(tor(0.345, 0.022, '#fff7ee', undefined, Math.PI * 2, 5, 24), 0, 0.485, 0), Math.PI / 2, 0, 0));
  root.add(at(cyl(0.04, 0.04, 0.04, COL.steelDark, 10), 0, 0.5, 0));
  const head = new THREE.Group();
  head.position.y = 0.535;
  head.add(at(cyl(0.21, 0.2, 0.03, mat(COL.steel, { metal: 0.4, rough: 0.35 }), 24), 0, -0.015, 0));
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    head.add(at(cyl(0.022, 0.022, 0.034, '#6b7480', 8), Math.sin(a) * 0.17, -0.013, Math.cos(a) * 0.17));
  }
  root.add(head);
  // Foot pedal and a water bowl with a sponge
  root.add(at(rbox(0.16, 0.05, 0.22, '#6b5a6e', 0.02), 0.36, 0.025, 0.3));
  root.add(at(cyl(0.09, 0.07, 0.06, '#ffffff', 14), -0.25, 0.51, 0.25));
  root.add(at(cyl(0.08, 0.08, 0.01, '#9fd8ef', 14), -0.25, 0.535, 0.25));
  root.add(at(rbox(0.07, 0.035, 0.05, COL.sun, 0.015), -0.25, 0.55, 0.25));
  return { root, head, top: 0.535 };
}

// Round stool, seat top at h.
export function makeStool(seat = COL.terra, h = 0.45) {
  const g = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.5;
    const leg = cyl(0.022, 0.028, h - 0.04, COL.woodDark, 8);
    leg.rotation.set(Math.cos(a) * 0.12, 0, -Math.sin(a) * 0.12);
    g.add(at(leg, Math.sin(a) * 0.12, (h - 0.04) / 2, Math.cos(a) * 0.12));
  }
  g.add(rot(at(tor(0.135, 0.014, COL.woodDark, undefined, Math.PI * 2, 5, 18), 0, h * 0.4, 0), Math.PI / 2, 0, 0));
  g.add(at(cyl(0.2, 0.19, 0.05, COL.wood, 20), 0, h - 0.045, 0));
  const cushion = at(sph(0.19, seat, undefined, 18), 0, h - 0.02, 0);
  cushion.scale.set(1, 0.2, 1);
  g.add(cushion);
  return g;
}

// Café chair facing +Z, seat top at 0.46.
export function makeChair(color = COL.terra) {
  const g = new THREE.Group();
  for (const [x, z] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) g.add(at(cyl(0.022, 0.026, 0.42, COL.woodDark, 6), x, 0.21, z));
  g.add(at(box(0.44, 0.06, 0.44, COL.wood), 0, 0.43, 0));
  g.add(at(rbox(0.4, 0.04, 0.4, color, 0.02), 0, 0.47, 0));
  for (const x of [-0.17, 0.17]) g.add(at(cyl(0.02, 0.02, 0.42, COL.woodDark, 6), x, 0.67, -0.19));
  g.add(at(rbox(0.44, 0.2, 0.05, color, 0.025), 0, 0.82, -0.2));
  g.add(at(sph(0.03, '#ffffff', undefined, 8), 0, 0.82, -0.17));
  return g;
}

// Round café table, top at 0.75.
export function makeTable(r = 0.5, top = '#fff8ee') {
  const g = new THREE.Group();
  g.add(at(cyl(r, r, 0.05, top, 28), 0, 0.735, 0));
  g.add(at(cyl(r + 0.01, r + 0.01, 0.02, COL.terra, 28), 0, 0.705, 0));
  g.add(at(cyl(0.05, 0.06, 0.68, COL.woodDark, 10), 0, 0.36, 0));
  g.add(at(cyl(0.26, 0.29, 0.04, COL.woodDark, 18), 0, 0.02, 0));
  return g;
}

// Coffee cup on a saucer (about 0.1 m tall), and the top of the drink for steam.
export function makeCup(color = '#ffffff', drink = '#8d5532') {
  const g = new THREE.Group();
  g.add(at(cyl(0.085, 0.075, 0.015, color, 16), 0, 0.008, 0));
  g.add(at(cyl(0.055, 0.042, 0.085, color, 16), 0, 0.058, 0));
  g.add(at(cyl(0.05, 0.05, 0.004, drink, 14), 0, 0.098, 0));
  g.add(rot(at(tor(0.026, 0.008, color, undefined, Math.PI * 2, 5, 10), 0.058, 0.06, 0), 0, 0, 0));
  return g;
}

// A plain glazed pot from a few [r, y] points (merged into the room, unlike the saved pots).
const vaseShapes = [
  [[0, 0], [0.08, 0], [0.11, 0.05], [0.12, 0.12], [0.09, 0.2], [0.05, 0.24], [0.06, 0.27]],
  [[0, 0], [0.06, 0], [0.09, 0.06], [0.09, 0.16], [0.04, 0.24], [0.035, 0.3], [0.045, 0.32]],
  [[0, 0], [0.07, 0], [0.12, 0.04], [0.15, 0.1], [0.155, 0.12]],
  [[0, 0], [0.09, 0], [0.11, 0.04], [0.11, 0.14], [0.09, 0.17], [0.08, 0.18]],
  [[0, 0], [0.05, 0], [0.08, 0.1], [0.11, 0.18], [0.12, 0.2]],
];
const vaseGeos = new Map();
export function makeVase(kind, color, scale = 1) {
  const key = kind;
  if (!vaseGeos.has(key)) vaseGeos.set(key, new THREE.LatheGeometry(vaseShapes[kind % vaseShapes.length].map(([r, y]) => new THREE.Vector2(r, y)), 12));
  const m = mesh(vaseGeos.get(key), mat(color, { rough: 0.3 }), { cast: false });
  m.scale.setScalar(scale);
  return m;
}

// A mug with a handle, about 0.12 m tall.
export function makeMug(color, band = '#ffffff') {
  const g = new THREE.Group();
  g.add(at(cyl(0.05, 0.045, 0.11, mat(color, { rough: 0.3 }), 14), 0, 0.055, 0));
  g.add(at(cyl(0.051, 0.051, 0.015, mat(band, { rough: 0.3 }), 14), 0, 0.085, 0));
  g.add(at(tor(0.028, 0.009, mat(color, { rough: 0.3 }), undefined, Math.PI * 2, 5, 10), 0.055, 0.06, 0));
  return g;
}

// Potted plant: leafy ball or a tall leafy one.
export function makePlant(size = 1, potColor = COL.terra, kind = 'round') {
  const g = new THREE.Group();
  g.add(at(cyl(0.16 * size, 0.12 * size, 0.24 * size, potColor, 14), 0, 0.12 * size, 0));
  g.add(at(cyl(0.165 * size, 0.165 * size, 0.04 * size, COL.cream2, 14), 0, 0.23 * size, 0));
  if (kind === 'tall') {
    for (let k = 0; k < 7; k++) {
      const a = k * 2.4;
      const leaf = at(sph(0.09 * size, k % 2 ? COL.leaf : COL.leaf2, { rough: 0.8 }, 8), Math.sin(a) * 0.09 * size, (0.38 + k * 0.09) * size, Math.cos(a) * 0.09 * size);
      leaf.scale.set(0.8, 1.6, 0.5);
      leaf.rotation.set(Math.cos(a) * 0.5, a, Math.sin(a) * 0.5);
      g.add(leaf);
    }
  } else {
    for (let k = 0; k < 6; k++) {
      const a = k * 1.1;
      const leaf = at(sph(0.12 * size, k % 2 ? COL.leaf : COL.leaf2, { rough: 0.8 }, 8), Math.sin(a) * 0.08 * size, (0.36 + (k % 3) * 0.07) * size, Math.cos(a) * 0.08 * size);
      leaf.scale.set(1, 0.85, 1);
      g.add(leaf);
    }
  }
  return g;
}

// An apron on a hook (hangs from y = 0 down), facing +Z.
export function makeApron(color, pocket = '#ffffff') {
  const g = new THREE.Group();
  g.add(at(cyl(0.012, 0.012, 0.06, COL.steelDark, 6), 0, 0, 0.0).rotateX(Math.PI / 2));
  for (const s of [-1, 1]) {
    const strap = at(box(0.025, 0.16, 0.01, color), s * 0.07, -0.08, 0.03);
    strap.rotation.z = s * 0.45;
    g.add(strap);
  }
  g.add(at(box(0.2, 0.16, 0.025, color), 0, -0.22, 0.03));
  g.add(at(box(0.34, 0.36, 0.025, color), 0, -0.48, 0.03));
  g.add(at(box(0.16, 0.1, 0.02, pocket), 0, -0.48, 0.05));
  g.add(at(box(0.36, 0.02, 0.02, pocket), 0, -0.3, 0.045));
  return g;
}

// A wooden shelf unit, w wide, d deep, planks at the given heights.
export function makeShelf(w, d, levels, wood = COL.wood) {
  const g = new THREE.Group();
  const top = levels[levels.length - 1];
  for (const y of levels) g.add(at(box(w, 0.05, d, wood), 0, y, 0));
  for (const s of [-1, 1]) g.add(at(box(0.05, top + 0.05, d, COL.woodDark), s * (w / 2 - 0.025), (top + 0.05) / 2, 0));
  return g;
}

// The kiln: a round brick oven with a hinged door, a glowing window and a chimney.
// door: pivot group (rotate y to open). glow: material whose emissive pulses. mouth: inside position.
let brickTex = null;
export function makeKiln() {
  const g = new THREE.Group();
  brickTex ??= pattern(256, 128, '#c8674a', (c, w, h) => {
    c.fillStyle = '#e9c2a8';
    for (let j = 0; j <= 4; j++) c.fillRect(0, (j * h) / 4 - 2, w, 4);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) c.fillRect(((i + (j % 2) * 0.5) * w) / 4 - 2, (j * h) / 4, 4, h / 4);
    c.fillStyle = 'rgba(255,220,190,0.12)';
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if ((i * 3 + j) % 4 === 0) c.fillRect(((i + (j % 2) * 0.5) * w) / 4 + 4, (j * h) / 4 + 4, w / 4 - 8, h / 4 - 8);
  });
  brickTex.repeat.set(3, 2);
  const brick = umat('#ffffff', { rough: 0.9, map: brickTex });
  g.add(at(rbox(1.5, 0.22, 1.3, '#e9d8c8', 0.05), 0, 0.11, 0));
  const body = mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.85, 28), brick);
  g.add(at(body, 0, 0.645, 0));
  const dome = mesh(new THREE.SphereGeometry(0.62, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), brick);
  g.add(at(dome, 0, 1.07, 0));
  g.add(at(tor(0.63, 0.04, '#9c4a30', undefined, Math.PI * 2, 6, 32), 0, 1.07, 0).rotateX(Math.PI / 2));
  g.add(at(cyl(0.11, 0.12, 0.6, '#8d96a3', 14, { metal: 0.4, rough: 0.4 }), 0.25, 1.75, -0.2));
  g.add(at(cyl(0.16, 0.13, 0.06, '#6b7480', 14, { metal: 0.4, rough: 0.4 }), 0.25, 2.07, -0.2));
  // Mouth: dark arch with the warm inside, then the door on a hinge
  const mouthZ = 0.6;
  g.add(at(rbox(0.66, 0.62, 0.12, '#9c4a30', 0.08), 0, 0.68, mouthZ));
  const glow = umat('#ffb36b', { emissive: '#ff7a2f', ei: 0.15, rough: 0.9 });
  const inside = mesh(new THREE.PlaneGeometry(0.5, 0.48), glow, { cast: false });
  g.add(at(inside, 0, 0.68, mouthZ + 0.065));
  const door = new THREE.Group();
  door.position.set(-0.3, 0.68, mouthZ + 0.08);
  const panel = at(rbox(0.58, 0.56, 0.06, '#6b7480', 0.06, { metal: 0.35, rough: 0.45 }), 0.29, 0, 0);
  door.add(panel);
  door.add(at(cyl(0.11, 0.11, 0.02, '#ffcf8a', 20).rotateX(Math.PI / 2), 0.29, 0.06, 0.035));
  const win = mesh(new THREE.CircleGeometry(0.09, 20), glow, { cast: false });
  door.add(at(win, 0.29, 0.06, 0.047));
  door.add(at(rbox(0.06, 0.2, 0.05, COL.ink, 0.02), 0.5, -0.1, 0.05));
  for (const y of [-0.18, 0.18]) door.add(at(cyl(0.025, 0.025, 0.08, '#4a4f58', 8), 0.0, y, 0));
  g.add(door);
  // Temperature dial
  const dialTex = canvasTexture(128, 128, (c, w) => {
    c.fillStyle = '#fffaf1';
    c.beginPath();
    c.arc(w / 2, w / 2, w / 2 - 4, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 8;
    c.strokeStyle = '#6b7480';
    c.stroke();
    const arc = (a0, a1, col) => {
      c.strokeStyle = col;
      c.lineWidth = 14;
      c.beginPath();
      c.arc(w / 2, w / 2, w / 2 - 22, a0, a1);
      c.stroke();
    };
    arc(Math.PI * 0.8, Math.PI * 1.3, '#7fd3a7');
    arc(Math.PI * 1.3, Math.PI * 1.8, '#ffd166');
    arc(Math.PI * 1.8, Math.PI * 2.2, '#ef5b6f');
  });
  const dial = mesh(new THREE.CircleGeometry(0.1, 20), umat('#ffffff', { map: dialTex, rough: 0.6 }), { cast: false });
  dial.rotation.y = 0.65;
  g.add(at(dial, 0.48, 1.05, 0.48));
  const needle = new THREE.Group();
  needle.position.set(0.485, 1.05, 0.49);
  needle.rotation.y = 0.65;
  needle.add(at(box(0.012, 0.07, 0.008, '#ef5b6f'), 0, 0.03, 0));
  g.add(needle);
  return { root: g, door, glow, needle, mouth: new THREE.Vector3(0, 0.6, mouthZ - 0.1), chimney: new THREE.Vector3(0.25, 2.15, -0.2) };
}

// An easel with a canvas board. face: the paper plane (give it a material). Paper centre at (0, cy, 0).
export function makeEasel({ w = 1.2, h = 0.9, cy = 1.12, tilt = 0.1, paper = null } = {}) {
  const g = new THREE.Group();
  const lean = new THREE.Group();
  lean.position.set(0, cy, 0);
  lean.rotation.x = -tilt;
  g.add(lean);
  const legLen = cy + h / 2 + 0.22;
  // Front legs stand just outside the board's edges, so nothing covers the paper
  for (const s of [-1, 1]) {
    const leg = rbox(0.06, legLen, 0.05, COL.wood, 0.02);
    leg.rotation.z = s * 0.06;
    g.add(at(leg, s * (w / 2 + 0.1), legLen / 2 - 0.02, -0.02));
    g.add(at(rbox(0.1, 0.05, 0.08, COL.woodDark, 0.02), s * (w / 2 + 0.1 + Math.sin(0.06) * legLen * 0.5), 0.025, -0.02));
  }
  const back = rbox(0.05, legLen * 0.98, 0.05, COL.wood, 0.02);
  back.rotation.x = 0.32;
  g.add(at(back, 0, legLen * 0.47, -0.3));
  lean.add(at(rbox(w + 0.08, h + 0.08, 0.04, '#f6ead7', 0.02), 0, 0, -0.03));
  lean.add(at(rbox(w + 0.38, 0.06, 0.12, COL.wood, 0.02), 0, -h / 2 - 0.06, 0.03));
  lean.add(at(rbox(0.22, 0.06, 0.07, COL.woodDark, 0.02), 0, h / 2 + 0.09, -0.01));
  const face = mesh(new THREE.PlaneGeometry(w, h), paper || mat('#fffdf8'), { cast: false });
  face.position.z = -0.005;
  lean.add(face);
  return { root: g, lean, face };
}

// Freeze a kid in a pose so it bakes into the room (a barista behind the counter).
// Curved parts get half the segments: the room camera sees them from afar.
export function freezeKid(kid, { pose = 'stand', hands = null } = {}) {
  kid.pose = pose;
  kid.hands = hands;
  kid.update(1 / 60, 0, 0, 0, 0);
  const half = (n, min) => Math.max(min, Math.round(n * 0.5));
  kid.root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.material.isMeshBasicMaterial && o.parent === kid.head) {
      const c = new THREE.Color(kid.look.skin).lerp(o.material.color, o.material.opacity);
      o.material = mat('#' + c.getHexString(), { rough: 0.6 });
    }
    const p = o.geometry.parameters;
    const t = o.geometry.type;
    let next = null;
    if (t === 'SphereGeometry') next = new THREE.SphereGeometry(p.radius, half(p.widthSegments, 8), half(p.heightSegments, 6), p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
    else if (t === 'TorusGeometry') next = new THREE.TorusGeometry(p.radius, p.tube, half(p.radialSegments, 4), half(p.tubularSegments, 8), p.arc);
    else if (t === 'CapsuleGeometry') next = new THREE.CapsuleGeometry(p.radius, p.height, 2, half(p.radialSegments, 6));
    else if (t === 'LatheGeometry') next = new THREE.LatheGeometry(p.points, half(p.segments, 10), p.phiStart, p.phiLength);
    if (next) o.geometry = next;
  });
  kid.blob.visible = false;
  return kid;
}

// A speech bubble sprite that pops in and out. set(text), hide(), update(dt, worldPos).
export function speechBubble(THREE_, scene, { width = 1.0, color = COL.terra } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 220;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, opacity: 0 }));
  s.renderOrder = 8;
  s.visible = false;
  scene.add(s);
  let k = 0;
  let on = false;
  let life = 0;
  return {
    sprite: s,
    set(text, ms = 2600) {
      const c = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      c.clearRect(0, 0, w, h);
      c.font = `600 44px ${FONT}`;
      const words = text.split(' ');
      const lines = [];
      let line = '';
      for (const wd of words) {
        const test = line ? `${line} ${wd}` : wd;
        if (c.measureText(test).width > w - 70 && line) {
          lines.push(line);
          line = wd;
        } else line = test;
      }
      lines.push(line);
      const bh = Math.min(h - 50, 40 + lines.length * 50);
      const top = h - 46 - bh;
      c.fillStyle = '#ffffff';
      c.strokeStyle = color;
      c.lineWidth = 8;
      roundRect(c, 8, top, w - 16, bh, 40);
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(w / 2 - 26, top + bh - 4);
      c.lineTo(w / 2, h - 6);
      c.lineTo(w / 2 + 26, top + bh - 4);
      c.fill();
      c.stroke();
      c.fillRect(w / 2 - 22, top + bh - 12, 44, 10);
      c.fillStyle = '#4a3423';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      lines.forEach((ln, i) => c.fillText(ln, w / 2, top + 24 + i * 50 + 22));
      tex.needsUpdate = true;
      on = true;
      life = ms / 1000;
    },
    hide() {
      on = false;
    },
    get width() {
      return width * (0.7 + 0.3 * k);
    },
    // Keep the bubble inside a screen rectangle (pixels), sliding it at the same depth
    fit(camera, { left = 10, right = window.innerWidth - 10, top = 62, bottom = window.innerHeight - 10 } = {}) {
      if (!s.visible) return;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const p = s.position.clone().project(camera);
      const r = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(s.scale.x / 2).add(s.position).project(camera);
      const hw = Math.abs(r.x - p.x);
      const hh = hw * (220 / 512) * (W / H);
      const minX = (left / W) * 2 - 1 + hw;
      const maxX = (right / W) * 2 - 1 - hw;
      const maxY = 1 - (top / H) * 2 - hh;
      const minY = 1 - (bottom / H) * 2 + hh;
      p.x = minX > maxX ? (minX + maxX) / 2 : Math.min(maxX, Math.max(minX, p.x));
      p.y = Math.min(maxY, Math.max(minY, p.y));
      s.position.copy(p.unproject(camera));
    },
    update(dt, pos) {
      if (on) {
        life -= dt;
        if (life <= 0) on = false;
      }
      k += ((on ? 1 : 0) - k) * Math.min(1, dt * 10);
      s.visible = k > 0.02;
      s.material.opacity = Math.min(1, k * 1.2);
      const sc = width * (0.7 + 0.3 * k);
      s.scale.set(sc, sc * (220 / 512), 1);
      s.position.copy(pos);
    },
  };
}

// Little label for signs, on a canvas texture.
export function signTex(lines, { w = 512, h = 160, bg = '#fff7ea', border = COL.terra, color = COL.ink, accent = COL.terra } = {}) {
  return canvasTexture(w, h, (c) => {
    c.fillStyle = bg;
    roundRect(c, 6, 6, w - 12, h - 12, 30);
    c.fill();
    c.lineWidth = 10;
    c.strokeStyle = border;
    c.stroke();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const fitText = (text, size, y, col) => {
      c.fillStyle = col;
      c.font = `600 ${size}px ${FONT}`;
      const tw = c.measureText(text).width;
      if (tw > w - 60) c.font = `600 ${Math.floor((size * (w - 60)) / tw)}px ${FONT}`;
      c.fillText(text, w / 2, y);
    };
    if (lines.length === 1) fitText(lines[0], Math.round(h * 0.46), h / 2 + 4, color);
    else {
      fitText(lines[0], Math.round(h * 0.24), h * 0.32, accent);
      fitText(lines[1], Math.round(h * 0.34), h * 0.66, color);
    }
  });
}

// Studio floor planks with dried clay splats (repeat it with texture.repeat).
export function woodFloorTex() {
  return pattern(256, 256, '#e8c497', (c, w, h) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? '#e8c497' : '#dfb586';
      c.fillRect(0, (i * h) / 8, w, h / 8);
      c.fillStyle = 'rgba(140,90,50,0.22)';
      c.fillRect(0, (i * h) / 8, w, 2);
      c.fillRect((i * 97) % w, (i * h) / 8, 3, h / 8);
    }
    c.fillStyle = 'rgba(196,107,71,0.28)';
    for (const [x, y, r] of [[60, 70, 9], [70, 78, 4], [190, 180, 7], [140, 30, 5], [30, 210, 6]]) {
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
  });
}

// Striped wallpaper with a painted wainscot at the bottom; one tile is 1 m wide and `h` m tall.
export function stripeWallTex(base = '#e4f5ee', stripe = '#cdeadf', band = '#a9d8c6', wains = 0.27) {
  const t = canvasTexture(128, 410, (c, w, h) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    c.fillStyle = stripe;
    for (let i = 0; i < 4; i++) c.fillRect(i * 32 + 10, 0, 12, h);
    const wy = h * (1 - wains);
    c.fillStyle = band;
    c.fillRect(0, wy, w, h - wy);
    c.fillStyle = 'rgba(0,0,0,0.06)';
    for (let x = 0; x < w; x += 32) c.fillRect(x, wy, 3, h - wy);
    c.fillStyle = '#ffffff';
    c.fillRect(0, wy - 5, w, 7);
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
