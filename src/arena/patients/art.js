import * as THREE from 'three';
import { roundRect, FONT } from '../../util.js';
import { C } from '../../places/hospital/models.js';

// Canvas pictures for the hands-on steps: what the little light shows (a throat, an ear, two eyes),
// the X-ray films, a patch of skin with a cut, the surgery window and the heart monitor screen.
// Positions are in normalised picture coordinates (u right, v down, both 0..1).

// A picture painted on a canvas, shown on a plane (w x h metres) facing +Z. local (x, y) <-> (u, v).
export class Board {
  constructor(w, h, px = 512, { round = false, basic = true } = {}) {
    this.w = w;
    this.h = h;
    this.canvas = document.createElement('canvas');
    this.canvas.width = px;
    this.canvas.height = Math.round((px * h) / w);
    this.g = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    const geo = round ? new THREE.CircleGeometry(w / 2, 48) : new THREE.PlaneGeometry(w, h);
    const m = basic ? new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, toneMapped: false }) : new THREE.MeshStandardMaterial({ map: this.tex, transparent: true, roughness: 0.7 });
    this.mesh = new THREE.Mesh(geo, m);
  }
  get W() {
    return this.canvas.width;
  }
  get H() {
    return this.canvas.height;
  }
  uv(x, y) {
    return { u: x / this.w + 0.5, v: 0.5 - y / this.h };
  }
  local(u, v) {
    return { x: (u - 0.5) * this.w, y: (0.5 - v) * this.h };
  }
  flush() {
    this.tex.needsUpdate = true;
  }
  dispose() {
    if (this.gone) return;
    this.gone = true;
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.tex.dispose();
    this.canvas.width = this.canvas.height = 1;
  }
}

// The dark over the light's picture: only a soft circle round the light shows. setLight(u, v).
export function darkLens(radius) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uL: { value: new THREE.Vector2(0.5, 0.5) }, uR: { value: 0.16 }, uA: { value: 0.93 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader:
      'uniform vec2 uL; uniform float uR; uniform float uA; varying vec2 vUv; void main(){ float d = distance(vUv, uL); float a = smoothstep(uR * 0.7, uR * 1.25, d) * uA; vec3 glow = vec3(1.0, 0.95, 0.75) * (1.0 - smoothstep(0.0, uR, d)) * 0.12; gl_FragColor = vec4(vec3(0.07, 0.04, 0.1) + glow, max(a, 0.0)); }',
  });
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), mat);
  m.renderOrder = 8;
  return {
    mesh: m,
    set(u, v, r = 0.16) {
      mat.uniforms.uL.value.set(u, 1 - v);
      mat.uniforms.uR.value = r;
    },
    fade(a) {
      mat.uniforms.uA.value = a;
    },
  };
}

const circle = (g, x, y, r) => {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
};

