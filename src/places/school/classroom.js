import { THREE, C, kit, makeAtlas, colorBake, mesh, umat, canvasTexture, FONT, uvScale, heartPath, fitText } from './kit.js';
import { WALL } from './building.js';

// Inside Little Stars Primary (for when our little one arrives): a dollhouse classroom with
// little desks, a chalkboard, a reading corner with a rug and cubbies with backpacks.

const W = 15;
const ZB = -4.3;
const ZF = 4.4;
const H = 3.0;

export function buildClassroom(ictx) {
  const k = kit();
  const { box, rbox, cyl, sph, at, rot } = k;
  const P = Math.PI;
  const g = new THREE.Group();
  const add = (...o) => (g.add(...o), o[0]);
  const colliders = [];
  const col = (...c) => colliders.push(...c);
  const atlas = makeAtlas(2048, 1024);

  // ---------------------------------------------------------------- shell
  const planks = canvasTexture(256, 256, (c, w, h) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? '#e8c39a' : '#e0b88c';
      c.fillRect(0, (i * h) / 8, w, h / 8);
      c.fillStyle = 'rgba(140,90,50,0.2)';
      c.fillRect(0, (i * h) / 8, w, 2);
      c.fillRect((i * 97) % w, (i * h) / 8, 3, h / 8);
    }
  });
  planks.wrapS = planks.wrapT = THREE.RepeatWrapping;
  const fg = new THREE.PlaneGeometry(W, ZF - ZB);
  uvScale(fg, W / 2.2, (ZF - ZB) / 2.2);
  add(rot(at(mesh(fg, umat('#ffffff', { rough: 0.85, map: planks }), { cast: false }), 0, 0, (ZF + ZB) / 2), -P / 2, 0, 0));
  add(at(box(W + 0.6, 0.4, ZF - ZB + 0.4, '#d9b38c'), 0, -0.21, (ZF + ZB) / 2));
  const paper = canvasTexture(128, 384, (c, w, h) => {
    c.fillStyle = '#fff6d8';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffeab0';
    for (let i = 0; i < 4; i++) c.fillRect(i * 32 + 10, 0, 12, h);
    c.fillStyle = '#bfe6f5';
    c.fillRect(0, h * 0.72, w, h * 0.28);
    c.fillStyle = '#ffffff';
    c.fillRect(0, h * 0.72 - 5, w, 7);
  });
  paper.wrapS = THREE.RepeatWrapping;
  const wg = new THREE.BoxGeometry(W, H, 0.2);
  uvScale(wg, W, 1);
  add(at(mesh(wg, umat('#ffffff', { rough: 0.9, map: paper })), 0, H / 2, ZB - 0.1));
  col({ type: 'box', x: 0, z: ZB - 0.02, hw: W / 2 + 0.2, hd: 0.22 }); // sills and the chalk tray stick out
  for (const s of [-1, 1]) {
    const x = s * (W / 2 + 0.1);
    add(at(box(0.2, H, 4.4, WALL), x, H / 2, ZB + 2.2));
    add(at(box(0.2, 1.1, ZF - ZB - 4.4, WALL), x, 0.55, ZB + 4.4 + (ZF - ZB - 4.4) / 2));
    add(at(box(0.24, 0.08, ZF - ZB - 4.4, C.white), x, 1.12, ZB + 4.4 + (ZF - ZB - 4.4) / 2));
    col({ type: 'box', x, z: (ZB + ZF) / 2, hw: 0.12, hd: (ZF - ZB) / 2 + 0.2 });
  }
  add(at(rbox(W, 0.12, 0.16, '#e9c9a3', 0.04), 0, 0.06, ZF - 0.05));
  col({ type: 'box', x: 0, z: ZF + 0.08, hw: W / 2, hd: 0.14 });

  // Windows with a sunny sky
  const sky = new THREE.MeshBasicMaterial({
    map: canvasTexture(128, 128, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#8fd3ff');
      gr.addColorStop(1, '#e7f7ff');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.ellipse(40, 44, 22, 10, 0, 0, P * 2);
      c.ellipse(56, 38, 16, 10, 0, 0, P * 2);
      c.fill();
      c.fillStyle = '#9ad06a';
      c.beginPath();
      c.ellipse(64, 140, 90, 36, 0, 0, P * 2);
      c.fill();
    }),
  });
  for (const x of [-5.3, 5.3]) {
    add(at(rbox(1.5, 1.3, 0.08, C.white, 0.04), x, 1.75, ZB + 0.04));
    add(at(mesh(new THREE.PlaneGeometry(1.32, 1.12), sky, { cast: false }), x, 1.75, ZB + 0.085));
    add(at(box(0.05, 1.12, 0.04, C.white), x, 1.75, ZB + 0.1));
    add(at(box(1.7, 0.06, 0.16, C.white), x, 1.05, ZB + 0.1));
    for (const s of [-1, 1]) add(at(rbox(0.3, 1.6, 0.07, '#ff9eb5', 0.035), x + s * 0.9, 1.7, ZB + 0.18));
  }

  // Chalkboard with a welcome
  add(at(rbox(4.4, 1.6, 0.1, C.woodDark, 0.05), 0, 1.75, ZB + 0.06));
  const board = atlas.panel(4.2, 1.4, 900, 300, (c, w, h) => {
    c.fillStyle = '#3f7a5e';
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 30; i++) c.fillRect((i * 131) % w, (i * 71) % h, 40, 3);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#ffffff';
    fitText(c, 'Welcome, little one!', w / 2, h * 0.36, w * 0.8, 74);
    c.fillStyle = '#ffd166';
    fitText(c, '1 + 1 = 3', w * 0.28, h * 0.72, w * 0.3, 54);
    c.fillStyle = '#ff9eb5';
    for (const x of [0.62, 0.72, 0.82]) {
      heartPath(c, w * x, h * 0.72, 46);
      c.fill();
    }
  });
  add(at(board, 0, 1.75, ZB + 0.115));
  add(at(box(4.2, 0.06, 0.12, C.woodDark), 0, 0.93, ZB + 0.12));
  for (const [x, c] of [[-1.5, C.white], [-1.35, C.pink], [-1.2, C.sun]]) add(at(rot(cyl(0.015, 0.015, 0.1, c, 6), 0, 0, P / 2), x, 0.98, ZB + 0.14));
  // Alphabet bunting
  const letters = 'ABCDEFGHIJKL'.split('');
  letters.forEach((ch, i) => {
    const x = -6.2 + i * 1.13;
    const fgeo = fixShapeUv(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.2, 0), new THREE.Vector2(0.2, 0), new THREE.Vector2(0, -0.38)])), 0.4, 0.38);
    const flag = atlas.wrap(fgeo, 96, 96, (c, w, h) => {
      c.fillStyle = ['#ef5b6f', '#ffd166', '#7fd8bf', '#8fd3ff', '#c7a6ff', '#ff9eb5'][i % 6];
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `700 ${h * 0.42}px ${FONT}`;
      c.fillText(ch, w / 2, h * 0.32);
    });
    add(at(flag, x, 2.85 - Math.sin((i / 11) * P) * 0.12, ZB + 0.08));
  });
  // Clock
  add(at(rot(cyl(0.3, 0.3, 0.06, C.white, 24), P / 2, 0, 0), 3.3, 2.45, ZB + 0.05));
  add(at(rot(k.tor(0.3, 0.035, '#6fb8ff', P * 2, undefined, 24, 6), 0, 0, 0), 3.3, 2.45, ZB + 0.08));
  add(at(box(0.03, 0.18, 0.02, C.ink), 3.3, 2.52, ZB + 0.1));
  add(at(rot(box(0.03, 0.13, 0.02, C.ink), 0, 0, -1.2), 3.36, 2.47, ZB + 0.1));

  // ---------------------------------------------------------------- desks
  const DESK = ['#ff9eb5', '#7fd8bf', '#ffd166', '#8fd3ff', '#c7a6ff', '#ffb38a'];
  const seats = [];
  [-3.0, -1.0, 1.0].forEach((x, ix) => {
    [-0.3, 1.6].forEach((z, iz) => {
      const c = DESK[ix * 2 + iz];
      add(at(rbox(1.0, 0.07, 0.6, C.wood, 0.03), x, 0.62, z));
      add(at(rbox(0.92, 0.22, 0.52, c, 0.04), x, 0.48, z));
      for (const [dx, dz] of [[-0.42, -0.24], [0.42, -0.24], [-0.42, 0.24], [0.42, 0.24]]) add(at(cyl(0.025, 0.025, 0.58, C.steel, 6), x + dx, 0.29, z + dz));
      // Little chair facing the board
      add(at(rbox(0.44, 0.06, 0.4, c, 0.03), x, 0.36, z + 0.58));
      add(at(rbox(0.44, 0.36, 0.06, c, 0.03), x, 0.6, z + 0.8));
      for (const [dx, dz] of [[-0.18, 0.42], [0.18, 0.42], [-0.18, 0.74], [0.18, 0.74]]) add(at(cyl(0.02, 0.02, 0.36, C.steel, 6), x + dx, 0.18, z + dz));
      // Crayons, a book and a name card
      add(at(rot(rbox(0.26, 0.03, 0.2, ['#ffffff', '#fff1c6'][iz], 0.01), 0, 0.2, 0), x - 0.2, 0.67, z));
      for (let j = 0; j < 3; j++) add(at(rot(cyl(0.012, 0.012, 0.14, DESK[(j + ix) % 6], 6), 0, 0, P / 2), x + 0.22, 0.672, z - 0.08 + j * 0.05));
      col({ type: 'box', x, z, hw: 0.52, hd: 0.32, h: 0.66 });
      col({ type: 'box', x, z: z + 0.62, hw: 0.24, hd: 0.24, h: 0.39 });
      seats.push({ x, z: z + 0.6 });
    });
  });
  // Teacher's desk with an apple and a globe
  add(at(rbox(1.7, 0.08, 0.8, C.woodDark, 0.03), -5.0, 0.78, -2.3));
  add(at(rbox(1.6, 0.7, 0.7, '#c98a5a', 0.04), -5.0, 0.38, -2.3));
  add(at(sph(0.1, C.red, { rough: 0.4 }, 12), -5.4, 0.9, -2.2));
  add(at(cyl(0.008, 0.008, 0.05, C.woodDark, 4), -5.4, 1.0, -2.2));
  add(at(rot(sph(0.04, C.leaf, undefined, 6), 0, 0, 0.6), -5.36, 1.0, -2.2)).scale.set(1, 0.4, 0.6);
  add(at(cyl(0.08, 0.1, 0.04, C.gold, 10), -4.5, 0.84, -2.3));
  add(at(cyl(0.012, 0.012, 0.1, C.gold, 6), -4.5, 0.9, -2.3));
  add(at(sph(0.18, '#6fb8ff', undefined, 16), -4.5, 1.12, -2.3));
  add(at(sph(0.1, C.leaf, undefined, 8), -4.42, 1.18, -2.18)).scale.set(1, 0.7, 0.6);
  for (let j = 0; j < 3; j++) add(at(box(0.3, 0.06, 0.22, ['#ef5b6f', '#ffd166', '#7fd8bf'][j]), -5.0, 0.85 + j * 0.06, -2.4));
  col({ type: 'box', x: -5.0, z: -2.3, hw: 0.85, hd: 0.42, h: 0.82 });

  // ---------------------------------------------------------------- reading corner
  const rug = atlas.wrap(new THREE.CircleGeometry(1.5, 36), 256, 256, (c, w) => {
    ['#ffd1dc', '#ffeab0', '#c9f0e2', '#d8ecff', '#ffd1dc'].forEach((cc, i) => {
      c.fillStyle = cc;
      c.beginPath();
      c.arc(w / 2, w / 2, w * (0.5 - i * 0.1), 0, P * 2);
      c.fill();
    });
  });
  add(at(rot(rug, -P / 2, 0, 0), 4.6, 0.01, 0.6));
  for (const [x, z, c] of [[3.8, 0.9, C.sun], [5.4, 1.1, '#8fd3ff'], [4.7, -0.3, C.pink]]) {
    const bag = sph(0.42, c, { rough: 0.9 }, 14);
    bag.scale.set(1, 0.6, 1);
    add(at(bag, x, 0.25, z));
    col({ type: 'circle', x, z, r: 0.4, h: 0.4 });
  }
  add(at(box(2.2, 1.3, 0.4, C.wood), 5.6, 0.65, ZB + 0.22));
  for (let s = 0; s < 3; s++) {
    let x = 4.6;
    let j = 0;
    while (x < 6.6) {
      const bw = 0.07 + ((j * 37) % 5) * 0.012;
      const bh = 0.26 + ((j * 53) % 4) * 0.025;
      add(at(box(bw, bh, 0.26, DESK[(j + s) % 6]), x + bw / 2, 0.12 + s * 0.42 + bh / 2, ZB + 0.28));
      x += bw + 0.012;
      j++;
    }
  }
  col({ type: 'box', x: 5.6, z: ZB + 0.22, hw: 1.1, hd: 0.22 });
  // Cubbies with little backpacks on the left
  add(at(box(2.4, 1.0, 0.5, C.white), -5.6, 0.5, ZB + 0.27 + 1.9));
  for (let i = 0; i < 4; i++) {
    const x = -6.5 + i * 0.6;
    add(at(box(0.5, 0.4, 0.1, ['#ff9eb5', '#7fd8bf', '#ffd166', '#8fd3ff'][i]), x, 0.75, ZB + 2.42));
    const bag = rbox(0.36, 0.4, 0.2, DESK[(i + 3) % 6], 0.08);
    add(at(bag, x, 1.2, ZB + 2.2));
  }
  col({ type: 'box', x: -5.6, z: ZB + 2.17, hw: 1.2, hd: 0.25, h: 1.0 });
  // Plants
  for (const [x, z] of [[-7.0, 3.6], [7.0, 3.6]]) {
    add(at(cyl(0.22, 0.17, 0.4, '#e08a5c', 14), x, 0.2, z));
    for (let i = 0; i < 5; i++) add(at(sph(0.2, i % 2 ? C.leaf : C.leafDark, { rough: 0.8 }, 10), x + Math.cos(i * 1.3) * 0.12, 0.6 + (i % 3) * 0.14, z + Math.sin(i * 1.3) * 0.1));
    col({ type: 'circle', x, z, r: 0.25 });
  }

  const hotspots = [
    {
      x: -1.0,
      z: 2.9,
      r: 1.3,
      icon: 'book',
      label: 'Sit at a little desk',
      act: (api) =>
        api.activity({
          label: 'Get up',
          seats: [
            { who: 'player', x: seats[3].x, z: seats[3].z, y: 0.24, yaw: P, pose: 'sit', hands: 'read' },
            { who: 'partner', x: seats[5].x, z: seats[5].z, y: 0.24, yaw: P, pose: 'sit', hands: 'type' },
          ],
          focus: { x: 0, z: 1.2, y: 0.9, zoom: 0.6 },
          exit: { x: -0.5, z: 3.2 },
          onEnd: (silent) => !silent && api.toast('Tiny chairs for a tiny someone, one day soon.', 2400),
        }),
    },
    {
      x: 4.6,
      z: 2.1,
      r: 1.2,
      icon: 'book',
      label: 'Read a story',
      act: (api) =>
        api.activity({
          label: 'Get up',
          seats: [
            { who: 'player', x: 4.2, z: 0.9, y: 0, yaw: 0.3, pose: 'sit', hands: 'read' },
            { who: 'partner', x: 5.1, z: 1.1, y: 0, yaw: -0.3, pose: 'sit' },
          ],
          focus: { x: 4.6, z: 0.8, y: 0.7, zoom: 0.55 },
          exit: { x: 4.4, z: 2.4 },
        }),
    },
  ];

  const dynamic = colorBake(g);
  return {
    group: g,
    dynamic,
    colliders,
    hotspots,
    size: { w: W, d: ZF - ZB },
    spawn: { x: 0, z: 3.2, yaw: P },
    exit: { x: 0, z: 3.9 },
    background: '#ffe8c8',
  };
}

// ShapeGeometry uvs are the raw shape coordinates: map them to 0..1 over the shape's box.
function fixShapeUv(geo, w, h) {
  const p = geo.attributes.position;
  const arr = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    arr[i * 2] = p.getX(i) / w + 0.5;
    arr[i * 2 + 1] = 1 + p.getY(i) / h;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(arr, 2));
  return geo;
}
