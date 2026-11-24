import * as THREE from 'three';

// Rollercoaster track, shared by Roji Land's coaster and the Comet ride game.
// A track is drawn like a turtle: from a start point and heading it follows a list of pieces, each
// sampled every few centimetres with its own frame (forward, up, left), so drops, banked turns and
// a full vertical loop all keep the riders the right way round.
//
// Pieces (yaw: 0 faces +Z, positive turns left, toward +X when facing +Z):
//   { s: 12, rise: 3 }                  straight, rising 3 m with eased ends
//   { turn: 90, r: 6, rise: 0, bank: 25 } arc turn of 90 degrees on radius 6, banked into the turn
//   { loop: 4, shift: 1.4 }             a vertical loop of radius 4, coming out 1.4 m to the left
// Any piece may carry tags: lift (chain hill), boost (m/s), brake (m/s), station, tunnel, drop, photo.

const Y = new THREE.Vector3(0, 1, 0);
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export function buildPath(start, pieces, { step = 0.25 } = {}) {
  const pts = [];
  const tags = [];
  const loopFlag = [];
  const bankArr = [];
  let x = start.x;
  let z = start.z;
  let h = start.y;
  let yaw = start.yaw;
  const tagOf = (pc) => {
    const t = {};
    for (const k of ['lift', 'boost', 'brake', 'station', 'tunnel', 'drop', 'photo', 'name']) if (pc[k] !== undefined) t[k] = pc[k];
    return t;
  };
  pts.push(new THREE.Vector3(x, h, z));
  tags.push(tagOf(pieces[0] || {}));
  loopFlag.push(false);
  bankArr.push(0);
  for (const pc of pieces) {
    const tg = tagOf(pc);
    if (pc.loop) {
      const R = pc.loop;
      const shift = pc.shift ?? 1.4;
      const F = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const L = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const n = Math.ceil((Math.PI * 2 * R) / step);
      const ox = x;
      const oz = z;
      for (let i = 1; i <= n; i++) {
        const ph = (i / n) * Math.PI * 2;
        const sh = shift * smooth(i / n);
        pts.push(new THREE.Vector3(ox + F.x * R * Math.sin(ph) + L.x * sh, h + R * (1 - Math.cos(ph)), oz + F.z * R * Math.sin(ph) + L.z * sh));
        tags.push(tg);
        loopFlag.push(true);
        bankArr.push(0);
      }
      x = ox + L.x * shift;
      z = oz + L.z * shift;
      continue;
    }
    if (pc.to) {
      // A smooth curve (cubic Hermite in plan, eased height) to a point and heading, to close a circuit
      const T = pc.to;
      const dist = Math.hypot(T.x - x, T.z - z);
      const m = dist * (pc.tension ?? 1.1);
      const ax = Math.sin(yaw) * m;
      const az = Math.cos(yaw) * m;
      const bx = Math.sin(T.yaw) * m;
      const bz = Math.cos(T.yaw) * m;
      const x0 = x;
      const z0 = z;
      const h0 = h;
      const n = Math.max(8, Math.ceil((dist * 1.6) / step));
      for (let i = 1; i <= n; i++) {
        const u = i / n;
        const u2 = u * u;
        const u3 = u2 * u;
        const h00 = 2 * u3 - 3 * u2 + 1;
        const h10 = u3 - 2 * u2 + u;
        const h01 = -2 * u3 + 3 * u2;
        const h11 = u3 - u2;
        x = h00 * x0 + h10 * ax + h01 * T.x + h11 * bx;
        z = h00 * z0 + h10 * az + h01 * T.z + h11 * bz;
        h = h0 + (T.y - h0) * smooth(u);
        pts.push(new THREE.Vector3(x, h, z));
        tags.push(tg);
        loopFlag.push(false);
        bankArr.push(0);
      }
      yaw = T.yaw;
      continue;
    }
    const turn = ((pc.turn || 0) * Math.PI) / 180;
    const len = pc.turn ? Math.abs(turn) * pc.r : pc.s;
    const rise = pc.rise || 0;
    const bank = ((pc.bank ?? (pc.turn ? 18 : 0)) * Math.PI) / 180 * Math.sign(turn || 0);
    const n = Math.max(1, Math.ceil(len / step));
    const h0 = h;
    const y0 = yaw;
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      const ds = len / n;
      const yawMid = y0 + turn * (u - 0.5 / n);
      x += Math.sin(yawMid) * ds;
      z += Math.cos(yawMid) * ds;
      h = h0 + rise * (pc.linear ? u : smooth(u));
      pts.push(new THREE.Vector3(x, h, z));
      tags.push(tg);
      loopFlag.push(false);
      // bank eases in and out across the turn
      bankArr.push(bank * Math.sin(Math.PI * u) ** 0.7);
    }
    yaw = y0 + turn;
  }
  return makeTrack(pts, tags, loopFlag, bankArr, { closed: !!start.closed, end: { x, y: h, z, yaw } });
}

