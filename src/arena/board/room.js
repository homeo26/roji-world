import * as THREE from 'three';
import { lighten } from '../../util.js';
import { makePlant } from '../../places/tech/kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { box, cyl, ball, cone, at, bakeVC, mat, umat, mesh, canvasTexture, FONT, glowTex, glow, PURPLE } from './kit.js';

// Rounded boxes with one bevel step: plenty for room props seen from a few metres away.
const rbox = (w, h, d, c, r = 0.06, o) => mesh(new RoundedBoxGeometry(w, h, d, 1, r), typeof c === 'string' ? mat(c, o) : c);
const flat = (m) => ((m.castShadow = false), m);

// The Game Night room: a cosy dollhouse corner with a round games table and two stools,
// shelves of board games, a window seat with a sleeping cat, fairy lights, a floor lamp and a chalkboard tally.
// Origin at the middle of the play area on the floor; the back wall is at z = WZ; the camera is on +Z.

export const WZ = -3.4;
export const TABLE = { y: 0.68, r: 0.95 };
const WALL_H = 4.4;
const HALF_W = 7.2;

const pattern = (w, h, base, draw, rx, ry) => {
  const t = canvasTexture(w, h, (c) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    draw(c, w, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
};

const texMesh = (geo, tex, o = {}) => mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: o.rough ?? 0.85, transparent: !!o.transparent, alphaTest: o.alphaTest || 0, side: o.side || THREE.FrontSide }), { cast: !!o.cast, receive: o.receive !== false });

