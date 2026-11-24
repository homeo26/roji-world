import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, umat, mesh, canvasTexture, roundRect, heartShape, bakeStatic, rng, FONT } from '../../util.js';
import { at, sph, cyl, rbox, heartGeo, heartPath } from './models.js';

// Twelve little secrets around the island, found by walking close (or, for the sky ones, by being
// outside at the right time). Each one plays a soft chime, says a short line, and is saved in
// localStorage 'roji-world-secrets' with a counter: "Little secret 4 of 12".

const KEY = 'roji-world-secrets';
const TOTAL = 12;
const SKY_PHASES = { cloud: ['Golden hour', 'Sunset', 'Dusk'], star: ['Night'] };

// The picnic garden's arched bridge (src/places/picnic.js), for the love lock on its front rail
const BRIDGE = { z: -2.4, x0: 2.2, x1: 7.4, w: 1.3, h: 0.55 };
const archH = (x) => (x <= BRIDGE.x0 || x >= BRIDGE.x1 ? 0 : BRIDGE.h * Math.sin((Math.PI * (x - BRIDGE.x0)) / (BRIDGE.x1 - BRIDGE.x0)));
const postX = (i) => BRIDGE.x0 + 0.12 + (i / 9) * (BRIDGE.x1 - BRIDGE.x0 - 0.24);

const WISHES = [
  'Roji wishes for a hundred more sunsets with Homama.',
  'Homama wishes that Roji always smiles like this.',
  'Roji wishes for lazy Sundays and warm cocoa, together.',
  'Homama wishes every weekend felt like this one.',
  'Roji wishes for a little house full of laughing.',
];

// ---------------------------------------------------------------- textures
function chalkTex() {
  return canvasTexture(512, 360, (c, w, h) => {
    const r = rng(5);
    const chalk = (col, lw, fn) => {
      c.strokeStyle = col;
      c.fillStyle = col;
      c.lineWidth = lw * 1.5;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.globalAlpha = 0.95;
      c.beginPath();
      fn();
      c.stroke();
    };
    const wob = (x) => x + (r() - 0.5) * 3;
    // Sun in the corner
    chalk('#ffd75e', 7, () => c.arc(70, 70, 28, 0, Math.PI * 2));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      chalk('#ffd75e', 6, () => {
        c.moveTo(70 + Math.cos(a) * 40, 70 + Math.sin(a) * 40);
        c.lineTo(70 + Math.cos(a) * 54, 70 + Math.sin(a) * 54);
      });
    }
    // Roji: pigtails and a triangle dress
    const rx = 210;
    chalk('#ff8fb1', 8, () => c.arc(rx, 150, 30, 0, Math.PI * 2));
    chalk('#7a4a26', 8, () => {
      c.arc(rx - 36, 140, 11, 0, Math.PI * 2);
      c.moveTo(rx + 47, 140);
      c.arc(rx + 36, 140, 11, 0, Math.PI * 2);
    });
    chalk('#ff6b8b', 8, () => {
      c.moveTo(rx, 182);
      c.lineTo(rx - 36, 262);
      c.lineTo(rx + 36, 262);
      c.closePath();
    });
    chalk('#ffffff', 7, () => {
      c.moveTo(rx - 14, 262);
      c.lineTo(wob(rx - 16), 300);
      c.moveTo(rx + 14, 262);
      c.lineTo(wob(rx + 16), 300);
    });
    // Homama: short hair, a tee
    const hx = 330;
    chalk('#ffffff', 8, () => c.arc(hx, 146, 30, 0, Math.PI * 2));
    chalk('#3b2b3f', 9, () => c.arc(hx, 140, 30, Math.PI * 1.05, Math.PI * 1.95));
    chalk('#6fb8ff', 8, () => {
      c.moveTo(hx - 24, 186);
      c.lineTo(hx + 24, 186);
      c.lineTo(hx + 20, 248);
      c.lineTo(hx - 20, 248);
      c.closePath();
    });
    chalk('#ffffff', 7, () => {
      c.moveTo(hx - 10, 248);
      c.lineTo(wob(hx - 12), 300);
      c.moveTo(hx + 10, 248);
      c.lineTo(wob(hx + 12), 300);
    });
    // Smiles, and the hands they are holding
    chalk('#ffffff', 4, () => {
      c.arc(rx, 156, 12, 0.3, Math.PI - 0.3);
    });
    chalk('#3b2b3f', 4, () => c.arc(hx, 152, 12, 0.3, Math.PI - 0.3));
    chalk('#ffffff', 7, () => {
      c.moveTo(rx + 26, 205);
      c.quadraticCurveTo(270, 222, hx - 24, 200);
      c.moveTo(rx - 26, 205);
      c.lineTo(rx - 50, 230);
      c.moveTo(hx + 24, 200);
      c.lineTo(hx + 48, 226);
    });
    // A big heart over them, and the letters
    c.globalAlpha = 0.95;
    c.lineWidth = 12;
    c.strokeStyle = '#ef5b6f';
    c.stroke(heartPath(c, 270, 70, 70));
    c.font = `700 50px ${FONT}`;
    c.textAlign = 'center';
    c.fillStyle = '#ffffff';
    c.globalAlpha = 0.9;
    c.fillText('R + H', 430, 320);
    // Chalky grain: rub some of it away
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 2200; i++) {
      c.globalAlpha = 0.2 + r() * 0.4;
      c.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2);
    }
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
  });
}

