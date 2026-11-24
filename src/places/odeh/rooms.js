// The rooms of the family home, built from primitives: walls with wide openings, patterned
// floors, the majlis with floor cushions and a brass tray, the entrance with Odeh's slippers and
// Roji's height marks, the dining room's low table, the hallway photos, the play room, the inner
// courtyard with its fountain, and the kitchen with Roji's old drawing on the fridge.
import { THREE, mat, umat, mesh, box, rbox, cyl, sph, cone, tor, caps, at, sc, canvasTexture, roundRect, FONT, rng, P, C, bakePart } from './kit.js';
import { W, D, X0, X1, ZB, ZH, ZF, ZE, XA, XB, XC, WALL_H, T, ROOMS, DOORS } from './plan.js';
import { drawPhoto, drawSchoolDrawing, PHOTOS } from './photos.js';
import { rugTex, dallah, aloe } from './hill.js';

// ---------------------------------------------------------------- one texture for all the decor
class Atlas {
  constructor(size = 2048) {
    this.size = size;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d');
    this.x = 0;
    this.y = 0;
    this.row = 0;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 8;
    this.material = new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.85 });
  }
  cell(w, h, draw) {
    if (this.x + w > this.size) {
      this.x = 0;
      this.y += this.row + 4;
      this.row = 0;
    }
    const c = { x: this.x, y: this.y, w, h };
    this.ctx.save();
    this.ctx.translate(c.x, c.y);
    this.ctx.beginPath();
    this.ctx.rect(0, 0, w, h);
    this.ctx.clip();
    draw(this.ctx, w, h);
    this.ctx.restore();
    this.x += w + 4;
    this.row = Math.max(this.row, h);
    return c;
  }
  plane(pw, ph, c, { cast = false } = {}) {
    const g = new THREE.PlaneGeometry(pw, ph);
    const uv = g.attributes.uv;
    const S = this.size;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      uv.setXY(i, (c.x + u * c.w) / S, 1 - (c.y + (1 - v) * c.h) / S);
    }
    return mesh(g, this.material, { cast });
  }
  done() {
    this.tex.needsUpdate = true;
  }
}

