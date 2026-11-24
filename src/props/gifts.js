import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { heartShape, rng, roundRect, FONT, clamp, easeOutBack, easeInOut, lighten } from '../util.js';
import { Builder, G, C, TAU, instantiate, texMat, cupcake } from './food.js';

// Shared gift models. makeGift(id) -> Object3D, base at y = 0, centred, front faces +Z.
// makeGiftBox(color, ribbon) -> { root, lid, open(k) }: a wrapped box, open(0..1) pops the lid off.
// Some gifts have movable parts in root.userData.parts: heart-balloon.balloon, music-box.dancer.

const PI = Math.PI;
const GOLD = '#f6c552';
const GOLD_DARK = '#e0a83a';
const SILVER = '#e3e7ee';

function starShape(R = 1, r = 0.45, n = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * TAU + PI / 2;
    const rr = i % 2 ? r : R;
    if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  s.closePath();
  return s;
}
const starGeo = (depth = 0.35) => G.extrude(`star${depth}`, () => starShape(), { depth, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 1 });
// Heart outline points scaled round the heart's middle
const heartPts = (k) => heartShape(1).getPoints().map((p) => new THREE.Vector2(p.x * k, 0.047 + (p.y - 0.047) * k));

// A ribbon bow, centred at the knot, loops along X, facing +Z.
function bow(b, t, color, size = 1) {
  b.at({ ...t, s: size }, () => {
    for (const s of [1, -1]) {
      b.tor(0.03, 0.011, color, { x: s * 0.03, y: 0.006, rz: s * 0.35, s: [1, 0.72, 1.2] }, 'gloss', TAU, 16, 6);
      b.box(0.022, 0.05, 0.006, color, { x: s * 0.016, y: -0.028, rz: s * 0.4 }, 'gloss');
    }
    b.sph(0.013, color, { s: [1.1, 1, 0.9] }, 'gloss', 10);
  });
}
// Flat lying ribbon bow (on a lid), loops along X rising up.
function topBow(b, t, color, size = 1) {
  b.at({ ...t, s: size }, () => {
    for (const s of [1, -1]) {
      b.tor(0.042, 0.016, color, { x: s * 0.042, y: 0.03, rz: s * 0.55, s: [1, 0.78, 1] }, 'gloss', TAU, 18, 7);
      b.tor(0.026, 0.012, color, { z: s * 0.03, y: 0.022, ry: PI / 2, rz: s * 0.6, s: [1, 0.8, 1], order: 'YXZ' }, 'gloss', TAU, 14, 6);
      b.box(0.034, 0.006, 0.08, color, { x: s * 0.03, y: 0.004, z: 0.05, ry: s * -0.45 }, 'gloss');
    }
    b.sph(0.022, color, { y: 0.018, s: [1, 0.85, 1] }, 'gloss', 12);
  });
}
// Velvet cushion with gold tassels, top at y = h
function cushion(b, w, h, d, color) {
  b.rbox(w, h, d, Math.min(h, d) * 0.45, color, { y: h / 2 }, 'matte');
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.sph(0.008, GOLD, { x: sx * (w / 2 - 0.004), y: h * 0.7, z: sz * (d / 2 - 0.004) }, 'metal', 8);
      b.cone(0.008, 0.028, GOLD, { x: sx * (w / 2 + 0.002), y: h * 0.7 - 0.016, z: sz * (d / 2 + 0.002), rx: PI }, 'metal', 8);
    }
  }
}
// A tiny chibi figure (for the snow globe), feet at y = 0, about 0.045 tall.
function tinyKid(b, t, top, hair, girl) {
  b.at(t, () => {
    if (girl) b.cone(0.011, 0.024, top, { y: 0.014 }, 'soft', 10);
    else {
      b.cyl(0.008, 0.009, 0.022, top, { y: 0.015 }, 'soft', 8);
      b.cyl(0.0045, 0.0045, 0.008, '#2c3e66', { x: -0.004, y: 0.004 }, 'soft', 6);
      b.cyl(0.0045, 0.0045, 0.008, '#2c3e66', { x: 0.004, y: 0.004 }, 'soft', 6);
    }
    b.sph(0.0115, '#f8dccb', { y: 0.036 }, 'soft', 10);
    b.dome(0.0122, hair, { y: 0.037, z: -0.001, rx: -0.35 }, 'soft', 10);
    if (girl) {
      b.sph(0.005, hair, { x: -0.012, y: 0.034 }, 'soft', 6);
      b.sph(0.005, hair, { x: 0.012, y: 0.034 }, 'soft', 6);
    }
  });
}

// ------------------------------------------------------------------ canvas art
function drawPhoto(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#ffcfdc');
  sky.addColorStop(0.65, '#ffe8d2');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff3b8';
  ctx.beginPath();
  ctx.arc(206, 62, 24, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (const [x, y, s] of [[52, 56, 1], [150, 38, 0.7]]) {
    for (const [dx, dy, r] of [[0, 0, 16], [16, -6, 14], [30, 2, 12], [-14, 4, 11]]) {
      ctx.beginPath();
      ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#a6d872';
  ctx.beginPath();
  ctx.ellipse(w / 2, h + 30, w * 0.85, 110, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#8cc85e';
  ctx.beginPath();
  ctx.ellipse(w * 0.15, h + 10, w * 0.5, 70, 0, 0, TAU);
  ctx.fill();
  for (const [x, y, c] of [[30, 272, '#ff8fb1'], [60, 292, '#ffd166'], [214, 280, '#ffffff'], [236, 300, '#ff8fb1'], [196, 304, '#c7a6ff'], [24, 306, '#ffffff']]) {
    ctx.fillStyle = c;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(x + Math.cos((i / 5) * TAU) * 4, y + Math.sin((i / 5) * TAU) * 4, 3.4, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, TAU);
    ctx.fill();
  }
  const kid = (x, feet, look) => {
    const skin = '#f8dccb';
    ctx.lineCap = 'round';
    ctx.strokeStyle = skin;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(x - 8, feet - 26);
    ctx.lineTo(x - 8, feet - 4);
    ctx.moveTo(x + 8, feet - 26);
    ctx.lineTo(x + 8, feet - 4);
    ctx.stroke();
    ctx.fillStyle = look.shoes;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + s * 9, feet - 2, 8, 5, 0, 0, TAU);
      ctx.fill();
    }
    // arms reaching towards each other, holding hands in the middle
    ctx.strokeStyle = skin;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x - 16 * look.dir, feet - 62);
    ctx.lineTo(x - 22 * look.dir, feet - 40);
    ctx.moveTo(x + 16 * look.dir, feet - 62);
    ctx.lineTo(x + 38 * look.dir, feet - 46);
    ctx.stroke();
    if (look.girl) {
      ctx.fillStyle = look.top;
      ctx.beginPath();
      ctx.moveTo(x - 15, feet - 72);
      ctx.lineTo(x + 15, feet - 72);
      ctx.lineTo(x + 27, feet - 22);
      ctx.quadraticCurveTo(x, feet - 16, x - 27, feet - 22);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x, feet - 70, 12, 5, 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = look.bottom;
      roundRect(ctx, x - 16, feet - 40, 32, 16, 5);
      ctx.fill();
      ctx.fillStyle = look.top;
      roundRect(ctx, x - 18, feet - 74, 36, 38, 10);
      ctx.fill();
    }
    const hy = feet - 102;
    if (look.girl) {
      ctx.fillStyle = look.hair;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + s * 33, hy + 8, 11, 15, s * 0.3, 0, TAU);
        ctx.fill();
      }
    }
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(x, hy, 29, 0, TAU);
    ctx.fill();
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.arc(x, hy - 2, 31, PI * 1.02, PI * 1.98);
    ctx.quadraticCurveTo(x + 18, hy - 20, x, hy - 14);
    ctx.quadraticCurveTo(x - 16, hy - 20, x - 31, hy - 2);
    ctx.fill();
    if (look.girl) {
      ctx.fillStyle = '#ff7fa3';
      ctx.beginPath();
      ctx.ellipse(x + 20, hy - 26, 8, 5, 0.5, 0, TAU);
      ctx.ellipse(x + 30, hy - 20, 8, 5, 0.5, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#2b2230';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + s * 10, hy + 4, 4, 5.5, 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + s * 10 + 1.5, hy + 2, 1.6, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,120,150,0.55)';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + s * 18, hy + 12, 5, 3.5, 0, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = '#7a2e3a';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(x, hy + 12, 6, 0.2 * PI, 0.8 * PI);
    ctx.stroke();
  };
  kid(92, 262, { girl: true, top: '#ef5b6f', hair: '#2a1a13', shoes: '#7a2e3a', dir: -1 });
  kid(164, 262, { girl: false, top: '#3f7bf0', bottom: '#2c3e66', hair: '#141010', shoes: '#ffffff', dir: 1 });
  ctx.fillStyle = '#f8dccb';
  ctx.beginPath();
  ctx.arc(128, 214, 6, 0, TAU);
  ctx.fill();
  // A heart floating above them
  ctx.save();
  ctx.translate(128, 112);
  ctx.fillStyle = '#ff5c7a';
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.bezierCurveTo(-26, -6, -14, -26, 0, -12);
  ctx.bezierCurveTo(14, -26, 26, -6, 0, 12);
  ctx.fill();
  ctx.restore();
}

function drawLetter(ctx, w, h) {
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#ffb3c6';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = '#d6336c';
  ctx.font = `600 34px ${FONT}`;
  ctx.textBaseline = 'top';
  ctx.fillText('Dear Roji,', 26, 24);
  ctx.strokeStyle = '#f2b8c6';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const y = 84 + i * 26;
    ctx.beginPath();
    ctx.moveTo(28, y);
    for (let x = 28; x < w - 40 - (i === 3 ? 90 : 0); x += 12) ctx.lineTo(x, y + Math.sin(x * 0.35 + i) * 2.5);
    ctx.stroke();
  }
  ctx.fillStyle = '#d6336c';
  ctx.font = `600 26px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('Love, Homama', w - 28, h - 50);
  ctx.fillStyle = '#ff5c7a';
  ctx.save();
  ctx.translate(w - 44, 40);
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.bezierCurveTo(-20, -4, -10, -20, 0, -9);
  ctx.bezierCurveTo(10, -20, 20, -4, 0, 10);
  ctx.fill();
  ctx.restore();
}

function drawMug(ctx, w, h) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8467c';
  ctx.font = `700 50px ${FONT}`;
  ctx.fillText('Dr. Roji', w / 2, h * 0.58);
  ctx.fillStyle = '#ff8fb1';
  ctx.save();
  ctx.translate(w / 2, h * 0.24);
  ctx.beginPath();
  ctx.moveTo(0, 16);
  ctx.bezierCurveTo(-30, -6, -16, -30, 0, -14);
  ctx.bezierCurveTo(16, -30, 30, -6, 0, 16);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ffd166';
  for (const [x, y] of [[w * 0.22, h * 0.84], [w * 0.5, h * 0.86], [w * 0.78, h * 0.84]]) {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, TAU);
    ctx.fill();
  }
}

function drawKnit(ctx, w, h) {
  const cols = ['#ff8fab', '#fff3e6', '#ffc2d1', '#fff3e6'];
  const band = w / 8;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = cols[i % 4];
    ctx.fillRect(i * band, 0, band, h);
  }
  ctx.strokeStyle = 'rgba(120,40,70,0.16)';
  ctx.lineWidth = 2.5;
  for (let x = 0; x < w; x += 10) {
    for (let y = 0; y < h; y += 10) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 5, y + 7);
      ctx.lineTo(x + 10, y);
      ctx.stroke();
    }
  }
}

function drawLabel(text, color = '#d6336c', bg = '#ff8fab') {
  return (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff6ec';
    roundRect(ctx, 0, 0, w, h, 26);
    ctx.fill();
    ctx.strokeStyle = '#f4c24f';
    ctx.lineWidth = 6;
    roundRect(ctx, 6, 6, w - 12, h - 12, 20);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(h * 0.5)}px ${FONT}`;
    ctx.fillText(text, w / 2, h / 2 + 2);
  };
}

