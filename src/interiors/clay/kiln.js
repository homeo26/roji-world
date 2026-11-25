import * as THREE from 'three';
import { COL, box, rbox, cyl, sph, tor, at, rot, mat, umat, mesh, roundRect, FONT, glowTex, makeVase, makePlant, makeShelf, makeKiln, colorBake } from './models.js';
import { TARGETS, GLAZES, PATTERNS, targetOuter, potGeometry, potMaterial, setPotLook } from './pots.js';
import { X1, ZB, CW, MID, KILN, GLAZE_TABLE, FRESH, TILE_WALL } from './layout.js';

// The kiln room: the big kiln with its glowing door, the glaze shelf, the glazing table with six buckets,
// the table of fresh pots, a bench to wait on and the wall of guests' clay tiles (one of them holds two
// thumbprints pressed into a heart). Moments: glaze a pot together, then fire it in the kiln.

const P = Math.PI;
const BUCKETS = [1, 3, 2, 4, 5, 7]; // GLAZES indices on the glazing table: sky, rose, mint, butter, lilac, cobalt
const KS = 1.4; // kiln scale

const potOf = (shape) => {
  const tg = TARGETS[shape % TARGETS.length];
  const geo = potGeometry(targetOuter(tg, 16), 24);
  const m = new THREE.Mesh(geo, potMaterial('fired'));
  m.castShadow = true;
  m.receiveShadow = true;
  const maxR = Math.max(...tg.pts.map((q) => q[1]));
  m.scale.setScalar(Math.min(0.26 / (tg.h * 0.68), 0.13 / (maxR * 0.68)));
  return m;
};

