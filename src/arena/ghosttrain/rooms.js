import { THREE, kit, bake, plane, paint, G, drawGhost, drawStar, heartPath, fitText, FONT, rng, toGeo, vcMat } from './parts.js';
import { ghostGeo, ghostMat } from './models.js';

// The rooms of the funny haunted house, each a dollhouse box the little car rides through:
// a library with flying books, a kitchen with dancing pots, a mirror room, a graveyard of pumpkins
// and the grand hall where the big friendly ghost lives. Each room is built in its own frame:
// the car enters at z = +len/2 and leaves through the door at z = -len/2, the floor is y = 0.
// A room returns { group, len, path, anchors, update(dt, t), ... }. path: [x, z] points the track
// passes through. anchors: places ghosts pop out of ({ x, y, z, mode: 'pop' | 'peek' | 'drop', d: [dx, dy, dz] }).

export const W = 12;
export const H = 4.8;
export const DOOR = { w: 2.6, h: 2.85 };
const PI = Math.PI;

const at = (o, x, y, z) => (o.position.set(x, y, z), o);
const roty = (o, a) => ((o.rotation.y = a), o);

// ------------------------------------------------------------------ atlas pictures
export function pictures(atlas) {
  const gm = atlas.glowMat;
  const P = {};
  // each picture is painted once into the atlas, then copies are scaled to the size asked for
  const cells = new Map();
  const cell = (key, pw, ph, draw, glow = false) => (w, h) => {
    if (!cells.has(key)) {
      const m = atlas.panel(1, 1, pw, ph, draw);
      if (glow) m.material = gm;
      cells.set(key, m);
    }
    const m = cells.get(key).clone();
    m.scale.set(w, h, 1);
    return m;
  };
  const frame = (c, w, h, fill, edge) => {
    c.fillStyle = edge;
    c.fillRect(0, 0, w, h);
    c.fillStyle = fill;
    c.fillRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
  };
  P.doorL = cell('doorL', 256, 512, (c, cw, ch) => doorPaint(c, cw, ch, 0));
  P.doorR = cell('doorR', 256, 512, (c, cw, ch) => doorPaint(c, cw, ch, 1));
  // a portrait of a ghost family (mum, dad and a baby ghost)
  P.family = cell('family', 256, 320, (c, cw, ch) => {
      frame(c, cw, ch, '#bfe3f0', '#d9a441');
      c.fillStyle = '#9ed59a';
      c.fillRect(cw * 0.08, ch * 0.7, cw * 0.84, ch * 0.22);
      drawGhost(c, cw * 0.34, ch * 0.5, 90, { bow: G.rose });
      drawGhost(c, cw * 0.66, ch * 0.47, 100);
      drawGhost(c, cw * 0.5, ch * 0.68, 50);
    });
  P.reader = cell('reader', 256, 320, (c, cw, ch) => {
      frame(c, cw, ch, '#ffe6c7', '#9b6a43');
      drawGhost(c, cw * 0.5, ch * 0.46, 130);
      c.fillStyle = '#ef5b6f';
      c.fillRect(cw * 0.3, ch * 0.62, cw * 0.4, ch * 0.13);
      c.fillStyle = '#fffaf4';
      c.fillRect(cw * 0.49, ch * 0.62, cw * 0.02, ch * 0.13);
    });
  // Easter egg: a small framed drawing of Roji and Homama with a heart
  P.us = cell('us', 256, 256, (c, cw, ch) => {
      frame(c, cw, ch, '#fff4e3', '#f4c24f');
      const head = (x, hair, skin) => {
        c.fillStyle = skin;
        c.beginPath();
        c.arc(x, ch * 0.52, 34, 0, PI * 2);
        c.fill();
        c.fillStyle = hair;
        c.beginPath();
        c.arc(x, ch * 0.47, 36, PI, 0);
        c.fill();
        c.fillStyle = '#3b2b3f';
        for (const s of [-1, 1]) {
          c.beginPath();
          c.arc(x + s * 12, ch * 0.54, 4, 0, PI * 2);
          c.fill();
        }
      };
      c.fillStyle = '#ff9eb5';
      c.fillRect(cw * 0.22, ch * 0.66, 60, 50);
      c.fillStyle = '#6fb8ff';
      c.fillRect(cw * 0.56, ch * 0.66, 60, 50);
      head(cw * 0.34, '#4a2c1a', '#f2cdb4');
      head(cw * 0.66, '#141010', '#e9c3a4');
      c.fillStyle = '#ef5b6f';
      heartPath(c, cw * 0.5, ch * 0.28, 40);
      c.fill();
    });
  // a giant storybook, open on the lectern
  P.book = cell('book', 384, 256, (c, cw, ch) => {
      c.fillStyle = '#fffaf4';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#e8d9c4';
      c.fillRect(cw / 2 - 3, 0, 6, ch);
      drawGhost(c, cw * 0.26, ch * 0.5, 110, { bow: G.rose });
      c.fillStyle = '#6a5662';
      c.font = `600 22px ${FONT}`;
      c.textAlign = 'center';
      for (let i = 0; i < 6; i++) c.fillRect(cw * 0.58, ch * 0.2 + i * 28, cw * (i % 3 === 2 ? 0.22 : 0.34), 7);
      c.fillText('Boo who?', cw * 0.75, ch * 0.88);
    });
  // the fridge note (an Easter egg): dinner for two
  P.note = cell('note', 200, 200, (c, cw, ch) => {
      c.fillStyle = '#fff3a8';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#ef5b6f';
      heartPath(c, cw * 0.5, ch * 0.66, 50);
      c.fill();
      c.fillStyle = '#3b2b3f';
      c.textAlign = 'center';
      fitText(c, 'Dinner for two', cw / 2, ch * 0.24, cw * 0.86, 28);
      fitText(c, '- H', cw * 0.75, ch * 0.9, cw * 0.4, 26);
    });
  P.mirror = cell('mirror', 192, 288, (c, cw, ch) => {
      const g = c.createLinearGradient(0, 0, cw, ch);
      g.addColorStop(0, '#f4f0ff');
      g.addColorStop(0.5, '#c9c2ee');
      g.addColorStop(1, '#e8f2ff');
      c.fillStyle = g;
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = 'rgba(255,255,255,0.75)';
      c.beginPath();
      c.moveTo(cw * 0.15, ch * 0.4);
      c.lineTo(cw * 0.45, ch * 0.12);
      c.lineTo(cw * 0.55, ch * 0.12);
      c.lineTo(cw * 0.25, ch * 0.4);
      c.fill();
      c.beginPath();
      c.moveTo(cw * 0.55, ch * 0.85);
      c.lineTo(cw * 0.85, ch * 0.57);
      c.lineTo(cw * 0.88, ch * 0.62);
      c.lineTo(cw * 0.6, ch * 0.88);
      c.fill();
    });
  // Easter egg: a heart drawn on one misty mirror
  P.mirrorHeart = cell('mirrorHeart', 192, 288, (c, cw, ch) => {
      c.fillStyle = '#dcd6f5';
      c.fillRect(0, 0, cw, ch);
      c.strokeStyle = 'rgba(255,255,255,0.9)';
      c.lineWidth = 7;
      heartPath(c, cw * 0.5, ch * 0.45, 100);
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.9)';
      c.textAlign = 'center';
      fitText(c, 'R + H', cw * 0.5, ch * 0.47, cw * 0.6, 34);
    });
  P.stone = (word) =>
    cell('stone' + word, 160, 128, (c, cw, ch) => {
      c.fillStyle = '#b7a6d6';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#5b4a7a';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fitText(c, word, cw / 2, ch / 2, cw * 0.8, 46, 700);
    });
  P.sign = cell('sign', 768, 256, (c, cw, ch) => {
      c.fillStyle = '#4a3577';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#fff4e3';
      c.fillRect(10, 10, cw - 20, ch - 20);
      c.fillStyle = '#8a6fd1';
      c.fillRect(22, 22, cw - 44, ch - 44);
      c.fillStyle = '#ffd166';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fitText(c, 'Roji Land', cw / 2, ch * 0.28, cw * 0.5, 40, 600);
      c.fillStyle = '#ffffff';
      fitText(c, 'Ghost Train', cw / 2, ch * 0.62, cw * 0.62, 104, 700);
      drawGhost(c, cw * 0.11, ch * 0.55, 92, { bow: G.rose });
      drawGhost(c, cw * 0.89, ch * 0.55, 92);
    });
  P.welcome = cell('welcome', 512, 160, (c, cw, ch) => {
      c.fillStyle = '#fff4e3';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#3b2b3f';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fitText(c, 'Friendly ghosts only', cw / 2, ch * 0.5, cw * 0.86, 56);
    });
  // glowing pictures (unlit)
  P.pumpkinFace = (w, h, kind = 0) =>
    cell('pf' + kind, 160, 128, (c, cw, ch) => {
      c.clearRect(0, 0, cw, ch);
      c.fillStyle = '#ffe28a';
      if (kind === 2) {
        heartPath(c, cw * 0.5, ch * 0.5, 92);
        c.fill();
        c.fillStyle = '#ff9a3c';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        fitText(c, 'R+H', cw / 2, ch * 0.46, cw * 0.4, 26, 700);
        return;
      }
      for (const s of [-1, 1]) {
        c.beginPath();
        if (kind === 0) c.arc(cw / 2 + s * 32, ch * 0.38, 14, 0, PI * 2);
        else c.ellipse(cw / 2 + s * 32, ch * 0.4, 12, 18, 0, 0, PI * 2);
        c.fill();
      }
      c.beginPath();
      c.moveTo(cw * 0.24, ch * 0.6);
      c.quadraticCurveTo(cw * 0.5, ch * 1.02, cw * 0.76, ch * 0.6);
      c.quadraticCurveTo(cw * 0.5, ch * 0.78, cw * 0.24, ch * 0.6);
      c.fill();
    }, true)(w, h);
  P.moon = cell('moon', 256, 256, (c, cw, ch) => {
      c.clearRect(0, 0, cw, ch);
      c.fillStyle = '#fff1b8';
      c.beginPath();
      c.arc(cw / 2, ch / 2, cw * 0.46, 0, PI * 2);
      c.fill();
      c.fillStyle = 'rgba(230,200,120,0.5)';
      for (const [x, y, r] of [[0.35, 0.35, 0.07], [0.66, 0.62, 0.05], [0.4, 0.7, 0.04]]) {
        c.beginPath();
        c.arc(cw * x, ch * y, cw * r, 0, PI * 2);
        c.fill();
      }
      // a sleepy smile
      c.strokeStyle = '#c99a4a';
      c.lineWidth = 6;
      c.lineCap = 'round';
      for (const s of [-1, 1]) {
        c.beginPath();
        c.arc(cw / 2 + s * 38, ch * 0.46, 13, 0.15 * PI, 0.85 * PI);
        c.stroke();
      }
      c.beginPath();
      c.arc(cw / 2, ch * 0.58, 22, 0.15 * PI, 0.85 * PI);
      c.stroke();
    }, true);
  P.window = cell('window', 192, 256, (c, cw, ch) => {
      c.fillStyle = '#ffd98a';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#ffeebd';
      c.fillRect(cw * 0.1, ch * 0.1, cw * 0.8, ch * 0.8);
      drawGhost(c, cw * 0.5, ch * 0.62, 90, { body: '#ffffff' });
      c.fillStyle = '#c99a4a';
      c.fillRect(cw * 0.47, 0, cw * 0.06, ch);
      c.fillRect(0, ch * 0.46, cw, ch * 0.05);
    }, true);
  P.nightWindow = cell('nightWindow', 192, 256, (c, cw, ch) => {
      c.fillStyle = '#3a4a9a';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#fff1b8';
      c.beginPath();
      c.arc(cw * 0.66, ch * 0.3, 26, 0, PI * 2);
      c.fill();
      c.fillStyle = '#ffffff';
      const r = rng(3);
      for (let i = 0; i < 14; i++) {
        drawStar(c, r() * cw, r() * ch, 3 + r() * 4);
        c.fill();
      }
      c.fillStyle = '#e4d6ff';
      c.fillRect(cw * 0.47, 0, cw * 0.06, ch);
      c.fillRect(0, ch * 0.48, cw, ch * 0.05);
    }, true);
  return P;
}

