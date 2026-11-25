import * as THREE from 'three';
import { COL, box, rbox, cyl, sph, tor, at, rot, mat, umat, mesh, canvasTexture, roundRect, FONT, glowTex, colorBake } from '../../interiors/clay/models.js';

// Models for the outside of the Clay Café: tile and brick textures, the bottle kiln, the pot-shaped
// sign, the café cat, sparrows, string lights, a clay wind chime and the chalkboard.

// ---------------------------------------------------------------- textures
// Clay roof tiles in overlapping rows; one tile of the texture is 4 tiles wide and 4 rows tall.
let roofTex = null;
export function roofTileTex() {
  if (roofTex) return roofTex;
  roofTex = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#9c4630';
    c.fillRect(0, 0, w, h);
    const tw = w / 4;
    const th = h / 4;
    const tones = ['#d76a47', '#e07a55', '#cc6142', '#de7350', '#d26646'];
    for (let j = 0; j < 4; j++) {
      for (let i = -1; i <= 4; i++) {
        const x = i * tw + (j % 2) * (tw / 2);
        const y = j * th;
        const g = c.createLinearGradient(x, 0, x + tw, 0);
        const base = tones[(i + 5 + j * 2) % tones.length];
        g.addColorStop(0, '#b4553a');
        g.addColorStop(0.42, base);
        g.addColorStop(0.62, '#f19b74');
        g.addColorStop(1, '#b4553a');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(x + 2, y - 4);
        c.lineTo(x + tw - 2, y - 4);
        c.lineTo(x + tw - 2, y + th * 0.62);
        c.quadraticCurveTo(x + tw / 2, y + th * 1.18, x + 2, y + th * 0.62);
        c.closePath();
        c.fill();
        c.strokeStyle = 'rgba(110,40,24,0.35)';
        c.lineWidth = 2;
        c.stroke();
      }
    }
  });
  roofTex.wrapS = roofTex.wrapT = THREE.RepeatWrapping;
  return roofTex;
}

