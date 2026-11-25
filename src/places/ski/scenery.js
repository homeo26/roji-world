// Buildings and props around the ski area: the ice rink, the ski rental hut, the race start arch,
// the podium, paths, fences, lamps, pines, rocks and the little animals.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, umat, mesh, canvasTexture, roundRect, FONT, rng } from '../../util.js';
import { part, merge, instances, pineGeo, rockGeo, moundGeo, beanie, scarf, SNOW } from './kit.js';
import { hillHeight, runPoint, HILL_FRONT } from './hill.js';

const M = (c, o) => (typeof c === 'string' ? mat(c, o) : c);

// Small builder bound to a group: every helper adds the mesh and returns it.
export function builder(group) {
  const add = (o, x = 0, y = 0, z = 0) => {
    o.position.set(x, y, z);
    group.add(o);
    return o;
  };
  return {
    add,
    box: (w, h, d, c, x, y, z, o) => add(mesh(new THREE.BoxGeometry(w, h, d), M(c, o)), x, y, z),
    rbox: (w, h, d, c, r, x, y, z) => add(mesh(new RoundedBoxGeometry(w, h, d, 3, r), M(c)), x, y, z),
    cyl: (rt, rb, h, c, x, y, z, seg = 16, o) => add(mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(c, o)), x, y, z),
    sph: (r, c, x, y, z, seg = 14, o) => add(mesh(new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7))), M(c, o)), x, y, z),
    cone: (r, h, c, x, y, z, seg = 12) => add(mesh(new THREE.ConeGeometry(r, h, seg), M(c)), x, y, z),
    plane: (w, h, map, x, y, z, o = {}) => add(mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.75, ...o }), { cast: false }), x, y, z),
  };
}

// A painted label on a rounded card.
export function labelTex(text, { w = 512, h = 160, bg = '#fff7ea', ink = '#4a3423', edge = '#7b4f2f', size = 0.5, sub = null, subInk = '#e5484d' } = {}) {
  return canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = bg;
    roundRect(ctx, 6, 6, w - 12, h - 12, Math.min(40, h * 0.25));
    ctx.fill();
    ctx.lineWidth = 9;
    ctx.strokeStyle = edge;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (sub) {
      ctx.fillStyle = subInk;
      ctx.font = `600 ${Math.round(h * 0.2)}px ${FONT}`;
      ctx.fillText(sub.toUpperCase(), w / 2, h * 0.3);
      ctx.fillStyle = ink;
      ctx.font = `700 ${Math.round(h * 0.34)}px ${FONT}`;
      ctx.fillText(text, w / 2, h * 0.64);
    } else {
      ctx.fillStyle = ink;
      ctx.font = `700 ${Math.round(h * size)}px ${FONT}`;
      ctx.fillText(text, w / 2, h / 2 + 4);
    }
  });
}

// Shared canvas textures
let _planks = null;
export function plankTex() {
  if (_planks) return _planks;
  _planks = canvasTexture(256, 256, (ctx, w, h) => {
    const cols = ['#b97a4c', '#c4875a', '#ad6f44', '#bd8052'];
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(0, (i * h) / 8, w, h / 8);
      ctx.fillStyle = 'rgba(80,40,20,0.35)';
      ctx.fillRect(0, (i * h) / 8, w, 3);
      ctx.fillStyle = 'rgba(255,230,200,0.12)';
      ctx.fillRect(0, (i * h) / 8 + 4, w, 3);
    }
  });
  _planks.wrapS = _planks.wrapT = THREE.RepeatWrapping;
  return _planks;
}

// ------------------------------------------------------------------ ice rink
export const RINK = { x: -17, z: 3.6, hw: 5.6, hd: 3.4, gap: 1.3 };

function rinkShape(hw, hd, r) {
  const s = new THREE.Shape();
  s.moveTo(-hw + r, -hd);
  s.lineTo(hw - r, -hd);
  s.absarc(hw - r, -hd + r, r, -Math.PI / 2, 0);
  s.lineTo(hw, hd - r);
  s.absarc(hw - r, hd - r, r, 0, Math.PI / 2);
  s.lineTo(-hw + r, hd);
  s.absarc(-hw + r, hd - r, r, Math.PI / 2, Math.PI);
  s.lineTo(-hw, -hd + r);
  s.absarc(-hw + r, -hd + r, r, Math.PI, Math.PI * 1.5);
  return s;
}

