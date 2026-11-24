import * as THREE from 'three';
import { mat, mesh, canvasTexture, roundRect, rng, FONT } from '../../util.js';

// Track helpers shared by the karting place and the Kart Race: a closed centre line with
// progress and sideways offset, road ribbons, kerbs, tyre stacks, waving flags and the start gantry.

// Centre line through ctrl points [[x, z], ...] (closed). d > 0 is the driver's left.
export function makeLoop(ctrl, N = 800) {
  const curve = new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
  const L = curve.getLength();
  const ds = L / N;
  const raw = curve.getSpacedPoints(N);
  const px = new Float32Array(N);
  const pz = new Float32Array(N);
  const tx = new Float32Array(N);
  const tz = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    px[i] = raw[i].x;
    pz[i] = raw[i].z;
  }
  for (let i = 0; i < N; i++) {
    const a = (i - 1 + N) % N;
    const b = (i + 1) % N;
    const dx = px[b] - px[a];
    const dz = pz[b] - pz[a];
    const l = Math.hypot(dx, dz) || 1;
    tx[i] = dx / l;
    tz[i] = dz / l;
  }
  const mod = (s) => ((s % L) + L) % L;
  const idx = (s) => {
    const u = mod(s) / ds;
    const i = Math.floor(u) % N;
    return [i, (i + 1) % N, u - Math.floor(u)];
  };
  const T = {
    L,
    N,
    ds,
    px,
    pz,
    mod,
    at(s, d = 0, out = new THREE.Vector3()) {
      const [i, j, f] = idx(s);
      const ux = tx[i] + (tx[j] - tx[i]) * f;
      const uz = tz[i] + (tz[j] - tz[i]) * f;
      const l = Math.hypot(ux, uz) || 1;
      return out.set(px[i] + (px[j] - px[i]) * f + (uz / l) * d, 0, pz[i] + (pz[j] - pz[i]) * f - (ux / l) * d);
    },
    yaw(s) {
      const [i, j, f] = idx(s);
      return Math.atan2(tx[i] + (tx[j] - tx[i]) * f, tz[i] + (tz[j] - tz[i]) * f);
    },
    // Turn per metre around s (+ is a left turn)
    bend(s, w = 4) {
      let d = T.yaw(s + w) - T.yaw(s - w);
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return d / (2 * w);
    },
    // Nearest centre point. hint: last index, or -1 to search all of it.
    project(x, z, hint = -1) {
      let best = Infinity;
      let bi = 0;
      const scan = (i) => {
        const dx = x - px[i];
        const dz = z - pz[i];
        const q = dx * dx + dz * dz;
        if (q < best) {
          best = q;
          bi = i;
        }
      };
      if (hint < 0) for (let i = 0; i < N; i++) scan(i);
      else for (let k = -16; k <= 16; k++) scan((hint + k + N) % N);
      const dx = x - px[bi];
      const dz = z - pz[bi];
      return { i: bi, s: mod(bi * ds + dx * tx[bi] + dz * tz[bi]), d: dx * tz[bi] - dz * tx[bi] };
    },
    dist(x, z) {
      let best = Infinity;
      for (let i = 0; i < N; i += 2) {
        const dx = x - px[i];
        const dz = z - pz[i];
        best = Math.min(best, dx * dx + dz * dz);
      }
      return Math.sqrt(best);
    },
  };
  return T;
}

// Ranges of s where the track bends more than `thr` rad per metre, padded a little.
export function bends(T, thr = 0.03, pad = 1.5) {
  const out = [];
  const step = 0.5;
  let start = null;
  for (let s = 0; s <= T.L; s += step) {
    const b = Math.abs(T.bend(s)) > thr;
    if (b && start === null) start = s;
    if ((!b || s + step > T.L) && start !== null) {
      out.push([start - pad, s + pad, Math.sign(T.bend((start + s) / 2))]);
      start = null;
    }
  }
  return out;
}

// A flat strip along the track from s0 to s1 between sideways offsets d0 and d1.
// u runs 0..1 across, v runs along in units of vLen metres.
export function ribbon(T, s0, s1, d0, d1, y = 0.01, { step = 0.5, vLen = 4 } = {}) {
  const n = Math.max(2, Math.ceil((s1 - s0) / step));
  const pos = [];
  const uv = [];
  const a = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const s = s0 + ((s1 - s0) * i) / n;
    T.at(s, d0, a);
    pos.push(a.x, y, a.z);
    T.at(s, d1, a);
    pos.push(a.x, y, a.z);
    uv.push(0, (s - s0) / vLen, 1, (s - s0) / vLen);
  }
  const index = [];
  // Wind the triangles so they face up whichever side d0 is on
  const up = d1 > d0;
  for (let i = 0; i < n; i++) {
    const p = i * 2;
    if (up) index.push(p, p + 2, p + 1, p + 1, p + 2, p + 3);
    else index.push(p, p + 1, p + 2, p + 1, p + 3, p + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  const ny = g.attributes.normal.getY(0);
  if (ny < 0) {
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i += 3) [ix[i + 1], ix[i + 2]] = [ix[i + 2], ix[i + 1]];
    g.computeVertexNormals();
  }
  return g;
}