// Terracotta floor tiles with cream grout; one texture tile = 4 x 4 floor tiles (2 m), two of them painted.
let floorTex = null;
export function terraceTex() {
  if (floorTex) return floorTex;
  floorTex = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#efd6bd';
    c.fillRect(0, 0, w, h);
    const tones = ['#e9a985', '#e3a07b', '#eeb08d', '#e19a75', '#e7a480'];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = i * 64;
      const y = j * 64;
      c.fillStyle = tones[(i * 3 + j * 2) % tones.length];
      roundRect(c, x + 2, y + 2, 60, 60, 6);
      c.fill();
      c.fillStyle = 'rgba(255,244,228,0.16)';
      c.fillRect(x + 8, y + 8, 26, 5);
      if ((i === 1 && j === 2) || (i === 3 && j === 0)) {
        // A painted tile: a little flower
        c.fillStyle = '#fff3e2';
        roundRect(c, x + 8, y + 8, 48, 48, 6);
        c.fill();
        const col = i === 1 ? '#6fae9c' : '#e46d8c';
        c.fillStyle = col;
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          c.beginPath();
          c.arc(x + 32 + Math.cos(a) * 9, y + 32 + Math.sin(a) * 9, 6, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = '#ffd166';
        c.beginPath();
        c.arc(x + 32, y + 32, 5, 0, Math.PI * 2);
        c.fill();
      }
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  return floorTex;
}

// Old red bricks with pale mortar; one texture tile = 4 courses.
let bricks = null;
export function brickTex() {
  if (bricks) return bricks;
  bricks = canvasTexture(256, 128, (c, w, h) => {
    c.fillStyle = '#ead2bd';
    c.fillRect(0, 0, w, h);
    const tones = ['#c8674a', '#bd5d42', '#d1714f', '#b55a40', '#c96e52'];
    for (let j = 0; j < 4; j++) {
      for (let i = -1; i < 5; i++) {
        const x = i * 64 + (j % 2) * 32;
        c.fillStyle = tones[(i + 7 + j * 3) % tones.length];
        roundRect(c, x + 2, j * 32 + 2, 60, 28, 4);
        c.fill();
      }
    }
  });
  bricks.wrapS = bricks.wrapT = THREE.RepeatWrapping;
  return bricks;
}

// ---------------------------------------------------------------- the bottle kiln
// A round brick bottle oven with iron bands, an arched firing mouth facing +Z and smoke from the top.
// mouth: a basic material whose colour flickers; smoke: where the smoke leaves (local).
export function makeBottleKiln(r = 0.95, brick = null) {
  const g = new THREE.Group();
  const prof = [[0, 0], [r, 0], [r * 1.03, 0.35], [r * 1.02, 1.05], [r * 0.9, 1.75], [r * 0.66, 2.45], [r * 0.44, 2.95], [r * 0.36, 3.35], [r * 0.36, 3.85], [r * 0.42, 3.92], [r * 0.42, 4.02], [r * 0.3, 4.02]];
  const geo = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 28);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 7, uv.getY(i) * 9);
  g.add(mesh(geo, brick || umat('#ffffff', { rough: 0.9, map: brickTex() })));
  for (const [y, rr] of [[1.05, r * 1.03], [1.9, r * 0.86], [3.5, r * 0.37]]) g.add(rot(at(tor(rr, 0.028, '#5b4a4a', { rough: 0.5 }, Math.PI * 2, 6, 40), 0, y, 0), Math.PI / 2, 0, 0));
  // Stone base ring
  g.add(at(cyl(r + 0.1, r + 0.14, 0.16, '#d9c2ad', 28), 0, 0.08, 0));
  // The firing mouth: a dark brick arch with the fire inside and an iron door standing open
  const arch = new THREE.Shape();
  const aw = 0.36;
  arch.moveTo(-aw - 0.12, 0);
  arch.lineTo(-aw - 0.12, 0.62);
  arch.absarc(0, 0.62, aw + 0.12, Math.PI, 0, true);
  arch.lineTo(aw + 0.12, 0);
  arch.lineTo(aw, 0);
  arch.lineTo(aw, 0.62);
  arch.absarc(0, 0.62, aw, 0, Math.PI, false);
  arch.lineTo(-aw, 0);
  arch.closePath();
  const ag = new THREE.ExtrudeGeometry(arch, { depth: 0.14, bevelEnabled: false, curveSegments: 8 });
  g.add(at(mesh(ag, mat('#8e3f2c', { rough: 0.85 })), 0, 0.16, r * 0.96));
  const mouth = new THREE.MeshBasicMaterial({ color: '#ff9a4a' });
  const fire = new THREE.Shape();
  fire.moveTo(-aw, 0);
  fire.lineTo(-aw, 0.62);
  fire.absarc(0, 0.62, aw, Math.PI, 0, true);
  fire.lineTo(aw, 0);
  fire.closePath();
  const fireMesh = new THREE.Mesh(new THREE.ShapeGeometry(fire, 8), mouth);
  g.add(at(fireMesh, 0, 0.16, r * 0.97 + 0.02));
  // Embers glowing at the bottom of the mouth
  for (let i = 0; i < 5; i++) g.add(at(sph(0.06 + (i % 2) * 0.02, i % 2 ? '#5a2a1c' : '#3d2219', undefined, 8), -0.22 + i * 0.11, 0.2, r * 0.97 + 0.06));
  // A little iron chimney cap and a lamp-black ring on top
  g.add(at(cyl(r * 0.4, r * 0.43, 0.06, '#3f3a3a', 20), 0, 4.03, 0));
  return { root: g, mouth, smoke: new THREE.Vector3(0, 4.1, 0), mouthPos: new THREE.Vector3(0, 0.55, r + 0.1) };
}