// ------------------------------------------------------------------ the gifts
const DEFS = new Map();
function gift(id, name, line, build) {
  DEFS.set(id, { id, name, line, build });
}

gift('chocolates', 'Heart chocolates', 'Sweet chocolates for the sweetest doctor.', (b) => {
  const S = 0.3;
  const ring = G.extrude('hearttray', () => {
    const s = new THREE.Shape(heartPts(1));
    s.holes.push(new THREE.Path(heartPts(0.86)));
    return s;
  }, { depth: 0.22, bevelEnabled: false });
  b.add(ring, '#e5484d', { y: 0.033, rx: -PI / 2, s: S }, 'gloss');
  b.add(G.heart(0.06, 0.02), '#e5484d', { y: 0.015, rx: -PI / 2, s: S * 1.01 }, 'gloss');
  b.add(G.heart(0.02, 0), '#ffd6a8', { y: 0.032, rx: -PI / 2, s: S * 0.86 }, 'soft');
  const spots = [[-0.07, -0.07], [0.07, -0.07], [-0.09, 0.0], [0, -0.025], [0.09, 0.0], [-0.045, 0.06], [0.045, 0.06], [0, 0.03], [0, 0.098]];
  const kinds = ['truffle', 'heart', 'gold', 'square', 'truffle', 'heart', 'gold', 'square', 'heart'];
  spots.forEach(([x, z], i) => {
    b.cyl(0.026, 0.02, 0.016, '#8a5a3c', { x, y: 0.042, z }, 'flat', 10);
    const k = kinds[i];
    if (k === 'truffle') {
      b.sph(0.021, '#4a2618', { x, y: 0.06, z }, 'gloss', 12);
      b.tor(0.012, 0.003, '#fff3dc', { x, y: 0.076, z, rx: PI / 2 }, 'gloss', TAU, 12, 4);
    } else if (k === 'heart') b.heart(0.042, i % 2 ? '#ff8fb1' : '#6b3a26', { x, y: 0.064, z, rx: -1.0 }, 'gloss', 0.4, 0.12);
    else if (k === 'gold') b.sph(0.02, GOLD, { x, y: 0.058, z, s: [1, 0.9, 1] }, 'metal', 12);
    else {
      b.rbox(0.032, 0.022, 0.032, 0.007, '#5b3122', { x, y: 0.058, z, ry: 0.5 }, 'gloss');
      b.box(0.026, 0.003, 0.006, '#fff3dc', { x, y: 0.07, z, ry: 0.5 }, 'gloss');
    }
  });
  // The heart lid, propped up behind with a ribbon and bow
  b.at({ y: 0.172, z: -0.168, rx: -0.28 }, () => {
    b.add(G.heart(0.06, 0.03), '#e5484d', { s: S * 1.06 }, 'gloss');
    b.box(0.036, 0.24, 0.004, GOLD, { x: 0.01, y: 0.02, z: 0.02, rz: 0.55 }, 'gloss');
    bow(b, { x: 0.05, y: 0.06, z: 0.028 }, GOLD, 1.3);
  });
});

gift('candy-jar', 'Candy jar', 'A jar of sweets for your busy shifts.', (b) => {
  b.lathe('jar', [[0, 0], [0.078, 0], [0.088, 0.016], [0.092, 0.12], [0.08, 0.16], [0.058, 0.172], [0.058, 0.19]], C.white, null, 'glass', 22);
  b.cyl(0.078, 0.078, 0.008, C.white, { y: 0.004 }, 'glass', 22);
  const r = rng(77);
  const cols = [C.hotpink, C.yellow, C.teal, C.lilac, '#ff9f5a', '#7fd3a7', '#6fb8ff', C.white];
  let i = 0;
  for (let y = 0.026; y < 0.16; y += 0.03) {
    const ring = y > 0.13 ? 0.05 : 0.064;
    const n = y > 0.13 ? 5 : 8;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + y * 20;
      const c = cols[i++ % cols.length];
      const p = { x: Math.sin(a) * ring, y: y + (r() - 0.5) * 0.008, z: Math.cos(a) * ring };
      if (i % 4 === 0) b.heart(0.04, c, { ...p, ry: a }, 'gloss', 0.2, 0.08);
      else b.sph(0.02, c, p, 'gloss', 8);
    }
    b.sph(0.03, cols[i++ % cols.length], { y }, 'gloss', 8);
  }
  // Lid, ribbon round the neck and a tag
  b.cyl(0.068, 0.068, 0.026, '#ff8fab', { y: 0.2 }, 'gloss', 22);
  b.tor(0.066, 0.008, '#ff8fab', { y: 0.212, rx: PI / 2 }, 'gloss', TAU, 22, 6);
  b.heart(0.05, '#ff6f91', { y: 0.235, rz: 0 }, 'gloss', 0.4, 0.14);
  b.tor(0.06, 0.006, C.teal, { y: 0.178, rx: PI / 2 }, 'gloss', TAU, 22, 4);
  bow(b, { y: 0.178, z: 0.064 }, C.teal, 0.9);
  b.rbox(0.04, 0.028, 0.004, 0.006, '#fff6ec', { x: 0.03, y: 0.135, z: 0.098, rz: -0.25 }, 'soft');
  b.heart(0.014, C.hotpink, { x: 0.03, y: 0.135, z: 0.1, rz: -0.25 }, 'gloss', 0.2, 0.05);
});

gift('gold-bracelet', 'Gold bracelet', 'A little gold for the one who shines.', (b) => {
  cushion(b, 0.24, 0.06, 0.18, '#d6336c');
  const R = 0.064;
  const y = 0.066;
  const n = 26;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    b.at({ x: Math.cos(a) * R, y, z: Math.sin(a) * R, ry: -a - PI / 2 }, () => {
      b.tor(0.0105, 0.0032, GOLD, i % 2 ? { s: [1.4, 1, 1] } : { rx: PI / 2, s: [1.4, 1, 1] }, 'metal', TAU, 10, 4);
    });
  }
  // Clasp and charms: a heart, a star and a pink gem
  b.cyl(0.008, 0.008, 0.016, GOLD_DARK, { x: -R, y, rx: PI / 2 }, 'metal', 10);
  const charm = (a, fn) => {
    const x = Math.cos(a) * (R + 0.024);
    const z = Math.sin(a) * (R + 0.024);
    b.tor(0.006, 0.0018, GOLD, { x: Math.cos(a) * (R + 0.01), y, z: Math.sin(a) * (R + 0.01), ry: -a }, 'metal', TAU, 8, 3);
    fn(x, z, a);
  };
  charm(0.7, (x, z, a) => b.add(G.heart(0.25, 0.08, 1, 18), GOLD, { x, y: y + 0.002, z, rx: -PI / 2, rz: -a + PI / 2, s: 0.03, order: 'XYZ' }, 'metal'));
  charm(1.55, (x, z) => b.add(starGeo(), '#ff8fb1', { x, y: y + 0.004, z, rx: -PI / 2 + 0.2, s: 0.016 }, 'gem'));
  charm(2.4, (x, z) => b.add(G.oct(1), '#ff5c8a', { x, y: y + 0.006, z, s: [0.011, 0.011, 0.011] }, 'gem'));
});

gift('gold-necklace', 'Gold necklace', 'Keep my heart close, right by yours.', (b) => {
  // Velvet bust, flattened front to back
  const prof = [[0, 0], [0.075, 0], [0.076, 0.016], [0.03, 0.03], [0.026, 0.06], [0.07, 0.1], [0.12, 0.14], [0.13, 0.168], [0.1, 0.198], [0.048, 0.214], [0.036, 0.235], [0.034, 0.29], [0.02, 0.298], [0, 0.3]];
  const ZS = 0.55;
  b.lathe('bust', prof, '#3d4f86', { s: [1, 1, ZS] }, 'matte', 28);
  b.cyl(0.078, 0.078, 0.01, GOLD, { y: 0.008, s: [1, 1, ZS] }, 'metal', 28);
  const rAt = (y) => {
    for (let i = 1; i < prof.length; i++) {
      if (prof[i][1] >= y) {
        const [r0, y0] = prof[i - 1];
        const [r1, y1] = prof[i];
        return r0 + ((y - y0) / Math.max(1e-6, y1 - y0)) * (r1 - r0);
      }
    }
    return 0;
  };
  // Chain draped from the neck to a heart pendant on the chest
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16;
    const x = (u - 0.5) * 0.12;
    const yy = 0.218 - 0.068 * Math.sin(u * PI) ** 1.4;
    const r = rAt(yy);
    const zs = r * ZS * Math.sqrt(Math.max(0, 1 - (x / r) ** 2));
    pts.push([x, yy, zs + 0.006]);
  }
  pts.unshift([-0.058, 0.226, 0.01]);
  pts.push([0.058, 0.226, 0.01]);
  b.add(G.tube('chain', pts, 0.0032, 48, 5), GOLD, null, 'metal');
  for (let i = 1; i < pts.length - 1; i += 2) b.sph(0.0045, GOLD, { x: pts[i][0], y: pts[i][1], z: pts[i][2] }, 'metal', 6);
  const py = 0.128;
  const pz = rAt(py) * ZS + 0.012;
  b.tor(0.006, 0.002, GOLD, { y: py + 0.03, z: pz - 0.004, ry: PI / 2 }, 'metal', TAU, 8, 3);
  b.add(G.heart(0.3, 0.1, 1, 18), GOLD, { y: py, z: pz, rx: -0.25, s: 0.05 }, 'metal');
  b.add(G.heart(0.3, 0.08, 1, 18), '#ff4f86', { y: py + 0.002, z: pz + 0.011, rx: -0.25, s: 0.028 }, 'gem');
});

