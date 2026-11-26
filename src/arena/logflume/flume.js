import * as THREE from 'three';
import { canvasTexture } from '../../util.js';

// The water channel of the log flume and the log boat itself.
// The channel is a trough swept along the ride path: wooden (or stone) walls, a top trim, an underside
// for the raised parts, and a ribbon of flowing water whose texture moves at the local speed of the
// water (slow up the lifts, fast down the drops). Raised parts stand on posts.

export const CH = { W: 1.5, T: 0.2, H: 0.5, D: 1.0 };

const frame = () => ({ p: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3(), l: new THREE.Vector3() });

// A plank or stone texture, grey so the vertex colours tint it
function wallTexture(kind) {
  const t = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    if (kind === 'stone') {
      const rows = 4;
      for (let r = 0; r < rows; r++) {
        const y = (r * h) / rows;
        c.fillStyle = 'rgba(80,60,50,.28)';
        c.fillRect(0, y, w, 5);
        const n = 3;
        for (let i = 0; i < n; i++) {
          const x = ((i + (r % 2) * 0.5) * w) / n;
          c.fillRect(x, y, 5, h / rows);
        }
        for (let i = 0; i < 9; i++) {
          c.fillStyle = `rgba(${120 + ((i * 37) % 60)},${100 + ((i * 53) % 50)},90,.08)`;
          c.beginPath();
          c.arc((i * 71 + r * 29) % w, y + ((i * 17) % (h / rows)), 10 + (i % 4) * 4, 0, Math.PI * 2);
          c.fill();
        }
      }
    } else {
      const n = 4;
      for (let i = 0; i < n; i++) {
        const x = (i * w) / n;
        c.fillStyle = `rgba(90,60,40,${0.06 + (i % 2) * 0.05})`;
        c.fillRect(x, 0, w / n, h);
        c.fillStyle = 'rgba(70,45,30,.35)';
        c.fillRect(x, 0, 4, h);
        // plank ends and a nail or two
        const y = ((i * 97) % 200) + 20;
        c.fillRect(x, y, w / n, 4);
        c.fillStyle = 'rgba(60,40,30,.5)';
        c.beginPath();
        c.arc(x + 14, y + 12, 3, 0, Math.PI * 2);
        c.arc(x + w / n - 14, y + 12, 3, 0, Math.PI * 2);
        c.fill();
        for (let k = 0; k < 5; k++) {
          c.strokeStyle = 'rgba(90,60,40,.12)';
          c.lineWidth = 2;
          c.beginPath();
          const gx = x + 10 + ((k * 13 + i * 7) % (w / n - 20));
          c.moveTo(gx, 0);
          c.bezierCurveTo(gx + 6, h * 0.3, gx - 6, h * 0.6, gx + 3, h);
          c.stroke();
        }
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Flowing water: streaks along the flow and foam at the edges (u across, v along)
export function waterTexture(th) {
  const t = canvasTexture(128, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, th.foam);
    g.addColorStop(0.12, th.water2);
    g.addColorStop(0.5, th.water);
    g.addColorStop(0.88, th.water2);
    g.addColorStop(1, th.foam);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,.55)';
    c.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const x = 10 + ((i * 41) % (w - 20));
      const y = (i * 67) % h;
      const len = 26 + (i % 5) * 12;
      c.lineWidth = 2 + (i % 3);
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + 5, y + len / 2, x, y + len);
      c.stroke();
      if (y + len > h) {
        c.beginPath();
        c.moveTo(x, y - h);
        c.quadraticCurveTo(x + 5, y - h + len / 2, x, y - h + len);
        c.stroke();
      }
    }
    c.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 0; i < 40; i++) {
      c.beginPath();
      c.arc((i * 29) % w, (i * 53) % h, 1.5 + (i % 3), 0, Math.PI * 2);
      c.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Sweep a cross-section along the track from d0 to d1.
// segs: [{ a: [l, u], b: [l, u], n: [nl, nu], color, uScale }], where a..b runs across the section.
// shape(d) -> { w, h } scales the half width and wall height at d (pools, the station).
function sweep(track, d0, d1, step, segs, shape) {
  const n = Math.max(2, Math.ceil((d1 - d0) / step) + 1);
  const pos = [];
  const nor = [];
  const uv = [];
  const col = [];
  const idx = [];
  const fr = frame();
  const c = new THREE.Color();
  const v = new THREE.Vector3();
  const nn = new THREE.Vector3();
  let base = 0;
  for (const s of segs) {
    c.set(s.color);
    const start = base;
    let ok = true;
    for (let i = 0; i < n; i++) {
      const d = d0 + ((d1 - d0) * i) / (n - 1);
      track.at(d, fr);
      const sh = shape ? shape(d) : null;
      const map = ([l, u]) => {
        let L = l;
        let U = u;
        if (sh) {
          L = Math.sign(l) * (Math.abs(l) - 1.5 + 1.5 * sh.w);
          if (u > 0.2) U = sh.h;
        }
        return [L, U];
      };
      const A = map(s.a);
      const B = map(s.b);
      for (const [k, [l, u]] of [A, B].entries()) {
        v.copy(fr.p).addScaledVector(fr.l, l).addScaledVector(fr.u, u);
        pos.push(v.x, v.y, v.z);
        nn.set(0, 0, 0).addScaledVector(fr.l, s.n[0]).addScaledVector(fr.u, s.n[1]).normalize();
        nor.push(nn.x, nn.y, nn.z);
        const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
        uv.push(k * len * (s.uScale || 1), d / 2.2);
        col.push(c.r, c.g, c.b);
      }
    }
    if (!ok) continue;
    for (let i = 0; i < n - 1; i++) {
      const a = start + i * 2;
      const b = a + 1;
      const a2 = a + 2;
      const b2 = a + 3;
      // wind so the face points along the wanted normal
      const p = (j) => new THREE.Vector3(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
      if (i === 0) {
        const e1 = p(b).sub(p(a));
        const e2 = p(a2).sub(p(a));
        const fn = new THREE.Vector3().crossVectors(e1, e2);
        const want = new THREE.Vector3(nor[a * 3], nor[a * 3 + 1], nor[a * 3 + 2]);
        s.flip = fn.dot(want) < 0;
      }
      if (s.flip) idx.push(a, a2, b, b, a2, b2);
      else idx.push(a, b, a2, b, b2, a2);
    }
    base += n * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

// th: theme { wallIn, wallOut, trim, under, post, wall: 'wood' | 'stone', water, water2, foam, glow }
// flow(d) -> local water speed (m/s). pools: [{ d0, d1 }] where the channel opens into a lagoon.
export function buildChannel(track, th, { flow, pools = [], station = null } = {}) {
  const group = new THREE.Group();
  const { W, T, H, D } = CH;
  // Pools: the walls sink under the lagoon's water and the channel widens
  const shape = (d) => {
    let k = 0;
    for (const p of pools) {
      const a = Math.min(1, Math.max(0, (d - p.d0) / 4));
      const b = Math.min(1, Math.max(0, (p.d1 - d) / 4));
      k = Math.max(k, Math.min(a, b));
    }
    return k > 0 ? { w: 1 + k * 0.4, h: H - k * (H + 0.32) } : null;
  };
  const segs = [
    { a: [W + T, -D], b: [W + T, H], n: [1, 0], color: th.wallOut },
    { a: [W + T, H], b: [W, H], n: [0, 1], color: th.trim, uScale: 2 },
    { a: [W, H], b: [W, -0.2], n: [-1, 0], color: th.wallIn },
    { a: [-W, -0.2], b: [-W, H], n: [1, 0], color: th.wallIn },
    { a: [-W, H], b: [-W - T, H], n: [0, 1], color: th.trim, uScale: 2 },
    { a: [-W - T, H], b: [-W - T, -D], n: [-1, 0], color: th.wallOut },
    { a: [-W - T, -D], b: [W + T, -D], n: [0, -1], color: th.under },
  ];
  const wallGeo = sweep(track, 0, track.length, 0.5, segs, shape);
  const wallTex = wallTexture(th.wall);
  const wall = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ vertexColors: true, map: wallTex, roughness: 0.8 }));
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  // Water: v is the time the water takes to get there, so a texture scrolling at a steady rate moves at
  // the local speed of the water everywhere
  const step = 0.5;
  const n = Math.ceil(track.length / step) + 1;
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  const fr = frame();
  const v = new THREE.Vector3();
  let time = 0;
  const COLS = 4;
  for (let i = 0; i < n; i++) {
    const d = Math.min(track.length, i * step);
    track.at(d, fr);
    if (i > 0) time += step / Math.max(0.8, flow(d));
    const sh = shape(d);
    const w = (W - 0.02) * (sh ? sh.w : 1);
    for (let j = 0; j <= COLS; j++) {
      const l = -w + (2 * w * j) / COLS;
      v.copy(fr.p).addScaledVector(fr.l, l).addScaledVector(fr.u, 0.0);
      pos.push(v.x, v.y, v.z);
      nor.push(fr.u.x, fr.u.y, fr.u.z);
      uv.push(j / COLS, time * 0.45);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < COLS; j++) {
      const a = i * (COLS + 1) + j;
      const b = a + 1;
      const a2 = a + COLS + 1;
      const b2 = a2 + 1;
      idx.push(a, a2, b, b, a2, b2);
    }
  }
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  wg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  wg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  wg.setIndex(idx);
  // make sure the faces point up
  {
    const p0 = new THREE.Vector3().fromArray(pos, 0);
    const p1 = new THREE.Vector3().fromArray(pos, (COLS + 1) * 3);
    const p2 = new THREE.Vector3().fromArray(pos, 3);
    const fn = new THREE.Vector3().crossVectors(p1.sub(p0), p2.sub(p0));
    if (fn.y < 0) {
      for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]];
      wg.setIndex(idx);
    }
  }
  wg.computeBoundingSphere();
  const waterTex = waterTexture(th);
  const waterMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: waterTex, roughness: 0.12, metalness: 0.05, emissive: th.glow ? new THREE.Color(th.water) : new THREE.Color('#000000'), emissiveIntensity: th.glow || 0, emissiveMap: th.glow ? waterTex : null });
  const water = new THREE.Mesh(wg, waterMat);
  water.receiveShadow = true;
  group.add(water);

  // Posts under the raised parts: a pair every 2.4 m and a cross beam
  const bents = [];
  for (let d = 1; d < track.length; d += 2.4) {
    track.at(d, fr);
    if (shape(d)) continue;
    const bottom = fr.p.y - D;
    if (bottom < 0.4) continue;
    bents.push({ p: fr.p.clone(), l: fr.l.clone(), bottom, yaw: Math.atan2(fr.f.x, fr.f.z) });
  }
  const postGeo = new THREE.BoxGeometry(1, 1, 1);
  postGeo.translate(0, 0.5, 0);
  const posts = new THREE.InstancedMesh(postGeo, new THREE.MeshStandardMaterial({ color: th.post, roughness: 0.85 }), Math.max(1, bents.length * 3));
  posts.castShadow = true;
  posts.receiveShadow = true;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);
  let k = 0;
  for (const b of bents) {
    q.setFromAxisAngle(Y, b.yaw);
    for (const side of [-1, 1]) {
      v.copy(b.p).addScaledVector(b.l, side * (W + T * 0.5 - 0.05)).setY(0);
      posts.setMatrixAt(k++, m4.compose(v, q, s.set(0.2, b.bottom + 0.05, 0.2)));
    }
    // a cross beam half way down
    v.copy(b.p).setY(b.bottom * 0.5);
    posts.setMatrixAt(k++, m4.compose(v, q, s.set((W + T) * 2, 0.14, 0.14)));
  }
  posts.count = k;
  posts.instanceMatrix.needsUpdate = true;
  if (k) group.add(posts);

  // Conveyor ribs on the lifts
  const lifts = [];
  {
    let inL = false;
    let a = 0;
    for (let d = 0; d <= track.length; d += 0.5) {
      const tg = track.at(d, fr).tag || {};
      if (tg.lift && !inL) {
        inL = true;
        a = d;
      } else if (!tg.lift && inL) {
        inL = false;
        lifts.push({ d0: a, d1: d });
      }
    }
  }
  const ribCount = lifts.reduce((s2, L) => s2 + Math.floor((L.d1 - L.d0) / 1.2), 0);
  const ribs = new THREE.InstancedMesh(new THREE.BoxGeometry(W * 2 - 0.1, 0.06, 0.12), new THREE.MeshStandardMaterial({ color: th.rib || '#5a4a52', roughness: 0.6 }), Math.max(1, ribCount));
  ribs.castShadow = false;
  ribs.frustumCulled = false;
  if (ribCount) group.add(ribs);
  let ribOff = 0;

  return {
    group,
    wall,
    water,
    waterMat,
    lifts,
    shape,
    update(dt, t, liftSpeed = 2.6) {
      waterTex.offset.y = -t * 0.45;
      ribOff = (ribOff + liftSpeed * dt) % 1.2;
      let i = 0;
      for (const L of lifts) {
        for (let d = L.d0 + ribOff; d < L.d1 && i < ribCount; d += 1.2) {
          track.at(d, fr);
          m4.makeBasis(fr.l, fr.u, fr.f).setPosition(fr.p.x + fr.u.x * 0.02, fr.p.y + fr.u.y * 0.02, fr.p.z + fr.u.z * 0.02);
          ribs.setMatrixAt(i++, m4);
        }
      }
      ribs.count = i;
      ribs.instanceMatrix.needsUpdate = true;
    },
  };
}

