import { THREE, mat, umat, mesh, canvasTexture, roundRect, FONT, mergeGeometries, box, rbox, cyl, sph, tor, at, rot, uvScale, pattern, texMat, glowTex, sprite, heartGeo, bake, makeAtlas } from './kit.js';
import { clamp, damp } from '../../util.js';

// The garage on the right of the cottage, in the same style: cream walls, a shingled gable, a flower box.
// A mint roll-up door rolls up when Roji and Homama come home (or take the car out) and rolls down once
// the car is parked inside and they walk away. Inside: a workbench under a pegboard, Roji's bike on the
// wall, a shelf of car things, a door into the house and a few small secrets. The roof fades while the
// player is inside, so the camera can see in. Local frame: the home's (front +Z); the house wall is x = 4.6.

const X0 = 4.6; // house wall
const X1 = 8.85; // outer right wall
const ZF = 0.7; // front face
const ZB = -4.6; // back face
const W = 0.18; // wall thickness
const IX1 = X1 - W;
const IZF = ZF - W;
const IZB = ZB + W;
const IX0 = 4.62;
const XC = (X0 + X1) / 2;
const EAVE = 2.85;
const PITCH = Math.PI / 6;
const RIDGE = EAVE + (XC - X0) * Math.tan(PITCH);
const OX0 = 4.95; // door opening
const OX1 = 8.15;
const OXC = (OX0 + OX1) / 2;
const OW = OX1 - OX0;
const OH = 2.25;
const DZ = 0.6; // door plane
const K_OPEN = 0.06; // how much of the door still shows under the header when it is up
export const CAR_SPOT = { x: 6.6, z: -1.6, yaw: 0 };

const CREAM = '#fff2e1';
const WHITE = '#fffaf4';
const WOOD = '#d6a473';
const DARK_WOOD = '#8d5a3a';
const MINT = '#a9e0d6';
const PINK = '#ff9eb5';
const RED = '#ef5b6f';
const STEEL = '#9aa6b2';

// ------------------------------------------------------------------ textures
const concreteTex = () =>
  pattern(256, 256, '#e6dfd5', (c, w, h) => {
    for (let i = 0; i < 900; i++) {
      const v = (i * 7919) % 997;
      c.fillStyle = v % 3 ? 'rgba(150,135,120,0.18)' : 'rgba(255,255,255,0.35)';
      c.fillRect((i * 37) % w, (i * 61 + v) % h, 2, 2);
    }
    c.fillStyle = 'rgba(140,120,100,0.28)';
    c.fillRect(0, h - 3, w, 3);
  });

// Driveway pavers: rounded stones in a running bond, warm sand tones
const paverTex = () =>
  pattern(256, 256, '#cdbba0', (c, w, h) => {
    const rows = 4;
    const cols = 3;
    const tones = ['#eadcc4', '#e3d2b6', '#efe3cf', '#ddcaa9'];
    for (let j = 0; j < rows; j++)
      for (let i = -1; i <= cols; i++) {
        const x = (i + (j % 2) * 0.5) * (w / cols) + 4;
        const y = j * (h / rows) + 4;
        c.fillStyle = tones[(i + j * 2 + 8) % 4];
        roundRect(c, x, y, w / cols - 8, h / rows - 8, 10);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.25)';
        roundRect(c, x + 4, y + 4, w / cols - 20, 6, 3);
        c.fill();
      }
  });

// The roll-up door: mint slats, a row of little windows (the middle one a heart) and a handle.
// glow = true paints the matching emissive map (only the windows light up).
function doorDraw(glow) {
  return (c, w, h) => {
    c.fillStyle = glow ? '#000000' : MINT;
    c.fillRect(0, 0, w, h);
    if (!glow) {
      const slat = h / 14;
      for (let k = 1; k < 14; k++) {
        c.fillStyle = '#86c9bd';
        c.fillRect(0, k * slat - 2, w, 3);
        c.fillStyle = '#cdf0ea';
        c.fillRect(0, k * slat + 1, w, 2);
      }
      c.fillStyle = '#76b8ac';
      c.fillRect(0, 0, 8, h);
      c.fillRect(w - 8, 0, 8, h);
      // Handle
      c.fillStyle = 'rgba(60,90,85,0.35)';
      roundRect(c, w / 2 - 34, h - 44, 68, 16, 8);
      c.fill();
      c.fillStyle = '#f4fbf9';
      roundRect(c, w / 2 - 34, h - 47, 68, 14, 7);
      c.fill();
    }
    // Windows
    const y0 = h * 0.15;
    const wh = h * 0.1;
    const ww = w * 0.12;
    for (let i = 0; i < 5; i++) {
      const cx = w * (0.18 + i * 0.16);
      if (i === 2) {
        c.save();
        c.translate(cx, y0 + wh / 2);
        c.beginPath();
        const s = wh * 0.62;
        c.moveTo(0, s * 0.7);
        c.bezierCurveTo(-s * 1.4, -s * 0.2, -s * 0.6, -s * 1.1, 0, -s * 0.45);
        c.bezierCurveTo(s * 0.6, -s * 1.1, s * 1.4, -s * 0.2, 0, s * 0.7);
        c.fillStyle = glow ? '#ffffff' : '#5d7d8c';
        c.fill();
        if (!glow) {
          c.strokeStyle = '#ffffff';
          c.lineWidth = 4;
          c.stroke();
        }
        c.restore();
        continue;
      }
      if (!glow) {
        c.fillStyle = '#ffffff';
        roundRect(c, cx - ww / 2 - 4, y0 - 4, ww + 8, wh + 8, 10);
        c.fill();
      }
      c.fillStyle = glow ? '#ffffff' : '#5d7d8c';
      roundRect(c, cx - ww / 2, y0, ww, wh, 7);
      c.fill();
      if (!glow) {
        c.fillStyle = 'rgba(255,255,255,0.35)';
        c.beginPath();
        c.moveTo(cx - ww / 2 + 8, y0 + wh);
        c.lineTo(cx - ww / 2 + 22, y0);
        c.lineTo(cx - ww / 2 + 32, y0);
        c.lineTo(cx - ww / 2 + 18, y0 + wh);
        c.fill();
      }
    }
  };
}

// Soft light spilling out of the open door onto the driveway at night: bright at the door, fading out
const spillTex = () =>
  canvasTexture(128, 128, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const s = c.createLinearGradient(0, 0, w, 0);
    s.addColorStop(0, 'rgba(0,0,0,1)');
    s.addColorStop(0.2, 'rgba(0,0,0,0)');
    s.addColorStop(0.8, 'rgba(0,0,0,0)');
    s.addColorStop(1, 'rgba(0,0,0,1)');
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = s;
    c.fillRect(0, 0, w, h);
  });

const glowPlane = (w, d, map, color) => {
  const m = new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const p = mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), m, { cast: false, receive: false });
  return p;
};

// A cylinder from a to b (bike tubes)
const UP = new THREE.Vector3(0, 1, 0);
function tube(a, b, r, color) {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = cyl(r, r, d.length(), color, 6);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}

// Merge plain-coloured meshes into one vertex-coloured mesh with its own material (so it can fade)
function mergeOwn(meshes, material) {
  const gs = meshes.map((m) => {
    m.updateMatrix();
    const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix);
    for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n);
    const col = new Float32Array(g.attributes.position.count * 3);
    const c = m.material.color;
    for (let i = 0; i < col.length; i += 3) (col[i] = c.r), (col[i + 1] = c.g), (col[i + 2] = c.b);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  });
  return mesh(mergeGeometries(gs, false), material);
}