function doorPaint(c, w, h, half) {
  c.fillStyle = '#7d5fc4';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#6a50ad';
  for (let i = 0; i < 4; i++) c.fillRect(i * (w / 4) + 4, 0, 5, h);
  c.fillStyle = '#ffd166';
  c.fillRect(0, h * 0.06, w, 10);
  c.fillRect(0, h * 0.94 - 10, w, 10);
  // half of a big ghost face across the two doors
  c.save();
  c.translate(half ? -w : 0, 0);
  drawGhost(c, w, h * 0.42, w * 1.25, { bow: half ? null : null });
  c.restore();
  c.fillStyle = '#ffd166';
  c.beginPath();
  c.arc(half ? 26 : w - 26, h * 0.62, 12, 0, PI * 2);
  c.fill();
}

// ------------------------------------------------------------------ shared pieces
function wallMats(tex) {
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
}

// Floor, side walls, ceiling and the exit wall with its door opening. Returns the group.
function shell(k, { len, wallTex, floorTex, ceil, trim = '#fff4e3', base = '#4a3577', skirt = true, tile = 2.4, ceilDot = '#ffe7a3', entry = false }) {
  const g = new THREE.Group();
  const wm = wallMats(wallTex);
  const fm = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8 });
  const floor = plane(W, len, fm, 2);
  floor.rotation.x = -PI / 2;
  g.add(floor);
  for (const s of [-1, 1]) {
    const w = plane(len, H, wm, tile);
    w.rotation.y = -s * (PI / 2);
    w.position.set(s * (W / 2), H / 2, 0);
    g.add(w);
    if (skirt) {
      g.add(at(k.box(0.08, 0.2, len, base), s * (W / 2 - 0.04), 0.1, 0));
      g.add(at(k.box(0.07, 0.07, len, trim), s * (W / 2 - 0.035), 1.05, 0));
    }
  }
  const ceiling = plane(W, len, new THREE.MeshBasicMaterial({ map: paint.ceiling(ceil, ceilDot) }), 3);
  ceiling.rotation.x = PI / 2;
  ceiling.position.y = H;
  g.add(ceiling);
  // exit wall, facing the car, with the door opening in the middle
  const z = -len / 2;
  const side = W / 2 - DOOR.w / 2;
  for (const s of [-1, 1]) {
    const p = plane(side, H, wm, tile, { u0: s < 0 ? 0 : W / 2 + DOOR.w / 2 });
    p.position.set(s * (DOOR.w / 2 + side / 2), H / 2, z);
    g.add(p);
  }
  const top = plane(DOOR.w, H - DOOR.h, wm, tile, { u0: W / 2 - DOOR.w / 2, v0: DOOR.h });
  top.position.set(0, DOOR.h + (H - DOOR.h) / 2, z);
  g.add(top);
  // the wall the car came in through (seen when the camera looks back)
  if (entry) {
    for (const s of [-1, 1]) {
      const p = plane(side, H, wm, tile);
      p.rotation.y = PI;
      p.position.set(s * (DOOR.w / 2 + side / 2), H / 2, len / 2 - 0.02);
      g.add(p);
    }
    const t2 = plane(DOOR.w, H - DOOR.h, wm, tile, { v0: DOOR.h });
    t2.rotation.y = PI;
    t2.position.set(0, DOOR.h + (H - DOOR.h) / 2, len / 2 - 0.02);
    g.add(t2);
  }
  // the door frame
  for (const s of [-1, 1]) g.add(at(k.box(0.18, DOOR.h + 0.1, 0.26, trim), s * (DOOR.w / 2 + 0.09), (DOOR.h + 0.1) / 2, z + 0.05));
  g.add(at(k.box(DOOR.w + 0.36, 0.2, 0.28, trim), 0, DOOR.h + 0.1, z + 0.05));
  if (skirt) for (const s of [-1, 1]) g.add(at(k.box(side, 0.2, 0.08, base), s * (DOOR.w / 2 + side / 2), 0.1, z + 0.04));
  return g;
}

