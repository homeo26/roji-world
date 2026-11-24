import * as THREE from 'three';
import { COL, box, rbox, cyl, sph, at, mat, umat, mesh, canvasTexture, roundRect, FONT, glowSprite, pattern, cityWindowTex, neonTex, makeDuck, makePlant, makeMug, planeTex, trimShadows, Atlas } from './kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildDesk } from './desk.js';

// Inside the Tech Studio, open at the front like a dollhouse:
//   lounge with the coffee corner, ping-pong and bean bags | open office with Homama's desk | meeting room.

const X0 = -15;
const X1 = 15;
const Z0 = -5;
const Z1 = 5;
const WALL_H = 3.2;
const LO = -6; // lounge | office
const OM = 6; // office | meeting room

// Coworkers share a small palette so their baked meshes merge into few draw calls.
const LOOKS = {
  ana: { name: 'Coworker', gender: 'girl', skin: '#e3b08e', hair: '#7a4a26', hairstyle: 'ponytail', outfit: 'hoodie', top: '#7fd3a7', bottom: '#2c3e66', shoes: '#ffffff', accent: '#ffd166' },
  ben: { name: 'Coworker', gender: 'boy', skin: '#9c6a4a', hair: '#141010', hairstyle: 'curly', outfit: 'tee-pants', top: '#ffd166', bottom: '#2c3e66', shoes: '#ffffff', accent: '#ffd166' },
  cleo: { name: 'Coworker', gender: 'girl', skin: '#e3b08e', hair: '#141010', hairstyle: 'bob', outfit: 'hoodie', top: '#c7a6ff', bottom: '#2c3e66', shoes: '#ffffff', accent: '#ffd166' },
  dev: { name: 'Coworker', gender: 'boy', skin: '#e3b08e', hair: '#7a4a26', hairstyle: 'spiky', outfit: 'tee-pants', top: '#7fd3a7', bottom: '#2c3e66', shoes: '#ffffff', accent: '#ffd166' },
  eve: { name: 'Coworker', gender: 'girl', skin: '#9c6a4a', hair: '#141010', hairstyle: 'buns', outfit: 'hoodie', top: '#ffd166', bottom: '#2c3e66', shoes: '#ffffff', accent: '#ffd166' },
  fin: { name: 'Coworker', gender: 'boy', skin: '#9c6a4a', hair: '#7a4a26', hairstyle: 'sidepart', outfit: 'tee-pants', top: '#c7a6ff', bottom: '#2c3e66', shoes: '#ffffff', accent: '#ffd166' },
};

const tone = (api, f, d, o) => {
  const s = api.sound;
  if (s?.ctx && !s.muted) s.tone(f, s.ctx.currentTime, d, o);
};

