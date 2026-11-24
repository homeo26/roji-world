import { THREE, P, bulbs, colorBake, fitText, roundRect, smooth, drawStar, heartPath } from './parts.js';
import { skinify } from '../zoo/rig.js';
import { Tune, TUNES, sfx } from './music.js';

// Roji Land's own mascots: Mimi, a pink bunny in a lilac dress, and Bobo, a blue bear with a red bow
// tie. They wait on their little stage by the castle to meet visitors (a hug, a photo and a dance),
// and every few minutes they parade round the park behind a float with a big heart on it. Roji and
// Homama can join the parade and walk along behind them, waving.

// From the stage along the west lane, down the avenue to the castle plaza, back up and once round the
// carousel, then home along the west lane
const PATH = [
  [-10.8, 6.9],
  [-7.5, 7.5],
  [-4.2, 7.6],
  [-1.5, 6.0],
  [-1.5, 0],
  [-1.5, -7.5],
  [-1.0, -10.2],
  [0.6, -10.4],
  [1.5, -8.6],
  [1.5, -2],
  [1.5, 5.4],
  ...Array.from({ length: 12 }, (_, i) => {
    const a = 2.84 - (i / 11) * 5.01;
    return [Math.sin(a) * 5.0, 11 + Math.cos(a) * 5.0];
  }),
  [-7.5, 8.3],
  [-10.8, 7.5],
];