// ------------------------------------------------------------------ Roji's bike (pink, a basket of flowers)
function makeBike() {
  const b = new THREE.Group();
  const frame = '#ff8fb1';
  const V = (y, z) => new THREE.Vector3(0, y, z);
  for (const z of [-0.5, 0.5]) {
    const wheel = new THREE.Group();
    wheel.add(tor(0.3, 0.032, '#3b3542', undefined, Math.PI * 2, 6, 24));
    wheel.add(tor(0.265, 0.012, '#f4f1ee', undefined, Math.PI * 2, 4, 20));
    for (let k = 0; k < 4; k++) wheel.add(rot(cyl(0.005, 0.005, 0.52, '#d9dde3', 4), 0, 0, (k * Math.PI) / 4));
    wheel.add(sph(0.035, '#d9dde3', undefined, 8));
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(0, 0, z);
    b.add(wheel);
    b.add(at(rot(tor(0.33, 0.018, frame, undefined, Math.PI * 0.7, 4, 12), 0, Math.PI / 2, Math.PI * 0.15), 0, 0, z)); // fender
  }
  const R = V(0, -0.5);
  const F = V(0, 0.5);
  const BB = V(-0.03, -0.06);
  const S = V(0.42, -0.24);
  const H1 = V(0.48, 0.33);
  const H2 = V(0.32, 0.38);
  b.add(tube(BB, R, 0.016, frame), tube(S, R, 0.014, frame), tube(BB, S, 0.02, frame), tube(BB, H2, 0.022, frame));
  b.add(tube(V(0.2, -0.2), V(0.4, 0.34), 0.018, frame)); // the low step-through tube
  b.add(tube(H2, H1, 0.026, frame), tube(H2, F, 0.016, '#e6ebf2'));
  b.add(tube(H1, V(0.56, 0.3), 0.014, '#e6ebf2'), tube(S, V(0.52, -0.27), 0.012, '#e6ebf2'));
  b.add(at(rbox(0.12, 0.05, 0.22, '#fff6e8', 0.02), 0, 0.56, -0.28));
  // Handlebar turned along the wall, with grips and a bell
  b.add(at(rot(cyl(0.012, 0.012, 0.34, '#e6ebf2', 6), Math.PI / 2, 0, 0), 0, 0.57, 0.3));
  for (const s of [-1, 1]) b.add(at(rot(cyl(0.02, 0.02, 0.08, '#fff6e8', 6), Math.PI / 2, 0, 0), 0, 0.57, 0.3 + s * 0.17));
  b.add(at(sph(0.028, '#f4c24f', { metal: 0.5, rough: 0.35 }, 8), 0.03, 0.6, 0.38));
  // Chainring and pedals
  b.add(at(rot(tor(0.075, 0.012, '#c9ced6', undefined, Math.PI * 2, 4, 14), 0, Math.PI / 2, 0), 0.03, -0.06, -0.03));
  b.add(at(box(0.1, 0.02, 0.05, '#3b3542'), 0.08, -0.12, 0.02), at(box(0.1, 0.02, 0.05, '#3b3542'), -0.08, 0.0, -0.09));
  // Basket (wicker brown) over the front wheel
  b.add(at(rbox(0.2, 0.16, 0.24, '#c98f5f', 0.03), 0, 0.5, 0.52));
  b.add(at(box(0.2, 0.02, 0.25, '#a8744b'), 0, 0.42, 0.52));
  b.add(at(box(0.04, 0.03, 0.04, '#ef5b6f'), 0, -0.02, -0.66)); // rear reflector
  // Where the flowers in the basket go (added to the garden instancer once the bike is placed)
  b.userData.basket = [[-0.05, 0.58, 0.44], [0.05, 0.58, 0.48], [-0.04, 0.58, 0.54], [0.04, 0.58, 0.58], [0.0, 0.58, 0.51], [-0.05, 0.58, 0.62]];
  return b;
}

