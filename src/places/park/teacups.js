import { THREE, P, inst, toGeo, vcMat, smooth, colorBake } from './parts.js';
import { mat } from '../../util.js';
import { sfx } from './music.js';

// Spinning teacups round a giant polka-dot teapot. Ride one together: the cup spins faster and
// faster, Roji laughs all the way round and Homama comes off a little dizzy, stars and all.
// The pink cup has a small heart painted on its side.

const N = 4;
const RING = 2.45;
const SEAT_R = 0.43;

function cupModel(k) {
  const g = new THREE.Group();
  const pts = [[0.5, 0], [0.62, 0.06], [0.82, 0.28], [0.93, 0.56], [0.96, 0.8], [0.9, 0.82]].map(([x, y]) => new THREE.Vector2(x, y));
  const cup = new THREE.Mesh(new THREE.LatheGeometry(pts, 22), mat('#ffffff', { rough: 0.45 }));
  cup.position.y = 0.12;
  g.add(cup);
  g.add(k.at(k.cyl(0.55, 0.55, 0.04, '#ffffff', 20), 0, 0.14, 0));
  g.add(k.at(k.cyl(1.1, 1.0, 0.1, '#ffffff', 24), 0, 0.05, 0));
  g.add(k.at(k.cyl(1.12, 1.12, 0.03, '#f4c24f', 24), 0, 0.11, 0));
  g.add(k.at(k.tor(0.95, 0.04, '#f4c24f', Math.PI * 2, undefined, 22, 4), 0, 0.93, 0));
  g.children[g.children.length - 1].rotation.x = Math.PI / 2;
  // the handle on the outside
  const handle = k.tor(0.2, 0.06, '#ffffff', Math.PI * 1.3, undefined, 12, 6);
  handle.position.set(1.02, 0.55, 0);
  handle.rotation.z = -Math.PI * 0.65;
  g.add(handle);
  // the wheel in the middle you spin it with, and a bench ring
  g.add(k.at(k.cyl(0.07, 0.09, 0.42, '#d3dbe5', 8), 0, 0.35, 0));
  const wheel = k.tor(0.22, 0.035, '#f4c24f', Math.PI * 2, undefined, 16, 6);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.y = 0.58;
  g.add(wheel);
  g.add(k.at(k.cyl(0.05, 0.05, 0.05, '#f4c24f', 8), 0, 0.58, 0));
  const bench = k.tor(0.62, 0.13, '#fff4e3', Math.PI * 2, undefined, 18, 5);
  bench.rotation.x = Math.PI / 2;
  bench.position.y = 0.36;
  g.add(bench);
  return g;
}