export function buildRink(group, colliders) {
  const { x: cx, z: cz, hw, hd, gap } = RINK;
  const b = builder(group);
  const tex = canvasTexture(1024, 640, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.6);
    g.addColorStop(0, '#eefaff');
    g.addColorStop(1, '#bfe6f6');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const r = rng(5);
    ctx.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.25 + r() * 0.35})`;
      ctx.lineWidth = 1.5 + r() * 2.5;
      ctx.beginPath();
      const x = r() * w;
      const y = r() * h;
      const rad = 60 + r() * 240;
      const a = r() * 6.28;
      ctx.arc(x, y, rad, a, a + 0.6 + r() * 1.6);
      ctx.stroke();
    }
    // A big faint heart in the middle and little snowflakes
    ctx.save();
    ctx.translate(w / 2, h / 2 + 10);
    ctx.fillStyle = 'rgba(255,170,195,0.28)';
    ctx.beginPath();
    ctx.moveTo(0, 110);
    ctx.bezierCurveTo(-170, 10, -110, -130, 0, -50);
    ctx.bezierCurveTo(110, -130, 170, 10, 0, 110);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    for (let k = 0; k < 7; k++) {
      const fx = 90 + r() * (w - 180);
      const fy = 70 + r() * (h - 140);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(fx - Math.cos(a) * 16, fy - Math.sin(a) * 16);
        ctx.lineTo(fx + Math.cos(a) * 16, fy + Math.sin(a) * 16);
        ctx.stroke();
      }
    }
  });
  const iceGeo = new THREE.ShapeGeometry(rinkShape(hw, hd, 1.6), 6);
  const uv = iceGeo.attributes.uv;
  const p = iceGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + hw) / (2 * hw), (p.getY(i) + hd) / (2 * hd));
  iceGeo.rotateX(-Math.PI / 2);
  const ice = mesh(iceGeo, umat('#ffffff', { map: tex, rough: 0.1, metal: 0.05 }), { cast: false });
  b.add(ice, cx, 0.025, cz);

  // Boards around the rink with a gap at the front for the entrance
  const shape = rinkShape(hw + 0.12, hd + 0.12, 1.7);
  const pts = shape.getSpacedPoints(110);
  const white = mat('#fbfdff', { rough: 0.6 });
  const rail = mat('#ef5b6f', { rough: 0.6 });
  const kick = mat('#4fb7c5', { rough: 0.6 });
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const c = pts[i + 1];
    const mx = (a.x + c.x) / 2;
    const my = (a.y + c.y) / 2;
    if (my < -hd && Math.abs(mx) < gap) continue; // the entrance gap is at the front (+Z), between the gate posts
    const len = Math.hypot(c.x - a.x, c.y - a.y) + 0.07;
    const yaw = -Math.atan2(c.y - a.y, c.x - a.x);
    const seg = (h, y, w, m) => {
      const o = mesh(new THREE.BoxGeometry(len, h, w), m);
      o.position.set(cx + mx, y, cz - my);
      o.rotation.y = yaw;
      group.add(o);
    };
    seg(0.46, 0.27, 0.1, white);
    seg(0.07, 0.535, 0.16, rail);
    seg(0.1, 0.06, 0.12, kick);
  }
  // Gate posts at the entrance
  for (const s of [-1, 1]) {
    b.cyl(0.09, 0.1, 0.95, '#ef5b6f', cx + s * (gap + 0.05), 0.48, cz + hd + 0.12, 10);
    b.sph(0.13, SNOW, cx + s * (gap + 0.05), 1.0, cz + hd + 0.12, 10);
  }
  const H = 0.6;
  colliders.push(
    { type: 'box', x: cx, z: cz - hd - 0.12, hw: hw, hd: 0.12, h: H },
    { type: 'box', x: cx - hw - 0.12, z: cz, hw: 0.12, hd: hd, h: H },
    { type: 'box', x: cx + hw + 0.12, z: cz, hw: 0.12, hd: hd, h: H },
    { type: 'box', x: cx - (hw + gap) / 2, z: cz + hd + 0.12, hw: (hw - gap) / 2, hd: 0.12, h: H },
    { type: 'box', x: cx + (hw + gap) / 2, z: cz + hd + 0.12, hw: (hw - gap) / 2, hd: 0.12, h: H },
  );
  // The boards curve in at the corners, so a few posts follow each curve on the inside
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (const a of [0.39, 0.79, 1.18]) {
        colliders.push({ type: 'circle', x: cx + sx * (hw + 0.12 - 1.7 + Math.cos(a) * 1.7), z: cz + sz * (hd + 0.12 - 1.7 + Math.sin(a) * 1.7), r: 0.16, h: H });
      }
    }
  }

  // String lights over the ice on four corner poles
  const corners = [
    [cx - hw - 0.5, cz - hd - 0.5],
    [cx + hw + 0.5, cz - hd - 0.5],
    [cx + hw + 0.5, cz + hd + 0.5],
    [cx - hw - 0.5, cz + hd + 0.5],
  ];
  for (const [x, z] of corners) {
    b.cyl(0.07, 0.1, 3.3, '#5b6977', x, 1.65, z, 8, { rough: 0.5, metal: 0.3 });
    b.sph(0.12, '#5b6977', x, 3.32, z, 8);
    b.sph(0.15, SNOW, x, 3.42, z, 8);
    colliders.push({ type: 'circle', x, z, r: 0.14 });
  }
  const bulbCols = ['#ffd166', '#ff8fb1', '#8fd8ff', '#9be7b0'].map((c) => mat(c, { emissive: c, ei: 1.1, rough: 0.3 }));
  const wire = mat('#3b4652');
  const bulbGeo = new THREE.SphereGeometry(0.07, 8, 6);
  let n = 0;
  for (const [i, j] of [[0, 2], [1, 3], [0, 1], [3, 2]]) {
    const [x0, z0] = corners[i];
    const [x1, z1] = corners[j];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const steps = Math.round(len / 0.55);
    const sag = i + j === 2 || i + j === 4 ? 1.1 : 0.55;
    let prev = null;
    for (let k = 0; k <= steps; k++) {
      const f = k / steps;
      const pt = new THREE.Vector3(x0 + (x1 - x0) * f, 3.25 - sag * 4 * f * (1 - f), z0 + (z1 - z0) * f);
      if (prev) {
        const g = new THREE.CylinderGeometry(0.012, 0.012, prev.distanceTo(pt), 3);
        g.rotateX(Math.PI / 2);
        g.lookAt(new THREE.Vector3().subVectors(pt, prev));
        const wm = mesh(g, wire, { cast: false });
        wm.position.copy(prev).add(pt).multiplyScalar(0.5);
        group.add(wm);
      }
      if (k > 0 && k < steps) {
        const bulb = mesh(bulbGeo, bulbCols[n++ % 4], { cast: false });
        bulb.position.set(pt.x, pt.y - 0.08, pt.z);
        group.add(bulb);
      }
      prev = pt;
    }
  }

  // Sign by the entrance
  const sign = labelTex('Ice Rink', { sub: 'Skate together', w: 512, h: 200, edge: '#4fb7c5', subInk: '#ef5b6f' });
  b.box(0.1, 1.3, 0.1, '#9b6a43', cx + gap + 1.5, 0.65, cz + hd + 0.95);
  b.box(0.1, 1.3, 0.1, '#9b6a43', cx + gap + 3.0, 0.65, cz + hd + 0.95);
  b.rbox(1.85, 0.75, 0.1, '#9b6a43', 0.05, cx + gap + 2.25, 1.35, cz + hd + 0.94);
  b.plane(1.72, 0.66, sign, cx + gap + 2.25, 1.35, cz + hd + 1.0);
  b.box(1.9, 0.08, 0.16, SNOW, cx + gap + 2.25, 1.76, cz + hd + 0.95);
  colliders.push({ type: 'box', x: cx + gap + 2.25, z: cz + hd + 0.95, hw: 0.82, hd: 0.1 });

  // Benches beside the rink with snow on the seats
  for (const bz of [cz - 1.4, cz + 1.4]) {
    const bx = cx + hw + 1.65;
    const g = new THREE.Group();
    const gb = builder(g);
    gb.rbox(0.5, 0.08, 1.5, '#c98a5a', 0.03, 0, 0.44, 0);
    gb.rbox(0.08, 0.42, 1.5, '#c98a5a', 0.03, 0.24, 0.72, 0);
    gb.rbox(0.42, 0.06, 1.3, SNOW, 0.03, -0.02, 0.51, 0.05);
    for (const s of [-0.6, 0.6]) gb.box(0.42, 0.42, 0.08, '#5b6977', 0, 0.21, s);
    g.position.set(bx, 0, bz);
    group.add(g);
    colliders.push({ type: 'box', x: bx, z: bz, hw: 0.28, hd: 0.76, h: 0.48 });
  }
}

// ------------------------------------------------------------------ ski rental hut
export const HUT = { x: -3.6, z: -5.7 };

export function buildRentalHut(group, colliders, makeKid, looks) {
  const g = new THREE.Group();
  const b = builder(g);
  const wall = umat('#ffffff', { map: plankTex(), rough: 0.85 });
  const W = 3.8;
  const D = 2.4;
  const H = 2.3;
  // Walls around a serving window on the front
  b.box(W, H, 0.14, wall, 0, H / 2, -D / 2);
  b.box(0.14, H, D, wall, -W / 2, H / 2, 0);
  b.box(0.14, H, D, wall, W / 2, H / 2, 0);
  b.box(W, 0.95, 0.14, wall, 0, 0.47, D / 2);
  b.box(W, 0.45, 0.14, wall, 0, H - 0.22, D / 2);
  b.box(0.7, H, 0.14, wall, -W / 2 + 0.35, H / 2, D / 2);
  b.box(0.7, H, 0.14, wall, W / 2 - 0.35, H / 2, D / 2);
  b.box(W - 0.2, 0.02, D - 0.2, '#7a5038', 0, 0.02, 0);
  b.box(W - 0.2, H - 0.1, 0.02, '#8a5a3c', 0, H / 2, -D / 2 + 0.08);
  // Counter
  b.rbox(W - 1.2, 0.08, 0.55, '#f3e3cf', 0.03, 0, 0.98, D / 2 + 0.1);
  // Roof (gable along X) with snow
  for (const s of [1, -1]) {
    const roof = b.box(W + 0.6, 0.14, D / 2 + 0.55, '#ef5b6f', 0, H + 0.38, s * (D / 4 + 0.12));
    roof.rotation.x = s * 0.5;
    const snowCap = b.box(W + 0.7, 0.12, D / 2 + 0.5, SNOW, 0, H + 0.5, s * (D / 4 + 0.1));
    snowCap.rotation.x = s * 0.5;
  }
  // Gable triangles
  for (const s of [1, -1]) {
    const tri = new THREE.Shape();
    tri.moveTo(-D / 2, 0);
    tri.lineTo(D / 2, 0);
    tri.lineTo(0, 0.68);
    tri.closePath();
    const tg = mesh(new THREE.ShapeGeometry(tri), mat('#c98a5a', { side: THREE.DoubleSide }));
    tg.rotation.y = Math.PI / 2;
    tg.position.set(s * (W / 2 + 0.005), H, 0);
    g.add(tg);
  }
  // Icicles along the front eave
  const iceM = mat('#d8f1ff', { rough: 0.2, emissive: '#bfe8ff', ei: 0.15 });
  for (let i = 0; i < 11; i++) {
    const len = 0.16 + (i % 3) * 0.09;
    const ic = mesh(new THREE.ConeGeometry(0.045, len, 6), iceM, { cast: false });
    ic.rotation.x = Math.PI;
    ic.position.set(-W / 2 + 0.1 + i * ((W - 0.2) / 10), 2.28 - len / 2, D / 2 + 0.26);
    g.add(ic);
  }
  // Striped awning over the window
  const stripes = canvasTexture(512, 64, (ctx, w, h) => {
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 ? '#fff5e6' : '#4aa3df';
      ctx.fillRect((i * w) / 10, 0, w / 10, h);
    }
  });
  const awning = mesh(new THREE.PlaneGeometry(W - 1.0, 0.8), new THREE.MeshStandardMaterial({ map: stripes, side: THREE.DoubleSide, roughness: 0.8 }));
  awning.position.set(0, 1.95, D / 2 + 0.38);
  awning.rotation.x = -1.0;
  g.add(awning);
  for (let i = 0; i < 8; i++) {
    const sc = mesh(new THREE.CircleGeometry(0.175, 12, 0, Math.PI), mat(i % 2 ? '#fff5e6' : '#4aa3df', { side: THREE.DoubleSide }), { cast: false });
    sc.position.set(-(W - 1.0) / 2 + 0.175 + i * 0.35, 1.72, D / 2 + 0.72);
    sc.rotation.z = Math.PI;
    g.add(sc);
  }
  // Sign
  const sign = labelTex('Ski Rental', { w: 512, h: 150, edge: '#4aa3df' });
  b.rbox(2.3, 0.62, 0.08, '#4aa3df', 0.05, 0, H + 0.55, D / 2 + 0.3);
  b.plane(2.18, 0.52, sign, 0, H + 0.55, D / 2 + 0.345);
  // Helmets, goggles and boots on the counter and shelf inside
  const helmetGeo = new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  ['#ef5b6f', '#ffd166', '#7fd3a7', '#c7a6ff'].forEach((c, i) => {
    const hm = mesh(helmetGeo, mat(c, { rough: 0.35 }));
    hm.position.set(-1.0 + i * 0.62, 1.02, D / 2 + 0.06);
    g.add(hm);
  });
  b.box(W - 0.5, 0.06, 0.3, '#8a5a3c', 0, 1.55, -D / 2 + 0.25);
  ['#3f7bf0', '#ef5b6f', '#ffd166', '#3fbf7f', '#8b5cf6'].forEach((c, i) => {
    b.box(0.1, 1.2, 0.04, c, -1.2 + i * 0.6, 0.9, -D / 2 + 0.16).rotation.z = 0.05;
    b.box(0.1, 1.2, 0.04, c, -1.06 + i * 0.6, 0.9, -D / 2 + 0.16).rotation.z = -0.03;
  });
  // Ski rack beside the hut
  const rack = new THREE.Group();
  const rb = builder(rack);
  rb.box(0.08, 1.0, 0.08, '#9b6a43', -0.9, 0.5, 0);
  rb.box(0.08, 1.0, 0.08, '#9b6a43', 0.9, 0.5, 0);
  rb.box(1.9, 0.08, 0.1, '#9b6a43', 0, 0.95, 0);
  rb.box(1.9, 0.06, 0.08, '#9b6a43', 0, 0.12, 0.35);
  ['#ef5b6f', '#4aa3df', '#ffd166', '#7fd3a7', '#ff9eb5'].forEach((c, i) => {
    for (const dx of [-0.06, 0.06]) {
      const ski = rb.box(0.08, 1.55, 0.03, c, -0.7 + i * 0.35 + dx, 0.78, 0.18);
      ski.rotation.x = -0.22;
      const tip = rb.box(0.08, 0.14, 0.03, c, -0.7 + i * 0.35 + dx, 1.58, 0.05);
      tip.rotation.x = -0.9;
    }
  });
  rb.box(1.9, 0.07, 0.12, SNOW, 0, 1.02, 0);
  rack.position.set(-W / 2 - 1.25, 0, 0.3);
  rack.rotation.y = 0.25;
  g.add(rack);

  // The ski instructor, waving hello (posed once, then merged with the scenery)
  const look = { ...looks.roji, id: 'instructor', name: 'Instructor', gender: 'girl', skin: '#e3b08e', hair: '#7a4a26', hairstyle: 'ponytail', outfit: 'hoodie', top: '#f08a5d', bottom: '#2c3e66', shoes: '#3b2b3f', accent: '#ffd166' };
  const kid = makeKid(look);
  kid.update(1 / 60, 0, 0, 0, 0);
  kid.arms[1].rotation.set(0, 0, -2.5);
  kid.head.rotation.set(-0.08, -0.25, 0.08);
  kid.head.add(beanie('#4aa3df', '#ffffff'));
  kid.bow?.removeFromParent(); // under the beanie
  kid.body.add(scarf('#ffd166'));
  kid.root.position.set(W / 2 + 0.55, 0, D / 2 + 0.55);
  kid.root.rotation.y = -0.35;
  g.add(kid.root);

  g.position.set(HUT.x, 0, HUT.z);
  group.add(g);
  colliders.push({ type: 'box', x: HUT.x, z: HUT.z, hw: W / 2 + 0.1, hd: D / 2 + 0.1 });
  colliders.push({ type: 'box', x: HUT.x, z: HUT.z + D / 2 + 0.3, hw: W / 2 - 0.6, hd: 0.3, h: 1.02 });
  colliders.push({ type: 'circle', x: HUT.x + W / 2 + 0.55, z: HUT.z + D / 2 + 0.55, r: 0.32 });
  colliders.push({ type: 'box', x: HUT.x - W / 2 - 1.25, z: HUT.z + 0.35, hw: 1.0, hd: 0.35 });
  return { instructor: { x: HUT.x + W / 2 + 0.55, z: HUT.z + D / 2 + 0.55 } };
}

// ------------------------------------------------------------------ race start, trail map, podium
export const ARCH = { x: -11, z: -5.5 };

export function buildStart(group, colliders) {
  const b = builder(group);
  const { x: ax, z: az } = ARCH;
  // Striped pillars
  for (const s of [-1, 1]) {
    const px = ax + s * 1.7;
    for (let i = 0; i < 6; i++) b.cyl(0.26, 0.26, 0.46, i % 2 ? '#ffffff' : '#ef5b6f', px, 0.23 + i * 0.46, az, 16);
    b.sph(0.3, '#ef5b6f', px, 2.85, az, 16);
    b.cyl(0.03, 0.03, 0.8, '#5b6977', px, 3.4, az, 6);
    const flag = mesh(new THREE.ConeGeometry(0.2, 0.5, 3), mat(s < 0 ? '#ffd166' : '#4aa3df'));
    flag.rotation.z = -Math.PI / 2;
    flag.position.set(px + 0.25, 3.62, az);
    group.add(flag);
    colliders.push({ type: 'circle', x: px, z: az, r: 0.3 });
  }
  const banner = canvasTexture(768, 192, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    const sq = 24;
    for (let i = 0; i < w / sq; i++) {
      for (const row of [0, 1]) {
        ctx.fillStyle = (i + row) % 2 ? '#3b2b3f' : '#ffffff';
        ctx.fillRect(i * sq, row * sq, sq, sq);
        ctx.fillRect(i * sq, h - (2 - row) * sq, sq, sq);
      }
    }
    ctx.fillStyle = '#ef5b6f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${h * 0.4}px ${FONT}`;
    ctx.fillText('Ski Race', w / 2, h / 2 + 4);
  });
  b.rbox(3.3, 0.86, 0.16, '#ef5b6f', 0.06, ax, 2.55, az);
  b.plane(3.2, 0.8, banner, ax, 2.55, az + 0.085);
  b.box(3.4, 0.1, 0.22, SNOW, ax, 3.0, az);
  // Checkered start line on the snow
  const line = canvasTexture(256, 32, (ctx, w, h) => {
    for (let i = 0; i < 16; i++)
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#3b2b3f' : '#ffffff';
        ctx.fillRect((i * w) / 16, (j * h) / 2, w / 16, h / 2);
      }
  });
  const startLine = mesh(new THREE.PlaneGeometry(3.2, 0.4), new THREE.MeshStandardMaterial({ map: line, roughness: 0.9 }), { cast: false });
  startLine.rotation.x = -Math.PI / 2;
  startLine.position.set(ax, 0.02, az + 0.1);
  group.add(startLine);

  // Trail map board
  const map = canvasTexture(512, 360, (ctx, w, h) => {
    ctx.fillStyle = '#fff7ea';
    roundRect(ctx, 6, 6, w - 12, h - 12, 26);
    ctx.fill();
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#4aa3df';
    ctx.stroke();
    ctx.fillStyle = '#cfe6f5';
    ctx.beginPath();
    ctx.moveTo(30, h - 40);
    ctx.lineTo(170, 90);
    ctx.lineTo(250, 160);
    ctx.lineTo(340, 70);
    ctx.lineTo(w - 30, h - 40);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (const [x, y] of [[170, 90], [340, 70]]) {
      ctx.beginPath();
      ctx.moveTo(x - 38, y + 42);
      ctx.lineTo(x, y);
      ctx.lineTo(x + 38, y + 42);
      ctx.closePath();
      ctx.fill();
    }
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    for (const [col, pts] of [
      ['#3fbf7f', [[160, 110], [120, 200], [150, 260], [110, h - 50]]],
      ['#3f7bf0', [[335, 90], [300, 180], [360, 240], [320, h - 50]]],
      ['#ef5b6f', [[345, 95], [420, 190], [400, 250], [450, h - 50]]],
    ]) {
      ctx.strokeStyle = col;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    ctx.setLineDash([6, 10]);
    ctx.strokeStyle = '#5b6977';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(240, h - 60);
    ctx.lineTo(330, 100);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#4a3423';
    ctx.textAlign = 'center';
    ctx.font = `700 40px ${FONT}`;
    ctx.fillText('Trail Map', w / 2, 52);
  });
  const mx = ax - 3.4;
  const mz = az - 0.4;
  b.box(0.1, 1.6, 0.1, '#9b6a43', mx - 0.75, 0.8, mz);
  b.box(0.1, 1.6, 0.1, '#9b6a43', mx + 0.75, 0.8, mz);
  b.rbox(1.75, 1.25, 0.08, '#9b6a43', 0.05, mx, 1.55, mz);
  b.plane(1.65, 1.16, map, mx, 1.55, mz + 0.045);
  b.box(1.85, 0.09, 0.2, SNOW, mx, 2.2, mz);
  colliders.push({ type: 'box', x: mx, z: mz, hw: 0.9, hd: 0.12 });

  // Podium you can jump onto
  const px = ax - 6.6;
  const pz = az + 0.4;
  const steps = [
    { dx: 0, h: 0.62, n: '1', c: '#f4c24f', body: '#ffe08a' },
    { dx: -1.0, h: 0.42, n: '2', c: '#9fb0c2', body: '#d7e2ee' },
    { dx: 1.0, h: 0.28, n: '3', c: '#d9875a', body: '#f6be95' },
  ];
  for (const s of steps) {
    b.rbox(0.98, s.h, 0.9, s.body, 0.05, px + s.dx, s.h / 2, pz);
    b.rbox(0.9, 0.05, 0.84, SNOW, 0.02, px + s.dx, s.h + 0.02, pz);
    const num = canvasTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 56, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 76px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.n, w / 2, h / 2 + 5);
    });
    const disc = mesh(new THREE.CircleGeometry(0.17, 20), new THREE.MeshStandardMaterial({ map: num, roughness: 0.6 }), { cast: false });
    disc.position.set(px + s.dx, Math.min(s.h / 2, s.h - 0.2), pz + 0.456);
    group.add(disc);
    colliders.push({ type: 'box', x: px + s.dx, z: pz, hw: 0.49, hd: 0.45, h: s.h });
  }
}

