import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, umat, mesh } from '../../util.js';

// A big rounded die with a little rigid-body sim: gravity, corner contacts with the board,
// friction and walls, then it settles flat on a face. Faces: +Y 1, -Y 6, +Z 2, -Z 5, +X 3, -X 4.

const FACES = [
  [1, new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1)],
  [6, new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1)],
  [2, new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)],
  [5, new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)],
  [3, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)],
  [4, new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)],
];
const PIPS = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]],
};
const UP = new THREE.Vector3(0, 1, 0);

export function makeDie(size = 0.62) {
  const root = new THREE.Group();
  const spin = new THREE.Group(); // the tumbling part
  root.add(spin);
  const cube = mesh(new RoundedBoxGeometry(size, size, size, 4, size * 0.17), mat('#fffaf2', { rough: 0.35 }));
  spin.add(cube);
  const pipGeos = [];
  const d = size * 0.26;
  const m4 = new THREE.Matrix4();
  for (const [n, N, U, V] of FACES) {
    for (const [u, v] of PIPS[n]) {
      const g = new THREE.SphereGeometry(size * 0.085, 12, 8);
      const p = new THREE.Vector3().copy(N).multiplyScalar(size * 0.49).addScaledVector(U, u * d).addScaledVector(V, v * d);
      const s = new THREE.Vector3(N.x ? 0.35 : 1, N.y ? 0.35 : 1, N.z ? 0.35 : 1);
      g.applyMatrix4(m4.compose(p, new THREE.Quaternion(), s));
      pipGeos.push(g);
    }
  }
  const pipMat = umat('#ef5b6f', { rough: 0.4 });
  const pips = mesh(mergeGeometries(pipGeos, false), pipMat, { cast: false });
  for (const g of pipGeos) g.dispose();
  spin.add(pips);
  // Soft glow ring under it while it waits for a roll
  const ring = new THREE.Mesh(new THREE.RingGeometry(size * 0.55, size * 0.75, 32), new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 2;
  const hit = new THREE.Mesh(new THREE.SphereGeometry(size * 1.25, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
  spin.add(hit);

  const h = size / 2;
  const I = (size * size) / 6; // cube inertia per unit mass
  const corners = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) corners.push(new THREE.Vector3(x, y, z).multiplyScalar(h * 0.94));
  const body = { pos: root.position, vel: new THREE.Vector3(), q: spin.quaternion, w: new THREE.Vector3() };
  const tmp = { r: new THREE.Vector3(), vp: new THREE.Vector3(), rn: new THREE.Vector3(), t: new THREE.Vector3(), rt: new THREE.Vector3(), dq: new THREE.Quaternion() };

  const die = {
    root,
    spin,
    hit,
    ring,
    size,
    body,
    state: 'idle', // idle | fly | snap | done
    value: 1,
    onClack: null,
    setColor(hex) {
      pipMat.color.set(hex);
    },
    // Launch from where it is now. The die turns to a random way round at the hit, so every face is equally likely.
    throw(vel, w) {
      body.q.random();
      body.vel.copy(vel);
      body.w.copy(w);
      this.state = 'fly';
      this.calm = 0;
      this.time = 0;
      this.lastClack = 0;
    },
    // Which face points up now.
    faceUp() {
      let best = -2;
      let val = 1;
      for (const [n, N] of FACES) {
        const dot = tmp.t.copy(N).applyQuaternion(body.q).y;
        if (dot > best) {
          best = dot;
          val = n;
        }
      }
      return val;
    },
    // Advance the sim. ground: board height. bounds: { x0, x1, z0, z1 }. force: value to settle on (tests).
    step(dt, ground, bounds, force = null) {
      if (this.state === 'fly') {
        const n = Math.max(1, Math.ceil(dt / (1 / 240)));
        const h2 = dt / n;
        for (let i = 0; i < n; i++) this.sub(h2, ground, bounds);
        this.time += dt;
        const still = this.touch && body.vel.length() < 0.18 && body.w.length() < 0.9;
        this.calm = still ? this.calm + dt : 0;
        if (this.calm > 0.12 || this.time > 2.6) this.snap(ground, force);
      } else if (this.state === 'snap') {
        this.snapT += dt / 0.22;
        const k = Math.min(1, this.snapT);
        body.q.copy(this.qFrom).slerp(this.qTo, k * k * (3 - 2 * k));
        body.pos.y = THREE.MathUtils.lerp(this.yFrom, ground + h, k);
        if (k >= 1) this.state = 'done';
      }
    },
    sub(dt, ground, bounds) {
      body.vel.y -= 17 * dt;
      body.pos.addScaledVector(body.vel, dt);
      const w = body.w;
      const wl = w.length();
      if (wl > 1e-6) {
        tmp.dq.setFromAxisAngle(tmp.t.copy(w).divideScalar(wl), wl * dt);
        body.q.premultiply(tmp.dq).normalize();
      }
      this.touch = false;
      let pen = 0;
      for (const c of corners) {
        const r = tmp.r.copy(c).applyQuaternion(body.q);
        const py = body.pos.y + r.y;
        if (py >= ground) continue;
        this.touch = true;
        pen = Math.max(pen, ground - py);
        const vp = tmp.vp.copy(w).cross(r).add(body.vel);
        if (vp.y >= 0) continue;
        const rn = tmp.rn.copy(r).cross(UP);
        const e = vp.y < -1.2 ? 0.32 : 0;
        const j = (-(1 + e) * vp.y) / (1 + rn.lengthSq() / I);
        body.vel.y += j;
        w.addScaledVector(rn, j / I);
        if (vp.y < -1.4 && this.time - this.lastClack > 0.07) {
          this.lastClack = this.time;
          this.onClack?.(Math.min(1.5, -vp.y / 4));
        }
        // Friction
        vp.copy(w).cross(r).add(body.vel);
        const vt = tmp.t.set(vp.x, 0, vp.z);
        const sp = vt.length();
        if (sp > 1e-4) {
          vt.divideScalar(sp);
          const rt = tmp.rt.copy(r).cross(vt);
          const jt = Math.min(sp / (1 + rt.lengthSq() / I), 0.45 * j);
          body.vel.addScaledVector(vt, -jt);
          w.addScaledVector(rt, -jt / I);
        }
      }
      if (pen > 0) {
        body.pos.y += pen;
        w.multiplyScalar(Math.exp(-1.6 * dt));
        body.vel.x *= Math.exp(-1.2 * dt);
        body.vel.z *= Math.exp(-1.2 * dt);
      }
      if (bounds) {
        const m = h * 1.1;
        for (const [axis, lo, hi] of [['x', bounds.x0, bounds.x1], ['z', bounds.z0, bounds.z1]]) {
          if (body.pos[axis] < lo + m && body.vel[axis] < 0) {
            body.pos[axis] = lo + m;
            body.vel[axis] *= -0.45;
            this.onClack?.(0.5);
          } else if (body.pos[axis] > hi - m && body.vel[axis] > 0) {
            body.pos[axis] = hi - m;
            body.vel[axis] *= -0.45;
            this.onClack?.(0.5);
          }
        }
      }
    },
    // Settle flat on the nearest face (or a forced one), turning as little as possible.
    snap(ground, force) {
      let target = null;
      if (force) target = FACES.find((f) => f[0] === force)[1];
      else {
        let best = -2;
        for (const [, N] of FACES) {
          const dot = tmp.t.copy(N).applyQuaternion(body.q).y;
          if (dot > best) {
            best = dot;
            target = N;
          }
        }
      }
      const wn = new THREE.Vector3().copy(target).applyQuaternion(body.q);
      const r = new THREE.Quaternion().setFromUnitVectors(wn, UP);
      this.qFrom = body.q.clone();
      this.qTo = r.multiply(body.q.clone());
      this.yFrom = body.pos.y;
      this.snapT = 0;
      this.state = 'snap';
      body.vel.set(0, 0, 0);
      body.w.set(0, 0, 0);
      this.value = force || FACES.find((f) => f[1] === target)[0];
    },
  };
  return die;
}
