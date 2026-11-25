import { THREE, P, at, box, rbox, cyl, sph, mat, mesh, roundRect, rng, FONT, fitText, heartPath, geoIn } from './kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ARCADE } from './layout.js';

// The arcade kiosk: a little striped-roof building with glowing machines along its front, a claw
// machine with two very familiar plushies inside, and a high score board.

const GAMES = [
  { name: 'Heart Hop', body: P.teal, trim: P.sun },
  { name: 'Star Snake', body: P.rose, trim: P.sky },
  { name: 'Love Blocks', body: '#ffb347', trim: P.violet },
];

export function buildArcade(ctx) {
  const { g, col, atlas, bulbs, dyn, updaters } = ctx;
  const X0 = ARCADE.x0 + 0.1;
  const X1 = ARCADE.x1 - 0.1;
  const CX = (X0 + X1) / 2;
  const W = X1 - X0;
  const BZ0 = ARCADE.z0;
  const BZ1 = ARCADE.z0 + 1.85; // the building's front wall
  const BD = BZ1 - BZ0;
  const H = 2.6;

  // ------------------------------------------------ the building
  const wallMat = mat('#c9b8ff', { rough: 0.75 });
  g.add(at(rbox(W, H, BD, wallMat, 0.08), CX, H / 2, (BZ0 + BZ1) / 2));
  g.add(at(rbox(W + 0.12, 0.18, BD + 0.12, mat(P.ivory, { rough: 0.6 }), 0.05), CX, H, (BZ0 + BZ1) / 2));
  const stripes = atlas.add(64, 256, (c, w, h) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? P.ivory : P.pink;
      c.fillRect(0, i * 32, w, 32);
    }
  });
  const roofR = BD / 2 + 0.2;
  const roof = mesh(atlas.fit(new THREE.CylinderGeometry(roofR, roofR, W + 0.3, 24, 1, false, 0, Math.PI), stripes), atlas.paint);
  roof.rotation.z = Math.PI / 2;
  roof.scale.set(0.55, 1, 1);
  at(roof, CX, H + 0.08, (BZ0 + BZ1) / 2);
  g.add(roof);
  col({ type: 'box', x: CX, z: (BZ0 + BZ1) / 2, hw: W / 2, hd: BD / 2 });
  // Neon line and painted stars along the front wall
  g.add(at(box(W - 0.2, 0.05, 0.03, mat('#ff9cc4', { emissive: '#ff6fa8', ei: 0.9 })), CX, 2.35, BZ1 + 0.01));
  const starR = rng(31);
  for (let i = 0; i < 9; i++) {
    const s = mesh(new THREE.CircleGeometry(0.05 + starR() * 0.04, 5), mat(i % 2 ? P.sun : P.ivory, { emissive: i % 2 ? P.sun : '#ffffff', ei: 0.3 }), { cast: false });
    at(s, X0 + 0.3 + (i / 8) * (W - 0.6), 2.05 + starR() * 0.2, BZ1 + 0.012);
    g.add(s);
  }

  // Marquee over the front, with chasing bulbs
  const mq = atlas.add(512, 120, (c, w, h) => {
    c.fillStyle = '#3b2b6b';
    roundRect(c, 4, 4, w - 8, h - 8, 40);
    c.fill();
    c.strokeStyle = P.sun;
    c.lineWidth = 8;
    roundRect(c, 12, 12, w - 24, h - 24, 32);
    c.stroke();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#ffe36e';
    c.shadowColor = '#ff6fa8';
    c.shadowBlur = 14;
    fitText(c, 'ARCADE', w / 2, h / 2 + 6, w - 90, 74);
    c.shadowBlur = 0;
  });
  const MW = 2.5;
  const MH = 0.6;
  const sign = atlas.plane(mq, MW, MH, true);
  at(sign, CX, H + 0.62, BZ1 + 0.02);
  g.add(sign);
  g.add(at(rbox(MW + 0.1, MH + 0.1, 0.08, mat('#2c2150', { rough: 0.5 }), 0.04), CX, H + 0.62, BZ1 - 0.03));
  for (let i = 0; i < 26; i++) {
    const k = i / 26;
    const per = 2 * (MW + MH);
    let d = k * per;
    let x;
    let y;
    if (d < MW) [x, y] = [-MW / 2 + d, MH / 2];
    else if ((d -= MW) < MH) [x, y] = [MW / 2, MH / 2 - d];
    else if ((d -= MH) < MW) [x, y] = [MW / 2 - d, -MH / 2];
    else [x, y] = [-MW / 2, -MH / 2 + (d - MW)];
    bulbs.push({ p: new THREE.Vector3(CX + x * 1.04, H + 0.62 + y * 1.12, BZ1 + 0.05), base: new THREE.Color(i % 2 ? '#fff1c9' : '#ffd166'), set: 'arcade', k });
  }

  // ------------------------------------------------ machines along the front
  const prof = new THREE.Shape();
  [[-0.36, 0], [0.34, 0], [0.34, 0.8], [0.44, 0.93], [0.3, 1.0], [0.22, 1.52], [0.32, 1.62], [0.32, 1.92], [-0.36, 1.92]].forEach(([z, y], i) => (i ? prof.lineTo(z, y) : prof.moveTo(z, y)));
  const CW = 0.8;
  const cabGeo = new THREE.ExtrudeGeometry(prof, { depth: CW, bevelEnabled: false });
  cabGeo.rotateY(-Math.PI / 2);
  cabGeo.translate(CW / 2, 0, 0);
  const MZ = BZ1 + 0.38;
  const xs = [X0 + 1.4, X0 + 2.3, X0 + 3.2];
  const screens = [];
  GAMES.forEach((gm, i) => {
    const x = xs[i];
    const cab = mesh(cabGeo, mat(gm.body, { rough: 0.55 }));
    at(cab, x, 0, MZ);
    g.add(cab);
    for (const s of [-1, 1]) g.add(at(box(0.012, 1.0, 0.5, mat(gm.trim, { rough: 0.5 })), x + s * (CW / 2 + 0.022), 0.95, MZ - 0.05));
    // Joystick and buttons on the panel
    g.add(at(cyl(0.012, 0.012, 0.1, mat(P.ink), 6), x - 0.18, 1.0, MZ + 0.36));
    g.add(at(sph(0.035, mat('#e5484d', { rough: 0.35 }), 10), x - 0.18, 1.06, MZ + 0.36));
    for (const [dx, c] of [[0.05, P.sun], [0.15, P.sky], [0.25, P.pink]]) g.add(at(cyl(0.03, 0.03, 0.02, mat(c, { emissive: c, ei: 0.45 }), 10), x + dx, 0.965, MZ + 0.37));
    const label = atlas.add(256, 64, (c, w, h) => {
      c.fillStyle = '#2c2150';
      roundRect(c, 2, 2, w - 4, h - 4, 14);
      c.fill();
      c.fillStyle = gm.trim;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fitText(c, gm.name, w / 2, h / 2 + 2, w - 26, 34);
    });
    const lab = atlas.plane(label, 0.62, 0.17, true);
    at(lab, x, 1.77, MZ + 0.327);
    g.add(lab);
    screens.push({ x, y: 1.26, z: MZ + 0.268 });
  });
  // The three screens draw on the park's shared screen canvas
  const snake = [];
  const DRAW = [
    // Heart Hop: a little hopper over clouds, collecting hearts
    (c, w, h, t) => {
      const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#5b4bc4');
      gr.addColorStop(1, '#ff9cc4');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
      const sc = (t * 40) % 60;
      c.fillStyle = '#ffffff';
      for (let k = -1; k < 4; k++) {
        roundRect(c, k * 60 - sc, 92 - (k % 2) * 16, 44, 12, 6);
        c.fill();
      }
      c.fillStyle = '#ff4f9a';
      for (let k = 0; k < 4; k++) {
        heartPath(c, (k * 60 - sc + 140) % (w + 40), 50 - (k % 2) * 14, 9);
        c.fill();
      }
      const hop = Math.abs(Math.sin(t * 4)) * 34;
      c.fillStyle = '#ffd166';
      c.fillRect(40, 72 - hop, 14, 14);
      c.fillStyle = '#3b2b3f';
      c.fillRect(48, 76 - hop, 3, 3);
      c.fillStyle = '#ffffff';
      c.textAlign = 'left';
      c.textBaseline = 'alphabetic';
      c.font = `700 12px ${FONT}`;
      c.fillText('x' + (Math.floor(t * 2) % 100), 120, 14);
    },
    // Star Snake
    (c, w, h, t) => {
      c.fillStyle = '#122a33';
      c.fillRect(0, 0, w, h);
      const step = Math.floor(t * 6);
      const path = (k) => {
        const p = ((k % 56) + 56) % 56;
        if (p < 18) return [1 + p, 2];
        if (p < 28) return [18, 2 + (p - 18)];
        if (p < 46) return [18 - (p - 28), 12];
        return [0, 12 - (p - 46)];
      };
      snake.length = 0;
      for (let k = 0; k < 9; k++) snake.push(path(step - k));
      c.fillStyle = '#ffd166';
      const sp = path(step + 9);
      c.beginPath();
      c.arc(sp[0] * 8 + 4, sp[1] * 8 + 4, 4, 0, Math.PI * 2);
      c.fill();
      snake.forEach(([x, y], k) => {
        c.fillStyle = k % 2 ? '#ef5b9e' : '#ff8fb1';
        c.fillRect(x * 8 + 1, y * 8 + 1, 7, 7);
      });
    },
    // Love Blocks
    (c, w, h, t) => {
      c.fillStyle = '#2c1d3d';
      c.fillRect(0, 0, w, h);
      const cols = ['#ff8fb1', '#ffd166', '#7fd3ff', '#9fe3cf', '#b9a6ff'];
      const r = rng(3);
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 10; x++) {
          if (r() < 0.75) {
            c.fillStyle = cols[Math.floor(r() * 5)];
            c.fillRect(30 + x * 10, 110 - y * 10, 9, 9);
          }
        }
      }
      const fall = Math.floor((t * 30) % 90);
      c.fillStyle = '#ffd166';
      for (const [bx, by] of [[0, 0], [1, 0], [2, 0], [1, 1]]) c.fillRect(70 + bx * 10, fall + by * 10, 9, 9);
      c.strokeStyle = '#ffffff';
      c.lineWidth = 1;
      c.strokeRect(29, 0, 102, 120);
    },
  ];
  screens.forEach((sc, i) => {
    const pg = new THREE.PlaneGeometry(0.52, 0.42);
    pg.rotateX(-0.16);
    pg.translate(sc.x, sc.y, sc.z);
    ctx.screen.add({ x: i * 170 + 4, y: 4, w: 160, h: 120 }, pg, DRAW[i]);
  });
  ctx.pools.push({ x: X0 + 2.3, z: MZ + 0.9, r: 3.2, color: '#9fd0ff', k: 0.4 });

  // The high score board, at the left end of the front wall
  const hs = atlas.add(200, 260, (c, w, h) => {
    c.fillStyle = '#20193d';
    roundRect(c, 3, 3, w - 6, h - 6, 18);
    c.fill();
    c.strokeStyle = '#7fd3ff';
    c.lineWidth = 6;
    roundRect(c, 10, 10, w - 20, h - 20, 12);
    c.stroke();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#ffd166';
    fitText(c, 'HIGH SCORES', w / 2, 40, w - 30, 28);
    c.font = `700 22px ${FONT}`;
    c.textAlign = 'left';
    const rows = [['1 ROJI', '9999', '#ff8fb1'], ['2 HOMAMA', '9998', '#7fd3ff'], ['3 DJ', '4210', '#ffffff'], ['4 GRANDPA', '1977', '#ffffff']];
    rows.forEach(([n, s], i) => {
      c.fillStyle = rows[i][2];
      c.font = `700 ${i < 2 ? 21 : 17}px ${FONT}`;
      c.fillText(n, 22, 88 + i * 40);
      c.textAlign = 'right';
      c.fillText(s, w - 20, 88 + i * 40);
      c.textAlign = 'left';
    });
    c.fillStyle = '#ff8fb1';
    heartPath(c, w / 2, 238, 12);
    c.fill();
  });
  const board = atlas.plane(hs, 0.58, 0.76, true);
  at(board, X0 + 0.42, 1.38, BZ1 + 0.03);
  g.add(board);
  g.add(at(rbox(0.66, 0.84, 0.05, mat('#7fd3ff', { rough: 0.5 }), 0.02), X0 + 0.42, 1.38, BZ1 + 0.004));

  // ------------------------------------------------ the claw machine
  const KX = X1 - 0.45;
  const KW = 0.78;
  const KZ = MZ - 0.02;
  g.add(at(rbox(KW, 0.82, 0.7, mat(P.pink, { rough: 0.5 }), 0.05), KX, 0.41, KZ));
  g.add(at(rbox(KW + 0.04, 0.26, 0.74, mat(P.rose, { rough: 0.5 }), 0.05), KX, 1.78, KZ));
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(at(box(0.035, 0.84, 0.035, mat(P.gold, { rough: 0.35, metal: 0.5 })), KX + dx * (KW / 2 - 0.02), 1.24, KZ + dz * 0.33));
  const clawLab = atlas.add(200, 56, (c, w, h) => {
    c.fillStyle = P.sun;
    roundRect(c, 2, 2, w - 4, h - 4, 18);
    c.fill();
    c.fillStyle = '#a3262b';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Hug Machine', w / 2, h / 2 + 2, w - 20, 30);
  });
  const cl = atlas.plane(clawLab, 0.62, 0.17, true);
  at(cl, KX, 1.78, KZ + 0.375);
  g.add(cl);
  g.add(at(rbox(0.2, 0.14, 0.06, mat('#e3e6ee', { rough: 0.4 }), 0.02), KX + 0.22, 0.62, KZ + 0.36));
  ctx.glass.push(new THREE.BoxGeometry(KW - 0.04, 0.82, 0.64).translate(KX, 1.24, KZ));
  // Prizes: a teddy, a bunny, balls, and a little Roji and Homama sitting close together
  const prize = (x, y, z, s = 1) => [KX + x, 0.84 + y, KZ + z, s];
  const plush = (look, x, z, lean) => {
    const p = new THREE.Group();
    p.add(at(sph(0.07, mat(look.body, { rough: 0.85 }), 12), 0, 0.07, 0));
    p.add(at(sph(0.075, mat('#f8dccb', { rough: 0.85 }), 12), 0, 0.19, 0));
    const hair = mesh(new THREE.SphereGeometry(0.08, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(look.hair, { rough: 0.85 }));
    at(hair, 0, 0.2, -0.008);
    p.add(hair);
    if (look.buns) for (const s of [-1, 1]) p.add(at(sph(0.03, mat(look.hair, { rough: 0.85 }), 8), s * 0.07, 0.25, 0));
    for (const s of [-1, 1]) p.add(at(sph(0.009, mat(P.ink), 6), s * 0.026, 0.195, 0.07));
    p.rotation.z = lean;
    at(p, ...prize(x, 0.0, z).slice(0, 3));
    g.add(p);
  };
  plush({ body: '#ef5b6f', hair: '#2a1a13', buns: true }, -0.08, 0.1, -0.25);
  plush({ body: '#3f7bf0', hair: '#141010' }, 0.08, 0.1, 0.25);
  const bear = new THREE.Group();
  bear.add(at(sph(0.08, mat('#b5773d', { rough: 0.9 }), 12), 0, 0.08, 0));
  bear.add(at(sph(0.065, mat('#b5773d', { rough: 0.9 }), 12), 0, 0.2, 0));
  for (const s of [-1, 1]) bear.add(at(sph(0.025, mat('#b5773d', { rough: 0.9 }), 8), s * 0.05, 0.26, 0));
  bear.add(at(sph(0.035, mat('#ef5b6f', { rough: 0.6 }), 8), 0, 0.1, 0.07));
  at(bear, KX - 0.22, 0.84, KZ - 0.15);
  g.add(bear);
  const bunny = new THREE.Group();
  bunny.add(at(sph(0.075, mat('#ffffff', { rough: 0.9 }), 12), 0, 0.075, 0));
  bunny.add(at(sph(0.06, mat('#ffffff', { rough: 0.9 }), 12), 0, 0.18, 0));
  for (const s of [-1, 1]) {
    const ear = sph(0.022, mat('#ffd3e0', { rough: 0.9 }), 8);
    ear.scale.set(1, 2.6, 0.8);
    at(ear, s * 0.03, 0.27, 0);
    bunny.add(ear);
  }
  at(bunny, KX + 0.22, 0.84, KZ - 0.12);
  g.add(bunny);
  const br = rng(9);
  for (let i = 0; i < 9; i++) g.add(at(sph(0.05, mat([P.sun, P.sky, P.lilac, P.mint][i % 4], { rough: 0.5 }), 10), KX + (br() - 0.5) * 0.6, 0.88, KZ + (br() - 0.5) * 0.45 - 0.05));
  // The claw drifts about looking for a prize
  const claw = new THREE.Group();
  claw.add(at(cyl(0.008, 0.008, 0.3, mat('#d9dde3', { metal: 0.6, rough: 0.3 }), 5), 0, 0.15, 0));
  claw.add(at(cyl(0.04, 0.04, 0.05, mat(P.gold, { metal: 0.6, rough: 0.3 }), 10), 0, 0, 0));
  for (let i = 0; i < 3; i++) {
    const prong = box(0.012, 0.09, 0.012, mat(P.gold, { metal: 0.6, rough: 0.3 }));
    const a = (i / 3) * Math.PI * 2;
    prong.position.set(Math.cos(a) * 0.035, -0.05, Math.sin(a) * 0.035);
    prong.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4);
    claw.add(prong);
  }
  const clawMesh = mesh(mergeGeometries(claw.children.map((o) => geoIn(o, claw))), mat(P.gold, { metal: 0.6, rough: 0.3 }));
  g.add(clawMesh);
  dyn.push(clawMesh);
  col({ type: 'box', x: (X0 + 0.95 + X1) / 2, z: MZ, hw: (X1 - X0 - 0.95) / 2, hd: 0.42 });

  // ------------------------------------------------ animation
  updaters.push((dt, t, S) => {
    clawMesh.position.set(KX + Math.sin(t * 0.6) * 0.26, 1.48 + Math.max(0, Math.sin(t * 0.37)) * -0.14, KZ + Math.cos(t * 0.45) * 0.18);
  });

  return { kiosk: { x: CX, z: MZ + 0.95 } };
}