// Frames, arc lengths and a sampler for a list of points.
function makeTrack(pts, tags, loopFlag, bankArr, { closed, end }) {
  const n = pts.length;
  if (closed && pts[n - 1].distanceTo(pts[0]) < 0.05) {
    pts.pop();
    tags.pop();
    loopFlag.pop();
    bankArr.pop();
  }
  const N = pts.length;
  const s = new Float32Array(N);
  for (let i = 1; i < N; i++) s[i] = s[i - 1] + pts[i].distanceTo(pts[i - 1]);
  const length = closed ? s[N - 1] + pts[N - 1].distanceTo(pts[0]) : s[N - 1];
  const fw = [];
  const up = [];
  const left = [];
  const get = (i) => (closed ? pts[(i + N) % N] : pts[Math.max(0, Math.min(N - 1, i))]);
  for (let i = 0; i < N; i++) {
    const f = get(i + 1).clone().sub(get(i - 1)).normalize();
    let u;
    if (loopFlag[i]) {
      // In the loop the riders' heads point at its centre: find it from the neighbours' curvature
      const a = get(i - 4);
      const b = get(i + 4);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      u = mid.sub(pts[i]);
      u.addScaledVector(f, -u.dot(f));
      if (u.lengthSq() < 1e-6) u = Y.clone();
      u.normalize();
    } else {
      u = Y.clone().addScaledVector(f, -f.y);
      if (u.lengthSq() < 1e-6) u.set(0, 0, 1);
      u.normalize();
      const l = new THREE.Vector3().crossVectors(u, f).normalize();
      const b = bankArr[i];
      if (b) u.multiplyScalar(Math.cos(b)).addScaledVector(l, Math.sin(b)).normalize();
    }
    fw.push(f);
    up.push(u);
    left.push(new THREE.Vector3().crossVectors(u, f).normalize());
  }
  // Smooth the up vectors a little so the loop entry and exit do not snap
  for (let pass = 0; pass < 3; pass++) {
    const copy = up.map((v) => v.clone());
    for (let i = 0; i < N; i++) {
      const v = copy[i].clone().add(closed || i > 0 ? copy[(i - 1 + N) % N] : copy[i]).add(closed || i < N - 1 ? copy[(i + 1) % N] : copy[i]);
      v.addScaledVector(fw[i], -v.dot(fw[i])).normalize();
      up[i].copy(v);
      left[i].crossVectors(up[i], fw[i]).normalize();
    }
  }

  const idx = (d) => {
    let lo = 0;
    let hi = N - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (s[mid] <= d) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  const wrapS = (d) => (closed ? ((d % length) + length) % length : Math.max(0, Math.min(length, d)));
  const track = {
    pts,
    s,
    fw,
    up,
    left,
    tags,
    loopFlag,
    length,
    closed,
    end,
    N,
    // Position and frame at arc length d (out: { p, f, u, l, tag, loop })
    at(d, out = { p: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3(), l: new THREE.Vector3() }) {
      d = wrapS(d);
      const i = idx(d);
      const j = closed ? (i + 1) % N : Math.min(N - 1, i + 1);
      const segLen = j === i ? 1 : (j === 0 ? length : s[j]) - s[i];
      const k = segLen > 1e-6 ? Math.max(0, Math.min(1, (d - s[i]) / segLen)) : 0;
      out.p.lerpVectors(pts[i], pts[j], k);
      out.f.lerpVectors(fw[i], fw[j], k).normalize();
      out.u.lerpVectors(up[i], up[j], k).normalize();
      out.l.crossVectors(out.u, out.f).normalize();
      out.tag = tags[i];
      out.loop = loopFlag[i];
      out.i = i;
      return out;
    },
    // A matrix that places a car (local +Z forward, +Y up) at arc length d, raised `lift` along up
    matrix(d, m4 = new THREE.Matrix4(), lift = 0, side = 0) {
      const a = track.at(d, tmpFrame);
      const p = a.p.clone().addScaledVector(a.u, lift).addScaledVector(a.l, side);
      m4.makeBasis(a.l, a.u, a.f);
      m4.setPosition(p);
      return m4;
    },
  };
  return track;
}
const tmpFrame = { p: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3(), l: new THREE.Vector3() };

// The visible track: two running rails, a spine under them, ties and (optionally) support columns.
// Returns { group, supports: [{ x, z, top }], railMat } in the track's own coordinates.
export function trackMesh(track, { rail = '#ff5d7a', spine = '#ffd166', tie = '#fff4e3', column = '#ffffff', gauge = 0.42, supports = true, every = 3.2, ground = 0, railR = 0.055, spineR = 0.11, tieStep = 0.9, glow = null, skip = null, detail = 2 } = {}) {
  const group = new THREE.Group();
  const step = 0.5;
  const n = Math.max(8, Math.round(track.length / step));
  const L = [];
  const R = [];
  const S = [];
  const a = { p: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3(), l: new THREE.Vector3() };
  for (let i = 0; i <= n; i++) {
    if (track.closed && i === n) break;
    track.at((i / n) * track.length, a);
    L.push(a.p.clone().addScaledVector(a.l, gauge));
    R.push(a.p.clone().addScaledVector(a.l, -gauge));
    S.push(a.p.clone().addScaledVector(a.u, -0.22));
  }
  const railMat = new THREE.MeshStandardMaterial({ color: rail, roughness: 0.35, metalness: 0.25, ...(glow ? { emissive: new THREE.Color(glow), emissiveIntensity: 0.35 } : {}) });
  const spineMat = new THREE.MeshStandardMaterial({ color: spine, roughness: 0.45, metalness: 0.2 });
  const tube = (list, r, m) => {
    const curve = new THREE.CatmullRomCurve3(list, track.closed, 'catmullrom', 0.5);
    const mm = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.round(list.length * detail), r, detail > 1 ? 6 : 5, track.closed), m);
    mm.castShadow = true;
    mm.receiveShadow = true;
    group.add(mm);
    return mm;
  };
  tube(L, railR, railMat);
  tube(R, railR, railMat);
  tube(S, spineR, spineMat);

  // Ties
  const nt = Math.floor(track.length / tieStep);
  const tieGeo = new THREE.BoxGeometry(gauge * 2 + 0.16, 0.06, 0.12);
  tieGeo.translate(0, -0.1, 0);
  const ties = new THREE.InstancedMesh(tieGeo, new THREE.MeshStandardMaterial({ color: tie, roughness: 0.6 }), nt);
  ties.castShadow = false;
  ties.receiveShadow = true;
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < nt; i++) ties.setMatrixAt(i, track.matrix(i * tieStep, m4));
  ties.instanceMatrix.needsUpdate = true;
  group.add(ties);

  // Support columns from the ground up to the spine, wherever the track is upright and off the ground
  const out = [];
  if (supports) {
    const cols = [];
    for (let d = 0.5; d < track.length; d += every) {
      track.at(d, a);
      if (a.loop || a.u.y < 0.8) continue;
      const top = a.p.y - 0.28;
      if (top - ground < 0.5) continue;
      if (skip && skip(a.p.x, a.p.z)) continue;
      const bx = a.p.x - a.u.x * 0.25;
      const bz = a.p.z - a.u.z * 0.25;
      cols.push({ x: bx, z: bz, top });
    }
    // The loop stands on two legs under its front and back
    let li = -1;
    for (let i = 0; i < track.N; i++) {
      if (track.loopFlag[i] && li < 0) li = i;
      if (li >= 0 && !track.loopFlag[i]) {
        const n = i - li;
        for (const k of [li + Math.round(n / 4), li + Math.round((3 * n) / 4)]) {
          const p = track.pts[k];
          cols.push({ x: p.x, z: p.z, top: p.y - 0.3, legOf: true });
        }
        li = -1;
      }
    }
    const colGeo = new THREE.CylinderGeometry(0.09, 0.13, 1, 8);
    colGeo.translate(0, 0.5, 0);
    const colMesh = new THREE.InstancedMesh(colGeo, new THREE.MeshStandardMaterial({ color: column, roughness: 0.5, metalness: 0.15 }), cols.length + 1);
    colMesh.castShadow = true;
    colMesh.receiveShadow = true;
    const footGeo = new THREE.CylinderGeometry(0.26, 0.3, 0.16, 10);
    footGeo.translate(0, 0.08, 0);
    const feet = new THREE.InstancedMesh(footGeo, new THREE.MeshStandardMaterial({ color: '#d9c6ae', roughness: 0.85 }), cols.length + 1);
    feet.castShadow = false;
    cols.forEach((c, i) => {
      m4.makeScale(1, c.top - ground, 1).setPosition(c.x, ground, c.z);
      colMesh.setMatrixAt(i, m4);
      feet.setMatrixAt(i, m4.makeTranslation(c.x, ground, c.z));
      out.push(c);
    });
    colMesh.count = feet.count = cols.length;
    colMesh.instanceMatrix.needsUpdate = true;
    feet.instanceMatrix.needsUpdate = true;
    group.add(colMesh, feet);
  }
  return { group, supports: out, railMat };
}

// Ride physics along a track: gravity on slopes, a little drag, chain lifts, boosters and brakes.
// state: { d, v }; returns the tag under the train.
export function rideStep(track, state, dt, { minV = 2.2, lift = 3.2, drag = 0.012, roll = 0.12 } = {}) {
  const a = track.at(state.d, tmpFrame);
  const tag = a.tag || {};
  let v = state.v;
  v += (-9.8 * a.f.y - drag * v * v - roll) * dt;
  if (tag.lift) v = Math.max(lift, Math.min(v, lift + 0.6));
  if (tag.boost) v = v + (tag.boost - v) * Math.min(1, dt * 1.6);
  if (tag.brake !== undefined) v = v + (tag.brake - v) * Math.min(1, dt * 2.4);
  v = Math.max(minV, v);
  state.v = v;
  state.d += v * dt;
  if (track.closed) state.d = ((state.d % track.length) + track.length) % track.length;
  return tag;
}
