import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, umat, mesh, canvasTexture, roundRect, FONT, rng } from './util.js';

// Town places that are not weekends: Roji's YumYum restaurant and the Play Park.
const box = (w, h, d, c, o) => mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? mat(c, o) : c);
const rbox = (w, h, d, c, r = 0.08) => mesh(new RoundedBoxGeometry(w, h, d, 3, r), typeof c === 'string' ? mat(c) : c);
const cyl = (a, b, h, c, seg = 16, o) => mesh(new THREE.CylinderGeometry(a, b, h, seg), typeof c === 'string' ? mat(c, o) : c);
const sph = (r, c, o, seg = 16) => mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg * 0.75)), typeof c === 'string' ? mat(c, o) : c);
const at = (o, x, y, z) => (o.position.set(x, y, z), o);

function glowSprite() {
  const tex = canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
}

// ------------------------------------------------------------------ Roji's YumYum
export function buildYumYum(st) {
  const g = st.group;
  const orange = '#ff7a59';
  const cream = '#fff1d6';
  const walls = box(5.8, 3.0, 3.4, cream);
  at(walls, 0, 1.5, -0.6);
  const stripe = box(5.9, 0.9, 3.5, orange);
  at(stripe, 0, 0.45, -0.6);
  const roof = box(6.2, 0.3, 3.8, '#e85d3f');
  at(roof, 0, 3.15, -0.6);
  g.add(walls, stripe, roof);
  // Checker band under the roof
  const checker = canvasTexture(512, 32, (ctx, w, h) => {
    for (let i = 0; i < 32; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff' : '#e85d3f';
      ctx.fillRect((i * w) / 32, 0, w / 32, h / 2);
      ctx.fillStyle = i % 2 ? '#e85d3f' : '#ffffff';
      ctx.fillRect((i * w) / 32, h / 2, w / 32, h / 2);
    }
  });
  const band = mesh(new THREE.PlaneGeometry(5.8, 0.32), new THREE.MeshStandardMaterial({ map: checker, roughness: 0.7 }), { cast: false });
  at(band, 0, 2.82, 1.11);
  g.add(band);
  // Sign
  const signTex = canvasTexture(900, 260, (ctx, w, h) => {
    ctx.fillStyle = '#fff8ec';
    roundRect(ctx, 6, 6, w - 12, h - 12, 120);
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = orange;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e85d3f';
    ctx.font = `700 ${h * 0.24}px ${FONT}`;
    ctx.fillText("ROJI'S", w / 2, h * 0.3);
    ctx.fillStyle = '#6b2e1f';
    ctx.font = `700 ${h * 0.42}px ${FONT}`;
    ctx.fillText('YumYum', w / 2, h * 0.64);
  });
  const sign = mesh(new THREE.PlaneGeometry(3.4, 1.0), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6, emissive: '#ffffff', emissiveMap: signTex, emissiveIntensity: 0.2, transparent: true }), { cast: false });
  at(sign, 0, 3.9, 0.55);
  const signBack = rbox(3.5, 1.05, 0.14, '#e85d3f', 0.12);
  at(signBack, 0, 3.9, 0.46);
  const signPost = box(0.2, 0.6, 0.2, '#e85d3f');
  at(signPost, 0, 3.4, 0.46);
  g.add(signPost, signBack, sign);
  // Giant burger on the roof
  const burger = new THREE.Group();
  const bunTop = sph(0.75, '#e9a548', { rough: 0.6 }, 24);
  bunTop.scale.set(1, 0.6, 1);
  bunTop.position.y = 0.55;
  const lettuce = cyl(0.82, 0.82, 0.08, '#6cc24a', 20);
  lettuce.position.y = 0.36;
  const cheese = box(1.3, 0.05, 1.3, '#ffd23f');
  cheese.position.y = 0.3;
  cheese.rotation.y = 0.4;
  const patty = cyl(0.78, 0.78, 0.22, '#7a3f22', 20);
  patty.position.y = 0.17;
  const bunBottom = cyl(0.74, 0.7, 0.18, '#e9a548', 20);
  bunBottom.position.y = 0;
  burger.add(bunTop, lettuce, cheese, patty, bunBottom);
  const r = rng(4);
  for (let i = 0; i < 9; i++) {
    const seed = sph(0.04, '#fff6d8', undefined, 6);
    const a = r() * Math.PI * 2;
    const rr = 0.2 + r() * 0.4;
    seed.position.set(Math.cos(a) * rr, 0.55 + Math.sqrt(Math.max(0, 0.75 * 0.75 - rr * rr)) * 0.6, Math.sin(a) * rr);
    seed.scale.set(1, 0.5, 1.6);
    burger.add(seed);
  }
  burger.position.set(-2.2, 3.4, -1.2);
  g.add(burger);
  // Windows and door
  const glass = mat('#ffe7b5', { emissive: '#ffc977', ei: 0.65, rough: 0.2 });
  for (const x of [-1.8, 1.8]) {
    const frame = rbox(1.8, 1.3, 0.1, '#ffffff', 0.08);
    at(frame, x, 1.75, 1.12);
    const pane = box(1.6, 1.1, 0.06, glass);
    at(pane, x, 1.75, 1.16);
    g.add(frame, pane);
  }
  const door = rbox(1.0, 2.0, 0.1, '#e85d3f', 0.05);
  at(door, 0, 1.0, 1.13);
  const doorGlass = box(0.6, 0.7, 0.04, glass);
  at(doorGlass, 0, 1.4, 1.19);
  g.add(door, doorGlass);
  // Awning
  const stripes = canvasTexture(512, 64, (ctx, w, h) => {
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff' : orange;
      ctx.fillRect((i * w) / 12, 0, w / 12, h);
    }
  });
  const awning = mesh(new THREE.PlaneGeometry(5.6, 1.0), new THREE.MeshStandardMaterial({ map: stripes, side: THREE.DoubleSide, roughness: 0.8 }));
  at(awning, 0, 2.55, 1.5);
  awning.rotation.x = -0.95;
  g.add(awning);
  st.addCollider({ type: 'box', x: 0, z: -0.6, hw: 3.0, hd: 1.8 });

  // Outdoor tables with umbrellas
  const umbrellas = [];
  for (const [x, z, col] of [[-3.9, 2.0, orange], [3.9, 2.0, '#3fbf7f']]) {
    const top = cyl(0.55, 0.55, 0.06, '#ffffff', 20);
    at(top, x, 0.75, z);
    const leg = cyl(0.05, 0.05, 2.1, '#8d96a3', 8);
    at(leg, x, 1.05, z);
    const umb = mesh(new THREE.ConeGeometry(1.15, 0.5, 10), mat(col, { rough: 0.7 }));
    at(umb, x, 2.25, z);
    g.add(top, leg, umb);
    umbrellas.push(umb);
    for (const dx of [-0.75, 0.75]) {
      const seat = cyl(0.22, 0.22, 0.07, '#fff1d6', 14);
      at(seat, x + dx, 0.48, z);
      const sl = cyl(0.04, 0.05, 0.46, '#8d96a3', 6);
      at(sl, x + dx, 0.24, z);
      g.add(seat, sl);
    }
    st.addCollider({ type: 'circle', x, z, r: 1.0 });
    // A plate with a little burger and fries
    const plate = cyl(0.18, 0.16, 0.02, '#ffffff', 16);
    at(plate, x - 0.15, 0.79, z);
    const mini = sph(0.09, '#e9a548', undefined, 10);
    mini.scale.y = 0.6;
    at(mini, x - 0.15, 0.85, z);
    const fries = box(0.12, 0.12, 0.08, '#e5484d');
    at(fries, x + 0.2, 0.84, z + 0.05);
    g.add(plate, mini, fries);
  }
  // Giant milkshake
  const shake = new THREE.Group();
  const cup = mesh(new THREE.CylinderGeometry(0.42, 0.3, 1.0, 18), mat('#ffb3c7', { rough: 0.4 }));
  cup.position.y = 0.5;
  const cream_ = sph(0.42, '#ffffff', { rough: 0.8 }, 16);
  cream_.scale.y = 0.55;
  cream_.position.y = 1.05;
  const cherry = sph(0.1, '#e5484d', { rough: 0.3 });
  cherry.position.y = 1.32;
  const straw = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), mat('#ffffff'));
  straw.position.set(0.15, 1.35, 0);
  straw.rotation.z = -0.3;
  shake.add(cup, cream_, cherry, straw);
  shake.position.set(-3.7, 0, -0.4);
  g.add(shake);
  st.addCollider({ type: 'circle', x: -3.7, z: -0.4, r: 0.5 });

  const steam = [];
  for (let i = 0; i < 4; i++) {
    const s = glowSprite();
    g.add(s);
    steam.push(s);
  }
  return {
    badgeY: 5.5,
    dynamic: [burger, ...umbrellas],
    update(dt, t, near) {
      burger.rotation.y = t * 0.5;
      burger.position.y = 3.4 + Math.sin(t * 2) * 0.08;
      steam.forEach((s, i) => {
        const k = (t * 0.4 + i / steam.length) % 1;
        s.position.set(1.8 + Math.sin(k * 5 + i) * 0.2, 3.3 + k * 1.4, -1.6);
        s.scale.setScalar(0.3 + k * 0.6);
        s.material.opacity = 0.55 * (1 - k) * (0.5 + near * 0.5);
      });
    },
  };
}