function carvingTex() {
  return canvasTexture(128, 128, (c, w, h) => {
    const p = heartPath(c, w / 2, h * 0.52, 74);
    c.lineWidth = 11;
    c.strokeStyle = 'rgba(70, 40, 20, 0.95)';
    c.stroke(p);
    c.lineWidth = 3;
    c.strokeStyle = 'rgba(214, 170, 120, 0.9)';
    c.translate(1.5, 2);
    c.stroke(p);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.font = `700 34px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = 'rgba(214, 170, 120, 0.95)';
    c.fillText('R+H', w / 2 + 1.5, h * 0.46 + 2);
    c.fillStyle = 'rgba(70, 40, 20, 0.95)';
    c.fillText('R+H', w / 2, h * 0.46);
  });
}

function snowTex() {
  return canvasTexture(512, 220, (c, w, h) => {
    c.font = `700 88px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const draw = (dx, dy, col) => {
      c.fillStyle = col;
      c.fillText('H loves R', w / 2 - 48 + dx, h / 2 + dy);
      c.fill(heartPath(c, w - 50 + dx, h / 2 - 6 + dy, 60));
    };
    draw(0, 5, 'rgba(255, 255, 255, 0.95)');
    draw(0, 0, 'rgba(126, 160, 205, 0.85)');
  });
}

function plaqueTex() {
  return canvasTexture(256, 64, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f6d27a');
    g.addColorStop(1, '#c99a3e');
    c.fillStyle = g;
    roundRect(c, 2, 2, w - 4, h - 4, 12);
    c.fill();
    c.fillStyle = '#6a4a1e';
    c.font = `700 26px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('Roji + Homama', w / 2 - 12, h / 2 + 1);
    c.fillStyle = '#ef5b6f';
    c.fill(heartPath(c, w - 32, h / 2, 22));
  });
}

function lockTex() {
  return canvasTexture(64, 64, (c, w, h) => {
    c.fillStyle = 'rgba(255, 236, 200, 0.95)';
    c.font = `700 20px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('R+H', w / 2, h * 0.45);
  });
}

function waterTex(a = '#9fe4f0', b = '#6cc4dc') {
  return canvasTexture(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w / 2);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.5)';
    c.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.ellipse(24 + ((i * 37) % 80), 30 + ((i * 53) % 70), 8 + (i % 3) * 3, 3, 0, 0, Math.PI * 2);
      c.stroke();
    }
  });
}

function sandTex() {
  return canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = '#f3dfb4';
    c.fillRect(0, 0, w, h);
    const r = rng(9);
    for (let i = 0; i < 500; i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(200,160,100,0.35)' : 'rgba(255,255,255,0.45)';
      c.fillRect(r() * w, r() * h, 1.5, 1.5);
    }
  });
}

function cometTex() {
  return canvasTexture(256, 64, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.7, 'rgba(255,236,190,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, h / 2);
    c.lineTo(w - 18, h / 2 - 9);
    c.lineTo(w - 18, h / 2 + 9);
    c.closePath();
    c.fill();
    const s = c.createRadialGradient(w - 20, h / 2, 0, w - 20, h / 2, 22);
    s.addColorStop(0, 'rgba(255,255,255,1)');
    s.addColorStop(0.4, 'rgba(255,240,200,0.8)');
    s.addColorStop(1, 'rgba(255,220,160,0)');
    c.fillStyle = s;
    c.fillRect(w - 44, 0, 44, h);
  });
}

// An irregular flat blob (puddle, sand), lying on the ground
function blobGeo(r, wobble = 0.12, seed = 3, n = 28) {
  const rr = rng(seed);
  const ph = [rr() * 6, rr() * 6, rr() * 6];
  const s = new THREE.Shape();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + wobble * (Math.sin(a * 3 + ph[0]) * 0.6 + Math.sin(a * 5 + ph[1]) * 0.3 + Math.sin(a * 2 + ph[2]) * 0.4);
    const x = Math.cos(a) * r * k;
    const y = Math.sin(a) * r * k * 0.8;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  const g = new THREE.ShapeGeometry(s, 2);
  g.rotateX(-Math.PI / 2);
  // ShapeGeometry UVs are in shape units; map them to 0..1 for textures
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / (2 * r) + 0.5, uv.getY(i) / (2 * r) + 0.5);
  return g;
}

function groundDecal(map, w, d, { y = 0.045, order = 0 } = {}) {
  const m = new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const geo = new THREE.PlaneGeometry(w, d);
  geo.rotateX(-Math.PI / 2);
  const p = mesh(geo, m, { cast: false });
  p.position.y = y;
  p.renderOrder = order;
  return p;
}

