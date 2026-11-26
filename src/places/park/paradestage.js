import { THREE, P, inst, garland, wire, fitText, roundRect, drawStar, heartPath, drawLogo, FONT } from './parts.js';
import { starShape } from '../school/kit.js';

// The Parade Stage next to Mimi and Bobo's stage: a little dance stage with four light-up arrow
// tiles that blink to a beat, speaker towers, bunting, two confetti cannons and a "Roji Land Parade"
// sign. A line of gold stars on the ground marks the route the parade float takes round the park.
// On the stage floor, an easter egg: two pairs of painted footprints facing each other, R and H.

export const STAGE = { x: -14.5, z: 3.25, hw: 1.65, hd: 1.15, h: 0.38 };
const BPM = 112;
const ARROWS = [
  { rot: Math.PI / 2, color: '#ff7fa3' }, // left
  { rot: Math.PI, color: '#6fb8ff' }, // down
  { rot: 0, color: '#ffd166' }, // up
  { rot: -Math.PI / 2, color: '#59d6b0' }, // right
];
// which arrows light on each beat (a little dance), 0..3, -1 for none
const STEPS = [0, 3, 0, 3, 1, 2, 1, 2, 0, 1, 2, 3, -1, 3, 2, 1];

function arrowGeo() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.24);
  s.lineTo(0.2, 0.03);
  s.lineTo(0.08, 0.03);
  s.lineTo(0.08, -0.22);
  s.lineTo(-0.08, -0.22);
  s.lineTo(-0.08, 0.03);
  s.lineTo(-0.2, 0.03);
  s.closePath();
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2);
  return g;
}

