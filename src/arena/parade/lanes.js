import * as THREE from 'three';
import { canvasTexture, heartShape } from '../../util.js';
import { glowTexture } from '../../places/school/kit.js';
import { LANE_COLORS, FRONT_Z } from './float.js';

// The dance carpet rolled out in front of the float: four lanes (left, down, up, right) where the
// arrows slide toward the four pads at the front. Arrows are tilted up toward the camera so they read
// well on a phone. Hold notes trail a ribbon; two notes at once are joined by a bar. Partner notes in
// the duet are lilac. Everything is instanced: a handful of draw calls for all of it.

export const LANE_W = 1.0;
export const GATE_Z = FRONT_Z + 0.12;
export const HIT_Z = 2.5;
export const laneX = (l) => (l - 1.5) * LANE_W;
const TILT = 0.75;
const MAXN = 48;
const PARTNER = new THREE.Color('#c7a6ff');

// an arrow pointing +Y, about 0.68 wide
function arrowShape(s = 1) {
  const p = [[0, 0.36], [0.34, 0.03], [0.14, 0.03], [0.14, -0.32], [-0.14, -0.32], [-0.14, 0.03], [-0.34, 0.03]];
  const sh = new THREE.Shape();
  p.forEach(([x, y], i) => (i ? sh.lineTo(x * s, y * s) : sh.moveTo(x * s, y * s)));
  sh.closePath();
  return sh;
}