// ------------------------------------------------------------------ paths, fences, lamps, nature
export function buildPaths(group, paths) {
  const r = rng(21);
  const pathMat = mat('#f7faff', { rough: 1 });
  const edgeMat = mat('#cddced', { rough: 1 });
  const prints = [];
  for (const pts of paths) {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
    const samples = curve.getSpacedPoints(Math.ceil(curve.getLength() * 2));
    for (const [w, y, m] of [[2.0, 0.012, edgeMat], [1.6, 0.016, pathMat]]) {
      const pos = [];
      const idx = [];
      const uvs = [];
      samples.forEach((p, i) => {
        const a = samples[Math.max(0, i - 1)];
        const c = samples[Math.min(samples.length - 1, i + 1)];
        const tx = c.x - a.x;
        const tz = c.z - a.z;
        const tl = Math.hypot(tx, tz) || 1;
        const nx = -tz / tl;
        const nz = tx / tl;
        const wob = w * 0.5 + Math.sin(i * 0.9) * 0.05;
        pos.push(p.x + nx * wob, y, p.z + nz * wob, p.x - nx * wob, y, p.z - nz * wob);
        uvs.push(0, i, 1, i);
        if (i < samples.length - 1) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      group.add(mesh(g, m, { cast: false }));
    }
    // Footprints of two pairs of feet along the path
    for (let i = 2; i < samples.length - 1; i += 2) {
      const p = samples[i];
      const c = samples[i + 1];
      const yaw = Math.atan2(c.x - p.x, c.z - p.z);
      const side = (i / 2) % 2 ? 1 : -1;
      for (const lane of [-0.38, 0.38]) {
        const off = lane + side * 0.09;
        prints.push({ x: p.x + Math.cos(yaw) * off, y: 0.02, z: p.z - Math.sin(yaw) * off, ry: yaw + (r() - 0.5) * 0.2, s: 1 });
      }
    }
  }
  const printGeo = new THREE.CircleGeometry(0.07, 10);
  printGeo.rotateX(-Math.PI / 2);
  printGeo.scale(1, 1, 1.7);
  group.add(instances(printGeo, mat('#c2d3e6', { rough: 1 }), prints, { cast: false }));
}

export function buildFence(group, colliders, from, to) {
  const wood = mat('#a8714a', { rough: 0.85 });
  const snowM = mat(SNOW, { rough: 0.9 });
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const n = Math.max(1, Math.round(len / 2));
  const yaw = Math.atan2(to[1] - from[1], to[0] - from[0]);
  for (let i = 0; i <= n; i++) {
    const x = from[0] + ((to[0] - from[0]) * i) / n;
    const z = from[1] + ((to[1] - from[1]) * i) / n;
    const post = mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.0, 7), wood);
    post.position.set(x, 0.5, z);
    const cap = mesh(new THREE.SphereGeometry(0.11, 8, 6), snowM);
    cap.scale.y = 0.6;
    cap.position.set(x, 1.02, z);
    group.add(post, cap);
  }
  const mx = (from[0] + to[0]) / 2;
  const mz = (from[1] + to[1]) / 2;
  for (const y of [0.45, 0.8]) {
    const rail = mesh(new THREE.BoxGeometry(len, 0.09, 0.06), wood);
    rail.position.set(mx, y, mz);
    rail.rotation.y = -yaw;
    const frost = mesh(new THREE.BoxGeometry(len, 0.05, 0.09), snowM, { cast: false });
    frost.position.set(mx, y + 0.065, mz);
    frost.rotation.y = -yaw;
    group.add(rail, frost);
  }
  const segs = Math.ceil(len / 0.45);
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    colliders.push({ type: 'circle', x: from[0] + (to[0] - from[0]) * f, z: from[1] + (to[1] - from[1]) * f, r: 0.22 });
  }
}

