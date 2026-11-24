import { THREE, P, inst, bulbs, stripes, toGeo, vcMat, colorBake, fitText, roundRect, heartPath, drawStar, FONT } from './parts.js';
import { mat, umat, mesh } from '../../util.js';
import { buildPath, trackMesh, rideStep } from '../../arena/coaster/track.js';

// The Comet, Roji Land's rollercoaster, over the east side of the park: a chain lift beside the
// avenue, a ride along the top behind the plaza, a steep drop toward the street, a loop and home to
// the station. A little train of three cars full of cheering visitors runs round on its own.
// By the station: the ride photo board, with one photo of Roji and Homama on it.

const START = { x: 10.5, y: 0.9, z: -1.5, yaw: -Math.PI / 2, closed: true };
export const COMET_PIECES = [
  { s: 4, station: true },
  { turn: -90, r: 2, bank: 10 },
  { s: 10, rise: 9.2, lift: true },
  { turn: -90, r: 2, bank: 12 },
  { s: 4.5 },
  { turn: -90, r: 2, rise: -0.6, bank: 15 },
  { s: 5, rise: -8.5, drop: true },
  { s: 1 },
  { loop: 2.2, shift: -1.2 },
  { s: 0.8 },
  { to: START },
];

const CARS = 3;
const GAP = 1.45;

function carModel(k, rider) {
  const g = new THREE.Group();
  g.add(k.at(k.rbox(0.95, 0.4, 1.25, '#ffffff', 0.14), 0, 0.42, 0));
  g.add(k.at(k.rbox(0.8, 0.2, 0.9, '#3b2b3f', 0.06), 0, 0.58, -0.05));
  g.add(k.at(k.box(1.0, 0.1, 1.2, P.gold), 0, 0.2, 0));
  for (const s of [-1, 1]) for (const z of [-0.4, 0.4]) g.add(k.at(k.rot(k.cyl(0.1, 0.1, 0.08, '#3f4a7a', 10), 0, 0, Math.PI / 2), s * 0.46, 0.12, z));
  // two cheering riders per car, hands up
  if (rider) {
    for (const [x, z, shirt, hair] of [[-0.2, 0.1, '#7fd8bf', '#4a2c1a'], [0.2, 0.1, '#ffd166', '#141010'], [-0.2, -0.38, '#8fd3ff', '#7a4a26'], [0.2, -0.38, '#ff9eb5', '#2a1a13']]) {
      g.add(k.at(k.cyl(0.11, 0.13, 0.28, shirt, 6), x, 0.78, z));
      g.add(k.at(k.sph(0.13, '#f2cdb4', undefined, 8), x, 1.02, z));
      g.add(k.at(k.sph(0.135, hair, undefined, 7), x, 1.06, z - 0.03));
      for (const s of [-1, 1]) {
        const arm = k.cyl(0.03, 0.03, 0.3, '#f2cdb4', 4);
        arm.position.set(x + s * 0.11, 1.02, z);
        arm.rotation.z = -s * 0.35;
        g.add(arm);
      }
    }
  }
  return g;
}