// ------------------------------------------------------------------ textures
// Soft lilac asphalt with white edge lines (u across the road, v along it).
export function asphaltMaterial({ base = '#8d86a0', lines = true } = {}) {
  const tex = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    const r = rng(11);
    for (let i = 0; i < 700; i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(50,40,70,0.07)';
      const s = 1 + r() * 3;
      c.fillRect(r() * w, r() * h, s, s);
    }
    if (lines) {
      c.fillStyle = '#fffaf4';
      c.fillRect(w * 0.035, 0, w * 0.03, h);
      c.fillRect(w * 0.935, 0, w * 0.03, h);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
}

export function kerbMaterial(a = '#ef5b6f', b = '#fffaf4') {
  const tex = canvasTexture(32, 128, (c, w, h) => {
    c.fillStyle = a;
    c.fillRect(0, 0, w, h / 2);
    c.fillStyle = b;
    c.fillRect(0, h / 2, w, h / 2);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
}

export function checkerMaterial(cols = 16, rows = 2) {
  const tex = canvasTexture(cols * 16, rows * 16, (c, w, h) => {
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        c.fillStyle = (i + j) % 2 ? '#3b2b3f' : '#fffaf4';
        c.fillRect(i * 16, j * 16, 16, 16);
      }
    }
  });
  tex.magFilter = THREE.NearestFilter;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
}

// ------------------------------------------------------------------ tyre stacks
const TYRE = '#3b3442';
// Stacks of tyres in one draw call. list: [{ x, z, n, top }] (top: colour of the painted top tyre).
export function tyreStacks(list, { r = 0.3, tube = 0.12, segs = [6, 13] } = {}) {
  const geo = new THREE.TorusGeometry(r, tube, segs[0], segs[1]);
  geo.rotateX(Math.PI / 2);
  let count = 0;
  for (const s of list) count += s.n;
  const im = new THREE.InstancedMesh(geo, mat('#ffffff', { rough: 0.85 }), Math.max(1, count));
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const col = new THREE.Color();
  const R = rng(5);
  let k = 0;
  for (const s of list) {
    for (let i = 0; i < s.n; i++) {
      m4.compose(v.set(s.x + (R() - 0.5) * 0.04, tube + i * tube * 2 * 0.95, s.z + (R() - 0.5) * 0.04), q.setFromEuler(e.set(0, R() * 6, 0)), one);
      im.setMatrixAt(k, m4);
      im.setColorAt(k++, col.set(i === s.n - 1 && s.top ? s.top : i % 2 && s.band ? s.band : TYRE));
    }
  }
  im.castShadow = true;
  im.receiveShadow = true;
  return im;
}

// ------------------------------------------------------------------ waving flags
// Flags in one draw call per material. The cloth waves in the vertex shader.
// list: [{ x, y, z, yaw, color, scale }]; checker: true for a chequered material.
export function waveFlags(list, { w = 0.8, h = 0.52, checker = false } = {}) {
  const geo = new THREE.PlaneGeometry(w, h, 8, 1);
  geo.translate(w / 2, 0, 0);
  const uniforms = { uTime: { value: 0 } };
  let material;
  if (checker) {
    const tex = canvasTexture(128, 96, (c, cw, ch) => {
      for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) {
        c.fillStyle = (i + j) % 2 ? '#3b2b3f' : '#fffaf4';
        c.fillRect(i * 16, j * 16, 16, 16);
      }
    });
    tex.magFilter = THREE.NearestFilter;
    material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, side: THREE.DoubleSide });
  } else material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, side: THREE.DoubleSide });
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float ph = uTime * 6.0 + position.x * 5.0;
      #ifdef USE_INSTANCING
      ph += instanceMatrix[3].x * 1.7 + instanceMatrix[3].z;
      #endif
      transformed.z += sin(ph) * 0.09 * position.x;
      transformed.y += cos(ph * 0.7) * 0.03 * position.x;`,
    );
  };
  const im = new THREE.InstancedMesh(geo, material, Math.max(1, list.length));
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const col = new THREE.Color();
  list.forEach((f, i) => {
    const s = f.scale || 1;
    m4.compose(new THREE.Vector3(f.x, f.y, f.z), q.setFromEuler(e.set(0, f.yaw || 0, 0)), new THREE.Vector3(s, s, s));
    im.setMatrixAt(i, m4);
    if (!checker) im.setColorAt(i, col.set(f.color || '#ef5b6f'));
  });
  im.castShadow = true;
  im.frustumCulled = false;
  return { mesh: im, update: (t) => (uniforms.uTime.value = t) };
}

// ------------------------------------------------------------------ start gantry
// Two striped posts, a beam with a painted banner and a row of start lamps (one draw call).
// The front (+Z) faces the karts coming up to the line. setLights(red, green): red lamps lit
// from the left, or all green.
export function gantry({ span = 5, height = 3.2, text = 'START', sub = '', lamps = 5, accent = '#ef5b6f', post = '#fffaf4' } = {}) {
  const g = new THREE.Group();
  const half = span / 2;
  for (const s of [-1, 1]) {
    const p = mesh(new THREE.CylinderGeometry(0.14, 0.17, height + 0.6, 14), mat(post, { rough: 0.6 }));
    p.position.set(s * half, (height + 0.6) / 2, 0);
    g.add(p);
    for (let k = 0; k < 4; k++) {
      const band = mesh(new THREE.CylinderGeometry(0.155, 0.165, 0.22, 14), mat(accent, { rough: 0.6 }));
      band.position.set(s * half, 0.5 + k * 0.85, 0);
      g.add(band);
    }
    const foot = mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.2, 14), mat('#d8d1e2', { rough: 0.8 }));
    foot.position.set(s * half, 0.1, 0);
    const cap = mesh(new THREE.SphereGeometry(0.2, 14, 10), mat(accent, { rough: 0.5 }));
    cap.position.set(s * half, height + 0.65, 0);
    g.add(foot, cap);
  }
  const bw = span + 0.2;
  const bh = 0.9;
  const beam = mesh(new THREE.BoxGeometry(bw, bh, 0.24), mat(post, { rough: 0.6 }));
  beam.position.set(0, height, 0);
  g.add(beam);
  const tex = canvasTexture(1024, Math.round((1024 * (bh - 0.12)) / (bw - 0.12)), (c, w, h) => {
    const sq = h / 4;
    for (let i = 0; i < w / sq; i++) for (let j = 0; j < 4; j++) {
      if (j === 1 || j === 2) continue;
      c.fillStyle = (i + j) % 2 ? '#3b2b3f' : '#fffaf4';
      c.fillRect(i * sq, j * sq, sq, sq);
    }
    c.fillStyle = accent;
    roundRect(c, sq * 0.4, sq * 0.6, w - sq * 0.8, h - sq * 1.2, sq * 0.6);
    c.fill();
    c.fillStyle = '#fffaf4';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 ${Math.round(h * (sub ? 0.36 : 0.44))}px ${FONT}`;
    c.fillText(text, w / 2, h * (sub ? 0.42 : 0.53));
    if (sub) {
      c.font = `600 ${Math.round(h * 0.16)}px ${FONT}`;
      c.fillText(sub, w / 2, h * 0.7);
    }
  });
  const bannerMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
  for (const side of [1, -1]) {
    const b = mesh(new THREE.PlaneGeometry(bw - 0.12, bh - 0.12), bannerMat, { cast: false });
    b.position.set(0, height, 0.125 * side);
    if (side < 0) b.rotation.y = Math.PI;
    g.add(b);
  }
  // Lamp housing under the beam, facing +Z
  const lw = lamps * 0.42 + 0.2;
  const housing = mesh(new THREE.BoxGeometry(lw, 0.5, 0.26), mat('#3b2b3f', { rough: 0.6 }));
  housing.position.set(0, height - bh / 2 - 0.27, 0.02);
  g.add(housing);
  const lampGeo = new THREE.SphereGeometry(0.15, 14, 10);
  lampGeo.scale(1, 1, 0.5);
  const lampIM = new THREE.InstancedMesh(lampGeo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), lamps * 2);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < lamps; i++) {
    const x = (i - (lamps - 1) / 2) * 0.42;
    lampIM.setMatrixAt(i, m4.makeTranslation(x, height - bh / 2 - 0.27, 0.16));
    lampIM.setMatrixAt(lamps + i, m4.makeTranslation(x, height - bh / 2 - 0.27, -0.12));
  }
  g.add(lampIM);
  const OFF = new THREE.Color('#5a4a5e');
  const RED = new THREE.Color('#ff4d64');
  const GREEN = new THREE.Color('#4cf08a');
  const state = { red: -1, green: false };
  const setLights = (red = 0, green = false) => {
    if (state.red === red && state.green === green) return;
    state.red = red;
    state.green = green;
    for (let i = 0; i < lamps; i++) {
      const c = green ? GREEN : i < red ? RED : OFF;
      lampIM.setColorAt(i, c);
      lampIM.setColorAt(lamps + i, c);
    }
    lampIM.instanceColor.needsUpdate = true;
  };
  setLights(0, false);
  return { group: g, lamps: lampIM, setLights, lampCount: lamps };
}

// The light sequence used by both: t seconds into a start. Returns [red, green].
export function startSequence(t, lamps = 5, step = 0.55) {
  if (t < 0) return [0, false];
  const n = Math.floor(t / step) + 1;
  if (n <= lamps) return [n, false];
  if (t < lamps * step + 0.6) return [lamps, false];
  return [0, true];
}