export function buildTeacups(ctx, k, at, hooks = {}) {
  const { api } = ctx;
  const root = new THREE.Group();
  root.position.set(at.x, 0, at.z);
  const dynamic = [];
  root.add(k.at(k.cyl(3.95, 4.05, 0.22, '#c9b3f0', 40), 0, 0.11, 0));
  root.add(k.at(k.cyl(4.0, 4.0, 0.05, P.cream, 40), 0, 0.2, 0));
  const rotor = new THREE.Group();
  rotor.position.y = 0.22;
  root.add(rotor);
  dynamic.push(rotor);
  rotor.add(k.at(k.cyl(3.75, 3.75, 0.06, '#bff0dc', 40), 0, 0.03, 0));
  rotor.add(k.at(k.cyl(3.0, 3.0, 0.064, '#fff4e3', 40), 0, 0.03, 0));
  rotor.add(k.at(k.cyl(1.9, 1.9, 0.068, '#ffd1dc', 32), 0, 0.03, 0));
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const dot = k.cyl(0.12, 0.12, 0.072, i % 2 ? P.pink : P.sun, 10);
    dot.position.set(Math.sin(a) * 3.38, 0.03, Math.cos(a) * 3.38);
    dot.castShadow = false;
    rotor.add(dot);
  }
  // The giant teapot in the middle
  const pot = new THREE.Group();
  rotor.add(pot);
  const body = k.sph(1.05, P.pink, undefined, 20);
  body.scale.set(1, 0.82, 1);
  body.position.y = 1.0;
  pot.add(body);
  pot.add(k.at(k.cyl(0.62, 0.7, 0.16, P.gold, 18), 0, 0.18, 0));
  pot.add(k.at(k.cyl(0.55, 0.62, 0.18, P.cream, 18), 0, 1.84, 0));
  const lid = k.sph(0.55, P.pink, undefined, 16);
  lid.scale.set(1, 0.45, 1);
  lid.position.y = 1.92;
  pot.add(lid);
  pot.add(k.at(k.sph(0.16, P.gold), 0, 2.22, 0));
  const spout = k.cyl(0.13, 0.2, 1.05, P.pink, 10);
  spout.position.set(1.05, 1.25, 0);
  spout.rotation.z = -0.9;
  pot.add(spout);
  pot.add(k.at(k.cyl(0.15, 0.13, 0.08, P.gold, 10), 1.48, 1.58, 0));
  const ph = k.tor(0.45, 0.09, P.pink, Math.PI * 1.25, undefined, 16, 6);
  ph.position.set(-1.0, 1.05, 0);
  ph.rotation.z = Math.PI * 0.38;
  pot.add(ph);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + (i % 2) * 0.2;
    const y = i % 2 ? 0.75 : 1.2;
    const rr = Math.sqrt(Math.max(0, 1 - ((y - 1) / 0.86) ** 2)) * 1.04;
    const d = k.sph(0.12, '#ffffff', undefined, 6);
    d.scale.set(1, 1, 0.35);
    d.position.set(Math.sin(a) * rr, y, Math.cos(a) * rr);
    d.lookAt(d.position.clone().multiplyScalar(2).setY(y));
    pot.add(d);
  }
  colorBake(rotor);

  const cGeo = toGeo(cupModel(k));
  const cupMat = vcMat(0.45, { side: THREE.DoubleSide });
  const cups = inst(cGeo, cupMat, N, { colors: ['#ff9eb5', '#8fd3ff', '#ffd166', '#c7a6ff'] });
  rotor.add(cups);
  // The heart on the pink cup
  const heart = k.heart(0.26, 0.04, P.rose);
  const heartHolder = new THREE.Group();
  heart.position.set(0, 0.52, 0.93);
  heart.rotation.x = -0.2;
  heartHolder.add(heart);
  rotor.add(heartHolder);

  const st = { turn: 0, omega: 0.35, spin: new Array(N).fill(0), spinW: [0.7, -0.6, 0.8, -0.75], ride: null, dizzy: 0, giggle: 0 };
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const cupPos = (i, out) => {
    const a = (i / N) * Math.PI * 2;
    return out.set(Math.sin(a) * RING, 0.06, Math.cos(a) * RING);
  };
  // Dizzy stars that circle Homama's head after the ride
  const stars = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const s = k.star(0.09, 0.04, 0.03, P.sun, { emissive: '#ffb347', ei: 0.4 });
    s.position.set(Math.cos((i / 3) * Math.PI * 2) * 0.32, 0, Math.sin((i / 3) * Math.PI * 2) * 0.32);
    stars.add(s);
  }
  stars.visible = false;
  root.add(stars);
  dynamic.push(stars);

  function start() {
    // The cup nearest the front
    let best = 0;
    let bd = Infinity;
    const w = new THREE.Vector3();
    rotor.updateMatrixWorld(true);
    for (let i = 0; i < N; i++) {
      cupPos(i, w);
      rotor.localToWorld(w);
      const z = -w.z;
      if (z < bd) {
        bd = z;
        best = i;
      }
    }
    st.ride = { i: best, t: 0 };
    api.activity({
      label: 'Get out',
      endOnMove: false,
      music: 0.5,
      seats: [
        { who: 'roji', x: at.x, z: at.z + 2.5, y: 0.6, pose: 'sit' },
        { who: 'homama', x: at.x, z: at.z + 2.4, y: 0.6, pose: 'sit' },
      ],
      focus: { x: at.x, z: at.z + 1.2, y: 1.0, zoom: 0.7 },
      exit: { x: at.x - 0.4, z: at.z + 4.7 },
      onEnd: () => {
        const was = st.ride;
        st.ride = null;
        api.roji.kid.mouth.scale.set(1, 1, 1);
        if (was && was.t > 6) {
          st.dizzy = 4.5;
          sfx.dizzy(api.sound);
          api.toast('Roji is still laughing. Homama is very, very dizzy.', 2800);
        }
      },
    });
  }

  const kp = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  return {
    debug: st,
    root,
    dynamic,
    colliders: [{ type: 'circle', x: at.x, z: at.z, r: 4.05 }],
    hotspots: [{ x: at.x + 0.6, z: at.z + 4.7, r: 1.5, label: 'Spin the teacups', icon: 'park-cup', act: () => start() }],
    update(dt, t) {
      const R = st.ride;
      if (R) R.t += dt;
      const fast = R ? smooth(R.t / 3) * (1 - smooth((R.t - 14) / 3)) : 0;
      const wantOmega = 0.35 + fast * 0.5;
      st.omega += (wantOmega - st.omega) * Math.min(1, dt * 2);
      st.turn += st.omega * dt;
      rotor.rotation.y = st.turn;
      for (let i = 0; i < N; i++) {
        const boost = R && R.i === i ? 1 + fast * 4.5 : 1;
        st.spin[i] += st.spinW[i] * boost * dt;
        cupPos(i, v);
        q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, st.spin[i]);
        cups.setMatrixAt(i, m4.compose(v, q, one));
        if (i === 0) {
          heartHolder.position.copy(v);
          heartHolder.quaternion.copy(q);
        }
      }
      cups.instanceMatrix.needsUpdate = true;
      if (R) {
        rotor.updateMatrixWorld(true);
        cupPos(R.i, v);
        for (const [w, side] of [['roji', 0], ['homama', Math.PI]]) {
          const a = api[w];
          const ang = st.spin[R.i] + side + Math.PI / 2;
          kp.set(v.x + Math.sin(ang) * SEAT_R, v.y + 0.3, v.z + Math.cos(ang) * SEAT_R);
          rotor.localToWorld(kp);
          a.kid.root.position.copy(kp);
          const yaw = st.turn + ang + Math.PI;
          a.kid.root.rotation.set(0, yaw, 0);
          a.pos.set(kp.x, 0, kp.z);
          a.y = kp.y;
          a.yaw = yaw;
        }
        // Roji laughs, Homama gets dizzier
        const rk = api.roji.kid;
        const hk = api.homama.kid;
        const laugh = Math.min(1, fast * 1.5);
        rk.mouth.scale.set(1 + 0.3 * laugh, 1 + (0.8 + Math.sin(t * 18) * 0.3) * laugh, 1);
        rk.head.rotation.x -= 0.3 * laugh;
        rk.body.rotation.x = -0.15 * laugh;
        hk.head.rotation.z += Math.sin(t * 5) * 0.25 * fast;
        hk.head.rotation.x += Math.cos(t * 5) * 0.15 * fast;
        hk.body.rotation.z = Math.sin(t * 2.5) * 0.12 * fast;
        st.giggle -= dt;
        if (laugh > 0.5 && st.giggle <= 0) {
          st.giggle = 1.8 + Math.random();
          sfx.giggle(api.sound, 900 + Math.random() * 200);
        }
        if (R.t > 18) api.endActivity();
      }
      // After the ride: stars round Homama's head and a wobble
      if (st.dizzy > 0) {
        st.dizzy -= dt;
        const hk = api.homama.kid;
        const k2 = Math.min(1, st.dizzy);
        hk.head.rotation.z += Math.sin(t * 4) * 0.22 * k2;
        hk.body.rotation.z += Math.sin(t * 3) * 0.1 * k2;
        hk.head.updateMatrixWorld(true);
        hk.head.getWorldPosition(kp);
        stars.visible = true;
        stars.position.copy(root.worldToLocal(kp.add(v.set(0, 0.95, 0))));
        stars.rotation.y = t * 5;
        stars.scale.setScalar(k2);
      } else stars.visible = false;
    },
  };
}
