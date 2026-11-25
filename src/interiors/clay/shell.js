import * as THREE from 'three';
import { uvScale, texMat } from '../../places/home/kit.js';
import { COL, box, rbox, cyl, sph, at, rot, mat, umat, mesh, canvasTexture, roundRect, FONT, makePlant } from './models.js';
import { X0, X1, ZB, ZF, H, CW, MID, STUDIO_DOOR, KILN_DOOR, DOOR_W, SIDE_DOOR } from './layout.js';

// The Clay Café's dollhouse shell: floors, the back and side walls with windows, the two cutaway walls
// between the front rooms and the back rooms (with doorways), the studio | kiln room wall, lamps,
// fairy lights and bunting. Everything is added through R (see src/interiors/clay.js).

const P = Math.PI;

export function wallpaper(base, dot, band, motif) {
  const t = canvasTexture(128, 420, (c, w, h) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    c.fillStyle = dot;
    if (motif === 'stripes') for (let i = 0; i < 4; i++) c.fillRect(i * 32 + 10, 0, 12, h);
    else if (motif === 'cups') {
      for (let j = 0; j < 9; j++) for (let i = 0; i < 2; i++) {
        const x = (i + 0.5 + (j % 2) * 0.5) * 64;
        const y = j * 33 + 16;
        roundRect(c, x - 8, y - 6, 16, 12, 4);
        c.fill();
        c.fillRect(x - 11, y + 6, 22, 3);
        c.beginPath();
        c.arc(x + 9, y - 1, 4, -P / 2, P / 2);
        c.lineWidth = 2.5;
        c.strokeStyle = dot;
        c.stroke();
      }
    } else if (motif === 'vases') {
      for (let j = 0; j < 8; j++) for (let i = 0; i < 2; i++) {
        const x = (i + 0.5 + (j % 2) * 0.5) * 64;
        const y = j * 38 + 20;
        c.beginPath();
        c.moveTo(x - 5, y - 10);
        c.lineTo(x + 5, y - 10);
        c.quadraticCurveTo(x + 3, y - 5, x + 9, y + 2);
        c.quadraticCurveTo(x + 10, y + 10, x + 5, y + 11);
        c.lineTo(x - 5, y + 11);
        c.quadraticCurveTo(x - 10, y + 10, x - 9, y + 2);
        c.quadraticCurveTo(x - 3, y - 5, x - 5, y - 10);
        c.fill();
      }
    } else {
      for (let j = 0; j < 11; j++) for (let i = 0; i < 2; i++) {
        c.beginPath();
        c.arc((i + 0.5 + (j % 2) * 0.5) * 64, j * 28 + 12, 4.5, 0, P * 2);
        c.fill();
      }
    }
    const wy = h * 0.74;
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

export function floorTex(kind) {
  const t = canvasTexture(256, 256, (c, w, h) => {
    if (kind === 'check') {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        c.fillStyle = (i + j) % 2 ? '#f7d9c4' : '#fff6ea';
        c.fillRect((i * w) / 4, (j * h) / 4, w / 4, h / 4);
      }
      c.fillStyle = 'rgba(217,115,78,0.5)';
      for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) if ((i + j) % 2 === 0) {
        c.beginPath();
        c.arc((i * w) / 4, (j * h) / 4, 7, 0, P * 2);
        c.fill();
      }
    } else if (kind === 'wood') {
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
        c.arc(x, y, r, 0, P * 2);
        c.fill();
      }
    } else if (kind === 'terra') {
      c.fillStyle = '#f1dcc4';
      c.fillRect(0, 0, w, h);
      const tones = ['#e8a985', '#e1a07c', '#ebb18f', '#de9874'];
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        c.fillStyle = tones[(i + j * 3) % 4];
        roundRect(c, i * 64 + 3, j * 64 + 3, 58, 58, 7);
        c.fill();
      }
    } else {
      c.fillStyle = '#f0c9ae';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#e3ab8a';
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        roundRect(c, i * 64 + 4, j * 64 + 4, 56, 56, 8);
        c.fill();
      }
      c.fillStyle = '#d9734e';
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if ((i + j) % 2 === 0) {
        c.beginPath();
        c.arc(i * 64 + 32, j * 64 + 32, 7, 0, P * 2);
        c.fill();
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// A wall with a doorway, as one extruded outline (uvs in metres so the wallpaper keeps its size).
function wallWithDoor(len, h, doorX, doorW, doorH) {
  const s = new THREE.Shape();
  s.moveTo(-len / 2, 0);
  if (doorX !== null) {
    s.lineTo(doorX - doorW / 2, 0);
    s.lineTo(doorX - doorW / 2, doorH);
    s.lineTo(doorX + doorW / 2, doorH);
    s.lineTo(doorX + doorW / 2, 0);
  }
  s.lineTo(len / 2, 0);
  s.lineTo(len / 2, h);
  s.lineTo(-len / 2, h);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false });
  geo.translate(0, 0, -0.1);
  const p = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) + len / 2, p.getY(i) / h);
  return geo;
}