function floorTex(kind) {
  const r = rng(kind.length * 7);
  const t = canvasTexture(256, 256, (c, w, h) => {
    if (kind === 'cement') {
      // Patterned cement tiles: a red and blue star on cream
      const s = w / 2;
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          const x = i * s;
          const y = j * s;
          c.fillStyle = '#f3e6cf';
          c.fillRect(x, y, s, s);
          c.fillStyle = '#b8453a';
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x + s * 0.32, y);
          c.lineTo(x, y + s * 0.32);
          c.moveTo(x + s, y + s);
          c.lineTo(x + s * 0.68, y + s);
          c.lineTo(x + s, y + s * 0.68);
          c.moveTo(x + s, y);
          c.lineTo(x + s, y + s * 0.32);
          c.lineTo(x + s * 0.68, y);
          c.moveTo(x, y + s);
          c.lineTo(x, y + s * 0.68);
          c.lineTo(x + s * 0.32, y + s);
          c.fill();
          c.fillStyle = '#2f6fa8';
          c.beginPath();
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * P * 2;
            const rr = k % 2 ? s * 0.16 : s * 0.34;
            c.lineTo(x + s / 2 + Math.cos(a) * rr, y + s / 2 + Math.sin(a) * rr);
          }
          c.closePath();
          c.fill();
          c.fillStyle = '#f2c84b';
          c.beginPath();
          c.arc(x + s / 2, y + s / 2, s * 0.08, 0, P * 2);
          c.fill();
          c.strokeStyle = '#d9c4a2';
          c.lineWidth = 2;
          c.strokeRect(x + 1, y + 1, s - 2, s - 2);
        }
      }
    } else if (kind === 'stone') {
      c.fillStyle = '#efe2cc';
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          c.fillStyle = ['#f4e9d6', '#ecdcc2', '#f1e4cf', '#e9d8bd'][i * 2 + j];
          c.fillRect(i * 128 + 2, j * 128 + 2, 124, 124);
          c.fillStyle = 'rgba(180,150,110,0.12)';
          for (let k = 0; k < 6; k++) c.fillRect(i * 128 + 10 + r() * 100, j * 128 + 10 + r() * 100, 3 + r() * 6, 2);
        }
      }
    } else if (kind === 'court') {
      const s = w / 4;
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          c.fillStyle = (i + j) % 2 ? '#ffffff' : '#e8f3fb';
          c.fillRect(i * s, j * s, s, s);
          c.strokeStyle = '#a9cbe6';
          c.lineWidth = 2;
          c.strokeRect(i * s + 1, j * s + 1, s - 2, s - 2);
          c.fillStyle = '#2f86c8';
          c.beginPath();
          c.arc(i * s + s / 2, j * s + s / 2, s * 0.16, 0, P * 2);
          c.fill();
        }
      }
    } else {
      // Warm wood planks
      for (let i = 0; i < 6; i++) {
        c.fillStyle = ['#d9a877', '#d29e6c', '#ddb083', '#cf9a68', '#d6a574', '#dbab7c'][i];
        c.fillRect(0, i * (h / 6), w, h / 6 - 2);
        c.fillStyle = 'rgba(120,70,30,0.12)';
        c.fillRect(((i * 97) % w) - 1, i * (h / 6), 2, h / 6);
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---------------------------------------------------------------- walls
// A wall along x at z = c from a0 to a1 (axis 'x') or along z at x = c (axis 'z'), with openings.
// faces: [colour on the + side, colour on the - side]. Pieces go into `parent`; colliders into `cols`.
function wall(parent, cols, { axis, c, a0, a1, h = WALL_H, faces, holes = [], top = 2.2, trim = C.woodLight }) {
  const pieces = [];
  let s = a0;
  const hs = [...holes].sort((p, q) => p.at - q.at);
  for (const hole of hs) {
    pieces.push([s, hole.at - hole.w / 2, 0, h]);
    if (h > top + 0.05) pieces.push([hole.at - hole.w / 2, hole.at + hole.w / 2, top, h]);
    s = hole.at + hole.w / 2;
  }
  pieces.push([s, a1, 0, h]);
  for (const [p0, p1, y0, y1] of pieces) {
    if (p1 - p0 < 0.01) continue;
    const len = p1 - p0;
    const mid = (p0 + p1) / 2;
    for (const [side, col] of [[1, faces[0]], [-1, faces[1]]]) {
      const b = box(axis === 'x' ? len : T / 2, y1 - y0, axis === 'x' ? T / 2 : len, col, { rough: 0.9 });
      if (axis === 'x') b.position.set(mid, (y0 + y1) / 2, c + side * (T / 4));
      else b.position.set(c + side * (T / 4), (y0 + y1) / 2, mid);
      parent.add(b);
    }
    // A painted skirting band on both faces
    if (y0 === 0) {
      for (const side of [1, -1]) {
        const sk = box(axis === 'x' ? len : 0.02, 0.14, axis === 'x' ? 0.02 : len, '#c9a27a');
        if (axis === 'x') sk.position.set(mid, 0.07, c + side * (T / 2 + 0.01));
        else sk.position.set(c + side * (T / 2 + 0.01), 0.07, mid);
        parent.add(sk);
      }
      if (cols) cols.push(axis === 'x' ? { type: 'box', x: mid, z: c, hw: len / 2, hd: T / 2 + 0.02 } : { type: 'box', x: c, z: mid, hw: T / 2 + 0.02, hd: len / 2 });
    }
  }
  // Wooden frames round the openings
  for (const hole of hs) {
    if (h <= top) continue;
    for (const k of [-1, 1]) {
      const jamb = box(axis === 'x' ? 0.1 : T + 0.06, top, axis === 'x' ? T + 0.06 : 0.1, trim);
      if (axis === 'x') jamb.position.set(hole.at + k * (hole.w / 2 + 0.03), top / 2, c);
      else jamb.position.set(c, top / 2, hole.at + k * (hole.w / 2 + 0.03));
      parent.add(jamb);
    }
    const lin = box(axis === 'x' ? hole.w + 0.2 : T + 0.06, 0.1, axis === 'x' ? T + 0.06 : hole.w + 0.2, trim);
    if (axis === 'x') lin.position.set(hole.at, top + 0.05, c);
    else lin.position.set(c, top + 0.05, hole.at);
    parent.add(lin);
  }
}

// ---------------------------------------------------------------- build
export function buildRooms(ictx, out) {
  const { g, dynamic, colliders, cutaway } = out;
  const atlas = new Atlas(2048);
  out.atlas = atlas;
  const add = (o) => (g.add(o), o);

  // Floors
  const floors = { cement: ['entrance', 'hallway', 'kitchen'], stone: ['majlis', 'dining'], court: ['court'], wood: ['play'] };
  for (const [kind, rooms] of Object.entries(floors)) {
    const fm = new THREE.MeshStandardMaterial({ map: floorTex(kind), roughness: 0.8 });
    const tile = kind === 'wood' ? 2.2 : kind === 'court' ? 2 : 1.2;
    for (const r of rooms) {
      const [x0, x1, z0, z1] = ROOMS[r];
      const fg = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
      fg.rotateX(-P / 2);
      fg.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
      const p = fg.attributes.position;
      const uv = fg.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / tile, -p.getZ(i) / tile);
      g.add(mesh(fg, fm, { cast: false }));
    }
  }
  add(at(box(W + 0.6, 0.3, D + 0.2, '#c9a27a'), 0, -0.155, 0));
  add(at(box(W + 0.62, 0.1, 0.05, '#c8743f'), 0, -0.1, ZE + 0.08));

  // Wall colours per room
  const PAINT = { majlis: '#f6dcc4', entrance: '#f3ead6', dining: '#fbe3cf', hallway: '#f7ecd8', play: '#e3f1e2', court: '#f4e7cf', kitchen: '#e0f0ee', out: '#e8d4b4' };

  // Back wall and outer side walls (the side walls step down near the open front)
  wall(g, colliders, { axis: 'x', c: ZB, a0: X0, a1: XA, faces: [PAINT.play, PAINT.out] });
  wall(g, colliders, { axis: 'x', c: ZB, a0: XA, a1: XC, faces: [PAINT.court, PAINT.out] });
  wall(g, colliders, { axis: 'x', c: ZB, a0: XC, a1: X1, faces: [PAINT.kitchen, PAINT.out] });
  for (const [s, rooms] of [[-1, ['play', 'hallway', 'majlis']], [1, ['kitchen', 'hallway', 'dining']]]) {
    const x = s * (W / 2);
    const faces = (r) => (s < 0 ? [PAINT[r], PAINT.out] : [PAINT.out, PAINT[r]]);
    wall(g, colliders, { axis: 'z', c: x, a0: ZB, a1: ZH, faces: faces(rooms[0]) });
    wall(g, colliders, { axis: 'z', c: x, a0: ZH, a1: ZF, faces: faces(rooms[1]) });
    wall(g, colliders, { axis: 'z', c: x, a0: ZF, a1: 7, faces: faces(rooms[2]) });
    wall(g, colliders, { axis: 'z', c: x, a0: 7, a1: ZE, h: 1.1, faces: faces(rooms[2]) });
    add(at(rbox(T + 0.08, 0.08, ZE - 7 + 0.05, C.woodLight, 0.02), x, 1.12, (7 + ZE) / 2));
  }
  // Dividers: front rooms (with wide arches), back rooms
  const hz = (id) => DOORS.find((d) => d.id === id);
  for (const [x, l, r, id] of [[XA, 'entrance', 'majlis', 'majlis-entrance'], [XB, 'dining', 'entrance', 'entrance-dining']]) {
    const d = hz(id);
    wall(g, colliders, { axis: 'z', c: x, a0: ZF, a1: 7, faces: [PAINT[l], PAINT[r]], holes: [{ at: d.z, w: d.w }], top: 2.3 });
    wall(g, colliders, { axis: 'z', c: x, a0: 7, a1: ZE, h: 1.1, faces: [PAINT[l], PAINT[r]] });
    add(at(rbox(T + 0.08, 0.08, ZE - 7 + 0.05, C.woodLight, 0.02), x, 1.12, (7 + ZE) / 2));
  }
  for (const [x, l, r, id] of [[XA, 'court', 'play', 'play-court'], [XC, 'kitchen', 'court', 'court-kitchen']]) {
    const d = hz(id);
    wall(g, colliders, { axis: 'z', c: x, a0: ZB, a1: ZH, faces: [PAINT[l], PAINT[r]], holes: [{ at: d.z, w: d.w }] });
  }
  // Front lip so nobody walks off the dollhouse
  add(at(rbox(W, 0.1, 0.14, C.woodLight, 0.03), 0, 0.05, ZE - 0.07));
  colliders.push({ type: 'box', x: 0, z: ZE + 0.06, hw: W / 2, hd: 0.14 });

  // Cut-away walls: the hallway's back wall (front of the back rooms) and the front rooms' back wall
  const cut = (spec, faces, room) => {
    const object = new THREE.Group();
    const decor = new THREE.Group();
    object.add(decor);
    g.add(object);
    dynamic.push(object);
    wall(object, colliders, { ...spec, faces });
    cutaway.push({ object, x: (spec.a0 + spec.a1) / 2, z: spec.c, hw: (spec.a1 - spec.a0) / 2, decor, room });
    return { object, decor };
  };
  const hole = (id) => ({ at: hz(id).x, w: hz(id).w });
  const walls = {
    play: cut({ axis: 'x', c: ZH, a0: X0, a1: XA, holes: [hole('play')] }, [PAINT.hallway, PAINT.play], 'play'),
    court: cut({ axis: 'x', c: ZH, a0: XA, a1: XC, holes: [hole('court')] }, [PAINT.hallway, PAINT.court], 'court'),
    kitchen: cut({ axis: 'x', c: ZH, a0: XC, a1: X1, holes: [hole('kitchen')] }, [PAINT.hallway, PAINT.kitchen], 'kitchen'),
    majlis: cut({ axis: 'x', c: ZF, a0: X0, a1: XA, holes: [hole('majlis')] }, [PAINT.majlis, PAINT.hallway], 'majlis'),
    entrance: cut({ axis: 'x', c: ZF, a0: XA, a1: XB, holes: [hole('entrance')] }, [PAINT.entrance, PAINT.hallway], 'entrance'),
    dining: cut({ axis: 'x', c: ZF, a0: XB, a1: X1, holes: [hole('dining')] }, [PAINT.dining, PAINT.hallway], 'dining'),
  };
  out.walls = walls;

  // A tile band along the hallway walls (both long walls, hallway side)
  for (const [z, s] of [[ZH + T / 2 + 0.012, 1], [ZF - T / 2 - 0.012, -1]]) {
    for (const [a0, a1, key] of z < -1 ? [[X0, XA, 'play'], [XA, XC, 'court'], [XC, X1, 'kitchen']] : [[X0, XA, 'majlis'], [XA, XB, 'entrance'], [XB, X1, 'dining']]) {
      const holeX = DOORS.find((d) => d.axis === 'x' && d.z === (z < -1 ? ZH : ZF) && d.x > a0 && d.x < a1);
      const segs = holeX ? [[a0, holeX.x - holeX.w / 2 - 0.1], [holeX.x + holeX.w / 2 + 0.1, a1]] : [[a0, a1]];
      for (const [p0, p1] of segs) {
        const band = box(p1 - p0, 0.1, 0.02, '#2f86c8');
        band.position.set((p0 + p1) / 2, 0.95, z);
        walls[key].object.add(band);
      }
    }
  }

  // ---------------------------------------------------------------- the decor atlas
  const looks = ictx.looks;
  const cells = {};
  cells.rugMajlis = atlas.cell(512, 432, (c, w, h) => drawRug(c, w, h, '#b83a3a', '#f2d48a', '#2b4a6e'));
  cells.rugDining = atlas.cell(512, 352, (c, w, h) => drawRug(c, w, h, '#2b4a6e', '#f2d48a', '#c0392b'));
  cells.rugPlay = atlas.cell(512, 384, (c, w, h) => drawPlayRug(c, w, h));
  cells.runner = atlas.cell(1024, 96, (c, w, h) => drawRunner(c, w, h));
  for (const k of Object.keys(PHOTOS)) cells['photo-' + k] = atlas.cell(256, 220, (c, w, h) => drawPhoto(c, w, h, k, looks));
  cells.drawing = atlas.cell(256, 192, (c, w, h) => drawSchoolDrawing(c, w, h));
  cells.marks = atlas.cell(96, 640, (c, w, h) => drawMarks(c, w, h));
  cells.note = atlas.cell(128, 128, (c, w, h) => drawNote(c, w, h, ['Basem:', 'the kunafa', 'is for', 'GUESTS!'], '#fff27a'));
  cells.note2 = atlas.cell(128, 128, (c, w, h) => drawNote(c, w, h, ['Roji and', 'Homama', 'Friday!', ''], '#ffc8dd', true));
  cells.painting = atlas.cell(256, 176, (c, w, h) => drawPainting(c, w, h));
  // Window glass has its own material so it can turn to a night sky
  out.skyMat = new THREE.MeshStandardMaterial({ map: canvasTexture(128, 160, (c, w, h) => drawSkyWindow(c, w, h)), roughness: 0.4, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.15 });
  out.skyMat.emissiveMap = out.skyMat.map;
  cells.window = out.skyMat;
  cells.clock = atlas.cell(128, 128, (c, w, h) => drawClock(c, w, h));
  out.cells = cells;
  const decal = (cell, w, h, x, y, z, ry = 0, parent = g) => {
    const m = atlas.plane(w, h, cell);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    parent.add(m);
    return m;
  };
  const rug = (cell, w, d, x, z) => {
    const m = atlas.plane(w, d, cell);
    m.rotation.x = -P / 2;
    m.position.set(x, 0.01, z);
    g.add(m);
  };

  // ---------------------------------------------------------------- majlis
  rug(cells.rugMajlis, 6.2, 5.2, -9.4, 4.8);
  const cushA = ['#b83a3a', '#c8743f', '#7a2e3a', '#2b4a6e'];
  // Floor mattresses with back cushions along the back wall and the left wall
  add(at(rbox(5.2, 0.18, 0.78, '#8a3030', 0.05), -11.0, 0.09, ZF + 0.5));
  for (let i = 0; i < 6; i++) add(at(rbox(0.8, 0.5, 0.2, cushA[i % 4], 0.08), -13.0 + i * 0.86, 0.38, ZF + 0.22, -0.1, 0, 0));
  add(at(rbox(0.78, 0.18, 6.6, '#8a3030', 0.05), X0 + 0.5, 0.09, 4.6));
  for (let i = 0; i < 7; i++) add(at(rbox(0.2, 0.5, 0.86, cushA[(i + 1) % 4], 0.08), X0 + 0.22, 0.38, 1.6 + i * 0.92, 0, 0, -0.1));
  // Arm bolsters
  for (const [x, z] of [[-8.45, ZF + 0.5], [X0 + 0.5, 7.95]]) add(at(caps(0.13, 0.4, '#e7b54a'), x, 0.26, z, P / 2, 0, 0));
  colliders.push({ type: 'box', x: -11.0, z: ZF + 0.5, hw: 2.6, hd: 0.39, h: 0.18 }, { type: 'box', x: X0 + 0.5, z: 4.6, hw: 0.39, hd: 3.3, h: 0.18 });
  colliders.push({ type: 'box', x: -11.0, z: ZF + 0.2, hw: 2.6, hd: 0.12, h: 0.62 }, { type: 'box', x: X0 + 0.2, z: 4.6, hw: 0.12, hd: 3.3, h: 0.62 });
  // The brass tray table with the coffee pot, little cups and dates
  const brass = mat(C.brass, { rough: 0.35, metal: 0.5 });
  const tray = new THREE.Group();
  tray.add(at(cyl(0.62, 0.62, 0.04, brass, 26), 0, 0.36, 0));
  tray.add(at(tor(0.62, 0.025, C.gold, 6, 26), 0, 0.38, 0, P / 2, 0, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * P * 2;
    tray.add(at(box(0.04, 0.34, 0.04, C.woodDark), Math.sin(a) * 0.36, 0.17, Math.cos(a) * 0.36, 0, a, 0.25));
  }
  tray.add(at(cyl(0.13, 0.1, 0.06, '#ffffff', 14), 0.25, 0.41, 0.12));
  for (let i = 0; i < 7; i++) tray.add(at(caps(0.022, 0.035, '#6b3420'), 0.2 + (i % 3) * 0.05, 0.46, 0.08 + Math.floor(i / 3) * 0.05, 0, 0, P / 2));
  tray.position.set(-10.3, 0, 2.0);
  g.add(tray);
  colliders.push({ type: 'circle', x: -10.3, z: 2.0, r: 0.6, h: 0.4 });
  // The dallah and the cups are their own pieces (Odeh pours)
  const pot = dallah(brass);
  pot.position.set(-10.55, 0.38, 1.85);
  g.add(pot);
  dynamic.push(pot);
  out.dallah = pot;
  out.dallahHome = pot.position.clone();
  const cups = [];
  for (let i = 0; i < 4; i++) {
    const cup = cyl(0.04, 0.03, 0.05, '#fffaf4', 10);
    cup.position.set(-10.1 + (i % 2) * 0.12, 0.405, 1.75 + Math.floor(i / 2) * 0.12);
    g.add(cup);
    cups.push(cup);
  }
  out.cups = cups;
  // A brass lantern hanging from the ceiling line, a painting of the hill and a window
  walls.majlis.decor.add(at(box(1.42, 1.02, 0.03, C.woodDark), -11.0, 1.75, ZF + T / 2 + 0.01));
  decal(cells.painting, 1.3, 0.9, -11.0, 1.75, ZF + T / 2 + 0.03, 0, walls.majlis.decor);
  sideWindow(g, atlas, cells.window, X0 + T / 2 + 0.02, 3.6, 1);
  // A tall plant in the corner and a wooden chest for the cushions
  aloe(g, -13.2, 0, 8.9, 1.1, 31, true);
  colliders.push({ type: 'circle', x: -13.2, z: 8.9, r: 0.3, h: 0.4 });
  add(at(rbox(1.2, 0.6, 0.6, C.woodDark, 0.04), -6.0, 0.3, ZF + 0.42));
  add(at(box(1.1, 0.04, 0.5, C.gold), -6.0, 0.62, ZF + 0.42));
  colliders.push({ type: 'box', x: -6.0, z: ZF + 0.42, hw: 0.6, hd: 0.3, h: 0.64 });
  // A newspaper for Odeh
  out.newspaper = new THREE.Group();
  out.newspaper.add(at(box(0.36, 0.26, 0.01, '#f4f0e6'), 0, 0, 0));
  for (let i = 0; i < 5; i++) out.newspaper.add(at(box(0.28, 0.012, 0.012, '#8a8a8a'), 0, 0.08 - i * 0.04, 0.008));
  bakePart(out.newspaper);

  // ---------------------------------------------------------------- entrance
  // Doormat, the shoe rack with Odeh's slippers, coat hooks, a mirror and a bowl of sweets
  const matM = atlas.plane(1.6, 0.8, atlas.cell(256, 128, (c, w, h) => {
    c.fillStyle = '#c8743f';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#e7b54a';
    c.fillRect(10, 10, w - 20, h - 20);
    c.fillStyle = '#7a2e3a';
    c.font = `700 52px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('Ahlan', w / 2, h / 2 + 3);
  }));
  matM.rotation.x = -P / 2;
  matM.position.set(-1.5, 0.012, 8.9);
  g.add(matM);
  const rack = new THREE.Group();
  rack.add(at(rbox(1.3, 0.08, 0.4, C.wood, 0.02), 0, 0.42, 0));
  rack.add(at(rbox(1.3, 0.08, 0.4, C.wood, 0.02), 0, 0.12, 0));
  for (const s of [1, -1]) rack.add(at(box(0.06, 0.48, 0.38, C.woodDark), s * 0.62, 0.24, 0));
  const shoe = (x, y, z, col, ry = 0) => {
    const sh = sc(sph(0.08, col, 8, 5), 0.8, 0.45, 1.4);
    rack.add(at(sh, x, y, z, 0, ry, 0));
  };
  shoe(-0.45, 0.48, 0, '#ef5b6f');
  shoe(-0.3, 0.48, 0, '#ef5b6f');
  shoe(0.05, 0.48, 0, '#3b2b3f');
  shoe(0.2, 0.48, 0, '#3b2b3f');
  shoe(0.42, 0.18, 0, '#ffffff');
  shoe(0.55, 0.18, 0, '#ffffff');
  shoe(-0.45, 0.18, 0, '#ffd166');
  shoe(-0.38, 0.18, 0.05, '#ffd166');
  rack.position.set(XA + 0.32, 0, 8.4);
  rack.rotation.y = P / 2;
  g.add(rack);
  colliders.push({ type: 'box', x: XA + 0.32, z: 8.4, hw: 0.22, hd: 0.66, h: 0.48 });
  // Odeh's slippers in front of the rack (an easter egg)
  for (const s of [0, 1]) {
    const sl = new THREE.Group();
    sl.add(at(sc(sph(0.1, '#7a4a2a', 10, 6), 0.75, 0.25, 1.4), 0, 0.02, 0));
    sl.add(at(sc(sph(0.08, '#5a3420', 10, 6), 0.9, 0.5, 0.8), 0, 0.04, 0.06));
    sl.position.set(XA + 0.95 + s * 0.24, 0, 7.6 + s * 0.05);
    sl.rotation.y = 0.3 - s * 0.4;
    g.add(sl);
  }
  for (let i = 0; i < 4; i++) {
    add(at(sph(0.04, C.brass, 6, 4), XA + T / 2 + 0.05, 1.65, 7.6 + i * 0.4));
  }
  add(at(rbox(0.1, 0.7, 0.5, '#c0392b', 0.04), XA + T / 2 + 0.1, 1.3, 7.8));
  add(at(rbox(0.12, 0.6, 0.4, '#2c3e66', 0.04), XA + T / 2 + 0.1, 1.35, 8.6));
  // Console with a mirror and a bowl of sweets on the dining side divider
  add(at(rbox(0.45, 0.06, 1.4, C.woodDark, 0.02), XB - 0.3, 0.82, 8.3));
  for (const z of [7.7, 8.9]) add(at(box(0.05, 0.8, 0.05, C.woodDark), XB - 0.3, 0.4, z));
  add(at(sc(sph(0.18, C.brass, 12, 6), 1, 0.4, 1), XB - 0.3, 0.9, 8.6));
  for (let i = 0; i < 6; i++) add(at(sph(0.04, ['#ef5b6f', '#ffd166', '#7fd3ff'][i % 3], 6, 4), XB - 0.3 + Math.sin(i) * 0.08, 0.96, 8.6 + Math.cos(i) * 0.08));
  add(at(box(0.04, 1.0, 0.8, '#bfe3ee', { rough: 0.2 }), XB - T / 2 - 0.03, 1.55, 8.3));
  add(at(box(0.05, 1.12, 0.92, C.gold), XB - T / 2 - 0.01, 1.55, 8.3));
  colliders.push({ type: 'box', x: XB - 0.3, z: 8.3, hw: 0.25, hd: 0.72, h: 0.86 });
  decal(cells.clock, 0.5, 0.5, -0.2, 2.15, ZF + T / 2 + 0.012, 0, walls.entrance.decor);
  // Roji's height marks on the frame of the hallway opening (an easter egg)
  const hd = hz('entrance');
  decal(cells.marks, 0.16, 1.6, hd.x - hd.w / 2 - 0.17, 0.82, ZF + T / 2 + 0.035, 0, walls.entrance.decor);
  out.marks = { x: hd.x - hd.w / 2 - 0.17, z: ZF + 0.6 };

  // ---------------------------------------------------------------- dining room
  rug(cells.rugDining, 6.2, 4.2, 8.0, 4.7);
  const table = new THREE.Group();
  table.add(at(rbox(3.4, 0.08, 1.5, C.wood, 0.03), 0, 0.4, 0));
  for (const [x, z] of [[1.55, 0.6], [-1.55, 0.6], [1.55, -0.6], [-1.55, -0.6]]) table.add(at(box(0.1, 0.38, 0.1, C.woodDark), x, 0.19, z));
  table.add(at(box(3.0, 0.012, 0.42, '#fffaf4'), 0, 0.445, 0));
  table.position.set(8.0, 0, 4.7);
  g.add(table);
  colliders.push({ type: 'box', x: 8.0, z: 4.7, hw: 1.72, hd: 0.76, h: 0.46 });
  out.table = { x: 8.0, z: 4.7, y: 0.45 };
  const cushB = ['#c0392b', '#e7b54a', '#2b4a6e', '#c8743f', '#7a2e3a', '#3f8f6b'];
  out.diningSeats = {
    roji: { x: 7.3, z: 3.45, yaw: 0 },
    homama: { x: 8.7, z: 3.45, yaw: 0 },
    odeh: { x: 5.85, z: 4.7, yaw: P / 2 },
    hanan: { x: 10.15, z: 4.7, yaw: -P / 2 },
    sultan: { x: 7.3, z: 5.95, yaw: P },
    basem: { x: 8.7, z: 5.95, yaw: P },
  };
  Object.values(out.diningSeats).forEach((s, i) => {
    add(at(rbox(0.66, 0.14, 0.66, cushB[i], 0.06), s.x, 0.07, s.z));
    colliders.push({ type: 'box', x: s.x, z: s.z, hw: 0.3, hd: 0.3, h: 0.14 });
  });
  // The food that is always there: bread, salad, pickles, plates
  const food = new THREE.Group();
  for (const [x, z] of [[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.35], [0.8, 0.35], [-1.35, 0], [1.35, 0]]) food.add(at(cyl(0.16, 0.13, 0.03, '#ffffff', 16), x, 0.46, z));
  food.add(at(sc(sph(0.2, '#4f9a55', 12, 6), 1, 0.4, 1), -0.25, 0.5, 0.0));
  food.add(at(cyl(0.22, 0.15, 0.08, '#e9eef3', 14), -0.25, 0.48, 0));
  for (let i = 0; i < 4; i++) food.add(at(cyl(0.12, 0.12, 0.02, '#d9a45c', 12), 0.35 + i * 0.03, 0.47 + i * 0.022, 0.25));
  food.add(at(cyl(0.08, 0.08, 0.12, '#e8f0d0', 10), 0.25, 0.51, -0.25));
  food.position.set(8.0, 0, 4.7);
  g.add(food);
  // Sideboard with dishes, a fruit bowl and a window
  add(at(rbox(2.6, 0.9, 0.5, C.woodDark, 0.04), 10.8, 0.45, ZF + 0.38));
  add(at(box(2.5, 0.04, 0.46, C.wood), 10.8, 0.91, ZF + 0.38));
  for (let i = 0; i < 4; i++) add(at(box(0.5, 0.6, 0.02, C.wood), 9.9 + i * 0.6, 0.45, ZF + 0.64));
  for (let i = 0; i < 5; i++) add(at(cyl(0.12, 0.12, 0.02, '#ffffff', 12), 9.9 + i * 0.32, 0.95 + i * 0.0, ZF + 0.32));
  add(at(sc(sph(0.22, C.brass, 12, 6), 1, 0.4, 1), 11.6, 1.0, ZF + 0.38));
  for (let i = 0; i < 6; i++) add(at(sph(0.07, ['#e5484d', '#ffd166', '#ff9a3a'][i % 3], 8, 6), 11.6 + Math.sin(i * 1.1) * 0.12, 1.08 + (i > 3 ? 0.06 : 0), ZF + 0.38 + Math.cos(i * 1.1) * 0.1));
  colliders.push({ type: 'box', x: 10.8, z: ZF + 0.38, hw: 1.3, hd: 0.27, h: 0.92 });
  sideWindow(g, atlas, cells.window, X1 - T / 2 - 0.02, 3.6, -1);
  // A hanging lamp over the table (glows a little)
  const lampGlass = umat('#ffe2a8', { emissive: '#ffc070', ei: 0.5, rough: 0.4 });
  out.lampGlass = lampGlass;
  add(at(cyl(0.008, 0.008, 0.6, '#3b2b3f', 4), 8.0, 2.5, 4.7));
  add(at(mesh(new THREE.SphereGeometry(0.26, 14, 8, 0, P * 2, 0, P / 2), lampGlass, { cast: false }), 8.0, 2.05, 4.7));
  add(at(cone(0.3, 0.2, C.brass, 12), 8.0, 2.25, 4.7));

  // ---------------------------------------------------------------- hallway
  const run = atlas.plane(W - 1.2, 1.1, cells.runner);
  run.rotation.x = -P / 2;
  run.position.set(0, 0.011, (ZH + ZF) / 2);
  g.add(run);
  // Family photos on the hallway wall
  const photoSpots = [
    ['baby', -12.0, 1.62],
    ['kids', -10.2, 1.5],
    ['graduation', -3.2, 1.62],
    ['wedding', 2.1, 1.62],
    ['sultan', 9.4, 1.55],
    ['garden', 11.4, 1.62],
  ];
  out.photoSpots = [];
  for (const [k, x, y] of photoSpots) {
    const key = x < XA ? 'play' : x < XC ? 'court' : 'kitchen';
    const big = k === 'wedding' || k === 'graduation';
    const w = big ? 1.05 : 0.8;
    const h = w * (220 / 256);
    const z = ZH + T / 2 + 0.014;
    walls[key].decor.add(at(box(w + 0.12, h + 0.12, 0.03, k === 'wedding' ? C.gold : C.woodDark), x, y, z - 0.006));
    decal(cells['photo-' + k], w, h, x, y, z + 0.012, 0, walls[key].decor);
    out.photoSpots.push({ k, x, y, z });
  }
  // A little console with a vase
  add(at(rbox(1.2, 0.06, 0.38, C.woodDark, 0.02), -5.6, 0.8, ZH + 0.3));
  for (const x of [-6.1, -5.1]) add(at(box(0.05, 0.8, 0.05, C.woodDark), x, 0.4, ZH + 0.3));
  add(at(cyl(0.08, 0.12, 0.3, '#2f86c8', 12), -5.6, 0.98, ZH + 0.3));
  for (let i = 0; i < 5; i++) add(at(sph(0.06, i % 2 ? '#ff8fb1' : '#ffffff', 6, 4), -5.6 + Math.sin(i * 1.3) * 0.1, 1.2 + (i % 2) * 0.06, ZH + 0.3 + Math.cos(i * 1.3) * 0.06));
  colliders.push({ type: 'box', x: -5.6, z: ZH + 0.3, hw: 0.6, hd: 0.2, h: 0.84 });

  // ---------------------------------------------------------------- play room
  rug(cells.rugPlay, 4.4, 3.3, -9.6, -6.4);
  // The sofa Sultan bounces on
  const sofa = new THREE.Group();
  sofa.add(at(rbox(2.8, 0.3, 0.9, '#7fbfa8', 0.08), 0, 0.22, 0));
  sofa.add(at(rbox(2.8, 0.62, 0.26, '#6aae96', 0.1), 0, 0.62, -0.34));
  for (const s of [1, -1]) sofa.add(at(rbox(0.26, 0.48, 0.9, '#6aae96', 0.1), s * 1.36, 0.4, 0));
  for (const s of [-0.7, 0, 0.7]) sofa.add(at(rbox(0.82, 0.12, 0.72, '#9ad1bd', 0.06), s, 0.42, 0.05));
  sofa.add(at(rbox(0.42, 0.38, 0.14, '#ffd166', 0.07), -0.9, 0.64, -0.16, -0.2, 0, 0.1));
  sofa.add(at(rbox(0.42, 0.38, 0.14, '#ff8fb1', 0.07), 0.9, 0.64, -0.16, -0.2, 0, -0.1));
  sofa.position.set(-10.2, 0, ZB + 0.6);
  g.add(sofa);
  out.sofa = { x: -10.2, z: ZB + 0.65, y: 0.48 };
  colliders.push({ type: 'box', x: -10.2, z: ZB + 0.72, hw: 1.25, hd: 0.36, h: 0.48 }, { type: 'box', x: -10.2, z: ZB + 0.26, hw: 1.5, hd: 0.14, h: 0.93 });
  for (const s of [1, -1]) colliders.push({ type: 'box', x: -10.2 + s * 1.36, z: ZB + 0.6, hw: 0.13, hd: 0.45, h: 0.64 });
  // A little play tent (Sultan's hiding place), a rocking horse, blocks and a toy box
  const tp = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * P * 2;
    tp.add(at(cyl(0.02, 0.02, 1.6, C.woodLight, 5), Math.sin(a) * 0.4, 0.75, Math.cos(a) * 0.4, -Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3));
  }
  const cloth = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.4, 5, 1, true, 0.6, P * 2 - 1.2), mat('#ffd166', { rough: 0.9, side: THREE.DoubleSide }));
  tp.add(at(cloth, 0, 0.7, 0));
  tp.add(at(cyl(0.6, 0.6, 0.03, '#ff8fb1', 12), 0, 0.015, 0));
  tp.position.set(-13.0, 0, -5.0);
  tp.rotation.y = 0.8;
  g.add(tp);
  out.tent = { x: -13.0, z: -5.0 };
  const horse = new THREE.Group();
  for (const z of [-0.2, 0.2]) {
    const rock = mesh(new THREE.TorusGeometry(0.62, 0.035, 5, 18, 1.6), mat('#c0392b'));
    rock.rotation.set(0, 0, P + (P - 1.6) / 2);
    rock.position.set(0, 0.66, z);
    horse.add(rock);
  }
  for (const [x, z] of [[0.24, 0.16], [0.24, -0.16], [-0.24, 0.16], [-0.24, -0.16]]) horse.add(at(cyl(0.035, 0.035, 0.36, '#f4e7cf', 6), x, 0.24, z, z > 0 ? -0.25 : 0.25, 0, x > 0 ? -0.2 : 0.2));
  horse.add(at(rbox(0.62, 0.24, 0.26, '#f4e7cf', 0.1), 0, 0.5, 0));
  horse.add(at(rbox(0.26, 0.06, 0.28, '#ef5b6f', 0.02), -0.02, 0.63, 0));
  horse.add(at(rbox(0.2, 0.34, 0.18, '#f4e7cf', 0.08), 0.32, 0.72, 0, 0, 0, -0.35));
  horse.add(at(rbox(0.24, 0.14, 0.16, '#f4e7cf', 0.06), 0.44, 0.86, 0));
  for (let i = 0; i < 4; i++) horse.add(at(sph(0.05, '#7a4a26', 6, 4), 0.27 - i * 0.05, 0.86 - i * 0.07, 0));
  for (const s2 of [1, -1]) {
    horse.add(at(sph(0.022, '#1d130f', 6, 4), 0.5, 0.9, s2 * 0.07));
    horse.add(at(cone(0.03, 0.08, '#f4e7cf', 5), 0.38, 0.97, s2 * 0.05));
  }
  horse.add(at(caps(0.045, 0.22, '#7a4a26'), -0.38, 0.5, 0, 0, 0, 0.9));
  horse.position.set(-6.2, 0, -8.8);
  horse.rotation.y = -0.5;
  g.add(horse);
  dynamic.push(horse);
  bakePart(horse);
  out.horse = horse;
  colliders.push({ type: 'circle', x: -6.2, z: -8.8, r: 0.45, h: 0.62 });
  const blocks = ['#ef5b6f', '#ffd166', '#3f7bf0', '#3fbf7f', '#c7a6ff'];
  for (let i = 0; i < 9; i++) add(at(box(0.18, 0.18, 0.18, blocks[i % 5]), -8.4 + (i % 3) * 0.22, 0.09 + Math.floor(i / 6) * 0.18, -7.2 + Math.floor((i % 6) / 3) * 0.22, 0, i * 0.3, 0));
  add(at(rbox(1.0, 0.55, 0.6, '#3f7bf0', 0.05), -13.2, 0.28, ZB + 0.55));
  add(at(box(1.02, 0.08, 0.62, '#ffd166'), -13.2, 0.58, ZB + 0.55));
  add(at(sph(0.12, '#ef5b6f', 10, 6), -13.4, 0.72, ZB + 0.55));
  add(at(sc(sph(0.15, '#c8875a', 10, 8), 1, 1.1, 0.9), -13.0, 0.76, ZB + 0.5));
  colliders.push({ type: 'box', x: -13.2, z: ZB + 0.55, hw: 0.5, hd: 0.3, h: 0.62 });
  sideWindow(g, atlas, cells.window, X0 + T / 2 + 0.02, -6.6, 1);
  // Sultan's ball
  const ball = new THREE.Group();
  ball.add(sph(0.16, '#ef5b6f', 14, 10));
  ball.add(at(tor(0.16, 0.02, '#ffffff', 4, 18), 0, 0, 0, P / 2, 0, 0));
  ball.add(at(tor(0.16, 0.02, '#ffd166', 4, 18), 0, 0, 0, 0, 0, 0));
  bakePart(ball);
  ball.position.set(-8.4, 0.16, -5.4);
  g.add(ball);
  dynamic.push(ball);
  out.ball = ball;

  // ---------------------------------------------------------------- inner courtyard
  // A fountain in the middle with water that sparkles, a lemon tree, jasmine, a bench
  const fx = -0.5;
  const fz = -6.6;
  const ftn = new THREE.Group();
  const oct = new THREE.CylinderGeometry(1.0, 1.05, 0.5, 8);
  ftn.add(at(mesh(oct, mat('#f4e7cf', { rough: 0.8 })), 0, 0.25, 0));
  ftn.add(at(mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.08, 8), mat(C.stoneEdge)), 0, 0.52, 0));
  ftn.add(at(mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.02, 8), mat('#6fc8e6', { rough: 0.15 })), 0, 0.46, 0));
  ftn.add(at(cyl(0.12, 0.16, 0.6, '#f4e7cf', 10), 0, 0.75, 0));
  ftn.add(at(sc(sph(0.32, '#f4e7cf', 12, 6), 1, 0.35, 1), 0, 1.06, 0));
  ftn.add(at(sph(0.08, '#2f86c8', 8, 6), 0, 1.18, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * P * 2 + P / 8;
    ftn.add(at(box(0.3, 0.2, 0.02, '#2f86c8'), Math.sin(a) * 0.99, 0.28, Math.cos(a) * 0.99, 0, a, 0));
  }
  ftn.position.set(fx, 0, fz);
  g.add(ftn);
  colliders.push({ type: 'circle', x: fx, z: fz, r: 1.02, h: 0.56 });
  out.fountain = { x: fx, z: fz };
  const jets = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 4), mat('#bfe9ff', { rough: 0.2 }), 12);
  jets.position.set(fx, 0, fz);
  jets.frustumCulled = false;
  g.add(jets);
  dynamic.push(jets);
  out.jets = jets;
  // Lemon tree in a pot, jasmine on the back wall, a bench, potted geraniums
  const lem = new THREE.Group();
  lem.add(at(cyl(0.4, 0.3, 0.6, C.terra, 14), 0, 0.3, 0));
  lem.add(at(cyl(0.06, 0.08, 0.9, '#7d6a52', 8), 0, 1.0, 0));
  for (const [bx, by, bz, br] of [[0, 1.75, 0, 0.55], [0.32, 1.55, 0.1, 0.38], [-0.3, 1.6, 0, 0.4]]) lem.add(at(sph(br, '#3f8f4e', 10, 8), bx, by, bz));
  const rr = rng(77);
  for (let i = 0; i < 9; i++) {
    const a = rr() * P * 2;
    lem.add(at(sc(sph(0.065, C.lemon, 8, 6), 1, 1.2, 1), Math.sin(a) * 0.48, 1.4 + rr() * 0.5, Math.cos(a) * 0.48));
  }
  lem.position.set(2.75, 0, ZB + 0.75);
  g.add(lem);
  colliders.push({ type: 'circle', x: 2.75, z: ZB + 0.75, r: 0.42, h: 0.6 });
  for (let i = 0; i < 14; i++) {
    const x = XA + 0.4 + i * 0.5;
    add(at(sph(0.17, i % 2 ? '#4f9a55' : '#6fb85f', 7, 4), x, 2.1 + Math.sin(i * 1.7) * 0.18, ZB + T / 2 + 0.1));
    add(at(sph(0.035, '#ffffff', 4, 3), x + 0.08, 2.0 + Math.cos(i) * 0.2, ZB + T / 2 + 0.22));
    if (i % 3 === 0) add(at(cyl(0.02, 0.02, 1.0, '#5c8a3a', 4), x, 1.5, ZB + T / 2 + 0.08));
  }
  const bench = new THREE.Group();
  bench.add(at(rbox(1.7, 0.1, 0.5, C.wood, 0.03), 0, 0.44, 0));
  for (const s of [1, -1]) bench.add(at(box(0.1, 0.44, 0.42, C.woodDark), s * 0.75, 0.22, 0));
  bench.add(at(rbox(1.7, 0.45, 0.08, C.wood, 0.03), 0, 0.74, -0.22));
  bench.add(at(rbox(0.7, 0.08, 0.42, '#c0392b', 0.04), -0.4, 0.52, 0.02));
  bench.add(at(rbox(0.7, 0.08, 0.42, '#2b4a6e', 0.04), 0.4, 0.52, 0.02));
  bench.position.set(-2.6, 0, ZB + 0.55);
  g.add(bench);
  out.bench = { x: -2.6, z: ZB + 0.6, y: 0.56 };
  colliders.push({ type: 'box', x: -2.6, z: ZB + 0.55, hw: 0.85, hd: 0.27, h: 0.56 });
  // The family album on the bench
  const album = new THREE.Group();
  album.add(at(rbox(0.36, 0.06, 0.28, '#7a2e3a', 0.02), 0, 0, 0));
  album.add(at(box(0.33, 0.062, 0.25, '#fffaf4'), 0.01, 0, 0));
  album.add(at(box(0.08, 0.065, 0.08, C.gold), -0.08, 0.002, 0));
  bakePart(album);
  album.position.set(-2.1, 0.59, ZB + 0.62);
  g.add(album);
  dynamic.push(album);
  out.album = album;
  // A bird cage with Hanan's canary
  const cage = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * P * 2;
    cage.add(at(cyl(0.006, 0.006, 0.42, C.gold, 3), Math.sin(a) * 0.17, 0.21, Math.cos(a) * 0.17));
  }
  cage.add(at(cyl(0.19, 0.19, 0.03, C.gold, 12), 0, 0, 0));
  cage.add(at(sc(sph(0.19, C.gold, 12, 4), 1, 0.4, 1), 0, 0.42, 0));
  cage.add(at(cyl(0.004, 0.004, 0.5, '#3b2b3f', 3), 0, 0.75, 0));
  cage.position.set(0.9, 1.6, ZB + 0.45);
  g.add(cage);
  const bird = new THREE.Group();
  bird.add(at(sc(sph(0.06, '#ffe14d', 10, 6), 1.2, 1, 1), 0, 0, 0));
  bird.add(at(sph(0.04, '#ffe14d', 8, 6), 0.05, 0.05, 0));
  bird.add(at(cone(0.012, 0.03, '#f59f3a', 4), 0.09, 0.05, 0, 0, 0, -P / 2));
  bird.add(at(sph(0.008, '#1d130f', 4, 3), 0.07, 0.065, 0.025));
  bakePart(bird);
  bird.position.set(0.9, 1.75, ZB + 0.45);
  g.add(bird);
  dynamic.push(bird);
  out.bird = bird;

  // ---------------------------------------------------------------- kitchen
  const tq = '#5fb8b0';
  // Counters along the back wall with a sink, the upper cabinets, spice shelf
  add(at(rbox(7.6, 0.9, 0.66, '#f4f0e8', 0.03), 7.8, 0.45, ZB + 0.42));
  add(at(box(7.7, 0.06, 0.7, '#d8c4a4'), 7.8, 0.92, ZB + 0.42));
  for (let i = 0; i < 9; i++) add(at(box(0.78, 0.7, 0.02, tq), 4.4 + i * 0.84, 0.45, ZB + 0.76));
  for (let i = 0; i < 9; i++) add(at(sph(0.025, C.brass, 6, 4), 4.4 + i * 0.84 + 0.28, 0.62, ZB + 0.78));
  add(at(box(0.8, 0.05, 0.46, '#c8ccd0', { rough: 0.3, metal: 0.4 }), 6.2, 0.955, ZB + 0.42));
  add(at(cyl(0.02, 0.02, 0.3, '#c8ccd0', 6), 6.2, 1.1, ZB + 0.2));
  add(at(cyl(0.015, 0.015, 0.16, '#c8ccd0', 6), 6.2, 1.24, ZB + 0.3, P / 2, 0, 0));
  for (let i = 0; i < 6; i++) add(at(rbox(1.2, 0.7, 0.36, tq, 0.03), 4.6 + i * 1.28, 1.95, ZB + 0.27));
  add(at(box(2.4, 0.04, 0.2, C.wood), 10.4, 1.4, ZB + 0.18));
  for (let i = 0; i < 8; i++) add(at(cyl(0.05, 0.05, 0.12, ['#c0392b', '#e7b54a', '#7a4a26', '#3f8f4e'][i % 4], 8), 9.4 + i * 0.28, 1.48, ZB + 0.18));
  colliders.push({ type: 'box', x: 7.8, z: ZB + 0.42, hw: 3.85, hd: 0.36, h: 0.95 });
  // A window over the sink, garlic and pans on hooks
  backWindow(g, atlas, cells.window, 6.2, 1.62, ZB + T / 2 + 0.02, 1.1, 0.7);
  for (let i = 0; i < 5; i++) add(at(sph(0.06, '#f4f0e8', 8, 6), 12.2, 1.9 - i * 0.1, ZB + 0.15));
  // The fridge, with Roji's old school drawing and a sticky note (easter eggs)
  add(at(rbox(1.0, 1.95, 0.75, '#f6f2ec', 0.06), 13.25, 0.975, ZB + 0.5));
  add(at(box(0.04, 0.5, 0.05, '#c8ccd0'), 12.85, 1.2, ZB + 0.9));
  add(at(box(0.96, 0.02, 0.02, '#e0dbd2'), 13.25, 1.35, ZB + 0.88));
  decal(cells.drawing, 0.6, 0.45, 13.3, 1.05, ZB + 0.885);
  decal(cells.note, 0.22, 0.22, 13.45, 1.6, ZB + 0.885, 0.06);
  decal(cells.note2, 0.22, 0.22, 13.05, 1.66, ZB + 0.885, -0.08);
  for (const [x, y, col] of [[13.05, 1.27, '#ef5b6f'], [13.55, 1.27, '#3f7bf0'], [13.3, 1.78, '#ffd166']]) add(at(sph(0.03, col, 8, 6), x, y, ZB + 0.9));
  colliders.push({ type: 'box', x: 13.25, z: ZB + 0.5, hw: 0.52, hd: 0.4 });
  out.fridge = { x: 13.25, z: ZB + 1.4 };
  // The island with the stove; Hanan cooks behind it, facing the room
  const isl = { x: 8.6, z: -6.0 };
  add(at(rbox(2.8, 0.9, 1.1, '#f4f0e8', 0.03), isl.x, 0.45, isl.z));
  add(at(box(2.9, 0.06, 1.16, '#d8c4a4'), isl.x, 0.92, isl.z));
  for (let i = 0; i < 3; i++) add(at(box(0.86, 0.7, 0.02, tq), isl.x - 0.92 + i * 0.92, 0.45, isl.z + 0.56));
  for (const dx of [-0.55, 0.35]) {
    add(at(cyl(0.2, 0.2, 0.02, '#3b3b44', 14), isl.x + dx, 0.96, isl.z - 0.1));
    add(at(tor(0.12, 0.015, '#8a8a8a', 4, 12), isl.x + dx, 0.975, isl.z - 0.1, P / 2, 0, 0));
  }
  colliders.push({ type: 'box', x: isl.x, z: isl.z, hw: 1.45, hd: 0.58, h: 0.95 });
  out.island = { ...isl, y: 0.95 };
  // The big pot (maqluba) and a tray; the pot flips, the dish comes out
  const potG = new THREE.Group();
  const potM = mat('#6a6f78', { rough: 0.35, metal: 0.5 });
  potG.add(at(mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.36, 18, 1, true), mat('#6a6f78', { rough: 0.35, metal: 0.5, side: THREE.DoubleSide })), 0, 0.18, 0));
  potG.add(at(cyl(0.24, 0.24, 0.02, potM, 18), 0, 0.01, 0));
  for (const s of [1, -1]) potG.add(at(tor(0.05, 0.015, '#3b3b44', 4, 8), s * 0.28, 0.3, 0, 0, P / 2, 0));
  potG.add(at(cyl(0.25, 0.25, 0.04, '#e8c27a', 18), 0, 0.3, 0));
  bakePart(potG);
  const potPivot = new THREE.Group();
  potPivot.position.set(isl.x - 0.55, 0.98, isl.z - 0.1);
  potPivot.add(potG);
  g.add(potPivot);
  dynamic.push(potPivot);
  out.pot = { pivot: potPivot, pot: potG };
  out.maqluba = makeMaqluba();
  out.maqluba.visible = false;
  g.add(out.maqluba);
  dynamic.push(out.maqluba);
  // Grape leaves on a tray (rolled ones appear as you roll)
  const leaves = new THREE.Group();
  leaves.add(at(cyl(0.32, 0.32, 0.02, C.brass, 18), 0, 0, 0));
  leaves.position.set(isl.x + 0.75, 0.97, isl.z + 0.2);
  g.add(leaves);
  dynamic.push(leaves);
  out.leaves = leaves;
  // A little breakfast table with two chairs by the window
  add(at(cyl(0.45, 0.45, 0.05, C.woodLight, 18), 5.0, 0.74, -4.4));
  add(at(cyl(0.06, 0.12, 0.72, C.woodDark, 8), 5.0, 0.36, -4.4));
  for (const s of [1, -1]) {
    add(at(rbox(0.4, 0.06, 0.4, C.wood, 0.02), 5.0 + s * 0.72, 0.45, -4.4));
    add(at(box(0.04, 0.45, 0.36, C.wood), 5.0 + s * 0.92, 0.7, -4.4));
    for (const [lx, lz] of [[0.16, 0.16], [-0.16, 0.16], [0.16, -0.16], [-0.16, -0.16]]) add(at(box(0.04, 0.45, 0.04, C.woodDark), 5.0 + s * 0.72 + lx, 0.22, -4.4 + lz));
    colliders.push({ type: 'box', x: 5.0 + s * 0.74, z: -4.4, hw: 0.22, hd: 0.2, h: 0.48 });
  }
  add(at(cyl(0.1, 0.07, 0.12, '#fffaf4', 12), 4.85, 0.82, -4.3));
  add(at(sc(sph(0.12, '#e7b54a', 10, 6), 1.3, 0.4, 1), 5.15, 0.8, -4.5));
  colliders.push({ type: 'circle', x: 5.0, z: -4.4, r: 0.48, h: 0.77 });
  // Big jar of olives and a sack of rice
  add(at(mesh(new THREE.LatheGeometry([[0, 0], [0.16, 0.02], [0.24, 0.2], [0.22, 0.45], [0.12, 0.6], [0.13, 0.66], [0, 0.66]].map(([a, b]) => new THREE.Vector2(a, b)), 14), mat(C.terra)), 13.4, 0, -4.0));
  add(at(rbox(0.5, 0.6, 0.4, '#e8dcc4', 0.12), 13.3, 0.3, -5.0));
  colliders.push({ type: 'circle', x: 13.4, z: -4.0, r: 0.26 }, { type: 'box', x: 13.3, z: -5.0, hw: 0.26, hd: 0.22, h: 0.6 });

  // Windows on the back wall (one each for the play room and the courtyard)
  backWindow(g, atlas, cells.window, -11.2, 1.55, ZB + T / 2 + 0.02, 1.0, 0.9, '#ffc4cf');
  backWindow(g, atlas, cells.window, -7.6, 1.55, ZB + T / 2 + 0.02, 1.0, 0.9, '#ffc4cf');
  atlas.done();
  return out;
}

function sideWindow(g, atlas, cell, x, z, side) {
  const grp = new THREE.Group();
  backWindow(grp, atlas, cell, 0, 1.55, 0, 1.0, 1.0, '#ffd166');
  grp.position.set(x, 0, z);
  grp.rotation.y = (side * P) / 2;
  g.add(grp);
}

function backWindow(g, atlas, sky, x, y, z, w, h, curtain) {
  g.add(at(box(w + 0.18, h + 0.18, 0.06, '#ffffff'), x, y, z + 0.03));
  const glass = mesh(new THREE.PlaneGeometry(w, h), sky, { cast: false });
  glass.position.set(x, y, z + 0.065);
  g.add(glass);
  g.add(at(box(0.05, h, 0.03, '#ffffff'), x, y, z + 0.08));
  g.add(at(box(w + 0.3, 0.06, 0.14, '#ffffff'), x, y - h / 2 - 0.08, z + 0.08));
  if (curtain) {
    g.add(at(box(w + 0.8, 0.04, 0.04, '#c9a27a'), x, y + h / 2 + 0.2, z + 0.16));
    for (const s of [-1, 1]) g.add(at(rbox(0.28, h + 0.4, 0.06, curtain, 0.03), x + s * (w / 2 + 0.16), y - 0.02, z + 0.18));
  }
}

function makeMaqluba() {
  const m = new THREE.Group();
  m.add(at(cyl(0.34, 0.34, 0.03, '#f4f0e8', 20), 0, 0.015, 0));
  const dome = mesh(new THREE.SphereGeometry(0.25, 18, 8, 0, P * 2, 0, P / 2), mat('#f2d28a'));
  dome.scale.y = 0.9;
  m.add(at(dome, 0, 0.03, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * P * 2;
    m.add(at(sc(sph(0.07, '#5b3a6a', 8, 6), 1, 0.4, 0.7), Math.sin(a) * 0.2, 0.12, Math.cos(a) * 0.2, 0, a, 0.9));
  }
  for (let i = 0; i < 10; i++) m.add(at(sph(0.022, i % 2 ? '#f6e7c8' : '#3f8f4e', 5, 4), Math.sin(i * 2.1) * 0.12, 0.25, Math.cos(i * 2.1) * 0.12));
  bakePart(m);
  return m;
}

// ---------------------------------------------------------------- atlas drawings
function drawRug(c, w, h, base, edge, motif) {
  c.fillStyle = edge;
  c.fillRect(0, 0, w, h);
  c.fillStyle = base;
  c.fillRect(16, 16, w - 32, h - 32);
  c.strokeStyle = edge;
  c.lineWidth = 6;
  c.strokeRect(34, 34, w - 68, h - 68);
  c.fillStyle = motif;
  c.beginPath();
  c.moveTo(w / 2, h * 0.22);
  c.lineTo(w * 0.72, h / 2);
  c.lineTo(w / 2, h * 0.78);
  c.lineTo(w * 0.28, h / 2);
  c.closePath();
  c.fill();
  c.fillStyle = edge;
  c.beginPath();
  c.moveTo(w / 2, h * 0.34);
  c.lineTo(w * 0.62, h / 2);
  c.lineTo(w / 2, h * 0.66);
  c.lineTo(w * 0.38, h / 2);
  c.closePath();
  c.fill();
  c.fillStyle = motif;
  for (const [x, y] of [[0.16, 0.2], [0.84, 0.2], [0.16, 0.8], [0.84, 0.8]]) {
    c.beginPath();
    c.arc(w * x, h * y, 18, 0, P * 2);
    c.fill();
  }
  c.fillStyle = edge;
  for (let x = 20; x < w - 10; x += 14) {
    c.fillRect(x, 0, 4, 10);
    c.fillRect(x, h - 10, 4, 10);
  }
}

function drawPlayRug(c, w, h) {
  c.fillStyle = '#8fd18a';
  c.fillRect(0, 0, w, h);
  c.strokeStyle = '#6a6f78';
  c.lineWidth = 46;
  c.lineJoin = 'round';
  c.strokeRect(70, 70, w - 140, h - 140);
  c.strokeStyle = '#ffffff';
  c.lineWidth = 4;
  c.setLineDash([16, 14]);
  c.strokeRect(70, 70, w - 140, h - 140);
  c.setLineDash([]);
  c.fillStyle = '#3f7bf0';
  c.beginPath();
  c.ellipse(w / 2, h / 2, 60, 36, 0, 0, P * 2);
  c.fill();
  for (const [x, y, col] of [[130, 160, '#ef5b6f'], [380, 220, '#ffd166'], [200, 250, '#ffffff']]) {
    c.fillStyle = col;
    c.fillRect(x, y, 34, 30);
    c.fillStyle = '#e5484d';
    c.beginPath();
    c.moveTo(x - 4, y);
    c.lineTo(x + 17, y - 18);
    c.lineTo(x + 38, y);
    c.fill();
  }
}

function drawRunner(c, w, h) {
  c.fillStyle = '#e7b54a';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#7a2e3a';
  c.fillRect(8, 8, w - 16, h - 16);
  c.fillStyle = '#e7b54a';
  for (let x = 40; x < w - 30; x += 70) {
    c.beginPath();
    c.moveTo(x, h / 2);
    c.lineTo(x + 18, h / 2 - 22);
    c.lineTo(x + 36, h / 2);
    c.lineTo(x + 18, h / 2 + 22);
    c.closePath();
    c.fill();
  }
}

function drawMarks(c, w, h) {
  c.fillStyle = '#c99a6b';
  c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(120,70,30,0.15)';
  for (let y = 0; y < h; y += 23) c.fillRect(0, y, w, 2);
  // Pencil marks from the floor up (1.6 m tall strip): name and age
  const marks = [
    [0.5, 'Sultan 2', '#3f7bf0'],
    [0.7, 'Roji 3', '#e5484d'],
    [0.92, 'Roji 5', '#e5484d'],
    [1.05, 'Basem 8', '#2c3e66'],
    [1.18, 'Roji 8', '#e5484d'],
    [1.36, 'Roji 12', '#e5484d'],
  ];
  c.font = `700 15px ${FONT}`;
  c.textAlign = 'left';
  for (const [m, txt, col] of marks) {
    const y = h - (m / 1.6) * h;
    c.strokeStyle = col;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(4, y);
    c.lineTo(w - 4, y);
    c.stroke();
    c.fillStyle = col;
    c.fillText(txt, 6, y - 5);
  }
  c.fillStyle = '#e5484d';
  c.beginPath();
  const hx = w / 2;
  const hy = h - (1.48 / 1.6) * h;
  c.moveTo(hx, hy + 8);
  c.bezierCurveTo(hx - 12, hy, hx - 6, hy - 8, hx, hy - 2);
  c.bezierCurveTo(hx + 6, hy - 8, hx + 12, hy, hx, hy + 8);
  c.fill();
}

function drawNote(c, w, h, lines, col, heart = false) {
  c.fillStyle = col;
  c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(0,0,0,0.06)';
  c.fillRect(0, h - 14, w, 14);
  c.fillStyle = '#3b2b3f';
  c.font = `600 19px ${FONT}`;
  c.textAlign = 'center';
  lines.forEach((l, i) => c.fillText(l, w / 2, 28 + i * 24));
  if (heart) {
    c.fillStyle = '#e5484d';
    c.beginPath();
    c.moveTo(w / 2, 118);
    c.bezierCurveTo(w / 2 - 16, 104, w / 2 - 8, 94, w / 2, 102);
    c.bezierCurveTo(w / 2 + 8, 94, w / 2 + 16, 104, w / 2, 118);
    c.fill();
  }
}

function drawPainting(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#ffcf9a');
  g.addColorStop(1, '#ffe8c4');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#f2c46b';
  c.beginPath();
  c.arc(w * 0.75, h * 0.3, 20, 0, P * 2);
  c.fill();
  c.fillStyle = '#e8b770';
  c.beginPath();
  c.moveTo(0, h);
  c.quadraticCurveTo(w * 0.3, h * 0.35, w * 0.6, h * 0.7);
  c.quadraticCurveTo(w * 0.8, h * 0.55, w, h * 0.75);
  c.lineTo(w, h);
  c.fill();
  c.fillStyle = '#f4e7cf';
  c.fillRect(w * 0.26, h * 0.46, 40, 26);
  c.fillStyle = '#2f86c8';
  c.fillRect(w * 0.26 + 16, h * 0.46 + 10, 8, 16);
  c.fillStyle = '#6b4a30';
  c.fillRect(w * 0.12, h * 0.5, 4, 40);
  c.fillStyle = '#4f9a55';
  for (let i = 0; i < 5; i++) {
    c.beginPath();
    c.ellipse(w * 0.12 + Math.cos(i * 1.2) * 12, h * 0.5 + Math.sin(i * 1.2) * 4, 14, 4, i * 1.2, 0, P * 2);
    c.fill();
  }
}

function drawSkyWindow(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#8fd0ea');
  g.addColorStop(1, '#e8f7ff');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.ellipse(40, 50, 26, 11, 0, 0, P * 2);
  c.ellipse(60, 46, 20, 13, 0, 0, P * 2);
  c.fill();
  c.fillStyle = '#e9c98a';
  c.beginPath();
  c.moveTo(0, h);
  c.quadraticCurveTo(w * 0.5, h * 0.72, w, h * 0.86);
  c.lineTo(w, h);
  c.fill();
  c.fillStyle = '#4f9a55';
  c.fillRect(w * 0.75, h * 0.62, 4, 30);
  c.beginPath();
  c.ellipse(w * 0.75 + 2, h * 0.6, 16, 6, 0, 0, P * 2);
  c.fill();
}

function drawClock(c, w, h) {
  c.fillStyle = '#c99a6b';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#fffaf4';
  c.beginPath();
  c.arc(w / 2, h / 2, w * 0.42, 0, P * 2);
  c.fill();
  c.strokeStyle = '#7d5234';
  c.lineWidth = 6;
  c.stroke();
  c.fillStyle = '#3b2b3f';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * P * 2;
    c.beginPath();
    c.arc(w / 2 + Math.sin(a) * w * 0.34, h / 2 - Math.cos(a) * h * 0.34, 3, 0, P * 2);
    c.fill();
  }
  c.strokeStyle = '#3b2b3f';
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(w / 2, h / 2);
  c.lineTo(w / 2 + 18, h / 2 - 22);
  c.moveTo(w / 2, h / 2);
  c.lineTo(w / 2 - 30, h / 2 + 6);
  c.stroke();
}
