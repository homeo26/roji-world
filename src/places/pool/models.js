import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, umat, mesh, canvasTexture, roundRect, FONT, rng } from '../../util.js';

// Models for the city pool: loungers, umbrellas, palms, floats, the kiosk, the lifeguard chair,
// the diving tower and the slide. Each builder returns a Group in its own local frame (front +Z).

export const box = (w, h, d, c, o) => mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? mat(c, o) : c);
export const rbox = (w, h, d, c, r = 0.06, o, seg = 2) => mesh(new RoundedBoxGeometry(w, h, d, seg, r), typeof c === 'string' ? mat(c, o) : c);
export const cyl = (a, b, h, c, seg = 14, o) => mesh(new THREE.CylinderGeometry(a, b, h, seg), typeof c === 'string' ? mat(c, o) : c);
export const sph = (r, c, o, seg = 14) => mesh(new THREE.SphereGeometry(r, seg, Math.max(8, Math.round(seg * 0.7))), typeof c === 'string' ? mat(c, o) : c);
export const at = (o, x, y, z) => (o.position.set(x, y, z), o);

const texCache = new Map();
function stripes(colors, n = 10, vertical = true) {
  const key = colors.join() + n + vertical;
  if (!texCache.has(key)) {
    texCache.set(
      key,
      canvasTexture(256, 256, (ctx, w, h) => {
        for (let i = 0; i < n; i++) {
          ctx.fillStyle = colors[i % colors.length];
          if (vertical) ctx.fillRect((i * w) / n, 0, w / n + 1, h);
          else ctx.fillRect(0, (i * h) / n, w, h / n + 1);
        }
      }),
    );
  }
  return texCache.get(key);
}
const texMat = (tex, o = {}) => {
  const key = 'tex' + tex.uuid + JSON.stringify(o);
  if (!texCache.has(key)) texCache.set(key, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, ...o }));
  return texCache.get(key);
};

// A tube along a list of points (chrome rails, frames)
export function rail(points, r = 0.035, color = '#e9f1f4', o = { rough: 0.25, metal: 0.55 }) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.1);
  return mesh(new THREE.TubeGeometry(curve, Math.max(8, points.length * 4), r, 6), mat(color, o));
}

// ---------------------------------------------------------------- loungers and umbrellas
// Sun lounger, length along Z, backrest at -Z. Bed top at about 0.4.
export function lounger(cushionA = '#ffb59e', cushionB = '#fff6ea', frame = '#ffffff') {
  const g = new THREE.Group();
  const cushion = texMat(stripes([cushionA, cushionB], 8, true));
  const fm = mat(frame, { rough: 0.5 });
  const bed = mesh(new RoundedBoxGeometry(0.72, 0.12, 1.35, 2, 0.05), cushion);
  at(bed, 0, 0.36, 0.28);
  const back = mesh(new RoundedBoxGeometry(0.72, 0.12, 0.72, 2, 0.05), cushion);
  back.rotation.x = 0.62;
  at(back, 0, 0.55, -0.62);
  const pillow = rbox(0.5, 0.1, 0.22, cushionB, 0.05);
  pillow.rotation.x = 0.62;
  at(pillow, 0, 0.72, -0.8);
  g.add(bed, back, pillow);
  for (const sx of [-0.32, 0.32]) {
    const sideRail = box(0.05, 0.06, 1.95, fm);
    at(sideRail, sx, 0.27, 0.0);
    g.add(sideRail);
    for (const z of [-0.85, 0.85]) {
      const leg = box(0.06, 0.27, 0.06, fm);
      at(leg, sx, 0.135, z);
      g.add(leg);
    }
    const wheel = cyl(0.07, 0.07, 0.04, '#9fb5bd', 12);
    wheel.rotation.z = Math.PI / 2;
    at(wheel, sx * 1.12, 0.07, -0.85);
    g.add(wheel);
  }
  return g;
}

export function umbrella(colorA = '#ef5b6f', colorB = '#fff6ea', height = 2.3, radius = 1.25) {
  const g = new THREE.Group();
  const pole = cyl(0.035, 0.035, height, '#f4efe6', 8, { rough: 0.5 });
  at(pole, 0, height / 2, 0);
  const base = cyl(0.26, 0.3, 0.1, '#9fb5bd', 16, { rough: 0.6 });
  at(base, 0, 0.05, 0);
  const canopy = mesh(new THREE.ConeGeometry(radius, 0.55, 12, 1, true), texMat(stripes([colorA, colorB], 12), { side: THREE.DoubleSide }));
  at(canopy, 0, height - 0.12, 0);
  const knob = sph(0.07, colorA, { rough: 0.5 }, 10);
  at(knob, 0, height + 0.2, 0);
  g.add(pole, base, canopy, knob);
  // scalloped edge
  const bump = new THREE.SphereGeometry(0.11, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2);
  for (let i = 0; i < 12; i++) {
    const a = ((i + 0.5) / 12) * Math.PI * 2;
    const s = mesh(bump, mat(i % 2 ? colorB : colorA, { rough: 0.75 }), { cast: false });
    s.scale.set(1.5, 0.7, 0.6);
    s.rotation.set(Math.PI, -a + Math.PI / 2, 0);
    at(s, Math.cos(a) * radius * 0.97, height - 0.39, Math.sin(a) * radius * 0.97);
    g.add(s);
  }
  return g;
}