export function buildLamp(group, colliders, x, z) {
  const b = builder(group);
  const post = mat('#40594d', { rough: 0.5, metal: 0.3 });
  b.cyl(0.16, 0.2, 0.18, post, x, 0.09, z, 10);
  b.cyl(0.06, 0.09, 2.2, post, x, 1.1, z, 8);
  b.add(mesh(new THREE.SphereGeometry(0.2, 14, 10), mat('#fff1c7', { emissive: '#ffd27a', ei: 1.4, rough: 0.3 }), { cast: false }), x, 2.32, z);
  b.cone(0.26, 0.22, post, x, 2.56, z, 10);
  const cap = b.sph(0.2, SNOW, x, 2.66, z, 10);
  cap.scale.y = 0.45;
  colliders.push({ type: 'circle', x, z, r: 0.2 });
}

// Pines, rocks and soft drifts as instanced copies.
export function buildNature(group, colliders, vc, { pines, rocks, mounds }) {
  group.add(instances(pineGeo(), vc, pines.map((p) => ({ ...p, color: p.color || '#ffffff' }))));
  // The lowest branches spread wide, so the trunk circle covers most of them
  for (const p of pines) if (!p.noCollide) colliders.push({ type: 'circle', x: p.x, z: p.z, r: 0.92 * (p.s ?? 1) });
  group.add(instances(rockGeo(), vc, rocks));
  for (const k of rocks) if ((k.s ?? 1) > 0.7) colliders.push({ type: 'circle', x: k.x, z: k.z, r: 0.42 * k.s, h: 0.55 * k.s });
  group.add(instances(moundGeo(), vc, mounds, { cast: false }));
  // Big drifts are solid snow: hop up on them (small ones round the pines and along the hill stay soft)
  for (const m of mounds) if (m.solid) colliders.push({ type: 'circle', x: m.x, z: m.z, r: Math.min(m.sx, m.sz) * 0.72, h: m.sy * 0.85 });
}

