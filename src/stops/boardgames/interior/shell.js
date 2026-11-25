import { THREE, COL, mat, umat, mesh, canvasTexture, roundRect, heartPath, drawPips, uvScale, bakeOne, fitText } from '../kit.js';
import { X0, X1, ZB, ZF, H, CW, SX, CUT_DOOR, LIB_DOOR, COSY_DOOR, SIDE_DOOR, LOW, PART, ROOMS } from './layout.js';

// The Dice House's walls and floors: a dollhouse with no front wall. Two cutaway walls (with doorways) close
// the library and the cosy corner; they sink while the player is behind them.

const P = Math.PI;

function suit(c, kind, x, y, s) {
  c.beginPath();
  if (kind === 0) heartPath(c, x, y - s / 2, s);
  else if (kind === 1) {
    c.moveTo(x, y - s / 2);
    c.lineTo(x + s * 0.38, y);
    c.lineTo(x, y + s / 2);
    c.lineTo(x - s * 0.38, y);
    c.closePath();
  } else if (kind === 2) {
    for (const [dx, dy] of [[0, -0.22], [-0.22, 0.08], [0.22, 0.08]]) {
      c.moveTo(x + dx * s + s * 0.2, y + dy * s);
      c.arc(x + dx * s, y + dy * s, s * 0.2, 0, P * 2);
    }
    c.rect(x - s * 0.05, y, s * 0.1, s * 0.45);
  } else {
    c.moveTo(x, y - s / 2);
    c.bezierCurveTo(x + s * 0.55, y - s * 0.05, x + s * 0.35, y + s * 0.4, x, y + s * 0.15);
    c.bezierCurveTo(x - s * 0.35, y + s * 0.4, x - s * 0.55, y - s * 0.05, x, y - s / 2);
    c.rect(x - s * 0.05, y + s * 0.1, s * 0.1, s * 0.35);
  }
  c.fill();
}

