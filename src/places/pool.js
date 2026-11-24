import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, mesh, canvasTexture, roundRect, FONT, rng, clamp, lerp, easeInOut, easeOutCubic, bakeStatic } from '../util.js';
import { makeWaterMaterial, makeBasinMaterial, rippleHeight, MAX_RIPPLES } from './pool/water.js';
import { makeAtlas } from './pool/atlas.js';
import * as M from './pool/models.js';

// The city pool: a sunken basin with a kids' splash area, a main pool and a deep end, a diving tower,
// a slide, loungers, a lifeguard, a snack kiosk and floats that drift away from swimmers.
// The water reacts to Roji and Homama: rings while they swim or wade, a wake behind swimmers,
// and a big splash ring with droplets when someone lands in the water.

const WY = -0.25; // water surface
const POOL = { x: 0, z: -1, hw: 7.5, hd: 4 }; // basin footprint (local)
const KIDS_X = -3.5; // the kids' area is x < KIDS_X
const SLOPE = [1.5, 4.0]; // floor slopes from the main pool to the deep end
const FLOOR = { kids: -0.67, main: -1.4, deep: -2.25 };
const NAME = { roji: 'Roji', homama: 'Homama' };

// Diving tower (platform, stairs, board) and slide placement
const TOWER = { x0: 8.4, z: -1.6, H: 1.3, pw: 2.8, pd: 2.8, stepD: 0.48, steps: 4, stairW: 1.6, boardLen: 3.4 };
const BOARD_TOP = TOWER.H + 0.12 + 0.045;
const BOARD_TIP = TOWER.x0 + 0.3 + 0.3 - TOWER.boardLen; // world-local x of the tip
const SLIDE = { x: -10.3, z: -2.6, y0: 1.55, x0: 0.6, x1: 3.4, y1: -0.08 };

const inPool = (x, z, m = 0) => Math.abs(x - POOL.x) < POOL.hw - m && Math.abs(z - POOL.z) < POOL.hd - m;

// UVs from the geometry's own (already placed) coordinates, so one tile texture fits every size.
function planarUV(geo, su, sv = su) {
  const p = geo.attributes.position;
  const n = geo.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i));
    const ay = Math.abs(n.getY(i));
    const az = Math.abs(n.getZ(i));
    let u;
    let v;
    if (ay >= ax && ay >= az) [u, v] = [p.getX(i) / su, p.getZ(i) / su];
    else if (ax >= az) [u, v] = [p.getZ(i) / su, p.getY(i) / sv];
    else [u, v] = [p.getX(i) / su, p.getY(i) / sv];
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

function slab(w, h, d, x, y, z, material, su, sv, rz = 0) {
  const geo = new THREE.BoxGeometry(w, h, d);
  if (rz) geo.rotateZ(rz);
  geo.translate(x, y, z);
  planarUV(geo, su, sv);
  return mesh(geo, material);
}

