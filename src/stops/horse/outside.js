import { THREE, P, COL, kit, mat, umat, mesh, makeAtlas, colorBake, boardDraw, fitText, heartPath, canvasTexture, roundRect, FONT, skinify, uvScale } from './kit.js';
import { makeStablePony, addHalter, ponyIdle, makeCat, makeHen, makeSaddle, makeLantern, makeHelmet, wearHelmet, glowSprite, boardsTexture, makeFork } from './kit.js';
import { makePony } from '../../stations.js';
import { Kid } from '../../kid.js';

// Roji's Riding Stable, outside: a red and white barn with a hay loft, a cupola and a weathervane,
// Biscuit and Clover looking out of their stall doors, the paddock where the riding teacher lunges
// the pony, hay bales to hop on, a mounting block, saddles on the fence, hens and the barn cat.
// Local coordinates: st.origin is the centre; the front (the path) is +Z. Footprint x -6.5..6.5, z -5..3.

export const BARN = { x0: 0.7, x1: 6.3, z0: -4.9, z1: -1.3, eave: 2.9 };
export const DOOR = { x: 3.5, hw: 0.7, h: 2.05 };
const PAD = { x0: -6.3, x1: -0.2, z0: -4.8, z1: 2.3, g0: -2.1, g1: -0.3 };
const RING = { x: -3.25, z: -1.25, rx: 1.95, rz: 2.35 };
const STALLS = [
  { x: 1.7, name: 'Biscuit', coat: '#d39a5c', mane: '#fff1d6', blaze: true, halter: COL.blue, seed: 0.4 },
  { x: 5.3, name: 'Clover', coat: '#e4ded8', mane: '#ffffff', blaze: false, halter: COL.mint, seed: 2.1, spots: '#c7bdb5' },
];
const TEACHER = { id: 'teacher', name: 'Riding teacher', gender: 'girl', skin: '#c98f68', hair: '#3a2316', hairstyle: 'ponytail', outfit: 'overalls', top: '#ffffff', bottom: '#7d9a62', shoes: '#4a2c1a', accent: '#ffd166' };

