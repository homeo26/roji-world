// Driving Lesson: Roji drives the little learner car round Abu Sanad's practice course.
// Point the stick, the arrows or the mouse where to go (like the car in town), hold the brake (E or the
// Brake button) to stop, Space honks. Six tasks in order, stars for smooth driving and a licence meter
// that fills over several lessons. Homama cheers at the roadside (or rides along when he is the player).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { damp, dampAngle, clamp, mat, umat, mesh, rng, bakeStatic, roundRect } from '../util.js';
import { Physics } from '../engine/physics.js';
import { C, kit, colorBake, bakeLiveKid, Atlas, signPost, makeTrafficLight, lightMats, setLight, makeCone, makeDuck, makeNora, learnerize, tree, addFlowers, paintText, drawWheelBadge, drawChibi, heartPath, ROJI_PHOTO } from '../places/driving/kit.js';

const MAX_SPEED = 6.4;
const ROAD_W = 4.6;
const RC = { x: 19, z: -10 }; // roundabout centre
const R_IN = 4.2;
const R_OUT = 9.2;
const R_LANE = 6.7;
const GATE_Z = 24;
const STOP_Z = 12;
const LIGHT_Z = 1;
const ZEBRA = { x0: 16.7, x1: 21.3, z0: 7.0, z1: 9.2 };
const DUCK_Z = 8.1;
const POND = { x: 26.8, z: 8.6, r: 1.6 };
const LOT = { x0: 10.5, x1: 28.5, z0: 20, z1: 33 };
const BAY = { x: 22.5, z: 29.4 };
const BAYS = [13.5, 16.5, 19.5, 22.5, 25.5];
const PARKED = [[13.5, C.lilac], [19.5, C.pink], [25.5, C.mint]];
const FENCE = { x0: -10, x1: 34, z0: -23, z1: 41 };
const START = { x: 0, z: 35, yaw: Math.PI };
const FRONT = 1.35; // car centre to bumper

