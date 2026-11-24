import * as THREE from 'three';
import { PAL } from '../../interiors/yumyum/theme.js';
import { FONT, roundRect } from '../../util.js';
import { drawItem } from './food.js';

// Small visual helpers for the kitchen: progress rings, steam, floating words, order bubbles,
// and camera-facing tags merged into one mesh. Each is one draw call however many are shown.

// ---------------------------------------------------------------- progress ring (one quad, one shader)
const ringGeo = new THREE.PlaneGeometry(1, 1);
const RING_VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const RING_FS = `
uniform float k; uniform vec3 col; uniform vec3 rim; uniform float pulse; varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0; float r = length(p);
  float aa = 0.06;
  float alpha = 1.0 - smoothstep(1.0 - aa, 1.0, r);
  if (alpha <= 0.0) discard;
  float a = atan(p.x, p.y); float f = (a < 0.0 ? a + 6.2831853 : a) / 6.2831853;
  vec3 c = vec3(1.0, 0.985, 0.94);
  float band = smoothstep(0.52, 0.56, r) * (1.0 - smoothstep(0.86, 0.9, r));
  vec3 track = vec3(0.93, 0.83, 0.82);
  vec3 fill = mix(col, vec3(1.0), pulse * 0.35);
  c = mix(c, f <= k ? fill : track, band);
  c = mix(c, rim, smoothstep(0.88, 0.92, r));
  gl_FragColor = vec4(c, alpha);
  #include <colorspace_fragment>
}`;
export function makeRing(scene, size = 0.2) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { k: { value: 0 }, col: { value: new THREE.Color('#7cc95a') }, rim: { value: new THREE.Color(PAL.inkDeep) }, pulse: { value: 0 } },
    vertexShader: RING_VS,
    fragmentShader: RING_FS,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const m = new THREE.Mesh(ringGeo, mat);
  m.scale.setScalar(size);
  m.renderOrder = 7;
  m.visible = false;
  scene.add(m);
  return {
    m,
    set(k, color, pulse = 0) {
      m.visible = true;
      mat.uniforms.k.value = Math.max(0, Math.min(1, k));
      mat.uniforms.col.value.set(color);
      mat.uniforms.pulse.value = pulse;
    },
    hide() {
      m.visible = false;
    },
  };
}