// ---------------------------------------------------------------- plants
function frondGeo(len = 1.35) {
  const geo = new THREE.ConeGeometry(0.2, len, 4, 6);
  geo.rotateX(-Math.PI / 2); // tip toward -Z... we want +X outward
  geo.rotateY(-Math.PI / 2);
  geo.translate(len / 2, 0, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const t = x / len;
    p.setY(i, p.getY(i) * 0.22 + 0.35 * t - 0.95 * t * t);
    p.setZ(i, p.getZ(i) * (1 + 0.6 * Math.sin(t * Math.PI)));
  }
  geo.computeVertexNormals();
  return geo;
}

export function pottedPalm(seed = 1, scale = 1) {
  const g = new THREE.Group();
  const r = rng(seed);
  const pot = cyl(0.42, 0.32, 0.55, '#e08a5f', 16);
  at(pot, 0, 0.275, 0);
  const rim = mesh(new THREE.TorusGeometry(0.42, 0.05, 6, 14), mat('#f0a57c'));
  rim.rotation.x = Math.PI / 2;
  at(rim, 0, 0.55, 0);
  const soil = cyl(0.38, 0.38, 0.04, '#7a5a3c', 14);
  at(soil, 0, 0.53, 0);
  g.add(pot, rim, soil);
  const trunkA = mat('#b9875a', { rough: 0.9 });
  const trunkB = mat('#a3744b', { rough: 0.9 });
  let x = 0;
  let y = 0.52;
  const lean = (r() - 0.5) * 0.12;
  for (let i = 0; i < 7; i++) {
    const seg = cyl(0.1 - i * 0.006, 0.12 - i * 0.006, 0.34, i % 2 ? trunkA : trunkB, 10);
    at(seg, x, y + 0.17, 0);
    seg.rotation.z = -lean * 1.5;
    g.add(seg);
    y += 0.3;
    x += lean * 0.3 * (i + 1) * 0.3;
  }
  const leafM = mat('#4fb56a', { rough: 0.8, flat: true, side: THREE.DoubleSide });
  const leafM2 = mat('#3f9e5a', { rough: 0.8, flat: true, side: THREE.DoubleSide });
  const fg = frondGeo(1.3);
  const n = 8;
  for (let i = 0; i < n; i++) {
    const f = mesh(fg, i % 2 ? leafM : leafM2);
    f.rotation.y = (i / n) * Math.PI * 2 + r() * 0.3;
    f.rotation.z = 0.1 + r() * 0.25;
    f.scale.setScalar(0.85 + r() * 0.3);
    at(f, x, y + 0.08, 0);
    g.add(f);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const c = sph(0.085, '#8a5a32', { rough: 0.7 }, 8);
    at(c, x + Math.cos(a) * 0.12, y - 0.02, Math.sin(a) * 0.12);
    g.add(c);
  }
  g.scale.setScalar(scale);
  return g;
}

export function flowerPlanter(w = 1.6, color = '#ff8fb1', seed = 3) {
  const g = new THREE.Group();
  const r = rng(seed);
  const boxM = rbox(w, 0.45, 0.6, '#fff1dc', 0.06);
  at(boxM, 0, 0.225, 0);
  const trim = rbox(w + 0.06, 0.08, 0.66, '#2bb6c4', 0.03);
  at(trim, 0, 0.45, 0);
  g.add(boxM, trim);
  const bush = new THREE.IcosahedronGeometry(0.2, 0);
  const n = Math.round(w / 0.32);
  for (let i = 0; i < n; i++) {
    const b = mesh(bush, mat('#5cb85c', { rough: 0.85, flat: true }));
    at(b, -w / 2 + 0.2 + (i * (w - 0.4)) / Math.max(1, n - 1), 0.55 + r() * 0.05, (r() - 0.5) * 0.15);
    b.scale.set(1, 0.8, 1);
    g.add(b);
    for (let k = 0; k < 2; k++) {
      const f = sph(0.06, k ? '#fff6ea' : color, { rough: 0.6 }, 6);
      at(f, b.position.x + (r() - 0.5) * 0.3, 0.72 + r() * 0.06, (r() - 0.5) * 0.35);
      g.add(f);
    }
  }
  return g;
}