const STAR = (on, s = 16) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" style="vertical-align:-2px"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z" fill="${on ? '#ffd166' : '#eadfd8'}" stroke="${on ? '#e0a83a' : '#d8cbc2'}" stroke-width="1.3" stroke-linejoin="round"/></svg>`;

const CSS = `
#arena .dl-layer { position: absolute; inset: 0; pointer-events: none; font-family: var(--font, 'Fredoka', system-ui, sans-serif); color: #3b2b3f; }
#arena .dl-list { position: absolute; top: calc(max(10px, env(safe-area-inset-top)) + 58px); left: max(12px, env(safe-area-inset-left)); background: rgba(255,250,244,.93); border-radius: 18px; padding: 10px 14px 10px 12px; box-shadow: 0 6px 18px rgba(60,30,40,.15); font-size: .86rem; min-width: 200px; }
#arena .dl-list h4 { margin: 0 0 6px; font-size: .9rem; color: #21a99a; }
#arena .dl-list ol { list-style: none; margin: 0; padding: 0; }
#arena .dl-list li { display: flex; align-items: center; gap: 8px; padding: 3px 6px; border-radius: 10px; color: #a8969f; transition: background .25s, color .25s; }
#arena .dl-list li i { flex: none; width: 16px; height: 16px; border-radius: 50%; border: 2px solid #e2d4cc; display: grid; place-items: center; font-style: normal; font-size: 11px; font-weight: 700; color: #fff; }
#arena .dl-list li.now { background: #fff1c2; color: #3b2b3f; font-weight: 700; }
#arena .dl-list li.now i { border-color: #f4a742; background: #ffd166; }
#arena .dl-list li.done { color: #3b2b3f; }
#arena .dl-list li.done i { border-color: #3fbf9f; background: #3fbf9f; }
#arena .dl-smooth { margin-top: 6px; padding-top: 6px; border-top: 1px dashed #ead9cf; display: flex; align-items: center; gap: 4px; font-size: .8rem; color: #7a6470; }
#arena .dl-smooth span { margin-left: auto; }
#arena .dl-say { position: absolute; left: 50%; bottom: calc(max(16px, env(safe-area-inset-bottom)) + 44px); transform: translateX(-50%); background: #fffaf4; border-radius: 20px; padding: 9px 16px; box-shadow: 0 8px 22px rgba(60,30,40,.18); font-size: 1rem; max-width: min(560px, 80vw); text-align: center; transition: opacity .25s, transform .25s; }
#arena .dl-say b { color: #21a99a; margin-right: 6px; }
#arena .dl-say.who-homama b { color: #3f7bf0; }
#arena .dl-say.hide { opacity: 0; transform: translateX(-50%) translateY(8px); }
#arena .dl-pop { position: absolute; left: 50%; top: 27%; transform: translate(-50%, -50%) scale(.6); font-weight: 700; font-size: clamp(1.3rem, 4vw, 2.3rem); color: #fff; text-shadow: 0 3px 0 rgba(0,0,0,.16), 0 8px 20px rgba(0,0,0,.22); opacity: 0; transition: opacity .18s, transform .25s cubic-bezier(.2,1.5,.4,1); white-space: nowrap; }
#arena .dl-pop.on { opacity: 1; transform: translate(-50%, -50%) scale(1); }
#arena .dl-lic { display: inline-flex; align-items: center; gap: 7px; font-size: .85rem; }
#arena .dl-lic i { display: block; width: clamp(60px, 11vw, 110px); height: 10px; border-radius: 99px; background: #f0e2d8; overflow: hidden; }
#arena .dl-lic i b { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #ffd166, #ef5b6f); transition: width .8s cubic-bezier(.2,1,.3,1); }
#arena .dl-card { position: absolute; left: 50%; top: 33%; transform: translate(-50%, -50%) scale(.4) rotate(-8deg); opacity: 0; transition: transform .6s cubic-bezier(.2,1.5,.4,1), opacity .3s; background: #fffaf4; border-radius: 22px; padding: 10px; box-shadow: 0 20px 50px rgba(40,20,30,.35); }
#arena .dl-card.on { transform: translate(-50%, -50%) scale(1) rotate(-3deg); opacity: 1; }
#arena .dl-card canvas { display: block; width: min(340px, 40vw); height: auto; border-radius: 14px; }
#arena .dl-res { display: block; margin: 2px 0 10px; }
#arena .a-btn.dl-hot { animation: dl-hot .5s ease-in-out infinite alternate; }
@keyframes dl-hot { from { box-shadow: 0 0 0 0 rgba(255,209,102,.95), 0 6px 18px rgba(60,30,40,.2); } to { box-shadow: 0 0 0 12px rgba(255,209,102,0), 0 6px 18px rgba(60,30,40,.2); transform: scale(1.08); } }
#arena .dl-res .stars { display: flex; justify-content: center; gap: 6px; margin-bottom: 6px; }
#arena .dl-res .bar { display: block; width: 80%; margin: 8px auto 2px; height: 12px; border-radius: 99px; background: #f0e2d8; overflow: hidden; }
#arena .dl-res .bar b { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #ffd166, #ef5b6f); }
body.touch #arena .dl-say { bottom: max(12px, env(safe-area-inset-bottom)); max-width: 42vw; font-size: .82rem; padding: 7px 12px; }
@media (max-height: 520px) {
  #arena .dl-list { top: calc(max(8px, env(safe-area-inset-top)) + 50px); padding: 6px 10px 7px 8px; font-size: .7rem; min-width: 0; border-radius: 14px; }
  #arena .dl-list h4 { font-size: .74rem; margin-bottom: 3px; }
  #arena .dl-list li { padding: 1px 5px; gap: 6px; }
  #arena .dl-list li i { width: 12px; height: 12px; font-size: 9px; }
  #arena .dl-smooth { margin-top: 3px; padding-top: 3px; font-size: .68rem; }
  #arena .dl-pop { top: 30%; }
  #arena .dl-card { top: 27%; padding: 6px; border-radius: 16px; }
  #arena .dl-card canvas { width: min(250px, 30vw); border-radius: 11px; }
}
#arena .dl-list { transition: opacity .4s; }
#arena .dl-layer.party .dl-list { opacity: 0; }
`;

const TASKS = [
  { id: 'gate', label: 'Drive through the cone gate', say: 'Follow the arrow and drive through the cone gate.' },
  { id: 'stop', label: 'Stop at the stop line', say: 'Hold the brake and stop right at the white line.' },
  { id: 'light', label: 'Wait for the green light', say: 'The light is red. Stop at the line and wait for green.' },
  { id: 'round', label: 'Go round the roundabout', say: 'Go all the way round the roundabout, then take the exit by the ducks.' },
  { id: 'ducks', label: 'Let the ducks cross', say: 'Duck crossing! Stop before the stripes and let them cross.' },
  { id: 'park', label: 'Park in the bay', say: 'Last one! Park in the glowing bay, nice and straight.' },
];

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export default {
  id: 'drivinglesson',
  title: 'Driving Lesson',
  tagline: 'Six little tasks with Abu Sanad',

  async start(ctx) {
    const { scene, camera, hud, input, sound, fx } = ctx;
    const env = ctx.env.outdoor({ fog: [70, 190], shadow: 22 });
    const k = kit();
    const { box, rbox, cyl, sph, at } = k;
    const world = new THREE.Group();
    scene.add(world);
    const keep = []; // animated objects that must not be merged
    const physics = new Physics();
    const R = rng(21);
    const atlas = new Atlas(8, 4, 256);
    const cells = {};
    const flowers = [];
    const add = (o, x, y, z, ry = 0) => (at(o, x, y, z, ry), world.add(o), o);
    const timers = [];
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    const meIsRoji = ctx.me === 'roji';

    // ---------------------------------------------------------------- ground and roads
    const grass = mesh(new THREE.PlaneGeometry(160, 160), mat('#9ad06a', { rough: 0.95 }), { cast: false });
    grass.rotation.x = -Math.PI / 2;
    add(grass, 12, 0, 8);
    const samplePath = (segs) => {
      const pts = [];
      for (const s of segs) {
        if (s.arc) {
          const { cx, cz, r, a0, a1 } = s;
          const n = Math.ceil((Math.abs(a1 - a0) * r) / 0.5);
          for (let i = pts.length ? 1 : 0; i <= n; i++) {
            const a = a0 + ((a1 - a0) * i) / n;
            pts.push(new THREE.Vector3(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r));
          }
        } else {
          const [ax, az, bx, bz] = s;
          const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5);
          for (let i = pts.length ? 1 : 0; i <= n; i++) pts.push(new THREE.Vector3(ax + ((bx - ax) * i) / n, 0, az + ((bz - az) * i) / n));
        }
      }
      return pts;
    };
    const road1 = samplePath([[0, 39, 0, -2], { arc: true, cx: 8, cz: -2, r: 8, a0: Math.PI, a1: Math.PI * 1.5 }, [8, -10, 11, -10]]);
    const road2 = samplePath([[19, -1.5, 19, 21]]);
    const roadTex = (() => {
      const cv = document.createElement('canvas');
      cv.width = 256;
      cv.height = 128;
      const c = cv.getContext('2d');
      c.fillStyle = '#bcb3ca';
      c.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 500; i++) {
        c.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(70,60,95,0.07)';
        c.fillRect(R() * 256, R() * 128, 3, 3);
      }
      c.fillStyle = '#fffaf0';
      c.fillRect(0, 4, 256, 5);
      c.fillRect(0, 119, 256, 5);
      c.fillRect(0, 61, 128, 6);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = THREE.RepeatWrapping;
      t.anisotropy = 8;
      return t;
    })();
    const ribbon = (pts, width, y, uvLen = 4) => {
      const pos = [];
      const uv = [];
      const nrm = [];
      const idx = [];
      let s = 0;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const a = pts[Math.max(0, i - 1)];
        const b = pts[Math.min(pts.length - 1, i + 1)];
        let tx = b.x - a.x;
        let tz = b.z - a.z;
        const l = Math.hypot(tx, tz) || 1;
        tx /= l;
        tz /= l;
        if (i) s += p.distanceTo(pts[i - 1]);
        pos.push(p.x - tz * width * 0.5, y, p.z + tx * width * 0.5, p.x + tz * width * 0.5, y, p.z - tx * width * 0.5);
        uv.push(s / uvLen, 1, s / uvLen, 0);
        nrm.push(0, 1, 0, 0, 1, 0);
        if (i) {
          const q = (i - 1) * 2;
          idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      return g;
    };
    const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.9 });
    const curbMat = mat('#efe6da', { rough: 0.9 });
    for (const pts of [road1, road2]) {
      world.add(mesh(ribbon(pts, ROAD_W + 0.8, 0.02), curbMat, { cast: false }));
      world.add(mesh(ribbon(pts, ROAD_W, 0.03), roadMat, { cast: false }));
    }
    // Roundabout: painted ring, lane dashes and arrows going anticlockwise
    const ringTex = (() => {
      const S = 1024;
      const cv = document.createElement('canvas');
      cv.width = cv.height = S;
      const c = cv.getContext('2d');
      const px = S / (R_OUT * 2);
      const X = (x) => S / 2 + x * px;
      c.fillStyle = '#efe6da';
      c.beginPath();
      c.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#bcb3ca';
      c.beginPath();
      c.arc(S / 2, S / 2, (R_OUT - 0.4) * px, 0, Math.PI * 2);
      c.fill();
      for (let i = 0; i < 2600; i++) {
        c.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(70,60,95,0.07)';
        c.fillRect(R() * S, R() * S, 3, 3);
      }
      c.strokeStyle = '#fffaf0';
      c.lineWidth = 0.12 * px;
      c.beginPath();
      c.arc(S / 2, S / 2, (R_OUT - 0.6) * px, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([0.9 * px, 0.7 * px]);
      c.beginPath();
      c.arc(S / 2, S / 2, R_LANE * px, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      for (let i = 0; i < 6; i++) {
        const th = (i / 6) * Math.PI * 2 + 0.5;
        const r = (R_LANE + R_IN) / 2 + 0.3;
        c.save();
        c.translate(X(Math.cos(th) * r), X(Math.sin(th) * r));
        c.rotate(Math.atan2(-Math.cos(th), Math.sin(th)));
        c.fillStyle = '#fffaf0';
        c.fillRect(-0.7 * px, -0.12 * px, 0.8 * px, 0.24 * px);
        c.beginPath();
        c.moveTo(0.6 * px, 0);
        c.lineTo(0.05 * px, -0.42 * px);
        c.lineTo(0.05 * px, 0.42 * px);
        c.fill();
        c.restore();
      }
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    })();
    const ringDisc = mesh(new THREE.CircleGeometry(R_OUT, 64), new THREE.MeshStandardMaterial({ map: ringTex, roughness: 0.9 }), { cast: false });
    ringDisc.rotation.x = -Math.PI / 2;
    add(ringDisc, RC.x, 0.04, RC.z);
    // The island: a raised round garden with a tree and a fountain of flowers
    add(cyl(R_IN, R_IN + 0.1, 0.34, C.cream, 40), RC.x, 0.17, RC.z);
    add(cyl(R_IN - 0.25, R_IN - 0.25, 0.04, C.leaf, 40), RC.x, 0.35, RC.z);
    add(tree(k, 1.0, 0), RC.x - 0.4, 0.34, RC.z - 0.3);
    add(tree(k, 0.7, 2), RC.x + 1.6, 0.34, RC.z + 1.1);
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      flowers.push([RC.x + Math.cos(a) * (R_IN - 0.55), 0.35, RC.z + Math.sin(a) * (R_IN - 0.55), i % 6, 1.1]);
      if (i % 2) flowers.push([RC.x + Math.cos(a + 0.05) * (R_IN - 1.1), 0.35, RC.z + Math.sin(a + 0.05) * (R_IN - 1.1), (i + 3) % 6, 1]);
    }
    physics.add({ type: 'circle', x: RC.x, z: RC.z, r: R_IN + 0.05 });
    // Car park
    const LW = LOT.x1 - LOT.x0;
    const LD = LOT.z1 - LOT.z0;
    const lotTex = (() => {
      const W = 1024;
      const H = Math.round((W * LD) / LW);
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const c = cv.getContext('2d');
      const sx = W / LW;
      const X = (x) => (x - LOT.x0) * sx;
      const Z = (z) => (z - LOT.z0) * sx;
      c.fillStyle = '#efe6da';
      c.fillRect(0, 0, W, H);
      c.fillStyle = '#bcb3ca';
      roundRect(c, 0.4 * sx, 0.4 * sx, W - 0.8 * sx, H - 0.8 * sx, 1.2 * sx);
      c.fill();
      for (let i = 0; i < 2400; i++) {
        c.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(70,60,95,0.07)';
        c.fillRect(R() * W, R() * H, 3, 3);
      }
      c.fillStyle = '#fffaf0';
      for (let i = 0; i <= BAYS.length; i++) c.fillRect(X(12 + i * 3) - 0.06 * sx, Z(27), 0.12 * sx, 4.8 * sx);
      c.fillRect(X(12), Z(27) - 0.06 * sx, 15 * sx, 0.12 * sx);
      paintText(c, 'P', X(15), Z(23.4), 2.6 * sx, 'rgba(255,250,240,0.9)');
      c.fillStyle = 'rgba(255,250,240,0.9)';
      const arrow = (x, z, ang) => {
        c.save();
        c.translate(X(x), Z(z));
        c.rotate(ang);
        c.fillRect(-0.7 * sx, -0.12 * sx, 0.8 * sx, 0.24 * sx);
        c.beginPath();
        c.moveTo(0.6 * sx, 0);
        c.lineTo(0.05 * sx, -0.42 * sx);
        c.lineTo(0.05 * sx, 0.42 * sx);
        c.fill();
        c.restore();
      };
      arrow(21.5, 23.5, 0);
      arrow(24.5, 23.5, 0);
      c.fillStyle = 'rgba(239,91,111,0.85)';
      heartPath(c, X(BAY.x), Z(31.2), 0.4 * sx);
      c.fill();
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    })();
    const lot = mesh(new THREE.PlaneGeometry(LW, LD), new THREE.MeshStandardMaterial({ map: lotTex, roughness: 0.9 }), { cast: false });
    lot.rotation.x = -Math.PI / 2;
    add(lot, (LOT.x0 + LOT.x1) / 2, 0.035, (LOT.z0 + LOT.z1) / 2);
    // Road paint: stop line, light line, zebra stripes and painted words
    const white = mat('#fffaf0', { rough: 0.8 });
    add(mesh(new THREE.BoxGeometry(ROAD_W, 0.012, 0.36), white, { cast: false }), 0, 0.04, STOP_Z);
    add(mesh(new THREE.BoxGeometry(ROAD_W, 0.012, 0.36), white, { cast: false }), 0, 0.04, LIGHT_Z);
    for (let i = 0; i < 6; i++) add(mesh(k.geo('zebra', () => new THREE.BoxGeometry(0.46, 0.012, ZEBRA.z1 - ZEBRA.z0)), white, { cast: false }), ZEBRA.x0 + 0.2 + i * 0.84, 0.04, (ZEBRA.z0 + ZEBRA.z1) / 2);
    for (let i = 0; i < 6; i++) add(mesh(k.geo('give', () => new THREE.BoxGeometry(0.45, 0.012, 0.2)), white, { cast: false }), 17.0 + i * 0.8, 0.04, 6.3);
    cells.stopWord = atlas.add((c, w, h) => paintText(c, 'STOP', w / 2, h / 2 + 4, h * 0.5, '#fffaf0'), 2);
    cells.slowWord = atlas.add((c, w, h) => paintText(c, 'SLOW', w / 2, h / 2 + 4, h * 0.5, '#fffaf0'), 2);
    const word = (cell, x, z) => {
      const p = atlas.plane(2.6, 1.3, cell);
      p.rotation.x = -Math.PI / 2;
      add(p, x, 0.045, z);
    };
    word(cells.stopWord, 0, 13.6);
    word(cells.slowWord, 19, 3.6);

    // ---------------------------------------------------------------- signs, light, gate, ducks' home
    const lampMats = lightMats(umat);
    setLight(lampMats, 'red');
    add(makeTrafficLight(k, lampMats, { pole: 2.3 }), 3.1, 0, LIGHT_Z + 0.2);
    physics.add({ type: 'circle', x: 3.1, z: LIGHT_Z + 0.2, r: 0.2 });
    const signs = [
      ['stop', 3.0, STOP_Z + 0.4, 0.78, 1.5],
      ['roundabout', -3.1, 1.4, 0.68, 1.5],
      ['duck', 15.6, 4.6, 0.72, 1.5],
      ['zebra', 22.5, 5.4, 0.6, 1.5],
      ['parking', 11.6, 19.0, 0.62, 1.6],
      ['speed20', -3.0, 30.0, 0.6, 1.5],
      ['lights', -3.0, 7.0, 0.66, 1.5],
    ];
    for (const [kind, x, z, s, p] of signs) {
      add(signPost(k, atlas, cells, kind, { size: s, post: p }), x, 0, z);
      physics.add({ type: 'circle', x, z, r: 0.15 });
    }
    // Balloon arch over the cone gate
    const arch = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 14, 10), new THREE.MeshStandardMaterial({ roughness: 0.35 }), 25);
    const m4 = new THREE.Matrix4();
    const tmpC = new THREE.Color();
    const archCols = [C.rose, C.sun, C.sky, C.mint, C.pink, C.white];
    for (let i = 0; i < 25; i++) {
      const a = (i / 24) * Math.PI;
      m4.makeTranslation(Math.cos(a) * 3.3, 0.25 + Math.sin(a) * 3.4, GATE_Z);
      arch.setMatrixAt(i, m4);
      arch.setColorAt(i, tmpC.set(archCols[i % archCols.length]));
    }
    arch.castShadow = true;
    world.add(arch);
    cells.gateWord = atlas.add((c, w, h) => {
      c.fillStyle = '#ffffff';
      roundRect(c, 4, 50, w - 8, h - 100, 50);
      c.fill();
      paintText(c, 'Cone gate', w / 2, h / 2 + 4, h * 0.24, C.rose);
    }, 2);
    add(atlas.plane(1.6, 0.8, cells.gateWord, { cast: true }), 0, 3.75, GATE_Z + 0.32);
    // The start board
    cells.startBoard = atlas.add((c, w, h) => {
      c.fillStyle = '#ffffff';
      roundRect(c, 4, 4, w - 8, h - 8, 40);
      c.fill();
      c.lineWidth = 10;
      c.strokeStyle = C.sunDeep;
      c.stroke();
      drawWheelBadge(c, 90, h / 2, 54);
      paintText(c, 'Little Wheels', w * 0.6, h * 0.38, h * 0.26, C.teal);
      paintText(c, 'PRACTICE COURSE', w * 0.6, h * 0.7, h * 0.14, C.ink, 600);
    }, 3);
    const board = new THREE.Group();
    board.add(at(rbox(3.2, 1.2, 0.12, C.woodDark, 0.05), 0, 1.6, -0.07));
    board.add(at(atlas.plane(3.0, 1.0, cells.startBoard), 0, 1.6, 0.0));
    for (const s of [-1, 1]) board.add(at(box(0.14, 1.6, 0.14, C.woodDark), s * 1.2, 0.8, -0.1));
    add(board, -4.6, 0, 36.2, 0.3);
    physics.add({ type: 'box', x: -4.6, z: 36.1, hw: 1.5, hd: 0.3 });
    // Ducks' little house and pond
    const hut = new THREE.Group();
    hut.add(at(rbox(1.3, 0.9, 1.0, C.peach, 0.06), 0, 0.45, 0));
    for (const s of [-1, 1]) {
      const r = rbox(0.9, 0.08, 1.2, C.rose, 0.03);
      r.rotation.z = s * -0.6;
      hut.add(at(r, s * 0.34, 1.08, 0));
    }
    const hole = at(cyl(0.24, 0.24, 0.04, C.ink, 16), 0, 0.42, 0.5);
    hole.rotation.x = Math.PI / 2;
    hut.add(hole);
    hut.add(at(k.heart(0.18, 0.03, C.white), 0, 0.72, 0.52));
    add(hut, 13.4, 0, 9.6, 0.4);
    physics.add({ type: 'circle', x: 13.4, z: 9.6, r: 0.8 });
    add(cyl(POND.r + 0.25, POND.r + 0.3, 0.2, C.cream, 28), POND.x, 0.1, POND.z);
    add(cyl(POND.r, POND.r, 0.04, '#7fcfe0', 28, { rough: 0.15 }), POND.x, 0.19, POND.z);
    for (const [a, rr] of [[0.5, 1.0], [2.6, 0.8], [4.4, 1.1]]) add(cyl(0.22, 0.22, 0.02, C.leaf, 12), POND.x + Math.cos(a) * rr, 0.215, POND.z + Math.sin(a) * rr);
    physics.add({ type: 'circle', x: POND.x, z: POND.z, r: POND.r + 0.25 });
    // Parked cars in the other bays
    for (const [x, colr] of PARKED) {
      const pc = ctx.models.car(colr);
      pc.root.position.set(x, 0, BAY.z);
      pc.update(0, 0);
      world.add(pc.root);
      physics.add({ type: 'box', x, z: BAY.z, hw: 0.86, hd: 1.42 });
    }
    // A low flower border behind the bays (low, so the camera sees over it) with round bushes at the ends
    add(rbox(LW - 0.4, 0.22, 0.7, C.cream, 0.06), (LOT.x0 + LOT.x1) / 2, 0.11, LOT.z1 + 0.45);
    add(box(LW - 0.7, 0.04, 0.5, '#9a6a45'), (LOT.x0 + LOT.x1) / 2, 0.23, LOT.z1 + 0.45);
    for (let x = LOT.x0 + 0.5; x < LOT.x1 - 0.4; x += 0.28) flowers.push([x, 0.24, LOT.z1 + 0.45 + (R() - 0.5) * 0.3, Math.floor(R() * 7), 1.1]);
    for (const x of [LOT.x0 - 0.6, LOT.x1 + 0.6]) {
      const b = sph(0.7, C.leaf, { rough: 0.9 }, 12);
      b.scale.set(1.1, 0.85, 1);
      add(b, x, 0.5, LOT.z1 + 0.4);
    }
    physics.add({ type: 'box', x: (LOT.x0 + LOT.x1) / 2, z: LOT.z1 + 0.45, hw: LW / 2, hd: 0.35 });
    // Bay highlight
    const glowMat = new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.8, depthWrite: false });
    const bayGlow = new THREE.Group();
    for (const [w, d, x, z] of [[3.0, 0.16, 0, -2.4], [3.0, 0.16, 0, 2.4], [0.16, 4.8, -1.5, 0], [0.16, 4.8, 1.5, 0]]) bayGlow.add(at(mesh(new THREE.BoxGeometry(w, 0.02, d), glowMat, { cast: false }), x, 0.06, z));
    const bayFill = mesh(new THREE.PlaneGeometry(2.9, 4.7), new THREE.MeshBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0.25, depthWrite: false }), { cast: false });
    bayFill.rotation.x = -Math.PI / 2;
    bayGlow.add(at(bayFill, 0, 0.055, 0));
    add(bayGlow, BAY.x, 0, BAY.z);
    keep.push(bayGlow);
    // Zone strip (stop here) moved per task
    // A soft "stop here" box: dashed sun-yellow outline and a pale fill
    const zoneTex = (() => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 256;
      const c = cv.getContext('2d');
      c.fillStyle = 'rgba(255,244,190,0.55)';
      c.fillRect(0, 0, 256, 256);
      c.strokeStyle = '#ffd166';
      c.lineWidth = 18;
      c.setLineDash([34, 22]);
      c.strokeRect(9, 9, 238, 238);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const zoneMat = new THREE.MeshBasicMaterial({ map: zoneTex, transparent: true, opacity: 0.9, depthWrite: false });
    const zone = mesh(new THREE.PlaneGeometry(1, 1), zoneMat, { cast: false });
    zone.rotation.x = -Math.PI / 2;
    zone.visible = false;
    world.add(zone);
    keep.push(zone);
    const showZone = (x, z0, z1, w = ROAD_W - 0.3) => {
      zone.visible = true;
      zone.position.set(x, 0.05, (z0 + z1) / 2);
      zone.scale.set(w, Math.abs(z1 - z0), 1);
    };

    // ---------------------------------------------------------------- cones (knockable, one instanced mesh)
    const coneProto = makeCone(k);
    const coneBaked = colorBake(coneProto)[0];
    const CONES = [
      [-2.5, GATE_Z - 1], [-2.5, GATE_Z], [-2.5, GATE_Z + 1], [2.5, GATE_Z - 1], [2.5, GATE_Z], [2.5, GATE_Z + 1],
      [-2.6, STOP_Z - 1.2], [2.6, STOP_Z - 2.2], [-2.6, 18], [2.6, 18],
      [16.3, 14], [21.7, 14], [16.3, 18], [21.7, 18],
      [20.7, 27.0], [24.3, 27.0],
    ].map(([x, z]) => ({ x, z, vx: 0, vz: 0, tip: 0, tipDir: 0, ry: R() * 6, hit: false, y: 0, vy: 0 }));
    const cones = new THREE.InstancedMesh(coneBaked.geometry, coneBaked.material, CONES.length);
    cones.castShadow = true;
    cones.receiveShadow = true;
    world.add(cones);
    keep.push(cones);
    const cq = new THREE.Quaternion();
    const ce = new THREE.Euler();
    const cv3 = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    const drawCones = () => {
      CONES.forEach((c, i) => {
        ce.set(c.tip * Math.cos(c.tipDir), c.ry, c.tip * Math.sin(c.tipDir), 'YXZ');
        m4.compose(cv3.set(c.x, 0.04 + c.y + Math.sin(c.tip) * 0.18, c.z), cq.setFromEuler(ce), one);
        cones.setMatrixAt(i, m4);
      });
      cones.instanceMatrix.needsUpdate = true;
    };
    drawCones();

    // ---------------------------------------------------------------- fence, trees and flowers
    const posts = [];
    const fenceLine = (x0, z0, x1, z1) => {
      const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 1.2);
      for (let i = 0; i <= n; i++) posts.push([x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n]);
      const len = Math.hypot(x1 - x0, z1 - z0);
      for (const y of [0.32, 0.62]) {
        const rail = box(len, 0.08, 0.06, C.white);
        rail.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
        add(rail, (x0 + x1) / 2, y, (z0 + z1) / 2);
      }
    };
    fenceLine(FENCE.x0, FENCE.z0, FENCE.x1, FENCE.z0);
    fenceLine(FENCE.x1, FENCE.z0, FENCE.x1, FENCE.z1);
    fenceLine(FENCE.x0, FENCE.z1, FENCE.x1, FENCE.z1);
    fenceLine(FENCE.x0, FENCE.z0, FENCE.x0, FENCE.z1);
    const postGeo = new THREE.BoxGeometry(0.12, 0.85, 0.08);
    postGeo.translate(0, 0.42, 0);
    const postMesh = new THREE.InstancedMesh(postGeo, mat(C.white), posts.length);
    posts.forEach(([x, z], i) => postMesh.setMatrixAt(i, m4.makeTranslation(x, 0, z)));
    postMesh.castShadow = true;
    world.add(postMesh);
    for (const [x, z, hw, hd] of [[(FENCE.x0 + FENCE.x1) / 2, FENCE.z0, 23, 0.2], [(FENCE.x0 + FENCE.x1) / 2, FENCE.z1, 23, 0.2], [FENCE.x0, (FENCE.z0 + FENCE.z1) / 2, 0.2, 33], [FENCE.x1, (FENCE.z0 + FENCE.z1) / 2, 0.2, 33]]) physics.add({ type: 'box', x, z, hw, hd });

    const distTo = (pts, x, z) => {
      let best = Infinity;
      for (let i = 0; i < pts.length; i += 2) best = Math.min(best, (pts[i].x - x) ** 2 + (pts[i].z - z) ** 2);
      return Math.sqrt(best);
    };
    const onRoad = (x, z, pad = 0) =>
      distTo(road1, x, z) < ROAD_W / 2 + 0.5 + pad ||
      distTo(road2, x, z) < ROAD_W / 2 + 0.5 + pad ||
      Math.hypot(x - RC.x, z - RC.z) < R_OUT + 0.3 + pad ||
      (x > LOT.x0 - pad && x < LOT.x1 + pad && z > LOT.z0 - pad && z < LOT.z1 + pad);
    const blocked = (x, z) =>
      onRoad(x, z, 3.4) || Math.hypot(x - POND.x, z - POND.z) < POND.r + 1.5 || Math.hypot(x - 13.4, z - 9.6) < 2.2 || Math.hypot(x + 4.6, z - 36.2) < 2.5 || (x > -7 && x < -2 && z > 27 && z < 33);
    let placed = 0;
    for (let i = 0; i < 500 && placed < 56; i++) {
      const x = -16 + R() * 56;
      const z = -30 + R() * 78;
      if (blocked(x, z)) continue;
      const inside = x > FENCE.x0 + 1 && x < FENCE.x1 - 1 && z > FENCE.z0 + 1 && z < FENCE.z1 - 1;
      const nearFence = Math.min(Math.abs(x - FENCE.x0), Math.abs(x - FENCE.x1), Math.abs(z - FENCE.z0), Math.abs(z - FENCE.z1)) < 1.6;
      if (nearFence) continue;
      const s = 0.65 + R() * 0.4;
      add(tree(k, s, placed % 3, 11), x, 0, z);
      if (inside) physics.add({ type: 'circle', x, z, r: 0.3 * s });
      placed++;
    }
    for (let i = 0; i < 170; i++) {
      const x = -9 + R() * 42;
      const z = -22 + R() * 62;
      if (onRoad(x, z, 0.6)) continue;
      flowers.push([x, 0, z, Math.floor(R() * 7), 0.9 + R() * 0.4]);
    }
    for (let i = 0; i < 30; i++) {
      const x = -8 + R() * 40;
      const z = -20 + R() * 58;
      if (blocked(x, z)) continue;
      const b = sph(0.5, i % 2 ? C.leaf : C.leafDark, { rough: 0.9 }, 12);
      b.scale.set(1.3, 0.8, 1);
      add(b, x, 0.32, z);
      for (let j = 0; j < 6; j++) flowers.push([x + (R() - 0.5) * 1.6, 0, z + 0.5 + R() * 0.4, Math.floor(R() * 7), 0.9]);
    }
    // Bunting along the start straight and beside the duck road
    const flagGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.17, 0, 0), new THREE.Vector3(0.17, 0, 0), new THREE.Vector3(0, -0.32, 0)]);
    flagGeo.setIndex([0, 2, 1]);
    flagGeo.computeVertexNormals();
    const flagCols = [C.rose, C.sun, C.mint, C.sky, C.pink, C.white];
    const bunting = (x0, z0, x1, z1) => {
      for (const [x, z] of [[x0, z0], [x1, z1]]) {
        add(cyl(0.05, 0.06, 2.8, C.white, 8), x, 1.4, z);
        add(sph(0.08, C.sun, undefined, 8), x, 2.84, z);
        physics.add({ type: 'circle', x, z, r: 0.12 });
      }
      const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.55);
      const ry = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2;
      for (let i = 1; i < n; i++) {
        const f = i / n;
        // Each flag swings out a little from the rope, so it shows from the camera above
        const pivot = new THREE.Group();
        pivot.rotation.y = ry;
        const fl = mesh(flagGeo, mat(flagCols[i % flagCols.length], { rough: 0.7, side: THREE.DoubleSide }), { cast: false });
        fl.rotation.x = -0.95;
        pivot.add(fl);
        add(pivot, x0 + (x1 - x0) * f, 2.7 - Math.sin(f * Math.PI) * 0.4, z0 + (z1 - z0) * f);
      }
    };
    bunting(-3.4, 33, -3.4, 27.5);
    bunting(-3.4, 20.5, -3.4, 14.5);
    bunting(3.4, 33, 3.4, 27.5);
    bunting(22.6, 11.5, 22.6, 17.5);
    bunting(15.4, 11.5, 15.4, 17.5);
    addFlowers(world, flowers, R);

    // ---------------------------------------------------------------- the learner car and its people
    const car = ctx.models.car(C.sun);
    learnerize(car, atlas, cells);
    world.add(car.root);
    keep.push(car.root);
    const brakeMat = umat('#e5484d', { emissive: '#ff3b3b', ei: 0.4 });
    car.root.traverse((o) => {
      if (o.isMesh && o.material?.emissive && o.material.color.getHexString() === 'e5484d') o.material = brakeMat;
    });
    const roji = ctx.makeKid('roji');
    roji.pose = 'drive';
    car.body.add(roji.root);
    roji.root.position.set(0.33, 0.66, -0.25);
    const nora = makeNora(ctx.makeKid, { scale: meIsRoji ? 1.04 : 1.12 });
    const homama = ctx.makeKid('homama');
    const passenger = meIsRoji ? nora : homama;
    const fanKid = meIsRoji ? homama : nora;
    passenger.pose = 'sit';
    car.body.add(passenger.root);
    passenger.root.position.set(-0.33, 0.66, -0.25);
    // Homama's banner on two poles, held over his head
    let banner = null;
    if (meIsRoji) {
      cells.banner = atlas.add((c, w, h) => {
        c.fillStyle = C.rose;
        roundRect(c, 4, 20, w - 8, h - 40, 40);
        c.fill();
        c.lineWidth = 8;
        c.strokeStyle = '#ffffff';
        c.setLineDash([16, 12]);
        roundRect(c, 18, 34, w - 36, h - 68, 30);
        c.stroke();
        c.setLineDash([]);
        paintText(c, 'GO ROJI!', w / 2, h / 2 + 6, h * 0.42, '#ffffff');
        c.fillStyle = C.sun;
        heartPath(c, 46, h / 2 + 10, 26);
        c.fill();
        heartPath(c, w - 46, h / 2 + 10, 26);
        c.fill();
      }, 2);
      banner = new THREE.Group();
      banner.add(at(atlas.plane(0.96, 0.48, cells.banner, { cast: true }), 0, 1.78, 0.06));
      banner.add(at(rbox(1.0, 0.52, 0.03, C.white, 0.02), 0, 1.78, 0.04));
      for (const s of [-1, 1]) banner.add(at(cyl(0.018, 0.018, 1.08, C.woodDark, 6), s * 0.34, 1.48, 0.02));
      homama.body.add(banner);
    }
    if (banner) colorBake(banner);
    for (const kd of [roji, nora, homama]) bakeLiveKid(kd, banner ? [banner] : []);
    const fan = { kid: fanKid, pos: new THREE.Vector3(-4.6, 0, 30.5), yaw: Math.PI / 2, target: new THREE.Vector3(-4.6, 0, 30.5), speed: 0 };
    scene.add(fanKid.root);
    const fanCol = physics.add({ type: 'circle', x: fan.pos.x, z: fan.pos.z, r: 0.45 });
    const SPOTS = { gate: [-4.6, 21.8], stop: [-4.4, 10.6], light: [-4.8, 3.6], round: [8.6, 1.4], ducks: [23.6, 4.4], park: [28.0, 24.0] };

    // ---------------------------------------------------------------- ducks
    const ducks = [];
    for (let i = 0; i < 4; i++) {
      const d = makeDuck(k, i === 0 ? { color: C.white, size: 1.3 } : { color: C.sun, size: 0.75 });
      colorBake(d);
      const x = 13.9 - i * 0.65;
      d.position.set(x, 0, DUCK_Z + 0.4);
      d.rotation.y = Math.PI / 2;
      world.add(d);
      keep.push(d);
      ducks.push({ g: d, x, z: DUCK_Z, hop: 0, swimA: i * 1.6, done: false });
    }
    let duckState = 'home'; // home | walking | scared | pond
    let duckSpeed = 1.6;

    // ---------------------------------------------------------------- guide arrow and target beacon
    const chev = new THREE.Shape();
    chev.moveTo(0, 0.55);
    chev.lineTo(0.42, 0.05);
    chev.lineTo(0.2, 0.05);
    chev.lineTo(0.2, -0.45);
    chev.lineTo(-0.2, -0.45);
    chev.lineTo(-0.2, 0.05);
    chev.lineTo(-0.42, 0.05);
    chev.closePath();
    const arrowGeo = new THREE.ExtrudeGeometry(chev, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 });
    arrowGeo.rotateX(-Math.PI / 2);
    arrowGeo.translate(0, 0, 0);
    const arrowMat = umat('#ffd166', { emissive: '#ffb020', ei: 0.55, rough: 0.4 });
    const guide = mesh(arrowGeo, arrowMat, { cast: false });
    scene.add(guide);
    const beacon = new THREE.Group();
    const bcone = mesh(new THREE.ConeGeometry(0.45, 0.7, 4), arrowMat);
    bcone.rotation.x = Math.PI;
    beacon.add(at(bcone, 0, 0, 0));
    beacon.add(at(mesh(new THREE.BoxGeometry(0.3, 0.6, 0.3), arrowMat), 0, 0.6, 0));
    scene.add(beacon);

    // Merge the static scenery
    colorBake(world, keep);
    bakeStatic(world, keep, mergeGeometries);

    // ---------------------------------------------------------------- HUD
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    const layer = document.createElement('div');
    layer.className = 'dl-layer';
    layer.innerHTML = `
      <div class="dl-list"><h4>Lesson with Abu Sanad</h4><ol>${TASKS.map((t, i) => `<li data-i="${i}"><i></i><span>${t.label}</span></li>`).join('')}</ol><div class="dl-smooth">Smooth driving<span></span></div></div>
      <div class="dl-say hide"><b>Abu Sanad</b><span></span></div>
      <div class="dl-pop"></div>
      <div class="dl-card"><canvas width="760" height="460"></canvas></div>`;
    (document.getElementById('arena') || document.body).appendChild(layer);
    const $ = (s) => layer.querySelector(s);
    const items = [...layer.querySelectorAll('.dl-list li')];
    const sayEl = $('.dl-say');
    const popEl = $('.dl-pop');
    let popTimer = 0;
    const pop = (html, color = '#fff', ms = 1100) => {
      popEl.innerHTML = html;
      popEl.style.color = color;
      popEl.classList.remove('on');
      void popEl.offsetWidth;
      popEl.classList.add('on');
      clearTimeout(popTimer);
      popTimer = setTimeout(() => popEl.classList.remove('on'), ms);
    };
    let sayTimer = 0;
    let sayTemp = false; // a short remark is showing; the task instruction comes back after it
    const say = (text, who = 'Abu Sanad', ms = 0) => {
      sayEl.querySelector('b').textContent = who;
      sayEl.querySelector('span').textContent = text;
      sayEl.className = `dl-say${who === 'Homama' ? ' who-homama' : ''}`;
      clearTimeout(sayTimer);
      sayTemp = !!ms;
      if (ms)
        sayTimer = setTimeout(() => {
          sayTemp = false;
          if (!disposed && phase === 'drive' && taskI < TASKS.length) say(TASKS[taskI].say);
        }, ms);
    };
    const drawList = () => {
      items.forEach((li, i) => {
        li.className = i < taskI ? 'done' : i === taskI ? 'now' : '';
        li.querySelector('i').textContent = i < taskI ? '\u2713' : '';
      });
      const stars = starsNow();
      $('.dl-smooth span').innerHTML = [1, 2, 3].map((n) => STAR(n <= stars, 15)).join('');
    };
    const startProgress = clamp(ctx.load('licence', 0), 0, 100);
    const lessonNo = ctx.load('lessons', 0) + 1;
    const hadLicence = startProgress >= 100;
    const meter = (p) => hud.score(`<span class="dl-lic">${p >= 100 ? 'Licence!' : 'Licence'} <i><b style="width:${Math.max(4, p)}%"></b></i></span>`);
    meter(startProgress);
    hud.buttons({ action: 'Brake', jump: 'Honk' });
    hud.hint('Arrows, WASD or hold the mouse to steer. Hold E to brake. Space honks.');

    // ---------------------------------------------------------------- state
    let disposed = false;
    let phase = 'intro'; // intro | drive | done | licence
    let phaseT = 0;
    let taskI = 0;
    let wps = [];
    let wpI = 0;
    let oops = 0;
    let bumpCd = 0;
    let offCd = 0;
    let lightState = 'red';
    let lightWait = 0;
    let lightT = 0;
    let ringAcc = 0;
    let ringPrev = null;
    let wrongSaid = false;
    let leftEarly = false;
    let parkT = 0;
    let crookedCd = 0;
    let stopSaid = false;
    let duckWaitSaid = false;
    let scared = false;
    let honkCd = 0;
    let hotBrake = false;
    const starsNow = () => (oops <= 0.5 ? 3 : oops <= 2 ? 2 : 1);
    const ringPt = (th) => [RC.x + Math.cos(th) * R_LANE, RC.z + Math.sin(th) * R_LANE];
    const WAYPOINTS = {
      gate: [[0, GATE_Z - 1]],
      stop: [[0, STOP_Z - 0.5]],
      light: [[0, LIGHT_Z - 0.5], [0, -4]],
      round: [[2.3, -7.6], [9, -10], ...Array.from({ length: 10 }, (_, i) => ringPt(Math.PI - ((i + 1) * Math.PI) / 4))],
      ducks: [[19, 1.2], [19, ZEBRA.z0]],
      park: [[19.5, 22.5], [BAY.x, 25.4], [BAY.x, BAY.z]],
    };
    const BEACON = { gate: [0, GATE_Z, 5.0], stop: [0, STOP_Z + 0.6, 2.6], light: [3.1, LIGHT_Z + 0.2, 4.2], round: [RC.x, RC.z, 5.2], ducks: [19, DUCK_Z, 2.6], park: [BAY.x, BAY.z, 2.6] };
    const sfx = {
      tone: (f, d, o) => sound?.ctx && !sound.muted && sound.tone(f, sound.ctx.currentTime, d, o),
      quack(n = 2) {
        for (let i = 0; i < n; i++) later(i * 170, () => sfx.tone(560 + Math.random() * 140, 0.12, { type: 'square', gain: 0.04, slideTo: 370 }));
      },
      bonk() {
        sfx.tone(180, 0.12, { type: 'triangle', gain: 0.08, slideTo: 120 });
      },
      chime() {
        [72, 76, 79].forEach((n, i) => later(i * 90, () => sfx.tone(440 * Math.pow(2, (n - 69) / 12), 0.25, { type: 'triangle', gain: 0.05 })));
      },
    };
    const OOPS_LINES = ['Oops! Gentle, gentle.', 'Bump! Everyone okay? Good.', 'Easy does it, Roji.'];
    let oopsI = 0;
    const addOops = (n, line) => {
      oops += n;
      sfx.bonk();
      say(line || OOPS_LINES[oopsI++ % OOPS_LINES.length], 'Abu Sanad', 2600);
      drawList();
    };

    function setTask(i) {
      taskI = i;
      drawList();
      zone.visible = false;
      bayGlow.visible = false;
      if (i >= TASKS.length) return;
      const t = TASKS[i];
      wps = WAYPOINTS[t.id];
      wpI = 0;
      if (!sayTemp) say(t.say);
      later(i === 0 ? 0 : 1500, () => phase === 'drive' && taskI === i && fan.target.set(SPOTS[t.id][0], 0, SPOTS[t.id][1]));
      if (t.id === 'stop') showZone(0, STOP_Z + 0.1, STOP_Z + 3.1);
      if (t.id === 'light') showZone(0, LIGHT_Z + 0.1, LIGHT_Z + 3.6);
      if (t.id === 'park') bayGlow.visible = true;
      if (t.id === 'round') {
        ringAcc = 0;
        ringPrev = null;
      }
      if (t.id === 'ducks') showZone(19, ZEBRA.z0 - 2.6, ZEBRA.z0 - 0.15, ROAD_W - 0.3);
    }
    function complete(text, praise = true) {
      if (praise) {
        pop(text, '#fff6c8');
        sound.ui('good');
        fx.burst(car.root.position.clone().setY(2.2), ['#ffd166', '#ffffff', '#7fd8bf', '#ff9eb5'], 22);
      } else pop(text, '#ffe1e6');
      roji.squash = 1.18;
      cheer();
      setTask(taskI + 1);
      if (taskI >= TASKS.length) finishLesson();
    }
    function cheer() {
      if (fanKid.pose === 'stand' && fan.speed < 0.5) fanKid.emote(meIsRoji ? 'cheer' : 'wave');
      passengerCheer = 1.4;
      const lines = meIsRoji ? ['Yay, Roji!', 'Woo! That was perfect!', 'You are amazing, Roji!', 'Go go go, Roji!'] : ['Great job, Roji!', 'Smooth! I could not do it better.', 'You are a natural, Roji!', 'High five, Roji!'];
      later(400, () => !disposed && phase === 'drive' && say(lines[(taskI + R() * 4) % 4 | 0], 'Homama', 1700));
    }
    let passengerCheer = 0;

    // ---------------------------------------------------------------- lesson end
    let gained = 0;
    let newProgress = startProgress;
    function finishLesson() {
      phase = 'done';
      phaseT = 0;
      zone.visible = false;
      bayGlow.visible = false;
      const stars = starsNow();
      gained = hadLicence ? 0 : 20 + stars * 5;
      newProgress = Math.min(100, startProgress + gained);
      ctx.save('licence', newProgress);
      ctx.save('lessons', lessonNo);
      ctx.save('best', Math.max(stars, ctx.load('best', 0)));
      later(500, () => meter(newProgress));
      sfx.chime();
      fx.heartsAt(car.root.position.clone().setY(2.4), 5);
      say(stars === 3 ? 'Parked! Smooth as butter. Lesson complete!' : 'Parked! Lesson complete. Well done, Roji!');
    }
    function showResult() {
      const stars = starsNow();
      const titles = ['', 'Lesson done!', 'Lovely driving!', 'Super smooth!'];
      const lines = {
        3: 'Abu Sanad: "Not a single wobble. You are a natural, Roji."',
        2: 'Abu Sanad: "Very good! A tiny bit gentler next time."',
        1: 'Abu Sanad: "Every driver starts somewhere. You are getting better!"',
      };
      const extra = meIsRoji ? 'Homama waves his GO ROJI! banner.' : 'Homama: "I am so proud of you, Roji!"';
      const bar = hadLicence ? '<b>Licence: got it!</b> This was a practice drive.' : `Licence progress <b>${newProgress}%</b> (+${gained})<span class="bar"><b style="width:${newProgress}%"></b></span>`;
      ctx.finish({
        win: true,
        title: titles[stars],
        text: `<span class="dl-res"><span class="stars">${[1, 2, 3].map((n) => STAR(n <= stars, 34)).join('')}</span>${lines[stars]}<br>${extra}<br>${bar}</span>`,
        stars,
        licence: false,
      });
    }
    // The big moment: Roji gets her licence
    const cardCv = $('.dl-card canvas');
    function drawLicenceCard() {
      const c = cardCv.getContext('2d');
      const w = cardCv.width;
      const h = cardCv.height;
      const gr = c.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, '#fff6dc');
      gr.addColorStop(1, '#ffe1ea');
      c.fillStyle = gr;
      roundRect(c, 0, 0, w, h, 34);
      c.fill();
      c.fillStyle = C.teal;
      roundRect(c, 0, 0, w, 96, 34);
      c.fill();
      c.fillRect(0, 60, w, 36);
      drawWheelBadge(c, 62, 48, 32);
      paintText(c, 'DRIVING LICENCE', w / 2 + 24, 50, 46, '#ffffff');
      c.fillStyle = '#ffffff';
      roundRect(c, 40, 130, 220, 260, 20);
      c.fill();
      c.save();
      c.beginPath();
      c.rect(40, 130, 220, 260);
      c.clip();
      c.fillStyle = '#cfe9ff';
      c.fillRect(40, 130, 220, 260);
      drawChibi(c, 150, 250, 88, ROJI_PHOTO);
      c.restore();
      paintText(c, 'Name', 300, 160, 26, '#8a7480', 600, 'left');
      paintText(c, 'Roji', 300, 205, 58, C.ink, 700, 'left');
      paintText(c, 'Certified driver', 300, 262, 34, C.rose, 700, 'left');
      paintText(c, 'Little Wheels Driving School', 300, 306, 24, '#6a5662', 600, 'left');
      paintText(c, 'Cheered on by Homama', 300, 344, 24, C.blue, 600, 'left');
      c.fillStyle = C.rose;
      heartPath(c, w - 70, h - 70, 40);
      c.fill();
    }
    let licT = 0;
    let rojiOut = false;
    function startLicence() {
      phase = 'licence';
      layer.classList.add('party');
      licT = 0;
      say('Roji, you passed! Here is your driving licence!');
      sound.ui('win');
      sound.wish?.();
    }
    function rojiGetsOut() {
      rojiOut = true;
      const base = car.root.position;
      fx.poof(base.clone().setY(1));
      scene.attach(roji.root);
      roji.pose = 'stand';
      roji.root.rotation.set(0, 0, 0);
      roji.root.position.set(base.x, 0, base.z + 2.6);
      roji.root.scale.setScalar(1);
      if (meIsRoji) {
        scene.attach(nora.root);
        nora.pose = 'stand';
        nora.root.rotation.set(0, 0.3, 0);
        nora.root.position.set(base.x - 1.4, 0, base.z + 2.4);
      } else {
        scene.attach(homama.root);
        homama.pose = 'stand';
        homama.root.rotation.set(0, -0.3, 0);
        homama.root.position.set(base.x + 1.3, 0, base.z + 2.7);
      }
      // The one at the roadside pops over to join them
      fx.poof(fan.pos.clone().setY(0.8));
      fan.pos.set(meIsRoji ? base.x + 1.3 : base.x - 1.4, 0, meIsRoji ? base.z + 2.8 : base.z + 2.4);
      fan.target.copy(fan.pos);
      fan.yaw = 0;
      fx.poof(fan.pos.clone().setY(0.8));
      later(300, () => roji.emote('cheer'));
    }

    // ---------------------------------------------------------------- driving
    const tmp = new THREE.Vector3();
    const vel = new THREE.Vector3();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ray = new THREE.Raycaster();
    const hit = new THREE.Vector3();
    car.yaw = START.yaw;
    car.root.position.set(START.x, 0, START.z);
    car.update(0, 0);
    let brakeOn = false;
    const front = () => tmp.set(car.root.position.x + Math.sin(car.yaw) * FRONT, 0, car.root.position.z + Math.cos(car.yaw) * FRONT);
    const dbg = { fast: 1, auto: false, car, get task() { return TASKS[taskI]?.id || 'end'; }, get phase() { return phase; }, get oops() { return oops; }, get light() { return lightState; }, get ducks() { return duckState; }, teleport(x, z, yaw = car.yaw) { car.root.position.set(x, 0, z); car.yaw = yaw; car.speed = 0; } };
    window.__drive = dbg;

    function autopilot() {
      const wp = wps[Math.min(wpI, wps.length - 1)] || [BAY.x, BAY.z];
      const p = car.root.position;
      const f = front();
      const id = TASKS[taskI]?.id;
      let brake = false;
      let intent = 1;
      if (id === 'stop' && f.z < STOP_Z + 3) brake = true;
      if (id === 'light' && f.z < LIGHT_Z + 3.4 && lightState !== 'green') brake = true;
      if (id === 'ducks' && f.z > ZEBRA.z0 - 2.4 && duckState !== 'pond') brake = true;
      if (id === 'park') {
        const d = Math.hypot(BAY.x - p.x, BAY.z - p.z);
        intent = clamp(d / 5, 0.25, 1);
        if (d < 0.6) brake = true;
      }
      return { want: Math.atan2(wp[0] - p.x, wp[1] - p.z), intent, brake };
    }

    function steer(dt, want, intent, brake) {
      const p = car.root.position;
      const max = MAX_SPEED * (onRoad(p.x, p.z) ? 1 : 0.55);
      let target = 0;
      if (want !== null && intent > 0.05) {
        const d = wrap(want - car.yaw);
        const grip = clamp(0.4 + Math.abs(car.speed) / 3, 0, 1);
        const rate = 2.6 - 0.8 * clamp(Math.abs(car.speed) / max, 0, 1);
        const turn = clamp(d * 3.2, -rate, rate) * grip;
        car.yaw += turn * dt;
        car.turnRate = turn;
        car.steer = damp(car.steer, clamp(d, -0.6, 0.6), 10, dt);
        if (!brake) target = max * Math.min(1, intent) * clamp(Math.cos(d) * 1.15, 0.28, 1);
      } else {
        car.turnRate = 0;
        car.steer = damp(car.steer, 0, 8, dt);
      }
      const dv = target - car.speed;
      const decel = brake ? 10 : intent > 0.05 ? 5 : 2.2;
      car.speed += clamp(dv, -decel * dt, (target > 0 ? 4.2 : 0) * dt);
      if (Math.abs(car.speed) < 0.03 && target === 0) car.speed = 0;
    }

    function controls(first) {
      if (dbg.auto) return autopilot();
      const ax = input.axis();
      let dirX = ax.x;
      let dirZ = -ax.y;
      let intent = Math.min(1, Math.hypot(dirX, dirZ));
      const ptr = input.pointer;
      if (intent < 0.05 && ptr.down) {
        ray.setFromCamera(ptr.ndc, camera);
        if (ray.ray.intersectPlane(plane, hit)) {
          dirX = hit.x - car.root.position.x;
          dirZ = hit.z - car.root.position.z;
          const d = Math.hypot(dirX, dirZ);
          intent = d < 1.4 ? 0 : clamp(d / 5, 0.35, 1);
        }
      }
      const brake = input.held('action') || input.held('b');
      if (first && input.pressed('jump') && honkCd <= 0) honk();
      return { want: intent > 0.05 ? Math.atan2(dirX, dirZ) : null, intent, brake };
    }
    function honk() {
      honkCd = 0.6;
      sound.honk();
      car.honk();
      const p = car.root.position;
      if (ducks.some((d) => Math.hypot(d.x - p.x, d.z - p.z) < 9)) {
        sfx.quack(3);
        for (const d of ducks) d.hop = 0.5;
      }
    }

    function stepDrive(dt, t, first) {
      const p = car.root.position;
      const c = phase === 'drive' ? controls(first) : { want: null, intent: 0, brake: true };
      brakeOn = c.brake;
      steer(dt, c.want, c.intent, c.brake);
      vel.set(Math.sin(car.yaw) * car.speed, 0, Math.cos(car.yaw) * car.speed);
      const before = car.speed;
      p.x += vel.x * dt;
      p.z += vel.z * dt;
      physics.resolve(p, 1.05, vel);
      const fwd = vel.x * Math.sin(car.yaw) + vel.z * Math.cos(car.yaw);
      if (Math.abs(fwd) < Math.abs(before) - 1.2) {
        car.speed = fwd * 0.6;
        if (bumpCd <= 0 && Math.abs(before) > 1.6 && phase === 'drive') {
          bumpCd = 1.6;
          addOops(0.5);
        }
      } else car.speed = fwd;
      // Cones
      for (const cn of CONES) {
        const dx = cn.x - p.x;
        const dz = cn.z - p.z;
        const d = Math.hypot(dx, dz);
        // In the car's own frame: a cone inside its footprint (plus a little) gets knocked
        const lx = dx * Math.cos(car.yaw) - dz * Math.sin(car.yaw);
        const lz = dx * Math.sin(car.yaw) + dz * Math.cos(car.yaw);
        if (Math.abs(lx) < 0.98 && Math.abs(lz) < 1.55 && Math.abs(car.speed) > 0.4) {
          const push = Math.max(1.5, Math.abs(car.speed) * 0.9);
          cn.vx = (dx / (d || 1)) * push + vel.x * 0.4;
          cn.vz = (dz / (d || 1)) * push + vel.z * 0.4;
          cn.vy = 2.2;
          cn.tipDir = Math.atan2(cn.vz, cn.vx);
          if (!cn.hit && phase === 'drive') {
            cn.hit = true;
            addOops(0.5, 'Whoops, a cone! They are tougher than they look.');
            fx.puff?.(tmp.set(cn.x, 0.4, cn.z));
          }
        }
        if (cn.vx || cn.vz || cn.vy || cn.y > 0) {
          cn.x += cn.vx * dt;
          cn.z += cn.vz * dt;
          cn.vy -= 14 * dt;
          cn.y = Math.max(0, cn.y + cn.vy * dt);
          if (cn.y === 0) cn.vy = 0;
          cn.vx = damp(cn.vx, 0, 3, dt);
          cn.vz = damp(cn.vz, 0, 3, dt);
          if (Math.abs(cn.vx) + Math.abs(cn.vz) < 0.02) cn.vx = cn.vz = 0;
          cn.ry += (Math.abs(cn.vx) + Math.abs(cn.vz)) * dt;
        }
        if (cn.hit) cn.tip = damp(cn.tip, Math.PI / 2, 9, dt);
      }
      // Off the road
      offCd -= dt;
      if (phase === 'drive' && !onRoad(p.x, p.z, 0.2) && Math.abs(car.speed) > 1 && offCd <= 0) {
        offCd = 6;
        say('Back onto the road, please! The grass is for the ducks.', 'Abu Sanad', 2400);
      }
    }

    function stepTasks(dt) {
      if (phase !== 'drive' || taskI >= TASKS.length) return;
      const id = TASKS[taskI].id;
      const p = car.root.position;
      const f = front();
      const sp = Math.abs(car.speed);
      // Follow the guide waypoints
      const wp = wps[wpI];
      const hold = id === 'light' && lightState !== 'green'; // do not point past a red light
      if (wp && !hold && wpI < wps.length - 1 && Math.hypot(wp[0] - p.x, wp[1] - p.z) < 3.2) wpI++;
      if (id === 'gate') {
        if (p.z < GATE_Z && p.z > GATE_Z - 3 && Math.abs(p.x) < 2.3) complete('Through the gate!');
      } else if (id === 'stop') {
        if (f.z < STOP_Z - 0.7) {
          complete('A little past the line', false);
          addOops(1, 'Just past the line. Brake a tiny bit sooner next time!');
        }
        else if (f.z < STOP_Z + 3.0 && sp < 0.2) complete('Perfect stop!');
        else if (!stopSaid && f.z < STOP_Z + 6 && sp > 3) {
          stopSaid = true;
          say('Brake now! Hold the brake button.', 'Abu Sanad', 2000);
        }
      } else if (id === 'light') {
        if (lightState !== 'green') {
          if (f.z < LIGHT_Z - 0.4) {
            addOops(1, 'Oh! That light was red. Abu Sanad covers his eyes.');
            lightState = 'green';
            setLight(lampMats, 'green');
          } else if (f.z < LIGHT_Z + 3.7 && sp < 0.25) {
            lightWait += dt;
            if (lightWait > 1.4 && lightState === 'red') {
              lightState = 'redamber';
              lightT = 0;
              setLight(lampMats, 'redamber');
              say('Good waiting. Get ready...', 'Abu Sanad', 0);
            }
          }
          if (lightState === 'redamber') {
            lightT += dt;
            if (lightT > 0.9) {
              lightState = 'green';
              setLight(lampMats, 'green');
              pop('Green!', '#c9ffd9');
              sfx.chime();
              say('Green light! Off we go.', 'Abu Sanad', 0);
            }
          }
        } else if (f.z < LIGHT_Z - 0.5) complete('Nice and patient!', lightWait > 0.5);
      } else if (id === 'round') {
        const dx = p.x - RC.x;
        const dz = p.z - RC.z;
        const d = Math.hypot(dx, dz);
        if (d < R_OUT + 1.2 && d > R_IN - 0.5) {
          const th = Math.atan2(dz, dx);
          if (ringPrev !== null) ringAcc -= wrap(th - ringPrev);
          ringPrev = th;
          if (ringAcc < -1.0) {
            ringAcc = 0;
            if (!wrongSaid) {
              wrongSaid = true;
              addOops(0.5, 'Other way round, Roji! Follow the white arrows.');
            }
          }
          // Waypoints follow the angle travelled, so the arrow always points onward round the ring
          const want = Math.min(9, Math.max(0, Math.floor((ringAcc + (Math.PI / 4) * 0.45) / (Math.PI / 4)))) + 2;
          if (want > wpI) wpI = Math.min(want, wps.length - 1);
          if (ringAcc > Math.PI * 2.5 - 0.3) {
            complete('All the way round!');
            if (duckState === 'home') duckState = 'walking';
          }
        } else if (ringPrev !== null && d > R_OUT + 3) {
          ringPrev = null;
          if (ringAcc > 0.4 && !leftEarly) {
            leftEarly = true;
            say('We left a bit early! Back to the roundabout, all the way round.', 'Abu Sanad', 3000);
          }
        }
      } else if (id === 'ducks') {
        if (duckState === 'home' && p.z > -3) duckState = 'walking';
        const inBand = f.z > ZEBRA.z0 - 0.3 && f.z < ZEBRA.z1 + 0.5 && sp > 0.3;
        const onRoadDuck = ducks.some((dk) => dk.x > ZEBRA.x0 - 0.3 && dk.x < ZEBRA.x1 + 0.3);
        if (inBand && onRoadDuck && duckState === 'walking') {
          duckState = 'scared';
          scared = true;
          duckSpeed = 4.5;
          for (const dk of ducks) dk.hop = 1;
          sfx.quack(4);
          addOops(1, 'Eek! Ducks first, Roji! They are fine, just ruffled.');
        }
        if (!duckWaitSaid && sp < 0.2 && f.z > ZEBRA.z0 - 3 && onRoadDuck) {
          duckWaitSaid = true;
          say('Lovely waiting. Look at the little ones!', 'Abu Sanad', 0);
        }
        if (duckState === 'pond') complete(scared ? 'The ducks made it!' : 'The ducks say thank you!', !scared);
      } else if (id === 'park') {
        const inBay = Math.abs(p.x - BAY.x) < 0.75 && Math.abs(p.z - BAY.z) < 1.05;
        const straight = Math.abs(Math.sin(car.yaw)) < 0.42;
        crookedCd -= dt;
        if (inBay && straight && sp < 0.25) {
          parkT += dt;
          if (parkT > 0.5) complete('Parked!');
        } else {
          parkT = 0;
          if (inBay && !straight && sp < 0.3 && crookedCd <= 0) {
            crookedCd = 4;
            say('Nearly! Straighten up a little, then brake.', 'Abu Sanad', 2600);
          }
        }
      }
    }

    function stepDucks(dt, t) {
      const walking = duckState !== 'home';
      ducks.forEach((dk, i) => {
        dk.hop = Math.max(0, dk.hop - dt);
        if (walking && !dk.done) {
          dk.x += duckSpeed * dt;
          if (dk.x > POND.x - 1.6) {
            dk.done = true;
            dk.swimA = Math.PI + i * 0.9;
          }
          const bob = Math.abs(Math.sin(t * 9 + i)) * 0.05;
          dk.g.position.set(dk.x, bob + (dk.hop > 0 ? Math.abs(Math.sin(dk.hop * 12)) * 0.25 : 0), DUCK_Z + (i ? Math.sin(t * 4 + i) * 0.04 : 0));
          dk.g.rotation.set(0, Math.PI / 2, Math.sin(t * 9 + i) * 0.12);
        } else if (dk.done) {
          dk.swimA += dt * 0.5;
          const r = POND.r - 0.55;
          dk.g.position.set(POND.x + Math.cos(dk.swimA) * r, 0.17 + Math.sin(t * 3 + i) * 0.012, POND.z + Math.sin(dk.swimA) * r);
          dk.g.rotation.set(0, -dk.swimA, 0);
        } else {
          dk.g.position.y = dk.hop > 0 ? Math.abs(Math.sin(dk.hop * 12)) * 0.2 : 0;
          dk.g.rotation.set(0, Math.PI / 2 + Math.sin(t * 0.8 + i) * 0.3, 0);
        }
      });
      if ((duckState === 'walking' || duckState === 'scared') && ducks.every((d) => d.x > ZEBRA.x1 + 0.6)) duckState = 'pond';
    }

    function stepFan(dt, t) {
      const k2 = fanKid;
      const dx = fan.target.x - fan.pos.x;
      const dz = fan.target.z - fan.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 34) {
        fx.poof(fan.pos.clone().setY(0.8));
        fan.pos.copy(fan.target);
        fx.poof(fan.pos.clone().setY(0.8));
        fan.speed = 0;
      } else if (d > 0.2) {
        fan.speed = damp(fan.speed, Math.min(5.2, d * 2.5), 6, dt);
        fan.pos.x += (dx / d) * fan.speed * dt;
        fan.pos.z += (dz / d) * fan.speed * dt;
        fan.yaw = dampAngle(fan.yaw, Math.atan2(dx, dz), 10, dt);
      } else {
        fan.speed = damp(fan.speed, 0, 10, dt);
        const p = rojiOut ? roji.root.position : car.root.position;
        const look = Math.atan2(p.x - fan.pos.x, p.z - fan.pos.z);
        fan.yaw = dampAngle(fan.yaw, rojiOut ? look * 0.5 : look, 4, dt);
      }
      fanCol.x = fan.pos.x;
      fanCol.z = fan.pos.z;
      k2.root.position.copy(fan.pos);
      k2.root.rotation.y = fan.yaw;
      k2.update(dt, t, fan.speed, 0, 0);
      if (banner) banner.visible = phase !== 'licence' || licT < 1.6;
      if (banner?.visible && !k2.emoteType) {
        const [aL, aR] = k2.arms;
        const wig = Math.sin(t * 6) * 0.08;
        aL.rotation.set(0, 0, 2.55 + wig);
        aR.rotation.set(0, 0, -2.55 + wig);
        banner.rotation.z = wig * 0.5;
      }
    }

    // ---------------------------------------------------------------- camera
    const camLook = new THREE.Vector3(START.x, 0.8, START.z - 4);
    const camOff = new THREE.Vector3(0, 12.2, 9.6);
    const CLOSE = new THREE.Vector3(0, 4.4, 7.4);
    const camOffNow = camOff.clone();
    const want = new THREE.Vector3();
    function stepCamera(dt) {
      const p = car.root.position;
      const aspect = camera.aspect;
      let zoom = aspect < 1 ? 1.45 : aspect > 1.9 ? 0.95 : 1;
      if (phase === 'licence' && rojiOut) {
        // Swing down to a friendly front view of the three of them
        want.set(roji.root.position.x, 1.5, roji.root.position.z - 1.3);
        camOffNow.lerp(CLOSE, 1 - Math.exp(-2.5 * dt));
        zoom = aspect < 1 ? 1.5 : 1;
      } else if (phase === 'intro') {
        want.set(p.x, 0.8, p.z - 5 - Math.max(0, 1.6 - phaseT) * 4);
        zoom *= 1.0 + Math.max(0, 1.4 - phaseT) * 0.25;
      } else {
        // Look ahead of the car, more when it drives toward the camera (so the road ahead stays on screen)
        const fz = Math.cos(car.yaw);
        const ahead = 2.2 + clamp(car.speed, 0, MAX_SPEED) * 0.45 + Math.max(0, fz) * 1.6;
        want.set(p.x + Math.sin(car.yaw) * ahead, 0.8, p.z + fz * ahead);
      }
      const rate = 1 - Math.exp(-3.2 * dt);
      camLook.lerp(want, rate);
      camera.position.copy(camLook).addScaledVector(camOffNow, zoom);
      camera.lookAt(camLook);
      env.follow(camLook);
    }

    // ---------------------------------------------------------------- frame
    setTask(0);
    say('Hi Roji! Seatbelt on? Point where you want to go and off we drive.');
    hud.message(hadLicence ? 'Practice drive' : `Lesson ${lessonNo}`, 1400);
    sound.ui('swoosh');
    const engineWasOn = !!sound.engineOsc;
    if (!engineWasOn) sound.engine(true);
    drawList();

    function step(dt, t, first) {
      phaseT += dt;
      bumpCd -= dt;
      honkCd -= dt;
      passengerCheer = Math.max(0, passengerCheer - dt);
      if (phase === 'intro' && phaseT > 1.6) {
        phase = 'drive';
        phaseT = 0;
        hud.message('Go!', 700);
        sound.ui('good');
        say(TASKS[0].say);
      }
      stepDrive(dt, t, first);
      stepTasks(dt);
      stepDucks(dt, t);
      if (phase === 'done') {
        if (phaseT > 2.2 && !dbg.resultShown) {
          dbg.resultShown = true;
          if (!hadLicence && newProgress >= 100) startLicence();
          else showResult();
        }
      }
      if (phase === 'licence') {
        licT += dt;
        if (licT > 0.6 && !rojiOut) rojiGetsOut();
        if (licT > 1.8 && !dbg.cardShown) {
          dbg.cardShown = true;
          drawLicenceCard();
          $('.dl-card').classList.add('on');
          fx.burst(roji.root.position.clone().setY(1.6), ['#ffd166', '#ff9eb5', '#7fd8bf', '#6fb8ff', '#ffffff'], 90);
          if (meIsRoji) say('I knew you could do it, Roji! I am so proud of you!', 'Homama', 0);
          else say('Roji got her licence! Best day ever!', 'Homama', 0);
          fanKid.emote(meIsRoji ? 'cheer' : 'cheer');
          later(1600, () => !disposed && homama.emote('heart'));
          later(1800, () => !disposed && roji.emote('spin'));
        }
        if (licT > 2 && Math.floor(licT * 1.4) !== Math.floor((licT - dt) * 1.4)) fx.burst(roji.root.position.clone().setY(2.4 + R()), ['#ffd166', '#ff9eb5', '#7fd8bf', '#ffffff'], 30);
        if (licT > 6.2 && !dbg.licFinished) {
          dbg.licFinished = true;
          $('.dl-card').classList.remove('on');
          ctx.finish({ win: true, title: 'Roji got her licence!', text: `<span class="dl-res"><span class="stars">${[1, 2, 3].map((n) => STAR(n <= starsNow(), 34)).join('')}</span>Certified driver: <b>Roji</b>. Abu Sanad signs her card with a heart.<br>Homama: "Now we can take turns driving to the beach!"</span>`, stars: starsNow(), licence: true });
        }
      }
    }

    return {
      update(dt, t) {
        const n = Math.max(1, dbg.fast | 0);
        for (let i = 0; i < n; i++) step(dt, t + i * dt, i === 0);
        // Visuals once per frame
        car.update(dt, t);
        brakeMat.emissiveIntensity = brakeOn && Math.abs(car.speed) > 0.05 ? 2.4 : brakeOn ? 1.2 : 0.35;
        sound.engineSpeed(car.speed);
        roji.update(dt, t, 0, 0, rojiOut ? 0 : car.turnRate || 0);
        const pk = passenger;
        if (pk.root.parent === car.body) pk.hands = passengerCheer > 0 ? 'wave2' : pk === nora ? 'carry' : null;
        else if (pk === nora) pk.hands = 'carry';
        pk.update(dt, t, 0, 0, 0);
        stepFan(dt, t);
        drawCones();
        // Guide arrow above the car and the beacon over the target
        const p = car.root.position;
        const id = TASKS[taskI]?.id;
        const wp = wps[wpI];
        const showGuide = phase === 'drive' && wp;
        guide.visible = !!showGuide;
        if (showGuide) {
          const a = Math.atan2(wp[0] - p.x, wp[1] - p.z);
          // A glowing chevron on the road a little ahead, pointing where to go next
          guide.position.set(p.x + Math.sin(a) * 3.0, 0.14 + Math.sin(t * 4) * 0.04, p.z + Math.cos(a) * 3.0);
          guide.rotation.set(0, a + Math.PI, 0);
          const s = 1.15 + Math.sin(t * 6) * 0.08;
          guide.scale.set(s, 0.6, s);
        }
        beacon.visible = phase === 'drive' && !!id;
        if (beacon.visible) {
          const [bx, bz, by] = BEACON[id];
          beacon.position.set(bx, by + 0.2 + Math.abs(Math.sin(t * 3)) * 0.4, bz);
          beacon.rotation.y = t * 1.5;
        }
        arrowMat.emissiveIntensity = 0.45 + Math.sin(t * 6) * 0.2;
        // Make the Brake button pulse when it is time to stop
        const f = front();
        const needBrake = phase === 'drive' && Math.abs(car.speed) > 0.3 && ((id === 'stop' && f.z < STOP_Z + 6) || (id === 'light' && lightState !== 'green' && f.z < LIGHT_Z + 7) || (id === 'ducks' && duckState !== 'pond' && f.z > ZEBRA.z0 - 7 && f.z < ZEBRA.z0) || (id === 'park' && Math.hypot(p.x - BAY.x, p.z - BAY.z) < 2));
        if (needBrake !== hotBrake) {
          hotBrake = needBrake;
          document.querySelector('#arena .a-btn[data-b="action"]')?.classList.toggle('dl-hot', needBrake);
        }
        const pulse = 0.25 + Math.sin(t * 5) * 0.12;
        zoneMat.opacity = 0.65 + pulse;
        glowMat.opacity = 0.55 + Math.sin(t * 5) * 0.3;
        stepCamera(dt);
        if (phase === 'drive' && zone.visible && id === 'ducks' && duckState === 'pond') zone.visible = false;
      },
      dispose() {
        disposed = true;
        for (const id of timers) clearTimeout(id);
        clearTimeout(popTimer);
        clearTimeout(sayTimer);
        layer.remove();
        style.remove();
        if (!engineWasOn) sound.engine(false);
        if (window.__drive === dbg) delete window.__drive;
      },
    };
  },
};
