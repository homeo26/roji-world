import { THREE, P, at, box, rbox, cyl, mat, mesh, canvasTexture, roundRect, FONT, fitText, heartPath, heartShape, glowTexture } from './kit.js';
import { FLOOR, STAGE } from './layout.js';

// The little stage behind the floor: a bandshell with a neon heart, the DJ booth with two spinning
// records, a laptop and a song request, big speakers that thump, and two spotlights that sweep the floor.

export function buildStage(ctx) {
  const { g, col, atlas, bulbs, dyn, updaters } = ctx;
  const SX = STAGE.x;
  const H = STAGE.h;
  const zc = (STAGE.z0 + STAGE.z1) / 2;
  const depth = STAGE.z1 - STAGE.z0;

  // ------------------------------------------------ platform and step
  const boards = mat('#d39a68', { rough: 0.75 });
  g.add(at(rbox(STAGE.hw * 2, H, depth, boards, 0.05), SX, H / 2, zc));
  const line = mat('#b47d4e', { rough: 0.8 });
  for (let i = 1; i < 6; i++) g.add(at(box(STAGE.hw * 2 - 0.1, 0.006, 0.02, line), SX, H + 0.002, STAGE.z0 + (i * depth) / 6));
  g.add(at(rbox(1.6, 0.22, 0.46, boards, 0.04), SX, 0.11, STAGE.z1 + 0.23));
  col({ type: 'box', x: SX, z: zc, hw: STAGE.hw, hd: depth / 2, h: H });
  col({ type: 'box', x: SX, z: STAGE.z1 + 0.23, hw: 0.8, hd: 0.23, h: 0.22 });
  // Skirt with scallops and a promise
  const skirt = atlas.add(768, 64, (c, w, h) => {
    c.fillStyle = P.rose;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffc0d6';
    for (let x = 0; x < w; x += 48) {
      c.beginPath();
      c.arc(x + 24, 0, 22, 0, Math.PI);
      c.fill();
    }
    c.fillStyle = P.ivory;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    // Either side of the step
    fitText(c, 'Love songs', w * 0.14, h / 2 + 8, w * 0.24, 30);
    fitText(c, 'all night', w * 0.86, h / 2 + 8, w * 0.24, 30);
  });
  const sk = atlas.plane(skirt, STAGE.hw * 2 - 0.1, 0.36);
  at(sk, SX, 0.24, STAGE.z1 + 0.003);
  g.add(sk);

  // ------------------------------------------------ bandshell, painted in soft bands like a seashell
  const R = 2.95;
  const SZ = STAGE.z0 + 0.82;
  const shellGeo = new THREE.SphereGeometry(R, 28, 14, Math.PI, Math.PI, 0, Math.PI / 2);
  const inner = shellGeo.clone();
  const pos = inner.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const bands = ['#ffd3e0', '#ffe9d6', '#e7dcff', '#ffd3e0', '#fff2e0', '#d9f2ea'].map((c) => new THREE.Color(c));
  const cc = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const rho = Math.hypot(pos.getX(i), pos.getY(i)) / R;
    const b = Math.min(bands.length - 1, Math.floor(rho * bands.length));
    cc.copy(bands[b]);
    if (rho > 0.96) cc.set('#f6a5c0');
    colors.set([cc.r, cc.g, cc.b], i * 3);
  }
  inner.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  // Turned inside out, so the inside faces us and merges with the other matte surfaces
  const idx = inner.index.array;
  for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
  const nrm = inner.attributes.normal;
  for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, -nrm.getX(i), -nrm.getY(i), -nrm.getZ(i));
  const shellIn = mesh(inner, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }), { cast: false });
  shellIn.scale.z = 0.3;
  at(shellIn, SX, H, SZ);
  g.add(shellIn);
  const shellOut = mesh(shellGeo, mat(P.cream, { rough: 0.7 }));
  shellOut.scale.z = 0.3;
  at(shellOut, SX, H, SZ);
  g.add(shellOut);
  const rimPts = [];
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * Math.PI;
    rimPts.push(new THREE.Vector3(SX + Math.cos(a) * R, H + Math.sin(a) * R, SZ));
  }
  g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts), 48, 0.07, 8), mat(P.gold, { rough: 0.35, metal: 0.55 })));
  col({ type: 'box', x: SX, z: SZ - 0.45, hw: R, hd: 0.4 }); // the shell's curved back
  for (let i = 1; i < 22; i++) {
    const a = (i / 22) * Math.PI;
    bulbs.push({ p: new THREE.Vector3(SX + Math.cos(a) * (R + 0.02), H + Math.sin(a) * (R + 0.02), SZ + 0.08), base: new THREE.Color(i % 2 ? '#fff1c9' : '#ffb3cc'), set: 'shell', k: i / 22 });
  }
  // Neon heart
  const hs = heartShape(1.0).getPoints(40).map((p) => new THREE.Vector3(p.x, p.y, 0));
  const heart = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hs, true), 56, 0.035, 5, true), mat('#ff7fb0', { emissive: '#ff3d8b', ei: 1.0, rough: 0.4 }), { cast: false });
  at(heart, SX, H + 1.65, SZ - 0.62);
  g.add(heart);
  ctx.glows.push({ x: SX, y: H + 2.1, z: SZ - 0.55, color: '#ff5fa0', k: 0.9, big: true });

  // ------------------------------------------------ speakers
  const cab = mat('#3b2b3f', { rough: 0.6 });
  const ring = mat('#8b8199', { rough: 0.4, metal: 0.4 });
  const cones = [];
  for (const sx of [-2.38, 2.38]) {
    const x = SX + sx;
    const z = STAGE.z0 + 0.95;
    g.add(at(rbox(0.78, 1.5, 0.56, cab, 0.06), x, H + 0.75, z));
    for (const [y, r] of [[0.52, 0.24], [1.18, 0.13]]) {
      const rr = cyl(r + 0.04, r + 0.04, 0.03, ring, 20);
      rr.rotation.x = Math.PI / 2;
      at(rr, x, H + y, z + 0.285);
      g.add(rr);
      cones.push({ x, y: H + y, z: z + 0.3, r });
    }
    g.add(at(box(0.6, 0.04, 0.02, mat(P.pink, { emissive: P.pink, ei: 0.6 })), x, H + 1.42, z + 0.285));
    col({ type: 'box', x, z, hw: 0.39, hd: 0.28 });
  }
  const coneGeo = new THREE.CylinderGeometry(1, 0.55, 0.06, 20);
  coneGeo.rotateX(Math.PI / 2);
  const coneMesh = new THREE.InstancedMesh(coneGeo, mat('#1f1a28', { rough: 0.5 }), cones.length);
  coneMesh.frustumCulled = false;
  g.add(coneMesh);
  dyn.push(coneMesh);

  // ------------------------------------------------ the DJ booth
  const BZ = STAGE.z0 + 1.45;
  g.add(at(rbox(2.0, 0.9, 0.6, mat('#3b2b3f', { rough: 0.55 }), 0.05), SX, H + 0.45, BZ));
  g.add(at(rbox(2.1, 0.05, 0.68, mat(P.rose, { rough: 0.5 }), 0.02), SX, H + 0.92, BZ));
  col({ type: 'box', x: SX, z: BZ, hw: 1.02, hd: 0.32 });
  const silver = mat('#cfd3dc', { rough: 0.35, metal: 0.6 });
  const recTex = canvasTexture(128, 128, (c, w) => {
    c.fillStyle = '#171219';
    c.beginPath();
    c.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.08)';
    for (let r = 20; r < w / 2; r += 4) {
      c.beginPath();
      c.arc(w / 2, w / 2, r, 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = '#ff8fb1';
    c.beginPath();
    c.arc(w / 2, w / 2, 18, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    heartPath(c, w / 2, w / 2 + 4, 14);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(w / 2 + 22, w / 2 - 2, 30, 4); // a highlight so the spin shows
  });
  recTex.center.set(0.5, 0.5);
  const recMat = new THREE.MeshStandardMaterial({ map: recTex, roughness: 0.3, alphaTest: 0.5 });
  for (const dx of [-0.62, 0.62]) {
    g.add(at(rbox(0.56, 0.06, 0.48, silver, 0.02), SX + dx, H + 0.97, BZ));
    const rec = mesh(new THREE.CircleGeometry(0.2, 28), recMat, { cast: false });
    rec.rotation.x = -Math.PI / 2;
    at(rec, SX + dx - 0.04, H + 1.004, BZ);
    g.add(rec);
    const arm = box(0.02, 0.02, 0.26, silver);
    arm.rotation.y = 0.5;
    at(arm, SX + dx + 0.16, H + 1.03, BZ - 0.02);
    g.add(arm);
    g.add(at(cyl(0.03, 0.03, 0.04, silver, 8), SX + dx + 0.21, H + 1.02, BZ - 0.13));
  }
  g.add(at(rbox(0.42, 0.06, 0.4, mat('#2a2230', { rough: 0.5 }), 0.02), SX, H + 0.97, BZ));
  for (let i = 0; i < 6; i++) g.add(at(cyl(0.018, 0.018, 0.03, mat(i % 2 ? P.sun : P.sky, { emissive: i % 2 ? P.sun : P.sky, ei: 0.5 }), 8), SX - 0.12 + (i % 3) * 0.12, H + 1.01, BZ - 0.08 + Math.floor(i / 3) * 0.12));
  // The equaliser panel on the front; while they dance it says who the song is for
  const eqGeo = new THREE.PlaneGeometry(1.3, 0.49);
  eqGeo.translate(SX + 0.1, H + 0.47, BZ + 0.305);
  const bars = new Float32Array(16);
  let scroll = 0;
  ctx.screen.add({ x: 4, y: 136, w: 256, h: 96 }, eqGeo, (c, w, h, t, S) => {
    const punch = Math.exp(-(S.beat % 1) * 4);
    c.fillStyle = '#1b1530';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) {
      const target = S.dancing ? 0.25 + Math.random() * 0.75 * (0.6 + punch * 0.4) : 0.15 + 0.2 * (0.5 + 0.5 * Math.sin(t * 2 + i * 0.6));
      bars[i] += (target - bars[i]) * 0.6;
      const bh = Math.round(bars[i] * (h - 16));
      for (let y = 0; y < bh; y += 6) {
        const k = y / (h - 16);
        c.fillStyle = k > 0.75 ? '#ff5f9e' : k > 0.45 ? '#ffd166' : '#6fe3b8';
        c.fillRect(8 + i * 15, h - 8 - y - 4, 12, 4);
      }
    }
    if (S.dancing) {
      scroll = (scroll + 7) % 720;
      c.fillStyle = 'rgba(27,21,48,0.72)';
      c.fillRect(0, 26, w, 40);
      c.fillStyle = '#ffffff';
      c.textBaseline = 'middle';
      c.textAlign = 'left';
      c.font = `700 26px ${FONT}`;
      c.fillText('This song is for Roji, from Homama', w - scroll, 47);
    } else scroll = 0;
  });
  // A song request pinned to the booth
  const note = atlas.add(128, 128, (c, w, h) => {
    c.fillStyle = '#fff6a8';
    c.fillRect(6, 10, w - 12, h - 16);
    c.fillStyle = '#ef5b6f';
    c.beginPath();
    c.arc(w / 2, 14, 7, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#3b2b3f';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 17px ${FONT}`;
    c.fillText('Request:', w / 2, 40);
    c.fillText("Roji's song", w / 2, 62);
    c.fillText('Love, H', w / 2, 86);
    c.fillStyle = '#ef5b6f';
    heartPath(c, w / 2, 108, 10);
    c.fill();
  });
  const noteM = atlas.plane(note, 0.27, 0.27);
  at(noteM, SX - 0.8, H + 0.55, BZ + 0.306);
  noteM.rotation.z = 0.08;
  g.add(noteM);
  // A laptop on a little stand, its lid towards us with a sticker
  const LX = SX + 1.38;
  const LZ = BZ - 0.2;
  g.add(at(cyl(0.05, 0.12, 0.9, silver, 10), LX, H + 0.45, LZ));
  g.add(at(rbox(0.46, 0.04, 0.34, silver, 0.015), LX, H + 0.92, LZ));
  const lid = new THREE.Group();
  lid.add(at(rbox(0.44, 0.3, 0.025, mat('#e3e6ee', { rough: 0.35, metal: 0.4 }), 0.012), 0, 0.15, 0));
  const sticker = atlas.add(140, 96, (c, w, h) => {
    c.fillStyle = P.ivory;
    roundRect(c, 3, 3, w - 6, h - 6, 14);
    c.fill();
    c.fillStyle = P.rose;
    heartPath(c, 26, 50, 22);
    c.fill();
    c.fillStyle = '#3b2b3f';
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.font = `700 17px ${FONT}`;
    c.fillText('Playlist', 46, 36);
    c.fillText('by Homama', 46, 60);
  });
  const st = atlas.plane(sticker, 0.24, 0.165);
  at(st, 0.02, 0.16, 0.014);
  lid.add(st);
  lid.rotation.x = -0.25;
  at(lid, LX, H + 0.94, LZ + 0.15);
  g.add(lid);

  // ------------------------------------------------ spotlights that sweep the floor
  const beamTex = canvasTexture(16, 128, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    gr.addColorStop(1, 'rgba(255,255,255,0.08)');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
  });
  const beamGeo = new THREE.CylinderGeometry(0.06, 0.55, 1, 20, 1, true);
  beamGeo.translate(0, -0.5, 0);
  const beams = new THREE.InstancedMesh(beamGeo, new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), 2);
  beams.frustumCulled = false;
  beams.renderOrder = 3;
  g.add(beams);
  dyn.push(beams);
  const spotGeo = new THREE.PlaneGeometry(1.5, 1.5);
  spotGeo.rotateX(-Math.PI / 2);
  const spots = new THREE.InstancedMesh(spotGeo, new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), 2);
  spots.frustumCulled = false;
  spots.renderOrder = 2;
  g.add(spots);
  dyn.push(spots);
  const lampAt = [new THREE.Vector3(SX - 1.85, H + 2.55, SZ - 0.35), new THREE.Vector3(SX + 1.85, H + 2.55, SZ - 0.35)];
  for (const p of lampAt) {
    // A little stage light on a bracket, tipped toward the floor
    g.add(at(box(0.04, 0.3, 0.04, mat(P.gold, { rough: 0.35, metal: 0.55 })), p.x, p.y + 0.2, p.z - 0.12));
    const can = cyl(0.1, 0.13, 0.3, mat(P.ivory, { rough: 0.4, metal: 0.3 }), 12);
    can.rotation.x = -0.9;
    at(can, p.x, p.y + 0.04, p.z - 0.06);
    g.add(can);
    const lens = cyl(0.115, 0.115, 0.02, mat('#fff3d0', { emissive: '#fff0c0', ei: 0.9 }), 12);
    lens.rotation.x = -0.9;
    at(lens, p.x, p.y - 0.05, p.z + 0.06);
    g.add(lens);
  }
  const beamCols = [new THREE.Color('#ff9cd0'), new THREE.Color('#9fd8ff')];
  // Colour buffers exist from the start, so the shaders compiled at load time are the ones used
  for (let i = 0; i < 2; i++) {
    beams.setColorAt(i, beamCols[i]);
    spots.setColorAt(i, beamCols[i]);
  }

  // ------------------------------------------------ animation
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const v = new THREE.Vector3();
  const down = new THREE.Vector3(0, -1, 0);
  const dir = new THREE.Vector3();
  const tgt = new THREE.Vector3();
  const c = new THREE.Color();
  updaters.push((dt, t, S) => {
    const punch = Math.exp(-(S.beat % 1) * 4);
    recTex.rotation -= dt * (S.dancing ? 3.5 : 1.6); // both records spin
    // Speakers thump
    cones.forEach((cn, i) => {
      const k = S.dancing ? 1 + punch * 0.14 : 1 + Math.max(0, Math.sin(t * 6 + i)) * 0.03;
      m4.compose(v.set(cn.x, cn.y, cn.z + (k - 1) * 0.3), q.identity(), s.set(cn.r * k, cn.r * k, 1));
      coneMesh.setMatrixAt(i, m4);
    });
    coneMesh.instanceMatrix.needsUpdate = true;
    // Spotlights
    const on = S.dancing ? 0.35 + S.night * 0.65 : S.night * 0.3;
    beams.visible = spots.visible = on > 0.01;
    if (beams.visible) {
      lampAt.forEach((p, i) => {
        const sp = S.dancing ? 1.4 : 0.5;
        tgt.set(FLOOR.x + Math.sin(t * 0.7 * sp + i * 2.4) * 2.4, 0.05, FLOOR.z + Math.cos(t * 0.53 * sp + i * 1.3) * 2.2);
        dir.subVectors(tgt, p);
        const L = dir.length();
        q.setFromUnitVectors(down, dir.normalize());
        m4.compose(p, q, s.set(1, L, 1));
        beams.setMatrixAt(i, m4);
        c.copy(beamCols[i]).multiplyScalar(on * 0.38);
        beams.setColorAt(i, c);
        m4.compose(tgt, q.identity(), s.set(1, 1, 1));
        spots.setMatrixAt(i, m4);
        c.copy(beamCols[i]).multiplyScalar(on * 0.8);
        spots.setColorAt(i, c);
      });
      beams.instanceMatrix.needsUpdate = true;
      beams.instanceColor.needsUpdate = true;
      spots.instanceMatrix.needsUpdate = true;
      spots.instanceColor.needsUpdate = true;
    }
  });
  return { boothZ: BZ, djAt: { x: SX, y: H, z: BZ - 0.55 } };
}
