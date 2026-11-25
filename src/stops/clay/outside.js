import * as THREE from 'three';
import { Kid } from '../../kid.js';
import { makeAtlas, uvScale, bakeMat } from '../../places/home/kit.js';
import { COL, box, rbox, cyl, sph, tor, at, rot, mat, umat, mesh, roundRect, FONT, colorBake, makeWheel, makeStool, makeChair, makeTable, makeCup, makeVase, makeMug, makePlant, freezeKid } from '../../interiors/clay/models.js';
import { bake } from '../../places/home/kit.js';
import { roofTileTex, terraceTex, brickTex, makeBottleKiln, makePotSign, makeCat, makeSparrows, makeStringLights, makeChime, makeThrowPot, softSprite } from './parts.js';
import { B, RIDGE, EAVE, DOOR, SHOP, WIN, KILN, TERRACE, TABLE, WHEEL, CRATES, POSTS, DORMERS } from './layout.js';

// The outside of the Clay Café (weekend 5): a terracotta and cream pottery café with a clay-tile roof and
// a pot-shaped sign, a bay window full of pots, a bottle kiln with smoke, and a tiled terrace with a
// potter at an open-air wheel, a coffee table, the café cat, sparrows and string lights for the evening.

const P = Math.PI;
const SAGE = '#6fae9c';
const SAGE_DARK = '#4f8f7e';
const CREAM = '#fdf0df';

// An upright opening with a round top (doors, windows), w wide and h tall, base at y = 0.
function doorShape(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h - w / 2);
  s.absarc(0, h - w / 2, w / 2, 0, P, false);
  s.closePath();
  return s;
}