// Swing doors: two painted panels on hinges that open away from the car as it comes near
export function buildDoor(P) {
  const root = new THREE.Group();
  const panels = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * (DOOR.w / 2 - 0.02), 0, 0);
    const pw = DOOR.w / 2 - 0.04;
    const front = s < 0 ? P.doorL(pw, DOOR.h - 0.1) : P.doorR(pw, DOOR.h - 0.1);
    front.position.set(-s * (pw / 2), (DOOR.h - 0.1) / 2, 0.035);
    const back = front.clone();
    back.rotation.y = PI;
    back.position.z = -0.035;
    const k = kit();
    const slab = at(k.box(pw, DOOR.h - 0.1, 0.06, '#6a50ad'), -s * (pw / 2), (DOOR.h - 0.1) / 2, 0);
    slab.castShadow = false;
    pivot.add(slab, front, back);
    root.add(pivot);
    panels.push({ pivot, s });
  }
  return {
    root,
    open: 0,
    set(k) {
      this.open = k;
      for (const p of panels) p.pivot.rotation.y = -p.s * k * 1.45;
    },
  };
}

// Little candles in holders on the side walls
function sconces(k, g, len, color = G.gold) {
  for (const s of [-1, 1]) {
    for (let z = len / 2 - 2.5; z > -len / 2 + 1; z -= 4.5) {
      const x = s * (W / 2 - 0.12);
      g.add(at(k.box(0.12, 0.3, 0.24, color), x, 2.35, z));
      g.add(at(k.cyl(0.05, 0.05, 0.22, '#fffaf4', 8), x - s * 0.12, 2.62, z));
      const f = at(k.cone(0.05, 0.12, '#ffd36b', 8), x - s * 0.12, 2.8, z);
      f.material = flameMat;
      g.add(f);
    }
  }
}
const flameMat = new THREE.MeshBasicMaterial({ color: '#ffd36b' });
const glowMat = (c) => new THREE.MeshBasicMaterial({ color: c });

// Books on a shelf: returns matrices and colours for an InstancedMesh
function fillShelf(list, r, x0, z0, z1, y, side, depth = 0.4) {
  const colors = ['#ef5b6f', '#7fd8bf', '#ffd166', '#8fd3ff', '#c7a6ff', '#ff9eb5', '#f6907a', '#6fb8ff', '#fff4e3'];
  for (let z = z0; z < z1 - 0.1; ) {
    const w = 0.07 + r() * 0.06;
    const h = 0.26 + r() * 0.14;
    if (r() < 0.08) {
      z += 0.15;
      continue;
    }
    list.push({ x: x0, y: y + h / 2, z: z + w / 2, sx: depth * (0.8 + r() * 0.2), sy: h, sz: w, c: colors[Math.floor(r() * colors.length)], tilt: r() < 0.06 ? 0.25 : 0, side });
    z += w + 0.01;
  }
}

function instBooks(list) {
  const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.8 }), list.length);
  const M = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const c = new THREE.Color();
  list.forEach((b, i) => {
    q.setFromEuler(e.set(b.tilt, 0, 0));
    M.compose(new THREE.Vector3(b.x, b.y, b.z), q, new THREE.Vector3(b.sx, b.sy, b.sz));
    m.setMatrixAt(i, M);
    m.setColorAt(i, c.set(b.c));
  });
  m.castShadow = false;
  m.receiveShadow = true;
  return m;
}

// A bookcase against a side wall from z0 to z1 (s: -1 left wall, +1 right wall)
function bookcase(k, g, books, r, s, z0, z1, h = 3.3) {
  const x = s * (W / 2 - 0.3);
  const len = z1 - z0;
  const zc = (z0 + z1) / 2;
  g.add(at(k.box(0.05, h, len, '#6e4630'), s * (W / 2 - 0.04), h / 2, zc));
  for (const e of [z0, z1]) g.add(at(k.box(0.5, h, 0.08, '#8a5a3c'), x, h / 2, e));
  const shelves = 5;
  for (let i = 0; i <= shelves; i++) {
    const y = 0.12 + (i * (h - 0.25)) / shelves;
    g.add(at(k.box(0.5, 0.06, len, '#9b6a43'), x, y, zc));
    if (i < shelves) fillShelf(books, r, x + s * 0.02, z0 + 0.05, z1 - 0.05, y + 0.03, s);
  }
  g.add(at(k.box(0.56, 0.12, len + 0.1, '#8a5a3c'), x, h + 0.04, zc));
}