function mascot(k, kind) {
  const bunny = kind === 'bunny';
  const fur = bunny ? '#ffb3cc' : '#7fb8f0';
  const inner = bunny ? '#ffe3ec' : '#e3f1ff';
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hips = new THREE.Group();
  hips.position.y = 0.55;
  body.add(hips);
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.17, 0.55, 0);
    leg.add(k.at(k.cyl(0.12, 0.13, 0.42, fur, 10), 0, -0.24, 0));
    const foot = k.sph(0.15, inner, undefined, 10);
    foot.scale.set(1, 0.55, 1.45);
    foot.position.set(0, -0.48, 0.06);
    leg.add(foot);
    body.add(leg);
    legs.push(leg);
  }
  const torso = k.sph(0.42, fur, undefined, 16);
  torso.scale.set(1, 1.08, 0.92);
  torso.position.y = 0.98;
  body.add(torso);
  const belly = k.sph(0.3, inner, undefined, 14);
  belly.scale.set(1, 1.1, 0.55);
  belly.position.set(0, 0.94, 0.25);
  body.add(belly);
  if (bunny) {
    const dress = k.cyl(0.36, 0.52, 0.42, '#c7a6ff', 18);
    dress.position.y = 0.78;
    body.add(dress);
    body.add(k.at(k.cyl(0.53, 0.53, 0.05, '#ffffff', 18), 0, 0.58, 0));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      body.add(k.at(k.sph(0.035, '#ffffff', undefined, 6), Math.sin(a) * 0.45, 0.72, Math.cos(a) * 0.45));
    }
    body.add(k.at(k.sph(0.13, '#ffffff', undefined, 10), 0, 0.82, -0.5));
  } else {
    for (const s of [-1, 1]) {
      const bow = k.cone(0.09, 0.16, '#ef5b6f', 8);
      bow.rotation.z = s * Math.PI / 2;
      bow.position.set(s * 0.09, 1.3, 0.34);
      body.add(bow);
    }
    body.add(k.at(k.sph(0.05, '#c73b45', undefined, 8), 0, 1.3, 0.37));
    body.add(k.at(k.sph(0.09, fur, undefined, 8), 0, 0.78, -0.42));
  }
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.4, 1.2, 0);
    arm.add(k.at(k.cyl(0.095, 0.1, 0.42, fur, 8), 0, -0.2, 0));
    arm.add(k.at(k.sph(0.11, inner, undefined, 8), 0, -0.44, 0));
    arm.rotation.z = s * 0.25;
    body.add(arm);
    arms.push(arm);
  }
  const head = new THREE.Group();
  head.position.y = 1.5;
  body.add(head);
  head.add(k.at(k.sph(0.38, fur, undefined, 18), 0, 0, 0));
  const muzzle = k.sph(0.17, inner, undefined, 12);
  muzzle.scale.set(1.2, 0.85, 0.8);
  muzzle.position.set(0, -0.1, 0.3);
  head.add(muzzle);
  head.add(k.at(k.sph(0.055, bunny ? '#ef5b6f' : '#3b2b3f', undefined, 8), 0, -0.04, 0.44));
  for (const s of [-1, 1]) {
    head.add(k.at(k.sph(0.06, '#2a1f2e', undefined, 10), s * 0.14, 0.07, 0.32));
    head.add(k.at(k.sph(0.02, '#ffffff', undefined, 6), s * 0.14 + 0.02, 0.1, 0.375));
    head.add(k.at(k.sph(0.055, '#ff8fb1', undefined, 8), s * 0.24, -0.08, 0.27));
    if (bunny) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.15, 0.3, -0.02);
      ear.rotation.z = -s * 0.18;
      const outer = k.sph(0.1, fur, undefined, 10);
      outer.scale.set(1, 3.2, 0.6);
      outer.position.y = 0.3;
      ear.add(outer);
      const inn = k.sph(0.06, '#ff9eb5', undefined, 8);
      inn.scale.set(1, 3.4, 0.4);
      inn.position.set(0, 0.3, 0.04);
      ear.add(inn);
      head.add(ear);
      if (s > 0) {
        for (const b of [-1, 1]) {
          const bow = k.cone(0.07, 0.13, '#c7a6ff', 8);
          bow.rotation.z = (b * Math.PI) / 2;
          bow.position.set(0.15 + b * 0.08, 0.38, 0.05);
          head.add(bow);
        }
      }
    } else {
      head.add(k.at(k.sph(0.13, fur, undefined, 10), s * 0.28, 0.28, -0.02));
      const ein = k.sph(0.08, inner, undefined, 8);
      ein.scale.z = 0.4;
      ein.position.set(s * 0.28, 0.28, 0.07);
      head.add(ein);
    }
  }
  if (!bunny) {
    head.add(k.at(k.cyl(0.14, 0.16, 0.05, '#3b2b3f', 12), 0.05, 0.37, 0));
    head.add(k.at(k.cyl(0.11, 0.11, 0.18, '#3b2b3f', 12), 0.05, 0.47, 0));
    head.add(k.at(k.cyl(0.115, 0.115, 0.04, '#ef5b6f', 12), 0.05, 0.42, 0));
  }
  root.userData.rig = { body, legs, arms, head };
  return root;
}

function floatModel(k) {
  const g = new THREE.Group();
  g.add(k.at(k.rbox(1.4, 0.45, 2.1, '#ffffff', 0.12), 0, 0.42, 0));
  g.add(k.at(k.box(1.5, 0.1, 2.2, P.gold), 0, 0.66, 0));
  for (const s of [-1, 1]) for (const z of [-0.7, 0.7]) g.add(k.at(k.rot(k.cyl(0.2, 0.2, 0.12, '#3f4a7a', 12), 0, 0, Math.PI / 2), s * 0.7, 0.2, z));
  g.add(k.at(k.rbox(1.2, 0.5, 1.9, '#ffd1dc', 0.1), 0, 0.94, 0));
  const heart = k.heart(1.15, 0.3, P.rose);
  heart.position.set(0, 1.85, -0.25);
  g.add(heart);
  g.add(k.at(k.cyl(0.25, 0.28, 0.9, P.cream, 12), 0, 1.6, 0.6));
  g.add(k.at(k.cone(0.34, 0.6, P.lilac, 12), 0, 2.35, 0.6));
  g.add(k.at(k.sph(0.06, P.gold), 0, 2.68, 0.6));
  for (let i = 0; i < 3; i++) {
    g.add(k.at(k.cyl(0.008, 0.008, 1.1, '#7a6470', 4), -0.5 + i * 0.5, 1.75, -0.85));
    g.add(k.at(k.sph(0.16, ['#ffd166', '#8fd3ff', '#c7a6ff'][i], undefined, 10), -0.5 + i * 0.5, 2.38, -0.85));
  }
  return g;
}