// Merge every plain-coloured, opaque mesh under `group` into one or two vertex-coloured meshes
// (smooth and flat shaded), so a whole secret costs a draw call or two. `dynamic` parts are left alone.
const VC = {};
function vcMat(flat) {
  const k = flat ? 'flat' : 'smooth';
  VC[k] ||= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: flat ? 0.88 : 0.72, flatShading: flat });
  return VC[k];
}
function vcBake(group, dynamic = []) {
  group.updateMatrixWorld(true);
  const skip = new Set();
  for (const d of dynamic) d.traverse((o) => skip.add(o));
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const lists = { smooth: [], flat: [] };
  const victims = [];
  group.traverse((o) => {
    if (!o.isMesh || skip.has(o) || o.children.length) return;
    const m = o.material;
    if (Array.isArray(m) || m.map || m.transparent || !m.color || (m.emissive && m.emissiveIntensity > 0 && m.emissive.getHex() !== 0)) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    g.morphAttributes = {};
    g.clearGroups();
    rel.multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(rel);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([m.color.r, m.color.g, m.color.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    (m.flatShading ? lists.flat : lists.smooth).push(g);
    victims.push(o);
  });
  for (const o of victims) o.removeFromParent();
  for (const [k, list] of Object.entries(lists)) {
    if (!list.length) continue;
    const merged = mesh(mergeGeometries(list, false), vcMat(k === 'flat'));
    group.add(merged);
  }
  return group;
}

// ---------------------------------------------------------------- small models
function duck(kind) {
  const g = new THREE.Group();
  const white = kind === 'white';
  const bodyC = white ? '#fffdf6' : '#c9a27a';
  const body = sph(0.15, bodyC, { rough: 0.7 }, 14);
  body.scale.set(1.25, 0.78, 0.95);
  at(body, 0, 0.07, 0);
  g.add(body);
  const tail = mesh(new THREE.ConeGeometry(0.06, 0.12, 8), mat(bodyC, { rough: 0.7 }));
  tail.rotation.z = 1.0;
  at(tail, -0.19, 0.12, 0);
  g.add(tail);
  const wing = sph(0.09, white ? '#f3ece0' : '#a07a58', { rough: 0.75 }, 10);
  wing.scale.set(1.3, 0.55, 0.4);
  for (const s of [1, -1]) g.add(at(wing.clone(), -0.02, 0.1, 0.12 * s));
  const head = sph(0.085, white ? '#fffdf6' : '#2f8a5a', { rough: 0.55 }, 12);
  at(head, 0.13, 0.22, 0);
  g.add(head);
  if (!white) g.add(at(cyl(0.05, 0.055, 0.02, '#ffffff', 12), 0.12, 0.15, 0));
  const beak = sph(0.04, '#ffa94d', { rough: 0.5 }, 8);
  beak.scale.set(1.4, 0.45, 0.9);
  at(beak, 0.215, 0.2, 0);
  g.add(beak);
  for (const s of [1, -1]) g.add(at(sph(0.014, '#2b2030', { rough: 0.3 }, 6), 0.18, 0.245, 0.05 * s));
  if (white) {
    for (const s of [1, -1]) {
      const bow = sph(0.026, '#ff7fa3', {}, 8);
      bow.scale.set(0.6, 0.8, 1.3);
      at(bow, 0.1, 0.3, 0.03 * s);
      g.add(bow);
    }
  }
  // Duck faces +X; one mesh, still movable
  return vcBake(g);
}

function bench() {
  const g = new THREE.Group();
  const wood = '#e9b07a';
  const iron = '#4d7c7a';
  for (const dz of [-0.14, 0, 0.14]) g.add(at(rbox(1.6, 0.06, 0.12, wood, 0.02), 0, 0.45, dz));
  for (const y of [0.66, 0.84]) g.add(at(rbox(1.6, 0.11, 0.05, wood, 0.02), 0, y, -0.23));
  for (const s of [-1, 1]) {
    g.add(at(rbox(0.07, 0.45, 0.42, iron, 0.03), s * 0.68, 0.225, 0));
    g.add(at(rbox(0.07, 0.62, 0.06, iron, 0.03), s * 0.68, 0.72, -0.23));
    g.add(at(rbox(0.09, 0.05, 0.44, iron, 0.02), s * 0.68, 0.62, -0.02));
  }
  const plaque = mesh(new THREE.PlaneGeometry(0.36, 0.09), umat('#ffffff', { rough: 0.35, metal: 0.4, map: plaqueTex() }), { cast: false });
  at(plaque, 0, 0.84, -0.202);
  g.add(plaque);
  return g;
}

function bottleModel() {
  const g = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: '#bfe8d6', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.5, depthWrite: false });
  const body = mesh(new THREE.CylinderGeometry(0.07, 0.072, 0.24, 14), glass);
  g.add(body);
  const shoulder = mesh(new THREE.SphereGeometry(0.07, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  at(shoulder, 0, 0.12, 0);
  g.add(shoulder);
  const neck = mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.09, 10), glass);
  at(neck, 0, 0.2, 0);
  g.add(neck);
  const cork = cyl(0.026, 0.024, 0.05, '#b98552', 10);
  at(cork, 0, 0.26, 0);
  g.add(cork);
  const paper = cyl(0.04, 0.04, 0.17, '#fff3d6', 12);
  g.add(paper);
  const ribbon = cyl(0.042, 0.042, 0.025, '#ef5b6f', 12);
  g.add(ribbon);
  g.userData = { cork, glass: [body, shoulder, neck] };
  return vcBake(g, [cork]);
}

function paperBoat() {
  const g = new THREE.Group();
  const paper = mat('#fffdf6', { rough: 0.8, flat: true, side: THREE.DoubleSide });
  const s = new THREE.Shape();
  s.moveTo(-0.13, 0.06);
  s.lineTo(0.13, 0.06);
  s.lineTo(0.08, 0);
  s.lineTo(-0.08, 0);
  s.closePath();
  const hull = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false });
  hull.translate(0, 0, -0.035);
  g.add(mesh(hull, paper));
  const sail = new THREE.Shape();
  sail.moveTo(-0.08, 0.06);
  sail.lineTo(0.08, 0.06);
  sail.lineTo(0, 0.17);
  sail.closePath();
  const sg = new THREE.ExtrudeGeometry(sail, { depth: 0.006, bevelEnabled: false });
  sg.translate(0, 0, -0.003);
  g.add(mesh(sg, paper));
  const heart = mesh(heartGeo(0.04, 0.004, 0), mat('#ef5b6f', { rough: 0.6 }), { cast: false });
  at(heart, 0, 0.1, 0.006);
  g.add(heart);
  return vcBake(g);
}

function mugModel(color, heartColor) {
  const g = new THREE.Group();
  g.add(at(cyl(0.062, 0.058, 0.12, color, 16), 0, 0.06, 0));
  g.add(at(cyl(0.052, 0.052, 0.005, '#7a4a2a', 14), 0, 0.115, 0));
  const handle = mesh(new THREE.TorusGeometry(0.032, 0.01, 6, 12), mat(color));
  at(handle, 0.065, 0.065, 0);
  g.add(handle);
  const h = mesh(heartGeo(0.04, 0.006, 0), mat(heartColor, { rough: 0.5 }), { cast: false });
  at(h, 0, 0.07, 0.061);
  g.add(h);
  return g;
}

function heartCloud() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#ffc4d4', emissiveIntensity: 0.6, flatShading: true, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const puff = (x, y, s, z = 0) => {
    const p = new THREE.Mesh(geo, m);
    p.scale.set(s * 1.1, s, s * 0.7);
    p.position.set(x, y, z);
    p.renderOrder = 998;
    g.add(p);
  };
  // Puffs round the outline of a heart, a few to fill it in
  const pts = heartShape(2.2).getSpacedPoints(22);
  pts.slice(0, -1).forEach((p, i) => puff(p.x, p.y - 0.1, 0.3 + (i % 3) * 0.035));
  for (const [x, y, s] of [[0, 0.05, 0.42], [-0.45, 0.55, 0.36], [0.45, 0.55, 0.36], [0, -0.45, 0.32], [-0.32, 0.15, 0.3], [0.32, 0.15, 0.3]]) puff(x, y, s, -0.15);
  g.userData.mat = m;
  return g;
}