// Wallpaper: a motif above, a painted wainscot below, one tile 1 m wide and the wall's height tall.
export function wallpaper(base, dot, band, motif) {
  const t = canvasTexture(128, 420, (c, w, h) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    c.fillStyle = dot;
    for (let j = 0; j < 9; j++) for (let i = 0; i < 2; i++) {
      const x = (i + 0.5 + (j % 2) * 0.5) * 64;
      const y = j * 33 + 18;
      if (motif === 'dice') {
        c.save();
        c.translate(x % w, y);
        c.rotate(((i + j) % 3) * 0.3 - 0.3);
        roundRect(c, -9, -9, 18, 18, 4);
        c.fill();
        drawPips(c, 0, 0, 18, ((i * 3 + j) % 6) + 1, base);
        c.fillStyle = dot;
        c.restore();
      } else if (motif === 'hearts') {
        heartPath(c, x % w, y - 7, 14);
        c.fill();
      } else if (motif === 'suits') suit(c, (i + j * 2) % 4, x % w, y, 15);
      else if (motif === 'stars') {
        c.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * P * 2 - P / 2;
          const r = k % 2 ? 3.2 : 8;
          c.lineTo((x % w) + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        c.fill();
      } else if (motif === 'stripes') {
        if (j === 0) for (let k = 0; k < 4; k++) c.fillRect(k * 32 + 10, 0, 10, h);
      }
    }
    const wy = h * 0.7;
    c.fillStyle = band;
    c.fillRect(0, wy, w, h - wy);
    c.fillStyle = 'rgba(0,0,0,0.07)';
    for (let x = 0; x < w; x += 32) c.fillRect(x, wy, 3, h - wy);
    c.fillStyle = '#ffffff';
    c.fillRect(0, wy - 6, w, 8);
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

export function floorTex(kind) {
  const t = canvasTexture(256, 256, (c, w, h) => {
    if (kind === 'check') {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        c.fillStyle = (i + j) % 2 ? '#c9b4f5' : '#fff6ea';
        c.fillRect((i * w) / 4, (j * h) / 4, w / 4, h / 4);
      }
    } else if (kind === 'wood' || kind === 'dark' || kind === 'light') {
      const [a, b] = kind === 'dark' ? ['#b98457', '#ad794d'] : kind === 'light' ? ['#f0d4ab', '#e8c79a'] : ['#e2b98b', '#d8ad7e'];
      for (let i = 0; i < 8; i++) {
        c.fillStyle = i % 2 ? a : b;
        c.fillRect(0, (i * h) / 8, w, h / 8);
        c.fillStyle = 'rgba(120,70,40,0.22)';
        c.fillRect(0, (i * h) / 8, w, 2);
        c.fillRect((i * 97) % w, (i * h) / 8, 3, h / 8);
      }
    } else if (kind === 'tiles') {
      c.fillStyle = '#e9e0f6';
      c.fillRect(0, 0, w, h);
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        c.fillStyle = (i + j) % 2 ? '#fff8ee' : '#f3ecff';
        roundRect(c, i * 64 + 3, j * 64 + 3, 58, 58, 6);
        c.fill();
      }
      c.fillStyle = '#ffd166';
      for (let j = 0; j <= 4; j++) for (let i = 0; i <= 4; i++) {
        c.beginPath();
        c.moveTo(i * 64, j * 64 - 8);
        c.lineTo(i * 64 + 8, j * 64);
        c.lineTo(i * 64, j * 64 + 8);
        c.lineTo(i * 64 - 8, j * 64);
        c.fill();
      }
    } else {
      // Card room carpet: teal with little suits
      c.fillStyle = '#4fb8a2';
      c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,0.22)';
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) suit(c, (i + j) % 4, (i + 0.5 + (j % 2) * 0.5) * 64 % w, (j + 0.5) * 64, 20);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function buildShell(R) {
  const { K, add, col } = R;
  const { box, rbox, cyl, sph, at } = K;
  const texMat = (map, o = {}) => umat('#ffffff', { rough: 0.85, ...o, map });

  // Base under the dollhouse
  add(at(box(X1 - X0 + 0.6, 0.4, ZF - ZB + 0.5, COL.grape), 0, -0.21, (ZF + ZB) / 2 + 0.05));
  add(at(box(X1 - X0 + 0.64, 0.1, 0.06, COL.gold), 0, -0.14, ZF + 0.31));

  // Floors
  const floors = { lib: ['dark', 1.6], bar: ['tiles', 1.4], cosy: ['light', 1.8], tables: ['check', 1.6], hall: ['wood', 1.8], cards: ['carpet', 1.6] };
  for (const [id, r] of Object.entries(ROOMS)) {
    const [kind, tile] = floors[id];
    const fg = new THREE.PlaneGeometry(r.x1 - r.x0, r.z1 - r.z0);
    uvScale(fg, (r.x1 - r.x0) / tile, (r.z1 - r.z0) / tile);
    add(at(mesh(fg, texMat(floorTex(kind), { rough: kind === 'tiles' ? 0.6 : 0.85 }), { cast: false }), (r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2)).rotation.x = -P / 2;
  }
  // A round welcome rug at the entrance
  const rug = R.atlas.wrap(new THREE.CircleGeometry(2.0, 44), 360, 360, (c, w, h) => {
    c.fillStyle = '#c7a6ff';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 10;
    c.beginPath();
    c.arc(w / 2, h / 2, w / 2 - 22, 0, P * 2);
    c.stroke();
    c.setLineDash([10, 12]);
    c.lineWidth = 4;
    c.strokeStyle = '#ffd166';
    c.beginPath();
    c.arc(w / 2, h / 2, w / 2 - 40, 0, P * 2);
    c.stroke();
    c.setLineDash([]);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#ffffff';
    fitText(c, 'Welcome to', w / 2, h * 0.3, w * 0.5, 34, 700);
    c.fillStyle = COL.plum;
    fitText(c, 'The Dice House', w / 2, h * 0.7, w * 0.62, 40, 700);
    for (const [x, n, r] of [[w / 2 - 34, 3, -0.3], [w / 2 + 34, 5, 0.25]]) {
      c.save();
      c.translate(x, h / 2);
      c.rotate(r);
      c.fillStyle = '#ffffff';
      roundRect(c, -24, -24, 48, 48, 10);
      c.fill();
      drawPips(c, 0, 0, 48, n, COL.plum);
      c.restore();
    }
  });
  add(at(rug, 0, 0.006, 4.6)).rotation.x = -P / 2;

  // Back walls, one wallpaper per room
  const papers = {
    lib: wallpaper('#e4f2ea', '#cbe6d8', '#8fc7b0', 'stars'),
    bar: wallpaper('#efe6ff', '#ddd0fb', '#a98bf0', 'dice'),
    cosy: wallpaper('#ffe9ef', '#ffd2de', '#f2a5b8', 'hearts'),
  };
  for (const id of ['lib', 'bar', 'cosy']) {
    const r = ROOMS[id];
    const wg = new THREE.BoxGeometry(r.x1 - r.x0, H, 0.2);
    uvScale(wg, r.x1 - r.x0, 1);
    add(at(mesh(wg, texMat(papers[id], { rough: 0.9 })), (r.x0 + r.x1) / 2, H / 2, ZB - 0.1));
    add(at(box(r.x1 - r.x0, 0.14, 0.05, '#ffffff'), (r.x0 + r.x1) / 2, 0.07, ZB + 0.025));
    add(at(box(r.x1 - r.x0, 0.1, 0.08, '#ffffff'), (r.x0 + r.x1) / 2, H - 0.05, ZB + 0.04));
  }
  col({ type: 'box', x: 0, z: ZB - 0.1, hw: (X1 - X0) / 2 + 0.2, hd: 0.12 });

  // Side walls: full height at the back, low in front
  const side = mat('#f3ecff', { rough: 0.9 });
  for (const s of [-1, 1]) {
    const x = s * (X1 + 0.1);
    add(at(box(0.2, H, CW - ZB, side), x, H / 2, (ZB + CW) / 2));
    add(at(box(0.2, LOW, ZF - CW, side), x, LOW / 2, (CW + ZF) / 2));
    add(at(box(0.26, 0.08, ZF - CW, '#ffffff'), x, LOW + 0.02, (CW + ZF) / 2));
    col({ type: 'box', x, z: (ZB + ZF) / 2, hw: 0.12, hd: (ZF - ZB) / 2 + 0.2 });
  }

  // Walls between the counter and the back rooms, with a doorway each
  const [d0, d1] = SIDE_DOOR;
  const divMat = mat('#fbf5ff', { rough: 0.9 });
  for (const s of [-1, 1]) {
    const x = s * SX;
    add(at(box(0.18, H, d0 - ZB, divMat), x, H / 2, (ZB + d0) / 2));
    add(at(box(0.18, H, CW - d1, divMat), x, H / 2, (d1 + CW) / 2));
    add(at(box(0.18, H - 2.2, d1 - d0, divMat), x, 2.2 + (H - 2.2) / 2, (d0 + d1) / 2));
    add(at(box(0.24, 0.1, d1 - d0 + 0.2, COL.gold), x, 2.2, (d0 + d1) / 2));
    for (const z of [d0, d1]) add(at(box(0.24, 2.2, 0.08, COL.gold), x, 1.1, z));
    col({ type: 'box', x, z: (ZB + d0) / 2, hw: 0.11, hd: (d0 - ZB) / 2 });
    col({ type: 'box', x, z: (d1 + CW) / 2, hw: 0.11, hd: (CW - d1) / 2 });
  }

  // The cutaway walls
  const fronts = {
    lib: wallpaper('#fff4e3', '#ffe2b8', '#f6b97a', 'stars'),
    cosy: wallpaper('#e3f6f0', '#c6ebe0', '#7fcbb6', 'suits'),
  };
  R.cutWalls = {
    lib: cutWall(R, X0, -SX, LIB_DOOR, texMat(fronts.lib, { rough: 0.9 })),
    cosy: cutWall(R, SX, X1, COSY_DOOR, texMat(fronts.cosy, { rough: 0.9 })),
  };

  // Low partitions between the front rooms, with plants along the top
  for (const s of [-1, 1]) {
    const x = s * SX;
    const [z0, z1] = PART;
    add(at(rbox(0.2, LOW, z1 - z0, divMat, 0.04), x, LOW / 2, (z0 + z1) / 2));
    add(at(box(0.28, 0.08, z1 - z0, COL.gold), x, LOW + 0.03, (z0 + z1) / 2));
    for (let z = z0 + 0.45; z < z1 - 0.3; z += 0.85) {
      add(at(cyl(0.11, 0.09, 0.18, COL.white, 10), x, LOW + 0.16, z));
      add(at(sph(0.15, z % 2 > 1 ? COL.leaf : COL.leafDark, undefined, 10), x, LOW + 0.33, z));
    }
    col({ type: 'box', x, z: (z0 + z1) / 2, hw: 0.12, hd: (z1 - z0) / 2 });
  }

  // Front lip so nobody walks off the dollhouse
  add(at(rbox(X1 - X0, 0.12, 0.16, COL.plum, 0.04), 0, 0.06, ZF - 0.05));
  col({ type: 'box', x: 0, z: ZF + 0.08, hw: (X1 - X0) / 2, hd: 0.14 });

  // Wall lamps either side of the cosy corner's window
  const bulb = umat('#fff3c8', { emissive: '#ffd27a', ei: 0.9, rough: 0.4 });
  for (const x of [6.85, 10.75]) {
    add(at(box(0.12, 0.2, 0.05, COL.gold), x, 2.3, ZB + 0.03));
    add(at(mesh(K.geo('sconce', () => new THREE.CylinderGeometry(0.1, 0.16, 0.2, 14, 1, true)), mat(COL.pink, { side: THREE.DoubleSide })), x, 2.42, ZB + 0.16));
    add(at(mesh(K.geo('sbulb', () => new THREE.SphereGeometry(0.06, 10, 8)), bulb, { cast: false }), x, 2.38, ZB + 0.16));
  }
}

// A cutaway wall from x0 to x1 at z = CW with a doorway at doorX. Its own group (origin on the floor, so
// scaling y sinks it); decorations hung on its front face go in R.cutFace[key].
function cutWall(R, x0, x1, doorX, wallMat) {
  const { K } = R;
  const { box, at } = K;
  const cx = (x0 + x1) / 2;
  const L = x1 - x0;
  const grp = new THREE.Group();
  grp.position.set(cx, 0, CW);
  const dx = doorX - cx;
  const a0 = -L / 2;
  const a1 = dx - CUT_DOOR / 2;
  const b0 = dx + CUT_DOOR / 2;
  const b1 = L / 2;
  const seg = (u0, u1, y0, y1) => {
    const g = new THREE.BoxGeometry(u1 - u0, y1 - y0, 0.2);
    uvScale(g, u1 - u0, (y1 - y0) / H);
    const m = mesh(g, wallMat);
    m.position.set((u0 + u1) / 2, (y0 + y1) / 2, 0);
    // The texture's v runs bottom to top over the whole wall height
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, y0 / H + uv.getY(i));
    grp.add(m);
  };
  seg(a0, a1, 0, H);
  seg(b0, b1, 0, H);
  seg(a1, b0, 2.2, H);
  grp.add(at(box(L, 0.1, 0.08, '#ffffff'), 0, H - 0.05, 0.12));
  grp.add(at(box(L, 0.12, 0.05, '#ffffff'), 0, 0.06, 0.12));
  // Door frame
  for (const u of [a1, b0]) grp.add(at(box(0.1, 2.25, 0.26, COL.gold), u, 1.12, 0));
  grp.add(at(box(CUT_DOOR + 0.2, 0.12, 0.26, COL.gold), dx, 2.22, 0));
  R.add(grp);
  R.col({ type: 'box', x: cx + (a0 + a1) / 2, z: CW, hw: (a1 - a0) / 2, hd: 0.12 });
  R.col({ type: 'box', x: cx + (b0 + b1) / 2, z: CW, hw: (b1 - b0) / 2, hd: 0.12 });
  R.cutaway.push({ object: grp, x: cx, z: CW, hw: L / 2, low: 0.14 });
  return { group: grp, cx, L, dx, add: (...o) => (grp.add(...o), o[0]) };
}

export function bakeCutWalls(R) {
  for (const w of Object.values(R.cutWalls)) bakeOne(w.group);
}
