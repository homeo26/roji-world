import { THREE, P, COL, mat, umat, mesh, canvasTexture, roundRect, FONT, fitText, heartPath, boardDraw, skinify } from './kit.js';
import { makeStablePony, addHalter, ponyIdle, makeCat, makeSaddle, makeHelmet, makeFork, makeRosette, makeBrush, glowSprite, livePanel } from './kit.js';

// The furniture, ponies and little stories of the stable interior. Coordinates are the interior's own
// (origin at the room centre, floor at y = 0, the open front toward +Z). See L in interior.js.

const INK = '#5a3424';
const text = (c, s, x, y, size, color = INK, weight = 600, maxW = 9999) => {
  c.fillStyle = color;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  fitText(c, s, x, y, maxW, size, weight);
};

export const PONIES = {
  biscuit: { name: 'Biscuit', sub: "Homama's pony", coat: '#d39a5c', mane: '#fff1d6', halter: COL.blue, blaze: true, socks: false, seed: 0.4 },
  rosie: { name: 'Rosie', sub: "Roji's favourite", coat: '#f0c4b4', mane: '#7a3b2e', halter: COL.pink, blaze: true, socks: true, lashes: true, seed: 1.3 },
  clover: { name: 'Clover', sub: 'Sleepy and sweet', coat: '#e4ded8', mane: '#ffffff', halter: COL.mint, blaze: false, socks: false, spots: '#c9bfb6', seed: 2.2 },
};

// A pony that idles, and can be told to look somewhere for a while (activities call R.pose).
function ponyState(R, id, p, base) {
  const s = { id, p, base, want: null, until: 0, munch: 0, shake: 0, cur: { nx: base.nx, ny: base.ny, hx: 0.55, hz: 0 } };
  R.ponies[id] = s;
  return s;
}

