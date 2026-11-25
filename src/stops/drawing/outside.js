import { Kid } from '../../kid.js';
import { rng } from '../../util.js';
import { freeze } from '../../places/school/kit.js';
import * as M from './models.js';
import * as PT from './paint.js';

// The Little Art Studio on the town street: a narrow two-storey studio in butter yellow and pink, a sawtooth
// roof whose glass faces north, rainbow paint dripping off the front eave, a giant pencil standing at the corner
// wound with fairy lights, a palette sign on the roof, a balcony with a sleeping cat, easels outside with
// paintings in progress (a painter at work, a little girl at a small easel), drawings drying on a line, and a
// chalk heart with R + H on the pavement in front of the door.
// Local coordinates: st.origin is 6.2 m behind the pad; the front wall is at z = -0.5, the door at x = 0.

const { THREE, box, rbox, cyl, sph, at, rot, mat, umat, mesh, COL } = M;
const P = Math.PI;

export const B = { x0: -1.3, x1: 4.5, z0: -3.4, z1: 0.0, h1: 2.6, h2: 4.6, tooth: 0.7 };
export const DOOR = { x: 0, w: 1.25, h: 2.15 };
const WALL1 = '#ffe29a';
const WALL2 = '#ffc4d3';
const TRIM = '#ffffff';
const ROOF = '#b9a6e8';

