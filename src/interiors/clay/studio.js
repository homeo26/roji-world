import * as THREE from 'three';
import { COL, box, rbox, cyl, sph, tor, at, rot, mat, umat, mesh, roundRect, FONT, makeWheel, makeStool, makeVase, makeMug, makePlant, makeApron, makeShelf, speechBubble, freezeKid, colorBake } from './models.js';
import { bake, bakeMat } from '../../places/home/kit.js';
import { loadPots, makePot, GLAZES, PATTERNS } from './pots.js';
import { makeThrowPot } from '../../stops/clay/parts.js';
import { X0, ZB, MID, WHEELS, WHEEL_Z, GHOST, SHELF, APRONS, WEDGE, RACK } from './layout.js';

// The pottery studio behind the café: three wheels (the middle one plays the pottery game, the teacher
// throws at the left one), the wheel for two by the window, aprons with our names, the shelf of pots we
// made in the pottery game with our wonky first pot on top, the wedging table, a drying rack and a sink.

const P = Math.PI;

// A lathe pot whose shape can change every frame. shape(s, a) -> radius for height fraction s and angle a.
export function makeMorphPot(material, rows = 16, seg = 36) {
  const pts = Array.from({ length: rows }, (_, i) => new THREE.Vector2(0.1, i / (rows - 1)));
  const geo = new THREE.LatheGeometry(pts, seg);
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  const base = geo.attributes.position.array.slice();
  const set = (radius, height) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const s = base[i * 3 + 1];
      const a = Math.atan2(base[i * 3 + 2], base[i * 3]);
      const r = radius(s, a);
      p.setXYZ(i, Math.cos(a) * r, s * height, Math.sin(a) * r);
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
  };
  return { mesh: m, set };
}

// Polar radius of a heart seen from above, the point toward +z (the camera) and the lobes at the back.
const HEART = (() => {
  const bins = 72;
  const out = new Float32Array(bins);
  for (let i = 0; i < 2000; i++) {
    const t = (i / 2000) * P * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) - 2.5;
    const a = Math.atan2(-y, x); // lobes (+y) go to -z
    const b = Math.floor(((a + P) / (P * 2)) * bins) % bins;
    out[b] = Math.max(out[b], Math.hypot(x, y));
  }
  for (let i = 0; i < bins; i++) if (!out[i]) out[i] = (out[(i + bins - 1) % bins] + out[(i + 1) % bins]) / 2;
  let mean = 0;
  for (const r of out) mean += r;
  mean /= bins;
  for (let i = 0; i < bins; i++) out[i] /= mean;
  return (a) => {
    const f = (((a + P) / (P * 2)) * bins + bins) % bins;
    const i = Math.floor(f);
    return out[i] + (out[(i + 1) % bins] - out[i]) * (f - i);
  };
})();

// The heart pot from the wheel for two: k 0 lump .. 1 heart-shaped bowl.
export function heartPotShape(k) {
  const lumpK = Math.min(1, k * 2);
  const heartK = Math.max(0, (k - 0.5) * 2);
  const ease = (x) => x * x * (3 - 2 * x);
  const hk = ease(heartK);
  const radius = (s, a) => {
    const lump = 0.13 * Math.sqrt(Math.max(0, 1 - Math.pow(s * 1.02, 2))) + 0.02;
    const cylR = 0.1 + 0.02 * Math.sin(s * P);
    const bowl = 0.11 + 0.08 * Math.pow(s, 0.7);
    let r = s < 0.02 ? 0.06 : lump + (cylR - lump) * ease(lumpK);
    r += (bowl - r) * hk;
    return r * (1 + (HEART(a) - 1) * 1.25 * hk * Math.min(1, s * 4));
  };
  const height = 0.16 + 0.1 * ease(lumpK) - 0.1 * hk;
  return [radius, height];
}

