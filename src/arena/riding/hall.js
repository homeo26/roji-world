import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, umat, mesh, canvasTexture, roundRect, rng, FONT, heartShape } from '../../util.js';
import { box, rbox, cyl, ball, cone, at, painted, bannerDraw, bakeVC, bunting, makeCrowd, randomLook, poseFan } from './kit.js';

// The fencing hall: a sunny club room with the piste, a scoreboard with lights,
// bleachers with fans, windows, banners and kit racks. The piste runs along X at z = 0.

export const PISTE_HALF = 7;
const WALL_Z = -5.6;

function pisteTexture(guard) {
  const W = 1400;
  const H = 180;
  const tex = canvasTexture(W, H, (ctx) => {
    const m = W / (PISTE_HALF * 2);
    const X = (x) => W / 2 + x * m;
    ctx.fillStyle = '#cdd9e6';
    ctx.fillRect(0, 0, W, H);
    // Warning zones in the last two metres
    ctx.fillStyle = '#f5cdd3';
    ctx.fillRect(0, 0, X(-PISTE_HALF + 2), H);
    ctx.fillRect(X(PISTE_HALF - 2), 0, W, H);
    // Edge stripes
    ctx.fillStyle = '#a9bdd1';
    ctx.fillRect(0, 0, W, 10);
    ctx.fillRect(0, H - 10, W, 10);
    ctx.fillStyle = '#ffffff';
    const line = (x, w = 6, h0 = 0.12, h1 = 0.88) => ctx.fillRect(X(x) - w / 2, H * h0, w, H * (h1 - h0));
    line(0, 7, 0.06, 0.94);
    line(-guard);
    line(guard);
    line(-PISTE_HALF + 0.08, 10, 0.06, 0.94);
    line(PISTE_HALF - 0.08, 10, 0.06, 0.94);
    // Little hearts on the centre line
    ctx.fillStyle = '#ff9eb5';
    for (const y of [0.3, 0.7]) {
      ctx.beginPath();
      const cx = X(0);
      const cy = H * y;
      ctx.moveTo(cx, cy + 9);
      ctx.bezierCurveTo(cx - 16, cy - 2, cx - 8, cy - 14, cx, cy - 5);
      ctx.bezierCurveTo(cx + 8, cy - 14, cx + 16, cy - 2, cx, cy + 9);
      ctx.fill();
    }
  });
  return tex;
}

