import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { C, emblem, drawBoard, plant, chair, hospitalBed, bouquet, skyTexture, windowMesh, colorBake, makeTool } from '../../places/hospital/models.js';
import { canvasTexture, roundRect, FONT, bakeStatic } from '../../util.js';
import * as M from './models.js';

// The four rooms of Dr. Roji's Shift, side by side along X (only the current one is shown):
// reception (triage), the exam room, the surgery theatre and the recovery room.
// Each room: { id, name, group, x, view: { look, w, h }, spots: {...}, update?(dt, t) }.
// Spots are world positions; the front of every room faces +Z (the camera side).

export const GAP = 16;
const W = 10;
const BACK = -3.7;

function floorTex(a, b, n = 4) {
  return canvasTexture(256, 256, (c, w) => {
    c.fillStyle = a;
    c.fillRect(0, 0, w, w);
    c.fillStyle = b;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % 2) c.fillRect((i * w) / n, (j * w) / n, w / n, w / n);
    c.strokeStyle = 'rgba(255,255,255,0.5)';
    c.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
      c.beginPath();
      c.moveTo((i * w) / n, 0);
      c.lineTo((i * w) / n, w);
      c.moveTo(0, (i * w) / n);
      c.lineTo(w, (i * w) / n);
      c.stroke();
    }
  });
}

function planks() {
  return canvasTexture(256, 256, (c, w) => {
    const cols = ['#e9c49a', '#e2b98c', '#edcba4', '#dfb486'];
    for (let i = 0; i < 8; i++) {
      c.fillStyle = cols[i % 4];
      c.fillRect(0, (i * w) / 8, w, w / 8);
      c.fillStyle = 'rgba(120,70,30,0.18)';
      c.fillRect(0, ((i + 1) * w) / 8 - 2, w, 2);
      c.fillRect(((i * 37) % 8) * 32, (i * w) / 8, 2, w / 8);
    }
  });
}

// Wallpaper with a repeated little motif: 'plus', 'heart', 'dots', 'tiles'.
function paper(base, ink, motif) {
  return canvasTexture(128, 128, (c, w) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, w);
    c.fillStyle = ink;
    c.strokeStyle = ink;
    if (motif === 'tiles') {
      c.lineWidth = 3;
      for (let i = 0; i <= 4; i++) {
        c.beginPath();
        c.moveTo((i * w) / 4, 0);
        c.lineTo((i * w) / 4, w);
        c.moveTo(0, (i * w) / 4);
        c.lineTo(w, (i * w) / 4);
        c.stroke();
      }
      return;
    }
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        const x = (i + 0.5 + (j % 2) * 0.5) * (w / 3);
        const y = (j + 0.5) * (w / 3);
        if (motif === 'plus') {
          c.fillRect(x - 9, y - 3, 18, 6);
          c.fillRect(x - 3, y - 9, 6, 18);
        } else if (motif === 'heart') {
          c.beginPath();
          c.moveTo(x, y + 6);
          c.bezierCurveTo(x - 12, y - 2, x - 6, y - 12, x, y - 5);
          c.bezierCurveTo(x + 6, y - 12, x + 12, y - 2, x, y + 6);
          c.fill();
        } else {
          c.beginPath();
          c.arc(x, y, 5, 0, Math.PI * 2);
          c.fill();
        }
      }
  });
}

// Floor, back wall, side walls and trims in a room group.
function shell(k, util, group, { floor, wall, side, trim = C.white, repeat = [6, 5] }) {
  floor.wrapS = floor.wrapT = THREE.RepeatWrapping;
  floor.repeat.set(repeat[0], repeat[1]);
  const f = util.mesh(new THREE.BoxGeometry(W, 0.1, 8), new THREE.MeshStandardMaterial({ map: floor, roughness: 0.85 }), { cast: false });
  k.at(f, 0, -0.05, -0.2);
  wall.wrapS = wall.wrapT = THREE.RepeatWrapping;
  wall.repeat.set(6, 2.5);
  const b = util.mesh(new THREE.BoxGeometry(W, 3.6, 0.2), new THREE.MeshStandardMaterial({ map: wall, roughness: 0.9 }));
  k.at(b, 0, 1.8, BACK);
  group.add(f, b);
  group.add(k.at(k.box(W, 0.2, 0.06, trim), 0, 0.1, BACK + 0.12));
  group.add(k.at(k.box(W, 0.08, 0.05, trim), 0, 1.1, BACK + 0.12));
  for (const s of [-1, 1]) group.add(k.at(k.box(0.2, 3.6, 7.2, side), s * (W / 2), 1.8, -0.3));
}