// ------------------------------------------------------------------ the garage
// o: { add, dynamic, colliders, hotspots, garden, api, shingles, peachBoards, glassA } from the exterior
export function buildGarage(o) {
  const { add, dynamic, colliders, hotspots, garden, api } = o;
  const white = mat(WHITE, { rough: 0.7 });
  const cream = mat(CREAM, { rough: 0.85 });
  const stone = '#d8c2a2';
  const atlas = makeAtlas(1024, 512);

  // ---------------------------------------------------------------- walls
  add(at(box(W, EAVE, ZF - ZB, cream), X1 - W / 2, EAVE / 2, (ZF + ZB) / 2));
  add(at(box(IX1 - X0, EAVE, W, cream), (X0 + IX1) / 2, EAVE / 2, ZB + W / 2));
  add(at(box(OX0 - X0, EAVE, W, cream), (X0 + OX0) / 2, EAVE / 2, DZ + 0.01));
  add(at(box(0.18, EAVE, IZF - 0.2, cream), X0 + 0.09, EAVE / 2, (IZF + 0.2) / 2));
  add(at(box(IX1 - OX1, EAVE, W, cream), (OX1 + IX1) / 2, EAVE / 2, DZ + 0.01));
  add(at(box(OW, EAVE - OH, W, cream), OXC, (EAVE + OH) / 2, DZ + 0.01));
  // Stone plinth round the outside, like the house
  add(at(box(0.06, 0.3, ZF - ZB + 0.06, stone), X1 + 0.02, 0.15, (ZF + ZB) / 2));
  add(at(box(OX0 - X0 + 0.02, 0.3, 0.06, stone), (X0 + OX0) / 2, 0.15, ZF + 0.02));
  add(at(box(X1 - OX1 + 0.06, 0.3, 0.06, stone), (OX1 + X1) / 2 + 0.03, 0.15, ZF + 0.02));
  add(at(box(X1 - X0 + 0.06, 0.3, 0.06, stone), XC + 0.03, 0.15, ZB - 0.02));
  // White trim: wall top band, corner boards and the door casing
  add(at(box(0.24, 0.12, ZF - ZB + 0.1, white), X1 - 0.08, EAVE - 0.02, (ZF + ZB) / 2));
  add(at(box(X1 - X0 + 0.04, 0.12, 0.26, white), XC + 0.02, EAVE - 0.02, ZF - 0.08));
  add(at(box(0.14, EAVE - 0.3, 0.14, white), X1 + 0.01, 0.3 + (EAVE - 0.3) / 2, ZF + 0.01));
  add(at(box(0.14, EAVE - 0.3, 0.14, white), X1 + 0.01, 0.3 + (EAVE - 0.3) / 2, ZB - 0.01));
  for (const x of [OX0 - 0.04, OX1 + 0.04]) add(at(box(0.1, OH + 0.05, 0.06, white), x, OH / 2, ZF + 0.02));
  add(at(box(OW + 0.18, 0.1, 0.06, white), OXC, OH + 0.04, ZF + 0.02));
  // Back gable (the back wall goes up to the ridge)
  const gableShape = () => {
    const s = new THREE.Shape();
    s.moveTo(X0, EAVE);
    s.lineTo(X1, EAVE);
    s.lineTo(XC, RIDGE);
    s.closePath();
    return s;
  };
  const backGable = new THREE.ExtrudeGeometry(gableShape(), { depth: W, bevelEnabled: false });
  add(at(mesh(backGable, o.peachBoards), 0, 0, ZB));

  // ---------------------------------------------------------------- roof (fades while the player is inside)
  const roof = new THREE.Group();
  const shingleM = texMat(o.shingles.map, { rough: 0.8 });
  const boardM = texMat(o.peachBoards.map, { rough: 0.85 });
  const trimM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
  const glassM = umat('#ffffff', { rough: 0.25, map: o.glassA.map, emissive: '#ffcf7a', ei: 0.35 });
  glassM.emissiveMap = glassM.map;
  const fadeMats = [shingleM, boardM, trimM, glassM];
  for (const m of fadeMats) m.transparent = true;
  const ovZ = 0.3;
  const zc = (ZF + ZB) / 2;
  const depth = ZF - ZB + ovZ * 2;
  const slabs = [];
  const trims = [];
  for (const [s, run] of [[1, X1 + 0.3 - XC], [-1, XC - X0 - 0.015]]) {
    const len = run / Math.cos(PITCH);
    const geo = new THREE.BoxGeometry(len, 0.2, depth);
    uvScale(geo, len, depth);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i));
    const m = new THREE.Mesh(geo);
    const cx = XC + (s * run) / 2;
    const cy = RIDGE - (run / 2) * Math.tan(PITCH);
    m.position.set(cx + s * 0.1 * Math.sin(PITCH), cy + 0.1 * Math.cos(PITCH), zc);
    m.rotation.z = -s * PITCH;
    slabs.push(m);
    // Rake boards along the front and back edges
    for (const z of [ZF + ovZ, ZB - ovZ]) trims.push(rot(at(box(len + 0.04, 0.15, 0.08, white), cx, cy - 0.02, z), 0, 0, -s * PITCH));
  }
  slabs.forEach((m) => m.updateMatrix());
  const slabGeo = mergeGeometries(slabs.map((m) => m.geometry.clone().applyMatrix4(m.matrix)), false);
  const roofSlabs = mesh(slabGeo, shingleM);
  trims.push(rot(at(cyl(0.13, 0.13, depth + 0.1, '#d9734a', 10), XC, RIDGE + 0.2, zc), Math.PI / 2, 0, 0));
  trims.push(at(box(0.08, 0.16, depth, white), X1 + 0.3, RIDGE - (X1 + 0.3 - XC) * Math.tan(PITCH) + 0.02, zc));
  // Front gable with a round window and a heart, like the attic window of the house
  const frontGable = mesh(new THREE.ExtrudeGeometry(gableShape(), { depth: W, bevelEnabled: false }), boardM);
  frontGable.position.z = IZF + 0.01;
  const wy = EAVE + 0.64;
  trims.push(at(tor(0.27, 0.05, white, undefined, Math.PI * 2, 8, 24), XC, wy, ZF + 0.03));
  trims.push(at(mesh(heartGeo(0.26, 0.03), mat(RED, { rough: 0.5 })), XC, wy - 0.02, ZF + 0.05));
  // Flower box on the gable (its flowers are part of the roof mesh, so they fade with it)
  trims.push(at(rbox(0.86, 0.16, 0.2, '#c98f5f', 0.03), XC, EAVE + 0.16, ZF + 0.1));
  for (let i = 0; i < 9; i++) {
    const fx = XC - 0.36 + i * 0.09;
    const fy = EAVE + 0.27 + (i % 3) * 0.025;
    trims.push(at(sph(0.05, ['#ff8fb1', '#ffffff', '#ffd75e', '#ff5d8f', '#c7a6ff'][(i * 2) % 5], undefined, 8), fx, fy, ZF + 0.08 + (i % 2) * 0.06));
    if (i % 2) continue;
    const leaf = at(sph(0.05, '#76c25c', undefined, 6), fx + 0.04, EAVE + 0.23, ZF + 0.17);
    leaf.scale.set(1.2, 0.5, 0.8);
    trims.push(leaf);
  }
  const roundGlass = at(mesh(new THREE.CircleGeometry(0.25, 24), glassM, { cast: false }), XC, wy, ZF + 0.02);
  const trimMesh = mergeOwn(trims, trimM);
  roof.add(roofSlabs, frontGable, trimMesh, roundGlass);
  roof.name = 'garage-roof';
  add(roof);
  dynamic.push(roof);

  // ---------------------------------------------------------------- the roll-up door
  const doorMap = canvasTexture(512, 360, doorDraw(false));
  const doorGlow = canvasTexture(512, 360, doorDraw(true));
  const doorM = umat('#ffffff', { rough: 0.55, map: doorMap, emissive: '#ffcf7a', ei: 0.35 });
  doorM.emissiveMap = doorGlow;
  const door = mesh(new THREE.PlaneGeometry(OW + 0.04, OH).translate(0, -OH / 2, 0), doorM);
  door.position.set(OXC, OH, DZ);
  door.name = 'garage-door';
  const doorBar = at(rbox(OW + 0.02, 0.07, 0.07, '#76b8ac', 0.02), OXC, 0, DZ);
  add(door, doorBar);
  dynamic.push(door, doorBar);
  // Guide rails and the drum box hidden behind the header
  for (const x of [OX0 + 0.03, OX1 - 0.03]) add(at(box(0.05, OH, 0.08, '#e3ece9'), x, OH / 2, DZ - 0.06));
  add(at(rbox(OW, 0.34, 0.32, '#f1ede6', 0.04), OXC, OH + 0.18, IZF - 0.17));
  // A threshold lip under the door
  add(at(box(OW, 0.03, 0.22, '#d4cabb'), OXC, 0.015, DZ));
  const doorCol = { type: 'box', x: OXC, z: DZ, hw: OW / 2, hd: 0.09, garageDoor: true };
  colliders.push(
    doorCol,
    { type: 'box', x: X1 - W / 2, z: (ZF + ZB) / 2, hw: W / 2, hd: (ZF - ZB) / 2 },
    { type: 'box', x: (X0 + X1) / 2, z: ZB + W / 2, hw: (X1 - X0) / 2, hd: W / 2 },
    { type: 'box', x: (X0 + OX0) / 2, z: (0.2 + ZF) / 2, hw: (OX0 - X0) / 2, hd: (ZF - 0.2) / 2 },
    { type: 'box', x: (OX1 + X1) / 2, z: DZ + 0.01, hw: (X1 - OX1) / 2, hd: W / 2 },
  );

  // Lantern over the door, and Homama's little door sensor with a heart light
  const brass = mat('#f4c24f', { metal: 0.5, rough: 0.35 });
  const LAMP_I = 1.6;
  const lampGlass = umat('#fff1c9', { emissive: '#ffc977', ei: LAMP_I });
  add(at(box(0.06, 0.06, 0.24, brass), OXC, 2.72, ZF + 0.1));
  add(at(rbox(0.22, 0.3, 0.22, lampGlass, 0.05), OXC, 2.52, ZF + 0.26));
  add(rot(at(cyl(0.0, 0.18, 0.12, brass, 4), OXC, 2.73, ZF + 0.26), 0, Math.PI / 4, 0));
  add(rot(at(cyl(0.12, 0.12, 0.04, brass, 4), OXC, 2.36, ZF + 0.26), 0, Math.PI / 4, 0));
  const lampHalo = sprite(glowTex(), { color: '#ffd38a', opacity: 0.3, scale: 1.25 });
  lampHalo.position.set(OXC, 2.52, ZF + 0.34);
  add(lampHalo);
  dynamic.push(lampHalo);
  add(at(rbox(0.16, 0.09, 0.06, '#f7f7f7', 0.02), OXC + 0.95, 2.56, ZF + 0.03));
  add(at(cyl(0.02, 0.02, 0.02, '#3b3542', 8), OXC + 0.91, 2.56, ZF + 0.065)).rotation.x = Math.PI / 2;
  const ledM = umat('#ff8fb1', { emissive: '#ff5d8f', ei: 0, rough: 0.3 });
  const led = at(mesh(heartGeo(0.035, 0.01), ledM, { cast: false }), OXC + 0.99, 2.56, ZF + 0.065);
  add(led);
  dynamic.push(led);

  // Climbing roses on a trellis and a planter at the foot of the right pillar
  const tx = (OX1 + X1) / 2 + 0.02;
  for (let k = 0; k < 3; k++) add(at(box(0.03, 1.9, 0.03, white), tx - 0.14 + k * 0.14, 1.25, ZF + 0.05));
  for (let k = 0; k < 5; k++) add(at(box(0.36, 0.03, 0.03, white), tx, 0.6 + k * 0.4, ZF + 0.06));
  add(at(rbox(0.6, 0.3, 0.3, '#c98f5f', 0.04), tx, 0.15, ZF + 0.19));
  add(at(box(0.52, 0.04, 0.22, '#8a5a3c'), tx, 0.29, ZF + 0.19));
  for (let k = 0; k < 22; k++) {
    const y = 0.4 + (k / 21) * 1.75;
    const fx = tx + Math.sin(k * 2.3) * 0.17;
    if (k % 3) garden.flower(fx, y, ZF + 0.1, 'rose', ['#ff5d8f', '#ff8fb1', '#ef3b5d', '#ffffff'][k % 4], 0.01);
    garden.leaf(fx + 0.05, y + 0.06, ZF + 0.1, 1, k * 1.3, 1.3);
    garden.leaf(fx - 0.06, y - 0.05, ZF + 0.1, 0.9, k * 0.7, 1.3);
  }
  garden.bed(tx - 0.24, tx + 0.24, ZF + 0.1, ZF + 0.28, 0.3, 7, 81, ['pom', 'tulip', 'rose'], ['#ff8fb1', '#ffffff', '#ffd75e']);
  colliders.push({ type: 'box', x: tx, z: ZF + 0.19, hw: 0.3, hd: 0.15, h: 0.32 });

  // Side window with teal shutters and a flower box, on the outer wall
  const sz = -1.4;
  add(at(rbox(0.1, 0.9, 1.0, white, 0.04), X1 + 0.03, 1.62, sz));
  add(rot(at(mesh(new THREE.PlaneGeometry(0.82, 0.72), o.glassA, { cast: false }), X1 + 0.085, 1.62, sz), 0, Math.PI / 2, 0));
  add(at(box(0.04, 0.72, 0.04, white), X1 + 0.1, 1.62, sz), at(box(0.04, 0.04, 0.82, white), X1 + 0.1, 1.68, sz));
  for (const s of [-1, 1]) {
    const sh = add(at(rbox(0.06, 0.84, 0.26, '#63c7ba', 0.03), X1 + 0.04, 1.62, sz + s * 0.66));
    for (let k = -2; k <= 2; k++) add(at(box(0.02, 0.025, 0.2, '#ffffff'), X1 + 0.08, 1.62 + k * 0.14, sh.position.z));
  }
  add(at(rbox(0.26, 0.24, 1.05, '#c98f5f', 0.04), X1 + 0.16, 1.06, sz));
  add(at(box(0.2, 0.04, 0.96, '#8a5a3c'), X1 + 0.16, 1.17, sz));
  for (let i = 0; i < 8; i++) {
    const fz = sz - 0.44 + (i / 7) * 0.88;
    garden.flower(X1 + 0.12 + (i % 2) * 0.08, 1.17, fz, ['pom', 'tulip', 'daisy', 'rose'][i % 4], [PINK, '#ffffff', '#ffd75e', '#ff6b6b', '#c7a6ff'][(i * 3) % 5], 0.12 + (i % 3) * 0.04);
    garden.leaf(X1 + 0.28, 1.2, fz, 0.9, i, 1.1);
  }
  // The same window seen from inside
  add(rot(at(mesh(new THREE.PlaneGeometry(0.82, 0.72), o.glassA, { cast: false }), IX1 - 0.01, 1.62, sz), 0, -Math.PI / 2, 0));
  add(at(rbox(0.06, 0.9, 1.0, white, 0.03), IX1 + 0.01, 1.62, sz));

  // ---------------------------------------------------------------- floor and driveway
  const floorGeo = new THREE.PlaneGeometry(IX1 - IX0, IZF - IZB).rotateX(-Math.PI / 2);
  uvScale(floorGeo, (IX1 - IX0) / 1.6, (IZF - IZB) / 1.6);
  const floorM = texMat(concreteTex(), { rough: 0.9 });
  floorM.polygonOffset = true;
  floorM.polygonOffsetFactor = -1;
  floorM.polygonOffsetUnits = -1;
  add(at(mesh(floorGeo, floorM, { cast: false }), (IX0 + IX1) / 2, 0.01, (IZF + IZB) / 2));
  const DZ1 = 6.35; // the driveway runs under the edge of the road
  const dwGeo = new THREE.PlaneGeometry(3.4, DZ1 - ZF).rotateX(-Math.PI / 2);
  uvScale(dwGeo, 3.4 / 1.2, (DZ1 - ZF) / 1.2);
  const dwM = texMat(paverTex(), { rough: 0.9 });
  dwM.polygonOffset = true;
  dwM.polygonOffsetFactor = -1;
  dwM.polygonOffsetUnits = -1;
  add(at(mesh(dwGeo, dwM, { cast: false }), OXC, 0.012, (ZF + DZ1) / 2));
  // One heart-shaped stone hidden among the pavers
  const heartStone = mesh(new THREE.ShapeGeometry(heartPath(0.3)), mat('#ffb3c4', { rough: 0.85, side: THREE.DoubleSide }), { cast: false });
  heartStone.material.polygonOffset = true;
  heartStone.material.polygonOffsetFactor = -3;
  heartStone.material.polygonOffsetUnits = -3;
  add(rot(at(heartStone, OXC - 0.75, 0.016, 2.3), -Math.PI / 2, 0, 0.3));
  // Flowers and pebbles along the left edge of the driveway
  for (let i = 0; i < 16; i++) {
    const z = 1.4 + i * 0.2;
    garden.flower(OX0 - 0.17 + (i % 2) * 0.06, 0, z, ['pom', 'tulip', 'daisy'][i % 3], ['#c7a6ff', '#ffffff', '#ff8fb1', '#ffd75e'][i % 4], 0.16 + (i % 3) * 0.05);
    if (i % 2) garden.leaf(OX0 - 0.15, 0.04, z + 0.05, 1, i, 0.5);
  }
  for (let i = 0; i < 7; i++) add(at(sph(0.06 + (i % 3) * 0.015, '#efe6d8', { rough: 0.9 }, 8), OX0 - 0.05, 0.02, 1.5 + i * 0.48)).scale.set(1, 0.45, 1.2);
  // A round bush beside the driveway
  add(at(sph(0.42, '#5aa84f', { rough: 0.85 }, 14), X1 - 0.08, 0.32, 1.35));
  add(at(sph(0.3, '#76c25c', { rough: 0.85 }, 12), X1 + 0.12, 0.24, 1.55));
  garden.bed(X1 - 0.4, X1 + 0.3, 1.2, 1.7, 0.38, 6, 83, ['pom', 'rose'], ['#ffffff', '#ff8fb1', '#ffd75e']);
  colliders.push({ type: 'circle', x: X1, z: 1.4, r: 0.45 });

  // ---------------------------------------------------------------- inside: the door into the house
  const inner = new THREE.Group();
  inner.add(at(rbox(0.86, 1.96, 0.05, '#8fd6cc', 0.02), 0, 0.98, 0.03));
  for (const y of [0.5, 1.55]) inner.add(at(rbox(0.6, y > 1 ? 0.5 : 0.62, 0.02, '#7fcabd', 0.01), 0, y, 0.065));
  inner.add(at(mesh(heartGeo(0.28, 0.03), mat('#fff1c9', { emissive: '#ffc977', ei: 0.6 })), 0, 1.55, 0.08));
  inner.add(at(sph(0.045, '#f4c24f', { metal: 0.6, rough: 0.3 }, 10), 0.32, 0.95, 0.09));
  for (const s of [-1, 1]) inner.add(at(box(0.08, 2.08, 0.06, white), s * 0.47, 1.04, 0.03));
  inner.add(at(box(1.02, 0.08, 0.06, white), 0, 2.06, 0.03));
  inner.rotation.y = Math.PI / 2;
  inner.position.set(IX0, 0.14, -3.6);
  add(inner);
  add(at(rbox(0.34, 0.14, 1.0, '#d8c2a2', 0.03), IX0 + 0.17, 0.07, -3.6));
  add(at(rbox(0.28, 0.015, 0.7, PINK, 0.006), IX0 + 0.17, 0.147, -3.6));
  colliders.push({ type: 'box', x: IX0 + 0.17, z: -3.6, hw: 0.17, hd: 0.5, h: 0.14 });
  // Two keys on hooks with heart key rings: pink for Roji, blue for Homama
  add(at(rbox(0.04, 0.14, 0.36, WOOD, 0.015), IX0 + 0.02, 1.48, -2.72));
  for (const [dz, col] of [[-0.09, '#ff5d8f'], [0.09, '#3f7bf0']]) {
    add(at(cyl(0.008, 0.008, 0.05, '#c9ced6', 6), IX0 + 0.06, 1.46, -2.72 + dz)).rotation.z = Math.PI / 2;
    add(at(box(0.01, 0.09, 0.025, '#f4c24f', { metal: 0.5, rough: 0.35 }), IX0 + 0.08, 1.38, -2.72 + dz));
    add(rot(at(mesh(heartGeo(0.07, 0.015), mat(col, { rough: 0.5 }), { cast: false }), IX0 + 0.085, 1.29, -2.72 + dz), 0, Math.PI / 2, 0));
  }

  // ---------------------------------------------------------------- inside: workbench and pegboard
  const BX0 = 5.45;
  const BX1 = 7.4;
  const BXC = (BX0 + BX1) / 2;
  const BZ = IZB + 0.29;
  add(at(rbox(BX1 - BX0, 0.08, 0.58, WOOD, 0.02), BXC, 0.88, BZ));
  add(at(box(BX1 - BX0, 0.1, 0.03, '#c48d5d'), BXC, 0.79, BZ + 0.28));
  for (const x of [BX0 + 0.06, BX1 - 0.06]) for (const z of [BZ - 0.24, BZ + 0.24]) add(at(box(0.07, 0.84, 0.07, DARK_WOOD), x, 0.42, z));
  add(at(box(BX1 - BX0 - 0.1, 0.04, 0.5, '#c48d5d'), BXC, 0.22, BZ));
  // Red toolbox and a crate of offcuts on the lower shelf
  add(at(rbox(0.5, 0.22, 0.26, '#e5484d', 0.03), BX0 + 0.42, 0.35, BZ));
  add(at(tor(0.09, 0.015, '#3b3542', undefined, Math.PI, 4, 10), BX0 + 0.42, 0.46, BZ));
  add(at(box(0.08, 0.04, 0.02, '#c9ced6'), BX0 + 0.42, 0.4, BZ + 0.135));
  add(at(box(0.44, 0.18, 0.32, '#c98f5f'), BX1 - 0.4, 0.33, BZ));
  for (let k = 0; k < 4; k++) add(rot(at(box(0.06, 0.32, 0.08, ['#e3bf91', '#d6a473', '#efcf9f', '#c98f5f'][k]), BX1 - 0.55 + k * 0.1, 0.45, BZ - 0.05 + (k % 2) * 0.08), 0, 0, (k - 1.5) * 0.12));
  // On the bench: a radio, a jar of screws, a mug and the vice
  add(at(rbox(0.28, 0.16, 0.11, '#63c7ba', 0.03), BX0 + 0.22, 1.0, BZ - 0.18));
  add(at(cyl(0.045, 0.045, 0.02, '#3b3542', 12), BX0 + 0.16, 1.0, BZ - 0.12)).rotation.x = Math.PI / 2;
  add(at(cyl(0.025, 0.025, 0.02, '#fff6e8', 10), BX0 + 0.29, 1.02, BZ - 0.12)).rotation.x = Math.PI / 2;
  add(rot(at(cyl(0.006, 0.006, 0.3, '#c9ced6', 4), BX0 + 0.3, 1.2, BZ - 0.2), 0, 0, -0.4));
  add(at(cyl(0.05, 0.05, 0.12, '#cfe8f2', 12), BX0 + 0.62, 0.98, BZ - 0.18));
  add(at(cyl(0.052, 0.052, 0.03, STEEL, 12), BX0 + 0.62, 1.055, BZ - 0.18));
  add(at(cyl(0.045, 0.04, 0.1, PINK, 12), BX1 - 0.5, 0.97, BZ - 0.16));
  add(at(tor(0.03, 0.01, PINK, undefined, Math.PI * 2, 4, 10), BX1 - 0.45, 0.97, BZ - 0.16));
  add(at(box(0.16, 0.12, 0.12, STEEL), BX1 - 0.16, 0.98, BZ + 0.18));
  add(at(box(0.04, 0.1, 0.14, '#7d8794'), BX1 - 0.26, 0.98, BZ + 0.18));
  add(rot(at(cyl(0.01, 0.01, 0.2, '#7d8794', 6), BX1 - 0.16, 0.98, BZ + 0.3), Math.PI / 2, 0, 0));
  const PY0 = 1.12;
  const PY1 = 1.97;
  const PZ = IZB + 0.015;
  const pegX = (x) => (x - BX0) * 320;
  const pegY = (y) => (PY1 - y) * 320;
  const pegboard = atlas.panel(BX1 - BX0, PY1 - PY0, 624, 272, (c, w, h) => {
    c.fillStyle = '#e3bf91';
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(110,70,40,0.5)';
    for (let y = 14; y < h - 6; y += 18) for (let x = 14; x < w - 6; x += 18) {
      c.beginPath();
      c.arc(x, y, 2.6, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = '#b98b5c';
    c.lineWidth = 10;
    c.strokeRect(5, 5, w - 10, h - 10);
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.lineWidth = 4;
    c.lineJoin = 'round';
    const outline = (fn) => {
      c.beginPath();
      fn();
      c.stroke();
    };
    outline(() => (c.rect(pegX(5.78) - 9, pegY(1.66), 18, 100), c.rect(pegX(5.78) - 34, pegY(1.76), 68, 26)));
    outline(() => c.rect(pegX(6.08) - 12, pegY(1.73), 24, 116));
    outline(() => c.rect(pegX(6.34) - 10, pegY(1.71), 20, 100));
    outline(() => c.rect(pegX(6.78) - 26, pegY(1.76), 52, 150));
    outline(() => c.arc(pegX(7.12), pegY(1.72), 26, 0, Math.PI * 2));
    // An empty spot shaped like a heart: the one tool Homama never puts away
    c.strokeStyle = 'rgba(239,91,111,0.9)';
    c.lineWidth = 5;
    c.save();
    c.translate(pegX(7.13), pegY(1.38));
    c.beginPath();
    c.moveTo(0, 22);
    c.bezierCurveTo(-46, -4, -20, -38, 0, -14);
    c.bezierCurveTo(20, -38, 46, -4, 0, 22);
    c.stroke();
    c.restore();
  });
  add(at(pegboard, BXC, (PY0 + PY1) / 2, PZ));
  // Tools hanging on the pegboard
  const tz = PZ + 0.03;
  add(at(cyl(0.018, 0.018, 0.3, '#c98f5f', 6), 5.78, 1.52, tz), at(box(0.2, 0.06, 0.05, '#7d8794'), 5.78, 1.7, tz));
  add(at(box(0.04, 0.3, 0.015, STEEL), 6.08, 1.56, tz), at(tor(0.035, 0.014, STEEL, undefined, Math.PI * 2, 4, 10), 6.08, 1.71, tz), at(tor(0.03, 0.014, STEEL, undefined, Math.PI * 2, 4, 10), 6.08, 1.41, tz));
  add(at(cyl(0.022, 0.022, 0.11, '#ef5b6f', 8), 6.34, 1.64, tz), at(cyl(0.006, 0.006, 0.18, STEEL, 4), 6.34, 1.5, tz));
  add(at(box(0.14, 0.38, 0.01, '#d9dde3'), 6.78, 1.43, tz), at(rbox(0.16, 0.12, 0.04, '#e3a04f', 0.02), 6.78, 1.68, tz));
  add(rot(at(cyl(0.065, 0.065, 0.04, '#ffd166', 14), 7.12, 1.72, tz), Math.PI / 2, 0, 0));
  // Shop light over the bench (switched on by the update)
  add(at(rbox(1.3, 0.07, 0.12, '#f7f7f7', 0.02), BXC, 2.32, IZB + 0.07));
  const tubeM = umat('#fffbe8', { emissive: '#fff1c4', ei: 0, rough: 0.3 });
  const tubeLight = at(rot(mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8), tubeM, { cast: false }), 0, 0, Math.PI / 2), BXC, 2.26, IZB + 0.09);
  tubeLight.name = 'garage-light';
  add(tubeLight);
  dynamic.push(tubeLight);
  const tubeHalo = sprite(glowTex(), { color: '#fff0c8', opacity: 0, scale: 1 });
  tubeHalo.scale.set(2.6, 0.9, 1);
  tubeHalo.position.set(BXC, 2.22, IZB + 0.2);
  add(tubeHalo);
  dynamic.push(tubeHalo);
  // Little things made at the bench appear here, one per visit
  const crafts = [makeCraftHeart(), makeCraftBirdhouse(), makeCraftCar()];
  const craftSpots = [[5.98, BZ + 0.08], [6.4, BZ + 0.1], [6.82, BZ + 0.08]];
  crafts.forEach((c, i) => {
    c.position.set(craftSpots[i][0], 0.92, craftSpots[i][1]);
    c.visible = false;
    add(c);
    dynamic.push(c);
  });
  colliders.push({ type: 'box', x: BXC, z: BZ, hw: (BX1 - BX0) / 2, hd: 0.29, h: 0.92 });

  // ---------------------------------------------------------------- inside: the shelf of car things
  const SX0 = 7.62;
  const SX1 = IX1 - 0.02;
  const SXC = (SX0 + SX1) / 2;
  const SZ = IZB + 0.2;
  for (const x of [SX0 + 0.015, SX1 - 0.015]) add(at(box(0.03, 1.36, 0.4, white), x, 0.68, SZ));
  add(at(box(SX1 - SX0, 1.36, 0.02, '#f3ece2'), SXC, 0.68, IZB + 0.01));
  for (const y of [0.06, 0.48, 0.9, 1.34]) add(at(box(SX1 - SX0 - 0.03, 0.03, 0.4, white), SXC, y, SZ));
  // Bottom: a jerry can and folded rags
  add(at(rbox(0.22, 0.3, 0.13, '#e5484d', 0.03), SX0 + 0.2, 0.225, SZ));
  add(at(box(0.14, 0.03, 0.04, '#b8343a'), SX0 + 0.2, 0.39, SZ));
  for (let k = 0; k < 3; k++) add(at(rbox(0.26, 0.05, 0.2, ['#ff9eb5', '#a9e0d6', '#ffd75e'][k], 0.015), SX1 - 0.22, 0.1 + k * 0.05, SZ));
  // Middle: oil, a spray bottle and a sponge
  for (const dx of [0.12, 0.24]) {
    add(at(cyl(0.045, 0.045, 0.2, '#3f7bf0', 10), SX0 + dx, 0.595, SZ));
    add(at(cyl(0.02, 0.02, 0.04, '#ffd166', 8), SX0 + dx, 0.715, SZ));
  }
  add(at(cyl(0.045, 0.045, 0.18, PINK, 10), SX0 + 0.46, 0.585, SZ));
  add(at(box(0.04, 0.05, 0.08, '#ffffff'), SX0 + 0.46, 0.7, SZ + 0.02));
  add(at(rbox(0.15, 0.07, 0.1, '#ffd166', 0.02), SX1 - 0.18, 0.53, SZ + 0.04));
  // Top shelf: the car-wash bucket and a toy car just like theirs
  add(at(cyl(0.13, 0.1, 0.2, '#63c7ba', 14), SX0 + 0.22, 1.015, SZ));
  add(at(tor(0.12, 0.008, '#3b3542', undefined, Math.PI, 4, 12), SX0 + 0.22, 1.12, SZ));
  add(at(rbox(0.14, 0.07, 0.1, '#ffd166', 0.02), SX0 + 0.22, 1.13, SZ));
  const toy = new THREE.Group();
  toy.add(at(rbox(0.12, 0.05, 0.2, '#ff8fb1', 0.02), 0, 0.045, 0));
  toy.add(at(rbox(0.1, 0.03, 0.08, '#3b2b3f', 0.01), 0, 0.075, -0.01));
  for (const [x, z] of [[0.055, 0.06], [-0.055, 0.06], [0.055, -0.06], [-0.055, -0.06]]) toy.add(at(rot(cyl(0.022, 0.022, 0.02, '#3b3542', 8), 0, 0, Math.PI / 2), x, 0.022, z));
  toy.position.set(SX1 - 0.25, 0.915, SZ + 0.02);
  toy.rotation.y = -0.6;
  add(toy);
  // On top: a little cactus and a road map
  add(at(cyl(0.05, 0.04, 0.07, '#e07a55', 10), SX1 - 0.15, 1.39, SZ));
  add(at(cyl(0.03, 0.03, 0.12, '#5aa84f', 8), SX1 - 0.15, 1.48, SZ));
  add(at(rbox(0.22, 0.03, 0.15, '#7fb0ff', 0.01), SX0 + 0.25, 1.37, SZ));
  add(at(box(0.08, 0.031, 0.15, '#ffd166'), SX0 + 0.2, 1.37, SZ));
  colliders.push({ type: 'box', x: SXC, z: SZ, hw: (SX1 - SX0) / 2, hd: 0.2, h: 1.36 });
  // The old "R & H" number plate nailed above it
  const plate = atlas.panel(0.52, 0.2, 208, 80, (c, w, h) => {
    c.fillStyle = '#ffd75e';
    roundRect(c, 3, 3, w - 6, h - 6, 12);
    c.fill();
    c.strokeStyle = '#2c3e66';
    c.lineWidth = 5;
    roundRect(c, 8, 8, w - 16, h - 16, 9);
    c.stroke();
    c.fillStyle = '#2c3e66';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 46px ${FONT}`;
    c.fillText('R & H', w / 2 - 10, h / 2 + 3);
    c.fillStyle = RED;
    drawHeart(c, w - 30, h / 2, 13);
    c.fillStyle = '#9aa6b2';
    for (const [x, y] of [[16, 16], [w - 16, 16], [16, h - 16], [w - 16, h - 16]]) {
      c.beginPath();
      c.arc(x, y, 3.5, 0, Math.PI * 2);
      c.fill();
    }
  });
  add(rot(at(plate, SXC, 1.82, IZB + 0.012), 0, 0, -0.04));

  // ---------------------------------------------------------------- inside: Roji's bike on the wall
  const bike = makeBike();
  bike.position.set(IX1 - 0.2, 1.96, -3.0);
  add(bike);
  bike.updateMatrix();
  bike.userData.basket.forEach(([x, y, z], i) => {
    const p = new THREE.Vector3(x, y, z).applyMatrix4(bike.matrix);
    garden.flower(p.x, p.y, p.z, ['pom', 'tulip', 'daisy', 'rose'][i % 4], ['#ff8fb1', '#ffffff', '#ffd75e', '#ff5d8f', '#c7a6ff'][i % 5], 0.06 + (i % 3) * 0.025);
  });
  for (const dz of [-0.28, 0.24]) add(at(box(0.24, 0.04, 0.04, '#5b5f6b'), IX1 - 0.12, 2.32, -3.0 + dz));

  // ---------------------------------------------------------------- inside: a parking stop, a sign and a drawing
  add(at(rbox(1.5, 0.26, 0.2, PINK, 0.05), CAR_SPOT.x, 0.13, -2.88));
  for (const dx of [-0.45, 0, 0.45]) add(at(box(0.16, 0.262, 0.204, '#ffffff'), CAR_SPOT.x + dx, 0.13, -2.88));
  colliders.push({ type: 'box', x: CAR_SPOT.x, z: -2.88, hw: 0.75, hd: 0.1, h: 0.3 });
  const sign = atlas.panel(0.9, 0.42, 288, 136, (c, w, h) => {
    c.fillStyle = '#ffffff';
    roundRect(c, 4, 4, w - 8, h - 8, 18);
    c.fill();
    c.strokeStyle = '#3f7bf0';
    c.lineWidth = 7;
    c.stroke();
    c.fillStyle = '#3f7bf0';
    roundRect(c, 16, 18, 96, 100, 14);
    c.fill();
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 78px ${FONT}`;
    c.fillText('P', 64, 72);
    c.fillStyle = '#4a3423';
    c.font = `600 22px ${FONT}`;
    c.fillText('Reserved for', 196, 36);
    c.fillStyle = RED;
    c.font = `700 36px ${FONT}`;
    c.fillText('Dr. Roji', 196, 72);
    c.fillStyle = '#7a6a5c';
    c.font = `500 18px ${FONT}`;
    c.fillText('love, Homama', 186, 108);
    c.fillStyle = RED;
    drawHeart(c, 258, 106, 8);
  });
  add(at(sign, XC, EAVE + 0.32, IZB + 0.012));
  // A crayon drawing taped by the door: the two of them in the pink car
  const drawing = atlas.panel(0.5, 0.36, 192, 138, (c, w, h) => {
    c.fillStyle = '#fffdf7';
    c.fillRect(0, 0, w, h);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = '#ff6f96';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(30, 96);
    c.lineTo(36, 74);
    c.lineTo(150, 74);
    c.lineTo(162, 96);
    c.closePath();
    c.stroke();
    c.strokeStyle = '#3b3542';
    c.lineWidth = 5;
    for (const x of [58, 134]) {
      c.beginPath();
      c.arc(x, 100, 11, 0, Math.PI * 2);
      c.stroke();
    }
    for (const [x, hair] of [[78, '#6b3d1f'], [112, '#1d130f']]) {
      c.fillStyle = '#ffd8b8';
      c.beginPath();
      c.arc(x, 58, 12, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = hair;
      c.beginPath();
      c.arc(x, 54, 12, Math.PI, 0);
      c.fill();
    }
    c.fillStyle = '#ef3b5d';
    drawHeart(c, 95, 26, 11);
    c.fillStyle = '#3f7bf0';
    c.font = `600 18px ${FONT}`;
    c.textAlign = 'left';
    c.fillText('R + H', 12, 24);
    c.fillStyle = 'rgba(255,240,170,0.8)';
    c.fillRect(w / 2 - 22, 0, 44, 10);
  });
  add(rot(at(drawing, IX1 - 0.012, 1.25, -0.35), 0, -Math.PI / 2, 0.05));

  // ---------------------------------------------------------------- light
  const pool = glowPlane(IX1 - IX0 - 0.2, IZF - IZB - 0.2, glowTex(), '#ffd9a0');
  pool.position.set((IX0 + IX1) / 2, 0.03, (IZF + IZB) / 2 - 0.4);
  const spill = glowPlane(OW + 0.4, 2.8, spillTex(), '#ffd59a');
  spill.position.set(OXC, 0.035, ZF + 1.4);
  add(pool, spill);
  dynamic.push(pool, spill);

  // ---------------------------------------------------------------- hotspots
  const saidBike = ['A note tied to the basket: <b>New brakes, a new bell and air in the tyres. Ride safe, my doctor. Homama</b>', 'Ring ring! Roji\'s bike is ready for a sunny day.', 'The basket is full of flowers. Homama picks fresh ones every week.'];
  const craftNames = ['a little wooden heart', 'a tiny birdhouse for the apple tree', 'a toy car just like ours'];
  let made = clamp(api?.load?.('crafts', 0) ?? 0, 0, crafts.length);
  crafts.forEach((c, i) => (c.visible = i < made));
  const state = { door: null, roof: 1, light: 0, flicker: 0, led: 0, bench: null };
  const bell = (a) => {
    const ac = a.sound?.ctx;
    if (!ac) return;
    const t0 = ac.currentTime;
    for (const d of [0, 0.16]) {
      a.sound.tone(2350, t0 + d, 0.35, { type: 'sine', gain: 0.08 });
      a.sound.tone(3520, t0 + d, 0.2, { type: 'sine', gain: 0.03 });
    }
  };
  hotspots.push(
    {
      x: IX0 + 0.45,
      z: -3.6,
      r: 0.9,
      label: 'Go inside',
      icon: 'door',
      act: (a) => a.enter(),
    },
    {
      x: IX1 - 0.48,
      z: -3.05,
      r: 0.85,
      label: 'Look at the bike',
      icon: 'heart',
      act: (a) => {
        bell(a);
        const i = a.load('bike', 0);
        a.save('bike', (i + 1) % saidBike.length);
        a.toast(saidBike[i % saidBike.length], 3600);
        a.fx.heartsAt(a.world(IX1 - 0.25, -3.0, 2.2), 2);
      },
    },
    {
      x: BXC - 0.05,
      z: BZ + 0.62,
      r: 0.8,
      label: 'Make something',
      icon: 'star',
      act: (a) => {
        const maker = a.playerId === 'homama' ? 'Homama' : 'Roji';
        const other = a.playerId === 'homama' ? 'Roji' : 'Homama';
        const job = { t: 0, taps: 0, done: false };
        state.bench = job;
        a.activity({
          label: 'Stop',
          seats: [
            { who: 'player', x: BXC - 0.05, z: BZ + 0.64, yaw: Math.PI, pose: 'stand', hands: 'type' },
            { who: 'partner', x: BX1 - 0.25, z: BZ + 0.74, yaw: Math.PI + 0.75, pose: 'stand' },
          ],
          focus: { x: BXC + 0.2, z: BZ + 0.6, y: 1.1, zoom: 0.5 },
          exit: { x: BXC - 0.05, z: BZ + 0.7 },
          update: (dt) => {
            job.t += dt;
            const ac = a.sound?.ctx;
            if (!job.done && job.t > 0.4 + job.taps * 0.42 && job.taps < 8) {
              job.taps++;
              if (ac) a.sound.tone(job.taps % 2 ? 520 : 440, ac.currentTime, 0.06, { type: 'triangle', gain: 0.09 });
              if (job.taps % 3 === 0) a.fx.puff(a.world(BXC - 0.05, BZ + 0.1, 0.95));
            }
            if (!job.done && job.t > 3.9) {
              job.done = true;
              if (made < crafts.length) {
                crafts[made].visible = true;
                a.fx.poof(a.world(craftSpots[made][0], craftSpots[made][1], 1.0));
                a.toast(`${maker} made ${other} <b>${craftNames[made]}</b>.`, 3000);
                made++;
                a.save('crafts', made);
              } else a.toast(`The bench is full of little gifts for ${other}.`, 2600);
              a.sound.ui('good');
              a.fx.heartsAt(a.world(BXC, BZ + 0.4, 1.7), 4);
              a.emote('partner', 'heart');
            }
            if (job.done && job.t > 5.2) a.endActivity();
          },
          onEnd: () => (state.bench = null),
        });
      },
    },
  );

  // ---------------------------------------------------------------- update
  const glowOf = () => clamp((lampGlass.emissiveIntensity / LAMP_I - 1) / 1.8, 0, 1);
  const inGarage = (p, m = 0) => p.x > IX0 - m && p.x < IX1 + m && p.z > IZB - m && p.z < DZ + m;
  let doorK = 1;
  let doorColLive = null;
  const update = (dt, t, a) => {
    if (!a?.player) return;
    const O = a.space.origin;
    const pl = a.localPos(a.player);
    const pa = a.partner ? a.localPos(a.partner) : pl;
    const R = typeof window !== 'undefined' ? window.__roji : null;
    const carObj = R?.car;
    const driving = R?.state?.().mount === 'car';
    let carIn = true;
    if (carObj) {
      const cx = carObj.root.position.x - O.x;
      const cz = carObj.root.position.z - O.z;
      const yaw = carObj.yaw;
      const ex = Math.abs(Math.sin(yaw)) * 1.45 + Math.abs(Math.cos(yaw)) * 0.8;
      const ez = Math.abs(Math.cos(yaw)) * 1.45 + Math.abs(Math.sin(yaw)) * 0.8;
      carIn = cx - ex > IX0 - 0.15 && cx + ex < IX1 + 0.15 && cz + ez < DZ - 0.12 && cz - ez > IZB - 0.3;
    }
    const dDoor = Math.hypot(pl.x - OXC, pl.z - DZ);
    const near = dDoor < (state.door ? 10 : 9); // opens within 9 m, stays open until 10 m
    const open = driving || !carIn || near || inGarage(pl, 0.3) || inGarage(pa, 0.3);
    // Snap to the right state on the first frame, then roll
    if (state.door === null) doorK = open ? K_OPEN : 1;
    const want = open ? K_OPEN : 1;
    if (state.door !== null && state.door !== open && dDoor < 16) {
      // Motor hum, and a little chirp from the sensor when it opens for them
      const ac = a.sound?.ctx;
      if (ac) {
        a.sound.tone(82, ac.currentTime, 1.1, { type: 'triangle', gain: 0.05, slideTo: open ? 96 : 70, attack: 0.08 });
        if (open) {
          a.sound.tone(1320, ac.currentTime, 0.08, { gain: 0.04 });
          a.sound.tone(1760, ac.currentTime + 0.1, 0.12, { gain: 0.04 });
        }
      }
      if (open) state.led = 1.2;
    }
    state.door = open;
    doorK += clamp(want - doorK, -0.85 * dt, 0.85 * dt);
    door.scale.y = doorK;
    doorMap.repeat.y = doorGlow.repeat.y = doorK;
    doorBar.position.y = OH * (1 - doorK) + 0.035;
    if (!doorColLive) doorColLive = a.space.colliders?.find((c) => c.garageDoor) || null;
    if (doorColLive) doorColLive.h = doorK > 0.45 ? undefined : -1;

    // Roof fades while the player is inside (walking or parking the car)
    const inside = inGarage(pl) && pl.z < DZ - 0.2;
    state.roof = damp(state.roof, inside ? 0 : 1, 6, dt);
    const k = state.roof;
    for (const m of fadeMats) {
      m.opacity = k;
      m.depthWrite = k > 0.6;
    }
    roof.visible = k > 0.02;

    // Shop light: on at night, and whenever someone is inside (with a little flicker when it comes on)
    const night = glowOf();
    const lightOn = night > 0.3 || inside || inGarage(pa) || !!state.bench;
    if (lightOn && state.light < 0.05 && state.flicker <= 0) state.flicker = 0.45;
    state.flicker -= dt;
    state.light = damp(state.light, lightOn ? 1 : 0, lightOn ? 9 : 3, dt);
    const fl = state.flicker > 0 ? (Math.sin(t * 90) > 0.2 ? 1 : 0.15) : 1;
    const L = state.light * fl;
    tubeM.emissiveIntensity = L * 1.8;
    tubeHalo.material.opacity = L * (0.28 + 0.4 * night);
    pool.material.opacity = L * (0.12 + 0.38 * night);
    spill.material.opacity = L * night * 0.5 * clamp((1 - doorK) / (1 - K_OPEN), 0, 1);
    lampHalo.material.opacity = 0.18 + 0.6 * night;
    // The sensor's heart light blinks when the door opens, then glows softly
    state.led = Math.max(0, state.led - dt);
    ledM.emissiveIntensity = state.led > 0 ? (Math.sin(t * 22) > 0 ? 2.2 : 0.3) : 0.5 + night;
  };

  return { update, carSpot: CAR_SPOT };
}

