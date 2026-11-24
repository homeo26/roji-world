import { THREE, mat, umat, mesh, box, rbox, cyl, sph, tor, at, rot, canvasTexture, heartGeo, glowTex, sprite, pillowGeo, bake, FONT, roundRect } from './kit.js';
import { L } from './shell.js';
import { rng } from '../../util.js';

// The sunroom behind the hallway: a big window with a cushioned window seat (the reading nook),
// three plants that grow a little every time they are watered, Mishmish's cat tree and her laser game.
// Interior coordinates.

const P = Math.PI;
const WX = 9.6; // window and seat centre
const SEAT = 0.48;
const SZ = L.ZB + 0.3; // seat centre z
const PX = 11.35; // plants along the right wall
const PLANTS = [
  { id: 'rose', z: -8.45, name: "Roji's roses" },
  { id: 'sun', z: -6.9, name: 'Sunny' },
  { id: 'lemon', z: -5.35, name: 'Lemons' },
];

function rainTex() {
  const t = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(120,135,170,0.28)';
    ctx.fillRect(0, 0, w, h);
    const r = rng(4);
    ctx.strokeStyle = 'rgba(235,245,255,0.85)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const x = r() * w;
      const y = r() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y + 12);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, 2 + r() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// One plant at four growth stages (0 sprout .. 3 in bloom), each merged into a mesh or two
function plantStages(kind) {
  const stages = [];
  const leaf = (g, x, y, z, s, c = '#5aa84f', ry = 0) => {
    const l = sph(0.1 * s, c, { rough: 0.8 }, 8);
    l.scale.set(1, 0.3, 0.55);
    l.position.set(x, y, z);
    l.rotation.set(0.3, ry, 0.4);
    g.add(l);
  };
  for (let k = 0; k < 4; k++) {
    const g = new THREE.Group();
    const s = 0.55 + k * 0.17;
    if (kind === 'rose') {
      for (let i = 0; i < 5 + k * 3; i++) {
        const a = i * 2.4;
        const rr = (0.06 + (i % 3) * 0.05) * s;
        g.add(at(sph(0.11 * s, i % 2 ? '#4f9a45' : '#5aa84f', { rough: 0.85 }, 10), Math.cos(a) * rr, 0.5 + (i % 4) * 0.1 * s, Math.sin(a) * rr));
      }
      const blooms = [0, 1, 4, 8][k];
      for (let i = 0; i < blooms; i++) {
        const a = i * 1.7 + 0.4;
        const c = ['#ff5d8f', '#ef3b5d', '#ff8fb1', '#ffffff'][i % 4];
        g.add(at(new THREE.Mesh(new THREE.DodecahedronGeometry(0.055, 0), mat(c, { rough: 0.6 })), Math.cos(a) * 0.14 * s, 0.6 + (i % 3) * 0.1 * s, Math.sin(a) * 0.12 * s + 0.06));
      }
      if (k === 1) for (let i = 0; i < 3; i++) g.add(at(sph(0.03, '#ff8fb1', undefined, 6), Math.cos(i * 2) * 0.1, 0.66 + i * 0.03, Math.sin(i * 2) * 0.1 + 0.05));
    } else if (kind === 'sun') {
      const h = [0.18, 0.55, 0.95, 1.25][k];
      g.add(at(cyl(0.018, 0.022, h, '#4f9a45', 6), 0, 0.42 + h / 2, 0));
      for (let i = 0; i < 1 + k * 2; i++) leaf(g, (i % 2 ? 1 : -1) * 0.1, 0.48 + (i + 1) * (h / (2 + k * 2)), 0, 1 + k * 0.25, '#5aa84f', i % 2 ? 0 : P);
      if (k === 2) g.add(at(sph(0.08, '#7fbf5a', undefined, 10), 0, 0.42 + h, 0.02));
      if (k === 3) {
        const head = new THREE.Group();
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * P * 2;
          const p = sph(0.07, '#ffc93c', { rough: 0.6 }, 8);
          p.scale.set(0.5, 1.2, 0.25);
          p.position.set(Math.cos(a) * 0.14, Math.sin(a) * 0.14, 0);
          p.rotation.z = a - P / 2;
          head.add(p);
        }
        head.add(at(cyl(0.1, 0.1, 0.05, '#7a4a26', 16), 0, 0, 0.01));
        head.children[head.children.length - 1].rotation.x = P / 2;
        // A tiny smiley face on the flower (look closely)
        for (const s2 of [-1, 1]) head.add(at(sph(0.012, '#3b2414', undefined, 6), s2 * 0.035, 0.02, 0.04));
        head.position.set(0, 0.45 + h, 0.06);
        head.rotation.x = -0.2;
        g.add(head);
      }
    } else {
      const h = [0.25, 0.5, 0.65, 0.7][k];
      g.add(at(cyl(0.025, 0.035, h, '#9b6a43', 6), 0, 0.42 + h / 2, 0));
      const cr = [0.1, 0.2, 0.26, 0.3][k];
      for (const [dx, dy, dz, rr] of [[0, 0, 0, 1], [0.12, -0.06, 0.05, 0.75], [-0.12, -0.04, -0.04, 0.8], [0.02, 0.1, -0.06, 0.7]]) g.add(at(sph(cr * rr, dx > 0 ? '#76c25c' : '#5aa84f', { rough: 0.85 }, 12), dx * (cr / 0.3), 0.42 + h + dy * (cr / 0.3), dz * (cr / 0.3)));
      if (k === 2) for (let i = 0; i < 7; i++) g.add(at(sph(0.025, '#ffffff', undefined, 6), Math.cos(i * 2.2) * cr * 0.9, 0.42 + h + Math.sin(i * 1.7) * cr * 0.5, Math.sin(i * 2.2) * cr * 0.9 + 0.04));
      if (k === 3) for (let i = 0; i < 6; i++) {
        const l = sph(0.05, '#ffe14d', { rough: 0.5 }, 10);
        l.scale.set(1, 1.25, 1);
        l.position.set(Math.cos(i * 2.2) * cr * 0.85, 0.42 + h + Math.sin(i * 1.3) * cr * 0.5 - 0.04, Math.sin(i * 2.2) * cr * 0.85 + 0.05);
        g.add(l);
      }
    }
    bake(g);
    g.visible = false;
    stages.push(g);
  }
  return stages;
}