// ---------------------------------------------------------------- floats (dynamic: few meshes each)
function merged(parts) {
  const geos = parts.map((m) => {
    m.updateMatrix();
    const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    geo.applyMatrix4(m.matrix);
    return geo;
  });
  return mergeGeometries(geos, false);
}

// A swim ring. kind: 'donut' (pink icing and sprinkles) | 'stripes' (blue and white)
export function swimRing(kind = 'donut') {
  const g = new THREE.Group();
  const tex =
    kind === 'donut'
      ? canvasTexture(512, 128, (ctx, w, h) => {
          ctx.fillStyle = '#f2b77a';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#ff8fb8';
          ctx.beginPath();
          ctx.moveTo(0, h * 0.5);
          for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h * 0.5 - 6 + Math.sin(x * 0.09) * 6 + Math.sin(x * 0.23) * 3);
          ctx.lineTo(w, h);
          ctx.lineTo(0, h);
          ctx.fill();
          const r = rng(9);
          const cols = ['#ffffff', '#ffd166', '#6fd3e0', '#8b5cf6', '#7fd3a7'];
          for (let i = 0; i < 90; i++) {
            ctx.save();
            ctx.translate(r() * w, h * 0.6 + r() * h * 0.36);
            ctx.rotate(r() * Math.PI);
            ctx.fillStyle = cols[i % cols.length];
            roundRect(ctx, -6, -2, 12, 4, 2);
            ctx.fill();
            ctx.restore();
          }
        })
      : stripes(['#4ab3f4', '#ffffff'], 8, true);
  const ringM = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.32 });
  ringM.userData.atlasMax = [256, 64];
  const torus = mesh(new THREE.TorusGeometry(0.46, 0.19, 12, 28), ringM);
  torus.rotation.x = -Math.PI / 2;
  g.add(torus);
  return g;
}

export function duckFloat() {
  const g = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: '#ffd84d', roughness: 0.35 });
  const body = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.19, 14, 30), yellow);
  body.rotation.x = -Math.PI / 2;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.35, 12), yellow);
  neck.position.set(0, 0.25, 0.5);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12), yellow);
  head.position.set(0, 0.5, 0.52);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 10), yellow);
  tail.rotation.x = -2.1;
  tail.position.set(0, 0.2, -0.6);
  const yellowM = mesh(merged([body, neck, head, tail]), yellow);
  const beak = mesh(new THREE.SphereGeometry(0.11, 12, 8), mat('#ff9a3c', { rough: 0.4 }));
  beak.scale.set(1.2, 0.45, 1.1);
  beak.position.set(0, 0.46, 0.72);
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6));
  eyeL.position.set(0.1, 0.57, 0.68);
  const eyeR = eyeL.clone();
  eyeR.position.x = -0.1;
  const eyes = mesh(merged([eyeL, eyeR]), mat('#1d130f', { rough: 0.2 }), { cast: false });
  g.add(yellowM, beak, eyes);
  return g;
}

// ---------------------------------------------------------------- signs and labels
// A flat painted label (opaque: paint the whole canvas). atlasMax: largest size it gets in the atlas.
export function paintedPlate(w, h, draw, { pxPerM = 220, atlasMax = [256, 256] } = {}) {
  const tex = canvasTexture(Math.round(w * pxPerM), Math.round(h * pxPerM), draw);
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
  m.userData.atlasMax = atlasMax;
  return mesh(new THREE.PlaneGeometry(w, h), m, { cast: false });
}