// ------------------------------------------------------------------ what the light shows
// Returns { spots: [{ u, v, r }] }; draw(found[]) repaints with the found spots marked.
export function throatPic(b, r) {
  const { g, W, H } = b;
  const spots = [
    { u: 0.3 + r() * 0.05, v: 0.5 + r() * 0.08, r: 0.07 },
    { u: 0.67 + r() * 0.05, v: 0.47 + r() * 0.1, r: 0.07 },
  ];
  if (r() < 0.6) spots.push({ u: 0.5 + (r() - 0.5) * 0.12, v: 0.66 + r() * 0.06, r: 0.065 });
  const draw = (found = []) => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#f6c3b0';
    g.fillRect(0, 0, W, H);
    // Lips
    g.fillStyle = '#e8737f';
    g.beginPath();
    g.ellipse(W / 2, H * 0.52, W * 0.46, H * 0.4, 0, 0, Math.PI * 2);
    g.fill();
    // Inside
    const gr = g.createRadialGradient(W / 2, H * 0.48, 10, W / 2, H * 0.52, W * 0.42);
    gr.addColorStop(0, '#5a1f2e');
    gr.addColorStop(1, '#a33a4c');
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(W / 2, H * 0.52, W * 0.4, H * 0.34, 0, 0, Math.PI * 2);
    g.fill();
    // Teeth
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) {
      roundRect(g, W * (0.26 + i * 0.081), H * 0.19, W * 0.07, H * 0.08, 10);
      g.fill();
      roundRect(g, W * (0.3 + i * 0.068), H * 0.79, W * 0.06, H * 0.06, 10);
      g.fill();
    }
    // Tonsils, uvula, tongue
    g.fillStyle = '#d9667a';
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(W * (0.5 + s * 0.19), H * 0.52, W * 0.075, H * 0.13, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#e07b8c';
    g.beginPath();
    g.moveTo(W * 0.46, H * 0.27);
    g.quadraticCurveTo(W * 0.5, H * 0.5, W * 0.54, H * 0.27);
    g.fill();
    circle(g, W * 0.5, H * 0.42, W * 0.028);
    g.fill();
    g.fillStyle = '#f48fa0';
    g.beginPath();
    g.ellipse(W / 2, H * 0.78, W * 0.3, H * 0.15, 0, Math.PI, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(180,60,80,0.6)';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(W / 2, H * 0.66);
    g.lineTo(W / 2, H * 0.76);
    g.stroke();
    // Sore spots
    spots.forEach((s, i) => {
      g.fillStyle = '#ff2f4f';
      circle(g, s.u * W, s.v * H, s.r * W * 0.42);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.7)';
      circle(g, s.u * W - s.r * W * 0.14, s.v * H - s.r * W * 0.14, s.r * W * 0.1);
      g.fill();
      if (found[i]) ring(g, s.u * W, s.v * H, s.r * W * 0.75);
    });
  };
  draw();
  return { spots, draw };
}

export function earPic(b, r) {
  const { g, W, H } = b;
  const a = r() * Math.PI * 2;
  const spots = [{ u: 0.5 + Math.cos(a) * 0.17, v: 0.5 + Math.sin(a) * 0.17, r: 0.08 }];
  const a2 = a + 2 + r() * 2;
  spots.push({ u: 0.5 + Math.cos(a2) * 0.27, v: 0.5 + Math.sin(a2) * 0.27, r: 0.075 });
  const draw = (found = []) => {
    g.clearRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) {
      const k = 1 - i / 6;
      g.fillStyle = `rgb(${Math.round(245 - i * 22)},${Math.round(190 - i * 25)},${Math.round(170 - i * 22)})`;
      circle(g, W / 2 + i * 3, H / 2 + i * 2, (W / 2) * k);
      g.fill();
    }
    g.fillStyle = '#3a1a22';
    circle(g, W / 2 + 18, H / 2 + 12, W * 0.06);
    g.fill();
    spots.forEach((s, i) => {
      g.fillStyle = '#ff3b55';
      g.beginPath();
      g.ellipse(s.u * W, s.v * H, s.r * W * 0.5, s.r * W * 0.36, a, 0, Math.PI * 2);
      g.fill();
      if (found[i]) ring(g, s.u * W, s.v * H, s.r * W * 0.75);
    });
  };
  draw();
  return { spots, draw };
}

