// Ski Race: race your partner down a snowy mountain through slalom gates, over bumps and ramps.
// Stick or arrows steer, hold up or the Tuck button to go faster, Space jumps and a second Space
// flips. Clean landings give a boost; pines and snowmen knock you over; missed gates add 2 seconds.
import { vcMat, part, merge, instances, pineGeo, rockGeo, snowmanGeo, SNOWMAN_STYLES, beanie, scarf, skis, pole, snowfall } from '../places/ski/kit.js';

const L = 860; // finish line, metres down the course
const HALF = 9; // half width of the groomed track
const G = 16; // gravity in the air
const GS = 5.6; // pull along the slope
const FLIP = 0.62; // seconds for one flip
const MOGULS = [
  [235, 300],
  [590, 645],
];
const RAMPS = [
  { s: 150, u: 0 },
  { s: 335, u: -1.5 },
  { s: 520, u: 1.5 },
  { s: 715, u: 0 },
].map((r) => ({ ...r, w: 8, len: 4.6, h: 1.55 }));

const sstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Course shape: centreline x for a distance s down the hill, and the base height.
const S0 = -90;
const S1 = L + 170;
const Y0 = (() => {
  const out = new Float32Array(S1 - S0 + 1);
  let y = 0;
  for (let s = S0; s <= S1; s++) {
    let k;
    if (s < 0) k = 0.06;
    else if (s < L) k = 0.06 + sstep(0, 22, s) * (0.11 + 0.05 * Math.sin(s * 0.011) + 0.03 * Math.sin(s * 0.031));
    else k = 0.17 * (1 - sstep(L, L + 45, s)) - 0.03 * sstep(L + 60, L + 120, s);
    out[s - S0] = y;
    y -= k;
  }
  const at0 = out[-S0];
  for (let i = 0; i < out.length; i++) out[i] -= at0;
  return out;
})();
function y0(s) {
  const f = clamp(s, S0, S1 - 1) - S0;
  const i = Math.floor(f);
  return Y0[i] + (Y0[i + 1] - Y0[i]) * (f - i);
}
function cx(s) {
  const env = sstep(10, 60, s) * (1 - sstep(L - 60, L - 5, s));
  return (9 * Math.sin(s * 0.012) + 5.5 * Math.sin(s * 0.026 + 1)) * env;
}
function terrainY(x, z) {
  const s = -z;
  const u = x - cx(s);
  const au = Math.abs(u);
  let y = y0(s) + sstep(HALF - 1, HALF + 5, au) * 3.2 + Math.max(0, au - HALF - 5) * 0.55;
  for (const [a, b] of MOGULS) {
    if (s > a - 6 && s < b + 6) {
      const env = sstep(a - 6, a + 4, s) * (1 - sstep(b - 4, b + 6, s)) * (1 - sstep(HALF - 2, HALF, au));
      y += 0.26 * Math.sin(s * 0.72) * Math.sin(u * 0.78 + s * 0.15) * env;
    }
  }
  y += 0.12 * Math.sin(s * 0.23 + u * 0.4) + 0.08 * Math.sin(u * 0.9 - s * 0.13);
  return y;
}
function rampH(x, z) {
  const s = -z;
  for (const r of RAMPS) {
    const ds = s - r.s;
    if (ds < 0 || ds > r.len) continue;
    const du = Math.abs(x - cx(s) - r.u);
    if (du > r.w / 2) continue;
    return r.h * (ds / r.len) * sstep(r.w / 2, r.w / 2 - 0.6, du);
  }
  return 0;
}
const groundY = (x, z) => terrainY(x, z) + rampH(x, z);