export function buildShell(R) {
  const { add, col, atlas, sky } = R;
  const D = ZF - ZB;

  // ---------------------------------------------------------------- floors
  add(at(box(X1 - X0 + 0.6, 0.4, D + 0.5, '#d9b38c'), 0, -0.21, (ZF + ZB) / 2 + 0.05));
  add(at(box(X1 - X0 + 0.64, 0.12, 0.06, COL.terra), 0, -0.15, ZF + 0.31));
  const floor = (x0, x1, z0, z1, kind, tile) => {
    const fg = uvScale(new THREE.PlaneGeometry(x1 - x0, z1 - z0), (x1 - x0) / tile, (z1 - z0) / tile);
    const f = add(at(mesh(fg, texMat(floorTex(kind), { rough: 0.85 }), { cast: false }), (x0 + x1) / 2, 0, (z0 + z1) / 2));
    f.rotation.x = -P / 2;
  };
  floor(X0, MID, CW, ZF, 'check', 1.3);
  floor(MID, X1, CW, ZF, 'terra', 2.0);
  floor(X0, MID, ZB, CW, 'wood', 2.2);
  floor(MID, X1, ZB, CW, 'tile', 1.6);
  // Thresholds under the doorways
  for (const x of [STUDIO_DOOR, KILN_DOOR]) add(at(box(DOOR_W, 0.02, 0.3, '#c98f5f'), x, 0.01, CW));

  // ---------------------------------------------------------------- back wall with windows
  const papers = {
    studio: wallpaper('#e4f5ee', '#cdeadf', '#a9d8c6', 'stripes'),
    kiln: wallpaper('#fff1dc', '#ffe0b8', '#e9a27f', 'dots'),
    cafe: wallpaper('#ffe9dc', '#ffd2bd', '#f2b79c', 'cups'),
    shop: wallpaper('#fdf3e6', '#f7dcc4', '#e3b08e', 'vases'),
  };
  R.papers = papers;
  for (const [x0, x1, paper] of [[X0, MID, papers.studio], [MID, X1, papers.kiln]]) {
    const wg = uvScale(new THREE.BoxGeometry(x1 - x0, H, 0.2), x1 - x0, 1);
    add(at(mesh(wg, texMat(paper, { rough: 0.9 })), (x0 + x1) / 2, H / 2, ZB - 0.1));
    add(at(box(x1 - x0, 0.14, 0.05, '#ffffff'), (x0 + x1) / 2, 0.07, ZB + 0.025));
    add(at(box(x1 - x0, 0.1, 0.08, '#ffffff'), (x0 + x1) / 2, H - 0.05, ZB + 0.04));
  }
  col(0, ZB - 0.1, (X1 - X0) / 2 + 0.2, 0.12);
  // Side walls: full height from the back to z 6.4, then low to the front
  const FULL = ZF - 2.2;
  const sideMat = mat('#fbe7d3', { rough: 0.9 });
  for (const s of [-1, 1]) {
    const x = s * (X1 + 0.1);
    add(at(box(0.2, H, FULL - ZB, sideMat), x, H / 2, (ZB + FULL) / 2));
    add(at(box(0.2, 1.2, ZF - FULL, sideMat), x, 0.6, (FULL + ZF) / 2));
    add(at(box(0.24, 0.08, ZF - FULL, '#ffffff'), x, 1.22, (FULL + ZF) / 2));
    add(at(box(0.05, 0.14, FULL - ZB, '#ffffff'), x - s * 0.125, 0.07, (ZB + FULL) / 2));
    col(x, (ZB + ZF) / 2, 0.12, D / 2 + 0.2);
  }
  // Front lip so nobody walks off the dollhouse
  add(at(rbox(X1 - X0, 0.12, 0.16, '#e9c9a3', 0.04), 0, 0.06, ZF - 0.05));
  col(0, ZF + 0.08, (X1 - X0) / 2, 0.14);

  // Windows: on the back wall and the side walls, all showing one sky
  R.windowAt = (x, y, w, h, curtain, { z = ZB, side = 0 } = {}) => {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    if (side) grp.rotation.y = -side * P / 2;
    const off = 0.04;
    grp.add(at(rbox(w + 0.18, h + 0.18, 0.08, '#ffffff', 0.04), 0, 0, off));
    grp.add(at(mesh(new THREE.PlaneGeometry(w, h), sky.material, { cast: false }), 0, 0, off + 0.045));
    grp.add(at(box(0.05, h, 0.04, '#ffffff'), 0, 0, off + 0.06));
    grp.add(at(box(w, 0.05, 0.04, '#ffffff'), 0, 0, off + 0.06));
    grp.add(at(box(w + 0.3, 0.06, 0.18, '#ffffff'), 0, -h / 2 - 0.1, off + 0.07));
    if (curtain) {
      grp.add(at(rot(cyl(0.02, 0.02, w + 0.8, '#c9a27a', 6), 0, 0, P / 2), 0, h / 2 + 0.22, off + 0.14));
      for (const k of [-1, 1]) {
        grp.add(at(rbox(0.3, h + 0.45, 0.07, curtain, 0.035), k * (w / 2 + 0.17), -0.02, off + 0.16));
        grp.add(at(box(0.34, 0.05, 0.09, '#ffffff'), k * (w / 2 + 0.17), -h * 0.2, off + 0.18));
      }
    }
    add(grp);
    return grp;
  };

  // ---------------------------------------------------------------- the cutaway walls
  // Each is its own group (origin on the floor) so it can sink while the player is in the room behind it.
  const cutWall = (x0, x1, doorX, paper, label, accent) => {
    const L = x1 - x0;
    const cx = (x0 + x1) / 2;
    const grp = new THREE.Group();
    grp.position.set(cx, 0, CW);
    const dx = doorX - cx;
    const geo = wallWithDoor(L, H, dx, DOOR_W, 2.25);
    grp.add(mesh(geo, texMat(paper, { rough: 0.9 })));
    grp.add(at(box(L, 0.1, 0.24, '#ffffff'), 0, H - 0.05, 0));
    grp.add(at(box(L, 0.14, 0.05, '#ffffff'), 0, 0.07, 0.12));
    // Door trim and a painted sign over the doorway
    for (const k of [-1, 1]) grp.add(at(box(0.1, 2.3, 0.26, '#ffffff'), dx + k * (DOOR_W / 2 + 0.05), 1.15, 0));
    grp.add(at(box(DOOR_W + 0.3, 0.12, 0.26, '#ffffff'), dx, 2.31, 0));
    const signP = atlas.panel(1.5, 0.36, 384, 92, (c, w, h) => {
      c.fillStyle = '#fff7ea';
      roundRect(c, 3, 3, w - 6, h - 6, 30);
      c.fill();
      c.lineWidth = 6;
      c.strokeStyle = accent;
      c.stroke();
      c.fillStyle = '#8c3f22';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `700 ${h * 0.5}px ${FONT}`;
      c.fillText(label, w / 2, h * 0.55);
    });
    grp.add(at(signP, dx, 2.72, 0.125));
    // Colliders either side of the doorway
    const a0 = x0;
    const a1 = doorX - DOOR_W / 2;
    const b0 = doorX + DOOR_W / 2;
    const b1 = x1;
    col((a0 + a1) / 2, CW, (a1 - a0) / 2, 0.13);
    col((b0 + b1) / 2, CW, (b1 - b0) / 2, 0.13);
    R.g.add(grp);
    R.cutaway.push({ object: grp, x: cx, z: CW, hw: L / 2, low: 0.16 });
    // add(obj, x, y) puts something on the front face of this wall (world-local x)
    return { group: grp, add: (o) => (grp.add(o), o), x: (wx) => wx - cx, cx };
  };
  R.wallW = cutWall(X0, MID, STUDIO_DOOR, papers.cafe, 'Pottery studio', COL.terra);
  R.wallE = cutWall(MID, X1, KILN_DOOR, papers.shop, 'Kiln room', '#e07a3a');

  // ---------------------------------------------------------------- studio | kiln room wall
  const [s0, s1] = SIDE_DOOR;
  const divMat = mat('#f3e2cf', { rough: 0.9 });
  add(at(box(0.2, H, s0 - ZB, divMat), MID, H / 2, (ZB + s0) / 2));
  add(at(box(0.2, H, CW - s1, divMat), MID, H / 2, (s1 + CW) / 2));
  add(at(box(0.2, H - 2.25, s1 - s0, divMat), MID, 2.25 + (H - 2.25) / 2, (s0 + s1) / 2));
  add(at(box(0.26, 0.1, s1 - s0 + 0.2, '#ffffff'), MID, 2.27, (s0 + s1) / 2));
  add(at(box(0.24, 0.1, CW - ZB, '#ffffff'), MID, H - 0.05, (ZB + CW) / 2));
  col(MID, (ZB + s0) / 2, 0.12, (s0 - ZB) / 2);
  col(MID, (s1 + CW) / 2, 0.12, (CW - s1) / 2);
  // café | shop: a low planter wall with leafy pots, open at the front
  const PZ1 = 3.6;
  add(at(rbox(0.36, 0.9, PZ1 - CW, '#fff3e4', 0.04), MID, 0.45, (CW + PZ1) / 2));
  add(at(box(0.4, 0.06, PZ1 - CW + 0.04, COL.terra), MID, 0.92, (CW + PZ1) / 2));
  for (let i = 0; i < 4; i++) add(at(makePlant(0.62, i % 2 ? COL.terra : COL.cream2, i % 2 ? 'tall' : 'round'), MID, 0.95, CW + 0.45 + i * 0.75));
  col(MID, (CW + PZ1) / 2, 0.2, (PZ1 - CW) / 2, 0.95);

  // ---------------------------------------------------------------- lamps, fairy lights, bunting
  R.bulbMat = umat('#fff3c4', { emissive: '#ffd27a', ei: 1.2 });
  R.bulbPink = umat('#ffd6e2', { emissive: '#ff8fb1', ei: 1.0 });
  R.lamp = (parent, x, y, z, shade) => {
    parent.add(at(rbox(0.12, 0.2, 0.05, '#ffffff', 0.02), x, y - 0.05, z + 0.03));
    parent.add(rot(at(cyl(0.012, 0.012, 0.2, '#6b5a6e', 5), x, y, z + 0.12), P / 2, 0, 0));
    parent.add(at(mesh(new THREE.SphereGeometry(0.07, 10, 8), R.bulbMat, { cast: false }), x, y - 0.04, z + 0.22));
    const sh = at(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.17, 0.16, 16, 1, false), mat(shade, { rough: 0.6 })), x, y + 0.02, z + 0.22);
    sh.castShadow = false;
    parent.add(sh);
  };
  R.fairy = (parent, x0, x1, y, z) => {
    const n = Math.round((x1 - x0) / 0.26);
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      parent.add(at(mesh(new THREE.SphereGeometry(0.05, 8, 6), i % 2 ? R.bulbMat : R.bulbPink, { cast: false }), x0 + k * (x1 - x0), y - Math.sin(((k * 4) % 1) * P) * 0.18, z));
    }
  };
  const flagGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.12, 0, 0), new THREE.Vector3(0, -0.24, 0), new THREE.Vector3(0.12, 0, 0)]);
  flagGeo.computeVertexNormals();
  flagGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(6), 2));
  const flagMats = [COL.terra, COL.sun, COL.mint, COL.rose].map((c) => mat(c, { rough: 0.9 }));
  R.bunting = (parent, x0, x1, y, z) => {
    const n = Math.round((x1 - x0) / 0.36);
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const sag = Math.sin(((k * 3) % 1) * P) * 0.22;
      parent.add(at(mesh(flagGeo, flagMats[i % 4], { cast: false }), x0 + k * (x1 - x0), y - sag, z));
    }
  };
}