// ------------------------------------------------------------------ the library
export function buildLibrary(env) {
  const { P } = env;
  const k = kit();
  const len = 18;
  const g = shell(k, { len, wallTex: paint.stripes('#3f6f78', '#467a83', '#f4c24f'), floorTex: paint.planks('#b98256', '#a8744a'), ceil: '#4a3f66', base: '#6e4630', trim: '#e8d3a8' });
  const r = rng(11);
  const books = [];
  bookcase(k, g, books, r, -1, 2.2, 8.6);
  bookcase(k, g, books, r, -1, -8.6, -3.6);
  bookcase(k, g, books, r, 1, 3.8, 8.6);
  bookcase(k, g, books, r, 1, -8.6, -1.6);
  // two low book islands with books on both sides
  const islands = [[-3.9, 5.0], [3.95, -4.6]];
  for (const [x, z] of islands) {
    g.add(at(k.rbox(0.6, 1.25, 2.4, '#8a5a3c', 0.05), x, 0.62, z));
    g.add(at(k.box(0.7, 0.06, 2.5, '#9b6a43'), x, 1.27, z));
    for (const s of [-1, 1]) for (const y of [0.15, 0.68]) fillShelf(books, r, x + s * 0.24, z - 1.15, z + 1.15, y, s, 0.12);
  }
  g.add(instBooks(books));
  // fireplace on the left wall with a family portrait above it, and a little picture of the two of them
  const fz = -0.8;
  g.add(at(k.rbox(0.6, 1.5, 2.4, '#d98c7a', 0.04), -W / 2 + 0.3, 0.75, fz));
  g.add(at(k.box(0.75, 0.12, 2.7, '#fff4e3'), -W / 2 + 0.38, 1.52, fz));
  g.add(at(k.box(0.3, 0.9, 1.3, '#3b2b3f'), -W / 2 + 0.52, 0.45, fz));
  const flames = new THREE.Group();
  for (const [dz, c, s] of [[-0.25, '#ff9a3c', 1], [0.2, '#ffd166', 0.85], [0, '#ffb347', 1.2]]) {
    const f = at(k.cone(0.16, 0.5, c, 8), 0, 0.27 * s, dz);
    f.material = glowMat(c);
    f.scale.setScalar(s);
    flames.add(f);
  }
  flames.position.set(-W / 2 + 0.6, 0.05, fz);
  g.add(flames);
  const fam = roty(P.family(1.3, 1.6), PI / 2);
  g.add(at(fam, -W / 2 + 0.03, 2.5, fz));
  const us = roty(P.us(0.4, 0.4), PI / 2 - 0.25);
  g.add(at(us, -W / 2 + 0.36, 1.8, fz + 0.85));
  g.add(at(k.box(0.06, 0.06, 0.06, G.gold), -W / 2 + 0.3, 1.6, fz + 0.85));
  // candles on the mantle
  for (const dz of [-1.0, -0.6]) {
    g.add(at(k.cyl(0.04, 0.04, 0.2, '#fffaf4', 8), -W / 2 + 0.4, 1.68, fz + dz));
    const f = at(k.cone(0.04, 0.1, '#ffd36b', 8), -W / 2 + 0.4, 1.83, fz + dz);
    f.material = flameMat;
    g.add(f);
  }
  // a moonlit window on the right wall
  const win = roty(P.nightWindow(1.5, 2.0), -PI / 2);
  g.add(at(win, W / 2 - 0.03, 2.3, 1.1));
  g.add(at(k.box(0.12, 0.12, 1.8, '#e8d3a8'), W / 2 - 0.08, 1.24, 1.1));
  g.add(at(k.box(0.12, 0.12, 1.8, '#e8d3a8'), W / 2 - 0.08, 3.36, 1.1));
  // a reading corner: a pink armchair and a lamp
  const chair = new THREE.Group();
  chair.add(at(k.rbox(1.2, 0.45, 1.0, G.pink, 0.15), 0, 0.42, 0));
  chair.add(at(k.rbox(1.2, 0.95, 0.3, G.pink, 0.14), 0, 0.85, -0.42));
  for (const s of [-1, 1]) chair.add(at(k.rbox(0.25, 0.6, 1.0, '#ff8fab', 0.1), s * 0.55, 0.6, 0));
  chair.position.set(-4.2, 0, -6.2);
  chair.rotation.y = 0.5;
  g.add(chair);
  g.add(at(k.cyl(0.03, 0.03, 1.5, G.gold, 6), -3.0, 0.75, -7.1));
  const shade = at(k.cone(0.28, 0.3, '#fff3c4', 12), -3.0, 1.6, -7.1);
  shade.material = glowMat('#ffe7a3');
  g.add(shade);
  // the lectern with a giant open storybook
  g.add(at(k.cyl(0.08, 0.12, 1.0, '#8a5a3c', 8), 3.7, 0.5, 1.0));
  g.add(at(k.box(0.9, 0.06, 0.7, '#8a5a3c'), 3.7, 1.02, 1.0));
  const bk = P.book(1.1, 0.72);
  bk.rotation.set(-(PI / 2 - 0.4), -PI / 2, 0, 'YXZ');
  g.add(at(bk, 3.7, 1.1, 1.0));
  // a globe and a rolling ladder
  g.add(at(k.cyl(0.05, 0.25, 0.7, '#8a5a3c', 8), 4.3, 0.35, 6.4));
  const globe = at(k.sph(0.38, '#7fd8bf', undefined, 14), 4.3, 1.1, 6.4);
  g.add(globe);
  g.add(at(k.tor(0.42, 0.025, G.gold, PI * 2, undefined, 20, 5), 4.3, 1.1, 6.4));
  for (const s of [-1, 1]) {
    const rail = at(k.box(0.05, 3.4, 0.05, '#9b6a43'), W / 2 - 0.75, 1.65, 6.3 + s * 0.3);
    rail.rotation.z = 0.18;
    g.add(rail);
  }
  for (let i = 0; i < 7; i++) g.add(at(k.box(0.05, 0.04, 0.6, '#9b6a43'), W / 2 - 0.75 - (i - 3) * 0.08 - 0.02, 0.4 + i * 0.45, 6.3));
  // a chandelier with candles
  chandelier(k, g, 0, -0.8, '#f4c24f');
  sconces(k, g, len, '#e8d3a8');
  const dyn = [flames];
  bake(g, dyn);

  // flying books: covers flap like wings as they loop round the room
  const NB = 9;
  const coverG = new THREE.BoxGeometry(0.3, 0.025, 0.42);
  const leftG = coverG.clone().translate(0.15, 0, 0);
  const rightG = coverG.clone().translate(-0.15, 0, 0);
  const pagesG = new THREE.BoxGeometry(0.07, 0.12, 0.38).translate(0, -0.04, 0);
  const mk = (geo, mat) => {
    const m = new THREE.InstancedMesh(geo, mat, NB);
    m.castShadow = false;
    m.frustumCulled = false;
    g.add(m);
    return m;
  };
  const coverMat = new THREE.MeshStandardMaterial({ roughness: 0.7 });
  const L = mk(leftG, coverMat);
  const R = mk(rightG, coverMat);
  const Pg = mk(pagesG, new THREE.MeshStandardMaterial({ color: '#fffaf4', roughness: 0.9 }));
  const cols = ['#ef5b6f', '#7fd8bf', '#ffd166', '#8fd3ff', '#c7a6ff', '#ff9eb5', '#f6907a', '#6fb8ff', '#ff7fa3'];
  const fly = [];
  const c = new THREE.Color();
  for (let i = 0; i < NB; i++) {
    L.setColorAt(i, c.set(cols[i]));
    R.setColorAt(i, c.set(cols[i]));
    fly.push({ cx: (i % 3) - 1 + (i % 2 ? 1.4 : -1.4), cz: 6 - i * 1.6, r: 1.1 + (i % 3) * 0.4, y: 3.0 + (i % 4) * 0.28, w: (i % 2 ? 1 : -1) * (0.7 + (i % 3) * 0.15), ph: i * 1.7 });
  }
  L.instanceColor.needsUpdate = R.instanceColor.needsUpdate = true;
  const M = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const qz = new THREE.Quaternion();
  const Z = new THREE.Vector3(0, 0, 1);
  const Y = new THREE.Vector3(0, 1, 0);
  const p = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const update = (dt, t) => {
    for (let i = 0; i < NB; i++) {
      const b = fly[i];
      const a = t * b.w + b.ph;
      p.set(b.cx + Math.cos(a) * b.r, b.y + Math.sin(a * 2) * 0.18, b.cz + Math.sin(a) * b.r);
      const yaw = Math.atan2(-Math.sin(a) * b.w, Math.cos(a) * b.w);
      q.setFromAxisAngle(Y, yaw);
      const flap = 0.35 + (Math.sin(t * 9 + b.ph) * 0.5 + 0.5) * 0.9;
      qz.setFromAxisAngle(Z, flap);
      M.compose(p, q.clone().multiply(qz), one);
      L.setMatrixAt(i, M);
      qz.setFromAxisAngle(Z, -flap);
      M.compose(p, q.clone().multiply(qz), one);
      R.setMatrixAt(i, M);
      M.compose(p, q, one);
      Pg.setMatrixAt(i, M);
    }
    L.instanceMatrix.needsUpdate = R.instanceMatrix.needsUpdate = Pg.instanceMatrix.needsUpdate = true;
    for (const f of flames.children) f.scale.y = 1 + Math.sin(t * 13 + f.position.z * 9) * 0.15;
  };
  update(0, 0);
  return {
    type: 'library',
    name: 'the library',
    group: g,
    len,
    tint: { sky: '#e7d9ff', ground: '#6b5a4a', k: 1 },
    path: [[0, 9], [0, 7.5], [-2.1, 3.5], [1.8, -2.5], [0, -7.4], [0, -9]],
    anchors: [
      { x: 4.3, y: 1.1, z: 6.0, mode: 'peek', d: [-0.75, 0.15, 0.3] },
      { x: -3.9, y: 0.95, z: 6.3, mode: 'peek', d: [0.15, 0.1, 0.8] },
      { x: -3.9, y: 1.4, z: 4.4, mode: 'pop', d: [0, 0.8, 0] },
      { x: 3.7, y: 1.2, z: 1.0, mode: 'pop', d: [0, 0.85, 0], spec: true },
      { x: -5.0, y: 1.9, z: 0.2, mode: 'peek', d: [0.9, 0.1, 0.25] },
      { x: 0.8, y: 4.4, z: -0.8, mode: 'drop', d: [0, -1.5, 0] },
      { x: 3.95, y: 1.4, z: -4.0, mode: 'pop', d: [0, 0.8, 0] },
      { x: 3.95, y: 0.95, z: -3.2, mode: 'peek', d: [-0.2, 0.1, 0.8] },
      { x: -4.0, y: 1.0, z: -6.6, mode: 'pop', d: [0, 0.85, 0] },
      { x: 5.2, y: 3.6, z: -5.0, mode: 'peek', d: [-1.0, -0.2, 0.2] },
    ],
    update,
  };
}

function chandelier(k, g, x, z, color) {
  g.add(at(k.cyl(0.02, 0.02, 0.8, color, 5), x, H - 0.4, z));
  g.add(at(k.tor(0.55, 0.04, color, PI * 2, undefined, 24, 6), x, H - 0.85, z));
  g.children.at(-1).rotation.x = PI / 2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    g.add(at(k.cyl(0.035, 0.035, 0.14, '#fffaf4', 6), x + Math.cos(a) * 0.55, H - 0.76, z + Math.sin(a) * 0.55));
    const f = at(k.cone(0.035, 0.09, '#ffd36b', 6), x + Math.cos(a) * 0.55, H - 0.64, z + Math.sin(a) * 0.55);
    f.material = flameMat;
    g.add(f);
  }
}