gift('barbie', 'Little doll', 'A tiny doll as pretty as you.', (b) => {
  const skin = '#fbe3d3';
  const dress = '#c7a6ff';
  const hair = '#ffd56b';
  b.cyl(0.06, 0.064, 0.014, '#ff9eb5', { y: 0.007 }, 'gloss', 24);
  b.tor(0.06, 0.004, C.white, { y: 0.014, rx: PI / 2 }, 'gloss', TAU, 24, 4);
  for (const s of [-1, 1]) {
    b.cyl(0.009, 0.008, 0.09, skin, { x: s * 0.013, y: 0.06 }, 'soft', 10);
    b.sph(1, '#ff6f91', { x: s * 0.013, y: 0.019, z: 0.005, s: [0.011, 0.008, 0.016] }, 'gloss', 10);
  }
  b.lathe('dollskirt', [[0, 0.084], [0.058, 0.084], [0.06, 0.092], [0.034, 0.142], [0.022, 0.16], [0, 0.16]], dress, null, 'soft', 20);
  b.tor(0.058, 0.007, C.white, { y: 0.088, rx: PI / 2 }, 'soft', TAU, 24, 6);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    b.heart(0.012, C.white, { x: Math.sin(a) * 0.051, y: 0.112, z: Math.cos(a) * 0.051, ry: a, rx: -0.48, order: 'YXZ' }, 'soft', 0.2, 0.04);
  }
  b.cyl(0.02, 0.023, 0.05, dress, { y: 0.182 }, 'soft', 14);
  b.tor(0.022, 0.0045, '#ff6f91', { y: 0.162, rx: PI / 2 }, 'gloss', TAU, 16, 4);
  bow(b, { y: 0.165, z: 0.022 }, '#ff6f91', 0.45);
  for (const s of [-1, 1]) {
    b.cap(0.0075, 0.05, skin, { x: s * 0.03, y: 0.172, z: 0.004, rz: s * 0.35 }, 'soft');
    b.sph(0.009, skin, { x: s * 0.039, y: 0.142, z: 0.006 }, 'soft', 8);
    b.sph(0.011, dress, { x: s * 0.024, y: 0.202 }, 'soft', 10);
  }
  b.cyl(0.008, 0.009, 0.016, skin, { y: 0.212 }, 'soft', 8);
  // Head, long golden hair and a face
  const hy = 0.255;
  b.cap(0.04, 0.06, hair, { y: hy - 0.03, z: -0.012, s: [1.05, 1, 0.75] }, 'gloss');
  b.sph(0.042, skin, { y: hy }, 'soft', 18);
  b.dome(0.046, hair, { y: hy + 0.002, z: -0.004, rx: -0.55 }, 'gloss', 18);
  b.sph(1, hair, { x: -0.014, y: hy + 0.03, z: 0.026, rz: 0.5, s: [0.026, 0.014, 0.016] }, 'gloss', 10);
  b.sph(1, hair, { x: 0.016, y: hy + 0.032, z: 0.025, rz: -0.6, s: [0.024, 0.013, 0.016] }, 'gloss', 10);
  for (const s of [-1, 1]) {
    b.sph(1, '#2b2230', { x: s * 0.015, y: hy - 0.002, z: 0.038, s: [0.0055, 0.0075, 0.004] }, 'gloss', 8);
    b.sph(0.0018, C.white, { x: s * 0.015 + 0.002, y: hy + 0.002, z: 0.0415 }, 'gloss', 5);
    b.sph(1, '#ffb0c2', { x: s * 0.025, y: hy - 0.014, z: 0.032, s: [0.007, 0.004, 0.003] }, 'soft', 8);
  }
  b.tor(0.006, 0.0016, '#d6336c', { y: hy - 0.016, z: 0.04, rz: PI + 0.5 }, 'soft', PI - 1, 8, 3);
  // A little tiara
  b.arc(0.034, 0.003, -1.1, 2.2, GOLD, hy + 0.04, 'metal');
  b.cone(0.006, 0.016, GOLD, { y: hy + 0.05, z: 0.033 }, 'metal', 6);
  b.sph(0.005, '#ff4f86', { y: hy + 0.046, z: 0.037 }, 'gem', 8);
});

gift('flowers', 'Flowers', 'Fresh flowers, because you make every day bloom.', (b) => {
  b.lathe('wrap', [[0, 0], [0.016, 0], [0.105, 0.2], [0.1, 0.205], [0.013, 0.008], [0, 0.008]], '#ffc2d1', null, 'soft', 18);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2;
    b.add(G.oct(1), i % 2 ? '#fff3f6' : '#ffd6e2', { x: Math.sin(a) * 0.097, y: 0.212, z: Math.cos(a) * 0.097, ry: a, rx: 0.45, s: [0.04, 0.045, 0.004], order: 'YXZ' }, 'soft');
  }
  b.tor(0.04, 0.008, '#e5484d', { y: 0.08, rx: PI / 2 }, 'gloss', TAU, 18, 5);
  bow(b, { y: 0.08, z: 0.044 }, '#e5484d', 1.1);
  b.dome(0.095, '#4caf50', { y: 0.19, s: [1, 0.45, 1] }, 'soft', 16);
  const r = rng(31);
  const rose = (t, c) => {
    b.at(t, () => {
      b.sph(0.022, c, { y: 0.004 }, 'gloss', 10);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        b.sph(1, c, { x: Math.sin(a) * 0.016, y: 0, z: Math.cos(a) * 0.016, ry: a, rx: 0.5, s: [0.018, 0.016, 0.008], order: 'YXZ' }, 'gloss', 7);
      }
      b.tor(0.009, 0.004, new THREE.Color(c).multiplyScalar(0.82), { y: 0.022, rx: PI / 2 }, 'gloss', TAU, 10, 4);
    });
  };
  const tulip = (t, c) => {
    b.at(t, () => {
      b.cyl(0.003, 0.003, 0.05, '#3f8f3f', { y: -0.025 }, 'soft', 5);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU;
        b.sph(1, c, { x: Math.sin(a) * 0.006, y: 0.012, z: Math.cos(a) * 0.006, ry: a, rx: -0.15, s: [0.012, 0.022, 0.009], order: 'YXZ' }, 'gloss', 8);
      }
    });
  };
  const roses = [[0, 0.262, 0.0, C.berry], [-0.05, 0.248, 0.03, '#ff8fab'], [0.05, 0.248, 0.03, '#fff0f3'], [-0.035, 0.244, -0.045, '#fff0f3'], [0.04, 0.245, -0.04, C.berry], [0.0, 0.238, 0.07, C.berry], [-0.075, 0.226, -0.005, '#ff8fab'], [0.078, 0.226, -0.002, '#ff8fab']];
  for (const [x, y, z, c] of roses) rose({ x, y, z, rx: z * 4, rz: -x * 4 }, c);
  tulip({ x: -0.02, y: 0.29, z: -0.06, rz: 0.2 }, C.yellow);
  tulip({ x: 0.03, y: 0.296, z: -0.065, rz: -0.25 }, C.lilac);
  for (let i = 0; i < 26; i++) {
    const a = r() * TAU;
    const d = 0.03 + r() * 0.06;
    b.ico(0.006, C.white, { x: Math.cos(a) * d, y: 0.24 + (0.09 - d) * 0.3 + r() * 0.02, z: Math.sin(a) * d }, 'soft', 0);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2;
    b.sph(1, i % 2 ? '#5cb85c' : '#4caf50', { x: Math.sin(a) * 0.085, y: 0.215, z: Math.cos(a) * 0.085, ry: a, rx: -0.7, s: [0.016, 0.004, 0.036], order: 'YXZ' }, 'soft', 8);
  }
});

gift('teddy', 'Teddy bear', 'Hug this one when I am not around.', (b) => {
  const fur = '#c08552';
  const light = '#f1d3b3';
  b.sph(0.07, fur, { y: 0.075, s: [1, 1.04, 0.9] }, 'soft', 18);
  b.sph(0.048, light, { y: 0.07, z: 0.034, s: [1, 1.05, 0.6] }, 'soft', 14);
  for (const s of [-1, 1]) {
    b.sph(1, fur, { x: s * 0.048, y: 0.032, z: 0.04, s: [0.034, 0.03, 0.05] }, 'soft', 12);
    b.cyl(0.022, 0.022, 0.006, light, { x: s * 0.05, y: 0.034, z: 0.088, rx: PI / 2 }, 'soft', 14);
    b.sph(0.006, '#ff9eb5', { x: s * 0.05, y: 0.04, z: 0.091 }, 'soft', 6);
    b.cap(0.022, 0.045, fur, { x: s * 0.058, y: 0.1, z: 0.035, rz: s * 0.7, rx: 0.6, order: 'XYZ' }, 'soft');
    b.sph(0.024, fur, { x: s * 0.05, y: 0.25, z: -0.004 }, 'soft', 12);
    b.sph(0.014, '#ffb6c8', { x: s * 0.05, y: 0.252, z: 0.012, s: [1, 1, 0.5] }, 'soft', 10);
  }
  b.sph(0.066, fur, { y: 0.19, s: [1.06, 0.98, 0.96] }, 'soft', 18);
  b.sph(0.03, light, { y: 0.175, z: 0.054, s: [1.1, 0.82, 0.7] }, 'soft', 12);
  b.sph(1, '#3b2420', { y: 0.186, z: 0.075, s: [0.011, 0.008, 0.007] }, 'gloss', 10);
  b.tor(0.007, 0.0018, '#3b2420', { y: 0.17, z: 0.075, rz: PI + 0.5 }, 'soft', PI - 1, 8, 3);
  for (const s of [-1, 1]) {
    b.sph(0.0085, '#2b2230', { x: s * 0.025, y: 0.205, z: 0.056 }, 'gloss', 8);
    b.sph(0.0025, C.white, { x: s * 0.025 + 0.003, y: 0.208, z: 0.064 }, 'gloss', 5);
    b.sph(1, '#ff9eb5', { x: s * 0.04, y: 0.18, z: 0.05, s: [0.009, 0.006, 0.003] }, 'soft', 8);
  }
  bow(b, { y: 0.142, z: 0.054, rx: -0.2 }, '#e5484d', 0.62);
  // Holding a red heart
  b.heart(0.06, '#e5484d', { y: 0.075, z: 0.085, rx: -0.15 }, 'gloss', 0.35, 0.12);
});

