import * as THREE from 'three';
import { makeAtlas, makeSky, fit, uvScale, texMat } from '../places/home/kit.js';
import { COL, box, rbox, cyl, sph, tor, at, rot, mat, umat, mesh, canvasTexture, roundRect, FONT, glowTex, pattern, colorBake } from './clay/models.js';
import { makeWheel, makeStool, makeChair, makeTable, makeCup, makeVase, makeMug, makePlant, makeApron, makeShelf, makeKiln, freezeKid } from './clay/models.js';
import { loadPots, makePot, GLAZES, PATTERNS } from './clay/pots.js';

// Inside the Clay Café, a dollhouse with no front wall:
//   café (counter with cakes, tables, a window seat) | pottery studio (wheels, aprons, the shelf of
//   pots made in the pottery game) | kiln room (the kiln, glazes, fresh pots).

const W = 26;
const ZB = -4.4; // inner face of the back wall
const ZF = 4.6; // front edge of the floor
const H = 3.2;
const ROOMS = { cafe: [-13, -3.8], studio: [-3.8, 6.6], kiln: [6.6, 13] };
const DIVIDERS = [-3.8, 6.6];
const GAP = [-1.0, 0.8]; // doorway in the dividers (z)
const SHELF = { x: 0.4, z: ZB + 0.24, planks: [0.82, 1.36, 1.9], slots: [-1.02, -0.34, 0.34, 1.02] };
const TABLE = { x: -8.0, z: 0.7 };
const WHEEL = { x: 0.4, z: -1.2 };

const P = Math.PI;