export function buildMascots(ctx, k, atlas, S) {
  const { api } = ctx;
  const root = new THREE.Group();
  const dynamic = [];
  const colliders = [];
  const ST = S.stage;
  // The stage and its sign
  const stage = new THREE.Group();
  stage.position.set(ST.x, 0, ST.z);
  root.add(stage);
  stage.add(k.at(k.cyl(1.55, 1.65, 0.3, P.lilac, 28), 0, 0.15, 0));
  stage.add(k.at(k.cyl(1.58, 1.58, 0.04, P.cream, 28), 0, 0.31, 0));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    stage.add(k.at(k.star(0.1, 0.045, 0.03, P.gold), Math.sin(a) * 1.62, 0.17, Math.cos(a) * 1.62));
    stage.children[stage.children.length - 1].rotation.y = a;
  }
  for (const s of [-1, 1]) stage.add(k.at(k.cyl(0.07, 0.07, 2.9, P.gold, 8), s * 1.5, 1.45, -1.35));
  const arch = k.tor(1.5, 0.08, P.pink, Math.PI, undefined, 24, 6);
  arch.position.set(0, 2.9, -1.35);
  stage.add(arch);
  const sg = atlas.panel(2.4, 0.62, 480, 124, (c, w, h) => {
    c.fillStyle = '#c7a6ff';
    roundRect(c, 4, 4, w - 8, h - 8, 44);
    c.fill();
    c.lineWidth = 7;
    c.strokeStyle = '#ffffff';
    c.stroke();
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Meet Mimi and Bobo', w / 2, h / 2 + 3, w * 0.84, 54);
  });
  sg.position.set(0, 3.2, -1.28);
  stage.add(sg);
  stage.add(k.at(k.rbox(2.5, 0.7, 0.06, '#9b7be0', 0.03), 0, 3.2, -1.33));
  colliders.push({ type: 'circle', x: ST.x, z: ST.z, r: 1.65 });
  for (const s of [-1, 1]) colliders.push({ type: 'circle', x: ST.x + s * 1.5, z: ST.z - 1.35, r: 0.12 });

  // The float, parked by the stage between parades
  const flt = floatModel(k);
  const fb = bulbs(
    Array.from({ length: 14 }, (_, i) => new THREE.Vector3(-0.72 + (i % 7) * 0.24, 0.68, i < 7 ? 1.12 : -1.12)),
    { r: 0.05, colors: ['#fff3c4', '#ffd1dc'] },
  );
  flt.add(fb);
  colorBake(flt, [fb]);
  root.add(flt);
  dynamic.push(flt);
  const FLOAT_HOME = { x: ST.x + 3.0, z: ST.z - 0.6, yaw: Math.PI / 2 };
  flt.position.set(FLOAT_HOME.x, 0, FLOAT_HOME.z);
  flt.rotation.y = FLOAT_HOME.yaw;
  colliders.push({ type: 'circle', x: FLOAT_HOME.x, z: FLOAT_HOME.z, r: 0.95, mover: 'float' });

  // Mimi and Bobo
  const mk = (kind) => {
    const m = mascot(k, kind);
    m.updateMatrixWorld(true);
    for (const sk of skinify(m, { rough: 0.75 })) {
      sk.computeBoundingSphere();
      sk.boundingSphere.radius += 0.6;
      sk.frustumCulled = true;
    }
    root.add(m);
    dynamic.push(m);
    return { root: m, rig: m.userData.rig, kind, x: 0, z: 0, y: 0.3, yaw: 0, walk: 0, wave: 0, dance: 0, hug: 0, s: 0 };
  };
  const mimi = mk('bunny');
  const bobo = mk('bear');
  const HOME = { mimi: { x: ST.x - 0.5, z: ST.z + 0.2 }, bobo: { x: ST.x + 0.5, z: ST.z + 0.2 } };
  colliders.push({ type: 'circle', x: HOME.mimi.x, z: HOME.mimi.z, r: 0.42, mover: 'mimi' }, { type: 'circle', x: HOME.bobo.x, z: HOME.bobo.z, r: 0.42, mover: 'bobo' });

  // The parade route
  const curve = new THREE.CatmullRomCurve3(PATH.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const LEN = curve.getLength();
  const pv = new THREE.Vector3();
  const tv = new THREE.Vector3();
  const atS = (s) => {
    const u = Math.max(0, Math.min(1, s / LEN));
    curve.getPointAt(u, pv);
    curve.getTangentAt(u, tv);
    return { x: pv.x, z: pv.z, yaw: Math.atan2(tv.x, tv.z) };
  };
  const st = { mode: 'home', next: 25, s: 0, speed: 0, tune: null, meet: null, join: null, confetti: 0, waitFor: 0 };

  // Pose the rig: walk cycle, waving, dancing and hugging on top of each other
  const animate = (m, dt, t, moving) => {
    const R = m.rig;
    m.walk += dt * (moving ? 6.5 : 0);
    const w = moving ? 1 : 0;
    m.wk = (m.wk ?? 0) + (w - (m.wk ?? 0)) * Math.min(1, dt * 6);
    const sw = Math.sin(m.walk) * m.wk;
    R.legs[0].rotation.x = sw * 0.6;
    R.legs[1].rotation.x = -sw * 0.6;
    R.body.position.y = Math.abs(Math.cos(m.walk)) * 0.06 * m.wk + Math.sin(t * 2) * 0.012;
    R.body.rotation.set(0, 0, Math.sin(m.walk) * 0.05 * m.wk + Math.sin(t * 1.3 + (m.kind === 'bear' ? 1 : 0)) * 0.03);
    R.head.rotation.set(Math.sin(t * 1.7) * 0.05, Math.sin(t * 0.8) * 0.15, Math.sin(t * 1.1) * 0.06);
    let lz = 0.25 + sw * 0.1;
    let rz = -0.25 - sw * 0.1;
    let lx = -sw * 0.4;
    let rx = sw * 0.4;
    if (m.wave > 0) {
      m.wave -= dt;
      const k2 = Math.min(1, m.wave * 3, (1.8 - m.wave) * 5);
      rz = -0.25 - k2 * (2.3 + Math.sin(t * 12) * 0.35);
      rx = 0;
    }
    if (m.dance > 0) {
      m.dance -= dt;
      const b = t * 7;
      lz = 0.4 + (1 + Math.sin(b)) * 1.0;
      rz = -(0.4 + (1 + Math.sin(b + Math.PI)) * 1.0);
      lx = rx = 0;
      R.body.position.y += Math.abs(Math.sin(b)) * 0.12;
      R.body.rotation.y = Math.sin(t * 3.5) * 0.4;
      R.legs[0].rotation.x = Math.max(0, Math.sin(b)) * -0.5;
      R.legs[1].rotation.x = Math.max(0, -Math.sin(b)) * -0.5;
    }
    if (m.hug > 0) {
      const k2 = m.hug;
      lx = rx = -1.35 * k2;
      lz = 0.25 * (1 - k2) - 0.5 * k2;
      rz = -0.25 * (1 - k2) + 0.5 * k2;
      R.body.rotation.x = 0.1 * k2;
    }
    R.arms[0].rotation.set(lx, 0, lz);
    R.arms[1].rotation.set(rx, 0, rz);
    m.root.position.set(m.x, m.y, m.z);
    m.root.rotation.y = m.yaw;
  };

  const startParade = () => {
    st.mode = 'parade';
    st.s = 0;
    st.speed = 0;
    st.tune = new Tune(api.sound, TUNES.march, { volume: 0.8 });
    st.confetti = 1;
  };

  // Is a kid standing in the way ahead of this point?
  const blocked = (x, z, yaw, people) => {
    for (const p of people) {
      const dx = p.x - x;
      const dz = p.z - z;
      const ahead = dx * Math.sin(yaw) + dz * Math.cos(yaw);
      const side = Math.abs(dx * Math.cos(yaw) - dz * Math.sin(yaw));
      if (ahead > 0 && ahead < 1.9 && side < 1.0) return true;
    }
    return false;
  };

  const meet = (a) => {
    const R = { t: 0, step: 0 };
    st.meet = R;
    const kx = (s) => ST.x + s * 0.5;
    const kz = ST.z + 2.35;
    a.activity({
      label: 'Say goodbye',
      endOnMove: false,
      seats: [
        { who: 'roji', x: kx(-1), z: kz, y: 0, yaw: Math.PI, pose: 'stand' },
        { who: 'homama', x: kx(1), z: kz, y: 0, yaw: Math.PI, pose: 'stand' },
      ],
      focus: { x: ST.x, z: ST.z + 1.6, y: 1.2, zoom: 0.6 },
      exit: { x: ST.x - 0.4, z: ST.z + 2.6 },
      update: (dt) => {
        R.t += dt;
        const T = R.t;
        // they hop down off the stage to the kids
        const down = smooth(T / 0.8) * (1 - smooth((T - 12.2) / 0.8));
        for (const [m, s] of [[mimi, -1], [bobo, 1]]) {
          const home = HOME[m.kind === 'bunny' ? 'mimi' : 'bobo'];
          m.x = home.x + (kx(s) - home.x) * down;
          m.z = home.z + (kz - 0.6 - home.z) * down;
          m.y = 0.3 * (1 - down) + Math.sin(Math.min(1, T / 0.8) * Math.PI) * 0.35 * (T < 0.8 ? 1 : 0);
        }
        if (R.step === 0 && T > 1.0) {
          R.step = 1;
          a.emote('roji', 'hug');
          a.emote('homama', 'hug');
          a.fx.heartsAt(a.roji.kid.root.position.clone().setY(1.7), 4);
          a.toast('A big soft hug from Mimi for Roji, and one from Bobo for Homama.', 2600);
        }
        const hugK = smooth((T - 1.0) / 0.3) * (1 - smooth((T - 3.3) / 0.3));
        mimi.hug = bobo.hug = hugK;
        if (R.step === 1 && T > 3.8) {
          // everybody turns to the camera for a photo
          R.step = 2;
          a.roji.yaw = 0;
          a.homama.yaw = 0;
          mimi.wave = 1.6;
          bobo.wave = 1.6;
          a.emote('roji', 'heart');
          a.emote('homama', 'cheer');
        }
        if (R.step >= 2) {
          for (const m of [mimi, bobo]) m.yaw += (0 - m.yaw) * Math.min(1, dt * 6);
          // stand side by side for the photo: Mimi, Roji, Homama, Bobo
          a.roji.pos.x += (kx(-0.4) + a.space.origin.x - a.roji.pos.x) * Math.min(1, dt * 4);
          a.homama.pos.x += (kx(0.4) + a.space.origin.x - a.homama.pos.x) * Math.min(1, dt * 4);
          mimi.x += (kx(-1.6) - mimi.x) * Math.min(1, dt * 4);
          bobo.x += (kx(1.6) - bobo.x) * Math.min(1, dt * 4);
          mimi.z += (kz - mimi.z) * Math.min(1, dt * 4);
          bobo.z += (kz - bobo.z) * Math.min(1, dt * 4);
        } else {
          mimi.yaw = bobo.yaw = 0;
        }
        if (R.step === 2 && T > 5.2) {
          R.step = 3;
          flashScreen();
          sfx.shutter(a.sound);
          a.toast('Click! A photo with Mimi and Bobo for the album.', 2200);
        }
        if (R.step === 3 && T > 6.6) {
          R.step = 4;
          st.tune = new Tune(a.sound, TUNES.march, { volume: 0.7 });
          a.roji.kid.danceLoop = true;
          a.homama.kid.danceLoop = true;
          a.emote('roji', 'dance');
          a.emote('homama', 'dance');
          mimi.dance = bobo.dance = 5.2;
        }
        if (R.step === 4 && T > 11.8) {
          R.step = 5;
          a.roji.kid.danceLoop = false;
          a.homama.kid.danceLoop = false;
          st.tune?.stop();
          mimi.wave = bobo.wave = 1.6;
          a.emote('roji', 'wave');
          a.emote('homama', 'wave');
        }
        if (T > 13.4) a.endActivity();
        for (const w of ['roji', 'homama']) {
          const o = a[w];
          o.kid.root.position.set(o.pos.x, o.y, o.pos.z);
          o.kid.root.rotation.set(0, o.yaw, 0);
        }
      },
      onEnd: () => {
        st.meet = null;
        st.tune?.stop();
        mimi.hug = bobo.hug = 0;
        mimi.dance = bobo.dance = 0;
        a.roji.kid.danceLoop = false;
        a.homama.kid.danceLoop = false;
      },
    });
  };

  const join = (a) => {
    const J = { t: 0 };
    st.join = J;
    a.activity({
      label: 'Leave the parade',
      endOnMove: true,
      seats: [
        { who: 'roji', x: a.localPos(a.roji).x, z: a.localPos(a.roji).z, y: 0, pose: 'stand' },
        { who: 'homama', x: a.localPos(a.homama).x, z: a.localPos(a.homama).z, y: 0, pose: 'stand' },
      ],
      onEnd: () => {
        st.join = null;
        for (const w of ['roji', 'homama']) {
          a[w].speed = 0;
          a[w].kid.hands = null;
        }
      },
    });
    a.toast('Roji and Homama join the parade behind Mimi and Bobo.', 2400);
  };

  const flashScreen = () => {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:.85;z-index:60;pointer-events:none;transition:opacity .5s';
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => (el.style.opacity = '0')));
    setTimeout(() => el.remove(), 700);
  };

  const hotspots = [
    { x: ST.x, z: ST.z + 2.3, r: 1.5, label: 'Meet Mimi and Bobo', icon: 'park-bunny', when: () => st.mode === 'home' && !st.meet, act: (a) => meet(a) },
    {
      track: () => {
        const p = atS(Math.max(0, st.s - 4.6));
        return { x: p.x, z: p.z };
      },
      r: 2.4,
      label: 'Join the parade',
      icon: 'music',
      when: () => st.mode === 'parade' && !st.join && st.s > 4 && st.s < LEN - 10,
      act: (a) => join(a),
    },
  ];

  const lp = new THREE.Vector3();
  const wp = new THREE.Vector3();
  return {
    debug: st,
    root,
    dynamic,
    colliders,
    hotspots,
    startParade,
    // Where a moving collider is now (local): Mimi, Bobo, or the float. Out of the way while they hug.
    moverAt(id) {
      if (id === 'float') return { x: flt.position.x, z: flt.position.z };
      const m = id === 'mimi' ? mimi : bobo;
      if (st.meet) return { x: m.x, z: m.z - 40 };
      return { x: m.x, z: m.z };
    },
    get parading() {
      return st.mode === 'parade';
    },
    update(dt, t, people) {
      // Parades every few minutes while somebody is near
      const near = people[0].distanceTo(lp.set(0, 0, 0)) < 45;
      if (st.mode === 'home') {
        if (!st.meet) {
          for (const [m, key] of [[mimi, 'mimi'], [bobo, 'bobo']]) {
            m.x = HOME[key].x;
            m.z = HOME[key].z;
            m.y = 0.3;
            m.yaw += (0 - m.yaw) * Math.min(1, dt * 3);
          }
          // a wave when the kids come close
          const d = Math.hypot(people[0].x - ST.x, people[0].z - ST.z);
          st.waveIn = (st.waveIn ?? 2) - dt;
          if (d < 5 && st.waveIn <= 0) {
            st.waveIn = 12;
            mimi.wave = 1.8;
            setTimeout(() => (bobo.wave = 1.8), 500);
          }
          if (near && !api.activityRunning) st.next -= dt;
          if (st.next <= 0) startParade();
        }
        flt.position.x += (FLOAT_HOME.x - flt.position.x) * Math.min(1, dt * 2);
        flt.position.z += (FLOAT_HOME.z - flt.position.z) * Math.min(1, dt * 2);
      } else if (st.mode === 'parade') {
        // the float leads, Mimi and Bobo walk behind, waving
        const lead = atS(st.s);
        const want = blocked(lead.x, lead.z, lead.yaw, st.join ? [] : people) ? 0 : 1.05;
        st.speed += (want - st.speed) * Math.min(1, dt * 3);
        st.s += st.speed * dt;
        st.tune?.update();
        flt.position.set(lead.x, 0, lead.z);
        let dy = lead.yaw - flt.rotation.y;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        flt.rotation.y += dy * Math.min(1, dt * 5);
        for (const [m, back] of [[mimi, 2.0], [bobo, 3.3]]) {
          const p = atS(Math.max(0, st.s - back));
          m.x = p.x;
          m.z = p.z;
          m.y = 0;
          m.yaw = p.yaw;
          if (m.wave <= 0 && Math.random() < dt * 0.25) m.wave = 1.8;
        }
        if (st.confetti > 0 && st.s > 1) {
          st.confetti = 0;
          api.fx.burst(api.world(flt.position.x, flt.position.z, 2.6), ['#ff9eb5', '#ffd166', '#8fd3ff', '#c7a6ff', '#ffffff'], 60);
        }
        if (st.s >= LEN - 0.05) {
          st.mode = 'home';
          st.next = 170 + Math.random() * 40;
          st.tune?.stop();
          st.tune = null;
          if (st.join) api.endActivity();
        }
      }
      // Joining the parade: walk along behind Bobo, waving
      if (st.join && st.mode === 'parade') {
        st.join.t += dt;
        for (const [w, side] of [['roji', -1], ['homama', 1]]) {
          const p = atS(Math.max(0, st.s - 4.6));
          const a = api[w];
          wp.set(p.x + Math.cos(p.yaw) * 0.42 * side, 0, p.z - Math.sin(p.yaw) * 0.42 * side);
          const W = api.world(wp.x, wp.z);
          a.pos.x += (W.x - a.pos.x) * Math.min(1, dt * 6);
          a.pos.z += (W.z - a.pos.z) * Math.min(1, dt * 6);
          a.yaw = p.yaw;
          a.speed = st.speed * 1.3;
          a.kid.root.position.set(a.pos.x, 0, a.pos.z);
          a.kid.root.rotation.set(0, a.yaw, 0);
          a.kid.hands = Math.sin(st.join.t * 0.7 + side) > 0.5 ? 'wave2' : null;
        }
      }
      const moving = st.mode === 'parade' && st.speed > 0.2;
      animate(mimi, dt, t, moving || (st.meet && st.meet.t < 0.8));
      animate(bobo, dt, t, moving || (st.meet && st.meet.t < 0.8));
    },
  };
}