gift('perfume', 'Perfume', 'Something sweet, just like you.', (b) => {
  b.rbox(0.1, 0.016, 0.07, 0.006, GOLD, { y: 0.008 }, 'metal');
  const cy = 0.088;
  b.add(G.heart(0.3, 0.14, 3), '#ffd6e6', { y: cy, s: 0.155 }, 'glass');
  b.add(G.heart(0.3, 0.1), '#ff8fb8', { y: cy - 0.006, s: 0.125 }, 'gloss');
  b.cyl(0.013, 0.015, 0.04, GOLD, { y: cy + 0.06 }, 'metal', 12);
  b.tor(0.015, 0.003, GOLD_DARK, { y: cy + 0.05, rx: PI / 2 }, 'metal', TAU, 12, 3);
  b.add(G.ico(1, 0), '#ffe0f0', { y: cy + 0.1, s: [0.026, 0.03, 0.026] }, 'gem');
  b.rbox(0.034, 0.02, 0.004, 0.004, GOLD, { y: cy - 0.02, z: 0.046 }, 'metal');
  // Atomiser bulb with a tassel
  b.add(G.tube('atom', [[0.012, cy + 0.07, 0], [0.04, cy + 0.08, 0.01], [0.068, cy + 0.06, 0.02], [0.078, cy + 0.03, 0.022]], 0.0028, 12, 4), GOLD, null, 'metal');
  b.sph(0.019, '#ff6f91', { x: 0.08, y: cy + 0.008, z: 0.022 }, 'gloss', 12);
  b.cyl(0.006, 0.008, 0.008, GOLD, { x: 0.08, y: cy + 0.028, z: 0.022 }, 'metal', 8);
  b.cone(0.007, 0.03, GOLD, { x: 0.08, y: cy - 0.026, z: 0.022, rx: PI }, 'metal', 8);
});

gift('earrings', 'Earrings', 'Little sparkles for the brightest smile.', (b) => {
  b.cyl(0.055, 0.06, 0.014, '#ff9eb5', { y: 0.007 }, 'gloss', 22);
  b.cyl(0.006, 0.008, 0.17, '#fff6f0', { y: 0.095 }, 'gloss', 10);
  b.cyl(0.005, 0.005, 0.15, '#fff6f0', { y: 0.178, rz: PI / 2 }, 'gloss', 10);
  for (const s of [-1, 1]) b.sph(0.009, GOLD, { x: s * 0.077, y: 0.178 }, 'metal', 10);
  bow(b, { y: 0.19, z: 0.008 }, '#ff6f91', 0.5);
  for (const s of [-1, 1]) {
    const x = s * 0.045;
    b.tor(0.01, 0.0018, GOLD, { x, y: 0.172, ry: PI / 2 }, 'metal', PI * 1.4, 10, 3);
    b.cyl(0.0012, 0.0012, 0.022, GOLD, { x, y: 0.152 }, 'metal', 4);
    b.sph(0.0075, '#fff6ee', { x, y: 0.14 }, 'gloss', 10);
    b.add(G.heart(0.3, 0.1, 1, 18), '#ff4f86', { x, y: 0.112, z: 0.002, s: 0.042 }, 'gem');
    b.add(G.heart(0.2, 0, 1, 18), GOLD, { x, y: 0.112, z: -0.002, s: 0.048 }, 'metal');
  }
});

gift('ring-box', 'Ring box', 'Forever and always, Roji.', (b) => {
  const red = '#c2185b';
  b.rbox(0.16, 0.075, 0.14, 0.022, red, { y: 0.0375 }, 'matte');
  b.box(0.162, 0.006, 0.142, GOLD, { y: 0.072 }, 'metal');
  b.rbox(0.13, 0.03, 0.11, 0.013, '#fff8f4', { y: 0.078 }, 'gloss');
  b.box(0.07, 0.012, 0.004, '#cdb6b0', { y: 0.093 }, 'soft');
  // Hinged lid, open
  b.at({ y: 0.075, z: -0.07, rx: -1.9 }, () => {
    b.rbox(0.16, 0.05, 0.14, 0.02, red, { y: 0.025, z: 0.07 }, 'matte');
    b.rbox(0.13, 0.006, 0.11, 0.003, '#fff8f4', { y: -0.001, z: 0.07 }, 'gloss');
    b.heart(0.03, GOLD, { y: 0.051, z: 0.07, rx: -PI / 2 }, 'metal', 0.2, 0.05);
  });
  // The ring with a big sparkling stone
  b.tor(0.03, 0.0065, GOLD, { y: 0.118 }, 'metal', TAU, 28, 8);
  b.cyl(0.012, 0.009, 0.01, GOLD, { y: 0.152 }, 'metal', 8);
  b.add(G.cone(0.022, 0.024, 8), '#e6f6ff', { y: 0.16, rx: PI }, 'gem');
  b.add(G.cyl(0.013, 0.022, 0.01, 8), '#f2fbff', { y: 0.177 }, 'gem');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + PI / 4;
    b.cyl(0.0022, 0.0022, 0.018, GOLD, { x: Math.sin(a) * 0.017, y: 0.166, z: Math.cos(a) * 0.017, rx: Math.cos(a) * 0.3, rz: -Math.sin(a) * 0.3 }, 'metal', 4);
  }
});

gift('love-letter', 'Love letter', 'Every word in here is about you.', (b) => {
  const paper = texMat('letter', 256, 192, drawLetter, { rough: 0.85 });
  // The letter, sliding out of the back and leaning towards you
  b.at({ y: 0.012, z: -0.03, rx: -0.42 }, () => {
    b.box(0.2, 0.15, 0.004, '#fffaf0', { y: 0.075 }, 'soft');
    b.tex(G.plane(0.196, 0.146), paper, { y: 0.075, z: 0.0021 });
  });
  b.rbox(0.24, 0.016, 0.16, 0.005, '#ffc2d1', { y: 0.008, z: 0.03 }, 'soft');
  b.add(G.cyl(0.124, 0.124, 0.003, 3), '#ffb0c4', { y: 0.017, z: -0.012, s: [0.98, 1, 0.62] }, 'soft');
  b.cyl(0.022, 0.024, 0.008, '#c2185b', { y: 0.02, z: 0.06 }, 'gloss', 16);
  b.heart(0.028, '#e5484d', { y: 0.026, z: 0.06, rx: -PI / 2 }, 'gloss', 0.25, 0.06);
  for (const [x, z, s, c] of [[-0.14, 0.09, 0.03, '#ff6f91'], [0.15, 0.1, 0.024, '#e5484d'], [0.13, -0.07, 0.02, '#ff9eb5']]) b.heart(s, c, { x, y: 0.005, z, rx: -PI / 2, rz: x * 2 }, 'gloss', 0.25, 0.06);
});

gift('lipstick', 'Lipstick', 'Your favourite pink, for your best smile.', (b) => {
  const bullet = G.custom('lipbullet', () => {
    const g = new THREE.CylinderGeometry(0.019, 0.019, 0.06, 16);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setY(i, 0.03 - (p.getZ(i) + 0.019) * 0.55);
    g.computeVertexNormals();
    return g;
  });
  b.cyl(0.03, 0.031, 0.075, GOLD, { y: 0.0375 }, 'metal', 20);
  b.tor(0.0305, 0.004, '#ff6f91', { y: 0.06, rx: PI / 2 }, 'gloss', TAU, 20, 4);
  b.cyl(0.024, 0.024, 0.03, GOLD_DARK, { y: 0.09 }, 'metal', 18);
  b.add(bullet, '#e0245e', { y: 0.135 }, 'gloss');
  // The cap, lying beside it
  b.at({ x: 0.075, y: 0.031, z: 0.03, rz: PI / 2, ry: 0.5, order: 'YXZ' }, () => {
    b.cyl(0.031, 0.031, 0.085, GOLD, null, 'metal', 20);
    b.tor(0.031, 0.004, '#ff6f91', { y: -0.025, rx: PI / 2 }, 'gloss', TAU, 20, 4);
    b.heart(0.022, '#ff6f91', { y: 0.0435, rx: -PI / 2 }, 'gloss', 0.25, 0.06);
  });
});

gift('handbag', 'Handbag', 'For all your doctor things, in style.', (b) => {
  const body = G.custom('bagbody', () => {
    const g = new RoundedBoxGeometry(0.22, 0.15, 0.085, 3, 0.03);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 1 - 0.16 * ((p.getY(i) + 0.075) / 0.15);
      p.setX(i, p.getX(i) * k);
    }
    g.computeVertexNormals();
    return g;
  });
  const pink = '#ff8fab';
  b.add(body, pink, { y: 0.075 }, 'soft');
  // Quilting on the front
  for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) b.box(0.003, 0.15, 0.002, '#ffc2d1', { x: i * 0.04, y: 0.07, z: 0.0435, rz: s * 0.62 }, 'soft');
  // Flap with a gold heart clasp
  b.rbox(0.19, 0.06, 0.012, 0.012, '#f2709a', { y: 0.122, z: 0.044, rx: 0.08 }, 'soft');
  b.add(G.heart(0.3, 0.08, 1, 18), GOLD, { y: 0.1, z: 0.054, s: 0.032 }, 'metal');
  // Handle
  b.tor(0.065, 0.007, GOLD, { y: 0.15 }, 'metal', PI, 20, 6);
  for (const s of [-1, 1]) b.tor(0.01, 0.003, GOLD, { x: s * 0.065, y: 0.152, ry: PI / 2 }, 'metal', TAU, 10, 3);
  // A fluffy pom-pom charm
  b.cyl(0.0015, 0.0015, 0.04, GOLD, { x: 0.075, y: 0.13, z: 0.03 }, 'metal', 4);
  b.ico(0.018, C.white, { x: 0.075, y: 0.105, z: 0.032 }, 'flat', 1);
});