export function buildOutside(st) {
  const g = st.group;
  const dynamic = [];
  const add = (...o) => (g.add(...o), o[0]);
  const dyn = (o) => (dynamic.push(o), o);
  const col = (c) => st.addCollider(c);
  const atlas = makeAtlas(1024, 1024);
  // Lit windows and lanterns share one glowing material (the game brightens it after dark)
  const glow = umat('#ffe9c2', { emissive: '#ffc977', ei: 0.5, rough: 0.4 });
  const cx = (B.x0 + B.x1) / 2;
  const cz = (B.z0 + B.z1) / 2;
  const W = B.x1 - B.x0;
  const D = B.z1 - B.z0;
  const FZ = B.z1; // the front wall

  // ---------------------------------------------------------------- the café building
  add(at(box(W, B.h, D, CREAM), cx, B.h / 2, cz));
  const brickMat = umat('#ffffff', { rough: 0.9, map: brickTex() });
  const plinthGeo = uvScale(new THREE.BoxGeometry(W + 0.12, 0.44, D + 0.12), (W + 0.12) / 1.0, 0.44 / 0.25);
  add(at(mesh(plinthGeo, brickMat), cx, 0.22, cz));
  add(at(box(W + 0.16, 0.05, D + 0.16, '#efd9c0'), cx, 0.465, cz));
  // Terracotta quoins at the front corners and a cornice under the eaves
  for (const x of [B.x0, B.x1]) {
    for (let i = 0; i < 5; i++) {
      const y = 0.68 + i * 0.44;
      const wide = i % 2 ? 0.3 : 0.42;
      add(at(box(wide, 0.3, 0.05, COL.terra), x + (x < 0 ? wide / 2 - 0.02 : -wide / 2 + 0.02), y, FZ + 0.025));
      add(at(box(0.05, 0.3, wide, COL.terra), x + (x < 0 ? -0.025 : 0.025), y, FZ - wide / 2 + 0.02));
    }
  }
  add(at(box(W + 0.12, 0.12, D + 0.12, COL.terra), cx, B.h - 0.06, cz));
  add(at(box(W + 0.16, 0.04, D + 0.16, '#f6e2c8'), cx, B.h - 0.14, cz));
  // One box for the walls and the drying shelf on the left side, so nobody gets caught in the corner between them
  col({ type: 'box', x: cx - 0.26, z: cz, hw: W / 2 + 0.34, hd: D / 2 + 0.08 });

  // Clay-tile roof: two slopes, a ridge of round tiles and cream gables
  const half = D / 2; // wall to ridge, horizontally
  const slope = (RIDGE.y - B.h) / half;
  const a = Math.atan(slope);
  const L = (half + EAVE) / Math.cos(a);
  const RW = W + 0.62;
  const tiles = roofTileTex();
  const roofMat = umat('#ffffff', { rough: 0.75, map: tiles });
  for (const s of [1, -1]) {
    const geo = uvScale(new THREE.BoxGeometry(RW, 0.12, L), RW / 1.1, L / 1.0);
    const m = mesh(geo, roofMat);
    const mz = RIDGE.z + s * ((half + EAVE) / 2);
    const my = RIDGE.y - ((half + EAVE) / 2) * slope;
    m.position.set(cx, my + 0.06 * Math.cos(a), mz + s * 0.06 * Math.sin(a));
    m.rotation.x = s * a;
    add(m);
    // A thick terracotta edge along the eave
    add(at(rot(box(RW, 0.1, 0.1, COL.terraDark), s * a, 0, 0), cx, RIDGE.y - (half + EAVE) * slope + 0.02, RIDGE.z + s * (half + EAVE - 0.03)));
  }
  add(at(rot(cyl(0.12, 0.12, RW + 0.08, '#c25a3c', 14), 0, 0, P / 2), cx, RIDGE.y + 0.09, RIDGE.z));
  for (const x of [B.x0 - 0.36, B.x1 + 0.36]) add(at(sph(0.15, '#c25a3c', undefined, 12), x, RIDGE.y + 0.1, RIDGE.z));
  const gable = new THREE.Shape();
  gable.moveTo(-half, 0);
  gable.lineTo(half, 0);
  gable.lineTo(0, RIDGE.y - B.h);
  gable.closePath();
  const gGeo = new THREE.ExtrudeGeometry(gable, { depth: 0.16, bevelEnabled: false });
  gGeo.translate(0, 0, -0.08);
  for (const x of [B.x0 + 0.08, B.x1 - 0.08]) {
    add(at(rot(mesh(gGeo, mat(CREAM)), 0, P / 2, 0), x, B.h, cz));
    // A round vent with a little pot cut out of it
    add(at(rot(cyl(0.2, 0.2, 0.06, COL.terra, 18), 0, 0, P / 2), x + (x < 0 ? -0.1 : 0.1), B.h + 0.5, cz));
    add(at(rot(cyl(0.15, 0.15, 0.07, '#6b3b2a', 18), 0, 0, P / 2), x + (x < 0 ? -0.105 : 0.105), B.h + 0.5, cz));
  }

  // The pot-shaped sign standing on the front of the roof, held by two posts, with two little lamps
  const signZ = FZ - 0.46;
  const roofY = (z) => B.h + (FZ - z) * slope;
  const sign = makePotSign(2.3, 1.8);
  sign.position.set(DOOR.x, roofY(signZ) - 0.12, signZ);
  add(sign);
  for (const s of [-1, 1]) {
    add(at(box(0.08, 1.0, 0.08, COL.woodDark), DOOR.x + s * 0.62, roofY(signZ - 0.12) + 0.35, signZ - 0.12));
    const lampY = roofY(signZ) + 2.0;
    add(at(rot(cyl(0.012, 0.012, 0.36, '#3f3a3a', 5), 0.5, 0, 0), DOOR.x + s * 0.7, lampY - 0.04, signZ + 0.12));
    add(at(rot(cyl(0.05, 0.08, 0.08, '#3f3a3a', 10), 0.9, 0, 0), DOOR.x + s * 0.7, lampY - 0.1, signZ + 0.3));
  }

  // Two little dormer windows in the front of the roof, lit after dark, with flower boxes
  for (const x of DORMERS) {
    const z = FZ - 0.28;
    const y0 = roofY(z) - 0.2;
    const dwm = 0.86;
    add(at(box(dwm, 0.95, 1.1, CREAM), x, y0 + 0.47, z - 0.55));
    for (const s of [1, -1]) {
      const slab = add(at(rot(box(0.64, 0.07, 1.25, '#d26646'), 0, 0, -s * 0.72), x + s * 0.23, y0 + 1.13, z - 0.5));
      slab.castShadow = true;
    }
    add(at(rot(cyl(0.05, 0.05, 1.25, '#c25a3c', 8), P / 2, 0, 0), x, y0 + 1.34, z - 0.5));
    add(at(mesh(new THREE.ExtrudeGeometry(doorShape(0.56, 0.62), { depth: 0.04, bevelEnabled: false, curveSegments: 8 }), mat(SAGE)), x, y0 + 0.26, z));
    add(at(mesh(new THREE.ShapeGeometry(doorShape(0.44, 0.52), 8), glow, { cast: false }), x, y0 + 0.31, z + 0.045));
    add(at(box(0.04, 0.5, 0.03, SAGE), x, y0 + 0.56, z + 0.06));
    add(at(rbox(0.66, 0.12, 0.16, COL.terra, 0.03), x, y0 + 0.22, z + 0.1));
    for (let i = 0; i < 4; i++) add(at(sph(0.05, i % 2 ? '#ff8fb1' : '#ffffff', undefined, 8), x - 0.22 + i * 0.15, y0 + 0.31, z + 0.12));
  }

  // A frieze of hand-painted tiles across the top of the front wall
  const frieze = (x0, x1) => {
    const n = Math.round((x1 - x0) / 0.24);
    return atlas.panel(x1 - x0, 0.24, n * 40, 40, (c, w, h) => {
      const cols = [COL.mint, '#fff1dc', COL.sun, '#fff1dc', COL.rose, '#fff1dc', COL.sky, '#fff1dc'];
      for (let i = 0; i < n; i++) {
        const x = i * 40;
        c.fillStyle = cols[i % cols.length];
        c.fillRect(x + 1, 1, 38, 38);
        c.strokeStyle = COL.terra;
        c.lineWidth = 2.5;
        c.beginPath();
        if (i % 2) {
          c.arc(x + 20, 20, 9, 0, P * 2);
          c.moveTo(x + 20, 4);
          c.lineTo(x + 20, 36);
          c.moveTo(x + 4, 20);
          c.lineTo(x + 36, 20);
        } else {
          c.moveTo(x + 20, 6);
          c.lineTo(x + 34, 20);
          c.lineTo(x + 20, 34);
          c.lineTo(x + 6, 20);
          c.closePath();
        }
        c.stroke();
      }
    });
  };

  // ---------------------------------------------------------------- the shop bay window
  const sx = SHOP.x;
  const sw = SHOP.w;
  const BD = 0.4; // how far the bay stands out
  const bz = FZ + BD / 2;
  const sy0 = SHOP.y0;
  const sy1 = SHOP.y1;
  add(at(rbox(sw + 0.24, 0.12, BD + 0.08, SAGE_DARK, 0.03), sx, sy0 - 0.06, bz + 0.02));
  add(at(box(sw + 0.1, sy0 - 0.12, BD - 0.04, SAGE), sx, (sy0 - 0.12) / 2, bz - 0.02));
  for (const s of [-1, 1]) add(at(box(sw * 0.4, (sy0 - 0.12) * 0.6, 0.02, '#8cc4b2'), sx + s * sw * 0.23, (sy0 - 0.12) / 2, FZ + BD - 0.03));
  add(at(rbox(sw + 0.26, 0.14, BD + 0.1, SAGE_DARK, 0.03), sx, sy1 + 0.07, bz + 0.02));
  add(at(rbox(sw + 0.34, 0.08, BD + 0.18, COL.terra, 0.03), sx, sy1 + 0.17, bz + 0.04));
  for (const s of [-1, 1]) add(at(box(0.1, sy1 - sy0, BD, SAGE), sx + s * (sw / 2 + 0.05), (sy0 + sy1) / 2, bz));
  const inner = glow;
  add(at(mesh(new THREE.PlaneGeometry(sw, sy1 - sy0), inner, { cast: false }), sx, (sy0 + sy1) / 2, FZ + 0.005));
  for (const s of [-1, 1]) add(at(rot(mesh(new THREE.PlaneGeometry(BD - 0.02, sy1 - sy0), inner, { cast: false }), 0, -s * P / 2, 0), sx + s * (sw / 2 - 0.002), (sy0 + sy1) / 2, bz));
  const shelfYs = [sy0, sy0 + 0.5, sy0 + 1.0];
  for (const y of shelfYs.slice(1)) add(at(box(sw - 0.02, 0.035, BD - 0.06, COL.woodLight), sx, y - 0.018, bz - 0.02));
  const glazes = [COL.mint, COL.rose, COL.sun, COL.sky, '#fff1dc', COL.lilac, COL.terra, '#3f5fd0'];
  let gi = 0;
  shelfYs.forEach((y, row) => {
    let x = sx - sw / 2 + 0.16;
    let k = row * 2;
    while (x < sx + sw / 2 - 0.14) {
      const s = 0.95 + ((k * 7) % 4) * 0.12;
      if ((k + row) % 4 === 3) {
        add(at(makeMug(glazes[gi++ % glazes.length], '#ffffff'), x + 0.02, y, bz - 0.04));
        x += 0.2;
      } else {
        add(at(makeVase(k % 5, glazes[gi++ % glazes.length], s), x + 0.06, y, bz - 0.04));
        x += 0.3 * s + 0.06;
      }
      k++;
    }
  });
  // A heart-painted vase with a tag: Homama asked them to keep it for Roji
  const heartVase = makeVase(1, '#ff8fb1', 1.35);
  add(at(heartVase, sx + 0.55, shelfYs[2], bz + 0.02));
  const tag = atlas.panel(0.3, 0.12, 150, 60, (c, w, h) => {
    c.fillStyle = '#fffaf1';
    roundRect(c, 2, 2, w - 4, h - 4, 10);
    c.fill();
    c.fillStyle = '#ef5b6f';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 19px ${FONT}`;
    c.fillText('Kept for Roji', w / 2, h / 2 + 1);
  });
  add(rot(at(tag, sx + 0.55, shelfYs[2] + 0.1, bz + 0.17), 0, 0, -0.12));
  const glass = new THREE.MeshStandardMaterial({ color: '#e6f6ff', transparent: true, opacity: 0.16, roughness: 0.08, metalness: 0.1, depthWrite: false });
  const pane = add(at(mesh(new THREE.PlaneGeometry(sw, sy1 - sy0), glass, { cast: false, receive: false }), sx, (sy0 + sy1) / 2, FZ + BD - 0.01));
  pane.renderOrder = 2;
  for (const s of [-1, 1]) add(at(box(0.05, sy1 - sy0, 0.05, SAGE), sx + s * 0.3, (sy0 + sy1) / 2, FZ + BD));
  add(at(box(sw, 0.05, 0.05, SAGE), sx, sy1 - 0.32, FZ + BD));
  col({ type: 'box', x: sx, z: FZ + BD / 2, hw: sw / 2 + 0.14, hd: BD / 2 + 0.06 });
  // A flower box under the bay
  add(at(rbox(sw + 0.1, 0.2, 0.22, COL.terra, 0.04), sx, sy0 - 0.24, FZ + BD + 0.12));
  for (let i = 0; i < 9; i++) {
    const x = sx - sw / 2 + 0.1 + i * ((sw - 0.2) / 8);
    add(at(sph(0.07, i % 2 ? COL.leaf : COL.leaf2, { rough: 0.8 }, 8), x, sy0 - 0.08, FZ + BD + 0.12));
    add(at(sph(0.04, ['#ff8fb1', '#ffffff', '#ffd166'][i % 3], undefined, 8), x + 0.02, sy0 - 0.01, FZ + BD + 0.16));
  }

  // ---------------------------------------------------------------- the door
  const dx = DOOR.x;
  const dw = DOOR.w;
  const dh = DOOR.h;
  const frameGeo = new THREE.ExtrudeGeometry(doorShape(dw + 0.26, dh + 0.13), { depth: 0.06, bevelEnabled: false, curveSegments: 10 });
  add(at(mesh(frameGeo, mat(COL.terra, { rough: 0.8 })), dx, 0.12, FZ + 0.06));
  const leafGeo = new THREE.ExtrudeGeometry(doorShape(dw - 0.06, dh - 0.03), { depth: 0.06, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1, curveSegments: 10 });
  add(at(mesh(leafGeo, mat(SAGE, { rough: 0.7 })), dx, 0.13, FZ + 0.1));
  for (const [y, h] of [[0.42, 0.5], [1.08, 0.5]]) for (const s of [-1, 1]) add(at(rbox(0.36, h, 0.025, '#5f9e8c', 0.02), dx + s * 0.22, 0.13 + y + h / 2 - 0.2, FZ + 0.175));
  // Round window with a heart, a brass knob and a little bell
  add(at(rot(tor(0.15, 0.03, '#e9c27a', { metal: 0.5, rough: 0.35 }, P * 2, 6, 20), 0, 0, 0), dx, 1.72, FZ + 0.18));
  add(at(mesh(new THREE.CircleGeometry(0.15, 20), glow, { cast: false }), dx, 1.72, FZ + 0.172));
  add(at(sph(0.05, '#e9c27a', { metal: 0.6, rough: 0.3 }, 10), dx + 0.36, 1.08, FZ + 0.2));
  add(at(cyl(0.035, 0.05, 0.06, '#e9c27a', 10, { metal: 0.6, rough: 0.3 }), dx - 0.45, 2.28, FZ + 0.16));
  const plaque = atlas.panel(0.44, 0.2, 176, 80, (c, w, h) => {
    c.fillStyle = '#fff4e4';
    roundRect(c, 2, 2, w - 4, h - 4, 14);
    c.fill();
    c.strokeStyle = COL.terra;
    c.lineWidth = 4;
    c.stroke();
    c.fillStyle = '#8c3f22';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 30px ${FONT}`;
    c.fillText('Open', w / 2, h / 2 + 2);
  });
  add(rot(at(plaque, dx, 1.38, FZ + 0.195), 0, 0, 0.04));
  add(at(rbox(dw + 0.5, 0.1, 0.34, '#d9c2ad', 0.03), dx, 0.05, FZ + 0.23));
  col({ type: 'box', x: dx, z: FZ + 0.23, hw: dw / 2 + 0.25, hd: 0.17, h: 0.1 });
  // Striped scalloped canopy over the door
  const stripes = atlas.cell(256, 32, (c, w, h) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? '#fff5e6' : COL.terra;
      c.fillRect((i * w) / 8, 0, w / 8, h);
    }
  }, new THREE.PlaneGeometry(dw + 0.7, 0.72));
  const canopy = add(at(new THREE.Mesh(stripes, atlas.material), dx, 2.64, FZ + 0.3));
  canopy.rotation.x = -1.0;
  canopy.castShadow = false;
  const scal = new THREE.CircleGeometry(0.11, 10, 0, P);
  for (let i = 0; i < 8; i++) add(at(rot(mesh(scal, mat(i % 2 ? '#fff5e6' : COL.terra), { cast: false }), 0, 0, P), dx - (dw + 0.7) / 2 + 0.11 + i * ((dw + 0.48) / 7), 2.45, FZ + 0.6));
  // A lantern beside the door
  const lantern = (x, y, z) => {
    add(at(box(0.05, 0.05, 0.22, '#3f3a3a'), x, y + 0.26, z + 0.11));
    add(at(rbox(0.2, 0.06, 0.2, '#3f3a3a', 0.02), x, y + 0.17, z + 0.22));
    add(at(mesh(new THREE.BoxGeometry(0.15, 0.24, 0.15), glow, { cast: false }), x, y + 0.02, z + 0.22));
    add(at(rbox(0.19, 0.04, 0.19, '#3f3a3a', 0.015), x, y - 0.12, z + 0.22));
    return new THREE.Vector3(x, y + 0.02, z + 0.3);
  };
  const halos = [lantern(dx + 0.82, 1.7, FZ), lantern(KILN.x - 0.85, 1.6, KILN.z + 0.75)];

  // ---------------------------------------------------------------- the café window
  const wx = WIN.x;
  const ww = WIN.w;
  const winGeo = new THREE.ExtrudeGeometry(doorShape(ww + 0.2, WIN.y1 - WIN.y0 + 0.2), { depth: 0.06, bevelEnabled: false, curveSegments: 10 });
  add(at(mesh(winGeo, mat(SAGE)), wx, WIN.y0 - 0.1, FZ));
  const glowGeo = new THREE.ShapeGeometry(doorShape(ww, WIN.y1 - WIN.y0), 10);
  add(at(mesh(glowGeo, glow, { cast: false }), wx, WIN.y0, FZ + 0.065));
  add(at(box(0.05, WIN.y1 - WIN.y0, 0.04, SAGE), wx, (WIN.y0 + WIN.y1) / 2, FZ + 0.08));
  add(at(box(ww, 0.05, 0.04, SAGE), wx, WIN.y0 + 0.62, FZ + 0.08));
  // Café curtains on a rod, the sill with a plant and a cup
  add(at(rot(cyl(0.012, 0.012, ww + 0.1, '#c9a27a', 5), 0, 0, P / 2), wx, WIN.y0 + 0.62, FZ + 0.1));
  for (const s of [-1, 1]) add(at(rbox(ww / 2 - 0.04, 0.5, 0.03, '#fff7ee', 0.015), wx + s * (ww / 4), WIN.y0 + 0.36, FZ + 0.1));
  for (let i = 0; i < 6; i++) add(at(box(0.03, 0.5, 0.032, '#f3b6b9'), wx - ww / 2 + 0.1 + i * ((ww - 0.2) / 5), WIN.y0 + 0.36, FZ + 0.1));
  add(at(rbox(ww + 0.36, 0.07, 0.22, COL.terra, 0.02), wx, WIN.y0 - 0.12, FZ + 0.1));
  add(at(makePlant(0.55, '#fff1dc'), wx - 0.3, WIN.y0 - 0.085, FZ + 0.13));
  add(at(makeCup('#ffffff'), wx + 0.25, WIN.y0 - 0.085, FZ + 0.13));

  add(at(frieze(B.x0 + 0.5, SHOP.x + SHOP.w / 2 + 0.2), (B.x0 + 0.5 + SHOP.x + SHOP.w / 2 + 0.2) / 2, 2.72, FZ + 0.012));
  add(at(frieze(WIN.x - 0.6, B.x1 - 0.35), (WIN.x - 0.6 + B.x1 - 0.35) / 2, 2.72, FZ + 0.012));

  // ---------------------------------------------------------------- the bottle kiln
  const kiln = makeBottleKiln(KILN.r, brickMat);
  kiln.root.position.set(KILN.x, 0, KILN.z);
  add(kiln.root);
  col({ type: 'circle', x: KILN.x, z: KILN.z, r: KILN.r + 0.12 });
  const kilnPlaque = atlas.panel(0.5, 0.2, 200, 80, (c, w, h) => {
    c.fillStyle = '#4a3a36';
    roundRect(c, 2, 2, w - 4, h - 4, 12);
    c.fill();
    c.fillStyle = '#ffd9a6';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 34px ${FONT}`;
    c.fillText('Kiln', w / 2, h / 2 + 2);
  });
  add(rot(at(kilnPlaque, KILN.x, 1.45, KILN.z + KILN.r * 1.0 + 0.03), -0.08, 0, 0));
  // A tiny heart scratched into one brick
  const brickHeart = atlas.panel(0.12, 0.08, 60, 40, (c, w, h) => {
    c.fillStyle = '#c8674a';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#f6d2b8';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(w / 2, h - 8);
    c.bezierCurveTo(w / 2 - 18, h / 2 - 2, w / 2 - 8, 6, w / 2, 14);
    c.bezierCurveTo(w / 2 + 8, 6, w / 2 + 18, h / 2 - 2, w / 2, h - 8);
    c.stroke();
  });
  add(rot(at(brickHeart, KILN.x + 0.62, 0.78, KILN.z + 0.75), 0, 0.72, 0));
  // Woodpile for the kiln
  const LX = KILN.x + 0.62;
  const LZ = KILN.z + 1.35;
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 4 - row; i++) {
      const x = LX - 0.27 + i * 0.18 + row * 0.09;
      const y = 0.09 + row * 0.155;
      add(at(rot(cyl(0.085, 0.085, 0.5, i % 2 ? '#a0602e' : '#b8743a', 10), P / 2, 0, 0), x, y, LZ));
      add(at(rot(cyl(0.066, 0.066, 0.505, '#e9c79a', 10), P / 2, 0, 0), x, y, LZ));
    }
  }
  col({ type: 'box', x: LX, z: LZ, hw: 0.38, hd: 0.27, h: 0.5 });

  // ---------------------------------------------------------------- the terrace
  const tw = TERRACE.x1 - TERRACE.x0;
  const td = TERRACE.z1 - TERRACE.z0;
  const tGeo = uvScale(new THREE.PlaneGeometry(tw, td), tw / 2, td / 2);
  const floor = add(at(mesh(tGeo, umat('#ffffff', { rough: 0.85, map: terraceTex() }), { cast: false }), (TERRACE.x0 + TERRACE.x1) / 2, 0.012, (TERRACE.z0 + TERRACE.z1) / 2));
  floor.rotation.x = -P / 2;
  add(at(box(tw + 0.1, 0.05, 0.1, COL.terraDark), (TERRACE.x0 + TERRACE.x1) / 2, 0.025, TERRACE.z1 + 0.04));
  for (const x of [TERRACE.x0, TERRACE.x1]) add(at(box(0.1, 0.05, td, COL.terraDark), x, 0.025, (TERRACE.z0 + TERRACE.z1) / 2));
  // One tile by the door holds two thumbprints pressed into a heart
  const thumbTile = atlas.panel(0.48, 0.48, 192, 192, (c, w, h) => {
    c.fillStyle = '#f4e3cc';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#e8a682';
    roundRect(c, 4, 4, w - 8, h - 8, 12);
    c.fill();
    const print = (x, y, ang) => {
      c.save();
      c.translate(x, y);
      c.rotate(ang);
      c.fillStyle = '#cf7d58';
      c.beginPath();
      c.ellipse(0, 0, 26, 40, 0, 0, P * 2);
      c.fill();
      c.strokeStyle = 'rgba(255,225,200,0.65)';
      c.lineWidth = 2.2;
      for (let r = 6; r < 38; r += 6) {
        c.beginPath();
        c.ellipse(0, 4, r * 0.66, r, 0, P * 1.05, P * 1.95 + 0.6);
        c.stroke();
      }
      c.restore();
    };
    print(w / 2 - 22, h / 2 - 8, -0.62);
    print(w / 2 + 22, h / 2 - 8, 0.62);
    c.fillStyle = 'rgba(140,63,34,0.7)';
    c.font = `600 22px ${FONT}`;
    c.textAlign = 'center';
    c.fillText('R', w / 2 - 34, h - 22);
    c.fillText('H', w / 2 + 34, h - 22);
  });
  add(rot(at(thumbTile, -0.05, 0.018, 0.1), -P / 2, 0, 0));

  // String lights from the eaves to two posts at the front of the terrace
  for (const [x, z] of POSTS) {
    add(at(cyl(0.05, 0.065, 2.95, COL.woodDark, 8), x, 1.475, z));
    add(at(sph(0.08, COL.terra, undefined, 10), x, 2.99, z));
    add(at(cyl(0.12, 0.14, 0.12, COL.terraDark, 12), x, 0.06, z));
    col({ type: 'circle', x, z, r: 0.12 });
  }
  const eaveY = B.h - EAVE * slope - 0.05;
  const EZ = FZ + EAVE - 0.05;
  const lights = makeStringLights([
    [B.x0 - 0.2, eaveY, EZ, POSTS[0][0], 2.86, POSTS[0][1], 0.25],
    [POSTS[0][0], 2.86, POSTS[0][1], POSTS[1][0], 2.86, POSTS[1][1], 0.3],
    [B.x1 + 0.2, eaveY, EZ, POSTS[1][0], 2.86, POSTS[1][1], 0.25],
    [SHOP.x, eaveY, EZ, -1.2, 2.72, POSTS[0][1] - 0.02, 0.22],
    [WIN.x, eaveY, EZ, -1.0, 2.72, POSTS[1][1] - 0.02, 0.22],
  ]);
  add(lights.group);

  // Coffee table for two, with a reader in one chair and the café cat asleep on the other
  const tx = TABLE.x;
  const tz = TABLE.z;
  add(at(makeTable(0.5), tx, 0, tz));
  col({ type: 'circle', x: tx, z: tz, r: 0.54, h: 0.76 });
  const chairs = [[-0.72, P / 2, COL.rose], [0.72, -P / 2, COL.mint]];
  for (const [ox, yaw, c] of chairs) {
    const ch = makeChair(c);
    ch.rotation.y = yaw;
    add(at(ch, tx + ox, 0, tz));
    col({ type: 'circle', x: tx + ox, z: tz, r: 0.27 });
  }
  const steamFrom = [];
  const mugRH = makeMug('#fff1dc', COL.terra);
  add(at(mugRH, tx + 0.2, 0.76, tz - 0.12));
  const rh = atlas.panel(0.07, 0.05, 56, 40, (c, w, h) => {
    c.fillStyle = '#fff1dc';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#d9734e';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 22px ${FONT}`;
    c.fillText('R+H', w / 2, h / 2 + 1);
  });
  add(at(rh, tx + 0.2, 0.82, tz - 0.12 + 0.052));
  add(at(makeCup('#ffffff'), tx - 0.22, 0.76, tz + 0.05));
  steamFrom.push(new THREE.Vector3(tx - 0.22, 0.88, tz + 0.05), new THREE.Vector3(tx + 0.2, 0.9, tz - 0.12));
  add(at(cyl(0.13, 0.11, 0.02, '#ffffff', 16), tx + 0.05, 0.77, tz + 0.25));
  const cro = add(at(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.035, 8, 12, P * 1.2), mat('#e0a24e', { rough: 0.6 })), tx + 0.05, 0.8, tz + 0.25));
  cro.rotation.x = -P / 2;
  add(at(makeVase(1, COL.sky, 0.55), tx - 0.05, 0.76, tz - 0.25));
  add(at(cyl(0.004, 0.004, 0.16, COL.leaf, 4), tx - 0.05, 0.9, tz - 0.25));
  add(at(sph(0.03, '#ff8fb1', undefined, 8), tx - 0.05, 0.99, tz - 0.25));
  // A round woven rug under the table
  const rug = atlas.wrap(new THREE.CircleGeometry(1.05, 32), 200, 200, (c, w, h) => {
    c.fillStyle = '#f3e3cc';
    c.fillRect(0, 0, w, h);
    for (const [r, col2] of [[96, '#e9b35c'], [84, '#f8eedd'], [70, COL.mint], [60, '#f8eedd'], [40, COL.rose], [32, '#f8eedd']]) {
      c.fillStyle = col2;
      c.beginPath();
      c.arc(w / 2, h / 2, r, 0, P * 2);
      c.fill();
    }
    c.fillStyle = '#e9b35c';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * P * 2;
      c.beginPath();
      c.arc(w / 2 + Math.cos(a) * 77, h / 2 + Math.sin(a) * 77, 3.5, 0, P * 2);
      c.fill();
    }
  });
  add(rot(at(rug, tx, 0.016, tz), -P / 2, 0, 0));
  // Flower troughs along the front of the terrace, either side of the way in
  for (const [x0, x1] of [[-2.95, -1.85], [0.55, 1.15]]) {
    const xm = (x0 + x1) / 2;
    add(at(rbox(x1 - x0, 0.3, 0.26, COL.terra, 0.04), xm, 0.15, TERRACE.z1 - 0.16));
    const n = Math.round((x1 - x0) / 0.16);
    for (let i = 0; i < n; i++) {
      const x = x0 + 0.08 + i * ((x1 - x0 - 0.16) / Math.max(1, n - 1));
      add(at(sph(0.08, i % 2 ? COL.leaf : COL.leaf2, { rough: 0.8 }, 8), x, 0.34, TERRACE.z1 - 0.16));
      if (i % 2 === 0) add(at(sph(0.045, ['#ffd166', '#ff8fb1', '#b99af5'][i % 3], undefined, 8), x + 0.02, 0.42, TERRACE.z1 - 0.12));
    }
    col({ type: 'box', x: xm, z: TERRACE.z1 - 0.16, hw: (x1 - x0) / 2 + 0.02, hd: 0.15, h: 0.32 });
  }

  // The reader (a regular, frozen so they bake into the scene)
  const reader = freezeKid(new Kid({ id: 'reader', name: 'Reader', gender: 'boy', skin: '#c98f68', hair: '#2a1a13', hairstyle: 'curly', outfit: 'tee-pants', top: '#ffd166', bottom: '#2c3e66', shoes: '#3b2b3f', accent: '#ef5b6f' }), { pose: 'sit', hands: 'read' });
  reader.root.position.set(tx - 0.72, 0.3, tz);
  reader.root.rotation.y = P / 2;
  add(reader.root);
  add(rot(at(rbox(0.2, 0.26, 0.03, '#3f7bf0', 0.01), tx - 0.4, 0.86, tz), 0, P / 2, -0.35));
  // The café cat, curled up on the other chair
  const cat = makeCat();
  cat.root.scale.setScalar(1.3);
  cat.root.position.set(tx + 0.72, 0.475, tz + 0.02);
  cat.root.rotation.y = -0.4;
  add(dyn(cat.root));
  // A water bowl for the cat by the door
  add(at(cyl(0.12, 0.1, 0.06, '#8fd6c6', 14), dx + 0.82, 0.03, FZ + 0.32));
  add(at(cyl(0.1, 0.1, 0.005, '#9fd8ef', 14), dx + 0.82, 0.062, FZ + 0.32));
  // A lemon tree in a big pot and leafy pots at the corners
  const lemon = (x, z) => {
    add(at(cyl(0.34, 0.26, 0.55, COL.terra, 16), x, 0.275, z));
    add(at(tor(0.335, 0.04, COL.terraDark, undefined, P * 2, 6, 18), x, 0.53, z).rotateX(P / 2));
    add(at(cyl(0.045, 0.06, 1.1, '#8b5e3c', 8), x, 0.95, z));
    for (const [ox, oy, oz, r] of [[0, 1.75, 0, 0.46], [0.3, 1.55, 0.12, 0.32], [-0.28, 1.6, -0.1, 0.34], [0.05, 2.05, -0.05, 0.3]]) add(at(sph(r, oy > 1.9 ? COL.leaf2 : COL.leaf, { rough: 0.8 }, 12), x + ox, oy, z + oz));
    for (const [ox, oy, oz] of [[0.32, 1.72, 0.3], [-0.36, 1.5, 0.22], [0.12, 1.42, 0.4], [-0.1, 1.95, 0.34], [0.45, 1.45, -0.1]]) add(at(sph(0.06, '#ffd84a', { rough: 0.5 }, 8), x + ox, oy, z + oz)).scale.set(1, 0.85, 0.85);
    col({ type: 'circle', x, z, r: 0.38 });
  };
  lemon(-4.55, 1.75);
  for (const [x, z, s, k] of [[B.x0 - 0.38, FZ + 0.32, 1.2, 'tall'], [B.x1 - 0.28, FZ + 0.32, 1.05, 'round']]) {
    add(at(makePlant(s, COL.terra, k), x, 0, z));
    col({ type: 'circle', x, z, r: 0.22 * s });
  }

  // The chalkboard menu
  const CBX = 0.05;
  const CBZ = 2.3;
  const board = atlas.panel(0.62, 0.84, 248, 336, (c, w, h) => {
    c.fillStyle = '#3c4a45';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#c98f5f';
    c.lineWidth = 14;
    c.strokeRect(0, 0, w, h);
    c.textAlign = 'center';
    c.fillStyle = '#fff6e6';
    c.font = `700 40px ${FONT}`;
    c.fillText('Today', w / 2, 52);
    c.font = `500 25px ${FONT}`;
    c.fillStyle = '#ffd6a6';
    c.fillText('Spanish latte', w / 2, 96);
    c.fillStyle = '#ffffff';
    c.fillText('Pecan cake', w / 2, 128);
    c.fillStyle = '#c9f0e2';
    c.fillText('Clay class', w / 2, 160);
    // A chalk doodle of Roji and Homama holding hands under a heart
    const kid = (x, hair, dress) => {
      c.strokeStyle = '#ffffff';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(x, 228, 15, 0, P * 2);
      c.stroke();
      c.fillStyle = hair;
      c.beginPath();
      c.arc(x, 222, 15, P, 0);
      c.fill();
      c.strokeStyle = dress;
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(x, 244);
      c.lineTo(x - 13, 286);
      c.lineTo(x + 13, 286);
      c.closePath();
      c.stroke();
      c.strokeStyle = '#ffffff';
      c.beginPath();
      c.moveTo(x - 5, 286);
      c.lineTo(x - 5, 304);
      c.moveTo(x + 5, 286);
      c.lineTo(x + 5, 304);
      c.stroke();
    };
    kid(w / 2 - 30, '#e6b8a0', '#ff8fb1');
    kid(w / 2 + 30, '#cfd6e6', '#8fc1ff');
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(w / 2 - 18, 262);
    c.lineTo(w / 2 + 18, 262);
    c.stroke();
    c.fillStyle = '#ff8fb1';
    c.beginPath();
    c.moveTo(w / 2, 206);
    c.bezierCurveTo(w / 2 - 14, 194, w / 2 - 8, 182, w / 2, 190);
    c.bezierCurveTo(w / 2 + 8, 182, w / 2 + 14, 194, w / 2, 206);
    c.fill();
  });
  const cb = new THREE.Group();
  cb.position.set(CBX, 0, CBZ);
  cb.rotation.y = 0.12;
  for (const s of [1, -1]) {
    const leaf = new THREE.Group();
    leaf.rotation.x = s * -0.2;
    leaf.add(at(rbox(0.7, 0.94, 0.04, '#c98f5f', 0.02), 0, 0.5, 0));
    if (s > 0) leaf.add(at(board, 0, 0.52, 0.025));
    cb.add(at(leaf, 0, 0, s * 0.02));
  }
  add(cb);
  col({ type: 'box', x: CBX, z: CBZ, hw: 0.36, hd: 0.24 });

  // A bench under the café window with cushions
  const BX = WIN.x - 0.05;
  const BZ = FZ + 0.42;
  add(at(rbox(1.1, 0.08, 0.4, COL.wood, 0.03), BX, 0.42, BZ));
  for (const s of [-1, 1]) add(at(box(0.08, 0.38, 0.34, COL.woodDark), BX + s * 0.45, 0.19, BZ));
  add(rot(at(rbox(0.36, 0.3, 0.12, COL.rose, 0.06), BX - 0.28, 0.6, BZ - 0.12), -0.2, 0.1, 0));
  add(rot(at(rbox(0.34, 0.28, 0.12, COL.sun, 0.06), BX + 0.12, 0.6, BZ - 0.12), -0.2, -0.1, 0));
  add(at(rbox(0.3, 0.05, 0.26, '#b99af5', 0.02), BX + 0.36, 0.485, BZ + 0.02));
  col({ type: 'box', x: BX, z: BZ, hw: 0.56, hd: 0.21, h: 0.47 });

  // The open-air pottery wheel, a potter throwing a vase on it, and a tray of tools
  const wheel = makeWheel(COL.sun);
  add(at(wheel.root, WHEEL.x, 0, WHEEL.z));
  const throwPot = makeThrowPot(umat(COL.clay, { rough: 0.45, side: THREE.DoubleSide }));
  bake(wheel.head);
  wheel.head.add(throwPot.mesh);
  dyn(wheel.head);
  const stool = makeStool(COL.rose);
  add(at(stool, WHEEL.x, 0, WHEEL.z - 0.62));
  col({ type: 'circle', x: WHEEL.x, z: WHEEL.z, r: 0.42 });
  col({ type: 'circle', x: WHEEL.x, z: WHEEL.z - 0.62, r: 0.32 });
  // The potter: frozen at the wheel except for her head, which looks up at whoever comes by
  const potter = freezeKid(new Kid({ id: 'potter', name: 'Potter', gender: 'girl', skin: '#e3b08e', hair: '#4a2c1a', hairstyle: 'bob', outfit: 'overalls', top: '#fff7ee', bottom: '#8fd6c6', shoes: '#3b2b3f', accent: COL.terra }), { pose: 'sit', hands: 'carry' });
  potter.root.scale.setScalar(1.1);
  potter.root.position.set(WHEEL.x, 0.26, WHEEL.z - 0.66);
  add(potter.root);
  colorBake(potter.head, [], { single: true });
  bakeMat(potter.head);
  dyn(potter.head);
  // Tool crate beside the wheel
  add(at(rbox(0.42, 0.36, 0.34, COL.woodLight, 0.03), WHEEL.x + 0.72, 0.18, WHEEL.z - 0.2));
  add(at(cyl(0.07, 0.06, 0.12, COL.sky, 12), WHEEL.x + 0.64, 0.42, WHEEL.z - 0.22));
  for (let k = 0; k < 3; k++) add(rot(at(cyl(0.007, 0.007, 0.2, COL.woodLight, 5), WHEEL.x + 0.62 + k * 0.02, 0.52, WHEEL.z - 0.22), 0, 0, (k - 1) * 0.25));
  add(at(sph(0.09, COL.clay, undefined, 10), WHEEL.x + 0.82, 0.42, WHEEL.z - 0.14)).scale.y = 0.7;
  col({ type: 'box', x: WHEEL.x + 0.72, z: WHEEL.z - 0.2, hw: 0.23, hd: 0.19, h: 0.37 });

  // Crates of pots for sale at the front corner, with a tag
  const crate = (x, y, z, w2, h2) => {
    add(at(box(w2, h2, 0.5, '#d9a571'), x, y + h2 / 2, z));
    for (const s of [-1, 1]) add(at(box(0.04, h2 + 0.01, 0.52, '#b9824f'), x + s * (w2 / 2 - 0.02), y + h2 / 2, z));
    for (const yy of [0.33, 0.66]) add(at(box(w2 + 0.01, 0.04, 0.52, '#b9824f'), x, y + h2 * yy, z));
  };
  crate(CRATES.x, 0, CRATES.z, 0.9, 0.42);
  crate(CRATES.x + 0.05, 0.42, CRATES.z - 0.02, 0.6, 0.3);
  [[0, COL.mint, 1.2], [2, COL.sun, 1.0], [3, '#fff1dc', 1.0], [4, COL.rose, 1.1]].forEach(([k, c, s], i) => add(at(makeVase(k, c, s), CRATES.x - 0.32 + i * 0.21, i === 1 || i === 2 ? 0.72 : 0.42, CRATES.z + 0.08 - (i === 1 || i === 2 ? 0.02 : 0) + (i % 2) * 0.04)));
  const forSale = atlas.panel(0.42, 0.16, 168, 64, (c, w, h) => {
    c.fillStyle = '#fffaf1';
    roundRect(c, 2, 2, w - 4, h - 4, 12);
    c.fill();
    c.fillStyle = COL.terraDark;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 28px ${FONT}`;
    c.fillText('Handmade', w / 2, h / 2 + 2);
  });
  add(rot(at(forSale, CRATES.x - 0.1, 0.24, CRATES.z + 0.26), 0, 0, 0.05));
  add(at(cyl(0.26, 0.2, 0.62, '#c46b47', 16), CRATES.x + 0.68, 0.31, CRATES.z - 0.05));
  add(at(cyl(0.2, 0.26, 0.12, '#c46b47', 16), CRATES.x + 0.68, 0.68, CRATES.z - 0.05));
  col({ type: 'box', x: CRATES.x + 0.15, z: CRATES.z, hw: 0.78, hd: 0.3 });

  // The clay wind chime under the canopy
  const chime = makeChime();
  chime.position.set(dx + 0.62, 2.48, FZ + 0.55);
  add(dyn(chime));

  // ---------------------------------------------------------------- the side yard: drying shelf and clay bags
  const yx = B.x0 - 0.42;
  for (const s of [-1, 1]) add(at(box(0.05, 1.3, 0.05, COL.woodDark), yx + 0.18, 0.65, -2.25 + s * 0.75));
  for (const s of [-1, 1]) add(at(box(0.05, 1.3, 0.05, COL.woodDark), yx - 0.18, 0.65, -2.25 + s * 0.75));
  for (const y of [0.45, 0.95]) {
    add(at(box(0.42, 0.04, 1.56, COL.woodLight), yx, y, -2.25));
    for (let i = 0; i < 4; i++) add(at(makeVase((i + (y > 0.6 ? 2 : 0)) % 5, '#d8c7b8', 0.85), yx, y + 0.02, -2.8 + i * 0.36));
  }
  for (let i = 0; i < 2; i++) add(at(rot(rbox(0.36, 0.2, 0.3, ['#cdb8a6', '#d9a184'][i], 0.07), 0, i * 0.4, 0), yx, 0.1, -2.6 + i * 0.6));
  add(at(cyl(0.12, 0.1, 0.2, COL.sky, 12), B.x0 - 0.3, 0.1, -1.1));
  add(rot(at(cyl(0.015, 0.02, 0.22, COL.sky, 6), B.x0 - 0.16, 0.22, -1.1), 0, 0, -0.9));

  // ---------------------------------------------------------------- moving bits
  // Smoke from the kiln, steam from the cups, halos round the lanterns after dark
  const smoke = [];
  for (let i = 0; i < 3; i++) {
    const s = add(dyn(softSprite('#e6dfd8', 0.6, 0.5)));
    smoke.push({ s, ph: i / 3 });
  }
  const steam = [];
  steamFrom.forEach((p, i) => {
    const s = add(dyn(softSprite('#ffffff', 0.4, 0.12)));
    steam.push({ s, p, ph: i * 0.5 });
  });
  const haloSprites = halos.map((p) => {
    const s = add(dyn(softSprite('#ffd38a', 0, 0.9)));
    s.position.copy(p);
    return s;
  });
  const kilnHalo = add(dyn(softSprite('#ff9a4a', 0.3, 1.1)));
  kilnHalo.position.set(KILN.x + kiln.mouthPos.x, kiln.mouthPos.y, KILN.z + kiln.mouthPos.z + 0.1);
  const fireA = new THREE.Color('#ff8a3c');
  const fireB = new THREE.Color('#ffc46a');
  dyn(kiln.root.children.find((o) => o.material === kiln.mouth));

  // Sparrows pecking crumbs under the table; they flutter up to the ridge when someone comes close
  const NB = 3;
  const birds = makeSparrows(NB);
  add(dyn(birds.bodies), dyn(birds.wings));
  const flock = [
    { home: new THREE.Vector3(tx + 0.85, 0, tz + 0.75), perch: new THREE.Vector3(B.x0 + 0.7, RIDGE.y + 0.18, RIDGE.z) },
    { home: new THREE.Vector3(tx + 1.3, 0, tz + 0.7), perch: new THREE.Vector3(B.x0 + 1.05, RIDGE.y + 0.18, RIDGE.z) },
    { home: new THREE.Vector3(1.0, 0, 2.15), perch: new THREE.Vector3(B.x1 - 0.5, RIDGE.y + 0.18, RIDGE.z) },
  ].map((b, i) => ({ ...b, pos: b.home.clone(), from: b.home.clone(), to: b.home.clone(), state: 'ground', k: 1, wait: 1 + i * 0.7, yaw: i * 2, hop: 0, peck: 0 }));
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const one = new THREE.Vector3(1, 1, 1);
  const v = new THREE.Vector3();
  const wingPos = new THREE.Vector3();

  // Plain-coloured static parts become a few vertex-coloured meshes
  dynamic.push(...colorBake(g, dynamic));

  // The update only knows "near"; remember where the player is from the station's own update
  const me = new THREE.Vector3(0, 0, 50);
  const baseUpdate = st.update.bind(st);
  st.update = (dt, t, pos) => {
    me.set(pos.x - st.origin.x, 0, pos.z - st.origin.z);
    baseUpdate(dt, t, pos);
  };
  const nightOf = () => Math.min(1, Math.max(0, (glow.emissiveIntensity / 0.5 - 1) / 1.8));
  let spin = 0;
  let watch = 0;

  return {
    badgeY: 7.7,
    dynamic,
    update(dt, t) {
      const far = me.length();
      if (far > 55) return;
      const night = nightOf();
      // The wheel and the vase rising on it: lump, throw, hold, then a fresh lump
      spin += dt * 7;
      wheel.head.rotation.y = spin;
      const u = (t % 16) / 16;
      const k = u < 0.12 ? 0 : u < 0.75 ? (u - 0.12) / 0.63 : 1;
      const kk = k * k * (3 - 2 * k);
      throwPot.shape(kk, t * 6);
      throwPot.mesh.scale.setScalar(u > 0.95 ? Math.max(0.05, 1 - (u - 0.95) * 20) : u < 0.03 ? Math.max(0.05, u / 0.03) : 1);
      const near = far < 4.5 ? 1 : 0;
      watch += (near - watch) * Math.min(1, dt * 2.5);
      const look = Math.atan2(me.x - WHEEL.x, me.z - (WHEEL.z - 0.66));
      potter.head.rotation.x = 0.32 * (1 - watch) - 0.05 * watch;
      potter.head.rotation.y = Math.max(-0.8, Math.min(0.8, look)) * watch;
      // Cat: breathing, tail swish, an ear twitch and a peek at whoever comes close
      cat.body.scale.y = 1 + Math.sin(t * 2.1) * 0.035;
      cat.tail.rotation.y = Math.sin(t * 1.3) * 0.3 + Math.sin(t * 3.7) * 0.05;
      const catNear = Math.hypot(me.x - (tx + 0.72), me.z - tz) < 2.2 ? 1 : 0;
      cat.head.rotation.x += ((catNear ? -0.35 : 0.08) - cat.head.rotation.x) * Math.min(1, dt * 3);
      cat.head.rotation.z = Math.sin(t * 0.4) > 0.97 ? 0.15 : 0;
      // Smoke and steam
      for (const p of smoke) {
        const s = (t * 0.12 + p.ph) % 1;
        p.s.position.set(KILN.x + Math.sin(s * 5 + p.ph * 7) * 0.12 + s * 0.6, kiln.smoke.y + s * 2.0, KILN.z - s * 0.2);
        p.s.scale.setScalar(0.45 + s * 1.3);
        p.s.material.opacity = 0.62 * Math.sin(Math.min(1, s * 1.4) * P) * (1 - night * 0.4);
      }
      for (const p of steam) {
        const s = (t * 0.45 + p.ph) % 1;
        p.s.position.set(p.p.x + Math.sin(s * 6 + p.ph * 5) * 0.03, p.p.y + s * 0.35, p.p.z);
        p.s.scale.setScalar(0.07 + s * 0.14);
        p.s.material.opacity = 0.5 * Math.sin(s * P);
      }
      // Lantern halos, fire in the kiln mouth
      for (const s of haloSprites) {
        s.material.opacity = night * 0.65;
        s.visible = night > 0.03;
      }
      const flick = 0.5 + Math.sin(t * 7.3) * 0.25 + Math.sin(t * 13.1) * 0.15;
      kiln.mouth.color.copy(fireA).lerp(fireB, flick);
      kilnHalo.material.opacity = 0.18 + night * 0.4 + flick * 0.1;
      kilnHalo.scale.setScalar(1.0 + flick * 0.15 + night * 0.4);
      chime.rotation.z = Math.sin(t * 1.7) * 0.08 + Math.sin(t * 0.63) * 0.05;
      chime.rotation.x = Math.sin(t * 1.1 + 1) * 0.05;
      // Sparrows
      flock.forEach((b, i) => {
        const scared = Math.hypot(me.x - b.pos.x, me.z - b.pos.z) < 2.3;
        if (b.state === 'ground') {
          if (scared) {
            b.state = 'fly';
            b.from.copy(b.pos);
            b.to.copy(b.perch);
            b.k = 0;
          } else {
            b.wait -= dt;
            b.peck = Math.max(0, b.peck - dt * 4);
            if (b.wait <= 0) {
              if (Math.random() < 0.55) b.peck = 1;
              else {
                b.from.copy(b.pos);
                const a = Math.random() * P * 2;
                b.to.set(b.home.x + Math.cos(a) * 0.35, 0, b.home.z + Math.sin(a) * 0.3);
                b.yaw = Math.atan2(b.to.x - b.from.x, b.to.z - b.from.z);
                b.k = 0;
                b.state = 'hop';
              }
              b.wait = 0.6 + Math.random() * 1.4;
            }
          }
        } else if (b.state === 'hop') {
          b.k = Math.min(1, b.k + dt * 3);
          b.pos.lerpVectors(b.from, b.to, b.k);
          b.pos.y = Math.sin(b.k * P) * 0.08;
          if (b.k >= 1) b.state = 'ground';
          if (scared) b.state = 'ground';
        } else if (b.state === 'fly' || b.state === 'back') {
          b.k = Math.min(1, b.k + dt * 0.7);
          b.pos.lerpVectors(b.from, b.to, b.k);
          b.pos.y += Math.sin(b.k * P) * 1.2;
          b.yaw = Math.atan2(b.to.x - b.from.x, b.to.z - b.from.z);
          if (b.k >= 1) {
            b.state = b.state === 'fly' ? 'perch' : 'ground';
            b.wait = 3 + i;
            b.yaw = b.state === 'perch' ? 0 : b.yaw;
          }
        } else if (b.state === 'perch') {
          b.wait -= dt;
          if (b.wait <= 0 && !scared && Math.hypot(me.x - b.home.x, me.z - b.home.z) > 3.2) {
            b.state = 'back';
            b.from.copy(b.pos);
            b.to.copy(b.home);
            b.k = 0;
          }
        }
        const flying = b.state === 'fly' || b.state === 'back';
        const tilt = b.state === 'ground' ? b.peck * 0.7 : 0;
        q.setFromEuler(e.set(tilt, b.yaw, 0));
        m4.compose(b.pos, q, one);
        birds.bodies.setMatrixAt(i, m4);
        for (const s of [-1, 1]) {
          const flap = flying ? Math.sin(t * 38 + i) * 0.9 : 0.15;
          q.setFromEuler(e.set(tilt, b.yaw, s * flap));
          wingPos.set(0, 0.085, -0.01).applyEuler(e.set(tilt, b.yaw, 0)).add(b.pos);
          m4.compose(wingPos, q, v.set(s, 1, 1));
          birds.wings.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), m4);
        }
      });
      birds.bodies.instanceMatrix.needsUpdate = true;
      birds.wings.instanceMatrix.needsUpdate = true;
    },
  };
}
