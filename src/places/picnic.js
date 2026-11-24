import { THREE, mat, umat, mesh, box, rbox, cyl, cone, sph, ico, tor, at, rot, scl, rod, merge, vcMesh, colorBake, bake, makeGarden, bush, hedge, pathGeo, discGeo, labelTex, panel, canvasTexture, heartGeo, Butterflies, FairyLights, sfx, rng, ROSE_COLS, FLOWER_COLS } from './parks/kit.js';
import { Duck } from './parks/duck.js';

// The Picnic Garden: a gazebo hung with fairy lights, a duck pond with lily pads and an arched bridge,
// rose arches, rose bushes in every colour, a big tree with a swing and a checked picnic blanket.
// Local frame: footprint 22 x 18, front +Z.

const POND = { x: 4.8, z: -2.4, rx: 1.9, rz: 3.0, y: 0.075 };
const BRIDGE = { z: -2.4, x0: 2.2, x1: 7.4, w: 1.3, h: 0.55 };
POND.bridge = { z: BRIDGE.z, half: BRIDGE.w / 2, gapX: 4.8, gapHalf: 1.2 };
const GAZEBO = { x: -5.2, z: -5.6, r: 1.95 };
const TREE = { x: -8.75, z: 0.35 };
const SWING = { x: -6.6, y: 3.1, z: 0.6, L: 2.5 };
const BLANKET = { x: -0.8, z: -1.1, w: 2.5, d: 1.9 };
const BASKET = { x: BLANKET.x - 0.98, z: BLANKET.z + 0.6 };
const CLOUD_X0 = -7.2;
const CLOUD_X1 = 2.6;
const CLOUD_SPOT = { x: -5.0, z: 5.5 };
const FEED = { x: 2.55, z: -0.4 };
const ROSE_X = 9.0;
const PICK = { x: ROSE_X, z: -1.1 };
const PLAZA = { x: 0, z: 3.6, r: 1.8 };
const POLES = [[-3.0, -3.0], [1.0, -3.15]];
const FOODS = [
  { id: 'sandwich', x: 0.0, z: 0.2, s: 1.45 },
  { id: 'strawberries', x: 0.42, z: 0.0, s: 1.4 },
  { id: 'cookies', x: -0.42, z: 0.02, s: 1.4 },
  { id: 'juice', x: -0.22, z: 0.62, s: 1.35 },
  { id: 'juice', x: 0.62, z: 0.45, s: 1.35 },
];
const ARCH_ROSES = ['#ff5d8f', '#ffffff', '#ff9eb5', '#ef3b5d', '#ffd75e'];

const archH = (x) => (x <= BRIDGE.x0 || x >= BRIDGE.x1 ? 0 : BRIDGE.h * Math.sin((Math.PI * (x - BRIDGE.x0)) / (BRIDGE.x1 - BRIDGE.x0)));
const pondHalf = (z) => {
  const k = (z - POND.z) / POND.rz;
  return Math.abs(k) >= 1 ? 0 : POND.rx * Math.sqrt(1 - k * k);
};