gift('tiara', 'Tiara', 'For my queen, Dr. Roji.', (b) => {
  cushion(b, 0.26, 0.055, 0.18, '#b39ddb');
  const R = 0.075;
  const y = 0.062;
  b.arc(R, 0.005, -1.9, 3.8, GOLD, y, 'metal');
  b.arc(R, 0.004, -1.9, 3.8, GOLD, y + 0.014, 'metal');
  const peaks = [-1.6, -1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2, 1.6];
  for (const a of peaks) {
    const hgt = 0.075 - Math.abs(a) * 0.032;
    const x = Math.sin(a) * R;
    const z = Math.cos(a) * R;
    b.add(G.cone(0.012, 1, 4), GOLD, { x, y: y + 0.01 + hgt / 2, z, ry: a, s: [1, hgt, 0.35] }, 'metal');
    if (a === 0) {
      b.add(G.heart(0.3, 0.1, 1, 18), '#ff4f86', { x, y: y + 0.07, z: z + 0.004, ry: a, s: 0.034 }, 'gem');
    } else b.sph(0.0065, Math.abs(a) > 1 ? '#9ad7ff' : '#ff8fb1', { x: Math.sin(a) * (R + 0.003), y: y + 0.012 + hgt, z: Math.cos(a) * (R + 0.003) }, 'gem', 8);
    b.sph(0.004, '#fff6ee', { x: Math.sin(a + 0.2) * (R + 0.004), y: y + 0.007, z: Math.cos(a + 0.2) * (R + 0.004) }, 'gloss', 6);
  }
});

gift('music-box', 'Music box', 'A little song that plays our story.', (b) => {
  const pink = '#ffb3c6';
  b.rbox(0.22, 0.09, 0.15, 0.014, pink, { y: 0.05 }, 'gloss');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.sph(0.012, GOLD, { x: sx * 0.095, y: 0.007, z: sz * 0.06 }, 'metal', 8);
  b.box(0.2, 0.004, 0.13, '#c2185b', { y: 0.096 }, 'matte');
  b.box(0.222, 0.008, 0.008, GOLD, { y: 0.094, z: 0.073 }, 'metal');
  b.box(0.008, 0.008, 0.152, GOLD, { x: 0.107, y: 0.094 }, 'metal');
  b.box(0.008, 0.008, 0.152, GOLD, { x: -0.107, y: 0.094 }, 'metal');
  b.add(G.heart(0.25, 0.06, 1, 18), GOLD, { y: 0.05, z: 0.077, s: 0.04 }, 'metal');
  for (const s of [-1, 1]) b.sph(0.006, '#ff6f91', { x: s * 0.06, y: 0.05, z: 0.076 }, 'gem', 8);
  // Lid, open, with a mirror inside
  b.at({ y: 0.096, z: -0.075, rx: -1.85 }, () => {
    b.rbox(0.22, 0.026, 0.15, 0.012, pink, { y: 0.013, z: 0.075 }, 'gloss');
    b.box(0.18, 0.003, 0.12, GOLD, { y: -0.001, z: 0.075 }, 'metal');
    b.rbox(0.165, 0.004, 0.105, 0.0015, '#d8ecff', { y: -0.0025, z: 0.075 }, 'metal');
  });
  // Wind-up key
  b.cyl(0.004, 0.004, 0.02, GOLD, { x: 0.12, y: 0.05, rz: PI / 2 }, 'metal', 6);
  b.tor(0.009, 0.003, GOLD, { x: 0.135, y: 0.058, ry: PI / 2, rz: 0.5 }, 'metal', TAU, 10, 3);
  b.tor(0.009, 0.003, GOLD, { x: 0.135, y: 0.042, ry: PI / 2, rz: -0.5 }, 'metal', TAU, 10, 3);
  // The dancer on her little stage (spin it: userData.parts.dancer)
  b.cyl(0.026, 0.028, 0.008, GOLD, { y: 0.102 }, 'metal', 16);
  b.part('dancer', { y: 0.106 }, (d) => {
    d.cyl(0.003, 0.0028, 0.04, '#fbe3d3', { y: 0.02 }, 'soft', 6);
    d.cap(0.0026, 0.028, '#fbe3d3', { x: 0.01, y: 0.034, rz: 1.2 }, 'soft');
    d.cyl(0.028, 0.028, 0.004, '#fff0f6', { y: 0.042 }, 'soft', 16);
    d.tor(0.026, 0.004, '#ffc2d1', { y: 0.042, rx: PI / 2 }, 'soft', TAU, 16, 4);
    d.cyl(0.006, 0.008, 0.02, '#ff8fab', { y: 0.054 }, 'soft', 8);
    d.sph(0.008, '#fbe3d3', { y: 0.072 }, 'soft', 10);
    d.sph(0.005, '#4a2c1a', { y: 0.081, z: -0.002 }, 'soft', 8);
    d.tor(0.012, 0.0022, '#fbe3d3', { y: 0.084 }, 'soft', PI * 1.6, 12, 3);
  });
});

gift('photo-frame', 'Photo frame', 'Us, my favourite picture.', (b) => {
  const photo = texMat('photo', 256, 320, drawPhoto, { rough: 0.5 });
  b.at({ y: 0.012, z: 0.01, rx: -0.2 }, () => {
    b.rbox(0.22, 0.27, 0.024, 0.016, '#ff9eb5', { y: 0.135 }, 'gloss');
    b.box(0.18, 0.23, 0.004, '#fff6ec', { y: 0.135, z: 0.0115 }, 'soft');
    b.tex(G.plane(0.152, 0.19), photo, { y: 0.135, z: 0.0138 });
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) b.add(G.heart(0.25, 0.08, 1, 18), GOLD, { x: sx * 0.094, y: 0.135 + sy * 0.118, z: 0.014, s: 0.026 }, 'metal');
    b.add(G.heart(0.3, 0.1, 1, 18), '#ff4f86', { y: 0.275, z: 0.006, s: 0.05 }, 'gloss');
  });
  b.rbox(0.05, 0.2, 0.012, 0.005, '#f28aa6', { y: 0.095, z: -0.088, rx: 0.38 }, 'soft');
  b.rbox(0.24, 0.012, 0.07, 0.005, '#f28aa6', { y: 0.006, z: 0.02 }, 'soft');
});

gift('snow-globe', 'Snow globe', 'A tiny winter, for cosy nights together.', (b) => {
  b.lathe('sgbase', [[0, 0], [0.09, 0], [0.092, 0.01], [0.086, 0.05], [0.072, 0.066], [0.062, 0.072], [0, 0.072]], '#ff9eb5', null, 'gloss', 26);
  b.tor(0.089, 0.005, GOLD, { y: 0.03, rx: PI / 2 }, 'metal', TAU, 28, 4);
  b.rbox(0.05, 0.022, 0.006, 0.004, GOLD, { y: 0.034, z: 0.086, rx: -0.12 }, 'metal');
  b.heart(0.012, '#e5484d', { y: 0.034, z: 0.09, rx: -0.12 }, 'gloss', 0.2, 0.05);
  const cy = 0.142;
  b.sph(0.085, C.white, { y: cy }, 'glass', 22);
  b.dome(0.072, C.white, { y: 0.076, s: [1, 0.3, 1] }, 'soft', 20);
  // A little pink house, a snowy tree and Roji and Homama holding hands
  b.rbox(0.036, 0.03, 0.03, 0.004, '#ffc2d1', { x: -0.025, y: 0.11, z: -0.025 }, 'soft');
  b.add(G.cyl(0.026, 0.026, 0.042, 3), '#e5484d', { x: -0.025, y: 0.137, z: -0.025, rz: PI / 2, ry: PI / 2, order: 'ZYX' }, 'soft');
  b.box(0.01, 0.014, 0.002, '#a0602e', { x: -0.025, y: 0.102, z: -0.0095 }, 'soft');
  b.box(0.008, 0.008, 0.002, '#ffd166', { x: -0.035, y: 0.115, z: -0.0095 }, 'glow');
  for (const [h, r] of [[0.03, 0.022], [0.026, 0.017], [0.022, 0.012]]) {
    const yy = 0.1 + (0.03 - h) * 2.2 + h / 2;
    b.cone(r, h, '#3f9a5a', { x: 0.035, y: yy, z: -0.03 }, 'soft', 8);
    b.cone(r * 0.55, h * 0.45, C.white, { x: 0.035, y: yy + h * 0.3, z: -0.03 }, 'soft', 8);
  }
  b.add(starGeo(), C.yellow, { x: 0.035, y: 0.168, z: -0.03, s: 0.008 }, 'glow');
  tinyKid(b, { x: -0.012, y: 0.094, z: 0.03 }, '#ef5b6f', '#2a1a13', true);
  tinyKid(b, { x: 0.016, y: 0.094, z: 0.03 }, '#3f7bf0', '#141010', false);
  b.cap(0.0025, 0.012, '#f8dccb', { x: 0.002, y: 0.112, z: 0.032, rz: PI / 2 }, 'soft');
  const r = rng(12);
  for (let i = 0; i < 26; i++) {
    const a = r() * TAU;
    const d = Math.sqrt(r()) * 0.07;
    b.sph(0.0028, C.white, { x: Math.cos(a) * d, y: 0.11 + r() * 0.09, z: Math.sin(a) * d }, 'soft', 5);
  }
});