function makeCan() {
  const c = new THREE.Group();
  c.add(at(cyl(0.11, 0.12, 0.2, '#63c7ba', 12), 0, 0.1, 0));
  c.add(rot(at(cyl(0.016, 0.024, 0.26, '#63c7ba', 8), 0, 0.16, 0.16), 1.0, 0, 0));
  c.add(at(cyl(0.035, 0.03, 0.03, '#4fb0a3', 8), 0, 0.26, 0.27));
  c.add(rot(at(tor(0.07, 0.016, '#63c7ba', undefined, P, 6, 10), 0, 0.22, -0.02), 0, P / 2, 0));
  c.add(at(mesh(heartGeo(0.08, 0.01), mat('#ffffff')), 0, 0.1, 0.12));
  bake(c);
  return c;
}

function makeBook(color) {
  const b = new THREE.Group();
  const pages = canvasTexture(128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c7cbd6';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(8, 8 + i * 8, 44, 3);
      ctx.fillRect(w / 2 + 8, 8 + i * 8, 44, 3);
    }
  });
  const pm = umat('#ffffff', { rough: 0.8, map: pages, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.rotation.y = -s * 0.3;
    const page = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.22), pm);
    const uv = page.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, s < 0 ? uv.getX(i) * 0.5 : 0.5 + uv.getX(i) * 0.5);
    page.position.x = s * 0.09;
    hinge.add(page, at(box(0.19, 0.23, 0.01, color), s * 0.09, 0, -0.007));
    b.add(hinge);
  }
  return b;
}