// ---------------------------------------------------------------- steam and smoke as points
let softTex = null;
function soft() {
  if (softTex) return softTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  softTex = new THREE.CanvasTexture(c);
  return softTex;
}
export function makePuffs(scene, n = 48) {
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 4);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  const mat = new THREE.PointsMaterial({ size: 0.34, map: soft(), vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 3;
  scene.add(pts);
  const P = Array.from({ length: n }, () => ({ life: 0, v: new THREE.Vector3(), c: [1, 1, 1], a: 0.6 }));
  let next = 0;
  const tmp = new THREE.Color();
  return {
    emit(x, y, z, color = '#ffffff', { count = 1, spread = 0.1, up = 0.5, alpha = 0.55 } = {}) {
      tmp.set(color);
      for (let i = 0; i < count; i++) {
        const k = next;
        next = (next + 1) % n;
        const p = P[k];
        p.life = 1;
        p.a = alpha;
        p.c = [tmp.r, tmp.g, tmp.b];
        pos[k * 3] = x + (Math.random() - 0.5) * spread;
        pos[k * 3 + 1] = y;
        pos[k * 3 + 2] = z + (Math.random() - 0.5) * spread * 0.6;
        p.v.set((Math.random() - 0.5) * 0.15, up * (0.7 + Math.random() * 0.6), (Math.random() - 0.5) * 0.05);
      }
    },
    update(dt) {
      for (let k = 0; k < n; k++) {
        const p = P[k];
        if (p.life <= 0) {
          col[k * 4 + 3] = 0;
          continue;
        }
        p.life -= dt * 0.9;
        pos[k * 3] += p.v.x * dt;
        pos[k * 3 + 1] += p.v.y * dt;
        pos[k * 3 + 2] += p.v.z * dt;
        col[k * 4] = p.c[0];
        col[k * 4 + 1] = p.c[1];
        col[k * 4 + 2] = p.c[2];
        col[k * 4 + 3] = Math.max(0, p.life) * p.a * Math.min(1, (1 - p.life) * 6);
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}

// ---------------------------------------------------------------- floating words ("+12", "Perfect!")
export function makeWords(scene, n = 8) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 96;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    s.renderOrder = 9;
    s.visible = false;
    scene.add(s);
    list.push({ s, canvas, tex, life: 0, size: 1, base: new THREE.Vector3() });
  }
  return {
    say(text, pos, color = PAL.inkDeep, size = 1) {
      const w = list.reduce((a, b) => (b.life < a.life ? b : a), list[0]);
      const c = w.canvas.getContext('2d');
      c.clearRect(0, 0, 640, 96);
      c.font = `700 60px ${FONT}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineWidth = 14;
      c.lineJoin = 'round';
      c.strokeStyle = '#ffffff';
      c.strokeText(text, 320, 50, 620);
      c.fillStyle = color;
      c.fillText(text, 320, 50, 620);
      w.tex.needsUpdate = true;
      w.life = 1.2;
      w.size = size;
      w.s.visible = true;
      w.base.copy(pos);
    },
    update(dt) {
      for (const w of list) {
        if (w.life <= 0) continue;
        w.life -= dt;
        const k = 1 - w.life / 1.2;
        const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.55 : 1.15 - Math.min(0.15, (k - 0.15) * 0.6);
        w.s.scale.set(1.92 * w.size * pop, 0.29 * w.size * pop, 1);
        w.s.position.set(w.base.x, w.base.y + k * 0.45, w.base.z);
        w.s.material.opacity = Math.min(1, w.life * 3);
        if (w.life <= 0) w.s.visible = false;
      }
    },
  };
}

// ---------------------------------------------------------------- camera-facing tags in one mesh
// tags: [{ pos: Vector3, w, h, cell }]; cells index a grid of `cols` x `rows` on the texture.
export function makeTagBatch(scene, texture, cols, rows) {
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
  const m = new THREE.Mesh(new THREE.BufferGeometry(), material);
  m.renderOrder = 6;
  m.frustumCulled = false;
  scene.add(m);
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  return {
    m,
    build(tags, camera) {
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      const pos = [];
      const uv = [];
      const idx = [];
      tags.forEach((t, i) => {
        const cx = t.cell % cols;
        const cy = Math.floor(t.cell / cols);
        const u0 = cx / cols;
        const u1 = (cx + 1) / cols;
        const v1 = 1 - cy / rows;
        const v0 = 1 - (cy + 1) / rows;
        for (const [sx, sy, u, v] of [[-1, -1, u0, v0], [1, -1, u1, v0], [1, 1, u1, v1], [-1, 1, u0, v1]]) {
          pos.push(t.pos.x + right.x * sx * t.w * 0.5 + up.x * sy * t.h * 0.5, t.pos.y + right.y * sx * t.w * 0.5 + up.y * sy * t.h * 0.5, t.pos.z + right.z * sx * t.w * 0.5 + up.z * sy * t.h * 0.5);
          uv.push(u, v);
        }
        idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
      });
      m.geometry.dispose();
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      m.geometry = g;
    },
  };
}

// The texture for key badges (cells 0..8 hold 1..9) and lock tags (cells 12.. hold "Level 2".. "Level 12").
export function tagTexture() {
  const cols = 6;
  const rows = 5;
  const cw = 160;
  const ch = 64;
  const c = document.createElement('canvas');
  c.width = cols * cw;
  c.height = rows * ch;
  const g = c.getContext('2d');
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < 9; i++) {
    const x = (i % cols) * cw + cw / 2;
    const y = Math.floor(i / cols) * ch + ch / 2;
    g.fillStyle = PAL.paper;
    g.beginPath();
    g.arc(x, y, 27, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = PAL.ink;
    g.stroke();
    g.fillStyle = PAL.inkDeep;
    g.font = `700 34px ${FONT}`;
    g.fillText(String(i + 1), x, y + 2);
  }
  for (let n = 2; n <= 12; n++) {
    const i = 10 + n;
    const x0 = (i % cols) * cw;
    const y0 = Math.floor(i / cols) * ch;
    g.fillStyle = 'rgba(255,251,238,0.94)';
    roundRect(g, x0 + 6, y0 + 8, cw - 12, ch - 16, 22);
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = PAL.frame;
    g.stroke();
    g.strokeStyle = PAL.inkDeep;
    g.lineWidth = 3.5;
    g.lineCap = 'round';
    g.strokeRect(x0 + 24, y0 + 30, 18, 14);
    g.beginPath();
    g.arc(x0 + 33, y0 + 29, 6, Math.PI, 0);
    g.stroke();
    g.fillStyle = PAL.inkDeep;
    g.font = `600 26px ${FONT}`;
    g.fillText(`Level ${n}`, x0 + cw / 2 + 14, y0 + ch / 2 + 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { texture: t, cols, rows, lockCell: (n) => 10 + n };
}

// ---------------------------------------------------------------- order bubbles
export const BUB = { w: 512, h: 372 };
export function makeBubble(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = BUB.w;
  canvas.height = BUB.h;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  s.renderOrder = 6;
  s.visible = false;
  scene.add(s);
  return { s, canvas, tex, key: '', k: 0 };
}
const patColor = (f) => (f > 0.6 ? '#7cc95a' : f > 0.3 ? '#f4b942' : '#e5484d');
export function drawBubble(b, { order, frac, vip, name }) {
  const g = b.canvas.getContext('2d');
  const { w: W, h: H } = BUB;
  g.clearRect(0, 0, W, H);
  const top = vip ? 46 : 22;
  const bot = H - 54;
  const low = frac < 0.3;
  g.fillStyle = PAL.paper;
  g.strokeStyle = vip ? '#ef6f8c' : low ? '#e5484d' : PAL.ink;
  g.lineWidth = 10;
  roundRect(g, 10, top, W - 20, bot - top, 52);
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(W / 2 - 30, bot - 4);
  g.lineTo(W / 2, H - 8);
  g.lineTo(W / 2 + 30, bot - 4);
  g.fill();
  g.stroke();
  g.fillRect(W / 2 - 27, bot - 14, 54, 14);
  const n = order.length;
  const slot = n === 1 ? 210 : n === 2 ? 200 : 152;
  const size = n === 1 ? 196 : n === 2 ? 178 : 142;
  const x0 = W / 2 - (n * slot) / 2;
  const iy = top + 14 + size * 0.47;
  order.forEach((o, k) => {
    const cx = x0 + (k + 0.5) * slot;
    g.globalAlpha = o.done ? 0.3 : 1;
    drawItem(g, o.key, cx, iy, size);
    g.globalAlpha = 1;
    if (o.done) {
      g.fillStyle = '#5bb85d';
      g.beginPath();
      g.arc(cx, iy, 40, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 11;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(cx - 18, iy + 1);
      g.lineTo(cx - 4, iy + 15);
      g.lineTo(cx + 20, iy - 13);
      g.stroke();
    }
  });
  // Patience bar
  const bw = W - 120;
  const by = bot - 44;
  g.fillStyle = PAL.blush;
  roundRect(g, 60, by, bw, 24, 12);
  g.fill();
  if (frac > 0.01) {
    g.fillStyle = patColor(frac);
    roundRect(g, 60, by, Math.max(24, bw * frac), 24, 12);
    g.fill();
  }
  g.lineWidth = 4;
  g.strokeStyle = PAL.frame;
  roundRect(g, 60, by, bw, 24, 12);
  g.stroke();
  if (vip) {
    g.font = `700 36px ${FONT}`;
    const tw = g.measureText(name).width + 78;
    g.fillStyle = '#ef6f8c';
    roundRect(g, W / 2 - tw / 2, 2, tw, 54, 27);
    g.fill();
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(name, W / 2 + 14, 31);
    const hx = W / 2 - tw / 2 + 30;
    g.beginPath();
    g.moveTo(hx, 42);
    g.bezierCurveTo(hx - 20, 30, hx - 12, 12, hx, 22);
    g.bezierCurveTo(hx + 12, 12, hx + 20, 30, hx, 42);
    g.fill();
  }
  b.tex.needsUpdate = true;
}

// A pink arrow that bobs over the next thing to tap.
export function makeArrow(scene) {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 128;
  const g = c.getContext('2d');
  g.beginPath();
  g.moveTo(30, 8);
  g.lineTo(66, 8);
  g.lineTo(66, 62);
  g.lineTo(88, 62);
  g.lineTo(48, 120);
  g.lineTo(8, 62);
  g.lineTo(30, 62);
  g.closePath();
  g.lineJoin = 'round';
  g.lineWidth = 10;
  g.strokeStyle = '#ffffff';
  g.stroke();
  g.fillStyle = PAL.ink;
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  s.scale.set(0.26, 0.34, 1);
  s.renderOrder = 10;
  s.visible = false;
  scene.add(s);
  return s;
}