export function buildTechInterior(ctx) {
  const g = new THREE.Group();
  const dynamic = [];
  const atlas = new Atlas(2048, { height: 1536 });
  const colliders = [];
  const hotspots = [];
  const col = (x, z, hw, hd, h) => colliders.push(h === undefined ? { type: 'box', x, z, hw, hd } : { type: 'box', x, z, hw, hd, h });
  const add = (...o) => (g.add(...o), o[0]);

  // ---------------------------------------------------------------- shell
  add(at(box(X1 - X0 + 0.6, 0.6, Z1 - Z0 + 0.6, mat(COL.wood)), 0, -0.33, 0.1));
  const planks = pattern(256, 256, '#e8c497', (c, w, h) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? '#e0b987' : '#eccb9f';
      c.fillRect(0, (i * h) / 8, w, h / 8 - 3);
      c.fillStyle = 'rgba(150,100,60,0.22)';
      c.fillRect((i * 97) % w, (i * h) / 8, 3, h / 8);
    }
  }, 4, 3);
  const tiles = pattern(256, 256, '#fff7ea', (c, w) => {
    c.fillStyle = '#ffd9c8';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) c.fillRect((i * w) / 4, (j * w) / 4, w / 4, w / 4);
  }, 3, 3);
  const carpet = pattern(128, 128, '#ece3ff', (c, w) => {
    c.fillStyle = '#dccff9';
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      c.beginPath();
      c.arc((i + 0.5) * (w / 6), (j + 0.5) * (w / 6), 3, 0, Math.PI * 2);
      c.fill();
    }
  }, 6, 6);
  const floor = (x0, x1, tex) => add(at(mesh(new THREE.BoxGeometry(x1 - x0, 0.1, Z1 - Z0), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), { cast: false }), (x0 + x1) / 2, -0.05, 0));
  floor(X0, LO, tiles);
  floor(LO, OM, planks);
  floor(OM, X1, carpet);

  const paper = (base, dot, kind) =>
    pattern(128, 128, base, (c, w) => {
      c.fillStyle = dot;
      if (kind === 'stripe') for (let i = 0; i < 4; i++) c.fillRect(i * 32 + 12, 0, 8, w);
      else
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
          c.beginPath();
          c.arc((i + 0.5 + (j % 2) * 0.5) * (w / 4), (j + 0.5) * (w / 4), 5, 0, Math.PI * 2);
          c.fill();
        }
    });
  const wall = (x0, x1, tex) => {
    tex.repeat.set((x1 - x0) / 2.2, 1.5);
    add(at(mesh(new THREE.BoxGeometry(x1 - x0, WALL_H, 0.2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })), (x0 + x1) / 2, WALL_H / 2, Z0));
    add(at(box(x1 - x0, 0.16, 0.06, COL.white), (x0 + x1) / 2, 0.08, Z0 + 0.13));
  };
  wall(X0, LO, paper('#ffe6d6', '#ffd3bd'));
  wall(LO, OM, paper('#dff3ec', '#cdebe0', 'stripe'));
  wall(OM, X1, paper('#fff3e0', '#ffe6bf'));
  col(0, Z0, 15, 0.2);
  for (const x of [X0, X1]) {
    add(at(box(0.2, WALL_H, Z1 - Z0, mat(COL.cream2)), x, WALL_H / 2, 0));
    col(x, 0, 0.15, 5);
  }
  add(at(box(X1 - X0, 0.14, 0.12, COL.white), 0, 0.07, Z1));
  col(0, Z1 + 0.1, 15, 0.15);

  // Windows on the back wall
  const skyMat = new THREE.MeshBasicMaterial({ map: cityWindowTex() });
  const windowAt = (x, y, w, h) => {
    add(at(rbox(w + 0.2, h + 0.2, 0.1, COL.white, 0.04), x, y, Z0 + 0.12));
    add(at(new THREE.Mesh(new THREE.PlaneGeometry(w, h), skyMat), x, y, Z0 + 0.18));
    add(at(box(0.05, h, 0.04, COL.white), x, y, Z0 + 0.2));
    add(at(box(w, 0.05, 0.04, COL.white), x, y, Z0 + 0.2));
    add(at(rbox(w + 0.3, 0.06, 0.2, COL.white, 0.02), x, y - h / 2 - 0.12, Z0 + 0.18));
  };
  windowAt(-8.3, 1.9, 1.8, 1.3);
  windowAt(-4.0, 1.85, 1.9, 1.3);
  windowAt(4.0, 1.85, 1.9, 1.3);
  windowAt(13.8, 1.9, 1.4, 1.2);

  // Fairy lights along the top of the office wall
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), 30);
  const m4 = new THREE.Matrix4();
  const bulbCols = ['#ffd166', '#ff9eb5', '#7fe0d0', '#c7a6ff'];
  for (let i = 0; i < 30; i++) {
    const x = LO + 0.4 + (i / 29) * (OM - LO - 0.8);
    m4.makeTranslation(x, 2.95 - Math.abs(Math.sin((i / 29) * Math.PI * 4)) * 0.22, Z0 + 0.16);
    bulbs.setMatrixAt(i, m4);
    bulbs.setColorAt(i, new THREE.Color(bulbCols[i % 4]));
  }
  bulbs.castShadow = false;
  add(bulbs);
  dynamic.push(bulbs);

  // ---------------------------------------------------------------- dividers
  // Lounge | office: a low shelf with plants on top
  const shelfMat = mat(COL.cream2);
  const woodTop = mat('#c49464');
  for (const [z0, z1] of [[Z0 + 0.1, -1.1], [1.5, 4.4]]) {
    const len = z1 - z0;
    add(at(rbox(0.36, 1.0, len, shelfMat, 0.04), LO, 0.5, (z0 + z1) / 2));
    add(at(rbox(0.42, 0.06, len + 0.04, woodTop, 0.02), LO, 1.03, (z0 + z1) / 2));
    for (let z = z0 + 0.45; z < z1 - 0.2; z += 0.9) {
      const p = makePlant(((z * 10) | 0) % 2 ? 'round' : 'succulent', 0.42, ((z * 10) | 0) % 2 ? COL.white : COL.pot);
      p.position.set(LO, 1.06, z);
      add(p);
    }
    col(LO, (z0 + z1) / 2, 0.2, len / 2, 1.06);
  }
  // Office | meeting room: glass with white posts
  const glassMat = new THREE.MeshStandardMaterial({ color: '#c9eef5', transparent: true, opacity: 0.28, roughness: 0.1, depthWrite: false });
  const postMat = mat(COL.white);
  for (const [z0, z1] of [[Z0 + 0.1, -0.9], [1.4, 4.4]]) {
    const glass = mesh(new THREE.BoxGeometry(0.04, 2.5, z1 - z0), glassMat, { cast: false });
    add(at(glass, OM, 1.3, (z0 + z1) / 2));
    dynamic.push(glass);
    for (let z = z0; z <= z1 + 0.01; z += (z1 - z0) / Math.max(1, Math.round((z1 - z0) / 1.3))) add(at(box(0.1, 2.6, 0.1, postMat), OM, 1.3, z));
    add(at(box(0.12, 0.1, z1 - z0, postMat), OM, 0.05, (z0 + z1) / 2));
    col(OM, (z0 + z1) / 2, 0.1, (z1 - z0) / 2);
  }
  add(at(box(0.14, 0.12, Z1 - Z0 - 0.5, postMat), OM, 2.62, -0.25));
  // Room name on the glass by the door
  const roomTex = atlas.add(256, 96, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffd166';
    roundRect(c, 4, 4, w - 8, h - 8, 40);
    c.fill();
    c.fillStyle = '#6b4a12';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 34px ${FONT}`;
    c.fillText('Sunflower room', w / 2, h / 2 + 2);
  });
  const roomSign = atlas.plane(0.9, 0.34, roomTex);
  roomSign.rotation.y = -Math.PI / 2;
  add(at(roomSign, OM - 0.07, 1.75, -1.45));

  // ---------------------------------------------------------------- lounge: coffee corner
  // Snack fridge
  const fx = -14.35;
  add(at(rbox(0.9, 1.8, 0.7, mat('#ffffff'), 0.06), fx, 0.9, -4.45));
  const drinksTex = atlas.add(128, 256, (c, w, h) => {
    c.fillStyle = '#dff4ff';
    c.fillRect(0, 0, w, h);
    const bottles = ['#ef5b6f', '#ffd166', '#7fd3a7', '#6fb8ff', '#ff9eb5'];
    for (let r = 0; r < 4; r++) {
      c.fillStyle = '#c4dbe8';
      c.fillRect(0, r * 64 + 58, w, 6);
      for (let i = 0; i < 5; i++) {
        c.fillStyle = bottles[(i + r) % 5];
        roundRect(c, 8 + i * 23, r * 64 + 18, 16, 40, 6);
        c.fill();
        c.fillRect(12 + i * 23, r * 64 + 10, 8, 10);
      }
    }
  });
  add(at(atlas.plane(0.7, 1.5, drinksTex), fx, 0.95, -4.09));
  add(at(box(0.04, 0.5, 0.05, COL.steel), fx + 0.3, 1.1, -4.06));
  // Counter
  const cx0 = -13.8;
  const cx1 = -10.2;
  const ccx = (cx0 + cx1) / 2;
  add(at(box(cx1 - cx0, 0.84, 0.72, mat(COL.mint)), ccx, 0.42, -4.5));
  add(at(rbox(cx1 - cx0 + 0.06, 0.07, 0.8, mat('#fdfbf7'), 0.02), ccx, 0.875, -4.48));
  for (let x = cx0 + 0.45; x < cx1; x += 0.9) {
    add(at(rbox(0.8, 0.66, 0.04, mat('#a6e0c6'), 0.02), x, 0.42, -4.13));
    add(at(sph(0.03, COL.steel, { metal: 0.5, rough: 0.3 }, 8), x + 0.28, 0.6, -4.1));
  }
  col(-12.3, -4.45, 2.6, 0.45);
  // Shelves with mugs and jars
  for (const y of [1.75, 2.25]) add(at(rbox(2.2, 0.05, 0.26, woodTop, 0.02), -12.7, y, -4.78));
  const mugCols = [COL.coral, COL.sun, COL.teal, COL.coral, COL.sun, COL.teal];
  mugCols.forEach((c, i) => {
    const m = makeMug(c, COL.white, 1.4);
    m.position.set(-13.6 + i * 0.36, 1.78, -4.76);
    m.rotation.y = -0.6;
    add(m);
  });
  const jarMat = mat('#c6ecff');
  [[-13.5, COL.sun], [-12.9, '#8a5a3c'], [-12.3, COL.pink]].forEach(([x, c]) => {
    add(at(cyl(0.12, 0.12, 0.26, jarMat, 14), x, 2.41, -4.76));
    add(at(cyl(0.1, 0.1, 0.16, c, 12), x, 2.37, -4.76));
    add(at(cyl(0.13, 0.13, 0.04, COL.woodDark, 14), x, 2.56, -4.76));
  });
  add(at(makePlant('round', 0.36, COL.white), -11.8, 2.28, -4.78));
  // Chalkboard menu
  const menuTex = atlas.add(256, 200, (c, w, h) => {
    c.fillStyle = '#3d4a44';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#c49464';
    c.lineWidth = 12;
    c.strokeRect(0, 0, w, h);
    c.fillStyle = '#fff6e0';
    c.textAlign = 'center';
    c.font = `600 30px ${FONT}`;
    c.fillText('Coffee', w / 2, 44);
    c.font = `500 21px ${FONT}`;
    c.textAlign = 'left';
    ['Latte', 'Hot cocoa', 'Mint tea', 'Hugs: free'].forEach((t, i) => {
      c.fillStyle = i === 3 ? '#ff9eb5' : '#fff6e0';
      c.fillText(t, 30, 82 + i * 28);
    });
  });
  add(at(atlas.plane(0.95, 0.74, menuTex), -10.85, 1.95, -4.88));
  // Espresso machine
  const mx = -12.55;
  const machine = new THREE.Group();
  machine.add(at(rbox(0.56, 0.46, 0.42, mat(COL.teal), 0.05), 0, 0.23, 0));
  machine.add(at(rbox(0.58, 0.05, 0.44, mat(COL.steel, { metal: 0.7, rough: 0.25 }), 0.02), 0, 0.48, 0));
  machine.add(at(box(0.4, 0.03, 0.18, mat(COL.steel, { metal: 0.7, rough: 0.25 })), 0, 0.03, 0.2));
  machine.add(at(cyl(0.05, 0.05, 0.07, mat(COL.steel, { metal: 0.7, rough: 0.25 }), 12), 0, 0.3, 0.23));
  const handle = box(0.03, 0.03, 0.16, mat(COL.ink));
  machine.add(at(handle, 0, 0.27, 0.32));
  for (const s of [-1, 1]) {
    const gauge = cyl(0.045, 0.045, 0.02, mat(COL.white), 14);
    gauge.rotation.x = Math.PI / 2;
    machine.add(at(gauge, s * 0.17, 0.36, 0.215));
  }
  const brewLight = sph(0.025, umat('#7fff9e', { emissive: '#7fff9e', ei: 0.6 }), undefined, 8);
  machine.add(at(brewLight, 0.17, 0.14, 0.215));
  dynamic.push(brewLight);
  const brewCup = makeMug(COL.white, COL.coral, 1.2);
  machine.add(at(brewCup, 0, 0.045, 0.2));
  machine.position.set(mx, 0.91, -4.5);
  add(machine);
  const steam = [];
  for (let i = 0; i < 3; i++) {
    const s = glowSprite('#ffffff', 0.2);
    add(s);
    steam.push(s);
    dynamic.push(s);
  }
  // Grinder, donut stand under a glass dome, fruit bowl
  add(at(cyl(0.09, 0.11, 0.3, COL.ink, 12), -13.25, 1.06, -4.5));
  add(at(mesh(new THREE.ConeGeometry(0.12, 0.2, 12), jarMat), -13.25, 1.31, -4.5)).rotation.x = Math.PI;
  add(at(sph(0.08, '#8a5a3c', undefined, 10), -13.25, 1.31, -4.5));
  add(at(cyl(0.22, 0.22, 0.02, COL.white, 18), -11.5, 1.06, -4.45));
  add(at(cyl(0.03, 0.06, 0.13, COL.white, 10), -11.5, 0.98, -4.45));
  const donutGeo = new THREE.TorusGeometry(0.06, 0.03, 8, 14);
  [[COL.pink, -0.08, 0], [COL.sun, 0.08, 0.02], ['#8a5a3c', 0, -0.09]].forEach(([c, dx, dz]) => {
    const d = mesh(donutGeo, mat(c));
    d.rotation.x = Math.PI / 2;
    add(at(d, -11.5 + dx, 1.1, -4.45 + dz));
  });
  const dome = mesh(new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#e8f8ff', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false }), { cast: false });
  add(at(dome, -11.5, 1.07, -4.45));
  dynamic.push(dome);
  add(at(cyl(0.2, 0.13, 0.1, COL.white, 16), -10.65, 0.96, -4.5));
  [[COL.coral, -0.06, 0], [COL.sun, 0.07, 0.03], [COL.leaf, 0, -0.07]].forEach(([c, dx, dz]) => add(at(sph(0.07, c, undefined, 10), -10.65 + dx, 1.05, -4.5 + dz)));

  // ---------------------------------------------------------------- lounge: ping-pong
  const tx = -10.5;
  const tz = 0.35;
  const TH = 0.68;
  const ppTex = atlas.add(512, 280, (c, w, h) => {
    c.fillStyle = '#2f7fb8';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 8;
    c.strokeRect(6, 6, w - 12, h - 12);
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(0, h / 2);
    c.lineTo(w, h / 2);
    c.stroke();
  });
  add(at(box(2.2, 0.05, 1.2, mat(COL.navy)), tx, TH, tz));
  const ppTop = atlas.plane(2.2, 1.2, ppTex);
  ppTop.rotation.x = -Math.PI / 2;
  add(at(ppTop, tx, TH + 0.026, tz));
  for (const sx of [-0.85, 0.85]) for (const sz of [-0.45, 0.45]) add(at(cyl(0.035, 0.035, TH, COL.ink, 8), tx + sx, TH / 2, tz + sz));
  const netTex = canvasTexture(128, 32, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.lineWidth = 2;
    for (let i = 0; i <= w; i += 8) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i, h);
      c.stroke();
    }
    for (let j = 0; j <= h; j += 8) {
      c.beginPath();
      c.moveTo(0, j);
      c.lineTo(w, j);
      c.stroke();
    }
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, 5);
  });
  const net = mesh(new THREE.PlaneGeometry(1.3, 0.16), new THREE.MeshBasicMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide }), { cast: false });
  net.rotation.y = Math.PI / 2;
  add(at(net, tx, TH + 0.1, tz));
  dynamic.push(net);
  for (const s of [-1, 1]) add(at(cyl(0.015, 0.015, 0.2, COL.ink, 6), tx, TH + 0.1, tz + s * 0.64));
  col(tx, tz, 1.1, 0.6, TH + 0.03);
  const paddle = (color) => {
    const p = new THREE.Group();
    const blade = cyl(0.11, 0.11, 0.015, color, 18);
    blade.rotation.x = Math.PI / 2;
    blade.position.y = 0.14;
    const grip = box(0.035, 0.1, 0.02, mat(COL.woodDark));
    grip.position.y = 0.03;
    p.add(blade, grip);
    return p;
  };
  const restPaddles = new THREE.Group();
  const rp1 = paddle(COL.sun);
  rp1.rotation.x = -Math.PI / 2;
  rp1.position.set(tx - 0.6, TH + 0.035, tz + 0.2);
  const rp2 = paddle(COL.blue);
  rp2.rotation.set(-Math.PI / 2, 0, 2.6);
  rp2.position.set(tx + 0.6, TH + 0.035, tz - 0.15);
  restPaddles.add(rp1, rp2);
  add(restPaddles);
  dynamic.push(restPaddles);
  const ball = sph(0.035, umat('#fff6e0', { rough: 0.3, emissive: '#fff0c0', ei: 0.3 }), undefined, 10);
  ball.visible = false;
  add(ball);
  dynamic.push(ball);

  // ---------------------------------------------------------------- lounge: bean bags and fun
  const rugTex = atlas.add(256, 256, (c, w) => {
    c.fillStyle = '#ffd9e4';
    c.fillRect(0, 0, w, w);
    for (let r = 100; r > 10; r -= 26) {
      c.strokeStyle = r % 52 ? '#ffb8cb' : '#fff1f5';
      c.lineWidth = 9;
      c.beginPath();
      c.arc(w / 2, w / 2, r, 0, Math.PI * 2);
      c.stroke();
    }
  });
  const rug = mesh(atlas.fit(new THREE.CircleGeometry(1.45, 40), rugTex), atlas.material, { cast: false });
  rug.rotation.x = -Math.PI / 2;
  add(at(rug, -13.2, 0.012, 3.0));
  const bagSpots = [[-13.85, 2.75, COL.coral], [-12.7, 2.75, COL.sun], [-11.8, 3.65, COL.mint]];
  for (const [x, z, c] of bagSpots) {
    const m = mat(c);
    const bag = mesh(new THREE.SphereGeometry(0.46, 18, 12), m);
    bag.scale.set(1, 0.5, 1);
    add(at(bag, x, 0.23, z));
    const back = mesh(new THREE.SphereGeometry(0.34, 14, 10), m);
    back.scale.set(1.15, 0.85, 0.6);
    add(at(back, x, 0.44, z - 0.3));
    colliders.push({ type: 'circle', x, z, r: 0.42, h: 0.4 });
  }
  add(at(cyl(0.36, 0.36, 0.06, COL.white, 20), -13.25, 0.3, 3.85));
  add(at(cyl(0.05, 0.08, 0.28, COL.wood, 10), -13.25, 0.14, 3.85));
  add(at(cyl(0.13, 0.09, 0.08, COL.coral, 14), -13.4, 0.37, 3.82));
  for (let i = 0; i < 7; i++) add(at(sph(0.035, COL.white, undefined, 6), -13.4 + Math.cos(i) * 0.06, 0.42 + (i % 2) * 0.02, 3.82 + Math.sin(i) * 0.06));
  const pad = new THREE.Group();
  pad.add(at(rbox(0.18, 0.04, 0.09, mat(COL.ink), 0.02), 0, 0, 0));
  pad.add(at(sph(0.015, COL.coral, undefined, 6), 0.05, 0.022, 0), at(sph(0.015, COL.sun, undefined, 6), 0.07, 0.022, 0.02), at(sph(0.018, COL.steel, undefined, 6), -0.05, 0.022, 0));
  pad.position.set(-13.05, 0.35, 3.9);
  pad.rotation.y = 0.4;
  add(pad);
  colliders.push({ type: 'circle', x: -13.25, z: 3.85, r: 0.36, h: 0.33 });
  // Arcade cabinet
  const arcade = new THREE.Group();
  arcade.add(at(rbox(0.7, 1.6, 0.6, mat(COL.lilac), 0.05), 0, 0.8, 0));
  const arcadeTex = atlas.add(128, 112, (c, w, h) => {
    c.fillStyle = '#1d1a3a';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffd166';
    c.beginPath();
    c.arc(40, 60, 16, 0.25 * Math.PI, 1.75 * Math.PI);
    c.lineTo(40, 60);
    c.fill();
    c.fillStyle = '#ff9eb5';
    for (const x of [72, 92, 112]) c.fillRect(x - 4, 56, 8, 8);
    c.fillStyle = '#7fe0d0';
    c.font = `600 16px ${FONT}`;
    c.fillText('HI 9999', 30, 22);
  });
  const arcadeScreen = atlas.plane(0.52, 0.44, arcadeTex);
  arcadeScreen.rotation.x = -0.2;
  arcade.add(at(arcadeScreen, 0, 1.18, 0.31));
  arcade.add(at(box(0.62, 0.08, 0.22, mat(COL.navy)), 0, 0.88, 0.36));
  arcade.add(at(sph(0.035, COL.coral, undefined, 8), -0.14, 0.95, 0.38), at(sph(0.03, COL.sun, undefined, 8), 0.1, 0.94, 0.4), at(sph(0.03, COL.sky, undefined, 8), 0.18, 0.94, 0.36));
  arcade.add(at(rbox(0.72, 0.22, 0.4, mat(COL.pink), 0.04), 0, 1.7, 0.08));
  arcade.position.set(-14.35, 0, -1.6);
  arcade.rotation.y = Math.PI / 2 - 0.35;
  add(arcade);
  col(-14.35, -1.6, 0.4, 0.4);
  // "Take a break" neon on the side wall
  const neon1 = planeTex(1.8, 0.56, neonTex('Take a break', '#ff9eb5', { w: 512, h: 160, heart: true }), { basic: true, transparent: true, toneMapped: false });
  neon1.rotation.y = Math.PI / 2;
  add(at(neon1, X0 + 0.12, 2.15, 1.6));
  dynamic.push(neon1);
  const bigPlant = makePlant('tall', 1.6, COL.white);
  bigPlant.position.set(-14.4, 0, 0.4);
  add(bigPlant);
  colliders.push({ type: 'circle', x: -14.4, z: 0.4, r: 0.35 });
  // Floor lamp
  add(at(cyl(0.18, 0.2, 0.04, COL.ink, 16), -14.45, 0.02, 4.3));
  add(at(cyl(0.02, 0.02, 1.7, COL.ink, 8), -14.45, 0.87, 4.3));
  add(at(mesh(new THREE.ConeGeometry(0.26, 0.3, 18, 1, true), mat('#fff3d6', { emissive: '#ffe1a0', ei: 0.5, side: THREE.DoubleSide })), -14.45, 1.8, 4.3));
  colliders.push({ type: 'circle', x: -14.45, z: 4.3, r: 0.2 });

  // ---------------------------------------------------------------- office
  const desk = buildDesk({ angled: true, atlas });
  const DX = 0;
  const DZ = -3.85;
  desk.group.position.set(DX, 0, DZ);
  add(desk.group);
  dynamic.push(...desk.dynamic);
  col(DX, DZ, desk.W / 2, desk.D / 2);
  colliders.push({ type: 'circle', x: DX + desk.kbX, z: DZ + desk.chairZ, r: 0.3 });
  const heroSeat = { x: DX + desk.seat.x, z: DZ + desk.seat.z, y: desk.seat.y, yaw: Math.PI };
  // Roji's stool beside him
  const stoolX = DX + 0.66;
  const stoolZ = DZ + desk.chairZ + 0.12;
  add(at(cyl(0.2, 0.2, 0.07, mat(COL.pink), 18), stoolX, 0.49, stoolZ));
  add(at(cyl(0.03, 0.03, 0.46, COL.steel, 8), stoolX, 0.23, stoolZ));
  add(at(cyl(0.17, 0.19, 0.03, COL.steel, 16), stoolX, 0.015, stoolZ));
  colliders.push({ type: 'circle', x: stoolX, z: stoolZ, r: 0.2, h: 0.53 });
  // Rug under the setup
  const hexRug = atlas.add(512, 360, (c, w, h) => {
    c.fillStyle = '#2fb3a5';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#3fc9ba';
    c.lineWidth = 4;
    for (let i = 0; i < 12; i++) for (let j = 0; j < 9; j++) {
      c.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        c.lineTo(i * 43 + (j % 2) * 21 + 20 + Math.cos(a) * 16, j * 43 + 20 + Math.sin(a) * 16);
      }
      c.closePath();
      c.stroke();
    }
    c.strokeStyle = '#ffffff';
    c.lineWidth = 8;
    roundRect(c, 10, 10, w - 20, h - 20, 26);
    c.stroke();
  });
  const rugTop = atlas.plane(3.4, 2.4, hexRug);
  rugTop.rotation.x = -Math.PI / 2;
  add(at(rugTop, DX, 0.012, DZ + 0.7));
  // Pegboard with a neon name above the desk
  add(at(rbox(3.0, 1.5, 0.05, mat(COL.navy), 0.06), DX, 1.95, Z0 + 0.13));
  const holes = new THREE.InstancedMesh(new THREE.CircleGeometry(0.018, 6), new THREE.MeshBasicMaterial({ color: '#25304f' }), 13 * 6);
  let hi = 0;
  for (let i = 0; i < 13; i++) for (let j = 0; j < 6; j++) {
    m4.makeTranslation(DX - 1.32 + i * 0.22, 1.35 + j * 0.22, Z0 + 0.157);
    holes.setMatrixAt(hi++, m4);
  }
  add(holes);
  dynamic.push(holes);
  const neon2 = planeTex(1.5, 0.47, neonTex('Homama', '#7fe0ff', { w: 512, h: 160 }), { basic: true, transparent: true, toneMapped: false });
  add(at(neon2, DX - 0.25, 2.32, Z0 + 0.17));
  dynamic.push(neon2);
  add(at(rbox(0.9, 0.04, 0.16, woodTop, 0.015), DX + 0.85, 1.62, Z0 + 0.24));
  add(at(makePlant('succulent', 0.2, COL.sun), DX + 0.6, 1.64, Z0 + 0.24));
  add(at(makePlant('cactus', 0.22, COL.white), DX + 1.1, 1.64, Z0 + 0.24));
  const trophy = new THREE.Group();
  trophy.add(at(cyl(0.05, 0.06, 0.04, COL.woodDark, 10), 0, 0.02, 0), at(cyl(0.012, 0.012, 0.08, mat('#f4c24f', { metal: 0.7, rough: 0.3 }), 6), 0, 0.08, 0), at(mesh(new THREE.CylinderGeometry(0.06, 0.03, 0.08, 14), mat('#f4c24f', { metal: 0.7, rough: 0.3 })), 0, 0.15, 0));
  add(at(trophy, DX + 0.85, 1.64, Z0 + 0.24));
  add(at(makePlant('tall', 1.3, COL.white), DX - 1.65, 0, DZ - 0.3));
  colliders.push({ type: 'circle', x: DX - 1.65, z: DZ - 0.3, r: 0.3 });
  // Backpack by the desk
  const bp = new THREE.Group();
  bp.add(at(rbox(0.36, 0.44, 0.22, mat(COL.blue), 0.08), 0, 0.22, 0), at(rbox(0.26, 0.18, 0.06, mat(COL.navy), 0.04), 0, 0.16, 0.12));
  bp.add(at(makeDuck(0.07), 0.12, 0.3, 0.12));
  bp.position.set(DX + 1.55, 0, DZ + 0.55);
  bp.rotation.y = -0.4;
  add(bp);
  // Wall clock and a poster
  const clockFace = atlas.add(128, 128, (c, w) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, w);
    c.fillStyle = '#3b2b3f';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.beginPath();
      c.arc(w / 2 + Math.sin(a) * 50, w / 2 - Math.cos(a) * 50, i % 3 ? 3 : 5, 0, Math.PI * 2);
      c.fill();
    }
  });
  add(at(cyl(0.34, 0.34, 0.06, COL.coral, 24), -2.2, 2.25, Z0 + 0.14)).rotation.x = Math.PI / 2;
  add(at(mesh(atlas.fit(new THREE.CircleGeometry(0.29, 24), clockFace), atlas.material, { cast: false }), -2.2, 2.25, Z0 + 0.175));
  const handMat = mat('#3b2b3f');
  const hourHand = new THREE.Group();
  hourHand.add(at(box(0.025, 0.15, 0.01, handMat), 0, 0.075, 0));
  const minHand = new THREE.Group();
  minHand.add(at(box(0.018, 0.23, 0.01, handMat), 0, 0.115, 0));
  add(at(hourHand, -2.2, 2.25, Z0 + 0.185), at(minHand, -2.2, 2.25, Z0 + 0.19));
  dynamic.push(hourHand, minHand);
  const posterTex = atlas.add(200, 280, (c, w, h) => {
    c.fillStyle = '#ffd166';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ef5b6f';
    c.beginPath();
    c.arc(w / 2, 110, 60, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fff';
    c.font = `700 54px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('</>', w / 2, 112);
    c.fillStyle = '#5b3a12';
    c.font = `600 28px ${FONT}`;
    c.fillText('Be kind,', w / 2, 210);
    c.fillText('write tests', w / 2, 244);
  });
  add(at(rbox(0.78, 1.06, 0.04, COL.white, 0.02), 2.25, 2.0, Z0 + 0.13));
  add(at(atlas.plane(0.68, 0.96, posterTex), 2.25, 2.0, Z0 + 0.155));

  // Coworker desks: two pods, everyone faces the room
  const npcs = [];
  const typists = [];
  const addNpc = (look, { x, z, y = 0.19, yaw = 0, pose = 'sit', hands = 'type', animate = false, after }) => {
    const k = ctx.makeKid(look);
    k.pose = pose;
    k.hands = hands;
    k.blink = 0;
    k.blinkTimer = 1e9;
    for (let i = 0; i < 40; i++) k.update(1 / 30, 0, 0, 0, 0);
    // Baked into the room: opaque cheeks and no shadow casting keep coworkers cheap
    k.root.traverse((o) => {
      if (!o.isMesh || o === k.blob) return;
      if (o.material.transparent) o.material = mat('#' + new THREE.Color(look.skin).lerp(new THREE.Color('#ff8fa0'), look.gender === 'girl' ? 0.5 : 0.32).getHexString());
      o.castShadow = false;
    });
    after?.(k);
    k.root.position.set(x, y, z);
    k.root.rotation.y = yaw;
    add(k.root);
    if (animate) {
      dynamic.push(k.arms[0], k.arms[1]);
      for (const a of k.arms) a.traverse((o) => (o.castShadow = false));
      typists.push({ k, phase: typists.length * 1.7, wave: 0 });
    }
    npcs.push(k);
    return k;
  };
  const monitorBackTex = atlas.add(128, 80, (c, w, h) => {
    c.fillStyle = '#3a3f4e';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ff9eb5';
    c.beginPath();
    c.arc(34, 30, 12, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffd166';
    roundRect(c, 64, 44, 44, 20, 10);
    c.fill();
    c.fillStyle = '#7fe0d0';
    c.beginPath();
    c.arc(96, 22, 9, 0, Math.PI * 2);
    c.fill();
  });
  const smallDesk = (x, z, chairColor) => {
    add(at(rbox(1.4, 0.05, 0.72, mat('#fdfbf7'), 0.02), x, 0.735, z));
    for (const s of [-1, 1]) add(at(rbox(0.05, 0.71, 0.6, mat(COL.teal), 0.02), x + s * 0.62, 0.355, z));
    const mon = new THREE.Group();
    mon.add(at(rbox(0.62, 0.4, 0.04, mat(COL.ink), 0.015), 0, 0, 0));
    mon.add(at(atlas.plane(0.58, 0.36, monitorBackTex), 0, 0, 0.021));
    mon.add(at(cyl(0.016, 0.016, 0.22, COL.steel, 8), 0, -0.26, 0.04));
    mon.add(at(rbox(0.2, 0.015, 0.12, mat(COL.steel), 0.006), 0, -0.36, 0.04));
    mon.position.set(x, 1.13, z + 0.1);
    add(mon);
    add(at(rbox(0.46, 0.025, 0.15, mat('#fdfbf7'), 0.01), x, 0.77, z - 0.25));
    // Office chair behind the person (-Z)
    add(at(rbox(0.46, 0.08, 0.44, mat(chairColor), 0.03), x, 0.46, z - 0.6));
    add(at(rbox(0.42, 0.5, 0.07, mat(chairColor), 0.03), x, 0.78, z - 0.84));
    add(at(cyl(0.03, 0.03, 0.36, COL.steel, 8), x, 0.24, z - 0.6));
    add(at(cyl(0.22, 0.24, 0.04, COL.ink, 12), x, 0.03, z - 0.6));
    col(x, z, 0.7, 0.36);
    colliders.push({ type: 'circle', x, z: z - 0.68, r: 0.28 });
    return { x, z: z - 0.56 };
  };
  const podZ = -1.65;
  const sA = smallDesk(-4.6, podZ, COL.coral);
  const sB = smallDesk(-3.05, podZ, COL.sun);
  const sC = smallDesk(3.05, podZ, COL.sky);
  const sD = smallDesk(4.6, podZ, COL.mint);
  addNpc(LOOKS.ana, { x: sA.x, z: sA.z, animate: true });
  addNpc(LOOKS.ben, {
    x: sB.x,
    z: sB.z,
    hands: 'read',
    after: (k) => {
      // Big headphones
      const hb = mesh(new THREE.TorusGeometry(0.33, 0.03, 6, 18, Math.PI), mat(COL.coral));
      hb.position.set(0, 0.3, 0);
      k.head.add(hb);
      for (const s of [-1, 1]) {
        const cup = cyl(0.09, 0.09, 0.07, COL.coral, 14);
        cup.rotation.z = Math.PI / 2;
        cup.position.set(s * 0.32, 0.27, 0);
        k.head.add(cup);
      }
      const tab = rbox(0.26, 0.18, 0.02, mat(COL.ink), 0.02);
      tab.position.set(0, 0.5, 0.32);
      tab.rotation.x = -0.5;
      k.body.add(tab);
    },
  });
  addNpc(LOOKS.cleo, { x: sC.x, z: sC.z, animate: true });
  addNpc(LOOKS.dev, {
    x: sD.x,
    z: sD.z,
    hands: 'hold',
    after: (k) => {
      const m = makeMug(COL.teal, COL.white, 1.3);
      m.position.set(0, -0.34, 0.02);
      m.rotation.x = Math.PI / 2;
      k.arms[1].add(m);
    },
  });

  // Printer, water cooler, poufs to hop on, a big plant
  add(at(rbox(0.7, 0.7, 0.55, mat('#fdfbf7'), 0.05), -5.2, 0.35, 0.6));
  add(at(rbox(0.72, 0.18, 0.57, mat(COL.grey), 0.04), -5.2, 0.79, 0.6));
  add(at(box(0.42, 0.02, 0.3, COL.white), -5.2, 0.89, 0.62));
  col(-5.2, 0.6, 0.36, 0.3, 0.88);
  add(at(rbox(0.42, 0.95, 0.42, mat('#fdfbf7'), 0.05), 5.3, 0.475, 0.2));
  add(at(cyl(0.17, 0.17, 0.42, jarMat, 16), 5.3, 1.16, 0.2));
  add(at(sph(0.17, jarMat, undefined, 14), 5.3, 1.37, 0.2)).scale.y = 0.4;
  add(at(box(0.06, 0.05, 0.05, COL.sky), 5.22, 0.72, 0.42), at(box(0.06, 0.05, 0.05, COL.coral), 5.38, 0.72, 0.42));
  colliders.push({ type: 'circle', x: 5.3, z: 0.2, r: 0.26 });
  for (const [x, z, c] of [[-3.5, 3.7, COL.pink], [3.5, 3.7, COL.sun], [-2.6, 4.1, COL.mint]]) {
    add(at(rbox(0.6, 0.42, 0.6, mat(c), 0.12), x, 0.21, z));
    col(x, z, 0.3, 0.3, 0.42);
  }
  add(at(makePlant('tall', 1.4, COL.white), 5.3, 0, 3.7));
  colliders.push({ type: 'circle', x: 5.3, z: 3.7, r: 0.3 });
  // Robot vacuum that wanders the office
  const vac = new THREE.Group();
  vac.add(at(cyl(0.22, 0.22, 0.08, mat('#fdfbf7'), 20), 0, 0.05, 0));
  vac.add(at(cyl(0.07, 0.07, 0.02, mat(COL.teal), 14), 0, 0.1, -0.03));
  vac.add(mesh(mergeGeometries([-1, 1].map((s) => new THREE.SphereGeometry(0.025, 8, 6).translate(s * 0.07, 0.07, 0.2))), mat('#1d130f')));
  vac.add(at(mesh(new THREE.SphereGeometry(0.04, 8, 6).scale(1.6, 0.8, 0.8), mat(COL.pink)), 0, 0.1, 0.12));
  add(vac);
  dynamic.push(vac);

  // ---------------------------------------------------------------- meeting room
  const WB = 10.4;
  add(at(rbox(3.55, 1.75, 0.06, mat(COL.grey), 0.03), WB, 1.65, Z0 + 0.13));
  add(at(atlas.plane(3.4, 1.6, atlas.named('whiteboardTex')), WB, 1.65, Z0 + 0.165));
  add(at(box(3.0, 0.04, 0.1, mat(COL.grey)), WB, 0.76, Z0 + 0.2));
  [COL.coral, COL.blue, COL.teal, COL.ink].forEach((c, i) => {
    const mk = cyl(0.015, 0.015, 0.12, c, 6);
    mk.rotation.z = Math.PI / 2;
    add(at(mk, WB - 0.6 + i * 0.2, 0.795, Z0 + 0.2));
  });
  // Table and chairs
  const tbx = 10.4;
  const tbz = -1.55;
  const tableTop = mesh(new THREE.CylinderGeometry(1, 1, 0.06, 32), mat('#fdfbf7'));
  tableTop.scale.set(1.45, 1, 0.65);
  add(at(tableTop, tbx, 0.75, tbz));
  for (const s of [-1, 1]) add(at(cyl(0.06, 0.2, 0.72, COL.steel, 12), tbx + s * 0.8, 0.36, tbz));
  colliders.push({ type: 'box', x: tbx, z: tbz, hw: 1.42, hd: 0.62 });
  const chairAt = (x, z, yaw, c) => {
    const ch = new THREE.Group();
    ch.add(at(rbox(0.44, 0.07, 0.42, mat(c), 0.03), 0, 0.47, 0));
    ch.add(at(rbox(0.42, 0.44, 0.06, mat(c), 0.03), 0, 0.74, -0.2));
    ch.add(at(cyl(0.025, 0.025, 0.44, COL.steel, 6), 0, 0.22, 0));
    ch.add(at(cyl(0.18, 0.2, 0.03, COL.steel, 12), 0, 0.015, 0));
    ch.position.set(x, 0, z);
    ch.rotation.y = yaw;
    add(ch);
    colliders.push({ type: 'circle', x, z, r: 0.24, h: 0.51 });
  };
  chairAt(9.6, tbz - 0.95, 0, COL.mint);
  chairAt(11.2, tbz - 0.95, 0, COL.pink);
  chairAt(9.6, tbz + 0.95, Math.PI, COL.sun);
  chairAt(11.2, tbz + 0.95, Math.PI, COL.mint);
  chairAt(12.35, tbz, -Math.PI / 2, COL.sky);
  // Open laptop and cups on the table
  const lap = new THREE.Group();
  lap.add(at(rbox(0.36, 0.02, 0.25, mat('#c9cedb', { metal: 0.3, rough: 0.4 }), 0.008), 0, 0.01, 0));
  const lapScreen = new THREE.Group();
  lapScreen.add(at(rbox(0.36, 0.24, 0.015, mat('#c9cedb', { metal: 0.3, rough: 0.4 }), 0.008), 0, 0.12, 0));
  lapScreen.add(at(box(0.08, 0.08, 0.002, COL.pink), 0.08, 0.14, 0.009));
  lapScreen.add(at(box(0.07, 0.05, 0.002, COL.sun), -0.07, 0.09, 0.009));
  lapScreen.position.z = 0.12;
  lapScreen.rotation.x = 0.3;
  lap.add(lapScreen);
  lap.position.set(11.2, 0.78, tbz - 0.3);
  add(lap);
  add(at(makeMug(COL.sun, COL.white, 1.3), 9.7, 0.78, tbz - 0.25), at(makeMug(COL.pink, COL.white, 1.3), 10.2, 0.78, tbz + 0.3));
  add(at(rbox(0.3, 0.01, 0.22, mat(COL.sun), 0.005), 9.9, 0.785, tbz + 0.05));
  addNpc(LOOKS.fin, { x: 11.2, z: tbz - 0.97, y: 0.18, hands: 'type' });
  addNpc(LOOKS.eve, {
    x: 12.7,
    z: -3.85,
    y: 0,
    yaw: -0.5,
    pose: 'stand',
    hands: null,
    after: (k) => {
      k.arms[1].rotation.set(0, 0, -1.45);
      const mk = cyl(0.018, 0.018, 0.14, COL.coral, 6);
      mk.position.set(0, -0.32, 0.03);
      mk.rotation.x = Math.PI / 2;
      k.arms[1].add(mk);
    },
  });
  // Wall TV with a happy chart
  const tvTex = atlas.add(256, 150, (c, w, h) => {
    c.fillStyle = '#f4f7ff';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#3b2b3f';
    c.font = `600 18px ${FONT}`;
    c.fillText('Smiles this week', 14, 24);
    [40, 58, 52, 78, 96, 110].forEach((v, i) => {
      c.fillStyle = ['#ff9eb5', '#ffd166', '#7fd3a7', '#6fb8ff', '#c7a6ff', '#ef5b6f'][i];
      roundRect(c, 20 + i * 38, h - 14 - v, 26, v, 6);
      c.fill();
    });
  });
  const tv = new THREE.Group();
  tv.add(at(rbox(1.5, 0.9, 0.06, mat(COL.ink), 0.03), 0, 0, 0));
  tv.add(at(atlas.plane(1.4, 0.8, tvTex), 0, 0, 0.035));
  tv.position.set(X1 - 0.14, 1.75, -1.6);
  tv.rotation.y = -Math.PI / 2;
  add(tv);
  add(at(makePlant('tall', 1.4, COL.coral), 14.35, 0, -4.3));
  colliders.push({ type: 'circle', x: 14.35, z: -4.3, r: 0.3 });
  add(at(makePlant('round', 0.9, COL.white), 14.3, 0, 3.9));
  colliders.push({ type: 'circle', x: 14.3, z: 3.9, r: 0.26 });
  add(at(makePlant('round', 0.9, COL.sun), 6.7, 0, -4.4));

  // ---------------------------------------------------------------- activities
  // Code at Homama's desk
  let deskAct = null;
  let delivered = null;
  async function codeAtDesk(api) {
    let choice = 'help';
    if (api.playerId === 'roji') {
      choice = await api.choose({
        title: "Homama's desk",
        text: "Homama is building a new feature for Roji's clinic.",
        options: [
          { id: 'help', label: 'Help him ship it', sub: 'Play Ship It! together' },
          { id: 'coffee', label: 'Bring him a coffee', sub: 'A warm latte with a heart on top' },
        ],
      });
      if (!choice) return;
    }
    const seats = [{ who: 'homama', ...heroSeat, pose: 'sit', hands: 'type' }];
    if (choice === 'coffee') seats.push({ who: 'roji', x: stoolX + 0.15, z: stoolZ + 0.3, yaw: Math.PI + 0.75, pose: 'stand' });
    else seats.push({ who: 'roji', x: stoolX, z: stoolZ, y: 0.19, yaw: Math.PI + 0.5, pose: 'sit', hands: 'wave2' });
    let tt = 0;
    let step = 0;
    const roji = api.roji;
    let mug = null;
    deskAct = api.activity({
      label: 'Get up',
      seats,
      focus: { x: DX + 0.2, z: DZ + 0.35, y: 1.1, zoom: 0.42 },
      exit: { x: DX - 0.4, z: DZ + 1.9 },
      update(dt) {
        tt += dt;
        if (choice === 'coffee') {
          if (step === 0 && tt > 1.6) {
            step = 1;
            const prev = api.carry('roji', null);
            mug = null;
            if (prev) {
              prev.scale.setScalar(1);
              prev.position.set(desk.kbX + 0.42, desk.H, desk.D / 2 - 0.12);
              desk.group.add(prev);
              delivered?.removeFromParent();
              delivered = prev;
            }
            api.fx.heartsAt(api.world(heroSeat.x, heroSeat.z, 1.5), 5);
            api.sound.ui('good');
            api.toast('Homama: <b>Thank you, Roji!</b> Best coffee ever.', 3000);
          }
          if (step === 1 && tt > 2.2) {
            step = 2;
            api.emote('roji', 'heart');
          }
          return;
        }
        if (step === 0 && tt > 1.6) {
          step = 1;
          roji.kid.hands = null;
        }
        if (step === 1 && tt > 1.7) {
          step = 2;
          if (!api.hasArena('coding')) return api.toast('The coding game is on its way.');
          const me = deskAct;
          api.playArena('coding').then((res) => {
            if (deskAct !== me || !api.activityRunning) return;
            if (res?.win) {
              roji.kid.hands = 'wave2';
              api.fx.heartsAt(api.world(heroSeat.x, heroSeat.z, 1.5), 6);
              api.toast("Shipped! <b>Roji's clinic</b> has reminders now.", 3200);
              tt = 0;
              step = 3;
            } else if (res && !res.quit) api.toast('The bugs won this round. One more coffee, then try again?', 3000);
          });
        }
        if (step === 3 && tt > 2) {
          step = 4;
          roji.kid.hands = null;
        }
      },
      onEnd() {
        if (mug) api.carry('roji', null);
        deskAct = null;
      },
    });
    if (choice === 'coffee') {
      mug = makeMug(COL.white, COL.coral, 1.8);
      api.carry('roji', mug);
      api.toast('Roji brings Homama a latte with a heart on top.', 2200);
    } else api.toast(api.playerId === 'roji' ? 'Roji pulls up a stool. Time to ship!' : "Homama opens his editor. Let's ship it!", 2200);
  }

  // Make coffee
  let brewing = 0;
  function makeCoffee(api) {
    let tt = 0;
    let done = false;
    const mugs = [];
    brewing = 0.001;
    const act = api.activity({
      label: 'Stop',
      seats: [
        { who: 'player', x: mx, z: -3.55, yaw: Math.PI, pose: 'stand', hands: 'stir' },
        { who: 'partner', x: mx + 0.95, z: -3.4, yaw: Math.PI + 0.6, pose: 'stand' },
      ],
      focus: { x: mx + 0.3, z: -3.9, y: 1.1, zoom: 0.5 },
      exit: { x: mx + 0.2, z: -2.9 },
      update(dt) {
        tt += dt;
        if (!done) {
          brewing = Math.min(1, tt / 2.6);
          if (Math.random() < dt * 5) tone(api, 180 + Math.random() * 120, 0.08, { type: 'triangle', gain: 0.04 });
          if (tt > 2.6) {
            done = true;
            brewing = 0;
            api.sound.ui('coin');
            for (const who of ['player', 'partner']) {
              const m = makeMug(who === 'player' ? COL.coral : COL.teal, COL.white, 1.8);
              mugs.push(m);
              api.carry(who, m);
            }
            api.fx.heartsAt(api.world(mx + 0.45, -3.5, 1.4), 5);
            api.toast('Two warm lattes, each with a heart on top.', 2800);
            act.label = 'Done';
          }
        }
      },
      onEnd() {
        brewing = 0;
        if (mugs.length) {
          api.carry('roji', null);
          api.carry('homama', null);
        }
      },
    });
    api.toast('The coffee machine hums and bubbles...', 1800);
  }

  // Ping-pong
  let pong = null;
  function playPong(api) {
    const pid = api.playerId;
    const oid = api.partnerId;
    const sides = { [pid]: -1, [oid]: 1 };
    const paddles = {};
    restPaddles.visible = false;
    const st = { from: -1, k: 0, hits: 0, rally: 3, score: { [pid]: 0, [oid]: 0 }, miss: false, wait: 1, over: false, z0: 0, z1: 0, swing: {} };
    pong = st;
    const nameOf = (id) => (id === 'roji' ? 'Roji' : 'Homama');
    const who = (side) => (side === -1 ? pid : oid);
    // The paddle sits in the hand, face half toward the other player and half toward the camera
    const hand = new THREE.Vector3();
    const aimPaddle = (id) => {
      const p = paddles[id];
      const a = api.actor(id);
      if (!p) return;
      a.kid.handWorld(1, hand);
      g.worldToLocal(hand);
      p.position.set(hand.x, hand.y - 0.06, hand.z);
      p.rotation.set(-0.2 - Math.sin((st.swing[id] || 0) * Math.PI) * 0.8, a.yaw - Math.sign(a.yaw) * 0.75, 0, 'YXZ');
    };
    const startRally = () => {
      st.k = 0;
      st.hits = 0;
      st.rally = 3 + Math.floor(Math.random() * 5);
      st.miss = false;
      st.z0 = tz + (Math.random() - 0.5) * 0.5;
      st.z1 = tz + (Math.random() - 0.5) * 0.5;
      ball.visible = true;
    };
    const act = api.activity({
      label: 'Stop playing',
      seats: [
        { who: 'player', x: tx - 1.45, z: tz, yaw: Math.PI / 2, pose: 'stand', hands: 'hold' },
        { who: 'partner', x: tx + 1.45, z: tz, yaw: -Math.PI / 2, pose: 'stand', hands: 'hold' },
      ],
      focus: { x: tx, z: tz, y: 0.7, zoom: 0.6 },
      exit: { x: tx - 0.4, z: tz + 1.4 },
      update(dt) {
        if (st.over) {
          st.wait -= dt;
          if (st.wait <= 0) api.endActivity();
          return;
        }
        if (st.wait > 0) {
          st.wait -= dt;
          aimPaddle(pid);
          aimPaddle(oid);
          if (st.wait <= 0) startRally();
          return;
        }
        for (const id of [pid, oid]) {
          const s = st.swing[id] || 0;
          st.swing[id] = Math.max(0, s - dt * 4);
          aimPaddle(id);
        }
        st.k += dt / (st.miss ? 0.5 : 0.72);
        const xa = tx + st.from * 1.15;
        const xb = tx - st.from * 1.15;
        const k = st.k;
        let y;
        if (k < 0.7) {
          const q = k / 0.7;
          y = 0.92 + (TH + 0.04 - 0.92) * q + Math.sin(q * Math.PI) * 0.28;
        } else {
          const q = (k - 0.7) / 0.3;
          y = TH + 0.04 + (0.92 - TH - 0.04) * q + Math.sin(q * Math.PI) * 0.12;
        }
        if (st.miss && k > 1) y = Math.max(0.035, 0.92 - (k - 1) * 3);
        ball.position.set(xa + (xb - xa) * k, y, st.z0 + (st.z1 - st.z0) * Math.min(1, k));
        if (!st.bounced && k >= 0.7) {
          st.bounced = true;
          tone(api, 900, 0.05, { type: 'triangle', gain: 0.06 });
        }
        if (k >= 1 && !st.miss) {
          st.hits++;
          const hitter = who(-st.from);
          if (st.hits >= st.rally) {
            st.miss = true;
          } else {
            st.from = -st.from;
            st.k = 0;
            st.bounced = false;
            st.z0 = st.z1;
            st.z1 = tz + (Math.random() - 0.5) * 0.6;
            st.swing[hitter] = 1;
            api.actor(hitter).kid.squash = 1.12;
            tone(api, 620 + Math.random() * 80, 0.06, { type: 'square', gain: 0.05 });
          }
        }
        if (st.miss && k > 1.6) {
          const winner = who(st.from);
          st.score[winner]++;
          const a = st.score[pid];
          const b = st.score[oid];
          ball.visible = false;
          st.bounced = false;
          st.from = winner === pid ? -1 : 1;
          if (Math.max(a, b) >= 3) {
            st.over = true;
            st.wait = 2.6;
            api.emote(winner, 'cheer');
            api.fx.heartsAt(api.world(tx, tz, 1.2), 6);
            api.sound.ui('win');
            api.toast(`<b>${nameOf(winner)}</b> wins, ${Math.max(a, b)} to ${Math.min(a, b)}! Good game.`, 3000);
          } else {
            st.wait = 1.1;
            api.sound.ui('pop');
            api.toast(`Point to ${nameOf(winner)}. ${nameOf(pid)} ${a} : ${b} ${nameOf(oid)}`, 1500);
          }
        }
      },
      onEnd() {
        for (const p of Object.values(paddles)) p.removeFromParent();
        restPaddles.visible = true;
        ball.visible = false;
        pong = null;
      },
    });
    for (const id of [pid, oid]) {
      const p = paddle(id === 'roji' ? COL.sun : COL.blue);
      p.scale.setScalar(1.25);
      g.add(p);
      paddles[id] = p;
      aimPaddle(id);
    }
    void act;
    api.toast('First to 3 points wins!', 1800);
  }

  // Bean bags
  function beanBags(api) {
    let tt = 0;
    const pads = [];
    api.activity({
      label: 'Get up',
      seats: [
        { who: 'player', x: bagSpots[0][0], z: bagSpots[0][1] + 0.05, y: 0.04, yaw: 0.15, pose: 'sit' },
        { who: 'partner', x: bagSpots[1][0], z: bagSpots[1][1] + 0.05, y: 0.04, yaw: -0.15, pose: 'sit' },
      ],
      focus: { x: -13.25, z: 3.0, y: 0.6, zoom: 0.55 },
      exit: { x: -13.3, z: 1.6 },
      update(dt) {
        tt += dt;
        if (tt > 3.5) {
          tt = 0;
          api.fx.heartsAt(api.world(-13.25, 2.8, 1.1), 3);
          tone(api, 880, 0.12, { gain: 0.04 });
        }
      },
      onEnd() {
        for (const who of ['roji', 'homama']) api.carry(who, null);
      },
    });
    for (const who of ['player', 'partner']) {
      const p = new THREE.Group();
      p.add(at(rbox(0.22, 0.05, 0.11, mat(who === 'player' ? COL.coral : COL.teal), 0.025), 0, 0, 0));
      p.add(at(box(0.09, 0.002, 0.06, mat('#7fe0d0', { emissive: '#7fe0d0', ei: 0.8 })), 0, 0.026, 0));
      p.rotation.x = 0.9;
      p.position.set(0, 0.02, -0.08);
      pads.push(p);
      api.carry(who, p);
    }
    api.toast('A cosy break on the bean bags.', 2400);
  }

  hotspots.push(
    { x: heroSeat.x + 0.3, z: heroSeat.z + 0.75, r: 1.5, label: "Code at Homama's desk", icon: 'code', act: codeAtDesk },
    { x: mx, z: -3.5, r: 1.4, label: 'Make coffee', icon: 'coffee', act: makeCoffee },
    { x: tx, z: tz + 1.15, r: 1.4, label: 'Play ping-pong', icon: 'paddle', act: playPong },
    { x: -13.25, z: 2.0, r: 1.5, label: 'Sit on the bean bags', icon: 'smile', act: beanBags },
    {
      x: 0,
      z: -1.0,
      r: 1.3,
      label: 'Say hi to the team',
      icon: 'hand',
      act: (api) => {
        api.emote('player', 'wave');
        for (const ty of typists) ty.wave = 1.8;
        tone(api, 660, 0.1, { gain: 0.05 });
        api.toast('The team waves back. <b>Hi!</b>', 2000);
      },
    },
    {
      x: 8.9,
      z: -3.5,
      r: 1.3,
      label: 'Read the whiteboard',
      icon: 'note',
      act: (api) => {
        api.focus({ x: WB, z: -4.2, y: 1.6, zoom: 0.5 });
        api.toast('A tiny pink note in the corner says: <b>Homama loves Roji</b>.', 3200);
        setTimeout(() => api.focus(null), 3300);
      },
    },
  );

  // ---------------------------------------------------------------- update
  const vacPath = (t) => ({ x: Math.sin(t * 0.18) * 3.4, z: 1.6 + Math.sin(t * 0.36) * 1.1 });
  function update(dt, t) {
    desk.update(dt, t);
    for (const ty of typists) {
      const [L, R] = ty.k.arms;
      ty.wave = Math.max(0, ty.wave - dt);
      L.rotation.set(-1.35 + Math.max(0, Math.sin(t * 17 + ty.phase)) * 0.12, 0, -0.18);
      if (ty.wave > 0) R.rotation.set(0, 0, -2.3 - Math.sin(t * 14) * 0.3);
      else R.rotation.set(-1.35 + Math.max(0, Math.sin(t * 15 + 1 + ty.phase)) * 0.12, 0, 0.18);
    }
    const p = vacPath(t);
    const q = vacPath(t + 0.1);
    vac.position.set(p.x, 0, p.z);
    vac.rotation.y = Math.atan2(q.x - p.x, q.z - p.z);
    const hours = t / 60 + 10;
    minHand.rotation.z = -(t / 60) * Math.PI * 2;
    hourHand.rotation.z = -(hours / 12) * Math.PI * 2;
    // Coffee machine: gentle steam, stronger while brewing
    const strong = brewing > 0;
    steam.forEach((s, i) => {
      const k = (t * (strong ? 0.9 : 0.35) + i / steam.length) % 1;
      s.position.set(mx + Math.sin(k * 5 + i) * 0.06, 1.42 + k * (strong ? 0.8 : 0.4), -4.5);
      s.scale.setScalar(0.12 + k * (strong ? 0.4 : 0.18));
      s.material.opacity = (strong ? 0.7 : 0.25) * (1 - k);
    });
    brewLight.material.emissiveIntensity = strong ? 0.6 + Math.abs(Math.sin(t * 10)) * 1.6 : 0.6;
    brewCup.visible = strong;
  }

  trimShadows(g, dynamic, { wallZ: Z0 + 0.3 });
  for (const o of [vac, hourHand, minHand, restPaddles, ball, brewLight]) o.traverse((m) => (m.castShadow = false));

  return {
    group: g,
    dynamic,
    colliders,
    hotspots,
    size: { w: X1 - X0, d: Z1 - Z0 },
    spawn: { x: 0, z: 3.4, yaw: Math.PI },
    exit: { x: 0, z: 4.35 },
    background: '#d4eee8',
    update,
    onExit(api) {
      if (pong) api.endActivity();
    },
  };
}
