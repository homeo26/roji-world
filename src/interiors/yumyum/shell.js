import * as K from './kit.js';
import * as T from './theme.js';
import * as D from './decor.js';
import { bakeZone } from './bake.js';
import { X0, X1, Z0, Z1, WALL_H, CW, CUT_H, KW, SX, DOOR, LOUNGE_DOOR, DESSERT_DOOR, ARCADE } from './layout.js';

// The big YumYum's shell: floors for each room, the back and side walls, the kitchen's side walls, the two
// cutaway walls (with arched doorways) between the front rooms and the back rooms, and the open arcades
// between the centre and the wings.

const { THREE, COL, box, rbox, cyl, at, mat, mesh } = K;

// Stretch a geometry's UVs so surfaces of any size can share one repeating material.
export const uvScale = (geo, su, sv = su) => {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geo;
};

export const diamond = (c, x, y, r) => {
  c.beginPath();
  c.moveTo(x, y - r);
  c.lineTo(x + r, y);
  c.lineTo(x, y + r);
  c.lineTo(x - r, y);
  c.closePath();
  c.fill();
};
export const star = (c, x, y, r) => {
  for (const a of [0, Math.PI / 4]) {
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.fillRect(-r, -r, 2 * r, 2 * r);
    c.restore();
  }
};

function materials() {
  const M = {};
  const tex = (w, base, draw) => K.pattern(w, w, base, draw, 1, 1);
  M.tiles = tex(128, '#fbf3e6', (c, w) => {
    c.fillStyle = '#efd8ce';
    for (let i = 0; i <= 2; i++) {
      c.fillRect((i * w) / 2 - 2, 0, 4, w);
      c.fillRect(0, (i * w) / 2 - 2, w, 4);
    }
    c.fillStyle = COL.band;
    for (const [x, y] of [[0, 0], [w, 0], [0, w], [w, w], [w / 2, w / 2], [w / 2, 0], [0, w / 2], [w, w / 2], [w / 2, w]]) diamond(c, x, y, 8);
  });
  M.stars = tex(256, '#fbefe2', (c, w) => {
    c.fillStyle = '#ebcfc5';
    c.fillRect(0, 0, w, 5);
    c.fillRect(0, 0, 5, w);
    c.fillStyle = '#f3d3cb';
    star(c, w / 2, w / 2, w * 0.24);
    c.fillStyle = '#fbefe2';
    star(c, w / 2, w / 2, w * 0.16);
    c.fillStyle = '#e8a4a6';
    star(c, w / 2, w / 2, w * 0.065);
    c.fillStyle = '#c9cfa9';
    for (const [x, y] of [[0, 0], [w, 0], [0, w], [w, w]]) diamond(c, x, y, w * 0.09);
  });
  M.planks = tex(256, '#eccb9f', (c, w, h) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? '#e3bb88' : '#eecfa3';
      c.fillRect(0, (i * h) / 8, w, h / 8 - 3);
      c.fillStyle = 'rgba(150,100,60,0.22)';
      c.fillRect((i * 97) % w, (i * h) / 8, 3, h / 8);
    }
  });
  M.pavers = tex(256, '#e8dcc6', (c, w) => {
    const r = K.rng(12);
    const cell = w / 4;
    for (let j = 0; j < 4; j++) {
      const off = j % 2 ? cell / 2 : 0;
      for (let i = -1; i < 4; i++) {
        c.fillStyle = ['#f3e7d3', '#efdcc4', '#f6ecdc', '#ecd6bf'][Math.floor(r() * 4)];
        K.roundRect(c, i * cell + off + 4, j * cell + 4, cell - 8, cell - 8, 10);
        c.fill();
      }
    }
    c.fillStyle = 'rgba(111,123,77,0.35)';
    for (let i = 0; i < 40; i++) c.fillRect(r() * w, r() * w, 3, 3);
  });
  M.checker = tex(128, '#fbf0e6', (c, w) => {
    c.fillStyle = '#f3cfcb';
    c.fillRect(0, 0, w / 2, w / 2);
    c.fillRect(w / 2, w / 2, w / 2, w / 2);
    c.fillStyle = '#fbf0e6';
    for (const [x, y] of [[w / 4, w / 4], [(3 * w) / 4, (3 * w) / 4]]) diamond(c, x, y, 7);
  });
  M.wallTiles = tex(128, '#fbf4e8', (c, w) => {
    c.fillStyle = '#eedcd2';
    for (let i = 0; i <= 4; i++) {
      c.fillRect((i * w) / 4 - 1.5, 0, 3, w);
      c.fillRect(0, (i * w) / 4 - 1.5, w, 3);
    }
  });
  M.plaster = tex(256, '#fbf0dc', (c, w) => {
    const pr = K.rng(3);
    for (let i = 0; i < 900; i++) {
      c.fillStyle = pr() < 0.5 ? 'rgba(214,160,150,0.09)' : 'rgba(255,255,255,0.35)';
      c.beginPath();
      c.arc(pr() * w, pr() * w, 1 + pr() * 2.5, 0, Math.PI * 2);
      c.fill();
    }
  });
  M.arcade = tex(256, '#f2d3cd', (c, w, h) => {
    const k = w / 0.9;
    const p = new Path2D();
    T.archPoints(0.56, 0.4, 0.26).forEach(([x, y], i) => (i ? p.lineTo(w / 2 + x * k, h - 0.12 * k - y * k) : p.moveTo(w / 2 + x * k, h - 0.12 * k - y * k)));
    p.closePath();
    c.fillStyle = '#f8e4de';
    c.fill(p);
    c.lineJoin = 'round';
    c.strokeStyle = COL.band;
    c.lineWidth = 7;
    c.stroke(p);
    c.fillStyle = COL.rasp;
    K.heartPath(c, w / 2, h - 0.5 * k, 26);
    c.fill();
  });
  const std = (map, rough = 0.85) => new THREE.MeshStandardMaterial({ map, roughness: rough });
  M.mTiles = std(M.tiles, 0.82);
  M.mStars = std(M.stars, 0.82);
  M.mPlanks = std(M.planks, 0.82);
  M.mPavers = std(M.pavers, 0.9);
  M.mChecker = std(M.checker, 0.6);
  M.mWallTiles = std(M.wallTiles, 0.5);
  M.mPlaster = std(M.plaster, 0.92);
  M.mArcade = std(M.arcade, 0.85);
  const fr = T.themedTexture(960, 96, (c, w, h) => T.drawFrieze(c, w, h, { tile: 120 }));
  fr.wrapS = THREE.RepeatWrapping;
  M.mFrieze = std(fr, 0.8);
  const sp = T.themedTexture(256, 256, (c, w) => T.drawTile(c, 0, 0, w, { ground: '#fbefe2' }));
  sp.wrapS = sp.wrapT = THREE.RepeatWrapping;
  M.mSplash = std(sp, 0.45);
  return M;
}

