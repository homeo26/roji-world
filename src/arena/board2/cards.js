import * as THREE from 'three';
import { canvasTexture, roundRect, FONT, heartShape } from '../../util.js';

// Memory Match cards: one texture atlas with every picture, the card back and a plain edge,
// and a rounded card shape whose top shows the back and whose underside shows the picture.

export const CARD_W = 0.4;
export const CARD_D = 0.53;
export const CARD_T = 0.02;
const CW = 256;
const CH = 338;
const INK = '#3b2b3f';

export const PICS = [
  { id: 'heart', name: 'Heart', bg: '#ffc7d3' },
  { id: 'popcorn', name: 'Popcorn', bg: '#ffe7a8' },
  { id: 'pony', name: 'Pony', bg: '#ffd9bd' },
  { id: 'giraffe', name: 'Giraffe', bg: '#c9ecd9' },
  { id: 'cat', name: 'Kitty', bg: '#e3d6fb' },
  { id: 'gift', name: 'Gift', bg: '#ffd1ec' },
  { id: 'stethoscope', name: 'Stethoscope', bg: '#c6eef0' },
  { id: 'laptop', name: 'Laptop', bg: '#d2e2ff' },
  { id: 'ski', name: 'Skis', bg: '#dcefff' },
  { id: 'ball', name: 'Beach ball', bg: '#ffdcc8' },
];
const BACK = 10;
const EDGE = 11;

const circle = (g, x, y, r, fill) => {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
};
const ellipse = (g, x, y, rx, ry, rot, fill) => {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
};
const eye = (g, x, y, r) => {
  ellipse(g, x, y, r * 0.8, r, 0, INK);
  circle(g, x + r * 0.25, y - r * 0.35, r * 0.32, '#ffffff');
};
const blush = (g, x, y, r) => {
  g.globalAlpha = 0.55;
  ellipse(g, x, y, r, r * 0.6, 0, '#ff8fa0');
  g.globalAlpha = 1;
};