export function buildBackRow(R) {
  const { k, L, add, dyn, col, atlas } = R;
  const { box, rbox, cyl, sph, tor, cone, at, rot } = k;
  const { ZB, ZS } = L;

  // ---------------------------------------------------------------- feed room
  const [f0, f1] = L.FEED;
  const FD = [-10.2, -8.8]; // doorway
  for (const [a, b] of [[f0, FD[0]], [FD[1], f1]]) {
    add(at(box(b - a, 1.2, 0.14, COL.wood), (a + b) / 2, 0.6, ZS));
    add(at(box(b - a + 0.04, 0.08, 0.22, COL.woodDark), (a + b) / 2, 1.24, ZS));
    col((a + b) / 2, ZS, (b - a) / 2, 0.09);
  }
  for (const x of FD) add(at(box(0.16, 2.3, 0.16, COL.woodDark), x, 1.15, ZS));
  add(at(box(FD[1] - FD[0] + 0.16, 0.16, 0.16, COL.woodDark), (FD[0] + FD[1]) / 2, 2.3, ZS));
  const feedSign = atlas.panel(1.3, 0.36, 400, 110, boardDraw(['Feed room'], { edge: COL.sun, fill: COL.trim, ink: INK }));
  add(at(feedSign, (FD[0] + FD[1]) / 2, 2.62, ZS + 0.02));
  // Solid wall between the feed room and Biscuit's stall
  add(at(box(0.14, 2.3, ZS - ZB, COL.wood), f1, 1.15, (ZB + ZS) / 2));
  add(at(box(0.2, 0.08, ZS - ZB, COL.woodDark), f1, 2.32, (ZB + ZS) / 2));
  col(f1, (ZB + ZS) / 2, 0.08, (ZS - ZB) / 2);
  // Three feed bins with labels; the oats bin lid opens when you scoop
  const bins = [['Oats', COL.sky ?? COL.blue], ['Carrots', '#ff9a4a'], ['Apples', COL.rose]];
  R.state.binLid = null;
  bins.forEach(([name, c], i) => {
    const x = -11.2 + i * 1.0;
    add(at(rbox(0.82, 0.78, 0.7, c === COL.rose ? '#f08a8a' : c === '#ff9a4a' ? '#ffc27a' : '#9ccff5', 0.06), x, 0.39, ZB + 0.45));
    const lid = new THREE.Group();
    lid.position.set(x, 0.79, ZB + 0.1);
    lid.add(at(rbox(0.86, 0.07, 0.74, COL.woodDark, 0.03), 0, 0, 0.35));
    lid.add(at(sph(0.05, COL.woodLight), 0, 0.06, 0.55));
    add(lid);
    if (i === 0) {
      R.state.binLid = dyn(lid);
      R.bake.push(lid);
    }
    const lab = atlas.panel(0.56, 0.2, 224, 80, boardDraw([name], { edge: c, fill: COL.trim, ink: INK, radius: 0.35 }));
    add(at(lab, x, 0.5, ZB + 0.81));
  });
  col(-10.2, ZB + 0.45, 1.45, 0.38, 0.82);
  // Oats heaped in the open bin (seen when the lid lifts)
  add(at(sph(0.3, '#e8cf8f', undefined, 10), -11.2, 0.72, ZB + 0.45)).scale.set(1.25, 0.25, 1.05);
  // Shelf with jars and Homama's little sugar tin
  add(at(box(2.9, 0.06, 0.32, COL.woodDark), -10.2, 1.62, ZB + 0.16));
  for (const dx of [-1.3, 1.3]) add(at(box(0.05, 0.22, 0.3, COL.woodDark), -10.2 + dx, 1.5, ZB + 0.16));
  [['#ffd166', 0.14], ['#c7a6ff', 0.11], ['#7fd8bf', 0.13], ['#ffffff', 0.1]].forEach(([c, h], i) => {
    add(at(cyl(0.07, 0.07, h + 0.1, '#eaf6ff', 12), -11.4 + i * 0.36, 1.65 + (h + 0.1) / 2, ZB + 0.16));
    add(at(cyl(0.072, 0.072, 0.04, c, 12), -11.4 + i * 0.36, 1.67 + h + 0.12, ZB + 0.16));
  });
  const TIN = { x: -9.15, y: 1.65, z: ZB + 0.18 };
  add(at(cyl(0.13, 0.13, 0.14, COL.pink, 18), TIN.x, TIN.y + 0.07, TIN.z));
  add(at(cyl(0.132, 0.132, 0.025, '#ffffff', 18), TIN.x, TIN.y + 0.03, TIN.z));
  const tinLid = new THREE.Group();
  tinLid.position.set(TIN.x, TIN.y + 0.14, TIN.z - 0.13);
  tinLid.add(at(cyl(0.138, 0.138, 0.035, COL.rose, 18), 0, 0.018, 0.13));
  tinLid.add(rot(at(k.heart(0.1, 0.02, '#ffffff'), 0, 0.04, 0.13), -P / 2, 0, 0));
  add(dyn(tinLid));
  R.bake.push(tinLid);
  R.state.tinLid = tinLid;
  R.state.tin = TIN;
  const cubes = new THREE.Group();
  for (const [dx, dz] of [[-0.04, 0], [0.04, 0.02], [0, -0.04]]) cubes.add(at(box(0.045, 0.045, 0.045, '#ffffff'), dx, 0.155, dz));
  cubes.position.set(TIN.x, TIN.y, TIN.z);
  add(cubes);
  const tag = atlas.panel(0.3, 0.12, 150, 60, (c, w, h) => {
    c.fillStyle = '#fff7ea';
    roundRect(c, 2, 2, w - 4, h - 4, 12);
    c.fill();
    text(c, 'For Rosie. H.', w / 2, h / 2 + 2, 26, COL.rose, 700, w - 16);
  });
  add(rot(at(tag, TIN.x, TIN.y + 0.06, TIN.z + 0.15), 0, 0, 0.08));
  // Hay bales along the wall, to climb
  const hayM = mat(COL.hay, { rough: 1 });
  for (const [x, y, z, ax] of [[-7.85, 0, -6.2, 'z'], [-7.85, 0, -5.1, 'z'], [-7.85, 0.5, -5.65, 'z']]) {
    add(at(rbox(0.56, 0.5, 1.0, hayM, 0.06), x, y + 0.25, z));
    for (const dz of [-0.25, 0.25]) add(at(box(0.58, 0.51, 0.03, COL.hayDark), x, y + 0.25, z + dz));
    void ax;
  }
  col(-7.85, -5.65, 0.3, 1.05, 0.5);
  col(-7.85, -5.65, 0.3, 0.5, 1.0);
  // Carrot crate, apple barrel and three feed buckets
  add(at(rbox(0.7, 0.42, 0.5, COL.woodLight, 0.03), -11.35, 0.21, -3.2));
  for (let i = 0; i < 7; i++) add(rot(at(cone(0.04, 0.22, '#ff8a2b', 8), -11.6 + (i % 4) * 0.16, 0.46, -3.3 + Math.floor(i / 4) * 0.2), 0.3, 0, (i - 3) * 0.12));
  for (let i = 0; i < 7; i++) add(at(cone(0.015, 0.1, COL.leaf, 4), -11.6 + (i % 4) * 0.16, 0.58, -3.36 + Math.floor(i / 4) * 0.2));
  col(-11.35, -3.2, 0.36, 0.26, 0.42);
  add(at(cyl(0.3, 0.27, 0.62, COL.woodDark, 14), -11.4, 0.31, -4.4));
  for (const y of [0.12, 0.5]) add(at(cyl(0.305, 0.305, 0.04, '#3b2b3f', 14), -11.4, y, -4.4));
  for (let i = 0; i < 9; i++) add(at(sph(0.07, i % 3 ? COL.rose : '#ffb36b', undefined, 8), -11.4 + Math.cos(i * 2.4) * 0.16 * (i % 3 ? 1 : 0.3), 0.64, -4.4 + Math.sin(i * 2.4) * 0.16));
  R.circle(-11.4, -4.4, 0.32, 0.64);
  R.state.buckets = [];
  [[COL.blue, -8.55, -3.05], [COL.pink, -8.05, -3.35], [COL.mint, -8.55, -3.6]].forEach(([c, x, z]) => {
    add(at(cyl(0.17, 0.14, 0.3, c, 14), x, 0.15, z));
    add(at(rot(tor(0.15, 0.008, '#3b2b3f', P, undefined, 12, 4), 0, 0, 0), x, 0.3, z));
    const oats = add(dyn(at(sph(0.15, '#e8cf8f', undefined, 10), x, 0.27, z)));
    oats.scale.set(1, 0.001, 1);
    R.state.buckets.push(oats);
    R.circle(x, z, 0.18, 0.3);
  });
  // Chalk tally on the side wall
  const tally = atlas.panel(1.1, 0.8, 330, 240, (c, w, h) => {
    c.fillStyle = '#7a5236';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#2f3b36';
    roundRect(c, 10, 10, w - 20, h - 20, 12);
    c.fill();
    text(c, 'Carrots this week', w / 2, 40, 30, '#fffbe6', 600);
    c.textAlign = 'left';
    c.font = `500 26px ${FONT}`;
    c.fillStyle = '#fffbe6';
    c.fillText('Biscuit  IIII IIII IIII', 26, 96);
    c.fillText('Rosie    IIII IIII', 26, 140);
    c.fillText('Clover   II  (asleep)', 26, 184);
  });
  add(rot(at(tally, L.X0 + 0.02, 1.55, -4.6), 0, P / 2, 0));
  // A mouse hole with a mouse who peeks out
  add(at(mesh(new THREE.CircleGeometry(0.11, 14, 0, P), mat('#2a1a14'), { cast: false }), -8.55, 0.0, ZB + 0.005));
  const mouse = new THREE.Group();
  mouse.add(at(sph(0.06, '#b9b2bd', undefined, 10), 0, 0.05, 0));
  for (const s of [1, -1]) {
    mouse.add(at(rot(k.cyl(0.03, 0.03, 0.01, '#f2b8c6', 10), P / 2, 0, 0), 0.04 * s, 0.11, -0.01));
    mouse.add(at(sph(0.009, '#2a1a14', undefined, 6), 0.022 * s, 0.07, 0.05));
  }
  mouse.add(at(sph(0.012, '#f28da0', undefined, 6), 0, 0.05, 0.065));
  mouse.position.set(-8.55, 0, ZB + 0.02);
  add(dyn(mouse));
  R.bake.push(mouse);
  R.upd((dt, t) => {
    const ph = (t * 0.25) % 1;
    mouse.position.z = ZB + 0.02 + Math.max(0, Math.sin(ph * P * 2)) * 0.09 - 0.05;
    mouse.visible = mouse.position.z > ZB + 0.0;
  });
  R.window(-10.2, 2.65);
  R.lantern(-11.4, 2.0, ZB);

  // ---------------------------------------------------------------- the three stalls
  const strawPuff = (x, z, s = 1) => add(at(sph(0.16 * s, COL.straw, undefined, 8), x, 0.02, z)).scale.set(1.6, 0.35, 1.2);
  const rodRow = (ax, az, bx, bz, y0, y1, step = 0.16) => {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / step));
    for (let i = 1; i < n; i++) {
      const x = ax + ((bx - ax) * i) / n;
      const z = az + ((bz - az) * i) / n;
      add(at(cyl(0.018, 0.018, y1 - y0, '#3b2b3f', 6), x, (y0 + y1) / 2, z));
    }
    const rail = add(at(box(Math.abs(bx - ax) + 0.08 || 0.1, 0.08, Math.abs(bz - az) + 0.08 || 0.1, COL.woodDark), (ax + bx) / 2, y1, (az + bz) / 2));
    return rail;
  };
  // Dividers between the stalls (and between Clover and the hall)
  for (const x of [-3.6, 0, 3.6]) {
    add(at(box(0.12, 1.3, ZS - ZB, COL.wood), x, 0.65, (ZB + ZS) / 2));
    add(at(box(0.16, 0.08, ZS - ZB, COL.woodDark), x, 1.32, (ZB + ZS) / 2));
    rodRow(x, ZB, x, ZS, 1.32, 2.05, 0.2);
    col(x, (ZB + ZS) / 2, 0.08, (ZS - ZB) / 2);
  }
  // Fronts, doors and plaques
  const doorM = COL.red;
  const doorLeaf = () => {
    const d = new THREE.Group();
    d.add(at(box(1.2, 1.2, 0.07, doorM), 0, 0.62, 0));
    for (const y of [0.07, 1.17]) d.add(at(box(1.2, 0.1, 0.09, COL.trim), 0, y, 0));
    for (const x of [-0.55, 0.55]) d.add(at(box(0.1, 1.2, 0.09, COL.trim), x, 0.62, 0));
    const diag = Math.hypot(1.1, 1.1);
    for (const s of [1, -1]) d.add(rot(at(box(0.08, diag, 0.085, COL.trim), 0, 0.62, 0), 0, 0, (s * P) / 4));
    return d;
  };
  R.state.stall = {};
  for (const s of L.STALLS) {
    const cx = (s.x0 + s.x1) / 2;
    const info = PONIES[s.id];
    for (const [a, b] of [[s.x0, cx - 0.62], [cx + 0.62, s.x1]]) {
      add(at(box(b - a, 1.2, 0.12, COL.wood), (a + b) / 2, 0.6, ZS));
      add(at(box(b - a, 0.08, 0.18, COL.woodDark), (a + b) / 2, 1.24, ZS));
      rodRow(a, ZS, b, ZS, 1.24, 2.05);
      col((a + b) / 2, ZS, (b - a) / 2, 0.08);
    }
    for (const x of [s.x0, s.x1]) add(at(box(0.18, 2.4, 0.18, COL.woodDark), x, 1.2, ZS));
    // Arch over the doorway with the name plaque
    add(at(box(1.36, 0.36, 0.1, COL.woodDark), cx, 2.25, ZS));
    const plaque = atlas.panel(1.24, 0.3, 420, 102, (c, w, h) => {
      c.fillStyle = COL.trim;
      roundRect(c, 4, 4, w - 8, h - 8, 26);
      c.fill();
      c.lineWidth = 6;
      c.strokeStyle = info.halter;
      c.stroke();
      text(c, info.name, w / 2, 38, 44, INK, 700, w - 40);
      text(c, info.sub, w / 2, 78, 26, info.halter === COL.pink ? COL.rose : info.halter === COL.blue ? COL.navy : '#2e9a7c', 600, w - 40);
    });
    add(at(plaque, cx, 2.25, ZS + 0.056));
    // Sliding door on its rail: Biscuit's and Clover's closed, Rosie's open (she is at the grooming corner)
    add(at(box(s.x1 - s.x0, 0.05, 0.05, '#3b2b3f'), cx, 1.32, ZS + 0.12));
    const leaf = add(doorLeaf());
    const openDoor = s.id === 'rosie';
    leaf.position.set(openDoor ? cx + 1.22 : cx, 0, ZS + 0.13);
    if (!openDoor) col(cx, ZS + 0.08, 0.62, 0.12);
    else col(cx + 1.22, ZS + 0.16, 0.62, 0.06);
    // Inside: a window, a hay net, a water bucket, a salt lick
    R.window(cx, 2.4, 0.8, 0.62);
    // Hay rack on the back wall
    const hx = s.x0 + 0.75;
    add(at(rbox(0.86, 0.36, 0.34, COL.hay, 0.1), hx, 1.36, ZB + 0.2));
    for (const [dx, dy] of [[-0.25, 0.2], [0.05, 0.24], [0.28, 0.18]]) add(at(sph(0.12, COL.straw, undefined, 8), hx + dx, 1.36 + dy, ZB + 0.22)).scale.set(1.4, 0.7, 1);
    add(at(box(0.92, 0.07, 0.38, COL.woodDark), hx, 1.15, ZB + 0.2));
    for (let i = 0; i < 6; i++) add(at(box(0.03, 0.42, 0.03, COL.woodDark), hx - 0.4 + i * 0.16, 1.38, ZB + 0.38));
    add(at(box(0.92, 0.05, 0.05, COL.woodDark), hx, 1.6, ZB + 0.38));
    add(at(cyl(0.2, 0.17, 0.34, COL.steel, 14), s.x1 - 0.45, 0.17, ZB + 0.45));
    add(at(cyl(0.18, 0.18, 0.01, COL.water, 14), s.x1 - 0.45, 0.3, ZB + 0.45));
    add(at(rbox(0.18, 0.14, 0.12, '#f7b6c2', 0.03), s.x1 - 0.1, 1.0, ZB + 1.6));
    add(at(box(0.04, 0.2, 0.14, COL.woodDark), s.x1 - 0.06, 0.9, ZB + 1.6));
    for (let i = 0; i < 4; i++) strawPuff(s.x0 + 0.5 + ((i * 1.3) % (s.x1 - s.x0 - 1)), -6.0 + ((i * 1.7) % 3), 0.8 + (i % 2) * 0.4);
    R.state.stall[s.id] = { cx, leaf };
    if (s.id === 'rosie') continue;
    const p = makeStablePony({ coat: info.coat, mane: info.mane, blaze: info.blaze, socks: info.socks, spots: info.spots, lashes: info.lashes });
    addHalter(p, info.halter);
    p.root.position.set(cx, 0, -3.35);
    add(dyn(p.root));
    skinify(p.root, { rough: 0.62 });
    ponyState(R, s.id, p, { nx: 0.18, ny: 0 });
  }
  // Rosie's stall, waiting to be mucked out: little piles, two flies, the pitchfork
  const RS = R.state.stall.rosie;
  R.state.piles = [];
  for (const [dx, dz] of [[-0.7, -4.9], [0.75, -5.7], [0.25, -3.6]]) {
    const pile = new THREE.Group();
    for (const [x, y, z, r] of [[0, 0.05, 0, 0.09], [0.07, 0.04, 0.05, 0.07], [-0.06, 0.04, 0.05, 0.065], [0.01, 0.12, 0.02, 0.06]]) pile.add(at(sph(r, '#8a5a3a', undefined, 8), x, y, z));
    pile.position.set(RS.cx + dx, 0, dz);
    add(dyn(pile));
    R.bake.push(pile);
    R.state.piles.push(pile);
  }
  const flies = [];
  for (let i = 0; i < 2; i++) {
    const f = new THREE.Group();
    f.add(sph(0.025, '#3b2b3f', undefined, 6));
    for (const s of [1, -1]) f.add(rot(at(sph(0.022, '#ffffff', undefined, 6), 0.025 * s, 0.02, 0), 0, 0, 0.5 * s)).scale.set(1, 0.3, 0.6);
    add(dyn(f));
    flies.push(f);
  }
  R.state.flies = flies;
  R.state.flyHome = new THREE.Vector3(RS.cx, 0.5, -4.8);
  R.upd((dt, t) => {
    flies.forEach((f, i) => {
      const h = R.state.flyTarget || R.state.flyHome;
      const a = t * (3.1 + i) + i * 2;
      f.position.set(h.x + Math.cos(a) * 0.35, h.y + Math.sin(t * 5 + i) * 0.1, h.z + Math.sin(a * 1.3) * 0.3);
      f.children[1].rotation.z = Math.sin(t * 60) * 0.6;
      f.visible = R.state.piles.some((p) => p.visible);
    });
  });
  const fork = add(makeFork());
  fork.position.set(RS.cx - 1.55, 0.22, ZB + 0.25);
  fork.rotation.z = 0.12;
  R.state.fork = fork;
  // R + H carved in a heart on Rosie's door, and a horseshoe heart over her stall
  const carve = atlas.panel(0.42, 0.38, 168, 152, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,240,225,0.92)';
    heartPath(c, w / 2, h / 2 + 4, 132);
    c.fill();
    c.strokeStyle = '#9c5a3c';
    c.lineWidth = 5;
    heartPath(c, w / 2, h / 2 + 4, 120);
    c.stroke();
    text(c, 'R + H', w / 2, h / 2, 40, '#9c5a3c', 700);
  });
  carve.material = carve.material.clone();
  carve.material.transparent = true;
  carve.material.alphaTest = 0.4;
  add(at(carve, RS.cx + 1.22, 0.64, ZS + 0.19));
  const shoeM = mat(COL.gold, { rough: 0.3, metal: 0.6 });
  for (const s of [1, -1]) add(rot(at(tor(0.11, 0.025, shoeM, P * 1.3, undefined, 16, 6), RS.cx + s * 0.08, 2.62, ZS + 0.07), 0, 0, P * 1.35 - s * 0.9 + (s < 0 ? P * 0.3 : 0)));
  add(at(k.heart(0.1, 0.02, COL.rose), RS.cx, 2.6, ZS + 0.09));
  // The wheelbarrow waits by Rosie's door
  const barrow = new THREE.Group();
  barrow.add(at(rbox(0.5, 0.26, 0.72, COL.mint, 0.05), 0, 0.42, 0));
  barrow.add(at(rot(cyl(0.16, 0.16, 0.06, '#3b2b3f', 14), 0, 0, P / 2), 0, 0.16, 0.44));
  for (const s of [1, -1]) {
    barrow.add(at(box(0.04, 0.04, 0.6, COL.woodDark), 0.22 * s, 0.36, -0.42));
    barrow.add(at(box(0.04, 0.3, 0.04, COL.woodDark), 0.2 * s, 0.15, -0.2));
  }
  const load = at(sph(0.2, '#8a5a3a', undefined, 10), 0, 0.5, 0);
  load.scale.set(1.0, 0.001, 1.4);
  barrow.add(load);
  barrow.position.set(RS.cx + 1.6, 0, ZS + 0.85);
  barrow.rotation.y = 0.5;
  add(dyn(barrow));
  R.bake.push([barrow, [load]]);
  R.state.barrow = barrow;
  R.state.barrowLoad = load;
  R.circle(RS.cx + 1.6, ZS + 0.85, 0.42, 0.55);

  // Lanterns on the stall posts
  for (const x of [-7.2, -3.6, 0, 3.6]) R.lantern(x, 2.08, ZS + 0.1);

  // ---------------------------------------------------------------- the hall to the riding ring
  const [h0, h1] = L.HALL;
  const DX = 8.4;
  const DW = 2.6;
  const DH = 3.0;
  const meadow = canvasTexture(512, 600, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h * 0.55);
    gr.addColorStop(0, '#8fd3ff');
    gr.addColorStop(1, '#e6f7ff');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff';
    for (const [x, y, r] of [[90, 90, 30], [128, 80, 36], [164, 94, 26], [380, 140, 24], [410, 130, 30]]) {
      c.beginPath();
      c.arc(x, y, r, 0, P * 2);
      c.fill();
    }
    c.fillStyle = '#9edb73';
    c.fillRect(0, h * 0.5, w, h * 0.5);
    c.fillStyle = '#86cc5e';
    c.beginPath();
    c.ellipse(w / 2, h * 0.78, w * 0.46, h * 0.18, 0, 0, P * 2);
    c.fill();
    c.fillStyle = '#ecd3a2';
    c.beginPath();
    c.ellipse(w / 2, h * 0.78, w * 0.38, h * 0.13, 0, 0, P * 2);
    c.fill();
    // White ring fence
    c.strokeStyle = '#ffffff';
    c.lineWidth = 6;
    for (const dy of [0, 16]) {
      c.beginPath();
      c.ellipse(w / 2, h * 0.78 - dy, w * 0.42, h * 0.15, 0, P, P * 2);
      c.stroke();
    }
    // A little jump with red and white poles
    for (let i = 0; i < 6; i++) {
      c.fillStyle = i % 2 ? '#ffffff' : '#e5484d';
      c.fillRect(200 + i * 18, h * 0.74, 18, 10);
    }
    c.fillStyle = '#ffffff';
    c.fillRect(194, h * 0.7, 8, 40);
    c.fillRect(306, h * 0.7, 8, 40);
    // Bunting and a banner
    const cols = ['#ef5b6f', '#ffd166', '#6fb8ff', '#7fd8bf', '#c7a6ff'];
    for (let i = 0; i < 12; i++) {
      c.fillStyle = cols[i % 5];
      const x = 30 + i * 40;
      const y = 250 + Math.sin(i * 0.5) * 6;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 30, y);
      c.lineTo(x + 15, y + 26);
      c.fill();
    }
    c.fillStyle = '#ffffff';
    roundRect(c, 120, 180, 272, 56, 20);
    c.fill();
    text(c, 'Meadow Cup', w / 2, 210, 38, COL.rose, 700);
  });
  const view = add(at(mesh(new THREE.PlaneGeometry(DW, DH), new THREE.MeshStandardMaterial({ map: meadow, roughness: 0.7, emissive: '#ffffff', emissiveMap: meadow, emissiveIntensity: 0.45 }), { cast: false }), DX, DH / 2, ZB + 0.01));
  R.state.meadow = view;
  for (const [x, y, w, h] of [[DX - DW / 2 - 0.08, DH / 2, 0.16, DH + 0.1], [DX + DW / 2 + 0.08, DH / 2, 0.16, DH + 0.1], [DX, DH + 0.08, DW + 0.32, 0.16]]) add(at(box(w, h, 0.14, COL.trim), x, y, ZB + 0.06));
  const bigLeaf = (dir) => {
    const lg = new THREE.Group();
    const w = DW / 2;
    lg.add(at(box(w, DH, 0.08, COL.red), (dir * w) / 2, DH / 2, 0));
    for (const y of [0.08, DH - 0.08, DH / 2]) lg.add(at(box(w, 0.12, 0.1, COL.trim), (dir * w) / 2, y, 0));
    for (const x of [0.06, w - 0.06]) lg.add(at(box(0.12, DH, 0.1, COL.trim), dir * x, DH / 2, 0));
    const diag = Math.hypot(w - 0.12, DH / 2 - 0.12);
    for (const yy of [DH / 4, (DH * 3) / 4]) for (const s of [1, -1]) lg.add(rot(at(box(0.09, diag, 0.095, COL.trim), (dir * w) / 2, yy, 0), 0, 0, s * Math.atan2(w - 0.12, DH / 2 - 0.12)));
    return lg;
  };
  const lD = add(bigLeaf(1));
  lD.position.set(DX - DW / 2, 0, ZB + 0.1);
  lD.rotation.y = -1.0;
  const rD = add(bigLeaf(-1));
  rD.position.set(DX + DW / 2, 0, ZB + 0.1);
  rD.rotation.y = 1.0;
  for (const s of [-1, 1]) {
    const a = 1.0;
    const ex = DX + s * (DW / 2 - (Math.cos(a) * DW) / 4);
    const ez = ZB + 0.1 + (Math.sin(a) * DW) / 4;
    R.circle(ex, ez, 0.36);
    R.circle(DX + s * (DW / 2 - (Math.cos(a) * DW) / 2) + s * 0.05, ZB + 0.1 + (Math.sin(a) * DW) / 2, 0.12);
  }
  const ringSign = atlas.panel(1.9, 0.42, 540, 120, boardDraw(['To the riding ring'], { edge: COL.leaf, fill: COL.trim, ink: INK }));
  add(at(ringSign, DX, DH + 0.42, ZB + 0.04));
  // Sunshine falling in through the doors, with dust motes
  const beamTex = canvasTexture(64, 128, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(255,236,170,0.65)');
    gr.addColorStop(1, 'rgba(255,236,170,0)');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
  });
  const beam = add(dyn(at(mesh(new THREE.PlaneGeometry(DW * 0.95, 2.6), new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), { cast: false, receive: false }), DX, 0.012, ZB + 1.35)));
  beam.rotation.x = -P / 2;
  R.state.beam = beam;
  const motes = [];
  for (let i = 0; i < 8; i++) {
    const s = glowSprite('#fff2c0', 0.06);
    s.material.opacity = 0.8;
    add(dyn(s));
    motes.push(s);
  }
  R.upd((dt, t) => {
    motes.forEach((m, i) => {
      const q = (t * 0.06 + i / 8) % 1;
      m.position.set(DX - 1 + ((i * 0.37) % 1) * 2 + Math.sin(t * 0.5 + i) * 0.1, 0.4 + q * 2.2, ZB + 0.5 + ((i * 0.61) % 1) * 1.6);
      m.material.opacity = R.night ? 0 : 0.7 * Math.sin(q * P);
    });
  });
  // The Meadow Cup board: rosettes for every win, and the best time
  const MB = { x: 5.35, y: 1.75, z: ZB + 0.06 };
  add(at(rbox(2.2, 1.5, 0.08, COL.woodDark, 0.04), MB.x, MB.y, MB.z));
  add(at(box(2.04, 1.34, 0.04, '#d9b07a'), MB.x, MB.y, MB.z + 0.04));
  const cupTitle = atlas.panel(1.7, 0.28, 520, 86, boardDraw(['Our Meadow Cup rosettes'], { edge: COL.gold, fill: COL.trim, ink: INK, radius: 0.4 }));
  add(at(cupTitle, MB.x, MB.y + 0.5, MB.z + 0.07));
  R.state.cupText = livePanel(1.0, 0.26, 360, 92, (c, w, h) => {
    c.fillStyle = COL.trim;
    roundRect(c, 3, 3, w - 6, h - 6, 20);
    c.fill();
    const best = R.bestTime?.();
    text(c, best ? `Best time ${best.toFixed(1)} s` : 'No race yet', w / 2, h / 2 + 2, 34, INK, 600, w - 24);
  });
  add(at(R.state.cupText, MB.x + 0.45, MB.y - 0.55, MB.z + 0.07));
  const slots = atlas.panel(1.4, 0.7, 420, 210, (c, w, h) => {
    c.fillStyle = '#d9b07a';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(122,82,54,0.55)';
    c.lineWidth = 4;
    c.setLineDash([8, 8]);
    for (let i = 0; i < 8; i++) {
      const x = ((-0.75 + (i % 4) * 0.38 + 0.18) / 1.4 + 0.5) * w;
      const y = (0.5 - (0.12 - Math.floor(i / 4) * 0.4 + 0.06) / 0.7) * h;
      c.beginPath();
      c.arc(x, y, 30, 0, P * 2);
      c.stroke();
    }
  });
  add(at(slots, MB.x - 0.18, MB.y - 0.06, MB.z + 0.065));
  add(R.dyn(R.state.cupText));
  const rosCols = [COL.blue, COL.rose, COL.gold, COL.mint, COL.lilac, '#ff9a4a', COL.pink, COL.navy];
  R.state.rosettes = rosCols.map((c, i) => {
    const r = makeRosette(k, c, i % 2 ? COL.gold : '#ffffff');
    r.position.set(MB.x - 0.75 + (i % 4) * 0.38, MB.y + 0.12 - Math.floor(i / 4) * 0.4, MB.z + 0.09);
    r.rotation.z = ((i % 3) - 1) * 0.12;
    r.visible = false;
    add(dyn(r));
    R.bake.push(r);
    return r;
  });
  R.state.cupBoard = MB;
  // Hay bales by the board and a rocking horse in the corner (for little visitors)
  for (const [x, y, z] of [[4.25, 0, -6.15], [4.25, 0, -5.05], [4.25, 0.5, -5.6]]) {
    add(at(rbox(0.56, 0.5, 1.0, hayM, 0.06), x, y + 0.25, z));
    for (const dz of [-0.25, 0.25]) add(at(box(0.58, 0.51, 0.03, COL.hayDark), x, y + 0.25, z + dz));
  }
  col(4.25, -5.6, 0.3, 1.05, 0.5);
  col(4.25, -5.6, 0.3, 0.5, 1.0);
  const rk = new THREE.Group();
  for (const s2 of [1, -1]) rk.add(at(rot(tor(0.6, 0.035, COL.rose, P * 0.42, undefined, 14, 6), 0, P / 2, -P * 0.71), 0.2 * s2, 0.62, 0));
  rk.add(at(box(0.44, 0.05, 0.12, COL.rose), 0, 0.06, 0.38));
  rk.add(at(box(0.44, 0.05, 0.12, COL.rose), 0, 0.06, -0.38));
  const bodyR = rk.add(at(k.caps(0.16, 0.42, '#ffffff'), 0, 0.55, 0));
  bodyR.rotation.x = P / 2;
  rk.add(rot(at(k.caps(0.09, 0.2, '#ffffff'), 0, 0.78, 0.3), 0.5, 0, 0));
  rk.add(at(sph(0.13, '#ffffff'), 0, 0.95, 0.42)).scale.set(0.85, 0.9, 1.3);
  for (let i = 0; i < 4; i++) rk.add(at(sph(0.05, COL.pink), 0, 0.82 + i * 0.05, 0.25 + i * 0.05));
  rk.add(at(sph(0.025, '#3b2b3f'), 0.09, 0.98, 0.5));
  rk.add(at(sph(0.025, '#3b2b3f'), -0.09, 0.98, 0.5));
  rk.add(at(rbox(0.3, 0.06, 0.3, COL.rose, 0.02), 0, 0.72, -0.02));
  for (const [x, z] of [[0.1, 0.2], [-0.1, 0.2], [0.1, -0.2], [-0.1, -0.2]]) rk.add(rot(at(cyl(0.03, 0.03, 0.42, '#ffffff', 6), x, 0.3, z), 0, 0, x > 0 ? 0.25 : -0.25));
  rk.add(rot(at(k.caps(0.04, 0.2, COL.pink), 0, 0.6, -0.42), -0.7, 0, 0));
  rk.scale.setScalar(1.2);
  rk.position.set(11.2, 0, -3.25);
  rk.rotation.y = -0.6;
  add(dyn(rk));
  R.bake.push(rk);
  R.circle(11.2, -3.25, 0.5, 0.7);
  R.upd((dt, t) => (rk.rotation.x = Math.sin(t * 1.6) * 0.05));
  // Lesson board on an easel
  const EZ = { x: 5.2, z: -3.35 };
  const lesson = atlas.panel(1.3, 0.95, 390, 285, (c, w, h) => {
    c.fillStyle = '#2f3b36';
    roundRect(c, 0, 0, w, h, 14);
    c.fill();
    c.strokeStyle = '#b8864f';
    c.lineWidth = 12;
    c.stroke();
    text(c, 'Riding lessons', w / 2, 40, 36, '#fffbe6', 700);
    c.textAlign = 'left';
    c.font = `500 24px ${FONT}`;
    c.fillStyle = '#fffbe6';
    c.fillText('Mon  Roji trots on Rosie', 24, 96);
    c.fillText('Wed  Homama learns to steer', 24, 136);
    c.fillText('Fri   Picnic ride for two', 24, 176);
    c.fillStyle = '#ffd1dc';
    c.fillText('Sun  Ponies get a day off', 24, 216);
    c.fillStyle = '#ff9eb5';
    heartPath(c, w - 46, h - 40, 34);
    c.fill();
  });
  const easel = new THREE.Group();
  easel.add(at(lesson, 0, 1.25, 0.05));
  easel.add(at(box(1.4, 1.05, 0.05, COL.woodDark), 0, 1.25, 0.01));
  for (const s of [1, -1]) easel.add(rot(at(box(0.06, 1.9, 0.06, COL.wood), s * 0.55, 0.92, -0.05), 0.12, 0, -s * 0.06));
  easel.add(rot(at(box(0.06, 1.7, 0.06, COL.wood), 0, 0.85, -0.38), -0.3, 0, 0));
  easel.add(at(box(1.3, 0.05, 0.12, COL.wood), 0, 0.7, 0.05));
  easel.position.set(EZ.x, 0, EZ.z);
  easel.rotation.y = 0.25;
  add(easel);
  R.col(EZ.x, EZ.z - 0.1, 0.65, 0.25);
  R.state.easel = EZ;
  R.lantern(h1 - 0.5, 2.3, ZB);
  R.lantern(DX - DW / 2 - 0.45, 2.3, ZB);
  // The stable girl polishing a saddle on its stand
  const stand = new THREE.Group();
  stand.add(at(box(0.16, 0.12, 0.9, COL.wood), 0, 0.85, 0));
  for (const s of [1, -1]) for (const e of [-0.35, 0.35]) stand.add(rot(at(box(0.06, 0.9, 0.06, COL.woodDark), s * 0.15, 0.42, e), 0, 0, s * 0.3));
  const ss = makeSaddle(k, '#7a3f25', COL.lilac);
  ss.position.y = 0.95;
  stand.add(ss);
  stand.position.set(10.3, 0, -5.4);
  add(stand);
  R.col(10.3, -5.4, 0.35, 0.5, 0.95);
  const girl = R.ctx.makeKid({ id: 'stablegirl', name: 'Stable girl', gender: 'girl', skin: '#e3b08e', hair: '#3a2316', hairstyle: 'ponytail', outfit: 'overalls', top: '#ffffff', bottom: '#3fbf7f', shoes: '#7a4a26', accent: '#ffd166' });
  girl.root.scale.setScalar(1.12);
  const cap = new THREE.Group();
  cap.add(at(cyl(0.29, 0.31, 0.12, COL.rose, 18), 0, 0.0, 0));
  cap.add(at(sph(0.29, COL.rose, undefined, 16), 0, 0.04, 0)).scale.set(1, 0.55, 1);
  cap.add(rot(at(cyl(0.22, 0.22, 0.03, COL.rose, 16, undefined), 0, -0.04, 0.24), 0.15, 0, 0)).scale.set(1, 1, 0.75);
  cap.position.set(0, 0.5, -0.01);
  girl.bow?.removeFromParent();
  girl.head.add(cap);
  girl.root.position.set(11.05, 0, -5.0);
  girl.root.rotation.y = -2.2;
  girl.pose = 'stand';
  girl.hands = 'stir';
  add(dyn(girl.root));
  for (const m of skinify(girl.root, { rough: 0.6 })) m.castShadow = true;
  R.circle(11.05, -5.0, 0.3);
  R.state.girl = girl;
  R.upd((dt, t) => girl.update(dt, t, 0, 0, 0));
}