// The log boat: a hollowed log with a smiling face, two benches, and room for Roji in front and
// Homama behind. Origin at the water line, +Z forward. Returns { root, body, front, back, lantern }.
export function makeLog(k, th) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const R = 0.62;
  const LEN = 2.7;
  const open = 0.3; // fraction of the circle open on top
  const ts = -Math.PI * (1 - open);
  const tl = Math.PI * 2 * (1 - open);
  const bark = canvasTexture(256, 128, (c, w, h) => {
    c.fillStyle = th.log || '#a86a3c';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      c.strokeStyle = i % 3 ? 'rgba(70,40,20,.35)' : 'rgba(255,220,180,.18)';
      c.lineWidth = 3 + (i % 4);
      const y = (i * 37) % h;
      c.beginPath();
      c.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) c.lineTo(x, y + Math.sin(x * 0.05 + i) * 4);
      c.stroke();
    }
  });
  const rings = canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = '#f0c48a';
    c.fillRect(0, 0, w, h);
    for (let r = 6; r < 64; r += 7) {
      c.strokeStyle = r % 14 ? 'rgba(160,100,50,.45)' : 'rgba(160,100,50,.25)';
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      c.stroke();
    }
    c.strokeStyle = '#8a5a30';
    c.lineWidth = 8;
    c.beginPath();
    c.arc(w / 2, h / 2, 60, 0, Math.PI * 2);
    c.stroke();
  });
  const hullGeo = new THREE.CylinderGeometry(R, R, LEN, 20, 1, false, ts, tl);
  hullGeo.rotateX(Math.PI / 2);
  const barkMat = new THREE.MeshStandardMaterial({ map: bark, roughness: 0.85 });
  const ringMat = new THREE.MeshStandardMaterial({ map: rings, roughness: 0.8 });
  const hull = new THREE.Mesh(hullGeo, [barkMat, ringMat, ringMat]);
  hull.castShadow = true;
  hull.position.y = 0.16;
  hull.scale.set(1, 0.82, 1);
  body.add(hull);
  const innerGeo = new THREE.CylinderGeometry(R - 0.07, R - 0.07, LEN - 0.14, 18, 1, true, ts, tl);
  innerGeo.rotateX(Math.PI / 2);
  const inner = new THREE.Mesh(innerGeo, new THREE.MeshStandardMaterial({ color: '#7a4a2a', roughness: 0.9, side: THREE.BackSide }));
  inner.position.copy(hull.position);
  inner.scale.copy(hull.scale);
  body.add(inner);
  // the floor and two benches inside
  body.add(k.at(k.box(0.86, 0.06, LEN - 0.3, '#c98b55'), 0, -0.12, 0));
  const benchY = 0.06;
  for (const z of [0.36, -0.44]) body.add(k.at(k.rbox(0.9, 0.12, 0.42, th.bench || '#fff4e3', 0.04), 0, benchY, z));
  // a rim of rope round the opening
  const rimMat = new THREE.MeshStandardMaterial({ color: '#f3dcb0', roughness: 0.9 });
  for (const s of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, LEN - 0.1, 6), rimMat);
    rim.rotation.x = Math.PI / 2;
    const a = Math.PI * open;
    rim.position.set(s * Math.sin(a) * R * 0.98, hull.position.y + Math.cos(a) * R * 0.82, 0);
    body.add(rim);
  }
  // the smiling face on the front
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 20),
    new THREE.MeshStandardMaterial({
      transparent: true,
      roughness: 0.7,
      map: canvasTexture(128, 128, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        c.fillStyle = '#3b2b3f';
        for (const x of [40, 88]) {
          c.beginPath();
          c.ellipse(x, 56, 9, 12, 0, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = '#ffffff';
        for (const x of [43, 91]) {
          c.beginPath();
          c.arc(x, 51, 3.5, 0, Math.PI * 2);
          c.fill();
        }
        c.strokeStyle = '#3b2b3f';
        c.lineWidth = 6;
        c.lineCap = 'round';
        c.beginPath();
        c.arc(64, 72, 16, 0.2, Math.PI - 0.2);
        c.stroke();
        c.fillStyle = 'rgba(255,120,140,.55)';
        for (const x of [26, 102]) {
          c.beginPath();
          c.ellipse(x, 78, 11, 7, 0, 0, Math.PI * 2);
          c.fill();
        }
      }),
    }),
  );
  face.position.set(0, hull.position.y - 0.08, LEN / 2 + 0.006);
  body.add(face);
  // a little sprout on its nose, and a carved heart on the side (R + H)
  const sprout = new THREE.Group();
  sprout.add(k.at(k.cyl(0.015, 0.02, 0.18, '#5aa848', 5), 0, 0.09, 0));
  for (const s of [-1, 1]) {
    const leaf = k.sph(0.07, '#7fd06a', undefined, 8);
    leaf.scale.set(1.3, 0.35, 0.7);
    leaf.position.set(s * 0.08, 0.17, 0);
    leaf.rotation.z = s * 0.4;
    sprout.add(leaf);
  }
  sprout.position.set(0, hull.position.y + R * 0.8, LEN / 2 - 0.25);
  body.add(sprout);
  const carve = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.3),
    new THREE.MeshStandardMaterial({
      transparent: true,
      roughness: 0.8,
      map: canvasTexture(128, 96, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        c.strokeStyle = 'rgba(70,35,15,.75)';
        c.lineWidth = 5;
        c.beginPath();
        const x = w / 2;
        const y = h / 2 + 6;
        c.moveTo(x, y + 24);
        c.bezierCurveTo(x - 46, y - 6, x - 22, y - 40, x, y - 18);
        c.bezierCurveTo(x + 22, y - 40, x + 46, y - 6, x, y + 24);
        c.stroke();
        c.fillStyle = 'rgba(70,35,15,.8)';
        c.font = `700 22px 'Fredoka', system-ui, sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('R + H', x, y - 4);
      }),
    }),
  );
  carve.position.set(R * 1.0 + 0.004, hull.position.y - 0.02, -0.9);
  carve.rotation.y = Math.PI / 2;
  body.add(carve);
  // a lantern on a hook at the front for the night ride
  const lantern = new THREE.Group();
  lantern.add(k.at(k.cyl(0.012, 0.012, 0.5, '#3b2b3f', 5), 0, 0.25, 0));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe7a0' }));
  bulb.position.set(0, 0.52, 0.05);
  lantern.add(bulb);
  lantern.add(k.at(k.cyl(0.07, 0.1, 0.05, '#3b2b3f', 8), 0, 0.62, 0.05));
  lantern.position.set(0.18, hull.position.y + R * 0.75, LEN / 2 - 0.15);
  lantern.visible = false;
  body.add(lantern);
  return {
    root,
    body,
    // where to seat the kids (root of a sitting kid, in log space)
    front: new THREE.Vector3(0, benchY + 0.06 - 0.3, 0.36),
    back: new THREE.Vector3(0, benchY + 0.06 - 0.3, -0.44),
    lantern,
    bulb,
    LEN,
  };
}
