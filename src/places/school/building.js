import { THREE, C, mat, umat, mesh, canvasTexture, roundRect, FONT, uvScale, heartPath, fitText, bellTone, colorBake } from './kit.js';

// Little Stars Primary: a cream school with a coral roof, a clock and bell tower, a fenced
// forecourt and a locked gate with a heart padlock. Front faces +Z.

export const WALL = '#fff3df';
const ROOF = '#f07b6a';
const TRIM = C.sun;
const SHUTTER = '#8fcfff';

// What you see through the classroom windows: tiny desks, a chalkboard and a rainbow.
function classroomView(ctx, w, h) {
  ctx.fillStyle = '#fff1c6';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffe3a6';
  ctx.fillRect(0, h * 0.64, w, h * 0.36);
  // Chalkboard
  ctx.fillStyle = '#9b6a43';
  roundRect(ctx, w * 0.12, h * 0.12, w * 0.5, h * 0.3, 8);
  ctx.fill();
  ctx.fillStyle = '#3f7a5e';
  roundRect(ctx, w * 0.14, h * 0.14, w * 0.46, h * 0.26, 6);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(h * 0.11)}px ${FONT}`;
  ctx.fillText('A B C', w * 0.37, h * 0.24);
  ctx.fillStyle = '#ff9eb5';
  heartPath(ctx, w * 0.37, h * 0.34, h * 0.07);
  ctx.fill();
  // Rainbow drawing
  ['#ef5b6f', '#ffb347', '#ffd166', '#7fd36b', '#6fb8ff'].forEach((c, i) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = h * 0.025;
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.4, w * (0.13 - i * 0.022), Math.PI, 0);
    ctx.stroke();
  });
  // Little desks with chairs
  for (let i = 0; i < 3; i++) {
    const x = w * (0.2 + i * 0.3);
    ctx.fillStyle = ['#ff9eb5', '#7fd8bf', '#ffd166'][i];
    roundRect(ctx, x - w * 0.06, h * 0.74, w * 0.12, h * 0.1, 4);
    ctx.fill();
    ctx.fillStyle = '#d4a373';
    roundRect(ctx, x - w * 0.11, h * 0.68, w * 0.22, h * 0.06, 4);
    ctx.fill();
    ctx.fillRect(x - w * 0.09, h * 0.74, w * 0.02, h * 0.14);
    ctx.fillRect(x + w * 0.07, h * 0.74, w * 0.02, h * 0.14);
  }
  // Paper stars hanging from the top
  ctx.fillStyle = '#ffd166';
  for (let i = 0; i < 4; i++) {
    const x = w * (0.15 + i * 0.24);
    ctx.fillRect(x - 1, 0, 2, h * 0.07);
    ctx.beginPath();
    for (let j = 0; j < 10; j++) {
      const r = j % 2 ? h * 0.018 : h * 0.042;
      const a = (j / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * r, h * 0.1 + Math.sin(a) * r);
    }
    ctx.fill();
  }
}

function brick(ctx, w, h) {
  ctx.fillStyle = '#ffe7d2';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f7b49a';
  const bw = w / 4;
  const bh = h / 4;
  for (let j = 0; j < 4; j++) {
    for (let i = -1; i < 5; i++) {
      const x = i * bw + (j % 2 ? bw / 2 : 0);
      roundRect(ctx, x + 3, j * bh + 3, bw - 6, bh - 6, 5);
      ctx.fill();
    }
  }
}

function tiles(ctx, w, h) {
  ctx.fillStyle = '#e8695a';
  ctx.fillRect(0, 0, w, h);
  for (let j = 0; j < 4; j++) {
    ctx.fillStyle = j % 2 ? '#f48a77' : '#f07b6a';
    for (let i = 0; i < 5; i++) {
      const x = (i + (j % 2 ? 0.5 : 0)) * (w / 4);
      ctx.beginPath();
      ctx.arc(x, j * (h / 4) + h / 8, w / 8 - 2, 0, Math.PI);
      ctx.fill();
    }
  }
}

export function buildSchool(R) {
  const { k, add, dyn, col, atlas } = R;
  const { box, rbox, cyl, sph, tor, cone, heart, star, at, rot } = k;
  const P = Math.PI;

  // ---------------------------------------------------------------- wings
  const brickTex = canvasTexture(128, 64, brick);
  brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping;
  const brickMat = umat('#ffffff', { rough: 0.85, map: brickTex });
  const W0 = -5.8;
  const W1 = 5.8;
  const WZ = -5.9; // wing centre z
  const WF = -3.4; // wing front face
  add(at(box(W1 - W0, 3.0, 5.0, WALL), 0, 1.5, WZ));
  const base = new THREE.BoxGeometry(W1 - W0 + 0.08, 0.7, 5.08);
  uvScale(base, (W1 - W0) / 0.9, 1);
  add(at(mesh(base, brickMat), 0, 0.35, WZ));
  add(at(box(W1 - W0 + 0.1, 0.1, 5.1, C.white), 0, 0.72, WZ));
  add(at(box(W1 - W0 + 0.08, 0.16, 5.08, SHUTTER), 0, 2.55, WZ));
  col({ type: 'box', x: 0, z: WZ + 0.27, hw: (W1 - W0) / 2 + 0.05, hd: 2.82 }); // flower boxes stick out at the front

  // Roof: two tiled slopes per wing, stopping at the tower block
  const tileTex = canvasTexture(128, 128, tiles);
  tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
  const tileMat = umat('#ffffff', { rough: 0.8, map: tileTex });
  const slope = Math.atan2(1.25, 2.85);
  const len = Math.hypot(1.25, 2.85) + 0.1;
  for (const [x0, x1] of [[W0 - 0.3, -1.7], [1.7, W1 + 0.3]]) {
    const w = x1 - x0;
    const cx = (x0 + x1) / 2;
    for (const s of [1, -1]) {
      const g = new THREE.BoxGeometry(w, 0.14, len);
      uvScale(g, w / 0.7, len / 0.5);
      const m = rot(at(mesh(g, tileMat), cx, 3.0 + 0.66, WZ + s * 1.42), s * slope, 0, 0);
      add(m);
    }
    // Gable end (triangle)
    const tri = new THREE.Shape([new THREE.Vector2(-2.55, 0), new THREE.Vector2(2.55, 0), new THREE.Vector2(0, 1.15)]);
    const gg = new THREE.ExtrudeGeometry(tri, { depth: 0.12, bevelEnabled: false });
    for (const ex of x0 < 0 ? [x0 + 0.32] : [x1 - 0.32]) {
      const gm = mesh(gg, mat(WALL));
      gm.rotation.y = P / 2;
      at(gm, ex - 0.06, 3.0, WZ);
      add(gm);
    }
    // Scalloped white trim along the front eave
    for (let x = x0 + 0.2; x < x1 - 0.1; x += 0.4) add(at(sph(0.12, C.white, undefined, 8), x, 2.93, -3.1));
    add(at(box(w, 0.1, 0.1, C.white), cx, 2.98, -3.06));
  }

  // Windows with a peek inside, shutters and flower boxes
  const viewTex = canvasTexture(256, 256, classroomView);
  const viewMat = umat('#ffffff', { rough: 0.3, map: viewTex });
  viewMat.emissive = new THREE.Color('#ffffff');
  viewMat.emissiveMap = viewTex;
  viewMat.emissiveIntensity = 0.22;
  const paneGeo = new THREE.PlaneGeometry(0.92, 1.02);
  const windows = [-4.6, -2.75, 2.75, 4.6];
  for (const x of windows) {
    const y = 1.6;
    const z = WF;
    add(at(rbox(1.12, 1.22, 0.1, C.white, 0.04), x, y, z + 0.02));
    add(at(mesh(paneGeo, viewMat, { cast: false }), x, y, z + 0.075));
    add(at(box(0.05, 1.02, 0.04, C.white), x, y, z + 0.1));
    add(at(box(0.92, 0.05, 0.04, C.white), x, y + 0.12, z + 0.1));
    for (const s of [-1, 1]) {
      add(at(rbox(0.3, 1.14, 0.06, SHUTTER, 0.03), x + s * 0.74, y, z + 0.06));
      add(at(heart(0.11, 0.02, C.white), x + s * 0.74, y + 0.3, z + 0.1));
    }
    add(at(rbox(1.2, 0.2, 0.3, C.woodDark, 0.04), x, y - 0.68, z + 0.16));
    for (let i = 0; i < 6; i++) R.flowers.push([x - 0.5 + i * 0.2, y - 0.6, z + 0.18, i % 4, 0.75]);
    // Little bush at the wall foot
    const b = sph(0.36, (x * 7) % 2 ? C.leaf : C.leafDark, { rough: 0.9 }, 12);
    b.scale.set(1.4, 0.75, 0.8);
    add(at(b, x, 0.25, z + 0.35));
  }
  // Toy letter and number blocks between the windows
  const blocks = [['A', '#ef5b6f', -3.68, 2.2], ['B', '#ffd166', -3.68, 1.62], ['C', '#7fd8bf', -3.68, 1.04], ['1', '#6fb8ff', 3.68, 2.2], ['2', '#ff9eb5', 3.68, 1.62], ['3', '#c7a6ff', 3.68, 1.04]];
  for (const [ch, c, x, y] of blocks) {
    add(at(rbox(0.46, 0.46, 0.3, c, 0.06), x, y, WF + 0.12));
    const f = atlas.panel(0.38, 0.38, 96, 96, (cx, w, h) => {
      cx.fillStyle = '#fffaf2';
      roundRect(cx, 6, 6, w - 12, h - 12, 14);
      cx.fill();
      cx.fillStyle = c;
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.font = `700 ${h * 0.66}px ${FONT}`;
      cx.fillText(ch, w / 2, h / 2 + 4);
    });
    add(at(f, x, y, WF + 0.275));
  }

  // ---------------------------------------------------------------- entrance block and tower
  const TZ = -5.3;
  const TF = -3.0;
  add(at(box(3.4, 3.8, 4.6, WALL), 0, 1.9, TZ));
  const tb = new THREE.BoxGeometry(3.48, 0.7, 4.68);
  uvScale(tb, 3.4 / 0.9, 1);
  add(at(mesh(tb, brickMat), 0, 0.35, TZ));
  add(at(rbox(3.7, 0.2, 4.9, TRIM, 0.06), 0, 3.85, TZ));
  for (let x = -1.6; x <= 1.61; x += 0.4) add(at(sph(0.11, C.white, undefined, 8), x, 3.72, TF + 0.1));
  col({ type: 'box', x: 0, z: TZ, hw: 1.75, hd: 2.35 });
  // Door: two sky-blue leaves with round windows, a sunrise transom and heart handles
  add(at(rbox(1.66, 2.3, 0.12, C.white, 0.04), 0, 1.15, TF + 0.02));
  for (const s of [-1, 1]) {
    add(at(rbox(0.7, 2.05, 0.07, '#6fb8ff', 0.03), s * 0.36, 1.05, TF + 0.09));
    const port = rot(cyl(0.17, 0.17, 0.05, mat('#e8f7ff', { rough: 0.2, emissive: '#cfeeff', ei: 0.3 }), 18), P / 2, 0, 0);
    add(at(port, s * 0.36, 1.5, TF + 0.13));
    add(at(rot(tor(0.17, 0.03, C.white, P * 2, undefined, 20, 6), 0, 0, 0), s * 0.36, 1.5, TF + 0.14));
    add(at(heart(0.1, 0.03, C.rose), s * 0.1, 1.0, TF + 0.15));
  }
  const sunrise = atlas.wrap(new THREE.CircleGeometry(0.7, 24, 0, P), 256, 256, (cx, w, h) => {
    cx.fillStyle = '#ffeaa8';
    cx.fillRect(0, 0, w, h);
    cx.strokeStyle = '#ffc94d';
    cx.lineWidth = 12;
    for (let i = 1; i < 8; i++) {
      const a = P + (i / 8) * P;
      cx.beginPath();
      cx.moveTo(w / 2, h / 2);
      cx.lineTo(w / 2 + Math.cos(a) * w, h / 2 + Math.sin(a) * w);
      cx.stroke();
    }
    cx.fillStyle = '#ffb347';
    cx.beginPath();
    cx.arc(w / 2, h / 2, w * 0.17, 0, P * 2);
    cx.fill();
  });
  add(at(sunrise, 0, 2.3, TF + 0.06));
  add(at(tor(0.72, 0.06, C.white, P, undefined, 24, 6), 0, 2.3, TF + 0.07));
  add(at(rbox(2.0, 0.12, 0.7, '#f3e6d3', 0.04), 0, 0.06, TF + 0.4));
  col({ type: 'box', x: 0, z: TF + 0.4, hw: 1.0, hd: 0.35, h: 0.12 });
  // Name board
  add(at(rbox(3.05, 0.8, 0.1, TRIM, 0.08), 0, 3.25, TF + 0.04));
  const name = atlas.panel(2.9, 0.66, 1024, 232, (cx, w, h) => {
    cx.fillStyle = '#fffaf2';
    roundRect(cx, 0, 0, w, h, 60);
    cx.fill();
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillStyle = '#ef6f5e';
    cx.font = `700 ${h * 0.5}px ${FONT}`;
    cx.fillText('Little Stars', w / 2, h * 0.4);
    cx.fillStyle = '#4a3423';
    cx.font = `600 ${h * 0.2}px ${FONT}`;
    cx.fillText('PRIMARY SCHOOL', w / 2, h * 0.79);
    for (const [x, y, s, c] of [[0.09, 0.4, 1, '#ffd166'], [0.91, 0.4, 1, '#ffd166'], [0.16, 0.75, 0.55, '#7fd8bf'], [0.84, 0.75, 0.55, '#ff9eb5']]) {
      cx.fillStyle = c;
      cx.beginPath();
      for (let j = 0; j < 10; j++) {
        const r = (j % 2 ? 22 : 52) * s;
        const a = (j / 10) * P * 2 - P / 2;
        cx.lineTo(w * x + Math.cos(a) * r, h * y + Math.sin(a) * r);
      }
      cx.fill();
    }
  });
  add(at(name, 0, 3.25, TF + 0.1));

  // Clock stage
  const CZ = -4.2;
  add(at(rbox(2.2, 1.2, 2.2, WALL, 0.05), 0, 4.4, CZ));
  add(at(rbox(2.4, 0.14, 2.4, TRIM, 0.05), 0, 5.02, CZ));
  for (const s of [-1, 1]) add(at(box(0.12, 1.2, 0.12, SHUTTER), s * 1.06, 4.4, CZ + 1.06));
  const face = atlas.wrap(new THREE.CircleGeometry(0.5, 32), 256, 256, (cx, w, h) => {
    cx.fillStyle = '#fffaf2';
    cx.fillRect(0, 0, w, h);
    cx.fillStyle = '#4a3423';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.font = `700 ${h * 0.16}px ${FONT}`;
    const n = { 0: '12', 3: '3', 6: '6', 9: '9' };
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * P * 2 - P / 2;
      if (n[i]) cx.fillText(n[i], w / 2 + Math.cos(a) * w * 0.36, h / 2 + Math.sin(a) * h * 0.36 + 3);
      else {
        cx.fillStyle = i % 2 ? '#ff9eb5' : '#7fd8bf';
        cx.beginPath();
        cx.arc(w / 2 + Math.cos(a) * w * 0.37, h / 2 + Math.sin(a) * h * 0.37, w * 0.025, 0, P * 2);
        cx.fill();
        cx.fillStyle = '#4a3423';
      }
    }
  });
  add(at(face, 0, 4.4, CZ + 1.115));
  add(at(tor(0.52, 0.06, SHUTTER, P * 2, undefined, 32, 8), 0, 4.4, CZ + 1.12));
  const hands = new THREE.Group();
  hands.position.set(0, 4.4, CZ + 1.14);
  const hourHand = new THREE.Group();
  const minHand = new THREE.Group();
  hourHand.add(at(box(0.05, 0.24, 0.02, C.ink), 0, 0.1, 0));
  minHand.add(at(box(0.035, 0.36, 0.02, C.rose), 0, 0.16, 0.015));
  hands.add(hourHand, minHand, at(sph(0.04, C.gold, { metal: 0.4, rough: 0.35 }, 10), 0, 0, 0.03));
  add(dyn(hands));

  // Belfry with the big bell, a pointy roof and a star
  add(at(rbox(2.3, 0.12, 2.3, C.white, 0.04), 0, 5.12, CZ));
  for (const [x, z] of [[-0.78, -0.78], [0.78, -0.78], [-0.78, 0.78], [0.78, 0.78]]) add(at(rbox(0.18, 0.95, 0.18, C.white, 0.05), x, 5.64, CZ + z));
  add(at(rbox(1.86, 0.12, 1.86, TRIM, 0.04), 0, 6.14, CZ));
  add(at(rot(cyl(0.04, 0.04, 1.56, C.woodDark, 8), 0, 0, P / 2), 0, 5.98, CZ));
  const roof = cone(1.25, 0.9, ROOF, 4, { rough: 0.8 });
  roof.rotation.y = P / 4;
  add(at(roof, 0, 6.65, CZ));
  const topStar = star(0.17, 0.08, 0.05, mat(C.sun, { emissive: '#ffb200', ei: 0.35, rough: 0.5 }));
  add(at(topStar, 0, 7.26, CZ));
  add(at(cyl(0.025, 0.025, 0.2, C.gold, 6), 0, 7.1, CZ));
  const bell = new THREE.Group();
  bell.position.set(0, 5.8, CZ);
  bell.add(bellMesh(k, 0.34));
  bell.add(at(cyl(0.022, 0.022, 0.18, C.woodDark, 6), 0, 0.09, 0));
  add(dyn(bell));

  // ---------------------------------------------------------------- forecourt, fence and the locked gate
  const FZ = -0.9; // front fence line
  const FX = 2.6; // half width
  R.fence([[-FX, WF], [-FX, FZ]], { color: C.white, height: 0.95 });
  R.fence([[FX, WF], [FX, FZ]], { color: C.white, height: 0.95 });
  R.fence([[-FX, FZ], [-1.25, FZ]], { color: C.white, height: 0.95 });
  R.fence([[1.25, FZ], [FX, FZ]], { color: C.white, height: 0.95 });
  col({ type: 'box', x: -FX, z: (WF + FZ) / 2, hw: 0.08, hd: (FZ - WF) / 2 });
  col({ type: 'box', x: FX, z: (WF + FZ) / 2, hw: 0.08, hd: (FZ - WF) / 2 });
  col({ type: 'box', x: 0, z: FZ, hw: FX, hd: 0.09 });
  // Inside: flower beds along the fence and two round topiaries by the door
  for (let z = WF + 0.35; z < FZ - 0.2; z += 0.28) {
    for (const s of [-1, 1]) R.flowers.push([s * (FX - 0.25), 0, z, (Math.round(z * 4) + (s > 0 ? 1 : 0)) % 4, 0.9]);
  }
  for (const s of [-1, 1]) {
    add(at(cyl(0.22, 0.17, 0.4, '#e08a5c', 14), s * 1.35, 0.2, TF + 0.45));
    add(at(sph(0.3, C.leaf, { rough: 0.9 }, 14), s * 1.35, 0.68, TF + 0.45));
    add(at(sph(0.2, C.leafDark, { rough: 0.9 }, 12), s * 1.35, 1.05, TF + 0.45));
  }
  // Gate pillars, the arch board and the gate leaves
  for (const s of [-1, 1]) {
    add(at(rbox(0.34, 2.05, 0.34, WALL, 0.05), s * 1.08, 1.025, FZ));
    add(at(rbox(0.42, 0.14, 0.42, TRIM, 0.05), s * 1.08, 2.1, FZ));
    col({ type: 'box', x: s * 1.08, z: FZ, hw: 0.2, hd: 0.2 });
  }
  add(at(rbox(2.4, 0.78, 0.1, SHUTTER, 0.08), 0, 2.5, FZ));
  const gateSign = atlas.panel(2.28, 0.66, 760, 220, (cx, w, h) => {
    cx.fillStyle = '#fffaf2';
    roundRect(cx, 0, 0, w, h, 50);
    cx.fill();
    cx.fillStyle = '#ff7f9d';
    heartPath(cx, h * 0.42, h * 0.5, h * 0.5);
    cx.fill();
    cx.fillStyle = '#ffffff';
    cx.beginPath();
    cx.arc(h * 0.42, h * 0.45, h * 0.055, 0, P * 2);
    cx.fill();
    cx.fillRect(h * 0.42 - 4, h * 0.45, 8, h * 0.12);
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillStyle = '#4a3423';
    fitText(cx, 'Opens when our', w * 0.58, h * 0.33, w * 0.68, Math.round(h * 0.3));
    cx.fillStyle = '#ef6f5e';
    fitText(cx, 'little one arrives', w * 0.58, h * 0.7, w * 0.68, Math.round(h * 0.3));
  });
  add(at(gateSign, 0, 2.5, FZ + 0.06));
  add(at(star(0.14, 0.065, 0.05, C.sun), 0, 3.02, FZ));
  const bars = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const x = s * (0.12 + i * 0.15);
      const hh = 0.9 + i * 0.045;
      add(at(cyl(0.022, 0.022, hh, C.white, 6), x, hh / 2 + 0.08, FZ));
      add(at(sph(0.045, C.sun, undefined, 8), x, hh + 0.1, FZ));
      bars.push(x);
    }
    add(at(rbox(0.86, 0.07, 0.06, C.white, 0.02), s * 0.47, 0.25, FZ));
    add(at(rbox(0.86, 0.07, 0.06, C.white, 0.02), s * 0.47, 0.8, FZ));
  }
  // Chain and heart padlock on the seam
  const lock = new THREE.Group();
  lock.position.set(0, 0.86, FZ + 0.06);
  const lockBody = new THREE.Group();
  lockBody.add(at(rot(tor(0.075, 0.018, mat(C.steel, { metal: 0.6, rough: 0.3 }), P, undefined, 14, 6), 0, 0, 0), 0, -0.06, 0));
  lockBody.add(at(heart(0.24, 0.07, mat('#ff7f9d', { rough: 0.45 })), 0, -0.2, 0));
  lockBody.add(at(rot(cyl(0.024, 0.024, 0.02, C.ink, 10), P / 2, 0, 0), 0, -0.19, 0.05));
  lockBody.add(at(box(0.016, 0.05, 0.02, C.ink), 0, -0.225, 0.05));
  lockBody.add(at(sph(0.025, C.white, { rough: 0.3 }, 8), -0.06, -0.14, 0.05));
  lock.add(lockBody);
  for (let i = 0; i < 4; i++) {
    const link = tor(0.035, 0.01, mat(C.steel, { metal: 0.6, rough: 0.3 }), P * 2, undefined, 10, 5);
    link.rotation.set(0, i % 2 ? P / 2 : 0, 0);
    at(link, (i - 1.5) * 0.06, 0.02 - Math.abs(i - 1.5) * 0.01, 0);
    lock.add(link);
  }
  add(dyn(lock));

  // ---------------------------------------------------------------- bell frame by the gate
  const BP = { x: -2.05, z: -0.45 };
  for (const s of [-1, 1]) {
    add(at(rbox(0.12, 1.78, 0.12, C.woodDark, 0.03), BP.x + s * 0.38, 0.89, BP.z));
    add(at(cyl(0.12, 0.14, 0.08, C.woodDark, 10), BP.x + s * 0.38, 0.04, BP.z));
    add(at(rot(rbox(0.62, 0.07, 0.42, ROOF, 0.03), 0, 0, -s * 0.5), BP.x + s * 0.25, 1.98, BP.z));
  }
  add(at(rbox(0.98, 0.1, 0.14, C.woodDark, 0.03), BP.x, 1.75, BP.z));
  add(at(sph(0.06, C.sun, undefined, 8), BP.x, 2.13, BP.z));
  col({ type: 'box', x: BP.x, z: BP.z, hw: 0.46, hd: 0.1 });
  const handBell = new THREE.Group();
  handBell.position.set(BP.x, 1.7, BP.z);
  handBell.add(bellMesh(k, 0.15));
  const rope = new THREE.Group();
  rope.position.y = -0.16;
  rope.add(at(cyl(0.012, 0.012, 0.56, C.rose, 5), 0, -0.28, 0));
  rope.add(at(sph(0.045, C.pink, undefined, 10), 0, -0.58, 0));
  rope.add(at(k.cone(0.05, 0.12, C.pink, 8), 0, -0.66, 0));
  handBell.add(rope);
  add(dyn(handBell));
  // Keep the moving parts' own pieces merged
  colorBake(hands, [hourHand, minHand]);
  colorBake(bell);
  colorBake(lockBody);
  colorBake(handBell, [rope]);
  colorBake(rope);

  // ---------------------------------------------------------------- behaviour
  let ringT = -1;
  let lockT = -1;
  let focused = null;
  const set = new Date();
  const api = {
    bellPost: BP,
    ring(a) {
      if (ringT >= 0 && ringT < 1.2) return;
      ringT = 0;
      const s = a.sound;
      if (s?.ctx) {
        const t0 = s.ctx.currentTime + 0.05;
        for (let i = 0; i < 4; i++) bellTone(s, t0 + i * 0.5, i % 2 ? 622 : 740, 0.06);
      }
      a.fx.burst(a.world(0, CZ, 5.8), ['#ffd166', '#ffffff', '#ff9eb5', '#8fd3ff'], 26);
      a.focus({ x: 0, z: -2.6, y: 3.4, zoom: 0.72 });
      focused = a;
      a.emote('player', 'cheer');
      a.toast('Ding dong! One day this bell will call our little one to class.', 3200);
    },
    rattle(a) {
      lockT = 0;
      a.sound?.locked?.();
      a.fx.heartsAt(a.world(0, FZ + 0.3, 0.9), 3);
      a.toast('Not yet! This school is waiting for our little one.', 3000);
    },
    update(dt, t) {
      const now = new Date(set.getTime() + t * 1000);
      const m = now.getMinutes() + now.getSeconds() / 60;
      const h = (now.getHours() % 12) + m / 60;
      minHand.rotation.z = -(m / 60) * P * 2;
      hourHand.rotation.z = -(h / 12) * P * 2;
      if (ringT >= 0) {
        ringT += dt;
        const a = Math.sin(ringT * 7.5) * 0.55 * Math.exp(-ringT * 0.7);
        bell.rotation.x = a;
        handBell.rotation.z = a * 1.2;
        rope.rotation.z = -a * 0.6;
        if (focused && ringT > 3.2 && !focused.activityRunning) {
          focused.focus(null);
          focused = null;
        }
        if (ringT > 6) {
          ringT = -1;
          bell.rotation.x = 0;
          handBell.rotation.z = 0;
        }
      }
      if (lockT >= 0) {
        lockT += dt;
        lockBody.rotation.z = Math.sin(lockT * 16) * 0.35 * Math.exp(-lockT * 2.5);
        lockBody.rotation.x = Math.sin(lockT * 11) * 0.15 * Math.exp(-lockT * 2.5);
        if (lockT > 2.5) {
          lockT = -1;
          lockBody.rotation.set(0, 0, 0);
        }
      }
    },
  };
  return api;
}

// A golden bell hanging from its pivot (top at y = 0), open end down.
export function bellMesh(k, r) {
  const g = new THREE.Group();
  const pts = [[0, -1.02], [0.62, -1.02], [0.74, -1.04], [0.72, -0.98], [0.5, -0.75], [0.42, -0.4], [0.34, -0.12], [0.22, 0], [0, 0]].map(([x, y]) => new THREE.Vector2(x * r, y * r));
  g.add(mesh(new THREE.LatheGeometry(pts, 18), mat(C.gold, { metal: 0.5, rough: 0.3 })));
  g.add(k.at(k.sph(r * 0.2, C.gold, { metal: 0.5, rough: 0.3 }, 10), 0, -r * 1.1, 0));
  g.add(k.at(k.tor(r * 0.16, r * 0.05, C.gold, Math.PI * 2, { metal: 0.5, rough: 0.3 }, 12, 6), 0, r * 0.12, 0));
  return g;
}
