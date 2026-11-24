import * as THREE from 'three';
import { buildAtlas } from './art.js';
import { PAL } from '../../interiors/yumyum/theme.js';

// Effects for the kitchen, each one draw call however many are shown: icon bubbles over plates and pots,
// progress rings, steam, smoke and foam, flames. Plus floating words in HTML and the kitchen's sounds.

const quad = new THREE.PlaneGeometry(1, 1);
const BILLBOARD = `
  vec4 mv = modelViewMatrix * vec4(instanceMatrix[3].xyz, 1.0);
  float s = length(instanceMatrix[0].xyz);
  mv.xy += position.xy * s;
  gl_Position = projectionMatrix * mv;`;

// ---------------------------------------------------------------- icon bubbles
export class Icons {
  constructor(scene, max = 120) {
    const A = buildAtlas(128);
    this.index = A.index;
    const t = new THREE.CanvasTexture(A.canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    this.geo = quad.clone();
    this.cell = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    this.geo.setAttribute('aCell', this.cell);
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: t }, grid: { value: new THREE.Vector2(A.cols, A.rows) } },
      vertexShader: `attribute float aCell; uniform vec2 grid; varying vec2 vUv;
        void main() { float c = mod(aCell, grid.x); float r = floor(aCell / grid.x);
          vUv = vec2((c + uv.x) / grid.x, 1.0 - (r + 1.0 - uv.y) / grid.y); ${BILLBOARD} }`,
      fragmentShader: `uniform sampler2D map; varying vec2 vUv;
        void main() { vec4 c = texture2D(map, vUv); if (c.a < 0.4) discard; gl_FragColor = c;
          #include <colorspace_fragment>
        }`,
      depthTest: false,
      depthWrite: false,
    });
    this.mesh = new THREE.InstancedMesh(this.geo, mat, max);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 20;
    this.mesh.count = 0;
    scene.add(this.mesh);
    this.max = max;
    this.n = 0;
    this.m = new THREE.Matrix4();
  }
  begin() {
    this.n = 0;
  }
  add(p, key, size = 0.34) {
    const i = this.index(key);
    if (i < 0 || this.n >= this.max) return;
    this.m.makeScale(size, size, size).setPosition(p);
    this.mesh.setMatrixAt(this.n, this.m);
    this.cell.array[this.n] = i;
    this.n++;
  }
  end() {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.cell.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- progress rings
export class Rings {
  constructor(scene, max = 24) {
    this.geo = quad.clone();
    this.k = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    this.col = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.geo.setAttribute('aK', this.k);
    this.geo.setAttribute('aCol', this.col);
    const mat = new THREE.ShaderMaterial({
      uniforms: { rim: { value: new THREE.Color(PAL.inkDeep) } },
      vertexShader: `attribute float aK; attribute vec3 aCol; varying float vK; varying vec3 vCol; varying vec2 vUv;
        void main() { vK = aK; vCol = aCol; vUv = uv; ${BILLBOARD} }`,
      fragmentShader: `uniform vec3 rim; varying float vK; varying vec3 vCol; varying vec2 vUv;
        void main() {
          vec2 p = vUv * 2.0 - 1.0; float r = length(p);
          if (r > 1.0) discard;
          float a = atan(p.x, p.y); float f = (a < 0.0 ? a + 6.2831853 : a) / 6.2831853;
          vec3 c = vec3(1.0, 0.985, 0.95);
          float band = smoothstep(0.42, 0.47, r) * (1.0 - smoothstep(0.84, 0.88, r));
          c = mix(c, f <= vK ? vCol : vec3(0.92, 0.84, 0.83), band);
          c = mix(c, rim, smoothstep(0.88, 0.93, r));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
      depthTest: false,
      depthWrite: false,
    });
    this.mesh = new THREE.InstancedMesh(this.geo, mat, max);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 19;
    this.mesh.count = 0;
    scene.add(this.mesh);
    this.max = max;
    this.n = 0;
    this.m = new THREE.Matrix4();
    this.c = new THREE.Color();
  }
  begin() {
    this.n = 0;
  }
  add(p, k, color = '#7cc95a', size = 0.3) {
    if (this.n >= this.max) return;
    this.m.makeScale(size, size, size).setPosition(p);
    this.mesh.setMatrixAt(this.n, this.m);
    this.k.array[this.n] = Math.max(0, Math.min(1, k));
    this.c.set(color);
    this.col.array.set([this.c.r, this.c.g, this.c.b], this.n * 3);
    this.n++;
  }
  end() {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.k.needsUpdate = true;
    this.col.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- soft particles
export class Puffs {
  constructor(scene, max = 220) {
    this.geo = quad.clone();
    this.alpha = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    this.geo.setAttribute('aA', this.alpha);
    const mat = new THREE.ShaderMaterial({
      vertexShader: `attribute float aA; varying float vA; varying vec2 vUv; varying vec3 vC;
        void main() { vA = aA; vUv = uv; vC = instanceColor; ${BILLBOARD} }`,
      fragmentShader: `varying float vA; varying vec2 vUv; varying vec3 vC;
        void main() { float r = length(vUv * 2.0 - 1.0); float a = (1.0 - smoothstep(0.35, 1.0, r)) * vA; if (a < 0.01) discard; gl_FragColor = vec4(vC, a);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new THREE.InstancedMesh(this.geo, mat, max);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10;
    scene.add(this.mesh);
    this.max = max;
    this.list = [];
    this.m = new THREE.Matrix4();
    this.c = new THREE.Color();
  }
  // o: { v: [x, y, z], life, s0, s1, color, a, g }
  spawn(p, o) {
    if (this.list.length >= this.max) this.list.shift();
    this.list.push({ x: p.x, y: p.y, z: p.z, vx: o.v?.[0] || 0, vy: o.v?.[1] || 0, vz: o.v?.[2] || 0, life: o.life || 1, t: 0, s0: o.s0 ?? 0.15, s1: o.s1 ?? 0.4, color: o.color || '#ffffff', a: o.a ?? 0.7, g: o.g || 0, drag: o.drag ?? 0.6 });
  }
  update(dt) {
    let n = 0;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      if (p.t >= p.life) {
        this.list.splice(i, 1);
        continue;
      }
      p.vy -= p.g * dt;
      const d = Math.exp(-p.drag * dt);
      p.vx *= d;
      p.vz *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
    }
    for (const p of this.list) {
      const k = p.t / p.life;
      const s = p.s0 + (p.s1 - p.s0) * k;
      this.m.makeScale(s, s, s).setPosition(p.x, p.y, p.z);
      this.mesh.setMatrixAt(n, this.m);
      this.c.set(p.color);
      this.mesh.instanceColor.array.set([this.c.r, this.c.g, this.c.b], n * 3);
      this.alpha.array[n] = p.a * Math.min(1, k * 6) * (1 - k);
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
    this.alpha.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- flames
export class Flames {
  constructor(scene, max = 48) {
    const geo = new THREE.ConeGeometry(0.15, 0.62, 8);
    geo.translate(0, 0.31, 0);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), max);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
    this.max = max;
    this.m = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.e = new THREE.Euler();
    this.c = new THREE.Color();
  }
  draw(fires, t) {
    let n = 0;
    for (const f of fires) {
      for (let k = 0; k < 4 && n < this.max; k++) {
        const ph = t * (7 + k) + k * 2 + f.i;
        const s = (0.6 + 0.5 * f.k) * (0.75 + 0.25 * Math.sin(ph)) * (k === 0 ? 1.4 : 1);
        const a = (k / 4) * Math.PI * 2 + f.i;
        const r = k === 0 ? 0 : 0.22;
        this.e.set(Math.sin(ph * 0.7) * 0.15, 0, Math.cos(ph * 0.9) * 0.15);
        this.q.setFromEuler(this.e);
        this.m.compose(new THREE.Vector3(f.x + Math.cos(a) * r, f.y, f.z + Math.sin(a) * r), this.q, new THREE.Vector3(s, s * (1.1 + 0.3 * Math.sin(ph * 1.3)), s));
        this.mesh.setMatrixAt(n, this.m);
        this.c.set(k === 0 ? '#ff6a1a' : k % 2 ? '#ffd23f' : '#ff9a2e');
        this.mesh.setColorAt(n, this.c);
        n++;
      }
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- floating words in HTML
export class Words {
  constructor(camera) {
    this.camera = camera;
    this.el = document.createElement('div');
    this.el.className = 'ck2-words';
    document.body.appendChild(this.el);
    this.list = [];
    this.v = new THREE.Vector3();
  }
  // kind: 'say' (a speech bubble that follows a chef), 'pop' (a number that floats up), 'bad'
  add(text, at, { kind = 'pop', life = 1.4, follow = null, color = null } = {}) {
    if (follow) for (const w of this.list) if (w.follow === follow && w.kind === 'say') w.life = Math.min(w.life, w.t + 0.05);
    const d = document.createElement('div');
    d.className = `ck2-w ck2-${kind}`;
    d.textContent = text;
    if (color) d.style.setProperty('--c', color);
    this.el.appendChild(d);
    this.list.push({ d, p: at.clone(), t: 0, life, follow, kind });
  }
  update(dt) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const w = this.list[i];
      w.t += dt;
      if (w.t >= w.life) {
        w.d.remove();
        this.list.splice(i, 1);
        continue;
      }
      if (w.follow) w.p.set(w.follow.x, 2.05 + (w.follow.hop || 0), w.follow.z);
      this.v.copy(w.p);
      if (w.kind !== 'say') this.v.y += w.t * 0.7;
      this.v.project(this.camera);
      const x = (this.v.x * 0.5 + 0.5) * W;
      const y = (-this.v.y * 0.5 + 0.5) * H;
      const k = w.t / w.life;
      w.d.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%) scale(${w.t < 0.12 ? 0.6 + w.t * 3.3 : 1})`;
      w.d.style.opacity = String(k > 0.8 ? (1 - k) / 0.2 : 1);
    }
  }
  clear() {
    for (const w of this.list) w.d.remove();
    this.list.length = 0;
  }
  dispose() {
    this.clear();
    this.el.remove();
  }
}

// ---------------------------------------------------------------- markers under the chefs you play
export function makeMarkers(scene) {
  const mk = (color) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.46, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.renderOrder = 5;
    const sel = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.6, 4, 1), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
    sel.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
    sel.scale.set(1.15, 1.15, 1);
    sel.renderOrder = 6;
    scene.add(ring, sel);
    return { ring, sel };
  };
  return { p1: mk('#e0607e'), p2: mk('#3f7bf0') };
}

// ---------------------------------------------------------------- sounds, all synthesised
export class Sfx {
  constructor(sound) {
    this.s = sound;
    this.loops = [];
    this.alarmT = 0;
    this.on = true;
  }
  get ok() {
    return this.on && this.s?.ctx && !this.s.muted && this.s.sfx;
  }
  ui(n) {
    if (this.on) this.s?.ui?.(n);
  }
  tone(f, d, o = {}, delay = 0) {
    if (!this.ok) return;
    this.s.tone(f, this.s.ctx.currentTime + delay, d, o);
  }
  noise(dur, { freq = 3000, q = 1, gain = 0.03, slideTo = null, type = 'bandpass', delay = 0 } = {}) {
    if (!this.ok) return;
    const ac = this.s.ctx;
    this.buf ??= this.s.makeNoise();
    const src = ac.createBufferSource();
    src.buffer = this.buf;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    const t0 = ac.currentTime + delay;
    f.frequency.setValueAtTime(freq, t0);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.s.sfx);
    src.start(t0, Math.random() * 0.3);
    src.stop(t0 + dur + 0.05);
  }
  // A looping noise whose loudness follows a level 0..1 (sizzling pans, bubbling pots).
  loop({ freq = 5000, q = 0.7, type = 'highpass' } = {}) {
    const L = { level: 0, g: null };
    this.loops.push(L);
    L.make = () => {
      if (L.g || !this.ok) return;
      const ac = this.s.ctx;
      this.buf ??= this.s.makeNoise();
      const src = ac.createBufferSource();
      src.buffer = this.buf;
      src.loop = true;
      const f = ac.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ac.createGain();
      g.gain.value = 0;
      src.connect(f).connect(g).connect(this.s.sfx);
      src.start();
      L.src = src;
      L.g = g;
    };
    L.set = (v) => {
      L.make();
      if (L.g) L.g.gain.setTargetAtTime(this.ok ? v : 0, this.s.ctx.currentTime, 0.08);
    };
    return L;
  }
  chop() {
    this.noise(0.06, { freq: 900, q: 1.2, gain: 0.05, type: 'lowpass' });
    this.tone(140 + Math.random() * 30, 0.07, { type: 'triangle', gain: 0.05 });
  }
  bell() {
    this.tone(1318, 0.9, { type: 'sine', gain: 0.07 });
    this.tone(2637, 0.6, { type: 'sine', gain: 0.025 });
    this.tone(1976, 0.5, { type: 'triangle', gain: 0.02 }, 0.01);
  }
  coin(n = 1) {
    for (let i = 0; i < n; i++) {
      this.tone(1568, 0.06, { type: 'square', gain: 0.016 }, i * 0.07);
      this.tone(2093, 0.18, { type: 'triangle', gain: 0.04 }, i * 0.07 + 0.05);
    }
  }
  splash() {
    this.noise(0.25, { freq: 1400, slideTo: 600, q: 0.8, gain: 0.035 });
  }
  pop() {
    this.tone(700, 0.08, { type: 'sine', gain: 0.06, slideTo: 1100 });
  }
  put() {
    this.tone(320, 0.06, { type: 'triangle', gain: 0.05, slideTo: 220 });
  }
  pick() {
    this.tone(500, 0.06, { type: 'triangle', gain: 0.045, slideTo: 760 });
  }
  bump() {
    this.tone(220, 0.14, { type: 'sine', gain: 0.08, slideTo: 140 });
    this.tone(330, 0.1, { type: 'triangle', gain: 0.03 }, 0.03);
  }
  whoosh() {
    this.noise(0.18, { freq: 700, slideTo: 2400, q: 0.9, gain: 0.03 });
  }
  spray() {
    this.noise(0.14, { freq: 3500, q: 0.4, gain: 0.04, type: 'highpass' });
  }
  ding() {
    this.tone(880, 0.12, { type: 'sine', gain: 0.05 });
    this.tone(1320, 0.2, { type: 'sine', gain: 0.04 }, 0.08);
  }
  warn() {
    this.tone(660, 0.1, { type: 'square', gain: 0.02 });
  }
  alarm(dt, on) {
    if (!on) {
      this.alarmT = 0;
      return;
    }
    this.alarmT -= dt;
    if (this.alarmT <= 0) {
      this.alarmT = 0.55;
      this.tone(988, 0.22, { type: 'square', gain: 0.025 });
      this.tone(740, 0.22, { type: 'square', gain: 0.02 }, 0.26);
    }
  }
  whistle() {
    for (const d of [0, 0.34]) {
      this.tone(2200, 0.26, { type: 'sine', gain: 0.06, slideTo: 2500 }, d);
      this.noise(0.26, { freq: 2300, q: 6, gain: 0.02, delay: d });
    }
  }
  rumble() {
    this.noise(0.9, { freq: 160, q: 0.8, gain: 0.05, type: 'lowpass' });
  }
  stopLoops() {
    for (const L of this.loops) {
      try {
        L.src?.stop();
      } catch {
        /* already stopped */
      }
      L.g?.disconnect();
      L.g = null;
    }
    this.loops.length = 0;
  }
}
