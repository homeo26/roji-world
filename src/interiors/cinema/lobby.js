import { THREE, C, mat, mesh, roundRect, FONT, fitText, heartPath, freeze } from '../../places/school/kit.js';
import { popcornMachine, bucket, drawPoster, RED, DEEP, GOLD, WINE } from './models.js';

// The cinema lobby: ticket booth, popcorn counter with a helper, a candy shelf, movie posters,
// a cosy sofa and the big popcorn cart where Popcorn Catch starts.

const P = Math.PI;
const HELPER = { id: 'popcorn-helper', name: 'Popcorn helper', gender: 'girl', skin: '#e3b08e', hair: '#7a4a26', hairstyle: 'ponytail', outfit: 'skirt', top: '#e5484d', bottom: '#3b2b3f', shoes: '#3b2b3f', accent: '#ffd166' };
const USHER = { id: 'ticket-usher', name: 'Ticket usher', gender: 'boy', skin: '#c98f68', hair: '#2a1a13', hairstyle: 'curly', outfit: 'tee-pants', top: '#3b2b3f', bottom: '#3b2b3f', shoes: '#3b2b3f', accent: '#e5484d' };

export const COUNTER = { x: -9.1, z: -3.3 };
export const CART = { x: -6.3, z: 1.2 };
export const BOOTH = { x: -13.6, z: 0.5 };

