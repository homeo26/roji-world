import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CELL, TOP } from './data.js';
import { Build, G, VC, VC_SHINY, partBuild, stackGeo } from './models.js';
import { draw as drawIcon } from './art.js';
import { PAL, drawFrame, drawLogo, artReady } from '../../interiors/yumyum/theme.js';

// The kitchens you see: counters, crates, boards, hobs, the spit, sink, rack and pass for every tile,
// themed walls and floors, the backdrops (a beach road for the trucks, a sunset rooftop) and small
// secrets for those who look. Static parts are merged per section so trucks and tiles move as one.

const FONT = "'Fredoka', ui-rounded, system-ui, sans-serif";
const H0 = TOP - 0.08;

export const THEMES = {
  yumyum: { bg: '#f1d3cb', ground: '#e9c7bd', floor: ['#fcf1e6', '#f5dcd4'], tile: 'star', top: '#fcf3e4', body: '#d9607c', trim: '#d9a441', wall: '#fcf7e3', band: '#e0ada9', accent: '#cf4569' },
  mint: { bg: '#d7ebe0', ground: '#c7ddd0', floor: ['#eef6ea', '#d8ead6'], tile: 'check', top: '#fbf6ea', body: '#7f9a62', trim: '#d9a441', wall: '#eef5e6', band: '#b9d4b0', accent: '#5b6447' },
  bakery: { bg: '#f4e2c8', ground: '#e6cba6', floor: ['#e3b98a', '#d5a676'], tile: 'wood', top: '#fff4e0', body: '#c98a5a', trim: '#8f5a3f', wall: '#fbeccf', band: '#e9c48c', accent: '#b8743a' },
  trucks: { bg: '#a6dde2', ground: '#7b7f8a', floor: ['#e6e9ee', '#d7dce3'], tile: 'plate', top: '#fffaf0', body: '#f08aa0', body2: '#7fd3b8', trim: '#ffffff', wall: '#ffffff', band: '#ffd166', accent: '#cf4569', outdoor: true },
  tiles: { bg: '#d9e6f2', ground: '#c6d6e6', floor: ['#ffffff', '#dfeaf6'], tile: 'blue', top: '#fbfbf7', body: '#4f86b8', trim: '#d9a441', wall: '#f4f8fb', band: '#a9c6e2', accent: '#3a6a99' },
  freezer: { bg: '#dff3ff', ground: '#cfe9f7', floor: ['#e9f7ff', '#d3eefc'], tile: 'ice', top: '#ffffff', body: '#9fc9e6', trim: '#ff9eb5', wall: '#eef9ff', band: '#c4e3f6', accent: '#e0607e', ice: true },
  rooftop: { bg: '#f7b08a', ground: '#c98a6a', floor: ['#e8a27a', '#dd9268'], tile: 'terracotta', top: '#fff4e4', body: '#6f7b4d', trim: '#d9a441', wall: '#f3dcc2', band: '#e0ada9', accent: '#cf4569', outdoor: true, sunset: true },
  night: { bg: '#2a2546', ground: '#3d3456', floor: ['#5a4a6e', '#4c3f60'], tile: 'nightstar', top: '#f6ead8', body: '#8a3f5e', trim: '#d9a441', wall: '#4a3d63', band: '#6b5687', accent: '#ffd166', night: true },
};