// Two big eyes; shine the light into each and the pupil gets small.
export function eyesPic(b, r, skin = '#f8dccb') {
  const { g, W, H } = b;
  const spots = [{ u: 0.3, v: 0.5, r: 0.1 }, { u: 0.7, v: 0.5, r: 0.1 }];
  const iris = ['#7a4a26', '#4a7a46', '#3e6aa0'][Math.floor(r() * 3)];
  const draw = (found = [], lit = []) => {
    g.fillStyle = skin;
    g.fillRect(0, 0, W, H);
    for (const [i, s] of spots.entries()) {
      const x = s.u * W;
      const y = s.v * H;
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(x, y, W * 0.15, H * 0.12, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = iris;
      circle(g, x, y, W * 0.085);
      g.fill();
      g.fillStyle = '#140c10';
      circle(g, x, y, W * (found[i] ? 0.025 : 0.05 - (lit[i] || 0) * 0.02));
      g.fill();
      g.fillStyle = '#ffffff';
      circle(g, x - W * 0.03, y - W * 0.03, W * 0.016);
      g.fill();
      g.strokeStyle = '#3b2b3f';
      g.lineWidth = 6;
      g.beginPath();
      g.ellipse(x, y, W * 0.15, H * 0.12, 0, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
      if (found[i]) ring(g, x, y, W * 0.13);
    }
  };
  draw();
  return { spots, draw };
}

function ring(g, x, y, rad) {
  g.strokeStyle = '#7fd8bf';
  g.lineWidth = 10;
  circle(g, x, y, rad);
  g.stroke();
  g.strokeStyle = '#ffffff';
  g.lineWidth = 3;
  circle(g, x, y, rad);
  g.stroke();
}

// ------------------------------------------------------------------ X-ray films
// view: 'arm' | 'leg' | 'toy' | 'stones' | 'splinter'. Returns { targets: [{ u, v, r, label }], draw(found, misses) }.
export function xrayPic(canvas, view, r) {
  const g = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const bone = (x1, y1, x2, y2, w) => {
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(235,245,255,0.92)';
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
    g.fillStyle = 'rgba(235,245,255,0.95)';
    for (const [x, y] of [[x1, y1], [x2, y2]]) {
      circle(g, x, y, w * 0.75);
      g.fill();
    }
  };
  const crack = (x, y, ang) => {
    g.strokeStyle = '#1b2a4a';
    g.lineWidth = 6;
    g.lineJoin = 'round';
    g.beginPath();
    const n = [-1, -0.5, 0, 0.5, 1];
    n.forEach((t, i) => {
      const px = x + Math.cos(ang + Math.PI / 2) * t * 26 + (i % 2 ? 7 : -7) * Math.cos(ang);
      const py = y + Math.sin(ang + Math.PI / 2) * t * 26 + (i % 2 ? 7 : -7) * Math.sin(ang);
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
    });
    g.stroke();
  };
  const targets = [];
  let paint;
  if (view === 'arm' || view === 'leg' || view === 'splinter') {
    const leg = view !== 'arm';
    const k = 0.3 + r() * 0.4;
    paint = () => {
      if (!leg) {
        bone(W * 0.1, H * 0.42, W * 0.46, H * 0.5, 34);
        bone(W * 0.5, H * 0.47, W * 0.82, H * 0.38, 20);
        bone(W * 0.5, H * 0.56, W * 0.82, H * 0.5, 16);
        for (let i = 0; i < 4; i++) bone(W * 0.86, H * (0.36 + i * 0.06), W * 0.95, H * (0.33 + i * 0.07), 9);
      } else {
        bone(W * 0.06, H * 0.45, W * 0.44, H * 0.48, 40);
        circle(g, W * 0.47, H * 0.48, 26);
        g.fill();
        bone(W * 0.5, H * 0.46, W * 0.86, H * 0.43, 28);
        bone(W * 0.5, H * 0.56, W * 0.86, H * 0.54, 14);
        bone(W * 0.88, H * 0.42, W * 0.93, H * 0.7, 18);
      }
    };
    if (view === 'splinter') {
      const x = W * (0.55 + r() * 0.25);
      const y = H * (0.6 + r() * 0.12);
      targets.push({ u: x / W, v: y / H, r: 0.07, label: 'the splinter' });
      const p0 = paint;
      paint = () => {
        p0();
        g.strokeStyle = '#ffe6a0';
        g.lineWidth = 7;
        g.beginPath();
        g.moveTo(x - 50, y + 16);
        g.lineTo(x + 50, y - 16);
        g.stroke();
      };
    } else {
      const x = leg ? W * (0.55 + k * 0.28) : W * (0.52 + k * 0.28);
      const y = leg ? H * (0.46 - k * 0.03) : H * (0.46 - k * 0.07);
      targets.push({ u: x / W, v: y / H, r: 0.075, label: 'the break' });
      const p0 = paint;
      paint = () => {
        p0();
        crack(x, y, leg ? -0.05 : -0.27);
      };
    }
  } else {
    // A tummy: spine, ribs and hips
    const body = () => {
      g.strokeStyle = 'rgba(230,240,255,0.25)';
      g.lineWidth = 6;
      g.beginPath();
      g.ellipse(W / 2, H / 2, W * 0.34, H * 0.44, 0, 0, Math.PI * 2);
      g.stroke();
      for (let i = 0; i < 9; i++) {
        g.fillStyle = 'rgba(235,245,255,0.85)';
        roundRect(g, W * 0.47, H * (0.08 + i * 0.09), W * 0.06, H * 0.06, 8);
        g.fill();
      }
      for (let i = 0; i < 4; i++)
        for (const s of [-1, 1]) {
          g.strokeStyle = 'rgba(235,245,255,0.8)';
          g.lineWidth = 9;
          g.beginPath();
          g.moveTo(W * (0.5 + s * 0.04), H * (0.1 + i * 0.07));
          g.quadraticCurveTo(W * (0.5 + s * 0.3), H * (0.08 + i * 0.07), W * (0.5 + s * 0.3), H * (0.22 + i * 0.07));
          g.stroke();
        }
      for (const s of [-1, 1]) {
        g.fillStyle = 'rgba(235,245,255,0.8)';
        g.beginPath();
        g.ellipse(W * (0.5 + s * 0.17), H * 0.85, W * 0.13, H * 0.08, s * 0.4, 0, Math.PI * 2);
        g.fill();
      }
    };
    if (view === 'toy') {
      const x = W * (0.34 + r() * 0.32);
      const y = H * (0.5 + r() * 0.15);
      targets.push({ u: x / W, v: y / H, r: 0.08, label: 'the toy' });
      paint = () => {
        body();
        g.fillStyle = 'rgba(255,255,255,0.95)';
        g.beginPath();
        g.ellipse(x, y, 34, 24, 0, 0, Math.PI * 2);
        g.fill();
        circle(g, x + 26, y - 22, 16);
        g.fill();
        g.beginPath();
        g.ellipse(x + 44, y - 20, 12, 6, 0, 0, Math.PI * 2);
        g.fill();
      };
    } else {
      for (let i = 0; i < 3; i++) targets.push({ u: 0.36 + i * 0.13 + (r() - 0.5) * 0.05, v: 0.52 + (r() - 0.5) * 0.2, r: 0.06, label: 'a stone' });
      paint = () => {
        body();
        for (const t of targets) {
          g.fillStyle = 'rgba(255,255,255,0.95)';
          g.beginPath();
          g.ellipse(t.u * W, t.v * H, 15, 12, 0.4, 0, Math.PI * 2);
          g.fill();
        }
      };
    }
  }
  const draw = (found = [], misses = []) => {
    const gr = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.7);
    gr.addColorStop(0, '#2c4778');
    gr.addColorStop(1, '#101c38');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    paint();
    for (const m of misses) {
      g.strokeStyle = 'rgba(255,140,160,0.8)';
      g.lineWidth = 6;
      circle(g, m.u * W, m.v * H, 18);
      g.stroke();
    }
    targets.forEach((t, i) => found[i] && ring(g, t.u * W, t.v * H, t.r * W * 0.9));
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.font = `600 22px ${FONT}`;
    g.textAlign = 'left';
    g.fillText('Sunny Hill X-ray', 18, H - 18);
  };
  draw();
  return { targets, draw };
}

// ------------------------------------------------------------------ skin with a cut (seen in the magnifier)
// Returns { path: [{u, v}] (the cut), stitch: [{u, v}] (zigzag), dirt: [{u, v, r}], draw({ cut, stitched, dirt, cleaned, done }) }
export function skinPic(b, r, skin) {
  const { g, W, H } = b;
  const ang = (r() - 0.5) * 0.6;
  const cx = 0.5;
  const cy = 0.5;
  const L = 0.5;
  const path = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10 - 0.5;
    path.push({ u: cx + Math.cos(ang) * t * L, v: cy + Math.sin(ang) * t * L + Math.sin(t * 5) * 0.02 });
  }
  const stitch = [];
  const n = 5;
  for (let i = 0; i <= n * 2; i++) {
    const t = i / (n * 2) - 0.5;
    const side = i % 2 ? 1 : -1;
    stitch.push({ u: cx + Math.cos(ang) * t * L * 0.9 - Math.sin(ang) * side * 0.07, v: cy + Math.sin(ang) * t * L * 0.9 + Math.cos(ang) * side * 0.07 + Math.sin(t * 5) * 0.02 });
  }
  const dirt = [];
  for (let i = 0; i < 7; i++) dirt.push({ u: 0.25 + r() * 0.5, v: 0.3 + r() * 0.4, r: 0.025 + r() * 0.02 });
  const base = new THREE.Color(skin);
  const dark = '#' + base.clone().multiplyScalar(0.88).getHexString();
  const draw = ({ cut = true, stitched = 0, dirtOn = [], dots = false, closed = 0 } = {}) => {
    g.clearRect(0, 0, W, H);
    const gr = g.createRadialGradient(W * 0.45, H * 0.4, 20, W / 2, H / 2, W * 0.6);
    gr.addColorStop(0, '#' + base.clone().lerp(new THREE.Color('#ffffff'), 0.15).getHexString());
    gr.addColorStop(1, dark);
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,0.035)';
    for (let i = 0; i < 70; i++) {
      circle(g, ((i * 97) % 100) * W * 0.01, ((i * 61) % 100) * H * 0.01, 3);
      g.fill();
    }
    if (cut) {
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.strokeStyle = `rgba(232,110,130,${1 - closed * 0.7})`;
      g.lineWidth = W * 0.028 * (1 - closed * 0.6);
      g.beginPath();
      path.forEach((p, i) => (i ? g.lineTo(p.u * W, p.v * H) : g.moveTo(p.u * W, p.v * H)));
      g.stroke();
      g.strokeStyle = `rgba(255,200,205,${0.8 - closed * 0.6})`;
      g.lineWidth = W * 0.008;
      g.stroke();
    }
    if (dots) {
      g.fillStyle = 'rgba(63,123,240,0.55)';
      stitch.forEach((p, i) => {
        if (i < stitched) return;
        circle(g, p.u * W, p.v * H, W * (i === stitched ? 0.022 : 0.013));
        g.fill();
      });
      g.setLineDash([10, 12]);
      g.strokeStyle = 'rgba(63,123,240,0.45)';
      g.lineWidth = 4;
      g.beginPath();
      stitch.forEach((p, i) => (i ? g.lineTo(p.u * W, p.v * H) : g.moveTo(p.u * W, p.v * H)));
      g.stroke();
      g.setLineDash([]);
    }
    if (stitched > 0) {
      g.strokeStyle = '#3f7bf0';
      g.lineWidth = W * 0.014;
      g.lineCap = 'round';
      g.beginPath();
      const last = Math.min(stitched, stitch.length - 1);
      for (let i = 0; i <= last; i++) (i ? g.lineTo(stitch[i].u * W, stitch[i].v * H) : g.moveTo(stitch[i].u * W, stitch[i].v * H));
      g.stroke();
      g.fillStyle = '#2a5bd0';
      for (let i = 0; i <= last; i++) {
        circle(g, stitch[i].u * W, stitch[i].v * H, W * 0.01);
        g.fill();
      }
    }
    dirt.forEach((d, i) => {
      const a = dirtOn[i] ?? 0;
      if (a <= 0.02) return;
      g.fillStyle = `rgba(130,95,70,${0.75 * a})`;
      circle(g, d.u * W, d.v * H, d.r * W);
      g.fill();
      g.fillStyle = `rgba(100,80,70,${0.5 * a})`;
      circle(g, d.u * W + d.r * W * 0.4, d.v * H - d.r * W * 0.2, d.r * W * 0.45);
      g.fill();
    });
  };
  draw();
  return { path, stitch, dirt, draw };
}