export function buildAisle(R) {
  const { k, L, add } = R;
  const { box, rbox, sph, at } = k;
  // Straw blown into the aisle, a bench along the office wall, buckets by the hall
  for (let i = 0; i < 10; i++) add(at(sph(0.12, COL.straw, undefined, 8), -11 + i * 2.3 + (i % 3) * 0.4, 0.01, L.ZS + 0.5 + ((i * 1.3) % 3))).scale.set(1.8, 0.25, 1.1);
  add(at(rbox(1.8, 0.1, 0.5, COL.wood, 0.03), -10.6, 0.44, L.ZW - 0.42));
  for (const dx of [-0.75, 0.75]) add(at(box(0.1, 0.4, 0.42, COL.woodDark), -10.6 + dx, 0.2, L.ZW - 0.42));
  R.col(-10.6, L.ZW - 0.42, 0.9, 0.26, 0.47);
  // A heart-shaped pink brick hidden in the aisle floor, by Rosie's stall
  const ht = add(at(k.heart(0.26, 0.006, '#ff9eb5'), -0.9, 0.004, L.ZS + 1.35));
  ht.rotation.x = -P / 2;
  ht.receiveShadow = true;
  // A swallow nest on the beam over Clover's stall, with a little head peeking out
  add(at(sph(0.16, '#a87a52', undefined, 10), 1.8, 3.72, L.ZB + 0.14)).scale.set(1.2, 0.7, 0.9);
  const bird = R.dyn(new THREE.Group());
  bird.add(at(sph(0.06, '#2c3e66', undefined, 8), 0, 0, 0));
  bird.add(at(sph(0.035, '#ffffff', undefined, 6), 0, -0.02, 0.04));
  bird.add(at(k.cone(0.015, 0.04, '#ffb627', 4), 0, 0, 0.07)).rotation.x = P / 2;
  bird.position.set(1.8, 3.82, L.ZB + 0.2);
  add(bird);
  R.upd((dt, t) => {
    bird.position.y = 3.8 + Math.max(0, Math.sin(t * 0.8)) * 0.06;
    bird.rotation.y = Math.sin(t * 1.7) * 0.6;
  });
}