export function buildShell(S) {
  const M = (S.mats = materials());
  const Z = S.zones.shell;
  const add = (...o) => (Z.add(...o), o[0]);
  const { col } = S;

  // ---------------------------------------------------------------- floors
  add(at(box(X1 - X0 + 0.6, 0.6, Z1 - Z0 + 0.6, COL.frame), 0, -0.33, 0.1));
  const floor = (x0, x1, z0, z1, m, unit) => {
    const geo = uvScale(new THREE.BoxGeometry(x1 - x0, 0.1, z1 - z0), (x1 - x0) / unit, (z1 - z0) / unit);
    return add(at(mesh(geo, m, { cast: false }), (x0 + x1) / 2, -0.05, (z0 + z1) / 2));
  };
  floor(-SX, SX, Z0, KW, M.mTiles, 1.2);
  floor(-SX, SX, KW, Z1, M.mStars, 1.3);
  floor(X0, -SX, CW, Z1, M.mPavers, 2.2);
  floor(X0, -SX, Z0, CW, M.mPlanks, 2.4);
  floor(SX, X1, CW, Z1, M.mPlanks, 2.4);
  floor(SX, X1, Z0, CW, M.mChecker, 1.0);

  // ---------------------------------------------------------------- the back wall, side walls, kitchen side walls
  const wallX = (x0, x1, z, m, h = WALL_H, t = 0.2) => {
    const geo = uvScale(new THREE.BoxGeometry(x1 - x0, h, t), (x1 - x0) / 2.5, h / 2.5);
    return add(at(mesh(geo, m), (x0 + x1) / 2, h / 2, z));
  };
  const wallZ = (x, z0, z1, m, h = WALL_H, t = 0.2) => {
    const geo = uvScale(new THREE.BoxGeometry(t, h, z1 - z0), (z1 - z0) / 2.5, h / 2.5);
    return add(at(mesh(geo, m), x, h / 2, (z0 + z1) / 2));
  };
  wallX(X0, -SX, Z0, M.mPlaster);
  wallX(-SX, SX, Z0, M.mWallTiles);
  wallX(SX, X1, Z0, M.mPlaster);
  wallZ(X0, Z0, Z1, M.mPlaster);
  wallZ(X1, Z0, Z1, M.mPlaster);
  for (const s of [-1, 1]) wallZ(s * SX, Z0, KW, M.mPlaster, WALL_H, 0.22);
  col(0, Z0, 15.2, 0.2);
  for (const x of [X0, X1]) col(x, 0, 0.15, 10.2);
  for (const s of [-1, 1]) col(s * SX, (Z0 + KW) / 2, 0.13, (KW - Z0) / 2);
  // Kitchen side wall ends get a rounded cream post
  for (const s of [-1, 1]) {
    add(at(rbox(0.3, WALL_H, 0.3, COL.cream, 0.05), s * SX, WALL_H / 2, KW));
    add(at(box(0.32, 0.1, 0.32, COL.raspDeep), s * SX, 0.05, KW));
  }

  // A frieze of little arches along the top of every wall
  const frieze = (len, x, z, ry, y = WALL_H - 0.18) => {
    const geo = uvScale(new THREE.PlaneGeometry(len, 0.3), len / 3.0, 1);
    const p = mesh(geo, M.mFrieze, { cast: false });
    p.rotation.y = ry;
    return add(at(p, x, y, z));
  };
  frieze(X1 - X0, 0, Z0 + 0.105, 0);
  frieze(Z1 - Z0, X0 + 0.105, 0, Math.PI / 2);
  frieze(Z1 - Z0, X1 - 0.105, 0, -Math.PI / 2);
  for (const s of [-1, 1]) {
    frieze(KW - Z0, s * SX - 0.115, (Z0 + KW) / 2, -Math.PI / 2);
    frieze(KW - Z0, s * SX + 0.115, (Z0 + KW) / 2, Math.PI / 2);
  }

  // Wainscots: blush with a raspberry rail in the lounge and dessert bar, little pink arches in the dining room
  const wainX = (x0, x1, z, m = null, h = 1.0) => {
    if (m) add(at(mesh(uvScale(new THREE.BoxGeometry(x1 - x0, h * 0.9, 0.05), (x1 - x0) / 0.9, 1), m), (x0 + x1) / 2, h * 0.45, z));
    else add(at(box(x1 - x0, h, 0.05, COL.blush), (x0 + x1) / 2, h / 2, z));
    add(at(box(x1 - x0, 0.07, 0.09, COL.raspDeep), (x0 + x1) / 2, h * (m ? 0.92 : 1.0), z + 0.01));
  };
  const wainZ = (x, z0, z1, m = null, h = 1.0, s = 1) => {
    if (m) add(at(mesh(uvScale(new THREE.BoxGeometry(0.05, h * 0.9, z1 - z0), (z1 - z0) / 0.9, 1), m), x, h * 0.45, (z0 + z1) / 2));
    else add(at(box(0.05, h, z1 - z0, COL.blush), x, h / 2, (z0 + z1) / 2));
    add(at(box(0.09, 0.07, z1 - z0, COL.raspDeep), x + s * 0.01, h * (m ? 0.92 : 1.0), (z0 + z1) / 2));
  };
  wainX(X0 + 0.1, -SX - 0.11, Z0 + 0.125);
  wainZ(X0 + 0.125, Z0 + 0.1, CW - 0.1);
  wainZ(-SX - 0.135, Z0 + 0.1, KW, null, 1.0, -1);
  wainZ(SX + 0.135, Z0 + 0.1, KW);
  wainZ(X1 - 0.125, Z0 + 0.1, CW - 0.1, null, 1.0, -1);
  wainZ(X1 - 0.125, CW + 0.1, Z1, M.mArcade, 1.0, -1);

  // The open front: a cream lip with a raspberry line
  add(at(box(X1 - X0, 0.14, 0.12, COL.cream), 0, 0.07, Z1));
  add(at(box(X1 - X0, 0.03, 0.13, COL.raspDeep), 0, 0.15, Z1));
  col(0, Z1 + 0.12, 15.2, 0.15);

  // ---------------------------------------------------------------- the cutaway walls
  S.cutWalls = [buildCutWall(S, X0, -SX, LOUNGE_DOOR, 'Lounge', 'terrace'), buildCutWall(S, SX, X1, DESSERT_DOOR, 'Dessert bar', 'dining')];

  // ---------------------------------------------------------------- arcades between the centre and the wings
  const archGeo = (span) => T.shapeGeo(T.archRing(span, 2.15, 0.6, 0.12, { open: true }), 0.14);
  const lineGeo = (span) => T.shapeGeo(T.archRing(span - 0.2, 2.1, 0.52, 0.035, { open: true }), 0.16);
  for (const s of [-1, 1]) {
    const x = s * SX;
    for (let i = 1; i < ARCADE.length; i++) {
      const z = ARCADE[i];
      add(at(rbox(0.32, 3.05, 0.32, COL.cream, 0.06), x, 1.525, z));
      add(at(box(0.36, 0.14, 0.36, COL.raspDeep), x, 0.07, z));
      add(at(box(0.38, 0.1, 0.38, COL.brass, K.BRASS), x, 2.2, z));
      S.circ(x, z, 0.2);
    }
    // Header beam and pointed arches between the columns
    add(at(box(0.3, 0.26, ARCADE[3] - ARCADE[0] + 0.3, COL.cream), x, 3.15, (ARCADE[0] + ARCADE[3]) / 2));
    add(at(box(0.32, 0.05, ARCADE[3] - ARCADE[0] + 0.32, COL.raspDeep), x, 3.0, (ARCADE[0] + ARCADE[3]) / 2));
    for (let i = 0; i < ARCADE.length - 1; i++) {
      const z0 = ARCADE[i] + 0.16;
      const z1 = ARCADE[i + 1] - 0.16;
      const a = mesh(archGeo(z1 - z0), mat(COL.cream, { rough: 0.7 }));
      a.rotation.y = Math.PI / 2;
      add(at(a, x - 0.07, 0, (z0 + z1) / 2));
      const l = mesh(lineGeo(z1 - z0), mat(COL.rasp, { rough: 0.6 }));
      l.rotation.y = Math.PI / 2;
      add(at(l, x - 0.08, 0, (z0 + z1) / 2));
    }
    // Low planters in the first and last bays, open in the middle so the rooms connect
    for (const [z0, z1] of [[ARCADE[0] + 0.2, ARCADE[1] - 0.2], [ARCADE[2] + 0.2, ARCADE[3] - 0.2]]) {
      const len = z1 - z0;
      const zc = (z0 + z1) / 2;
      add(at(rbox(0.48, 0.62, len, COL.cream, 0.05), x, 0.31, zc));
      add(at(box(0.5, 0.05, len + 0.02, COL.raspDeep), x, 0.6, zc));
      add(at(box(0.38, 0.06, len - 0.1, '#7a5a3e'), x, 0.63, zc));
      for (const q of [-1, 1]) add(at(box(0.01, 0.22, len - 0.2, COL.band), x + q * 0.245, 0.32, zc));
      const n = Math.round(len / 0.42);
      for (let k = 0; k < n; k++) {
        const z = z0 + 0.2 + (k * (len - 0.4)) / Math.max(1, n - 1);
        add(at(D.bud(0.18, k % 2 ? COL.leaf : '#8b9466'), x + (k % 2 ? 0.05 : -0.05), 0.78, z));
        if (k % 2 === 0) add(at(D.bud(0.055, [COL.rasp, COL.pink, '#ffffff'][k % 3], 0.7), x + 0.1 * (k % 4 ? 1 : -1), 0.93, z + 0.08));
      }
      col(x, zc, 0.25, len / 2, 0.75);
    }
  }
}

