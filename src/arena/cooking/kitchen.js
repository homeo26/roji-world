import * as THREE from 'three';
import * as K from '../../interiors/yumyum/kit.js';
import { PAL, archPath, drawFrame, frameLayout, drawPoster, themedTexture, getArt } from '../../interiors/yumyum/theme.js';
import { bakeStatic } from '../../util.js';
import { F, drawItem } from './food.js';
import { DISH } from './levels.js';

// The YumYum kitchen seen from the front, in the colours of Roji's logo: cream walls with pointed
// arch windows, the logo on the wall and on the counter, floral tiles, raspberry and brass.
// Guests stand behind the pass at the back, the stations sit on a long worktop close to the camera.

const { box, rbox, cyl, sph, tor, at, rot, mat, umat, mesh, canvasTexture, FONT } = K;
const PI = Math.PI;

export const WT = 0.92; // worktop surface
export const BZ = -0.4; // back row: machines
export const FZ = 0.42; // front row: boards, plates, trays
export const PASS = { z: -1.85, y: 1.05 };
export const DF = 0.35; // dining floor, a step up
export const SPOT_Z = -2.42;
export const LANE_Z = -3.35;
export const WALL_Z = -4.15;
export const CHEF = { x: -5.45, z: -0.25, y: 0.24 };
export const TRASH = { x: 5.42, z: -0.15 };
export const SPOTS = { 3: [-1.9, 0.3, 2.5], 4: [-2.45, -0.65, 1.15, 2.95] };
export const DOOR_X = 6.0;
export const TABLES = [{ x: -5.0, z: -2.45 }, { x: 5.0, z: -2.45 }];
export const SEAT_H = 0.44;
export const X = {
  spit: -3.95, bread: -3.18, toum: -2.52,
  board0: -4.08, board1: -3.36, pickles: -2.6,
  grill: -1.3, gx: [-1.9, -1.3, -0.7],
  plate0: -1.96, plate1: -1.25, cheese: -0.56, salad: 0.03,
  fryer: 0.74, tray: 0.74,
  coffee: 1.74, cx1: [1.74], cx2: [1.57, 1.91], jar: 2.58,
  pecan: 1.64, german: 2.42,
  pot: 3.42, platter: 3.36,
  music: 4.36, herbs: 4.36,
};

const STEEL = '#e6e0da';
const STEEL_D = '#b9b1ab';
const BRASS = { metal: 0.55, rough: 0.32 };

// Four corners of the logo art make one floral tile; drawn again once the art has loaded.
function floralTile() {
  const t = themedTexture(256, 256, (c, w, h) => {
    c.fillStyle = PAL.cream;
    c.fillRect(0, 0, w, h);
    const a = getArt();
    if (a?.left && a?.right) {
      const q = w / 2;
      const draw = (img, x, y, fx, fy) => {
        c.save();
        c.translate(x + (fx < 0 ? q : 0), y + (fy < 0 ? q : 0));
        c.scale(fx, fy);
        c.drawImage(img, 0, 0, img.width * 0.78, img.height * 0.78, 0, 0, q, q);
        c.restore();
      };
      draw(a.left, 0, 0, 1, 1);
      draw(a.right, q, 0, 1, 1);
      draw(a.left, 0, q, 1, -1);
      draw(a.right, q, q, 1, -1);
    } else {
      c.fillStyle = PAL.rose;
      for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h], [w / 2, h / 2]]) {
        c.beginPath();
        c.arc(x, y, 22, 0, PI * 2);
        c.fill();
      }
    }
    c.strokeStyle = PAL.frame;
    c.lineWidth = 5;
    c.strokeRect(2.5, 2.5, w - 5, h - 5);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function archWindow(w, h) {
  return canvasTexture(Math.round(w * 200), Math.round(h * 200), (c, W, H) => {
    c.fillStyle = PAL.cream;
    c.fillRect(0, 0, W, H);
    const o = { archRatio: 0.5 };
    const p = archPath(W, H, o);
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#bfe6ec');
    sky.addColorStop(0.65, '#fdf1dc');
    sky.addColorStop(1, '#f6dcd6');
    c.save();
    c.clip(p);
    c.fillStyle = sky;
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#ffe7a8';
    c.beginPath();
    c.arc(W * 0.7, H * 0.36, W * 0.09, 0, PI * 2);
    c.fill();
    c.fillStyle = '#b9cf98';
    c.beginPath();
    c.moveTo(0, H * 0.78);
    c.quadraticCurveTo(W * 0.3, H * 0.62, W * 0.6, H * 0.74);
    c.quadraticCurveTo(W * 0.85, H * 0.66, W, H * 0.72);
    c.lineTo(W, H);
    c.lineTo(0, H);
    c.fill();
    c.fillStyle = PAL.olive;
    for (const [x, y, r] of [[0.22, 0.66, 0.08], [0.3, 0.62, 0.06], [0.78, 0.66, 0.07]]) {
      c.beginPath();
      c.arc(W * x, H * y, W * r, 0, PI * 2);
      c.fill();
      c.fillRect(W * x - 3, H * y, 6, H * 0.12);
    }
    c.restore();
    c.lineJoin = 'round';
    c.strokeStyle = PAL.inkDeep;
    c.lineWidth = W * 0.07;
    c.stroke(p);
    c.strokeStyle = PAL.band;
    c.lineWidth = W * 0.04;
    c.stroke(p);
    c.strokeStyle = '#ffffff';
    c.lineWidth = W * 0.022;
    c.save();
    c.clip(p);
    c.beginPath();
    c.moveTo(W / 2, 0);
    c.lineTo(W / 2, H);
    c.moveTo(0, H * 0.58);
    c.lineTo(W, H * 0.58);
    c.stroke();
    c.restore();
  });
}

function starTiles(base, star, dot, n) {
  const t = canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    const s8 = (x, y, r) => {
      c.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * PI * 2;
        const rr = i % 2 ? r * 0.62 : r;
        c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      c.closePath();
      c.fill();
    };
    c.fillStyle = star;
    for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h], [w / 2, h / 2]]) s8(x, y, 34);
    c.fillStyle = dot;
    for (const [x, y] of [[w / 2, 0], [0, h / 2], [w, h / 2], [w / 2, h]]) s8(x, y, 10);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(n[0], n[1]);
  return t;
}

