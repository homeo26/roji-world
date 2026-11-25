import { THREE, P, at, box, cyl, sph, mat, mesh, canvasTexture, rng, heartShape, starTexture } from './kit.js';
import { FOUNTAIN } from './layout.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// The wishing fountain: three tiers with sheets of water, a golden heart on top, coins that glint in
// the basin, and a glass slipper someone left behind after a midnight dance.

export function buildFountain(ctx) {
  const { g, col, dyn, updaters } = ctx;
  const FX = FOUNTAIN.x;
  const FZ = FOUNTAIN.z;
  const R = FOUNTAIN.r;
  const stone = mat('#e3e9ec', { rough: 0.6 });
  const stoneLight = mat('#f2f5f6', { rough: 0.55 });
  const gold = mat(P.gold, { rough: 0.3, metal: 0.6 });

  // Basin: an outer wall, an inner wall and a round rim over the gap
  g.add(at(mesh(new THREE.CylinderGeometry(R, R + 0.1, 0.55, 44, 1, true), stone), FX, 0.275, FZ));
  g.add(at(mesh(new THREE.CylinderGeometry(R - 0.12, R - 0.12, 0.5, 44, 1, true), mat('#cfdde2', { rough: 0.6, side: THREE.BackSide })), FX, 0.3, FZ));
  const rim = mesh(new THREE.TorusGeometry(R - 0.03, 0.1, 6, 44), stoneLight);
  rim.rotation.x = Math.PI / 2;
  at(rim, FX, 0.56, FZ);
  g.add(rim);
  // Pink tiles round the foot of the basin
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const t = box(0.5, 0.05, 0.06, mat(i % 2 ? '#f6b8cb' : '#bfe7ef', { rough: 0.6 }));
    t.rotation.y = Math.PI / 2 - a;
    at(t, FX + Math.cos(a) * (R + 0.07), 0.32, FZ + Math.sin(a) * (R + 0.07));
    g.add(t);
  }
  // Water with slow ripples
  const ripple = canvasTexture(256, 256, (c, w) => {
    c.fillStyle = '#7fd6e6';
    c.fillRect(0, 0, w, w);
    const r = rng(8);
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 3;
    for (let i = 0; i < 26; i++) {
      c.beginPath();
      c.ellipse(r() * w, r() * w, 12 + r() * 26, 5 + r() * 9, r() * 3, 0, Math.PI * 1.3);
      c.stroke();
    }
  });
  ripple.wrapS = ripple.wrapT = THREE.RepeatWrapping;
  ripple.repeat.set(2, 2);
  const waterMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: ripple, roughness: 0.12, metalness: 0.1, emissive: '#3fb8d0', emissiveIntensity: 0.2 });
  const waters = [new THREE.CircleGeometry(R - 0.1, 44).rotateX(-Math.PI / 2).translate(FX, 0.5, FZ)];
  // Coins people wished with
  const r = rng(19);
  const coinGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.012, 12);
  const coinPos = [];
  for (let i = 0; i < 18; i++) {
    const a = r() * Math.PI * 2;
    const d = 0.45 + Math.sqrt(r()) * 0.95;
    const c = mesh(coinGeo, i % 4 ? gold : mat('#d9dde3', { rough: 0.3, metal: 0.7 }), { cast: false });
    c.rotation.set((r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3);
    at(c, FX + Math.cos(a) * d, 0.508, FZ + Math.sin(a) * d);
    g.add(c);
    coinPos.push(c.position.clone());
  }

  // Middle tier
  g.add(at(cyl(0.2, 0.3, 0.7, stone, 18), FX, 0.85, FZ));
  const bowl = (r0, y, wall = 0.16) => {
    const pts = [new THREE.Vector2(0.05, -wall), new THREE.Vector2(r0 * 0.45, -wall), new THREE.Vector2(r0 * 0.9, -wall * 0.4), new THREE.Vector2(r0, 0.02), new THREE.Vector2(r0 - 0.05, 0.04), new THREE.Vector2(r0 * 0.86, -wall * 0.2), new THREE.Vector2(0.05, -wall * 0.5)];
    const b = mesh(new THREE.LatheGeometry(pts, 32), stoneLight);
    at(b, FX, y, FZ);
    g.add(b);
    waters.push(new THREE.CircleGeometry(r0 * 0.86, 28).rotateX(-Math.PI / 2).translate(FX, y - 0.02, FZ));
  };
  bowl(0.88, 1.24, 0.2);
  g.add(at(cyl(0.11, 0.16, 0.5, stone, 14), FX, 1.46, FZ));
  bowl(0.44, 1.74, 0.12);
  // A golden heart on top
  const hg = new THREE.ExtrudeGeometry(heartShape(0.36), { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 10 });
  hg.translate(0, 0, -0.03);
  const heart = mesh(hg, gold);
  at(heart, FX, 1.86, FZ);
  g.add(heart);
  const water = mesh(mergeGeometries(waters), waterMat, { cast: false });
  g.add(water);
  dyn.push(water);
  col({ type: 'circle', x: FX, z: FZ, r: R + 0.12 });

  // Sheets of water falling from the bowls
  const sheetTex = canvasTexture(128, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const rr = rng(4);
    for (let i = 0; i < 40; i++) {
      c.fillStyle = `rgba(255,255,255,${0.25 + rr() * 0.5})`;
      c.fillRect(rr() * w, rr() * h, 1.5 + rr() * 2, 6 + rr() * 18);
    }
  });
  sheetTex.wrapS = sheetTex.wrapT = THREE.RepeatWrapping;
  sheetTex.repeat.set(5, 1);
  const sheetMat = new THREE.MeshBasicMaterial({ color: '#bff0fb', map: sheetTex, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide });
  const sheets = [[0.88, 1.0, 1.25, 0.52], [0.44, 0.52, 1.75, 1.23]].map(([rt, rb, y0, y1]) => new THREE.CylinderGeometry(rt, rb, y0 - y1, 36, 1, true).translate(FX, (y0 + y1) / 2, FZ));
  const sheet = mesh(mergeGeometries(sheets), sheetMat, { cast: false });
  g.add(sheet);
  dyn.push(sheet);
  // Little arcs of water from under the heart
  const dropN = 24;
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.032, 6, 4), new THREE.MeshBasicMaterial({ color: '#d6f6ff' }), dropN);
  drops.frustumCulled = false;
  g.add(drops);
  dyn.push(drops);

  // ------------------------------------------------ the glass slipper
  const SXp = FX - 0.75;
  const SZp = FZ + 2.15;
  const shoe = new THREE.Group();
  const glassy = mat('#cdeeff', { rough: 0.12, metal: 0.35, emissive: '#9fdcff', ei: 0.25 });
  const sole = box(0.1, 0.018, 0.26, glassy);
  sole.rotation.x = -0.32;
  at(sole, 0, 0.07, 0.02);
  shoe.add(sole);
  shoe.add(at(cyl(0.012, 0.02, 0.1, glassy, 8), 0, 0.05, -0.1));
  const toe = mesh(new THREE.SphereGeometry(0.06, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), glassy);
  toe.scale.set(0.85, 0.6, 1.25);
  at(toe, 0, 0.035, 0.09);
  shoe.add(toe);
  const cup = mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 14, Math.PI), glassy);
  cup.rotation.set(-0.3, Math.PI / 2, 0);
  cup.rotation.order = 'YXZ';
  at(cup, 0, 0.12, -0.07);
  shoe.add(cup);
  for (const dx of [-0.025, 0.025]) shoe.add(at(sph(0.02, mat(P.pink, { rough: 0.4 }), 8), dx, 0.075, 0.12));
  shoe.scale.setScalar(1.7);
  shoe.rotation.set(0, -0.6, 0.38);
  at(shoe, SXp, 0.02, SZp);
  g.add(shoe);

  // Glints on the coins and on the slipper
  const sparkN = coinPos.length + 2;
  const spos = new Float32Array(sparkN * 3);
  const scol = new Float32Array(sparkN * 3);
  coinPos.forEach((p, i) => spos.set([p.x, p.y + 0.03, p.z], i * 3));
  spos.set([SXp, 0.2, SZp], coinPos.length * 3);
  spos.set([SXp + 0.08, 0.13, SZp - 0.08], (coinPos.length + 1) * 3);
  const sgeo = new THREE.BufferGeometry();
  sgeo.setAttribute('position', new THREE.BufferAttribute(spos, 3));
  sgeo.setAttribute('color', new THREE.BufferAttribute(scol, 3));
  const glints = new THREE.Points(sgeo, new THREE.PointsMaterial({ size: 0.34, map: starTexture(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  glints.frustumCulled = false;
  glints.renderOrder = 2;
  g.add(glints);
  dyn.push(glints);
  const phase = Array.from({ length: sparkN }, (_, i) => r() * 6 + i);

  const m4 = new THREE.Matrix4();
  updaters.push((dt, t, S) => {
    ripple.offset.set((t * 0.03) % 1, (t * 0.02) % 1);
    sheetTex.offset.y = (t * 1.6) % 1;
    for (let i = 0; i < dropN; i++) {
      const a = (i / dropN) * Math.PI * 2;
      const k = (t * 0.8 + (i % 3) / 3) % 1;
      const rad = 0.06 + k * 0.34;
      m4.makeTranslation(FX + Math.cos(a) * rad, 2.08 + Math.sin(k * Math.PI) * 0.16 - k * 0.38, FZ + Math.sin(a) * rad);
      drops.setMatrixAt(i, m4);
    }
    drops.instanceMatrix.needsUpdate = true;
    const glow = 0.45 + S.night * 0.55;
    for (let i = 0; i < sparkN; i++) {
      const shoeGlint = i >= coinPos.length;
      const period = shoeGlint ? 3.2 : 4.5;
      const ph = (t + phase[i]) % period;
      const v = Math.max(0, 1 - Math.abs(ph - 0.35) / 0.35) * glow * (shoeGlint ? 1 : 0.9);
      scol[i * 3] = v;
      scol[i * 3 + 1] = v * 0.95;
      scol[i * 3 + 2] = v * 0.8;
    }
    sgeo.attributes.color.needsUpdate = true;
  });
}