// ------------------------------------------------------------------ the surgery window over the tummy
// item: 'appendix' | 'duck' | 'splinter' | 'stones' | 'whistle'.
// Returns { line: [{u, v}] (the incision), items: [{u, v}] (where things sit), lift: {u, v, r}, safe(u, v, rad) -> bool,
//   draw({ cut: 0..1 (how much of the line is cut), open: 0..1, stitched, dots, touched, removed: [] }) }
export function surgeryPic(b, r, item, skin) {
  const { g, W, H } = b;
  const asp = W / H;
  const line = [];
  const tilt = (r() - 0.5) * 0.06;
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    line.push({ u: 0.32 + t * 0.36, v: 0.4 + tilt * (t - 0.5) - Math.sin(t * Math.PI) * 0.03 });
  }
  // The opening (an ellipse round the cut) and a winding channel from it to each thing to take out
  const O = { u: 0.5, v: 0.4, au: 0.2, av: 0.14 };
  const lift = { u: 0.5, v: 0.38, r: 0.065 };
  const n = item === 'stones' ? 3 : 1;
  const side = r() < 0.5 ? -1 : 1;
  const items = [];
  const channels = [];
  const chW = 0.085;
  for (let i = 0; i < n; i++) {
    const end = n === 1 ? { u: 0.5 + side * 0.2, v: 0.74 } : { u: 0.3 + i * 0.2, v: i === 1 ? 0.78 : 0.7 };
    const start = { u: n === 1 ? 0.5 - side * 0.04 : 0.42 + i * 0.08, v: O.v + O.av * 0.6 };
    const mid = n === 1 ? { u: 0.5 - side * 0.2, v: 0.66 } : { u: end.u + (i - 1) * -0.1 + (i === 1 ? 0.12 : 0), v: 0.62 };
    items.push(end);
    channels.push([start, mid, end]);
  }
  const shape = (G, w, h, grow = 0) => {
    G.beginPath();
    G.ellipse(O.u * w, O.v * h, O.au * w + grow * w, O.av * h + grow * w, 0, 0, Math.PI * 2);
    G.fill();
    G.lineCap = 'round';
    G.lineJoin = 'round';
    G.lineWidth = (chW + grow * 2) * w;
    for (const ch of channels) {
      G.beginPath();
      G.moveTo(ch[0].u * w, ch[0].v * h);
      G.quadraticCurveTo(ch[1].u * w, ch[1].v * h, ch[2].u * w, ch[2].v * h);
      G.stroke();
      G.beginPath();
      G.arc(ch[2].u * w, ch[2].v * h, (chW * 0.8 + grow) * w, 0, Math.PI * 2);
      G.fill();
    }
  };
  // Safe mask: a small offscreen picture of where the tweezers may go
  const MW = 220;
  const MH = Math.round(MW / asp);
  const mc = document.createElement('canvas');
  mc.width = MW;
  mc.height = MH;
  const mg = mc.getContext('2d');
  mg.fillStyle = mg.strokeStyle = '#fff';
  shape(mg, MW, MH);
  const mask = mg.getImageData(0, 0, MW, MH).data;
  mc.width = mc.height = 1;
  const safeAt = (u, v) => {
    const x = Math.round(u * MW);
    const y = Math.round(v * MH);
    if (x < 0 || y < 0 || x >= MW || y >= MH) return false;
    return mask[(y * MW + x) * 4 + 3] > 128;
  };
  // A point is safe when a small circle round it (rad in u units) is inside the opening
  const safe = (u, v, rad = 0) => {
    if (!safeAt(u, v)) return false;
    if (rad <= 0) return true;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      if (!safeAt(u + Math.cos(a) * rad, v + Math.sin(a) * rad * asp)) return false;
    }
    return true;
  };
  // Zigzag stitches along the incision, for closing up
  const stitch = [];
  for (let i = 0; i <= 10; i++) {
    const p = line[Math.round((i / 10) * (line.length - 1))];
    stitch.push({ u: p.u, v: p.v + (i % 2 ? 0.05 : -0.05) });
  }
  const skinC = new THREE.Color(skin);
  const skinHi = '#' + skinC.clone().lerp(new THREE.Color('#ffffff'), 0.18).getHexString();
  const skinLo = '#' + skinC.clone().multiplyScalar(0.9).getHexString();
  const draw = ({ cut = 0, open = 0, stitched = 0, dots = false, flash = 0, closed = 0, showStitch = false } = {}) => {
    // Drape cloth round the window
    g.fillStyle = '#7fd3c0';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.lineWidth = 3;
    for (let i = 0; i < 24; i++) {
      g.beginPath();
      g.moveTo(0, i * (H / 24));
      g.lineTo(W, i * (H / 24));
      g.stroke();
    }
    // Skin window
    const gr = g.createRadialGradient(W * 0.46, H * 0.42, 10, W / 2, H / 2, W * 0.45);
    gr.addColorStop(0, skinHi);
    gr.addColorStop(1, skinLo);
    g.fillStyle = gr;
    roundRect(g, W * 0.1, H * 0.08, W * 0.8, H * 0.86, H * 0.16);
    g.fill();
    g.strokeStyle = '#5fbfab';
    g.lineWidth = 8;
    g.stroke();
    if (open < 1) {
      g.fillStyle = 'rgba(160,90,80,0.3)';
      g.beginPath();
      g.ellipse(W * 0.5, H * 0.86, 9, 6, 0, 0, Math.PI * 2);
      g.fill();
    }
    if (open > 0) {
      g.save();
      g.globalAlpha = Math.min(1, open * 1.3);
      // The edge (the buzzing rim), then the soft pink insides
      g.fillStyle = g.strokeStyle = flash > 0 ? '#ff3b55' : '#c9566c';
      shape(g, W, H, 0.012);
      g.fillStyle = g.strokeStyle = '#f7b4c1';
      shape(g, W, H, 0);
      g.save();
      g.beginPath();
      g.ellipse(O.u * W, O.v * H, O.au * W, O.av * H, 0, 0, Math.PI * 2);
      g.clip();
      for (let i = 0; i < 8; i++) {
        const x = W * (0.33 + (i % 4) * 0.11);
        const y = H * (0.33 + Math.floor(i / 4) * 0.15);
        g.fillStyle = '#ffd6cc';
        circle(g, x, y, H * 0.052);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.55)';
        circle(g, x - H * 0.015, y - H * 0.018, H * 0.014);
        g.fill();
      }
      g.restore();
      g.strokeStyle = '#ee98a9';
      g.lineWidth = chW * 0.35 * W;
      g.lineCap = 'round';
      for (const ch of channels) {
        g.beginPath();
        g.moveTo(ch[0].u * W, ch[0].v * H);
        g.quadraticCurveTo(ch[1].u * W, ch[1].v * H, ch[2].u * W, ch[2].v * H);
        g.stroke();
      }
      // Where to lift things out
      g.strokeStyle = 'rgba(255,255,255,0.95)';
      g.setLineDash([12, 10]);
      g.lineWidth = 5;
      circle(g, lift.u * W, lift.v * H, lift.r * W);
      g.stroke();
      g.setLineDash([]);
      g.restore();
    }
    if (open <= 0) {
      // The dotted line, and the neat cut drawn so far
      const k = Math.round(cut * (line.length - 1));
      if (dots) {
        g.setLineDash([14, 14]);
        g.strokeStyle = 'rgba(63,123,240,0.8)';
        g.lineWidth = 6;
        g.beginPath();
        line.forEach((p, i) => (i ? g.lineTo(p.u * W, p.v * H) : g.moveTo(p.u * W, p.v * H)));
        g.stroke();
        g.setLineDash([]);
        g.fillStyle = '#3f7bf0';
        circle(g, line[0].u * W, line[0].v * H, 13);
        g.fill();
        g.fillStyle = '#ffffff';
        circle(g, line[0].u * W, line[0].v * H, 6);
        g.fill();
        g.fillStyle = C.rose;
        circle(g, line[line.length - 1].u * W, line[line.length - 1].v * H, 11);
        g.fill();
      }
      if (k > 0) {
        g.strokeStyle = `rgba(226,104,124,${1 - closed * 0.7})`;
        g.lineWidth = 10 * (1 - closed * 0.5);
        g.lineCap = 'round';
        g.beginPath();
        for (let i = 0; i <= k; i++) (i ? g.lineTo(line[i].u * W, line[i].v * H) : g.moveTo(line[i].u * W, line[i].v * H));
        g.stroke();
      }
    }
    if (showStitch) {
      if (stitched > 0) {
        g.strokeStyle = '#3f7bf0';
        g.lineWidth = 7;
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.beginPath();
        const last = Math.min(stitched, stitch.length - 1);
        for (let i = 0; i <= last; i++) (i ? g.lineTo(stitch[i].u * W, stitch[i].v * H) : g.moveTo(stitch[i].u * W, stitch[i].v * H));
        g.stroke();
      }
      if (dots) {
        g.fillStyle = 'rgba(63,123,240,0.65)';
        stitch.forEach((p, i) => {
          if (i < stitched) return;
          circle(g, p.u * W, p.v * H, i === stitched ? 13 : 7);
          g.fill();
        });
      }
    }
  };
  draw({ dots: true });
  return { line, items, lift, safe, draw, stitch, channels, opening: O };
}