export function buildComet(ctx, k, atlas) {
  const { api } = ctx;
  const root = new THREE.Group();
  const dynamic = [];
  const colliders = [];
  const track = buildPath(START, COMET_PIECES, { step: 0.2 });
  const tm = trackMesh(track, { rail: '#ff5d7a', spine: '#ffd166', tie: '#fff4e3', column: '#ffffff', every: 2.6, skip: (x, z) => z > -3 && x > 5.6 && x < 11.4 });
  root.add(tm.group);
  for (const c of tm.supports) colliders.push({ type: 'circle', x: c.x, z: c.z, r: 0.2 });
  // Where the track runs low, it is a wall (nobody walks through the rails)
  {
    const a = { p: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3(), l: new THREE.Vector3() };
    for (let d = 0; d < track.length; d += 0.7) {
      track.at(d, a);
      if (a.p.y > 2.3 || a.loop) continue;
      if (a.p.z > -2.8 && a.p.x > 5.6 && a.p.x < 11.4) continue;
      colliders.push({ type: 'circle', x: a.p.x, z: a.p.z, r: 0.55 });
    }
    // the loop: one box round its footprint
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    for (let i = 0; i < track.N; i++) {
      if (!track.loopFlag[i]) continue;
      const q = track.pts[i];
      x0 = Math.min(x0, q.x);
      x1 = Math.max(x1, q.x);
      z0 = Math.min(z0, q.z);
      z1 = Math.max(z1, q.z);
    }
    if (x0 < x1) colliders.push({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: (x1 - x0) / 2 + 0.5, hd: (z1 - z0) / 2 + 0.2 });
  }

  // Station: platform, steps, a striped roof and the sign
  root.add(k.at(k.rbox(5.2, 0.56, 1.3, P.cream, 0.04), 8.5, 0.28, -0.35));
  root.add(k.at(k.box(5.2, 0.04, 1.3, '#f7d6c4'), 8.5, 0.57, -0.35));
  root.add(k.at(k.box(1.6, 0.28, 0.5, P.stoneDark), 8.5, 0.14, 0.55));
  root.add(k.at(k.box(5.4, 0.12, 2.4, P.stoneDark), 8.5, 0.06, -1.6));
  for (const x of [6.05, 10.95]) {
    for (const z of [-2.6, -0.05]) root.add(k.at(k.cyl(0.08, 0.08, 3.1, '#3f4a7a', 8), x, 1.55, z));
  }
  const roofTex = stripes('#ef5b6f', '#fff4e3', 14, { w: 512, h: 64 });
  roofTex.repeat.set(1.4, 1);
  const roofMat = umat('#ffffff', { map: roofTex, rough: 0.7, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const plane = mesh(new THREE.PlaneGeometry(5.6, 1.55), roofMat);
    plane.position.set(8.5, 3.45, -1.32 + s * 0.68);
    plane.rotation.set(-Math.PI / 2 + s * 0.55, 0, 0);
    root.add(plane);
  }
  root.add(k.at(k.box(5.7, 0.1, 0.1, P.gold), 8.5, 3.86, -1.32));
  const sign = atlas.panel(3.2, 0.95, 512, 152, (c, w, h) => {
    c.fillStyle = '#3f4a9a';
    roundRect(c, 4, 4, w - 8, h - 8, 54);
    c.fill();
    c.lineWidth = 8;
    c.strokeStyle = '#ffd166';
    c.stroke();
    c.fillStyle = '#ffd166';
    for (const [x, y, r] of [[60, 50, 18], [96, 100, 10], [w - 60, 52, 18], [w - 98, 104, 10]]) {
      drawStar(c, x, y, r);
      c.fill();
    }
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, 'The Comet', w / 2, h / 2 + 4, w * 0.62, 84);
  });
  sign.position.set(8.5, 4.45, -0.4);
  root.add(sign);
  root.add(k.at(k.rbox(3.35, 1.05, 0.1, '#3f4a9a', 0.05), 8.5, 4.45, -0.47));
  for (const s of [-1, 1]) root.add(k.at(k.box(0.08, 0.7, 0.08, '#3f4a7a'), 8.5 + s * 1.2, 3.85, -0.5));
  // Queue rope posts in front of the steps
  for (const x of [7.2, 9.8]) {
    root.add(k.at(k.cyl(0.05, 0.07, 0.9, P.gold, 8), x, 0.45, 0.85));
    root.add(k.at(k.sph(0.07, P.gold, undefined, 8), x, 0.93, 0.85));
  }
  colliders.push({ type: 'box', x: 8.5, z: -0.35, hw: 2.6, hd: 0.65, h: 0.56 });
  colliders.push({ type: 'box', x: 8.5, z: 0.55, hw: 0.8, hd: 0.25, h: 0.28 });
  colliders.push({ type: 'box', x: 8.5, z: -1.85, hw: 2.7, hd: 0.85 });
  colliders.push({ type: 'circle', x: 7.2, z: 0.85, r: 0.1 }, { type: 'circle', x: 9.8, z: 0.85, r: 0.1 });

  // The ride photo board: little photos of riders, and in the middle Roji and Homama, hands up
  const board = new THREE.Group();
  board.position.set(12.6, 0, 0.1);
  root.add(board);
  for (const s of [-1, 1]) board.add(k.at(k.box(0.1, 2.3, 0.1, '#3f4a7a'), s * 1.15, 1.15, -0.05));
  board.add(k.at(k.rbox(2.5, 1.55, 0.1, '#3f4a9a', 0.05), 0, 1.6, -0.02));
  const photos = atlas.panel(2.3, 1.36, 460, 272, (c, w, h) => drawPhotoBoard(c, w, h));
  photos.position.set(0, 1.6, 0.04);
  board.add(photos);
  colliders.push({ type: 'box', x: 12.6, z: 0.1, hw: 1.25, hd: 0.12 });

  // The train
  const carGeo = toGeo(carModel(k, true));
  const train = inst(carGeo, vcMat(0.5), CARS, { colors: ['#ff9eb5', '#ffd166', '#8fd3ff'] });
  root.add(train);
  dynamic.push(train);
  const nose = k.star(0.34, 0.15, 0.08, P.sun, { emissive: '#ffb347', ei: 0.35 });
  root.add(nose);
  dynamic.push(nose);

  const st = { d: 1.2, v: 0, wait: 3, stopped: true, scream: 0, clack: 0, departed: 0 };
  const stationStop = 2.0; // arc length where the front car stops
  const m4 = new THREE.Matrix4();
  const pt = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  const frame = { p: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3(), l: new THREE.Vector3() };
  const placeTrain = () => {
    for (let i = 0; i < CARS; i++) train.setMatrixAt(i, track.matrix(st.d - i * GAP, m4));
    train.instanceMatrix.needsUpdate = true;
    track.at(st.d + 0.72, frame);
    nose.position.copy(frame.p).addScaledVector(frame.u, 0.45);
    nose.quaternion.setFromRotationMatrix(m4.makeBasis(frame.l, frame.u, frame.f));
  };
  placeTrain();

  const sounds = {
    clack(k2) {
      const s = api.sound;
      if (!s?.ctx || k2 < 0.05) return;
      s.tone(1200, s.ctx.currentTime, 0.03, { type: 'square', gain: 0.012 * k2 });
    },
    whee(k2) {
      const s = api.sound;
      if (!s?.ctx || k2 < 0.05) return;
      const t = s.ctx.currentTime;
      s.tone(880, t, 1.3, { type: 'sine', gain: 0.03 * k2, slideTo: 1320 });
      s.tone(1100, t + 0.1, 1.2, { type: 'triangle', gain: 0.015 * k2, slideTo: 1600 });
    },
  };

  return {
    debug: st,
    root,
    dynamic,
    colliders,
    track,
    hotspots: [
      {
        x: 8.5,
        z: 1.15,
        r: 1.5,
        label: 'Ride the Comet',
        icon: 'park-coaster',
        act: (a) => (a.hasArena('coaster') ? a.playArena('coaster', { me: a.playerId }) : a.toast('The Comet is warming up. Come back soon.')),
      },
    ],
    update(dt, t, people) {
      // How close is the player (for the sounds)
      track.at(st.d, frame);
      const near = Math.max(0, 1 - frame.p.distanceTo(tmpV.set(people[0].x, 1, people[0].z)) / 26);
      if (st.stopped) {
        st.wait -= dt;
        st.v = 0;
        if (st.wait <= 0) {
          st.stopped = false;
          st.v = 0.6;
          st.departed = 0;
        }
      } else {
        const prev = st.d;
        const tag = rideStep(track, st, dt, { minV: 1.2, lift: 2.6, drag: 0.02, roll: 0.25 });
        st.departed += st.v * dt;
        // Slow into the station and stop, after a full lap
        const toStop = (stationStop - st.d + track.length) % track.length;
        if (st.departed > track.length * 0.6 && toStop < 4.5) {
          st.v = Math.min(st.v, 0.4 + toStop * 0.9);
          if (toStop < 0.05 || (prev < stationStop && st.d >= stationStop)) {
            st.d = stationStop;
            st.stopped = true;
            st.wait = 4 + Math.random() * 2;
          }
        }
        if (tag.lift) {
          st.clack -= dt;
          if (st.clack <= 0) {
            st.clack = 0.2;
            sounds.clack(near);
          }
        }
        if (tag.drop && st.scream <= 0) {
          st.scream = 6;
          sounds.whee(near);
        }
      }
      st.scream -= dt;
      placeTrain();
    },
  };
}

