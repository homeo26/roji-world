import { THREE, mat, box, rbox, cyl, sph, tor, at, rot, rod, bake, heartGeo, mesh } from './kit.js';

// A cute little bicycle: frame, spoked wheels, crank and pedals, a wicker basket and a bell.
// Bike frame: ground at y = 0, faces +Z. A kid in the 'bike' pose sits with its root at BIKE_SEAT.

export const WHEEL_R = 0.26;
export const BIKE_SEAT = { y: 0.08, z: 0.0 };
const REAR = -0.4;
const FRONT = 0.68;
const CRANK = new THREE.Vector3(0, 0.27, 0.28);

function wheel(color, rim, bead) {
  const g = new THREE.Group();
  g.add(rot(tor(0.23, 0.032, '#3b3542', { rough: 0.85 }, Math.PI * 2, 8, 28), 0, Math.PI / 2, 0));
  g.add(rot(tor(0.198, 0.012, rim, { rough: 0.4, metal: 0.4 }, Math.PI * 2, 6, 28), 0, Math.PI / 2, 0));
  g.add(rot(cyl(0.036, 0.036, 0.09, color, 12), 0, 0, Math.PI / 2));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const sp = rot(cyl(0.006, 0.006, 0.19, '#e8edf2', 4, { rough: 0.4, metal: 0.4 }), a, 0, 0);
    sp.position.set(0, Math.cos(a) * 0.1, Math.sin(a) * 0.1);
    g.add(sp);
    if (i % 3 === 0) g.add(at(sph(0.018, bead, { rough: 0.5 }, 8), 0, Math.cos(a) * 0.15, Math.sin(a) * 0.15));
  }
  return bake(g);
}