gift('bunny', 'Bunny', 'A soft bunny for soft days.', (b) => {
  const fur = '#fff6f3';
  const pink = '#ffb6c8';
  b.sph(0.066, fur, { y: 0.068, s: [1, 0.96, 0.9] }, 'soft', 18);
  b.sph(0.02, fur, { y: 0.05, z: -0.06 }, 'soft', 10);
  for (const s of [-1, 1]) {
    b.sph(1, fur, { x: s * 0.04, y: 0.02, z: 0.048, s: [0.028, 0.02, 0.045] }, 'soft', 12);
    b.sph(0.012, pink, { x: s * 0.04, y: 0.022, z: 0.09, s: [1, 1, 0.4] }, 'soft', 8);
    b.cap(0.017, 0.035, fur, { x: s * 0.05, y: 0.095, z: 0.035, rz: s * 0.5, rx: 0.5 }, 'soft');
  }
  b.sph(0.06, fur, { y: 0.172, s: [1.06, 0.94, 0.95] }, 'soft', 18);
  // Ears, one a little floppy
  b.cap(0.017, 0.085, fur, { x: -0.025, y: 0.262, z: -0.01, rz: 0.15 }, 'soft');
  b.cap(0.009, 0.065, pink, { x: -0.025, y: 0.264, z: 0.004, rz: 0.15 }, 'soft');
  b.at({ x: 0.028, y: 0.215, z: -0.01, rz: -0.9 }, () => {
    b.cap(0.017, 0.085, fur, { y: 0.05 }, 'soft');
    b.cap(0.009, 0.065, pink, { y: 0.052, z: 0.014 }, 'soft');
  });
  for (const s of [-1, 1]) {
    b.sph(0.0085, '#2b2230', { x: s * 0.024, y: 0.182, z: 0.05 }, 'gloss', 8);
    b.sph(0.0025, C.white, { x: s * 0.024 + 0.003, y: 0.186, z: 0.058 }, 'gloss', 5);
    b.sph(1, '#ff9eb5', { x: s * 0.038, y: 0.162, z: 0.046, s: [0.01, 0.006, 0.003] }, 'soft', 8);
  }
  b.sph(1, '#ff8fab', { y: 0.166, z: 0.058, s: [0.008, 0.006, 0.005] }, 'gloss', 8);
  b.tor(0.006, 0.0016, '#c2185b', { x: -0.006, y: 0.156, z: 0.056, rz: PI }, 'soft', PI, 8, 3);
  b.tor(0.006, 0.0016, '#c2185b', { x: 0.006, y: 0.156, z: 0.056, rz: PI }, 'soft', PI, 8, 3);
  bow(b, { y: 0.13, z: 0.05, rx: -0.3 }, C.lilac, 0.55);
  // Holding a carrot
  b.at({ x: 0.0, y: 0.075, z: 0.075, rz: 1.25, rx: 0.2 }, () => {
    b.cone(0.013, 0.07, '#ff9f1c', { rx: PI }, 'gloss', 10);
    for (const a of [-0.4, 0, 0.4]) b.sph(1, '#4caf50', { y: 0.04, rz: a, s: [0.005, 0.018, 0.004] }, 'soft', 6);
  });
});

gift('scarf', 'Scarf', 'To keep you warm on cold mornings.', (b) => {
  const knit = texMat('knit', 256, 128, drawKnit, { rough: 0.95 });
  b.tex(G.rbox(0.26, 0.036, 0.15, 0.016, 2), knit, { y: 0.018 });
  b.tex(G.rbox(0.25, 0.036, 0.145, 0.016, 2), knit, { y: 0.052, ry: 0.05, x: 0.004 });
  b.tex(G.rbox(0.24, 0.036, 0.14, 0.016, 2), knit, { y: 0.086, ry: -0.04 });
  for (let i = 0; i < 12; i++) b.cyl(0.0035, 0.0028, 0.045, i % 2 ? '#ff8fab' : '#fff3e6', { x: -0.11 + i * 0.02, y: 0.046, z: 0.078 + (i % 3) * 0.002, rx: 0.08 }, 'matte', 5);
  // A satin band with a heart tag
  b.box(0.034, 0.108, 0.156, C.white, { x: 0.06, y: 0.054 }, 'gloss');
  b.box(0.034, 0.004, 0.156, C.white, { x: 0.06, y: 0.106 }, 'gloss');
  b.rbox(0.04, 0.05, 0.005, 0.008, '#fff6ec', { x: 0.06, y: 0.078, z: 0.082, rz: 0.15 }, 'soft');
  b.heart(0.022, '#ff6f91', { x: 0.06, y: 0.078, z: 0.0855, rz: 0.15 }, 'gloss', 0.2, 0.05);
});

gift('makeup-palette', 'Makeup palette', 'All the colours, though you need none.', (b) => {
  b.rbox(0.24, 0.03, 0.15, 0.012, '#fff0f5', { y: 0.015 }, 'gloss');
  const shades = ['#ff9eb5', '#ffb38a', '#c7a6ff', '#e8a0a0', GOLD, '#b07a62'];
  shades.forEach((c, i) => {
    const x = ((i % 3) - 1) * 0.07;
    const z = (Math.floor(i / 3) - 0.5) * 0.065;
    b.tor(0.026, 0.0035, GOLD, { x, y: 0.031, z, rx: PI / 2 }, 'metal', TAU, 18, 4);
    b.cyl(0.025, 0.025, 0.006, c, { x, y: 0.03, z }, c === GOLD ? 'metal' : 'soft', 18);
  });
  // Lid with a mirror, open
  b.at({ y: 0.03, z: -0.075, rx: -1.8 }, () => {
    b.rbox(0.24, 0.016, 0.15, 0.008, '#ff8fab', { y: 0.008, z: 0.075 }, 'gloss');
    b.rbox(0.2, 0.003, 0.115, 0.0015, '#d8ecff', { y: -0.0008, z: 0.075 }, 'metal');
    b.add(G.heart(0.2, 0.06, 1, 18), GOLD, { y: 0.017, z: 0.075, rx: -PI / 2, s: 0.04 }, 'metal');
  });
  // A brush in front
  b.at({ x: 0.0, y: 0.009, z: 0.105, rz: PI / 2, ry: 0.12, order: 'YXZ' }, () => {
    b.cyl(0.007, 0.005, 0.12, '#ff6f91', { y: -0.02 }, 'gloss', 10);
    b.cyl(0.0075, 0.0075, 0.022, SILVER, { y: 0.05 }, 'metal', 10);
    b.sph(1, '#f3c6b8', { y: 0.075, s: [0.011, 0.026, 0.011] }, 'soft', 10);
  });
});

gift('heart-balloon', 'Heart balloon', 'My heart floats when you smile.', (b) => {
  // Little gift-box weight
  b.rbox(0.05, 0.045, 0.05, 0.008, '#ff9eb5', { y: 0.0225 }, 'gloss');
  b.box(0.012, 0.047, 0.052, C.white, { y: 0.0225 }, 'gloss');
  b.box(0.052, 0.047, 0.012, C.white, { y: 0.0225 }, 'gloss');
  b.sph(0.008, C.white, { y: 0.048 }, 'gloss', 8);
  b.add(G.tube('bstring', [[0, 0.05, 0], [0.012, 0.15, 0.01], [-0.01, 0.26, 0.0], [0.008, 0.36, -0.01], [0, 0.43, 0]], 0.0016, 40, 3), C.white, null, 'soft');
  // The balloon: sways from its knot (userData.parts.balloon)
  b.part('balloon', { y: 0.43 }, (p) => {
    p.cone(0.008, 0.012, '#ff3d6a', { y: 0.006 }, 'gloss', 8);
    p.add(G.heart(0.28, 0.2, 4), '#ff3d6a', { y: 0.163, s: 0.25 }, 'gloss');
    p.sph(1, '#ffffff', { x: -0.058, y: 0.222, z: 0.084, rz: 0.6, s: [0.022, 0.012, 0.006] }, 'gloss', 8);
  });
});

gift('cupcake-box', 'Cupcake box', 'Four cupcakes, one for every break.', (b) => {
  const pink = '#ffb3c6';
  const S = 0.3;
  const H = 0.075;
  for (const sz of [-1, 1]) b.rbox(S, H, 0.012, 0.004, pink, { y: H / 2, z: sz * (S / 2 - 0.006) }, 'soft');
  for (const sx of [-1, 1]) b.rbox(0.012, H, S - 0.024, 0.004, pink, { x: sx * (S / 2 - 0.006), y: H / 2 }, 'soft');
  b.box(S - 0.02, 0.008, S - 0.02, '#fff6ee', { y: 0.004 }, 'soft');
  b.box(S - 0.024, H - 0.012, 0.002, '#fff6ee', { y: H / 2 + 0.002, z: -(S / 2 - 0.013) }, 'soft');
  b.box(0.04, H + 0.002, 0.004, C.white, { y: H / 2, z: S / 2 + 0.001 }, 'gloss');
  bow(b, { y: H - 0.01, z: S / 2 + 0.008 }, C.white, 1.1);
  const tops = [[-1, -1, '#ff9eb5', 'heart'], [1, -1, '#a8e6cf', 'cherry'], [-1, 1, '#c7a6ff', 'cherry'], [1, 1, '#ffe08a', 'heart']];
  for (const [sx, sz, c, t] of tops) cupcake(b, { x: sx * 0.067, y: 0.008, z: sz * 0.067, s: 0.84 }, c, t, true);
});

// ------------------------------------------------------------------ extras
gift('stethoscope', 'Pink stethoscope', 'For the best doctor in the world.', (b) => {
  b.rbox(0.3, 0.012, 0.26, 0.005, '#e7f7f3', { y: 0.006 }, 'soft');
  b.box(0.3, 0.002, 0.03, '#a8e6cf', { y: 0.0125, z: 0.1 }, 'soft');
  const y = 0.022;
  for (const s of [-1, 1]) {
    b.add(G.tube('stethear', [[0.062, 0, -0.105], [0.05, 0, -0.07], [0.024, 0, -0.035], [0.004, 0, -0.018]], 0.0042, 16, 5), SILVER, { y, s: [s, 1, 1] }, 'metal');
    b.sph(0.01, '#ff8fab', { x: s * 0.064, y, z: -0.11 }, 'gloss', 10);
  }
  b.sph(0.009, SILVER, { y, z: -0.016 }, 'metal', 10);
  b.add(G.tube('stethtube', [[0, 0, -0.016], [0.01, 0, 0.03], [0.055, 0, 0.065], [0.04, 0, 0.1], [-0.02, 0, 0.098], [-0.068, 0, 0.078]], 0.0075, 40, 6), '#ff6f91', { y }, 'gloss');
  // Chest piece with a little heart
  b.cyl(0.032, 0.034, 0.018, SILVER, { x: -0.095, y: 0.024, z: 0.075 }, 'metal', 20);
  b.cyl(0.026, 0.026, 0.003, '#fff6f8', { x: -0.095, y: 0.034, z: 0.075 }, 'gloss', 20);
  b.heart(0.022, '#ff6f91', { x: -0.095, y: 0.037, z: 0.075, rx: -PI / 2 }, 'gloss', 0.2, 0.05);
  b.cyl(0.006, 0.006, 0.018, SILVER, { x: -0.078, y: 0.024, z: 0.07, rz: PI / 2, ry: 0.4, order: 'YXZ' }, 'metal', 8);
  bow(b, { x: 0.048, y: 0.032, z: 0.07, rx: -PI / 2, rz: -0.7 }, '#e5484d', 0.6);
});