// opts: { table: true, seats: [{ x, z, color }], stage: false (a small round stage instead of the table) }
export function buildRoom(ctx, opts = {}) {
  const { scene } = ctx;
  const g = new THREE.Group();
  scene.add(g);
  const dynamic = [];
  const updaters = [];
  const gt = glowTex();

  // ---------------------------------------------------------------- floor, walls, rug
  const planks = pattern(256, 256, '#e2b583', (c, w, h) => {
    const rows = 6;
    for (let i = 0; i < rows; i++) {
      const y = (i * h) / rows;
      c.fillStyle = ['#e6bb8a', '#dcae7b', '#e9c193', '#dfb281', '#e4b887', '#d9aa77'][i];
      c.fillRect(0, y, w, h / rows - 3);
      c.fillStyle = 'rgba(120,70,30,0.18)';
      const off = (i * 97) % w;
      c.fillRect(off, y, 3, h / rows);
      c.fillRect((off + w / 2) % w, y, 3, h / rows);
      c.fillStyle = 'rgba(255,255,255,0.08)';
      c.fillRect(0, y + 4, w, 4);
    }
  }, 7, 6);
  const floor = texMesh(new THREE.PlaneGeometry(HALF_W * 2, 11), planks);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, WZ + 5.5);
  g.add(floor);

  const paper = pattern(256, 256, '#fbe1d2', (c, w, h) => {
    c.fillStyle = '#f8d4c4';
    for (let x = 0; x < w; x += 64) c.fillRect(x + 22, 0, 20, h);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        c.fillStyle = (x + y) % 2 ? '#e7d3fb' : '#ffc4d2';
        c.beginPath();
        c.arc(x * 64 + 32 + (y % 2) * 0, y * 64 + 32, 6, 0, Math.PI * 2);
        c.fill();
      }
  }, HALF_W * 2, WALL_H - 1.1);
  const wall = texMesh(new THREE.PlaneGeometry(HALF_W * 2, WALL_H - 1.1), paper);
  wall.position.set(0, 1.1 + (WALL_H - 1.1) / 2, WZ);
  g.add(wall);
  const sidePaper = paper.clone();
  sidePaper.repeat.set(6, WALL_H - 1.1);
  sidePaper.needsUpdate = true;
  for (const s of [-1, 1]) {
    const side = texMesh(new THREE.PlaneGeometry(6, WALL_H - 1.1), sidePaper);
    side.rotation.y = -s * Math.PI / 2;
    side.position.set(s * HALF_W, 1.1 + (WALL_H - 1.1) / 2, WZ + 3);
    g.add(side);
    g.add(flat(at(box(0.08, 1.1, 6, '#bfe3dc'), s * (HALF_W - 0.04), 0.55, WZ + 3)));
    g.add(at(rbox(0.1, 0.08, 6, '#fffaf4', 0.03), s * (HALF_W - 0.06), 1.12, WZ + 3));
  }
  // Wainscot: teal panels with a cream rail and skirting
  g.add(flat(at(box(HALF_W * 2, 1.1, 0.06, '#bfe3dc'), 0, 0.55, WZ + 0.03)));
  for (let x = -HALF_W + 0.7; x < HALF_W - 0.4; x += 1.15) g.add(flat(at(rbox(0.9, 0.7, 0.04, '#cdeae4', 0.03), x + 0.1, 0.56, WZ + 0.07)));
  g.add(at(rbox(HALF_W * 2, 0.08, 0.1, '#fffaf4', 0.03), 0, 1.12, WZ + 0.06));
  g.add(flat(at(box(HALF_W * 2, 0.12, 0.05, '#fffaf4'), 0, 0.06, WZ + 0.08)));

  const rugTex = canvasTexture(512, 512, (c, w) => {
    const R = w / 2;
    const rings = ['#ffd9e2', '#fff3e4', '#d9ccff', '#fff3e4', '#ffe3a8', '#fff3e4', '#bfe8de'];
    for (let i = 0; i < rings.length; i++) {
      c.fillStyle = rings[i];
      c.beginPath();
      c.arc(R, R, R * (1 - i * 0.12), 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      c.beginPath();
      c.arc(R + Math.cos(a) * R * 0.94, R + Math.sin(a) * R * 0.94, 7, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = 'rgba(139,92,246,0.25)';
    c.lineWidth = 4;
    c.setLineDash([14, 12]);
    c.beginPath();
    c.arc(R, R, R * 0.83, 0, Math.PI * 2);
    c.stroke();
  });
  const rug = texMesh(new THREE.CircleGeometry(2.5, 48), rugTex, { rough: 0.95 });
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.008;
  g.add(rug);

  // ---------------------------------------------------------------- window seat with a sleeping cat
  const WX = -3.7;
  const skyTex = canvasTexture(256, 200, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#8fd1ea');
    gr.addColorStop(1, '#ffe6d2');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff4c2';
    c.beginPath();
    c.arc(w * 0.72, h * 0.3, 20, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.9)';
    for (const [x, y, s] of [[50, 50, 1], [150, 36, 0.8], [210, 80, 0.7]]) {
      for (const [dx, dy, r] of [[0, 0, 16], [16, -6, 14], [30, 2, 12], [-14, 4, 11]]) {
        c.beginPath();
        c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.fillStyle = '#9fd77c';
    c.beginPath();
    c.moveTo(0, h);
    c.quadraticCurveTo(w * 0.25, h * 0.55, w * 0.55, h * 0.78);
    c.quadraticCurveTo(w * 0.8, h * 0.6, w, h * 0.72);
    c.lineTo(w, h);
    c.fill();
    c.fillStyle = '#7cc463';
    c.beginPath();
    c.moveTo(0, h);
    c.quadraticCurveTo(w * 0.4, h * 0.72, w, h * 0.88);
    c.lineTo(w, h);
    c.fill();
    for (const [x, y, r, col] of [[40, 140, 16, '#f6a5c0'], [70, 132, 12, '#f9bfd2'], [200, 150, 14, '#6dbb58']]) {
      c.fillStyle = '#8b5e3c';
      c.fillRect(x - 2, y, 4, 22);
      c.fillStyle = col;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.3), new THREE.MeshBasicMaterial({ map: skyTex }));
  sky.position.set(WX, 2.05, WZ + 0.01);
  g.add(sky);
  const cream = '#fffaf4';
  g.add(at(rbox(1.9, 0.1, 0.12, cream, 0.04), WX, 2.75, WZ + 0.06));
  g.add(at(rbox(2.0, 0.1, 0.2, cream, 0.04), WX, 1.36, WZ + 0.1));
  for (const s of [-1, 1]) g.add(at(rbox(0.1, 1.45, 0.12, cream, 0.04), WX + s * 0.9, 2.05, WZ + 0.06));
  g.add(at(box(0.05, 1.3, 0.05, cream), WX, 2.05, WZ + 0.05));
  g.add(at(box(1.7, 0.05, 0.05, cream), WX, 2.1, WZ + 0.05));
  // Curtains, rod and tie-backs
  g.add(at(cyl(0.025, 0.025, 2.5, '#e8b04b', 8, { metal: 0.4, rough: 0.4 }), WX, 2.92, WZ + 0.18));
  g.children[g.children.length - 1].rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) {
    g.add(at(ball(0.05, '#e8b04b', { metal: 0.4, rough: 0.4 }, 10), WX + s * 1.26, 2.92, WZ + 0.18));
    for (let i = 0; i < 3; i++) {
      const fold = mesh(new THREE.CapsuleGeometry(0.09, 1.25, 4, 10), mat(i % 2 ? '#ff9eb5' : '#ffb3c6', { rough: 0.85 }));
      fold.position.set(WX + s * (0.98 + i * 0.1), 2.2, WZ + 0.2 - i * 0.02);
      fold.scale.set(1, 1, 0.6);
      fold.rotation.z = s * 0.06;
      g.add(fold);
    }
    g.add(at(cyl(0.2, 0.2, 0.06, '#ffd166', 12), WX + s * 1.07, 1.85, WZ + 0.22));
  }
  // Bench with cushions
  g.add(at(rbox(2.1, 0.42, 0.6, '#fffaf4', 0.05), WX, 0.21, WZ + 0.34));
  for (const s of [-1, 1]) g.add(at(rbox(0.7, 0.26, 0.04, '#f6e2d2', 0.03), WX + s * 0.5, 0.2, WZ + 0.65));
  g.add(at(rbox(2.0, 0.12, 0.56, '#c7b4f5', 0.06), WX, 0.48, WZ + 0.34));
  const pillow = (x, c, r) => {
    const p = rbox(0.42, 0.36, 0.14, c, 0.07);
    at(p, x, 0.7, WZ + 0.18);
    p.rotation.set(-0.2, 0, r);
    g.add(p);
    g.add(at(ball(0.025, '#ffffff', {}, 8), x, 0.72, WZ + 0.26));
  };
  pillow(WX - 0.75, '#ff9eb5', 0.12);
  pillow(WX + 0.8, '#ffd166', -0.1);
  // Sleeping cat (breathes)
  const cat = new THREE.Group();
  const fur = mat('#f4a261', { rough: 0.9 });
  const cream2 = mat('#fff1df', { rough: 0.9 });
  const catBody = mesh(new THREE.SphereGeometry(0.2, 16, 12), fur);
  catBody.scale.set(1.25, 0.62, 0.9);
  cat.add(catBody);
  const catHead = new THREE.Group();
  catHead.position.set(0.2, 0.02, 0.1);
  const head = mesh(new THREE.SphereGeometry(0.11, 14, 10), fur);
  head.scale.set(1, 0.85, 0.95);
  catHead.add(head);
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.ConeGeometry(0.04, 0.07, 6), fur);
    ear.position.set(0.01, 0.09, s * 0.06);
    ear.rotation.x = s * 0.35;
    catHead.add(ear);
    const eye = mesh(new THREE.CapsuleGeometry(0.006, 0.025, 2, 6), mat('#3b2b3f'), { cast: false });
    eye.rotation.x = Math.PI / 2;
    eye.rotation.y = 0.3;
    eye.position.set(0.085, 0.01, s * 0.04);
    catHead.add(eye);
  }
  const muzzle = mesh(new THREE.SphereGeometry(0.045, 10, 8), cream2);
  muzzle.position.set(0.09, -0.03, 0);
  catHead.add(muzzle);
  catHead.add(at(ball(0.012, '#ff8fa0', {}, 6), 0.13, -0.01, 0));
  catHead.rotation.set(0, -0.8, -0.25);
  cat.add(catHead);
  for (const s of [-1, 1]) {
    const stripe = mesh(new THREE.TorusGeometry(0.13, 0.012, 4, 14, Math.PI * 0.7), mat('#d9803f'), { cast: false });
    stripe.position.set(-0.06 + s * 0.08, 0.05, 0);
    stripe.rotation.set(Math.PI / 2, 0, -Math.PI * 0.35);
    stripe.scale.set(1, 1, 0.8);
    cat.add(stripe);
  }
  const tail = mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 18, Math.PI * 1.1), fur);
  tail.rotation.set(Math.PI / 2, 0, 0.2);
  tail.position.set(-0.02, -0.06, 0.03);
  cat.add(tail);
  cat.position.set(WX + 0.1, 0.65, WZ + 0.38);
  cat.rotation.y = 0.35;
  g.add(cat);
  dynamic.push(cat);
  // Little z z z above the cat
  const zTex = canvasTexture(64, 64, (c) => {
    c.fillStyle = '#8b5cf6';
    c.font = `700 44px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('z', 32, 34);
  });
  const zs = [0, 1, 2].map(() => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: zTex, transparent: true, depthWrite: false }));
    g.add(s);
    return s;
  });
  updaters.push((dt, t) => {
    catBody.scale.y = 0.62 + Math.sin(t * 1.8) * 0.03;
    catBody.scale.x = 1.25 + Math.sin(t * 1.8) * 0.015;
    zs.forEach((s, i) => {
      const p = (t * 0.35 + i / 3) % 1;
      s.position.set(cat.position.x + 0.25 + p * 0.25, 0.85 + p * 0.5, cat.position.z + 0.1);
      s.scale.setScalar(0.08 + p * 0.1);
      s.material.opacity = Math.sin(p * Math.PI) * 0.9;
    });
  });

  // ---------------------------------------------------------------- shelves of games
  const SX = 3.75;
  const wood = '#c98f5c';
  const shelf = new THREE.Group();
  shelf.position.set(SX, 0, WZ + 0.24);
  g.add(shelf);
  shelf.add(at(box(2.3, 2.2, 0.04, '#f3d9bf'), 0, 1.1, -0.18));
  for (const s of [-1, 1]) shelf.add(at(rbox(0.08, 2.24, 0.42, wood, 0.03), s * 1.15, 1.12, 0));
  for (const y of [0.06, 0.6, 1.14, 1.68, 2.22]) shelf.add(at(rbox(2.36, 0.06, 0.44, wood, 0.02), 0, y, 0));
  const lidColors = ['#ef5b6f', '#ffd166', '#7fd3a7', '#6fb8ff', '#c7a6ff', '#ff9eb5', '#f08a5d', '#21c4b0'];
  const gameBox = (w, h, d, c, x, y, z, ry = 0, flat = true) => {
    const b = new THREE.Group();
    b.add(at(rbox(w, h, d, c, 0.015), 0, h / 2, 0));
    if (flat) {
      b.add(at(box(w * 1.002, h * 0.35, d * 1.002, '#fffaf4'), 0, h * 0.55, 0));
      b.add(at(ball(Math.min(w, d) * 0.12, c, {}, 10), 0, h + 0.002, 0));
      b.children[b.children.length - 1].scale.y = 0.15;
    } else {
      b.add(at(box(w * 1.01, h * 0.2, d * 0.7, '#fffaf4'), 0, h * 0.62, 0));
      b.add(at(ball(w * 0.28, '#fffaf4', {}, 8), w * 0.4, h * 0.3, 0));
      b.children[b.children.length - 1].scale.x = 0.2;
    }
    b.position.set(x, y, z);
    b.rotation.y = ry;
    shelf.add(b);
  };
  // bottom: stacked big boxes
  [[0.62, 0.1, 0.36], [0.58, 0.09, 0.34], [0.54, 0.11, 0.33]].forEach(([w, h, d], i) => gameBox(w, h, d, lidColors[i], -0.55, 0.09 + [0, 0.1, 0.19][i], 0.02, [0.05, -0.08, 0.1][i]));
  [[0.5, 0.12, 0.3], [0.46, 0.08, 0.3]].forEach(([w, h, d], i) => gameBox(w, h, d, lidColors[i + 3], 0.4, 0.09 + i * 0.12, 0.03, [-0.06, 0.12][i]));
  // basket of balls
  shelf.add(at(cyl(0.2, 0.17, 0.2, '#e0b07a', 14), 0.88, 0.19, 0.02));
  for (const [x, z, c] of [[0.82, 0, '#ef5b6f'], [0.94, 0.05, '#6fb8ff'], [0.88, -0.07, '#ffd166']]) shelf.add(at(ball(0.08, c, { rough: 0.5 }, 12), x, 0.32, z));
  // middle: books and a trophy
  const bookC = ['#ef5b6f', '#3f7bf0', '#ffd166', '#7fd3a7', '#c7a6ff', '#ff9eb5', '#f08a5d', '#6fb8ff'];
  for (let i = 0; i < 9; i++) {
    const h = 0.3 + ((i * 37) % 9) * 0.015;
    const b = rbox(0.055, h, 0.26, bookC[i % bookC.length], 0.01);
    at(b, -0.95 + i * 0.065, 0.63 + h / 2, 0.02);
    if (i === 8) b.rotation.z = -0.22;
    shelf.add(b);
  }
  const trophy = new THREE.Group();
  const gold = mat('#f4c24f', { metal: 0.55, rough: 0.3 });
  trophy.add(at(mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.06, 14), mat('#8b5e3c')), 0, 0.03, 0));
  trophy.add(at(mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.1, 10), gold), 0, 0.11, 0));
  trophy.add(at(mesh(new THREE.CylinderGeometry(0.11, 0.05, 0.16, 16), gold), 0, 0.24, 0));
  for (const s of [-1, 1]) {
    const h2 = mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12), gold);
    h2.position.set(s * 0.11, 0.25, 0);
    trophy.add(h2);
  }
  trophy.add(at(cone(0.04, 0.06, '#ffd166', 5), 0, 0.35, 0));
  trophy.position.set(0.0, 0.63, 0.02);
  shelf.add(trophy);
  gameBox(0.42, 0.07, 0.3, lidColors[4], 0.55, 0.63, 0.03, 0.06);
  gameBox(0.38, 0.07, 0.28, lidColors[6], 0.55, 0.7, 0.03, -0.1);
  gameBox(0.34, 0.06, 0.26, lidColors[7], 0.57, 0.77, 0.03, 0.1);
  // upper: upright game boxes and dice
  for (let i = 0; i < 6; i++) gameBox(0.07, 0.4 - (i % 3) * 0.04, 0.34, lidColors[(i + 2) % 8], -0.95 + i * 0.085, 1.17, 0.02, 0, false);
  const die = (s, x, y, z, ry, pip = PURPLE) => {
    const d = new THREE.Group();
    d.add(rbox(s, s, s, '#fffaf4', s * 0.18));
    const pg = new THREE.SphereGeometry(s * 0.09, 8, 6);
    const pm = mat(pip);
    const put = (px, py, pz) => {
      const p = mesh(pg, pm, { cast: false });
      p.position.set(px * s, py * s, pz * s);
      p.scale.set(px ? 0.35 : 1, py ? 0.35 : 1, pz ? 0.35 : 1);
      d.add(p);
    };
    put(0, 0.5, 0);
    for (const [a, b] of [[-0.25, -0.25], [0.25, 0.25]]) put(a, b, 0.5);
    for (const [a, b] of [[-0.25, -0.25], [0, 0], [0.25, 0.25], [-0.25, 0.25], [0.25, -0.25]]) put(0.5, a, b);
    for (const [a, b] of [[-0.25, -0.25], [0.25, 0.25], [-0.25, 0.25], [0.25, -0.25]]) put(-0.5, a, b);
    d.position.set(x, y, z);
    d.rotation.y = ry;
    return d;
  };
  shelf.add(die(0.12, 0.2, 1.23, 0.05, 0.5), die(0.1, 0.38, 1.22, 0.08, -0.3, '#ef5b6f'));
  const meep = meeple(0.18, '#ffcf3f');
  meep.position.set(0.75, 1.17, 0.02);
  meep.rotation.y = -0.3;
  shelf.add(meep);
  // top shelf: candy jar, plant, frame
  shelf.add(at(cyl(0.12, 0.12, 0.24, '#e9f6ff', 16, { rough: 0.2 }), -0.7, 1.83, 0.02));
  shelf.add(at(cyl(0.13, 0.13, 0.04, '#ff9eb5', 16), -0.7, 1.97, 0.02));
  for (let i = 0; i < 7; i++) shelf.add(at(ball(0.04, lidColors[i], { rough: 0.4 }, 8), -0.78 + (i % 4) * 0.05, 1.76 + Math.floor(i / 4) * 0.07, 0.08));
  const shelfPlant = makePlant('round', 0.42, '#ff9eb5');
  shelfPlant.position.set(0.15, 1.71, 0.02);
  shelf.add(shelfPlant);
  gameBox(0.5, 0.09, 0.32, lidColors[1], 0.72, 1.71, 0.03, 0.04);
  gameBox(0.44, 0.08, 0.3, lidColors[0], 0.72, 1.8, 0.03, -0.08);
  // On top of the shelf
  const topPlant = makePlant('tall', 0.7, '#7fd3a7');
  topPlant.position.set(-0.7, 2.25, 0);
  shelf.add(topPlant);

  // ---------------------------------------------------------------- chalkboard tally, banner, frames, lights
  const chalkTex = canvasTexture(640, 384, () => {});
  const chalkCanvas = chalkTex.image;
  const chalk = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9), new THREE.MeshStandardMaterial({ map: chalkTex, roughness: 0.95 }));
  chalk.position.set(0, 2.18, WZ + 0.07);
  g.add(chalk);
  g.add(flat(at(rbox(1.66, 1.06, 0.06, '#c98f5c', 0.03), 0, 2.18, WZ + 0.01)));
  g.add(at(rbox(1.3, 0.04, 0.08, '#c98f5c', 0.015), 0, 1.66, WZ + 0.08));
  for (const [x, c] of [[-0.3, '#fffaf4'], [-0.2, '#ff9eb5'], [0.35, '#ffd166']]) g.add(at(rbox(0.07, 0.025, 0.025, c, 0.01), x, 1.7, WZ + 0.09));
  const drawChalk = (title, rows) => {
    const c = chalkCanvas.getContext('2d');
    const w = chalkCanvas.width;
    const h = chalkCanvas.height;
    c.fillStyle = '#3e5f55';
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 40; i++) c.fillRect((i * 151) % w, (i * 89) % h, 60, 3);
    c.fillStyle = '#fffaf4';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 52px ${FONT}`;
    c.fillText(title, w / 2, 62);
    c.strokeStyle = 'rgba(255,250,244,0.6)';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(w * 0.2, 104);
    c.lineTo(w * 0.8, 104);
    c.stroke();
    rows.forEach(([name, value, color], i) => {
      const y = 170 + i * 82;
      c.textAlign = 'left';
      c.fillStyle = color;
      c.font = `700 48px ${FONT}`;
      c.fillText(name, 70, y);
      c.textAlign = 'right';
      c.fillStyle = '#fffaf4';
      c.fillText(String(value), w - 70, y);
    });
    chalkTex.needsUpdate = true;
  };
  drawChalk('Game Night', []);

  const banner = canvasTexture(1024, 160, (c, w, h) => {
    const text = 'GAME NIGHT';
    const n = text.length;
    c.strokeStyle = '#8b5e3c';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(0, 18);
    c.quadraticCurveTo(w / 2, 52, w, 18);
    c.stroke();
    const cols = ['#ef5b6f', '#ffd166', '#7fd3a7', '#6fb8ff', '#c7a6ff', '#ff9eb5'];
    for (let i = 0; i < n; i++) {
      if (text[i] === ' ') continue;
      const x = 52 + (i * (w - 104)) / (n - 1);
      const u = x / w;
      const y = 18 + 4 * 34 * u * (1 - u) * 0.95;
      c.fillStyle = cols[i % cols.length];
      c.beginPath();
      c.moveTo(x - 40, y);
      c.lineTo(x + 40, y);
      c.lineTo(x, y + 120);
      c.closePath();
      c.fill();
      c.fillStyle = '#fffaf4';
      c.font = `700 52px ${FONT}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(text[i], x, y + 42);
    }
  });
  const bannerM = texMesh(new THREE.PlaneGeometry(3.4, 0.53), banner, { alphaTest: 0.5, receive: false });
  bannerM.position.set(0, 3.18, WZ + 0.06);
  g.add(bannerM);

  const frameArt = (draw) => canvasTexture(200, 240, (c, w, h) => {
    c.fillStyle = '#fff8ee';
    c.fillRect(0, 0, w, h);
    draw(c, w, h);
  });
  const heartArt = frameArt((c, w, h) => {
    c.fillStyle = '#ffd9e2';
    c.fillRect(14, 14, w - 28, h - 28);
    c.fillStyle = '#ef5b6f';
    c.beginPath();
    c.moveTo(w / 2, h * 0.72);
    c.bezierCurveTo(w * 0.1, h * 0.48, w * 0.22, h * 0.2, w / 2, h * 0.38);
    c.bezierCurveTo(w * 0.78, h * 0.2, w * 0.9, h * 0.48, w / 2, h * 0.72);
    c.fill();
    c.fillStyle = '#3b2b3f';
    c.font = `700 30px ${FONT}`;
    c.textAlign = 'center';
    c.fillText('R + H', w / 2, h * 0.88);
  });
  const kidsArt = frameArt((c, w, h) => {
    c.fillStyle = '#d6f0ff';
    c.fillRect(14, 14, w - 28, h - 28);
    c.fillStyle = '#9fd77c';
    c.fillRect(14, h * 0.7, w - 28, h * 0.3 - 14);
    const face = (x, hair, top, girl) => {
      c.fillStyle = top;
      c.beginPath();
      c.moveTo(x - 30, h * 0.82);
      c.lineTo(x + 30, h * 0.82);
      c.lineTo(x + 18, h * 0.58);
      c.lineTo(x - 18, h * 0.58);
      c.fill();
      c.fillStyle = '#f8dccb';
      c.beginPath();
      c.arc(x, h * 0.45, 30, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = hair;
      c.beginPath();
      c.arc(x, h * 0.42, 31, Math.PI, Math.PI * 2);
      c.fill();
      if (girl)
        for (const s of [-1, 1]) {
          c.beginPath();
          c.arc(x + s * 34, h * 0.48, 11, 0, Math.PI * 2);
          c.fill();
        }
      c.fillStyle = '#1d130f';
      for (const s of [-1, 1]) {
        c.beginPath();
        c.arc(x + s * 10, h * 0.47, 3.5, 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = '#b23a48';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(x, h * 0.5, 8, 0.2, Math.PI - 0.2);
      c.stroke();
    };
    face(w * 0.32, '#2a1a13', '#ef5b6f', true);
    face(w * 0.68, '#141010', '#3f7bf0', false);
    c.fillStyle = '#ef5b6f';
    c.beginPath();
    const hx = w / 2;
    const hy = h * 0.2;
    c.moveTo(hx, hy + 14);
    c.bezierCurveTo(hx - 18, hy, hx - 10, hy - 12, hx, hy - 3);
    c.bezierCurveTo(hx + 10, hy - 12, hx + 18, hy, hx, hy + 14);
    c.fill();
  });
  for (const [x, art, c] of [[-1.42, heartArt, '#ffd166'], [1.42, kidsArt, '#7fd3a7']]) {
    g.add(flat(at(rbox(0.56, 0.66, 0.05, c, 0.03), x, 2.25, WZ + 0.03)));
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.55), new THREE.MeshStandardMaterial({ map: art, roughness: 0.8 }));
    pic.position.set(x, 2.25, WZ + 0.07);
    g.add(pic);
  }

  // Fairy lights along the top of the wall, twinkling in two sets
  const lightCurve = [];
  for (let i = 0; i <= 60; i++) {
    const u = i / 60;
    const x = -HALF_W + 0.4 + u * (HALF_W * 2 - 0.8);
    const seg = (u * 4) % 1;
    lightCurve.push(new THREE.Vector3(x, 3.72 - Math.sin(seg * Math.PI) * 0.28, WZ + 0.08));
  }
  const wire = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lightCurve), 64, 0.008, 3), mat('#6b8f5e'), { cast: false });
  g.add(wire);
  const bulbGeo = new THREE.SphereGeometry(0.045, 8, 6);
  const bulbCols = ['#ffd166', '#ff9eb5', '#7fe0d0', '#c7a6ff', '#ffb36b'];
  const bulbSets = [0, 1].map((k) => {
    const m = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
    const im = new THREE.InstancedMesh(bulbGeo, m, 18);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 18; i++) {
      const p = lightCurve[Math.min(60, Math.round(((i * 2 + k + 0.5) / 36) * 60))];
      m4.makeTranslation(p.x, p.y - 0.05, p.z + 0.02);
      im.setMatrixAt(i, m4);
      im.setColorAt(i, new THREE.Color(bulbCols[(i * 2 + k) % bulbCols.length]));
    }
    im.castShadow = false;
    g.add(im);
    return { im, m };
  });
  const bulbGlows = [0, 1].map((k) => {
    const pos = [];
    const col = [];
    const c3 = new THREE.Color();
    for (let i = k; i < 36; i += 2) {
      const p = lightCurve[Math.min(60, Math.round(((i + 0.5) / 36) * 60))];
      pos.push(p.x, p.y - 0.05, p.z + 0.06);
      c3.set(bulbCols[i % bulbCols.length]);
      col.push(c3.r, c3.g, c3.b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: gt, size: 0.34, vertexColors: true, transparent: true, depthWrite: false, opacity: 0.5, toneMapped: false }));
    g.add(pts);
    return pts;
  });
  updaters.push((dt, t) => {
    bulbSets.forEach((b, k) => b.m.color.setScalar(0.62 + 0.38 * Math.max(0, Math.sin(t * 2.2 + k * Math.PI))));
    bulbGlows.forEach((p, k) => (p.material.opacity = 0.25 + 0.35 * Math.max(0, Math.sin(t * 2.2 + k * Math.PI))));
  });

  // ---------------------------------------------------------------- floor lamp, plants, plush, poufs
  const lamp = new THREE.Group();
  lamp.position.set(-5.9, 0, WZ + 1.4);
  lamp.add(at(cyl(0.22, 0.26, 0.05, '#8b5e3c', 18), 0, 0.025, 0));
  lamp.add(at(cyl(0.025, 0.025, 1.85, '#8b5e3c', 8), 0, 0.95, 0));
  const shadeMat = umat('#fff1d6', { rough: 0.7, emissive: '#ffcf8a', ei: 0.75, side: THREE.DoubleSide });
  const shade = mesh(new THREE.CylinderGeometry(0.2, 0.36, 0.38, 20, 1, true), shadeMat, { cast: false });
  at(shade, 0, 1.92, 0);
  lamp.add(shade);
  lamp.add(at(cyl(0.205, 0.205, 0.03, '#ff9eb5', 20), 0, 2.1, 0), at(cyl(0.365, 0.365, 0.03, '#ff9eb5', 20), 0, 1.74, 0));
  const lampGlow = glow(gt, '#ffd59a', 1.6, 0.55);
  lampGlow.position.set(0, 1.85, 0);
  lamp.add(lampGlow);
  g.add(lamp);
  dynamic.push(shade, lampGlow);
  const warm = new THREE.PointLight('#ffcf94', 2.2, 7, 2);
  warm.position.set(-5.9, 1.9, WZ + 1.6);
  g.add(warm);

  const bigPlant = makePlant('tall', 1.7, '#fffaf4');
  bigPlant.position.set(6.2, 0, WZ + 0.7);
  g.add(bigPlant);
  const plant2 = makePlant('round', 0.9, '#ff9eb5');
  plant2.position.set(-2.3, 0, WZ + 0.45);
  g.add(plant2);
  const sillPlant = makePlant('succulent', 0.32, '#c7a6ff');
  sillPlant.position.set(WX + 0.55, 1.41, WZ + 0.12);
  g.add(sillPlant);

  const plushDie = die(0.52, 4.7, 0.27, WZ + 2.0, 0.45);
  const plushDie2 = die(0.4, 5.35, 0.2, WZ + 2.55, -0.3, '#ef5b6f');
  g.add(plushDie, plushDie2);
  const bigMeeple = meeple(0.62, '#ffcf3f');
  bigMeeple.position.set(-4.7, 0, WZ + 2.1);
  bigMeeple.rotation.y = 0.45;
  g.add(bigMeeple);
  const pouf = (x, z, c) => {
    g.add(at(cyl(0.34, 0.36, 0.32, c, 20), x, 0.16, z));
    const top = mesh(new THREE.SphereGeometry(0.34, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(c));
    top.scale.y = 0.28;
    top.position.set(x, 0.32, z);
    g.add(top);
    g.add(at(ball(0.04, '#fffaf4', {}, 8), x, 0.42, z));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const st = box(0.012, 0.3, 0.012, lighten(c, 0.35).getStyle());
      at(st, x + Math.cos(a) * 0.355, 0.16, z + Math.sin(a) * 0.355);
      g.add(st);
    }
  };
  pouf(-3.6, WZ + 2.0, '#c7a6ff');
  pouf(3.2, WZ + 1.3, '#7fd3a7');

  // ---------------------------------------------------------------- the table and stools
  const table = opts.table !== false ? buildTable(g) : null;
  const stools = (opts.seats || []).map((s) => {
    const st = buildStool(s.color);
    st.position.set(s.x, 0, s.z);
    g.add(st);
    return st;
  });

  bakeVC(g, dynamic, { emissive: 'keep' });
  return {
    group: g,
    table,
    stools,
    chalk: drawChalk,
    glowTex: gt,
    update(dt, t) {
      for (const u of updaters) u(dt, t);
      shadeMat.emissiveIntensity = 0.72 + Math.sin(t * 1.3) * 0.03;
    },
  };
}

// A round wooden games table with four splayed legs.
export function buildTable(parent) {
  const t = new THREE.Group();
  const { y, r } = TABLE;
  t.add(at(cyl(r, r, 0.07, '#e4b47e', 40), 0, y - 0.035, 0));
  t.add(at(cyl(r + 0.025, r + 0.025, 0.035, '#c8915a', 40), 0, y - 0.075, 0));
  t.add(at(cyl(0.72, 0.72, 0.09, '#d3a06a', 30), 0, y - 0.13, 0));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = cyl(0.05, 0.035, y - 0.1, '#c8915a', 10);
    leg.position.set(Math.cos(a) * 0.6, (y - 0.1) / 2, Math.sin(a) * 0.6);
    leg.rotation.set(Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08);
    t.add(leg);
    t.add(at(ball(0.05, '#a8743f', {}, 10), Math.cos(a) * 0.62, 0.04, Math.sin(a) * 0.62));
  }
  parent.add(t);
  return t;
}

// A round stool with a soft cushion in the player's colour. Seat top at about 0.42.
export function buildStool(color) {
  const s = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = cyl(0.03, 0.025, 0.3, '#c8915a', 8);
    leg.position.set(Math.cos(a) * 0.17, 0.15, Math.sin(a) * 0.17);
    leg.rotation.set(Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15);
    s.add(leg);
  }
  s.add(at(cyl(0.27, 0.27, 0.06, '#e4b47e', 20), 0, 0.31, 0));
  const cushion = mesh(new THREE.SphereGeometry(0.27, 20, 10), mat(lighten(color, 0.35).getStyle()));
  cushion.scale.y = 0.26;
  cushion.position.y = 0.36;
  s.add(cushion);
  s.add(at(ball(0.025, '#fffaf4', {}, 8), 0, 0.43, 0));
  return s;
}

// A meeple (the classic board game figure), `h` tall.
export function meeple(h, color) {
  const sh = new THREE.Shape();
  sh.moveTo(-0.5, 0);
  sh.lineTo(-0.18, 0);
  sh.lineTo(0, 0.32);
  sh.lineTo(0.18, 0);
  sh.lineTo(0.5, 0);
  sh.quadraticCurveTo(0.42, 0.5, 0.22, 0.62);
  sh.quadraticCurveTo(0.6, 0.7, 0.6, 0.8);
  sh.quadraticCurveTo(0.55, 0.92, 0.2, 0.88);
  sh.quadraticCurveTo(0.3, 1.15, 0, 1.2);
  sh.quadraticCurveTo(-0.3, 1.15, -0.2, 0.88);
  sh.quadraticCurveTo(-0.55, 0.92, -0.6, 0.8);
  sh.quadraticCurveTo(-0.6, 0.7, -0.22, 0.62);
  sh.quadraticCurveTo(-0.42, 0.5, -0.5, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 6 });
  geo.translate(0, 0, -0.15);
  const m = mesh(geo, mat(color, { rough: 0.6 }));
  m.scale.setScalar(h / 1.2);
  const grp = new THREE.Group();
  grp.add(m);
  return grp;
}