const lanternGlass = {};
function lantern(scale = 1, lit = 0.6) {
  const g = new THREE.Group();
  const brass = mat(PAL.gold, BRASS);
  g.add(at(cyl(0.006, 0.006, 0.7, PAL.oliveDeep, 6), 0, 0.35, 0));
  g.add(at(mesh(K.cg('lanTop', () => new THREE.ConeGeometry(0.13, 0.16, 8)), brass), 0, 0.02, 0));
  g.add(at(cyl(0.12, 0.12, 0.03, brass, 8), 0, -0.07, 0));
  lanternGlass[lit] ??= umat('#ffd98a', { emissive: '#ffb84d', ei: lit, rough: 0.5 });
  const glass = mesh(K.cg('lanBody', () => new THREE.CylinderGeometry(0.11, 0.09, 0.26, 8)), lanternGlass[lit], { cast: false });
  g.add(at(glass, 0, -0.21, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + PI / 8;
    g.add(at(rot(box(0.012, 0.27, 0.012, brass), 0, -a, 0), Math.cos(a) * 0.105, -0.21, Math.sin(a) * 0.105));
  }
  g.add(at(cyl(0.1, 0.06, 0.04, brass, 8), 0, -0.36, 0));
  g.add(at(sph(0.025, brass, undefined, 8), 0, -0.4, 0));
  g.scale.setScalar(scale);
  g.userData.glass = glass;
  return g;
}

function roseVase() {
  const g = new THREE.Group();
  g.add(at(cyl(0.06, 0.08, 0.2, PAL.ink, 14, { rough: 0.4 }), 0, 0.1, 0));
  g.add(at(tor(0.06, 0.012, PAL.gold, BRASS, PI * 2, 16), 0, 0.2, 0));
  g.children[1].rotation.x = PI / 2;
  for (const [x, y, z, c] of [[0, 0.36, 0, PAL.rose], [0.07, 0.31, 0.02, '#f6b9bd'], [-0.07, 0.32, -0.01, PAL.ink], [0.02, 0.3, 0.07, PAL.rose], [-0.03, 0.29, -0.07, '#f6b9bd']]) {
    g.add(at(sph(0.045, c, { rough: 0.6 }, 12), x, y, z));
    g.add(at(rot(cyl(0.004, 0.004, 0.16, PAL.olive, 5), x * 2, 0, z * 2), x * 0.5, 0.25, z * 0.5));
  }
  for (const [x, z, r] of [[0.08, 0, 0.6], [-0.08, 0.02, -0.6], [0, -0.08, 2]]) {
    const leaf = sph(0.03, PAL.olive, { rough: 0.7 }, 8);
    leaf.scale.set(1.6, 0.4, 0.8);
    leaf.rotation.set(0, r, 0.5);
    g.add(at(leaf, x, 0.26, z));
  }
  return g;
}

// The menu on the wall: every dish with its price, inside the logo's arch.
function menuBoard() {
  return themedTexture(440, 620, (c, w, h) => {
    drawFrame(c, w, h, { archRatio: 0.42 });
    const L = frameLayout(w, h, { archRatio: 0.42 });
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = PAL.ink;
    c.font = `700 46px ${FONT}`;
    c.fillText('Menu', w / 2, L.spring - L.A * 0.38);
    const list = ['wrap', 'burger', 'mansaf', 'fries', 'latte', 'lemonade', 'pecan', 'german'];
    const top = L.spring - L.A * 0.05;
    const step = (L.y1 - 18 - top) / list.length;
    list.forEach((d, i) => {
      const y = top + step * (i + 0.5);
      drawItem(c, d, L.x0 + 52, y, step * 0.92);
      c.textAlign = 'left';
      c.fillStyle = PAL.inkDeep;
      c.font = `600 ${Math.round(step * 0.42)}px ${FONT}`;
      c.fillText(DISH[d].name, L.x0 + 92, y + 2);
      c.textAlign = 'right';
      c.fillStyle = PAL.olive;
      c.fillText(String(DISH[d].price), L.x1 - 22, y + 2);
    });
  });
}
// A little framed drawing of Roji and Homama, side by side.
function couplePhoto() {
  return canvasTexture(420, 380, (c, w, h) => {
    c.fillStyle = PAL.gold;
    c.beginPath();
    c.moveTo(w / 2, h - 6);
    c.bezierCurveTo(-30, h * 0.48, w * 0.1, -20, w / 2, h * 0.2);
    c.bezierCurveTo(w * 0.9, -20, w + 30, h * 0.48, w / 2, h - 6);
    c.fill();
    c.fillStyle = PAL.blush;
    c.beginPath();
    c.moveTo(w / 2, h - 34);
    c.bezierCurveTo(4, h * 0.48, w * 0.14, 12, w / 2, h * 0.26);
    c.bezierCurveTo(w * 0.86, 12, w - 4, h * 0.48, w / 2, h - 34);
    c.fill();
    const face = (x, y, hair, girl) => {
      c.fillStyle = hair;
      c.beginPath();
      c.arc(x, y - 6, 62, Math.PI, 0);
      c.fill();
      if (girl) {
        c.fillRect(x - 64, y - 6, 22, 92);
        c.fillRect(x + 42, y - 6, 22, 92);
      }
      c.fillStyle = '#fbe0cc';
      c.beginPath();
      c.arc(x, y + 12, 52, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = hair;
      c.beginPath();
      c.ellipse(x, y - 30, 54, 26, 0, Math.PI, 0);
      c.fill();
      c.fillStyle = '#3b2b3f';
      for (const dx of [-18, 18]) {
        c.beginPath();
        c.arc(x + dx, y + 12, 7, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = 'rgba(239,111,140,0.45)';
      for (const dx of [-30, 30]) {
        c.beginPath();
        c.ellipse(x + dx, y + 30, 10, 6, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = '#b23a48';
      c.lineWidth = 5;
      c.lineCap = 'round';
      c.beginPath();
      c.arc(x, y + 30, 12, 0.2, Math.PI - 0.2);
      c.stroke();
      c.fillStyle = girl ? '#ff9eb5' : '#5b8def';
      c.beginPath();
      c.moveTo(x - 50, y + 120);
      c.quadraticCurveTo(x, y + 52, x + 50, y + 120);
      c.fill();
      if (girl) {
        c.fillStyle = PAL.ink;
        c.beginPath();
        c.ellipse(x - 36, y - 46, 16, 10, -0.5, 0, Math.PI * 2);
        c.ellipse(x - 12, y - 52, 16, 10, 0.5, 0, Math.PI * 2);
        c.fill();
      }
    };
    face(w * 0.36, h * 0.46, '#4a2c1a', true);
    face(w * 0.64, h * 0.46, '#141010', false);
    c.fillStyle = PAL.ink;
    c.beginPath();
    const hx = w / 2;
    const hy = h * 0.22;
    c.moveTo(hx, hy + 14);
    c.bezierCurveTo(hx - 22, hy, hx - 14, hy - 18, hx, hy - 6);
    c.bezierCurveTo(hx + 14, hy - 18, hx + 22, hy, hx, hy + 14);
    c.fill();
  });
}

export function buildKitchen(ctx) {
  const world = new THREE.Group(); // static, merged after building
  const dyn = new THREE.Group(); // moving, recoloured or toggled things
  const add = (o, x, y, z) => (world.add(at(o, x, y, z)), o);
  const dadd = (o, x, y, z) => (dyn.add(at(o, x, y, z)), o);
  const keepStatic = [];

  // ---------------------------------------------------------------- room
  const kfloor = mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshStandardMaterial({ map: starTiles('#fbeee2', '#e9b6a8', '#5b6447', [12, 6]), roughness: 0.85 }), { cast: false });
  kfloor.rotation.x = -PI / 2;
  add(kfloor, 0, 0, 1.9);
  const dineTop = mesh(new THREE.PlaneGeometry(16, 2.3), new THREE.MeshStandardMaterial({ map: starTiles(PAL.cream, PAL.blush, PAL.rose, [11, 1.6]), roughness: 0.85 }), { cast: false });
  dineTop.rotation.x = -PI / 2;
  add(dineTop, 0, DF, -3.02);
  add(box(16, DF, 0.06, PAL.inkDeep), 0, DF / 2, -1.87);
  // Back wall: cream plaster, a blush wainscot with a floral tile band, arch windows and the logo
  add(box(16, 5.4, 0.2, PAL.cream, { rough: 0.95 }), 0, 2.7, WALL_Z - 0.1);
  add(box(16, 0.95, 0.06, PAL.blush, { rough: 0.9 }), 0, DF + 0.475, WALL_Z + 0.02);
  const band = floralTile();
  band.repeat.set(36, 1);
  add(mesh(new THREE.PlaneGeometry(16, 0.44), new THREE.MeshStandardMaterial({ map: band, roughness: 0.75 }), { cast: false }), 0, DF + 1.12, WALL_Z + 0.06);
  add(box(16, 0.05, 0.08, PAL.inkDeep), 0, DF + 1.36, WALL_Z + 0.06);
  add(box(16, 0.04, 0.08, PAL.inkDeep), 0, DF + 0.9, WALL_Z + 0.06);
  const winTex = archWindow(1.5, 2.1);
  const winMat = new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.8, emissive: '#ffffff', emissiveMap: winTex, emissiveIntensity: 0.18 });
  for (const x of [-4.2, -1.3, 1.6, 4.5]) add(mesh(new THREE.PlaneGeometry(1.5, 2.1), winMat, { cast: false }), x, DF + 2.55, WALL_Z + 0.07);
  const posterTex = themedTexture(520, 735, (c, w, h) => drawPoster(c, w, h));
  const poster = mesh(new THREE.PlaneGeometry(1.25, 1.77), new THREE.MeshStandardMaterial({ map: posterTex, roughness: 0.8, emissive: '#ffffff', emissiveMap: posterTex, emissiveIntensity: 0.12 }), { cast: false });
  add(poster, 0.15, DF + 2.55, WALL_Z + 0.09);
  add(box(1.35, 1.87, 0.04, PAL.gold, BRASS), 0.15, DF + 2.55, WALL_Z + 0.06);
  const menuTex = menuBoard();
  add(mesh(new THREE.PlaneGeometry(1.02, 1.44), new THREE.MeshStandardMaterial({ map: menuTex, roughness: 0.8, emissive: '#ffffff', emissiveMap: menuTex, emissiveIntensity: 0.12 }), { cast: false }), -2.75, DF + 2.5, WALL_Z + 0.09);
  add(box(1.1, 1.52, 0.04, '#a8764a', { rough: 0.8 }), -2.75, DF + 2.5, WALL_Z + 0.06);
  const photo = mesh(new THREE.PlaneGeometry(0.95, 0.86), new THREE.MeshStandardMaterial({ map: couplePhoto(), roughness: 0.7, alphaTest: 0.5 }), { cast: false });
  add(photo, 3.05, DF + 2.6, WALL_Z + 0.09);
  // A rose vine along the top of the wall
  for (let i = 0; i < 26; i++) {
    const x = -7.5 + i * 0.6;
    const y = DF + 3.95 + Math.sin(i * 1.3) * 0.08;
    const leaf = sph(0.09, i % 3 ? PAL.olive : PAL.oliveDeep, { rough: 0.8 }, 8);
    leaf.scale.set(1.5, 0.7, 0.5);
    leaf.rotation.z = Math.sin(i) * 0.6;
    add(leaf, x, y, WALL_Z + 0.05);
    if (i % 2 === 0) add(sph(0.075, i % 4 ? PAL.rose : PAL.ink, { rough: 0.6 }, 10), x + 0.25, y - 0.06, WALL_Z + 0.09);
  }
  // Side walls with an arched door for the guests, and a potted olive tree in each corner
  const doorTex = archWindow(1.6, 2.4);
  const doorMat = new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.85, emissive: '#ffffff', emissiveMap: doorTex, emissiveIntensity: 0.15 });
  for (const s of [-1, 1]) {
    add(box(0.2, 5.4, 6.2, PAL.cream, { rough: 0.95 }), s * 6.6, 2.7, -1.2);
    add(box(0.06, 0.95, 6.2, PAL.blush, { rough: 0.9 }), s * 6.48, DF + 0.475, -1.2);
    const door = mesh(new THREE.PlaneGeometry(1.6, 2.4), doorMat, { cast: false });
    door.rotation.y = -s * PI / 2;
    add(door, s * 6.47, DF + 1.2, LANE_Z + 0.05);
    const plant = new THREE.Group();
    plant.add(at(cyl(0.2, 0.15, 0.36, PAL.ink, 14, { rough: 0.5 }), 0, 0.18, 0));
    for (const [x, y, z, r] of [[0, 0.62, 0, 0.24], [0.15, 0.5, 0.08, 0.17], [-0.15, 0.52, -0.05, 0.18], [0.05, 0.8, -0.05, 0.15]]) plant.add(at(sph(r, PAL.olive, { rough: 0.85 }, 12), x, y, z));
    add(plant, s * 5.95, DF, WALL_Z + 0.45);
  }

  // Two little cafe tables in the dining room corners; the VIP sits at one after being served
  for (const t of TABLES) {
    const g = new THREE.Group();
    g.add(at(cyl(0.4, 0.4, 0.05, PAL.paper, 24, { rough: 0.4 }), 0, 0.74, 0));
    g.add(at(rot(tor(0.4, 0.02, PAL.ink, { rough: 0.5 }, PI * 2, 26), PI / 2, 0, 0), 0, 0.74, 0));
    g.add(at(cyl(0.035, 0.035, 0.7, PAL.gold, 10, BRASS), 0, 0.37, 0));
    g.add(at(cyl(0.2, 0.22, 0.03, PAL.gold, 16, BRASS), 0, 0.015, 0));
    g.add(at(cyl(0.05, 0.06, 0.12, PAL.ink, 12, { rough: 0.4 }), 0.12, 0.82, 0.05));
    g.add(at(sph(0.05, PAL.rose, { rough: 0.6 }, 10), 0.12, 0.92, 0.05));
    for (const [dx, dz, ry] of [[0, -0.55, 0], [t.x < 0 ? 0.55 : -0.55, 0, t.x < 0 ? -PI / 2 : PI / 2]]) {
      const ch = new THREE.Group();
      ch.add(at(rbox(0.42, 0.06, 0.42, PAL.ink, 0.02, { rough: 0.6 }), 0, SEAT_H, 0));
      ch.add(at(rbox(0.42, 0.42, 0.05, PAL.ink, 0.02, { rough: 0.6 }), 0, SEAT_H + 0.24, -0.19));
      ch.add(at(box(0.3, 0.12, 0.052, PAL.blush), 0, SEAT_H + 0.3, -0.19));
      for (const [lx, lz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) ch.add(at(cyl(0.02, 0.02, SEAT_H, PAL.gold, 6, BRASS), lx, SEAT_H / 2, lz));
      ch.rotation.y = ry;
      g.add(at(ch, dx, 0, dz));
    }
    add(g, t.x, DF, t.z);
  }

  // ---------------------------------------------------------------- the pass, where guests stand
  add(rbox(10.2, PASS.y - 0.06, 0.48, PAL.ink, 0.04, { rough: 0.6 }), 0, (PASS.y - 0.06) / 2, PASS.z);
  add(rbox(10.3, 0.06, 0.6, PAL.paper, 0.025, { rough: 0.4 }), 0, PASS.y - 0.03, PASS.z);
  add(box(10.3, 0.03, 0.03, PAL.gold, BRASS), 0, PASS.y - 0.075, PASS.z + 0.3);
  add(box(10.3, 0.03, 0.03, PAL.gold, BRASS), 0, PASS.y - 0.075, PASS.z - 0.3);

  // ---------------------------------------------------------------- worktop
  add(box(9.9, WT - 0.06, 1.9, PAL.cream, { rough: 0.85 }), 0, (WT - 0.06) / 2, 0);
  const tiles = floralTile();
  tiles.repeat.set(23, 1);
  add(mesh(new THREE.PlaneGeometry(9.9, 0.43), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.7 }), { cast: false }), 0, WT - 0.3, 0.952);
  add(box(9.9, 0.05, 0.03, PAL.inkDeep), 0, WT - 0.535, 0.96);
  add(box(9.9, 0.3, 0.02, PAL.blush, { rough: 0.9 }), 0, 0.15, 0.955);
  add(rbox(10.0, 0.06, 2.0, PAL.paper, 0.02, { rough: 0.45 }), 0, WT - 0.03, 0);
  add(box(10.0, 0.035, 0.03, PAL.gold, BRASS), 0, WT - 0.05, 1.0);
  // Roji's logo on the front of the worktop
  const plaqueTex = themedTexture(640, 420, (c, w, h) => drawPoster(c, w, h, { logoWidth: 0.6, logoY: 0.6 }));
  add(mesh(new THREE.PlaneGeometry(0.82, 0.54), new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.75, emissive: '#ffffff', emissiveMap: plaqueTex, emissiveIntensity: 0.1 }), { cast: false }), 0.38, WT - 0.31, 0.962);
  add(box(0.88, 0.6, 0.012, PAL.gold, BRASS), 0.38, WT - 0.31, 0.956);

  // ---------------------------------------------------------------- shawarma
  const spit = new THREE.Group();
  spit.add(at(cyl(0.27, 0.29, 0.07, PAL.gold, 20, BRASS), 0, 0.035, 0));
  spit.add(at(rbox(0.62, 0.9, 0.1, PAL.ink, 0.05, { rough: 0.5 }), 0, 0.52, -0.34));
  spit.add(at(box(0.64, 0.05, 0.12, PAL.gold, BRASS), 0, 0.98, -0.34));
  const heat = umat('#ffb15c', { emissive: '#ff7a2e', ei: 1.0, rough: 0.5 });
  for (let i = 0; i < 4; i++) spit.add(at(rbox(0.46, 0.06, 0.02, heat, 0.02), 0, 0.26 + i * 0.17, -0.285));
  spit.add(at(cyl(0.018, 0.018, 1.0, STEEL_D, 8, { metal: 0.6, rough: 0.3 }), 0, 0.56, 0));
  spit.add(at(cyl(0.06, 0.08, 0.05, PAL.gold, 12, BRASS), 0, 1.0, 0));
  add(spit, X.spit, WT, BZ);
  const meatHolder = dadd(new THREE.Group(), X.spit, WT + 0.08, BZ);
  const crown = new THREE.Group();
  crown.add(at(cyl(0.12, 0.15, 0.06, PAL.gold, 12, BRASS), 0, 0, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    crown.add(at(sph(0.025, '#ffffff', { rough: 0.3 }, 8), Math.cos(a) * 0.13, 0.05, Math.sin(a) * 0.13));
  }
  dadd(crown, X.spit, WT + 1.07, BZ);
  const basket = new THREE.Group();
  basket.add(at(cyl(0.23, 0.2, 0.12, '#c98a5a', 18, { rough: 0.9 }), 0, 0.06, 0));
  basket.add(at(rot(tor(0.225, 0.02, '#a8764a', { rough: 0.9 }, PI * 2, 22), PI / 2, 0, 0), 0, 0.12, 0));
  for (let i = 0; i < 5; i++) basket.add(at(rot(cyl(0.19, 0.19, 0.014, i % 2 ? F.bread : '#ecc98f', 18), 0.06 * (i % 2 ? 1 : -1), i, 0), 0, 0.13 + i * 0.016, 0));
  add(basket, X.bread, WT, BZ);
  const toum = new THREE.Group();
  toum.add(at(cyl(0.19, 0.14, 0.12, PAL.paper, 18, { rough: 0.4 }), 0, 0.06, 0));
  toum.add(at(rot(tor(0.185, 0.016, PAL.ink, { rough: 0.4 }, PI * 2, 22), PI / 2, 0, 0), 0, 0.12, 0));
  toum.add(at(cyl(0.17, 0.17, 0.02, '#ffffff', 18, { rough: 0.3 }), 0, 0.11, 0));
  for (let i = 0; i < 4; i++) {
    const s = sph(0.04, '#fff6e3', { rough: 0.5 }, 10);
    s.scale.set(1, 1.2, 1);
    toum.add(at(s, 0.24 + (i % 2) * 0.05, 0.04, -0.06 + i * 0.03));
  }
  add(toum, X.toum, WT, BZ);
  const boards = [X.board0, X.board1].map((x) => {
    const b = rbox(0.62, 0.04, 0.46, '#d39a62', 0.02, { rough: 0.8 });
    add(b, x, WT + 0.02, FZ);
    add(rbox(0.12, 0.03, 0.06, '#a8764a', 0.01), x + 0.33, WT + 0.02, FZ);
    return dadd(new THREE.Group(), x, WT + 0.04, FZ);
  });
  const pickles = new THREE.Group();
  pickles.add(at(cyl(0.2, 0.15, 0.11, PAL.paper, 18, { rough: 0.4 }), 0, 0.055, 0));
  pickles.add(at(rot(tor(0.195, 0.016, PAL.olive, { rough: 0.5 }, PI * 2, 22), PI / 2, 0, 0), 0, 0.11, 0));
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4;
    const d = (i % 3) * 0.05 + 0.02;
    pickles.add(at(rot(cyl(0.035, 0.035, 0.016, i % 2 ? F.pickle : F.pickleDark, 12), 0.3, 0, 0.2 * (i % 3)), Math.cos(a) * d, 0.11 + (i % 2) * 0.01, Math.sin(a) * d));
  }
  add(pickles, X.pickles, WT, FZ);

  // ---------------------------------------------------------------- burgers
  const grill = new THREE.Group();
  grill.add(at(rbox(1.86, 0.12, 0.68, STEEL, 0.03, { metal: 0.35, rough: 0.4 }), 0, 0.06, 0));
  const plateTex = K.pattern(256, 128, '#4e4447', (c, w, h) => {
    c.fillStyle = '#5d5256';
    for (let i = 0; i < 12; i++) c.fillRect(0, (i * h) / 12 + 3, w, 4);
  });
  grill.add(at(mesh(new THREE.BoxGeometry(1.76, 0.03, 0.56), new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.55, metalness: 0.3 })), 0, 0.125, 0.02));
  grill.add(at(rbox(1.86, 0.32, 0.06, STEEL, 0.02, { metal: 0.35, rough: 0.4 }), 0, 0.26, -0.31));
  grill.add(at(box(1.86, 0.05, 0.03, PAL.ink), 0, 0.37, -0.29));
  X.gx.forEach((x) => {
    grill.add(at(rot(tor(0.19, 0.008, '#6b6066', undefined, PI * 2, 28), PI / 2, 0, 0), x - X.grill, 0.142, 0.02));
    grill.add(at(rot(cyl(0.04, 0.04, 0.05, PAL.ink, 12), PI / 2, 0, 0), x - X.grill, 0.06, 0.35));
  });
  add(grill, X.grill, WT, BZ);
  const grillCover = new THREE.Group();
  grillCover.add(at(rbox(0.52, 0.08, 0.5, STEEL_D, 0.04, { metal: 0.4, rough: 0.35 }), 0, 0.04, 0));
  grillCover.add(at(rbox(0.16, 0.04, 0.05, PAL.ink, 0.02), 0, 0.1, 0));
  dadd(grillCover, X.gx[2], WT + 0.14, BZ + 0.02);
  const grillTrim = dadd(box(1.88, 0.04, 0.03, mat(PAL.gold, BRASS)), X.grill, WT + 0.1, BZ + 0.355);
  const plates = [X.plate0, X.plate1].map((x) => {
    add(cyl(0.23, 0.2, 0.025, '#ffffff', 24, { rough: 0.3 }), x, WT + 0.0125, FZ);
    add(rot(tor(0.215, 0.01, PAL.ink, { rough: 0.4 }, PI * 2, 28), PI / 2, 0, 0), x, WT + 0.026, FZ);
    return dadd(new THREE.Group(), x, WT + 0.026, FZ);
  });
  const cheese = new THREE.Group();
  cheese.add(at(rbox(0.38, 0.05, 0.32, PAL.paper, 0.02, { rough: 0.4 }), 0, 0.025, 0));
  cheese.add(at(box(0.38, 0.02, 0.33, PAL.ink), 0, 0.012, 0));
  for (let i = 0; i < 5; i++) cheese.add(at(rot(box(0.22, 0.012, 0.22, F.cheese, { rough: 0.5 }), 0, 0.15 * i, 0), (i - 2) * 0.012, 0.058 + i * 0.013, 0));
  add(cheese, X.cheese, WT, FZ);
  const salad = new THREE.Group();
  salad.add(at(cyl(0.2, 0.15, 0.11, PAL.paper, 18, { rough: 0.4 }), 0, 0.055, 0));
  salad.add(at(rot(tor(0.195, 0.016, PAL.ink, { rough: 0.4 }, PI * 2, 22), PI / 2, 0, 0), 0, 0.11, 0));
  for (let i = 0; i < 7; i++) {
    const a = i * 2.2;
    const lf = sph(0.07, i % 2 ? F.lettuce : '#94d872', { rough: 0.7 }, 10);
    lf.scale.set(1, 0.35, 0.8);
    salad.add(at(lf, Math.cos(a) * 0.08, 0.12, Math.sin(a) * 0.08));
  }
  for (const [x, z] of [[-0.06, 0.03], [0.06, -0.02], [0.0, 0.08]]) salad.add(at(rot(cyl(0.045, 0.045, 0.016, F.tomato, 14), 0.3, 0, 0), x, 0.15, z));
  add(salad, X.salad, WT, FZ);

  // ---------------------------------------------------------------- fries
  const fryer = new THREE.Group();
  fryer.add(at(rbox(0.84, 0.36, 0.62, PAL.paper, 0.04, { rough: 0.45 }), 0, 0.18, 0));
  fryer.add(at(box(0.85, 0.07, 0.63, PAL.ink), 0, 0.1, 0));
  fryer.add(at(box(0.66, 0.02, 0.42, '#7b6a50'), 0, 0.355, 0.03));
  fryer.add(at(rbox(0.84, 0.24, 0.06, PAL.paper, 0.02, { rough: 0.45 }), 0, 0.48, -0.29));
  fryer.add(at(sph(0.03, '#7fe0a0', { emissive: '#3fbf7f', ei: 0.9 }, 10), 0.3, 0.52, -0.255));
  add(fryer, X.fryer, WT, BZ);
  const oil = dadd(box(0.62, 0.02, 0.38, umat('#f2b33d', { rough: 0.15, emissive: '#c77a10', ei: 0.25 })), X.fryer, WT + 0.365, BZ + 0.03);
  const fryBasket = new THREE.Group();
  const wire = mat(STEEL_D, { metal: 0.5, rough: 0.3 });
  fryBasket.add(at(box(0.48, 0.012, 0.32, wire), 0, 0, 0));
  for (const [w, d, x, z] of [[0.48, 0.012, 0, 0.16], [0.48, 0.012, 0, -0.16], [0.012, 0.32, 0.24, 0], [0.012, 0.32, -0.24, 0]]) fryBasket.add(at(box(w, 0.16, d, wire), x, 0.08, z));
  fryBasket.add(at(rot(cyl(0.012, 0.012, 0.3, wire, 6), PI / 2 - 0.5, 0, 0), 0, 0.2, 0.27));
  fryBasket.add(at(rot(cyl(0.026, 0.026, 0.14, PAL.ink, 10), PI / 2 - 0.5, 0, 0), 0, 0.28, 0.43));
  const basketLoad = new THREE.Group();
  fryBasket.add(basketLoad);
  dadd(fryBasket, X.fryer, WT + 0.55, BZ + 0.03);
  const tray = new THREE.Group();
  tray.add(at(rbox(0.72, 0.06, 0.38, STEEL, 0.02, { metal: 0.35, rough: 0.4 }), 0, 0.03, 0));
  tray.add(at(box(0.66, 0.012, 0.32, '#fbe6c8'), 0, 0.062, 0));
  add(tray, X.tray, WT, FZ);
  const trayBig = new THREE.Group();
  trayBig.add(at(rbox(0.08, 0.1, 0.4, PAL.gold, 0.02, BRASS), -0.4, 0.05, 0));
  trayBig.add(at(rbox(0.08, 0.1, 0.4, PAL.gold, 0.02, BRASS), 0.4, 0.05, 0));
  dadd(trayBig, X.tray, WT, FZ);
  const trayFries = dadd(new THREE.Group(), X.tray, WT + 0.068, FZ);

  // ---------------------------------------------------------------- drinks
  const coffee = new THREE.Group();
  coffee.add(at(rbox(0.7, 0.78, 0.5, PAL.ink, 0.06, { rough: 0.5 }), 0, 0.45, -0.06));
  coffee.add(at(rbox(0.74, 0.08, 0.54, PAL.paper, 0.03, { rough: 0.45 }), 0, 0.86, -0.06));
  coffee.add(at(rbox(0.6, 0.05, 0.34, STEEL, 0.015, { metal: 0.4, rough: 0.35 }), 0, 0.025, 0.12));
  coffee.add(at(rbox(0.6, 0.1, 0.2, PAL.ink, 0.03, { rough: 0.5 }), 0, 0.07, -0.16));
  for (const [x, c] of [[-0.18, PAL.paper], [0, PAL.blush], [0.18, PAL.paper]]) coffee.add(at(cyl(0.05, 0.04, 0.07, c, 12, { rough: 0.4 }), x, 0.935, -0.06));
  add(coffee, X.coffee, WT, BZ);
  const coffeeBrass = new THREE.Group();
  coffeeBrass.add(at(box(0.72, 0.05, 0.52, mat(PAL.gold, BRASS)), 0, 0.81, -0.06));
  coffeeBrass.add(at(sph(0.035, mat(PAL.gold, BRASS), undefined, 10), 0, 0.98, -0.06));
  dadd(coffeeBrass, X.coffee, WT, BZ);
  const spoutMesh = () => {
    const g = new THREE.Group();
    g.add(at(cyl(0.06, 0.06, 0.06, mat(PAL.gold, BRASS), 14), 0, 0, 0));
    g.add(at(cyl(0.016, 0.012, 0.06, mat(STEEL_D, { metal: 0.5, rough: 0.3 }), 8), 0, -0.05, 0));
    return g;
  };
  const spoutA = dadd(spoutMesh(), X.cx1[0], WT + 0.47, BZ + 0.13);
  const spoutB = dadd(spoutMesh(), X.cx2[1], WT + 0.47, BZ + 0.13);
  const streamMat = umat(F.coffee, { rough: 0.3 });
  const stream = () => {
    const m = mesh(K.cg('ckStream', () => new THREE.CylinderGeometry(0.012, 0.012, 1, 8).translate(0, -0.5, 0)), streamMat, { cast: false });
    m.visible = false;
    return m;
  };
  const coffeeStreams = [stream(), stream()];
  const coffeeCups = [new THREE.Group(), new THREE.Group()];
  coffeeCups.forEach((g, i) => {
    dyn.add(g);
    dyn.add(coffeeStreams[i]);
    void i;
  });
  const jar = new THREE.Group();
  jar.add(at(rbox(0.36, 0.22, 0.36, PAL.paper, 0.03, { rough: 0.5 }), 0, 0.11, -0.04));
  jar.add(at(box(0.37, 0.04, 0.37, PAL.olive), 0, 0.2, -0.04));
  jar.add(at(rbox(0.26, 0.03, 0.22, STEEL, 0.01, { metal: 0.4, rough: 0.35 }), 0, 0.015, 0.16));
  jar.add(at(cyl(0.17, 0.17, 0.44, F.lemonade, 18, { rough: 0.3 }), 0, 0.46, -0.04));
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3;
    jar.add(at(rot(cyl(0.05, 0.05, 0.01, F.lemon, 14), PI / 2, a, 0), Math.cos(a) * 0.12, 0.34 + i * 0.07, -0.04 + Math.sin(a) * 0.1));
  }
  jar.add(at(cyl(0.18, 0.18, 0.05, PAL.gold, 18, BRASS), 0, 0.71, -0.04));
  jar.add(at(rot(cyl(0.02, 0.02, 0.1, mat(PAL.gold, BRASS), 8), PI / 2, 0, 0), 0, 0.3, 0.14));
  add(jar, X.jar, WT, BZ);
  const jarGlass = mesh(K.cg('ckJarGlass', () => new THREE.CylinderGeometry(0.19, 0.19, 0.5, 18, 1, true)), new THREE.MeshStandardMaterial({ color: '#f4fbff', roughness: 0.05, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }), { cast: false });
  dadd(jarGlass, X.jar, WT + 0.47, BZ - 0.04);
  const jarBig = new THREE.Group();
  jarBig.add(at(cyl(0.2, 0.2, 0.05, PAL.gold, 18, BRASS), 0, 0, 0));
  for (const [x, z, c] of [[0.05, 0.05, F.mint], [-0.06, 0.02, F.mint], [0, -0.06, F.lemon]]) jarBig.add(at(sph(0.05, c, { rough: 0.6 }, 10), x, 0.06, z));
  dadd(jarBig, X.jar, WT + 0.76, BZ - 0.04);
  const jarCup = dadd(new THREE.Group(), X.jar, WT + 0.03, BZ + 0.16);
  const jarStream = mesh(K.cg('ckStream', () => new THREE.CylinderGeometry(0.012, 0.012, 1, 8).translate(0, -0.5, 0)), umat(F.lemonade, { rough: 0.3 }), { cast: false });
  jarStream.visible = false;
  dadd(jarStream, X.jar, WT + 0.29, BZ + 0.19);

  // ---------------------------------------------------------------- cakes
  const stand = (x, name) => {
    const g = new THREE.Group();
    g.add(at(cyl(0.12, 0.14, 0.03, '#ffffff', 20, { rough: 0.3 }), 0, 0.015, 0));
    g.add(at(cyl(0.03, 0.04, 0.12, '#ffffff', 12, { rough: 0.3 }), 0, 0.09, 0));
    g.add(at(cyl(0.26, 0.25, 0.025, '#ffffff', 26, { rough: 0.3 }), 0, 0.16, 0));
    g.add(at(rot(tor(0.255, 0.011, PAL.ink, { rough: 0.4 }, PI * 2, 28), PI / 2, 0, 0), 0, 0.17, 0));
    add(g, x, WT, FZ);
    return dadd(new THREE.Group(), x, WT + 0.172, FZ);
  };
  const cakeSlots = { pecan: stand(X.pecan, 'Pecan'), german: stand(X.german, 'German') };
  const cakeFancy = new THREE.Group();
  for (const x of [X.pecan, X.german]) {
    cakeFancy.add(at(rot(tor(0.262, 0.014, PAL.gold, BRASS, PI * 2, 28), PI / 2, 0, 0), x, WT + 0.185, FZ));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * PI * 2;
      cakeFancy.add(at(sph(0.018, '#ffffff', { rough: 0.3 }, 8), x + Math.cos(a) * 0.262, WT + 0.2, FZ + Math.sin(a) * 0.262));
    }
  }
  dyn.add(cakeFancy);

  // ---------------------------------------------------------------- mansaf
  const burner = new THREE.Group();
  burner.add(at(rbox(0.7, 0.12, 0.56, STEEL, 0.03, { metal: 0.35, rough: 0.4 }), 0, 0.06, 0));
  burner.add(at(rot(tor(0.2, 0.02, '#4b4248', undefined, PI * 2, 20), PI / 2, 0, 0), 0, 0.125, 0));
  burner.add(at(rot(cyl(0.035, 0.035, 0.05, PAL.ink, 12), PI / 2, 0, 0), 0.25, 0.06, 0.29));
  add(burner, X.pot, WT, BZ);
  const pot = new THREE.Group();
  pot.add(at(cyl(0.27, 0.24, 0.3, '#c98a5a', 22, { metal: 0.5, rough: 0.35 }), 0, 0.15, 0));
  pot.add(at(rot(tor(0.27, 0.018, PAL.gold, BRASS, PI * 2, 24), PI / 2, 0, 0), 0, 0.3, 0));
  for (const s of [-1, 1]) pot.add(at(rot(tor(0.05, 0.014, PAL.gold, BRASS, PI, 10), 0, s * PI / 2, 0), s * 0.29, 0.24, 0));
  add(pot, X.pot, WT + 0.13, BZ);
  const potLid = new THREE.Group();
  potLid.add(at(sph(0.27, '#c98a5a', { metal: 0.5, rough: 0.35 }, 18), 0, -0.2, 0));
  potLid.children[0].scale.set(1, 0.3, 1);
  potLid.add(at(sph(0.04, PAL.gold, BRASS, 10), 0, -0.1, 0));
  const lidHold = dadd(new THREE.Group(), X.pot, WT + 0.43 + 0.2, BZ);
  lidHold.add(potLid);
  const jameedFill = dadd(cyl(0.24, 0.24, 0.02, umat('#fff1d2', { rough: 0.3 }), 20), X.pot, WT + 0.4, BZ);
  jameedFill.visible = false;
  const platterG = new THREE.Group();
  platterG.add(at(cyl(0.33, 0.3, 0.03, '#f3ece0', 30, { rough: 0.35 }), 0, 0.015, 0));
  platterG.add(at(rot(tor(0.325, 0.014, PAL.ink, { rough: 0.4 }, PI * 2, 32), PI / 2, 0, 0), 0, 0.032, 0));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * PI * 2;
    platterG.add(at(sph(0.012, PAL.gold, BRASS, 6), Math.cos(a) * 0.3, 0.034, Math.sin(a) * 0.3));
  }
  add(platterG, X.platter, WT, FZ);
  const platter = dadd(new THREE.Group(), X.platter, WT + 0.032, FZ);

  // ---------------------------------------------------------------- trash, music box, flowers, lanterns
  const bin = new THREE.Group();
  bin.add(at(cyl(0.3, 0.26, 0.82, PAL.ink, 20, { rough: 0.5 }), 0, 0.41, 0));
  bin.add(at(rot(tor(0.3, 0.025, PAL.gold, BRASS, PI * 2, 24), PI / 2, 0, 0), 0, 0.82, 0));
  bin.add(at(rot(tor(0.28, 0.02, PAL.gold, BRASS, PI * 2, 24), PI / 2, 0, 0), 0, 0.12, 0));
  bin.add(at(rbox(0.16, 0.03, 0.1, PAL.gold, 0.01, BRASS), 0, 0.03, 0.3));
  const binHeart = mesh(K.cg('ckBinHeart', () => {
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.09);
    sh.bezierCurveTo(-0.14, 0.02, -0.09, 0.14, 0, 0.07);
    sh.bezierCurveTo(0.09, 0.14, 0.14, 0.02, 0, -0.09);
    return new THREE.ShapeGeometry(sh, 10);
  }), mat(PAL.paper, { rough: 0.6 }), { cast: false });
  bin.add(at(binHeart, 0, 0.46, 0.301));
  add(bin, TRASH.x, 0, TRASH.z);
  const lid = new THREE.Group();
  lid.add(at(cyl(0.31, 0.31, 0.05, PAL.inkDeep, 20, { rough: 0.5 }), 0, 0, 0.3));
  lid.add(at(sph(0.05, PAL.gold, BRASS, 10), 0, 0.045, 0.3));
  const lidPivot = dadd(new THREE.Group(), TRASH.x, 0.85, TRASH.z - 0.3);
  lidPivot.add(lid);
  // The chef's little step, so she can reach the worktop
  add(rbox(0.7, CHEF.y, 0.6, PAL.inkDeep, 0.04, { rough: 0.6 }), CHEF.x, CHEF.y / 2, CHEF.z);
  add(box(0.72, 0.03, 0.62, PAL.gold, BRASS), CHEF.x, CHEF.y - 0.01, CHEF.z);
  // A pot of herbs and a napkin box at the right end of the worktop
  const herbs = new THREE.Group();
  herbs.add(at(cyl(0.12, 0.1, 0.16, PAL.paper, 14, { rough: 0.5 }), 0, 0.08, 0));
  herbs.add(at(rot(tor(0.12, 0.012, PAL.ink, { rough: 0.5 }, PI * 2, 16), PI / 2, 0, 0), 0, 0.16, 0));
  for (const [x, y, z, r] of [[0, 0.26, 0, 0.1], [0.07, 0.22, 0.04, 0.07], [-0.07, 0.23, -0.02, 0.075]]) herbs.add(at(sph(r, PAL.olive, { rough: 0.85 }, 10), x, y, z));
  add(herbs, X.herbs, WT, BZ);
  const napkins = new THREE.Group();
  napkins.add(at(rbox(0.3, 0.14, 0.2, PAL.blush, 0.03), 0, 0.07, 0));
  napkins.add(at(box(0.2, 0.05, 0.1, '#ffffff'), 0, 0.15, 0));
  add(napkins, X.herbs + 0.28, WT, FZ + 0.2);
  const music = new THREE.Group();
  music.add(at(rbox(0.42, 0.24, 0.3, '#b8743a', 0.03, { rough: 0.6 }), 0, 0.12, 0));
  music.add(at(box(0.44, 0.04, 0.32, PAL.gold, BRASS), 0, 0.22, 0));
  music.add(at(box(0.3, 0.1, 0.01, PAL.blush), 0, 0.12, 0.153));
  const musicSpin = new THREE.Group();
  musicSpin.add(at(cyl(0.008, 0.008, 0.14, PAL.gold, 6, BRASS), 0, 0.07, 0));
  const mh = mesh(K.cg('ckHeart', () => new THREE.ExtrudeGeometry(K.cg('ckHeartShape', () => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.05);
    s.bezierCurveTo(-0.08, 0.01, -0.05, 0.08, 0, 0.04);
    s.bezierCurveTo(0.05, 0.08, 0.08, 0.01, 0, -0.05);
    return s;
  }), { depth: 0.02, bevelEnabled: false }).translate(0, 0, -0.01)), mat(PAL.ink, { rough: 0.4 }));
  musicSpin.add(at(mh, 0, 0.17, 0));
  musicSpin.position.set(0, 0.24, 0);
  music.add(musicSpin);
  music.add(at(rot(cyl(0.012, 0.012, 0.1, PAL.gold, 6, BRASS), 0, 0, PI / 2), 0.26, 0.12, 0));
  music.scale.setScalar(1.25);
  dadd(music, X.music - 0.08, WT, FZ - 0.12);
  // The vases and the extra lanterns come with upgrades; each set merges into one or two meshes
  const vases = new THREE.Group();
  for (const [x, z] of [[-3.55, PASS.z], [3.95, PASS.z]]) {
    const v = roseVase();
    v.scale.setScalar(1.7);
    vases.add(at(v, x, PASS.y, z));
  }
  dyn.add(vases);
  const lanterns = [lantern(1.1, 0.5), lantern(1.1, 0.5)];
  add(lanterns[0], -5.35, 3.1, -1.6);
  add(lanterns[1], 5.35, 3.1, -1.6);
  const extraLanterns = new THREE.Group();
  const glowPts = [];
  for (const [x, y, z] of [[-5.9, 2.4, -1.8], [5.9, 2.4, -1.8], [-4.55, 3.15, -0.9], [4.6, 3.15, -0.9]]) {
    extraLanterns.add(at(lantern(0.95, 0.9), x, y, z));
    glowPts.push(x, y - 0.2, z);
  }
  dyn.add(extraLanterns);
  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(glowPts, 3));
  const glows = new THREE.Points(glowGeo, new THREE.PointsMaterial({ size: 0.9, map: K.glowTexture(), color: '#ffc46b', transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true }));
  dyn.add(glows);
  // ---------------------------------------------------------------- lights and merge
  K.trimShadows(world, keepStatic, { size: 0.15, wallZ: WALL_Z + 0.3 });
  K.colorBake(world, keepStatic);
  bakeStatic(world, keepStatic, K.mergeGeometries);

  // Moving parts merge within themselves; only the spit meat casts a shadow
  for (const g of [crown, grillCover, fryBasket, coffeeBrass, spoutA, spoutB, jarBig, cakeFancy, potLid, lid, vases, extraLanterns]) K.colorBake(g, g === fryBasket ? [basketLoad] : []);
  bakeStatic(extraLanterns, [], K.mergeGeometries);
  K.colorBake(music, [musicSpin]);
  K.colorBake(musicSpin);
  dyn.traverse((o) => {
    if (o.isMesh && o !== meatHolder) o.castShadow = false;
  });

  function applyUpgrades(up) {
    const u = (id) => up[id] || 0;
    crown.visible = u('spit') >= 1;
    meatHolder.scale.setScalar(u('spit') >= 2 ? 1.12 : 1);
    grillCover.visible = u('grill') < 1;
    grillTrim.visible = u('grill') >= 2;
    coffeeBrass.visible = u('coffee') >= 1;
    const two = u('coffee') >= 2;
    spoutA.position.x = two ? X.cx2[0] : X.cx1[0];
    spoutB.visible = two;
    jarBig.visible = u('jar') >= 1;
    trayBig.visible = u('fries') >= 1;
    cakeFancy.visible = u('cakes') >= 1;
    music.visible = u('music') >= 1;
    vases.visible = u('vases') >= 1;
    extraLanterns.visible = glows.visible = u('lanterns') >= 1;
  }

  return {
    world, dyn,
    meatHolder, crown, boards, plates, grillCover, grillTrim,
    oil, fryBasket, basketLoad, trayFries, trayBig,
    coffeeCups, coffeeStreams, spouts: [spoutA, spoutB], jarCup, jarStream,
    cakeSlots, lidHold, potLid, jameedFill, platter,
    lidPivot, music, musicSpin, vases, extraLanterns, glows,
    applyUpgrades,
  };
}