// ---------------------------------------------------------------- snack kiosk (counter faces +Z)
export function kiosk() {
  const g = new THREE.Group();
  const W = 3.4;
  const D = 2.2;
  const walls = rbox(W, 2.3, D, '#fff3df', 0.08);
  at(walls, 0, 1.15, 0);
  const band = rbox(W + 0.04, 0.8, D + 0.04, '#5cc8c8', 0.06);
  at(band, 0, 0.4, 0);
  const roof = rbox(W + 0.5, 0.26, D + 0.5, '#ff8fa3', 0.1);
  at(roof, 0, 2.43, 0);
  g.add(walls, band, roof);
  // Serving window with a counter
  const hole = box(2.3, 0.95, 0.06, '#7a4f3a');
  at(hole, 0, 1.45, D / 2 + 0.01);
  const back = box(2.2, 0.85, 0.04, '#ffe2c8');
  at(back, 0, 1.45, D / 2 + 0.03);
  const counter = rbox(2.7, 0.1, 0.5, '#ffd166', 0.04);
  at(counter, 0, 0.98, D / 2 + 0.2);
  g.add(hole, back, counter);
  // Awning
  const aw = mesh(new THREE.PlaneGeometry(3.2, 0.95, 1, 1), texMat(stripes(['#ff6f91', '#ffffff'], 10), { side: THREE.DoubleSide }));
  aw.rotation.x = -1.0;
  at(aw, 0, 2.05, D / 2 + 0.38);
  g.add(aw);
  const scallop = new THREE.SphereGeometry(0.16, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2);
  for (let i = 0; i < 10; i++) {
    const s = mesh(scallop, mat(i % 2 ? '#ffffff' : '#ff6f91', { rough: 0.75 }), { cast: false });
    s.scale.set(1, 0.6, 0.35);
    s.rotation.x = Math.PI;
    at(s, -1.44 + i * 0.32, 1.78, D / 2 + 0.78);
    g.add(s);
  }
  // Menu board painted with an ice cream and a juice
  const menu = paintedPlate(1.0, 0.7, (ctx, w, h) => {
    ctx.fillStyle = '#ffe2c8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4a3a5a';
    roundRect(ctx, 4, 4, w - 8, h - 8, 18);
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = '#fff6ea';
    ctx.textAlign = 'center';
    ctx.font = `600 ${h * 0.17}px ${FONT}`;
    ctx.fillText('Snacks', w / 2, h * 0.22);
    // ice cream
    ctx.fillStyle = '#f2b77a';
    ctx.beginPath();
    ctx.moveTo(w * 0.22, h * 0.52);
    ctx.lineTo(w * 0.36, h * 0.52);
    ctx.lineTo(w * 0.29, h * 0.86);
    ctx.fill();
    ctx.fillStyle = '#ff8fb8';
    ctx.beginPath();
    ctx.arc(w * 0.29, h * 0.47, w * 0.08, 0, Math.PI * 2);
    ctx.fill();
    // juice
    ctx.fillStyle = '#ffb347';
    roundRect(ctx, w * 0.6, h * 0.42, w * 0.16, h * 0.42, 8);
    ctx.fill();
    ctx.fillStyle = '#7fd3a7';
    ctx.fillRect(w * 0.7, h * 0.3, w * 0.025, h * 0.16);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(w * 0.64, h * 0.5, w * 0.03, 0, Math.PI * 2);
    ctx.fill();
  });
  at(menu, -1.05, 1.45, D / 2 + 0.07);
  menu.scale.setScalar(0.62);
  g.add(menu);
  // Goodies on the counter: cones in a stand, juice cups with straws, a bell
  const coneG = new THREE.ConeGeometry(0.06, 0.18, 10);
  coneG.rotateX(Math.PI);
  const scoops = ['#ff8fb8', '#a8e6cf', '#fff1c1', '#c79a6b'];
  for (let i = 0; i < 4; i++) {
    const c = mesh(coneG, mat('#e9a863', { rough: 0.8 }));
    at(c, 0.25 + i * 0.16, 1.12, D / 2 + 0.24);
    const s = sph(0.07, scoops[i], { rough: 0.6 }, 10);
    at(s, 0.25 + i * 0.16, 1.24, D / 2 + 0.24);
    g.add(c, s);
  }
  const cups = ['#ffb347', '#ff6f91', '#7fd3a7'];
  for (let i = 0; i < 3; i++) {
    const cup = cyl(0.06, 0.05, 0.16, '#fffaf4', 12);
    at(cup, -0.45 + i * 0.17, 1.11, D / 2 + 0.26);
    const juice = cyl(0.058, 0.058, 0.02, cups[i], 12);
    at(juice, -0.45 + i * 0.17, 1.19, D / 2 + 0.26);
    const straw = cyl(0.01, 0.01, 0.16, cups[(i + 1) % 3], 6);
    straw.rotation.z = 0.25;
    at(straw, -0.43 + i * 0.17, 1.25, D / 2 + 0.26);
    g.add(cup, juice, straw);
  }
  const bell = sph(0.06, '#f4c24f', { rough: 0.3, metal: 0.6 }, 10);
  bell.scale.y = 0.7;
  at(bell, 1.1, 1.07, D / 2 + 0.3);
  g.add(bell);
  // Giant ice cream on the roof
  const big = new THREE.Group();
  const cone = mesh(new THREE.ConeGeometry(0.45, 1.2, 14), mat('#e9a863', { rough: 0.85 }));
  cone.rotation.x = Math.PI;
  at(cone, 0, 0.6, 0);
  const s1 = sph(0.5, '#ff8fb8', { rough: 0.55 }, 18);
  at(s1, 0, 1.3, 0);
  const s2 = sph(0.4, '#a8e6cf', { rough: 0.55 }, 18);
  at(s2, 0.05, 1.85, 0);
  const cherry = sph(0.13, '#e5484d', { rough: 0.3 }, 12);
  at(cherry, 0.08, 2.3, 0);
  big.add(cone, s1, s2, cherry);
  at(big, 0.95, 2.55, -0.1);
  big.rotation.z = -0.12;
  g.add(big);
  // Stools in front
  for (const x of [-0.8, 0, 0.8]) {
    const seat = cyl(0.22, 0.2, 0.08, '#ff8fa3', 14);
    at(seat, x, 0.6, D / 2 + 0.75);
    const leg = cyl(0.04, 0.05, 0.56, '#e9f1f4', 8, { rough: 0.3, metal: 0.5 });
    at(leg, x, 0.28, D / 2 + 0.75);
    g.add(seat, leg);
  }
  return g;
}