// Builds every room. ctx: the arena ctx. k: the hospital kit. o: { gold, rainbow, heartLamp, plaque }.
export function buildRooms(ctx, k, o = {}) {
  const { util } = ctx;
  const { box, rbox, cyl, sph, at } = k;
  const sky = new THREE.MeshBasicMaterial({ map: skyTexture() });
  const rooms = {};
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------------------------------------------------------------- reception (triage)
  {
    const g = new THREE.Group();
    const X = 0;
    g.position.x = X;
    shell(k, util, g, { floor: floorTex('#fff4e6', '#ffe3cc'), wall: paper('#fff0e4', '#ffd9c7', 'heart'), side: '#ffe9da' });
    const keep = [];
    // Sign over the desk and the emblem
    const signP = k.panel(2.4, 0.62, 512, (c, w, h) => drawBoard(c, w, h, { lines: ['Welcome to', 'Sunny Hill Hospital'], edge: C.mintDeep }));
    g.add(at(signP, 2.7, 2.75, BACK + 0.13));
    g.add(at(emblem(k, 0.36), 1.1, 2.75, BACK + 0.15));
    // Entrance doors on the back wall (left)
    g.add(at(rbox(1.7, 2.3, 0.12, C.white, 0.04), -3.9, 1.15, BACK + 0.1));
    for (const s of [-1, 1]) {
      g.add(at(box(0.74, 2.05, 0.04, '#bfe6f5'), -3.9 + s * 0.39, 1.06, BACK + 0.17));
      g.add(at(box(0.05, 0.4, 0.05, C.steel), -3.9 + s * 0.12, 1.1, BACK + 0.21));
    }
    const ent = k.panel(1.2, 0.3, 256, (c, w, h) => drawBoard(c, w, h, { lines: ['Entrance'], edge: C.coral }));
    g.add(at(ent, -3.9, 2.52, BACK + 0.13));
    // Triage board: what the colours mean
    const board = k.panel(1.5, 1.1, 512, (c, w, h) => {
      c.fillStyle = '#ffffff';
      roundRect(c, 0, 0, w, h, 34);
      c.fill();
      c.strokeStyle = C.mintDeep;
      c.lineWidth = 12;
      c.stroke();
      c.fillStyle = C.ink;
      c.textAlign = 'center';
      c.font = `700 ${h * 0.13}px ${FONT}`;
      c.fillText('Who is next?', w / 2, h * 0.17);
      const rows = [['#ef5b6f', 'Red: right now'], ['#ffa93a', 'Orange: soon'], ['#6cc24a', 'Green: can wait']];
      rows.forEach(([col, t], i) => {
        const y = h * (0.36 + i * 0.22);
        c.fillStyle = col;
        roundRect(c, w * 0.1, y - h * 0.07, w * 0.16, h * 0.14, 16);
        c.fill();
        c.fillStyle = C.ink;
        c.textAlign = 'left';
        c.font = `600 ${h * 0.1}px ${FONT}`;
        c.fillText(t, w * 0.31, y + h * 0.035);
      });
    });
    g.add(at(board, -1.7, 2.15, BACK + 0.12));
    // Window
    g.add(at(windowMesh(k, sky, { w: 1.1, h: 0.9, curtain: C.peach }), 0.15, 2.1, BACK + 0.15));
    // Reception desk with a computer, a bell and flowers
    g.add(at(rbox(2.4, 1.0, 0.8, C.mint, 0.08), 2.9, 0.5, -2.35));
    g.add(at(rbox(2.56, 0.08, 0.96, C.white, 0.04), 2.9, 1.04, -2.35));
    g.add(at(rbox(2.2, 0.32, 0.04, C.mintDeep, 0.02), 2.9, 0.62, -1.93));
    g.add(at(k.heart(0.16, 0.04, C.white), 2.9, 0.62, -1.9));
    g.add(at(rbox(0.5, 0.34, 0.05, C.ink, 0.03), 3.5, 1.32, -2.55));
    g.add(at(box(0.44, 0.27, 0.01, '#bff0e2'), 3.5, 1.33, -2.52));
    g.add(at(cyl(0.04, 0.08, 0.14, C.ink, 8), 3.5, 1.12, -2.58));
    g.add(at(cyl(0.07, 0.08, 0.03, C.sun, 14), 2.2, 1.1, -2.2));
    g.add(at(sph(0.05, C.sun, { metal: 0.4, rough: 0.3 }, 10), 2.2, 1.13, -2.2));
    g.add(at(bouquet(k, { scale: 0.9 }), 2.6, 1.08, -2.5));
    // Staff locker by the right wall with Homama's sticky note and Roji's name
    const lockG = new THREE.Group();
    lockG.add(M.locker(k, '#9fe0c8'));
    const nt = M.note(k, ['My favourite', 'doctor'], { w: 0.34, h: 0.34 });
    nt.rotation.z = 0.08;
    at(nt, -0.03, 1.3, 0.285);
    nt.visible = !!o.note;
    lockG.add(nt);
    const nameTag = k.panel(0.36, 0.12, 256, (c, w, h) => drawBoard(c, w, h, { lines: ['Dr. Roji'], edge: C.rose }));
    lockG.add(at(nameTag, 0, 1.72, 0.285));
    at(lockG, 4.6, 0, -0.85);
    lockG.rotation.y = -Math.PI / 2;
    g.add(lockG);
    keep.push(nt);
    // Doctor of the week plaque
    const plaqueSpot = new THREE.Group();
    at(plaqueSpot, 1.55, 1.75, BACK + 0.14);
    g.add(plaqueSpot);
    keep.push(plaqueSpot);
    // Waiting chairs, a toy box and a fish tank
    const seats = [-3.65, -2.45, -1.25, -0.05];
    for (const x of seats) g.add(at(chair(k, { color: [C.pink, C.sun, C.sky, C.lilac][seats.indexOf(x)] }), x, 0, -1.55));
    g.add(at(rbox(0.9, 0.5, 0.5, C.sun, 0.06), -4.4, 0.25, -0.2));
    g.add(at(sph(0.13, C.rose, undefined, 12), -4.55, 0.6, -0.2));
    g.add(at(rbox(0.22, 0.22, 0.22, C.sky, 0.04), -4.25, 0.58, -0.15));
    g.add(at(rbox(1.0, 0.75, 0.45, C.white, 0.05), 0.95, 0.38, -3.35));
    const tank = rbox(0.9, 0.55, 0.4, '#a8dcff', 0.04, { rough: 0.2 });
    g.add(at(tank, 0.95, 1.03, -3.35));
    const fish = [];
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Group();
      const b = sph(0.04, ['#ff8a3d', '#ffd23f', C.pink][i], undefined, 8);
      b.scale.set(1.4, 1, 0.7);
      const tl = cyl(0.001, 0.035, 0.04, ['#ff8a3d', '#ffd23f', C.pink][i], 4);
      tl.rotation.z = Math.PI / 2;
      at(tl, -0.06, 0, 0);
      f.add(b, tl);
      at(f, 0.95, 1.0, -3.13);
      g.add(f);
      keep.push(f);
      fish.push(f);
    }
    g.add(at(plant(k, { scale: 1.2 }), -0.95, 0, -3.25));
    g.add(at(plant(k, { scale: 0.9, pot: C.sun }), 4.45, 0, 1.0));
    colorBake(g, keep);
    bakeStatic(g, keep, mergeGeometries);
    rooms.reception = {
      id: 'reception',
      name: 'Reception',
      group: g,
      x: X,
      view: { look: V(X - 1.0, 1.05, -1.2), w: 8.4, h: 3.6 },
      note: nt,
      plaqueSpot,
      spots: {
        door: V(X - 3.9, 0, BACK + 0.5),
        seats: seats.map((x) => V(X + x, 0, -1.55)),
        roji: V(X + 1.35, 0, -0.55),
        maya: V(X + 2.9, 0, -3.05),
        locker: V(X + 4.3, 1.25, -0.85),
        homama: V(X + 2.3, 0, 0.2),
      },
      update(dt, t) {
        fish.forEach((f, i) => {
          const a = t * (0.5 + i * 0.17) + i * 2;
          f.position.x = 0.95 + Math.sin(a) * 0.32;
          f.position.y = 0.95 + i * 0.09 + Math.sin(a * 1.7) * 0.02;
          f.rotation.y = Math.cos(a) > 0 ? 0 : Math.PI;
        });
      },
    };
  }

  // ---------------------------------------------------------------- exam room
  {
    const g = new THREE.Group();
    const X = GAP;
    g.position.x = X;
    shell(k, util, g, { floor: floorTex('#f2fbf7', '#d3f1e5'), wall: paper('#e6f6f0', '#cbeee0', 'plus'), side: '#f7ece0' });
    const keep = [];
    g.add(at(windowMesh(k, sky, { w: 1.1, h: 0.9, curtain: C.pink }), 3.6, 2.15, BACK + 0.15));
    g.add(at(emblem(k, 0.42), -1.2, 2.6, BACK + 0.15));
    const chart = k.panel(0.62, 0.9, 256, (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = C.mintDeep;
      c.lineWidth = 10;
      c.strokeRect(5, 5, w - 10, h - 10);
      c.fillStyle = C.ink;
      c.textAlign = 'center';
      ['E', 'F P', 'T O Z', 'L P E D', 'P E C F D'].forEach((r, i) => {
        c.font = `700 ${70 - i * 11}px ${FONT}`;
        c.fillText(r, w / 2, 80 + i * 66);
      });
    });
    g.add(at(chart, -4.2, 2.0, BACK + 0.12));
    // Cabinet with jars
    g.add(at(rbox(1.0, 1.7, 0.5, C.white, 0.05), -3.1, 0.85, BACK + 0.4));
    g.add(at(box(0.86, 0.04, 0.42, C.mint), -3.1, 1.2, BACK + 0.45));
    [C.rose, C.sun, C.sky, C.lilac].forEach((cc, i) => {
      g.add(at(cyl(0.07, 0.07, 0.18, cc, 12), -3.4 + i * 0.2, 1.31, BACK + 0.48));
      g.add(at(cyl(0.075, 0.075, 0.04, C.white, 12), -3.4 + i * 0.2, 1.42, BACK + 0.48));
    });
    g.add(at(rbox(0.5, 0.36, 0.06, C.pink, 0.04), -3.1, 0.55, BACK + 0.66));
    // Two exam beds
    const bed = (x) => {
      g.add(at(rbox(1.9, 0.5, 0.72, C.white, 0.06), x, 0.25, -1.8));
      g.add(at(rbox(2.06, 0.16, 0.84, C.mintDeep, 0.07), x, 0.56, -1.8));
      g.add(at(box(1.5, 0.012, 0.56, '#ffffff'), x + 0.1, 0.645, -1.8));
      g.add(at(rbox(0.5, 0.14, 0.62, C.white, 0.07), x - 0.75, 0.7, -1.8));
      for (const dx of [-0.45, 0.45]) {
        g.add(at(rbox(0.7, 0.16, 0.04, C.mint, 0.02), x + dx, 0.3, -1.43));
        g.add(at(sph(0.025, C.sun, undefined, 8), x + dx, 0.3, -1.4));
      }
    };
    bed(-1.15);
    bed(2.45);
    // Curtain rail between the beds
    g.add(at(rbox(0.12, 1.7, 0.9, C.blush, 0.05), 0.65, 0.95, -2.5));
    // X-ray lightbox
    const lb = M.lightbox(k);
    at(lb, 0.65, 2.45, BACK + 0.16);
    lb.scale.setScalar(0.85);
    g.add(lb);
    keep.push(lb);
    // Tool trolley
    const tr = M.trolley(k);
    tr.scale.setScalar(0.85);
    g.add(at(tr, 0.7, 0, -0.85));
    keep.push(tr);
    const deco = new THREE.Group();
    for (const [id, x, z] of [['stethoscope', -0.25, -0.07], ['thermometer', 0.02, 0.1], ['bandage', 0.25, -0.05]]) {
      const t = makeTool(k, id);
      t.scale.setScalar(1.1);
      deco.add(at(t, x, 0, z));
    }
    at(deco, 0.7, 0.79, -0.85);
    g.add(deco);
    g.add(at(plant(k, { scale: 1.2 }), 4.4, 0, -2.6));
    g.add(at(rbox(1.2, 0.85, 0.55, C.mint, 0.05), 3.85, 0.43, BACK + 0.4));
    g.add(at(rbox(1.3, 0.06, 0.6, C.white, 0.03), 3.85, 0.88, BACK + 0.4));
    g.add(at(M.bottle(k, '#ff8fb1'), 3.5, 0.91, BACK + 0.42));
    g.add(at(M.bottle(k, '#c7a6ff'), 3.75, 0.91, BACK + 0.36));
    for (const o of [lb, deco]) o.traverse((m) => m.isMesh && (m.castShadow = false));
    colorBake(g, keep);
    bakeStatic(g, keep, mergeGeometries);
    rooms.exam = {
      id: 'exam',
      name: 'Exam room',
      group: g,
      x: X,
      lightbox: lb,
      view: { look: V(X + 0.4, 1.15, -1.2), w: 7.2, h: 3.4 },
      spots: {
        bedA: V(X - 1.15, 0, -1.8),
        bedB: V(X + 2.45, 0, -1.8),
        trolley: V(X + 0.7, 0.8, -0.85),
        lightbox: V(X + 0.65, 2.45, BACK + 0.2),
        roji: V(X + 0.35, 0, -1.15),
        homama: V(X + 1.45, 0, -0.4),
        door: V(X - 4.4, 0, 0.6),
      },
    };
  }

  // ---------------------------------------------------------------- theatre
  {
    const g = new THREE.Group();
    const X = GAP * 2;
    g.position.x = X;
    shell(k, util, g, { floor: floorTex('#eef4fa', '#dce8f3', 6), wall: paper('#dff5ee', '#bfe8da', 'tiles'), side: '#d6efe7', trim: '#bfe8da', repeat: [6, 5] });
    const keep = [];
    const table = M.operatingTable(k);
    g.add(at(table, 0, 0, -1.3));
    const lamp = M.theatreLamp(k, { heart: !!o.heartLamp });
    at(lamp, 0.1, 2.55, -1.35);
    g.add(lamp);
    keep.push(lamp);
    const mon = M.monitor(k);
    at(mon, 1.55, 0, -2.45);
    mon.rotation.y = -0.25;
    g.add(mon);
    keep.push(mon);
    g.add(at(M.anaesthesia(k), -1.75, 0, -2.4));
    g.add(at(M.ivStand(k), -2.35, 0, -1.25));
    const tr = M.trolley(k);
    g.add(at(tr, 2.05, 0, -0.55));
    const tools = new THREE.Group();
    const sc = M.scalpel(k);
    tools.add(at(sc, -0.25, 0.02, -0.05));
    const tw = makeTool(k, 'tweezers');
    tools.add(at(tw, 0.05, 0, 0.08));
    if (o.gold) tw.traverse((m) => m.isMesh && m.material.color && (m.material = m.material.clone(), m.material.color.set('#ffcf4d'), m.material.metalness = 0.7));
    const nd = M.needle(k);
    tools.add(at(nd, 0.28, 0.01, -0.06));
    at(tools, 2.05, 0.92, -0.55);
    g.add(tools);
    keep.push(tools);
    const sink = M.scrubSink(k);
    sink.scale.setScalar(0.62);
    g.add(at(sink, -3.7, 0, -2.3));
    const sinkSign = k.panel(1.2, 0.3, 256, (c, w, h) => drawBoard(c, w, h, { lines: ['Scrub in here'], edge: C.mintDeep }));
    g.add(at(sinkSign, -3.7, 2.0, BACK + 0.12));
    // Door with a round window, and a "Theatre" sign
    g.add(at(rbox(1.5, 2.3, 0.12, C.white, 0.04), 3.7, 1.15, BACK + 0.1));
    g.add(at(box(1.3, 2.1, 0.04, '#9fe0c8'), 3.7, 1.06, BACK + 0.17));
    const port = cyl(0.26, 0.26, 0.05, '#cfeeff', 20);
    port.rotation.x = Math.PI / 2;
    g.add(at(port, 3.7, 1.5, BACK + 0.18));
    const ts = k.panel(1.1, 0.3, 256, (c, w, h) => drawBoard(c, w, h, { lines: ['Theatre'], edge: C.rose }));
    g.add(at(ts, 3.7, 2.55, BACK + 0.13));
    const brave = k.panel(1.0, 0.7, 256, (c, w, h) => {
      c.fillStyle = '#fff3d6';
      roundRect(c, 0, 0, w, h, 30);
      c.fill();
      c.strokeStyle = C.sun;
      c.lineWidth = 10;
      c.stroke();
      c.fillStyle = C.rose;
      c.textAlign = 'center';
      c.font = `700 ${h * 0.2}px ${FONT}`;
      c.fillText('Brave', w / 2, h * 0.38);
      c.fillText('patients!', w / 2, h * 0.64);
      c.fillStyle = C.sun;
      for (let i = 0; i < 5; i++) {
        c.beginPath();
        c.arc(w * (0.15 + i * 0.175), h * 0.85, 9, 0, Math.PI * 2);
        c.fill();
      }
    });
    g.add(at(brave, 0.2, 2.25, BACK + 0.12));
    // A soft red emergency light over the door (flashes when the siren goes)
    const alarm = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#ff9aa6', emissive: '#ff3b4f', emissiveIntensity: 0.1, roughness: 0.4 }));
    g.add(at(alarm, 3.7, 2.85, BACK + 0.2));
    keep.push(alarm);
    // The lamp, the monitor and the little tools are kept separate (they move or glow): no shadows from them
    for (const o of [lamp, mon, tools]) o.traverse((m) => m.isMesh && (m.castShadow = false));
    colorBake(g, keep);
    bakeStatic(g, keep, mergeGeometries);
    rooms.theatre = {
      id: 'theatre',
      name: 'Surgery theatre',
      group: g,
      x: X,
      lamp,
      monitor: mon,
      alarm,
      tools: { group: tools, scalpel: sc, tweezers: tw, needle: nd },
      view: { look: V(X + 0.0, 1.2, -1.3), w: 7.0, h: 3.4 },
      spots: {
        table: V(X, 0.86, -1.3),
        sink: V(X - 3.7, 0, -2.3),
        roji: V(X + 0.05, 0, -2.08),
        homama: V(X + 0.95, 0, -2.0),
        monitor: V(X + 1.55, 1.39, -2.45),
        trolley: V(X + 2.05, 0.92, -0.55),
      },
    };
  }

  // ---------------------------------------------------------------- recovery
  {
    const g = new THREE.Group();
    const X = GAP * 3;
    g.position.x = X;
    const pl = planks();
    shell(k, util, g, { floor: pl, wall: paper('#ffeef0', '#ffd3dc', 'dots'), side: '#ffe6ea', repeat: [4, 3] });
    const keep = [];
    const bedM = hospitalBed(k, { blanket: C.pink });
    g.add(at(bedM, -0.9, 0, -2.5));
    // Balloons tied to the foot of the bed (they bob)
    const balloons = [];
    [[C.pink, -0.25], [C.sun, 0], [C.mint, 0.25]].forEach(([col, dx], i) => {
      const b = M.balloon(k, col);
      at(b.root, -1.75 + dx, 0.55, -3.05 + Math.abs(dx) * 0.4);
      b.root.rotation.z = -0.15 + i * 0.15;
      g.add(b.root);
      keep.push(b.root);
      balloons.push(b);
    });
    // Bedside table with a card and flowers
    g.add(at(rbox(0.6, 0.7, 0.5, C.white, 0.05), 0.75, 0.35, -3.1));
    g.add(at(box(0.5, 0.04, 0.02, C.mint), 0.75, 0.5, -2.84));
    const cd = M.card(k);
    g.add(at(cd, 0.6, 0.7, -3.05));
    g.add(at(bouquet(k, { scale: 1 }), 0.92, 0.7, -3.15));
    // Window with a teddy on the sill
    g.add(at(windowMesh(k, sky, { w: 1.2, h: 1.0, curtain: C.lilac }), -2.9, 2.0, BACK + 0.15));
    const teddy = new THREE.Group();
    const tb = sph(0.11, C.wood, undefined, 12);
    const th = sph(0.08, C.wood, undefined, 12);
    at(th, 0, 0.15, 0);
    teddy.add(tb, th);
    for (const s of [-1, 1]) teddy.add(at(sph(0.035, C.woodDark, undefined, 8), s * 0.06, 0.22, 0));
    g.add(at(teddy, -2.6, 1.55, BACK + 0.3));
    // Door to the corridor, where the family waves
    g.add(at(rbox(1.6, 2.3, 0.12, C.white, 0.04), 3.3, 1.15, BACK + 0.1));
    g.add(at(box(1.38, 2.12, 0.04, '#5a4250'), 3.3, 1.06, BACK + 0.16));
    const rs = k.panel(1.4, 0.32, 256, (c, w, h) => drawBoard(c, w, h, { lines: ['Recovery room'], edge: C.lilac }));
    g.add(at(rs, 3.3, 2.55, BACK + 0.13));
    const garland = k.panel(3.6, 0.5, 512, (c, w, h) => {
      const cols = [C.rose, C.sun, C.mint, C.sky, C.lilac];
      c.strokeStyle = '#c9a07a';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(0, h * 0.15);
      c.quadraticCurveTo(w / 2, h * 0.55, w, h * 0.15);
      c.stroke();
      for (let i = 0; i < 9; i++) {
        const x = (i + 0.5) * (w / 9);
        const y = h * 0.15 + Math.sin((x / w) * Math.PI) * h * 0.28;
        c.fillStyle = cols[i % 5];
        c.beginPath();
        c.moveTo(x - 22, y);
        c.lineTo(x + 22, y);
        c.lineTo(x, y + 52);
        c.fill();
      }
    }, { transparent: true });
    g.add(at(garland, -0.2, 3.05, BACK + 0.12));
    g.add(at(plant(k, { scale: 1.1 }), 4.5, 0, -1.2));
    g.add(at(chair(k, { color: C.sun }), 1.6, 0, -2.6));
    colorBake(g, keep);
    bakeStatic(g, keep, mergeGeometries);
    rooms.recovery = {
      id: 'recovery',
      name: 'Recovery room',
      group: g,
      x: X,
      view: { look: V(X + 0.7, 1.15, -1.5), w: 7.0, h: 3.4 },
      spots: {
        bed: V(X - 0.9, 0, -2.5),
        door: V(X + 3.3, 0, BACK + 0.7),
        family: [V(X + 2.9, 0, -2.6), V(X + 3.7, 0, -2.6)],
        stand: V(X + 0.3, 0, -1.55),
        roji: V(X + 1.25, 0, -1.15),
        homama: V(X + 2.3, 0, -1.4),
      },
      update(dt, t) {
        balloons.forEach((b, i) => {
          b.ball.position.y = 1.0 + Math.sin(t * 1.3 + i * 1.7) * 0.04;
          b.root.rotation.z = -0.15 + i * 0.15 + Math.sin(t * 0.9 + i) * 0.04;
        });
      },
    };
  }

  for (const r of Object.values(rooms)) {
    ctx.scene.add(r.group);
    r.group.visible = false;
  }
  return rooms;
}
