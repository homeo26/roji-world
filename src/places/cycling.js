import { THREE, mat, umat, mesh, box, rbox, cyl, sph, tor, at, rot, scl, part, merge, vcMesh, colorBake, makeGarden, roundTree, bush, hedge, pathGeo, discGeo, labelTex, panel, texMat, canvasTexture, heartGeo, Butterflies, sfx, rng } from './parks/kit.js';
import { makeBike, seatOnBike } from './parks/bike.js';

// The Cycling Park: a looping pink bike path with two gentle hills and two little ramps, a bike rental
// with Roji's pink bike and Homama's blue bike, a tiered fountain in the middle and the start arch of
// the Cycle Race. Local frame: footprint 24 x 16, front +Z.

// Loop: a stadium with straights along X (front at z = ZF, back at z = ZB) and round ends.
const XE = 6.4;
const RAD = 4.0;
const ZC = -0.8;
const ZF = ZC + RAD;
const ZB = ZC - RAD;
const HALF = 1.0; // half width of the path
const LS = XE * 2;
const ARC = Math.PI * RAD;
const LOOP = LS * 2 + ARC * 2;
const PATH = '#f3ab98';
const PATH_EDGE = '#e8927f';
const CURB = '#fff2e1';
const HILLS = [{ c: -2.75, half: 2.45, h: 0.85 }, { c: 2.75, half: 2.45, h: 0.85 }];
// Ramps on the front straight: lane side (-1 inner, +1 outer), start x, length, lip height
const RAMPS = [{ x: -3.4, side: -1, len: 1.1, h: 0.26 }, { x: 0.6, side: 1, len: 1.1, h: 0.26 }];
const LANE = 0.42;
const FOUNTAIN = { x: 0.4, z: ZC - 0.1 };
const KIOSK = { x: -7.65, z: -1.55 };
const RACK = [{ x: -7.0, z: 0.15 }, { x: -7.0, z: 1.0 }];
const ARCH = { x: XE + RAD, z: ZC };
const LIGHT = { x: XE + RAD - 1.75, z: ZC + 0.55 };

const mod = (a, n) => ((a % n) + n) % n;

// Smooth normals on an indexed grid, a touch of sun shading baked into the colours, then non-indexed with uvs.
const SUN = new THREE.Vector3(-11, 22, 12).normalize();
function finishGrid(geo) {
  geo.computeVertexNormals();
  const n = geo.attributes.normal;
  const c = geo.attributes.color;
  for (let i = 0; i < n.count; i++) {
    const k = 1 + (n.getX(i) * SUN.x + n.getY(i) * SUN.y + n.getZ(i) * SUN.z - SUN.y) * 0.9;
    c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k);
  }
  const g = geo.toNonIndexed();
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  return g;
}

// Centreline point and unit direction at distance s along the loop (s = 0 at the left end of the front straight, heading +X).
function loopAt(s) {
  s = mod(s, LOOP);
  if (s < LS) return { x: -XE + s, z: ZF, dx: 1, dz: 0, seg: 0, k: 0 };
  s -= LS;
  if (s < ARC) {
    const th = Math.PI / 2 - s / RAD;
    return { x: XE + RAD * Math.cos(th), z: ZC + RAD * Math.sin(th), dx: Math.sin(th), dz: -Math.cos(th), seg: 1, k: 1 / RAD };
  }
  s -= ARC;
  if (s < LS) return { x: XE - s, z: ZB, dx: -1, dz: 0, seg: 2, k: 0 };
  s -= LS;
  const th = -Math.PI / 2 - s / RAD;
  return { x: -XE + RAD * Math.cos(th), z: ZC + RAD * Math.sin(th), dx: Math.sin(th), dz: -Math.cos(th), seg: 3, k: 1 / RAD };
}
// Outward normal (u > 0 is the outside of the loop)
const nrm = (p) => ({ nx: -p.dz, nz: p.dx });

function hillX(x) {
  let y = 0;
  for (const h of HILLS) if (Math.abs(x - h.c) < h.half) y += h.h * 0.5 * (1 + Math.cos((Math.PI * (x - h.c)) / h.half));
  return y;
}
// Height of the path surface at s (hills only on the back straight)
function heightAt(s) {
  const p = loopAt(s);
  return p.seg === 2 ? hillX(p.x) : 0;
}
function rampAt(s, u) {
  const p = loopAt(s);
  if (p.seg !== 0) return 0;
  for (const r of RAMPS) {
    if (Math.sign(u) !== r.side || Math.abs(u) > LANE + 0.5) continue;
    const k = (p.x - r.x) / r.len;
    if (k >= 0 && k <= 1) return r.h * k;
  }
  return 0;
}