// ---------------------------------------------------------------- the pot-shaped sign
// A big flat vase cut from board, cream on the front with "Clay Café" painted across its belly. Faces +Z,
// bottom centre at the origin. Its front glows a little after dark (emissive map).
export function makePotSign(w = 2.0, h = 1.6) {
  const half = [[0.3, 0], [0.42, 0.06], [0.5, 0.24], [0.5, 0.5], [0.44, 0.66], [0.3, 0.78], [0.24, 0.86], [0.27, 0.93], [0.33, 0.97], [0.34, 1.0]];
  const P = half.map(([x, y]) => [x * w, y * h]);
  const s = new THREE.Shape();
  s.moveTo(-P[0][0], 0);
  for (const [x, y] of P) s.lineTo(x, y);
  for (let i = P.length - 1; i >= 0; i--) s.lineTo(-P[i][0], P[i][1]);
  s.closePath();
  const depth = 0.1;
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 4 });
  // Map the front cap onto the painted texture: the shape's box becomes 0..1
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const mx = w * 0.5 + 0.04;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + mx) / (2 * mx), (pos.getY(i) + 0.04) / (h + 0.08));
  const tex = canvasTexture(512, 512 * (h / w) | 0, (c, cw, ch) => {
    const X = (x) => ((x + mx) / (2 * mx)) * cw;
    const Y = (y) => ch - ((y + 0.04) / (h + 0.08)) * ch;
    const path = (inset) => {
      c.beginPath();
      c.moveTo(X(-P[0][0] + inset), Y(inset));
      for (const [x, y] of P) c.lineTo(X(x - inset * (x > 0 ? 1 : -1)), Y(Math.min(y, h - inset)));
      for (let i = P.length - 1; i >= 0; i--) c.lineTo(X(-P[i][0] + inset), Y(Math.min(P[i][1], h - inset)));
      c.closePath();
    };
    c.fillStyle = COL.terra;
    c.fillRect(0, 0, cw, ch);
    path(0.07);
    c.fillStyle = '#fff4e4';
    c.fill();
    // Glaze bands and dots
    c.save();
    path(0.07);
    c.clip();
    c.fillStyle = '#8fd6c6';
    c.fillRect(0, Y(h * 0.3), cw, Y(h * 0.24) - Y(h * 0.3));
    c.fillStyle = '#ffd166';
    c.fillRect(0, Y(h * 0.75), cw, Y(h * 0.72) - Y(h * 0.75));
    c.fillStyle = '#ff8fb1';
    for (let i = 0; i < 9; i++) {
      c.beginPath();
      c.arc(X(-w * 0.4 + i * w * 0.1), Y(h * 0.165), 5, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#8c3f22';
    c.font = `700 ${Math.round(ch * 0.2)}px ${FONT}`;
    c.fillText('Clay', cw / 2, Y(h * 0.555));
    c.font = `700 ${Math.round(ch * 0.14)}px ${FONT}`;
    c.fillText('Café', cw / 2, Y(h * 0.4));
    // A small heart in the neck
    c.fillStyle = '#ef5b6f';
    const hx = cw / 2;
    const hy = Y(h * 0.86);
    c.beginPath();
    c.moveTo(hx, hy + 12);
    c.bezierCurveTo(hx - 20, hy - 2, hx - 10, hy - 18, hx, hy - 7);
    c.bezierCurveTo(hx + 10, hy - 18, hx + 20, hy - 2, hx, hy + 12);
    c.fill();
  });
  const front = new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.12, roughness: 0.7 });
  const side = mat(COL.terraDark, { rough: 0.8 });
  const m = new THREE.Mesh(geo, [front, side]);
  m.castShadow = true;
  m.position.z = -depth / 2;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

