import { THREE, P, inst, bulbs, garland, wire, heartPath, fitText, roundRect, drawStar, glassMat, toGeo, vcMat } from './parts.js';
import { canvasTexture, mat, umat, mesh } from '../../util.js';

// The fairytale castle at the back of Roji Land: towers with pink and lilac roofs, waving flags,
// glowing windows and a rose window with a heart in it, a moat with a stone bridge, and on the
// bridge rail a cluster of love locks, one of them a heart engraved R + H.

export const CASTLE = { z: -23.4, moat: { x: 0, z: -18.6, hw: 9, hd: 1.0 }, bridge: { hw: 1.45 } };

export function buildCastle(ctx, k, atlas) {
  const root = new THREE.Group();
  const dynamic = [];
  const colliders = [];
  const Z = CASTLE.z;
  const wallC = '#fff1e4';
  const trim = '#ffd1dc';
  const roofA = P.rose;
  const roofB = P.lilac;

  // Stone texture for the walls (one material)
  const stoneTex = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#fff3e8';
    c.fillRect(0, 0, w, h);
    const rows = 8;
    for (let j = 0; j < rows; j++) {
      const off = j % 2 ? 32 : 0;
      for (let i = -1; i < 5; i++) {
        c.fillStyle = ['#fff6ee', '#fdeee2', '#fff0e6', '#fbe8dc'][(i + j * 3 + 8) % 4];
        roundRect(c, i * 64 + off + 3, j * 32 + 3, 58, 26, 7);
        c.fill();
      }
    }
  });
  stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;
  const wallMat = umat('#ffffff', { map: stoneTex, rough: 0.85 });
  const uvBox = (w, h, d, sx = w / 2.4, sy = h / 2.4) => {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
    return g;
  };
  const uvCyl = (r, h, seg = 20) => {
    const g = new THREE.CylinderGeometry(r, r, h, seg, 1, true);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ((Math.PI * 2 * r) / 2.4), uv.getY(i) * (h / 2.4));
    return g;
  };
  const wallBox = (w, h, d, x, y, z) => {
    const m = mesh(uvBox(w, h, d), wallMat);
    m.position.set(x, y, z);
    root.add(m);
    return m;
  };

  // Plinth
  root.add(k.at(k.box(16.4, 0.4, 6.6, P.stoneDark), 0, 0.2, Z - 0.2));
  // Curtain wall and the keep
  wallBox(12, 4.6, 4.6, 0, 2.7, Z);
  wallBox(5, 9.2, 4, 0, 4.8, Z - 0.6);
  // Battlements along the curtain wall front and the keep
  const merlon = (x, y, z, s = 1) => root.add(k.at(k.box(0.42 * s, 0.42 * s, 0.42 * s, wallC), x, y, z));
  for (let x = -5.6; x <= 5.61; x += 0.8) merlon(x, 5.2, Z + 2.1);
  for (let x = -2.3; x <= 2.31; x += 0.66) merlon(x, 9.6, Z + 1.2, 0.9);
  root.add(k.at(k.box(12.1, 0.16, 4.7, trim), 0, 5.02, Z));
  root.add(k.at(k.box(5.1, 0.16, 4.1, trim), 0, 9.42, Z - 0.6));

  // Towers: [x, z, radius, height, roof colour, roof height]
  const TOWERS = [
    [-6.3, Z + 2.0, 1.25, 7.0, roofA, 3.4],
    [6.3, Z + 2.0, 1.25, 7.0, roofA, 3.4],
    [-6.3, Z - 2.0, 1.15, 6.2, roofB, 3.0],
    [6.3, Z - 2.0, 1.15, 6.2, roofB, 3.0],
    [-3.1, Z - 0.3, 0.95, 10.6, roofB, 3.6],
    [3.1, Z - 0.3, 0.95, 10.6, roofB, 3.6],
    [0, Z - 0.8, 1.25, 12.2, roofA, 5.0],
  ];
  const flagSpots = [];
  const lightPts = [];
  for (const [x, z, r, h, roof, rh] of TOWERS) {
    const t = mesh(uvCyl(r, h, 16), wallMat);
    t.position.set(x, h / 2, z);
    root.add(t);
    root.add(k.at(k.cyl(r, r, 0.05, wallC, 16), x, h, z));
    root.add(k.at(k.cyl(r + 0.12, r + 0.12, 0.22, trim, 16), x, h - 0.1, z));
    root.add(k.at(k.cyl(r + 0.08, r + 0.12, 0.2, trim, 16), x, 0.5, z));
    root.add(k.at(k.cone(r + 0.28, rh, roof, 16), x, h + rh / 2, z));
    root.add(k.at(k.cyl(r + 0.3, r + 0.3, 0.1, P.gold, 16), x, h + 0.02, z));
    root.add(k.at(k.sph(0.13, P.gold), x, h + rh + 0.05, z));
    flagSpots.push([x, h + rh + 0.1, z, roof === roofA ? P.sky : P.pink]);
    // lights round the roof's rim
    const n = Math.round((r + 0.3) * 7);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      lightPts.push(new THREE.Vector3(x + Math.cos(a) * (r + 0.32), h + 0.1, z + Math.sin(a) * (r + 0.32)));
    }
  }

  // Arched windows that glow at night
  const winMat = glassMat('#ffe9b8', '#ffc56b', 0.3);
  const arch = new THREE.Shape();
  arch.moveTo(-0.3, -0.45);
  arch.lineTo(0.3, -0.45);
  arch.lineTo(0.3, 0.15);
  arch.absarc(0, 0.15, 0.3, 0, Math.PI, false);
  arch.closePath();
  const winGeo = new THREE.ShapeGeometry(arch, 8);
  const frameGeo = new THREE.ShapeGeometry(arch, 8);
  frameGeo.scale(1.25, 1.18, 1);
  const wins = [];
  const addWin = (x, y, z, ry = 0, s = 1) => wins.push({ x, y, z, ry, s });
  for (const [x, z, r, h] of TOWERS) {
    const front = z > Z - 1 ? 1 : 0.7;
    for (let y = 2.6; y < h - 1; y += 2.7) addWin(x, y, z + r * front + 0.02, 0, 0.8);
  }
  for (const x of [-4.4, -2.0, 2.0, 4.4]) addWin(x, 3.4, Z + 2.32, 0, 1.1);
  addWin(-1.4, 6.8, Z + 1.42, 0, 1);
  addWin(1.4, 6.8, Z + 1.42, 0, 1);
  const winMesh = inst(winGeo, winMat, wins.length, { cast: false });
  const frameMesh = inst(frameGeo, mat(P.rose, { rough: 0.6 }), wins.length, { cast: false });
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();
  wins.forEach((w, i) => {
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, w.ry);
    winMesh.setMatrixAt(i, m4.compose(v.set(w.x, w.y, w.z + 0.012), q, sc.setScalar(w.s)));
    frameMesh.setMatrixAt(i, m4.compose(v.set(w.x, w.y, w.z), q, sc.setScalar(w.s)));
  });
  root.add(frameMesh, winMesh);
  dynamic.push(frameMesh, winMesh);

  // The rose window on the keep: stained glass with a heart in the middle
  const roseTex = canvasTexture(256, 256, (c, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    c.fillStyle = '#7a4a8a';
    c.beginPath();
    c.arc(cx, cy, 126, 0, Math.PI * 2);
    c.fill();
    const cols = ['#ff9eb5', '#8fd3ff', '#ffd166', '#c7a6ff', '#7fd8bf', '#ffb38a'];
    for (let i = 0; i < 12; i++) {
      c.fillStyle = cols[i % cols.length];
      c.beginPath();
      c.moveTo(cx, cy);
      c.arc(cx, cy, 112, (i / 12) * Math.PI * 2 + 0.04, ((i + 1) / 12) * Math.PI * 2 - 0.04);
      c.closePath();
      c.fill();
    }
    c.fillStyle = '#7a4a8a';
    c.beginPath();
    c.arc(cx, cy, 52, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fff0f4';
    c.beginPath();
    c.arc(cx, cy, 46, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ef3b5f';
    heartPath(c, cx, cy + 3, 62);
    c.fill();
  });
  const roseMat = umat('#ffffff', { map: roseTex, emissive: '#ffffff', ei: 0.35, rough: 0.4 });
  roseMat.emissiveMap = roseTex;
  const rose = mesh(new THREE.CircleGeometry(0.95, 28), roseMat, { cast: false });
  rose.position.set(0, 8.1, Z + 1.42);
  root.add(rose);
  root.add(k.at(k.rot(k.tor(0.98, 0.08, P.gold, Math.PI * 2, undefined, 28, 6), 0, 0, 0), 0, 8.1, Z + 1.44));

  // Gatehouse with the big arched door
  wallBox(4.4, 6.2, 1.4, 0, 3.1, Z + 2.6);
  for (let x = -1.9; x <= 1.91; x += 0.76) merlon(x, 6.4, Z + 3.1);
  root.add(k.at(k.box(4.5, 0.16, 1.5, trim), 0, 6.22, Z + 2.6));
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-1.0, 0);
  doorShape.lineTo(1.0, 0);
  doorShape.lineTo(1.0, 1.8);
  doorShape.absarc(0, 1.8, 1.0, 0, Math.PI, false);
  doorShape.closePath();
  const doorFrame = mesh(new THREE.ShapeGeometry(doorShape, 12), mat(P.rose, { rough: 0.6 }), { cast: false });
  doorFrame.scale.set(1.16, 1.07, 1);
  doorFrame.position.set(0, 0.4, Z + 3.31);
  root.add(doorFrame);
  const doorTex = canvasTexture(256, 384, (c, w, h) => {
    c.fillStyle = '#a0602e';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      c.fillStyle = i % 2 ? '#94582a' : '#a96a36';
      c.fillRect(i * (w / 6), 0, w / 6 - 3, h);
    }
    c.fillStyle = '#5a3a2a';
    for (const y of [h * 0.35, h * 0.78]) c.fillRect(0, y, w, 12);
    c.fillStyle = '#ffd166';
    c.beginPath();
    c.arc(w * 0.58, h * 0.6, 12, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ff9eb5';
    heartPath(c, w / 2, h * 0.2, 46);
    c.fill();
  });
  const door = mesh(new THREE.ShapeGeometry(doorShape, 12), umat('#ffffff', { map: doorTex, rough: 0.8 }), { cast: false });
  {
    const uv = door.geometry.attributes.uv;
    const pos = door.geometry.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 1) / 2, pos.getY(i) / 2.8);
  }
  door.position.set(0, 0.4, Z + 3.33);
  root.add(door);
  // Balcony above the door
  root.add(k.at(k.box(2.4, 0.16, 0.7, trim), 0, 4.3, Z + 3.6));
  for (let x = -1.1; x <= 1.11; x += 0.275) root.add(k.at(k.cyl(0.03, 0.03, 0.45, P.cream, 6), x, 4.6, Z + 3.9));
  root.add(k.at(k.box(2.4, 0.06, 0.08, P.cream), 0, 4.85, Z + 3.92));
  addLightRow(lightPts, -2.1, 2.1, 6.75, Z + 3.32, 10);
  addLightRow(lightPts, -5.9, 5.9, 5.55, Z + 2.32, 26);

  // A crest of hearts and stars above the door
  const crest = atlas.panel(1.6, 0.6, 320, 120, (c, w, h) => {
    c.fillStyle = '#ffd166';
    roundRect(c, 4, 4, w - 8, h - 8, 40);
    c.fill();
    c.fillStyle = '#ef5b6f';
    heartPath(c, w / 2, h / 2 + 2, 70);
    c.fill();
    c.fillStyle = '#ffffff';
    for (const x of [60, w - 60]) {
      drawStar(c, x, h / 2, 24);
      c.fill();
    }
  });
  crest.position.set(0, 5.4, Z + 3.33);
  root.add(crest);

  // Garden walls running from the corner towers to the side fence
  for (const s of [-1, 1]) {
    wallBox(8.6, 1.6, 0.7, s * 11.9, 0.8, Z + 1.2);
    for (let x = 8; x <= 16.1; x += 0.8) merlon(s * x, 1.8, Z + 1.2, 0.8);
  }

  // Flags (one instanced mesh, they wave)
  const flagGeo = new THREE.PlaneGeometry(0.9, 0.5, 4, 1);
  flagGeo.translate(0.45, 0.25, 0);
  const flagMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, side: THREE.DoubleSide });
  const flags = inst(flagGeo, flagMat, flagSpots.length, { cast: false, colors: flagSpots.map((f) => f[3]) });
  const poleGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.0, 5);
  poleGeo.translate(0, 0.5, 0);
  const poles = inst(poleGeo, mat(P.ink), flagSpots.length, { cast: false });
  flagSpots.forEach(([x, y, z], i) => poles.setMatrixAt(i, m4.makeTranslation(x, y, z)));
  root.add(flags, poles);
  dynamic.push(flags, poles);

  // Lights round the roofs and along the battlements
  const castleBulbs = bulbs(lightPts, { r: 0.065, colors: ['#fff3c4', '#ffd1dc', '#fff3c4', '#c7e9ff'] });
  root.add(castleBulbs);
  dynamic.push(castleBulbs);

  // ------------------------------------------------ the moat and the bridge
  const M = CASTLE.moat;
  const BH = CASTLE.bridge.hw;
  const moat = new THREE.Group();
  moat.position.set(M.x, 0, M.z);
  root.add(moat);
  moat.add(k.at(k.box(M.hw * 2, 0.1, M.hd * 2, '#5fb2b8'), 0, -0.95, 0));
  for (const s of [-1, 1]) {
    moat.add(k.at(k.box(M.hw * 2 + 0.2, 0.95, 0.1, P.stoneDark), 0, -0.47, s * (M.hd + 0.05)));
    moat.add(k.at(k.box(0.1, 0.95, M.hd * 2, P.stoneDark), s * (M.hw + 0.05), -0.47, 0));
  }
  const waterMat = new THREE.MeshStandardMaterial({ color: '#7fd3e0', roughness: 0.15, transparent: true, opacity: 0.82 });
  const water = mesh(new THREE.PlaneGeometry(M.hw * 2, M.hd * 2, 1, 1), waterMat, { cast: false });
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.32;
  moat.add(water);
  dynamic.push(water);
  // Lily pads and a little duck (it paddles to and fro)
  for (const [x, z, s] of [[-6.5, -0.3, 1], [-5.6, 0.35, 0.8], [5.2, 0.2, 1.1], [6.8, -0.35, 0.7], [-3.4, 0.4, 0.7]]) {
    const pad = k.cyl(0.32 * s, 0.32 * s, 0.03, '#6cc24a', 12);
    pad.position.set(x, -0.3, z);
    moat.add(pad);
    if (s > 0.95) moat.add(k.at(k.sph(0.07, '#ff9eb5', undefined, 8), x + 0.08, -0.25, z));
  }
  const duck = new THREE.Group();
  duck.add(k.at(k.sph(0.16, P.sun, undefined, 12), 0, 0.06, 0));
  duck.add(k.at(k.sph(0.1, P.sun, undefined, 10), 0, 0.2, 0.12));
  duck.add(k.at(k.rot(k.cone(0.045, 0.1, '#ff9a3c', 8), Math.PI / 2, 0, 0), 0, 0.19, 0.24));
  for (const s of [-1, 1]) duck.add(k.at(k.sph(0.018, P.ink, undefined, 6), s * 0.055, 0.24, 0.2));
  duck.children[0].scale.set(1, 0.75, 1.25);
  duck.position.set(-2, -0.32, 0);
  moat.add(duck);
  dynamic.push(duck);
  // Rim stones round the moat (low walls you cannot walk through), open at the bridge
  for (const s of [-1, 1]) {
    for (const [x0, x1] of [[-M.hw - 0.15, -BH], [BH, M.hw + 0.15]]) {
      const w = x1 - x0;
      moat.add(k.at(k.rbox(w, 0.28, 0.28, P.stone, 0.06), (x0 + x1) / 2, 0.14, s * (M.hd + 0.14)));
      colliders.push({ type: 'box', x: M.x + (x0 + x1) / 2, z: M.z + s * (M.hd + 0.14), hw: w / 2, hd: 0.16 });
    }
    moat.add(k.at(k.rbox(0.28, 0.28, M.hd * 2 + 0.56, P.stone, 0.06), s * (M.hw + 0.15), 0.14, 0));
  }
  for (const s of [-1, 1]) colliders.push({ type: 'box', x: M.x + s * (M.hw + 0.15), z: M.z, hw: 0.16, hd: M.hd + 0.3 });

  // The bridge: an arched stone deck with rails, walkable
  const deckLen = M.hd * 2 + 0.9;
  const bridge = new THREE.Group();
  bridge.position.set(0, 0, M.z);
  root.add(bridge);
  bridge.add(k.at(k.box(BH * 2, 0.16, deckLen, P.stoneDark), 0, 0.18, 0));
  const archS = new THREE.Shape();
  archS.moveTo(-deckLen / 2, 0.1);
  archS.lineTo(deckLen / 2, 0.1);
  archS.lineTo(deckLen / 2, -0.9);
  archS.quadraticCurveTo(0, 0.1, -deckLen / 2, -0.9);
  archS.closePath();
  const archG = new THREE.ExtrudeGeometry(archS, { depth: 0.18, bevelEnabled: false, curveSegments: 10 });
  for (const s of [-1, 1]) {
    const side = mesh(archG, mat(P.stone, { rough: 0.85 }));
    side.rotation.y = Math.PI / 2;
    side.position.set(s * (BH - 0.09) - 0.09, 0, 0);
    bridge.add(side);
    // rail posts with pink caps and a rail
    for (let i = 0; i <= 4; i++) {
      const z = -deckLen / 2 + (i * deckLen) / 4;
      bridge.add(k.at(k.box(0.2, 0.75, 0.2, P.stone), s * BH, 0.6, z));
      bridge.add(k.at(k.sph(0.12, P.pink, undefined, 10), s * BH, 1.02, z));
    }
    bridge.add(k.at(k.box(0.1, 0.08, deckLen, P.cream), s * BH, 0.86, 0));
    colliders.push({ type: 'box', x: s * BH, z: M.z, hw: 0.12, hd: deckLen / 2 });
  }
  colliders.push({ type: 'box', x: 0, z: M.z, hw: BH - 0.12, hd: deckLen / 2, h: 0.26 });

  // Love locks on the right rail: little padlocks in many colours, and one heart engraved R + H
  const lockG = new THREE.Group();
  lockG.add(k.at(k.box(0.1, 0.08, 0.04, '#ffffff'), 0, 0, 0));
  lockG.add(k.at(k.rot(k.tor(0.032, 0.008, '#ffffff', Math.PI, undefined, 8, 4), 0, 0, 0), 0, 0.04, 0));
  const lockGeo = toGeo(lockG);
  const LOCKS = [];
  for (let i = 0; i < 11; i++) LOCKS.push([BH + 0.06, 0.78 - (i % 3) * 0.08, -deckLen / 2 + 0.35 + i * 0.19]);
  const lockMesh = inst(lockGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.5 }), LOCKS.length, {
    cast: false,
    colors: ['#ffd166', '#ef5b6f', '#8fd3ff', '#c7a6ff', '#7fd8bf', '#d3dbe5', '#ff9eb5'],
  });
  LOCKS.forEach(([x, y, z], i) => lockMesh.setMatrixAt(i, m4.compose(v.set(x, y, z), q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.PI / 2), sc.setScalar(1))));
  bridge.add(lockMesh);
  dynamic.push(lockMesh);
  const heartLock = k.heart(0.2, 0.05, P.gold, { rough: 0.3, metal: 0.6 });
  heartLock.position.set(BH + 0.07, 0.7, 0.05);
  heartLock.rotation.y = Math.PI / 2;
  bridge.add(heartLock);
  bridge.add(k.at(k.rot(k.tor(0.055, 0.011, P.steel, Math.PI, undefined, 8, 4), 0, Math.PI / 2, 0), BH + 0.07, 0.8, 0.05));
  const engrave = atlas.panel(0.15, 0.1, 96, 64, (c, w, h) => {
    c.fillStyle = '#f4c24f';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#7a4a12';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'R + H', w / 2, h / 2 + 2, w * 0.9, 34);
  });
  engrave.position.set(BH + 0.105, 0.7, 0.05);
  engrave.rotation.y = Math.PI / 2;
  bridge.add(engrave);

  // Castle footprint colliders: curtain wall, keep, towers, gatehouse, garden walls
  colliders.push({ type: 'box', x: 0, z: Z - 0.2, hw: 8.3, hd: 3.3 });
  colliders.push({ type: 'box', x: 0, z: Z + 2.65, hw: 2.25, hd: 0.75 });
  for (const [x, z, r] of TOWERS) colliders.push({ type: 'circle', x, z, r: r + 0.15 });
  for (const s of [-1, 1]) colliders.push({ type: 'box', x: s * 11.9, z: Z + 1.2, hw: 4.3, hd: 0.4 });

  const flagM = new THREE.Matrix4();
  return {
    root,
    dynamic,
    colliders,
    bulbs: castleBulbs,
    door: { x: 0, z: Z + 3.7 },
    lockSpot: { x: BH - 0.45, z: M.z + 0.05 },
    update(dt, t) {
      flagSpots.forEach(([x, y, z], i) => {
        q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.PI * 0.5 + Math.sin(t * 2.2 + i) * 0.35);
        flags.setMatrixAt(i, flagM.compose(v.set(x, y + 0.75, z), q, sc.set(1, 1, 1)));
      });
      flags.instanceMatrix.needsUpdate = true;
      duck.position.x = Math.sin(t * 0.18) * 6.5;
      duck.rotation.y = Math.cos(t * 0.18) > 0 ? Math.PI / 2 : -Math.PI / 2;
      duck.position.y = -0.32 + Math.sin(t * 2.4) * 0.01;
      water.position.y = -0.32 + Math.sin(t * 0.9) * 0.006;
    },
  };
}

function addLightRow(list, x0, x1, y, z, n) {
  for (let i = 0; i <= n; i++) list.push(new THREE.Vector3(x0 + ((x1 - x0) * i) / n, y, z));
}
