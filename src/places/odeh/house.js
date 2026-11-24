// Odeh and Hanan's house on top of the hill: cream limestone walls, arched windows with blue
// shutters, a blue arched door, a courtyard with a lemon tree and jasmine, a bench outside, and a
// flat roof with the water tank, a solar heater and a satellite dish (and one of Sultan's toys).
import { THREE, mat, umat, mesh, box, rbox, cyl, sph, cone, tor, caps, at, sc, panel, canvasTexture, roundRect, FONT, rng, P, C, bakePart } from './kit.js';
import { L2, HOUSE, DOOR, T2, Z, STAIR, SPOT } from './layout.js';
import { lantern } from './hill.js';

function limeTex() {
  const r = rng(31);
  const t = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#e6d3b2';
    ctx.fillRect(0, 0, w, h);
    const rows = 8;
    const rh = h / rows;
    for (let row = 0; row < rows; row++) {
      let x = -((row * 71) % 120);
      while (x < w) {
        const bw = 90 + r() * 90;
        const tone = ['#f6ead4', '#f2e3c8', '#f8eedb', '#efdec0', '#f4e6cd'][Math.floor(r() * 5)];
        ctx.fillStyle = tone;
        roundRect(ctx, x + 3, row * rh + 3, bw - 6, rh - 6, 8);
        ctx.fill();
        ctx.fillStyle = 'rgba(190,150,100,0.12)';
        for (let i = 0; i < 6; i++) ctx.fillRect(x + 8 + r() * (bw - 20), row * rh + 10 + r() * (rh - 22), 3 + r() * 4, 2);
        x += bw;
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function tileTex() {
  const t = canvasTexture(256, 256, (ctx, w, h) => {
    const s = w / 4;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#f0dcc0' : '#e8cfae';
        ctx.fillRect(i * s, j * s, s, s);
        ctx.strokeStyle = '#d4b68e';
        ctx.lineWidth = 3;
        ctx.strokeRect(i * s + 1.5, j * s + 1.5, s - 3, s - 3);
        if ((i + j) % 2 === 0) {
          ctx.fillStyle = '#2f86c8';
          ctx.beginPath();
          ctx.moveTo(i * s + s / 2, j * s + 12);
          ctx.lineTo(i * s + s - 12, j * s + s / 2);
          ctx.lineTo(i * s + s / 2, j * s + s - 12);
          ctx.lineTo(i * s + 12, j * s + s / 2);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#f6ead4';
          ctx.beginPath();
          ctx.arc(i * s + s / 2, j * s + s / 2, 7, 0, P * 2);
          ctx.fill();
        }
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function texPlane(material, w, h, rx, ry, rep = 1) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / rep), uv.getY(i) * (h / rep));
  return mesh(g, material, { cast: false });
}

// An arch-topped shape: width w, straight part h (the half circle sits on top)
function archShape(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h);
  s.absarc(0, h, w / 2, 0, P, false);
  s.lineTo(-w / 2, 0);
  return s;
}

function archWindow(g, glass, x, y, z, { w = 0.95, h = 0.9, flowers = false, shutters = C.turq } = {}) {
  const W = new THREE.Group();
  // Stone surround
  const sur = new THREE.ShapeGeometry(archShape(w + 0.26, h), 14);
  W.add(at(mesh(sur, mat(C.stoneEdge, { rough: 0.85 }), { cast: false }), 0, -0.13, 0.012));
  W.add(at(mesh(new THREE.ShapeGeometry(archShape(w, h), 14), glass, { cast: false }), 0, 0, 0.03));
  // Frame and the iron grille
  const frame = mat('#f7f0e2', { rough: 0.6 });
  W.add(at(box(0.05, h + w / 2, 0.04, frame), 0, (h + w / 2) / 2, 0.05));
  W.add(at(box(w, 0.05, 0.04, frame), 0, h * 0.55, 0.05));
  const iron = mat('#2b3b4a', { rough: 0.5 });
  for (let i = -1; i <= 1; i++) W.add(at(box(0.02, h, 0.02, iron), i * (w / 3), h / 2, 0.08));
  W.add(at(mesh(new THREE.TorusGeometry(w / 2 - 0.03, 0.012, 4, 14, P), iron), 0, h, 0.08));
  // Sill
  W.add(at(rbox(w + 0.34, 0.08, 0.2, C.stoneEdge, 0.03), 0, -0.06, 0.09));
  // Open shutters
  if (shutters) {
    for (const s of [1, -1]) {
      const sh = new THREE.Group();
      sh.add(at(rbox(w / 2, h + 0.2, 0.05, shutters, 0.02), 0, (h + 0.2) / 2, 0));
      for (let i = 0; i < 5; i++) sh.add(at(box(w / 2 - 0.08, 0.03, 0.02, '#3aa3a8'), 0, 0.15 + i * ((h - 0.1) / 5), 0.03));
      sh.position.set(s * (w / 2 + 0.13 + w / 4), -0.04, 0.06);
      W.add(sh);
    }
  }
  if (flowers) {
    W.add(at(rbox(w + 0.1, 0.2, 0.24, C.terra, 0.04), 0, -0.2, 0.2));
    const r = rng(Math.round(x * 13 + 7));
    for (let i = 0; i < 7; i++) {
      const fx = -w / 2 + 0.1 + (i / 6) * (w - 0.2);
      W.add(at(sph(0.08, '#4f9a55', 8, 6), fx, -0.06, 0.2 + (r() - 0.5) * 0.08));
      W.add(at(sph(0.05, i % 3 ? '#e5484d' : '#ff8fb1', 8, 6), fx + 0.02, 0.0 + r() * 0.05, 0.25));
    }
  }
  W.position.set(x, y, z);
  g.add(W);
  return W;
}

function blueDoor(g, x, y, z) {
  const D = new THREE.Group();
  const w = 1.4;
  const h = 1.6;
  const blue = mat(C.blue, { rough: 0.55 });
  const dark = mat(C.blueDark, { rough: 0.6 });
  const brass = mat(C.brass, { rough: 0.35, metal: 0.5 });
  // Stone arch surround and a step
  D.add(at(mesh(new THREE.ShapeGeometry(archShape(w + 0.5, h), 16), mat(C.stoneEdge, { rough: 0.85 }), { cast: false }), 0, 0, 0.012));
  D.add(at(rbox(w + 0.7, 0.1, 0.5, C.stoneEdge, 0.03), 0, 0.05, 0.25));
  // Two leaves and the arch
  for (const s of [1, -1]) {
    D.add(at(box(w / 2 - 0.02, h, 0.08, blue), (s * w) / 4, h / 2, 0.05));
    for (const py of [0.42, 1.12]) D.add(at(box(w / 2 - 0.2, 0.5, 0.03, dark), (s * w) / 4, py, 0.1));
    for (let i = 0; i < 4; i++) D.add(at(sph(0.022, brass, 6, 4), (s * w) / 4 + (i % 2 ? 0.14 : -0.14), 0.25 + Math.floor(i / 2) * 1.12, 0.11));
  }
  const top = new THREE.Shape();
  top.moveTo(-w / 2, 0);
  top.absarc(0, 0, w / 2, P, 0, true);
  top.lineTo(-w / 2, 0);
  D.add(at(mesh(new THREE.ShapeGeometry(top, 16), blue, { cast: false }), 0, h, 0.05));
  // A sun-ray fan on the arch
  for (let i = 0; i < 7; i++) {
    const a = (i / 6) * P;
    D.add(at(box(0.03, w / 2 - 0.08, 0.02, '#f7f0e2'), Math.cos(a) * (w / 4), h + Math.sin(a) * (w / 4), 0.1, 0, 0, a - P / 2));
  }
  D.add(at(box(0.04, h, 0.03, dark), 0, h / 2, 0.1));
  // Knocker hands (brass rings)
  for (const s of [1, -1]) D.add(at(tor(0.06, 0.014, brass, 5, 12), s * 0.14, 1.0, 0.12));
  D.position.set(x, y, z);
  g.add(D);
  return D;
}

export function buildHouse(ctx, out) {
  const { g, dynamic, colliders } = out;
  const glass = umat('#ffe2a8', { emissive: '#ffc070', ei: 0.3, rough: 0.35 });
  out.windowGlass = glass;
  const lime = new THREE.MeshStandardMaterial({ map: limeTex(), roughness: 0.9 });
  const H = HOUSE;
  const w = H.x1 - H.x0;
  const d = H.z1 - H.z0;
  const cx = (H.x0 + H.x1) / 2;
  const cz = (H.z0 + H.z1) / 2;
  const y0 = L2;

  // Walls
  g.add(at(box(w, H.h, d, C.lime), cx, y0 + H.h / 2, cz));
  g.add(at(texPlane(lime, w, H.h, 0, 0, 2.4), cx, y0 + H.h / 2, H.z1 + 0.006));
  for (const s of [1, -1]) g.add(at(texPlane(lime, d, H.h, 0, 0, 2.4), cx + (s * w) / 2 + s * 0.006, y0 + H.h / 2, cz, 0, (s * P) / 2, 0));
  // Corner stones, a plinth and a cornice
  for (const s of [1, -1]) {
    for (let i = 0; i < 6; i++) g.add(at(rbox(0.36 + (i % 2) * 0.14, 0.5, 0.36 + (i % 2) * 0.14, C.limeDark, 0.04), cx + s * (w / 2 - 0.12), y0 + 0.3 + i * 0.52, H.z1 - 0.12));
  }
  g.add(at(box(w + 0.12, 0.28, 0.12, C.limeDark), cx, y0 + 0.14, H.z1 + 0.04));
  g.add(at(rbox(w + 0.3, 0.18, d + 0.3, C.stoneEdge, 0.04), cx, y0 + H.h + 0.02, cz));
  // Parapet round the roof with little arched cut-outs
  const py = y0 + H.h + 0.11;
  g.add(at(box(w + 0.1, 0.5, 0.18, C.lime), cx, py + 0.25, H.z1 - 0.05));
  g.add(at(box(w + 0.1, 0.5, 0.18, C.lime), cx, py + 0.25, H.z0 + 0.05));
  for (const s of [1, -1]) g.add(at(box(0.18, 0.5, d, C.lime), cx + s * (w / 2 - 0.05), py + 0.25, cz));
  for (let i = 0; i < 9; i++) g.add(at(mesh(new THREE.ShapeGeometry(archShape(0.38, 0.12), 8), mat('#cdb48c'), { cast: false }), H.x0 + 1.0 + i * ((w - 2) / 8), py + 0.1, H.z1 + 0.045));
  g.add(at(box(w - 0.3, 0.06, d - 0.3, '#d8c4a4'), cx, py + 0.04, cz));

  // Door and windows
  blueDoor(g, DOOR.x, y0, H.z1);
  archWindow(g, glass, -2.75, y0 + 0.95, H.z1, { flowers: true });
  archWindow(g, glass, 2.75, y0 + 0.95, H.z1, { flowers: true });
  archWindow(g, glass, -5.2, y0 + 0.95, H.z1, { w: 0.8 });
  archWindow(g, glass, 5.2, y0 + 0.95, H.z1, { w: 0.8 });
  // A little round window above the door, and a lantern
  g.add(at(mesh(new THREE.CircleGeometry(0.26, 18), glass, { cast: false }), 0, y0 + 2.75, H.z1 + 0.02));
  g.add(at(tor(0.27, 0.04, C.stoneEdge, 6, 20), 0, y0 + 2.75, H.z1 + 0.04));
  const brass = mat(C.brass, { rough: 0.4, metal: 0.4 });
  const lan = lantern(out.glass, brass);
  lan.position.set(1.12, y0 + 1.86, H.z1 + 0.22);
  g.add(lan);
  g.add(at(box(0.04, 0.04, 0.26, '#3b2b3f'), 1.12, y0 + 2.42, H.z1 + 0.12));
  out.halos.push(new THREE.Vector3(1.12, y0 + 2.08, H.z1 + 0.22));
  // A blue ceramic name tile by the door (a little star pattern)
  const tile = panel(0.42, 0.3, 128, 96, (c, cw, ch) => {
    c.fillStyle = '#f7f0e2';
    c.fillRect(0, 0, cw, ch);
    c.strokeStyle = '#2f86c8';
    c.lineWidth = 6;
    c.strokeRect(6, 6, cw - 12, ch - 12);
    c.fillStyle = '#2f86c8';
    c.font = `700 40px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('7', cw / 2, ch / 2 + 2);
    for (const [px, py2] of [[22, 22], [cw - 22, 22], [22, ch - 22], [cw - 22, ch - 22]]) {
      c.beginPath();
      c.arc(px, py2, 6, 0, P * 2);
      c.fill();
    }
  });
  g.add(at(tile, -1.15, y0 + 1.75, H.z1 + 0.02));

  // Jasmine climbing up beside the door and along the top
  const r = rng(41);
  const vine = new THREE.Group();
  const leafM = mat('#4f9a55');
  const leafM2 = mat('#6fb85f');
  const jas = mat(C.jasmine, { rough: 0.5 });
  const vinePts = [];
  for (let i = 0; i < 16; i++) vinePts.push([-1.75 + Math.sin(i * 0.9) * 0.12, 0.2 + i * 0.17]);
  for (let i = 0; i < 12; i++) vinePts.push([-1.6 + i * 0.27, 2.9 + Math.sin(i * 1.3) * 0.12]);
  for (const [vx, vy] of vinePts) {
    vine.add(at(sph(0.15 + r() * 0.06, r() < 0.5 ? leafM : leafM2, 7, 4), vx, vy, 0.12));
    for (let k = 0; k < 2; k++) vine.add(at(sph(0.035, jas, 4, 3), vx + (r() - 0.5) * 0.26, vy + (r() - 0.5) * 0.2, 0.24));
  }
  vine.position.set(0, y0, H.z1);
  g.add(vine);

  // Courtyard: blue-and-cream tiles, low walls, a gate arch at the top of the steps
  const tiles = new THREE.MeshStandardMaterial({ map: tileTex(), roughness: 0.75 });
  const S0 = STAIR.hw;
  for (const [x0, x1, z0, z1] of [[T2.x0 + 0.3, T2.x1 - 0.3, H.z1, Z.t2Top], [T2.x0 + 0.3, -S0, Z.t2Top, Z.t2Front - 0.3], [S0, T2.x1 - 0.3, Z.t2Top, Z.t2Front - 0.3]]) {
    const tp = texPlane(tiles, x1 - x0, z1 - z0, 0, 0, 1.6);
    tp.rotation.x = -P / 2;
    tp.position.set((x0 + x1) / 2, y0 + 0.006, (z0 + z1) / 2);
    g.add(tp);
  }
  const wallH = 0.55;
  const lowWall = (x0, x1, z0, z1) => {
    g.add(at(box(x1 - x0, wallH, z1 - z0, C.lime), (x0 + x1) / 2, y0 + wallH / 2, (z0 + z1) / 2));
    g.add(at(rbox(x1 - x0 + 0.06, 0.08, z1 - z0 + 0.06, C.stoneEdge, 0.03), (x0 + x1) / 2, y0 + wallH + 0.02, (z0 + z1) / 2));
    colliders.push({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: (x1 - x0) / 2, hd: (z1 - z0) / 2, h: y0 + wallH + 0.04 });
  };
  const S = STAIR.hw;
  lowWall(T2.x0, -S - 0.3, Z.t2Front - 0.3, Z.t2Front);
  lowWall(S + 0.3, T2.x1, Z.t2Front - 0.3, Z.t2Front);
  lowWall(T2.x0, T2.x0 + 0.3, Z.back + 0.3, Z.t2Front - 0.3);
  lowWall(T2.x1 - 0.3, T2.x1, Z.back + 0.3, Z.t2Front - 0.3);
  // Gate pillars and the arch over the top of the steps
  for (const s of [1, -1]) {
    g.add(at(rbox(0.5, 2.3, 0.5, C.lime, 0.05), s * (S + 0.2), y0 + 1.15, Z.t2Top - 0.1));
    g.add(at(rbox(0.6, 0.12, 0.6, C.stoneEdge, 0.04), s * (S + 0.2), y0 + 2.32, Z.t2Top - 0.1));
    colliders.push({ type: 'box', x: s * (S + 0.2), z: Z.t2Top - 0.1, hw: 0.25, hd: 0.25 });
  }
  const arch = mesh(new THREE.TorusGeometry(S + 0.2, 0.13, 8, 24, P), mat(C.lime));
  g.add(at(arch, 0, y0 + 2.3, Z.t2Top - 0.1));
  for (let i = 0; i < 14; i++) {
    const a = (i / 13) * P;
    g.add(at(sph(0.14, i % 2 ? leafM : leafM2, 7, 4), Math.cos(a) * (S + 0.2), y0 + 2.3 + Math.sin(a) * (S + 0.2), Z.t2Top - 0.02));
    g.add(at(sph(0.035, jas, 6, 4), Math.cos(a + 0.1) * (S + 0.26), y0 + 2.34 + Math.sin(a + 0.1) * (S + 0.26), Z.t2Top + 0.1));
  }

  // The lemon tree in a round stone planter
  const lem = new THREE.Group();
  lem.add(at(cyl(0.7, 0.75, 0.5, C.stone, 18), 0, 0.25, 0));
  lem.add(at(tor(0.7, 0.06, C.stoneEdge, 6, 22), 0, 0.5, 0, P / 2, 0, 0));
  lem.add(at(cyl(0.64, 0.64, 0.04, '#6b4a30', 16), 0, 0.48, 0));
  lem.add(at(cyl(0.08, 0.11, 1.2, '#7d6a52', 8), 0, 1.0, 0));
  for (const [bx, by, bz, br] of [[0, 2.0, 0, 0.72], [0.45, 1.75, 0.1, 0.5], [-0.42, 1.8, -0.05, 0.52], [0.05, 1.72, 0.45, 0.45]]) lem.add(at(sph(br, '#3f8f4e', 12, 9), bx, by, bz));
  for (let i = 0; i < 14; i++) {
    const a = r() * P * 2;
    const yy = 1.55 + r() * 0.8;
    const rr = 0.55 + r() * 0.2;
    lem.add(at(sc(sph(0.075, C.lemon, 8, 6), 1, 1.2, 1), Math.sin(a) * rr, yy, Math.cos(a) * rr));
  }
  lem.add(at(sc(sph(0.075, C.lemon, 8, 6), 1, 1.2, 1), 0.5, 0.56, 0.3));
  lem.position.set(SPOT.lemon.x, y0, SPOT.lemon.z);
  g.add(lem);
  colliders.push({ type: 'circle', x: SPOT.lemon.x, z: SPOT.lemon.z, r: 0.78, h: y0 + 0.52 });

  // The bench outside, with cushions
  const B = new THREE.Group();
  B.add(at(rbox(1.9, 0.1, 0.55, C.wood, 0.03), 0, 0.42, 0));
  for (const s of [1, -1]) B.add(at(box(0.1, 0.42, 0.45, C.woodDark), s * 0.85, 0.21, 0));
  B.add(at(rbox(1.9, 0.5, 0.08, C.wood, 0.03), 0, 0.72, -0.24));
  B.add(at(rbox(0.82, 0.1, 0.46, '#c0392b', 0.04), -0.45, 0.51, 0.02));
  B.add(at(rbox(0.82, 0.1, 0.46, '#2b4a6e', 0.04), 0.45, 0.51, 0.02));
  B.position.set(SPOT.bench.x, y0, SPOT.bench.z);
  g.add(B);
  colliders.push({ type: 'box', x: SPOT.bench.x, z: SPOT.bench.z, hw: 0.95, hd: 0.3, h: y0 + 0.5 });

  // Odeh's slippers by the door (an easter egg), the doormat and pots
  const mat2 = panel(1.2, 0.6, 192, 96, (c, cw, ch) => {
    c.fillStyle = '#c8743f';
    c.fillRect(0, 0, cw, ch);
    c.fillStyle = '#e7b54a';
    c.fillRect(10, 10, cw - 20, ch - 20);
    c.fillStyle = '#7a2e3a';
    c.font = `700 34px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('Ahlan', cw / 2, ch / 2 + 2);
  });
  mat2.rotation.x = -P / 2;
  mat2.position.set(0, y0 + 0.012, H.z1 + 0.62);
  g.add(mat2);
  for (const s of [0, 1]) {
    const sl = new THREE.Group();
    sl.add(at(sc(sph(0.09, '#7a4a2a', 10, 6), 0.75, 0.25, 1.4), 0, 0.02, 0));
    sl.add(at(sc(sph(0.07, '#5a3420', 10, 6, ), 0.9, 0.5, 0.8), 0, 0.04, 0.05));
    sl.position.set(1.05 + s * 0.2, y0, H.z1 + 0.5 + s * 0.03);
    sl.rotation.y = 0.2 - s * 0.35;
    g.add(sl);
  }
  for (const [px, pz, big] of [[-8.6, -2.0, 1], [8.6, -2.0, 1], [-7.4, -7.1, 0], [7.4, -7.1, 0], [-3.4, -7.15, 0]]) {
    const pot = new THREE.Group();
    const k = big ? 1.25 : 1;
    pot.add(at(cyl(0.24 * k, 0.18 * k, 0.4 * k, C.terra, 14), 0, 0.2 * k, 0));
    pot.add(at(tor(0.24 * k, 0.03, C.terraDark, 6, 16), 0, 0.4 * k, 0, P / 2, 0, 0));
    for (let i = 0; i < 5; i++) pot.add(at(sph(0.11 * k, '#4f9a55', 8, 6), (r() - 0.5) * 0.24 * k, 0.48 * k + r() * 0.12, (r() - 0.5) * 0.24 * k));
    for (let i = 0; i < 6; i++) pot.add(at(sph(0.045 * k, i % 2 ? '#e5484d' : '#ff8fb1', 6, 4), (r() - 0.5) * 0.32 * k, 0.58 * k + r() * 0.1, (r() - 0.5) * 0.32 * k));
    pot.position.set(px, y0, pz);
    g.add(pot);
    colliders.push({ type: 'circle', x: px, z: pz, r: 0.28 * k, h: y0 + 0.45 * k });
  }
  // A big clay water jar in the corner
  const jar = mesh(new THREE.LatheGeometry([[0, 0], [0.18, 0.02], [0.32, 0.25], [0.3, 0.55], [0.14, 0.75], [0.12, 0.85], [0.15, 0.88], [0, 0.88]].map(([a, b]) => new THREE.Vector2(a, b)), 16), mat('#c8743f'));
  g.add(at(jar, -8.4, y0, -6.2));
  colliders.push({ type: 'circle', x: -8.4, z: -6.2, r: 0.34 });

  // ---------------------------------------------------------------- the roof
  const ry = y0 + H.h + 0.12;
  // Water tank, with "Oooodeh!" painted on it by a small hand (an easter egg)
  const tank = new THREE.Group();
  tank.add(at(cyl(0.55, 0.55, 1.1, '#f4f0e8', 20), 0, 0.75, 0));
  tank.add(at(cyl(0.58, 0.58, 0.06, '#d8d0c0', 20), 0, 1.32, 0));
  tank.add(at(cyl(0.15, 0.15, 0.1, '#d8d0c0', 10), 0, 1.38, 0));
  for (const [sx, sz] of [[0.35, 0.35], [-0.35, 0.35], [0.35, -0.35], [-0.35, -0.35]]) tank.add(at(box(0.06, 0.2, 0.06, '#8a8a8a'), sx, 0.1, sz));
  tank.position.set(-4.4, ry, -11.6);
  g.add(tank);
  const ooo = panel(0.9, 0.34, 256, 96, (c, cw, ch) => {
    c.fillStyle = '#f4f0e8';
    c.fillRect(0, 0, cw, ch);
    c.font = `700 52px ${FONT}`;
    c.fillStyle = '#ef5b6f';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.save();
    c.translate(cw / 2, ch / 2);
    c.rotate(-0.05);
    c.fillText('Oooodeh!', -8, 2);
    c.restore();
    c.fillStyle = '#ef5b6f';
    c.beginPath();
    const hx = cw - 26;
    const hy = 40;
    c.moveTo(hx, hy + 14);
    c.bezierCurveTo(hx - 20, hy, hx - 10, hy - 14, hx, hy - 4);
    c.bezierCurveTo(hx + 10, hy - 14, hx + 20, hy, hx, hy + 14);
    c.fill();
  });
  const ooGeo = new THREE.CylinderGeometry(0.556, 0.556, 0.34, 20, 1, true, -0.85, 1.7);
  ooo.geometry.dispose();
  ooo.geometry = ooGeo;
  ooo.position.set(-4.4, ry + 0.72, -11.6);
  g.add(ooo);
  // Solar water heater
  const sol = new THREE.Group();
  sol.add(at(box(1.5, 0.06, 1.0, '#2c3e66'), 0, 0.55, 0, -0.6, 0, 0));
  for (let i = 0; i < 6; i++) sol.add(at(box(0.02, 0.07, 0.98, '#8fb3d9'), -0.62 + i * 0.25, 0.56, 0, -0.6, 0, 0));
  sol.add(at(cyl(0.22, 0.22, 1.6, '#e8e4dc', 14), 0, 0.92, -0.42, 0, 0, P / 2));
  for (const s of [1, -1]) sol.add(at(box(0.05, 0.8, 0.05, '#8a8a8a'), s * 0.65, 0.4, -0.35));
  sol.position.set(1.4, ry, -11.4);
  g.add(sol);
  // Satellite dish
  const dish = new THREE.Group();
  dish.add(at(cyl(0.03, 0.03, 0.7, '#8a8a8a', 6), 0, 0.35, 0));
  const bowl = mesh(new THREE.SphereGeometry(0.42, 16, 8, 0, P * 2, 0, P * 0.32), mat('#f4f4f4', { rough: 0.5, side: THREE.DoubleSide }));
  bowl.rotation.x = 1.0;
  dish.add(at(bowl, 0, 0.75, 0.05));
  dish.add(at(cyl(0.012, 0.012, 0.42, '#8a8a8a', 4), 0, 0.85, 0.28, 1.0, 0, 0));
  dish.add(at(sph(0.04, '#3b2b3f', 6, 4), 0, 0.98, 0.45));
  dish.position.set(5.3, ry, -8.4);
  dish.rotation.y = -0.4;
  g.add(dish);
  // Clothesline with Sultan's tiny shirts
  for (const s of [1, -1]) g.add(at(cyl(0.025, 0.025, 1.3, '#8a8a8a', 6), -1.8 + s * 1.6, ry + 0.65, -9.0));
  g.add(at(cyl(0.008, 0.008, 3.2, '#e8e8e8', 4), -1.8, ry + 1.25, -9.0, 0, 0, P / 2));
  const cloth = ['#ffd166', '#7fd3ff', '#ef5b6f', '#ffffff', '#3fbf7f'];
  for (let i = 0; i < 5; i++) {
    const cw = i % 2 ? 0.3 : 0.42;
    g.add(at(box(cw, i % 2 ? 0.3 : 0.4, 0.02, cloth[i]), -3.0 + i * 0.6, ry + 1.05 - (i % 2 ? 0 : 0.05), -9.0));
    g.add(at(box(0.03, 0.06, 0.04, '#c99a6b'), -3.0 + i * 0.6, ry + 1.25, -9.0));
  }
  // Sultan's toy car and ball, left on the roof (an easter egg)
  const car = new THREE.Group();
  car.add(at(rbox(0.36, 0.12, 0.2, '#e5484d', 0.04), 0, 0.1, 0));
  car.add(at(rbox(0.18, 0.1, 0.17, '#e5484d', 0.04), -0.03, 0.2, 0));
  car.add(at(box(0.12, 0.06, 0.172, '#bfe3ee'), -0.03, 0.2, 0));
  for (const [wx, wz] of [[0.12, 0.1], [-0.12, 0.1], [0.12, -0.1], [-0.12, -0.1]]) car.add(at(cyl(0.05, 0.05, 0.04, '#3b2b3f', 10), wx, 0.05, wz, P / 2, 0, 0));
  car.position.set(4.9, ry, -7.75);
  car.rotation.y = 0.6;
  g.add(car);
  const ball = sph(0.13, '#ffd166', 12, 8);
  g.add(at(ball, 5.6, ry + 0.13, -7.9));
  g.add(at(tor(0.13, 0.015, '#3f7bf0', 4, 16), 5.6, ry + 0.13, -7.9, 0.4, 0, 0));
  // A couple of plastic chairs where Odeh drinks his tea at sunset
  for (const [cx2, cz2, cr] of [[2.6, -8.3, 0.3], [3.4, -8.5, -0.4]]) {
    const ch = new THREE.Group();
    ch.add(at(rbox(0.42, 0.06, 0.4, '#ffffff', 0.03), 0, 0.42, 0));
    ch.add(at(rbox(0.42, 0.42, 0.06, '#ffffff', 0.03), 0, 0.66, -0.2));
    for (const [lx, lz] of [[0.18, 0.17], [-0.18, 0.17], [0.18, -0.17], [-0.18, -0.17]]) ch.add(at(box(0.04, 0.42, 0.04, '#f0f0f0'), lx, 0.21, lz));
    ch.position.set(cx2, ry, cz2);
    ch.rotation.y = cr;
    g.add(ch);
  }

  colliders.push({ type: 'box', x: cx, z: cz, hw: w / 2, hd: d / 2 });
  return out;
}
