import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, umat, mesh, canvasTexture, roundRect, FONT, rng } from './util.js';
import { buildYumYumOutside } from './interiors/yumyum/outside.js';

// Town places that are not weekends: Roji's YumYum restaurant and the Play Park.
const box = (w, h, d, c, o) => mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? mat(c, o) : c);
const rbox = (w, h, d, c, r = 0.08) => mesh(new RoundedBoxGeometry(w, h, d, 3, r), typeof c === 'string' ? mat(c) : c);
const cyl = (a, b, h, c, seg = 16, o) => mesh(new THREE.CylinderGeometry(a, b, h, seg), typeof c === 'string' ? mat(c, o) : c);
const sph = (r, c, o, seg = 16) => mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg * 0.75)), typeof c === 'string' ? mat(c, o) : c);
const at = (o, x, y, z) => (o.position.set(x, y, z), o);

// ------------------------------------------------------------------ Roji's YumYum
// Built in src/interiors/yumyum/outside.js, next to its interior and Roji's logo theme.
export function buildYumYum(st) {
  return buildYumYumOutside(st);
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