// Random spots on the big hill, away from the ski run and the chairlift line.
export function hillPines(count, seed = 3) {
  const r = rng(seed);
  const out = [];
  for (let tries = 0; tries < 2000 && out.length < count; tries++) {
    const x = -27 + r() * 54;
    const z = -14.8 + r() * 6.6;
    if (z > HILL_FRONT - 0.8) continue;
    const p = Math.min(1, Math.max(0, (z + 14.7) / 7.4));
    if (Math.abs(x - runPoint(p).x) < 2.6) continue;
    const lf = (z + 7.7) / (-14.5 + 7.7);
    if (lf > -0.1 && lf < 1.1 && Math.abs(x - (5.2 + (-1.4 - 5.2) * lf)) < 2.4) continue;
    if (x > 9.5 && x < 21 && z > -9.5) continue;
    if (out.some((q) => Math.hypot(q.x - x, q.z - z) < 1.7)) continue;
    const s = 0.65 + r() * 0.45;
    out.push({ x, y: hillHeight(x, z) - 0.1, z, s, ry: r() * 6, noCollide: true, color: r() < 0.5 ? '#ffffff' : '#e9f6ee' });
  }
  return out;
}

// ------------------------------------------------------------------ animals and small things
export function buildBunnies(group, dynamic, vc, spots) {
  const geo = merge([
    part(new THREE.SphereGeometry(0.2, 12, 10), '#ffffff', 0, 0.2, 0, { sz: 1.25, sy: 0.95 }),
    part(new THREE.SphereGeometry(0.14, 12, 10), '#ffffff', 0, 0.36, 0.2),
    part(new THREE.CapsuleGeometry(0.04, 0.18, 3, 8), '#ffffff', 0.06, 0.56, 0.16, { rz: -0.2, rx: -0.2 }),
    part(new THREE.CapsuleGeometry(0.04, 0.18, 3, 8), '#ffffff', -0.06, 0.56, 0.16, { rz: 0.2, rx: -0.2 }),
    part(new THREE.CapsuleGeometry(0.022, 0.12, 3, 6), '#ffb3c6', 0.065, 0.57, 0.19, { rz: -0.2, rx: -0.2 }),
    part(new THREE.CapsuleGeometry(0.022, 0.12, 3, 6), '#ffb3c6', -0.065, 0.57, 0.19, { rz: 0.2, rx: -0.2 }),
    part(new THREE.SphereGeometry(0.075, 8, 6), '#ffffff', 0, 0.24, -0.25),
    part(new THREE.SphereGeometry(0.022, 6, 5), '#2b2430', 0.06, 0.4, 0.32),
    part(new THREE.SphereGeometry(0.022, 6, 5), '#2b2430', -0.06, 0.4, 0.32),
    part(new THREE.SphereGeometry(0.02, 6, 5), '#ff8fa0', 0, 0.35, 0.34),
  ]);
  return spots.map(([x, z, rad], i) => {
    const m = new THREE.Mesh(geo, vc);
    m.castShadow = true;
    group.add(m);
    dynamic.push(m);
    const st = { m, x, z, rad, a: i * 2.1, hop: 0, wait: 0.5 + i };
    return st;
  });
}