// ---------------------------------------------------------------- the café cat
// A ginger cat curled up asleep; head, tail and body breathe and twitch. Each part bakes to one mesh.
export function makeCat(coat = '#f0a35e', stripe = '#d9823e') {
  const root = new THREE.Group();
  const body = new THREE.Group();
  const b = at(sph(0.17, coat, { rough: 0.85 }, 16), 0, 0.11, 0);
  b.scale.set(1.25, 0.68, 0.95);
  body.add(b);
  for (let i = 0; i < 3; i++) {
    const s = at(sph(0.172, stripe, { rough: 0.85 }, 14), -0.08 + i * 0.08, 0.115, 0);
    s.scale.set(0.12, 0.69, 0.96);
    body.add(s);
  }
  for (const x of [0.1, 0.18]) body.add(at(sph(0.045, '#fff4e8', undefined, 8), x, 0.04, 0.13));
  root.add(body);
  const head = new THREE.Group();
  head.position.set(0.19, 0.12, 0.08);
  head.add(at(sph(0.1, coat, { rough: 0.85 }, 14), 0, 0, 0));
  head.add(at(sph(0.06, '#fff4e8', undefined, 10), 0.0, -0.035, 0.06)).scale.set(1.3, 0.75, 0.9);
  head.add(at(sph(0.05, '#fff4e8', undefined, 10), 0.02, -0.03, 0.065)).scale.set(1.2, 0.8, 0.8);
  for (const s of [-1, 1]) {
    const ear = at(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.09, 6), mat(stripe, { rough: 0.85 })), s * 0.055, 0.095, -0.01);
    ear.rotation.z = -s * 0.3;
    head.add(ear);
    head.add(at(box(0.035, 0.006, 0.01, '#4a3423'), s * 0.035, 0.0, 0.09)); // sleepy closed eyes
  }
  head.add(at(sph(0.012, '#ef7b8f', undefined, 6), 0.0, -0.015, 0.1));
  head.rotation.y = 0.6;
  root.add(head);
  const tail = new THREE.Group();
  tail.position.set(-0.2, 0.06, 0.02);
  const tg = new THREE.TorusGeometry(0.16, 0.035, 6, 14, Math.PI * 0.9);
  const t1 = mesh(tg, mat(coat, { rough: 0.85 }));
  t1.rotation.set(Math.PI / 2, 0, Math.PI * 0.35);
  tail.add(t1);
  tail.add(at(sph(0.04, stripe, undefined, 8), 0.07, 0.0, 0.15));
  root.add(tail);
  for (const p of [body, head, tail]) colorBake(p, [], { single: true, cast: false });
  return { root, body, head, tail };
}

// ---------------------------------------------------------------- sparrows
// n little birds as two instanced meshes (bodies, wings): one draw call each.
function bakedGeo(group) {
  const out = colorBake(group, [], { single: true });
  const geo = out[0].geometry;
  out[0].removeFromParent();
  return geo;
}
export function makeSparrows(n) {
  const bg = new THREE.Group();
  const bodyM = at(sph(0.06, '#a2795a', undefined, 12), 0, 0.07, 0);
  bodyM.scale.set(0.9, 0.85, 1.3);
  bg.add(bodyM);
  bg.add(at(sph(0.045, '#f2e1cc', undefined, 10), 0, 0.05, 0.02)).scale.set(0.9, 0.8, 1.2);
  bg.add(at(sph(0.042, '#8a5f43', undefined, 10), 0, 0.12, 0.06));
  bg.add(at(sph(0.03, '#f2e1cc', undefined, 8), 0, 0.105, 0.085));
  for (const s of [-1, 1]) bg.add(at(sph(0.009, '#2b1d18', undefined, 6), s * 0.03, 0.13, 0.085));
  const beak = at(new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.035, 5), mat('#e8a23a')), 0, 0.115, 0.115);
  beak.rotation.x = Math.PI / 2;
  bg.add(beak);
  const tailM = at(box(0.05, 0.012, 0.08, '#6e4a36'), 0, 0.09, -0.1);
  tailM.rotation.x = -0.4;
  bg.add(tailM);
  const wg = new THREE.Group();
  const wing = at(sph(0.05, '#7d5840', undefined, 8), 0.04, 0, 0);
  wing.scale.set(1.1, 0.25, 0.8);
  wg.add(wing);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  const bodies = new THREE.InstancedMesh(bakedGeo(bg), material, n);
  const wings = new THREE.InstancedMesh(bakedGeo(wg), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }), n * 2);
  bodies.castShadow = false;
  wings.castShadow = false;
  bodies.frustumCulled = wings.frustumCulled = false;
  return { bodies, wings };
}