// ---------------------------------------------------------------- the secrets
export class Secrets {
  constructor(L) {
    this.L = L;
    this.list = [];
    this.found = new Set(this.loadFound());
    this.root = new THREE.Group();
    this.root.name = 'love-secrets';
    this.colliders = [];
    this.removers = [];
    this.anim = [];
    this.sky = null; // the heart cloud or the shooting star while it is up
    this.skyClock = { cloud: 25, star: 18 };
    this.checkT = 0;
    this.focusT = 0;
    this.tmp = new THREE.Vector3();
  }

  get game() {
    return this.L.game;
  }

  loadFound() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  saveFound() {
    try {
      localStorage.setItem(KEY, JSON.stringify([...this.found]));
    } catch {
      /* storage blocked */
    }
  }

  // Build every secret once the town (and its nature) exists
  build() {
    this.game.scene.add(this.root);
    const tries = [
      ['tree', () => this.bTree()],
      ['ducks', () => this.bDucks()],
      ['chalk', () => this.bChalk()],
      ['lock', () => this.bLock()],
      ['bottle', () => this.bBottle()],
      ['bench', () => this.bBench()],
      ['boat', () => this.bBoat()],
      ['mugs', () => this.bMugs()],
      ['pebbles', () => this.bPebbles()],
      ['snow', () => this.bSnow()],
    ];
    for (const [id, fn] of tries) {
      try {
        const s = fn();
        if (s?.then) s.then((v) => v && this.list.push({ id, ...v })).catch((e) => console.error(`love: secret ${id} failed`, e));
        else if (s) this.list.push({ id, ...s });
      } catch (e) {
        console.error(`love: secret ${id} failed`, e);
      }
    }
    this.list.push({ id: 'cloud', sky: true, line: 'A heart-shaped cloud drifts by at sunset.' });
    this.list.push({ id: 'star', sky: true, line: 'A shooting star! Make a wish.' });
  }

  add(obj, { bake = true } = {}) {
    if (bake) {
      vcBake(obj, obj.userData.dynamic || []);
      bakeStatic(obj, obj.userData.dynamic || [], mergeGeometries);
    }
    this.root.add(obj);
    return obj;
  }

  collider(c) {
    this.colliders.push(this.game.physics.add(c));
  }

  // Run fn(dt, t) every frame while the player is within 40 m of `near` (or always); false stops it
  animate(fn, near = null) {
    fn.near = near;
    this.anim.push(fn);
  }