export function updateBunnies(list, dt) {
  for (const b of list) {
    if (b.wait > 0) {
      b.wait -= dt;
      b.hop = 0;
    } else {
      b.hop += dt * 2.6;
      b.a += dt * 0.55;
      if (b.hop >= 1) {
        b.hop = 0;
        if (Math.random() < 0.35) b.wait = 0.6 + Math.random() * 1.8;
      }
    }
    const x = b.x + Math.cos(b.a) * b.rad;
    const z = b.z + Math.sin(b.a) * b.rad * 0.6;
    b.m.position.set(x, Math.sin(b.hop * Math.PI) * 0.28, z);
    b.m.rotation.y = Math.atan2(-Math.sin(b.a), Math.cos(b.a) * 0.6);
    b.m.scale.set(1, 1 + Math.sin(b.hop * Math.PI) * 0.12, 1);
  }
}

// A bird house on a pole with two little red birds.
export function buildBirdHouse(group, colliders, x, z) {
  const b = builder(group);
  b.cyl(0.06, 0.07, 1.7, '#a8714a', x, 0.85, z, 8);
  b.rbox(0.5, 0.42, 0.42, '#ffd166', 0.04, x, 1.9, z);
  for (const s of [1, -1]) {
    const roof = b.box(0.34, 0.05, 0.56, '#ef5b6f', x + s * 0.15, 2.2, z);
    roof.rotation.z = -s * 0.6;
    const sn = b.box(0.34, 0.05, 0.56, SNOW, x + s * 0.16, 2.24, z);
    sn.rotation.z = -s * 0.6;
  }
  b.add(mesh(new THREE.CircleGeometry(0.08, 14), mat('#3b2b3f')), x, 1.92, z + 0.215);
  b.cyl(0.015, 0.015, 0.14, '#a8714a', x, 1.78, z + 0.27, 5).rotation.x = Math.PI / 2;
  b.box(0.6, 0.04, 0.2, '#a8714a', x, 1.66, z + 0.3);
  for (const [dx, ry] of [[-0.18, 0.6], [0.2, -0.4]]) {
    const bird = new THREE.Group();
    const bb = builder(bird);
    bb.sph(0.07, '#e5484d', 0, 0.07, 0, 10).scale.set(1, 0.95, 1.25);
    bb.sph(0.05, '#e5484d', 0, 0.14, 0.05, 10);
    bb.cone(0.02, 0.05, '#ffb347', 0, 0.14, 0.11, 6).rotation.x = Math.PI / 2;
    bb.cone(0.025, 0.06, '#e5484d', 0, 0.2, 0.04, 6);
    bb.box(0.04, 0.02, 0.1, '#b8333a', 0, 0.06, -0.1).rotation.x = 0.5;
    bb.sph(0.012, '#2b2430', 0.03, 0.155, 0.085, 6);
    bb.sph(0.012, '#2b2430', -0.03, 0.155, 0.085, 6);
    bird.position.set(x + dx, 1.68, z + 0.3);
    bird.rotation.y = ry;
    group.add(bird);
  }
  colliders.push({ type: 'circle', x, z, r: 0.12 });
}

