import { THREE, P, at, box, rbox, cyl, sph, mat, mesh, canvasTexture, roundRect, rng, fitText, heartPath, archPoints, tube, starTexture } from './kit.js';
import { FLOOR, FLOOR_HALF, PILLAR } from './layout.js';

// The dance floor: 8 x 8 light-up tiles under a ring of arches strung with fairy lights, two crossing
// ribs holding a mirror ball, and the "first dance" plaque. While Roji and Homama dance the tiles play
// patterns to the beat, and every so often they spell R, a heart, then H.

const N = FLOOR.n;
const T = FLOOR.tile;
const COLS = ['#ff6fa8', '#ffd166', '#6fd3ff', '#b48cff', '#6fe3b8', '#ff9a6b'].map((c) => new THREE.Color(c));
const PINK = new THREE.Color('#ff4f9a');
const GOLD = new THREE.Color('#ffd166');
const DIM = new THREE.Color('#8f78d8');

// 8 x 8 pictures, row 0 at the back of the floor (the top of the screen)
const PICS = {
  R: ['.#####..', '.#....#.', '.#....#.', '.#####..', '.#.#....', '.#..#...', '.#...#..', '.#....#.'],
  heart: ['........', '.##..##.', '########', '########', '.######.', '..####..', '...##...', '........'],
  H: ['.#....#.', '.#....#.', '.#....#.', '.######.', '.######.', '.#....#.', '.#....#.', '.#....#.'],
};
// What the floor plays while they dance, in beats
const SHOW = [['checker', 8], ['diag', 8], ['rings', 8], ['chase', 8], ['sparkle', 8], ['message', 12]];
const SHOW_LEN = SHOW.reduce((s, [, n]) => s + n, 0);

const hash = (a, b, c) => {
  const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return x - Math.floor(x);
};

