// The big snowy ski hill at the back of the ski area: a height field, the ski run with its flags,
// little skiers coming down, and a chairlift that keeps turning.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, umat, mesh } from '../../util.js';
import { part, merge, instances, SNOW } from './kit.js';

const sstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const HILL_FRONT = -7; // the hill rises behind this line (local z)

// Height of the hill above the ground at local (x, z).
export function hillHeight(x, z) {
  const hz = Math.pow(sstep(HILL_FRONT, -15.2, z), 1.45);
  if (hz <= 0) return 0;
  const big = 10.5 * Math.exp(-(((x + 8) / 12.5) ** 2));
  const small = 6 * Math.exp(-(((x - 19) / 7.5) ** 2));
  const mid = 3.2 * Math.exp(-(((x - 7) / 6) ** 2));
  const edge = sstep(28.5, 24, Math.abs(x));
  const bumps = 0.35 * Math.sin(x * 0.55 + 1.3) * Math.sin(z * 0.8) + 0.2 * Math.sin(x * 1.3 + z * 0.7);
  return Math.max(0, (big + small + mid + 1.4 + bumps * hz) * hz * edge);
}

// The ski run: p = 0 at the top, 1 at the bottom.
export function runPoint(p) {
  return { x: -7.2 - 4.6 * p + 1.1 * Math.sin(p * 6.28), z: -14.7 + 7.4 * p };
}

export function buildHill(group, dynamic, vc) {
  const geo = new THREE.PlaneGeometry(57, 8.4, 84, 28);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -10.8);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, hillHeight(pos.getX(i), pos.getZ(i)) - 0.03);
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  const top = new THREE.Color('#ffffff');
  const low = new THREE.Color('#dbe7f4');
  const shade = new THREE.Color('#a9c3df');
  const lane = new THREE.Color('#ffffff');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = pos.getY(i);
    c.copy(low).lerp(top, Math.min(1, y / 7));
    c.lerp(shade, Math.min(0.8, (1 - nrm.getY(i)) * 1.1 + Math.exp(-y * 2.2) * 0.35));
    // The groomed run is a little brighter
    const p = Math.min(1, Math.max(0, (z + 14.7) / 7.4));
    const rp = runPoint(p);
    const d = Math.abs(x - rp.x);
    if (d < 1.9 && z > -15 && z < -7.2) c.lerp(lane, 0.7 * Math.min(1, (1.9 - d) * 2));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const hill = new THREE.Mesh(geo, vc);
  hill.receiveShadow = true;
  hill.castShadow = false;
  group.add(hill);
  dynamic.push(hill);

  // Slalom flags and orange edge poles along the run
  const flagGeo = merge([
    part(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 5), '#ffffff', 0, 0.45, 0),
    part(new THREE.BoxGeometry(0.32, 0.22, 0.02), '#ffffff', 0.16, 0.76, 0),
  ]);
  const flags = [];
  for (let i = 0; i < 8; i++) {
    const p = 0.12 + i * 0.105;
    const rp = runPoint(p);
    const side = i % 2 ? 1 : -1;
    const x = rp.x + side * 0.75;
    flags.push({ x, y: hillHeight(x, rp.z), z: rp.z, s: 0.9, color: side > 0 ? '#ef5b6f' : '#4a8ef0' });
    for (const e of [-1.8, 1.8]) {
      if (i % 2) continue;
      const ex = rp.x + e;
      flags.push({ x: ex, y: hillHeight(ex, rp.z), z: rp.z, s: 0.7, sx: 0.4, color: '#f7a440' });
    }
  }
  const flagIM = instances(flagGeo, vc, flags, { cast: false });
  group.add(flagIM);

  // Two little skiers coming down the run, over and over
  const skierGeo = (jacket, hat) =>
    merge([
      part(new THREE.ConeGeometry(0.17, 0.42, 10), jacket, 0, 0.32, 0),
      part(new THREE.SphereGeometry(0.13, 10, 8), '#f6d8c6', 0, 0.62, 0),
      part(new THREE.SphereGeometry(0.135, 10, 6, 0, Math.PI * 2, 0, 1.3), hat, 0, 0.64, 0),
      part(new THREE.SphereGeometry(0.045, 6, 5), '#ffffff', 0, 0.8, 0),
      part(new THREE.BoxGeometry(0.05, 0.02, 0.62), '#3f7bf0', 0.06, 0.02, 0.05),
      part(new THREE.BoxGeometry(0.05, 0.02, 0.62), '#3f7bf0', -0.06, 0.02, 0.05),
      part(new THREE.CylinderGeometry(0.045, 0.05, 0.16, 6), '#3b2b3f', 0.06, 0.1, 0),
      part(new THREE.CylinderGeometry(0.045, 0.05, 0.16, 6), '#3b2b3f', -0.06, 0.1, 0),
    ]);
  const skiers = [
    { mesh: new THREE.Mesh(skierGeo('#ffd166', '#ef5b6f'), vc), phase: 0, dur: 15 },
    { mesh: new THREE.Mesh(skierGeo('#7fd3a7', '#8b5cf6'), vc), phase: 0.5, dur: 17 },
  ];
  for (const s of skiers) {
    s.mesh.castShadow = true;
    s.mesh.scale.setScalar(1.15);
    group.add(s.mesh);
    dynamic.push(s.mesh);
  }

  const lift = buildChairlift(group, dynamic, vc);

  return {
    update(dt, t) {
      for (const s of skiers) {
        const p = ((t / s.dur + s.phase) % 1) * 1.06;
        const m = s.mesh;
        m.visible = p < 1;
        if (!m.visible) continue;
        const rp = runPoint(p);
        const wig = Math.sin(p * Math.PI * 9) * 0.85;
        const x = rp.x + wig;
        m.position.set(x, hillHeight(x, rp.z) + 0.02, rp.z);
        const ahead = runPoint(Math.min(1, p + 0.01));
        const dx = ahead.x + Math.sin((p + 0.01) * Math.PI * 9) * 0.85 - x;
        m.rotation.set(0.5, Math.atan2(dx, ahead.z - rp.z), -Math.cos(p * Math.PI * 9) * 0.35, 'YXZ');
      }
      lift.update(dt, t);
    },
  };
}