// ------------------------------------------------------------------ Play Park
export function buildPlaza(st) {
  const g = st.group;
  const teal = '#21a99a';
  const plaza = mesh(new THREE.CylinderGeometry(5.2, 5.3, 0.08, 48), mat('#efe6d6', { rough: 0.95 }), { cast: false });
  at(plaza, 0, 0.04, 0);
  g.add(plaza);
  const ringTex = canvasTexture(512, 512, (ctx, w) => {
    ctx.strokeStyle = '#d9cbb4';
    ctx.lineWidth = 10;
    for (const r of [0.48, 0.36]) {
      ctx.beginPath();
      ctx.arc(w / 2, w / 2, w * r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(w / 2 + Math.cos(a) * w * 0.36, w / 2 + Math.sin(a) * w * 0.36);
      ctx.lineTo(w / 2 + Math.cos(a) * w * 0.48, w / 2 + Math.sin(a) * w * 0.48);
      ctx.stroke();
    }
  });
  const decal = new THREE.Mesh(new THREE.CircleGeometry(5.1, 48), new THREE.MeshStandardMaterial({ map: ringTex, transparent: true, roughness: 1 }));
  decal.rotation.x = -Math.PI / 2;
  decal.position.y = 0.085;
  decal.receiveShadow = true;
  g.add(decal);

  // Wishing fountain
  const stone = mat('#dfe7ea', { rough: 0.6 });
  const basin = cyl(1.6, 1.75, 0.55, stone, 32);
  at(basin, -1.6, 0.3, -0.4);
  const waterMat = new THREE.MeshStandardMaterial({ color: '#7fd6e6', roughness: 0.15, emissive: '#3fb8d0', emissiveIntensity: 0.15 });
  const water = mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.05, 32), waterMat, { cast: false });
  at(water, -1.6, 0.55, -0.4);
  const pillar = cyl(0.22, 0.3, 1.2, stone, 16);
  at(pillar, -1.6, 1.0, -0.4);
  const bowl = cyl(0.75, 0.4, 0.25, stone, 24);
  at(bowl, -1.6, 1.6, -0.4);
  const top = sph(0.22, teal, { rough: 0.4 });
  at(top, -1.6, 1.95, -0.4);
  g.add(basin, water, pillar, bowl, top);
  st.addCollider({ type: 'circle', x: -1.6, z: -0.4, r: 1.8 });
  st.fountain = new THREE.Vector3(st.origin.x - 1.6, 0, st.origin.z - 0.4);
  const drops = [];
  const dropGeo = new THREE.SphereGeometry(0.05, 6, 4);
  const dropMat = new THREE.MeshBasicMaterial({ color: '#c9f3ff', transparent: true, opacity: 0.85 });
  for (let i = 0; i < 26; i++) {
    const d = new THREE.Mesh(dropGeo, dropMat);
    g.add(d);
    drops.push({ d, a: (i / 26) * Math.PI * 2, ph: (i * 0.37) % 1 });
  }
  const coins = [];
  const r = rng(9);
  for (let i = 0; i < 7; i++) {
    const c = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 12), mat('#f4c24f', { metal: 0.7, rough: 0.3 }), { cast: false });
    const a = r() * Math.PI * 2;
    const rr = 0.5 + r() * 0.8;
    at(c, -1.6 + Math.cos(a) * rr, 0.585, -0.4 + Math.sin(a) * rr);
    g.add(c);
    coins.push(c);
  }

  // Dance floor that lights up
  const tiles = [];
  const N = 4;
  const size = 0.75;
  const fx = 2.2;
  const fz = -0.6;
  const cols = ['#ff8fb1', '#ffd166', '#7fd3ff', '#b9a6ff', '#7fe0b0'];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const m = umat(cols[(i + j) % cols.length], { emissive: cols[(i + j) % cols.length], ei: 0.25, rough: 0.3 });
      const tile = mesh(new RoundedBoxGeometry(size - 0.05, 0.1, size - 0.05, 2, 0.03), m, { cast: false });
      at(tile, fx + (i - (N - 1) / 2) * size, 0.1, fz + (j - (N - 1) / 2) * size);
      g.add(tile);
      tiles.push({ m, i, j, mesh: tile });
    }
  }
  st.danceFloor = { x: st.origin.x + fx, z: st.origin.z + fz, half: (N * size) / 2 };
  // Speakers
  const speakers = [];
  for (const sx of [fx - 1.95, fx + 1.95]) {
    const sp = rbox(0.6, 1.1, 0.5, '#3b2b3f', 0.06);
    at(sp, sx, 0.6, fz - 1.1);
    const cone1 = cyl(0.18, 0.18, 0.04, '#8b8199', 16);
    cone1.rotation.x = Math.PI / 2;
    at(cone1, sx, 0.8, fz - 0.84);
    const cone2 = cyl(0.11, 0.11, 0.04, '#8b8199', 16);
    cone2.rotation.x = Math.PI / 2;
    at(cone2, sx, 0.38, fz - 0.84);
    g.add(sp, cone1, cone2);
    speakers.push(cone1, cone2);
    st.addCollider({ type: 'circle', x: sx, z: fz - 1.1, r: 0.4 });
  }

  // Arcade kiosk
  const kiosk = new THREE.Group();
  const kb = rbox(1.6, 2.0, 1.1, teal, 0.08);
  kb.position.y = 1.0;
  const screenTex = canvasTexture(256, 192, (ctx, w, h) => {
    ctx.fillStyle = '#20203a';
    ctx.fillRect(0, 0, w, h);
    const cs = ['#ff8fb1', '#ffd166', '#7fd3ff', '#b9a6ff'];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        ctx.fillStyle = cs[(i + j) % 4];
        roundRect(ctx, 22 + i * 54, 22 + j * 52, 44, 42, 8);
        ctx.fill();
      }
    }
  });
  const screen = mesh(new THREE.PlaneGeometry(1.1, 0.8), new THREE.MeshStandardMaterial({ map: screenTex, emissive: '#ffffff', emissiveMap: screenTex, emissiveIntensity: 0.6 }), { cast: false });
  screen.position.set(0, 1.35, 0.56);
  const label = canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#ffd166';
    roundRect(ctx, 4, 4, w - 8, h - 8, 40);
    ctx.fill();
    ctx.fillStyle = '#3b2b3f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${h * 0.55}px ${FONT}`;
    ctx.fillText('ARCADE', w / 2, h / 2 + 4);
  });
  const lab = mesh(new THREE.PlaneGeometry(1.4, 0.35), new THREE.MeshStandardMaterial({ map: label, transparent: true, emissive: '#ffffff', emissiveMap: label, emissiveIntensity: 0.3 }), { cast: false });
  lab.position.set(0, 2.25, 0.56);
  const buttons = [];
  for (const [x, c] of [[-0.25, '#e5484d'], [0, '#ffd166'], [0.25, '#3f7bf0']]) {
    const b = sph(0.06, c, { emissive: c, ei: 0.4 }, 10);
    b.position.set(x, 0.85, 0.6);
    kiosk.add(b);
    buttons.push(b);
  }
  kiosk.add(kb, screen, lab);
  kiosk.position.set(-1.2, 0, -3.6);
  kiosk.rotation.y = 0.25;
  g.add(kiosk);
  st.addCollider({ type: 'circle', x: -1.2, z: -3.6, r: 0.9 });

  // Balloon cart
  const balloons = [];
  const cart = rbox(1.0, 0.6, 0.6, '#ffffff', 0.08);
  at(cart, 4.2, 0.55, 2.4);
  g.add(cart);
  for (const sx of [-0.35, 0.35]) {
    const wheel = cyl(0.2, 0.2, 0.08, '#3b2b3f', 14);
    wheel.rotation.x = Math.PI / 2;
    at(wheel, 4.2 + sx, 0.2, 2.72);
    g.add(wheel);
  }
  ['#ff8fb1', '#ffd166', '#7fd3ff', '#b9a6ff', '#ef5b6f'].forEach((c, i) => {
    const b = new THREE.Group();
    const ball = sph(0.24, c, { rough: 0.25 }, 14);
    ball.scale.y = 1.15;
    ball.position.y = 1.0;
    const string = cyl(0.005, 0.005, 1.0, '#ffffff', 4);
    string.position.y = 0.45;
    b.add(ball, string);
    b.position.set(4.0 + (i - 2) * 0.16, 0.85, 2.4 + ((i % 2) - 0.5) * 0.2);
    g.add(b);
    balloons.push({ b, ph: i * 1.3 });
  });
  st.addCollider({ type: 'box', x: 4.2, z: 2.4, hw: 0.55, hd: 0.35 });

  // Benches
  for (const [x, z, ry] of [[-4.2, 1.8, 0.5], [0.4, 3.9, 0]]) {
    const seat = rbox(1.6, 0.1, 0.45, '#9b6a43', 0.03);
    at(seat, x, 0.45, z);
    seat.rotation.y = ry;
    const back = rbox(1.6, 0.4, 0.08, '#9b6a43', 0.03);
    at(back, x - Math.sin(ry) * 0.2, 0.72, z - Math.cos(ry) * 0.2);
    back.rotation.y = ry;
    g.add(seat, back);
    st.addCollider({ type: 'circle', x, z, r: 0.75 });
  }

  let beat = 0;
  return {
    badgeY: 4.6,
    dynamic: [...tiles.map((t) => t.mesh), ...drops.map((d) => d.d), ...balloons.map((b) => b.b), ...speakers, kiosk],
    update(dt, t, near) {
      for (const d of drops) {
        const k = (t * 0.9 + d.ph) % 1;
        const rad = 0.25 + k * 1.0;
        d.d.position.set(-1.6 + Math.cos(d.a) * rad, 1.75 + Math.sin(k * Math.PI) * 0.5 - k * 1.1, -0.4 + Math.sin(d.a) * rad);
      }
      beat += dt * (st.dancing ? 2.4 : 0.6);
      const step = Math.floor(beat * 2);
      for (const tl of tiles) {
        const on = st.dancing ? (tl.i + tl.j + step) % 3 === 0 : (tl.i * 3 + tl.j + step) % 7 === 0;
        tl.m.emissiveIntensity += ((on ? (st.dancing ? 1.6 : 0.8) : 0.15) - tl.m.emissiveIntensity) * Math.min(1, dt * 10);
      }
      const pump = st.dancing ? 1 + Math.max(0, Math.sin(t * 15)) * 0.25 : 1;
      for (const s of speakers) s.scale.set(pump, 1, pump);
      for (const { b, ph } of balloons) {
        b.rotation.z = Math.sin(t * 1.2 + ph) * 0.12;
        b.rotation.x = Math.cos(t * 1.0 + ph) * 0.08;
      }
      void near;
    },
  };
}