function floorTexture() {
  const tex = canvasTexture(512, 512, (ctx, w, h) => {
    const r = rng(4);
    const rows = 8;
    for (let j = 0; j < rows; j++) {
      let x = -r() * 200;
      while (x < w) {
        const len = 160 + r() * 160;
        const c = 210 + Math.floor(r() * 20);
        ctx.fillStyle = `rgb(${c + 25}, ${c - 10}, ${c - 60})`;
        ctx.fillRect(x, (j * h) / rows, len, h / rows);
        ctx.fillStyle = 'rgba(120,70,30,0.25)';
        ctx.fillRect(x, (j * h) / rows, 3, h / rows);
        x += len;
      }
      ctx.fillStyle = 'rgba(120,70,30,0.3)';
      ctx.fillRect(0, (j * h) / rows, w, 3);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 3);
  return tex;
}

function windowPiece(g, x, y, w, h) {
  const frame = rbox(w + 0.3, h + 0.3, 0.16, '#fffaf4', 0.06);
  at(frame, x, y, WALL_Z + 0.1);
  const glass = rbox(w, h, 0.06, umat('#bfe9f5', { rough: 0.15, emissive: '#dff6ff', ei: 0.55 }), 0.04);
  at(glass, x, y, WALL_Z + 0.16);
  const arch = mesh(new THREE.CircleGeometry(w / 2, 20, 0, Math.PI), umat('#bfe9f5', { rough: 0.15, emissive: '#dff6ff', ei: 0.55 }), { cast: false });
  at(arch, x, y + h / 2, WALL_Z + 0.2);
  const archFrame = mesh(new THREE.TorusGeometry(w / 2 + 0.08, 0.08, 6, 20, Math.PI), mat('#fffaf4'));
  at(archFrame, x, y + h / 2, WALL_Z + 0.16);
  const mv = box(0.07, h, 0.05, '#fffaf4');
  at(mv, x, y, WALL_Z + 0.2);
  const mh = box(w, 0.07, 0.05, '#fffaf4');
  at(mh, x, y + h * 0.1, WALL_Z + 0.2);
  const sill = rbox(w + 0.5, 0.1, 0.3, '#fffaf4', 0.03);
  at(sill, x, y - h / 2 - 0.15, WALL_Z + 0.2);
  // A little plant on the sill
  const pot = cyl(0.12, 0.09, 0.18, '#f08a5d', 10);
  at(pot, x + w / 2 - 0.1, y - h / 2 - 0.01, WALL_Z + 0.25);
  const leaf = ball(0.16, '#6dbb58', { flat: true }, 8);
  at(leaf, x + w / 2 - 0.1, y - h / 2 + 0.18, WALL_Z + 0.25);
  g.add(frame, glass, arch, archFrame, mv, mh, sill, pot, leaf);
  return [glass, arch];
}

function drawBoard(ctx, w, h, s) {
  ctx.fillStyle = '#2f2b4e';
  roundRect(ctx, 0, 0, w, h, 40);
  ctx.fill();
  ctx.fillStyle = '#3d3862';
  roundRect(ctx, 16, 16, w - 32, h - 32, 30);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [k, side] of [[0, -1], [1, 1]]) {
    const cx = w / 2 + side * w * 0.27;
    ctx.fillStyle = s.colors[k];
    ctx.font = `700 ${h * 0.13}px ${FONT}`;
    ctx.fillText(s.names[k], cx, h * 0.2);
    ctx.font = `700 ${h * 0.44}px ${FONT}`;
    ctx.fillStyle = '#fffaf4';
    ctx.fillText(String(s.score[k]), cx, h * 0.56);
    for (let i = 0; i < 5; i++) {
      const px = cx + (i - 2) * h * 0.11;
      ctx.beginPath();
      ctx.arc(px, h * 0.86, h * 0.035, 0, Math.PI * 2);
      ctx.fillStyle = i < s.score[k] ? s.colors[k] : 'rgba(255,255,255,0.18)';
      ctx.fill();
    }
  }
  ctx.fillStyle = '#ffd166';
  ctx.font = `700 ${h * 0.3}px ${FONT}`;
  ctx.fillText(':', w / 2, h * 0.53);
  ctx.fillStyle = 'rgba(255,250,244,0.7)';
  ctx.font = `600 ${h * 0.085}px ${FONT}`;
  ctx.fillText('FIRST TO 5', w / 2, h * 0.86);
}

export function buildHall(ctx, { guard, names, colors }) {
  const { scene } = ctx;
  const group = new THREE.Group();
  scene.add(group);
  const dynamic = [];

  // Floor and walls
  const floor = mesh(new THREE.PlaneGeometry(34, 18), new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.7 }), { cast: false });
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = 2.5;
  scene.add(floor);
  const wall = rbox(34, 7.5, 0.3, '#fbe6d6', 0.05);
  at(wall, 0, 3.75, WALL_Z - 0.15);
  const wains = rbox(34, 1.25, 0.12, '#f6c9cf', 0.04);
  at(wains, 0, 0.62, WALL_Z + 0.04);
  const rail = rbox(34, 0.1, 0.18, '#fffaf4', 0.03);
  at(rail, 0, 1.28, WALL_Z + 0.08);
  const skirting = rbox(34, 0.16, 0.16, '#fffaf4', 0.03);
  at(skirting, 0, 0.08, WALL_Z + 0.12);
  group.add(wall, wains, rail, skirting);
  for (const side of [1, -1]) {
    const sw = rbox(0.3, 7.5, 18, '#fde2cf', 0.05);
    at(sw, side * 17, 3.75, 3.4);
    group.add(sw);
  }
  // Ceiling beams peeking at the top
  for (let x = -15; x <= 15; x += 5) {
    const beam = rbox(0.35, 0.35, 4, '#d9a679', 0.05);
    at(beam, x, 7.0, WALL_Z + 2);
    group.add(beam);
  }

  // Windows and their glow
  // The glowing panes share one material, so they merge into one mesh of their own
  const glows = [];
  for (const x of [-11.5, -6.8, 6.8, 11.5]) glows.push(...windowPiece(group, x, 3.3, 2.0, 2.4));
  const paneGeos = glows.map((o) => {
    o.updateMatrix();
    const pg = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrix);
    for (const name of Object.keys(pg.attributes)) if (name !== 'position' && name !== 'normal') pg.deleteAttribute(name);
    o.removeFromParent();
    return pg;
  });
  const panes = mesh(mergeGeometries(paneGeos, false), glows[0].material, { cast: false });
  for (const pg of paneGeos) pg.dispose();
  group.add(panes);
  dynamic.push(panes);

  // Scoreboard with score lamps
  const boardState = { names, colors, score: [0, 0] };
  const boardTex = canvasTexture(1024, 440, (c, w, h) => drawBoard(c, w, h, boardState));
  const boardMat = new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.6, emissive: '#ffffff', emissiveMap: boardTex, emissiveIntensity: 0.35 });
  const board = mesh(new THREE.PlaneGeometry(4.0, 1.72), boardMat, { cast: false });
  at(board, 0, 3.5, WALL_Z + 0.3);
  const boardBack = rbox(4.3, 2.0, 0.22, '#fffaf4', 0.08);
  at(boardBack, 0, 3.5, WALL_Z + 0.16);
  group.add(boardBack, board);
  dynamic.push(board);
  const lamps = colors.map((c, k) => {
    const m = umat(c, { rough: 0.3, emissive: c, ei: 0.08 });
    const lamp = mesh(new THREE.SphereGeometry(0.34, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), m);
    lamp.rotation.x = Math.PI / 2;
    at(lamp, (k ? 1 : -1) * 2.7, 3.5, WALL_Z + 0.12);
    const ringL = mesh(new THREE.TorusGeometry(0.35, 0.05, 6, 20), mat('#fffaf4'));
    at(ringL, (k ? 1 : -1) * 2.7, 3.5, WALL_Z + 0.14);
    group.add(lamp, ringL);
    dynamic.push(lamp);
    return { m, color: new THREE.Color(c), on: 0 };
  });
  const sign = painted(4.6, 0.8, 120, bannerDraw('Roji World Fencing Club', { bg: '#3fb6a8' }));
  at(sign, 0, 5.05, WALL_Z + 0.2);
  group.add(sign);
  dynamic.push(sign);

  // Hanging banners with crossed foils
  for (const [x, c] of [[-3.9, '#ef5b6f'], [3.9, '#6fb8ff'], [-9.2, '#ffd166'], [9.2, '#7fd3a7']]) {
    const tex = canvasTexture(128, 320, (g, w, h) => {
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(w, 0);
      g.lineTo(w, h);
      g.lineTo(w / 2, h * 0.84);
      g.lineTo(0, h);
      g.closePath();
      g.fill();
      g.strokeStyle = '#fffaf4';
      g.lineWidth = 7;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(w * 0.25, h * 0.25);
      g.lineTo(w * 0.75, h * 0.62);
      g.moveTo(w * 0.75, h * 0.25);
      g.lineTo(w * 0.25, h * 0.62);
      g.stroke();
      g.fillStyle = '#fffaf4';
      for (const [px, py] of [[0.25, 0.25], [0.75, 0.25]]) {
        g.beginPath();
        g.arc(w * px, h * py, 9, 0, Math.PI * 2);
        g.fill();
      }
      g.fillRect(w * 0.1, h * 0.05, w * 0.8, 6);
    });
    const ban = mesh(new THREE.PlaneGeometry(0.85, 2.1), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, roughness: 0.8, side: THREE.DoubleSide }), { cast: false });
    at(ban, x, 5.1, WALL_Z + 0.22);
    const rod = cyl(0.03, 0.03, 1.05, '#d9a679', 6);
    rod.rotation.z = Math.PI / 2;
    at(rod, x, 6.17, WALL_Z + 0.24);
    group.add(ban, rod);
    dynamic.push(ban);
  }
  bunting(group, new THREE.Vector3(-16, 6.4, WALL_Z + 0.4), new THREE.Vector3(0, 6.3, WALL_Z + 0.4), { n: 18, sag: 0.6, size: 0.34 });
  bunting(group, new THREE.Vector3(0, 6.3, WALL_Z + 0.4), new THREE.Vector3(16, 6.4, WALL_Z + 0.4), { n: 18, sag: 0.6, size: 0.34 });

  // Bleachers behind the piste
  const tops = ['#bfe6dc', '#f9c6cf'];
  for (let k = 0; k < 2; k++) {
    const h = 0.42 * (k + 1);
    const t = rbox(20, h, 0.9, '#fff3df', 0.05);
    at(t, 0, h / 2, WALL_Z + 1.0 + (1 - k) * 0.9);
    const top = rbox(20.05, 0.07, 0.92, tops[k], 0.03);
    at(top, 0, h + 0.02, WALL_Z + 1.0 + (1 - k) * 0.9);
    group.add(t, top);
  }

  // The piste
  const piste = mesh(new THREE.BoxGeometry(PISTE_HALF * 2, 0.05, 1.8), mat('#a9bdd1', { rough: 0.5 }));
  at(piste, 0, 0.025, 0);
  const pisteTop = mesh(new THREE.PlaneGeometry(PISTE_HALF * 2, 1.8), new THREE.MeshStandardMaterial({ map: pisteTexture(guard), roughness: 0.45, metalness: 0.1 }), { cast: false });
  pisteTop.rotation.x = -Math.PI / 2;
  pisteTop.position.y = 0.052;
  group.add(piste, pisteTop);
  dynamic.push(pisteTop);
  // Reels and floor lamps at both ends
  const floorLamps = [];
  colors.forEach((c, k) => {
    const side = k ? 1 : -1;
    const x = side * (PISTE_HALF + 0.7);
    const reel = rbox(0.5, 0.36, 0.4, '#3d3862', 0.06);
    at(reel, x, 0.18, -0.4);
    const drum = cyl(0.14, 0.14, 0.44, '#fffaf4', 14);
    drum.rotation.x = Math.PI / 2;
    at(drum, x, 0.3, -0.4);
    const post = cyl(0.05, 0.06, 1.0, '#fffaf4', 8);
    at(post, x, 0.5, 0.5);
    const base = cyl(0.2, 0.24, 0.08, '#fffaf4', 14);
    at(base, x, 0.04, 0.5);
    const m = umat(c, { rough: 0.3, emissive: c, ei: 0.08 });
    const dome = mesh(new THREE.SphereGeometry(0.17, 16, 10), m);
    at(dome, x, 1.08, 0.5);
    group.add(reel, drum, post, base, dome);
    dynamic.push(dome);
    floorLamps.push({ m, color: new THREE.Color(c) });
  });

  // Kit rack with foils and masks on the left, a bench with water on the right
  const rack = rbox(2.2, 1.5, 0.12, '#d9a679', 0.04);
  at(rack, -14.2, 1.9, WALL_Z + 0.12);
  group.add(rack);
  for (let k = 0; k < 5; k++) {
    const blade = cyl(0.008, 0.008, 1.0, '#d8dde6', 5, { metal: 0.6, rough: 0.3 });
    blade.rotation.z = 0.08;
    at(blade, -15 + k * 0.4, 1.85, WALL_Z + 0.24);
    const bell = ball(0.06, '#d8dde6', { metal: 0.6, rough: 0.3 }, 10);
    at(bell, -15 + k * 0.4 + 0.04, 2.38, WALL_Z + 0.24);
    group.add(blade, bell);
  }
  for (let k = 0; k < 3; k++) {
    const m = ball(0.2, '#3a3a44', { rough: 0.5 }, 12);
    m.scale.set(1, 1.1, 0.8);
    at(m, -13.9 + k * 0.5, 1.4, WALL_Z + 0.3);
    const bib = cyl(0.14, 0.14, 0.08, '#fffaf4', 12);
    at(bib, -13.9 + k * 0.5, 1.18, WALL_Z + 0.3);
    group.add(m, bib);
  }
  const bench = rbox(2.4, 0.12, 0.5, '#c98a5a', 0.04);
  at(bench, 12.5, 0.45, -2.4);
  group.add(bench);
  for (const x of [11.6, 13.4]) group.add(at(rbox(0.12, 0.45, 0.45, '#a8764a', 0.03), x, 0.22, -2.4));
  for (const [x, c] of [[11.9, '#6fb8ff'], [12.2, '#ff9eb5'], [12.5, '#7fd3a7']]) {
    group.add(at(cyl(0.06, 0.06, 0.24, c, 10, { rough: 0.3 }), x, 0.63, -2.35));
    group.add(at(cyl(0.035, 0.035, 0.05, '#fffaf4', 8), x, 0.77, -2.35));
  }
  const towel = rbox(0.55, 0.06, 0.4, '#ffd166', 0.03);
  at(towel, 13.1, 0.54, -2.4);
  group.add(towel);
  // Trophy shelf
  const shelf = rbox(2.0, 0.1, 0.36, '#fffaf4', 0.03);
  at(shelf, 14.2, 2.1, WALL_Z + 0.25);
  group.add(shelf);
  for (const [x, s] of [[13.5, 1], [14.2, 1.3], [14.9, 0.9]]) {
    const cup = new THREE.Group();
    const bowl = mesh(new THREE.LatheGeometry([[0, 0], [0.1, 0.02], [0.14, 0.18], [0.12, 0.2]].map(([a, b]) => new THREE.Vector2(a, b)), 14), mat('#f4c24f', { metal: 0.6, rough: 0.3 }));
    bowl.position.y = 0.16;
    const stem = cyl(0.025, 0.04, 0.14, '#f4c24f', 8, { metal: 0.6, rough: 0.3 });
    stem.position.y = 0.09;
    const foot = cyl(0.08, 0.09, 0.04, '#f4c24f', 10, { metal: 0.6, rough: 0.3 });
    foot.position.y = 0.02;
    cup.add(bowl, stem, foot);
    cup.scale.setScalar(s);
    at(cup, x, 2.15, WALL_Z + 0.25);
    group.add(cup);
  }
  // Big potted plants in the corners
  for (const x of [-16, 16, -8.6, 8.6]) {
    const pot = cyl(0.35, 0.28, 0.6, '#f08a5d', 14);
    at(pot, x, 0.3, WALL_Z + 0.9);
    const rim = cyl(0.38, 0.38, 0.08, '#fffaf4', 14);
    at(rim, x, 0.6, WALL_Z + 0.9);
    group.add(pot, rim);
    for (const [dx, dy, s] of [[0, 1.0, 0.45], [0.25, 1.35, 0.32], [-0.2, 1.4, 0.3]]) group.add(at(ball(s, '#5aa84f', { flat: true }, 10), x + dx, dy, WALL_Z + 0.9));
  }

  // Fans on the bleachers
  const r = rng(12);
  const fans = [];
  const kinds = ['cheer', 'clap', 'wave', 'flag', 'clap'];
  const spots = [[-8.6, 0], [-6.4, 0], [-4.4, 1], [-2.6, 0], [2.4, 0], [4.1, 1], [6.2, 0], [8.4, 1], [-7.6, 1], [7.4, 1], [0.1, 1]];
  spots.forEach(([x, k], i) => {
    const kid = ctx.makeKid(randomLook(r, i + 3));
    kid.root.position.set(x + (r() - 0.5) * 0.5, 0.42 * (2 - k) + 0.04, WALL_Z + 1.0 + k * 0.9 - 0.05);
    kid.root.rotation.y = (r() - 0.5) * 0.3;
    poseFan(kid, kinds[i % kinds.length], colors[i % 2]);
    fans.push({ kid });
  });
  const crowd = makeCrowd(fans);
  scene.add(crowd.mesh);

  bakeVC(group, dynamic);

  return {
    group,
    crowd,
    setScore(a, b) {
      boardState.score = [a, b];
      const c = boardTex.image.getContext('2d');
      drawBoard(c, boardTex.image.width, boardTex.image.height, boardState);
      boardTex.needsUpdate = true;
    },
    // Light the lamps of the scorer (0 or 1), or both for a double touch.
    light(which) {
      for (let k = 0; k < 2; k++) if (which === k || which === 'both') lamps[k].on = 1.6;
    },
    update(dt, t) {
      crowd.update(dt, t);
      for (let k = 0; k < 2; k++) {
        const L = lamps[k];
        L.on = Math.max(0, L.on - dt);
        const pulse = L.on > 0 ? 1.6 + Math.sin(t * 18) * 0.4 : 0.08;
        L.m.emissiveIntensity = pulse;
        floorLamps[k].m.emissiveIntensity = pulse;
      }
    },
  };
}
