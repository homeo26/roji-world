import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildDesk } from '../places/tech/desk.js';
import { COL, box, rbox, at, mat, umat, mesh, canvasTexture, roundRect, FONT, pattern, cityWindowTex, neonTex, drawScreen, makeDuck, makeMug, makePlant, glowSprite, planeTex } from '../places/tech/kit.js';

// Ship It! Homama types a new feature at his desk while cute bugs crawl out of the monitors toward
// the Deploy button. Squash them with the rubber duck: tap or click a spot, or steer the duck and press A.
// Coffee slows the bugs, a golden duck clears the desk. Ship the feature to turn the pipeline green.
//
// The play surface is folded: the desk top (v from 0 at the front edge to LD at the monitors) and then
// straight up the front of the monitors (v from LD to VMAX). Bugs and the duck live in (u, v).

const H = 0.76; // desk top
const D = 1.0; // desk depth
const ZF = D / 2; // desk front edge
const WZ = -D / 2 + 0.22; // monitor and riser front
const LD = ZF - WZ; // desk part of the surface
const VMAX = LD + 0.2 + 0.48; // top of the screens
const UMAX = 1.15;
const DEPLOY = { u: 0.42, v: 0.17 };
const ROUND = 75; // seconds of typing for the feature, before bonuses and setbacks
const WAVES = [
  { at: 0, every: 2.3, speed: 0.15 },
  { at: 0.25, every: 1.75, speed: 0.19 },
  { at: 0.5, every: 1.35, speed: 0.23 },
  { at: 0.75, every: 1.05, speed: 0.27 },
];
const HEART = 'M12 21s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.5 2.7C19.5 16.4 12 21 12 21z';
const KINDS = {
  lady: { color: '#ef5b6f', scale: 1, hp: 1, speed: 1 },
  beetle: { color: '#8b5cf6', scale: 1, hp: 1, speed: 1.05 },
  zip: { color: '#21c4b0', scale: 0.8, hp: 1, speed: 1.55 },
  big: { color: '#ff9f40', scale: 1.45, hp: 2, speed: 0.75 },
};

// Bug geometry, shared by every bug: shell, dark parts, eye whites, pupils, legs. Faces +Z, up +Y.
function bugGeos(THREE) {
  const S = (r, w, h, sx, sy, sz, x, y, z) => new THREE.SphereGeometry(r, w, h).scale(sx, sy, sz).translate(x, y, z);
  const C = (r, len, x, y, z, rx, rz) => new THREE.CylinderGeometry(r, r, len, 5).rotateX(rx).rotateZ(rz).translate(x, y, z);
  const shell = S(0.07, 16, 10, 1, 0.62, 1.15, 0, 0.042, -0.01);
  const dark = [S(0.042, 12, 8, 1, 0.85, 1, 0, 0.036, 0.075), new THREE.BoxGeometry(0.007, 0.012, 0.14).translate(0, 0.084, -0.012)];
  for (const [x, z] of [[0.032, 0.01], [-0.032, 0.01], [0.03, -0.045], [-0.03, -0.045]]) dark.push(S(0.013, 8, 6, 1, 0.5, 1, x, 0.078 - Math.abs(z) * 0.25, z));
  for (const s of [1, -1]) {
    dark.push(C(0.0035, 0.06, s * 0.02, 0.085, 0.1, -0.7, s * -0.4));
    dark.push(S(0.009, 8, 6, 1, 1, 1, s * 0.033, 0.106, 0.122));
  }
  const legs = [];
  for (const z of [-0.035, 0, 0.035]) for (const s of [1, -1]) legs.push(C(0.005, 0.06, s * 0.07, 0.016, z, 0, s * 1.1));
  const eyes = [S(0.02, 10, 8, 1, 1, 0.8, 0.02, 0.05, 0.108), S(0.02, 10, 8, 1, 1, 0.8, -0.02, 0.05, 0.108)];
  const pupils = [S(0.011, 8, 6, 1, 1, 0.6, 0.021, 0.051, 0.124), S(0.011, 8, 6, 1, 1, 0.6, -0.021, 0.051, 0.124)];
  const m = (list) => mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)));
  return { shell, dark: m(dark), legs: m(legs), eyes: m(eyes), pupils: m(pupils) };
}