// A wooden sled with a little gift on it.
export function buildSled(group, x, z, ry = 0, color = '#ef5b6f') {
  const g = new THREE.Group();
  const b = builder(g);
  b.rbox(0.55, 0.06, 1.1, '#c98a5a', 0.02, 0, 0.22, 0);
  for (const s of [-1, 1]) {
    b.box(0.04, 0.04, 1.2, color, s * 0.24, 0.04, 0);
    const curl = mesh(new THREE.TorusGeometry(0.1, 0.02, 6, 12, Math.PI), mat(color));
    curl.rotation.y = Math.PI / 2;
    curl.position.set(s * 0.24, 0.14, 0.6);
    g.add(curl);
    b.box(0.04, 0.16, 0.04, color, s * 0.24, 0.12, -0.3);
    b.box(0.04, 0.16, 0.04, color, s * 0.24, 0.12, 0.3);
  }
  b.rbox(0.3, 0.24, 0.3, '#4aa3df', 0.04, 0, 0.37, -0.15);
  b.box(0.32, 0.05, 0.06, '#ffd166', 0, 0.37, -0.15);
  b.box(0.06, 0.26, 0.32, '#ffd166', 0, 0.37, -0.15);
  b.sph(0.05, '#ffd166', 0, 0.51, -0.15, 8);
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  group.add(g);
  return g;
}