// ------------------------------------------------------------------ the kitchen
export function buildKitchen(env) {
  const { P } = env;
  const k = kit();
  const len = 18;
  const g = shell(k, { len, wallTex: paint.tiles('#bfeee0', '#e6fbf3', 'rgba(60,120,110,0.18)'), floorTex: paint.tiles('#f6a08c', '#fff4e3'), ceil: '#c9ece2', ceilDot: '#ffffff', base: '#3fbf9f', trim: '#fffaf4', tile: 1.2 });
  // the long counter on the left wall, with a stove and an oven
  const cx = -W / 2 + 0.45;
  g.add(at(k.rbox(0.9, 0.9, 14, '#fff4e3', 0.04), cx, 0.45, 0));
  g.add(at(k.box(1.0, 0.08, 14.1, '#7fd8bf'), cx, 0.94, 0));
  for (let z = -6.5; z <= 6.5; z += 1.0) {
    g.add(at(k.box(0.04, 0.7, 0.86, '#ffe7cf'), cx + 0.46, 0.45, z));
    g.add(at(k.sph(0.04, G.gold, undefined, 6), cx + 0.5, 0.62, z + 0.3));
  }
  g.add(at(k.box(0.85, 0.06, 3.4, '#3b2b3f'), cx, 0.99, 2.6));
  for (const z of [4.2, 2.6, 1.0]) g.add(at(k.cyl(0.22, 0.22, 0.02, '#6a5662', 14), cx + 0.05, 1.03, z));
  const oven = roty(P.window(0.7, 0.5), PI / 2);
  g.add(at(oven, cx + 0.47, 0.45, 2.6));
  // upper cupboards and a pan rail
  g.add(at(k.rbox(0.6, 0.9, 14, '#ffe7cf', 0.04), -W / 2 + 0.3, 3.0, 0));
  for (let z = -6.5; z <= 6.5; z += 1.3) g.add(at(k.box(0.03, 0.75, 1.15, '#fff4e3'), -W / 2 + 0.61, 3.0, z));
  g.add(at(k.cyl(0.02, 0.02, 3.6, G.gold, 6), -W / 2 + 0.75, 2.25, 2.6));
  g.children.at(-1).rotation.x = PI / 2;
  for (const [z, c] of [[4.0, '#e08a5a'], [3.2, '#ff9eb5'], [2.2, '#e08a5a'], [1.2, '#8fd3ff']]) {
    g.add(at(k.cyl(0.2, 0.2, 0.04, c, 14), -W / 2 + 0.8, 1.85, z));
    g.children.at(-1).rotation.z = PI / 2;
    g.add(at(k.box(0.03, 0.35, 0.03, '#6a5662'), -W / 2 + 0.8, 2.08, z));
  }
  // the fridge with a note, a sink under a starry window, shelves of jars
  g.add(at(k.rbox(0.8, 2.2, 1.1, '#7fd8bf', 0.12), W / 2 - 0.45, 1.1, 6.6));
  g.add(at(k.box(0.04, 0.6, 0.06, '#fffaf4'), W / 2 - 0.86, 1.4, 6.2));
  const note = roty(P.note(0.32, 0.32), -PI / 2);
  g.add(at(note, W / 2 - 0.87, 1.75, 6.75));
  g.add(at(k.rbox(0.8, 0.9, 3.4, '#fff4e3', 0.04), W / 2 - 0.42, 0.45, 2.4));
  g.add(at(k.box(0.9, 0.08, 3.5, '#7fd8bf'), W / 2 - 0.42, 0.94, 2.4));
  g.add(at(k.box(0.5, 0.05, 0.8, '#d3dbe5'), W / 2 - 0.42, 0.99, 2.4));
  g.add(at(k.cyl(0.03, 0.03, 0.35, '#d3dbe5', 6), W / 2 - 0.2, 1.15, 2.4));
  const win = roty(P.nightWindow(1.3, 1.3), -PI / 2);
  g.add(at(win, W / 2 - 0.03, 2.0, 2.4));
  for (const y of [2.3, 3.0]) {
    g.add(at(k.box(0.35, 0.05, 2.4, '#fffaf4'), W / 2 - 0.2, y, -2.5));
    for (let i = 0; i < 6; i++) {
      const c = ['#ffd166', '#ff9eb5', '#7fd8bf', '#c7a6ff'][i % 4];
      g.add(at(k.cyl(0.1, 0.1, 0.24, c, 10), W / 2 - 0.22, y + 0.15, -3.5 + i * 0.4));
      g.add(at(k.cyl(0.11, 0.11, 0.05, '#fffaf4', 10), W / 2 - 0.22, y + 0.29, -3.5 + i * 0.4));
    }
  }
  // the table island with a cake on a stand
  g.add(at(k.rbox(1.1, 0.85, 3.3, '#ffc9a8', 0.06), 4.35, 0.42, -2.6));
  g.add(at(k.box(1.2, 0.06, 3.4, '#fffaf4'), 4.35, 0.86, -2.6));
  g.add(at(k.cyl(0.05, 0.05, 0.2, '#fffaf4', 8), 4.4, 0.99, -0.95));
  g.add(at(k.cyl(0.26, 0.26, 0.03, '#fffaf4', 16), 4.4, 1.1, -0.95));
  g.add(at(k.cyl(0.2, 0.2, 0.2, '#ff9eb5', 16), 4.4, 1.22, -0.95));
  g.add(at(k.cyl(0.21, 0.21, 0.05, '#fffaf4', 16), 4.4, 1.33, -0.95));
  g.add(at(k.sph(0.05, '#ef5b6f', undefined, 8), 4.4, 1.39, -0.95));
  // a chef's hat on a hook by the exit and a little sign
  g.add(at(k.cyl(0.14, 0.15, 0.14, '#ffffff', 12), W / 2 - 0.25, 2.6, -7.6));
  g.add(at(k.sph(0.18, '#ffffff', undefined, 12), W / 2 - 0.25, 2.75, -7.6));
  const ceilLamp = (x, z) => {
    g.add(at(k.cyl(0.02, 0.02, 0.9, '#6a5662', 5), x, H - 0.45, z));
    const sh = at(k.cone(0.4, 0.3, '#7fd8bf', 14), x, H - 1.0, z);
    g.add(sh);
    const bulb = at(k.sph(0.12, '#fff3c4', undefined, 10), x, H - 1.15, z);
    bulb.material = glowMat('#fff1c4');
    g.add(bulb);
  };
  ceilLamp(0, 3.5);
  ceilLamp(0, -3.5);
  bake(g, []);

  // dancing pots: bodies and lids bop to the music; ghosts pop out of them
  const POTS = [
    { x: cx + 0.05, y: 1.05, z: 4.2, s: 1, c: '#e08a5a' },
    { x: cx + 0.05, y: 1.05, z: 2.6, s: 0.9, c: '#ff9eb5' },
    { x: cx + 0.05, y: 1.05, z: 1.0, s: 1.05, c: '#8fd3ff' },
    { x: 4.3, y: 0.89, z: -2.3, s: 0.95, c: '#c7a6ff' },
    { x: 4.3, y: 0.89, z: -3.7, s: 0.85, c: '#7fd8bf' },
    { x: -4.0, y: 0, z: -6.3, s: 1.9, c: '#e08a5a' },
  ];
  const potGroup = new THREE.Group();
  const pk = new THREE.Group();
  pk.add(at(k.cyl(0.3, 0.26, 0.42, '#ffffff', 16), 0, 0.21, 0));
  pk.add(at(k.tor(0.3, 0.03, '#ffffff', PI * 2, undefined, 18, 6), 0, 0.42, 0));
  pk.children.at(-1).rotation.x = PI / 2;
  for (const s of [-1, 1]) {
    const hd = at(k.tor(0.07, 0.022, '#ffffff', PI, undefined, 10, 5), s * 0.33, 0.33, 0);
    hd.rotation.z = (-s * PI) / 2;
    pk.add(hd);
  }
  const lk = new THREE.Group();
  const lid = k.sph(0.31, '#ffffff', undefined, 16);
  lid.scale.set(1, 0.3, 1);
  lk.add(lid);
  lk.add(at(k.sph(0.06, '#fffaf4', undefined, 8), 0, 0.1, 0));
  const potMesh = new THREE.InstancedMesh(toGeo(pk), vcMat(0.45, { metalness: 0.2 }), POTS.length);
  const lidMesh = new THREE.InstancedMesh(toGeo(lk), vcMat(0.45, { metalness: 0.2 }), POTS.length);
  const c = new THREE.Color();
  POTS.forEach((p, i) => {
    potMesh.setColorAt(i, c.set(p.c));
    lidMesh.setColorAt(i, c.set(p.c).offsetHSL(0, 0, 0.06));
    p.lift = 0;
    p.spin = 0;
    p.open = 0;
  });
  potMesh.castShadow = lidMesh.castShadow = false;
  potGroup.add(potMesh, lidMesh);
  g.add(potGroup);
  // steam puffs from the big soup pot
  const steamG = new THREE.SphereGeometry(0.16, 8, 6);
  const steam = new THREE.InstancedMesh(steamG, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }), 6);
  steam.frustumCulled = false;
  g.add(steam);
  const M = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const update = (dt, t) => {
    POTS.forEach((p, i) => {
      const beat = t * 4.6 + i * 1.3;
      const hop = Math.max(0, Math.sin(beat)) * 0.06 * p.s;
      const wob = Math.sin(beat * 0.5) * 0.08;
      p.open = Math.max(0, p.open - dt * 0.6);
      p.lift += ((p.open > 0 ? 0.75 : 0) - p.lift) * (1 - Math.exp(-(p.open > 0 ? 10 : 6) * dt));
      p.spin += dt * (p.open > 0 ? 9 : 0);
      q.setFromEuler(e.set(0, 0, wob));
      M.compose(v.set(p.x, p.y + hop * 0.4, p.z), q, sc.setScalar(p.s));
      potMesh.setMatrixAt(i, M);
      const lh = Math.max(0, Math.sin(beat + 0.6)) * 0.07 + p.lift;
      q.setFromEuler(e.set(Math.sin(beat * 1.3) * 0.12 + p.lift * 0.4, p.spin, wob));
      M.compose(v.set(p.x, p.y + hop * 0.4 + (0.44 + lh) * p.s, p.z), q, sc.setScalar(p.s));
      lidMesh.setMatrixAt(i, M);
    });
    potMesh.instanceMatrix.needsUpdate = lidMesh.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 6; i++) {
      const u = (t * 0.4 + i / 6) % 1;
      M.compose(v.set(-4.0 + Math.sin(i * 2 + t) * 0.2, 0.9 + u * 2.2, -6.3 + Math.cos(i * 3) * 0.2), q.identity(), sc.setScalar(0.6 + u * 1.4));
      steam.setMatrixAt(i, M);
    }
    steam.instanceMatrix.needsUpdate = true;
    steam.material.opacity = 0.4;
  };
  update(0, 0);
  const anchors = POTS.map((p, i) => ({ x: p.x, y: p.y + 0.45 * p.s, z: p.z, mode: 'pop', d: [0, 0.75 + (p.s - 1) * 0.6, 0], pot: i, chef: true }));
  anchors.push({ x: W / 2 - 0.45, y: 2.15, z: 6.6, mode: 'pop', d: [0, 0.7, 0] });
  anchors.push({ x: -W / 2 + 0.7, y: 2.9, z: -2.0, mode: 'peek', d: [1.0, 0, 0.2] });
  anchors.push({ x: W / 2 - 0.5, y: 1.9, z: 5.7, mode: 'peek', d: [-0.6, 0, 0.5] });
  return {
    type: 'kitchen',
    name: 'the kitchen',
    group: g,
    len,
    tint: { sky: '#fff2e0', ground: '#7a6a7a', k: 1.12 },
    path: [[0, 9], [0, 7.5], [2.0, 3.0], [1.9, -1.0], [-1.7, -4.5], [0, -7.4], [0, -9]],
    anchors,
    pots: POTS,
    popPot(i, dur = 1.2) {
      POTS[i].open = dur;
    },
    update,
  };
}

