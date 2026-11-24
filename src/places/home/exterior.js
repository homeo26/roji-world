import { THREE, mat, umat, mesh, canvasTexture, mergeGeometries, box, rbox, cyl, sph, tor, at, rot, uvScale, pattern, texMat, panel, labelTex, glowTex, sprite, heartGeo, bake, colorBake } from './kit.js';
import { rng } from '../../util.js';

// Roji and Homama's cottage: two storeys with a cross gable, a porch with a pink door,
// window boxes, climbing roses, a picket fence with a rose-covered gate sign, a bench, a mailbox
// and flowers everywhere. Local frame: footprint 16 x 10, front +Z, the door at (0, 0.2).

const CREAM = '#fff2e1';
const PEACH = '#ffdccf';
const WHITE = '#fffaf4';
const WOOD = '#c98f5f';
const TEAL = '#63c7ba';
const PINK = '#ff9eb5';
const LEAF = '#5aa84f';
const LEAF2 = '#76c25c';
const SOIL = '#8a5a3c';

const HX = 4.6; // half width of the house
const ZF = 0.2; // front wall
const ZB = -4.6; // back wall
const ZC = (ZF + ZB) / 2;
const EAVE = 4.6;
const RIDGE = 6.4;

// ------------------------------------------------------------------ textures
const shingleTex = () =>
  pattern(128, 128, '#f08a5d', (ctx, w, h) => {
    const rows = 4;
    const cols = 4;
    for (let j = 0; j < rows; j++) {
      for (let i = -1; i <= cols; i++) {
        const cx = (i + (j % 2) * 0.5 + 0.5) * (w / cols);
        const cy = (j + 1) * (h / rows);
        ctx.fillStyle = (i + j) % 3 === 0 ? '#f6a07a' : (i + j) % 3 === 1 ? '#f39468' : '#ec8257';
        ctx.beginPath();
        ctx.moveTo(cx - w / cols / 2, cy - h / rows);
        ctx.lineTo(cx - w / cols / 2, cy - 8);
        ctx.quadraticCurveTo(cx - w / cols / 2, cy, cx, cy);
        ctx.quadraticCurveTo(cx + w / cols / 2, cy, cx + w / cols / 2, cy - 8);
        ctx.lineTo(cx + w / cols / 2, cy - h / rows);
        ctx.fill();
        ctx.strokeStyle = '#d06c45';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  });
const brickTex = () =>
  pattern(128, 128, '#f5dcc8', (ctx, w, h) => {
    for (let j = 0; j < 6; j++) {
      for (let i = -1; i < 3; i++) {
        ctx.fillStyle = (i + j) % 2 ? '#d9785c' : '#cf6e55';
        ctx.fillRect(i * 64 + (j % 2) * 32 + 3, j * (h / 6) + 3, 58, h / 6 - 6);
      }
    }
  });
const boardTex = (base, line) =>
  pattern(64, 64, base, (ctx, w, h) => {
    ctx.fillStyle = line;
    for (let j = 1; j <= 4; j++) ctx.fillRect(0, (j * h) / 4 - 3, w, 3);
  });
const plankTex = () =>
  pattern(128, 128, '#d6a473', (ctx, w, h) => {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#cf9b69' : '#dcab7c';
      ctx.fillRect(0, (i * h) / 6, w, h / 6 - 3);
      ctx.fillStyle = 'rgba(120,70,40,0.25)';
      ctx.fillRect((i * 53) % w, (i * h) / 6, 3, h / 6);
    }
  });

// Warm window with curtains (and Mishmish watching from one of them)
function windowTex(withCat) {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#fff3cf');
    g.addColorStop(1, '#ffd58e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(56, 0);
    ctx.lineTo(16, 80);
    ctx.lineTo(0, 80);
    ctx.fill();
    for (const s of [0, 1]) {
      ctx.fillStyle = '#ff9eb5';
      ctx.beginPath();
      const x0 = s ? w : 0;
      const dir = s ? -1 : 1;
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0 + dir * 40, 0);
      ctx.quadraticCurveTo(x0 + dir * 22, 50, x0 + dir * 12, 70);
      ctx.quadraticCurveTo(x0 + dir * 26, 100, x0 + dir * 30, h);
      ctx.lineTo(x0, h);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x0 + dir * 14, 70, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (withCat) {
      ctx.fillStyle = '#f29b45';
      ctx.beginPath();
      ctx.ellipse(70, 104, 18, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(70, 82, 13, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(59, 76);
      ctx.lineTo(61, 62);
      ctx.lineTo(68, 72);
      ctx.moveTo(81, 76);
      ctx.lineTo(79, 62);
      ctx.lineTo(72, 72);
      ctx.fill();
      ctx.fillStyle = '#2a1a16';
      ctx.fillRect(64, 80, 3, 5);
      ctx.fillRect(74, 80, 3, 5);
    } else {
      ctx.fillStyle = '#d9734e';
      ctx.fillRect(56, 104, 18, 16);
      ctx.fillStyle = '#5aa84f';
      for (const [dx, dy] of [[-8, -6], [8, -6], [0, -12]]) {
        ctx.beginPath();
        ctx.ellipse(65 + dx, 102 + dy, 7, 10, dx * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#c98f5f';
    ctx.fillRect(0, h - 8, w, 8);
  });
}

// ------------------------------------------------------------------ flowers (instanced)
// Every bloom in the garden goes into a few InstancedMeshes, recoloured per instance.
export function makeGarden() {
  const list = [];
  const leaves = [];
  const api = {
    flower(x, y, z, kind, color, h = 0.28) {
      list.push({ x, y, z, kind, color, h });
    },
    leaf(x, y, z, s = 1, ry = 0, rx = 0) {
      leaves.push({ x, y, z, s, ry, rx });
    },
    // Scatter flowers over a rectangle at height y
    bed(x0, x1, z0, z1, y, n, seed, kinds = ['tulip', 'daisy', 'pom', 'rose'], colors = ['#ff8fb1', '#ffffff', '#ffd75e', '#c7a6ff', '#ff6b6b', '#ffb36b', '#7fb0ff', '#ff5d8f']) {
      const r = rng(seed);
      for (let i = 0; i < n; i++) {
        const fx = x0 + r() * (x1 - x0);
        const fz = z0 + r() * (z1 - z0);
        api.flower(fx, y, fz, kinds[Math.floor(r() * kinds.length)], colors[Math.floor(r() * colors.length)], 0.2 + r() * 0.2);
        if (i % 2 === 0) api.leaf(fx + (r() - 0.5) * 0.1, y + 0.05, fz + (r() - 0.5) * 0.1, 0.8 + r() * 0.5, r() * 6, 0.4);
      }
    },
    build() {
      const out = [];
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      const v = new THREE.Vector3();
      const s = new THREE.Vector3();
      const c = new THREE.Color();
      const r = rng(7);
      const make = (geo, material, items, fn) => {
        if (!items.length) return;
        const im = new THREE.InstancedMesh(geo, material, items.length);
        im.castShadow = true;
        im.receiveShadow = true;
        items.forEach((it, i) => {
          fn(it, i);
          im.setMatrixAt(i, m4);
          if (it.color) im.setColorAt(i, c.set(it.color));
        });
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        out.push(im);
      };
      const white = mat('#ffffff', { rough: 0.6 });
      // Stems
      make(new THREE.CylinderGeometry(0.012, 0.014, 1, 5).translate(0, 0.5, 0), mat('#4f9a45', { rough: 0.8 }), list, (f) => {
        e.set((r() - 0.5) * 0.25, 0, (r() - 0.5) * 0.25);
        m4.compose(v.set(f.x, f.y, f.z), q.setFromEuler(e), s.set(1, f.h, 1));
        f.top = new THREE.Vector3(0, f.h, 0).applyQuaternion(q).add(v);
      });
      const kinds = {
        tulip: new THREE.LatheGeometry([[0.0, 0], [0.04, 0.005], [0.06, 0.04], [0.058, 0.08], [0.045, 0.1]].map(([a, b]) => new THREE.Vector2(a, b)), 7),
        daisy: (() => {
          const ps = [];
          for (let k = 0; k < 6; k++) {
            const p = new THREE.SphereGeometry(0.035, 6, 4);
            p.scale(1, 0.25, 0.55);
            p.translate(0.045, 0, 0);
            p.rotateY((k / 6) * Math.PI * 2);
            ps.push(p);
          }
          return mergeGeometries(ps.map((g) => g.toNonIndexed()));
        })(),
        pom: new THREE.IcosahedronGeometry(0.06, 1),
        rose: new THREE.DodecahedronGeometry(0.055, 0),
      };
      for (const [kind, geo] of Object.entries(kinds)) {
        const items = list.filter((f) => f.kind === kind);
        make(geo, white, items, (f) => {
          e.set(kind === 'daisy' ? -0.3 + r() * 0.2 : 0, r() * 6, 0);
          m4.compose(f.top, q.setFromEuler(e), s.setScalar(0.85 + r() * 0.4));
        });
      }
      const daisies = list.filter((f) => f.kind === 'daisy').map((f) => ({ ...f, color: '#ffc93c' }));
      make(new THREE.SphereGeometry(0.025, 6, 5), white, daisies, (f) => {
        m4.compose(v.copy(f.top).setY(f.top.y + 0.008), q.identity(), s.set(1, 0.6, 1));
      });
      make(new THREE.SphereGeometry(0.06, 6, 4).scale(1, 0.3, 2.1), mat(LEAF2, { rough: 0.8 }), leaves, (l) => {
        e.set(l.rx, l.ry, 0);
        m4.compose(v.set(l.x, l.y, l.z), q.setFromEuler(e), s.setScalar(l.s));
      });
      return out;
    },
  };
  return api;
}

// ------------------------------------------------------------------ the place
export function buildExterior(ctx) {
  const { api } = ctx;
  const g = new THREE.Group();
  const dynamic = [];
  const colliders = [];
  const add = (...o) => (g.add(...o), o[0]);
  const garden = makeGarden();
  const r = rng(11);

  const cream = mat(CREAM, { rough: 0.85 });
  const white = mat(WHITE, { rough: 0.7 });
  const wood = mat(WOOD, { rough: 0.8 });
  const shingles = texMat(shingleTex(), { rough: 0.8 });
  const peachBoards = texMat(boardTex(PEACH, '#f2c1b2'), { rough: 0.85 });
  const glassA = umat('#ffffff', { rough: 0.25, map: windowTex(false), emissive: '#ffcf7a', ei: 0.35 });
  const glassB = umat('#ffffff', { rough: 0.25, map: windowTex(true), emissive: '#ffcf7a', ei: 0.35 });
  glassA.emissiveMap = glassA.map;
  glassB.emissiveMap = glassB.map;

  // ---------------------------------------------------------------- house body
  add(at(rbox(HX * 2 + 0.25, 0.4, ZF - ZB + 0.25, '#d8c2a2', 0.05), 0, 0.2, ZC));
  add(at(box(HX * 2, 2.62, ZF - ZB, cream), 0, 1.31, ZC));
  const upper = new THREE.BoxGeometry(HX * 2, EAVE - 2.7, ZF - ZB);
  uvScale(upper, HX * 2, EAVE - 2.7);
  add(at(mesh(upper, peachBoards), 0, (2.7 + EAVE) / 2, ZC));
  add(at(box(HX * 2 + 0.16, 0.16, ZF - ZB + 0.16, white), 0, 2.66, ZC));
  add(at(box(HX * 2 + 0.12, 0.12, ZF - ZB + 0.12, white), 0, EAVE - 0.02, ZC));
  for (const s of [-1, 1]) {
    // Corner boards
    add(at(box(0.16, EAVE - 0.3, 0.16, white), s * (HX + 0.01), 0.3 + (EAVE - 0.3) / 2, ZF + 0.01));
  }
  // Gable ends
  const gable = new THREE.Shape();
  gable.moveTo(ZB, EAVE);
  gable.lineTo(ZF, EAVE);
  gable.lineTo(ZC, RIDGE);
  gable.closePath();
  for (const s of [-1, 1]) {
    const geo = new THREE.ExtrudeGeometry(gable, { depth: 0.2, bevelEnabled: false });
    geo.rotateY(-Math.PI / 2);
    const m = mesh(geo, peachBoards);
    m.position.x = s < 0 ? -HX + 0.2 : HX;
    add(m);
  }

  // Roof: two shingled slabs, a ridge cap and a cross gable over the door
  const slope = Math.atan((RIDGE - EAVE) / (ZF - ZC));
  const run = ZF - ZC + 0.45;
  const slabLen = run / Math.cos(slope);
  for (const s of [1, -1]) {
    const geo = new THREE.BoxGeometry(HX * 2 + 0.7, 0.2, slabLen);
    uvScale(geo, HX * 2 + 0.7, slabLen);
    const m = mesh(geo, shingles);
    const zc = ZC + (s * run) / 2;
    const yc = RIDGE - (run / 2) * Math.tan(slope);
    m.position.set(0, yc + 0.1 * Math.cos(slope), zc + s * 0.1 * Math.sin(slope));
    m.rotation.x = s * slope;
    add(m);
    // Fascia board under the eave edge
    const fz = ZC + s * run;
    add(at(box(HX * 2 + 0.75, 0.16, 0.08, white), 0, RIDGE - run * Math.tan(slope) + 0.02, fz));
  }
  add(rot(at(cyl(0.17, 0.17, HX * 2 + 0.8, '#d9734a', 12, { rough: 0.7 }), 0, RIDGE + 0.15, ZC), 0, 0, Math.PI / 2));
  // Cross gable
  const CGW = 1.45;
  const CGTOP = 6.15;
  const cg = new THREE.Shape();
  cg.moveTo(-CGW, EAVE - 0.3);
  cg.lineTo(CGW, EAVE - 0.3);
  cg.lineTo(CGW, EAVE);
  cg.lineTo(0, CGTOP);
  cg.lineTo(-CGW, EAVE);
  cg.closePath();
  const cgGeo = new THREE.ExtrudeGeometry(cg, { depth: 2.3, bevelEnabled: false });
  cgGeo.translate(0, 0, ZF - 2.3 + 0.05);
  add(mesh(cgGeo, peachBoards));
  const beta = Math.atan((CGTOP - EAVE) / CGW);
  const crun = CGW + 0.28;
  const clen = crun / Math.cos(beta);
  for (const s of [1, -1]) {
    const geo = new THREE.BoxGeometry(clen, 0.18, 2.55);
    uvScale(geo, clen, 2.55);
    // rows of shingles run across the slope: swap the uv axes
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i));
    const m = mesh(geo, shingles);
    m.position.set(s * (crun / 2) + s * 0.09 * Math.sin(beta), CGTOP - (crun / 2) * Math.tan(beta) + 0.09 * Math.cos(beta), ZF - 0.85);
    m.rotation.z = -s * beta;
    add(m);
    add(rot(at(box(clen + 0.05, 0.14, 0.08, white), (s * crun) / 2, CGTOP - (crun / 2) * Math.tan(beta) - 0.02, ZF + 0.43), 0, 0, -s * beta));
  }
  add(rot(at(cyl(0.13, 0.13, 2.6, '#d9734a', 10, { rough: 0.7 }), 0, CGTOP + 0.12, ZF - 0.85), Math.PI / 2, 0, 0));
  // Round attic window with a heart
  add(at(tor(0.36, 0.06, white, undefined, Math.PI * 2, 8, 28), 0, 5.15, ZF + 0.1));
  const roundGlass = mesh(new THREE.CircleGeometry(0.34, 28), glassA);
  add(at(roundGlass, 0, 5.15, ZF + 0.08));
  add(at(mesh(heartGeo(0.34, 0.04), mat('#ef5b6f', { rough: 0.5 })), 0, 5.12, ZF + 0.12));

  // Chimney with smoke
  const chim = new THREE.BoxGeometry(0.8, 2.6, 0.8);
  uvScale(chim, 0.8, 2.6);
  add(at(mesh(chim, texMat(brickTex(), { rough: 0.9 })), 2.9, 6.25, -3.2));
  add(at(box(0.98, 0.16, 0.98, '#b7614a'), 2.9, 7.6, -3.2));
  const smoke = [];
  for (let i = 0; i < 4; i++) {
    const s = sprite(glowTex(), { scale: 0.5 });
    add(s);
    dynamic.push(s);
    smoke.push(s);
  }

  // ---------------------------------------------------------------- windows
  const windowAt = (x, y, w, h, glass, shutter, boxFlowers = true) => {
    add(at(rbox(w + 0.2, h + 0.2, 0.1, white, 0.04), x, y, ZF + 0.04));
    add(at(mesh(new THREE.PlaneGeometry(w, h), glass, { cast: false }), x, y, ZF + 0.1));
    add(at(box(0.05, h, 0.04, white), x, y, ZF + 0.12));
    add(at(box(w, 0.05, 0.04, white), x, y + h * 0.1, ZF + 0.12));
    add(at(box(w + 0.36, 0.07, 0.2, white), x, y - h / 2 - 0.1, ZF + 0.1));
    if (shutter) {
      const sw = w * 0.28;
      for (const s of [-1, 1]) {
        const sh = add(at(rbox(sw, h + 0.12, 0.06, shutter, 0.03), x + s * (w / 2 + 0.1 + sw / 2), y, ZF + 0.05));
        for (let k = -2; k <= 2; k++) add(at(box(sw * 0.8, 0.025, 0.02, '#ffffff', { rough: 0.6 }), sh.position.x, y + k * (h * 0.17), ZF + 0.09));
        add(at(mesh(heartGeo(0.1, 0.02), mat('#ffffff', { rough: 0.6 })), sh.position.x, y + h * 0.42, ZF + 0.09));
      }
    }
    if (boxFlowers) {
      const by = y - h / 2 - 0.27;
      add(at(rbox(w + 0.3, 0.26, 0.3, wood, 0.04), x, by, ZF + 0.18));
      add(at(box(w + 0.2, 0.04, 0.22, SOIL), x, by + 0.12, ZF + 0.18));
      const n = Math.round(w * 6);
      for (let i = 0; i < n; i++) {
        const fx = x - w / 2 + 0.05 + ((i + 0.5) / n) * (w - 0.1);
        garden.flower(fx, by + 0.12, ZF + 0.14 + (i % 2) * 0.08, ['pom', 'tulip', 'daisy', 'rose'][i % 4], [PINK, '#ffffff', '#ffd75e', '#ff6b6b', '#c7a6ff'][(i * 3) % 5], 0.12 + (i % 3) * 0.04);
        garden.leaf(fx, by + 0.15, ZF + 0.3, 0.9, i, 1.1);
      }
    }
  };
  windowAt(-3.0, 1.55, 1.3, 1.15, glassA, TEAL);
  windowAt(3.0, 1.55, 1.3, 1.15, glassB, TEAL);
  windowAt(-3.0, 3.6, 1.05, 0.9, glassA, PINK);
  windowAt(3.0, 3.6, 1.05, 0.9, glassA, PINK);
  windowAt(0, 3.85, 0.8, 0.7, glassA, null, false);
  // Side windows
  for (const s of [-1, 1]) {
    add(at(rbox(0.1, 1.1, 1.2, white, 0.04), s * (HX + 0.03), 3.6, ZC));
    add(rot(at(mesh(new THREE.PlaneGeometry(1.0, 0.9), glassA, { cast: false }), s * (HX + 0.09), 3.6, ZC), 0, s * Math.PI / 2, 0));
    add(at(rbox(0.1, 1.2, 1.3, white, 0.04), s * (HX + 0.03), 1.55, ZC - 0.6));
    add(rot(at(mesh(new THREE.PlaneGeometry(1.1, 1.0), glassA, { cast: false }), s * (HX + 0.09), 1.55, ZC - 0.6), 0, s * Math.PI / 2, 0));
  }

  // ---------------------------------------------------------------- door and porch
  const arch = (w, h, r) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(w / 2, h - r);
    s.absarc(0, h - r, r, 0, Math.PI, false);
    s.lineTo(-w / 2, 0);
    return s;
  };
  const frameGeo = new THREE.ExtrudeGeometry(arch(1.66, 2.5, 0.83), { depth: 0.08, bevelEnabled: false });
  add(at(mesh(frameGeo, white), 0, 0.3, ZF - 0.02));
  const doorGeo = new THREE.ExtrudeGeometry(arch(1.4, 2.2, 0.7), { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
  const doorMat = mat('#ef6f86', { rough: 0.6 });
  add(at(mesh(doorGeo, doorMat), 0, 0.3, ZF + 0.04));
  for (const s of [-1, 1]) add(at(rbox(0.44, 0.8, 0.04, '#e45d77', 0.03), s * 0.29, 0.95, ZF + 0.15));
  add(at(mesh(heartGeo(0.42, 0.04), glassA), 0, 2.0, ZF + 0.15));
  add(at(sph(0.055, '#f4c24f', { metal: 0.6, rough: 0.3 }), 0.52, 1.3, ZF + 0.18));
  // Flower wreath around the heart window
  const wreath = add(at(tor(0.34, 0.06, LEAF, undefined, Math.PI * 2, 6, 22), 0, 1.98, ZF + 0.16));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    garden.flower(Math.cos(a) * 0.34, wreath.position.y + Math.sin(a) * 0.34 - 0.03, ZF + 0.2, i % 2 ? 'rose' : 'pom', i % 3 ? PINK : '#ffffff', 0.01);
  }
  // Porch lanterns: gold brackets with warm glowing glass
  const brass = mat('#f4c24f', { metal: 0.5, rough: 0.35 });
  for (const s of [-1, 1]) {
    const x = s * 1.08;
    add(at(box(0.05, 0.05, 0.2, brass), x, 2.12, ZF + 0.1));
    add(at(rbox(0.18, 0.24, 0.18, mat('#fff1c9', { emissive: '#ffc977', ei: 1.2 }), 0.04), x, 1.98, ZF + 0.22));
    add(rot(at(cyl(0.0, 0.14, 0.1, brass, 4), x, 2.15, ZF + 0.22), 0, Math.PI / 4, 0));
    add(at(cyl(0.1, 0.1, 0.03, brass, 4), x, 1.85, ZF + 0.22)).rotation.y = Math.PI / 4;
  }
  // Deck and step
  const deck = new THREE.BoxGeometry(3.8, 0.3, 1.5);
  uvScale(deck, 3.8, 1.5);
  const planks = texMat(plankTex(), { rough: 0.85 });
  add(at(mesh(deck, planks), 0, 0.15, ZF + 0.75));
  const step = new THREE.BoxGeometry(2.2, 0.15, 0.45);
  uvScale(step, 2.2, 0.45);
  add(at(mesh(step, planks), 0, 0.075, ZF + 1.72));
  // Welcome mat
  const welcome = labelTex(['Welcome'], { w: 256, h: 128, bg: '#e9a86a', border: '#c67a3e', color: '#6b3d1f', radius: 18 });
  add(rot(at(mesh(new THREE.PlaneGeometry(0.95, 0.5), texMat(welcome), { cast: false }), 0, 0.305, ZF + 0.45), -Math.PI / 2, 0, 0));
  // Posts, railings and the little porch roof
  for (const s of [-1, 1]) {
    add(at(cyl(0.075, 0.085, 2.7, white, 10), s * 1.72, 1.65, ZF + 1.38));
    add(at(box(0.07, 0.07, 1.3, white), s * 1.85, 0.85, ZF + 0.7));
    add(at(box(0.07, 0.05, 1.3, white), s * 1.85, 0.4, ZF + 0.7));
    for (let k = 0; k < 4; k++) add(at(box(0.04, 0.5, 0.04, white), s * 1.85, 0.6, ZF + 0.2 + k * 0.33));
    // Roses climbing the posts
    for (let k = 0; k < 9; k++) {
      const a = k * 1.7;
      const y = 0.45 + k * 0.27;
      garden.flower(s * 1.72 + Math.cos(a) * 0.1, y - 0.01, ZF + 1.38 + Math.sin(a) * 0.1, 'rose', k % 3 ? '#ff5d8f' : '#ffffff', 0.01);
      garden.leaf(s * 1.72 + Math.cos(a + 0.8) * 0.1, y + 0.08, ZF + 1.38 + Math.sin(a + 0.8) * 0.1, 0.9, a, 1);
    }
  }
  // Pergola over the porch, so the door stays in view, with roses along the front beam
  add(at(box(3.75, 0.12, 0.12, white), 0, 2.98, ZF + 1.38));
  for (const s of [-1, 1]) add(at(box(0.1, 0.12, 1.3, white), s * 1.72, 2.98, ZF + 0.72));
  for (let k = 0; k < 7; k++) add(at(rbox(0.07, 0.08, 1.6, white, 0.02), -1.5 + k * 0.5, 3.08, ZF + 0.8));
  for (let k = 0; k < 18; k++) {
    const x = -1.7 + (k / 17) * 3.4;
    garden.flower(x, 3.02 + Math.sin(k * 2.1) * 0.03, ZF + 1.46, 'rose', ['#ff5d8f', '#ffffff', '#ff8fb1'][k % 3], 0.01);
    garden.leaf(x + 0.08, 3.06, ZF + 1.44, 1.1, k, 0.5);
    if (k % 3 === 0) garden.leaf(x, 2.88, ZF + 1.46, 0.9, k, 1.4);
  }

  // Climbing roses on trellises at the front corners
  for (const s of [-1, 1]) {
    const x = s * 4.38;
    for (let k = 0; k < 3; k++) add(at(box(0.03, 3.4, 0.03, white), x - 0.13 + k * 0.13, 2.1, ZF + 0.05));
    for (let k = 0; k < 9; k++) add(at(box(0.36, 0.03, 0.03, white), x, 0.55 + k * 0.4, ZF + 0.06));
    for (let k = 0; k < 30; k++) {
      const y = 0.45 + r() * 3.4;
      const fx = x + (r() - 0.5) * 0.36 + Math.sin(y * 3) * 0.06;
      if (k % 3) garden.flower(fx, y, ZF + 0.12, 'rose', ['#ff5d8f', '#ff8fb1', '#ef3b5d', '#ffffff'][k % 4], 0.01);
      garden.leaf(fx + 0.05, y + 0.06, ZF + 0.12, 1, r() * 6, 1.3);
      garden.leaf(fx - 0.06, y - 0.05, ZF + 0.12, 0.9, r() * 6, 1.3);
    }
  }

  // ---------------------------------------------------------------- beds along the house
  for (const s of [-1, 1]) {
    const cx = s * 3.3;
    add(at(rbox(2.5, 0.22, 0.85, '#c9b49a', 0.06), cx, 0.11, ZF + 0.52));
    add(at(box(2.36, 0.05, 0.72, SOIL), cx, 0.22, ZF + 0.52));
    garden.bed(cx - 1.12, cx + 1.12, ZF + 0.2, ZF + 0.85, 0.24, 26, 20 + s);
    for (let k = 0; k < 3; k++) add(at(sph(0.22 + (k % 2) * 0.05, k % 2 ? LEAF : LEAF2, { rough: 0.8 }), cx - 0.9 + k * 0.9, 0.4, ZF + 0.32));
  }

  // ---------------------------------------------------------------- front yard
  // Stepping stones on the path to the gate
  const stoneMat = mat('#e3d6c3', { rough: 0.9 });
  for (const [x, z, rr] of [[0.1, 2.65, 0.3], [-0.12, 3.3, 0.28], [0.08, 3.95, 0.3], [-0.05, 4.55, 0.26]]) add(at(cyl(rr, rr + 0.02, 0.05, stoneMat, 14), x, 0.025, z));
  // Pots by the step
  for (const s of [-1, 1]) {
    add(at(cyl(0.2, 0.15, 0.32, '#e07a55', 12), s * 1.4, 0.16, 2.05));
    add(at(cyl(0.21, 0.21, 0.05, '#c9653f', 12), s * 1.4, 0.33, 2.05));
    garden.bed(s * 1.4 - 0.12, s * 1.4 + 0.12, 1.93, 2.17, 0.32, 6, 40 + s, ['pom', 'tulip'], ['#ff8fb1', '#ffd75e', '#ffffff']);
  }

  // Picket fence: front (with a gap for the gate) and both sides
  const picket = mergeGeometries([new THREE.BoxGeometry(0.11, 0.68, 0.045).translate(0, 0.34, 0), new THREE.ConeGeometry(0.08, 0.13, 4).rotateY(Math.PI / 4).translate(0, 0.74, 0)].map((q) => q.toNonIndexed()));
  const pickets = [];
  for (const s of [-1, 1]) {
    for (let x = 1.12; x < 7.8; x += 0.27) pickets.push([s * x, 4.75, 0]);
    for (let z = 4.5; z > -4.7; z -= 0.27) pickets.push([s * 7.85, z, Math.PI / 2]);
    add(at(box(6.75, 0.07, 0.04, white), s * 4.47, 0.26, 4.72));
    add(at(box(6.75, 0.07, 0.04, white), s * 4.47, 0.56, 4.72));
    add(at(box(0.04, 0.07, 9.4, white), s * 7.82, 0.26, 0));
    add(at(box(0.04, 0.07, 9.4, white), s * 7.82, 0.56, 0));
    for (const [px, pz] of [[s * 1.05, 4.75], [s * 7.85, 4.75], [s * 7.85, -4.7], [s * 4.47, 4.75], [s * 7.85, 0]]) {
      add(at(box(0.15, 0.92, 0.15, white), px, 0.46, pz));
      add(at(sph(0.09, white, undefined, 10), px, 0.98, pz));
    }
  }
  const pim = new THREE.InstancedMesh(picket, white, pickets.length);
  pim.castShadow = pim.receiveShadow = true;
  const m4 = new THREE.Matrix4();
  pickets.forEach(([x, z, ry], i) => pim.setMatrixAt(i, m4.makeRotationY(ry).setPosition(x, 0, z)));
  add(pim);

  // Gate sign (the standard wooden sign doubles as the gate arch) with roses and two open gates
  const gateSign = ctx.sign(['Welcome to', "Roji's Home"], { width: 2.4, height: 0.9, accent: '#ef5b6f', postHeight: 1.55 });
  gateSign.position.set(0, 0, 4.8);
  add(gateSign);
  for (const s of [-1, 1]) {
    for (let k = 0; k < 10; k++) {
      const y = 0.25 + k * 0.24;
      garden.flower(s * 0.91 + Math.cos(k * 2) * 0.08, y, 4.8 + Math.sin(k * 2) * 0.08, 'rose', k % 3 ? '#ff5d8f' : '#ffffff', 0.01);
      garden.leaf(s * 0.91 + Math.cos(k * 2 + 1) * 0.08, y + 0.1, 4.8 + Math.sin(k * 2 + 1) * 0.08, 1, k, 1);
    }
  }
  for (let k = 0; k < 14; k++) {
    const x = -1.2 + (k / 13) * 2.4;
    garden.flower(x, 2.48 + Math.sin(k * 1.9) * 0.04, 4.86, 'rose', ['#ff5d8f', '#ffffff', '#ff8fb1'][k % 3], 0.01);
    garden.leaf(x + 0.08, 2.5, 4.82, 1.1, k, 0.4);
  }
  for (const s of [-1, 1]) {
    // A small gate leaf hinged on the sign post, swung open into the yard
    const gate = new THREE.Group();
    const d = -s;
    for (let k = 0; k < 3; k++) gate.add(at(mesh(picket, white), d * (0.13 + k * 0.25), 0, 0));
    gate.add(at(box(0.78, 0.06, 0.04, white), d * 0.39, 0.25, -0.03), at(box(0.78, 0.06, 0.04, white), d * 0.39, 0.55, -0.03));
    gate.position.set(s * 0.86, 0, 4.75);
    gate.rotation.y = -s * 1.35;
    add(gate);
    colliders.push({ type: 'box', x: s * 0.78, z: 4.37, hw: 0.09, hd: 0.4 });
  }

  // Flower beds along the inside of the fence
  for (const s of [-1, 1]) {
    const x0 = s > 0 ? 1.3 : -7.6;
    const x1 = s > 0 ? 7.6 : -1.3;
    add(at(rbox(6.4, 0.18, 0.7, '#c9b49a', 0.05), (x0 + x1) / 2, 0.09, 4.3));
    add(at(box(6.25, 0.05, 0.58, SOIL), (x0 + x1) / 2, 0.18, 4.3));
    garden.bed(x0 + 0.1, x1 - 0.1, 4.05, 4.55, 0.2, 54, 50 + s);
  }

  // Bench on the left lawn
  const bench = new THREE.Group();
  bench.add(at(rbox(1.7, 0.08, 0.52, wood, 0.03), 0, 0.45, 0));
  bench.add(at(rbox(1.7, 0.08, 0.06, wood, 0.02), 0, 0.72, -0.25), at(rbox(1.7, 0.08, 0.06, wood, 0.02), 0, 0.88, -0.25));
  for (const s of [-1, 1]) {
    bench.add(at(box(0.07, 0.45, 0.45, '#8d5a3a'), s * 0.75, 0.22, 0));
    bench.add(at(box(0.07, 0.55, 0.06, '#8d5a3a'), s * 0.75, 0.7, -0.27));
    bench.add(at(rbox(0.1, 0.06, 0.5, wood, 0.02), s * 0.8, 0.66, 0));
  }
  bench.add(at(rbox(0.36, 0.14, 0.32, PINK, 0.06), -0.45, 0.55, 0));
  bench.position.set(-5.4, 0, 2.7);
  add(bench);
  colliders.push({ type: 'box', x: -5.4, z: 2.7, hw: 0.85, hd: 0.3, h: 0.47 });

  // Birdbath in a round flower bed on the right lawn
  add(at(cyl(0.95, 1.0, 0.16, '#c9b49a', 24), 5.4, 0.08, 2.6));
  add(at(cyl(0.88, 0.88, 0.04, SOIL, 24), 5.4, 0.17, 2.6));
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2;
    const rr = 0.32 + r() * 0.5;
    garden.flower(5.4 + Math.cos(a) * rr, 0.18, 2.6 + Math.sin(a) * rr, ['tulip', 'pom', 'daisy', 'rose'][i % 4], ['#ff8fb1', '#ffd75e', '#c7a6ff', '#ffffff', '#ff6b6b', '#7fb0ff'][i % 6], 0.18 + r() * 0.16);
  }
  add(at(cyl(0.08, 0.12, 0.7, '#e3d6c3', 10), 5.4, 0.5, 2.6));
  add(at(cyl(0.34, 0.16, 0.14, '#e3d6c3', 18), 5.4, 0.9, 2.6));
  add(at(cyl(0.3, 0.3, 0.02, mat('#8fdcef', { rough: 0.15 }), 18), 5.4, 0.96, 2.6));
  const bird = new THREE.Group();
  bird.add(at(sph(0.07, '#6fb8ff', undefined, 10), 0, 0.06, 0));
  bird.add(at(sph(0.05, '#6fb8ff', undefined, 10), 0, 0.13, 0.05));
  bird.add(rot(at(cyl(0, 0.018, 0.05, '#ffb347', 6), 0, 0.13, 0.11), Math.PI / 2, 0, 0));
  bird.add(rot(at(box(0.05, 0.015, 0.08, '#3f7bf0'), 0, 0.08, -0.08), 0.4, 0, 0));
  bird.add(at(sph(0.012, '#1d130f', undefined, 6), 0.03, 0.15, 0.09), at(sph(0.012, '#1d130f', undefined, 6), -0.03, 0.15, 0.09));
  bird.position.set(5.72, 0.97, 2.6);
  bird.rotation.y = -1.2;
  add(bake(bird));
  dynamic.push(bird);
  colliders.push({ type: 'circle', x: 5.4, z: 2.6, r: 0.98 });

  // Mailbox by the gate
  const mbx = new THREE.Group();
  mbx.add(at(box(0.1, 1.0, 0.1, '#8d5a3a'), 0, 0.5, 0));
  const mbBody = new THREE.Group();
  mbBody.add(at(box(0.36, 0.26, 0.5, '#6fb8ff'), 0, 0, 0));
  mbBody.add(rot(at(cyl(0.18, 0.18, 0.5, '#6fb8ff', 16), 0, 0.13, 0), Math.PI / 2, 0, 0));
  const mbLabel = labelTex(['Roji and Homama'], { w: 512, h: 128, bg: '#fff7ea', border: '#3f7bf0', color: '#2c3e66', radius: 40 });
  for (const s of [-1, 1]) mbBody.add(rot(at(panel(0.42, 0.11, mbLabel), s * 0.185, 0.03, 0), 0, s * Math.PI / 2, 0));
  mbBody.add(at(mesh(heartGeo(0.12, 0.02), mat('#ef5b6f')), 0, 0.12, 0.26));
  mbBody.position.set(0, 1.1, 0);
  mbx.add(mbBody);
  const flag = new THREE.Group();
  flag.add(at(box(0.03, 0.26, 0.03, '#e5484d'), 0, 0.13, 0), at(box(0.03, 0.1, 0.14, '#e5484d'), 0, 0.22, 0.06));
  flag.position.set(0.2, 1.1, -0.1);
  mbx.add(bake(flag));
  mbx.position.set(-1.6, 0, 5.0);
  add(mbx);
  dynamic.push(flag);
  colliders.push({ type: 'circle', x: -1.6, z: 5.0, r: 0.2 });

  // Side yards: an apple tree with a tire swing, a round tree, a wheelbarrow of flowers, bushes
  const tree = (x, z, s, apples) => {
    add(at(cyl(0.16 * s, 0.22 * s, 1.9 * s, '#9b6a43', 10), x, 0.95 * s, z));
    for (const [dx, dy, dz, rr] of [[0, 2.3, 0, 1.0], [0.6, 2.0, 0.2, 0.7], [-0.6, 2.05, -0.1, 0.72], [0.1, 2.85, -0.15, 0.7]]) {
      add(at(sph(rr * s, dx > 0 ? LEAF2 : LEAF, { rough: 0.85 }, 16), x + dx * s, dy * s, z + dz * s));
    }
    if (apples) for (let i = 0; i < 10; i++) {
      const a = r() * Math.PI * 2;
      add(at(sph(0.07, '#ef3b4d', { rough: 0.5 }, 8), x + Math.cos(a) * 0.85 * s, (2.0 + r() * 0.9) * s, z + Math.sin(a) * 0.85 * s));
    }
    colliders.push({ type: 'circle', x, z, r: 0.28 * s });
  };
  tree(-6.3, -2.6, 1, true);
  // A little plank swing on the apple tree
  add(at(box(1.3, 0.09, 0.09, '#9b6a43'), -5.7, 2.05, -2.6));
  for (const dz of [-0.22, 0.22]) add(at(cyl(0.012, 0.012, 1.5, '#d8c2a2', 5), -5.25, 1.3, -2.6 + dz));
  add(at(rbox(0.36, 0.05, 0.56, '#ff9eb5', 0.02), -5.25, 0.55, -2.6));
  tree(6.4, -3.0, 0.9, false);
  for (const [x, z, rr] of [[-7.3, 3.4, 0.45], [7.3, 3.4, 0.45], [-7.3, -0.6, 0.5], [7.3, 0.8, 0.5], [-5.2, -4.4, 0.4], [5.6, -4.4, 0.4], [7.2, -1.8, 0.4]]) {
    add(at(sph(rr, LEAF, { rough: 0.85 }, 14), x, rr * 0.75, z));
    add(at(sph(rr * 0.7, LEAF2, { rough: 0.85 }, 12), x + rr * 0.45, rr * 0.55, z + rr * 0.2));
    garden.bed(x - rr, x + rr, z - rr * 0.2, z + rr * 0.9, rr * 0.9, 5, Math.round(x * 10 + z), ['pom', 'rose'], ['#ffffff', '#ff8fb1', '#ffd75e']);
  }
  colliders.push({ type: 'circle', x: -7.3, z: 3.4, r: 0.45 }, { type: 'circle', x: 7.3, z: 3.4, r: 0.45 });
  // Wheelbarrow full of flowers
  const wb = new THREE.Group();
  wb.add(rot(at(cyl(0.45, 0.32, 0.36, '#ef5b6f', 14), 0, 0.5, 0), 0, 0, 0));
  wb.add(at(cyl(0.42, 0.42, 0.04, SOIL, 14), 0, 0.66, 0));
  wb.add(rot(at(tor(0.16, 0.05, '#3b3542', undefined, Math.PI * 2, 6, 14), 0, 0.2, 0.5), 0, Math.PI / 2, 0));
  for (const s of [-1, 1]) {
    wb.add(rot(at(box(0.05, 0.05, 0.9, '#8d5a3a'), s * 0.2, 0.45, -0.45), -0.25, 0, 0));
    wb.add(at(box(0.05, 0.32, 0.05, '#8d5a3a'), s * 0.2, 0.16, -0.25));
  }
  wb.position.set(6.2, 0, -0.4);
  wb.rotation.y = 0.5;
  add(wb);
  wb.updateMatrixWorld(true);
  for (let i = 0; i < 18; i++) {
    const a = r() * Math.PI * 2;
    const rr = r() * 0.34;
    const p = new THREE.Vector3(Math.cos(a) * rr, 0.68, Math.sin(a) * rr).applyMatrix4(wb.matrix);
    garden.flower(p.x, p.y, p.z, ['pom', 'tulip', 'daisy'][i % 3], ['#ff8fb1', '#ffd75e', '#ffffff', '#c7a6ff'][i % 4], 0.12 + r() * 0.12);
  }
  colliders.push({ type: 'circle', x: 6.2, z: -0.4, r: 0.5 });
  // Watering can
  const can = new THREE.Group();
  can.add(at(cyl(0.14, 0.15, 0.26, '#63c7ba', 14), 0, 0.13, 0));
  can.add(rot(at(cyl(0.02, 0.03, 0.36, '#63c7ba', 8), 0.2, 0.22, 0), 0, 0, -1.0));
  can.add(rot(at(tor(0.1, 0.02, '#63c7ba', undefined, Math.PI, 6, 10), 0, 0.28, 0), 0, Math.PI / 2, 0));
  can.position.set(-4.95, 0, -0.2);
  add(can);

  // Grass tufts
  const tuftGeo = mergeGeometries([0, 1, 2].map((k) => new THREE.ConeGeometry(0.035, 0.22, 4).translate(0, 0.11, 0).rotateZ((k - 1) * 0.35).translate((k - 1) * 0.04, 0, 0).toNonIndexed()));
  const tufts = [];
  for (let i = 0; i < 70; i++) {
    const x = (r() - 0.5) * 15.4;
    const z = -4.8 + r() * 9.4;
    if (Math.abs(x) < HX + 0.3 && z < 1.4) continue;
    if (Math.abs(x) < 1.2 && z > 1.4) continue;
    if (z > 3.85 && z < 4.9) continue;
    tufts.push([x, z, r() * 6, 0.7 + r() * 0.6]);
  }
  const tim = new THREE.InstancedMesh(tuftGeo, mat('#7cc25a', { rough: 0.9 }), tufts.length);
  tufts.forEach(([x, z, ry, s], i) => tim.setMatrixAt(i, m4.makeRotationY(ry).scale(new THREE.Vector3(s, s, s)).setPosition(x, 0, z)));
  tim.receiveShadow = true;
  add(tim);

  // Butterflies over the flower beds
  const butterflies = [];
  for (const [col, cx, cz] of [['#ff9eb5', -3.6, 3.0], ['#ffd166', 3.8, 3.2], ['#a98bff', -5.6, 1.4]]) {
    const b = new THREE.Group();
    const wm = umat(col, { rough: 0.6, side: THREE.DoubleSide });
    const wings = [];
    for (const s of [-1, 1]) {
      const wg = new THREE.Group();
      const w = mesh(new THREE.CircleGeometry(0.09, 10), wm, { cast: false });
      w.scale.set(1, 1.3, 1);
      w.position.x = s * 0.08;
      w.rotation.x = -Math.PI / 2;
      wg.add(w);
      b.add(wg);
      wings.push({ wg, s });
    }
    b.add(rot(at(cyl(0.012, 0.012, 0.14, '#3b2b3f', 5), 0, 0, 0), Math.PI / 2, 0, 0));
    add(b);
    dynamic.push(b);
    butterflies.push({ b, wings, cx, cz, ph: r() * 6 });
  }

  for (const f of garden.build()) add(f);
  dynamic.push(...colorBake(g, dynamic));

  // ---------------------------------------------------------------- colliders and hotspots
  colliders.push(
    { type: 'box', x: 0, z: ZC, hw: HX + 0.1, hd: (ZF - ZB) / 2 + 0.08 },
    { type: 'box', x: -3.3, z: ZF + 0.52, hw: 1.28, hd: 0.45 },
    { type: 'box', x: 3.3, z: ZF + 0.52, hw: 1.28, hd: 0.45 },
    { type: 'box', x: 0, z: ZF + 0.75, hw: 1.9, hd: 0.75, h: 0.3 },
    { type: 'box', x: 0, z: ZF + 1.72, hw: 1.1, hd: 0.23, h: 0.15 },
    { type: 'box', x: -1.85, z: ZF + 0.7, hw: 0.06, hd: 0.66 },
    { type: 'box', x: 1.85, z: ZF + 0.7, hw: 0.06, hd: 0.66 },
    { type: 'circle', x: -1.72, z: ZF + 1.38, r: 0.1 },
    { type: 'circle', x: 1.72, z: ZF + 1.38, r: 0.1 },
    { type: 'box', x: -4.45, z: 4.3, hw: 3.42, hd: 0.52 },
    { type: 'box', x: 4.45, z: 4.3, hw: 3.42, hd: 0.52 },
    { type: 'box', x: -7.85, z: 0, hw: 0.07, hd: 4.75 },
    { type: 'box', x: 7.85, z: 0, hw: 0.07, hd: 4.75 },
    { type: 'circle', x: -0.91, z: 4.8, r: 0.1 },
    { type: 'circle', x: 0.91, z: 4.8, r: 0.1 },
    { type: 'circle', x: -1.4, z: 2.05, r: 0.22 },
    { type: 'circle', x: 1.4, z: 2.05, r: 0.22 },
    { type: 'box', x: -5.75, z: -2.6, hw: 0.08, hd: 0.08 },
    { type: 'box', x: -5.25, z: -2.6, hw: 0.2, hd: 0.3, h: 0.58 },
  );

  const mailLines = [
    'A postcard from the zoo: <b>We miss you both!</b>',
    'A letter for Dr. Roji: <b>Thank you for making my tummy feel better.</b>',
    'A note from Homama: <b>See you at home tonight. I will make the cocoa.</b>',
    'A seed packet for the garden: <b>Sunflowers!</b>',
    'A drawing from a little patient: <b>a big pink heart for Dr. Roji.</b>',
    'A bill... just kidding. <b>It is a love letter from Homama.</b>',
  ];
  const state = { flag: 0, smell: 0 };
  const hotspots = [
    {
      x: -5.4,
      z: 3.35,
      r: 1.3,
      label: 'Sit on the bench',
      icon: 'smile',
      act: (a) =>
        a.activity({
          label: 'Get up',
          seats: [
            { who: 'roji', x: -5.82, z: 2.74, y: 0.16, yaw: 0, pose: 'sit' },
            { who: 'homama', x: -5.02, z: 2.74, y: 0.16, yaw: 0, pose: 'sit' },
          ],
          focus: { x: -5.4, z: 2.8, y: 0.9, zoom: 0.5 },
          exit: { x: -5.8, z: 3.5 },
          update: (dt, t) => {
            state.bench = (state.bench || 0) + dt;
            if (state.bench > 3.5) {
              state.bench = 0;
              a.fx.heartsAt(a.world(-5.4, 2.8, 1.6), 2);
            }
          },
          onEnd: (silent) => !silent && a.toast('What a lovely garden.', 2000),
        }),
    },
    {
      x: -3.4,
      z: 1.75,
      r: 1.1,
      label: 'Smell the roses',
      icon: 'heart',
      act: (a) => {
        a.emote('player', 'heart');
        a.fx.heartsAt(a.world(-3.6, 1.2, 1.2), 3);
        a.toast(['Mmm, they smell like summer.', 'Homama planted these for Roji.', 'The roses are blooming!'][Math.floor(Math.random() * 3)], 2200);
      },
    },
    {
      x: -1.6,
      z: 5.6,
      r: 1.0,
      label: 'Check the mail',
      icon: 'note',
      act: (a) => {
        state.flag = 1;
        a.sound.ui('pop');
        const i = a.load('mail', 0);
        a.save('mail', (i + 1) % mailLines.length);
        a.toast(mailLines[i % mailLines.length], 3200);
      },
    },
  ];

  return {
    group: g,
    dynamic,
    colliders,
    hotspots,
    ground: [
      { x: 0, z: 3.4, hw: 0.8, hd: 1.45, color: '#ead8b5', feather: 0.25 },
      { x: 0, z: 1.9, hw: 1.4, hd: 0.5, color: '#ead8b5', feather: 0.25 },
    ],
    update(dt, t) {
      smoke.forEach((s, i) => {
        const k = (t * 0.3 + i / smoke.length) % 1;
        s.position.set(2.9 + Math.sin(k * 4 + i) * 0.25, 7.8 + k * 1.8, -3.2 + k * 0.3);
        s.scale.setScalar(0.45 + k * 1.0);
        s.material.opacity = 0.75 * (1 - k);
      });
      for (const f of butterflies) {
        const a = t * 0.6 + f.ph;
        f.b.position.set(f.cx + Math.sin(a) * 1.4, 0.9 + Math.sin(a * 2.3) * 0.25, f.cz + Math.cos(a * 0.8) * 0.6);
        f.b.rotation.y = a + Math.PI / 2;
        for (const { wg, s } of f.wings) wg.rotation.z = s * (0.3 + Math.sin(t * 18 + f.ph) * 0.9);
      }
      bird.position.y = 0.97 + Math.max(0, Math.sin(t * 2.5)) * 0.05;
      bird.rotation.y = -1.2 + Math.sin(t * 0.7) * 0.5;
      state.flag = Math.max(0, state.flag - dt * 0.3);
      flag.rotation.x = -Math.min(1, state.flag * 3) * 1.4;
    },
  };
}