  // R + H carved in a heart on a tree trunk, on the side facing the camera
  bTree() {
    const N = this.L.nature;
    const t = N.treeNear(-57, 13.5, 18) || N.treeNear(-30, 4, 30);
    if (!t) return null;
    const seg = (Math.PI * 2) / 7;
    let phi = 0;
    let best = Infinity;
    for (let i = 0; i < 7; i++) {
      const a = (i + 0.5) * seg + t.rot;
      const d = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
      if (d < best) {
        best = d;
        phi = a;
      }
    }
    const y = 0.56 * t.s;
    const r = (0.18 - 0.06 * (y / (1.3 * t.s))) * t.s * Math.cos(Math.PI / 7);
    const m = new THREE.MeshStandardMaterial({ map: carvingTex(), transparent: true, alphaTest: 0.3, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const p = mesh(new THREE.PlaneGeometry(0.26 * t.s, 0.26 * t.s), m, { cast: false });
    p.position.set(t.x + Math.sin(phi) * (r + 0.004), y, t.z + Math.cos(phi) * (r + 0.004));
    p.rotation.set(0, phi, 0);
    p.rotateX(-0.045);
    this.root.add(p);
    return { line: 'R + H, carved in a heart on an old tree.', x: t.x, z: t.z, r: 1.9, look: { x: t.x + Math.sin(phi) * 0.3, z: t.z + Math.cos(phi) * 0.3, y: y + 0.2, zoom: 0.42 } };
  }

  // Two ducks in love on a little pond, with a tiny heart
  bDucks() {
    const spot = this.L.nature.findSpot(-42, -51, 1.5, { reach: 7 });
    if (!spot) return null;
    const g = new THREE.Group();
    g.position.set(spot.x, 0, spot.z);
    const water = mesh(new THREE.CircleGeometry(1.1, 28), umat('#ffffff', { rough: 0.12, map: waterTex() }), { cast: false });
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.035;
    g.add(water);
    const rr = rng(21);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const st = mesh(new THREE.IcosahedronGeometry(0.15, 0), mat(i % 3 ? '#e6dccb' : '#c9c2b3', { rough: 0.9, flat: true }));
      st.position.set(Math.cos(a) * 1.16, 0.04, Math.sin(a) * 1.16);
      st.scale.set(1 + rr() * 0.4, 0.5 + rr() * 0.2, 1 + rr() * 0.3);
      st.rotation.y = rr() * 3;
      g.add(st);
    }
    for (const [x, z, s] of [[-0.55, 0.35, 1], [0.6, -0.45, 0.8], [0.45, 0.55, 0.7]]) {
      const pad = mesh(new THREE.CircleGeometry(0.17 * s, 12, 0.3, Math.PI * 2 - 0.6), mat('#5aa84f', { rough: 0.8, side: THREE.DoubleSide }), { cast: false });
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(x, 0.042, z);
      g.add(pad);
    }
    for (let i = 0; i < 5; i++) g.add(at(sph(0.035, '#ffb3c6', {}, 8), -0.55 + Math.cos(i * 1.26) * 0.04, 0.07, 0.35 + Math.sin(i * 1.26) * 0.04));
    g.add(at(sph(0.025, '#ffd166', {}, 8), -0.55, 0.085, 0.35));
    for (let i = 0; i < 6; i++) {
      const reed = cyl(0.012, 0.016, 0.6 + (i % 3) * 0.12, '#6c9a4a', 5);
      at(reed, -0.75 + i * 0.12, 0.33, -0.9 - (i % 2) * 0.08);
      reed.rotation.z = (i - 2.5) * 0.05;
      g.add(reed);
      if (i % 2 === 0) g.add(at(cyl(0.028, 0.028, 0.12, '#8a5a34', 8), -0.75 + i * 0.12 + (i - 2.5) * -0.015, 0.62 + (i % 3) * 0.06, -0.9));
    }
    const d1 = duck('white');
    const d2 = duck('mallard');
    d1.scale.setScalar(1.35);
    d2.scale.setScalar(1.35);
    d1.position.set(-0.27, 0.0, 0.05);
    d2.position.set(0.27, 0.0, 0.05);
    d2.rotation.y = Math.PI;
    const heart = mesh(heartGeo(0.16, 0.04, 0.012), umat('#ff7fa3', { rough: 0.4, emissive: '#ff5d8f', ei: 0.45 }));
    heart.position.set(0, 0.6, 0.05);
    g.add(d1, d2, heart);
    g.userData.dynamic = [d1, d2, heart];
    this.add(g);
    this.collider({ type: 'circle', x: spot.x, z: spot.z, r: 1.05 });
    this.animate((dt, t) => {
      d1.position.y = Math.sin(t * 2.1) * 0.012 - 0.02;
      d2.position.y = Math.sin(t * 2.1 + 1.3) * 0.012 - 0.02;
      d1.rotation.z = Math.sin(t * 1.7) * 0.05;
      d2.rotation.z = Math.sin(t * 1.7 + 1) * 0.05;
      const k = (t * 0.35) % 1;
      heart.position.y = 0.52 + k * 0.4;
      heart.rotation.y = Math.sin(t * 1.5) * 0.4;
      heart.scale.setScalar(Math.sin(k * Math.PI) * (1 + Math.sin(t * 6) * 0.06));
    }, g);
    return { line: 'Two ducks in love, beak to beak.', x: spot.x, z: spot.z + 1.3, r: 2.2, look: { x: spot.x, z: spot.z, y: 0.3, zoom: 0.5 } };
  }

  // A chalk drawing of the two of them on the quiet street up to the snow
  bChalk() {
    const p = groundDecal(chalkTex(), 2.3, 1.62, { y: 0.045 });
    p.position.x = -13.15;
    p.position.z = -79.5;
    this.root.add(p);
    return { line: 'A chalk drawing of Roji and Homama, holding hands.', x: -13.05, z: -79.2, r: 1.9, look: { x: -13.05, z: -79.5, y: 0.1, zoom: 0.48 } };
  }

  // A heart love lock on the picnic garden's bridge rail
  bLock() {
    const pic = this.game.spaces.byId.picnic;
    if (!pic) return null;
    const O = pic.origin;
    // Between posts 7 and 8, where no fairy lights hang
    const x = (postX(7) + postX(8)) / 2;
    const top = (i) => archH(postX(i)) + 0.08 + 0.47;
    const yRail = (top(7) + top(8)) / 2;
    const zr = BRIDGE.z + (BRIDGE.w / 2 - 0.04);
    const g = new THREE.Group();
    g.position.set(O.x + x, yRail, O.z + zr);
    const shackle = mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 16), mat('#d9dde3', { rough: 0.3, metal: 0.8 }));
    shackle.rotation.y = Math.PI / 2;
    g.add(at(shackle, 0, -0.015, 0));
    const body = mesh(heartGeo(0.13, 0.035, 0.01), mat('#ef5b6f', { rough: 0.35, metal: 0.45 }));
    at(body, 0, -0.105, 0);
    g.add(body);
    const txt = mesh(new THREE.PlaneGeometry(0.08, 0.08), new THREE.MeshStandardMaterial({ map: lockTex(), transparent: true, depthWrite: false }), { cast: false });
    at(txt, 0, -0.1, 0.03);
    g.add(txt);
    g.rotation.y = 0.65; // turned a little along the rail, so the shackle shows as a loop round it
    this.add(g, { bake: false }); // keep the shiny metal
    return { line: 'A love lock on the bridge: R + H, forever.', x: O.x + x, z: O.z + zr, r: 2.5, look: { x: O.x + x, z: O.z + zr, y: yRail - 0.1, zoom: 0.42 } };
  }

  // A message in a bottle in a tiny sandy cove on the west shore
  bBottle() {
    const spot = this.L.nature.findSpot(-84.0, -20.5, 1.2, { reach: 5, edge: 0.95, plants: false });
    if (!spot) return null;
    const g = new THREE.Group();
    g.position.set(spot.x, 0, spot.z);
    const sand = mesh(blobGeo(1.5, 0.12, 4), umat('#ffffff', { rough: 1, map: sandTex() }), { cast: false });
    sand.position.y = 0.012;
    g.add(sand);
    const b = bottleModel();
    b.rotation.set(0.15, 0.4, 1.32);
    b.position.set(-0.15, 0.06, 0.05);
    g.add(b);
    const star = mesh(new THREE.ExtrudeGeometry(starShape(0.09, 0.04), { depth: 0.02, bevelEnabled: false }), mat('#ff9a8a', { rough: 0.7 }));
    star.rotation.x = -Math.PI / 2;
    at(star, 0.45, 0.02, 0.35);
    g.add(star);
    const shell = mesh(new THREE.SphereGeometry(0.07, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#fff1e4', { rough: 0.6 }));
    shell.scale.set(1, 0.5, 0.8);
    at(shell, 0.2, 0.012, -0.45);
    g.add(shell);
    g.userData.dynamic = [b];
    this.add(g);
    this.bottle = b;
    return {
      line: 'A message in a bottle, washed up just for Roji.',
      x: spot.x + 0.4,
      z: spot.z,
      r: 1.9,
      look: { x: spot.x, z: spot.z, y: 0.1, zoom: 0.5 },
      onFound: () => {
        const cork = b.userData.cork;
        let t = 0;
        this.animate((dt) => {
          t += dt;
          if (t > 1.2) return false;
          cork.position.y = 0.26 + t * 0.35 - t * t * 0.25;
          cork.rotation.z = t * 6;
        });
        setTimeout(() => this.L.ui.showNote({ title: 'Message in a bottle', text: 'If this bottle finds you, so will I. Every time, on every island.', from: 'H' }, 7000), 900);
      },
    };
  }

  // A bench with a little plaque, facing the sea on the south-west shore
  bBench() {
    const spot = this.L.nature.findSpot(-66, 20.2, 1.1, { reach: 5, edge: 1.15, plants: false });
    if (!spot) return null;
    const b = bench();
    b.position.set(spot.x, 0, spot.z);
    this.add(b);
    // Four little flowers by the legs
    const f = new THREE.Group();
    for (const [x, z, c] of [[-0.95, 0.1, '#ff8fb1'], [-1.05, -0.15, '#ffffff'], [0.98, 0.05, '#ffd75e'], [1.04, -0.2, '#ff8fb1']]) {
      f.add(at(cyl(0.012, 0.014, 0.26, '#4f9a45', 4), x, 0.13, z));
      f.add(at(sph(0.06, c, {}, 8), x, 0.28, z));
    }
    f.position.set(spot.x, 0, spot.z);
    this.add(f);
    this.collider({ type: 'box', x: spot.x, z: spot.z, hw: 0.82, hd: 0.27, h: 0.48 });
    const town = this.game.spaces.town;
    this.removers.push(
      this.game.spaces.addHotspot(town, {
        x: spot.x,
        z: spot.z + 0.75,
        r: 1.25,
        icon: 'heart',
        label: 'Sit on the bench',
        act: (api) =>
          api.activity({
            label: 'Get up',
            seats: [
              { who: 'roji', x: spot.x - 0.38, z: spot.z + 0.02, y: 0.33, yaw: 0, pose: 'sit' },
              { who: 'homama', x: spot.x + 0.38, z: spot.z + 0.02, y: 0.33, yaw: 0, pose: 'sit' },
            ],
            focus: { x: spot.x, z: spot.z + 0.2, y: 0.85, zoom: 0.55 },
            exit: { x: spot.x - 0.4, z: spot.z + 0.8 },
            update: () => {},
            onEnd: (silent) => !silent && api.toast('Their bench, their sea. Same time next weekend.', 2600),
          }),
      }),
    );
    return { line: 'A tiny plaque on the bench: Roji + Homama.', x: spot.x, z: spot.z + 0.8, r: 1.8, look: { x: spot.x, z: spot.z - 0.1, y: 0.7, zoom: 0.48 } };
  }

  // A paper boat in a puddle by the quiet road between the pool and the tech studio
  bBoat() {
    const spot = this.L.nature.findSpot(4.9, -50, 0.8, { reach: 5 });
    if (!spot) return null;
    const g = new THREE.Group();
    g.position.set(spot.x, 0, spot.z);
    const rim = mesh(blobGeo(0.82, 0.1, 7), mat('#8fb070', { rough: 1 }), { cast: false });
    rim.position.y = 0.008;
    g.add(rim);
    const pud = mesh(blobGeo(0.7, 0.1, 7), umat('#ffffff', { rough: 0.06, metal: 0.15, map: waterTex('#c6e6f2', '#9cc7dc') }), { cast: false });
    pud.position.y = 0.014;
    g.add(pud);
    const boat = paperBoat();
    boat.position.set(0.05, 0.016, 0);
    g.add(boat);
    g.userData.dynamic = [boat];
    this.add(g);
    this.animate((dt, t) => {
      boat.position.y = 0.016 + Math.sin(t * 2.2) * 0.004;
      boat.rotation.y = 0.6 + Math.sin(t * 0.25) * 0.8;
      boat.rotation.z = Math.sin(t * 1.9) * 0.05;
      boat.position.x = 0.05 + Math.sin(t * 0.3) * 0.18;
    }, g);
    return { line: 'A paper boat in a puddle, a heart on its sail.', x: spot.x, z: spot.z + 0.6, r: 1.6, look: { x: spot.x, z: spot.z, y: 0.1, zoom: 0.42 } };
  }

  // Two mugs side by side on a high hospital windowsill
  bMugs() {
    const hos = this.game.spaces.byId.hospital;
    if (!hos) return null;
    const O = hos.origin;
    const wx = O.x - 6.3;
    const wz = O.z - 0.6;
    const g = new THREE.Group();
    g.position.set(wx, 2.72, wz);
    g.add(at(rbox(1.12, 0.05, 0.2, '#ffffff', 0.015), 0, 0, 0.13));
    const a = mugModel('#ff9eb5', '#ffffff');
    at(a, -0.16, 0.025, 0.15);
    a.rotation.y = 0.5;
    const b = mugModel('#6fb8ff', '#ff7fa3');
    at(b, 0.03, 0.025, 0.16);
    b.rotation.y = -0.4;
    g.add(a, b);
    const pot = cyl(0.05, 0.04, 0.07, '#e58f6a', 12);
    at(pot, 0.33, 0.06, 0.14);
    g.add(pot);
    const leaf = mesh(heartGeo(0.08, 0.01, 0.004), mat('#5aa84f', { rough: 0.7 }));
    at(leaf, 0.33, 0.15, 0.14);
    g.add(leaf);
    // Two little curls of steam
    const steamMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false });
    const puffs = [];
    for (const [x, z] of [[-0.16, 0.15], [0.03, 0.16]]) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), steamMat);
      s.position.set(x, 0.16, z);
      g.add(s);
      puffs.push({ s, x, ph: x * 3 + 0.4 });
    }
    g.userData.dynamic = puffs.map((p) => p.s);
    this.add(g);
    this.animate((dt, t) => {
      for (const p of puffs) {
        const k = (t * 0.45 + p.ph) % 1;
        p.s.position.set(p.x + Math.sin(k * 6 + p.ph) * 0.02, 0.16 + k * 0.22, p.s.position.z);
        p.s.scale.setScalar(0.6 + k * 1.2);
      }
      steamMat.opacity = 0.45;
    }, g);
    return { line: 'Two mugs on a high windowsill, side by side.', x: wx, z: O.z + 1.4, r: 2.6, look: { x: wx, z: wz, y: 2.6, zoom: 0.55 } };
  }

  // A heart of pebbles on the south shore, past the seaside promenade
  bPebbles() {
    const spot = this.L.nature.findSpot(60, 21.75, 0.55, { reach: 3, edge: 0.75, plants: false });
    if (!spot) return null;
    const g = new THREE.Group();
    g.position.set(spot.x, 0, spot.z);
    const pts = heartShape(0.95).getSpacedPoints(20);
    const rr = rng(12);
    const cols = ['#e6dccb', '#c9c2b3', '#f4efe6', '#d8cdbb'];
    pts.slice(0, -1).forEach((p, i) => {
      const st = mesh(new THREE.IcosahedronGeometry(0.06, 0), mat(cols[i % cols.length], { rough: 0.9, flat: true }));
      st.position.set(p.x, 0.025, -(p.y - 0.043));
      st.scale.set(1.1 + rr() * 0.4, 0.55, 1 + rr() * 0.3);
      st.rotation.y = rr() * 3;
      g.add(st);
    });
    const pink = mesh(heartGeo(0.22, 0.04, 0.012), mat('#ff8fb1', { rough: 0.6 }));
    pink.rotation.x = -Math.PI / 2;
    at(pink, 0, 0.03, 0.0);
    g.add(pink);
    this.add(g);
    return { line: 'A heart of pebbles on the shore.', x: spot.x, z: spot.z - 0.3, r: 1.7, look: { x: spot.x, z: spot.z, y: 0.05, zoom: 0.45 } };
  }

  // "H loves R" written in the snow high up the ski hill; found at its foot, the camera looks up to it
  async bSnow() {
    const ski = this.game.spaces.byId.ski;
    if (!ski) return null;
    const O = ski.origin;
    let hill = null;
    try {
      hill = (await import('../../places/ski/hill.js')).hillHeight;
    } catch {
      hill = null;
    }
    const ray = new THREE.Raycaster();
    ray.camera = this.L.ui.camera || new THREE.PerspectiveCamera(); // sprites (falling snow) ask for one
    const down = new THREE.Vector3(0, -1, 0);
    const top = (x, z) => {
      ray.set(new THREE.Vector3(x, 40, z), down);
      const hits = ray.intersectObject(ski.inst.group, true);
      return hits.length ? hits[0].point.y : 0;
    };
    const surface = (x, z) => (hill ? O.y + hill(x - O.x, z - O.z) : top(x, z));
    // A clear piece of slope: nothing (a pine, the lift) stands on it
    const cz = O.z - 13.2;
    let best = null;
    for (const dx of [-16, -18, -14, -20, -12, -22, 2, 4]) {
      const x = O.x + dx;
      let clear = surface(x, cz) > 2;
      for (let i = -2; i <= 2 && clear; i++) for (let j = -1; j <= 1 && clear; j++) clear = Math.abs(top(x + i * 0.6, cz + j * 0.5) - surface(x + i * 0.6, cz + j * 0.5)) < 0.3;
      if (clear) {
        best = { x, z: cz };
        break;
      }
    }
    if (!best) best = { x: O.x - 16, z: cz };
    const geo = new THREE.PlaneGeometry(2.3, 1.0, 12, 6);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, surface(best.x + pos.getX(i), best.z + pos.getZ(i)) + 0.04);
    geo.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ map: snowTex(), transparent: true, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const p = mesh(geo, m, { cast: false });
    p.position.set(best.x, 0, best.z);
    this.root.add(p);
    const y = surface(best.x, best.z);
    return { line: 'H loves R, written in the snow up the ski hill.', x: best.x, z: O.z - 6.9, r: 3.2, look: { x: best.x, z: best.z, y: y + 0.3, zoom: 0.7 } };
  }

  // ---------------------------------------------------------------- sky moments
  // A heart-shaped cloud drifting across the top of the view, drawn like the sky (over everything)
  spawnCloud(t0 = 0) {
    const cam = this.L.ui.camera;
    if (!cam || this.sky) return false;
    const g = heartCloud();
    this.root.add(g);
    const dur = 32;
    const ny = 0.66 + Math.random() * 0.1;
    const dirV = new THREE.Vector3();
    this.sky = {
      kind: 'cloud',
      obj: g,
      t: t0,
      seen: 0,
      update: (dt) => {
        const st = this.sky;
        st.t += dt;
        const k = st.t / dur;
        const nx = -1.35 + 2.7 * k;
        dirV.set(nx, ny + Math.sin(st.t * 0.4) * 0.015, 0.5).unproject(cam).sub(cam.position).normalize();
        // Close enough that it never sinks below the treetops
        let d = 14;
        if (dirV.y < -0.01) d = Math.min(d, Math.max(6, (cam.position.y - 3.4) / -dirV.y));
        g.position.copy(cam.position).addScaledVector(dirV, d);
        g.scale.setScalar((0.82 * d) / 14);
        g.quaternion.copy(cam.quaternion);
        g.userData.mat.opacity = Math.min(1, st.t / 3, (dur - st.t) / 3) * 0.95;
        if (Math.abs(nx) < 0.8) st.seen += dt;
        return st.t < dur;
      },
    };
    return true;
  }

  spawnStar() {
    const cam = this.L.ui.camera;
    if (!cam || this.sky) return false;
    const mat_ = new THREE.SpriteMaterial({ map: cometTex(), transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    const s = new THREE.Sprite(mat_);
    s.renderOrder = 999;
    s.scale.set(1.7, 0.42, 1);
    this.root.add(s);
    const a = { x: -0.55 + Math.random() * 0.3, y: 0.86 };
    const b = { x: a.x + 0.75, y: 0.58 };
    const dur = 1.25;
    const p0 = new THREE.Vector3();
    this.sky = {
      kind: 'star',
      obj: s,
      t: 0,
      update: (dt) => {
        const st = this.sky;
        st.t += dt;
        const k = Math.min(1, st.t / dur);
        const e = k * (2 - k);
        p0.set(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e, 0.5).unproject(cam).sub(cam.position).normalize().multiplyScalar(9).add(cam.position);
        s.position.copy(p0);
        mat_.rotation = Math.atan2((b.y - a.y) * window.innerHeight, (b.x - a.x) * window.innerWidth);
        mat_.opacity = Math.min(1, k * 6, (1 - k) * 4);
        return k < 1;
      },
    };
    this.L.sfx('star');
    return true;
  }

  screenToPlane(cam, nx, ny, y) {
    const v = new THREE.Vector3(nx, ny, 0.5).unproject(cam);
    const d = v.sub(cam.position).normalize();
    if (d.y > -0.02) return null;
    const t = (y - cam.position.y) / d.y;
    if (t <= 0) return null;
    return cam.position.clone().addScaledVector(d, t);
  }

  // t0: start a cloud part way across (the test hook uses it)
  skyMoment(kind, t0 = 0) {
    const ok = kind === 'cloud' ? this.spawnCloud(t0) : this.spawnStar();
    if (!ok) return false;
    if (!this.found.has(kind)) this.pendingSky = kind;
    else if (kind === 'star') setTimeout(() => this.wish(), 900);
    return true;
  }

  wish() {
    const st = this.L.state();
    this.L.toast(WISHES[Math.floor(Math.random() * WISHES.length)], 4200);
    if (!st.free) return;
    const g = this.game;
    for (const id of ['roji', 'homama']) {
      const a = g.actors[id];
      if (a.speed < 0.3 && !a.seated) setTimeout(() => a.kid.emote('heart'), id === 'roji' ? 0 : 300);
    }
  }

  // ---------------------------------------------------------------- finding them
  find(s, { focus = true } = {}) {
    if (!s || this.found.has(s.id)) return;
    this.found.add(s.id);
    this.saveFound();
    const n = this.found.size;
    this.L.sfx('chime');
    this.L.toast(`<b>Little secret ${n} of ${TOTAL}.</b> ${s.line}`, 4600);
    const g = this.game;
    if (s.look) g.fx.burst(new THREE.Vector3(s.look.x, (s.look.y ?? 0) + 0.4, s.look.z), ['#ffd166', '#ffffff', '#ff8fb1'], 26);
    if (focus && s.look && !g.activities.active) {
      this.L.api.focus({ x: s.look.x, z: s.look.z, y: s.look.y ?? 0.5, zoom: s.look.zoom ?? 0.55 });
      this.focusT = 2.4;
      this.focusAt = s;
    }
    s.onFound?.();
    if (s.id === 'star') setTimeout(() => this.wish(), 4800);
    if (n === TOTAL) setTimeout(() => this.L.toast('<b>All 12 little secrets found.</b> This island is full of love.', 5200), 5200);
  }

  tick(dt, t) {
    const st = this.L.state();
    // Animations only near the player
    const P = this.game.actors[this.game.playerId()];
    for (let i = this.anim.length - 1; i >= 0; i--) {
      const fn = this.anim[i];
      if (fn.near && fn.near.position.distanceToSquared(P.pos) > 1600) continue;
      if (fn(dt, t) === false) this.anim.splice(i, 1);
    }
    if (this.sky && st.inside) this.sky.t = 1e9; // gone once indoors
    if (this.sky && !st.inside && this.pendingSky === this.sky.kind && (this.sky.kind === 'star' ? this.sky.t > 0.6 : this.sky.seen > 2.5)) {
      this.find(this.list.find((q) => q.id === this.pendingSky), { focus: false });
      this.pendingSky = null;
    }
    if (this.sky && !this.sky.update(dt)) {
      this.sky.obj.removeFromParent();
      this.sky.obj.traverse((o) => o.material?.map?.dispose?.());
      this.sky = null;
    }
    if (this.focusT > 0) {
      this.focusT -= dt;
      const far = this.focusAt && Math.hypot(P.pos.x - this.focusAt.x, P.pos.z - this.focusAt.z) > 7;
      if ((this.focusT <= 0 || far) && !this.game.activities.active) {
        this.focusT = 0;
        this.L.api.focus(null);
      } else if (this.game.activities.active) this.focusT = 0;
    }
    this.checkT -= dt;
    if (this.checkT > 0) return;
    this.checkT = 0.25;
    if (!st.free || st.inside) return;
    for (const s of this.list) {
      if (s.sky || this.found.has(s.id)) continue;
      if (Math.hypot(P.pos.x - s.x, P.pos.z - s.z) < s.r) {
        this.find(s);
        break;
      }
    }
    // Sky moments: a heart cloud at sunset, a shooting star at night
    const phase = this.L.phase();
    for (const kind of ['cloud', 'star']) {
      if (!SKY_PHASES[kind].includes(phase) || this.sky) continue;
      this.skyClock[kind] -= 0.25;
      if (this.skyClock[kind] <= 0) {
        this.skyClock[kind] = kind === 'cloud' ? 110 + Math.random() * 110 : 70 + Math.random() * 90;
        this.skyMoment(kind);
      }
    }
  }

  dispose() {
    this.root.removeFromParent();
    for (const c of this.colliders) this.game.physics.remove(c);
    for (const r of this.removers) r();
    this.colliders.length = 0;
    this.removers.length = 0;
  }
}

function starShape(R, r, n = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 ? r : R;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}