// ---------------------------------------------------------------- lifeguard chair (faces +Z)
export function lifeguardChair() {
  const g = new THREE.Group();
  const wood = mat('#ffffff', { rough: 0.6 });
  for (const sx of [-0.42, 0.42]) {
    for (const sz of [-0.38, 0.42]) {
      const leg = box(0.09, 1.7, 0.09, wood);
      leg.rotation.x = sz > 0 ? -0.12 : 0.06;
      at(leg, sx * (sz > 0 ? 1.05 : 1), 0.85, sz);
      g.add(leg);
    }
  }
  for (const y of [0.4, 0.8, 1.2]) {
    const rung = box(0.92, 0.07, 0.12, wood);
    at(rung, 0, y, 0.43 + (1.6 - y) * 0.05 - 0.06);
    g.add(rung);
  }
  const seat = rbox(0.95, 0.1, 0.7, '#ef5b6f', 0.04);
  at(seat, 0, 1.62, -0.05);
  const back = rbox(0.95, 0.75, 0.08, '#ef5b6f', 0.04);
  back.rotation.x = -0.15;
  at(back, 0, 2.05, -0.42);
  g.add(seat, back);
  const plate = paintedPlate(0.6, 0.35, (ctx, w, h) => {
    ctx.fillStyle = '#ef5b6f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 3, 3, w - 6, h - 6, 12);
    ctx.fill();
    ctx.fillStyle = '#ef5b6f';
    ctx.fillRect(w * 0.42, h * 0.18, w * 0.16, h * 0.64);
    ctx.fillRect(w * 0.3, h * 0.38, w * 0.4, h * 0.24);
  });
  at(plate, 0, 2.1, -0.37);
  plate.rotation.x = -0.15;
  g.add(plate);
  for (const sx of [-0.47, 0.47]) {
    const arm = box(0.06, 0.06, 0.6, wood);
    at(arm, sx, 1.95, -0.05);
    g.add(arm);
  }
  // Lifebuoy hanging on the side
  const buoy = mesh(new THREE.TorusGeometry(0.24, 0.075, 10, 24), texMat(stripes(['#ef5b6f', '#ffffff'], 8)));
  buoy.rotation.y = Math.PI / 2;
  at(buoy, 0.56, 1.1, 0.02);
  g.add(buoy);
  // Sun umbrella above
  const u = umbrella('#ef5b6f', '#ffffff', 1.6, 0.85);
  at(u, 0, 1.68, -0.42);
  g.add(u);
  return g;
}

// A whistle and a little cap for the lifeguard (added to the kid's head group)
export function lifeguardCap() {
  const g = new THREE.Group();
  const cap = mesh(new THREE.SphereGeometry(0.33, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), mat('#ef5b6f', { rough: 0.6 }));
  cap.position.set(0, 0.32, 0);
  const brim = mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 16, 1, false, -Math.PI / 2, Math.PI), mat('#ffffff', { rough: 0.6 }));
  brim.position.set(0, 0.44, 0.22);
  brim.rotation.x = 0.18;
  g.add(cap, brim);
  return g;
}