// A cutaway wall from x0 to x1 at z = CW with an arched doorway at doorX. Built as its own group (origin on the
// floor) so the room behind shows when the player walks through. side: what the front faces ('terrace' or 'dining').
function buildCutWall(S, x0, x1, doorX, label, side) {
  const M = S.mats;
  const cx = (x0 + x1) / 2;
  const L = x1 - x0;
  const grp = new THREE.Group();
  grp.position.set(cx, 0, CW);
  const add = (...o) => (grp.add(...o), o[0]);
  const dx = doorX - cx;
  // The plaster wall: one extruded outline with the pointed doorway cut out of it
  const sh = new THREE.Shape();
  const arch = T.archPoints(DOOR.w, DOOR.spring, DOOR.rise);
  sh.moveTo(-L / 2, 0);
  sh.lineTo(dx - DOOR.w / 2, 0);
  for (let i = 1; i < arch.length - 1; i++) sh.lineTo(dx + arch[i][0], arch[i][1]);
  sh.lineTo(dx + DOOR.w / 2, 0);
  sh.lineTo(L / 2, 0);
  sh.lineTo(L / 2, CUT_H);
  sh.lineTo(-L / 2, CUT_H);
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false, curveSegments: 4 });
  geo.translate(0, 0, -0.1);
  const p = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + p.getZ(i)) / 2.5, p.getY(i) / 2.5);
  add(mesh(geo, M.mPlaster)).userData.wall = true;
  add(at(box(L, 0.12, 0.26, COL.cream), 0, CUT_H - 0.06, 0));
  add(at(box(L + 0.02, 0.04, 0.27, COL.raspDeep), 0, CUT_H - 0.14, 0));
  // Doorway trim: a pink band and a raspberry line along the arch, like the logo card
  add(at(mesh(T.shapeGeo(T.archRing(DOOR.w + 0.14, DOOR.spring, DOOR.rise + 0.09, 0.07, { open: true }), 0.04), mat(COL.band)), dx, 0, 0.1));
  add(at(mesh(T.shapeGeo(T.archRing(DOOR.w + 0.24, DOOR.spring, DOOR.rise + 0.16, 0.05, { open: true }), 0.04), mat(COL.raspDeep)), dx, 0, 0.1));
  // Frieze along the top of the front face
  const fr = mesh(uvScale(new THREE.PlaneGeometry(L, 0.3), L / 3.0, 1), M.mFrieze, { cast: false });
  add(at(fr, 0, CUT_H - 0.36, 0.105));
  // Wainscot on the front face either side of the doorway
  const segs = [[-L / 2, dx - DOOR.w / 2 - 0.13], [dx + DOOR.w / 2 + 0.13, L / 2]];
  for (const [a, b] of segs) {
    if (b - a < 0.1) continue;
    if (side === 'dining') add(at(mesh(uvScale(new THREE.BoxGeometry(b - a, 0.9, 0.05), (b - a) / 0.9, 1), M.mArcade), (a + b) / 2, 0.45, 0.125));
    else add(at(box(b - a, 0.9, 0.05, COL.blush), (a + b) / 2, 0.45, 0.125));
    add(at(box(b - a, 0.07, 0.09, COL.raspDeep), (a + b) / 2, 0.92, 0.135));
  }
  // A painted sign above the doorway
  add(at(D.paperSign(S.atlas, 1.3, 0.3, label, { size: 0.52 }), dx, DOOR.spring + DOOR.rise + 0.32, 0.13));
  for (const q of [-1, 1]) add(at(cyl(0.006, 0.006, 0.2, COL.brass, 4, K.BRASS), dx + q * 0.5, DOOR.spring + DOOR.rise + 0.55, 0.13));
  S.colBox(x0 + (dx - DOOR.w / 2 + L / 2) / 2, CW, (dx - DOOR.w / 2 + L / 2) / 2, 0.13);
  S.colBox(x1 - (L / 2 - dx - DOOR.w / 2) / 2, CW, (L / 2 - dx - DOOR.w / 2) / 2, 0.13);
  S.g.add(grp);
  S.cutaway.push({ object: grp, x: cx, z: CW, hw: L / 2, low: 0.16 });
  return { group: grp, add, cx, L, dx };
}

// Bake a cutaway wall once everything is on it: few draw calls, and it still sinks as one piece.
export function bakeCutWalls(S) {
  for (const w of S.cutWalls) {
    w.group.traverse((o) => o.isMesh && (o.castShadow = !!o.userData.wall));
    bakeZone(w.group);
    S.ctx.util.bakeStatic(w.group, [], K.mergeGeometries);
  }
}