// color: frame colour; accent: grips, saddle trim and basket ribbon. item: 'flowers' | 'laptop' | null
export function makeBike(color = '#ff8fb1', { accent = '#ffffff', item = 'flowers' } = {}) {
  const root = new THREE.Group();
  const frame = new THREE.Group();
  root.add(frame);
  const paint = mat(color, { rough: 0.45 });
  const chrome = mat('#dfe6ee', { rough: 0.3, metal: 0.5 });
  const V = (y, z, x = 0) => new THREE.Vector3(x, y, z);
  const tube = (a, b, r = 0.026, m = paint) => frame.add(rod(a, b, r, m, 8));

  // Frame tubes
  const head0 = V(0.5, 0.52);
  const head1 = V(0.64, 0.565);
  const seat = V(0.33, 0.0);
  tube(head0, head1, 0.034);
  tube(V(0.52, 0.53), CRANK.clone(), 0.03);
  tube(V(0.58, 0.545), V(0.36, 0.02), 0.024);
  tube(V(0.16, -0.02), seat.clone().setY(0.3), 0.024);
  for (const s of [1, -1]) {
    tube(CRANK.clone().setX(0.05 * s), V(WHEEL_R, REAR, 0.05 * s), 0.016);
    tube(V(0.3, -0.02, 0.04 * s), V(WHEEL_R, REAR, 0.05 * s), 0.014);
    // Fork legs
    tube(V(0.5, 0.52, 0.03 * s), V(WHEEL_R, FRONT, 0.05 * s), 0.016, chrome);
  }
  frame.add(at(sph(0.04, paint, undefined, 10), 0, CRANK.y, CRANK.z));
  // Mudguards
  for (const z of [REAR, FRONT]) {
    const f = tor(0.285, 0.022, color, { rough: 0.45 }, Math.PI * 0.62, 6, 16);
    f.rotation.set(0, Math.PI / 2, Math.PI * (z < 0 ? -0.12 : 0.28));
    f.position.set(0, WHEEL_R, z);
    frame.add(f);
  }
  // Chain guard
  frame.add(at(rbox(0.02, 0.09, 0.7, '#ffffff', 0.008), 0.065, (CRANK.y + WHEEL_R) / 2, (CRANK.z + REAR) / 2));
  // Saddle on its post
  frame.add(at(rbox(0.17, 0.05, 0.26, '#7a4a3a', 0.024, { rough: 0.6 }), 0, 0.325, 0.03));
  frame.add(at(rbox(0.13, 0.02, 0.2, accent, 0.01), 0, 0.352, 0.03));
  // Stem, swept-back handlebar, grips
  tube(head1, V(0.6, 0.47), 0.018, chrome);
  tube(V(0.6, 0.47, 0), V(0.56, 0.4, 0.2), 0.014, chrome);
  tube(V(0.6, 0.47, 0), V(0.56, 0.4, -0.2), 0.014, chrome);
  for (const s of [1, -1]) {
    const grip = rot(cyl(0.024, 0.024, 0.09, accent, 10), 0, 0, Math.PI / 2);
    grip.position.set(0.23 * s, 0.56, 0.4);
    frame.add(grip);
  }
  // Wicker basket over the front wheel
  const wicker = mat('#d9a066', { rough: 0.85 });
  const wick2 = mat('#c48a52', { rough: 0.85 });
  const bx = 0.3;
  const bz = 0.24;
  const by = 0.65;
  const bcz = FRONT + 0.06;
  frame.add(at(box(bx, 0.02, bz, wicker), 0, by - 0.09, bcz));
  for (const [w, d, x, z] of [[bx, 0.02, 0, bz / 2], [bx, 0.02, 0, -bz / 2], [0.02, bz, bx / 2, 0], [0.02, bz, -bx / 2, 0]]) {
    frame.add(at(box(w, 0.18, d, wicker), x, by, bcz + z));
    frame.add(at(box(w + 0.01, 0.025, d + 0.01, wick2), x, by + 0.03, bcz + z));
    frame.add(at(box(w + 0.01, 0.025, d + 0.01, wick2), x, by - 0.04, bcz + z));
  }
  frame.add(at(rbox(bx + 0.03, 0.03, bz + 0.03, wick2, 0.012), 0, by + 0.09, bcz));
  frame.add(at(mesh(heartGeo(0.08, 0.02), mat(accent === '#ffffff' ? '#ef5b6f' : accent, { rough: 0.5 })), 0, by + 0.01, bcz + bz / 2 + 0.015));
  tube(V(by - 0.1, bcz - 0.02, 0.06), V(WHEEL_R + 0.03, FRONT, 0.06), 0.01, chrome);
  tube(V(by - 0.1, bcz - 0.02, -0.06), V(WHEEL_R + 0.03, FRONT, -0.06), 0.01, chrome);
  if (item === 'flowers') {
    for (const [x, z, c] of [[-0.07, 0.03, '#ff5d8f'], [0.05, 0.05, '#ffffff'], [0.0, -0.05, '#ffd75e'], [0.09, -0.04, '#ff9eb5'], [-0.09, -0.06, '#c7a6ff']]) {
      frame.add(at(sph(0.045, c, { rough: 0.6 }, 8), x, by + 0.12, bcz + z));
    }
    frame.add(at(sph(0.1, '#6dbb58', { rough: 0.85 }, 8), 0, by + 0.04, bcz)).scale.set(1.3, 0.6, 1.0);
  } else if (item === 'laptop') {
    frame.add(rot(at(rbox(0.22, 0.015, 0.16, '#c9d1da', 0.006, { metal: 0.4, rough: 0.35 }), 0, by + 0.1, bcz + 0.02), -1.2, 0, 0));
    frame.add(rot(at(box(0.04, 0.003, 0.04, '#7fb0ff', { emissive: '#7fb0ff', ei: 0.4 }), 0, by + 0.11, bcz + 0.03), -1.2, 0, 0));
    frame.add(at(rbox(0.12, 0.08, 0.1, '#ffd166', 0.03), 0.06, by + 0.06, bcz - 0.04));
  }
  // Headlight
  frame.add(rot(at(cyl(0.035, 0.03, 0.04, '#ffffff', 12), 0, by - 0.02, bcz + bz / 2 + 0.03), Math.PI / 2, 0, 0));
  frame.add(at(sph(0.026, mat('#fff6c8', { emissive: '#ffe9a0', ei: 0.8 }), undefined, 10), 0, by - 0.02, bcz + bz / 2 + 0.05));
  // Rear reflector
  frame.add(at(box(0.06, 0.03, 0.01, '#ef3b4d', { rough: 0.3 }), 0, WHEEL_R + 0.25, REAR - 0.16));

  // Moving parts
  const rear = wheel(color, '#ffffff', accent === '#ffffff' ? '#ffd166' : accent);
  rear.position.set(0, WHEEL_R, REAR);
  const front = wheel(color, '#ffffff', accent === '#ffffff' ? '#ffd166' : accent);
  front.position.set(0, WHEEL_R, FRONT);
  const crank = new THREE.Group();
  crank.position.copy(CRANK);
  crank.add(rot(cyl(0.075, 0.075, 0.012, '#c9d1da', 16, { metal: 0.5, rough: 0.3 }), 0, 0, Math.PI / 2));
  crank.children[0].position.x = 0.04;
  for (const s of [1, -1]) {
    crank.add(at(box(0.016, 0.11, 0.024, '#8a8f99', { metal: 0.4, rough: 0.4 }), 0.085 * s, -0.045 * s, 0));
    crank.add(at(rbox(0.08, 0.022, 0.05, '#3b3542', 0.008), 0.12 * s, -0.095 * s, 0));
  }
  bake(crank);
  const bell = new THREE.Group();
  bell.add(at(sph(0.03, mat('#f4c24f', { metal: 0.6, rough: 0.3 }), undefined, 10), 0, 0.02, 0));
  bell.add(at(cyl(0.008, 0.008, 0.03, '#c9d1da', 6), 0, 0, 0));
  bell.position.set(-0.14, 0.575, 0.42);
  bake(bell);
  root.add(rear, front, crank, bell);
  bake(frame);

  let ringT = 0;
  return {
    root,
    wheels: [rear, front],
    crank,
    bell,
    seat: BIKE_SEAT,
    // Roll forward by `dist` metres (spins the wheels)
    roll(dist) {
      rear.rotation.x += dist / WHEEL_R;
      front.rotation.x += dist / WHEEL_R;
    },
    // Match the crank to a kid's pedal phase
    pedal(phase) {
      crank.rotation.x = phase - Math.PI / 2;
    },
    steer(a) {
      front.rotation.y = a;
    },
    ring() {
      ringT = 0.6;
    },
    update(dt) {
      if (ringT > 0) {
        ringT = Math.max(0, ringT - dt);
        bell.rotation.z = Math.sin(ringT * 60) * 0.35 * (ringT / 0.6);
        bell.scale.setScalar(1 + Math.sin(ringT * 30) * 0.15 * (ringT / 0.6));
      }
    },
  };
}

// Put a kid on a bike: copy the bike's world transform onto the kid root (the kid stays in its own parent).
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
export function seatOnBike(kid, bikeRoot) {
  bikeRoot.updateMatrixWorld(true);
  bikeRoot.localToWorld(_v.set(0, BIKE_SEAT.y, BIKE_SEAT.z));
  const p = kid.root.parent;
  if (p) {
    p.updateMatrixWorld(true);
    p.worldToLocal(_v);
  }
  kid.root.position.copy(_v);
  bikeRoot.getWorldQuaternion(_q);
  if (p) _q.premultiply(p.getWorldQuaternion(new THREE.Quaternion()).invert());
  kid.root.quaternion.copy(_q);
}