export function buildLobby(R) {
  const { k, add, dyn, col, hot, upd, atlas, L, ictx } = R;
  const { box, rbox, cyl, sph, cone, star, heart, at, rot } = k;
  const ZB = L.ZB;
  const name = (a) => (a.playerId === 'roji' ? 'Roji' : 'Homama');
  const other = (a) => (a.playerId === 'roji' ? 'Homama' : 'Roji');

  // ---------------------------------------------------------------- red carpet runner
  const runner = mat('#d43f4f', { rough: 1 });
  const edge = mat(GOLD, { rough: 0.6 });
  add(rot(at(mesh(new THREE.PlaneGeometry(1.3, 6.6), runner, { cast: false }), -12.2, 0.012, 1.55), -P / 2, 0, 0));
  add(rot(at(mesh(new THREE.PlaneGeometry(9.2, 1.2), runner, { cast: false }), -7.45, 0.014, -1.5), -P / 2, 0, 0));
  for (const s of [-1, 1]) {
    add(rot(at(mesh(new THREE.PlaneGeometry(0.06, 6.0), edge, { cast: false }), -12.2 + s * 0.62, 0.016, 1.85), -P / 2, 0, 0));
    add(rot(at(mesh(new THREE.PlaneGeometry(8.6, 0.06), edge, { cast: false }), -7.15, 0.018, -1.5 + s * 0.57), -P / 2, 0, 0));
  }

  // ---------------------------------------------------------------- posters on the wall
  const poster = (id, x, y = 1.95) => {
    add(at(rbox(1.14, 1.54, 0.08, GOLD, 0.04, { metal: 0.3, rough: 0.4 }), x, y, ZB + 0.05));
    add(at(atlas.panel(1.0, 1.4, 256, 358, (c, w, h) => drawPoster(c, w, h, id)), x, y, ZB + 0.1));
    add(at(sph(0.06, mat('#fff2c2', { emissive: '#ffd27a', ei: 1.2 }), undefined, 10), x, y + 0.92, ZB + 0.12));
  };
  poster('panda', -12.3);
  // One more on the side wall, facing into the room
  const side = new THREE.Group();
  side.add(rbox(1.14, 1.54, 0.08, GOLD, 0.04, { metal: 0.3, rough: 0.4 }));
  side.add(at(atlas.panel(1.0, 1.4, 256, 358, (c, w, h) => drawPoster(c, w, h, 'twostars')), 0, 0, 0.05));
  side.add(at(sph(0.06, mat('#fff2c2', { emissive: '#ffd27a', ei: 1.2 }), undefined, 10), 0, 0.92, 0.07));
  side.rotation.y = P / 2;
  add(at(side, -14.95, 1.95, -1.7));
  poster('moonbunny', -5.6);
  poster('kitty', -4.15);

  // ---------------------------------------------------------------- candy shelf
  const SX = -13.95;
  const SZ = ZB + 0.26;
  add(at(box(1.62, 2.0, 0.08, '#c98a5a'), SX, 1.0, ZB + 0.04));
  for (const s of [-1, 1]) add(at(box(0.08, 2.0, 0.46, '#c98a5a'), SX + s * 0.77, 1.0, SZ));
  for (const y of [0.06, 0.7, 1.32, 1.96]) add(at(box(1.62, 0.06, 0.48, '#d9a06a'), SX, y, SZ));
  const jarGeos = [];
  const candies = [];
  const candyCols = ['#ff7fa3', '#ffd166', '#7fd8bf', '#8fd3ff', '#c7a6ff', '#ffffff', '#ff9a5a'];
  [0.74, 1.36].forEach((y, row) => {
    [-0.48, 0, 0.48].forEach((dx, j) => {
      const jx = SX + dx;
      const g = new THREE.CylinderGeometry(0.17, 0.17, 0.42, 16, 1, true);
      g.translate(jx, y + 0.21, SZ);
      jarGeos.push(g);
      add(at(cyl(0.18, 0.18, 0.06, candyCols[(row * 3 + j) % 7], 16), jx, y + 0.45, SZ));
      add(at(sph(0.04, C.white, undefined, 8), jx, y + 0.5, SZ));
      for (let i = 0; i < 14; i++) {
        const a = i * 2.4;
        const r = (i % 3) * 0.055;
        candies.push([jx + Math.cos(a) * r, y + 0.05 + Math.floor(i / 3) * 0.06, SZ + Math.sin(a) * r, candyCols[(i + row + j * 2) % 7]]);
      }
    });
  });
  const jars = mesh(
    mergeAll(jarGeos),
    new THREE.MeshStandardMaterial({ color: '#e8f7ff', roughness: 0.05, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
    { cast: false, receive: false },
  );
  add(dyn(jars));
  const candyMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.4 }), candies.length);
  const m4 = new THREE.Matrix4();
  const colr = new THREE.Color();
  candies.forEach(([x, y, z, c], i) => {
    candyMesh.setMatrixAt(i, m4.makeTranslation(x, y, z));
    candyMesh.setColorAt(i, colr.set(c));
  });
  add(candyMesh);
  // Lollipops in a cup and chocolate bars on the bottom shelf
  add(at(cyl(0.1, 0.08, 0.16, '#8fd3ff', 12), SX - 0.45, 2.07, SZ));
  [-0.06, 0, 0.06].forEach((dx, i) => {
    add(at(cyl(0.008, 0.008, 0.3, C.white, 4), SX - 0.45 + dx, 2.22, SZ));
    const pop = rot(cyl(0.07, 0.07, 0.025, candyCols[i * 2], 14), P / 2, 0, 0);
    add(at(pop, SX - 0.45 + dx, 2.38 + (i % 2) * 0.05, SZ + 0.02));
  });
  for (let i = 0; i < 5; i++) add(at(rbox(0.22, 0.05, 0.12, ['#8a5a3c', '#e5484d', '#8a5a3c', '#ffd166', '#8a5a3c'][i], 0.015), SX - 0.45 + (i % 3) * 0.26, 0.12 + Math.floor(i / 3) * 0.06, SZ + 0.04));
  add(at(bucket(k, { r: 0.13, h: 0.2, heap: 6 }), SX + 0.42, 0.09, SZ));
  const sweets = atlas.panel(1.2, 0.36, 400, 120, (c, w, h) => {
    c.fillStyle = '#fff4e6';
    roundRect(c, 0, 0, w, h, 40);
    c.fill();
    c.fillStyle = RED;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Sweet treats', w / 2, h / 2 + 3, w * 0.8, h * 0.56, 700);
  });
  add(at(sweets, SX + 0.25, 2.3, SZ + 0.02));
  col({ type: 'box', x: SX, z: SZ, hw: 0.82, hd: 0.26 });

  // ---------------------------------------------------------------- popcorn counter
  const { x: CX, z: CZ } = COUNTER;
  add(at(rbox(4.4, 0.98, 0.8, RED, 0.05), CX, 0.49, CZ));
  add(at(rbox(4.56, 0.08, 0.94, '#fff4e6', 0.03), CX, 1.02, CZ));
  add(at(box(4.42, 0.08, 0.82, GOLD), CX, 0.06, CZ));
  const front = atlas.panel(4.2, 0.72, 1024, 176, (c, w, h) => {
    for (let i = 0; i < 16; i++) {
      c.fillStyle = i % 2 ? '#ffffff' : '#e5484d';
      c.fillRect((i * w) / 16, 0, w / 16 + 1, h);
    }
    c.fillStyle = '#fff4e6';
    roundRect(c, w * 0.28, h * 0.14, w * 0.44, h * 0.72, h * 0.3);
    c.fill();
    c.strokeStyle = GOLD;
    c.lineWidth = 8;
    c.stroke();
    c.fillStyle = DEEP;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Fresh popcorn', w / 2, h / 2 + 4, w * 0.4, h * 0.42, 700);
  });
  add(at(front, CX, 0.52, CZ + 0.405));
  // On the counter: the machine, a stack of buckets, the till and the cocoa tap
  const machine = popcornMachine(k);
  machine.root.position.set(CX - 1.35, 1.06, CZ - 0.05);
  add(machine.root);
  machine.bake();
  dyn(machine.kettle);
  dyn(machine.pops);
  dyn(machine.glass);
  for (let i = 0; i < 3; i++) add(at(bucket(k, { r: 0.13, h: 0.2, heap: i === 2 ? 8 : 0, badge: i === 2 }), CX - 0.25, 1.06 + i * 0.12, CZ - 0.05));
  add(at(bucket(k, { r: 0.13, h: 0.2, heap: 8 }), CX + 0.12, 1.06, CZ + 0.15));
  add(at(rbox(0.5, 0.26, 0.4, '#fff4e6', 0.04), CX + 0.75, 1.19, CZ - 0.05));
  add(at(rot(rbox(0.4, 0.24, 0.04, '#3b2b3f', 0.02), -0.5, 0, 0), CX + 0.75, 1.45, CZ - 0.12));
  add(at(rot(box(0.32, 0.16, 0.01, '#9fe0c8'), -0.5, 0, 0), CX + 0.75, 1.46, CZ - 0.095)).material = mat('#bff0e2', { emissive: '#9fe0c8', ei: 0.6 });
  for (let i = 0; i < 3; i++) add(at(sph(0.03, ['#ff7fa3', '#ffd166', '#7fd8bf'][i], undefined, 8), CX + 0.62 + i * 0.13, 1.33, CZ + 0.12));
  add(at(rbox(0.6, 0.62, 0.42, '#c9c3cf', 0.05, { metal: 0.3, rough: 0.35 }), CX + 1.6, 1.37, CZ - 0.08));
  add(at(rbox(0.5, 0.2, 0.05, '#8a5a3c', 0.03), CX + 1.6, 1.56, CZ + 0.14));
  for (let i = 0; i < 3; i++) {
    add(at(cyl(0.025, 0.025, 0.1, C.steel, 6), CX + 1.45 + i * 0.15, 1.28, CZ + 0.16));
    add(at(cyl(0.05, 0.04, 0.12, ['#ffffff', '#ff9eb5', '#8fd3ff'][i], 10), CX + 1.45 + i * 0.15, 1.12, CZ + 0.2));
  }
  col({ type: 'box', x: CX, z: CZ, hw: 2.28, hd: 0.47 });
  // Menu board on the wall
  add(at(rbox(3.6, 1.06, 0.08, GOLD, 0.05), CX, 2.62, ZB + 0.05));
  const menu = atlas.panel(3.44, 0.92, 1024, 274, (c, w, h) => {
    c.fillStyle = WINE;
    roundRect(c, 0, 0, w, h, 30);
    c.fill();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#ffd166';
    fitText(c, 'Snacks', w / 2, h * 0.22, w * 0.5, h * 0.24, 700);
    const items = [['Popcorn', '#fff3cf'], ['Hot cocoa', '#c98a5a'], ['Candy', '#ff9eb5'], ['Lemonade', '#ffe680']];
    items.forEach(([t, cc], i) => {
      const x = w * (0.14 + i * 0.24);
      c.fillStyle = cc;
      c.beginPath();
      c.arc(x, h * 0.55, h * 0.13, 0, P * 2);
      c.fill();
      c.fillStyle = '#fff6e6';
      fitText(c, t, x, h * 0.82, w * 0.2, h * 0.15, 600);
    });
    c.fillStyle = '#ff9eb5';
    heartPath(c, w * 0.12, h * 0.22, h * 0.16);
    c.fill();
    heartPath(c, w * 0.88, h * 0.22, h * 0.16);
    c.fill();
  });
  add(at(menu, CX, 2.62, ZB + 0.1));
  // The popcorn helper, frozen in a cheerful pose with a striped paper hat
  const helper = ictx.makeKid(HELPER);
  const hat = new THREE.Group();
  hat.add(mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.17, 16), new THREE.MeshStandardMaterial({ map: stripeTexture(), roughness: 0.7 })));
  hat.add(at(rbox(0.36, 0.05, 0.08, C.white, 0.02), 0, -0.07, 0.17));
  hat.position.set(0, 0.6, -0.02);
  hat.rotation.x = -0.15;
  helper.head.add(hat);
  freeze(helper, { pose: 'stand', hands: 'hold' });
  helper.root.position.set(CX - 0.3, 0.3, ZB + 0.55);
  add(helper.root);

  // ---------------------------------------------------------------- ticket booth
  const { x: BX, z: BZ } = BOOTH;
  add(at(rbox(1.5, 1.05, 1.1, RED, 0.06), BX, 0.525, BZ));
  add(at(rbox(1.62, 0.08, 1.22, GOLD, 0.03), BX, 1.09, BZ));
  add(at(star(0.18, 0.08, 0.04, GOLD), BX, 0.6, BZ + 0.57));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(at(cyl(0.035, 0.035, 1.12, GOLD, 8), BX + x * 0.7, 1.68, BZ + z * 0.5));
  add(at(rbox(1.7, 0.12, 1.3, RED, 0.04), BX, 2.28, BZ));
  const dome = mesh(new THREE.SphereGeometry(0.46, 18, 8, 0, P * 2, 0, P / 2), mat(GOLD, { rough: 0.4 }));
  add(at(dome, BX, 2.32, BZ));
  add(at(star(0.14, 0.06, 0.04, mat(C.sun, { emissive: '#ffb200', ei: 0.4 })), BX, 2.96, BZ));
  add(at(rbox(1.3, 0.36, 0.06, GOLD, 0.04), BX, 2.48, BZ + 0.62));
  const tix = atlas.panel(1.22, 0.3, 420, 104, (c, w, h) => {
    c.fillStyle = WINE;
    roundRect(c, 0, 0, w, h, 28);
    c.fill();
    c.fillStyle = '#fff6d8';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'TICKETS', w / 2, h / 2 + 3, w * 0.8, h * 0.6, 700);
  });
  add(at(tix, BX, 2.48, BZ + 0.66));
  add(at(rbox(0.8, 0.05, 0.3, C.white, 0.02), BX, 1.15, BZ + 0.52));
  add(at(rot(cyl(0.06, 0.06, 0.1, '#ff9eb5', 12), 0, 0, P / 2), BX + 0.28, 1.22, BZ + 0.5));
  const usher = ictx.makeKid(USHER);
  for (const s of [-1, 1]) {
    const tie = cone(0.05, 0.09, RED, 8);
    tie.rotation.z = (s * P) / 2;
    usher.body.add(at(tie, s * 0.045, 0.74, 0.14));
  }
  usher.body.add(at(sph(0.025, RED, undefined, 8), 0, 0.74, 0.15));
  freeze(usher, { pose: 'stand' });
  usher.root.position.set(BX, 0.5, BZ - 0.12);
  add(usher.root);
  col({ type: 'box', x: BX, z: BZ, hw: 0.8, hd: 0.6 });
  // A ticket that slides out of the slot
  const ticket = atlas.panel(0.26, 0.12, 128, 60, (c, w, h) => {
    c.fillStyle = '#ffd166';
    roundRect(c, 0, 0, w, h, 10);
    c.fill();
    c.fillStyle = WINE;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 ${h * 0.5}px ${FONT}`;
    c.fillText('ADMIT 2', w / 2, h / 2 + 2);
  });
  ticket.rotation.x = -P / 2;
  ticket.position.set(BX + 0.28, 1.18, BZ + 0.5);
  ticket.visible = false;
  add(dyn(ticket));
  // Queue ropes
  const ropeMat = mat('#9e1b32', { rough: 0.6 });
  const posts = [[-14.5, 1.95], [-13.6, 1.95], [-12.75, 1.95]];
  for (const [x, z] of posts) {
    add(at(cyl(0.05, 0.08, 0.9, GOLD, 10), x, 0.45, z));
    add(at(sph(0.08, GOLD, undefined, 10), x, 0.92, z));
    add(at(cyl(0.16, 0.18, 0.04, GOLD, 12), x, 0.02, z));
    col({ type: 'circle', x, z, r: 0.1 });
  }
  for (let i = 0; i < posts.length - 1; i++) {
    const [a, b] = [posts[i], posts[i + 1]];
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(a[0], 0.84, a[1]), new THREE.Vector3((a[0] + b[0]) / 2, 0.58, a[1]), new THREE.Vector3(b[0], 0.84, b[1]));
    add(mesh(new THREE.TubeGeometry(curve, 12, 0.035, 6), ropeMat));
  }

  // ---------------------------------------------------------------- sofa, cart, easel, plants, steps
  const SOFA = { x: -9.6, z: 2.6 };
  add(at(rbox(1.9, 0.3, 0.8, RED, 0.08), SOFA.x, 0.3, SOFA.z));
  add(at(rbox(1.9, 0.62, 0.22, RED, 0.1), SOFA.x, 0.62, SOFA.z - 0.34));
  for (const s of [-1, 1]) {
    add(at(rbox(0.24, 0.5, 0.82, DEEP, 0.1), SOFA.x + s * 0.92, 0.42, SOFA.z));
    add(at(cyl(0.04, 0.03, 0.15, GOLD, 8), SOFA.x + s * 0.8, 0.075, SOFA.z + 0.3));
    add(at(cyl(0.04, 0.03, 0.15, GOLD, 8), SOFA.x + s * 0.8, 0.075, SOFA.z - 0.3));
  }
  add(at(rot(heart(0.32, 0.12, mat('#ffd166', { rough: 0.9 })), -0.25, 0.2, 0), SOFA.x - 0.45, 0.66, SOFA.z - 0.16));
  add(at(rot(heart(0.28, 0.12, mat('#ff9eb5', { rough: 0.9 })), -0.25, -0.2, 0.1), SOFA.x + 0.5, 0.64, SOFA.z - 0.16));
  col({ type: 'box', x: SOFA.x, z: SOFA.z, hw: 1.0, hd: 0.42, h: 0.46 });
  R.sofa = SOFA;
  // The big popcorn cart with its game sign
  const cart = popcornMachine(k, { cart: true });
  cart.root.position.set(CART.x, 0, CART.z);
  cart.root.rotation.y = -0.25;
  add(cart.root);
  cart.bake();
  dyn(cart.kettle);
  dyn(cart.pops);
  dyn(cart.glass);
  const gameSign = new THREE.Group();
  gameSign.add(at(cyl(0.03, 0.04, 1.2, GOLD, 8), 0, 0.6, 0));
  gameSign.add(at(rbox(1.08, 0.5, 0.06, GOLD, 0.04), 0, 1.35, 0));
  gameSign.add(at(atlas.panel(1.0, 0.42, 400, 168, (c, w, h) => {
    c.fillStyle = '#fff4e6';
    roundRect(c, 0, 0, w, h, 30);
    c.fill();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = RED;
    fitText(c, 'Popcorn Catch', w / 2, h * 0.38, w * 0.86, h * 0.32, 700);
    c.fillStyle = '#4a3423';
    fitText(c, 'Fill the bucket!', w / 2, h * 0.74, w * 0.8, h * 0.2, 600);
  }), 0, 1.35, 0.035));
  add(at(gameSign, CART.x + 1.05, 0, CART.z + 0.3));
  col({ type: 'circle', x: CART.x, z: CART.z, r: 0.62 }, { type: 'circle', x: CART.x + 1.05, z: CART.z + 0.3, r: 0.08 });
  // Coming soon easel
  const easel = new THREE.Group();
  for (const s of [-1, 1]) easel.add(at(rot(rbox(0.06, 1.7, 0.06, '#9b6a43', 0.02), 0.12, 0, s * 0.12), s * 0.36, 0.82, -0.05));
  easel.add(at(rot(rbox(0.06, 1.6, 0.06, '#9b6a43', 0.02), -0.3, 0, 0), 0, 0.78, -0.3));
  easel.add(at(rbox(0.86, 1.18, 0.05, GOLD, 0.03), 0, 1.12, 0.02));
  easel.add(at(rot(atlas.panel(0.76, 1.06, 256, 358, (c, w, h) => drawPoster(c, w, h, 'cupcake')), 0, 0, 0), 0, 1.12, 0.05));
  easel.rotation.x = -0.12;
  add(at(easel, -5.0, 0, 3.6));
  col({ type: 'box', x: -5.0, z: 3.5, hw: 0.45, hd: 0.25 });
  // Plants
  for (const [x, z] of [[-3.65, -3.95], [-14.35, 4.0], [-7.5, -3.95]]) {
    add(at(cyl(0.24, 0.18, 0.46, GOLD, 14), x, 0.23, z));
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * P * 2;
      const leaf = sph(0.24, i % 2 ? '#4f9a45' : '#5aa84f', { rough: 0.8 }, 10);
      leaf.scale.set(0.9, 0.24, 0.5);
      leaf.rotation.set(0.3 * Math.sin(a), -a, 0.6 * Math.cos(a));
      add(at(leaf, x + Math.cos(a) * 0.24, 0.8 + (i % 3) * 0.18, z + Math.sin(a) * 0.18));
    }
    col({ type: 'circle', x, z, r: 0.3 });
  }
  // Steps up to the back row of the screening room
  for (let i = 0; i < 3; i++) {
    const h = 0.24 * (i + 1);
    add(at(rbox(0.42, h, 1.4, '#b33545', 0.03), -4.05 + i * 0.4, h / 2, 4.0));
    add(at(box(0.44, 0.03, 1.42, GOLD), -4.05 + i * 0.4, h, 4.0));
    col({ type: 'box', x: -4.05 + i * 0.4, z: 4.0, hw: 0.2, hd: 0.7, h });
  }
  // "Screen 1" sign over the doorway
  const s1 = new THREE.Group();
  s1.add(rbox(1.5, 0.5, 0.1, GOLD, 0.05));
  s1.add(at(atlas.panel(1.4, 0.42, 420, 126, (c, w, h) => {
    c.fillStyle = WINE;
    roundRect(c, 0, 0, w, h, 24);
    c.fill();
    c.fillStyle = '#fff6d8';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Screen 1', w / 2, h / 2 + 3, w * 0.8, h * 0.6, 700);
  }), 0, 0, 0.06));
  add(at(s1, L.LOBBY[1] - 0.2, 2.85, L.DOOR[1] + 0.1));

  // ---------------------------------------------------------------- marquee bulbs along the top of the lobby wall
  const bulbs = [];
  for (let x = -14.75; x < -3.2; x += 0.32) bulbs.push([x, L.HL - 0.28, ZB + 0.08]);
  R.bulbs.push(...bulbs);

  // ---------------------------------------------------------------- hotspots
  const state = { give: null, ticketT: -1 };
  const isOurs = (a) => !!a.kid.carried?.userData?.cinemaPopcorn;
  R.popcorn = async () => {
    const obj = await ictx.props.food('popcorn');
    const w = new THREE.Group();
    obj.scale.setScalar(1.5);
    w.add(obj);
    w.position.set(0, -0.14, 0.02);
    w.userData.cinemaPopcorn = true;
    return w;
  };
  hot({
    x: CX - 0.3,
    z: CZ + 1.05,
    r: 1.3,
    icon: 'yum',
    label: 'Get popcorn',
    act: async (a) => {
      if (state.give) return;
      const target = !a.player.kid.carried ? a.player : !a.partner.kid.carried ? a.partner : null;
      if (!target) return a.toast(isOurs(a.player) ? 'Two buckets is plenty for one movie.' : 'Your hands are full right now.', 2200);
      machine.pop(8);
      a.sound.ui('pop');
      const ac = a.sound.ctx;
      if (ac) for (let i = 0; i < 6; i++) a.sound.tone(700 + Math.random() * 500, ac.currentTime + 0.08 + i * 0.09, 0.05, { type: 'triangle', gain: 0.03 });
      state.give = { who: target, t: 0.7, obj: await R.popcorn() };
    },
  });
  hot({
    x: CART.x,
    z: CART.z + 1.1,
    r: 1.25,
    icon: 'game',
    label: 'Play Popcorn Catch',
    when: (a) => a.hasArena('popcorn'),
    act: (a) => {
      cart.pop(10);
      a.playArena('popcorn').then((res) => {
        if (res?.win) a.toast('A full bucket! Now it is movie time.', 2600);
      });
    },
  });
  hot({
    x: BX,
    z: BZ + 1.15,
    r: 1.2,
    icon: 'star',
    label: 'Buy tickets',
    act: (a) => {
      state.ticketT = 0;
      ticket.visible = true;
      a.sound.ui('coin');
      a.emote('player', 'wave');
      a.toast(`Two tickets for ${name(a)} and ${other(a)}, please! The love seat in row three.`, 3000);
    },
  });

  let pulse = 0;
  upd((dt, t, a) => {
    machine.update(dt, t);
    cart.update(dt, t);
    pulse -= dt;
    if (pulse <= 0) {
      pulse = 2.2 + Math.random() * 2;
      cart.pop(3);
      machine.pop(2);
    }
    if (state.give) {
      state.give.t -= dt;
      if (state.give.t <= 0) {
        const { who, obj } = state.give;
        state.give = null;
        if (!who.kid.carried) {
          a.carry(who, obj);
          a.sound.ui('good');
          a.fx.heartsAt(who.kid.head.localToWorld(new THREE.Vector3(0, 0.75, 0)), 2);
          a.toast(who === a.player ? `Fresh popcorn for ${name(a)}, extra butter!` : `And a bucket for ${other(a)} too.`, 2200);
        }
      }
    }
    if (state.ticketT >= 0) {
      state.ticketT += dt;
      const u = Math.min(1, state.ticketT / 0.6);
      ticket.position.z = BZ + 0.5 + u * 0.22;
      if (state.ticketT > 3.5) {
        state.ticketT = -1;
        ticket.visible = false;
        ticket.position.z = BZ + 0.5;
      }
    }
  });
  R.onExit((a) => {
    for (const actor of [a.player, a.partner]) if (isOurs(actor)) a.carry(actor, null);
  });
  R.isOurs = isOurs;
}

function mergeAll(geos) {
  const out = new THREE.BufferGeometry();
  const pos = [];
  const nor = [];
  for (const g of geos) {
    const n = g.index ? g.toNonIndexed() : g;
    pos.push(...n.attributes.position.array);
    nor.push(...n.attributes.normal.array);
  }
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}

let stripe = null;
function stripeTexture() {
  if (stripe) return stripe;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 32;
  const ctx = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#ffffff' : '#e5484d';
    ctx.fillRect(i * 16, 0, 16, 32);
  }
  stripe = new THREE.CanvasTexture(c);
  stripe.colorSpace = THREE.SRGBColorSpace;
  return stripe;
}