// ------------------------------------------------------------------ small helpers
function heartPath(size) {
  const s = new THREE.Shape();
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    if (i === 0) s.moveTo((x / 34) * size, ((y + 4) / 30) * size);
    else s.lineTo((x / 34) * size, ((y + 4) / 30) * size);
  }
  return s;
}

function drawHeart(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y + s);
  c.bezierCurveTo(x - s * 2.1, y - s * 0.2, x - s * 0.9, y - s * 1.7, x, y - s * 0.6);
  c.bezierCurveTo(x + s * 0.9, y - s * 1.7, x + s * 2.1, y - s * 0.2, x, y + s);
  c.fill();
}

function makeCraftHeart() {
  const g = new THREE.Group();
  g.add(at(box(0.16, 0.03, 0.08, DARK_WOOD), 0, 0.015, 0));
  g.add(at(mesh(heartGeo(0.17, 0.035), mat('#e3a35f', { rough: 0.8 })), 0, 0.11, 0));
  return bake(g);
}

function makeCraftBirdhouse() {
  const g = new THREE.Group();
  g.add(at(box(0.13, 0.14, 0.12, '#ffd75e'), 0, 0.07, 0));
  for (const s of [-1, 1]) g.add(rot(at(box(0.1, 0.012, 0.15, RED), s * 0.04, 0.165, 0), 0, 0, -s * 0.75));
  g.add(at(cyl(0.025, 0.025, 0.01, '#4a3423', 10), 0, 0.09, 0.061)).rotation.x = Math.PI / 2;
  g.add(at(cyl(0.005, 0.005, 0.04, DARK_WOOD, 4), 0, 0.05, 0.075)).rotation.x = Math.PI / 2;
  return bake(g);
}

function makeCraftCar() {
  const g = new THREE.Group();
  g.add(at(rbox(0.2, 0.06, 0.11, '#ff8fb1', 0.02), 0, 0.05, 0));
  g.add(at(rbox(0.09, 0.04, 0.09, '#fff6e8', 0.015), -0.02, 0.095, 0));
  for (const [x, z] of [[0.06, 0.055], [-0.06, 0.055], [0.06, -0.055], [-0.06, -0.055]]) g.add(at(rot(cyl(0.022, 0.022, 0.02, '#3b3542', 8), Math.PI / 2, 0, 0), x, 0.022, z));
  g.rotation.y = 0.5;
  return bake(g);
}