// ------------------------------------------------------------------ the mirror room
export function buildMirrors(env) {
  const { P } = env;
  const k = kit();
  const len = 18;
  const g = shell(k, { len, wallTex: paint.moons('#7e66c4', '#f4c24f'), floorTex: paint.tiles('#e4d6ff', '#c7a6ff', 'rgba(255,255,255,0.4)'), ceil: '#4b3a78', base: '#f4c24f', trim: '#ffe7a3' });
  const mirrors = [];
  const zs = [6, 3, 0, -3, -6];
  for (const s of [-1, 1]) {
    zs.forEach((z, i) => {
      const heart = s === 1 && i === 3;
      const glass = heart ? P.mirrorHeart(1.25, 1.9) : P.mirror(1.25, 1.9);
      roty(glass, -s * (PI / 2));
      g.add(at(glass, s * (W / 2 - 0.06), 1.75, z));
      // an oval-ish gold frame: posts and caps
      for (const dz of [-0.68, 0.68]) g.add(at(k.rbox(0.1, 2.1, 0.12, '#f4c24f', 0.04), s * (W / 2 - 0.08), 1.75, z + dz));
      g.add(at(k.rbox(0.1, 0.12, 1.48, '#f4c24f', 0.04), s * (W / 2 - 0.08), 2.76, z));
      g.add(at(k.rbox(0.1, 0.12, 1.48, '#f4c24f', 0.04), s * (W / 2 - 0.08), 0.74, z));
      g.add(at(k.star(0.16, 0.07, 0.05, '#ffd166'), s * (W / 2 - 0.1), 3.0, z));
      g.children.at(-1).rotation.y = -s * (PI / 2);
      mirrors.push({ x: s * (W / 2 - 0.14), y: 1.75, z, s });
    });
  }
  // a crystal chandelier and hanging stars
  chandelier(k, g, 0, 2, '#ffe7a3');
  chandelier(k, g, 0, -4, '#ffe7a3');
  const starM = glowMat('#fff3c4');
  const r = rng(4);
  for (let i = 0; i < 14; i++) {
    const x = (r() - 0.5) * 8;
    const z = (r() - 0.5) * 15;
    const y = 3.6 + r() * 0.8;
    g.add(at(k.cyl(0.005, 0.005, H - y, '#ffe7a3', 3), x, (H + y) / 2, z));
    const st = at(k.star(0.12, 0.05, 0.03, '#fff3c4'), x, y, z);
    st.material = starM;
    g.add(st);
  }
  // velvet ropes along the track
  for (const s of [-1, 1]) {
    for (let z = 7; z >= -7; z -= 3.5) {
      g.add(at(k.cyl(0.05, 0.07, 0.9, '#f4c24f', 8), s * 3.9, 0.45, z));
      g.add(at(k.sph(0.08, '#f4c24f', undefined, 8), s * 3.9, 0.94, z));
    }
  }
  for (const s of [-1, 1]) {
    const rope = at(k.cyl(0.035, 0.035, 14, '#d64466', 6), s * 3.9, 0.82, 0);
    rope.rotation.x = PI / 2;
    g.add(rope);
  }
  sconces(k, g, len, '#f4c24f');
  bake(g, []);
  return {
    type: 'mirror',
    name: 'the mirror room',
    group: g,
    len,
    tint: { sky: '#efe0ff', ground: '#6a5a9a', k: 1.05 },
    path: [[0, 9], [0, 7.5], [-1.3, 4.0], [1.3, 0], [-1.3, -4.0], [0, -7.4], [0, -9]],
    anchors: [
      { x: -4.6, y: 3.6, z: 4.5, mode: 'peek', d: [1, -0.2, 0.3] },
      { x: 4.6, y: 3.6, z: -1.5, mode: 'peek', d: [-1, -0.2, 0.3] },
    ],
    mirrors,
    update() {},
  };
}