export default {
  id: 'picnic',
  stop: { title: 'Picnic Garden', tag: 'A garden for two', icon: 'basket', color: '#ff8fb1', text: 'Share a picnic on the blanket, swing under the big tree, feed the ducks, pick roses and watch the clouds drift by.' },
  icons: {
    basket: 'M4 10h16l-1.5 9a1.5 1.5 0 0 1-1.5 1.2H7a1.5 1.5 0 0 1-1.5-1.2z M7.5 10a4.5 4.5 0 0 1 9 0 M8.5 13.5v4 M12 13.5v4 M15.5 13.5v4',
    cloud: 'M7 18h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.5A3.3 3.3 0 0 0 7 18z',
    duck: 'M5.5 14.5c0 3.3 2.8 5.5 7 5.5s7.5-2.2 7.5-6c-1.8.9-3.9.2-5-1.6 1-1 1.6-2.2 1.6-3.6a3.6 3.6 0 0 0-7.2.1c0 1.3.6 2.5 1.6 3.3-3.2.6-5.5 1-5.5 2.3z M9.4 8.8 6.6 9.8l2.9.8 M12.6 8.2h.01',
    flower: 'M12 14a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M12 9a2.6 2.6 0 1 1 0-5.2A2.6 2.6 0 0 1 12 9 M12 14a2.6 2.6 0 1 0 0 5.2 M9.5 11.5a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0 M14.5 11.5a2.6 2.6 0 1 0 5.2 0 2.6 2.6 0 0 0-5.2 0 M12 19v2.5',
    swing: 'M3 3.5h18 M7.5 3.5l1.2 12 M16.5 3.5l-1.2 12 M7 15.5h10v2.2H7z',
  },

  build(ctx) {
    const { api, props } = ctx;
    const g = new THREE.Group();
    const dynamic = [];
    const colliders = [];
    const add = (...o) => (g.add(...o), o[0]);
    const dyn = (o) => (add(o), dynamic.push(o), o);
    const garden = makeGarden(31);
    const lights = new FairyLights();
    const r = rng(9);
    const S = sfx(() => api.sound);
    const vcParts = [];
    const wood = '#d39a62';
    const white = '#fffaf4';

    // ---------------------------------------------------------- paths and the little plaza
    const PATH = '#f3dcb5';
    const PATHS = [
      [[[0, 9.4], [0, 7.4], [0, 5.2]], 1.4],
      [[[-1.6, 3.15], [-3.6, 2.75], [-5.5, 2.35]], 1.2],
      [[[-1.3, 2.3], [-2.95, 0.6], [-3.95, -1.6], [-5.1, -3.45]], 1.2],
      [[[1.3, 2.3], [1.75, 0.6], [1.75, -1.2], [2.3, -2.4]], 1.2],
      [[[7.3, -2.4], [8.3, -2.4], [ROSE_X, -2.1]], 1.2],
      [[[ROSE_X, 2.4], [ROSE_X, -2.4], [ROSE_X, -7.3]], 1.2],
    ];
    PATHS.forEach(([pts, w], i) => vcParts.push(pathGeo(pts, w, PATH, { y: 0.012 + i * 0.0005 })));
    vcParts.push(discGeo(PLAZA.r, PATH, { y: 0.016 }).translate(PLAZA.x, 0, PLAZA.z));
    // Birdbath with a little blue bird in the plaza
    add(at(cyl(0.5, 0.55, 0.14, '#e3d6c3', 20), PLAZA.x, 0.07, PLAZA.z));
    add(at(cyl(0.08, 0.12, 0.7, '#efe6d6', 10), PLAZA.x, 0.5, PLAZA.z));
    add(at(cyl(0.36, 0.16, 0.14, '#efe6d6', 18), PLAZA.x, 0.9, PLAZA.z));
    add(at(cyl(0.31, 0.31, 0.02, mat('#8fdcef', { rough: 0.2 }), 18), PLAZA.x, 0.96, PLAZA.z));
    {
      const bird = new THREE.Group();
      bird.add(at(sph(0.07, '#6fb8ff', undefined, 10), 0, 0.06, 0), at(sph(0.05, '#6fb8ff', undefined, 10), 0, 0.13, 0.05));
      bird.add(rot(at(cyl(0, 0.018, 0.05, '#ffb347', 6), 0, 0.13, 0.11), Math.PI / 2, 0, 0));
      bird.add(rot(at(box(0.05, 0.015, 0.08, '#3f7bf0'), 0, 0.08, -0.08), 0.4, 0, 0));
      bird.add(at(sph(0.012, '#1d130f', undefined, 6), 0.03, 0.15, 0.09), at(sph(0.012, '#1d130f', undefined, 6), -0.03, 0.15, 0.09));
      bird.position.set(PLAZA.x + 0.3, 0.97, PLAZA.z + 0.05);
      bird.rotation.y = 0.9;
      add(bird);
    }
    colliders.push({ type: 'circle', x: PLAZA.x, z: PLAZA.z, r: 0.5 });
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2;
      const rr = 0.62 + (i % 2) * 0.12;
      garden.flower(PLAZA.x + Math.cos(a) * rr, 0.14, PLAZA.z + Math.sin(a) * rr, i % 3 ? 'pom' : 'daisy', FLOWER_COLS[i % FLOWER_COLS.length], 0.04);
    }

    // ---------------------------------------------------------- hedges around the garden
    for (const s of [-1, 1]) {
      colliders.push(hedge(g, s * 1.25, 8.6, s * 10.85, 8.6, 0.62, 0.6));
      colliders.push(hedge(g, s * 10.85, 8.6, s * 10.85, -8.6, 0.62, 0.6));
      garden.bed(s > 0 ? 1.7 : -10.3, s > 0 ? 10.3 : -1.7, 7.75, 8.15, 0, 70, 70 + s);
    }
    colliders.push(hedge(g, -10.85, -8.6, 10.85, -8.6, 0.62, 0.6));
    garden.bed(-2.6, 3.2, -8.1, -7.75, 0, 40, 77);

    // ---------------------------------------------------------- flower arches
    const archGroups = [];
    const flowerArch = (x, z, w, h, ry = 0) => {
      const ag = new THREE.Group();
      const R = w / 2;
      const cy = h - R;
      for (const s of [-1, 1]) {
        for (const dz of [-0.13, 0.13]) ag.add(at(box(0.07, cy, 0.07, white), s * R, cy / 2, dz));
        for (let k = 0; k < 6; k++) ag.add(at(box(0.07, 0.04, 0.3, white), s * R, 0.25 + k * (cy / 6), 0));
      }
      for (const dz of [-0.13, 0.13]) ag.add(at(tor(R, 0.035, white, undefined, Math.PI, 6, 20), 0, cy, dz));
      for (let k = 0; k <= 8; k++) {
        const a = (k / 8) * Math.PI;
        ag.add(rot(at(box(0.05, 0.04, 0.3, white), Math.cos(a) * R, cy + Math.sin(a) * R, 0), 0, 0, a));
      }
      ag.position.set(x, 0, z);
      ag.rotation.y = ry;
      add(ag);
      ag.updateMatrixWorld(true);
      const P = new THREE.Vector3();
      const put = (lx, ly, lz, i) => {
        P.set(lx, ly, lz).applyMatrix4(ag.matrix);
        if (i % 3) garden.flower(P.x, P.y, P.z, 'rose', ARCH_ROSES[i % ARCH_ROSES.length], 0.01, 1.15);
        garden.leaf(P.x + (r() - 0.5) * 0.12, P.y + (r() - 0.5) * 0.1, P.z + (r() - 0.5) * 0.12, 1.2, r() * 6, r() * 3, r() < 0.5 ? '#5aa84f' : '#76c25c');
      };
      let i = 0;
      for (let k = 0; k < 34; k++) {
        const a = (k / 33) * Math.PI;
        put(Math.cos(a) * R + (r() - 0.5) * 0.1, cy + Math.sin(a) * R + (r() - 0.3) * 0.1, (r() - 0.5) * 0.3, i++);
      }
      for (const s of [-1, 1]) for (let k = 0; k < 16; k++) put(s * R + (r() - 0.5) * 0.12, 0.2 + (k / 16) * cy + r() * 0.1, (r() - 0.5) * 0.32, i++);
      for (const s of [-1, 1]) {
        const cx = x + Math.cos(ry) * s * R;
        const cz = z - Math.sin(ry) * s * R;
        colliders.push({ type: 'circle', x: cx, z: cz, r: 0.18 });
      }
      archGroups.push(ag);
      return ag;
    };
    flowerArch(0, 8.6, 2.3, 2.75);
    flowerArch(ROSE_X, -3.35, 1.7, 2.4);
    flowerArch(-4.75, -2.95, 1.7, 2.4, -0.55);
    // A painted board on the entrance arch
    {
      const board = labelTex(['Welcome to the', 'Picnic Garden'], { w: 512, h: 160, border: '#ff8fb1', accent: '#ef5b6f' });
      add(at(panel(1.5, 0.47, board), 0, 2.28, 8.79));
      add(at(rbox(1.6, 0.55, 0.06, wood, 0.03), 0, 2.28, 8.74));
      for (const s of [-1, 1]) add(at(cyl(0.012, 0.012, 0.32, '#8a6a4a', 4), s * 0.6, 2.65, 8.74));
    }
    const sign = ctx.sign(['Share a picnic in the', 'Picnic Garden'], { width: 2.4, height: 0.9, accent: '#ef5b6f', postHeight: 1.1 });
    sign.position.set(-3.0, 0, 7.25);
    sign.rotation.y = 0.15;
    add(sign);
    colliders.push({ type: 'box', x: -3.0, z: 7.2, hw: 1.05, hd: 0.12 });

    // ---------------------------------------------------------- gazebo
    {
      const G = GAZEBO;
      const gg = new THREE.Group();
      gg.add(rot(at(cyl(G.r + 0.25, G.r + 0.3, 0.22, '#e8c39a', 8), 0, 0.11, 0), 0, Math.PI / 8, 0));
      gg.add(rot(at(cyl(G.r + 0.1, G.r + 0.1, 0.03, '#f2d3ad', 8), 0, 0.235, 0), 0, Math.PI / 8, 0));
      gg.add(at(rbox(1.3, 0.11, 0.5, '#e8c39a', 0.03), 0, 0.055, G.r + 0.45));
      const corner = (i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        return [Math.sin(a) * G.r, Math.cos(a) * G.r];
      };
      for (let i = 0; i < 8; i++) {
        const [px, pz] = corner(i);
        gg.add(at(cyl(0.08, 0.09, 2.2, white, 10), px, 1.32, pz));
        gg.add(at(sph(0.11, '#ff9eb5', undefined, 10), px, 2.44, pz));
        const [qx, qz] = corner(i + 1);
        const front = i === 7; // the side facing +Z stays open
        const a = new THREE.Vector3(px, 0, pz);
        const b = new THREE.Vector3(qx, 0, qz);
        if (!front) {
          gg.add(rod(a.clone().setY(0.82), b.clone().setY(0.82), 0.035, white, 6));
          gg.add(rod(a.clone().setY(0.36), b.clone().setY(0.36), 0.03, white, 6));
          for (let k = 1; k < 5; k++) {
            const p = a.clone().lerp(b, k / 5);
            gg.add(at(box(0.04, 0.46, 0.04, white), p.x, 0.59, p.z));
          }
          for (let k = 0; k < 3; k++) {
            const p = a.clone().lerp(b, (k + 0.5) / 3);
            colliders.push({ type: 'circle', x: G.x + p.x, z: G.z + p.z, r: 0.22 });
          }
        }
        // Lace trim between post tops
        gg.add(rod(a.clone().setY(2.32), b.clone().setY(2.32), 0.04, white, 6));
        lights.string([G.x + px * 1.02, 2.28, G.z + pz * 1.02], [G.x + qx * 1.02, 2.28, G.z + qz * 1.02], 4, 0.2);
        colliders.push({ type: 'circle', x: G.x + px, z: G.z + pz, r: 0.12 });
      }
      // Roof: pink octagonal cone, white band and a heart on top
      gg.add(rot(at(cone(G.r + 0.55, 1.25, '#ff9eb5', 8, { rough: 0.6 }), 0, 3.05, 0), 0, Math.PI / 8, 0));
      gg.add(rot(at(cyl(G.r + 0.56, G.r + 0.6, 0.12, white, 8), 0, 2.44, 0), 0, Math.PI / 8, 0));
      gg.add(at(cyl(0.22, 0.3, 0.14, white, 8), 0, 3.6, 0));
      gg.add(at(sph(0.1, '#f4c24f', { metal: 0.5, rough: 0.35 }, 10), 0, 3.72, 0));
      gg.add(at(mesh(heartGeo(0.26, 0.06), mat('#ef5b6f', { rough: 0.45 })), 0, 3.98, 0));
      // A small round table with a vase of roses, and two stools
      gg.add(at(cyl(0.45, 0.45, 0.05, white, 20), 0, 0.97, -0.2));
      gg.add(at(cyl(0.06, 0.12, 0.72, white, 10), 0, 0.6, -0.2));
      gg.add(at(cyl(0.07, 0.05, 0.16, '#7fb0ff', 10, { rough: 0.3 }), 0, 1.07, -0.2));
      for (let k = 0; k < 5; k++) garden.flower(G.x + Math.cos(k * 1.3) * 0.04, 1.12, G.z - 0.2 + Math.sin(k * 1.3) * 0.04, 'rose', ['#ff5d8f', '#ffffff', '#ff9eb5'][k % 3], 0.12);
      for (const s of [-1, 1]) {
        gg.add(at(cyl(0.2, 0.2, 0.08, '#ff9eb5', 14), s * 0.75, 0.7, -0.2));
        gg.add(at(cyl(0.05, 0.08, 0.45, white, 8), s * 0.75, 0.45, -0.2));
      }
      gg.position.set(G.x, 0, G.z);
      add(gg);
      colliders.push({ type: 'circle', x: G.x, z: G.z, r: G.r + 0.25, h: 0.24 });
      colliders.push({ type: 'circle', x: G.x, z: G.z - 0.2, r: 0.46, h: 1.0 });
    }

    // ---------------------------------------------------------- the pond, lily pads, reeds and the bridge
    {
      const P = POND;
      const waterTex = canvasTexture(256, 256, (c, w, h) => {
        const gr = c.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w / 2);
        gr.addColorStop(0, '#8fe0ee');
        gr.addColorStop(0.75, '#74cfe3');
        gr.addColorStop(1, '#5fb9d4');
        c.fillStyle = gr;
        c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(255,255,255,0.45)';
        c.lineWidth = 3;
        for (let i = 0; i < 18; i++) {
          const x = 30 + ((i * 71) % 196);
          const y = 30 + ((i * 113) % 196);
          c.beginPath();
          c.ellipse(x, y, 10 + (i % 3) * 5, 4 + (i % 2) * 2, 0, 0, Math.PI * 2);
          c.stroke();
        }
      });
      const water = mesh(new THREE.CircleGeometry(1, 40), umat('#ffffff', { rough: 0.12, map: waterTex }), { cast: false });
      water.rotation.x = -Math.PI / 2;
      water.scale.set(P.rx + 0.08, P.rz + 0.08, 1);
      water.position.set(P.x, P.y, P.z);
      add(water);
      // Sparkles that drift over the water
      const sparkTex = canvasTexture(128, 128, (c) => {
        c.fillStyle = 'rgba(255,255,255,0.9)';
        for (let i = 0; i < 14; i++) {
          const x = (i * 47) % 128;
          const y = (i * 83) % 128;
          for (const [dx, dy] of [[0, 0], [128, 0], [-128, 0], [0, 128], [0, -128]]) {
            c.beginPath();
            c.ellipse(x + dx, y + dy, 6, 1.6, 0, 0, Math.PI * 2);
            c.fill();
          }
        }
      });
      sparkTex.wrapS = sparkTex.wrapT = THREE.RepeatWrapping;
      sparkTex.repeat.set(2, 3);
      const sparkle = mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ map: sparkTex, transparent: true, opacity: 0.55, depthWrite: false }), { cast: false, receive: false });
      sparkle.rotation.x = -Math.PI / 2;
      sparkle.scale.set(P.rx, P.rz, 1);
      sparkle.position.set(P.x, P.y + 0.004, P.z);
      dyn(sparkle);
      g.userData.sparkTex = sparkTex;
      // Rim stones
      const stones = ['#e9dfcf', '#ddd2bf', '#f2ebdf', '#d6cab5'];
      for (let i = 0; i < 52; i++) {
        const a = (i / 52) * Math.PI * 2;
        const x = P.x + Math.cos(a) * (P.rx + 0.14);
        const z = P.z + Math.sin(a) * (P.rz + 0.14);
        if (Math.abs(z - BRIDGE.z) < BRIDGE.w / 2 + 0.05) continue;
        const st = mesh(new THREE.IcosahedronGeometry(0.19, 0), mat(stones[i % 4], { rough: 0.9, flat: true }), { cast: false });
        st.scale.set(1.25, 0.5, 1.0);
        st.position.set(x, 0.06, z);
        st.rotation.y = -a;
        add(st);
      }
      // Lily pads with pink lotus flowers
      const padGeo = new THREE.CircleGeometry(0.2, 14, 0.35, Math.PI * 2 - 0.7);
      for (const [x, z, s, flower] of [[3.75, -4.1, 1.1, true], [5.9, -4.6, 0.9, false], [5.7, -3.6, 1.2, false], [3.6, -1.1, 0.8, false], [6.0, -0.9, 1.0, true], [5.3, 0.15, 0.85, false], [4.2, -5.0, 0.8, false]]) {
        const pad = mesh(padGeo, mat('#5fae4f', { rough: 0.7 }), { cast: false });
        pad.rotation.set(-Math.PI / 2, 0, x * 3);
        pad.scale.setScalar(s);
        pad.position.set(x, P.y + 0.012, z);
        add(pad);
        if (flower) {
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            const pe = mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(k % 2 ? '#ffb8d0' : '#ff8fb1', { rough: 0.6 }), { cast: false });
            pe.scale.set(0.55, 0.35, 1.2);
            pe.position.set(x + Math.sin(a) * 0.05, P.y + 0.06, z + Math.cos(a) * 0.05);
            pe.rotation.set(0.5, a, 0, 'YXZ');
            add(pe);
          }
          add(at(sph(0.03, '#ffd75e', undefined, 8), x, P.y + 0.08, z));
        }
      }
      // Reeds and cattails on the far bank
      for (let i = 0; i < 16; i++) {
        const a = -2.2 + (i / 15) * 1.1 + (r() - 0.5) * 0.08;
        const x = P.x + Math.cos(a) * (P.rx + 0.32 + r() * 0.15);
        const z = P.z + Math.sin(a) * (P.rz + 0.28 + r() * 0.15);
        const hgt = 0.7 + r() * 0.5;
        add(rot(at(cyl(0.012, 0.016, hgt, '#5aa84f', 4), x, hgt / 2, z), (r() - 0.5) * 0.2, 0, (r() - 0.5) * 0.2));
        if (i % 2 === 0) add(at(scl(sph(0.035, '#9b6a43', undefined, 8), 1, 2.6, 1), x, hgt + 0.02, z));
      }
      // Pond walls: slices of the ellipse, open where the bridge crosses
      for (const [z0, z1] of [[P.z - P.rz, BRIDGE.z - BRIDGE.w / 2], [BRIDGE.z + BRIDGE.w / 2, P.z + P.rz]]) {
        const n = Math.ceil((z1 - z0) / 0.5);
        for (let i = 0; i < n; i++) {
          const a = z0 + (i / n) * (z1 - z0);
          const b = z0 + ((i + 1) / n) * (z1 - z0);
          const half = Math.max(pondHalf(a), pondHalf(b), pondHalf((a + b) / 2)) + 0.12;
          colliders.push({ type: 'box', x: P.x, z: (a + b) / 2, hw: half, hd: (b - a) / 2 });
        }
      }

      // Bridge: arched plank deck, white rails with pink caps
      const B = BRIDGE;
      const N = 18;
      const pw = (B.x1 - B.x0) / N;
      for (let i = 0; i < N; i++) {
        const x = B.x0 + (i + 0.5) * pw;
        const slope = Math.atan2(archH(x + pw / 2) - archH(x - pw / 2), pw);
        add(rot(at(rbox(pw * 0.94, 0.07, B.w, i % 2 ? '#d9a46c' : wood, 0.02), x, archH(x) + 0.05, B.z), 0, 0, slope));
      }
      const posts = 9;
      for (const s of [-1, 1]) {
        const zr = B.z + s * (B.w / 2 - 0.04);
        let prev = null;
        for (let i = 0; i <= posts; i++) {
          const x = B.x0 + 0.12 + (i / posts) * (B.x1 - B.x0 - 0.24);
          const y0 = archH(x) + 0.08;
          add(at(box(0.07, 0.5, 0.07, white), x, y0 + 0.25, zr));
          add(at(sph(0.06, '#ff9eb5', undefined, 8), x, y0 + 0.52, zr));
          const top = new THREE.Vector3(x, y0 + 0.47, zr);
          if (prev) {
            add(rod(prev, top, 0.03, white, 6));
            add(rod(prev.clone().setY(prev.y - 0.24), top.clone().setY(top.y - 0.24), 0.02, white, 5));
          }
          prev = top;
          if (i % 3 === 1 && i + 3 <= posts) {
            const x2 = B.x0 + 0.12 + ((i + 3) / posts) * (B.x1 - B.x0 - 0.24);
            lights.string([x, y0 + 0.5, zr], [x2, archH(x2) + 0.58, zr], 3, 0.1);
          }
        }
        // Curved stringer under the deck edge
        let p0 = null;
        for (let i = 0; i <= 12; i++) {
          const x = B.x0 + (i / 12) * (B.x1 - B.x0);
          const p = new THREE.Vector3(x, archH(x) - 0.02, B.z + s * (B.w / 2 - 0.02));
          if (p0) add(rod(p0, p, 0.05, '#b97d48', 6));
          p0 = p;
        }
      }
      // Walkable deck: thin slices with top heights
      const nC = 13;
      for (let i = 0; i < nC; i++) {
        const xa = B.x0 + (i / nC) * (B.x1 - B.x0);
        const xb = B.x0 + ((i + 1) / nC) * (B.x1 - B.x0);
        colliders.push({ type: 'box', x: (xa + xb) / 2, z: B.z, hw: (xb - xa) / 2, hd: B.w / 2, h: Math.max(archH(xa), archH(xb)) + 0.09 });
      }
    }

    // ---------------------------------------------------------- the big tree and its swing
    {
      const T = TREE;
      add(at(cyl(0.34, 0.5, 3.6, '#9b6a43', 10), T.x, 1.8, T.z));
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + 0.3;
        add(rot(at(scl(cyl(0.08, 0.16, 0.7, '#8a5d3a', 6), 1, 1, 1), T.x + Math.cos(a) * 0.4, 0.15, T.z + Math.sin(a) * 0.4), Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9));
      }
      add(rod(new THREE.Vector3(T.x + 0.1, 2.9, T.z), new THREE.Vector3(SWING.x + 0.6, SWING.y + 0.1, SWING.z), 0.13, '#9b6a43', 8));
      add(rod(new THREE.Vector3(T.x - 0.1, 3.0, T.z), new THREE.Vector3(T.x - 1.4, 3.9, T.z - 0.4), 0.11, '#9b6a43', 7));
      const crown = [[0.1, 4.7, -0.2, 1.75, '#5aa84f'], [1.2, 4.15, 0.2, 1.25, '#6dbb58'], [-1.1, 4.25, -0.4, 1.3, '#77c05a'], [0.3, 5.55, -0.4, 1.3, '#84c95f'], [0.4, 4.0, -1.2, 1.15, '#5aa84f'], [-0.6, 3.9, 0.8, 1.0, '#6dbb58']];
      for (const [dx, dy, dz, rr, c] of crown) {
        add(at(scl(ico(rr, c, { rough: 0.85 }, 1), 1, 0.9, 1), T.x + dx, dy, T.z + dz));
        for (let k = 0; k < Math.round(rr * 7); k++) {
          const th = r() * Math.PI * 2;
          const ph = 0.3 + r() * 1.2;
          garden.flower(T.x + dx + Math.sin(ph) * Math.cos(th) * rr * 0.96, dy + Math.cos(ph) * rr * 0.86, T.z + dz + Math.sin(ph) * Math.sin(th) * rr * 0.96, 'pom', ['#ffb8d0', '#ffffff', '#ff8fb1'][k % 3], 0.01, 1.3);
        }
      }
      colliders.push({ type: 'circle', x: T.x, z: T.z, r: 0.52 });
      // Little flowers at the foot of the tree
      garden.bed(T.x - 1.1, T.x + 0.9, T.z + 0.6, T.z + 1.3, 0, 22, 91);
    }
    const swing = new THREE.Group();
    swing.position.set(SWING.x, SWING.y, SWING.z);
    for (const s of [-1, 1]) {
      swing.add(at(cyl(0.016, 0.016, SWING.L, '#e8d6b8', 5), s * 0.27, -SWING.L / 2, 0));
      swing.add(at(tor(0.05, 0.016, '#e8d6b8', undefined, Math.PI * 2, 4, 8), s * 0.27, 0.02, 0));
      for (let k = 0; k < 7; k++) {
        swing.add(at(sph(0.035, k % 2 ? '#ff9eb5' : '#ffffff', undefined, 6), s * 0.27 + (k % 2 ? 0.02 : -0.02), -0.3 - k * 0.3, 0.02));
        swing.add(at(scl(sph(0.04, '#6dbb58', undefined, 6), 1, 0.4, 1.6), s * 0.27, -0.45 - k * 0.3, -0.02));
      }
    }
    swing.add(at(rbox(0.68, 0.06, 0.32, '#ff8fb1', 0.025), 0, -SWING.L, 0));
    swing.add(at(rbox(0.6, 0.02, 0.26, white, 0.01), 0, -SWING.L + 0.035, 0));
    bake(swing);
    dyn(swing);
    colliders.push({ type: 'circle', x: SWING.x, z: SWING.z, r: 0.3 });

    // ---------------------------------------------------------- picnic blanket and basket
    {
      const BL = BLANKET;
      const gingham = canvasTexture(256, 256, (c, w, h) => {
        c.fillStyle = '#fff6f2';
        c.fillRect(0, 0, w, h);
        const n = 10;
        const cs = w / n;
        c.fillStyle = 'rgba(239,91,111,0.45)';
        for (let i = 0; i < n; i += 2) {
          c.fillRect(i * cs, 0, cs, h);
          c.fillRect(0, i * cs, w, cs);
        }
        c.strokeStyle = '#ffffff';
        c.lineWidth = 10;
        c.strokeRect(5, 5, w - 10, h - 10);
      });
      const bg = new THREE.PlaneGeometry(BL.w, BL.d, 10, 8);
      const pp = bg.attributes.position;
      for (let i = 0; i < pp.count; i++) pp.setZ(i, (Math.sin(pp.getX(i) * 3.1) * Math.cos(pp.getY(i) * 2.3)) * 0.008 + 0.012);
      bg.computeVertexNormals();
      const blanket = mesh(bg, umat('#ffffff', { rough: 0.9, map: gingham }), { cast: false });
      blanket.rotation.x = -Math.PI / 2;
      blanket.position.set(BL.x, 0.0, BL.z);
      add(blanket);
      // Basket: wicker body, two lids that open, a handle and a peek of cloth
      const basket = new THREE.Group();
      basket.add(at(rbox(0.56, 0.3, 0.38, '#d9a066', 0.04), 0, 0.15, 0));
      for (const y of [0.07, 0.15, 0.23]) basket.add(at(rbox(0.575, 0.03, 0.395, '#c48a52', 0.012), 0, y, 0));
      basket.add(at(box(0.5, 0.04, 0.32, '#ef5b6f'), 0, 0.31, 0));
      for (const s of [-1, 1]) basket.add(at(box(0.04, 0.24, 0.04, '#c48a52'), s * 0.22, 0.4, 0));
      basket.add(at(tor(0.22, 0.022, '#c48a52', undefined, Math.PI, 6, 14), 0, 0.5, 0));
      const lids = [];
      for (const s of [-1, 1]) {
        const lid = new THREE.Group();
        lid.position.set(0, 0.32, 0);
        lid.add(at(rbox(0.29, 0.04, 0.4, '#d9a066', 0.015), s * 0.145, 0.02, 0));
        lid.add(at(rbox(0.29, 0.015, 0.405, '#c48a52', 0.006), s * 0.145, 0.045, 0));
        bake(lid);
        basket.add(lid);
        lids.push({ lid, s });
      }
      bake(basket, lids.map((l) => l.lid));
      basket.position.set(BASKET.x, 0.02, BASKET.z);
      basket.rotation.y = 0.35;
      dyn(basket);
      g.userData.basketLids = lids;
      colliders.push({ type: 'box', x: BASKET.x, z: BASKET.z, hw: 0.3, hd: 0.25, h: 0.36 });
    }
    const lids = g.userData.basketLids;
    const foodGroup = new THREE.Group();
    dyn(foodGroup);
    const foods = FOODS.map((f) => ({ ...f, obj: null, k: 0, t0: 0 }));
    for (const f of foods) {
      Promise.resolve(props?.food?.(f.id))
        .then((o) => {
          if (!o) return;
          const w = new THREE.Group();
          w.add(o);
          w.position.set(BLANKET.x + f.x, 0.02, BLANKET.z + f.z);
          w.rotation.y = r() * 0.8 - 0.4;
          w.scale.setScalar(0);
          w.visible = false;
          foodGroup.add(w);
          f.obj = w;
        })
        .catch(() => {});
    }

    // ---------------------------------------------------------- fairy light poles and strings
    for (const [x, z] of POLES) {
      add(at(cyl(0.05, 0.07, 2.6, '#8a6a4a', 8), x, 1.3, z));
      add(at(sph(0.08, '#ff9eb5', undefined, 8), x, 2.64, z));
      colliders.push({ type: 'circle', x, z, r: 0.12 });
    }
    lights.string([SWING.x + 0.6, 3.15, SWING.z], [POLES[0][0], 2.55, POLES[0][1]], 10, 0.55);
    lights.string([POLES[0][0], 2.55, POLES[0][1]], [POLES[1][0], 2.55, POLES[1][1]], 11, 0.55);
    lights.string([POLES[1][0], 2.55, POLES[1][1]], [BRIDGE.x0 + 0.12, 0.62, BRIDGE.z - BRIDGE.w / 2], 6, 0.25);
    lights.string([POLES[0][0], 2.55, POLES[0][1]], [GAZEBO.x + 1.1, 2.3, GAZEBO.z + 1.6], 5, 0.2);
    // Along the entrance arch
    for (let k = 0; k < 15; k++) {
      const a = (k / 14) * Math.PI;
      lights.bulbs.push({ p: new THREE.Vector3(Math.cos(a) * 1.15, 1.6 + Math.sin(a) * 1.15 + 0.06, 8.75), c: ['#fff3c4', '#ff9ec4', '#ffd36b', '#8ff0e0', '#d6b8ff'][k % 5], ph: k });
    }
    for (const im of lights.build(g)) dynamic.push(im);

    // ---------------------------------------------------------- rose garden and other beds
    const roseBushes = [];
    const roseAt = (x, z, rad, sd) => {
      const cs = [ROSE_COLS[sd % ROSE_COLS.length], ROSE_COLS[(sd + 3) % ROSE_COLS.length], ROSE_COLS[(sd + 5) % ROSE_COLS.length]];
      garden.roseBush(g, x, z, rad, cs, sd);
      colliders.push({ type: 'circle', x, z, r: rad * 0.95 });
      roseBushes.push({ x, z, rad, color: cs[0] });
    };
    let sd = 1;
    for (const z of [0.55, -0.9, -3.95, -5.4, -6.8]) roseAt(ROSE_X - 1.05, z, 0.5, sd++);
    for (const z of [0.55, -1.0, -2.5, -3.95, -5.4, -6.8]) roseAt(ROSE_X + 1.05, z, 0.48, sd++);
    for (const [x, z, rr] of [[-7.7, -3.6, 0.5], [-2.7, -4.6, 0.45], [-1.9, -7.45, 0.5], [2.3, -7.4, 0.5], [6.4, -7.3, 0.5], [2.4, 7.35, 0.45], [-7.6, 7.3, 0.45], [7.2, 7.3, 0.45], [-9.9, -6.8, 0.5]]) roseAt(x, z, rr, sd++);
    // Heart topiary in a pot at the back
    add(at(cyl(0.3, 0.24, 0.42, '#e07a55', 14), 0.3, 0.21, -6.7));
    add(at(cyl(0.32, 0.32, 0.06, '#c9653f', 14), 0.3, 0.43, -6.7));
    add(at(cyl(0.04, 0.05, 0.5, '#8a5d3a', 6), 0.3, 0.7, -6.7));
    add(at(mesh(heartGeo(1.0, 0.36, 0.25), mat('#5aa84f', { rough: 0.85, flat: true })), 0.3, 1.45, -6.7));
    colliders.push({ type: 'circle', x: 0.3, z: -6.7, r: 0.35 });
    // Bushes
    for (const [x, z, rr] of [[-10.1, 7.6, 0.45], [10.1, 7.6, 0.45], [-10.1, -2.0, 0.5], [10.1, 4.2, 0.45], [-3.6, -7.5, 0.45], [4.4, -7.4, 0.45], [7.5, 3.6, 0.4], [-9.9, 3.6, 0.45]]) {
      bush(g, x, z, rr);
      colliders.push({ type: 'circle', x, z, r: rr * 0.9 });
    }
    // A bench by the pond and a bird house
    {
      const b = new THREE.Group();
      b.add(at(rbox(1.5, 0.07, 0.46, wood, 0.02), 0, 0.45, 0));
      b.add(at(rbox(1.5, 0.07, 0.06, wood, 0.02), 0, 0.68, -0.22), at(rbox(1.5, 0.07, 0.06, wood, 0.02), 0, 0.84, -0.22));
      for (const s of [-1, 1]) b.add(at(box(0.06, 0.45, 0.4, '#5c7a8a'), s * 0.66, 0.22, 0), at(box(0.06, 0.5, 0.05, '#5c7a8a'), s * 0.66, 0.68, -0.24));
      b.add(at(rbox(0.32, 0.12, 0.3, '#ff9eb5', 0.05), 0.42, 0.55, 0));
      b.position.set(5.6, 0, 4.4);
      add(b);
      colliders.push({ type: 'box', x: 5.6, z: 4.4, hw: 0.76, hd: 0.26, h: 0.48 });
      add(at(cyl(0.05, 0.05, 1.6, '#8a6a4a', 8), 8.4, 0.8, 5.4));
      add(at(rbox(0.36, 0.34, 0.32, '#7fd3a7', 0.04), 8.4, 1.75, 5.4));
      add(rot(at(cone(0.32, 0.22, '#ef5b6f', 4), 8.4, 2.03, 5.4), 0, Math.PI / 4, 0));
      add(at(cyl(0.06, 0.06, 0.02, '#3b2b3f', 12), 8.4, 1.78, 5.57)).rotation.x = Math.PI / 2;
      colliders.push({ type: 'circle', x: 8.4, z: 5.4, r: 0.1 });
    }
    // Flower beds around the lawns
    garden.bed(-9.6, -7.0, 4.6, 6.6, 0, 40, 101);
    garden.bed(3.4, 7.4, 6.2, 6.9, 0, 34, 102);
    garden.bed(-3.0, -1.6, 4.9, 5.6, 0, 16, 103);
    garden.bed(1.8, 3.4, 4.5, 5.6, 0, 18, 104);

    // ---------------------------------------------------------- ducks
    const mama = new Duck('white', POND, 4.4, -1.0, 1);
    const papa = new Duck('mallard', POND, 5.3, -4.2, 2);
    const babies = [0, 1, 2].map((i) => new Duck('duckling', POND, 4.2 - i * 0.2, -0.6 + i * 0.2, 3 + i));
    const ducks = [mama, papa, ...babies];
    for (const d of ducks) dyn(d.holder);
    const CRUMBS = 16;
    const crumbMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.028, 0), mat('#e8c68e', { rough: 0.8 }), CRUMBS);
    crumbMesh.castShadow = false;
    crumbMesh.frustumCulled = false;
    const crumbs = [...Array(CRUMBS)].map(() => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), alive: false, floating: false, life: 0 }));
    let crumbNext = 0;
    dyn(crumbMesh);
    const HIDE = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < CRUMBS; i++) crumbMesh.setMatrixAt(i, HIDE);

    // ---------------------------------------------------------- clouds (two instanced meshes, shown while cloud watching)
    const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, emissive: '#ffffff', emissiveIntensity: 0.45 });
    const HEARTS = 4;
    const heartCloud = new THREE.InstancedMesh(heartGeo(1.3, 0.45, 0.6), cloudMat, HEARTS);
    const PUFFS = 18;
    const puffCloud = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), cloudMat, PUFFS);
    const cloudGroup = new THREE.Group();
    cloudGroup.add(heartCloud, puffCloud);
    cloudGroup.visible = false;
    for (const im of [heartCloud, puffCloud]) {
      im.castShadow = false;
      im.frustumCulled = false;
    }
    dyn(cloudGroup);
    for (let i = 0; i < HEARTS; i++) heartCloud.setMatrixAt(i, HIDE);
    for (let i = 0; i < PUFFS; i++) puffCloud.setMatrixAt(i, HIDE);
    const clouds = [];
    const cloudSpecs = [
      { heart: true, s: 1.0, y: 3.6, z: 3.9 },
      { heart: false, s: 1.1, y: 4.1, z: 3.4 },
      { heart: true, s: 0.8, y: 3.3, z: 4.3 },
      { heart: true, s: 1.1, y: 3.9, z: 3.6 },
      { heart: false, s: 0.9, y: 3.4, z: 4.1 },
      { heart: true, s: 0.85, y: 4.2, z: 3.3 },
      { heart: false, s: 1.0, y: 3.7, z: 3.8 },
    ];
    let hi = 0;
    let pi = 0;
    for (const c of cloudSpecs) {
      clouds.push({ ...c, idx: c.heart ? hi++ : (pi += 6) - 6, x: 0, k: 0 });
    }

    // ---------------------------------------------------------- butterflies
    const flutter = new Butterflies(7, ['#ffb4d0', '#b9a4ff', '#ffe08a', '#9fe3ff', '#ffc9a8', '#ff9ec4', '#c7f0a0'], [
      { x0: 7.8, x1: 10.2, z0: -6.5, z1: 1, y: 1.1 },
      { x0: -2, x1: 2, z0: 2.2, z1: 5, y: 1.2 },
      { x0: -9.5, x1: -6.5, z0: 4.2, z1: 6.8, y: 0.9 },
      { x0: -7.2, x1: -3.2, z0: -7.6, z1: -3.4, y: 1.6 },
      { x0: 2.5, x1: 8, z0: 5.6, z1: 7.4, y: 0.8 },
      { x0: -2.4, x1: 0.8, z0: -2.2, z1: 0.2, y: 1.0 },
      { x0: 2.5, x1: 7.2, z0: -6.8, z1: -5.6, y: 1.3 },
    ], 4);
    dyn(flutter.group);

    // ---------------------------------------------------------- finish the static scene
    // Wildflowers dotted over the lawns, clear of paths, water and the places where the kids sit or lie
    {
      const segDist = (x, z, a, b) => {
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const k = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
        return Math.hypot(x - a[0] - dx * k, z - a[1] - dz * k);
      };
      const clear = (x, z) => {
        for (const [pts, w] of PATHS) for (let i = 0; i < pts.length - 1; i++) if (segDist(x, z, pts[i], pts[i + 1]) < w / 2 + 0.35) return false;
        if (((x - POND.x) / (POND.rx + 0.7)) ** 2 + ((z - POND.z) / (POND.rz + 0.7)) ** 2 < 1) return false;
        if (Math.hypot(x - GAZEBO.x, z - GAZEBO.z) < GAZEBO.r + 0.9) return false;
        if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + 0.3) return false;
        if (Math.hypot(x - TREE.x, z - TREE.z) < 0.9) return false;
        if (Math.abs(x - SWING.x) < 0.8 && Math.abs(z - SWING.z) < 2.4) return false;
        if (Math.abs(x - BLANKET.x) < BLANKET.w / 2 + 0.5 && Math.abs(z - BLANKET.z) < BLANKET.d / 2 + 0.6) return false;
        if (Math.abs(x - CLOUD_SPOT.x) < 1.2 && Math.abs(z - CLOUD_SPOT.z) < 1.6) return false;
        if (Math.abs(x - FEED.x) < 0.9 && Math.abs(z - FEED.z) < 1.3) return false;
        if (roseBushes.some((b) => Math.hypot(x - b.x, z - b.z) < b.rad + 0.25)) return false;
        return true;
      };
      let placed = 0;
      for (let tries = 0; tries < 2000 && placed < 120; tries++) {
        const x = -10.2 + r() * 20.4;
        const z = -8.0 + r() * 15.6;
        if (!clear(x, z)) continue;
        const cluster = Math.sin(x * 0.7) * Math.cos(z * 0.6) + Math.sin(x * 0.23 + z * 0.31);
        if (cluster < 0.1 && r() > 0.3) continue;
        garden.flower(x, 0, z, r() < 0.55 ? 'daisy' : 'pom', ['#ffffff', '#ffffff', '#ffd75e', '#ff9eb5', '#c7a6ff'][Math.floor(r() * 5)], 0.08 + r() * 0.08, 0.8);
        placed++;
      }
    }
    // A little sign on the cloud-watching lawn
    {
      const cloudTex = canvasTexture(256, 160, (c, w, h) => {
        c.fillStyle = '#bfe6f5';
        c.beginPath();
        c.roundRect?.(8, 8, w - 16, h - 16, 26);
        if (!c.roundRect) c.rect(8, 8, w - 16, h - 16);
        c.fill();
        c.fillStyle = '#ffffff';
        for (const [x, y, rr] of [[96, 92, 30], [132, 74, 38], [170, 94, 28], [128, 104, 30]]) {
          c.beginPath();
          c.arc(x, y, rr, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = '#ff8fb1';
        c.beginPath();
        c.moveTo(196, 40);
        c.bezierCurveTo(186, 28, 170, 40, 196, 60);
        c.bezierCurveTo(222, 40, 206, 28, 196, 40);
        c.fill();
      });
      const sx = CLOUD_SPOT.x - 1.6;
      const sz = CLOUD_SPOT.z - 0.4;
      add(at(box(0.08, 1.0, 0.08, '#9b6a43'), sx, 0.5, sz));
      add(at(rbox(0.72, 0.48, 0.06, '#c98f5f', 0.03), sx, 1.12, sz));
      add(rot(at(panel(0.64, 0.4, cloudTex), sx, 1.12, sz + 0.035), 0, 0, 0));
      colliders.push({ type: 'circle', x: sx, z: sz, r: 0.1 });
    }

    for (const im of garden.build()) dyn(im);
    add(vcMesh(merge(vcParts), { rough: 0.85 }));
    colorBake(g, dynamic);

    // ---------------------------------------------------------- scenes
    const timers = [];
    const later = (sec, fn) => timers.push({ t: sec, fn });
    const nm = (a) => a.kid.name;
    const tmp = new THREE.Vector3();
    const headOf = (a, up = 1.65) => tmp.copy(a.kid.root.position).setY(a.kid.root.position.y + up);
    let scene = null;
    let gift = null; // { obj, prev } while the player carries a bouquet
    let given = null; // { obj, t } while the partner holds one
    const begin = (a, spec, def) => {
      a.activity({ ...spec, onEnd: () => finish() });
      scene = { k: 0, a, done: {}, ...def };
      return scene;
    };
    function finish() {
      if (!scene) return;
      const s = scene;
      scene = null;
      s.cleanup?.();
    }
    const once = (s, key, fn) => {
      if (!s.done[key]) {
        s.done[key] = true;
        fn();
      }
    };

    // Have a picnic
    function picnic(a) {
      if (scene) return;
      const BL = BLANKET;
      const s = begin(
        a,
        {
          label: 'Pack up',
          seats: [
            { who: 'player', x: BL.x - 0.8, z: BL.z - 0.32, y: -0.24, yaw: 1.05, pose: 'sit' },
            { who: 'partner', x: BL.x + 0.8, z: BL.z - 0.32, y: -0.24, yaw: -1.05, pose: 'sit' },
          ],
          focus: { x: BL.x, z: BL.z - 0.2, y: 0.5, zoom: 0.48 },
          exit: { x: BL.x - 0.4, z: BL.z + 1.4 },
        },
        { kind: 'picnic', heartT: 4, line: 0 },
      );
      S.pop();
      foods.forEach((f, i) => {
        f.t0 = 0.6 + i * 0.42;
        f.k = 0;
      });
      s.step = (dt) => {
        s.k += dt;
        const open = Math.min(1, s.k / 0.5);
        for (const { lid, s: side } of lids) lid.rotation.z = side * open * 1.9;
        for (const f of foods) {
          if (!f.obj) continue;
          if (s.k < f.t0) continue;
          f.obj.visible = true;
          const k = Math.min(1, (s.k - f.t0) / 0.45);
          if (f.k === 0) {
            S.pop();
            a.fx.burst(a.world(BL.x + f.x, BL.z + f.z, 0.3), ['#ffd166', '#ffffff', '#ff8fb1'], 4);
          }
          f.k = k;
          const e = k < 1 ? 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2) : 1;
          f.obj.scale.setScalar(e * f.s);
        }
        const P = nm(a.player);
        const Q = nm(a.partner);
        const lines = [
          a.playerId === 'roji' ? `Homama packed Roji's favourite sandwich, cut into little hearts.` : `Roji packed Homama's favourite sandwich, cut into little hearts.`,
          `Roji says strawberries are full of vitamin C. <b>Doctor's orders!</b>`,
          `Homama wrote a tiny app just to plan this picnic. It says: <b>perfect day</b>.`,
          `A butterfly lands on ${P}'s cookie. ${Q} laughs.`,
          `${P} and ${Q} clink their juice glasses. <b>Cheers!</b>`,
        ];
        if (s.k > 3.2 + s.line * 5.5 && s.line < lines.length) {
          a.toast(lines[s.line], 3600);
          s.line++;
        }
        s.heartT -= dt;
        if (s.heartT <= 0) {
          s.heartT = 4.5 + Math.random() * 2;
          a.fx.heartsAt(headOf(Math.random() < 0.5 ? a.player : a.partner, 1.25), 3);
        }
      };
      s.arms = (t) => {
        // A little bite now and then
        const kp = a.player.kid;
        const kq = a.partner.kid;
        const bite = (kid, ph) => {
          const w = Math.max(0, Math.sin(t * 0.9 + ph));
          if (w > 0.6) kid.arms[1].rotation.set(-1.9 - (w - 0.6) * 1.5, 0, -0.35);
        };
        bite(kp, 0);
        bite(kq, 2.4);
      };
      s.cleanup = () => {
        for (const f of foods) {
          if (f.obj) {
            f.obj.visible = false;
            f.obj.scale.setScalar(0);
          }
          f.k = 0;
        }
        for (const { lid } of lids) lid.rotation.z = 0;
        a.fx.poof(a.world(BL.x, BL.z));
      };
    }

    // Swing on the swing: the player swings, the partner pushes
    const D = SWING.L + 0.24;
    function swingOn(a) {
      if (scene) return;
      const s = begin(
        a,
        {
          label: 'Hop off',
          seats: [
            { who: 'player', x: SWING.x, z: SWING.z, y: SWING.y - D, yaw: 0, pose: 'sit' },
            { who: 'partner', x: SWING.x + 0.3, z: SWING.z - 0.9, y: 0, yaw: -0.15, pose: 'stand' },
          ],
          focus: { x: SWING.x, z: SWING.z + 0.2, y: 1.3, zoom: 0.62 },
          exit: { x: SWING.x - 0.4, z: SWING.z + 1.3 },
        },
        { kind: 'swing', A: 0.16, th: 0, pushes: 0, pz: SWING.z - 0.9, push: 0 },
      );
      a.toast(`${nm(a.partner)} gives ${nm(a.player)} a gentle push. <b>Whee!</b>`, 2600);
      s.step = (dt) => {
        s.k += dt;
        const prev = s.th;
        s.th += dt * Math.sqrt(9.8 / SWING.L);
        const T = Math.PI * 2;
        // Push at the back of each swing
        if (Math.floor((prev - Math.PI * 1.5) / T) !== Math.floor((s.th - Math.PI * 1.5) / T) && s.k > 0.5) {
          s.A = Math.min(0.58, s.A + 0.09);
          s.pushes++;
          s.push = 0.45;
          S.swish();
          a.partner.kid.squash = 1.12;
          if (s.pushes === 3) a.toast(`Higher! ${nm(a.player)} can almost touch the leaves.`, 2400);
        }
        // Whee at the front of each big swing
        if (Math.floor((prev - Math.PI * 0.5) / T) !== Math.floor((s.th - Math.PI * 0.5) / T) && s.A > 0.4) {
          if (Math.random() < 0.5) S.whee();
          if (Math.random() < 0.35) a.fx.heartsAt(headOf(a.player, 1.3), 2);
        }
        s.push = Math.max(0, s.push - dt);
        s.ang = s.A * Math.sin(s.th);
        const want = SWING.z - D * Math.sin(s.A) - 0.6;
        s.pz += (want - s.pz) * (1 - Math.exp(-3 * dt));
      };
      s.arms = () => {
        const ang = s.ang || 0;
        swing.rotation.x = -ang;
        const kp = a.player.kid;
        kp.root.position.copy(a.world(SWING.x, SWING.z + D * Math.sin(ang), SWING.y - D * Math.cos(ang)));
        kp.root.rotation.set(-ang, 0, 0);
        kp.arms[0].rotation.set(0, 0, 2.88);
        kp.arms[1].rotation.set(0, 0, -2.88);
        kp.legs[0].rotation.x = kp.legs[1].rotation.x = -1.5 + ang * 0.9;
        const kq = a.partner.kid;
        const pz = s.pz + (s.push > 0 ? Math.sin((s.push / 0.45) * Math.PI) * 0.18 : 0);
        a.partner.pos.copy(a.world(SWING.x + 0.3, pz));
        kq.root.position.copy(a.world(SWING.x + 0.3, pz, 0));
        kq.root.rotation.set(0, -0.15, 0);
        if (s.push > 0 || Math.sin(s.th) < -0.7) {
          kq.arms[0].rotation.set(-1.45, 0, -0.25);
          kq.arms[1].rotation.set(-1.45, 0, 0.25);
        }
      };
      s.cleanup = () => {
        swing.rotation.x = 0;
      };
    }

    // Feed the ducks
    function throwCrumbs(a, n) {
      const yaw = 1.2;
      const from = new THREE.Vector3(FEED.x + Math.sin(yaw) * 0.35, 1.05, FEED.z + Math.cos(yaw) * 0.35);
      for (let i = 0; i < n; i++) {
        const c = crumbs[crumbNext];
        crumbNext = (crumbNext + 1) % CRUMBS;
        const tx = 3.95 + Math.random() * 0.9;
        const tz = -1.0 + Math.random() * 1.2;
        const T = 0.55 + Math.random() * 0.15;
        c.p.copy(from);
        c.v.set((tx - from.x) / T, (POND.y + 0.02 - from.y + 0.5 * 9.8 * T * T) / T, (tz - from.z) / T);
        c.alive = true;
        c.floating = false;
        c.life = 9;
      }
      S.swish();
    }
    function feed(a) {
      if (scene) return;
      const s = begin(
        a,
        {
          label: 'Step back',
          seats: [
            { who: 'player', x: FEED.x, z: FEED.z, y: 0, yaw: 1.2, pose: 'stand' },
            { who: 'partner', x: FEED.x - 0.55, z: FEED.z + 0.75, y: 0, yaw: 1.0, pose: 'stand' },
          ],
          focus: { x: FEED.x + 1.1, z: FEED.z - 0.3, y: 0.7, zoom: 0.52 },
          exit: { x: FEED.x - 0.5, z: FEED.z + 0.6 },
        },
        { kind: 'feed', throws: [0.7, 2.3, 3.9, 5.5], thrown: 0, eaten: 0 },
      );
      a.toast(`${nm(a.player)} tosses some crumbs. <b>Quack quack!</b>`, 2400);
      S.quack(0.1);
      S.quack(0.3, 1.1);
      s.step = (dt) => {
        s.k += dt;
        if (s.thrown < s.throws.length && s.k > s.throws[s.thrown]) {
          throwCrumbs(a, 4);
          s.thrown++;
        }
        if (s.k > 3.2) once(s, 'cheer', () => a.emote('partner', 'cheer'));
        const left = crumbs.some((c) => c.alive);
        if ((s.thrown === s.throws.length && !left && s.k > 7) || s.k > 16) {
          once(s, 'bye', () => {
            a.toast(`The ducks are full and happy. <b>Mama duck quacks a thank you.</b>`, 3000);
            S.quack(0, 0.9);
            S.quack(0.2, 0.9);
            a.fx.heartsAt(a.world(mama.pos.x, mama.pos.z, 0.6), 3);
            later(1.6, () => scene?.kind === 'feed' && a.endActivity());
          });
        }
      };
      s.arms = () => {
        const kp = a.player.kid;
        const last = s.throws[s.thrown - 1] ?? -9;
        const next = s.throws[s.thrown] ?? -9;
        let w = 0;
        if (s.k > next - 0.35 && s.k < next) w = -(s.k - (next - 0.35)) / 0.35;
        else if (s.k >= last && s.k < last + 0.3) w = 1 - (s.k - last) / 0.3;
        kp.arms[1].rotation.set(w < 0 ? 0.6 * -w : -0.4 - 1.6 * w, 0, -0.15);
      };
    }

    // Pick flowers, then give them away
    function pick(a) {
      if (gift) return;
      const P = a.localPos(a.player);
      let best = roseBushes[0];
      let bd = Infinity;
      for (const b of roseBushes) {
        const d = Math.hypot(b.x - P.x, b.z - P.z);
        if (d < bd) {
          bd = d;
          best = b;
        }
      }
      a.player.yaw = Math.atan2(best.x - P.x, best.z - P.z);
      a.emote('player', 'bow');
      S.pop();
      gift = { obj: null, prev: null, pending: true };
      later(0.9, () => {
        a.fx.burst(a.world(best.x, best.z, best.rad * 1.4), [best.color, '#ffffff', '#ff9eb5', '#6dbb58'], 16);
        Promise.resolve(props?.gift?.('flowers'))
          .then((o) => {
            if (!gift || !o) return;
            const wrap = new THREE.Group();
            wrap.add(o);
            wrap.scale.setScalar(1.25);
            wrap.position.y = -0.08;
            wrap.userData.parksBouquet = true;
            gift.obj = wrap;
            gift.prev = a.carry('player', wrap);
            gift.pending = false;
            a.player.yaw = 0.35;
            S.chime();
            a.toast(`${nm(a.player)} picks a bouquet of roses. <b>Who could they be for?</b>`, 2600);
          })
          .catch(() => {
            gift = null;
          });
      });
    }
    function give(a) {
      if (!gift?.obj) return;
      const obj = gift.obj;
      const prev = gift.prev;
      gift = null;
      a.carry('player', prev || null);
      if (given?.obj) a.partner.kid.carried === given.obj && a.carry('partner', null);
      a.partner.yaw = Math.atan2(a.player.pos.x - a.partner.pos.x, a.player.pos.z - a.partner.pos.z);
      a.carry('partner', obj);
      given = { obj, t: 30 };
      a.emote('partner', 'heart');
      a.emote('player', 'cheer');
      a.fx.heartsAt(headOf(a.partner), 6);
      S.chime();
      const Q = nm(a.partner);
      const P = nm(a.player);
      a.toast(a.partnerId === 'roji' ? `Roji loves the roses! <b>She gives ${P} a big hug.</b>` : `${Q} loves the roses! <b>He gives ${P} a big hug.</b>`, 3200);
    }

    // Watch the clouds: both lie on the grass and look up at heart-shaped clouds
    function watchClouds(a) {
      if (scene) return;
      const C = CLOUD_SPOT;
      const s = begin(
        a,
        {
          label: 'Sit up',
          seats: [
            { who: 'player', x: C.x - 0.34, z: C.z + 0.7, y: 0.3, yaw: 0, pose: 'stand', rot: [-Math.PI / 2, 0.12, 0] },
            { who: 'partner', x: C.x + 0.34, z: C.z + 0.7, y: 0.3, yaw: 0, pose: 'stand', rot: [-Math.PI / 2, -0.12, 0] },
          ],
          focus: { x: C.x + 0.4, z: C.z - 1.3, y: 2.3, zoom: 0.66 },
          exit: { x: C.x - 0.4, z: C.z + 1.3 },
        },
        { kind: 'clouds', seen: 0, next: 3.5 },
      );
      cloudGroup.visible = true;
      clouds.forEach((c, i) => {
        c.x = CLOUD_X0 + i * 1.45;
        c.k = 0;
        c.delay = i * 0.35;
      });
      a.toast(`${nm(a.player)} and ${nm(a.partner)} lie in the soft grass and look up.`, 2600);
      s.step = (dt) => {
        s.k += dt;
        if (s.k > s.next) {
          s.next += 6;
          const P = nm(a.player);
          const Q = nm(a.partner);
          const lines = [
            `${P} spots a cloud shaped like a heart.`,
            `${Q} says that one looks like ${P}'s smile.`,
            a.playerId === 'roji' ? `Roji finds a cloud shaped like a stethoscope. <b>Doctor cloud!</b>` : `Homama finds a cloud shaped like a laptop. <b>Cloud computing!</b>`,
            `Another heart. <b>The sky must know.</b>`,
          ];
          a.toast(lines[s.seen % lines.length], 3200);
          s.seen++;
          if (s.seen % 2 === 0) a.fx.heartsAt(a.world(C.x, C.z, 0.8), 3);
        }
      };
      s.arms = (t) => {
        const C2 = CLOUD_SPOT;
        const kp = a.player.kid;
        const kq = a.partner.kid;
        kp.root.position.copy(a.world(C2.x - 0.34, C2.z + 0.7, 0.3));
        kp.root.rotation.set(-Math.PI / 2, 0.12, 0);
        kq.root.position.copy(a.world(C2.x + 0.34, C2.z + 0.7, 0.3));
        kq.root.rotation.set(-Math.PI / 2, -0.12, 0);
        for (const k of [kp, kq]) {
          k.blob.visible = false;
          k.head.rotation.set(0.1, 0, 0);
        }
        kp.head.rotation.y = -0.2 + Math.sin(t * 0.5) * 0.1;
        kq.head.rotation.y = 0.2 + Math.sin(t * 0.4 + 1) * 0.1;
        // The player points at the clouds now and then; the partner has hands behind the head
        const point = Math.max(0, Math.sin(t * 0.7));
        kp.arms[1].rotation.set(-1.6 * Math.min(1, point * 2), 0, -0.2 + Math.sin(t * 3) * 0.05 * point);
        if (!kq.carried) {
          kq.arms[0].rotation.set(0, 0, 2.55);
          kq.arms[1].rotation.set(0, 0, -2.55);
        }
      };
      s.cleanup = () => {
        cloudGroup.visible = false;
        for (const k of [a.player.kid, a.partner.kid]) k.root.rotation.set(0, 0, 0);
      };
    }

    // ---------------------------------------------------------- per frame
    const m4 = new THREE.Matrix4();
    const q4 = new THREE.Quaternion();
    const e4 = new THREE.Euler();
    const v4 = new THREE.Vector3();
    const s4 = new THREE.Vector3();
    const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
    let quackT = 4;
    function update(dt, t, api2) {
      const a = api2 || api;
      for (let i = timers.length - 1; i >= 0; i--) {
        timers[i].t -= dt;
        if (timers[i].t <= 0) timers.splice(i, 1)[0].fn();
      }
      if (scene) scene.step?.(dt, t);
      // Ducks
      const food = crumbs;
      const env = {
        food,
        others: ducks,
        onEat: (d) => {
          S.quack(0, d.kind === 'duckling' ? 1.6 : 1);
          if (d.kind === 'duckling') S.peep(0.05);
        },
      };
      mama.update(dt, t, { ...env, leader: null });
      papa.update(dt, t, { ...env, leader: null });
      babies.forEach((b, i) => b.update(dt, t, { ...env, leader: mama, slot: i }));
      quackT -= dt;
      if (quackT <= 0) {
        quackT = 5 + Math.random() * 7;
        const pl = a.localPos(a.player);
        if (Math.hypot(pl.x - POND.x, pl.z - POND.z) < 7) {
          if (Math.random() < 0.5) S.quack(0, 1);
          else S.peep();
        }
      }
      // Crumbs: fly, splash, float, sink
      crumbs.forEach((c, i) => {
        if (!c.alive) {
          crumbMesh.setMatrixAt(i, ZERO);
          return;
        }
        c.life -= dt;
        if (!c.floating) {
          c.v.y -= 9.8 * dt;
          c.p.addScaledVector(c.v, dt);
          if (c.p.y <= POND.y + 0.02) {
            c.p.y = POND.y + 0.02;
            c.floating = true;
            S.splash();
          }
        } else c.p.y = POND.y + 0.02 + Math.sin(t * 3 + i) * 0.005;
        if (c.life <= 0) c.alive = false;
        crumbMesh.setMatrixAt(i, c.alive ? m4.makeTranslation(c.p.x, c.p.y, c.p.z) : ZERO);
      });
      crumbMesh.instanceMatrix.needsUpdate = true;
      // Water sparkles drift
      const sp = g.userData.sparkTex;
      if (sp) sp.offset.set(t * 0.012, t * 0.007);
      // Butterflies gather round the picnic
      flutter.update(dt, t, scene?.kind === 'picnic' ? { x: BLANKET.x, z: BLANKET.z - 0.2, y: 0.9, r: 1.3 } : null);
      lights.update(t);
      // Clouds
      if (cloudGroup.visible) {
        for (const c of clouds) {
          if (c.delay > 0) {
            c.delay -= dt;
            continue;
          }
          c.x += dt * 0.32;
          if (c.x > CLOUD_X1) {
            c.x = CLOUD_X0;
            c.k = 0;
          }
          c.k = Math.min(1, c.k + dt * 0.6);
          const fade = Math.min(1, c.k, (CLOUD_X1 - c.x) / 1.2);
          const sc = c.s * Math.max(0, fade);
          const bobY = c.y + Math.sin(t * 0.6 + c.z * 3) * 0.08;
          if (c.heart) {
            m4.compose(v4.set(c.x, bobY, c.z), q4.setFromEuler(e4.set(-0.6, 0, Math.sin(t * 0.5 + c.x) * 0.08)), s4.set(sc, sc, sc));
            heartCloud.setMatrixAt(c.idx, m4);
          } else {
            const bits = [[0, 0, 0, 0.55], [0.55, -0.1, 0.1, 0.42], [-0.55, -0.12, 0.05, 0.4], [0.25, 0.28, -0.05, 0.38], [-0.25, 0.22, 0, 0.36], [0.95, -0.2, 0, 0.3]];
            bits.forEach(([dx, dy, dz, rr], j) => {
              m4.compose(v4.set(c.x + dx * c.s, bobY + dy * c.s, c.z + dz), q4.identity(), s4.setScalar(rr * sc));
              puffCloud.setMatrixAt(c.idx + j, m4);
            });
          }
        }
        heartCloud.instanceMatrix.needsUpdate = true;
        puffCloud.instanceMatrix.needsUpdate = true;
      }
      // The partner keeps the roses for a while, then tucks them away
      if (given) {
        given.t -= dt;
        const pl = a.localPos(a.partner);
        if (given.t <= 0 || Math.abs(pl.x) > 22 || Math.abs(pl.z) > 20) {
          if (a.partner.kid.carried === given.obj) {
            a.carry('partner', null);
            if (given.t <= 0) a.fx.poof(a.partner.pos);
          }
          given = null;
        }
      }
      if (gift && !gift.pending && gift.obj && a.player.kid.carried !== gift.obj) gift = null;
      if (scene) scene.arms?.(t);
    }

    const hotspots = [
      { x: BLANKET.x, z: BLANKET.z + 1.25, r: 1.4, label: 'Have a picnic', icon: 'basket', when: () => !scene, act: picnic },
      { x: SWING.x, z: SWING.z + 1.15, r: 1.25, label: 'Swing on the swing', icon: 'swing', when: () => !scene, act: swingOn },
      { x: FEED.x, z: FEED.z, r: 1.25, label: 'Feed the ducks', icon: 'duck', when: () => !scene, act: feed },
      { x: PICK.x, z: PICK.z, r: 1.4, label: 'Pick flowers', icon: 'flower', when: () => !scene && !gift, act: pick },
      {
        r: 1.6,
        label: (a) => `Give flowers to ${a.partner.kid.name}`,
        icon: 'heart',
        track: (a) => a.localPos(a.partner),
        when: () => !scene && !!gift?.obj,
        act: give,
      },
      { x: CLOUD_SPOT.x, z: CLOUD_SPOT.z + 1.15, r: 1.3, label: 'Watch the clouds', icon: 'cloud', when: () => !scene, act: watchClouds },
    ];

    // Handles for headless checks (dev.html)
    g.userData.picnic = { ducks, crumbs, foods, clouds, get scene() { return scene; }, get gift() { return gift; } };

    return { group: g, dynamic, colliders, hotspots, pad: { x: 0, z: ctx.size.d / 2 + 1.2 }, update };
  },
};