gift('doctor-mug', 'Doctor mug', 'Coffee for Dr. Roji, with love.', (b) => {
  const label = texMat('mug', 256, 128, drawMug, { rough: 0.3 });
  b.lathe('dmug', [[0, 0], [0.058, 0], [0.064, 0.006], [0.065, 0.12], [0.061, 0.126], [0.056, 0.12], [0.056, 0.012], [0, 0.012]], C.white, null, 'gloss', 26);
  b.tex(G.cyl(0.0656, 0.0656, 0.1, 18, true, TAU - 0.9, 1.8), label, { y: 0.064 });
  b.tor(0.034, 0.011, C.white, { x: 0.068, y: 0.068, rz: -PI / 2 }, 'gloss', PI, 14, 8);
  b.cyl(0.056, 0.056, 0.004, '#7a4a2e', { y: 0.11 }, 'gloss', 22);
  b.add(G.heart(0.05, 0, 1, 18), '#f3dcc0', { y: 0.1125, rx: -PI / 2, s: 0.05 }, 'soft');
  b.add(G.tube('dsteam', [[0, 0, 0], [0.012, 0.03, 0], [-0.008, 0.06, 0.004], [0.006, 0.09, 0]], 0.006, 16, 5), C.white, { x: -0.01, y: 0.13 }, 'glass');
});

gift('hair-bow', 'Hair bows', 'A bow as cute as you.', (b) => {
  b.at({ y: 0.012, z: 0.0, rx: -0.22 }, () => {
    b.rbox(0.17, 0.21, 0.008, 0.012, '#fff6ec', { y: 0.105 }, 'soft');
    b.box(0.17, 0.02, 0.009, '#ffc2d1', { y: 0.2 }, 'soft');
    b.add(G.tor(0.006, 0.0025, 6, 10), '#ffc2d1', { y: 0.2, z: 0.006 }, 'soft');
    // Big satin bow
    for (const s of [-1, 1]) {
      b.sph(1, '#ff6f91', { x: s * 0.038, y: 0.14, z: 0.018, rz: s * -0.25, s: [0.04, 0.03, 0.016] }, 'gloss', 14);
      b.cap(0.009, 0.04, '#ff6f91', { x: s * 0.018, y: 0.095, z: 0.012, rz: s * 0.45 }, 'gloss');
    }
    b.rbox(0.024, 0.032, 0.022, 0.008, '#e8467c', { y: 0.14, z: 0.02 }, 'gloss');
    b.sph(0.006, '#fff6ee', { y: 0.14, z: 0.032 }, 'gloss', 8);
    for (let i = 0; i < 6; i++) b.sph(0.0035, C.white, { x: (i % 2 ? -1 : 1) * (0.03 + (i % 3) * 0.008), y: 0.13 + (i % 3) * 0.012, z: 0.032 }, 'soft', 5);
    // Two little star clips
    b.add(starGeo(), C.yellow, { x: -0.04, y: 0.05, z: 0.008, s: 0.022 }, 'gloss');
    b.add(starGeo(), C.lilac, { x: 0.04, y: 0.05, z: 0.008, rz: 0.3, s: 0.022 }, 'gloss');
  });
  b.rbox(0.12, 0.012, 0.07, 0.005, '#ffc2d1', { y: 0.006, z: 0.0 }, 'soft');
});

gift('nail-polish', 'Nail polish', 'Three pinks, because you deserve choices.', (b) => {
  const bottle = (x, z, c, cap) => {
    b.rbox(0.05, 0.055, 0.05, 0.014, C.white, { x, y: 0.0275, z }, 'glass');
    b.rbox(0.04, 0.045, 0.04, 0.012, c, { x, y: 0.0255, z }, 'gloss');
    b.cyl(0.012, 0.012, 0.01, cap, { x, y: 0.06, z }, 'metal', 12);
    b.cyl(0.011, 0.013, 0.055, cap, { x, y: 0.092, z }, 'gloss', 12);
  };
  bottle(-0.045, 0.02, '#ff6f91', GOLD);
  bottle(0.045, 0.025, '#e5484d', '#2b2230');
  bottle(0.0, -0.04, '#c7a6ff', '#fff6f0');
  b.heart(0.022, '#ff6f91', { x: 0.0, y: 0.006, z: 0.07, rx: -PI / 2 }, 'gloss', 0.2, 0.05);
});

gift('hand-mirror', 'Hand mirror', 'So you can see what I see.', (b) => {
  b.cyl(0.05, 0.056, 0.014, '#ffb3c6', { y: 0.007 }, 'gloss', 20);
  b.at({ y: 0.0, rx: -0.12 }, () => {
    b.cap(0.012, 0.07, '#ff8fab', { y: 0.05 }, 'gloss');
    b.tor(0.013, 0.004, GOLD, { y: 0.03, rx: PI / 2 }, 'metal', TAU, 12, 4);
    b.tor(0.013, 0.004, GOLD, { y: 0.086, rx: PI / 2 }, 'metal', TAU, 12, 4);
    const cy = 0.17;
    b.cyl(0.07, 0.07, 0.016, '#ff8fab', { y: cy, rx: PI / 2, s: [1, 1, 1.2] }, 'gloss', 28);
    b.cyl(0.058, 0.058, 0.004, '#d8ecff', { y: cy, z: 0.008, rx: PI / 2, s: [1, 1, 1.2] }, 'metal', 28);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU;
      b.sph(0.0055, i % 2 ? GOLD : '#fff6ee', { x: Math.sin(a) * 0.064, y: cy + Math.cos(a) * 0.077, z: 0.009 }, i % 2 ? 'metal' : 'gloss', 6);
    }
    b.heart(0.035, '#ff4f86', { y: cy + 0.095, z: 0.004 }, 'gloss', 0.3, 0.1);
    b.sph(1, '#ffffff', { x: -0.024, y: cy + 0.03, z: 0.011, rz: 0.7, s: [0.018, 0.006, 0.002] }, 'gloss', 8);
  });
});

gift('heart-pillow', 'Heart pillow', 'Rest your head after a long shift.', (b) => {
  const S = 0.22;
  b.at({ y: 0.105, z: -0.01, rx: -0.95 }, () => {
    b.add(G.heart(0.22, 0.2, 4), '#ff8fb1', { s: S }, 'soft');
    const pts = heartPts(1);
    const n = pts.length - 1;
    for (let i = 0; i < n; i += 2) {
      const a = pts[(i + n - 1) % n];
      const c = pts[(i + 1) % n];
      const dx = c.x - a.x;
      const dy = c.y - a.y;
      const l = Math.hypot(dx, dy) || 1;
      b.sph(0.0105, C.white, { x: (pts[i].x - (dy / l) * 0.15) * S, y: (pts[i].y - 0.047 + (dx / l) * 0.15) * S, z: 0 }, 'soft', 6);
    }
    b.heart(0.11, C.white, { z: 0.075 }, 'soft', 0.1, 0.04);
    b.heart(0.065, '#ff4f86', { z: 0.084 }, 'gloss', 0.1, 0.04);
  });
});

gift('star-lamp', 'Moon night light', 'A little light for sweet dreams.', (b) => {
  b.cyl(0.08, 0.085, 0.018, '#c7a6ff', { y: 0.009 }, 'gloss', 24);
  for (const [x, y, z, r] of [[-0.03, 0.035, 0, 0.034], [0.02, 0.038, 0.005, 0.04], [0.058, 0.03, 0, 0.026], [-0.06, 0.028, 0.01, 0.024], [0, 0.03, 0.03, 0.03]]) b.sph(r, '#ffffff', { x, y, z, s: [1, 0.75, 0.8] }, 'soft', 14);
  // Crescent moon sitting on the cloud
  const n = 11;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const a = -2.1 + k * 3.2;
    const rr = 0.008 + 0.022 * Math.sin(k * PI);
    b.sph(rr, '#fff1a8', { x: Math.cos(a) * 0.06 + 0.01, y: 0.12 + Math.sin(a) * 0.06, z: 0 }, 'glow', 12);
  }
  b.tor(0.006, 0.0018, '#8a5a2b', { x: 0.05, y: 0.112, z: 0.03, rz: PI + 0.5 }, 'soft', PI - 1, 8, 3);
  b.sph(1, '#ff9eb5', { x: 0.058, y: 0.098, z: 0.029, s: [0.006, 0.004, 0.002] }, 'soft', 6);
  b.add(starGeo(0.4), '#ffd166', { x: -0.055, y: 0.072, z: 0.02, s: 0.02, rz: -0.2 }, 'glow');
  b.add(starGeo(0.4), '#ffd166', { x: -0.07, y: 0.17, z: 0.0, s: 0.014, rz: 0.4 }, 'glow');
});

gift('bunny-slippers', 'Bunny slippers', 'Cosy feet after a long day at the hospital.', (b) => {
  const slipper = (x, ry) => {
    b.at({ x, ry }, () => {
      b.rbox(0.085, 0.012, 0.17, 0.005, '#ffe3ec', { y: 0.006 }, 'soft');
      b.rbox(0.08, 0.055, 0.16, 0.026, '#ffc2d1', { y: 0.032 }, 'soft');
      b.sph(1, '#f28aa6', { y: 0.058, z: -0.035, s: [0.028, 0.006, 0.045] }, 'soft', 12);
      b.sph(0.034, '#fff6f3', { y: 0.05, z: 0.05, s: [1, 0.85, 1] }, 'soft', 14);
      for (const s of [-1, 1]) {
        b.cap(0.011, 0.045, '#fff6f3', { x: s * 0.016, y: 0.098, z: 0.035, rz: s * -0.25, rx: -0.2 }, 'soft');
        b.cap(0.005, 0.032, '#ffb6c8', { x: s * 0.016, y: 0.098, z: 0.042, rz: s * -0.25, rx: -0.2 }, 'soft');
        b.sph(0.005, '#2b2230', { x: s * 0.012, y: 0.058, z: 0.08 }, 'gloss', 6);
      }
      b.sph(0.0045, '#ff8fab', { y: 0.05, z: 0.084 }, 'gloss', 6);
    });
  };
  slipper(-0.05, 0.12);
  slipper(0.05, -0.12);
});