// Chairlift from a small station at the bottom to a hut at the top.
function buildChairlift(group, dynamic, vc) {
  const B = new THREE.Vector3(5.2, 0, -7.7);
  const T = new THREE.Vector3(-1.4, hillHeight(-1.4, -14.5), -14.5);
  const dir = new THREE.Vector3(T.x - B.x, 0, T.z - B.z).normalize();
  const perp = new THREE.Vector3(-dir.z, 0, dir.x);
  const metal = mat('#7d92a5', { rough: 0.45, metal: 0.4 });
  const steel = mat('#4f5d6b', { rough: 0.4, metal: 0.5 });
  const snowM = mat(SNOW, { rough: 0.9 });
  const add = (geo, m, x, y, z, ry = 0) => {
    const o = mesh(geo, m);
    o.position.set(x, y, z);
    o.rotation.y = ry;
    group.add(o);
    return o;
  };
  const yaw = Math.atan2(dir.x, dir.z);

  // Cable heights: a wheel at each station, towers in between
  const wheelB = new THREE.Vector3(B.x, 3.3, B.z);
  const wheelT = new THREE.Vector3(T.x, T.y + 3.0, T.z);
  const stops = [wheelB];
  for (const f of [0.28, 0.55, 0.8]) {
    const x = B.x + (T.x - B.x) * f;
    const z = B.z + (T.z - B.z) * f;
    const gy = hillHeight(x, z);
    const top = gy + 3.9;
    stops.push(new THREE.Vector3(x, top, z));
    add(new THREE.CylinderGeometry(0.13, 0.2, top - gy + 0.4, 8), metal, x, gy + (top - gy) / 2 - 0.2, z);
    add(new THREE.BoxGeometry(2.0, 0.14, 0.18), steel, x, top + 0.05, z, yaw + Math.PI / 2);
    add(new THREE.CylinderGeometry(0.45, 0.55, 0.3, 10), snowM, x, gy + 0.05, z);
  }
  stops.push(wheelT);

  // Stations: posts, a red roof with snow on it, a turning wheel
  const station = (c, y0, flagColor) => {
    for (const [dx, dz] of [[-1.3, -0.9], [1.3, -0.9], [-1.3, 0.9], [1.3, 0.9]]) {
      const p = new THREE.Vector3(dx, 0, dz).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw + Math.PI / 2);
      add(new THREE.BoxGeometry(0.18, c.y - y0 + 0.5, 0.18), mat('#a8714a'), c.x + p.x, y0 + (c.y - y0 + 0.5) / 2, c.z + p.z);
    }
    add(new THREE.BoxGeometry(3.2, 0.22, 2.4), mat('#ef5b6f'), c.x, c.y + 0.62, c.z, yaw + Math.PI / 2);
    add(new THREE.BoxGeometry(3.3, 0.2, 2.5), snowM, c.x, c.y + 0.8, c.z, yaw + Math.PI / 2);
    add(new THREE.BoxGeometry(3.0, 0.3, 2.2), mat('#a8714a'), c.x, y0 + 0.15, c.z, yaw + Math.PI / 2);
    add(new THREE.CylinderGeometry(0.06, 0.06, c.y - y0, 8), steel, c.x, y0 + (c.y - y0) / 2, c.z);
    add(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), steel, c.x, c.y + 1.55, c.z);
    add(new THREE.BoxGeometry(0.66, 0.4, 0.04), mat(flagColor), c.x + 0.34, c.y + 2.0, c.z);
    const wg = mergeGeometries([new THREE.TorusGeometry(0.78, 0.08, 6, 24).toNonIndexed(), new THREE.BoxGeometry(1.5, 0.08, 0.05).toNonIndexed(), new THREE.BoxGeometry(0.08, 1.5, 0.05).toNonIndexed()]);
    const wheel = mesh(wg, umat('#4f5d6b', { rough: 0.4, metal: 0.5 }));
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(c.x, c.y, c.z);
    group.add(wheel);
    dynamic.push(wheel);
    return wheel;
  };
  const wheels = [station(wheelB, 0, '#4aa3df'), station(wheelT, T.y - 0.1, '#ffd166')];

  // Cable loop: up on one side, down on the other
  const up = stops.map((p) => p.clone().addScaledVector(perp, 0.75));
  const down = stops.map((p) => p.clone().addScaledVector(perp, -0.75)).reverse();
  const loop = [...up, ...down];
  const lens = [];
  let total = 0;
  const cableMat = mat('#3b4652', { rough: 0.5 });
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    const len = a.distanceTo(b);
    lens.push(len);
    total += len;
    const g = new THREE.CylinderGeometry(0.025, 0.025, len, 4);
    g.rotateX(Math.PI / 2);
    g.lookAt(new THREE.Vector3().subVectors(b, a));
    const c = mesh(g, cableMat, { cast: false });
    c.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    group.add(c);
  }

  // Chairs: a metal hanger and a coloured seat, drawn as two instanced meshes
  const frameGeo = merge([
    part(new THREE.CylinderGeometry(0.03, 0.03, 1.45, 5), '#ffffff', 0, -0.72, -0.1),
    part(new THREE.BoxGeometry(1.0, 0.05, 0.05), '#ffffff', 0, -1.42, -0.1),
    part(new THREE.BoxGeometry(1.0, 0.04, 0.04), '#ffffff', 0, -1.05, 0.3),
    part(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4), '#ffffff', 0.48, -1.25, 0.1, { rx: 1.1 }),
    part(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4), '#ffffff', -0.48, -1.25, 0.1, { rx: 1.1 }),
  ]);
  const seatGeo = merge([
    part(new THREE.BoxGeometry(1.0, 0.09, 0.42), '#ffffff', 0, -1.48, 0.06),
    part(new THREE.BoxGeometry(1.0, 0.42, 0.07), '#ffffff', 0, -1.25, -0.16, { rx: -0.15 }),
  ]);
  const N = 12;
  const colors = ['#ef5b6f', '#4aa3df', '#ffd166', '#7fd3a7'];
  const frames = new THREE.InstancedMesh(frameGeo, umat('#5b6977', { rough: 0.4, metal: 0.4 }), N);
  const seats = new THREE.InstancedMesh(seatGeo, umat('#ffffff', { rough: 0.6 }), N);
  for (let i = 0; i < N; i++) seats.setColorAt(i, new THREE.Color(colors[i % colors.length]));
  frames.castShadow = seats.castShadow = true;
  frames.frustumCulled = seats.frustumCulled = false;
  group.add(frames, seats);
  dynamic.push(frames, seats);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const p = new THREE.Vector3();
  const up3 = new THREE.Vector3(0, 1, 0);
  const at = (d) => {
    d = ((d % total) + total) % total;
    for (let i = 0; i < loop.length; i++) {
      if (d <= lens[i]) {
        const a = loop[i];
        const b = loop[(i + 1) % loop.length];
        p.lerpVectors(a, b, d / lens[i]);
        return Math.atan2(b.x - a.x, b.z - a.z);
      }
      d -= lens[i];
    }
    return 0;
  };
  return {
    update(dt, t) {
      for (let i = 0; i < N; i++) {
        q.setFromAxisAngle(up3, at(t * 1.1 + (i / N) * total));
        m4.compose(p, q, one);
        frames.setMatrixAt(i, m4);
        seats.setMatrixAt(i, m4);
      }
      frames.instanceMatrix.needsUpdate = true;
      seats.instanceMatrix.needsUpdate = true;
      for (const w of wheels) w.rotation.z = -t * 1.4;
    },
  };
}