export function buildFrontRow(R) {
  const { k, L, add, dyn, col, atlas } = R;
  const { box, rbox, cyl, sph, tor, cone, at, rot } = k;
  const { ZW, ZF } = L;

  // ---------------------------------------------------------------- office
  const [o0, o1] = L.OFFICE;
  const ow = R.wall(o0, o1, L.HW, R.paper, [L.OFFICE_DOOR]);
  const ocx = (o0 + o1) / 2;
  const onW = (o, x, y) => (o.position.set(x - ocx + o.position.x, y + o.position.y, 0.1 + o.position.z), ow.add(o), o);
  const cert = atlas.panel(0.9, 0.66, 450, 330, (c, w, h) => {
    c.fillStyle = '#fffaf0';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = COL.gold;
    c.lineWidth = 10;
    c.strokeRect(12, 12, w - 24, h - 24);
    c.lineWidth = 3;
    c.strokeRect(24, 24, w - 48, h - 48);
    text(c, 'Certificate of Riding', w / 2, 62, 36, '#8a5a24', 700);
    text(c, 'awarded to', w / 2, 102, 20, '#8a6a4a', 500);
    text(c, 'Roji', w / 2, 140, 48, COL.rose, 700);
    text(c, 'for gentle hands, brave trotting', w / 2, 186, 20, INK, 500);
    text(c, 'and the kindest heart in the stable', w / 2, 212, 20, INK, 500);
    c.fillStyle = '#8a5a3a';
    for (let i = 0; i < 3; i++) {
      const x = 110 + i * 80;
      c.beginPath();
      c.arc(x, 268, 11, P * 1.1, P * 1.9 + P);
      c.lineWidth = 6;
      c.strokeStyle = '#8a5a3a';
      c.stroke();
    }
    text(c, 'Biscuit, Rosie, Clover', 190, 296, 14, '#8a6a4a', 500);
    c.fillStyle = COL.rose;
    c.beginPath();
    c.arc(w - 74, h - 74, 30, 0, P * 2);
    c.fill();
    c.fillStyle = COL.gold;
    c.beginPath();
    c.arc(w - 74, h - 74, 18, 0, P * 2);
    c.fill();
  });
  onW(at(box(1.0, 0.76, 0.04, COL.gold), 0, 0, 0), -11.0, 1.62);
  onW(at(cert, 0, 0, 0.03), -11.0, 1.62);
  const photo = atlas.panel(0.66, 0.5, 330, 250, drawPhoto);
  onW(at(box(0.76, 0.6, 0.04, COL.pink), 0, 0, 0), -9.55, 1.62);
  onW(at(photo, 0, 0, 0.03), -9.55, 1.62);
  onW(at(k.heart(0.12, 0.02, COL.rose), 0, 0, 0.03), -9.2, 1.98);
  // A clock over the doorway and two rosettes by the photo
  onW(at(rot(cyl(0.17, 0.17, 0.04, COL.trim, 18), P / 2, 0, 0), 0, 0, 0.0), -7.6, 2.38);
  onW(at(rot(tor(0.17, 0.02, COL.woodDark, P * 2, undefined, 18, 4), 0, 0, 0), 0, 0, 0.02), -7.6, 2.38);
  onW(rot(at(box(0.02, 0.12, 0.01, '#3b2b3f'), 0, 0.04, 0.04), 0, 0, 0.6), -7.6, 2.38);
  onW(rot(at(box(0.02, 0.09, 0.01, '#3b2b3f'), 0, 0.03, 0.045), 0, 0, -1.4), -7.6, 2.38);
  onW(makeRosette(k, COL.blue, COL.gold), -8.95, 1.35);
  onW(makeRosette(k, COL.rose, '#ffffff'), -8.95, 1.85);
  // Desk with a lamp, the ledger, two mugs and a little framed photo
  const DK = { x: -10.3, z: ZW + 0.5 };
  add(at(rbox(1.6, 0.07, 0.7, COL.woodLight, 0.02), DK.x, 0.76, DK.z));
  for (const [dx, dz] of [[-0.72, -0.28], [0.72, -0.28], [-0.72, 0.28], [0.72, 0.28]]) add(at(box(0.07, 0.74, 0.07, COL.woodDark), DK.x + dx, 0.37, DK.z + dz));
  add(at(rbox(0.5, 0.36, 0.6, COL.wood, 0.03), DK.x + 0.5, 0.55, DK.z));
  col(DK.x, DK.z, 0.82, 0.38, 0.8);
  add(at(rbox(0.36, 0.04, 0.26, COL.navy, 0.01), DK.x - 0.2, 0.82, DK.z + 0.05));
  add(at(box(0.32, 0.02, 0.22, '#fffaf0'), DK.x - 0.2, 0.845, DK.z + 0.05));
  add(rot(at(cyl(0.006, 0.006, 0.18, COL.rose, 5), DK.x - 0.05, 0.86, DK.z + 0.1), 0, 0, P / 2 - 0.3));
  for (const [dx, c] of [[0.25, COL.pink], [0.4, COL.blue]]) {
    add(at(cyl(0.045, 0.04, 0.1, c, 12), DK.x + dx, 0.84, DK.z + 0.15));
    add(at(rot(tor(0.03, 0.01, c, P * 2, undefined, 10, 4), 0, 0, 0), DK.x + dx + 0.055, 0.84, DK.z + 0.15));
  }
  const lampG = new THREE.Group();
  lampG.add(at(cyl(0.08, 0.1, 0.03, COL.woodDark, 12), 0, 0, 0));
  lampG.add(at(cyl(0.012, 0.012, 0.32, COL.woodDark, 6), 0, 0.17, 0));
  lampG.add(at(mesh(k.geo('lampshade', () => new THREE.CylinderGeometry(0.09, 0.15, 0.16, 14, 1, true)), umat('#ffe2b8', { emissive: '#ffb347', ei: 0.5, side: THREE.DoubleSide })), 0, 0.36, 0));
  lampG.position.set(DK.x - 0.62, 0.8, DK.z - 0.12);
  add(lampG);
  const lampHalo = glowSprite('#ffc46b', 0.9);
  lampHalo.position.set(DK.x - 0.62, 1.15, DK.z - 0.05);
  R.halos.push(add(dyn(lampHalo)));
  add(at(box(0.2, 0.16, 0.03, COL.pink), DK.x + 0.62, 0.88, DK.z - 0.1)).rotation.x = -0.2;
  const mini = atlas.panel(0.16, 0.12, 120, 90, drawPhoto);
  add(rot(at(mini, DK.x + 0.62, 0.885, DK.z - 0.08), -0.2, 0, 0));
  // Chair at the desk, a bookshelf, a round rug, the armchair with the barn cat asleep in it
  add(at(rbox(0.5, 0.08, 0.5, COL.wood, 0.03), DK.x - 0.15, 0.45, DK.z + 0.75));
  add(at(rbox(0.5, 0.5, 0.07, COL.wood, 0.03), DK.x - 0.15, 0.72, DK.z + 1.0));
  for (const [dx, dz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) add(at(box(0.05, 0.45, 0.05, COL.woodDark), DK.x - 0.15 + dx, 0.22, DK.z + 0.75 + dz));
  col(DK.x - 0.15, DK.z + 0.8, 0.27, 0.3, 0.5);
  const BS = { x: o0 + 0.3, z: 4.3 };
  add(at(box(0.5, 0.95, 1.5, COL.woodDark), BS.x, 0.475, BS.z));
  for (const y of [0.08, 0.5]) {
    add(at(box(0.46, 0.04, 1.42, COL.wood), BS.x + 0.03, y, BS.z));
    let z = BS.z - 0.66;
    let i = 0;
    while (z < BS.z + 0.6) {
      const w = 0.07 + ((i * 7) % 4) * 0.012;
      const hh = 0.28 + ((i * 5) % 3) * 0.04;
      add(at(box(0.3, hh, w, [COL.rose, COL.blue, COL.sun, COL.mint, COL.lilac, '#ff9a4a'][i % 6]), BS.x + 0.08, y + 0.02 + hh / 2, z + w / 2));
      z += w + 0.012;
      i++;
    }
  }
  add(at(box(0.52, 0.05, 1.52, COL.wood), BS.x, 0.975, BS.z));
  add(at(cyl(0.07, 0.09, 0.04, COL.gold, 10), BS.x, 1.02, BS.z + 0.4));
  add(at(k.lathe([[0, 0], [0.04, 0], [0.04, 0.03], [0.015, 0.06], [0.015, 0.1], [0.07, 0.14], [0.08, 0.22], [0, 0.2]], COL.gold, 14), BS.x, 1.04, BS.z + 0.4));
  add(at(cyl(0.1, 0.08, 0.16, COL.pink, 12), BS.x, 1.08, BS.z - 0.35));
  add(at(sph(0.14, COL.leaf, undefined, 10), BS.x, 1.24, BS.z - 0.35));
  col(BS.x, BS.z, 0.26, 0.76, 1.0);
  const rug = add(at(cyl(1.1, 1.1, 0.012, '#ffd1dc', 32), -9.2, 0.006, 4.6));
  rug.receiveShadow = true;
  add(at(cyl(0.8, 0.8, 0.014, '#ffb3c6', 32), -9.2, 0.007, 4.6));
  const AC = { x: -7.6, z: 5.4 };
  add(at(rbox(0.9, 0.42, 0.8, COL.mint, 0.1), AC.x, 0.21, AC.z));
  add(at(rbox(0.9, 0.7, 0.18, COL.mint, 0.08), AC.x, 0.6, AC.z - 0.36));
  for (const s of [1, -1]) add(at(rbox(0.16, 0.56, 0.8, COL.mint, 0.07), AC.x + s * 0.4, 0.4, AC.z));
  add(at(rbox(0.6, 0.1, 0.56, '#bdebdc', 0.05), AC.x, 0.46, AC.z + 0.05));
  col(AC.x, AC.z, 0.47, 0.42, 0.5);
  const cat = makeCat();
  cat.root.position.set(AC.x, 0.5, AC.z + 0.02);
  cat.root.rotation.y = 0.5;
  add(dyn(cat.root));
  skinify(cat.root, { rough: 0.7 });
  R.state.cat = cat;
  R.upd((dt, t) => {
    cat.tail.rotation.y = Math.sin(t * 1.1) * 0.3;
    cat.root.scale.y = 1 + Math.sin(t * 2.2) * 0.025;
  });
  add(at(cyl(0.2, 0.16, 0.34, COL.terra ?? '#d9734e', 12), o0 + 0.4, 0.17, 6.35));
  add(at(sph(0.3, COL.leaf, undefined, 10), o0 + 0.4, 0.55, 6.35)).scale.set(1, 1.2, 1);
  R.circle(o0 + 0.4, 6.35, 0.24);
  R.lowWall(o1, ZW, ZF, L.GAP);

  // ---------------------------------------------------------------- entrance
  const [e0, e1] = L.ENTRY;
  const mat1 = atlas.panel(1.5, 0.8, 450, 240, (c, w, h) => {
    c.fillStyle = '#c0532f';
    roundRect(c, 0, 0, w, h, 30);
    c.fill();
    c.strokeStyle = '#f2b38a';
    c.lineWidth = 10;
    roundRect(c, 14, 14, w - 28, h - 28, 22);
    c.stroke();
    text(c, 'Welcome', w / 2, h / 2 - 16, 64, '#fff1e0', 700);
    c.fillStyle = '#ffd1dc';
    heartPath(c, w / 2, h / 2 + 52, 34);
    c.fill();
  });
  mat1.rotation.x = -P / 2;
  add(at(mat1, (e0 + e1) / 2, 0.008, 5.75));
  // Coat stand with Roji's pink jacket and Homama's blue one
  const CS = { x: e0 + 0.45, z: ZW + 0.55 };
  add(at(cyl(0.22, 0.25, 0.05, COL.woodDark, 14), CS.x, 0.025, CS.z));
  add(at(cyl(0.035, 0.035, 1.7, COL.woodDark, 8), CS.x, 0.85, CS.z));
  add(at(sph(0.05, COL.gold, undefined, 8), CS.x, 1.72, CS.z));
  for (const [a, c] of [[0.6, COL.pink], [2.6, COL.blue]]) {
    const jx = CS.x + Math.cos(a) * 0.14;
    const jz = CS.z + Math.sin(a) * 0.14;
    add(at(rbox(0.32, 0.5, 0.14, c, 0.06), jx, 1.3, jz)).rotation.y = -a;
  }
  R.circle(CS.x, CS.z, 0.24);
  // A bench for pulling boots on, with two pairs of boots under it
  add(at(rbox(0.5, 0.1, 1.3, COL.wood, 0.03), e0 + 0.4, 0.44, 6.0));
  for (const dz of [-0.55, 0.55]) add(at(box(0.42, 0.4, 0.1, COL.woodDark), e0 + 0.4, 0.2, 6.0 + dz));
  for (const [dz, c] of [[-0.25, COL.pink], [0.22, COL.navy]]) for (const d of [-0.06, 0.06]) add(at(rbox(0.09, 0.26, 0.11, c, 0.03), e0 + 0.45, 0.13, 6.0 + dz + d));
  col(e0 + 0.4, 6.0, 0.27, 0.66, 0.47);
  // A welcome board with today's news
  const wb = atlas.panel(0.9, 1.1, 300, 366, (c, w, h) => {
    c.fillStyle = '#2f3b36';
    roundRect(c, 0, 0, w, h, 18);
    c.fill();
    c.strokeStyle = '#b8864f';
    c.lineWidth = 12;
    c.stroke();
    text(c, 'Today', w / 2, 46, 40, '#ffd166', 700);
    c.textAlign = 'left';
    c.fillStyle = '#fffbe6';
    c.font = `500 24px ${FONT}`;
    ['Rosie: a bath', 'and new ribbons', '', 'Biscuit: ate', 'everything', '', 'Clover: nap'].forEach((s, i) => c.fillText(s, 26, 104 + i * 34));
  });
  const aBoard = new THREE.Group();
  aBoard.add(at(wb, 0, 0.72, 0.13));
  aBoard.add(rot(at(box(0.98, 1.2, 0.05, COL.wood), 0, 0.72, 0.08), -0.15, 0, 0));
  aBoard.add(rot(at(box(0.98, 1.2, 0.05, COL.wood), 0, 0.72, -0.12), 0.15, 0, 0));
  aBoard.children[0].rotation.x = -0.15;
  aBoard.position.set(e1 - 0.7, 0, 6.1);
  aBoard.rotation.y = -0.35;
  add(aBoard);
  R.circle(e1 - 0.7, 6.1, 0.42);
  // Lantern posts at the front corners of the entrance
  for (const x of [e0 + 0.1, e1 - 0.1]) {
    add(at(box(0.16, 1.4, 0.16, COL.woodDark), x, 0.7, ZF - 0.25));
    R.lantern(x, 1.42, ZF - 0.25, 'top');
    R.circle(x, ZF - 0.25, 0.12);
  }
  R.lowWall(e1, ZW, ZF, L.GAP);

  // ---------------------------------------------------------------- tack room
  const [t0, t1] = L.TACK;
  const tw = R.wall(t0, t1, L.HW, R.woodWall, []);
  const tcx = (t0 + t1) / 2;
  const onT = (o, x, y, z = 0.1) => (o.position.set(x - tcx + o.position.x, y + o.position.y, z + o.position.z), tw.add(o), o);
  onT(atlas.panel(1.5, 0.38, 460, 116, boardDraw(['Tack room'], { edge: COL.leather, fill: COL.trim, ink: INK })), tcx, 2.22, 0.1);
  for (let i = 0; i < 5; i++) {
    const x = t0 + 0.6 + i * 1.2;
    onT(at(cyl(0.025, 0.025, 0.12, COL.woodDark, 6), 0, 0, 0), x, 1.82, 0.14).rotation.x = P / 2;
    onT(at(rot(tor(0.18, 0.018, COL.leather, P * 2, undefined, 16, 4), 0, 0, 0), 0, 0, 0), x, 1.64, 0.13).scale.set(0.7, 1.1, 1);
    onT(at(box(0.03, 0.4, 0.02, COL.leatherDark), 0, 0, 0), x + 0.1, 1.5, 0.14);
  }
  // Saddle racks with the ponies' saddles and their names
  const racks = [['Biscuit', COL.blue, -1.25], ['Rosie', COL.pink, 0.25], ['Clover', COL.mint, 1.75]];
  for (const [name, pad, x] of racks) {
    const z = ZW + 0.42;
    add(at(box(0.08, 1.0, 0.08, COL.woodDark), x, 0.5, ZW + 0.1));
    add(at(rbox(0.18, 0.14, 0.62, COL.wood, 0.04), x, 0.95, z));
    const sd = add(makeSaddle(k, COL.leather, pad));
    sd.position.set(x, 1.08, z);
    const tag = atlas.panel(0.42, 0.13, 168, 52, boardDraw([name], { edge: pad, fill: COL.trim, ink: INK, radius: 0.4 }));
    add(at(tag, x, 0.62, ZW + 0.15));
    col(x, z, 0.32, 0.36, 1.1);
  }
  // Helmet shelf: Roji picks hers, Homama straps it on
  const HS = { x: t1 - 0.65, z: ZW + 0.3 };
  add(at(box(1.1, 1.6, 0.4, COL.woodDark), HS.x, 0.8, HS.z - 0.02));
  add(at(box(1.0, 1.5, 0.02, COL.woodLight), HS.x, 0.8, HS.z + 0.17));
  for (const y of [0.55, 1.15]) add(at(box(1.0, 0.04, 0.36, COL.wood), HS.x, y, HS.z + 0.02));
  R.state.shelf = HS;
  R.state.helmets = [
    { id: 'hearts', label: 'Pink with hearts', color: COL.pink, deco: '#ffffff', kind: 'hearts', at: [-0.25, 0.55] },
    { id: 'bow', label: 'Lilac with a bow', color: COL.lilac, deco: COL.pink, kind: 'bow', at: [0.25, 0.55] },
    { id: 'mint', label: 'Mint with a stripe', color: COL.mint, deco: '#ffffff', kind: 'stripe', at: [-0.25, 1.15] },
    { id: 'white', label: 'White with a pink bow', color: '#ffffff', deco: COL.rose, kind: 'bow', at: [0.25, 1.15] },
  ].map((h) => {
    const m = makeHelmet(h.color, h.deco, h.kind);
    m.scale.setScalar(0.62);
    m.position.set(HS.x + h.at[0], h.at[1] + 0.02, HS.z + 0.04);
    m.rotation.y = -0.2;
    add(dyn(m));
    R.bake.push(m);
    return { ...h, shelf: m };
  });
  const blue = makeHelmet(COL.navy, COL.sun, 'stripe');
  blue.scale.setScalar(0.62);
  blue.position.set(HS.x, 1.62, HS.z + 0.02);
  add(dyn(blue));
  R.bake.push(blue);
  R.state.blueHelmet = blue;
  col(HS.x, HS.z, 0.56, 0.24);
  // Bench, a tack trunk with R + H painted on it, and a saddle on a stand being cleaned
  add(at(rbox(1.6, 0.1, 0.46, COL.wood, 0.03), 0.4, 0.44, 4.7));
  for (const dx of [-0.65, 0.65]) add(at(box(0.1, 0.4, 0.4, COL.woodDark), 0.4 + dx, 0.2, 4.7));
  col(0.4, 4.7, 0.8, 0.24, 0.47);
  add(at(rbox(1.0, 0.5, 0.56, COL.navy, 0.05), t0 + 0.75, 0.25, ZF - 0.55));
  add(at(rbox(1.04, 0.08, 0.6, '#2f5590', 0.03), t0 + 0.75, 0.52, ZF - 0.55));
  add(at(box(0.12, 0.14, 0.02, COL.gold), t0 + 0.75, 0.42, ZF - 0.26));
  const trunkArt = atlas.panel(0.5, 0.2, 200, 80, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    text(c, 'R + H', w / 2, h / 2 + 2, 52, '#ffd166', 700);
  });
  trunkArt.material = trunkArt.material.clone();
  trunkArt.material.transparent = true;
  trunkArt.material.alphaTest = 0.3;
  add(at(trunkArt, t0 + 0.75, 0.25, ZF - 0.265));
  col(t0 + 0.75, ZF - 0.55, 0.52, 0.3, 0.56);
  const st2 = new THREE.Group();
  st2.add(at(box(0.16, 0.12, 0.8, COL.wood), 0, 0.78, 0));
  for (const s of [1, -1]) for (const e of [-0.3, 0.3]) st2.add(rot(at(box(0.06, 0.82, 0.06, COL.woodDark), s * 0.14, 0.38, e), 0, 0, s * 0.3));
  const sd2 = makeSaddle(k, '#9a5a35', COL.sun);
  sd2.position.y = 0.88;
  st2.add(sd2);
  st2.add(at(rbox(0.14, 0.06, 0.1, '#ffd166', 0.03), 0.12, 1.02, 0.2));
  st2.position.set(t1 - 0.9, 0, 5.6);
  add(st2);
  col(t1 - 0.9, 5.6, 0.34, 0.45, 0.9);
  R.lowWall(t1, ZW, ZF, L.GAP);

  // ---------------------------------------------------------------- grooming corner
  const [g0, g1] = L.GROOM;
  const RO = L.ROSIE;
  const info = PONIES.rosie;
  const rosie = makeStablePony({ coat: info.coat, mane: info.mane, blaze: true, socks: true, lashes: true });
  const ring = addHalter(rosie, info.halter);
  rosie.root.position.set(RO.x, 0, RO.z);
  rosie.root.rotation.y = P / 2;
  add(dyn(rosie.root));
  // The ribbon and flower styles live on pivots (bones are hidden), so they draw on their own
  R.state.rosieRing = ring;
  skinify(rosie.root, { rough: 0.6 });
  ponyState(R, 'rosie', rosie, { nx: 0.08, ny: 0 });
  col(RO.x + 0.15, RO.z, 1.05, 0.36);
  // Cross ties: two posts with ropes clipped to her halter
  const posts = [[RO.x + 1.75, RO.z - 1.05], [RO.x + 1.75, RO.z + 1.05]];
  const ropes = [];
  for (const [x, z] of posts) {
    add(at(box(0.16, 1.9, 0.16, COL.woodDark), x, 0.95, z));
    add(at(rot(tor(0.05, 0.012, COL.steel, P * 2, undefined, 10, 4), 0, P / 2, 0), x, 1.55, z + (z < RO.z ? 0.09 : -0.09)));
    R.circle(x, z, 0.12);
    const rp = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 5), mat(COL.rose, { rough: 0.6 }));
    add(dyn(rp));
    ropes.push({ m: rp, from: new THREE.Vector3(x, 1.55, z + (z < RO.z ? 0.09 : -0.09)) });
  }
  const up = new THREE.Vector3(0, 1, 0);
  const vr = new THREE.Vector3();
  const qr = new THREE.Quaternion();
  const toLocal = (v) => v.sub(R.g.position);
  R.upd(() => {
    ring.getWorldPosition(vr);
    toLocal(vr);
    for (const r of ropes) {
      const d = vr.clone().sub(r.from);
      const len = d.length();
      r.m.position.copy(r.from).addScaledVector(d, 0.5);
      r.m.scale.set(1, len, 1);
      r.m.quaternion.copy(qr.setFromUnitVectors(up, d.normalize()));
    }
  });
  // Drain under her, the shower on its pole, the hose reel, a bucket and sponge, the brush caddy
  add(at(cyl(0.22, 0.22, 0.01, '#3e4b55', 18), RO.x, 0.006, RO.z));
  for (let i = -2; i <= 2; i++) add(at(box(0.36, 0.012, 0.02, '#2a333a'), RO.x, 0.012, RO.z + i * 0.07));
  const SP = { x: RO.x - 1.6, z: RO.z - 1.4 };
  add(at(cyl(0.05, 0.05, 2.5, COL.steel, 8), SP.x, 1.25, SP.z));
  add(at(cyl(0.18, 0.2, 0.06, COL.steel, 12), SP.x, 0.03, SP.z));
  add(rot(at(cyl(0.035, 0.035, 1.1, COL.steel, 8), SP.x + 0.5, 2.48, SP.z + 0.2), 0, -0.38, P / 2));
  const head = add(at(cone(0.13, 0.12, COL.steel, 14), SP.x + 1.02, 2.4, SP.z + 0.4));
  head.rotation.x = 0;
  R.state.shower = new THREE.Vector3(SP.x + 1.02, 2.34, SP.z + 0.4);
  R.circle(SP.x, SP.z, 0.16);
  const HR = { x: g0 + 0.15, z: 2.6 };
  add(at(rot(cyl(0.3, 0.3, 0.12, '#3fbf7f', 18), 0, 0, P / 2), HR.x + 0.08, 0.85, HR.z));
  add(at(rot(cyl(0.12, 0.12, 0.16, '#ffd166', 12), 0, 0, P / 2), HR.x + 0.08, 0.85, HR.z));
  add(at(rot(tor(0.3, 0.04, '#2e9a64', P * 2, undefined, 20, 6), 0, P / 2, 0), HR.x + 0.08, 0.85, HR.z));
  R.state.hoseReel = HR;
  const BK = { x: g0 + 1.6, z: ZF - 0.7 };
  add(at(cyl(0.2, 0.16, 0.32, COL.sun, 14), BK.x, 0.16, BK.z));
  add(at(cyl(0.18, 0.18, 0.01, '#cfefff', 14), BK.x, 0.3, BK.z));
  add(at(rbox(0.16, 0.08, 0.12, '#ffe066', 0.03), BK.x + 0.05, 0.33, BK.z - 0.04));
  R.circle(BK.x, BK.z, 0.21, 0.32);
  const CD = { x: g1 - 0.9, z: ZF - 0.7 };
  add(at(cyl(0.24, 0.24, 0.05, COL.wood, 14), CD.x, 0.46, CD.z));
  for (let i = 0; i < 3; i++) add(at(cyl(0.025, 0.025, 0.46, COL.woodDark, 6), CD.x + Math.cos(i * 2.1) * 0.16, 0.23, CD.z + Math.sin(i * 2.1) * 0.16));
  add(at(rbox(0.42, 0.18, 0.28, COL.rose, 0.04), CD.x, 0.58, CD.z));
  for (const [dx, c] of [[-0.12, COL.pink], [0.0, COL.blue], [0.12, COL.mint]]) {
    const b = add(makeBrush(c));
    b.position.set(CD.x + dx, 0.7, CD.z);
    b.rotation.set(-1.2, 0, 0.1 * dx);
  }
  R.circle(CD.x, CD.z, 0.28, 0.66);
  // Brushes on a little shelf on the side wall, and a sign
  add(at(box(0.3, 0.04, 1.2, COL.woodDark), g1 - 0.15, 1.0, 3.0));
  [COL.pink, COL.sun, COL.blue, COL.lilac].forEach((c, i) => {
    const b = add(makeBrush(c));
    b.position.set(g1 - 0.15, 1.04, 2.55 + i * 0.3);
    b.rotation.y = P / 2;
  });
  const gsign = atlas.panel(1.5, 0.4, 450, 120, boardDraw(['Grooming corner'], { edge: COL.pink, fill: COL.trim, ink: INK }));
  const GSX = g0 + 2.0;
  add(at(gsign, GSX, 2.32, ZW + 0.03));
  add(at(box(1.62, 0.5, 0.08, COL.woodDark), GSX, 2.32, ZW - 0.02));
  for (const dx of [-0.95, 0.95]) {
    add(at(box(0.14, 2.6, 0.14, COL.woodDark), GSX + dx, 1.3, ZW - 0.02));
    R.circle(GSX + dx, ZW - 0.02, 0.1);
  }
  add(at(box(2.06, 0.12, 0.16, COL.woodDark), GSX, 2.62, ZW - 0.02));
  R.lantern(g1 - 0.4, 1.28, ZF - 0.35, 'top');
  add(at(box(0.16, 1.28, 0.16, COL.woodDark), g1 - 0.4, 0.64, ZF - 0.35));
  R.circle(g1 - 0.4, ZF - 0.35, 0.12);
}