gift('pearl-necklace', 'Pearl necklace', 'Pearls for a pearl of a girl.', (b) => {
  b.cyl(0.15, 0.155, 0.02, '#3d4f86', { y: 0.01 }, 'matte', 30);
  b.tor(0.15, 0.005, GOLD, { y: 0.02, rx: PI / 2 }, 'metal', TAU, 36, 4);
  const pts = heartPts(1);
  const S = 0.2;
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    b.sph(0.0085, i % 6 === 0 ? '#ffe9f0' : '#fff7ef', { x: p.x * S, y: 0.029, z: -(p.y - 0.047) * S }, 'gloss', 7);
  }
  b.sph(0.016, '#fff7ef', { y: 0.034, z: 0.12 }, 'gloss', 12);
  b.cyl(0.006, 0.006, 0.01, GOLD, { y: 0.03, z: -0.05, rz: PI / 2 }, 'metal', 8);
});

gift('diary', 'Diary', 'For your thoughts, your dreams and your secrets.', (b) => {
  const label = texMat('diary', 192, 96, drawLabel('Roji'), { rough: 0.6 });
  b.at({ ry: 0.2 }, () => {
    b.rbox(0.18, 0.012, 0.23, 0.005, '#ff8fab', { y: 0.006 }, 'soft');
    b.box(0.17, 0.03, 0.215, '#fffaf0', { x: 0.004, y: 0.025 }, 'soft');
    b.rbox(0.18, 0.012, 0.23, 0.005, '#ff8fab', { y: 0.044 }, 'soft');
    b.rbox(0.016, 0.048, 0.232, 0.006, '#f2709a', { x: -0.088, y: 0.025 }, 'soft');
    b.tex(G.plane(0.11, 0.055), label, { y: 0.0505, z: -0.035, rx: -PI / 2 });
    b.add(G.heart(0.2, 0.06, 1, 18), GOLD, { y: 0.052, z: 0.05, rx: -PI / 2, s: 0.04 }, 'metal');
    // Strap with a little heart lock
    b.box(0.05, 0.004, 0.03, '#e8467c', { x: 0.07, y: 0.051, z: 0.02 }, 'soft');
    b.box(0.004, 0.05, 0.03, '#e8467c', { x: 0.092, y: 0.026, z: 0.02 }, 'soft');
    b.add(G.heart(0.25, 0.08, 1, 18), GOLD, { x: 0.096, y: 0.026, z: 0.02, ry: PI / 2, s: 0.026 }, 'metal');
    b.box(0.012, 0.002, 0.05, C.lilac, { x: 0.03, y: 0.012, z: 0.13, rx: 0.4 }, 'soft');
  });
});

// ------------------------------------------------------------------ the wrapped box
const BOX_S = 0.3;
const BOX_H = 0.24;
const WALL = 0.014;
const LID_L = BOX_S + 0.024;
const LID_H = 0.07;
const LID_Y = BOX_H + 0.019 - LID_H;
const LEAN = 0.35;

function wrapPaper(color) {
  return texMat('wrap' + color, 128, 128, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#' + lighten(color, 0.4).getHexString();
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        ctx.beginPath();
        ctx.arc(x * 32 + (y % 2) * 16 + 8, y * 32 + 16, 5.5, 0, TAU);
        ctx.fill();
      }
    }
  }, { rough: 0.6 });
}

const boxTpls = new Map();
function boxTemplates(color, ribbon) {
  const key = color + '|' + ribbon;
  if (boxTpls.has(key)) return boxTpls.get(key);
  const paper = wrapPaper(color);
  const liner = '#' + lighten(color, 0.82).getHexString();
  const base = new Builder();
  const S = BOX_S;
  const H = BOX_H;
  for (const s of [1, -1]) {
    base.tex(G.rbox(S, H, WALL, 0.005), paper, { y: H / 2, z: s * (S / 2 - WALL / 2) });
    base.tex(G.rbox(WALL, H, S - 2 * WALL, 0.005), paper, { x: s * (S / 2 - WALL / 2), y: H / 2 });
    base.box(0.05, H, 0.004, ribbon, { y: H / 2, z: s * (S / 2 + 0.001) }, 'gloss');
    base.box(0.004, H, 0.05, ribbon, { x: s * (S / 2 + 0.001), y: H / 2 }, 'gloss');
  }
  base.tex(G.box(S - 2 * WALL, WALL, S - 2 * WALL), paper, { y: WALL / 2 });
  const inner = S - 2 * WALL;
  const lh = H - WALL - 0.004;
  const ly = WALL + lh / 2;
  const lp = G.plane(inner, lh);
  base.add(lp, liner, { y: ly, z: -inner / 2 + 0.001 });
  base.add(lp, liner, { y: ly, z: inner / 2 - 0.001, ry: PI });
  base.add(lp, liner, { x: -inner / 2 + 0.001, y: ly, ry: PI / 2 });
  base.add(lp, liner, { x: inner / 2 - 0.001, y: ly, ry: -PI / 2 });
  // Tissue paper inside
  const tissue = ['#fff3f6', '#fff9e6', '#f0f9ff', '#ffffff'];
  const r = rng(9);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    const d = i ? 0.075 : 0;
    base.ico(0.06, tissue[i % tissue.length], { x: Math.cos(a) * d, y: 0.17 + r() * 0.015, z: Math.sin(a) * d, rx: r() * 3, ry: r() * 3, s: [1, 0.5, 1] }, 'flat', 1);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4;
    base.add(G.oct(1), tissue[i], { x: Math.cos(a) * 0.1, y: 0.205, z: Math.sin(a) * 0.1, ry: a, rz: 0.4, s: [0.012, 0.03, 0.03] }, 'flat');
  }
  const lid = new Builder();
  const L = LID_L;
  const T = WALL * 0.8;
  const sk = LID_H - 0.012;
  lid.tex(G.rbox(L, 0.018, L, 0.007), paper, { y: LID_H - 0.009 });
  for (const s of [1, -1]) {
    lid.tex(G.rbox(L, sk, T, 0.004), paper, { y: sk / 2, z: s * (L / 2 - T / 2) });
    lid.tex(G.rbox(T, sk, L - 2 * T, 0.004), paper, { x: s * (L / 2 - T / 2), y: sk / 2 });
    lid.box(0.054, sk, 0.004, ribbon, { y: sk / 2, z: s * (L / 2 + 0.001) }, 'gloss');
    lid.box(0.004, sk, 0.054, ribbon, { x: s * (L / 2 + 0.001), y: sk / 2 }, 'gloss');
  }
  lid.add(G.plane(L - 2 * T, L - 2 * T), liner, { y: LID_H - 0.0185, rx: PI / 2 });
  lid.box(0.054, 0.005, L + 0.004, ribbon, { y: LID_H + 0.001 }, 'gloss');
  lid.box(L + 0.004, 0.005, 0.054, ribbon, { y: LID_H + 0.001 }, 'gloss');
  topBow(lid, { y: LID_H + 0.002 }, ribbon, 1.15);
  const tpl = { base: base.bake(), lid: lid.bake() };
  boxTpls.set(key, tpl);
  return tpl;
}

export function makeGiftBox(color = '#ef5b6f', ribbon = '#ffd166') {
  const tpl = boxTemplates(color, ribbon);
  const root = new THREE.Group();
  root.name = 'giftbox';
  const body = instantiate(tpl.base, 'giftbox-body');
  const lid = instantiate(tpl.lid, 'giftbox-lid');
  root.add(body, lid);
  // Where the lid ends up: leaning on the right side of the box
  const half = LID_L / 2;
  const qx = BOX_S / 2 + 0.004 + BOX_H * Math.tan(LEAN);
  const endX = qx - half * Math.sin(LEAN);
  const endY = half * Math.cos(LEAN);
  const endRz = -(PI / 2 - LEAN);
  const POP = 0.2;
  function open(k = 0) {
    k = clamp(k, 0, 1);
    const a = clamp(k / 0.14, 0, 1);
    const p = clamp((k - 0.14) / 0.36, 0, 1);
    const m = clamp((k - 0.5) / 0.5, 0, 1);
    // Wiggle and squash, then pop up, then set aside
    const sq = Math.sin(a * PI) * (1 - p);
    body.scale.set(1 + sq * 0.03, 1 - sq * 0.06, 1 + sq * 0.03);
    const lift = POP * easeOutBack(p);
    const tilt = clamp((lift - 0.06) / 0.1, 0, 1);
    const e = easeInOut(m);
    const wig = Math.sin(a * PI * 3) * 0.05 * (1 - a);
    lid.position.set(endX * e, LID_Y + lift * (1 - m * m) + (endY - LID_Y) * m * m + sq * 0.004, -0.02 * tilt * (1 - m));
    lid.rotation.set(-0.25 * tilt * (1 - e), 0, wig - 0.15 * tilt + (endRz + 0.15) * e);
    lid.scale.setScalar(1 + Math.sin(p * PI) * 0.07);
    root.userData.openK = k;
  }
  open(0);
  root.userData.open = open;
  return { root, lid, body, open };
}

// ------------------------------------------------------------------ public api
export const GIFTS = [...DEFS.values()].map(({ id, name, line }) => ({ id, name, line }));

const tpls = new Map();
const ALIASES = { chocolate: 'chocolates', 'heart-box': 'chocolates', candy: 'candy-jar', bracelet: 'gold-bracelet', necklace: 'gold-necklace', doll: 'barbie', bouquet: 'flowers', roses: 'flowers', bear: 'teddy', ring: 'ring-box', letter: 'love-letter', bag: 'handbag', crown: 'tiara', frame: 'photo-frame', photo: 'photo-frame', globe: 'snow-globe', balloon: 'heart-balloon', cupcakes: 'cupcake-box', mug: 'doctor-mug', bow: 'hair-bow', mirror: 'hand-mirror', pillow: 'heart-pillow', lamp: 'star-lamp', slippers: 'bunny-slippers', pearls: 'pearl-necklace', makeup: 'makeup-palette' };

export function makeGift(id) {
  if (!DEFS.has(id) && DEFS.has(ALIASES[id])) id = ALIASES[id];
  if (!DEFS.has(id)) {
    const box = makeGiftBox();
    box.root.userData.prop = { kind: 'gift', id: 'box', name: 'A surprise' };
    return box.root;
  }
  if (!tpls.has(id)) {
    const b = new Builder();
    DEFS.get(id).build(b);
    tpls.set(id, b.bake());
  }
  const obj = instantiate(tpls.get(id), 'gift:' + id);
  obj.userData.prop = { kind: 'gift', id, name: DEFS.get(id).name };
  return obj;
}