export default {
  id: 'skirace',
  title: 'Ski Race',
  tagline: 'Race down the mountain through the flags',

  async start(ctx) {
    const { THREE, util, scene, camera, hud, input, sound, fx } = ctx;
    const { mat, mesh, canvasTexture, roundRect, FONT, rng, damp } = util;
    const env = ctx.env.outdoor({ sky: '#bfe1f2', fog: [60, 230], sun: [-16, 30, 22], shadow: 22, intensity: 1.0 });
    env.hemi.groundColor.set('#dce8f5');
    env.hemi.color.set('#f2f8ff');
    env.sun.color.set('#fff8ee');
    const vc = vcMat({ roughness: 0.9 });
    const vcFlat = vcMat({ roughness: 0.85, flatShading: true });
    const r = rng(42);
    // Each run sets a new line of gates (Play again moves to the next course); each course keeps its own best time
    const COURSES = [
      { name: 'Sunny run', seed: 0, side: 1, best: 'best' },
      { name: 'Pine run', seed: 7, side: -1 },
      { name: 'Comet run', seed: 19, side: 1, tight: true },
    ];
    const courseN = (ctx.load('course', 0) || 0) % COURSES.length;
    ctx.save('course', courseN + 1);
    const course = COURSES[courseN];
    const bestKey = course.best || 'best-' + courseN;
    const rg = course.seed ? rng(course.seed) : r;
    const me = ctx.me;
    const them = ctx.partner;
    const look = ctx.looks;

    // ---------------------------------------------------------- terrain
    const US = [0, 0.8, 1.6, 2.4, 3.2, 4, 5, 6, 7, 8, 8.6, 9, 9.4, 10, 11.5, 13, 15, 17.5, 20.5, 24, 28, 33, 39, 46, 55, 66];
    const cols = [...US.slice(1).reverse().map((u) => -u), ...US];
    const rows = [];
    for (let s = S0 + 10; s <= S1 - 10; s += 1.5) rows.push(s);
    const nC = cols.length;
    const pos = new Float32Array(rows.length * nC * 3);
    const uv = new Float32Array(rows.length * nC * 2);
    const col = new Float32Array(rows.length * nC * 3);
    const white = new THREE.Color('#ffffff');
    const off = new THREE.Color('#e3edf7');
    const blue = new THREE.Color('#5d9be0');
    const c = new THREE.Color();
    rows.forEach((s, i) => {
      const x0 = cx(s);
      cols.forEach((u, j) => {
        const k = i * nC + j;
        const x = x0 + u;
        pos.set([x, terrainY(x, -s), -s], k * 3);
        uv.set([u / 0.7, s / 5], k * 2);
        const au = Math.abs(u);
        c.copy(white).lerp(off, sstep(HALF, HALF + 4, au));
        if (Math.abs(au - HALF) < 0.05 && Math.floor(s / 3) % 2 === 0 && s > 0 && s < L) c.lerp(blue, 0.75);
        col.set([c.r, c.g, c.b], k * 3);
      });
    });
    const idx = [];
    for (let i = 0; i < rows.length - 1; i++)
      for (let j = 0; j < nC - 1; j++) {
        const a = i * nC + j;
        idx.push(a, a + 1, a + nC, a + 1, a + nC + 1, a + nC);
      }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    tg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    tg.setIndex(idx);
    tg.computeVertexNormals();
    // Darken the banks a touch by their slope
    const nrm = tg.attributes.normal;
    const shade = new THREE.Color('#b7cde4');
    for (let k = 0; k < nrm.count; k++) {
      c.setRGB(col[k * 3], col[k * 3 + 1], col[k * 3 + 2]).lerp(shade, clamp((1 - nrm.getY(k)) * 2.2, 0, 0.7));
      col.set([c.r, c.g, c.b], k * 3);
    }
    tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const cord = canvasTexture(64, 64, (g, w, h) => {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#f2f6fb';
      for (let i = 0; i < 4; i++) g.fillRect(i * 16, 0, 3, h);
    });
    cord.wrapS = cord.wrapT = THREE.RepeatWrapping;
    const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, map: cord, roughness: 0.92 }));
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Ramps: snow wedges with an orange lip and little flags
    const rampParts = [];
    for (const rp of RAMPS) {
      const N = 6;
      const M = 6;
      const P = (ds, du, top) => {
        const s = rp.s + ds;
        const x = cx(s) + rp.u + du;
        const t = terrainY(x, -s);
        return new THREE.Vector3(x, top ? t + rampH(x, -s) + 0.02 : t - 0.05, -s);
      };
      const tri = [];
      const quad = (a, b, cc, d) => tri.push(a, b, cc, a, cc, d);
      for (let i = 0; i < N; i++)
        for (let j = 0; j < M; j++) {
          const s0 = (i / N) * rp.len;
          const s1 = ((i + 1) / N) * rp.len;
          const u0 = -rp.w / 2 + (j / M) * rp.w;
          const u1 = -rp.w / 2 + ((j + 1) / M) * rp.w;
          quad(P(s0, u0, true), P(s0, u1, true), P(s1, u1, true), P(s1, u0, true));
        }
      for (let j = 0; j < M; j++) {
        const u0 = -rp.w / 2 + (j / M) * rp.w;
        const u1 = -rp.w / 2 + ((j + 1) / M) * rp.w;
        quad(P(rp.len, u0, true), P(rp.len, u1, true), P(rp.len, u1, false), P(rp.len, u0, false));
      }
      const g = new THREE.BufferGeometry().setFromPoints(tri);
      g.computeVertexNormals();
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(tri.length * 2), 2));
      rampParts.push(part(g, '#f4f8fd'));
      // Orange lip stripe and corner flags
      const lip = P(rp.len, 0, true);
      rampParts.push(part(new THREE.BoxGeometry(rp.w - 0.6, 0.08, 0.16), '#f7a440', lip.x, lip.y + 0.02, lip.z + 0.05));
      for (const su of [-1, 1]) {
        const f = P(rp.len, su * (rp.w / 2 + 0.4), false);
        rampParts.push(part(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 5), '#ffffff', f.x, f.y + 0.7, f.z));
        rampParts.push(part(new THREE.ConeGeometry(0.22, 0.5, 3), '#f7a440', f.x + 0.25 * su, f.y + 1.25, f.z, { rz: (-Math.PI / 2) * su, sz: 0.2 }));
      }
    }
    const ramps = new THREE.Mesh(merge(rampParts), vc);
    ramps.castShadow = ramps.receiveShadow = true;
    scene.add(ramps);

    // ---------------------------------------------------------- gates and obstacles
    const gates = [];
    let side = course.side;
    for (let s = 46; s < L - 24; s += (course.tight ? 27 : 31) + rg() * 4) {
      if (RAMPS.some((rp) => s > rp.s - 16 && s < rp.s + rp.len + 10)) continue;
      gates.push({ s, u: side * (2.6 + rg() * 1.0), color: side > 0 ? '#ef5b6f' : '#4a8ef0', shake: 0 });
      side = -side;
    }
    const GATE_HALF = 2.5;
    const poleItems = [];
    const flagItems = [];
    const lineItems = [];
    for (const gt of gates) {
      for (const su of [-1, 1]) {
        const x = cx(gt.s) + gt.u + su * GATE_HALF;
        const y = groundY(x, -gt.s);
        poleItems.push({ x, y: y + 0.95, z: -gt.s, color: '#ffffff' });
        flagItems.push({ x: x - su * 0.42, y: y + 1.45, z: -gt.s, color: gt.color });
      }
      const xm = cx(gt.s) + gt.u;
      lineItems.push({ x: xm, y: groundY(xm, -gt.s) + 0.04, z: -gt.s, color: gt.color });
    }
    const poles = instances(new THREE.CylinderGeometry(0.045, 0.05, 1.9, 6), mat('#ffffff', { rough: 0.5 }), poleItems);
    const flagGeo = new THREE.BoxGeometry(0.8, 0.55, 0.04);
    const flags = instances(flagGeo, mat('#ffffff', { rough: 0.7 }), flagItems);
    const lines = instances(new THREE.BoxGeometry(GATE_HALF * 2 - 0.3, 0.03, 0.22), mat('#ffffff', { rough: 0.9, emissive: '#ffffff', ei: 0.15 }), lineItems, { cast: false });
    lines.material.transparent = true;
    lines.material.opacity = 0.55;
    scene.add(poles, flags, lines);

    const obstacles = [];
    for (let i = 0; i < gates.length - 1; i++) {
      if (i % 2 === 1) continue;
      const a = gates[i];
      const b = gates[i + 1];
      const s = (a.s + b.s) / 2 + (r() - 0.5) * 4;
      if (RAMPS.some((rp) => s > rp.s - 10 && s < rp.s + rp.len + 6)) continue;
      const um = (a.u + b.u) / 2 + (r() < 0.5 ? -1 : 1) * (2.8 + r() * 0.6);
      obstacles.push({ s, u: clamp(um, -HALF + 1, HALF - 1), kind: obstacles.length % 2 ? 'snowman' : 'pine' });
    }
    for (const s of [118, 205, 392, 528, 700]) obstacles.push({ s, u: (r() < 0.5 ? -1 : 1) * (HALF - 1.2), kind: 'pine' });
    for (const o of obstacles) {
      o.x = cx(o.s) + o.u;
      o.z = -o.s;
      o.y = terrainY(o.x, o.z);
      o.r = o.kind === 'pine' ? 0.68 : 0.6;
    }
    const pineG = pineGeo();
    const edgePines = [];
    for (let s = S0 + 20; s < S1 - 20; s += 4.5) {
      for (const su of [-1, 1]) {
        if (r() < 0.25) continue;
        const u = su * (12 + r() * 22);
        const x = cx(s) + u;
        edgePines.push({ x, y: terrainY(x, -s) - 0.1, z: -s, s: 1.1 + r() * 0.9, ry: r() * 6, color: r() < 0.5 ? '#ffffff' : '#e6f3ea' });
      }
    }
    const trackPines = obstacles.filter((o) => o.kind === 'pine').map((o) => ({ x: o.x, y: o.y - 0.05, z: o.z, s: 0.85, ry: r() * 6 }));
    scene.add(instances(pineG, vcFlat, [...edgePines, ...trackPines]));
    const rocks = [];
    for (let s = S0 + 30; s < S1 - 30; s += 22) {
      const u = (r() < 0.5 ? -1 : 1) * (10.5 + r() * 6);
      const x = cx(s) + u;
      rocks.push({ x, y: terrainY(x, -s) - 0.05, z: -s, s: 0.7 + r() * 0.8, ry: r() * 6 });
    }
    scene.add(instances(rockGeo(), vcFlat, rocks));
    const snowmen = obstacles.filter((o) => o.kind === 'snowman');
    const smItems = snowmen.map((o, i) => ({ x: o.x, y: o.y - 0.05, z: o.z, s: 0.8, ry: i % 2 ? 0.3 : -0.3 }));
    const fanItems = [];

    // ---------------------------------------------------------- start and finish
    const banner = (text, fg = '#ef5b6f') =>
      canvasTexture(768, 192, (g, w, h) => {
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, w, h);
        const sq = 24;
        for (let i = 0; i < w / sq; i++)
          for (const row of [0, 1]) {
            g.fillStyle = (i + row) % 2 ? '#3b2b3f' : '#ffffff';
            g.fillRect(i * sq, row * sq, sq, sq);
            g.fillRect(i * sq, h - (2 - row) * sq, sq, sq);
          }
        g.fillStyle = fg;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = `700 ${h * 0.42}px ${FONT}`;
        g.fillText(text, w / 2, h / 2 + 4);
      });
    const arch = (s, text, color) => {
      const grp = new THREE.Group();
      const x0 = cx(s);
      const y = terrainY(x0, -s);
      const w = HALF * 2 + 1;
      for (const su of [-1, 1]) {
        for (let i = 0; i < 7; i++) {
          const seg = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.6, 16), mat(i % 2 ? '#ffffff' : color));
          seg.position.set(su * (w / 2), 0.3 + i * 0.6, 0);
          seg.scale.y = 1.25;
          seg.position.y = 0.375 + i * 0.75;
          grp.add(seg);
        }
        const ball = mesh(new THREE.SphereGeometry(0.52, 16, 12), mat(color));
        ball.position.set(su * (w / 2), 5.5, 0);
        grp.add(ball);
      }
      const bar = mesh(new THREE.BoxGeometry(w, 1.4, 0.3), mat(color));
      bar.position.y = 5.0;
      const face = mesh(new THREE.PlaneGeometry(w * 0.55, 1.25), new THREE.MeshStandardMaterial({ map: banner(text, color), roughness: 0.7 }), { cast: false });
      face.position.set(0, 5.0, 0.16);
      const face2 = face.clone();
      face2.rotation.y = Math.PI;
      face2.position.z = -0.16;
      grp.add(bar, face, face2);
      grp.position.set(x0, y, -s);
      scene.add(grp);
      const line = mesh(
        new THREE.PlaneGeometry(HALF * 2, 1.0),
        new THREE.MeshStandardMaterial({
          map: canvasTexture(512, 32, (g, ww, hh) => {
            for (let i = 0; i < 32; i++)
              for (let j = 0; j < 2; j++) {
                g.fillStyle = (i + j) % 2 ? '#3b2b3f' : '#ffffff';
                g.fillRect((i * ww) / 32, (j * hh) / 2, ww / 32, hh / 2);
              }
          }),
          roughness: 0.9,
        }),
        { cast: false },
      );
      line.rotation.x = -Math.PI / 2 - Math.atan(0.17);
      line.position.set(x0, y + 0.06, -s);
      scene.add(line);
      return grp;
    };
    arch(2, 'Start', '#4aa3df');
    arch(L, 'Finish', '#ef5b6f');
    // Start hut, finish fences, cheering snowmen and the podium
    const deco = [];
    const hutX = cx(-6) - HALF - 3.5;
    const hutY = terrainY(hutX, 6);
    deco.push(
      part(new THREE.BoxGeometry(3, 2.4, 2.6), '#c98a5a', hutX, hutY + 1.2, 6),
      part(new THREE.BoxGeometry(3.5, 0.3, 3.1), '#ef5b6f', hutX, hutY + 2.55, 6),
      part(new THREE.BoxGeometry(3.6, 0.25, 3.2), '#f6f9fc', hutX, hutY + 2.8, 6),
      part(new THREE.BoxGeometry(1.4, 0.9, 0.05), '#ffe3ad', hutX + 0.2, hutY + 1.5, 4.68),
      part(new THREE.BoxGeometry(0.8, 1.7, 0.06), '#8f4a2e', hutX - 0.9, hutY + 0.85, 4.68),
    );
    for (let s = L - 30; s < L + 90; s += 2.5) {
      for (const su of [-1, 1]) {
        const x = cx(s) + su * (HALF + 0.8);
        const y = terrainY(x, -s);
        deco.push(part(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 5), '#ffffff', x, y + 0.55, -s));
        deco.push(part(new THREE.BoxGeometry(0.06, 0.7, 2.5), '#f7a440', x, y + 0.55, -s - 1.25));
      }
    }
    const podX = cx(L + 40) + HALF + 4.5;
    const podY = terrainY(podX, -(L + 40));
    [[0, 1.0, '#ffe08a'], [-1.3, 0.7, '#d7e2ee'], [1.3, 0.5, '#f6be95']].forEach(([dx, h, cc]) => deco.push(part(new THREE.BoxGeometry(1.25, h, 1.1), cc, podX + dx, podY + h / 2, -(L + 40))));
    const decoMesh = new THREE.Mesh(merge(deco), vc);
    decoMesh.castShadow = decoMesh.receiveShadow = true;
    scene.add(decoMesh);
    for (let i = 0; i < 5; i++) {
      const s = L + 6 + i * 3.2;
      const su = i % 2 ? 1 : -1;
      const x = cx(s) + su * (HALF + 2.6 + (i % 3) * 0.6);
      fanItems.push({ x, y: terrainY(x, -s) - 0.05, z: -s, s: 0.85, ry: su > 0 ? -0.8 : 0.8 });
    }
    scene.add(instances(snowmanGeo(SNOWMAN_STYLES[0]), vc, smItems), instances(snowmanGeo(SNOWMAN_STYLES[1]), vc, fanItems));

    // Distant mountains and clouds that stay on the horizon
    const far = new THREE.Group();
    const peakParts = [];
    const cloudParts = [];
    const peaks = [[-300, 130, 120], [-180, 105, 100], [-60, 150, 130], [60, 115, 110], [180, 140, 125], [300, 100, 105], [-420, 90, 90], [420, 110, 100]];
    for (const [x, h, rr] of peaks) {
      peakParts.push(part(new THREE.ConeGeometry(rr, h, 7), '#9fbede', x, h / 2, 0, { ry: x }));
      peakParts.push(part(new THREE.ConeGeometry(rr * 0.44, h * 0.44, 7), '#ffffff', x, h - h * 0.22 + 0.5, 0, { ry: x }));
    }
    for (const [x, y, z] of [[-150, 150, 60], [30, 175, 30], [200, 145, 70], [-330, 165, 20], [360, 160, 40]]) {
      for (let i = 0; i < 5; i++) cloudParts.push(part(new THREE.IcosahedronGeometry(12 + (i % 3) * 5, 2), '#ffffff', x + i * 16, y + (i % 2) * 6, z + (i % 3) * 4, { sy: 0.62 }));
    }
    const peakMesh = new THREE.Mesh(merge(peakParts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, fog: false, flatShading: true, emissive: '#dfeaf6', emissiveIntensity: 0.35 }));
    const cloudMesh = new THREE.Mesh(merge(cloudParts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, fog: false, emissive: '#ffffff', emissiveIntensity: 0.7 }));
    far.add(peakMesh, cloudMesh);
    scene.add(far);
    const flakes = snowfall(420, { w: 40, h: 16, d: 40, size: 0.2 });
    scene.add(flakes.points);

    // ---------------------------------------------------------- snow spray
    const SPRAY = 260;
    const sprayGeo = new THREE.IcosahedronGeometry(0.07, 0);
    const spray = new THREE.InstancedMesh(sprayGeo, new THREE.MeshStandardMaterial({ color: '#f4f9ff', roughness: 0.8 }), SPRAY);
    spray.frustumCulled = false;
    const sp = [];
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < SPRAY; i++) {
      spray.setMatrixAt(i, zero);
      sp.push({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 1 });
    }
    scene.add(spray);
    let spNext = 0;
    const m4 = new THREE.Matrix4();
    const q4 = new THREE.Quaternion();
    const s3 = new THREE.Vector3();
    const emit = (x, y, z, vx, vy, vz, n = 1, spread = 1.2) => {
      for (let i = 0; i < n; i++) {
        const p = sp[spNext];
        spNext = (spNext + 1) % SPRAY;
        p.life = 0.5 + Math.random() * 0.5;
        p.p.set(x + (Math.random() - 0.5) * 0.3, y + 0.05, z + (Math.random() - 0.5) * 0.3);
        p.v.set(vx + (Math.random() - 0.5) * spread, vy + Math.random() * spread, vz + (Math.random() - 0.5) * spread);
        p.s = 0.6 + Math.random() * 1.1;
      }
    };

    // ---------------------------------------------------------- racers
    const makeRacer = (id, lane, ai) => {
      const kid = ctx.makeKid(id);
      kid.pose = 'ski';
      const lk = look[id];
      const isRoji = lk.gender === 'girl';
      kid.root.add(skis(isRoji ? '#ef5b6f' : '#3f7bf0'));
      kid.arms[0].add(pole(isRoji ? '#ff9eb5' : '#ffd166'));
      kid.arms[1].add(pole(isRoji ? '#ff9eb5' : '#ffd166'));
      kid.head.add(beanie(lk.accent || '#ff7fa3', '#ffffff'));
      kid.body.add(scarf(isRoji ? '#ffffff' : '#ef5b6f'));
      const rig = new THREE.Group();
      const flipper = new THREE.Group();
      flipper.position.y = 0.62;
      kid.root.position.y = -0.62;
      flipper.add(kid.root);
      rig.add(flipper);
      scene.add(rig);
      const x = cx(-3) + lane;
      return {
        id, kid, rig, flipper, ai, lane,
        x, z: 3, y: groundY(x, 3), vy: 0, alpha: 0, v: 0, lat: 0,
        air: false, airT: 0, flipT: -1, flipDone: false, flips: 0, crashT: 0, safeT: 0,
        gate: 0, missed: 0, passed: 0, finish: null, turn: 0, pitch: 0, tuck: false, jumpWant: false, stopSide: lane > 0 ? 1 : -1,
        skill: ai ? 0.6 + r() * 0.2 : 1,
      };
    };
    const P = makeRacer(me, -2.2, false);
    const C = makeRacer(them, 2.2, true);
    const racers = [P, C];

    // ---------------------------------------------------------- sound: ski hiss
    let hiss = null;
    if (sound.ctx && sound.noise && !sound.muted) {
      const ac = sound.ctx;
      const src = ac.createBufferSource();
      src.buffer = sound.noise;
      src.loop = true;
      const filt = ac.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = 900;
      filt.Q.value = 0.7;
      const gain = ac.createGain();
      gain.gain.value = 0;
      src.connect(filt).connect(gain).connect(sound.sfx);
      src.start();
      hiss = { src, filt, gain };
    }

    // ---------------------------------------------------------- race state
    let disposed = false;
    let running = false;
    let raceT = 0;
    let doneT = -1;
    let finished = false;
    let auto = false;
    let hudT = 0;
    const best = ctx.load('best', null);
    const msg = (text, ms = 900) => hud.message(text, ms);
    hud.buttons({ action: 'Tuck', jump: 'Jump' });
    hud.hint('Arrows or A/D steer, hold Up to tuck, Space to jump, Space again to flip');

    const crash = (rc, text) => {
      rc.crashT = 1.1;
      rc.safeT = 2.4;
      rc.v *= 0.35;
      rc.flipT = -1;
      emit(rc.x, rc.y + 0.3, rc.z, 0, 2.5, 0, 26, 3);
      if (!rc.ai) {
        msg(text, 900);
        sound.ui('bad');
      }
    };
    const boost = (rc, dv, text) => {
      rc.v += dv;
      if (!rc.ai) {
        msg(text, 800);
        sound.ui(text === 'Flip!' ? 'coin' : 'good');
        fx.burst(new THREE.Vector3(rc.x, rc.y + 1.2, rc.z), ['#ffd166', '#ffffff', '#ff8fb1', '#8fd8ff'], 18);
      }
    };
    const land = (rc, g) => {
      rc.air = false;
      rc.y = g;
      const big = rc.airT > 0.42;
      if (rc.flipT >= 0) {
        if (rc.flipT / FLIP >= 0.72) {
          rc.flips++;
          boost(rc, 3.4, 'Flip!');
        } else crash(rc, 'Wipeout!');
        rc.flipT = -1;
      } else if (rc.flipDone) {
        rc.flips++;
        boost(rc, 3.4, 'Flip!');
      }
      else if (big) boost(rc, 1.6, 'Nice landing!');
      rc.flipDone = false;
      rc.kid.squash = 0.8;
      if (!rc.ai) sound.land();
      const dx = Math.sin(rc.alpha);
      emit(rc.x, g, rc.z, dx * rc.v * 0.3, 1.5, -rc.v * 0.2, 14, 2.2);
    };

    // Seconds until a racer in the air lands (for the computer's flip timing).
    const airLeft = (rc) => {
      const dx = Math.sin(rc.alpha) * rc.v;
      const dz = -Math.cos(rc.alpha) * rc.v;
      for (let t = 0.05; t < 2.5; t += 0.05) {
        const y = rc.y + rc.vy * t - 0.5 * G * t * t;
        if (y <= groundY(rc.x + dx * t, rc.z + dz * t)) return t;
      }
      return 2.5;
    };

    // Computer driver: aim through the next gate, steer round obstacles, tuck on straights.
    const driver = (rc) => {
      const s = -rc.z;
      const gt = gates[rc.gate];
      const nx = gates[rc.gate + 1];
      let ts;
      let tu;
      if (gt && gt.s - s < 60) {
        ts = gt.s;
        tu = gt.u + (nx ? clamp(nx.u - gt.u, -1, 1) * 0.9 : 0) * (rc.ai ? 1 : 1);
      } else {
        ts = s + 22;
        tu = 0;
      }
      const ramp = RAMPS.find((rp) => rp.s - s > 0 && rp.s - s < 26);
      if (ramp) {
        ts = ramp.s + ramp.len;
        tu = ramp.u;
      }
      if (rc.finish !== null) return { steer: 0, tuck: false, brake: 0, jump: false };
      for (const o of obstacles) {
        const ds = o.s - s;
        if (ds < 1 || ds > Math.min(30, ts - s + 4)) continue;
        const lineU = (rc.x - cx(s)) + ((tu - (rc.x - cx(s))) * ds) / Math.max(1, ts - s);
        if (Math.abs(lineU - o.u) < 1.9) tu = o.u + (lineU < o.u ? -2.4 : 2.4);
      }
      const tx = cx(ts) + tu;
      const want = Math.atan2(tx - rc.x, Math.max(4, ts - s));
      const tuck = Math.abs(want) < 0.22 && (!gt || gt.s - s > 12) && !rc.air;
      const steer = clamp(want / (tuck ? 0.55 : 1.0), -1, 1);
      let jump = false;
      if (!rc.air && ramp === undefined) {
        const on = RAMPS.find((rp) => s - rp.s > rp.len - 0.9 && s - rp.s < rp.len);
        if (on && Math.random() < 0.9) jump = true;
      }
      if (rc.air && rc.flipT < 0 && !rc.flipDone && rc.airT > 0.06 && rc.wantFlip && airLeft(rc) > FLIP * 0.95) jump = true;
      return { steer, tuck, brake: 0, jump };
    };

    const step = (rc, dt, ctrl) => {
      const s = -rc.z;
      const u = rc.x - cx(s);
      rc.safeT = Math.max(0, rc.safeT - dt);
      const crashed = rc.crashT > 0;
      if (crashed) rc.crashT -= dt;
      rc.tuck = !crashed && ctrl.tuck && !rc.air;
      // Steering
      const stopping = rc.finish !== null;
      const maxA = stopping ? 1.45 : rc.tuck ? 0.55 : 1.0;
      const target = stopping ? rc.stopSide * 1.4 : crashed ? rc.alpha * 0.9 : clamp(ctrl.steer, -1, 1) * maxA;
      const rate = rc.air ? 0.9 : stopping ? 3.5 : rc.tuck ? 2.4 : 3.8;
      const prev = rc.alpha;
      rc.alpha += clamp(target - rc.alpha, -rate * dt, rate * dt);
      rc.turn = (rc.alpha - prev) / Math.max(dt, 1e-3);
      const dx = Math.sin(rc.alpha);
      const dz = -Math.cos(rc.alpha);
      // Speed along the slope
      if (!rc.air) {
        const ahead = groundY(rc.x + dx * 0.6, rc.z + dz * 0.6);
        const behind = groundY(rc.x - dx * 0.6, rc.z - dz * 0.6);
        const grad = (ahead - behind) / 1.2;
        const band = rc.ai ? clamp((-C.z - -P.z) / 120, -0.18, 0.3) : 0;
        const dragK = (rc.tuck ? 0.0019 : 0.0035) * (rc.ai ? 1.05 + band : 1);
        let a = -GS * grad - 0.2 - dragK * rc.v * rc.v - Math.abs(rc.turn) * rc.v * 0.09;
        if (Math.abs(u) > HALF + 0.6) a -= 2.6;
        if (stopping) a -= 1.4 + rc.v * 0.22;
        a -= (ctrl.brake || 0) * 6;
        rc.v = Math.max(stopping ? 0 : 2.5, rc.v + a * dt);
        const gx = (groundY(rc.x + 0.5, rc.z) - groundY(rc.x - 0.5, rc.z)) / 1.0;
        rc.lat += -GS * gx * 0.9 * dt;
      } else rc.v = Math.max(0, rc.v - 0.002 * rc.v * rc.v * dt);
      rc.lat *= Math.exp(-2.2 * dt);
      rc.x += (dx * rc.v + rc.lat) * dt;
      rc.z += dz * rc.v * dt;
      // Keep inside the valley
      const uu = rc.x - cx(-rc.z);
      if (Math.abs(uu) > HALF + 7) {
        rc.x = cx(-rc.z) + Math.sign(uu) * (HALF + 7);
        rc.lat = -Math.sign(uu) * 2;
      }
      // Jumps and flips
      if (ctrl.jump && !crashed) {
        if (!rc.air) {
          rc.air = true;
          rc.airT = 0;
          rc.vy = Math.max(rc.vy, 0) + 5.6;
          rc.kid.squash = 1.25;
          rc.wantFlip = (rc.ai || auto) && Math.random() < rc.skill;
          if (!rc.ai) sound.jump();
        } else if (rc.flipT < 0 && !rc.flipDone) {
          rc.flipT = 0;
          if (!rc.ai) sound.ui('swoosh');
        }
      }
      const g = groundY(rc.x, rc.z);
      if (rc.air) {
        rc.vy -= G * dt;
        rc.y += rc.vy * dt;
        rc.airT += dt;
        if (rc.flipT >= 0) {
          rc.flipT += dt;
          if (rc.flipT >= FLIP) {
            rc.flipT = -1;
            rc.flipDone = true;
          }
        }
        if (rc.y <= g) land(rc, g);
      } else {
        const pred = rc.y + rc.vy * dt - 0.5 * G * dt * dt;
        if (pred > g + 0.07 && rc.v > 4) {
          rc.air = true;
          rc.airT = 0;
          rc.y = pred;
          rc.vy -= G * dt;
          rc.wantFlip = (rc.ai || auto) && Math.random() < rc.skill;
        } else {
          rc.vy = (g - rc.y) / Math.max(dt, 1e-3);
          rc.y = g;
        }
      }
      // Obstacles
      if (rc.safeT <= 0) {
        for (const o of obstacles) {
          if (Math.abs(o.s + rc.z) > 2.5) continue;
          const ddx = rc.x - o.x;
          const ddz = rc.z - o.z;
          const d = Math.hypot(ddx, ddz);
          if (d < o.r + 0.38 && rc.y - o.y < 1.6) {
            rc.x = o.x + (ddx / (d || 1)) * (o.r + 0.4);
            crash(rc, 'Oops!');
            break;
          }
        }
      }
      // Racers bump gently
      const other = rc === P ? C : P;
      const bx = rc.x - other.x;
      const bz = rc.z - other.z;
      const bd = Math.hypot(bx, bz);
      if (bd < 0.75 && bd > 1e-3) {
        rc.x += (bx / bd) * (0.75 - bd) * 0.5;
        rc.lat += (bx / bd) * 0.6;
      }
      // Gates
      const gt = gates[rc.gate];
      if (gt && -rc.z >= gt.s) {
        const gu = rc.x - cx(gt.s) - gt.u;
        if (Math.abs(gu) <= GATE_HALF + 0.25) {
          rc.passed++;
          gt.shake = 1;
          if (!rc.ai) {
            sound.ui('coin');
            emit(rc.x, rc.y + 0.8, rc.z, 0, 3, 0, 8, 2);
          }
        } else {
          rc.missed++;
          if (!rc.ai) {
            msg('Missed gate +2s', 1000);
            sound.ui('bad');
          }
        }
        rc.gate++;
      }
      // Finish
      if (rc.finish === null && -rc.z >= L) {
        rc.finish = raceT + rc.missed * 2;
        if (!rc.ai) {
          msg('Finish!', 1400);
          sound.ui('win');
        }
      }
      // Snow spray from the skis
      const carve = Math.abs(rc.turn) * rc.v;
      if (!rc.air && rc.v > 3 && (carve > 3 || stopping || Math.random() < 0.25)) {
        const n = stopping ? 3 : carve > 6 ? 2 : 1;
        const px = -Math.cos(rc.alpha) * Math.sign(rc.turn || 1);
        emit(rc.x, rc.y, rc.z, dx * rc.v * 0.3 + px * 2.5, 1.2 + carve * 0.08, dz * rc.v * 0.3, n, 1.1);
      }
    };

    // Kid pose and rig placement for one racer.
    const pose = (rc, dt, t) => {
      if (finished) {
        rc.rig.position.set(rc.x, rc.y, rc.z);
        rc.rig.rotation.set(0, rc === P ? 0.25 : -0.25, 0, 'YXZ');
        rc.flipper.rotation.set(0, 0, 0);
        rc.kid.update(dt, t, 0, 0, 0);
        return;
      }
      const ahead = groundY(rc.x + Math.sin(rc.alpha) * 0.7, rc.z - Math.cos(rc.alpha) * 0.7);
      const behind = groundY(rc.x - Math.sin(rc.alpha) * 0.7, rc.z + Math.cos(rc.alpha) * 0.7);
      const pitch = rc.air ? 0.1 : -Math.atan((ahead - behind) / 1.4);
      rc.pitch = damp(rc.pitch, pitch, 10, dt);
      rc.rig.position.set(rc.x, rc.y, rc.z);
      rc.rig.rotation.set(rc.pitch, Math.PI - rc.alpha, 0, 'YXZ');
      const tumble = rc.crashT > 0 ? Math.sin(rc.crashT * 14) * 0.5 * Math.min(1, rc.crashT * 2) : 0;
      rc.flipper.rotation.set(rc.flipT >= 0 ? (rc.flipT / FLIP) * Math.PI * 2 : 0, 0, tumble + clamp(rc.turn * 0.15, -0.35, 0.35));
      if (rc.kid.pose === 'ski') rc.kid.update(dt, t, rc.tuck ? 10 : 3 + rc.v * 0.2, 0, -rc.turn);
      else rc.kid.update(dt, t, 0, 0, 0);
    };

    // ---------------------------------------------------------- camera
    const camPos = new THREE.Vector3(P.x, P.y + 4, P.z + 9);
    const camLook = new THREE.Vector3(P.x, P.y + 1, P.z - 4);
    const tmp = new THREE.Vector3();
    let camYaw = 0;
    let fov = 50;
    const placeCam = (dt, snap = false) => {
      const focus = P;
      if (finished) {
        const mx = (P.x + C.x) / 2;
        const want = tmp.set(mx + 0.8, P.y + 1.9, P.z + 5.2);
        if (snap) camPos.copy(want);
        else camPos.lerp(want, 1 - Math.exp(-3 * dt));
        tmp.set(mx, P.y + 1.55, P.z - 1.5);
        if (snap) camLook.copy(tmp);
        else camLook.lerp(tmp, 1 - Math.exp(-4 * dt));
        camera.position.copy(camPos);
        camera.lookAt(camLook);
        far.position.set(camera.position.x * 0.9, camera.position.y - 105, camera.position.z - 420);
        env.follow(tmp.set(mx, P.y, P.z));
        return;
      }
      camYaw = damp(camYaw, focus.alpha * 0.35, 3, dt);
      const back = focus.finish !== null ? 9 : 7.4;
      const want = tmp.set(focus.x - Math.sin(camYaw) * back, focus.y + 4.3, focus.z + Math.cos(camYaw) * back);
      want.y = Math.max(want.y, groundY(want.x, want.z) + 1.6);
      if (snap || camPos.distanceTo(want) > 40) camPos.copy(want);
      else camPos.lerp(want, 1 - Math.exp(-6 * dt));
      const lx = focus.x + Math.sin(camYaw) * 5;
      const lz = focus.z - Math.cos(camYaw) * 5;
      const lookY = Math.max(focus.y, groundY(lx, lz)) + 0.9;
      if (snap || camLook.distanceTo(tmp.set(lx, lookY, lz)) > 40) camLook.set(lx, lookY, lz);
      else camLook.lerp(tmp.set(lx, lookY, lz), 1 - Math.exp(-8 * dt));
      camera.position.copy(camPos);
      camera.lookAt(camLook);
      fov = damp(fov, 50 + Math.min(14, focus.v * 0.5), 3, dt);
      if (Math.abs(camera.fov - fov) > 0.05) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      far.position.set(camera.position.x * 0.9, camera.position.y - 105, camera.position.z - 420);
      env.follow(tmp.set(focus.x, focus.y, focus.z - 6));
    };

    // ---------------------------------------------------------- HUD
    const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
    const dot = (k, color) => `<i style="position:absolute;top:-4px;left:calc(${(k * 100).toFixed(1)}% - 7px);width:14px;height:14px;border-radius:50%;background:${color};box-shadow:0 0 0 2px #fff"></i>`;
    const colorOf = (id) => (look[id].gender === 'girl' ? '#ef5b6f' : '#3f7bf0');
    const drawHud = () => {
      const pk = clamp(-P.z / L, 0, 1);
      const ck = clamp(-C.z / L, 0, 1);
      hud.score(
        `<span style="display:inline-flex;align-items:center;gap:12px">${fmt(raceT + P.missed * 2)}` +
          `<span style="font-weight:600;font-size:.8em;color:#7a6470">Gates ${P.passed}/${gates.length}</span>` +
          `<span style="position:relative;display:inline-block;width:92px;height:6px;border-radius:3px;background:#e6dce3">${dot(ck, colorOf(them))}${dot(pk, colorOf(me))}</span></span>`,
      );
    };
    drawHud();

    // ---------------------------------------------------------- results
    const results = () => {
      if (disposed) return;
      const pt = P.finish;
      const ct = C.finish ?? raceT + Math.max(0, (L + C.z) / Math.max(6, C.v)) + C.missed * 2;
      const win = pt <= ct;
      const behind = pt - ct;
      const medal = win ? 'Gold' : behind < 3 ? 'Silver' : 'Bronze';
      const prevBest = ctx.load(bestKey, null);
      const newBest = prevBest === null || pt < prevBest;
      if (newBest) ctx.save(bestKey, pt);
      const myName = look[me].name;
      const theirName = look[them].name;
      const lines = [
        `${myName} ${fmt(pt)}${P.missed ? ` (${P.missed} missed, +${P.missed * 2}s)` : ''}`,
        `${theirName} ${fmt(ct)}`,
        `${P.flips} flip${P.flips === 1 ? '' : 's'} &middot; ${newBest ? 'New best time!' : `Best ${fmt(prevBest)}`}`,
      ];
      ctx.finish({
        win: medal === 'Bronze' ? false : true,
        title: `${medal} medal!`,
        text: `${course.name}: ${win ? `${myName} wins the race!` : `${theirName} wins this time.`}<br>${lines.join('<br>')}<br>Next: ${COURSES[(courseN + 1) % COURSES.length].name}`,
      });
    };

    // Medal above the winner's head
    const medal = new THREE.Group();
    const disc = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 24), mat('#f4c24f', { metal: 0.6, rough: 0.3, emissive: '#f4a020', ei: 0.25 }));
    disc.rotation.x = Math.PI / 2;
    const ribbon = mesh(new THREE.BoxGeometry(0.12, 0.34, 0.02), mat('#ef5b6f'));
    ribbon.position.y = 0.32;
    medal.add(disc, ribbon);
    medal.visible = false;
    scene.add(medal);

    // ---------------------------------------------------------- update
    const tick = (dt, t) => {
      if (running) raceT += dt;
      const ax = input.axis();
      const pc = auto
        ? driver(P)
        : {
            steer: ax.x,
            tuck: input.held('action') || ax.y > 0.5,
            brake: ax.y < -0.4 ? -ax.y : 0,
            jump: input.pressed('jump'),
          };
      if (running) {
        step(P, dt, P.finish !== null ? { steer: 0, tuck: false, brake: 0, jump: false } : pc);
        step(C, dt, C.finish !== null ? { steer: 0, tuck: false, brake: 0, jump: false } : driver(C));
      }
      if (P.finish !== null && doneT < 0) {
        doneT = 0;
      }
      if (doneT >= 0 && !finished) {
        doneT += dt;
        if ((C.finish !== null && doneT > 2.2) || doneT > 7) {
          finished = true;
          running = false;
          const winnerIsMe = P.finish <= (C.finish ?? Infinity);
          for (const rc of racers) {
            rc.kid.pose = 'stand';
            rc.v = 0;
            rc.air = false;
            rc.flipT = -1;
          }
          // Stand side by side facing back up the hill, toward the camera
          const mx = (P.x + C.x) / 2;
          const mz = Math.max(P.z, C.z);
          P.x = mx - 0.65;
          C.x = mx + 0.65;
          P.z = C.z = mz;
          for (const rc of racers) rc.y = groundY(rc.x, rc.z);
          const winner = winnerIsMe ? P : C;
          const loser = winnerIsMe ? C : P;
          winner.kid.emote('cheer');
          setTimeout(() => loser.kid.emote(loser.kid.look.gender === 'boy' ? 'heart' : 'cheer'), 500);
          medal.visible = true;
          medal.userData.who = winner;
          drawHud();
          placeCam(dt, true);
          fx.burst(new THREE.Vector3(winner.x, winner.y + 1.5, winner.z), ['#ffd166', '#ffffff', '#ff8fb1', '#8fd8ff'], 60);
          setTimeout(results, 2200);
        }
      }
    };

    const update = (dt, t) => {
      tick(dt, t);
      for (const rc of racers) pose(rc, dt, t);
      // Gate flags wiggle when passed
      let fi = 0;
      for (const gt of gates) {
        gt.shake = Math.max(0, gt.shake - dt * 1.4);
        for (const su of [-1, 1]) {
          const x = cx(gt.s) + gt.u + su * GATE_HALF;
          const y = groundY(x, -gt.s);
          const wob = Math.sin(t * 3 + gt.s) * 0.08 + Math.sin(t * 22) * 0.35 * gt.shake;
          m4.compose(s3.set(x - su * 0.42, y + 1.45, -gt.s), q4.setFromAxisAngle(tmp.set(0, 1, 0), wob), tmp.set(1, 1, 1));
          flags.setMatrixAt(fi++, m4);
        }
      }
      flags.instanceMatrix.needsUpdate = true;
      // Spray particles
      for (let i = 0; i < SPRAY; i++) {
        const p = sp[i];
        if (p.life <= 0) continue;
        p.life -= dt;
        p.v.y -= 7 * dt;
        p.v.multiplyScalar(1 - 1.5 * dt);
        p.p.addScaledVector(p.v, dt);
        const k = Math.max(0, p.life) * p.s;
        m4.compose(p.p, q4.identity(), s3.set(k, k, k));
        spray.setMatrixAt(i, p.life > 0 ? m4 : zero);
      }
      spray.instanceMatrix.needsUpdate = true;
      if (medal.visible) {
        const w = medal.userData.who;
        medal.position.set(w.x, w.y + 2.05 + Math.sin(t * 3) * 0.06, w.z);
        medal.rotation.y = t * 2.2;
      }
      if (hiss) {
        const speed = running ? P.v : 0;
        const k = P.air ? 0.15 : 1;
        hiss.gain.gain.setTargetAtTime(Math.min(0.09, speed * 0.004 + Math.abs(P.turn) * P.v * 0.002) * k, sound.ctx.currentTime, 0.08);
        hiss.filt.frequency.setTargetAtTime(700 + speed * 40 + Math.abs(P.turn) * 300, sound.ctx.currentTime, 0.1);
      }
      flakes.update(dt, t, camera.position.x, camera.position.y - 6, camera.position.z - 12, 1);
      hudT -= dt;
      if (hudT <= 0 && !finished) {
        hudT = 0.1;
        drawHud();
      }
      placeCam(dt);
    };

    // Dev hooks for headless checks (only in the dev harness)
    if (window.__dev) {
      window.__skirace = {
        P,
        C,
        gates,
        get raceT() {
          return raceT;
        },
        auto: (on = true) => (auto = on),
        warp(s) {
          for (const rc of racers) {
            rc.z = -s;
            rc.x = cx(s) + rc.lane;
            rc.y = groundY(rc.x, rc.z);
            rc.gate = gates.findIndex((gt) => gt.s > s);
            if (rc.gate < 0) rc.gate = gates.length;
            rc.v = Math.max(rc.v, 12);
          }
        },
        sim(sec) {
          for (let i = 0; i < sec * 20 && !finished; i++) tick(0.05, 0);
          return { raceT, p: [-P.z, P.v, P.missed, P.flips, P.finish], c: [-C.z, C.v, C.missed, C.flips, C.finish] };
        },
      };
    }

    // Start: show both racers at the gate, count down, go
    for (const rc of racers) pose(rc, 0.016, 0);
    placeCam(0.016, true);
    hud.title('Ski Race', course.name);
    msg(course.name, 900);
    setTimeout(async () => {
      if (disposed) return;
      await hud.countdown(3);
      if (disposed) return;
      running = true;
      for (const rc of racers) rc.v = 5;
    }, 900);

    return {
      update,
      dispose() {
        disposed = true;
        if (hiss) {
          try {
            hiss.src.stop();
          } catch {
            /* already stopped */
          }
          hiss.gain.disconnect();
        }
        if (window.__skirace) delete window.__skirace;
      },
    };
  },
};