export function buildParadeStage(ctx, k, shared, route) {
  const { api } = ctx;
  const { atlas, pal, lights } = shared;
  const root = new THREE.Group();
  const dynamic = [];
  const S = STAGE;
  const X0 = S.x - S.hw;
  const X1 = S.x + S.hw;
  const Z0 = S.z - S.hd;
  const Z1 = S.z + S.hd;
  const navy = '#3f4a7a';

  // ------------------------------------------------ the stage
  root.add(k.at(k.rbox(S.hw * 2, S.h, S.hd * 2, P.pink, 0.06), S.x, S.h / 2, S.z));
  root.add(k.at(k.box(S.hw * 2 - 0.1, 0.03, S.hd * 2 - 0.1, P.cream), S.x, S.h + 0.005, S.z));
  // a scalloped skirt of gold dots round the front
  for (let i = 0; i < 12; i++) root.add(k.at(k.sph(0.06, P.gold, undefined, 6), X0 + 0.15 + i * ((S.hw * 2 - 0.3) / 11), S.h - 0.1, Z1 + 0.02));
  root.add(k.at(k.rbox(1.4, 0.19, 0.4, P.lilac, 0.05), S.x, 0.095, Z1 + 0.2));
  // the dance floor: four dark tiles for the arrows
  const TZ = S.z + 0.42;
  const TX = [-1.05, -0.35, 0.35, 1.05].map((d) => S.x + d);
  for (const x of TX) root.add(k.at(k.rbox(0.62, 0.05, 0.62, navy, 0.04), x, S.h + 0.03, TZ));
  const arrows = inst(arrowGeo(), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 4, { cast: false, receive: false });
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const Yax = new THREE.Vector3(0, 1, 0);
  ARROWS.forEach((a, i) => arrows.setMatrixAt(i, m4.compose(v.set(TX[i], S.h + 0.062, TZ), q.setFromAxisAngle(Yax, a.rot), one)));
  arrows.instanceMatrix.needsUpdate = true;
  const base = ARROWS.map((a) => new THREE.Color(a.color));
  const dim = base.map((c) => c.clone().lerp(new THREE.Color(navy), 0.55));
  dim.forEach((c, i) => arrows.setColorAt(i, c));
  arrows.instanceColor.needsUpdate = true;
  root.add(arrows);
  dynamic.push(arrows);
  // The easter egg: painted footprints, a big pair and a small pair facing each other, R and H
  const feet = atlas.panel(1.3, 0.62, 260, 124, (c, w, h) => {
    c.fillStyle = '#fff4e3';
    c.fillRect(0, 0, w, h);
    const foot = (x, y, s, rot) => {
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      c.fillStyle = '#e7c6d3';
      c.beginPath();
      c.ellipse(0, 0, 9 * s, 16 * s, 0, 0, Math.PI * 2);
      c.fill();
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.arc(-6 * s + i * 4 * s, -19 * s - (i === 0 ? 1.5 * s : 0), (i === 0 ? 3 : 2.2) * s, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    };
    // Homama on the left (bigger feet) facing right, Roji on the right facing left
    foot(70, 44, 1.15, Math.PI / 2);
    foot(70, 80, 1.15, Math.PI / 2);
    foot(184, 48, 0.9, -Math.PI / 2);
    foot(184, 76, 0.9, -Math.PI / 2);
    c.fillStyle = '#ff9eb5';
    heartPath(c, w / 2, h / 2 + 2, 22);
    c.fill();
    c.fillStyle = '#c99aac';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 16px ${FONT}`;
    c.fillText('H', 30, h / 2 + 2);
    c.fillText('R', w - 30, h / 2 + 2);
  });
  feet.rotation.x = -Math.PI / 2;
  feet.position.set(S.x, S.h + 0.024, Z0 + 0.62);
  root.add(feet);

  // ------------------------------------------------ the backdrop and the sign
  const BZ = Z0 - 0.08;
  for (const s of [-1, 1]) {
    root.add(k.at(k.rbox(0.26, 2.7, 0.26, P.lilac, 0.06), S.x + s * (S.hw - 0.05), 1.35, BZ));
    // a gold star on each top corner of the sign
    const star = k.star(0.26, 0.12, 0.08, P.gold, { rough: 0.35, metal: 0.4 });
    star.position.set(S.x + s * 1.38, 3.6, BZ + 0.03);
    star.rotation.z = s * 0.2;
    root.add(star);
  }
  root.add(k.at(k.box(S.hw * 2 - 0.2, 2.3, 0.08, '#fff1e4'), S.x, 1.4, BZ - 0.05));
  // a striped curtain look on the back wall
  for (let i = 0; i < 9; i++) {
    const st = k.box(0.18, 2.25, 0.02, i % 2 ? P.blush : '#ffe9f0');
    st.castShadow = false;
    st.position.set(X0 + 0.25 + i * ((S.hw * 2 - 0.5) / 8), 1.4, BZ);
    root.add(st);
  }
  const arch = k.tor(S.hw - 0.05, 0.1, P.pink, Math.PI, undefined, 26, 6);
  arch.scale.set(1, 0.42, 1);
  arch.position.set(S.x, 2.7, BZ);
  root.add(arch);
  root.add(k.at(k.rbox(2.9, 0.82, 0.1, '#9b7be0', 0.05), S.x, 3.1, BZ + 0.02));
  const sign = atlas.panel(2.76, 0.7, 552, 140, (c, w, h) => {
    c.fillStyle = '#c7a6ff';
    roundRect(c, 4, 4, w - 8, h - 8, 40);
    c.fill();
    c.lineWidth = 7;
    c.strokeStyle = '#ffffff';
    c.stroke();
    drawLogo(c, w / 2, 34, 30, { ink: '#ffffff', heart: '#ff5d7a', outline: '#9b7be0', line: 5 });
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = 8;
    c.strokeStyle = '#9b7be0';
    c.font = `700 70px ${FONT}`;
    c.strokeText('Parade', w / 2, 92);
    fitText(c, 'Parade', w / 2, 92, w * 0.62, 70, 700);
    c.fillStyle = '#ffd166';
    for (const [x, y, r] of [[46, h / 2, 18], [w - 46, h / 2, 18], [100, 34, 9], [w - 100, 34, 9]]) {
      drawStar(c, x, y, r);
      c.fill();
    }
  });
  sign.position.set(S.x, 3.1, BZ + 0.08);
  root.add(sign);
  const archPts = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI - (i / 16) * Math.PI;
    archPts.push(new THREE.Vector3(S.x + Math.cos(a) * (S.hw - 0.05), 2.7 + Math.sin(a) * (S.hw - 0.05) * 0.42 + 0.12, BZ + 0.12));
  }
  // speaker towers on the back corners
  for (const s of [-1, 1]) {
    const x = S.x + s * (S.hw - 0.42);
    root.add(k.at(k.rbox(0.56, 1.05, 0.46, '#2e3352', 0.05), x, S.h + 0.53, Z0 + 0.32));
    for (const [y, r] of [[0.32, 0.18], [0.78, 0.13]]) {
      root.add(k.at(k.rot(k.cyl(r, r * 0.55, 0.06, '#c9d2e6', 14, { rough: 0.4 }), Math.PI / 2, 0, 0), x, S.h + y, Z0 + 0.57));
      root.add(k.at(k.sph(r * 0.3, '#3b2b3f', undefined, 8), x, S.h + y, Z0 + 0.6));
    }
  }
  // bunting between two poles at the front
  const poles = [X0 + 0.05, X1 - 0.05];
  for (const x of poles) {
    root.add(k.at(k.cyl(0.05, 0.06, 2.5, P.cream, 8), x, 1.25, Z1 + 0.05));
    root.add(k.at(k.sph(0.09, P.gold, undefined, 10), x, 2.55, Z1 + 0.05));
  }
  const flagPts = garland(new THREE.Vector3(poles[0], 2.4, Z1 + 0.05), new THREE.Vector3(poles[1], 2.4, Z1 + 0.05), 12, 0.35);
  root.add(wire(flagPts, 0.012, '#5a4a52', 14));
  // little pennants facing the street (thin cones read as triangles from the front)
  const FC = ['#ff9eb5', '#ffd166', '#8fd3ff', '#7fd8bf', '#c7a6ff'];
  flagPts.slice(1, -1).forEach((p, i) => {
    const f = k.cone(0.11, 0.24, FC[i % FC.length], 3);
    f.rotation.set(Math.PI, Math.PI / 6, 0);
    f.scale.set(1, 1, 0.25);
    f.position.set(p.x, p.y - 0.13, p.z);
    f.castShadow = false;
    root.add(f);
  });
  // two confetti cannons on the ground in front
  const CAN = [X0 + 0.15, X1 - 0.15].map((x) => ({ x, z: Z1 + 0.75 }));
  for (const c of CAN) {
    for (const s of [-1, 1]) root.add(k.at(k.rot(k.cyl(0.11, 0.11, 0.06, P.gold, 12), 0, 0, Math.PI / 2), c.x + s * 0.16, 0.11, c.z));
    const barrel = k.cyl(0.11, 0.14, 0.5, P.pink, 12);
    barrel.position.set(c.x, 0.33, c.z);
    barrel.rotation.x = -0.35;
    root.add(barrel);
    root.add(k.at(k.tor(0.11, 0.025, P.cream, Math.PI * 2, undefined, 12, 4), c.x, 0.56, c.z - 0.08));
    root.children[root.children.length - 1].rotation.x = Math.PI / 2 - 0.35;
  }
  archPts.forEach((p, i) => lights.push({ p, c: ['#fff3c4', '#ffd1dc', '#c7e9ff'][i % 3], r: 0.06 }));

  // ------------------------------------------------ the parade route: gold stars on the ground
  const routePts = [];
  if (route) {
    const curve = new THREE.CatmullRomCurve3(route.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
    const n = Math.floor(curve.getLength() / 1.5);
    for (let i = 1; i < n; i++) routePts.push(curve.getPointAt(i / n));
  }
  // they glow softly after dark, and share the lit-window material (one draw call for all)
  const sGeo = new THREE.ShapeGeometry(starShape(0.13, 0.06));
  sGeo.rotateX(-Math.PI / 2);
  const starPainted = pal.paint(sGeo, 'star');
  routePts.forEach((p, i) => {
    const st = new THREE.Mesh(starPainted, pal.material);
    st.position.set(p.x, 0.05, p.z);
    st.rotation.y = i * 0.7;
    root.add(st);
  });

  const colliders = [
    { type: 'box', x: S.x, z: S.z, hw: S.hw, hd: S.hd, h: S.h },
    { type: 'box', x: S.x, z: Z1 + 0.2, hw: 0.7, hd: 0.2, h: 0.19 },
    { type: 'box', x: S.x, z: BZ - 0.02, hw: S.hw + 0.05, hd: 0.16 },
    ...[-1, 1].map((s) => ({ type: 'box', x: S.x + s * (S.hw - 0.42), z: Z0 + 0.32, hw: 0.28, hd: 0.23, h: S.h + 1.05 })),
    ...poles.map((x) => ({ type: 'circle', x, z: Z1 + 0.05, r: 0.08 })),
    ...CAN.map((c) => ({ type: 'circle', x: c.x, z: c.z, r: 0.22, h: 0.5 })),
  ];

  const st = { beat: 0, step: 0, pop: 4, wasNear: false };
  const cur = new THREE.Color();
  const pop = () => {
    for (const c of CAN) api.fx.burst(api.world(c.x, c.z - 0.25, 0.9), ['#ff9eb5', '#ffd166', '#8fd3ff', '#c7a6ff', '#7fd8bf', '#ffffff'], 26);
    api.sound.ui('pop');
    setTimeout(() => api.sound.ui('pop'), 120);
  };
  return {
    debug: st,
    root,
    dynamic,
    colliders,
    pop,
    hotspots: [
      {
        x: S.x,
        z: Z1 + 1.35,
        r: 1.4,
        label: 'Dance on stage',
        icon: 'park-parade',
        act: (a) => (a.hasArena('parade') ? a.playArena('parade', { me: a.playerId }) : a.toast('Mimi and Bobo are still practising their steps. Come back soon.', 2400)),
      },
    ],
    update(dt, t, people) {
      // the arrows blink to the beat, brighter when somebody is close
      const beatLen = 60 / BPM;
      st.beat += dt / beatLen;
      const b = Math.floor(st.beat);
      const frac = st.beat - b;
      const lit = STEPS[b % STEPS.length];
      const near = Math.hypot(people[0].x - S.x, people[0].z - S.z) < 6;
      for (let i = 0; i < 4; i++) {
        const on = i === lit ? Math.max(0, 1 - frac * 1.4) : 0;
        cur.copy(dim[i]).lerp(base[i], near ? on : on * 0.6);
        if (on > 0) cur.multiplyScalar(1 + on * 0.35);
        arrows.setColorAt(i, cur);
      }
      arrows.instanceColor.needsUpdate = true;
      // a pop of confetti when the kids walk up to the stage
      st.pop -= dt;
      if (near && !st.wasNear && st.pop <= 0) {
        st.pop = 45;
        pop();
      }
      st.wasNear = near;
    },
  };
}