// ------------------------------------------------------------------ the graveyard of pumpkins
export function buildGraveyard(env) {
  const { P } = env;
  const k = kit();
  const len = 18;
  const g = shell(k, { len, wallTex: paint.sky(), floorTex: paint.grass('#3f7a52', '#4e9a5a'), ceil: '#2d3270', ceilDot: '#ffffff', skirt: false, trim: '#b7a6d6' });
  // rolling hills painted along the bottom of the walls
  for (const s of [-1, 1]) {
    for (let z = 7; z >= -7; z -= 3.5) {
      const hill = at(k.sph(2.2, '#2f6a48', undefined, 14), s * (W / 2 + 0.6), -0.6, z + (s > 0 ? 1 : 0));
      hill.scale.set(0.5, 0.75, 1);
      g.add(hill);
    }
  }
  const moon = roty(P.moon(2.2, 2.2), 0);
  g.add(at(moon, -3.4, 3.4, -len / 2 + 0.05));
  // a picket fence on each side
  const posts = [];
  for (const s of [-1, 1]) for (let z = 8.5; z >= -8.5; z -= 0.45) posts.push([s * 5.2, z]);
  const post = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.75, 0.09), new THREE.MeshStandardMaterial({ color: '#e4d6ff', roughness: 0.8 }), posts.length);
  const M = new THREE.Matrix4();
  posts.forEach(([x, z], i) => post.setMatrixAt(i, M.makeTranslation(x, 0.38, z)));
  post.castShadow = false;
  g.add(post);
  for (const s of [-1, 1]) for (const y of [0.25, 0.55]) g.add(at(k.box(0.05, 0.07, 17.2, '#e4d6ff'), s * 5.2, y, 0));
  // tombstones with funny words
  const stones = [
    [-4.4, 5.3, 'BOO'], [4.4, 0.9, 'Hi!'], [-4.5, -3.4, 'Zzz'], [4.4, -6.4, 'Nap'], [-4.6, 1.6, 'Hugs'], [4.6, 7.0, 'Smile'],
  ];
  for (const [x, z, word] of stones) {
    const sg = new THREE.Group();
    sg.add(at(k.rbox(0.8, 0.8, 0.22, '#b7a6d6', 0.05), 0, 0.4, 0));
    const top = at(k.cyl(0.4, 0.4, 0.22, '#b7a6d6', 16), 0, 0.8, 0);
    top.rotation.x = PI / 2;
    sg.add(top);
    const label = P.stone(word)(0.62, 0.48);
    sg.add(at(label, 0, 0.62, 0.115));
    sg.add(at(k.box(1.0, 0.08, 0.4, '#8f7fb0'), 0, 0.04, 0));
    sg.position.set(x, 0, z);
    sg.rotation.y = x < 0 ? 0.5 : -0.5;
    g.add(sg);
  }
  // smiling pumpkins with glowing faces
  const pumps = [
    [3.6, 6.0, 1, 0], [-3.4, 2.7, 0.9, 1], [3.9, -2.1, 1.1, 0], [-3.7, -5.9, 1, 1], [4.6, 3.3, 1.25, 2], [-4.2, 7.2, 0.8, 0], [4.8, -4.4, 0.7, 1],
  ];
  for (const [x, z, s, kind] of pumps) {
    const pg = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const lobe = at(k.sph(0.3, i % 2 ? '#ff9a3c' : '#ff8c2a', undefined, 14), Math.cos((i / 5) * PI * 2) * 0.12, 0.3, Math.sin((i / 5) * PI * 2) * 0.12);
      lobe.scale.set(1, 0.85, 1);
      pg.add(lobe);
    }
    pg.add(at(k.cyl(0.04, 0.05, 0.16, '#4e9a5a', 6), 0, 0.6, 0));
    const leaf = at(k.sph(0.08, '#6cc24a', undefined, 8), 0.08, 0.62, 0);
    leaf.scale.set(1.4, 0.3, 0.8);
    pg.add(leaf);
    const face = P.pumpkinFace(0.42, 0.34, kind);
    pg.add(at(face, 0, 0.32, 0.4));
    pg.scale.setScalar(s);
    pg.position.set(x, 0, z);
    pg.rotation.y = -Math.atan2(x, 4) * 0.6;
    g.add(pg);
  }
  // a crooked cute tree with fairy lights
  const tree = new THREE.Group();
  tree.add(at(k.cyl(0.18, 0.3, 2.6, '#6b4a3a', 8), 0, 1.3, 0));
  for (const [x, y, rz] of [[0.5, 2.3, -0.9], [-0.45, 2.0, 0.9], [0.1, 2.7, -0.2]]) {
    const br = at(k.cyl(0.06, 0.1, 1.2, '#6b4a3a', 6), x, y, 0);
    br.rotation.z = rz;
    tree.add(br);
  }
  const bulbM = glowMat('#ffe7a3');
  for (let i = 0; i < 9; i++) {
    const b = at(k.sph(0.06, '#ffe7a3', undefined, 6), Math.cos(i) * 0.6, 2.0 + Math.sin(i * 1.7) * 0.6, Math.sin(i) * 0.3);
    b.material = i % 3 ? bulbM : glowMat('#ff9eb5');
    tree.add(b);
  }
  tree.position.set(-4.7, 0, -0.8);
  g.add(tree);
  // lanterns on posts
  for (const [x, z] of [[-2.8, 8.0], [2.9, -8.0], [3.2, 4.5], [-3.0, -1.7]]) {
    g.add(at(k.cyl(0.04, 0.05, 1.6, '#4a3577', 6), x, 0.8, z));
    const lamp = at(k.box(0.2, 0.26, 0.2, '#fff3c4'), x, 1.7, z);
    lamp.material = glowMat('#ffe7a3');
    g.add(lamp);
    g.add(at(k.cone(0.17, 0.14, '#4a3577', 4), x, 1.9, z));
  }
  // the gate around the exit door
  for (const s of [-1, 1]) g.add(at(k.cyl(0.12, 0.12, 3.0, '#b7a6d6', 10), s * 1.5, 1.5, -len / 2 + 0.1));
  g.add(at(k.tor(1.5, 0.08, '#b7a6d6', PI, undefined, 20, 6), 0, 3.0, -len / 2 + 0.1));
  bake(g, []);
  // fireflies
  const NF = 36;
  const fg = new THREE.BufferGeometry();
  const fp = new Float32Array(NF * 3);
  fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
  const flies = new THREE.Points(fg, new THREE.PointsMaterial({ color: '#fff3a0', size: 0.13, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  flies.frustumCulled = false;
  g.add(flies);
  const seeds = Array.from({ length: NF }, (_, i) => ({ x: (rng(i + 1)() - 0.5) * 10, z: (rng(i + 40)() - 0.5) * 16, y: 0.5 + rng(i + 80)() * 2.5, ph: i * 1.3 }));
  const update = (dt, t) => {
    seeds.forEach((s, i) => {
      fp[i * 3] = s.x + Math.sin(t * 0.6 + s.ph) * 0.5;
      fp[i * 3 + 1] = s.y + Math.sin(t * 0.9 + s.ph * 2) * 0.3;
      fp[i * 3 + 2] = s.z + Math.cos(t * 0.5 + s.ph) * 0.5;
    });
    fg.attributes.position.needsUpdate = true;
    flies.material.opacity = 0.6 + Math.sin(t * 3) * 0.3;
  };
  update(0, 0);
  const anchors = [];
  for (const [x, z, s] of pumps) anchors.push({ x, y: 0.35 * s, z: z - 0.25, mode: 'pop', d: [0, 0.95 * s + 0.2, 0] });
  for (const [x, z] of stones) anchors.push({ x: x - Math.sign(x) * 0.1, y: 0.55, z: z - 0.05, mode: 'peek', d: [-Math.sign(x) * 0.85, 0.15, 0.2] });
  return {
    type: 'graveyard',
    name: 'the pumpkin graveyard',
    group: g,
    len,
    tint: { sky: '#b9c4ff', ground: '#33485a', k: 0.9 },
    path: [[0, 9], [0, 7.5], [2.3, 4.0], [0, 0.5], [-2.3, -3.5], [0, -7.4], [0, -9]],
    anchors,
    update,
  };
}

// ------------------------------------------------------------------ the grand hall (the big friendly ghost)
export function buildHall(env) {
  const { P } = env;
  const k = kit();
  const len = 16;
  const g = shell(k, { len, wallTex: paint.stripes('#8a2f4a', '#963a56', '#f4c24f'), floorTex: paint.planks('#7a4a3a', '#6e4234'), ceil: '#6a2c44', base: '#4a1f30', trim: '#f4c24f', entry: true });
  // the red carpet runner
  g.add(at(k.box(2.0, 0.02, len, '#d64466'), 0, 0.01, 0));
  g.add(at(k.box(2.2, 0.015, len, '#f4c24f'), 0, 0.005, 0));
  // curtains on the side walls
  for (const s of [-1, 1]) {
    for (const z of [5, -1.5]) {
      for (let i = 0; i < 6; i++) {
        const c = at(k.cyl(0.16, 0.2, 3.8, i % 2 ? '#c73b55' : '#d64466', 8), s * (W / 2 - 0.25), 1.9, z - 1 + i * 0.36);
        g.add(c);
      }
      g.add(at(k.box(0.2, 0.25, 2.4, '#f4c24f'), s * (W / 2 - 0.2), 3.9, z - 0.1));
    }
    // ghost portraits
    const p1 = roty(P.family(1.1, 1.35), -s * (PI / 2));
    g.add(at(p1, s * (W / 2 - 0.04), 2.3, 1.9));
    const p2 = roty(P.reader(1.1, 1.35), -s * (PI / 2));
    g.add(at(p2, s * (W / 2 - 0.04), 2.3, -4.6));
  }
  // the big pink sofa the big ghost hides behind
  const sofa = new THREE.Group();
  sofa.add(at(k.rbox(2.8, 0.5, 1.0, '#ff9eb5', 0.18), 0, 0.45, 0));
  sofa.add(at(k.rbox(2.8, 1.1, 0.35, '#ff8fab', 0.16), 0, 0.9, -0.4));
  for (const s of [-1, 1]) sofa.add(at(k.rbox(0.35, 0.75, 1.0, '#ff8fab', 0.15), s * 1.4, 0.6, 0));
  for (const s of [-1, 1]) sofa.add(at(k.sph(0.22, '#fff4e3', undefined, 10), s * 0.7, 0.86, -0.05));
  sofa.position.set(0, 0, -4.8);
  g.add(sofa);
  const welcome = P.welcome(1.6, 0.5);
  g.add(at(welcome, 0, 3.4, -len / 2 + 0.04));
  // candelabras
  for (const [x, z] of [[-3.2, 3.0], [3.2, 3.0], [-3.0, -6.8], [3.0, -6.8]]) {
    g.add(at(k.cyl(0.06, 0.18, 1.3, '#f4c24f', 8), x, 0.65, z));
    for (const dx of [-0.2, 0, 0.2]) {
      g.add(at(k.cyl(0.035, 0.035, 0.22, '#fffaf4', 6), x + dx, 1.42, z));
      const f = at(k.cone(0.04, 0.1, '#ffd36b', 6), x + dx, 1.58, z);
      f.material = flameMat;
      g.add(f);
    }
  }
  chandelier(k, g, 0, 1.0, '#f4c24f');
  // daylight beyond the exit door
  const light = at(new THREE.Mesh(new THREE.PlaneGeometry(9, 7), glowMat('#fff8e8')), 0, 2.5, -len / 2 - 2.6);
  g.add(light);
  bake(g, []);
  return {
    type: 'hall',
    name: 'the grand hall',
    group: g,
    len,
    tint: { sky: '#ffe0e6', ground: '#6a3a4a', k: 1.05 },
    path: [[0, 8], [0, 6], [0, 1.6], [0.3, -0.5], [2.7, -3.4], [2.4, -6.0], [0.5, -7.3], [0, -8], [0, -10.5]],
    stopZ: 1.6,
    bigAt: { x: 0, y: 0, z: -5.6 },
    anchors: [],
    update() {},
  };
}

// ------------------------------------------------------------------ the house front (outside)
export function buildFacade(env) {
  const { P } = env;
  const k = kit();
  const g = new THREE.Group();
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(40, 24), new THREE.MeshStandardMaterial({ map: paint.grass('#4e8a5a', '#5aa066'), roughness: 0.9 }));
  grass.geometry.attributes.uv.array.forEach((v, i, a) => (a[i] = v * 10));
  grass.material.map.repeat.set(1, 1);
  grass.rotation.x = -PI / 2;
  grass.position.set(0, -0.01, 12);
  grass.receiveShadow = true;
  g.add(grass);
  // the platform the car waits at
  g.add(at(k.box(4.2, 0.12, 7.5, '#d4a373'), 0, 0.0, 6.6));
  for (let z = 3.2; z <= 10; z += 0.5) g.add(at(k.box(4.2, 0.005, 0.03, '#b98256'), 0, 0.065, z));
  // the house front: lilac walls, a dark plum roof, glowing windows
  const wallC = '#a68be0';
  g.add(at(k.box(5.8, 6.2, 0.4, wallC), -4.1, 3.1, -0.2));
  g.add(at(k.box(5.8, 6.2, 0.4, wallC), 4.1, 3.1, -0.2));
  g.add(at(k.box(2.4, 6.2 - DOOR.h, 0.4, wallC), 0, DOOR.h + (6.2 - DOOR.h) / 2, -0.2));
  for (const s of [-1, 1]) g.add(at(k.box(0.4, 6.2, 18, '#9479d4'), s * 7.0, 3.1, -9.2));
  g.add(at(k.box(14.6, 0.3, 0.6, '#fff4e3'), 0, 6.3, -0.1));
  // a triangular roof along the house, ridge on top
  const rg = new THREE.CylinderGeometry(4.6, 4.6, 15.4, 3, 1, false);
  rg.rotateZ(PI / 2);
  rg.rotateX(-PI / 2);
  rg.scale(1, 0.55, 1);
  const roof = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: '#4a3577', roughness: 0.85, flatShading: true }));
  roof.position.set(0, 7.47, -2.2);
  g.add(roof);
  for (let i = 0; i < 9; i++) g.add(at(k.cone(0.12, 0.3, '#ffd166', 6), -6 + i * 1.5, 10.1, -2.2));
  // trims round the door
  for (const s of [-1, 1]) g.add(at(k.box(0.22, DOOR.h + 0.2, 0.55, '#fff4e3'), s * (DOOR.w / 2 + 0.1), (DOOR.h + 0.2) / 2, 0));
  g.add(at(k.box(DOOR.w + 0.5, 0.26, 0.6, '#fff4e3'), 0, DOOR.h + 0.15, 0));
  const sign = P.sign(4.2, 1.4);
  g.add(at(sign, 0, 4.4, 0.04));
  for (const x of [-4.1, 4.1]) {
    const w = P.window(1.4, 1.8);
    g.add(at(w, x, 3.3, 0.02));
    g.add(at(k.box(1.6, 0.14, 0.3, '#fff4e3'), x, 2.32, 0.1));
    g.add(at(k.box(1.65, 0.16, 0.24, '#fff4e3'), x, 4.25, 0.05));
  }
  // a round attic window under the roof
  const attic = P.window(1.0, 1.0);
  g.add(at(attic, -4.1, 5.4, 0.02));
  // pumpkins by the door and a lamp post
  for (const [x, z, s] of [[-2.0, 1.1, 0.9], [2.1, 1.0, 1.1], [2.7, 1.6, 0.6]]) {
    for (let i = 0; i < 5; i++) {
      const lobe = at(k.sph(0.3 * s, '#ff9a3c', undefined, 12), x + Math.cos(i * 1.256) * 0.12 * s, 0.28 * s, z + Math.sin(i * 1.256) * 0.12 * s);
      lobe.scale.set(1, 0.85, 1);
      g.add(lobe);
    }
    const face = P.pumpkinFace(0.42 * s, 0.34 * s, 0);
    g.add(at(face, x, 0.3 * s, z + 0.38 * s));
    g.add(at(k.cyl(0.04 * s, 0.05 * s, 0.16 * s, '#4e9a5a', 6), x, 0.58 * s, z));
  }
  for (const s of [-1, 1]) {
    g.add(at(k.cyl(0.06, 0.08, 2.6, '#4a3577', 8), s * 3.4, 1.3, 4.2));
    const lamp = at(k.sph(0.2, '#fff3c4', undefined, 10), s * 3.4, 2.75, 4.2);
    lamp.material = glowMat('#ffe7a3');
    g.add(lamp);
  }
  // fairy lights along the roof edge
  const bulbs = [];
  for (let i = 0; i <= 26; i++) bulbs.push([-7.2 + (i / 26) * 14.4, 6.55 + Math.sin((i / 26) * PI * 6) * 0.06, 0.25]);
  const bulbMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial(), bulbs.length);
  const M = new THREE.Matrix4();
  const c = new THREE.Color();
  bulbs.forEach(([x, y, z], i) => {
    bulbMesh.setMatrixAt(i, M.makeTranslation(x, y, z));
    bulbMesh.setColorAt(i, c.set(['#ffd166', '#ff9eb5', '#7fd8bf', '#c7a6ff'][i % 4]));
  });
  bulbMesh.castShadow = false;
  g.add(bulbMesh);
  const moon = P.moon(3.2, 3.2);
  g.add(at(moon, -9.5, 12.5, -14));
  // stars in the evening sky
  const sp = [];
  const r = rng(21);
  for (let i = 0; i < 70; i++) sp.push((r() - 0.5) * 60, 8 + r() * 18, -16 - r() * 6);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#fff6d8', size: 0.22, sizeAttenuation: true }));
  g.add(stars);
  bake(g, []);
  // the big smiling ghost on the roof, waving gently
  const roofGhost = new THREE.Mesh(ghostGeo('big'), ghostMat());
  roofGhost.scale.setScalar(1.7);
  roofGhost.position.set(2.6, 10.55, -2.2);
  g.add(roofGhost);
  return {
    type: 'facade',
    group: g,
    update(dt, t) {
      roofGhost.position.y = 10.55 + Math.sin(t * 1.5) * 0.15;
      roofGhost.rotation.z = Math.sin(t * 1.1) * 0.08;
    },
  };
}
