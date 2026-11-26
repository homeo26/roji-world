import { THREE, P, inst, bulbs, stripes, toGeo, vcMat, colorBake, fitText, roundRect } from './parts.js';
import { mat, umat, mesh } from '../../util.js';
import { sfx } from './music.js';

// Bumper cars under a striped roof. A short, silly ride: Roji and Homama each get a car, Homama keeps
// sneaking up for a gentle bonk and Roji gets him back. Sparks fly off the ceiling grid.

const HW = 4.4; // floor half width (x)
const HD = 2.9; // floor half depth (z)
const N = 6;
const CR = 0.74; // car radius for bumping

function carModel(k) {
  const g = new THREE.Group();
  g.add(k.at(k.rbox(1.15, 0.36, 1.5, '#ffffff', 0.16), 0, 0.3, 0));
  const bump = k.tor(0.62, 0.11, '#3b2b3f', Math.PI * 2, { rough: 0.9 }, 18, 5);
  bump.rotation.x = Math.PI / 2;
  bump.scale.set(1, 1.28, 1);
  bump.position.y = 0.17;
  g.add(bump);
  g.add(k.at(k.rbox(0.8, 0.14, 0.5, '#fff4e3', 0.05), 0, 0.5, -0.25));
  g.add(k.at(k.rbox(0.8, 0.42, 0.14, '#fff4e3', 0.05), 0, 0.68, -0.52));
  g.add(k.at(k.cyl(0.03, 0.03, 0.32, '#3b2b3f', 6), 0, 0.62, 0.35));
  const wheel = k.tor(0.13, 0.025, '#3b2b3f', Math.PI * 2, undefined, 10, 4);
  wheel.rotation.x = -0.9;
  wheel.position.set(0, 0.78, 0.28);
  g.add(wheel);
  for (const s of [-1, 1]) g.add(k.at(k.sph(0.07, '#fff3c4', undefined, 8), s * 0.32, 0.38, 0.75));
  // the pole up to the ceiling grid
  g.add(k.at(k.cyl(0.025, 0.025, 2.35, '#d3dbe5', 5), 0, 1.75, -0.62));
  g.add(k.at(k.cyl(0.05, 0.05, 0.16, '#f4c24f', 6), 0, 2.9, -0.62));
  return g;
}