export function buildKilnRoom(R) {
  const { add, dyn, col, circ, hot, upd, atlas, api } = R;
  const tone = R.tone;
  const v = new THREE.Vector3();

  // ---------------------------------------------------------------- the kiln
  const kiln = makeKiln();
  kiln.root.scale.setScalar(KS);
  add(at(kiln.root, KILN.x, 0, KILN.z));
  for (const o of kiln.root.children) if (o.material === kiln.glow) dyn(o);
  colorBake(kiln.door, [], { single: true });
  dyn(kiln.door);
  dyn(kiln.needle);
  circ(KILN.x, KILN.z, 1.05);
  const kilnGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#ffa65c', transparent: true, depthWrite: false, opacity: 0.4 }));
  kilnGlow.scale.setScalar(1.3);
  kilnGlow.position.set(KILN.x, 0.95, KILN.z + 0.95);
  add(dyn(kilnGlow));
  const mouth = new THREE.Vector3(KILN.x, 0.84, KILN.z + 0.7);
  const front = new THREE.Vector3(KILN.x, 0.95, KILN.z + 1.45);
  // Woodpile, gloves, tongs and a "Hot!" sign
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 4 - row; i++) {
      const x = KILN.x - 1.75 + i * 0.19 + row * 0.095;
      const y = 0.09 + row * 0.16;
      add(rot(at(cyl(0.09, 0.09, 0.6, i % 2 ? '#a0602e' : '#b8743a', 10), x, y, KILN.z + 0.1), P / 2, 0, 0));
      add(rot(at(cyl(0.07, 0.07, 0.605, '#e9c79a', 10), x, y, KILN.z + 0.1), P / 2, 0, 0));
    }
  }
  col(KILN.x - 1.47, KILN.z + 0.1, 0.42, 0.32, 0.5);
  const hotSign = atlas.panel(0.8, 0.42, 200, 105, (c, w, h) => {
    c.fillStyle = '#ffd166';
    roundRect(c, 4, 4, w - 8, h - 8, 18);
    c.fill();
    c.lineWidth = 6;
    c.strokeStyle = '#e07a3a';
    c.stroke();
    c.fillStyle = '#ef5b6f';
    c.beginPath();
    c.moveTo(40, 80);
    c.bezierCurveTo(14, 64, 30, 40, 40, 22);
    c.bezierCurveTo(50, 40, 66, 60, 40, 80);
    c.fill();
    c.fillStyle = '#8c3f22';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 40px ${FONT}`;
    c.fillText('Hot!', 128, h / 2 + 3);
  });
  add(at(hotSign, KILN.x - 1.6, 1.95, ZB + 0.03));
  add(at(box(0.6, 0.05, 0.08, COL.wood), KILN.x - 1.6, 1.42, ZB + 0.05));
  for (const dx of [-0.15, 0.12]) add(at(rbox(0.12, 0.2, 0.05, '#ef5b6f', 0.03), KILN.x - 1.6 + dx, 1.27, ZB + 0.08));
  R.lamp(R.g, KILN.x + 1.5, 2.0, ZB, COL.sun);
  R.fairy(R.g, MID + 0.4, X1 - 0.4, 3.05, ZB + 0.16);
  R.windowAt(X1 - 1.4, 1.85, 1.3, 1.2, COL.sun);

  // A low shelf of bisque ware under the window and a trolley with a tray of pots by the kiln
  const BSX = X1 - 1.4;
  add(at(makeShelf(1.6, 0.4, [0.3, 0.75, 1.1], COL.woodLight), BSX, 0, ZB + 0.24));
  for (const y of [0.325, 0.775]) for (let i = 0; i < 4; i++) add(at(makeVase((i + Math.round(y * 3)) % 5, '#ecd9c6', 0.85), BSX - 0.55 + i * 0.37, y, ZB + 0.24));
  col(BSX, ZB + 0.24, 0.82, 0.24);
  const TRX = KILN.x + 1.55;
  const TRZ = KILN.z + 0.4;
  add(at(rbox(0.9, 0.05, 0.6, COL.steel, 0.02, { metal: 0.4, rough: 0.4 }), TRX, 0.72, TRZ));
  add(at(rbox(0.9, 0.05, 0.6, COL.steel, 0.02, { metal: 0.4, rough: 0.4 }), TRX, 0.3, TRZ));
  for (const [dx, dz] of [[-0.42, -0.27], [0.42, -0.27], [-0.42, 0.27], [0.42, 0.27]]) {
    add(at(cyl(0.015, 0.015, 0.7, COL.steelDark, 6), TRX + dx, 0.4, TRZ + dz));
    add(at(rot(cyl(0.045, 0.045, 0.03, '#3f3a3a', 10), P / 2, 0, 0), TRX + dx, 0.045, TRZ + dz));
  }
  add(rot(at(tor(0.12, 0.015, COL.steelDark, undefined, P, 5, 10), TRX + 0.52, 0.85, TRZ), 0, P / 2, P / 2));
  for (let i = 0; i < 3; i++) add(at(makeVase(i + 1, '#ecd9c6', 0.9), TRX - 0.28 + i * 0.28, 0.745, TRZ));
  for (let i = 0; i < 2; i++) add(at(rbox(0.3, 0.16, 0.3, ['#cdb8a6', '#d9a184'][i], 0.05), TRX - 0.2 + i * 0.4, 0.405, TRZ));
  col(TRX, TRZ, 0.5, 0.34, 0.75);

  // ---------------------------------------------------------------- glaze shelf
  const GSX = MID + 1.6;
  add(at(makeShelf(1.9, 0.36, [0.35, 0.95, 1.55], COL.woodLight), GSX, 0, ZB + 0.2));
  col(GSX, ZB + 0.2, 0.98, 0.2);
  GLAZES.forEach(([, c], i) => {
    const y = i < 4 ? 0.975 : 1.575;
    const x = GSX - 0.66 + (i % 4) * 0.44;
    add(at(cyl(0.08, 0.08, 0.2, '#ffffff', 12), x, y + 0.1, ZB + 0.2));
    add(at(cyl(0.081, 0.081, 0.09, c, 12), x, y + 0.08, ZB + 0.2));
    add(at(cyl(0.06, 0.06, 0.04, c, 12), x, y + 0.22, ZB + 0.2));
  });
  for (let i = 0; i < 3; i++) add(at(cyl(0.16, 0.15, 0.28, ['#ffffff', '#f3e6dc', '#ffffff'][i], 14), GSX - 0.55 + i * 0.55, 0.49, ZB + 0.2));

  // ---------------------------------------------------------------- glazing table
  const { x: GX, z: GZ } = GLAZE_TABLE;
  add(at(rbox(2.2, 0.07, 0.95, '#f7efe6', 0.03), GX, 0.78, GZ));
  for (const [dx, dz] of [[-1.0, -0.38], [1.0, -0.38], [-1.0, 0.38], [1.0, 0.38]]) add(at(box(0.07, 0.75, 0.07, COL.woodDark), GX + dx, 0.37, GZ + dz));
  add(at(box(2.0, 0.04, 0.8, COL.woodDark), GX, 0.2, GZ));
  col(GX, GZ, 1.1, 0.49, 0.82);
  const bucketPos = BUCKETS.map((gi, i) => new THREE.Vector3(GX - 0.85 + i * 0.34, 0.815, GZ - 0.26));
  BUCKETS.forEach((gi, i) => {
    const p = bucketPos[i];
    add(at(cyl(0.155, 0.13, 0.26, '#ffffff', 16), p.x, p.y + 0.13, p.z));
    add(at(cyl(0.142, 0.142, 0.012, GLAZES[gi][1], 16), p.x, p.y + 0.262, p.z));
    add(at(tor(0.15, 0.012, COL.steelDark, undefined, P, 5, 12), p.x, p.y + 0.26, p.z));
  });
  // Banding wheel in the middle and a board where a glazed pot waits for the kiln
  const band = new THREE.Group();
  band.position.set(GX - 0.2, 0.815, GZ + 0.15);
  band.add(at(cyl(0.12, 0.14, 0.05, COL.steelDark, 16), 0, 0.025, 0));
  const plate = new THREE.Group();
  plate.position.y = 0.06;
  plate.add(at(cyl(0.17, 0.17, 0.02, COL.steel, 20), 0, 0, 0));
  band.add(plate);
  add(band);
  dyn(plate);
  const READY = new THREE.Vector3(GX + 0.75, 0.84, GZ + 0.15);
  add(at(rbox(0.5, 0.04, 0.4, COL.woodLight, 0.01), READY.x, 0.82, READY.z));
  const readyTag = atlas.panel(0.42, 0.12, 168, 48, (c, w, h) => {
    c.fillStyle = '#fffaf1';
    roundRect(c, 2, 2, w - 4, h - 4, 10);
    c.fill();
    c.fillStyle = '#e07a3a';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 20px ${FONT}`;
    c.fillText('Ready for the kiln', w / 2, h / 2 + 1, w - 10);
  });
  add(rot(at(readyTag, READY.x, 0.79, READY.z + 0.215), -0.2, 0, 0));
  // Brushes in a jar and a sponge
  add(at(cyl(0.05, 0.045, 0.12, COL.terra, 10), GX + 0.35, 0.875, GZ - 0.25));
  for (let k = 0; k < 3; k++) add(rot(at(cyl(0.007, 0.007, 0.2, COL.woodLight, 5), GX + 0.35 + (k - 1) * 0.02, 0.98, GZ - 0.25), 0, 0, (k - 1) * 0.25));
  add(at(rbox(0.12, 0.05, 0.08, COL.sun, 0.02), GX + 0.55, 0.84, GZ - 0.2));
  const brush = new THREE.Group();
  brush.add(at(cyl(0.007, 0.007, 0.22, COL.woodLight, 5), 0, 0.11, 0));
  brush.add(at(cyl(0.012, 0.006, 0.04, '#4a3423', 6), 0, -0.01, 0));
  brush.visible = false;
  add(dyn(brush));
  // Drips while a pot comes out of a bucket
  const drips = [0, 1].map(() => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), umat('#ffffff', { rough: 0.2 }));
    d.visible = false;
    add(dyn(d));
    return d;
  });

  // ---------------------------------------------------------------- fresh from the kiln
  const { x: FX, z: FZ } = FRESH;
  add(at(rbox(2.0, 0.5, 0.75, '#fff3e4', 0.05), FX, 0.25, FZ));
  add(at(rbox(2.08, 0.06, 0.83, COL.terra, 0.03), FX, 0.52, FZ));
  col(FX, FZ, 1.04, 0.42, 0.55);
  const freshSign = atlas.panel(1.0, 0.26, 260, 68, (c, w, h) => {
    c.fillStyle = '#ffffff';
    roundRect(c, 3, 3, w - 6, h - 6, 16);
    c.fill();
    c.fillStyle = '#d9734e';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 ${h * 0.46}px ${FONT}`;
    c.fillText('Fresh from the kiln', w / 2, h / 2 + 2, w - 30);
  });
  add(rot(at(freshSign, FX, 0.32, FZ + 0.38), -0.1, 0, 0));
  const SLOTS = [-0.72, -0.36, 0, 0.36, 0.72];
  const freshHolder = dyn(add(new THREE.Group()));
  const placeholder = new THREE.Group();
  [[0, COL.rose], [2, COL.sky], [4, COL.sun], [1, COL.lilac], [3, COL.mint]].forEach(([k, c], i) => placeholder.add(at(makeVase(k, c, 1.05), FX + SLOTS[i], 0.55, FZ + (i % 2) * 0.12 - 0.06)));
  add(dyn(placeholder));
  const fired = () => api.load('fired', []).slice(-5);
  const drawFresh = () => {
    for (const o of [...freshHolder.children]) {
      o.geometry.dispose();
      o.removeFromParent();
    }
    const list = fired();
    list.forEach((it, i) => {
      const m = potOf(it.shape);
      setPotLook(m.material, 'glazed', it.color, it.pattern);
      m.position.set(FX + SLOTS[i], 0.55, FZ + (i % 2) * 0.12 - 0.06);
      m.rotation.y = i * 1.3;
      freshHolder.add(m);
    });
    placeholder.children.forEach((c, i) => (c.visible = i >= list.length));
  };
  drawFresh();
  // A bench to wait on
  const BX = X1 - 1.4;
  const BZ = -0.95;
  add(at(rbox(1.8, 0.1, 0.55, COL.wood, 0.03), BX, 0.42, BZ));
  for (const dx of [-0.75, 0.75]) add(at(box(0.1, 0.38, 0.45, COL.woodDark), BX + dx, 0.19, BZ));
  for (const [dx, c] of [[-0.45, COL.rose], [0.4, COL.sky]]) add(rot(at(rbox(0.38, 0.32, 0.12, c, 0.06), BX + dx, 0.62, BZ - 0.18), -0.15, 0, 0));
  col(BX, BZ, 0.9, 0.28, 0.47);
  add(at(makePlant(1.0, COL.terra, 'tall'), X1 - 0.45, 0, -2.6));
  add(at(makePlant(0.8, COL.mint), MID + 0.5, 0, -0.4));
  circ(X1 - 0.45, -2.6, 0.22);
  circ(MID + 0.5, -0.4, 0.2);

  // ---------------------------------------------------------------- the guests' tile wall
  const { z0: tz0, z1: tz1 } = TILE_WALL;
  const TL = tz1 - tz0;
  const tiles = atlas.panel(TL, 1.15, 360, 138, (c, w, h) => {
    c.fillStyle = '#c98f5f';
    c.fillRect(0, 0, w, h);
    const cols = 8;
    const rows = 3;
    const tw = (w - 12) / cols;
    const th = (h - 12) / rows;
    const tones = ['#e8a07a', '#f0c9ae', '#e3ab8a', '#f5d6bd'];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = 6 + i * tw;
      const y = 6 + j * th;
      c.fillStyle = tones[(i + j * 3) % 4];
      roundRect(c, x + 2, y + 2, tw - 4, th - 4, 5);
      c.fill();
      const cx = x + tw / 2;
      const cy = y + th / 2;
      c.strokeStyle = 'rgba(140,63,34,0.55)';
      c.fillStyle = 'rgba(140,63,34,0.35)';
      c.lineWidth = 2;
      const kind = (i * 7 + j * 3) % 5;
      if (i === 5 && j === 1) {
        // Two thumbprints pressed into a heart, R and H scratched underneath
        for (const s of [-1, 1]) {
          c.save();
          c.translate(cx + s * 5, cy - 2);
          c.rotate(s * 0.65);
          c.fillStyle = 'rgba(160,70,40,0.55)';
          c.beginPath();
          c.ellipse(0, 0, 6, 10, 0, 0, P * 2);
          c.fill();
          c.strokeStyle = 'rgba(255,225,200,0.6)';
          c.lineWidth = 1;
          for (let r = 2; r < 9; r += 2.5) {
            c.beginPath();
            c.ellipse(0, 1, r * 0.6, r, 0, P, P * 2);
            c.stroke();
          }
          c.restore();
        }
        c.fillStyle = 'rgba(140,63,34,0.8)';
        c.font = `600 9px ${FONT}`;
        c.textAlign = 'center';
        c.fillText('R  H', cx, cy + 16);
      } else if (kind === 0) {
        c.beginPath();
        c.arc(cx, cy, 9, 0, P * 2);
        c.stroke();
      } else if (kind === 1) {
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * P * 2;
          c.beginPath();
          c.arc(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, 3.5, 0, P * 2);
          c.fill();
        }
      } else if (kind === 2) {
        c.beginPath();
        c.moveTo(cx - 9, cy + 6);
        c.quadraticCurveTo(cx, cy - 14, cx + 9, cy + 6);
        c.stroke();
        c.beginPath();
        c.moveTo(cx, cy - 6);
        c.lineTo(cx, cy + 10);
        c.stroke();
      } else if (kind === 3) {
        c.beginPath();
        c.ellipse(cx - 3, cy, 5, 8, -0.3, 0, P * 2);
        c.fill();
      } else {
        c.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * P * 2 - P / 2;
          const r = k % 2 ? 4 : 10;
          if (k) c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          else c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        c.closePath();
        c.stroke();
      }
    }
  });
  add(rot(at(tiles, X1 - 0.02, 1.45, (tz0 + tz1) / 2), 0, -P / 2, 0));
  const tileLabel = atlas.panel(0.9, 0.22, 230, 56, (c, w, h) => {
    c.fillStyle = '#fff7ea';
    roundRect(c, 3, 3, w - 6, h - 6, 14);
    c.fill();
    c.fillStyle = '#8c3f22';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 ${h * 0.46}px ${FONT}`;
    c.fillText("Guests' tiles", w / 2, h / 2 + 2);
  });
  add(rot(at(tileLabel, X1 - 0.02, 2.22, (tz0 + tz1) / 2), 0, -P / 2, 0));

  // ---------------------------------------------------------------- the pot on the glazing table
  let pot = null; // the mesh on the banding wheel or the ready board
  let potInfo = null; // { shape, color, pattern } once glazed
  const newBisque = () => {
    if (pot) pot.removeFromParent();
    const n = api.load('glazedCount', 0);
    pot = potOf(n);
    pot.userData.shape = n % TARGETS.length;
    plate.add(pot);
    pot.position.set(0, 0.01, 0);
    potInfo = null;
  };
  const restoreReady = () => {
    const r = api.load('ready', null);
    if (!r) {
      if (!pot) newBisque();
      return;
    }
    if (pot) pot.removeFromParent();
    pot = potOf(r.shape);
    setPotLook(pot.material, 'glazed', r.color, r.pattern);
    pot.position.copy(READY);
    R.g.add(pot);
    dyn(pot);
    potInfo = r;
  };
  restoreReady();
  R.onEnter(() => {
    if (job) return;
    restoreReady();
    drawFresh();
  });

  // One job at a time runs in the room's update: glazing or firing. It finishes even if the kids walk off.
  let job = null;
  const lerp3 = (out, a, b, k, lift = 0) => out.lerpVectors(a, b, k).setY(a.y + (b.y - a.y) * k + Math.sin(k * P) * lift);
  const ease = (x) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
  const toRoom = (o) => {
    o.updateMatrixWorld(true);
    o.getWorldPosition(v);
    R.g.worldToLocal(v);
    o.removeFromParent();
    R.g.add(o);
    o.position.copy(v);
    o.rotation.set(0, 0, 0);
  };
  const glazeJob = (bucket, color, pattern) => {
    const b = bucketPos[bucket];
    const start = new THREE.Vector3(GX - 0.2, 0.89, GZ + 0.15);
    const above = new THREE.Vector3(b.x, 1.25, b.z);
    const inBucket = new THREE.Vector3(b.x, 0.83, b.z);
    toRoom(pot);
    pot.position.copy(start);
    dyn(pot);
    let dipped = false;
    let patterned = false;
    return {
      t: 0,
      step(dt, a) {
        const t = (this.t += dt);
        if (t < 1.2) lerp3(pot.position, start, above, ease(t / 1.2), 0.15);
        else if (t < 2.0) lerp3(pot.position, above, inBucket, ease((t - 1.2) / 0.8));
        else if (t < 2.6) {
          if (!dipped) {
            dipped = true;
            setPotLook(pot.material, 'glazed', color, 'plain');
            tone(180, 0.25, { gain: 0.08, slideTo: 90 });
            tone(620, 0.12, { gain: 0.03, type: 'triangle' });
          }
        } else if (t < 3.4) lerp3(pot.position, inBucket, above, ease((t - 2.6) / 0.8));
        else if (t < 4.6) lerp3(pot.position, above, start, ease((t - 3.4) / 1.2), 0.15);
        // Drips falling back into the bucket
        drips.forEach((d, i) => {
          const q = t - 3.0 - i * 0.35;
          d.visible = q > 0 && q < 0.5;
          if (d.visible) {
            d.material.color.set(color);
            d.position.set(above.x + (i ? 0.03 : -0.02), above.y - 0.05 - q * q * 3, above.z);
          }
        });
        // Homama paints the pattern while the banding wheel turns
        if (t > 4.6 && t < 8.0) {
          plate.rotation.y += dt * 2.2;
          pot.position.copy(start);
          pot.rotation.y = plate.rotation.y;
          brush.visible = true;
          brush.position.set(start.x + 0.16, start.y + 0.12 + Math.sin(t * 5) * 0.05, start.z + 0.05);
          brush.rotation.set(0, 0, 0.6 + Math.sin(t * 5) * 0.2);
          if (Math.floor(t * 3) !== Math.floor((t - dt) * 3)) tone(900 + Math.random() * 300, 0.05, { gain: 0.015, type: 'triangle' });
        }
        if (t > 7.2 && !patterned) {
          patterned = true;
          setPotLook(pot.material, 'glazed', color, pattern);
          pot.getWorldPosition(v);
          a.fx.burst(v.clone().add(new THREE.Vector3(0, 0.25, 0)), [color, '#ffffff', '#ffd166'], 24);
          a.sound.ui('good');
        }
        if (t > 8.0 && t < 9.2) {
          brush.visible = false;
          lerp3(pot.position, start, READY, ease((t - 8.0) / 1.2), 0.2);
        }
        if (t >= 9.2) {
          pot.position.copy(READY);
          potInfo = { shape: pot.userData.shape ?? 0, color, pattern };
          api.save('ready', potInfo);
          api.save('glazedCount', api.load('glazedCount', 0) + 1);
          const gname = (GLAZES.find((g) => g[1] === color) || ['Pretty'])[0].toLowerCase();
          const pname = (PATTERNS.find((p) => p.id === pattern) || PATTERNS[0]).name.toLowerCase();
          a.toast(`Glazed ${gname}${pattern === 'plain' ? '' : ` with ${pname}`}. It is ready for the kiln next to it.`, 3200);
          return true;
        }
        return false;
      },
    };
  };
  const doorOpen = (k) => (kiln.door.rotation.y = -1.75 * ease(k));
  const fireJob = () => {
    toRoom(pot);
    const from = pot.position.clone();
    const out = front.clone();
    const info = potInfo;
    let dinged = false;
    let saved = false;
    let shiny = false;
    const s0 = pot.scale.x;
    const slot = new THREE.Vector3(FX + SLOTS[Math.min(4, fired().length)], 0.55, FZ);
    return {
      t: 0,
      step(dt, a) {
        const t = (this.t += dt);
        if (t < 1.0) doorOpen(t);
        if (t > 0.4 && t < 2.0) lerp3(pot.position, from, mouth, ease((t - 0.4) / 1.6), 0.5);
        if (t > 1.6 && t < 2.0) pot.scale.setScalar(s0 * (1 - (t - 1.6) * 0.3));
        if (t > 2.0 && t < 2.8) doorOpen(1 - (t - 2.0) / 0.8);
        if (t > 2.0 && t < 8.6) pot.visible = false;
        // Heat up, hum, cool a little
        const heat = t < 2.8 ? 0 : t < 5.5 ? (t - 2.8) / 2.7 : t < 8.0 ? 1 : Math.max(0, 1 - (t - 8.0) / 2.5);
        R.kilnHeat = heat;
        if (t > 2.8 && t < 8.0 && Math.floor(t * 2) !== Math.floor((t - dt) * 2)) tone(70 + heat * 30, 0.5, { gain: 0.05, type: 'triangle' });
        if (t > 8.0 && !dinged) {
          dinged = true;
          tone(1318.5, 1.4, { gain: 0.08 });
          tone(2637, 0.9, { gain: 0.03, attack: 0.01 });
          a.toast('Ding!', 1200);
        }
        if (t > 8.2 && t < 9.0) doorOpen((t - 8.2) / 0.8);
        if (t > 8.6 && t < 9.6) {
          pot.visible = true;
          pot.scale.setScalar(s0);
          lerp3(pot.position, mouth, out, ease((t - 8.6) / 1.0), 0.2);
          if (!shiny) {
            shiny = true;
            setPotLook(pot.material, 'glazed', info.color, info.pattern);
            pot.material.roughness = 0.12;
          }
        }
        if (t > 9.6 && !saved) {
          saved = true;
          pot.getWorldPosition(v);
          a.fx.burst(v.clone().add(new THREE.Vector3(0, 0.3, 0)), [info.color, '#ffffff', '#ffd166', '#ff8fb1'], 40);
          a.sound.ui('win');
        }
        if (t > 9.8 && t < 11.2) lerp3(pot.position, out, slot, ease((t - 9.8) / 1.4), 0.4);
        if (t > 9.8 && t < 10.6) doorOpen(1 - (t - 9.8) / 0.8);
        if (t >= 11.2) {
          doorOpen(0);
          api.save('fired', [...api.load('fired', []), info].slice(-5));
          api.save('ready', null);
          pot.removeFromParent();
          pot = null;
          drawFresh();
          newBisque();
          const gname = (GLAZES.find((g) => g[1] === info.color) || ['Pretty'])[0].toLowerCase();
          const shape = TARGETS[info.shape % TARGETS.length].name.toLowerCase();
          a.toast(`Out comes a shiny ${gname} ${shape}. It sits on the Fresh from the kiln table now.`, 3400);
          return true;
        }
        return false;
      },
    };
  };
  R.kilnHeat = 0;
  // Warm sparks drifting out of the chimney while it fires
  const chimneyTop = new THREE.Vector3(KILN.x + kiln.chimney.x * KS, kiln.chimney.y * KS, KILN.z + kiln.chimney.z * KS);
  const sparks = Array.from({ length: 6 }, (_, i) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: i % 2 ? '#ffb36b' : '#ffd166', transparent: true, depthWrite: false, opacity: 0 }));
    sp.visible = false;
    add(dyn(sp));
    return { sp, ph: i / 6 };
  });
  let pulse = 0;
  upd((dt, t, a) => {
    if (job && job.step(dt, a)) job = null;
    pulse = Math.max(0, pulse - dt);
    const heat = Math.max(R.kilnHeat, pulse > 0 ? Math.sin((pulse / 1.2) * P) * 0.35 : 0);
    const k = 0.35 + Math.sin(t * 2.1) * 0.08 + Math.sin(t * 5.3) * 0.04 + heat * 2.0;
    kiln.glow.emissiveIntensity = k;
    kilnGlow.material.opacity = Math.min(0.95, 0.25 + k * 0.32);
    kilnGlow.scale.setScalar(1.3 + heat * 0.9);
    kiln.needle.rotation.z = -0.4 + Math.sin(t * 0.7) * 0.08 - heat * 1.6;
    for (const p of sparks) {
      const q = (t * 0.6 + p.ph) % 1;
      p.sp.visible = R.kilnHeat > 0.05;
      if (!p.sp.visible) continue;
      p.sp.position.set(chimneyTop.x + Math.sin(q * 7 + p.ph * 9) * 0.12, chimneyTop.y + q * 0.9, chimneyTop.z + Math.cos(q * 5 + p.ph * 4) * 0.08);
      p.sp.scale.setScalar(0.08 + (1 - q) * 0.08);
      p.sp.material.opacity = R.kilnHeat * Math.sin(q * P);
    }
  });

  // ---------------------------------------------------------------- moments
  hot({
    x: GX,
    z: GZ + 1.0,
    r: 1.4,
    label: 'Glaze a pot',
    icon: 'palette',
    act: async (a) => {
      if (job) return a.toast('One thing at a time. Let this one finish.', 1800);
      if (potInfo) return a.toast('This one is glazed and waiting. Fire it in the kiln first.', 2600);
      const color = await a.choose({
        title: 'Pick a glaze',
        text: 'Roji chooses the colour. The pot gets dipped right in.',
        options: BUCKETS.map((gi) => ({ id: GLAZES[gi][1], label: GLAZES[gi][0] })),
      });
      if (!color || job || potInfo) return;
      const pattern = await a.choose({
        title: 'And a pattern',
        text: 'Homama paints it on with the thin brush.',
        options: PATTERNS.map((p) => ({ id: p.id, label: p.name })),
      });
      if (!pattern || job || potInfo) return;
      const bucket = BUCKETS.findIndex((gi) => GLAZES[gi][1] === color);
      job = glazeJob(Math.max(0, bucket), color, pattern);
      a.activity({
        label: 'Done',
        seats: [
          { who: 'roji', x: GX - 0.55, z: GZ + 0.78, yaw: P, pose: 'stand', hands: 'hold' },
          { who: 'homama', x: GX + 0.3, z: GZ + 0.8, yaw: P - 0.25, pose: 'stand', hands: 'stir' },
        ],
        focus: { x: GX - 0.1, z: GZ, y: 1.0, zoom: 0.42 },
        exit: { x: GX, z: GZ + 1.2 },
        update: () => {
          if (!job) a.endActivity();
        },
      });
    },
  });
  hot({
    x: KILN.x,
    z: KILN.z + 2.0,
    r: 1.4,
    label: 'Fire the kiln',
    icon: 'star',
    act: (a) => {
      if (job) return a.toast('One thing at a time. Let this one finish.', 1800);
      if (!potInfo) {
        pulse = 1.2;
        a.toast('Glaze a pot at the glazing table first. Then it bakes in here.', 2800);
        return;
      }
      job = fireJob();
      a.activity({
        label: 'Done',
        seats: [
          { who: 'player', x: KILN.x - 0.75, z: KILN.z + 2.3, yaw: P, pose: 'stand' },
          { who: 'partner', x: KILN.x + 0.75, z: KILN.z + 2.3, yaw: P, pose: 'stand' },
        ],
        focus: { x: KILN.x, z: KILN.z + 1.1, y: 1.0, zoom: 0.5 },
        exit: { x: KILN.x, z: KILN.z + 2.6 },
        update: () => {
          if (!job) a.endActivity();
        },
      });
      a.toast('In it goes. The kiln heats up...', 2400);
    },
  });
}