// ---------------------------------------------------------------- the diving tower
// Platform at x in [0, pw] (local), top at H; stairs come down on +Z; the board points to -X.
export function divingTower({ H = 1.3, pw = 2.8, pd = 2.8, steps = 4, stepD = 0.48, stairW = 1.6, stairX = 1.4, boardLen = 3.0 }) {
  const g = new THREE.Group();
  const side = mat('#4cc3c9', { rough: 0.7 });
  const trim = mat('#fff6ea', { rough: 0.6 });
  const top = rbox(pw, 0.14, pd, trim, 0.05);
  at(top, pw / 2, H - 0.07, 0);
  const body = rbox(pw - 0.1, H - 0.12, pd - 0.1, side, 0.08);
  at(body, pw / 2, (H - 0.12) / 2, 0);
  g.add(top, body);
  // painted waves on the side facing the camera
  const waves = paintedPlate(pw - 0.3, H - 0.4, (ctx, w, h) => {
    ctx.fillStyle = '#4cc3c9';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4cc3c9';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 6) ctx.lineTo(x, h * (0.25 + k * 0.25) + Math.sin(x * 0.045 + k) * 10);
      ctx.stroke();
    }
  });
  at(waves, pw / 2, H / 2 - 0.05, pd / 2 - 0.04 + 0.001);
  // (the stair block covers part of it; it peeks out on the left)
  g.add(waves);
  // stairs
  const rise = H / (steps + 1);
  for (let i = 1; i <= steps; i++) {
    const h = H - rise * i;
    const z0 = pd / 2 + (i - 1) * stepD;
    const tread = rbox(stairW, 0.08, stepD + 0.02, trim, 0.03);
    at(tread, stairX, h - 0.04, z0 + stepD / 2);
    const riser = box(stairW - 0.06, h - 0.08, stepD, side);
    at(riser, stairX, (h - 0.08) / 2, z0 + stepD / 2);
    g.add(tread, riser);
  }
  // rails: stairs and around the platform (open toward the board)
  const zs = pd / 2 + steps * stepD;
  for (const sx of [stairX - stairW / 2 + 0.06, stairX + stairW / 2 - 0.06]) {
    g.add(rail([[sx, 0.85, zs], [sx, 0.85 + H * 0.5, pd / 2 + steps * stepD * 0.5], [sx, H + 0.85, pd / 2 - 0.1]], 0.035));
    for (const [z, y0] of [[zs - 0.05, 0], [pd / 2 + 0.05, H - rise]]) {
      const post = cyl(0.03, 0.03, 0.85, '#e9f1f4', 8, { rough: 0.25, metal: 0.55 });
      at(post, sx, y0 + 0.425 + (z === zs - 0.05 ? 0 : 0), z);
      g.add(post);
    }
  }
  g.add(rail([[0.25, H + 0.85, -pd / 2 + 0.08], [pw - 0.08, H + 0.85, -pd / 2 + 0.08], [pw - 0.08, H + 0.85, pd / 2 - 0.1]], 0.035));
  for (const [x, z] of [[0.25, -pd / 2 + 0.08], [pw / 2, -pd / 2 + 0.08], [pw - 0.08, -pd / 2 + 0.08], [pw - 0.08, 0], [pw - 0.08, pd / 2 - 0.1]]) {
    const post = cyl(0.03, 0.03, 0.85, '#e9f1f4', 8, { rough: 0.25, metal: 0.55 });
    at(post, x, H + 0.425, z);
    g.add(post);
  }
  // little flag
  const pole = cyl(0.025, 0.025, 1.3, '#e9f1f4', 8);
  at(pole, pw - 0.08, H + 1.5, -pd / 2 + 0.08);
  const flag = mesh(new THREE.PlaneGeometry(0.55, 0.34), mat('#ffd166', { side: THREE.DoubleSide }), { cast: false });
  at(flag, pw - 0.08 - 0.3, H + 1.98, -pd / 2 + 0.08);
  g.add(pole, flag);
  // board fulcrum
  const stand = rbox(0.5, 0.18, 0.7, '#ffd166', 0.05);
  at(stand, 0.25, H + 0.04, 0);
  g.add(stand);
  // The board: a pivot at the platform edge so it can flex (dynamic)
  const board = new THREE.Group();
  board.position.set(0.3, H + 0.12, 0);
  const plank = mesh(new RoundedBoxGeometry(boardLen, 0.09, 0.62, 2, 0.04), texMat(stripes(['#ffffff', '#ffffff', '#3fa7f0', '#ffffff', '#ffffff'], 5, false)));
  at(plank, -boardLen / 2 + 0.3, 0, 0);
  const tipPad = box(0.5, 0.095, 0.6, mat('#ffd166', { rough: 0.85 }));
  at(tipPad, -boardLen + 0.55, 0.004, 0);
  board.add(plank, tipPad);
  g.add(board);
  return { group: g, board, flag };
}

