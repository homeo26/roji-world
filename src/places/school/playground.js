import { THREE, C, mat, roundRect, FONT, colorBake } from './kit.js';

// The playground beside the school: a slide with a little roof, a rainbow climbing frame,
// a see-saw, a sandpit with a sandcastle and hopscotch chalked on the ground.

export const SLIDE = { x: -9.0, top: 1.5, platZ: -0.85, chute0: -0.32, chute1: 2.45, run1: 3.0, runY: 0.33, ladderX: -10.05 };
export const SEESAW = { x: -6.3, z: 2.9, y: 0.48, half: 1.45 };
export const SAND = { x: -5.3, z: 5.7, hw: 1.25, hd: 1.05 };

export function buildPlayground(R) {
  const { k, add, dyn, col } = R;
  const { box, rbox, cyl, sph, cone, star, at, rot } = k;
  const P = Math.PI;

  // ---------------------------------------------------------------- slide
  const S = SLIDE;
  const POST = '#6fb8ff';
  const corners = [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]];
  for (const [dx, dz] of corners) {
    add(at(cyl(0.06, 0.06, 2.5, POST, 10), S.x + dx, 1.25, S.platZ + dz));
    add(at(sph(0.09, C.sun, undefined, 10), S.x + dx, 2.52, S.platZ + dz));
  }
  add(at(rbox(1.14, 0.12, 1.14, C.wood, 0.04), S.x, S.top - 0.06, S.platZ));
  // Railings on the back and the right
  add(at(rbox(1.0, 0.06, 0.06, POST, 0.02), S.x, S.top + 0.55, S.platZ - 0.5));
  add(at(rbox(0.06, 0.06, 1.0, POST, 0.02), S.x + 0.5, S.top + 0.55, S.platZ));
  for (const dz of [-0.25, 0, 0.25]) add(at(cyl(0.022, 0.022, 0.55, C.white, 6), S.x + 0.5, S.top + 0.27, S.platZ + dz));
  for (const dx of [-0.25, 0, 0.25]) add(at(cyl(0.022, 0.022, 0.55, C.white, 6), S.x + dx, S.top + 0.27, S.platZ - 0.5));
  // Striped pointy roof
  add(at(rot(cone(0.92, 0.75, C.rose, 4, { rough: 0.7 }), 0, P / 4, 0), S.x, 2.88, S.platZ));
  for (let i = 0; i < 4; i++) {
    const a = P / 4 + (i * P) / 2;
    add(at(sph(0.07, C.white, undefined, 8), S.x + Math.cos(a) * 0.9, 2.52, S.platZ + Math.sin(a) * 0.9));
  }
  add(at(sph(0.12, C.sun, undefined, 12), S.x, 3.3, S.platZ));
  add(at(rbox(1.3, 0.1, 1.3, C.white, 0.04), S.x, 2.5, S.platZ));
  // Ladder on the left
  const lx0 = S.ladderX;
  const lx1 = S.x - 0.55;
  const lean = Math.atan2(lx1 - lx0, S.top);
  const railLen = Math.hypot(lx1 - lx0, S.top) + 0.5;
  for (const s of [-1, 1]) add(at(rot(rbox(0.07, railLen, 0.07, POST, 0.03), 0, 0, -lean), (lx0 + lx1) / 2, railLen / 2 - 0.1, S.platZ + s * 0.3));
  for (let i = 1; i <= 5; i++) {
    const f = i / 6;
    add(at(rot(cyl(0.03, 0.03, 0.6, C.sun, 8), P / 2, 0, 0), lx0 + (lx1 - lx0) * f, S.top * f, S.platZ));
  }
  // The chute, its side rails, the run-out and legs
  const drop = S.top - S.runY;
  const run = S.chute1 - S.chute0;
  const ang = Math.atan2(drop, run);
  const L = Math.hypot(drop, run) + 0.06;
  const cz = (S.chute0 + S.chute1) / 2;
  const cy = (S.top + S.runY) / 2 - 0.02;
  add(at(rot(rbox(0.72, 0.06, L, C.sun, 0.03, { rough: 0.35 }), ang, 0, 0), S.x, cy, cz));
  for (const s of [-1, 1]) add(at(rot(rbox(0.07, 0.16, L, '#ffb347', 0.03, { rough: 0.4 }), ang, 0, 0), S.x + s * 0.36, cy + 0.06, cz));
  add(at(rbox(0.72, 0.06, S.run1 - S.chute1, C.sun, 0.03, { rough: 0.35 }), S.x, S.runY - 0.03, (S.chute1 + S.run1) / 2));
  for (const s of [-1, 1]) add(at(rbox(0.07, 0.16, S.run1 - S.chute1, '#ffb347', 0.03), S.x + s * 0.36, S.runY + 0.03, (S.chute1 + S.run1) / 2));
  for (const s of [-1, 1]) {
    add(at(cyl(0.04, 0.04, S.runY, POST, 8), S.x + s * 0.3, S.runY / 2, S.run1 - 0.15));
    add(at(cyl(0.04, 0.04, 0.9, POST, 8), S.x + s * 0.3, 0.45, 1.0));
  }
  col({ type: 'box', x: S.x, z: S.platZ, hw: 0.58, hd: 0.58, h: S.top });
  col({ type: 'box', x: (lx0 + lx1) / 2, z: S.platZ, hw: 0.28, hd: 0.36 });
  for (const [z0, z1, h] of [[S.chute0, 0.6, 1.15], [0.6, 1.5, 0.82], [1.5, S.chute1, 0.5], [S.chute1, S.run1, 0.33]]) {
    col({ type: 'box', x: S.x, z: (z0 + z1) / 2, hw: 0.4, hd: (z1 - z0) / 2, h });
  }

  // ---------------------------------------------------------------- rainbow climbing frame (three steps of bars)
  const tiers = [
    { x: -7.15, h: 0.55, c: C.rose },
    { x: -6.15, h: 1.05, c: '#ffb347' },
    { x: -5.15, h: 1.55, c: '#3fbf9f' },
  ];
  const FZ = -1.05;
  const HX = 0.46;
  const HZ = 0.55;
  for (const t of tiers) {
    for (const [dx, dz] of [[-HX, -HZ], [HX, -HZ], [-HX, HZ], [HX, HZ]]) {
      add(at(cyl(0.05, 0.05, t.h, t.c, 8), t.x + dx, t.h / 2, FZ + dz));
      add(at(sph(0.07, C.white, undefined, 8), t.x + dx, t.h, FZ + dz));
    }
    const levels = [];
    for (let y = 0.45; y < t.h - 0.1; y += 0.5) levels.push(y);
    levels.push(t.h);
    for (const y of levels) {
      const c = y === t.h ? t.c : C.white;
      for (const s of [-1, 1]) {
        add(at(rot(cyl(0.028, 0.028, HX * 2, c, 6), 0, 0, P / 2), t.x, y, FZ + s * HZ));
        add(at(rot(cyl(0.028, 0.028, HZ * 2, c, 6), P / 2, 0, 0), t.x + s * HX, y, FZ));
      }
    }
    // Top grid to stand on
    for (const dx of [-0.23, 0, 0.23]) add(at(rot(cyl(0.026, 0.026, HZ * 2, C.sun, 6), P / 2, 0, 0), t.x + dx, t.h, FZ));
    for (const dz of [-0.27, 0.27]) add(at(rot(cyl(0.026, 0.026, HX * 2, C.sun, 6), 0, 0, P / 2), t.x, t.h, FZ + dz));
    col({ type: 'box', x: t.x, z: FZ, hw: 0.5, hd: 0.6, h: t.h });
  }
  // A flag and a little star on the tallest step
  add(at(cyl(0.025, 0.025, 1.0, C.white, 6), -4.75, 2.05, FZ - 0.5));
  add(at(rot(cone(0.16, 0.36, C.rose, 3), 0, 0, -P / 2), -4.57, 2.42, FZ - 0.5));
  add(at(star(0.12, 0.055, 0.04, C.sun), -4.75, 2.62, FZ - 0.5));

  // ---------------------------------------------------------------- see-saw
  const SS = SEESAW;
  add(at(rot(cyl(0.22, 0.28, 0.12, C.woodDark, 3), P / 2, P / 2, 0), SS.x, 0.3, SS.z)).scale.set(1, 1, 1.6);
  for (const s of [-1, 1]) add(at(rbox(0.12, SS.y, 0.14, '#ff9eb5', 0.04), SS.x, SS.y / 2, SS.z + s * 0.2));
  add(at(rot(cyl(0.05, 0.05, 0.5, C.steel, 8), P / 2, 0, 0), SS.x, SS.y, SS.z));
  const plank = new THREE.Group();
  plank.position.set(SS.x, SS.y, SS.z);
  plank.add(at(rbox(3.1, 0.08, 0.36, '#ff9eb5', 0.03), 0, 0.06, 0));
  for (const s of [-1, 1]) {
    plank.add(at(rbox(0.42, 0.06, 0.4, C.sun, 0.03), s * 1.3, 0.12, 0));
    plank.add(at(cyl(0.025, 0.025, 0.3, C.white, 6), s * 1.05, 0.25, 0));
    plank.add(at(rot(cyl(0.025, 0.025, 0.3, C.white, 6), P / 2, 0, 0), s * 1.05, 0.38, 0));
    plank.add(at(sph(0.04, '#7fd8bf', undefined, 8), s * 1.05, 0.38, 0.15));
    plank.add(at(sph(0.04, '#7fd8bf', undefined, 8), s * 1.05, 0.38, -0.15));
  }
  plank.rotation.z = 0.17;
  colorBake(plank);
  add(dyn(plank));
  col({ type: 'box', x: SS.x, z: SS.z, hw: 0.2, hd: 0.25 });
  for (const s of [-1, 1]) col({ type: 'circle', x: SS.x + s * 1.3, z: SS.z, r: 0.18 }, { type: 'circle', x: SS.x + s * 0.68, z: SS.z, r: 0.18 });

  // ---------------------------------------------------------------- sandpit with a sandcastle
  const D = SAND;
  add(at(box(D.hw * 2 - 0.1, 0.18, D.hd * 2 - 0.1, mat(C.sand, { rough: 0.95 })), D.x, 0.09, D.z));
  for (const s of [-1, 1]) {
    add(at(rbox(D.hw * 2 + 0.16, 0.25, 0.16, '#e0a86a', 0.04), D.x, 0.125, D.z + s * D.hd));
    add(at(rbox(0.16, 0.25, D.hd * 2, '#e0a86a', 0.04), D.x + s * D.hw, 0.125, D.z));
  }
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(at(rbox(0.24, 0.3, 0.24, C.rose, 0.05), D.x + x * D.hw, 0.15, D.z + z * D.hd));
  const castle = new THREE.Group();
  const SC = '#efc27f';
  castle.add(at(rbox(0.62, 0.26, 0.5, SC, 0.05), 0, 0.13, 0));
  for (const [x, z] of [[-0.3, -0.24], [0.3, -0.24], [-0.3, 0.24], [0.3, 0.24]]) {
    castle.add(at(cyl(0.11, 0.12, 0.36, SC, 10), x, 0.18, z));
    castle.add(at(cone(0.13, 0.16, '#e6b56c', 10), x, 0.44, z));
  }
  castle.add(at(cyl(0.14, 0.16, 0.42, SC, 12), 0, 0.42, 0));
  castle.add(at(cone(0.16, 0.2, '#e6b56c', 12), 0, 0.73, 0));
  castle.add(at(cyl(0.008, 0.008, 0.22, C.ink, 4), 0, 0.92, 0));
  castle.add(at(rot(cone(0.05, 0.12, C.rose, 3), 0, 0, -P / 2), 0.06, 0.98, 0));
  castle.add(at(rbox(0.12, 0.14, 0.04, '#c99456', 0.02), 0, 0.1, 0.26));
  add(at(castle, D.x - 0.35, 0.18, D.z - 0.15));
  // Bucket, spade and shells
  add(at(cyl(0.13, 0.1, 0.2, '#6fb8ff', 12), D.x + 0.6, 0.28, D.z + 0.35));
  add(at(rot(k.tor(0.11, 0.01, C.white, P, undefined, 10, 4), 0, 0.4, 0), D.x + 0.6, 0.38, D.z + 0.35));
  add(at(rot(rbox(0.06, 0.04, 0.42, C.sun, 0.015), 0.1, 0.6, 0), D.x + 0.75, 0.21, D.z - 0.2));
  add(at(rot(rbox(0.16, 0.02, 0.18, C.sun, 0.01), 0.1, 0.6, 0), D.x + 0.62, 0.2, D.z - 0.38));
  for (const [x, z, c] of [[0.2, 0.55, C.pink], [-0.7, 0.6, C.white], [0.9, -0.6, '#ffd1dc']]) add(at(sph(0.05, c, undefined, 8), D.x + x, 0.19, D.z + z)).scale.set(1, 0.5, 1);
  col({ type: 'box', x: D.x, z: D.z, hw: D.hw + 0.08, hd: D.hd + 0.08, h: 0.2 });
  col({ type: 'circle', x: D.x - 0.35, z: D.z - 0.15, r: 0.42 });

  // ---------------------------------------------------------------- hopscotch in chalk
  const hop = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 3.5),
    new THREE.MeshStandardMaterial({ map: hopscotch(), roughness: 0.95, alphaTest: 0.4, transparent: false }),
  );
  hop.rotation.x = -P / 2;
  hop.position.set(-8.75, 0.014, 5.55);
  hop.receiveShadow = true;
  add(hop);
  // A little chalk box beside it
  add(at(rbox(0.3, 0.08, 0.18, '#ffd1dc', 0.02), -7.85, 0.04, 7.0));
  ['#ffffff', '#ff9eb5', '#8fd3ff'].forEach((c, i) => add(at(rot(cyl(0.02, 0.02, 0.14, c, 6), 0, 0, P / 2), -7.85, 0.1, 6.95 + i * 0.05)));

  return {
    plank,
    // Seat on the see-saw end (side -1 left, +1 right) for a plank angle a: local position
    seesawSeat(side, a) {
      const x = SS.x + side * 1.3 * Math.cos(a);
      const y = SS.y + 0.12 + side * 1.3 * Math.sin(a);
      return { x, y, z: SS.z };
    },
  };
}

function hopscotch() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 690;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  const s = 92; // one square in pixels
  const cx = c.width / 2;
  const rows = [[1], [2], [3, 4], [5], [6, 7], [8]];
  const cols = ['#ffffff', '#ff9eb5', '#8fd3ff', '#ffd166', '#c7a6ff', '#ffffff', '#ff9eb5', '#8fd3ff'];
  ctx.lineWidth = 7;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 54px ${FONT}`;
  rows.forEach((row, i) => {
    const y = c.height - 20 - (i + 1) * s;
    row.forEach((n, j) => {
      const x = row.length === 1 ? cx - s / 2 : cx - s + j * s;
      ctx.strokeStyle = cols[n - 1];
      ctx.globalAlpha = 0.92;
      roundRect(ctx, x + 4, y + 4, s - 8, s - 8, 10);
      ctx.stroke();
      ctx.fillStyle = cols[(n + 2) % 8];
      ctx.fillText(String(n), x + s / 2, y + s / 2 + 3);
    });
  });
  // "Home" half circle at the top
  ctx.strokeStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(cx, c.height - 20 - 6 * s, s * 0.62, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText('home', cx, c.height - 20 - 6 * s - 24);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