// The two of them on horseback with a heart over them: the photo in the office
function drawPhoto(c, w, h) {
  c.fillStyle = '#fff';
  c.fillRect(0, 0, w, h);
  const s = w / 330;
  c.save();
  c.scale(s, s);
  const gr = c.createLinearGradient(0, 14, 0, 236);
  gr.addColorStop(0, '#9fd8ff');
  gr.addColorStop(1, '#e8f7ff');
  c.fillStyle = gr;
  c.fillRect(14, 14, 302, 222);
  c.fillStyle = '#8fd46a';
  c.beginPath();
  c.moveTo(14, 170);
  c.quadraticCurveTo(165, 140, 316, 165);
  c.lineTo(316, 236);
  c.lineTo(14, 236);
  c.fill();
  const pony = (x, coat, mane) => {
    c.fillStyle = coat;
    c.beginPath();
    c.ellipse(x, 172, 44, 24, 0, 0, P * 2);
    c.fill();
    c.fillRect(x - 34, 180, 10, 40);
    c.fillRect(x + 22, 180, 10, 40);
    c.beginPath();
    c.ellipse(x + 46, 142, 14, 26, 0.5, 0, P * 2);
    c.fill();
    c.beginPath();
    c.ellipse(x + 60, 124, 20, 13, 0.3, 0, P * 2);
    c.fill();
    c.fillStyle = mane;
    c.beginPath();
    c.ellipse(x + 38, 136, 7, 22, 0.5, 0, P * 2);
    c.fill();
    c.beginPath();
    c.ellipse(x - 46, 172, 7, 20, -0.4, 0, P * 2);
    c.fill();
  };
  const kid = (x, y, hair, shirt, girl) => {
    c.fillStyle = shirt;
    roundRect(c, x - 14, y, 28, 34, 10);
    c.fill();
    c.fillStyle = '#f8dccb';
    c.beginPath();
    c.arc(x, y - 12, 15, 0, P * 2);
    c.fill();
    c.fillStyle = hair;
    c.beginPath();
    c.arc(x, y - 16, 15, P, P * 2);
    c.fill();
    if (girl) {
      c.beginPath();
      c.arc(x - 16, y - 8, 7, 0, P * 2);
      c.arc(x + 16, y - 8, 7, 0, P * 2);
      c.fill();
    }
    c.fillStyle = '#3b2b3f';
    c.beginPath();
    c.arc(x - 5, y - 11, 2, 0, P * 2);
    c.arc(x + 5, y - 11, 2, 0, P * 2);
    c.fill();
  };
  pony(95, '#f0c4b4', '#7a3b2e');
  pony(215, '#d39a5c', '#fff1d6');
  kid(92, 128, '#2a1a13', '#ef5b6f', true);
  kid(212, 128, '#141010', '#6fb8ff', false);
  c.fillStyle = '#ef5b6f';
  heartPath(c, 152, 66, 40);
  c.fill();
  c.restore();
}