export function buildSunroom(R) {
  const { add, api } = R;
  const st = { rain: false, rainT: 0, readT: 0, line: -1, laser: null, water: null };
  const white = mat('#ffffff', { rough: 0.6 });
  const wood = mat('#e2c29a', { rough: 0.75 });
  const r = rng(21);

  // ---------------------------------------------------------------- the big window and the seat
  R.windowAt(WX, 1.85, 2.3, 1.35, '#cfe8c4');
  const rainMap = rainTex();
  rainMap.repeat.set(2.2, 1.3);
  const rain = R.dyn(add(at(mesh(new THREE.PlaneGeometry(2.3, 1.35), new THREE.MeshBasicMaterial({ map: rainMap, transparent: true, depthWrite: false }), { cast: false }), WX, 1.85, L.ZB + 0.095)));
  rain.visible = false;
  // Seat: a painted box with drawers, a long mint cushion, pillows and a folded blanket
  add(at(rbox(2.4, SEAT - 0.06, 0.62, white, 0.03), WX, (SEAT - 0.06) / 2, SZ));
  for (const s of [-1, 0, 1]) {
    add(at(rbox(0.62, 0.26, 0.02, '#eaf6ea', 0.02), WX + s * 0.75, 0.2, SZ + 0.32));
    add(at(sph(0.025, '#f4c24f', { metal: 0.5 }, 8), WX + s * 0.75, 0.22, SZ + 0.34));
  }
  add(at(rbox(2.36, 0.1, 0.6, '#a8dcc4', 0.05), WX, SEAT - 0.01, SZ));
  const pg = pillowGeo(0.4, 0.13, 0.36, 14);
  for (const [dx, c] of [[-1.0, '#ff9eb5'], [1.0, '#ffd166']]) add(rot(at(mesh(pg, mat(c, { rough: 0.9 })), WX + dx, SEAT + 0.2, SZ - 0.12), -P / 2 + 0.3, 0, dx * 0.1));
  add(at(rbox(0.4, 0.1, 0.34, '#c7a6ff', 0.04), WX + 0.75, SEAT + 0.07, SZ + 0.05));
  add(at(rbox(0.38, 0.03, 0.32, '#b593f5', 0.01), WX + 0.75, SEAT + 0.13, SZ + 0.05));
  for (const [k, c] of [[0, '#ef5b6f'], [1, '#3f7bf0'], [2, '#7fd3a7']]) add(at(rbox(0.24, 0.05, 0.17, c, 0.01), WX - 0.7, SEAT + 0.04 + k * 0.05, SZ + 0.08)).rotation.y = k * 0.2;
  R.col({ type: 'box', x: WX, z: SZ, hw: 1.22, hd: 0.33, h: SEAT + 0.04 });
  // Mishmish's toy mouse, half under the seat
  add(rot(at(sph(0.05, '#c9cfd8', undefined, 8), WX + 0.4, 0.04, SZ + 0.38), 0, 0.5, 0)).scale.set(0.8, 0.6, 1.3);
  add(at(cyl(0.004, 0.004, 0.12, '#ff9eb5', 4), WX + 0.36, 0.02, SZ + 0.46)).rotation.x = P / 2;
  // Hanging fern by the window
  add(at(cyl(0.004, 0.004, 0.9, '#c9a27a', 4), WX + 1.55, 2.6, L.ZB + 0.35));
  add(at(cyl(0.16, 0.12, 0.16, '#ffffff', 12), WX + 1.55, 2.1, L.ZB + 0.35));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * P * 2;
    const l = add(at(sph(0.16, '#5aa84f', { rough: 0.85 }, 8), WX + 1.55 + Math.cos(a) * 0.16, 2.0 - (i % 2) * 0.12, L.ZB + 0.35 + Math.sin(a) * 0.12));
    l.scale.set(0.5, 1.4, 0.25);
    l.rotation.set(Math.sin(a) * 0.5, -a, 0.3);
  }

  // ---------------------------------------------------------------- plants
  const growth = api.load('plants', [0, 0, 0]);
  const plants = PLANTS.map((p, i) => {
    add(at(cyl(0.24, 0.18, 0.4, '#e07a55', 14), PX, 0.2, p.z));
    add(at(cyl(0.25, 0.25, 0.05, '#c9653f', 14), PX, 0.41, p.z));
    add(at(cyl(0.22, 0.22, 0.02, '#8a5a3c', 14), PX, 0.43, p.z));
    add(at(cyl(0.27, 0.27, 0.04, '#f4e3d0', 16), PX, 0.02, p.z));
    // Plant marker
    const marker = (ctx, w, h) => {
      ctx.fillStyle = '#fffaf2';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#4a7a3a';
      ctx.font = `600 ${Math.round(h * 0.38)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.name, w / 2, h * 0.42);
      if (p.id === 'rose') {
        ctx.fillStyle = '#ef5b6f';
        ctx.font = `500 ${Math.round(h * 0.22)}px ${FONT}`;
        ctx.fillText('planted by H', w / 2, h * 0.8);
      }
    };
    add(at(cyl(0.006, 0.006, 0.28, '#c9a27a', 4), PX - 0.17, 0.5, p.z + 0.16));
    add(rot(at(R.atlas.panel(0.22, 0.1, 160, 72, marker), PX - 0.17, 0.66, p.z + 0.17), 0, -0.6, 0));
    R.col({ type: 'circle', x: PX, z: p.z, r: 0.27 });
    const stages = plantStages(p.id);
    for (const s of stages) {
      s.position.set(PX, 0, p.z);
      add(R.dyn(s));
    }
    const set = (k) => stages.forEach((s, j) => (s.visible = j === k));
    set(growth[i] || 0);
    return { ...p, stages, set };
  });

  // ---------------------------------------------------------------- cat tree and other bits
  const ctx0 = 7.92;
  const ctz = -3.25;
  add(at(rbox(0.6, 0.06, 0.6, '#d9b38c', 0.02), ctx0, 0.03, ctz));
  add(at(cyl(0.07, 0.07, 1.4, '#e9d2b0', 10), ctx0, 0.72, ctz));
  for (let k = 0; k < 9; k++) add(at(tor(0.072, 0.012, '#d2b48c', undefined, P * 2, 4, 12), ctx0, 0.18 + k * 0.12, ctz)).rotation.x = P / 2;
  add(at(rbox(0.5, 0.05, 0.5, '#ff9eb5', 0.02), ctx0 + 0.1, 0.72, ctz - 0.05));
  add(at(tor(0.2, 0.07, '#ff9eb5', { rough: 0.95 }, P * 2, 8, 16), ctx0, 1.42, ctz)).rotation.x = P / 2;
  add(at(cyl(0.22, 0.22, 0.05, '#fff1f4', 16), ctx0, 1.38, ctz));
  add(at(cyl(0.003, 0.003, 0.26, '#ffffff', 3), ctx0 + 0.3, 0.59, ctz - 0.05));
  add(at(sph(0.04, '#ffd166', undefined, 8), ctx0 + 0.3, 0.46, ctz - 0.05));
  R.col({ type: 'circle', x: ctx0, z: ctz, r: 0.32 });
  // Little chalkboard: watering days, with a tiny R + H in the corner
  const chalk = (ctx, w, h) => {
    ctx.fillStyle = '#c98f5f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3d4a45';
    roundRect(ctx, 8, 8, w - 16, h - 16, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText('Water us', w / 2, 44);
    ctx.font = `500 20px ${FONT}`;
    ctx.fillStyle = '#d7f2e1';
    ctx.fillText('on weekends', w / 2, 74);
    ctx.fillStyle = '#ffd6e0';
    ctx.font = `500 13px ${FONT}`;
    ctx.fillText('R + H', w - 30, h - 16);
  };
  add(rot(at(R.atlas.panel(0.46, 0.34, 192, 140, chalk), 11.98, 1.6, -6.9), 0, -P / 2, 0));
  // Round rug
  const rug = (ctx, w) => {
    ctx.fillStyle = '#efe2c8';
    ctx.fillRect(0, 0, w, w);
    ctx.strokeStyle = '#d8c39d';
    ctx.lineWidth = 6;
    for (let k = 1; k < 9; k++) {
      ctx.beginPath();
      ctx.arc(w / 2, w / 2, k * 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#a8dcc4';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(w / 2 + Math.cos(a) * w * 0.43, w / 2 + Math.sin(a) * w * 0.43, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  add(rot(at(R.atlas.wrap(new THREE.CircleGeometry(1.25, 36), 256, 256, rug), WX, 0.008, -6.2), -P / 2, 0, 0));
  // Succulents on a little wall shelf by the door
  add(at(rbox(0.22, 0.04, 1.0, wood, 0.01), L.X3 + 0.21, 1.4, -4.4));
  for (let k = 0; k < 3; k++) {
    add(at(cyl(0.06, 0.05, 0.09, ['#ffffff', '#ff9eb5', '#9fd6e3'][k], 10), L.X3 + 0.21, 1.47, -4.75 + k * 0.35));
    for (let j = 0; j < 4; j++) add(at(sph(0.035, '#7fbf8a', undefined, 6), L.X3 + 0.21 + Math.cos(j * 1.6) * 0.03, 1.54 + (j % 2) * 0.02, -4.75 + k * 0.35 + Math.sin(j * 1.6) * 0.03)).scale.set(0.7, 1.3, 0.7);
  }

  R.catSpots = [
    { id: 'windowseat', x: WX, z: SZ + 0.02, y: SEAT + 0.06, nap: true, hop: { x: WX, z: -7.9 }, yaw: 0.2 },
    { id: 'cattree', x: ctx0, z: ctz, y: 1.43, nap: true, hop: { x: ctx0 + 0.6, z: ctz - 0.6 }, over: 0.2, yaw: 0.8 },
  ];

  // ---------------------------------------------------------------- props for the activities
  const can = makeCan();
  const drops = [];
  const dtex = glowTex();
  for (let i = 0; i < 10; i++) {
    const d = R.dyn(add(sprite(dtex, { color: '#7fd3ff', opacity: 0.9, scale: 0.06 })));
    d.visible = false;
    drops.push({ s: d, ph: i / 10 });
  }
  const books = [makeBook('#ef5b6f'), makeBook('#3f7bf0')];
  const dot = R.dyn(add(new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), new THREE.MeshBasicMaterial({ color: '#ff2d55' }))));
  dot.rotation.x = -P / 2;
  dot.visible = false;
  const dotGlow = R.dyn(add(sprite(glowTex(), { color: '#ff4d6d', opacity: 0.8, scale: 0.22 })));
  dotGlow.visible = false;
  const beam = R.dyn(add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 5), new THREE.MeshBasicMaterial({ color: '#ff4d6d', transparent: true, opacity: 0.35, depthWrite: false }))));
  beam.visible = false;

  // ---------------------------------------------------------------- watering
  function water(a) {
    const order = [0, 1, 2];
    st.water = { i: 0, phase: 'walk', t: 0 };
    const spec = R.start('water', {
      label: 'Stop watering',
      seats: [
        { who: 'player', x: PX - 0.75, z: PLANTS[0].z, yaw: P / 2, pose: 'stand' },
        { who: 'partner', x: PX - 1.6, z: PLANTS[0].z + 0.9, yaw: P / 2, pose: 'stand' },
      ],
      focus: { x: PX - 0.9, z: -6.6, y: 1.0, zoom: 0.62 },
      exit: { x: PX - 1.1, z: -6.1 },
      update(dt, t) {
        const w = st.water;
        if (!w) return;
        w.t += dt;
        const p = plants[order[w.i]];
        const me = a.player;
        if (w.phase === 'walk') {
          const there = R.walkTo(me, PX - 0.75, p.z, dt, 1.6);
          R.walkTo(a.partner, PX - 1.55, p.z + 0.85, dt, 1.6);
          if (there) {
            me.yaw = P / 2;
            R.place(me, PX - 0.75, p.z, { yaw: P / 2 });
            w.phase = 'pour';
            w.t = 0;
            a.sound.ui('swoosh');
          }
        } else if (w.phase === 'pour') {
          can.rotation.x = Math.min(1, w.t * 3) * 0.75;
          for (const d of drops) {
            const k = (t * 1.6 + d.ph) % 1;
            d.s.visible = w.t > 0.25;
            d.s.position.set(PX - 0.32 + Math.sin(d.ph * 20) * 0.05, 0.95 - k * 0.5, p.z + Math.cos(d.ph * 20) * 0.05);
          }
          if (Math.random() < dt * 8) R.sound((s, t0) => s.tone(1400 + Math.random() * 900, t0, 0.05, { type: 'sine', gain: 0.015, slideTo: 900 }));
          if (w.t > 1.7) {
            can.rotation.x = 0;
            for (const d of drops) d.s.visible = false;
            const k = order[w.i];
            const before = growth[k] || 0;
            growth[k] = Math.min(3, before + 1);
            api.save('plants', growth);
            p.set(growth[k]);
            p.stages[growth[k]].scale.setScalar(0.85);
            R.tween(0.5, (q) => p.stages[growth[k]].scale.setScalar(0.85 + 0.15 * Math.sin(q * P * 0.5)));
            a.fx.burst(a.world(PX, p.z, 1.0), growth[k] === 3 ? ['#ff8fb1', '#ffd166', '#ffffff'] : ['#7fd36b', '#bdf0a0', '#ffffff'], growth[k] > before ? 22 : 10);
            a.sound.ui(growth[k] > before ? 'good' : 'tick');
            if (growth[k] > before && growth[k] === 3) a.toast(p.id === 'rose' ? "Roji's roses are in full bloom! Homama planted them for her." : p.id === 'sun' ? 'Sunny the sunflower smiles at the window.' : 'Little lemons! Lemonade this weekend?', 3000);
            if (w.i % 2) a.emote('partner', 'cheer');
            w.i++;
            w.t = 0;
            if (w.i >= order.length) {
              w.phase = 'done';
              const all = growth.every((g) => g >= 3);
              if (!all) a.toast(`<b>${a.playerId === 'roji' ? 'Homama' : 'Roji'}:</b> They are growing so well. A little more water next weekend!`, 3000);
              R.later(1.8, () => R.is('water') && a.endActivity());
            } else w.phase = 'walk';
          }
        }
      },
      onEnd() {
        st.water = null;
        can.rotation.x = 0;
        a.carry('player', null);
        for (const d of drops) d.s.visible = false;
      },
    });
    if (!spec) return;
    can.position.set(0.14, -0.12, 0.02);
    can.rotation.set(0, P / 2, 0);
    const holder = new THREE.Group();
    holder.add(can);
    a.carry('player', holder);
    a.toast('Water the plants together. They grow a little every time.', 2400);
  }

  // ---------------------------------------------------------------- reading nook
  const READ = [
    'Roji reads about tiny hearts. Homama reads a comic and laughs quietly.',
    '<b>Homama:</b> Listen to this one... no, wait, you read yours first.',
    'Roji rests her head on Homama\'s shoulder.',
    'Mishmish purrs between them.',
    '<b>Roji:</b> This is my favourite spot in the whole house.',
  ];
  function read(a) {
    st.rain = st.rain || Math.random() < 0.35;
    st.readT = 0;
    st.line = -1;
    const spec = R.start('read', {
      label: 'Close the book',
      seats: [
        { who: 'roji', x: WX - 0.55, z: SZ + 0.08, y: SEAT - 0.33, yaw: 0, pose: 'sit', hands: 'read' },
        { who: 'homama', x: WX + 0.55, z: SZ + 0.08, y: SEAT - 0.33, yaw: 0, pose: 'sit', hands: 'read' },
      ],
      focus: { x: WX, z: SZ + 0.4, y: 1.1, zoom: 0.5 },
      night: 0.25,
      music: 0.35,
      exit: { x: WX - 0.4, z: -7.6 },
      update(dt) {
        st.readT += dt;
        const n = Math.floor(st.readT / 4.6);
        if (n !== st.line) {
          st.line = n;
          const lines = st.rain ? [...READ, 'The rain taps softly on the window.'] : READ;
          a.toast(lines[n % lines.length], 3800);
          if (n % 2) a.fx.heartsAt(a.world(WX, SZ, 1.6), 2);
        }
        // Roji leans on Homama after a while
        const lean = Math.min(1, Math.max(0, (st.readT - 9) * 0.6));
        a.roji.kid.body.rotation.z -= lean * 0.2;
        a.roji.kid.head.rotation.z -= lean * 0.25;
        if (st.rain && Math.random() < dt * 5) R.sound((s, t0) => s.tone(2600 + Math.random() * 2400, t0, 0.02, { type: 'sine', gain: 0.008 }));
      },
      onEnd() {
        for (const b of books) b.removeFromParent();
        R.cat.release();
      },
    });
    if (!spec) return;
    rain.visible = st.rain;
    for (const [i, id] of [[0, 'roji'], [1, 'homama']]) {
      books[i].position.set(0, 0.1, 0.02);
      books[i].rotation.set(-0.7, 0, 0);
      a[id].kid.carryAnchor.add(books[i]);
    }
    R.cat.goTo('windowseat');
    a.toast(st.rain ? 'It is raining outside. Perfect reading weather.' : 'The window nook, warm in the sun.', 2600);
  }

  // ---------------------------------------------------------------- laser dot for Mishmish
  function laser(a) {
    st.laser = { x: WX, z: -6.2, fx: WX, fz: -6.2, tx: WX + 0.8, tz: -6.6, hold: 0.8, t: 0, moving: false, pounce: 0, pounces: 0 };
    const spec = R.start('laser', {
      label: 'Stop playing',
      seats: [
        { who: 'player', x: WX - 0.55, z: SZ + 0.08, y: SEAT - 0.33, yaw: 0, pose: 'sit', hands: 'hold' },
        { who: 'partner', x: WX + 0.55, z: SZ + 0.08, y: SEAT - 0.33, yaw: 0, pose: 'sit' },
      ],
      focus: { x: WX, z: -6.9, y: 0.8, zoom: 0.6 },
      exit: { x: WX - 0.4, z: -7.6 },
      update(dt, t) {
        const l = st.laser;
        l.t += dt;
        l.hold -= dt;
        if (l.hold <= 0 && !l.moving) {
          l.moving = true;
          l.fx = l.x;
          l.fz = l.z;
          l.tx = WX - 1.5 + r() * 2.8;
          l.tz = -7.7 + r() * 3.6;
          l.mt = 0;
          l.dur = 0.25 + r() * 0.5;
        }
        if (l.moving) {
          l.mt += dt / l.dur;
          const k = Math.min(1, l.mt);
          const e = k * k * (3 - 2 * k);
          l.x = l.fx + (l.tx - l.fx) * e + Math.sin(k * P) * 0.2;
          l.z = l.fz + (l.tz - l.fz) * e;
          if (k >= 1) {
            l.moving = false;
            l.hold = 0.8 + r() * 1.4;
            l.pounce = 0;
          }
        }
        dot.position.set(l.x, 0.012, l.z);
        dotGlow.position.set(l.x, 0.03, l.z);
        dotGlow.material.opacity = 0.6 + Math.sin(t * 20) * 0.2;
        // Beam from the player's hand
        const hand = a.local(a.player.kid.handWorld(1));
        const to = new THREE.Vector3(l.x, 0.02, l.z);
        const mid = hand.clone().add(to).multiplyScalar(0.5);
        beam.position.copy(mid);
        beam.scale.set(1, hand.distanceTo(to), 1);
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(hand).normalize());
      },
      onEnd() {
        st.laser = null;
        dot.visible = dotGlow.visible = beam.visible = false;
        R.cat.release();
      },
    });
    if (!spec) return;
    dot.visible = dotGlow.visible = beam.visible = true;
    // Mishmish stalks the dot, wiggles, and pounces when it stops
    R.cat.hold(
      (t, dt) => {
        const l = st.laser;
        if (!l) return { x: WX, z: -6.5 };
        const cx = R.cat.pos.x;
        const cz = R.cat.pos.z;
        const d = Math.hypot(l.x - cx, l.z - cz);
        if (!l.moving) {
          l.pounce += dt || 0.016;
          if (l.pounce > 0.7 && l.pounce < 1.3) {
            const k = (l.pounce - 0.7) / 0.6;
            if (k > 0.95 && !l.done) {
              l.done = true;
              l.pounces++;
              if (l.pounces % 3 === 1) R.cat.meow('Mrrp!');
              if (l.pounces === 2) a.toast(`<b>${a.playerId === 'roji' ? 'Homama' : 'Roji'}:</b> She almost got it!`, 2000);
              a.sound.ui('pop');
            }
            return { x: l.x, z: l.z + 0.1, y: Math.sin(k * P) * 0.3, speed: 4.5 };
          }
          l.done = false;
          return { x: l.x + (d > 0.6 ? 0 : 0), z: l.z + 0.45, crouch: d < 0.9 ? 1 : 0, speed: 2.2 };
        }
        return { x: l.x, z: l.z + 0.4, speed: 3.4 };
      },
      { x: WX, z: -6.6 },
    );
    a.toast('Where is the red dot, Mishmish?', 2400);
  }

  R.hot(
    { x: PX - 0.9, z: -6.9, r: 1.3, label: 'Water the plants', icon: 'drop', act: water },
    { x: WX - 0.4, z: -7.7, r: 1.15, label: 'Read in the window nook', icon: 'book', act: read },
    { x: WX - 1.55, z: -6.0, r: 1.15, label: 'Play laser with Mishmish', icon: 'paw', act: laser },
  );

  R.upd((dt, t) => {
    if (rain.visible) {
      rainMap.offset.y += dt * 0.6;
      rainMap.offset.x = Math.sin(t * 0.3) * 0.02;
      if (!R.is('read')) rain.visible = false;
    }
  });
  R.onEnter(() => {
    st.rain = Math.random() < 0.35;
    const gr = api.load('plants', [0, 0, 0]);
    plants.forEach((p, i) => p.set(gr[i] || 0));
    for (let i = 0; i < 3; i++) growth[i] = gr[i] || 0;
  });
  R.onExit(() => {
    rain.visible = false;
    dot.visible = dotGlow.visible = beam.visible = false;
    for (const b of books) b.removeFromParent();
  });
}