// ---------------------------------------------------------------- string lights
// Bulbs hung along sagging wires. spans: [[x0, y0, z0, x1, y1, z1, sag], ...]. One draw call for the
// bulbs (they glow after dark) and the wires merge into the static mesh.
export function makeStringLights(spans, colors = ['#fff3c4', '#ffd6e2', '#ffe9a8']) {
  const g = new THREE.Group();
  const pts = [];
  const wireMat = mat('#4a3a36', { rough: 0.7 });
  for (const [x0, y0, z0, x1, y1, z1, sag = 0.3] of spans) {
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2 - sag * 2, (z0 + z1) / 2), new THREE.Vector3(x1, y1, z1));
    g.add(mesh(new THREE.TubeGeometry(curve, 16, 0.008, 4, false), wireMat, { cast: false }));
    const len = curve.getLength();
    const n = Math.max(3, Math.round(len / 0.42));
    for (let i = 1; i < n; i++) pts.push(curve.getPoint(i / n));
  }
  const bulbMat = umat('#ffffff', { emissive: '#ffe0a0', ei: 0.55, rough: 0.4 });
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), bulbMat, pts.length);
  const m4 = new THREE.Matrix4();
  const c = new THREE.Color();
  pts.forEach((p, i) => {
    bulbs.setMatrixAt(i, m4.makeTranslation(p.x, p.y - 0.05, p.z));
    bulbs.setColorAt(i, c.set(colors[i % colors.length]));
  });
  bulbs.castShadow = false;
  g.add(bulbs);
  return { group: g, bulbs, points: pts };
}

// ---------------------------------------------------------------- a clay wind chime
export function makeChime() {
  const g = new THREE.Group();
  g.add(at(cyl(0.1, 0.1, 0.03, COL.terra, 14), 0, -0.05, 0));
  g.add(at(cyl(0.004, 0.004, 0.06, '#6b5a6e', 4), 0, -0.01, 0));
  const cols = [COL.mint, COL.rose, COL.sun, COL.sky, '#fff1dc'];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const len = 0.16 + (i % 3) * 0.05;
    g.add(at(cyl(0.003, 0.003, len, '#6b5a6e', 4), Math.sin(a) * 0.075, -0.065 - len / 2, Math.cos(a) * 0.075));
    g.add(at(cyl(0.022, 0.03, 0.07, cols[i], 10), Math.sin(a) * 0.075, -0.065 - len - 0.035, Math.cos(a) * 0.075));
  }
  g.add(at(cyl(0.003, 0.003, 0.28, '#6b5a6e', 4), 0, -0.19, 0));
  g.add(at(sph(0.035, COL.terra, undefined, 10), 0, -0.34, 0)).scale.y = 0.5;
  colorBake(g, [], { single: true, cast: false });
  return g;
}

// A pottery-wheel lump that the outdoor potter throws over and over: a lathe whose shape is set each frame.
export function makeThrowPot(material) {
  const N = 14;
  const pts = Array.from({ length: N }, (_, i) => new THREE.Vector2(0.1, (i / (N - 1)) * 0.2));
  const geo = new THREE.LatheGeometry(pts, 20);
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  const base = geo.attributes.position.array.slice();
  // k: 0 lump .. 1 finished vase
  const shape = (k, wob) => {
    const H = 0.14 + k * 0.24;
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const bx = base[i * 3];
      const bz = base[i * 3 + 2];
      const a = Math.atan2(bz, bx);
      const row = Math.round((base[i * 3 + 1] / 0.2) * (N - 1));
      const s = row / (N - 1);
      const lump = 0.16 * Math.sqrt(Math.max(0, 1 - Math.pow(s * 1.05, 2))) + 0.02;
      const vase = 0.07 + 0.075 * Math.sin(Math.min(1, s * 1.25) * Math.PI) * (1 - s * 0.3) + (s > 0.85 ? (s - 0.85) * 0.35 : 0);
      let r = lump + (vase - lump) * k;
      r *= 1 + Math.sin(a * 3 + wob) * 0.02 * (1 - k * 0.6);
      if (row === N - 1 && k > 0.6) r *= 0.96;
      p.setXYZ(i, Math.cos(a) * r, s * H, Math.sin(a) * r);
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
  };
  shape(0, 0);
  return { mesh: m, shape };
}

// A soft round sprite (lantern halos, smoke, steam). Each gets its own material so it can fade alone.
export function softSprite(color = '#ffffff', opacity = 0.6, scale = 0.4) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, depthWrite: false, opacity }));
  s.scale.setScalar(scale);
  return s;
}