export function buildOutside(st) {
  const g = st.group;
  const r = rng(61);
  const dynamic = [];
  const updates = [];
  const add = (...o) => (g.add(...o), o[0]);
  const dyn = (o) => (dynamic.push(o), o);
  const colBox = (x, z, hw, hd, h) => st.addCollider(h === undefined ? { type: 'box', x, z, hw, hd } : { type: 'box', x, z, hw, hd, h });
  const colCirc = (x, z, rr, h) => st.addCollider(h === undefined ? { type: 'circle', x, z, r: rr } : { type: 'circle', x, z, r: rr, h });
  const atlas = M.makeAtlas(2048, 2048);
  const looks = loadLooks();
  const bw = B.x1 - B.x0;
  const bcx = (B.x0 + B.x1) / 2;
  const bd = B.z1 - B.z0;
  const bcz = (B.z0 + B.z1) / 2;
  const F = B.z1; // front face

  // ---------------------------------------------------------------- night-lit glass (window interiors painted on one canvas)
  const gc = document.createElement('canvas');
  gc.width = gc.height = 1024;
  const gtex = new THREE.CanvasTexture(gc);
  gtex.colorSpace = THREE.SRGBColorSpace;
  gtex.anisotropy = 8;
  const glass = new THREE.MeshStandardMaterial({ map: gtex, roughness: 0.25, metalness: 0.05, emissive: new THREE.Color('#ffc978'), emissiveMap: gtex, emissiveIntensity: 0 });
  let gx = 0;
  let gy = 0;
  let grow = 0;
  const glassPanel = (wm, hm, pw, ph, draw) => {
    if (gx + pw > 1024) {
      gx = 0;
      gy += grow + 4;
      grow = 0;
    }
    const cx = gx;
    const cy = gy;
    gx += pw + 4;
    grow = Math.max(grow, ph);
    const c = gc.getContext('2d');
    c.save();
    c.translate(cx, cy);
    c.beginPath();
    c.rect(0, 0, pw, ph);
    c.clip();
    draw(c, pw, ph);
    c.restore();
    const geo = new THREE.PlaneGeometry(wm, hm);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (cx + uv.getX(i) * pw) / 1024, 1 - (cy + ph) / 1024 + (uv.getY(i) * ph) / 1024);
    gtex.needsUpdate = true;
    return mesh(geo, glass, { cast: false });
  };
  // A warm room seen through glass: wall, a hanging lamp, canvases and an easel
  const roomView = (kind) => (c, w, h) => {
    const wall = c.createLinearGradient(0, 0, 0, h);
    wall.addColorStop(0, '#fff3dc');
    wall.addColorStop(1, '#ffd9b8');
    c.fillStyle = wall;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#e8b48a';
    c.fillRect(0, h * 0.82, w, h * 0.18);
    const lamp = (x) => {
      c.strokeStyle = '#6b5a6e';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h * 0.16);
      c.stroke();
      const lg = c.createRadialGradient(x, h * 0.2, 2, x, h * 0.22, h * 0.32);
      lg.addColorStop(0, 'rgba(255,236,170,0.95)');
      lg.addColorStop(1, 'rgba(255,236,170,0)');
      c.fillStyle = lg;
      c.fillRect(x - h * 0.4, 0, h * 0.8, h * 0.6);
      c.fillStyle = '#ef5b6f';
      c.beginPath();
      c.moveTo(x - 16, h * 0.2);
      c.lineTo(x + 16, h * 0.2);
      c.lineTo(x + 8, h * 0.14);
      c.lineTo(x - 8, h * 0.14);
      c.fill();
    };
    const pic = (x, y, pw, ph, a, b) => {
      c.fillStyle = '#f4c24f';
      c.fillRect(x - 4, y - 4, pw + 8, ph + 8);
      c.fillStyle = a;
      c.fillRect(x, y, pw, ph);
      c.fillStyle = b;
      c.beginPath();
      c.arc(x + pw * 0.5, y + ph * 0.55, Math.min(pw, ph) * 0.28, 0, P * 2);
      c.fill();
    };
    if (kind === 'shop') {
      pic(w * 0.08, h * 0.18, w * 0.16, h * 0.22, '#9fd8ff', '#ffd166');
      pic(w * 0.76, h * 0.14, w * 0.14, h * 0.3, '#ffd1dc', '#ef5b6f');
      lamp(w * 0.5);
      // an easel with a painting in the middle of the window
      c.strokeStyle = '#9b6a43';
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(w * 0.42, h * 0.95);
      c.lineTo(w * 0.5, h * 0.3);
      c.lineTo(w * 0.58, h * 0.95);
      c.stroke();
      c.fillStyle = '#ffffff';
      c.fillRect(w * 0.36, h * 0.34, w * 0.28, h * 0.36);
      PT.couple(c, w * 0.5, h * 0.66, h * 0.26, looks);
      // brush jars on the sill
      for (const [x, col] of [[0.18, '#6fb8ff'], [0.84, '#7fd8bf']]) {
        c.fillStyle = col;
        c.fillRect(w * x - 12, h * 0.78, 24, h * 0.14);
        c.strokeStyle = '#9b6a43';
        c.lineWidth = 3;
        for (let k = -1; k <= 1; k++) {
          c.beginPath();
          c.moveTo(w * x + k * 5, h * 0.78);
          c.lineTo(w * x + k * 10, h * 0.6);
          c.stroke();
        }
      }
    } else if (kind === 'studio') {
      lamp(w * 0.3);
      lamp(w * 0.75);
      pic(w * 0.08, h * 0.32, w * 0.22, h * 0.24, '#c7f0e0', '#ff8fb1');
      pic(w * 0.62, h * 0.36, w * 0.26, h * 0.2, '#ffe9a8', '#3f7bf0');
      c.fillStyle = '#ffffff';
      c.fillRect(w * 0.36, h * 0.48, w * 0.22, h * 0.3);
      c.strokeStyle = '#9b6a43';
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(w * 0.4, h);
      c.lineTo(w * 0.47, h * 0.44);
      c.lineTo(w * 0.54, h);
      c.stroke();
      c.fillStyle = '#ffd166';
      c.beginPath();
      c.arc(w * 0.47, h * 0.6, h * 0.06, 0, P * 2);
      c.fill();
    } else {
      lamp(w * 0.5);
      c.fillStyle = '#c7a6ff';
      c.fillRect(w * 0.2, h * 0.5, w * 0.6, h * 0.32);
      c.fillStyle = '#ffffff';
      c.fillRect(w * 0.28, h * 0.42, w * 0.44, h * 0.12);
    }
    // a little glare
    c.fillStyle = 'rgba(255,255,255,0.28)';
    c.beginPath();
    c.moveTo(w * 0.1, 0);
    c.lineTo(w * 0.3, 0);
    c.lineTo(w * 0.05, h);
    c.lineTo(0, h);
    c.lineTo(0, h * 0.3);
    c.fill();
  };
  const northView = (c, w, h) => {
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#cfeaff');
    sky.addColorStop(1, '#fff3dc');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 6;
    for (let x = 0; x <= w; x += w / 6) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
  };

  // ---------------------------------------------------------------- the building
  // Ground floor and upper floor walls (fronts painted on the atlas: paint splashes, a stencilled heart)
  add(at(box(bw, B.h1, bd, WALL1), bcx, B.h1 / 2, bcz));
  add(at(box(bw - 0.1, B.h2 - B.h1, bd - 0.1, WALL2), bcx, (B.h1 + B.h2) / 2, bcz - 0.05));
  const front1 = atlas.panel(bw, B.h1, 1024, 512, (c, w, h) => {
    c.fillStyle = WALL1;
    c.fillRect(0, 0, w, h);
    // soft stucco blotches
    c.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 40; i++) {
      c.beginPath();
      c.ellipse((i * 211) % w, (i * 97) % h, 30 + (i % 5) * 8, 14, 0, 0, P * 2);
      c.fill();
    }
    // a coloured plinth at the bottom
    c.fillStyle = '#ffb37a';
    c.fillRect(0, h * 0.88, w, h * 0.12);
    c.fillStyle = '#ffffff';
    c.fillRect(0, h * 0.875, w, 6);
    // paint splashes low on the wall
    const sp = [['#ef5b6f', 0.07, 0.8], ['#6fb8ff', 0.9, 0.72], ['#7fd36b', 0.96, 0.84], ['#c7a6ff', 0.04, 0.6], ['#ffd166', 0.55, 0.86]];
    for (const [col, x, y] of sp) {
      c.fillStyle = col;
      c.beginPath();
      c.arc(w * x, h * y, 16, 0, P * 2);
      c.fill();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * P * 2;
        c.beginPath();
        c.arc(w * x + Math.cos(a) * 26, h * y + Math.sin(a) * 22, 5 + (k % 3) * 2, 0, P * 2);
        c.fill();
      }
      c.fillRect(w * x - 3, h * y, 6, 36);
    }
    // a tiny R + H in a heart, hidden low by the corner
    c.strokeStyle = '#ef5b6f';
    c.lineWidth = 3;
    PT.heart(c, w * 0.035, h * 0.38, 34);
    c.stroke();
    c.fillStyle = '#c73b45';
    c.font = `600 11px ${M.FONT}`;
    c.textAlign = 'center';
    c.fillText('R+H', w * 0.035, h * 0.39);
  });
  add(at(front1, bcx, B.h1 / 2, F + 0.005));
  const front2 = atlas.panel(bw - 0.1, B.h2 - B.h1, 1024, 460, (c, w, h) => {
    c.fillStyle = WALL2;
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    for (let j = 0; j < 6; j++) for (let i = 0; i < 16; i++) {
      c.beginPath();
      c.arc((i + 0.5 + (j % 2) * 0.5) * (w / 16), (j + 0.5) * (h / 6), 5, 0, P * 2);
      c.fill();
    }
  });
  add(at(front2, bcx, (B.h1 + B.h2) / 2, F - 0.045));
  // Corner pilasters, plinth and the cornice between the floors
  for (const x of [B.x0, B.x1]) add(at(box(0.18, B.h1, 0.18, TRIM), x, B.h1 / 2, F));
  for (const x of [B.x0 + 0.05, B.x1 - 0.05]) add(at(box(0.16, B.h2 - B.h1, 0.16, TRIM), x, (B.h1 + B.h2) / 2, F - 0.05));
  add(at(rbox(bw + 0.3, 0.2, bd + 0.3, TRIM, 0.05), bcx, B.h1 + 0.02, bcz));
  add(at(rbox(bw + 0.24, 0.12, bd + 0.24, TRIM, 0.04), bcx, B.h2 - 0.02, bcz - 0.05));
  // Little paint dabs along the cornice
  M.RAINBOW.forEach((col, i) => {
    for (let k = 0; k < 2; k++) add(at(sph(0.05, col, undefined, 8), B.x0 + 0.35 + (i * 2 + k) * (bw - 0.7) / 13, B.h1 + 0.02, F + 0.16)).scale.z = 0.5;
  });

  // Sawtooth roof: two teeth, each slope rises toward the back and its glass faces north
  const tz = bd / 2;
  const slopeLen = Math.hypot(tz, B.tooth);
  const slopeAng = Math.atan2(B.tooth, tz);
  const roofOver = 0.25;
  const roofTex = (first) => (c, w, h) => {
    c.fillStyle = ROOF;
    c.fillRect(0, 0, w, h);
    // scalloped tiles
    const tw = 32;
    for (let j = 0; j < 10; j++) for (let i = -1; i < w / tw + 1; i++) {
      c.fillStyle = (i + j) % 3 === 0 ? '#a993de' : (i + j) % 3 === 1 ? '#c2b1ee' : '#b39fe6';
      c.beginPath();
      c.arc(i * tw + (j % 2) * tw * 0.5, j * (h / 9), tw * 0.55, 0, P);
      c.fill();
    }
    if (!first) return;
    // paint spilt over the front edge, running down to the drips on the eave
    M.RAINBOW.forEach((col, i) => {
      for (let k = 0; k < 3; k++) {
        const x = ((i * 3 + k + 0.5) / 21) * w;
        const top = h * (0.72 + ((i * 7 + k * 3) % 5) * 0.045);
        c.fillStyle = col;
        c.beginPath();
        c.moveTo(x - 10, h);
        c.lineTo(x - 8, top + 8);
        c.quadraticCurveTo(x, top - 7, x + 8, top + 8);
        c.lineTo(x + 10, h);
        c.fill();
        c.beginPath();
        c.arc(x, top + 5, 9, 0, P * 2);
        c.fill();
      }
    });
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.fillRect(0, h - 10, w, 10);
  };
  for (let t = 0; t < 2; t++) {
    const zf = F - t * tz;
    const zb = zf - tz;
    const slope = atlas.panel(bw + 0.4, slopeLen + (t === 0 ? roofOver : 0.05), 1024, 330, roofTex(t === 0));
    slope.castShadow = true;
    const mid = new THREE.Vector3(bcx, B.h2 + B.tooth / 2, (zf + zb) / 2);
    if (t === 0) mid.add(new THREE.Vector3(0, -Math.sin(slopeAng) * roofOver / 2, Math.cos(slopeAng) * roofOver / 2));
    slope.position.copy(mid);
    slope.rotation.x = -P / 2 + slopeAng;
    add(slope);
    // underside so the slope is solid from behind
    const under = at(box(bw + 0.4, 0.06, slopeLen + (t === 0 ? roofOver : 0.05), '#a28ad4'), mid.x, mid.y, mid.z);
    under.rotation.x = slopeAng;
    under.position.y -= 0.035;
    add(under);
    // north glass and its frame
    const ng = glassPanel(bw - 0.2, B.tooth - 0.12, 512, 80, northView);
    ng.position.set(bcx, B.h2 + B.tooth / 2, zb + 0.02);
    ng.rotation.y = P;
    add(ng);
    add(at(box(bw - 0.1, 0.08, 0.08, TRIM), bcx, B.h2 + B.tooth - 0.02, zb + 0.02));
    // gable triangles at both ends (their faces point out of the building)
    for (const [x, sgn] of [[B.x0 + 0.06, -1], [B.x1 - 0.06, 1]]) {
      const tri = new THREE.Shape();
      tri.moveTo(0, 0);
      tri.lineTo(sgn * tz, 0);
      tri.lineTo(sgn * tz, B.tooth);
      tri.closePath();
      const m = mesh(new THREE.ShapeGeometry(tri), mat(WALL2), { cast: true });
      m.rotation.y = sgn * P / 2;
      m.position.set(x, B.h2, zf);
      add(m);
      add(at(box(0.12, B.tooth, 0.1, TRIM), x, B.h2 + B.tooth / 2, zb + 0.04));
    }
  }
  // Front eave fascia with rainbow drips hanging from it
  const ez = F + Math.cos(slopeAng) * roofOver;
  const ey = B.h2 - Math.sin(slopeAng) * roofOver;
  add(at(rbox(bw + 0.44, 0.16, 0.08, TRIM, 0.03), bcx, ey - 0.02, ez + 0.02));
  // a band of paint over the fascia, one colour per stretch, dripping off in drops of different lengths
  const dripGeo = new THREE.CapsuleGeometry(0.035, 1, 3, 8);
  const dropGeo = new THREE.SphereGeometry(0.05, 10, 8);
  const ew = bw + 0.44;
  const nBand = M.RAINBOW.length;
  for (let i = 0; i < nBand; i++) {
    const col = M.RAINBOW[i];
    const x0 = bcx - ew / 2 + (i * ew) / nBand;
    add(at(rbox(ew / nBand + 0.01, 0.1, 0.1, col, 0.03, { rough: 0.35 }), x0 + ew / nBand / 2, ey + 0.02, ez + 0.03));
    for (let k = 0; k < 3; k++) {
      const x = x0 + ((k + 0.5) / 3) * (ew / nBand) + (r() - 0.5) * 0.08;
      const len = 0.06 + r() * 0.3 + (k === 1 ? 0.12 : 0);
      const d = mesh(dripGeo, mat(col, { rough: 0.35 }), { cast: false });
      d.scale.set(1, len, 1);
      d.position.set(x, ey - 0.03 - len / 2, ez + 0.07);
      add(d);
      add(at(mesh(dropGeo, mat(col, { rough: 0.35 }), { cast: false }), x, ey - 0.05 - len, ez + 0.07));
    }
  }

  // ---------------------------------------------------------------- the door
  const D = DOOR;
  add(at(rbox(D.w + 0.3, D.h + 0.18, 0.1, TRIM, 0.04), D.x, (D.h + 0.18) / 2, F + 0.04));
  add(at(rbox(D.w, D.h, 0.08, COL.teal, 0.04), D.x, D.h / 2, F + 0.08));
  for (const y of [0.45, 1.05]) add(at(rbox(D.w - 0.36, 0.42, 0.03, '#36ab8e', 0.03), D.x, y, F + 0.13));
  const dw = glassPanel(0.42, 0.42, 96, 96, (c, w, h) => {
    roomView('door')(c, w, h);
    c.fillStyle = '#ef5b6f';
    PT.heart(c, w / 2, h / 2 + 4, 52);
    c.fill();
  });
  add(at(dw, D.x, 1.72, F + 0.125));
  add(at(rot(M.tor(0.23, 0.035, TRIM, undefined, P * 2, 6, 20), 0, 0, 0), D.x, 1.72, F + 0.13));
  add(at(sph(0.05, COL.gold, { metal: 0.5, rough: 0.3 }, 10), D.x + D.w / 2 - 0.16, 1.0, F + 0.16));
  // "Open" sign on the door
  const open = atlas.panel(0.46, 0.2, 200, 88, (c, w, h) => {
    c.fillStyle = '#fff7ea';
    M.roundRect(c, 3, 3, w - 6, h - 6, 18);
    c.fill();
    c.lineWidth = 5;
    c.strokeStyle = COL.rose;
    c.stroke();
    c.fillStyle = '#c73b45';
    c.font = `700 ${h * 0.5}px ${M.FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('Open', w / 2, h / 2 + 3);
  });
  add(at(open, D.x, 1.35, F + 0.135));
  // Step
  add(at(rbox(D.w + 0.5, 0.12, 0.42, '#f2e3cf', 0.03), D.x, 0.06, F + 0.21));
  colBox(D.x, F + 0.21, (D.w + 0.5) / 2, 0.21, 0.12);
  // A wall lantern beside the door
  const lantGlass = umat('#fff3c4', { emissive: '#ffcf7a', ei: 0, rough: 0.3 });
  const LX = D.x - D.w / 2 - 0.3;
  add(at(box(0.05, 0.22, 0.12, COL.ink), LX, 2.0, F + 0.06));
  add(at(cyl(0.11, 0.09, 0.04, COL.ink, 8), LX, 2.18, F + 0.2));
  add(at(dyn(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 8), lantGlass, { cast: false })), LX, 2.05, F + 0.2));
  add(at(cyl(0.09, 0.11, 0.04, COL.ink, 8), LX, 1.93, F + 0.2));
  const lantHalo = dyn(add(M.sprite(M.glowTex(), { color: '#ffd27a', opacity: 0, scale: 1.1 })));
  lantHalo.position.set(LX, 2.05, F + 0.3);

  // ---------------------------------------------------------------- shop window with a rainbow awning
  const SW = { x: 2.75, w: 2.5, h: 1.38, y0: 0.66 };
  add(at(rbox(SW.w + 0.22, SW.h + 0.22, 0.1, COL.coral, 0.04), SW.x, SW.y0 + SW.h / 2, F + 0.03));
  add(at(glassPanel(SW.w, SW.h, 512, 328, roomView('shop')), SW.x, SW.y0 + SW.h / 2, F + 0.09));
  for (const k of [-1, 1]) add(at(box(0.05, SW.h, 0.04, TRIM), SW.x + k * SW.w / 6, SW.y0 + SW.h / 2, F + 0.1));
  add(at(rbox(SW.w + 0.4, 0.08, 0.3, TRIM, 0.03), SW.x, SW.y0 - 0.06, F + 0.12));
  // flower box under it
  add(at(rbox(SW.w, 0.24, 0.26, COL.navy, 0.04), SW.x, SW.y0 - 0.25, F + 0.18));
  for (let i = 0; i < 9; i++) {
    const x = SW.x - SW.w / 2 + 0.15 + i * ((SW.w - 0.3) / 8);
    add(at(sph(0.1, i % 2 ? COL.leaf : COL.leafDark, { rough: 0.85 }, 8), x, SW.y0 - 0.07, F + 0.2));
    add(at(sph(0.05, [COL.pink, COL.sun, COL.white, COL.rose][i % 4], undefined, 6), x + 0.03, SW.y0 + 0.02, F + 0.28));
  }
  // rainbow awning (stripes with a scalloped edge)
  const awnTex = M.canvasTexture(512, 160, (c, w, h) => {
    const n = 14;
    for (let i = 0; i < n; i++) {
      c.fillStyle = i % 2 ? '#ffffff' : M.RAINBOW[(i / 2) % M.RAINBOW.length];
      c.fillRect((i * w) / n, 0, w / n + 1, h);
    }
    const rr = w / (n * 2);
    c.globalCompositeOperation = 'destination-in';
    c.fillStyle = '#000';
    c.beginPath();
    c.rect(0, 0, w, h - rr);
    for (let i = 0; i < n; i++) {
      c.moveTo(((i + 0.5) * w) / n + rr, h - rr);
      c.arc(((i + 0.5) * w) / n, h - rr, rr, 0, P);
    }
    c.fill();
  });
  const awn = mesh(new THREE.PlaneGeometry(SW.w + 0.5, 0.75), new THREE.MeshStandardMaterial({ map: awnTex, roughness: 0.8, alphaTest: 0.5, side: THREE.DoubleSide }), { cast: true });
  awn.position.set(SW.x, SW.y0 + SW.h + 0.3, F + 0.32);
  awn.rotation.x = -0.95;
  add(awn);
  for (const k of [-1, 1]) add(at(rot(cyl(0.015, 0.015, 0.62, COL.ink, 5), 0.6, 0, 0), SW.x + k * (SW.w / 2 + 0.22), SW.y0 + SW.h + 0.31, F + 0.3));

  // ---------------------------------------------------------------- upper floor: balcony door, balcony, studio window
  const BAL = { x: 0.1, w: 2.6, d: 0.9 };
  const upY = B.h1 + 0.12;
  // French door
  add(at(rbox(1.24, 1.74, 0.08, COL.sky, 0.03), BAL.x, upY + 0.87, F + 0.0));
  add(at(glassPanel(1.06, 1.58, 256, 380, roomView('studio')), BAL.x, upY + 0.87, F + 0.045));
  add(at(box(0.05, 1.58, 0.04, COL.sky), BAL.x, upY + 0.87, F + 0.06));
  for (const y of [0.55, 1.08]) add(at(box(1.06, 0.04, 0.04, COL.sky), BAL.x, upY + 0.08 + y, F + 0.06));
  // Balcony slab, brackets, railing, flower boxes
  const bz = F + BAL.d / 2;
  add(at(rbox(BAL.w, 0.14, BAL.d, TRIM, 0.04), BAL.x, B.h1 + 0.05, bz));
  add(at(box(BAL.w - 0.08, 0.01, BAL.d - 0.08, '#f2c6a0'), BAL.x, B.h1 + 0.125, bz));
  for (const k of [-1, 0, 1]) {
    const br = new THREE.Shape();
    br.moveTo(0, 0);
    br.lineTo(BAL.d - 0.1, 0);
    br.quadraticCurveTo(0.15, -0.1, 0, -0.55);
    br.closePath();
    const m = mesh(new THREE.ExtrudeGeometry(br, { depth: 0.08, bevelEnabled: false, curveSegments: 6 }), mat(TRIM));
    m.rotation.y = -P / 2;
    m.position.set(BAL.x + k * (BAL.w / 2 - 0.25) - 0.04, B.h1 - 0.02, F);
    add(m);
  }
  const railY = B.h1 + 0.12;
  add(at(rbox(BAL.w, 0.06, 0.07, COL.rose, 0.025), BAL.x, railY + 0.86, F + BAL.d - 0.04));
  for (const s of [-1, 1]) add(at(rbox(0.07, 0.06, BAL.d, COL.rose, 0.025), BAL.x + s * (BAL.w / 2 - 0.035), railY + 0.86, bz));
  for (let i = 0; i <= 12; i++) add(at(cyl(0.018, 0.018, 0.84, TRIM, 6), BAL.x - BAL.w / 2 + 0.05 + i * ((BAL.w - 0.1) / 12), railY + 0.43, F + BAL.d - 0.04));
  for (const s of [-1, 1]) for (let i = 1; i <= 3; i++) add(at(cyl(0.018, 0.018, 0.84, TRIM, 6), BAL.x + s * (BAL.w / 2 - 0.035), railY + 0.43, F + i * (BAL.d / 4)));
  for (const s of [-1, 1]) {
    const fx = BAL.x + s * 0.65;
    add(at(rbox(0.95, 0.2, 0.2, COL.sun, 0.04), fx, railY + 0.72, F + BAL.d + 0.07));
    for (let i = 0; i < 5; i++) {
      add(at(sph(0.08, i % 2 ? COL.leaf : COL.leafDark, { rough: 0.85 }, 8), fx - 0.36 + i * 0.18, railY + 0.86, F + BAL.d + 0.09));
      add(at(sph(0.045, [COL.rose, COL.white, COL.pink, COL.lilac, COL.sun][i], undefined, 6), fx - 0.33 + i * 0.18, railY + 0.95, F + BAL.d + 0.14));
    }
    // a little trailing ivy
    for (let k = 0; k < 4; k++) add(at(sph(0.04, COL.leafDark, { rough: 0.85 }, 6), fx - 0.3 + k * 0.2, railY + 0.6 - (k % 2) * 0.1, F + BAL.d + 0.17));
  }
  // On the balcony: a small easel, a cushion with a sleeping cat, a watering can
  const balEasel = M.makeEasel({ w: 0.5, h: 0.4, cy: 0.75 });
  const balPic = atlas.panel(0.46, 0.36, 160, 128, (c, w, h) => PT.sunflowers(c, w, h));
  balPic.position.set(0, 0.75, 0.055);
  balPic.rotation.x = -0.09;
  balEasel.root.add(balPic);
  balEasel.root.position.set(BAL.x - 0.85, railY, F + 0.42);
  balEasel.root.rotation.y = 0.35;
  add(balEasel.root);
  // a little bistro chair on the balcony
  add(at(cyl(0.17, 0.17, 0.05, COL.rose, 12), BAL.x + 0.55, railY + 0.45, F + 0.4));
  for (const [dx, dz] of [[-0.1, -0.1], [0.1, -0.1], [-0.1, 0.1], [0.1, 0.1]]) add(at(cyl(0.012, 0.012, 0.44, COL.ink, 5), BAL.x + 0.55 + dx, railY + 0.22, F + 0.4 + dz));
  add(at(M.tor(0.13, 0.02, COL.rose, undefined, P, 6, 12), BAL.x + 0.55, railY + 0.62, F + 0.26));
  // the studio cat asleep in the sun on a cushion by the shop window
  add(at(rbox(0.56, 0.08, 0.44, COL.mint, 0.04), 1.75, 0.04, F + 0.62));
  const cat = M.makeCat();
  cat.root.position.set(1.75, 0.08, F + 0.62);
  cat.root.rotation.y = 0.35;
  add(cat.root);
  colCirc(1.75, F + 0.62, 0.3, 0.3);
  dyn(cat.tail);
  dyn(cat.body);
  add(at(cyl(0.08, 0.1, 0.16, COL.sky, 10), BAL.x + 1.05, railY + 0.08, F + 0.3));
  add(at(rot(cyl(0.015, 0.02, 0.2, COL.sky, 5), 0, 0, -1.0), BAL.x + 1.16, railY + 0.16, F + 0.3));
  // A big studio window on the east side of the upper floor
  const UW = { z: (B.z0 + B.z1) / 2, w: 2.2, h: 1.5 };
  const uwy = upY + 0.12 + UW.h / 2;
  const sideWin = new THREE.Group();
  sideWin.add(at(rbox(UW.w + 0.2, UW.h + 0.2, 0.08, COL.mint, 0.03), 0, 0, 0));
  sideWin.add(at(glassPanel(UW.w, UW.h, 420, 300, roomView('studio')), 0, 0, 0.05));
  for (let i = 1; i < 3; i++) {
    sideWin.add(at(box(0.04, UW.h, 0.04, COL.mint), -UW.w / 2 + (i * UW.w) / 3, 0, 0.07));
    sideWin.add(at(box(UW.w, 0.04, 0.04, COL.mint), 0, -UW.h / 2 + (i * UW.h) / 3, 0.07));
  }
  sideWin.add(at(rbox(UW.w + 0.36, 0.07, 0.22, TRIM, 0.03), 0, -UW.h / 2 - 0.08, 0.1));
  sideWin.position.set(B.x1 - 0.02, uwy, UW.z);
  sideWin.rotation.y = P / 2;
  add(sideWin);

  // ---------------------------------------------------------------- palette sign on the upper floor
  const pal = new THREE.Shape();
  pal.moveTo(-1.15, 0.05);
  pal.bezierCurveTo(-1.2, 0.62, -0.4, 0.78, 0.25, 0.7);
  pal.bezierCurveTo(0.95, 0.62, 1.25, 0.3, 1.15, -0.1);
  pal.bezierCurveTo(1.05, -0.5, 0.55, -0.62, 0.15, -0.5);
  pal.bezierCurveTo(-0.2, -0.38, -0.05, -0.18, -0.35, -0.16);
  pal.bezierCurveTo(-0.62, -0.14, -0.62, -0.42, -0.9, -0.38);
  pal.bezierCurveTo(-1.12, -0.34, -1.12, -0.16, -1.15, 0.05);
  const thumb = new THREE.Path();
  thumb.absellipse(-0.72, 0.05, 0.13, 0.11, 0, P * 2, true);
  pal.holes.push(thumb);
  const palGeo = new THREE.ExtrudeGeometry(pal, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 14 });
  const palette = new THREE.Group();
  palette.add(mesh(palGeo, mat('#e9b980')));
  [[COL.red, -0.45, 0.45], [COL.sun, -0.05, 0.55], [COL.teal, 0.4, 0.5], [COL.navy, 0.8, 0.25], [COL.pink, 0.85, -0.15], [COL.purple, 0.5, -0.35]].forEach(([c, x, y]) => {
    const b = at(sph(0.11, c, { rough: 0.3 }, 10), x, y, 0.12);
    b.scale.z = 0.4;
    palette.add(b);
  });
  const palText = atlas.panel(1.3, 0.42, 512, 166, (c, w, h) => {
    c.fillStyle = '#e9b980';
    c.fillRect(0, 0, w, h);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#c73b45';
    c.font = `600 ${h * 0.26}px ${M.FONT}`;
    c.fillText('The Little', w / 2, h * 0.26);
    c.fillStyle = '#4a3423';
    c.font = `700 ${h * 0.44}px ${M.FONT}`;
    c.fillText('Art Studio', w / 2, h * 0.68);
  });
  palText.position.set(0.12, 0.02, 0.122);
  palette.add(palText);
  // a big brush across the palette
  const brush = new THREE.Group();
  brush.add(at(rot(cyl(0.035, 0.05, 1.5, COL.rose, 10), 0, 0, P / 2), 0, 0, 0));
  brush.add(at(rot(cyl(0.055, 0.05, 0.16, mat(COL.steel, { metal: 0.6, rough: 0.3 }), 10), 0, 0, P / 2), 0.83, 0, 0));
  const tip = at(sph(0.07, COL.navy, undefined, 10), 1.0, 0, 0);
  tip.scale.set(2.0, 0.8, 0.8);
  brush.add(tip);
  brush.position.set(0.15, -0.42, 0.2);
  brush.rotation.z = 0.32;
  palette.add(brush);
  palette.position.set(3.05, (B.h1 + B.h2) / 2 + 0.05, F + 0.12);
  palette.rotation.set(-0.06, 0, 0.04);
  palette.scale.setScalar(1.05);
  add(palette);
  for (const k of [-0.7, 0.7]) add(at(box(0.08, 0.08, 0.14, COL.woodDark), 3.05 + k, (B.h1 + B.h2) / 2 + 0.05, F + 0.06));
  // two little gooseneck lamps that light the sign after dark
  const signLamps = [];
  for (const k of [-0.55, 0.55]) {
    const lx = 3.05 + k;
    const ly = B.h2 - 0.12;
    add(at(box(0.1, 0.06, 0.1, COL.ink), lx, ly, F + 0.03));
    const arm = at(rot(cyl(0.015, 0.015, 0.42, COL.ink, 5), 1.1, 0, 0), lx, ly - 0.05, F + 0.2);
    add(arm);
    add(at(rot(cyl(0.05, 0.1, 0.12, COL.ink, 10), 2.4, 0, 0), lx, ly - 0.17, F + 0.4));
    const bulb = mesh(new THREE.SphereGeometry(0.045, 8, 6), lantGlass, { cast: false });
    add(dyn(at(bulb, lx, ly - 0.22, F + 0.45)));
    const halo = M.sprite(M.glowTex(), { color: '#ffe2a0', opacity: 0, scale: 0.9 });
    halo.position.set(lx, ly - 0.5, F + 0.42);
    add(dyn(halo));
    signLamps.push(halo);
  }

  // ---------------------------------------------------------------- the giant pencil, wound with fairy lights
  const PX = -2.3;
  const PZ = -1.55;
  const PR = 0.38;
  const pencil = new THREE.Group();
  let y = 0;
  const seg = (h, make) => {
    const o = make();
    o.position.y = y + h / 2;
    pencil.add(o);
    y += h;
  };
  seg(0.45, () => cyl(PR, PR, 0.45, '#ff9ab5', 16));
  seg(0.34, () => cyl(PR + 0.02, PR + 0.02, 0.34, mat('#cfd6df', { metal: 0.6, rough: 0.35 }), 16));
  for (const k of [0.52, 0.66]) pencil.add(at(rot(M.tor(PR + 0.02, 0.018, mat('#aeb7c4', { metal: 0.6, rough: 0.35 }), undefined, P * 2, 4, 20), P / 2, 0, 0), 0, k, 0));
  const shaftH = 3.0;
  seg(shaftH, () => cyl(PR, PR, shaftH, '#ffcf3f', 6));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * P * 2 + P / 6;
    pencil.add(at(box(0.03, shaftH, 0.01, '#f2b72a'), Math.cos(a) * PR * 0.87, 0.79 + shaftH / 2, Math.sin(a) * PR * 0.87)).rotation.y = -a + P / 2;
  }
  seg(0.85, () => cyl(0.1, PR, 0.85, '#f3d2a2', 6));
  seg(0.3, () => cyl(0.0, 0.1, 0.3, '#3a3a46', 6));
  pencil.position.set(PX, 0, PZ);
  pencil.rotation.z = -0.05;
  add(pencil);
  colCirc(PX, PZ, PR + 0.08);
  colBox((PX + B.x0) / 2, PZ, (B.x0 - PX) / 2, 0.3); // no squeezing between the pencil and the wall
  // pencil writing on the ground at its foot, a little wavy line
  // fairy lights spiralling up the shaft
  const spiral = [];
  for (let i = 0; i <= 46; i++) {
    const k = i / 46;
    const a = k * P * 2 * 3.3;
    spiral.push(new THREE.Vector3(PX + Math.cos(a) * (PR + 0.04) - (0.9 + k * shaftH) * 0.05, 0.9 + k * shaftH, PZ + Math.sin(a) * (PR + 0.04)));
  }

  // ---------------------------------------------------------------- forecourt, chalk heart and stepping stones
  // The paving in front of the door, with a chalk heart, R + H, a sun and stars drawn on it
  const pave = atlas.panel(3.1, 3.0, 512, 496, (c, w, h) => {
    c.fillStyle = '#d9cdbf';
    c.fillRect(0, 0, w, h);
    const n = 6;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      c.fillStyle = ['#f4ece2', '#efe4d6', '#f7f0e8'][(i * 3 + j) % 3];
      M.roundRect(c, i * (w / n) + 3 + (j % 2) * 6, j * (h / n) + 3, w / n - 6, h / n - 6, 8);
      c.fill();
    }
    // chalk, centred under the heart spot (local x 0.1, z 1.45)
    const cx = ((0.1 + 1.4) / 3.1) * w;
    const cy = ((1.45 + 0.5) / 3.0) * h;
    const S = (1.6 / 3.0) * h;
    const chalkLine = (col, wdt) => {
      c.strokeStyle = col;
      c.lineWidth = wdt;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.globalAlpha = 0.85;
    };
    chalkLine('#ff7fa3', 9);
    PT.heart(c, cx, cy + S * 0.04, S * 0.78);
    c.stroke();
    chalkLine('#ffffff', 4);
    PT.heart(c, cx, cy + S * 0.04, S * 0.64);
    c.stroke();
    c.globalAlpha = 0.92;
    c.fillStyle = '#ef5b6f';
    c.font = `700 ${Math.round(S * 0.2)}px ${M.FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('R + H', cx, cy);
    chalkLine('#ffd166', 5);
    const sx = cx - S * 0.62;
    const sy = cy - S * 0.36;
    c.beginPath();
    c.arc(sx, sy, S * 0.07, 0, P * 2);
    c.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * P * 2;
      c.beginPath();
      c.moveTo(sx + Math.cos(a) * S * 0.1, sy + Math.sin(a) * S * 0.1);
      c.lineTo(sx + Math.cos(a) * S * 0.14, sy + Math.sin(a) * S * 0.14);
      c.stroke();
    }
    for (const [x, y, col] of [[0.6, -0.35, '#6fb8ff'], [0.66, 0.3, '#c7a6ff'], [-0.6, 0.32, '#7fd36b']]) {
      chalkLine(col, 4);
      PT.star(c, cx + x * S, cy + y * S, S * 0.06);
      c.stroke();
    }
    c.globalAlpha = 1;
  });
  pave.rotation.x = -P / 2;
  pave.position.set(0.15, 0.012, 1.0);
  pave.receiveShadow = true;
  add(pave);
  for (const [x, z, c, a] of [[1.25, 2.3, '#ff7fa3', 0.4], [1.38, 2.22, '#ffd166', -0.3], [1.32, 2.4, '#6fb8ff', 1.2]]) add(at(rot(cyl(0.025, 0.025, 0.11, c, 6), 0, a, P / 2), x, 0.04, z));
  for (const [x, z] of [[0.05, 2.95], [-0.1, 3.45]]) add(at(cyl(0.34, 0.36, 0.03, '#efe4d6', 14), x, 0.015, z));
  // pots either side of the door, and by the pencil
  const pot = (x, z, s, potC, fl) => {
    add(at(M.makeFlowerPot(s, potC, fl, r), x, 0, z));
    colCirc(x, z, s * 0.27, s * 0.45);
  };
  pot(-0.95, F + 0.38, 0.75, COL.rose, [COL.sun, COL.white, COL.pink]);
  pot(1.05, F + 0.45, 0.6, COL.sun, [COL.rose, COL.lilac, COL.white]);
  pot(-2.95, -0.6, 0.7, COL.lilac, [COL.pink, COL.sun, COL.white]);
  pot(-1.75, -0.25, 0.5, COL.mint, [COL.rose, COL.white]);
  // A chalkboard by the door
  const cb = new THREE.Group();
  const board = atlas.panel(0.62, 0.74, 200, 240, (c, w, h) => {
    c.fillStyle = '#3f5a52';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#c98f5f';
    c.lineWidth = 14;
    c.strokeRect(0, 0, w, h);
    c.fillStyle = '#ffe3a6';
    c.textAlign = 'center';
    c.font = `700 30px ${M.FONT}`;
    c.fillText('Come in', w / 2, 52);
    c.fillText('and paint', w / 2, 88);
    c.fillStyle = '#ffffff';
    c.font = `500 20px ${M.FONT}`;
    c.fillText('Easels, murals', w / 2, 130);
    c.fillText('and a gallery', w / 2, 156);
    c.fillStyle = '#ff8fb1';
    PT.heart(c, w / 2, 200, 36);
    c.fill();
  });
  board.position.set(0, 0.5, 0.06);
  board.rotation.x = -0.2;
  cb.add(board);
  cb.add(at(rot(box(0.68, 0.8, 0.04, '#c98f5f'), -0.2, 0, 0), 0, 0.5, 0.03));
  cb.add(at(rot(box(0.6, 0.8, 0.03, '#c98f5f'), 0.25, 0, 0), 0, 0.48, -0.18));
  cb.position.set(-1.6, 0, 0.95);
  cb.rotation.y = 0.35;
  add(cb);
  colBox(-1.6, 0.9, 0.35, 0.22, 0.9);

  // ---------------------------------------------------------------- the painting yard (east)
  // Easel with a painting in progress and a painter at work
  const work = new PT.Reveal(256, 200, { dab: 0.12, cols: 7, rows: 5 });
  work.set((c, w, h) => PT.landscape(c, w, h));
  work.play(26);
  const workMat = new THREE.MeshStandardMaterial({ map: work.tex, roughness: 0.8 });
  const EA = { x: 6.0, z: -1.3, yaw: -0.55 };
  const e1 = M.makeEasel({ w: 1.0, h: 0.78, cy: 1.3, material: workMat });
  e1.root.position.set(EA.x, 0, EA.z);
  e1.root.rotation.y = EA.yaw;
  add(e1.root);
  dyn(e1.canvas);
  colCirc(EA.x, EA.z - 0.1, 0.5);
  const n1 = new THREE.Vector3(Math.sin(EA.yaw), 0, Math.cos(EA.yaw));
  const t1 = new THREE.Vector3(Math.cos(EA.yaw), 0, -Math.sin(EA.yaw));
  const painterPos = new THREE.Vector3(EA.x, 0, EA.z).addScaledVector(n1, 0.72).addScaledVector(t1, 0.5);
  const painter = new Kid({ id: 'painter', name: 'Painter', gender: 'boy', skin: '#e3b08e', hair: '#e8e2da', hairstyle: 'bald', mustache: '#e8e2da', beard: '#e8e2da', outfit: 'tee-pants', top: '#ffffff', bottom: '#3b4a6b', shoes: '#3b2b3f', accent: COL.rose });
  freeze(painter, { pose: 'stand', hands: 'hold' });
  const beret = at(sph(0.2, '#c73b45', undefined, 14), 0.05, 0.56, -0.02);
  beret.scale.set(1.15, 0.38, 1.1);
  beret.rotation.z = 0.35;
  painter.head.add(beret);
  painter.head.add(at(sph(0.03, '#c73b45', undefined, 6), 0.02, 0.66, 0));
  painter.body.add(at(rbox(0.36, 0.42, 0.05, '#e9dcc6', 0.03), 0, 0.5, 0.215));
  [[COL.rose, -0.08, 0.6], [COL.navy, 0.1, 0.45], [COL.sun, -0.04, 0.38]].forEach(([c, x, yy]) => painter.body.add(at(sph(0.025, c, undefined, 6), x, yy, 0.245)));
  const arm = painter.arms[1];
  const brushP = new THREE.Group();
  brushP.add(at(cyl(0.012, 0.012, 0.3, COL.woodDark, 5), 0, 0, 0.12));
  brushP.children[0].rotation.x = P / 2;
  brushP.add(at(sph(0.022, COL.sun, undefined, 6), 0, 0, 0.28));
  brushP.position.set(0, -0.3, 0.02);
  arm.add(brushP);
  M.bake(arm);
  dyn(arm);
  const palP = M.makePalette(1.1);
  palP.rotation.set(-1.3, 0, 0.2);
  palP.position.set(0, -0.28, 0.05);
  painter.arms[0].add(palP);
  painter.root.scale.setScalar(1.16);
  painter.root.position.copy(painterPos);
  painter.root.rotation.y = Math.atan2(EA.x - painterPos.x, EA.z - painterPos.z) + 0.25;
  add(painter.root);
  colCirc(painterPos.x, painterPos.z, 0.32);
  // second easel: sunflowers, half done, a stool with a palette
  const EB = { x: 7.4, z: -2.7, yaw: -0.35 };
  const sunTex = new PT.Reveal(256, 200, { dab: 0.13, cols: 7, rows: 5 });
  sunTex.set((c, w, h) => PT.sunflowers(c, w, h));
  sunTex.progress = sunTex.total * 0.55;
  sunTex.speed = 1;
  for (let i = 0; i < 60; i++) sunTex.update(1 / 60);
  sunTex.speed = 0;
  const e2 = M.makeEasel({ w: 0.9, h: 0.7, cy: 1.2, material: new THREE.MeshStandardMaterial({ map: sunTex.tex, roughness: 0.8 }) });
  e2.root.position.set(EB.x, 0, EB.z);
  e2.root.rotation.y = EB.yaw;
  add(e2.root);
  colCirc(EB.x, EB.z - 0.1, 0.45);
  const s2 = M.makeStool(COL.mint);
  s2.position.set(EB.x + 0.3, 0, EB.z + 0.75);
  add(s2);
  const pal2 = M.makePalette(1);
  pal2.position.set(EB.x + 0.3, 0.47, EB.z + 0.75);
  pal2.rotation.y = 0.6;
  add(pal2);
  colCirc(EB.x + 0.3, EB.z + 0.75, 0.24, 0.47);
  // a little girl at a small easel with a crayon drawing
  const EC = { x: 5.0, z: 1.25, yaw: -0.25 };
  const e3 = M.makeEasel({ w: 0.62, h: 0.48, cy: 0.78, wood: COL.rose });
  const kidPic = atlas.panel(0.58, 0.44, 200, 152, (c, w, h) => PT.crayonHouse(c, w, h, looks));
  kidPic.position.set(0, 0.78, 0.055);
  kidPic.rotation.x = -0.09;
  e3.root.add(kidPic);
  e3.root.position.set(EC.x, 0, EC.z);
  e3.root.rotation.y = EC.yaw;
  add(e3.root);
  colCirc(EC.x, EC.z - 0.05, 0.38);
  const girl = new Kid({ id: 'little-artist', name: 'Little artist', gender: 'girl', skin: '#c98f68', hair: '#2a1a13', hairstyle: 'buns', outfit: 'overalls', top: '#ffd166', bottom: '#6fb8ff', shoes: '#e5484d', accent: '#ff8fb1' });
  freeze(girl, { pose: 'sit', hands: 'hold' });
  const gs = M.makeStool(COL.sun, 0.3);
  const gp = new THREE.Vector3(EC.x, 0, EC.z).addScaledVector(new THREE.Vector3(Math.sin(EC.yaw), 0, Math.cos(EC.yaw)), 0.62).addScaledVector(new THREE.Vector3(Math.cos(EC.yaw), 0, -Math.sin(EC.yaw)), 0.32);
  gs.position.copy(gp);
  add(gs);
  girl.root.scale.setScalar(0.72);
  girl.root.position.set(gp.x, 0.3 - 0.18 * 0.72, gp.z);
  girl.root.rotation.y = EC.yaw + P - 0.2;
  // a sun hat
  const hat = new THREE.Group();
  hat.add(at(cyl(0.42, 0.42, 0.03, '#fff1c9', 18), 0, 0, 0));
  hat.add(at(cyl(0.22, 0.25, 0.16, '#fff1c9', 16), 0, 0.08, 0));
  hat.add(at(cyl(0.255, 0.255, 0.05, COL.pink, 16), 0, 0.04, 0));
  hat.position.set(0, 0.55, 0);
  hat.rotation.x = 0.12;
  girl.head.add(hat);
  add(girl.root);
  colCirc(gp.x, gp.z, 0.3);
  // crayons scattered by her stool
  M.RAINBOW.slice(0, 5).forEach((c, i) => add(at(rot(cyl(0.018, 0.018, 0.1, c, 6), 0, i * 1.3, P / 2), gp.x + 0.25 + (i % 3) * 0.07, 0.02, gp.z + 0.2 + (i >> 1) * 0.06)));
  // a paint table with pots, rags and a brush jar
  const TB = { x: 7.45, z: 0.55 };
  add(at(rbox(1.1, 0.06, 0.62, '#f7efe6', 0.02), TB.x, 0.74, TB.z));
  for (const [dx, dz] of [[-0.48, -0.25], [0.48, -0.25], [-0.48, 0.25], [0.48, 0.25]]) add(at(box(0.05, 0.72, 0.05, COL.woodDark), TB.x + dx, 0.36, TB.z + dz));
  add(at(box(1.0, 0.03, 0.55, COL.woodDark), TB.x, 0.2, TB.z));
  colBox(TB.x, TB.z, 0.56, 0.32, 0.78);
  [COL.red, COL.sun, COL.navy, COL.teal].forEach((c, i) => add(at(M.makePaintPot(c, 0.9), TB.x - 0.4 + i * 0.18, 0.77, TB.z - 0.12 + (i % 2) * 0.1)));
  add(at(M.makeBrushJar(1), TB.x + 0.38, 0.77, TB.z + 0.05));
  add(at(rbox(0.22, 0.03, 0.18, COL.pink, 0.01), TB.x + 0.1, 0.785, TB.z + 0.16)).rotation.y = 0.4;
  for (let i = 0; i < 3; i++) add(at(M.makePaintPot(['#ffffff', COL.lilac, COL.orange][i], 0.85), TB.x - 0.3 + i * 0.22, 0.215, TB.z));
  // big paint splats on the grass around the yard
  [[5.6, 0.2, COL.pink, 0.32], [6.8, -0.4, COL.sun, 0.24], [7.9, -1.6, COL.blue, 0.28], [4.9, -2.6, COL.mint, 0.3], [6.4, 1.8, COL.lilac, 0.26]].forEach(([x, z, c, s]) => {
    const sp = mesh(new THREE.CircleGeometry(s, 10), mat(c, { rough: 0.5 }), { cast: false });
    sp.rotation.x = -P / 2;
    sp.position.set(x, 0.02, z);
    add(sp);
    for (let k = 0; k < 4; k++) {
      const a = k * 1.7 + x;
      const d2 = mesh(new THREE.CircleGeometry(s * 0.22, 8), mat(c, { rough: 0.5 }), { cast: false });
      d2.rotation.x = -P / 2;
      d2.position.set(x + Math.cos(a) * s * 1.5, 0.021, z + Math.sin(a) * s * 1.3);
      add(d2);
    }
  });
  pot(7.75, 2.05, 0.65, COL.navy, [COL.sun, COL.white, COL.pink]);
  pot(4.85, -0.25, 0.55, COL.coral, [COL.lilac, COL.white]);
  pot(6.35, -3.6, 0.6, COL.rose, [COL.white, COL.sun]);
  // poles for the drawing line and the yard's fairy lights
  const poles = [[4.95, -3.5], [7.8, -3.5], [7.8, 1.3]];
  for (const [x, z] of poles) {
    add(at(cyl(0.06, 0.07, 2.6, COL.woodDark, 8), x, 1.3, z));
    add(at(sph(0.09, COL.sun, undefined, 10), x, 2.65, z));
    colCirc(x, z, 0.12);
  }
  // Drawings pegged on a line, fluttering (one mesh, its quads moved each frame)
  const lineA = new THREE.Vector3(4.95, 2.3, -3.5);
  const lineB = new THREE.Vector3(7.8, 2.3, -3.5);
  add(M.wire([lineA, new THREE.Vector3((lineA.x + lineB.x) / 2, 2.22, -3.5), lineB], '#ffffff', 0.008));
  const lineA2 = new THREE.Vector3(7.8, 2.5, 1.3);
  const lineB2 = new THREE.Vector3(7.8, 2.5, -3.5);
  const sheets = [];
  const sheetW = 0.32;
  const sheetH = 0.4;
  const drawSheet = (i) => (c, w, h) => {
    PT.paper(c, w, h, '#ffffff');
    const kind = i % 5;
    if (kind === 0) {
      c.fillStyle = '#ef5b6f';
      PT.heart(c, w / 2, h / 2, w * 0.7);
      c.fill();
    } else if (kind === 1) PT.chibi(c, w / 2, h * 0.92, h * 0.8, PT.lookOf(looks, 'roji'));
    else if (kind === 2) {
      c.fillStyle = '#ffd166';
      c.beginPath();
      c.arc(w / 2, h * 0.4, w * 0.25, 0, P * 2);
      c.fill();
      c.fillStyle = '#7fd36b';
      c.fillRect(0, h * 0.75, w, h * 0.25);
    } else if (kind === 3) PT.chibi(c, w / 2, h * 0.92, h * 0.8, PT.lookOf(looks, 'homama'));
    else {
      c.strokeStyle = '#6fb8ff';
      c.lineWidth = 6;
      for (let k = 0; k < 4; k++) {
        c.beginPath();
        c.arc(w / 2, h * 0.7, 20 + k * 12, P, 0);
        c.strokeStyle = M.RAINBOW[k];
        c.stroke();
      }
    }
  };
  const sheetGeo = [];
  for (let i = 0; i < 5; i++) {
    const k = (i + 0.6) / 5.4;
    const top = new THREE.Vector3().lerpVectors(lineA, lineB, k);
    top.y -= Math.sin(k * P) * 0.08;
    const pl = new THREE.PlaneGeometry(sheetW, sheetH);
    atlas.cell(128, 160, drawSheet(i), pl);
    pl.translate(0, -sheetH / 2, 0.012);
    sheetGeo.push(pl);
    sheets.push({ top, ph: i * 1.3 });
    add(at(box(0.03, 0.06, 0.02, [COL.rose, COL.sun, COL.teal][i % 3]), top.x, top.y - 0.02, top.z + 0.02));
  }
  const sheetMesh = mesh(M.mergeGeometries(sheetGeo, false), atlas.material, { cast: false });
  const sheetBase = sheetMesh.geometry.attributes.position.array.slice();
  const sheetTops = [];
  for (let i = 0; i < 5; i++) for (let v = 0; v < 4; v++) sheetTops.push(sheets[i].top);
  sheetMesh.frustumCulled = false;
  add(dyn(sheetMesh));

  // ---------------------------------------------------------------- fairy lights (pencil spiral, eave, yard)
  const eave = M.fairyPoints(new THREE.Vector3(B.x0 - 0.15, ey - 0.12, ez + 0.14), new THREE.Vector3(B.x1 + 0.15, ey - 0.12, ez + 0.14), 24, 0.0);
  const yard = M.fairyPoints(new THREE.Vector3(B.x1 + 0.08, B.h1 + 0.05, F - 0.05), new THREE.Vector3(7.8, 2.55, 1.3), 14, 0.35);
  const yard2 = M.fairyPoints(lineA2, lineB2, 16, 0.4);
  add(M.wire(spiral, '#5a4638', 0.007));
  add(M.wire(yard, '#5a4638', 0.007));
  add(M.wire(yard2, '#5a4638', 0.007));
  const bulbWarm = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: new THREE.Color('#ffd27a'), emissiveIntensity: 0, roughness: 0.4 });
  const bulbPink = new THREE.MeshStandardMaterial({ color: '#ffd6e2', emissive: new THREE.Color('#ff8fb1'), emissiveIntensity: 0, roughness: 0.4 });
  const bulbSky = new THREE.MeshStandardMaterial({ color: '#d9f0ff', emissive: new THREE.Color('#8fd3ff'), emissiveIntensity: 0, roughness: 0.4 });
  const lights = M.bulbs([...spiral, ...eave, ...yard, ...yard2], [bulbWarm, bulbPink, bulbSky], 0.045);
  for (const l of lights) add(dyn(l));
  // soft halos on a few bulbs at night (one sprite each, kept small)
  const halos = [];
  [...yard.filter((_, i) => i % 4 === 2), ...yard2.filter((_, i) => i % 5 === 2), ...spiral.filter((_, i) => i % 12 === 6)].forEach((p, i) => {
    const s = M.sprite(M.glowTex(), { color: ['#ffd27a', '#ff9ec0', '#9fd8ff'][i % 3], opacity: 0, scale: 0.55 });
    s.position.copy(p);
    halos.push(s);
    add(dyn(s));
  });

  // ---------------------------------------------------------------- butterflies (one instanced mesh, two wings each)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.bezierCurveTo(0.03, 0.09, 0.12, 0.08, 0.11, 0.0);
  wingShape.bezierCurveTo(0.12, -0.06, 0.04, -0.07, 0, 0);
  const wingGeo = new THREE.ShapeGeometry(wingShape, 5);
  wingGeo.rotateX(-P / 2);
  const flies = [
    { c: new THREE.Vector3(-1.0, 0.9, 0.3), r: 0.55, s: 1.1, col: '#ff8fb1' },
    { c: new THREE.Vector3(2.75, 0.85, 0.15), r: 0.7, s: 0.9, col: '#ffd166' },
    { c: new THREE.Vector3(7.4, 1.0, 1.9), r: 0.6, s: 1.2, col: '#c7a6ff' },
  ];
  const wings = new THREE.InstancedMesh(wingGeo, new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide }), flies.length * 2);
  wings.castShadow = false;
  const colr = new THREE.Color();
  flies.forEach((f, i) => {
    colr.set(f.col);
    wings.setColorAt(i * 2, colr);
    wings.setColorAt(i * 2 + 1, colr);
  });
  wings.frustumCulled = false;
  add(dyn(wings));
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const mirror = new THREE.Matrix4().makeScale(-1, 1, 1);

  // ---------------------------------------------------------------- colliders
  colBox(bcx, bcz, bw / 2 + 0.06, bd / 2 + 0.02);

  // Plain-coloured statics become a few vertex-coloured meshes (the station merges the rest per material)
  M.colorBake(g, dynamic);

  // ---------------------------------------------------------------- night and life
  let lastNight = -1;
  const gWarm = new THREE.Color('#bfe3f5');
  const gNight = new THREE.Color('#ffffff');
  updates.push((dt, t, near) => {
    const k = st.world.nightGlow ?? 0;
    if (Math.abs(k - lastNight) > 0.004) {
      lastNight = k;
      glass.emissiveIntensity = 0.04 + k * 1.05;
      glass.color.copy(gWarm).lerp(gNight, Math.min(1, k * 1.4));
      lantGlass.emissiveIntensity = 0.15 + k * 2.2;
      lantHalo.material.opacity = k * 0.8;
      for (const h of signLamps) h.material.opacity = k * 0.6;
      for (const h of halos) h.material.opacity = k * 0.55;
    }
    const tw = 0.12 + k * 2.4;
    bulbWarm.emissiveIntensity = tw * (0.85 + Math.sin(t * 2.1) * 0.15);
    bulbPink.emissiveIntensity = tw * (0.85 + Math.sin(t * 2.7 + 1) * 0.15);
    bulbSky.emissiveIntensity = tw * (0.85 + Math.sin(t * 1.7 + 2) * 0.15);
    if (near < 0.02) return;
    // the painter's brush, the cat's tail and breathing, the painting slowly filling in
    arm.rotation.x = -1.2 + Math.sin(t * 3.2) * 0.16;
    arm.rotation.z = 0.1 + Math.sin(t * 1.6) * 0.12;
    cat.tail.rotation.y = Math.sin(t * 1.3) * 0.5;
    cat.body.scale.y = 0.7 * (1 + Math.sin(t * 1.8) * 0.04);
    if (!work.update(dt)) {
      work.hold = (work.hold ?? 6) - dt;
      if (work.hold <= 0) {
        work.hold = 6;
        work.blank(0.16);
        work.play(26);
      }
    }
    // drawings flutter on the line
    const pos = sheetMesh.geometry.attributes.position;
    const arr = pos.array;
    for (let i = 0; i < pos.count; i++) {
      const s = Math.floor(i / 4);
      const a = Math.sin(t * 2.2 + sheets[s].ph) * 0.28 + Math.sin(t * 5.1 + s) * 0.06;
      const bx = sheetBase[i * 3];
      const by = sheetBase[i * 3 + 1];
      const bz = sheetBase[i * 3 + 2];
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      arr[i * 3] = sheetTops[i].x + bx;
      arr[i * 3 + 1] = sheetTops[i].y + by * ca - bz * sa;
      arr[i * 3 + 2] = sheetTops[i].z + by * sa + bz * ca;
    }
    pos.needsUpdate = true;
    // butterflies
    flies.forEach((f, i) => {
      const a = t * f.s + i * 2.1;
      v.set(f.c.x + Math.cos(a) * f.r, f.c.y + Math.sin(a * 2.3) * 0.18 + Math.sin(t * 7 + i) * 0.03, f.c.z + Math.sin(a * 1.3) * f.r * 0.6);
      const yaw = Math.atan2(-Math.sin(a) * f.r, Math.cos(a * 1.3) * f.r * 0.6 * 1.3) + P / 2;
      const flap = Math.sin(t * 18 + i) * 0.9;
      for (const side of [0, 1]) {
        e.set(0, yaw, side ? flap : -flap);
        q.setFromEuler(e);
        m4.compose(v, q, one);
        if (side) m4.multiply(mirror);
        wings.setMatrixAt(i * 2 + side, m4);
      }
    });
    wings.instanceMatrix.needsUpdate = true;
  });
  // put the sheets in place before the first update
  {
    const arr = sheetMesh.geometry.attributes.position.array;
    for (let i = 0; i < arr.length / 3; i++) {
      arr[i * 3] += sheetTops[i].x;
      arr[i * 3 + 1] += sheetTops[i].y;
      arr[i * 3 + 2] += sheetTops[i].z;
    }
  }

  return {
    badgeY: B.h2 + B.tooth + 1.55,
    dynamic,
    update(dt, t, near) {
      for (const fn of updates) fn(dt, t, near);
    },
  };
}

// The saved looks of Roji and Homama (for the little people in the paintings)
export function loadLooks() {
  try {
    return JSON.parse(localStorage.getItem('roji-weekends-looks-v1') || '{}');
  } catch {
    return {};
  }
}