export default {
  id: 'cycling',
  stop: { title: 'Cycling Park', tag: 'Ride together', icon: 'bike', color: '#ef7d8f', text: 'Rent the pink bike and the blue bike and ride the loop together, over the hills and the little ramps. Or race in the Cycle Race.' },
  icons: {
    bike: 'M2 17a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0 M15 17a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0 M5.5 17 9 10h7l2.5 7 M9 10l2 7 5-7 M5.5 17H11 M7.5 10h3 M16 10l-.8-3h2.3',
    flag: 'M5 21V4 M5 4h12l-2.5 4L17 12H5',
  },

  build(ctx) {
    const { api } = ctx;
    const g = new THREE.Group();
    const dynamic = [];
    const colliders = [];
    const add = (...o) => (g.add(...o), o[0]);
    const garden = makeGarden(21);
    const r = rng(5);
    const S = sfx(() => api.sound);
    const vcParts = [];

    // ---------------------------------------------------------- the bike path (one vertex-coloured ribbon)
    {
      const us = [-HALF - 0.14, -HALF - 0.02, -HALF, -HALF + 0.12, HALF - 0.12, HALF, HALF + 0.02, HALF + 0.14];
      const colOf = [CURB, CURB, PATH_EDGE, PATH, PATH, PATH_EDGE, CURB, CURB].map((c) => new THREE.Color(c));
      const lift = [0.03, 0.045, 0.02, 0.02, 0.02, 0.02, 0.045, 0.03];
      const n = Math.ceil(LOOP / 0.2);
      const pos = [];
      const col = [];
      const idx = [];
      for (let i = 0; i <= n; i++) {
        const s = (i / n) * LOOP;
        const p = loopAt(s);
        const { nx, nz } = nrm(p);
        const h = heightAt(s);
        us.forEach((u, j) => {
          pos.push(p.x + nx * u, h + lift[j] + (j === 0 || j === us.length - 1 ? -0.02 : 0), p.z + nz * u);
          col.push(colOf[j].r, colOf[j].g, colOf[j].b);
        });
        if (i < n) for (let j = 0; j < us.length - 1; j++) {
          const k = i * us.length + j;
          const m = us.length;
          idx.push(k, k + 1, k + m, k + 1, k + m + 1, k + m);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geo.setIndex(idx);
      vcParts.push(finishGrid(geo));
      // White dashes down the middle
      for (let s = 0.3; s < LOOP - 0.5; s += 1.2) {
        const a = loopAt(s);
        const b = loopAt(s + 0.55);
        const ha = heightAt(s) + 0.024;
        const hb = heightAt(s + 0.55) + 0.024;
        const q = [];
        for (const [p, h] of [[a, ha], [b, hb]]) {
          const { nx, nz } = nrm(p);
          q.push([p.x - nx * 0.06, h, p.z - nz * 0.06], [p.x + nx * 0.06, h, p.z + nz * 0.06]);
        }
        const dg = new THREE.BufferGeometry();
        dg.setAttribute('position', new THREE.Float32BufferAttribute([...q[0], ...q[2], ...q[1], ...q[1], ...q[2], ...q[3]], 3));
        dg.computeVertexNormals();
        if (dg.attributes.normal.getY(0) < 0) dg.setAttribute('position', new THREE.Float32BufferAttribute([...q[0], ...q[1], ...q[2], ...q[1], ...q[3], ...q[2]], 3));
        dg.computeVertexNormals();
        vcParts.push(part(dg, '#fffaf4'));
      }
      // Grass mounds under the hills, sides sloping down to the lawn
      const cols = [-2.5, -2.0, -1.6, -1.3, -1.13, 1.13, 1.3, 1.6, 2.0, 2.5];
      const prof = (au) => (au <= 1.13 ? 1 : Math.max(0, 1 - Math.pow((au - 1.13) / (2.5 - 1.13), 1.4)));
      const xs = [];
      for (let x = -5.2; x <= 5.2001; x += 0.2) xs.push(x);
      const mp = [];
      const mc = [];
      const mi = [];
      const grass = new THREE.Color('#9ad06a');
      const grass2 = new THREE.Color('#9ad06a');
      xs.forEach((x, i) => {
        const h = hillX(x);
        cols.forEach((u, j) => {
          mp.push(x, Math.max(0.0, h * prof(Math.abs(u)) + (Math.abs(u) <= 1.13 ? 0.015 : 0.004)), ZB - u);
          const c = Math.abs(u) > 2.2 ? grass2 : grass;
          mc.push(c.r, c.g, c.b);
        });
        if (i < xs.length - 1) for (let j = 0; j < cols.length - 1; j++) {
          if (j === 4) continue;
          const k = i * cols.length + j;
          const m = cols.length;
          mi.push(k, k + m, k + 1, k + 1, k + m, k + m + 1);
        }
      });
      const mg = new THREE.BufferGeometry();
      mg.setAttribute('position', new THREE.Float32BufferAttribute(mp, 3));
      mg.setAttribute('color', new THREE.Float32BufferAttribute(mc, 3));
      mg.setIndex(mi);
      const mound = add(vcMesh(finishGrid(mg), { rough: 0.95, cast: true }));
      mound.receiveShadow = true;
      // Flowers on the hill shoulders
      for (let i = 0; i < 70; i++) {
        const x = -4.6 + r() * 9.2;
        const side = r() < 0.5 ? -1 : 1;
        const u = side * (1.35 + r() * 0.9);
        const y = hillX(x) * prof(Math.abs(u));
        if (y < 0.05) continue;
        garden.flower(x, y, ZB - u, ['pom', 'daisy', 'tulip'][i % 3], ['#ffffff', '#ffd75e', '#ff8fb1', '#c7a6ff'][i % 4], 0.12 + r() * 0.1);
      }
      // Walkable hills: thin slices with a top height
      for (let x = -4.95; x < 5; x += 0.3) {
        const h = Math.max(hillX(x - 0.15), hillX(x + 0.15), hillX(x));
        if (h > 0.03) colliders.push({ type: 'box', x, z: ZB, hw: 0.15, hd: 1.25, h: h + 0.02 });
        // The grassy shoulders on both sides, in bands that are each a small step up
        for (const [u0, u1] of [[1.25, 1.5], [1.5, 1.75], [1.75, 2.0], [2.0, 2.25], [2.25, 2.5]]) {
          const hb = h * prof((u0 + u1) / 2);
          if (hb > 0.08) for (const sd of [-1, 1]) colliders.push({ type: 'box', x, z: ZB - sd * (u0 + u1) / 2, hw: 0.15, hd: (u1 - u0) / 2, h: hb });
        }
      }
    }
    // Ramps: wooden wedges with a striped lip
    for (const rp of RAMPS) {
      const zc = ZF + rp.side * LANE;
      const wedge = new THREE.Shape();
      wedge.moveTo(0, 0);
      wedge.lineTo(rp.len, 0);
      wedge.lineTo(rp.len, rp.h);
      wedge.closePath();
      const wg = new THREE.ExtrudeGeometry(wedge, { depth: 0.85, bevelEnabled: false });
      wg.translate(0, 0, -0.425);
      add(at(mesh(wg, mat('#d39a62', { rough: 0.8 })), rp.x, 0.02, zc));
      for (let k = 1; k < 4; k++) {
        const a = Math.atan2(rp.h, rp.len);
        const plank = rot(at(box(0.03, 0.012, 0.86, '#b97d48'), rp.x + (k / 4) * rp.len, 0.02 + (k / 4) * rp.h + 0.008, zc), 0, 0, a);
        add(plank);
      }
      for (let k = 0; k < 4; k++) add(at(box(0.04, 0.05, 0.2, k % 2 ? '#ffffff' : '#ef5b6f'), rp.x + rp.len - 0.02, rp.h - 0.015, zc - 0.32 + k * 0.213));
      for (let k = 0; k < 3; k++) colliders.push({ type: 'box', x: rp.x + ((k + 0.5) / 3) * rp.len, z: zc, hw: rp.len / 6, hd: 0.42, h: 0.02 + ((k + 1) / 3) * rp.h });
    }

    // ---------------------------------------------------------- entrance, hedges, sign
    vcParts.push(pathGeo([[0, 8.2], [0, 6.4], [0.1, 4.2]], 1.8, '#f2d7a8', { y: 0.01 }));
    for (const s of [-1, 1]) {
      colliders.push(hedge(g, s * 1.5, 7.55, s * 11.6, 7.55, 0.62, 0.6));
      colliders.push(hedge(g, s * 11.7, 7.4, s * 11.7, 5.0, 0.62, 0.6));
      garden.bed(s > 0 ? 1.8 : -11.2, s > 0 ? 11.2 : -1.8, 6.75, 7.1, 0.0, 64, 30 + s);
      // Bunting posts at the gate
      add(at(cyl(0.07, 0.08, 1.7, '#ffffff', 8), s * 1.35, 0.85, 7.6));
      add(at(sph(0.1, '#ef5b6f', undefined, 10), s * 1.35, 1.76, 7.6));
    }
    const sign = ctx.sign(['Welcome to the', 'Cycling Park'], { width: 2.5, height: 0.95, accent: '#ef7d8f', postHeight: 1.2 });
    sign.position.set(-2.6, 0, 6.3);
    sign.rotation.y = 0.18;
    add(sign);
    // The sign is turned a little, so a row of small circles follows its board
    for (const d of [-1.15, -0.58, 0, 0.58, 1.15]) colliders.push({ type: 'circle', x: -2.6 + d * Math.cos(0.18), z: 6.3 - d * Math.sin(0.18), r: 0.16 });
    // Bunting across the gate
    const flagGeo = new THREE.ConeGeometry(0.11, 0.26, 3).rotateX(Math.PI).rotateY(Math.PI / 6);
    const flagCols = ['#ef5b6f', '#ffd166', '#63c7ba', '#ff9eb5', '#7fb0ff'];
    const buntParts = [];
    for (let i = 0; i < 11; i++) {
      const k = (i + 0.5) / 11;
      const x = -1.35 + k * 2.7;
      const y = 1.62 - Math.sin(k * Math.PI) * 0.28;
      buntParts.push(part(flagGeo.clone(), flagCols[i % flagCols.length], x, y - 0.12, 7.6, { sz: 0.25 }));
    }
    buntParts.push(part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([...Array(9)].map((_, i) => new THREE.Vector3(-1.35 + (i / 8) * 2.7, 1.64 - Math.sin((i / 8) * Math.PI) * 0.28, 7.6))), 16, 0.01, 4), '#6b4a3a'));
    vcParts.push(...buntParts);

    // ---------------------------------------------------------- fountain in the middle of the loop
    const F = FOUNTAIN;
    const stone = '#efe3cf';
    const stone2 = '#e2d1b6';
    const lathe = (pts, c, seg = 32) => mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), mat(c, { rough: 0.8 }));
    add(at(lathe([[1.64, 0.0], [1.62, 0.4], [1.56, 0.47], [1.45, 0.47], [1.38, 0.4], [1.36, 0.06], [0, 0.06]], stone), F.x, 0, F.z));
    add(at(tor(1.505, 0.06, stone2, undefined, Math.PI * 2, 6, 40), F.x, 0.47, F.z)).rotation.x = Math.PI / 2;
    const waterTex = canvasTexture(256, 256, (c, w, h) => {
      const gr = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
      gr.addColorStop(0, '#9fe6f2');
      gr.addColorStop(1, '#6fcbe0');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
      c.lineWidth = 3;
      for (let i = 0; i < 7; i++) {
        c.strokeStyle = `rgba(255,255,255,${0.5 - i * 0.05})`;
        c.beginPath();
        c.arc(w / 2, h / 2, 26 + i * 15, 0, Math.PI * 2);
        c.stroke();
      }
      c.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 26; i++) {
        const a = i * 2.4;
        const rr = 30 + ((i * 37) % 90);
        c.beginPath();
        c.ellipse(w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr, 5, 2, a, 0, Math.PI * 2);
        c.fill();
      }
    });
    const waterMat = umat('#ffffff', { rough: 0.15, map: waterTex });
    const pool = add(rot(at(mesh(new THREE.CircleGeometry(1.37, 36), waterMat, { cast: false }), F.x, 0.34, F.z), -Math.PI / 2, 0, 0));
    dynamic.push(pool);
    add(at(cyl(0.22, 0.3, 0.75, stone, 14), F.x, 0.7, F.z));
    add(at(lathe([[0, 1.02], [0.3, 1.02], [0.74, 1.2], [0.8, 1.3], [0.74, 1.31], [0.69, 1.22], [0, 1.22]], stone, 28), F.x, 0, F.z));
    const bowl = add(rot(at(mesh(new THREE.CircleGeometry(0.7, 28), waterMat, { cast: false }), F.x, 1.27, F.z), -Math.PI / 2, 0, 0));
    add(at(cyl(0.1, 0.14, 0.4, stone, 12), F.x, 1.45, F.z));
    add(at(lathe([[0, 1.6], [0.12, 1.6], [0.36, 1.72], [0.34, 1.75], [0, 1.72]], stone, 20), F.x, 0, F.z));
    add(at(mesh(heartGeo(0.22, 0.08), mat('#ff9eb5', { rough: 0.4 })), F.x, 1.92, F.z));
    dynamic.push(bowl);
    colliders.push({ type: 'circle', x: F.x, z: F.z, r: 1.62 });
    // Drops: one instanced mesh, recycled
    const DROPS = 140;
    const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 4), umat('#e9fbff', { rough: 0.2, emissive: '#bdefff', ei: 0.25 }), DROPS);
    drops.castShadow = false;
    drops.frustumCulled = false;
    const dropList = [...Array(DROPS)].map((_, i) => ({ p: new THREE.Vector3(F.x, -1, F.z), v: new THREE.Vector3(), life: (i / DROPS) * 1.2 }));
    add(drops);
    dynamic.push(drops);
    // Benches facing the fountain
    const bench = (x, z, ry) => {
      const b = new THREE.Group();
      b.add(at(rbox(1.5, 0.07, 0.46, '#d39a62', 0.02), 0, 0.45, 0));
      b.add(at(rbox(1.5, 0.07, 0.06, '#d39a62', 0.02), 0, 0.68, -0.22), at(rbox(1.5, 0.07, 0.06, '#d39a62', 0.02), 0, 0.84, -0.22));
      for (const s of [-1, 1]) {
        b.add(at(box(0.06, 0.45, 0.4, '#5c7a8a'), s * 0.66, 0.22, 0));
        b.add(at(box(0.06, 0.5, 0.05, '#5c7a8a'), s * 0.66, 0.68, -0.24));
      }
      b.position.set(x, 0, z);
      b.rotation.y = ry;
      add(b);
    };
    bench(F.x + 2.55, F.z + 0.15, -Math.PI / 2);
    colliders.push({ type: 'box', x: F.x + 2.6, z: F.z + 0.15, hw: 0.25, hd: 0.76, h: 0.48 });
    // Flower rings around the fountain
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2;
      const rr = 1.85 + (i % 2) * 0.18;
      if (Math.abs(Math.cos(a)) > 0.92 && Math.cos(a) > 0) continue;
      garden.flower(F.x + Math.cos(a) * rr, 0, F.z + Math.sin(a) * rr, i % 3 ? 'pom' : 'tulip', ['#ff8fb1', '#ffffff', '#ffd75e', '#c7a6ff', '#ff6b6b'][i % 5], 0.16 + (i % 3) * 0.05);
    }

    // ---------------------------------------------------------- bike rental kiosk and the rack
    {
      const K = KIOSK;
      const kg = new THREE.Group();
      kg.add(at(rbox(1.9, 1.0, 1.0, '#fff2e1', 0.05), 0, 0.5, 0));
      kg.add(at(rbox(2.0, 0.1, 1.1, '#d39a62', 0.03), 0, 1.04, 0.02));
      for (const s of [-1, 1]) kg.add(at(box(0.09, 0.9, 0.09, '#ffffff'), s * 0.9, 1.5, 0.45), at(box(0.09, 0.9, 0.09, '#ffffff'), s * 0.9, 1.5, -0.45));
      kg.add(at(rbox(1.8, 0.9, 0.08, '#ffe1c7', 0.03), 0, 1.5, -0.46));
      // Striped awning with scalloped edge
      for (let i = 0; i < 8; i++) {
        const c = i % 2 ? '#ffffff' : '#63c7ba';
        kg.add(rot(at(box(0.25, 0.04, 0.95, c), -0.875 + i * 0.25, 2.0, 0.22), 0.32, 0, 0));
        kg.add(rot(at(cyl(0.125, 0.125, 0.04, c, 12), -0.875 + i * 0.25, 1.83, 0.68), Math.PI / 2, 0, 0));
      }
      kg.add(at(rbox(2.05, 0.16, 0.9, '#fff2e1', 0.04), 0, 2.13, -0.12));
      // Helmets, a pump and a toolbox on the counter
      kg.add(at(scl(sph(0.15, '#ff8fb1', { rough: 0.4 }, 14), 1, 0.75, 1.15), -0.55, 1.17, 0.15));
      kg.add(at(scl(sph(0.15, '#6fb8ff', { rough: 0.4 }, 14), 1, 0.75, 1.15), -0.15, 1.17, 0.2));
      kg.add(at(cyl(0.035, 0.035, 0.42, '#ef5b6f', 8), 0.55, 1.3, 0.15));
      kg.add(at(box(0.18, 0.03, 0.06, '#3b3542'), 0.55, 1.52, 0.15));
      kg.add(at(rbox(0.36, 0.12, 0.22, '#ffd166', 0.04), 0.2, 1.15, 0.1));
      kg.add(at(rbox(1.7, 0.5, 0.04, '#63c7ba', 0.03), 0, 0.58, 0.51));
      kg.position.set(K.x, 0, K.z);
      add(kg);
      const board = labelTex(['Free for friends', 'Bike Rental'], { w: 512, h: 160, border: '#63c7ba', accent: '#ef7d8f' });
      add(at(panel(1.6, 0.5, board), K.x, 2.47, K.z - 0.07));
      add(at(rbox(1.7, 0.58, 0.06, '#d39a62', 0.02), K.x, 2.47, K.z - 0.11));
      colliders.push({ type: 'box', x: K.x, z: K.z, hw: 1.0, hd: 0.55 });
      // Rack: a rail with a hoop for each front wheel
      const hx = RACK[0].x + 0.68;
      add(at(rbox(0.08, 0.05, 1.7, '#5c7a8a', 0.02), hx, 0.03, (RACK[0].z + RACK[1].z) / 2));
      for (const rk of RACK) add(at(tor(0.24, 0.022, '#c9d1da', { metal: 0.5, rough: 0.3 }, Math.PI, 6, 16), hx, 0.04, rk.z + 0.075));
      colliders.push({ type: 'box', x: RACK[0].x + 0.15, z: (RACK[0].z + RACK[1].z) / 2, hw: 0.85, hd: 0.85 });
      // A little drinking fountain for thirsty cyclists
      add(at(cyl(0.12, 0.16, 0.9, '#63c7ba', 10), -4.3, 0.45, -2.9));
      add(at(cyl(0.22, 0.12, 0.12, '#c9d1da', 14, { metal: 0.5, rough: 0.3 }), -4.3, 0.95, -2.9));
      add(at(cyl(0.025, 0.025, 0.12, '#c9d1da', 6, { metal: 0.5, rough: 0.3 }), -4.3, 1.05, -2.9));
      colliders.push({ type: 'circle', x: -4.3, z: -2.9, r: 0.25 });
    }
    // The two rental bikes
    const pink = makeBike('#ff8fb1', { accent: '#ffffff', item: 'flowers' });
    const blue = makeBike('#6fb8ff', { accent: '#ffd166', item: 'laptop' });
    const bikes = { roji: pink, homama: blue };
    const parkAt = (b, i) => {
      b.root.position.set(RACK[i].x, 0, RACK[i].z);
      b.root.rotation.set(0, Math.PI / 2, 0, 'YXZ');
      b.steer(0.25);
    };
    parkAt(pink, 0);
    parkAt(blue, 1);
    for (const b of [pink, blue]) {
      add(b.root);
      dynamic.push(b.root);
    }

    // ---------------------------------------------------------- start arch for the Cycle Race (on the right end, facing the street)
    {
      const xA = ARCH.x;
      const zA = ARCH.z;
      for (const s of [-1, 1]) {
        for (let i = 0; i < 5; i++) add(at(cyl(0.16, 0.16, 0.5, i % 2 ? '#ffffff' : '#ef7d8f', 12), xA + s * (HALF + 0.32), 0.25 + i * 0.5, zA));
        add(at(sph(0.2, '#ffd166', undefined, 12), xA + s * (HALF + 0.32), 2.62, zA));
        colliders.push({ type: 'circle', x: xA + s * (HALF + 0.32), z: zA, r: 0.18 });
      }
      add(at(rbox(2.9, 0.5, 0.18, '#ef7d8f', 0.05), xA, 2.3, zA));
      const ban = labelTex(['Start and finish', 'Cycle Race'], { w: 512, h: 128, border: '#ef7d8f', accent: '#63c7ba' });
      for (const s of [-1, 1]) add(rot(at(panel(2.4, 0.42, ban), xA, 2.3, zA + s * 0.095), 0, s > 0 ? 0 : Math.PI, 0));
      // Little flags on top
      for (let i = 0; i < 6; i++) vcParts.push(part(new THREE.ConeGeometry(0.1, 0.24, 3).rotateX(Math.PI), flagCols[i % flagCols.length], xA - 1.1 + i * 0.44, 2.68, zA, { sz: 0.25 }));
      // Checkered line across the path
      const chk = canvasTexture(256, 32, (c) => {
        for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) {
          c.fillStyle = (i + j) % 2 ? '#3b2b3f' : '#ffffff';
          c.fillRect(i * 16, j * 16, 16, 16);
        }
      });
      add(rot(at(panel(1.95, 0.3, chk), xA, 0.033, zA), -Math.PI / 2, 0, 0));
      // A tiny traffic light
      add(at(cyl(0.04, 0.04, 1.3, '#5c7a8a', 8), LIGHT.x, 0.65, LIGHT.z));
      add(at(rbox(0.16, 0.42, 0.12, '#3b3542', 0.04), LIGHT.x, 1.5, LIGHT.z));
      add(at(box(0.2, 0.04, 0.08, '#3b3542'), LIGHT.x, 1.73, LIGHT.z + 0.02));
      colliders.push({ type: 'circle', x: LIGHT.x, z: LIGHT.z, r: 0.12 });
    }
    const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 3);
    lamps.castShadow = false;
    [0.13, 0, -0.13].forEach((dy, i) => lamps.setMatrixAt(i, new THREE.Matrix4().makeTranslation(LIGHT.x, 1.5 + dy, LIGHT.z + 0.065)));
    lamps.computeBoundingSphere();
    add(lamps);
    dynamic.push(lamps);

    // ---------------------------------------------------------- trees, bushes, beds, little signs
    for (const [x, z, s, b] of [[-9.6, -6.9, 1.05, false], [-5.2, -7.1, 0.9, true], [-0.4, -7.2, 1.0, false], [4.6, -7.0, 0.9, true], [9.4, -6.9, 1.05, false], [-11.0, 4.9, 0.7, false]]) {
      colliders.push(...roundTree(g, x, z, s, { blossom: b }));
    }
    for (const [x, z, rr] of [[-7.6, -7.3, 0.5], [-2.8, -7.4, 0.45], [2.2, -7.4, 0.5], [7.2, -7.4, 0.45], [11.3, -6.6, 0.45], [-11.3, -6.6, 0.5], [10.9, 5.6, 0.5], [-3.6, 2.0, 0.35], [3.6, -2.9, 0.4]]) colliders.push(bush(g, x, z, rr));
    garden.bed(-3.2, 3.0, ZF - 1.75, ZF - 1.35, 0, 40, 44);
    garden.bed(-2.6, 2.4, ZB + 1.35, ZB + 1.7, 0, 30, 45);
    // Round tulip bed inside the right end, rows of colour around a wheel-shaped planter
    {
      const bx = XE + 0.2;
      const bz = ZC;
      vcParts.push(discGeo(1.35, '#9a6a4a', { y: 0.02, edge: '#efe3cf' }));
      vcParts[vcParts.length - 1].translate(bx, 0, bz);
      add(at(tor(0.42, 0.07, '#ff8fb1', undefined, Math.PI * 2, 8, 24), bx, 0.42, bz)).rotation.y = 0.4;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        add(rot(at(cyl(0.02, 0.02, 0.4, '#ffffff', 5), bx + Math.cos(a) * 0.2 * Math.cos(0.4), 0.42 + Math.sin(a) * 0.2, bz - Math.cos(a) * 0.2 * Math.sin(0.4)), 0, 0.4, a + Math.PI / 2));
      }
      add(at(cyl(0.04, 0.04, 0.42, '#5c7a8a', 6), bx, 0.21, bz));
      const rows = [[0.62, '#ef3b5d'], [0.86, '#ffffff'], [1.1, '#ffd75e']];
      for (const [rr, c] of rows) {
        const n = Math.round(rr * 22);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + rr;
          garden.flower(bx + Math.cos(a) * rr, 0.02, bz + Math.sin(a) * rr, 'tulip', c, 0.2 + (i % 2) * 0.04);
          if (i % 2) garden.leaf(bx + Math.cos(a) * rr, 0.07, bz + Math.sin(a) * rr, 0.9, a, 1.1);
        }
      }
      colliders.push({ type: 'circle', x: bx, z: bz, r: 1.3, h: 0.1 });
    }
    // Round bike-route signs
    const routeTex = canvasTexture(128, 128, (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(64, 64, 62, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#4a8ef0';
      c.beginPath();
      c.arc(64, 64, 54, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 6;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      c.arc(40, 76, 15, 0, Math.PI * 2);
      c.moveTo(103, 76);
      c.arc(88, 76, 15, 0, Math.PI * 2);
      c.moveTo(40, 76);
      c.lineTo(54, 50);
      c.lineTo(80, 50);
      c.lineTo(88, 76);
      c.moveTo(54, 50);
      c.lineTo(64, 76);
      c.lineTo(80, 50);
      c.moveTo(48, 44);
      c.lineTo(60, 44);
      c.stroke();
    });
    const routeMat = texMat(routeTex, { rough: 0.6 });
    for (const [x, z] of [[-11.35, 2.6], [11.35, -3.2], [-1.6, ZB - 1.55]]) {
      add(at(cyl(0.035, 0.035, 1.4, '#c9d1da', 6, { metal: 0.4, rough: 0.4 }), x, 0.7, z));
      add(at(mesh(new THREE.CircleGeometry(0.24, 20), routeMat, { cast: false }), x, 1.5, z + 0.04));
      add(at(cyl(0.25, 0.25, 0.03, '#ffffff', 20), x, 1.5, z)).rotation.x = Math.PI / 2;
      colliders.push({ type: 'circle', x, z, r: 0.1 });
    }

    // ---------------------------------------------------------- butterflies and garden instances
    const flutter = new Butterflies(4, ['#ffb4d0', '#b9a4ff', '#ffe08a', '#9fe3ff'], [
      { x0: -3, x1: 3, z0: ZB - 2.2, z1: ZB - 0.8, y: 1.0 },
      { x0: -2.5, x1: 3.4, z0: F.z - 2.4, z1: F.z + 2.4, y: 1.3 },
      { x0: 2, x1: 10, z0: 5.5, z1: 7, y: 0.9 },
      { x0: -10, x1: -3, z0: 5.5, z1: 7, y: 0.9 },
    ], 8);
    add(flutter.group);
    dynamic.push(flutter.group);
    for (const im of garden.build()) {
      add(im);
      dynamic.push(im);
    }
    add(vcMesh(merge(vcParts), { rough: 0.85 }));
    colorBake(g, dynamic);

    // ---------------------------------------------------------- ride the loop together
    let ride = null;
    const view = { zoom: 0.68 };
    const tmp = new THREE.Vector3();
    const nameOf = (a) => a.kid.name;
    const laneY = (s, u) => heightAt(s) + rampAt(s, u);

    function placeRider(rd, dt) {
      const p = loopAt(rd.s);
      const { nx, nz } = nrm(p);
      const x = p.x + nx * rd.u;
      const z = p.z + nz * rd.u;
      const ground = laneY(rd.s, rd.u);
      if (rd.air) {
        rd.vy -= 16 * dt;
        rd.y += rd.vy * dt;
        if (rd.y <= ground) {
          rd.y = ground;
          rd.air = false;
          rd.kid.squash = 0.85;
          api.sound?.land?.();
        }
      } else {
        if (rd.prevGround - ground > 0.12 && dt > 0) {
          rd.air = true;
          rd.vy = 1.6 + rd.v * 0.35;
          rd.y = rd.prevGround;
          S.whee();
        } else rd.y = ground;
      }
      rd.prevGround = ground;
      const ahead = heightAt(rd.s + 0.45);
      const behind = heightAt(rd.s - 0.45);
      const pitchT = rd.air ? -0.12 : -Math.atan((ahead - behind) / 0.9);
      rd.pitch = dt > 0 ? THREE.MathUtils.damp(rd.pitch, pitchT, 10, dt) : pitchT;
      const yaw = Math.atan2(p.dx, p.dz);
      rd.roll = dt > 0 ? THREE.MathUtils.damp(rd.roll, -p.k * rd.v * 0.22, 4, dt) : 0;
      rd.bike.root.position.set(x, rd.y, z);
      rd.bike.root.rotation.set(rd.pitch, yaw, rd.roll, 'YXZ');
      rd.bike.steer(p.k * 0.6);
      seatOnBike(rd.kid, rd.bike.root);
      const a = rd.actor;
      a.pos.copy(api.world(x, z));
      a.y = rd.y;
      a.yaw = yaw;
      return { x, z };
    }

    function startRide(a) {
      if (ride) return;
      const P = a.player;
      const Q = a.partner;
      const s0 = LOOP - 2.2;
      const mk = (actor, u) => ({ actor, kid: actor.kid, bike: bikes[actor.id] || pink, s: s0, u, v: 0, y: 0, vy: 0, air: false, prevGround: 0, pitch: 0, roll: 0 });
      const riders = [mk(P, -LANE), mk(Q, LANE)];
      const p0 = loopAt(s0);
      const yaw0 = Math.atan2(p0.dx, p0.dz);
      ride = { riders, t: 0, lap: 0, bellT: 2.5, heartT: 7, speed: 0 };
      for (const rd of riders) fx0(rd.bike.root.getWorldPosition(tmp));
      a.activity({
        label: 'Stop riding',
        seats: riders.map((rd, i) => {
          const { nx, nz } = nrm(p0);
          return { who: i ? 'partner' : 'player', x: p0.x + nx * rd.u, z: p0.z + nz * rd.u, y: 0, yaw: yaw0, pose: 'bike' };
        }),
        focus: { x: p0.x, z: p0.z, y: 0.8, zoom: view.zoom },
        exit: { x: -5.6, z: 1.7 },
        update: (dt) => stepRide(a, dt),
        onEnd: () => endRide(a),
      });
      for (const rd of riders) placeRider(rd, 0);
      a.toast(`${nameOf(P)} and ${nameOf(Q)} hop on their bikes. <b>Ring ring!</b>`, 2600);
      S.bell(0.2);
      pink.ring();
      blue.ring();
    }
    const fx0 = (p) => api.fx?.poof?.(p);

    function stepRide(a, dt) {
      if (!ride) return;
      ride.t += dt;
      const lead = ride.riders[0];
      const slope = (heightAt(lead.s + 0.5) - heightAt(lead.s - 0.5)) / 1.0;
      const target = Math.min(3.4, ride.t * 1.6) * (1 - slope * 0.9);
      ride.speed = THREE.MathUtils.damp(ride.speed, target, 2, dt);
      const ds = ride.speed * dt;
      const mid = new THREE.Vector3();
      const prevLap = Math.floor((lead.s + 2.2) / LOOP);
      for (const rd of ride.riders) {
        const p = loopAt(rd.s);
        const scale = 1 + p.k * rd.u;
        rd.v = ride.speed * scale;
        rd.s += ds;
        rd.kid.pedal = (rd.kid.pedal || 0) + dt * rd.v * 3.0;
        rd.bike.roll(ds * scale);
        const q = placeRider(rd, dt);
        mid.x += q.x / 2;
        mid.z += q.z / 2;
      }
      a.focus({ x: mid.x, z: mid.z, y: 0.8, zoom: view.zoom });
      const lap = Math.floor((lead.s + 2.2) / LOOP);
      if (lap > prevLap) {
        ride.lap = lap;
        const P = nameOf(a.player);
        const Q = nameOf(a.partner);
        const lines = [
          `One lap! ${Q} rings the bell just for ${P}.`,
          `Two laps! ${P} and ${Q} race down the hills together.`,
          `Three laps! ${Q} says ${P} is the best cycling buddy on the island.`,
          `Another lap. The ducks at the fountain wave a wing.`,
        ];
        a.toast(lines[Math.min(lap - 1, lines.length - 1)], 2800);
        S.chime();
        a.fx.heartsAt(tmp.copy(a.partner.kid.root.position).setY(a.partner.kid.root.position.y + 1.7), 3);
      }
      ride.bellT -= dt;
      if (ride.bellT <= 0) {
        ride.bellT = 5 + Math.random() * 4;
        const rd = ride.riders[Math.random() < 0.5 ? 0 : 1];
        rd.bike.ring();
        S.bell();
      }
      ride.heartT -= dt;
      if (ride.heartT <= 0) {
        ride.heartT = 9 + Math.random() * 5;
        const rd = ride.riders[1];
        a.fx.heartsAt(tmp.copy(rd.kid.root.position).setY(rd.kid.root.position.y + 1.7), 2);
      }
    }

    function endRide(a) {
      if (!ride) return;
      const rs = ride.riders;
      ride = null;
      for (const rd of rs) rd.kid.squash = 1;
      parkAt(pink, 0);
      parkAt(blue, 1);
      api.fx?.poof?.(api.world(RACK[0].x, RACK[0].z + 0.4));
      a.toast('The bikes are back at the rental. <b>Thank you for riding!</b>', 2200);
    }

    // ---------------------------------------------------------- per frame
    const m4 = new THREE.Matrix4();
    const q0 = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    const lampCol = new THREE.Color();
    const LAMP = ['#ff5a5a', '#ffd166', '#58e07a'];
    function update(dt, t) {
      // Fountain drops: from the top bowl, the middle bowl rim and the basin jets
      for (const d of dropList) {
        d.life -= dt;
        if (d.life <= 0 || d.p.y < 0.36) {
          const kind = Math.random();
          const a = Math.random() * Math.PI * 2;
          if (kind < 0.35) {
            d.p.set(F.x + Math.cos(a) * 0.05, 2.02, F.z + Math.sin(a) * 0.05);
            d.v.set(Math.cos(a) * 0.5, 1.6 + Math.random() * 0.5, Math.sin(a) * 0.5);
          } else if (kind < 0.75) {
            d.p.set(F.x + Math.cos(a) * 0.74, 1.27, F.z + Math.sin(a) * 0.74);
            d.v.set(Math.cos(a) * 0.35, 0.05, Math.sin(a) * 0.35);
          } else {
            d.p.set(F.x + Math.cos(a) * 0.36, 1.74, F.z + Math.sin(a) * 0.36);
            d.v.set(Math.cos(a) * 0.4, 0.15, Math.sin(a) * 0.4);
          }
          d.life = 2;
        }
        d.v.y -= 6 * dt;
        d.p.addScaledVector(d.v, dt);
        // Drops from the top land in the middle bowl
        if (d.p.y < 1.3 && d.p.y > 1.2 && Math.hypot(d.p.x - F.x, d.p.z - F.z) < 0.68 && d.v.y < 0) d.life = 0;
      }
      dropList.forEach((d, i) => drops.setMatrixAt(i, m4.compose(d.p, q0, sc.setScalar(d.life > 0 && d.p.y > 0.36 ? 1 : 0))));
      drops.instanceMatrix.needsUpdate = true;
      pool.rotation.z = t * 0.15;
      bowl.rotation.z = -t * 0.25;
      // Traffic light: green, yellow, red
      const phase = Math.floor(t / 1.6) % 3;
      for (let i = 0; i < 3; i++) lamps.setColorAt(i, lampCol.set(i === 2 - phase ? LAMP[i] : '#3a3540'));
      lamps.instanceColor.needsUpdate = true;
      flutter.update(dt, t);
      for (const b of [pink, blue]) b.update(dt);
      if (ride) for (const rd of ride.riders) rd.bike.pedal(rd.kid.pedal || 0);
    }

    const hotspots = [
      { x: -5.55, z: 0.55, r: 1.45, label: 'Ride bikes together', icon: 'bike', when: () => !ride, act: startRide },
      { x: ARCH.x, z: ARCH.z, r: 1.35, label: 'Cycle race', icon: 'flag', when: () => !ride, act: (a) => a.playArena('cyclerace') },
    ];

    // Handles for headless checks (dev.html)
    g.userData.cycling = { loopAt, heightAt, bikes, view, get ride() { return ride; } };

    return { group: g, dynamic, colliders, hotspots, pad: { x: 0, z: ctx.size.d / 2 + 1.2 }, update };
  },
};