export function buildBumper(ctx, k, atlas, at) {
  const { api } = ctx;
  const root = new THREE.Group();
  root.position.set(at.x, 0, at.z);
  const dynamic = [];
  // Floor, padded rail and posts
  root.add(k.at(k.box(HW * 2 + 0.6, 0.14, HD * 2 + 0.6, '#5b6fa8', { rough: 0.4, metal: 0.3 }), 0, 0.07, 0));
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 6; j++) {
      const tile = k.box(0.86, 0.005, 0.95, (i + j) % 2 ? '#6a7fb8' : '#5b6fa8', { rough: 0.35, metal: 0.3 });
      tile.position.set(-HW + 0.44 + i * 0.88, 0.143, -HD + 0.48 + j * 0.97);
      tile.castShadow = false;
      root.add(tile);
    }
  }
  const railC = [P.pink, P.sky];
  let ri = 0;
  for (const [x, z, w, d] of [[0, HD + 0.2, HW * 2 + 0.6, 0.26], [0, -HD - 0.2, HW * 2 + 0.6, 0.26], [HW + 0.2, 0, 0.26, HD * 2 + 0.14], [-HW - 0.2, 0, 0.26, HD * 2 + 0.14]]) {
    root.add(k.at(k.rbox(w, 0.42, d, railC[ri++ % 2], 0.1), x, 0.35, z));
  }
  for (const [x, z] of [[-HW - 0.2, -HD - 0.2], [HW + 0.2, -HD - 0.2], [-HW - 0.2, HD + 0.2], [HW + 0.2, HD + 0.2], [0, -HD - 0.2], [0, HD + 0.2]]) {
    root.add(k.at(k.cyl(0.11, 0.13, 3.25, '#3f4a7a', 10), x, 1.75, z));
  }
  // An open roof frame: beams and a wire grid, so the cars stay in view
  for (const z of [-HD - 0.62, HD + 0.62]) root.add(k.at(k.box(HW * 2 + 1.24, 0.18, 0.18, P.cream), 0, 3.42, z));
  for (const x of [-HW - 0.62, HW + 0.62]) root.add(k.at(k.box(0.18, 0.18, HD * 2 + 1.24, P.cream), x, 3.42, 0));
  for (let i = -3; i <= 3; i++) {
    const bar = k.box(0.05, 0.05, HD * 2 + 1.2, '#c9d2e6');
    bar.position.set((i * (HW + 0.6)) / 3.5, 3.34, 0);
    bar.castShadow = false;
    root.add(bar);
  }
  for (let j = -2; j <= 2; j++) {
    const bar = k.box(HW * 2 + 1.2, 0.05, 0.05, '#c9d2e6');
    bar.position.set(0, 3.34, (j * (HD + 0.6)) / 2.5);
    bar.castShadow = false;
    root.add(bar);
  }
  const valTex = stripes('#c7a6ff', '#fff4e3', 20, { w: 640, h: 64, scallop: true });
  valTex.repeat.set(2, 1);
  const valMat = umat('#ffffff', { map: valTex, rough: 0.7, side: THREE.DoubleSide });
  valMat.alphaTest = 0.5;
  for (const [x, z, w, ry] of [[0, HD + 0.62, HW * 2 + 1.24, 0], [0, -HD - 0.62, HW * 2 + 1.24, Math.PI], [HW + 0.62, 0, HD * 2 + 1.24, Math.PI / 2], [-HW - 0.62, 0, HD * 2 + 1.24, -Math.PI / 2]]) {
    const v = mesh(new THREE.PlaneGeometry(w, 0.42), valMat, { cast: false });
    v.position.set(x, 3.14, z);
    v.rotation.y = ry;
    root.add(v);
  }
  const sign = atlas.panel(2.6, 0.62, 520, 124, (c, w, h) => {
    c.fillStyle = '#9b7be0';
    roundRect(c, 4, 4, w - 8, h - 8, 44);
    c.fill();
    c.lineWidth = 8;
    c.strokeStyle = '#ffd166';
    c.stroke();
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'Bumper Cars', w / 2, h / 2 + 3, w * 0.84, 66);
  });
  sign.position.set(0, 4.2, -HD - 0.55);
  root.add(sign);
  root.add(k.at(k.rbox(2.75, 0.75, 0.1, P.violet, 0.05), 0, 4.2, -HD - 0.62));
  for (const s2 of [-1, 1]) root.add(k.at(k.box(0.08, 0.62, 0.08, P.cream), s2 * 1.1, 3.8, -HD - 0.62));
  const bp = [];
  for (let i = 0; i <= 22; i++) bp.push(new THREE.Vector3(-HW - 0.6 + i * ((HW * 2 + 1.2) / 22), 3.6, HD + 0.64));
  const lights = bulbs(bp, { r: 0.07, colors: ['#fff3c4', '#ffd1dc', '#c7e9ff'] });
  root.add(lights);
  dynamic.push(lights);

  // Cars
  const cGeo = toGeo(carModel(k));
  const carColors = ['#ff9eb5', '#8fd3ff', '#ffd166', '#7fd8bf', '#c7a6ff', '#ffb38a'];
  const carMesh = inst(cGeo, vcMat(0.45), N, { cast: false, colors: carColors });
  root.add(carMesh);
  dynamic.push(carMesh);
  const PARK = [];
  for (const [x, z, yaw] of [[-3.2, -1.9, 0.3], [-1.1, -1.95, 0.1], [1.1, -1.95, -0.1], [3.2, -1.9, -0.3], [-3.4, 1.8, 2.6], [3.4, 1.8, -2.6]]) PARK.push({ x, z, yaw });
  const cars = PARK.map((p, i) => ({ x: p.x, z: p.z, yaw: p.yaw, v: 0, vx: 0, vz: 0, target: null, who: null, i, bonk: 0 }));
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const Yax = new THREE.Vector3(0, 1, 0);
  const st = { ride: null, sparks: 0 };
  const rand = (a, b) => a + Math.random() * (b - a);
  const pickTarget = (c) => {
    c.target = { x: rand(-HW + 1, HW - 1), z: rand(-HD + 1, HD - 1) };
    c.retarget = rand(1.8, 3.2);
  };
  const place = () => {
    for (const c of cars) carMesh.setMatrixAt(c.i, m4.compose(v.set(c.x, 0.14, c.z), q.setFromAxisAngle(Yax, c.yaw), one));
    carMesh.instanceMatrix.needsUpdate = true;
  };
  place();

  function start() {
    const rc = cars[0];
    const hc = cars[1];
    rc.who = 'roji';
    hc.who = 'homama';
    rc.x = -1.6;
    rc.z = 0.8;
    rc.yaw = 0.4;
    hc.x = 1.6;
    hc.z = 0.6;
    hc.yaw = -0.6;
    for (const c of [rc, hc]) {
      pickTarget(c);
      c.v = 0;
    }
    st.ride = { t: 0, bonks: 0 };
    api.activity({
      label: 'Get out',
      endOnMove: false,
      music: 0.7,
      seats: [
        { who: 'roji', x: at.x + rc.x, z: at.z + rc.z, y: 0.3, pose: 'drive' },
        { who: 'homama', x: at.x + hc.x, z: at.z + hc.z, y: 0.3, pose: 'drive' },
      ],
      focus: { x: at.x, z: at.z + 0.4, y: 0.8, zoom: 0.82 },
      exit: { x: at.x - 0.4, z: at.z + HD + 0.95 },
      onEnd: () => {
        st.ride = null;
        for (const c of cars) c.who = null;
        api.roji.kid.mouth.scale.set(1, 1, 1);
        api.homama.kid.mouth.scale.set(1, 1, 1);
      },
    });
    api.toast(api.playerId === 'roji' ? 'Watch out, Homama has that look on his face.' : 'Roji is in the pink car. Time for a gentle bonk.', 2400);
  }

  const kp = new THREE.Vector3();
  const sparkAt = new THREE.Vector3();
  return {
    debug: st,
    root,
    dynamic,
    bulbs: lights,
    colliders: [{ type: 'box', x: at.x, z: at.z, hw: HW + 0.35, hd: HD + 0.35 }],
    hotspots: [
      // The bumper cars game, once it is there; until then the short ride
      {
        x: at.x,
        z: at.z + HD + 0.95,
        r: 1.5,
        label: (a) => (a.hasArena('bumpercars') ? 'Bump the cars' : 'Drive the bumper cars'),
        icon: 'park-car',
        act: (a) => (a.hasArena('bumpercars') ? a.playArena('bumpercars', { me: a.playerId }) : start()),
      },
      { x: at.x + 3.0, z: at.z + HD + 0.95, r: 1.2, label: 'Take a quick ride', icon: 'park-car', when: (a) => a.hasArena('bumpercars'), act: () => start() },
    ],
    update(dt, t) {
      const R = st.ride;
      if (R) {
        R.t += dt;
        const rc = cars[0];
        const hc = cars[1];
        for (const c of [rc, hc]) {
          c.retarget -= dt;
          c.bonk = Math.max(0, c.bonk - dt);
          // Homama sneaks up on Roji now and then; Roji pays him back after a bonk
          let tx = c.target.x;
          let tz = c.target.z;
          const other = c === rc ? hc : rc;
          const chase = c === hc ? Math.sin(R.t * 0.45) > -0.2 : c.revenge > 0;
          if (chase) {
            tx = other.x;
            tz = other.z;
          }
          if (c.revenge > 0) c.revenge -= dt;
          if (c.retarget <= 0) pickTarget(c);
          const want = Math.atan2(tx - c.x, tz - c.z);
          let d = want - c.yaw;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          c.yaw += Math.max(-2.2 * dt, Math.min(2.2 * dt, d));
          const top = R.t > 19 ? 0 : c.bonk > 0 ? 0.6 : 2.3;
          c.v += (top - c.v) * Math.min(1, dt * 1.8);
          c.vx += (Math.sin(c.yaw) * c.v - c.vx) * Math.min(1, dt * 3);
          c.vz += (Math.cos(c.yaw) * c.v - c.vz) * Math.min(1, dt * 3);
          c.x += c.vx * dt;
          c.z += c.vz * dt;
          // walls
          const lim = [HW - CR, HD - CR];
          if (Math.abs(c.x) > lim[0]) {
            c.x = Math.sign(c.x) * lim[0];
            c.vx *= -0.6;
            c.yaw = Math.atan2(-Math.sin(c.yaw), Math.cos(c.yaw));
            pickTarget(c);
          }
          if (Math.abs(c.z) > lim[1]) {
            c.z = Math.sign(c.z) * lim[1];
            c.vz *= -0.6;
            c.yaw = Math.atan2(Math.sin(c.yaw), -Math.cos(c.yaw));
            pickTarget(c);
          }
        }
        // bumps between every pair (parked cars are pushed too)
        for (let i = 0; i < N; i++) {
          for (let j = i + 1; j < N; j++) {
            const a = cars[i];
            const b = cars[j];
            const dx = b.x - a.x;
            const dz = b.z - a.z;
            const dd = Math.hypot(dx, dz);
            if (dd >= CR * 2 || dd < 1e-4) continue;
            const nx = dx / dd;
            const nz = dz / dd;
            const push = (CR * 2 - dd) / 2;
            a.x -= nx * push;
            a.z -= nz * push;
            b.x += nx * push;
            b.z += nz * push;
            const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
            if (rel > 0) {
              a.vx -= nx * rel * 1.1;
              a.vz -= nz * rel * 1.1;
              b.vx += nx * rel * 1.1;
              b.vz += nz * rel * 1.1;
              if (rel > 0.6) {
                sfx.bonk(api.sound, Math.min(1, rel / 2.5));
                for (const c of [a, b]) {
                  c.bonk = 0.5;
                  if (c.who) {
                    const kid = api[c.who].kid;
                    kid.squash = 0.82;
                    c.laugh = 0.8;
                  }
                }
                if (a.who && b.who) {
                  R.bonks++;
                  const victim = a.who === 'roji' ? a : b.who === 'roji' ? b : null;
                  if (victim) victim.revenge = 3;
                  if (R.bonks === 1) api.toast('Bonk! Homama grins. Roji is plotting her revenge.', 2200);
                  if (R.bonks === 3) api.fx.heartsAt(api.roji.kid.root.position.clone().lerp(api.homama.kid.root.position, 0.5).setY(1.6), 4);
                }
                st.sparks = 0.25;
                sparkAt.set(at.x + (a.x + b.x) / 2, 3.2, at.z + (a.z + b.z) / 2);
              }
            }
          }
        }
        // parked cars slide to a stop
        for (const c of cars) {
          if (c.who) continue;
          c.vx *= Math.exp(-3 * dt);
          c.vz *= Math.exp(-3 * dt);
          c.x = Math.max(-HW + CR, Math.min(HW - CR, c.x + c.vx * dt));
          c.z = Math.max(-HD + CR, Math.min(HD - CR, c.z + c.vz * dt));
        }
        if (R.t > 21) api.endActivity();
      } else {
        // idle: the cars drift back to their spots in a row
        for (let i = 0; i < N; i++) {
          const c = cars[i];
          const p = PARK[i];
          c.x += (p.x - c.x) * Math.min(1, dt * 0.8);
          c.z += (p.z - c.z) * Math.min(1, dt * 0.8);
          let d = p.yaw - c.yaw;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          c.yaw += d * Math.min(1, dt * 0.8);
          c.vx = c.vz = 0;
        }
      }
      place();
      if (st.sparks > 0) {
        st.sparks -= dt;
        if (st.sparks > 0.2) api.fx.burst(sparkAt, ['#fff3c4', '#ffd166', '#8fd3ff'], 10);
      }
      if (!R) return;
      for (const c of [cars[0], cars[1]]) {
        const a = api[c.who];
        if (!a) continue;
        const wp = root.localToWorld(kp.set(c.x - Math.sin(c.yaw) * 0.22, 0.14 + 0.3, c.z - Math.cos(c.yaw) * 0.22));
        a.kid.root.position.copy(wp);
        a.kid.root.rotation.set(0, c.yaw, 0);
        a.pos.set(wp.x, 0, wp.z);
        a.y = wp.y;
        a.yaw = c.yaw;
        c.laugh = Math.max(0, (c.laugh || 0) - dt);
        a.kid.mouth.scale.set(1 + c.laugh * 0.3, 1 + c.laugh * 1.0, 1);
      }
    },
  };
}