// Each picture is drawn around (0, 0) in a 200 x 200 box.
const DRAW = {
  heart(g) {
    const s = heartShape(170);
    g.save();
    g.translate(0, 8);
    g.scale(1, -1);
    g.beginPath();
    s.getPoints(60).forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
    g.closePath();
    g.fillStyle = '#ef5b6f';
    g.fill();
    g.lineWidth = 9;
    g.strokeStyle = '#c93d55';
    g.stroke();
    g.restore();
    ellipse(g, -36, -36, 20, 12, -0.6, 'rgba(255,255,255,.7)');
    circle(g, -14, -52, 6, 'rgba(255,255,255,.7)');
  },
  popcorn(g) {
    // Puffs
    const puffs = [[-44, -30], [-14, -46], [18, -44], [46, -28], [-30, -6], [2, -18], [34, -6], [-52, 4], [56, 2]];
    for (const [x, y] of puffs) {
      circle(g, x, y, 24, '#f3d38a');
      circle(g, x - 2, y - 3, 21, '#fffaf0');
      circle(g, x + 6, y - 8, 6, '#ffffff');
    }
    // Striped bucket
    g.save();
    g.beginPath();
    g.moveTo(-62, 4);
    g.lineTo(62, 4);
    g.lineTo(44, 88);
    g.lineTo(-44, 88);
    g.closePath();
    g.clip();
    g.fillStyle = '#ffffff';
    g.fillRect(-70, 0, 140, 92);
    g.fillStyle = '#ef5b6f';
    for (let i = -3; i <= 3; i += 2) {
      g.beginPath();
      g.moveTo(i * 18 - 9, 0);
      g.lineTo(i * 18 + 9, 0);
      g.lineTo(i * 13 + 7, 92);
      g.lineTo(i * 13 - 7, 92);
      g.closePath();
      g.fill();
    }
    g.restore();
    g.fillStyle = '#c93d55';
    roundRect(g, -68, 0, 136, 14, 7);
    g.fill();
  },
  pony(g) {
    const coat = '#e9a368';
    // Neck and head
    g.fillStyle = coat;
    g.beginPath();
    g.moveTo(-42, 92);
    g.quadraticCurveTo(-40, 10, -10, -30);
    g.lineTo(30, -8);
    g.quadraticCurveTo(18, 40, 30, 92);
    g.closePath();
    g.fill();
    ellipse(g, 6, -34, 46, 40, 0.3, coat);
    ellipse(g, 44, -6, 30, 24, 0.35, '#f6c79c');
    circle(g, 56, -10, 4, '#7a4a26');
    // Ear
    g.fillStyle = coat;
    g.beginPath();
    g.moveTo(-22, -60);
    g.lineTo(-10, -96);
    g.lineTo(6, -66);
    g.fill();
    g.fillStyle = '#ffb7c5';
    g.beginPath();
    g.moveTo(-14, -66);
    g.lineTo(-9, -86);
    g.lineTo(0, -68);
    g.fill();
    // Mane
    const mane = '#ff7fa3';
    [[-30, -64, 16], [-42, -42, 17], [-50, -16, 17], [-54, 12, 16], [-56, 40, 15], [-56, 66, 14], [-8, -70, 14]].forEach(([x, y, r]) => circle(g, x, y, r, mane));
    circle(g, -4, -74, 10, '#ff9eb5');
    eye(g, 10, -40, 9);
    blush(g, 24, -18, 10);
    g.strokeStyle = '#7a4a26';
    g.lineWidth = 4;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(46, 2, 10, 0.2, 1.4);
    g.stroke();
  },
  giraffe(g) {
    const fur = '#ffc94d';
    const spot = '#d98b2b';
    g.fillStyle = fur;
    roundRect(g, -16, -40, 38, 140, 18);
    g.fill();
    ellipse(g, 12, -52, 44, 32, -0.15, fur);
    ellipse(g, 44, -42, 22, 18, -0.2, '#ffe39a');
    // Horns and ears
    g.strokeStyle = '#b8782e';
    g.lineWidth = 7;
    g.lineCap = 'round';
    for (const x of [-6, 16]) {
      g.beginPath();
      g.moveTo(x, -74);
      g.lineTo(x - 4, -98);
      g.stroke();
      circle(g, x - 4, -100, 8, spot);
    }
    ellipse(g, -30, -66, 16, 8, -0.5, fur);
    for (const [x, y, r] of [[0, -6, 9], [8, 20, 7], [-4, 44, 10], [6, 72, 8], [-8, 90, 6], [-14, -48, 7], [20, -64, 5]]) ellipse(g, x, y, r, r * 0.85, 0.4, spot);
    eye(g, 18, -56, 8);
    blush(g, 28, -36, 9);
    circle(g, 56, -46, 3.5, '#7a4a26');
    g.strokeStyle = '#7a4a26';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(42, -34, 9, 0.3, 1.5);
    g.stroke();
  },
  cat(g) {
    const fur = '#ffb36b';
    for (const s of [-1, 1]) {
      g.fillStyle = fur;
      g.beginPath();
      g.moveTo(s * 62, -18);
      g.lineTo(s * 70, -92);
      g.lineTo(s * 14, -54);
      g.fill();
      g.fillStyle = '#ffc6d0';
      g.beginPath();
      g.moveTo(s * 56, -32);
      g.lineTo(s * 62, -78);
      g.lineTo(s * 28, -54);
      g.fill();
    }
    ellipse(g, 0, 4, 82, 70, 0, fur);
    // Stripes
    g.fillStyle = '#ef8f3f';
    for (const x of [-18, 0, 18]) {
      g.beginPath();
      g.ellipse(x, -54, 6, 14, 0, 0, Math.PI * 2);
      g.fill();
    }
    ellipse(g, 0, 30, 46, 32, 0, '#fff1e0');
    eye(g, -30, -4, 12);
    eye(g, 30, -4, 12);
    blush(g, -50, 20, 12);
    blush(g, 50, 20, 12);
    g.fillStyle = '#ff7f96';
    g.beginPath();
    g.moveTo(-9, 14);
    g.lineTo(9, 14);
    g.lineTo(0, 24);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 4;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(-8, 26, 8, 0.2, Math.PI - 0.2);
    g.arc(8, 26, 8, 0.2, Math.PI - 0.2);
    g.stroke();
    g.lineWidth = 3;
    for (const s of [-1, 1]) {
      for (const dy of [-6, 6]) {
        g.beginPath();
        g.moveTo(s * 40, 22 + dy * 0.5);
        g.lineTo(s * 84, 18 + dy * 1.6);
        g.stroke();
      }
    }
  },
  gift(g) {
    g.fillStyle = '#8b5cf6';
    roundRect(g, -66, -18, 132, 104, 14);
    g.fill();
    g.fillStyle = '#a57cff';
    roundRect(g, -76, -42, 152, 34, 12);
    g.fill();
    g.fillStyle = '#ffd166';
    g.fillRect(-12, -42, 24, 128);
    g.fillRect(-66, 22, 132, 20);
    // Bow
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(s * 30, -60, 30, 18, s * -0.5, 0, Math.PI * 2);
      g.fillStyle = '#ffd166';
      g.fill();
      g.beginPath();
      g.ellipse(s * 30, -60, 15, 8, s * -0.5, 0, Math.PI * 2);
      g.fillStyle = '#e0a800';
      g.fill();
    }
    circle(g, 0, -52, 14, '#ffbf3a');
    circle(g, -40, 50, 6, 'rgba(255,255,255,.5)');
    circle(g, 40, 2, 5, 'rgba(255,255,255,.5)');
  },
  stethoscope(g) {
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = '#2bb3a0';
    g.lineWidth = 12;
    g.beginPath();
    g.moveTo(-40, -80);
    g.quadraticCurveTo(-52, -10, 0, 12);
    g.quadraticCurveTo(52, -10, 40, -80);
    g.stroke();
    g.beginPath();
    g.moveTo(0, 12);
    g.bezierCurveTo(0, 60, 54, 40, 54, 70);
    g.stroke();
    g.strokeStyle = '#9aa4b2';
    g.lineWidth = 8;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * 40, -80);
      g.lineTo(s * 30, -96);
      g.stroke();
      circle(g, s * 28, -98, 9, '#3b2b3f');
    }
    circle(g, 54, 76, 24, '#c9d0da');
    circle(g, 54, 76, 16, '#eef2f6');
    circle(g, 48, 70, 5, '#ffffff');
    // A little heart beat
    g.fillStyle = '#ef5b6f';
    const h = heartShape(30).getPoints(30);
    g.beginPath();
    h.forEach((p, i) => (i ? g.lineTo(-48 + p.x, 64 - p.y) : g.moveTo(-48 + p.x, 64 - p.y)));
    g.fill();
  },
  laptop(g) {
    g.fillStyle = '#5b4a66';
    roundRect(g, -78, -78, 156, 106, 12);
    g.fill();
    g.fillStyle = '#7fd3ff';
    roundRect(g, -66, -66, 132, 82, 6);
    g.fill();
    const lines = [['#ffffff', -54, -52, 46], ['#ffd166', -44, -38, 60], ['#ff9eb5', -44, -24, 34], ['#ffffff', -54, -10, 52], ['#7fe0b0', -44, 4, 40]];
    g.lineCap = 'round';
    g.lineWidth = 7;
    for (const [c, x, y, w] of lines) {
      g.strokeStyle = c;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + w, y);
      g.stroke();
    }
    g.fillStyle = '#ef5b6f';
    const h = heartShape(30).getPoints(30);
    g.beginPath();
    h.forEach((p, i) => (i ? g.lineTo(40 + p.x, -12 - p.y) : g.moveTo(40 + p.x, -12 - p.y)));
    g.fill();
    // Keyboard base
    g.fillStyle = '#d8dde6';
    g.beginPath();
    g.moveTo(-84, 32);
    g.lineTo(84, 32);
    g.lineTo(98, 70);
    g.lineTo(-98, 70);
    g.closePath();
    g.fill();
    g.fillStyle = '#aeb6c4';
    for (let r = 0; r < 2; r++) for (let c = 0; c < 8; c++) {
      roundRect(g, -70 + c * 18 - r * 2, 38 + r * 12, 13, 8, 2);
      g.fill();
    }
    roundRect(g, -22, 60, 44, 6, 3);
    g.fill();
  },
  ski(g) {
    g.lineCap = 'round';
    // Poles
    g.strokeStyle = '#8a94a6';
    g.lineWidth = 6;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * 70, -86);
      g.lineTo(s * 30, 88);
      g.stroke();
      ellipse(g, s * 34, 72, 14, 5, 0, '#5b4a66');
      g.strokeStyle = '#8a94a6';
    }
    // Skis
    const ski = (rot, col) => {
      g.save();
      g.rotate(rot);
      g.fillStyle = col;
      roundRect(g, -13, -88, 26, 176, 13);
      g.fill();
      g.beginPath();
      g.ellipse(0, -86, 13, 18, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.fillRect(-13, -8, 26, 22);
      g.fillStyle = INK;
      g.fillRect(-13, -2, 26, 8);
      g.restore();
    };
    ski(-0.38, '#ef5b6f');
    ski(0.38, '#3f7bf0');
    // Snowflake
    g.strokeStyle = '#ffffff';
    g.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      g.save();
      g.translate(0, -74);
      g.rotate((i * Math.PI) / 3);
      g.beginPath();
      g.moveTo(-14, 0);
      g.lineTo(14, 0);
      g.stroke();
      g.restore();
    }
  },
  ball(g) {
    const R = 80;
    const cols = ['#ef5b6f', '#ffffff', '#ffd166', '#ffffff', '#3f7bf0', '#ffffff'];
    g.save();
    g.beginPath();
    g.arc(0, 0, R, 0, Math.PI * 2);
    g.clip();
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, R, (i / 6) * Math.PI * 2 - Math.PI / 2, ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2);
      g.closePath();
      g.fillStyle = cols[i];
      g.fill();
    }
    const grad = g.createRadialGradient(-26, -30, 10, 0, 0, R);
    grad.addColorStop(0, 'rgba(255,255,255,.35)');
    grad.addColorStop(1, 'rgba(60,30,60,.18)');
    g.fillStyle = grad;
    g.fillRect(-R, -R, R * 2, R * 2);
    g.restore();
    g.lineWidth = 4;
    g.strokeStyle = 'rgba(59,43,63,.25)';
    g.beginPath();
    g.arc(0, 0, R, 0, Math.PI * 2);
    g.stroke();
    circle(g, 0, 0, 12, '#ffffff');
    ellipse(g, -36, -42, 16, 9, -0.7, 'rgba(255,255,255,.75)');
  },
};