export function buildFloor(ctx) {
  const { g, col, atlas, bulbs, pools, dyn, updaters } = ctx;
  const F = FLOOR;

  // ------------------------------------------------ the floor
  g.add(at(rbox(N * T + 0.2, 0.05, N * T + 0.2, mat('#4a4180', { rough: 0.22, metal: 0.15 }), 0.025), F.x, 0, F.z));
  const rim = mat(P.gold, { rough: 0.35, metal: 0.6 });
  const half = FLOOR_HALF + 0.1;
  for (const s of [-1, 1]) {
    g.add(at(box(half * 2 + 0.08, 0.05, 0.08, rim), F.x, 0.02, F.z + s * half));
    g.add(at(box(0.08, 0.05, half * 2 + 0.08, rim), F.x + s * half, 0.02, F.z));
  }
  const grout = mat('#6a5fae', { rough: 0.4 });
  for (let i = 1; i < N; i++) {
    const o = (i - N / 2) * T;
    g.add(at(box(N * T, 0.012, 0.035, grout), F.x, 0.028, F.z + o));
    g.add(at(box(0.035, 0.012, N * T, grout), F.x + o, 0.028, F.z));
  }
  // Light panels: one instanced quad per tile, added on top so they read as light
  const tileTex = canvasTexture(64, 64, (c, w) => {
    const gr = c.createRadialGradient(w / 2, w / 2, 4, w / 2, w / 2, w * 0.62);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.7, 'rgba(255,255,255,0.75)');
    gr.addColorStop(1, 'rgba(255,255,255,0.35)');
    c.fillStyle = gr;
    roundRect(c, 3, 3, w - 6, w - 6, 10);
    c.fill();
  });
  const quad = new THREE.PlaneGeometry(T - 0.08, T - 0.08);
  quad.rotateX(-Math.PI / 2);
  const lights = new THREE.InstancedMesh(quad, new THREE.MeshBasicMaterial({ map: tileTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), N * N);
  const m4 = new THREE.Matrix4();
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      m4.makeTranslation(F.x + (i - (N - 1) / 2) * T, 0.04, F.z + (j - (N - 1) / 2) * T);
      lights.setMatrixAt(j * N + i, m4);
      lights.setColorAt(j * N + i, COLS[(i + j) % COLS.length]);
    }
  }
  lights.computeBoundingSphere();
  g.add(lights);
  dyn.push(lights);
  pools.push({ x: F.x, z: F.z, r: 6.2, color: '#c08cff', k: 0.42, floor: true });

  // ------------------------------------------------ pillars, arches and ribs with fairy lights
  const ivory = mat(P.ivory, { rough: 0.45, metal: 0.2 });
  const gold = mat(P.gold, { rough: 0.35, metal: 0.55 });
  const lanternMat = mat('#ffe0ec', { emissive: '#ff8fb1', ei: 0.8, rough: 0.4 });
  const TOP = 2.5;
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => new THREE.Vector3(F.x + sx * PILLAR, TOP, F.z + sz * PILLAR));
  for (const c of corners) {
    g.add(at(rbox(0.36, 0.22, 0.36, mat(P.stone, { rough: 0.8 }), 0.05), c.x, 0.11, c.z));
    g.add(at(cyl(0.085, 0.1, TOP, ivory, 12), c.x, TOP / 2 + 0.1, c.z));
    for (const y of [0.35, 1.3, TOP - 0.05]) g.add(at(cyl(0.12, 0.12, 0.06, gold, 12), c.x, y, c.z));
    g.add(at(sph(0.13, lanternMat, 12), c.x, TOP + 0.18, c.z));
    g.add(at(cyl(0.02, 0.1, 0.12, gold, 8), c.x, TOP + 0.34, c.z));
    col({ type: 'circle', x: c.x, z: c.z, r: 0.22 });
    ctx.glows.push({ x: c.x, y: TOP + 0.18, z: c.z, color: '#ff9cc4', k: 0.55 });
  }
  const string = (a, b, rise, n, set, offset = 0) => {
    const pts = archPoints(a, b, rise, 32);
    g.add(tube(pts, 0.04, ivory));
    const curve = new THREE.CatmullRomCurve3(pts);
    for (let i = 1; i < n; i++) {
      const p = curve.getPoint(i / n);
      p.y -= 0.07;
      bulbs.push({ p, base: new THREE.Color(['#fff1c9', '#ffb3cc', '#fff1c9', '#bfe8ff', '#fff1c9', '#d9c8ff'][(i + offset) % 6]), set, k: (i + offset) / 40 });
    }
  };
  // Side arches, going round the ring so the chase travels round it
  for (let i = 0; i < 4; i++) string(corners[i], corners[(i + 1) % 4], 0.75, 17, 'fairy', i * 17);
  // Two crossing ribs that meet over the middle of the floor
  string(corners[0], corners[2], 1.95, 25, 'rib', 0);
  string(corners[1], corners[3], 1.95, 25, 'rib', 3);
  const PEAK = TOP + 1.95;

  // ------------------------------------------------ mirror ball
  const facetTex = canvasTexture(256, 128, (c, w, h) => {
    const r = rng(5);
    for (let y = 0; y < h; y += 8) {
      for (let x = 0; x < w; x += 8) {
        const k = r();
        const v = Math.round(150 + k * 105);
        c.fillStyle = k > 0.93 ? ['#ffd1e4', '#cfe9ff', '#fff2c2'][Math.floor(r() * 3)] : `rgb(${v},${v},${Math.min(255, v + 12)})`;
        c.fillRect(x, y, 7, 7);
      }
    }
  });
  const ballMat = new THREE.MeshStandardMaterial({ map: facetTex, metalness: 0.85, roughness: 0.22, emissive: '#ffffff', emissiveMap: facetTex, emissiveIntensity: 0 });
  const ball = mesh(new THREE.SphereGeometry(0.36, 22, 14), ballMat);
  at(ball, F.x, PEAK - 0.78, F.z);
  g.add(ball);
  dyn.push(ball);
  g.add(at(cyl(0.012, 0.012, 0.42, gold, 5), F.x, PEAK - 0.21, F.z));
  g.add(at(sph(0.07, gold, 10), F.x, PEAK - 0.02, F.z));

  // Flecks of light the ball throws on the floor and the paving, turning with it
  const fleckN = 110;
  const fpos = new Float32Array(fleckN * 3);
  const fcol = new Float32Array(fleckN * 3);
  const fr = rng(21);
  for (let i = 0; i < fleckN; i++) {
    const a = fr() * Math.PI * 2;
    const d = 0.6 + Math.sqrt(fr()) * 5.2;
    fpos.set([Math.cos(a) * d, 0.06, Math.sin(a) * d], i * 3);
  }
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  fgeo.setAttribute('color', new THREE.BufferAttribute(fcol, 3));
  const flecks = new THREE.Points(fgeo, new THREE.PointsMaterial({ size: 0.2, map: starTexture(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  flecks.position.set(F.x, 0, F.z);
  flecks.frustumCulled = false;
  flecks.renderOrder = 2;
  g.add(flecks);
  dyn.push(flecks);

  // ------------------------------------------------ the first dance plaque
  const PX = F.x - PILLAR - 0.3;
  const PZ = F.z + PILLAR + 0.85;
  g.add(at(rbox(0.8, 0.46, 0.42, mat(P.stone, { rough: 0.8 }), 0.05), PX, 0.23, PZ));
  const plate = atlas.add(256, 150, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#f7d98b');
    gr.addColorStop(0.5, '#e8b85a');
    gr.addColorStop(1, '#f5d27c');
    c.fillStyle = gr;
    roundRect(c, 3, 3, w - 6, h - 6, 16);
    c.fill();
    c.strokeStyle = '#a8792c';
    c.lineWidth = 4;
    roundRect(c, 10, 10, w - 20, h - 20, 12);
    c.stroke();
    c.fillStyle = '#6b4316';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Our first dance', w / 2, 44, w - 40, 30);
    fitText(c, 'Roji and Homama', w / 2, 84, w - 40, 26, 600);
    c.fillStyle = '#c2414f';
    heartPath(c, w / 2, 122, 16);
    c.fill();
  });
  const pl = atlas.plane(plate, 0.68, 0.4);
  pl.rotation.x = -Math.PI / 2 + 0.2;
  at(pl, PX, 0.505, PZ);
  g.add(pl);
  col({ type: 'box', x: PX, z: PZ, hw: 0.4, hd: 0.21, h: 0.46 });

  // ------------------------------------------------ animation
  const c = new THREE.Color();
  const wanted = new THREE.Color();
  const shown = Array.from({ length: N * N }, (_, k) => COLS[k % COLS.length].clone().multiplyScalar(0.2));
  const pic = (name, i, j) => PICS[name][j][i] === '#';
  updaters.push((dt, t, S) => {
    const day = 1 - S.night;
    // Tiles
    const b = Math.floor(S.beat);
    const f = S.beat - b;
    const punch = Math.exp(-f * 3.2);
    let mode = null;
    let mb = 0;
    if (S.dancing) {
      let k = b % SHOW_LEN;
      for (const [name, n] of SHOW) {
        if (k < n) {
          mode = name;
          mb = k;
          break;
        }
        k -= n;
      }
      if (S.forceMessage) {
        mode = 'message';
        mb = Math.floor(S.forceMessage) % 12;
      }
    }
    const rate = mode ? 14 : 4;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const id = j * N + i;
        const base = COLS[(i + j + Math.floor(t * 0.25)) % COLS.length];
        let I = 0;
        if (!mode) {
          I = 0.16 + 0.2 * (0.5 + 0.5 * Math.sin(t * 1.3 - (i + j) * 0.45)) + S.night * 0.12;
          wanted.copy(base).multiplyScalar(I);
        } else if (mode === 'message') {
          const name = mb < 4 ? 'R' : mb < 8 ? 'heart' : 'H';
          const on = pic(name, i, j);
          wanted.copy(on ? (name === 'heart' ? PINK : (i + j) % 2 ? PINK : GOLD) : DIM).multiplyScalar(on ? 0.75 + 0.35 * punch : 0.1);
        } else {
          let on = false;
          if (mode === 'checker') on = (i + j + b) % 2 === 0;
          else if (mode === 'diag') on = (i + j - b + 64) % 8 < 2;
          else if (mode === 'rings') on = Math.floor(Math.max(Math.abs(i - 3.5), Math.abs(j - 3.5))) === 3 - (b % 4);
          else if (mode === 'chase') on = i === b % 8 || 7 - i === b % 8 || j === b % 8;
          else if (mode === 'sparkle') on = hash(i, j, b) < 0.32;
          I = on ? 0.55 + 0.5 * punch : 0.08 + day * 0.06;
          wanted.copy(base).multiplyScalar(I);
        }
        shown[id].lerp(wanted, Math.min(1, dt * rate));
        lights.setColorAt(id, shown[id]);
      }
    }
    lights.instanceColor.needsUpdate = true;
    // Mirror ball and its flecks
    ball.rotation.y += dt * (S.dancing ? 1.2 : 0.35);
    ballMat.emissiveIntensity = 0.05 + S.night * 0.35 + (S.dancing ? 0.25 * punch : 0);
    flecks.rotation.y = ball.rotation.y;
    const fl = S.dancing ? 0.75 + S.night * 0.25 : S.night * 0.45;
    for (let i = 0; i < fleckN; i++) {
      const tw = 0.55 + 0.45 * Math.sin(t * 5 + i * 2.1);
      const v = fl * tw;
      c.set(i % 7 === 0 ? '#ffc4dc' : i % 5 === 0 ? '#c9e8ff' : '#ffffff').multiplyScalar(v);
      fcol[i * 3] = c.r;
      fcol[i * 3 + 1] = c.g;
      fcol[i * 3 + 2] = c.b;
    }
    fgeo.attributes.color.needsUpdate = true;
    flecks.visible = fl > 0.01;
  });

  return { peak: PEAK };
}