export function buildStudio(R) {
  const { add, dyn, col, circ, hot, upd, atlas, api, ictx } = R;
  const v = new THREE.Vector3();
  const tone = R.tone;

  // ---------------------------------------------------------------- back wall: window, aprons, shelves
  R.windowAt(GHOST.x, 1.85, 1.6, 1.3, COL.sun);
  R.lamp(R.g, -8.3, 2.1, ZB, COL.terra);
  R.lamp(R.g, -3.4, 2.4, ZB, COL.terra);
  R.bunting(R.g, X0 + 0.3, -8.8, 3.05, ZB + 0.2);
  R.bunting(R.g, -2.4, MID - 0.3, 3.05, ZB + 0.2);
  // The sill holds the heart pot once they have made it at the wheel for two
  const sill = new THREE.Group();
  sill.position.set(GHOST.x + 0.45, 1.13, ZB + 0.12);
  add(dyn(sill));
  const sillPot = makeMorphPot(umat('#ff8fb1', { rough: 0.25, side: THREE.DoubleSide }));
  const [sr, sh] = heartPotShape(1);
  sillPot.set(sr, sh);
  sillPot.mesh.scale.setScalar(0.9);
  sill.add(sillPot.mesh);
  sill.visible = !!api.load('heartPot', false);

  // Aprons on hooks, two with our names; a bench with clay bags under it
  add(at(box(2.0, 0.08, 0.06, COL.wood), APRONS.x, 2.05, ZB + 0.04));
  [[COL.rose, 'Roji'], [COL.sky, 'Homama'], [COL.mint, ''], [COL.sun, '']].forEach(([c, name], i) => {
    const ap = makeApron(c);
    add(at(ap, APRONS.x - 0.69 + i * 0.46, 2.02, ZB + 0.04));
    if (name) {
      const tag = atlas.panel(0.16, 0.065, 120, 48, (cc, w, h) => {
        cc.fillStyle = '#ffffff';
        cc.fillRect(0, 0, w, h);
        cc.fillStyle = COL.ink;
        cc.textAlign = 'center';
        cc.textBaseline = 'middle';
        cc.font = `600 ${name.length > 4 ? 24 : 30}px ${FONT}`;
        cc.fillText(name, w / 2, h / 2 + 2);
      });
      add(at(tag, APRONS.x - 0.69 + i * 0.46, 1.54, ZB + 0.105));
    }
  });
  add(at(rbox(1.8, 0.42, 0.5, COL.wood, 0.04), APRONS.x, 0.21, ZB + 0.3));
  col(APRONS.x, ZB + 0.3, 0.9, 0.25, 0.43);
  for (let i = 0; i < 3; i++) add(rot(at(rbox(0.38, 0.22, 0.32, ['#cdb8a6', '#d9a184', '#c46b47'][i], 0.08), APRONS.x - 0.55 + i * 0.55, 0.53, ZB + 0.3), 0, (i - 1) * 0.2, 0));

  // The shelf of pots made in the pottery game (filled on enter), our wonky first pot on top
  add(at(makeShelf(2.9, 0.42, [0.35, ...SHELF.planks], COL.wood), SHELF.x, 0, SHELF.z));
  add(at(box(2.9, 2.0, 0.03, '#f4dcc4'), SHELF.x, 1.0, ZB + 0.03));
  for (let i = 0; i < 4; i++) add(at(rbox(0.5, 0.24, 0.32, ['#cdb8a6', '#d9a184'][i % 2], 0.06), SHELF.x - 1.05 + i * 0.7, 0.5, SHELF.z));
  col(SHELF.x, SHELF.z, 1.5, 0.24);
  const shelfSign = atlas.panel(1.9, 0.42, 456, 100, (c, w, h) => {
    c.fillStyle = '#fff7ea';
    roundRect(c, 4, 4, w - 8, h - 8, 34);
    c.fill();
    c.lineWidth = 7;
    c.strokeStyle = COL.terra;
    c.stroke();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#8c3f22';
    c.font = `600 ${h * 0.3}px ${FONT}`;
    c.fillText('Made by Roji and Homama', w / 2, h * 0.54, w - 60);
  });
  add(at(shelfSign, SHELF.x, 2.62, ZB + 0.08));
  for (const s of [-1, 1]) add(at(sph(0.05, COL.rose, undefined, 10), SHELF.x + s * 0.88, 2.62, ZB + 0.12));
  // Our first pot: lopsided, a thumb dent in the side, kept on top of the shelf with a label
  const wonky = makeMorphPot(umat('#e8a07a', { rough: 0.85, side: THREE.DoubleSide }), 10, 20);
  wonky.set((s, a) => (0.06 + 0.05 * Math.sin(s * P * 0.9) + 0.012 * Math.sin(a * 2 + s * 4)) * (1 - 0.18 * Math.max(0, Math.cos(a - 1.2)) * Math.sin(s * P)), 0.2);
  wonky.mesh.rotation.set(0.12, 0.4, -0.18);
  add(at(wonky.mesh, SHELF.x - 0.9, SHELF.planks[2] + 0.04, SHELF.z + 0.02));
  const firstTag = atlas.panel(0.34, 0.12, 170, 60, (c, w, h) => {
    c.fillStyle = '#fffaf1';
    roundRect(c, 2, 2, w - 4, h - 4, 12);
    c.fill();
    c.strokeStyle = COL.rose;
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = '#8c3f22';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 22px ${FONT}`;
    c.fillText('Our first pot', w / 2, h / 2 + 1);
  });
  add(rot(at(firstTag, SHELF.x - 0.9, SHELF.planks[2] + 0.05, SHELF.z + 0.22), -0.35, 0, 0.08));
  const emptyNote = atlas.panel(1.2, 0.36, 300, 90, (c, w, h) => {
    c.fillStyle = '#f4dcc4';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff';
    roundRect(c, 4, 4, w - 8, h - 8, 20);
    c.fill();
    c.fillStyle = '#a0705a';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `500 ${h * 0.3}px ${FONT}`;
    c.fillText('Your pots will live here', w / 2, h / 2 + 2);
  });
  emptyNote.position.set(SHELF.x, SHELF.planks[1] + 0.22, SHELF.z + 0.05);
  const emptyHolder = dyn(add(new THREE.Group()));
  emptyHolder.add(emptyNote);
  const potHolder = dyn(add(new THREE.Group()));
  let shown = '';
  const refreshShelf = () => {
    const list = loadPots().slice(-11).reverse();
    const sig = JSON.stringify(list.map((p) => [p.t, p.color, p.pattern]));
    if (sig === shown) return list;
    shown = sig;
    for (const o of [...potHolder.children]) {
      o.geometry.dispose();
      o.material.dispose();
      o.removeFromParent();
    }
    // Slot 0 of the top plank holds our first pot; the game's pots fill the rest
    const slots = [];
    for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) if (!(row === 0 && k === 0)) slots.push([row, k]);
    list.forEach((item, i) => {
      const [row, k] = slots[i];
      const pot = makePot(item);
      const ht = item.profile[item.profile.length - 1][1];
      const wd = Math.max(...item.profile.map((q) => q[0])) * 2;
      pot.scale.setScalar(Math.min(1, 0.42 / ht, 0.56 / wd));
      pot.position.set(SHELF.x + SHELF.slots[k], SHELF.planks[2 - row] + 0.026, SHELF.z + 0.02);
      pot.rotation.y = (i * 1.7) % (P * 2);
      potHolder.add(pot);
    });
    emptyHolder.visible = list.length === 0;
    return list;
  };
  refreshShelf();
  R.onEnter(() => {
    refreshShelf();
    sill.visible = !!api.load('heartPot', false);
  });

  // ---------------------------------------------------------------- the wheels
  let gameSpin = null;
  let teacherPot = null;
  let teacherHead = null;
  const teacher = ictx.makeKid({ id: 'teacher', name: 'Pottery teacher', gender: 'girl', skin: '#c98f68', hair: '#4a2c1a', hairstyle: 'bob', outfit: 'overalls', top: '#fff7ee', bottom: '#d9734e', shoes: '#3b2b3f', accent: COL.mint });
  WHEELS.forEach((x, i) => {
    const wh = makeWheel([COL.mint, COL.sun, '#ffb7cb'][i]);
    add(at(wh.root, x, 0, WHEEL_Z));
    if (i !== 2) dyn(bake(wh.head));
    if (i === 1) {
      gameSpin = wh.head;
      const lump = mesh(new THREE.LatheGeometry([[0, 0], [0.13, 0], [0.15, 0.06], [0.13, 0.16], [0.1, 0.22], [0.11, 0.25], [0, 0.24]].map(([r, y]) => new THREE.Vector2(r, y)), 20), mat(COL.clay, { rough: 0.5 }));
      wh.head.add(lump);
    } else if (i === 0) {
      teacherPot = makeThrowPot(umat(COL.clay, { rough: 0.45, side: THREE.DoubleSide }));
      wh.head.add(teacherPot.mesh);
      teacherPot.spin = wh.head;
    } else {
      const lump = at(sph(0.13, COL.clay, { rough: 0.5 }, 14), 0, 0.6, 0);
      lump.scale.set(1, 0.75, 1);
      wh.root.add(lump);
      wh.head.rotation.y = 0.6;
    }
    circ(x, WHEEL_Z, 0.42, 0.55);
    const stool = makeStool([COL.terra, COL.rose, COL.mint][i]);
    add(at(stool, x, 0, WHEEL_Z - 0.65));
    circ(x, WHEEL_Z - 0.65, 0.22, i === 0 ? undefined : 0.46);
    add(at(cyl(0.15, 0.13, 0.26, ['#9fd8ef', '#ffd166', '#c7a6ff'][i], 14), x + 0.55, 0.13, WHEEL_Z + 0.25));
    add(at(cyl(0.135, 0.135, 0.02, '#a9654a', 14), x + 0.55, 0.25, WHEEL_Z + 0.25));
  });
  // The teacher at the left wheel, throwing a vase and looking up when we come over (only her head moves)
  freezeKid(teacher, { pose: 'sit', hands: 'carry' });
  teacher.root.scale.setScalar(1.12);
  teacher.root.position.set(WHEELS[0], 0.27, WHEEL_Z - 0.7);
  add(teacher.root);
  teacherHead = teacher.head;
  colorBake(teacherHead, [], { single: true });
  bakeMat(teacherHead);
  dyn(teacherHead);
  circ(WHEELS[0], WHEEL_Z - 0.7, 0.32);
  const tBubble = speechBubble(THREE, R.g, { width: 1.4, color: COL.mintDark });
  dyn(tBubble.sprite);
  let watch = 0;
  let greeted = 0;
  upd((dt, t, a) => {
    if (gameSpin) gameSpin.rotation.y += dt * 5;
    teacherPot.spin.rotation.y += dt * 7;
    const u = (t % 16) / 16;
    const k = u < 0.12 ? 0 : u < 0.75 ? (u - 0.12) / 0.63 : 1;
    teacherPot.shape(k * k * (3 - 2 * k), t * 6);
    teacherPot.mesh.scale.setScalar(u > 0.95 ? Math.max(0.05, 1 - (u - 0.95) * 20) : u < 0.03 ? Math.max(0.05, u / 0.03) : 1);
    const p = a.localPos(a.player);
    const d = Math.hypot(p.x - WHEELS[0], p.z - WHEEL_Z);
    watch += ((d < 3 ? 1 : 0) - watch) * Math.min(1, dt * 2.5);
    teacherHead.rotation.x = 0.3 * (1 - watch) - 0.05 * watch;
    teacherHead.rotation.y = Math.max(-0.8, Math.min(0.8, Math.atan2(p.x - WHEELS[0], p.z - (WHEEL_Z - 0.7)))) * watch;
    greeted = Math.max(0, greeted - dt);
    if (d < 2.6 && greeted <= 0 && !a.activityRunning) {
      greeted = 40;
      tBubble.set(['Hello, you two! Wet your hands first.', 'Slow and steady, let the wheel do the work.', 'Lovely to see you back!'][Math.floor(Math.random() * 3)], 2800);
    }
    tBubble.update(dt, v.set(WHEELS[0], 2.15, WHEEL_Z - 0.6));
  });

  // ---------------------------------------------------------------- the wheel for two by the window
  const gw = makeWheel('#ffd6e2');
  add(at(gw.root, GHOST.x, 0, GHOST.z));
  dyn(bake(gw.head));
  const heartPot = makeMorphPot(umat(COL.clay, { rough: 0.45, side: THREE.DoubleSide }));
  gw.head.add(heartPot.mesh);
  const setHeart = (k) => {
    const [r, h] = heartPotShape(k);
    heartPot.set(r, h);
  };
  setHeart(0);
  circ(GHOST.x, GHOST.z, 0.42, 0.55);
  for (const [dz, c] of [[-0.62, COL.rose], [-1.1, COL.sky]]) {
    add(at(makeStool(c), GHOST.x, 0, GHOST.z + dz));
  }
  col(GHOST.x, GHOST.z - 0.86, 0.24, 0.48, 0.46);
  // A heart rug under it and a little sign
  const rug = atlas.wrap(new THREE.CircleGeometry(1.0, 28), 160, 160, (c, w, h) => {
    c.fillStyle = '#ffe1e8';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffc2d1';
    c.beginPath();
    c.arc(w / 2, h / 2, 70, 0, P * 2);
    c.fill();
    c.fillStyle = '#ffe1e8';
    c.beginPath();
    c.arc(w / 2, h / 2, 60, 0, P * 2);
    c.fill();
    c.fillStyle = '#ff8fb1';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * P * 2;
      const x = w / 2 + Math.cos(a) * 66;
      const y = h / 2 + Math.sin(a) * 66;
      c.beginPath();
      c.moveTo(x, y + 5);
      c.bezierCurveTo(x - 7, y - 1, x - 4, y - 7, x, y - 3);
      c.bezierCurveTo(x + 4, y - 7, x + 7, y - 1, x, y + 5);
      c.fill();
    }
  });
  add(rot(at(rug, GHOST.x, 0.012, GHOST.z - 0.5), -P / 2, 0, 0));
  const forTwo = atlas.panel(0.6, 0.3, 180, 90, (c, w, h) => {
    c.fillStyle = '#fff7ea';
    roundRect(c, 3, 3, w - 6, h - 6, 20);
    c.fill();
    c.lineWidth = 5;
    c.strokeStyle = COL.rose;
    c.stroke();
    c.fillStyle = '#8c3f22';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 30px ${FONT}`;
    c.fillText('For two', w / 2, h / 2 + 2);
  });
  add(at(forTwo, GHOST.x - 1.25, 1.6, ZB + 0.03));
  add(at(makePlant(1.0, COL.terra, 'tall'), X0 + 0.45, 0, ZB + 0.5));
  circ(X0 + 0.45, ZB + 0.5, 0.22);

  // ---------------------------------------------------------------- a low cupboard along the front wall
  const CB = { x0: X0 + 0.4, x1: -4.3, z: -0.5 };
  const cbx = (CB.x0 + CB.x1) / 2;
  const cbl = CB.x1 - CB.x0;
  add(at(rbox(cbl, 0.8, 0.5, '#f3e2cf', 0.04), cbx, 0.4, CB.z));
  add(at(rbox(cbl + 0.08, 0.06, 0.56, COL.woodLight, 0.02), cbx, 0.83, CB.z));
  for (let i = 0; i < Math.round(cbl / 0.9); i++) {
    const x = CB.x0 + 0.45 + i * 0.9;
    add(at(rbox(0.8, 0.62, 0.02, ['#cfe8de', '#f6d6c8', '#fbe8b8'][i % 3], 0.02), x, 0.4, CB.z - 0.26));
    add(at(sph(0.025, '#c98f5f', undefined, 8), x, 0.55, CB.z - 0.28));
  }
  col(cbx, CB.z, cbl / 2 + 0.04, 0.28, 0.86);
  // Tool caddies, buckets and bisque pieces waiting their turn on top
  for (let i = 0; i < 4; i++) {
    const x = CB.x0 + 0.5 + i * 1.6;
    add(at(rbox(0.36, 0.14, 0.24, [COL.mint, COL.sun, COL.rose, COL.sky][i], 0.03), x, 0.93, CB.z));
    for (let k = 0; k < 3; k++) add(rot(at(cyl(0.007, 0.007, 0.22, COL.woodLight, 5), x - 0.08 + k * 0.08, 1.06, CB.z), 0, 0, (k - 1) * 0.2));
    add(at(makeVase((i * 2) % 5, '#e8d5c3', 0.75), x + 0.5, 0.86, CB.z + 0.02));
    add(at(makeVase((i * 2 + 1) % 5, '#e8d5c3', 0.6), x + 0.82, 0.86, CB.z - 0.05));
  }

  // ---------------------------------------------------------------- wedging table, drying rack, sink
  const { x: TX, z: TZ } = WEDGE;
  add(at(rbox(1.9, 0.08, 0.95, '#d9b48c', 0.03), TX, 0.78, TZ));
  for (const [dx, dz] of [[-0.85, -0.38], [0.85, -0.38], [-0.85, 0.38], [0.85, 0.38]]) add(at(box(0.08, 0.74, 0.08, COL.woodDark), TX + dx, 0.37, TZ + dz));
  add(at(box(1.7, 0.04, 0.8, COL.woodDark), TX, 0.2, TZ));
  col(TX, TZ, 0.95, 0.48, 0.82);
  add(at(rbox(0.5, 0.06, 0.36, COL.clay, 0.03), TX - 0.45, 0.85, TZ));
  add(at(rbox(0.3, 0.12, 0.24, '#b85a39', 0.05), TX + 0.2, 0.88, TZ - 0.15));
  add(rot(at(cyl(0.035, 0.035, 0.5, COL.woodLight, 12), TX + 0.15, 0.86, TZ + 0.22), 0, 0, P / 2));
  for (const s of [-1, 1]) add(rot(at(cyl(0.02, 0.02, 0.1, COL.woodDark, 8), TX + 0.15 + s * 0.3, 0.86, TZ + 0.22), 0, 0, P / 2));
  add(at(cyl(0.07, 0.06, 0.14, COL.sky, 12), TX + 0.65, 0.89, TZ + 0.1));
  for (let k = 0; k < 4; k++) add(rot(at(cyl(0.008, 0.008, 0.22, COL.woodLight, 5), TX + 0.62 + (k % 2) * 0.04, 1.0, TZ + 0.08 + (k >> 1) * 0.04), (k - 1.5) * 0.12, 0, (k % 2 - 0.5) * 0.3));
  // A clay heart someone pressed into the slab with two thumbs
  add(at(rot(mesh(new THREE.CircleGeometry(0.03, 10), mat('#a2512f'), { cast: false }), -P / 2, 0, 0.6), TX - 0.49, 0.882, TZ - 0.02));
  add(at(rot(mesh(new THREE.CircleGeometry(0.03, 10), mat('#a2512f'), { cast: false }), -P / 2, 0, -0.6), TX - 0.43, 0.882, TZ - 0.02));
  const { x: RX, z: RZ } = RACK;
  for (const s of [-1, 1]) add(at(box(0.06, 1.5, 0.5, COL.woodDark), RX + s * 0.75, 0.75, RZ));
  for (const y of [0.3, 0.75, 1.2]) {
    add(at(box(1.5, 0.04, 0.48, COL.woodLight), RX, y, RZ));
    for (let i = 0; i < 4; i++) add(at(makeVase((i + Math.round(y * 4)) % 5, '#d8c7b8', 0.62), RX - 0.54 + i * 0.36, y + 0.02, RZ));
  }
  col(RX, RZ, 0.8, 0.27);
  // Sink with a tap and sponges by the back wall
  const KX = 0.6;
  add(at(rbox(1.2, 0.82, 0.56, COL.mint, 0.04), KX, 0.41, ZB + 0.3));
  add(at(rbox(1.26, 0.06, 0.6, '#ffffff', 0.02), KX, 0.85, ZB + 0.3));
  add(at(rbox(0.6, 0.04, 0.38, mat(COL.steel, { metal: 0.5, rough: 0.3 }), 0.02), KX, 0.88, ZB + 0.32));
  add(rot(at(tor(0.1, 0.02, mat(COL.steel, { metal: 0.6, rough: 0.25 }), undefined, P, 6, 12), KX, 0.98, ZB + 0.12), 0, P / 2, 0));
  add(at(rbox(0.1, 0.04, 0.07, COL.sun, 0.015), KX + 0.4, 0.9, ZB + 0.4));
  col(KX, ZB + 0.3, 0.63, 0.3, 0.88);
  R.windowAt(KX, 1.9, 1.0, 1.0, null);
  // A poster of the four steps
  const steps = atlas.panel(0.9, 0.62, 270, 186, (c, w, h) => {
    c.fillStyle = '#fff7ea';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = COL.terra;
    c.lineWidth = 8;
    c.strokeRect(4, 4, w - 8, h - 8);
    c.fillStyle = '#8c3f22';
    c.textAlign = 'center';
    c.font = `700 24px ${FONT}`;
    c.fillText('Four steps', w / 2, 34);
    c.font = `500 20px ${FONT}`;
    ['Centre the clay', 'Open it up', 'Pull the walls', 'Glaze and fire'].forEach((s, i) => c.fillText(`${i + 1}. ${s}`, w / 2, 70 + i * 28));
  });
  add(at(steps, -0.95, 1.75, ZB + 0.03));

  // ---------------------------------------------------------------- moments
  let busy = false;
  hot({
    x: WHEELS[1],
    z: WHEEL_Z + 0.95,
    r: 1.4,
    label: 'Make pottery',
    icon: 'vase',
    act: async (a) => {
      if (!a.hasArena('pottery')) return a.toast('The wheel is being cleaned. Come back soon.');
      const before = loadPots().at(-1)?.t;
      await a.playArena('pottery');
      const list = refreshShelf();
      if (list.length && list[0].t !== before) a.toast(`Your new pot is on the shelf. ${list.length} ${list.length === 1 ? 'pot' : 'pots'} so far.`, 2600);
    },
  });
  hot({
    x: SHELF.x,
    z: SHELF.z + 1.15,
    r: 1.4,
    label: 'Look at our pots',
    icon: 'star',
    act: (a) => {
      const list = refreshShelf();
      const z = SHELF.z + 1.0;
      a.activity({
        label: 'Done',
        seats: [
          { who: 'player', x: SHELF.x - 1.85, z, yaw: Math.atan2(1.85, -0.9), pose: 'stand' },
          { who: 'partner', x: SHELF.x + 1.85, z, yaw: Math.atan2(-1.85, -0.9), pose: 'stand' },
        ],
        focus: { x: SHELF.x, z: SHELF.z + 0.6, y: 1.45, zoom: 0.4 },
        exit: { x: SHELF.x - 0.4, z: SHELF.z + 1.3 },
      });
      setTimeout(() => a.emote('partner', 'heart'), 300);
      a.sound.ui('coin');
      if (!list.length) {
        a.toast('Our wonky first pot is up top, and Homama will not let anyone move it. The rest of the shelf is waiting for the pottery wheel.', 3800);
        return;
      }
      const p = list[0];
      const glaze = (GLAZES.find((gl) => gl[1] === p.color) || ['Pretty'])[0].toLowerCase();
      const pat = (PATTERNS.find((q) => q.id === p.pattern) || PATTERNS[0]).name.toLowerCase();
      const what = `${glaze} ${(p.name || 'pot').toLowerCase()}${p.pattern && p.pattern !== 'plain' ? ` with ${pat}` : ''}`;
      a.toast(`${list.length} handmade ${list.length === 1 ? 'pot' : 'pots'}, the newest a ${what}. And up top, our wonky first pot that Homama keeps.`, 3600);
      const newest = potHolder.children[0];
      if (newest) {
        newest.getWorldPosition(v);
        a.fx.heartsAt(v.clone().add(new THREE.Vector3(0, 0.3, 0.1)), 4);
      }
    },
  });

  // The wheel for two: Homama sits behind Roji, their hands meet on the clay and it becomes a heart
  const TUNE = [65, 69, 72, 76, 74, 72, 69, 72, 67, 71, 74, 77, 76, 74, 71, 69];
  hot({
    x: GHOST.x,
    z: GHOST.z + 0.95,
    r: 1.3,
    label: 'Sit at the wheel together',
    icon: 'heart',
    act: (a) => {
      if (busy) return;
      busy = true;
      let T = 0;
      let note = 0;
      let nextNote = 0.4;
      let heartT = 2;
      let done = false;
      const s = a.sound;
      a.activity({
        label: 'Get up',
        seats: [
          { who: 'roji', x: GHOST.x, z: GHOST.z - 0.6, y: 0.3, yaw: 0, pose: 'sit', hands: 'carry' },
          { who: 'homama', x: GHOST.x + 0.24, z: GHOST.z - 1.0, y: 0.36, yaw: -0.12, pose: 'sit', hands: 'carry' },
        ],
        focus: { x: GHOST.x, z: GHOST.z - 0.4, y: 0.95, zoom: 0.38 },
        night: 0.4,
        music: 0.15,
        exit: { x: GHOST.x + 1.0, z: GHOST.z + 1.0 },
        update: (dt) => {
          T += dt;
          // Spin while it takes shape, then slow to a stop with the heart's point toward us
          if (!done) gw.head.rotation.y += dt * (3 + Math.min(1, T) * 4);
          else {
            const target = Math.ceil(gw.head.rotation.y / (P * 2)) * P * 2;
            gw.head.rotation.y += Math.min(target - gw.head.rotation.y, dt * Math.max(0.4, (target - gw.head.rotation.y) * 2.5));
          }
          setHeart(Math.min(1, T / 11));
          nextNote -= dt;
          if (nextNote <= 0 && s?.ctx) {
            const n = TUNE[note % TUNE.length];
            const f = 440 * Math.pow(2, (n - 69) / 12);
            s.tone(f, s.ctx.currentTime, 1.6, { gain: 0.045, attack: 0.03 });
            if (note % 4 === 0) s.tone(f / 2, s.ctx.currentTime, 2.4, { gain: 0.03, type: 'triangle', attack: 0.05 });
            note++;
            nextNote = 0.62;
          }
          heartT -= dt;
          if (heartT <= 0 && !done) {
            heartT = 2.6;
            a.fx.heartsAt(a.world(GHOST.x, GHOST.z - 0.3, 1.5), 2);
          }
          if (!done && T > 11) {
            done = true;
            a.fx.heartsAt(a.world(GHOST.x, GHOST.z, 1.2), 9);
            a.sound.ui('win');
            api.save('heartPot', true);
            sill.visible = true;
            a.toast('A little heart-shaped pot, made with four hands. It goes on the windowsill.', 3400);
          }
        },
        onEnd: () => {
          busy = false;
          setHeart(0);
        },
      });
      a.toast('Homama sits behind Roji, and their hands meet on the clay.', 3000);
    },
  });

  return { refreshShelf };
}