export default {
  id: 'coding',
  title: 'Ship It!',
  tagline: 'Squash the bugs, ship the feature',

  async start(ctx) {
    const { THREE, scene, camera, hud, input, sound, fx } = ctx;
    const env = ctx.env.indoor({ color: '#f6e2d6' });
    // This game's own effects live at desk scale: smaller confetti
    fx.confetti?.geometry?.scale(0.4, 0.4, 0.4);
    env.sun.position.set(-3, 8, 6);
    env.sun.shadow.camera.left = env.sun.shadow.camera.bottom = -4;
    env.sun.shadow.camera.right = env.sun.shadow.camera.top = 4;
    env.sun.shadow.mapSize.set(2048, 2048);
    env.sun.shadow.bias = -0.0005;
    env.sun.shadow.normalBias = 0.02;
    env.sun.shadow.camera.updateProjectionMatrix();
    const tone = (f, d, o) => {
      if (sound?.ctx && !sound.muted) sound.tone(f, sound.ctx.currentTime, d, o);
    };
    const quack = (k = 1) => {
      tone(620 * k, 0.12, { type: 'square', gain: 0.06, slideTo: 420 * k });
      setTimeout(() => tone(560 * k, 0.1, { type: 'square', gain: 0.05, slideTo: 380 * k }), 110);
    };

    // ---------------------------------------------------------------- room (static parts are baked at the end)
    const world = new THREE.Group();
    scene.add(world);
    const planks = pattern(256, 256, '#e8c497', (c, w, h) => {
      for (let i = 0; i < 8; i++) {
        c.fillStyle = i % 2 ? '#e0b987' : '#eccb9f';
        c.fillRect(0, (i * h) / 8, w, h / 8 - 3);
      }
    }, 6, 6);
    const floor = mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ map: planks, roughness: 0.9 }), { cast: false });
    floor.rotation.x = -Math.PI / 2;
    world.add(floor);
    const paper = pattern(128, 128, '#dff3ec', (c) => {
      c.fillStyle = '#cdebe0';
      for (let i = 0; i < 4; i++) c.fillRect(i * 32 + 12, 0, 8, 128);
    }, 7, 2.5);
    const wall = mesh(new THREE.PlaneGeometry(14, 5), new THREE.MeshStandardMaterial({ map: paper, roughness: 0.9 }), { cast: false });
    at(wall, 0, 2.5, -1.3);
    world.add(wall);
    world.add(at(box(14, 0.16, 0.06, COL.white), 0, 0.08, -1.27));
    // Pegboard with the neon name, fairy lights, a window and plants
    world.add(at(rbox(3.4, 1.35, 0.05, mat(COL.navy), 0.06), 0, 1.6, -0.62));
    const neon = planeTex(1.3, 0.4, neonTex('Homama', '#7fe0ff', { w: 512, h: 160 }), { basic: true, transparent: true, toneMapped: false });
    world.add(at(neon, -0.25, 1.98, -0.59));
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), 22);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 22; i++) {
      m4.makeTranslation(-1.6 + (i / 21) * 3.2, 2.2 - Math.abs(Math.sin((i / 21) * Math.PI * 3)) * 0.12, -0.58);
      bulbs.setMatrixAt(i, m4);
      bulbs.setColorAt(i, new THREE.Color(['#ffd166', '#ff9eb5', '#7fe0d0', '#c7a6ff'][i % 4]));
    }
    world.add(bulbs);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), new THREE.MeshBasicMaterial({ map: cityWindowTex() }));
    world.add(at(rbox(1.7, 1.3, 0.08, COL.white, 0.04), 2.9, 1.9, -1.26), at(win, 2.9, 1.9, -1.21));
    world.add(at(rbox(1.0, 1.3, 0.08, COL.white, 0.04), -2.7, 1.9, -1.26));
    const win2 = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.1), win.material);
    world.add(at(win2, -2.7, 1.9, -1.21));
    const bigPlant = makePlant('tall', 1.5, COL.white);
    bigPlant.position.set(-2.1, 0, -0.6);
    const plant2 = makePlant('round', 0.9, COL.coral);
    plant2.position.set(2.95, 0, -1.0);
    world.add(bigPlant, plant2);

    // ---------------------------------------------------------------- the desk
    const desk = buildDesk({ angled: false, W: 2.9, D, H, flatSize: 0.8, kbX: -0.82, riser: true });
    world.add(desk.group);
    desk.duck.removeFromParent();
    desk.props.laptop.removeFromParent();
    desk.props.succ.position.set(-1.36, H, -0.36);
    desk.props.cactus.position.set(1.36, H, -0.08);
    desk.props.photo.position.set(1.3, H + 0.11, 0.2);
    desk.props.photo.rotation.set(-0.15, -0.5, 0);
    desk.props.hp.position.set(-1.3, H, -0.05);
    desk.mug.position.set(-1.27, H, 0.3);
    desk.props.lamp.position.set(1.36, H, -0.42);
    // Middle monitor shows the feature being built
    const feature = drawScreen(desk.screens.mid.w / desk.screens.mid.h, drawFeature, 512);
    desk.screens.mid.screen.material.map = feature.tex;
    desk.screens.mid.screen.material.needsUpdate = true;
    const pipe = desk.screens.pipe;

    // Deploy button
    const deploy = new THREE.Group();
    deploy.add(at(rbox(0.3, 0.07, 0.25, mat(COL.ink), 0.03), 0, 0.035, 0));
    const labelTex = canvasTexture(256, 64, (c, w, h) => {
      c.fillStyle = '#2b2f3a';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.font = `700 44px ${FONT}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('DEPLOY', w / 2, h / 2 + 2);
    });
    const label = mesh(new THREE.PlaneGeometry(0.24, 0.06), new THREE.MeshBasicMaterial({ map: labelTex }), { cast: false });
    label.position.set(0, 0.036, 0.126);
    deploy.add(label);
    const domeMat = umat(COL.coral, { rough: 0.25, emissive: COL.coral, ei: 0.35 });
    const dome = mesh(new THREE.SphereGeometry(0.085, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    dome.position.y = 0.07;
    deploy.add(dome);
    const deployGlow = glowSprite('#ff9eb5', 0.5);
    deployGlow.position.y = 0.14;
    deploy.add(deployGlow);
    deploy.position.set(DEPLOY.u, H, ZF - DEPLOY.v);
    scene.add(deploy);
    ctx.util.bakeStatic(world, [...desk.dynamic, neon, bulbs], mergeGeometries);

    // ---------------------------------------------------------------- Homama and Roji
    const homama = ctx.makeKid('homama');
    homama.pose = 'sit';
    homama.hands = 'type';
    homama.root.position.set(desk.seat.x, desk.seat.y, desk.seat.z);
    homama.root.rotation.y = Math.PI;
    const roji = ctx.makeKid('roji');
    roji.root.position.set(2.15, 0, -0.8);
    roji.root.rotation.y = -0.45;
    scene.add(homama.root, roji.root);
    homama.onEmoteFx = roji.onEmoteFx = (type, k) => fx.heartsAt(k.head.localToWorld(new THREE.Vector3(0, 0.75, 0)), 4);

    // ---------------------------------------------------------------- surface helpers
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const UP = V(0, 1, 0);
    const OUT = V(0, 0, 1);
    const smooth = (a, b, x) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    // Position and normal of surface point (u, v), lifted along the normal
    function surf(u, v, lift = 0, out = V(), nrm = V()) {
      const k = smooth(LD - 0.05, LD + 0.05, v);
      nrm.copy(UP).lerp(OUT, k).normalize();
      if (v <= LD) out.set(u, H, ZF - v);
      else out.set(u, H + (v - LD), WZ);
      return out.addScaledVector(nrm, lift);
    }
    const tmpP = V();
    const tmpN = V();
    const tmpF = V();
    const tmpR = V();
    const basis = new THREE.Matrix4();
    function orient(obj, u, v, du, dv, lift, scale = 1) {
      surf(u, v, lift, tmpP, tmpN);
      const k = smooth(LD - 0.05, LD + 0.05, v);
      tmpF.set(du * (1 - k) + du * k, dv * k, -dv * (1 - k));
      tmpF.addScaledVector(tmpN, -tmpF.dot(tmpN));
      if (tmpF.lengthSq() < 1e-6) tmpF.set(0, -k, k - 1).addScaledVector(tmpN, -tmpN.dot(tmpF));
      tmpF.normalize();
      tmpR.crossVectors(tmpN, tmpF);
      basis.makeBasis(tmpR, tmpN, tmpF);
      obj.quaternion.setFromRotationMatrix(basis);
      obj.position.copy(tmpP);
      obj.scale.setScalar(scale);
    }
    // Screen ray -> (u, v) on the folded surface, or null
    const ray = new THREE.Raycaster();
    function pickSurface(ndc) {
      ray.setFromCamera(ndc, camera);
      const o = ray.ray.origin;
      const d = ray.ray.direction;
      if (Math.abs(d.z) > 1e-4) {
        const t = (WZ - o.z) / d.z;
        const y = o.y + d.y * t;
        if (t > 0 && y >= H && y <= H + (VMAX - LD) + 0.15) return { u: o.x + d.x * t, v: LD + (y - H) };
      }
      if (Math.abs(d.y) > 1e-4) {
        const t = (H - o.y) / d.y;
        const z = o.z + d.z * t;
        if (t > 0 && z >= WZ - 0.02 && z <= ZF + 0.25) return { u: o.x + d.x * t, v: ZF - z };
      }
      return null;
    }
    const clampU = (u) => Math.max(-UMAX, Math.min(UMAX, u));
    const clampV = (v) => Math.max(0.02, Math.min(VMAX - 0.04, v));

    // ---------------------------------------------------------------- bugs
    const G = bugGeos(THREE);
    const darkMat = mat('#3b2b3f');
    const whiteMat = mat('#ffffff');
    const pupilMat = mat('#1d130f');
    const hitGeo = new THREE.SphereGeometry(0.11, 8, 6);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const bugs = [];
    const pool = [];
    function makeBug(kind) {
      const g = new THREE.Group();
      const shell = mesh(G.shell, mat(KINDS[kind].color, { rough: 0.35 }));
      const legs = mesh(G.legs, darkMat, { cast: false });
      g.add(shell, mesh(G.dark, darkMat), mesh(G.eyes, whiteMat, { cast: false }), mesh(G.pupils, pupilMat, { cast: false }), legs);
      const hit = new THREE.Mesh(hitGeo, hitMat);
      hit.position.y = 0.04;
      g.add(hit);
      scene.add(g);
      const b = { g, legs, hit, kind };
      hit.userData.bug = b;
      return b;
    }
    function spawnBug(kind, speed) {
      const i = pool.findIndex((p) => p.kind === kind);
      const b = i >= 0 ? pool.splice(i, 1)[0] : makeBug(kind);
      const mon = [-0.84, 0, 0.84][Math.floor(Math.random() * 3)];
      Object.assign(b, {
        u: mon + (Math.random() - 0.5) * 0.62,
        v: LD + 0.27 + Math.random() * 0.36,
        du: 0,
        dv: -1,
        hp: KINDS[kind].hp,
        speed: speed * KINDS[kind].speed * (0.9 + Math.random() * 0.2),
        phase: Math.random() * 10,
        wig: 0.5 + Math.random() * 0.6,
        born: 0,
        dead: -1,
        hurt: 0,
      });
      b.g.visible = true;
      bugs.push(b);
      orient(b.g, b.u, b.v, 0, -1, 0.004, 0.001);
      sparks(b.u, b.v, ['#7fe0ff', '#ffffff'], 5, 0.02);
      return b;
    }
    function removeBug(b) {
      b.g.visible = false;
      bugs.splice(bugs.indexOf(b), 1);
      pool.push(b);
    }

    // ---------------------------------------------------------------- particles and splats
    const starTex = canvasTexture(64, 64, (c) => {
      c.fillStyle = '#ffffff';
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 ? 11 : 28;
        c.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
      }
      c.fill();
    });
    const parts = [];
    for (let i = 0; i < 48; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false }));
      s.visible = false;
      scene.add(s);
      parts.push({ s, life: 0, v: V() });
    }
    let partNext = 0;
    function sparks(u, v, colors, n = 8, size = 0.04) {
      surf(u, v, 0.05, tmpP, tmpN);
      for (let i = 0; i < n; i++) {
        const p = parts[partNext];
        partNext = (partNext + 1) % parts.length;
        p.life = 1;
        p.size = size * (0.7 + Math.random() * 0.6);
        p.s.visible = true;
        p.s.position.copy(tmpP);
        p.s.material.color.set(colors[i % colors.length]);
        const a = Math.random() * Math.PI * 2;
        p.v.set(Math.cos(a), Math.sin(a), Math.sin(a)).multiplyScalar(0.6 + Math.random() * 0.6);
        p.v.addScaledVector(tmpN, 0.8 + Math.random() * 0.6);
      }
    }
    const splatTex = canvasTexture(128, 128, (c) => {
      c.fillStyle = '#ffffff';
      c.beginPath();
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const r = i % 2 ? 30 : 44 + (i % 3) * 8;
        c.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
      }
      c.fill();
    });
    const splats = [];
    for (let i = 0; i < 12; i++) {
      const m = mesh(new THREE.CircleGeometry(0.075, 16), new THREE.MeshBasicMaterial({ map: splatTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), { cast: false });
      m.visible = false;
      scene.add(m);
      splats.push({ m, life: 0 });
    }
    let splatNext = 0;
    function splat(u, v, color, scale = 1) {
      const sp = splats[splatNext];
      splatNext = (splatNext + 1) % splats.length;
      surf(u, v, 0.003, tmpP, tmpN);
      sp.m.position.copy(tmpP);
      sp.m.quaternion.setFromUnitVectors(OUT, tmpN);
      sp.m.rotateZ(Math.random() * 6);
      sp.m.scale.setScalar(scale);
      sp.m.material.color.set(color).lerp(new THREE.Color('#ffffff'), 0.25);
      sp.m.visible = true;
      sp.life = 1;
    }

    // ---------------------------------------------------------------- the duck cursor
    const duck = makeDuck(0.2);
    const duckRoot = new THREE.Group();
    duckRoot.add(duck);
    scene.add(duckRoot);
    const ring = mesh(new THREE.RingGeometry(0.11, 0.145, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }), { cast: false });
    scene.add(ring);
    const cur = { u: 0.15, v: LD * 0.55, stomp: 0, cool: 0, tu: null, tv: null };

    // ---------------------------------------------------------------- power-ups
    const pows = [];
    function makePow(kind) {
      const g = new THREE.Group();
      const item = kind === 'coffee' ? makeMug(COL.coral, COL.white, 1.9) : makeDuck(0.12);
      if (kind === 'duck') item.traverse((o) => o.material && o.material.color?.getHexString() === 'ffd23f' && (o.material = umat('#ffc93c', { rough: 0.25, metal: 0.35, emissive: '#ffb000', ei: 0.35 })));
      g.add(item);
      const halo = mesh(new THREE.RingGeometry(0.1, 0.13, 28), new THREE.MeshBasicMaterial({ color: kind === 'coffee' ? '#ffd166' : '#fff3a0', transparent: true, opacity: 0.9, depthWrite: false }), { cast: false });
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.004;
      g.add(halo);
      const glow = glowSprite(kind === 'coffee' ? '#ffd9a0' : '#fff3a0', 0.42);
      glow.position.y = 0.1;
      g.add(glow);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), hitMat);
      hit.position.y = 0.08;
      g.add(hit);
      scene.add(g);
      const p = { g, kind, item, halo, hit, life: 7, u: 0, v: 0 };
      hit.userData.pow = p;
      return p;
    }
    function spawnPow(kind) {
      const p = makePow(kind);
      p.u = -0.25 + Math.random() * 1.25;
      p.v = 0.3 + Math.random() * 0.32;
      if (Math.hypot(p.u - DEPLOY.u, p.v - DEPLOY.v) < 0.3) p.u -= 0.45;
      p.g.position.copy(surf(p.u, p.v));
      pows.push(p);
      tone(990, 0.1, { gain: 0.05 });
      tone(1320, 0.14, { gain: 0.04 });
    }
    function takePow(p) {
      pows.splice(pows.indexOf(p), 1);
      p.g.removeFromParent();
      sparks(p.u, p.v, ['#ffd166', '#ffffff', '#ff9eb5'], 12, 0.05);
      roji.emote('heart');
      if (p.kind === 'coffee') {
        st.slow = 6;
        sound.ui('coin');
        hud.message('Coffee! Bugs slow down', 1300);
      } else {
        quack(1.2);
        sound.ui('good');
        hud.message('Rubber duck! All clear', 1300);
        st.ripple = 0;
        for (const b of [...bugs]) if (b.dead < 0) squash(b, true);
      }
    }

    // ---------------------------------------------------------------- state
    const st = { running: false, over: false, progress: 0, health: 5, squashed: 0, spawn: 1.2, slow: 0, powT: 11, powKind: 'coffee', wave: 0, fail: 0, shake: 0, combo: [], ripple: -1, ship: -1, time: 0 };
    const best = ctx.load('best', 0);
    let disposed = false;
    let lastScore = '';
    let lastFeature = -1;
    let pipeKey = '';

    function drawFeature(c, w, h, k = 0, shipped = false, t = 0) {
      c.fillStyle = shipped ? '#15382f' : '#2a2440';
      c.fillRect(0, 0, w, h);
      c.textBaseline = 'middle';
      c.textAlign = 'left';
      c.fillStyle = '#9a8fbf';
      c.font = `600 ${h * 0.07}px ${FONT}`;
      c.fillText('NEW FEATURE', w * 0.06, h * 0.1);
      c.fillStyle = '#ffffff';
      c.font = `600 ${h * 0.1}px ${FONT}`;
      c.fillText("Reminders for Roji's clinic", w * 0.06, h * 0.22);
      // Code lines appearing as Homama types
      const lines = ['function remind(patient) {', "  send(patient, 'See you soon!');", '  return true;', '}', "test('reminders', () => {", '  expect(remind(p)).toBe(true);', '});'];
      const typed = Math.floor(k * lines.length * 1.0001 * 1.6);
      c.font = `600 ${h * 0.062}px ui-monospace, 'DejaVu Sans Mono', monospace`;
      for (let i = 0; i < lines.length; i++) {
        const full = Math.min(lines.length, typed);
        if (i > full) break;
        let txt = lines[i];
        if (i === full) txt = txt.slice(0, Math.floor(((k * lines.length * 1.6) % 1) * txt.length)) + (Math.floor(t * 3) % 2 ? '|' : '');
        c.fillStyle = i < 4 ? '#7fe0d0' : '#ffd166';
        c.fillText(txt, w * 0.06, h * (0.34 + i * 0.065));
      }
      // Progress bar
      const bx = w * 0.06;
      const by = h * 0.82;
      const bw = w * 0.88;
      const bh = h * 0.1;
      c.fillStyle = 'rgba(255,255,255,0.12)';
      roundRect(c, bx, by, bw, bh, bh / 2);
      c.fill();
      if (k > 0.01) {
        const gr = c.createLinearGradient(bx, 0, bx + bw, 0);
        gr.addColorStop(0, '#21a99a');
        gr.addColorStop(1, '#7ee8a8');
        c.fillStyle = gr;
        roundRect(c, bx, by, Math.max(bh, bw * k), bh, bh / 2);
        c.fill();
      }
      c.fillStyle = '#ffffff';
      c.textAlign = 'right';
      c.font = `700 ${h * 0.1}px ${FONT}`;
      c.fillText(shipped ? 'Shipped!' : `${Math.floor(k * 100)}%`, w * 0.94, h * 0.1);
    }

    function updateHud() {
      const hearts = Array.from({ length: 5 }, (_, i) => `<svg width="15" height="15" viewBox="0 0 24 24" style="vertical-align:-2px"><path d="${HEART}" fill="${i < st.health ? '#ef5b6f' : '#e6d8dc'}"/></svg>`).join('');
      const slow = st.slow > 0 ? ` &nbsp;<span style="color:#c27a1a">Coffee ${Math.ceil(st.slow)}s</span>` : '';
      const html = `Feature <b>${Math.floor(st.progress * 100)}%</b> &nbsp; Bugs <b>${st.squashed}</b> &nbsp; ${hearts}${slow}`;
      if (html !== lastScore) {
        hud.score(html);
        lastScore = html;
      }
    }

    function pipeStates() {
      const p = st.progress;
      const s = [0.25, 0.5, 0.75, 1].map((edge, i) => (p >= edge ? 'ok' : p >= edge - 0.25 ? 'run' : 'wait'));
      if (st.ship >= 0) return st.ship > 1.6 ? ['ok', 'ok', 'ok', 'ok'] : ['ok', 'ok', 'ok', 'run'];
      if (st.fail > 0) {
        const i = s.indexOf('run');
        if (i >= 0) s[i] = 'fail';
      }
      return s;
    }

    // ---------------------------------------------------------------- actions
    function squash(b, silent = false) {
      if (b.dead >= 0) return;
      b.hp--;
      const col = KINDS[b.kind].color;
      if (b.hp > 0) {
        b.hurt = 0.3;
        sparks(b.u, b.v, [col, '#ffffff'], 5);
        tone(330, 0.08, { type: 'triangle', gain: 0.07 });
        return;
      }
      b.dead = 0;
      st.squashed++;
      if (st.running) st.progress = Math.min(1, st.progress + 0.004);
      splat(b.u, b.v, col, KINDS[b.kind].scale);
      sparks(b.u, b.v, [col, '#ffffff', '#ffd166'], 8);
      if (!silent) {
        sound.ui('pop');
        st.combo.push(st.time);
        st.combo = st.combo.filter((x) => st.time - x < 1.4);
        if (st.combo.length >= 3) {
          st.combo = [];
          hud.message('Combo!', 900);
          roji.emote('cheer');
          tone(880, 0.1, { gain: 0.05 });
          tone(1175, 0.16, { gain: 0.05 });
        }
      }
    }
    function stomp(u, v) {
      cur.u = clampU(u);
      cur.v = clampV(v);
      cur.stomp = 1;
      cur.cool = 0.1;
      let hit = false;
      for (const b of [...bugs]) {
        if (b.dead >= 0) continue;
        const r = 0.15 * KINDS[b.kind].scale;
        if (Math.hypot(b.u - cur.u, (b.v - cur.v) * 1.1) < r) {
          squash(b);
          hit = true;
        }
      }
      for (const p of [...pows]) if (Math.hypot(p.u - cur.u, p.v - cur.v) < 0.17) takePow(p);
      if (!hit) tone(240, 0.06, { type: 'triangle', gain: 0.05 });
      else quack(1 + Math.random() * 0.15);
    }

    function startShip() {
      st.running = false;
      st.ship = 0;
      st.progress = 1;
      hud.hint('');
    }

    // ---------------------------------------------------------------- start: countdown while the scene runs
    hud.buttons({ action: 'Squash', jump: null });
    hud.hint('Click or tap a bug. Or steer the duck with WASD or arrows and press Space');
    updateHud();
    feature.redraw(0, false, 0);
    pipe.redraw(['wait', 'wait', 'wait', 'wait'], 0);
    (async () => {
      hud.message(ctx.me === 'roji' ? 'Help Homama ship it!' : 'Squash the bugs!', 1500);
      await new Promise((r) => setTimeout(r, 1600));
      if (disposed) return;
      await hud.countdown(3);
      if (disposed) return;
      st.running = true;
    })();

    // ---------------------------------------------------------------- camera
    const camTarget = V(0.25, 0.98, -0.05);
    const camDir = V(0.1, 0.8, 0.62).normalize();
    function placeCamera(dt) {
      const a = camera.aspect;
      const dist = Math.max(5.0 / a, 2.25) + 0.3;
      camera.position.copy(camTarget).addScaledVector(camDir, dist);
      if (st.shake > 0) {
        st.shake -= dt;
        camera.position.x += (Math.random() - 0.5) * 0.03;
        camera.position.y += (Math.random() - 0.5) * 0.03;
      }
      camera.lookAt(camTarget);
      if (camera.fov !== 45) {
        camera.fov = 45;
        camera.updateProjectionMatrix();
      }
    }

    // ---------------------------------------------------------------- frame
    const tmpW = V();
    function update(dt, t) {
      st.time += dt;
      const slowK = st.slow > 0 ? 0.35 : 1;
      if (st.slow > 0) st.slow = Math.max(0, st.slow - dt);
      st.fail = Math.max(0, st.fail - dt);

      // Input: steer the duck, stomp with A / Space, or tap anywhere
      const ax = input.axis();
      if (st.running) {
        const sp = input.held('run') ? 2.2 : 1.5;
        if (Math.abs(ax.x) + Math.abs(ax.y) > 0.05) {
          cur.u = clampU(cur.u + ax.x * sp * dt);
          cur.v = clampV(cur.v + ax.y * sp * dt);
        }
        if ((input.pressed('action') || input.pressed('jump') || input.pressed('e')) && cur.cool <= 0) stomp(cur.u, cur.v);
        for (const tap of input.taps()) {
          const hits = input.pick([...bugs.filter((b) => b.dead < 0).map((b) => b.hit), ...pows.map((p) => p.hit)], tap.ndc);
          const h = hits[0]?.object;
          if (h?.userData.bug) stomp(h.userData.bug.u, h.userData.bug.v);
          else if (h?.userData.pow) stomp(h.userData.pow.u, h.userData.pow.v);
          else {
            const s = pickSurface(tap.ndc);
            if (s) stomp(s.u, s.v);
          }
        }
      }
      cur.cool -= dt;

      // Typing and waves
      if (st.running) {
        st.progress = Math.min(1, st.progress + dt / ROUND);
        let w = 0;
        for (let i = 0; i < WAVES.length; i++) if (st.progress >= WAVES[i].at) w = i;
        if (w !== st.wave) {
          st.wave = w;
          hud.message(`Wave ${w + 1}`, 1100);
          roji.emote('cheer');
          tone(660, 0.12, { gain: 0.05 });
          tone(880, 0.18, { gain: 0.05 });
        }
        st.spawn -= dt * slowK;
        if (st.spawn <= 0 && bugs.length < 14) {
          const W = WAVES[st.wave];
          st.spawn = W.every * (0.8 + Math.random() * 0.4);
          const r = Math.random();
          const kind = st.wave >= 3 && r < 0.18 ? 'big' : st.wave >= 1 && r < 0.42 ? 'zip' : r < 0.7 ? 'lady' : 'beetle';
          spawnBug(kind, W.speed);
          if (st.wave >= 3 && Math.random() < 0.3) spawnBug('lady', W.speed);
        }
        st.powT -= dt;
        if (st.powT <= 0 && pows.length === 0) {
          spawnPow(st.powKind);
          st.powKind = st.powKind === 'coffee' ? 'duck' : 'coffee';
          st.powT = 12 + Math.random() * 5;
        }
        if (st.progress >= 1) startShip();
      }

      // Bugs crawl toward Deploy
      for (const b of [...bugs]) {
        if (b.dead >= 0) {
          b.dead += dt;
          const k = Math.min(1, b.dead / 0.12);
          orient(b.g, b.u, b.v, b.du, b.dv, 0.004, KINDS[b.kind].scale);
          b.g.scale.set(KINDS[b.kind].scale * (1 + k * 0.5), KINDS[b.kind].scale * (1 - k * 0.85), KINDS[b.kind].scale * (1 + k * 0.5));
          if (b.dead > 0.35) removeBug(b);
          continue;
        }
        b.born = Math.min(1, b.born + dt * 3);
        b.hurt = Math.max(0, b.hurt - dt);
        if (st.running) {
          const tx = DEPLOY.u - b.u;
          const ty = DEPLOY.v - b.v;
          const d = Math.hypot(tx, ty) || 1;
          const px = -ty / d;
          const py = tx / d;
          const wig = Math.sin(t * 3 * b.wig + b.phase) * 0.55 * Math.min(1, d * 2);
          const sp = b.speed * slowK * (b.hurt > 0 ? 0.3 : 1);
          b.du = tx / d + px * wig;
          b.dv = ty / d + py * wig;
          const n = Math.hypot(b.du, b.dv) || 1;
          b.u += (b.du / n) * sp * dt;
          b.v += (b.dv / n) * sp * dt;
          if (d < 0.09) {
            // A bug got into the build
            removeBug(b);
            st.health--;
            st.fail = 1.2;
            st.shake = 0.3;
            st.progress = Math.max(0, st.progress - 0.03);
            sound.ui('bad');
            sparks(DEPLOY.u, DEPLOY.v, ['#ef5b6f', '#3b2b3f'], 8);
            hud.message(st.health > 0 ? 'A bug got in!' : 'Build broken', 1000);
            if (st.health <= 0) {
              st.running = false;
              st.over = true;
              setTimeout(() => {
                if (disposed) return;
                ctx.finish({ win: false, score: st.squashed, title: 'The bugs got in', text: `Homama reached ${Math.floor(st.progress * 100)}%. Squash them before they reach Deploy. You squashed ${st.squashed} bugs.` });
              }, 1400);
            }
            continue;
          }
        } else if (st.over) {
          // Little victory dance for the bugs
          b.du = Math.sin(t * 6 + b.phase);
          b.dv = Math.cos(t * 6 + b.phase);
        }
        const sc = KINDS[b.kind].scale * (0.2 + 0.8 * b.born) * (1 + Math.sin(t * 14 + b.phase) * 0.04);
        orient(b.g, b.u, b.v, b.du, b.dv, 0.004 + Math.abs(Math.sin(t * 18 + b.phase)) * 0.006, sc);
        b.legs.rotation.y = Math.sin(t * 22 + b.phase) * 0.35;
      }

      // Ship it: the duck presses Deploy, the pipeline turns green, confetti
      if (st.ship >= 0) {
        const prev = st.ship;
        st.ship += dt;
        if (prev === 0)
          for (const b of [...bugs]) {
            b.hp = 1;
            squash(b, true);
          }
        if (prev < 0.7 && st.ship >= 0.7) {
          cur.u = DEPLOY.u;
          cur.v = DEPLOY.v + 0.01;
          cur.stomp = 1;
          quack(1.1);
          sound.ui('good');
        }
        if (prev < 1.6 && st.ship >= 1.6) {
          domeMat.color.set('#3fd07f');
          domeMat.emissive.set('#3fd07f');
          deployGlow.material.color.set('#9ff5c0');
          surf(0.1, 0.9, 0.6, tmpW);
          fx.burst(tmpW, ['#ef5b6f', '#ffd166', '#7fd3a7', '#6fb8ff', '#ff9eb5', '#c7a6ff'], 160);
          hud.message('Shipped!', 1800);
          roji.emote('cheer');
          fx.heartsAt(homama.head.localToWorld(V(0, 0.75, 0)), 5);
        }
        if (prev < 3.4 && st.ship >= 3.4) {
          roji.hands = 'wave2';
          fx.heartsAt(roji.head.localToWorld(V(0, 0.75, 0)), 5);
        }
        if (prev < 4.2 && st.ship >= 4.2) {
          const newBest = st.squashed > best;
          if (newBest) ctx.save('best', st.squashed);
          ctx.finish({
            win: true,
            score: st.squashed,
            title: 'Feature shipped!',
            text: `Reminders for Roji's clinic are live and the pipeline is green. You squashed <b>${st.squashed}</b> bugs${newBest && best > 0 ? ', a new best!' : best > 0 ? ` (best ${best})` : ''}.`,
          });
        }
      }

      // Duck cursor
      cur.stomp = Math.max(0, cur.stomp - dt * 4.5);
      const dip = Math.sin(cur.stomp * Math.PI);
      surf(cur.u, cur.v, 0, tmpP, tmpN);
      const onWall = cur.v > LD;
      const hover = 0.16 - dip * 0.15 + Math.sin(t * 3) * 0.012;
      duckRoot.position.copy(tmpP).addScaledVector(tmpN, onWall ? 0.05 + hover * 0.6 : hover);
      if (onWall) duckRoot.position.y -= 0.1;
      duck.scale.set(1 + dip * 0.25, 1 - dip * 0.3, 1 + dip * 0.25);
      duckRoot.rotation.set(onWall ? -0.35 - dip * 0.4 : 0, Math.sin(t * 1.7) * 0.25 - 0.2, Math.sin(t * 2.3) * 0.06);
      ring.position.copy(surf(cur.u, cur.v, 0.004, tmpW, tmpN));
      ring.quaternion.setFromUnitVectors(OUT, tmpN);
      ring.scale.setScalar(1 + Math.sin(t * 6) * 0.06 + dip * 0.4);
      ring.material.opacity = st.running ? 0.85 : 0.35;

      // Power-ups bob and expire
      for (const p of [...pows]) {
        p.life -= dt;
        p.item.position.y = 0.03 + Math.sin(t * 4) * 0.02;
        p.item.rotation.y = t * 1.5;
        p.halo.scale.setScalar(1 + Math.sin(t * 5) * 0.1);
        p.g.visible = p.life > 2 || Math.sin(t * 20) > 0;
        if (p.life <= 0 || !st.running) {
          pows.splice(pows.indexOf(p), 1);
          p.g.removeFromParent();
        }
      }

      // Sparks and splats
      for (const p of parts) {
        if (p.life <= 0) continue;
        p.life -= dt * 2.2;
        p.v.multiplyScalar(1 - dt * 3);
        p.s.position.addScaledVector(p.v, dt * 0.5);
        p.s.scale.setScalar(p.size * (0.5 + p.life));
        p.s.material.opacity = Math.max(0, p.life);
        if (p.life <= 0) p.s.visible = false;
      }
      for (const sp of splats) {
        if (sp.life <= 0) continue;
        sp.life -= dt * 0.7;
        sp.m.material.opacity = Math.min(0.9, sp.life * 1.5);
        if (sp.life <= 0) sp.m.visible = false;
      }

      // Screens, keyboard, the Deploy glow
      desk.update(dt, t, { idlePipeline: false });
      const fk = Math.floor(st.progress * 200);
      if (fk !== lastFeature || st.ship >= 0 || Math.floor(t * 3) !== Math.floor((t - dt) * 3)) {
        lastFeature = fk;
        feature.redraw(st.progress, st.ship > 1.6, t);
      }
      const ps = pipeStates();
      const key = ps.join() + (ps.includes('run') ? Math.floor(t * 4) : '');
      if (key !== pipeKey) {
        pipeKey = key;
        pipe.redraw(ps, t, st.ship > 1.6 ? 'Shipped!' : null);
      }
      deployGlow.material.opacity = 0.45 + Math.sin(t * 4) * 0.2 + (st.fail > 0 ? 0.3 : 0);
      deployGlow.material.color.set(st.fail > 0 ? '#ff5f6d' : st.ship > 1.6 ? '#9ff5c0' : '#ff9eb5');

      // Characters
      homama.hands = st.over ? null : 'type';
      homama.update(dt, t, 0, 0, 0);
      roji.update(dt, t, 0, 0, 0);
      updateHud();
      placeCamera(dt);
    }

    return {
      state: st,
      update,
      dispose() {
        disposed = true;
      },
      // Test hooks for the dev harness
      debug: { spawnBug: (k = 'lady') => spawnBug(k, WAVES[st.wave].speed), spawnPow, stomp, surf, cursor: cur, pows, bugs },
    };
  },
};
