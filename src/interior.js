import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, umat, mesh, canvasTexture, roundRect, FONT, rng, heartShape } from './util.js';

// Inside Roji's home: kitchen | living room | bedroom, side by side, open at the front
// like a dollhouse. Built far from the island at ORIGIN and reached through a fade.
export const ORIGIN = new THREE.Vector3(240, 0, 0);

const box = (w, h, d, c, o) => mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? mat(c, o) : c);
const rbox = (w, h, d, c, r = 0.08, o) => mesh(new RoundedBoxGeometry(w, h, d, 3, r), typeof c === 'string' ? mat(c, o) : c);
const cyl = (a, b, h, c, seg = 16, o) => mesh(new THREE.CylinderGeometry(a, b, h, seg), typeof c === 'string' ? mat(c, o) : c);
const sph = (r, c, o, seg = 16) => mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg * 0.75)), typeof c === 'string' ? mat(c, o) : c);
const at = (o, x, y, z) => (o.position.set(x, y, z), o);

function pattern(w, h, base, draw) {
  const t = canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    draw(ctx, w, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function zTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#7b6aa8';
    ctx.lineWidth = 10;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 110px ${FONT}`;
    ctx.strokeText('Z', w / 2, h / 2 + 6);
    ctx.fillText('Z', w / 2, h / 2 + 6);
  });
}

export function buildInterior(scene, world) {
  const root = new THREE.Group();
  root.position.copy(ORIGIN);
  scene.add(root);
  const O = ORIGIN;
  const col = (c) => {
    if (c.type === 'box') world.addCollider({ ...c, x: c.x + O.x, z: c.z + O.z });
    else world.addCollider({ type: 'circle', r: c.r, x: c.x + O.x, z: c.z + O.z });
  };
  const X0 = -9.6;
  const X1 = 9.9;
  const KL = -3.2; // kitchen | living
  const LB = 3.6; // living | bedroom
  const Z0 = -4.1;
  const Z1 = 4.0;
  const WALL_H = 3.2;

  // Base and floors
  const base = box(X1 - X0 + 0.6, 0.6, Z1 - Z0 + 0.5, '#d9b38c');
  at(base, (X0 + X1) / 2, -0.3, (Z0 + Z1) / 2 + 0.1);
  base.receiveShadow = true;
  root.add(base);
  const tiles = pattern(256, 256, '#fff7ea', (ctx, w) => {
    ctx.fillStyle = '#cfe9dc';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) ctx.fillRect((i * w) / 4, (j * w) / 4, w / 4, w / 4);
  });
  tiles.repeat.set(4, 5);
  const wood = pattern(256, 256, '#e3b886', (ctx, w, h) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#dcae79' : '#e8bf8f';
      ctx.fillRect(0, (i * h) / 8, w, h / 8 - 3);
      ctx.fillStyle = 'rgba(150,100,60,0.25)';
      ctx.fillRect(((i * 97) % w), (i * h) / 8, 3, h / 8);
    }
  });
  wood.repeat.set(3, 3);
  const carpet = pattern(128, 128, '#efe4ff', (ctx, w) => {
    ctx.fillStyle = '#e2d4fb';
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      ctx.beginPath();
      ctx.arc((i + 0.5) * (w / 6), (j + 0.5) * (w / 6), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  carpet.repeat.set(6, 6);
  const floor = (x0, x1, tex) => {
    const m = mesh(new THREE.BoxGeometry(x1 - x0, 0.1, Z1 - Z0), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), { cast: false });
    at(m, (x0 + x1) / 2, -0.05, (Z0 + Z1) / 2);
    root.add(m);
  };
  floor(X0, KL, tiles);
  floor(KL, LB, wood);
  floor(LB, X1, carpet);

  // Walls with wallpaper
  const paper = (base_, dot) =>
    pattern(128, 128, base_, (ctx, w) => {
      ctx.fillStyle = dot;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        ctx.beginPath();
        ctx.arc((i + 0.5 + (j % 2) * 0.5) * (w / 4), (j + 0.5) * (w / 4), 5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  const wall = (x0, x1, tex, rx) => {
    tex.repeat.set(rx, 3);
    const m = mesh(new THREE.BoxGeometry(x1 - x0, WALL_H, 0.2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    at(m, (x0 + x1) / 2, WALL_H / 2, Z0);
    root.add(m);
    const skirt = box(x1 - x0, 0.16, 0.06, '#ffffff');
    at(skirt, (x0 + x1) / 2, 0.08, Z0 + 0.13);
    root.add(skirt);
  };
  wall(X0, KL, paper('#d7f0e3', '#bfe3d0'), 3);
  wall(KL, LB, paper('#ffe6d6', '#ffd3bd'), 4);
  wall(LB, X1, paper('#e9e0ff', '#d9cbff'), 4);
  col({ type: 'box', x: (X0 + X1) / 2, z: Z0, hw: (X1 - X0) / 2, hd: 0.2 });
  const sideMat = mat('#f6ead7', { rough: 0.9 });
  for (const x of [X0, X1]) {
    const m = box(0.2, WALL_H, Z1 - Z0, sideMat);
    at(m, x, WALL_H / 2, (Z0 + Z1) / 2);
    root.add(m);
    col({ type: 'box', x, z: (Z0 + Z1) / 2, hw: 0.15, hd: (Z1 - Z0) / 2 });
  }
  // Partitions with doorways in the middle
  const gapA = -0.4;
  const gapB = 1.8;
  for (const x of [KL, LB]) {
    for (const [z0, z1] of [[Z0, gapA], [gapB, Z1]]) {
      const m = box(0.18, 2.5, z1 - z0, sideMat);
      at(m, x, 1.25, (z0 + z1) / 2);
      root.add(m);
      col({ type: 'box', x, z: (z0 + z1) / 2, hw: 0.12, hd: (z1 - z0) / 2 });
    }
    const lintel = box(0.18, 0.4, gapB - gapA, sideMat);
    at(lintel, x, 2.3, (gapA + gapB) / 2);
    root.add(lintel);
  }
  // Front lip so nobody walks off the dollhouse
  const lip = box(X1 - X0, 0.14, 0.12, '#ffffff');
  at(lip, (X0 + X1) / 2, 0.07, Z1);
  root.add(lip);
  col({ type: 'box', x: (X0 + X1) / 2, z: Z1 + 0.1, hw: (X1 - X0) / 2, hd: 0.15 });

  // Windows on the back wall
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 128;
  skyCanvas.height = 128;
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const drawSky = (night) => {
    const ctx = skyCanvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    if (night) {
      g.addColorStop(0, '#1c2350');
      g.addColorStop(1, '#4a3d7a');
    } else {
      g.addColorStop(0, '#8fd3ff');
      g.addColorStop(1, '#e7f7ff');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = night ? '#fff6cf' : '#ffffff';
    if (night) {
      for (let i = 0; i < 18; i++) ctx.fillRect((i * 53) % 128, (i * 31) % 90, 3, 3);
      ctx.beginPath();
      ctx.arc(90, 34, 16, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(40, 40, 22, 10, 0, 0, Math.PI * 2);
      ctx.ellipse(56, 34, 16, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    skyTex.needsUpdate = true;
  };
  drawSky(false);
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex });
  const windowAt = (x, y, w, h, curtain) => {
    const frame = rbox(w + 0.2, h + 0.2, 0.1, '#ffffff', 0.04);
    at(frame, x, y, Z0 + 0.12);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), skyMat);
    at(pane, x, y, Z0 + 0.18);
    const bar = box(0.05, h, 0.04, '#ffffff');
    at(bar, x, y, Z0 + 0.2);
    root.add(frame, pane, bar);
    for (const s of [-1, 1]) {
      const c = rbox(0.32, h + 0.4, 0.08, curtain, 0.04);
      at(c, x + s * (w / 2 + 0.12), y - 0.05, Z0 + 0.24);
      root.add(c);
    }
  };
  windowAt(-8.2, 1.95, 1.2, 0.9, '#ffb3a7');
  windowAt(-0.75, 1.85, 1.1, 1.0, '#f7c6a3');
  windowAt(9.0, 1.85, 0.9, 1.0, '#c7a6ff');

  // ---------------------------------------------------------------- kitchen
  const mint = mat('#8fd3b5', { rough: 0.6 });
  const counterTop = mat('#fbfbf7', { rough: 0.3 });
  const counter = (x0, x1) => {
    const c = box(x1 - x0, 0.88, 0.8, mint);
    at(c, (x0 + x1) / 2, 0.44, Z0 + 0.5);
    const t = box(x1 - x0 + 0.06, 0.07, 0.86, counterTop);
    at(t, (x0 + x1) / 2, 0.915, Z0 + 0.5);
    root.add(c, t);
    for (let x = x0 + 0.45; x < x1; x += 0.9) {
      const k = sph(0.04, '#ffffff', { metal: 0.5, rough: 0.3 }, 8);
      at(k, x, 0.7, Z0 + 0.92);
      root.add(k);
    }
  };
  counter(-9.45, -5.2);
  col({ type: 'box', x: -7.3, z: Z0 + 0.5, hw: 2.15, hd: 0.45 });
  // Stove
  const stoveX = -6.8;
  const oven = box(0.9, 0.6, 0.05, '#3b2b3f');
  at(oven, stoveX, 0.45, Z0 + 0.92);
  const ovenGlass = box(0.6, 0.3, 0.04, mat('#ffb36b', { emissive: '#ff7a3d', ei: 0.4 }));
  at(ovenGlass, stoveX, 0.48, Z0 + 0.95);
  root.add(oven, ovenGlass);
  for (const [dx, dz] of [[-0.22, -0.18], [0.22, -0.18], [-0.22, 0.18], [0.22, 0.18]]) {
    const b = cyl(0.13, 0.13, 0.02, '#3b2b3f', 16);
    at(b, stoveX + dx, 0.96, Z0 + 0.5 + dz);
    root.add(b);
  }
  const pot = cyl(0.2, 0.18, 0.28, '#e5484d', 20);
  at(pot, stoveX - 0.22, 1.1, Z0 + 0.62);
  const lid = cyl(0.21, 0.21, 0.03, '#c93b3b', 20);
  at(lid, stoveX - 0.22, 1.25, Z0 + 0.62);
  const pan = cyl(0.18, 0.16, 0.06, '#3a3a46', 18);
  at(pan, stoveX + 0.22, 1.0, Z0 + 0.38);
  const handle = box(0.34, 0.03, 0.05, '#3a3a46');
  at(handle, stoveX + 0.55, 1.01, Z0 + 0.38);
  root.add(pot, lid, pan, handle);
  const hood = box(1.0, 0.5, 0.6, '#ffffff');
  at(hood, stoveX, 2.45, Z0 + 0.4);
  root.add(hood);
  // Sink
  const sink = box(0.7, 0.05, 0.45, '#cfd8e3', { metal: 0.5, rough: 0.3 });
  at(sink, -8.2, 0.955, Z0 + 0.5);
  const tap = mesh(new THREE.TorusGeometry(0.14, 0.025, 6, 12, Math.PI), mat('#cfd8e3', { metal: 0.7, rough: 0.2 }));
  at(tap, -8.2, 1.06, Z0 + 0.3);
  tap.rotation.y = Math.PI / 2;
  root.add(sink, tap);
  // Upper cabinets and shelf
  const upper = box(1.6, 0.7, 0.4, mint);
  at(upper, -5.9, 2.35, Z0 + 0.3);
  const shelf = box(1.2, 0.06, 0.3, '#c49464');
  at(shelf, -9.0, 2.75, Z0 + 0.25);
  root.add(upper, shelf);
  ['#ffd166', '#ef5b6f', '#7fd3ff'].forEach((c, i) => {
    const jar = cyl(0.1, 0.1, 0.22, mat(c, { rough: 0.4 }), 12);
    at(jar, -9.4 + i * 0.35, 2.89, Z0 + 0.25);
    root.add(jar);
  });
  // Fridge
  const fridge = rbox(0.95, 2.1, 0.8, '#ffe6a8', 0.1);
  at(fridge, -4.1, 1.05, Z0 + 0.5);
  const fhandle = box(0.05, 0.5, 0.06, '#ffffff');
  at(fhandle, -4.5, 1.4, Z0 + 0.93);
  const fridgeDoor = new THREE.Group();
  fridgeDoor.position.set(-3.65, 0, Z0 + 0.92);
  const fdoor = rbox(0.93, 1.2, 0.06, '#ffd98a', 0.04);
  at(fdoor, -0.465, 1.5, 0);
  fridgeDoor.add(fdoor);
  root.add(fridge, fhandle, fridgeDoor);
  for (const [x, y, c] of [[-4.0, 1.75, '#ef5b6f'], [-3.85, 1.55, '#3f7bf0'], [-4.25, 1.3, '#3fbf7f']]) {
    const mag = mesh(new THREE.ExtrudeGeometry(heartShape(0.16), { depth: 0.03, bevelEnabled: false }), mat(c));
    at(mag, x, y, Z0 + 0.96);
    fridgeDoor.add(mag);
    mag.position.sub(fridgeDoor.position);
  }
  col({ type: 'box', x: -4.1, z: Z0 + 0.5, hw: 0.5, hd: 0.45 });
  // Table and chairs
  const tX = -6.6;
  const tZ = 1.0;
  const tTop = cyl(0.8, 0.8, 0.07, '#fff3e0', 28);
  at(tTop, tX, 0.78, tZ);
  const cloth = cyl(0.82, 0.86, 0.02, mat('#ef5b6f', { rough: 0.8 }), 28);
  at(cloth, tX, 0.82, tZ);
  const tLeg = cyl(0.08, 0.1, 0.75, '#c49464', 10);
  at(tLeg, tX, 0.38, tZ);
  root.add(tTop, cloth, tLeg);
  const chairs = [];
  for (const s of [-1, 1]) {
    const seat = rbox(0.5, 0.08, 0.5, '#c49464', 0.03);
    at(seat, tX + s * 1.1, 0.48, tZ);
    const back = rbox(0.08, 0.6, 0.5, '#c49464', 0.03);
    at(back, tX + s * 1.36, 0.8, tZ);
    root.add(seat, back);
    chairs.push(new THREE.Vector3(tX + s * 1.08, 0, tZ));
  }
  const bowl = cyl(0.25, 0.15, 0.14, '#ffffff', 16);
  at(bowl, tX, 0.9, tZ);
  root.add(bowl);
  for (const [dx, dz, c] of [[-0.08, 0, '#e5484d'], [0.08, 0.05, '#ffd166'], [0, -0.09, '#7fd36b']]) {
    const f = sph(0.08, c, { rough: 0.4 }, 10);
    at(f, tX + dx, 1.0, tZ + dz);
    root.add(f);
  }
  col({ type: 'circle', x: tX, z: tZ, r: 0.9 });
  for (const s of [-1, 1]) col({ type: 'circle', x: tX + s * 1.3, z: tZ, r: 0.18 });

  // ---------------------------------------------------------------- living room
  // Front door on the back wall
  const door = rbox(1.0, 2.05, 0.1, '#a8764a', 0.05);
  at(door, -2.2, 1.03, Z0 + 0.12);
  const knob = sph(0.05, '#f4c24f', { metal: 0.6, rough: 0.3 });
  at(knob, -1.85, 1.0, Z0 + 0.2);
  const heart = mesh(new THREE.ExtrudeGeometry(heartShape(0.3), { depth: 0.04, bevelEnabled: false }), mat('#ef5b6f'));
  at(heart, -2.2, 1.45, Z0 + 0.17);
  const mat_ = rbox(1.1, 0.03, 0.7, '#ffb3a7', 0.02);
  at(mat_, -2.2, 0.015, Z0 + 0.8);
  root.add(door, knob, heart, mat_);
  // TV on a low cabinet
  const tvX = 1.0;
  const cab = rbox(2.2, 0.55, 0.5, '#c49464', 0.05);
  at(cab, tvX, 0.28, Z0 + 0.4);
  root.add(cab);
  col({ type: 'box', x: tvX, z: Z0 + 0.4, hw: 1.1, hd: 0.3 });
  const tvFrame = rbox(2.0, 1.15, 0.1, '#2a2533', 0.05);
  at(tvFrame, tvX, 1.35, Z0 + 0.15);
  root.add(tvFrame);
  const tvCanvas = document.createElement('canvas');
  tvCanvas.width = 320;
  tvCanvas.height = 180;
  const tvTex = new THREE.CanvasTexture(tvCanvas);
  tvTex.colorSpace = THREE.SRGBColorSpace;
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 1.02), new THREE.MeshBasicMaterial({ map: tvTex }));
  at(tvScreen, tvX, 1.35, Z0 + 0.21);
  root.add(tvScreen);
  const drawTv = (t, on) => {
    const ctx = tvCanvas.getContext('2d');
    const W = 320;
    const H = 180;
    if (!on) {
      ctx.fillStyle = '#26222e';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.ellipse(90, 50, 80, 30, -0.4, 0, Math.PI * 2);
      ctx.fill();
      tvTex.needsUpdate = true;
      return;
    }
    const scene_ = Math.floor(t / 8) % 3;
    const k = (t % 8) / 8;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, scene_ === 1 ? '#ffb88c' : '#1d2a5c');
    g.addColorStop(1, scene_ === 1 ? '#ff8fb1' : '#5a4a8a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff6cf';
    for (let i = 0; i < 24; i++) {
      const tw = 0.5 + 0.5 * Math.sin(t * 3 + i);
      ctx.globalAlpha = scene_ === 1 ? 0 : tw;
      ctx.fillRect((i * 67) % W, (i * 29) % 110, 2, 2);
    }
    ctx.globalAlpha = 1;
    // Moon or sun rising
    ctx.beginPath();
    ctx.arc(W * 0.75, 120 - k * 70, 22, 0, Math.PI * 2);
    ctx.fillStyle = scene_ === 1 ? '#fff1a8' : '#fff6cf';
    ctx.fill();
    // Hills
    ctx.fillStyle = scene_ === 1 ? '#7ccf6b' : '#2c4a5e';
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.quadraticCurveTo(W * 0.3, 110, W * 0.6, 140);
    ctx.quadraticCurveTo(W * 0.8, 120, W, 135);
    ctx.lineTo(W, H);
    ctx.fill();
    // Two little figures sitting on the hill
    const fx = W * 0.38;
    for (const [dx, c] of [[-10, '#ef5b6f'], [10, '#3f7bf0']]) {
      ctx.fillStyle = c;
      ctx.fillRect(fx + dx - 6, 112, 12, 14);
      ctx.fillStyle = '#2a1a13';
      ctx.beginPath();
      ctx.arc(fx + dx, 106, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    if (scene_ === 2) {
      // Hearts floating up
      for (let i = 0; i < 5; i++) {
        const hk = (k + i / 5) % 1;
        ctx.globalAlpha = 1 - hk;
        ctx.fillStyle = '#ff6b8a';
        const hx = fx + Math.sin(i * 2 + t) * 20;
        const hy = 100 - hk * 80;
        ctx.beginPath();
        ctx.moveTo(hx, hy + 6);
        ctx.bezierCurveTo(hx - 9, hy - 1, hx - 6, hy - 8, hx, hy - 3);
        ctx.bezierCurveTo(hx + 6, hy - 8, hx + 9, hy - 1, hx, hy + 6);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (scene_ === 0 && k > 0.4) {
      // Shooting star
      const sk = (k - 0.4) / 0.6;
      ctx.strokeStyle = 'rgba(255,255,255,' + (1 - sk) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40 + sk * 160, 20 + sk * 40);
      ctx.lineTo(10 + sk * 160, 8 + sk * 40);
      ctx.stroke();
    }
    tvTex.needsUpdate = true;
  };
  drawTv(0, false);

  // Sofa facing the TV
  const sofaX = 1.0;
  const sofaZ = 1.25;
  const rose = mat('#e8a3a8', { rough: 0.85 });
  const seat = rbox(2.6, 0.42, 1.0, rose, 0.14);
  at(seat, sofaX, 0.32, sofaZ);
  const back = rbox(2.6, 0.85, 0.32, rose, 0.14);
  at(back, sofaX, 0.75, sofaZ + 0.5);
  root.add(seat, back);
  for (const s of [-1, 1]) {
    const arm = rbox(0.3, 0.62, 1.05, rose, 0.12);
    at(arm, sofaX + s * 1.3, 0.5, sofaZ + 0.05);
    root.add(arm);
  }
  for (const s of [-1, 1]) {
    const pillow = rbox(0.5, 0.45, 0.16, '#fff3dc', 0.12);
    at(pillow, sofaX + s * 0.85, 0.78, sofaZ + 0.28);
    pillow.rotation.z = s * 0.15;
    root.add(pillow);
  }
  // Knitted throw over the back
  const knit = pattern(64, 64, '#f6c86b', (ctx) => {
    ctx.strokeStyle = '#e9b04f';
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 8, 0);
      ctx.lineTo(i * 8 + 4, 64);
      ctx.stroke();
    }
  });
  knit.repeat.set(3, 2);
  const throwMat = new THREE.MeshStandardMaterial({ map: knit, roughness: 1 });
  const throw_ = rbox(1.0, 0.95, 0.38, throwMat, 0.12);
  at(throw_, sofaX - 0.75, 0.8, sofaZ + 0.55);
  root.add(throw_);
  // Lap blanket for movie night
  const lapTex = pattern(64, 64, '#c7a6ff', (ctx) => {
    ctx.fillStyle = '#b593f5';
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) ctx.fillRect(i * 8, j * 8, 8, 8);
  });
  lapTex.repeat.set(4, 2);
  const lap = rbox(2.2, 0.16, 0.9, new THREE.MeshStandardMaterial({ map: lapTex, roughness: 1 }), 0.07);
  at(lap, sofaX, 0.72, sofaZ - 0.3);
  lap.visible = false;
  root.add(lap);
  col({ type: 'box', x: sofaX, z: sofaZ + 0.1, hw: 1.45, hd: 0.62 });
  const sofaSeats = [new THREE.Vector3(sofaX - 0.42, 0, sofaZ - 0.05), new THREE.Vector3(sofaX + 0.42, 0, sofaZ - 0.05)];
  // Coffee table with popcorn and cocoa
  const ct = cyl(0.5, 0.5, 0.06, '#c49464', 24);
  at(ct, sofaX, 0.42, -1.2);
  const ctLeg = cyl(0.06, 0.08, 0.4, '#a8764a', 8);
  at(ctLeg, sofaX, 0.2, -1.2);
  const popBowl = cyl(0.2, 0.13, 0.13, '#e5484d', 16);
  at(popBowl, sofaX - 0.15, 0.51, -1.2);
  root.add(ct, ctLeg, popBowl);
  const r = rng(17);
  for (let i = 0; i < 10; i++) {
    const k = sph(0.045, '#fff3cf', { flat: true }, 6);
    at(k, sofaX - 0.15 + (r() - 0.5) * 0.25, 0.6 + r() * 0.05, -1.2 + (r() - 0.5) * 0.25);
    root.add(k);
  }
  for (const dx of [0.2, 0.32]) {
    const mug = cyl(0.06, 0.055, 0.12, '#ffffff', 12);
    at(mug, sofaX + dx, 0.51, -1.1 + (dx - 0.2));
    root.add(mug);
  }
  col({ type: 'circle', x: sofaX, z: -1.2, r: 0.55 });
  // Rug
  const rugTex = canvasTexture(256, 256, (ctx, w) => {
    ctx.fillStyle = '#ffd7b8';
    ctx.beginPath();
    ctx.arc(w / 2, w / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f2a98a';
    ctx.lineWidth = 8;
    for (const rr of [0.4, 0.28, 0.16]) {
      ctx.beginPath();
      ctx.arc(w / 2, w / 2, w * rr, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.8, 40), new THREE.MeshStandardMaterial({ map: rugTex, transparent: true, roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  at(rug, sofaX, 0.012, -0.3);
  rug.receiveShadow = true;
  root.add(rug);
  // Floor lamp with a warm glow
  const lampShadeMat = umat('#fff1c9', { emissive: '#ffc977', ei: 0.9, rough: 0.6 });
  const lampPole = cyl(0.03, 0.03, 1.7, '#3b2b3f', 8);
  at(lampPole, 3.0, 0.85, -3.3);
  const lampShade = mesh(new THREE.CylinderGeometry(0.22, 0.34, 0.4, 18, 1, true), lampShadeMat);
  lampShade.material.side = THREE.DoubleSide;
  at(lampShade, 3.0, 1.85, -3.3);
  const lampBase = cyl(0.2, 0.22, 0.05, '#3b2b3f', 14);
  at(lampBase, 3.0, 0.03, -3.3);
  root.add(lampPole, lampShade, lampBase);
  col({ type: 'circle', x: 3.0, z: -3.3, r: 0.25 });
  // Plant
  const pot2 = cyl(0.28, 0.22, 0.45, '#d9734e', 14);
  at(pot2, -2.6, 0.22, 3.2);
  root.add(pot2);
  for (let i = 0; i < 5; i++) {
    const leaf = sph(0.22, '#5aa84f', { flat: true }, 8);
    leaf.scale.set(0.6, 1.4, 0.6);
    at(leaf, -2.6 + Math.cos(i * 1.3) * 0.15, 0.75 + (i % 2) * 0.15, 3.2 + Math.sin(i * 1.3) * 0.15);
    leaf.rotation.z = Math.cos(i * 1.3) * 0.5;
    root.add(leaf);
  }
  col({ type: 'circle', x: -2.6, z: 3.2, r: 0.3 });
  // Fairy lights along the back wall
  const fairy = [];
  const bulbMat = [mat('#fff1a8', { emissive: '#ffd27a', ei: 1.6 }), mat('#ffc2d6', { emissive: '#ff8fb1', ei: 1.4 })];
  for (let i = 0; i <= 22; i++) {
    const k = i / 22;
    const x = KL + 0.3 + k * (LB - KL - 0.6);
    const y = 2.85 - Math.sin(((k * 3) % 1) * Math.PI) * 0.25;
    const b = sph(0.045, bulbMat[i % 2], undefined, 8);
    at(b, x, y, Z0 + 0.16);
    root.add(b);
    fairy.push(b);
  }
  // Picture frames (filled with saved drawings when there are any)
  const frames = [];
  for (const [x, y, w, h] of [[-1.6, 2.45, 0.6, 0.5], [2.6, 2.3, 0.7, 0.55]]) {
    const f = rbox(w + 0.1, h + 0.1, 0.05, '#f4c24f', 0.02, { metal: 0.3, rough: 0.4 });
    at(f, x, y, Z0 + 0.13);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: '#fffaf1', roughness: 0.8 }));
    at(pic, x, y, Z0 + 0.165);
    root.add(f, pic);
    frames.push(pic);
  }

  // ---------------------------------------------------------------- bedroom
  const bedX = 6.9;
  const lav = mat('#c7a6e0', { rough: 0.8 });
  const bedFrame = rbox(2.7, 0.45, 3.1, '#d9b38c', 0.08);
  at(bedFrame, bedX, 0.23, Z0 + 1.65);
  const head = rbox(2.9, 1.5, 0.22, lav, 0.15);
  at(head, bedX, 0.85, Z0 + 0.2);
  const mattress = rbox(2.55, 0.18, 2.95, '#ffffff', 0.07);
  at(mattress, bedX, 0.52, Z0 + 1.65);
  root.add(bedFrame, head, mattress);
  for (const s of [-1, 1]) {
    const p = rbox(0.95, 0.2, 0.5, '#fffaf3', 0.1);
    at(p, bedX + s * 0.55, 0.7, Z0 + 0.6);
    p.rotation.x = -0.2;
    root.add(p);
  }
  const quiltTex = pattern(128, 128, '#ffc9d6', (ctx, w) => {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 5]);
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo((i * w) / 4, 0);
      ctx.lineTo((i * w) / 4, w);
      ctx.moveTo(0, (i * w) / 4);
      ctx.lineTo(w, (i * w) / 4);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = '#ff9eb5';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      ctx.beginPath();
      ctx.arc((i + 0.5) * (w / 4), (j + 0.5) * (w / 4), 5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  quiltTex.repeat.set(3, 3);
  const quilt = rbox(2.65, 0.2, 2.15, new THREE.MeshStandardMaterial({ map: quiltTex, roughness: 1 }), 0.09);
  at(quilt, bedX, 0.66, Z0 + 2.12);
  const fold = rbox(2.65, 0.14, 0.35, '#ffffff', 0.06);
  at(fold, bedX, 0.72, Z0 + 1.15);
  root.add(quilt, fold);
  col({ type: 'box', x: bedX, z: Z0 + 1.6, hw: 1.4, hd: 1.6 });
  // Teddy bear
  const bear = new THREE.Group();
  const brown = mat('#b07a4a', { rough: 0.9 });
  const bb = sph(0.18, brown);
  bb.scale.y = 1.1;
  const bh = sph(0.14, brown);
  bh.position.y = 0.26;
  bear.add(bb, bh);
  for (const s of [-1, 1]) {
    const ear = sph(0.06, brown, undefined, 8);
    ear.position.set(s * 0.1, 0.37, 0);
    bear.add(ear);
  }
  const snout = sph(0.06, '#f3dfc8', undefined, 8);
  snout.position.set(0, 0.24, 0.12);
  bear.add(snout);
  bear.position.set(bedX + 1.05, 0.85, Z0 + 3.0);
  bear.rotation.y = -0.4;
  root.add(bear);
  // Nightstands with lamps
  for (const s of [-1, 1]) {
    const ns = rbox(0.6, 0.6, 0.5, '#d9b38c', 0.05);
    at(ns, bedX + s * 1.75, 0.3, Z0 + 0.5);
    const lb = cyl(0.08, 0.1, 0.25, '#ffffff', 12);
    at(lb, bedX + s * 1.75, 0.72, Z0 + 0.5);
    const ls = mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.22, 14, 1, true), lampShadeMat);
    at(ls, bedX + s * 1.75, 0.94, Z0 + 0.5);
    root.add(ns, lb, ls);
    col({ type: 'box', x: bedX + s * 1.75, z: Z0 + 0.5, hw: 0.32, hd: 0.28 });
  }
  // Wardrobe closet
  const closet = rbox(1.3, 2.2, 0.7, '#f7d9c4', 0.06);
  at(closet, 4.5, 1.1, Z0 + 0.5);
  const cl = box(0.02, 2.0, 0.05, '#c49464');
  at(cl, 4.5, 1.1, Z0 + 0.86);
  root.add(closet, cl);
  for (const s of [-1, 1]) {
    const k = sph(0.04, '#c49464', undefined, 8);
    at(k, 4.5 + s * 0.08, 1.15, Z0 + 0.88);
    root.add(k);
  }
  col({ type: 'box', x: 4.5, z: Z0 + 0.5, hw: 0.68, hd: 0.38 });
  // Rug, slippers and a star garland
  const brug = rbox(2.2, 0.02, 1.2, '#fff3dc', 0.06);
  at(brug, bedX, 0.012, 0.6);
  root.add(brug);
  for (const [dx, c] of [[-0.5, '#ff9eb5'], [-0.25, '#ff9eb5'], [0.4, '#7fb0ff'], [0.65, '#7fb0ff']]) {
    const sl = sph(0.1, c, undefined, 10);
    sl.scale.set(0.7, 0.35, 1.3);
    at(sl, bedX + dx, 0.04, 0.95);
    root.add(sl);
  }
  const starShape = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const rr = k % 2 ? 0.05 : 0.12;
    const a = (k / 10) * Math.PI * 2 + Math.PI / 2;
    if (k === 0) starShape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else starShape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.02, bevelEnabled: false });
  const starMat = mat('#ffd166', { emissive: '#ffb200', ei: 0.5 });
  for (let i = 0; i < 7; i++) {
    const s = mesh(starGeo, starMat, { cast: false });
    at(s, LB + 0.8 + i * 0.45, 2.85 - Math.sin((i / 6) * Math.PI) * 0.3, Z0 + 0.14);
    root.add(s);
  }
  const bedSpots = [
    new THREE.Vector3(bedX - 0.5, 0.78, Z0 + 0.6 + 1.13),
    new THREE.Vector3(bedX + 0.5, 0.78, Z0 + 0.6 + 1.13),
  ];

  // Lights: always present (no shader recompiles), only bright while inside
  const livingLight = new THREE.PointLight('#ffc98a', 0, 9, 1.6);
  livingLight.position.set(3.0, 2.0, -3.0);
  const bedLight = new THREE.PointLight('#ffc98a', 0, 9, 1.6);
  bedLight.position.set(bedX, 1.5, Z0 + 1.0);
  root.add(livingLight, bedLight);

  // ZZZ sprites
  const zMat = new THREE.SpriteMaterial({ map: zTexture(), transparent: true, depthWrite: false });
  const zs = [];
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Sprite(zMat.clone());
    s.visible = false;
    root.add(s);
    zs.push({ s, ph: i / 6 });
  }
  // Steam from the pot
  const steamTex = canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  const steam = [];
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false }));
    root.add(s);
    steam.push({ s, ph: i / 4 });
  }

  const w = (x, z) => new THREE.Vector3(x + O.x, 0, z + O.z);
  const state = { movie: false, sleep: false, fridgeOpen: 0 };

  return {
    root,
    spawn: w(-2.2, Z0 + 1.2),
    bounds: { x0: O.x + X0 + 2.5, x1: O.x + X1 - 2.5, z: O.z },
    state,
    sofaSeats: sofaSeats.map((p) => p.clone().add(O)),
    sofaFacing: Math.PI,
    bedSpots: bedSpots.map((p) => p.clone().add(O)),
    chairs: chairs.map((p) => p.clone().add(O)),
    hotspots: {
      door: w(-2.2, Z0 + 1.0),
      sofa: w(sofaX, sofaZ - 0.9),
      bed: w(bedX, Z0 + 3.6),
      closet: w(4.5, Z0 + 1.3),
      stove: w(stoveX, Z0 + 1.35),
      fridge: w(-4.1, Z0 + 1.4),
      table: w(tX, tZ + 1.2),
    },
    setNight(night) {
      drawSky(night);
    },
    setDrawings(urls) {
      urls.slice(0, frames.length).forEach((url, i) => {
        const img = new Image();
        img.onload = () => {
          const tex = new THREE.Texture(img);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.needsUpdate = true;
          frames[i].material.map = tex;
          frames[i].material.needsUpdate = true;
        };
        img.src = url;
      });
    },
    setInside(inside) {
      livingLight.intensity = inside ? 6 : 0;
      bedLight.intensity = inside ? 3 : 0;
    },
    update(dt, t, inside) {
      if (!inside) return;
      if (Math.floor(t * 12) !== Math.floor((t - dt) * 12)) drawTv(t, state.movie);
      lap.visible = state.movie;
      // Tuck the quilt over the sleepers
      quilt.position.y += ((state.sleep ? 1.02 : 0.66) - quilt.position.y) * Math.min(1, dt * 6);
      fold.position.y = quilt.position.y + 0.07;
      quilt.scale.y = state.sleep ? 1.3 : 1;
      livingLight.intensity = state.movie ? 2.5 + Math.sin(t * 7) * 0.4 : state.sleep ? 0.6 : 6;
      bedLight.intensity = state.sleep ? 1.2 : 3;
      lampShadeMat.emissiveIntensity = state.sleep ? 0.4 : 0.9;
      fairy.forEach((b, i) => b.scale.setScalar(0.8 + Math.max(0, Math.sin(t * 2 + i)) * 0.5));
      for (const z of zs) {
        z.s.visible = state.sleep;
        if (!state.sleep) continue;
        const k = (t * 0.35 + z.ph) % 1;
        const who = bedSpots[Math.floor(z.ph * 6) % 2];
        z.s.position.set(who.x + 0.25 + Math.sin(k * 6 + z.ph * 9) * 0.25, who.y + 0.5 + k * 1.6, who.z - 0.9);
        z.s.scale.setScalar(0.2 + k * 0.35);
        z.s.material.opacity = Math.sin(k * Math.PI);
      }
      for (const s of steam) {
        const k = (t * 0.5 + s.ph) % 1;
        s.s.position.set(stoveX - 0.22 + Math.sin(k * 6) * 0.08, 1.35 + k * 0.9, Z0 + 0.62);
        s.s.scale.setScalar(0.15 + k * 0.4);
        s.s.material.opacity = 0.6 * Math.sin(k * Math.PI);
      }
      state.fridgeOpen = Math.max(0, state.fridgeOpen - dt);
      const open = state.fridgeOpen > 0 ? Math.min(1, state.fridgeOpen * 3, (2.2 - state.fridgeOpen) * 4) : 0;
      fridgeDoor.rotation.y = -open * 1.6;
      lid.position.y = 1.25 + Math.max(0, Math.sin(t * 9)) * 0.02;
    },
  };
}