function tileTexture(n, base, grout, shades, seed, px = 256) {
  const tex = canvasTexture(px, px, (ctx, w, h) => {
    const r = rng(seed);
    const s = w / n;
    ctx.fillStyle = grout;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = r() < 0.8 ? base : shades[Math.floor(r() * shades.length)];
        roundRect(ctx, i * s + 2, j * s + 2, s - 4, s - 4, Math.max(2, s * 0.12));
        ctx.fill();
      }
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export default {
  id: 'pool',
  stop: {
    title: 'City Pool',
    tag: 'Swim and splash',
    icon: 'poolWave',
    color: '#2bb6d6',
    text: 'A sunny pool in the middle of town. Swim, float on the rings, zoom down the slide and dive off the big board.',
  },
  icons: {
    poolWave: 'M3 12c1.5 0 1.5-1.5 3-1.5S7.5 12 9 12s1.5-1.5 3-1.5S13.5 12 15 12s1.5-1.5 3-1.5S19.5 12 21 12 M3 17c1.5 0 1.5-1.5 3-1.5S7.5 17 9 17s1.5-1.5 3-1.5S13.5 17 15 17s1.5-1.5 3-1.5S19.5 17 21 17 M8 7.5a4 4 0 0 1 8 0',
    poolRing: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M12 4v5 M12 15v5 M4 12h5 M15 12h5',
    poolDive: 'M12 3v8 M8.5 7.5 12 11l3.5-3.5 M3 16c1.5 0 1.5-1.5 3-1.5S7.5 16 9 16s1.5-1.5 3-1.5S13.5 16 15 16s1.5-1.5 3-1.5S19.5 16 21 16 M3 20.5c1.5 0 1.5-1.5 3-1.5S7.5 20.5 9 20.5s1.5-1.5 3-1.5 3 1.5 3 1.5',
    poolSun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 2.5v2 M12 19.5v2 M2.5 12h2 M19.5 12h2 M5.3 5.3l1.4 1.4 M17.3 17.3l1.4 1.4 M5.3 18.7l1.4-1.4 M17.3 6.7l1.4-1.4',
    poolCone: 'M7.5 10a4.5 4.5 0 0 1 9 0 M7 10h10l-5 11z M9.5 13.5h5',
    poolSlide: 'M5 21V5 M5 8h3 M5 12h3 M8 5c4 0 5 13 12 13 M8 5v4c3 1 4 12 12 12',
  },

  build(ctx) {
    const { size, api } = ctx;
    const g = new THREE.Group();
    const dynamic = [];
    const colliders = [];
    const hotspots = [];
    const add = (o, x = 0, y = 0, z = 0, ry = 0) => {
      o.position.set(x, y, z);
      o.rotation.y = ry;
      g.add(o);
      return o;
    };
    const W = size.w / 2;
    const D = size.d / 2;
    const time = { value: 0 };

    // ---------------------------------------------------------------- deck, perimeter wall, entrance
    const deckMat = new THREE.MeshStandardMaterial({ map: tileTexture(4, '#f8e9d6', '#e8d2b8', ['#fbe1d0', '#f3ddc2', '#fff3e4'], 3), roughness: 0.85 });
    const DT = 0.006; // deck top
    const deckPart = (x0, x1, z0, z1) => g.add(slab(x1 - x0, 0.04, z1 - z0, (x0 + x1) / 2, DT - 0.02, (z0 + z1) / 2, deckMat, 1.6));
    const px0 = POOL.x - POOL.hw;
    const px1 = POOL.x + POOL.hw;
    const pz0 = POOL.z - POOL.hd;
    const pz1 = POOL.z + POOL.hd;
    deckPart(-W, W, -D, pz0);
    deckPart(-W, W, pz1, D);
    deckPart(-W, px0, pz0, pz1);
    deckPart(px1, W, pz0, pz1);
    for (const m of g.children) m.castShadow = false;

    const wallMat = mat('#fff1dc', { rough: 0.8 });
    const capMat = mat('#5cc8c8', { rough: 0.6 });
    const wallH = 0.5;
    const wallPiece = (x0, x1, z0, z1) => {
      const w = M.rbox(x1 - x0, wallH, z1 - z0, wallMat, 0.06, undefined, 1);
      add(w, (x0 + x1) / 2, wallH / 2, (z0 + z1) / 2);
      const c = M.rbox(x1 - x0 + 0.08, 0.1, z1 - z0 + 0.08, capMat, 0.04, undefined, 1);
      add(c, (x0 + x1) / 2, wallH + 0.03, (z0 + z1) / 2);
      colliders.push({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: (x1 - x0) / 2, hd: (z1 - z0) / 2, h: wallH + 0.08 });
    };
    const T = 0.3;
    wallPiece(-W, W, -D, -D + T);
    wallPiece(-W, -W + T, -D + T, D);
    wallPiece(W - T, W, -D + T, D);
    wallPiece(-W + T, -2.3, D - T, D);
    wallPiece(2.3, W - T, D - T, D);
    // wave tiles painted along the front wall
    for (const [x0, x1] of [[-W + T, -2.3], [2.3, W - T]]) {
      const len = x1 - x0 - 0.1;
      const strip = M.paintedPlate(len, 0.22, (c, w, h) => {
        c.fillStyle = '#fff1dc';
        c.fillRect(0, 0, w, h);
        c.strokeStyle = '#7fd3e0';
        c.lineWidth = h * 0.12;
        c.lineCap = 'round';
        c.beginPath();
        for (let x = 0; x <= w; x += 3) c.lineTo(x, h * 0.5 + Math.sin((x / w) * Math.PI * 2 * (len / 0.9)) * h * 0.2);
        c.stroke();
      }, { pxPerM: 120, atlasMax: [600, 40] });
      add(strip, (x0 + x1) / 2, 0.26, D + 0.002);
    }
    // entrance: pillars, an arch and a banner
    for (const sx of [-1, 1]) {
      const pillar = M.rbox(0.55, 1.5, 0.55, '#5cc8c8', 0.08);
      add(pillar, sx * 2.55, 0.75, D - 0.15);
      const ball = M.sph(0.24, '#ffd166', { rough: 0.5 }, 16);
      add(ball, sx * 2.55, 1.74, D - 0.15);
      colliders.push({ type: 'box', x: sx * 2.55, z: D - 0.15, hw: 0.28, hd: 0.28 });
    }
    const arch = mesh(new THREE.TorusGeometry(2.55, 0.09, 10, 40, Math.PI), mat('#ffffff', { rough: 0.5 }));
    add(arch, 0, 1.55, D - 0.15);
    add(M.rbox(2.9, 0.66, 0.08, '#ff8fa3', 0.06), 0, 3.25, D - 0.15);
    const banner = M.paintedPlate(2.7, 0.5, (c, w, h) => {
      c.fillStyle = '#ff8fa3';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `600 ${h * 0.56}px ${FONT}`;
      c.fillText('Have a splashy day', w / 2, h * 0.55, w * 0.92);
    }, { pxPerM: 200, atlasMax: [512, 96] });
    add(banner, 0, 3.25, D - 0.105);
    for (const sx of [-0.9, 0.9]) {
      const rope = M.cyl(0.015, 0.015, 0.5, '#ffffff', 6);
      add(rope, sx, 3.75, D - 0.1);
    }
    for (const sx of [-1, 1]) {
      add(M.buoyPost(), sx * 3.3, 0, D - 0.75, 0);
      colliders.push({ type: 'circle', x: sx * 3.3, z: D - 0.75, r: 0.12 });
    }
    // the City Pool sign
    const sign = ctx.sign(['Welcome to the', 'City Pool'], { width: 2.8, height: 1.15, accent: '#2bb6c4', color: '#2bb6c4', postHeight: 0.8 });
    sign.traverse((o) => o.isMesh && [o.material].flat().forEach((m) => m.map && (m.userData.atlasMax = [320, 150])));
    add(sign, -6.2, 0, D - 1.25, 0.1);
    colliders.push({ type: 'box', x: -6.2, z: D - 1.31, hw: 1.2, hd: 0.12 });

    // ---------------------------------------------------------------- the basin
    const basinTex = tileTexture(8, '#8fdcea', '#e8fbff', ['#7fd0e2', '#a6e6f0', '#6fc4dc'], 7);
    const basinMat = makeBasinMaterial(basinTex, time, WY);
    const bandTex = canvasTexture(256, 64, (c, w, h) => {
      const n = 8;
      const s = w / n;
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < 2; j++) {
          c.fillStyle = (i + j) % 2 ? '#2a9fc9' : i % 4 === 0 && j === 0 ? '#ff8fb1' : '#5cc8c8';
          roundRect(c, i * s + 2, j * (h / 2) + 2, s - 4, h / 2 - 4, 4);
          c.fill();
        }
      }
    });
    bandTex.wrapS = bandTex.wrapT = THREE.RepeatWrapping;
    const bandMat = makeBasinMaterial(bandTex, time, WY);
    const wallT = 0.2;
    const deepest = FLOOR.deep - 0.12;
    const wallHgt = -deepest;
    // walls (inner faces exactly on the hole edges)
    g.add(slab(POOL.hw * 2 + wallT * 2, wallHgt, wallT, POOL.x, deepest / 2, pz0 - wallT / 2, basinMat, 1.2));
    g.add(slab(POOL.hw * 2 + wallT * 2, wallHgt, wallT, POOL.x, deepest / 2, pz1 + wallT / 2, basinMat, 1.2));
    g.add(slab(wallT, wallHgt, POOL.hd * 2, px0 - wallT / 2, deepest / 2, POOL.z, basinMat, 1.2));
    g.add(slab(wallT, wallHgt, POOL.hd * 2, px1 + wallT / 2, deepest / 2, POOL.z, basinMat, 1.2));
    // waterline mosaic band
    const bandY = -0.15;
    const bandH = 0.3;
    g.add(slab(POOL.hw * 2, bandH, 0.02, POOL.x, bandY, pz0 + 0.01, bandMat, 0.6, 0.3));
    g.add(slab(POOL.hw * 2, bandH, 0.02, POOL.x, bandY, pz1 - 0.01, bandMat, 0.6, 0.3));
    g.add(slab(0.02, bandH, POOL.hd * 2 - 0.04, px0 + 0.01, bandY, POOL.z, bandMat, 0.6, 0.3));
    g.add(slab(0.02, bandH, POOL.hd * 2 - 0.04, px1 - 0.01, bandY, POOL.z, bandMat, 0.6, 0.3));
    // floors: kids' area (a raised block), main, slope, deep end
    g.add(slab(KIDS_X - px0, FLOOR.kids - FLOOR.main + 0.1, POOL.hd * 2, (px0 + KIDS_X) / 2, (FLOOR.kids + FLOOR.main - 0.1) / 2, POOL.z, basinMat, 1.2));
    g.add(slab(SLOPE[0] - KIDS_X, 0.1, POOL.hd * 2, (KIDS_X + SLOPE[0]) / 2, FLOOR.main - 0.05, POOL.z, basinMat, 1.2));
    const sl = Math.hypot(SLOPE[1] - SLOPE[0], FLOOR.deep - FLOOR.main);
    const sa = Math.atan2(FLOOR.deep - FLOOR.main, SLOPE[1] - SLOPE[0]);
    g.add(slab(sl + 0.06, 0.1, POOL.hd * 2, (SLOPE[0] + SLOPE[1]) / 2, (FLOOR.main + FLOOR.deep) / 2 - 0.05, POOL.z, basinMat, 1.2, 1.2, sa));
    g.add(slab(px1 - SLOPE[1], 0.1, POOL.hd * 2, (SLOPE[1] + px1) / 2, FLOOR.deep - 0.05, POOL.z, basinMat, 1.2));
    // painted floor: lane lines, a tiled heart in the main pool and a sun in the kids' area.
    // Everything points at flat swatches of one small texture, so it bakes into one mesh.
    const PAINT = ['#2f6fb3', '#ff2a4f', '#ff5272', '#ffd3d9', '#ffe14d', '#ffa62b'];
    const paintTex = canvasTexture(PAINT.length * 8, 8, (c) => PAINT.forEach((col, i) => ((c.fillStyle = col), c.fillRect(i * 8, 0, 8, 8))));
    paintTex.wrapS = THREE.RepeatWrapping; // keeps it out of the prop atlas
    const paintMat = makeBasinMaterial(paintTex, time, WY, 0.35);
    const paintUV = (geo, col) => {
      const u = (PAINT.indexOf(col) * 8 + 4) / (PAINT.length * 8);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, u, 0.5);
      return geo;
    };
    const navy = (w, h, d, x, y, z, rz = 0) => {
      const o = slab(w, h, d, x, y, z, paintMat, 1, 1, rz);
      paintUV(o.geometry, PAINT[0]);
      o.castShadow = false;
      g.add(o);
    };
    for (const lz of [POOL.z - 2.6, POOL.z + 2.6]) {
      navy(SLOPE[0] - KIDS_X - 1.2, 0.02, 0.22, (KIDS_X + SLOPE[0]) / 2 + 0.2, FLOOR.main + 0.01, lz);
      navy(sl - 0.1, 0.02, 0.22, (SLOPE[0] + SLOPE[1]) / 2, (FLOOR.main + FLOOR.deep) / 2 + 0.01, lz, sa);
      navy(px1 - SLOPE[1] - 0.8, 0.02, 0.22, (SLOPE[1] + px1) / 2 - 0.4, FLOOR.deep + 0.01, lz);
      navy(0.22, 0.02, 0.9, px1 - 1.2, FLOOR.deep + 0.01, lz);
    }
    const floorArt = [];
    const tile = (w, d, x, y, z, col, ry = 0) => {
      const geo = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).rotateY(ry).translate(x, y, z);
      floorArt.push(paintUV(geo, col));
    };
    {
      const n = 15;
      const s = 2.6 / n;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const hx = ((i + 0.5) / n - 0.5) * 2.2;
          const hy = (0.5 - (j + 0.5) / n) * 2.2 + 0.12;
          const q = hx * hx + (hy - Math.sqrt(Math.abs(hx)) * 0.78) ** 2;
          if (q > 0.98) continue;
          const col = q > 0.66 ? PAINT[1] : (i * 7 + j * 3) % 5 === 0 ? PAINT[3] : PAINT[2];
          tile(s * 0.84, s * 0.84, -0.6 + (i + 0.5 - n / 2) * s, FLOOR.main + 0.012, POOL.z + (j + 0.5 - n / 2) * s, col);
        }
      }
      const sunX = -5.7;
      const sunZ = POOL.z - 1.6;
      const disc = new THREE.CircleGeometry(0.44, 20).rotateX(-Math.PI / 2).translate(sunX, FLOOR.kids + 0.012, sunZ);
      floorArt.push(paintUV(disc, PAINT[4]));
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        tile(0.1, 0.32, sunX + Math.cos(a) * 0.74, FLOOR.kids + 0.012, sunZ + Math.sin(a) * 0.74, PAINT[5], -a + Math.PI / 2);
      }
    }
    g.add(mesh(mergeGeometries(floorArt.map((x) => x.toNonIndexed())), paintMat, { cast: false }));
    // coping around the rim
    const copeMat = mat('#fffaf2', { rough: 0.55 });
    const cw = 0.44;
    const ch = 0.05;
    for (const z of [pz0 - cw / 2 + 0.05, pz1 + cw / 2 - 0.05]) add(M.rbox(POOL.hw * 2 + cw * 2 - 0.1, ch, cw, copeMat, 0.02, undefined, 1), POOL.x, ch / 2, z);
    for (const x of [px0 - cw / 2 + 0.05, px1 + cw / 2 - 0.05]) add(M.rbox(cw, ch, POOL.hd * 2 - 0.1 + 0.02, copeMat, 0.02, undefined, 1), x, ch / 2, POOL.z);
    // depth marks on the deck
    const depthMark = (text, x, z) => {
      add(M.rbox(0.98, 0.03, 0.44, '#2f6fb3', 0.012), x, DT + 0.012, z);
      const o = M.paintedPlate(0.9, 0.36, (c, w, h) => {
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#2f6fb3';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = `600 ${h * 0.6}px ${FONT}`;
        c.fillText(text, w / 2, h / 2 + 2);
      }, { pxPerM: 180, atlasMax: [128, 52] });
      o.rotation.x = -Math.PI / 2;
      add(o, x, DT + 0.029, z);
    };
    depthMark('0.4 m', -5.5, pz1 + 0.62);
    depthMark('1.1 m', 1.0, pz1 + 0.62);
    depthMark('2 m', 5.5, pz1 + 0.62);

    // kids' area steps (front edge), with handrails
    const stepX = [-7.3, -4.6];
    const sw = stepX[1] - stepX[0];
    const sxc = (stepX[0] + stepX[1]) / 2;
    const stepA = -0.47;
    const stepB = -0.26;
    g.add(slab(sw, stepA - FLOOR.kids, 1.25, sxc, (stepA + FLOOR.kids) / 2, pz1 - 0.625, basinMat, 1.2));
    g.add(slab(sw, stepB - FLOOR.kids, 0.6, sxc, (stepB + FLOOR.kids) / 2, pz1 - 0.3, basinMat, 1.2));
    for (const [y, z] of [[stepA, pz1 - 1.24], [stepB, pz1 - 0.59]]) navy(sw, 0.02, 0.08, sxc, y + 0.005, z);
    for (const x of [stepX[0] + 0.08, stepX[1] - 0.08]) {
      g.add(M.rail([[x, 0, pz1 + 0.5], [x, 0.85, pz1 + 0.35], [x, 0.7, pz1 - 0.15], [x, -0.1, pz1 - 1.0], [x, -0.45, pz1 - 1.2]], 0.035));
    }
    colliders.push({ type: 'box', x: sxc, z: pz1 - 0.95, hw: sw / 2, hd: 0.325, h: stepA });
    colliders.push({ type: 'box', x: sxc, z: pz1 - 0.3, hw: sw / 2, hd: 0.3, h: stepB });
    // Rim around the kids' area: wading kids (feet well below the deck) leave by the steps or a jump
    const rim = (x, z, hw, hd) => colliders.push({ type: 'box', x, z, hw, hd, h: 0 });
    rim(px0 - 0.15, POOL.z, 0.15, POOL.hd);
    rim((px0 + KIDS_X) / 2, pz0 - 0.15, (KIDS_X - px0) / 2, 0.15);
    rim((px0 + stepX[0]) / 2, pz1 + 0.15, (stepX[0] - px0) / 2, 0.15);
    rim((stepX[1] + KIDS_X) / 2, pz1 + 0.15, (KIDS_X - stepX[1]) / 2, 0.15);

    // deep-end ladder
    for (const lz of [pz1 - 1.6, pz1 - 1.1]) {
      g.add(M.rail([[px1 + 0.35, 0, lz], [px1 + 0.35, 0.75, lz], [px1 + 0.05, 0.85, lz], [px1 - 0.12, 0.4, lz], [px1 - 0.12, -1.0, lz]], 0.035));
    }
    for (let i = 0; i < 3; i++) {
      const rung = M.cyl(0.025, 0.025, 0.5, '#e9f1f4', 8, { rough: 0.25, metal: 0.55 });
      rung.rotation.x = Math.PI / 2;
      add(rung, px1 - 0.12, -0.35 - i * 0.28, pz1 - 1.35);
    }

    // ---------------------------------------------------------------- water
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(POOL.hw * 2, POOL.hd * 2, 96, 52).rotateX(-Math.PI / 2),
      makeWaterMaterial({
        half: { x: POOL.hw, z: POOL.hd },
        colors: { shallow: '#8fe7ef', mid: '#47c6e0', deep: '#2794cf' },
        zones: { kids: KIDS_X - POOL.x, slope0: SLOPE[0] - POOL.x, slope1: SLOPE[1] - POOL.x },
      }),
    );
    water.position.set(POOL.x, WY, POOL.z);
    water.receiveShadow = true;
    water.castShadow = false;
    water.renderOrder = 1;
    g.add(water);
    dynamic.push(water);
    const U = water.material.userData.uniforms;
    U.uTime = time;

    // ---------------------------------------------------------------- diving tower
    const tower = M.divingTower({ H: TOWER.H, pw: TOWER.pw, pd: TOWER.pd, steps: TOWER.steps, stepD: TOWER.stepD, stairW: TOWER.stairW, stairX: TOWER.pw / 2, boardLen: TOWER.boardLen });
    add(tower.group, TOWER.x0, 0, TOWER.z);
    dynamic.push(tower.board, tower.flag);
    const tcx = TOWER.x0 + TOWER.pw / 2;
    colliders.push({ type: 'box', x: tcx, z: TOWER.z, hw: TOWER.pw / 2, hd: TOWER.pd / 2, h: TOWER.H });
    const rise = TOWER.H / (TOWER.steps + 1);
    const stairZ = (i) => TOWER.z + TOWER.pd / 2 + (i - 0.5) * TOWER.stepD;
    for (let i = 1; i <= TOWER.steps; i++) colliders.push({ type: 'box', x: tcx, z: stairZ(i), hw: TOWER.stairW / 2, hd: TOWER.stepD / 2, h: TOWER.H - rise * i });
    colliders.push({ type: 'box', x: (BOARD_TIP + TOWER.x0) / 2, z: TOWER.z, hw: (TOWER.x0 - BOARD_TIP) / 2, hd: 0.31, h: BOARD_TOP });

    // ---------------------------------------------------------------- slide into the kids' area
    const sld = M.slide({ y0: SLIDE.y0, x0: SLIDE.x0, x1: SLIDE.x1, y1: SLIDE.y1 });
    add(sld.group, SLIDE.x, 0, SLIDE.z);
    dynamic.push(sld.flow);
    colliders.push({ type: 'box', x: SLIDE.x, z: SLIDE.z, hw: 0.6, hd: 0.6, h: SLIDE.y0 });
    const chuteEnd = SLIDE.x + SLIDE.x1;
    colliders.push({ type: 'box', x: (SLIDE.x + SLIDE.x0 + chuteEnd) / 2, z: SLIDE.z, hw: (chuteEnd - SLIDE.x - SLIDE.x0) / 2, hd: 0.34 });
    const chuteY = (lx) => sld.yAt(lx - SLIDE.x);

    // ---------------------------------------------------------------- lifeguard
    const chair = M.lifeguardChair();
    add(chair, -0.4, 0, pz0 - 1.45);
    colliders.push({ type: 'box', x: -0.4, z: pz0 - 1.45, hw: 0.55, hd: 0.5 });
    const guard = ctx.makeKid({ id: 'lifeguard', name: 'Lifeguard', gender: 'boy', skin: '#c98f68', hair: '#3a2316', hairstyle: 'short', outfit: 'tee-shorts', top: '#ef5b6f', bottom: '#ffd166', shoes: '#ffffff', accent: '#ffd166' });
    guard.pose = 'sit';
    guard.update(1, 0, 0, 0, 0);
    guard.blob.visible = false;
    const cap = M.lifeguardCap();
    guard.head.add(cap);
    const whistle = M.rbox(0.07, 0.05, 0.1, '#ffd166', 0.02);
    whistle.position.set(0.05, 0.6, 0.21);
    const cord = mesh(new THREE.TorusGeometry(0.12, 0.01, 4, 20), mat('#ffffff'));
    cord.position.set(0, 0.72, 0.06);
    cord.rotation.x = 1.25;
    guard.body.add(whistle, cord);
    guard.root.position.set(-0.4, 1.49, pz0 - 1.52);
    g.add(guard.root);

    // ---------------------------------------------------------------- loungers and umbrellas (back deck)
    const loungers = [
      { x: 3.0, z: -8.35 },
      { x: 4.35, z: -8.35 },
    ];
    const addLounger = (x, z, a, b, ry = 0) => {
      add(M.lounger(a, b), x, 0, z, ry);
      colliders.push({ type: 'box', x, z, hw: ry ? 1.0 : 0.37, hd: ry ? 0.37 : 1.0, h: 0.44 });
    };
    addLounger(loungers[0].x, loungers[0].z, '#ffb59e', '#fff6ea');
    addLounger(loungers[1].x, loungers[1].z, '#7fd3e0', '#fff6ea');
    add(M.sideTable(), 3.68, 0, -7.75);
    colliders.push({ type: 'circle', x: 3.68, z: -7.75, r: 0.3, h: 0.52 });
    add(M.umbrella('#ff8fa3', '#fff6ea', 2.4, 1.45), 3.68, 0, -9.55);
    colliders.push({ type: 'circle', x: 3.68, z: -9.55, r: 0.2 });
    addLounger(6.3, -8.35, '#ffd166', '#fff6ea');
    addLounger(7.65, -8.35, '#c7a6ff', '#fff6ea');
    add(M.umbrella('#5cc8c8', '#fff6ea', 2.4, 1.45), 6.98, 0, -9.55);
    colliders.push({ type: 'circle', x: 6.98, z: -9.55, r: 0.2 });
    add(M.towelStack(), 9.3, 0, -9.9);
    colliders.push({ type: 'box', x: 9.3, z: -9.9, hw: 0.3, hd: 0.22, h: 0.33 });
    // front deck: a lounger pair facing the pool and an umbrella table
    addLounger(-9.6, 6.9, '#ff8fb1', '#fff6ea', Math.PI / 2);
    addLounger(-9.6, 5.5, '#ffd166', '#fff6ea', Math.PI / 2);
    add(M.umbrella('#ffd166', '#fff6ea', 2.3, 1.3), -10.8, 0, 8.3);
    colliders.push({ type: 'circle', x: -10.8, z: 8.3, r: 0.2 });
    // umbrella table with stools near the kiosk
    const tableX = -4.9;
    const tableZ = -8.6;
    add(M.cyl(0.65, 0.65, 0.07, '#ffffff', 20), tableX, 0.74, tableZ);
    add(M.cyl(0.06, 0.1, 0.74, '#e9f1f4', 10), tableX, 0.37, tableZ);
    add(M.umbrella('#ff6f91', '#ffffff', 2.4, 1.4), tableX, 0, tableZ);
    colliders.push({ type: 'circle', x: tableX, z: tableZ, r: 0.66, h: 0.78 });
    for (const [dx, dz, c] of [[-1.0, 0.1, '#5cc8c8'], [1.0, -0.1, '#ffd166'], [0.1, 1.0, '#ff8fb1']]) {
      add(M.cyl(0.24, 0.22, 0.08, c, 14), tableX + dx, 0.46, tableZ + dz);
      add(M.cyl(0.05, 0.06, 0.44, '#e9f1f4', 8), tableX + dx, 0.22, tableZ + dz);
      colliders.push({ type: 'circle', x: tableX + dx, z: tableZ + dz, r: 0.24, h: 0.5 });
    }

    // ---------------------------------------------------------------- snack kiosk
    const kz = -D + T + 1.15;
    add(M.kiosk(), -9.2, 0, kz);
    colliders.push({ type: 'box', x: -9.2, z: kz, hw: 1.75, hd: 1.15 });
    for (const x of [-10.0, -9.2, -8.4]) colliders.push({ type: 'circle', x, z: kz + 1.85, r: 0.22, h: 0.64 });

    // ---------------------------------------------------------------- plants and small details
    const palm = (x, z, seed, s = 1) => {
      add(M.pottedPalm(seed, s), x, 0, z);
      colliders.push({ type: 'circle', x, z, r: 0.42 * s, h: 0.56 * s });
    };
    palm(-10.9, 9.9, 1, 1.05);
    palm(10.9, 9.9, 2, 1.05);
    palm(10.9, -9.9, 3, 1.1);
    palm(-6.6, -9.95, 4, 0.9);
    palm(-4.0, 9.95, 5, 0.85);
    palm(4.0, 9.95, 6, 0.85);
    palm(10.9, 7.0, 7, 0.95);
    for (const [x, c, s] of [[-7.2, '#ff8fb1', 11], [7.2, '#ffd166', 12]]) {
      add(M.flowerPlanter(2.4, c, s), x, 0, D - T - 0.4);
      colliders.push({ type: 'box', x, z: D - T - 0.4, hw: 1.2, hd: 0.3, h: 0.5 });
    }
    add(M.flowerPlanter(1.8, '#c7a6ff', 13), -2.4, 0, -D + T + 0.4);
    colliders.push({ type: 'box', x: -2.4, z: -D + T + 0.4, hw: 0.9, hd: 0.3, h: 0.5 });
    add(M.shower(), 8.0, 0, 9.6, Math.PI);
    colliders.push({ type: 'circle', x: 8.0, z: 9.6, r: 0.1 });
    add(M.noodleBin(), 3.3, 0, pz1 + 1.5);
    colliders.push({ type: 'circle', x: 3.3, z: pz1 + 1.5, r: 0.36, h: 0.6 });
    add(M.towelStack(['#ffd166', '#ff8fb1', '#c7a6ff']), -7.4, 0, 4.2, 0.3);
    colliders.push({ type: 'box', x: -7.4, z: 4.2, hw: 0.3, hd: 0.22, h: 0.33 });

    // ---------------------------------------------------------------- floats
    const floatsGroup = new THREE.Group();
    g.add(floatsGroup);
    dynamic.push(floatsGroup);
    const mkFloat = (obj, x, z, r, kind) => {
      floatsGroup.add(obj);
      return { obj, kind, x, z, vx: 0, vz: 0, yaw: Math.random() * 6, vyaw: 0, r, phase: Math.random() * 6, rider: null, y: WY };
    };
    const ringPink = mkFloat(M.swimRing('donut'), -1.8, 0.6, 0.62, 'ring');
    const ringBlue = mkFloat(M.swimRing('stripes'), 1.6, -2.4, 0.62, 'ring');
    const duck = mkFloat(M.duckFloat(), 4.6, 0.8, 0.6, 'duck');
    const ballObj = new THREE.Group();
    const ballMesh = mesh(new THREE.SphereGeometry(0.3, 18, 12), new THREE.MeshStandardMaterial({ map: canvasTexture(256, 128, (c, w, h) => {
      const cols = ['#ef5b6f', '#ffffff', '#ffd166', '#ffffff', '#3fa7f0', '#ffffff'];
      cols.forEach((col, i) => ((c.fillStyle = col), c.fillRect((i * w) / 6, 0, w / 6 + 1, h)));
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h * 0.08);
      c.fillRect(0, h * 0.92, w, h * 0.08);
    }), roughness: 0.4 }));
    ballMesh.material.userData.atlasMax = [128, 64];
    ballObj.add(ballMesh);
    const ball = mkFloat(ballObj, -5.2, 0.4, 0.34, 'ball');
    const floats = [ringPink, ringBlue, duck, ball];

    // ---------------------------------------------------------------- splash droplets and crowns
    const DROPS = 140;
    const dropMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 1), new THREE.MeshStandardMaterial({ color: '#eafcff', emissive: '#bff3ff', emissiveIntensity: 0.45, roughness: 0.15 }), DROPS);
    dropMesh.frustumCulled = false;
    dropMesh.castShadow = false;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < DROPS; i++) dropMesh.setMatrixAt(i, zero);
    g.add(dropMesh);
    dynamic.push(dropMesh);
    const drops = Array.from({ length: DROPS }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 1 }));
    let dropNext = 0;
    const crownTex = canvasTexture(256, 64, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      const n = 9;
      for (let i = 0; i < n; i++) {
        const x = ((i + 0.5) / n) * w;
        const tip = h * (0.08 + (i % 3) * 0.1);
        c.beginPath();
        c.moveTo(x - w / n / 2, h);
        c.quadraticCurveTo(x - w / n / 5, h * 0.45, x, tip);
        c.quadraticCurveTo(x + w / n / 5, h * 0.45, x + w / n / 2, h);
        c.fill();
        c.beginPath();
        c.arc(x, tip, w / n / 7, 0, Math.PI * 2);
        c.fill();
      }
    });
    const crownMat = new THREE.MeshBasicMaterial({ map: crownTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: '#ffffff', alphaTest: 0.05 });
    const crowns = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 0.75, 1, 27, 1, true), crownMat.clone());
      m.visible = false;
      m.renderOrder = 2;
      g.add(m);
      dynamic.push(m);
      return { m, life: 0, power: 1 };
    });
    let crownNext = 0;

    // ---------------------------------------------------------------- ripples
    const rips = U.uRip.value; // vec4(x, z, t0, amp), pool-local
    let ripNext = 0;
    let now = 0;
    const ripple = (x, z, amp, delay = 0) => {
      rips[ripNext].set(x - POOL.x, z - POOL.z, now + delay, amp);
      ripNext = (ripNext + 1) % MAX_RIPPLES;
    };

    // ---------------------------------------------------------------- sounds
    let noiseBuf = null;
    const sfx = () => {
      const s = api.sound;
      if (!s?.ctx || s.muted) return null;
      if (!noiseBuf) {
        const c = s.ctx;
        noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 1.2), c.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      return s;
    };
    const splashSound = (power) => {
      const s = sfx();
      if (!s) return;
      const c = s.ctx;
      const t0 = c.currentTime;
      const src = c.createBufferSource();
      src.buffer = noiseBuf;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(1800 + power * 1600, t0);
      f.frequency.exponentialRampToValueAtTime(380, t0 + 0.35 + power * 0.3);
      const gn = c.createGain();
      const peak = clamp(0.06 + power * 0.12, 0.05, 0.34);
      gn.gain.setValueAtTime(0.0001, t0);
      gn.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
      gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3 + power * 0.35);
      src.connect(f).connect(gn).connect(s.sfx || c.destination);
      src.start(t0);
      src.stop(t0 + 1.1);
      const n = 2 + Math.round(power * 2);
      for (let i = 0; i < n; i++) s.tone(260 + Math.random() * 380, t0 + 0.08 + i * 0.07 + Math.random() * 0.04, 0.12, { slideTo: 700 + Math.random() * 600, gain: 0.03 + power * 0.01 });
    };
    const paddleSound = () => {
      const s = sfx();
      if (!s) return;
      const c = s.ctx;
      const t0 = c.currentTime;
      const src = c.createBufferSource();
      src.buffer = noiseBuf;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900 + Math.random() * 500;
      f.Q.value = 1.2;
      const gn = c.createGain();
      gn.gain.setValueAtTime(0.0001, t0);
      gn.gain.exponentialRampToValueAtTime(0.035, t0 + 0.03);
      gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      src.connect(f).connect(gn).connect(s.sfx || c.destination);
      src.start(t0, Math.random() * 0.8);
      src.stop(t0 + 0.3);
    };

    // A splash at local (x, z): rings, droplets, a crown, a sound, and a push on the floats.
    const tmpM = new THREE.Matrix4();
    function splash(x, z, power) {
      ripple(x, z, 1.0 + power * 1.1);
      ripple(x, z, 0.6 + power * 0.6, 0.22);
      if (power > 0.8) ripple(x, z, 0.5 + power * 0.3, 0.5);
      const n = Math.round(10 + power * 34);
      for (let i = 0; i < n; i++) {
        const d = drops[dropNext];
        dropNext = (dropNext + 1) % DROPS;
        const a = Math.random() * Math.PI * 2;
        const sp = (0.8 + Math.random() * 1.8) * (0.6 + power * 0.45);
        d.p.set(x + Math.cos(a) * 0.25, WY + 0.05, z + Math.sin(a) * 0.25);
        d.v.set(Math.cos(a) * sp, (2.4 + Math.random() * 3.2) * (0.55 + power * 0.35), Math.sin(a) * sp);
        d.life = 1;
        d.s = 0.6 + Math.random() * 0.9;
      }
      const cr = crowns[crownNext];
      crownNext = (crownNext + 1) % crowns.length;
      cr.life = 1;
      cr.power = power;
      cr.m.position.set(x, WY, z);
      cr.m.visible = true;
      for (const f of floats) {
        if (f.rider) continue;
        const dx = f.x - x;
        const dz = f.z - z;
        const dd = Math.hypot(dx, dz) || 0.01;
        if (dd > 4.5) continue;
        const k = (power * 1.6) / (0.6 + dd);
        f.vx += (dx / dd) * k;
        f.vz += (dz / dd) * k;
        f.vyaw += (Math.random() - 0.5) * k;
      }
      splashSound(power);
    }

    // ---------------------------------------------------------------- the diving board spring
    const boardS = { a: 0, v: 0, load: 0 };

    // ---------------------------------------------------------------- per-kid tracking
    const kidState = {};
    const stateOf = (id) => (kidState[id] ??= { wasIn: false, peak: 0, emit: 0, stroke: 0, inWater: false, lx: 0, lz: 0 });

    // Scripted moves (dive, slide) step through a list of hops and glides.
    // seg: { to: [x, y, z], dur, hop, yaw?, ease?, flip?, pose?, hands?, onStart?, onEnd?, y?(k) }
    function runner(actor, segs, onDone) {
      const st = { i: -1, k: 0, from: null, seg: null, done: false };
      const next = () => {
        st.seg?.onEnd?.();
        st.i++;
        st.k = 0;
        if (st.i >= segs.length) {
          st.done = true;
          onDone?.();
          return;
        }
        const lp = api.localPos(actor);
        st.from = [lp.x, actor.kid.root.position.y, lp.z];
        st.seg = segs[st.i];
        const s = st.seg;
        if (s.pose) actor.kid.pose = s.pose;
        if (s.hands !== undefined) actor.kid.hands = s.hands;
        if (s.yaw === undefined && s.to) {
          const dx = s.to[0] - st.from[0];
          const dz = s.to[2] - st.from[2];
          if (Math.hypot(dx, dz) > 0.05) s.yaw = Math.atan2(dx, dz);
        }
        s.onStart?.();
      };
      next();
      return {
        get done() {
          return st.done;
        },
        update(dt) {
          if (st.done) return;
          const s = st.seg;
          st.k = Math.min(1, st.k + dt / s.dur);
          const k = st.k;
          const e = (s.ease || easeInOut)(k);
          const to = s.to || st.from;
          const x = lerp(st.from[0], to[0], e);
          const z = lerp(st.from[2], to[2], e);
          let y = s.y ? s.y(k, x) : lerp(st.from[1], to[1], e) + 4 * (s.hop || 0) * k * (1 - k);
          const kid = actor.kid;
          if (s.yaw !== undefined) actor.yaw = s.yaw;
          if (s.flip) kid.flip = clamp((k - s.flip[0]) / (s.flip[1] - s.flip[0]), 0, 1) % 1;
          s.tick?.(k, x, y, z);
          actor.pos.copy(api.world(x, z));
          actor.y = y;
          kid.root.position.copy(api.world(x, z, y));
          kid.root.rotation.set(0, actor.yaw, 0);
          if (k >= 1) {
            if (s.hop) kid.squash = 0.82;
            next();
          }
        },
      };
    }

    // ---------------------------------------------------------------- hotspot actions
    let ride = null; // float-ride state
    let scripted = null; // running runner
    let scriptedId = null; // the kid it moves (generic splash detection skips them)
    const kidOf = (who) => (who === 'player' ? api.player : api.partner);
    const restoreKid = (a) => {
      a.kid.root.rotation.order = 'XYZ';
      a.kid.flip = 0;
      a.flipT = -1;
    };

    function floatRide(api2) {
      if (api2.activityRunning) return;
      const cx = 0.6;
      const cz = POOL.z - 0.2;
      const rx = 3.4;
      const rz = 1.9;
      ride = { theta: Math.PI * 0.5, cx, cz, rx, rz, rings: [ringPink, ringBlue], emit: 0 };
      const spots = ride.rings.map((f, i) => {
        const th = ride.theta + i * 0.42;
        return { x: cx + Math.cos(th) * rx, z: cz + Math.sin(th) * rz };
      });
      ride.rings.forEach((f, i) => {
        ripple(f.x, f.z, 0.5);
        f.x = spots[i].x;
        f.z = spots[i].z;
        f.vx = f.vz = 0;
        f.rider = i === 0 ? 'player' : 'partner';
      });
      api2.sound.ui?.('pop');
      api2.activity({
        label: 'Swim off',
        seats: spots.map((p, i) => ({ who: i === 0 ? 'player' : 'partner', x: p.x, z: p.z, y: WY - 0.3, yaw: 0, pose: 'sit' })),
        focus: { x: cx, z: cz + 0.4, y: 0, zoom: 0.72 },
        update: (dt) => {
          ride.theta -= dt * 0.1;
          ride.rings.forEach((f, i) => {
            const th = ride.theta + i * 0.42;
            const nx = cx + Math.cos(th) * rx;
            const nz = cz + Math.sin(th) * rz;
            f.vx = (nx - f.x) / Math.max(dt, 1e-3);
            f.vz = (nz - f.z) / Math.max(dt, 1e-3);
            f.x = nx;
            f.z = nz;
            f.yaw = Math.sin(now * 0.22 + i * 2.1) * 0.75 + (i ? -0.3 : 0.3);
            const a = kidOf(f.rider);
            if (!a) return;
            const bob = f.y - WY;
            const lean = -0.42;
            const fwd = 0.1;
            a.yaw = f.yaw;
            a.pos.copy(api2.world(f.x, f.z));
            a.y = WY - 0.36 + bob;
            a.kid.root.rotation.order = 'YXZ';
            a.kid.root.rotation.set(lean, f.yaw, Math.sin(now * 0.9 + i) * 0.04);
            a.kid.root.position.copy(api2.world(f.x + Math.sin(f.yaw) * fwd, f.z + Math.cos(f.yaw) * fwd, a.y));
          });
          ride.emit -= dt;
          if (ride.emit <= 0) {
            ride.emit = 1.1;
            for (const f of ride.rings) ripple(f.x, f.z, 0.3);
          }
        },
        onEnd: () => {
          for (const f of ride.rings) {
            const a = kidOf(f.rider);
            f.rider = null;
            f.vx = (Math.random() - 0.5) * 0.4;
            f.vz = 0.5;
            if (!a) continue;
            restoreKid(a);
            a.pos.copy(api2.world(f.x, f.z + 0.75));
            a.y = WY;
            a.vy = 0;
            ripple(f.x, f.z + 0.75, 0.6);
          }
          ride = null;
          api2.toast('So relaxing. Back to swimming!', 2200);
        },
      });
    }

    function dive(api2) {
      if (api2.activityRunning) return;
      const a = api2.player;
      const tipX = BOARD_TIP + 0.35;
      const landX = tipX - 2.3;
      const bz = TOWER.z;
      const st = stateOf(a.id);
      const boardY = (x) => BOARD_TOP - Math.max(0, TOWER.x0 + 0.3 - x) * Math.sin(boardS.a);
      const segs = [
        { to: [tcx, TOWER.H - rise * 4, stairZ(4)], dur: 0.38, hop: 0.25 },
        { to: [tcx, TOWER.H - rise * 2, stairZ(2)], dur: 0.34, hop: 0.24 },
        { to: [tcx, TOWER.H, TOWER.z + 0.5], dur: 0.34, hop: 0.24 },
        { to: [TOWER.x0 + 0.25, BOARD_TOP, bz], dur: 0.42, hop: 0.22 },
        { to: [tipX + 1.2, BOARD_TOP, bz], dur: 0.36, hop: 0.16 },
        { to: [tipX, BOARD_TOP, bz], dur: 0.34, hop: 0.16, onEnd: () => api2.sound.ui?.('tick') },
        { dur: 0.36, y: (k) => boardY(tipX) + Math.sin(k * Math.PI) * 0.32, tick: (k) => (boardS.load = k > 0.75 || k < 0.15 ? 0.09 : 0), onEnd: () => api2.sound.ui?.('tick') },
        { dur: 0.36, y: (k) => boardY(tipX) + Math.sin(k * Math.PI) * 0.4, tick: (k) => (boardS.load = k > 0.7 || k < 0.15 ? 0.12 : 0) },
        {
          to: [landX, WY, bz],
          dur: 1.0,
          ease: (k) => k,
          y: (k) => lerp(BOARD_TOP, WY, k) + 4 * 2.1 * k * (1 - k),
          flip: [0.12, 0.78],
          hands: 'wave2',
          onStart: () => {
            boardS.load = 0;
            boardS.v -= 2.4;
            api2.sound.jump?.();
          },
          onEnd: () => {
            a.kid.flip = 0;
            a.kid.hands = null;
            st.wasIn = true;
            splash(landX, bz, 2.3);
            api2.emote('partner', 'cheer');
          },
        },
        { dur: 0.7, y: (k) => WY - Math.sin(k * Math.PI) * 0.75 },
      ];
      const lp0 = api2.localPos(a);
      scriptedId = a.id;
      api2.activity({
        label: 'Splash down',
        endOnMove: false,
        seats: [{ who: 'player', x: lp0.x, z: lp0.z, y: 0, yaw: a.yaw, pose: 'stand' }],
        focus: { x: 6.1, z: -0.9, y: 1.2, zoom: 0.85 },
        update: (dt) => scripted?.update(dt),
        onEnd: () => {
          const done = scripted?.done;
          scripted = null;
          scriptedId = null;
          restoreKid(a);
          boardS.load = 0;
          if (!done) {
            // cut short with A: land straight in the water
            a.pos.copy(api2.world(landX, bz));
            splash(landX, bz, 1.2);
            st.wasIn = true;
          }
          a.y = WY;
          a.vy = 0;
          a.kid.hands = a.kid.carried ? 'carry' : null;
          const who = NAME[api2.partnerId] || 'Your partner';
          api2.toast(`What a splash! ${who} gives it a ten.`, 2600);
        },
      });
      scripted = runner(a, segs, () => api2.endActivity());
    }

    function slideDown(api2) {
      if (api2.activityRunning) return;
      const a = api2.player;
      const st = stateOf(a.id);
      const lx = SLIDE.x - 0.95;
      const endX = SLIDE.x + SLIDE.x1;
      const landX = endX + 0.85;
      const sitOff = -0.17;
      const segs = [
        { to: [lx, 0, SLIDE.z], dur: 0.45, hop: 0.15 },
        { to: [lx + 0.05, 0.55, SLIDE.z], dur: 0.34, hop: 0.12, yaw: Math.PI / 2 },
        { to: [lx + 0.1, 1.05, SLIDE.z], dur: 0.34, hop: 0.12 },
        { to: [SLIDE.x - 0.2, SLIDE.y0, SLIDE.z], dur: 0.36, hop: 0.14, yaw: Math.PI / 2 },
        { to: [SLIDE.x + SLIDE.x0 - 0.1, SLIDE.y0, SLIDE.z], dur: 0.3, hop: 0.06, yaw: Math.PI / 2 },
        { dur: 0.3, pose: 'sit', y: () => SLIDE.y0 + sitOff + 0.05, onStart: () => api2.sound.ui?.('pop') },
        {
          to: [endX, 0, SLIDE.z],
          dur: 1.25,
          ease: (k) => k * k * (1.6 - 0.6 * k),
          yaw: Math.PI / 2,
          y: (k, x) => chuteY(x) + sitOff + 0.05,
          onStart: () => api2.sound.ui?.('swoosh'),
        },
        {
          to: [landX, FLOOR.kids, SLIDE.z],
          dur: 0.34,
          ease: (k) => k,
          y: (k) => lerp(SLIDE.y1 + sitOff, FLOOR.kids + 0.1, k) + 4 * 0.22 * k * (1 - k),
          onEnd: () => {
            st.wasIn = true;
            splash(landX, SLIDE.z, 1.1);
            api2.emote('partner', 'cheer');
          },
        },
        { dur: 0.35, pose: 'stand', y: (k) => FLOOR.kids + 0.1 * (1 - k) },
      ];
      const lp0 = api2.localPos(a);
      scriptedId = a.id;
      api2.activity({
        label: 'Splash down',
        endOnMove: false,
        seats: [{ who: 'player', x: lp0.x, z: lp0.z, y: 0, yaw: a.yaw, pose: 'stand' }],
        focus: { x: SLIDE.x + 2.2, z: SLIDE.z + 0.6, y: 0.8, zoom: 0.62 },
        update: (dt) => scripted?.update(dt),
        onEnd: () => {
          const done = scripted?.done;
          scripted = null;
          scriptedId = null;
          restoreKid(a);
          if (!done) {
            a.pos.copy(api2.world(landX, SLIDE.z));
            splash(landX, SLIDE.z, 0.8);
            st.wasIn = true;
          }
          a.y = FLOOR.kids;
          a.vy = 0;
          api2.toast('Wheee! Again, again!', 2000);
        },
      });
      scripted = runner(a, segs, () => api2.endActivity());
    }

    const glasses = [];
    function relax(api2) {
      if (api2.activityRunning) return;
      const y = 0.62;
      const seats = loungers.map((l, i) => ({ who: i === 0 ? 'player' : 'partner', x: l.x, z: l.z + 0.86, y, rot: [-1.25, 0, 0], pose: 'sleep' }));
      api2.activity({
        label: 'Get up',
        seats,
        focus: { x: (loungers[0].x + loungers[1].x) / 2, z: loungers[0].z + 0.3, y: 0.5, zoom: 0.5 },
        music: 0.6,
        exit: { x: loungers[0].x, z: loungers[0].z + 1.6 },
        onEnd: (silent) => {
          for (const gl of glasses) gl.removeFromParent();
          glasses.length = 0;
          if (!silent) api2.toast('Warm, sunny and sleepy. Lovely.', 2200);
        },
      });
      for (const a of [api2.player, api2.partner]) {
        if (!a) continue;
        const gl = M.sunglasses();
        gl.position.set(0, 0.272, 0.3);
        a.kid.head.add(gl);
        glasses.push(gl);
      }
      api2.toast('Sunglasses on. Time to soak up the sun.', 2200);
    }

    const snacks = [];
    async function snack(api2) {
      if (api2.activityRunning) return;
      const pick = await api2.choose({
        title: 'Snack kiosk',
        text: 'Something cold for a hot pool day?',
        options: [
          { id: 'ice-cream', label: 'Ice cream', sub: 'A strawberry swirl' },
          { id: 'juice', label: 'Juice', sub: 'Fresh and icy' },
        ],
      });
      if (!pick) return;
      const other = pick === 'ice-cream' ? 'juice' : 'ice-cream';
      const [mine, theirs] = await Promise.all([ctx.props.food(pick), ctx.props.food(other)]);
      for (const [a, obj] of [[api2.player, mine], [api2.partner, theirs]]) {
        if (!a || !obj) continue;
        obj.scale.setScalar(1.1);
        api2.carry(a, obj);
        snacks.push({ a, obj, t: 0 });
      }
      api2.sound.ui?.('coin');
      api2.fx.heartsAt(api2.world(-9.2, kz + 1.6, 1.4), 3);
      const who = NAME[api2.partnerId] || 'Your partner';
      api2.toast(`${who} gets the ${other === 'juice' ? 'juice' : 'ice cream'}, so you can share.`, 2600);
    }

    hotspots.push(
      { x: -0.8, z: pz1 + 0.85, r: 1.5, label: 'Float on the rings', icon: 'poolRing', act: floatRide },
      { x: tcx, z: stairZ(TOWER.steps) + 0.85, r: 1.4, label: 'Dive in', icon: 'poolDive', act: dive },
      { x: SLIDE.x + 0.05, z: SLIDE.z + 1.35, r: 1.3, label: 'Go down the slide', icon: 'poolSlide', act: slideDown },
      { x: (loungers[0].x + loungers[1].x) / 2, z: loungers[0].z + 1.55, r: 1.4, label: 'Relax on the loungers', icon: 'poolSun', act: relax },
      { x: -9.2, z: kz + 2.35, r: 1.5, label: 'Get a snack', icon: 'poolCone', act: snack },
    );

    // ---------------------------------------------------------------- per frame
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const sc = new THREE.Vector3();
    function updateKids(dt, api2) {
      const ids = ['roji', 'homama'];
      ids.forEach((id, i) => {
        const a = api2[id];
        const st = stateOf(id);
        const kd = U.uKid.value[i];
        if (!a) {
          kd.w = 0;
          return;
        }
        const lp = api2.localPos(a);
        const inside = inPool(lp.x, lp.z, 0.02);
        const riding = ride && ride.rings.some((f) => kidOf(f.rider) === a);
        const inWater = inside && a.y < WY + 0.06 && !riding;
        const swim = a.mode === 'swim' || (a.seated && inWater);
        if (!inWater) {
          const grounded = !a.seated && a.vy === 0 && a.y - (a.ground ?? 0) < 0.02;
          st.peak = grounded ? a.y : Math.max(st.peak, a.y);
        }
        if (id === scriptedId) st.peak = a.y;
        else if (inWater && !st.wasIn) {
          const drop = st.peak - WY;
          if (drop > 0.4) splash(lp.x, lp.z, clamp(drop / 1.5, 0.3, 2.4));
          else if (drop > 0.05) ripple(lp.x, lp.z, 0.55);
        }
        if (inWater) st.peak = a.y;
        st.wasIn = inWater;
        // rings and paddling while in the water
        const spd = a.seated ? 0 : a.speed || 0;
        if (inWater && !a.seated) {
          st.emit -= dt;
          const moving = spd > 0.35;
          if (st.emit <= 0) {
            const back = moving ? 0.3 : 0;
            const vx = spd > 0.01 ? a.vel.x / spd : 0;
            const vz = spd > 0.01 ? a.vel.z / spd : 0;
            ripple(lp.x - vx * back, lp.z - vz * back, moving ? 0.32 + Math.min(spd, 3) * 0.1 : 0.2);
            st.emit = moving ? (swim ? 0.24 : 0.34) : swim ? 1.0 : 1.7;
          }
          if (swim && moving && id === api2.playerId) {
            st.stroke -= dt;
            if (st.stroke <= 0) {
              st.stroke = 0.5;
              paddleSound();
            }
          }
        }
        // foam uniforms
        kd.set(lp.x - POOL.x, lp.z - POOL.z, spd, inWater ? (swim ? 1 : 0.8) : 0);
        const dir = spd > 0.05 ? [a.vel.x / spd, a.vel.z / spd] : [Math.sin(a.yaw), Math.cos(a.yaw)];
        if (i === 0) U.uKidDir.value.set(dir[0], dir[1], U.uKidDir.value.z, U.uKidDir.value.w);
        else U.uKidDir.value.set(U.uKidDir.value.x, U.uKidDir.value.y, dir[0], dir[1]);
        st.inWater = inWater;
        st.lx = lp.x;
        st.lz = lp.z;
        st.spd = spd;
        st.actor = a;
      });
    }

    function updateFloats(dt, t) {
      const minX = POOL.x - POOL.hw;
      const maxX = POOL.x + POOL.hw;
      const minZ = POOL.z - POOL.hd;
      const maxZ = POOL.z + POOL.hd;
      for (const f of floats) {
        if (!f.rider) {
          for (const st of Object.values(kidState)) {
            if (!st.inWater || !st.actor) continue;
            const dx = f.x - st.lx;
            const dz = f.z - st.lz;
            const d = Math.hypot(dx, dz) || 0.01;
            const reach = f.r + 0.55;
            if (d < reach) {
              const push = (reach - d) * 7 + (st.spd || 0) * 0.8;
              f.vx += (dx / d) * push * dt;
              f.vz += (dz / d) * push * dt;
              f.vyaw += (dx * (st.actor.vel?.z || 0) - dz * (st.actor.vel?.x || 0)) * 0.4 * dt;
              if (d < f.r + 0.3) {
                f.x = st.lx + (dx / d) * (f.r + 0.3);
                f.z = st.lz + (dz / d) * (f.r + 0.3);
              }
            }
          }
          // gentle breeze so they never sit still
          f.vx += Math.sin(t * 0.21 + f.phase) * 0.05 * dt;
          f.vz += Math.cos(t * 0.17 + f.phase * 1.7) * 0.05 * dt;
          const drag = Math.exp(-0.7 * dt);
          f.vx *= drag;
          f.vz *= drag;
          f.vyaw *= Math.exp(-1.2 * dt);
          f.x += f.vx * dt;
          f.z += f.vz * dt;
          f.yaw += (f.vyaw + 0.04) * dt;
          const r = f.r;
          if (f.x < minX + r) (f.x = minX + r), (f.vx = Math.abs(f.vx) * 0.5);
          if (f.x > maxX - r) (f.x = maxX - r), (f.vx = -Math.abs(f.vx) * 0.5);
          if (f.z < minZ + r) (f.z = minZ + r), (f.vz = Math.abs(f.vz) * 0.5);
          if (f.z > maxZ - r) (f.z = maxZ - r), (f.vz = -Math.abs(f.vz) * 0.5);
        }
        // floats keep apart
        for (const o of floats) {
          if (o === f) continue;
          const dx = f.x - o.x;
          const dz = f.z - o.z;
          const d = Math.hypot(dx, dz) || 0.01;
          const min = f.r + o.r - 0.05;
          if (d < min && !f.rider) {
            f.x += (dx / d) * (min - d) * 0.5;
            f.z += (dz / d) * (min - d) * 0.5;
            f.vx += (dx / d) * 0.3 * dt * 10;
            f.vz += (dz / d) * 0.3 * dt * 10;
          }
        }
        // ride the waves
        const lx = f.x - POOL.x;
        const lz = f.z - POOL.z;
        const h = rippleHeight(rips, lx, lz, t);
        const hx = rippleHeight(rips, lx + 0.35, lz, t) - rippleHeight(rips, lx - 0.35, lz, t);
        const hz = rippleHeight(rips, lx, lz + 0.35, t) - rippleHeight(rips, lx, lz - 0.35, t);
        f.y = WY + h + Math.sin(t * 1.7 + f.phase) * 0.015;
        const lift = f.kind === 'ball' ? 0.18 : f.kind === 'duck' ? 0.05 : 0.06;
        f.obj.position.set(f.x, f.y + lift - (f.rider ? 0.04 : 0), f.z);
        e.set(hz * 1.2 + Math.sin(t * 1.3 + f.phase) * 0.04, f.yaw, -hx * 1.2 + Math.cos(t * 1.1 + f.phase) * 0.04, 'YXZ');
        f.obj.rotation.copy(e);
        if (f.kind === 'ball') f.obj.children[0].rotation.set(f.z * 2.2, 0, -f.x * 2.2);
      }
    }

    function updateDrops(dt) {
      for (let i = 0; i < DROPS; i++) {
        const d = drops[i];
        if (d.life <= 0) continue;
        d.life -= dt * 0.9;
        d.v.y -= 13 * dt;
        d.p.addScaledVector(d.v, dt);
        if ((d.p.y < WY && d.v.y < 0) || d.life <= 0) {
          d.life = 0;
          dropMesh.setMatrixAt(i, zero);
          continue;
        }
        const s = d.s * (0.5 + d.life * 0.6);
        sc.set(s, s * (1 + Math.min(1.5, Math.abs(d.v.y) * 0.12)), s);
        q.identity();
        dropMesh.setMatrixAt(i, tmpM.compose(d.p, q, sc));
      }
      dropMesh.instanceMatrix.needsUpdate = true;
      for (const c of crowns) {
        if (c.life <= 0) continue;
        c.life -= dt * 2.2;
        if (c.life <= 0) {
          c.m.visible = false;
          continue;
        }
        const k = 1 - c.life;
        const r = 0.32 + easeOutCubic(k) * (0.35 + c.power * 0.22);
        const hgt = (0.25 + c.power * 0.3) * Math.sin(Math.min(1, k * 2.2) * Math.PI * 0.5) * (1 - k * 0.7);
        c.m.scale.set(r, Math.max(0.01, hgt), r);
        c.m.position.y = WY + hgt / 2 - 0.03;
        c.m.rotation.y = c.power * 3;
        c.m.material.opacity = Math.min(1, c.life * 1.6) * 0.95;
      }
    }

    function updateBoard(dt) {
      let load = boardS.load;
      for (const id of ['roji', 'homama']) {
        const a = api[id];
        if (!a || a.seated) continue;
        const lp = api.localPos(a);
        if (Math.abs(lp.z - TOWER.z) < 0.4 && lp.x < TOWER.x0 && lp.x > BOARD_TIP - 0.2 && Math.abs(a.y - BOARD_TOP) < 0.25) load += ((TOWER.x0 - lp.x) / (TOWER.x0 - BOARD_TIP)) * 0.07;
        const st = stateOf(id);
        if (st.onBoard && a.vy > 2) boardS.v -= 1.6;
        st.onBoard = Math.abs(lp.z - TOWER.z) < 0.4 && lp.x < TOWER.x0 && lp.x > BOARD_TIP - 0.2 && Math.abs(a.y - BOARD_TOP) < 0.06;
      }
      const acc = (load - boardS.a) * 160 - boardS.v * 7;
      boardS.v += acc * dt;
      boardS.a += boardS.v * dt;
      boardS.a = clamp(boardS.a, -0.12, 0.16);
      tower.board.rotation.z = boardS.a;
    }

    function updateSnacks(dt, api2) {
      for (let i = snacks.length - 1; i >= 0; i--) {
        const s = snacks[i];
        s.t += dt;
        const st = kidState[s.a.id];
        const gone = s.a.kid.carried !== s.obj;
        if (gone || s.t > 30 || st?.inWater) {
          if (!gone) {
            api2.carry(s.a, null);
            if (s.a === api2.player) api2.toast(st?.inWater ? 'Snack finished first. Now splash!' : 'Yum, all gone.', 1800);
            if (!st?.inWater) api2.fx.puff(api2.world(st?.lx ?? 0, st?.lz ?? 0));
          }
          snacks.splice(i, 1);
        }
      }
    }

    // ---------------------------------------------------------------- bake into the atlas
    guard.root.traverse((o) => {
      if (o.isMesh && o.material.isMeshBasicMaterial && o !== guard.blob) {
        const c = new THREE.Color(guard.look.skin).lerp(new THREE.Color('#ff8fa0'), 0.35);
        o.material = mat('#' + c.getHexString(), { rough: 0.6 });
      }
    });
    guard.blob.removeFromParent();
    const atlas = makeAtlas();
    atlas.atlasify(g, new Set(dynamic));
    for (const f of floats) {
      atlas.atlasify(f.obj);
      if (f.kind !== 'ball') bakeStatic(f.obj, [], mergeGeometries);
    }
    atlas.atlasify(tower.board);
    bakeStatic(tower.board, [], mergeGeometries);
    atlas.atlasify(tower.flag);
    const atlasMats = new Set(Object.values(atlas.mats));
    g.traverse((o) => {
      if (o.isMesh && atlasMats.has(o.material)) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    g.traverse((o) => {
      if (o.isMesh && (o.material === basinMat || o.material === bandMat || o.material === deckMat)) o.castShadow = false;
    });

    return {
      group: g,
      dynamic,
      colliders,
      hotspots,
      holes: [{ x: POOL.x, z: POOL.z, hw: POOL.hw, hd: POOL.hd }],
      water: [
        { x: (px0 + KIDS_X) / 2, z: POOL.z, hw: (KIDS_X - px0) / 2, hd: POOL.hd, y: WY, depth: WY - FLOOR.kids },
        { x: (KIDS_X + 2.5) / 2, z: POOL.z, hw: (2.5 - KIDS_X) / 2, hd: POOL.hd, y: WY, depth: WY - FLOOR.main },
        { x: (2.5 + px1) / 2, z: POOL.z, hw: (px1 - 2.5) / 2, hd: POOL.hd, y: WY, depth: WY - FLOOR.deep },
      ],
      update(dt, t, api2) {
        now = t;
        time.value = t;
        updateKids(dt, api2);
        updateFloats(dt, t);
        updateBoard(dt);
        updateDrops(dt);
        updateSnacks(dt, api2);
        sld.flowTex.offset.y -= dt * 1.6;
        tower.flag.rotation.y = Math.sin(t * 2.2) * 0.25;
        tower.flag.scale.x = 1 + Math.sin(t * 3.1) * 0.05;
      },
    };
  },
};