// The photo board by the station: a grid of ride photos, with Roji and Homama in the middle
function drawPhotoBoard(c, w, h) {
  c.fillStyle = '#2e3a7e';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#ffd166';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `600 26px ${FONT}`;
  c.fillText('Ride photos', w / 2, 22);
  const cell = (x, y, pw, ph, people, caption, big = false) => {
    c.fillStyle = '#ffffff';
    c.fillRect(x - 4, y - 4, pw + 8, ph + 26);
    const sky = c.createLinearGradient(0, y, 0, y + ph);
    sky.addColorStop(0, '#8fd3ff');
    sky.addColorStop(1, '#ffd1dc');
    c.fillStyle = sky;
    c.fillRect(x, y, pw, ph);
    // the car
    c.fillStyle = '#ff9eb5';
    roundRect(c, x + pw * 0.1, y + ph * 0.62, pw * 0.8, ph * 0.3, 10);
    c.fill();
    people.forEach((p, i) => {
      const px = x + pw * (0.3 + i * (0.4 / Math.max(1, people.length - 1)));
      const py = y + ph * 0.5;
      const r = ph * (big ? 0.11 : 0.12);
      c.fillStyle = p.shirt;
      c.fillRect(px - r * 0.8, py + r * 0.6, r * 1.6, r * 1.2);
      c.strokeStyle = '#f2cdb4';
      c.lineWidth = r * 0.35;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(px - r * 0.7, py + r * 0.8);
      c.lineTo(px - r * 1.4, py - r * 1.2);
      c.moveTo(px + r * 0.7, py + r * 0.8);
      c.lineTo(px + r * 1.4, py - r * 1.2);
      c.stroke();
      c.fillStyle = '#f8dccb';
      c.beginPath();
      c.arc(px, py, r, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = p.hair;
      c.beginPath();
      c.arc(px, py - r * 0.25, r * 1.02, Math.PI, Math.PI * 2);
      c.fill();
      if (p.tails) {
        c.beginPath();
        c.arc(px - r * 1.05, py - r * 0.1, r * 0.4, 0, Math.PI * 2);
        c.arc(px + r * 1.05, py - r * 0.1, r * 0.4, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = '#3b2b3f';
      c.beginPath();
      c.arc(px, py + r * 0.4, r * (p.scream ? 0.32 : 0.18), 0, Math.PI * 2);
      c.fill();
    });
    c.fillStyle = '#3b2b3f';
    c.font = `600 ${big ? 17 : 13}px ${FONT}`;
    c.fillText(caption, x + pw / 2, y + ph + 11);
  };
  const v = (shirt, hair) => ({ shirt, hair });
  cell(14, 48, 92, 70, [v('#7fd8bf', '#4a2c1a'), v('#ffd166', '#141010')], 'Lulu and Sami');
  cell(14, 160, 92, 70, [v('#c7a6ff', '#b5773d'), v('#8fd3ff', '#2a1a13')], 'The Nour family');
  cell(w - 106, 48, 92, 70, [v('#ffb38a', '#141010')], 'Yousef, age 7');
  cell(w - 106, 160, 92, 70, [v('#ff9eb5', '#7a4a26'), v('#7fd8bf', '#141010')], 'Dana and Jad');
  // the big one in the middle
  c.fillStyle = '#ef5b6f';
  heartPath(c, w / 2 + 92, 64, 26);
  c.fill();
  cell(w / 2 - 105, 56, 210, 150, [{ shirt: '#ef5b6f', hair: '#2a1a13', tails: true, scream: true }, { shirt: '#3f7bf0', hair: '#141010' }], 'Roji and Homama', true);
}