// ------------------------------------------------------------------ heart monitor
export class Monitor {
  constructor(screen) {
    this.s = screen;
    this.buf = new Float32Array(160);
    this.head = 0;
    this.phase = 0;
    this.hr = 92;
    this.lo = 70;
    this.hi = 120;
    this.acc = 0;
    this.on = true;
    this.beat = null; // callback each heartbeat
    this.asleep = false;
  }
  update(dt) {
    if (!this.on) return;
    this.phase += (dt * this.hr) / 60;
    if (this.phase >= 1) {
      this.phase -= 1;
      this.beat?.();
    }
    this.acc += dt;
    const step = 1 / 40;
    while (this.acc >= step) {
      this.acc -= step;
      const p = this.phase;
      const y = p < 0.06 ? Math.sin((p / 0.06) * Math.PI) * 1 : p < 0.12 ? -Math.sin(((p - 0.06) / 0.06) * Math.PI) * 0.35 : p > 0.3 && p < 0.42 ? Math.sin(((p - 0.3) / 0.12) * Math.PI) * 0.22 : 0;
      this.buf[this.head] = y;
      this.head = (this.head + 1) % this.buf.length;
    }
    this.drawT = (this.drawT || 0) + dt;
    if (this.drawT > 1 / 15) {
      this.drawT = 0;
      this.draw();
    }
  }
  draw() {
    const { canvas, tex } = this.s;
    const g = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    g.fillStyle = '#12302b';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(127,216,191,0.12)';
    g.lineWidth = 2;
    for (let i = 1; i < 8; i++) {
      g.beginPath();
      g.moveTo((i * W) / 8, 0);
      g.lineTo((i * W) / 8, H);
      g.stroke();
    }
    const ok = this.hr >= this.lo && this.hr <= this.hi;
    const col = ok ? '#7dffb8' : this.hr > this.hi ? '#ff7a8a' : '#ffd166';
    g.strokeStyle = col;
    g.lineWidth = 6;
    g.lineJoin = 'round';
    g.beginPath();
    const n = this.buf.length;
    for (let i = 0; i < n; i++) {
      const y = this.buf[(this.head + i) % n];
      const x = (i / (n - 1)) * W * 0.66;
      const py = H * 0.55 - y * H * 0.3;
      if (i) g.lineTo(x, py);
      else g.moveTo(x, py);
    }
    g.stroke();
    g.fillStyle = col;
    g.textAlign = 'center';
    g.font = `700 ${Math.round(H * 0.3)}px ${FONT}`;
    g.fillText(String(Math.round(this.hr)), W * 0.84, H * 0.55);
    g.font = `600 ${Math.round(H * 0.1)}px ${FONT}`;
    g.fillText('heart', W * 0.84, H * 0.7);
    // A little heart that beats
    const s = 1 + Math.max(0, 1 - this.phase * 5) * 0.35;
    g.save();
    g.translate(W * 0.84, H * 0.2);
    g.scale(s * 0.4, s * 0.4);
    g.beginPath();
    g.moveTo(0, 30);
    g.bezierCurveTo(-60, -10, -30, -60, 0, -28);
    g.bezierCurveTo(30, -60, 60, -10, 0, 30);
    g.fillStyle = '#ff7a8a';
    g.fill();
    g.restore();
    if (this.asleep) {
      g.fillStyle = 'rgba(200,220,255,0.8)';
      g.font = `600 ${Math.round(H * 0.1)}px ${FONT}`;
      g.fillText('sleeping', W * 0.33, H * 0.9);
    }
    tex.needsUpdate = true;
  }
}