// ---------------------------------------------------------------- painted textures
function canvas(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  fn(c.getContext('2d'), w, h);
  return c;
}
function tex(c, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function star8(c, x, y, r1, r2, fill) {
  c.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? r2 : r1;
    c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}
function heart(c, x, y, s, fill) {
  c.beginPath();
  c.moveTo(x, y + s * 0.35);
  c.bezierCurveTo(x - s * 0.6, y - s * 0.1, x - s * 0.3, y - s * 0.6, x, y - s * 0.25);
  c.bezierCurveTo(x + s * 0.3, y - s * 0.6, x + s * 0.6, y - s * 0.1, x, y + s * 0.35);
  c.fillStyle = fill;
  c.fill();
}
// Floor tiles: an atlas of three tiles side by side (two plain variants and a hidden heart one).
function floorTexture(T) {
  const S = 256;
  const c = canvas(S * 3, S, (g) => {
    for (let k = 0; k < 3; k++) {
      g.save();
      g.translate(k * S, 0);
      const base = T.floor[k === 1 ? 1 : 0];
      g.fillStyle = base;
      g.fillRect(0, 0, S, S);
      const t = T.tile;
      if (t === 'star' || t === 'nightstar') {
        const ink = t === 'star' ? (k === 1 ? '#e8b3ad' : '#efc3bd') : '#d9a441';
        star8(g, S / 2, S / 2, S * 0.36, S * 0.2, ink);
        for (const [x, y] of [[0, 0], [S, 0], [0, S], [S, S]]) star8(g, x, y, S * 0.14, S * 0.08, t === 'star' ? '#7a8a5a' : '#8a6ab0');
      } else if (t === 'check') {
        g.fillStyle = k === 1 ? '#c9e0c3' : '#e2efdc';
        g.fillRect(S * 0.08, S * 0.08, S * 0.84, S * 0.84);
        g.strokeStyle = '#a8c79e';
        g.lineWidth = 6;
        g.strokeRect(S * 0.2, S * 0.2, S * 0.6, S * 0.6);
      } else if (t === 'wood') {
        for (let i = 0; i < 4; i++) {
          g.fillStyle = i % 2 ? T.floor[1] : T.floor[0];
          g.fillRect(0, (i * S) / 4, S, S / 4);
          g.fillStyle = 'rgba(120,70,40,.25)';
          g.fillRect(0, (i * S) / 4, S, 3);
          g.fillRect(((i * 97 + k * 40) % S), (i * S) / 4, 3, S / 4);
        }
      } else if (t === 'plate') {
        g.fillStyle = k === 1 ? '#cdd3db' : '#d9dee5';
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          g.save();
          g.translate((x + 0.5) * (S / 8), (y + 0.5) * (S / 8));
          g.rotate((x + y) % 2 ? 0.7 : -0.7);
          g.beginPath();
          g.roundRect(-10, -3, 20, 6, 3);
          g.fill();
          g.restore();
        }
      } else if (t === 'blue') {
        g.fillStyle = k === 1 ? '#7fa9d6' : '#9cc0e4';
        star8(g, S / 2, S / 2, S * 0.3, S * 0.17, g.fillStyle);
        g.strokeStyle = '#4f86b8';
        g.lineWidth = 8;
        g.beginPath();
        g.arc(S / 2, S / 2, S * 0.42, 0, Math.PI * 2);
        g.stroke();
      } else if (t === 'ice') {
        g.strokeStyle = 'rgba(255,255,255,.95)';
        g.lineWidth = 4;
        for (let i = 0; i < 5; i++) {
          g.beginPath();
          g.moveTo(((i * 61 + k * 30) % S), 0);
          g.lineTo(((i * 61 + 70) % S), S * 0.6);
          g.lineTo(((i * 61 + 30) % S), S);
          g.stroke();
        }
        g.fillStyle = 'rgba(255,255,255,.9)';
        for (let i = 0; i < 6; i++) star8(g, (i * 83 + k * 50) % S, (i * 47) % S, 7, 3, '#ffffff');
      } else if (t === 'terracotta') {
        g.strokeStyle = 'rgba(120,60,40,.35)';
        g.lineWidth = 6;
        g.strokeRect(3, 3, S - 6, S - 6);
        g.beginPath();
        g.moveTo(S / 2, 0);
        g.lineTo(S / 2, S);
        g.stroke();
      }
      if (k === 2) heart(g, S * 0.5, S * 0.54, S * 0.26, t === 'nightstar' ? '#e8c070' : '#e58a98');
      g.strokeStyle = 'rgba(80,40,50,.13)';
      g.lineWidth = 5;
      g.strokeRect(0, 0, S, S);
      g.restore();
    }
  });
  return tex(c);
}
function wallTexture(T) {
  return tex(
    canvas(512, 256, (g, w, h) => {
      g.fillStyle = T.wall;
      g.fillRect(0, 0, w, h);
      g.fillStyle = T.band;
      g.fillRect(0, h * 0.62, w, h * 0.38);
      g.fillStyle = T.accent;
      g.fillRect(0, h * 0.6, w, h * 0.04);
      if (T.tile === 'star' || T.tile === 'nightstar') for (let x = 32; x < w; x += 64) star8(g, x, h * 0.81, 22, 12, T.tile === 'star' ? '#fcf7e3' : '#d9a441');
      else if (T.tile === 'blue') for (let x = 32; x < w; x += 64) star8(g, x, h * 0.81, 22, 12, '#ffffff');
      else if (T.tile === 'ice')
        for (let x = 20; x < w; x += 40) {
          g.fillStyle = '#ffffff';
          g.beginPath();
          g.moveTo(x - 12, h * 0.62);
          g.lineTo(x + 12, h * 0.62);
          g.lineTo(x, h * 0.62 + 26 + (x % 3) * 8);
          g.fill();
        }
      else
        for (let y = h * 0.66; y < h; y += 26) {
          g.fillStyle = 'rgba(255,255,255,.35)';
          g.fillRect(0, y, w, 3);
        }
    }),
    true,
  );
}
// Little pictures on one canvas for signs, plaques and secrets. add() returns a uv rect.
class Decals {
  constructor() {
    this.c = document.createElement('canvas');
    this.c.width = 2048;
    this.c.height = 1024;
    this.g = this.c.getContext('2d');
    this.x = 0;
    this.y = 0;
    this.row = 0;
    this.tex = tex(this.c);
    this.mat = new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.8, emissive: '#ffffff', emissiveMap: this.tex, emissiveIntensity: 0.12 });
    this.lists = new Map();
  }
  add(w, h, fn) {
    if (this.x + w > this.c.width) {
      this.x = 0;
      this.y += this.row + 4;
      this.row = 0;
    }
    const { x, y } = this;
    const g = this.g;
    g.save();
    g.translate(x, y);
    g.beginPath();
    g.rect(0, 0, w, h);
    g.clip();
    fn(g, w, h);
    g.restore();
    this.x += w + 4;
    this.row = Math.max(this.row, h);
    this.tex.needsUpdate = true;
    return { u0: x / this.c.width, u1: (x + w) / this.c.width, v0: 1 - (y + h) / this.c.height, v1: 1 - y / this.c.height, x, y, w, h, fn };
  }
  // A flat picture: w x h metres, at p, rotated ry about Y then rx about X (planes face +Z).
  plane(sec, rect, w, h, p, ry = 0, rx = 0) {
    const geo = new THREE.PlaneGeometry(w, h);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, rect.u0 + uv.getX(i) * (rect.u1 - rect.u0), rect.v0 + uv.getY(i) * (rect.v1 - rect.v0));
    geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, 0, 'YXZ')));
    geo.translate(p[0], p[1], p[2]);
    if (!this.lists.has(sec)) this.lists.set(sec, []);
    this.lists.get(sec).push(geo);
  }
  redraw(rect) {
    const g = this.g;
    g.save();
    g.translate(rect.x, rect.y);
    g.clearRect(0, 0, rect.w, rect.h);
    g.beginPath();
    g.rect(0, 0, rect.w, rect.h);
    g.clip();
    rect.fn(g, rect.w, rect.h);
    g.restore();
    this.tex.needsUpdate = true;
  }
}
function plaque(icon, bg = '#fffaf0', edge = PAL.ink) {
  return (g, w, h) => {
    g.fillStyle = bg;
    g.beginPath();
    g.roundRect(4, 4, w - 8, h - 8, 22);
    g.fill();
    g.lineWidth = 8;
    g.strokeStyle = edge;
    g.stroke();
    drawIcon(g, icon, w / 2, h / 2, Math.min(w, h) * 0.78);
  };
}
function textSign(lines, { bg = PAL.paper, ink = PAL.ink, edge = PAL.inkDeep, size = 0.5 } = {}) {
  return (g, w, h) => {
    g.fillStyle = bg;
    g.beginPath();
    g.roundRect(6, 6, w - 12, h - 12, Math.min(40, h / 3));
    g.fill();
    g.lineWidth = 10;
    g.strokeStyle = edge;
    g.stroke();
    g.fillStyle = ink;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const n = lines.length;
    lines.forEach((t, i) => {
      g.font = `700 ${Math.round(h * size * (n > 1 ? 0.62 : 1))}px ${FONT}`;
      g.fillText(t, w / 2, h / 2 + (i - (n - 1) / 2) * h * 0.34);
    });
  };
}
// A child's drawing of Roji and Homama holding hands under a heart: one of the kitchen's secrets.
function usDrawing(g, w, h) {
  g.fillStyle = '#fffdf6';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#d49091';
  g.lineWidth = 10;
  g.strokeRect(5, 5, w - 10, h - 10);
  const kid = (x, hair, top, girl) => {
    g.fillStyle = top;
    g.beginPath();
    if (girl) {
      g.moveTo(x - 34, h * 0.86);
      g.lineTo(x + 34, h * 0.86);
      g.lineTo(x + 14, h * 0.56);
      g.lineTo(x - 14, h * 0.56);
    } else g.roundRect(x - 22, h * 0.56, 44, h * 0.3, 10);
    g.fill();
    g.fillStyle = '#f2cdb4';
    g.beginPath();
    g.arc(x, h * 0.44, 30, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = hair;
    g.beginPath();
    g.arc(x, h * 0.41, 31, Math.PI, Math.PI * 2);
    g.fill();
    if (girl) {
      g.fillRect(x - 33, h * 0.4, 12, 46);
      g.fillRect(x + 21, h * 0.4, 12, 46);
    }
    g.fillStyle = '#3b2b3f';
    g.beginPath();
    g.arc(x - 10, h * 0.45, 3.5, 0, Math.PI * 2);
    g.arc(x + 10, h * 0.45, 3.5, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#b23a48';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(x, h * 0.48, 8, 0.2, Math.PI - 0.2);
    g.stroke();
  };
  kid(w * 0.34, '#4a2c1a', '#ff9eb5', true);
  kid(w * 0.66, '#141010', '#6fb8ff', false);
  g.strokeStyle = '#f2cdb4';
  g.lineWidth = 8;
  g.beginPath();
  g.moveTo(w * 0.34 + 16, h * 0.66);
  g.lineTo(w * 0.66 - 16, h * 0.66);
  g.stroke();
  heart(g, w / 2, h * 0.2, 60, '#e0607e');
}
function stickyNote(g, w, h) {
  g.fillStyle = '#ffe98a';
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(0,0,0,.06)';
  g.fillRect(0, 0, w, 14);
  heart(g, w * 0.5, h * 0.36, w * 0.42, '#e0607e');
  g.fillStyle = '#5a3242';
  g.font = `600 ${Math.round(h * 0.2)}px ${FONT}`;
  g.textAlign = 'center';
  g.fillText('R + H', w / 2, h * 0.82);
}

function serveMat(g, w, h) {
  g.fillStyle = '#fbe3a8';
  g.beginPath();
  g.roundRect(8, 8, w - 16, h - 16, 30);
  g.fill();
  g.strokeStyle = PAL.ink;
  g.lineWidth = 10;
  g.setLineDash([22, 14]);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = PAL.ink;
  g.beginPath();
  g.moveTo(w / 2, h * 0.16);
  g.lineTo(w * 0.78, h * 0.46);
  g.lineTo(w * 0.6, h * 0.46);
  g.lineTo(w * 0.6, h * 0.62);
  g.lineTo(w * 0.4, h * 0.62);
  g.lineTo(w * 0.4, h * 0.46);
  g.lineTo(w * 0.22, h * 0.46);
  g.closePath();
  g.fill();
  g.font = `700 ${Math.round(h * 0.15)}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('SERVE', w / 2, h * 0.78);
}
function passSign(g, w, h) {
  g.fillStyle = PAL.paper;
  g.beginPath();
  g.roundRect(6, 6, w - 12, h - 12, 26);
  g.fill();
  g.lineWidth = 12;
  g.strokeStyle = PAL.band;
  g.stroke();
  // Roji's pointed arch around the words
  g.strokeStyle = PAL.ink;
  g.lineWidth = 8;
  g.beginPath();
  g.moveTo(w * 0.12, h * 0.9);
  g.lineTo(w * 0.12, h * 0.45);
  g.quadraticCurveTo(w * 0.14, h * 0.2, w * 0.5, h * 0.1);
  g.quadraticCurveTo(w * 0.86, h * 0.2, w * 0.88, h * 0.45);
  g.lineTo(w * 0.88, h * 0.9);
  g.stroke();
  g.fillStyle = PAL.ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 ${Math.round(h * 0.24)}px ${FONT}`;
  g.fillText('Order up!', w / 2, h * 0.56);
  heart(g, w / 2, h * 0.27, 34, '#e0607e');
}

// ---------------------------------------------------------------- the build
export function buildKitchen(world, themeId, { scene }) {
  const T = THEMES[themeId] || THEMES.yumyum;
  const root = new THREE.Group();
  scene.add(root);
  const secs = world.sections.map(() => {
    const g = new THREE.Group();
    root.add(g);
    return g;
  });
  const B = world.sections.map(() => ({ vc: new Build(), shiny: new Build(), floor: [] }));
  const decals = new Decals();
  const floorTex = floorTexture(T);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: T.ice ? 0.25 : 0.85, metalness: T.ice ? 0.1 : 0 });
  const dyn = { knives: [], burners: [], spits: [], racks: [], sinks: [], bells: [], hatches: [], lamps: [], belts: [], blenders: [], alarm: null, steam: [] };
  const anchors = new Map();
  const lx = (q) => world.baseX(q.c);
  const lz = (q) => world.baseZ(q.r);
  const crateRects = new Map();
  const passRects = {};
  const bodyCol = (q) => (themeId === 'trucks' && q.sec === 2 ? T.body2 : T.body);
  const dark = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();

  function counter(b, x, z, q, { top = T.top, body = bodyCol(q), h = TOP } = {}) {
    b.vc.add(G.rbox(CELL - 0.04, h - 0.08, CELL - 0.04, 0.04, 1), body, [x, (h - 0.08) / 2, z]);
    b.vc.add(G.rbox(CELL, 0.09, CELL, 0.03, 1), top, [x, h - 0.045, z]);
    b.vc.add(G.box(CELL + 0.01, 0.035, CELL + 0.01), T.trim, [x, h - 0.11, z]);
    b.vc.add(G.box(CELL - 0.02, 0.06, CELL - 0.02), dark(body, 0.7), [x, 0.03, z]);
  }

  if (world.level.slider) {
    const S = world.level.slider;
    const n = S.cells.length;
    for (let k = 0; k < n; k++) {
      const x = world.baseX(S.at[0] + k);
      const z = world.baseZ(S.row);
      B[1].vc.add(G.rbox(CELL * 0.98, 0.05, CELL * 0.98, 0.02, 1), T.band, [x, 0.02, z]);
      for (const s of [-1, 1]) B[1].vc.add(G.box(CELL * 0.9, 0.012, 0.05), T.accent, [x, 0.05, z + s * CELL * 0.44]);
    }
    for (let c = Math.min(...S.at); c <= Math.max(...S.at) + n - 1; c++) for (const s of [-1, 1]) B[0].shiny.add(G.box(CELL, 0.012, 0.06), '#9aa3ad', [world.baseX(c), 0.008, world.baseZ(S.row) + s * CELL * 0.47]);
  }
  for (const q of world.cells) {
    const b = B[q.sec];
    const x = lx(q);
    const z = lz(q);
    const [fx, fz] = world.facing(q);
    const face = Math.atan2(fx, fz);
    if (q.type === 'floor') {
      if (!q.hatch) {
        const v = q.c === 2 && q.r === world.H - 2 && (themeId === 'yumyum' || themeId === 'night') ? 2 : (q.c + q.r) % 2;
        const geo = new THREE.PlaneGeometry(CELL, CELL);
        const uv = geo.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setX(i, (v + uv.getX(i)) / 3);
        geo.rotateX(-Math.PI / 2);
        geo.translate(x, 0.005, z);
        b.floor.push(geo);
      } else {
        // the stair hatch: a dark stairwell under two wooden doors
        b.vc.add(G.box(CELL, 0.02, CELL), '#2b1d1a', [x, -0.3, z]);
        for (let s = 0; s < 4; s++) b.vc.add(G.box(CELL * 0.8, 0.06, 0.22), '#6a4a3a', [x, -0.25 + s * 0.06, z - 0.4 + s * 0.24]);
        const doors = [];
        for (const sgn of [-1, 1]) {
          const hinge = new THREE.Group();
          hinge.position.set(x + sgn * CELL * 0.5, 0.02, z);
          const leaf = new THREE.Mesh(G.rbox(CELL / 2 - 0.02, 0.06, CELL - 0.04, 0.015, 1), new THREE.MeshStandardMaterial({ color: '#b0784a', roughness: 0.8 }));
          leaf.position.set(-sgn * (CELL / 4), 0, 0);
          leaf.castShadow = true;
          leaf.receiveShadow = true;
          hinge.add(leaf);
          const ring = new THREE.Mesh(G.tor(0.06, 0.012, 12), new THREE.MeshStandardMaterial({ color: PAL.gold, metalness: 0.5, roughness: 0.4 }));
          ring.rotation.x = Math.PI / 2;
          ring.position.set(-sgn * 0.12, 0.04, 0);
          hinge.add(ring);
          secs[q.sec].add(hinge);
          doors.push({ hinge, sgn });
        }
        dyn.hatches.push(doors);
      }
      continue;
    }
    if (q.type === 'wall') {
      // a low painted wall with a plant pot on every other tile: nothing can be put on it
      b.vc.add(G.rbox(CELL * 0.7, 1.05, CELL, 0.05, 1), T.wall, [x, 0.525, z]);
      b.vc.add(G.rbox(CELL * 0.78, 0.08, CELL + 0.02, 0.03, 1), T.top, [x, 1.07, z]);
      b.vc.add(G.box(CELL * 0.74, 0.04, CELL + 0.01), T.trim, [x, 0.99, z]);
      b.vc.add(G.box(CELL * 0.72, 0.3, CELL + 0.005), T.band, [x, 0.15, z]);
      if (q.r % 2) {
        b.vc.add(G.cyl(0.14, 0.11, 0.2, 12), T.accent, [x, 1.21, z]);
        for (const [dx, dz, r] of [[0, 0, 0.15], [0.08, 0.06, 0.1], [-0.07, -0.05, 0.11]]) b.vc.add(G.sph(r, 10, 7), '#6f9a4c', [x + dx, 1.36 + r * 0.4, z + dz]);
      }
      continue;
    }
    const anchor = new THREE.Object3D();
    anchor.position.set(x, TOP, z);
    secs[q.sec].add(anchor);
    anchors.set(q, anchor);
    if (q.type === 'bin') {
      b.vc.add(G.cyl(0.36, 0.32, TOP - 0.05, 18), T.accent, [x, (TOP - 0.05) / 2, z]);
      b.vc.add(G.cyl(0.39, 0.39, 0.06, 18), dark(T.accent, 0.75), [x, TOP - 0.04, z]);
      b.vc.add(G.cyl(0.3, 0.3, 0.02, 18), '#3b2b3f', [x, TOP - 0.005, z]);
      b.vc.add(G.rbox(0.18, 0.04, 0.05, 0.015, 1), '#fffaf0', [x, TOP + 0.02, z - 0.2]);
      continue;
    }
    if (q.type === 'belt') {
      counter(b, x, z, q, { top: '#5a5560', body: '#8a8590' });
      for (const s of [-1, 1]) b.shiny.add(G.box(CELL, 0.06, 0.08), '#c8ccd2', [x, TOP + 0.02, z + s * 0.44]);
      dyn.belts.push(q);
      continue;
    }
    if (q.type === 'pass') {
      counter(b, x, z, q, { top: '#fff4d6', body: T.accent });
      // a "serve here" mat on the counter, pointing out of the kitchen
      if (!passRects.mat) passRects.mat = decals.add(256, 256, serveMat);
      decals.plane(q.sec, passRects.mat, 0.9, 0.9, [x, TOP + 0.006, z], Math.atan2(fx, fz), -Math.PI / 2);
      // a sign on a brass pole behind the hatch, always turned to the camera
      const ox = x - fx * 0.5;
      const oz = z - fz * 0.5;
      b.shiny.add(G.cyl(0.035, 0.035, 1.45, 8), PAL.gold, [ox, TOP + 0.72, oz]);
      if (!passRects.sign) passRects.sign = decals.add(400, 260, passSign);
      b.vc.add(G.rbox(1.0, 0.66, 0.06, 0.03, 1), PAL.inkDeep, [ox, TOP + 1.42, oz - 0.04]);
      decals.plane(q.sec, passRects.sign, 0.94, 0.6, [ox, TOP + 1.42, oz]);
      const bell = new THREE.Group();
      bell.add(new THREE.Mesh(G.half(0.09, 14), new THREE.MeshStandardMaterial({ color: PAL.gold, metalness: 0.6, roughness: 0.3 })));
      const knob = new THREE.Mesh(G.sph(0.025, 8, 6), bell.children[0].material);
      knob.position.y = 0.1;
      bell.add(knob);
      bell.add(new THREE.Mesh(G.cyl(0.12, 0.12, 0.02, 14), new THREE.MeshStandardMaterial({ color: '#3b2b3f' })));
      bell.position.set(x - fz * 0.4 + fx * 0.3, TOP + 0.01, z + fx * 0.4 + fz * 0.3);
      bell.children.forEach((m) => (m.castShadow = true));
      secs[q.sec].add(bell);
      dyn.bells.push({ q, bell, t: 9 });
      continue;
    }
    counter(b, x, z, q, q.type === 'hob' || q.type === 'sink' ? { body: q.type === 'hob' ? '#9aa3ad' : bodyCol(q) } : {});
    if (q.type === 'crate') {
      // an open wooden crate full of the ingredient, with a picture plaque on the front
      b.vc.add(G.box(CELL * 0.82, 0.12, CELL * 0.82), '#8f5a3f', [x, TOP + 0.02, z]);
      for (const [dx, dz, w, d] of [[0, 0.41, 0.84, 0.06], [0, -0.41, 0.84, 0.06], [0.41, 0, 0.06, 0.84], [-0.41, 0, 0.06, 0.84]]) b.vc.add(G.box(w * CELL * 1.18, 0.2, d * CELL * 1.18), '#c98a5a', [x + dx * CELL * 0.98, TOP + 0.08, z + dz * CELL * 0.98]);
      const pb = partBuild(q.ing);
      for (const [dx, dz, ry] of [[-0.18, -0.14, 0.4], [0.17, 0.12, 1.9], [0.15, -0.17, 3], [-0.16, 0.16, 5]]) b.vc.sub(pb, [x + dx, TOP + 0.08, z + dz], 0.95, ry);
      if (!crateRects.has(q.ing)) crateRects.set(q.ing, decals.add(200, 200, plaque(q.ing)));
      decals.plane(q.sec, crateRects.get(q.ing), 0.42, 0.42, [x + fx * 0.615, TOP - 0.25, z + fz * 0.615], face);
      continue;
    }
    if (q.type === 'board') {
      b.vc.add(G.rbox(0.8, 0.05, 0.6, 0.02, 1), '#e0b27c', [x, TOP + 0.025, z], [0, face, 0]);
      b.vc.add(G.rbox(0.72, 0.012, 0.52, 0.01, 1), '#ecc796', [x, TOP + 0.052, z], [0, face, 0]);
      const knife = new THREE.Group();
      const blade = new THREE.Mesh(G.rbox(0.3, 0.012, 0.09, 0.004, 1), new THREE.MeshStandardMaterial({ color: '#e8edf2', metalness: 0.5, roughness: 0.3 }));
      blade.position.x = 0.15;
      const handle = new THREE.Mesh(G.rbox(0.14, 0.03, 0.04, 0.012, 1), new THREE.MeshStandardMaterial({ color: '#b8743a', roughness: 0.6 }));
      handle.position.x = -0.06;
      knife.add(blade, handle);
      const sx = Math.cos(face);
      const sz = -Math.sin(face);
      knife.position.set(x + sx * 0.25 - fx * 0.12, TOP + 0.07, z + sz * 0.25 - fz * 0.12);
      knife.rotation.y = face + Math.PI / 2;
      secs[q.sec].add(knife);
      dyn.knives.push({ q, knife, base: knife.position.clone(), ry: knife.rotation.y, t: 0 });
      continue;
    }
    if (q.type === 'hob') {
      b.vc.add(G.rbox(1.0, 0.03, 1.0, 0.01, 1), '#3b3438', [x, TOP + 0.005, z]);
      b.shiny.add(G.tor(0.2, 0.025, 20), '#5a5258', [x, TOP + 0.025, z], [Math.PI / 2, 0, 0]);
      for (const s of [-1, 1]) b.vc.add(G.cyl(0.04, 0.04, 0.05, 10), '#fffaf0', [x + fx * 0.6 + (fz ? s * 0.25 : 0), TOP - 0.18, z + fz * 0.6 + (fx ? s * 0.25 : 0)], [Math.PI / 2, 0, 0]);
      const glow = new THREE.Mesh(G.tor(0.2, 0.03, 20), new THREE.MeshStandardMaterial({ color: '#ff8a3d', emissive: '#ff6a1a', emissiveIntensity: 1.4 }));
      glow.rotation.x = Math.PI / 2;
      glow.position.set(x, TOP + 0.03, z);
      glow.visible = false;
      secs[q.sec].add(glow);
      dyn.burners.push({ q, glow });
      continue;
    }
    if (q.type === 'spit') {
      b.vc.add(G.cyl(0.26, 0.3, 0.06, 18), '#4b4248', [x, TOP + 0.03, z]);
      b.shiny.add(G.cyl(0.02, 0.02, 1.2, 8), '#c8ccd2', [x, TOP + 0.6, z]);
      b.shiny.add(G.cyl(0.08, 0.08, 0.04, 12), '#c8ccd2', [x, TOP + 1.18, z]);
      // the heater behind the meat
      const hx = x - fx * 0.42;
      const hz = z - fz * 0.42;
      b.vc.add(G.rbox(Math.abs(fx) ? 0.08 : 0.7, 1.0, Math.abs(fx) ? 0.7 : 0.08, 0.03, 1), '#4b4248', [hx, TOP + 0.5, hz]);
      const heat = new THREE.Mesh(G.box(Math.abs(fx) ? 0.02 : 0.5, 0.75, Math.abs(fx) ? 0.5 : 0.02), new THREE.MeshStandardMaterial({ color: '#ff9a5a', emissive: '#ff5a1a', emissiveIntensity: 0.9 }));
      heat.position.set(hx + fx * 0.05, TOP + 0.5, hz + fz * 0.05);
      secs[q.sec].add(heat);
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.13, 0.8, 14, 4), new THREE.MeshStandardMaterial({ color: '#f6c9a8', roughness: 0.7 }));
      cone.position.set(x, TOP + 0.56, z);
      cone.castShadow = true;
      secs[q.sec].add(cone);
      dyn.spits.push({ q, cone, heat });
      continue;
    }
    if (q.type === 'sink') {
      b.vc.add(G.rbox(0.82, 0.05, 0.72, 0.02, 1), '#7fa9c6', [x, TOP - 0.02, z]);
      b.vc.add(G.box(0.74, 0.02, 0.64), '#a9d2ec', [x, TOP + 0.005, z]);
      const tx = x - fx * 0.42;
      const tz = z - fz * 0.42;
      b.shiny.add(G.cyl(0.03, 0.03, 0.34, 8), PAL.gold, [tx, TOP + 0.17, tz]);
      b.shiny.add(G.cyl(0.025, 0.025, 0.22, 8), PAL.gold, [tx + fx * 0.1, TOP + 0.33, tz + fz * 0.1], [fz ? Math.PI / 2 : 0, 0, fx ? Math.PI / 2 : 0]);
      const stack = new THREE.Mesh(stackGeo(0, true), VC);
      stack.position.set(x, TOP - 0.02, z);
      stack.castShadow = false;
      secs[q.sec].add(stack);
      dyn.sinks.push({ q, stack, n: -1 });
      continue;
    }
    if (q.type === 'rack') {
      for (const s of [-1, 1]) b.shiny.add(G.rbox(0.05, 0.5, 0.6, 0.015, 1), '#c8ccd2', [x + s * 0.32, TOP + 0.25, z]);
      b.shiny.add(G.box(0.7, 0.03, 0.6), '#c8ccd2', [x, TOP + 0.015, z]);
      const stack = new THREE.Mesh(stackGeo(0, false), VC);
      stack.position.set(x, TOP + 0.03, z);
      stack.castShadow = true;
      secs[q.sec].add(stack);
      dyn.racks.push({ q, stack, n: -1 });
      continue;
    }
    if (q.type === 'blender') {
      b.vc.add(G.rbox(0.4, 0.12, 0.36, 0.04, 1), T.accent, [x, TOP + 0.06, z]);
      const lamp = new THREE.Mesh(G.sph(0.03, 8, 6), new THREE.MeshStandardMaterial({ color: '#9fe8c8', emissive: '#5fd89a', emissiveIntensity: 0.2 }));
      lamp.position.set(x + fx * 0.19, TOP + 0.07, z + fz * 0.19);
      secs[q.sec].add(lamp);
      dyn.blenders.push({ q, lamp });
      continue;
    }
  }
  // the moving belt: one shared striped material scrolling the way the food goes
  if (dyn.belts.length) {
    const bt = tex(
      canvas(128, 128, (g, w, h) => {
        g.fillStyle = '#4b4650';
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#ffd166';
        for (let k = 0; k < 2; k++) {
          g.beginPath();
          g.moveTo(k * 64 + 20, 30);
          g.lineTo(k * 64 + 48, 64);
          g.lineTo(k * 64 + 20, 98);
          g.lineTo(k * 64 + 32, 98);
          g.lineTo(k * 64 + 60, 64);
          g.lineTo(k * 64 + 32, 30);
          g.fill();
        }
      }),
      true,
    );
    dyn.beltTex = bt;
    const mat = new THREE.MeshStandardMaterial({ map: bt, roughness: 0.7 });
    const geos = dyn.belts.map((q) => {
      const g = new THREE.PlaneGeometry(CELL, CELL * 0.8);
      g.rotateX(-Math.PI / 2);
      const n = q.next || q;
      const p = q.prev || q;
      const dir = Math.atan2(n.c - p.c, n.r - p.r);
      g.rotateY(dir - Math.PI / 2);
      g.translate(lx(q), TOP + 0.012, lz(q));
      return g;
    });
    const m = new THREE.Mesh(mergeGeometries(geos), mat);
    m.receiveShadow = true;
    secs[0].add(m);
  }

  // ---------------------------------------------------------------- backdrop and theme decor
  const bd = world.bounds();
  const back = Math.min(...world.cells.map((q) => lz(q))) - CELL / 2;
  const left = bd.x0;
  const right = bd.x1;
  const front = bd.z1;
  const deco = B[0];
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTexture(T), roughness: 0.9 });
  if (!T.outdoor) {
    const ww = right - left + 2.4;
    const wallH = 3.0;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(ww, wallH, 0.2), wallMat);
    wall.material.map.repeat.set(ww / 4, 1);
    wall.position.set((left + right) / 2, wallH / 2, back - 0.3);
    wall.receiveShadow = true;
    root.add(wall);
    for (const sx of [left - 0.9, right + 0.9]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, front - back + 1.2), wallMat);
      side.position.set(sx, 0.5, (back + front) / 2 + 0.3);
      side.receiveShadow = true;
      root.add(side);
    }
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(ww + 0.4, front - back + 2.6), new THREE.MeshStandardMaterial({ color: T.ground, roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set((left + right) / 2, -0.002, (back + front) / 2 + 0.7);
    ground.receiveShadow = true;
    root.add(ground);
  }
  const wallZ = back - 0.19;
  const onWall = (rect, w, h, x, y) => decals.plane(0, rect, w, h, [x, y, wallZ + 0.03]);
  const cx = (left + right) / 2;
  // a poster of Roji's logo in the middle of the back wall
  if (!T.outdoor) {
    const pr = decals.add(420, 560, (g, w, h) => {
      drawFrame(g, w, h, { archRatio: 0.48 });
      drawLogo(g, w / 2, h * 0.62, w * 0.72);
    });
    artReady.then(() => decals.redraw(pr));
    onWall(pr, 0.95, 1.27, cx, 1.95);
    deco.vc.add(G.box(1.05, 1.37, 0.04), T.trim, [cx, 1.95, wallZ - 0.01]);
    // lanterns
    for (const sx of [-1, 1]) {
      const lxp = cx + sx * Math.min(4.2, (right - left) * 0.32);
      deco.shiny.add(G.cyl(0.006, 0.006, 0.6, 4), '#5a4a3a', [lxp, 2.7, wallZ + 0.4]);
      deco.shiny.add(G.cone(0.16, 0.14, 8), PAL.gold, [lxp, 2.37, wallZ + 0.4]);
      const glass = new THREE.Mesh(G.cyl(0.11, 0.13, 0.26, 8), new THREE.MeshStandardMaterial({ color: '#fff0d0', emissive: '#ffcf7a', emissiveIntensity: T.night ? 1.6 : 0.6 }));
      glass.position.set(lxp, 2.17, wallZ + 0.4);
      root.add(glass);
      dyn.lamps.push(glass);
      deco.shiny.add(G.cyl(0.14, 0.14, 0.05, 8), PAL.gold, [lxp, 2.02, wallZ + 0.4]);
    }
    // shelves with jars, plants and a window
    const sx0 = left + 1.6;
    deco.vc.add(G.rbox(2.0, 0.06, 0.3, 0.02, 1), '#b8743a', [sx0, 1.55, wallZ + 0.16]);
    for (let k = 0; k < 5; k++) {
      const col = ['#ec4b4b', '#ffd23f', '#7ccc5a', '#e8973a', '#b05a9a'][k];
      deco.vc.add(G.cyl(0.1, 0.1, 0.24, 12), '#eaf7fb', [sx0 - 0.8 + k * 0.4, 1.7, wallZ + 0.16]);
      deco.vc.add(G.cyl(0.085, 0.085, 0.16, 12), col, [sx0 - 0.8 + k * 0.4, 1.67, wallZ + 0.17]);
      deco.vc.add(G.cyl(0.105, 0.105, 0.04, 12), T.accent, [sx0 - 0.8 + k * 0.4, 1.84, wallZ + 0.16]);
    }
    const win = decals.add(400, 300, (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h);
      if (T.night) {
        sky.addColorStop(0, '#141a3a');
        sky.addColorStop(1, '#3a3a6a');
      } else {
        sky.addColorStop(0, '#9fd8ea');
        sky.addColorStop(1, '#e8f6ff');
      }
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);
      if (T.night) {
        g.fillStyle = '#fff6d0';
        g.beginPath();
        g.arc(w * 0.7, h * 0.32, 34, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#141a3a';
        g.beginPath();
        g.arc(w * 0.76, h * 0.28, 30, 0, Math.PI * 2);
        g.fill();
        for (let i = 0; i < 18; i++) {
          g.fillStyle = '#ffffff';
          g.fillRect((i * 97) % w, (i * 53) % (h * 0.7), 3, 3);
        }
        heart(g, w * 0.22, h * 0.3, 26, '#ffd166');
      } else {
        g.fillStyle = '#ffffff';
        for (const [x, y, r] of [[80, 70, 30], [110, 60, 36], [140, 72, 28], [280, 120, 24], [305, 112, 30]]) {
          g.beginPath();
          g.arc(x, y, r, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = '#7ccc5a';
        g.fillRect(0, h * 0.8, w, h * 0.2);
      }
      g.strokeStyle = '#ffffff';
      g.lineWidth = 16;
      g.strokeRect(0, 0, w, h);
      g.beginPath();
      g.moveTo(w / 2, 0);
      g.lineTo(w / 2, h);
      g.moveTo(0, h / 2);
      g.lineTo(w, h / 2);
      g.stroke();
    });
    const wx = right - 1.8;
    onWall(win, 1.5, 1.1, wx, 1.95);
    deco.vc.add(G.box(1.62, 0.08, 0.16), T.top, [wx, 1.37, wallZ + 0.06]);
    // the secret drawing of Roji and Homama, small, low on the wall by the window
    const us = decals.add(300, 240, usDrawing);
    onWall(us, 0.38, 0.3, wx + 1.05, 1.22);
  }
  // per theme
  if (themeId === 'bakery') {
    for (let k = 0; k < 4; k++) deco.vc.add(G.cap(0.12, 0.25, 10), '#d9963e', [left + 1 + k * 0.45, 1.65 + (k % 2) * 0.02, wallZ + 0.16], [0, 0, Math.PI / 2]);
  }
  if (themeId === 'freezer') {
    // a little snowman in a pink scarf sitting on the side wall
    const sxn = left - 0.9;
    const szn = front - 1.6;
    const y0 = 1.0;
    deco.vc.add(G.sph(0.17, 14, 10), '#ffffff', [sxn, y0 + 0.15, szn]);
    deco.vc.add(G.sph(0.12, 14, 10), '#ffffff', [sxn, y0 + 0.39, szn]);
    deco.vc.add(G.tor(0.095, 0.03, 14), '#ff9eb5', [sxn, y0 + 0.3, szn], [Math.PI / 2, 0, 0]);
    deco.vc.add(G.cone(0.02, 0.09, 8), '#ff8a3d', [sxn + 0.13, y0 + 0.4, szn], [0, 0, -Math.PI / 2]);
    for (const s of [-1, 1]) deco.vc.add(G.sph(0.014, 6, 4), '#3b2b3f', [sxn + 0.1, y0 + 0.44, szn + s * 0.04]);
    deco.vc.add(G.cyl(0.07, 0.08, 0.1, 10), '#3b2b3f', [sxn, y0 + 0.53, szn]);
    // ice cream cones on the wall
    for (let k = 0; k < 3; k++) {
      const ix = left + 0.9 + k * 0.6;
      deco.vc.add(G.cone(0.1, 0.32, 10), '#e0b070', [ix, 1.55, wallZ + 0.1], [Math.PI, 0, 0]);
      deco.vc.add(G.sph(0.12, 12, 8), ['#ff9eb5', '#fff0c8', '#9fe8c8'][k], [ix, 1.78, wallZ + 0.1]);
    }
  }
  if (themeId === 'trucks') buildTrucks();
  if (themeId === 'rooftop') buildRooftop();
  if (themeId === 'mint' || themeId === 'night') {
    // a sticky note from Roji, low on the back wall
    const note = decals.add(160, 160, stickyNote);
    onWall(note, 0.2, 0.2, left + 2.9, 1.25);
  }

  function buildTrucks() {
    // the road and the beach behind it, then a chassis, wheels and a tall back wall per truck
    const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshStandardMaterial({ color: '#7b7f8a', roughness: 0.95 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(cx, -0.42, 2);
    road.receiveShadow = true;
    root.add(road);
    for (let k = -6; k <= 6; k++) deco.vc.add(G.box(1.4, 0.02, 0.16), '#ffffff', [cx + k * 2.6, -0.4, front + 1.6]);
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(60, 8), new THREE.MeshStandardMaterial({ color: '#f3dca8', roughness: 1 }));
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(cx, -0.41, back - 4.5);
    root.add(sand);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(80, 30), new THREE.MeshStandardMaterial({ color: '#5fc3d6', roughness: 0.3, metalness: 0.1 }));
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(cx, -0.43, back - 20);
    root.add(sea);
    for (const [px, pz] of [[left - 3, back - 2.5], [right + 2.5, back - 3], [cx + 1, back - 6]]) {
      deco.vc.add(G.cyl(0.09, 0.13, 3.2, 8), '#a0703e', [px, 1.2, pz], [0, 0, 0.12]);
      for (let k = 0; k < 6; k++) deco.vc.add(G.sph(0.5, 8, 4), '#4f9e45', [px + 0.2 + Math.cos(k) * 0.55, 2.8 - (k % 2) * 0.1, pz + Math.sin(k) * 0.55], [0, k, 0.3], [1.4, 0.18, 0.5]);
    }
    for (const s of [1, 2]) {
      const cells = world.cells.filter((q) => q.sec === s);
      const xs = cells.map((q) => lx(q));
      const tx0 = Math.min(...xs) - CELL / 2;
      const tx1 = Math.max(...xs) + CELL / 2;
      const tcx = (tx0 + tx1) / 2;
      const b = B[s];
      const col = s === 1 ? T.body : T.body2;
      b.vc.add(G.rbox(tx1 - tx0, 0.36, front - back, 0.06, 1), col, [tcx, -0.2, (back + front) / 2]);
      b.vc.add(G.box(tx1 - tx0 + 0.02, 0.06, front - back + 0.02), '#ffffff', [tcx, -0.05, (back + front) / 2]);
      for (const wx2 of [tx0 + 1, tx1 - 1]) for (const wz of [front - 0.1, back + 0.1]) {
        b.vc.add(G.cyl(0.36, 0.36, 0.24, 16), '#3b3438', [wx2, -0.2, wz], [Math.PI / 2, 0, 0]);
        b.vc.add(G.cyl(0.18, 0.18, 0.26, 12), '#d7dde3', [wx2, -0.2, wz], [Math.PI / 2, 0, 0]);
      }
      b.vc.add(G.rbox(tx1 - tx0, 2.3, 0.2, 0.06, 1), col, [tcx, 1.15, back - 0.12]);
      b.vc.add(G.box(tx1 - tx0 + 0.02, 0.1, 0.22), '#ffffff', [tcx, 2.25, back - 0.12]);
      // a striped awning
      for (let k = 0; k < 8; k++) b.vc.add(G.box((tx1 - tx0) / 8, 0.04, 0.4), k % 2 ? '#ffffff' : col, [tx0 + ((k + 0.5) * (tx1 - tx0)) / 8, 2.36, back + 0.06], [0.3, 0, 0]);
      const name = decals.add(640, 160, textSign([s === 1 ? 'Roji\'s Prep Truck' : 'YumYum Grill'], { bg: '#fffaf0', ink: PAL.ink, edge: col }));
      decals.plane(s, name, 2.4, 0.6, [tcx, 1.25, back - 0.01]);
      if (s === 2) {
        const hrt = decals.add(200, 200, (g, w, h) => {
          heart(g, w / 2, h / 2, w * 0.9, '#ffffff');
          g.fillStyle = PAL.ink;
          g.font = `700 ${Math.round(h * 0.2)}px ${FONT}`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText('R + H', w / 2, h * 0.47);
        });
        decals.plane(s, hrt, 0.32, 0.32, [tx1 - 0.5, 1.05, back - 0.01]);
      }
    }
  }
  function buildRooftop() {
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(right - left + 4, front - back + 4), new THREE.MeshStandardMaterial({ color: '#c98a6a', roughness: 0.95 }));
    roof.rotation.x = -Math.PI / 2;
    roof.position.set(cx, -0.003, (back + front) / 2);
    roof.receiveShadow = true;
    root.add(roof);
    // parapet with string lights, the city behind
    deco.vc.add(G.box(right - left + 4, 0.7, 0.3), '#f3dcc2', [cx, 0.35, back - 1.6]);
    for (const sx of [left - 1.9, right + 1.9]) deco.vc.add(G.box(0.3, 0.7, front - back + 3.4), '#f3dcc2', [sx, 0.35, (back + front) / 2]);
    // potted olive trees along the parapet
    for (const k of [-1, 1]) {
      const px = cx + k * Math.min(5.5, (right - left) * 0.38);
      deco.vc.add(G.cyl(0.26, 0.2, 0.42, 12), '#c96a4a', [px, 0.21, back - 1.0]);
      deco.vc.add(G.cyl(0.04, 0.05, 0.6, 6), '#7a5a3a', [px, 0.7, back - 1.0]);
      for (let j = 0; j < 5; j++) deco.vc.add(G.sph(0.22, 10, 7), '#7f9a62', [px + Math.cos(j * 1.3) * 0.22, 1.1 + (j % 2) * 0.1, back - 1.0 + Math.sin(j * 1.3) * 0.18]);
    }
    const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff0c0', emissive: '#ffd27a', emissiveIntensity: 1.2 });
    const bulbs = new THREE.InstancedMesh(G.sph(0.06, 8, 6), bulbMat, 24);
    const m4 = new THREE.Matrix4();
    for (let k = 0; k < 24; k++) {
      const u = k / 23;
      m4.makeTranslation(left - 1 + u * (right - left + 2), 2.6 - Math.sin(u * Math.PI * 3) * 0.25, back - 1.4);
      bulbs.setMatrixAt(k, m4);
    }
    root.add(bulbs);
    dyn.lamps.push(bulbs);
    for (const sx of [left - 1.6, right + 1.6]) deco.vc.add(G.cyl(0.05, 0.05, 2.7, 8), '#5a4a3a', [sx, 1.35, back - 1.4]);
    // two mugs on the parapet and a heart-shaped pot of mint
    for (const [mx, col] of [[cx - 0.2, '#ff9eb5'], [cx + 0.15, '#6fb8ff']]) {
      deco.vc.add(G.cyl(0.07, 0.065, 0.14, 12), col, [mx, 0.77, back - 1.55]);
      deco.vc.add(G.tor(0.04, 0.012, 10), col, [mx + 0.08, 0.77, back - 1.55], [0, 0, Math.PI / 2]);
    }
    deco.vc.add(G.cyl(0.16, 0.12, 0.2, 12), PAL.ink, [cx + 2, 0.8, back - 1.55]);
    for (let k = 0; k < 5; k++) deco.vc.add(G.sph(0.08, 8, 5), '#3fae6a', [cx + 2 + Math.cos(k * 1.3) * 0.08, 0.95 + (k % 2) * 0.05, back - 1.55 + Math.sin(k * 1.3) * 0.08]);
  }

  // ---------------------------------------------------------------- merge the static parts
  world.sections.forEach((s, i) => {
    const b = B[i];
    if (b.vc.list.length) {
      const m = new THREE.Mesh(b.vc.geometry(), VC);
      m.castShadow = true;
      m.receiveShadow = true;
      secs[i].add(m);
    }
    if (b.shiny.list.length) {
      const m = new THREE.Mesh(b.shiny.geometry(), VC_SHINY);
      m.castShadow = true;
      m.receiveShadow = true;
      secs[i].add(m);
    }
    if (b.floor.length) {
      const m = new THREE.Mesh(mergeGeometries(b.floor), floorMat);
      m.receiveShadow = true;
      secs[i].add(m);
    }
    const dl = decals.lists.get(i);
    if (dl?.length) {
      const m = new THREE.Mesh(mergeGeometries(dl), decals.mat);
      m.receiveShadow = true;
      secs[i].add(m);
    }
  });

  // ---------------------------------------------------------------- per frame
  let beltOff = 0;
  return {
    root,
    theme: T,
    anchor: (q) => anchors.get(q),
    bells: dyn.bells,
    ring(q) {
      const b = dyn.bells.find((x) => x.q === q);
      if (b) b.t = 0;
    },
    update(dt, t, sim) {
      world.sections.forEach((s, i) => secs[i].position.set(s.x, 0, s.z));
      for (const k of dyn.knives) {
        const chopping = sim.chefs.some((c) => c.working === 'chop' && c.workCell === k.q);
        k.t = chopping ? k.t + dt * 14 : 0;
        const lift = chopping ? Math.abs(Math.sin(k.t)) * 0.12 : 0;
        k.knife.position.copy(k.base);
        k.knife.position.y += lift;
        k.knife.rotation.set(0, k.ry, 0);
        k.knife.rotateZ(chopping ? Math.abs(Math.sin(k.t)) * 0.6 : 0);
      }
      for (const bn of dyn.burners) {
        const it = bn.q.item;
        bn.glow.visible = !!it && (it.kind === 'pan' || it.kind === 'pot') && it.contents.length > 0 && bn.q.fire <= 0;
        if (bn.glow.visible) bn.glow.material.emissiveIntensity = 1.2 + Math.sin(t * 9 + bn.q.c) * 0.3;
      }
      for (const sp of dyn.spits) {
        const s = sp.q.spit;
        sp.cone.visible = s.portions > 0;
        sp.cone.rotation.y += dt * 1.6;
        const k = s.portions / 3;
        sp.cone.scale.set(0.55 + 0.45 * k, 0.5 + 0.5 * k, 0.55 + 0.45 * k);
        sp.cone.position.y = TOP + 0.2 + 0.36 * (0.5 + 0.5 * k);
        sp.cone.material.color.set('#f6c9a8').lerp(new THREE.Color('#b8733f'), s.roast);
        sp.heat.material.emissiveIntensity = 0.7 + Math.sin(t * 4) * 0.15;
      }
      for (const r of dyn.racks) {
        const n = Math.min(6, r.q.rack);
        if (n !== r.n) {
          r.n = n;
          r.stack.geometry = stackGeo(n, false);
        }
      }
      for (const s of dyn.sinks) {
        const n = Math.min(6, s.q.dirty);
        if (n !== s.n) {
          s.n = n;
          s.stack.geometry = stackGeo(n, true);
        }
      }
      for (const b of dyn.bells) {
        b.t += dt;
        const k = Math.max(0, 1 - b.t / 0.6);
        b.bell.rotation.z = Math.sin(b.t * 40) * 0.25 * k;
        b.bell.position.y = TOP + 0.01 + (b.t < 0.08 ? -0.02 : 0);
      }
      for (const bl of dyn.blenders) {
        const it = bl.q.item;
        const on = it?.kind === 'jug' && it.heat && !it.done;
        bl.lamp.material.emissiveIntensity = on ? 1.4 + Math.sin(t * 20) * 0.5 : it?.done ? 0.9 : 0.15;
        if (it?.kind === 'jug') it.obj.rotation.y = on ? Math.sin(t * 40) * 0.05 : it.obj.rotation.y;
      }
      for (const doors of dyn.hatches) {
        for (const d of doors) d.hinge.rotation.z = d.sgn * -world.hatchK * 1.75;
      }
      if (dyn.beltTex) {
        beltOff += dt / 1.05;
        dyn.beltTex.offset.x = -beltOff;
      }
      for (const l of dyn.lamps) if (l.material) l.material.emissiveIntensity = (T.night ? 1.5 : 0.6) + Math.sin(t * 2.1) * 0.08;
    },
  };
}