export function buildOutside(st) {
  const g = st.group;
  const k = kit();
  const { box, rbox, cyl, sph, tor, cone, at, rot } = k;
  const dynamic = [];
  const dyn = (o) => (dynamic.push(o), o);
  const add = (o) => (g.add(o), o);
  const col = (c) => st.addCollider(c);
  const atlas = makeAtlas(1024, 512);
  const v = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const { x0, x1, z0, z1, eave } = BARN;
  const BW = x1 - x0;
  const BD = z1 - z0;
  const bx = (x0 + x1) / 2;
  const bz = (z0 + z1) / 2;
  const hb = BD / 2;

  // ---------------------------------------------------------------- ground: the yard and the paddock sand
  const yard = canvasTexture(512, 360, (c, w, h) => {
    c.filter = 'blur(10px)';
    c.fillStyle = 'rgba(214,180,132,0.95)';
    roundRect(c, 26, 18, w - 52, h - 56, 60);
    c.fill();
    c.filter = 'none';
    c.fillStyle = 'rgba(160,120,80,0.18)';
    for (let i = 0; i < 70; i++) {
      c.beginPath();
      c.arc(40 + ((i * 97) % (w - 80)), 30 + ((i * 53) % (h - 90)), 2 + (i % 3), 0, P * 2);
      c.fill();
    }
    // Stepping stones from the path to the barn door
    c.fillStyle = 'rgba(206,196,184,1)';
    for (const [x, y, r] of [[226, 312, 22], [254, 270, 20], [224, 228, 21], [250, 186, 19], [228, 146, 20]]) {
      c.beginPath();
      c.ellipse(x, y, r * 1.3, r, 0.2, 0, P * 2);
      c.fill();
    }
  });
  const yw = 6.9;
  const yd = 4.9;
  const yardMesh = mesh(new THREE.PlaneGeometry(yw, yd), new THREE.MeshStandardMaterial({ map: yard, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }), { cast: false });
  yardMesh.rotation.x = -P / 2;
  yardMesh.position.set(3.15, 0.012, z1 + yd / 2 - 0.15);
  add(dyn(yardMesh));
  const sw = PAD.x1 - PAD.x0;
  const sd = PAD.z1 - PAD.z0;
  const sand = canvasTexture(512, 600, (c, w, h) => {
    c.fillStyle = '#ecd3a2';
    c.fillRect(0, 0, w, h);
    const X = (x) => ((x - PAD.x0) / sw) * w;
    const Y = (z) => ((z - PAD.z0) / sd) * h;
    c.strokeStyle = 'rgba(196,158,104,0.35)';
    c.lineWidth = (0.75 / sw) * w;
    c.beginPath();
    c.ellipse(X(RING.x), Y(RING.z), (RING.rx / sw) * w, (RING.rz / sd) * h, 0, 0, P * 2);
    c.stroke();
    // Hoof prints round the track
    c.fillStyle = 'rgba(150,110,70,0.35)';
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * P * 2;
      const px = X(RING.x + Math.cos(a) * RING.rx) + (i % 2 ? 5 : -5) * Math.cos(a);
      const py = Y(RING.z + Math.sin(a) * RING.rz) + (i % 2 ? 5 : -5) * Math.sin(a);
      c.save();
      c.translate(px, py);
      c.rotate(Math.atan2(RING.rz * Math.cos(a), -RING.rx * Math.sin(a)));
      c.beginPath();
      c.arc(0, 0, 5, -P * 0.1, P * 1.1, true);
      c.lineWidth = 3;
      c.strokeStyle = 'rgba(150,110,70,0.4)';
      c.stroke();
      c.restore();
    }
    c.fillStyle = 'rgba(255,255,255,0.25)';
    for (let i = 0; i < 90; i++) {
      c.beginPath();
      c.arc((i * 131) % w, (i * 71) % h, 1.5 + (i % 3), 0, P * 2);
      c.fill();
    }
  });
  const sandMesh = mesh(new THREE.PlaneGeometry(sw, sd), new THREE.MeshStandardMaterial({ map: sand, roughness: 1 }), { cast: false });
  sandMesh.rotation.x = -P / 2;
  sandMesh.position.set((PAD.x0 + PAD.x1) / 2, 0.018, (PAD.z0 + PAD.z1) / 2);
  add(sandMesh);

  // ---------------------------------------------------------------- the barn
  const redBoards = boardsTexture(COL.red, '#b4423c');
  const wallM = new THREE.MeshStandardMaterial({ map: redBoards, roughness: 0.85 });
  const fw = new THREE.BoxGeometry(BW, eave, 0.16);
  uvScale(fw, BW, eave);
  add(at(mesh(fw, wallM), bx, eave / 2, z1 - 0.08));
  add(at(mesh(fw, wallM), bx, eave / 2, z0 + 0.08));
  // Gambrel profile (z from the centre, y): the wall and the inner line of the roof
  const BRK = { z: 1.1, y: 3.75 };
  const RIDGE = 4.35;
  const OV = 0.25;
  const s1 = (BRK.y - eave) / (hb - BRK.z);
  const inner = [[hb + OV, eave - OV * s1], [BRK.z, BRK.y], [0, RIDGE], [-BRK.z, BRK.y], [-hb - OV, eave - OV * s1]];
  const gable = new THREE.Shape();
  gable.moveTo(-hb, 0);
  gable.lineTo(hb, 0);
  gable.lineTo(hb, eave);
  gable.lineTo(BRK.z, BRK.y);
  gable.lineTo(0, RIDGE);
  gable.lineTo(-BRK.z, BRK.y);
  gable.lineTo(-hb, eave);
  gable.closePath();
  for (const [x, ry] of [[x0, -P / 2], [x1, P / 2]]) {
    const gg = new THREE.ShapeGeometry(gable);
    gg.rotateY(ry);
    const gm = add(mesh(gg, wallM));
    gm.position.set(x, 0, bz);
  }
  // Inside faces of the gables, so the barn never looks hollow from a steep angle
  const back = new THREE.ShapeGeometry(gable);
  back.rotateY(P / 2);
  add(at(mesh(back, mat(COL.redDark, { rough: 0.9 }), { cast: false }), x0 + 0.01, 0, bz));
  const back2 = new THREE.ShapeGeometry(gable);
  back2.rotateY(-P / 2);
  add(at(mesh(back2, mat(COL.redDark, { rough: 0.9 }), { cast: false }), x1 - 0.01, 0, bz));
  // Stone footing, white corner boards and eave boards
  add(at(rbox(BW + 0.1, 0.28, BD + 0.1, COL.stone, 0.04), bx, 0.14, bz));
  for (const x of [x0, x1]) for (const z of [z0, z1]) add(at(box(0.15, eave, 0.15, COL.trim), x, eave / 2, z));
  for (const z of [z0, z1]) add(at(box(BW + 0.1, 0.12, 0.07, COL.trim), bx, eave - 0.06, z + (z === z1 ? 0.04 : -0.04)));
  // Shingled roof: one band following the gambrel, overhanging the walls
  const shingles = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = COL.roof;
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      const x = (i * w) / 4;
      for (let j = 0; j < 5; j++) {
        const y = (j + (i % 2) * 0.5) * (h / 5);
        c.fillStyle = (i + j) % 3 === 0 ? '#7480a0' : '#6a7694';
        roundRect(c, x + 3, y + 3, w / 4 - 6, h / 5 - 6, 10);
        c.fill();
      }
      c.fillStyle = 'rgba(40,46,64,0.35)';
      c.fillRect(x, 0, 4, h);
    }
  });
  shingles.wrapS = shingles.wrapT = THREE.RepeatWrapping;
  
  const roofShape = new THREE.Shape();
  const T = 0.15;
  roofShape.moveTo(inner[0][0], inner[0][1]);
  for (const [zz, yy] of inner.slice(1)) roofShape.lineTo(zz, yy);
  for (const [zz, yy] of [...inner].reverse()) roofShape.lineTo(zz, yy + T);
  roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: BW + 0.5, bevelEnabled: false });
  roofGeo.rotateY(P / 2);
  const roof = add(mesh(roofGeo, new THREE.MeshStandardMaterial({ map: shingles, roughness: 0.8 })));
  roof.position.set(x0 - 0.25, 0, bz);
  // White barge boards along the gable edges and a ridge cap
  for (const x of [x0 - 0.27, x1 + 0.27]) {
    for (let i = 0; i < inner.length - 1; i++) {
      const [za, ya] = inner[i];
      const [zb, yb] = inner[i + 1];
      const L = Math.hypot(zb - za, yb - ya) + 0.06;
      const b = add(at(box(0.06, 0.2, L, COL.trim), x, (ya + yb) / 2 + T / 2, bz + (za + zb) / 2));
      b.rotation.x = -Math.atan2(yb - ya, zb - za);
    }
  }
  add(at(box(BW + 0.56, 0.1, 0.22, COL.roofDark), bx, RIDGE + T + 0.02, bz));

  // Main door: an opening with warm light inside, two leaves swung open
  const glowM = umat('#fff0c2', { emissive: '#ffb347', ei: 0.7, rough: 0.4 });
  const inside = umat('#5b3a26', { emissive: '#ff9a4a', ei: 0.2, rough: 0.9 });
  // A peek down the aisle through the open door: stalls, a lantern, hay on the floor
  const peek = canvasTexture(256, 384, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#4a2e1f');
    gr.addColorStop(1, '#6e4630');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#8a5a3a';
    c.beginPath();
    c.moveTo(0, h);
    c.lineTo(w * 0.36, h * 0.58);
    c.lineTo(w * 0.64, h * 0.58);
    c.lineTo(w, h);
    c.fill();
    c.fillStyle = '#c99a5f';
    c.fillRect(w * 0.36, h * 0.3, w * 0.28, h * 0.28);
    c.fillStyle = '#e8c27a';
    c.fillRect(w * 0.42, h * 0.46, w * 0.16, h * 0.12);
    for (const s of [0, 1]) {
      c.fillStyle = '#7a4630';
      const x0 = s ? w * 0.64 : 0;
      c.beginPath();
      c.moveTo(s ? w : 0, h * 0.18);
      c.lineTo(s ? w * 0.64 : w * 0.36, h * 0.3);
      c.lineTo(s ? w * 0.64 : w * 0.36, h * 0.58);
      c.lineTo(s ? w : 0, h * 0.86);
      c.fill();
      c.fillStyle = '#c0463f';
      c.beginPath();
      c.moveTo(s ? w * 0.95 : w * 0.05, h * 0.52);
      c.lineTo(s ? w * 0.72 : w * 0.28, h * 0.5);
      c.lineTo(s ? w * 0.72 : w * 0.28, h * 0.62);
      c.lineTo(s ? w * 0.95 : w * 0.05, h * 0.74);
      c.fill();
      void x0;
    }
    const lg = c.createRadialGradient(w / 2, h * 0.2, 2, w / 2, h * 0.2, 70);
    lg.addColorStop(0, 'rgba(255,220,150,0.95)');
    lg.addColorStop(1, 'rgba(255,200,120,0)');
    c.fillStyle = lg;
    c.fillRect(0, 0, w, h * 0.5);
    c.fillStyle = '#ffe9b0';
    c.beginPath();
    c.arc(w / 2, h * 0.2, 9, 0, P * 2);
    c.fill();
    c.fillStyle = 'rgba(243,217,138,0.9)';
    for (let i = 0; i < 26; i++) c.fillRect((i * 53) % w, h * 0.78 + ((i * 29) % 70), 14, 3);
  });
  const peekM = new THREE.MeshStandardMaterial({ map: peek, emissive: '#ffffff', emissiveMap: peek, emissiveIntensity: 0.25, roughness: 0.9 });
  add(at(mesh(new THREE.PlaneGeometry(DOOR.hw * 2, DOOR.h), peekM, { cast: false }), DOOR.x, DOOR.h / 2, z1 + 0.005));
  add(at(box(0.12, DOOR.h + 0.06, 0.08, COL.trim), DOOR.x - DOOR.hw - 0.04, DOOR.h / 2, z1 + 0.03));
  add(at(box(0.12, DOOR.h + 0.06, 0.08, COL.trim), DOOR.x + DOOR.hw + 0.04, DOOR.h / 2, z1 + 0.03));
  add(at(box(DOOR.hw * 2 + 0.3, 0.12, 0.08, COL.trim), DOOR.x, DOOR.h + 0.04, z1 + 0.03));
  // Hay on the floor just inside, and a glimpse of a hay bale
  for (const [dx, s] of [[-0.35, 0.16], [0.1, 0.12], [0.4, 0.14], [-0.05, 0.1]]) add(at(sph(s, COL.hay, undefined, 8), DOOR.x + dx, 0.02, z1 + 0.02)).scale.set(1.6, 0.45, 0.7);
  const leaf = (dir) => {
    const lg = new THREE.Group();
    const w = DOOR.hw;
    lg.add(at(box(w, DOOR.h, 0.07, COL.red), (dir * w) / 2, DOOR.h / 2, 0));
    for (const y of [0.06, DOOR.h - 0.06]) lg.add(at(box(w, 0.1, 0.09, COL.trim), (dir * w) / 2, y, 0));
    for (const x of [0.05, w - 0.05]) lg.add(at(box(0.1, DOOR.h, 0.09, COL.trim), dir * x, DOOR.h / 2, 0));
    const diag = Math.hypot(w - 0.1, DOOR.h - 0.12);
    for (const s of [1, -1]) {
      const d = at(box(0.08, diag, 0.085, COL.trim), (dir * w) / 2, DOOR.h / 2, 0);
      d.rotation.z = s * Math.atan2(w - 0.1, DOOR.h - 0.12);
      lg.add(d);
    }
    lg.add(at(sph(0.03, '#3b2b3f'), dir * (w - 0.12), 1.0, 0.06));
    return lg;
  };
  const open = P / 2 + 0.17;
  const lL = add(leaf(1));
  lL.position.set(DOOR.x - DOOR.hw, 0, z1 + 0.04);
  lL.rotation.y = -open;
  const lR = add(leaf(-1));
  lR.position.set(DOOR.x + DOOR.hw, 0, z1 + 0.04);
  lR.rotation.y = open;
  for (const s of [-1, 1]) col({ type: 'box', x: DOOR.x + s * (DOOR.hw + 0.06), z: z1 + 0.38, hw: 0.07, hd: 0.36 });
  // Horseshoe over the door, for luck
  const shoe = add(at(tor(0.13, 0.03, mat(COL.gold, { rough: 0.3, metal: 0.6 }), P * 1.35, undefined, 18, 6), DOOR.x, DOOR.h + 0.3, z1 + 0.06));
  shoe.rotation.z = -P * 0.175 + P;
  for (const a of [0.5, 1.3, 2.1, 2.9]) add(at(sph(0.012, '#b8862b', undefined, 6), DOOR.x + Math.cos(a + P / 2) * 0.13, DOOR.h + 0.3 - Math.sin(a + P / 2) * 0.13, z1 + 0.09));
  // Wall lanterns either side of the door
  const lamps = [];
  for (const s of [-1, 1]) {
    const lx = DOOR.x + s * 1.08;
    add(at(box(0.05, 0.05, 0.22, '#3b2b3f'), lx, 2.42, z1 + 0.11));
    const ln = add(makeLantern(k, glowM));
    ln.position.set(lx, 2.12, z1 + 0.2);
    lamps.push(new THREE.Vector3(lx, 2.24, z1 + 0.2));
  }

  // Stable sign on the eave, over the door
  const sign = atlas.panel(2.5, 0.62, 1000, 248, (c, w, h) => {
    c.fillStyle = COL.trim;
    roundRect(c, 6, 6, w - 12, h - 12, 46);
    c.fill();
    c.lineWidth = 12;
    c.strokeStyle = COL.rose;
    c.stroke();
    c.fillStyle = COL.rose;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 44px ${FONT}`;
    c.fillText('Welcome to', w / 2, 62);
    c.fillStyle = '#5a3424';
    fitText(c, "Roji's Riding Stable", w / 2, 152, w - 220, 92, 700);
    for (const s of [-1, 1]) {
      c.fillStyle = COL.pink;
      heartPath(c, w / 2 + s * 420, h / 2 + 4, 54);
      c.fill();
    }
  });
  add(at(rbox(2.62, 0.72, 0.08, COL.woodDark, 0.04), DOOR.x, 3.22, z1 + 0.32));
  add(at(sign, DOOR.x, 3.22, z1 + 0.365));
  for (const s of [-1, 1]) add(at(box(0.06, 0.4, 0.3, COL.woodDark), DOOR.x + s * 1.0, 2.95, z1 + 0.16));

  // Hay loft: a little gable over the sign with its door open and hay spilling out
  const dor = new THREE.Shape();
  dor.moveTo(-0.82, 2.9);
  dor.lineTo(0.82, 2.9);
  dor.lineTo(0.82, 3.78);
  dor.lineTo(0, 4.3);
  dor.lineTo(-0.82, 3.78);
  dor.closePath();
  add(at(mesh(new THREE.ShapeGeometry(dor), wallM), DOOR.x, 0, z1 + 0.01));
  for (const s of [-1, 1]) add(at(box(0.1, 0.9, 0.8, COL.red), DOOR.x + s * 0.78, 3.33, z1 - 0.38));
  for (const s of [-1, 1]) {
    const L = Math.hypot(0.95, 0.6);
    const slab = add(at(box(L, 0.1, 1.3, COL.roof), DOOR.x + s * 0.47, 4.08, z1 - 0.38));
    slab.rotation.z = -s * Math.atan2(0.6, 0.95);
    const edge = add(at(box(L + 0.02, 0.12, 0.05, COL.trim), DOOR.x + s * 0.47, 4.08, z1 + 0.28));
    edge.rotation.z = -s * Math.atan2(0.6, 0.95);
  }
  add(at(mesh(new THREE.PlaneGeometry(0.66, 0.5), inside, { cast: false }), DOOR.x, 3.86, z1 + 0.02));
  for (const [x, y, w, h] of [[-0.37, 3.86, 0.07, 0.62], [0.37, 3.86, 0.07, 0.62], [0, 4.14, 0.8, 0.07], [0, 3.58, 0.8, 0.07]]) add(at(box(w, h, 0.06, COL.trim), DOOR.x + x, y, z1 + 0.04));
  for (const [dx, dy, s] of [[-0.18, 3.66, 0.12], [0.05, 3.67, 0.14], [0.22, 3.65, 0.11], [0.0, 3.74, 0.09]]) add(at(sph(s, COL.hay, undefined, 8), DOOR.x + dx, dy, z1 + 0.08)).scale.set(1.3, 0.6, 1);
  const loftLeaf = add(new THREE.Group());
  loftLeaf.add(at(box(0.6, 0.5, 0.05, COL.red), 0.3, 0, 0));
  loftLeaf.add(at(box(0.6, 0.06, 0.06, COL.trim), 0.3, 0.2, 0));
  loftLeaf.add(at(box(0.6, 0.06, 0.06, COL.trim), 0.3, -0.2, 0));
  loftLeaf.position.set(DOOR.x + 0.4, 3.86, z1 + 0.05);
  loftLeaf.rotation.y = -1.9;
  // Hoist beam with a pulley and a swinging rope
  add(at(box(0.12, 0.12, 0.8, COL.woodDark), DOOR.x, 4.26, z1 + 0.28));
  add(at(rot(tor(0.07, 0.02, '#3b2b3f', P * 2, undefined, 12, 5), 0, P / 2, 0), DOOR.x, 4.12, z1 + 0.6));
  const rope = dyn(new THREE.Group());
  rope.position.set(DOOR.x, 4.06, z1 + 0.62);
  rope.add(at(cyl(0.012, 0.012, 0.7, '#e9d5a8', 5), 0, -0.35, 0));
  rope.add(at(rot(tor(0.04, 0.01, COL.steel, P * 1.4, undefined, 10, 4), 0, 0, P * 0.8), 0, -0.73, 0));
  add(rope);

  // Cupola with louvres and the horse weathervane
  const CY = RIDGE + T;
  add(at(box(0.66, 0.5, 0.66, COL.trim), DOOR.x, CY + 0.2, bz));
  for (const [dx, dz, ry] of [[0, 0.335, 0], [0.335, 0, P / 2], [-0.335, 0, P / 2], [0, -0.335, 0]]) {
    for (let i = 0; i < 3; i++) add(rot(at(box(0.44, 0.04, 0.03, COL.red), DOOR.x + dx, CY + 0.08 + i * 0.12, bz + dz), 0.3, ry, 0));
  }
  const cupRoof = add(at(cone(0.56, 0.42, COL.roof, 4), DOOR.x, CY + 0.66, bz));
  cupRoof.rotation.y = P / 4;
  add(at(cyl(0.02, 0.02, 0.8, '#3b2b3f', 6), DOOR.x, CY + 1.2, bz));
  for (const ry of [0, P / 2]) add(rot(at(box(0.5, 0.02, 0.02, '#3b2b3f'), DOOR.x, CY + 1.05, bz), 0, ry, 0));
  for (const [dx, dz] of [[0.25, 0], [-0.25, 0], [0, 0.25], [0, -0.25]]) add(at(sph(0.03, COL.gold, undefined, 6), DOOR.x + dx, CY + 1.05, bz + dz));
  const vane = dyn(new THREE.Group());
  vane.position.set(DOOR.x, CY + 1.42, bz);
  const horseShape = new THREE.Shape();
  const HP = [[0, 0.62], [0.12, 0.66], [0.55, 0.64], [0.62, 0.7], [0.72, 0.92], [0.74, 1.0], [0.77, 0.94], [0.82, 0.92], [0.98, 0.78], [0.96, 0.72], [0.84, 0.74], [0.74, 0.66], [0.76, 0.52], [0.86, 0.48], [0.92, 0.36], [0.88, 0.33], [0.8, 0.42], [0.7, 0.42], [0.68, 0.08], [0.62, 0.08], [0.6, 0.38], [0.32, 0.38], [0.28, 0.08], [0.22, 0.08], [0.2, 0.36], [0.12, 0.42], [0.04, 0.36], [-0.06, 0.26], [-0.02, 0.48]];
  HP.forEach(([x, y], i) => (i ? horseShape.lineTo((x - 0.45) * 0.5, (y - 0.5) * 0.5) : horseShape.moveTo((x - 0.45) * 0.5, (y - 0.5) * 0.5)));
  horseShape.closePath();
  const gold = mat(COL.gold, { rough: 0.3, metal: 0.6 });
  const horseVane = mesh(new THREE.ExtrudeGeometry(horseShape, { depth: 0.025, bevelEnabled: false }), gold);
  horseVane.rotation.y = P / 2;
  horseVane.position.set(0, 0.05, 0);
  vane.add(horseVane);
  vane.add(at(rot(box(0.02, 0.02, 0.6, gold), 0, 0, 0), 0, -0.2, 0));
  vane.add(at(rot(cone(0.04, 0.1, gold, 6), P / 2, 0, 0), 0, -0.2, 0.33));
  vane.add(at(box(0.01, 0.12, 0.12, gold), 0, -0.2, -0.3));
  add(vane);

  // Stall doors with Biscuit and Clover looking out
  const animals = dyn(new THREE.Group());
  add(animals);
  const heads = [];
  for (const s of STALLS) {
    const w = 0.84;
    add(at(mesh(new THREE.PlaneGeometry(w, 0.85), inside, { cast: false }), s.x, 1.58, z1 + 0.006));
    const lower = new THREE.Group();
    lower.add(at(box(w, 1.15, 0.07, COL.red), 0, 0.575, 0));
    for (const y of [0.06, 1.1]) lower.add(at(box(w, 0.1, 0.09, COL.trim), 0, y, 0));
    for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) lower.add(at(box(0.1, 1.15, 0.09, COL.trim), x, 0.575, 0));
    const diag = Math.hypot(w - 0.1, 1.05);
    for (const sg of [1, -1]) lower.add(rot(at(box(0.07, diag, 0.085, COL.trim), 0, 0.575, 0), 0, 0, sg * Math.atan2(w - 0.1, 1.05)));
    lower.position.set(s.x, 0, z1 + 0.04);
    add(lower);
    for (const [x, y, ww, hh] of [[-w / 2 - 0.04, 1.58, 0.08, 0.95], [w / 2 + 0.04, 1.58, 0.08, 0.95], [0, 2.04, w + 0.16, 0.08]]) add(at(box(ww, hh, 0.07, COL.trim), s.x + x, y, z1 + 0.035));
    // Top leaf folded back against the wall, away from the door
    const out = s.x < DOOR.x ? -1 : 1;
    const top = add(new THREE.Group());
    top.add(at(box(w - 0.04, 0.82, 0.05, COL.red), 0, 0, 0));
    for (const y of [-0.36, 0.36]) top.add(at(box(w - 0.04, 0.08, 0.07, COL.trim), 0, y, 0));
    top.position.set(s.x + out * (w - 0.02), 1.58, z1 + 0.07);
    const plaque = atlas.panel(0.46, 0.15, 230, 76, boardDraw([s.name], { edge: s.halter, fill: COL.trim, ink: '#5a3424', radius: 0.4 }));
    add(at(plaque, s.x, 0.82, z1 + 0.1));
    const p = makeStablePony({ coat: s.coat, mane: s.mane, blaze: s.blaze, spots: null, headOnly: true });
    addHalter(p, s.halter);
    p.root.position.set(s.x, 0, z1 - 0.6);
    animals.add(p.root);
    heads.push({ p, seed: s.seed, look: 0, nodT: 0 });
  }
  // Planters with flowers at the barn corners
  const petal = [COL.pink, COL.sun, '#ffffff', COL.lilac];
  for (const x of [x0 + 0.3, x1 - 0.3]) {
    add(at(rbox(0.42, 0.34, 0.36, COL.woodDark, 0.04), x, 0.17, z1 + 0.32));
    for (let i = 0; i < 5; i++) {
      add(at(cyl(0.008, 0.008, 0.16, '#4f9a45', 4), x - 0.14 + i * 0.07, 0.4, z1 + 0.3 + (i % 2) * 0.06));
      add(at(sph(0.04, petal[(i + (x > 3 ? 1 : 0)) % 4], undefined, 8), x - 0.14 + i * 0.07, 0.49, z1 + 0.3 + (i % 2) * 0.06));
    }
    add(at(sph(0.13, '#6dbb58', undefined, 8), x, 0.36, z1 + 0.32)).scale.set(1.3, 0.5, 1);
    col({ type: 'box', x, z: z1 + 0.32, hw: 0.21, hd: 0.18, h: 0.4 });
  }
  col({ type: 'box', x: bx, z: bz, hw: BW / 2 + 0.06, hd: BD / 2 + 0.06 });

  // ---------------------------------------------------------------- the alley beside the barn
  // A wheelbarrow of hay, the pitchfork and a rain barrel fill the gap between the barn and the paddock
  const AX = (x0 + PAD.x1) / 2;
  const barrow = add(new THREE.Group());
  barrow.add(at(rbox(0.5, 0.24, 0.7, COL.mint, 0.05), 0, 0.42, 0));
  barrow.add(at(sph(0.2, COL.hay, undefined, 10), 0, 0.55, 0.02)).scale.set(1.1, 0.5, 1.5);
  barrow.add(at(rot(cyl(0.16, 0.16, 0.06, '#3b2b3f', 14), 0, 0, P / 2), 0, 0.16, 0.42));
  for (const s of [1, -1]) {
    barrow.add(at(box(0.04, 0.04, 0.6, COL.woodDark), 0.22 * s, 0.36, -0.42));
    barrow.add(at(box(0.04, 0.3, 0.04, COL.woodDark), 0.2 * s, 0.15, -0.2));
  }
  barrow.position.set(AX, 0, z1 - 0.7);
  const fork = add(makeFork());
  fork.position.set(AX - 0.25, 0.22, z1 - 1.5);
  fork.rotation.set(0.0, 0, 0.18);
  add(at(cyl(0.3, 0.27, 0.8, COL.woodDark, 14), AX, 0.4, z0 + 0.5));
  for (const y of [0.15, 0.65]) add(at(cyl(0.305, 0.305, 0.05, '#3b2b3f', 14), AX, y, z0 + 0.5));
  add(at(cyl(0.27, 0.27, 0.02, COL.water, 14), AX, 0.78, z0 + 0.5));
  col({ type: 'box', x: AX, z: (z0 + z1) / 2 - 0.1, hw: (x0 - PAD.x1) / 2 + 0.06, hd: BD / 2 + 0.05 });

  // ---------------------------------------------------------------- the paddock
  const fenceM = COL.trim;
  const post = (x, z, h = 1.12) => add(at(box(0.13, h, 0.13, fenceM), x, h / 2, z));
  const rail = (xa, za, xb, zb) => {
    const L = Math.hypot(xb - xa, zb - za);
    for (const y of [0.5, 0.92]) {
      const r = add(at(box(L, 0.11, 0.06, fenceM), (xa + xb) / 2, y, (za + zb) / 2));
      r.rotation.y = -Math.atan2(zb - za, xb - xa);
    }
  };
  const run = (xa, za, xb, zb) => {
    const L = Math.hypot(xb - xa, zb - za);
    const n = Math.max(1, Math.round(L / 1.0));
    for (let i = 0; i <= n; i++) post(xa + ((xb - xa) * i) / n, za + ((zb - za) * i) / n);
    rail(xa, za, xb, zb);
  };
  run(PAD.x0, PAD.z0, PAD.x1, PAD.z0);
  run(PAD.x0, PAD.z0, PAD.x0, PAD.z1);
  run(PAD.x1, PAD.z0, PAD.x1, PAD.z1);
  run(PAD.x0, PAD.z1, PAD.g0, PAD.z1);
  run(PAD.g1, PAD.z1, PAD.x1, PAD.z1);
  col({ type: 'box', x: (PAD.x0 + PAD.x1) / 2, z: PAD.z0, hw: (PAD.x1 - PAD.x0) / 2 + 0.07, hd: 0.08 });
  col({ type: 'box', x: PAD.x0, z: (PAD.z0 + PAD.z1) / 2, hw: 0.08, hd: (PAD.z1 - PAD.z0) / 2 + 0.07 });
  col({ type: 'box', x: PAD.x1, z: (PAD.z0 + PAD.z1) / 2, hw: 0.08, hd: (PAD.z1 - PAD.z0) / 2 + 0.07 });
  col({ type: 'box', x: (PAD.x0 + PAD.g0) / 2, z: PAD.z1 + 0.06, hw: (PAD.g0 - PAD.x0) / 2 + 0.07, hd: 0.14 });
  col({ type: 'box', x: (PAD.g1 + PAD.x1) / 2, z: PAD.z1, hw: (PAD.x1 - PAD.g1) / 2 + 0.07, hd: 0.08 });
  // Tall gate posts with lanterns on top, and the gate folded back against the fence
  for (const x of [PAD.g0, PAD.g1]) {
    post(x, PAD.z1, 1.42);
    add(at(box(0.2, 0.05, 0.2, fenceM), x, 1.445, PAD.z1));
    const ln = add(makeLantern(k, glowM, { s: 0.9 }));
    ln.position.set(x, 1.47, PAD.z1);
    lamps.push(new THREE.Vector3(x, 1.58, PAD.z1));
  }
  const gate = add(new THREE.Group());
  const GL = PAD.g1 - PAD.g0 - 0.12;
  for (const y of [0.3, 0.62, 0.94]) gate.add(at(box(GL, 0.09, 0.05, COL.woodLight), GL / 2, y, 0));
  for (const x of [0.04, GL / 2, GL - 0.04]) gate.add(at(box(0.08, 0.8, 0.06, COL.woodLight), x, 0.62, 0));
  gate.add(rot(at(box(0.06, Math.hypot(GL, 0.64), 0.055, COL.woodLight), GL / 2, 0.62, 0), 0, 0, Math.atan2(GL, 0.64)));
  gate.position.set(PAD.g0 - 0.08, 0, PAD.z1 + 0.12);
  gate.rotation.y = P;
  // Little heart with R + H carved on the gate post (look closely)
  const carve = atlas.panel(0.11, 0.13, 64, 76, (c, w, h) => {
    c.fillStyle = '#efe5d6';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#a77b55';
    c.lineWidth = 3;
    heartPath(c, w / 2, h / 2 + 2, 46);
    c.stroke();
    c.fillStyle = '#a77b55';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 15px ${FONT}`;
    c.fillText('R+H', w / 2, h / 2 + 2);
  });
  add(at(carve, PAD.g1, 0.72, PAD.z1 + 0.068));
  // Saddles drying on the fence: Roji's pink one and Homama's blue one
  for (const [z, pad, lc] of [[-0.45, COL.pink, COL.leather], [-1.75, COL.blue, '#6e3d25']]) {
    const sd = add(makeSaddle(k, lc, pad));
    sd.position.set(PAD.x1, 0.985, z);
  }
  // A note on the fence
  const note = atlas.panel(0.86, 0.46, 344, 184, (c, w, h) => {
    c.fillStyle = COL.trim;
    roundRect(c, 4, 4, w - 8, h - 8, 26);
    c.fill();
    c.lineWidth = 7;
    c.strokeStyle = COL.leaf;
    c.stroke();
    c.textAlign = 'center';
    c.fillStyle = '#3f9a4f';
    c.font = `700 46px ${FONT}`;
    c.fillText('Paddock', w / 2, 58);
    c.fillStyle = '#5a3424';
    c.font = `500 27px ${FONT}`;
    c.fillText('Please close the gate.', w / 2, 106);
    c.fillText('Carrots always welcome.', w / 2, 144);
  });
  add(at(rbox(0.92, 0.52, 0.04, COL.woodDark, 0.02), -5.55, 0.72, PAD.z1 + 0.07));
  add(at(note, -5.55, 0.72, PAD.z1 + 0.095));
  // Water trough and a hay rack inside the paddock
  const TX = PAD.x1 - 0.42;
  const TZ = -3.45;
  add(at(rbox(0.44, 0.46, 1.1, COL.woodDark, 0.04), TX, 0.23, TZ));
  add(at(box(0.34, 0.02, 1.0, COL.water), TX, 0.42, TZ));
  col({ type: 'box', x: TX, z: TZ, hw: 0.23, hd: 0.56, h: 0.47 });
  const HX = PAD.x0 + 0.55;
  const HZ = PAD.z0 + 0.5;
  add(at(box(0.9, 0.08, 0.5, COL.woodDark), HX, 0.95, HZ));
  for (const dx of [-0.4, 0.4]) add(at(box(0.08, 0.95, 0.08, COL.woodDark), HX + dx, 0.47, HZ + 0.2));
  add(at(rbox(0.82, 0.4, 0.42, COL.hay, 0.12), HX, 1.17, HZ));
  for (let i = 0; i < 6; i++) add(at(box(0.02, 0.42, 0.02, COL.woodDark), HX - 0.36 + i * 0.145, 1.18, HZ + 0.22));
  col({ type: 'box', x: HX, z: HZ, hw: 0.48, hd: 0.3 });

  // ---------------------------------------------------------------- the yard
  // Hay bales stacked to hop up on
  const hayTex = canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = COL.hay;
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      c.strokeStyle = i % 3 ? '#e2b851' : '#fbe6a0';
      c.lineWidth = 1.5;
      const x = (i * 37) % w;
      const y = (i * 61) % h;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 10 + (i % 7), y + ((i % 5) - 2));
      c.stroke();
    }
  });
  const hayM = new THREE.MeshStandardMaterial({ map: hayTex, roughness: 1 });
  const bale = (x, y, z, along) => {
    const w = along === 'x' ? 1.0 : 0.56;
    const d = along === 'x' ? 0.56 : 1.0;
    add(at(mesh(k.geo(`bale${along}`, () => baleGeo(w, 0.5, d)), hayM), x, y + 0.25, z));
    for (const t of [-0.25, 0.25]) {
      add(at(box(along === 'x' ? 0.035 : 0.6, 0.51, along === 'x' ? 0.6 : 0.035, COL.hayDark), x + (along === 'x' ? t : 0), y + 0.25, z + (along === 'x' ? 0 : t)));
    }
  };
  bale(5.95, 0, 1.55, 'z');
  bale(5.37, 0, 1.55, 'z');
  bale(5.66, 0.5, 1.55, 'x');
  bale(4.75, 0, 2.38, 'x');
  col({ type: 'box', x: 5.66, z: 1.55, hw: 0.58, hd: 0.5, h: 0.5 });
  col({ type: 'box', x: 5.66, z: 1.55, hw: 0.5, hd: 0.28, h: 1.0 });
  col({ type: 'box', x: 4.75, z: 2.38, hw: 0.5, hd: 0.28, h: 0.5 });
  // Mounting block by the gate
  const MB = { x: 0.45, z: 1.95 };
  for (let i = 0; i < 3; i++) {
    const h = 0.22 * (i + 1);
    add(at(rbox(0.3, h, 0.8, i % 2 ? COL.woodLight : COL.wood, 0.03), MB.x + 0.3 - i * 0.3, h / 2, MB.z));
    add(at(box(0.31, 0.03, 0.81, COL.woodDark), MB.x + 0.3 - i * 0.3, h - 0.01, MB.z));
    col({ type: 'box', x: MB.x + 0.3 - i * 0.3, z: MB.z, hw: 0.15, hd: 0.4, h });
  }
  // Two pairs of little riding boots by the block, pink and blue
  for (const [x, z, c] of [[1.3, 2.6, COL.pink], [1.67, 2.55, COL.navy]]) {
    for (const dx of [-0.06, 0.06]) {
      add(at(rbox(0.09, 0.26, 0.11, c, 0.03), x + dx, 0.13, z));
      add(at(rbox(0.09, 0.07, 0.17, c, 0.03), x + dx, 0.035, z + 0.04));
    }
    col({ type: 'box', x, z: z + 0.02, hw: 0.13, hd: 0.1, h: 0.26 });
  }

  // ---------------------------------------------------------------- animals: the barn cat and the hens
  const cat = makeCat();
  cat.root.position.set(5.6, 1.0, 1.62);
  cat.root.rotation.y = P + 0.4;
  animals.add(cat.root);
  const HEN_AREA = { x0: 2.0, x1: 4.2, z0: 0.55, z1: 2.75 };
  const hens = [];
  const henCols = [];
  ['#ffffff', '#c9773b', '#f3e2c4'].forEach((c, i) => {
    const h = makeHen(c);
    const pos = new THREE.Vector3(2.0 + i * 0.95, 0, 1.3 + (i % 2) * 0.8);
    h.root.position.copy(pos);
    animals.add(h.root);
    const hc = { type: 'circle', x: st.origin.x + pos.x, z: st.origin.z + pos.z, r: 0.17 };
    st.world.addCollider(hc);
    henCols.push(hc);
    hens.push({ h, pos, yaw: i * 2, target: pos.clone(), wait: 1 + i, peck: 0, seed: i * 1.7 });
  });
  // Every animal part becomes one skinned mesh (the pivots still move it)
  for (const m of skinify(animals, { rough: 0.66 })) m.castShadow = true;

  // ---------------------------------------------------------------- the pony on its walk, and the teacher
  const pony = makePony();
  g.add(pony.root);
  dynamic.push(pony.root);
  skinify(pony.root, { rough: 0.62 });
  const ponyCol = { type: 'circle', x: st.origin.x, z: st.origin.z, r: 0.55 };
  st.world.addCollider(ponyCol);
  let angle = P / 2;
  const ringAt = (a, out) => out.set(RING.x + Math.cos(a) * RING.rx, 0, RING.z + Math.sin(a) * RING.rz);
  const ctl = { pony, ridden: false, speed: 0, phase: 0 };
  st.pony = ctl;
  ctl.home = () => {
    ringAt(angle, pony.root.position);
  };
  ctl.legs = (dt, speed) => {
    ctl.phase += dt * (3 + speed * 1.6);
    const amp = Math.min(0.75, 0.1 + speed * 0.09);
    const s = Math.sin(ctl.phase);
    pony.legs[0].rotation.x = s * amp;
    pony.legs[3].rotation.x = s * amp;
    pony.legs[1].rotation.x = -s * amp;
    pony.legs[2].rotation.x = -s * amp;
    pony.head.rotation.x = 0.55 + Math.sin(ctl.phase * 2) * 0.05 * Math.min(1, speed / 4);
    pony.tail.rotation.x = 0.3 * Math.min(1, speed / 6) + Math.sin(ctl.phase) * 0.1;
  };
  ctl.home();
  st.gate = new THREE.Vector3(st.origin.x + (PAD.g0 + PAD.g1) / 2, 0, st.origin.z + PAD.z1 + 0.8);

  // The riding teacher stands in the middle and lunges the pony on a long line
  const teacher = new Kid(TEACHER);
  teacher.root.scale.setScalar(1.16);
  const helmet = makeHelmet('#3b2b3f', COL.sun, 'stripe');
  wearHelmet(teacher, helmet);
  const drop = [];
  teacher.root.traverse((o) => o.isMesh && !o.visible && drop.push(o));
  for (const o of drop) o.removeFromParent();
  teacher.root.position.set(RING.x, 0, RING.z);
  teacher.pose = 'stand';
  teacher.hands = 'hold';
  g.add(teacher.root);
  dynamic.push(teacher.root);
  for (const m of skinify(teacher.root, { rough: 0.6 })) m.castShadow = true;
  col({ type: 'circle', x: RING.x, z: RING.z, r: 0.34 });
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 5), mat(COL.rose, { rough: 0.7 }));
  line.castShadow = false;
  g.add(line);
  dynamic.push(line);
  let tYaw = 0;
  let cheerT = 6;

  // ---------------------------------------------------------------- lantern halos after dark
  const halos = lamps.map((p) => {
    const s = glowSprite('#ffc46b', 1.1);
    s.position.copy(p);
    return add(dyn(s));
  });
  const doorHalo = add(dyn(glowSprite('#ffb05c', 2.2)));
  doorHalo.position.set(DOOR.x, 1.0, z1 + 0.25);
  const loftHalo = add(dyn(glowSprite('#ffb05c', 0.9)));
  loftHalo.position.set(DOOR.x, 3.86, z1 + 0.15);

  // Plain-coloured static parts become a few vertex-coloured meshes
  dynamic.push(...colorBake(g, dynamic));

  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  const O = st.origin;
  return {
    badgeY: 5.9,
    dynamic,
    update(dt, t, near) {
      const awake = near > 0.02;
      // Halos follow the street lamps (they fade in from dusk)
      const glow = st.world.haloMat ? st.world.haloMat.opacity / 0.9 : 0;
      for (const h of halos) h.material.opacity = glow * 0.75;
      doorHalo.material.opacity = glow * 0.45;
      loftHalo.material.opacity = glow * 0.35;
      vane.rotation.y = 0.6 + Math.sin(t * 0.23) * 0.5 + Math.sin(t * 0.71) * 0.12;
      rope.rotation.z = Math.sin(t * 1.3) * 0.06;
      rope.rotation.x = Math.sin(t * 0.9 + 1) * 0.05;
      // The pony walks (or trots when someone is close) round the ellipse
      if (ctl.ridden) {
        ponyCol.x = 1e5;
        line.visible = false;
      } else {
        const speed = 0.8 + near * 0.9;
        const dl = Math.hypot(RING.rx * Math.sin(angle), RING.rz * Math.cos(angle));
        angle += (dt * speed) / dl;
        const p = ringAt(angle, pony.root.position);
        pony.root.rotation.y = Math.atan2(-RING.rx * Math.sin(angle), RING.rz * Math.cos(angle));
        ponyCol.x = O.x + p.x;
        ponyCol.z = O.z + p.z;
        const ph = t * (4 + near * 5);
        const amp = 0.35 + near * 0.25;
        pony.legs[0].rotation.x = Math.sin(ph) * amp;
        pony.legs[3].rotation.x = Math.sin(ph) * amp;
        pony.legs[1].rotation.x = -Math.sin(ph) * amp;
        pony.legs[2].rotation.x = -Math.sin(ph) * amp;
        pony.root.position.y = Math.abs(Math.sin(ph)) * 0.05 * (0.5 + near);
        pony.head.rotation.x = 0.55 + Math.sin(ph * 2) * 0.06;
        pony.tail.rotation.x = Math.sin(t * 3) * 0.15;
        pony.tail.rotation.z = Math.sin(t * 2.3) * 0.25;
      }
      if (!awake) return;
      // The teacher turns with the pony; when it is out for a ride she watches the gate and cheers
      const target = ctl.ridden ? 0 : Math.atan2(pony.root.position.x - RING.x, pony.root.position.z - RING.z);
      const prev = tYaw;
      let d = target - tYaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      tYaw += d * Math.min(1, dt * 6);
      teacher.root.rotation.y = tYaw;
      teacher.hands = ctl.ridden ? null : 'hold';
      cheerT -= dt;
      if (cheerT <= 0) {
        cheerT = 9 + Math.random() * 8;
        if (ctl.ridden || near > 0.8) teacher.emote(ctl.ridden ? 'wave' : 'cheer');
      }
      teacher.update(dt, t, 0, 0, (tYaw - prev) / Math.max(dt, 1e-3));
      if (!ctl.ridden) {
        teacher.handWorld(1, v);
        pony.head.localToWorld(v2.set(0, -0.2, 0.22));
        v.sub(O);
        v2.sub(O);
        const len = v.distanceTo(v2);
        line.position.copy(v).add(v2).multiplyScalar(0.5);
        line.position.y -= 0.06;
        line.scale.set(1, len, 1);
        line.quaternion.copy(q.setFromUnitVectors(up, v2.sub(v).normalize()));
        line.visible = true;
      }
      // Biscuit and Clover look about, nod, and nicker now and then
      for (const hd of heads) {
        const p = hd.p;
        ponyIdle(p, t, hd.seed);
        hd.nodT -= dt;
        if (hd.nodT <= 0) hd.nodT = 3 + ((t * 7 + hd.seed * 13) % 5);
        const nod = hd.nodT < 0.8 ? Math.sin((hd.nodT / 0.8) * P * 2) * 0.12 : 0;
        p.neck.rotation.y = Math.sin(t * 0.45 + hd.seed * 2) * 0.35;
        p.neck.rotation.x = 0.12 + Math.sin(t * 0.8 + hd.seed) * 0.05 + nod;
        p.head.rotation.z = Math.sin(t * 0.6 + hd.seed) * 0.08;
      }
      // The cat flicks its tail and lifts its head
      cat.tail.rotation.y = Math.sin(t * 1.2) * 0.35;
      cat.head.rotation.z = Math.max(0, Math.sin(t * 0.3)) * 0.35;
      cat.head.rotation.y = Math.sin(t * 0.2) * 0.3;
      // Hens potter about the yard and peck
      hens.forEach((hn, i) => {
        hn.wait -= dt;
        const to = v.copy(hn.target).sub(hn.pos);
        const dist = Math.hypot(to.x, to.z);
        let speed = 0;
        if (dist > 0.05 && hn.wait <= 0) {
          speed = 0.45;
          hn.pos.x += (to.x / dist) * speed * dt;
          hn.pos.z += (to.z / dist) * speed * dt;
          const want = Math.atan2(to.x, to.z);
          let dd = want - hn.yaw;
          dd = Math.atan2(Math.sin(dd), Math.cos(dd));
          hn.yaw += dd * Math.min(1, dt * 8);
        } else if (hn.wait <= 0) {
          hn.wait = 1.5 + ((t * 13 + i * 7) % 3);
          const r1 = (Math.sin(t * 12.9898 + i * 78.233) * 43758.5453) % 1;
          const r2 = (Math.sin(t * 39.3468 + i * 11.135) * 24634.6345) % 1;
          hn.target.set(HEN_AREA.x0 + Math.abs(r1) * (HEN_AREA.x1 - HEN_AREA.x0), 0, HEN_AREA.z0 + Math.abs(r2) * (HEN_AREA.z1 - HEN_AREA.z0));
        }
        const h = hn.h;
        h.root.position.copy(hn.pos);
        h.root.rotation.y = hn.yaw;
        const pecking = speed === 0 && hn.wait > 0.3;
        const pk = pecking ? Math.max(0, Math.sin(t * 9 + hn.seed)) : 0;
        h.body.rotation.x = pk * 0.7;
        h.head.rotation.x = pk * 0.4;
        const step = speed ? Math.sin(t * 16 + hn.seed) * 0.5 : 0;
        h.legs[0].rotation.x = step;
        h.legs[1].rotation.x = -step;
        h.body.position.y = 0.2 + (speed ? Math.abs(step) * 0.03 : 0);
        henCols[i].x = O.x + hn.pos.x;
        henCols[i].z = O.z + hn.pos.z;
      });
    },
  };
}

// A bale: a plain box with its hay texture tiled to its size
function baleGeo(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  uvScale(g, Math.max(w, d), h * 2);
  return g;
}
