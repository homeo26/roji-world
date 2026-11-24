import { THREE, mat, umat, mesh, box, rbox, cyl, sph, tor, at, rot, canvasTexture, sprite, bake } from './kit.js';
import { rng } from '../../util.js';

// Bathroom: a clawfoot bubble bath with a rubber duck, a sink with a round mirror, the toilet, towels.

const TBX = 6.9; // tub centre
const TBZ = -3.82;
const SKX = 8.55; // sink
const TOX = 9.68; // toilet
const lathe = (pts, m, seg = 28) => mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), m);

function bubbleTex() {
  return canvasTexture(64, 64, (ctx) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(200,235,255,0.25)';
    ctx.beginPath();
    ctx.arc(32, 32, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(22, 22, 7, 4, -0.7, 0, Math.PI * 2);
    ctx.fill();
  });
}

function mirrorTex() {
  return (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#f2fbff');
    g.addColorStop(1, '#bfe0ee');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (const [x, wd] of [[30, 16], [58, 7]]) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + wd, 0);
      ctx.lineTo(x + wd - 50, h);
      ctx.lineTo(x - 50, h);
      ctx.fill();
    }
  };
}

export function buildBathroom(R) {
  const { add, L, api } = R;
  const ZB = L.ZB;
  const P = Math.PI;
  const r = rng(9);
  const st = { bathT: 0, brushT: 0, attached: [] };
  const porcelain = mat('#ffffff', { rough: 0.25 });
  const chrome = mat('#d7e1ea', { metal: 0.6, rough: 0.25 });
  const gold = mat('#f4c24f', { metal: 0.6, rough: 0.3 });

  // ---------------------------------------------------------------- clawfoot tub
  const tub = lathe([[0.42, 0.12], [0.52, 0.2], [0.555, 0.45], [0.56, 0.6], [0.53, 0.64], [0.47, 0.62], [0.465, 0.45], [0.42, 0.24], [0.3, 0.19], [0, 0.18]], porcelain);
  tub.scale.set(1.8, 1, 1);
  add(at(tub, TBX, 0, TBZ));
  add(at(lathe([[0.555, 0.3], [0.562, 0.36], [0, 0.36]], mat('#ffb8cc', { rough: 0.4 })), TBX, 0.0, TBZ)).scale.set(1.81, 1, 1.01);
  for (const [dx, dz] of [[-0.68, -0.28], [0.68, -0.28], [-0.68, 0.28], [0.68, 0.28]]) add(at(sph(0.07, gold, undefined, 10), TBX + dx, 0.07, TBZ + dz)).scale.set(1, 1, 1.3);
  const water = umat('#9fdcf0', { rough: 0.08, emissive: '#7fd0ea', ei: 0.15 });
  const wm = add(at(mesh(new THREE.CircleGeometry(0.465, 28), water, { cast: false }), TBX, 0.5, TBZ));
  wm.rotation.x = -P / 2;
  wm.scale.set(1.8, 1, 1);
  // Faucet on the back rim
  add(at(cyl(0.025, 0.03, 0.22, chrome, 8), TBX - 0.65, 0.74, TBZ - 0.42));
  add(rot(at(tor(0.08, 0.022, chrome, undefined, P, 6, 10), TBX - 0.65, 0.85, TBZ - 0.34), 0, -P / 2, 0));
  for (const s of [-1, 1]) add(at(sph(0.035, s < 0 ? '#ef5b6f' : '#6fb8ff', undefined, 8), TBX - 0.65 + s * 0.09, 0.82, TBZ - 0.45));
  // Candles on the rim
  for (const dx of [0.62, 0.74]) {
    add(at(cyl(0.035, 0.035, 0.08, '#fff1d6', 10), TBX + dx, 0.68, TBZ - 0.4));
    add(at(sph(0.015, mat('#ffcf6b', { emissive: '#ffb347', ei: 1.4 }), undefined, 6), TBX + dx, 0.735, TBZ - 0.4)).scale.set(1, 1.6, 1);
  }
  R.col({ type: 'box', x: TBX, z: TBZ, hw: 1.0, hd: 0.55, h: 0.64 });

  // Bubbles (always a few, a mountain during a bubble bath)
  const bubbleGeo = new THREE.SphereGeometry(1, 12, 9);
  const bubbles = [];
  for (let i = 0; i < 70; i++) {
    const a = r() * P * 2;
    const rr = Math.sqrt(r()) * 0.42;
    bubbles.push({ x: Math.cos(a) * rr * 1.8, z: Math.sin(a) * rr, s: 0.05 + r() * 0.08, ph: r() * 6, lift: r() });
  }
  const bim = R.dyn(add(new THREE.InstancedMesh(bubbleGeo, mat('#ffffff', { rough: 0.25, emissive: '#ffffff', ei: 0.12 }), bubbles.length)));
  bim.position.set(TBX, 0.5, TBZ);
  const c = new THREE.Color();
  bubbles.forEach((b, i) => bim.setColorAt(i, c.set(['#ffffff', '#fff0f6', '#eaf7ff', '#ffffff'][i % 4])));
  bim.instanceColor.needsUpdate = true;
  bim.castShadow = false;
  const floaters = [];
  const btex = bubbleTex();
  for (let i = 0; i < 9; i++) {
    const s = R.dyn(add(sprite(btex, { scale: 0.14 })));
    s.visible = false;
    floaters.push({ s, ph: i / 9, dx: (r() - 0.5) * 1.4 });
  }
  // Rubber duck
  const duck = R.dyn(new THREE.Group());
  duck.add(at(sph(0.09, '#ffd23f', { rough: 0.35 }, 12), 0, 0.05, 0));
  duck.children[0].scale.set(1.2, 0.85, 1);
  duck.add(at(sph(0.06, '#ffd23f', { rough: 0.35 }, 12), 0.06, 0.14, 0));
  duck.add(rot(at(cyl(0.012, 0.03, 0.05, '#ff8a3d', 8), 0.12, 0.13, 0), 0, 0, -P / 2));
  duck.add(at(sph(0.012, '#1d130f', undefined, 6), 0.09, 0.17, 0.035), at(sph(0.012, '#1d130f', undefined, 6), 0.09, 0.17, -0.035));
  duck.position.set(TBX + 0.35, 0.5, TBZ + 0.18);
  add(bake(duck));

  // Towels on a rail and a little window
  add(rot(at(cyl(0.015, 0.015, 1.4, chrome, 6), TBX, 1.62, ZB + 0.08), 0, 0, P / 2));
  for (const [dx, col, stripe] of [[-0.35, '#ff9eb5', '#ffffff'], [0.35, '#7fc9ee', '#ffffff']]) {
    add(at(rbox(0.5, 0.7, 0.05, col, 0.025), TBX + dx, 1.3, ZB + 0.1));
    add(at(box(0.5, 0.05, 0.055, stripe), TBX + dx, 1.08, ZB + 0.1));
    add(at(box(0.5, 0.05, 0.055, stripe), TBX + dx, 1.0, ZB + 0.1));
  }
  R.windowAt(TBX, 2.35, 0.8, 0.6, '#bfe3ee');
  // Bath mat
  add(at(rbox(1.2, 0.02, 0.6, '#ffb8cc', 0.01), TBX, 0.01, TBZ + 1.0));
  for (let i = 0; i < 6; i++) add(at(cyl(0.04, 0.04, 0.006, '#ffffff', 10), TBX - 0.45 + i * 0.18, 0.022, TBZ + 1.0 + (i % 2 ? 0.12 : -0.12)));

  // ---------------------------------------------------------------- sink and mirror
  add(at(cyl(0.09, 0.14, 0.72, porcelain, 14), SKX, 0.36, ZB + 0.32));
  const basin = add(at(lathe([[0.12, 0.66], [0.27, 0.78], [0.3, 0.87], [0.26, 0.88], [0.22, 0.8], [0.0, 0.76]], porcelain, 24), SKX, 0, ZB + 0.34));
  basin.scale.set(1, 1, 0.8);
  add(at(cyl(0.02, 0.025, 0.16, chrome, 8), SKX, 0.95, ZB + 0.15));
  add(rot(at(cyl(0.015, 0.015, 0.12, chrome, 6), SKX, 1.02, ZB + 0.2), P / 2, 0, 0));
  add(at(cyl(0.04, 0.035, 0.1, '#c7a6ff', 10), SKX - 0.22, 0.92, ZB + 0.2));
  for (const [dx, col] of [[-0.012, '#ff8fb1'], [0.012, '#6fb8ff']]) add(rot(at(cyl(0.008, 0.008, 0.2, col, 5), SKX - 0.22 + dx, 1.02, ZB + 0.2), 0, 0, dx * 12));
  add(at(rbox(0.1, 0.03, 0.06, '#ffe6f0', 0.012), SKX + 0.2, 0.89, ZB + 0.2));
  add(at(tor(0.36, 0.035, gold, undefined, P * 2, 8, 28), SKX, 1.68, ZB + 0.05));
  add(at(R.atlas.wrap(new THREE.CircleGeometry(0.36, 28), 128, 128, mirrorTex()), SKX, 1.68, ZB + 0.04));
  add(at(rbox(0.7, 0.04, 0.14, '#ffffff', 0.01), SKX, 1.22, ZB + 0.08));
  for (const [dx, col, h] of [[-0.22, '#ff9eb5', 0.16], [-0.08, '#9fd6e3', 0.12], [0.08, '#ffd166', 0.14], [0.22, '#c7a6ff', 0.1]]) add(at(cyl(0.035, 0.04, h, col, 10), SKX + dx, 1.24 + h / 2, ZB + 0.08));
  R.col({ type: 'circle', x: SKX, z: ZB + 0.32, r: 0.32 });

  // ---------------------------------------------------------------- toilet
  add(at(cyl(0.13, 0.16, 0.36, porcelain, 16), TOX, 0.18, ZB + 0.45)).scale.set(1, 1, 1.25);
  add(at(lathe([[0.15, 0.3], [0.2, 0.42], [0.18, 0.44], [0.0, 0.42]], porcelain, 20), TOX, 0, ZB + 0.5)).scale.set(1, 1, 1.25);
  add(at(tor(0.15, 0.03, '#fff7fb', undefined, P * 2, 6, 20), TOX, 0.455, ZB + 0.52)).rotation.x = P / 2;
  add(rot(at(rbox(0.36, 0.42, 0.04, '#fff7fb', 0.02), TOX, 0.66, ZB + 0.3), -0.25, 0, 0));
  add(at(rbox(0.46, 0.5, 0.2, porcelain, 0.05), TOX, 0.75, ZB + 0.12));
  add(at(cyl(0.035, 0.035, 0.02, chrome, 10), TOX, 1.01, ZB + 0.12));
  add(at(cyl(0.07, 0.07, 0.12, '#ffffff', 12), 10.03, 0.72, ZB + 0.9)).rotation.x = P / 2;
  // Plant and a rolled towel on the tank
  add(at(cyl(0.06, 0.05, 0.1, '#e07a55', 10), TOX - 0.12, 1.05, ZB + 0.12));
  for (let k = 0; k < 3; k++) add(at(sph(0.05, '#5aa84f', { rough: 0.8 }, 8), TOX - 0.12 + (k - 1) * 0.03, 1.14 + (k % 2) * 0.03, ZB + 0.12)).scale.set(0.7, 1.4, 0.7);
  add(rot(at(cyl(0.05, 0.05, 0.2, '#ff9eb5', 10), TOX + 0.1, 1.05, ZB + 0.12), 0, 0, P / 2));
  R.col({ type: 'box', x: TOX, z: ZB + 0.4, hw: 0.25, hd: 0.36 });
  // Laundry basket
  add(at(cyl(0.22, 0.18, 0.45, '#d9b38c', 14), 9.8, 0.225, -2.2));
  add(at(tor(0.22, 0.025, '#c49464', undefined, P * 2, 6, 16), 9.8, 0.45, -2.2)).rotation.x = P / 2;
  add(at(sph(0.12, '#7fb0ff', undefined, 8), 9.75, 0.47, -2.18)).scale.set(1, 0.5, 1);
  add(at(sph(0.1, '#ff9eb5', undefined, 8), 9.88, 0.49, -2.24)).scale.set(1, 0.5, 1);
  R.col({ type: 'circle', x: 9.8, z: -2.2, r: 0.24 });

  // ---------------------------------------------------------------- activities
  const crown = () => {
    const g = new THREE.Group();
    for (const [x, y, z, s] of [[0, 0.64, -0.02, 0.09], [0.08, 0.6, 0.05, 0.06], [-0.09, 0.61, 0.04, 0.07], [0.02, 0.7, 0.06, 0.05]]) g.add(at(sph(s, '#ffffff', { rough: 0.25, emissive: '#ffffff', ei: 0.15 }, 10), x, y, z));
    return g;
  };
  function bath(a) {
    const spec = R.start('bath', {
      label: 'Get out',
      seats: [
        { who: 'roji', x: TBX - 0.6, z: TBZ, y: -0.15, yaw: P / 2, pose: 'sit' },
        { who: 'homama', x: TBX + 0.6, z: TBZ, y: -0.15, yaw: -P / 2, pose: 'sit' },
      ],
      focus: { x: TBX, z: TBZ + 0.2, y: 0.9, zoom: 0.48 },
      music: 0.6,
      exit: { x: TBX - 0.4, z: TBZ + 1.25 },
      update(dt) {
        st.bathT += dt;
        if (Math.floor(st.bathT / 3.5) !== Math.floor((st.bathT - dt) / 3.5)) {
          a.fx.heartsAt(a.world(TBX, TBZ, 1.5), 2);
          R.sound((s, t0) => s.tone(900 + Math.random() * 500, t0, 0.12, { type: 'sine', gain: 0.05, slideTo: 1600 }));
        }
      },
      onEnd(silent) {
        for (const o of st.attached) o.removeFromParent();
        st.attached = [];
        if (!silent) {
          a.toast('So fresh and so clean!', 2000);
          a.fx.burst(a.world(TBX, TBZ + 1, 1), ['#ffffff', '#bfe8ff', '#ffd6e6'], 30);
        }
      },
    });
    if (!spec) return;
    st.bathT = 0;
    for (const id of ['roji', 'homama']) {
      const cr = crown();
      a[id].kid.head.add(cr);
      st.attached.push(cr);
    }
    a.toast('Splish splash, bubble bath time!', 2400);
  }

  const brushFor = (kid, color) => {
    // A long chibi toothbrush from the right hand up to the mouth, plus a little foam
    const g = new THREE.Group();
    const from = new THREE.Vector3(-0.22, 0.6, 0.27);
    const to = new THREE.Vector3(0.0, 0.98, 0.33);
    const dir = to.clone().sub(from);
    const len = dir.length();
    const handle = cyl(0.018, 0.018, len, color, 8);
    handle.position.copy(from).addScaledVector(dir, 0.5);
    handle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    const head = box(0.035, 0.05, 0.025, '#ffffff');
    head.position.copy(to);
    g.add(handle, head);
    for (const [x, y, s] of [[0.05, 0.97, 0.03], [-0.04, 0.96, 0.025], [0.02, 0.93, 0.02]]) g.add(at(sph(s, '#ffffff', undefined, 8), x, y, 0.34));
    kid.body.add(g);
    return g;
  };
  function brush(a) {
    const spec = R.start('brush', {
      label: 'Stop brushing',
      seats: [
        { who: 'player', x: SKX - 0.46, z: ZB + 0.98, yaw: P / 2, pose: 'stand', hands: 'hold' },
        { who: 'partner', x: SKX + 0.46, z: ZB + 0.98, yaw: -P / 2, pose: 'stand', hands: 'hold' },
      ],
      focus: { x: SKX, z: ZB + 0.9, y: 1.2, zoom: 0.46 },
      exit: { x: SKX, z: ZB + 1.6 },
      update(dt, t) {
        st.brushT += dt;
        for (const g of st.attached) g.position.x = Math.sin(t * 20) * 0.012;
        if (st.brushT > 5 && !st.clean) {
          st.clean = true;
          for (const who of [a.player, a.partner]) a.fx.burst(R.headPos(who), ['#ffffff', '#bfe8ff'], 14);
          a.sound.ui('coin');
          a.toast('Sparkly clean smiles!', 2200);
          R.later(1.2, () => R.is('brush') && a.endActivity());
        }
      },
      onEnd() {
        for (const o of st.attached) o.removeFromParent();
        st.attached = [];
      },
    });
    if (!spec) return;
    st.brushT = 0;
    st.clean = false;
    st.attached.push(brushFor(a.roji.kid, '#ff8fb1'), brushFor(a.homama.kid, '#6fb8ff'));
    a.toast('Brush, brush, brush! Two minutes... or five seconds.', 2400);
  }

  R.hot(
    { x: TBX, z: TBZ + 1.3, r: 1.3, label: 'Bubble bath', icon: 'bath', act: bath },
    { x: SKX, z: ZB + 1.45, r: 1.1, label: 'Brush teeth', icon: 'tooth', act: brush },
  );

  const m4 = new THREE.Matrix4();
  const v = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  let foam = 0.4;
  R.upd((dt, t) => {
    const on = R.is('bath');
    foam += ((on ? 1 : 0.4) - foam) * Math.min(1, dt * 1.5);
    bubbles.forEach((b, i) => {
      const k = b.s * (0.6 + foam * 0.8) * (1 + Math.sin(t * 2 + b.ph) * 0.12);
      v.set(b.x, 0.02 + b.lift * 0.2 * foam, b.z);
      m4.compose(v, q, sc.setScalar(k));
      bim.setMatrixAt(i, m4);
    });
    bim.instanceMatrix.needsUpdate = true;
    duck.position.y = 0.5 + 0.12 * foam + Math.sin(t * 2.2) * 0.015;
    duck.rotation.set(Math.sin(t * 1.7) * 0.08, Math.sin(t * 0.4) * 0.6, Math.sin(t * 2.2) * 0.06);
    for (const f of floaters) {
      f.s.visible = on;
      if (!on) continue;
      const k = (t * 0.25 + f.ph) % 1;
      f.s.position.set(TBX + f.dx + Math.sin(k * 6 + f.ph * 10) * 0.12, 0.7 + k * 1.8, TBZ + Math.cos(f.ph * 10) * 0.2);
      f.s.scale.setScalar(0.08 + f.ph * 0.1);
      f.s.material.opacity = k < 0.9 ? 1 : (1 - k) * 10;
    }
  });
  R.onExit(() => {
    for (const o of st.attached) o.removeFromParent();
    st.attached = [];
  });
}