function drawFront(g, x, y, pic) {
  g.save();
  g.translate(x, y);
  g.fillStyle = pic.bg;
  roundRect(g, 0, 0, CW, CH, 30);
  g.fill();
  g.lineWidth = 8;
  g.strokeStyle = 'rgba(255,255,255,.9)';
  roundRect(g, 12, 12, CW - 24, CH - 24, 22);
  g.stroke();
  circle(g, CW / 2, CH * 0.44, 104, 'rgba(255,255,255,.55)');
  g.save();
  g.translate(CW / 2, CH * 0.44);
  g.scale(0.92, 0.92);
  DRAW[pic.id](g);
  g.restore();
  g.fillStyle = INK;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 ${pic.name.length > 9 ? 28 : 34}px ${FONT}`;
  g.fillText(pic.name, CW / 2, CH - 42);
  g.restore();
}

function drawBack(g, x, y) {
  g.save();
  g.translate(x, y);
  g.fillStyle = '#fff4ea';
  roundRect(g, 0, 0, CW, CH, 30);
  g.fill();
  g.fillStyle = 'rgba(239,91,111,.2)';
  for (let i = 0; i < 9; i++) for (let j = 0; j < 12; j++) circle(g, 18 + i * 28 + (j % 2) * 14, 18 + j * 28, 4, 'rgba(239,91,111,.2)');
  g.lineWidth = 10;
  g.strokeStyle = '#ef5b6f';
  roundRect(g, 14, 14, CW - 28, CH - 28, 22);
  g.stroke();
  g.lineWidth = 4;
  g.strokeStyle = '#ffd166';
  roundRect(g, 26, 26, CW - 52, CH - 52, 16);
  g.stroke();
  g.save();
  g.translate(CW / 2, CH / 2);
  g.rotate(Math.PI / 4);
  const gr = g.createLinearGradient(-50, -50, 50, 50);
  gr.addColorStop(0, '#ff9eb5');
  gr.addColorStop(1, '#ef5b6f');
  g.fillStyle = gr;
  roundRect(g, -50, -50, 100, 100, 24);
  g.fill();
  g.restore();
  const h = heartShape(62).getPoints(40);
  g.fillStyle = '#ffffff';
  g.beginPath();
  h.forEach((p, i) => (i ? g.lineTo(CW / 2 + p.x, CH / 2 + 3 - p.y) : g.moveTo(CW / 2 + p.x, CH / 2 + 3 - p.y)));
  g.fill();
  g.restore();
}

let atlas = null;
export function cardAtlas() {
  if (atlas) return atlas;
  atlas = canvasTexture(1024, 1024, (g) => {
    g.fillStyle = '#fffaf4';
    g.fillRect(0, 0, 1024, 1024);
    PICS.forEach((p, i) => drawFront(g, (i % 4) * CW, Math.floor(i / 4) * CH, p));
    drawBack(g, (BACK % 4) * CW, Math.floor(BACK / 4) * CH);
    g.fillStyle = '#fff4ea';
    g.fillRect((EDGE % 4) * CW, Math.floor(EDGE / 4) * CH, CW, CH);
  });
  atlas.anisotropy = 8;
  return atlas;
}

const cellUV = (i, u, v) => [((i % 4) * CW + u * CW) / 1024, 1 - (Math.floor(i / 4) * CH + (1 - v) * CH) / 1024];

// A rounded card: top face shows the back, the underside the picture (reads right after a flip about z).
const geoCache = new Map();
export function cardGeometry(pic) {
  if (geoCache.has(pic)) return geoCache.get(pic);
  const s = new THREE.Shape();
  const w = CARD_W;
  const d = CARD_D;
  const r = 0.045;
  s.moveTo(-w / 2 + r, -d / 2);
  s.lineTo(w / 2 - r, -d / 2);
  s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  s.lineTo(w / 2, d / 2 - r);
  s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
  s.lineTo(-w / 2 + r, d / 2);
  s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
  s.lineTo(-w / 2, -d / 2 + r);
  s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: CARD_T, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 5 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -CARD_T / 2, 0);
  g.computeVertexNormals();
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const ny = nor.getY(i);
    let c;
    if (ny > 0.6) c = cellUV(BACK, 0.5 + x / w, 0.5 - z / d);
    else if (ny < -0.6) c = cellUV(pic, 0.5 - x / w, 0.5 - z / d);
    else c = cellUV(EDGE, 0.5, 0.5);
    uv.setXY(i, c[0], c[1]);
  }
  uv.needsUpdate = true;
  geoCache.set(pic, g);
  return g;
}

export function disposeCards() {
  for (const g of geoCache.values()) g.dispose();
  geoCache.clear();
  atlas?.dispose();
  atlas = null;
}