function wallpaper(base, dot, band, motif) {
  const t = canvasTexture(128, 410, (c, w, h) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    c.fillStyle = dot;
    if (motif === 'stripes') for (let i = 0; i < 4; i++) c.fillRect(i * 32 + 10, 0, 12, h);
    else if (motif === 'cups') {
      for (let j = 0; j < 9; j++) for (let i = 0; i < 2; i++) {
        const x = (i + 0.5 + (j % 2) * 0.5) * 64;
        const y = j * 32 + 16;
        roundRect(c, x - 8, y - 6, 16, 12, 4);
        c.fill();
        c.fillRect(x - 11, y + 6, 22, 3);
        c.beginPath();
        c.arc(x + 9, y - 1, 4, -P / 2, P / 2);
        c.lineWidth = 2.5;
        c.strokeStyle = dot;
        c.stroke();
      }
    } else {
      for (let j = 0; j < 11; j++) for (let i = 0; i < 2; i++) {
        c.beginPath();
        c.arc((i + 0.5 + (j % 2) * 0.5) * 64, j * 28 + 12, 4.5, 0, P * 2);
        c.fill();
      }
    }
    const wy = h * 0.73;
    c.fillStyle = band;
    c.fillRect(0, wy, w, h - wy);
    c.fillStyle = 'rgba(0,0,0,0.06)';
    for (let x = 0; x < w; x += 32) c.fillRect(x, wy, 3, h - wy);
    c.fillStyle = '#ffffff';
    c.fillRect(0, wy - 5, w, 7);
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function floorTex(kind) {
  const t = canvasTexture(256, 256, (c, w, h) => {
    if (kind === 'check') {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        c.fillStyle = (i + j) % 2 ? '#f7d9c4' : '#fff6ea';
        c.fillRect((i * w) / 4, (j * h) / 4, w / 4, h / 4);
      }
    } else if (kind === 'wood') {
      for (let i = 0; i < 8; i++) {
        c.fillStyle = i % 2 ? '#e8c497' : '#dfb586';
        c.fillRect(0, (i * h) / 8, w, h / 8);
        c.fillStyle = 'rgba(140,90,50,0.22)';
        c.fillRect(0, (i * h) / 8, w, 2);
        c.fillRect((i * 97) % w, (i * h) / 8, 3, h / 8);
      }
      // Dried clay splats
      c.fillStyle = 'rgba(196,107,71,0.28)';
      for (const [x, y, r] of [[60, 70, 9], [70, 78, 4], [190, 180, 7], [140, 30, 5], [30, 210, 6]]) {
        c.beginPath();
        c.arc(x, y, r, 0, P * 2);
        c.fill();
      }
    } else {
      c.fillStyle = '#f0c9ae';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#e3ab8a';
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        roundRect(c, i * 64 + 4, j * 64 + 4, 56, 56, 8);
        c.fill();
      }
      c.fillStyle = '#d9734e';
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if ((i + j) % 2 === 0) {
        c.beginPath();
        c.arc(i * 64 + 32, j * 64 + 32, 7, 0, P * 2);
        c.fill();
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export default {
  title: 'Clay Café',
  build(ctx) {
    const { api, props } = ctx;
    const g = new THREE.Group();
    const dynamic = [];
    const colliders = [];
    const hotspots = [];
    const add = (...o) => (g.add(...o), o[0]);
    const dyn = (o) => (dynamic.push(o), o);
    const col = (x, z, hw, hd, h) => colliders.push(h === undefined ? { type: 'box', x, z, hw, hd } : { type: 'box', x, z, hw, hd, h });
    const atlas = makeAtlas(1024, 1024);
    const sky = makeSky();
    const v = new THREE.Vector3();

    // ---------------------------------------------------------------- shell
    add(at(box(W + 0.6, 0.4, ZF - ZB + 0.5, '#d9b38c'), 0, -0.25, (ZF + ZB) / 2 + 0.05));
    add(at(box(W + 0.64, 0.12, 0.06, COL.terra), 0, -0.2, ZF + 0.31));
    const floors = { cafe: ['check', 1.3], studio: ['wood', 2.2], kiln: ['tile', 1.5] };
    const papers = {
      cafe: wallpaper('#ffe9dc', '#ffd2bd', '#f2b79c', 'cups'),
      studio: wallpaper('#e4f5ee', '#cdeadf', '#a9d8c6', 'stripes'),
      kiln: wallpaper('#fff1dc', '#ffe0b8', '#e9a27f', 'dots'),
    };
    for (const [room, [x0, x1]] of Object.entries(ROOMS)) {
      const [kind, tile] = floors[room];
      const fg = new THREE.PlaneGeometry(x1 - x0, ZF - ZB);
      uvScale(fg, (x1 - x0) / tile, (ZF - ZB) / tile);
      const f = add(at(mesh(fg, texMat(floorTex(kind), { rough: 0.85 }), { cast: false }), (x0 + x1) / 2, 0, (ZF + ZB) / 2));
      f.rotation.x = -P / 2;
      const wg = new THREE.BoxGeometry(x1 - x0, H, 0.2);
      uvScale(wg, x1 - x0, 1);
      add(at(mesh(wg, texMat(papers[room], { rough: 0.9 })), (x0 + x1) / 2, H / 2, ZB - 0.1));
      add(at(box(x1 - x0, 0.14, 0.05, '#ffffff'), (x0 + x1) / 2, 0.07, ZB + 0.025));
      add(at(box(x1 - x0, 0.1, 0.08, '#ffffff'), (x0 + x1) / 2, H - 0.05, ZB + 0.04));
    }
    const sideMat = mat('#fbe7d3', { rough: 0.9 });
    for (const s of [-1, 1]) {
      const x = s * (W / 2 + 0.1);
      add(at(box(0.2, H, 4.8, sideMat), x, H / 2, ZB + 2.4));
      add(at(box(0.2, 1.2, ZF - ZB - 4.8, sideMat), x, 0.6, ZB + 4.8 + (ZF - ZB - 4.8) / 2));
      add(at(box(0.24, 0.08, ZF - ZB - 4.8, '#ffffff'), x, 1.22, ZB + 4.8 + (ZF - ZB - 4.8) / 2));
      col(x, (ZB + ZF) / 2, 0.12, (ZF - ZB) / 2 + 0.2);
    }
    col(0, ZB - 0.1, W / 2 + 0.2, 0.12);
    add(at(rbox(W, 0.12, 0.16, '#e9c9a3', 0.04), 0, 0.06, ZF - 0.05));
    col(0, ZF + 0.08, W / 2, 0.14);
    const [g0, g1] = GAP;
    for (const x of DIVIDERS) {
      add(at(box(0.18, H - 0.3, g0 - ZB, sideMat), x, (H - 0.3) / 2, (ZB + g0) / 2));
      add(at(box(0.24, 0.08, g0 - ZB, '#ffffff'), x, H - 0.3, (ZB + g0) / 2));
      add(at(box(0.18, 1.1, 1.0, sideMat), x, 0.55, g1 + 0.5));
      add(at(box(0.24, 0.08, 1.06, '#ffffff'), x, 1.12, g1 + 0.5));
      add(at(makePlant(0.6, COL.terra), x, 1.16, g1 + 0.7));
      add(at(box(0.26, 0.12, g1 - g0 + 0.2, '#ffffff'), x, 2.2, (g0 + g1) / 2));
      add(at(box(0.18, 0.7, g1 - g0, sideMat), x, 2.55, (g0 + g1) / 2));
      colliders.push({ type: 'box', x, z: (ZB + g0) / 2, hw: 0.11, hd: (g0 - ZB) / 2 });
      colliders.push({ type: 'box', x, z: g1 + 0.5, hw: 0.11, hd: 0.5, h: 1.12 });
    }
    // Clay Café sign over the café doorway
    const cafeSign = atlas.panel(1.5, 0.36, 384, 92, (c, w, h) => {
      c.fillStyle = '#fbe7d3';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#fff7ea';
      roundRect(c, 3, 3, w - 6, h - 6, 30);
      c.fill();
      c.lineWidth = 6;
      c.strokeStyle = COL.terra;
      c.stroke();
      c.fillStyle = '#8c3f22';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `700 ${h * 0.52}px ${FONT}`;
      c.fillText('Pottery studio', w / 2, h * 0.55);
    });
    add(at(cafeSign, DIVIDERS[0] + 0.14, 2.62, (g0 + g1) / 2)).rotation.y = P / 2;
    const kilnSign = atlas.panel(1.2, 0.36, 320, 96, (c, w, h) => {
      c.fillStyle = '#fbe7d3';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#fff7ea';
      roundRect(c, 3, 3, w - 6, h - 6, 30);
      c.fill();
      c.lineWidth = 6;
      c.strokeStyle = '#e07a3a';
      c.stroke();
      c.fillStyle = '#8c3f22';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `700 ${h * 0.5}px ${FONT}`;
      c.fillText('Kiln room', w / 2, h * 0.55);
    });
    add(at(kilnSign, DIVIDERS[1] - 0.14, 2.62, (g0 + g1) / 2)).rotation.y = -P / 2;

    // Windows on the back wall share one sky
    const windowAt = (x, y, w, h, curtain) => {
      add(at(rbox(w + 0.18, h + 0.18, 0.08, '#ffffff', 0.04), x, y, ZB + 0.04));
      add(at(mesh(new THREE.PlaneGeometry(w, h), sky.material, { cast: false }), x, y, ZB + 0.085));
      add(at(box(0.05, h, 0.04, '#ffffff'), x, y, ZB + 0.1));
      add(at(box(w, 0.05, 0.04, '#ffffff'), x, y, ZB + 0.1));
      add(at(box(w + 0.3, 0.06, 0.16, '#ffffff'), x, y - h / 2 - 0.1, ZB + 0.1));
      if (curtain) {
        add(at(cyl(0.02, 0.02, w + 0.8, '#c9a27a', 6), x, y + h / 2 + 0.22, ZB + 0.18)).rotation.z = P / 2;
        for (const s of [-1, 1]) {
          add(at(rbox(0.3, h + 0.45, 0.07, curtain, 0.035), x + s * (w / 2 + 0.17), y - 0.02, ZB + 0.2));
          add(at(box(0.34, 0.05, 0.09, '#ffffff'), x + s * (w / 2 + 0.17), y - h * 0.2, ZB + 0.22));
        }
      }
    };

    // Warm wall lamps on the back wall, and fairy lights
    const bulbMat = umat('#fff3c4', { emissive: '#ffd27a', ei: 1.3 });
    const bulbPink = umat('#ffd6e2', { emissive: '#ff8fb1', ei: 1.1 });
    const lamp = (x, y, shade) => {
      add(at(rbox(0.12, 0.2, 0.05, '#ffffff', 0.02), x, y - 0.05, ZB + 0.03));
      add(rot(at(cyl(0.012, 0.012, 0.2, '#6b5a6e', 5), x, y, ZB + 0.12), P / 2, 0, 0));
      add(at(mesh(new THREE.SphereGeometry(0.07, 10, 8), bulbMat, { cast: false }), x, y - 0.04, ZB + 0.22));
      const sh = add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.17, 0.16, 16, 1, true), mat(shade, { rough: 0.6, side: THREE.DoubleSide })), x, y + 0.02, ZB + 0.22));
      sh.castShadow = false;
    };
    const fairy = (x0, x1, y, z) => {
      const n = Math.round((x1 - x0) / 0.26);
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        add(at(mesh(new THREE.SphereGeometry(0.06, 8, 6), i % 2 ? bulbMat : bulbPink, { cast: false }), x0 + k * (x1 - x0), y - Math.sin(((k * 4) % 1) * P) * 0.18, z));
      }
    };
    // Bunting along the top of a wall
    const flagGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.12, 0, 0), new THREE.Vector3(0, -0.24, 0), new THREE.Vector3(0.12, 0, 0)]);
    flagGeo.computeVertexNormals();
    flagGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(6), 2));
    const flagMats = [COL.terra, COL.sun, COL.mint, COL.rose].map((c) => mat(c, { rough: 0.9, side: THREE.DoubleSide }));
    const bunting = (x0, x1, y, z) => {
      const n = Math.round((x1 - x0) / 0.36);
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        const sag = Math.sin(((k * 3) % 1) * P) * 0.22;
        add(at(mesh(flagGeo, flagMats[i % 4], { cast: false }), x0 + k * (x1 - x0), y - sag, z));
      }
    };

    // ================================================================ CAFÉ
    const [cx0, cx1] = ROOMS.cafe;
    // Counter along the back, a barista behind it
    const CX = -10.3;
    const CZ = -2.95;
    add(at(rbox(4.4, 0.9, 0.72, '#fff3e4', 0.05), CX, 0.45, CZ));
    for (let i = 0; i < 11; i++) add(at(box(0.06, 0.72, 0.02, '#f2d6bd'), CX - 2.0 + i * 0.4, 0.46, CZ + 0.365));
    add(at(rbox(4.56, 0.07, 0.84, '#f7efe6', 0.03), CX, 0.93, CZ));
    add(at(box(4.4, 0.05, 0.03, COL.terra), CX, 0.86, CZ + 0.425));
    col(CX, CZ, 2.28, 0.42, 0.96);
    // Espresso machine
    const EX = CX - 1.65;
    add(at(rbox(0.7, 0.5, 0.42, COL.rose, 0.08), EX, 1.21, CZ - 0.05));
    add(at(rbox(0.74, 0.06, 0.46, mat(COL.steel, { metal: 0.5, rough: 0.3 }), 0.03), EX, 1.49, CZ - 0.05));
    for (const s of [-1, 1]) {
      add(at(cyl(0.06, 0.05, 0.08, mat(COL.steelDark, { metal: 0.5, rough: 0.3 }), 12), EX + s * 0.17, 1.03, CZ + 0.16));
      add(at(makeCup('#ffffff'), EX + s * 0.17, 0.97, CZ + 0.2));
    }
    add(at(rbox(0.62, 0.03, 0.18, mat(COL.steelDark, { metal: 0.5, rough: 0.3 }), 0.01), EX, 0.975, CZ + 0.2));
    add(at(cyl(0.065, 0.065, 0.02, '#ffffff', 16).rotateX(P / 2), EX, 1.3, CZ + 0.17));
    add(at(cyl(0.008, 0.008, 0.25, mat(COL.steel, { metal: 0.5, rough: 0.3 }), 6), EX + 0.33, 1.15, CZ + 0.12)).rotation.z = 0.3;
    for (let i = 0; i < 4; i++) add(at(makeCup(['#ffffff', COL.sun, COL.mint, COL.rose][i]), EX - 0.24 + i * 0.16, 1.52, CZ - 0.12));
    // Cake display case
    const DX = CX - 0.2;
    add(at(rbox(1.6, 0.08, 0.6, COL.woodDark, 0.02), DX, 1.0, CZ));
    add(at(rbox(1.6, 0.05, 0.6, COL.woodDark, 0.02), DX, 1.52, CZ));
    const cake = (x, base, frost, top) => {
      add(at(cyl(0.16, 0.18, 0.02, '#ffffff', 16), x, 1.05, CZ));
      add(at(cyl(0.13, 0.13, 0.1, base, 16), x, 1.11, CZ));
      add(at(cyl(0.135, 0.135, 0.025, frost, 16), x, 1.17, CZ));
      add(at(cyl(0.13, 0.13, 0.08, base, 16), x, 1.22, CZ));
      add(at(cyl(0.135, 0.13, 0.03, frost, 16), x, 1.27, CZ));
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * P * 2;
        add(at(sph(0.02, top, undefined, 8), x + Math.sin(a) * 0.09, 1.3, CZ + Math.cos(a) * 0.09));
      }
      add(at(sph(0.03, COL.pink, undefined, 10), x, 1.31, CZ));
    };
    cake(DX - 0.5, '#8b4a2b', '#f7e3c4', '#6e3820');
    cake(DX, '#fff1dc', COL.rose, '#ffffff');
    for (let i = 0; i < 3; i++) {
      add(at(cyl(0.045, 0.035, 0.05, '#f2a7c3', 10), DX + 0.38 + (i % 2) * 0.12, 1.07, CZ - 0.08 + i * 0.09));
      add(at(sph(0.048, ['#fff1dc', COL.sun, '#b99af5'][i], undefined, 10), DX + 0.38 + (i % 2) * 0.12, 1.11, CZ - 0.08 + i * 0.09)).scale.y = 0.8;
    }
    const glass = new THREE.MeshStandardMaterial({ color: '#e8f8ff', transparent: true, opacity: 0.25, roughness: 0.1, depthWrite: false });
    const glassBox = dyn(add(at(new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.47, 0.56), glass), DX, 1.27, CZ)));
    glassBox.renderOrder = 2;
    // Cookie jar, register and a tip jar
    add(at(cyl(0.12, 0.11, 0.24, '#fff7ee', 16), CX + 0.95, 1.08, CZ - 0.05));
    add(at(cyl(0.1, 0.1, 0.05, COL.terra, 16), CX + 0.95, 1.22, CZ - 0.05));
    add(at(sph(0.035, COL.terra, undefined, 8), CX + 0.95, 1.27, CZ - 0.05));
    for (let i = 0; i < 4; i++) add(at(cyl(0.04, 0.04, 0.012, '#c98a4a', 10), CX + 0.9 + (i % 2) * 0.08, 1.0 + i * 0.045, CZ + 0.05)).rotation.z = 0.2;
    add(at(rbox(0.42, 0.24, 0.34, COL.mint, 0.05), CX + 1.6, 1.09, CZ - 0.02));
    add(at(rot(rbox(0.36, 0.14, 0.04, '#ffffff', 0.02), -0.5, 0, 0), CX + 1.6, 1.25, CZ + 0.1));
    add(at(rbox(0.3, 0.05, 0.12, COL.mintDark, 0.02), CX + 1.6, 0.99, CZ + 0.18));
    add(at(cyl(0.06, 0.06, 0.12, mat('#e8f8ff', { rough: 0.2 }), 12), CX + 2.0, 1.03, CZ + 0.15));
    // Barista behind the counter
    const barista = ctx.makeKid({ id: 'barista', name: 'Barista', gender: 'girl', skin: '#e3b08e', hair: '#7a4a26', hairstyle: 'buns', outfit: 'overalls', top: '#ffffff', bottom: '#8fd6c6', shoes: '#3b2b3f', accent: COL.sun });
    freezeKid(barista, { pose: 'stand', hands: 'stir' });
    barista.root.position.set(CX + 0.7, 0, CZ - 0.78);
    add(barista.root);
    const bApron = makeApron(COL.terra, '#fff7ee');
    bApron.scale.setScalar(0.9);
    add(at(bApron, CX + 0.7, 1.05, CZ - 0.6));
    // Shelves of cups and syrups behind the counter, the menu board
    for (const y of [1.55, 2.0]) add(at(box(2.0, 0.05, 0.28, COL.wood), CX - 1.0, y, ZB + 0.14));
    for (let i = 0; i < 6; i++) add(at(makeMug([COL.sun, COL.rose, COL.mint, COL.sky, '#ffffff', COL.lilac][i]), CX - 1.8 + i * 0.32, 1.575, ZB + 0.14));
    for (let i = 0; i < 5; i++) {
      const c = ['#e9b35c', '#ff8fb1', '#8b4a2b', '#7fd3a7', '#fff1dc'][i];
      add(at(cyl(0.05, 0.05, 0.22, mat(c, { rough: 0.3 }), 10), CX - 1.75 + i * 0.36, 2.135, ZB + 0.14));
      add(at(cyl(0.018, 0.022, 0.07, '#ffffff', 8), CX - 1.75 + i * 0.36, 2.28, ZB + 0.14));
    }
    const menu = atlas.panel(1.9, 1.1, 456, 264, (c, w, h) => {
      c.fillStyle = '#ffe9dc';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#3f5a52';
      roundRect(c, 0, 0, w, h, 20);
      c.fill();
      c.lineWidth = 12;
      c.strokeStyle = '#c98f5f';
      c.stroke();
      c.textAlign = 'center';
      c.fillStyle = '#ffe3a6';
      c.font = `700 40px ${FONT}`;
      c.fillText('Menu', w / 2, 52);
      c.font = `500 26px ${FONT}`;
      const items = [['Spanish latte', '#ffffff'], ['Pecan cake', '#ffd0dc'], ['Hot cocoa', '#ffffff'], ['Cookie of the day', '#c9f0e2']];
      items.forEach(([t, col2], i) => {
        c.fillStyle = col2;
        c.fillText(t, w / 2, 98 + i * 40);
      });
      c.strokeStyle = 'rgba(255,255,255,0.5)';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(w * 0.3, 66);
      c.lineTo(w * 0.7, 66);
      c.stroke();
      c.fillStyle = '#ff8fb1';
      c.beginPath();
      c.moveTo(w - 50, h - 30);
      c.bezierCurveTo(w - 72, h - 46, w - 64, h - 64, w - 50, h - 54);
      c.bezierCurveTo(w - 36, h - 64, w - 28, h - 46, w - 50, h - 30);
      c.fill();
    });
    add(at(menu, CX + 1.1, 2.15, ZB + 0.1));
    // Window seat with cushions under the café window
    windowAt(-6.1, 1.85, 1.8, 1.3, COL.rose);
    add(at(rbox(2.3, 0.42, 0.62, '#fff3e4', 0.05), -6.1, 0.21, ZB + 0.33));
    add(at(rbox(2.2, 0.1, 0.56, COL.terra, 0.05), -6.1, 0.46, ZB + 0.33));
    for (const [x, c] of [[-6.8, COL.sun], [-6.1, COL.mint], [-5.4, '#ffffff']]) add(rot(at(rbox(0.42, 0.36, 0.14, c, 0.07), x, 0.7, ZB + 0.16), -0.2, 0, 0));
    col(-6.1, ZB + 0.33, 1.15, 0.32, 0.51);
    add(at(makePlant(0.8, COL.sun, 'tall'), -7.65, 0, ZB + 0.35));
    // Tables
    const steamFrom = [];
    const table = (x, z, seats, decor) => {
      add(at(makeTable(0.55), x, 0, z));
      colliders.push({ type: 'circle', x, z, r: 0.58, h: 0.76 });
      for (const [sx, sz, yaw, c] of seats) {
        const ch = makeChair(c);
        ch.rotation.y = yaw;
        add(at(ch, x + sx, 0, z + sz));
        colliders.push({ type: 'circle', x: x + sx, z: z + sz, r: 0.22, h: 0.48 });
      }
      decor?.(x, z);
    };
    table(TABLE.x, TABLE.z, [[-0.42, -0.58, 0, COL.rose], [0.42, -0.58, 0, COL.mint]], (x, z) => {
      add(at(cyl(0.05, 0.05, 0.09, '#ffffff', 12), x, 0.8, z - 0.2));
      for (let k = 0; k < 3; k++) add(at(sph(0.035, [COL.rose, COL.sun, '#ffffff'][k], undefined, 8), x - 0.025 + k * 0.025, 0.87, z - 0.2 + (k % 2) * 0.02));
    });
    table(-11.4, 1.0, [[-0.75, 0, P / 2, COL.sun], [0.75, 0, -P / 2, COL.rose]], (x, z) => {
      add(at(makeCup('#ffffff'), x - 0.2, 0.76, z + 0.05));
      add(at(makeCup(COL.mint), x + 0.22, 0.76, z - 0.06));
      steamFrom.push(new THREE.Vector3(x - 0.2, 0.88, z + 0.05), new THREE.Vector3(x + 0.22, 0.88, z - 0.06));
      add(at(cyl(0.13, 0.12, 0.02, '#ffffff', 14), x, 0.77, z + 0.25));
      const cr = add(at(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.035, 8, 12, P * 1.2), mat('#e0a24e', { rough: 0.6 })), x, 0.81, z + 0.25));
      cr.rotation.x = -P / 2;
    });
    table(-10.6, 3.3, [[-0.75, 0, P / 2, COL.mint], [0.75, 0, -P / 2, COL.sun]], (x, z) => {
      add(at(makeCup(COL.rose), x, 0.76, z));
      steamFrom.push(new THREE.Vector3(x, 0.88, z));
      add(at(makeVase(0, COL.sky, 0.6), x + 0.25, 0.76, z - 0.15));
    });
    add(at(makePlant(1.1, COL.mint, 'tall'), cx0 + 0.5, 0, -1.2));
    add(at(makePlant(0.9, COL.terra), cx0 + 0.5, 0, ZB + 0.6));
    bunting(cx0 + 0.3, cx1 - 0.3, H - 0.25, ZB + 0.2);
    lamp(-7.3, 2.0, COL.terra);
    lamp(-4.9, 2.0, COL.terra);
    lamp(cx0 + 0.9, 2.0, COL.terra);
    // Welcome mat at the way out
    const EXIT = { x: -6.4, z: 3.95 };
    add(at(atlas.wrap(new THREE.PlaneGeometry(1.5, 0.8), 300, 160, (c, w, h) => {
      c.fillStyle = '#e9b35c';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#c98a4a';
      c.lineWidth = 10;
      roundRect(c, 12, 12, w - 24, h - 24, 18);
      c.stroke();
      c.fillStyle = '#8c3f22';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `700 46px ${FONT}`;
      c.fillText('Welcome', w / 2, h / 2 + 3);
    }), EXIT.x, 0.012, EXIT.z - 0.1)).rotation.x = -P / 2;

    // ================================================================ STUDIO
    // Pottery wheels with stools behind them; the middle one spins and starts the game
    let spin = null;
    [-2.0, WHEEL.x, 2.8].forEach((x, i) => {
      const wh = makeWheel([COL.mint, COL.sun, '#ffb7cb'][i]);
      add(at(wh.root, x, 0, WHEEL.z));
      if (x === WHEEL.x) {
        spin = wh.head;
        dyn(wh.head);
        const lump = mesh(new THREE.LatheGeometry([[0, 0], [0.13, 0], [0.15, 0.06], [0.13, 0.16], [0.1, 0.22], [0.11, 0.25], [0, 0.24]].map(([r, y]) => new THREE.Vector2(r, y)), 20), mat(COL.clay, { rough: 0.5 }));
        wh.head.add(lump);
      } else {
        const lump = at(sph(0.13, COL.clay, { rough: 0.5 }, 14), 0, 0.6, 0);
        lump.scale.set(1, 0.75, 1);
        wh.root.add(lump);
      }
      colliders.push({ type: 'circle', x, z: WHEEL.z, r: 0.42, h: 0.55 });
      const st = makeStool([COL.terra, COL.rose, COL.mint][i]);
      add(at(st, x, 0, WHEEL.z - 0.65));
      colliders.push({ type: 'circle', x, z: WHEEL.z - 0.65, r: 0.22, h: 0.46 });
      add(at(cyl(0.15, 0.13, 0.26, ['#9fd8ef', '#ffd166', '#c7a6ff'][i], 14), x + 0.55, 0.13, WHEEL.z + 0.25));
      add(at(cyl(0.135, 0.135, 0.02, '#a9654a', 14), x + 0.55, 0.25, WHEEL.z + 0.25));
    });
    // Aprons on hooks, and a bench with clay bags underneath
    add(at(box(1.8, 0.08, 0.06, COL.wood), -2.55, 2.05, ZB + 0.04));
    [[COL.rose, 'Roji'], [COL.sky, 'Homama'], [COL.mint, ''], [COL.sun, '']].forEach(([c, name], i) => {
      const ap = makeApron(c);
      add(at(ap, -3.2 + i * 0.44, 2.02, ZB + 0.04));
      if (name) {
        const tag = atlas.panel(0.15, 0.06, 120, 48, (cc, w, h) => {
          cc.fillStyle = '#ffffff';
          cc.fillRect(0, 0, w, h);
          cc.fillStyle = COL.ink;
          cc.textAlign = 'center';
          cc.textBaseline = 'middle';
          cc.font = `600 ${name.length > 4 ? 24 : 30}px ${FONT}`;
          cc.fillText(name, w / 2, h / 2 + 2);
        });
        add(at(tag, -3.2 + i * 0.44, 1.54, ZB + 0.105));
      }
    });
    add(at(rbox(1.7, 0.42, 0.5, COL.wood, 0.04), -2.55, 0.21, ZB + 0.3));
    col(-2.55, ZB + 0.3, 0.85, 0.25, 0.43);
    for (let i = 0; i < 3; i++) {
      const bag = add(at(rbox(0.38, 0.22, 0.32, ['#cdb8a6', '#d9a184', '#c46b47'][i], 0.08), -3.1 + i * 0.5, 0.53, ZB + 0.3));
      bag.rotation.y = (i - 1) * 0.2;
    }
    // The shelf of pots made in the pottery game (filled on enter)
    add(at(makeShelf(2.9, 0.42, [0.35, ...SHELF.planks], COL.wood), SHELF.x, 0, SHELF.z));
    add(at(box(2.9, 2.0, 0.03, '#f4dcc4'), SHELF.x, 1.0, ZB + 0.03));
    for (let i = 0; i < 4; i++) add(at(rbox(0.5, 0.24, 0.32, ['#cdb8a6', '#d9a184', '#cdb8a6', '#d9a184'][i], 0.06), SHELF.x - 1.05 + i * 0.7, 0.5, SHELF.z));
    col(SHELF.x, SHELF.z, 1.5, 0.24);
    const shelfSign = atlas.panel(1.9, 0.42, 456, 100, (c, w, h) => {
      c.fillStyle = '#e4f5ee';
      c.fillRect(0, 0, w, h);
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
    add(at(shelfSign, SHELF.x, 2.6, ZB + 0.08));
    for (const s of [-1, 1]) add(at(sph(0.05, COL.rose, undefined, 10), SHELF.x + s * 0.88, 2.6, ZB + 0.12));
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
    // Shelf of handmade pots and mugs
    const SX = 3.5;
    add(at(makeShelf(1.9, 0.4, [0.35, 0.85, 1.35, 1.85], COL.woodLight), SX, 0, ZB + 0.22));
    col(SX, ZB + 0.22, 0.98, 0.22);
    const pr = (seed) => {
      let a = seed;
      return () => ((a = (a * 9301 + 49297) % 233280) / 233280);
    };
    const rr = pr(7);
    const glazeList = GLAZES.map((gl) => gl[1]);
    for (const y of [0.375, 0.875, 1.375, 1.875]) {
      let x = SX - 0.8;
      while (x < SX + 0.8) {
        const c = glazeList[Math.floor(rr() * glazeList.length)];
        if (rr() < 0.35) {
          add(at(makeMug(c, rr() < 0.5 ? '#ffffff' : COL.terra), x + 0.06, y, ZB + 0.24));
          x += 0.2;
        } else {
          const k = Math.floor(rr() * 5);
          const s = 0.75 + rr() * 0.4;
          add(at(makeVase(k, c, s), x + 0.1, y, ZB + 0.24));
          x += 0.32 * s + 0.04;
        }
      }
    }
    windowAt(5.6, 1.85, 1.3, 1.2, COL.sun);
    // Sink under the window
    add(at(rbox(1.2, 0.82, 0.56, COL.mint, 0.04), 5.6, 0.41, ZB + 0.3));
    add(at(rbox(1.26, 0.06, 0.6, '#ffffff', 0.02), 5.6, 0.85, ZB + 0.3));
    add(at(rbox(0.6, 0.04, 0.38, mat(COL.steel, { metal: 0.5, rough: 0.3 }), 0.02), 5.6, 0.88, ZB + 0.32));
    add(rot(at(tor(0.1, 0.02, mat(COL.steel, { metal: 0.6, rough: 0.25 }), undefined, P, 6, 12), 5.6, 0.98, ZB + 0.12), 0, P / 2, 0));
    add(at(rbox(0.1, 0.04, 0.07, COL.sun, 0.015), 6.0, 0.9, ZB + 0.4));
    col(5.6, ZB + 0.3, 0.63, 0.3, 0.88);
    // Wedging table with clay slabs, a rolling pin and tools
    const TX = 3.4;
    const TZ = 2.3;
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
    for (const [r, c] of [[0.07, COL.clay], [0.05, '#cdb8a6']]) add(at(sph(r, c, undefined, 10), TX - 0.1 + r * 3, 0.84, TZ + 0.3)).scale.y = 0.6;
    // Drying rack with unfired pots
    const RX = -2.3;
    const RZ = 2.5;
    for (const s of [-1, 1]) add(at(box(0.06, 1.5, 0.5, COL.woodDark), RX + s * 0.75, 0.75, RZ));
    for (const y of [0.3, 0.75, 1.2]) {
      add(at(box(1.5, 0.04, 0.48, COL.woodLight), RX, y, RZ));
      for (let i = 0; i < 4; i++) add(at(makeVase((i + Math.round(y * 4)) % 5, '#d8c7b8', 0.62), RX - 0.54 + i * 0.36, y + 0.02, RZ));
    }
    col(RX, RZ, 0.8, 0.27);
    add(at(makePlant(1.0, COL.cream2, 'round'), 6.0, 0, 3.6));
    bunting(ROOMS.studio[0] + 0.3, SHELF.x - 1.6, H - 0.25, ZB + 0.2);
    bunting(SHELF.x + 1.6, ROOMS.studio[1] - 0.3, H - 0.25, ZB + 0.2);
    lamp(-1.65, 2.05, COL.terra);
    lamp(2.45, 2.05, COL.terra);

    // ================================================================ KILN ROOM
    const kiln = makeKiln();
    const KX = 9.4;
    const KZ = ZB + 0.95;
    kiln.root.scale.setScalar(1.3);
    add(at(kiln.root, KX, 0, KZ));
    for (const o of kiln.root.children) if (o.material === kiln.glow) dyn(o);
    dyn(kiln.door);
    dyn(kiln.needle);
    colliders.push({ type: 'circle', x: KX, z: KZ, r: 1.0 });
    // Woodpile beside the kiln
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 4 - row; i++) {
        const log = add(at(cyl(0.09, 0.09, 0.6, i % 2 ? '#a0602e' : '#b8743a', 10), KX - 1.55 + i * 0.19 + row * 0.095, 0.09 + row * 0.16, KZ + 0.1));
        log.rotation.x = P / 2;
        add(at(cyl(0.07, 0.07, 0.605, '#e9c79a', 10), KX - 1.55 + i * 0.19 + row * 0.095, 0.09 + row * 0.16, KZ + 0.1)).rotation.x = P / 2;
      }
    }
    col(KX - 1.27, KZ + 0.1, 0.42, 0.32, 0.5);
    // Bench to wait on while the pots bake
    add(at(rbox(1.8, 0.1, 0.55, COL.wood, 0.03), 11.6, 0.42, 3.4));
    for (const dx of [-0.75, 0.75]) add(at(box(0.1, 0.38, 0.45, COL.woodDark), 11.6 + dx, 0.19, 3.4));
    for (const [dx, c] of [[-0.45, COL.rose], [0.4, COL.sky]]) add(rot(at(rbox(0.38, 0.32, 0.12, c, 0.06), 11.6 + dx, 0.62, 3.25), -0.15, 0, 0));
    col(11.6, 3.4, 0.9, 0.28, 0.47);
    const kilnGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#ffa65c', transparent: true, depthWrite: false, opacity: 0.4 }));
    kilnGlow.scale.setScalar(1.2);
    kilnGlow.position.set(KX, 0.9, KZ + 0.98);
    add(dyn(kilnGlow));
    const hot = atlas.panel(0.8, 0.42, 200, 105, (c, w, h) => {
      c.fillStyle = '#fff1dc';
      c.fillRect(0, 0, w, h);
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
    add(at(hot, KX - 1.5, 1.9, ZB + 0.08));
    // Tongs and gloves by the kiln
    add(at(box(0.6, 0.05, 0.08, COL.wood), KX - 1.5, 1.42, ZB + 0.05));
    for (const dx of [-0.15, 0.12]) add(at(rbox(0.12, 0.2, 0.05, '#ef5b6f', 0.03), KX - 1.5 + dx, 1.27, ZB + 0.08));
    // Glaze shelf
    const GX = 11.8;
    add(at(makeShelf(1.7, 0.36, [0.35, 0.95, 1.55], COL.woodLight), GX, 0, ZB + 0.2));
    col(GX, ZB + 0.2, 0.88, 0.2);
    GLAZES.forEach(([, c], i) => {
      const y = i < 4 ? 0.975 : 1.575;
      const x = GX - 0.6 + (i % 4) * 0.4;
      add(at(cyl(0.08, 0.08, 0.2, '#ffffff', 12), x, y + 0.1, ZB + 0.2));
      add(at(cyl(0.081, 0.081, 0.09, c, 12), x, y + 0.08, ZB + 0.2));
      add(at(cyl(0.06, 0.06, 0.04, c, 12), x, y + 0.22, ZB + 0.2));
    });
    for (let i = 0; i < 3; i++) add(at(cyl(0.16, 0.15, 0.28, ['#ffffff', '#f3e6dc', '#ffffff'][i], 14), GX - 0.5 + i * 0.5, 0.49, ZB + 0.2));
    // Glazing table with buckets, brushes and a pot half glazed
    const GTX = 11.2;
    const GTZ = 0.9;
    add(at(rbox(1.5, 0.07, 0.85, '#f7efe6', 0.03), GTX, 0.78, GTZ));
    for (const [dx, dz] of [[-0.65, -0.33], [0.65, -0.33], [-0.65, 0.33], [0.65, 0.33]]) add(at(box(0.07, 0.75, 0.07, COL.woodDark), GTX + dx, 0.37, GTZ + dz));
    col(GTX, GTZ, 0.76, 0.44, 0.82);
    [COL.sky, COL.rose, COL.sun].forEach((c, i) => {
      add(at(cyl(0.11, 0.1, 0.12, '#ffffff', 14), GTX - 0.5 + i * 0.26, 0.875, GTZ - 0.2));
      add(at(cyl(0.1, 0.1, 0.01, c, 14), GTX - 0.5 + i * 0.26, 0.93, GTZ - 0.2));
    });
    add(at(cyl(0.12, 0.13, 0.04, COL.steelDark, 16), GTX + 0.35, 0.835, GTZ + 0.05));
    add(at(makeVase(3, COL.mint, 1.0), GTX + 0.35, 0.855, GTZ + 0.05));
    add(at(cyl(0.05, 0.045, 0.12, COL.terra, 10), GTX - 0.45, 0.87, GTZ + 0.2));
    for (let k = 0; k < 3; k++) add(rot(at(cyl(0.007, 0.007, 0.2, COL.woodLight, 5), GTX - 0.45 + (k - 1) * 0.02, 0.98, GTZ + 0.2), 0, 0, (k - 1) * 0.25));
    // Fresh from the kiln: a low display table of finished pots
    const FX = 8.2;
    const FZ = 2.6;
    add(at(rbox(1.7, 0.5, 0.7, '#fff3e4', 0.05), FX, 0.25, FZ));
    add(at(rbox(1.78, 0.06, 0.78, COL.terra, 0.03), FX, 0.52, FZ));
    col(FX, FZ, 0.89, 0.39, 0.55);
    [[0, COL.rose], [2, COL.sky], [4, COL.sun], [1, COL.lilac], [3, COL.mint]].forEach(([k, c], i) => add(at(makeVase(k, c, 1.05), FX - 0.64 + i * 0.32, 0.55, FZ + (i % 2) * 0.12 - 0.06)));
    const fresh = atlas.panel(0.9, 0.24, 240, 64, (c, w, h) => {
      c.fillStyle = '#fff3e4';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      roundRect(c, 3, 3, w - 6, h - 6, 16);
      c.fill();
      c.fillStyle = '#d9734e';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `600 ${h * 0.46}px ${FONT}`;
      c.fillText('Fresh from the kiln', w / 2, h / 2 + 2, w - 30);
    });
    add(rot(at(fresh, FX, 0.42, FZ + 0.355), -0.1, 0, 0));
    add(at(makePlant(1.0, COL.terra, 'tall'), ROOMS.kiln[1] - 0.5, 0, 1.9));
    add(at(makePlant(0.8, COL.mint), ROOMS.kiln[0] + 0.6, 0, ZB + 0.5));
    lamp(KX + 1.3, 1.9, COL.sun);
    fairy(ROOMS.kiln[0] + 0.4, ROOMS.kiln[1] - 0.4, H - 0.28, ZB + 0.16);

    // ---------------------------------------------------------------- steam over the cups
    const steam = [];
    steamFrom.forEach((p, i) => {
      for (let k = 0; k < 2; k++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, opacity: 0 }));
        add(dyn(s));
        steam.push({ s, p, ph: k / 2 + i * 0.27 });
      }
    });

    // ---------------------------------------------------------------- the saved pots
    let shown = '';
    const refreshShelf = () => {
      const list = loadPots().slice(-12).reverse();
      const sig = JSON.stringify(list.map((p) => [p.t, p.color, p.pattern]));
      if (sig === shown) return list;
      shown = sig;
      for (const o of [...potHolder.children]) {
        o.geometry.dispose();
        o.material.dispose();
        o.removeFromParent();
      }
      list.forEach((item, i) => {
        const pot = makePot(item);
        const ht = item.profile[item.profile.length - 1][1];
        const wd = Math.max(...item.profile.map((q) => q[0])) * 2;
        pot.scale.setScalar(Math.min(1, 0.42 / ht, 0.56 / wd));
        pot.position.set(SHELF.x + SHELF.slots[i % 4], SHELF.planks[2 - Math.floor(i / 4)] + 0.026, SHELF.z + 0.02);
        pot.rotation.y = (i * 1.7) % (P * 2);
        potHolder.add(pot);
      });
      emptyHolder.visible = list.length === 0;
      return list;
    };
    refreshShelf();

    // ---------------------------------------------------------------- hotspots
    let food = [];
    let busy = false;
    let heartT = 0;
    const tone = (f, d, o) => {
      const s = api.sound;
      if (s?.ctx) s.tone(f, s.ctx.currentTime, d, o);
    };
    hotspots.push(
      {
        x: WHEEL.x,
        z: WHEEL.z + 0.95,
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
      },
      {
        x: TABLE.x,
        z: TABLE.z + 0.85,
        r: 1.4,
        label: 'Have a coffee',
        icon: 'yum',
        act: async (a) => {
          if (busy) return;
          busy = true;
          const [l1, l2, cake] = await Promise.all([props.food('spanish-latte'), props.food('spanish-latte'), props.food('pecan-cake')]);
          busy = false;
          for (const f of food) f.removeFromParent();
          const cups = [fit(l1, 0.28), fit(l2, 0.28)];
          const cakeObj = fit(cake, 0.34);
          cakeObj.position.set(TABLE.x, 0.76, TABLE.z + 0.12);
          g.add(cakeObj);
          food = [...cups, cakeObj];
          heartT = 1.2;
          a.activity({
            label: 'Get up',
            seats: [
              { who: 'roji', x: TABLE.x - 0.42, z: TABLE.z - 0.58, y: 0.3, yaw: 0, pose: 'sit' },
              { who: 'homama', x: TABLE.x + 0.42, z: TABLE.z - 0.58, y: 0.3, yaw: 0, pose: 'sit' },
            ],
            focus: { x: TABLE.x, z: TABLE.z - 0.2, y: 0.95, zoom: 0.42 },
            music: 0.6,
            exit: { x: TABLE.x - 0.4, z: TABLE.z + 1.0 },
            update: (dt) => {
              heartT -= dt;
              if (heartT <= 0) {
                heartT = 4.2;
                const who = Math.random() < 0.5 ? a.roji : a.homama;
                a.fx.heartsAt(who.kid.head.localToWorld(v.set(0, 0.75, 0)), 3);
                tone(660, 0.12, { gain: 0.04 });
                tone(880, 0.16, { gain: 0.035, attack: 0.02 });
              }
            },
            onEnd: () => {
              a.carry('roji', null);
              a.carry('homama', null);
              for (const f of food) f.removeFromParent();
              food = [];
            },
          });
          a.carry('roji', cups[0]);
          a.carry('homama', cups[1]);
          a.sound.ui('pop');
          a.toast('Roji and Homama share Spanish lattes and a warm pecan cake.', 2800);
        },
      },
      {
        x: SHELF.x,
        z: SHELF.z + 1.15,
        r: 1.4,
        label: 'Look at the shelf',
        icon: 'star',
        act: (a) => {
          const list = refreshShelf();
          const sx = SHELF.x;
          const z = SHELF.z + 1.0;
          a.activity({
            label: 'Done',
            seats: [
              { who: 'player', x: sx - 1.85, z, yaw: Math.atan2(1.85, -0.9), pose: 'stand' },
              { who: 'partner', x: sx + 1.85, z, yaw: Math.atan2(-1.85, -0.9), pose: 'stand' },
            ],
            focus: { x: sx, z: SHELF.z + 0.6, y: 1.45, zoom: 0.4 },
            exit: { x: sx - 0.4, z: SHELF.z + 1.3 },
          });
          if (!list.length) {
            a.toast('The shelf is waiting for your first pot. Try the pottery wheel.', 3000);
            return;
          }
          const p = list[0];
          const glaze = (GLAZES.find((gl) => gl[1] === p.color) || ['Pretty'])[0].toLowerCase();
          const pat = (PATTERNS.find((q) => q.id === p.pattern) || PATTERNS[0]).name.toLowerCase();
          const what = `${glaze} ${(p.name || 'pot').toLowerCase()}${p.pattern && p.pattern !== 'plain' ? ` with ${pat}` : ''}`;
          a.toast(`${list.length} handmade ${list.length === 1 ? 'pot' : 'pots'}. The newest is a ${what}.`, 3200);
          const newest = potHolder.children[0];
          if (newest) {
            newest.getWorldPosition(v);
            a.fx.heartsAt(v.clone().add(new THREE.Vector3(0, 0.3, 0.1)), 4);
          }
          setTimeout(() => a.emote('partner', 'heart'), 300);
          a.sound.ui('coin');
        },
      },
    );

    // Plain-coloured static furniture becomes a few vertex-coloured meshes
    dynamic.push(...colorBake(g, dynamic));

    return {
      group: g,
      dynamic,
      colliders,
      hotspots,
      size: { w: W, d: ZF - ZB + 0.6 },
      spawn: { x: EXIT.x, z: EXIT.z - 1.55, yaw: P },
      exit: EXIT,
      background: '#f6d8c4',
      onEnter() {
        sky.draw(false);
        refreshShelf();
      },
      update(dt, t) {
        if (spin) spin.rotation.y += dt * 5;
        const k = 0.35 + Math.sin(t * 2.1) * 0.08 + Math.sin(t * 5.3) * 0.04;
        kiln.glow.emissiveIntensity = k;
        kilnGlow.material.opacity = 0.25 + k * 0.4;
        kiln.needle.rotation.z = -0.4 + Math.sin(t * 0.7) * 0.08;
        for (const st of steam) {
          const q = (t * 0.45 + st.ph) % 1;
          st.s.position.set(st.p.x + Math.sin(q * 6 + st.ph * 5) * 0.03, st.p.y + q * 0.4, st.p.z);
          st.s.scale.setScalar(0.08 + q * 0.14);
          st.s.material.opacity = 0.55 * Math.sin(q * P);
        }
      },
    };
  },
};