// Lit by the sun but also glowing in its own colour, so the arrows stay bright at night
function selfLit(m, k = 0.45) {
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * ${k.toFixed(2)};`);
  };
  m.customProgramCacheKey = () => `selflit${k}`;
  return m;
}

export class Highway {
  constructor({ partnerColor = '#c7a6ff', night = 0 } = {}) {
    PARTNER.set(partnerColor);
    const g = new THREE.Group();
    this.group = g;
    const len = HIT_Z - GATE_Z + 1.1;
    this.speedZ = 1;
    // the carpet
    const tex = canvasTexture(256, 256, (c) => {
      c.fillStyle = '#fff6fa';
      c.fillRect(0, 0, 256, 256);
      const soft = ['#ffd9e5', '#d9ecff', '#d4f5e9', '#fff0cc'];
      for (let l = 0; l < 4; l++) {
        c.fillStyle = soft[l];
        c.fillRect(8 + l * 60, 0, 60, 256);
      }
      c.fillStyle = '#ffffff';
      for (let l = 1; l < 4; l++) c.fillRect(8 + l * 60 - 2, 0, 4, 256);
      c.fillStyle = '#f4c24f';
      c.fillRect(0, 0, 8, 256);
      c.fillRect(248, 0, 8, 256);
      // little hearts down the middle of each lane
      c.fillStyle = 'rgba(255,255,255,0.7)';
      for (let l = 0; l < 4; l++) {
        for (const y of [64, 192]) {
          c.beginPath();
          c.arc(38 + l * 60, y, 5, 0, Math.PI * 2);
          c.fill();
        }
      }
    });
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, len / 2);
    this.tex = tex;
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(LANE_W * 4 + 0.27, len), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0 }));
    this.carpet = carpet;
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.025, GATE_Z + len / 2 - 0.15);
    carpet.receiveShadow = true;
    g.add(carpet);
    // the hit line
    const line = new THREE.Mesh(new THREE.BoxGeometry(LANE_W * 4 + 0.2, 0.03, 0.08), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    line.position.set(0, 0.05, HIT_Z);
    g.add(line);

    const m4 = new THREE.Matrix4();
    const c = new THREE.Color();
    // pads: a round base and an arrow outline (the target), plus a flash ring
    const base = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.46, 0.1, 28), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }), 4);
    // the target: a thick rounded arrow outline painted on a little card
    const recTex = canvasTexture(128, 128, (x) => {
      const p = [[0, 0.36], [0.34, 0.03], [0.14, 0.03], [0.14, -0.32], [-0.14, -0.32], [-0.14, 0.03], [-0.34, 0.03]];
      x.beginPath();
      p.forEach(([a, b], i) => (i ? x.lineTo(64 + a * 150, 64 - b * 150 + 2) : x.moveTo(64 + a * 150, 64 - b * 150 + 2)));
      x.closePath();
      x.fillStyle = 'rgba(255,255,255,0.28)';
      x.fill();
      x.lineJoin = 'round';
      x.lineWidth = 11;
      x.strokeStyle = '#ffffff';
      x.stroke();
    });
    const rec = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshBasicMaterial({ map: recTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }), 4);
    rec.renderOrder = 2;
    const ringMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const ring = new THREE.InstancedMesh(new THREE.RingGeometry(0.4, 0.52, 32), ringMat, 4);
    for (let l = 0; l < 4; l++) {
      base.setColorAt(l, c.set('#ffffff').lerp(new THREE.Color(LANE_COLORS[l]), 0.18));
      rec.setColorAt(l, c.set(LANE_COLORS[l]));
      ring.setColorAt(l, c.set('#000000'));
    }
    base.receiveShadow = true;
    g.add(base, rec, ring);
    this.base = base;
    this.rec = rec;
    this.ring = ring;
    this.press = [0, 0, 0, 0];
    this.held = [false, false, false, false];
    this.flash = [0, 0, 0, 0];
    this.flashCol = LANE_COLORS.map((x) => new THREE.Color(x));

    // the arrows: a white rim and a coloured body
    const rimGeo = new THREE.ShapeGeometry(arrowShape(1.24));
    const bodyGeo = new THREE.ExtrudeGeometry(arrowShape(1), { depth: 0.07, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
    bodyGeo.translate(0, 0, 0.02);
    this.rim = new THREE.InstancedMesh(rimGeo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), MAXN);
    this.body = new THREE.InstancedMesh(bodyGeo, selfLit(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 }), 0.4), MAXN);
    // heart notes
    const hs = heartShape(0.78);
    const hRim = new THREE.ShapeGeometry(heartShape(0.98));
    const hBody = new THREE.ExtrudeGeometry(hs, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 8 });
    for (const geo of [hRim, hBody]) {
      geo.computeBoundingBox();
      const b = geo.boundingBox;
      geo.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, 0);
    }
    hBody.translate(0, 0, 0.02);
    this.hRim = new THREE.InstancedMesh(hRim, new THREE.MeshBasicMaterial({ color: '#ffffff' }), 16);
    this.hBody = new THREE.InstancedMesh(hBody, selfLit(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 }), 0.45), 16);
    // hold ribbons and the bars between two notes at once
    this.tails = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), selfLit(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, transparent: true, opacity: 0.85 }), 0.5), 32);
    // beat lines across the carpet
    this.lines = new THREE.InstancedMesh(new THREE.BoxGeometry(LANE_W * 4, 0.012, 1), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75 }), 12);
    for (const m of [this.rim, this.body, this.hRim, this.hBody, this.tails, this.lines]) {
      m.frustumCulled = false;
      m.count = 0;
      g.add(m);
    }
    for (let i = 0; i < MAXN; i++) {
      this.rim.setColorAt(i, c.set('#ffffff'));
      this.body.setColorAt(i, c.set('#ffffff'));
    }
    for (let i = 0; i < 16; i++) this.hBody.setColorAt(i, c.set('#ff4d7a'));
    for (let i = 0; i < 32; i++) this.tails.setColorAt(i, c.set('#ffffff'));
    this.rec.frustumCulled = this.base.frustumCulled = this.ring.frustumCulled = false;

    // sparks from the pads
    this.SP = 260;
    this.sp = [];
    const pos = new Float32Array(this.SP * 3);
    const col = new Float32Array(this.SP * 3);
    for (let i = 0; i < this.SP; i++) {
      this.sp.push({ life: 0, x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1 });
      pos[i * 3 + 1] = -10;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.sparks = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.22, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.sparks.frustumCulled = false;
    this.sparks.renderOrder = 5;
    g.add(this.sparks);
    this.spNext = 0;

    this.m4 = m4;
    this.c = c;
    this.q = new THREE.Quaternion();
    this.qTilt = new THREE.Quaternion();
    this.v = new THREE.Vector3();
    this.sc = new THREE.Vector3();
    this.e = new THREE.Euler();
    this.white = new THREE.Color('#ffffff');
    this.grey = new THREE.Color('#b9aab4');
    this.gold = new THREE.Color('#ffd166');
    this.heartCol = new THREE.Color('#ff4d7a');
    this.laneCol = LANE_COLORS.map((x) => new THREE.Color(x));
    this.layPads(0);
  }

  // the arrow's turn for each lane, laid on the carpet and tilted up toward the camera
  orient(lane, out, spin = 0) {
    const yaw = [Math.PI / 2, Math.PI, 0, -Math.PI / 2][lane];
    this.e.set(-Math.PI / 2 + TILT, 0, 0, 'YXZ');
    out.setFromEuler(this.e);
    const qz = this.qTilt.setFromAxisAngle(new THREE.Vector3(0, 0, 1), yaw + spin);
    return out.multiply(qz);
  }

  layPads(beatPh) {
    const { m4, q, v, sc, c } = this;
    for (let l = 0; l < 4; l++) {
      const p = this.press[l];
      const down = this.held[l] ? 1 : p;
      sc.set(1, 1 - 0.5 * down, 1);
      this.base.setMatrixAt(l, m4.compose(v.set(laneX(l), 0.06 - 0.02 * down, HIT_Z), q.identity(), sc));
      const pulse = 1 + Math.pow(1 - beatPh, 4) * 0.06 + this.flash[l] * 0.18 - down * 0.08;
      this.orient(l, q);
      this.rec.setMatrixAt(l, m4.compose(v.set(laneX(l), 0.2 - 0.04 * down, HIT_Z), q, sc.setScalar(pulse)));
      // the target glows white for a moment after a hit
      c.copy(this.laneCol[l]).lerp(this.white, Math.min(1, this.flash[l] * 0.8 + down * 0.3));
      this.rec.setColorAt(l, c);
      const f = this.flash[l];
      this.ring.setMatrixAt(l, m4.compose(v.set(laneX(l), 0.22, HIT_Z), this.orient(l, q), sc.setScalar(1 + (1 - f) * 0.45)));
      this.ring.setColorAt(l, c.copy(this.flashCol[l]).multiplyScalar(f * f * 0.9));
    }
    for (const m of [this.base, this.rec, this.ring]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }

  // after dark the carpet glows softly
  setNight(k) {
    this.carpet.material.emissiveIntensity = k * 0.42;
  }

  hitFx(lane, grade, color = null) {
    this.flash[lane] = 1;
    if (color) this.flashCol[lane].set(color);
    else this.flashCol[lane].copy(this.laneCol[lane]);
    const n = grade === 'perfect' ? 16 : grade === 'great' ? 11 : 7;
    const lc = color ? new THREE.Color(color) : this.laneCol[lane];
    for (let i = 0; i < n; i++) {
      const s = this.sp[this.spNext];
      this.spNext = (this.spNext + 1) % this.SP;
      const a = Math.random() * Math.PI * 2;
      const sp = 1.2 + Math.random() * 2.2;
      Object.assign(s, { life: 0.45 + Math.random() * 0.25, x: laneX(lane), y: 0.3, z: HIT_Z, vx: Math.cos(a) * sp * 0.6, vy: 2.5 + Math.random() * 2.5, vz: Math.sin(a) * sp * 0.4 });
      const cc = i % 3 === 0 ? this.white : lc;
      s.r = cc.r;
      s.g = cc.g;
      s.b = cc.b;
    }
  }

  // notes: the chart; songT: the song clock; approach: seconds an arrow is on the carpet
  update(dt, t, notes, songT, approach, beats, beatPh, from) {
    const len = HIT_Z - GATE_Z;
    const sz = len / approach;
    this.speedZ = sz;
    this.tex.offset.y = (songT * sz) / 2;
    const { m4, q, v, sc, c } = this;
    let nb = 0;
    let nh = 0;
    let nt = 0;
    const zOf = (time) => HIT_Z - (time - songT) * sz;
    const showFrom = songT - 0.5;
    const showTo = songT + approach;
    const pairs = new Map();
    for (let i = from; i < notes.length; i++) {
      const n = notes[i];
      if (n.t > showTo) break;
      const tailEnd = n.end || n.t;
      if (tailEnd < showFrom) continue;
      if (n.done && !n.holding) continue;
      if (n.t < showFrom && !n.end) continue;
      // where the head is: held notes stay on the pad
      let z = zOf(n.t);
      if (n.holding) z = HIT_Z;
      if (n.missed) z = Math.min(z, HIT_Z + 0.9);
      const age = (showTo - n.t) / approach; // 0 at the gate .. 1 at the pad
      const pop = Math.min(1, Math.max(0, age * 6));
      const fade = n.missed ? Math.max(0, 1 - (songT - n.t) * 2.5) : 1;
      if (fade <= 0 && !n.end) continue;
      const x = laneX(n.lane);
      const s = (0.35 + 0.65 * pop) * (n.missed ? 0.85 : 1) * (0.92 + Math.pow(1 - beatPh, 4) * 0.08);
      const partner = n.owner === 'partner';
      let col = partner ? PARTNER : n.special ? (n.gold ? this.gold : this.heartCol) : this.laneCol[n.lane];
      if (n.missed) col = this.grey;
      // hold ribbon from the head back to the end
      if (n.end && nt < 32) {
        const zEnd = Math.max(GATE_Z, zOf(n.end));
        const zHead = Math.min(z, HIT_Z);
        if (zHead > zEnd + 0.02 && !(n.done && !n.holding)) {
          this.tails.setMatrixAt(nt, m4.compose(v.set(x, 0.07, (zHead + zEnd) / 2), q.identity(), sc.set(0.34, 0.05, zHead - zEnd)));
          c.copy(n.broken ? this.grey : col).lerp(this.white, n.holding ? 0.35 + 0.25 * Math.sin(t * 20) : 0.15);
          this.tails.setColorAt(nt, c);
          nt++;
        }
      }
      if (n.done || fade <= 0) continue;
      const y = 0.24 + (n.special ? Math.sin(t * 6 + n.t) * 0.04 : 0);
      if (n.special && nh < 16) {
        this.orient(2, q, Math.sin(t * 5 + n.t) * 0.2);
        m4.compose(v.set(x, y, z), q, sc.setScalar(s * 1.05));
        this.hRim.setMatrixAt(nh, m4);
        this.hBody.setMatrixAt(nh, m4);
        this.hBody.setColorAt(nh, c.copy(col).multiplyScalar(fade));
        nh++;
      } else if (nb < MAXN) {
        this.orient(n.lane, q);
        m4.compose(v.set(x, y - 0.01, z - 0.01), q, sc.setScalar(s));
        this.rim.setMatrixAt(nb, m4);
        this.rim.setColorAt(nb, c.copy(this.white).multiplyScalar(n.missed ? 0.75 : 1));
        m4.compose(v.set(x, y, z), q, sc.setScalar(s));
        this.body.setMatrixAt(nb, m4);
        this.body.setColorAt(nb, c.copy(col));
        nb++;
      }
      // two at once: a bar between them
      if (n.double && !n.missed) {
        const key = n.t.toFixed(3);
        if (pairs.has(key)) {
          const o = pairs.get(key);
          if (nt < 32) {
            const x0 = laneX(Math.min(o.lane, n.lane)) + 0.36;
            const x1 = laneX(Math.max(o.lane, n.lane)) - 0.36;
            if (x1 > x0) {
              this.tails.setMatrixAt(nt, m4.compose(v.set((x0 + x1) / 2, 0.12, z), q.identity(), sc.set(x1 - x0, 0.06, 0.14)));
              this.tails.setColorAt(nt, c.set('#ffffff'));
              nt++;
            }
          }
        } else pairs.set(key, n);
      }
    }
    this.rim.count = this.body.count = nb;
    this.hRim.count = this.hBody.count = nh;
    this.tails.count = nt;
    for (const m of [this.rim, this.body, this.hRim, this.hBody, this.tails]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    // beat lines move with the notes; bar lines are thicker
    let nl = 0;
    for (const b of beats) {
      if (b.t < songT - 0.05) continue;
      if (b.t > showTo || nl >= 12) break;
      const z = zOf(b.t);
      if (z < GATE_Z + 0.1) continue;
      this.lines.setMatrixAt(nl++, m4.compose(v.set(0, 0.035, z), q.identity(), sc.set(1, 1, b.bar ? 0.09 : 0.035)));
    }
    this.lines.count = nl;
    this.lines.instanceMatrix.needsUpdate = true;
    // pads and sparks
    for (let l = 0; l < 4; l++) {
      this.press[l] = Math.max(0, this.press[l] - dt * 7);
      this.flash[l] = Math.max(0, this.flash[l] - dt * 3.2);
    }
    this.layPads(beatPh);
    const pa = this.sparks.geometry.attributes.position.array;
    const ca = this.sparks.geometry.attributes.color.array;
    for (let i = 0; i < this.SP; i++) {
      const s = this.sp[i];
      if (s.life <= 0) {
        if (pa[i * 3 + 1] !== -10) pa[i * 3 + 1] = -10;
        continue;
      }
      s.life -= dt;
      s.vy -= 9 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      const k = Math.max(0, Math.min(1, s.life * 2.5));
      pa[i * 3] = s.x;
      pa[i * 3 + 1] = s.y;
      pa[i * 3 + 2] = s.z;
      ca[i * 3] = s.r * k;
      ca[i * 3 + 1] = s.g * k;
      ca[i * 3 + 2] = s.b * k;
    }
    this.sparks.geometry.attributes.position.needsUpdate = true;
    this.sparks.geometry.attributes.color.needsUpdate = true;
  }
}