// ---------------------------------------------------------------- the slide (slides along +X)
// Tower at local x in [-0.6, 0.6]; the chute starts at x0 and ends at x1 (heights y0 -> y1).
export function slide({ y0 = 1.55, x0 = 0.6, x1 = 3.4, y1 = -0.08, width = 0.62 }) {
  const g = new THREE.Group();
  const pink = mat('#ff8fb1', { rough: 0.6 });
  const tower = rbox(1.2, y0 - 0.1, 1.2, '#ffd166', 0.08);
  at(tower, 0, (y0 - 0.1) / 2, 0);
  const deck = rbox(1.3, 0.12, 1.3, '#fff6ea', 0.05);
  at(deck, 0, y0 - 0.06, 0);
  g.add(tower, deck);
  // ladder on the -X side
  for (const sz of [-0.32, 0.32]) {
    const r = box(0.07, y0 + 0.9, 0.07, '#e9f1f4', { rough: 0.25, metal: 0.55 });
    at(r, -0.68, (y0 + 0.9) / 2, sz);
    g.add(r);
  }
  for (let i = 1; i <= 5; i++) {
    const rung = cyl(0.03, 0.03, 0.64, '#e9f1f4', 8, { rough: 0.25, metal: 0.55 });
    rung.rotation.x = Math.PI / 2;
    at(rung, -0.68, (i * y0) / 5.4, 0);
    g.add(rung);
  }
  // rails around the top
  g.add(rail([[-0.62, y0 + 0.75, -0.6], [0.55, y0 + 0.75, -0.6], [0.6, y0 + 0.4, -0.32]], 0.035, '#ff8fb1', { rough: 0.5 }));
  g.add(rail([[-0.62, y0 + 0.75, 0.6], [0.55, y0 + 0.75, 0.6], [0.6, y0 + 0.4, 0.32]], 0.035, '#ff8fb1', { rough: 0.5 }));
  for (const [x, z] of [[-0.62, -0.6], [0.5, -0.6], [-0.62, 0.6], [0.5, 0.6]]) {
    const p = cyl(0.03, 0.03, 0.75, '#ff8fb1', 8, { rough: 0.5 });
    at(p, x, y0 + 0.375, z);
    g.add(p);
  }
  // chute: a U section swept along the path
  const N = 26;
  const M = 12;
  const pos = [];
  const idx = [];
  const yAt = (t) => y0 + (y1 - y0) * (3 * t * t - 2 * t * t * t);
  const R = width / 2;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = x0 + (x1 - x0) * t;
    const y = yAt(t);
    for (let j = 0; j <= M; j++) {
      const a = Math.PI * (j / M); // 0..PI across the U
      const lip = j === 0 || j === M ? 0.12 : 0;
      pos.push(x, y + R * 0.9 - Math.sin(a) * R * 0.9 + lip, -Math.cos(a) * R);
    }
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * (M + 1) + j;
      const b = a + M + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const uv = [];
  for (let i = 0; i <= N; i++) for (let j = 0; j <= M; j++) uv.push(i / N, j / M);
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const chute = mesh(geo, mat('#ff8fb1', { rough: 0.35, side: THREE.DoubleSide }));
  g.add(chute);
  // a thin outer shell so the rim looks chunky
  const rimL = rail(Array.from({ length: 9 }, (_, i) => [x0 + ((x1 - x0) * i) / 8, yAt(i / 8) + R * 0.9 + 0.12, -R]), 0.045, '#ffffff', { rough: 0.5 });
  const rimR = rail(Array.from({ length: 9 }, (_, i) => [x0 + ((x1 - x0) * i) / 8, yAt(i / 8) + R * 0.9 + 0.12, R]), 0.045, '#ffffff', { rough: 0.5 });
  g.add(rimL, rimR);
  // supports
  for (const t of [0.35, 0.65]) {
    const x = x0 + (x1 - x0) * t;
    const y = yAt(t);
    const s = cyl(0.06, 0.06, y + 0.05, pink, 8);
    at(s, x, (y + 0.05) / 2 - 0.05, 0);
    g.add(s);
  }
  // a trickle of water down the chute (scrolling, transparent)
  const flowTex = canvasTexture(64, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.35 + (i % 3) * 0.2})`;
      roundRect(ctx, 8 + ((i * 23) % 40), (i * 37) % h, 6, 26, 3);
      ctx.fill();
    }
  });
  flowTex.wrapS = flowTex.wrapT = THREE.RepeatWrapping;
  const fpos = [];
  const fuv = [];
  const fidx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = x0 + (x1 - x0) * t;
    const y = yAt(t) + 0.02;
    for (let j = 0; j <= 2; j++) {
      const a = Math.PI * (0.3 + 0.2 * j);
      fpos.push(x, y + R * 0.9 - Math.sin(a) * R * 0.9, -Math.cos(a) * R);
      fuv.push(j / 2, t * 3);
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < 2; j++) {
    const a = i * 3 + j;
    fidx.push(a, a + 3, a + 1, a + 3, a + 4, a + 1);
  }
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3));
  fgeo.setAttribute('uv', new THREE.Float32BufferAttribute(fuv, 2));
  fgeo.setIndex(fidx);
  fgeo.computeVertexNormals();
  const flow = mesh(fgeo, new THREE.MeshBasicMaterial({ color: '#bff3ff', map: flowTex, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }), { cast: false, receive: false });
  g.add(flow);
  return { group: g, flow, flowTex, yAt: (x) => yAt(THREE.MathUtils.clamp((x - x0) / (x1 - x0), 0, 1)) };
}

// ---------------------------------------------------------------- small details
export function towelStack(colors = ['#ff8fb1', '#7fd3e0', '#ffd166']) {
  const g = new THREE.Group();
  colors.forEach((c, i) => {
    const t = rbox(0.55, 0.11, 0.38, c, 0.04);
    at(t, 0, 0.055 + i * 0.11, 0);
    t.rotation.y = (i - 1) * 0.08;
    g.add(t);
  });
  return g;
}

export function shower() {
  const g = new THREE.Group();
  const pole = cyl(0.045, 0.05, 2.3, '#e9f1f4', 10, { rough: 0.25, metal: 0.6 });
  at(pole, 0, 1.15, 0);
  const arm = rail([[0, 2.25, 0], [0, 2.4, 0.15], [0, 2.3, 0.4]], 0.035);
  const head = cyl(0.16, 0.08, 0.1, '#e9f1f4', 14, { rough: 0.25, metal: 0.6 });
  at(head, 0, 2.22, 0.42);
  const drain = cyl(0.42, 0.42, 0.02, '#cfe9ef', 20, { rough: 0.5 });
  at(drain, 0, 0.012, 0.3);
  const knob = sph(0.06, '#ef5b6f', { rough: 0.4 }, 10);
  at(knob, 0, 1.2, 0.06);
  g.add(pole, arm, head, drain, knob);
  return g;
}

export function noodleBin() {
  const g = new THREE.Group();
  const bin = cyl(0.36, 0.3, 0.6, '#fff3df', 16);
  at(bin, 0, 0.3, 0);
  const band = cyl(0.37, 0.37, 0.12, '#5cc8c8', 16);
  at(band, 0, 0.46, 0);
  g.add(bin, band);
  const cols = ['#ff6f91', '#ffd166', '#7fd3a7', '#6fb8ff', '#c7a6ff'];
  cols.forEach((c, i) => {
    const a = (i / cols.length) * Math.PI * 2;
    const n = cyl(0.075, 0.075, 1.5, c, 10, { rough: 0.5 });
    n.rotation.set(Math.sin(a) * 0.18, 0, Math.cos(a) * 0.18);
    at(n, Math.cos(a) * 0.16, 0.85, Math.sin(a) * 0.16);
    g.add(n);
  });
  return g;
}

export function buoyPost() {
  const g = new THREE.Group();
  const post = box(0.12, 1.5, 0.12, '#fff6ea');
  at(post, 0, 0.75, 0);
  const buoy = mesh(new THREE.TorusGeometry(0.3, 0.09, 10, 24), texMat(stripes(['#ef5b6f', '#ffffff'], 8)));
  at(buoy, 0, 1.15, 0.13);
  const cap = sph(0.09, '#ef5b6f', { rough: 0.4 }, 10);
  at(cap, 0, 1.52, 0);
  g.add(post, buoy, cap);
  return g;
}

export function sideTable() {
  const g = new THREE.Group();
  const top = cyl(0.3, 0.3, 0.05, '#ffffff', 18);
  at(top, 0, 0.5, 0);
  const leg = cyl(0.04, 0.06, 0.5, '#e9f1f4', 8);
  at(leg, 0, 0.25, 0);
  g.add(top, leg);
  for (const [x, c] of [[-0.1, '#ffb347'], [0.12, '#ff6f91']]) {
    const glass = cyl(0.05, 0.04, 0.14, '#fffaf4', 10);
    at(glass, x, 0.6, 0.02);
    const juice = cyl(0.048, 0.048, 0.02, c, 10);
    at(juice, x, 0.665, 0.02);
    const straw = cyl(0.008, 0.008, 0.14, '#7fd3a7', 6);
    straw.rotation.z = 0.3;
    at(straw, x + 0.02, 0.7, 0.02);
    g.add(glass, juice, straw);
  }
  const lemon = sph(0.05, '#ffe066', { rough: 0.5 }, 8);
  at(lemon, 0.02, 0.56, -0.15);
  g.add(lemon);
  return g;
}

export function sunglasses() {
  const g = new THREE.Group();
  const lens = new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16);
  lens.rotateX(Math.PI / 2);
  const lm = umat('#2a2340', { rough: 0.15 });
  const fm = umat('#ff6f91', { rough: 0.4 });
  for (const s of [1, -1]) {
    const l = new THREE.Mesh(lens, lm);
    l.position.set(0.105 * s, 0, 0);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.014, 6, 18), fm);
    rim.position.set(0.105 * s, 0, 0.004);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.26), fm);
    arm.position.set(0.19 * s, 0.01, -0.13);
    g.add(l, rim, arm);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.016, 0.016), fm);
  g.add(bridge);
  return g;
}
